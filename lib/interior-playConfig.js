// lib/interior-playConfig.js
// 인테리어(interior) FLOW_ENGINE — v1
// 정보형: 주제 → 공사 범위 → 견적 요소 → 체크포인트 → 진행 순서 → 예약 전 확인 → 마무리
// 복제 베이스: moving-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const INTERIOR_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '인테리어를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '공사 범위',
    minLength: 220,
    maxLength: 400,
    role: '전체/부분, 주요 공정 구분. 시공 자랑 금지. 정보로만.',
  },
  {
    key: 'axis2',
    title: '견적 영향 요소',
    minLength: 220,
    maxLength: 400,
    role: '평형·범위·자재·철거 범위별 견적 영향 요소. 금액 단정 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '견적·계약 전 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '진행 순서',
    minLength: 220,
    maxLength: 400,
    role: '실측/견적 → 철거·설비 → 마감·검수 흐름.',
  },
  {
    key: 'axis4',
    title: '예약 전 확인사항',
    minLength: 220,
    maxLength: 400,
    role: '공사 범위·자재·추가비용 조건 확인 요인. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 실측·견적 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const INTERIOR_PLAY_CONFIG = {
  industry: 'interior',
  flow: INTERIOR_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 진행 순서, 구축 확인 포인트, 견적 영향 요소 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default INTERIOR_PLAY_CONFIG;
