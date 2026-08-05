// lib/cafe-data.js
// 반장닷컴 · commercial-blog · 카페 업종 데이터 (외식 엔진 통일 — restaurant 복사 베이스)
//
// ★ 재설계 (2026-06-28): 업체 카드 8개 → 메뉴 중심 3계열로 전면 전환
//   - 매장/브랜드 없음 (placeholder genericName='카페'만)
//   - DIRECTION = 하이브리드 (BASE_MENU + SITUATION_OVR + PURPOSE_OVR → merge)
//   - 검색의도 키워드: 지역 + 메뉴 + 상황 + 목적
//   - 골격은 restaurant-data.js와 동일 (외식 엔진 통일). 내용만 카페화.
//
// 구조 원칙 (restaurant-data.js와 동일 골격)
//   1. CAFE_TREATMENTS = 조합 카드 (지역×메뉴) — 매장 카드 X
//   2. titlePatterns = {purpose} {region} {menu} {searchword} 형태 동적
//   3. direction 정적맵 X → buildDirection(menu,sit,pur) 함수형
//   4. name 필드 = placeholder ('카페')
//   5. 카테고리(cat) = 메뉴 계열 (커피·디저트·브런치)
//
// ★ 카페 고유 (restaurant와 결이 다른 지점)
//   - sceneCore = 체류·대화·노트북·창가 (음식점의 '맛 풍경'이 아닌 '머무는 풍경')
//   - tasteCore = 산미·바디감·당도·식감
//   - sidedishes → pairing (커피↔디저트 페어링)
//   - Feature(루프탑·애견·대형·야간) = cat 아님 → 본문 자연 삽입 (PURPOSE/Situation으로 흡수)

// ─────────────────────────────────────────────────────────
// 카테고리 (index.js의 CAFE_CATS와 일치) — 메뉴 계열 3종
// ─────────────────────────────────────────────────────────
export const CAFE_CATS = [
  '전체',
  '커피',
  '디저트',   // 빙수 포함 (servingUnit 예외 처리)
  '음료',     // ★ v2-ext 신설: 에이드·말차라떼·밀크티·스무디(비커피)·프라페(커피베이스) (음료, servingUnit: 한 잔)
  '브런치',
];

// ─────────────────────────────────────────────────────────
// REGIONS (확장 가능 — 사용자 지역으로 동적 치환)
// ─────────────────────────────────────────────────────────
export const CAFE_REGIONS = [
  '홍대',
  '공릉동',
  '태릉입구',
  // 확장:
  // '연남동', '성수', '망원', '합정', '상수', '연희동', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 계열별 메뉴 (커피7 · 디저트8 · 브런치3)
// 메뉴별 기본 감성(BASE_DIRECTION) 정의 — 하이브리드 핵심
// ─────────────────────────────────────────────────────────
export const CAFE_MENUS = {
  커피: [
    '아메리카노', '카페라떼', '바닐라라떼', '콜드브루', '디카페인', '에스프레소', '핸드드립',
    '플랫화이트', '아인슈페너',
  ],
  디저트: [
    '크로플', '케이크', '조각케이크', '티라미수', '치즈케이크', '마카롱', '쿠키', '빙수',
    '바스크치즈케이크', '스콘', '휘낭시에', '타르트', '소금빵', '브라우니', '아포가토',
  ],
  음료: [
    '에이드', '말차라떼', '밀크티', '스무디', '프라페', '프라푸치노', '허브티', '과일차', '레몬티', '자몽티', '핫초코', '아이스초코',
  ],
  브런치: [
    '브런치', '샌드위치', '베이글',
    '파니니', '샐러드', '프렌치토스트', '아사이볼',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성
// buildDirection()의 기반. 메뉴 결이 여기서 잡힘.
// ⚠ 광고 표현 금지: "최고", "찐맛집", "강추" 등 절대 사용 X
// ★ 카페: sceneCore = 머무는 풍경 / tasteCore = 맛·향·식감 / pairing = 페어링
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ═══════════════ ① 커피 계열 (servingUnit: 한 잔) ═══════════════
  '아메리카노': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '커피 한 잔 시켜두고 잠깐 앉아 있고 싶어서',
    tasteCore: '산미와 쓴맛의 균형, 깔끔하게 떨어지는 끝맛, 식어도 무난한 밸런스',
    sceneCore: '노트북 펴고 한 잔 시켜둔 손님, 창가 자리에서 오래 머무는 풍경',
    hook: '한 모금 넘기고 나니 자리에 좀 더 앉아 있고 싶어졌어요',
    keyword: '아메리카노',
    servingUnit: '한 잔',
    priceFeel: '부담 없이 한 잔 하기 좋은',
    tableware: '머그 또는 테이크아웃 컵, 물잔, 냅킨',
    sidedishes: ['쿠키', '스콘', '조각케이크'],  // pairing — 함께 곁들이기 좋은
    timeOfDay: ['오전', '오후', '저녁'],
    recommendSituation: '작업·대화·혼자 머물기처럼 한 잔 시켜두고 오래 앉아 있고 싶을 때',
    titlePurpose: '작업하기 좋은',
    portionFeel: '한 잔 기준, 오래 앉아 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·작업용',
    paceFeel: '오래 앉아 천천히 마시는 편 — 회전보다 체류 중심',
    visitTiming: '오전 작업부터 저녁 대화까지 시간대 폭이 넓은 편',
    bestCompanion: '혼자·작업 동행·가벼운 대화 상대',
    decisionPoint: '오래 앉아 작업하거나 대화할 자리면 아메리카노가 무난, 단맛이 당기면 라떼 계열을 고르는 편',
  },

  '카페라떼': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '부드러운 커피 한 잔 하면서 대화하러',
    tasteCore: '에스프레소와 우유의 부드러운 균형, 고소한 끝맛, 적당한 바디감',
    sceneCore: '마주 앉아 천천히 이야기 나누는 손님들, 잔 비워질 때까지 머무는 풍경',
    hook: '거품 위 라떼아트가 흐트러질 때쯤 대화가 한참 무르익었어요',
    keyword: '카페라떼',
    servingUnit: '한 잔',
    priceFeel: '부드럽게 한 잔 하기 좋은',
    tableware: '머그, 받침잔, 냅킨',
    sidedishes: ['크로플', '마카롱', '치즈케이크'],
    timeOfDay: ['오전', '오후', '저녁'],
    recommendSituation: '데이트·대화·모임처럼 부드러운 한 잔 하며 천천히 머물고 싶을 때',
    titlePurpose: '대화하기 좋은',
    portionFeel: '한 잔 기준, 부드러워 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 취향대로 시키는 구성',
    usageType: '대화·체류용',
    paceFeel: '천천히 마시며 오래 앉는 편',
    visitTiming: '오후 대화 시간대에 특히 무난',
    bestCompanion: '연인·친구·가벼운 모임',
    decisionPoint: '부드러운 맛으로 대화하며 머물 자리면 라떼가 무난, 깔끔한 맛이면 아메리카노를 고르는 편',
  },

  '바닐라라떼': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '달달한 커피 한 잔으로 기분 전환하러',
    tasteCore: '바닐라 향과 우유의 단맛, 끝에 은은하게 남는 에스프레소, 디저트 같은 한 잔',
    sceneCore: '달달한 한 잔에 디저트까지 곁들여 천천히 머무는 손님들 풍경',
    hook: '한 모금에 바닐라 향이 확 올라와서 기분이 풀렸어요',
    keyword: '바닐라라떼',
    servingUnit: '한 잔',
    priceFeel: '달달하게 한 잔 하기 좋은',
    tableware: '머그, 받침잔, 냅킨',
    sidedishes: ['케이크', '쿠키', '크로플'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·혼자 기분 전환·당 충전처럼 달달한 한 잔이 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 잔 기준, 달아서 디저트 대신으로도 무난한 편',
    sharingFeel: '1인 1잔 중심',
    usageType: '기분 전환·체류용',
    paceFeel: '천천히 음미하며 마시는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·혼자',
    decisionPoint: '달달한 한 잔이 당기면 바닐라라떼가 무난, 단맛이 부담되면 아메리카노를 고르는 편',
  },

  '콜드브루': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '진하고 시원한 커피 한 잔 하러',
    tasteCore: '저온 추출 특유의 부드러운 쓴맛, 산미 적고 깊은 바디, 얼음에 천천히 희석되는 맛',
    sceneCore: '얼음 잔 하나 시켜두고 노트북 보며 오래 머무는 손님 풍경',
    hook: '얼음 사이로 진한 커피가 깔리는 게 보여서 한참을 천천히 마셨어요',
    keyword: '콜드브루',
    servingUnit: '한 잔',
    priceFeel: '진하게 한 잔 하기 좋은',
    tableware: '유리잔, 빨대, 냅킨',
    sidedishes: ['쿠키', '베이글', '치즈케이크'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '작업·더운 날·진한 커피 선호처럼 시원하게 오래 마시고 싶을 때',
    titlePurpose: '작업하기 좋은',
    portionFeel: '한 잔 기준, 얼음 녹는 동안 오래 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심',
    usageType: '체류·작업용',
    paceFeel: '얼음 녹는 속도로 천천히 마시는 편',
    visitTiming: '오전 작업·더운 오후에 특히 무난',
    bestCompanion: '혼자·작업 동행',
    decisionPoint: '진하고 시원한 커피로 오래 머물 자리면 콜드브루가 무난, 따뜻한 게 당기면 아메리카노를 고르는 편',
  },

  '디카페인': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '늦은 시간에도 부담 없이 커피 한 잔 하러',
    tasteCore: '카페인 걱정 없는 부드러운 맛, 일반 커피와 큰 차이 없는 향, 속 편한 한 잔',
    sceneCore: '저녁 늦게도 커피 한 잔 시켜두고 대화 이어가는 손님 풍경',
    hook: '늦은 시간인데 커피가 당겨서 디카페인으로 한 잔 시켰어요',
    keyword: '디카페인',
    servingUnit: '한 잔',
    priceFeel: '부담 없이 한 잔 하기 좋은',
    tableware: '머그 또는 유리잔, 냅킨',
    sidedishes: ['케이크', '쿠키', '마카롱'],
    timeOfDay: ['오후', '저녁', '밤'],
    recommendSituation: '늦은 저녁·임산부·카페인 민감처럼 부담 없이 커피 맛만 즐기고 싶을 때',
    titlePurpose: '늦은 저녁 가기 좋은',
    portionFeel: '한 잔 기준, 늦은 시간에도 부담 적은 편',
    sharingFeel: '1인 1잔 중심',
    usageType: '체류·대화용',
    paceFeel: '천천히 마시며 오래 앉는 편',
    visitTiming: '저녁·밤 시간대에 특히 무난',
    bestCompanion: '연인·친구·가족',
    decisionPoint: '늦은 시간 커피가 당기는데 카페인이 부담되면 디카페인이 무난, 괜찮으면 일반 커피를 고르는 편',
  },

  '에스프레소': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '진한 커피 한 잔 짧게 즐기러',
    tasteCore: '농축된 향과 크레마, 강한 바디와 여운, 작지만 진한 한 잔',
    sceneCore: '바 자리에서 한 잔 짧게 즐기고 가는 손님, 커피에 진심인 분위기',
    hook: '작은 잔인데 향이 한참 입안에 남아서 잠깐 멈칫했어요',
    keyword: '에스프레소',
    servingUnit: '한 잔',
    priceFeel: '진하게 한 잔 즐기기 좋은',
    tableware: '데미타스 잔, 받침, 물잔',
    sidedishes: ['쿠키', '마카롱', '조각케이크'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피 애호·식후 한 잔·짧은 방문처럼 진한 커피만 빠르게 즐기고 싶을 때',
    titlePurpose: '커피 좋아하면 가기 좋은',
    portionFeel: '작은 한 잔 기준, 짧고 진하게 즐기는 편',
    sharingFeel: '1인 1잔 중심',
    usageType: '커피 음미용',
    paceFeel: '짧게 즐기고 가는 편 — 체류보다 음미 중심',
    visitTiming: '오전·식후 시간대에 특히 무난',
    bestCompanion: '혼자·커피 좋아하는 동행',
    decisionPoint: '진한 커피만 짧게 즐길 거면 에스프레소가 무난, 오래 앉을 거면 아메리카노·라떼를 고르는 편',
  },

  '핸드드립': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '천천히 내린 커피 한 잔 음미하러',
    tasteCore: '원두별 산미와 향의 개성, 깔끔한 후미, 내리는 방식에 따라 달라지는 결',
    sceneCore: '바리스타가 천천히 내리는 모습 보며 기다리는 손님, 조용히 음미하는 분위기',
    hook: '드립 내리는 시간 동안 향이 먼저 퍼져서 기대가 됐어요',
    keyword: '핸드드립',
    servingUnit: '한 잔',
    priceFeel: '천천히 음미하기 좋은',
    tableware: '드리퍼, 서버, 잔, 받침',
    sidedishes: ['쿠키', '치즈케이크', '스콘'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피 애호·조용한 시간·혼자 음미처럼 원두 개성을 천천히 즐기고 싶을 때',
    titlePurpose: '조용히 가기 좋은',
    portionFeel: '한 잔 기준, 향과 맛을 천천히 음미하는 편',
    sharingFeel: '1인 1잔 중심',
    usageType: '커피 음미·체류용',
    paceFeel: '천천히 음미하며 오래 앉는 편',
    visitTiming: '한가한 오전·오후에 특히 무난',
    bestCompanion: '혼자·커피 좋아하는 동행',
    decisionPoint: '원두 개성을 천천히 음미할 거면 핸드드립이 무난, 편하게 마실 거면 아메리카노를 고르는 편',
  },
};

