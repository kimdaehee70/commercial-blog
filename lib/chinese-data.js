// ============================================================
// lib/chinese-data.js — 중식(중화요리) 독립 엔진 데이터 v1.0
//
// 기반: restaurant-data.js 구조 동형 이식 (Restaurant 계열 엔진)
// 작업 기준: Chinese Engine 신규 생성 (B경로 — 독립 엔진)
//   · restaurant 데이터 흡수가 아니라 독립 narrative ecosystem (Naver 지침 §3 전략2)
//   · 엔진 4파일 자립 단위: chinese-data / chinese-prompts / chinese-playConfig / generateChinese
//
// PHILOSOPHY 정합
//   · 매장명 = placeholder only (genericName: '중식당' 등). 본문 노출 0.
//   · 효능·관용 표현 금지 (해장·속풀이·몸보신 등 — FORBIDDEN)
//   · 광고 평가어 금지 (찐맛집·강추·역대급 등)
//   · 정보형(commercial) 기본 — 주인공 = '메뉴'
//   · servingUnit 단위 정합 (면·밥=한 그릇 / 요리·튀김·찜·딤섬=한 접시)
// ============================================================

// ─────────────────────────────────────────────────────────
// CATS — 중식 단일 (계열 구분은 메뉴 단위)
// ─────────────────────────────────────────────────────────
export const CHINESE_CATS = [
  '전체',
  '중식',
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리)
// ─────────────────────────────────────────────────────────
export const CHINESE_REGIONS = [
  '구리',
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 중식 20메뉴 (면·밥·요리·냉채·찜·딤섬)
// ─────────────────────────────────────────────────────────
export const CHINESE_MENUS = {
  중식: [
    // 면 계열
    '짜장면', '간짜장', '삼선짜장', '짬뽕', '삼선짬뽕', '백짬뽕',
    // 밥 계열
    '볶음밥', '잡채밥',
    // 튀김·요리 계열
    '탕수육', '깐풍기', '유린기', '고추잡채', '칠리새우', '크림새우',
    // 냉채·해물 계열
    '양장피', '팔보채', '유산슬',
    // 찜·딤섬 계열
    '동파육', '샤오롱바오', '군만두',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  '짜장면': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '부담 없이 한 끼 중식 하고 싶어서',
    tasteCore: '익숙하고 무난한 맛 — 처음 온 집에서도 실패가 적은 편',
    sceneCore: '메뉴판을 오래 안 보고 바로 정하는 풍경, 나오면 금방 비우는 자리',
    hook: '고민 없이 정하고 금방 자리를 뜰 수 있었어요',
    keyword: '짜장면',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '면 그릇, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '짧은 점심에 빨리 먹고 들어가야 할 때·처음 온 집이라 무난한 걸 고르고 싶을 때·메뉴 고르기 귀찮을 때·비 오는 날 따뜻한 한 끼가 당길 때·야근 전 든든히 채우고 싶을 때',
    titlePurpose: '고민 없이 무난하게 먹기 좋은',
    portionFeel: '한 그릇으로 한 끼가 되는 편, 양이 많으면 곱빼기로 조절하는 사람이 많음',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 가운데 두고 나누는 식',
    usageType: '끼니 식사용',
    paceFeel: '주문하면 금방 나오고 금방 비우는 편 — 오래 안 앉는 자리',
    visitTiming: '짧은 점심·바쁜 끼니 때, 포장으로도 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '오래 고민하기 싫거나 처음 온 집이면 무난하게 짜장면, 국물이 당기는 날이면 짬뽕, 매콤한 게 먹고 싶으면 쟁반짜장 쪽으로 갈리는 편',
  },
  '간짜장': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '면과 소스를 따로 받아 비벼 먹고 싶어서',
    tasteCore: '즉석에서 볶아낸 소스를 따로 받는 방식 — 갓 나온 걸 선호할 때 고르는 편',
    sceneCore: '소스 그릇을 면 위에 부어 비비는 자리, 갓 볶은 게 바로 나오는 풍경',
    hook: '갓 볶은 소스가 따로 나와 비비는 재미가 있었어요',
    keyword: '간짜장',
    servingUnit: '한 그릇',
    priceFeel: '제대로 한 그릇 하기 좋은',
    tableware: '면 그릇, 소스 그릇, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '갓 볶은 걸 바로 먹고 싶을 때·일반 짜장은 물렸고 다르게 먹고 싶을 때·면 불기 전에 비벼 먹고 싶을 때·조금 제대로 된 한 끼가 당길 때·혼자 여유 있게 먹을 때',
    titlePurpose: '갓 볶아 제대로 먹기 좋은',
    portionFeel: '한 그릇으로 한 끼가 되는 편, 소스를 따로 받아 양 조절이 되는 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니 식사용',
    paceFeel: '소스를 부어 비벼 먹는 잠깐의 재미, 면 불기 전에 먹는 편',
    visitTiming: '점심·저녁 끼니 때, 여유 있는 한 끼로 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '갓 볶은 걸 바로 먹고 싶으면 간짜장, 간편하게는 일반 짜장면, 해물이 당기면 삼선짜장 쪽으로 갈리는 편',
  },
  '삼선짜장': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '해물 들어간 짜장으로 든든하게',
    tasteCore: '해물이 들어가 조금 특별하게 먹는 짜장 — 평소와 다르게 먹고 싶을 때 고르는 편',
    sceneCore: '건더기를 골라 가며 비비는 자리, 평소 짜장과 다른 걸 시킨 풍경',
    hook: '평소 짜장과 다르게 건더기가 씹혀 색달랐어요',
    keyword: '삼선짜장',
    servingUnit: '한 그릇',
    priceFeel: '조금 특별하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '평소 짜장은 물렸고 색다르게 먹고 싶을 때·조금 든든하게 한 끼 하고 싶을 때·해물 좋아하는 사람과 갔을 때·기분 내서 조금 특별하게 시킬 때·혼자 제대로 한 끼 챙길 때',
    titlePurpose: '색다르게 든든히 먹기 좋은',
    portionFeel: '건더기가 있어 든든한 한 그릇, 일반 짜장보다 묵직한 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니 식사용',
    paceFeel: '건더기를 골라 먹으며 천천히, 일반 짜장보다 여유 있게 먹는 편',
    visitTiming: '점심·저녁 끼니 때, 기분 낼 때 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '색다르게 든든히 먹고 싶으면 삼선짜장, 간편하게는 일반 짜장면, 갓 볶은 게 좋으면 간짜장 쪽으로 갈리는 편',
  },
  '짬뽕': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '얼큰한 국물 면 한 그릇 하고 싶어서',
    tasteCore: '얼큰하고 뜨끈한 국물 — 속을 풀거나 몸을 데우고 싶을 때 찾는 맛',
    sceneCore: '뜨거운 국물부터 한 술 뜨는 풍경, 김에 안경이 살짝 서리는 자리',
    hook: '국물 한 술에 속이 확 풀리는 느낌이었어요',
    keyword: '짬뽕',
    servingUnit: '한 그릇',
    priceFeel: '얼큰하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 국자, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '전날 술자리 다음 날 속을 풀고 싶을 때·추운 날 뜨끈한 국물이 당길 때·매운 게 먹고 싶어 스트레스 풀 때·감기 기운에 땀 빼고 싶을 때·짜장면은 물렸고 다른 게 먹고 싶을 때',
    titlePurpose: '얼큰하게 속 풀기 좋은',
    portionFeel: '국물까지 있어 든든한 한 그릇, 매운 정도는 매장마다 차이가 있는 편',
    sharingFeel: '각자 한 그릇씩 시키고, 짜장면과 반씩 나눠 먹는 경우도 흔함',
    usageType: '끼니·속풀이용',
    paceFeel: '국물부터 천천히, 면과 번갈아 먹으며 오래 앉는 편',
    visitTiming: '점심·저녁 끼니 때, 술자리 다음 날 찾는 경우도 많음',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '속을 풀거나 뜨끈한 국물이 당기면 짬뽕, 덜 맵게 먹고 싶으면 백짬뽕, 국물 없이 진한 게 좋으면 짜장면 쪽으로 갈리는 편',
  },
  '삼선짬뽕': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '해물 푸짐한 얼큰한 면 한 그릇',
    tasteCore: '해물이 푸짐하게 들어가 조금 특별하게 먹는 짬뽕 — 기분 낼 때 고르는 편',
    sceneCore: '건더기를 골라 가며 먹는 자리, 일반 짬뽕보다 푸짐하게 시킨 풍경',
    hook: '일반 짬뽕보다 건더기가 많아 골라 먹는 재미가 있었어요',
    keyword: '삼선짬뽕',
    servingUnit: '한 그릇',
    priceFeel: '푸짐하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 국자, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '일반 짬뽕은 아쉽고 푸짐하게 먹고 싶을 때·해물 좋아하는 사람과 갔을 때·기분 내서 조금 특별하게 시킬 때·전날 술자리 다음 날 든든히 속 풀 때·혼자 제대로 한 끼 챙길 때',
    titlePurpose: '푸짐하게 속 풀기 좋은',
    portionFeel: '건더기가 많아 든든한 한 그릇, 일반 짬뽕보다 묵직한 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니·속풀이용',
    paceFeel: '건더기를 골라 먹으며 천천히, 국물과 번갈아 오래 앉는 편',
    visitTiming: '점심·저녁 끼니 때, 기분 낼 때·술자리 다음 날 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '푸짐하게 속 풀고 싶으면 삼선짬뽕, 간편하게는 일반 짬뽕, 덜 맵게는 백짬뽕 쪽으로 갈리는 편',
  },
  '백짬뽕': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '맵지 않은 국물 면을 찾아서',
    tasteCore: '맵지 않고 깔끔한 국물 — 자극적인 게 부담스러울 때 고르는 편',
    sceneCore: '맵지 않아 아이도 같이 먹는 자리, 국물부터 떠 보는 풍경',
    hook: '맵지 않아 국물까지 부담 없이 비웠어요',
    keyword: '백짬뽕',
    servingUnit: '한 그릇',
    priceFeel: '담백하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 국자, 단무지 접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '얼큰한 짬뽕이 부담스러운 날·아이와 함께라 안 매운 걸 골라야 할 때·속이 불편해 자극적인 걸 피하고 싶을 때·매운 걸 잘 못 먹는 사람과 갔을 때·깔끔한 국물 면이 당길 때',
    titlePurpose: '맵지 않게 깔끔히 먹기 좋은',
    portionFeel: '국물까지 있어 든든한 한 그릇, 맵지 않아 끝까지 비우기 좋은 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니 식사용',
    paceFeel: '맵지 않아 국물까지 천천히, 부담 없이 오래 앉는 편',
    visitTiming: '점심·저녁 끼니 때, 아이 동반·속이 편할 때 자주 나감',
    bestCompanion: '혼자·가족·아이 동반',
    decisionPoint: '맵지 않게 깔끔히 먹고 싶으면 백짬뽕, 얼큰한 게 당기면 일반 짬뽕, 국물 없이 진하게는 짜장면 쪽으로 갈리는 편',
  },
  '볶음밥': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '간편하게 밥 한 그릇 하고 싶어서',
    tasteCore: '면 대신 밥으로 간단히 먹는 한 끼 — 밀가루가 부담스러울 때 고르는 편',
    sceneCore: '짜장 소스와 국물을 곁들여 먹는 자리, 숟가락으로 슥슥 떠먹는 풍경',
    hook: '숟가락으로 슥슥 떠먹기 좋아 금방 비웠어요',
    keyword: '볶음밥',
    servingUnit: '한 그릇',
    priceFeel: '간편하게 한 그릇 하기 좋은',
    tableware: '밥 그릇, 짜장 소스 그릇, 짬뽕 국물',
    sidedishes: ['단무지', '짜장 소스', '짬뽕 국물'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '면보다 밥이 당길 때·밀가루가 부담스러운 날·아이가 면을 잘 못 먹을 때·짜장·짬뽕은 물렸고 다른 게 먹고 싶을 때·간단히 밥 한 끼 챙길 때',
    titlePurpose: '밥으로 간단히 먹기 좋은',
    portionFeel: '한 그릇으로 한 끼가 되는 편, 국물을 곁들이면 더 든든한 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니 식사용',
    paceFeel: '숟가락으로 빠르게 떠먹는 편, 국물과 번갈아 먹는 편',
    visitTiming: '점심·저녁 끼니 때, 면이 부담스러운 날 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '면보다 밥이 당기면 볶음밥, 잡채까지 곁들이려면 잡채밥, 면이 당기면 짜장면 쪽으로 갈리는 편',
  },
  '잡채밥': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '밥과 잡채를 한 번에 먹고 싶어서',
    tasteCore: '밥과 잡채를 한 그릇에 먹는 조합 — 골고루 먹고 싶을 때 고르는 편',
    sceneCore: '잡채를 밥에 올려 비벼 먹는 자리, 한 그릇으로 든든히 챙기는 풍경',
    hook: '잡채를 밥에 올려 비비니 한 그릇으로 든든했어요',
    keyword: '잡채밥',
    servingUnit: '한 그릇',
    priceFeel: '든든하게 한 그릇 하기 좋은',
    tableware: '밥 그릇, 짬뽕 국물, 단무지 접시',
    sidedishes: ['단무지', '짬뽕 국물'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '밥에 반찬까지 한 그릇에 해결하고 싶을 때·면이 부담스러운 날·골고루 든든히 챙기고 싶을 때·짜장·짬뽕은 물렸을 때·혼자 제대로 한 끼 챙길 때',
    titlePurpose: '골고루 든든히 먹기 좋은',
    portionFeel: '밥과 잡채가 함께라 든든한 한 그릇, 반찬 겸 한 끼가 되는 편',
    sharingFeel: '각자 한 그릇씩 시키고, 여럿이면 요리 하나를 곁들이는 식',
    usageType: '끼니 식사용',
    paceFeel: '비벼서 숟가락으로 먹는 편, 국물과 번갈아 든든히 먹는 편',
    visitTiming: '점심·저녁 끼니 때, 든든히 챙기고 싶을 때 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '골고루 든든히 먹고 싶으면 잡채밥, 간단히 밥만은 볶음밥, 면이 당기면 짜장면 쪽으로 갈리는 편',
  },
  '탕수육': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '여럿이 나눠 먹을 요리 하나 시키려고',
    tasteCore: '다 같이 집어 먹기 좋은 요리 — 아이부터 어른까지 무난하게 먹는 편',
    sceneCore: '큰 접시를 가운데 두고 앞접시로 덜어 가는 풍경, 부먹·찍먹 고르는 자리',
    hook: '가운데 두고 다 같이 하나씩 집어 먹기 좋았어요',
    keyword: '탕수육',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 소스 그릇, 앞접시',
    sidedishes: ['소스', '단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '가족 외식에서 다 같이 집어 먹을 요리가 필요할 때·면만으로 부족해 하나 더 시킬 때·아이 있는 자리에서 무난한 요리를 고를 때·회식에서 술 곁들일 안주가 필요할 때·처음 온 집에서 대표 요리를 맛볼 때',
    titlePurpose: '다 같이 나눠 먹기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사 메뉴와 함께 시키는 경우가 많음',
    usageType: '요리·곁들임용',
    paceFeel: '식사와 함께 천천히 — 소스가 눅기 전에 먼저 먹는 편',
    visitTiming: '가족 외식·모임 자리에서 식사와 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·친구·모임 일행',
    decisionPoint: '여럿이 곁들일 요리면 탕수육이 무난, 매콤한 게 좋으면 깐풍기, 담백하게는 유린기 쪽을 고르는 편. 소스는 부먹·찍먹 취향대로',
  },
  '깐풍기': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '매콤한 튀김 요리 하나 곁들이려고',
    tasteCore: '매콤한 맛으로 즐기는 튀김 요리 — 술안주나 매운 게 당길 때 고르는 편',
    sceneCore: '가운데 두고 앞접시로 덜어 가는 자리, 매콤한 걸 하나씩 집는 풍경',
    hook: '매콤한 맛에 자꾸 손이 가 금방 접시가 비었어요',
    keyword: '깐풍기',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 앞접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '매콤한 요리로 술 곁들일 때·탕수육은 물렸고 매운 게 당길 때·여럿이 매운 걸 나눠 먹을 때·면에 매콤한 요리 하나 더할 때·기분 내서 술자리 안주 시킬 때',
    titlePurpose: '매콤하게 곁들이기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사·술과 함께 시키는 경우가 많음',
    usageType: '요리·안주용',
    paceFeel: '술과 함께 천천히, 매콤한 걸 하나씩 집어 먹는 편',
    visitTiming: '회식·모임 자리에서 술과 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '친구·모임 일행·직장 동료',
    decisionPoint: '매콤한 게 좋으면 깐풍기, 무난하게는 탕수육, 새콤한 게 좋으면 유린기 쪽으로 갈리는 편',
  },
  '유린기': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '새콤한 소스 튀김 요리를 먹고 싶어서',
    tasteCore: '새콤한 맛으로 즐기는 튀김 요리 — 느끼하지 않게 먹고 싶을 때 고르는 편',
    sceneCore: '가운데 두고 채소와 함께 덜어 가는 자리, 새콤한 걸 하나씩 집는 풍경',
    hook: '새콤한 소스 덕에 느끼하지 않게 계속 손이 갔어요',
    keyword: '유린기',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 앞접시',
    sidedishes: ['채 썬 채소', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '느끼하지 않게 새콤한 요리를 곁들일 때·매운 건 부담스럽고 새콤한 게 당길 때·아이도 같이 먹을 요리를 고를 때·여럿이 나눠 먹을 요리를 찾을 때·튀김에 채소도 함께 먹고 싶을 때',
    titlePurpose: '새콤하게 곁들이기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사 메뉴와 함께 시키는 경우가 많음',
    usageType: '요리·곁들임용',
    paceFeel: '채소와 함께 천천히, 새콤한 걸 하나씩 집어 먹는 편',
    visitTiming: '가족 외식·모임 자리에서 식사와 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·친구·모임 일행',
    decisionPoint: '느끼하지 않게 새콤한 게 좋으면 유린기, 매콤한 게 좋으면 깐풍기, 무난하게는 탕수육 쪽으로 갈리는 편',
  },
  '고추잡채': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '꽃빵에 싸 먹는 요리를 시켜 보려고',
    tasteCore: '꽃빵에 싸 먹는 재미가 있는 요리 — 색다르게 먹고 싶을 때 고르는 편',
    sceneCore: '꽃빵을 갈라 싸 먹는 자리, 여럿이 나눠 집는 풍경',
    hook: '꽃빵에 싸 먹으니 색다르게 즐길 수 있었어요',
    keyword: '고추잡채',
    servingUnit: '한 접시',
    priceFeel: '나눠 먹기 좋은',
    tableware: '접시, 꽃빵 그릇, 앞접시',
    sidedishes: ['꽃빵', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '꽃빵에 싸 먹는 색다른 요리를 시킬 때·여럿이 나눠 먹을 요리를 고를 때·튀김류가 물렸고 다른 게 당길 때·술 곁들일 담백한 안주가 필요할 때·기분 내서 색다르게 시킬 때',
    titlePurpose: '꽃빵에 싸 먹기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 꽃빵과 함께 나눠 먹는 양',
    sharingFeel: '가운데 두고 꽃빵에 싸 나눠 먹는 요리 — 여럿이 함께 시키는 경우가 많음',
    usageType: '요리·안주용',
    paceFeel: '꽃빵에 싸 가며 천천히, 대화하며 오래 즐기는 편',
    visitTiming: '회식·모임 자리에서 술과 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '친구·모임 일행·직장 동료',
    decisionPoint: '색다르게 싸 먹는 게 좋으면 고추잡채, 매콤한 튀김은 깐풍기, 무난하게는 탕수육 쪽으로 갈리는 편',
  },
  '칠리새우': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '새우 요리 하나 곁들이고 싶어서',
    tasteCore: '매콤달콤한 맛으로 즐기는 새우 요리 — 아이도 어른도 좋아할 때 고르는 편',
    sceneCore: '가운데 두고 하나씩 집어 가는 자리, 아이 손이 먼저 가는 풍경',
    hook: '매콤달콤해서 아이도 어른도 자꾸 손이 갔어요',
    keyword: '칠리새우',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 앞접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '아이와 함께 새우 요리를 나눠 먹을 때·매콤달콤한 게 당길 때·튀김류에 변화를 주고 싶을 때·여럿이 나눠 먹을 요리를 고를 때·기분 내서 새우 요리 시킬 때',
    titlePurpose: '매콤달콤하게 나눠 먹기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사 메뉴와 함께 시키는 경우가 많음',
    usageType: '요리·곁들임용',
    paceFeel: '하나씩 집어 가며 천천히, 식사와 함께 먹는 편',
    visitTiming: '가족 외식·모임 자리에서 식사와 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·친구·아이 동반',
    decisionPoint: '매콤달콤한 새우가 좋으면 칠리새우, 부드러운 게 좋으면 크림새우, 무난하게는 탕수육 쪽으로 갈리는 편',
  },
  '크림새우': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '부드러운 새우 요리를 먹고 싶어서',
    tasteCore: '맵지 않고 부드러운 새우 요리 — 자극적이지 않게 먹고 싶을 때 고르는 편',
    sceneCore: '가운데 두고 하나씩 집어 가는 자리, 아이도 같이 먹는 풍경',
    hook: '맵지 않고 부드러워 아이와 같이 먹기 좋았어요',
    keyword: '크림새우',
    servingUnit: '한 접시',
    priceFeel: '곁들이기 좋은',
    tableware: '접시, 앞접시',
    sidedishes: ['단무지', '양파'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '매운 걸 못 먹는 사람과 갔을 때·아이와 함께 부드러운 요리를 나눌 때·자극적인 게 부담스러운 날·튀김류에 변화를 주고 싶을 때·기분 내서 새우 요리 시킬 때',
    titlePurpose: '부드럽게 나눠 먹기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사 메뉴와 함께 시키는 경우가 많음',
    usageType: '요리·곁들임용',
    paceFeel: '하나씩 집어 가며 천천히, 식사와 함께 먹는 편',
    visitTiming: '가족 외식·모임 자리에서 식사와 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·아이 동반·친구',
    decisionPoint: '맵지 않고 부드러운 게 좋으면 크림새우, 매콤달콤한 게 좋으면 칠리새우, 무난하게는 탕수육 쪽으로 갈리는 편',
  },
  '양장피': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '여럿이 둘러앉아 냉채를 나누려고',
    tasteCore: '시원하게 무쳐 먹는 냉채 — 처음에 입맛 돋우거나 여럿이 나눌 때 고르는 편',
    sceneCore: '가운데 큰 접시를 두고 다 같이 버무려 더는 자리, 코스 시작을 여는 풍경',
    hook: '다 같이 버무려 나누니 자리 분위기가 살았어요',
    keyword: '양장피',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 겨자 소스, 앞접시',
    sidedishes: ['겨자 소스', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '여럿이 모여 코스처럼 시작 요리가 필요할 때·기름진 요리 전 입맛을 돋우고 싶을 때·상견례·모임 자리에서 격식 있게 차릴 때·시원한 요리를 나눠 먹고 싶을 때·기분 내서 제대로 시킬 때',
    titlePurpose: '여럿이 격식 있게 나누기 좋은',
    portionFeel: '여럿이 나눠 먹는 큰 접시, 4인 이상 모임에 무난한 양',
    sharingFeel: '가운데 두고 다 같이 버무려 나누는 요리 — 여럿이 함께 시키는 경우가 많음',
    usageType: '요리·모임용',
    paceFeel: '자리 시작에 다 같이 버무려 천천히, 대화하며 즐기는 편',
    visitTiming: '모임·상견례·회식 자리에서, 저녁 시간대에 자주 나감',
    bestCompanion: '가족 모임·친구 모임·격식 자리',
    decisionPoint: '시원하게 시작하는 냉채면 양장피, 따뜻한 해물 요리면 팔보채, 부드러운 볶음은 유산슬 쪽으로 갈리는 편',
  },
  '팔보채': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '해물 듬뿍 들어간 요리를 나누려고',
    tasteCore: '해물이 푸짐해 여럿이 나눠 먹는 요리 — 모임에서 든든하게 차릴 때 고르는 편',
    sceneCore: '가운데 큰 접시를 두고 다 같이 덜어 가는 자리, 꽃빵과 곁들이는 풍경',
    hook: '푸짐해서 여럿이 나눠도 넉넉하게 즐겼어요',
    keyword: '팔보채',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 국자, 앞접시',
    sidedishes: ['꽃빵', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '여럿이 모여 푸짐한 요리를 나눌 때·해물 좋아하는 사람과 갔을 때·모임·회식에서 든든하게 차릴 때·꽃빵과 곁들일 따뜻한 요리를 찾을 때·기분 내서 제대로 시킬 때',
    titlePurpose: '여럿이 푸짐하게 나누기 좋은',
    portionFeel: '여럿이 나눠 먹는 큰 접시, 4인 이상 모임에 무난한 양',
    sharingFeel: '가운데 두고 다 같이 덜어 먹는 요리 — 여럿이 함께 시키는 경우가 많음',
    usageType: '요리·모임용',
    paceFeel: '꽃빵과 곁들여 천천히, 대화하며 오래 즐기는 편',
    visitTiming: '모임·회식 자리에서, 저녁 시간대에 자주 나감',
    bestCompanion: '가족 모임·친구 모임·직장 동료',
    decisionPoint: '따뜻한 해물 요리를 푸짐하게 나누려면 팔보채, 시원한 냉채는 양장피, 부드러운 볶음은 유산슬 쪽으로 갈리는 편',
  },
  '유산슬': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '부드러운 볶음 요리를 시켜 보려고',
    tasteCore: '부드러워 누구나 먹기 좋은 볶음 요리 — 어르신·아이와 함께일 때 고르는 편',
    sceneCore: '가운데 두고 밥에 올려 먹기도 하는 자리, 다 같이 덜어 가는 풍경',
    hook: '부드러워서 어른들도 아이도 편하게 드셨어요',
    keyword: '유산슬',
    servingUnit: '한 접시',
    priceFeel: '나눠 먹기 좋은',
    tableware: '접시, 국자, 앞접시',
    sidedishes: ['꽃빵', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '어르신·아이와 함께라 부드러운 요리가 필요할 때·자극적인 게 부담스러운 자리·밥에 올려 먹을 요리를 찾을 때·모임에서 무난한 요리를 고를 때·기분 내서 제대로 시킬 때',
    titlePurpose: '부드럽게 나눠 먹기 좋은',
    portionFeel: '여럿이 나눠 먹는 접시, 밥과 곁들이면 더 든든한 편',
    sharingFeel: '가운데 두고 다 같이 덜어 먹는 요리 — 여럿이 함께 시키는 경우가 많음',
    usageType: '요리·모임용',
    paceFeel: '밥에 올려 가며 천천히, 대화하며 즐기는 편',
    visitTiming: '가족 외식·모임 자리에서, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·어르신 동반·아이 동반',
    decisionPoint: '부드럽게 누구나 먹기 좋은 건 유산슬, 시원한 냉채는 양장피, 푸짐한 해물은 팔보채 쪽으로 갈리는 편',
  },
  '동파육': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '진하게 조린 고기 요리를 먹어 보려고',
    tasteCore: '진하게 조려 특별하게 먹는 고기 요리 — 기분 낼 때나 색다른 걸 찾을 때 고르는 편',
    sceneCore: '꽃빵에 싸 나눠 먹는 자리, 젓가락으로 갈라 덜어 가는 풍경',
    hook: '꽃빵에 싸 먹으니 진한 맛이 잘 어울렸어요',
    keyword: '동파육',
    servingUnit: '한 접시',
    priceFeel: '특별하게 한 접시 하기 좋은',
    tableware: '접시, 꽃빵 그릇, 앞접시',
    sidedishes: ['꽃빵', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '기분 내서 특별한 요리를 시킬 때·꽃빵에 싸 먹는 색다른 걸 찾을 때·모임에서 든든한 고기 요리가 필요할 때·평소 안 먹던 걸 시도해 볼 때·제대로 차려 대접할 때',
    titlePurpose: '특별하게 대접하기 좋은',
    portionFeel: '여럿이 나눠 먹는 접시, 꽃빵과 곁들이면 든든한 편',
    sharingFeel: '가운데 두고 꽃빵에 싸 나눠 먹는 요리 — 여럿이 함께 시키는 경우가 많음',
    usageType: '요리·모임용',
    paceFeel: '꽃빵에 싸 가며 천천히, 대화하며 오래 즐기는 편',
    visitTiming: '모임·대접 자리에서, 저녁 시간대에 자주 나감',
    bestCompanion: '가족 모임·격식 자리·친구 모임',
    decisionPoint: '진하게 조린 고기가 좋으면 동파육, 꽃빵에 싸는 볶음은 고추잡채, 부드러운 볶음은 유산슬 쪽으로 갈리는 편',
  },
  '샤오롱바오': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '육즙 있는 만두를 맛보고 싶어서',
    tasteCore: '한 입 크기로 즐기는 만두 — 가볍게 하나 더 시키거나 색다른 걸 찾을 때 고르는 편',
    sceneCore: '찜기째 나와 하나씩 집는 자리, 여럿이 나눠 집어 먹는 풍경',
    hook: '한 입에 쏙 들어가 가볍게 즐기기 좋았어요',
    keyword: '샤오롱바오',
    servingUnit: '한 접시',
    priceFeel: '가볍게 곁들이기 좋은',
    tableware: '찜기, 숟가락, 식초 그릇',
    sidedishes: ['식초', '생강채'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '가볍게 만두 하나 더 곁들일 때·군만두는 물렸고 색다른 걸 찾을 때·면 나오기 전 요기가 필요할 때·여럿이 나눠 집어 먹을 걸 고를 때·기분 내서 색다르게 시킬 때',
    titlePurpose: '가볍게 색다르게 곁들이기 좋은',
    portionFeel: '한 접시를 여럿이 나눠 집어 먹는 편, 요기용으로 가벼운 양',
    sharingFeel: '나눠 집어 먹는 곁들임 — 단품보다 식사와 함께 시키는 경우가 많음',
    usageType: '곁들임·요기용',
    paceFeel: '나오면 하나씩 집어 먹는 편, 식사 전 워밍업',
    visitTiming: '식사 곁들임으로 아무 때나, 색다른 걸 찾을 때 자주 나감',
    bestCompanion: '혼자·가족·친구',
    decisionPoint: '색다른 만두를 가볍게 즐기려면 샤오롱바오, 바삭한 게 좋으면 군만두 쪽으로 갈리는 편',
  },
  '군만두': {
    genericName: '중식당',
    altGenericNames: ['중국집', '가게', '여기'],
    motive: '바삭한 만두를 곁들이고 싶어서',
    tasteCore: '가볍게 하나 더 집어 먹기 좋은 곁들임 — 부담 없는 양',
    sceneCore: '면 나오기 전 먼저 나와 하나씩 집는 풍경, 소스에 찍어 나누는 자리',
    hook: '면 기다리는 동안 하나씩 집어 먹기 좋았어요',
    keyword: '군만두',
    servingUnit: '한 접시',
    priceFeel: '가볍게 곁들이기 좋은',
    tableware: '접시, 간장 식초 소스',
    sidedishes: ['간장 식초 소스', '단무지'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 방문축·판단축 (B축 commercial 소비) — Scene 다양화·실판단 중심
    recommendSituation: '면만으로 살짝 아쉬워 하나 더 시킬 때·면 나오기 전 요기가 필요할 때·아이가 먹을 가벼운 걸 찾을 때·요리는 부담스럽고 가벼운 곁들임만 원할 때·포장에 함께 담아 가고 싶을 때',
    titlePurpose: '가볍게 곁들이기 좋은',
    portionFeel: '한 접시를 여럿이 나눠 집어 먹는 편, 요기용으로 가벼운 양',
    sharingFeel: '나눠 먹기 좋은 곁들임 — 단품보다 식사와 함께',
    usageType: '곁들임·요기용',
    paceFeel: '먼저 나오면 바로 집어 먹는 편 — 식사 전 워밍업',
    visitTiming: '식사 곁들임으로 아무 때나, 포장에 함께 담기는 경우도 많음',
    bestCompanion: '혼자·가족·아이 동반',
    decisionPoint: '식사에 가볍게 곁들이면 군만두가 무난, 국물째 먹고 싶으면 물만두 쪽을 고르는 편',
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS — 중식 결 (효능/관용 표현 배제)
// ─────────────────────────────────────────────────────────
export const CHINESE_SITUATIONS = [
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
    tasteExtra: '혼자라서 면이나 밥 한 그릇에만 집중할 수 있었어요',
    sceneExtra: '카운터 자리나 작은 테이블에 혼자 앉은 손님들 분위기',
    hookExtra: '혼자 들어갔는데 1인 메뉴가 잘 갖춰져 있어서 편했어요',
    flowBias: 'arrive',
  },
  '점심': {
    motiveExtra: '점심시간에 빠르게 한 끼 하러',
    tasteExtra: '점심에 가볍게 면 한 그릇 하기 좋은 양과 간',
    sceneExtra: '점심 피크에 직장인 손님이 빠르게 식사하고 가는 분위기',
    hookExtra: '점심시간이라 회전이 빨라서 주문하고 금방 나왔어요',
    flowBias: 'taste',
  },
  '포장': {
    motiveExtra: '집에서 먹으려고 포장하러',
    tasteExtra: '포장이라 면이 불을까 했는데 소스를 따로 담아주셔서 괜찮았어요',
    sceneExtra: '포장 손님이 카운터 앞에서 기다리는 풍경',
    hookExtra: '포장 주문하고 잠깐 기다리니 따끈하게 담아주셨어요',
    flowBias: 'order',
  },
  '가족 외식': {
    motiveExtra: '가족끼리 여러 메뉴 나눠 먹으러',
    tasteExtra: '면·밥·요리를 골고루 시켜 나눠 먹기 좋은 구성',
    sceneExtra: '4인 이상 둘러앉아 요리를 가운데 두고 나눠 먹는 분위기',
    hookExtra: '가운데 요리를 두고 각자 앞접시에 덜어 먹으니 편했어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적
// ─────────────────────────────────────────────────────────
export const CHINESE_PURPOSES = [
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
    sceneExtra: '혼자 와서 면이나 밥 한 그릇 부담 없이 먹는 분위기',
    tableExtra: '1인석 또는 작은 2인 테이블',
    paceExtra: '식사 시간 20~30분 정도, 빠르게 먹고 나옴',
  },
  '가족모임': {
    sceneExtra: '4인 이상 모여 요리를 나눠 먹기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블, 회전 테이블이 있는 경우도',
    paceExtra: '식사 시간 1시간 안팎, 요리·면·밥 골고루 시켜 천천히',
    extraDetail: '아이가 먹기 좋은 메뉴(짜장면·볶음밥)인지 1줄 언급',
  },
  '친구': {
    sceneExtra: '친구랑 마주 앉아 면·요리 하나씩 나눠 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블, 요리 접시 올려놓기 좋은 크기',
    paceExtra: '식사 시간 40분~1시간, 요리에 면 곁들여 나눠 먹음',
  },
  '간단히': {
    sceneExtra: '오래 머물기보다 면 한 그릇 빠르게 먹고 가는 분위기',
    tableExtra: '1~2인 자리 또는 포장 위주',
    paceExtra: '식사 시간 20~30분, 간단히 먹거나 포장',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 가상 매장 1개 (검증용 / 본문 노출 금지)
//   ⚠ 실제 중식 매장 데이터 확보 전 OWNER 생성 검증용 (SOP STEP4)
//   ⚠ 매장명·brandName 필드 없음 — genericName(placeholder)만 사용
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_chinese_01',
    region: '구리',
    cat: '중식',
    representativeMenu: '짜장면',
    menus: ['짜장면', '짬뽕', '탕수육'],
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
// buildDirection — 하이브리드 merge (restaurant-data 시그니처 동형)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) {
    return {
      genericName: '중식당',
      motive: '근처에서 중식 한 끼 하러',
      tasteCore: '기본적인 중화요리 느낌',
      sceneCore: '동네 중식당 분위기',
      hook: '문 열고 들어가니 익숙한 중식당 풍경이었어요',
      keyword: '중식',
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

  // ══════════════════════════════════════════════════════════
  // ★ v3 방문목적 우선 합성 (PURPOSE → SITUATION → MENU) — restaurant B축 동형 이식
  //   ⚠ 기존 필드(motive·tasteCore·sceneCore) 무수정 → personal 출력 불변
  //   ⚠ 아래 신규 필드는 commercial(B축)만 소비. 반환계약 유지(필드 추가만)
  // ══════════════════════════════════════════════════════════
  // chinese-data엔 PURPOSE_TITLE_LABEL 미정의 → base.titlePurpose 폴백만 사용
  const purLabel = base.titlePurpose || '';

  // purposeFrame: "방문목적 → 상황 → 메뉴" 순서 방문 서사 (commercial menuIntro/scene용)
  const purposeFrameParts = [];
  if (purOvr.purposeMotive) purposeFrameParts.push(purOvr.purposeMotive);
  else if (purpose) purposeFrameParts.push(`${purpose} 자리를 찾는 상황`);
  if (sitOvr.motiveExtra) purposeFrameParts.push(sitOvr.motiveExtra);
  const purposeFrame = purposeFrameParts.join(' / ');

  // 목적 우선 합성 필드 — base(메뉴) 값 폴백, 목적 보정 있으면 앞세움
  const decisionPoint = purOvr.decisionPoint || base.decisionPoint || '';
  const recommendSituation = purOvr.recommendSituation || base.recommendSituation || '';
  const visitTiming = purOvr.visitTiming || base.visitTiming || (base.timeOfDay ? base.timeOfDay.join('·') : '');
  const bestCompanion = purOvr.bestCompanion || base.bestCompanion || '';

  // ★ v3 만족 판단축 (단정 금지 — 독자가 만족 가늠할 재료. base 폴백)
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
    // ★ v3 방문목적 우선 필드 (commercial 전용 소비 — personal 미참조라 무영향)
    purposeLabel: purLabel,
    purposeFrame,
    decisionPoint,
    recommendSituation,
    visitTiming,
    bestCompanion,
    // ★ v3 만족 판단축 (commercial decision/recommend 소비 — 판단 재료)
    portionFeel,
    sharingFeel,
    usageType,
    paceFeel,
    isSideMenu,
    representativeMenu,
  };
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS — index.js 메뉴 감지용
// ─────────────────────────────────────────────────────────
export const CHINESE_SITE_KEYWORDS = [
  '짜장면', '간짜장', '삼선짜장', '짬뽕', '삼선짬뽕', '백짬뽕',
  '볶음밥', '잡채밥', '탕수육', '깐풍기', '유린기', '고추잡채',
  '칠리새우', '크림새우', '양장피', '팔보채', '유산슬',
  '동파육', '샤오롱바오', '군만두', '군만두',
  // SEO 단순형
  '짜장', '중국집', '중식',
  // 상황·목적
  '혼밥', '점심', '포장', '가족 외식', '가족모임', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 중식 조합 카드 (검증용 가상 매장 1개 × 전체 20메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ 실매장 확보 시 storeId 교체/추가만 — 카드 구조 무변경
//   ⚠ CHINESE_MENUS 20개와 1:1 정합 (OWNER 검증 완전성)
// ─────────────────────────────────────────────────────────
export const CHINESE_TREATMENTS = [
  {
    id: 'rest_chinese_jjajang_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '짜장면',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 짜장면',
      '구리 짜장면 맛집',
      '구리 중국집 짜장면',
      '구리 중식',
      '구리 짜장면 점심',
    ],
    compareWith: '동일 지역 다른 중식당 짜장면',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '짜장면',
    catRef: '중식',
    isRepresentative: true,
  },
  {
    id: 'rest_chinese_ganjjajang_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '간짜장',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 간짜장',
      '구리 간짜장 맛집',
      '구리 중국집 간짜장',
      '구리 중식',
      '구리 간짜장 점심',
    ],
    compareWith: '동일 지역 다른 중식당 간짜장',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '간짜장',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_samseonjjajang_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '삼선짜장',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 삼선짜장',
      '구리 삼선짜장 맛집',
      '구리 중국집 삼선짜장',
      '구리 중식',
      '구리 삼선짜장 점심',
    ],
    compareWith: '동일 지역 다른 중식당 삼선짜장',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '삼선짜장',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_jjamppong_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '짬뽕',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 짬뽕',
      '구리 짬뽕 맛집',
      '구리 중국집 짬뽕',
      '구리 중식',
      '구리 짬뽕 점심',
    ],
    compareWith: '동일 지역 다른 중식당 짬뽕',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '짬뽕',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_samseonjjamppong_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '삼선짬뽕',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 삼선짬뽕',
      '구리 삼선짬뽕 맛집',
      '구리 중국집 삼선짬뽕',
      '구리 중식',
      '구리 삼선짬뽕 점심',
    ],
    compareWith: '동일 지역 다른 중식당 삼선짬뽕',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '삼선짬뽕',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_baekjjamppong_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '백짬뽕',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 백짬뽕',
      '구리 백짬뽕 맛집',
      '구리 중국집 백짬뽕',
      '구리 중식',
      '구리 백짬뽕 점심',
    ],
    compareWith: '동일 지역 다른 중식당 백짬뽕',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '백짬뽕',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_bokkeumbap_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '볶음밥',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 볶음밥',
      '구리 볶음밥 맛집',
      '구리 중국집 볶음밥',
      '구리 중식',
      '구리 볶음밥 점심',
    ],
    compareWith: '동일 지역 다른 중식당 볶음밥',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '볶음밥',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_japchaebap_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '잡채밥',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 잡채밥',
      '구리 잡채밥 맛집',
      '구리 중국집 잡채밥',
      '구리 중식',
      '구리 잡채밥 점심',
    ],
    compareWith: '동일 지역 다른 중식당 잡채밥',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '잡채밥',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_tangsuyuk_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '탕수육',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 탕수육',
      '구리 탕수육 맛집',
      '구리 중국집 탕수육',
      '구리 중식',
      '구리 탕수육 포장',
    ],
    compareWith: '동일 지역 다른 중식당 탕수육',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '탕수육',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_kkanpunggi_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '깐풍기',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 깐풍기',
      '구리 깐풍기 맛집',
      '구리 중국집 깐풍기',
      '구리 중식',
      '구리 깐풍기 포장',
    ],
    compareWith: '동일 지역 다른 중식당 깐풍기',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '깐풍기',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_youlinji_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '유린기',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 유린기',
      '구리 유린기 맛집',
      '구리 중국집 유린기',
      '구리 중식',
      '구리 유린기 포장',
    ],
    compareWith: '동일 지역 다른 중식당 유린기',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '유린기',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_gochujapchae_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '고추잡채',
    cat: '중식',
    name: '이 중식당',
    emoji: '🥢',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 고추잡채',
      '구리 고추잡채 맛집',
      '구리 중국집 고추잡채',
      '구리 중식',
      '구리 고추잡채 점심',
    ],
    compareWith: '동일 지역 다른 중식당 고추잡채',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '고추잡채',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_chillisaeu_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '칠리새우',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 칠리새우',
      '구리 칠리새우 맛집',
      '구리 중국집 칠리새우',
      '구리 중식',
      '구리 칠리새우 포장',
    ],
    compareWith: '동일 지역 다른 중식당 칠리새우',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '칠리새우',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_creamsaeu_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '크림새우',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 크림새우',
      '구리 크림새우 맛집',
      '구리 중국집 크림새우',
      '구리 중식',
      '구리 크림새우 포장',
    ],
    compareWith: '동일 지역 다른 중식당 크림새우',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '크림새우',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_yangjangpi_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '양장피',
    cat: '중식',
    name: '이 중식당',
    emoji: '🥗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 양장피',
      '구리 양장피 맛집',
      '구리 중국집 양장피',
      '구리 중식',
      '구리 양장피 점심',
    ],
    compareWith: '동일 지역 다른 중식당 양장피',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '양장피',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_palbochae_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '팔보채',
    cat: '중식',
    name: '이 중식당',
    emoji: '🦐',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 팔보채',
      '구리 팔보채 맛집',
      '구리 중국집 팔보채',
      '구리 중식',
      '구리 팔보채 점심',
    ],
    compareWith: '동일 지역 다른 중식당 팔보채',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '팔보채',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_yusanseul_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '유산슬',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 유산슬',
      '구리 유산슬 맛집',
      '구리 중국집 유산슬',
      '구리 중식',
      '구리 유산슬 점심',
    ],
    compareWith: '동일 지역 다른 중식당 유산슬',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '유산슬',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_dongpayuk_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '동파육',
    cat: '중식',
    name: '이 중식당',
    emoji: '🍖',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 동파육',
      '구리 동파육 맛집',
      '구리 중국집 동파육',
      '구리 중식',
      '구리 동파육 점심',
    ],
    compareWith: '동일 지역 다른 중식당 동파육',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '동파육',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_syaorongbao_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '샤오롱바오',
    cat: '중식',
    name: '이 중식당',
    emoji: '🥟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 샤오롱바오',
      '구리 샤오롱바오 맛집',
      '구리 중국집 샤오롱바오',
      '구리 중식',
      '구리 샤오롱바오 점심',
    ],
    compareWith: '동일 지역 다른 중식당 샤오롱바오',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '샤오롱바오',
    catRef: '중식',
    isRepresentative: false,
  },
  {
    id: 'rest_chinese_gunmandu_guri_01',
    storeId: 'store_guri_chinese_01',
    industry: 'chinese',
    region: '구리',
    menu: '군만두',
    cat: '중식',
    name: '이 중식당',
    emoji: '🥟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 군만두',
      '구리 군만두 맛집',
      '구리 중국집 군만두',
      '구리 중식',
      '구리 군만두 포장',
    ],
    compareWith: '동일 지역 다른 중식당 군만두',
    nearbyHint: '구리역 근처 중식 식당가',
    menuRef: '군만두',
    catRef: '중식',
    isRepresentative: false,
  },
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const CHINESE_META = {
  industry: 'chinese',
  label: '중식·중화요리',
  greeting: '어떤 중식 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 짜장면 점심 메뉴 정보',
    '구리 짬뽕 혼밥 메뉴 안내',
    '구리 탕수육 포장 메뉴 정리',
    '구리 양장피 가족 외식 정보',
  ],
  badge: '🍜',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const CHINESE_LONGTAIL_SUFFIXES = {
  // 면·밥
  chinese_noodle: [
    '메뉴 정보 정리',
    '점심 메뉴 안내',
    '혼밥 메뉴 정리',
    '포장 정보 안내',
  ],
  // 요리·딤섬
  chinese_dish: [
    '나눠 먹기 좋은 메뉴 안내',
    '곁들임 메뉴 정리',
    '가족 외식 메뉴 안내',
    '요리 구성 정보',
  ],
  default: [
    '메뉴 정보 정리',
    '방문 정보 안내',
    '운영 정보 정리',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — chinese ↔ 의료·카페·한식/분식 narrative·광고 차단
//   ⚠ 한식 결(뚝배기·새우젓·들깨·머릿고기) 침투도 차단 (업종 독립 — Naver §3)
// ─────────────────────────────────────────────────────────
export const CHINESE_BLOCK_MAP = {
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
  // 한식/분식 narrative 침투 차단 (Chinese 독립 ecosystem 유지)
  korean: [
    '뚝배기', '새우젓', '들깨가루', '머릿고기', '우거지', '선지',
    '해장국', '순대국', '공깃밥', '떡볶이', '어묵국물',
  ],
  // 효능·관용 표현 차단 (PHILOSOPHY — 효능 단정 금지)
  efficacy: [
    '해장', '속풀이', '몸보신', '숙취해소', '건강에 좋', '기력 회복',
  ],
};

// ============================================================
// ★ 제목 다양성 풀 (commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열은 data 소유)
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}`
// ============================================================

export const CHINESE_TITLE_MIDDLE = [
  '안내', '정보', '메뉴 안내', '메뉴 정보', '메뉴 소개',
  '방문 정보', '방문 가이드', '이용 안내', '기본 정보', '특징',
  '메뉴 특징', '메뉴 구성', '한눈에 보기', '알아보기', '참고 정보',
];

export const CHINESE_TITLE_SUFFIX = [
  '방문 전 확인', '방문 전 참고사항', '운영 정보', '일반 정보', '기본 안내',
  '메뉴 살펴보기', '메뉴 알아보기', '이용 참고', '선택 전 참고', '특징 정리',
  '한눈에 보기', '정보 정리', '방문 팁', '메뉴 가이드', '기본 내용',
];

// 메뉴별 SCENE 풀 (MIDDLE 자리에 확률적 치환 — 메뉴 매칭 시만)
//   키: 정확한 메뉴명. 미매칭 시 CHINESE_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
export const CHINESE_TITLE_SCENE = {
  '짜장면':       ['면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '간짜장':       ['면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '삼선짜장':     ['면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '짬뽕':         ['국물 면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '삼선짬뽕':     ['국물 면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '백짬뽕':       ['국물 면 메뉴 안내', '중식 면 메뉴 정보', '중식 메뉴 안내'],
  '볶음밥':       ['밥 메뉴 안내', '중식 밥 메뉴 정보', '중식 메뉴 안내'],
  '잡채밥':       ['밥 메뉴 안내', '중식 밥 메뉴 정보', '중식 메뉴 안내'],
  '탕수육':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '깐풍기':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '유린기':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '고추잡채':     ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '칠리새우':     ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '크림새우':     ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '양장피':       ['냉채 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '팔보채':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '유산슬':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '동파육':       ['요리 메뉴 안내', '중식 요리 정보', '중식 메뉴 안내'],
  '샤오롱바오':   ['딤섬 메뉴 안내', '만두 메뉴 정보', '중식 메뉴 안내'],
  '군만두':       ['만두 메뉴 안내', '만두 메뉴 정보', '중식 메뉴 안내'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값('중식') 기준
export const CHINESE_TITLE_SCENE_BY_CATEGORY = {
  '중식': ['중식 메뉴 안내', '중식 메뉴 정보', '식사 메뉴 안내'],
};
