// lib/lawyer-data.js
// 변호사(lawyer) 업종 데이터셋 — v124 라인 / 검색시장 단위 재편
// legal(법무사)과 완전 분리. 8대분류: 형사·성범죄·교통·가사·청소년·부동산·상속·민사
// 설계 원칙: 변호사는 업무 단위가 아니라 "검색시장 단위"(지역+분야 변호사)로 구성.
// 핵심 구분: 상속등기=법무사(legal) / 상속분쟁=변호사(lawyer, '상속'에 흡수)
// industry='lawyer' 고정. 메뉴 19개.

export const LAWYER_CATS = ['전체', '형사', '성범죄', '교통', '가사', '청소년', '부동산', '상속', '민사', '회생·파산'];

// [세션41][TITLE-SITU] 제목패턴 상황형 전환.
//   기존: "{region} 사기 변호사" — 키워드 나열형. 클릭 이유가 없고 검색어를 그대로 붙인 인상.
//   변경: 검색자가 놓인 상황을 제목에 담는다(상황형 4 + 키워드형 2 혼합).
//   키워드형 2종 유지 이유 = "지역+사건+변호사" 정면 검색어 커버(전량 상황형 시 노출 손실 우려).
//   {region} {case} 치환. 결과보장·후기형 표현 배제 유지.
//   [세션41-2] 상황형 가중. 관측: 6종 균등 랜덤 → 키워드형이 1/3 확률로 뽑혀 "아직 키워드형" 체감.
//   구성: 상황형 5 + 정면검색어 1. 정면 검색어 1종만 남겨 "지역+사건+변호사" 커버는 유지.
const TP = (kase) => [
  `{region} ${kase} 변호사`,                        // 정면 검색어 (1종만 유지)
  `${kase} 문제로 연락을 받았다면 먼저 확인할 것`,   // 상황형
  `${kase} 사건, 지금 하면 안 되는 것부터`,          // 상황형 (mistake 섹션 정합)
  `${kase} 상황에서 무엇부터 정리해야 하는지`,       // 상황형
  `{region} ${kase}, 초기에 판단할 것부터`,          // 상황형 + 지역
  `${kase}로 연락을 받은 뒤 가장 먼저 할 일`,        // 상황형
];

