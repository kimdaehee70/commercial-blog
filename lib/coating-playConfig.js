// lib/coating-playConfig.js
// 탄성코트(coating) FLOW_ENGINE — v1
// 정보형: 주제 → 시공 범위 → 관리 방법(결로·곰팡이) → 체크포인트 → 진행 순서/보수 판단 → 시공 전 확인 → 마무리
// 복제 베이스: grout-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const COATING_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '탄성코트 시공을 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '시공 범위',
    minLength: 220,
    maxLength: 400,
    role: '베란다·세탁실·실외기실·대피공간 등 공간 구분. 시공 자랑 금지. 정보로만.',
  },
  {
    key: 'axis2',
    title: '관리 방법',
    minLength: 220,
    maxLength: 400,
    role: '결로·곰팡이·습기 예방·관리 방법. 효과 단정·과장 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '시공 전·후 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '진행 순서 / 보수·재시공 판단',
    minLength: 220,
    maxLength: 400,
    role: '기존 상태 확인 → 제거·청소·건조 → 시공 → 마감 흐름, 또는 보수·재시공 판단 기준.',
  },
  {
    key: 'axis4',
    title: '시공 전 확인사항',
    minLength: 220,
    maxLength: 400,
    role: '시공 범위·자재·기존 상태·일정 확인 요인. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const COATING_PLAY_CONFIG = {
  industry: 'coating',
  flow: COATING_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 시공 범위, 공간별 확인 포인트, 보수·재시공 판단 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default COATING_PLAY_CONFIG;
