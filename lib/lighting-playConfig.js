// lib/lighting-playConfig.js
// 조명(lighting) 섹션 순서·사진 슬롯 — generateLighting.js 가 소비.
// ★ 복제 베이스: window-playConfig.js 동형 계약(FLOW 배열 + SECTION_PHOTO 맵).
//   ※ [세션69] window-playConfig.js 실물 미수령 → 핸들러 계약(LIGHTING_FLOW / LIGHTING_SECTION_PHOTO)
//     과 실생성 출력 순서로 역산했다. 이월 과제 「{ind}-playConfig.js 실물 대조」 대상.
//
// 섹션 소유 (prompts.js 와 1:1):
//   intro     = 상황 도입
//   axis1     = 현장 계측·여건 진단
//   axis2     = 자리 만들기·앉힘 전개
//   infoblock = INFO_BLOCKS 삽입 (GPT 미호출. 정보박스 자체가 시각 구분 → 사진 미부착)
//   axis3     = 기존 자리·새 자리 판단과 범위
//   axis4     = 점등 검수 기준
//   closing   = 마지막 동작 (★ 사진 미부착 — 세션62 도배 결함3 재발 방지)

export const LIGHTING_FLOW = [
  { key: "intro",     label: "도입" },
  { key: "axis1",     label: "현장 계측·여건 진단" },
  { key: "axis2",     label: "시공 진행" },
  { key: "infoblock", label: "정보블럭" },
  { key: "axis3",     label: "판단 기준" },
  { key: "axis4",     label: "점등 검수" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → PHOTO_POOL slot. 5슬롯 고정(closing 제외).
export const LIGHTING_SECTION_PHOTO = {
  intro: "before",
  axis1: "diagnose",
  axis2: "process",
  axis3: "scope",
  axis4: "after",
};

export default { LIGHTING_FLOW, LIGHTING_SECTION_PHOTO };
