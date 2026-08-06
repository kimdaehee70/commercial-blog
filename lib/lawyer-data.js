// lib/lawyer-data.js
// 변호사(lawyer) 업종 데이터셋 — v124 라인 / 검색시장 단위 재편
// legal(법무사)과 완전 분리. 8대분류: 형사·성범죄·교통·가사·청소년·부동산·상속·민사
// 설계 원칙: 변호사는 업무 단위가 아니라 "검색시장 단위"(지역+분야 변호사)로 구성.
// 핵심 구분: 상속등기=법무사(legal) / 상속분쟁=변호사(lawyer, '상속'에 흡수)
// industry='lawyer' 고정. 메뉴 19개.

export const LAWYER_CATS = ['전체', '형사', '성범죄', '교통', '가사', '청소년', '부동산', '상속', '민사', '회생·파산'];

// ── [PATCH-LAW-05 · 세션106] 제목패턴 — 사건군 4분할 × 타입 8종 ───────────
//   ★ 실측 근거 1: 기존 공통 TP()는 형사 전제 문형이었다.
//     "이혼 문제로 연락을 받았다면" · "대여금 사건, 지금 하면 안 되는 것부터"
//     → 가사·민사·상속 15개 메뉴에 조사/사건 어휘가 그대로 주입되고 있었다.
//     S105에서 회생·파산만 TP_REH로 분리했고 나머지는 남아 있었다.
//   ★ 실측 근거 2: 6종 중 5종이 '상황 → 확인' 한 리듬. 연속 발행 시 동일 인상.
//   ★ 대응: 사건군별 builder 4종 × 검색의도 타입 8종.
//     [정면] SEO 정면검색어 · [질문] · [공감] · [확인] · [경고] · [결과] · [행동] · [지역판단]
//     한 메뉴당 8종 → 25메뉴 200패턴. 인접 발행 간 문형 충돌 확률이 크게 낮아진다.
//   ★ 조사(을/를/은/는) 회피 원칙: kase 뒤에 조사를 붙이지 않는다.
//     사건명 받침이 메뉴마다 달라(사기/폭행/상속/유류분) 조사를 고정하면 비문이 난다.
//     → "${kase} 문제로" · "${kase}, ~" 형태로만 잇는다.
//   ★ generateLawyer.js 무접촉. titlePatterns 배열 요소 형식({region} 치환)은 기존과 동일.

// 조사·형사군 — 수사기관 연락이 실제로 존재하는 사건.
const TP_CRIME = (kase) => [
  `{region} ${kase} 변호사`,
  `${kase}로 조사를 받게 되면 어떻게 되나요`,
  `${kase} 문제로 연락을 받았습니다, 무엇부터 해야 하나`,
  `${kase} 조사 전에 확인해야 할 것`,
  `${kase} 사건, 지금 하면 안 되는 것부터`,
  `${kase}는 초기 진술이 이후 절차까지 따라갑니다`,
  `${kase} 대응을 준비하고 있다면`,
  `{region} ${kase}, 초기에 판단할 것부터`,
];

// 가사군 — 상대가 배우자·가족. '연락을 받았다'가 아니라 '마음을 정하는' 국면.
const TP_FAMILY = (kase) => [
  `{region} ${kase} 변호사`,
  `${kase}, 어디서부터 정리해야 하나요`,
  `${kase} 문제로 마음이 정해지지 않는다면`,
  `${kase} 전에 확인해야 할 것`,
  `${kase}, 지금 하면 안 되는 것부터`,
  `${kase}, 자료를 확보한 시점이 결과를 가릅니다`,
  `${kase} 준비를 시작하기로 했다면`,
  `{region} ${kase}, 초기에 판단할 기준`,
];

// 민사·부동산·상속·교통사고군 — 기한과 서면이 축. 수사기관이 등장하지 않는다.
const TP_CIVIL = (kase) => [
  `{region} ${kase} 변호사`,
  `${kase}, 소송까지 가야 하나요`,
  `${kase} 문제가 정리되지 않고 있다면`,
  `${kase}, 시작하기 전에 확인할 것`,
  `${kase}, 지금 하면 안 되는 것부터`,
  `${kase}는 기한이 지나면 되돌리기 어렵습니다`,
  `${kase} 대응을 준비하고 있다면`,
  `{region} ${kase}, 무엇부터 정리해야 하는지`,
];

