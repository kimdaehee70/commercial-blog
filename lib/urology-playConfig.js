// ============================================================
// urology-playConfig.js — 비뇨기과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ ent-playConfig.js / dental-playConfig.js 절대 참조 금지
// ============================================================

export const UROLOGY_FLOW_ENGINE = {
  industry: 'urology',

  sections: [
    { key: 'concern',   label: '고민', order: 1, description: '배뇨·남성건강 불편함 공감 — 창피함·망설임 심리 묘사', required: true, minLength: 200, maxLength: 300 },
    { key: 'situation', label: '탐색', order: 2, description: '검색·지인 추천 등 비뇨기과 탐색 계기와 비교 과정',  required: true, minLength: 200, maxLength: 300 },
    { key: 'consult',   label: '상담', order: 3, description: '치료 방법·비용·회복 기간 질문 포함 상담 대화체 묘사', required: true, minLength: 250, maxLength: 350 },
    { key: 'reason',    label: '선택', order: 4, description: '타 치료법·타 병원 비교 후 선택 이유',                required: true, minLength: 200, maxLength: 300 },
    { key: 'result',    label: '결과', order: 5, description: 'D+1/D+7/1개월/3개월 회복 타임라인',                  required: true, minLength: 300, maxLength: 400 },
    { key: 'closing',   label: '마무리', order: 6, description: '추천 대상 언급 + CTA 전환 문장',                  required: true, minLength: 200, maxLength: 250 },
  ],

  blockKeywords: [
    // 성형외과/피부과 침투 방지
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러',
    '피코레이저', '레이저토닝', '지방흡입', '성형외과',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생',
  ],

  requiredKeywords: [
    '비뇨기과', '소변', '전립선', '방광', '요로', '포경', '정관',
    '요실금', '발기', '결석', '혈뇨', '성병',
  ],

  recoveryTimeline: {
    'd1':  '시술·수술 당일·다음날 — 통증·붓기·불편감 정도',
    'd7':  '1주일차 — 일상 회복 여부, 증상 변화',
    'm1':  '1개월차 — 기능 개선 체감',
    'm3':  '3개월차 — 최종 결과 및 만족도',
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

export const UROLOGY_TREATMENT_OVERRIDES = {
  // 정계정맥류: 임신·정자 개선 타임라인 강화
  varicocele: {
    result: { description: '수술 후 회복 1~2주 / 정자 개선 3~6개월 / 임신 시도 타임라인', minLength: 350, maxLength: 450 },
  },
  // 발기부전: 충격파 치료 6~12주 경과 강화
  ed: {
    result: { description: '충격파 치료 회차별 변화 (1회·3회·6회 완료) 타임라인', minLength: 300, maxLength: 400 },
  },
  // 요로결석: 배출 확인 타임라인
  kidney_stone: {
    result: { description: '충격파 후 결석 배출 과정 (1일·3일·1주·1개월) 타임라인', minLength: 300, maxLength: 400 },
  },
};
