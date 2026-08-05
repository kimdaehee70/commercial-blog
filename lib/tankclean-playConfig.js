// lib/tankclean-playConfig.js
// 저수조청소(tankclean) FLOW_ENGINE — v1
// 정보형: 주제 → 대상·범위 → 작업 절차 → 점검항목 → 소독·주기 → 예약 전 확인 → 마무리
// 복제 베이스: cleaning-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const TANKCLEAN_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '저수조청소를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '청소 대상·범위',
    minLength: 220,
    maxLength: 400,
    role: '저수조 내벽·맨홀·배관 연결부 등 대상과 범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '작업 절차',
    minLength: 220,
    maxLength: 400,
    role: '급수 차단 → 잔수 배출 → 세척 → 소독 → 수질 확인 흐름.',
  },
  {
    key: 'infoblock',
    title: '점검·확인 항목',
    minLength: 220,
    maxLength: 400,
    role: '예약 전/작업 후 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '소독·관리 주기',
    minLength: 220,
    maxLength: 400,
    role: '소독 과정 + 관리 주기·관리대장. 주기는 관할 기준 확인 안내.',
  },
  {
    key: 'axis4',
    title: '예약 전 확인사항',
    minLength: 220,
    maxLength: 400,
    role: '시설 유형·용량·급수 차단 시간·기록 제공 확인 요인. 추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·상담 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const TANKCLEAN_PLAY_CONFIG = {
  industry: 'tankclean',
  flow: TANKCLEAN_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 대상·범위·절차·소독·주기·점검·관리대장 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default TANKCLEAN_PLAY_CONFIG;
