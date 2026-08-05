// lib/overage.js v0.1
// 94차 — overage 계산 helper
//
// 역할: 한 사이클(period_start ~ period_end) 동안의 사용량을 집계하고
//       plan.monthly_quota 초과분을 quantity / amount 로 반환
//
// 호출처:
//   - pages/api/billing/charge-due.js  (정기결제 시 overage 산정)
//   - 향후 dashboard / admin 미리보기 등
//
// 원칙:
//   - DB 스키마 무변경
//   - publish.js FREEZE 유지
//   - generated_posts 카운트 소스 (현 운영 카운트 패턴 답습)
//   - plan.overage_per_post_krw 컬럼 사용 (plans 스키마 확정)
//   - 예외/누락 시 안전한 0 fallback (결제 차단보다 흐름 유지 우선)

import { supabaseAdmin } from './supabaseAdmin';

/**
 * 한 계정의 사이클 사용량과 overage 산정
 *
 * @param {object} params
 * @param {string} params.account_id
 * @param {string} params.period_start   ISO timestamp
 * @param {string} params.period_end     ISO timestamp
 * @param {object} params.plan           { monthly_quota, overage_per_post_krw }
 * @returns {Promise<{
 *   usage: number,
 *   quota: number,
 *   quantity: number,
 *   unit_krw: number,
 *   amount: number,
 *   source: string,
 *   error: (string|null)
 * }>}
 */
export async function calcOverage({ account_id, period_start, period_end, plan }) {
  const result = {
    usage: 0,
    quota: Number(plan?.monthly_quota || 0),
    quantity: 0,
    unit_krw: Number(plan?.overage_per_post_krw || 0),
    amount: 0,
    source: 'generated_posts',
    error: null,
  };

  // 입력 가드 — 결제 흐름 차단보다 0 fallback 우선
  if (!account_id || !period_start || !period_end) {
    result.error = 'missing_params';
    return result;
  }

  try {
    // generated_posts head count
    // ※ 컬럼명 mismatch 시 error 분기로 빠지고 amount=0 반환 (안전 fallback)
    const { count, error } = await supabaseAdmin
      .from('generated_posts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', account_id)
      .gte('created_at', period_start)
      .lt('created_at', period_end);

    if (error) {
      result.error = 'usage_query: ' + error.message;
      return result;
    }

    const usage = Number(count || 0);
    result.usage = usage;

    const over = Math.max(0, usage - result.quota);
    result.quantity = over;
    result.amount = over * result.unit_krw;

    return result;
  } catch (e) {
    result.error = 'exception: ' + (e?.message || String(e));
    return result;
  }
}

export default calcOverage;
