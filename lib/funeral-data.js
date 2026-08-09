// lib/funeral-data.js
// 상조(funeral) 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 장례지도사(상조회사 안내자). 정보형. 후기·체험·유가족 인터뷰·감성 과장 금지.
// 복사 베이스: daycare-data.js → 데이터 교체
// 첫 관측 축: 장례식장명 + 비용 + 빈소안내

export const FUNERAL_META = {
  industry: "funeral",
  label: "상조",
  fullLabel: "상조·장례 안내",
  greeting: "안녕하세요. {region} ○○상조 장례지도사입니다. 장례 절차·비용 안내를 도와드립니다.",
  voice: "장례지도사(상조회사 안내자)",
  badge: "신규",
  // 결정주기: 장례 발생 직후 즉시 의사결정
  decisionCycle: "urgent",
  // ★ 비용 단정 금지 — 빈소 규모·조문객·식대·화장 여부 등 변수 → "상담 시 안내" 톤
  //   할부거래법(선불식 할부거래) 영역 → 가입조건·해약환급금 단정·수익률 표현 금지
  costTone: "consult", // 세부 금액 확정 표기 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 감성 과장·광고·유가족 후기·상조 가입 강권 차단
export const FUNERAL_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건", "후회 없는",
  // 감성 과장 (PHILOSOPHY: 슬픔·눈물 과장 금지)
  "너무 만족", "최고의 장례", "저렴하게 모셨", "정성껏 모셨습니다",
  "눈물", "슬픔을", "마지막 가시는 길", "편안히 모셨",
  // 상조 가입 강권·선택 유도
  "저희를 선택", "꼭 가입", "지금 가입",
  // 광고성 (상조 업종 빈출)
  "고품격", "품격있는", "합리적인 비용", "최저가", "가성비", "추천드립니다",
  // 할부거래법 — 수익·환급 단정
  "원금 보장", "100% 환급", "확정 환급금",
];

// 카테고리 탭 (메뉴 5개 + 신뢰 보조)
export const FUNERAL_CATS = [
  "장례비용",
  "장례절차",
  "장례식장",
  "장례형태",
  "상조서비스",
];

