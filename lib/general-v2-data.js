// ╔══════════════════════════════════════════════════════════╗
// ║ general-v2-data.js — 내과 V2 데이터 (1차 진료 허브 재설계) ║
// ║ 축(Purpose): 증상/검진 이상 → 기본검사 → 원인 범위 확인    ║
// ║              → 전문내과(소화기·호흡기·순환기·내분비) 연계  ║
// ║ ⚠ 관측 전. FREEZE 아님.                                    ║
// ║ 설계원칙: 질환 확정형 금지. 연계 허브 역할만.              ║
// ║   - 당뇨/갑상선/고지혈/비만/골다공 → 내분비내과            ║
// ║   - 고혈압/협심증/부정맥         → 순환기내과              ║
// ║   - 천식/폐렴/COPD              → 호흡기내과              ║
// ║   - 위염/역류성식도염           → 소화기내과              ║
// ║ v1(후기형·FREEZE)과 분리된 Major Version. v1 무수정.       ║
// ║ 톤: 정보형·비1인칭·의료광고법 안전.                        ║
// ╚══════════════════════════════════════════════════════════╝

export const GENERAL_V2_META = {
  industry: "general",
  label: "내과",
  minLength: 2000,
};

// decisionAxis: 1차 진료 허브 단일축 (증상 → 기본검사 → 연계 판단)
export const GENERAL_V2_AXIS = {
  purpose: "증상/검진 이상 → 기본검사 → 원인 범위 확인 → 전문내과 연계 판단",
  role: "hub",
  referTo: {
    endo:   ["당뇨", "갑상선", "고지혈증", "비만", "골다공증", "호르몬"],
    cardio: ["고혈압", "협심증", "부정맥", "심부전"],
    pulmo:  ["천식", "폐렴", "COPD", "폐결절"],
    gastro: ["위염", "역류성식도염", "대장", "내시경"],
  },
};

// cat 4축: 증상 / 검진·검사 / 상담·관리 / 감염·예방
export const GENERAL_V2_CATS = ["증상", "검진·검사", "상담·관리", "감염·예방"];

