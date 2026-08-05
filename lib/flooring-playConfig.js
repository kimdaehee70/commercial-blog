// lib/flooring-playConfig.js
// 장판(flooring) 섹션 순서·사진 슬롯 — 섹션루프형 핸들러(generateFlooring.js)가 소비.
// ★ 복제 베이스: dobae-playConfig.js 동형. 섹션 key·순서는 도배와 동일 축을 유지한다.
//   (Runtime/FLOW 구조 무변경 원칙 — 축을 바꾸면 프롬프트 소유 요소도 함께 흔들린다)
//
// 섹션 소유 요소 (flooring-prompts.js와 1:1):
//   intro    상황(사건으로 시작)
//   axis1    현장 진입 → 발견 → 판단          [사진 base]
//   infoblock 정보블록(GPT 호출 없음, 사진 미부착 — 박스 자체가 시각 구분)
//   axis2    작업 전개                        [사진 process]
//   axis3    범위·두께 선택 기준               [사진 material]
//   axis4    시공 후 확인 기준                 [사진 after]
//   closing  마지막 동작 (사진 미부착 — axis4와 마감사진 중복 방지)
//
// ★ [세션61 도배 결함3 재발 방지] closing에 사진을 붙이면 axis4 마감사진과 중복된다.
//   슬롯은 5개(before/base/process/material/after)로 고정한다.

export const FLOORING_FLOW = [
  { key: "intro",     label: "도입" },
  { key: "axis1",     label: "현장 확인·판단" },
  { key: "infoblock", label: "정보블록" },
  { key: "axis2",     label: "작업 진행" },
  { key: "axis3",     label: "범위·두께 판단" },
  { key: "axis4",     label: "시공 후 확인" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → 사진 슬롯. 미기재 섹션은 사진 미부착.
//   before 슬롯은 intro 뒤에 붙어 '시공 전 바닥 상태'를 연다.
export const FLOORING_SECTION_PHOTO = {
  intro: "before",
  axis1: "base",
  axis2: "process",
  axis3: "material",
  axis4: "after",
};

export default { FLOORING_FLOW, FLOORING_SECTION_PHOTO };
