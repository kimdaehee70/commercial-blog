// ============================================================
// lib/meat-playConfig.js — 고깃집 FLOW_ENGINE 구조 (완전 독립)
// ⚠ clinic·dental·oriental 등 의료 playConfig 참조 금지
// ⚠ cafe playConfig와도 분리 — cafe(체류 중심) ≠ restaurant(맛 중심)
// ============================================================
//
// 고깃집 6섹션 = "방문계기 → 도착 → 주문 → 굽기·맛 → 장면 → 재방문"
//   cafe의 stay(체류) 자리를 meat은 scene(불판·연기·쌈 장면)으로 대체
//   cafe의 experience 자리를 meat은 taste(굽기·육즙)로 분리
//
// 작업 기준: Phase9_완료_Phase9_5_인계메모_v2_0 / 카페업종_인계메모 v1.4

// ─────────────────────────────────────────────────────────
// 사진 유도 포인트 — 섹션별 photo prompt
// generateMeat.js의 getImageAlts와 짝을 이룸
// ─────────────────────────────────────────────────────────
export const MEAT_PHOTO_SPOTS = {
  visit:   null,  // 사진 없음 (도입 텍스트)
  arrive:  '외관·간판·입구 동선',
  order:   '메뉴판·쌈채소·기본찬 세팅',
  taste:   '고기 클로즈업 (불판 위 굽는 면·단면 디테일)',
  scene:   '테이블 분위기·창가·옆자리 흐름·식사 중 풍경',
  revisit: '식당 마무리 컷 (계산대·출구·간판)',
};

