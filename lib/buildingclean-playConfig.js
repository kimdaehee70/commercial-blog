// lib/buildingclean-playConfig.js
// 건물청소(buildingclean) FLOW_ENGINE — v1
// 정보형: 주제 → 청소 범위 → 작업 절차 → 체크포인트 → 정기관리 → 건물 유형별 → 마무리
// 복제 베이스: cleaning-playConfig.js. 변화 헤더 없음. 건물 유지관리 안내 흐름.

export const BUILDINGCLEAN_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '건물청소를 왜 살펴보는지 차분히 소개. 단정·과장·추천 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '청소 범위',
    minLength: 220,
    maxLength: 400,
    role: '공용부(로비·복도·계단·출입구·화장실)와 추가 범위 구분. 정보로만.',
  },
  {
    key: 'axis2',
    title: '작업 절차',
    minLength: 220,
    maxLength: 400,
    role: '사전 점검 → 구역별 작업 → 마감 점검 흐름.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 220,
    maxLength: 400,
    role: '예약·정기/일회성·작업 시간대·마무리 점검 확인 항목. 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '정기관리 필요성',
    minLength: 220,
    maxLength: 400,
    role: '공용부 오염 속도·건물 이미지·위생·안전 관점. 비용 유도 금지.',
  },
  {
    key: 'axis4',
    title: '건물 유형별 관리',
    minLength: 220,
    maxLength: 400,
    role: '상가·사무실·병원·학원·원룸건물·오피스텔·빌딩별 관리 차이. 추천 단정 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '현장 확인·일정 협의 안내. 앞 내용 반복 금지. 추천·보장·비용 유도 없이 담담하게.',
  },
];

export const BUILDINGCLEAN_PLAY_CONFIG = {
  industry: 'buildingclean',
  flow: BUILDINGCLEAN_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 정보형: 변화 헤더(1일/1주) 없음. 안내 흐름.
  useChangeHeaders: false,
  // 정보블럭: 청소 범위·작업 절차·정기관리·건물 유형별 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 비용 유도 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default BUILDINGCLEAN_PLAY_CONFIG;
