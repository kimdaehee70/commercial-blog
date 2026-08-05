// lib/bedding-data.js
// 이브자리 용인점 — 침구 정보형 검색노출 엔진 데이터
// 철학: 후기/체험/구매 ❌ → 지역+침구키워드 정보형/선택기준형 ⭕
// 화자: 매장(이브자리 용인점). 구매자 화자 금지.
// 매뉴얼 PART4 구조 준수. 기존 엔진(clinic/dental/...) 무수정 — 완전 독립.

// ── 지역(생활권) ─────────────────────────────────────────────
// 제목엔 대표지역명, 본문엔 대표지역 + 생활권 토큰만 사용.
export const BEDDING_REGION_DEFAULT = "용인";
export const BEDDING_REGION_TOKENS = ["용인", "수지", "기흥", "동백동", "상현동", "보정동"];

// ── 카테고리 탭 ──────────────────────────────────────────────
export const BEDDING_CATS = [
  "전체",
  "혼수·예단",
  "계절침구",
  "기능성",
  "베개·매트리스",
];

// ── DIRECTION 맵 (매뉴얼 PART3-1 — 가장 중요) ───────────────────
// 침구마다 concern/effect/hook/keyword 4필드 정의.
// effect = "변화 방향"이 아니라 "확인해야 할 정보 방향"으로 작성(정보형 고정).
// hook = 구매 후킹 ❌ → 검색 직전 상황(혼수 준비, 계절 교체, 기능 탐색) ⭕
export const BEDDING_DIRECTION = {
  honsu: {
    concern: "혼수 준비를 시작했는데 침구를 무엇부터 봐야 할지 막막해서",
    effect:  "혼수침구 구성 항목, 소재별 차이, 예산 잡는 기준 정리",
    hook:    "혼수 준비를 시작하면 침구를 어디서부터 봐야 할지 막막할 때가 있습니다",
    keyword: "혼수침구",
  },
  newlywed: {
    concern: "신혼집 침구를 처음 장만하는데 종류가 많아 선택 기준이 필요해서",
    effect:  "신혼침구 기본 구성, 계절 대응, 관리 편의 기준 정리",
    hook:    "신혼집 침구를 처음 장만할 때는 종류가 많아 기준부터 잡는 편이 좋습니다",
    keyword: "신혼침구",
  },
  yedan: {
    concern: "예단침구를 준비하는데 격식과 실용 사이에서 무엇을 봐야 할지 몰라서",
    effect:  "예단침구 구성 관례, 소재 격, 보관·관리 시 확인 요소 정리",
    hook:    "예단침구는 격식과 실용을 함께 보게 되어 확인할 점이 적지 않습니다",
    keyword: "예단침구",
  },
  cooling: {
    concern: "여름에 잘 때 더위로 자주 깨서 냉감침구를 알아보게 되어서",
    effect:  "냉감 소재 원리, 체감 차이, 세탁·관리 시 확인 요소 정리",
    hook:    "여름에 잠을 자주 설치면 냉감침구를 먼저 알아보게 됩니다",
    keyword: "냉감침구",
  },
  summer: {
    concern: "여름이불을 바꾸려는데 소재마다 무엇이 다른지 기준이 필요해서",
    effect:  "여름이불 소재별 통기·무게·관리 차이, 사용 환경별 선택 기준 정리",
    hook:    "여름이불은 소재에 따라 느낌이 크게 달라 기준을 먼저 보는 편이 좋습니다",
    keyword: "여름이불",
  },
  goose: {
    concern: "구스이불을 알아보는데 충전재·필파워 같은 용어가 어려워서",
    effect:  "구스 충전재 등급, 필파워 의미, 세탁·보관 시 확인 요소 정리",
    hook:    "구스이불은 충전재와 필파워 같은 용어부터 정리하면 보기가 수월합니다",
    keyword: "구스이불",
  },
  allseason: {
    concern: "사계절이불 하나로 두루 쓰고 싶은데 어떤 기준으로 골라야 할지 몰라서",
    effect:  "사계절이불 보온·통기 균형, 분리형 구성, 사용 환경 기준 정리",
    hook:    "사계절이불은 하나로 두루 쓰려는 경우가 많아 균형 기준을 보게 됩니다",
    keyword: "사계절이불",
  },
  allergy: {
    concern: "비염·먼지 때문에 알레르기케어 침구를 알아보게 되어서",
    effect:  "알레르기케어 원단 방식, 세탁 주기, 관리 시 확인 요소 정리",
    hook:    "비염이나 먼지에 예민하면 알레르기케어 침구를 먼저 찾게 됩니다",
    keyword: "알레르기케어침구",
  },
  funcpillow: {
    concern: "베개를 바꾸려는데 기능성 종류가 많아 무엇을 봐야 할지 몰라서",
    effect:  "기능성 베개 높이·복원력·소재 차이, 사용 환경별 선택 기준 정리",
    hook:    "기능성 베개는 종류가 많아 높이와 소재 기준부터 보는 편이 좋습니다",
    keyword: "기능성베개",
  },
  custompillow: {
    concern: "맞춤베개를 알아보는데 상담 전에 무엇을 확인해야 할지 몰라서",
    effect:  "맞춤베개 측정 항목, 상담 시 확인할 점, 사용 환경 정리",
    hook:    "맞춤베개는 상담 전에 확인할 점을 정리해두면 도움이 됩니다",
    keyword: "맞춤베개",
  },
  mattress: {
    concern: "매트리스를 바꾸려는데 경도·소재 기준이 헷갈려서",
    effect:  "매트리스 경도 단계, 소재 구조, 사용 환경별 선택 기준 정리",
    hook:    "매트리스는 경도와 소재 구조를 먼저 보면 비교가 수월합니다",
    keyword: "매트리스",
  },
  topper: {
    concern: "토퍼를 추가하려는데 두께·소재에 따라 무엇이 다른지 몰라서",
    effect:  "토퍼 두께·소재 차이, 매트리스 조합, 관리 시 확인 요소 정리",
    hook:    "토퍼는 두께와 소재에 따라 느낌이 달라 기준을 보고 고르는 편이 좋습니다",
    keyword: "토퍼",
  },
  coolingpad: {
    concern: "여름에 매트리스가 더워서 냉감패드를 깔아볼까 알아보게 되어서",
    effect:  "냉감패드 소재 원리, 매트리스·토퍼와 차이, 세탁·관리 시 확인 요소 정리",
    hook:    "여름에 매트리스 위가 더우면 냉감패드를 먼저 알아보게 됩니다",
    keyword: "냉감패드",
  },
  iupillow: {
    concern: "아이유베개를 알아보는데 높이·소재가 내 잠버릇에 맞는지 기준이 필요해서",
    effect:  "아이유베개 높이·복원력·소재 사양, 사용 환경별 확인 요소 정리",
    hook:    "아이유베개는 높이와 소재 사양을 먼저 보면 내게 맞는지 가늠하기 수월합니다",
    keyword: "아이유베개",
  },
};

