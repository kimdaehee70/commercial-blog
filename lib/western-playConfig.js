// ============================================================
// lib/western-playConfig.js — 양식 FLOW_ENGINE 구조 (Western Engine 독립)
// ⚠ clinic·dental·oriental 등 의료 playConfig 참조 금지
// ⚠ cafe playConfig와도 분리 — cafe(체류 중심) ≠ restaurant(맛 중심)
// ============================================================
//
// 맛집 6섹션 = "방문계기 → 도착 → 주문 → 맛 → 장면 → 재방문"
//   cafe의 stay(체류) 자리를 restaurant는 scene(장면·분위기)으로 대체
//   cafe의 experience(공간경험) 자리를 restaurant는 taste(맛 자체)로 분리
//
// 작업 기준: Phase9_완료_Phase9_5_인계메모_v2_0 / 카페업종_인계메모 v1.4

// ─────────────────────────────────────────────────────────
// 사진 유도 포인트 — 섹션별 photo prompt
// generateWestern.js의 getImageAlts와 짝을 이룸
// ─────────────────────────────────────────────────────────
export const WESTERN_PHOTO_SPOTS = {
  visit:   null,  // 사진 없음 (도입 텍스트)
  arrive:  '외관·간판·입구 동선',
  order:   '메뉴판·상차림 세팅·반찬 구성',
  taste:   '음식 클로즈업 (국물·면·고기 표면 디테일)',
  scene:   '테이블 분위기·창가·옆자리 흐름·식사 중 풍경',
  revisit: '식당 마무리 컷 (계산대·출구·간판)',
};

