// ============================================================
// oriental-playConfig.js — 한의원 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / dental / ent / urology 절대 참조 금지
// ============================================================

export const ORIENTAL_FLOW_ENGINE = {
  industry: 'oriental',

  sections: [
    { key: 'concern',   label: '고민', order: 1, description: '통증·체형·체질 불편함 공감 — 방치한 이유·망설임 심리 묘사 / 치료명 최대 2회·조사 오류 금지', required: true, minLength: 200, maxLength: 300 },
    { key: 'situation', label: '탐색', order: 2, description: '검색·지인 추천 등 한의원 탐색 계기와 비교 과정',            required: true, minLength: 200, maxLength: 300 },
    { key: 'consult',   label: '상담', order: 3, description: '치료 방법·비용·횟수 질문 포함 상담 대화체 묘사',            required: true, minLength: 250, maxLength: 350 },
    { key: 'reason',    label: '선택', order: 4, description: '타 치료법·타 병원 비교 후 선택 이유',                       required: true, minLength: 200, maxLength: 300 },
    { key: 'result',    label: '결과', order: 5, description: '1회/1주/1개월/3개월 치료 타임라인 — 구안와사:72시간·초기·회복기간 / 교통사고:보험·후유증 / 다이어트:체중변화 키워드 필수',                         required: true, minLength: 300, maxLength: 400 },
    { key: 'closing',   label: '마무리', order: 6, description: '추천 대상 언급 + CTA 전환 문장',                         required: true, minLength: 200, maxLength: 250 },
  ],

  blockKeywords: [
    // 성형외과/피부과 침투 방지
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러',
    '피코레이저', '레이저토닝', '지방흡입', '성형외과',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생',
  ],

  requiredKeywords: [
    '한의원', '한방', '한약', '침', '추나', '도수', '뜸', '부항',
    '체질', '기혈', '경혈', '어혈',
  ],

  recoveryTimeline: {
    's1':  '첫 1회 — 치료 직후 느낌·통증 변화',
    'w1':  '1주일차 — 증상 변화·일상 회복 여부',
    'm1':  '1개월차 — 체감 개선 정도',
    'm3':  '3개월차 — 최종 결과 및 만족도',
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

export const ORIENTAL_TREATMENT_OVERRIDES = {
  // 교통사고: 보험 처리 타임라인 강화
  traffic_accident: {
    result: { description: '사고 후 입원·통원 치료 과정 (1일·1주·1개월) + 보험 처리 과정', minLength: 350, maxLength: 450 },
  },
  // 구안와사: 초기 집중 치료 타임라인 강화
  facial_palsy: {
    result: { description: '발병 직후·1주·2주·1개월·3개월 회복 단계 타임라인', minLength: 350, maxLength: 450 },
  },
  // 산후 한방: 출산 후 주차별 타임라인
  postpartum: {
    result: { description: '출산 후 2주·1개월·2개월·3개월 회복 타임라인', minLength: 300, maxLength: 400 },
  },
  // 한방 다이어트: 주차별 체중 변화 타임라인
  oriental_diet: {
    result: { description: '1주·2주·1개월·3개월 체중·체질 변화 타임라인', minLength: 300, maxLength: 400 },
  },
};
