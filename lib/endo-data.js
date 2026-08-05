// ╔══════════════════════════════════════════════════════════╗
// ║ endo-data.js — 내분비내과 (신규 업종)                      ║
// ║ V2 Purpose 전용 · v1 없음 (card/radio/pulmo 방식 = V2 단독)║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 검진 이상 → 혈액·호르몬검사 → 원인 확인 → 관리  ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const ENDO_META = {
  industry: "endo",
  name: "내분비내과",
  bizWord: "내분비내과",
  deptWord: "내분비내과",
};

// 표시 순서 = 좌측 메뉴 cat 그룹핑 순서 (SoT)
export const ENDO_CATS = [
  "검사",
  "당뇨",
  "갑상선",
  "골대사",
  "호르몬",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const ENDO_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "thyroidus", name: "갑상선초음파", cat: "검사",
    compareWith: "갑상선기능검사",
    desc: "갑상선의 모양·크기·결절 유무를 영상으로 확인하는 검사",
  },
  {
    id: "thyroidfx", name: "갑상선기능검사", cat: "검사",
    compareWith: "갑상선초음파",
    desc: "혈액에서 갑상선호르몬 수치를 확인해 기능 상태를 판단하는 검사",
  },
  {
    id: "hba1c", name: "당화혈색소검사", cat: "검사",
    compareWith: "공복혈당검사",
    desc: "최근 몇 달간의 평균 혈당 흐름을 확인하는 혈액검사",
  },
  {
    id: "bmd", name: "골밀도검사", cat: "검사",
    compareWith: "혈액 골대사 지표검사",
    desc: "뼈의 밀도를 측정해 골절 위험 정도를 확인하는 검사",
  },
  {
    id: "hormone", name: "호르몬검사", cat: "검사",
    compareWith: "갑상선기능검사",
    desc: "부신·뇌하수체 등 호르몬 축의 수치를 확인하는 혈액·소변검사",
  },

  // ── 당뇨 (disease) ──
  {
    id: "diabetes", name: "당뇨병", cat: "당뇨",
    compareWith: "당뇨전단계",
    desc: "혈당 조절 이상. 수치 흐름과 합병증 확인, 생활·약물 관리가 축",
  },
  {
    id: "prediabetes", name: "당뇨전단계", cat: "당뇨",
    compareWith: "당뇨병",
    desc: "기준을 넘지 않았지만 정상보다 높은 혈당. 생활 관리와 경과 확인이 축",
  },
  {
    id: "dyslipidemia", name: "고지혈증", cat: "당뇨",
    compareWith: "당뇨병",
    desc: "혈액 내 지질 수치 상승. 대사 위험 요인 종합으로 접근이 결정",
  },
  {
    id: "obesity", name: "비만", cat: "당뇨",
    compareWith: "갑상선기능저하증",
    desc: "체중 증가. 대사 지표와 호르몬 원인 확인이 선행되는 진료",
  },

  // ── 갑상선 (disease) ──
  {
    id: "hypothyroid", name: "갑상선기능저하증", cat: "갑상선",
    compareWith: "갑상선기능항진증",
    desc: "갑상선호르몬 부족. 피로·체중 변화 등 증상과 수치 흐름이 판단 근거",
  },
  {
    id: "hyperthyroid", name: "갑상선기능항진증", cat: "갑상선",
    compareWith: "갑상선기능저하증",
    desc: "갑상선호르몬 과다. 두근거림·체중 감소 등 증상과 수치가 판단 근거",
  },
  {
    id: "thyroidnodule", name: "갑상선결절", cat: "갑상선",
    compareWith: "갑상선기능검사",
    desc: "갑상선에 생긴 혹. 크기·모양에 따라 경과 관찰과 추가 확인이 나뉨",
  },

  // ── 골대사 (disease) ──
  {
    id: "osteoporosis", name: "골다공증", cat: "골대사",
    compareWith: "골감소증",
    desc: "뼈 밀도 감소. 골절 위험과 골밀도 수치로 관리 방향이 결정",
  },

  // ── 호르몬 (disease) ──
  {
    id: "adrenal", name: "부신질환", cat: "호르몬",
    compareWith: "호르몬검사",
    desc: "부신호르몬 이상. 혈압·전해질·체중 변화와 호르몬 수치가 판단 근거",
  },
];

export default ENDO_TREATMENTS;
