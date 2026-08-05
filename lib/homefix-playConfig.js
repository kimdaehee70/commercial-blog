// lib/homefix-playConfig.js
// 집수리(homefix) FLOW_ENGINE — v1
// 정보형: 도입 → 작업범위 → 점검항목/원인 → 체크포인트 → 진행절차 → 관리방법 → 마무리
// 복제 베이스: boiler-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.
// 흐름(작업지시서): 생활문제 → 점검항목 → 작업범위 → 관리방법.
//   섹션 구현: 도입 / (사진은 도입 직후 핸들러 삽입) / 작업범위 / 점검·원인 / 진행절차 / 관리방법 / 마무리
//   + 체크포인트(infoblock) = INFO_BLOCKS GPT 미호출 삽입.

export const HOMEFIX_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '집 안 소규모 수리·교체를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'scope',
    title: '작업 범위',
    minLength: 220,
    maxLength: 400,
    role: '교체·보수·설치 대상 부위와 구성 요소 구분. 작업 자랑 금지. 정보로만.',
  },
  {
    key: 'cause',
    title: '점검 항목 / 발생 원인',
    minLength: 220,
    maxLength: 400,
    role: '노후·파손·헐거움·소음·곰팡이·불량 증상 등 점검 항목/원인. 단정·과장 금지.',
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
    role: '현장확인 → 제품·규격 확인 → 기존 제거 → 교체·설치 → 작동 확인 흐름 중 관련 단계.',
  },
  {
    key: 'manage',
    title: '관리 방법',
    minLength: 220,
    maxLength: 400,
    role: '정기 점검·청소·하중 관리·안전 확인 등. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인 안내. 앞 내용 반복 금지. 추천·보장·전화유도 없이 담담하게.',
  },
];

export const HOMEFIX_PLAY_CONFIG = {
  industry: 'homefix',
  flow: HOMEFIX_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 작업범위·점검·확인 항목 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default HOMEFIX_PLAY_CONFIG;
