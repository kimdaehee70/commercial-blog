// ╔══════════════════════════════════════════════════════════╗
// ║ family-v2-data.js — 가정의학과 V2 (병원군 표준 재설계)     ║
// ║ 14종 = exam 5 + disease 9 · 7섹션 · decisionAxis 분기      ║
// ║ ⚠ 관측 전. FREEZE 아님.                                    ║
// ║ v1(후기형·22종·6섹션) 무손상 · 미호출.                     ║
// ║ 경계: gastro(복통·소화불량·설사변비) 제외 / 체중관리 제외  ║
// ║      / 발열(응급 경계) 제외 / 수액·영양·금연·비만 제외     ║
// ╚══════════════════════════════════════════════════════════╝

export const FAMILY_V2_META = {
  industry: "family",
  label: "가정의학과",
  minLength: 2000,
};

// cat 5계열: 검진 / 예방접종 / 만성질환 / 감기·호흡기 / 생활증상
export const FAMILY_V2_TREATMENTS = [
  // ══════════ exam (5) ══════════
  {
    id: "checkup",
    industry: "family",
    name: "건강검진",
    cat: "검진",
    emoji: "🩺",
    decisionAxis: "exam",
    titlePatterns: [
      "{region} 건강검진 정보｜어떤 경우에 검토되는지 안내",
      "{region} 가정의학과 건강검진 확인 항목 안내",
      "{region} 건강검진 진행 과정 정리",
    ],
    keywords: ["건강검진", "종합검진", "{region}가정의학과", "{region}건강검진", "정기검진"],
    compareWith: "국가건강검진",
  },
  {
    id: "national_checkup",
    industry: "family",
    name: "국가건강검진",
    cat: "검진",
    emoji: "📋",
    decisionAxis: "exam",
    titlePatterns: [
      "{region} 국가건강검진 정보｜대상·항목 확인 안내",
      "{region} 가정의학과 국가건강검진 진행 안내",
      "{region} 국가건강검진 확인 과정 정리",
    ],
    keywords: ["국가건강검진", "국가검진", "{region}가정의학과", "{region}국가검진", "공단검진"],
    compareWith: "건강검진",
  },
  {
    id: "chronic_lab",
    industry: "family",
    name: "만성질환 정기검사",
    cat: "검진",
    emoji: "🧪",
    decisionAxis: "exam",
    titlePatterns: [
      "{region} 만성질환 정기검사 정보｜수치 확인이 필요할 때",
      "{region} 가정의학과 혈압·혈당·지질 확인 안내",
      "{region} 만성질환 정기검사 진행 과정 정리",
    ],
    keywords: ["정기검사", "혈액검사", "{region}가정의학과", "{region}정기검사", "수치확인"],
    compareWith: "건강검진",
  },
  {
    id: "checkup_consult",
    industry: "family",
    name: "검진결과상담",
    cat: "검진",
    emoji: "🗒️",
    decisionAxis: "exam",
    titlePatterns: [
      "{region} 검진결과상담 정보｜결과 해석이 필요할 때",
      "{region} 가정의학과 검진 결과 확인 안내",
      "{region} 검진결과상담 진행 과정 정리",
    ],
    keywords: ["검진결과상담", "검진결과", "{region}가정의학과", "{region}검진결과", "결과해석"],
    compareWith: "만성질환 정기검사",
  },
  {
    id: "vaccination",
    industry: "family",
    name: "예방접종",
    cat: "예방접종",
    emoji: "💉",
    decisionAxis: "exam",
    titlePatterns: [
      "{region} 예방접종 정보｜대상·시기 확인 안내",
      "{region} 가정의학과 성인 예방접종 안내",
      "{region} 예방접종 진행 과정 정리",
    ],
    keywords: ["예방접종", "대상포진", "독감접종", "{region}가정의학과", "{region}예방접종"],
    compareWith: "건강검진",
  },

  // ══════════ disease (9) ══════════
  {
    id: "hypertension",
    industry: "family",
    name: "고혈압",
    cat: "만성질환",
    emoji: "💗",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 고혈압 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 고혈압 진료 확인 항목",
      "{region} 고혈압 관리 방향 정리",
    ],
    keywords: ["고혈압", "혈압관리", "{region}가정의학과", "{region}고혈압", "혈압"],
    compareWith: "고지혈증",
  },
  {
    id: "diabetes",
    industry: "family",
    name: "당뇨",
    cat: "만성질환",
    emoji: "🩸",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 당뇨 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 당뇨 진료 확인 항목",
      "{region} 당뇨 관리 방향 정리",
    ],
    keywords: ["당뇨", "혈당관리", "{region}가정의학과", "{region}당뇨", "혈당"],
    compareWith: "만성질환 정기검사",
  },
  {
    id: "dyslipidemia",
    industry: "family",
    name: "고지혈증",
    cat: "만성질환",
    emoji: "🫀",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 고지혈증 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 고지혈증 진료 확인 항목",
      "{region} 고지혈증 관리 방향 정리",
    ],
    keywords: ["고지혈증", "콜레스테롤", "{region}가정의학과", "{region}고지혈증", "지질"],
    compareWith: "고혈압",
  },
  {
    id: "cold",
    industry: "family",
    name: "감기·몸살",
    cat: "감기·호흡기",
    emoji: "🤧",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 감기·몸살 정보｜진료가 검토되는 경우 안내",
      "{region} 가정의학과 감기 진료 확인 항목",
      "{region} 감기·몸살 관리 방향 정리",
    ],
    keywords: ["감기", "몸살", "{region}가정의학과", "{region}감기", "환절기"],
    compareWith: "오래가는 기침",
  },
  {
    id: "cough",
    industry: "family",
    name: "오래가는 기침",
    cat: "감기·호흡기",
    emoji: "😷",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 오래가는 기침 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 기침 지속 진료 확인 항목",
      "{region} 기침 지속 관리 방향 정리",
    ],
    keywords: ["기침", "기침지속", "{region}가정의학과", "{region}기침", "인후"],
    compareWith: "감기·몸살",
  },
  {
    id: "fatigue",
    industry: "family",
    name: "만성피로",
    cat: "생활증상",
    emoji: "😴",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 만성피로 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 만성피로 진료 확인 항목",
      "{region} 만성피로 관리 방향 정리",
    ],
    keywords: ["만성피로", "피로", "{region}가정의학과", "{region}만성피로", "활력"],
    compareWith: "만성질환 정기검사",
  },
  {
    id: "dizziness",
    industry: "family",
    name: "어지럼",
    cat: "생활증상",
    emoji: "💫",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 어지럼 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 어지럼 진료 확인 항목",
      "{region} 어지럼 관리 방향 정리",
    ],
    keywords: ["어지럼", "현기증", "{region}가정의학과", "{region}어지럼", "빈혈"],
    compareWith: "두통",
  },
  {
    id: "headache",
    industry: "family",
    name: "두통",
    cat: "생활증상",
    emoji: "🤕",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 두통 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 두통 진료 확인 항목",
      "{region} 두통 관리 방향 정리",
    ],
    keywords: ["두통", "머리아픔", "{region}가정의학과", "{region}두통", "긴장"],
    compareWith: "어지럼",
  },
  {
    id: "sleep",
    industry: "family",
    name: "수면 문제",
    cat: "생활증상",
    emoji: "🌙",
    decisionAxis: "disease",
    titlePatterns: [
      "{region} 수면 문제 정보｜검사·치료 결정 기준 안내",
      "{region} 가정의학과 수면 문제 진료 확인 항목",
      "{region} 수면 문제 관리 방향 정리",
    ],
    keywords: ["수면", "잠들기어려움", "{region}가정의학과", "{region}수면", "야간각성"],
    compareWith: "만성피로",
  },
];

// UI cat 순서 SoT — index.js FAMILY_CATS 와 1:1
export const FAMILY_V2_CATS = ["검진", "예방접종", "만성질환", "감기·호흡기", "생활증상"];
