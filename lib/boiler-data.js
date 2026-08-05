// lib/boiler-data.js
// 보일러설치(boiler) 업종 데이터셋 — v1 / 정보형 + 설치·교체·고장 안내 가이드형
// 화자 = {region} 보일러설치 업체. 정보형(설치·교체·고장원인·에러코드·온수·난방·누수·배관청소·교체시기·비용·브랜드).
//   후기·체험·과장광고·추천·만족도·최저가·할인·이벤트·전화/상담/견적 유도 금지.
// 복제 베이스: systemair-data.js 70% (설치·교체형 정보 구조 동형) + 출장업종 조정 30%.
// industry='boiler' 고정. 메뉴 12개.
//
// 설계 핵심 (SOP v4.2 보일러 지시서):
//   - 설치/교체/고장 정보형. 출장·현장방문 업종 → APT 미사용(useApt 전부 false). region 문자열만.
//   - 섹션 7개: 도입 → 사진 → 시공범위 → 발생원인 → 진행절차 → 관리방법 → 마무리.
//   - 관련도 노출 축 = 설치 / 교체 / 고장원인 / 에러코드 / 온수 / 난방 / 누수 / 배관청소 / 교체시기 / 비용 / 브랜드.
//   - 타업종 오염 차단: 하수구막힘(막힘)·누수탐지(누수탐지 장비)·저수조청소·수도설비(설비배관)·에어컨 분리.
//
// ★ 절대 금지(정보형 고정): 후기·만족도·추천·최저가·할인·이벤트·전화/상담/견적 유도·과장광고·1등·최고·100%해결.
//   작업일지형(다녀왔습니다·고쳐드렸습니다·시공했습니다·출동했습니다) 차단.
//
// ★ cat ↔ INFO_BLOCK 1:1 (12 cat = 12 block, UNDEFINED 0). 박제 0종.
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const BOILER_META = {
  industry: "boiler",
  label: "보일러설치",
  fullLabel: "보일러설치 안내",
  greeting: "안녕하세요. {region} 보일러설치 업체입니다.",
  voice: "{region} 보일러설치 업체",
  badge: "신규",
  // 결정주기: 교체·고장 시점 기반(일정성 + 고장 대응 혼재)
  decisionCycle: "compare",
  // 비용 단정 금지 — 용량·배관·철거·브랜드 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·만족도·과장광고·추천·할인유도 + 작업일지형 + 타업종 오염 차단
export const BOILER_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1등", "1위", "최고", "역대급", "초대박", "대박",
  "100% 해결", "100%해결", "100%", "완벽",
  // 보장·추천·순위 (정보형 고정)
  "보장", "효과 보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 할인·이벤트·유도
  "할인", "이벤트", "특가", "프로모션", "지금 전화", "전화주세요", "상담 신청", "견적 문의",
  "문의주세요", "연락주세요", "지금 상담",
  // 후기·체험담·작업일지형
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도", "재이용",
  "다녀왔습니다", "고쳐드렸습니다", "시공했습니다", "출동했습니다", "긴급출동", "출동",
  "확 달라진", "환골탈태",
  // 단정형 해결
  "즉시 해결", "당일 해결", "확실히 해결", "완벽 해결",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 12개 — cat 12종 1:1)
export const BOILER_CATS = [
  "교체",
  "설치",
  "고장원인",
  "에러코드",
  "온수",
  "난방",
  "누수",
  "배관청소",
  "교체시기",
  "비용",
  "브랜드귀뚜라미",
  "브랜드경동",
];

