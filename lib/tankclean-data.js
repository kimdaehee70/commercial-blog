// lib/tankclean-data.js
// 저수조청소(tankclean) 업종 데이터셋 — v1 / 정보형 + 관리안내 가이드형
// 화자 = {region} 저수조청소 업체. 정보형(대상·범위·절차·소독·주기·점검). 후기·체험·과장광고 금지.
// 복제 베이스: cleaning-data.js (cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용)
//   buildingclean 70% + pestcontrol 20% + birdcontrol 10% 성격 혼합.
// industry='tankclean' 고정. 메뉴 8개.
//
// 설계 핵심 (시장 분석 결론):
//   - 후기형 경쟁 진입 금지 → 정보형 + 관리안내 가이드형으로 차별화.
//   - 관련도 노출 축 = 청소 대상/범위/절차/소독/주기/점검/관리대장.
//   - APT_DATA(cleaning 동형) 재사용: 지역+단지명+저수조청소 구조 SEO.
//   - ★ 동의어 블록 필수: "저수조청소" ↔ "물탱크청소" (동탄 관측 = 물탱크 키워드 빈도 높음).
//   - 시설 유형 8종: 아파트/공동주택/오피스텔/상가/빌딩/학교/병원/공장.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·과장광고·최저가·1위·추천.
//   허용 = 청소 대상 / 청소 범위 / 작업 절차 / 소독 과정 / 관리 주기 / 점검 항목
//          / 관리대장 / 예약 전 확인 (시점 무관 구조 정보).
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const TANKCLEAN_META = {
  industry: "tankclean",
  label: "저수조청소",
  fullLabel: "저수조청소 안내",
  greeting: "안녕하세요. {region} 저수조청소 업체입니다.",
  voice: "{region} 저수조청소 업체",
  badge: "신규",
  // 결정주기: 법정 의무 청소 주기(연 2회 등) 기반 — 일정형
  decisionCycle: "compare",
  // 비용 단정 금지 — 용량·시설유형·층수 변수 → "영향 요소" 톤
  costTone: "consult",
  // 동의어: 저수조 ↔ 물탱크 (관측 기준 물탱크 키워드 빈도 높음)
  synonyms: ["저수조청소", "물탱크청소"],
};

// 시설 유형 8종 — 본문/제목 다양화용. 단조로움 방지.
export const TANKCLEAN_FACILITY_TYPES = [
  "아파트", "공동주택", "오피스텔", "상가", "빌딩", "학교", "병원", "공장",
];

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·과장광고·결과보장 차단
export const TANKCLEAN_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  // 후기·체험담
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const TANKCLEAN_CATS = [
  "저수조청소",
  "물탱크청소",
  "아파트저수조",
  "공동주택저수조",
  "상가저수조",
  "소독",
  "청소주기",
  "체크리스트",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — cleaning과 동형 구조 재사용 (지역+단지명+저수조청소 SEO).
//   단지명 활용: "{aptName} 저수조청소" 구조. 노원 관측 성공 시 강남·송도·세종 확장.
//   ★ 단지명·생활권만 보유. 저수조 특화 시점 정보는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["저수조청소", "아파트저수조", "공동주택저수조"],
    apts: [
      { name: "상계주공5단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "상계주공7단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "중계그린",     district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "중계무지개",   district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "하계장미",     district: "하계동", station: "하계역(7호선)", livingArea: "하계 생활권" },
      { name: "청구3차",      district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
    ],
  },
  gangnam: {
    label: "강남",
    region: "강남구",
    focus: ["저수조청소", "공동주택저수조", "상가저수조"],
    apts: [
      { name: "은마",               district: "대치동", station: "대치역(3호선)", livingArea: "대치 생활권" },
      { name: "개포주공",           district: "개포동", station: "개포동역(분당선)", livingArea: "개포 생활권" },
      { name: "래미안대치팰리스",   district: "대치동", station: "대치역(3호선)", livingArea: "대치 생활권" },
      { name: "도곡렉슬",           district: "도곡동", station: "도곡역(3호선/분당선)", livingArea: "도곡 생활권" },
    ],
  },
  songdo: {
    label: "송도",
    region: "연수구",
    focus: ["저수조청소", "공동주택저수조", "상가저수조"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
    ],
  },
  sejong: {
    label: "세종",
    region: "세종시",
    focus: ["저수조청소", "공동주택저수조"],
    apts: [
      { name: "첫마을",   district: "한솔동", station: "BRT 첫마을", livingArea: "한솔 생활권" },
      { name: "가재마을", district: "종촌동", station: "BRT 종촌", livingArea: "종촌 생활권" },
      { name: "새뜸마을", district: "다정동", station: "BRT 다정", livingArea: "다정 생활권" },
      { name: "도램마을", district: "도담동", station: "BRT 도담", livingArea: "도담 생활권" },
    ],
  },
};

