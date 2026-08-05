// lib/birdcontrol-playConfig.js
// 비둘기퇴치(birdcontrol) FLOW_ENGINE — v1
// 정보형: 주제 → 차단 범위 → 발생 원인 → 체크포인트 → 차단 방법 → 위생·재유입 예방 → 마무리
// 복제 베이스: pestcontrol-playConfig.js. 변화 헤더 없음. 차단·예방 안내 흐름.
// 본문 구조(지시서): 도입 → 사진 → 범위 안내 → 필요한 이유(원인) → 방법 비교 → 관리 체크리스트 → 마무리

export const BIRDCONTROL_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '비둘기퇴치를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '차단 범위',
    minLength: 220,
    maxLength: 400,
    role: '개구부·실외기실·베란다·난간 등 기본 범위와 추가 범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '발생 원인',
    minLength: 220,
    maxLength: 400,
    role: '귀소본능(반복 회귀)·은신 공간·먹이 환경 등 유입 원인. 정보로만.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '차단 범위·배설물 위생·차단 시설·재유입 경로 확인 항목. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '차단 방법',
    minLength: 220,
    maxLength: 400,
    role: '사전 점검 → 배설물 청소·소독 → 차단 시설(망·버드스파이크) → 마감 점검 흐름.',
  },
  {
    key: 'axis4',
    title: '위생·재유입 예방',
    minLength: 220,
    maxLength: 400,
    role: '배설물·악취 위생 관리·차단 시설 정기 점검·재유입 예방. 효과·추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·점검 안내. 앞 내용 반복 금지. 추천·보장·비용 유도 없이 담담하게.',
  },
];

export const BIRDCONTROL_PLAY_CONFIG = {
  industry: 'birdcontrol',
  flow: BIRDCONTROL_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  useChangeHeaders: false,
  useInfoBlock: true,
  forceExamValue: false,
};

export default BIRDCONTROL_PLAY_CONFIG;