export const GENERAL_V2_TREATMENTS = [
  // ─── 증상 (5) ───
  {
    id: "fatigue",
    industry: "general",
    name: "피로감 지속",
    cat: "증상",
    emoji: "😴",
    titlePatterns: [
      "{region} 내과 피로감 지속 진료 정보｜원인 확인이 필요할 때",
      "{region} 내과 만성 피로 기본검사 안내",
      "{region} 피로가 계속될 때 내과 정리",
    ],
    keywords: ["피로감", "만성피로", "{region}내과", "{region}피로", "피로원인검사"],
    baseExam: "혈액검사(빈혈·간기능·갑상선기능·비타민D) · 문진",
    referHint: "빈혈·간기능 이상은 내과에서 이어서 확인 / 갑상선·호르몬 이상 소견 시 내분비내과 / 심장 원인 의심 시 순환기내과 / 기침이 함께 지속되면 호흡기내과",
    compareWith: "휴식·영양제만",
  },
  {
    id: "fever",
    industry: "general",
    name: "발열 지속",
    cat: "증상",
    emoji: "🌡️",
    titlePatterns: [
      "{region} 내과 발열 지속 진료 정보｜열이 계속될 때",
      "{region} 내과 발열 원인 확인 검사 안내",
      "{region} 발열이 이어질 때 내과 정리",
    ],
    keywords: ["발열", "미열지속", "{region}내과", "{region}발열", "발열원인검사"],
    baseExam: "체온·문진 · 혈액검사(염증수치·전혈구검사) · 소변검사 · 필요 시 흉부 X-ray",
    referHint: "폐 병변 의심 시 호흡기내과 / 복부 원인 의심 시 소화기내과 / 배뇨통·옆구리 통증 동반 시 요로감염 등 추가 확인. 내분비·순환기 연계는 해당 없음",
    compareWith: "해열제 복용만",
  },
  {
    id: "cough",
    industry: "general",
    name: "기침 지속",
    cat: "증상",
    emoji: "🤧",
    titlePatterns: [
      "{region} 내과 기침 지속 진료 정보｜기침이 오래갈 때",
      "{region} 내과 만성 기침 기본검사 안내",
      "{region} 기침이 이어질 때 내과 정리",
    ],
    keywords: ["기침지속", "만성기침", "{region}내과", "{region}기침", "기침원인확인"],
    baseExam: "문진 · 청진 · 흉부 X-ray · 필요 시 기본 폐기능 확인(천식·COPD 감별 목적)",
    referHint: "천식·COPD 감별이나 흉부 영상 추가 확인이 필요할 때 호흡기내과 / 위산 역류(역류성 원인)가 의심될 때 소화기내과. 내분비·순환기 연계는 해당 없음",
    compareWith: "진해제 복용만",
  },
  {
    id: "abdominal",
    industry: "general",
    name: "복통·소화불편",
    cat: "증상",
    emoji: "🫃",
    titlePatterns: [
      "{region} 내과 복통·소화불편 진료 정보｜속이 불편할 때",
      "{region} 내과 소화불편 기본검사 안내",
      "{region} 복부 증상이 이어질 때 내과 정리",
    ],
    keywords: ["복통", "소화불편", "{region}내과", "{region}복통", "소화불량진료"],
    baseExam: "문진 · 복부 촉진 · 혈액검사 · 필요 시 복부 초음파",
    referHint: "내시경·역류·대장 확인 필요 시 소화기내과",
    compareWith: "소화제 복용만",
  },
  {
    id: "dizziness",
    industry: "general",
    name: "어지럼",
    cat: "증상",
    emoji: "💫",
    titlePatterns: [
      "{region} 내과 어지럼 진료 정보｜어지럼이 반복될 때",
      "{region} 내과 어지럼 원인 확인 검사 안내",
      "{region} 어지러울 때 내과 정리",
    ],
    keywords: ["어지럼", "어지러움", "{region}내과", "{region}어지럼", "어지럼원인검사"],
    baseExam: "혈압 측정 · 혈액검사(빈혈·전해질) · 문진 · 기립 혈압 확인",
    referHint: "부정맥·혈압 원인 의심 시 순환기내과 / 전정기관 원인 의심 시 이비인후과",
    compareWith: "휴식·자세 조절만",
  },

  // ─── 검진·검사 (2) ───
  {
    id: "checkup",
    industry: "general",
    name: "건강검진 결과 상담",
    cat: "검진·검사",
    emoji: "🩺",
    titlePatterns: [
      "{region} 내과 건강검진 결과 상담 정보｜수치 해석이 필요할 때",
      "{region} 내과 검진 결과 확인·추적 안내",
      "{region} 검진 결과 상담 내과 정리",
    ],
    keywords: ["건강검진", "검진결과상담", "{region}내과", "{region}건강검진", "수치해석"],
    baseExam: "검진 결과지 확인 · 문진 · 필요 시 추가 혈액검사",
    referHint: "혈당·갑상선·지질 이상 시 내분비내과 / 심전도·혈압 이상 시 순환기내과 / 흉부 소견 시 호흡기내과",
    compareWith: "결과지 확인만",
  },
  {
    id: "blood_test",
    industry: "general",
    name: "혈액검사 이상 소견",
    cat: "검진·검사",
    emoji: "🧪",
    titlePatterns: [
      "{region} 내과 혈액검사 이상 소견 상담 정보｜수치를 확인해야 할 때",
      "{region} 내과 혈액검사 재확인·추적 안내",
      "{region} 혈액검사 결과 상담 내과 정리",
    ],
    keywords: ["혈액검사", "혈액검사이상", "{region}내과", "{region}혈액검사", "수치재확인"],
    baseExam: "이전 검사 수치 대조 · 재검 · 항목별 원인 범위 확인",
    referHint: "간·신장·혈당·갑상선 지표에 따라 해당 전문내과 연계 여부 판단",
    compareWith: "재검 없이 경과 관찰",
  },

  // ─── 상담·관리 (5) ───
  {
    id: "bp_consult",
    industry: "general",
    name: "혈압 상담",
    cat: "상담·관리",
    emoji: "🩸",
    titlePatterns: [
      "{region} 내과 혈압 상담 정보｜혈압 수치가 신경 쓰일 때",
      "{region} 내과 혈압 확인·추적 안내",
      "{region} 혈압 상담 내과 정리",
    ],
    keywords: ["혈압상담", "혈압확인", "{region}내과", "{region}혈압", "가정혈압"],
    baseExam: "진료실 혈압 측정 · 가정혈압 기록 확인 · 기본 혈액검사",
    referHint: "지속적 고혈압·심전도 이상 확인 필요 시 순환기내과",
    compareWith: "가정에서 측정만",
  },
  {
    id: "chronic_care",
    industry: "general",
    name: "만성질환 관리",
    cat: "상담·관리",
    emoji: "🔁",
    titlePatterns: [
      "{region} 내과 만성질환 관리 정보｜꾸준한 확인이 필요할 때",
      "{region} 내과 만성질환 추적·연계 안내",
      "{region} 만성질환 관리 내과 정리",
    ],
    keywords: ["만성질환관리", "정기추적", "{region}내과", "{region}만성질환", "수치추적"],
    baseExam: "정기 혈액검사 · 수치 추이 확인 · 복약 상태 확인",
    referHint: "질환별 세부 관리가 필요할 때 내분비·순환기·호흡기·소화기내과 연계",
    compareWith: "증상 있을 때만 내원",
  },
  {
    id: "health_consult",
    industry: "general",
    name: "건강 상담",
    cat: "상담·관리",
    emoji: "💬",
    titlePatterns: [
      "{region} 내과 건강 상담 정보｜어디부터 봐야 할지 모를 때",
      "{region} 내과 기본 건강 확인·연계 안내",
      "{region} 건강 상담 내과 정리",
    ],
    keywords: ["건강상담", "기본진료", "{region}내과", "{region}건강상담", "1차진료"],
    baseExam: "문진 중심 · 기본 신체 계측 · 필요 시 기본 혈액검사",
    referHint: "확인된 범위에 따라 해당 전문내과 또는 타과 연계 여부 안내",
    compareWith: "인터넷 검색으로 자가 판단",
  },
  {
    id: "smoking_cessation",
    industry: "general",
    name: "금연 상담",
    cat: "상담·관리",
    emoji: "🚭",
    titlePatterns: [
      "{region} 내과 금연 상담 정보｜금연을 준비할 때",
      "{region} 내과 금연 지원·경과 확인 안내",
      "{region} 금연 상담 내과 정리",
    ],
    keywords: ["금연상담", "금연치료", "{region}내과", "{region}금연", "금연지원"],
    baseExam: "흡연력 문진 · 니코틴 의존도 확인 · 필요 시 흉부 X-ray",
    referHint: "호흡기 증상이 함께 있을 때 호흡기내과 연계 여부 확인",
    compareWith: "의지만으로 금연",
  },
  {
    id: "lifestyle_consult",
    industry: "general",
    name: "생활습관 상담",
    cat: "상담·관리",
    emoji: "🌿",
    titlePatterns: [
      "{region} 내과 생활습관 상담 정보｜수치를 관리해야 할 때",
      "{region} 내과 생활습관 확인·추적 안내",
      "{region} 생활습관 상담 내과 정리",
    ],
    keywords: ["생활습관상담", "생활관리", "{region}내과", "{region}생활습관", "습관교정"],
    baseExam: "식이·운동·수면·음주 문진 · 기본 혈액검사 · 수치 추이 확인",
    referHint: "대사 지표 이상이 확인될 때 내분비내과 연계 여부 판단",
    compareWith: "정보만 찾아보고 혼자 관리",
  },

  // ─── 감염·예방 (4) ───
  {
    id: "flu",
    industry: "general",
    name: "독감 진료",
    cat: "감염·예방",
    emoji: "🤒",
    titlePatterns: [
      "{region} 내과 독감 진료 정보｜증상이 심하거나 오래갈 때",
      "{region} 내과 독감 검사·경과 확인 안내",
      "{region} 독감 진료 내과 정리",
    ],
    keywords: ["독감", "독감검사", "{region}내과", "{region}독감", "신속항원검사"],
    baseExam: "문진 · 신속항원검사 · 필요 시 흉부 X-ray",
    referHint: "폐렴 등 하기도 침범 의심 시 호흡기내과 확인. 내분비·순환기 연계는 해당 없음",
    compareWith: "약국 종합감기약",
  },
  {
    id: "shingles",
    industry: "general",
    name: "대상포진 진료",
    cat: "감염·예방",
    emoji: "⚡",
    titlePatterns: [
      "{region} 내과 대상포진 진료 정보｜초기 확인이 중요할 때",
      "{region} 내과 대상포진 확인·경과 관리 안내",
      "{region} 대상포진 진료 내과 정리",
    ],
    keywords: ["대상포진", "수포", "{region}내과", "{region}대상포진", "신경통"],
    baseExam: "피부 병변·발진 범위 확인 · 통증 양상 확인 · 발열 여부 · 발생 부위 확인",
    referHint: "신경통이 오래 이어질 때 통증의학과 / 병변 감별이 어려울 때 피부과 / 눈 주변 발생 시 안과 확인. 내분비·순환기 연계는 해당 없음",
    compareWith: "자연 경과 관찰",
  },
  {
    id: "vaccination",
    industry: "general",
    name: "예방접종",
    cat: "감염·예방",
    emoji: "💉",
    titlePatterns: [
      "{region} 내과 예방접종 정보｜접종 시기를 챙길 때",
      "{region} 내과 성인 예방접종 종류·대상 안내",
      "{region} 예방접종 내과 정리",
    ],
    keywords: ["예방접종", "성인접종", "{region}내과", "{region}예방접종", "접종안내"],
    baseExam: "접종력 확인 · 문진 · 접종 대상·시기 확인",
    referHint: "기저질환이 있을 때 해당 전문내과 상담 후 접종 시기 조정. 접종 자체는 내과에서 진행",
    compareWith: "접종 미실시",
  },
  {
    id: "nutrition_consult",
    industry: "general",
    name: "영양 상담",
    cat: "감염·예방",
    emoji: "🥗",
    titlePatterns: [
      "{region} 내과 영양 상담 정보｜식이 관리가 필요할 때",
      "{region} 내과 영양 상태 확인·관리 안내",
      "{region} 영양 상담 내과 정리",
    ],
    keywords: ["영양상담", "식이관리", "{region}내과", "{region}영양상담", "영양상태확인"],
    baseExam: "식이 문진 · 혈액검사(영양 지표·빈혈·비타민D) · 체성분 확인",
    referHint: "대사·호르몬 이상 소견이 함께 확인될 때 내분비내과 연계 여부 판단",
    compareWith: "영양제 임의 복용",
  },
];
