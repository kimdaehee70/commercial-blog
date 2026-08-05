// ╔══════════════════════════════════════════════════════════╗
// ║ radio-v2-playConfig.js — 영상의학과 V2 Purpose 7섹션 FLOW  ║
// ║ 축: 검사 목적 · 검사 선택 기준 · 결과 해석 위임           ║
// ║ ⚠ 관측 전. FREEZE 아님. v1 playConfig 무수정(A/B 보존).   ║
// ╚══════════════════════════════════════════════════════════╝

export const RADIO_V2_FLOW_ENGINE = {
  industry: 'radio',
  version: 'v2-purpose',

  sections: [
    { key: 'concern',       label: '지금 이런 상황인가요?',              minLength: 120, maxLength: 180 },
    { key: 'visitTrigger',  label: '이럴 때 검사를 고려해볼 수 있습니다', minLength: 180, maxLength: 250 },
    { key: 'examination',   label: '이 검사는 무엇을 확인하나요?',        minLength: 200, maxLength: 300 },
    { key: 'examDecision',  label: '왜 이 검사가 선택되나요?',            minLength: 180, maxLength: 260 }, // ★ 핵심 축
    { key: 'resultReading', label: '검사 결과는 어떻게 해석되나요?',      minLength: 200, maxLength: 300 },
    { key: 'examProcess',   label: '검사 과정은 어떻게 진행되나요?',      minLength: 150, maxLength: 250 },
    { key: 'closing',       label: '마무리',                             minLength: 100, maxLength: 150 },
  ],

  // ── 오염 차단 토큰 ──
  blockKeywords: [
    // 타 업종 (한방·치과·피부·비뇨·소아)
    '한방', '한의원', '침 치료', '추나', '약침', '한약',
    '임플란트', '교정', '스케일링',
    '여드름', '기미', '보톡스', '필러', '레이저 토닝',
    '포경', '전립선',
    // 치료 이식 차단 (영상의학과 고유 — 치료 설명 금지)
    '수술 방법', '절개', '전신마취', '입원 기간', '재활 운동',
    '시술 과정', '주사 치료', '도수 치료',
    // 광고·단정
    '최신 장비', '최고 사양', '정확도 100', '완벽', '강력 추천', '꼭 받으세요',
    '정상입니다', '이상 없습니다', '암입니다', '진단됩니다',
    // AI 포화
    '정리하면', '결론적으로', '따라서', '체계적인', '살펴보겠습니다',
  ],

  minTotalLength: 1800,
};

export default RADIO_V2_FLOW_ENGINE;
