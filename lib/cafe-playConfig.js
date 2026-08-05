// ============================================================
// lib/cafe-playConfig.js — 카페 FLOW_ENGINE 구조 (외식 엔진 통일 — restaurant 복사 베이스)
// ⚠ clinic·dental·oriental 등 의료 playConfig 참조 금지
// ⚠ 섹션 키 = restaurant와 동일 통일 (visit·arrive·order·taste·scene·revisit)
//   외식 엔진 통일 (2026-06-28): 기존 cafe 6섹션(approach/experience/stay) 폐기
//   → restaurant 6섹션(arrive/taste/scene)으로 통일
// ============================================================
//
// 카페 6섹션 = "방문계기 → 도착 → 주문 → 맛 → 장면 → 재방문"
//   - taste = 음료·디저트 맛 자체 (산미·바디감·당도·식감)
//   - scene = 그 자리에 머무는 장면 (체류·대화·노트북·창가·동행 반응)
//   ★ 카페는 scene(체류 장면) 비중이 음식점보다 큼 — PHILOSOPHY scene=체류시간

// ─────────────────────────────────────────────────────────
// 사진 유도 포인트 — 섹션별 photo prompt
// ─────────────────────────────────────────────────────────
export const CAFE_PHOTO_SPOTS = {
  visit:   null,  // 사진 없음 (도입 텍스트)
  arrive:  '외관·간판·입구 동선',
  order:   '메뉴판·음료/디저트 픽업·세팅',
  taste:   '음료·디저트 클로즈업 (라떼아트·단면·플레이팅 디테일)',
  scene:   '좌석 분위기·창가·콘센트 자리·체류 중 풍경',
  revisit: '카페 마무리 컷 (퇴장 동선·창밖·간판)',
};