// ─────────────────────────────────────────────────────────────
// 제목 패턴 — data.js 소유. 생성기는 소비만 한다.
//   ★ 출장업종 → {aptName}/{livingArea} 토큰 미사용. {region} {menu} 축만.
//   ★ region 중복 방지: 패턴 내 {region} 1회만.
// ─────────────────────────────────────────────────────────────
const TP = (kase) => [
  `{region} ${kase}`,
  `{region} ${kase} 안내`,
  `{region} ${kase} 체크사항`,
  `{region} ${kase} 준비 전 확인사항`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 진행절차`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 12개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축(시공범위·발생원인·진행절차·관리방법).
//   useApt 전부 false (출장업종). weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const BOILER_TREATMENTS = [
  // ── 보일러교체 ───────────────────────────────
  {
    id: "bl_replace", industry: "boiler", name: "보일러교체", cat: "교체", emoji: "🔄",
    titlePatterns: TP("보일러교체"),
    keywords: ["보일러교체", "노후 보일러", "보일러 교체", "보일러 노후화"],
    analysisAxis: ["노후화", "철거 범위", "신규 설치", "배관 점검"],
    useApt: false, compareWith: "콘덴싱보일러설치", rank: 1, recommendedWeight: 12,
  },

  // ── 콘덴싱보일러설치 ─────────────────────────
  {
    id: "bl_install", industry: "boiler", name: "콘덴싱보일러설치", cat: "설치", emoji: "🔥",
    titlePatterns: TP("콘덴싱보일러설치"),
    keywords: ["콘덴싱보일러설치", "콘덴싱 보일러", "친환경 보일러", "보일러 설치"],
    analysisAxis: ["설치 환경", "연통·배관", "전기·가스배관", "시운전"],
    useApt: false, compareWith: "보일러교체", rank: 1, recommendedWeight: 12,
  },

  // ── 보일러고장원인 ───────────────────────────
  {
    id: "bl_cause", industry: "boiler", name: "보일러고장원인", cat: "고장원인", emoji: "⚠️",
    titlePatterns: TP("보일러고장원인"),
    keywords: ["보일러고장원인", "보일러 고장", "보일러 작동불량", "보일러 점검"],
    analysisAxis: ["노후화", "온수불량", "난방불량", "연통·배관"],
    useApt: false, compareWith: "보일러에러코드", rank: 1, recommendedWeight: 9,
  },

  // ── 보일러에러코드 ───────────────────────────
  {
    id: "bl_errorcode", industry: "boiler", name: "보일러에러코드", cat: "에러코드", emoji: "🔢",
    titlePatterns: TP("보일러에러코드"),
    keywords: ["보일러에러코드", "보일러 에러", "에러 표시", "보일러 코드"],
    analysisAxis: ["에러 표시 의미", "확인 순서", "점검 항목", "현장 확인"],
    useApt: false, compareWith: "보일러고장원인", rank: 1, recommendedWeight: 9,
  },

  // ── 온수안나옴 ───────────────────────────────
  {
    id: "bl_hotwater", industry: "boiler", name: "온수안나옴", cat: "온수", emoji: "🚿",
    titlePatterns: TP("온수안나옴"),
    keywords: ["온수안나옴", "온수 불량", "온수 안나옴", "온수 점검"],
    analysisAxis: ["온수불량 원인", "확인 항목", "점검 순서", "현장 확인"],
    useApt: false, compareWith: "난방안됨", rank: 1, recommendedWeight: 8,
  },

  // ── 난방안됨 ─────────────────────────────────
  {
    id: "bl_heating", industry: "boiler", name: "난방안됨", cat: "난방", emoji: "🌡️",
    titlePatterns: TP("난방안됨"),
    keywords: ["난방안됨", "난방 불량", "난방 안됨", "난방 점검"],
    analysisAxis: ["난방불량 원인", "배관·분배기", "점검 순서", "현장 확인"],
    useApt: false, compareWith: "온수안나옴", rank: 1, recommendedWeight: 8,
  },

  // ── 보일러누수 ───────────────────────────────
  {
    id: "bl_leak", industry: "boiler", name: "보일러누수", cat: "누수", emoji: "💧",
    titlePatterns: TP("보일러누수"),
    keywords: ["보일러누수", "보일러 물샘", "보일러 누수", "누수 점검"],
    analysisAxis: ["누수 발생 위치", "배관·연결부", "점검 순서", "현장 확인"],
    useApt: false, compareWith: "보일러배관청소", rank: 1, recommendedWeight: 8,
  },

  // ── 보일러배관청소 ───────────────────────────
  {
    id: "bl_pipeclean", industry: "boiler", name: "보일러배관청소", cat: "배관청소", emoji: "🔧",
    titlePatterns: TP("보일러배관청소"),
    keywords: ["보일러배관청소", "난방배관 청소", "배관 세척", "배관 관리"],
    analysisAxis: ["배관 침전물", "청소 필요 신호", "진행 순서", "관리 주기"],
    useApt: false, compareWith: "보일러누수", rank: 1, recommendedWeight: 8,
  },

  // ── 보일러교체시기 ───────────────────────────
  {
    id: "bl_timing", industry: "boiler", name: "보일러교체시기", cat: "교체시기", emoji: "📅",
    titlePatterns: TP("보일러교체시기"),
    keywords: ["보일러교체시기", "보일러 수명", "교체 시점", "보일러 연식"],
    analysisAxis: ["사용 연수", "고장 빈도", "효율 저하", "판단 기준"],
    useApt: false, compareWith: "보일러교체", rank: 1, recommendedWeight: 8,
  },

  // ── 보일러설치비용 ───────────────────────────
  {
    id: "bl_quote", industry: "boiler", name: "보일러설치비용", cat: "비용", emoji: "📋",
    titlePatterns: TP("보일러설치비용"),
    keywords: ["보일러설치비용", "보일러 비용", "설치 비용 요소", "교체 비용"],
    analysisAxis: ["용량·기종", "배관·철거 범위", "설치 환경", "영향 요소"],
    useApt: false, compareWith: "콘덴싱보일러설치", rank: 1, recommendedWeight: 6,
  },

  // ── 귀뚜라미보일러 ───────────────────────────
  {
    id: "bl_brandkd", industry: "boiler", name: "귀뚜라미보일러", cat: "브랜드귀뚜라미", emoji: "🏭",
    titlePatterns: TP("귀뚜라미보일러"),
    keywords: ["귀뚜라미보일러", "귀뚜라미 콘덴싱", "귀뚜라미 설치", "귀뚜라미 교체"],
    analysisAxis: ["기종 특징", "설치 환경", "확인 항목", "현장 확인"],
    useApt: false, compareWith: "경동나비엔보일러", rank: 1, recommendedWeight: 6,
  },

  // ── 경동나비엔보일러 ─────────────────────────
  {
    id: "bl_brandkdn", industry: "boiler", name: "경동나비엔보일러", cat: "브랜드경동", emoji: "🏭",
    titlePatterns: TP("경동나비엔보일러"),
    keywords: ["경동나비엔보일러", "나비엔 콘덴싱", "경동 설치", "나비엔 교체"],
    analysisAxis: ["기종 특징", "설치 환경", "확인 항목", "현장 확인"],
    useApt: false, compareWith: "귀뚜라미보일러", rank: 1, recommendedWeight: 6,
  },
];

// 정보블럭 데이터 — generateBoiler.js pickInfoBlock에서 소비
//   ★ cat 12종 = block 12종 1:1. 박제 0종. 절차·체크포인트 등 시점 무관 구조 정보만.
export const BOILER_INFO_BLOCKS = {
  replace: {
    title: "보일러교체 확인 포인트",
    items: [
      "기존 보일러 노후화·고장 빈도",
      "기존 배관·연통 재사용 가능 여부",
      "철거 범위·신규 설치 환경",
      "용량·기종 적정성 확인",
    ],
  },
  install: {
    title: "콘덴싱보일러설치 확인 포인트",
    items: [
      "설치 환경(실내·외부·보일러실) 확인",
      "연통 경로·배기 여건",
      "가스배관·전기·배수라인 여건",
      "응축수 배수 경로 확보",
    ],
  },
  cause: {
    title: "보일러 고장 원인 점검 포인트",
    items: [
      "노후화에 따른 부품 마모",
      "온수·난방 불량 여부 구분",
      "연통·배관 막힘·부식",
      "에러코드 표시 여부",
    ],
  },
  errorcode: {
    title: "보일러 에러코드 확인 포인트",
    items: [
      "에러 표시 위치·반복 여부",
      "전원 재시작 후 재현 여부",
      "온수·난방 중 어느 동작에서 발생하는지",
      "※ 코드 의미는 기종별 상이 — 현장 확인 후 판단",
    ],
  },
  hotwater: {
    title: "온수 불량 점검 포인트",
    items: [
      "온수만 안 나오는지 난방도 함께인지",
      "수전·필터·배관 영향 여부",
      "온도조절기 설정 확인",
      "기종·배관에 따라 원인 상이 — 현장 확인",
    ],
  },
  heating: {
    title: "난방 불량 점검 포인트",
    items: [
      "전체 난방·일부 구역 차이",
      "분배기·난방배관 영향 여부",
      "배관 내 공기·침전물 여부",
      "온도조절기·순환 상태 확인",
    ],
  },
  leak: {
    title: "보일러 누수 점검 포인트",
    items: [
      "누수 발생 위치(본체·연결부·배관)",
      "온수배관·난방배관 구분",
      "압력 저하 동반 여부",
      "※ 누수 위치는 현장 확인 후 판단",
    ],
  },
  pipeclean: {
    title: "보일러 배관청소 확인 포인트",
    items: [
      "난방배관 내 침전물·슬러지",
      "난방 온도 편차·순환 저하 신호",
      "청소 진행 순서",
      "기종·배관 구조에 따른 관리 주기",
    ],
  },
  timing: {
    title: "보일러 교체시기 판단 포인트",
    items: [
      "사용 연수(일반적 권장 교체 연한)",
      "고장·수리 빈도 증가",
      "난방·온수 효율 저하 체감",
      "부품 단종 여부",
    ],
  },
  quote: {
    title: "보일러 설치비용 영향 요소",
    items: [
      "용량·기종(일반/콘덴싱)",
      "기존 보일러 철거·배관 범위",
      "설치 환경(연통·배관 경로)",
      "※ 정확한 금액은 현장 확인 후 산출",
    ],
  },
  brandkd: {
    title: "귀뚜라미보일러 확인 포인트",
    items: [
      "설치 환경에 맞는 기종 범위",
      "연통·배관 여건 확인",
      "기존 설비와의 호환·교체 범위",
      "현장 확인 후 기종 판단",
    ],
  },
  brandkdn: {
    title: "경동나비엔보일러 확인 포인트",
    items: [
      "설치 환경에 맞는 기종 범위",
      "연통·배관 여건 확인",
      "기존 설비와의 호환·교체 범위",
      "현장 확인 후 기종 판단",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·작업일지·Before/After 금지)
//   섹션 사진 슬롯 4개: SCOPE(시공범위)/CAUSE(발생원인)/PROCESS(진행절차)/FINISH(관리·마무리)
export const BOILER_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 보일러설치 작업 범위 안내" },
  { slot: "cause",   alt: "보일러 점검 항목 안내 자료" },
  { slot: "process", alt: "보일러 설치 진행 순서 안내" },
  { slot: "finish",  alt: "보일러 관리·확인 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const BOILER_COMPARE = {
  compareWith: "콘덴싱보일러설치",
  compareWithText2: "현장 확인",
};

// BLOCK_MAP 격리용 — 하수구막힘/누수탐지/저수조청소/수도설비/에어컨 등 인접업종과 교차 오염 차단.
//   boiler는 '보일러 설치·교체·고장·난방·온수·배관' 정보만. 인접 토큰 차단.
export const BOILER_BLOCK_KEYWORDS = [
  "하수구막힘", "누수탐지", "저수조청소", "수도설비", "에어컨청소", "시스템에어컨",
  "분해청소", "고압세척", "줄눈", "탄성코트", "입주청소",
];