// ═══════════════ ② 디저트 계열 (servingUnit: 한 조각/한 개, 빙수=한 그릇 예외) ═══════════════
Object.assign(MENU_BASE_DIRECTION, {
  '크로플': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '겉바속촉 디저트 하나 곁들이러',
    tasteCore: '겉은 바삭 속은 촉촉한 결, 버터 향, 시럽·아이스크림과의 단짠 조합',
    sceneCore: '갓 나온 크로플 사진부터 찍고 커피와 함께 천천히 먹는 손님 풍경',
    hook: '포크로 가르니 결 사이로 김이 올라와서 바로 한 입 했어요',
    keyword: '크로플',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '바닐라라떼'],  // pairing — 커피
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·디저트 타임·당 충전처럼 커피에 디저트 하나 곁들이고 싶을 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 커피와 나눠 먹기 좋은 편',
    sharingFeel: '둘이 하나 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '갓 구운 따뜻한 디저트가 당기면 크로플이 무난, 차가운 게 당기면 케이크류를 고르는 편',
  },
  '케이크': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피랑 케이크 한 조각 곁들이러',
    tasteCore: '촉촉한 시트와 부드러운 크림, 과하지 않은 당도, 커피와의 균형',
    sceneCore: '쇼케이스에서 한 조각 골라 커피와 함께 천천히 먹는 손님 풍경',
    hook: '포크로 한 입 떠보니 생각보다 안 달아서 커피랑 잘 맞았어요',
    keyword: '케이크',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '핸드드립'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·기념일·디저트 타임처럼 커피에 케이크 한 조각 곁들이고 싶을 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 둘이 나눠 먹기에도 무난',
    sharingFeel: '나눠 먹기 좋은 구성',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구·가족',
    decisionPoint: '부드러운 디저트가 당기면 케이크가 무난, 진한 맛이면 치즈케이크·티라미수를 고르는 편',
  },
  '조각케이크': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '부담 없이 케이크 한 조각만 맛보러',
    tasteCore: '한 조각 사이즈의 적당한 양, 종류별로 다른 시트·크림 결, 커피 한 잔과 딱',
    sceneCore: '쇼케이스 앞에서 종류 고민하다 한 조각 골라 자리로 가는 손님 풍경',
    hook: '여러 종류 중에 하나 고르는 재미가 있어서 한참 들여다봤어요',
    keyword: '조각케이크',
    servingUnit: '한 조각',
    priceFeel: '한 조각 부담 없이 맛보기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '디카페인'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '혼자 디저트·가벼운 당 충전·맛보기처럼 한 조각만 부담 없이 즐기고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 조각 기준, 혼자 먹기 딱 좋은 양',
    sharingFeel: '1인 1조각 또는 나눠 먹기 모두 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후 디저트 타임에 특히 무난',
    bestCompanion: '혼자·연인·친구',
    decisionPoint: '여러 종류 맛보고 싶으면 조각케이크가 무난, 하나를 제대로 즐길 거면 홀케이크·티라미수를 고르는 편',
  },
  '티라미수': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피 향 나는 디저트 하나 즐기러',
    tasteCore: '마스카포네의 부드러움과 에스프레소 시럽, 코코아의 쌉싸름함, 커피와 닮은 결',
    sceneCore: '스푼으로 떠먹으며 커피와 번갈아 즐기는 손님, 차분한 디저트 타임 풍경',
    hook: '한 스푼 떠먹으니 커피 향이 디저트에서 먼저 올라왔어요',
    keyword: '티라미수',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 볼 또는 접시, 스푼, 냅킨',
    sidedishes: ['아메리카노', '에스프레소', '핸드드립'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·커피 디저트 선호·차분한 시간처럼 커피 향 나는 디저트가 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 진해서 천천히 떠먹기 좋은 편',
    sharingFeel: '둘이 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '스푼으로 천천히 떠먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '커피 향 디저트가 당기면 티라미수가 무난, 가벼운 게 당기면 마카롱·쿠키를 고르는 편',
  },
  '치즈케이크': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '진한 치즈 디저트 하나 즐기러',
    tasteCore: '꾸덕하거나 부드러운 치즈의 농밀함, 적당한 산미, 진한 커피와의 균형',
    sceneCore: '한 조각 시켜두고 진한 커피와 번갈아 즐기는 손님 풍경',
    hook: '포크가 들어갈 때 꾸덕한 단면이 보여서 바로 한 입 했어요',
    keyword: '치즈케이크',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '콜드브루', '핸드드립'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·진한 디저트 선호·당 충전처럼 농밀한 치즈 디저트가 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 진해서 나눠 먹기에도 무난',
    sharingFeel: '둘이 나눠 먹기 좋은 편',
    usageType: '디저트·체류용',
    paceFeel: '진한 커피와 함께 천천히 먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '진한 디저트가 당기면 치즈케이크가 무난, 가벼운 게 당기면 일반 케이크를 고르는 편',
  },
  '마카롱': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피랑 곁들일 작은 디저트 고르러',
    tasteCore: '바삭한 꼬끄와 쫀득한 속, 필링별로 다른 단맛, 한 입 사이즈의 강한 당도',
    sceneCore: '색색의 마카롱 중에 골라 커피와 한 입씩 즐기는 손님 풍경',
    hook: '한 입 베어무니 겉은 바삭 속은 쫀득해서 색깔별로 더 골랐어요',
    keyword: '마카롱',
    servingUnit: '한 개',
    priceFeel: '한 입 디저트로 곁들이기 좋은',
    tableware: '디저트 접시, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '디카페인'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·선물·가벼운 당 충전처럼 작은 디저트를 골라 즐기고 싶을 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 개 기준, 여러 종류 조금씩 맛보기 좋은 편',
    sharingFeel: '여러 개 시켜 나눠 먹기 좋은 구성',
    usageType: '디저트·선물용',
    paceFeel: '커피와 함께 한 입씩 즐기는 편',
    visitTiming: '오후 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '여러 맛 조금씩 즐기거나 선물할 거면 마카롱이 무난, 든든한 디저트면 케이크류를 고르는 편',
  },
  '쿠키': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피에 곁들일 가벼운 디저트 하나',
    tasteCore: '겉은 바삭 속은 쫀득한 결, 초코·견과의 고소함, 진한 커피와의 단짠 균형',
    sceneCore: '큼직한 쿠키 하나 시켜두고 커피와 베어 무는 손님 풍경',
    hook: '반으로 쪼개니 안쪽이 촉촉해서 커피랑 번갈아 먹었어요',
    keyword: '쿠키',
    servingUnit: '한 개',
    priceFeel: '커피랑 가볍게 곁들이기 좋은',
    tableware: '디저트 접시, 냅킨',
    sidedishes: ['아메리카노', '콜드브루', '카페라떼'],
    timeOfDay: ['오전', '오후', '저녁'],
    recommendSituation: '작업·혼자·가벼운 당 충전처럼 커피에 부담 없이 곁들이고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 개 기준, 가볍게 곁들이기 좋은 편',
    sharingFeel: '1인 1개 또는 나눠 먹기 모두 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '시간대 폭이 넓어 언제든 무난',
    bestCompanion: '혼자·작업 동행·친구',
    decisionPoint: '가볍게 곁들일 디저트면 쿠키가 무난, 제대로 된 디저트면 케이크류를 고르는 편',
  },
  '빙수': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '더운 날 시원한 디저트 하나 나눠 먹으러',
    tasteCore: '곱게 간 얼음 또는 우유 베이스, 토핑별 단맛, 시원하게 떠먹는 식감',
    sceneCore: '큰 그릇 하나 가운데 두고 여럿이 스푼으로 나눠 먹는 풍경',
    hook: '큰 그릇이 나오자마자 다 같이 스푼부터 들었어요',
    keyword: '빙수',
    servingUnit: '한 그릇',  // ★ 디저트 계열 예외 servingUnit
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '빙수 그릇, 스푼 여러 개, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '콜드브루'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '모임·더운 날·여럿이 방문처럼 시원한 디저트를 나눠 먹고 싶을 때',
    titlePurpose: '모임하기 좋은',
    portionFeel: '한 그릇 기준, 2~3명이 나눠 먹기 좋은 양',
    sharingFeel: '여럿이 나눠 먹는 구성 — 혼자보다 함께',
    usageType: '디저트·모임용',
    paceFeel: '여럿이 천천히 떠먹으며 오래 앉는 편',
    visitTiming: '더운 계절·오후 시간대에 특히 무난',
    bestCompanion: '친구·가족·모임',
    decisionPoint: '여럿이 시원한 디저트를 나눌 거면 빙수가 무난, 혼자거나 따뜻한 게 당기면 케이크류를 고르는 편',
  },
});

