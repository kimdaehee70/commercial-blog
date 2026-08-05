// ╔══════════════════════════════════════════════════════════╗
// ║ urology-v2-data.js — 비뇨기과 V2 Purpose                   ║
// ║ ⚠ v1 lib/urology-data.js (UROLOGY_TREATMENTS) 무손상        ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 배뇨 증상 → 검사 선택 → 치료 판단               ║
// ║ 경계: 포경·정관·음경확대·조루 제외(미용/비급여 시술)        ║
// ║       전립선암 = PSA·검사 판단 범위까지 / 신장질환 제외      ║
// ║       발기부전 = 질환형 정보(원인 확인 축). 시술 광고 금지   ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const UROLOGY_V2_META = {
  industry: "urology",
  name: "비뇨기과",
  bizWord: "비뇨기과",
  deptWord: "비뇨의학과",
};

export const UROLOGY_V2_CATS = [
  "검사",
  "전립선",
  "방광·배뇨",
  "요로·감염",
  "남성건강",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const UROLOGY_V2_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "urinalysis", name: "소변검사", cat: "검사",
    compareWith: "소변배양검사",
    desc: "소변 속 염증·혈액·세균 흔적을 확인해 배뇨 증상의 출발점을 가르는 검사",
  },
  {
    id: "uroflow", name: "요류검사", cat: "검사",
    compareWith: "잔뇨 초음파",
    desc: "소변이 나오는 속도와 양의 흐름을 기록해 배뇨 기능을 확인하는 검사",
  },
  {
    id: "prostate_us", name: "전립선초음파", cat: "검사",
    compareWith: "직장수지검사",
    desc: "전립선의 크기와 모양, 주변 구조를 영상으로 확인하는 검사",
  },
  {
    id: "psa", name: "PSA검사", cat: "검사",
    compareWith: "전립선초음파",
    desc: "혈액에서 전립선 관련 수치를 확인해 추가 확인이 필요한지 가르는 검사",
  },
  {
    id: "cystoscopy", name: "방광내시경", cat: "검사",
    compareWith: "방광 초음파",
    desc: "요도와 방광 안쪽 점막 상태를 직접 확인하는 검사",
  },

  // ── 전립선 (disease 2) ──
  {
    id: "bph", name: "전립선비대증", cat: "전립선",
    compareWith: "과민성방광",
    desc: "전립선이 커지며 소변 통로가 좁아지는 상태. 배뇨 흐름과 잔뇨 확인이 판단 근거",
  },
  {
    id: "prostatitis", name: "전립선염", cat: "전립선",
    compareWith: "전립선비대증",
    desc: "전립선 부위의 염증·통증. 소변 소견과 증상 지속 양상이 판단 축",
  },

  // ── 방광·배뇨 (disease 3) ──
  {
    id: "oab", name: "과민성방광", cat: "방광·배뇨",
    compareWith: "전립선비대증",
    desc: "소변이 갑자기 마렵고 참기 어려운 상태. 배뇨 기록과 검사 소견이 판단 근거",
  },
  {
    id: "incontinence", name: "요실금", cat: "방광·배뇨",
    compareWith: "과민성방광",
    desc: "의도와 무관하게 소변이 새는 상태. 어떤 상황에서 새는지가 판단의 출발점",
  },
  {
    id: "voiding", name: "배뇨장애", cat: "방광·배뇨",
    compareWith: "전립선비대증",
    desc: "소변이 잘 나오지 않거나 잔뇨감이 남는 상태. 흐름 기록과 원인 확인이 축",
  },

  // ── 요로·감염 (disease 3) ──
  {
    id: "cystitis", name: "방광염", cat: "요로·감염",
    compareWith: "요도염",
    desc: "방광의 염증. 소변 소견과 반복 양상이 판단 근거",
  },
  {
    id: "stone", name: "요로결석", cat: "요로·감염",
    compareWith: "방광염",
    desc: "요로에 생긴 돌. 위치와 크기, 통증·혈뇨 여부가 판단 축",
  },
  {
    id: "hematuria", name: "혈뇨", cat: "요로·감염",
    compareWith: "방광염",
    desc: "소변에 피가 섞여 나오는 상태. 원인 범위를 가르는 확인이 축",
  },

  // ── 남성건강 (disease 1) ──
  {
    id: "ed", name: "발기부전", cat: "남성건강",
    compareWith: "남성갱년기",
    desc: "발기가 유지되지 않는 상태. 혈관·호르몬·생활 요인 중 원인 범위 확인이 축",
  },
];

export default UROLOGY_V2_TREATMENTS;
