// lib/waterproof-playConfig.js
// 방수공사(waterproof) 섹션 FLOW · 사진 슬롯 배치
// ★ 복제 베이스: door-playConfig.js 계약. Runtime/FLOW 구조 무변경 — 섹션 key 집합 동일.
//   (door-playConfig.js 실물 미수령 → generateDoor.js 소비 계약으로 역산.
//    waterproof 자체 소유 파일이라 door 와 값이 달라도 무해하나, 1회 대조 권장.)
//
// ★ 섹션 소유 (waterproof-prompts.js 와 1:1):
//     intro    상황 — 사건으로 시작
//     axis1    현장 발견 · 원인 진단        (Discovery → Diagnosis)
//     axis2    보양 · 시공 전개              (Protect → Apply)
//     infoblock  INFO_BLOCKS 삽입 (GPT 미호출)
//     axis3    부분보수 / 전체시공 판단 · 공법 선택
//     axis4    검수 기준 (Test)
//     closing  마지막 동작
//
// ★ 사진 5슬롯 고정 — closing 미부착 (세션62 도배 결함3 재발 방지).
//   infoblock 은 정보박스 자체가 시각 구분이므로 사진 미부착.

export const WATERPROOF_FLOW = [
  { key: "intro",     label: "상황",        minChars: 180, maxChars: 240 },
  { key: "axis1",     label: "현장 발견·진단", minChars: 250, maxChars: 330 },
  { key: "axis2",     label: "시공 진행",    minChars: 280, maxChars: 360 },
  { key: "infoblock", label: "정보 블록",    minChars: 0,   maxChars: 0   },
  { key: "axis3",     label: "판단 기준",    minChars: 260, maxChars: 360 },
  { key: "axis4",     label: "검수 기준",    minChars: 220, maxChars: 300 },
  { key: "closing",   label: "마무리",       minChars: 100, maxChars: 160 },
];

// 섹션 key → PHOTO_POOL slot. 미등록 key = 사진 미부착.
export const WATERPROOF_SECTION_PHOTO = {
  intro:   "before",
  axis1:   "diagnose",
  axis2:   "process",
  axis3:   "scope",
  axis4:   "after",
  // infoblock / closing = 미부착
};

export default { WATERPROOF_FLOW, WATERPROOF_SECTION_PHOTO };
