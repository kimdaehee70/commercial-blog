export const DERMA_FLOW_ENGINE = {
  industry: 'derma',

  sections: [
    { key: 'concern', label: '고민', minLength: 200 },
    { key: 'search', label: '탐색', minLength: 200 },
    { key: 'consult', label: '상담', minLength: 300 },
    { key: 'decision', label: '결정', minLength: 250 },
    { key: 'result', label: '변화', minLength: 350 },
    { key: 'closing', label: '마무리', minLength: 200 },
  ],

  blockKeywords: [
    '소아과','임플란트','전립선','포경'
  ],

  minTotalLength: 2000
};