// ═══════════════ ③ 브런치 계열 (servingUnit: 한 접시) ═══════════════
Object.assign(MENU_BASE_DIRECTION, {
  '브런치': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '느지막이 일어나 제대로 된 한 끼 하러',
    tasteCore: '에그·샐러드·빵의 구성, 든든하면서 무겁지 않은 한 접시, 커피와의 조합',
    sceneCore: '햇살 드는 자리에서 접시 펼쳐두고 여유롭게 먹는 주말 손님 풍경',
    hook: '접시가 나오자 구성이 알차서 사진부터 한 장 찍었어요',
    keyword: '브런치',
    servingUnit: '한 접시',
    priceFeel: '한 끼 제대로 하기 좋은',
    tableware: '플레이트, 나이프·포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '콜드브루'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '데이트·주말 모임·늦은 아침처럼 여유롭게 한 끼와 커피를 함께하고 싶을 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 접시 기준, 한 끼로 든든한 편',
    sharingFeel: '1인 1접시 중심 — 각자 시키는 구성',
    usageType: '식사·체류용',
    paceFeel: '여유롭게 한 끼 하며 오래 앉는 편',
    visitTiming: '주말 오전·점심 시간대에 특히 무난',
    bestCompanion: '연인·친구·가족',
    decisionPoint: '여유롭게 제대로 된 한 끼면 브런치가 무난, 가볍게 먹을 거면 샌드위치·베이글을 고르는 편',
  },
  '샌드위치': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '커피랑 가볍게 한 끼 때우러',
    tasteCore: '신선한 채소와 속재료, 빵의 식감, 무겁지 않게 한 끼 되는 구성',
    sceneCore: '커피 한 잔에 샌드위치 하나 시켜두고 가볍게 끼니 챙기는 손님 풍경',
    hook: '한 입 베어무니 속이 꽉 차 있어서 한 끼로 충분했어요',
    keyword: '샌드위치',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '플레이트, 냅킨',
    sidedishes: ['아메리카노', '콜드브루', '카페라떼'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '작업·혼자·가벼운 한 끼처럼 커피와 함께 부담 없이 끼니 챙기고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 접시 기준, 가벼운 한 끼로 무난한 편',
    sharingFeel: '1인 1개 중심',
    usageType: '식사·체류용',
    paceFeel: '커피와 함께 가볍게 먹는 편',
    visitTiming: '점심·오후 시간대에 특히 무난',
    bestCompanion: '혼자·작업 동행·친구',
    decisionPoint: '가볍게 한 끼면 샌드위치가 무난, 든든하게 먹을 거면 브런치를 고르는 편',
  },
  '베이글': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '쫀득한 빵에 커피 한 잔 하러',
    tasteCore: '쫄깃한 식감, 크림치즈·스프레드와의 조합, 커피와 잘 맞는 담백함',
    sceneCore: '베이글 하나 데워 나오면 크림치즈 발라가며 커피와 먹는 손님 풍경',
    hook: '갓 데운 베이글에 크림치즈를 바르니 향부터 좋았어요',
    keyword: '베이글',
    servingUnit: '한 접시',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '플레이트, 버터나이프, 냅킨',
    sidedishes: ['아메리카노', '콜드브루', '카페라떼'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '작업·혼자·가벼운 아침처럼 쫀득한 빵에 커피를 곁들이고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 접시 기준, 가벼운 한 끼나 간식으로 무난',
    sharingFeel: '1인 1개 또는 나눠 먹기 모두 무난',
    usageType: '식사·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오전·점심 시간대에 특히 무난',
    bestCompanion: '혼자·작업 동행·친구',
    decisionPoint: '쫀득한 빵에 커피 곁들일 거면 베이글이 무난, 채소 든 한 끼면 샌드위치를 고르는 편',
  },

  // ═══════════════ [APPEND v2-ext] 커피 계열 추가 ═══════════════
  '플랫화이트': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '진한 커피에 우유 살짝, 부드러운 한 잔 하러',
    tasteCore: '에스프레소 비중이 높아 진한 커피 맛, 얇은 우유 거품, 라떼보다 묵직한 균형',
    sceneCore: '작은 잔에 담겨 나온 한 잔을 천천히 음미하는 손님 풍경',
    hook: '라떼보다 커피 맛이 또렷해서 한 모금에 잠이 깼어요',
    keyword: '플랫화이트',
    servingUnit: '한 잔',
    priceFeel: '진하게 한 잔 하기 좋은',
    tableware: '머그 또는 작은 잔, 물잔, 냅킨',
    sidedishes: ['크로플', '스콘', '쿠키'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '진한 커피를 부드럽게 즐기고 싶거나 잠을 깨고 싶을 때',
    titlePurpose: '작업하기 좋은',
    portionFeel: '한 잔 기준, 진해서 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·작업용',
    paceFeel: '진한 맛을 천천히 음미하는 편',
    visitTiming: '오전·오후 작업 시간대에 무난',
    bestCompanion: '혼자·작업 동행·가벼운 대화 상대',
    decisionPoint: '커피 맛이 또렷한 게 당기면 플랫화이트가 무난, 부드러운 게 당기면 카페라떼를 고르는 편',
  },

  '아인슈페너': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '진한 커피 위 크림 얹어 달달하게 한 잔 하러',
    tasteCore: '진한 커피 위 부드러운 크림, 휘저으면 달달, 안 휘저으면 쌉싸름, 두 가지 맛',
    sceneCore: '크림 올라간 잔을 사진 먼저 찍고 천천히 마시는 손님 풍경',
    hook: '크림이랑 같이 한 모금 하니 디저트 안 시켜도 될 만큼 달달했어요',
    keyword: '아인슈페너',
    servingUnit: '한 잔',
    priceFeel: '달달하게 한 잔 하기 좋은',
    tableware: '유리잔 또는 머그, 빨대, 냅킨',
    sidedishes: ['케이크', '크로플', '쿠키'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·당 충전·기분 전환처럼 달달한 커피 한 잔이 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 잔 기준, 크림 덕에 디저트 대신으로도 무난한 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '디저트·체류용',
    paceFeel: '크림과 커피를 천천히 즐기는 편',
    visitTiming: '오후 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '달달한 커피가 당기면 아인슈페너가 무난, 깔끔한 게 당기면 아메리카노를 고르는 편',
  },

  // ═══════════════ [APPEND v2-ext] 음료(drink) 계열 신설 (servingUnit: 한 잔) ═══════════════
  '에이드': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '커피 말고 상큼하고 시원한 한 잔 하러',
    tasteCore: '탄산의 청량감과 과일의 새콤달콤함, 얼음 가득한 시원함, 갈증을 덜어주는 한 잔',
    sceneCore: '색이 예쁜 잔을 사진 먼저 찍고 시원하게 들이켜는 손님 풍경',
    hook: '한 모금 넘기니 탄산이 톡 쏘면서 더위가 좀 가셨어요',
    keyword: '에이드',
    servingUnit: '한 잔',
    priceFeel: '시원하게 한 잔 하기 좋은',
    tableware: '유리잔, 빨대, 냅킨',
    sidedishes: ['크로플', '케이크', '샌드위치'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '더운 날·커피가 부담될 때·상큼한 한 잔이 당길 때',
    titlePurpose: '더운 날 가기 좋은',
    portionFeel: '한 잔 기준, 얼음 많아 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '시원하게 마시며 천천히 머무는 편',
    visitTiming: '오후·저녁, 특히 더운 시간대에 무난',
    bestCompanion: '친구·연인·가족',
    decisionPoint: '커피가 부담되거나 상큼한 게 당기면 에이드가 무난, 진한 맛이면 커피류를 고르는 편',
  },

  '말차라떼': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '쌉싸름하고 부드러운 녹차 한 잔 하러',
    tasteCore: '말차 특유의 쌉싸름함과 우유의 부드러움, 진한 녹차 향, 달지 않게도 즐기는 한 잔',
    sceneCore: '초록빛 한 잔을 천천히 음미하며 머무는 손님 풍경',
    hook: '쌉싸름한 맛이 우유랑 섞이니 생각보다 부드러워서 좋았어요',
    keyword: '말차라떼',
    servingUnit: '한 잔',
    priceFeel: '부드럽게 한 잔 하기 좋은',
    tableware: '머그 또는 유리잔, 물잔, 냅킨',
    sidedishes: ['케이크', '휘낭시에', '쿠키'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피 대신 부드러운 한 잔·차분하게 머물고 싶을 때',
    titlePurpose: '혼자 마시기 좋은',
    portionFeel: '한 잔 기준, 부드러워 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '부드러운 맛을 천천히 음미하는 편',
    visitTiming: '오전·오후 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '커피 말고 부드러운 게 당기면 말차라떼가 무난, 달달한 게 당기면 바닐라라떼를 고르는 편',
  },

  '밀크티': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '달달하고 부드러운 차 한 잔 하러',
    tasteCore: '홍차의 깊은 향과 우유의 부드러움, 은은한 단맛, 차분하게 즐기는 한 잔',
    sceneCore: '따뜻하거나 시원한 한 잔을 두 손에 쥐고 천천히 마시는 손님 풍경',
    hook: '한 모금 하니 홍차 향이 우유랑 어우러져서 마음이 편해졌어요',
    keyword: '밀크티',
    servingUnit: '한 잔',
    priceFeel: '부드럽게 한 잔 하기 좋은',
    tableware: '머그 또는 유리잔, 빨대, 냅킨',
    sidedishes: ['스콘', '쿠키', '케이크'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피 대신 달달한 차·편안하게 머물고 싶을 때',
    titlePurpose: '혼자 마시기 좋은',
    portionFeel: '한 잔 기준, 부드러워 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '부드러운 맛을 천천히 음미하는 편',
    visitTiming: '오후·저녁 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '달달하고 부드러운 차가 당기면 밀크티가 무난, 쌉싸름한 게 당기면 말차라떼를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) 신규 데이터 — 스무디 (2026-06-28) ───
  //   비커피·과일 베이스 음료. servingUnit='한 잔'(에이드/말차/밀크티 계열 정합).
  //   에이드와 경계: 에이드=탄산·새콤달콤 / 스무디=과일·요거트 갈아낸 걸쭉함·포만감. decisionPoint로 분리.
  '스무디': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '커피 말고 과일 갈아낸 시원한 한 잔 하러',
    tasteCore: '과일을 통째로 갈아낸 진한 과육감과 걸쭉한 질감, 새콤달콤하면서 든든한 한 잔',
    sceneCore: '두툼한 잔을 빨대로 천천히 떠먹듯 마시는 손님 풍경',
    hook: '과일이 그대로 씹히는 듯 진해서 한 잔만으로도 든든했어요',
    keyword: '스무디',
    servingUnit: '한 잔',
    priceFeel: '과일 갈아 한 잔 하기 좋은',
    tableware: '두툼한 유리잔, 굵은 빨대, 냅킨',
    sidedishes: ['크로플', '샌드위치', '쿠키'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피가 부담될 때·가볍게 과일을 채우고 싶을 때·더운 날',
    titlePurpose: '가볍게 마시기 좋은',
    portionFeel: '한 잔 기준, 걸쭉해 포만감 있어 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '걸쭉한 질감을 천천히 떠 마시는 편',
    visitTiming: '오전·오후 시간대에 무난',
    bestCompanion: '혼자·친구·가족',
    decisionPoint: '과일을 갈아낸 든든한 게 당기면 스무디가 무난, 탄산의 청량함이 당기면 에이드를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) 신규 데이터 — 프라페 (2026-06-28) ───
  //   커피 베이스(에스프레소+얼음 블렌딩) 음료 → coffee 오염 위험 최상. tasteCore/decisionPoint에서
  //   '뜨거운 커피'·아메리카노/라떼 영역과 경계 명확화. 본질(시원하게 갈아낸 달콤한 커피음료)은 유지.
  //   servingUnit='한 잔'(음료 계열 정합). cat='음료'.
  '프라페': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '커피를 시원하고 달콤하게 갈아 한 잔 하러',
    tasteCore: '얼음과 함께 갈아낸 부드러운 거품감, 달콤하면서 은은한 커피 풍미, 시원하게 떠 마시는 한 잔',
    sceneCore: '휘핑 올린 잔을 빨대로 떠 마시며 더위를 식히는 손님 풍경',
    hook: '얼음이랑 갈려서 부드럽고, 달콤한 커피 맛이 시원하게 넘어갔어요',
    keyword: '프라페',
    servingUnit: '한 잔',
    priceFeel: '시원하게 한 잔 하기 좋은',
    tableware: '두툼한 유리잔, 굵은 빨대, 냅킨',
    sidedishes: ['크로플', '케이크', '쿠키'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '더운 날·달콤하고 시원한 커피가 당길 때·디저트처럼 즐기고 싶을 때',
    titlePurpose: '시원하게 마시기 좋은',
    portionFeel: '한 잔 기준, 부드러운 거품감에 천천히 떠 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '시원한 거품을 천천히 떠 마시는 편',
    visitTiming: '오후·저녁, 특히 더운 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '시원하고 달콤한 커피가 당기면 프라페가 무난, 뜨겁고 깔끔한 커피가 당기면 아메리카노를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 프라푸치노 (2026-06-28 세션3) ───
  //   프라페와 동일 음료군(커피베이스 블렌딩). 데이터는 프라페와 동일 톤 복제 — keyword만 '프라푸치노'.
  //   엔진(generateCafe/cafe-prompts)이 treatment.menu 단일 소스로 BASE_DIRECTION을 조회하므로
  //   표시명=데이터키 일치가 강제됨 → menuRef 공유 불가 → 독립 키로 신설(유형 B). cat='음료'.
  '프라푸치노': {
    genericName: '카페',
    altGenericNames: ['카페', '커피숍', '여기'],
    motive: '커피를 시원하고 달콤하게 갈아 한 잔 하러',
    tasteCore: '얼음과 함께 갈아낸 부드러운 거품감, 달콤하면서 은은한 커피 풍미, 시원하게 떠 마시는 한 잔',
    sceneCore: '휘핑 올린 잔을 빨대로 떠 마시며 더위를 식히는 손님 풍경',
    hook: '얼음이랑 갈려서 부드럽고, 달콤한 커피 맛이 시원하게 넘어갔어요',
    keyword: '프라푸치노',
    servingUnit: '한 잔',
    priceFeel: '시원하게 한 잔 하기 좋은',
    tableware: '두툼한 유리잔, 굵은 빨대, 냅킨',
    sidedishes: ['크로플', '케이크', '쿠키'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '더운 날·달콤하고 시원한 커피가 당길 때·디저트처럼 즐기고 싶을 때',
    titlePurpose: '시원하게 마시기 좋은',
    portionFeel: '한 잔 기준, 부드러운 거품감에 천천히 떠 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·기분전환용',
    paceFeel: '시원한 거품을 천천히 떠 마시는 편',
    visitTiming: '오후·저녁, 특히 더운 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '시원하고 달콤한 커피가 당기면 프라푸치노가 무난, 뜨겁고 깔끔한 커피가 당기면 아메리카노를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 허브티 (2026-06-28 세션3) ───
  //   차(茶) 계열. 카페인 없는 꽃·잎 우린 향 중심 → 밀크티(홍차+우유)·말차라떼(쌉싸름)와 경계 분리.
  //   servingUnit='한 잔'(차 계열 정합). cat='음료'. 커피군 오염 방지 위해 tasteCore에 '커피 아님' 결 명시.
  '허브티': {
    genericName: '카페',
    altGenericNames: ['카페', '찻집', '여기'],
    motive: '카페인 없이 향긋한 차 한 잔 하러',
    tasteCore: '꽃과 잎을 우려낸 은은한 향, 카페인 없이 부드럽게 넘어가는 맛, 따뜻하게 또는 시원하게 즐기는 한 잔',
    sceneCore: '김이 피어오르는 잔을 두 손에 쥐고 향을 맡으며 천천히 마시는 손님 풍경',
    hook: '꽃향이 은은하게 올라와서 한 모금 하니 속이 편안해졌어요',
    keyword: '허브티',
    servingUnit: '한 잔',
    priceFeel: '편안하게 한 잔 하기 좋은',
    tableware: '도자기 잔 또는 유리 티포트, 받침, 냅킨',
    sidedishes: ['스콘', '쿠키', '마들렌'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 피하고 싶을 때·속을 편하게 하고 싶을 때·향긋하게 머물고 싶을 때',
    titlePurpose: '편안하게 마시기 좋은',
    portionFeel: '한 잔 기준, 향을 음미하며 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키거나 티포트로 나눠 마시는 구성',
    usageType: '체류·휴식용',
    paceFeel: '따뜻한 향을 천천히 음미하는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶은 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '카페인 없이 향긋한 차가 당기면 허브티가 무난, 달달하고 진한 차가 당기면 밀크티를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 과일차 (2026-06-28 세션4) ───
  //   차(茶) 계열. 생과일·청을 우려낸 새콤달콤 과일 향 중심 → 허브티(꽃·잎 향)·밀크티(홍차+우유)와 경계 분리.
  //   servingUnit='한 잔'(차 계열 정합). cat='음료'. 커피군 오염 방지 위해 tasteCore에 '커피 아님' 결 명시.
  '과일차': {
    genericName: '카페',
    altGenericNames: ['카페', '찻집', '여기'],
    motive: '새콤달콤한 과일차 한 잔 하러',
    tasteCore: '생과일과 청을 우려낸 새콤달콤한 과일 향, 카페인 없이 상큼하게 넘어가는 맛, 따뜻하게 또는 시원하게 즐기는 한 잔',
    sceneCore: '과일 조각이 띄워진 잔을 손에 쥐고 향을 맡으며 천천히 마시는 손님 풍경',
    hook: '과일 향이 상큼하게 올라와서 한 모금 하니 기분이 산뜻해졌어요',
    keyword: '과일차',
    servingUnit: '한 잔',
    priceFeel: '상큼하게 한 잔 하기 좋은',
    tableware: '유리잔 또는 티포트, 받침, 냅킨',
    sidedishes: ['스콘', '쿠키', '마들렌'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 피하고 싶을 때·상큼하게 기분 전환하고 싶을 때·향긋하게 머물고 싶을 때',
    titlePurpose: '상큼하게 마시기 좋은',
    portionFeel: '한 잔 기준, 과일 향을 음미하며 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키거나 티포트로 나눠 마시는 구성',
    usageType: '체류·휴식용',
    paceFeel: '상큼한 향을 천천히 음미하는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶은 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '커피 없이 상큼한 과일 향이 당기면 과일차가 무난, 카페인 없이 은은한 꽃·잎 향이 당기면 허브티를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 레몬티 (2026-06-28 세션4) ───
  //   차(茶) 계열. 레몬 단일 새콤·산뜻 결 중심 → 과일차(여러 과일 새콤달콤)·허브티(꽃·잎 향)와 경계 분리.
  //   servingUnit='한 잔'(차 계열 정합). cat='음료'. 커피군 오염 방지 위해 tasteCore에 '커피 아님' 결 명시.
  '레몬티': {
    genericName: '카페',
    altGenericNames: ['카페', '찻집', '여기'],
    motive: '새콤 산뜻한 레몬티 한 잔 하러',
    tasteCore: '레몬을 우려낸 새콤하고 산뜻한 향, 카페인 없이 깔끔하게 넘어가는 맛, 따뜻하게 또는 시원하게 즐기는 한 잔',
    sceneCore: '레몬 조각이 띄워진 잔을 손에 쥐고 산뜻한 향을 맡으며 천천히 마시는 손님 풍경',
    hook: '레몬 향이 새콤하게 올라와서 한 모금 하니 입안이 산뜻해졌어요',
    keyword: '레몬티',
    servingUnit: '한 잔',
    priceFeel: '산뜻하게 한 잔 하기 좋은',
    tableware: '유리잔 또는 티포트, 받침, 냅킨',
    sidedishes: ['스콘', '쿠키', '마들렌'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 피하고 싶을 때·산뜻하게 입가심하고 싶을 때·새콤하게 기분 전환하고 싶을 때',
    titlePurpose: '산뜻하게 마시기 좋은',
    portionFeel: '한 잔 기준, 새콤한 향을 음미하며 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키거나 티포트로 나눠 마시는 구성',
    usageType: '체류·휴식용',
    paceFeel: '산뜻한 향을 천천히 음미하는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶은 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '레몬 한 가지로 새콤 산뜻한 결이 당기면 레몬티가 무난, 여러 과일 새콤달콤한 결이 당기면 과일차를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 자몽티 (2026-06-28 세션4) ───
  //   차(茶) 계열. 자몽 특유의 새콤+쌉싸름 결 중심 → 레몬티(산뜻한 새콤)·과일차(여러 과일 새콤달콤)와 경계 분리.
  //   servingUnit='한 잔'(차 계열 정합). cat='음료'. 커피군 오염 방지 위해 tasteCore에 '커피 아님' 결 명시.
  '자몽티': {
    genericName: '카페',
    altGenericNames: ['카페', '찻집', '여기'],
    motive: '새콤 쌉싸름한 자몽티 한 잔 하러',
    tasteCore: '자몽을 우려낸 새콤하면서 은은하게 쌉싸름한 향, 카페인 없이 깔끔하게 넘어가는 맛, 따뜻하게 또는 시원하게 즐기는 한 잔',
    sceneCore: '자몽 과육이 비치는 잔을 손에 쥐고 새콤한 향을 맡으며 천천히 마시는 손님 풍경',
    hook: '자몽 향이 새콤하게 올라오면서 끝에 살짝 쌉싸름해 한 모금 하니 입이 개운해졌어요',
    keyword: '자몽티',
    servingUnit: '한 잔',
    priceFeel: '개운하게 한 잔 하기 좋은',
    tableware: '유리잔 또는 티포트, 받침, 냅킨',
    sidedishes: ['스콘', '쿠키', '마들렌'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 피하고 싶을 때·새콤하게 입가심하고 싶을 때·개운하게 기분 전환하고 싶을 때',
    titlePurpose: '개운하게 마시기 좋은',
    portionFeel: '한 잔 기준, 새콤하고 쌉싸름한 향을 음미하며 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키거나 티포트로 나눠 마시는 구성',
    usageType: '체류·휴식용',
    paceFeel: '새콤한 향을 천천히 음미하는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶은 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '새콤하면서 끝에 쌉싸름한 결이 당기면 자몽티가 무난, 깔끔하게 새콤한 결만 당기면 레몬티를 고르는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 핫초코 (2026-06-28 세션4) ───
  //   코코아 베이스 따뜻한 단음료. 커피 아님(논커피)·디저트 아님(마실거리) 경계 명시 → coffee/dessert 오염 방지.
  //   servingUnit='한 잔'(음료 계열 정합). cat='음료'. decisionPoint에 커피·디저트 경계 둘 다 명시(인수인계 지침).
  '핫초코': {
    genericName: '카페',
    altGenericNames: ['카페', '여기'],
    motive: '따뜻하고 달콤한 핫초코 한 잔 하러',
    tasteCore: '코코아를 진하게 녹인 따뜻하고 달콤한 맛, 부드럽게 넘어가는 한 잔, 커피가 아니라 부담 없이 달달하게 즐기는 음료',
    sceneCore: '김이 오르는 잔 위 마시멜로나 휘핑을 한 술 떠먹고 따뜻하게 감싸 쥐며 마시는 손님 풍경',
    hook: '한 모금 넘기니 코코아가 진하고 달달해서 몸이 사르르 풀렸어요',
    keyword: '핫초코',
    servingUnit: '한 잔',
    priceFeel: '따뜻하게 한 잔 하기 좋은',
    tableware: '머그잔, 받침, 냅킨',
    sidedishes: ['쿠키', '마들렌', '스콘'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 못 마실 때·달달하게 기분 풀고 싶을 때·추운 날 따뜻하게 몸 녹이고 싶을 때',
    titlePurpose: '따뜻하게 마시기 좋은',
    portionFeel: '한 잔 기준, 진한 단맛을 천천히 음미하며 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·휴식용',
    paceFeel: '따뜻한 잔을 감싸 쥐고 천천히 마시는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶거나 추운 날에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '커피 말고 달달하게 따뜻한 음료가 당기면 핫초코가 무난, 같은 달달함을 디저트로 즐기고 싶으면 케이크류를 곁들이는 편',
  },

  // ─── [APPEND v2-ext] 음료(drink) — 아이스초코 (2026-06-28 세션4) ───
  //   핫초코와 동일군(코코아 베이스)·온도 차(시원). alias 불가(menu=데이터키 강제결합) → 독립 데이터 신설(유형 B).
  //   커피 아님(논커피)·디저트 아님(마실거리) 경계 명시. servingUnit='한 잔'. cat='음료'. decisionPoint에 핫초코 온도차 명시.
  '아이스초코': {
    genericName: '카페',
    altGenericNames: ['카페', '여기'],
    motive: '시원하고 달콤한 아이스초코 한 잔 하러',
    tasteCore: '코코아를 진하게 녹여 차갑게 즐기는 달콤한 맛, 얼음과 함께 시원하게 넘어가는 한 잔, 커피가 아니라 부담 없이 달달하게 마시는 음료',
    sceneCore: '얼음이 찰랑이는 잔에 휘핑이 올라간 음료를 빨대로 저으며 시원하게 마시는 손님 풍경',
    hook: '한 모금 빨아올리니 차가운 코코아가 진하고 달달해서 더위가 싹 가셨어요',
    keyword: '아이스초코',
    servingUnit: '한 잔',
    priceFeel: '시원하게 한 잔 하기 좋은',
    tableware: '유리잔, 빨대, 받침, 냅킨',
    sidedishes: ['쿠키', '마들렌', '스콘'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피를 못 마실 때·더운 날 시원하게 식히고 싶을 때·달달하게 기분 풀고 싶을 때',
    titlePurpose: '시원하게 마시기 좋은',
    portionFeel: '한 잔 기준, 시원하고 진한 단맛을 천천히 마시기 좋은 편',
    sharingFeel: '1인 1잔 중심 — 각자 한 잔씩 시키는 구성',
    usageType: '체류·휴식용',
    paceFeel: '얼음이 녹기 전에 시원하게 마시는 편',
    visitTiming: '오후·저녁, 커피를 줄이고 싶거나 더운 날에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '같은 코코아라도 시원하게 마시고 싶으면 아이스초코가 무난, 따뜻하게 몸을 녹이고 싶으면 핫초코를 고르는 편',
  },

  // ═══════════════ [APPEND v2-ext] 디저트 계열 추가 ═══════════════
  '바스크치즈케이크': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '겉은 진하게 구운 치즈케이크 한 조각 곁들이러',
    tasteCore: '겉은 캐러멜처럼 진하게 구워진 면, 속은 부드럽고 촉촉한 치즈, 묵직한 풍미',
    sceneCore: '진한 색 한 조각을 커피와 함께 천천히 먹는 손님 풍경',
    hook: '겉은 쌉싸름하게 구워졌는데 속은 부드러워서 커피랑 딱이었어요',
    keyword: '바스크치즈케이크',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '핸드드립', '플랫화이트'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '진한 디저트·당 충전·디저트 타임처럼 묵직한 한 조각이 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 진해서 커피와 나눠 먹기 좋은 편',
    sharingFeel: '둘이 하나 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '진한 치즈 맛이 당기면 바스크치즈케이크가 무난, 가벼운 게 당기면 조각케이크를 고르는 편',
  },

  '스콘': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피에 담백한 빵 하나 곁들이러',
    tasteCore: '겉은 바삭 속은 포슬한 결, 버터 향, 잼·크림과의 단짠 조합',
    sceneCore: '커피와 함께 스콘 반으로 갈라 잼 발라 먹는 손님 풍경',
    hook: '커피랑 같이 한 입 하니 담백해서 자꾸 손이 갔어요',
    keyword: '스콘',
    servingUnit: '한 개',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 나이프, 냅킨',
    sidedishes: ['아메리카노', '핸드드립', '밀크티'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피에 담백한 빵을 곁들이거나 가벼운 요기가 필요할 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 개 기준, 커피와 곁들이기 좋은 편',
    sharingFeel: '둘이 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오전·오후 시간대에 무난',
    bestCompanion: '혼자·친구',
    decisionPoint: '담백한 빵이 당기면 스콘이 무난, 달달한 게 당기면 휘낭시에를 고르는 편',
  },

  '휘낭시에': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피에 작고 진한 구움과자 곁들이러',
    tasteCore: '버터와 아몬드의 고소한 풍미, 겉은 바삭 속은 촉촉, 작지만 진한 단맛',
    sceneCore: '작은 한 입 과자를 커피와 함께 야금야금 먹는 손님 풍경',
    hook: '작은데 버터 향이 진해서 커피 한 잔에 두 개는 금방 먹었어요',
    keyword: '휘낭시에',
    servingUnit: '한 개',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '말차라떼'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '커피에 작은 구움과자를 곁들이거나 가볍게 단 게 당길 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 개 기준, 작아서 여러 개 곁들이기 좋은 편',
    sharingFeel: '여러 개 나눠 먹기 좋은 구성',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 야금야금 먹는 편',
    visitTiming: '오후 디저트 타임에 특히 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '작고 진한 구움과자가 당기면 휘낭시에가 무난, 담백한 게 당기면 스콘을 고르는 편',
  },

  '타르트': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '바삭한 타르트지에 과일·크림 올린 한 조각 곁들이러',
    tasteCore: '바삭한 타르트지와 부드러운 필링, 과일의 새콤함, 보기에도 예쁜 한 조각',
    sceneCore: '색색의 타르트를 골라 사진 먼저 찍고 커피와 함께 먹는 손님 풍경',
    hook: '타르트지가 바삭해서 크림이랑 같이 한 입 하니 식감이 좋았어요',
    keyword: '타르트',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '에이드'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·디저트 타임처럼 예쁜 디저트 한 조각이 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 둘이 나눠 먹기에도 무난',
    sharingFeel: '나눠 먹기 좋은 구성',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '바삭하고 새콤한 게 당기면 타르트가 무난, 부드러운 게 당기면 케이크를 고르는 편',
  },

  '소금빵': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '커피에 짭짤한 버터빵 하나 곁들이러',
    tasteCore: '겉은 바삭 속은 쫄깃, 버터의 고소함과 은은한 소금기, 단짠의 균형',
    sceneCore: '갓 구운 소금빵을 커피와 함께 손으로 뜯어 먹는 손님 풍경',
    hook: '겉이 바삭한데 안은 버터가 촉촉해서 커피랑 자꾸 손이 갔어요',
    keyword: '소금빵',
    servingUnit: '한 개',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '콜드브루'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '커피에 짭짤한 빵을 곁들이거나 가벼운 요기가 필요할 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 개 기준, 커피와 곁들이기 좋은 편',
    sharingFeel: '둘이 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오전·오후 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '짭짤한 빵이 당기면 소금빵이 무난, 달달한 게 당기면 크로플을 고르는 편',
  },

  '브라우니': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '진한 초콜릿 디저트 한 조각 곁들이러',
    tasteCore: '진한 초콜릿의 묵직한 단맛, 촉촉하고 꾸덕한 식감, 커피와의 균형',
    sceneCore: '진한 초콜릿 한 조각을 커피와 함께 천천히 먹는 손님 풍경',
    hook: '꾸덕한 식감에 초콜릿이 진해서 쓴 커피랑 잘 맞았어요',
    keyword: '브라우니',
    servingUnit: '한 조각',
    priceFeel: '커피랑 곁들이기 좋은',
    tableware: '디저트 접시, 포크, 냅킨',
    sidedishes: ['아메리카노', '에스프레소', '핸드드립'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '진한 초콜릿·당 충전·디저트 타임처럼 묵직한 단맛이 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 조각 기준, 진해서 커피와 나눠 먹기 좋은 편',
    sharingFeel: '둘이 하나 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '커피와 함께 천천히 먹는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '진한 초콜릿이 당기면 브라우니가 무난, 부드러운 게 당기면 케이크를 고르는 편',
  },

  '아포가토': {
    genericName: '카페',
    altGenericNames: ['카페', '디저트 카페', '여기'],
    motive: '진한 에스프레소에 아이스크림 올린 디저트 즐기러',
    tasteCore: '차가운 아이스크림에 뜨거운 에스프레소, 녹아내리며 섞이는 단쓴, 디저트 같은 한 잔',
    sceneCore: '에스프레소를 아이스크림 위에 부어 녹는 모습을 보며 먹는 손님 풍경',
    hook: '에스프레소 붓고 살짝 녹였다가 한 입 하니 달고 쌉싸름해서 좋았어요',
    keyword: '아포가토',
    servingUnit: '한 잔',
    priceFeel: '디저트로 즐기기 좋은',
    tableware: '유리잔 또는 디저트볼, 스푼, 냅킨',
    sidedishes: ['아메리카노', '쿠키', '휘낭시에'],
    timeOfDay: ['오후', '저녁'],
    recommendSituation: '데이트·디저트 타임·당 충전처럼 달콤한 디저트가 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 잔 기준, 둘이 나눠 먹기에도 무난',
    sharingFeel: '둘이 하나 나눠 먹기에도 무난',
    usageType: '디저트·체류용',
    paceFeel: '아이스크림 녹기 전에 천천히 즐기는 편',
    visitTiming: '오후·저녁 디저트 타임에 특히 무난',
    bestCompanion: '연인·친구',
    decisionPoint: '차갑고 달콤한 디저트가 당기면 아포가토가 무난, 따뜻한 게 당기면 크로플을 고르는 편',
  },

  // ═══════════════ [APPEND v2-ext] 브런치 계열 추가 ═══════════════
  '파니니': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '따뜻하게 눌러 구운 샌드위치로 한 끼 하러',
    tasteCore: '바삭하게 눌러 구운 빵, 속 재료의 따뜻함, 치즈가 녹아 어우러진 든든한 한 끼',
    sceneCore: '갓 구워 따뜻한 파니니를 커피와 함께 먹는 손님 풍경',
    hook: '눌러 구워 빵이 바삭한데 속 치즈가 녹아서 따뜻하게 먹기 좋았어요',
    keyword: '파니니',
    servingUnit: '한 접시',
    priceFeel: '한 끼 하기 좋은',
    tableware: '플레이트, 나이프·포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '에이드'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '간단한 식사·작업 중 요기처럼 따뜻한 한 끼가 필요할 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 접시 기준, 한 끼로 적당한 편',
    sharingFeel: '1인 1접시 중심 — 각자 시키는 구성',
    usageType: '식사·체류용',
    paceFeel: '따뜻할 때 먹고 커피와 머무는 편',
    visitTiming: '오전·오후 식사 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '따뜻한 식사가 당기면 파니니가 무난, 가볍게 먹을 거면 샌드위치를 고르는 편',
  },

  '샐러드': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '가볍고 신선하게 한 끼 챙기러',
    tasteCore: '신선한 채소와 드레싱의 조화, 가벼우면서 든든한 구성, 부담 없는 한 끼',
    sceneCore: '큰 볼에 담긴 샐러드를 커피와 함께 천천히 먹는 손님 풍경',
    hook: '채소가 신선해서 드레싱이랑 같이 먹으니 가볍게 한 끼 됐어요',
    keyword: '샐러드',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '볼 또는 플레이트, 포크, 냅킨',
    sidedishes: ['아메리카노', '에이드', '말차라떼'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '가볍게·신선하게·건강하게 한 끼를 챙기고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 접시 기준, 가벼운 한 끼로 적당한 편',
    sharingFeel: '1인 1접시 중심 — 각자 시키는 구성',
    usageType: '식사·체류용',
    paceFeel: '가볍게 먹고 커피와 머무는 편',
    visitTiming: '오전·오후 식사 시간대에 무난',
    bestCompanion: '혼자·친구',
    decisionPoint: '가볍고 신선한 게 당기면 샐러드가 무난, 든든한 게 당기면 브런치를 고르는 편',
  },

  '프렌치토스트': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '달콤하게 구운 토스트로 여유로운 한 끼 하러',
    tasteCore: '겉은 노릇 속은 촉촉, 시럽과 버터의 달콤함, 커피와 어울리는 든든한 한 접시',
    sceneCore: '시럽 뿌린 토스트를 커피와 함께 여유롭게 먹는 주말 손님 풍경',
    hook: '시럽 뿌리고 한 입 하니 겉바속촉이라 커피랑 잘 어울렸어요',
    keyword: '프렌치토스트',
    servingUnit: '한 접시',
    priceFeel: '한 끼 하기 좋은',
    tableware: '플레이트, 나이프·포크, 냅킨',
    sidedishes: ['아메리카노', '카페라떼', '밀크티'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '데이트·주말 모임·늦은 아침처럼 달콤한 한 끼가 당길 때',
    titlePurpose: '데이트하기 좋은',
    portionFeel: '한 접시 기준, 둘이 나눠 먹기에도 무난',
    sharingFeel: '나눠 먹기 좋은 구성',
    usageType: '식사·체류용',
    paceFeel: '여유롭게 한 끼 하며 오래 앉는 편',
    visitTiming: '주말 오전·점심 시간대에 특히 무난',
    bestCompanion: '연인·친구·가족',
    decisionPoint: '달콤한 한 끼가 당기면 프렌치토스트가 무난, 식사다운 게 당기면 브런치를 고르는 편',
  },

  '아사이볼': {
    genericName: '카페',
    altGenericNames: ['카페', '브런치 카페', '여기'],
    motive: '신선한 과일볼로 가볍고 건강하게 한 끼 하러',
    tasteCore: '아사이 베이스의 진한 과일맛, 그래놀라의 바삭함, 신선한 과일의 새콤달콤, 건강한 한 그릇',
    sceneCore: '예쁘게 담긴 과일볼을 사진 먼저 찍고 스푼으로 떠먹는 손님 풍경',
    hook: '과일이랑 그래놀라가 섞이니 새콤달콤하고 든든해서 아침으로 좋았어요',
    keyword: '아사이볼',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '볼, 스푼, 냅킨',
    sidedishes: ['아메리카노', '에이드', '말차라떼'],
    timeOfDay: ['오전', '오후'],
    recommendSituation: '가볍게·건강하게·신선하게 아침이나 한 끼를 챙기고 싶을 때',
    titlePurpose: '혼자 가기 좋은',
    portionFeel: '한 그릇 기준, 가벼운 한 끼로 적당한 편',
    sharingFeel: '1인 1그릇 중심 — 각자 시키는 구성',
    usageType: '식사·체류용',
    paceFeel: '가볍게 떠먹으며 커피와 머무는 편',
    visitTiming: '오전·오후 식사 시간대에 무난',
    bestCompanion: '혼자·친구·연인',
    decisionPoint: '가볍고 건강한 한 끼가 당기면 아사이볼이 무난, 든든한 게 당기면 브런치를 고르는 편',
  },
});

// ─────────────────────────────────────────────────────────
// SITUATIONS — 방문 상황 (지금 어떤 결로 왔나)
// ─────────────────────────────────────────────────────────
export const CAFE_SITUATIONS = [
  '작업',
  '수다',
  '혼카페',
  '비 오는 날',
  '더운 날',
  '늦은 밤',
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정
// BASE_DIRECTION 위에 덮어씌움. 모든 필드 선택적.
// ★ flowBias: 카페 섹션 비중 보정 (visit/approach/order/experience/stay/revisit)
// ─────────────────────────────────────────────────────────
export const SITUATION_OVERRIDES = {
  '작업': {
    motiveExtra: '노트북 펴고 좀 오래 앉아 있을 곳을 찾다가',
    tasteExtra: '한 잔 시켜두고 천천히 마시기 좋아서 작업하기 편했어요',
    sceneExtra: '창가나 콘센트 자리에서 노트북 보는 손님들이 군데군데 있던 풍경',
    hookExtra: '콘센트 자리에 앉으니 오래 머물러도 괜찮겠다 싶었어요',
    flowBias: 'stay',  // 체류 섹션 강화
  },
  '수다': {
    motiveExtra: '오랜만에 만나 천천히 이야기 나눌 곳을 찾다가',
    tasteExtra: '한 잔씩 시켜두고 대화하다 보니 시간 가는 줄 몰랐어요',
    sceneExtra: '테이블마다 마주 앉아 도란도란 이야기 나누는 손님들 풍경',
    hookExtra: '테이블 간격이 적당해서 편하게 대화할 수 있었어요',
    flowBias: 'experience',
  },
  '혼카페': {
    motiveExtra: '혼자 조용히 시간 보낼 곳을 찾다가',
    tasteExtra: '혼자라서 맛에만 집중하며 천천히 즐길 수 있었어요',
    sceneExtra: '1인석이나 바 자리에 혼자 앉은 손님들, 어색하지 않은 분위기',
    hookExtra: '혼자 들어갔는데 1인 자리가 있어서 편했어요',
    flowBias: 'stay',
  },
  '비 오는 날': {
    motiveExtra: '비 와서 따뜻한 데서 한 잔 하고 싶어서',
    tasteExtra: '빗소리 들으며 따뜻한 한 잔 하니 그 조합이 좋았어요',
    sceneExtra: '창밖에 비 떨어지는 풍경, 김 서린 유리창 너머 거리',
    hookExtra: '문 열고 들어가니 창밖 비 풍경부터 눈에 들어왔어요',
    flowBias: 'experience',
  },
  '더운 날': {
    motiveExtra: '더워서 시원한 데서 잠깐 쉬어가려고',
    tasteExtra: '시원한 한 잔에 더위가 가시면서 한결 나아졌어요',
    sceneExtra: '아이스 음료 들고 시원한 자리 찾아 앉는 손님들 풍경',
    hookExtra: '에어컨 바람에 시원한 음료 한 모금 하니 살 것 같았어요',
    flowBias: 'order',
  },
  '늦은 밤': {
    motiveExtra: '늦은 시간까지 열려 있는 곳을 찾다가',
    tasteExtra: '늦은 시간인데도 분위기가 차분해서 한 잔 하기 좋았어요',
    sceneExtra: '밤 시간 조도 낮춘 조명, 조용히 머무는 손님 몇 명 풍경',
    hookExtra: '밤늦게 들어갔는데 자리가 군데군데 차 있어서 편했어요',
    flowBias: 'stay',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 방문목적 (누구와 / 어떤 자리)
// ★ 카페 방문목적 (메뉴 검색 → 방문목적 검색 전환)
// ─────────────────────────────────────────────────────────
export const CAFE_PURPOSES = [
  '작업',
  '데이트',
  '대화',
  '혼자',
  '모임',
  '공부',     // ⚠ 학습 어휘 금지 — 라벨만, 본문은 '오래 머물기' 톤
  '야경',
  '아이와 함께',
  '부모님과',
  '강아지와 함께',
];

// ★ 제목용 방문목적 표현 (PURPOSES 키 → 제목 선두 토큰)
export const PURPOSE_TITLE_LABEL = {
  '작업': '작업하기 좋은',
  '데이트': '데이트하기 좋은',
  '대화': '대화하기 좋은',
  '혼자': '혼자 가기 좋은',
  '모임': '모임하기 좋은',
  '공부': '오래 머물기 좋은',   // ⚠ '공부하기 좋은' 금지 (스터디카페 톤 회피)
  '야경': '야경 보기 좋은',
  '아이와 함께': '아이와 함께 가기 좋은',
  '부모님과': '부모님과 가기 좋은',
  '강아지와 함께': '강아지와 함께 가기 좋은',
};

// ─────────────────────────────────────────────────────────
// PURPOSE_OVERRIDES — 목적별 톤 보정
// ★ 목적우선 필드(선택적): purposeMotive·decisionPoint·recommendSituation·visitTiming·bestCompanion
//   - 있으면 buildDirection이 목적 우선으로 합성. 없으면 MENU_BASE_DIRECTION 값으로 폴백.
// ⚠ Feature(루프탑·애견·대형·야간)는 cat 아님 → 여기서 상황/목적으로 흡수
// ─────────────────────────────────────────────────────────
export const PURPOSE_OVERRIDES = {
  '작업': {
    sceneExtra: '노트북 작업하는 손님이 많아 오래 앉아 있어도 자연스러운 분위기',
    tableExtra: '콘센트 있는 자리 / 1인석 / 넓은 테이블',
    paceExtra: '한 잔 시켜두고 1~2시간 머무는 손님 많음',
    purposeMotive: '노트북 펴고 오래 머물 자리를 찾는 상황',
    decisionPoint: '오래 머물며 작업할 자리면 콘센트·테이블 간격을 먼저 보는 편',
    recommendSituation: '혼자 작업하거나 가볍게 노트북 켤 때',
    visitTiming: '한가한 오전·오후 시간대',
    bestCompanion: '혼자·작업 동행',
  },
  '데이트': {
    sceneExtra: '마주 앉아 대화 나누기 좋은 분위기, 사진 잘 나오는 자리',
    tableExtra: '2인석 / 창가 자리 / 분위기 있는 좌석',
    paceExtra: '천천히 머물며 디저트까지 곁들이는 편',
    purposeMotive: '둘이 분위기 있게 시간 보낼 자리를 찾는 상황',
    decisionPoint: '분위기와 좌석이 중요하면 인테리어·창가 자리를 먼저 보는 편',
    recommendSituation: '연인과 천천히 대화하거나 기념일에',
    visitTiming: '오후·저녁 시간대',
    bestCompanion: '연인',
  },
  '대화': {
    sceneExtra: '테이블 간격이 적당해 편하게 이야기 나누기 좋은 분위기',
    tableExtra: '2~4인석 / 소음 적은 자리',
    paceExtra: '한 잔씩 시켜두고 오래 대화하는 편',
    purposeMotive: '편하게 이야기 나눌 자리를 찾는 상황',
    decisionPoint: '대화가 목적이면 테이블 간격·소음 정도를 먼저 보는 편',
    recommendSituation: '친구·지인과 오래 이야기 나눌 때',
    visitTiming: '오후 시간대',
    bestCompanion: '친구·지인',
  },
  '혼자': {
    sceneExtra: '혼자 와서 부담 없이 머물 수 있는 분위기, 1인 손님 자연스러움',
    tableExtra: '1인석 / 바 자리 / 창가 단석',
    paceExtra: '혼자 한 잔 시켜두고 책이나 폰 보며 머무는 편',
    purposeMotive: '혼자 조용히 시간 보낼 자리를 찾는 상황',
    decisionPoint: '혼자 머물 거면 1인석 유무·눈치 안 보이는 분위기를 먼저 보는 편',
    recommendSituation: '혼자 쉬거나 가볍게 시간 보낼 때',
    visitTiming: '한가한 시간대',
    bestCompanion: '혼자',
  },
  '모임': {
    sceneExtra: '여럿이 둘러앉기 좋은 넓은 자리, 단체 손님도 자연스러운 분위기',
    tableExtra: '4인 이상 단체석 / 넓은 테이블',
    paceExtra: '여럿이 음료·디저트 나눠 시켜두고 오래 머무는 편',
    purposeMotive: '여럿이 모여 앉을 자리를 찾는 상황',
    decisionPoint: '모임이면 단체석 유무·테이블 넓이를 먼저 보는 편',
    recommendSituation: '친구·동료 여럿이 모일 때',
    visitTiming: '오후·주말 시간대',
    bestCompanion: '친구·동료 모임',
  },
  '공부': {  // ⚠ 학습 어휘 금지 — '오래 머물기' 톤으로만
    sceneExtra: '한 자리에 오래 앉아 있어도 괜찮은 분위기, 콘센트 있는 자리',
    tableExtra: '콘센트 자리 / 넓은 테이블 / 1인석',
    paceExtra: '한 잔 시켜두고 오래 머무는 손님 많음',
    purposeMotive: '오래 머물 자리를 찾는 상황',
    decisionPoint: '오래 머물 거면 콘센트·체류 제한 여부를 먼저 보는 편',
    recommendSituation: '혼자 오래 머물거나 가볍게 무언가 할 때',
    visitTiming: '한가한 오전·오후 시간대',
    bestCompanion: '혼자',
  },
  '야경': {
    sceneExtra: '해 질 무렵부터 야경까지 시간대별로 바뀌는 뷰, 사진 잘 나오는 자리',
    tableExtra: '창가 / 루프탑 / 뷰 좋은 자리',
    paceExtra: '노을부터 야경까지 시간대 걸쳐 천천히 머무는 편',
    purposeMotive: '뷰 좋은 자리에서 시간 보낼 곳을 찾는 상황',
    decisionPoint: '야경이 목적이면 뷰·창가/루프탑 자리·방문 시간대를 먼저 보는 편',
    recommendSituation: '연인·친구와 노을·야경 보며 머물 때',
    visitTiming: '해 질 무렵·저녁 시간대',
    bestCompanion: '연인·친구',
  },
  '아이와 함께': {
    sceneExtra: '아이 동반 손님도 편한 분위기, 통로 넓고 자리 여유 있는 편',
    tableExtra: '넓은 테이블 / 통로 여유 있는 자리',
    paceExtra: '가족 단위로 음료·디저트 시켜두고 머무는 편',
    purposeMotive: '아이와 함께 편하게 머물 자리를 찾는 상황',
    decisionPoint: '아이 동반이면 자리 여유·통로 넓이를 먼저 보는 편',
    recommendSituation: '아이와 함께 가볍게 들를 때',
    visitTiming: '오후 시간대',
    bestCompanion: '가족·아이',
  },
  '부모님과': {
    sceneExtra: '차분하고 편안한 분위기, 자리 간격 여유 있어 편한 편',
    tableExtra: '편한 좌석 / 자리 간격 여유 있는 곳',
    paceExtra: '천천히 한 잔 하며 머무는 편',
    purposeMotive: '부모님 모시고 편하게 머물 자리를 찾는 상황',
    decisionPoint: '부모님과면 자리 편안함·접근성을 먼저 보는 편',
    recommendSituation: '부모님과 차분하게 시간 보낼 때',
    visitTiming: '오후 시간대',
    bestCompanion: '부모님·가족',
  },
  '강아지와 함께': {
    sceneExtra: '반려견 동반 가능한 분위기, 다른 손님과 자리 거리 있는 편',
    tableExtra: '반려견 동반 가능석 / 야외석',
    paceExtra: '반려견과 함께 천천히 머무는 편',
    purposeMotive: '강아지와 함께 들를 자리를 찾는 상황',
    decisionPoint: '반려견 동반이면 동반 가능 여부·바닥재·물그릇 제공을 먼저 보는 편',
    recommendSituation: '반려견과 함께 산책 겸 들를 때',
    visitTiming: '오후 시간대',
    bestCompanion: '반려견',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 가상 매장 (본문 노출 금지, 운영 식별자만)
// ⚠ name·brandName 필드 없음 — 본문에서 genericName('카페')만 사용
// representativeMenu = 간판 / promotionMenus = 블로그 집중 생성 대상
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_hongdae_cafe_01',  // 운영 식별자 (본문 노출 금지)
    region: '홍대',
    cat: '커피',
    representativeMenu: '아메리카노',
    menus: [
      '아메리카노', '카페라떼', '바닐라라떼', '콜드브루', '디카페인', '에스프레소', '핸드드립',
      '크로플', '케이크', '조각케이크', '티라미수', '치즈케이크', '마카롱', '쿠키', '빙수',
      '브런치', '샌드위치', '베이글',
    ],
    promotionMenus: ['아메리카노', '카페라떼', '크로플', '케이크', '브런치'],  // ★ 집중 생성 5종
  },
  // 확장 시:
  // { storeId: 'store_gongleung_cafe_01', region: '공릉동', cat: '커피',
  //   representativeMenu: '콜드브루', menus: [...], promotionMenus: [...] },
];

// ★ 홍보 메뉴 권장 상한 (UI 경고 기준)
export const PROMOTION_MENU_MAX = 5;

// ─────────────────────────────────────────────────────────
// STORE 헬퍼 (restaurant-data.js와 동일 계약)
// ─────────────────────────────────────────────────────────
export function getStoresByRegion(region) {
  return STORE_PROFILES.filter(s => s.region === region);
}
export function getStoreById(storeId) {
  return STORE_PROFILES.find(s => s.storeId === storeId) || null;
}
export function getPromotionMenus(store) {
  if (!store) return [];
  if (Array.isArray(store.promotionMenus) && store.promotionMenus.length > 0) {
    return store.promotionMenus;
  }
  return store.menus || [];
}
export function getPromotionMenusByStoreId(storeId) {
  return getPromotionMenus(getStoreById(storeId));
}
export function isPromotionMenu(store, menu) {
  return getPromotionMenus(store).includes(menu);
}
export function filterTreatmentsByPromotion(treatments) {
  return (treatments || []).filter(t => {
    const store = getStoreById(t.storeId);
    if (!store) return false;
    const menu = t.menu || t.menuRef || '';
    return isPromotionMenu(store, menu);
  });
}
export function getPromotionTreatmentsByRegion(treatments, region) {
  return filterTreatmentsByPromotion(treatments).filter(t => t.region === region);
}

// ─────────────────────────────────────────────────────────
// buildDirection — 하이브리드 merge (restaurant-data.js와 동일 계약)
// BASE_MENU + SITUATION + PURPOSE를 합쳐 최종 DIRECTION 생성
// ⚠ 시그니처·반환 필드 계약 = restaurant buildDirection과 동일 (외식 엔진 통일)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) {
    return {
      genericName: '카페',
      altGenericNames: ['카페', '여기'],
      motive: '근처에서 커피 한 잔 하러',
      tasteCore: '무난한 커피 한 잔',
      sceneCore: '동네 카페 분위기',
      hook: '문 열고 들어가니 익숙한 카페 풍경이었어요',
      keyword: '카페',
      priceFeel: '부담 없이 한 잔 하기 좋은',
      servingUnit: '한 잔',
      tableware: '머그, 냅킨',
      sidedishes: [],
      timeOfDay: ['오후'],
      situation: situation || '',
      purpose: purpose || '',
      tableExtra: '',
      paceExtra: '',
      extraDetail: '',
      flowBias: '',
      purposeLabel: (purpose && PURPOSE_TITLE_LABEL[purpose]) || '',
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

  const purLabel = (purpose && PURPOSE_TITLE_LABEL[purpose]) || base.titlePurpose || '';

  const purposeFrameParts = [];
  if (purOvr.purposeMotive) purposeFrameParts.push(purOvr.purposeMotive);
  else if (purpose) purposeFrameParts.push(`${purpose} 자리를 찾는 상황`);
  if (sitOvr.motiveExtra) purposeFrameParts.push(sitOvr.motiveExtra);
  const purposeFrame = purposeFrameParts.join(' / ');

  const decisionPoint = purOvr.decisionPoint || base.decisionPoint || '';
  const recommendSituation = purOvr.recommendSituation || base.recommendSituation || '';
  const visitTiming = purOvr.visitTiming || base.visitTiming || (base.timeOfDay ? base.timeOfDay.join('·') : '');
  const bestCompanion = purOvr.bestCompanion || base.bestCompanion || '';

  const portionFeel = base.portionFeel || '';
  const sharingFeel = base.sharingFeel || '';
  const usageType = base.usageType || '';
  const paceFeel = base.paceFeel || '';

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
    servingUnit: base.servingUnit || '한 잔',
    tableware: base.tableware,
    sidedishes: base.sidedishes,
    timeOfDay: base.timeOfDay,
    situation: situation || '',
    purpose: purpose || '',
    tableExtra: purOvr.tableExtra || '',
    paceExtra: purOvr.paceExtra || '',
    extraDetail: purOvr.extraDetail || '',
    flowBias: sitOvr.flowBias || '',
    purposeLabel: purLabel,
    purposeFrame,
    decisionPoint,
    recommendSituation,
    visitTiming,
    bestCompanion,
    portionFeel,
    sharingFeel,
    usageType,
    paceFeel,
    isSideMenu,
    representativeMenu,
  };
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS (제목에서 메뉴·상황 키워드 감지)
// generateCafe.js detectedSite 로직에 사용
// ─────────────────────────────────────────────────────────
export const CAFE_SITE_KEYWORDS = [
  // 커피
  '아메리카노', '카페라떼', '바닐라라떼', '콜드브루', '디카페인', '에스프레소', '핸드드립',
  '라떼', '커피', '드립',
  // 디저트
  '크로플', '케이크', '조각케이크', '티라미수', '치즈케이크', '마카롱', '쿠키', '빙수',
  '디저트',
  // 브런치
  '브런치', '샌드위치', '베이글',
  // 상황·목적
  '작업', '수다', '혼카페', '데이트', '대화', '혼자', '모임', '야경',
  '비 오는 날', '더운 날', '늦은 밤',
];

// ─────────────────────────────────────────────────────────
// CAFE_TREATMENTS — "조합 카드" (매장 카드 X)
// index.js INDUSTRY_TREATMENTS / allT / treatmentData 검색배열에 추가됨
//
// ★ 매장: 가상 홍대 카페 1개 (storeId: store_hongdae_cafe_01)
//   - promotionMenus 5종을 별개 SEO 카드로 노출 (아메리카노·카페라떼·크로플·케이크·브런치)
//   - 메뉴 선택만으로 글 결 차이가 발생하는지 검증
// ⚠ titlePatterns에 매장명 절대 금지
// ⚠ keywords는 검색의도 기반 (지역+메뉴+상황 조합)
// ⚠ name은 placeholder('카페')만 — 본문에 매장명 노출 X
// ─────────────────────────────────────────────────────────
export const CAFE_TREATMENTS = [
  {
    id: 'cafe_coffee_americano_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '아메리카노',
    cat: '커피',
    name: '카페',  // placeholder
    emoji: '☕',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 아메리카노', '홍대 작업 카페', '홍대 커피', '홍대 혼카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '아메리카노',
    catRef: '커피',
    isRepresentative: true,
  },
  {
    id: 'cafe_coffee_latte_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '카페라떼',
    cat: '커피',
    name: '카페',
    emoji: '☕',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 카페라떼', '홍대 데이트 카페', '홍대 라떼', '홍대 분위기 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '카페라떼',
    catRef: '커피',
    isRepresentative: false,
  },
  {
    id: 'cafe_dessert_croffle_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '크로플',
    cat: '디저트',
    name: '카페',
    emoji: '🧇',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 크로플', '홍대 디저트 카페', '홍대 디저트', '홍대 데이트 카페'],
    compareWith: '동일 지역 다른 디저트 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '크로플',
    catRef: '디저트',
    isRepresentative: false,
  },
  {
    id: 'cafe_dessert_cake_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '케이크',
    cat: '디저트',
    name: '카페',
    emoji: '🍰',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 케이크', '홍대 디저트 카페', '홍대 케이크 맛집', '홍대 데이트 카페'],
    compareWith: '동일 지역 다른 디저트 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '케이크',
    catRef: '디저트',
    isRepresentative: false,
  },
  {
    id: 'cafe_brunch_brunch_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '브런치',
    cat: '브런치',
    name: '카페',
    emoji: '🥪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 브런치', '홍대 브런치 카페', '홍대 브런치 맛집', '홍대 데이트 카페'],
    compareWith: '동일 지역 다른 브런치 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '브런치',
    catRef: '브런치',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 계열 카드 — 에이드 (2026-06-28) ───
  //   menu='에이드' → BASE_DIRECTION 메뉴사전에서 servingUnit='한 잔' 조회.
  //   cat='음료'(CAFE_CATS 기존 항목) → CROSS_BLOCK 음료 격리 + 디저트/브런치 차단어 적용.
  //   엔진(generateCafe/prompts/playConfig) 무수정 — 카드 등록 + index 라우팅 1줄만으로 동작.
  {
    id: 'cafe_drink_ade_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '에이드',
    cat: '음료',
    name: '카페',
    emoji: '🥤',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 에이드', '홍대 음료 카페', '홍대 시원한 음료', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '에이드',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 계열 카드 — 말차라떼 (2026-06-28) ───
  //   menu='말차라떼' → BASE_DIRECTION 메뉴사전에서 servingUnit='한 잔' 조회.
  //   cat='음료'(CAFE_CATS 기존 항목) → CROSS_BLOCK 음료 격리 + 커피/디저트 차단어 적용.
  //   라우팅 주의: '라떼' 커피분기가 "말차라떼"를 선점 → index.js에서 라떼 분기보다 앞에 둠.
  //   엔진(generateCafe/prompts/playConfig) 무수정 — 카드 등록 + index 라우팅 1줄만으로 동작.
  {
    id: 'cafe_drink_matchalatte_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '말차라떼',
    cat: '음료',
    name: '카페',
    emoji: '🍵',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 말차라떼', '홍대 음료 카페', '홍대 녹차 라떼', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '말차라떼',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 계열 카드 — 밀크티 (2026-06-28) ───
  //   menu='밀크티' → BASE_DIRECTION 메뉴사전에서 servingUnit='한 잔' 조회.
  //   cat='음료'(CAFE_CATS 기존 항목) → CROSS_BLOCK 음료 격리. '라떼' 충돌 없음 → 에이드 패턴 동형.
  //   엔진(generateCafe/prompts/playConfig) 무수정 — 카드 등록 + index 라우팅 1줄만으로 동작.
  {
    id: 'cafe_drink_milktea_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '밀크티',
    cat: '음료',
    name: '카페',
    emoji: '🧋',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 밀크티', '홍대 음료 카페', '홍대 차 카페', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '밀크티',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 신규 데이터 카드 — 스무디 (2026-06-28) ───
  //   STEP1~3 선행: BASE_DIRECTION 신설 + CAFE_MENUS 음료 등록 + titlePurpose 등록 완료 후 카드 등록.
  //   cat='음료' / servingUnit='한 잔'(BASE_DIRECTION menu 조회). '라떼' 충돌 없음 → 라우팅 위치 자유(카페 폴백 앞).
  //   엔진(generateCafe/prompts/playConfig) 무수정.
  {
    id: 'cafe_drink_smoothie_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '스무디',
    cat: '음료',
    name: '카페',
    emoji: '🥤',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 스무디', '홍대 음료 카페', '홍대 과일 음료', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '스무디',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 신규 데이터 카드 — 프라페 (2026-06-28) ───
  //   커피 베이스 음료. cat='음료'(커피 cat 아님 — 비커피 음료군과 동일 격리). servingUnit='한 잔'.
  //   라우팅 주의: 광역어 '커피' 분기 없으나, 일반 '카페' 폴백(아메리카노)보다 앞에 둬야 정상 분기.
  //   엔진 무수정.
  {
    id: 'cafe_drink_frappe_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '프라페',
    cat: '음료',
    name: '카페',
    emoji: '🥤',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 프라페', '홍대 음료 카페', '홍대 시원한 커피', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '프라페',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 프라푸치노 (2026-06-28 세션3) ───
  //   프라페와 동일 음료군. menu/menuRef='프라푸치노'(독립 키 — 엔진이 menu 단일 소스로 데이터 조회).
  //   데이터(MENU_BASE_DIRECTION['프라푸치노'])는 프라페 톤 복제. cat='음료'. servingUnit='한 잔'.
  //   라우팅: 일반 '카페' 폴백(아메리카노)보다 앞. 엔진 무수정.
  {
    id: 'cafe_drink_frappuccino_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '프라푸치노',
    cat: '음료',
    name: '카페',
    emoji: '🥤',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 프라푸치노', '홍대 음료 카페', '홍대 시원한 커피', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '프라푸치노',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 허브티 (2026-06-28 세션3) ───
  //   차(茶) 계열. menu/menuRef='허브티'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   라우팅: '밀크티'·'말차라떼' 분기와 충돌 없음('티' 단독 폴백 주의 — 허브티 분기를 명확히). 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_herbtea_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '허브티',
    cat: '음료',
    name: '카페',
    emoji: '🍵',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 허브티', '홍대 음료 카페', '홍대 차 카페', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '허브티',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 과일차 (2026-06-28 세션4) ───
  //   차(茶) 계열. menu/menuRef='과일차'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   라우팅: '과일차'는 다른 메뉴명에 미포함 → 충돌 없음. 허브티 분기 다음 배치. 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_fruittea_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '과일차',
    cat: '음료',
    name: '카페',
    emoji: '🍵',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 과일차', '홍대 음료 카페', '홍대 차 카페', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '과일차',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 레몬티 (2026-06-28 세션4) ───
  //   차(茶) 계열. menu/menuRef='레몬티'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   라우팅: '레몬티'는 다른 메뉴명에 미포함 → 충돌 없음. 과일차 분기 다음 배치. 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_lemontea_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '레몬티',
    cat: '음료',
    name: '카페',
    emoji: '🍵',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 레몬티', '홍대 음료 카페', '홍대 차 카페', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '레몬티',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 자몽티 (2026-06-28 세션4) ───
  //   차(茶) 계열. menu/menuRef='자몽티'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   라우팅: '자몽티'는 다른 메뉴명에 미포함 → 충돌 없음. 레몬티 분기 다음 배치. 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_grapefruittea_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '자몽티',
    cat: '음료',
    name: '카페',
    emoji: '🍵',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 자몽티', '홍대 음료 카페', '홍대 차 카페', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '자몽티',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 핫초코 (2026-06-28 세션4) ───
  //   코코아 베이스 단음료. menu/menuRef='핫초코'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   라우팅: '핫초코'는 타 메뉴명 미포함 → 충돌 없음. 자몽티 분기 다음 배치. 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_hotchoco_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '핫초코',
    cat: '음료',
    name: '카페',
    emoji: '🍫',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 핫초코', '홍대 음료 카페', '홍대 디저트 카페', '홍대 논커피 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '핫초코',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 음료(drink) 카드 — 아이스초코 (2026-06-28 세션4) ───
  //   코코아 베이스 시원한 단음료. menu/menuRef='아이스초코'. cat='음료'. servingUnit='한 잔'(BASE_DIRECTION).
  //   핫초코 alias 아님 — 독립 카드/데이터(유형 B). 라우팅: '아이스초코'는 타 메뉴명 미포함 → 충돌 없음. 핫초코 분기 다음. 일반 '카페' 폴백 앞.
  {
    id: 'cafe_drink_icechoco_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '아이스초코',
    cat: '음료',
    name: '카페',
    emoji: '🧊',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 아이스초코', '홍대 음료 카페', '홍대 디저트 카페', '홍대 논커피 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '아이스초코',
    catRef: '음료',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 디저트 경계 카드 — 아포가토 (2026-06-28) ───
  //   경계 메뉴(coffee+dessert): cat='디저트'(CAFE_MENUS 정합) / servingUnit='한 잔'(BASE_DIRECTION menu 조회).
  //   분류(cat)와 제공단위(servingUnit) 분리 관리 — 에스프레소+아이스크림 표현은 본질이므로 정상 허용.
  //   엔진 무수정. 라우팅은 케이크('디저트' 광역어) 분기보다 앞에 두어 오분기 방지.
  {
    id: 'cafe_dessert_affogato_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '아포가토',
    cat: '디저트',
    name: '카페',
    emoji: '🍨',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 아포가토', '홍대 디저트 카페', '홍대 디저트', '홍대 데이트 카페'],
    compareWith: '동일 지역 다른 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '아포가토',
    catRef: '디저트',
    isRepresentative: false,
  },
  // ─── [APPEND v2-ext] 브런치 계열 카드 — 아사이볼 (2026-06-28) ───
  //   cat='브런치'(CAFE_MENUS 정합) / servingUnit='한 그릇'(BASE_DIRECTION menu 조회 — 브런치 기본 '한 접시'와 다른 볼 단위).
  //   단위 정합 안전망(generateCafe F-1h)은 '접시' 계열만 치환 → '한 그릇'은 무변경(과교정 방지). GPT 그릇/접시 혼용은 스폿 관찰 대상.
  //   엔진 무수정.
  {
    id: 'cafe_brunch_acaibowl_hongdae_01',
    storeId: 'store_hongdae_cafe_01',
    industry: 'cafe',
    region: '홍대',
    menu: '아사이볼',
    cat: '브런치',
    name: '카페',
    emoji: '🍓',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['홍대 카페', '홍대 아사이볼', '홍대 브런치 카페', '홍대 건강한 한 끼', '홍대 디저트 카페'],
    compareWith: '동일 지역 다른 브런치 카페',
    nearbyHint: '홍대입구역 근처 카페거리',
    menuRef: '아사이볼',
    catRef: '브런치',
    isRepresentative: false,
  },
];

// ─────────────────────────────────────────────────────────
// CAFE_META — 업종 메타 (index.js INDUSTRY_CONFIG에서 사용)
// ─────────────────────────────────────────────────────────
export const CAFE_META = {
  industry: 'cafe',
  label: '카페·디저트',
  greeting: '어디서 어떤 메뉴를 안내할까요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '작업하기 좋은 홍대 아메리카노 카페',
    '데이트하기 좋은 홍대 케이크 카페',
    '혼자 가기 좋은 홍대 콜드브루 카페',
    '모임하기 좋은 홍대 빙수 카페',
    '데이트하기 좋은 홍대 브런치 카페',
  ],
  badge: '☕',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES — index.js LONGTAIL_SUFFIXES에서 cafe 분기로 사용
// ★ 계열(커피·디저트·브런치) 기준 재편 (기존 Feature 분기 → 메뉴 계열 분기)
// ⚠ 의료 suffix / 음식점 suffix와 절대 혼용 금지
// ⚠ 학습 어휘 금지 (작업·체류는 '오래 머물기' 톤)
// ─────────────────────────────────────────────────────────
export const CAFE_LONGTAIL_SUFFIXES = {
  // 커피 계열
  coffee: [
    '작업하기 좋은 자리',
    '오래 머물기 좋은',
    '혼자 가기 좋은',
    '여유로운 한 잔',
  ],
  // 디저트 계열
  dessert: [
    '달콤한 한 조각',
    '커피와 함께',
    '데이트하기 좋은',
    '분위기 좋은',
  ],
  // 브런치 계열
  brunch: [
    '든든한 한 접시',
    '주말 가기 좋은',
    '여유로운 브런치',
    '혼자 가기 좋은',
  ],
  // 음료 계열 (v2-ext)
  drink: [
    '시원한 한 잔',
    '커피 말고',
    '상큼한 한 잔',
    '혼자 가기 좋은',
  ],
  // 기본 (계열 미감지 시)
  default: [
    '분위기 좋은',
    '여유로운 한때',
    '여유롭게 즐기기',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — cafe ↔ clinic·dental·restaurant 차단
// generateCafe.js에서 사용
// ─────────────────────────────────────────────────────────
export const CAFE_BLOCK_MAP = {
  // 의료 어휘 차단
  medical: [
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '상담실', '진료실', '원장님', '의사', '간호사', '병원',
    '회차', '경과', '붓기', '멍', '처방',
  ],
  // 음식점 어휘 차단 (restaurant 업종과 분리)
  restaurant: [
    '식당', '주방장', '셰프', '코스 요리', '예약 필수',
    '룸', '회식', '단체석 예약', '국밥', '순대국', '떡볶이',
  ],
  // 학습 어휘 차단 (작업카페 안전핀 — 스터디카페 톤 회피)
  study: [
    '스터디카페', '독서실', '공부하기 좋은', '집중하기 좋은',
    '조용히 집중', '학습', '시험 공부', '인강', '강의 듣기',
  ],
  // 광고 표현 차단 (브랜드 홍보 톤 회피 — PHILOSOPHY 정합)
  ad: [
    '찐맛집', '강추', '강력 추천', '인생 카페', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '숨은 카페', '숨겨진 명소',
    '분위기 맛집', '인생샷',
  ],
};

// ─────────────────────────────────────────────────────────
// ★ 제목 다양성 풀 (restaurant 정합 — commercial 제목 조립용)
//   조립: `{purpose} {region} {menu} {searchword}` (region+menu 선두 고정)
//   금지: 광고형 (찐맛집/강추 등 불포함)
// ─────────────────────────────────────────────────────────

// ★ 검색어 풀 (제목 끝 검색 키워드 — cat 기준 분기)
export const CAFE_TITLE_SEARCHWORD = {
  '커피': ['카페', '커피', '카페 추천', '카페 후기'],
  '디저트': ['카페', '디저트 카페', '디저트', '카페 추천'],
  '음료': ['카페', '카페 추천', '카페 후기'],
  '브런치': ['브런치 카페', '카페', '브런치', '카페 추천'],
  default: ['카페', '카페 추천'],
};

// ★ 제목 패턴 풀 (방문목적 선두 75% : 일반 메뉴형 25%)
export const CAFE_TITLE_PATTERNS_V3 = {
  purposeLead: [
    '{purpose} {region} {menu} {searchword}',
    '{purpose} {region} {menu} {searchword}',
    '{region} {purpose} {menu} {searchword}',
  ],
  menuLead: [
    '{region} {menu} {searchword}',
  ],
};

// ★ 카드 titlePatterns 표준 구성 (purposeLead 3 : menuLead 1 = 75:25)
export const CAFE_TITLE_PATTERNS_STD = [
  '{purpose} {region} {menu} {searchword}',
  '{purpose} {region} {menu} {searchword}',
  '{region} {purpose} {menu} {searchword}',
  '{region} {menu} {searchword}',
];

// 중간 토큰 (메뉴 직후, ｜앞) — 15종 (전부 명사형 감성어, 어미 없음 — purpose '~좋은'과 충돌 방지)
export const CAFE_TITLE_MIDDLE = [
  '한 잔의 여유', '달콤한 한때', '향긋한 순간', '분위기', '여유로운 시간',
  '달콤한 오후', '오후의 햇살', '카페 시간', '나른한 오후', '커피 한 모금',
  '소소한 행복', '잠시 쉬어가기', '창가의 시간', '오후의 여유', '달콤한 여운',
];

// 접미 토큰 (｜뒤) — 15종 (전부 명사형 감성어, 어미 없음)
export const CAFE_TITLE_SUFFIX = [
  '달콤한 휴식', '한 잔의 여유', '달콤한 오후', '분위기', '향긋한 순간',
  '여유로운 한때', '오후의 여유', '나른한 오후', '카페 시간', '소소한 행복',
  '창가의 시간', '여유로운 시간', '잠시 쉬어가기', '오후의 햇살', '달콤한 여운',
];

// ─────────────────────────────────────────────────────────
// TITLE_SCENE — 메뉴 성격별 제목 중간 토큰 (제목 다양성)
//   키: 정확한 메뉴명. 미매칭 시 CAFE_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
// ─────────────────────────────────────────────────────────
export const CAFE_TITLE_SCENE = {
  // 커피 — 메뉴명 미포함 순수 감성어 (menu는 titlePatterns가 삽입)
  '아메리카노':   ['진한 한 잔', '오늘의 한 잔', '깔끔한 한 잔'],
  '카페라떼':     ['부드러운 한 잔', '고소한 한 잔', '오늘의 한 잔'],
  '바닐라라떼':   ['달콤한 한 잔', '부드러운 한 잔', '향긋한 한 잔'],
  '콜드브루':     ['시원한 한 잔', '진한 한 잔', '오늘의 한 잔'],
  '디카페인':     ['부담 없는 한 잔', '여유로운 한 잔', '편안한 한 잔'],
  '에스프레소':   ['진한 한 잔', '향긋한 한 잔', '깔끔한 한 잔'],
  '핸드드립':     ['향긋한 한 잔', '천천히 내린 한 잔', '여유로운 한 잔'],
  // 디저트
  '크로플':       ['달콤한 한 조각', '바삭한 한 조각', '달콤한 오후'],
  '케이크':       ['달콤한 한 조각', '부드러운 한 조각', '달콤한 오후'],
  '조각케이크':   ['달콤한 한 조각', '가벼운 한 조각', '부드러운 한 조각'],
  '티라미수':     ['부드러운 한 조각', '진한 한 조각', '달콤한 오후'],
  '치즈케이크':   ['진한 한 조각', '부드러운 한 조각', '달콤한 오후'],
  '마카롱':       ['달콤한 한 입', '앙증맞은 한 입', '달콤한 오후'],
  '쿠키':         ['달콤한 한 입', '커피와 함께', '바삭한 한 입'],
  '빙수':         ['시원한 한 그릇', '달콤한 한 그릇', '여름의 한 그릇'],
  // 브런치
  '브런치':       ['든든한 한 접시', '여유로운 한 접시', '주말의 한 접시'],
  '샌드위치':     ['간편한 한 접시', '가벼운 한 끼', '커피와 함께'],
  '베이글':       ['든든한 한 끼', '커피와 함께', '간편한 한 접시'],
  // ── [APPEND v2-ext] ──
  // 커피 추가
  '플랫화이트':   ['진한 한 잔', '부드러운 한 잔', '오늘의 한 잔'],
  '아인슈페너':   ['달콤한 한 잔', '부드러운 한 잔', '오후의 한 잔'],
  // 음료
  '에이드':       ['상큼한 한 잔', '시원한 한 잔', '청량한 한 잔'],
  '말차라떼':     ['부드러운 한 잔', '쌉싸름한 한 잔', '향긋한 한 잔'],
  '밀크티':       ['부드러운 한 잔', '달콤한 한 잔', '향긋한 한 잔'],
  '스무디':       ['시원한 한 잔', '과일 가득 한 잔', '가벼운 한 잔'],
  '프라페':       ['시원한 한 잔', '달콤한 한 잔', '부드러운 한 잔'],
  '프라푸치노':   ['시원한 한 잔', '달콤한 한 잔', '부드러운 한 잔'],
  '허브티':       ['향긋한 한 잔', '편안한 한 잔', '따뜻한 한 잔'],
  '과일차':       ['상큼한 한 잔', '향긋한 한 잔', '새콤달콤한 한 잔'],
  '레몬티':       ['산뜻한 한 잔', '새콤한 한 잔', '상큼한 한 잔'],
  '자몽티':       ['개운한 한 잔', '새콤한 한 잔', '쌉싸름한 한 잔'],
  '핫초코':       ['따뜻한 한 잔', '달콤한 한 잔', '포근한 한 잔'],
  '아이스초코':   ['시원한 한 잔', '달콤한 한 잔', '진한 한 잔'],
  // 디저트 추가
  '바스크치즈케이크': ['진한 한 조각', '부드러운 한 조각', '달콤한 오후'],
  '스콘':         ['담백한 한 개', '커피와 함께', '바삭한 한 개'],
  '휘낭시에':     ['고소한 한 개', '커피와 함께', '달콤한 한 입'],
  '타르트':       ['새콤한 한 조각', '바삭한 한 조각', '달콤한 오후'],
  '소금빵':       ['고소한 한 개', '커피와 함께', '바삭한 한 개'],
  '브라우니':     ['진한 한 조각', '달콤한 한 조각', '달콤한 오후'],
  '아포가토':     ['달콤한 한 잔', '시원한 한 잔', '오후의 한 잔'],
  // 브런치 추가
  '파니니':       ['따뜻한 한 접시', '든든한 한 끼', '커피와 함께'],
  '샐러드':       ['신선한 한 접시', '가벼운 한 끼', '건강한 한 접시'],
  '프렌치토스트': ['달콤한 한 접시', '여유로운 한 접시', '주말의 한 접시'],
  '아사이볼':     ['신선한 한 그릇', '건강한 한 그릇', '가벼운 한 끼'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값(커피/디저트/브런치) 기준
export const CAFE_TITLE_SCENE_BY_CATEGORY = {
  '커피':   ['오늘의 한 잔', '한 잔의 여유', '여유로운 한 잔'],
  '디저트': ['달콤한 한 조각', '부드러운 한 조각', '달콤한 오후'],
  '음료':   ['시원한 한 잔', '상큼한 한 잔', '오늘의 한 잔'],
  '브런치': ['든든한 한 접시', '여유로운 한 접시', '주말의 한 접시'],
};
