// ╔══════════════════════════════════════════════════════════╗
// ║ radio-playConfig.js — 영상의학과 검사형 flow v1            ║
// ║ 섹션 라벨을 검사형으로 재정의 (증상→검사→판독)            ║
// ║ ⚠ 관측 전. FREEZE 아님. STEP1 엔진 생성분.                 ║
// ╚══════════════════════════════════════════════════════════╝

export const RADIO_FLOW_ENGINE = {
  industry: 'radio',

  sections: [
    { key: 'concern',  label: '이런 증상일 때',   minLength: 220 },
    { key: 'search',   label: '검사 알아보기',     minLength: 200 },
    { key: 'consult',  label: '검사 진행 방식',    minLength: 250 },
    { key: 'decision', label: '함께 검토되는 검사', minLength: 200 },
    { key: 'result',   label: '검사와 판독 과정',  minLength: 280 },
    { key: 'closing',  label: '마무리',           minLength: 180 },
  ],

  // 타 업종 오염 차단 토큰 (검사 무관 업종 키워드)
  blockKeywords: [
    '임플란트','포경','여드름','기미','보톡스','필러','전립선','소아과'
  ],

  minTotalLength: 2000
};
