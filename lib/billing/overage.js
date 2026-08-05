// lib/billing/overage.js
// v0.1 (70차 skeleton — interface freeze only)
// publish_history 집계 → overage 계산
// 본격 구현: 70차 후반 / 71차
// 결정 2: overage 이월 합산 — 월 N 발생 → 월 N+1 청구

/**
 * 특정 기간 동안의 publish 카운트 집계
 * - 'published' status 만 카운트 (정책 확정 시 조정)
 *
 * @param {object} params
 * @param {number} params.accountId
 * @param {string} params.periodStart - ISO (inclusive)
 * @param {string} params.periodEnd   - ISO (exclusive)
 * @param {object} params.supabase
 * @returns {Promise<{
 *   ok: boolean,
 *   count: number,
 *   periodStart: string,
 *   periodEnd: string
 * }>}
 */
export async function countPublishedInPeriod({ accountId, periodStart, periodEnd, supabase }) {
  // TODO(71차): SELECT COUNT(*) FROM publish_history
  //   WHERE account_id=$1 AND publish_status='published'
  //   AND created_at >= $2 AND created_at < $3
  return { ok: false, count: 0, periodStart, periodEnd };
}

/**
 * 플랜 limit 대비 overage 산출
 *
 * @param {object} params
 * @param {string} params.planId          - 'free'|'basic'|'pro'
 * @param {number} params.usedCount       - 기간 내 발행 건수
 * @param {object} params.planLimits      - { included: number, overage_unit_price: number, allow_overage: boolean }
 * @returns {{
 *   overageQuantity: number,
 *   overageAmount: number,
 *   allowed: boolean
 * }}
 */
export function calculateOverage({ planId, usedCount, planLimits }) {
  // TODO(71차): max(0, usedCount - included) * overage_unit_price
  // free 플랜: allow_overage=false → quantity 0 강제
  return { overageQuantity: 0, overageAmount: 0, allowed: false };
}

/**
 * 직전 기간 overage 조회 (다음 청구서에 합산 — 결정 2)
 *
 * @param {object} params
 * @param {number} params.accountId
 * @param {string} params.previousPeriodStart
 * @param {string} params.previousPeriodEnd
 * @param {object} params.supabase
 * @returns {Promise<{
 *   ok: boolean,
 *   overageQuantity: number,
 *   overageAmount: number,
 *   overagePeriodStart: string,
 *   overagePeriodEnd: string
 * }>}
 */
export async function getPreviousPeriodOverage({ accountId, previousPeriodStart, previousPeriodEnd, supabase }) {
  // TODO(71차): countPublishedInPeriod + calculateOverage 조합
  return {
    ok: false,
    overageQuantity: 0,
    overageAmount: 0,
    overagePeriodStart: previousPeriodStart,
    overagePeriodEnd: previousPeriodEnd,
  };
}
