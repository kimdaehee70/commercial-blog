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
// [SUBSCRIPTION-SINGLE-ROW-CONTRACT-FIX-01] 계정당 구독 1행 + update-in-place.
//   DB 가 subscriptions.account_id UNIQUE(subscriptions_account_id_key)로 계정당 1행을 강제한다.
//   (구 append-only 설계는 두 번째 INSERT 가 전부 23505 로 실패했다 — 2026-10-04 Vercel 로그 실측)
//   subscriptions 1행 = 현재 이용기간 SoT. 이력은 audit_logs / payment_history 가 담당한다.
//   기존 행이 있으면 같은 행을 갱신하고, 행이 아예 없을 때만 INSERT 한다.
//   갱신 결과(필드 값)는 구 설계의 '기존 행 종료 + 새 행' 과 같게 맞춘다.

import { supabaseAdmin } from '../supabaseAdmin';
import { getPlan, DEFAULT_PLAN_ID } from './plans';
import { periodFrom, isUsableSubscription } from './subscription';

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

const ROW_FIELDS = 'id, plan_id, status, source, current_period_start, current_period_end, cancel_at_period_end, scheduled_plan_id';

// 계정의 구독행(UNIQUE 라 0 또는 1건). status 무관.
async function findAccountRow(accountId) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select(ROW_FIELDS)
    .eq('account_id', accountId)
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

// status='active' 행 1건 — 사용자 해지/철회(cancelAtPeriodEnd/resumeSubscription) 전용. 자동갱신 상태 축.
//   applyPlan 의 '이용 가능' 판정은 이 함수가 아니라 isUsableSubscription 을 쓴다.
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
  const now = new Date();
  const nowIso = now.toISOString();
  const result = { action: null, closed: 0, created: null, updated: null, error: null };

  try {
    const row = await findAccountRow(accountId);
    const active = isUsableSubscription(row, now) ? row : null;

    // ── ① FREE = 즉시 강등. 이용 가능한 행이면 종료만(구독 없음 = FREE). ──
    if (planId === FREE_PLAN_ID) {
      if (active) {
        await updateRow(active.id, { status: 'canceled', current_period_end: nowIso });
        result.closed = 1;
      }
      result.action = 'downgrade_free';
      return result;
    }

    // ── ② 이용 가능한 구독 없음 → 신규 부여(오늘 = 결제완료일, 오늘부터 months 개월). ──
    //   행이 남아 있으면(만료·종료된 과거 주기) 그 행을 새 주기로 덮어쓴다. 없으면 INSERT.
    if (!active) {
      const { start, end } = periodFrom(now, months);
      const fields = freshFields({ planId, source, start, end, extra });
      if (row) result.updated = await updateRow(row.id, fields);
      else result.created = await insertRow({ accountId, ...fields });
      result.action = 'grant';
      return result;
    }

    const curQ = quotaOf(active.plan_id);
    const newQ = quotaOf(planId);

    // ── ③ 같은 플랜 → 기간 연장. ──
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
      result.updated = await updateRow(active.id, freshFields({
        planId, source,
        start: resetUsage ? active.current_period_end : active.current_period_start,
        end,
        extra,
      }));
      result.action = resetUsage ? 'renew' : 'extend';
      return result;
    }

    // ── ④ 업그레이드 → 기존 기간 승계. plan만 상향, quota 카운트는 이어진다. ──
    if (newQ > curQ) {
      result.updated = await updateRow(active.id, freshFields({
        planId, source,
        start: active.current_period_start,
        end: active.current_period_end,
        extra,
      }));
      result.action = 'upgrade';
      return result;
    }

    // ── ⑤ 다운그레이드 → 예약만. 현재 기간은 상위 플랜 그대로 유지. ──
    result.updated = await updateRow(active.id, { scheduled_plan_id: planId });
    result.action = 'downgrade_scheduled';
    return result;
  } catch (e) {
    console.error('[subscriptionWrite] applyPlan failed:', e?.message);
    result.error = e?.message || 'APPLY_PLAN_FAILED';
    return result;
  }
}

// 새 주기 행의 전체 필드 — 구 설계에서 INSERT 하던 '새 행' 과 같은 값.
//   이전 주기의 잔재(해지예약·변경예약·실패횟수·자동청구 키)는 넘기지 않는다.
//   billing_key_id / next_billing_at 은 결제 경로가 extra 로 줄 때만 값이 생긴다(관리자 지급 = null → 자동청구 대상 아님).
function freshFields({ planId, source, start, end, extra = {} }) {
  return {
    plan_id: planId,
    status: 'active',
    source,
    current_period_start: start,
    current_period_end: end,
    cancel_at_period_end: false,
    scheduled_plan_id: null,
    failed_payment_count: 0,
    last_failed_at: null,
    billing_key_id: extra.billing_key_id || null,
    next_billing_at: extra.next_billing_at || null,
  };
}

async function updateRow(id, patch) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ROW_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

async function insertRow({ accountId, ...fields }) {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({ account_id: accountId, ...fields })
    .select(ROW_FIELDS)
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
