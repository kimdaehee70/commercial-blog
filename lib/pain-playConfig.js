// ╔══════════════════════════════════════════════════════════╗
// ║ 🔒 FREEZE — 통증의학과 V2 · 2026-07-09                     ║
// ║ 조사(Josa) 축 종료 후 FREEZE 확정. 엔진 4파일 자립 단위.  ║
// ║ 수정 금지: 관측(survival) 완료 전까지 로직 변경 불가.     ║
// ║ 다음 축(보류): pain-prompts 구조축 / pain-data 정교화 /   ║
// ║              상담표현 clean — 모두 신규 세션에서 One Axis. ║
// ╚══════════════════════════════════════════════════════════╝

export const PAIN_FLOW_ENGINE = {
  industry: 'pain',

  sections: [
    { key: 'concern', label: '고민', minLength: 200 },
    { key: 'search', label: '탐색', minLength: 200 },
    { key: 'consult', label: '상담', minLength: 300 },
    { key: 'decision', label: '결정', minLength: 250 },
    { key: 'result', label: '변화', minLength: 350 },
    { key: 'closing', label: '마무리', minLength: 200 },
  ],

  blockKeywords: [
    '소아과','임플란트','전립선','포경','여드름','기미','보톡스','필러'
  ],

  minTotalLength: 2000
};