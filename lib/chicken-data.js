// chicken-data.js — 치킨 블로그 생성기 데이터 v1.0 (Chicken Engine 독립)
//   · Japanese Engine 복사 베이스 (cat 4계열·12메뉴)
//   · cat SoT: fried(순수튀김)·seasoned(소스결)·oven(구운결)·special(구성형)
//   · titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   · 효능·관용 표현 금지 (BLOCK_MAP.efficacy)
//   · 매장명 본문 비노출 (PHILOSOPHY 원칙1)
// ============================================================

// ─────────────────────────────────────────────────────────
// CATS — 치킨 4계열 (계열 구분 = taste·차단어 분기 SoT)
//   조리법 기준 (부위는 메뉴 속성, cat 아님)
// ─────────────────────────────────────────────────────────
export const CHICKEN_CATS = [
  '전체',
  'fried',     // 후라이드 — 순수 튀김결
  'seasoned',  // 양념·간장·마늘·허니·고추 — 소스결
  'oven',      // 오븐·로스트 — 구운결
  'special',   // 순살·반반·닭강정·윙봉세트 — 구성형
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리)
// ─────────────────────────────────────────────────────────
export const CHICKEN_REGIONS = [
  '구리',
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 치킨 12메뉴 (fried·seasoned·oven·special 4계열)
// ─────────────────────────────────────────────────────────
export const CHICKEN_MENUS = {
  fried: [
    '후라이드치킨',
  ],
  seasoned: [
    '양념치킨', '간장치킨', '마늘치킨', '허니치킨', '고추치킨',
  ],
  oven: [
    '오븐치킨', '로스트치킨',
  ],
  special: [
    '순살치킨', '반반치킨', '닭강정', '윙봉세트',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
//   14필드 (japanese 동형): genericName/altGenericNames/motive/tasteCore/
//   sceneCore/hook/keyword/servingUnit/priceFeel/tableware/sidedishes/timeOfDay
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ── fried 계열 (순수 튀김결·겉바속촉) ──
  '후라이드치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '갓 튀긴 후라이드 한 마리 하고 싶어서',
    tasteCore: '바삭한 튀김옷과 속살의 육즙, 소금·후추 간만으로 살린 담백함',
    sceneCore: '갓 튀겨 김이 오르는 치킨이 종이 위에 담겨 나오는 풍경',
    hook: '한 조각 집어 베어 무니 튀김옷이 바스락 부서졌어요',
    keyword: '후라이드치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 소금, 케첩',
    sidedishes: ['치킨무', '소금', '케첩'],
    timeOfDay: ['점심', '저녁', '야식'],
  },

  // ── seasoned 계열 (소스결·코팅·매콤달콤) ──
  '양념치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '매콤달콤한 양념치킨 한 마리 하고 싶어서',
    tasteCore: '튀긴 치킨에 입혀진 매콤달콤한 양념, 코팅된 소스의 윤기',
    sceneCore: '붉은 양념이 고루 입혀진 치킨이 접시에 담겨 나오는 풍경',
    hook: '한 조각 집으니 양념이 손끝에 끈적하게 묻어났어요',
    keyword: '양념치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '간장치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '짭조름한 간장치킨 한 마리 하고 싶어서',
    tasteCore: '간장 베이스 소스의 짭조름함과 단맛, 마늘 향이 밴 윤기',
    sceneCore: '진한 갈색 소스가 입혀진 치킨에 다진 마늘이 올라간 풍경',
    hook: '한 조각 베어 무니 간장 소스가 달큰하게 배어 있었어요',
    keyword: '간장치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '마늘치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '마늘 향 가득한 마늘치킨 한 마리 하고 싶어서',
    tasteCore: '다진 마늘과 간장 소스의 조합, 알싸하면서 달큰한 코팅',
    sceneCore: '다진 마늘이 듬뿍 올라간 치킨이 접시에 담겨 나오는 풍경',
    hook: '한 조각 집으니 마늘 향이 확 올라왔어요',
    keyword: '마늘치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '허니치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '달콤한 허니치킨 한 마리 하고 싶어서',
    tasteCore: '꿀과 버터 베이스의 달콤한 소스, 바삭함 위에 입혀진 윤기',
    sceneCore: '윤기 도는 꿀 소스가 입혀진 치킨이 접시에 담겨 나오는 풍경',
    hook: '한 조각 베어 무니 달콤한 소스가 입안에 퍼졌어요',
    keyword: '허니치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '고추치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '얼큰한 고추치킨 한 마리 하고 싶어서',
    tasteCore: '청양고추와 매운 소스의 얼큰함, 바삭함 위에 입혀진 칼칼함',
    sceneCore: '붉은 고추 소스에 청양고추가 올라간 치킨이 담겨 나오는 풍경',
    hook: '한 조각 베어 무니 칼칼한 매운맛이 뒤따라왔어요',
    keyword: '고추치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },

  // ── oven 계열 (구운결·기름기 적은) ──
  '오븐치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '기름기 적은 오븐치킨 한 마리 하고 싶어서',
    tasteCore: '오븐에 구워 겉은 노릇하고 속은 촉촉한 살, 기름에 튀기지 않은 담백함',
    sceneCore: '노릇하게 구워진 치킨이 오븐 트레이째 나오는 풍경',
    hook: '한 조각 집어 보니 기름기 없이 노릇하게 구워져 있었어요',
    keyword: '오븐치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 머스터드',
    sidedishes: ['치킨무', '머스터드'],
    timeOfDay: ['점심', '저녁'],
  },
  '로스트치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '통째로 구운 로스트치킨 하고 싶어서',
    tasteCore: '통닭을 천천히 구워낸 살의 결, 허브와 소금으로 간한 담백한 풍미',
    sceneCore: '통째로 노릇하게 구워진 닭이 도마째 나오는 풍경',
    hook: '다리 한쪽을 뜯으니 살이 결대로 부드럽게 떨어졌어요',
    keyword: '로스트치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 제대로 시키기 좋은',
    tableware: '치킨 접시, 무, 머스터드',
    sidedishes: ['치킨무', '머스터드'],
    timeOfDay: ['점심', '저녁'],
  },

  // ── special 계열 (구성형·부위/조합 중심) ──
  '순살치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '뼈 없이 편한 순살치킨 한 마리 하고 싶어서',
    tasteCore: '뼈 없이 한입 크기로 썬 살, 바삭한 튀김옷과 부드러운 속살',
    sceneCore: '한입 크기 순살이 수북이 담겨 나오는 풍경',
    hook: '뼈가 없으니 한 조각씩 편하게 집어 먹게 됐어요',
    keyword: '순살치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 편하게 시키기 좋은',
    tableware: '치킨 접시, 무, 포크',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '반반치킨': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '두 가지 맛 반반치킨 하고 싶어서',
    tasteCore: '후라이드와 양념을 반씩 나눠 한 번에 즐기는 구성, 맛 비교의 재미',
    sceneCore: '접시 반은 후라이드 반은 양념으로 나뉘어 담겨 나오는 풍경',
    hook: '한쪽은 바삭하게 한쪽은 매콤하게, 번갈아 집어 먹었어요',
    keyword: '반반치킨',
    servingUnit: '한 마리',
    priceFeel: '한 마리 골고루 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
  '닭강정': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '한입 크기 닭강정 하고 싶어서',
    tasteCore: '한입 크기로 튀겨 달콤한 강정 소스에 버무린 쫀득한 식감',
    sceneCore: '작은 크기로 소스에 버무려진 강정이 컵이나 그릇에 담겨 나오는 풍경',
    hook: '한 알 집어 먹으니 겉은 쫀득하고 속은 부드러웠어요',
    keyword: '닭강정',
    servingUnit: '한 컵',
    priceFeel: '간편하게 한 컵 하기 좋은',
    tableware: '강정 컵, 이쑤시개',
    sidedishes: ['이쑤시개', '콜라'],
    timeOfDay: ['점심', '저녁', '간식'],
  },
  '윙봉세트': {
    genericName: '치킨집',
    altGenericNames: ['치킨 전문점', '가게', '여기'],
    motive: '윙과 봉만 모은 윙봉세트 하고 싶어서',
    tasteCore: '윙과 봉 부위만 모아 한입에 뜯기 좋은 크기, 손에 들고 먹는 재미',
    sceneCore: '윙과 봉이 가득 담겨 나오는 풍경',
    hook: '윙 하나 들고 한입에 뜯으니 손에 들고 먹기 딱 좋았어요',
    keyword: '윙봉세트',
    servingUnit: '한 세트',
    priceFeel: '한 세트 시키기 좋은',
    tableware: '치킨 접시, 무, 물티슈',
    sidedishes: ['치킨무', '콜라'],
    timeOfDay: ['점심', '저녁', '야식'],
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS
// ─────────────────────────────────────────────────────────
export const CHICKEN_SITUATIONS = [
  '혼밥',
  '야식',
  '포장',
  '가족 외식',
  // 1단계 검증 후 확장:
  // '회식', '배달', '주말', '모임',
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정 (효능표현 없음)
// ─────────────────────────────────────────────────────────
export const SITUATION_OVERRIDES = {
  '혼밥': {
    motiveExtra: '혼자 한 끼 가볍게 해결하러',
    tasteExtra: '혼자라 한 마리는 많아 순살이나 반 마리로 시켰어요',
    sceneExtra: '혼자 와서 작은 테이블에 앉아 먹는 손님 분위기',
    hookExtra: '혼자 먹기 좋게 양을 조절해 주문할 수 있어서 편했어요',
    flowBias: 'arrive',
  },
  '야식': {
    motiveExtra: '늦은 밤 출출해서 야식으로',
    tasteExtra: '야식으로 먹기 좋게 양념이 진하고 든든했어요',
    sceneExtra: '늦은 시간 포장이나 배달을 기다리는 손님이 오가는 분위기',
    hookExtra: '늦게까지 영업해서 야식 생각날 때 들르기 좋았어요',
    flowBias: 'taste',
  },
  '포장': {
    motiveExtra: '집에서 먹으려고 포장하러',
    tasteExtra: '포장이라 눅을까 했는데 소스를 따로 담아주셔서 괜찮았어요',
    sceneExtra: '포장 손님이 카운터 앞에서 기다리는 풍경',
    hookExtra: '포장 주문하고 잠깐 기다리니 따끈하게 담아주셨어요',
    flowBias: 'order',
  },
  '가족 외식': {
    motiveExtra: '가족끼리 여러 맛 나눠 먹으러',
    tasteExtra: '반반이나 두 마리로 시켜 골고루 나눠 먹기 좋은 구성',
    sceneExtra: '4인 이상 둘러앉아 치킨을 나눠 먹는 분위기',
    hookExtra: '맛을 나눠 시키니 각자 좋아하는 부위를 골라 먹었어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적
// ─────────────────────────────────────────────────────────
export const CHICKEN_PURPOSES = [
  '혼밥',
  '가족모임',
  '친구',
  '간단히',
];

// ─────────────────────────────────────────────────────────
// PURPOSE_OVERRIDES — 목적별 톤 보정
// ─────────────────────────────────────────────────────────
export const PURPOSE_OVERRIDES = {
  '혼밥': {
    sceneExtra: '혼자 와서 부담 없이 먹는 분위기',
    tableExtra: '1인석 또는 작은 2인 테이블',
    paceExtra: '식사 시간 20~30분 정도, 빠르게 먹고 나옴',
  },
  '가족모임': {
    sceneExtra: '4인 이상 모여 치킨을 나눠 먹기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블',
    paceExtra: '식사 시간 1시간 안팎, 두 마리·반반 골고루 시켜 천천히',
    extraDetail: '아이가 먹기 좋은 메뉴(순살·닭강정)인지 1줄 언급',
  },
  '친구': {
    sceneExtra: '친구랑 마주 앉아 치킨에 음료 곁들여 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블',
    paceExtra: '식사 시간 40분~1시간, 사이드 곁들여 나눠 먹음',
  },
  '간단히': {
    sceneExtra: '오래 머물기보다 빠르게 먹거나 포장해 가는 분위기',
    tableExtra: '1~2인 자리 또는 포장 위주',
    paceExtra: '식사 시간 20~30분, 간단히 먹거나 포장',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 가상 매장 1개 (검증용 / 본문 노출 금지)
//   ⚠ 실제 치킨 매장 데이터 확보 전 OWNER 생성 검증용 (SOP STEP4)
//   ⚠ 매장명·brandName 필드 없음 — genericName(placeholder)만 사용
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_chicken_01',
    region: '구리',
    cat: 'fried',
    representativeMenu: '후라이드치킨',
    menus: ['후라이드치킨', '양념치킨', '순살치킨'],
  },
  // 실매장 확보 후 확장
];

export function getStoresByRegion(region) {
  return STORE_PROFILES.filter(s => s.region === region);
}

export function getStoreById(storeId) {
  return STORE_PROFILES.find(s => s.storeId === storeId) || null;
}

// ─────────────────────────────────────────────────────────
// buildDirection — 하이브리드 merge (japanese-data 시그니처 동형)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) {
    return {
      genericName: '치킨집',
      motive: '근처에서 치킨 한 마리 하러',
      tasteCore: '기본적인 치킨 느낌',
      sceneCore: '동네 치킨집 분위기',
      hook: '문 열고 들어가니 익숙한 치킨집 풍경이었어요',
      keyword: '치킨',
      priceFeel: '부담 없이 한 마리 하기 좋은',
      servingUnit: '한 마리',
      situation: situation || '',
      purpose: purpose || '',
      flowBias: '',
      isSideMenu: false,
      representativeMenu: '',
    };
  }

  const sitOvr = (situation && SITUATION_OVERRIDES[situation]) || {};
  const purOvr = (purpose && PURPOSE_OVERRIDES[purpose]) || {};

  const motive = sitOvr.motiveExtra
    ? `${base.motive}. ${sitOvr.motiveExtra}`
    : base.motive;

  const hook = sitOvr.hookExtra || base.hook;

  const tasteCore = sitOvr.tasteExtra
    ? `${base.tasteCore} — ${sitOvr.tasteExtra}`
    : base.tasteCore;

  let sceneCore = base.sceneCore;
  if (sitOvr.sceneExtra) sceneCore += `. ${sitOvr.sceneExtra}`;
  if (purOvr.sceneExtra) sceneCore += `. ${purOvr.sceneExtra}`;

  const isSideMenu = !!(store && store.representativeMenu && store.representativeMenu !== menu);
  const representativeMenu = (store && store.representativeMenu) || '';

  return {
    genericName: base.genericName,
    altGenericNames: base.altGenericNames || [],
    motive,
    tasteCore,
    sceneCore,
    hook,
    keyword: base.keyword,
    priceFeel: base.priceFeel || '',
    servingUnit: base.servingUnit || '한 마리',
    tableware: base.tableware,
    sidedishes: base.sidedishes,
    timeOfDay: base.timeOfDay,
    situation: situation || '',
    purpose: purpose || '',
    tableExtra: purOvr.tableExtra || '',
    paceExtra: purOvr.paceExtra || '',
    extraDetail: purOvr.extraDetail || '',
    flowBias: sitOvr.flowBias || '',
    isSideMenu,
    representativeMenu,
  };
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS — index.js 메뉴 감지용
// ─────────────────────────────────────────────────────────
export const CHICKEN_SITE_KEYWORDS = [
  '후라이드치킨', '양념치킨', '간장치킨', '마늘치킨', '허니치킨', '고추치킨',
  '오븐치킨', '로스트치킨', '순살치킨', '반반치킨', '닭강정', '윙봉세트',
  // SEO 단순형
  '후라이드', '양념', '간장', '마늘', '허니', '고추', '순살', '반반', '치킨', '닭',
  // 상황·목적
  '혼밥', '야식', '포장', '가족 외식', '가족모임', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 치킨 조합 카드 (검증용 가상 매장 1개 × 전체 12메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ 실매장 확보 시 storeId 교체/추가만 — 카드 구조 무변경
//   ⚠ CHICKEN_MENUS 12개와 1:1 정합 (OWNER 검증 완전성)
//   ⚠ titlePatterns placeholder {situation}/{purpose} ↔ generate 치환체인 1:1 정합
// ─────────────────────────────────────────────────────────
export const CHICKEN_TREATMENTS = [
  // ── fried 계열 ──
  {
    id: 'rest_chicken_fried_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '후라이드치킨',
    cat: 'fried',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 후라이드치킨',
      '구리 후라이드 맛집',
      '구리 치킨',
      '구리 후라이드',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 후라이드',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '후라이드치킨',
    catRef: 'fried',
    isRepresentative: true,
  },

  // ── seasoned 계열 ──
  {
    id: 'rest_chicken_yangnyeom_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '양념치킨',
    cat: 'seasoned',
    name: '이 치킨집',
    emoji: '🌶️',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 양념치킨',
      '구리 양념 맛집',
      '구리 치킨',
      '구리 양념',
      '구리 치킨 배달',
    ],
    compareWith: '동일 지역 다른 치킨집 양념',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '양념치킨',
    catRef: 'seasoned',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_ganjang_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '간장치킨',
    cat: 'seasoned',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 간장치킨',
      '구리 간장 맛집',
      '구리 치킨',
      '구리 간장',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 간장',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '간장치킨',
    catRef: 'seasoned',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_garlic_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '마늘치킨',
    cat: 'seasoned',
    name: '이 치킨집',
    emoji: '🧄',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 마늘치킨',
      '구리 마늘 맛집',
      '구리 치킨',
      '구리 마늘',
      '구리 치킨 배달',
    ],
    compareWith: '동일 지역 다른 치킨집 마늘',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '마늘치킨',
    catRef: 'seasoned',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_honey_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '허니치킨',
    cat: 'seasoned',
    name: '이 치킨집',
    emoji: '🍯',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 허니치킨',
      '구리 허니 맛집',
      '구리 치킨',
      '구리 허니',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 허니',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '허니치킨',
    catRef: 'seasoned',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_gochu_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '고추치킨',
    cat: 'seasoned',
    name: '이 치킨집',
    emoji: '🌶️',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 고추치킨',
      '구리 매운치킨',
      '구리 치킨',
      '구리 고추',
      '구리 치킨 배달',
    ],
    compareWith: '동일 지역 다른 치킨집 고추',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '고추치킨',
    catRef: 'seasoned',
    isRepresentative: false,
  },

  // ── oven 계열 ──
  {
    id: 'rest_chicken_oven_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '오븐치킨',
    cat: 'oven',
    name: '이 치킨집',
    emoji: '🔥',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 오븐치킨',
      '구리 오븐구이',
      '구리 치킨',
      '구리 오븐',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 오븐',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '오븐치킨',
    catRef: 'oven',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_roast_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '로스트치킨',
    cat: 'oven',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 로스트치킨',
      '구리 통닭',
      '구리 치킨',
      '구리 로스트',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 로스트',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '로스트치킨',
    catRef: 'oven',
    isRepresentative: false,
  },

  // ── special 계열 ──
  {
    id: 'rest_chicken_sunsal_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '순살치킨',
    cat: 'special',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 순살치킨',
      '구리 순살 맛집',
      '구리 치킨',
      '구리 순살',
      '구리 치킨 배달',
    ],
    compareWith: '동일 지역 다른 치킨집 순살',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '순살치킨',
    catRef: 'special',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_banban_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '반반치킨',
    cat: 'special',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 반반치킨',
      '구리 반반 맛집',
      '구리 치킨',
      '구리 반반',
      '구리 치킨 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 반반',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '반반치킨',
    catRef: 'special',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_gangjeong_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '닭강정',
    cat: 'special',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 닭강정',
      '구리 닭강정 맛집',
      '구리 치킨',
      '구리 강정',
      '구리 닭강정 포장',
    ],
    compareWith: '동일 지역 다른 치킨집 닭강정',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '닭강정',
    catRef: 'special',
    isRepresentative: false,
  },
  {
    id: 'rest_chicken_wingbong_guri_01',
    storeId: 'store_guri_chicken_01',
    industry: 'chicken',
    region: '구리',
    menu: '윙봉세트',
    cat: 'special',
    name: '이 치킨집',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 윙봉세트',
      '구리 윙봉',
      '구리 치킨',
      '구리 윙',
      '구리 치킨 배달',
    ],
    compareWith: '동일 지역 다른 치킨집 윙봉',
    nearbyHint: '구리역 근처 치킨 거리',
    menuRef: '윙봉세트',
    catRef: 'special',
    isRepresentative: false,
  },
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const CHICKEN_META = {
  industry: 'chicken',
  label: '치킨',
  greeting: '어떤 치킨 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 후라이드치킨 야식 메뉴 정보',
    '구리 양념치킨 가족 외식 메뉴 안내',
    '구리 순살치킨 포장 메뉴 정리',
    '구리 닭강정 친구 메뉴 정보',
  ],
  badge: '🍗',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const CHICKEN_LONGTAIL_SUFFIXES = {
  // fried·seasoned·special 메인
  chicken_main: [
    '메뉴 정보 정리',
    '야식 메뉴 안내',
    '포장 정보 안내',
    '배달 메뉴 정리',
  ],
  // oven·사이드
  chicken_side: [
    '곁들임 메뉴 정리',
    '세트 구성 안내',
    '가족 외식 메뉴 안내',
    '메뉴 구성 정보',
  ],
  default: [
    '메뉴 정보 정리',
    '방문 정보 안내',
    '운영 정보 정리',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — chicken ↔ 의료·카페·한식/분식/중식/일식 narrative·광고 차단
//   ⚠ 타 외식 결(뚝배기·춘장·회 한 점 등) 침투 차단
//   ⚠ 계열 교차차단(crossCat)은 prompts/playConfig에서 cat별 적용
// ─────────────────────────────────────────────────────────
export const CHICKEN_BLOCK_MAP = {
  medical: [
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '상담실', '진료실', '원장님', '의사', '간호사', '병원',
    '회차', '경과', '붓기', '멍', '처방',
  ],
  cafe: [
    '카공', '작업카페', '스터디카페', '디저트카페', '브런치 카페',
    '루프탑 카페', '콘센트 자리', '노트북 거치',
    '라떼아트', '드립커피', '에스프레소 머신',
  ],
  study: [
    '독서실', '공부하기 좋은', '집중하기 좋은', '학습', '인강',
  ],
  ad: [
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
  ],
  // 한식 narrative 침투 차단 (Chicken 독립 ecosystem 유지)
  korean: [
    '뚝배기', '새우젓', '들깨가루', '머릿고기', '우거지', '선지',
    '해장국', '순대국', '공깃밥', '어묵국물',
  ],
  // 중식 narrative 침투 차단
  chinese: [
    '춘장', '짜장', '짬뽕', '탕수육', '깐풍기', '유린기',
    '양장피', '팔보채', '유산슬', '동파육', '꽃빵',
  ],
  // 일식 narrative 침투 차단
  japanese: [
    '회 한 점', '사시미', '초밥', '간장 종지', '고추냉이', '절임 생강',
    '육수를 우려', '차슈', '와사비',
  ],
  // 효능·관용 표현 차단 (PHILOSOPHY — 효능 단정 금지)
  efficacy: [
    '해장', '속풀이', '몸보신', '숙취해소', '건강에 좋', '기력 회복', '단백질 보충',
  ],
};

// ─────────────────────────────────────────────────────────
// CROSS_CAT_BLOCK — 계열 간 표현 교차차단 (taste 묘사 충돌 방지)
//   각 cat에서 "다른 계열의 핵심 표현"을 차단어로 적용.
//   prompts/generate에서 treatment.cat 기준으로 선택 적용.
//   ⚠ 메뉴 자체 명칭은 제외 (혼합 매장 본문에서 메뉴명 언급은 정상)
//     → 묘사 결(소스 코팅·구운 결·튀김옷 등)만 차단
// ─────────────────────────────────────────────────────────
export const CHICKEN_CROSS_CAT_BLOCK = {
  fried: [
    // seasoned 소스결 차단 (fried는 순수 튀김·담백 중심)
    '양념이 배어', '매콤달콤', '소스가 코팅', '소스에 버무', '끈적',
  ],
  seasoned: [
    // fried 순수튀김결 + oven 구운결 차단 (seasoned는 소스 코팅 중심)
    '튀김옷만', '담백한 튀김', '기름기 없이 구운', '오븐에 구워',
  ],
  oven: [
    // fried/seasoned 튀김결 차단 (oven은 구운결·기름기 적음 중심)
    '튀김옷', '바삭하게 튀긴', '기름에 튀겨', '소스가 코팅',
  ],
  special: [
    // 조리법 단정 차단 (구성형이라 결 혼재 가능 — 최소만)
    '통째로 구운', '육수를 우려',
  ],
};

// ─────────────────────────────────────────────────────────
// TITLE 풀 (commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열은 data 소유)
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}`
// ─────────────────────────────────────────────────────────
export const CHICKEN_TITLE_MIDDLE = [
  // 선택형(검색자 의도) 위주 + 정보형 일부. 조립: `{region} {menu} {mid}｜{suf}`
  '어떤 맛이 특징일까', '메뉴 특징 정리', '선택 포인트', '어떤 메뉴일까',
  '알아두면 좋은 내용', '메뉴 특징', '한눈에 보기', '알아보기',
  '기본 정보', '메뉴 구성', '특징 정리', '메뉴 정보',
];

export const CHICKEN_TITLE_SUFFIX = [
  // ｜뒤 슬롯: mid 풀과 겹치지 않는 방문/정보형 고유어만 (동어반복 mid=suf 방지)
  '선택 전 참고', '방문 전 참고', '주문 전 참고', '방문 전 체크',
  '일반 정보', '참고 내용', '메뉴 살펴보기', '메뉴 알아보기',
  '주문 참고', '방문 참고', '메뉴 한눈에', '간단 정리',
];

// 메뉴별 SCENE 풀 (MIDDLE 자리에 확률적 치환 — 메뉴 매칭 시만)
//   키: 정확한 메뉴명. 미매칭 시 CHICKEN_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
//   ★ 카테고리어('치킨') 미포함 유지 — 세션6 발견 A(menu+SCENE 중복) 방지.
export const CHICKEN_TITLE_SCENE = {
  '후라이드치킨': ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '양념치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '간장치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '마늘치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '허니치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '고추치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '오븐치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '로스트치킨':   ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '순살치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '반반치킨':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '닭강정':       ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
  '윙봉세트':     ['어떤 맛이 특징일까', '선택 포인트', '한눈에 보기'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값(fried/seasoned/oven/special) 기준
export const CHICKEN_TITLE_SCENE_BY_CATEGORY = {
  'fried':    ['어떤 맛이 특징일까', '선택 포인트', '메뉴 특징 정리'],
  'seasoned': ['어떤 맛이 특징일까', '선택 포인트', '메뉴 특징 정리'],
  'oven':     ['어떤 맛이 특징일까', '선택 포인트', '메뉴 특징 정리'],
  'special':  ['어떤 맛이 특징일까', '선택 포인트', '메뉴 특징 정리'],
};
