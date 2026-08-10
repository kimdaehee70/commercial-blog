// lib/billing/usage.js
// v0.4 — quota 정책 정합화 (URL등록 시점 차감)
// SELECT-only / 트랜잭션 무관 / 멱등
//
// 정책 (확정): 생성=차감X / URL등록=차감O
//   - generated row(naver_post_url=NULL) 는 사용량에서 제외 (생성은 테스트 자유)
//   - published row(URL 등록 완료)만 사용량 1건으로 카운트
//   - 시점 기준 = published_at (차감=발행 시점). 월 리셋(1일)과 정합.
// (구 v0.3 baseline+created_at 기준 폐기 — 2 row 추가형 구조에서 published만 집계)
//
// ── [세션135 · QUOTA-SOFTDELETE-POLICY-01 확정] deleted_at 정책 ──────────────
// quota 는 "생성 호출 = 제공한 서비스량" 기준이다.
// 이 파일의 어떤 카운트에도 deleted_at 필터를 넣지 않는다. 누락이 아니라 의도다.
//   · 사용자가 생성물을 삭제해도 사용량은 복구되지 않는다.
//   · 삭제를 quota 복구로 인정하면 생성 → 삭제 → 재생성으로 무한 우회가 열린다.
//   · 산식/스키마 변경 금지. 한쪽에만 필터가 들어가면 화면(accounts-usage)과
//     차단(check-quota)이 갈라져 회원 quota 가 소급 복구된다.
// 환불·시스템 오류·오생성 보상은 삭제가 아니라 별도 보상 크레딧으로 처리한다
//   → QUOTA-CREDIT-01 (결제 연결 후 착수. 이 파일 수정 없이 가산 축으로 설계).
// ────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../supabaseAdmin';

/**
 * 특정 account의 기간 내 published row 카운트 반환.
 *
 * @param {number} accountId   - accounts.id (양의 정수)
 * @param {string} periodStart - ISO 8601 UTC string (inclusive)
 * @param {string} periodEnd   - ISO 8601 UTC string (exclusive)
 * @returns {Promise<number>}
 *
 * 기준:
 *   - publish_status = 'published'  (URL 등록 완료 글만 사용량 1건. generated row는 차감 X)
 *   - published_at IN [periodStart, periodEnd)
 *
 * 에러:
 *   - 입력 검증 실패 → throw
 *   - DB 에러 → throw
 *   - 0건 → 0 반환
 */
export async function countPublishedInPeriod(accountId, periodStart, periodEnd) {
  if (typeof accountId !== 'number' || !Number.isInteger(accountId) || accountId <= 0) {
    throw new Error('countPublishedInPeriod: accountId must be positive integer');
  }
  if (typeof periodStart !== 'string' || typeof periodEnd !== 'string') {
    throw new Error('countPublishedInPeriod: periodStart/periodEnd must be ISO strings');
  }

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('countPublishedInPeriod: invalid date string');
  }
  if (startDate >= endDate) {
    throw new Error('countPublishedInPeriod: periodStart must be < periodEnd');
  }

  const { count, error } = await supabaseAdmin
    .from('publish_history')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('publish_status', 'published')
    .gte('published_at', periodStart)
    .lt('published_at', periodEnd);

  if (error) {
    throw new Error(`countPublishedInPeriod DB error: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * [v138] 특정 account의 기간 내 '생성(baseline)' row 카운트 반환.
 *
 * 정책 전환: quota 기준 = '생성 횟수'. 호출(생성)이 곧 제공한 서비스이므로
 *   URL 등록 여부와 무관하게 생성 시점에 차감/차단한다.
 *
 * 기준:
 *   - publish_status = 'baseline'  (save-generated가 생성 시 insert하는 값)
 *   - created_at IN [periodStart, periodEnd)   (생성 시점 기준, 월 1일 리셋과 정합)
 *
 * 기존 countPublishedInPeriod(published 기준)는 불변 — 다른 호출처(대시보드/관리자 등)
 *   영향 차단. check-quota만 이 함수로 전환.
 */
export async function countGeneratedInPeriod(accountId, periodStart, periodEnd) {
  if (typeof accountId !== 'number' || !Number.isInteger(accountId) || accountId <= 0) {
    throw new Error('countGeneratedInPeriod: accountId must be positive integer');
  }
  if (typeof periodStart !== 'string' || typeof periodEnd !== 'string') {
    throw new Error('countGeneratedInPeriod: periodStart/periodEnd must be ISO strings');
  }

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('countGeneratedInPeriod: invalid date string');
  }
  if (startDate >= endDate) {
    throw new Error('countGeneratedInPeriod: periodStart must be < periodEnd');
  }

  // [세션135 · QUOTA-SOFTDELETE-POLICY-01] deleted_at 을 의도적으로 필터하지 않는다.
  //   삭제된 글도 사용량에 계속 포함된다. 필터 추가 = quota 우회 경로 신설이므로 금지.
  const { count, error } = await supabaseAdmin
    .from('publish_history')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('publish_status', 'baseline')
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd);

  if (error) {
    throw new Error(`countGeneratedInPeriod DB error: ${error.message}`);
  }

  return count ?? 0;
}
