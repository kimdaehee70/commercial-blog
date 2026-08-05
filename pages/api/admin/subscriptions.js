// pages/api/admin/subscriptions.js
// v0.1: Billing 상태 관리 — 구독 목록 조회 (read-only)
// - accounts(plan 진실 소스) + subscriptions(결제 상태 레이어) 결합.
// - accounts.plan = plan truth, subscriptions = 결제 이력/상태(status/기간/해지예정).
// - 한 account에 여러 subscription row가 있을 수 있어 최신(updated_at desc) 1건을 현재 구독으로 본다.
// - quota 경로(by-member/plans) 무참조. plan 라벨만 표시용으로 getPlan 사용.
// - FREEZE 경로(by-member.js/quota/publish.js) 미접근. read-only.
//
// 패턴 출처: accounts-usage.js (requireOwner 가드 / supabaseAdmin / 응답 포맷)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getPlan, DEFAULT_PLAN_ID, listPlans } from '../../../lib/billing/plans';
import { requireOwner } from '../../../lib/guards';

// 결제 상태 4-state 규약 (94차 확정):
//   active                          = 정상 결제
//   active + cancel_at_period_end   = 해지예정 (기간 끝까지 유지)
//   past_due                        = 미납
//   canceled                        = 해지완료
function billingState(sub) {
  if (!sub) return { key: 'none', label: '구독없음', color: '#9ca3af', bg: 'transparent' };
  const status = sub.status || 'active';
  if (status === 'canceled') {
    return { key: 'canceled', label: '해지완료', color: '#6b7280', bg: '#f9fafb' };
  }
  if (status === 'past_due') {
    return { key: 'past_due', label: '미납', color: '#dc2626', bg: '#fef2f2' };
  }
  // status === 'active'
  if (sub.cancel_at_period_end) {
    return { key: 'scheduled_cancel', label: '해지예정', color: '#ea580c', bg: '#fff7ed' };
  }
  return { key: 'active', label: '정상', color: '#16a34a', bg: 'transparent' };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (accounts-usage.js 패턴 동일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    // 1. accounts 전체 (plan = 진실 소스)
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, display_name, plan, role, status, created_at')
      .order('id', { ascending: true });

    if (accErr) throw accErr;

    // 2. subscriptions 전체 (결제 상태 레이어). account별 최신 1건만 채택.
    const { data: subs, error: sErr } = await supabaseAdmin
      .from('subscriptions')
      .select(
        'id, account_id, plan_id, status, current_period_start, current_period_end, ' +
        'next_billing_at, cancel_at_period_end, failed_payment_count, last_failed_at, ' +
        'created_at, updated_at'
      )
      .order('updated_at', { ascending: false });

    if (sErr) throw sErr;

    // account_id → 최신 subscription (updated_at desc 정렬됐으므로 첫 매칭이 최신)
    const subByAccount = {};
    for (const s of subs || []) {
      if (s.account_id == null) continue;
      if (!subByAccount[s.account_id]) subByAccount[s.account_id] = s;
    }

    // 3. 결합 행 생성
    const rows = (accounts || []).map(a => {
      const sub = subByAccount[a.id] || null;
      const planId = a.plan || DEFAULT_PLAN_ID; // plan truth = accounts.plan
      const plan = getPlan(planId);
      const bs = billingState(sub);
      const isOwner = a.role === 'owner';
      return {
        account_id: a.id,
        email: a.email,
        display_name: a.display_name,
        role: a.role,
        account_status: a.status,
        plan_id: plan.id,           // accounts.plan 기준 (진실 소스)
        plan_label: plan.label,
        monthly_quota: plan.monthly_quota,
        // 구독(결제 상태) 레이어
        has_subscription: !!sub,
        subscription_id: sub ? sub.id : null,
        sub_plan_id: sub ? sub.plan_id : null, // 기록용(드리프트 감지). 진실 아님.
        billing_status: sub ? (sub.status || 'active') : null,
        cancel_at_period_end: sub ? !!sub.cancel_at_period_end : false,
        current_period_start: sub ? sub.current_period_start : null,
        current_period_end: sub ? sub.current_period_end : null,
        next_billing_at: sub ? sub.next_billing_at : null,
        failed_payment_count: sub ? (sub.failed_payment_count || 0) : 0,
        last_failed_at: sub ? sub.last_failed_at : null,
        // 파생 표시 상태
        state_key: bs.key,
        state_label: bs.label,
        // plan 드리프트: 구독 plan_id ≠ accounts.plan (있으면 운영자 주의)
        plan_drift: !!(sub && sub.plan_id && sub.plan_id !== plan.id),
        is_owner: isOwner,
        created_at: a.created_at,
      };
    });

    // 4. 집계 (owner는 구독 카운트에서 별도 — 정상/해지예정/미납 분포는 non-owner 기준)
    const counts = { active: 0, scheduled_cancel: 0, past_due: 0, canceled: 0, none: 0 };
    for (const r of rows) {
      counts[r.state_key] = (counts[r.state_key] || 0) + 1;
    }

    const summary = {
      total_accounts: rows.length,
      with_subscription: rows.filter(r => r.has_subscription).length,
      active: counts.active,
      scheduled_cancel: counts.scheduled_cancel,
      past_due: counts.past_due,
      canceled: counts.canceled,
      none: counts.none,
      plan_drift_count: rows.filter(r => r.plan_drift).length,
    };

    return res.status(200).json({
      ok: true,
      observed_at: new Date().toISOString(),
      summary,
      rows,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[subscriptions] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'SUBSCRIPTIONS_FETCH_FAILED',
      detail: e.message,
    });
  }
}