// ★ 서비스 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword)
export const FUNERAL_TREATMENTS = [
  // ── A. 장례비용 ──────────────────────────────────────────────
  {
    id: "funeral_cost",
    industry: "funeral",
    name: "장례비용",
    cat: "장례비용",
    emoji: "💳",
    titlePatterns: [
      "{region} 가족장 비용 알아보신다면",
      "{region} 3일장 비용 안내",
      "{region} 무빈소 장례 비용 정리",
      "{region} 화장 비용은 어떻게 되나요?",
    ],
    keywords: ["장례비용", "가족장 비용", "3일장 비용", "무빈소 장례 비용", "화장 비용"],
    compareWith: "일반장 비용",
    DIRECTION: {
      concern: "장례 발생 직후 비용이 얼마나 드는지 가늠이 안 되는 상황",
      effect: "빈소 규모·조문 기간·화장 여부에 따른 비용 구조를 단정 없이 안내",
      hook: "장례를 갑자기 준비하게 되면 비용부터 막막하실 텐데요",
      keyword: "장례비용",
    },
  },
  {
    id: "funeral_familycost",
    industry: "funeral",
    name: "가족장 비용",
    cat: "장례비용",
    emoji: "👪",
    titlePatterns: [
      "{region} 가족장 비용 어느 정도 잡아야 할까요",
      "{region} 소규모 가족장 비용 안내",
      "조문객 적은 {region} 가족장 비용 정리",
    ],
    keywords: ["가족장 비용", "소규모 장례 비용", "가족장 준비", "작은 장례"],
    compareWith: "일반장",
    DIRECTION: {
      concern: "가족 중심 소규모 장례를 원하지만 비용 기준을 모름",
      effect: "빈소 규모·식대·인력에 따른 가족장 비용 구조 안내",
      hook: "가족끼리 조용히 모시고 싶을 때 비용이 어떻게 달라지는지 안내드리면",
      keyword: "가족장 비용",
    },
  },

  // ── B. 장례절차 ──────────────────────────────────────────────
  {
    id: "funeral_procedure",
    industry: "funeral",
    name: "장례절차",
    cat: "장례절차",
    emoji: "📋",
    titlePatterns: [
      "사망 후 장례 절차 정리",
      "{region} 장례 절차 어떻게 진행되나요",
      "가족장 진행 순서 안내",
    ],
    keywords: ["장례절차", "사망 후 절차", "장례 진행 순서", "장례 준비"],
    compareWith: "직접 준비",
    DIRECTION: {
      concern: "임종 직후 무엇부터 해야 하는지 순서를 모르는 상황",
      effect: "임종→안치→빈소→발인→화장/매장까지 절차 흐름을 단계별 안내",
      hook: "갑작스러운 임종 후 무엇부터 해야 할지 막막하실 텐데요",
      keyword: "장례절차",
    },
  },
  {
    id: "funeral_afterdeath",
    industry: "funeral",
    name: "사망 후 해야 할 일",
    cat: "장례절차",
    emoji: "🕯️",
    titlePatterns: [
      "사망 후 가장 먼저 해야 할 일",
      "{region} 임종 후 연락 순서 안내",
      "화장 예약은 언제 어떻게 하나요",
    ],
    keywords: ["사망 후 해야 할 일", "임종 후 절차", "화장 예약 방법", "사망신고"],
    compareWith: "직접 처리",
    DIRECTION: {
      concern: "임종 직후 연락·신고·예약 순서를 몰라 우왕좌왕하는 상황",
      effect: "사망진단서·안치·화장 예약·행정 절차의 우선순위를 차분히 안내",
      hook: "임종 직후에는 무엇을 먼저 챙겨야 할지 정리가 필요한데요",
      keyword: "사망 후 절차",
    },
  },

  // ── C. 장례식장 (첫 관측 핵심 축) ────────────────────────────
  {
    id: "funeral_hall",
    industry: "funeral",
    name: "장례식장 안내",
    cat: "장례식장",
    emoji: "🏛️",
    titlePatterns: [
      "{hallName} 비용 안내",
      "{hallName} 빈소 이용 안내",
      "{hallName} 주차 및 장례 절차 안내",
      "{hallName} 비용 및 빈소 안내",
      "{hallName} 장례 진행 시 알아둘 점",
      "{region} 장례식장 빈소 이용 안내",
    ],
    keywords: ["장례식장 비용", "빈소 안내", "장례식장 이용", "빈소 크기", "장례식장 주차"],
    compareWith: "다른 장례식장",
    DIRECTION: {
      concern: "특정 병원 장례식장의 비용과 빈소 규모를 알고 싶은 상황",
      effect: "빈소 크기·임대료·식당·안치 시설 등 이용 기준을 안내(금액 단정 금지)",
      hook: "장례식장을 정할 때 빈소 규모와 비용이 가장 먼저 궁금하실 텐데요",
      keyword: "장례식장 비용",
    },
  },
  {
    id: "funeral_hallbooking",
    industry: "funeral",
    name: "빈소 예약·선택",
    cat: "장례식장",
    emoji: "🏮",
    titlePatterns: [
      "{region} 장례식장 빈소 선택 기준",
      "{hallName} 빈소 예약 전 확인할 점",
      "조문객 규모별 빈소 선택 안내",
    ],
    keywords: ["빈소 예약", "장례식장 선택", "빈소 규모", "장례식장 비교"],
    compareWith: "빈소 없이 진행",
    DIRECTION: {
      concern: "조문객 규모에 맞는 빈소를 어떻게 골라야 할지 모름",
      effect: "예상 조문 인원·기간·식당 운영 기준으로 빈소 선택 방향 안내",
      hook: "빈소는 조문객 규모에 따라 선택 기준이 달라지는데요",
      keyword: "빈소 선택",
    },
  },

  // ── D. 장례형태 ──────────────────────────────────────────────
  {
    id: "funeral_type",
    industry: "funeral",
    name: "장례형태(가족장·무빈소)",
    cat: "장례형태",
    emoji: "⚱️",
    titlePatterns: [
      "가족장이 늘어나는 이유",
      "{region} 무빈소 장례 어떻게 진행되나요",
      "가족장과 일반장 무엇이 다른가요",
    ],
    keywords: ["가족장", "무빈소장", "일반장", "화장장례"],
    compareWith: "일반장",
    DIRECTION: {
      concern: "어떤 장례 형태가 우리 가족 상황에 맞는지 판단이 어려움",
      effect: "가족장·무빈소·일반장의 진행 방식과 차이를 정보로 안내",
      hook: "최근 가족장을 택하는 분이 늘고 있는데 그 이유를 정리하면",
      keyword: "가족장",
    },
  },
  {
    id: "funeral_cremation",
    industry: "funeral",
    name: "화장 장례",
    cat: "장례형태",
    emoji: "🔥",
    titlePatterns: [
      "화장 절차와 준비사항",
      "{region} 화장장 예약 방법 안내",
      "화장 장례 진행 순서 정리",
    ],
    keywords: ["화장절차", "화장 예약", "화장장례", "봉안 안치"],
    compareWith: "매장",
    DIRECTION: {
      concern: "화장을 선택했지만 예약·절차가 복잡하게 느껴지는 상황",
      effect: "화장 예약 시점·필요 서류·봉안/자연장 이후 절차를 안내",
      hook: "화장을 진행할 때 예약 시점과 절차를 미리 알면 수월한데요",
      keyword: "화장절차",
    },
  },

  // ── E. 상조서비스 ────────────────────────────────────────────
  {
    id: "funeral_postpaid",
    industry: "funeral",
    name: "후불상조",
    cat: "상조서비스",
    emoji: "🤝",
    titlePatterns: [
      "후불상조 이용 전 확인할 사항",
      "{region} 후불상조 어떻게 진행되나요",
      "상조 없이 장례 가능할까요",
    ],
    keywords: ["후불상조", "상조 없이 장례", "상조 필요성", "장례 대행"],
    compareWith: "선불식 상조",
    DIRECTION: {
      concern: "미리 가입한 상조가 없는데 지금 장례를 치를 수 있을지 불안",
      effect: "후불상조의 진행 방식과 선불식과의 차이를 정보로 안내(가입 강권 금지)",
      hook: "상조에 미리 가입하지 않아도 장례가 가능한지 궁금하실 텐데요",
      keyword: "후불상조",
    },
  },
  {
    id: "funeral_compare",
    industry: "funeral",
    name: "상조 비교·필요성",
    cat: "상조서비스",
    emoji: "📑",
    titlePatterns: [
      "상조 가입 필요할까요",
      "{region} 상조 서비스 비교 전 확인할 점",
      "후불상조와 선불상조 차이 정리",
    ],
    keywords: ["상조 비교", "상조 가입", "상조 필요성", "선불 후불 차이"],
    compareWith: "직접 준비",
    DIRECTION: {
      concern: "상조 가입이 정말 필요한지, 어떤 방식이 맞는지 판단이 안 됨",
      effect: "선불식·후불식 구조 차이와 해약환급금 등 확인 기준을 안내(수익 표현 금지)",
      hook: "상조가 꼭 필요한지 고민될 때 확인하면 좋은 기준을 정리하면",
      keyword: "상조 비교",
    },
  },
];

