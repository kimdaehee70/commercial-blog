// lib/tile-playConfig.js
// 타일시공(tile) 섹션 FLOW · 사진 슬롯 배치
// ★ 복제 베이스: paint-playConfig.js 계약. Runtime/FLOW 구조 무변경 — 섹션 key 집합 동일.
//   (paint-playConfig.js 와 동형. tile 자체 소유 파일.)
//
// ★ 섹션 소유 (tile-prompts.js 와 1:1):
//     intro    상황 — 사건으로 시작
//     axis1    현장 발견 · 바탕 진단        (Discovery → Diagnosis)
//     axis2    보양 · 바탕 · 부착 전개        (Protect → Prep → Apply)
//     infoblock  INFO_BLOCKS 삽입 (GPT 미호출)
//     axis3    걷어냄 / 덧방 판단 · 시공 범위
//     axis4    검수 기준 (Test)
//     closing  마지막 동작
//
// ★ 사진 5슬롯 고정 — closing 미부착 (세션62 도배 결함3 재발 방지).
//   infoblock 은 정보박스 자체가 시각 구분이므로 사진 미부착.

export const TILE_FLOW = [
  { key: "intro",     label: "상황",        minChars: 180, maxChars: 240 },
  { key: "axis1",     label: "현장 발견·진단", minChars: 250, maxChars: 330 },
  { key: "axis2",     label: "시공 진행",    minChars: 280, maxChars: 360 },
  { key: "infoblock", label: "정보 블록",    minChars: 0,   maxChars: 0   },
  { key: "axis3",     label: "판단 기준",    minChars: 260, maxChars: 360 },
  { key: "axis4",     label: "검수 기준",    minChars: 220, maxChars: 300 },
  { key: "closing",   label: "마무리",       minChars: 100, maxChars: 160 },
];

// 섹션 key → PHOTO_POOL slot. 미등록 key = 사진 미부착.
export const TILE_SECTION_PHOTO = {
  intro:   "before",
  axis1:   "diagnose",
  axis2:   "process",
  axis3:   "scope",
  axis4:   "after",
  // infoblock / closing = 미부착
};

export default { TILE_FLOW, TILE_SECTION_PHOTO };
