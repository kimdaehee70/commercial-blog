import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/screen.js";
// lib/screen-data.js
// 방충망(screen) 업종 데이터셋 — v1 / 정보형 (홈케어·시공/관리 업종)
// 화자 = {region} 방충망 업체. 정보형(미세방충망·현관·롤·안전·추락방지·교체·관리·종류비교).
//   후기·체험담·내돈내산·추천·최저가·1등업체·만족도·설치후기 금지.
// 복제 베이스: airclean-data.js (섹션루프형, 정보형 동형).
// industry='screen' 고정. 메뉴 8개. ★ useApt=true (아파트명 활용도 높음 — 관측 결과).
//
// 설계 핵심:
//   - 지역형 + 정보형 + 홈케어. 미세방충망 중심 시장. 아파트명 활용 가능.
//   - useApt=true: 방충망 검색은 단지명(창호 규격·세대 동일)과 결합도가 높음.
//   - 관련도 노출 축 = 미세방충망 / 교체 필요성 / 안전·추락방지 / 벌레 차단 / 환기 / 유지관리.
//   - 후기형 경쟁 진입 금지 → 정보형으로 차별화.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·만족도·설치후기·추천·최저가·1등업체·최고·완벽.
//   ★ 광고·순위 차단: 추천/최저가/1등업체/1위/최고/역대급/만족도/강추.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const SCREEN_META = {
  industry: "screen",
  label: "방충망",
  fullLabel: "방충망 안내",
  greeting: "안녕하세요. {region} 방충망 업체입니다.",
  voice: "{region} 방충망 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
//   후기형·과장광고·할인이벤트 + 추천·순위
export const SCREEN_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1등업체", "1위", "최고", "역대급", "초대박", "대박",
  "100% 만족", "100%", "완벽", "전문가가 직접",
  // 할인·이벤트(영업 유인 금지)
  "할인", "이벤트",
  // 보장·추천·순위 (정보형 고정)
  "보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "추천", "순위",
  // 후기·체험담·내돈내산·만족·설치후기
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 설치 후기", "설치후기", "시공후기",
  "만족", "만족도", "체험담",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const SCREEN_CATS = [
  "미세방충망",
  "현관방충망",
  "롤방충망",
  "안전방충망",
  "추락방지",
  "교체",
  "관리방법",
  "종류비교",
  // [v-menu 2026-07-27] 메뉴 확장 3종. 핸들러는 SCREEN_INFO_BLOCKS[cat] 조회 → data.js 단독 추가.
  "방범방충망",
  "수리",
  "설치",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — screen은 useApt=true. 지역+아파트명 조합 허용.
//   부동산·입주청소·인테리어에서 검증된 구조. 핸들러가 getAptPool/getAptMeta import.
//   ※ 관측 단계: 동탄 중심 시드. 수요 시 지역 풀 확장.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  dongtan: {
    label: "동탄",
    region: "화성 동탄",
    apts: [
      { name: "동탄역센트럴푸르지오", livingArea: "동탄역" },
      { name: "반도유보라아이비파크", livingArea: "동탄호수공원" },
      { name: "푸른마을두산위브", livingArea: "동탄1신도시" },
      { name: "시범한빛마을", livingArea: "동탄1신도시" },
      { name: "동탄2신도시아이파크", livingArea: "동탄2신도시" },
    ],
  },
};

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
// 제목 패턴 — data.js 소유. 생성기는 소비만.
//   ★ useApt=true → {aptName} 토큰 일부 활용(지역+아파트명 조합 허용).
//   지역+행동/기준/관리 조합. 매장명 미노출. 후기·추천 금지.
// ─────────────────────────────────────────────────────────────

// 제품형 (미세·현관·롤·안전 — 선택 기준/특징 축)
const TP_PRODUCT = (kase) => [
  `{region} ${kase} 선택 기준`,
  `{region} ${kase} 교체 전 확인사항`,
  `{region} ${kase} 제품 특징 안내`,
  `${kase} 알아두면 좋은 점`,
  `{aptName} ${kase} 확인 포인트`,
];

