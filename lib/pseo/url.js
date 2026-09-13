// lib/pseo/url.js
// ─────────────────────────────────────────────────────────────
// [PSEO-SEARCH-INDEX-BOARD-01] pSEO 공개 URL 단일 파생 지점(SoT).
//
// ★ URL 은 저장하지 않는다. storeId + core_keyword 에서 매번 조립한다.
//   pSEO 페이지 자체가 SSR 시점 파생물이다(공개 자격·발행 상태에 따라 200/404 가
//   갈린다). URL 을 컬럼에 저장하면 만료·재결제·글 삭제 때 저장값과 실제 응답이
//   어긋나고, 그 어긋남을 고치는 백필 축이 새로 생긴다. DDL 0 의 근거이기도 하다.
//
// ★ 도메인 정본 = apex(https://ai-post.ai). www 아님.
//   pages/api/billing/webhook/portone.js:35 의 운영 주석과 같은 값이다.
//   NEXT_PUBLIC_SITE_ORIGIN 은 이미 존재하는 변수다(qr-session.js:203).
//   신규 env 를 만들지 않는다 — 결제축이 쓰는 것과 같은 오리진을 공유한다.
//   미설정 시 apex 리터럴로 떨어진다(선장 승인 A-1).
//
// ★ 향후 도메인이 바뀌면 이 파일 한 곳만 고친다.
//   호출부에서 문자열을 직접 이어붙이지 않는다.
//
// ★ Intent 슬러그는 core_keyword 원문이다(한글·공백 포함).
//   encodeURIComponent 로 인코딩한다 — 공백이 들어간 키워드가 실재한다.
//   실측: /p/12/강남구 장례식장 → 200.
//
// 표시·조립 전용 — 인증·DB·판정 로직 없음.
// ─────────────────────────────────────────────────────────────

export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN || 'https://ai-post.ai';

// 허브 경로. storeId 가 비면 null — 빈 문자열을 반환해 '/p/' 같은 깨진 링크를 만들지 않는다.
export function hubPath(storeId) {
  if (storeId === null || storeId === undefined || storeId === '') return null;
  return `/p/${storeId}`;
}

// Intent 경로. 키워드가 비면 null.
export function intentPath(storeId, coreKeyword) {
  const base = hubPath(storeId);
  const kw = String(coreKeyword ?? '').trim();
  if (!base || !kw) return null;
  return `${base}/${encodeURIComponent(kw)}`;
}

export function absUrl(path) {
  if (!path) return null;
  return `${SITE_ORIGIN}${path}`;
}

export function hubUrl(storeId) {
  return absUrl(hubPath(storeId));
}

export function intentUrl(storeId, coreKeyword) {
  return absUrl(intentPath(storeId, coreKeyword));
}