// ════════════════════════════════════════════════════════════════════
// V2 Knowledge Engine — Decision Asset Library
// ────────────────────────────────────────────────────────────────────
// 설계 원칙 (V2):
//   1. 아래 5개 Asset이 원본 데이터(Source of Truth).
//   2. FUNERAL_INFO_BLOCKS는 더 이상 원본이 아니라 "Knowledge View Layer"
//      — 아래 Asset들을 Decision 요약으로 파생한 결과만 담는다.
//   3. renderInfoBlocks()(prompts.js, FREEZE)는 무수정. View Layer의
//      {title, items[]} shape만 유지하면 본문에 자동 반영된다.
//   4. Asset이 100·1000개로 늘어도 본문 구조(INFO_BLOCKS)는 불변.
//
// ★ Decision Knowledge 원칙 (전 Asset 공통):
//   백과사전 나열 ❌ / 의사결정을 돕는 정보 ⭕
//   "시설이 무엇인가"가 아니라 "이 상황이면 무엇을 골라야 하는가".
//   비용은 단정 금지(할부거래법·costTone:consult) — 범위와 결정 요소만.
// ════════════════════════════════════════════════════════════════════

// ── Asset 1. FUNERAL_HALL_DATA (장례식장 선택 판단) ──────────────────
//   지역마다 항목을 쉽게 추가하는 Asset 구조. hallName 문자열 → Knowledge DB.
//   판단축: "조문객 N명이면 어느 빈소/장례식장이 적절한가".
//   ⚠️ 실측 데이터 없음 → 개별 장례식장 실명 DB는 사용자 입력/추후 확충.
//      여기서는 "선택 판단 기준"을 보편형으로 구조화(허위 시설정보 방지).
export const FUNERAL_HALL_DATA = {
  // 빈소 선택 판단표 — 조문 규모 → 적정 빈소
  selectionGuide: [
    {
      mourners: "가족·근친 (20명 이하)",
      hallSize: "소형 빈소 / 가족실",
      note: "무빈소·가족장에 적합. 식당 최소 운영으로 비용 절감",
    },
    {
      mourners: "30~50명",
      hallSize: "중형 빈소",
      note: "일반적 3일장 기준. 식당 회전·주차 여유 확인이 판단 포인트",
    },
    {
      mourners: "100명 내외 이상",
      hallSize: "대형 빈소 / 특실",
      note: "조문 동선·주차·식당 좌석 수가 선택 기준. 임대료 상향",
    },
  ],
  // 장례식장 확인 체크 항목 — "무엇을 봐야 정할 수 있는가"
  checkPoints: [
    { item: "빈소 규모·수", why: "조문객 규모와 맞아야 대기·혼잡 없음" },
    { item: "안치실·입관실", why: "시설 유무가 이동·추가비용을 좌우" },
    { item: "식당·매점", why: "조문객 접대 회전율과 식대 규모 결정" },
    { item: "주차 대수", why: "조문객 방문 편의·주말 혼잡 대비" },
    { item: "화장장 거리", why: "발인 당일 이동 시간·운구 비용에 직결" },
    { item: "봉안·자연장 연계", why: "화장 이후 안치 동선을 미리 판단" },
  ],
  // 지역별 실명 DB는 이 배열에 Asset 추가(현재 비어있음 — 실측 후 확충)
  halls: [
    // 예시 스키마(실측 전 미사용):
    // { name, region, address, parking, roomCount, roomSize,
    //   morgue, encoffin, dining, store, accessible, crematoriumDist,
    //   columbarium, hours, contact, faq: [] }
  ],
};

