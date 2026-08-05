// lib/moving-playConfig.js
// 이사업체(moving) FLOW_ENGINE — v1
// 정보형: 주제 → 서비스 범위 → 견적 요소 → 체크포인트 → 진행 순서 → 예약 전 확인 → 마무리
// 복제 베이스: cleaning-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const MOVING_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '이사를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '서비스 범위',
    minLength: 220,
    maxLength: 400,
    role: '기본 범위와 추가 옵션 구분(포장/반포장/용달 등). 정보로만.',
  },
  {
    key: 'axis2',
    title: '견적 영향 요소',
    minLength: 220,
    maxLength: 400,
    role: '짐량·층수·거리·날짜별 견적 영향 요소. 금액 단정 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '예약 전 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '진행 순서',
    minLength: 220,
    maxLength: 400,
    role: '견적/예약 → 포장·운반 → 배치·마감 점검 흐름.',
  },
  {
    key: 'axis4',
    title: '예약 전 확인사항',
    minLength: 220,
    maxLength: 400,
    role: '업체 선택 기준·범위·추가비용 조건 확인 요인. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·견적 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const MOVING_PLAY_CONFIG = {
  industry: 'moving',
  flow: MOVING_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 진행 순서, 견적 영향 요소, 체크리스트 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default MOVING_PLAY_CONFIG;
