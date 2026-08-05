// lib/furniture-playConfig.js
// 맞춤가구(furniture) 섹션 순서·사진 슬롯 — generateFurniture.js 가 소비.
// ★ 복제 베이스: lighting-playConfig.js 동형 계약(FLOW 배열 + SECTION_PHOTO 맵).
//   ※ [세션69] window-playConfig.js 실물 미수령 → 핸들러 계약과 실생성 출력 순서로 역산.
//     이월 과제 「{ind}-playConfig.js 실물 대조」 대상.
//
// 섹션 소유 (prompts.js 와 1:1):
//   intro     = 상황 도입
//   axis1     = 자리 계측·제약 진단
//   axis2     = 현장 설치 전개
//   infoblock = INFO_BLOCKS 삽입 (GPT 미호출. 정보박스 자체가 시각 구분 → 사진 미부착)
//   axis3     = 규격·맞춤 치수 판단과 내부 구성
//   axis4     = 조정 검수 기준
//   closing   = 마지막 동작 (★ 사진 미부착 — 세션62 도배 결함3 재발 방지)

export const FURNITURE_FLOW = [
  { key: "intro",     label: "도입" },
  { key: "axis1",     label: "자리 계측·제약 진단" },
  { key: "axis2",     label: "현장 설치 진행" },
  { key: "infoblock", label: "정보블럭" },
  { key: "axis3",     label: "판단 기준" },
  { key: "axis4",     label: "조정 검수" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → PHOTO_POOL slot. 5슬롯 고정(closing 제외).
export const FURNITURE_SECTION_PHOTO = {
  intro: "before",
  axis1: "diagnose",
  axis2: "process",
  axis3: "scope",
  axis4: "after",
};

export default { FURNITURE_FLOW, FURNITURE_SECTION_PHOTO };