// ── Asset 2. FUNERAL_PRODUCT_DATA (상품 비교 판단) ───────────────────
//   상조=방문업 아닌 상품업. 판단축: "우리 가족에게 어떤 상품이 맞는가".
//   비용은 범위 톤(단정 금지). 상품 강권 금지 — 상황 매칭만.
export const FUNERAL_PRODUCT_DATA = [
  {
    id: "product_essential",
    name: "실속형",
    recommendMourners: "가족·근친 위주",
    costRange: "가장 기본 구성 (변동: 빈소·식대 별도)",
    includes: ["장례지도사 1인", "기본 수의·관", "운구 차량", "필수 인력"],
    optional: ["도우미 추가", "식당 연계"],
    feature: "필수 항목만. 조문 최소·비용 절감 우선",
    fitWhen: "조문객이 적고 절차를 간소화하고 싶은 가족",
  },
  {
    id: "product_family",
    name: "가족장",
    recommendMourners: "20~40명",
    costRange: "실속형+가족 편의 구성 (변동: 빈소 규모)",
    includes: ["장례지도사", "수의·관", "도우미", "운구", "빈소 연계"],
    optional: ["식당 확장", "차량 추가"],
    feature: "가족 중심으로 조용히. 조문 응대 부담 완화",
    fitWhen: "가족끼리 차분히 모시되 기본 격식은 유지하고 싶을 때",
  },
  {
    id: "product_nobin",
    name: "무빈소",
    recommendMourners: "직계 가족만",
    costRange: "최소 구성 (빈소 임대·식대 제외로 변동 폭 작음)",
    includes: ["장례지도사", "수의·관", "화장 연계", "운구"],
    optional: ["봉안·자연장 연계"],
    feature: "빈소 없이 화장 중심. 절차·비용 최소화",
    fitWhen: "조문을 받지 않고 화장 중심으로 간소하게 진행할 때",
  },
  {
    id: "product_premium",
    name: "프리미엄",
    recommendMourners: "50~100명",
    costRange: "중대형 빈소·인력 확대 (변동: 조문 규모·식대)",
    includes: ["장례지도사 팀", "고급 수의·관", "도우미 다수", "차량", "빈소 운영"],
    optional: ["의전 확대", "접객 지원"],
    feature: "조문 응대·의전을 갖춘 3일장 표준 이상",
    fitWhen: "조문객이 많아 응대·의전 지원이 필요한 경우",
  },
  {
    id: "product_vip",
    name: "VIP",
    recommendMourners: "100명 이상",
    costRange: "최상위 구성 (변동 요소 가장 큼)",
    includes: ["전담 팀", "최상급 용품", "의전·접객 전담", "차량 다수", "특실 연계"],
    optional: ["별도 의전 기획"],
    feature: "대규모 조문·의전 전담. 동선·접객 전면 지원",
    fitWhen: "대규모 조문이 예상되어 전담 운영이 필요한 경우",
  },
];

// ── Asset 3. FUNERAL_COST_DATA (비용 이해·예상) ──────────────────────
//   판단축: "비용이 왜 달라지는가". 금액 단정 ❌ / 범위·결정요소 ⭕.
export const FUNERAL_COST_DATA = {
  // 조문 규모 → 비용 방향(단정 아닌 상대 안내)
  byScale: [
    { mourners: "30명 내외", direction: "빈소·식대 최소. 총비용 하단", drivers: "소형 빈소·식대 적음" },
    { mourners: "50명 내외", direction: "3일장 표준 범위", drivers: "중형 빈소·식대·인력" },
    { mourners: "100명 이상", direction: "빈소·식대·인력 상향으로 상단", drivers: "대형 빈소·식당 회전·의전" },
  ],
  // 비용 구성 요소 (무엇으로 이뤄지는가)
  components: [
    { part: "장례식장", detail: "빈소 임대료·안치료·식당 이용" },
    { part: "용품·인력", detail: "수의·관·장례지도사·도우미" },
    { part: "화장·운구", detail: "화장료·운구 차량·봉안 비용" },
  ],
  // 비용을 좌우하는 결정 요소 (왜 달라지는가)
  decisionFactors: [
    "빈소 규모 (조문객 수)",
    "조문 기간 (3일장·2일장)",
    "식대 (조문객 수 × 접대 회전)",
    "화장 여부·화장장 거리",
    "용품 등급 (수의·관)",
    "봉안·자연장 등 안치 방식",
  ],
  // 예상 밖 추가 발생 항목 (검색자가 놓치기 쉬운 지점)
  extraCosts: [
    "조문객 증가에 따른 식대 추가",
    "빈소 연장 사용 (기간 초과)",
    "화장장 원거리 시 운구 비용",
    "봉안시설·자연장 별도 비용",
  ],
  note: "※ 세부 금액은 빈소·조문 규모·화장 여부에 따라 달라지므로 상담 시 안내",
};

