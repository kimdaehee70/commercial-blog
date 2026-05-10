// ============================================================
// gastro-playConfig.js — 소화기내과 FLOW_ENGINE (완전 독립)
// ⚠️ clinic/dental/pediatrics 등 타 업종 config 절대 참조 금지
// ============================================================

export const GASTRO_FLOW_ENGINE = {
  industry: 'gastro',

  sections: [
    {
      key: 'concern',
      label: '고민',
      order: 1,
      description: '소화기 증상 고민·불안 — 속쓰림·복통·혈변·더부룩함 등 구체적 묘사',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'situation',
      label: '탐색',
      order: 2,
      description: '병원 탐색 계기 — 검색·지인 추천, 2~3곳 비교 과정',
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
      description: '이 병원·이 치료 선택 이유 + 진료별 비교 정보 블럭',
      required: true,
      minLength: 250,
      maxLength: 350,
    },
    {
      key: 'result',
      label: '경과',
      order: 5,
      description: '치료 후 경과 — D+1 / 1주 / 1개월 단계별 변화 + 수치 포함',
      required: true,
      minLength: 300,
      maxLength: 400,
    },
    {
      key: 'closing',
      label: '마무리',
      order: 6,
      description: '추천 대상 + CTA — 비슷한 증상을 가진 독자에게 소화기내과 상담 권유',
      required: true,
      minLength: 200,
      maxLength: 250,
    },
  ],

  blockKeywords: [
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러', '보톡스',
    '임플란트', '스케일링', '치과',
    '전립선', '포경수술',
    '소아과', '아이', '아기', '어린이집',
  ],

  requiredKeywords: [
    '소화기', '내시경', '위', '장', '간', '담낭', '췌장',
    '속쓰림', '복통', '더부룩', '소화',
  ],

  recoveryTimeline: {
    'd1':  '검사·시술 당일 — 회복 상태, 식이 제한',
    'w1':  '1주일차 — 증상 변화, 약물 반응',
    'm1':  '1개월차 — 재검사 수치, 일상 회복',
    'm3':  '3개월차 — 최종 상태 및 관리 유지',
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

export const GASTRO_TREATMENT_OVERRIDES = {
  colonoscopy: {
    result: {
      description: '장 준비 고통 / 용종 제거 당일 / 3일 후 식이 회복 / 2주 일상 복귀',
      minLength: 350,
      maxLength: 450,
    },
  },
  cirrhosis: {
    result: {
      description: '복수 여부 / 간 수치 추적 / 3개월·6개월 초음파 결과',
      minLength: 350,
      maxLength: 450,
    },
  },
  abdominal_us: {
    result: {
      description: '초음파 소견 / 추적 검사 일정 / 생활 교정 내용',
      minLength: 150,
      maxLength: 250,
    },
  },
};
