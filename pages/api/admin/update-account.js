// pages/api/admin/update-account.js
// 세션74 v0.6: 구독 쓰기 로직을 lib/billing/subscriptionWrite.applyPlan으로 이관.
//   · 관리자 지급(source='admin')과 결제(source='payment')가 같은 코드 경로를 쓰도록 승격.
//   · 정책 반영 — 업그레이드=기존 period 승계(quota 누수 차단) / 다운그레이드=scheduled_plan_id 예약 /
//     free=즉시 강등(status=canceled + period_end=now). 이 파일의 로컬 helper는 삭제.
//   · 응답 subscription 키 유지(UI 호환). action에 upgrade/downgrade_scheduled/extend 추가.
// 세션73 B-2 v0.5: 관리자 지급 기간형 전환 (subscriptions append-only 이력)
//   · 구조 확정 — subscriptions = 구독 이력(append-only) / accounts.plan = 현재 표시용 캐시.
//     구독행은 절대 UPDATE 재사용하지 않는다. 무료체험·관리자지급·결제·갱신·재구독 전부 이력으로 남아야
//     PG 연동(B-4)·갱신 배치(B-5)가 같은 구조를 그대로 쓴다.
//   · plan=paid(basic/standard/pro): ①accounts.plan 갱신(하위호환) ②기존 활성행 종료
//     (status='canceled', current_period_end=now()) ③새 행 INSERT(status='active', source='admin',
//     period=now()~now()+N개월).
//   · plan='free': ①accounts.plan='free' ②활성행만 종료. 새 행 생성 없음.
//   · months 파라미터(선택, 기본 1, 1~36). 미전달 시 1개월 지급.
//   · 구독 처리는 best-effort — 실패해도 accounts.plan 갱신은 유지되고 200을 반환한다.
//     이유: B-3 전까지 실제 차단 기준은 여전히 accounts.plan이므로, 이력 기록 실패로
//     관리자 작업 전체를 막으면 손해가 더 크다. 실패는 응답 subscription.error로 노출.
//   · status/blog_account 단독 변경 경로는 무영향(plan 미포함이면 구독 로직 미진입).
//
// 91차 v0.4: blog_account 매핑 필드 추가 (회원 ↔ publish_history 연결고리)
// - body에 blog_account 추가 (선택). 화이트리스트 아님 → 형식 검증만(영숫자/_/-).
//   빈문자/null → null 저장(매핑 해제 허용).
// - unique index(accounts_blog_account_uniq) 충돌(23505) → 친화 메시지(409) 분기.
// - owner 잠금 / plan·status whitelist / audit / 응답 포맷 무변경.
//   owner 본인 blog_account는 SQL로 직접 매핑(자해 방지 로직 유지) → API는 user 계정용.
//
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용) + audit v0.1
// 57차 v0.2: Bearer 가드 적용
// 50차 v0.1: admin이 accounts의 plan/status 변경

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { OWNER_UID } from '../../../lib/constants';
import { PLANS } from '../../../lib/billing/plans';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';
import { applyPlan } from '../../../lib/billing/subscriptionWrite';