// ─────────────────────────────────────────────────────────
// MEAT_FLOW_ENGINE — 6섹션 구조
// 섹션 키 6개: visit · arrive · order · taste · scene · revisit
// generateMeat.js의 writtenSections·prompt 빌더와 반드시 일치
// ─────────────────────────────────────────────────────────
export const MEAT_FLOW_ENGINE = {
  industry: 'meat',

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
      description: '굽기·식감·육즙·불향 등 핵심 맛 묘사. 올림 → 뒤집기 → 한 점 → 쌈. 정보 나열 금지, 한 점의 체감 중심',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '고기 클로즈업 (불판 위 굽는 면·단면 디테일)',
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

  // 차단 키워드 (meat-data.js의 MEAT_BLOCK_MAP과 일치)
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
    // 국물요리 어휘 차단 (restaurant 국물 엔진과 분리)
    '뚝배기', '뽀얀 국물', '들깨가루', '새우젓', '우거지',
    // 광고 표현 차단 (Phase 9.5 핵심 — 브랜드 홍보 톤 차단)
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
    // 유치원·낚시 표현 차단
    '교실', '선생님', '원생', '낚싯대', '포인트', '조과',
  ],

  // 필수 키워드 (최소 1개 포함)
  requiredKeywords: [
    '고기', '맛', '식감', '한 점', '불판', '쌈',
    '고깃집', '가게', '메뉴', '재방문',
  ],

  // 식사 시간 흐름 (cafe의 stayTimeline 대응)
  // scene 섹션에서 사용
  sceneTimeline: {
    'arrival':   '자리 잡음 — 동행과 자리 정하고 앉음, 메뉴판 확인',
    'serving':   '상차림 — 쌈채소·기본찬 깔리고 고기 나옴, 불판 달궈지는 순간',
    'eating':    '식사 중 — 굽고 뒤집고 한 점씩 흐름, 동행과 대화·반응, 옆자리 불판 풍경',
    'finishing': '마무리 — 그릇 비워가는 즈음, 후식·물·계산 전 분위기',
  },

  // VISIT_VALUES → MEAL_VALUES (맛집판 운영 정보)
  // generateMeat.js의 injectMealValue()에서 사용
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

  // 맛집 전용 추가 블럭 (generateMeat.js에서 주입)
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
// [v3 / 2026-06-26] MEAT_COMMERCIAL_FLOW_ENGINE — 8섹션 방문목적 중심 정보형
// ⚠ 기존 MEAT_FLOW_ENGINE(6섹션 personal)은 무수정 보존 — 롤백 안전
// ⚠ mode='commercial' 일 때만 이 섹션셋 사용. personal 호출은 영향 없음
// ⚠ 섹션 개수(8)·key 무변경. minLength/maxLength 재배분만 (generate 호환)
//
// 최상위 원칙: 주인공 = '방문 목적', 사용자 최종 질문 = "내 상황에 맞는 식당/메뉴인가?"
// 8섹션: ①상황공감(도입) ②목적-메뉴연결 ③메뉴구성(축소) ④맛특징(축소) ⑤곁들임
//        ⑥선택가이드(Decision★) ⑦추천상황(확대) ⑧매장특징(보조한정)
// 비율(목표): 방문목적 해결 70 (intro+scene+decision+recommend) / 메뉴 설명 30 (composition+taste+pairing) / 매장 보조
// 화법: 3인칭 정보형(독자 질문체 허용). 1인칭(저는·제가) 0건. 허위체험 0. 광고단정 0.
//
// ⚠ PHOTO_SPOTS / FLOW_BIAS / CATEGORY_OVERRIDES / extraBlocks 는
//   STEP A 범위 아님 — STEP B에서 commercial 정합 예정 (현재 personal용 유지)
// ============================================================
export const MEAT_COMMERCIAL_FLOW_ENGINE = {
  industry: 'meat',
  mode: 'commercial',

  sections: [
    {
      key: 'menuIntro',
      label: '상황공감(도입)',
      order: 1,
      description: '[v3 재정의] 검색자의 방문 상황 공감으로 시작 — "부모님과 식사할 곳 찾으세요?" 류 상황 질문. 메뉴 정체성 설명 금지. 끝에 메뉴로 잇는 다리 1줄. key는 menuIntro 유지(generate 호환)',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '음식 전체 상차림 또는 대표 메뉴 컷',
    },
    {
      key: 'menuScene',
      label: '메뉴장면(소비상황)',
      order: 2,
      description: '[v3] 방문 목적과 메뉴의 연결 — 혼밥이면 빠른 한 끼, 회식이면 나눠먹기 등. "갔다·먹었다" 1인칭 금지. 상황-메뉴 결합 안내',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: '메뉴 클로즈업 (소비 상황 연상)',
    },
    {
      key: 'menuComposition',
      label: '메뉴구성',
      order: 3,
      description: '[v3 축소] 한 그릇/한 상의 기본 구성만 간략히 — 재료·양 가늠. 관찰 사실 위주. 메뉴 설명 총량 30% 이하 유지',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: '메뉴 구성 디테일 (재료·내용물)',
    },
    {
      key: 'tasteFeature',
      label: '맛특징(관찰형)',
      order: 4,
      description: "[v3 축소] 관찰 가능한 맛 특징만 간결하게. '맛있다' 금지 → '기름진 편', '담백한 편' 등 선택 도움. 메뉴 설명 총량 30% 이하 유지",
      required: true,
      minLength: 200,
      maxLength: 280,
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
      description: '[v3 핵심·확대] 방문 목적별 선택 가이드 — "어떤 상황·목적이면 이 메뉴, 어떤 경우엔 다른 선택". 호불호·입맛 기준 포함. 단정 추천 아닌 선택 보조',
      required: true,
      minLength: 320,
      maxLength: 420,
      photo: null,
    },
    {
      key: 'recommendSituation',
      label: '추천상황',
      order: 7,
      description: '[v3 확대] 어떤 방문 목적·상황에 이 메뉴가 맞는지 — 혼밥/해장/가족 외식/회식/부모님 식사/직장인 점심 등. 3인칭 정보형. "꼭 가보세요" 류 광고 종결 금지',
      required: true,
      minLength: 240,
      maxLength: 320,
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
    ...MEAT_FLOW_ENGINE.blockKeywords,
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
//   - taste: 맛 묘사 비중↑ (한잔 등 "굽기·육즙" 중심 상황)
//   - scene: 분위기 묘사 비중↑ (비오는날·데이트·가족모임 등)
//   - arrive: 도착·1인석·동선 비중↑ (혼밥·야식 등)
// generateMeat.js에서 section.minLength·maxLength 보정에 사용
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
// 1단계: 고깃집만 정의.
// ⚠ 국물 ritual(뚝배기·뽀얀 국물) 금지 — 불판·굽기·쌈·연기 결.
// ─────────────────────────────────────────────────────────
export const MEAT_CATEGORY_OVERRIDES = {
  '고깃집': {
    // 고깃집 구이 — taste 섹션의 굽기·육즙·불향·쌈 조합 묘사 강화
    taste: {
      description: '굽는 과정·육즙·불향·식감·쌈과의 조합. 올림 → 뒤집기 → 한 점 → 쌈에 싸기 흐름. 국물 ritual 금지',
      minLength: 320,
      maxLength: 420,
    },
    order: {
      description: '메뉴(부위) 고르기 + 쌈채소·기본찬 구성 + 불판 세팅·1인분 양 가늠 (숫자 가격 X)',
      minLength: 270,
      maxLength: 370,
    },
    scene: {
      description: '불판 위 연기·익는 소리, 굽고 나눠 먹는 테이블 흐름, 잔 곁들이는 동행 반응',
      minLength: 320,
      maxLength: 420,
    },
  },
};

// ─────────────────────────────────────────────────────────
// 섹션 머지 헬퍼 — generateMeat.js에서 호출
// 기본 섹션 + 카테고리 오버라이드 + flowBias 오버라이드를 합쳐 반환
// ─────────────────────────────────────────────────────────
// mode: 'personal'(기본·기존 6섹션) | 'commercial'(신규 8섹션 메뉴 정보형)
// ⚠ 3번째 인자 옵셔널 — 기존 2-인자 호출부는 personal로 동작(영향 없음)
export function getMeatSections(category, flowBias, mode) {
  // [v2] commercial 모드 — 8섹션 메뉴 중심 정보형
  // STEP A 범위: 섹션 정의만 반환. CATEGORY/FLOW_BIAS 오버라이드는
  // personal(6섹션) 키 기준이므로 commercial에는 미적용(STEP B에서 정합)
  if (mode === 'commercial') {
    return MEAT_COMMERCIAL_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  // personal 모드 (기존 동작 — 무변경)
  const base = MEAT_FLOW_ENGINE.sections;
  const catOvr = MEAT_CATEGORY_OVERRIDES[category] || {};
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
// generateMeat.js의 getImageAlts에서 활용
// ─────────────────────────────────────────────────────────
export function getPhotoSpotForSection(sectionKey) {
  return MEAT_PHOTO_SPOTS[sectionKey] || null;
}
