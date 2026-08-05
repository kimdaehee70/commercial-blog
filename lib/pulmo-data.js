// ╔══════════════════════════════════════════════════════════╗
// ║ pulmo-data.js — 호흡기내과 (신규 업종)                     ║
// ║ V2 Purpose 전용 · v1 없음 (radio 방식 = V2 단독 등록)     ║
// ║ 12종: exam 3 / disease 9 · cat 5계열                       ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const PULMO_META = {
  industry: "pulmo",
  name: "호흡기내과",
  bizWord: "호흡기내과",
  deptWord: "호흡기내과",
};

export const PULMO_CATS = [
  "검사",
  "기도질환",
  "감염질환",
  "만성폐질환",
  "폐결절·수면호흡",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const PULMO_TREATMENTS = [
  // ── 검사 (exam 3) ──
  {
    id: "pft", name: "폐기능검사", cat: "검사",
    compareWith: "흉부 영상검사",
    desc: "숨을 들이쉬고 내쉬는 능력을 수치로 확인하는 검사",
  },
  {
    id: "chestxray", name: "흉부 X-ray", cat: "검사",
    compareWith: "흉부 CT",
    desc: "폐와 심장 윤곽을 1차로 확인하는 기본 영상검사",
  },
  {
    id: "chestct", name: "흉부 CT", cat: "검사",
    compareWith: "흉부 X-ray",
    desc: "X-ray로 확인이 어려운 부위를 단면으로 확인하는 검사",
  },

  // ── 기도질환 (disease) ──
  {
    id: "chroniccough", name: "만성기침", cat: "기도질환",
    compareWith: "감기·후두 원인",
    desc: "3주 이상 지속되는 기침의 원인을 단계적으로 확인",
  },
  {
    id: "bronchitis", name: "기관지염", cat: "기도질환",
    compareWith: "폐렴",
    desc: "기관지 점막 염증. 감염성·비감염성 원인 구분이 축",
  },
  {
    id: "asthma", name: "천식", cat: "기도질환",
    compareWith: "COPD",
    desc: "기도 과민 반응. 폐기능검사 수치 변화가 판단 근거",
  },

  // ── 감염질환 (disease) ──
  {
    id: "pneumonia", name: "폐렴", cat: "감염질환",
    compareWith: "기관지염",
    desc: "폐 실질 감염. 영상 소견과 전신 상태가 입원 여부를 가름",
  },
  {
    id: "influenza", name: "독감", cat: "감염질환",
    compareWith: "일반 감기",
    desc: "인플루엔자. 검사 시점과 항바이러스 투여 시기가 축",
  },
  {
    id: "tuberculosis", name: "결핵", cat: "감염질환",
    compareWith: "폐렴",
    desc: "장기 치료가 필요한 감염. 확인 검사와 복약 지속이 축",
  },

  // ── 만성폐질환 (disease) ──
  {
    id: "copd", name: "COPD", cat: "만성폐질환",
    compareWith: "천식",
    desc: "만성폐쇄성폐질환. 흡연력·폐기능 수치가 판단 근거",
  },

  // ── 폐결절·수면호흡 (disease) ──
  {
    id: "lungnodule", name: "폐결절", cat: "폐결절·수면호흡",
    compareWith: "정기 CT 추적",
    desc: "영상에서 발견된 결절. 크기·모양에 따라 추적 간격 결정",
  },
  {
    id: "sleepapnea", name: "수면무호흡", cat: "폐결절·수면호흡",
    compareWith: "단순 코골이",
    desc: "수면 중 호흡 중단. 수면다원검사로 중증도 확인",
  },
];

export default PULMO_TREATMENTS;