// ── 치료(=침구) 목록 (매뉴얼 PART4 필드 구조) ───────────────────
// titlePatterns: {region} + 정보형 어미만. '후기/추천' 절대 미포함.
export const BEDDING_TREATMENTS = [
  {
    id: "honsu",
    industry: "bedding",
    name: "혼수침구",
    cat: "혼수·예단",
    emoji: "🛏️",
    titlePatterns: [
      "{region} 혼수침구 준비 전 확인할 기준",
      "{region} 혼수침구 고르기 전 알아둘 점",
    ],
    keywords: ["혼수침구", "혼수이불", "혼수 침구 세트"],
    compareWith: "신혼침구",
  },
  {
    id: "newlywed",
    industry: "bedding",
    name: "신혼침구",
    cat: "혼수·예단",
    emoji: "🛏️",
    titlePatterns: [
      "{region} 신혼침구 장만 전 확인할 기준",
      "{region} 신혼침구 처음 고를 때 알아둘 점",
    ],
    keywords: ["신혼침구", "신혼이불", "신혼 침구 준비"],
    compareWith: "혼수침구",
  },
  {
    id: "yedan",
    industry: "bedding",
    name: "예단침구",
    cat: "혼수·예단",
    emoji: "🎁",
    titlePatterns: [
      "{region} 예단침구 준비 전 확인할 기준",
      "{region} 예단침구 고를 때 알아둘 점",
    ],
    keywords: ["예단침구", "예단이불", "예단 침구 구성"],
    compareWith: "혼수침구",
  },
  {
    id: "cooling",
    industry: "bedding",
    name: "냉감침구",
    cat: "계절침구",
    emoji: "❄️",
    titlePatterns: [
      "{region} 냉감침구 선택 시 확인할 기준",
      "{region} 냉감침구 고르기 전 알아둘 점",
    ],
    keywords: ["냉감침구", "냉감이불", "여름 냉감 침구"],
    compareWith: "여름이불",
  },
  {
    id: "summer",
    industry: "bedding",
    name: "여름이불",
    cat: "계절침구",
    emoji: "🌿",
    titlePatterns: [
      "{region} 여름이불 소재에 따라 달라지는 점",
      "{region} 여름이불 고르기 전 확인할 기준",
    ],
    keywords: ["여름이불", "여름 이불 소재", "시원한 이불"],
    compareWith: "냉감침구",
  },
  {
    id: "goose",
    industry: "bedding",
    name: "구스이불",
    cat: "계절침구",
    emoji: "🪶",
    titlePatterns: [
      "{region} 구스이불 고르기 전 확인할 기준",
      "{region} 구스이불 세탁 전 알아둘 점",
    ],
    keywords: ["구스이불", "구스 충전재", "거위털 이불"],
    compareWith: "사계절이불",
  },
  {
    id: "allseason",
    industry: "bedding",
    name: "사계절이불",
    cat: "계절침구",
    emoji: "🌤️",
    titlePatterns: [
      "{region} 사계절이불 고를 때 확인할 기준",
      "{region} 사계절이불 알아두면 좋은 점",
    ],
    keywords: ["사계절이불", "사계절 침구", "올시즌 이불"],
    compareWith: "구스이불",
  },
  {
    id: "allergy",
    industry: "bedding",
    name: "알레르기케어침구",
    cat: "기능성",
    emoji: "🛡️",
    titlePatterns: [
      "{region} 알레르기케어 침구 고르기 전 확인할 기준",
      "{region} 알레르기케어 침구 관리 시 알아둘 점",
    ],
    keywords: ["알레르기케어침구", "방진 침구", "항알레르기 이불"],
    compareWith: "사계절이불",
  },
  {
    id: "funcpillow",
    industry: "bedding",
    name: "기능성베개",
    cat: "베개·매트리스",
    emoji: "💤",
    titlePatterns: [
      "{region} 기능성베개 고르기 전 확인할 기준",
      "{region} 기능성베개 높이 정할 때 알아둘 점",
    ],
    keywords: ["기능성베개", "경추베개", "베개 높이"],
    compareWith: "맞춤베개",
  },
  {
    id: "custompillow",
    industry: "bedding",
    name: "맞춤베개",
    cat: "베개·매트리스",
    emoji: "📐",
    titlePatterns: [
      "{region} 맞춤베개 상담 전 확인사항",
      "{region} 맞춤베개 알아두면 좋은 점",
    ],
    keywords: ["맞춤베개", "베개 상담", "베개 측정"],
    compareWith: "기능성베개",
  },
  {
    id: "mattress",
    industry: "bedding",
    name: "매트리스",
    cat: "베개·매트리스",
    emoji: "🛏️",
    titlePatterns: [
      "{region} 매트리스 고르기 전 확인할 기준",
      "{region} 매트리스 경도 정할 때 알아둘 점",
    ],
    keywords: ["매트리스", "매트리스 경도", "매트리스 소재"],
    compareWith: "토퍼",
  },
  {
    id: "topper",
    industry: "bedding",
    name: "토퍼",
    cat: "베개·매트리스",
    emoji: "🧊",
    titlePatterns: [
      "{region} 토퍼 소재에 따라 달라지는 점",
      "{region} 토퍼 추가 전 확인할 기준",
    ],
    keywords: ["토퍼", "매트리스 토퍼", "토퍼 두께"],
    compareWith: "매트리스",
  },
  {
    id: "coolingpad",
    industry: "bedding",
    name: "냉감패드",
    cat: "계절침구",
    emoji: "🧊",
    titlePatterns: [
      "{region} 냉감패드 고르기 전 확인할 기준",
      "{region} 냉감패드 매트리스와 함께 쓸 때 알아둘 점",
    ],
    keywords: ["냉감패드", "쿨링패드", "여름 매트리스 패드"],
    compareWith: "냉감침구",
  },
  {
    id: "iupillow",
    industry: "bedding",
    name: "아이유베개",
    cat: "베개·매트리스",
    emoji: "💜",
    titlePatterns: [
      "{region} 아이유베개 고르기 전 확인할 기준",
      "{region} 아이유베개 높이 정할 때 알아둘 점",
    ],
    keywords: ["아이유베개", "베개 높이", "기능성 베개"],
    compareWith: "기능성베개",
  },
];

// 매장 메타 (화자 고정용)
export const BEDDING_META = {
  industry: "bedding",
  brand: "이브자리",
  storeDefault: "용인점",
  label: "이브자리 침구",
};

export default BEDDING_TREATMENTS;
