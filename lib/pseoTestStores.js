// lib/pseoTestStores.js
// [PSEO-INTERNAL-WORK-MODE-FIX-01] pSEO 내부공사 기간 테스트 allowlist 정본(단일 SoT).
//   · 일반회원의 search_fact 입력·수정은 잠그고, OWNER 또는 아래 store 만 허용한다.
//   · role/OWNER/admin 과 무관한 별도 목록 — 테스트 종료 시 배열을 비우거나 이 파일을 삭제하면 원복.
//   · 클라이언트(lib/Store.js)와 서버(pages/api/me/store.js)가 같은 판정 함수를 쓴다.
//   · 공개 /p/*, sitemap, robots, eligibility, CTA 와 무관.
export const PSEO_TEST_STORE_IDS = [14]; // 14 = LG 인테리어

export function canManagePseoFact(storeId, isOwner) {
  if (isOwner) return true;
  const id = Number(storeId);
  return Number.isFinite(id) && PSEO_TEST_STORE_IDS.includes(id);
}
