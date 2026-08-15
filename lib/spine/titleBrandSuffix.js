// ============================================================
// lib/spine/titleBrandSuffix.js
// Platform Spine — [T-1] Title Brand Suffix Layer
// ------------------------------------------------------------
// 역할: 완성된 제목 뒤에 「｜상호명」 접미사를 붙이는 후처리 1함수.
//   제목 생성 로직·Prompt·Spine·Data 무관. 조립 끝난 문자열만 받는다.
//
// 배경(2026-07-18 관측):
//   상조·전문서비스는 "검색 의도 탐색"과 "업체 선택"이 동시에 일어나는 업종.
//   제목 뒤 브랜드 노출이 신뢰 형성에 기여. 반대로 병원·외식은 업체명을 배제하고
//   검색하므로 접미사가 클릭률을 떨어뜨린다 → 화이트리스트 방식으로 한정.
//
// 원칙:
//   ① 검색 의도가 앞, 브랜드는 뒤. 제목 시작을 상호로 만들지 않는다.
//   ② 제목 > 브랜드. 길이 초과 시 접미사를 버리고 제목은 절대 자르지 않는다.
//   ③ 본문 상호 노출과 무관(PHILOSOPHY 원칙1 유지) — 제목 계층 전용.
//
// 사용:
//   import { appendBrandSuffix } from "../../lib/spine/titleBrandSuffix.js";
//   title = appendBrandSuffix(title, storeName, "funeral");
// ============================================================

// 접미사 ON 업종 — 업체 선택이 검색과 동시에 일어나는 업종만.
//   ★ 확장 시 이 Set에만 추가. 엔진·catalog 무수정.
//   ※ catalog(로드맵 전용 파일)를 엔진이 읽지 않도록 화이트리스트를 여기서 소유한다.
export const BRAND_SUFFIX_INDUSTRIES = new Set([
  "funeral",         // 상조
  "legal",           // 법무사
  "lawyer",          // 변호사
  "tax",             // 세무사
  "labor",           // 노무사
  "administrative",  // 행정사
]);

const SEPARATOR = " ｜ ";   // 전각 — 제목 내부 구분자(｜)와 시각 동일, 상호 전용 위치는 맨 뒤 고정
const DEFAULT_MAX_LEN = 40;

// [T-1B] 역할어 차단 (2026-08-15 관측 · FUNERAL-TITLE-SUFFIX-01)
//   상호 필드에 역할 라벨이 들어온 경우 브랜드로 부착하지 않는다.
//   ★ 신규 규칙이 아니다. 본문 계층은 이미 이 단어들을 화자 오염어로 전량 제거 중이며
//     (generateLawyer.js 143행 등 20+ 엔진 공통), 제목 계층에만 게이트가 없어
//     본문 0회 / 제목 노출이라는 불일치가 발생했다. 기존 계약의 제목 계층 복원.
//   ★ 근본 원인은 store_profiles.store_name 입력값이다. 이 게이트는 구조 방어이지
//     데이터 교정이 아니다. 잘못된 상호는 업체정보에서 별도로 고친다.
const ROLE_WORDS = new Set([
  "운영자", "관리자", "작성자", "편집자", "블로그지기", "블로그 관리자", "사용자", "대표",
]);

// 상호 정규화 — 법인격 표기는 제목에서 생략(검색 노출 길이 확보).
//   "삼고라이프상조 (주)" → "삼고라이프상조"
function _normalizeStore(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s*\((주|유|합|재|사)\)\s*$/g, "")
    .replace(/\s*(주식회사|유한회사)\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function _key(s) {
  return String(s || "").replace(/\s+/g, "").toLowerCase();
}

/**
 * 제목 뒤 브랜드 접미사 부착.
 * @param {string} title     완성된 제목(조립 완료 상태)
 * @param {string} storeName 상호명
 * @param {string} industry  업종 키
 * @param {object} [opt]     { maxLen, separator, force }
 * @returns {string} 접미사 부착 제목. 조건 미충족 시 원본 그대로.
 *
 * 미부착 조건(모두 원본 반환 — 예외 throw 없음):
 *   - 업종이 화이트리스트 밖 (opt.force=true면 우회)
 *   - storeName 없음 / placeholder({storeName})
 *   - storeName 이 역할어(운영자·관리자 등) — T-1B
 *   - 제목에 이미 상호 포함(중복 방지)
 *   - 접미사 부착 시 maxLen 초과 (제목 절단 금지 — 브랜드를 버린다)
 */
export function appendBrandSuffix(title, storeName, industry, opt = {}) {
  const base = String(title || "").trim();
  if (!base) return base;

  const { maxLen = DEFAULT_MAX_LEN, separator = SEPARATOR, force = false } = opt;

  // ① 업종 게이트
  if (!force && !BRAND_SUFFIX_INDUSTRIES.has(industry)) return base;

  // ② 상호 유효성 — placeholder·빈값 차단
  const store = _normalizeStore(storeName);
  if (!store || store === "{storeName}") return base;

  // ②-B 역할어 차단 — 상호가 아니라 역할 라벨이면 미부착 (T-1B)
  if (ROLE_WORDS.has(store)) return base;

  // ③ 중복 방지 — 제목이 이미 상호를 품고 있으면 미부착
  if (_key(base).includes(_key(store))) return base;

  // ④ 길이 — 초과 시 브랜드를 버리고 제목 유지(원칙②)
  const merged = `${base}${separator}${store}`;
  if (merged.length > maxLen) return base;

  return merged;
}

export default { appendBrandSuffix, BRAND_SUFFIX_INDUSTRIES };
