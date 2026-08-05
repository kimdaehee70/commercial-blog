// lib/sewer-data.js
// 하수구막힘(sewer) 업종 데이터셋 — v1 / 정보형 + 원인·점검·작업절차·예방 안내 가이드형
// 화자 = {region} 하수구막힘 업체. 정보형(원인·점검·내시경·고압세척·이물질제거·예방관리).
//   후기·체험·과장광고·최저가·1등업체·즉시해결·당일해결·확실히해결·완벽해결 금지.
// 복제 베이스: leakdetect-data.js 70% (현장출동·정보형 구조 동형).
//   - cat 구성 + titlePatterns data.js 소유 동형.
//   - ★ APT_DATA 미사용(아파트명 강제 없음). 지역=대표지역+생활권 둘 다.
//   - 출장/현장출동 업종 → 고정 사업장 위치블록 미노출(_locStore={}).
// industry='sewer' 고정. 메뉴 10개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 원인분석/작업절차 안내형으로 차별화.
//   - 관련도 노출 축 = 발생원인/점검·확인/작업절차(내시경·고압세척·이물질제거)/예방관리.
//
// ★ 절대 금지(정보형 고정): 후기형·체험형·감사합니다 고객님·추천합니다
//   ·최저가·1등업체·즉시해결·당일해결·확실히 해결·완벽 해결.
//   허용 = 원인 / 점검 / 관리방법 / 확인사항 / 시공범위 / 작업절차 / 예방방법.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const SEWER_META = {
  industry: "sewer",
  label: "하수구막힘",
  fullLabel: "하수구막힘 안내",
  greeting: "안녕하세요. {region} 하수구막힘 업체입니다.",
  voice: "{region} 하수구막힘 업체",
  badge: "신규",
  decisionCycle: "compare",
  // 비용 단정 금지 — 막힘 위치·배관 상태·작업 범위 변수 → "영향 요소" 톤
  costTone: "consult",
  synonyms: ["하수구막힘", "배수막힘", "배관막힘"],
};

// 막힘 유형 — 본문/제목 다양화용.
export const SEWER_CLOG_TYPES = [
  "싱크대막힘", "변기막힘", "세면대막힘", "배수구막힘",
  "하수구역류", "하수구악취", "욕실배수막힘", "주방배수막힘",
];

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const SEWER_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "업계최고", "1등 업체", "1등업체", "1위", "전국1위", "최고",
  "100% 해결", "100퍼센트 해결", "완벽 해결", "완벽", "역대급", "초대박", "대박",
  // 즉시·당일 단정 (현장출동 과장 차단)
  "즉시해결", "즉시 해결", "당일해결", "당일 해결", "확실히 해결", "확실해결",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "추천합니다", "강력 추천", "강력추천", "추천 업체", "강추",
  // 후기·체험담
  "직접 해봤", "내돈내산", "시공후기", "리얼후기", "후기입니다", "고객님 후기", "만족도",
  "감사합니다 고객님",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 10개)
export const SEWER_CATS = [
  "하수구막힘",
  "싱크대막힘",
  "변기막힘",
  "세면대막힘",
  "배수구막힘",
  "하수구역류",
  "하수구악취",
  "하수구고압세척",
  "배관내시경",
  "횡주관청소",
];

// ─────────────────────────────────────────────────────────────
// 지역 — 대표지역 + 생활권 둘 다 사용 (APT_DATA 미사용).
//   생성기는 region 문자열만 사용. 단지명 강제 없음.
//   예시: 노원구 공릉동 / 노원구 하계동 / 노원구 월계동
// ─────────────────────────────────────────────────────────────
export const SEWER_REGION_SAMPLES = [
  "노원구 공릉동", "노원구 하계동", "노원구 월계동", "노원구 상계동",
];

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환만. (aptName/livingArea 미사용)
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
//   형식 = 지역 + 메뉴 + 정보키워드(원인/점검/관리방법/확인절차/작업범위/예방방법).
// ─────────────────────────────────────────────────────────────

// 하수구막힘 (대표 메뉴)
const TP_SEWER = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 작업절차 안내`,
  `{region} ${kase} 예방방법`,
  `{region} ${kase} 확인사항 정리`,
];

// 싱크대막힘
const TP_SINK = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 작업절차 안내`,
];

// 변기막힘
const TP_TOILET = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 확인절차`,
  `{region} ${kase} 예방방법`,
];

// 세면대막힘
const TP_WASHBASIN = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 작업절차`,
];

// 배수구막힘
const TP_DRAIN = (kase) => [
  `{region} ${kase} 원인 점검`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 작업범위 안내`,
  `{region} ${kase} 예방방법`,
];

// 하수구역류
const TP_BACKFLOW = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 대처 확인절차`,
  `{region} ${kase} 예방방법`,
];

