import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/airclean.js";
// lib/airclean-data.js
// 에어컨청소(airclean) 업종 데이터셋 — v1 / 정보형 (유지관리 업종)
// 화자 = {region} 에어컨청소 업체. 정보형(오염·곰팡이·냄새·분해세척·관리주기).
//   후기·체험·과장광고·브랜드추천 금지. ★설치/교체/배관 = systemair 오염 → 전면 차단.
// 복제 베이스: coating-data.js (섹션루프형, 정보형 동형).
// industry='airclean' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 설치업종(systemair)과 완전 분리. 축이 다름: systemair=설치/교체/배관 / airclean=청소/분해세척/관리.
//   - useApt=false: 에어컨청소 검색은 단지명보다 곰팡이·냄새·분해청소·관리주기 비중이 높음.
//   - 관련도 노출 축 = 분해세척 / 곰팡이 / 냄새 / 누수 / 필터·내부 세척 차이 / 관리주기.
//   - 후기형 경쟁 진입 금지 → 정보형으로 차별화.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·만족도·추천·최고·완벽·전문가가 직접·업계 최고·최저가·할인·이벤트.
//   ★ 설치 오염 차단(systemair 분리): 설치·교체·추가설치·배관·선배관·단배관·전기증설·실외기실·가스충전·냉매충전·실외기설치·이전설치.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const AIRCLEAN_META = {
  industry: "airclean",
  label: "에어컨청소",
  fullLabel: "에어컨청소 안내",
  greeting: "안녕하세요. {region} 에어컨청소 업체입니다.",
  voice: "{region} 에어컨청소 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
