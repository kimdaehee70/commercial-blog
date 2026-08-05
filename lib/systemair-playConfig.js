// lib/systemair-playConfig.js
// 시스템에어컨(systemair) FLOW_ENGINE — v1
// 정보형: 주제 → 설치 위치 → 배관·전기 → 체크포인트 → 진행순서/교체·추가설치 판단 → 설치 전 확인 → 마무리
// 복제 베이스: coating-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const SYSTEMAIR_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '시스템에어컨 설치를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '설치 위치 / 범위',
    minLength: 220,
    maxLength: 400,
    role: '실내기 매립 위치·실외기 위치·점검구 등 공간 구분. 시공 자랑 금지. 정보로만.',
  },
  {
    key: 'axis2',
    title: '배관·전기 / 설치 여건',
    minLength: 220,
    maxLength: 400,
    role: '선배관·단배관·배관 길이·배수배관·전기 용량 등 설치 여건. 단정·과장 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '설치 전·후 확인 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '진행 순서 / 교체·추가설치 판단',
    minLength: 220,
    maxLength: 400,
    role: '현장 확인 → 배관·전기 점검 → 설치 → 시운전 흐름, 또는 교체·추가설치 판단 기준.',
  },
  {
    key: 'axis4',
    title: '설치 전 확인사항',
    minLength: 220,
    maxLength: 400,
    role: '설치 위치·배관·전기 용량·실외기실·일정 확인 요인. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인 안내. 앞 내용 반복 금지. 추천·보장 없이 담담하게.',
  },
];

export const SYSTEMAIR_PLAY_CONFIG = {
  industry: 'systemair',
  flow: SYSTEMAIR_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 설치 위치, 배관·전기, 실외기실 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default SYSTEMAIR_PLAY_CONFIG;
