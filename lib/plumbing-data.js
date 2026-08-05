// lib/plumbing-data.js
// 수도설비(plumbing) 업종 데이터셋 — v1 / 정보형 + 범위·원인·절차·관리 안내 가이드형
// 화자 = {region} 수도설비 업체. 정보형(설비범위·배관종류·계량기·노후원인·점검·유지관리).
//   후기·체험·과장광고·최저가·1등업체·즉시해결·당일해결·확실히해결·완벽해결 금지.
// 복제 베이스: sewer-data.js 70% (현장출동·정보형 구조 동형).
//   - cat 구성 + titlePatterns data.js 소유 동형.
//   - ★ APT_DATA 미사용(아파트명 강제 없음). 지역=대표지역+생활권 둘 다.
//   - 출장/현장출동 업종 → 고정 사업장 위치블록 미노출(_locStore={}).
// industry='plumbing' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 설비범위/배관구조 안내형으로 차별화.
//   - 관련도 노출 축 = 작업범위/원인설명/진행절차/유지관리.
//
// ★ 절대 금지(정보형 고정): 후기형·체험형·감사합니다 고객님·추천합니다
//   ·최저가·1등업체·즉시해결·당일해결·확실히 해결·완벽 해결·출동·긴급출동·전후사진.
//   허용 = 범위 / 원인 / 절차 / 관리방법 / 확인사항 / 점검 / 유지관리.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const PLUMBING_META = {
  industry: "plumbing",
  label: "수도설비",
  fullLabel: "수도설비 안내",
  greeting: "안녕하세요. {region} 수도설비 업체입니다.",
  voice: "{region} 수도설비 업체",
  badge: "신규",
  decisionCycle: "compare",
  // 비용 단정 금지 — 배관 상태·작업 범위·자재 변수 → "영향 요소" 톤
  costTone: "consult",
  synonyms: ["수도설비", "수도배관", "급배수설비"],
};

// 설비 유형 — 본문/제목 다양화용.
export const PLUMBING_WORK_TYPES = [
  "급수배관", "배수배관", "수도계량기", "밸브교체",
  "온수기", "싱크대수도", "상수도", "하수도",
];

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const PLUMBING_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "업계최고", "1등 업체", "1등업체", "1위", "전국1위", "최고",
  "100% 해결", "100퍼센트 해결", "완벽 해결", "완벽", "역대급", "초대박", "대박",
  // 즉시·당일·출동 단정 (현장출동 과장 차단)
  "즉시해결", "즉시 해결", "당일해결", "당일 해결", "확실히 해결", "확실해결",
  "출동", "긴급출동", "전후사진",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "추천합니다", "강력 추천", "강력추천", "추천 업체", "강추",
  // 후기·체험담
  "직접 해봤", "내돈내산", "시공후기", "리얼후기", "후기입니다", "고객님 후기", "만족도",
  "감사합니다 고객님",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const PLUMBING_CATS = [
  "수도설비",
  "수도배관설치",
  "수도배관수리",
  "수도계량기설치",
  "상하수도배관공사",
  "싱크대수도설치",
  "전기온수기설치",
  "수도배관위치변경",
];

// ─────────────────────────────────────────────────────────────
// 지역 — 대표지역 + 생활권 둘 다 사용 (APT_DATA 미사용).
//   생성기는 region 문자열만 사용. 단지명 강제 없음.
//   예시: 노원구 공릉동 / 노원구 하계동 / 노원구 월계동
// ─────────────────────────────────────────────────────────────
export const PLUMBING_REGION_SAMPLES = [
  "노원구 공릉동", "노원구 하계동", "노원구 월계동", "노원구 상계동",
];

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환만. (aptName/livingArea 미사용)
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
//   형식 = 지역 + 메뉴 + 정보키워드(안내/확인사항/체크사항/진행범위).
//   ★ 후기형(시공후기/다녀왔습니다/해결했습니다) 금지.
// ─────────────────────────────────────────────────────────────

// 수도설비 (대표 메뉴)
const TP_PLUMBING = (kase) => [
  `{region} ${kase}`,
  `{region} ${kase} 안내`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 준비 전 체크사항`,
  `{region} ${kase} 진행 범위`,
];

// 수도배관설치
const TP_INSTALL = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 진행 범위`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 준비 전 체크사항`,
];

// 수도배관수리
const TP_REPAIR = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 점검 절차`,
  `{region} ${kase} 진행 범위`,
];

// 수도계량기설치
const TP_METER = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 진행 범위`,
  `{region} ${kase} 준비 전 체크사항`,
];

// 상하수도배관공사
const TP_SUPPLY = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 진행 범위`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 점검 절차`,
];

// 싱크대수도설치
const TP_SINK = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 진행 범위`,
  `{region} ${kase} 준비 전 체크사항`,
];

