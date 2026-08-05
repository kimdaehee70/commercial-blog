// lib/airclean-playConfig.js
// 에어컨청소(airclean) FLOW_ENGINE — v1
// 정보형: 주제 → 청소 필요성/오염 원인 → 분해 범위/세척 → 체크포인트 → 진행 순서/점검 → 청소 전 확인·관리주기 → 마무리
// 복제 베이스: coating-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const AIRCLEAN_FLOW = [
  {
    key: "intro",
    title: "주제 소개",
    minLength: 200,
    maxLength: 350,
    role: "에어컨 청소를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.",
  },
  {
    key: "axis1",
    title: "청소 필요성 / 오염 원인",
    minLength: 220,
    maxLength: 400,
    role: "내부 오염·곰팡이·냄새가 왜 생기는지, 청소가 왜 필요한지. 청소 자랑 금지. 정보로만.",
  },
  {
    key: "axis2",
    title: "분해 범위 / 세척 방식",
    minLength: 220,
    maxLength: 400,
    role: "필터 청소와 내부 분해세척 차이, 송풍팬·열교환기·드레인 세척. 효과 단정·과장 금지.",
  },
  {
    key: "infoblock",
    title: "체크포인트",
    minLength: 220,
    maxLength: 400,
    role: "청소 전·후 확인 항목 목록. 단정 없이 \"확인할 점\".",
  },
  {
    key: "axis3",
    title: "진행 순서 / 점검",
    minLength: 220,
    maxLength: 400,
    role: "상태 확인 → 분해 → 세척 → 건조·조립 흐름, 또는 냄새·곰팡이·누수 원인 점검 방법.",
  },
  {
    key: "axis4",
    title: "청소 전 확인사항 / 관리주기",
    minLength: 220,
    maxLength: 400,
    role: "제품 종류·오염 정도 등 확인 요인 + 청소주기·송풍 건조·필터 관리. 추천·순위 단정 금지.",
  },
  {
    key: "closing",
    title: "마무리",
    minLength: 150,
    maxLength: 300,
    role: "현장 확인 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.",
  },
];

export const AIRCLEAN_PLAY_CONFIG = {
  industry: "airclean",
  flow: AIRCLEAN_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 청소 범위·확인 포인트·관리주기 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default AIRCLEAN_PLAY_CONFIG;
