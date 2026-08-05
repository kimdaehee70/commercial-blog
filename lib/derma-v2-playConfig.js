// ╔══════════════════════════════════════════════════════════╗
// ║ lib/derma-v2-playConfig.js — 피부과 V2 Purpose             ║
// ║ 복사베이스: card-v2-playConfig · 섹션 골격 100% 동형        ║
// ║ 7섹션: concern / visitTrigger / examination /             ║
// ║        treatmentDecision(★axis 분기) / checkPoint /        ║
// ║        sceneVisit / closing                               ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const DERMA_V2_FLOW_ENGINE = {
  industry: "derma",
  version: "v2",

  sections: [
    { key: "concern",           label: "지금 이런 상황인가요?",              order: 1, minLength: 120, maxLength: 180, required: true },
    { key: "visitTrigger",      label: "이럴 때 진료를 고려해볼 수 있습니다", order: 2, minLength: 180, maxLength: 250, required: true },
    { key: "examination",       label: "진료에서는 무엇을 확인하나요?",       order: 3, minLength: 200, maxLength: 300, required: true },
    { key: "treatmentDecision", label: "치료·시술은 어떤 기준으로 결정되나요?", order: 4, minLength: 180, maxLength: 260, required: true },
    { key: "checkPoint",        label: "병원 선택 시 확인할 점",             order: 5, minLength: 200, maxLength: 300, required: true },
    { key: "sceneVisit",        label: "진료실에서 확인하는 과정",           order: 6, minLength: 150, maxLength: 250, required: true },
    { key: "closing",           label: "마무리",                            order: 7, minLength: 100, maxLength: 150, required: true },
  ],

  // 타 업종 침투 방지
  blockKeywords: [
    "한약", "침치료", "추나", "뜸", "부항", "경혈",
    "임플란트", "치아", "잇몸", "충치", "크라운", "교정",
    "비염", "편도", "축농증", "이명", "난청",
    "심전도", "심장초음파", "관상동맥", "스텐트",
    "디스크", "척추", "물리치료", "도수치료",
    "교실", "선생님", "어린이집", "원생",
  ],

  requiredKeywords: ["피부", "진료", "확인"],

  seoPassScore: 85,
  minTotalLength: 1400,
};
