// lib/billing/subscriptionWrite.js
// 세션74 v0.1 — 구독 '쓰기' 단일 진입점 (신규. subscription.js(읽기)와 짝)
//
// 배경: B-2(관리자 지급)와 B-4(PG 결제)가 같은 구독 이력 구조를 써야 한다.
//   source만 다르고 생성 로직은 동일해야 한다는 정책 확정에 따라
//   update-account.js 내부 helper였던 applyPlanSubscription을 여기로 승격했다.
//
// ── 확정 정책 (세션74) ────────────────────────────────────────
// 1) 취소(자동갱신 중단): status='active' 유지 + cancel_at_period_end=true
//    → resolveBillingPeriod가 계속 유효로 읽어 기간 끝까지 사용 가능.
// 2) 관리자 즉시 강등: status='canceled' + current_period_end=now()
//    → status만 바꾸면 canceled도 '기간 끝까지 유효'로 읽혀 강등이 안 먹는다. 두 값 동시 기록.
// 3) 업그레이드: 기존 period_start/end를 그대로 승계. 기간은 유지하고 plan만 올린다.
//    → 승계하지 않으면 Basic 30건 소진 후 Standard 전환 시 카운트가 0부터 재시작해
//      한 달에 90건이 되는 quota 누수가 생긴다(집계가 기간 기준이므로).
// 4) 다운그레이드: 즉시 내리지 않고 scheduled_plan_id에 예약만. 갱신 시 B-5가 적용.
// 5) 재결제(취소 철회): cancel_at_period_end=false 로 되돌리기만. 새 행 만들지 않음.
//
// append-only 원칙: 구독행은 '플랜이 바뀔 때'만 새로 INSERT한다.
//   취소/철회/예약은 기존 행의 플래그 변경(이력 축이 아니라 상태 축).

import { supabaseAdmin } from '../supabaseAdmin';
import { getPlan, DEFAULT_PLAN_ID } from './plans';
import { periodFrom } from './subscription';

const FREE_PLAN_ID = 'free';

// 플랜 등급 비교 — monthly_quota가 큰 쪽이 상위. plans가 SoT라 별도 순위표를 두지 않는다.
function quotaOf(planId) {
  try {
    const p = getPlan(planId || DEFAULT_PLAN_ID);
    return Number(p?.monthly_quota) || 0;
  } catch {
    return 0;
  }
}

// 현재 유효 구독행 1건 (쓰기용 — 읽기 helper와 동일 판정식).
async function findActiveRow(accountId, nowIso) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('id, plan_id, status, source, current_period_start, current_period_end, cancel_at_period_end, scheduled_plan_id')
    .eq('account_id', accountId)
    .eq('status', 'active')
    .gt('current_period_end', nowIso)
    .order('current_period_end', { ascending: false })
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

/**
 * 플랜 적용 — 관리자 지급(source='admin') / 결제(source='payment') 공용.
 *
 * @param {number} accountId
 * @param {string} planId       'free' | 'basic' | 'standard' | 'pro'
 * @param {number} months       신규 기간 부여 개월수(업그레이드 승계 시 무시)
 * @param {string} source       'admin' | 'payment' | 'trial'
 * @param {object} extra        { billing_key_id, next_billing_at } 결제 경로용(선택)
 * @param {boolean} resetUsage  같은 플랜 연장 시에만 의미. false(기본)=기간 연장(사용량 유지) /
 *                              true=새 과금 주기 시작(사용량 리셋). B-5 자동 갱신만 true.
 * @returns {{action, closed, created, updated, error}}
 *   action: grant | upgrade | downgrade_scheduled | extend | renew | downgrade_free
 */