const ALLOWED_PLANS = Object.keys(PLANS); // ['free','basic','pro']
const ALLOWED_STATUS = ['active', 'suspended'];
const BLOG_ACCOUNT_RE = /^[a-zA-Z0-9_-]+$/; // 네이버 블로그 ID 형식
const DEFAULT_GRANT_MONTHS = 1;   // 관리자 지급 기본 기간
const MAX_GRANT_MONTHS = 36;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.3: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    // ── body 파싱 ─────────────────────────────────────────────
    const {
      target_id,      // accounts.id (PK)
      plan,           // 선택
      status,         // 선택
      blog_account,   // 선택 (91차 신규)
      months,         // 선택 (B-2 신규) — 지급 개월수. 미전달 시 1개월.
    } = req.body || {};

    if (!target_id) {
      return res.status(400).json({ ok: false, error: 'TARGET_ID_REQUIRED' });
    }

    // ── 변경값 검증 ───────────────────────────────────────────
    const updates = {};
    if (plan !== undefined) {
      if (!ALLOWED_PLANS.includes(plan)) {
        return res.status(400).json({ ok: false, error: 'INVALID_PLAN', allowed: ALLOWED_PLANS });
      }
      updates.plan = plan;
    }
    // B-2: 지급 기간. plan이 없으면 무의미하므로 검증만 하고 사용하지 않는다.
    let grantMonths = DEFAULT_GRANT_MONTHS;
    if (months !== undefined && months !== null && months !== '') {
      const m = Number(months);
      if (!Number.isInteger(m) || m < 1 || m > MAX_GRANT_MONTHS) {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_MONTHS',
          message: `지급 기간은 1~${MAX_GRANT_MONTHS}개월 사이의 정수여야 합니다.`,
        });
      }
      grantMonths = m;
    }
    if (status !== undefined) {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({ ok: false, error: 'INVALID_STATUS', allowed: ALLOWED_STATUS });
      }
      updates.status = status;
    }
    if (blog_account !== undefined) {
      // 빈문자/null → 매핑 해제(null). 값이 있으면 형식 검증.
      const v = blog_account === null ? null : String(blog_account).trim();
      if (v && !BLOG_ACCOUNT_RE.test(v)) {
        return res.status(400).json({
          ok: false,
          error: 'INVALID_BLOG_ACCOUNT',
          message: '블로그 계정은 영문/숫자/_/- 만 가능합니다.',
        });
      }
      updates.blog_account = v || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: 'NO_UPDATES' });
    }

    // ── 타겟 조회 (owner 본인 차단 검증) ───────────────────────
    const { data: target, error: tErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, plan, status, role, auth_user_id, blog_account')
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

    // ── updated_at 자동 갱신 ───────────────────────────────────
    updates.updated_at = new Date().toISOString();

    // ── UPDATE ────────────────────────────────────────────────
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('accounts')
      .update(updates)
      .eq('id', target_id)
      .select('id, email, plan, status, role, blog_account')
      .single();

    if (uErr) {
      // unique index(accounts_blog_account_uniq) 충돌 → 친화 메시지
      if (uErr.code === '23505') {
        return res.status(409).json({
          ok: false,
          error: 'BLOG_ACCOUNT_TAKEN',
          message: '이미 다른 회원에 연결된 블로그 계정입니다.',
        });
      }
      throw uErr;
    }

    console.log(`[update-account] ✓ id=${target_id} updates=${JSON.stringify(updates)} by=${user.id}`);

    // ── B-2: 구독 이력 반영 (plan 변경 시에만) ─────────────────
    //   append-only. 기존 활성행은 종료 처리하고, 유료 지급이면 새 행을 INSERT한다.
    //   best-effort — 실패해도 accounts.plan 갱신 결과는 유지하고 200으로 응답한다.
    let subscriptionResult = null;
    if (plan !== undefined) {
      subscriptionResult = await applyPlan({
        accountId: target_id,
        planId: plan,
        months: grantMonths,
        source: 'admin',   // B-5 자동결제 시도 대상 아님
      });
    }

    // ── audit 기록 (best-effort, non-blocking) ────────────────
    const beforeSnap = {};
    const afterSnap = {};
    for (const k of Object.keys(updates)) {
      if (k === 'updated_at') continue;
      beforeSnap[k] = target[k];
      afterSnap[k] = updates[k];
    }
    await writeAudit({
      actor: user,
      actor_role: 'owner', // requireOwner 통과 = owner 확정
      action: 'account.update',
      target_type: 'account',
      target_id,
      before: beforeSnap,
      after: afterSnap,
      detail: { target_email: target.email },
    });

    return res.status(200).json({
      ok: true,
      account: updated,
      changed: updates,
      subscription: subscriptionResult, // B-2: plan 미변경이면 null
      verified: {
        auth_user_id: user.id,
        is_owner: true,
      },
    });
  } catch (e) {
    console.error('[update-account] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'UPDATE_FAILED',
      detail: e.message,
    });
  }
}
