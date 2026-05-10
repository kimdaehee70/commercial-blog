// ============================================================
// lib/neuro-playConfig.js — 신경외과 6섹션 플로우 v3
// pain v3 구조 + neuro 특화: 검사(MRI/CT) 기반 의사결정 흐름
// ============================================================

export const NEURO_FLOW_ENGINE = {
  industry: "neuro",

  sections: [
    { key: "concern",  label: "고민",   minLength: 220 },
    { key: "search",   label: "탐색",   minLength: 200 },
    { key: "consult",  label: "상담",   minLength: 250 },
    { key: "decision", label: "결정",   minLength: 200 },
    { key: "progress", label: "치료 후 변화", minLength: 280 },
    { key: "closing",  label: "마무리", minLength: 180 },
  ],

  // pain·정형외과·한의원 차단 (쏠림 방지)
  blockKeywords: [
    "도수치료", "프롤로", "PRP",
    "여드름", "기미", "보톡스", "필러",
    "임플란트", "전립선", "포경",
    "추나요법", "한약",
  ],

  minTotalLength: 2000,
};
