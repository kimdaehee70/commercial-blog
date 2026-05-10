// ============================================================
// general-playConfig.js — 내과·가정의학과 FLOW_ENGINE (완전 독립)
// ⚠️ clinic/dental/pediatrics/gastro 등 절대 참조 금지
// ============================================================

export const GENERAL_FLOW_ENGINE = {
  industry: 'general',

  sections: [
    {
      key: 'concern',
      label: '고민',
      order: 1,
      description: '증상 or 건강검진 결과로 인한 불안 — 수치·증상 구체적 묘사',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'situation',
      label: '탐색',
      order: 2,
      description: '내과 탐색 계기 — 검색·지인 추천, 2~3곳 비교 과정',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'consult',
      label: '진료·검사',
      order: 3,
      description: '진료 경험 — 검사 순서·수치·의사 설명·대화체 포함',
      required: true,
      minLength: 300,
      maxLength: 400,
    },
    {
      key: 'reason',
      label: '선택·정보',
      order: 4,
      description: '이 병원·이 치료 선택 이유 + 질환별 비교 정보 블럭',
      required: true,
      minLength: 250,
      maxLength: 350,
    },
    {
      key: 'result',
      label: '경과',
      order: 5,
      description: '치료 후 경과 — 1개월·3개월 수치 변화 + 생활 변화',
      required: true,
      minLength: 300,
      maxLength: 400,
    },
    {
      key: 'closing',
      label: '마무리',
      order: 6,
      description: '추천 대상 + CTA — 비슷한 증상 독자에게 내과 상담 권유',
      required: true,
      minLength: 200,
      maxLength: 250,
    },
  ],

  blockKeywords: [
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '필러', '보톡스',
    '임플란트', '스케일링', '치과',
    '전립선', '포경수술',
    '소아과', '어린이집',
  ],

  requiredKeywords: [
    '내과', '가정의학과', '혈압', '혈당', '콜레스테롤', '수치',
    '처방', '약', '검사', '건강',
  ],

  recoveryTimeline: {
    'm1':  '1개월차 — 수치 변화, 부작용 여부',
    'm3':  '3개월차 — 재검사 수치, 생활습관 정착',
    'm6':  '6개월차 — 목표 수치 달성, 장기 관리 계획',
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

export const GENERAL_TREATMENT_OVERRIDES = {
  checkup: {
    result: {
      description: '검진 결과 항목별 소견 / 이상 소견 후속 조치 / 생활 교정',
      minLength: 200,
      maxLength: 300,
    },
  },
  iv_therapy: {
    result: {
      description: '주사 당일 컨디션 / 1주 후 피로도 변화 / 2~4주 후 체감',
      minLength: 200,
      maxLength: 300,
    },
  },
  smoking_cessation: {
    result: {
      description: '1주·1개월·3개월 금연 유지 일지 + 금단 증상 관리',
      minLength: 350,
      maxLength: 450,
    },
  },
};
