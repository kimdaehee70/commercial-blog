// lib/film-playConfig.js
// 인테리어필름(film) 섹션 구성 — 순서·사진슬롯. 복제 베이스: flooring-playConfig.js 동형.
// ★ 엔진(FLOW/Runtime) 구조 무변경. 섹션 key 는 film-prompts.js buildUserPrompt 의 case 와 1:1.
//
// 섹션 소유 요소 (film-prompts.js 주석과 동일 — 중복 서술 차단의 근거):
//   intro    = 상황(사건으로 시작)
//   axis1    = 현장 진입·발견·판단        [Scene arrive]
//   axis2    = 작업 전개                   [Scene work] ← 퍼티·샌딩·프라이머·압착·열마감
//   axis3    = 범위·원단 선택 판단
//   infoblock= INFO_BLOCKS 삽입 (GPT 미호출)
//   axis4    = 시공 후 확인 기준
//   closing  = 마지막 동작
//
// ★ 사진 5슬롯 고정 — closing 미부착.
//   (세션62 도배 결함3: axis4·closing 마감사진 중복 → 재발 방지)

export const FILM_FLOW = [
  { key: "intro",     label: "도입" },
  { key: "axis1",     label: "현장 확인·판단" },
  { key: "axis2",     label: "작업 진행" },
  { key: "axis3",     label: "범위·원단 판단" },
  { key: "infoblock", label: "정보블럭" },
  { key: "axis4",     label: "시공 후 확인" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → PHOTO_POOL slot. 미등록 섹션은 사진 미부착.
export const FILM_SECTION_PHOTO = {
  intro: "before",
  axis1: "base",
  axis2: "process",
  axis3: "material",
  axis4: "after",
  // infoblock: 정보박스 자체가 시각 구분 → 미부착
  // closing:   미부착 (5슬롯 고정)
};

export default { FILM_FLOW, FILM_SECTION_PHOTO };
