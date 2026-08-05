// pages/api/admin/billing-action.js
// v0.1: Billing 상태 변경 — 결제 상태 레이어 write (PG 미연동, 수동 운영)
//
// A 구조 (94차 확정):
//   accounts.plan = plan 진실 소스 (quota 경로가 참조)
//   subscriptions = 결제 이력/상태 레이어 (status / 기간 / 해지예정)
//   → 결제완료 시 accounts.plan 갱신(+ subscriptions upsert), 그 외엔 subscriptions만 변경.
//   → quota는 계속 accounts.plan 참조. by-member.js / quota 경로 무수정.
//
// 액션 4종:
//   mark_paid       : plan 결제 처리. accounts.plan = plan + subscriptions upsert(active, 기간 설정).
//   mark_past_due   : 미납 처리. subscriptions.status = 'past_due', failed_payment_count++.
//   schedule_cancel : 해지예정 토글. subscriptions.cancel_at_period_end = bool (기간말 해지).
//   cancel_now      : 즉시 해지. subscriptions.status = 'canceled'. (accounts.plan은 운영자 판단 — 본 API는 plan 강등 안 함)
//
// 검증/가드/audit 패턴 출처: update-account.js (requireOwner / owner 차단 / PLANS whitelist / writeAudit / 23505)
// accounts.plan UPDATE는 update-account.js와 동일 방식(whitelist + updated_at + owner 차단)으로만 수행.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { OWNER_UID } from '../../../lib/constants';
import { PLANS } from '../../../lib/billing/plans';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';

const ALLOWED_PLANS = Object.keys(PLANS); // ['free','basic','pro']
const ALLOWED_ACTIONS = ['mark_paid', 'mark_past_due', 'schedule_cancel', 'cancel_now'];

