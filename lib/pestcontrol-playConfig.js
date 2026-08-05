// lib/pestcontrol-playConfig.js
// 방역(pestcontrol) FLOW_ENGINE — v1
// 정보형: 주제 → 방역 범위 → 해충 종류 → 체크포인트 → 진행 순서 → 예방 관리 → 마무리
// 복제 베이스: cleaning-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const PESTCONTROL_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '방역을 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '방역 범위',
    minLength: 220,
    maxLength: 400,
    role: '기본 범위와 추가 범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '주요 해충 종류',
    minLength: 220,
    maxLength: 400,
    role: '주요 해충 종류·발생 원인·유입 경로. 정보로만.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '예방 전 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '진행 순서',
    minLength: 220,
    maxLength: 400,
    role: '사전 점검 → 방역 처리 → 마감 점검 흐름.',
  },
  {
    key: 'axis4',
    title: '예방 관리',
    minLength: 220,
    maxLength: 400,
    role: '재발 방지·정기 점검 관리 요인. 효과·추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·점검 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const PESTCONTROL_PLAY_CONFIG = {
  industry: 'pestcontrol',
  flow: PESTCONTROL_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  useChangeHeaders: false,
  useInfoBlock: true,
  forceExamValue: false,
};

export default PESTCONTROL_PLAY_CONFIG;
