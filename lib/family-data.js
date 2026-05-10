// lib/family-data.js — 가정의학과 시술 데이터

export const FAMILY_META = {
  industry: "family",
  label: "가정의학과",
  minLength: 2000,
};

export const FAMILY_TREATMENTS = [
  // ─── 만성질환 ───
  {
    id: "hypertension",
    industry: "family",
    name: "고혈압 관리",
    cat: "만성질환",
    emoji: "💗",
    titlePatterns: [
      "{region} 가정의학과 고혈압 관리 후기｜약 처방받고 3개월 솔직 기록",
      "{region} 고혈압 약 시작한 후기｜내과 vs 가정의학과 고민한 이유",
      "{region} 가정의학과 혈압 관리 솔직 정리｜30대 초기 고혈압 일지",
    ],
    keywords: ["고혈압", "고혈압관리", "혈압약", "{region}가정의학과", "{region}고혈압"],
    compareWith: "생활습관 교정만",
  },
  {
    id: "diabetes",
    industry: "family",
    name: "당뇨 관리",
    cat: "만성질환",
    emoji: "🩸",
    titlePatterns: [
      "{region} 가정의학과 당뇨 관리 후기｜HbA1c 낮춘 3개월 기록",
      "{region} 당뇨 초기 진단받고 결정한 이야기",
      "{region} 가정의학과 혈당 관리 솔직 정리",
    ],
    keywords: ["당뇨", "당뇨관리", "혈당관리", "{region}가정의학과", "{region}당뇨"],
    compareWith: "식이 조절만",
  },
  {
    id: "dyslipidemia",
    industry: "family",
    name: "고지혈증 관리",
    cat: "만성질환",
    emoji: "🫀",
    titlePatterns: [
      "{region} 가정의학과 고지혈증 관리 후기｜LDL 수치 낮춘 3개월 기록",
      "{region} 고지혈증 약 시작한 후기 솔직 정리",
      "{region} 가정의학과 콜레스테롤 관리 일지",
    ],
    keywords: ["고지혈증", "콜레스테롤", "LDL", "{region}가정의학과", "{region}고지혈증"],
    compareWith: "운동·식단만",
  },

  // ─── 검진·예방 ───
  {
    id: "checkup",
    industry: "family",
    name: "종합건강검진",
    cat: "검진·예방",
    emoji: "🩺",
    titlePatterns: [
      "{region} 가정의학과 종합건강검진 후기｜이상 소견 받고 한 것들",
      "{region} 건강검진 항목 비교한 솔직 후기",
      "{region} 가정의학과 정밀검진 받아본 이야기",
    ],
    keywords: ["건강검진", "종합검진", "정밀검진", "{region}가정의학과", "{region}건강검진"],
    compareWith: "기본 검진만",
  },
  {
    id: "vaccination",
    industry: "family",
    name: "예방접종",
    cat: "검진·예방",
    emoji: "💉",
    titlePatterns: [
      "{region} 가정의학과 예방접종 후기｜대상포진·독감 결정 이유",
      "{region} 성인 예방접종 종류별 비교 정리",
      "{region} 가정의학과 백신 상담 받아본 이야기",
    ],
    keywords: ["예방접종", "대상포진백신", "독감백신", "{region}가정의학과", "{region}예방접종"],
    compareWith: "접종 안 함",
  },

  // ─── 감기·소화기 ───
  {
    id: "cold",
    industry: "family",
    name: "감기·몸살",
    cat: "감기·소화기",
    emoji: "🤧",
    titlePatterns: [
      "{region} 가정의학과 감기·몸살 진료 후기｜약 1주차 회복 기록",
      "{region} 감기 오래 가서 가정의학과 간 이야기",
      "{region} 가정의학과 환절기 감기 처방 솔직 정리",
    ],
    keywords: ["감기", "몸살", "환절기감기", "{region}가정의학과", "{region}감기"],
    compareWith: "약국 종합감기약",
  },
  {
    id: "reflux",
    industry: "family",
    name: "역류성식도염",
    cat: "감기·소화기",
    emoji: "🔥",
    titlePatterns: [
      "{region} 가정의학과 역류성식도염 후기｜약 1개월 솔직 기록",
      "{region} 역류성식도염 진단받고 한 것들",
      "{region} 가정의학과 위산 역류 관리 정리",
    ],
    keywords: ["역류성식도염", "위산역류", "PPI", "{region}가정의학과", "{region}역류성식도염"],
    compareWith: "위내시경 우선",
  },
  {
    id: "ibs",
    industry: "family",
    name: "과민성대장증후군",
    cat: "감기·소화기",
    emoji: "💩",
    titlePatterns: [
      "{region} 가정의학과 과민성대장증후군 후기｜증상 1개월 관리 일지",
      "{region} 과민성대장 진단받고 결정한 이야기",
      "{region} 가정의학과 장 트러블 관리 정리",
    ],
    keywords: ["과민성대장", "IBS", "장트러블", "{region}가정의학과", "{region}과민성대장"],
    compareWith: "대장내시경 우선",
  },

  // ─── 다이어트 ───
  {
    id: "weight_loss",
    industry: "family",
    name: "비만치료(삭센다·위고비)",
    cat: "다이어트",
    emoji: "💪",
    titlePatterns: [
      "{region} 가정의학과 삭센다 후기｜3개월 체중 감량 솔직 기록",
      "{region} 위고비 vs 삭센다 비교 끝에 결정한 이유",
      "{region} 가정의학과 비만치료 처방 받아본 이야기",
    ],
    keywords: ["삭센다", "위고비", "비만치료", "{region}가정의학과", "{region}다이어트"],
    compareWith: "식단·운동만",
  },

  // ─── 수액·영양 ───
  {
    id: "iv_therapy",
    industry: "family",
    name: "수액치료",
    cat: "수액·영양",
    emoji: "💧",
    titlePatterns: [
      "{region} 가정의학과 수액치료 후기｜피로 회복 솔직 기록",
      "{region} 마늘주사 vs 신데렐라주사 비교한 이야기",
      "{region} 가정의학과 영양수액 받아본 후기",
    ],
    keywords: ["수액치료", "영양수액", "마늘주사", "{region}가정의학과", "{region}수액"],
    compareWith: "영양제 복용만",
  },
  {
    id: "nutrition_shot",
    industry: "family",
    name: "영양주사",
    cat: "수액·영양",
    emoji: "💉",
    titlePatterns: [
      "{region} 가정의학과 영양주사 후기｜비타민·면역 관리 정리",
      "{region} 영양주사 종류별 비교 솔직 후기",
      "{region} 가정의학과 면역주사 받아본 이야기",
    ],
    keywords: ["영양주사", "비타민주사", "면역주사", "{region}가정의학과", "{region}영양주사"],
    compareWith: "경구 영양제",
  },

  // ─── 생활습관 ───
  {
    id: "smoking_cessation",
    industry: "family",
    name: "금연클리닉",
    cat: "생활습관",
    emoji: "🚭",
    titlePatterns: [
      "{region} 가정의학과 금연클리닉 후기｜챔픽스 3개월 기록",
      "{region} 금연 약 처방받고 한 것들",
      "{region} 가정의학과 금연 보조제 비교한 이야기",
    ],
    keywords: ["금연클리닉", "챔픽스", "금연약", "{region}가정의학과", "{region}금연"],
    compareWith: "의지로만",
  },
  {
    id: "fatigue",
    industry: "family",
    name: "만성피로 관리",
    cat: "생활습관",
    emoji: "😴",
    titlePatterns: [
      "{region} 가정의학과 만성피로 후기｜원인 찾고 관리한 3개월",
      "{region} 만성피로 검사 받아본 솔직 기록",
      "{region} 가정의학과 번아웃 관리 이야기",
    ],
    keywords: ["만성피로", "번아웃", "피로관리", "{region}가정의학과", "{region}만성피로"],
    compareWith: "쉬는 것만",
  },
];
