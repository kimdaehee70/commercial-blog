import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/moving.js";
// lib/moving-data.js
// 이사업체(moving) 업종 데이터셋 — v1 / 정보형 + 업체선택 가이드형
// 화자 = {region} 이사업체. 정보형(범위·견적요소·체크리스트). 후기·체험·과장광고 금지.
// 복제 베이스: cleaning-data.js (cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용)
// industry='moving' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 업체선택 가이드형으로 차별화.
//   - 관련도 노출 축 = 업체 고르는 법 / 견적 / 추가비용 / 체크리스트.
//   - APT_DATA(cleaning 동형) 재사용: 지역+단지명+이사 구조 SEO.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·과장광고·최저가·보장·추천·순위·1위.
//   허용 = 서비스 범위 / 견적 영향 요소 / 예약 전 확인 / 추가비용 요인 / 일정 준비 / 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const MOVING_META = {
  industry: "moving",
  label: "이사업체",
  fullLabel: "이사업체 안내",
  greeting: "안녕하세요. {region} 이사업체입니다.",
  voice: "{region} 이사업체",
  badge: "신규",
  // 결정주기: 이사 일정 전 비교·예약 (긴급 아님, 일정 기반)
  decisionCycle: "compare",
  // 비용 단정 금지 — 짐량·층수·거리·옵션 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·과장광고·결과보장·순위 차단
export const MOVING_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박",
  // 보장·추천·순위 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 후기·체험담
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 이용 후기", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const MOVING_CATS = [
  "포장이사",
  "원룸이사",
  "투룸이사",
  "용달이사",
  "반포장이사",
  "보관이사",
  "업체선택",
  "체크리스트",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — cleaning과 동형 구조 재사용 (지역+단지명+이사 SEO).