// APT_DATA helper — 지역키로 단지명 풀 조회 (없으면 빈 배열)
export function getAptPool(regionKey) {
  const e = APT_DATA[regionKey];
  return e ? e.apts.map((a) => (typeof a === "string" ? a : a.name)) : [];
}

// 단지명 → 단지 메타(district/station/livingArea) 조회
export function getAptMeta(regionKey, aptName) {
  const e = APT_DATA[regionKey];
  if (!e) return null;
  return e.apts.find((a) => (typeof a === "string" ? a : a.name) === aptName) || null;
}

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} {aptName} 치환. 후기형·결과보장·추천 배제.
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
//   ★ 저수조 ↔ 물탱크 동의어 자연 분산.
// ─────────────────────────────────────────────────────────────

// 저수조청소 (단지/지역 단위 안내)
const TP_TANK = (kase) => [
  `{region} ${kase} 관리방법`,                  // 축A 지역
  `{region} {aptName} ${kase} 범위 안내`,       // 지역+APT
  `{aptName} ${kase} 범위 안내`,                // 축E APT 단독
  `{aptName} ${kase} 체크리스트`,               // 축E APT 단독
  `{livingArea} ${kase} 안내`,                  // 축B 생활권
  `{region} ${kase} 작업 절차 정리`,
  `{region} ${kase} 청소 주기 안내`,
];

// 물탱크청소 (동의어 키워드 — 관측 기준 빈도 높음)
const TP_WATERTANK = (kase) => [
  `{region} ${kase} 안내`,
  `{region} ${kase} 작업 절차`,
  `{region} {aptName} ${kase} 범위`,
  `{region} ${kase} 관리 주기 정리`,
];

// 아파트/공동주택 저수조 (시설 유형별)
const TP_FACILITY = (kase) => [
  `{region} ${kase} 범위 안내`,
  `{region} {aptName} ${kase} 체크포인트`,
  `{region} ${kase} 작업 절차`,
  `{region} ${kase} 관리 주기`,
];

// 상가 저수조 (출장형)
const TP_SHOP = (kase) => [
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 작업 절차 안내`,
  `{region} ${kase} 점검 항목 정리`,
  `{region} ${kase} 예약 전 확인사항`,
];

// 소독 (절차형)
const TP_DISINFECT = (kase) => [
  `{region} ${kase} 절차`,
  `{region} ${kase} 과정 안내`,
  `{region} ${kase} 점검 항목`,
  `{region} ${kase} 알아두면 좋은 점`,
];

// 청소주기 (주기 안내형)
const TP_CYCLE = (kase) => [
  `{region} ${kase} 정리`,
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 관리대장 관리`,
];

