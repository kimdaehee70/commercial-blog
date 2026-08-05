// lib/plumbing-playConfig.js
// 수도설비(plumbing) FLOW_ENGINE — v1
// 정보형: 주제 → 작업범위 → 진행절차 → 확인항목 → 원인·배경 → 유지관리·준비전확인 → 마무리
// 복제 베이스: sewer-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const PLUMBING_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '설비 진행 시 확인할 사항을 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '작업 범위',
    minLength: 220,
    maxLength: 400,
    role: '급수관·배수관·밸브·계량기·온수기·싱크대라인 등 기본범위/추가범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '진행 절차',
    minLength: 220,
    maxLength: 400,
    role: '현장 확인 → 배관·연결부 점검 → 자재·범위 안내 → 시공·연결 → 마무리 점검 흐름.',
  },
  {
    key: 'infoblock',
    title: '확인·점검 항목',
    minLength: 220,
    maxLength: 400,
    role: '확인·점검 항목 목록. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '원인·배경',
    minLength: 220,
    maxLength: 400,
    role: '배관 노후·부식·연결부 노화·신규 설치·위치 변경 등 진행 배경. 정보로만.',
  },
  {
    key: 'axis4',
    title: '유지 관리·준비 전 확인',
    minLength: 220,
    maxLength: 400,
    role: '주기적 점검·보온·밸브 확인·작업 가능 시간·공간 확보 등 확인 요인. 추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '업체 선택 전 확인사항·점검 필요성 안내. 앞 내용 반복 금지. 추천·보장·즉시해결 단정 없이 담담하게.',
  },
];

export const PLUMBING_PLAY_CONFIG = {
  industry: 'plumbing',
  flow: PLUMBING_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 범위·원인·절차·관리·점검 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default PLUMBING_PLAY_CONFIG;
