// ============================================================
// western-data.js — 양식 엔진 데이터 (chinese-data.js 복사 베이스)
//   ★ 외식 신규 복사 SOP(v4.2) + 일식 인수인계 §3 정정 4지점 반영
//   ★ cat 4계열 분리: 면 / 밥 / 고기 / 단품  (일식 동형)
//   ★ 돈가스(양식) = meat 계열 고정 (일식 가츠동 taste 충돌 차단)
//   ★ 매장명 0건 / name·genericName = placeholder / keywords = 검색의도
// ============================================================

// ─────────────────────────────────────────────────────────
// CATS — 계열 4분리 (전체 + 면·밥·고기·단품)
// ─────────────────────────────────────────────────────────
export const WESTERN_CATS = [
  '전체',
  '면',
  '밥',
  '고기',
  '단품',
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리)
// ─────────────────────────────────────────────────────────
export const WESTERN_REGIONS = [
  '구리',
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 양식 8메뉴 (면·밥·고기·단품)
// ─────────────────────────────────────────────────────────
export const WESTERN_MENUS = {
  양식: [
    // 면 계열
    '파스타',
    // 밥 계열
    '리소토', '필라프', '오므라이스',
    // 고기 계열
    '스테이크', '함박스테이크', '돈가스',
    // 단품 계열
    '피자', '그라탕',
    // 면 계열 (추가)
    '라자냐', '뇨끼',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성 (정보형, 효능표현 없음)
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  '파스타': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '이탈리안 레스토랑', '가게', '여기'],
    motive: '면에 소스 잘 밴 파스타 한 그릇 하고 싶어서',
    tasteCore: '알덴테로 삶아낸 면, 면에 고루 밴 소스, 토핑의 식감',
    sceneCore: '포크로 면을 돌돌 말아 첫 입 올리는 풍경, 파마산 가루가 올라간 접시',
    hook: '포크로 말아 올리니 소스가 면에 착 감겼어요',
    keyword: '파스타',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '파스타 접시, 포크, 파마산 가루',
    sidedishes: ['파마산 가루', '페퍼론치노', '피클'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['cream', 'tomato', 'oil'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '리소토': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '이탈리안 레스토랑', '가게', '여기'],
    motive: '크리미하게 졸인 밥 요리 한 그릇 하고 싶어서',
    tasteCore: '쌀알이 살아 있게 졸인 밥, 크림이나 토마토 소스의 농도, 치즈의 풍미',
    sceneCore: '스푼으로 밥을 떠 김이 도는 첫 입 올리는 풍경, 넓은 접시에 담긴 모습',
    hook: '스푼으로 떠보니 쌀알이 살아 있으면서도 크리미했어요',
    keyword: '리소토',
    servingUnit: '한 접시',
    priceFeel: '제대로 한 그릇 하기 좋은',
    tableware: '넓은 접시, 스푼, 치즈',
    sidedishes: ['파마산 가루', '피클', '빵'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['cream', 'tomato'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '필라프': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '경양식집', '가게', '여기'],
    motive: '고슬고슬 볶은 밥 요리로 가볍게 한 끼',
    tasteCore: '버터에 볶아낸 고슬한 밥알, 채소·새우 등 토핑의 식감',
    sceneCore: '포크로 밥을 떠 토핑과 함께 올리는 풍경, 버터 향이 도는 접시',
    hook: '버터 향이 도는 밥알이 한 알 한 알 살아 있었어요',
    keyword: '필라프',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '접시, 포크, 스푼',
    sidedishes: ['피클', '수프', '빵'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['butter', 'tomato'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '오므라이스': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '경양식집', '브런치 레스토랑', '가게', '여기'],
    motive: '부드러운 계란에 싸인 밥 한 그릇 하고 싶어서',
    tasteCore: '반숙으로 부드럽게 익힌 계란, 케첩·데미글라스 소스, 안에 든 볶음밥',
    sceneCore: '계란을 가르자 안의 밥이 드러나는 풍경, 소스가 올라간 접시',
    hook: '계란을 가르니 부드러운 밥이 김과 함께 드러났어요',
    keyword: '오므라이스',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '접시, 스푼, 포크',
    sidedishes: ['피클', '수프', '샐러드'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['ketchup', 'demiglace'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '스테이크': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '스테이크하우스', '비스트로', '가게', '여기'],
    motive: '제대로 구운 고기 한 점 썰어 먹고 싶어서',
    tasteCore: '겉은 시어링되고 속은 촉촉한 굽기, 육즙, 곁들인 소스의 풍미',
    sceneCore: '나이프로 고기를 썰자 단면이 드러나는 풍경, 철판이나 접시 위 고기',
    hook: '나이프로 썰어보니 단면에서 육즙이 배어 나왔어요',
    keyword: '스테이크',
    servingUnit: '한 접시',
    priceFeel: '제대로 한 끼 하기 좋은',
    tableware: '스테이크 접시, 나이프, 포크',
    sidedishes: ['감자', '구운 채소', '소스'],
    timeOfDay: ['저녁', '점심'],
    styleAxis: ['demiglace', 'pepper', 'butter'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '함박스테이크': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '경양식집', '비스트로', '가게', '여기'],
    motive: '부드러운 고기 패티에 소스 올려 먹고 싶어서',
    tasteCore: '다진 고기를 구워 만든 부드러운 패티, 데미글라스 소스, 육즙',
    sceneCore: '포크로 패티를 가르자 육즙이 비치는 풍경, 소스가 올라간 접시',
    hook: '포크로 가르니 부드러운 패티에서 육즙이 흘렀어요',
    keyword: '함박스테이크',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '접시, 나이프, 포크',
    sidedishes: ['감자', '밥', '구운 채소'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['demiglace', 'cream'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '돈가스': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '경양식집', '가게', '여기'],
    motive: '바삭하게 튀긴 고기 한 장 썰어 먹고 싶어서',
    tasteCore: '바삭한 튀김옷, 도톰한 고기, 위에 올린 소스의 새콤달콤함',
    sceneCore: '나이프로 자르자 바삭 소리가 나는 풍경, 소스를 부은 접시',
    hook: '나이프로 자르니 튀김옷에서 바삭 소리가 났어요',
    keyword: '돈가스',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '접시, 나이프, 포크',
    sidedishes: ['양배추 샐러드', '밥', '수프'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['classic', 'cheese', 'curry'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '피자': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '피제리아', '이탈리안 레스토랑', '가게', '여기'],
    motive: '여럿이 나눠 먹을 피자 한 판 하고 싶어서',
    tasteCore: '쫄깃하거나 바삭한 도우, 늘어나는 치즈, 토핑의 조화',
    sceneCore: '한 조각 들어 치즈가 늘어나는 풍경, 가운데 둔 피자를 나누는 식탁',
    hook: '한 조각 드니 치즈가 길게 늘어났어요',
    keyword: '피자',
    servingUnit: '한 판',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '피자 트레이, 커터, 개인 접시',
    sidedishes: ['핫소스', '피클', '파마산 가루'],
    timeOfDay: ['저녁', '점심'],
    styleAxis: ['tomato', 'cream', 'cheese'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '그라탕': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '이탈리안 레스토랑', '가게', '여기'],
    motive: '오븐에 구운 따뜻한 그라탕 한 그릇 하고 싶어서',
    tasteCore: '오븐에 구운 치즈 표면, 크림 소스가 밴 속재료, 김이 도는 따뜻함',
    sceneCore: '스푼으로 치즈 표면을 가르자 김이 오르는 풍경, 오븐 그릇째 나온 모습',
    hook: '스푼으로 가르니 구운 치즈 아래로 김이 올라왔어요',
    keyword: '그라탕',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '오븐 그릇, 스푼, 받침 접시',
    sidedishes: ['빵', '피클', '샐러드'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['cream', 'cheese'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '라자냐': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '이탈리안 레스토랑', '가게', '여기'],
    motive: '층층이 쌓인 라자냐 한 조각 하고 싶어서',
    tasteCore: '파스타 시트 사이 밴 소스, 겹겹이 쌓인 치즈와 고기, 오븐에 구운 표면',
    sceneCore: '포크로 단면을 가르자 층이 드러나는 풍경, 치즈가 늘어지는 한 조각',
    hook: '포크로 자르니 면 사이로 소스와 치즈 층이 드러났어요',
    keyword: '라자냐',
    servingUnit: '한 접시',
    priceFeel: '제대로 한 끼 하기 좋은',
    tableware: '접시, 포크, 파마산 가루',
    sidedishes: ['파마산 가루', '빵', '피클'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['tomato', 'cream'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
  '뇨끼': {
    genericName: '양식당',
    altGenericNames: ['레스토랑', '비스트로', '이탈리안 레스토랑', '가게', '여기'],
    motive: '쫀득한 감자 뇨끼 한 접시 하고 싶어서',
    tasteCore: '감자로 빚어 쫀득한 식감, 소스가 밴 표면, 부드럽게 씹히는 결',
    sceneCore: '포크로 하나 떠 소스에 굴려 올리는 풍경, 동글한 뇨끼가 담긴 접시',
    hook: '포크로 떠보니 쫀득한 뇨끼에 소스가 감겼어요',
    keyword: '뇨끼',
    servingUnit: '한 접시',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '파스타 접시, 포크, 파마산 가루',
    sidedishes: ['파마산 가루', '빵', '피클'],
    timeOfDay: ['점심', '저녁'],
    styleAxis: ['cream', 'tomato', 'oil'],  // ★ Dormant Field — 선적재·미배선 (관측 후 활성)
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS
// ─────────────────────────────────────────────────────────
export const WESTERN_SITUATIONS = [
  '혼밥',
  '점심',
  '포장',
  '가족 외식',
  // 1단계 검증 후 확장:
  // '회식', '데이트', '주말 점심', '모임',
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정 (효능표현 없음)
// ─────────────────────────────────────────────────────────
export const SITUATION_OVERRIDES = {
  '혼밥': {
    motiveExtra: '혼자 빠르게 한 끼 해결하러',
    tasteExtra: '혼자라서 한 접시에만 집중할 수 있었어요',
    sceneExtra: '카운터 자리나 작은 테이블에 혼자 앉은 손님들 분위기',
    hookExtra: '혼자 들어갔는데 1인 메뉴가 잘 갖춰져 있어서 편했어요',
    flowBias: 'arrive',
  },
  '점심': {
    motiveExtra: '점심시간에 빠르게 한 끼 하러',
    tasteExtra: '점심에 가볍게 한 접시 하기 좋은 양과 간',
    sceneExtra: '점심 피크에 직장인 손님이 빠르게 식사하고 가는 분위기',
    hookExtra: '점심시간이라 회전이 빨라서 주문하고 금방 나왔어요',
    flowBias: 'taste',
  },
  '포장': {
    motiveExtra: '집에서 먹으려고 포장하러',
    tasteExtra: '포장이라 식을까 했는데 소스를 따로 담아주셔서 괜찮았어요',
    sceneExtra: '포장 손님이 카운터 앞에서 기다리는 풍경',
    hookExtra: '포장 주문하고 잠깐 기다리니 따끈하게 담아주셨어요',
    flowBias: 'order',
  },
  '가족 외식': {
    motiveExtra: '가족끼리 여러 메뉴 나눠 먹으러',
    tasteExtra: '파스타·고기·피자를 골고루 시켜 나눠 먹기 좋은 구성',
    sceneExtra: '4인 이상 둘러앉아 메뉴를 가운데 두고 나눠 먹는 분위기',
    hookExtra: '가운데 피자를 두고 각자 앞접시에 덜어 먹으니 편했어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적
// ─────────────────────────────────────────────────────────
export const WESTERN_PURPOSES = [
  '혼밥',
  '가족모임',
  '친구',
  '간단히',
  '데이트',     // ★ 양식 검색 비중 높음 (5번 반영)
  '기념일',     // ★ 양식 검색 비중 높음 (5번 반영)
  '모임',       // ★ 피자·나눔 메뉴 축 (1번 반영)
];

// ─────────────────────────────────────────────────────────
// PURPOSE_OVERRIDES — 목적별 톤 보정
// ─────────────────────────────────────────────────────────
export const PURPOSE_OVERRIDES = {
  '혼밥': {
    sceneExtra: '혼자 와서 한 접시 부담 없이 먹는 분위기',
    tableExtra: '1인석 또는 작은 2인 테이블',
    paceExtra: '식사 시간 20~30분 정도, 빠르게 먹고 나옴',
  },
  '가족모임': {
    sceneExtra: '4인 이상 모여 메뉴를 나눠 먹기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블',
    paceExtra: '식사 시간 1시간 안팎, 파스타·고기·피자 골고루 시켜 천천히',
    extraDetail: '아이가 먹기 좋은 메뉴(오므라이스·돈가스)인지 1줄 언급',
  },
  '친구': {
    sceneExtra: '친구랑 마주 앉아 메뉴 하나씩 나눠 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블, 접시 올려놓기 좋은 크기',
    paceExtra: '식사 시간 40분~1시간, 메뉴에 곁들여 나눠 먹음',
  },
  '간단히': {
    sceneExtra: '오래 머물기보다 한 접시 빠르게 먹고 가는 분위기',
    tableExtra: '1~2인 자리 또는 포장 위주',
    paceExtra: '식사 시간 20~30분, 간단히 먹거나 포장',
  },
  '데이트': {
    sceneExtra: '둘이 마주 앉아 천천히 코스처럼 즐기기 좋은 분위기, 조명·간격 여유',
    tableExtra: '2인 창가석 또는 칸막이 있는 조용한 자리',
    paceExtra: '식사 시간 1시간 안팎, 메인에 곁들임 시켜 여유 있게',
  },
  '기념일': {
    sceneExtra: '특별한 날 분위기 내기 좋은 자리, 플레이팅·차림새 신경 쓴 메뉴 구성',
    tableExtra: '예약석 또는 안쪽 조용한 자리',
    paceExtra: '식사 시간 1시간 이상, 전채·메인·디저트 순으로 천천히',
    extraDetail: '기념일 분위기에 맞는 메뉴(스테이크·파스타 코스)인지 1줄 언급',
  },
  '모임': {
    sceneExtra: '여럿이 둘러앉아 피자·메인을 나눠 먹기 좋은 분위기',
    tableExtra: '4~6인 테이블, 큰 접시 올려놓기 좋은 크기',
    paceExtra: '식사 시간 1시간 안팎, 나눔 메뉴 위주로 천천히',
  },
};

// ═════════════════════════════════════════════════════════
// ★★ PURPOSE ENGINE (Pilot) — 목적 중심 엔진 전용 데이터
//   축: PURPOSE → PLACE EXPERIENCE → MENU(수단) → STORE INFO
//   기존 MENU 중심(commercial/personal)과 독립. 두 엔진 A/B 비교용.
//   ⚠ 매장명 0건 / genericName=placeholder / 검색의도 축은 목적(purpose)
//   ⚠ Spine 무변경 — western 내부에서만 소비
// ═════════════════════════════════════════════════════════

// ── 제목용 목적 라벨 (검색어 관점: "지역+목적+레스토랑") ──
//   key = WESTERN_PURPOSES 값 / titleLabel = 제목·검색어에 노출될 목적어
export const WESTERN_PURPOSE_TITLE_LABEL = {
  '데이트':     '데이트',
  '기념일':     '기념일',
  '모임':       '모임',
  '가족모임':   '가족모임',
  '친구':       '친구모임',
  '혼밥':       '혼밥',
  '간단히':     '간단한 식사',
};

// ── PURPOSE_REGISTRY — 목적별 3층 데이터 ──
//   openingSituations : 도입부 "검색자의 상황"(글 첫머리 진입). 조언형 아님, 상황 제시.
//   placeExperience   : 공간 경험 축(분위기·좌석·조명·간격·모임 적합 이유). scene 원료.
//   menuAsMeans       : 목적을 푸는 "메뉴 구성·선택 이유"(메뉴 자체 설명 아님).
//   fitReason         : 왜 양식 레스토랑이 이 목적에 맞는지(도입→목적 연결 다리).
export const WESTERN_PURPOSE_REGISTRY = {
  '데이트': {
    titleLabel: '데이트',
    openingSituations: [
      '오늘 데이트 장소를 고민하고 있다면',
      '둘이 조용히 이야기 나눌 식사 자리를 찾고 있다면',
      '분위기 있는 저녁 한 끼를 계획하고 있다면',
    ],
    fitReason: '양식 레스토랑은 코스처럼 천천히 즐기는 흐름이라 마주 앉아 대화하기 좋은 자리로 이어진다',
    placeExperience: [
      '조명이 낮게 깔려 마주 앉은 사이 대화가 편한 자리',
      '테이블 간격이 넉넉해 옆자리 소리에 덜 신경 쓰이는 배치',
      '창가석이나 칸막이 자리처럼 둘만의 흐름을 만들기 좋은 좌석',
      '음식이 순서대로 나오며 대화가 자연스럽게 이어지는 페이스',
    ],
    menuAsMeans: {
      framing: '메뉴는 둘이 나눠 즐기기 좋은 구성으로 고르면 흐름이 자연스럽다',
      picks: [
        '메인 하나에 파스타를 곁들여 나눠 먹는 구성',
        '스테이크와 파스타를 함께 시켜 한 접시씩 나누는 방식',
        '전채·메인 순으로 천천히 이어가는 코스형 선택',
      ],
    },
    sceneTail: '식사 속도가 여유로워 이야기가 끊기지 않는 흐름',
  },
  '기념일': {
    titleLabel: '기념일',
    openingSituations: [
      '특별한 기념일을 준비하고 있다면',
      '평소와 다른 저녁 한 끼로 날을 기념하고 싶다면',
      '기념할 자리에 어울리는 식사 장소를 찾고 있다면',
    ],
    fitReason: '양식 레스토랑은 플레이팅과 코스 흐름이 있어 특별한 날의 분위기를 만들기 좋다',
    placeExperience: [
      '예약석이나 안쪽 조용한 자리처럼 날을 챙기기 좋은 좌석',
      '차림새와 플레이팅에 신경 쓴 메뉴가 자리의 무게를 더하는 분위기',
      '전채·메인·디저트로 이어지는 순서가 시간을 천천히 채우는 흐름',
      '축하 인사나 짧은 세팅을 부탁하기 편한 응대 여지',
    ],
    menuAsMeans: {
      framing: '메뉴는 코스처럼 이어지는 구성으로 골라 날의 흐름을 채우는 편이 어울린다',
      picks: [
        '전채-메인-디저트로 이어지는 코스형 구성',
        '스테이크를 메인으로 두고 파스타를 곁들이는 조합',
        '둘이 나눠 즐기는 메인에 사이드를 더한 선택',
      ],
    },
    sceneTail: '접시가 순서대로 바뀌며 날을 기념하는 시간이 채워지는 흐름',
  },
  '모임': {
    titleLabel: '모임',
    openingSituations: [
      '여럿이 모여 식사할 장소를 찾고 있다면',
      '사람 수가 있는 모임 자리를 준비하고 있다면',
      '나눠 먹기 좋은 메뉴가 있는 모임 장소를 고민하고 있다면',
    ],
    fitReason: '양식 레스토랑은 피자·메인처럼 가운데 두고 나누는 메뉴가 있어 여럿이 둘러앉기 좋다',
    placeExperience: [
      '4~6인이 둘러앉아 접시를 가운데 두기 좋은 넓은 테이블',
      '큰 접시를 올려놓고 각자 덜어 먹기 편한 자리 배치',
      '여럿이 대화하며 오래 머물러도 편한 좌석 간격',
      '나눔 메뉴가 순서대로 나와 자리가 이어지는 흐름',
    ],
    menuAsMeans: {
      framing: '메뉴는 가운데 두고 나누는 구성으로 고르면 여럿이 즐기기 좋다',
      picks: [
        '피자를 가운데 두고 파스타·메인을 곁들이는 구성',
        '여러 메뉴를 시켜 각자 덜어 먹는 나눔 방식',
        '메인 한둘에 사이드를 넉넉히 더하는 선택',
      ],
    },
    sceneTail: '접시를 가운데 두고 각자 덜어 먹으며 대화가 오가는 흐름',
  },
  '가족모임': {
    titleLabel: '가족모임',
    openingSituations: [
      '부모님과 함께 식사할 장소를 찾고 있다면',
      '온 가족이 둘러앉을 식사 자리를 고민하고 있다면',
      '아이부터 어른까지 무난한 메뉴가 있는 곳을 찾고 있다면',
    ],
    fitReason: '양식 레스토랑은 오므라이스·돈가스처럼 아이도 먹기 좋은 메뉴와 메인이 함께 있어 가족이 나눠 먹기 좋다',
    placeExperience: [
      '4인 이상 둘러앉기 좋은 테이블과 아이 의자 유무',
      '다양한 메뉴를 가운데 두고 나눠 먹기 좋은 자리',
      '어른과 아이가 각자 취향대로 고를 수 있는 메뉴 폭',
      '천천히 식사해도 편한 좌석 간격과 응대 여지',
    ],
    menuAsMeans: {
      framing: '메뉴는 어른과 아이가 함께 나눠 먹기 좋은 구성으로 고르는 편이 어울린다',
      picks: [
        '메인에 오므라이스·돈가스를 더해 아이 몫까지 챙기는 구성',
        '파스타·고기·피자를 골고루 시켜 나눠 먹는 방식',
        '무난한 메뉴 몇을 가운데 두고 각자 덜어 먹는 선택',
      ],
    },
    sceneTail: '여러 접시를 가운데 두고 각자 취향대로 덜어 먹는 흐름',
  },
  '친구': {
    titleLabel: '친구모임',
    openingSituations: [
      '친구와 편하게 식사할 곳을 찾고 있다면',
      '오랜만에 만나 이야기 나눌 식사 자리를 고민하고 있다면',
      '가볍게 한 끼 하며 오래 앉아 있기 좋은 곳을 찾고 있다면',
    ],
    fitReason: '양식 레스토랑은 메뉴 하나씩 나눠 먹으며 오래 앉아 있기 좋아 친구와 편히 대화하기 좋다',
    placeExperience: [
      '2~4인이 마주 앉아 접시를 올려놓기 좋은 테이블',
      '오래 앉아 이야기해도 편한 좌석 간격',
      '메뉴를 하나씩 나눠 먹으며 대화가 이어지는 분위기',
      '부담 없이 한두 접시로 자리를 채우기 좋은 구성',
    ],
    menuAsMeans: {
      framing: '메뉴는 하나씩 시켜 나눠 먹는 구성으로 고르면 대화가 편하다',
      picks: [
        '파스타에 사이드를 더해 나눠 먹는 구성',
        '메인 하나에 피자를 곁들여 나누는 방식',
        '각자 다른 메뉴를 시켜 한 입씩 나누는 선택',
      ],
    },
    sceneTail: '메뉴를 하나씩 나눠 먹으며 이야기가 오래 이어지는 흐름',
  },
  '혼밥': {
    titleLabel: '혼밥',
    openingSituations: [
      '혼자 부담 없이 한 끼 할 곳을 찾고 있다면',
      '혼자 들어가 편히 먹을 자리를 고민하고 있다면',
      '한 접시로 가볍게 끼니를 해결하고 싶다면',
    ],
    fitReason: '양식 레스토랑은 파스타·리소토처럼 한 접시로 완결되는 메뉴가 있어 혼자 먹기에도 부담이 적다',
    placeExperience: [
      '1인석이나 작은 2인 테이블처럼 혼자 앉기 편한 자리',
      '한 접시에 집중해 빠르게 먹고 나오기 좋은 흐름',
      '혼자 들어가도 눈치 덜 보이는 좌석 배치',
      '주문부터 식사까지 간결하게 이어지는 페이스',
    ],
    menuAsMeans: {
      framing: '메뉴는 한 접시로 완결되는 구성으로 고르면 혼자 먹기 편하다',
      picks: [
        '파스타 한 접시로 완결되는 구성',
        '리소토·오므라이스처럼 한 그릇으로 끝나는 선택',
        '메인 하나에 수프를 곁들이는 간결한 구성',
      ],
    },
    sceneTail: '한 접시에 집중해 빠르게 먹고 나오는 흐름',
  },
  '간단히': {
    titleLabel: '간단한 식사',
    openingSituations: [
      '가볍게 한 끼 해결할 곳을 찾고 있다면',
      '오래 머물기보다 빠르게 먹고 나올 자리를 고민하고 있다면',
      '간단히 한 접시 하거나 포장할 곳을 찾고 있다면',
    ],
    fitReason: '양식 레스토랑은 한 접시로 완결되는 메뉴가 있어 간단히 먹거나 포장하기에도 무난하다',
    placeExperience: [
      '1~2인 자리나 포장 위주로 빠르게 이용하기 좋은 흐름',
      '오래 머물지 않아도 편한 좌석과 회전',
      '주문부터 식사까지 간결하게 이어지는 페이스',
      '포장으로 가져가기 좋은 구성 여부',
    ],
    menuAsMeans: {
      framing: '메뉴는 빠르게 완결되거나 포장하기 좋은 구성으로 고르는 편이 어울린다',
      picks: [
        '한 접시로 완결되는 파스타·오므라이스 구성',
        '포장으로 가져가기 좋은 단품 선택',
        '수프를 곁들여 간단히 한 끼 채우는 구성',
      ],
    },
    sceneTail: '한 접시 빠르게 먹거나 포장해 가는 간결한 흐름',
  },
};

// ── Purpose 제목 조립 풀 (menu 보조·purpose 우선) ──
//   제목: `{region} {purposeLabel} 레스토랑{｜변형}`  (purpose 1순위)
//   menu 보조 변형은 소수만 혼합(검색량 목적 아닌 보조 노출).
export const WESTERN_PURPOSE_TITLE_FORMS = [
  '{region} {purpose} 레스토랑',
  '{region} {purpose} 레스토랑 안내',
  '{region} {purpose} 식사 장소',
  '{region} {purpose} 레스토랑 정보',
  '{region} {purpose} 갈 만한 레스토랑',
];
// menu 보조 변형 (전체 중 소수 확률로만 등장)
export const WESTERN_PURPOSE_TITLE_FORMS_MENU_AUX = [
  '{region} {purpose} 레스토랑｜{menu} 있는 곳',
  '{region} {purpose} 식사｜{menu} 곁들이기 좋은',
];

// ── 헬퍼: 목적 레지스트리 조회 (미매칭 시 null → 호출부 폴백) ──
export function getPurposeProfile(purpose) {
  return WESTERN_PURPOSE_REGISTRY[purpose] || null;
}

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 가상 매장 1개 (검증용 / 본문 노출 금지)
//   ⚠ 실제 양식 매장 데이터 확보 전 OWNER 생성 검증용 (SOP STEP4)
//   ⚠ 매장명·brandName 필드 없음 — genericName(placeholder)만 사용
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_western_01',
    region: '구리',
    cat: '양식',
    representativeMenu: '파스타',
    menus: ['파스타', '스테이크', '피자'],
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
      genericName: '양식당',
      motive: '근처에서 양식 한 끼 하러',
      tasteCore: '기본적인 양식 느낌',
      sceneCore: '동네 양식당 분위기',
      hook: '문 열고 들어가니 익숙한 양식당 풍경이었어요',
      keyword: '양식',
      priceFeel: '부담 없이 한 끼 하기 좋은',
      servingUnit: '한 접시',
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
    servingUnit: base.servingUnit || '한 접시',
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
export const WESTERN_SITE_KEYWORDS = [
  '파스타', '리소토', '필라프', '오므라이스',
  '스테이크', '함박스테이크', '돈가스', '피자',
  '그라탕', '라자냐', '뇨끼',
  // SEO 단순형
  '양식', '레스토랑', '양식당',
  // 상황·목적
  '혼밥', '점심', '포장', '가족 외식', '가족모임', '친구', '간단히', '데이트',
];

// ─────────────────────────────────────────────────────────
// TREATMENTS — 양식 조합 카드 (검증용 가상 매장 1개 × 전체 8메뉴)
//   ⚠ titlePatterns 매장명 0건 / name = placeholder / keywords = 검색의도
//   ⚠ 실매장 확보 시 storeId 교체/추가만 — 카드 구조 무변경
//   ⚠ WESTERN_MENUS 11개와 1:1 정합 (OWNER 검증 완전성)
//   ⚠ cat = 계열(면/밥/고기/단품), catRef = '양식'
// ─────────────────────────────────────────────────────────
export const WESTERN_TREATMENTS = [
  {
    id: 'rest_western_pasta_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '파스타',
    cat: '면',
    name: '이 양식당',
    emoji: '🍝',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 파스타',
      '구리 파스타 맛집',
      '구리 양식당 파스타',
      '구리 양식',
      '구리 파스타 점심',
    ],
    compareWith: '동일 지역 다른 양식당 파스타',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '파스타',
    catRef: '양식',
    isRepresentative: true,
  },
  {
    id: 'rest_western_risotto_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '리소토',
    cat: '밥',
    name: '이 양식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 리소토',
      '구리 리소토 맛집',
      '구리 양식당 리소토',
      '구리 양식',
      '구리 리소토 점심',
    ],
    compareWith: '동일 지역 다른 양식당 리소토',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '리소토',
    catRef: '양식',
  },
  {
    id: 'rest_western_pilaf_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '필라프',
    cat: '밥',
    name: '이 양식당',
    emoji: '🍚',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 필라프',
      '구리 필라프 맛집',
      '구리 양식당 필라프',
      '구리 양식',
      '구리 필라프 점심',
    ],
    compareWith: '동일 지역 다른 양식당 필라프',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '필라프',
    catRef: '양식',
  },
  {
    id: 'rest_western_omurice_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '오므라이스',
    cat: '밥',
    name: '이 양식당',
    emoji: '🍳',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 오므라이스',
      '구리 오므라이스 맛집',
      '구리 양식당 오므라이스',
      '구리 양식',
      '구리 오므라이스 점심',
    ],
    compareWith: '동일 지역 다른 양식당 오므라이스',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '오므라이스',
    catRef: '양식',
  },
  {
    id: 'rest_western_steak_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '스테이크',
    cat: '고기',
    name: '이 양식당',
    emoji: '🥩',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 스테이크',
      '구리 스테이크 맛집',
      '구리 양식당 스테이크',
      '구리 양식',
      '구리 스테이크 저녁',
    ],
    compareWith: '동일 지역 다른 양식당 스테이크',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '스테이크',
    catRef: '양식',
  },
  {
    id: 'rest_western_hambak_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '함박스테이크',
    cat: '고기',
    name: '이 양식당',
    emoji: '🍖',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 함박스테이크',
      '구리 함박스테이크 맛집',
      '구리 양식당 함박스테이크',
      '구리 양식',
      '구리 함박스테이크 점심',
    ],
    compareWith: '동일 지역 다른 양식당 함박스테이크',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '함박스테이크',
    catRef: '양식',
  },
  {
    id: 'rest_western_donkatsu_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '돈가스',
    cat: '고기',
    name: '이 양식당',
    emoji: '🍤',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 돈가스',
      '구리 돈가스 맛집',
      '구리 양식당 돈가스',
      '구리 양식',
      '구리 돈가스 점심',
    ],
    compareWith: '동일 지역 다른 양식당 돈가스',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '돈가스',
    catRef: '양식',
  },
  {
    id: 'rest_western_pizza_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '피자',
    cat: '단품',
    name: '이 양식당',
    emoji: '🍕',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 피자',
      '구리 피자 맛집',
      '구리 양식당 피자',
      '구리 양식',
      '구리 피자 저녁',
    ],
    compareWith: '동일 지역 다른 양식당 피자',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '피자',
    catRef: '양식',
  },
  {
    id: 'rest_western_gratin_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '그라탕',
    cat: '단품',
    name: '이 양식당',
    emoji: '🥔',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 그라탕',
      '구리 그라탕 맛집',
      '구리 양식당 그라탕',
      '구리 양식',
      '구리 그라탕 점심',
    ],
    compareWith: '동일 지역 다른 양식당 그라탕',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '그라탕',
    catRef: '양식',
  },
  {
    id: 'rest_western_lasagna_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '라자냐',
    cat: '면',
    name: '이 양식당',
    emoji: '🥟',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 라자냐',
      '구리 라자냐 맛집',
      '구리 양식당 라자냐',
      '구리 양식',
      '구리 라자냐 점심',
    ],
    compareWith: '동일 지역 다른 양식당 라자냐',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '라자냐',
    catRef: '양식',
  },
  {
    id: 'rest_western_gnocchi_guri_01',
    storeId: 'store_guri_western_01',
    industry: 'western',
    region: '구리',
    menu: '뇨끼',
    cat: '면',
    name: '이 양식당',
    emoji: '🥔',
    titlePatterns: [
      '{region} {menu} {situation} 정보',
      '{region} {menu}｜{purpose} 메뉴 안내',
      '{region} {menu} 메뉴 정리',
    ],
    keywords: [
      '구리 뇨끼',
      '구리 뇨끼 맛집',
      '구리 양식당 뇨끼',
      '구리 양식',
      '구리 뇨끼 점심',
    ],
    compareWith: '동일 지역 다른 양식당 뇨끼',
    nearbyHint: '구리역 근처 양식 식당가',
    menuRef: '뇨끼',
    catRef: '양식',
  },
];

// ─────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────
export const WESTERN_META = {
  industry: 'western',
  label: '양식·레스토랑',
  greeting: '어떤 양식 메뉴 정보를 정리하시나요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '구리 파스타 점심 메뉴 정보',
    '구리 스테이크 가족 외식 메뉴 안내',
    '구리 돈가스 포장 메뉴 정리',
    '구리 피자 친구 정보',
  ],
  badge: '🍝',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES
// ─────────────────────────────────────────────────────────
export const WESTERN_LONGTAIL_SUFFIXES = {
  // 면·밥
  western_staple: [
    '메뉴 정보 정리',
    '점심 메뉴 안내',
    '혼밥 메뉴 정리',
    '포장 정보 안내',
  ],
  // 고기·단품
  western_main: [
    '나눠 먹기 좋은 메뉴 안내',
    '곁들임 메뉴 정리',
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
// BLOCK_MAP — western ↔ 의료·카페·한식/분식/중식/일식 narrative·광고 차단
//   ⚠ 일식 결(가츠동·우동·라멘·오야코동·규동 등) 침투 차단 (§3 ④ 돈가스 taste 충돌)
//   ⚠ 중식·한식 결 침투 차단 (업종 독립 — Naver §3)
// ─────────────────────────────────────────────────────────
export const WESTERN_BLOCK_MAP = {
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
  // 한식 narrative 침투 차단
  korean: [
    '뚝배기', '새우젓', '들깨가루', '머릿고기', '우거지', '선지',
    '해장국', '순대국', '공깃밥', '떡볶이', '어묵국물',
  ],
  // 중식 narrative 침투 차단
  chinese: [
    '춘장', '짜장', '짬뽕', '탕수육', '깐풍기', '유린기',
    '양장피', '팔보채', '유산슬', '샤오롱바오', '꽃빵',
  ],
  // 일식 narrative 침투 차단 (§3 ④ 돈가스↔가츠동 taste 충돌 핵심)
  japanese: [
    '가츠동', '규동', '오야코동', '우동', '라멘', '소바',
    '텐푸라', '사시미', '초밥', '절임 생강', '쯔유', '미소',
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

export const WESTERN_TITLE_MIDDLE = [
  '안내', '정보', '메뉴 안내', '메뉴 정보', '메뉴 소개',
  '방문 정보', '방문 가이드', '이용 안내', '기본 정보', '특징',
  '메뉴 특징', '메뉴 구성', '한눈에 보기', '알아보기', '참고 정보',
];

export const WESTERN_TITLE_SUFFIX = [
  '방문 전 확인', '방문 전 참고사항', '운영 정보', '일반 정보', '기본 안내',
  '메뉴 살펴보기', '메뉴 알아보기', '이용 참고', '선택 전 참고', '특징 정리',
  '한눈에 보기', '정보 정리', '방문 팁', '메뉴 가이드', '기본 내용',
];

// 메뉴별 SCENE 풀 (MIDDLE 자리에 확률적 치환 — 메뉴 매칭 시만)
//   키: 정확한 메뉴명. 미매칭 시 WESTERN_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
export const WESTERN_TITLE_SCENE = {
  '파스타':       ['면 메뉴 안내', '양식 면 메뉴 정보', '양식 메뉴 안내'],
  '리소토':       ['밥 메뉴 안내', '양식 밥 메뉴 정보', '양식 메뉴 안내'],
  '필라프':       ['밥 메뉴 안내', '양식 밥 메뉴 정보', '양식 메뉴 안내'],
  '오므라이스':   ['밥 메뉴 안내', '양식 밥 메뉴 정보', '양식 메뉴 안내'],
  '스테이크':     ['고기 메뉴 안내', '양식 고기 메뉴 정보', '양식 메뉴 안내'],
  '함박스테이크': ['고기 메뉴 안내', '양식 고기 메뉴 정보', '양식 메뉴 안내'],
  '돈가스':       ['고기 메뉴 안내', '양식 고기 메뉴 정보', '양식 메뉴 안내'],
  '피자':         ['단품 메뉴 안내', '양식 단품 메뉴 정보', '양식 메뉴 안내'],
  '그라탕':       ['단품 메뉴 안내', '양식 단품 메뉴 정보', '양식 메뉴 안내'],
  '라자냐':       ['면 메뉴 안내', '양식 면 메뉴 정보', '양식 메뉴 안내'],
  '뇨끼':         ['면 메뉴 안내', '양식 면 메뉴 정보', '양식 메뉴 안내'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값(계열) 기준
export const WESTERN_TITLE_SCENE_BY_CATEGORY = {
  '면':   ['양식 면 메뉴 안내', '양식 메뉴 정보', '식사 메뉴 안내'],
  '밥':   ['양식 밥 메뉴 안내', '양식 메뉴 정보', '식사 메뉴 안내'],
  '고기': ['양식 고기 메뉴 안내', '양식 메뉴 정보', '식사 메뉴 안내'],
  '단품': ['양식 단품 메뉴 안내', '양식 메뉴 정보', '식사 메뉴 안내'],
  '양식': ['양식 메뉴 안내', '양식 메뉴 정보', '식사 메뉴 안내'],
};