// ── Asset 4. FUNERAL_FAQ_DATA (불안 해소) ────────────────────────────
//   판단축: 임종 직후 검색자가 즉시 궁금해하는 것. Decision을 돕는 답.
export const FUNERAL_FAQ_DATA = [
  { q: "사망 후 가장 먼저 무엇을 해야 하나요?", a: "의료기관에서 사망진단서를 발급받고 안치를 진행합니다. 이후 빈소·화장 예약 순으로 이어집니다.", intent: "process" },
  { q: "사망진단서는 언제 받나요?", a: "병원 사망은 임종 직후, 자택 사망은 검안 절차 후 발급됩니다. 여러 통 발급받아 두는 편이 행정에 유리합니다.", intent: "process" },
  { q: "화장은 언제 예약하나요?", a: "안치 직후 예약하는 것이 안전합니다. 화장장 예약 상황에 따라 발인일이 정해지므로 우선순위가 높습니다.", intent: "cremation" },
  { q: "빈소는 어떻게 정하나요?", a: "안치가 끝난 뒤 빈소를 정하고 예약을 진행합니다. 화장 예약과 함께 진행해야 일정이 확정됩니다.", intent: "hall" },
  { q: "조문은 몇 시까지 가능한가요?", a: "대개 장례식장 운영시간 내 상시 가능하나, 늦은 시간 방문은 유가족과 조율하는 것이 일반적입니다.", intent: "hall" },
  { q: "가족장도 조문을 받을 수 있나요?", a: "가능합니다. 가족장은 조문 규모를 줄이는 것일 뿐, 근친 조문은 받을 수 있습니다.", intent: "type" },
  { q: "후불상조는 어떻게 진행되나요?", a: "사전 가입 없이 장례 발생 시 서비스를 이용하고 이후 정산하는 방식입니다. 포함 항목 범위를 미리 확인합니다.", intent: "compare" },
  { q: "상조가 없어도 장례가 가능한가요?", a: "가능합니다. 후불 방식으로 장례지도사·용품·차량을 이용할 수 있습니다.", intent: "compare" },
  { q: "장례기간은 보통 며칠인가요?", a: "3일장이 일반적입니다. 화장장 예약 상황이나 가족 사정에 따라 조정되기도 합니다.", intent: "type" },
  { q: "발인은 언제 하나요?", a: "보통 장례 3일차 오전에 진행하며, 화장·매장 일정에 맞춰 시간을 정합니다.", intent: "cremation" },
  { q: "무빈소 장례는 어떻게 진행되나요?", a: "빈소를 두지 않고 안치 후 바로 화장 중심으로 진행합니다. 조문 응대가 없어 절차·비용이 간소합니다.", intent: "type" },
  { q: "선불식과 후불식 상조는 무엇이 다른가요?", a: "선불식은 사전 납입 후 이용, 후불식은 이용 후 정산입니다. 선불식은 해약환급금·공정위 등록 여부를 확인합니다.", intent: "compare" },
  { q: "장례식장과 상조는 어떻게 다른가요?", a: "장례식장은 빈소·시설 공간이고, 상조는 장례지도사·용품·인력 등 진행 서비스를 제공합니다.", intent: "compare" },
  { q: "사망신고는 언제 하나요?", a: "장례 이후 30일 이내 관할 주민센터에 신고합니다. 사망진단서가 필요합니다.", intent: "process" },
  { q: "화장 예약이 늦어지면 어떻게 되나요?", a: "예약 가능한 시간이 뒤로 밀리면서 발인일도 함께 늦춰집니다. 빈소 사용 기간이 늘어나므로 안치 직후 예약을 먼저 확인합니다.", intent: "cremation" },
  { q: "예약한 화장장을 변경할 수 있나요?", a: "잔여 예약 상황에 따라 가능하지만, 변경 시 발인 시각이 함께 바뀝니다. 조문·입관 일정을 다시 조율해야 하므로 초기 예약 시 신중히 정합니다.", intent: "cremation" },
  { q: "안치는 언제 하나요?", a: "사망진단서 발급 직후 장례식장 또는 병원 안치실로 이송합니다. 안치가 끝나야 빈소·화장 예약 절차로 넘어갑니다.", intent: "process" },
  { q: "빈소는 언제 결정하나요?", a: "안치 직후 예상 조문객 수를 기준으로 정합니다. 화장 예약과 함께 진행해야 장례 일정 전체가 확정됩니다.", intent: "process" },
  { q: "추가 비용이 가장 많이 발생하는 항목은 무엇인가요?", a: "조문객 증가에 따른 식대와 빈소 연장 사용이 가장 큽니다. 화장장이 멀 경우 운구 비용도 추가됩니다.", intent: "cost" },
  { q: "비용을 줄이려면 무엇부터 결정해야 하나요?", a: "조문 규모를 먼저 정하면 빈소 등급과 식대가 함께 결정됩니다. 화장료·기본 용품처럼 고정된 항목은 조정 대상이 아닙니다.", intent: "cost" },
  // [FAQ-01B] hall intent 제외 — selectionGuide 계열 판단정보(시설 비교 기준) 차단. dormant intent로 보존.
  { q: "장례식장은 무엇을 기준으로 고르나요?", a: "예상 조문객 수에 맞는 빈소 규모가 우선이고, 주차 대수와 식당 좌석이 다음 기준입니다. 화장장까지의 거리도 발인 당일 이동에 영향을 줍니다.", intent: "guide" },
  { q: "빈소 예약은 언제 하나요?", a: "안치 장소가 정해지는 시점에 함께 진행합니다. 조문 시작일이 정해져야 이후 절차가 이어집니다.", intent: "hall" },
  { q: "장례식장을 옮길 수 있나요?", a: "안치 이후에는 이송 절차와 추가 비용이 발생합니다. 빈소 규모와 주차·식당은 결정 전에 확인하는 편이 안전합니다.", intent: "hall" },
  { q: "가족장과 일반장은 무엇이 다른가요?", a: "조문 범위를 근친으로 제한하는지의 차이입니다. 절차 자체는 같고 빈소 규모와 식대에서 차이가 생깁니다.", intent: "type" },
  { q: "무빈소와 가족장 중 어떤 경우에 무엇을 선택하나요?", a: "조문을 받지 않기로 정했다면 무빈소, 근친 조문은 받되 규모를 줄이려면 가족장이 맞습니다. 조문 여부가 판단 기준입니다.", intent: "type" },
  { q: "장례비용은 무엇 때문에 달라지나요?", a: "빈소 규모·조문객 수에 따른 식대·안치 기간이 가장 크게 작용합니다. 화장장 거리와 봉안 방식도 변동 요소입니다.", intent: "cost" },
  { q: "가족장은 비용이 얼마나 줄어드나요?", a: "조문 규모가 줄어 식대와 빈소 임대 부분이 낮아집니다. 다만 장례지도사·용품·차량 등 기본 항목은 동일하게 발생합니다.", intent: "cost" },
  { q: "비용은 언제 정산하나요?", a: "후불 방식은 장례 종료 후 실제 사용 항목 기준으로 정산합니다. 사전 견적과 최종 정산 차이 항목을 미리 확인해 두면 좋습니다.", intent: "cost" },
  { q: "봉안과 자연장은 무엇이 다른가요?", a: "봉안은 유골을 봉안시설에 안치, 자연장은 수목·잔디 등 자연에 안치하는 방식입니다.", intent: "cremation" },
];