// 회생·파산(개인)군 — '내가 대상인가'가 검색의 출발점.
const TP_INSOL = (kase) => [
  `{region} ${kase} 변호사`,
  `${kase}, 저도 가능할까요`,
  `${kase} 알아보고 있는데 무엇부터 봐야 하나`,
  `${kase} 신청 전에 확인할 것`,
  `${kase}, 지금 하면 안 되는 것부터`,
  `${kase}, 신청 전의 행동이 결과를 가릅니다`,
  `${kase} 말고 다른 절차가 맞는 경우`,
  `{region} ${kase}, 신청 전에 판단할 기준`,
];

// 회생·파산(법인) 전용 — 대표가 실제로 겪는 사건 장면을 직접 쓴다.
//   ★ 공통 builder를 쓰지 않는 이유: 법인 3종은 검색 장면이 서로 완전히 다르다.
//     (압류 통지 / 정리 결심 / 대상 여부 확인) — 치환형으로는 재현되지 않는다.
const TP_REH = (kase, lines) => [`{region} ${kase} 변호사`, ...lines];

export const LAWYER_TREATMENTS = [
  // ── 형사 ──────────────────────────────
  {
    id: 'crm_fraud', industry: 'lawyer', name: '사기', cat: '형사', emoji: '⚖️',
    titlePatterns: TP_CRIME('사기'),
    keywords: ['사기 변호사', '사기 고소 대응', '사기 조사 절차', '사기 선임료'],
    compareWith: '재산 형사', rank: 1,
  },
  {
    id: 'crm_assault', industry: 'lawyer', name: '폭행', cat: '형사', emoji: '⚖️',
    titlePatterns: TP_CRIME('폭행'),
    keywords: ['폭행 변호사', '폭행 대응방법', '폭행 조사 절차', '폭행 선임'],
    compareWith: '상해 형사', rank: 2,
  },
  {
    id: 'crm_drug', industry: 'lawyer', name: '마약', cat: '형사', emoji: '⚖️',
    titlePatterns: TP_CRIME('마약'),
    keywords: ['마약 변호사', '마약 사건 대응', '마약 조사 절차', '마약 선임'],
    compareWith: '형사 일반', rank: 3,
  },
  {
    id: 'crm_defame', industry: 'lawyer', name: '명예훼손', cat: '형사', emoji: '⚖️',
    titlePatterns: TP_CRIME('명예훼손'),
    keywords: ['명예훼손 변호사', '명예훼손 고소', '명예훼손 조사 절차', '명예훼손 선임기준'],
    compareWith: '모욕·사이버 형사', rank: 4,
  },

  // ── 성범죄 ────────────────────────────
  {
    id: 'crm_sex', industry: 'lawyer', name: '성범죄', cat: '성범죄', emoji: '⚖️',
    titlePatterns: TP_CRIME('성범죄'),
    keywords: ['성범죄 변호사', '성범죄 대응', '성범죄 조사 절차', '성범죄 선임'],
    compareWith: '형사 일반', rank: 1,
  },
  {
    id: 'crm_stalk', industry: 'lawyer', name: '스토킹', cat: '성범죄', emoji: '⚖️',
    titlePatterns: TP_CRIME('스토킹'),
    keywords: ['스토킹 변호사', '스토킹 대응', '스토킹 조사 절차', '스토킹 선임기준'],
    compareWith: '성범죄', rank: 2,
  },

  // ── 교통 ──────────────────────────────
  {
    id: 'trf_dui', industry: 'lawyer', name: '음주운전', cat: '교통', emoji: '🚗',
    titlePatterns: TP_CRIME('음주운전'),
    keywords: ['음주운전 변호사', '음주운전 초기대응', '음주운전 조사 절차', '음주운전 선임료'],
    compareWith: '도로교통 형사', rank: 1,
  },
  {
    id: 'trf_accident', industry: 'lawyer', name: '교통사고', cat: '교통', emoji: '🚗',
    titlePatterns: TP_CIVIL('교통사고'),
    keywords: ['교통사고 변호사', '교통사고 손해배상', '교통사고 합의 절차', '교통사고 선임기준'],
    compareWith: '손해배상', rank: 2,
  },

  // ── 가사 ──────────────────────────────
  {
    id: 'fam_divorce', industry: 'lawyer', name: '이혼', cat: '가사', emoji: '💍',
    titlePatterns: TP_FAMILY('이혼'),
    keywords: ['이혼 변호사', '이혼 절차', '이혼 소송 대응', '이혼 선임료'],
    compareWith: '협의·재판 이혼', rank: 1,
  },
  {
    id: 'fam_affair', industry: 'lawyer', name: '상간', cat: '가사', emoji: '💍',
    titlePatterns: TP_FAMILY('상간'),
    keywords: ['상간 변호사', '상간 소송', '상간 위자료 절차', '상간 선임기준'],
    compareWith: '이혼 소송', rank: 2,
  },
  {
    id: 'fam_custody', industry: 'lawyer', name: '양육권', cat: '가사', emoji: '💍',
    titlePatterns: TP_FAMILY('양육권'),
    keywords: ['양육권 변호사', '양육권 분쟁', '양육권 절차', '양육권 선임기준'],
    compareWith: '이혼 부수처분', rank: 3,
  },
  {
    id: 'fam_property', industry: 'lawyer', name: '재산분할', cat: '가사', emoji: '💍',
    titlePatterns: TP_FAMILY('재산분할'),
    keywords: ['재산분할 변호사', '재산분할 기준', '재산분할 절차', '재산분할 선임료'],
    compareWith: '이혼 부수처분', rank: 4,
  },

  // ── 청소년 ────────────────────────────
  {
    id: 'juv_schoolviolence', industry: 'lawyer', name: '학교폭력', cat: '청소년', emoji: '🎒',
    titlePatterns: TP_CRIME('학교폭력'),
    keywords: ['학교폭력 변호사', '학교폭력 대응', '학교폭력 절차', '학폭위 선임기준'],
    compareWith: '소년사건', rank: 1,
  },

  // ── 부동산 ────────────────────────────
  {
    id: 'rea_dispute', industry: 'lawyer', name: '부동산분쟁', cat: '부동산', emoji: '🏠',
    titlePatterns: TP_CIVIL('부동산분쟁'),
    keywords: ['부동산분쟁 변호사', '부동산 소송 대응', '부동산분쟁 절차', '부동산분쟁 선임료'],
    compareWith: '계약분쟁', rank: 1,
  },

  // ── 상속 ──────────────────────────────
  // 주의: 상속'등기'는 legal(법무사) 귀속. 변호사는 상속'분쟁' 계열을 '상속'으로 흡수.
  {
    id: 'inh_general', industry: 'lawyer', name: '상속', cat: '상속', emoji: '📜',
    titlePatterns: TP_CIVIL('상속'),
    keywords: ['상속 변호사', '상속 분쟁 대응', '상속 절차', '상속 선임기준'],
    compareWith: '유류분', rank: 1,
  },
  {
    id: 'inh_reserve', industry: 'lawyer', name: '유류분', cat: '상속', emoji: '📜',
    titlePatterns: TP_CIVIL('유류분'),
    keywords: ['유류분 변호사', '유류분 청구', '유류분 절차', '유류분 선임료'],
    compareWith: '상속', rank: 2,
  },
  {
    id: 'inh_partition', industry: 'lawyer', name: '상속재산분할', cat: '상속', emoji: '📜',
    titlePatterns: TP_CIVIL('상속재산분할'),
    keywords: ['상속재산분할 변호사', '상속재산분할 심판', '상속재산분할 절차', '상속재산분할 선임기준'],
    compareWith: '유류분', rank: 3,
  },

  // ── 민사 ──────────────────────────────
  {
    id: 'civ_damage', industry: 'lawyer', name: '손해배상', cat: '민사', emoji: '📑',
    titlePatterns: TP_CIVIL('손해배상'),
    keywords: ['손해배상 변호사', '손해배상 청구', '손해배상 절차', '손해배상 선임료'],
    compareWith: '민사 일반', rank: 1,
  },
  {
    id: 'civ_contract', industry: 'lawyer', name: '계약분쟁', cat: '민사', emoji: '📑',
    titlePatterns: TP_CIVIL('계약분쟁'),
    keywords: ['계약분쟁 변호사', '계약 위반 대응', '계약분쟁 절차', '계약분쟁 선임기준'],
    compareWith: '손해배상', rank: 2,
  },
  {
    id: 'civ_loan', industry: 'lawyer', name: '대여금', cat: '민사', emoji: '📑',
    titlePatterns: TP_CIVIL('대여금'),
    keywords: ['대여금 변호사', '대여금 청구', '대여금 소송 절차', '대여금 선임료'],
    compareWith: '손해배상', rank: 3,
  },

  // ── 회생·파산 ──────────────────────────
  // 변호사 관점: 면책·채권자 대응·기각/이의·법원 출석 등 '법률 대응' 중심.
  // (법무사 legal = 신청·서류·대행 중심. 동일 키워드지만 검색의도·관점 분리로 공존.)
  {
    id: 'reh_personal', industry: 'lawyer', name: '개인회생', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP_INSOL('개인회생'),
    keywords: ['개인회생 변호사', '개인회생 기각 대응', '개인회생 채권자 이의', '개인회생 인가 절차'],
    compareWith: '개인파산', rank: 1,
  },
  {
    id: 'bkr_personal', industry: 'lawyer', name: '개인파산', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP_INSOL('개인파산'),
    keywords: ['개인파산 변호사', '개인파산 면책 대응', '개인파산 기각 사유', '개인파산 심문 절차'],
    compareWith: '개인회생', rank: 2,
  },
  {
    id: 'reh_corp', industry: 'lawyer', name: '법인회생', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP_REH('법인회생', [
      '거래처 압류가 들어왔어요, 무엇부터 해야 하나',
      '회사 계좌가 압류됐다면 지금 하면 안 되는 것',
      '직원 월급을 못 줄 것 같습니다, 먼저 확인할 것',
      '회사를 살릴 수 있을까요 · 폐업보다 회생이 나은 경우',
      '{region} 법인회생, 신청 전에 확인할 기준',
      '법인회생을 고민하고 있다면 먼저 볼 것',
      '법인회생 신청 전에 하면 안 되는 것',
      '법인회생은 회사가 버티는 동안에만 선택지가 남습니다',
    ]),
    keywords: ['법인회생 변호사', '법인회생 신청 요건', '법인회생 채권자 대응', '법인회생 인가 절차'],
    compareWith: '법인파산', rank: 3,
  },
  {
    id: 'bkr_corp', industry: 'lawyer', name: '법인파산', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP_REH('법인파산', [
      '회사 빚을 감당할 수 없습니다, 정리해야 할까요',
      '법인파산하면 대표도 책임지나요',
      '개인 재산까지 위험한지 먼저 확인할 것',
      '법인파산 전에 회생 가능성부터 따져봐야 한다면',
      '{region} 법인파산, 절차를 시작하기 전에 확인할 것',
      '법인파산과 법인회생, 어느 쪽부터 봐야 하나',
      '법인파산 신청 전에 하면 안 되는 것',
      '법인을 정리해도 대표 보증은 따로 남습니다',
    ]),
    keywords: ['법인파산 변호사', '법인파산 절차', '대표 연대보증 책임', '법인파산 신청 요건'],
    compareWith: '법인회생', rank: 4,
  },
  {
    id: 'reh_simple', industry: 'lawyer', name: '간이회생', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP_REH('간이회생', [
      '우리 회사도 간이회생이 가능할까요',
      '간이회생 대상인지 모르겠습니다, 먼저 확인할 것',
      '일반회생 대신 간이회생이 될까요',
      '소규모 법인도 회생이 가능한지 판단하는 기준',
      '{region} 간이회생, 신청 전에 판단할 기준',
      '간이회생은 얼마나 걸리나요',
      '간이회생 신청 전에 하면 안 되는 것',
      '채무 규모가 크지 않다면 간이회생부터 봅니다',
    ]),
    keywords: ['간이회생 변호사', '간이회생 대상 기준', '간이회생 일반회생 차이', '간이회생 절차'],
    compareWith: '법인회생', rank: 5,
  },
];

// 업종 메타 (카탈로그 1행용)
export const LAWYER_META = {
  industry: 'lawyer',
  label: '변호사',
  icon: '⚖️',
  summary: '형사·성범죄·교통·가사·청소년·부동산·상속·민사·회생파산 검색시장 단위 사건 정보형 콘텐츠',
  cats: LAWYER_CATS,
};

// BLOCK_MAP 격리용 — legal(법무사)과 교차 오염 차단 참조 키
// 상속등기/증여등기/법인등기/부동산등기 = legal(등기·서류) 전용. lawyer에서 사용 금지.
// [해제] '개인회생' 제거: 변호사=면책·대응·소송 / 법무사=신청·서류. 관점 분리로 양 엔진 공존.
export const LAWYER_BLOCK_KEYWORDS = [
  '상속등기', '증여등기', '법인등기', '부동산등기',
];