// 기본 구독 주기: 결제일로부터 30일. (PG 연동 전 수동 운영 기준)
function periodFromNow(days = 30) {
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (update-account.js 패턴 동일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const {
      action,            // 필수: ALLOWED_ACTIONS 중 하나
      target_id,         // 필수: accounts.id
      plan,              // mark_paid 시 필수: 결제할 플랜
      cancel,            // schedule_cancel 시: true=해지예정 설정 / false=해제
      period_days,       // 선택: 구독 주기(기본 30)
    } = req.body || {};

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return res.status(400).json({ ok: false, error: 'INVALID_ACTION', allowed: ALLOWED_ACTIONS });
    }
    if (!target_id) {
      return res.status(400).json({ ok: false, error: 'TARGET_ID_REQUIRED' });
    }

    // ── 타겟 계정 조회 (owner 차단 검증) ───────────────────────
    const { data: target, error: tErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, plan, status, role, auth_user_id')
      .eq('id', target_id)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!target) {
      return res.status(404).json({ ok: false, error: 'TARGET_NOT_FOUND' });
    }

    // ── owner 본인 자해 방지 (update-account.js와 동일) ────────
    const isOwnerTarget = target.role === 'owner' || target.auth_user_id === OWNER_UID;
    if (isOwnerTarget) {
      return res.status(403).json({
        ok: false,
        error: 'OWNER_ACCOUNT_READONLY',
        message: 'owner 계정은 자해 방지를 위해 읽기 전용입니다.',
      });
    }

    // ── 현재 구독 행 조회 (account별 최신 1건) ─────────────────
    const { data: subList, error: sErr } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('account_id', target_id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sErr) throw sErr;
    const currentSub = (subList && subList[0]) || null;

    const nowIso = new Date().toISOString();
    let result = {};
    let auditBefore = {};
    let auditAfter = {};

    // ───────────────────────────────────────────────────────────
    // 액션 분기
    // ───────────────────────────────────────────────────────────
    if (action === 'mark_paid') {
      // 결제완료: plan 진실 소스(accounts.plan) 갱신 + subscriptions upsert(active)
      if (!plan || !ALLOWED_PLANS.includes(plan)) {
        return res.status(400).json({ ok: false, error: 'INVALID_PLAN', allowed: ALLOWED_PLANS });
      }
      const { start, end } = periodFromNow(Number(period_days) > 0 ? Number(period_days) : 30);

      // (1) accounts.plan 갱신 — update-account.js와 동일 방식 (whitelist 통과 + updated_at)
      const { data: updatedAcc, error: aErr } = await supabaseAdmin
        .from('accounts')
        .update({ plan, updated_at: nowIso })
        .eq('id', target_id)
        .select('id, email, plan, status, role')
        .single();
      if (aErr) throw aErr;

      // (2) subscriptions upsert: 기존 row 있으면 update, 없으면 insert
      const subPayload = {
        account_id: target_id,
        plan_id: plan,             // 기록용 — accounts.plan과 동기화
        status: 'active',
        current_period_start: start,
        current_period_end: end,
        cancel_at_period_end: false,
        updated_at: nowIso,
      };
      let subRow;
      if (currentSub) {
        const { data: u, error: uErr } = await supabaseAdmin
          .from('subscriptions')
          .update(subPayload)
          .eq('id', currentSub.id)
          .select('*')
          .single();
        if (uErr) throw uErr;
        subRow = u;
      } else {
        const { data: ins, error: iErr } = await supabaseAdmin
          .from('subscriptions')
          .insert({ ...subPayload, failed_payment_count: 0 })
          .select('*')
          .single();
        if (iErr) throw iErr;
        subRow = ins;
      }

      result = { account: updatedAcc, subscription: subRow };
      auditBefore = { plan: target.plan, sub_status: currentSub ? currentSub.status : null };
      auditAfter = { plan, sub_status: 'active', period_end: end };

    } else if (action === 'mark_past_due') {
      // 미납: subscriptions.status = past_due, failed_payment_count++. accounts.plan 무변경.
      if (!currentSub) {
        return res.status(409).json({ ok: false, error: 'NO_SUBSCRIPTION', message: '구독 이력이 없어 미납 처리할 수 없습니다.' });
      }
      const { data: u, error: uErr } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'past_due',
          failed_payment_count: (currentSub.failed_payment_count || 0) + 1,
          last_failed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', currentSub.id)
        .select('*')
        .single();
      if (uErr) throw uErr;
      result = { subscription: u };
      auditBefore = { sub_status: currentSub.status, failed: currentSub.failed_payment_count || 0 };
      auditAfter = { sub_status: 'past_due', failed: u.failed_payment_count };

    } else if (action === 'schedule_cancel') {
      // 해지예정 토글: cancel_at_period_end = bool. status는 active 유지(기간말 해지).
      if (!currentSub) {
        return res.status(409).json({ ok: false, error: 'NO_SUBSCRIPTION', message: '구독 이력이 없어 해지예정 설정할 수 없습니다.' });
      }
      const next = cancel === undefined ? !currentSub.cancel_at_period_end : !!cancel;
      const { data: u, error: uErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ cancel_at_period_end: next, updated_at: nowIso })
        .eq('id', currentSub.id)
        .select('*')
        .single();
      if (uErr) throw uErr;
      result = { subscription: u };
      auditBefore = { cancel_at_period_end: currentSub.cancel_at_period_end };
      auditAfter = { cancel_at_period_end: next };

    } else if (action === 'cancel_now') {
      // 즉시 해지: subscriptions.status = canceled.
      //   ⚠️ accounts.plan 강등은 본 API에서 자동 수행하지 않음(운영자가 별도 free 전환 판단).
      //   이유: 해지 즉시 quota를 free로 떨어뜨릴지(잔여기간 유지할지)는 정책 결정 사항.
      if (!currentSub) {
        return res.status(409).json({ ok: false, error: 'NO_SUBSCRIPTION', message: '구독 이력이 없어 해지할 수 없습니다.' });
      }
      const { data: u, error: uErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled', cancel_at_period_end: false, updated_at: nowIso })
        .eq('id', currentSub.id)
        .select('*')
        .single();
      if (uErr) throw uErr;
      result = { subscription: u };
      auditBefore = { sub_status: currentSub.status };
      auditAfter = { sub_status: 'canceled' };
    }

    console.log(`[billing-action] ✓ action=${action} id=${target_id} by=${user.id}`);

    // ── audit (update-account.js 패턴) ────────────────────────
    await writeAudit({
      actor: user,
      actor_role: 'owner',
      action: `billing.${action}`,
      target_type: 'account',
      target_id,
      before: auditBefore,
      after: auditAfter,
      detail: { target_email: target.email },
    });

    return res.status(200).json({
      ok: true,
      action,
      ...result,
      verified: { auth_user_id: user.id, is_owner: true },
    });
  } catch (e) {
    console.error('[billing-action] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'BILLING_ACTION_FAILED',
      detail: e.message,
    });
  }
}
