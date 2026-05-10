// ============================================================
// pediatrics-playConfig.js — 소아청소년과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic/dental/ent 등 타 업종 config 절대 참조 금지
// ============================================================

/**
 * 소아청소년과 6섹션 구조
 * 보호자(부모) 1인칭 시점으로 작성
 * 아이 상태 묘사 + 보호자 감정 흐름이 핵심
 */
export const PEDIATRICS_FLOW_ENGINE = {
  industry: 'pediatrics',

  sections: [
    {
      key: 'concern',
      label: '걱정',
      order: 1,
      description: '아이 증상 발견 → 보호자의 불안과 걱정 공감 (발열·기침·발진 등 구체적 묘사)',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'situation',
      label: '탐색',
      order: 2,
      description: '소아과 탐색 계기: 맘카페·지인 추천·네이버 검색 등 실제 탐색 경로',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'consult',
      label: '진료',
      order: 3,
      description: '소아과 진료 경험: 의사 설명, 진단 내용, 부모가 한 질문 대화체 포함',
      required: true,
      minLength: 250,
      maxLength: 350,
    },
    {
      key: 'reason',
      label: '선택',
      order: 4,
      description: '이 소아과·이 치료 방법을 선택한 이유 (다른 선택지와 비교)',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'result',
      label: '경과',
      order: 5,
      description: '치료 후 아이 상태 변화 타임라인 (D+1 / D+3 / 1주 / 2주)',
      required: true,
      minLength: 300,
      maxLength: 400,
    },
    {
      key: 'closing',
      label: '마무리',
      order: 6,
      description: '비슷한 상황의 부모에게 추천 + 소아과 방문을 권유하는 CTA',
      required: true,
      minLength: 200,
      maxLength: 250,
    },
  ],

  // 소아청소년과 전용 금지 키워드
  blockKeywords: [
    // 타 업종 침투 방지
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지',
    '필러', '보톡스', '피코레이저', '지방흡입', '성형외과',
    '임플란트', '라미네이트', '스케일링', '교정',
    '전립선', '포경수술',
    // 성인 중심 표현 차단
    '직장인', '회식', '성인교정', '결혼 준비',
  ],

  // 소아청소년과 전용 필수 키워드 (최소 1개 이상 포함)
  requiredKeywords: [
    '소아과', '소아청소년과', '아이', '아기', '영아', '유아', '아이',
    '보호자', '부모', '엄마', '아빠', '열', '기침',
  ],

  // 회복 타임라인 기본 템플릿 (result 섹션용)
  recoveryTimeline: {
    'd1':  '진료 당일·다음날 — 증상 강도, 처방약 복용 후 반응',
    'd3':  '3일차 — 열 소실 여부, 식욕·활력 회복 정도',
    'w1':  '1주일차 — 일상 복귀(어린이집·유치원), 증상 재발 여부',
    'w2':  '2주일차 — 완전 회복 및 재발 방지 조치',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

/**
 * 진료별 섹션 커스터마이징
 * 기본 FLOW_ENGINE에서 진료 특성에 따라 오버라이드
 */
export const PEDIATRICS_TREATMENT_OVERRIDES = {
  // 예방접종: 결과 섹션 간략화 (단기 반응 중심)
  flu: {
    result: {
      description: '접종 당일 반응 + 1~2일 후 부작용(발열·부위 부종) 여부',
      minLength: 150,
      maxLength: 250,
    },
  },
  // 아토피: 장기 관리 과정 강조
  atopy: {
    result: {
      description: '1주 / 2주 / 1개월 단위 피부 상태 변화와 보습 루틴',
      minLength: 350,
      maxLength: 450,
    },
  },
  // 영유아 건강검진: 진료 섹션 강화 (검진 항목 묘사)
  growth: {
    consult: {
      description: '검진 항목(문진·신체계측·발달평가) 진행 순서와 결과 상담 내용',
      minLength: 300,
      maxLength: 400,
    },
  },
};
