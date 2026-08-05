
// ============================================================
// meat-data.js — 고깃집 엔진 데이터 (Meat Engine)
//   복사 베이스: restaurant-data.js v2 (2026-06-29 세션13)
//   ★ 독립 업종 (restaurant 하위 카테고리 아님). enabled:false / dev / 관측·FREEZE 전.
//   ★ 외식 복사 3계층 정정: (1) generate 하드코딩 (2) prompts 예시 (3) data 기본값.
//   ★ 철학: 방문목적(주축) → 고기 선택이유(보조축) → 불판·굽기 → 곁들임 → 마무리.
//      국물 ritual 금지. 매장명 본문 비노출. 광고 단정 금지(PHILOSOPHY 정합).
// ============================================================
//   1. CAFE_TREATMENTS = 매장 카드  →  MEAT_TREATMENTS = 조합 카드 (지역×메뉴)

// ─────────────────────────────────────────────────────────
// CATS (1단계: 고깃집만 — 확장 가능 구조)
//   ★ 시장 확장 대비: 아래 슬롯은 검증 후 순차 활성. cat 값은 카드 cat과 정합 필요.
// ─────────────────────────────────────────────────────────
export const MEAT_CATS = [
  '전체',
  '고깃집',
  // 검증 후 확장 (각 cat 추가 시 MENU_MENUS·SCENE_BY_CATEGORY·CATEGORY_OVERRIDES 동반 정의):
  // '소고기', '한우', '갈비집', '숯불구이', '양갈비', '양꼬치', '무한리필',
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리만)
// ─────────────────────────────────────────────────────────
export const MEAT_REGIONS = [
  '구리',
  // 검증 후 확장:
  // '남양주', '하남', '강남', '성수', '잠실', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 카테고리별 메뉴 (1단계: 고깃집 8종)
// ─────────────────────────────────────────────────────────
export const MEAT_MENUS = {
  고깃집: [
    // 돼지 계열
    '삼겹살', '목살', '항정살', '돼지갈비', '생고기',
    // 소 계열
    '갈비', '소갈비', '차돌박이',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (고기집)
// buildDirection()의 기반. 메뉴 결이 여기서 잡힘.
// ⚠ 광고 표현 금지: "최고", "찐맛집", "강추" 등 절대 사용 X
// ⚠ 국물 ritual(뚝배기·뽀얀 국물) 금지 — 고기집 결: 불판·굽기·쌈·곁들임
// ─────────────────────────────────────────────────────────
export const MEAT_MENU_BASE_DIRECTION = {
  '삼겹살': {
    genericName: '삼겹살집',
    altGenericNames: ['고깃집', '식당', '가게'],
    motive: '불판에 고기 한번 구워 먹고 싶어서',
    tasteCore: '두툼하게 구워 겉은 바삭 속은 촉촉한 살, 기름이 노릇하게 도는 단면',
    sceneCore: '불판 위에서 지글지글 익는 소리, 연기 사이로 잔 부딪히는 풍경',
    hook: '집게로 한 점 뒤집자 기름이 타닥 튀었어요',
    keyword: '삼겹살',
    servingUnit: '1인분',
    priceFeel: '편하게 구워 먹기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 쌈장',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '쌈장', '김치'],
    timeOfDay: ['점심', '저녁', '밤'],
    recommendSituation: '여럿이 둘러앉아 직접 구워 가며 천천히 먹고 싶을 때, 한잔 곁들이고 싶을 때',
    titlePurpose: '회식하기 좋은',
    portionFeel: '1인분 기준 둘이 2~3인분이면 적당, 여럿이 나눠 먹기 좋은 양',
    sharingFeel: '여럿이 나눠 굽는 구성 — 함께 먹기 좋음',
    usageType: '모임·회식·가족 외식용',
    paceFeel: '천천히 구워 가며 오래 앉는 편 — 대화하며 즐기는 자리',
    visitTiming: '저녁 시간대가 주력, 점심 특선도 무난',
    bestCompanion: '일행·가족·동료',
    decisionPoint: '기름지고 든든하게 구워 먹을 자리면 삼겹살이 무난, 담백하게 즐기려면 목살·항정살이 나을 수 있음',
  },

  '목살': {
    genericName: '목살집',
    altGenericNames: ['고깃집', '식당', '가게'],
    motive: '담백하게 고기 한번 구워 먹고 싶어서',
    tasteCore: '기름기 적고 쫄깃한 결, 도톰하게 구워도 퍽퍽하지 않은 식감',
    sceneCore: '불판 위 노릇하게 익어가는 두툼한 살, 쌈에 올리는 손들',
    hook: '한 점 썰어 입에 넣자 결대로 부드럽게 끊겼어요',
    keyword: '목살',
    servingUnit: '1인분',
    priceFeel: '담백하게 구워 먹기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 쌈장',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '쌈장', '김치'],
    timeOfDay: ['점심', '저녁', '밤'],
    recommendSituation: '기름진 게 부담스러울 때, 담백하게 든든히 먹고 싶을 때',
    titlePurpose: '가족과 가기 좋은',
    portionFeel: '1인분 기준 담백해서 더 먹게 되는 편, 둘이 2~3인분 적당',
    sharingFeel: '여럿이 나눠 굽는 구성 — 함께 먹기 좋음',
    usageType: '가족 외식·끼니용',
    paceFeel: '구워 가며 천천히 — 대화하며 즐기는 자리',
    visitTiming: '저녁 시간대 주력, 점심도 무난',
    bestCompanion: '가족·일행',
    decisionPoint: '담백하게 든든히면 목살이 무난, 기름진 풍미를 찾으면 삼겹살이 나을 수 있음',
  },

  '항정살': {
    genericName: '고깃집',
    altGenericNames: ['삼겹살집', '식당', '가게'],
    motive: '부드러운 특수부위 한번 맛보고 싶어서',
    tasteCore: '쫄깃하면서 부드러운 결, 적당한 기름이 입에 도는 한 점',
    sceneCore: '얇게 펴 빠르게 구워내는 불판, 한 점씩 집어가는 젓가락',
    hook: '살짝만 익혀 집어 들자 결이 부드럽게 늘어났어요',
    keyword: '항정살',
    servingUnit: '1인분',
    priceFeel: '부드럽게 즐기기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 소금장',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '소금장', '김치'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '부드러운 특수부위를 천천히 즐기고 싶을 때, 한잔 곁들일 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '1인분 양은 적은 편 — 여러 부위와 곁들이기 좋음',
    sharingFeel: '나눠 맛보기 좋은 특수부위 구성',
    usageType: '데이트·모임용',
    paceFeel: '한 점씩 천천히 — 여유 있게 즐기는 자리',
    visitTiming: '저녁 시간대 주력',
    bestCompanion: '연인·가까운 일행',
    decisionPoint: '부드러운 특수부위를 즐기려면 항정살이 무난, 든든한 양을 찾으면 삼겹살·목살이 나을 수 있음',
  },

  '돼지갈비': {
    genericName: '돼지갈비집',
    altGenericNames: ['고깃집', '식당', '가게'],
    motive: '양념 밴 갈비 한번 구워 먹고 싶어서',
    tasteCore: '달짝지근한 양념이 밴 살, 불에 노릇하게 캐러멜라이즈된 가장자리',
    sceneCore: '양념 타는 단내가 도는 불판, 가위로 잘라 나누는 손',
    hook: '양념이 노릇하게 익자 단내가 확 올라왔어요',
    keyword: '돼지갈비',
    servingUnit: '1인분',
    priceFeel: '양념 갈비 구워 먹기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 쌈장',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '쌈장', '김치', '냉면'],
    timeOfDay: ['점심', '저녁', '밤'],
    recommendSituation: '아이·부모님과 함께 양념 고기를 편하게 먹고 싶을 때, 가족 외식 자리',
    titlePurpose: '가족과 가기 좋은',
    portionFeel: '1인분 기준 양념이라 밥·냉면과 곁들이면 든든, 여럿이 나눠 먹기 좋음',
    sharingFeel: '여럿이 나눠 먹기 좋은 양념 구성',
    usageType: '가족 외식·모임용',
    paceFeel: '구워 가며 밥·냉면 곁들여 천천히',
    visitTiming: '저녁 시간대 주력, 주말 점심도 무난',
    bestCompanion: '가족·아이·부모님',
    decisionPoint: '양념 밴 고기를 가족과 편하게면 돼지갈비가 무난, 생고기 풍미를 찾으면 삼겹살이 나을 수 있음',
  },

  '생고기': {
    genericName: '고깃집',
    altGenericNames: ['삼겹살집', '식당', '가게'],
    motive: '신선한 생고기 그대로 구워 먹고 싶어서',
    tasteCore: '냉동 아닌 생고기 특유의 결과 육즙, 소금·기름장에 찍어 먹는 담백함',
    sceneCore: '핏기 도는 붉은 살을 불판에 올리는 순간, 빠르게 익혀내는 손길',
    hook: '생고기를 올리자 가장자리부터 빠르게 색이 돌았어요',
    keyword: '생고기',
    servingUnit: '1인분',
    priceFeel: '신선하게 구워 먹기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 소금장',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '소금장', '김치'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '냉동 아닌 신선한 고기를 담백하게 즐기고 싶을 때',
    titlePurpose: '저녁 먹기 좋은',
    portionFeel: '1인분 기준 담백해 양 조절 쉬움, 여럿이 나눠 먹기 좋음',
    sharingFeel: '여럿이 나눠 굽는 구성',
    usageType: '저녁 식사·모임용',
    paceFeel: '빠르게 구워 신선할 때 — 부지런히 집는 자리',
    visitTiming: '저녁 시간대 주력',
    bestCompanion: '일행·가족',
    decisionPoint: '신선한 생고기를 담백하게면 무난, 양념 풍미를 찾으면 돼지갈비가 나을 수 있음',
  },

  '갈비': {
    genericName: '갈비집',
    altGenericNames: ['고깃집', '식당', '가게'],
    motive: '제대로 된 갈비 한번 구워 먹고 싶어서',
    tasteCore: '뼈에 붙은 살의 풍미, 양념 또는 소금구이로 즐기는 묵직한 한 점',
    sceneCore: '넓은 불판에 갈비를 펼쳐 굽는 풍경, 가위질 소리',
    hook: '뼈째 올린 갈비가 익으며 기름이 뚝뚝 떨어졌어요',
    keyword: '갈비',
    servingUnit: '1인분',
    priceFeel: '갈비 제대로 즐기기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 쌈장, 냉면',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '쌈장', '김치', '냉면'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '손님 접대·기념일처럼 제대로 된 한 상을 차리고 싶을 때',
    titlePurpose: '모임하기 좋은',
    portionFeel: '1인분 기준 묵직해서 밥·냉면 곁들이면 든든, 여럿이 나눠 먹기 좋음',
    sharingFeel: '여럿이 나눠 먹기 좋은 묵직한 구성',
    usageType: '접대·기념일·모임용',
    paceFeel: '천천히 구워 가며 격식 있게',
    visitTiming: '저녁 시간대 주력',
    bestCompanion: '손님·가족·모임 일행',
    decisionPoint: '제대로 된 한 상을 차릴 자리면 갈비가 무난, 가볍게 구워 먹을 자리면 삼겹살이 나을 수 있음',
  },

  '소갈비': {
    genericName: '소갈비집',
    altGenericNames: ['한우집', '고깃집', '가게'],
    motive: '특별한 날 소고기 갈비 제대로 먹고 싶어서',
    tasteCore: '소갈비 특유의 진한 육향, 살살 녹는 부드러운 결',
    sceneCore: '한 점씩 정성껏 구워내는 불판, 천천히 음미하는 테이블',
    hook: '입에 넣자 따로 씹을 새 없이 부드럽게 풀렸어요',
    keyword: '소갈비',
    servingUnit: '1인분',
    priceFeel: '특별한 날 즐기기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 소금장, 냉면',
    sidedishes: ['상추', '깻잎', '마늘', '파채', '소금장', '김치', '냉면'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '기념일·부모님 모실 때·손님 접대처럼 특별한 자리',
    titlePurpose: '부모님 모시기 좋은',
    portionFeel: '1인분 양은 적은 편 — 귀하게 음미하는 구성',
    sharingFeel: '함께 음미하기 좋은 구성',
    usageType: '기념일·접대·부모님 식사용',
    paceFeel: '한 점씩 천천히 음미하며',
    visitTiming: '저녁 시간대 주력',
    bestCompanion: '부모님·손님·가족',
    decisionPoint: '특별한 날 제대로면 소갈비가 무난, 부담 없이 자주면 돼지 계열이 나을 수 있음',
  },

  '차돌박이': {
    genericName: '고깃집',
    altGenericNames: ['소고기집', '식당', '가게'],
    motive: '얇게 구워내는 차돌 한번 맛보고 싶어서',
    tasteCore: '얇게 썬 차돌의 고소한 기름, 빠르게 익혀 한 점씩 집는 식감',
    sceneCore: '불판에 펼치자마자 익는 얇은 살, 부지런히 집어가는 젓가락',
    hook: '올리자마자 색이 돌아 바로 집어 들었어요',
    keyword: '차돌박이',
    servingUnit: '1인분',
    priceFeel: '고소하게 즐기기 좋은',
    tableware: '불판, 집게, 가위, 쌈채소, 명이나물, 소금장',
    sidedishes: ['상추', '깻잎', '마늘', '명이나물', '소금장', '김치'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '고소한 소고기를 가볍게 즐기고 싶을 때, 한잔 곁들일 때',
    titlePurpose: '저녁 먹기 좋은',
    portionFeel: '얇아 금방 익고 가볍게 먹는 편 — 여러 부위와 곁들이기 좋음',
    sharingFeel: '나눠 집어 먹기 좋은 구성',
    usageType: '저녁 식사·모임용',
    paceFeel: '빠르게 익혀 부지런히 집는 자리',
    visitTiming: '저녁 시간대 주력',
    bestCompanion: '일행·연인',
    decisionPoint: '고소한 소고기를 가볍게면 차돌박이가 무난, 묵직한 한 상을 찾으면 소갈비가 나을 수 있음',
  },
};


// ─────────────────────────────────────────────────────────
// SITUATIONS — 상황 (고기집 결)
// ─────────────────────────────────────────────────────────
export const MEAT_SITUATIONS = [
  '회식',
  '한잔',
  '주말 저녁',
  '특별한 날',
  // 검증 후 확장:
  // '야근 후', '단체 모임', '점심 특선', ...
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정 (고기집)
// BASE_DIRECTION 위에 덮어씌움. 모든 필드 선택적.
// ⚠ 국물 ritual 금지 — 불판·굽기·연기·쌈 결로.
// ─────────────────────────────────────────────────────────
export const MEAT_SITUATION_OVERRIDES = {
  '회식': {
    motiveExtra: '여럿이 모여 고기 구우며 한 잔 하려고',
    tasteExtra: '여럿이 둘러앉아 구워 가며 먹으니 한 점이 더 들어갔어요',
    sceneExtra: '불판마다 연기 올라오고 잔 부딪히는 소리가 도는 단체석 분위기',
    hookExtra: '자리에 앉자 곧바로 불판부터 달궈졌어요',
    flowBias: 'scene',
  },
  '한잔': {
    motiveExtra: '고기 한 점에 가볍게 한 잔 곁들이러',
    tasteExtra: '한 점 구워 한 잔 곁들이니 그 조합이 천천히 이어졌어요',
    sceneExtra: '잔 부딪히는 소리와 불판 위 익는 소리가 섞인 저녁 풍경',
    hookExtra: '고기 올리자마자 잔부터 채워졌어요',
    flowBias: 'taste',
  },
  '주말 저녁': {
    motiveExtra: '주말 저녁에 제대로 구워 먹으려고',
    tasteExtra: '여유 있는 저녁이라 천천히 구워 가며 먹었어요',
    sceneExtra: '가족·일행으로 자리가 꽤 찬 주말 저녁 분위기',
    hookExtra: '주말 저녁이라 들어서자 자리가 거의 차 있었어요',
    flowBias: 'arrive',
  },
  '특별한 날': {
    motiveExtra: '기념일이라 평소보다 제대로 차려 먹으려고',
    tasteExtra: '특별한 날이라 좋은 부위로 천천히 음미했어요',
    sceneExtra: '차분하게 마주 앉아 한 점씩 음미하는 자리',
    hookExtra: '기념일이라 평소보다 신경 써서 자리를 잡았어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 방문목적 (누구와 / 어떤 자리) — 표준안 10종
// ─────────────────────────────────────────────────────────
export const MEAT_PURPOSES = [
  '회식',
  '가족 외식',
  '데이트',
  '저녁 식사',
  '친구 모임',
  '술자리',
  '주말 외식',
  '부모님 식사',
  '기념일',
  '모임',
];

// ★ 제목용 방문목적 표현 (PURPOSES 키 → 제목 선두 토큰)
//   titlePatterns의 {purpose} 자리에 들어가는 자연스러운 수식형
export const MEAT_PURPOSE_TITLE_LABEL = {
  '회식': '회식하기 좋은',
  '가족 외식': '가족과 가기 좋은',
  '데이트': '데이트하기 좋은',
  '저녁 식사': '저녁 먹기 좋은',
  '친구 모임': '친구들과 모임하기 좋은',
  '술자리': '한잔하기 좋은',
  '주말 외식': '주말에 가기 좋은',
  '부모님 식사': '부모님 모시기 좋은',
  '기념일': '기념일에 가기 좋은',
  '모임': '모임하기 좋은',
};

// ─────────────────────────────────────────────────────────
// PURPOSE_OVERRIDES — 목적별 톤 보정 (고기집)
// ★ v3 목적우선 필드(선택적): purposeMotive·decisionPoint·recommendSituation·visitTiming·bestCompanion
//   - 있으면 buildDirection이 목적 우선으로 합성. 없으면 MENU_BASE_DIRECTION 폴백.
// ─────────────────────────────────────────────────────────
export const MEAT_PURPOSE_OVERRIDES = {
  '회식': {
    sceneExtra: '여러 명이 둘러앉아 구워 나눠 먹기 좋은 분위기',
    tableExtra: '단체석·룸 유무, 4인 이상 합석 가능 여부',
    paceExtra: '식사 시간 1~2시간, 구워 가며 한 잔 곁들임',
    extraDetail: '여러 명이 함께 굽기 좋은 구성인지 1줄 언급',
    purposeMotive: '여럿이 모여 고기 구우며 한 잔 곁들이기 좋은 상황',
    decisionPoint: '여럿이 나눠 굽기 좋은 푸짐한 부위가 잘 맞고, 양 적은 특수부위 단일은 덜 맞음',
    recommendSituation: '회식·모임처럼 여러 명이 둘러앉아 굽는 자리',
    visitTiming: '저녁 시간대, 단체 예약 가능 여부 확인',
    bestCompanion: '동료·단체',
  },
  '가족 외식': {
    sceneExtra: '온 가족이 둘러앉아 구워 먹기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블, 불판 여유 있는 자리',
    paceExtra: '식사 시간 1시간 안팎, 천천히 구워 가며',
    extraDetail: '아이·부모님이 먹기 편한 부위가 함께 있는지 1줄 언급',
    purposeMotive: '온 가족이 부담 없이 둘러앉아 고기 구워 먹고 싶은 상황',
    decisionPoint: '연령대가 다양해도 무난한 양념·부위가 잘 맞고, 자극적 단일 메뉴는 덜 맞음',
    recommendSituation: '주말 가족 외식처럼 여러 세대가 함께 굽는 자리',
    visitTiming: '주말 점심·이른 저녁이 자리 잡기 좋음',
    bestCompanion: '가족',
  },
  '데이트': {
    sceneExtra: '마주 앉아 천천히 구워 가며 이야기하기 좋은 자리',
    tableExtra: '2인 테이블, 옆자리와 간격 있는 편이 편함',
    paceExtra: '식사 시간 1시간 안팎, 여유 있게 한 점씩',
    purposeMotive: '둘이 여유 있게 구워 가며 이야기 나누고 싶은 상황',
    decisionPoint: '부드러운 특수부위·소고기가 잘 맞고, 회전 빠른 단체형은 덜 맞을 수 있음',
    recommendSituation: '데이트·기념일처럼 둘이 천천히 즐기는 자리',
    visitTiming: '붐비는 시간을 피한 이른 저녁이 여유롭',
    bestCompanion: '연인',
  },
  '저녁 식사': {
    sceneExtra: '저녁에 든든하게 구워 한 끼 채우기 좋은 분위기',
    tableExtra: '2~4인 자리',
    paceExtra: '식사 시간 40분~1시간, 저녁 시간대',
    purposeMotive: '저녁에 고기 한 점으로 든든하게 채우고 싶은 상황',
    decisionPoint: '든든하게 구워 먹을 부위가 잘 맞음',
    recommendSituation: '저녁 식사·퇴근 후처럼 든든한 한 끼가 필요할 때',
    visitTiming: '저녁 시간대 전반',
    bestCompanion: '일행·가족',
  },
  '친구 모임': {
    sceneExtra: '친구들과 둘러앉아 여러 부위 나눠 굽기 좋은 분위기',
    tableExtra: '2~4인 테이블, 불판 여유 있는 자리',
    paceExtra: '식사 시간 1시간 안팎, 이것저것 구워 나눔',
    extraDetail: '여러 부위 나눠 굽기 좋은지 1줄 언급',
  },
  '술자리': {
    sceneExtra: '고기 한 점에 가볍게 한 잔 곁들이기 좋은 분위기',
    tableExtra: '2~4인 자리, 늦은 시간 영업 여부 확인',
    paceExtra: '식사 시간 1~2시간, 구워 가며 천천히 한 잔',
    extraDetail: '안주로 곁들이기 좋은 구성인지 1줄 언급',
  },
  '주말 외식': {
    sceneExtra: '주말에 여유 있게 구워 먹기 좋은 자리',
    tableExtra: '4인 이상 자리, 주차 여부 확인',
    paceExtra: '식사 시간 1시간 안팎, 느긋하게',
    extraDetail: '주말 대기·예약 여부 1줄 언급',
  },
  '부모님 식사': {
    sceneExtra: '부모님이 편하게 드시기 좋은 차분한 자리',
    tableExtra: '4인 테이블, 입식 여부 확인',
    paceExtra: '식사 시간 1시간 안팎, 천천히',
    extraDetail: '부모님이 드시기 편한 부드러운 부위가 있는지 1줄 언급',
    purposeMotive: '부모님 모시고 좋은 고기로 편하게 식사하고 싶은 상황',
    decisionPoint: '부드러운 소고기·특수부위가 잘 맞고, 질긴 부위는 덜 맞음',
    recommendSituation: '부모님 식사·어른 모임처럼 좋은 한 상이 필요할 때',
    visitTiming: '한가한 이른 저녁이 편함',
    bestCompanion: '부모님',
  },
  '기념일': {
    sceneExtra: '특별한 날 마주 앉아 천천히 음미하기 좋은 자리',
    tableExtra: '2~4인 자리, 조용한 편이 좋음',
    paceExtra: '식사 시간 1시간 안팎, 격식 있게',
    extraDetail: '특별한 날 어울리는 부위·구성인지 1줄 언급',
    purposeMotive: '기념일이라 평소보다 제대로 차려 먹고 싶은 상황',
    decisionPoint: '좋은 소고기·특수부위가 잘 맞고, 가벼운 단품 위주는 덜 맞음',
    recommendSituation: '기념일·접대처럼 제대로 된 한 상이 필요할 때',
    visitTiming: '붐비지 않는 이른 저녁이 여유롭',
    bestCompanion: '연인·가족',
  },
  '모임': {
    sceneExtra: '여럿이 둘러앉아 구워 나눠 먹기 좋은 분위기',
    tableExtra: '단체석·4인 이상 자리',
    paceExtra: '식사 시간 1~2시간, 구워 가며 나눔',
    extraDetail: '여러 명이 함께 굽기 좋은 구성인지 1줄 언급',
  },
};


// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 매장 1개에 메뉴 여러 개 연결 (고깃집)
// ⚠ 매장명·브랜드명 필드 없음 (PHILOSOPHY 원칙3)
// ⚠ storeId는 운영 식별자 — 본문에 절대 노출 X
// ─────────────────────────────────────────────────────────
export const MEAT_STORE_PROFILES = [
  {
    storeId: 'store_guri_meat_01',
    region: '구리',
    cat: '고깃집',
    representativeMenu: '삼겹살',
    menus: ['삼겹살', '목살', '항정살', '돼지갈비', '생고기', '갈비', '소갈비', '차돌박이'],
    promotionMenus: ['삼겹살', '목살', '돼지갈비'],   // ★ 집중 홍보 3종
  },
  // 검증 후 확장
];

export const MEAT_PROMOTION_MENU_MAX = 5;


// ===== [helpers_raw.js] =====
export function getStoresByRegion(region) {
  return MEAT_STORE_PROFILES.filter(s => s.region === region);
}

export function getStoreById(storeId) {
  return MEAT_STORE_PROFILES.find(s => s.storeId === storeId) || null;
}

// ─────────────────────────────────────────────────────────
// ★ v3 홍보메뉴 필터 헬퍼 (검수 반영 2026-06-26)
//   역할 분리: TREATMENTS·menus = 데이터(전체) / promotionMenus = 운영(생성 대상)
//   generate·index.js는 아래 헬퍼로 "생성/노출 대상"을 거른다. TREATMENTS는 무변경 유지.
//   promotionMenus 미정의 매장 → menus로 폴백(하위호환).
// ─────────────────────────────────────────────────────────

// 매장의 홍보 메뉴 목록 (없으면 menus 폴백)
export function getPromotionMenus(store) {
  if (!store) return [];
  if (Array.isArray(store.promotionMenus) && store.promotionMenus.length > 0) {
    return store.promotionMenus;
  }
  return store.menus || [];
}

// storeId로 홍보 메뉴 조회
export function getPromotionMenusByStoreId(storeId) {
  return getPromotionMenus(getStoreById(storeId));
}

// 특정 메뉴가 해당 매장의 홍보 대상인지 (대표메뉴 아니어도 promotionMenus면 true)
export function isPromotionMenu(store, menu) {
  return getPromotionMenus(store).includes(menu);
}

// ★ treatment 배열을 홍보메뉴 기준으로 필터링 (index.js/generate 생성 대상 산출)
//   각 treatment의 storeId로 매장을 찾아 promotionMenus에 포함된 menu만 통과.
//   storeId 없거나 매장 미발견 시 보수적으로 제외(생성 대상 아님).
export function filterTreatmentsByPromotion(treatments) {
  return (treatments || []).filter(t => {
    const store = getStoreById(t.storeId);
    if (!store) return false;
    const menu = t.menu || t.menuRef || '';
    return isPromotionMenu(store, menu);
  });
}

// ★ 지역의 홍보 대상 treatment만 (index.js 메뉴 노출용)
export function getPromotionTreatmentsByRegion(treatments, region) {
  return filterTreatmentsByPromotion(treatments).filter(t => t.region === region);
}

// ─────────────────────────────────────────────────────────
// buildDirection — 하이브리드 merge
// BASE_MENU + SITUATION + PURPOSE를 합쳐 최종 DIRECTION 생성
// generate{Restaurant}.js / restaurant-prompts.js에서 호출
//
// store 인자는 선택적 — 있을 경우 representativeMenu와 비교만 (본문 영향 X)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MEAT_MENU_BASE_DIRECTION[menu];
  if (!base) {
    // fallback (메뉴 미정 시)
    return {
      genericName: '식당',
      motive: '근처에서 한 끼 해결하러',
      tasteCore: '평범한 가정식 느낌',
      sceneCore: '동네 식당 분위기',
      hook: '문 열고 들어가니 익숙한 식당 풍경이었어요',
      keyword: '맛집',
      priceFeel: '부담 없이 한 끼 하기 좋은',
      servingUnit: '한 그릇',
      situation: situation || '',
      purpose: purpose || '',
      flowBias: '',
      // ★ v3 신규 필드 (fallback 기본값)
      purposeLabel: (purpose && MEAT_PURPOSE_TITLE_LABEL[purpose]) || '',
      purposeFrame: purpose ? `${purpose} 자리를 찾는 상황` : '',
      decisionPoint: '',
      recommendSituation: '',
      visitTiming: '',
      bestCompanion: '',
      portionFeel: '',
      sharingFeel: '',
      usageType: '',
      paceFeel: '',
      isSideMenu: false,
      representativeMenu: '',
    };
  }

  const sitOvr = (situation && MEAT_SITUATION_OVERRIDES[situation]) || {};
  const purOvr = (purpose && MEAT_PURPOSE_OVERRIDES[purpose]) || {};

  // motive·hook은 상황 우선, taste·scene은 상황+목적 합성
  const motive = sitOvr.motiveExtra
    ? `${base.motive}. ${sitOvr.motiveExtra}`
    : base.motive;

  const hook = sitOvr.hookExtra || base.hook;

  const tasteCore = sitOvr.tasteExtra
    ? `${base.tasteCore} — ${sitOvr.tasteExtra}`
    : base.tasteCore;

  // scene: 상황·목적 둘 다 있으면 합성
  let sceneCore = base.sceneCore;
  if (sitOvr.sceneExtra) sceneCore += `. ${sitOvr.sceneExtra}`;
  if (purOvr.sceneExtra) sceneCore += `. ${purOvr.sceneExtra}`;

  // ══════════════════════════════════════════════════════════
  // ★ v3 방문목적 우선 합성 (PURPOSE → SITUATION → MENU)
  //   ⚠ 위 기존 필드(motive·tasteCore·sceneCore)는 무수정 → personal 출력 불변(롤백 안전판 보존)
  //   ⚠ 아래 신규 필드는 commercial(v3)만 우선 소비. 시그니처·반환계약 유지(필드 추가만)
  //   합성 순서: 방문목적(왜 이 상황에 나왔나) → 상황(지금 결) → 메뉴(그래서 이걸 고름)
  // ══════════════════════════════════════════════════════════
  const purLabel = (purpose && MEAT_PURPOSE_TITLE_LABEL[purpose]) || base.titlePurpose || '';

  // purposeFrame: "방문목적 → 상황 → 메뉴" 순서의 방문 서사 (commercial menuIntro/scene용)
  // 메뉴는 마지막에 등장 (검수 STEP2: 상황 먼저, 메뉴 두 번째)
  const purposeFrameParts = [];
  if (purOvr.purposeMotive) purposeFrameParts.push(purOvr.purposeMotive);
  else if (purpose) purposeFrameParts.push(`${purpose} 자리를 찾는 상황`);
  if (sitOvr.motiveExtra) purposeFrameParts.push(sitOvr.motiveExtra);
  const purposeFrame = purposeFrameParts.join(' / ');

  // 목적 우선 합성 필드 — base(메뉴) 값을 폴백으로, 목적 보정이 있으면 앞세움
  const decisionPoint = purOvr.decisionPoint || base.decisionPoint || '';
  const recommendSituation = purOvr.recommendSituation || base.recommendSituation || '';
  const visitTiming = purOvr.visitTiming || base.visitTiming || (base.timeOfDay ? base.timeOfDay.join('·') : '');
  const bestCompanion = purOvr.bestCompanion || base.bestCompanion || '';

  // ★ v3 만족 판단축 (단정 금지 — 독자가 만족을 가늠할 재료. base 폴백)
  const portionFeel = base.portionFeel || '';
  const sharingFeel = base.sharingFeel || '';
  const usageType = base.usageType || '';
  const paceFeel = base.paceFeel || '';


  // 매장 메타 (본문 강제 X — 플래그만 노출, prompts 측에서 가벼운 톤 보정만 활용)
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
    flowBias: sitOvr.flowBias || '',  // 섹션 비중 보정 (generate에서 활용)
    // ★ v3 방문목적 우선 필드 (commercial 전용 소비 — personal은 미참조라 무영향)
    purposeLabel: purLabel,           // 제목 선두 수식형 ("혼밥하기 좋은")
    purposeFrame,                     // 방문목적→상황 서사 (메뉴는 뒤에 등장)
    decisionPoint,                    // 선택 기준 (이 목적이면 이 메뉴/다른 선택)
    recommendSituation,               // 추천 방문 상황·목적
    visitTiming,                      // 방문 추천 시간대
    bestCompanion,                    // 함께 가기 좋은 동행
    // ★ v3 만족 판단축 (commercial decision/recommend 소비 — 단정 아닌 판단 재료)
    portionFeel,                      // 양 가늠 (적은 편/든든한 한 끼)
    sharingFeel,                      // 혼자/나눠먹기
    usageType,                        // 식사용/술안주용
    paceFeel,                         // 간단히/오래 앉아
    // 매장 메타 (생성기에서 선택적으로 활용 — 본문 강제 X)
    isSideMenu,
    representativeMenu,
  };
}

// ===== [meat_treatments.js] =====
export const MEAT_TREATMENTS = [
  // ─── 매장: 구리 고깃집 (storeId: store_guri_meat_01) ───
  //   8개 메뉴 카드. promotionMenus(삼겹살·목살·돼지갈비)만 생성 대상.
  {
    id: 'meat_samgyeop_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '삼겹살',
    cat: '고깃집',
    name: '이 삼겹살집',  // placeholder — 매장명 X
    emoji: '🥓',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 삼겹살',
      '구리 삼겹살 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 삼겹살 회식',
      '구리 삼겹살 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '삼겹살',
    catRef: '고깃집',
    isRepresentative: true,
  },
  {
    id: 'meat_moksal_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '목살',
    cat: '고깃집',
    name: '이 고깃집',  // placeholder — 매장명 X
    emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 목살',
      '구리 목살 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 목살 회식',
      '구리 목살 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '목살',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_hangjeong_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '항정살',
    cat: '고깃집',
    name: '이 고깃집',  // placeholder — 매장명 X
    emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 항정살',
      '구리 항정살 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 항정살 회식',
      '구리 항정살 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '항정살',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_galbi_pork_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '돼지갈비',
    cat: '고깃집',
    name: '이 돼지갈비집',  // placeholder — 매장명 X
    emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 돼지갈비',
      '구리 돼지갈비 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 돼지갈비 회식',
      '구리 돼지갈비 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '돼지갈비',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_saenggogi_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '생고기',
    cat: '고깃집',
    name: '이 고깃집',  // placeholder — 매장명 X
    emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 생고기',
      '구리 생고기 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 생고기 회식',
      '구리 생고기 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '생고기',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_galbi_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '갈비',
    cat: '고깃집',
    name: '이 갈비집',  // placeholder — 매장명 X
    emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 갈비',
      '구리 갈비 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 갈비 회식',
      '구리 갈비 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '갈비',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_sogalbi_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '소갈비',
    cat: '고깃집',
    name: '이 소갈비집',  // placeholder — 매장명 X
    emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 소갈비',
      '구리 소갈비 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 소갈비 회식',
      '구리 소갈비 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '소갈비',
    catRef: '고깃집',
    isRepresentative: false,
  },
  {
    id: 'meat_chadol_guri_01',
    storeId: 'store_guri_meat_01',
    industry: 'meat',
    region: '구리',
    menu: '차돌박이',
    cat: '고깃집',
    name: '이 고깃집',  // placeholder — 매장명 X
    emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu}',
      '{region} {menu} {purpose}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 차돌박이',
      '구리 차돌박이 맛집',
      '구리 고깃집',
      '구리 회식',
      '구리 고기집',
      '구리 차돌박이 회식',
      '구리 차돌박이 가족외식',
    ],
    compareWith: '동일 지역 다른 고깃집',
    nearbyHint: '구리역 근처 고기 식당가',
    menuRef: '차돌박이',
    catRef: '고깃집',
    isRepresentative: false,
  },
];


// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS (제목에서 메뉴·상황 키워드 감지)
// ─────────────────────────────────────────────────────────
export const MEAT_SITE_KEYWORDS = [
  // 메뉴 8종
  '삼겹살', '목살', '항정살', '돼지갈비', '생고기', '갈비', '소갈비', '차돌박이',
  // SEO 단순형
  '고깃집', '고기집', '고기', '소고기', '돼지고기', '한우', '구이',
  // 상황·목적
  '회식', '한잔', '술자리', '가족외식', '가족 외식', '데이트', '모임', '기념일',
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const MEAT_META = {
  industry: 'meat',
  label: '고깃집',
  greeting: '어디서 어떤 고기를 안내할까요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '회식하기 좋은 구리 삼겹살 고깃집',
    '가족과 가기 좋은 구리 돼지갈비',
    '데이트하기 좋은 구리 항정살',
    '부모님 모시기 좋은 구리 소갈비',
    '한잔하기 좋은 구리 차돌박이',
  ],
  badge: '🍖',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES — index.js LONGTAIL_SUFFIXES에서 meat 분기로 사용
// ⚠ 의료/카페 suffix와 혼용 금지
// ─────────────────────────────────────────────────────────
export const MEAT_LONGTAIL_SUFFIXES = {
  // 고깃집 — v3 방문목적/정보형
  meat: [
    '회식하기 좋은',
    '단체 모임 자리',
    '주차 편한 곳',
    '가족 외식하기 좋은',
    '한잔 곁들이기 좋은',
    '여럿이 가기 좋은',
  ],
  // 기본 (카테고리 미감지 시)
  default: [
    '방문 정보 안내',
    '메뉴 안내',
    '운영 정보 안내',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — meat ↔ clinic·cafe·dental·restaurant(국물) 차단
// generateMeat.js에서 사용
// ─────────────────────────────────────────────────────────
export const MEAT_BLOCK_MAP = {
  // 의료 어휘 차단
  medical: [
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '상담실', '진료실', '원장님', '의사', '간호사', '병원',
    '회차', '경과', '붓기', '멍', '처방',
  ],
  // 카페 어휘 차단
  cafe: [
    '카공', '작업카페', '스터디카페', '디저트카페', '브런치 카페',
    '루프탑 카페', '콘센트 자리', '노트북 거치',
    '라떼아트', '드립커피', '에스프레소 머신',
  ],
  // 학습 어휘 차단
  study: [
    '독서실', '공부하기 좋은', '집중하기 좋은', '학습', '인강',
  ],
  // ★ 국물요리 어휘 차단 (restaurant 국물 엔진과 분리 — 고기집 결 오염 방지)
  soup: [
    '뚝배기', '뽀얀 국물', '국물부터', '해장', '들깨가루', '새우젓', '우거지',
  ],
  // 광고 표현 차단
  ad: [
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
  ],
};

// ============================================================
// ★ 제목 다양성 풀 (commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1). 조립: generator는 소비만.
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}` (region+menu 선두 고정)
//   금지: 광고형 SUFFIX/MIDDLE.
// ============================================================

// ★ 검색어 풀 (제목 끝 검색 키워드 — cat 기준 분기)
export const MEAT_TITLE_SEARCHWORD = {
  '고깃집': ['맛집', '고깃집', '고기집', '식당', '구이'],
  default: ['맛집', '고깃집'],
};

// ★ 제목 패턴 풀 (방문목적 선두 75% : 일반 메뉴형 25%)
export const MEAT_TITLE_PATTERNS_V3 = {
  purposeLead: [
    '{purpose} {region} {menu} {searchword}',
    '{purpose} {region} {menu} {searchword}',
    '{region} {purpose} {menu} {searchword}',
  ],
  menuLead: [
    '{region} {menu} {searchword}',
  ],
};

export const MEAT_TITLE_PATTERNS_STD = [
  '{purpose} {region} {menu} {searchword}',
  '{purpose} {region} {menu} {searchword}',
  '{region} {purpose} {menu} {searchword}',
  '{region} {menu} {searchword}',
];

// 중간 토큰 (메뉴 직후, ｜앞) — MIDDLE = 보조축 '왜 선택하는가'(범용).
//   주축 {purpose}(왜 가는가)는 MEAT_PURPOSE_TITLE_LABEL 소유. 역할 분리 — 중복 금지.
//   ⚠ 범용 토큰만. 메뉴 한정(숯불향·육즙)은 SCENE[메뉴]에서만.
//   ⚠ PHILOSOPHY 정합: 광고 단정('최고·강추') 금지. '~좋은/~편한' 정보형만.
//   ★ 세션14 정합: 범용 토큰 최소화(메뉴 충돌 회피). SCENE 미매칭 안전망용.
export const MEAT_TITLE_MIDDLE = [
  '편하게 구워 먹기 좋은', '여럿이 가기 좋은', '주차 편한',
  '부담 없이 가기 좋은', '저녁 한 끼 하기 좋은', '깔끔한',
];

// 접미 토큰 (｜뒤) — 후기형 (정보형 금지, 세션14 정합)
export const MEAT_TITLE_SUFFIX = [
  '다녀온 곳', '다녀왔어요', '가본 곳', '들렀어요', '찾은 곳',
  '저녁으로', '회식으로', '편하게 한 끼', '오늘은 여기',
  '괜찮았던 곳', '자주 가는 곳', '근처에서', '잘 먹은 곳',
];

// 메뉴 성격별 SCENE 풀 — ★ 보조축 '왜 선택하는가'의 메뉴 한정 버전.
//   MIDDLE(범용) 대신 일정 확률로 치환(generateMeat.js 소비). 메뉴 결에 맞는 선택이유만.
//   키: 정확한 메뉴명. 미매칭 시 MEAT_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
//   ⚠ 메뉴 결 정합: 차돌박이에 '양념 밴' 등 무관 토큰 금지. 광고 단정 금지.
export const MEAT_TITLE_SCENE = {
  // 돼지 구이 — 불판·기름·쌈 결
  '삼겹살':   ['숯불향 즐기기 좋은', '직접 구워 먹는', '여럿이 나눠 먹기 좋은'],
  '목살':     ['담백하게 즐기는', '직접 구워 먹는', '든든하게 먹기 좋은'],
  '항정살':   ['부드럽게 즐기는', '특수부위 맛보기 좋은', '한잔 곁들이기 좋은'],
  '돼지갈비': ['양념 밴 고기 좋아하면', '여럿이 나눠 먹기 좋은', '가족과 먹기 좋은'],
  '생고기':   ['신선하게 구워 먹는', '담백하게 즐기는', '여럿이 나눠 먹기 좋은'],
  // 소 구이 — 음미·특별함 결
  '갈비':     ['제대로 즐기기 좋은', '여럿이 나눠 먹기 좋은', '한 상 차리기 좋은'],
  '소갈비':   ['특별한 날 즐기기 좋은', '부드럽게 즐기는', '귀하게 음미하기 좋은'],
  '차돌박이': ['고소하게 즐기는', '가볍게 구워 먹는', '한잔 곁들이기 좋은'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값 기준. 선택이유형.
export const MEAT_TITLE_SCENE_BY_CATEGORY = {
  '고깃집': ['직접 구워 먹는', '여럿이 나눠 먹기 좋은', '저녁 한 끼 하기 좋은'],
};
