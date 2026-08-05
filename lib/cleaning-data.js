import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/cleaning.js";
// lib/cleaning-data.js
// 입주청소(cleaning) 업종 데이터셋 — v1 / 정보형 + 업체선택 가이드형
// 화자 = {region} 입주청소 업체. 정보형(범위·비용·체크리스트). 후기·체험·과장광고 금지.
// 복제 베이스: realestate-data.js (cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용)
// industry='cleaning' 고정. 메뉴 8개.
//
// 설계 핵심 (시장 분석 결론):
//   - 후기형 경쟁 진입 금지 → 정보형 + 업체선택 가이드형으로 차별화.
//   - 관련도 노출 축 = 업체 고르는 법 / 비용 / 추가비용 / 체크리스트.
//   - APT_DATA(realestate 동형) 재사용: 지역+단지명+입주청소 구조 SEO.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·과장광고·최저가·보장·추천.
//   허용 = 청소 범위 / 비용 영향 요소 / 진행 순서 / 예약 전 확인 / 체크리스트
//          (시점 무관 구조 정보).
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const CLEANING_META = {
  industry: "cleaning",
  label: "입주청소",
  fullLabel: "입주청소 안내",
  greeting: "안녕하세요. {region} 입주청소 업체입니다.",
  voice: "{region} 입주청소 업체",
  badge: "신규",
  // 결정주기: 입주·이사 일정 전 비교·예약 (긴급 아님, 일정 기반)
  decisionCycle: "compare",
  // 비용 단정 금지 — 평수·상태·옵션 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·과장광고·결과보장 차단
export const CLEANING_FORBIDDEN = [
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
export const CLEANING_CATS = [
  "입주청소",
  "이사청소",
  "신축청소",
  "구축청소",
  "주거형태",
  "비용",
  "체크리스트",
  "청소상식",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — realestate와 동형 구조 재사용 (지역+단지명+입주청소 SEO).
//   단지명 활용: "{aptName} 입주청소" 구조. 노원 관측 성공 시 강남·송도·세종 확장.
//   ★ 단지명·생활권만 보유. 청소 특화 시점 정보는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["입주청소", "신축청소", "구축청소"],
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
    focus: ["입주청소", "구축청소", "오피스텔청소"],
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
    focus: ["신축청소", "입주청소", "오피스텔청소"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
    ],
  },
  sejong: {
    label: "세종",
    region: "세종시",
    focus: ["신축청소", "입주청소"],
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
// ─────────────────────────────────────────────────────────────

// 입주청소 (단지/지역 단위 안내)
//   축A 지역+입주청소 / 축B 생활권+입주청소 / 축E APT명 단독+입주청소
const TP_MOVEIN = (kase) => [
  `{region} ${kase} 전 확인해야 할 사항`,            // 축A 지역
  `{region} {aptName} ${kase} 범위 안내`,            // 지역+APT
  `{aptName} ${kase} 범위 안내`,                     // 축E APT 단독
  `{aptName} ${kase} 체크리스트`,                    // 축E APT 단독
  `{livingArea} ${kase} 안내`,                       // 축B 생활권
  `{region} ${kase} 진행 순서 정리`,
  `{region} ${kase} 예약 전 알아둘 점`,
];

// 이사청소 (이사 일정 기반)
const TP_MOVE = (kase) => [
  `{region} ${kase} 예약 시 알아둘 점`,
  `{region} ${kase} 범위와 순서 안내`,
  `{region} ${kase} 비용이 달라지는 이유`,
  `{region} {aptName} ${kase} 안내`,
];

// 신축/구축 (상태별 청소 차이)
const TP_STATE = (kase) => [
  `{region} ${kase} 체크리스트`,
  `{region} {aptName} ${kase} 범위 안내`,
  `{region} ${kase} 전 확인할 점`,
  `{region} ${kase} 진행 순서`,
];

// 주거형태 (원룸·오피스텔)
const TP_TYPE = (kase) => [
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 예약 전 확인사항`,
  `{region} ${kase} 비용 영향 요소`,
  `{region} ${kase} 체크리스트`,
];

// 비용 (비용 영향 요소형)
const TP_COST = (kase) => [
  `{region} ${kase}이 달라지는 이유`,
  `{region} ${kase} 영향 요소 정리`,
  `{region} ${kase} 추가비용 발생 사례`,
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
//   analysisAxis = 정보형 섹션축: 범위·비용요소·진행순서·예약확인·체크리스트
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const CLEANING_TREATMENTS = [
  // ── 입주청소 ──────────────────────────────────
  {
    id: "cl_movein", industry: "cleaning", name: "입주청소", cat: "입주청소", emoji: "🧹",
    titlePatterns: TP_MOVEIN("입주청소"),
    keywords: ["입주청소 범위", "입주청소 비용", "입주청소 체크리스트", "입주 전 청소"],
    analysisAxis: ["청소 범위", "비용 영향 요소", "진행 순서", "예약 전 확인", "체크포인트"],
    useApt: true, compareWith: "이사청소", rank: 1, recommendedWeight: 20,
  },

  // ── 이사청소 ──────────────────────────────────
  {
    id: "cl_move", industry: "cleaning", name: "이사청소", cat: "이사청소", emoji: "📦",
    titlePatterns: TP_MOVE("이사청소"),
    keywords: ["이사청소 범위", "이사청소 비용", "이사 전 청소", "이사청소 예약"],
    analysisAxis: ["청소 범위", "비용 영향 요소", "진행 순서", "예약 전 확인", "체크포인트"],
    useApt: true, compareWith: "입주청소", rank: 1, recommendedWeight: 15,
  },

  // ── 신축청소 ──────────────────────────────────
  {
    id: "cl_new", industry: "cleaning", name: "신축아파트청소", cat: "신축청소", emoji: "🏢",
    titlePatterns: TP_STATE("신축아파트 입주청소"),
    keywords: ["신축 입주청소", "분진 제거", "새집증후군", "신축 청소 범위"],
    analysisAxis: ["분진 제거", "새집증후군 관리", "청소 범위", "진행 순서", "체크포인트"],
    useApt: true, compareWith: "구축청소", rank: 1, recommendedWeight: 10,
  },

  // ── 구축청소 ──────────────────────────────────
  {
    id: "cl_old", industry: "cleaning", name: "구축아파트청소", cat: "구축청소", emoji: "🏚️",
    titlePatterns: TP_STATE("구축아파트 입주청소"),
    keywords: ["구축 입주청소", "묵은 때 제거", "창틀 청소", "구축 청소 범위"],
    analysisAxis: ["묵은 때 제거", "창틀·곰팡이", "청소 범위", "진행 순서", "체크포인트"],
    useApt: true, compareWith: "신축청소", rank: 2, recommendedWeight: 10,
  },

  // ── 주거형태 ──────────────────────────────────
  {
    id: "cl_oneroom", industry: "cleaning", name: "원룸청소", cat: "주거형태", emoji: "🛏️",
    titlePatterns: TP_TYPE("원룸 입주청소"),
    keywords: ["원룸 입주청소", "원룸 청소 비용", "원룸 청소 범위", "소형 입주청소"],
    analysisAxis: ["청소 범위", "비용 영향 요소", "예약 전 확인", "체크포인트"],
    useApt: false, compareWith: "오피스텔청소", rank: 1, recommendedWeight: 10,
  },
  {
    id: "cl_officetel", industry: "cleaning", name: "오피스텔청소", cat: "주거형태", emoji: "🏙️",
    titlePatterns: TP_TYPE("오피스텔 입주청소"),
    keywords: ["오피스텔 입주청소", "오피스텔 청소 비용", "오피스텔 청소 범위"],
    analysisAxis: ["청소 범위", "비용 영향 요소", "예약 전 확인", "체크포인트"],
    useApt: false, compareWith: "원룸청소", rank: 2, recommendedWeight: 10,
  },

  // ── 비용 ──────────────────────────────────────
  {
    id: "cl_cost", industry: "cleaning", name: "청소비용", cat: "비용", emoji: "💰",
    titlePatterns: TP_COST("입주청소 비용"),
    keywords: ["입주청소 비용", "청소 평수별 비용", "추가비용", "비용 영향 요소"],
    analysisAxis: ["비용 영향 요소", "평수·상태별 차이", "추가비용 발생 사례", "확인할 점"],
    useApt: false, compareWith: "견적 비교", rank: 1, recommendedWeight: 15,
  },

  // ── 체크리스트 ────────────────────────────────
  {
    id: "cl_check", industry: "cleaning", name: "체크리스트", cat: "체크리스트", emoji: "✅",
    titlePatterns: TP_CHECK("입주청소 체크리스트"),
    keywords: ["입주청소 체크리스트", "청소 확인 항목", "청소 후 점검", "업체 고르는 법"],
    analysisAxis: ["예약 전 확인", "청소 범위 확인", "청소 후 점검", "업체 선택 기준"],
    useApt: false, compareWith: "직접 청소", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateCleaning.js insertInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const CLEANING_INFO_BLOCKS = {
  movein: {
    title: "입주청소 진행 순서",
    items: [
      "사전 점검 → 분진·먼지 제거",
      "주방·욕실 집중 청소 → 창틀·새시",
      "바닥 청소 → 마감 점검",
      "※ 평수·상태에 따라 소요 시간은 달라질 수 있음",
    ],
  },
  newbuild: {
    title: "신축 입주청소 체크포인트",
    items: [
      "건축 분진·석고가루 제거",
      "새집증후군 관리(환기·베이크아웃 안내)",
      "싱크대·붙박이장 내부 마감 잔재 제거",
      "창틀·새시 실리콘 주변 정리",
    ],
  },
  oldbuild: {
    title: "구축 입주청소 체크포인트",
    items: [
      "묵은 때·기름때 제거(주방 집중)",
      "욕실 곰팡이·물때 제거",
      "창틀·베란다 곰팡이 점검",
      "노후 설비 주변 상태 확인",
    ],
  },
  cost: {
    title: "비용에 영향을 주는 요소",
    items: [
      "평수·방 개수·화장실 개수",
      "신축/구축·거주 흔적 정도",
      "추가 옵션(새집증후군·줄눈·곰팡이 제거 등)",
      "※ 정확한 금액은 현장 확인 후 산정",
    ],
  },
  check: {
    title: "예약 전 확인 체크리스트",
    items: [
      "청소 범위(기본/추가 옵션) 확인",
      "추가비용 발생 조건 사전 확인",
      "작업 인원·소요 시간 안내 여부",
      "청소 후 점검(재방문·하자 처리) 기준",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3] lib/spine/scenes/cleaning.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("cleaning");
export const CLEANING_SCENE_SPINE = SCENE_TABLE;

export const CLEANING_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 입주청소 범위 안내" },
  { slot: "info", alt: "청소 진행 순서 안내 자료" },
  { slot: "consult", alt: "입주청소 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const CLEANING_COMPARE = {
  compareWith: "이사청소",
  compareWithText2: "직접 청소",
};

// BLOCK_MAP 격리용 — 인테리어/이사/줄눈 등 파생업종과 교차 오염 차단.
//   cleaning은 '청소' 범위·비용·체크리스트 정보만. 시공/이사 견적 아님.
export const CLEANING_BLOCK_KEYWORDS = [
  "줄눈시공", "탄성코트", "인테리어공사", "이사견적", "포장이사", "방충망설치",
];