// 하수구악취
const TP_ODOR = (kase) => [
  `{region} ${kase} 원인 확인`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 확인절차`,
];

// 하수구고압세척
const TP_JET = (kase) => [
  `{region} ${kase} 작업절차 안내`,
  `{region} ${kase} 작업범위`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 확인사항 정리`,
];

// 배관내시경
const TP_SCOPE = (kase) => [
  `{region} ${kase} 확인절차`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 작업절차 안내`,
  `{region} ${kase} 확인사항`,
];

// 횡주관청소
const TP_LATERAL = (kase) => [
  `{region} ${kase} 작업범위 안내`,
  `{region} ${kase} 점검사항`,
  `{region} ${kase} 작업절차`,
  `{region} ${kase} 예방방법`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 원인·점검·작업절차·예방관리
//   ★ useApt 전부 false (APT_DATA 미사용).
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const SEWER_TREATMENTS = [
  // ── 하수구막힘 (대표) ──────────────────────────
  {
    id: "sw_main", industry: "sewer", name: "하수구막힘", cat: "하수구막힘", emoji: "🚿",
    titlePatterns: TP_SEWER("하수구막힘"),
    keywords: ["하수구막힘 원인", "하수구 점검", "배관 막힘 확인", "하수구 작업절차"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "배수구막힘", rank: 1, recommendedWeight: 16,
  },

  // ── 싱크대막힘 ────────────────────────────────
  {
    id: "sw_sink", industry: "sewer", name: "싱크대막힘", cat: "싱크대막힘", emoji: "🧽",
    titlePatterns: TP_SINK("싱크대막힘"),
    keywords: ["싱크대 막힘 원인", "주방 배수 막힘", "음식물 찌꺼기 막힘", "싱크대 점검"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "세면대막힘", rank: 1, recommendedWeight: 12,
  },

  // ── 변기막힘 ──────────────────────────────────
  {
    id: "sw_toilet", industry: "sewer", name: "변기막힘", cat: "변기막힘", emoji: "🚽",
    titlePatterns: TP_TOILET("변기막힘"),
    keywords: ["변기 막힘 원인", "변기 막힘 점검", "이물질 막힘", "변기 배수 확인"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "하수구막힘", rank: 1, recommendedWeight: 12,
  },

  // ── 세면대막힘 ────────────────────────────────
  {
    id: "sw_washbasin", industry: "sewer", name: "세면대막힘", cat: "세면대막힘", emoji: "🪥",
    titlePatterns: TP_WASHBASIN("세면대막힘"),
    keywords: ["세면대 막힘 원인", "머리카락 막힘", "욕실 배수 막힘", "세면대 점검"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "싱크대막힘", rank: 2, recommendedWeight: 9,
  },

  // ── 배수구막힘 ────────────────────────────────
  {
    id: "sw_drain", industry: "sewer", name: "배수구막힘", cat: "배수구막힘", emoji: "🕳️",
    titlePatterns: TP_DRAIN("배수구막힘"),
    keywords: ["배수구 막힘 원인", "바닥 배수 막힘", "배수 트랩 점검", "배수구 확인"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "하수구막힘", rank: 2, recommendedWeight: 9,
  },

  // ── 하수구역류 ────────────────────────────────
  {
    id: "sw_backflow", industry: "sewer", name: "하수구역류", cat: "하수구역류", emoji: "🌊",
    titlePatterns: TP_BACKFLOW("하수구역류"),
    keywords: ["하수구 역류 원인", "배수 역류 점검", "공용관 역류", "역류 확인사항"],
    analysisAxis: ["발생 원인", "점검·확인", "작업 절차", "예방 관리"],
    useApt: false, compareWith: "횡주관청소", rank: 1, recommendedWeight: 9,
  },

  // ── 하수구악취 ────────────────────────────────
  {
    id: "sw_odor", industry: "sewer", name: "하수구악취", cat: "하수구악취", emoji: "👃",
    titlePatterns: TP_ODOR("하수구악취"),
    keywords: ["하수구 악취 원인", "배수 트랩 봉수", "악취 점검", "하수구 냄새 확인"],
    analysisAxis: ["발생 원인", "점검·확인", "관리 방법", "예방 관리"],
    useApt: false, compareWith: "하수구막힘", rank: 1, recommendedWeight: 8,
  },

  // ── 하수구고압세척 ────────────────────────────
  {
    id: "sw_jet", industry: "sewer", name: "하수구고압세척", cat: "하수구고압세척", emoji: "💦",
    titlePatterns: TP_JET("하수구고압세척"),
    keywords: ["고압세척 작업", "하수관 세척", "배관 고압세척 범위", "세척 절차"],
    analysisAxis: ["작업 절차", "작업 범위", "점검·확인", "예방 관리"],
    useApt: false, compareWith: "횡주관청소", rank: 1, recommendedWeight: 9,
  },

  // ── 배관내시경 ────────────────────────────────
  {
    id: "sw_scope", industry: "sewer", name: "배관내시경", cat: "배관내시경", emoji: "🔍",
    titlePatterns: TP_SCOPE("배관내시경"),
    keywords: ["배관 내시경 점검", "배관 상태 확인", "내시경 검사 절차", "관로 점검"],
    analysisAxis: ["점검·확인", "작업 절차", "작업 범위", "예방 관리"],
    useApt: false, compareWith: "하수구고압세척", rank: 1, recommendedWeight: 8,
  },

  // ── 횡주관청소 ────────────────────────────────
  {
    id: "sw_lateral", industry: "sewer", name: "횡주관청소", cat: "횡주관청소", emoji: "🛠️",
    titlePatterns: TP_LATERAL("횡주관청소"),
    keywords: ["횡주관 청소 범위", "공용 배관 청소", "관로 청소 절차", "횡주관 점검"],
    analysisAxis: ["작업 범위", "작업 절차", "점검·확인", "예방 관리"],
    useApt: false, compareWith: "하수구고압세척", rank: 2, recommendedWeight: 8,
  },
];

// 정보블럭 데이터 — generateSewer.js renderInfoBlock에서 소비
//   ★ 원인·점검·작업절차·예방 등 시점 무관 구조 정보만. INFO_BLOCKS 8종.
export const SEWER_INFO_BLOCKS = {
  cause: {
    title: "발생 원인",
    items: [
      "음식물 찌꺼기·기름때 누적",
      "머리카락·이물질 엉킴",
      "배관 노후·구배 불량·이물질 투입",
      "※ 막힘 위치·배관 상태에 따라 원인은 달라질 수 있음",
    ],
  },
  process: {
    title: "작업 절차",
    items: [
      "현장 상태·막힘 위치 확인",
      "배관 내시경으로 막힘 구간 점검",
      "고압세척·이물질 제거 진행",
      "배수 흐름 확인 → 후속 안내",
    ],
  },
  equipment: {
    title: "작업 장비",
    items: [
      "고압세척기(관 내부 세척)",
      "배관 내시경(막힘 구간 확인)",
      "스프링·관통기(이물질 제거)",
      "관로 탐지(위치 확인)",
    ],
  },
  scope: {
    title: "작업 범위",
    items: [
      "막힘 구간 한정 점검 후 작업",
      "배관·트랩·연결부 상태 점검",
      "작업 범위는 현장 상태에 따라 구분",
      "※ 범위·방식은 현장 확인 후 안내",
    ],
  },
  check: {
    title: "점검·확인 항목",
    items: [
      "배수 속도·역류 여부 확인",
      "악취·봉수 상태 확인",
      "막힘 위치(실내/공용관) 구분",
      "내시경 점검 후 상태 확인",
    ],
  },
  prevent: {
    title: "예방 관리",
    items: [
      "음식물 거름망·이물질 차단",
      "기름·이물질 배수구 투입 자제",
      "주기적 배수 흐름 점검",
      "이상 징후 시 조기 점검",
    ],
  },
  odor: {
    title: "악취·봉수 관리",
    items: [
      "배수 트랩 봉수 유지 확인",
      "장기 미사용 배수구 물 보충",
      "공용관 연결부 상태 확인",
      "이물질·찌꺼기 누적 여부 점검",
    ],
  },
  prebook: {
    title: "예약 전 확인 체크리스트",
    items: [
      "막힘 위치·증상 정리",
      "작업 가능 시간대 협의",
      "작업 범위·장비 사전 확인",
      "점검 결과·기록 제공 여부",
    ],
  },
};

// 사진 슬롯 — 4개 (정보형, 캡션 선택. 현장 연출·후기 금지)
//   ★ PHOTO_SCOPE / PHOTO_CAUSE / PHOTO_PROCESS / PHOTO_FINISH
export const SEWER_PHOTO_POOL = [
  { slot: "PHOTO_SCOPE",   alt: "{region} 하수구막힘 작업 범위 안내" },
  { slot: "PHOTO_CAUSE",   alt: "막힘 발생 원인 안내 자료" },
  { slot: "PHOTO_PROCESS", alt: "작업 절차·점검 안내 자료" },
  { slot: "PHOTO_FINISH",  alt: "하수구막힘 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const SEWER_COMPARE = {
  compareWith: "배수구막힘",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 인접 설비/청소 업종과 교차 오염 차단.
//   sewer는 '막힘 원인·점검·작업절차·예방' 정보만.
//   누수탐지(누수)·저수조청소(급수)·방역(소독)·인테리어(시공)와 구분.
export const SEWER_BLOCK_KEYWORDS = [
  "누수탐지", "누수", "저수조청소", "물탱크청소", "방역소독", "방역", "입주청소", "인테리어", "줄눈시공", "탄성코트",
];
