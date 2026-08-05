// ╔══════════════════════════════════════════════════════════╗
// ║ lib/derma-v2-data.js — 피부과 V2 Purpose                   ║
// ║ 복사베이스: card-data 구조 · 피부과 치환                    ║
// ║ ★ decisionAxis 이중축                                      ║
// ║   procedure(9): 울쎄라·써마지·슈링크·토닝·피코·보톡스·      ║
// ║                 필러·스킨부스터·레이저제모                   ║
// ║   disease(18): 여드름~손발톱무좀                            ║
// ║ 핵심 철학: 피부 증상 → 피부 상태 평가 → 치료·시술 판단      ║
// ║ ⚠ v1(derma-data.js)은 FREEZE. 이 파일이 V2 메뉴 SoT.       ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const DERMA_V2_META = {
  industry: "derma",
  label: "피부과",
  minLength: 1400,
  version: "v2",
};

// 좌측 메뉴 카테고리 그룹 (8종) — 순서 = 렌더 순서
export const DERMA_V2_CATS = [
  "여드름·흉터",
  "색소질환",
  "염증성 피부질환",
  "감염·양성병변",
  "탈모",
  "리프팅·탄력",
  "레이저·색소시술",
  "주사시술",
];

export const DERMA_V2_TREATMENTS = [
  // ══════════════════════════════════════════
  // 질환축 (disease) — 18종
  // ══════════════════════════════════════════

  // ── 여드름·흉터 ──
  {
    id: "acne",
    industry: "derma",
    name: "여드름",
    cat: "여드름·흉터",
    emoji: "🧴",
    titlePatterns: [
      "{region} 여드름 정보｜치료 방향은 어떤 기준으로 정해지나",
      "{region} 피부과 여드름 진료 안내",
    ],
    keywords: ["여드름", "{region}여드름", "여드름치료", "성인여드름"],
    compareWith: "지루성 피부염",
  },
  {
    id: "acne_scar",
    industry: "derma",
    name: "여드름 흉터",
    cat: "여드름·흉터",
    emoji: "🩹",
    titlePatterns: [
      "{region} 여드름 흉터 정보｜흉터 종류에 따른 접근 안내",
      "{region} 피부과 여드름 흉터 진료 기준",
    ],
    keywords: ["여드름흉터", "{region}여드름흉터", "흉터치료", "패인흉터"],
    compareWith: "여드름",
  },

  // ── 색소질환 ──
  {
    id: "melasma",
    industry: "derma",
    name: "기미",
    cat: "색소질환",
    emoji: "🌗",
    titlePatterns: [
      "{region} 기미 정보｜다른 색소와 어떻게 구분하나",
      "{region} 피부과 기미 진료 안내",
    ],
    keywords: ["기미", "{region}기미", "기미치료", "기미와잡티차이"],
    compareWith: "잡티",
  },
  {
    id: "blemish",
    industry: "derma",
    name: "잡티",
    cat: "색소질환",
    emoji: "🔸",
    titlePatterns: [
      "{region} 잡티 정보｜색소 종류별 접근 안내",
      "{region} 피부과 잡티 진료 기준",
    ],
    keywords: ["잡티", "{region}잡티", "잡티제거", "검버섯"],
    compareWith: "기미",
  },
  {
    id: "freckle",
    industry: "derma",
    name: "주근깨",
    cat: "색소질환",
    emoji: "✳️",
    titlePatterns: [
      "{region} 주근깨 정보｜기미·잡티와 구분되는 특징",
      "{region} 피부과 주근깨 진료 안내",
    ],
    keywords: ["주근깨", "{region}주근깨", "주근깨제거"],
    compareWith: "잡티",
  },
  {
    id: "pigmentation",
    industry: "derma",
    name: "색소침착",
    cat: "색소질환",
    emoji: "🟤",
    titlePatterns: [
      "{region} 색소침착 정보｜염증 후 색소와 기미 구분 안내",
      "{region} 피부과 색소침착 진료 기준",
    ],
    keywords: ["색소침착", "{region}색소침착", "염증후색소침착", "PIH"],
    compareWith: "기미",
  },

  // ── 염증성 피부질환 ──
  {
    id: "atopy",
    industry: "derma",
    name: "아토피 피부염",
    cat: "염증성 피부질환",
    emoji: "🌿",
    titlePatterns: [
      "{region} 아토피 피부염 정보｜치료 단계는 어떻게 나뉘나",
      "{region} 피부과 아토피 진료 안내",
    ],
    keywords: ["아토피", "{region}아토피", "아토피피부염", "아토피치료"],
    compareWith: "습진",
  },
  {
    id: "eczema",
    industry: "derma",
    name: "습진",
    cat: "염증성 피부질환",
    emoji: "💧",
    titlePatterns: [
      "{region} 습진 정보｜아토피와 어떻게 구분하나",
      "{region} 피부과 습진 진료 기준",
    ],
    keywords: ["습진", "{region}습진", "손습진", "화폐상습진"],
    compareWith: "아토피 피부염",
  },
  {
    id: "psoriasis",
    industry: "derma",
    name: "건선",
    cat: "염증성 피부질환",
    emoji: "🌱",
    titlePatterns: [
      "{region} 건선 정보｜습진·아토피와 구분되는 특징",
      "{region} 피부과 건선 진료 안내",
    ],
    keywords: ["건선", "{region}건선", "건선치료", "두피건선"],
    compareWith: "습진",
  },
  {
    id: "seborrheic",
    industry: "derma",
    name: "지루성 피부염",
    cat: "염증성 피부질환",
    emoji: "🫗",
    titlePatterns: [
      "{region} 지루성 피부염 정보｜재발 관리 기준 안내",
      "{region} 피부과 지루성 피부염 진료 기준",
    ],
    keywords: ["지루성피부염", "{region}지루성피부염", "두피지루성", "얼굴지루성피부염"],
    compareWith: "건선",
  },
  {
    id: "urticaria",
    industry: "derma",
    name: "두드러기",
    cat: "염증성 피부질환",
    emoji: "🔴",
    titlePatterns: [
      "{region} 두드러기 정보｜급성과 만성은 어떻게 나뉘나",
      "{region} 피부과 두드러기 진료 안내",
    ],
    keywords: ["두드러기", "{region}두드러기", "만성두드러기", "두드러기원인"],
    compareWith: "습진",
  },

  // ── 감염·양성병변 ──
  {
    id: "zoster",
    industry: "derma",
    name: "대상포진",
    cat: "감염·양성병변",
    emoji: "⚡",
    titlePatterns: [
      "{region} 대상포진 정보｜피부 병변 확인 기준 안내",
      "{region} 피부과 대상포진 진료 안내",
    ],
    keywords: ["대상포진", "{region}대상포진", "대상포진초기증상", "포진후신경통"],
    compareWith: "두드러기",
  },
  {
    id: "wart",
    industry: "derma",
    name: "사마귀",
    cat: "감염·양성병변",
    emoji: "🫧",
    titlePatterns: [
      "{region} 사마귀 정보｜티눈과 어떻게 구분하나",
      "{region} 피부과 사마귀 진료 기준",
    ],
    keywords: ["사마귀", "{region}사마귀", "발바닥사마귀", "물사마귀"],
    compareWith: "티눈",
  },
  {
    id: "corn",
    industry: "derma",
    name: "티눈",
    cat: "감염·양성병변",
    emoji: "🦶",
    titlePatterns: [
      "{region} 티눈 정보｜사마귀·굳은살과 구분되는 특징",
      "{region} 피부과 티눈 진료 안내",
    ],
    keywords: ["티눈", "{region}티눈", "티눈제거", "굳은살"],
    compareWith: "사마귀",
  },
  {
    id: "athlete_foot",
    industry: "derma",
    name: "무좀",
    cat: "감염·양성병변",
    emoji: "🍄",
    titlePatterns: [
      "{region} 무좀 정보｜습진과 어떻게 구분하나",
      "{region} 피부과 무좀 진료 기준",
    ],
    keywords: ["무좀", "{region}무좀", "발무좀", "무좀치료"],
    compareWith: "습진",
  },
  {
    id: "onychomycosis",
    industry: "derma",
    name: "손발톱무좀",
    cat: "감염·양성병변",
    emoji: "💅",
    titlePatterns: [
      "{region} 손발톱무좀 정보｜검사와 치료 방향 안내",
      "{region} 피부과 손발톱무좀 진료 기준",
    ],
    keywords: ["손발톱무좀", "{region}손발톱무좀", "발톱무좀", "조갑진균증"],
    compareWith: "무좀",
  },

  // ── 탈모 ──
  {
    id: "hair",
    industry: "derma",
    name: "탈모",
    cat: "탈모",
    emoji: "💆",
    titlePatterns: [
      "{region} 탈모 정보｜진행 양상에 따른 접근 안내",
      "{region} 피부과 탈모 진료 기준",
    ],
    keywords: ["탈모", "{region}탈모", "탈모치료", "정수리탈모"],
    compareWith: "원형탈모",
  },
  {
    id: "alopecia_areata",
    industry: "derma",
    name: "원형탈모",
    cat: "탈모",
    emoji: "⭕",
    titlePatterns: [
      "{region} 원형탈모 정보｜일반 탈모와 어떻게 다른가",
      "{region} 피부과 원형탈모 진료 안내",
    ],
    keywords: ["원형탈모", "{region}원형탈모", "원형탈모치료", "동전탈모"],
    compareWith: "탈모",
  },

  // ══════════════════════════════════════════
  // 시술축 (procedure) — 9종
  // ══════════════════════════════════════════

  // ── 리프팅·탄력 ──
  {
    id: "ulthera",
    industry: "derma",
    name: "울쎄라",
    cat: "리프팅·탄력",
    emoji: "🔊",
    titlePatterns: [
      "{region} 울쎄라 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 울쎄라 선택 기준 안내",
    ],
    keywords: ["울쎄라", "{region}울쎄라", "울쎄라리프팅", "울쎄라써마지차이"],
    compareWith: "써마지",
  },
  {
    id: "thermage",
    industry: "derma",
    name: "써마지",
    cat: "리프팅·탄력",
    emoji: "🌡️",
    titlePatterns: [
      "{region} 써마지 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 써마지 선택 기준 안내",
    ],
    keywords: ["써마지", "{region}써마지", "써마지FLX", "써마지울쎄라차이"],
    compareWith: "울쎄라",
  },
  {
    id: "shurink",
    industry: "derma",
    name: "슈링크",
    cat: "리프팅·탄력",
    emoji: "⬆️",
    titlePatterns: [
      "{region} 슈링크 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 슈링크 선택 기준 안내",
    ],
    keywords: ["슈링크", "{region}슈링크", "슈링크유니버스", "슈링크리프팅"],
    compareWith: "울쎄라",
  },

  // ── 레이저·색소시술 ──
  {
    id: "toning",
    industry: "derma",
    name: "레이저토닝",
    cat: "레이저·색소시술",
    emoji: "✨",
    titlePatterns: [
      "{region} 레이저토닝 정보｜어떤 색소에 검토되는지 안내",
      "{region} 피부과 레이저토닝 선택 기준",
    ],
    keywords: ["레이저토닝", "{region}레이저토닝", "토닝", "토닝피코차이"],
    compareWith: "피코레이저",
  },
  {
    id: "pico",
    industry: "derma",
    name: "피코레이저",
    cat: "레이저·색소시술",
    emoji: "💫",
    titlePatterns: [
      "{region} 피코레이저 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 피코레이저 선택 기준",
    ],
    keywords: ["피코레이저", "{region}피코레이저", "피코토닝", "피코슈어"],
    compareWith: "레이저토닝",
  },
  {
    id: "laser_hair_removal",
    industry: "derma",
    name: "레이저 제모",
    cat: "레이저·색소시술",
    emoji: "✂️",
    titlePatterns: [
      "{region} 레이저 제모 정보｜부위·주기 판단 기준 안내",
      "{region} 피부과 레이저 제모 선택 기준",
    ],
    keywords: ["레이저제모", "{region}레이저제모", "제모레이저", "영구제모"],
    compareWith: "왁싱",
  },

  // ── 주사시술 ──
  {
    id: "botox_derma",
    industry: "derma",
    name: "보톡스",
    cat: "주사시술",
    emoji: "💊",
    titlePatterns: [
      "{region} 보톡스 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 보톡스 선택 기준 안내",
    ],
    keywords: ["보톡스", "{region}보톡스", "주름보톡스", "사각턱보톡스"],
    compareWith: "필러",
  },
  {
    id: "filler_derma",
    industry: "derma",
    name: "필러",
    cat: "주사시술",
    emoji: "🫧",
    titlePatterns: [
      "{region} 필러 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 필러 선택 기준 안내",
    ],
    keywords: ["필러", "{region}필러", "팔자주름필러", "필러보톡스차이"],
    compareWith: "보톡스",
  },
  {
    id: "skin_booster",
    industry: "derma",
    name: "스킨부스터",
    cat: "주사시술",
    emoji: "💉",
    titlePatterns: [
      "{region} 스킨부스터 정보｜어떤 경우에 검토되는지 안내",
      "{region} 피부과 스킨부스터 선택 기준",
    ],
    keywords: ["스킨부스터", "{region}스킨부스터", "리쥬란", "쥬베룩"],
    compareWith: "필러",
  },
];
