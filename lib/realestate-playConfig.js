// lib/realestate-playConfig.js
// 부동산(realestate) FLOW_ENGINE — v1
// 분석 리포트형: 주제 → 입지·교통 → 생활권·학군 → 체크포인트 → 실거주 → 투자 → 마무리
// 복제 베이스: lawyer-playConfig.js. 변화 헤더 없음. 분석축 흐름.

export const REALESTATE_FLOW = [
  {
    key: 'intro',
    title: '주제 소개',
    minLength: 200,
    maxLength: 350,
    role: '단지/지역을 왜 살펴보는지 차분히 소개. 단정·과장 금지. 2~3문장.',
  },
  {
    key: 'axis1',
    title: '입지·교통',
    minLength: 400,
    maxLength: 550,
    role: '입지와 교통 여건 분석. 개발 예정은 "계획" 수준. 진행률 단정 금지.',
  },
  {
    key: 'axis2',
    title: '생활권·학군',
    minLength: 400,
    maxLength: 550,
    role: '상권·편의시설·학군 여건. 실생활 편의 관점.',
  },
  {
    key: 'infoblock',
    title: '체크포인트',
    minLength: 250,
    maxLength: 400,
    role: '확인 항목 목록(층·향·동·관리·시세 확인 방법). 단정 없이 "확인할 점".',
  },
  {
    key: 'axis3',
    title: '실거주 관점',
    minLength: 350,
    maxLength: 500,
    role: '실거주 기준 장단점 균형. 단점도 솔직하게.',
  },
  {
    key: 'axis4',
    title: '투자 관점',
    minLength: 350,
    maxLength: 500,
    role: '투자 시 확인 요인(수요·공급·정비사업 여부). 가격 예측·매수 권유 절대 금지.',
  },
  {
    key: 'closing',
    title: '마무리',
    minLength: 150,
    maxLength: 300,
    role: '시세·매물 확인 안내. 앞 분석 반복 금지. 투자 권유 없이 담담하게.',
  },
];

export const REALESTATE_PLAY_CONFIG = {
  industry: 'realestate',
  flow: REALESTATE_FLOW,
  minTotalLength: 2000,
  maxTotalLength: 2500,
  // 분석 리포트형: 변화 헤더(1일/1주) 없음. 분석축 흐름.
  useChangeHeaders: false,
  // 정보블럭: 재건축/재개발 단계, 전세/월세 체크포인트 등 (INFO_BLOCKS 기반)
  useInfoBlock: true,
  // 가격 단정 금지 → EXAM 수치 비활성.
  forceExamValue: false,
};

export default REALESTATE_PLAY_CONFIG;
