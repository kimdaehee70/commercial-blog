// lib/derma-data.js — 피부과 시술 데이터

export const DERMA_META = {
  industry: "derma",
  label: "피부과",
  minLength: 2000,
};

export const DERMA_TREATMENTS = [
  // ─── 여드름·모공 ───
  {
    id: "acne",
    industry: "derma",
    name: "여드름 치료",
    cat: "여드름·모공",
    emoji: "🧴",
    titlePatterns: [
      "{region} 여드름 치료 정보｜압출·레이저 방법 안내",
      "{region} 피부과 여드름 시술 종류 알아보기",
      "성인 여드름 {region} 피부과 진료 안내",
    ],
    keywords: ["여드름치료", "{region}여드름치료", "피부과여드름", "여드름압출"],
    compareWith: "홈케어",
  },
  {
    id: "pore",
    industry: "derma",
    name: "모공·흉터 레이저",
    cat: "여드름·모공",
    emoji: "🔬",
    titlePatterns: [
      "{region} 모공·흉터 레이저 정보 안내",
      "{region} 여드름 흉터 레이저 방법 알아보기",
    ],
    keywords: ["모공치료", "여드름흉터레이저", "프락셀", "어븀레이저"],
    compareWith: "필링",
  },

  // ─── 색소·미백 ───
  {
    id: "toning",
    industry: "derma",
    name: "레이저토닝",
    cat: "색소·미백",
    emoji: "✨",
    titlePatterns: [
      "{region} 레이저토닝 시술 정보 안내",
      "{region} 피부톤 개선 레이저토닝 알아보기",
    ],
    keywords: ["레이저토닝", "기미치료", "피부톤개선", "{region}레이저토닝"],
    compareWith: "미백관리",
  },
  {
    id: "pico",
    industry: "derma",
    name: "피코레이저",
    cat: "색소·미백",
    emoji: "💫",
    titlePatterns: [
      "{region} 피코레이저 기미 시술 정보",
      "{region} 피부과 피코레이저 방법 안내",
    ],
    keywords: ["피코레이저", "피코슈어", "기미제거", "{region}피코레이저"],
    compareWith: "레이저토닝",
  },
  {
    id: "melasma",
    industry: "derma",
    name: "기미 치료",
    cat: "색소·미백",
    emoji: "🌟",
    titlePatterns: [
      "{region} 기미 치료 방법 비교 안내",
      "{region} 피부과 기미 진료 정보",
    ],
    keywords: ["기미치료", "기미레이저", "{region}기미치료"],
    compareWith: "미백크림",
  },
  {
    id: "pigment",
    industry: "derma",
    name: "색소 레이저",
    cat: "색소·미백",
    emoji: "🔵",
    titlePatterns: [
      "{region} 색소 레이저 검버섯 시술 정보",
      "{region} 잡티 제거 레이저 방법 안내",
    ],
    keywords: ["색소레이저", "검버섯제거", "잡티레이저"],
    compareWith: "토닝",
  },
  {
    id: "ipl",
    industry: "derma",
    name: "IPL 광치료",
    cat: "색소·미백",
    emoji: "💡",
    titlePatterns: [
      "{region} IPL 광치료 정보｜홍조·색소 안내",
      "{region} 피부과 IPL 시술 알아보기",
    ],
    keywords: ["IPL", "광치료", "홍조치료", "{region}IPL"],
    compareWith: "레이저토닝",
  },

  // ─── 안티에이징 ───
  {
    id: "lifting_derma",
    industry: "derma",
    name: "피부 리프팅",
    cat: "안티에이징",
    emoji: "⬆️",
    titlePatterns: [
      "{region} 피부과 리프팅 정보｜울쎄라·슈링크 비교",
      "{region} HIFU 리프팅 방법 안내",
    ],
    keywords: ["울쎄라", "슈링크", "HIFU리프팅", "피부리프팅", "{region}리프팅"],
    compareWith: "필러",
  },
  {
    id: "skin_booster",
    industry: "derma",
    name: "스킨부스터",
    cat: "안티에이징",
    emoji: "💉",
    titlePatterns: [
      "{region} 스킨부스터 물광주사 정보 안내",
      "{region} 리쥬란 힐러 시술 알아보기",
    ],
    keywords: ["스킨부스터", "물광주사", "리쥬란", "쥬베룩", "{region}스킨부스터"],
    compareWith: "수분크림",
  },

  // ─── 레이저 ───
  {
    id: "co2_laser",
    industry: "derma",
    name: "CO2 레이저",
    cat: "레이저",
    emoji: "🔆",
    titlePatterns: [
      "{region} CO2 레이저 점 제거 정보 안내",
      "{region} 피부과 레이저 점빼기 방법",
    ],
    keywords: ["CO2레이저", "점제거레이저", "탄산가스레이저"],
    compareWith: "냉동치료",
  },
  {
    id: "vbeam",
    industry: "derma",
    name: "혈관 레이저",
    cat: "레이저",
    emoji: "🩸",
    titlePatterns: [
      "{region} 혈관 레이저 홍조 시술 정보",
      "{region} 실핏줄 제거 레이저 안내",
    ],
    keywords: ["혈관레이저", "홍조레이저", "실핏줄제거", "브이빔"],
    compareWith: "IPL",
  },

  // ─── 보톡스·필러 ───
  {
    id: "botox_derma",
    industry: "derma",
    name: "보톡스",
    cat: "보톡스·필러",
    emoji: "💊",
    titlePatterns: [
      "{region} 피부과 보톡스 시술 정보 안내",
      "{region} 사각턱 보톡스 방법 알아보기",
    ],
    keywords: ["보톡스", "사각턱보톡스", "주름보톡스", "{region}보톡스"],
    compareWith: "필러",
  },
  {
    id: "filler_derma",
    industry: "derma",
    name: "필러",
    cat: "보톡스·필러",
    emoji: "🫧",
    titlePatterns: [
      "{region} 피부과 필러 볼륨 시술 정보",
      "{region} 팔자주름 필러 방법 안내",
    ],
    keywords: ["필러", "팔자주름필러", "볼륨필러", "{region}필러"],
    compareWith: "보톡스",
  },

  // ─── 탈모 ───
  {
    id: "hair",
    industry: "derma",
    name: "탈모 치료",
    cat: "탈모",
    emoji: "💆",
    titlePatterns: [
      "{region} 피부과 탈모 치료 정보 안내",
      "{region} 탈모 주사·모발이식 방법 비교",
    ],
    keywords: ["탈모치료", "모발이식", "두피주사", "{region}탈모치료"],
    compareWith: "홈케어",
  },

  // ─── 아토피·습진 ───
  {
    id: "atopy_derma",
    industry: "derma",
    name: "아토피 피부염",
    cat: "아토피·습진",
    emoji: "🌿",
    titlePatterns: [
      "{region} 피부과 아토피 치료 정보 안내",
      "{region} 아토피 피부염 진료 알아보기",
    ],
    keywords: ["아토피치료", "아토피피부과", "습진치료", "{region}아토피"],
    compareWith: "한방치료",
  },

  // ─── 안티에이징 (추가) ───
  {
    id: "ulthera",
    industry: "derma",
    name: "울쎄라",
    cat: "안티에이징",
    emoji: "🔊",
    titlePatterns: [
      "{region} 울쎄라 시술 정보｜샷수·부위 안내",
      "{region} 피부과 울쎄라 방법 알아보기",
      "{region} 울쎄라 vs 써마지 비교 정보",
    ],
    keywords: ["울쎄라", "울쎄라600샷", "울쎄라300샷", "{region}울쎄라", "울쎄라리프팅"],
    compareWith: "써마지",
  },
  {
    id: "thermage",
    industry: "derma",
    name: "써마지",
    cat: "안티에이징",
    emoji: "🌡️",
    titlePatterns: [
      "{region} 써마지 시술 정보｜샷수·부위 안내",
      "{region} 피부과 써마지FLX 방법 안내",
      "{region} 써마지 vs 울쎄라 비교 정보",
    ],
    keywords: ["써마지", "써마지FLX", "써마지600샷", "{region}써마지"],
    compareWith: "울쎄라",
  },
  {
    id: "shurink",
    industry: "derma",
    name: "슈링크",
    cat: "안티에이징",
    emoji: "⬆️",
    titlePatterns: [
      "{region} 슈링크 리프팅 시술 정보 안내",
      "{region} 피부과 슈링크 유니버스 방법",
    ],
    keywords: ["슈링크", "슈링크리프팅", "슈링크유니버스", "{region}슈링크"],
    compareWith: "울쎄라",
  },
  {
    id: "silhouette_lift",
    industry: "derma",
    name: "실리프팅",
    cat: "안티에이징",
    emoji: "🧵",
    titlePatterns: [
      "{region} 실리프팅 시술 정보 안내",
      "{region} 피부과 실리프팅 방법 알아보기",
    ],
    keywords: ["실리프팅", "실리프팅리프팅", "{region}실리프팅"],
    compareWith: "필러",
  },
  {
    id: "kolsonik",
    industry: "derma",
    name: "콜소닉·울리지오",
    cat: "안티에이징",
    emoji: "🔵",
    titlePatterns: [
      "{region} 콜소닉·울리지오 시술 정보 비교",
      "{region} 피부과 콜소닉 다운타임 안내",
    ],
    keywords: ["콜소닉", "울리지오", "콜소닉울리지오", "{region}콜소닉"],
    compareWith: "울쎄라",
  },
  {
    id: "juvelook",
    industry: "derma",
    name: "쥬베룩·리쥬란",
    cat: "안티에이징",
    emoji: "💧",
    titlePatterns: [
      "{region} 쥬베룩 피부탄력 시술 정보",
      "{region} 리쥬란 힐러 vs 쥬베룩 비교 안내",
    ],
    keywords: ["쥬베룩", "리쥬란힐러", "{region}쥬베룩", "{region}리쥬란"],
    compareWith: "스킨부스터",
  },

  // ─── 레이저 (추가) ───
  {
    id: "laser_hair_removal",
    industry: "derma",
    name: "레이저 제모",
    cat: "레이저",
    emoji: "✂️",
    titlePatterns: [
      "{region} 레이저 제모 정보｜부위·횟수 안내",
      "{region} 피부과 제모 레이저 방법 안내",
    ],
    keywords: ["레이저제모", "제모레이저", "{region}레이저제모", "영구제모"],
    compareWith: "왁싱",
  },
  {
    id: "mole_removal",
    industry: "derma",
    name: "점 빼기·검버섯",
    cat: "레이저",
    emoji: "🔴",
    titlePatterns: [
      "{region} 점 빼기 레이저 시술 정보 안내",
      "{region} 피부과 검버섯 레이저 제거 방법",
    ],
    keywords: ["점빼기", "검버섯제거", "점레이저", "{region}점빼기"],
    compareWith: "냉동치료",
  },
  {
    id: "bb_glow",
    industry: "derma",
    name: "블랙헤드·각질 관리",
    cat: "여드름·모공",
    emoji: "🖤",
    titlePatterns: [
      "{region} 피부과 블랙헤드·각질 관리 정보",
      "{region} 각질 케어 피부과 시술 안내",
    ],
    keywords: ["블랙헤드관리", "각질관리", "피부과블랙헤드", "{region}블랙헤드"],
    compareWith: "홈케어",
  },

  // ─── 보톡스·필러 (추가) ───
  {
    id: "bbtopping",
    industry: "derma",
    name: "뽀띠성형·윤곽주사",
    cat: "보톡스·필러",
    emoji: "💉",
    titlePatterns: [
      "{region} 뽀띠성형 윤곽주사 시술 정보",
      "{region} 피부과 윤곽주사 방법 안내",
    ],
    keywords: ["뽀띠성형", "윤곽주사", "{region}뽀띠성형", "체형주사"],
    compareWith: "보톡스",
  },
  {
    id: "prp",
    industry: "derma",
    name: "PRP·자가혈 시술",
    cat: "보톡스·필러",
    emoji: "🩸",
    titlePatterns: [
      "{region} PRP 자가혈 시술 정보 안내",
      "{region} 피부과 자가혈 시술 방법 알아보기",
    ],
    keywords: ["PRP", "자가혈시술", "{region}PRP", "자가혈주사"],
    compareWith: "스킨부스터",
  },

  // ─── 안티에이징 (v1.1 신규) ───
  {
    id: "inmode",
    industry: "derma",
    name: "인모드",
    cat: "안티에이징",
    emoji: "⚡",
    titlePatterns: [
      "{region} 인모드 리프팅 시술 정보 안내",
      "{region} 피부과 인모드 FX 방법 안내",
      "{region} 인모드 vs 울쎄라 비교 정보",
    ],
    keywords: ["인모드", "인모드FX", "인모드리프팅", "{region}인모드", "RF리프팅"],
    compareWith: "울쎄라",
  },

  // ─── 여드름·모공 (v1.1 신규) ───
  {
    id: "potenza",
    industry: "derma",
    name: "포텐자",
    cat: "여드름·모공",
    emoji: "💎",
    titlePatterns: [
      "{region} 포텐자 모공·흉터 시술 정보",
      "{region} 피부과 포텐자 다운타임 안내",
      "{region} 포텐자 vs 프락셀 비교 정보",
    ],
    keywords: ["포텐자", "포텐자다이아몬드팁", "마이크로니들RF", "{region}포텐자"],
    compareWith: "프락셀",
  },
  {
    id: "acne_scar",
    industry: "derma",
    name: "여드름 흉터 치료",
    cat: "여드름·모공",
    emoji: "🩹",
    titlePatterns: [
      "{region} 여드름 흉터 치료 방법 비교 안내",
      "{region} 피부과 여드름 흉터 시술 정보",
      "여드름 흉터 어떤 시술이 맞을까｜{region} 안내",
    ],
    keywords: ["여드름흉터", "여드름흉터치료", "흉터레이저", "서브시전", "{region}여드름흉터"],
    compareWith: "필링",
  },
  {
    id: "pdt",
    industry: "derma",
    name: "PDT 광역동 치료",
    cat: "여드름·모공",
    emoji: "💡",
    titlePatterns: [
      "{region} PDT 광역동 치료 정보 안내",
      "{region} 피부과 PDT 중증 여드름 시술 정보",
      "PDT 치료 방법 알아보기｜{region} 피부과 안내",
    ],
    keywords: ["PDT", "광역동치료", "PDT여드름", "{region}PDT", "중증여드름PDT"],
    compareWith: "이소트레티노인",
  },

  // ─── 보톡스·필러 (v1.1 신규) ───
  {
    id: "botox_hyperhidrosis",
    industry: "derma",
    name: "다한증 보톡스",
    cat: "보톡스·필러",
    emoji: "💧",
    titlePatterns: [
      "{region} 겨드랑이 다한증 보톡스 정보 안내",
      "{region} 피부과 다한증 보톡스 방법 안내",
      "다한증 보톡스 방법·부위｜{region} 피부과 안내",
    ],
    keywords: ["다한증보톡스", "겨드랑이보톡스", "{region}다한증", "다한증치료", "땀보톡스"],
    compareWith: "다한증 수술",
  },

  // ─── 아토피·습진 (v1.1 신규) ───
  {
    id: "psoriasis",
    industry: "derma",
    name: "건선 치료",
    cat: "아토피·습진",
    emoji: "🌱",
    titlePatterns: [
      "{region} 피부과 건선 치료 정보｜광선치료 안내",
      "{region} 건선 진료 방법 알아보기",
      "건선 vs 아토피 차이｜{region} 피부과 안내",
    ],
    keywords: ["건선치료", "건선피부과", "건선광선치료", "{region}건선", "두피건선치료"],
    compareWith: "아토피",
  },

  // ─── 검진·상담 ───
  {
    id: "skin_checkup",
    industry: "derma",
    name: "피부 검진·상담",
    cat: "검진·상담",
    emoji: "🔍",
    titlePatterns: [
      "{region} 피부과 첫 상담 안내",
      "{region} 피부 검진 정보｜피부 타입 확인",
    ],
    keywords: ["피부과상담", "피부검진", "{region}피부과"],
    compareWith: "",
  },
];
