// pages/api/admin/set-role.js
// 89차 v0.1: admin/user role 변경 API (신규)
// + audit v0.1: 변경 성공 시 audit_logs 기록 (best-effort, non-blocking)
// - requireOwner 가드 (lib/guards)
// - whitelist: ['admin', 'user']  (owner 변경 불가)
// - owner 자해 방지: target이 owner면 403 OWNER_ACCOUNT_READONLY
// - 응답 포맷: update-account.js v0.3 패턴 답습
// - DB 스키마 무변경 (accounts.role 컬럼 UPDATE만)
//
// 사용처: pages/admin/accounts.js v0.4 (role select)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { OWNER_UID } from '../../../lib/constants';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';

const ALLOWED_ROLES = ['admin', 'user'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    // ── body 파싱 ─────────────────────────────────────────────
    const { target_id, role } = req.body || {};

    if (!target_id) {
      return res.status(400).json({ ok: false, error: 'TARGET_ID_REQUIRED' });
    }

    if (role === undefined || role === null) {
      return res.status(400).json({ ok: false, error: 'ROLE_REQUIRED' });
    }

    // ── role whitelist 검증 (owner 차단) ──────────────────────
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ROLE',
        allowed: ALLOWED_ROLES,
        message: 'owner 등급은 부여/회수할 수 없습니다.',
      });
    }

    // ── 타겟 조회 (owner 본인 차단 검증) ───────────────────────
    const { data: target, error: tErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, plan, status, role, auth_user_id')
      .eq('id', target_id)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!target) {
      return res.status(404).json({ ok: false, error: 'TARGET_NOT_FOUND' });
    }

    // ── owner 본인 자해 방지 ───────────────────────────────────
    const isOwnerTarget = target.role === 'owner' || target.auth_user_id === OWNER_UID;
    if (isOwnerTarget) {
      return res.status(403).json({
        ok: false,
        error: 'OWNER_ACCOUNT_READONLY',
        message: 'owner 계정은 자해 방지를 위해 읽기 전용입니다.',
      });
    }

    // ── 변경 없음 ─────────────────────────────────────────────
    if (target.role === role) {
      return res.status(200).json({
        ok: true,
        account: target,
        changed: {},
        message: 'NO_CHANGE',
      });
    }

    // ── UPDATE ────────────────────────────────────────────────
    const updates = {
      role,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: uErr } = await supabaseAdmin
      .from('accounts')
      .update(updates)
      .eq('id', target_id)
      .select('id, email, plan, status, role')
      .single();

    if (uErr) throw uErr;

    console.log(`[set-role] ✓ id=${target_id} role: ${target.role} → ${role} by=${user.id}`);

    // ── audit 기록 (best-effort, non-blocking) ────────────────
    await writeAudit({
      actor: user,
      actor_role: 'owner', // requireOwner 통과 = owner 확정
      action: 'account.set_role',
      target_type: 'account',
      target_id,
      before: { role: target.role },
      after: { role },
      detail: { target_email: target.email },
    });

    return res.status(200).json({
      ok: true,
      account: updated,
      changed: { role, previous_role: target.role },
      verified: {
        auth_user_id: user.id,
        is_owner: true,
      },
    });
  } catch (e) {
    console.error('[set-role] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'UPDATE_FAILED',
      detail: e.message,
    });
  }
}