// ── Asset 5. FUNERAL_CHECKLIST_DATA (다음 행동 결정) ─────────────────
//   판단축: 검색자가 바로 활용 가능한 "다음에 할 일".
export const FUNERAL_CHECKLIST_DATA = {
  // 사망 직후 시간순 행동
  immediate: [
    { step: "사망진단서 발급", detail: "병원/검안 절차로 확보 (여러 통 준비)" },
    { step: "안치", detail: "장례식장 또는 병원 안치실로 이송" },
    { step: "빈소·상조 결정", detail: "조문 규모 → 빈소 규모·상품 선택" },
    { step: "화장 예약", detail: "화장장 예약 상황 확인 후 발인일 확정" },
  ],
  // 준비 서류
  documents: [
    "사망진단서(검안서) 여러 통",
    "고인·상주 신분증",
    "가족관계 확인 서류",
  ],
  // 장례 후 행정
  afterFuneral: [
    { step: "사망신고", detail: "30일 이내 주민센터 (사망진단서 필요)" },
    { step: "봉안·자연장", detail: "화장 후 안치 방식 결정·예약" },
    { step: "각종 정산·해지", detail: "상조 정산, 고인 명의 정리" },
  ],
};

// ════════════════════════════════════════════════════════════════════
// 개념 분리 (V2 회사/장례식장 분리) — 반드시 독립 유지
// ────────────────────────────────────────────────────────────────────
//   ★ 상조회사 ≠ 장례식장 운영 주체.
//     상조회사 → 상품·서비스·상담 (FUNERAL_PRODUCT_DATA + FUNERAL_SERVICE_INFO)
//     장례식장 → 시설·이용안내·빈소·주차·식당 (FUNERAL_HALL_INFO)
//   빈소·안치실·입관실을 상조회사 소개처럼 쓰면 안 됨 → HALL_INFO(시설)로 분리.
//   판단 Asset(FUNERAL_HALL_DATA=조문규모→빈소 선택)과도 층이 다름:
//     HALL_DATA = "무엇을 골라야 하나"(선택 판단)
//     HALL_INFO = "무엇이 갖춰져 있나"(시설 사실)
// ════════════════════════════════════════════════════════════════════

