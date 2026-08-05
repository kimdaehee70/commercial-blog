// lib/dobae-playConfig.js
// 도배(dobae) 섹션 흐름 — generateDobae.js 가 순회 소비.
// ★ 복제 베이스: buildingclean-playConfig.js 동형(섹션루프형).
// ★ 섹션 key 는 프롬프트 분기·사진 라벨과 1:1 대응한다. 순서 변경 = 글 구조 변경.
//
// 설계(실측 반영):
//   intro    검색 상황 진입 — "무엇을 확인하려고 들어왔는가"
//   axis1    현장 확인 (SCENE arrive 소비)
//   infoblock 정보 박스 (GPT 미호출, INFO_BLOCKS 삽입)
//   axis2    작업 전개 (SCENE work 소비)
//   axis3    판단 기준 — 자재·범위·상황 선택 축
//   axis4    시공 후 관리·주의
//   closing  마무리 (상담 유도 아님, 정보 정리)

export const DOBAE_FLOW = [
  { key: "intro",     label: "도입",        minChars: 280, maxChars: 420 },
  { key: "axis1",     label: "현장 확인",   minChars: 380, maxChars: 560 },
  { key: "infoblock", label: "정보 박스",   minChars: 0,   maxChars: 0   },
  { key: "axis2",     label: "작업 전개",   minChars: 420, maxChars: 620 },
  { key: "axis3",     label: "판단 기준",   minChars: 380, maxChars: 560 },
  { key: "axis4",     label: "시공 후 관리", minChars: 320, maxChars: 480 },
  { key: "closing",   label: "마무리",      minChars: 240, maxChars: 360 },
];

// 섹션별 사진 라벨 축 — 핸들러가 cat 분기와 함께 소비.
//   closing 은 사진 미부착(axis4와 같은 마감 사진이 연속 노출되는 것을 막는다).
//   → 실제 사진 슬롯 5개: before / base / process / material / after
export const DOBAE_SECTION_PHOTO = {
  intro:   "before",
  axis1:   "base",
  axis2:   "process",
  axis3:   "material",
  axis4:   "after",
};

export default { DOBAE_FLOW, DOBAE_SECTION_PHOTO };
