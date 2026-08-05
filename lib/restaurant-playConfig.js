// ============================================================
// lib/restaurant-playConfig.js — 맛집 FLOW_ENGINE 구조 (완전 독립)
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
// generateRestaurant.js의 getImageAlts와 짝을 이룸
// ─────────────────────────────────────────────────────────
export const RESTAURANT_PHOTO_SPOTS = {
  visit:   null,  // 사진 없음 (도입 텍스트)
  arrive:  '외관·간판·입구 동선',
  order:   '메뉴판·상차림 세팅·반찬 구성',
  taste:   '음식 클로즈업 (국물·면·고기 표면 디테일)',
  scene:   '테이블 분위기·창가·옆자리 흐름·식사 중 풍경',
  revisit: '식당 마무리 컷 (계산대·출구·간판)',
};

// ─────────────────────────────────────────────────────────
// RESTAURANT_FLOW_ENGINE — 6섹션 구조
// 섹션 키 6개: visit · arrive · order · taste · scene · revisit
// generateRestaurant.js의 writtenSections·prompt 빌더와 반드시 일치
// ─────────────────────────────────────────────────────────
export const RESTAURANT_FLOW_ENGINE = {
  industry: 'restaurant',

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

  // 차단 키워드 (restaurant-data.js의 RESTAURANT_BLOCK_MAP과 일치)
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
    // 광고 표현 차단 (Phase 9.5 핵심 — 브랜드 홍보 톤 차단)
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
    // 유치원·낚시 표현 차단
    '교실', '선생님', '원생', '낚싯대', '포인트', '조과',
  ],

  // 필수 키워드 (최소 1개 포함)
  requiredKeywords: [
    '국물', '맛', '식감', '한 그릇', '한 술', '한 입',
    '식당', '가게', '메뉴', '재방문',
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
  // generateRestaurant.js의 injectMealValue()에서 사용
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

  // 맛집 전용 추가 블럭 (generateRestaurant.js에서 주입)
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
// [v3 / 2026-06-26] RESTAURANT_COMMERCIAL_FLOW_ENGINE — 8섹션 방문목적 중심 정보형
// ⚠ 기존 RESTAURANT_FLOW_ENGINE(6섹션 personal)은 무수정 보존 — 롤백 안전
// ⚠ mode='commercial' 일 때만 이 섹션셋 사용. personal 호출은 영향 없음
// ⚠ 섹션 개수(8)·key 무변경. minLength/maxLength 재배분만 (generate 호환)
//
// 최상위 원칙: 주인공 = '손님'(방문 상황·주문 행동). 사용자 최종 질문 = "내 상황에 맞는 주문인가?"
// [V2 세션52] 8섹션 Scene 구조 — 병원 V2 동형. decisionAxis=orderDecision(주문 판단 기준).
//   ①방문상황 ②주문시작 ③주문판단기준(축★) ④대표조합(결과) ⑤추가주문
//   ⑥어떤사람에게 ⑦방문팁·흐름 ⑧매장안내(보조)
//   판단(③) → 결과(④) 관계 = 병원 V2 "왜 판단 필요 → 무엇을 선택" 동형.
// 속성 3섹션(③④⑤)의 주제를 '메뉴속성' → '주문행동'으로 전환(백과사전화 진원지 제거).
// 비율(목표): 손님 상황·행동 해결 ~75 / 메뉴 정보(근거로만) ~25 / 매장 보조.
// 화법: 3인칭 정보형(독자 질문체 허용). 1인칭(저는·제가) 0건. 허위체험 0. 광고단정 0.
//
// ⚠ PHOTO_SPOTS / FLOW_BIAS / CATEGORY_OVERRIDES / extraBlocks 는
//   STEP A 범위 아님 — STEP B에서 commercial 정합 예정 (현재 personal용 유지)
// ============================================================
export const RESTAURANT_COMMERCIAL_FLOW_ENGINE = {
  industry: 'restaurant',
  mode: 'commercial',

  // ============================================================
  // [V2 / 2026-07-15 세션52] Scene 중심 구조 — 손님 주인공 (병원 V2 동형)
  // decisionAxis = orderDecision(주문 판단 기준). 판단(섹션3) → 결과(섹션4) 관계.
  // ⚠ key 8개·순서 무변경(generate.js key 루프 호환). label/description/minLength만 재정의.
  // ⚠ 속성 3섹션(menuComposition·tasteFeature·pairing) = 주제를 '메뉴속성' → '주문행동'으로 전환.
  //   세션51 확정 원인: 주제가 메뉴속성이면 GPT가 설명 모드로 회귀(백과사전화). 주제=상황/행동이면 통과.
  //   → V2는 셋 다 손님 주문 행동으로 재정의. 맛 정보는 조합의 근거 1줄로만(독립 문단 금지).
  // Spine: 방문상황 → 주문시작 → 주문판단기준(축) → 대표조합(결과) → 추가주문 → 어떤사람에게 → 방문팁 → 매장
  // ============================================================
  sections: [
    {
      key: 'menuIntro',
      label: '방문 상황',
      order: 1,
      description: '[V2] 검색자의 끼니/자리 상황으로 연다 — "혼자 한 끼", "부모님 모시고", "회식 자리" 등. 메뉴 정체성·정의 설명 금지. 상황이 주어, 메뉴는 문단 두 번째 등장(다리 1줄). key=menuIntro 유지',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '음식 전체 상차림 또는 대표 메뉴 컷',
    },
    {
      key: 'menuScene',
      label: '주문 시작',
      order: 2,
      description: '[V2] 자리 잡고 무엇을 시킬지 고민하는 장면 — 메뉴판 보며 정하는 손님 시점. "갔다·먹었다" 1인칭 금지. 상황과 주문 고민의 연결. 메뉴 속성 설명 아님',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: '메뉴판·주문 고민 장면',
    },
    {
      key: 'menuComposition',
      label: '주문 판단 기준 (★orderDecision)',
      order: 3,
      description: '[V2 축·판단] 무엇을 기준으로 주문을 정하는가 — 양·취향·식사 목적·동행을 종합해 어떤 주문이 적합한지 "판단"하는 축. 아직 결정 결과 아님(그건 섹션4). 재료·구성 나열 금지. 손님이 주어',
      required: true,
      minLength: 280,
      maxLength: 380,
      photo: '주문 고민·메뉴 비교 컷',
    },
    {
      key: 'tasteFeature',
      label: '대표 주문 조합 (결과)',
      order: 4,
      description: '[V2 결과] 섹션3 판단의 결과 — 그 상황에서 가장 많이 나가는 대표 주문 조합. "혼자면 A 한 그릇, 둘이면 B 추가" 식 조합 행동. 맛(tasteCore)은 "왜 그 조합인지" 근거 1줄로만. 요소별 맛 나열 금지',
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '대표 조합 상차림 컷',
    },
    {
      key: 'pairing',
      label: '추가·사이드 주문',
      order: 5,
      description: '[V2] 대표 조합에 곁들여 더 시키는 행동 — 공깃밥·사이드·곁들임을 "같이 주문하는 행동"으로. 곁들임 하나하나의 맛 설명 금지(백과사전 회귀). 광고 표현 금지',
      required: true,
      minLength: 180,
      maxLength: 240,
      photo: '곁들임·사이드 컷',
    },
    {
      key: 'decision',
      label: '어떤 사람에게 맞나',
      order: 6,
      description: '[V2 핵심] 어떤 사람·상황이면 이 선택이 맞고 어떤 경우엔 다른 선택인지 — 양 가늠·혼자/나눔·식사용/안주용을 판단 재료로. 단정 추천 아닌 선택 보조. 손님 기준',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: null,
    },
    {
      key: 'recommendSituation',
      label: '방문 팁·식사 흐름',
      order: 7,
      description: '[V2] 방문 시 알아둘 팁과 식사 흐름 — 시간대·회전·페이스·웨이팅·포장 등 손님 방문 실용 정보. 어떤 방문 상황에 맞는지 정리. 3인칭 정보형. "꼭 가보세요" 광고 종결 금지',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: null,
    },
    {
      key: 'storeFeature',
      label: '매장 안내 (보조)',
      order: 8,
      description: '[V2] 방문 목적 해결에 필요한 매장 정보까지만 — 위치·좌석·혼밥 가능·단체석·포장. 매장이 주인공 되면 후기형 회귀이므로 보조로 한정. 매장명 본문 노출 금지(placeholder)',
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
    ...RESTAURANT_FLOW_ENGINE.blockKeywords,
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

// ─────────────────────────────────────────────────────────
// FLOW_BIAS — 상황별 섹션 비중 보정
// data.js의 SITUATION_OVERRIDES.flowBias 값과 매핑
//   - taste: 맛 묘사 비중↑ (해장 등 "국물 한 술" 중심 상황)
//   - scene: 분위기 묘사 비중↑ (비오는날·데이트·가족모임 등)
//   - arrive: 도착·1인석·동선 비중↑ (혼밥·야식 등)
// generateRestaurant.js에서 section.minLength·maxLength 보정에 사용
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
// 1단계: 한식만 정의. 검증 후 중식·일식·양식 추가
// ─────────────────────────────────────────────────────────
export const RESTAURANT_CATEGORY_OVERRIDES = {
  '한식': {
    // 한식 국물요리 — taste 섹션의 국물·온도·식감 묘사 강화
    taste: {
      description: '국물 농도·온도·향·고기 식감·반찬과의 조합. 첫 술 → 두세 술 → 비워질 즈음 흐름',
      minLength: 320,
      maxLength: 420,
    },
    order: {
      description: '메뉴 고르기 + 기본 반찬 가짓수·리필 여부 + 공깃밥 별도 여부 (숫자 가격 X)',
      minLength: 270,
      maxLength: 370,
    },
  },
  '분식': {
    // 분식 — 국물 ritual 금지. 메뉴 소개·식감·포장 안내 중심
    taste: {
      description: '메뉴별 식감·양념·매운 정도·온도. 떡의 쫄깃함·튀김 바삭함·국물의 따뜻함 등 한 입의 체감. 국물요리 ritual(뚝배기·뽀얀 국물) 금지',
      minLength: 280,
      maxLength: 380,
    },
    order: {
      description: '메뉴 고르기 + 포장 가능 여부 + 곁들임(단무지·어묵국물) + 양 가늠 (숫자 가격 X)',
      minLength: 250,
      maxLength: 350,
    },
    arrive: {
      description: '지역 동선(역·도보), 매장 외관·간판, 포장 손님과 매장 손님 동선, 대기 정도',
      minLength: 230,
      maxLength: 330,
    },
  },
  // 1단계 검증 후 추가:
  // '중식': { ... },
  // '일식': { ... },
  // '양식': {
  //   scene: { description: '데이트 분위기·조명·음악·테이블 간격 강화', minLength: 350, maxLength: 450 },
  // },
};

// ─────────────────────────────────────────────────────────
// 섹션 머지 헬퍼 — generateRestaurant.js에서 호출
// 기본 섹션 + 카테고리 오버라이드 + flowBias 오버라이드를 합쳐 반환
// ─────────────────────────────────────────────────────────
// mode: 'personal'(기본·기존 6섹션) | 'commercial'(신규 8섹션 메뉴 정보형)
// ⚠ 3번째 인자 옵셔널 — 기존 2-인자 호출부는 personal로 동작(영향 없음)
export function getRestaurantSections(category, flowBias, mode) {
  // [v2] commercial 모드 — 8섹션 메뉴 중심 정보형
  // STEP A 범위: 섹션 정의만 반환. CATEGORY/FLOW_BIAS 오버라이드는
  // personal(6섹션) 키 기준이므로 commercial에는 미적용(STEP B에서 정합)
  if (mode === 'commercial') {
    return RESTAURANT_COMMERCIAL_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  // personal 모드 (기존 동작 — 무변경)
  const base = RESTAURANT_FLOW_ENGINE.sections;
  const catOvr = RESTAURANT_CATEGORY_OVERRIDES[category] || {};
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
// generateRestaurant.js의 getImageAlts에서 활용
// ─────────────────────────────────────────────────────────
export function getPhotoSpotForSection(sectionKey) {
  return RESTAURANT_PHOTO_SPOTS[sectionKey] || null;
}