export const LAWYER_TREATMENTS = [
  // ── 형사 ──────────────────────────────
  {
    id: 'crm_fraud', industry: 'lawyer', name: '사기', cat: '형사', emoji: '⚖️',
    titlePatterns: TP('사기'),
    keywords: ['사기 변호사', '사기 고소 대응', '사기 조사 절차', '사기 선임료'],
    compareWith: '재산 형사', rank: 1,
  },
  {
    id: 'crm_assault', industry: 'lawyer', name: '폭행', cat: '형사', emoji: '⚖️',
    titlePatterns: TP('폭행'),
    keywords: ['폭행 변호사', '폭행 대응방법', '폭행 조사 절차', '폭행 선임'],
    compareWith: '상해 형사', rank: 2,
  },
  {
    id: 'crm_drug', industry: 'lawyer', name: '마약', cat: '형사', emoji: '⚖️',
    titlePatterns: TP('마약'),
    keywords: ['마약 변호사', '마약 사건 대응', '마약 조사 절차', '마약 선임'],
    compareWith: '형사 일반', rank: 3,
  },
  {
    id: 'crm_defame', industry: 'lawyer', name: '명예훼손', cat: '형사', emoji: '⚖️',
    titlePatterns: TP('명예훼손'),
    keywords: ['명예훼손 변호사', '명예훼손 고소', '명예훼손 조사 절차', '명예훼손 선임기준'],
    compareWith: '모욕·사이버 형사', rank: 4,
  },

  // ── 성범죄 ────────────────────────────
  {
    id: 'crm_sex', industry: 'lawyer', name: '성범죄', cat: '성범죄', emoji: '⚖️',
    titlePatterns: TP('성범죄'),
    keywords: ['성범죄 변호사', '성범죄 대응', '성범죄 조사 절차', '성범죄 선임'],
    compareWith: '형사 일반', rank: 1,
  },
  {
    id: 'crm_stalk', industry: 'lawyer', name: '스토킹', cat: '성범죄', emoji: '⚖️',
    titlePatterns: TP('스토킹'),
    keywords: ['스토킹 변호사', '스토킹 대응', '스토킹 조사 절차', '스토킹 선임기준'],
    compareWith: '성범죄', rank: 2,
  },

  // ── 교통 ──────────────────────────────
  {
    id: 'trf_dui', industry: 'lawyer', name: '음주운전', cat: '교통', emoji: '🚗',
    titlePatterns: TP('음주운전'),
    keywords: ['음주운전 변호사', '음주운전 초기대응', '음주운전 조사 절차', '음주운전 선임료'],
    compareWith: '도로교통 형사', rank: 1,
  },
  {
    id: 'trf_accident', industry: 'lawyer', name: '교통사고', cat: '교통', emoji: '🚗',
    titlePatterns: TP('교통사고'),
    keywords: ['교통사고 변호사', '교통사고 손해배상', '교통사고 합의 절차', '교통사고 선임기준'],
    compareWith: '손해배상', rank: 2,
  },

  // ── 가사 ──────────────────────────────
  {
    id: 'fam_divorce', industry: 'lawyer', name: '이혼', cat: '가사', emoji: '💍',
    titlePatterns: TP('이혼'),
    keywords: ['이혼 변호사', '이혼 절차', '이혼 소송 대응', '이혼 선임료'],
    compareWith: '협의·재판 이혼', rank: 1,
  },
  {
    id: 'fam_affair', industry: 'lawyer', name: '상간', cat: '가사', emoji: '💍',
    titlePatterns: TP('상간'),
    keywords: ['상간 변호사', '상간 소송', '상간 위자료 절차', '상간 선임기준'],
    compareWith: '이혼 소송', rank: 2,
  },
  {
    id: 'fam_custody', industry: 'lawyer', name: '양육권', cat: '가사', emoji: '💍',
    titlePatterns: TP('양육권'),
    keywords: ['양육권 변호사', '양육권 분쟁', '양육권 절차', '양육권 선임기준'],
    compareWith: '이혼 부수처분', rank: 3,
  },
  {
    id: 'fam_property', industry: 'lawyer', name: '재산분할', cat: '가사', emoji: '💍',
    titlePatterns: TP('재산분할'),
    keywords: ['재산분할 변호사', '재산분할 기준', '재산분할 절차', '재산분할 선임료'],
    compareWith: '이혼 부수처분', rank: 4,
  },

  // ── 청소년 ────────────────────────────
  {
    id: 'juv_schoolviolence', industry: 'lawyer', name: '학교폭력', cat: '청소년', emoji: '🎒',
    titlePatterns: TP('학교폭력'),
    keywords: ['학교폭력 변호사', '학교폭력 대응', '학교폭력 절차', '학폭위 선임기준'],
    compareWith: '소년사건', rank: 1,
  },

  // ── 부동산 ────────────────────────────
  {
    id: 'rea_dispute', industry: 'lawyer', name: '부동산분쟁', cat: '부동산', emoji: '🏠',
    titlePatterns: TP('부동산분쟁'),
    keywords: ['부동산분쟁 변호사', '부동산 소송 대응', '부동산분쟁 절차', '부동산분쟁 선임료'],
    compareWith: '계약분쟁', rank: 1,
  },

  // ── 상속 ──────────────────────────────
  // 주의: 상속'등기'는 legal(법무사) 귀속. 변호사는 상속'분쟁' 계열을 '상속'으로 흡수.
  {
    id: 'inh_general', industry: 'lawyer', name: '상속', cat: '상속', emoji: '📜',
    titlePatterns: TP('상속'),
    keywords: ['상속 변호사', '상속 분쟁 대응', '상속 절차', '상속 선임기준'],
    compareWith: '유류분', rank: 1,
  },
  {
    id: 'inh_reserve', industry: 'lawyer', name: '유류분', cat: '상속', emoji: '📜',
    titlePatterns: TP('유류분'),
    keywords: ['유류분 변호사', '유류분 청구', '유류분 절차', '유류분 선임료'],
    compareWith: '상속', rank: 2,
  },
  {
    id: 'inh_partition', industry: 'lawyer', name: '상속재산분할', cat: '상속', emoji: '📜',
    titlePatterns: TP('상속재산분할'),
    keywords: ['상속재산분할 변호사', '상속재산분할 심판', '상속재산분할 절차', '상속재산분할 선임기준'],
    compareWith: '유류분', rank: 3,
  },

  // ── 민사 ──────────────────────────────
  {
    id: 'civ_damage', industry: 'lawyer', name: '손해배상', cat: '민사', emoji: '📑',
    titlePatterns: TP('손해배상'),
    keywords: ['손해배상 변호사', '손해배상 청구', '손해배상 절차', '손해배상 선임료'],
    compareWith: '민사 일반', rank: 1,
  },
  {
    id: 'civ_contract', industry: 'lawyer', name: '계약분쟁', cat: '민사', emoji: '📑',
    titlePatterns: TP('계약분쟁'),
    keywords: ['계약분쟁 변호사', '계약 위반 대응', '계약분쟁 절차', '계약분쟁 선임기준'],
    compareWith: '손해배상', rank: 2,
  },
  {
    id: 'civ_loan', industry: 'lawyer', name: '대여금', cat: '민사', emoji: '📑',
    titlePatterns: TP('대여금'),
    keywords: ['대여금 변호사', '대여금 청구', '대여금 소송 절차', '대여금 선임료'],
    compareWith: '손해배상', rank: 3,
  },

  // ── 회생·파산 ──────────────────────────
  // 변호사 관점: 면책·채권자 대응·기각/이의·법원 출석 등 '법률 대응' 중심.
  // (법무사 legal = 신청·서류·대행 중심. 동일 키워드지만 검색의도·관점 분리로 공존.)
  {
    id: 'reh_personal', industry: 'lawyer', name: '개인회생', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP('개인회생'),
    keywords: ['개인회생 변호사', '개인회생 기각 대응', '개인회생 채권자 이의', '개인회생 인가 절차'],
    compareWith: '개인파산', rank: 1,
  },
  {
    id: 'bkr_personal', industry: 'lawyer', name: '개인파산', cat: '회생·파산', emoji: '📉',
    titlePatterns: TP('개인파산'),
    keywords: ['개인파산 변호사', '개인파산 면책 대응', '개인파산 기각 사유', '개인파산 심문 절차'],
    compareWith: '개인회생', rank: 2,
  },
];

// 업종 메타 (카탈로그 1행용)
export const LAWYER_META = {
  industry: 'lawyer',
  label: '변호사',
  icon: '⚖️',
  summary: '형사·성범죄·교통·가사·청소년·부동산·상속·민사 검색시장 단위 사건 정보형 콘텐츠',
  cats: LAWYER_CATS,
};

// BLOCK_MAP 격리용 — legal(법무사)과 교차 오염 차단 참조 키
// 상속등기/증여등기/법인등기/부동산등기 = legal(등기·서류) 전용. lawyer에서 사용 금지.
// [해제] '개인회생' 제거: 변호사=면책·대응·소송 / 법무사=신청·서류. 관점 분리로 양 엔진 공존.
export const LAWYER_BLOCK_KEYWORDS = [
  '상속등기', '증여등기', '법인등기', '부동산등기',
];