export async function applyPlan({
  accountId, planId, months = 1, source = 'admin', extra = {},
  resetUsage = false,   // 기본 false — 명시하지 않으면 사용량을 지우지 않는다.
}) {
  const nowIso = new Date().toISOString();
  const result = { action: null, closed: 0, created: null, updated: null, error: null };

  try {
    const active = await findActiveRow(accountId, nowIso);

    // ── ① FREE = 즉시 강등. 활성행 종료만, 새 행 없음(구독 없음 = FREE). ──
    if (planId === FREE_PLAN_ID) {
      if (active) {
        const { data, error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', current_period_end: nowIso, updated_at: nowIso })
          .eq('id', active.id)
          .select('id');
        if (error) throw error;
        result.closed = Array.isArray(data) ? data.length : 0;
      }
      result.action = 'downgrade_free';
      return result;
    }

    // ── ② 활성 구독 없음 → 신규 부여 ──
    if (!active) {
      const { start, end } = periodFrom(new Date(), months);
      result.created = await insertRow({ accountId, planId, source, start, end, extra });
      result.action = 'grant';
      return result;
    }

    const curQ = quotaOf(active.plan_id);
    const newQ = quotaOf(planId);

    // ── ③ 같은 플랜 → 기간 연장. 새 행으로 이력 남김. ──
    //   end = 기존 end + months (now 기준으로 잡으면 남은 일수가 증발해 사용자가 손해).
    //   start는 resetUsage로 갈린다. 두 의미를 한 action이 갖고 있어 호출부가 명시해야 한다:
    //     · resetUsage=false (기본) — 기간 '연장'. start 승계 → 사용량 유지.
    //       관리자 기간 지급 / 프로모션 / 보상 연장 / 중도 추가 구매가 여기 해당.
    //     · resetUsage=true — 새 과금 주기 '시작'. start=기존 end → 사용량 리셋.
    //       B-5 자동 갱신에서만 명시적으로 전달한다.
    //   기본값을 false로 둔 이유: 플래그를 빠뜨린 호출이 사용량을 날리는 사고가
    //   그 반대(사용량이 남아 있는 사고)보다 훨씬 크다. 안전한 쪽을 기본값으로.
    if (planId === active.plan_id) {
      const { end } = periodFrom(new Date(active.current_period_end), months);
      result.closed = await closeRow(active.id, nowIso);
      result.created = await insertRow({
        accountId, planId, source,
        start: resetUsage ? active.current_period_end : active.current_period_start,
        end,
        extra,
      });
      result.action = resetUsage ? 'renew' : 'extend';
      return result;
    }

    // ── ④ 업그레이드 → 기존 기간 승계. plan만 상향, quota 카운트는 이어진다. ──
    if (newQ > curQ) {
      result.closed = await closeRow(active.id, nowIso);
      result.created = await insertRow({
        accountId, planId, source,
        start: active.current_period_start,
        end: active.current_period_end,
        extra,
      });
      result.action = 'upgrade';
      return result;
    }

    // ── ⑤ 다운그레이드 → 예약만. 현재 기간은 상위 플랜 그대로 유지. ──
    const { data: upd, error: uErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ scheduled_plan_id: planId, updated_at: nowIso })
      .eq('id', active.id)
      .select('id, plan_id, scheduled_plan_id, current_period_end')
      .single();
    if (uErr) throw uErr;
    result.updated = upd;
    result.action = 'downgrade_scheduled';
    return result;
  } catch (e) {
    console.error('[subscriptionWrite] applyPlan failed:', e?.message);
    result.error = e?.message || 'APPLY_PLAN_FAILED';
    return result;
  }
}

async function closeRow(id, nowIso) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled', current_period_end: nowIso, updated_at: nowIso })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

async function insertRow({ accountId, planId, source, start, end, extra = {} }) {
  const row = {
    account_id: accountId,
    plan_id: planId,
    status: 'active',
    source,
    current_period_start: start,
    current_period_end: end,
    cancel_at_period_end: false,
  };
  if (extra.billing_key_id) row.billing_key_id = extra.billing_key_id;
  if (extra.next_billing_at) row.next_billing_at = extra.next_billing_at;

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert(row)
    .select('id, plan_id, status, source, current_period_start, current_period_end, cancel_at_period_end, scheduled_plan_id')
    .single();
  if (error) throw error;
  return data;
}

/**
 * 구독 취소 — 자동 갱신만 중단. 기간 끝까지 사용 가능.
 * status는 건드리지 않는다(active 유지). 즉시 강등은 applyPlan(planId:'free').
 */
export async function cancelAtPeriodEnd(accountId) {
  const nowIso = new Date().toISOString();
  const active = await findActiveRow(accountId, nowIso);
  if (!active) return { ok: false, error: 'NO_ACTIVE_SUBSCRIPTION' };

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update({ cancel_at_period_end: true, next_billing_at: null, updated_at: nowIso })
    .eq('id', active.id)
    .select('id, plan_id, current_period_end, cancel_at_period_end')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, subscription: data };
}

/**
 * 취소 철회(재결제) — 플래그만 되돌린다. 새 구독행 만들지 않음.
 * 예약된 다운그레이드도 함께 해제할지는 호출부 판단 → clearScheduled 옵션.
 */
export async function resumeSubscription(accountId, { clearScheduled = false } = {}) {
  const nowIso = new Date().toISOString();
  const active = await findActiveRow(accountId, nowIso);
  if (!active) return { ok: false, error: 'NO_ACTIVE_SUBSCRIPTION' };

  const patch = { cancel_at_period_end: false, updated_at: nowIso };
  if (clearScheduled) patch.scheduled_plan_id = null;

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update(patch)
    .eq('id', active.id)
    .select('id, plan_id, current_period_end, cancel_at_period_end, scheduled_plan_id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, subscription: data };
}

export { findActiveRow };
