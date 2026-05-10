// ============================================================
// dental-playConfig.js — 치과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic-playConfig.js 절대 참조 금지
// ⚠️ 유치원·낚시 등 타 업종 섹션 구조와 절대 공유 금지
// ============================================================

/**
 * 치과 6섹션 구조
 * clinic(성형외과/피부과)와 동일한 섹션 키를 사용하지만
 * 내용·프롬프트·금지어는 완전 독립 관리
 */
export const DENTAL_FLOW_ENGINE = {
  industry: 'dental',

  sections: [
    {
      key: 'concern',
      label: '고민',
      order: 1,
      description: '씹기 불편함·치통·외관 고민 등 치과 특화 불편함 공감',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'situation',
      label: '탐색',
      order: 2,
      description: '검색·지인 추천 등 치과 탐색 계기와 비교 과정',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'consult',
      label: '상담',
      order: 3,
      description: '비용·기간·통증 질문 포함 치과 상담 대화체 묘사',
      required: true,
      minLength: 250,
      maxLength: 350,
    },
    {
      key: 'reason',
      label: '선택',
      order: 4,
      description: '타 시술·타 치과 비교 후 선택 이유',
      required: true,
      minLength: 200,
      maxLength: 300,
    },
    {
      key: 'result',
      label: '결과',
      order: 5,
      description: 'D+1/D+7/1개월/3개월 회복 타임라인 (치과 회복 특화)',
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

  // 치과 전용 금지 키워드 (BLOCK_MAP)
  blockKeywords: [
    // 타 업종 침투 방지
    '처진', '리프팅', '주름', '필러', '보톡스', '레이저토닝', '울쎄라',
    '성형', '피부과', '지방흡입',
    // 유치원 표현 차단
    '교실', '선생님', '어린이집', '원생',
    // 낚시 표현 차단
    '낚싯대', '포인트', '조과',
  ],

  // 치과 전용 필수 키워드 (최소 1개 이상 포함)
  requiredKeywords: [
    '치과', '치아', '임플란트', '교정', '스케일링', '신경치료',
    '라미네이트', '충치', '잇몸', '크라운',
  ],

  // 회복 타임라인 기본 템플릿 (result 섹션용)
  recoveryTimeline: {
    'd1':  '시술 당일·다음날 — 통증·붓기 정도, 식사 제한 여부',
    'd7':  '1주일차 — 일상 회복 여부, 자각 변화',
    'm1':  '1개월차 — 기능·심미 변화 체감',
    'm3':  '3개월차 — 최종 결과 및 만족도',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

/**
 * 시술별 섹션 커스터마이징
 * 기본 FLOW_ENGINE에서 시술 특성에 따라 오버라이드
 */
export const DENTAL_TREATMENT_OVERRIDES = {
  // 임플란트: 회복 기간이 길어 타임라인 강화
  implant: {
    result: {
      description: '식립 직후 / 뼈 이식 회복(1~3개월) / 보철 완성 타임라인',
      minLength: 350,
      maxLength: 450,
    },
  },
  // 스케일링: 단기 시술로 result 간략화
  scaling: {
    result: {
      description: '시술 당일 느낌 + 1~2주 후 잇몸 상태 변화',
      minLength: 150,
      maxLength: 250,
    },
  },
};
