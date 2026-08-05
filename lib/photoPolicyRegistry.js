// lib/photoPolicyRegistry.js
// 사진 정책 SoT (운영 정책 — 엔진 4파일 무관 / narrative 아님 / 표시 전용)
// 근거: 세션47 — 사진 슬롯은 Restaurant 공통 운영정책. 한식·중식·양식·분식·치킨 일괄 적용.
//   generate/data/prompts/playConfig 무관. index.js 발행 전 체크리스트가 조회만 한다.
// 원칙(PHILOSOPHY 정합): 매장명 미노출 / scene 강화 축과 별개(본문 반영 사진은 엔진 소유).
//   이 파일은 "발행 시 어떤 사진을 몇 장 준비하라"는 사용자 안내용 SoT일 뿐이다.

// Restaurant 계열 공통 5슬롯 (기본 5장 · 권장 6~7장)
//   대표메뉴는 복수 허용 → 권장 상한 6~7장.
export const RESTAURANT_PHOTO_SLOTS = {
  baseCount: 5,
  recommendMax: 7,
  slots: [
    { key: "exterior",  label: "외관",        desc: "간판·입구·건물 전경" },
    { key: "interior",  label: "실내/좌석",   desc: "홀·좌석 배치·테이블" },
    { key: "repMenu",   label: "대표 메뉴",   desc: "간판 메뉴 클로즈업(1~2컷 권장)" },
    { key: "menuBoard", label: "메뉴판",      desc: "메뉴·가격 확인용" },
    { key: "mood",      label: "분위기/디테일", desc: "조명·플레이팅·창가 등 디테일" },
  ],
};

// 병원(시술) 계열 — 기존 정책 보존(무변경). 참조용 등록만.
export const CLINIC_PHOTO_SLOTS = {
  baseCount: 5,
  recommendMax: 5,
  slots: [
    { key: "worry",  label: "고민",    desc: "" },
    { key: "consult", label: "상담",   desc: "" },
    { key: "before", label: "시술 전", desc: "" },
    { key: "after",  label: "시술 후", desc: "" },
    { key: "result", label: "결과",    desc: "" },
  ],
};

// Restaurant 계열 업종 키 (index.js NONMEDICAL_INDUSTRIES 중 음식점 계열과 정합)
const RESTAURANT_INDUSTRIES = new Set([
  "restaurant", "korean", "chinese", "japanese", "western", "snack", "chicken", "meat", "cafe",
]);

// 조회 진입점 — industry(hubStore.industry SoT) 받아 사진 정책 반환.
//   미지정/미매핑 → null 반환(호출부에서 기존 하드코딩 폴백).
export function getPhotoPolicy(industry) {
  if (!industry) return null;
  if (RESTAURANT_INDUSTRIES.has(industry)) return RESTAURANT_PHOTO_SLOTS;
  return null; // 병원 등은 호출부 기존값 유지(스코프 최소화)
}

// 체크리스트 표시용 요약 문자열 — "외관·실내/좌석·대표 메뉴·메뉴판·분위기/디테일"
export function photoDescLine(policy) {
  if (!policy || !policy.slots) return "";
  return policy.slots.map(s => s.label).join("·");
}

// ── 엔진 상속용 (본문 이미지 마커 SoT) ──────────────────────────
// Restaurant 계열 엔진이 import 해서 사용. 슬롯 정의는 여기 단일 SoT.
// 엔진 역할: 삽입 위치 + ALT/캡션만 담당. 슬롯 순서·라벨은 registry가 소유.

// 본문 마커 라벨 배열 — ["외관","실내/좌석","대표 메뉴","메뉴판","분위기/디테일"]
export function getRestaurantPhotoLabels() {
  return RESTAURANT_PHOTO_SLOTS.slots.map(s => s.label);
}

// 본문 마커 문자열 배열 — ["[이미지: 외관]", ...]
export function getRestaurantPhotoMarkers() {
  return RESTAURANT_PHOTO_SLOTS.slots.map(s => `[이미지: ${s.label}]`);
}

// 슬롯 key→label 맵 (정규화·ALT 매핑용)
export function getRestaurantPhotoSlotMap() {
  const m = {};
  for (const s of RESTAURANT_PHOTO_SLOTS.slots) m[s.key] = s.label;
  return m;
}
