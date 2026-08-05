// lib/electricrepair-playConfig.js
// 전기수리(electricrepair) FLOW_ENGINE — v1
// 정보형: 도입 → 발생원인 → 점검위치/확인 → 체크포인트 → 진행절차 → 관리방법 → 마무리
// 복제 베이스: homefix-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.
// 흐름(작업지시서): 생활문제 → 원인 → 점검위치 → 확인사항 → 관리방법.
//   섹션 구현: 도입 / (사진은 도입 직후 핸들러 삽입) / 발생원인 / 점검위치 / 진행절차 / 관리방법 / 마무리
//   + 체크포인트(infoblock) = INFO_BLOCKS GPT 미호출 삽입.

export const ELECTRICREPAIR_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '생활전기 점검·교체를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'cause',
    title: '발생 원인',
    minLength: 220,
    maxLength: 400,
    role: '누전·과부하·노후·접촉 불량·발열·오작동 등 발생 원인. 단정·과장 금지.',
  },
  {
    key: 'area',
    title: '점검 위치 / 확인 항목',
    minLength: 220,
    maxLength: 400,
    role: '차단기·콘센트·스위치·소켓·배선·습기 구역 등 점검 위치·확인 항목. 단정 금지.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '확인 항목 목록. 안전 확인 포함. 단정 없이 "확인할 점". (INFO_BLOCKS GPT 미호출 삽입)',
  },
  {
    key: 'process',
    title: '진행 절차',
    minLength: 220,
    maxLength: 400,
    role: '현장확인 → 원인 점검 → 안전 차단 → 교체·보수 → 작동 확인 흐름 중 관련 단계.',
  },
  {
    key: 'manage',
    title: '관리 방법',
    minLength: 220,
    maxLength: 400,
    role: '정기 점검·과부하 관리·습기 관리·안전 확인 등. 추천·순위 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인 안내. 앞 내용 반복 금지. 추천·보장·전화유도 없이 담담하게.',
  },
];

export const ELECTRICREPAIR_PLAY_CONFIG = {
  industry: 'electricrepair',
  flow: ELECTRICREPAIR_FLOW,
  minTotalLength: 1800,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 원인·점검·확인 항목 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default ELECTRICREPAIR_PLAY_CONFIG;
