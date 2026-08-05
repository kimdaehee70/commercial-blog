// lib/flower-data.js
// 꽃배달 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 플로리스트/꽃집 운영자. 정보형·안내형. 감성에세이·후기체·시(詩)·감동스토리 금지.
// 복사 베이스: daycare-data.js → 데이터 교체

export const FLOWER_META = {
  industry: "flower",
  label: "꽃배달",
  fullLabel: "꽃배달(플라워샵)",
  greeting: "안녕하세요. {region} 꽃집입니다. 화환·화분·꽃다발 배송 안내를 도와드립니다.",
  voice: "플로리스트(꽃집 운영자)",
  badge: "신규",
  // 결정주기: 즉시주문형 (부고/개업/생일 — 30분~1일)
  decisionCycle: "instant",
  // ★ 가격 단정 금지 — 상품·크기·배송지역·시즌(졸업/입학)에 따라 변동 → "주문 시 안내" 톤
  costTone: "consult", // 세부 금액 확정 표기 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 광고형은 prompts.js COMMON_AD_FORBIDDEN가 별도 담당. 여기는 업종 고유 + 감성/후기 차단.
export const FLOWER_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건",
  // 가격 단정 차단
  "확정 가격", "정확한 금액 보장",
  // 감성에세이·시·감동스토리 어휘 차단 (톤 1차 방어)
  "설렘", "벅찬", "눈물", "감동의", "마음을 전하는 시", "사랑이 피어나",
  "그대에게", "당신의 마음",
];

// 카테고리 탭 (메뉴 7개)
export const FLOWER_CATS = [
  "근조화환",
  "축하화환",
  "개업화분",
  "꽃바구니",
  "꽃다발",
  "동양란",
  "서양란",
];

