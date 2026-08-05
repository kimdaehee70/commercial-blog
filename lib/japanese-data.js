// ============================================================
// lib/japanese-data.js — 일식(일본요리) 독립 엔진 데이터 v1.0
//
// 기반: chinese-data.js 구조 동형 이식 (Restaurant 계열 엔진)
// 작업 기준: Japanese Engine 신규 생성 (B경로 — 독립 엔진)
//   · chinese 데이터 흡수가 아니라 독립 narrative ecosystem (Naver 지침 §3 전략2)
//   · 엔진 4파일 자립 단위: japanese-data / japanese-prompts / japanese-playConfig / generateJapanese
//
// ★ 중식 대비 핵심 차이: cat 4계열 분리 (taste 묘사 충돌 감소 + 계열별 차단어)
//   · sushi  : 초밥·사시미·회덮밥        (신선도·결·간장/고추냉이)
//   · noodle : 라멘·우동·소바           (육수·면 식감·온도)
//   · fried  : 돈카츠·텐푸라·가라아게     (튀김옷·바삭함·소스)
//   · rice   : 규동·가츠동·오야코동·카레  (밥+토핑 조합·소스)
//
// PHILOSOPHY 정합
//   · 매장명 = placeholder only (genericName: '일식당' 등). 본문 노출 0.
//   · 효능·관용 표현 금지 (해장·속풀이·몸보신 등 — BLOCK_MAP.efficacy)
//   · 광고 평가어 금지 (찐맛집·강추·역대급 등)
//   · 정보형(commercial) 기본 — 주인공 = '메뉴'
//   · servingUnit 단위 정합 (초밥=한 접시 / 라멘·우동·소바·덮밥=한 그릇 / 튀김=한 접시)
// ============================================================