//   단지명 활용: "{aptName} 이사" 구조. 노원 관측 성공 시 강남·송도·세종 확장.
//   ★ 단지명·생활권만 보유. 이사 특화 시점 정보는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["포장이사", "원룸이사", "보관이사"],
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
    focus: ["포장이사", "투룸이사", "보관이사"],
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
    focus: ["포장이사", "원룸이사", "보관이사"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
    ],
  },
  sejong: {
    label: "세종",
    region: "세종시",
    focus: ["포장이사", "투룸이사"],
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
// 제목패턴 — {region} {aptName} 치환. 후기형·결과보장·추천·순위 배제.
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 포장이사 (단지/지역 단위 안내)
const TP_PACKED = (kase) => [
  `{region} ${kase} 전 확인해야 할 사항`,
  `{region} {aptName} ${kase} 준비 체크리스트`,
  `{aptName} ${kase} 준비 안내`,
  `{aptName} ${kase} 체크리스트`,
  `{livingArea} ${kase} 안내`,
  `{region} ${kase} 진행 순서 정리`,
  `{region} ${kase} 예약 전 알아둘 점`,
];

// 비용형 (포장이사 비용 등 견적 영향 요소)
const TP_COST = (kase) => [
  `{region} ${kase} 확인사항`,
  `{region} ${kase}이 달라지는 이유`,
  `{region} ${kase} 영향 요소 정리`,
  `{region} ${kase} 추가비용 발생 사례`,
  `{region} ${kase} 알아두면 좋은 점`,
];

// 주거형태 (원룸·투룸 이사)
const TP_TYPE = (kase) => [
  `{region} ${kase} 준비 체크리스트`,
  `{region} ${kase} 예약 전 확인사항`,
  `{region} ${kase} 견적 영향 요소`,
  `{region} ${kase} 진행 순서 안내`,
];

// 서비스형 (용달·반포장·보관이사)
const TP_SERVICE = (kase) => [
  `{region} ${kase} 필요한 경우`,
  `{region} ${kase} 범위와 순서 안내`,
  `{region} ${kase} 예약 전 확인할 점`,
  `{region} ${kase} 견적 영향 요소`,
];

// 반포장 비교형
const TP_COMPARE = (kase) => [
  `{region} ${kase}와 포장이사 차이`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 예약 전 확인사항`,
  `{region} ${kase} 진행 순서`,
];

// 업체선택 (선택 기준형)
const TP_SELECT = (kase) => [
  `{region} ${kase}`,
  `{region} 이사 전 확인해야 할 사항`,
  `{region} ${kase} 정리`,
  `{region} ${kase} 알아두면 좋은 점`,
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
//   analysisAxis = 정보형 섹션축: 서비스범위·견적요소·예약확인·추가비용·일정준비
//   weight 합계 100. 비용 관련 비중 높게.
// ─────────────────────────────────────────────────────────────
export const MOVING_TREATMENTS = [
  // ── 포장이사 비용 (비용 비중 최상) ───────────
  {
    id: "mv_packed_cost", industry: "moving", name: "포장이사 비용", cat: "포장이사", emoji: "💰",
    titlePatterns: TP_COST("포장이사 비용"),
    keywords: ["포장이사 비용", "이사 견적 영향 요소", "이사 추가비용", "짐량별 비용"],
    analysisAxis: ["견적 영향 요소", "짐량·층수·거리", "추가비용 발생 사례", "예약 전 확인"],
    useApt: false, compareWith: "반포장이사", rank: 1, recommendedWeight: 20,
  },

  // ── 원룸이사 ──────────────────────────────────
  {
    id: "mv_oneroom", industry: "moving", name: "원룸이사", cat: "원룸이사", emoji: "🛏️",
    titlePatterns: TP_TYPE("원룸이사"),
    keywords: ["원룸이사 비용", "원룸이사 범위", "원룸 포장이사", "소형 이사"],
    analysisAxis: ["서비스 범위", "견적 영향 요소", "예약 전 확인", "일정 준비"],
    useApt: false, compareWith: "투룸이사", rank: 1, recommendedWeight: 15,
  },

  // ── 투룸이사 ──────────────────────────────────
  {
    id: "mv_tworoom", industry: "moving", name: "투룸이사", cat: "투룸이사", emoji: "🏠",
    titlePatterns: TP_TYPE("투룸이사"),
    keywords: ["투룸이사 비용", "투룸이사 범위", "투룸 포장이사", "가족 이사"],
    analysisAxis: ["서비스 범위", "견적 영향 요소", "예약 전 확인", "일정 준비"],
    useApt: true, compareWith: "원룸이사", rank: 2, recommendedWeight: 10,
  },

  // ── 용달이사 ──────────────────────────────────
  {
    id: "mv_yongdal", industry: "moving", name: "용달이사", cat: "용달이사", emoji: "🚚",
    titlePatterns: TP_SERVICE("용달이사"),
    keywords: ["용달이사 비용", "용달이사 범위", "소량 이사", "1톤 용달"],
    analysisAxis: ["서비스 범위", "견적 영향 요소", "예약 전 확인", "일정 준비"],
    useApt: false, compareWith: "반포장이사", rank: 2, recommendedWeight: 10,
  },

  // ── 반포장이사 ────────────────────────────────
  {
    id: "mv_halfpacked", industry: "moving", name: "반포장이사", cat: "반포장이사", emoji: "📦",
    titlePatterns: TP_COMPARE("반포장이사"),
    keywords: ["반포장이사 범위", "반포장 포장이사 차이", "반포장 비용", "부분 포장"],
    analysisAxis: ["서비스 범위", "포장이사와 차이", "견적 영향 요소", "예약 전 확인"],
    useApt: false, compareWith: "포장이사", rank: 1, recommendedWeight: 10,
  },

  // ── 보관이사 ──────────────────────────────────
  {
    id: "mv_storage", industry: "moving", name: "보관이사", cat: "보관이사", emoji: "🏬",
    titlePatterns: TP_SERVICE("보관이사"),
    keywords: ["보관이사 필요한 경우", "보관이사 비용", "이사 짐 보관", "보관 기간"],
    analysisAxis: ["서비스 범위", "보관 조건", "견적 영향 요소", "예약 전 확인"],
    useApt: false, compareWith: "포장이사", rank: 1, recommendedWeight: 10,
  },

  // ── 업체선택 ──────────────────────────────────
  {
    id: "mv_select", industry: "moving", name: "이사업체 선택 기준", cat: "업체선택", emoji: "🔍",
    titlePatterns: TP_SELECT("이사업체 선택 기준"),
    keywords: ["이사업체 선택 기준", "이사업체 고르는 법", "견적 비교", "예약 전 확인"],
    analysisAxis: ["선택 기준", "견적 비교 요소", "예약 전 확인", "추가비용 확인"],
    useApt: false, compareWith: "견적 비교", rank: 1, recommendedWeight: 15,
  },

  // ── 체크리스트 ────────────────────────────────
  {
    id: "mv_check", industry: "moving", name: "이사 체크리스트", cat: "체크리스트", emoji: "✅",
    titlePatterns: TP_CHECK("이사 체크리스트"),
    keywords: ["이사 체크리스트", "이사 준비 항목", "이사 전 확인", "이사 당일 점검"],
    analysisAxis: ["예약 전 확인", "이사 전 준비", "당일 점검", "이사 후 확인"],
    useApt: false, compareWith: "직접 이사", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateMoving.js insertInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const MOVING_INFO_BLOCKS = {
  packed: {
    title: "포장이사 진행 순서",
    items: [
      "사전 방문/유선 견적 → 일정 확정",
      "당일 포장 → 운반 → 배치",
      "정리 → 마감 점검",
      "※ 짐량·층수·거리에 따라 소요 시간은 달라질 수 있음",
    ],
  },
  type: {
    title: "주거형태별 확인 포인트",
    items: [
      "짐량 규모(원룸/투룸) 사전 파악",
      "엘리베이터·사다리차 필요 여부",
      "주차·진입로 조건 확인",
      "포장 범위(전체/부분) 선택",
    ],
  },
  service: {
    title: "서비스 유형별 확인 포인트",
    items: [
      "용달=소량/단순 운반 중심",
      "반포장=귀중품만 직접, 나머지 업체 포장",
      "보관=입주 일정 차이 시 짐 보관",
      "필요 서비스에 맞춰 견적 요청",
    ],
  },
  cost: {
    title: "견적에 영향을 주는 요소",
    items: [
      "짐량·가구/가전 규모",
      "층수·엘리베이터 유무·사다리차",
      "이사 거리·진입 조건·주차",
      "이사 날짜(손없는날·주말 등 성수기)",
      "※ 정확한 금액은 현장/유선 확인 후 산정",
    ],
  },
  check: {
    title: "예약 전 확인 체크리스트",
    items: [
      "서비스 범위(포장/반포장/용달) 확인",
      "추가비용 발생 조건 사전 확인",
      "작업 인원·차량·소요 시간 안내 여부",
      "파손·분실 처리 기준 확인",
    ],
  },
  schedule: {
    title: "이사 일정 준비 방법",
    items: [
      "이사 2~3주 전 견적·예약",
      "주소 이전·공과금·인터넷 이전 신청",
      "폐기물·대형 가구 처리 계획",
      "당일 귀중품·서류 별도 보관",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3] lib/spine/scenes/moving.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("moving");
export const MOVING_SCENE_SPINE = SCENE_TABLE;

export const MOVING_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 이사 서비스 범위 안내" },
  { slot: "info", alt: "이사 진행 순서 안내 자료" },
  { slot: "consult", alt: "이사 견적 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const MOVING_COMPARE = {
  compareWith: "반포장이사",
  compareWithText2: "직접 이사",
};

// BLOCK_MAP 격리용 — 청소/인테리어 등 파생업종과 교차 오염 차단.
//   moving은 '이사' 범위·견적·체크리스트 정보만. 청소/시공 견적 아님.
export const MOVING_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "줄눈시공", "탄성코트", "인테리어공사", "방충망설치",
];
