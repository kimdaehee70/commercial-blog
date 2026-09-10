// lib/pseo/eligibility.js
// ─────────────────────────────────────────────────────────────
// [PSEO-V1-PAID-USER-EXPANSION-01] pSEO 유료 자격 판정 + Intent 집계.
//
// 조회 전용. 결제·엔진·관측 SoT 무접촉. DDL 0 / migration 0 / 백필 0.
//
// 확정 원칙 (승인분):
//   · 유료 판정은 신규 규칙을 만들지 않는다. 기존 권한 판정
//     resolveBillingPeriod() 를 그대로 재사용한다.
//   · accounts.plan 단독 판정 금지 — 실측에서 subscriptions 와 모순 확인.
//     (account 4: accounts.plan='free' / subscriptions.plan_id='standard')
//   · grace 금지. 임시 스위치·우회 함수 금지. 자격 미달이면 곧장 notFound.
//
// resolveBillingPeriod 의 basis 3종과 pSEO 판정의 대응:
//   basis='subscription' → 유효 구독행 존재
//        (status in ('active','canceled') AND current_period_end > now)
//        canceled = 해지 예약. 잔여 기간까지는 유효 이용자 → 통과.
//        기간이 끝나면 같은 판정식이 자동으로 탈락시킨다.
//   basis='lifetime'     → FREE 누적 체험 → 불가
//   basis='calendar'     → 유효 구독 없음 → 불가
//
// fail-closed: Supabase 클라이언트 생성 실패 / 조회 실패 시
//   resolveBillingPeriod 는 calendar 로 폴백한다 → 여기서 자동 차단된다.
//   어떤 실패 경로에서도 무자격 공개가 발생하지 않는다.
// ─────────────────────────────────────────────────────────────

import { resolveBillingPeriod } from '../billing/subscription';

// 유료 플랜 집합. free 는 여기에 없다.
const PAID_PLANS = new Set(['basic', 'standard', 'pro']);

// Intent 공개 자격 하한. [intentSlug].js 의 MIN_POSTS 와 같은 값이어야 한다.
export const MIN_POSTS = 2;

// [PSEO-EMPTY-HUB-01] 허브 공개 자격 하한. Intent 자격(MIN_POSTS)과 완전히 별도 Gate.
//   허브 = 업체의 pSEO 진입 페이지 → 정상 발행글 1건부터 존재 근거가 성립한다.
//   Intent = 동일 core_keyword 2건 이상. 두 규칙을 섞지 않는다.
export const MIN_HUB_POSTS = 1;

/**
 * account 기준 published 총건수.
 *
 * 허브 자격 전용. core_keyword 조건을 걸지 않는다 —
 *   core_keyword NULL(PSEO-CORE-KEYWORD-NULL-01)이 허브 공개 여부를 오염시키면 안 된다.
 *
 * @param {object} sb    호출부의 service role 클라이언트
 * @param {number|null} accountId
 * @returns {Promise<number>}
 */
export async function countPublishedPosts(sb, accountId) {
  if (!sb || !accountId) return 0;

  const { count, error } = await sb
    .from('publish_history')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('publish_status', 'published')
    .is('deleted_at', null);

  // 조회 오류를 0으로 삼키면 유료 업체가 조용히 404가 된다.
  if (error) {
    throw new Error(`PSEO_POSTCOUNT_FAILED code=${error.code} msg=${error.message}`);
  }
  return count || 0;
}

/**
 * pSEO 공개 자격 판정.
 * @param {number|null} accountId store_profiles.account_id
 * @returns {Promise<{ok:boolean, reason:string, planId?:string, periodEnd?:string}>}
 *   reason 은 서버 로그 전용. 클라이언트로 내보내지 않는다(사유 노출 금지).
 */
export async function isPseoEligible(accountId) {
  if (!accountId) return { ok: false, reason: 'NO_ACCOUNT' };

  const p = await resolveBillingPeriod(accountId);

  if (!p || p.basis !== 'subscription') {
    return { ok: false, reason: `BASIS_${String(p?.basis || 'NULL').toUpperCase()}` };
  }
  if (!PAID_PLANS.has(String(p.plan_id || ''))) {
    return { ok: false, reason: 'PLAN_NOT_PAID' };
  }
  return { ok: true, reason: 'PAID', planId: p.plan_id, periodEnd: p.end };
}

/**
 * 자격 있는 Intent 목록. core_keyword 별 발행글 수를 세어 하한 이상만 반환.
 *
 * Intent SoT = publish_history.core_keyword (생성시점 확정·역산 금지).
 * 귀속은 account_id 경유. publish_history.store_id 는 1/1809 로 사실상
 * 미사용이므로 신뢰하지 않는다.
 *
 * @param {object} sb    호출부의 service role 클라이언트
 * @param {number} accountId
 * @param {object} opts  { exclude, limit, min }
 * @returns {Promise<Array<{intent:string, count:number}>>}
 */
export async function listQualifiedIntents(
  sb,
  accountId,
  { exclude = '', limit = 20, min = MIN_POSTS } = {}
) {
  if (!sb || !accountId) return [];

  const { data, error } = await sb
    .from('publish_history')
    .select('core_keyword')
    .eq('account_id', accountId)
    .eq('publish_status', 'published')
    .is('deleted_at', null)
    .not('core_keyword', 'is', null)
    .limit(500);

  // 조회 오류를 빈 배열로 삼키면 "왜 목록이 비었는지"를 영원히 모른다.
  if (error) {
    throw new Error(`PSEO_INTENTS_FAILED code=${error.code} msg=${error.message}`);
  }

  const cnt = new Map();
  for (const r of data || []) {
    const k = String(r.core_keyword || '').trim();
    if (!k || k === exclude) continue;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }

  return [...cnt.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'ko'))
    .slice(0, limit)
    .map(([intent, count]) => ({ intent, count }));
}