// ── Asset 6. FUNERAL_SERVICE_INFO (상조회사 서비스·상담) ─────────────
//   ★ 상조회사가 "제공하는 서비스"만. 장례식장 시설은 포함 금지.
//   대부분 공통 → 기본값 제공(사용자 입력 최소화). 선택 항목만 사용자 지정.
export const FUNERAL_SERVICE_INFO = {
  // 공통 기본 서비스 (상조회사 표준 — 사용자 입력 불필요)
  standard: [
    "24시간 상담",
    "24시간 출동",
    "365일 접수",
    "긴급 장례 가능",
    "장례지도사 배정",
  ],
  // 상담 채널 (회사가 제공하는 상담 방식)
  consult: [
    "전화 상담",
    "방문 상담",
    "출장 상담",
  ],
  // 결제 방식 (사용자 선택 — 후불/선불/혼합)
  //   기본값 postpaid(후불). 선불식은 할부거래법 정합 — 표현은 prompts가 관리.
  payment: {
    postpaid: true,   // 후불
    prepaid: false,   // 선불
    // 혼합은 두 값 모두 true로 표현
  },
};

// FUNERAL_SERVICE_INFO 결제 방식 → 표시 문자열(Decision 요약용)
function _servicePaymentLabel() {
  const p = FUNERAL_SERVICE_INFO.payment || {};
  if (p.postpaid && p.prepaid) return "후불·선불 모두 가능";
  if (p.prepaid) return "선불식 가입";
  return "후불 진행 (사전 가입 불필요)";
}

// ── Asset 7. FUNERAL_HALL_INFO (장례식장 시설·이용안내) ──────────────
//   ★ 장례식장의 "시설 사실 정보". 상조회사 서비스와 완전 분리.
//   지역별 실명 장례식장은 halls[]에 Asset 추가(실측 후). 현재는 시설 항목 정의만.
//   ⚠️ 실측 없는 개별 시설 수치 단정 금지 → 항목 스키마 + 확인 안내만.
export const FUNERAL_HALL_INFO = {
  // 장례식장이 갖추는 시설 항목 (이용 시 확인 대상)
  facilities: [
    { item: "주소·위치", note: "화장장·자택과의 거리 확인" },
    { item: "주차", note: "조문객 규모 대비 주차 대수" },
    { item: "빈소", note: "규모·수 (조문 인원과 매칭)" },
    { item: "안치실", note: "안치 가능 여부·이용 방식" },
    { item: "입관실", note: "입관 절차 진행 공간" },
    { item: "식당", note: "조문객 접대 좌석·회전" },
    { item: "매점", note: "장례용품·간편 물품 구비 여부" },
    { item: "편의시설", note: "장애인 시설·가족 대기실 등" },
  ],
  // 외부 연계 (장례식장이 직접 운영하지 않지만 이용 동선상 연결)
  linkage: [
    { item: "화장장 연계", note: "거리·예약 상황이 발인 일정에 영향" },
    { item: "봉안시설 연계", note: "화장 후 안치 방식·예약" },
  ],
  // 지역별 실명 장례식장 DB (실측 후 확충)
  halls: [
    // 스키마: { name, region, address, parking, roomCount, roomSize,
    //   morgue, encoffin, dining, store, accessible, crematoriumDist,
    //   columbarium, hours, contact }
  ],
};

// ════════════════════════════════════════════════════════════════════
// Knowledge View Layer — FUNERAL_INFO_BLOCKS (파생 결과만 보유)
// ────────────────────────────────────────────────────────────────────
//   위 5개 Asset을 Decision 요약으로 압축해 {title, items[]} shape으로 파생.
//   renderInfoBlocks()(FREEZE)가 Object.values로 순회 → 본문 자동 반영.
//   ★ 원본을 늘려도 이 파생 요약 규칙만 유지하면 본문 구조 불변.
//   ★ 블록 수를 과하게 늘리면 본문 정보 과밀 → View는 "판단에 필요한 것"만 선별.
// ════════════════════════════════════════════════════════════════════

