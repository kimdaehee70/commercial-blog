// ╔══════════════════════════════════════════════════════════╗
// ║ card-data.js — 순환기내과 (신규 업종)                      ║
// ║ V2 Purpose 전용 · v1 없음 (radio/pulmo 방식 = V2 단독)    ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 가슴 증상 → 검사 → 판단 → 치료                  ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const CARD_META = {
  industry: "card",
  name: "순환기내과",
  bizWord: "순환기내과",
  deptWord: "순환기내과",
};

export const CARD_CATS = [
  "검사",
  "혈압질환",
  "허혈성심질환",
  "리듬질환",
  "심장기능",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const CARD_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "ecg", name: "심전도검사", cat: "검사",
    compareWith: "24시간 홀터검사",
    desc: "심장의 전기 신호를 기록해 리듬과 허혈 여부를 1차로 확인하는 검사",
  },
  {
    id: "echo", name: "심장초음파", cat: "검사",
    compareWith: "심전도검사",
    desc: "심장의 구조와 펌프 기능, 판막 움직임을 영상으로 확인하는 검사",
  },
  {
    id: "holter", name: "24시간 홀터검사", cat: "검사",
    compareWith: "심전도검사",
    desc: "일상 중 심장 리듬을 하루 동안 이어 기록해 간헐적 부정맥을 확인하는 검사",
  },
  {
    id: "treadmill", name: "운동부하검사", cat: "검사",
    compareWith: "심전도검사",
    desc: "운동 중 심장 반응을 확인해 안정 시 보이지 않는 허혈 변화를 확인하는 검사",
  },
  {
    id: "bp", name: "혈압검사", cat: "검사",
    compareWith: "진료실 단회 측정",
    desc: "진료실·가정·24시간 활동혈압을 함께 확인해 기준을 판단하는 검사",
  },

  // ── 혈압질환 (disease) ──
  {
    id: "hypertension", name: "고혈압", cat: "혈압질환",
    compareWith: "일시적 혈압 상승",
    desc: "반복 측정으로 확인되는 혈압 상승. 생활 관리와 약물 접근이 축",
  },

  // ── 허혈성심질환 (disease) ──
  {
    id: "angina", name: "협심증", cat: "허혈성심질환",
    compareWith: "근골격 흉통",
    desc: "심장 혈류 부족으로 인한 흉통. 유발 상황과 부하검사 소견이 판단 근거",
  },
  {
    id: "mi", name: "심근경색", cat: "허혈성심질환",
    compareWith: "협심증",
    desc: "심장 근육 손상 이후의 관리·추적이 축. 급성기 응급 서술 아님",
  },

  // ── 리듬질환 (disease) ──
  {
    id: "arrhythmia", name: "부정맥", cat: "리듬질환",
    compareWith: "일시적 두근거림",
    desc: "심장 리듬 이상. 증상 발생 시점의 기록 확보가 핵심 축",
  },
  {
    id: "palpitation", name: "두근거림", cat: "리듬질환",
    compareWith: "부정맥",
    desc: "가슴이 뛰는 느낌. 기록으로 리듬 이상 여부를 가르는 것이 축",
  },
  {
    id: "syncope", name: "실신", cat: "리듬질환",
    compareWith: "기립성 어지럼",
    desc: "의식 소실. 심장 원인 여부를 가르기 위한 단계적 확인이 축",
  },

  // ── 심장기능 (disease) ──
  {
    id: "heartfailure", name: "심부전", cat: "심장기능",
    compareWith: "호흡기 원인 호흡곤란",
    desc: "심장 펌프 기능 저하. 심장초음파 수치와 증상 경과가 판단 근거",
  },
  {
    id: "dyslipidemia", name: "고지혈증", cat: "심장기능",
    compareWith: "고혈압",
    desc: "혈액 내 지질 수치 상승. 위험 요인 종합으로 접근 방향이 결정",
  },
  {
    id: "chestpain", name: "흉통", cat: "심장기능",
    compareWith: "협심증",
    desc: "가슴 통증. 심장 원인인지 아닌지를 먼저 가르는 것이 축",
  },
];

export default CARD_TREATMENTS;