// 전기온수기설치
const TP_HEATER = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 준비 전 체크사항`,
  `{region} ${kase} 진행 범위`,
];

// 수도배관위치변경
const TP_RELOCATE = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 진행 범위`,
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 점검 절차`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 범위·원인·절차·관리
//   ★ useApt 전부 false (APT_DATA 미사용).
//   weight 합계 100. (16/14/14/12/12/12/10/10)
// ─────────────────────────────────────────────────────────────
export const PLUMBING_TREATMENTS = [
  // ── 수도설비 (대표) ──────────────────────────
  {
    id: "pl_main", industry: "plumbing", name: "수도설비", cat: "수도설비", emoji: "🚰",
    titlePatterns: TP_PLUMBING("수도설비"),
    keywords: ["수도설비 범위", "수도배관 안내", "급배수 설비", "수도설비 점검"],
    analysisAxis: ["작업 범위", "발생 원인", "진행 절차", "유지 관리"],
    useApt: false, compareWith: "수도배관설치", rank: 1, recommendedWeight: 16,
  },

  // ── 수도배관설치 ──────────────────────────────
  {
    id: "pl_install", industry: "plumbing", name: "수도배관설치", cat: "수도배관설치", emoji: "🔧",
    titlePatterns: TP_INSTALL("수도배관설치"),
    keywords: ["수도배관 설치 범위", "급수관 설치", "배수관 설치", "배관 설치 절차"],
    analysisAxis: ["작업 범위", "진행 절차", "점검·확인", "유지 관리"],
    useApt: false, compareWith: "수도배관수리", rank: 1, recommendedWeight: 14,
  },

  // ── 수도배관수리 ──────────────────────────────
  {
    id: "pl_repair", industry: "plumbing", name: "수도배관수리", cat: "수도배관수리", emoji: "🛠️",
    titlePatterns: TP_REPAIR("수도배관수리"),
    keywords: ["수도배관 수리 원인", "누수 부위 점검", "노후 배관 수리", "연결부 확인"],
    analysisAxis: ["발생 원인", "점검·확인", "진행 절차", "유지 관리"],
    useApt: false, compareWith: "수도설비", rank: 1, recommendedWeight: 14,
  },

  // ── 수도계량기설치 ────────────────────────────
  {
    id: "pl_meter", industry: "plumbing", name: "수도계량기설치", cat: "수도계량기설치", emoji: "📟",
    titlePatterns: TP_METER("수도계량기설치"),
    keywords: ["수도계량기 설치", "계량기 연결 배관", "차단밸브 안내", "계량기 보호함"],
    analysisAxis: ["작업 범위", "진행 절차", "점검·확인", "유지 관리"],
    useApt: false, compareWith: "수도설비", rank: 2, recommendedWeight: 12,
  },

  // ── 상하수도배관공사 ──────────────────────────
  {
    id: "pl_supply", industry: "plumbing", name: "상하수도배관공사", cat: "상하수도배관공사", emoji: "🏗️",
    titlePatterns: TP_SUPPLY("상하수도배관공사"),
    keywords: ["상하수도 배관 공사", "상수도 배관", "하수도 배관", "배수라인 안내"],
    analysisAxis: ["작업 범위", "진행 절차", "점검·확인", "유지 관리"],
    useApt: false, compareWith: "수도배관설치", rank: 1, recommendedWeight: 12,
  },

  // ── 싱크대수도설치 ────────────────────────────
  {
    id: "pl_sink", industry: "plumbing", name: "싱크대수도설치", cat: "싱크대수도설치", emoji: "🧫",
    titlePatterns: TP_SINK("싱크대수도설치"),
    keywords: ["싱크대 수도 설치", "급수라인 연결", "배수라인 연결", "정수기 라인"],
    analysisAxis: ["작업 범위", "진행 절차", "점검·확인", "유지 관리"],
    useApt: false, compareWith: "수도설비", rank: 2, recommendedWeight: 12,
  },

  // ── 전기온수기설치 ────────────────────────────
  {
    id: "pl_heater", industry: "plumbing", name: "전기온수기설치", cat: "전기온수기설치", emoji: "♨️",
    titlePatterns: TP_HEATER("전기온수기설치"),
    keywords: ["전기온수기 설치", "온수기 급수 연결", "온수기 배수라인", "온수기 전원 연결"],
    analysisAxis: ["작업 범위", "점검·확인", "진행 절차", "유지 관리"],
    useApt: false, compareWith: "수도설비", rank: 2, recommendedWeight: 10,
  },

  // ── 수도배관위치변경 ──────────────────────────
  {
    id: "pl_relocate", industry: "plumbing", name: "수도배관위치변경", cat: "수도배관위치변경", emoji: "🔀",
    titlePatterns: TP_RELOCATE("수도배관위치변경"),
    keywords: ["수도배관 위치 변경", "급수관 이설", "배수관 이설", "싱크대 배관 이동"],
    analysisAxis: ["작업 범위", "진행 절차", "점검·확인", "유지 관리"],
    useApt: false, compareWith: "수도배관설치", rank: 2, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generatePlumbing.js renderInfoBlock에서 소비
//   ★ 범위·원인·절차·관리 등 시점 무관 구조 정보만. INFO_BLOCKS 8종.
//   지침서 STEP7 INFO_BLOCKS 8종 직매핑.
export const PLUMBING_INFO_BLOCKS = {
  // 1. 수도배관 종류
  pipetype: {
    title: "수도배관 종류",
    items: [
      "급수관(상수 공급) / 배수관(오수 배출) 구분",
      "동관·스테인리스·PB·엑셀 등 자재별 특성",
      "매립배관 / 노출배관 / 천장배관 구분",
      "※ 자재·배관 방식은 현장 상태에 따라 달라질 수 있음",
    ],
  },
  // 2. 급수와 배수 차이
  supplydrain: {
    title: "급수와 배수 차이",
    items: [
      "급수 = 수압으로 물을 공급하는 라인",
      "배수 = 중력·구배로 물을 흘려보내는 라인",
      "급수는 누수, 배수는 막힘·역류 점검 위주",
      "두 라인은 시공·점검 방식이 서로 다름",
    ],
  },
  // 3. 수도계량기 역할
  meter: {
    title: "수도계량기 역할",
    items: [
      "사용 수량 측정 / 누수 조기 확인 기준",
      "계량기 앞 차단밸브로 단수 구간 제어",
      "동파·노후 시 교체·보호함 점검",
      "계량기 위치·연결부 상태 확인",
    ],
  },
  // 4. 배관 노후화 원인
  aging: {
    title: "배관 노후화 원인",
    items: [
      "장기 사용에 따른 부식·스케일 누적",
      "연결부 패킹 노화·이음부 헐거움",
      "동결·수압 변화로 인한 손상",
      "※ 막힘·누수 위치에 따라 원인은 달라질 수 있음",
    ],
  },
  // 5. 온수기 설치 체크사항
  heatercheck: {
    title: "온수기 설치 체크사항",
    items: [
      "급수·배수 연결 위치 확인",
      "전원 용량·콘센트 위치 확인",
      "설치 공간·배수 경로 확보",
      "안전밸브·배관 연결부 점검",
    ],
  },
  // 6. 상하수도 구조 이해
  structure: {
    title: "상하수도 구조 이해",
    items: [
      "상수도 = 정수된 물 공급 계통",
      "하수도 = 오수·우수 배출 계통",
      "옥내배관 → 인입관 → 본관 흐름",
      "구간별 책임·점검 범위 구분",
    ],
  },
  // 7. 배관 유지관리 방법
  maintain: {
    title: "배관 유지관리 방법",
    items: [
      "주기적 누수·수압 점검",
      "동결 우려 구간 보온 관리",
      "연결부·밸브 상태 정기 확인",
      "이상 징후 시 조기 점검",
    ],
  },
  // 8. 수도설비 점검 항목
  checklist: {
    title: "수도설비 점검 항목",
    items: [
      "수압·급수 흐름 확인",
      "누수·결로·배수 상태 확인",
      "밸브·계량기·연결부 점검",
      "배관 노후·부식 여부 확인",
    ],
  },
};

// 사진 슬롯 — 4개 (정보형, 캡션 선택. 현장 연출·후기·전후사진 금지)
//   ★ PHOTO_SCOPE / PHOTO_CAUSE / PHOTO_PROCESS / PHOTO_FINISH
export const PLUMBING_PHOTO_POOL = [
  { slot: "PHOTO_SCOPE",   alt: "{region} 수도설비 작업 범위 안내" },
  { slot: "PHOTO_CAUSE",   alt: "배관 노후·점검 안내 자료" },
  { slot: "PHOTO_PROCESS", alt: "진행 절차·점검 안내 자료" },
  { slot: "PHOTO_FINISH",  alt: "수도설비 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const PLUMBING_COMPARE = {
  compareWith: "수도배관설치",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 인접 설비/청소 업종과 교차 오염 차단.
//   plumbing은 '설비범위·배관구조·원인·절차·유지관리' 정보만.
//   하수구막힘(막힘)·누수탐지(누수)·저수조청소(급수탱크)·방역(소독)·인테리어(시공)와 구분.
export const PLUMBING_BLOCK_KEYWORDS = [
  "하수구막힘", "변기막힘", "싱크대막힘", "누수탐지", "누수", "저수조청소", "물탱크청소",
  "방역소독", "방역", "입주청소", "인테리어", "줄눈시공", "탄성코트",
];
