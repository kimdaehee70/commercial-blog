// lib/leakdetect-playConfig.js
// 누수탐지(leakdetect) FLOW_ENGINE — v1
// 정보형: 주제 → 누수원인·범위 → 탐지절차 → 점검항목 → 탐지장비 → 예방·예약전확인 → 마무리
// 복제 베이스: tankclean-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const LEAKDETECT_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '누수 발생 시 확인할 사항을 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '누수 원인·탐지 범위',
    minLength: 220,
    maxLength: 400,
    role: '배관 노후·방수층 손상·이음부 균열 등 원인과 탐지 범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '탐지 절차',
    minLength: 220,
    maxLength: 400,
    role: '현장 확인 → 의심 구간 점검 → 위치 특정 → 공사 범위 판단 흐름.',
  },
  {
    key: 'infoblock',
    title: '점검·확인 항목',
    minLength: 220,
    maxLength: 400,
    role: '점검·확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '탐지 장비',
    minLength: 220,
    maxLength: 400,
    role: '열화상카메라·청음·가스 탐지·배관 내시경 등 장비별 역할. 정보로만.',
  },
  {
    key: 'axis4',
    title: '예방 관리·예약 전 확인',
    minLength: 220,
    maxLength: 400,
    role: '배관 점검 주기·누수 위치 정리·탐지 가능 시간 확인 요인. 추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·상담 안내. 앞 내용 반복 금지. 추천·보장·해결 단정 없이 담담하게.',
  },
];

export const LEAKDETECT_PLAY_CONFIG = {
  industry: 'leakdetect',
  flow: LEAKDETECT_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 원인·절차·장비·범위·보험·예방·점검 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default LEAKDETECT_PLAY_CONFIG;