// 파생 헬퍼: 각 Asset → Decision 요약 items[]
function _deriveProcedureItems() {
  return FUNERAL_CHECKLIST_DATA.immediate.map((s) => `${s.step} — ${s.detail}`);
}
function _deriveCostItems() {
  const comp = FUNERAL_COST_DATA.components.map((c) => `${c.part}: ${c.detail}`);
  const factors = `변동 요소: ${FUNERAL_COST_DATA.decisionFactors.slice(0, 4).join(" · ")}`;
  return [...comp, factors, FUNERAL_COST_DATA.note];
}
function _deriveHallItems() {
  // "조문객 규모 → 적정 빈소" 판단표를 요약(선택 판단축)
  return FUNERAL_HALL_DATA.selectionGuide.map(
    (g) => `${g.mourners}: ${g.hallSize} (${g.note})`
  );
}
// [세션57] DEAD CODE(보존) — type 블록 View Layer 제외로 현재 미참조.
//   원본 Asset(FUNERAL_PRODUCT_DATA) 파생 로직. 상품 포지션 재노출 정책 시 FUNERAL_INFO_BLOCKS.type 복원용.
function _deriveProductItems() {
  // "우리 가족에게 어떤 상품" — 상황 매칭 요약(강권 금지, fitWhen 중심)
  return FUNERAL_PRODUCT_DATA.map((p) => `${p.name} — ${p.fitWhen}`);
}
// [C-6] Intent별 FAQ 선별 — intent 태그 우선, 부족분은 process(공통 불안) 보충
function _faqByIntent(intent, n = 4) {
  const hit = FUNERAL_FAQ_DATA.filter((f) => f.intent === intent);
  const fill = FUNERAL_FAQ_DATA.filter((f) => f.intent !== intent);
  return [...hit, ...fill].slice(0, n).map((f) => `Q. ${f.q}\n  ${f.a}`);
}

function _deriveFaqItems() {
  // 임종 직후 최상위 불안 해소 3~4개만 선별(과밀 방지)
  return FUNERAL_FAQ_DATA.slice(0, 4).map((f) => `Q. ${f.q}\n  ${f.a}`);
}
// [회사] 상조회사 서비스·상담 요약 — 장례식장 시설 미포함
function _deriveServiceItems() {
  return [
    `기본 서비스: ${FUNERAL_SERVICE_INFO.standard.join(" · ")}`,
    `상담: ${FUNERAL_SERVICE_INFO.consult.join(" · ")}`,
    `진행 방식: ${_servicePaymentLabel()}`,
  ];
}
// [장례식장] 시설·이용안내 요약 — 상조회사 서비스와 분리
function _deriveHallInfoItems() {
  const fac = FUNERAL_HALL_INFO.facilities.map((f) => `${f.item} (${f.note})`);
  const link = FUNERAL_HALL_INFO.linkage.map((l) => `${l.item} (${l.note})`);
  return [...fac, ...link];
}

export const FUNERAL_INFO_BLOCKS = {
  procedure: {
    title: "장례 진행 순서",
    items: _deriveProcedureItems(),
  },
  cost: {
    title: "장례비용 구성과 결정 요소",
    items: _deriveCostItems(),
  },
  hall: {
    title: "조문 규모별 빈소 선택 기준",
    items: _deriveHallItems(),
  },
  // [세션57] "우리 가족에 맞는 상조 상품"(type) 블록 View Layer에서 제외 —
  //   하단 상품 편집기(index.js buildFuneralProductBlock, 사용자 입력 상품)와 완전 중복.
  //   원본 Asset(PRODUCT_DATA)·_deriveProductItems()는 보존(아래 DEAD CODE). 재노출 시 이 키만 복원.
  // type: { title: "우리 가족에 맞는 상조 상품", items: _deriveProductItems() },  // ← 중복 제거(하단 상품블록 대체)
  // [회사] 상조회사 서비스·상담 — 장례식장 시설과 개념 분리
  companyService: {
    title: "상조회사 서비스·상담 안내",
    items: _deriveServiceItems(),
  },
  // [장례식장] 시설·이용안내 — 상조회사 소개와 분리(시설 사실)
  hallFacility: {
    title: "장례식장 시설·이용 안내",
    items: _deriveHallInfoItems(),
  },
  service: {
    title: "자주 묻는 질문",
    items: _deriveFaqItems(),
  },
  // [C-6] Intent별 FAQ 블록 — preset(prompts.js)에서 키만 골라 쓴다. 렌더러 무수정.
  service_process:   { title: "자주 묻는 질문", items: _faqByIntent("process") },
  service_cremation: { title: "자주 묻는 질문", items: _faqByIntent("cremation") },
  service_hall:      { title: "자주 묻는 질문", items: _faqByIntent("hall") },
  service_type:      { title: "자주 묻는 질문", items: _faqByIntent("type") },
  service_compare:   { title: "자주 묻는 질문", items: _faqByIntent("compare") },
  service_cost:      { title: "자주 묻는 질문", items: _faqByIntent("cost") },
};

// 사진 슬롯 — 정보형, 캡션 선택 (감성 연출 금지)
export const FUNERAL_PHOTO_POOL = [
  { slot: "hall", alt: "{region} 장례식장 빈소 안내" },
  { slot: "info", alt: "장례 절차 안내 자료" },
  { slot: "consult", alt: "장례 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const FUNERAL_COMPARE = {
  compareWith: "일반장",
  compareWithText2: "직접 준비",
};