// ─────────────────────────────────────────────────────────
// CATS — 일식 4계열 (계열 구분 = taste·차단어 분기 SoT)
// ─────────────────────────────────────────────────────────
export const JAPANESE_CATS = [
  '전체',
  '스시',     // sushi 계열
  '면',       // noodle 계열
  '튀김',     // fried 계열
  '덮밥',     // rice 계열
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리)
// ─────────────────────────────────────────────────────────
export const JAPANESE_REGIONS = [
  '구리',
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 일식 13메뉴 (스시·면·튀김·덮밥 4계열)
// ─────────────────────────────────────────────────────────
export const JAPANESE_MENUS = {
  스시: [
    '초밥', '사시미', '회덮밥',
  ],
  면: [
    '라멘', '우동', '소바',
  ],
  튀김: [
    '돈카츠', '텐푸라', '가라아게',
  ],
  덮밥: [
    '규동', '가츠동', '오야코동', '카레',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
//   ⚠ 각 메뉴의 cat 계열 결을 tasteCore에 반영 (계열 교차 표현 금지)
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ── 스시 계열 (신선도·결·간장/고추냉이) ──
  '초밥': {
    genericName: '일식당',
    altGenericNames: ['스시집', '가게', '여기'],
    motive: '신선한 초밥 한 접시 하고 싶어서',
    tasteCore: '갓 쥔 샤리의 온도, 생선 한 점의 결과 두께, 간장·고추냉이 곁들임',
    sceneCore: '카운터 너머로 초밥을 쥐어 내어주는 풍경, 한 점씩 놓이는 접시',
    hook: '한 점 집어 입에 넣으니 밥이 사르르 풀렸어요',
    keyword: '초밥',
    servingUnit: '한 접시',
    priceFeel: '제대로 한 접시 하기 좋은',
    tableware: '초밥 접시, 간장 종지, 고추냉이, 절임 생강',
    sidedishes: ['간장', '고추냉이', '절임 생강'],
    timeOfDay: ['점심', '저녁'],
  },
  '사시미': {
    genericName: '일식당',
    altGenericNames: ['스시집', '가게', '여기'],
    motive: '신선한 회를 결대로 맛보고 싶어서',
    tasteCore: '두툼하게 썬 생선의 결, 부위별 식감 차이, 간장·고추냉이 곁들임',
    sceneCore: '얼음 위에 가지런히 놓인 회 한 접시, 부위별로 나뉜 구성',
    hook: '한 점 집어 보니 결이 또렷하게 보였어요',
    keyword: '사시미',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '회 접시, 간장 종지, 고추냉이',
    sidedishes: ['간장', '고추냉이', '무채'],
    timeOfDay: ['점심', '저녁'],
  },
  '회덮밥': {
    genericName: '일식당',
    altGenericNames: ['스시집', '가게', '여기'],
    motive: '회와 밥을 한 번에 비벼 먹고 싶어서',
    tasteCore: '신선한 회 조각과 채소, 초고추장에 비벼 먹는 밥의 조합',
    sceneCore: '회와 채소가 밥 위에 올라간 그릇을 비비는 풍경',
    hook: '초고추장 넣고 비비니 회랑 밥이 잘 섞였어요',
    keyword: '회덮밥',
    servingUnit: '한 그릇',
    priceFeel: '간편하게 한 그릇 하기 좋은',
    tableware: '덮밥 그릇, 초고추장, 된장국',
    sidedishes: ['초고추장', '단무지', '된장국'],
    timeOfDay: ['점심', '저녁'],
  },

  // ── 면 계열 (육수·면 식감·온도) ──
  '라멘': {
    genericName: '일식당',
    altGenericNames: ['라멘집', '가게', '여기'],
    motive: '진한 육수의 라멘 한 그릇 하고 싶어서',
    tasteCore: '오래 끓인 진한 육수, 탄력 있는 면, 차슈·반숙 계란·파 토핑',
    sceneCore: '김 오르는 그릇 위에 차슈와 계란이 올라간 풍경, 면을 들어 올리는 장면',
    hook: '육수 한 술 떠 먹고 면을 들어 올렸어요',
    keyword: '라멘',
    servingUnit: '한 그릇',
    priceFeel: '든든하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 렌게(국물 숟가락), 젓가락',
    sidedishes: ['차슈', '반숙 계란', '파', '김치'],
    timeOfDay: ['점심', '저녁'],
  },
  '우동': {
    genericName: '일식당',
    altGenericNames: ['우동집', '가게', '여기'],
    motive: '담백한 국물의 우동 한 그릇 하고 싶어서',
    tasteCore: '가다랑어 육수의 맑은 국물, 굵고 쫄깃한 면, 유부·파 토핑',
    sceneCore: '맑은 국물에서 김이 오르는 그릇, 굵은 면을 들어 올리는 풍경',
    hook: '국물부터 한 술 떠 보니 담백하게 들어왔어요',
    keyword: '우동',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 그릇 하기 좋은',
    tableware: '면 그릇, 렌게, 젓가락',
    sidedishes: ['유부', '파', '튀김 부스러기'],
    timeOfDay: ['점심', '저녁'],
  },
  '소바': {
    genericName: '일식당',
    altGenericNames: ['소바집', '가게', '여기'],
    motive: '메밀면을 츠유에 적셔 먹고 싶어서',
    tasteCore: '메밀 향이 도는 면, 차갑게 낸 면을 츠유에 적셔 먹는 조합',
    sceneCore: '소쿠리에 담긴 면과 츠유 그릇이 따로 놓인 풍경',
    hook: '면을 츠유에 살짝 적셔 한 입 후루룩 넘겼어요',
    keyword: '소바',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 그릇 하기 좋은',
    tableware: '소쿠리, 츠유 그릇, 쪽파·고추냉이',
    sidedishes: ['츠유', '쪽파', '고추냉이', '무즙'],
    timeOfDay: ['점심', '저녁'],
  },

  // ── 튀김 계열 (튀김옷·바삭함·소스) ──
  '돈카츠': {
    genericName: '일식당',
    altGenericNames: ['돈카츠집', '가게', '여기'],
    motive: '바삭한 돈카츠 한 접시 하고 싶어서',
    tasteCore: '두툼한 등심에 입힌 바삭한 튀김옷, 돈카츠 소스와 채 썬 양배추 곁들임',
    sceneCore: '도톰하게 썰린 돈카츠 단면이 보이는 접시, 소스를 끼얹는 풍경',
    hook: '한 조각 베어 무니 튀김옷이 바삭하게 부서졌어요',
    keyword: '돈카츠',
    servingUnit: '한 접시',
    priceFeel: '든든하게 한 접시 하기 좋은',
    tableware: '접시, 돈카츠 소스, 양배추 채, 된장국',
    sidedishes: ['양배추 채', '돈카츠 소스', '된장국', '밥'],
    timeOfDay: ['점심', '저녁'],
  },
  '텐푸라': {
    genericName: '일식당',
    altGenericNames: ['일식당', '가게', '여기'],
    motive: '갓 튀긴 텐푸라를 곁들이고 싶어서',
    tasteCore: '얇고 바삭한 튀김옷, 새우·채소의 식감, 텐츠유에 적셔 먹는 조합',
    sceneCore: '갓 튀겨 나온 텐푸라가 종이 위에 놓인 풍경, 텐츠유에 적시는 장면',
    hook: '갓 나온 걸 텐츠유에 적셔 한 입 베어 물었어요',
    keyword: '텐푸라',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 텐츠유 그릇, 무즙',
    sidedishes: ['텐츠유', '무즙', '소금'],
    timeOfDay: ['점심', '저녁'],
  },
  '가라아게': {
    genericName: '일식당',
    altGenericNames: ['이자카야', '가게', '여기'],
    motive: '바삭한 닭튀김을 곁들이고 싶어서',
    tasteCore: '간장 양념에 재운 닭을 튀긴 바삭한 겉면, 촉촉한 속살, 레몬 곁들임',
    sceneCore: '노릇하게 튀겨진 가라아게가 접시에 담겨 레몬과 함께 나오는 풍경',
    hook: '레몬을 짜 뿌리고 한 조각 집어 먹었어요',
    keyword: '가라아게',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 레몬, 마요네즈',
    sidedishes: ['레몬', '마요네즈', '양배추'],
    timeOfDay: ['점심', '저녁'],
  },

  // ── 덮밥 계열 (밥+토핑 조합·소스) ──
  '규동': {
    genericName: '일식당',
    altGenericNames: ['덮밥집', '가게', '여기'],
    motive: '간편하게 덮밥 한 그릇 하고 싶어서',
    tasteCore: '간장·맛술에 조린 소고기와 양파를 밥 위에 올린 조합, 단짠한 소스',
    sceneCore: '조린 소고기가 밥 위에 수북이 올라온 그릇, 계란 노른자를 올린 풍경',
    hook: '소고기랑 밥을 한 술 같이 떠 먹으니 간이 딱 맞았어요',
    keyword: '규동',
    servingUnit: '한 그릇',
    priceFeel: '간편하게 한 그릇 하기 좋은',
    tableware: '덮밥 그릇, 단무지, 된장국',
    sidedishes: ['단무지', '된장국', '계란'],
    timeOfDay: ['점심', '저녁'],
  },
  '가츠동': {
    genericName: '일식당',
    altGenericNames: ['덮밥집', '가게', '여기'],
    motive: '돈카츠 덮밥을 든든하게 먹고 싶어서',
    tasteCore: '튀긴 돈카츠를 계란으로 덮어 조린 토핑, 밥에 스며든 달짝한 소스',
    sceneCore: '계란에 덮인 돈카츠가 밥 위에 올라간 그릇, 김이 오르는 풍경',
    hook: '계란 입은 돈카츠를 밥이랑 한 술 떠 먹었어요',
    keyword: '가츠동',
    servingUnit: '한 그릇',
    priceFeel: '든든하게 한 그릇 하기 좋은',
    tableware: '덮밥 그릇, 단무지, 된장국',
    sidedishes: ['단무지', '된장국'],
    timeOfDay: ['점심', '저녁'],
  },
  '오야코동': {
    genericName: '일식당',
    altGenericNames: ['덮밥집', '가게', '여기'],
    motive: '부드러운 닭고기 계란 덮밥을 먹고 싶어서',
    tasteCore: '닭고기와 양파를 계란으로 부드럽게 덮어 조린 토핑, 밥에 어우러지는 소스',
    sceneCore: '반숙 계란이 닭고기를 감싼 채 밥 위에 올라간 그릇',
    hook: '부드러운 계란이랑 밥을 한 술 같이 떴어요',
    keyword: '오야코동',
    servingUnit: '한 그릇',
    priceFeel: '간편하게 한 그릇 하기 좋은',
    tableware: '덮밥 그릇, 단무지, 된장국',
    sidedishes: ['단무지', '된장국'],
    timeOfDay: ['점심', '저녁'],
  },
  '카레': {
    genericName: '일식당',
    altGenericNames: ['카레집', '가게', '여기'],
    motive: '진한 일본식 카레 한 그릇 하고 싶어서',
    tasteCore: '걸쭉하게 끓인 일본식 카레 소스, 부드러운 채소와 고기, 밥에 끼얹는 조합',
    sceneCore: '밥 한쪽에 카레 소스를 끼얹어 나오는 그릇, 숟가락으로 섞는 풍경',
    hook: '소스를 밥에 끼얹어 한 술 떠 먹었어요',
    keyword: '카레',
    servingUnit: '한 그릇',
    priceFeel: '간편하게 한 그릇 하기 좋은',
    tableware: '카레 그릇, 숟가락, 후쿠진즈케',
    sidedishes: ['후쿠진즈케', '단무지'],
    timeOfDay: ['점심', '저녁'],
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS — 일식 결 (효능/관용 표현 배제)
// ─────────────────────────────────────────────────────────
export const JAPANESE_SITUATIONS = [
  '혼밥',
  '점심',
  '포장',
  '가족 외식',
  // 1단계 검증 후 확장:
  // '회식', '야식', '주말 점심', '모임',
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정 (효능표현 없음)
// ─────────────────────────────────────────────────────────
export const SITUATION_OVERRIDES = {
  '혼밥': {
    motiveExtra: '혼자 빠르게 한 끼 해결하러',
    tasteExtra: '혼자라서 한 그릇에만 집중할 수 있었어요',
    sceneExtra: '카운터 자리나 작은 테이블에 혼자 앉은 손님들 분위기',
    hookExtra: '혼자 들어갔는데 1인 메뉴가 잘 갖춰져 있어서 편했어요',
    flowBias: 'arrive',
  },
  '점심': {
    motiveExtra: '점심시간에 빠르게 한 끼 하러',
    tasteExtra: '점심에 가볍게 한 그릇 하기 좋은 양과 간',
    sceneExtra: '점심 피크에 직장인 손님이 빠르게 식사하고 가는 분위기',
    hookExtra: '점심시간이라 회전이 빨라서 주문하고 금방 나왔어요',
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
    motiveExtra: '가족끼리 여러 메뉴 나눠 먹으러',
    tasteExtra: '초밥·면·덮밥을 골고루 시켜 나눠 먹기 좋은 구성',
    sceneExtra: '4인 이상 둘러앉아 메뉴를 나눠 먹는 분위기',
    hookExtra: '각자 다른 메뉴를 시켜 한 점씩 나눠 먹으니 편했어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적
// ─────────────────────────────────────────────────────────
export const JAPANESE_PURPOSES = [
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
    sceneExtra: '혼자 와서 한 그릇 부담 없이 먹는 분위기',
    tableExtra: '1인석 또는 작은 2인 테이블, 카운터석',
    paceExtra: '식사 시간 20~30분 정도, 빠르게 먹고 나옴',
  },
  '가족모임': {
    sceneExtra: '4인 이상 모여 메뉴를 나눠 먹기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블',
    paceExtra: '식사 시간 1시간 안팎, 초밥·면·덮밥 골고루 시켜 천천히',
    extraDetail: '아이가 먹기 좋은 메뉴(우동·가츠동·카레)인지 1줄 언급',
  },
  '친구': {
    sceneExtra: '친구랑 마주 앉아 메뉴 하나씩 나눠 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블',
    paceExtra: '식사 시간 40분~1시간, 메뉴에 사이드 곁들여 나눠 먹음',
  },
  '간단히': {
    sceneExtra: '오래 머물기보다 한 그릇 빠르게 먹고 가는 분위기',
    tableExtra: '1~2인 자리 또는 포장 위주',
    paceExtra: '식사 시간 20~30분, 간단히 먹거나 포장',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 가상 매장 1개 (검증용 / 본문 노출 금지)
//   ⚠ 실제 일식 매장 데이터 확보 전 OWNER 생성 검증용 (SOP STEP4)
//   ⚠ 매장명·brandName 필드 없음 — genericName(placeholder)만 사용
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_japanese_01',
    region: '구리',
    cat: '스시',
    representativeMenu: '초밥',
    menus: ['초밥', '라멘', '돈카츠'],
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
// buildDirection — 하이브리드 merge (chinese-data 시그니처 동형)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) {
    return {
      genericName: '일식당',
      motive: '근처에서 일식 한 끼 하러',
      tasteCore: '기본적인 일본요리 느낌',
      sceneCore: '동네 일식당 분위기',
      hook: '문 열고 들어가니 익숙한 일식당 풍경이었어요',
      keyword: '일식',
      priceFeel: '부담 없이 한 끼 하기 좋은',
      servingUnit: '한 그릇',
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
    servingUnit: base.servingUnit || '한 그릇',
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
export const JAPANESE_SITE_KEYWORDS = [
  '초밥', '사시미', '회덮밥', '라멘', '우동', '소바',
  '돈카츠', '텐푸라', '가라아게', '규동', '가츠동', '오야코동', '카레',
  // SEO 단순형
  '스시', '일식', '일본요리', '돈가스',
  // 상황·목적
  '혼밥', '점심', '포장', '가족 외식', '가족모임', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 일식 조합 카드 (검증용 가상 매장 1개 × 전체 13메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ 실매장 확보 시 storeId 교체/추가만 — 카드 구조 무변경
//   ⚠ JAPANESE_MENUS 13개와 1:1 정합 (OWNER 검증 완전성)
//   ⚠ titlePatterns placeholder {situation}/{purpose} ↔ generate 치환체인 1:1 정합
//      (분식 FORM D 버그 방지 — 모든 placeholder가 치환됨을 보장)
// ─────────────────────────────────────────────────────────
export const JAPANESE_TREATMENTS = [
  // ── 스시 계열 ──
  {
    id: 'rest_japanese_chobap_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '초밥',
    cat: '스시',
    name: '이 일식당',
    emoji: '🍣',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 초밥',
      '구리 초밥 맛집',
      '구리 일식 초밥',
      '구리 스시',
      '구리 초밥 점심',
    ],
    compareWith: '동일 지역 다른 일식당 초밥',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '초밥',
    catRef: '스시',
    isRepresentative: true,
  },
  {
    id: 'rest_japanese_sashimi_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '사시미',
    cat: '스시',
    name: '이 일식당',
    emoji: '🐟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 사시미',
      '구리 사시미 맛집',
      '구리 일식 사시미',
      '구리 회',
      '구리 사시미 점심',
    ],
    compareWith: '동일 지역 다른 일식당 사시미',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '사시미',
    catRef: '스시',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_hoedeopbap_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '회덮밥',
    cat: '스시',
    name: '이 일식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 회덮밥',
      '구리 회덮밥 맛집',
      '구리 일식 회덮밥',
      '구리 일식',
      '구리 회덮밥 점심',
    ],
    compareWith: '동일 지역 다른 일식당 회덮밥',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '회덮밥',
    catRef: '스시',
    isRepresentative: false,
  },

  // ── 면 계열 ──
  {
    id: 'rest_japanese_ramen_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '라멘',
    cat: '면',
    name: '이 일식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 라멘',
      '구리 라멘 맛집',
      '구리 일식 라멘',
      '구리 라멘집',
      '구리 라멘 점심',
    ],
    compareWith: '동일 지역 다른 일식당 라멘',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '라멘',
    catRef: '면',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_udon_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '우동',
    cat: '면',
    name: '이 일식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 우동',
      '구리 우동 맛집',
      '구리 일식 우동',
      '구리 우동집',
      '구리 우동 점심',
    ],
    compareWith: '동일 지역 다른 일식당 우동',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '우동',
    catRef: '면',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_soba_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '소바',
    cat: '면',
    name: '이 일식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 소바',
      '구리 소바 맛집',
      '구리 일식 소바',
      '구리 메밀',
      '구리 소바 점심',
    ],
    compareWith: '동일 지역 다른 일식당 소바',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '소바',
    catRef: '면',
    isRepresentative: false,
  },

  // ── 튀김 계열 ──
  {
    id: 'rest_japanese_donkatsu_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '돈카츠',
    cat: '튀김',
    name: '이 일식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 돈카츠',
      '구리 돈카츠 맛집',
      '구리 일식 돈카츠',
      '구리 돈가스',
      '구리 돈카츠 점심',
    ],
    compareWith: '동일 지역 다른 일식당 돈카츠',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '돈카츠',
    catRef: '튀김',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_tempura_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '텐푸라',
    cat: '튀김',
    name: '이 일식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 텐푸라',
      '구리 텐푸라 맛집',
      '구리 일식 텐푸라',
      '구리 튀김',
      '구리 텐푸라 점심',
    ],
    compareWith: '동일 지역 다른 일식당 텐푸라',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '텐푸라',
    catRef: '튀김',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_karaage_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '가라아게',
    cat: '튀김',
    name: '이 일식당',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 가라아게',
      '구리 가라아게 맛집',
      '구리 일식 가라아게',
      '구리 닭튀김',
      '구리 가라아게 안주',
    ],
    compareWith: '동일 지역 다른 일식당 가라아게',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '가라아게',
    catRef: '튀김',
    isRepresentative: false,
  },

  // ── 덮밥 계열 ──
  {
    id: 'rest_japanese_gyudon_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '규동',
    cat: '덮밥',
    name: '이 일식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 규동',
      '구리 규동 맛집',
      '구리 일식 규동',
      '구리 소고기덮밥',
      '구리 규동 점심',
    ],
    compareWith: '동일 지역 다른 일식당 규동',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '규동',
    catRef: '덮밥',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_katsudon_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '가츠동',
    cat: '덮밥',
    name: '이 일식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 가츠동',
      '구리 가츠동 맛집',
      '구리 일식 가츠동',
      '구리 돈카츠덮밥',
      '구리 가츠동 점심',
    ],
    compareWith: '동일 지역 다른 일식당 가츠동',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '가츠동',
    catRef: '덮밥',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_oyakodon_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '오야코동',
    cat: '덮밥',
    name: '이 일식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 오야코동',
      '구리 오야코동 맛집',
      '구리 일식 오야코동',
      '구리 닭고기덮밥',
      '구리 오야코동 점심',
    ],
    compareWith: '동일 지역 다른 일식당 오야코동',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '오야코동',
    catRef: '덮밥',
    isRepresentative: false,
  },
  {
    id: 'rest_japanese_curry_guri_01',
    storeId: 'store_guri_japanese_01',
    industry: 'japanese',
    region: '구리',
    menu: '카레',
    cat: '덮밥',
    name: '이 일식당',
    emoji: '🍛',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 카레',
      '구리 카레 맛집',
      '구리 일식 카레',
      '구리 일본카레',
      '구리 카레 점심',
    ],
    compareWith: '동일 지역 다른 일식당 카레',
    nearbyHint: '구리역 근처 일식 식당가',
    menuRef: '카레',
    catRef: '덮밥',
    isRepresentative: false,
  },
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const JAPANESE_META = {
  industry: 'japanese',
  label: '일식·일본요리',
  greeting: '어떤 일식 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 초밥 점심 메뉴 정보',
    '구리 라멘 혼밥 메뉴 안내',
    '구리 돈카츠 포장 메뉴 정리',
    '구리 카레 가족 외식 정보',
  ],
  badge: '🍱',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const JAPANESE_LONGTAIL_SUFFIXES = {
  // 스시·덮밥·면
  japanese_main: [
    '메뉴 정보 정리',
    '점심 메뉴 안내',
    '혼밥 메뉴 정리',
    '포장 정보 안내',
  ],
  // 튀김·사이드
  japanese_side: [
    '곁들임 메뉴 정리',
    '안주 메뉴 안내',
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
// BLOCK_MAP — japanese ↔ 의료·카페·한식/분식/중식 narrative·광고 차단
//   ⚠ 한식 결(뚝배기·새우젓·들깨·머릿고기) + 중식 결(춘장·짜장·짬뽕) 침투 차단
//   ⚠ 계열 교차차단(crossCat)은 prompts/playConfig에서 cat별 적용
// ─────────────────────────────────────────────────────────
export const JAPANESE_BLOCK_MAP = {
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
  // 한식 narrative 침투 차단 (Japanese 독립 ecosystem 유지)
  korean: [
    '뚝배기', '새우젓', '들깨가루', '머릿고기', '우거지', '선지',
    '해장국', '순대국', '공깃밥', '떡볶이', '어묵국물',
  ],
  // 중식 narrative 침투 차단 (계열 혼입 방지)
  chinese: [
    '춘장', '짜장', '짬뽕', '탕수육', '깐풍기', '유린기',
    '양장피', '팔보채', '유산슬', '동파육', '꽃빵',
  ],
  // 효능·관용 표현 차단 (PHILOSOPHY — 효능 단정 금지)
  efficacy: [
    '해장', '속풀이', '몸보신', '숙취해소', '건강에 좋', '기력 회복',
  ],
};

// ─────────────────────────────────────────────────────────
// CROSS_CAT_BLOCK — 계열 간 표현 교차차단 (taste 묘사 충돌 방지)
//   각 cat에서 "다른 계열의 핵심 표현"을 차단어로 적용.
//   prompts/generate에서 treatment.cat 기준으로 선택 적용.
//   ⚠ 메뉴 자체 명칭은 제외 (혼합 매장 본문에서 메뉴명 언급은 정상)
//     → 묘사 결(국물 끓임·튀김옷·생선 결 등)만 차단
// ─────────────────────────────────────────────────────────
export const JAPANESE_CROSS_CAT_BLOCK = {
  스시: [
    // 면·튀김·덮밥 결 차단 (스시는 신선도·결 중심)
    '튀김옷', '바삭', '육수를 우려', '면을 들어',
  ],
  면: [
    // 스시·튀김 결 차단 (면은 육수·면 중심)
    '회 한 점', '결대로 썬', '튀김옷', '갓 튀긴',
  ],
  튀김: [
    // 스시·면 결 차단 (튀김은 튀김옷·바삭 중심)
    '회 한 점', '결대로 썬', '육수를 우려', '맑은 국물',
  ],
  덮밥: [
    // 스시·면 결 차단 (덮밥은 밥+토핑 중심)
    '회 한 점', '결대로 썬', '면을 들어 올',
  ],
};

// ============================================================
// ★ 제목 다양성 풀 (commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열은 data 소유)
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}`
// ============================================================

export const JAPANESE_TITLE_MIDDLE = [
  '안내', '정보', '메뉴 안내', '메뉴 정보', '메뉴 소개',
  '방문 정보', '방문 가이드', '이용 안내', '기본 정보', '특징',
  '메뉴 특징', '메뉴 구성', '한눈에 보기', '알아보기', '참고 정보',
];

export const JAPANESE_TITLE_SUFFIX = [
  '방문 전 확인', '방문 전 참고사항', '운영 정보', '일반 정보', '기본 안내',
  '메뉴 살펴보기', '메뉴 알아보기', '이용 참고', '선택 전 참고', '특징 정리',
  '한눈에 보기', '정보 정리', '방문 팁', '메뉴 가이드', '기본 내용',
];

// 메뉴별 SCENE 풀 (MIDDLE 자리에 확률적 치환 — 메뉴 매칭 시만)
//   키: 정확한 메뉴명. 미매칭 시 JAPANESE_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
export const JAPANESE_TITLE_SCENE = {
  '초밥':     ['스시 메뉴 안내', '일식 스시 정보', '일식 메뉴 안내'],
  '사시미':   ['회 메뉴 안내', '일식 스시 정보', '일식 메뉴 안내'],
  '회덮밥':   ['덮밥 메뉴 안내', '일식 스시 정보', '일식 메뉴 안내'],
  '라멘':     ['면 메뉴 안내', '일식 면 정보', '일식 메뉴 안내'],
  '우동':     ['면 메뉴 안내', '일식 면 정보', '일식 메뉴 안내'],
  '소바':     ['면 메뉴 안내', '일식 면 정보', '일식 메뉴 안내'],
  '돈카츠':   ['튀김 메뉴 안내', '일식 튀김 정보', '일식 메뉴 안내'],
  '텐푸라':   ['튀김 메뉴 안내', '일식 튀김 정보', '일식 메뉴 안내'],
  '가라아게': ['튀김 메뉴 안내', '일식 튀김 정보', '일식 메뉴 안내'],
  '규동':     ['덮밥 메뉴 안내', '일식 덮밥 정보', '일식 메뉴 안내'],
  '가츠동':   ['덮밥 메뉴 안내', '일식 덮밥 정보', '일식 메뉴 안내'],
  '오야코동': ['덮밥 메뉴 안내', '일식 덮밥 정보', '일식 메뉴 안내'],
  '카레':     ['덮밥 메뉴 안내', '일식 덮밥 정보', '일식 메뉴 안내'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값(스시/면/튀김/덮밥) 기준
export const JAPANESE_TITLE_SCENE_BY_CATEGORY = {
  '스시': ['스시 메뉴 안내', '일식 스시 정보', '식사 메뉴 안내'],
  '면':   ['면 메뉴 안내', '일식 면 정보', '식사 메뉴 안내'],
  '튀김': ['튀김 메뉴 안내', '일식 튀김 정보', '식사 메뉴 안내'],
  '덮밥': ['덮밥 메뉴 안내', '일식 덮밥 정보', '식사 메뉴 안내'],
};
