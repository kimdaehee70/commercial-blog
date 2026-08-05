// ╔══════════════════════════════════════════════════════════╗
// ║ psy-v2-data.js — 정신건강의학과 V2 Purpose                 ║
// ║ ⚠ v1 lib/psy-data.js (PSY_TREATMENTS) 무손상               ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 마음 증상 → 검사 선택 → 치료 판단               ║
// ║ 경계(최고 리스크 — 자살예방법·정신건강복지법):             ║
// ║   자살·자해 전면 금지(언급 자체 차단)                       ║
// ║   조현병·양극성·조울증 제외(중증·진단 단정 리스크)          ║
// ║   약물 상품명·성분·용량 금지(향정신성)                      ║
// ║   비용·회기·기간 수치 전면 금지(v1 EXAM_VALUES 폐기)        ║
// ║   상담센터 vs 병원 비교 금지(타 기관 폄훼 소지)             ║
// ║   입원·폐쇄병동 / 진단서·산재·보험 제외                     ║
// ║   CBT·rTMS·뉴로피드백·EMDR·MBCT 제외(비급여 프로그램 광고)  ║
// ║   아동ADHD = psy SoT 유지 (pediatrics 제외 확정과 정합)     ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const PSY_V2_META = {
  industry: "psy",
  name: "정신건강의학과",
  bizWord: "정신건강의학과",
  deptWord: "정신건강의학과",
};

export const PSY_V2_CATS = [
  "검사",
  "우울·불안",
  "강박·사회불안",
  "집중",
  "수면·소진",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const PSY_V2_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "psy_test_full", name: "종합심리검사", cat: "검사",
    compareWith: "정서상태검사",
    desc: "여러 영역의 항목을 함께 확인해 지금의 상태를 넓게 살피는 검사. 진료 소견과 함께 해석됨",
  },
  {
    id: "psy_test_mood", name: "정서상태검사", cat: "검사",
    compareWith: "스트레스반응검사",
    desc: "기분과 관련된 상태를 항목별로 확인하는 검사. 자가 보고와 진료 확인이 함께 검토됨",
  },
  {
    id: "psy_test_attention", name: "주의력검사", cat: "검사",
    compareWith: "종합심리검사",
    desc: "주의를 유지하고 전환하는 과정을 항목으로 확인하는 검사. 일상 기록과 함께 해석됨",
  },
  {
    id: "psy_test_temperament", name: "기질성격검사", cat: "검사",
    compareWith: "종합심리검사",
    desc: "평소의 반응 경향과 대처 방식을 확인하는 검사. 진단 도구가 아니라 이해를 돕는 확인 항목",
  },
  {
    id: "psy_test_stress", name: "스트레스반응검사", cat: "검사",
    compareWith: "정서상태검사",
    desc: "부담이 몸과 생활에 어떻게 나타나는지 확인하는 검사. 수면·집중·피로 기록과 함께 검토됨",
  },

  // ── 우울·불안 (disease 3) ──
  {
    id: "psy_depression", name: "우울증", cat: "우울·불안",
    compareWith: "번아웃",
    desc: "기분 저하와 흥미 감소가 일정 기간 이어지는 상태. 일상 기능 변화가 확인 축",
  },
  {
    id: "psy_anxiety", name: "불안장애", cat: "우울·불안",
    compareWith: "공황장애",
    desc: "걱정과 긴장이 이어져 일상에 영향을 주는 상태. 지속 기간과 상황 범위가 확인 축",
  },
  {
    id: "psy_panic", name: "공황장애", cat: "우울·불안",
    compareWith: "불안장애",
    desc: "갑작스러운 신체 반응이 반복되고 그 상황을 피하게 되는 흐름. 신체 원인 확인이 함께 검토됨",
  },

  // ── 강박·사회불안 (disease 2) ──
  {
    id: "psy_ocd", name: "강박장애", cat: "강박·사회불안",
    compareWith: "불안장애",
    desc: "떠오르는 생각과 반복 행동이 시간을 잠식하는 상태. 소요 시간과 생활 지장이 확인 축",
  },
  {
    id: "psy_social", name: "사회불안장애", cat: "강박·사회불안",
    compareWith: "불안장애",
    desc: "타인의 시선이 관여하는 상황에서 긴장이 커지는 상태. 회피 범위가 확인 축",
  },

  // ── 집중 (disease 2) ──
  {
    id: "psy_adhd", name: "성인ADHD", cat: "집중",
    compareWith: "주의력검사",
    desc: "주의 유지와 정리·마감의 어려움이 오래 이어지는 상태. 성장기부터의 기록이 함께 확인됨",
  },
  {
    id: "psy_child_adhd", name: "아동ADHD", cat: "집중",
    compareWith: "주의력검사",
    desc: "학교·가정 등 여러 환경에서 확인되는 주의·활동 양상. 보호자·교사 관찰 기록이 판단의 한 축",
  },

  // ── 수면·소진 (disease 2) ──
  {
    id: "psy_insomnia", name: "불면증", cat: "수면·소진",
    compareWith: "우울증",
    desc: "잠들기·유지의 어려움이 이어지고 낮 시간에 영향이 남는 상태. 수면 기록이 확인 축",
  },
  {
    id: "psy_burnout", name: "번아웃", cat: "수면·소진",
    compareWith: "우울증",
    desc: "지속된 부담 뒤 소진감과 거리두기가 이어지는 상태. 상황 요인과의 관련이 함께 확인됨",
  },
];

export default PSY_V2_TREATMENTS;
