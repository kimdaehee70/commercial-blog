// lib/billing/syncAccountPlan.js
// v0.1 (70차 skeleton — interface freeze only)
// 결정 1: accounts.plan ↔ subscriptions.plan_id 양쪽 유지 — 앱 레이어 sync
// 본격 구현: 70차 후반 / 71차
// PHILOSOPHY: subscriptions.plan_id 가 권위 / accounts.plan 은 derivative
// 트리거 없이 명시적 함수 호출 — 디버깅 용이성 우선

/**
 * subscriptions 변경 후 accounts.plan 을 동기화
 * - 호출 시점: createSubscription / changePlan / cancelSubscription / webhook
 * - 트랜잭션 처리 권장 (subscriptions update + accounts update 한 묶음)
 *
 * @param {object} params
 * @param {number} params.accountId
 * @param {object} params.supabase - service role
 * @returns {Promise<{
 *   ok: boolean,
 *   accountId: number,
 *   previousPlan?: string,
 *   newPlan?: string,
 *   reason?: string
 * }>}
 */
export async function syncAccountPlan({ accountId, supabase }) {
  // TODO(71차):
  //  1. SELECT plan_id FROM subscriptions WHERE account_id=$1 AND status='active'
  //     - 없으면 'free' 로 강제
  //  2. UPDATE accounts SET plan=$1 WHERE id=$2 (실제 변경 시에만)
  //  3. 변경 전/후 반환
  return { ok: false, accountId, reason: 'NOT_IMPLEMENTED' };
}

/**
 * 전체 sync 점검 (배치 — 정합 검증용)
 * accounts.plan ≠ active subscription.plan_id 인 row 탐지
 *
 * @param {object} params
 * @param {object} params.supabase
 * @returns {Promise<{
 *   ok: boolean,
 *   mismatches: Array<{ account_id: number, accounts_plan: string, sub_plan_id: string|null }>
 * }>}
 */
export async function auditAccountPlanSync({ supabase }) {
  // TODO(71차): 정합 점검 쿼리 (admin 진단용)
  return { ok: false, mismatches: [] };
}
