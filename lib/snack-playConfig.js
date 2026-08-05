// ============================================================
// lib/snack-playConfig.js — 분식 FLOW_ENGINE 구조 (Snack Engine 독립)
// ⚠ clinic·dental·oriental 등 의료 playConfig 참조 금지
// ⚠ korean playConfig 복사 베이스 — commercial 8섹션 description만 class 중립화(B)
// ⚠ 구조·order·length·헬퍼 100% 보존 (외식 공통 승계)
// ============================================================
//
// 분식 6섹션 = "방문계기 → 도착 → 주문 → 맛 → 장면 → 재방문" (restaurant 동형)
//   class 4축(soup·meat·rice·noodle)은 snack-data SoT / snack-prompts getSoupFrameGuard에서 제어
//   playConfig는 메뉴 특정 어휘를 유도하지 않는다 (중립 description)
//
// 작업 기준: 분식 STEP1 (snack-data·snack-prompts PASS) / korean-playConfig v2 승계

// ─────────────────────────────────────────────────────────
// 사진 유도 포인트 — 섹션별 photo prompt
// generateSnack.js의 getImageAlts와 짝을 이룸
// ─────────────────────────────────────────────────────────
export const SNACK_PHOTO_SPOTS = {
  visit:   null,  // 사진 없음 (도입 텍스트)
  arrive:  '외관·간판·입구 동선',
  order:   '메뉴판·상차림 세팅·구성',
  taste:   '음식 클로즈업 (국물·면·양념 표면 디테일)',
  scene:   '테이블 분위기·창가·옆자리 흐름·식사 중 풍경',
  revisit: '가게 마무리 컷 (계산대·출구·간판)',
};

// ─────────────────────────────────────────────────────────
// SNACK_FLOW_ENGINE — 6섹션 구조 (personal)
// 섹션 키 6개: visit · arrive · order · taste · scene · revisit
// generateSnack.js의 writtenSections·prompt 빌더와 반드시 일치
// ─────────────────────────────────────────────────────────
export const SNACK_FLOW_ENGINE = {
  industry: 'snack',

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
      label: '주문·구성',
      order: 3,
      description: '메뉴 고르기 + 구성·곁들임 + 상차림 세팅 (가격 X)',
      required: true,
      minLength: 250,
      maxLength: 350,
      photo: '메뉴판·상차림 세팅·구성',
    },
    {
      key: 'taste',
      label: '맛·식감',
      order: 4,
      description: '국물·면·양념 등 핵심 맛 묘사. 첫 입 → 식감 → 온도 → 향. 정보 나열 금지, 한 입의 체감 중심',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: '음식 클로즈업 (국물·면·양념 표면 디테일)',
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
      description: '재방문 의사 + 어떤 상황·목적에 추천하는지 (혼밥/간식/친구와/포장 등)',
      required: true,
      minLength: 200,
      maxLength: 250,
      photo: '가게 마무리 컷 (계산대·출구·간판)',
    },
  ],

  // 차단 키워드 (snack-data.js의 SNACK_BLOCK_MAP과 일치)
  blockKeywords: [
    // 의료 침투 방지
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '원장님', '의사', '간호사', '병원', '회차', '경과', '붓기',
    // 카페 어휘 차단 (cafe와 분리)
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
    // ★ 중식 narrative 침투 차단 (Snack 독립 ecosystem — Naver §3 전략2)
    '춘장', '짜장', '짬뽕', '탕수육', '깐풍기', '유린기', '꽃빵', '샤오롱바오',
    // ★ 효능·관용 단정 차단 (PHILOSOPHY — 효능 단정 금지. '해장'은 generate 완화룰 위임이므로 제외)
    '속풀이', '몸보신', '숙취해소',
  ],

  // 필수 키워드 (최소 1개 포함) — 분식 결
  requiredKeywords: [
    '면', '소스', '맛', '식감', '한 그릇', '한 입',
    '분식', '메뉴', '간식', '재방문',
  ],

  // 식사 시간 흐름 (cafe의 stayTimeline 대응)
  // scene 섹션에서 사용
  sceneTimeline: {
    'arrival':   '자리 잡음 — 동행과 자리 정하고 앉음, 메뉴판 확인',
    'serving':   '상차림 — 곁들임 깔리고 본 메뉴 나옴, 김 올라오는 순간',
    'eating':    '식사 중 — 한 술 한 술 흐름, 동행과 대화·반응, 옆자리 풍경',
    'finishing': '마무리 — 그릇 비워가는 즈음, 후식·물·계산 전 분위기',
  },

  // VISIT_VALUES → MEAL_VALUES (분식판 운영 정보)
  // generateSnack.js의 injectMealValue()에서 사용
  // 8개 중 최소 5개 본문 강제 주입 (가격 노출 금지)
  mealValueFields: [
    'waitingMinutes',   // 평일/주말 웨이팅 분 단위
    'seatCount',        // 좌석수·1인석/4인석/룸 유무
    'businessHours',    // 영업시간 + 브레이크타임/라스트오더
    'sidedishCount',    // 곁들임 가짓수·리필 여부
    'parking',          // 주차 가능 여부 / 발렛 / 인근 주차장
    'restroom',         // 화장실 위치 (내부/외부/공용)
    'tableSpacing',     // 테이블 간격 (좁음/적당/여유)
    'paymentType',      // 카드 / 현금 / 계좌이체 / 키오스크
  ],
  mealValueMinCount: 5,

  // 분식 전용 추가 블럭 (generateSnack.js에서 주입)
  extraBlocks: [
    'WAITING_BLOCKS',     // 웨이팅 정보
    'SIDEDISH_BLOCKS',    // 곁들임·기본찬 구성
    'BEST_TIME',          // 방문 추천 시간대
    'MENU_COMBINATION',   // 메뉴 조합 추천 (떡볶이+튀김+순대 등)
    'SEAT_TYPE',          // 좌석 유형 (1인석·테이블·룸)
    'CUSTOMER_TYPE',      // 주 방문층 (학생/직장인/가족 등)
    'NOISE_LEVEL',        // 소음 수준
  ],

  // 문단 길이 가이드
  paragraphGuide: {
    minLinesPerParagraph: 2,
    maxLinesPerParagraph: 4,
    note: '네이버 분식판은 사진 사이 짧은 문단이 상단 유지력 핵심',
  },

  // SEO 합격 기준
  seoPassScore: 85,
  minTotalLength: 2000,
};