// 체크리스트 (확인 항목형)
const TP_CHECK = (kase) => [
  `${kase} 정리`,
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
  `${kase} 쉽게 이해하기`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 대상·범위·절차·소독·주기·점검
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const TANKCLEAN_TREATMENTS = [
  // ── 저수조청소 ────────────────────────────────
  {
    id: "tk_tank", industry: "tankclean", name: "저수조청소", cat: "저수조청소", emoji: "🚰",
    titlePatterns: TP_TANK("저수조청소"),
    keywords: ["저수조청소 범위", "저수조청소 절차", "저수조청소 주기", "저수조 관리"],
    analysisAxis: ["청소 대상", "청소 범위", "작업 절차", "소독 과정", "점검 항목"],
    useApt: true, compareWith: "물탱크청소", rank: 1, recommendedWeight: 20,
  },

  // ── 물탱크청소 (동의어) ───────────────────────
  {
    id: "tk_watertank", industry: "tankclean", name: "물탱크청소", cat: "물탱크청소", emoji: "💧",
    titlePatterns: TP_WATERTANK("물탱크청소"),
    keywords: ["물탱크청소 범위", "물탱크청소 절차", "물탱크 소독", "물탱크 관리"],
    analysisAxis: ["청소 대상", "청소 범위", "작업 절차", "소독 과정", "점검 항목"],
    useApt: true, compareWith: "저수조청소", rank: 1, recommendedWeight: 15,
  },

  // ── 아파트 저수조 ─────────────────────────────
  {
    id: "tk_apt", industry: "tankclean", name: "아파트저수조청소", cat: "아파트저수조", emoji: "🏢",
    titlePatterns: TP_FACILITY("아파트 저수조청소"),
    keywords: ["아파트 저수조청소", "아파트 물탱크청소", "공용 저수조", "아파트 급수 관리"],
    analysisAxis: ["청소 대상", "청소 범위", "작업 절차", "관리 주기", "점검 항목"],
    useApt: true, compareWith: "공동주택저수조", rank: 1, recommendedWeight: 12,
  },

  // ── 공동주택 저수조 ───────────────────────────
  {
    id: "tk_multi", industry: "tankclean", name: "공동주택저수조청소", cat: "공동주택저수조", emoji: "🏘️",
    titlePatterns: TP_FACILITY("공동주택 저수조청소"),
    keywords: ["공동주택 저수조청소", "공동주택 물탱크", "급수시설 관리", "공용 저수조 청소"],
    analysisAxis: ["청소 대상", "청소 범위", "작업 절차", "관리 주기", "점검 항목"],
    useApt: true, compareWith: "아파트저수조", rank: 2, recommendedWeight: 10,
  },

  // ── 상가 저수조 ───────────────────────────────
  {
    id: "tk_shop", industry: "tankclean", name: "상가저수조청소", cat: "상가저수조", emoji: "🏬",
    titlePatterns: TP_SHOP("상가 저수조청소"),
    keywords: ["상가 저수조청소", "상가 물탱크청소", "건물 급수 관리", "상가 저수조 소독"],
    analysisAxis: ["청소 대상", "청소 범위", "작업 절차", "점검 항목", "예약 전 확인"],
    useApt: false, compareWith: "공동주택저수조", rank: 2, recommendedWeight: 10,
  },

  // ── 소독 ──────────────────────────────────────
  {
    id: "tk_disinfect", industry: "tankclean", name: "저수조소독", cat: "소독", emoji: "🧪",
    titlePatterns: TP_DISINFECT("저수조 소독"),
    keywords: ["저수조 소독", "물탱크 소독", "급수시설 소독", "소독 절차"],
    analysisAxis: ["소독 과정", "작업 절차", "점검 항목", "확인할 점"],
    useApt: false, compareWith: "저수조청소", rank: 2, recommendedWeight: 10,
  },

  // ── 청소주기 ──────────────────────────────────
  {
    id: "tk_cycle", industry: "tankclean", name: "저수조청소주기", cat: "청소주기", emoji: "📅",
    titlePatterns: TP_CYCLE("저수조 청소 주기"),
    keywords: ["저수조 청소 주기", "물탱크 청소 주기", "급수시설 관리 주기", "관리대장"],
    analysisAxis: ["관리 주기", "관리대장 관리", "점검 항목", "확인할 점"],
    useApt: false, compareWith: "체크리스트", rank: 1, recommendedWeight: 13,
  },

  // ── 체크리스트 ────────────────────────────────
  {
    id: "tk_check", industry: "tankclean", name: "저수조관리체크리스트", cat: "체크리스트", emoji: "✅",
    titlePatterns: TP_CHECK("저수조 관리 체크리스트"),
    keywords: ["저수조 관리 체크리스트", "물탱크 점검 항목", "급수시설 점검", "업체 고르는 법"],
    analysisAxis: ["예약 전 확인", "점검 항목", "관리 주기", "업체 선택 기준"],
    useApt: false, compareWith: "청소주기", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateTankclean.js renderInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만. INFO_BLOCKS 8종.
export const TANKCLEAN_INFO_BLOCKS = {
  target: {
    title: "청소 대상",
    items: [
      "지하 저수조·옥상 고가수조",
      "급수 배관 연결부·맨홀 입구",
      "수위 조절 밸브·오버플로우 관",
      "※ 시설 용량·형태에 따라 대상 범위는 달라질 수 있음",
    ],
  },
  scope: {
    title: "청소 범위",
    items: [
      "내벽·바닥 침전물·이물질 제거",
      "벽면 스케일·물때 제거",
      "맨홀·환기구 주변 정리",
      "급수 정지 후 잔수 배출 → 청소",
    ],
  },
  process: {
    title: "작업 절차",
    items: [
      "사전 점검·급수 차단 안내",
      "잔수 배출 → 침전물 제거",
      "내벽 세척 → 소독 → 헹굼",
      "수질 확인 → 급수 재개 → 마감 점검",
    ],
  },
  disinfect: {
    title: "소독 과정",
    items: [
      "세척 후 소독제 도포·살수",
      "규정 접촉 시간 확보",
      "충분한 헹굼으로 잔류 제거",
      "※ 소독 방식은 시설 기준에 따라 적용",
    ],
  },
  cycle: {
    title: "관리 주기 안내",
    items: [
      "급수시설 저수조는 정기 청소 대상",
      "청소 후 관리대장 기록 관리",
      "수질 상태에 따라 점검 주기 조정",
      "※ 구체 주기는 시설 기준·관할 안내 확인",
    ],
  },
  check: {
    title: "점검 항목",
    items: [
      "내벽 침전물·물때 잔존 여부",
      "맨홀 잠금·환기구 이물 유입 여부",
      "오버플로우·배수 통로 상태",
      "급수 재개 후 수질 육안 확인",
    ],
  },
  ledger: {
    title: "관리대장 관리",
    items: [
      "청소·소독 일자 기록",
      "작업 범위·담당 기록",
      "수질 확인 결과 보관",
      "다음 점검 예정 관리",
    ],
  },
  prebook: {
    title: "예약 전 확인 체크리스트",
    items: [
      "저수조 용량·시설 유형 확인",
      "급수 차단 가능 시간대 협의",
      "청소·소독 범위 사전 확인",
      "작업 후 수질 확인·기록 제공 여부",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
export const TANKCLEAN_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 저수조청소 범위 안내" },
  { slot: "info", alt: "저수조 작업 절차 안내 자료" },
  { slot: "consult", alt: "저수조청소 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const TANKCLEAN_COMPARE = {
  compareWith: "물탱크청소",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 인접 청소/방역 업종과 교차 오염 차단.
//   tankclean은 '저수조·물탱크' 급수시설 청소·소독·관리 정보만.
//   입주청소(실내)·건물청소(외벽/공용부)·방역(해충)과 구분.
export const TANKCLEAN_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "건물외벽청소", "계단청소", "방역소독", "해충방제", "비둘기퇴치",
];
