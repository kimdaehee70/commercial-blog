// ╔══════════════════════════════════════════════════════════╗
// ║ eye-v2-data.js — 안과 V2 Purpose                          ║
// ║ ★ 재구축(2026-07-13): 목적축 5섹션 → decisionAxis 7섹션    ║
// ║   병원군 엔진 철학 통일 (clinic/derma/ent/urology 동형)     ║
// ║ ⚠ v1 lib/eye-data.js (EYE_TREATMENTS 22종) 무손상          ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 시야·시력 변화 → 검사 → 치료 판단               ║
// ║ 경계: 시력교정 수술(라식·라섹·스마일·ICL) 전면 제외          ║
// ║       드림렌즈·약시·사시 제외 / 선택적 비급여 수술 미취급    ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const EYE_V2_META = {
  industry: "eye",
  name: "안과",
  bizWord: "안과",
  deptWord: "안과",
};

export const EYE_V2_CATS = [
  "검사",
  "백내장·노안",
  "망막·녹내장",
  "안구표면",
  "소아안과",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const EYE_V2_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "refraction", name: "시력·굴절검사", cat: "검사",
    compareWith: "안경원 도수 측정",
    desc: "어느 거리에서 얼마나 보이는지와 굴절 상태를 함께 확인하는 검사",
  },
  {
    id: "tonometry", name: "안압검사", cat: "검사",
    compareWith: "안저검사",
    desc: "눈 안쪽 압력을 확인해 시신경에 부담이 있는지를 가르는 검사",
  },
  {
    id: "fundus", name: "안저검사", cat: "검사",
    compareWith: "안압검사",
    desc: "눈 안쪽 망막과 시신경의 상태를 직접 확인하는 검사",
  },
  {
    id: "slitlamp", name: "세극등현미경검사", cat: "검사",
    compareWith: "안저검사",
    desc: "각막·결막·수정체 등 눈 앞쪽 구조를 확대해 확인하는 검사",
  },
  {
    id: "visualfield", name: "시야검사", cat: "검사",
    compareWith: "안압검사",
    desc: "보이는 범위에 빠진 부분이 있는지를 구역별로 확인하는 검사",
  },

  // ── 백내장·노안 (disease 2) ──
  {
    id: "cataract", name: "백내장", cat: "백내장·노안",
    compareWith: "노안",
    desc: "수정체가 혼탁해지는 상태. 시야 뿌옇음과 혼탁 정도가 판단 근거",
  },
  {
    id: "presbyopia", name: "노안", cat: "백내장·노안",
    compareWith: "백내장",
    desc: "가까운 거리 초점 조절이 어려워지는 변화. 근거리 시력 확인이 축",
  },

  // ── 망막·녹내장 (disease 4) ──
  {
    id: "glaucoma", name: "녹내장", cat: "망막·녹내장",
    compareWith: "고안압증",
    desc: "시신경 손상이 진행되는 상태. 안압과 시야, 시신경 소견이 함께 판단 근거",
  },
  {
    id: "macular", name: "황반변성", cat: "망막·녹내장",
    compareWith: "당뇨망막병증",
    desc: "중심 시야를 담당하는 황반의 변화. 안저 소견과 증상 양상이 판단 축",
  },
  {
    id: "diabetic_retina", name: "당뇨망막병증", cat: "망막·녹내장",
    compareWith: "황반변성",
    desc: "당뇨와 관련된 망막 혈관의 변화. 안저 소견과 진행 단계가 판단 근거",
  },
  {
    id: "floaters", name: "비문증", cat: "망막·녹내장",
    compareWith: "망막열공",
    desc: "시야에 떠다니는 점·실 모양. 망막 이상 동반 여부를 가르는 것이 축",
  },

  // ── 안구표면 (disease 2) ──
  {
    id: "dry_eye", name: "안구건조증", cat: "안구표면",
    compareWith: "결막염",
    desc: "눈물층과 마이봄샘 기능의 변화. 증상 양상과 눈 앞쪽 소견이 판단 근거",
  },
  {
    id: "conjunctivitis", name: "결막염", cat: "안구표면",
    compareWith: "안구건조증",
    desc: "결막의 염증. 충혈·가려움 양상과 원인 범위 확인이 축",
  },

  // ── 소아안과 (disease 1) ──
  {
    id: "myopia_control", name: "소아근시", cat: "소아안과",
    compareWith: "가성근시",
    desc: "성장기 근시의 진행. 도수 변화 속도와 경과 기록이 판단 근거",
  },
];

export default EYE_V2_TREATMENTS;
