// lib/door-playConfig.js
// 도어수리(door) 섹션 구성 — 순서·사진슬롯. 복제 베이스: film-playConfig.js 동형.
// ★ 엔진(FLOW/Runtime) 구조 무변경. 섹션 key 는 door-prompts.js buildUserPrompt 의 case 와 1:1.
//
// 섹션 소유 요소:
//   intro    = 상황(사건으로 시작)
//   axis1    = 출동·증상 재현·부품 진단   [Scene arrive]
//   axis2    = 수리 전개                  [Scene work] ← 탈거·교체·조정·재조립·시험 운전
//   axis3    = 수리/교체 판단 + 비용이 달라지는 이유
//   infoblock= INFO_BLOCKS 삽입 (GPT 미호출)
//   axis4    = 수리 후 확인 기준
//   closing  = 마지막 동작
//
// ★ 사진 5슬롯 고정 — closing 미부착 (세션62 도배 결함3 재발 방지)

export const DOOR_FLOW = [
  { key: "intro",     label: "도입" },
  { key: "axis1",     label: "출동·진단" },
  { key: "axis2",     label: "수리 진행" },
  { key: "axis3",     label: "수리·교체 판단" },
  { key: "infoblock", label: "정보블럭" },
  { key: "axis4",     label: "수리 후 확인" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → PHOTO_POOL slot. 미등록 섹션은 사진 미부착.
export const DOOR_SECTION_PHOTO = {
  intro: "before",
  axis1: "diagnose",
  axis2: "process",
  axis3: "part",
  axis4: "after",
  // infoblock: 정보박스 자체가 시각 구분 → 미부착
  // closing:   미부착 (5슬롯 고정)
};

export default { DOOR_FLOW, DOOR_SECTION_PHOTO };
