// lib/boiler-playConfig.js
// 보일러설치(boiler) FLOW_ENGINE — v1
// 정보형: 도입 → 시공범위 → 발생원인 → 체크포인트 → 진행절차 → 관리방법 → 마무리
// 복제 베이스: systemair-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.
// 섹션 구조(지시서): 도입 / (사진은 도입 직후 핸들러 삽입) / 시공범위 / 발생원인 / 진행절차 / 관리방법 / 마무리
//   + 체크포인트(infoblock) = INFO_BLOCKS GPT 미호출 삽입.

export const BOILER_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '보일러 설치·교체·점검을 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'scope',
    title: '시공 범위',
    minLength: 220,
    maxLength: 400,
    role: '보일러본체·연통·배관·온수/난방배관·분배기·온도조절기·가스배관·배수라인 등 시공 범위 구분. 시공 자랑 금지. 정보로만.',
  },
  {
    key: 'cause',
    title: '발생 원인 / 확인 항목',
    minLength: 220,
    maxLength: 400,
    role: '노후화·온수불량·난방불량·에러코드·누수·소음·연통·배관부식 등 원인/확인 항목. 단정·과장 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '확인 항목 목록. 단정 없이 "확인할 점". (INFO_BLOCKS GPT 미호출 삽입)',
  },
  {
    key: 'process',
    title: '진행 절차',
    minLength: 220,
    maxLength: 400,
    role: '현장확인 → 설치환경점검 → 기존철거 → 배관점검 → 신규설치 → 시운전 → 최종점검 흐름 중 관련 단계.',
  },
  {
    key: 'manage',
    title: '관리 방법',
    minLength: 220,
    maxLength: 400,
    role: '정기점검·필터관리·동파예방·배관관리·에러 시 점검·온도조절기 관리 등. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인 안내. 앞 내용 반복 금지. 추천·보장·전화유도 없이 담담하게.',
  },
];

export const BOILER_PLAY_CONFIG = {
  industry: 'boiler',
  flow: BOILER_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 시공범위·원인·확인 항목 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default BOILER_PLAY_CONFIG;
