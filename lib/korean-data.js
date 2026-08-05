// ============================================================
// lib/korean-data.js — 한식(한식) 독립 엔진 데이터 v1.0
//
// 기반: restaurant-data.js 구조 동형 이식 (Restaurant 계열 엔진)
// 작업 기준: Korean Engine 신규 생성 (B경로 — 독립 엔진)
//   · restaurant 데이터 흡수가 아니라 독립 narrative ecosystem (Naver 지침 §3 전략2)
//   · 엔진 4파일 자립 단위: korean-data / korean-prompts / korean-playConfig / generateKorean
//
// PHILOSOPHY 정합
//   · 매장명 = placeholder only (genericName: '한식당' 등). 본문 노출 0.
//   · 효능·관용 표현 금지 (해장·속풀이·몸보신 등 — FORBIDDEN)
//   · 광고 평가어 금지 (찐맛집·강추·역대급 등)
//   · 정보형(commercial) 기본 — 주인공 = '메뉴'
//   · servingUnit 단위 정합 (국물·밥·면=한 그릇 / 고기·수육·볶음=한 접시)
// ============================================================

// ─────────────────────────────────────────────────────────
// CATS — 한식 단일 (계열 구분은 메뉴 단위)
// ─────────────────────────────────────────────────────────
export const KOREAN_CATS = [
  '전체',
  '한식',
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리)
// ─────────────────────────────────────────────────────────
export const KOREAN_REGIONS = [
  '구리',
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 한식 17메뉴 (국물·밥·면·고기·볶음)
// ─────────────────────────────────────────────────────────
export const KOREAN_MENUS = {
  한식: [
    '국밥',
    '순대국',
    '돼지국밥',
    '소머리국밥',
    '소고기국밥',
    '콩나물국밥',
    '해장국',
    '갈비탕',
    '설렁탕',
    '곰탕',
    '칼국수',
    '냉면',
    '수육',
    '머릿고기',
    '술국',
    '김치찌개',
    '된장찌개',
    '제육볶음',
    '불고기',
    '비빔밥',
    '삼계탕',
    '보쌈',
    '족발',
    '추어탕',
    '육개장',
    '닭볶음탕',
    '닭한마리',
    '감자탕',
    '갈비찜',
    '코다리조림',
    '동태탕',
    '아구찜',
    '오리주물럭',
    '오리백숙',
    '낙지볶음',
    '쭈꾸미볶음',
    '생선구이',
    '갈치조림',
    '고등어조림',
    '청국장',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ═══ 국밥 = 상위(Common) 카드. 고유 부속 없음 — 메뉴마다 구성이 다름. ═══
  //   공통 요소(양념·곁들임·토렴·밥말기)만 보유. 하위(순대국/돼지국밥/소머리…)가 고유 components 보유.
  '국밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '뜨끈한 국물에 밥 한 그릇 말아 먹고 싶어서',
    tasteCore: '진하게 우려낸 육수, 토렴한 밥, 부드러운 고기 건더기',
    sceneCore: '뚝배기에서 김이 오르는 국밥, 깍두기 그릇이 옆에 놓인 식탁',
    hook: '뚝배기째 나와서 김이 확 올라왔어요',
    keyword: '국밥',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 깍두기 그릇',
    sidedishes: ['깍두기', '김치', '새우젓'],
    timeOfDay: ['점심', '저녁'],
    isCommon: true,                       // ★ 상위 메뉴 표식 — 고유 부속 단정 금지
    components: [],                        // 고유 부속 없음(종류마다 다름)
    condiments: ['들깨가루', '다진 양념', '새우젓'],  // 공통 양념
    styleAxis: ['맑게 끓인 담백한 국물', '진하게 우려낸 육수'],
    choicePoints: ['어떤 국밥(순대/돼지/소머리 등)을 고를지', '국물이 진한지 맑은지', '들깨를 넣을지 다대기를 풀지', '밥을 말지 따로 둘지', '혼자 먹을지 포장할지'],
  },
  '순대국': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '든든하게 국물 한 그릇 하고 싶어서',
    tasteCore: '뽀얗게 끓인 사골 국물, 순대와 부속의 식감, 들깨를 넣어 더하는 고소함',
    sceneCore: '뚝배기 국물에 다진 양념을 풀어 넣는 풍경, 들깨가루 통이 놓인 식탁',
    hook: '들깨를 한 숟갈 풀어 넣으니 국물색이 진해졌어요',
    keyword: '순대국',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '새우젓', '들깨가루'],
    timeOfDay: ['점심', '저녁'],
    // ★ [v2.1] 구체 구성요소 — 추상어(따뜻/든든) 대신 실제 검색어가 글에 들어가게
    components: ['순대', '머릿고기', '오소리감투', '내장', '간', '허파', '부추', '대파'],
    condiments: ['새우젓', '다진 양념', '들깨가루', '깍두기'],
    styleAxis: ['맑게 끓인 담백한 국물', '진하게 우려낸 사골 국물'],  // 호불호 갈림축
    choicePoints: ['들깨를 넣을지 말지', '다대기로 얼큰하게 풀지', '수육을 곁들일지', '혼자 먹을지 포장할지'],
    pairing: ['수육', '모듬순대', '공깃밥'],   // ★ [v2.3·b] 함께 주문 메뉴 (메뉴 카드에서만 조회)
  },

  // ═══ [v2.3·b] 국밥류 하위 메뉴 카드 — 메뉴별 고유 데이터(오염 차단) ═══
  '돼지국밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '뜨끈한 돼지 육수에 밥 말아 든든히 먹고 싶어서',
    tasteCore: '돼지뼈를 우려낸 뽀얀 국물, 부드러운 수육과 내장, 정구지(부추)를 얹어 먹는 맛',
    sceneCore: '뚝배기에 토렴한 밥, 정구지·다대기·새우젓이 따로 놓인 식탁',
    hook: '정구지를 듬뿍 올려 국물에 적셔 먹으니 깔끔했어요',
    keyword: '돼지국밥',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 정구지, 다대기, 새우젓',
    sidedishes: ['정구지(부추)', '깍두기', '새우젓'],
    timeOfDay: ['점심', '저녁'],
    components: ['돼지고기 수육', '내장', '막창', '정구지(부추)', '대파'],
    condiments: ['새우젓', '다진 양념', '정구지', '부추겉절이'],
    styleAxis: ['맑게 내는 돼지국밥', '뽀얗게 우려낸 돼지국밥'],
    choicePoints: ['국물을 맑게 먹을지 진하게 먹을지', '정구지를 얼마나 올릴지', '새우젓으로 간할지 다대기를 풀지', '수육 따로국밥으로 먹을지'],
    pairing: ['수육', '내장', '공깃밥'],
  },

  '소머리국밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '진하게 고아낸 소머리 국물 한 그릇 하고 싶어서',
    tasteCore: '소머리·사골을 오래 고아낸 진한 국물, 결대로 뜯기는 머릿고기',
    sceneCore: '큼직한 머릿고기가 올라간 뚝배기, 소금·후추·다진 양념이 놓인 식탁',
    hook: '머릿고기가 큼직하게 들어 결대로 뜯어 먹었어요',
    keyword: '소머리국밥',
    servingUnit: '한 그릇',
    priceFeel: '든든하게 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 소금·후추, 다진 양념',
    sidedishes: ['깍두기', '김치', '소금'],
    timeOfDay: ['아침', '점심'],
    components: ['소머리 고기', '머릿고기', '사골 육수', '대파'],
    condiments: ['소금', '후추', '다진 양념', '새우젓'],
    styleAxis: ['맑게 내는 소머리국밥', '진하게 고아낸 소머리국밥'],
    choicePoints: ['고기 양을 더할지', '소금으로 간할지 다대기를 풀지', '밥을 말지 따로국밥으로 둘지'],
    pairing: ['머릿고기 수육', '공깃밥'],
  },

  '소고기국밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰하게 끓인 소고기 국밥으로 속을 풀고 싶어서',
    tasteCore: '양지·사태를 결대로 찢어 넣은 국물, 대파와 고춧가루로 낸 칼칼한 맛',
    sceneCore: '대파가 듬뿍 들어간 붉은 국물 뚝배기, 공깃밥과 깍두기가 놓인 식탁',
    hook: '대파가 듬뿍 들어가 국물이 칼칼했어요',
    keyword: '소고기국밥',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 다진 양념',
    sidedishes: ['깍두기', '김치', '다진 양념'],
    timeOfDay: ['점심', '저녁'],
    components: ['양지', '사태', '대파', '고사리', '콩나물'],
    condiments: ['다진 양념', '고춧가루', '소금'],
    styleAxis: ['맑게 끓인 소고기국밥', '얼큰하게 끓인 소고기국밥(대구식)'],
    choicePoints: ['맑게 먹을지 얼큰하게 먹을지', '대파·고춧가루를 더할지', '밥을 말지 따로 둘지'],
    pairing: ['수육', '공깃밥'],
  },

  '콩나물국밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '시원하게 속을 풀어줄 국밥 한 그릇 하고 싶어서',
    tasteCore: '콩나물을 우려낸 시원한 국물, 아삭한 콩나물, 계란·김가루를 올린 구성',
    sceneCore: '뚝배기에서 끓는 콩나물국밥, 수란과 김가루가 따로 나오는 식탁',
    hook: '수란을 풀어 김가루에 적셔 먹으니 깔끔했어요',
    keyword: '콩나물국밥',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 수란, 김가루',
    sidedishes: ['김치', '깍두기', '오징어젓'],
    timeOfDay: ['아침', '점심'],
    components: ['콩나물', '계란(수란)', '김가루', '청양고추', '대파'],
    condiments: ['새우젓', '청양고추', '김가루'],
    styleAxis: ['맑고 시원한 콩나물국밥', '얼큰한 콩나물국밥'],
    choicePoints: ['수란을 국에 풀지 따로 먹을지', '맑게 먹을지 얼큰하게 먹을지', '김가루를 더할지'],
    pairing: ['수란', '공깃밥', '오징어젓'],
  },
  '해장국': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰한 국물로 속을 달래며 한 끼 하고 싶어서',
    tasteCore: '우거지와 선지가 들어간 얼큰한 국물, 푸짐한 건더기, 칼칼한 끝맛',
    sceneCore: '빨간 국물에서 김이 오르는 뚝배기, 공깃밥을 말아 넣는 풍경',
    hook: '국물 한 술 떠 넣으니 칼칼하게 속이 풀리는 느낌이었어요',
    keyword: '해장국',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 깍두기 그릇',
    sidedishes: ['깍두기', '김치', '다진 양념'],
    timeOfDay: ['점심', '저녁'],
  },
  '갈비탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '갈비 들어간 맑은 탕 한 그릇 하고 싶어서',
    tasteCore: '오래 고아낸 맑은 국물, 결대로 뜯기는 갈비살, 당면과 대파의 어우러짐',
    sceneCore: '큼직한 갈빗대가 담긴 그릇, 소금·후추로 간을 맞추는 풍경',
    hook: '갈빗대를 들어 살을 발라내니 결대로 부드럽게 떨어졌어요',
    keyword: '갈비탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '대접, 공깃밥, 소금·후추',
    sidedishes: ['깍두기', '김치', '소금'],
    timeOfDay: ['점심', '저녁'],
  },
  '설렁탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '뽀얀 국물에 밥 말아 든든하게 먹고 싶어서',
    tasteCore: '사골을 오래 끓여 뽀얗게 우러난 국물, 부드러운 고기, 소면과 밥',
    sceneCore: '하얀 국물 그릇에 소금과 파를 넣어 간을 맞추는 풍경',
    hook: '파랑 소금을 넣고 한 술 뜨니 국물이 구수하게 들어왔어요',
    keyword: '설렁탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '대접, 공깃밥, 소면, 소금·파',
    sidedishes: ['깍두기', '김치', '소금'],
    timeOfDay: ['점심', '저녁'],
    // ★ [v2.3.3·3차검수] 설렁탕 전용 선택축 — 들깨/다대기(순대국 요소) 배제, 설렁탕 보편 요소로.
    //   설렁탕은 간을 직접 맞추는 게 핵심. 소금·후추·대파 / 소면 포함 / 깍두기 국물 / 밥 말기.
    styleAxis: ['소금으로 직접 간하는 담백한 맛', '깍두기 국물을 더한 칼칼한 맛'],
    choicePoints: ['소금·후추·대파로 간을 직접 맞출지', '소면을 먼저 건져 먹을지 밥부터 말지', '깍두기 국물을 더해 칼칼하게 먹을지', '고기를 더 추가할지', '혼자 먹을지 포장할지'],
  },
  '곰탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '맑게 우려낸 고기 국물 한 그릇 하고 싶어서',
    tasteCore: '진하게 고아낸 맑은 국물, 부드럽게 익은 양지·사태, 밥을 말기 좋은 농도',
    sceneCore: '맑은 국물에 밥을 말고 깍두기 국물을 더하는 풍경',
    hook: '깍두기 국물을 조금 넣으니 국물이 한층 개운해졌어요',
    keyword: '곰탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '대접, 공깃밥, 깍두기 그릇',
    sidedishes: ['깍두기', '김치', '소금'],
    timeOfDay: ['점심', '저녁'],
  },
  '칼국수': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '뜨끈한 국물 면 한 그릇 하고 싶어서',
    tasteCore: '멸치·해물·바지락·닭 등 종류에 따라 갈리는 육수, 밀가루 반죽을 밀어 썬 손칼국수의 쫄깃하고 도톰한 면, 면에서 우러난 국물의 걸쭉함, 겉절이의 어우러짐',
    sceneCore: '김이 오르는 면 그릇에 국물이 자작하게 따라 오르는 풍경, 갓 무친 겉절이 김치를 면에 얹어 곁들이는 풍경',
    hook: '면을 들어 올리니 국물이 자작하게 따라 올라왔어요',
    keyword: '칼국수',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '면 그릇, 겉절이 접시, 다진 양념',
    sidedishes: ['겉절이', '김치', '만두', '다진 양념', '공깃밥'],
    timeOfDay: ['점심', '저녁'],
    // ★ [v2.3.5·5차검수] 칼국수 전용 선택축 강화 — 국밥형 폴백(밥말기) 차단 + 종류/면굵기 보강.
    //   종류(바지락·해물/멸치/들깨/닭) · 면(손칼국수/직접반죽/굵기) · 겉절이 · 만두/수육 추가가 갈림.
    // ★ [v2.3.6·6차검수] 선택축 무수정 — tasteCore/sceneCore/sidedishes 결만 보강(밀가루반죽·도톰면·걸쭉국물·겉절이).
    styleAxis: ['바지락·해물로 낸 시원한 국물', '들깨·닭으로 낸 진한 국물'],
    choicePoints: ['바지락·해물의 시원한 국물로 먹을지 들깨·닭의 진한 국물로 먹을지', '손칼국수의 두툼한 면을 고를지 가는 면을 고를지', '겉절이를 면에 얹어 먹을지 따로 먹을지', '만두나 수육을 곁들일지', '혼자 한 그릇 할지 여럿이 나눌지'],
  },
  '냉면': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '시원한 면 한 그릇으로 더위를 식히고 싶어서',
    tasteCore: '살얼음 동동 뜬 육수, 쫄깃한 메밀면, 무절임과 편육의 곁들임',
    sceneCore: '얼음 육수에 면을 풀어 가위로 자르는 풍경, 겨자와 식초를 더하는 식탁',
    hook: '육수 한 모금 들이켜니 시원하게 넘어갔어요',
    keyword: '냉면',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '면 대접, 가위, 겨자·식초',
    sidedishes: ['무절임', '편육', '겨자'],
    timeOfDay: ['점심', '저녁'],
  },
  '수육': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 나눠 먹을 고기 한 접시 시키려고',
    tasteCore: '삶아낸 부드러운 돼지고기, 쌈장과 새우젓의 곁들임, 김치와의 조합',
    sceneCore: '큰 접시에 썰어 나온 고기를 쌈에 싸 먹는 풍경',
    hook: '한 점 집어 새우젓에 찍으니 간이 딱 맞았어요',
    keyword: '수육',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 쌈 채소, 새우젓·쌈장',
    sidedishes: ['새우젓', '쌈장', '김치'],
    timeOfDay: ['점심', '저녁'],
  },
  '머릿고기': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '술안주로 고기 한 접시 곁들이려고',
    tasteCore: '쫄깃한 부위와 부드러운 부위가 섞인 식감, 새우젓·막장의 곁들임',
    sceneCore: '접시에 담긴 머릿고기를 새우젓에 찍어 먹는 풍경',
    hook: '쫄깃한 부분을 골라 새우젓에 찍어 먹으니 잘 어울렸어요',
    keyword: '머릿고기',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '접시, 새우젓·막장, 쌈 채소',
    sidedishes: ['새우젓', '막장', '김치'],
    timeOfDay: ['점심', '저녁'],
  },
  '술국': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '국물 안주로 한 냄비 끓여 먹고 싶어서',
    tasteCore: '우거지와 선지·내장을 넣어 끓인 얼큰한 국물, 푸짐한 건더기',
    sceneCore: '냄비째 끓여 나온 국물을 앞접시에 덜어 먹는 풍경',
    hook: '국물을 한 국자 떠 보니 건더기가 가득 따라 올라왔어요',
    keyword: '술국',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '냄비, 국자, 앞접시',
    sidedishes: ['깍두기', '김치', '다진 양념'],
    timeOfDay: ['점심', '저녁'],
  },
  '김치찌개': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰한 찌개에 밥 한 그릇 하고 싶어서',
    tasteCore: '푹 익은 김치의 깊은 맛, 돼지고기와 두부, 칼칼하게 끓인 국물',
    sceneCore: '보글보글 끓는 뚝배기 찌개에 밥을 비벼 먹는 풍경',
    hook: '국물에 밥을 한 술 말아 먹으니 칼칼하게 들어왔어요',
    keyword: '김치찌개',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '계란말이', '김'],
    timeOfDay: ['점심', '저녁'],
  },
  '된장찌개': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '구수한 찌개에 밥 한 그릇 하고 싶어서',
    tasteCore: '된장을 풀어 끓인 구수한 국물, 두부·애호박·감자의 어우러짐',
    sceneCore: '뚝배기에서 끓는 찌개를 가운데 두고 밥과 함께 먹는 풍경',
    hook: '국물을 한 술 떠 밥에 올리니 구수하게 넘어갔어요',
    keyword: '된장찌개',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '나물', '김'],
    timeOfDay: ['점심', '저녁'],
  },
  '제육볶음': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤한 고기 반찬에 밥 한 그릇 하려고',
    tasteCore: '고추장 양념에 볶아낸 매콤달콤한 돼지고기, 양파·대파의 단맛',
    sceneCore: '철판에 볶아 나온 고기를 상추쌈에 싸 먹는 풍경',
    hook: '밥 위에 올려 한 입 하니 매콤달콤한 양념이 잘 배어 있었어요',
    keyword: '제육볶음',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '접시, 공깃밥, 쌈 채소',
    sidedishes: ['상추', '쌈장', '공깃밥'],
    timeOfDay: ['점심', '저녁'],
  },
  '불고기': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '간장 양념 소고기를 푸짐하게 먹고 싶어서',
    tasteCore: '간장 양념에 재운 부드러운 소고기, 지역에 따라 갈리는 조리 방식, 상추쌈에 싸 먹는 맛',
    sceneCore: '불판이나 석쇠에 고기를 올리고 상추쌈에 마늘·쌈장을 얹는 풍경',
    hook: '잘 익은 고기를 상추에 올려 쌈장과 마늘을 곁들여 싸 먹었어요',
    keyword: '불고기',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '불판 또는 석쇠, 공깃밥, 상추쌈, 앞접시',
    sidedishes: ['상추쌈', '마늘·쌈장', '공깃밥', '김치'],
    timeOfDay: ['점심', '저녁'],
    // ★ [v2.3.5·5차검수] 불고기 전용 선택축 재설계 — 국물 비중 축소, 불고기다운 5축으로.
    //   지역식(서울식 국물자작/언양식 석쇠/광양식 참숯) → 조리방식 → 부위 → 곁들임(쌈·마늘) → 식사상황(1인정식/어린이).
    styleAxis: ['국물 자작한 서울식', '석쇠에 굽는 언양식·광양식'],
    choicePoints: ['국물 자작한 서울식으로 먹을지 석쇠에 굽는 언양식·광양식으로 먹을지', '목심·등심 등 부위를 고를지', '상추쌈에 마늘·쌈장을 곁들일지 공깃밥에 비벼 먹을지', '1인 정식으로 먹을지 여럿이 나눌지', '어린이와 함께 먹을지 매장·포장으로 할지'],
  },
  '비빔밥': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '나물 듬뿍 올린 밥 한 그릇 비벼 먹고 싶어서',
    tasteCore: '갖은 나물과 고추장, 계란을 올린 밥, 참기름의 고소함',
    sceneCore: '색색의 나물이 올라간 그릇에 고추장을 넣어 비비는 풍경',
    hook: '고추장과 참기름을 넣고 비비니 윤기가 돌았어요',
    keyword: '비빔밥',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '대접, 고추장, 참기름',
    sidedishes: ['김치', '나물'],
    timeOfDay: ['점심', '저녁'],
  },
  '삼계탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '뜨거운 국물에 닭 한 마리 든든하게 먹고 싶어서',
    tasteCore: '인삼·대추·찹쌀을 넣어 푹 고아낸 닭, 진한 국물과 부드러운 살',
    sceneCore: '뚝배기에 통째로 담긴 닭을 발라 소금에 찍어 먹는 풍경',
    hook: '다리를 들어 살을 발라 소금에 찍으니 간이 딱 맞았어요',
    keyword: '삼계탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 소금·후추, 앞접시',
    sidedishes: ['깍두기', '소금', '김치'],
    timeOfDay: ['점심', '저녁'],
  },
  '보쌈': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 나눠 먹을 고기 한 접시 시키려고',
    tasteCore: '삶아낸 부드러운 돼지고기, 보쌈김치와 쌈장의 곁들임, 쌈 채소와의 조합',
    sceneCore: '큰 접시에 썰어 나온 고기를 쌈에 싸 먹는 풍경',
    hook: '한 점 집어 보쌈김치를 올려 싸 먹으니 잘 어울렸어요',
    keyword: '보쌈',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 쌈 채소, 보쌈김치·쌈장',
    sidedishes: ['보쌈김치', '쌈장', '새우젓'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['비계가 섞인 부드러운 부위', '살코기 위주의 담백한 부위'],
    choicePoints: ['어떤 부위(비계/살코기 비율)를 고를지', '보쌈김치를 곁들일지 쌈장에 찍을지', '쌈 채소에 싸 먹을지 그대로 먹을지', '막국수·쟁반국수를 곁들일지', '여럿이 나눌지 포장할지'],
  },
  '족발': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 나눠 먹을 고기 한 접시 시키려고',
    tasteCore: '쫄깃하게 삶아낸 족발, 새우젓·쌈장의 곁들임, 쌈 채소와의 조합',
    sceneCore: '큰 접시에 썰어 나온 족발을 쌈에 싸 먹는 풍경',
    hook: '쫄깃한 부위를 골라 새우젓에 찍어 먹으니 간이 딱 맞았어요',
    keyword: '족발',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 쌈 채소, 새우젓·쌈장',
    sidedishes: ['새우젓', '쌈장', '쌈무'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['껍질이 많아 쫄깃한 부위', '살코기 위주의 부드러운 부위'],
    choicePoints: ['앞다리/뒷다리, 껍질·살코기 비율을 고를지', '새우젓에 찍을지 쌈장에 찍을지', '쌈 채소에 싸 먹을지 그대로 먹을지', '막국수·쟁반국수·주먹밥을 곁들일지', '여럿이 나눌지 포장할지'],
  },
  '추어탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '구수한 국물에 밥 한 그릇 말아 먹고 싶어서',
    tasteCore: '곱게 갈아 끓인 구수한 국물, 부추와 산초의 향, 밥을 말기 좋은 농도',
    sceneCore: '뚝배기에서 김이 오르는 국물에 산초를 뿌리는 풍경',
    hook: '산초를 살짝 뿌리니 향이 확 살아났어요',
    keyword: '추어탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 산초·다진 양념',
    sidedishes: ['깍두기', '산초', '부추무침'],
    timeOfDay: ['점심', '저녁'],
  },
  '육개장': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰한 국물에 밥 말아 속을 풀고 싶어서',
    tasteCore: '결대로 찢은 양지와 대파·고사리를 넣어 얼큰하게 끓인 국물, 고춧기름의 칼칼함, 밥을 말기 좋은 농도',
    sceneCore: '뚝배기에서 붉은 국물이 끓어오르는 풍경',
    hook: '대파를 듬뿍 넣어 칼칼하게 끓여 속이 풀렸어요',
    keyword: '육개장',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 다진 양념',
    sidedishes: ['깍두기', '김치', '계란'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['칼칼하게 끓인 얼큰한 국물', '대파를 듬뿍 넣어 시원한 국물'],
    choicePoints: ['국물을 얼큰하게 먹을지 시원하게 먹을지', '밥을 말지 따로 둘지', '계란이나 당면을 더할지', '혼자 먹을지 포장할지'],
  },
  '닭볶음탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 매콤한 닭요리 한 냄비 나누려고',
    tasteCore: '큼직한 닭과 감자·당근을 매콤한 양념에 졸여낸 한 냄비, 양념이 밴 살코기, 밥을 비비기 좋은 국물',
    sceneCore: '냄비 가운데 양념이 졸아든 닭과 감자가 보이는 풍경',
    hook: '양념이 밴 살코기에 감자를 으깨 비벼 먹으니 잘 어울렸어요',
    keyword: '닭볶음탕',
    servingUnit: '한 냄비',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 냄비, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '깍두기', '쌈 채소'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['매콤하게 졸인 진한 양념', '국물 자작한 순한 양념'],
    choicePoints: ['양념을 매콤하게 할지 순하게 할지', '어느 부위(다리/살코기)를 고를지', '감자·당면을 더할지', '밥을 비벼 먹을지 볶아 먹을지', '여럿이 나눌지 포장할지'],
  },
  '닭한마리': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 맑은 닭 한 마리 끓여 나누려고',
    tasteCore: '통째로 끓여낸 닭과 떡·감자를 맑은 국물에 익혀 먹는 한 냄비, 부추겉절이 양념장, 칼국수를 말기 좋은 국물',
    sceneCore: '냄비에서 통닭이 끓고 떡과 감자를 건져 먹는 풍경',
    hook: '양념장에 찍어 먹고 칼국수까지 말아 먹으니 든든했어요',
    keyword: '닭한마리',
    servingUnit: '한 냄비',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 냄비, 양념장, 앞접시',
    sidedishes: ['부추겉절이', '양념장', '칼국수 사리'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['살코기 위주로 건져 먹는 구성', '떡·감자를 곁들여 든든하게 먹는 구성'],
    choicePoints: ['살코기를 먼저 건질지 떡·감자를 곁들일지', '양념장을 얼마나 풀지', '칼국수나 죽을 말아 마무리할지', '여럿이 나눌지 포장할지'],
  },
  // ═══ [3배치] 감자탕(soup) · 갈비찜(meat) · 코다리조림(meat) ═══
  '감자탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰한 국물에 뼈 사이 살 발라 먹으며 속 풀고 싶어서',
    tasteCore: '돼지등뼈를 우려낸 얼큰한 국물, 뼈 사이 살과 우거지, 들깨를 풀어 더하는 고소함, 밥을 볶기 좋은 국물',
    sceneCore: '냄비 가운데 등뼈와 우거지가 끓고 들깨가루를 풀어 넣는 풍경',
    hook: '뼈 사이 살을 발라 들깨가루 푼 국물에 적셔 먹으니 든든했어요',
    keyword: '감자탕',
    servingUnit: '한 냄비',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 냄비, 공깃밥, 들깨가루·다진 양념',
    sidedishes: ['깍두기', '들깨가루', '공깃밥'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['칼칼하게 끓인 얼큰한 국물', '들깨를 풀어 구수한 국물'],
    choicePoints: ['국물을 얼큰하게 먹을지 들깨로 구수하게 먹을지', '뼈 양을 넉넉히 할지', '우거지·라면사리·수제비를 더할지', '밥을 볶아 마무리할지', '여럿이 나눌지 포장할지'],
  },
  '갈비찜': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '여럿이 나눠 먹을 갈비 한 접시 시키려고',
    tasteCore: '간장 양념에 졸여낸 부드러운 갈비, 무·당근이 밴 단짠 양념, 결대로 찢기는 살코기, 밥에 양념 비비기 좋은 농도',
    sceneCore: '큰 접시에 윤기 도는 갈비와 졸아든 양념이 담겨 나오는 풍경',
    hook: '뼈에서 살이 결대로 떨어지고 양념이 진하게 배어 잘 어울렸어요',
    keyword: '갈비찜',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '깍두기', '나물'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['간장 양념의 달큰한 졸임', '고춧가루를 더한 매콤한 양념'],
    choicePoints: ['양념을 간장으로 달큰하게 할지 매콤하게 할지', '어느 부위(소갈비/돼지갈비)를 고를지', '당면·떡·버섯을 더할지', '밥에 양념을 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },
  '코다리조림': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤한 양념에 졸인 코다리로 밥 한 끼 하려고',
    tasteCore: '꾸덕하게 말린 코다리를 매콤달콤 양념에 졸여낸 살, 콩나물·무를 깔아 밴 양념, 밥에 비비기 좋은 양념',
    sceneCore: '냄비에 코다리와 콩나물이 졸아든 양념에 담겨 나오는 풍경',
    hook: '꾸덕한 살에 양념이 배고 콩나물을 곁들이니 밥이 잘 넘어갔어요',
    keyword: '코다리조림',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '콩나물', '깍두기'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['매콤달콤하게 졸인 진한 양념', '간장 위주로 졸인 담백한 양념'],
    choicePoints: ['양념을 매콤하게 할지 담백하게 할지', '콩나물·무를 넉넉히 깔지', '밥에 양념을 비벼 먹을지', '혼자 먹을지 여럿이 나눌지', '포장할지 매장에서 먹을지'],
  },

  // ═══ [4배치] 동태탕(soup) · 아구찜(meat) · 오리주물럭(meat) ═══
  '동태탕': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '얼큰하고 시원한 생선국으로 속 풀고 싶어서',
    tasteCore: '동태살과 곤이·내장을 넣어 끓인 시원한 국물, 무·콩나물이 우러난 맑고 칼칼한 맛, 살이 부드럽게 부서지는 식감, 밥 말기 좋은 국물',
    sceneCore: '뚝배기에 동태와 무·콩나물이 끓고 칼칼한 국물에 김이 오르는 풍경',
    hook: '동태살을 떠서 칼칼한 국물에 적셔 먹으니 속이 풀렸어요',
    keyword: '동태탕',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 다진 양념',
    sidedishes: ['깍두기', '공깃밥', '청양고추'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['칼칼하게 끓인 얼큰한 국물', '무를 넉넉히 넣어 시원한 국물'],
    choicePoints: ['국물을 얼큰하게 먹을지 시원하게 먹을지', '곤이·내장을 더할지', '두부·콩나물을 넉넉히 할지', '밥을 말아 먹을지', '혼자 먹을지 여럿이 나눌지'],
  },
  '아구찜': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '콩나물 듬뿍 매운 아구찜으로 여럿이 한 상 하려고',
    tasteCore: '쫄깃한 아구살과 아삭한 콩나물, 미나리를 매콤한 양념에 버무린 맛, 전분을 풀어 걸쭉한 양념, 밥에 비비기 좋은 농도',
    sceneCore: '큰 접시에 아구와 콩나물·미나리가 매운 양념에 버무려져 나오는 풍경',
    hook: '쫄깃한 살에 콩나물을 함께 집어 매운 양념과 먹으니 잘 어울렸어요',
    keyword: '아구찜',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '콩나물', '깍두기'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['고춧가루를 더한 칼칼하고 진한 양념', '덜 맵게 잡은 순한 양념'],
    choicePoints: ['양념을 맵게 할지 순하게 할지', '콩나물·미나리를 넉넉히 할지', '아구 양을 늘릴지', '밥에 양념을 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },
  '오리주물럭': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '불판에 구워 먹는 양념 오리로 회식 한 끼 하려고',
    tasteCore: '양념에 재운 오리고기를 불판에 구워 낸 맛, 부추·양파를 곁들인 단짠 양념, 기름이 빠지며 쫄깃해지는 식감, 밥·쌈에 어울리는 양념',
    sceneCore: '불판 위에서 양념 오리와 부추가 지글지글 익어가는 풍경',
    hook: '양념 밴 오리를 부추와 함께 쌈에 싸 먹으니 잘 어울렸어요',
    keyword: '오리주물럭',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '불판, 공깃밥, 쌈채소·앞접시',
    sidedishes: ['공깃밥', '부추무침', '쌈채소'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['고추장 양념의 매콤한 주물럭', '간장 양념의 달큰한 주물럭'],
    choicePoints: ['양념을 매콤하게 할지 달큰하게 할지', '부추·양파를 넉넉히 곁들일지', '쌈에 싸 먹을지 그냥 먹을지', '볶음밥으로 마무리할지', '여럿이 나눌지 포장할지'],
  },

  // ═══ [5배치] 오리백숙(meat) · 낙지볶음(meat) · 쭈꾸미볶음(meat) ═══
  '오리백숙': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '푹 삶은 오리로 보양 한 끼 챙기려고',
    tasteCore: '오리를 마늘·대추·인삼과 함께 푹 삶아 낸 부드러운 살, 결대로 찢기는 고기, 기름기 적고 담백한 고기 맛, 죽으로 마무리하기 좋은 구성',
    sceneCore: '큰 냄비에 오리 한 마리와 마늘·대추가 함께 삶겨 나오는 풍경',
    hook: '살을 결대로 찢어 소금장에 찍어 먹으니 담백하고 든든했어요',
    keyword: '오리백숙',
    servingUnit: '한 마리',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 냄비, 공깃밥, 소금장·부추무침',
    sidedishes: ['소금장', '부추무침', '깍두기'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['마늘·대추를 넉넉히 넣어 삶은 담백한 백숙', '들깨를 풀어 구수하게 즐기는 백숙'],
    choicePoints: ['살을 소금장에 찍어 먹을지 부추무침과 먹을지', '들깨를 풀어 구수하게 할지', '죽으로 마무리할지', '한 마리를 여럿이 나눌지', '포장할지 매장에서 먹을지'],
  },
  '낙지볶음': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤한 낙지볶음에 밥 한 끼 든든히 하려고',
    tasteCore: '쫄깃한 낙지를 고추장 양념에 센 불로 볶아낸 맛, 양파·대파가 어우러진 매콤함, 불맛 밴 양념, 밥에 비비기 좋은 농도',
    sceneCore: '센 불 팬에서 낙지와 채소가 매운 양념에 볶이며 김이 오르는 풍경',
    hook: '쫄깃한 낙지에 불맛 밴 양념을 밥에 비벼 먹으니 입맛이 돌았어요',
    keyword: '낙지볶음',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '계란찜', '깍두기'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['고추장 양념의 칼칼하고 진한 볶음', '덜 맵게 잡은 순한 볶음'],
    choicePoints: ['양념을 맵게 할지 순하게 할지', '콩나물·채소를 넉넉히 더할지', '사리(당면·우동)를 넣을지', '밥에 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },
  '쭈꾸미볶음': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤 쫄깃한 쭈꾸미볶음으로 밥 한 끼 하려고',
    tasteCore: '쫄깃한 쭈꾸미를 고추장 양념에 센 불로 볶아낸 맛, 양파·콩나물이 어우러진 매콤함, 불맛 밴 양념, 밥에 비비거나 사리에 어울리는 농도',
    sceneCore: '센 불 팬에서 쭈꾸미와 콩나물이 매운 양념에 볶이며 김이 오르는 풍경',
    hook: '쫄깃한 쭈꾸미에 매운 양념을 밥에 비벼 먹으니 잘 어울렸어요',
    keyword: '쭈꾸미볶음',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '콩나물', '계란찜'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['고추장 양념의 칼칼하고 진한 볶음', '덜 맵게 잡은 순한 볶음'],
    choicePoints: ['양념을 맵게 할지 순하게 할지', '콩나물·채소를 넉넉히 더할지', '사리(당면·우동)나 볶음밥을 더할지', '밥에 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },

  // ═══ [6배치] 생선구이(meat) · 갈치조림(meat) · 고등어조림(meat) · 청국장(soup) ═══
  '생선구이': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '노릇하게 구운 생선으로 밥 한 끼 정갈하게 하려고',
    tasteCore: '겉은 바삭 속은 촉촉하게 구워낸 생선살, 소금간으로 살린 담백한 맛, 결대로 발라 먹는 살, 밥과 어울리는 정갈한 한 상',
    sceneCore: '석쇠나 팬에서 노릇하게 구워진 생선이 접시에 담겨 나오는 풍경',
    hook: '바삭한 껍질 아래 촉촉한 살을 발라 밥과 먹으니 정갈했어요',
    keyword: '생선구이',
    servingUnit: '한 상',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '생선접시, 공깃밥, 양념간장·앞접시',
    sidedishes: ['공깃밥', '된장찌개', '나물'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['소금간으로 담백하게 구운 생선', '양념을 발라 감칠맛을 더한 구이'],
    choicePoints: ['어떤 생선(고등어/삼치/임연수)을 고를지', '소금구이로 담백하게 할지 양념구이로 할지', '단품으로 먹을지 백반 상으로 먹을지', '구이를 추가로 더 시킬지', '여럿이 나눌지 포장할지'],
  },
  '갈치조림': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤한 양념에 졸인 갈치로 밥 한 끼 하려고',
    tasteCore: '도톰한 갈치 토막을 무·감자 깔고 매콤달콤 양념에 졸여낸 살, 양념이 밴 무와 감자, 살이 부드럽게 발라지는 식감, 밥에 비비기 좋은 양념',
    sceneCore: '냄비에 갈치와 무·감자가 졸아든 양념에 담겨 나오는 풍경',
    hook: '도톰한 갈치살에 양념이 배고 무까지 곁들이니 밥이 잘 넘어갔어요',
    keyword: '갈치조림',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '깍두기', '나물'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['매콤달콤하게 졸인 진한 양념', '간장 위주로 졸인 담백한 양념'],
    choicePoints: ['양념을 매콤하게 할지 담백하게 할지', '무·감자를 넉넉히 깔지', '갈치 토막을 더 넣을지', '밥에 양념을 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },
  '고등어조림': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '매콤한 양념에 졸인 고등어로 밥 한 끼 하려고',
    tasteCore: '도톰한 고등어를 무·묵은지 깔고 매콤한 양념에 졸여낸 살, 비린내 잡은 칼칼한 양념, 살이 결대로 발라지는 식감, 밥에 비비기 좋은 양념',
    sceneCore: '냄비에 고등어와 무·묵은지가 졸아든 양념에 담겨 나오는 풍경',
    hook: '도톰한 고등어살에 칼칼한 양념이 배고 묵은지를 곁들이니 밥이 잘 넘어갔어요',
    keyword: '고등어조림',
    servingUnit: '한 접시',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '큰 접시, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '묵은지', '나물'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['고춧가루를 더한 칼칼하고 진한 양념', '간장 위주로 졸인 담백한 양념'],
    choicePoints: ['양념을 칼칼하게 할지 담백하게 할지', '무·묵은지를 넉넉히 깔지', '고등어를 더 넣을지', '밥에 양념을 비벼 먹을지', '여럿이 나눌지 포장할지'],
  },
  '청국장': {
    genericName: '한식당',
    altGenericNames: ['한식집', '식당', '가게', '여기'],
    motive: '구수한 청국장으로 든든하게 속 채우려고',
    tasteCore: '푹 띄운 콩을 풀어 끓인 구수한 국물, 두부·김치가 어우러진 진한 맛, 텁텁하지 않게 잡은 농도, 밥 비벼 먹기 좋은 국물',
    sceneCore: '뚝배기에 청국장이 끓고 두부와 김치가 어우러진 풍경',
    hook: '구수한 국물에 밥을 비벼 김치를 곁들이니 든든했어요',
    keyword: '청국장',
    servingUnit: '한 그릇',
    priceFeel: '부담 없이 한 끼 하기 좋은',
    tableware: '뚝배기, 공깃밥, 앞접시',
    sidedishes: ['공깃밥', '김치', '나물'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['진하게 띄워 구수함을 살린 국물', '맑게 잡아 부담 없는 국물'],
    choicePoints: ['국물을 진하게 먹을지 부담 없이 먹을지', '두부·김치를 넉넉히 넣을지', '밥을 말지 비빌지', '공깃밥을 추가할지', '혼자 먹을지 여럿이 나눌지'],
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS — 한식 결 (효능/관용 표현 배제)
// ─────────────────────────────────────────────────────────
export const KOREAN_SITUATIONS = [
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
// ★ [v2.1-rotate] KOREAN_VISIT_SITUATIONS — 섹션별 방문상황 로테이션 풀
//   목적: 8섹션이 단일 situation(혼밥/가족)만 반복하는 문제 차단.
//   commercial 루프가 섹션마다 이 풀에서 비복원 1개씩 배정 → 상황 다양성.
//   각 항목: label(상황) · cue(그 상황의 검색자 단서, 사람 주어 시작용)
//   ⚠ 단정·효능·광고 표현 없음. 사람의 '검색 직전 상황'만.
// ─────────────────────────────────────────────────────────
export const KOREAN_VISIT_SITUATIONS = [
  // weight: 검색·공감 현실 빈도(높을수록 도입에 우선 배치). 5=최상위 … 1=후순위
  { label: '해장',           cue: '전날 무리해서 속이 더부룩한 날 풀러 가는',          weight: 5 },
  { label: '점심 한 끼',     cue: '점심시간에 빠르게 제대로 된 한 끼를 찾는',          weight: 5 },
  { label: '혼밥',           cue: '혼자 편하게 한 끼 해결하려는',                      weight: 5 },
  { label: '퇴근 후 저녁',   cue: '하루를 마치고 따뜻한 한 끼로 풀고 싶은',            weight: 4 },
  { label: '추운 겨울날',    cue: '쌀쌀해져 몸을 녹일 따뜻한 국물이 생각나는',         weight: 4 },
  { label: '직장인 점심',    cue: '근처에서 빠르게 점심을 해결하려는 직장인',          weight: 4 },
  { label: '혼술 다음날',    cue: '어제 한잔한 뒤 속을 달래러 가는',                   weight: 3 },
  { label: '비 오는 날',     cue: '비가 와서 뜨끈한 국물 한 그릇이 당기는',            weight: 3 },
  { label: '든든한 한 끼',   cue: '오늘은 제대로 된 한 끼가 필요한',                   weight: 3 },
  { label: '늦은 야식',      cue: '늦은 시간 출출해서 가볍지 않게 챙겨 먹고 싶은',     weight: 3 },
  { label: '부모님과 식사',  cue: '부모님 모시고 부담 없이 식사할 자리를 찾는',        weight: 2 },
  { label: '친구와 식사',    cue: '친구와 편하게 한 끼 하며 이야기 나누려는',          weight: 2 },
  { label: '주말 점심',      cue: '주말에 느긋하게 한 끼 챙기려는',                    weight: 2 },
  { label: '출근 전 아침',   cue: '바쁜 아침에 속을 든든히 채우고 출근하려는',         weight: 2 },
  { label: '운동 후',        cue: '운동 끝나고 든든하게 보충하고 싶은',                weight: 1 },
  { label: '아이와 외식',    cue: '아이와 함께 무난하게 먹을 곳을 고르는',             weight: 1 },
  { label: '장거리 운전 전', cue: '먼 길 떠나기 전 든든히 채우려는',                   weight: 1 },
];

// ★ [v2.3] 빈도 가중 비복원 추출 — 도입(첫 섹션)에 고빈도 상황이 우선 오도록.
//   첫 섹션은 weight 가중 랜덤, 이후는 남은 풀에서 가중 랜덤(중복 없음).
// ★ [v2.6] masterPurpose 인자 추가 — purpose 단일 SoT.
//   purpose 전달 시 PURPOSE_SCENE_MAP 계열로만 채운다(보충 없음 — 계열 이탈 차단).
//   계열 풀이 count보다 작으면 같은 계열 안에서 순환 재사용(중복 허용, 직전 연속만 회피).
//   → 제목 purpose가 도입·중간·recommendSituation·마무리까지 100% 유지(평가 지적 반영).
//   purpose 미전달 시 v2.3 동작 그대로(전체 풀 비복원 — 하위호환).
export function pickRotatedSituations(count, masterPurpose) {
  // 가중 추출 1회(풀에서 idx 반환)
  const weightedPick = (pool) => {
    const total = pool.reduce((s, x) => s + (x.weight || 1), 0);
    let r = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
      r -= (pool[j].weight || 1);
      if (r <= 0) return j;
    }
    return pool.length - 1;
  };

  // ① purpose 계열 필터 — 제목 purpose가 정한 상황 계열만 사용
  let basePool = KOREAN_VISIT_SITUATIONS;
  let filteredByPurpose = false;
  if (masterPurpose && PURPOSE_SCENE_MAP[masterPurpose]) {
    const allow = new Set(PURPOSE_SCENE_MAP[masterPurpose]);
    const filtered = KOREAN_VISIT_SITUATIONS.filter(s => allow.has(s.label));
    if (filtered.length) { basePool = filtered; filteredByPurpose = true; }
  }

  const out = [];

  if (filteredByPurpose) {
    // ★ [v2.8] 도입(out[0]) = master 대표 라벨 고정 — 제목 purpose와 도입 cue 100% 일치 강제.
    //   원인: 도입을 가중랜덤으로 뽑아 '혼밥' master인데 '혼술 다음날'(해장 cue)이 도입에 당첨 → 제목≠도입.
    //   PURPOSE_SCENE_MAP[master][0]은 항상 그 master의 정체성 라벨(실측: 8/8 VISIT 1:1 존재).
    const headLabel = PURPOSE_SCENE_MAP[masterPurpose][0];
    const headSit = KOREAN_VISIT_SITUATIONS.find(s => s.label === headLabel) || basePool[0];
    out.push(headSit);

    // ② [계열 순환] 나머지 슬롯만 계열 풀에서 로테이션. 풀 소진 시 재충전(같은 계열 반복).
    //    직전 label과 연속 중복만 피함(풀이 1개뿐이면 어쩔 수 없이 반복).
    let remaining = basePool.filter(s => s.label !== headLabel);   // 도입 라벨 제외하고 시작
    let last = headLabel;
    for (let i = 1; i < count; i++) {
      if (!remaining.length) remaining = basePool.filter(s => s.label !== headLabel);   // 계열 내 재충전(도입 라벨 제외)
      if (!remaining.length) { out.push(headSit); continue; }   // 계열에 도입라벨 1개뿐이면 도입 재사용
      let idx = weightedPick(remaining);
      // 직전과 같은 label 연속 회피(풀에 대안이 있을 때만)
      if (remaining[idx].label === last && remaining.length > 1) {
        idx = (idx + 1) % remaining.length;
      }
      out.push(remaining[idx]);
      last = remaining[idx].label;
      remaining.splice(idx, 1);   // 이번 사이클 내 비복원
    }
  } else {
    // ③ [하위호환] purpose 없음 — 전체 풀 비복원(v2.3 동작 유지)
    const remaining = basePool.slice();
    for (let i = 0; i < count && remaining.length; i++) {
      const idx = weightedPick(remaining);
      out.push(remaining[idx]);
      remaining.splice(idx, 1);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적
// ─────────────────────────────────────────────────────────
export const KOREAN_PURPOSES = [
  '혼밥',
  '가족모임',
  '친구',
  '간단히',
];

// ─────────────────────────────────────────────────────────
// ★ [v2.6] KOREAN_PURPOSE_MASTER — 본문·제목 공통 단일 SoT (8계열)
//   제목(TITLE_PURPOSE_BY_CLASS)은 "어떤 Master를 뽑을지"만,
//   본문(PURPOSE_SCENE_MAP)은 "그 Master에서 어떤 상황을 쓸지"만 담당 → 책임 분리.
//   확장 시 이 배열 + SCENE_MAP + (제목 라벨 정규화)만 손대면 됨.
// ─────────────────────────────────────────────────────────
export const KOREAN_PURPOSE_MASTER = [
  '혼밥', '점심', '해장', '가족식사', '친구모임', '회식', '주말외식', '든든한한끼',
];

// ★ [v2.6] PURPOSE_SCENE_MAP — Master purpose → 본문 상황(KOREAN_VISIT_SITUATIONS label) 계열.
//   label은 KOREAN_VISIT_SITUATIONS와 1:1 일치(실측). 중복 배정 허용(혼술 다음날=혼밥∩해장).
//   pickRotatedSituations(count, master)가 이 풀로 필터 → 제목 purpose와 본문 상황 일치.
export const PURPOSE_SCENE_MAP = {
  '혼밥':      ['혼밥', '늦은 야식'], // ★ [v2.8] '혼술 다음날'(해장 축) 제거 — 혼밥은 '혼자 식사' 결만 유지(Purpose 흔들림 차단)
  '점심':      ['점심 한 끼', '직장인 점심', '주말 점심'],
  '해장':      ['해장', '혼술 다음날'], // ★ [v2.8] '비 오는 날' 제거 — master '든든한한끼'로 재귀속(L586 정정과 정합). 제목=해장인데 secSit=비날씨로 어긋나던 파이프라인 버그 직접 원인.
  '가족식사':  ['부모님과 식사', '아이와 외식', '주말 점심'],
  '친구모임':  ['친구와 식사', '퇴근 후 저녁'],
  '회식':      ['퇴근 후 저녁', '친구와 식사'], // ★ [v2.8] '늦은 야식'(혼자 결) 제거 — 회식은 '여럿/저녁' 결만 유지
  '주말외식':  ['주말 점심', '아이와 외식', '부모님과 식사'],
  '든든한한끼':['든든한 한 끼', '추운 겨울날', '비 오는 날', '출근 전 아침', '운동 후', '장거리 운전 전'],
};

// ★ [v2.6] 제목 purpose 라벨(rich) → Master 정규화 맵.
//   TITLE_PURPOSE_BY_CLASS의 표시 라벨('가족 식사' 등)을 Master 키('가족식사')로 환원.
//   제목에는 표시 라벨을 그대로 노출하되, 본문 필터에는 Master 값을 사용.
export const KOREAN_TITLE_PURPOSE_TO_MASTER = {
  // soup
  '해장': '해장', '추운 날': '든든한한끼', '든든한 한 끼': '든든한한끼',
  '혼밥': '혼밥', '퇴근 후': '회식', '직장인 점심': '점심', '비 오는 날': '든든한한끼', // ★ [v2.8] 비 오는 날 → 해장 오매핑 정정(도입 상황 일치)
  // noodle
  '점심': '점심', '가족 식사': '가족식사', '주말 점심': '주말외식',
  // meat
  '회식': '회식', '주말 외식': '주말외식', '모임': '친구모임',
  '저녁 약속': '회식', '부모님과': '가족식사',
  // rice
  '간단한 한 끼': '혼밥', '가볍게': '혼밥',
};

// ─────────────────────────────────────────────────────────
// ★ [v2.7] KOREAN_PURPOSE_PROFILE — Master purpose 객체 승격 (표현층 단일 SoT)
//   문자열 _masterPurpose → { companions, recommend, avoid } 객체로 승격.
//   목적: recommendSituation/visitGuide의 '혼자·여럿·포장' 3종 항상 나열 차단 +
//         반대 상황(회식 글에 1인석·혼밥석) 구조 침투 차단.
//   ★ 보수적 최소 변경: companions=SCENE_MAP 그대로 승격(검증 14/14 보존) /
//     recommend=14건 PASS 표현만 / avoid=실측 충돌(회식↔1인석)만. 나머지 관측 후 확장.
//   소비처: prompts recommendSituation(recommend 주입) + storeFeature(avoid 금지·조건부 제거).
// ─────────────────────────────────────────────────────────
export const KOREAN_PURPOSE_PROFILE = {
  '혼밥':      { companions: PURPOSE_SCENE_MAP['혼밥'],       recommend: ['혼자 빠르게 먹기 좋은 자리', '1인분 기준 한 끼'], avoid: [] },
  '점심':      { companions: PURPOSE_SCENE_MAP['점심'],       recommend: ['직장인 점심에 빠르게', '점심 한 끼로 무난'],     avoid: [] },
  '해장':      { companions: PURPOSE_SCENE_MAP['해장'],       recommend: ['진한 국물로 속 풀기', '전날 마신 다음 날'],     avoid: [] },
  '가족식사':  { companions: PURPOSE_SCENE_MAP['가족식사'],   recommend: ['부모님과 부담 없는 자리', '아이와 함께'],       avoid: ['1인석', '혼밥석', '혼자 빠르게'] }, // ★ [v2.7.1] 가족 글 혼밥석 침투 차단
  '친구모임':  { companions: PURPOSE_SCENE_MAP['친구모임'],   recommend: ['친구와 나눠 먹기 좋은'],                       avoid: ['1인석', '혼밥석', '혼자 빠르게'] }, // ★ [v2.7.1] 모임 글 혼밥석 침투 차단(실측 FAIL 직접 원인)
  '회식':      { companions: PURPOSE_SCENE_MAP['회식'],       recommend: ['퇴근 후 여럿이', '늦은 시간까지'],            avoid: ['1인석', '혼밥석', '혼자 빠르게'] }, // ★ §4 avoid 1순위(실측 충돌)
  '주말외식':  { companions: PURPOSE_SCENE_MAP['주말외식'],   recommend: ['주말 가족 단위', '여유 있게'],                avoid: [] },
  '든든한한끼':{ companions: PURPOSE_SCENE_MAP['든든한한끼'], recommend: ['추운 날 데우러', '제대로 된 한 끼'],          avoid: [] },
};

// v2.7 헬퍼 — masterPurpose 문자열 → Profile 객체(폴백: 빈 축). prompts 공용.
export function getKoreanPurposeProfile(masterPurpose) {
  if (masterPurpose && KOREAN_PURPOSE_PROFILE[masterPurpose]) {
    return KOREAN_PURPOSE_PROFILE[masterPurpose];
  }
  return { companions: [], recommend: [], avoid: [] };
}

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
    extraDetail: '아이가 먹기 좋은 메뉴(국밥·비빔밥)인지 1줄 언급',
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
//   ⚠ 실제 한식 매장 데이터 확보 전 OWNER 생성 검증용 (SOP STEP4)
//   ⚠ 매장명·brandName 필드 없음 — genericName(placeholder)만 사용
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_korean_01',
    region: '구리',
    cat: '한식',
    representativeMenu: '국밥',
    menus: ['국밥', '순대국', '김치찌개'],
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
      genericName: '한식당',
      motive: '근처에서 제대로 된 한 끼 하러',
      tasteCore: '기본적인 한식 느낌',
      sceneCore: '동네 한식당 분위기',
      hook: '문 열고 들어가니 익숙한 한식당 풍경이었어요',
      keyword: '한식',
      priceFeel: '부담 없이 한 끼 하기 좋은',
      servingUnit: '한 그릇',
      situation: situation || '',
      purpose: purpose || '',
      flowBias: '',
      // ★ [v2.0-people] 만족축·동행 범용 폴백 (카드 없는 메뉴도 사람 서사가 나오도록)
      portionFeel: '1인분 기준 한 끼로 무난한 양',
      sharingFeel: '혼자도, 여럿이 나눠 먹기도 무난한 구성',
      usageType: '끼니용',
      bestCompanion: '혼밥·가족·동료 모두 무난',
      visitTiming: '점심·저녁',
      // ★ [v2.1] 구성요소·선택축 범용 폴백 (카드 없는 메뉴도 구체어가 빈값 안 되게)
      components: [],
      condiments: [],
      styleAxis: [],
      choicePoints: ['혼자 먹을지 여럿이 나눌지', '곁들임을 추가할지', '매장에서 먹을지 포장할지'],
      pairing: [],
      isCommon: false,
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

  // ★ [v2.0-people] 만족 판단축·동행 (base 정의 우선, 미정의 메뉴는 결 기반 범용 폴백)
  const isSoup = (base.cat === '국물' || (base.tasteCore || '').includes('국물'));
  const portionFeel = base.portionFeel || (base.servingUnit === '한 접시' ? '여럿이 나눠 먹기 좋은 한 접시' : '공깃밥 곁들이면 1인 한 끼로 무난한 양');
  const sharingFeel = base.sharingFeel || (base.servingUnit === '한 접시' ? '여럿이 나눠 먹는 구성' : '혼자도, 여럿이도 무난한 구성');
  const usageType = base.usageType || (isSoup ? '식사용(해장·끼니)' : '끼니용');
  const bestCompanion = base.bestCompanion || '혼밥·가족·동료 모두 무난';
  const visitTiming = base.visitTiming || (base.timeOfDay ? base.timeOfDay.join('·') : '점심·저녁');

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
    // ★ [v2.0-people] 만족축·동행 (commercial decision/recommend 소비 — 단정 아닌 판단 재료)
    portionFeel,
    sharingFeel,
    usageType,
    bestCompanion,
    visitTiming,
    // ★ [v2.1] 구체 구성요소·선택축 (prompts가 추상어 대신 구체어로 소비)
    components: base.components || [],
    condiments: base.condiments || [],
    styleAxis: base.styleAxis || [],
    choicePoints: base.choicePoints || ['혼자 먹을지 여럿이 나눌지', '곁들임을 추가할지', '매장에서 먹을지 포장할지'],
    // ★ [v2.3·b] 함께주문(메뉴 카드에서만) · 상위메뉴 표식(고유 부속 단정 차단)
    pairing: base.pairing || [],
    isCommon: !!base.isCommon,
    isSideMenu,
    representativeMenu,
  };
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS — index.js 메뉴 감지용
// ─────────────────────────────────────────────────────────
export const KOREAN_SITE_KEYWORDS = [
  '국밥', '순대국', '돼지국밥', '소머리국밥', '소고기국밥', '콩나물국밥', '해장국', '갈비탕', '설렁탕', '곰탕', '칼국수', '냉면', '수육', '머릿고기', '술국', '김치찌개', '된장찌개', '제육볶음', '불고기', '비빔밥', '삼계탕', '보쌈', '족발', '추어탕', '육개장', '닭볶음탕', '닭한마리', '감자탕', '갈비찜', '코다리조림', '동태탕', '아구찜', '오리주물럭', '오리백숙', '낙지볶음', '쭈꾸미볶음', '생선구이', '갈치조림', '고등어조림', '청국장',
  // SEO 단순형
  '국밥', '한식당', '한식', '국물',
  // 상황·목적
  '혼밥', '점심', '포장', '가족 외식', '가족모임', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 한식 조합 카드 (검증용 가상 매장 1개 × 전체 20메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ 실매장 확보 시 storeId 교체/추가만 — 카드 구조 무변경
//   ⚠ KOREAN_MENUS 20개와 1:1 정합 (OWNER 검증 완전성)
// ─────────────────────────────────────────────────────────
export const KOREAN_TREATMENTS = [
  {
    id: 'rest_korean_gukbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '국밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 국밥',
      '구리 국밥 맛집',
      '구리 한식 국밥',
      '구리 한식',
      '구리 국밥 점심',
    ],
    compareWith: '동일 지역 다른 한식당 국밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '국밥',
    catRef: '한식',
    isRepresentative: true,
  },
  {
    id: 'rest_korean_sundaeguk_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '순대국',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 순대국',
      '구리 순대국 맛집',
      '구리 한식 순대국',
      '구리 한식',
      '구리 순대국 점심',
    ],
    compareWith: '동일 지역 다른 한식당 순대국',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '순대국',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_dwaejigukbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '돼지국밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: ['구리 돼지국밥', '구리 돼지국밥 맛집', '구리 한식 돼지국밥', '구리 한식', '구리 돼지국밥 점심'],
    compareWith: '동일 지역 다른 한식당 돼지국밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '돼지국밥',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_someorigukbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '소머리국밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: ['구리 소머리국밥', '구리 소머리국밥 맛집', '구리 한식 소머리국밥', '구리 한식', '구리 소머리국밥 점심'],
    compareWith: '동일 지역 다른 한식당 소머리국밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '소머리국밥',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_sogogigukbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '소고기국밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: ['구리 소고기국밥', '구리 소고기국밥 맛집', '구리 한식 소고기국밥', '구리 한식', '구리 소고기국밥 점심'],
    compareWith: '동일 지역 다른 한식당 소고기국밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '소고기국밥',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_kongnamulgukbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '콩나물국밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: ['구리 콩나물국밥', '구리 콩나물국밥 맛집', '구리 한식 콩나물국밥', '구리 한식', '구리 콩나물국밥 해장'],
    compareWith: '동일 지역 다른 한식당 콩나물국밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '콩나물국밥',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_haejangguk_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '해장국',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 해장국',
      '구리 해장국 맛집',
      '구리 한식 해장국',
      '구리 한식',
      '구리 해장국 점심',
    ],
    compareWith: '동일 지역 다른 한식당 해장국',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '해장국',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_galbitang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '갈비탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍖',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 갈비탕',
      '구리 갈비탕 맛집',
      '구리 한식 갈비탕',
      '구리 한식',
      '구리 갈비탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 갈비탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '갈비탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_seolleongtang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '설렁탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥣',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 설렁탕',
      '구리 설렁탕 맛집',
      '구리 한식 설렁탕',
      '구리 한식',
      '구리 설렁탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 설렁탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '설렁탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_gomtang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '곰탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥣',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 곰탕',
      '구리 곰탕 맛집',
      '구리 한식 곰탕',
      '구리 한식',
      '구리 곰탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 곰탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '곰탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_kalguksu_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '칼국수',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 칼국수',
      '구리 칼국수 맛집',
      '구리 한식 칼국수',
      '구리 한식',
      '구리 칼국수 점심',
    ],
    compareWith: '동일 지역 다른 한식당 칼국수',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '칼국수',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_naengmyeon_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '냉면',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍜',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 냉면',
      '구리 냉면 맛집',
      '구리 한식 냉면',
      '구리 한식',
      '구리 냉면 점심',
    ],
    compareWith: '동일 지역 다른 한식당 냉면',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '냉면',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_suyuk_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '수육',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥩',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 수육',
      '구리 수육 맛집',
      '구리 한식 수육',
      '구리 한식',
      '구리 수육 점심',
    ],
    compareWith: '동일 지역 다른 한식당 수육',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '수육',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_meoritgogi_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '머릿고기',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍖',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 머릿고기',
      '구리 머릿고기 맛집',
      '구리 한식 머릿고기',
      '구리 한식',
      '구리 머릿고기 점심',
    ],
    compareWith: '동일 지역 다른 한식당 머릿고기',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '머릿고기',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_sulguk_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '술국',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 술국',
      '구리 술국 맛집',
      '구리 한식 술국',
      '구리 한식',
      '구리 술국 점심',
    ],
    compareWith: '동일 지역 다른 한식당 술국',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '술국',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_kimchijjigae_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '김치찌개',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥘',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 김치찌개',
      '구리 김치찌개 맛집',
      '구리 한식 김치찌개',
      '구리 한식',
      '구리 김치찌개 점심',
    ],
    compareWith: '동일 지역 다른 한식당 김치찌개',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '김치찌개',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_doenjangjjigae_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '된장찌개',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥘',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 된장찌개',
      '구리 된장찌개 맛집',
      '구리 한식 된장찌개',
      '구리 한식',
      '구리 된장찌개 점심',
    ],
    compareWith: '동일 지역 다른 한식당 된장찌개',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '된장찌개',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_jeyukbokkeum_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '제육볶음',
    cat: '한식',
    name: '이 한식당',
    emoji: '🌶️',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 제육볶음',
      '구리 제육볶음 맛집',
      '구리 한식 제육볶음',
      '구리 한식',
      '구리 제육볶음 점심',
    ],
    compareWith: '동일 지역 다른 한식당 제육볶음',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '제육볶음',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_bulgogi_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '불고기',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥩',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 불고기',
      '구리 불고기 맛집',
      '구리 한식 불고기',
      '구리 한식',
      '구리 불고기 점심',
    ],
    compareWith: '동일 지역 다른 한식당 불고기',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '불고기',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_bibimbap_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '비빔밥',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 비빔밥',
      '구리 비빔밥 맛집',
      '구리 한식 비빔밥',
      '구리 한식',
      '구리 비빔밥 점심',
    ],
    compareWith: '동일 지역 다른 한식당 비빔밥',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '비빔밥',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_samgyetang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '삼계탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐔',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 삼계탕',
      '구리 삼계탕 맛집',
      '구리 한식 삼계탕',
      '구리 한식',
      '구리 삼계탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 삼계탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '삼계탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_bossam_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '보쌈',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥩',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 보쌈',
      '구리 보쌈 맛집',
      '구리 한식 보쌈',
      '구리 한식',
      '구리 보쌈 점심',
    ],
    compareWith: '동일 지역 다른 한식당 보쌈',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '보쌈',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_jokbal_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '족발',
    cat: '한식',
    name: '이 한식당',
    emoji: '🥩',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 족발',
      '구리 족발 맛집',
      '구리 한식 족발',
      '구리 한식',
      '구리 족발 점심',
    ],
    compareWith: '동일 지역 다른 한식당 족발',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '족발',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_chueotang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '추어탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 추어탕',
      '구리 추어탕 맛집',
      '구리 한식 추어탕',
      '구리 한식',
      '구리 추어탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 추어탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '추어탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_yukgaejang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '육개장',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 육개장',
      '구리 육개장 맛집',
      '구리 한식 육개장',
      '구리 한식',
      '구리 육개장 점심',
    ],
    compareWith: '동일 지역 다른 한식당 육개장',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '육개장',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_dakbokkeumtang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '닭볶음탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 닭볶음탕',
      '구리 닭볶음탕 맛집',
      '구리 한식 닭볶음탕',
      '구리 한식',
      '구리 닭볶음탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 닭볶음탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '닭볶음탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_dakhanmari_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '닭한마리',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍗',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 닭한마리',
      '구리 닭한마리 맛집',
      '구리 한식 닭한마리',
      '구리 한식',
      '구리 닭한마리 점심',
    ],
    compareWith: '동일 지역 다른 한식당 닭한마리',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '닭한마리',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_gamjatang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '감자탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 감자탕',
      '구리 감자탕 맛집',
      '구리 한식 감자탕',
      '구리 한식',
      '구리 감자탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 감자탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '감자탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_galbijjim_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '갈비찜',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍖',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 갈비찜',
      '구리 갈비찜 맛집',
      '구리 한식 갈비찜',
      '구리 한식',
      '구리 갈비찜 점심',
    ],
    compareWith: '동일 지역 다른 한식당 갈비찜',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '갈비찜',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_kodarijorim_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '코다리조림',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 코다리조림',
      '구리 코다리조림 맛집',
      '구리 한식 코다리조림',
      '구리 한식',
      '구리 코다리조림 점심',
    ],
    compareWith: '동일 지역 다른 한식당 코다리조림',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '코다리조림',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_dongtaetang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '동태탕',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 동태탕',
      '구리 동태탕 맛집',
      '구리 한식 동태탕',
      '구리 한식',
      '구리 동태탕 점심',
    ],
    compareWith: '동일 지역 다른 한식당 동태탕',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '동태탕',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_agujjim_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '아구찜',
    cat: '한식',
    name: '이 한식당',
    emoji: '🦑',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 아구찜',
      '구리 아구찜 맛집',
      '구리 한식 아구찜',
      '구리 한식',
      '구리 아구찜 점심',
    ],
    compareWith: '동일 지역 다른 한식당 아구찜',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '아구찜',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_orijumulleok_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '오리주물럭',
    cat: '한식',
    name: '이 한식당',
    emoji: '🦆',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 오리주물럭',
      '구리 오리주물럭 맛집',
      '구리 한식 오리주물럭',
      '구리 한식',
      '구리 오리주물럭 점심',
    ],
    compareWith: '동일 지역 다른 한식당 오리주물럭',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '오리주물럭',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_oribaeksuk_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '오리백숙',
    cat: '한식',
    name: '이 한식당',
    emoji: '🦆',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 오리백숙',
      '구리 오리백숙 맛집',
      '구리 한식 오리백숙',
      '구리 한식',
      '구리 오리백숙 점심',
    ],
    compareWith: '동일 지역 다른 한식당 오리백숙',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '오리백숙',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_nakjibokkeum_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '낙지볶음',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐙',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 낙지볶음',
      '구리 낙지볶음 맛집',
      '구리 한식 낙지볶음',
      '구리 한식',
      '구리 낙지볶음 점심',
    ],
    compareWith: '동일 지역 다른 한식당 낙지볶음',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '낙지볶음',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_jjukkumibokkeum_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '쭈꾸미볶음',
    cat: '한식',
    name: '이 한식당',
    emoji: '🦑',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 쭈꾸미볶음',
      '구리 쭈꾸미볶음 맛집',
      '구리 한식 쭈꾸미볶음',
      '구리 한식',
      '구리 쭈꾸미볶음 점심',
    ],
    compareWith: '동일 지역 다른 한식당 쭈꾸미볶음',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '쭈꾸미볶음',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_saengseongui_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '생선구이',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 생선구이',
      '구리 생선구이 맛집',
      '구리 한식 생선구이',
      '구리 한식',
      '구리 생선구이 점심',
    ],
    compareWith: '동일 지역 다른 한식당 생선구이',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '생선구이',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_galchijorim_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '갈치조림',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 갈치조림',
      '구리 갈치조림 맛집',
      '구리 한식 갈치조림',
      '구리 한식',
      '구리 갈치조림 점심',
    ],
    compareWith: '동일 지역 다른 한식당 갈치조림',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '갈치조림',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_godeungeojorim_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '고등어조림',
    cat: '한식',
    name: '이 한식당',
    emoji: '🐟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 고등어조림',
      '구리 고등어조림 맛집',
      '구리 한식 고등어조림',
      '구리 한식',
      '구리 고등어조림 점심',
    ],
    compareWith: '동일 지역 다른 한식당 고등어조림',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '고등어조림',
    catRef: '한식',
    isRepresentative: false,
  },
  {
    id: 'rest_korean_cheonggukjang_guri_01',
    storeId: 'store_guri_korean_01',
    industry: 'korean',
    region: '구리',
    menu: '청국장',
    cat: '한식',
    name: '이 한식당',
    emoji: '🍲',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 청국장',
      '구리 청국장 맛집',
      '구리 한식 청국장',
      '구리 한식',
      '구리 청국장 점심',
    ],
    compareWith: '동일 지역 다른 한식당 청국장',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '청국장',
    catRef: '한식',
    isRepresentative: false,
  },
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const KOREAN_META = {
  industry: 'korean',
  label: '한식·한식',
  greeting: '어떤 한식 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 순대국 점심 메뉴 정보',
    '구리 김치찌개 혼밥 메뉴 안내',
    '구리 수육 포장 메뉴 정리',
    '구리 갈비탕 가족 외식 정보',
  ],
  badge: '🍜',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const KOREAN_LONGTAIL_SUFFIXES = {
  // 면·밥
  korean_noodle: [
    '메뉴 정보 정리',
    '점심 메뉴 안내',
    '혼밥 메뉴 정리',
    '포장 정보 안내',
  ],
  // 고기·볶음
  korean_dish: [
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
// BLOCK_MAP — korean ↔ 의료·카페·중식 narrative·광고 차단
//   ⚠ 중식 결(춘장·짜장·짬뽕·탕수육) 침투 차단 (업종 독립 — Naver §3)
// ─────────────────────────────────────────────────────────
export const KOREAN_BLOCK_MAP = {
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
  // 중식 narrative 침투 차단 (Korean 독립 ecosystem 유지)
  chinese: [
    '춘장', '짜장', '짬뽕', '탕수육', '깐풍기', '유린기',
    '꽃빵', '샤오롱바오', '양장피', '팔보채', '유산슬',
  ],
  // 효능·관용 단정 차단 (PHILOSOPHY — 효능 단정 금지. '해장'은 generate 완화룰 위임이므로 제외)
  efficacy: [
    '속풀이', '몸보신', '숙취해소', '건강에 좋', '기력 회복',
  ],
};

// ============================================================
// ★ 제목 다양성 풀 (commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열은 data 소유)
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}`
// ============================================================

export const KOREAN_TITLE_MIDDLE = [
  '안내', '정보', '메뉴 안내', '메뉴 정보', '메뉴 소개',
  '방문 정보', '방문 가이드', '이용 안내', '기본 정보', '특징',
  '메뉴 특징', '메뉴 구성', '한눈에 보기', '알아보기', '참고 정보',
];

export const KOREAN_TITLE_SUFFIX = [
  '방문 전 확인', '방문 전 참고사항', '운영 정보', '일반 정보', '기본 안내',
  '메뉴 살펴보기', '메뉴 알아보기', '이용 참고', '선택 전 참고', '특징 정리',
  '한눈에 보기', '정보 정리', '방문 팁', '메뉴 가이드', '기본 내용',
];

// 메뉴별 SCENE 풀 (MIDDLE 자리에 확률적 치환 — 메뉴 매칭 시만)
//   키: 정확한 메뉴명. 미매칭 시 KOREAN_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
export const KOREAN_TITLE_SCENE = {
  '국밥': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '순대국': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '돼지국밥': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '소머리국밥': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '소고기국밥': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '콩나물국밥': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '해장국': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '갈비탕': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '설렁탕': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '곰탕': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '칼국수': ['면 메뉴 안내', '한식 면 메뉴 정보', '한식 메뉴 안내'],
  '냉면': ['면 메뉴 안내', '한식 면 메뉴 정보', '한식 메뉴 안내'],
  '수육': ['고기 메뉴 안내', '한식 요리 정보', '한식 메뉴 안내'],
  '머릿고기': ['고기 메뉴 안내', '한식 요리 정보', '한식 메뉴 안내'],
  '술국': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '김치찌개': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '된장찌개': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
  '제육볶음': ['고기 메뉴 안내', '한식 요리 정보', '한식 메뉴 안내'],
  '불고기': ['고기 메뉴 안내', '한식 요리 정보', '한식 메뉴 안내'],
  '비빔밥': ['밥 메뉴 안내', '한식 밥 메뉴 정보', '한식 메뉴 안내'],
  '삼계탕': ['국물 메뉴 안내', '한식 국물 메뉴 정보', '한식 메뉴 안내'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값('한식') 기준
export const KOREAN_TITLE_SCENE_BY_CATEGORY = {
  '한식': ['한식 메뉴 안내', '한식 메뉴 정보', '식사 메뉴 안내'],
};

// ============================================================
// ★ [v2.4] 제목용 방문목적(purpose) 풀 — 검색 의도 선두 구조
//   목적: 제목에 "왜 방문하는가"를 메뉴보다 먼저 노출 → 클릭률·검색의도 강화.
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열 data 소유).
//   ⚠ 메뉴 공용 풀 금지 — 결(menuClass)별 폴백으로 "아이와 국밥" 류 어색 조합 차단.
//   ⚠ 본문 KOREAN_VISIT_SITUATIONS와 별개(제목 길이에 맞춘 짧은 라벨).
//   ⚠ 효능/관용/광고 표현 없음 — 검색 직전 '상황' 라벨만 (PHILOSOPHY 정합).
//   generator는 menuClass 판정 → 해당 풀에서 비복원 선택만. 조립은 FORMS가 담당.
// ============================================================

// 메뉴 → 결(menuClass) 매핑. SCENE 풀 분류와 동일 기준(국물/면/고기/밥).
//   미매칭 메뉴는 generator에서 'soup' 기본 폴백.
export const KOREAN_TITLE_MENU_CLASS = {
  '국밥': 'soup', '순대국': 'soup', '돼지국밥': 'soup', '소머리국밥': 'soup',
  '소고기국밥': 'soup', '콩나물국밥': 'soup', '해장국': 'soup', '갈비탕': 'soup',
  '설렁탕': 'soup', '곰탕': 'soup', '술국': 'soup', '김치찌개': 'soup',
  '된장찌개': 'soup', '삼계탕': 'soup',
  '칼국수': 'noodle', '냉면': 'noodle',
  '수육': 'meat', '머릿고기': 'meat', '제육볶음': 'meat', '불고기': 'meat',
  '보쌈': 'meat', '족발': 'meat',
  '추어탕': 'soup',
  '육개장': 'soup',
  '닭볶음탕': 'meat', '닭한마리': 'meat',
  '감자탕': 'soup',
  '갈비찜': 'meat', '코다리조림': 'meat',
  '동태탕': 'soup',
  '아구찜': 'meat', '오리주물럭': 'meat',
  '오리백숙': 'meat', '낙지볶음': 'meat', '쭈꾸미볶음': 'meat',
  '생선구이': 'meat', '갈치조림': 'meat', '고등어조림': 'meat',
  '청국장': 'soup',
  '비빔밥': 'rice',
};

// 결별 방문목적 풀. 각 결의 검색 현실에 맞는 목적만 배치.
//   soup: 해장·국물·든든함 중심 / noodle: 점심·가벼움 / meat: 모임·외식 / rice: 간단·혼밥
export const KOREAN_TITLE_PURPOSE_BY_CLASS = {
  soup:   ['해장', '추운 날', '든든한 한 끼', '혼밥', '퇴근 후', '직장인 점심', '비 오는 날'],
  noodle: ['점심', '가족 식사', '비 오는 날', '주말 점심', '혼밥', '든든한 한 끼'],
  meat:   ['회식', '가족 식사', '주말 외식', '모임', '저녁 약속', '부모님과'],
  rice:   ['혼밥', '간단한 한 끼', '점심', '가볍게', '직장인 점심'],
};

// 결 미매칭 시 최종 폴백 (보편 목적만).
export const KOREAN_TITLE_PURPOSE_FALLBACK = ['점심', '혼밥', '든든한 한 끼', '가족 식사'];

// ★ [v2.4] 제목 조립 폼 가중 테이블 — 누적가중 비복원 선택.
//   weight 합 = 100. 선두형(방문목적 우선) 40% / 지역선두 40% / 정보형 20%.
//   placeholder: {region} {menu} {purpose} {middle}. generator가 치환.
//   form 'A'(region purpose menu)가 핵심 — 지역+방문목적+메뉴 검색의도 정렬.
export const KOREAN_TITLE_FORMS = [
  { id: 'A', weight: 40, pattern: '{region} {purpose} {menu} {middle}' },  // 지역+목적+메뉴 (핵심)
  { id: 'B', weight: 20, pattern: '{purpose} {region} {menu}' },           // 목적 선두
  { id: 'C', weight: 20, pattern: '{region} {menu}｜{purpose}' },          // 기존형 보존(목적 후미)
  { id: 'D', weight: 15, pattern: '{region} {menu} {middle}' },            // 정보형(기존 톤 연속성)
  { id: 'E', weight: 5,  pattern: '{menu} {middle}｜{purpose}' },          // 메뉴 선두(최소)
];
