// ============================================================
// snack-data.js — 분식(snack) 엔진 데이터셋
//   복사 베이스: korean-data.js (Restaurant 동형). export 시그니처 1:1 유지.
//   설계 SoT: 인수인계_분식설계확정_2026-06-27 + 외식 공통 class 4축.
//   class 4축: soup(국물) / meat(양념·튀김·볶음) / rice(밥·김밥) / noodle(면)
//     soup만 국물 어휘 허용. meat/rice/noodle = 국물 어휘 금지(prompts 슬롯).
//   받침메뉴(은/는 가드 대상): 국물떡볶이·라볶이·돈가스·순대·라면 (종성 有)
//   매장명 본문 노출 0 — name = placeholder, keywords = 검색의도 (PHILOSOPHY 원칙1)
// ============================================================

export const SNACK_CATS = [
  { key: '분식', label: '분식', emoji: '🍢' },
];

export const SNACK_REGIONS = [
  '구리',
  // 실매장 확보 후 확장
];

// ─────────────────────────────────────────────────────────
// MENUS — 13메뉴. KOREAN_MENUS 동형(카테고리 → 메뉴 배열).
// ─────────────────────────────────────────────────────────
export const SNACK_MENUS = {
  분식: [
    '떡볶이',
    '라볶이',
    '국물떡볶이',
    '순대',
    '튀김',
    '김밥',
    '쫄면',
    '비빔국수',
    '잔치국수',
    '우동',
    '어묵',
    '돈가스',
    '라면',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
//   ★ class meat/rice/noodle = 국물 어휘 배제(맛/장면/choicePoints 전부)
//   ★ class soup만 국물 어휘 허용
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ═══ 떡볶이 (meat) — 양념축 강제. 국물떡볶이와 분리. 국물 어휘 금지. ═══
  '떡볶이': {
    genericName: '분식집',
    altGenericNames: ['분식점', '떡볶이집', '가게', '여기'],
    motive: '매콤달콤한 양념에 졸인 떡 한 그릇 먹고 싶어서',
    tasteCore: '고추장·로제·짜장 중 고른 양념이 떡에 코팅되듯 밴 맛, 밀떡의 쫀득함이나 쌀떡의 부드러움, 양념을 더 졸여 떡에 엉겨붙은 농도',
    sceneCore: '철판이나 그릇에 양념이 떡에 엉겨붙어 윤기 나게 졸여진 풍경',
    hook: '양념이 떡에 착 엉겨붙어서 한 입 베어무니 매콤달콤했어요',
    keyword: '떡볶이',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '접시, 포크, 앞접시',
    sidedishes: ['단무지', '튀김', '김말이'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['고추장 베이스로 졸인 매콤달콤한 양념', '로제·짜장 등으로 졸인 부드러운 양념'],
    choicePoints: ['양념을 고추장·로제·짜장 중 무엇으로 할지', '밀떡으로 할지 쌀떡으로 할지', '튀김·순대를 곁들일지', '양념을 더 졸여 진하게 할지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 라볶이 (meat) — 양념+면사리. 받침메뉴(✓). 국물 어휘 금지. ═══
  '라볶이': {
    genericName: '분식집',
    altGenericNames: ['분식점', '떡볶이집', '가게', '여기'],
    motive: '떡에 라면사리까지 넣어 양념에 졸인 한 그릇 먹으려고',
    tasteCore: '떡과 라면사리에 매콤한 양념이 함께 밴 맛, 사리가 양념을 머금어 쫄깃한 식감, 떡과 면을 같이 건져 먹는 재미',
    sceneCore: '떡과 라면사리가 양념에 함께 졸여져 엉겨붙은 풍경',
    hook: '면사리를 같이 넣어 졸이니 떡이랑 면이 양념을 듬뿍 머금었어요',
    keyword: '라볶이',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '접시, 포크, 앞접시',
    sidedishes: ['단무지', '튀김', '김말이'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['매콤하게 졸인 진한 양념 라볶이', '면사리를 넉넉히 넣은 라볶이'],
    choicePoints: ['면사리를 몇 개 넣을지', '양념을 매콤하게 할지 순하게 할지', '치즈·튀김을 곁들일지', '떡과 면 비율을 어떻게 할지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 국물떡볶이 (soup) — 유일하게 국물 어휘 허용. 받침메뉴(✓). ═══
  '국물떡볶이': {
    genericName: '분식집',
    altGenericNames: ['분식점', '떡볶이집', '가게', '여기'],
    motive: '국물 자작한 떡볶이로 떡도 먹고 국물도 떠먹으려고',
    tasteCore: '자작한 국물에 떡이 잠긴 맛, 매콤한 국물이 떡에 스며든 식감, 국물을 떠서 튀김을 적셔 먹는 재미',
    sceneCore: '국물이 자작하게 잠긴 떡볶이에서 김이 오르는 풍경',
    hook: '국물이 자작해서 튀김을 적셔 먹기 딱 좋았어요',
    keyword: '국물떡볶이',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '그릇, 국자, 앞접시',
    sidedishes: ['단무지', '튀김', '김말이'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['멸치 육수로 맑게 끓인 국물', '진하게 우려내 매콤한 국물'],
    choicePoints: ['국물을 맑게 할지 진하게 할지', '튀김을 국물에 적셔 먹을지', '떡을 밀떡·쌀떡 중 무엇으로 할지', '국물 양을 자작하게 할지 넉넉하게 할지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 순대 (meat) — 백순대/양념순대+부속. 받침메뉴(✓). 국물 어휘 금지. ═══
  '순대': {
    genericName: '분식집',
    altGenericNames: ['분식점', '순대집', '가게', '여기'],
    motive: '쫄깃한 순대에 부속까지 곁들여 먹으려고',
    tasteCore: '쫄깃한 순대 껍질과 속의 부드러움, 간·허파 같은 부속의 식감, 소금이나 양념에 찍어 먹는 맛',
    sceneCore: '접시에 순대와 부속이 소금·양념과 함께 담겨 나오는 풍경',
    hook: '순대를 소금에 살짝 찍으니 쫄깃함이 더 살아났어요',
    keyword: '순대',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '접시, 소금 종지, 앞접시',
    sidedishes: ['소금', '쌈장', '떡볶이 양념'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['소금에 찍어 먹는 담백한 백순대', '양념에 무쳐 매콤한 양념순대'],
    choicePoints: ['백순대로 담백하게 할지 양념순대로 매콤하게 할지', '부속(간·허파)을 곁들일지', '소금·쌈장 중 무엇에 찍을지', '떡볶이 양념을 곁들일지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 튀김 (meat) — 튀김종류/바삭함. 국물 어휘 금지. ═══
  '튀김': {
    genericName: '분식집',
    altGenericNames: ['분식점', '튀김집', '가게', '여기'],
    motive: '갓 튀긴 바삭한 튀김 골라 먹으려고',
    tasteCore: '갓 튀겨 바삭한 튀김옷, 오징어·고구마·김말이 등 종류별 속재료의 식감, 양념을 찍거나 적셔 먹는 맛',
    sceneCore: '갓 튀겨 기름기가 도는 튀김이 종류별로 담긴 풍경',
    hook: '갓 튀긴 거라 베어무니 바삭 소리가 났어요',
    keyword: '튀김',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 곁들이기 좋은',
    tableware: '접시, 종지, 앞접시',
    sidedishes: ['간장', '떡볶이 양념', '단무지'],
    timeOfDay: ['간식', '점심', '저녁'],
    styleAxis: ['갓 튀겨 바삭한 튀김', '속이 부드러운 채소·해물 튀김'],
    choicePoints: ['오징어·고구마·김말이 중 무엇을 고를지', '양념에 적셔 먹을지 그냥 먹을지', '바삭한 정도를 어느 것으로 할지', '여러 종류를 섞어 담을지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 김밥 (rice) — 구성/속재료축. 국물 어휘 금지. ═══
  '김밥': {
    genericName: '분식집',
    altGenericNames: ['분식점', '김밥집', '가게', '여기'],
    motive: '속이 꽉 찬 김밥 한 줄로 간단히 한 끼 하려고',
    tasteCore: '밥과 속재료가 김에 단단히 말린 식감, 참치·치즈·소고기 등 속재료의 맛, 한 줄을 썰어 집어 먹는 재미',
    sceneCore: '도마에서 한 줄을 썰어 단면이 보이게 접시에 담는 풍경',
    hook: '단면을 보니 속재료가 꽉 차서 한 입에 집어 먹기 좋았어요',
    keyword: '김밥',
    servingUnit: '한 줄',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '접시, 단무지 종지, 앞접시',
    sidedishes: ['단무지', '어묵', '우엉'],
    timeOfDay: ['점심', '간식', '아침'],
    styleAxis: ['속이 단정한 기본 김밥', '참치·치즈·소고기로 속을 채운 김밥'],
    choicePoints: ['일반·참치·치즈·소고기·새우 중 무엇으로 할지', '속을 든든하게 채울지 담백하게 할지', '썰어 먹을지 통째로 들고 먹을지', '곁들임으로 어묵을 더할지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 쫄면 (noodle) — 비빔양념/면식감. 국물 어휘 금지. ═══
  '쫄면': {
    genericName: '분식집',
    altGenericNames: ['분식점', '분식', '가게', '여기'],
    motive: '쫄깃한 면에 새콤매콤 양념 비벼 먹으려고',
    tasteCore: '쫄깃하게 탄력 있는 면발, 새콤매콤한 비빔양념이 면에 골고루 밴 맛, 콩나물·채소와 함께 비벼 먹는 식감',
    sceneCore: '쫄깃한 면에 빨간 양념과 채소가 얹혀 비벼지기 직전인 풍경',
    hook: '면이 워낙 쫄깃해서 양념에 비비니 끝까지 탱탱했어요',
    keyword: '쫄면',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '그릇, 젓가락, 앞접시',
    sidedishes: ['단무지', '삶은 달걀', '튀김'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['새콤매콤하게 비빈 양념', '덜 맵게 새콤하게 비빈 양념'],
    choicePoints: ['양념을 맵게 할지 새콤하게 할지', '채소·콩나물을 넉넉히 넣을지', '삶은 달걀을 곁들일지', '면을 더 쫄깃하게 비빌지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 비빔국수 (noodle) — 비빔양념/고명. 국물 어휘 금지. ═══
  '비빔국수': {
    genericName: '분식집',
    altGenericNames: ['분식점', '국수집', '가게', '여기'],
    motive: '새콤달콤 양념에 소면 비벼 시원하게 먹으려고',
    tasteCore: '가는 소면에 새콤달콤한 양념이 밴 맛, 오이·김 같은 고명의 식감, 면을 양념과 골고루 비벼 후루룩 먹는 재미',
    sceneCore: '소면 위에 빨간 양념과 채 썬 고명이 얹혀 비벼지기 직전인 풍경',
    hook: '양념에 비비니 새콤달콤해서 면이 술술 넘어갔어요',
    keyword: '비빔국수',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '그릇, 젓가락, 앞접시',
    sidedishes: ['단무지', '삶은 달걀', '김가루'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['새콤달콤하게 비빈 양념', '매콤하게 비빈 양념'],
    choicePoints: ['양념을 새콤하게 할지 매콤하게 할지', '오이·김 고명을 넉넉히 올릴지', '삶은 달걀을 곁들일지', '면을 더 비벼 양념을 밸지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 잔치국수 (soup) — 국물 어휘 허용. 멸치/사골. ═══
  '잔치국수': {
    genericName: '분식집',
    altGenericNames: ['분식점', '국수집', '가게', '여기'],
    motive: '따뜻한 멸치 국물에 소면 말아 후루룩 먹으려고',
    tasteCore: '맑게 우려낸 멸치 국물, 소면이 국물을 머금어 부드러운 식감, 김가루·고명을 풀어 먹는 맛',
    sceneCore: '맑은 국물에 소면이 담기고 고명이 얹힌 그릇에서 김이 오르는 풍경',
    hook: '국물부터 한 술 떠보니 멸치 맛이 맑고 깔끔했어요',
    keyword: '잔치국수',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '그릇, 국자, 젓가락',
    sidedishes: ['김치', '김가루', '단무지'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['맑게 우려낸 멸치 국물', '진하게 끓인 사골 국물'],
    choicePoints: ['국물을 멸치로 맑게 할지 사골로 진하게 할지', '고명을 넉넉히 올릴지', '김가루를 풀어 먹을지', '면을 국물에 충분히 말지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 우동 (soup) — 국물 어휘 허용. 국물/토핑. ═══
  '우동': {
    genericName: '분식집',
    altGenericNames: ['분식점', '우동집', '가게', '여기'],
    motive: '따뜻한 국물에 굵은 면 후루룩 먹으려고',
    tasteCore: '가다랑어로 우려낸 국물, 굵고 탱탱한 우동 면의 식감, 유부·어묵 같은 토핑을 곁들여 먹는 맛',
    sceneCore: '맑은 국물에 굵은 면과 유부·어묵이 얹힌 그릇에서 김이 오르는 풍경',
    hook: '국물 한 술에 면을 같이 떠 올리니 따뜻하게 풀렸어요',
    keyword: '우동',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '그릇, 국자, 젓가락',
    sidedishes: ['단무지', '김치', '튀김'],
    timeOfDay: ['점심', '간식', '저녁'],
    styleAxis: ['가다랑어로 우려낸 맑은 국물', '진하게 끓인 얼큰한 국물'],
    choicePoints: ['국물을 맑게 할지 얼큰하게 할지', '유부·어묵 토핑을 곁들일지', '튀김을 국물에 적셔 먹을지', '면을 굵은 것으로 할지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 어묵 (soup) — 국물 어휘 허용. 오뎅탕. ═══
  '어묵': {
    genericName: '분식집',
    altGenericNames: ['분식점', '분식', '가게', '여기'],
    motive: '따뜻한 국물에 어묵 꼬치 하나씩 건져 먹으려고',
    tasteCore: '맑게 우려낸 어묵 국물, 꼬치에 끼운 어묵이 국물을 머금은 식감, 국물을 종이컵에 따라 함께 먹는 맛',
    sceneCore: '국물에 어묵 꼬치가 줄지어 담긴 통에서 김이 오르는 풍경',
    hook: '국물을 한 컵 따라 마시니 속이 따뜻하게 풀렸어요',
    keyword: '어묵',
    servingUnit: '한 꼬치',
    priceFeel: '부담 없이 곁들이기 좋은',
    tableware: '꼬치통, 종이컵, 종지',
    sidedishes: ['간장', '떡볶이 양념', '국물'],
    timeOfDay: ['간식', '점심', '저녁'],
    styleAxis: ['맑게 우려낸 담백한 국물', '얼큰하게 끓인 오뎅탕 국물'],
    choicePoints: ['국물을 맑게 할지 얼큰하게 할지', '꼬치를 몇 개 건져 먹을지', '간장에 찍어 먹을지', '국물을 따로 따라 마실지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 돈가스 (meat) — 튀김/소스/두께. 받침메뉴(✓). 국물 어휘 금지. ═══
  '돈가스': {
    genericName: '분식집',
    altGenericNames: ['분식점', '경양식집', '가게', '여기'],
    motive: '바삭한 튀김옷에 소스 얹은 돈가스 한 접시 먹으려고',
    tasteCore: '바삭하게 튀긴 튀김옷과 도톰한 고기의 식감, 소스가 튀김옷에 스며든 맛, 칼로 썰어 한 조각씩 찍어 먹는 재미',
    sceneCore: '넓은 접시에 도톰한 돈가스가 소스에 덮여 나오는 풍경',
    hook: '튀김옷이 바삭해서 썰 때 소리가 났고 소스가 잘 어울렸어요',
    keyword: '돈가스',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '접시, 나이프, 포크',
    sidedishes: ['양배추 샐러드', '단무지', '밥'],
    timeOfDay: ['점심', '저녁', '간식'],
    styleAxis: ['소스를 끼얹은 옛날 돈가스', '소스를 따로 찍는 두툼한 돈가스'],
    choicePoints: ['소스를 끼얹을지 따로 찍을지', '튀김옷을 바삭하게 할지', '고기 두께를 두툼하게 할지', '양배추 샐러드를 곁들일지', '혼자 먹을지 나눠 먹을지'],
  },
  // ═══ 라면 (soup) — 국물 어휘 허용. 받침메뉴(✓). 국물/사리. ═══
  '라면': {
    genericName: '분식집',
    altGenericNames: ['분식점', '분식', '가게', '여기'],
    motive: '얼큰한 국물에 면 한 그릇 후루룩 먹으려고',
    tasteCore: '얼큰하게 끓인 국물, 꼬들하거나 푹 익은 면의 식감, 달걀·파를 풀어 국물에 더하는 맛',
    sceneCore: '냄비째 혹은 그릇에 면과 국물이 담겨 김이 오르는 풍경',
    hook: '국물부터 한 술 떠보니 얼큰하게 속이 풀렸어요',
    keyword: '라면',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '냄비, 그릇, 젓가락',
    sidedishes: ['김치', '단무지', '공깃밥'],
    timeOfDay: ['점심', '간식', '야식'],
    styleAxis: ['얼큰하게 끓인 기본 국물', '진하게 끓여 사리를 더한 국물'],
    choicePoints: ['면을 꼬들하게 할지 푹 익힐지', '달걀·파·치즈를 추가할지', '사리를 더 넣을지', '국물을 얼큰하게 할지 순하게 할지', '혼자 먹을지 나눠 먹을지'],
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS — 외식 공통 승계 (혼밥·간식·포장·나눠먹기)
// ─────────────────────────────────────────────────────────
export const SNACK_SITUATIONS = [
  '혼밥',
  '간식',
  '포장',
  '나눠 먹기',
];

export const SITUATION_OVERRIDES = {
  '혼밥': {
    motiveExtra: '혼자 빠르게 한 끼 해결하러',
    tasteExtra: '혼자라서 한 그릇에만 집중할 수 있었어요',
    sceneExtra: '카운터 자리나 작은 테이블에 혼자 앉은 손님들 분위기',
    hookExtra: '혼자 들어갔는데 1인 메뉴가 잘 갖춰져 있어서 편했어요',
    flowBias: 'arrive',
  },
  '간식': {
    motiveExtra: '출출할 때 가볍게 요기하러',
    tasteExtra: '간식으로 가볍게 집어 먹기 좋은 양과 간',
    sceneExtra: '오후에 가볍게 들러 한두 가지 집어 먹고 가는 분위기',
    hookExtra: '간식 삼아 들렀는데 양이 적당해서 부담 없었어요',
    flowBias: 'taste',
  },
  '포장': {
    motiveExtra: '집에서 먹으려고 포장하러',
    tasteExtra: '포장인데 따로 담아주셔서 집에서도 괜찮았어요',
    sceneExtra: '포장 손님이 카운터 앞에서 기다리는 풍경',
    hookExtra: '포장 주문하고 잠깐 기다리니 따끈하게 담아주셨어요',
    flowBias: 'order',
  },
  '나눠 먹기': {
    motiveExtra: '여럿이 여러 가지 시켜 나눠 먹으러',
    tasteExtra: '여러 메뉴를 시켜 가운데 두고 나눠 먹기 좋은 구성',
    sceneExtra: '여럿이 둘러앉아 떡볶이·튀김·순대를 가운데 두고 나눠 먹는 분위기',
    hookExtra: '가운데 두고 각자 앞접시에 덜어 먹으니 편했어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// VISIT_SITUATIONS — 섹션별 방문상황 로테이션 풀 (분식 검색 현실)
//   ⚠ 단정·효능·광고 표현 없음. '검색 직전 상황'만.
// ─────────────────────────────────────────────────────────
export const SNACK_VISIT_SITUATIONS = [
  { label: '출출한 오후',     cue: '오후에 출출해서 가볍게 요기할 걸 찾는',            weight: 5 },
  { label: '혼밥',           cue: '혼자 편하게 한 끼 해결하려는',                      weight: 5 },
  { label: '간단한 점심',     cue: '점심시간에 빠르게 한 끼를 찾는',                    weight: 5 },
  { label: '학생 하굣길',     cue: '하교·하굣길에 친구와 가볍게 들르는',                weight: 4 },
  { label: '분식 생각나는 날', cue: '문득 떡볶이·튀김 같은 분식이 당기는',              weight: 4 },
  { label: '늦은 야식',      cue: '늦은 시간 출출해서 가볍게 챙겨 먹고 싶은',          weight: 4 },
  { label: '비 오는 날',     cue: '비가 와서 따뜻한 국물 분식이 당기는',               weight: 3 },
  { label: '포장 테이크아웃', cue: '집에서 먹으려고 포장해 가려는',                     weight: 3 },
  { label: '친구와 수다',    cue: '친구와 가볍게 나눠 먹으며 이야기하려는',            weight: 3 },
  { label: '퇴근 후 간단히',  cue: '하루를 마치고 가볍게 한 끼로 풀고 싶은',           weight: 3 },
  { label: '아이 간식',      cue: '아이와 함께 가볍게 먹을 걸 고르는',                 weight: 2 },
  { label: '시험 끝나고',     cue: '시험·일과를 끝내고 가볍게 보상받으려는',           weight: 2 },
  { label: '주말 나들이',    cue: '주말에 가볍게 들러 한 끼 챙기려는',                 weight: 2 },
  { label: '출근 전 아침',   cue: '바쁜 아침에 김밥 한 줄로 간단히 챙기려는',          weight: 2 },
  { label: '운동 후 출출',   cue: '운동 끝나고 가볍게 보충하고 싶은',                  weight: 1 },
  { label: '나눠 먹는 모임',  cue: '여럿이 여러 가지 시켜 나눠 먹으려는',              weight: 1 },
];

// ★ 빈도 가중 비복원 추출 — korean-data 동형(pickRotatedSituations).
export function pickRotatedSituations(count, masterPurpose) {
  const pool = SNACK_VISIT_SITUATIONS.slice();
  const weightedPick = (arr) => {
    const total = arr.reduce((s, x) => s + (x.weight || 1), 0);
    let r = Math.random() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= (arr[i].weight || 1);
      if (r <= 0) return i;
    }
    return arr.length - 1;
  };
  // masterPurpose 전달 시: PURPOSE_SCENE_MAP 계열로만 채움(계열 이탈 차단)
  if (masterPurpose && PURPOSE_SCENE_MAP[masterPurpose]) {
    const series = PURPOSE_SCENE_MAP[masterPurpose].slice();
    const out = [];
    let prev = -1;
    for (let i = 0; i < count; i++) {
      let idx = Math.floor(Math.random() * series.length);
      if (series.length > 1 && idx === prev) idx = (idx + 1) % series.length;
      out.push(series[idx]);
      prev = idx;
    }
    return out;
  }
  // purpose 미전달: 가중 비복원
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = weightedPick(pool);
    out.push(pool[idx].label);
    pool.splice(idx, 1);
  }
  return out;
}

// ─────────────────────────────────────────────────────────
// PURPOSES — Restaurant 공통 파이프라인 (인수인계: 처음부터 공통 사용)
// ─────────────────────────────────────────────────────────
export const SNACK_PURPOSES = [
  '혼밥', '간식', '친구와', '포장', '나눠 먹기', '간단한 한 끼',
];

export const SNACK_PURPOSE_MASTER = [
  '혼밥', '간식', '친구와', '나눠 먹기',
];

export const PURPOSE_SCENE_MAP = {
  '혼밥':       ['혼밥', '간단한 점심', '출출한 오후', '퇴근 후 간단히'],
  '간식':       ['출출한 오후', '학생 하굣길', '분식 생각나는 날', '아이 간식'],
  '친구와':     ['친구와 수다', '학생 하굣길', '주말 나들이', '시험 끝나고'],
  '나눠 먹기':  ['나눠 먹는 모임', '친구와 수다', '주말 나들이', '아이 간식'],
};

export const SNACK_TITLE_PURPOSE_TO_MASTER = {
  '혼밥': '혼밥', '간단한 한 끼': '혼밥', '간단한 점심': '혼밥',
  '간식': '간식', '출출할 때': '간식',
  '친구와': '친구와', '친구': '친구와',
  '나눠 먹기': '나눠 먹기', '포장': '나눠 먹기',
};

export const SNACK_PURPOSE_PROFILE = {
  '혼밥':      { tone: '혼자 간단히', sceneHint: '카운터·1인 테이블' },
  '간식':      { tone: '가볍게 집어', sceneHint: '오후·테이크아웃' },
  '친구와':    { tone: '편하게 나눠', sceneHint: '친구와 수다' },
  '나눠 먹기': { tone: '여럿이 나눠', sceneHint: '가운데 두고 덜어' },
};

export function getSnackPurposeProfile(masterPurpose) {
  return SNACK_PURPOSE_PROFILE[masterPurpose] || { tone: '간단히', sceneHint: '' };
}

export const PURPOSE_OVERRIDES = {
  '혼밥': {
    motiveExtra: '혼자 빠르게 한 끼 해결하러',
    sceneExtra: '혼자 앉아 한 그릇에 집중하는 분위기',
  },
  '간식': {
    motiveExtra: '출출할 때 가볍게 요기하러',
    sceneExtra: '가볍게 한두 가지 집어 먹는 분위기',
  },
  '친구와': {
    motiveExtra: '친구와 편하게 나눠 먹으러',
    sceneExtra: '친구와 마주 앉아 이야기하며 먹는 분위기',
  },
  '나눠 먹기': {
    motiveExtra: '여럿이 여러 가지 시켜 나눠 먹으러',
    sceneExtra: '여럿이 둘러앉아 가운데 두고 덜어 먹는 분위기',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 검증용 가상 매장 1개
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_snack_01',
    region: '구리',
    cat: '분식',
    representativeMenu: '떡볶이',
    menus: ['떡볶이', '김밥', '순대'],
  },
];

export function getStoresByRegion(region) {
  return STORE_PROFILES.filter(s => s.region === region);
}

export function getStoreById(storeId) {
  return STORE_PROFILES.find(s => s.storeId === storeId) || null;
}

// ─────────────────────────────────────────────────────────
// buildDirection — 하이브리드 merge (korean-data 시그니처 동형)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) return null;
  const merged = { ...base };
  const sit = SITUATION_OVERRIDES[situation];
  if (sit) {
    if (sit.motiveExtra) merged.motive = `${merged.motive} (${sit.motiveExtra})`;
    if (sit.tasteExtra) merged.tasteExtra = sit.tasteExtra;
    if (sit.sceneExtra) merged.sceneExtra = sit.sceneExtra;
    if (sit.hookExtra) merged.hook = sit.hookExtra;
    if (sit.flowBias) merged.flowBias = sit.flowBias;
  }
  const pur = PURPOSE_OVERRIDES[purpose];
  if (pur) {
    if (pur.motiveExtra) merged.motive = `${merged.motive} · ${pur.motiveExtra}`;
    if (pur.sceneExtra) merged.purposeSceneExtra = pur.sceneExtra;
  }
  return merged;
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS
// ─────────────────────────────────────────────────────────
export const SNACK_SITE_KEYWORDS = [
  '떡볶이', '라볶이', '국물떡볶이', '순대', '튀김', '김밥', '쫄면', '비빔국수',
  '잔치국수', '우동', '어묵', '돈가스', '라면',
  '분식', '분식집', '분식점',
  '혼밥', '간식', '포장', '나눠 먹기', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 분식 조합 카드 (가상 매장 1개 × 13메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ SNACK_MENUS 13개와 1:1 정합
// ─────────────────────────────────────────────────────────
const _mkCard = (slug, menu, emoji) => ({
  id: `snack_${slug}_guri_01`,
  storeId: 'store_guri_snack_01',
  industry: 'snack',
  region: '구리',
  menu,
  cat: '분식',
  name: '이 분식집',
  emoji,
  titlePatterns: [
    '{region} {menu} {situation} 정보',
    '{region} {menu}｜{purpose} 메뉴 안내',
    '{region} {menu} 메뉴 정리',
  ],
  keywords: [
    `구리 ${menu}`,
    `구리 ${menu} 맛집`,
    `구리 분식 ${menu}`,
    '구리 분식',
    `구리 ${menu} 포장`,
  ],
  compareWith: `동일 지역 다른 분식집 ${menu}`,
  nearbyHint: '구리역 근처 분식 골목',
  menuRef: menu,
  catRef: '분식',
  isRepresentative: menu === '떡볶이',
});

export const SNACK_TREATMENTS = [
  _mkCard('tteokbokki', '떡볶이', '🌶️'),
  _mkCard('rabokki', '라볶이', '🍜'),
  _mkCard('gukmul_tteokbokki', '국물떡볶이', '🍲'),
  _mkCard('sundae', '순대', '🥟'),
  _mkCard('twigim', '튀김', '🍤'),
  _mkCard('gimbap', '김밥', '🍙'),
  _mkCard('jjolmyeon', '쫄면', '🌶️'),
  _mkCard('bibimguksu', '비빔국수', '🍝'),
  _mkCard('janchiguksu', '잔치국수', '🍜'),
  _mkCard('udon', '우동', '🍲'),
  _mkCard('eomuk', '어묵', '🍢'),
  _mkCard('donkkaseu', '돈가스', '🍖'),
  _mkCard('ramyeon', '라면', '🍜'),
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const SNACK_META = {
  industry: 'snack',
  label: '분식·분식',
  greeting: '어떤 분식 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 떡볶이 간식 메뉴 정보',
    '구리 김밥 혼밥 메뉴 안내',
    '구리 순대 포장 메뉴 정리',
    '구리 라면 나눠 먹기 정보',
  ],
  badge: '🍢',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const SNACK_LONGTAIL_SUFFIXES = {
  snack_noodle: [
    '메뉴 정보 정리',
    '점심 메뉴 안내',
    '혼밥 메뉴 정리',
    '포장 정보 안내',
  ],
  snack_dish: [
    '나눠 먹기 좋은 메뉴 안내',
    '곁들임 메뉴 정리',
    '간식 메뉴 안내',
    '구성 정보',
  ],
  default: [
    '메뉴 정보 정리',
    '방문 정보 안내',
    '운영 정보 정리',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — snack ↔ 의료·카페·중식·한식 narrative·광고 차단
//   ⚠ 업종 독립 (Naver §3). 분식 = 한식과도 narrative 분리.
// ─────────────────────────────────────────────────────────
export const SNACK_BLOCK_MAP = {
  medical: ['시술', '치료', '진료', '효능', '효과', '증상', '통증', '회복'],
  cafe: ['카공', '콘센트', '디저트', '라떼', '원두', '드립'],
  chinese: ['춘장', '짜장면', '짬뽕', '탕수육', '유니짜장'],
  ad: ['강추', '원조', '찐맛집', '인생맛집', '꼭 가보세요', '역대급', '숨은 맛집'],
};

// ─────────────────────────────────────────────────────────
// TITLE 토큰 — korean-data 동형
// ─────────────────────────────────────────────────────────
export const SNACK_TITLE_MIDDLE = [
  '먹은 후기', '한 그릇', '메뉴', '정보',
];

export const SNACK_TITLE_SUFFIX = [
  '정리', '안내', '후기', '정보',
];

export const SNACK_TITLE_SCENE = {
  default: ['양념', '한 그릇', '바삭', '국물'],
};

export const SNACK_TITLE_SCENE_BY_CATEGORY = {
  분식: ['양념', '한 그릇', '바삭함', '나눠 먹기'],
};

// ─────────────────────────────────────────────────────────
// TITLE_MENU_CLASS — ★ 외식 공통 class 4축 SoT (인수인계 확정)
//   soup만 국물 어휘 허용. 떡볶이=meat / 국물떡볶이=soup 분리.
// ─────────────────────────────────────────────────────────
export const SNACK_TITLE_MENU_CLASS = {
  '떡볶이': 'meat',
  '라볶이': 'meat',
  '국물떡볶이': 'soup',
  '순대': 'meat',
  '튀김': 'meat',
  '김밥': 'rice',
  '쫄면': 'noodle',
  '비빔국수': 'noodle',
  '잔치국수': 'soup',
  '우동': 'soup',
  '어묵': 'soup',
  '돈가스': 'meat',
  '라면': 'soup',
};

// 결별 방문목적 풀 (외식 공통 4축 — korean-data 동형, 분식 톤 보정)
export const SNACK_TITLE_PURPOSE_BY_CLASS = {
  soup:   ['따뜻한 한 끼', '비 오는 날', '혼밥', '퇴근 후', '간단한 점심', '야식'],
  noodle: ['점심', '간식', '비빔', '혼밥', '여름', '가볍게'],
  meat:   ['간식', '나눠 먹기', '친구와', '출출할 때', '포장', '아이 간식'],
  rice:   ['혼밥', '간단한 한 끼', '아침', '포장', '간식'],
};

export const SNACK_TITLE_PURPOSE_FALLBACK = ['간식', '혼밥', '간단한 한 끼', '나눠 먹기'];

// ─────────────────────────────────────────────────────────
// TITLE_FORMS — [v2.4] 제목 조립 폼 가중 (korean-data 동형)
//   weight 합 = 100. placeholder: {region} {menu} {purpose} {middle}
// ─────────────────────────────────────────────────────────
export const SNACK_TITLE_FORMS = [
  { id: 'A', pattern: '{region} {purpose} {menu} 메뉴 정보', weight: 40 },
  { id: 'B', pattern: '{region} {menu} {purpose} 안내',       weight: 20 },
  { id: 'C', pattern: '{region} {menu} 메뉴 정리',            weight: 20 },
  { id: 'D', pattern: '{region} {menu} {situation} 정보',     weight: 15 },
  { id: 'E', pattern: '{region} {menu}｜{middle}',            weight: 5 },
];
