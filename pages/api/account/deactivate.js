// pages/api/account/deactivate.js
// 67차 신규 — 회원 탈퇴 (soft delete)
// + audit v0.1: 탈퇴 성공 시 audit_logs 기록 (best-effort, non-blocking)
// 흐름:
//   1) PATCH only
//   2) Bearer 토큰 검증 (supabase.auth.getUser)
//   3) accounts row 조회 (auth_user_id 매칭)
//   4) status 'active' → 'deactivated' UPDATE
//   5) 모든 세션 무효화 (admin.signOut)
//   6) 응답 — 클라이언트는 supabase.auth.signOut() 후 / 리다이렉트
// 보안:
//   - Bearer 미첨부 → 401
//   - 본인 accounts row만 수정 (auth_user_id 매칭)
//   - 이미 deactivated → 409 (idempotent — 이미 처리됨 표시)
// FREEZE 준수: ensure.js / publish.js / check-quota.js / login.js / callback.js 무영향
// status enforcement는 login.js v53 + callback.js v50 기존 가드가 자동 처리

import { createClient } from '@supabase/supabase-js';
import { writeAudit } from '../../../lib/audit';
import { requireAuth } from '../../../lib/guards';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  // 1) 메서드 가드
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // 2) 인증 — requireAuth (guards.js 통합 / 85차 가드 단일화)
  //    토큰 추출 + getUser 검증 흡수. 실패 시 내부에서 401 전송 후 null.
  //    인증키는 anon(supabaseAuth)이나 getUser는 토큰 자체검증이라 동치.
  const user = await requireAuth(req, res);
  if (!user) return; // res 이미 전송됨 (401)
  const auth_user_id = user.id;

  // 3) admin client — DB 작업 + admin.signOut 용 service_role 유지 (RLS 우회)
  const sb = admin();

  // 4) accounts row 조회
  const { data: acc, error: accErr } = await sb
    .from('accounts')
    .select('id, email, status, role, meta')
    .eq('auth_user_id', auth_user_id)
    .maybeSingle();

  if (accErr) {
    return res.status(500).json({
      ok: false,
      error: 'accounts_select_failed',
      detail: accErr.message,
    });
  }
  if (!acc) {
    return res.status(404).json({ ok: false, error: 'account_not_found' });
  }

  // 5) idempotent — 이미 deactivated인 경우
  if (acc.status === 'deactivated') {
    return res.status(409).json({
      ok: false,
      error: 'already_deactivated',
      account_id: acc.id,
      status: acc.status,
    });
  }

  // 6) status가 active가 아닌 다른 비정상 상태 (suspended/deleted)인 경우 차단
  if (acc.status !== 'active') {
    return res.status(409).json({
      ok: false,
      error: 'status_not_active',
      account_id: acc.id,
      status: acc.status,
      hint: 'only active accounts can self-deactivate',
    });
  }

  const previous_status = acc.status;
  const nowIso = new Date().toISOString();

  // 7) UPDATE — status='deactivated'
  //    [SIGNUP-AFTER-DEACTIVATE-SILENT-FAIL-01] 재가입 30일 제한의 판정 기준시각을
  //    meta.deactivated_at 에 기록한다. 컬럼 신설 없음(A안).
  //    updated_at 은 다른 사유로도 갱신되므로 탈퇴시각 대용으로 쓰지 않는다.
  //    기존 meta 키는 spread 로 보존한다.
  const { data: upd, error: updErr } = await sb
    .from('accounts')
    .update({
      status: 'deactivated',
      updated_at: nowIso,
      meta: { ...(acc.meta || {}), deactivated_at: nowIso },
    })
    .eq('id', acc.id)
    .eq('auth_user_id', auth_user_id) // 다중 가드 — 본인 확인
    .select('id, status, updated_at, meta')
    .maybeSingle();

  if (updErr || !upd) {
    return res.status(500).json({
      ok: false,
      error: 'deactivate_update_failed',
      detail: updErr?.message || null,
    });
  }

  // 8) 모든 세션 무효화 (admin.signOut — 다른 기기/탭 토큰 즉시 무효)
  //    실패해도 deactivate UPDATE는 성공한 상태이므로 ok=true로 응답 (best-effort)
  let signout_global = { ok: true };
  try {
    const { error: signOutErr } = await sb.auth.admin.signOut(auth_user_id, 'global');
    if (signOutErr) {
      signout_global = { ok: false, error: signOutErr.message };
      console.warn('[deactivate] admin.signOut warning:', signOutErr.message);
    }
  } catch (e) {
    signout_global = { ok: false, error: String(e?.message || e) };
    console.warn('[deactivate] admin.signOut exception:', e);
  }

  console.log(`[deactivate] id=${acc.id} email=${acc.email} role=${acc.role} ${previous_status} → deactivated`);

  // 9) audit 기록 (best-effort, non-blocking)
  //    본인 탈퇴 → actor = 본인. actor_role 은 accounts.role snapshot.
  await writeAudit({
    actor_id: auth_user_id,
    actor_email: acc.email,
    actor_role: acc.role || null,
    action: 'account.deactivate',
    target_type: 'account',
    target_id: acc.id,
    before: { status: previous_status },
    after: { status: 'deactivated' },
    detail: { self: true, signout_global: signout_global.ok },
  });

  return res.status(200).json({
    ok: true,
    account_id: acc.id,
    previous_status,
    new_status: upd.status,
    updated_at: upd.updated_at,
    deactivated_at: upd.meta?.deactivated_at || null,
    signout_global,
  });
}
