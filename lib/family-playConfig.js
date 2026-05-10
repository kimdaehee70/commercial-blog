export const FAMILY_FLOW_ENGINE = {
  industry: 'family',

  sections: [
    { key: 'concern', label: '고민', minLength: 200 },
    { key: 'search', label: '탐색', minLength: 200 },
    { key: 'consult', label: '상담', minLength: 300 },
    { key: 'decision', label: '결정', minLength: 250 },
    { key: 'result', label: '변화', minLength: 350 },
    { key: 'closing', label: '마무리', minLength: 200 },
  ],

  // 다른 업종 키워드 차단 (한의원·내시경·피부과·비뇨기과)
  blockKeywords: [
    '한약', '침', '추나', '공진단', '보약', '한의원',
    '내시경', '위내시경', '대장내시경',
    '보톡스', '필러', '레이저', '여드름',
    '전립선', '발기', '포경',
    '임플란트', '교정', '치과',
    '소아과', '백내장', '라식',
  ],

  minTotalLength: 2000
};