//   후기형·과장광고·할인이벤트 + ★설치 오염어(systemair 분리)
export const AIRCLEAN_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고", "역대급", "초대박", "대박",
  "100% 만족", "100%", "완벽", "전문가가 직접",
  // 할인·이벤트(영업 유인 금지)
  "할인", "이벤트",
  // 보장·추천·순위 (정보형 고정)
  "보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 후기·체험담·내돈내산·만족
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 청소 후기", "만족", "만족도",
  // ★ 설치 오염 차단 (systemair 분리) — 청소업종은 설치/교체/배관 언급 금지
  "설치", "교체", "추가설치", "배관", "선배관", "단배관", "전기증설",
  "실외기실", "가스충전", "냉매충전", "실외기설치", "이전설치",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const AIRCLEAN_CATS = [
  "벽걸이",
  "스탠드",
  "천장형",
  "분해청소",
  "냄새점검",
  "곰팡이제거",
  "누수점검",
  "관리주기",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — airclean은 useApt=false 권장(단지 의존 낮음).
//   핸들러(coating 동형)가 APT_DATA/getAptPool/getAptMeta를 import하므로
//   구조 무오류용 빈 골격만 유지. 모든 메뉴 useApt:false → 단지명 미사용.
//   ※ 수요 시 지역 풀 확장 가능(현재 미사용).
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {};

export function getAptPool(regionKey) {
  const e = APT_DATA[regionKey];
  return e ? e.apts.map((a) => (typeof a === "string" ? a : a.name)) : [];
}

export function getAptMeta(regionKey, aptName) {
  const e = APT_DATA[regionKey];
  if (!e) return null;
  return e.apts.find((a) => (typeof a === "string" ? a : a.name) === aptName) || null;
}

// ─────────────────────────────────────────────────────────────
// 제목 패턴 — data.js 소유. 생성기는 소비만. useApt=false → {aptName} 토큰 미사용.
//   지역+행동/증상/관리 조합. 매장명 미노출.
// ─────────────────────────────────────────────────────────────

// 제품형 (벽걸이·스탠드·천장형 — 청소 범위/과정 축)
const TP_PRODUCT = (kase) => [
  `{region} ${kase} 분해세척 어디까지`,
  `{region} ${kase} 청소 과정 안내`,
  `{region} ${kase} 내부 오염 점검`,
  `${kase} 전 확인사항 정리`,
  `{region} ${kase} 관리 방법 안내`,
];

// 작업형 (분해청소 — 분해 범위·세척 축)
const TP_WORK = (kase) => [
  `{region} ${kase} 분해 범위 안내`,
  `{region} ${kase} 어디까지 분해하나`,
  `${kase} 필터·내부 세척 차이`,
  `{region} ${kase} 진행 순서 정리`,
  `${kase} 전 확인사항`,
];

// 증상형 (냄새·곰팡이·누수 — 원인·점검 축)
const TP_SYMPTOM = (kase) => [
  `{region} ${kase} 원인과 점검`,
  `${kase} 왜 생기나`,
  `{region} ${kase} 확인 포인트`,
  `${kase} 점검 전 확인사항`,
  `{region} ${kase} 관리 방법`,
];

// 관리형 (청소주기 — 주기·관리 축)
const TP_CARE = (kase) => [
  `{region} ${kase} 얼마나 자주`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 정리`,
  `${kase} 계절별 관리`,
  `{region} 에어컨 송풍 건조와 ${kase}`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   전 메뉴 useApt:false. weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const AIRCLEAN_TREATMENTS = [
  // ── 벽걸이 에어컨 청소 ──────────────────────────
  {
    id: "ac_wall", industry: "airclean", name: "벽걸이 에어컨 청소", cat: "벽걸이", emoji: "🧊",
    titlePatterns: TP_PRODUCT("벽걸이 에어컨 청소"),
    keywords: ["벽걸이 에어컨 청소", "벽걸이 분해청소", "벽걸이 곰팡이", "벽걸이 냄새"],
    analysisAxis: ["청소 필요성", "분해 범위", "내부 오염 점검", "청소 후 관리"],
    useApt: false, compareWith: "스탠드 에어컨 청소", rank: 1, recommendedWeight: 14,
  },

  // ── 스탠드 에어컨 청소 ──────────────────────────
  {
    id: "ac_stand", industry: "airclean", name: "스탠드 에어컨 청소", cat: "스탠드", emoji: "🌀",
    titlePatterns: TP_PRODUCT("스탠드 에어컨 청소"),
    keywords: ["스탠드 에어컨 청소", "스탠드 분해청소", "스탠드 곰팡이", "스탠드 냄새"],
    analysisAxis: ["청소 필요성", "분해 범위", "내부 오염 점검", "청소 후 관리"],
    useApt: false, compareWith: "벽걸이 에어컨 청소", rank: 1, recommendedWeight: 13,
  },

  // ── 시스템에어컨 청소 (천장형 — ★청소만, 설치 금지) ──
  {
    id: "ac_ceiling", industry: "airclean", name: "시스템에어컨 청소", cat: "천장형", emoji: "🔲",
    titlePatterns: TP_PRODUCT("시스템에어컨 청소"),
    keywords: ["시스템에어컨 청소", "천장형 에어컨 청소", "천장형 분해청소", "천장형 곰팡이"],
    analysisAxis: ["청소 필요성", "분해 범위", "내부 오염 점검", "청소 후 관리"],
    useApt: false, compareWith: "에어컨 분해청소", rank: 1, recommendedWeight: 12,
  },

  // ── 에어컨 분해청소 ─────────────────────────────
  {
    id: "ac_disasm", industry: "airclean", name: "에어컨 분해청소", cat: "분해청소", emoji: "🛠️",
    titlePatterns: TP_WORK("에어컨 분해청소"),
    keywords: ["에어컨 분해청소", "완전분해청소", "열교환기 세척", "송풍팬 세척"],
    analysisAxis: ["분해 범위", "필터와 내부 세척 차이", "고압세척 과정", "드레인 점검"],
    useApt: false, compareWith: "시스템에어컨 청소", rank: 1, recommendedWeight: 14,
  },

  // ── 에어컨 냄새 원인 점검 ───────────────────────
  {
    id: "ac_smell", industry: "airclean", name: "에어컨 냄새 원인 점검", cat: "냄새점검", emoji: "👃",
    titlePatterns: TP_SYMPTOM("에어컨 냄새"),
    keywords: ["에어컨 냄새", "에어컨 쉰내", "에어컨 곰팡이 냄새", "냄새 원인"],
    analysisAxis: ["냄새 발생 원인", "곰팡이·오염 관계", "송풍 건조 관리", "청소 필요 판단"],
    useApt: false, compareWith: "에어컨 곰팡이 제거", rank: 1, recommendedWeight: 12,
  },

  // ── 에어컨 곰팡이 제거 ──────────────────────────
  {
    id: "ac_mold", industry: "airclean", name: "에어컨 곰팡이 제거", cat: "곰팡이제거", emoji: "🦠",
    titlePatterns: TP_SYMPTOM("에어컨 곰팡이"),
    keywords: ["에어컨 곰팡이", "에어컨 곰팡이 제거", "송풍구 곰팡이", "내부 곰팡이"],
    analysisAxis: ["곰팡이 발생 원인", "분해 세척 범위", "송풍 건조 관리", "재발 예방"],
    useApt: false, compareWith: "에어컨 냄새 원인 점검", rank: 1, recommendedWeight: 12,
  },

  // ── 에어컨 물 떨어짐 원인 (누수 점검 — ★청소 관점) ──
  {
    id: "ac_leak", industry: "airclean", name: "에어컨 물 떨어짐 원인", cat: "누수점검", emoji: "💧",
    titlePatterns: TP_SYMPTOM("에어컨 물 떨어짐"),
    keywords: ["에어컨 물 떨어짐", "에어컨 누수", "드레인 막힘", "응축수 역류"],
    analysisAxis: ["물 떨어짐 원인", "드레인·응축수 관계", "오염·막힘 점검", "청소 관점 확인"],
    useApt: false, compareWith: "에어컨 분해청소", rank: 1, recommendedWeight: 11,
  },

  // ── 에어컨 청소 주기 ────────────────────────────
  {
    id: "ac_cycle", industry: "airclean", name: "에어컨 청소 주기", cat: "관리주기", emoji: "🗓️",
    titlePatterns: TP_CARE("에어컨 청소 주기"),
    keywords: ["에어컨 청소 주기", "에어컨 관리 주기", "필터 청소 주기", "계절 점검"],
    analysisAxis: ["권장 청소 주기", "필터 관리", "송풍 건조 습관", "계절별 점검"],
    useApt: false, compareWith: "에어컨 분해청소", rank: 1, recommendedWeight: 12,
  },
];

// 정보블럭 데이터 — generateAirclean.js pickInfoBlock에서 소비
//   ★ 절차·체크포인트 등 구조 정보만. cat 키와 1:1 매칭.
export const AIRCLEAN_INFO_BLOCKS = {
  벽걸이: {
    title: "벽걸이 에어컨 청소 확인 포인트",
    items: [
      "필터 청소 vs 내부 분해세척 차이",
      "송풍구·열교환기 오염 정도",
      "곰팡이·냄새 진행 상태",
      "청소 후 송풍 건조 등 관리",
    ],
  },
  스탠드: {
    title: "스탠드 에어컨 청소 확인 포인트",
    items: [
      "전면 커버·필터 오염 정도",
      "내부 송풍팬·열교환기 분해 범위",
      "곰팡이·냄새 발생 부위",
      "청소 후 관리 방법",
    ],
  },
  천장형: {
    title: "시스템에어컨(천장형) 청소 확인 포인트",
    items: [
      "판넬·필터 오염 정도",
      "내부 송풍팬·드레인 점검",
      "곰팡이·냄새 진행 상태",
      "청소 후 송풍 건조 관리",
    ],
  },
  분해청소: {
    title: "에어컨 분해청소 확인 포인트",
    items: [
      "필터 청소와 분해세척의 차이",
      "송풍팬·열교환기 분해 범위",
      "드레인·응축수 경로 점검",
      "조립 후 작동·건조 확인",
    ],
  },
  냄새점검: {
    title: "에어컨 냄새 원인 확인 포인트",
    items: [
      "송풍구·내부 곰팡이 여부",
      "응축수·드레인 오염 여부",
      "필터 먼지·습기 상태",
      "송풍 건조 등 생활 관리",
    ],
  },
  곰팡이제거: {
    title: "에어컨 곰팡이 확인 포인트",
    items: [
      "곰팡이 발생 부위(송풍구·열교환기)",
      "분해 세척 필요 범위",
      "습기·응축수 등 발생 원인",
      "재발 예방 송풍 건조 관리",
    ],
  },
  누수점검: {
    title: "에어컨 물 떨어짐 확인 포인트",
    items: [
      "드레인 막힘·오염 여부",
      "응축수 배출 경로 상태",
      "필터·내부 먼지 누적 정도",
      "청소 관점 점검 범위",
    ],
  },
  관리주기: {
    title: "에어컨 청소 주기 확인 포인트",
    items: [
      "사용 빈도별 권장 청소 주기",
      "필터 자가 청소 주기",
      "사용 후 송풍 건조 습관",
      "계절 시작 전 점검",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3-2차] lib/spine/scenes/airclean.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("airclean");
export const AIRCLEAN_SCENE_SPINE = SCENE_TABLE;

export const AIRCLEAN_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 에어컨 청소 범위 안내" },
  { slot: "info",    alt: "에어컨 관리 방법 안내 자료" },
  { slot: "consult", alt: "에어컨 청소 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const AIRCLEAN_COMPARE = {
  compareWith: "에어컨 분해청소",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — ★설치업종(systemair) 및 인접 청소업종 교차 오염 차단.
//   airclean은 '에어컨 청소·분해세척·곰팡이·냄새·누수·관리주기' 범위만.
export const AIRCLEAN_BLOCK_KEYWORDS = [
  "에어컨 설치", "에어컨 교체", "배관", "냉매충전", "가스충전", "실외기설치", "이전설치",
  "입주청소", "이사청소", "포장이사", "줄눈", "탄성코트", "인테리어",
];
