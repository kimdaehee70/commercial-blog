// lib/demolition-playConfig.js
// 철거공사(demolition) 섹션 순서·사진 슬롯 매핑
// ★ 복제 베이스: tile-playConfig.js 동형(Construction V3 섹션루프형).
// ★ 핸들러(generateDemolition.js)가 FLOW 를 순회하며 섹션별 GPT 호출.
//   infoblock 섹션만 GPT 호출 없이 INFO_BLOCKS 를 삽입한다.
//
// ★ 사진 슬롯 = 5개 고정(closing 미부착). 세션62 도배 결함3 재발 방지.
//   PHOTO_POOL(demolition-data.js) 의 slot 키와 1:1 대응해야 한다.

export const DEMOLITION_FLOW = [
  { key: "intro",     label: "상황" },
  { key: "axis1",     label: "현장 발견·구조 판별" },
  { key: "axis2",     label: "해체 진행" },
  { key: "infoblock", label: "정보블럭" },
  { key: "axis3",     label: "판단 기준" },
  { key: "axis4",     label: "인계 전 확인" },
  { key: "closing",   label: "마무리" },
];

// 섹션 key → PHOTO_POOL slot. 미정의 섹션은 사진 미부착.
export const DEMOLITION_SECTION_PHOTO = {
  intro: "before",
  axis1: "diagnose",
  axis2: "process",
  axis3: "scope",
  axis4: "after",
};

export default { DEMOLITION_FLOW, DEMOLITION_SECTION_PHOTO };
