// lib/screen-playConfig.js
// 방충망(screen) FLOW_ENGINE — v1
// 정보형: 주제 → 교체 필요성/제품 특징 → 설치 위치/안전 → 체크포인트 → 진행 순서/점검 → 관리·청소·종류비교 → 마무리
// 복제 베이스: airclean-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const SCREEN_FLOW = [
  {
    key: "intro",
    title: "주제 소개",
    minLength: 200,
    maxLength: 350,
    role: "방충망 주제를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.",
  },
  {
    key: "axis1",
    title: "교체 필요성 / 제품 특징",
    minLength: 220,
    maxLength: 400,
    role: "왜 교체·점검이 필요한지, 해당 방충망의 특징은 무엇인지. 제품 자랑 금지. 정보로만.",
  },
  {
    key: "axis2",
    title: "설치 위치 / 안전 정보",
    minLength: 220,
    maxLength: 400,
    role: "어디에 어떻게 적용되는지, 안전·추락방지 관련 확인 정보. 효과 단정·과장 금지.",
  },
  {
    key: "infoblock",
    title: "체크포인트",
    minLength: 220,
    maxLength: 400,
    role: "선택·교체 전·후 확인 항목 목록. 단정 없이 \"확인할 점\".",
  },
  {
    key: "axis3",
    title: "진행 순서 / 점검",
    minLength: 220,
    maxLength: 400,
    role: "상태 확인 → 규격 확인 → 선택·교체 흐름, 또는 찢어짐·처짐·먼지 원인 점검 방법.",
  },
  {
    key: "axis4",
    title: "관리방법 / 종류 비교",
    minLength: 220,
    maxLength: 400,
    role: "청소·유지관리 방법, 또는 방충망 종류별 차이·선택 기준. 추천·순위 단정 금지.",
  },
  {
    key: "closing",
    title: "마무리",
    minLength: 150,
    maxLength: 300,
    role: "현장 확인 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.",
  },
];

export const SCREEN_PLAY_CONFIG = {
  industry: "screen",
  flow: SCREEN_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 확인 포인트·체크 항목 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default SCREEN_PLAY_CONFIG;