// 안전형 (추락방지 — 안전 정보 축)
const TP_SAFETY = (kase) => [
  `{region} ${kase} 안전정보`,
  `{region} ${kase} 설치 전 알아둘 점`,
  `${kase} 확인 포인트`,
  `${kase} 왜 필요한가`,
  `{aptName} ${kase} 안내`,
];

// 작업형 (교체 — 필요성/시점 축)
const TP_WORK = (kase) => [
  `{region} ${kase}가 필요한 신호`,
  `{region} ${kase} 전 확인사항`,
  `${kase} 시점 판단 기준`,
  `{aptName} ${kase} 안내`,
  `${kase} 진행 순서 정리`,
];

// 관리형 (관리방법 — 청소/유지 축)
const TP_CARE = (kase) => [
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 정리`,
  `${kase} 계절별 관리`,
  `{region} 방충망 청소와 ${kase}`,
];

// 비교형 (종류비교 — 비교/정리 축)
const TP_COMPARE = (kase) => [
  `{region} ${kase} 정리`,
  `${kase} 어떤 차이가 있나`,
  `{region} ${kase} 확인 포인트`,
  `${kase} 선택 전 알아둘 점`,
  `방충망 종류별 ${kase}`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   ★ useApt 분포: 제품·교체 계열 true(단지 결합 높음), 관리·비교 false(일반 정보).
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const SCREEN_TREATMENTS = [
  // ── 미세방충망 (중심 시장) ──────────────────────
  {
    id: "scr_fine", industry: "screen", name: "미세방충망", cat: "미세방충망", emoji: "🦟",
    titlePatterns: TP_PRODUCT("미세방충망"),
    keywords: ["미세방충망", "미세방충망 교체", "초미세방충망", "미세먼지 방충망"],
    analysisAxis: ["교체 필요성", "제품 특징", "벌레·미세먼지 차단", "환기·유지관리"],
    useApt: true, compareWith: "일반 방충망", rank: 1, recommendedWeight: 14,
  },

  // ── 현관방충망 ──────────────────────────────────
  {
    id: "scr_door", industry: "screen", name: "현관방충망", cat: "현관방충망", emoji: "🚪",
    titlePatterns: TP_PRODUCT("현관방충망"),
    keywords: ["현관방충망", "현관 방충망 설치", "자석방충망", "현관 모기장"],
    analysisAxis: ["설치 위치", "제품 특징", "벌레 차단", "통행·환기"],
    useApt: true, compareWith: "미세방충망", rank: 1, recommendedWeight: 11,
  },

  // ── 롤방충망 ────────────────────────────────────
  {
    id: "scr_roll", industry: "screen", name: "롤방충망", cat: "롤방충망", emoji: "🌀",
    titlePatterns: TP_PRODUCT("롤방충망"),
    keywords: ["롤방충망", "롤스크린 방충망", "자동롤방충망", "롤방충망 교체"],
    analysisAxis: ["제품 특징", "설치 위치", "유지관리", "벌레 차단"],
    useApt: true, compareWith: "미세방충망", rank: 1, recommendedWeight: 10,
  },

  // ── 안전방충망 ──────────────────────────────────
  {
    id: "scr_safe", industry: "screen", name: "안전방충망", cat: "안전방충망", emoji: "🛡️",
    titlePatterns: TP_SAFETY("안전방충망"),
    keywords: ["안전방충망", "안전 방충망 설치", "고층 안전방충망", "아이 안전방충망"],
    analysisAxis: ["안전 정보", "설치 위치", "제품 특징", "벌레 차단"],
    useApt: true, compareWith: "추락방지방충망", rank: 1, recommendedWeight: 11,
  },

  // ── 추락방지방충망 ──────────────────────────────
  {
    id: "scr_fall", industry: "screen", name: "추락방지방충망", cat: "추락방지", emoji: "⚠️",
    titlePatterns: TP_SAFETY("추락방지방충망"),
    keywords: ["추락방지방충망", "추락방지 방충망", "고층 추락방지", "아이 추락방지"],
    analysisAxis: ["안전 정보", "설치 위치", "제품 특징", "유지관리"],
    useApt: true, compareWith: "안전방충망", rank: 1, recommendedWeight: 10,
  },

  // ── 방충망 교체 ─────────────────────────────────
  {
    id: "scr_replace", industry: "screen", name: "방충망 교체", cat: "교체", emoji: "🔧",
    titlePatterns: TP_WORK("방충망 교체"),
    keywords: ["방충망 교체", "방충망 망갈이", "찢어진 방충망", "방충망 교체 시기"],
    analysisAxis: ["교체 필요성", "교체 시점 판단", "제품 특징", "유지관리"],
    useApt: true, compareWith: "미세방충망", rank: 1, recommendedWeight: 11,
  },

  // ── 방충망 관리방법 ─────────────────────────────
  {
    id: "scr_care", industry: "screen", name: "방충망 관리방법", cat: "관리방법", emoji: "🧽",
    titlePatterns: TP_CARE("방충망 관리방법"),
    keywords: ["방충망 관리", "방충망 청소", "방충망 청소 방법", "방충망 먼지"],
    analysisAxis: ["청소 방법", "유지관리", "교체 필요성", "벌레 차단"],
    useApt: false, compareWith: "방충망 교체", rank: 1, recommendedWeight: 8,
  },

  // ── 방충망 종류 비교 ────────────────────────────
  {
    id: "scr_compare", industry: "screen", name: "방충망 종류 비교", cat: "종류비교", emoji: "📋",
    titlePatterns: TP_COMPARE("방충망 종류 비교"),
    keywords: ["방충망 종류", "방충망 종류 비교", "방충망 차이", "방충망 선택"],
    analysisAxis: ["제품 특징", "선택 기준", "벌레·미세먼지 차단", "환기"],
    useApt: false, compareWith: "미세방충망", rank: 1, recommendedWeight: 10,
  },

  // ══ [v-menu 2026-07-27] 메뉴 확장 3종 ═══════════════════════
  //   SCENE는 resolveScene 3단 폴백(DEFAULT_CAT) → SCENE_SPINE 무수정.
  {
    id: "scr_secure", industry: "screen", name: "방범방충망", cat: "방범방충망", emoji: "🔐",
    titlePatterns: TP_PRODUCT("방범방충망"),
    keywords: ["방범방충망", "방범 방충망 설치", "스텐방충망", "1층 방범방충망"],
    analysisAxis: ["안전 정보", "제품 특징", "설치 위치", "벌레 차단"],
    useApt: true, compareWith: "안전방충망", rank: 1, recommendedWeight: 8,
  },
  {
    id: "scr_repair", industry: "screen", name: "방충망 수리", cat: "수리", emoji: "🛠️",
    titlePatterns: TP_WORK("방충망 수리"),
    keywords: ["방충망 수리", "방충망 찢어짐 수리", "방충망 레일 수리", "방충망 처짐"],
    analysisAxis: ["교체 필요성", "교체 시점 판단", "유지관리", "제품 특징"],
    useApt: true, compareWith: "방충망 교체", rank: 1, recommendedWeight: 4,
  },
  {
    id: "scr_install", industry: "screen", name: "방충망 설치", cat: "설치", emoji: "📐",
    titlePatterns: TP_WORK("방충망 설치"),
    keywords: ["방충망 설치", "방충망 신규 설치", "창문 방충망 설치", "방충망 규격"],
    analysisAxis: ["설치 위치", "제품 특징", "선택 기준", "유지관리"],
    useApt: true, compareWith: "방충망 교체", rank: 1, recommendedWeight: 3,
  },
];

// 정보블럭 데이터 — generateScreen.js pickInfoBlock에서 소비
//   ★ 확인 포인트·체크 항목 등 구조 정보만. cat 키와 1:1 매칭.
export const SCREEN_INFO_BLOCKS = {
  미세방충망: {
    title: "미세방충망 확인 포인트",
    items: [
      "일반 방충망과 미세방충망 망 차이",
      "벌레·미세먼지 차단 정도",
      "환기·채광에 미치는 영향",
      "교체 시점과 유지관리",
    ],
  },
  현관방충망: {
    title: "현관방충망 확인 포인트",
    items: [
      "현관 구조에 맞는 방식(자석·슬라이드 등)",
      "통행 편의와 벌레 차단",
      "설치 위치·고정 방식",
      "사용 후 관리 방법",
    ],
  },
  롤방충망: {
    title: "롤방충망 확인 포인트",
    items: [
      "수동·자동 롤 방식 차이",
      "창호 규격과 설치 위치",
      "사용 빈도와 유지관리",
      "벌레 차단·환기 균형",
    ],
  },
  안전방충망: {
    title: "안전방충망 확인 포인트",
    items: [
      "고층·아이 있는 세대 안전 고려",
      "프레임·망 강도 관련 정보",
      "설치 위치·고정 방식",
      "벌레 차단과 환기",
    ],
  },
  추락방지: {
    title: "추락방지방충망 확인 포인트",
    items: [
      "추락 위험 구간(창문·베란다) 점검",
      "프레임·잠금 구조 관련 안전 정보",
      "아이·반려동물 있는 세대 고려",
      "설치 후 유지관리",
    ],
  },
  교체: {
    title: "방충망 교체 확인 포인트",
    items: [
      "찢어짐·처짐·변색 등 교체 신호",
      "창호 규격에 맞는 망 선택",
      "미세방충망 등 망 종류 선택",
      "교체 후 유지관리",
    ],
  },
  관리방법: {
    title: "방충망 관리 확인 포인트",
    items: [
      "먼지·이물 제거 청소 방법",
      "물청소·건조 시 주의점",
      "프레임·레일 점검",
      "교체가 필요한 상태 구분",
    ],
  },
  // [v-menu 2026-07-27] 신규 메뉴 정보블럭 3종 (키 = cat)
  방범방충망: {
    title: "방범방충망 확인 포인트",
    items: [
      "저층·1층 등 외부 접근 구간 점검",
      "프레임·망 소재(스테인리스 등) 강도",
      "잠금·고정 방식 확인",
      "벌레 차단·환기 균형",
    ],
  },
  수리: {
    title: "방충망 수리 확인 포인트",
    items: [
      "찢어짐·구멍·처짐 등 손상 범위",
      "레일·롤러·프레임 상태 점검",
      "수리와 교체 구분 기준",
      "수리 후 유지관리",
    ],
  },
  설치: {
    title: "방충망 설치 확인 포인트",
    items: [
      "창호 규격·설치 위치 확인",
      "망 종류(일반·미세·방범) 선택",
      "고정·개폐 방식 확인",
      "설치 후 유지관리",
    ],
  },
  종류비교: {
    title: "방충망 종류 비교 포인트",
    items: [
      "일반·미세·롤·안전 방식 차이",
      "벌레·미세먼지 차단 정도",
      "환기·통행·안전 우선순위",
      "세대 상황별 선택 기준",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3-2차] lib/spine/scenes/screen.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("screen");
export const SCREEN_SCENE_SPINE = SCENE_TABLE;

export const SCREEN_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 방충망 종류 안내" },
  { slot: "info",    alt: "방충망 관리 방법 안내 자료" },
  { slot: "consult", alt: "방충망 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const SCREEN_COMPARE = {
  compareWith: "미세방충망",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — ★인접 홈케어 업종 교차 오염 차단.
//   screen은 '방충망 종류·교체·안전·추락방지·관리·청소' 범위만.
export const SCREEN_BLOCK_KEYWORDS = [
  "창호 교체", "샷시 교체", "샤시 시공", "이중창", "시스템창호",
  "입주청소", "이사청소", "줄눈", "탄성코트", "인테리어", "에어컨청소", "방역",
];