// ★ 상품 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword) — 없으면 GPT가 전부 같은 방향으로 씀
export const FLOWER_TREATMENTS = [
  {
    id: "flower_funeral_wreath",
    industry: "flower",
    name: "근조화환",
    cat: "근조화환",
    emoji: "🕊️",
    titlePatterns: [
      "{funeralName} 근조화환 당일배송 안내",
      "{funeralName} 화환 보내실 때 확인사항",
      "{region} 근조화환 가격과 배송시간 안내",
    ],
    keywords: ["근조화환", "장례식장 화환", "근조화환 당일배송", "삼단화환"],
    compareWith: "근조화분",
    DIRECTION: {
      concern: "부고 연락을 받고 어느 장례식장에 언제까지 화환이 도착할지 급하게 알아봄",
      effect: "장례식장 배송 가능 시간·화환 종류(삼단/이단)·리본 문구 작성 방법을 안내",
      hook: "부고 소식을 갑자기 받으시면 화환을 언제까지 보내야 할지 막막하실 텐데요",
      keyword: "근조화환",
    },
  },
  {
    id: "flower_congrat_wreath",
    industry: "flower",
    name: "축하화환",
    cat: "축하화환",
    emoji: "🎉",
    titlePatterns: [
      "{region} 개업축하화환 보내실 때 확인사항",
      "{region} 축하화환 당일배송 가능한 경우",
      "이전·승진 축하화환 어떤 종류가 좋을까요",
    ],
    keywords: ["개업화환", "개업축하화환", "이전축하화환", "축하화환 배송"],
    compareWith: "개업화분",
    DIRECTION: {
      concern: "개업·이전·승진 소식을 듣고 어떤 화환을 언제 보내야 할지 고민",
      effect: "상황별(개업/이전/승진) 화환 종류·리본 문구·배송 시점 기준을 안내",
      hook: "개업이나 승진 소식을 들으시면 어떤 화환이 적절할지 궁금하실 텐데요",
      keyword: "축하화환",
    },
  },
  {
    id: "flower_open_plant",
    industry: "flower",
    name: "개업화분",
    cat: "개업화분",
    emoji: "🪴",
    titlePatterns: [
      "{region} 개업화분 어떤 종류가 좋을까요",
      "{bizType} 개업화분 추천 기준 안내",
      "{region} 개업선물 화분 선택방법",
    ],
    keywords: ["개업화분", "개업화분 추천", "카페 개업화분", "병원 개업선물"],
    compareWith: "축하화환",
    DIRECTION: {
      concern: "개업하는 곳 업종에 맞는 화분이 무엇인지, 어느 정도 크기가 적절한지 모름",
      effect: "공간(사무실·식당·병원·카페)별 화분 종류·크기·관리 난이도 기준을 안내",
      hook: "개업 선물로 화분을 고르실 때 어떤 종류가 맞을지 고민되실 텐데요",
      keyword: "개업화분",
    },
  },
  {
    id: "flower_basket",
    industry: "flower",
    name: "꽃바구니",
    cat: "꽃바구니",
    emoji: "🧺",
    titlePatterns: [
      "{region} 꽃바구니 당일배송 가능한 경우",
      "생일 꽃바구니 주문 전 확인사항",
      "꽃바구니 가격 차이가 나는 이유",
    ],
    keywords: ["생일 꽃바구니", "꽃바구니 가격", "당일 꽃배달", "꽃바구니 주문"],
    compareWith: "꽃다발",
    DIRECTION: {
      concern: "생일·기념일 당일에 꽃바구니를 보낼 수 있는지, 가격대가 어떻게 나뉘는지",
      effect: "당일배송 가능 조건·꽃 종류·크기별 가격 구성 기준을 단정 없이 안내",
      hook: "생일 당일에 꽃바구니를 보내실 수 있을지 궁금하실 텐데요",
      keyword: "꽃바구니",
    },
  },
  {
    id: "flower_bouquet",
    industry: "flower",
    name: "꽃다발",
    cat: "꽃다발",
    emoji: "💐",
    titlePatterns: [
      "졸업식 꽃다발 예약 시기 안내",
      "{region} 꽃다발 당일주문 가능할까요",
      "꽃다발 선택 기준 알아보기",
    ],
    keywords: ["졸업식 꽃다발", "입학식 꽃다발", "꽃다발 예약", "꽃다발 주문"],
    compareWith: "꽃바구니",
    DIRECTION: {
      concern: "졸업식·입학식 시즌에 꽃다발을 언제 예약해야 하는지, 당일도 가능한지",
      effect: "행사 시즌 예약 시기·꽃 종류·크기별 선택 기준을 안내",
      hook: "졸업·입학 시즌에는 꽃다발 예약 시기를 놓치기 쉬운데요",
      keyword: "꽃다발",
    },
  },
  {
    id: "flower_orchid_eastern",
    industry: "flower",
    name: "동양란",
    cat: "동양란",
    emoji: "🌿",
    titlePatterns: [
      "{region} 승진 축하 동양란 안내",
      "취임 선물 동양란 어떤 게 좋을까요",
      "{region} 동양란 배송 전 확인사항",
    ],
    keywords: ["승진 축하 동양란", "취임 선물 동양란", "동양란 배송", "축하 동양란"],
    compareWith: "서양란",
    DIRECTION: {
      concern: "승진·취임 선물로 동양란이 적절한지, 어떤 품종을 보내야 할지",
      effect: "승진·취임 등 격식 상황별 동양란 품종·리본 문구·관리 기준을 안내",
      hook: "승진이나 취임 선물로 동양란을 고민하실 텐데요",
      keyword: "동양란",
    },
  },
  {
    id: "flower_orchid_western",
    industry: "flower",
    name: "서양란",
    cat: "서양란",
    emoji: "🌸",
    titlePatterns: [
      "{region} 개업 서양란 보내실 때 확인사항",
      "사무실 개업 서양란 추천 기준",
      "{region} 서양란 배달 가능 안내",
    ],
    keywords: ["개업 서양란", "서양란 배달", "사무실 서양란", "서양란 선물"],
    compareWith: "동양란",
    DIRECTION: {
      concern: "개업·사무실 선물로 서양란을 보낼 때 종류와 크기를 어떻게 고를지",
      effect: "개업·사무실 상황별 서양란 품종(호접란 등)·화분 크기·관리 기준을 안내",
      hook: "개업 선물로 서양란을 준비하실 때 어떤 종류가 맞을지 궁금하실 텐데요",
      keyword: "서양란",
    },
  },
];

// 정보블럭 데이터 — generateFlower.js insertInfoBlock에서 소비
export const FLOWER_INFO_BLOCKS = {
  delivery: {
    title: "배송 안내",
    items: [
      "당일배송: 주문 마감 시간 이전 주문 시 가능(지역·상품별 상이)",
      "근조화환: 장례식장 발인 시간 전 도착 기준으로 안내",
      "배송 가능 지역·시간은 주문 시 확인",
    ],
  },
  product: {
    title: "주요 상품",
    items: ["근조화환·축하화환", "개업화분·동양란·서양란", "꽃바구니·꽃다발"],
  },
  price: {
    title: "가격 안내",
    items: [
      "상품 종류·크기·꽃 구성에 따라 가격대가 나뉨",
      "시즌(졸업·입학·명절)에는 가격이 달라질 수 있음",
      "※ 정확한 금액·구성은 주문 시 안내",
    ],
  },
  choice: {
    title: "주문 전 확인 사항",
    items: ["받는 분 상황(부고·개업·생일 등)", "배송지·도착 희망 시간", "리본 문구(화환·화분)", "예산 범위"],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택
export const FLOWER_PHOTO_POOL = [
  { slot: "product", alt: "{region} 꽃집 상품(화환·화분) 사진" },
  { slot: "store", alt: "매장 내부 모습" },
  { slot: "packing", alt: "포장 작업 모습" },
  { slot: "vehicle", alt: "배송 차량" },
  { slot: "work", alt: "꽃 작업 모습" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const FLOWER_COMPARE = {
  compareWith: "근조화분",
  compareWithText2: "축하화환",
};
