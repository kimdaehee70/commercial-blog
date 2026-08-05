// lib/billing/charge.js
// v0.1 (70차 skeleton — interface freeze only)
// 결제 금액 계산 + 포트원 SDK 호출 (실제 PG 호출은 71차+)
// 결정 2: base(선불, 다음달) + overage(후불, 지난달) 같은 청구서

/**
 * 다음 청구서 금액 계산 (실 결제 전 dry-run)
 *
 * @param {object} params
 * @param {number} params.accountId
 * @param {object} params.subscription   - getActiveSubscription 결과
 * @param {object} params.planRow        - plans 테이블 row
 * @param {object} params.supabase
 * @returns {Promise<{
 *   ok: boolean,
 *   baseAmount: number,
 *   overageAmount: number,
 *   overageQuantity: number,
 *   totalAmount: number,
 *   periodStart: string,
 *   periodEnd: string,
 *   overagePeriodStart: string|null,
 *   overagePeriodEnd: string|null,
 *   reason?: string
 * }>}
 */
export async function estimateNextCharge({ accountId, subscription, planRow, supabase }) {
  // TODO(71차):
  //  - base = planRow.price (선불 = 다음 주기)
  //  - overage = getPreviousPeriodOverage (후불 = 지난 주기)
  //  - total = base + overage
  //  - period_* 는 다음 주기 / overage_period_* 는 지난 주기
  return {
    ok: false,
    baseAmount: 0,
    overageAmount: 0,
    overageQuantity: 0,
    totalAmount: 0,
    periodStart: '',
    periodEnd: '',
    overagePeriodStart: null,
    overagePeriodEnd: null,
    reason: 'NOT_IMPLEMENTED',
  };
}

/**
 * 정기결제 실행 (빌링키 결제)
 * - 포트원 V2 SDK 호출 → 결과를 recordPayment 로 위임
 *
 * @param {object} params
 * @param {number} params.accountId
 * @param {number} params.subscriptionId
 * @param {number} params.billingKeyId
 * @param {string} params.kind           - 'recurring'|'initial'|'manual'
 * @param {object} params.estimate       - estimateNextCharge 결과
 * @param {object} params.supabase
 * @returns {Promise<{
 *   ok: boolean,
 *   paymentHistoryId?: number,
 *   pgTxId?: string,
 *   status?: 'paid'|'failed',
 *   reason?: string
 * }>}
 */
export async function chargeBillingKey({ accountId, subscriptionId, billingKeyId, kind, estimate, supabase }) {
  // TODO(71차):
  //  1. billing_keys 에서 billing_key 조회
  //  2. 포트원 V2 SDK requestPayment (billingKey 결제)
  //  3. 응답 → recordPayment 로 위임
  //  4. 실패 시 failed_payment_count++ / last_failed_at 갱신 (subscriptions)
  return { ok: false, reason: 'NOT_IMPLEMENTED' };
}

/**
 * 환불 처리
 *
 * @param {object} params
 * @param {number} params.paymentHistoryId
 * @param {number} params.amount         - 부분환불 가능
 * @param {string} [params.reason]
 * @param {object} params.supabase
 * @returns {Promise<{ ok: boolean, refundedAmount?: number, reason?: string }>}
 */
export async function refundPayment({ paymentHistoryId, amount, reason, supabase }) {
  // TODO(71차): 포트원 V2 cancelPayment 호출 → payment_history.status 갱신
  return { ok: false, reason: 'NOT_IMPLEMENTED' };
}