// ============================================================
// [v2 / 2026-06-27] SNACK_COMMERCIAL_FLOW_ENGINE — 8섹션 메뉴 중심 정보형
// ⚠ 기존 SNACK_FLOW_ENGINE(6섹션 personal)은 무수정 보존 — 롤백 안전
// ⚠ mode='commercial' 일 때만 이 섹션셋 사용. personal 호출은 영향 없음
//
// ★ korean-playConfig commercial 복사 베이스 — description만 분식 class 중립화(B)
//   국밥 특화 어휘(들깨·새우젓·밥말기·순대·머릿고기) 전면 제거
//   class 4축(soup·meat·rice·noodle) 모두 적용 가능한 중립 지시문
//   메뉴 특정 양성 유도 제거 → getSoupFrameGuard(snack-prompts) class 분기 보존
//
// 최상위 원칙: 주인공 = '메뉴', 사용자 최종 질문 = "이 메뉴가 나에게 맞는가?"
// 8섹션: ①메뉴소개 ②선택축 ③구성요소 ④양념·먹는법(관찰형) ⑤곁들임
//        ⑥선택포인트(Decision★) ⑦추천상황 ⑧매장특징(보조한정)
// 비율(목표): 메뉴정보 55 / 장면 12 / 선택·추천 18 / 매장 10 / 마무리 5
// 화법: 3인칭 정보형. 1인칭(저는·제가) 0건. 허위체험 0. 광고단정 0.
// ============================================================
export const SNACK_COMMERCIAL_FLOW_ENGINE = {
  industry: 'snack',
  mode: 'commercial',

  sections: [
    {
      key: 'menuIntro',
      label: '왜찾는가(도입)',
      order: 1,
      description: '[v2.2 단일임무] 왜 오늘 이 메뉴를 찾는가 — 방문 동기 하나만. 구성·맛 설명 금지. 추천 종결 금지. 1인칭 금지',
      required: true,
      minLength: 230,
      maxLength: 320,
      photo: '가게 외관 또는 대표 메뉴 컷',
    },
    {
      key: 'menuScene',
      label: '선택축',
      order: 2,
      description: '[v2.2 단일임무] class별 핵심 선택축 하나만 — soup=국물 스타일(맑은/진한·농도·얼큰함) / noodle=면발·비빔·식감 / meat=양념·조리·튀김 결 / rice=구성·속재료. 방문상황 나열 금지. 부속 설명 금지. 추천 종결 금지',
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '대표 메뉴 클로즈업',
    },
    {
      key: 'menuComposition',
      label: '구성요소',
      order: 3,
      description: '[v2.2 단일임무] 구성 요소 하나만 — 메뉴를 이루는 재료·토핑·곁들임을 구체 실명으로. 추상어(든든/따뜻) 금지. 상황 반복 금지. 추천 종결 금지',
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '구성·재료 디테일',
    },
    {
      key: 'tasteFeature',
      label: '양념·먹는법',
      order: 4,
      description: "[v2.2 단일임무] 양념과 먹는 방식 하나만 — 메뉴별 소스·디핑·조합 방식. '맛있다/든든' 단정 금지. 방문상황 반복 금지. 추천 종결 금지",
      required: true,
      minLength: 200,
      maxLength: 280,
      photo: '양념·곁들임 컷',
    },
    {
      key: 'pairing',
      label: '함께주문',
      order: 5,
      description: '[v2.2 단일임무] 함께 주문할 메뉴 하나만 — 사이드·세트 조합. 메뉴 정의 반복 금지. 광고·추천 종결 금지',
      required: true,
      minLength: 180,
      maxLength: 250,
      photo: '곁들임·세트 조합 컷',
    },
    {
      key: 'decision',
      label: '고민→선택(Decision)',
      order: 6,
      description: '[v2.2 핵심] 주문 전 고민→선택 흐름 하나만 — 양/맵기/구성/세트·포장/혼자·나눠먹기. "좋은 선택" 단정 금지. 검색자 결정 흐름으로',
      required: true,
      minLength: 300,
      maxLength: 400,
      photo: null,
    },
    {
      key: 'recommendSituation',
      label: '누구·언제',
      order: 7,
      description: '[v2.2 단일임무] 누구에게·언제 맞는가 하나만 — 혼밥·간식·친구와·포장·나눠먹기·간단한 한 끼 구분. 구성·양념 재설명 금지. "찾는 사람 많다" 종결 금지',
      required: true,
      minLength: 240,
      maxLength: 320,
      photo: null,
    },
    {
      key: 'storeFeature',
      label: '방문전체크',
      order: 8,
      description: '[v2.2 단일임무] 방문 전 확인할 점 하나만 — 혼밥석·포장·단체석·주차·영업시간·메뉴 구성 확인. 메뉴 특징 반복 금지. 매장명 본문 노출 금지(placeholder)',
      required: true,
      minLength: 200,
      maxLength: 260,
      photo: '매장 좌석·외관 (보조)',
    },
  ],

  // 차단 키워드 — 기존 6섹션과 공유(의료·카페·광고 차단 유지)
  // ⚠ 1인칭 허위 체험 차단은 단어 단위가 아닌 Prompt에서 제어
  blockKeywords: [
    ...SNACK_FLOW_ENGINE.blockKeywords,
  ],

  // requiredKeywords 강제는 Prompt에서 자연 유도 (구조 강제 X)
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
// generateSnack.js에서 section.minLength·maxLength 보정에 사용
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
// 카테고리별 섹션 커스터마이징
// ⚠ 분식은 단일 카테고리('분식'). class 분기는 snack-data SoT / snack-prompts에서 제어
//   playConfig는 메뉴 특정 어휘 유도 금지(B) — taste description 중립 유지
// ─────────────────────────────────────────────────────────
export const SNACK_CATEGORY_OVERRIDES = {
  '분식': {
    // 분식 — soup(라면·우동·어묵)·meat(떡볶이)·noodle(쫄면·비빔국수)·rice(김밥) 혼재
    // class별 어휘는 snack-prompts getSoupFrameGuard에서 제어. 여기선 중립 길이만 보정
    taste: {
      description: 'class별 핵심 맛 — soup=국물·온도, noodle=면발·소스, meat=양념·식감, rice=속재료 균형. 한 입의 체감 중심. 중식 결(춘장·불 맛·짜장 소스) 금지',
      minLength: 300,
      maxLength: 400,
    },
    order: {
      description: '메뉴 고르기 + 구성·곁들임(김치·단무지·국물·튀김) + 양 가늠 (숫자 가격 X)',
      minLength: 260,
      maxLength: 360,
    },
  },
};

// ─────────────────────────────────────────────────────────
// 섹션 머지 헬퍼 — generateSnack.js에서 호출
// 기본 섹션 + 카테고리 오버라이드 + flowBias 오버라이드를 합쳐 반환
// ─────────────────────────────────────────────────────────
// mode: 'personal'(기본·6섹션) | 'commercial'(8섹션 메뉴 정보형)
// ⚠ 3번째 인자 옵셔널 — 기존 2-인자 호출부는 personal로 동작(영향 없음)
export function getSnackSections(category, flowBias, mode) {
  // commercial 모드 — 8섹션 메뉴 중심 정보형
  if (mode === 'commercial') {
    return SNACK_COMMERCIAL_FLOW_ENGINE.sections.map(sec => ({ ...sec }));
  }

  // personal 모드 (6섹션)
  const base = SNACK_FLOW_ENGINE.sections;
  const catOvr = SNACK_CATEGORY_OVERRIDES[category] || {};
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
// generateSnack.js의 getImageAlts에서 활용
// ─────────────────────────────────────────────────────────
export function getPhotoSpotForSection(sectionKey) {
  return SNACK_PHOTO_SPOTS[sectionKey] || null;
}
