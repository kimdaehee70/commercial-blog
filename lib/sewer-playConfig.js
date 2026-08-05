// lib/sewer-playConfig.js
// 하수구막힘(sewer) FLOW_ENGINE — v1
// 정보형: 주제 → 발생원인·범위 → 작업절차 → 점검항목 → 작업장비 → 예방·예약전확인 → 마무리
// 복제 베이스: leakdetect-playConfig.js. 변화 헤더 없음. 정보 안내 흐름.

export const SEWER_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '막힘 발생 시 확인할 사항을 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '발생 원인·작업 범위',
    minLength: 220,
    maxLength: 400,
    role: '음식물 찌꺼기·기름때·머리카락·이물질·배관 노후 등 원인과 기본범위/추가범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '작업 절차',
    minLength: 220,
    maxLength: 400,
    role: '현장 확인 → 내시경 점검 → 고압세척·이물질 제거 → 배수 흐름 확인 흐름.',
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
    title: '작업 장비',
    minLength: 220,
    maxLength: 400,
    role: '고압세척기·배관 내시경·스프링/관통기·관로 탐지 등 장비별 역할. 정보로만.',
  },
  {
    key: 'axis4',
    title: '예방 관리·예약 전 확인',
    minLength: 220,
    maxLength: 400,
    role: '거름망 사용·이물질 차단·주기적 점검·작업 가능 시간 확인 요인. 추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '업체 선택 전 확인사항·점검 필요성 안내. 앞 내용 반복 금지. 추천·보장·즉시해결 단정 없이 담담하게.',
  },
];

export const SEWER_PLAY_CONFIG = {
  industry: 'sewer',
  flow: SEWER_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 원인·절차·장비·범위·점검·예방·악취 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default SEWER_PLAY_CONFIG;
