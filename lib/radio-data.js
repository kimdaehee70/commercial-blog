// ╔══════════════════════════════════════════════════════════╗
// ║ radio-data.js — 영상의학과 검사 데이터 v1 (검사형 신규설계) ║
// ║ 축: 검색자 목적축(1차) → 검사종류(2차) → 부위(3차)         ║
// ║ ⚠ 관측 전. FREEZE 아님. STEP1 엔진 생성분.                 ║
// ║ 설계원칙: 사용자는 "검사 자체"가 아니라 "이 증상에 어떤    ║
// ║          검사가 필요한지"를 검색한다 → 목적축이 1차.       ║
// ╚══════════════════════════════════════════════════════════╝

export const RADIO_META = {
  industry: "radio",
  label: "영상의학과",
  minLength: 2000,
};

// cat = 검색자 목적축 (증상 상황). 검사종류/부위는 항목 속성으로.
export const RADIO_TREATMENTS = [
  // ─── 머리·신경 증상 ───
  {
    id: "brain_mri_headache",
    industry: "radio",
    name: "뇌 MRI 검사",
    cat: "머리·어지럼",
    exam: "MRI",
    bodyPart: "뇌",
    emoji: "🧠",
    titlePatterns: [
      "{region} {name} 정보｜반복되는 두통·어지럼",
      "{region} {name} 언제 필요한지 안내",
      "두통 검사 {region} {name} 정리",
    ],
    keywords: ["뇌MRI", "{region}뇌MRI", "두통검사", "어지럼검사"],
    compareWith: "뇌 CT",
  },
  {
    id: "brain_ct_screening",
    industry: "radio",
    name: "뇌 CT 검사",
    cat: "머리·어지럼",
    exam: "CT",
    bodyPart: "뇌",
    emoji: "🧠",
    titlePatterns: [
      "{region} {name} 정보｜갑작스러운 두통·외상",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} MRI와 차이 안내",
    ],
    keywords: ["뇌CT", "{region}뇌CT", "머리CT"],
    compareWith: "뇌 MRI",
  },
  {
    id: "carotid_ultrasound",
    industry: "radio",
    name: "경동맥 초음파",
    cat: "머리·어지럼",
    exam: "초음파",
    bodyPart: "경동맥",
    emoji: "🩺",
    titlePatterns: [
      "{region} {name} 정보｜어지럼·혈관 건강 확인",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 검사 정보 안내",
    ],
    keywords: ["경동맥초음파", "{region}경동맥초음파", "혈관검사"],
    compareWith: "뇌 MRA",
  },

  // ─── 척추·관절 증상 ───
  {
    id: "spine_mri",
    industry: "radio",
    name: "척추 MRI 검사",
    cat: "허리·목·관절",
    exam: "MRI",
    bodyPart: "척추",
    emoji: "🦴",
    titlePatterns: [
      "{region} {name} 정보｜다리 저림 동반 허리 통증",
      "{region} {name} 언제 필요한지 안내",
      "디스크 검사 {region} {name} 정리",
    ],
    keywords: ["척추MRI", "{region}척추MRI", "허리MRI", "디스크검사"],
    compareWith: "척추 CT",
  },
  {
    id: "joint_mri",
    industry: "radio",
    name: "관절 MRI 검사",
    cat: "허리·목·관절",
    exam: "MRI",
    bodyPart: "관절",
    emoji: "🦵",
    titlePatterns: [
      "{region} {name} 정보｜무릎·어깨 지속 통증",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 검사 정보 안내",
    ],
    keywords: ["관절MRI", "무릎MRI", "어깨MRI", "{region}관절MRI"],
    compareWith: "관절 초음파",
  },
  {
    id: "bone_densitometry",
    industry: "radio",
    name: "골밀도 검사",
    cat: "허리·목·관절",
    exam: "DEXA",
    bodyPart: "뼈",
    emoji: "☑️",
    titlePatterns: [
      "{region} {name} 정보｜골다공증 위험 확인",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 검사 정보 안내",
    ],
    keywords: ["골밀도검사", "골다공증검사", "{region}골밀도", "DEXA"],
    compareWith: "일반 엑스레이",
  },

  // ─── 가슴·호흡 증상 ───
  {
    id: "chest_ct",
    industry: "radio",
    name: "폐 CT(저선량) 검사",
    cat: "가슴·호흡",
    exam: "CT",
    bodyPart: "폐",
    emoji: "🫁",
    titlePatterns: [
      "{region} {name} 정보｜기침 지속·흡연력 확인",
      "{region} {name} 대상과 진행 방식",
      "폐 검진 {region} {name} 정리",
    ],
    keywords: ["폐CT", "저선량CT", "{region}폐CT", "폐암검진"],
    compareWith: "흉부 엑스레이",
  },
  {
    id: "chest_xray",
    industry: "radio",
    name: "흉부 엑스레이",
    cat: "가슴·호흡",
    exam: "X-ray",
    bodyPart: "흉부",
    emoji: "📷",
    titlePatterns: [
      "{region} {name} 정보｜기본 폐·심장 확인",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 검사 정보 안내",
    ],
    keywords: ["흉부엑스레이", "가슴엑스레이", "{region}흉부촬영"],
    compareWith: "폐 CT",
  },

  // ─── 복부·소화기 증상 ───
  {
    id: "abdominal_ultrasound",
    industry: "radio",
    name: "복부 초음파",
    cat: "배·소화기",
    exam: "초음파",
    bodyPart: "복부",
    emoji: "🩻",
    titlePatterns: [
      "{region} {name} 정보｜속 불편·간 수치 확인",
      "{region} {name} 대상과 진행 방식",
      "복부 검사 {region} {name} 정리",
    ],
    keywords: ["복부초음파", "간초음파", "{region}복부초음파"],
    compareWith: "복부 CT",
  },
  {
    id: "abdominal_ct",
    industry: "radio",
    name: "복부 CT 검사",
    cat: "배·소화기",
    exam: "CT",
    bodyPart: "복부",
    emoji: "🔬",
    titlePatterns: [
      "{region} {name} 정보｜지속되는 복통 원인 확인",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 초음파와 차이 안내",
    ],
    keywords: ["복부CT", "{region}복부CT", "복통검사"],
    compareWith: "복부 초음파",
  },

  // ─── 검진·종합 ───
  {
    id: "health_screening",
    industry: "radio",
    name: "영상 종합검진",
    cat: "종합검진",
    exam: "종합",
    bodyPart: "전신",
    emoji: "🧾",
    titlePatterns: [
      "{region} {name} 정보｜증상 없어도 정기 확인",
      "{region} {name} 구성과 진행 방식",
      "건강검진 영상검사 {region} 정리",
    ],
    keywords: ["종합검진", "영상검진", "{region}건강검진", "정밀검진"],
    compareWith: "단일 부위 검사",
  },
  {
    id: "thyroid_ultrasound",
    industry: "radio",
    name: "갑상선 초음파",
    cat: "종합검진",
    exam: "초음파",
    bodyPart: "갑상선",
    emoji: "🦋",
    titlePatterns: [
      "{region} {name} 정보｜목 결절·갑상선 확인",
      "{region} {name} 대상과 진행 방식",
      "{region} {name} 검사 정보 안내",
    ],
    keywords: ["갑상선초음파", "{region}갑상선초음파", "목결절검사"],
    compareWith: "갑상선 기능검사",
  },
  {
    id: "breast_ultrasound",
    industry: "radio",
    name: "유방 초음파·촬영",
    cat: "종합검진",
    exam: "초음파",
    bodyPart: "유방",
    emoji: "🎗️",
    titlePatterns: [
      "{region} {name} 정보｜멍울·정기 검진 확인",
      "{region} {name} 대상과 진행 방식",
      "유방 검사 {region} {name} 정리",
    ],
    keywords: ["유방초음파", "유방촬영", "{region}유방검사", "맘모그램"],
    compareWith: "유방 MRI",
  },
];
