// ============================================================
// ent-playConfig.js — 이비인후과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ dental-playConfig.js / clinic-playConfig.js 절대 참조 금지
// ⚠️ 타 업종 섹션 구조와 절대 공유 금지
// ============================================================

/**
 * 이비인후과 6섹션 구조
 * 내용·프롬프트·금지어 완전 독립 관리
 */
export const ENT_FLOW_ENGINE = {
  industry: 'ent',

  sections: [
    {
      key: 'concern',
      label: '고민',
      order: 1,
      description: '귀·코·목·수면 관련 불편함 공감 — 일상 속 구체적 고통 묘사',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'situation',
      label: '탐색',
      order: 2,
      description: '검색·지인 추천 등 이비인후과 탐색 계기와 비교 과정',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'consult',
      label: '상담',
      order: 3,
      description: '치료 방법·비용·회복 기간 질문 포함 상담 대화체 묘사',
      required: true,
      minLength: 250,
      maxLength: 350,
    },
    {
      key: 'reason',
      label: '선택',
      order: 4,
      description: '타 치료법·타 병원 비교 후 선택 이유',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'result',
      label: '결과',
      order: 5,
      description: 'D+1/D+7/1개월/3개월 회복 타임라인 (이비인후과 회복 특화)',
      required: true,
      minLength: 300,
      maxLength: 400,
    },
    {
      key: 'closing',
      label: '마무리',
      order: 6,
      description: '추천 대상 언급 + CTA 전환 문장',
      required: true,
      minLength: 200,
      maxLength: 250,
    },
  ],

  // 이비인후과 전용 금지 키워드 (BLOCK_MAP)
  blockKeywords: [
    // 성형외과/피부과 침투 방지
    '쌍꺼풀', '눈매교정', '눈밑지방', '리프팅', '울쎄라', '써마지',
    '필러', '보톡스', '피코레이저', '레이저토닝', '지방흡입', '성형외과',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '스케일링',
    '교정', '라미네이트',
    // 유치원 표현 차단
    '교실', '선생님', '어린이집', '원생',
  ],

  // 이비인후과 전용 필수 키워드 (최소 1개 이상 포함)
  requiredKeywords: [
    '이비인후과', '귀', '코', '목', '비염', '중이염', '편도',
    '축농증', '코골이', '이명', '난청', '어지럼증',
  ],

  // 회복 타임라인 기본 템플릿 (result 섹션용)
  recoveryTimeline: {
    'd1':  '시술·수술 당일·다음날 — 통증·붓기·불편감 정도',
    'd7':  '1주일차 — 일상 회복 여부, 증상 변화',
    'm1':  '1개월차 — 기능 개선 체감',
    'm3':  '3개월차 — 최종 결과 및 만족도',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

/**
 * 치료별 섹션 커스터마이징
 * 기본 FLOW_ENGINE에서 치료 특성에 따라 오버라이드
 */
export const ENT_TREATMENT_OVERRIDES = {
  // 돌발성 난청: 긴급성 강조 — result 섹션 강화
  sudden_hearing: {
    result: {
      description: '72시간 내 치료 시작 / 스테로이드 치료 경과 / 청력 회복 타임라인',
      minLength: 350,
      maxLength: 450,
    },
  },
  // 비염 면역치료: 장기 치료 특성 반영
  rhinitis: {
    result: {
      description: '치료 시작 1개월·3개월·6개월 단계별 비염 증상 변화',
      minLength: 300,
      maxLength: 400,
    },
  },
  // 이명: 단기 완치보다 관리 중심으로
  tinnitus: {
    result: {
      description: '소리 치료 시작 후 2주·1개월·3개월 이명 인식 변화 과정',
      minLength: 300,
      maxLength: 400,
    },
  },
};