// ─────────────────────────────────────────────────────────
// WESTERN_FLOW_ENGINE — 6섹션 구조
// 섹션 키 6개: visit · arrive · order · taste · scene · revisit
// generateWestern.js의 writtenSections·prompt 빌더와 반드시 일치
// ─────────────────────────────────────────────────────────
export const WESTERN_FLOW_ENGINE = {
  industry: 'western',

  sections: [
    {
      key: 'visit',
      label: '방문계기',
      order: 1,
      description: '왜 이 메뉴를 / 왜 지금 / 왜 이 지역인지 (상황·목적 결합 동기)',
      required: true,
      minLength: 200,
      maxLength: 300,
      photo: null,
    },
    {
      key: 'arrive',
      label: '도착·입장',
      order: 2,
      description: '지역 동선(지하철·도보·주차), 외관·간판, 입장 첫인상, 웨이팅 분 단위',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '외관·간판·입구 동선',
    },
    {
      key: 'order',
      label: '주문·상차림',
      order: 3,
      description: '메뉴 고르기 + 반찬·기본찬 구성 + 상차림 세팅 (가격 X)',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '메뉴판·상차림 세팅·반찬 구성',
    },
    {
      key: 'taste',
      label: '맛·식감',
      order: 4,
      description: '국물·면·고기 등 핵심 맛 묘사. 첫 입 → 식감 → 온도 → 향. 정보 나열 금지, 한 입의 체감 중심',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '음식 클로즈업 (국물·면·고기 표면 디테일)',
    },
    {
      key: 'scene',
      label: '장면·분위기',
      order: 5,
      description: '테이블 분위기·옆자리 흐름·시간대·동행 반응·창밖 풍경 등 "그 자리의 장면". 카페의 stay와 다름',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '테이블 분위기·창가·옆자리 흐름·식사 중 풍경',
    },
    {
      key: 'revisit',
      label: '재방문·추천',
      order: 6,
      description: '재방문 의사 + 어떤 상황·목적에 추천하는지 (해장/혼밥/가족모임 등)',
      required: true,
      minLength: 200,
      maxLength: 250,
      photo: '식당 마무리 컷 (계산대·출구·간판)',
    },
  ],

  // 차단 키워드 (western-data.js의 WESTERN_BLOCK_MAP과 일치)
  blockKeywords: [
    // 의료 침투 방지
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '원장님', '의사', '간호사', '병원', '회차', '경과', '붓기',
    // 카페 어휘 차단 (Phase 9 cafe와 분리)
    '카공', '작업카페', '스터디카페', '디저트카페', '브런치 카페',
    '루프탑 카페', '콘센트 자리', '노트북 거치',
    '라떼아트', '드립커피', '에스프레소 머신',
    // 학습 어휘 차단
    '독서실', '공부하기 좋은', '집중하기 좋은', '학습', '인강',
    // 광고 표현 차단 (브랜드 홍보 톤 차단)
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
    // 유치원·낚시 표현 차단
    '교실', '선생님', '원생', '낚싯대', '포인트', '조과',
    // ★ 한식/분식 narrative 침투 차단 (Western 독립 ecosystem — Naver §3 전략2)
    '뚝배기', '새우젓', '들깨가루', '머릿고기', '우거지', '선지', '떡볶이',
    // ★ 중식 narrative 침투 차단
    '춘장', '짜장', '짬뽕', '탕수육', '꽃빵',
    // ★ 일식 narrative 침투 차단 (§3④ 돈가스↔가츠동 taste 충돌)
    '가츠동', '규동', '오야코동', '우동', '라멘', '쯔유', '절임 생강',
    // ★ 효능·관용 표현 차단 (PHILOSOPHY — 효능 단정 금지)
    '해장', '속풀이', '몸보신', '숙취해소',
  ],

  // 필수 키워드 (최소 1개 포함) — 중식 결
  requiredKeywords: [
    '소스', '맛', '식감', '한 접시', '한 입',
    '양식', '메뉴', '요리', '재방문',
  ],

  // 식사 시간 흐름 (cafe의 stayTimeline 대응)
  // scene 섹션에서 사용
  sceneTimeline: {
    'arrival':   '자리 잡음 — 동행과 자리 정하고 앉음, 메뉴판 확인',
    'serving':   '상차림 — 반찬 깔리고 본 메뉴 나옴, 김 올라오는 순간',
    'eating':    '식사 중 — 한 술 한 술 흐름, 동행과 대화·반응, 옆자리 풍경',
    'finishing': '마무리 — 그릇 비워가는 즈음, 후식·물·계산 전 분위기',
  },

  // VISIT_VALUES → MEAL_VALUES (맛집판 운영 정보)
  // generateWestern.js의 injectMealValue()에서 사용
  // 8개 중 최소 5개 본문 강제 주입 (★ v1.2: priceRange 제거 — 가격 노출 금지)
  mealValueFields: [
    'waitingMinutes',   // 평일/주말 웨이팅 분 단위
    'seatCount',        // 좌석수·1인석/4인석/룸 유무
    'businessHours',    // 영업시간 + 브레이크타임/라스트오더
    'sidedishCount',    // 반찬 가짓수·리필 여부
    'parking',          // 주차 가능 여부 / 발렛 / 인근 주차장
    'restroom',         // 화장실 위치 (내부/외부/공용)
    'tableSpacing',     // 테이블 간격 (좁음/적당/여유)
    'paymentType',      // 카드 / 현금 / 계좌이체 / 키오스크
  ],
  mealValueMinCount: 5,

  // 맛집 전용 추가 블럭 (generateWestern.js에서 주입)
  extraBlocks: [
    'WAITING_BLOCKS',     // 웨이팅 정보
    'SIDEDISH_BLOCKS',    // 반찬·기본찬 구성
    'BEST_TIME',          // 방문 추천 시간대
    'MENU_COMBINATION',   // 메뉴 조합 추천 (국+공깃밥+소주 등)
    'SEAT_TYPE',          // 좌석 유형 (1인석·테이블·룸)
    'CUSTOMER_TYPE',      // 주 방문층 (직장인/가족/노인 등)
    'NOISE_LEVEL',        // 소음 수준
  ],

  // 문단 길이 가이드
  paragraphGuide: {
    minLinesPerParagraph: 2,
    maxLinesPerParagraph: 4,
    note: '네이버 맛집판은 사진 사이 짧은 문단이 상단 유지력 핵심',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

// ============================================================
// [v2 / 2026-06-25] WESTERN_COMMERCIAL_FLOW_ENGINE — 8섹션 메뉴 중심 정보형
// ⚠ 기존 WESTERN_FLOW_ENGINE(6섹션 personal)은 무수정 보존 — 롤백 안전
// ⚠ mode='commercial' 일 때만 이 섹션셋 사용. personal 호출은 영향 없음
//
// 최상위 원칙: 주인공 = '메뉴', 사용자 최종 질문 = "이 메뉴가 나에게 맞는가?"
// 8섹션: ①메뉴소개 ②메뉴장면 ③메뉴구성 ④맛특징(관찰형) ⑤곁들임
//        ⑥선택포인트(Decision★) ⑦추천상황 ⑧매장특징(보조한정)
// 비율(목표): 메뉴정보 55 / 장면 12 / 선택·추천 18 / 매장 10 / 마무리 5
// 화법: 3인칭 정보형. 1인칭(저는·제가) 0건. 허위체험 0. 광고단정 0.
//
// ⚠ PHOTO_SPOTS / FLOW_BIAS / CATEGORY_OVERRIDES / extraBlocks 는
//   STEP A 범위 아님 — STEP B에서 commercial 정합 예정 (현재 personal용 유지)
// ============================================================
export const WESTERN_COMMERCIAL_FLOW_ENGINE = {
  industry: 'western',
  mode: 'commercial',

  sections: [
    {
      key: 'menuIntro',
      label: '메뉴소개',
      order: 1,
      description: '이 메뉴가 어떤 음식인지 — 계열(국물/볶음/구이 등)·기본 정체성·어떤 사람이 찾는 메뉴인지. 방문 서사 아님, 메뉴 자체 소개. 1인칭 금지',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '음식 전체 상차림 또는 대표 메뉴 컷',
    },
    {
      key: 'menuScene',
      label: '메뉴장면(소비상황)',
      order: 2,
      description: '이 메뉴가 어울리는 소비 상황 — 추운 날 찾기 좋은 / 해장으로 / 혼밥으로 등. "갔다·먹었다" 1인칭 서사 금지. 메뉴와 상황의 결합만',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: '메뉴 클로즈업 (소비 상황 연상)',
    },
    {
      key: 'menuComposition',
      label: '메뉴구성',
      order: 3,
      description: '한 그릇/한 상의 구성 요소 — 들어가는 재료·비율·양 가늠·기본 구성. 관찰 가능한 사실 위주 (예: 머릿고기 비중 높은 구성)',
      required: true,
      minLength: 280,
      maxLength: 380,
      photo: '메뉴 구성 디테일 (재료·내용물)',
    },
    {
      key: 'tasteFeature',
      label: '맛특징(관찰형)',
      order: 4,
      description: "관찰 가능한 맛 특징만. '맛있다' 금지 → '맑은 국물 계열', '들깨 넣으면 고소함 강해지는 편', '간이 센 편/슴슴한 편' 등 선택에 도움되는 기술. 1인칭 체험 금지",
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '음식 표면·단면 디테일',
    },
    {
      key: 'pairing',
      label: '곁들임',
      order: 5,
      description: '함께 먹으면 좋은 구성 — 곁들임 반찬·추가 메뉴·조합(공깃밥·소주·사이드). 정보형. 강요·광고 표현 금지',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: '곁들임·반찬·조합 컷',
    },
    {
      key: 'decision',
      label: '선택포인트(Decision)',
      order: 6,
      description: '★신설. "이 메뉴는 이런 사람에게 맞고, 이런 경우엔 다른 선택이 낫다"는 판단 기준. 호불호 갈리는 지점·입맛별 가이드. 단정적 추천 아닌 선택 보조',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: null,
    },
    {
      key: 'recommendSituation',
      label: '추천상황',
      order: 7,
      description: '어떤 상황·목적에 이 메뉴가 맞는지 — 해장/혼밥/가족모임/술안주 등. 3인칭 정보형. "꼭 가보세요" 류 광고 종결 금지',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: null,
    },
    {
      key: 'storeFeature',
      label: '매장특징(보조한정)',
      order: 8,
      description: '메뉴 선택을 돕는 매장 정보까지만 — 위치·좌석·혼밥 가능·단체석·포장 여부. 매장이 주인공 되면 후기형 회귀이므로 보조 정보로 한정. 매장명 본문 노출 금지(placeholder)',
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '매장 좌석·외관 (보조)',
    },
  ],

  // 차단 키워드 — 기존 6섹션과 공유(의료·카페·광고 차단 유지)
  // ⚠ 1인칭 허위 체험 차단은 단어 단위가 아닌 STEP B Prompt에서 제어
  //   ('오늘'·'갔다' 단어 차단은 "오늘 많이 찾는 메뉴" 등 정상 문장 오탐 위험)
  blockKeywords: [
    ...WESTERN_FLOW_ENGINE.blockKeywords,
  ],

  // requiredKeywords 강제는 STEP B Prompt에서 자연 유도 (구조 강제 X)
  requiredKeywords: [],

  paragraphGuide: {
    minLinesPerParagraph: 2,
    maxLinesPerParagraph: 4,
    note: '메뉴 정보형 — 사진 사이 짧은 정보 문단. 서사형 긴 문단 지양',
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

// ═════════════════════════════════════════════════════════
// ★★ [Pilot] WESTERN_PURPOSE_FLOW_ENGINE — 목적 중심 4섹션
//   축: PURPOSE → PLACE EXPERIENCE → MENU(수단) → STORE INFO
//   ⚠ commercial(8섹션)·personal(6섹션) 무수정 보존 — mode='purpose'만 사용
//   ⚠ 최상위 원칙: 주인공 = '검색자의 방문 목적'. 메뉴는 목적 해결 수단.
//   화법: 검색자 상황에서 출발 → 왜 이 자리가 목적에 맞는지 → 메뉴는 선택 이유 → 업체 정보
//   비율(목표): 목적·상황 20 / 공간경험 40 / 메뉴(수단) 25 / 업체정보 15
// ═════════════════════════════════════════════════════════
export const WESTERN_PURPOSE_FLOW_ENGINE = {
  industry: 'western',
  mode: 'purpose',

  sections: [
    {
      key: 'purposeIntro',
      label: '목적·상황 도입',
      order: 1,
      description: '검색자의 상황에서 출발("데이트 장소를 찾고 있다면" 등). 그다음 왜 양식 레스토랑이 이 목적에 맞는지 다리를 놓는다. 메뉴 설명으로 시작 금지. 독자 조언·광고 금지, 상황 제시체.',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '레스토랑 외관·입구 (목적 연상)',
    },
    {
      key: 'placeExperience',
      label: '공간 경험',
      order: 2,
      description: '★핵심. 목적을 푸는 공간 경험 — 분위기·좌석·조명·간격·창가/예약석·모임 적합 이유. 이 자리가 왜 그 목적에 맞는지 장면으로. 메뉴 아님, 공간이 주인공.',
      required: true,
      minLength: 350,
      maxLength: 460,
      photo: '좌석·테이블·창가 분위기 컷',
    },
    {
      key: 'menuAsMeans',
      label: '메뉴(목적 해결 수단)',
      order: 3,
      description: '메뉴는 목적을 푸는 수단. 메뉴 자체 설명이 아니라 "이 목적엔 이렇게 구성해 고르면 좋다"는 선택 이유. 목적별 구성(나눔·코스·한 접시 완결 등) 중심. 메뉴명 나열·맛 단정 금지.',
      required: true,
      minLength: 280,
      maxLength: 380,
      photo: '목적에 맞는 메뉴 구성 컷',
    },
    {
      key: 'storeInfo',
      label: '업체 정보(보조)',
      order: 4,
      description: '목적 달성에 필요한 업체 정보까지만 — 위치·좌석 구성·예약/단체 가능·포장 등. 매장이 주인공 되면 후기형 회귀이므로 목적 보조 정보로 한정. 매장명 본문 노출 금지(placeholder).',
      required: true,
      minLength: 200,
      maxLength: 300,
      photo: '매장 좌석·외관 (보조)',
    },
  ],

  blockKeywords: [
    ...WESTERN_FLOW_ENGINE.blockKeywords,
  ],
  requiredKeywords: [],

  paragraphGuide: {
    minLinesPerParagraph: 2,
    maxLinesPerParagraph: 4,
    note: '목적 중심 — 상황·공간 경험 위주. 사진 사이 짧은 문단.',
  },

  seoPassScore: 85,
  minTotalLength: 1900,
};

// ─────────────────────────────────────────────────────────
// FLOW_BIAS — 상황별 섹션 비중 보정
// data.js의 SITUATION_OVERRIDES.flowBias 값과 매핑
//   - taste: 맛 묘사 비중↑ (해장 등 "국물 한 술" 중심 상황)
//   - scene: 분위기 묘사 비중↑ (비오는날·데이트·가족모임 등)
//   - arrive: 도착·1인석·동선 비중↑ (혼밥·야식 등)
// generateWestern.js에서 section.minLength·maxLength 보정에 사용
// ─────────────────────────────────────────────────────────
export const FLOW_BIAS_OVERRIDES = {
  taste: {
    taste:   { minLength: 380, maxLength: 480 },
    scene:   { minLength: 260, maxLength: 340 },
  },
  scene: {
    scene:   { minLength: 380, maxLength: 480 },
    taste:   { minLength: 260, maxLength: 340 },
  },
  arrive: {
    arrive:  { minLength: 320, maxLength: 420 },
    scene:   { minLength: 260, maxLength: 340 },
  },
};

// ─────────────────────────────────────────────────────────
// 카테고리별 섹션 커스터마이징 (cafe의 CAFE_CATEGORY_OVERRIDES 대응)
// cat 4계열 정의 (면·밥·고기·단품) — §3④ 계열별 taste 분리
// ─────────────────────────────────────────────────────────
export const WESTERN_CATEGORY_OVERRIDES = {
  // 면 — 파스타. taste는 면 식감·소스 농도 중심. 국물/밥 결 금지
  '면': {
    taste: {
      description: '면의 알덴테 식감·소스가 면에 밴 정도·토핑 식감 등 한 입의 체감. 국물 ritual·밥알 결 금지',
      minLength: 300,
      maxLength: 400,
    },
    order: {
      description: '메뉴 고르기 + 면 종류·소스 선택 + 곁들임(피클·빵) + 양 가늠 (숫자 가격 X)',
      minLength: 260,
      maxLength: 360,
    },
  },
  // 밥 — 리소토·필라프·오므라이스. taste는 밥알 결·소스 농도 중심
  '밥': {
    taste: {
      description: '밥알의 익힘 정도·크림/소스 농도·계란 부드러움 등 한 입의 체감. 면 결·튀김 결 금지',
      minLength: 300,
      maxLength: 400,
    },
    order: {
      description: '메뉴 고르기 + 밥 요리 구성·소스 선택 + 곁들임(수프·샐러드) + 양 가늠 (숫자 가격 X)',
      minLength: 260,
      maxLength: 360,
    },
  },
  // 고기 — 스테이크·함박·돈가스. taste는 굽기/육즙/튀김옷 중심. §3④ 일식 가츠동 결 금지
  '고기': {
    taste: {
      description: '굽기·육즙·튀김옷 바삭함 등 한 입의 체감. 나이프로 썬 단면·소스 풍미. 일식 가츠동/덮밥 결(쯔유·절임 생강) 금지',
      minLength: 300,
      maxLength: 400,
    },
    order: {
      description: '메뉴 고르기 + 고기 굽기/소스 선택 + 곁들임(감자·구운 채소·양배추) + 양 가늠 (숫자 가격 X)',
      minLength: 260,
      maxLength: 360,
    },
  },
  // 단품 — 피자. 나눠 먹는 결. taste는 도우·치즈·토핑 중심
  '단품': {
    taste: {
      description: '도우 식감·치즈 늘어남·토핑 조화 등 한 입의 체감. 여럿이 나눠 먹는 결',
      minLength: 300,
      maxLength: 400,
    },
    order: {
      description: '메뉴 고르기 + 도우·토핑 선택 + 곁들임(핫소스·피클) + 양·판 크기 가늠 (숫자 가격 X)',
      minLength: 260,
      maxLength: 360,
    },
  },
};

// ─────────────────────────────────────────────────────────
// 섹션 머지 헬퍼 — generateWestern.js에서 호출
// 기본 섹션 + 카테고리 오버라이드 + flowBias 오버라이드를 합쳐 반환
// ─────────────────────────────────────────────────────────
// mode: 'personal'(기본·기존 6섹션) | 'commercial'(신규 8섹션 메뉴 정보형)
// ⚠ 3번째 인자 옵셔널 — 기존 2-인자 호출부는 personal로 동작(영향 없음)
export function getWesternSections(category, flowBias, mode) {
  // ★ [Pilot] purpose 모드 — 목적 중심 4섹션 (commercial/personal 무영향)
  if (mode === 'purpose') {
    return WESTERN_PURPOSE_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  // [v2] commercial 모드 — 8섹션 메뉴 중심 정보형
  // STEP A 범위: 섹션 정의만 반환. CATEGORY/FLOW_BIAS 오버라이드는
  // personal(6섹션) 키 기준이므로 commercial에는 미적용(STEP B에서 정합)
  if (mode === 'commercial') {
    return WESTERN_COMMERCIAL_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  // personal 모드 (기존 동작 — 무변경)
  const base = WESTERN_FLOW_ENGINE.sections;
  const catOvr = WESTERN_CATEGORY_OVERRIDES[category] || {};
  const biasOvr = (flowBias && FLOW_BIAS_OVERRIDES[flowBias]) || {};

  return base.map(sec => {
    const c = catOvr[sec.key] || {};
    const b = biasOvr[sec.key] || {};
    // 우선순위: base ← category ← flowBias (flowBias가 최우선)
    return { ...sec, ...c, ...b };
  });
}

// ─────────────────────────────────────────────────────────
// 사진 alt 헬퍼 — 섹션별 사진 주제 반환
// generateWestern.js의 getImageAlts에서 활용
// ─────────────────────────────────────────────────────────
export function getPhotoSpotForSection(sectionKey) {
  return WESTERN_PHOTO_SPOTS[sectionKey] || null;
}