// ─────────────────────────────────────────────────────────
// CAFE_FLOW_ENGINE — 6섹션 구조 (personal)
// 섹션 키 6개: visit · arrive · order · taste · scene · revisit
// generateCafe.js의 prompt 빌더와 반드시 일치
// ─────────────────────────────────────────────────────────
export const CAFE_FLOW_ENGINE = {
  industry: 'cafe',

  sections: [
    {
      key: 'visit',
      label: '방문계기',
      order: 1,
      description: '왜 이 메뉴를 / 왜 지금 / 왜 이 카페인지 (상황·목적 결합 동기)',
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
      label: '주문·픽업',
      order: 3,
      description: '메뉴 고르기 + 음료·디저트 페어링 + 카운터 응대·픽업 (가격 X)',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '메뉴판·음료/디저트 픽업·세팅',
    },
    {
      key: 'taste',
      label: '맛·식감',
      order: 4,
      description: '음료의 산미·바디감·온도, 디저트의 당도·식감 등 핵심 맛 묘사. 첫 모금/한 입 → 식감 → 향. 정보 나열 금지, 한 모금의 체감 중심',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '음료·디저트 클로즈업 (라떼아트·단면·플레이팅 디테일)',
    },
    {
      key: 'scene',
      label: '장면·체류',
      order: 5,
      description: '좌석 분위기·콘센트·테이블 간격·시간대·동행 반응·창밖 풍경 등 "그 자리에 머무는 장면". 음식점 scene보다 체류 비중 큼',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '좌석 분위기·창가·콘센트 자리·체류 중 풍경',
    },
    {
      key: 'revisit',
      label: '재방문·추천',
      order: 6,
      description: '재방문 의사 + 어떤 상황·목적에 추천하는지 (작업/데이트/대화/혼자/모임 등)',
      required: true,
      minLength: 200,
      maxLength: 250,
      photo: '카페 마무리 컷 (퇴장 동선·창밖·간판)',
    },
  ],

  // 차단 키워드 (cafe-data.js의 CAFE_BLOCK_MAP과 일치)
  blockKeywords: [
    // 의료 침투 방지
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '원장님', '의사', '간호사', '병원', '회차', '경과', '붓기',
    // 음식점 어휘 차단 (restaurant와 분리)
    '식당', '주방장', '셰프', '코스 요리', '룸', '회식',
    '국밥', '순대국', '떡볶이', '뚝배기', '공깃밥',
    // 학습 어휘 차단 (작업카페 안전핀)
    '스터디카페', '독서실', '공부하기 좋은', '집중하기 좋은',
    '조용히 집중', '학습', '시험 공부', '인강',
    // 광고 표현 차단 (브랜드 홍보 톤 차단)
    '찐맛집', '강추', '강력 추천', '인생 카페', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '숨은 카페', '숨겨진 명소',
    '분위기 맛집', '인생샷',
    // 유치원·낚시 표현 차단
    '교실', '선생님', '원생', '낚싯대', '포인트', '조과',
  ],

  // 필수 키워드 (최소 1개 포함)
  requiredKeywords: [
    '카페', '커피', '음료', '메뉴', '디저트', '좌석',
    '분위기', '한 잔', '한 모금', '재방문', '머물',
  ],

  // 체류 시간 흐름 (restaurant의 sceneTimeline 대응 — 카페 톤)
  // scene 섹션에서 사용
  sceneTimeline: {
    'arrival':   '자리 잡음 — 동행과 자리 정하고 앉음, 메뉴판 확인, 콘센트·좌석 둘러봄',
    'serving':   '픽업 — 진동벨 또는 서빙, 음료·디저트 받아 자리로, 첫 세팅',
    'staying':   '체류 중 — 한 모금씩 마시며 대화·노트북·폰, 음악·온도 체감, 옆자리 풍경',
    'finishing': '마무리 — 잔 비워가는 즈음, 정리·퇴장 전 분위기, 다 마시고 난 인상',
  },

  // MEAL_VALUES → CAFE_VALUES (카페판 운영 정보)
  // generateCafe.js의 injectCafeValue()에서 사용
  // 9개 중 최소 5개 본문 강제 주입 (★ 가격 노출 금지 — priceRange 제외)
  cafeValueFields: [
    'waitingMinutes',   // 평일/주말 웨이팅 분 단위
    'seatCount',        // 좌석수·1인석/2인석/단체석
    'businessHours',    // 영업시간 + 라스트오더
    'powerOutlet',      // 콘센트 유무 (작업 필수)
    'parking',          // 주차 가능 여부 / 발렛 / 인근 주차장
    'restroom',         // 화장실 위치 (내부/외부)
    'tableSpacing',     // 테이블 간격 (좁음/적당/여유)
    'timeLimit',        // 체류 제한 여부
    'paymentType',      // 카드 / 키오스크 / 모바일
  ],
  cafeValueMinCount: 5,

  // 카페 전용 추가 블럭 (generateCafe.js에서 주입)
  extraBlocks: [
    'WAITING_BLOCKS',     // 웨이팅 정보
    'PAIRING_BLOCKS',     // 음료·디저트 페어링
    'BEST_TIME',          // 방문 추천 시간대
    'PHOTO_SPOTS',        // 사진 잘 나오는 자리
    'SEAT_TYPE',          // 좌석 유형 (1인석·창가·단체석)
    'CUSTOMER_TYPE',      // 주 방문층
    'MUSIC_VIBE',         // 음악·조명 분위기
  ],

  // 문단 길이 가이드
  paragraphGuide: {
    minLinesPerParagraph: 2,
    maxLinesPerParagraph: 4,
    note: '네이버 카페판은 사진 사이 짧은 문단이 상단 유지력 핵심',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

// ============================================================
// CAFE_COMMERCIAL_FLOW_ENGINE — 8섹션 방문목적 중심 정보형
// ⚠ restaurant COMMERCIAL과 동일 구조 (외식 엔진 통일) — 카페 톤으로 라벨/설명만 조정
// ⚠ 섹션 개수(8)·key 무변경. generate가 key로 돌므로 이름 변경 금지.
//
// 최상위 원칙: 주인공 = '방문 목적', 사용자 최종 질문 = "내 상황에 맞는 카페/메뉴인가?"
// 8섹션: ①상황공감(도입) ②목적-메뉴연결 ③메뉴구성(축소) ④맛특징(축소) ⑤페어링
//        ⑥선택가이드(Decision★) ⑦추천상황(확대) ⑧매장특징(보조한정)
// 화법: 3인칭 정보형(독자 질문체 허용). 1인칭(저는·제가·갔다·마셔봤) 0건. 허위체험 0. 광고단정 0.
// ============================================================
export const CAFE_COMMERCIAL_FLOW_ENGINE = {
  industry: 'cafe',
  mode: 'commercial',

  sections: [
    {
      key: 'menuIntro',
      label: '상황공감(도입)',
      order: 1,
      description: '[v3] 검색자의 방문 상황 공감으로 시작 — "작업할 카페 찾으세요?" 류 상황 질문. 메뉴 정체성 설명 금지. 끝에 메뉴로 잇는 다리 1줄. key는 menuIntro 유지(generate 호환)',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '음료·디저트 전체 또는 대표 메뉴 컷',
    },
    {
      key: 'menuScene',
      label: '메뉴장면(소비상황)',
      order: 2,
      description: '[v3] 방문 목적과 메뉴의 연결 — 작업이면 오래 마실 한 잔, 모임이면 나눠 먹을 디저트 등. "갔다·마셨다" 1인칭 금지. 상황-메뉴 결합 안내',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: '메뉴 클로즈업 (소비 상황 연상)',
    },
    {
      key: 'menuComposition',
      label: '메뉴구성',
      order: 3,
      description: '[v3 축소] 한 잔/한 조각/한 접시의 기본 구성만 간략히 — 재료·양 가늠. 관찰 사실 위주. 메뉴 설명 총량 30% 이하 유지',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: '메뉴 구성 디테일 (재료·내용물)',
    },
    {
      key: 'tasteFeature',
      label: '맛특징(관찰형)',
      order: 4,
      description: "[v3 축소] 관찰 가능한 맛 특징만 간결하게. '맛있다' 금지 → '산미 있는 편', '부드러운 계열' 등 선택 도움. 메뉴 설명 총량 30% 이하 유지",
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '음료·디저트 표면·단면 디테일',
    },
    {
      key: 'pairing',
      label: '페어링',
      order: 5,
      description: '함께 즐기면 좋은 구성 — 음료↔디저트 페어링·추가 메뉴. 정보형. 강요·광고 표현 금지',
      required: true,
      minLength: 180,
      maxLength: 260,
      photo: '페어링·세트 컷',
    },
    {
      key: 'decision',
      label: '선택포인트(Decision)',
      order: 6,
      description: '[v3 핵심·확대] 방문 목적별 선택 가이드 — "어떤 상황·목적이면 이 메뉴, 어떤 경우엔 다른 선택". 호불호·취향 기준 포함. 단정 추천 아닌 선택 보조',
      required: true,
      minLength: 320,
      maxLength: 420,
      photo: null,
    },
    {
      key: 'recommendSituation',
      label: '추천상황',
      order: 7,
      description: '[v3 확대] 어떤 방문 목적·상황에 이 메뉴/카페가 맞는지 — 작업/데이트/대화/혼자/모임/야경 등. 3인칭 정보형. "꼭 가보세요" 류 광고 종결 금지',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: null,
    },
    {
      key: 'storeFeature',
      label: '매장특징(보조한정)',
      order: 8,
      description: '메뉴 선택을 돕는 매장 정보까지만 — 위치·좌석·콘센트·단체석·반려견 동반·루프탑 여부. 매장이 주인공 되면 후기형 회귀이므로 보조 정보로 한정. 매장명 본문 노출 금지(placeholder)',
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '매장 좌석·외관 (보조)',
    },
  ],

  blockKeywords: [
    ...CAFE_FLOW_ENGINE.blockKeywords,
  ],
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
//   - taste: 맛 묘사 비중↑
//   - scene: 체류·분위기 묘사 비중↑ (작업·수다·혼카페·늦은밤 등)
//   - order: 주문·픽업 비중↑ (더운 날 등)
//   - experience: scene 강화 별칭 (data flowBias='experience' 대응)
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
  // data SITUATION_OVERRIDES가 'stay'/'experience' flowBias를 쓰므로 scene으로 흡수
  stay: {
    scene:   { minLength: 380, maxLength: 480 },
    taste:   { minLength: 260, maxLength: 340 },
  },
  experience: {
    scene:   { minLength: 360, maxLength: 460 },
    taste:   { minLength: 280, maxLength: 360 },
  },
  order: {
    order:   { minLength: 300, maxLength: 400 },
    scene:   { minLength: 280, maxLength: 360 },
  },
};

// ─────────────────────────────────────────────────────────
// 카테고리별 섹션 커스터마이징 (계열: 커피·디저트·브런치)
// ─────────────────────────────────────────────────────────
export const CAFE_CATEGORY_OVERRIDES = {
  '커피': {
    // 커피 — taste(맛)와 scene(체류) 균형, 작업·체류 결
    taste: {
      description: '산미·바디감·온도·끝맛 묘사. 첫 모금 → 두세 모금 → 식어갈 즈음 흐름. 원두 향 한 줄',
      minLength: 300,
      maxLength: 400,
    },
    scene: {
      description: '한 잔 시켜두고 머무는 장면 — 콘센트·창가 자리·테이블 간격·체류 시간. 노트북·대화 풍경',
      minLength: 320,
      maxLength: 420,
    },
  },
  '디저트': {
    // 디저트 — order(비주얼·플레이팅)와 taste(당도·식감) 강화
    order: {
      description: '쇼케이스에서 고르는 과정 + 비주얼·플레이팅 + 페어링 음료 (숫자 가격 X)',
      minLength: 270,
      maxLength: 370,
    },
    taste: {
      description: '당도·식감·온도·커피와의 궁합. 포크/스푼 첫 한 입 → 단면 → 마지막. 과한 단맛 단정 금지',
      minLength: 320,
      maxLength: 420,
    },
  },
  '브런치': {
    // 브런치 — order(구성)와 scene(주말·여유) 강화
    order: {
      description: '브런치 구성 고르기 + 플레이팅 + 음료 포함 여부 (숫자 가격 X)',
      minLength: 270,
      maxLength: 370,
    },
    scene: {
      description: '햇살 드는 자리·여유로운 주말 분위기·동행 반응·체류 흐름. 한 끼 + 머무름',
      minLength: 320,
      maxLength: 420,
    },
  },
};

// ─────────────────────────────────────────────────────────
// 섹션 머지 헬퍼 — generateCafe.js에서 호출
// mode: 'personal'(기본 6섹션) | 'commercial'(8섹션 메뉴 정보형)
// ⚠ 3번째 인자 옵셔널 — 기존 2-인자 호출부는 personal로 동작
// ─────────────────────────────────────────────────────────
export function getCafeSections(category, flowBias, mode) {
  if (mode === 'commercial') {
    return CAFE_COMMERCIAL_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  const base = CAFE_FLOW_ENGINE.sections;
  const catOvr = CAFE_CATEGORY_OVERRIDES[category] || {};
  const biasOvr = (flowBias && FLOW_BIAS_OVERRIDES[flowBias]) || {};

  return base.map(sec => {
    const c = catOvr[sec.key] || {};
    const b = biasOvr[sec.key] || {};
    // 우선순위: base ← category ← flowBias (flowBias 최우선)
    return { ...sec, ...c, ...b };
  });
}

// ─────────────────────────────────────────────────────────
// 사진 alt 헬퍼 — 섹션별 사진 주제 반환
// ─────────────────────────────────────────────────────────
export function getPhotoSpotForSection(sectionKey) {
  return CAFE_PHOTO_SPOTS[sectionKey] || null;
}
