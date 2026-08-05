import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/systemair.js";
// lib/systemair-data.js
// 시스템에어컨(systemair) 업종 데이터셋 — v1 / 정보형 + 설치선택 가이드형
// 화자 = {region} 시스템에어컨 업체. 정보형(설치·교체·추가설치·배관·실외기실). 후기·체험·과장광고·추천 금지.
// 복제 베이스: coating-data.js 40% + interior-data.js 40% + moving-data.js 20%
// industry='systemair' 고정. 메뉴 8개.
//
// 설계 핵심 (작업지시서 결론):
//   - 설치/교체 정보형. 아파트 중심. useApt 적극 활용.
//   - 에어컨청소 업종과 완전 분리(분해청소·고압세척·에바·필터·곰팡이/냄새 제거·청소주기·세척·살균 차단).
//   - 관련도 노출 축 = 설치 / 교체 / 추가설치 / 배관 / 실외기실 / 견적.
//   - 실측 반복 출현: 실내기·실외기 위치 / 선배관·단배관·배수배관 / 전기 용량 / 실외기실 공간.
//   - APT_DATA(coating 동형) 재사용: 지역+단지명+시스템에어컨 구조 SEO.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·만족도·과장광고·최저가·보장·추천·브랜드 단정 추천.
//   효과 보장형(100%·완벽·반드시·무조건·보장) 차단.
//   ★ 청소 오염 차단: 분해청소·완전분해·고압세척·에바청소·필터청소·곰팡이 제거·냄새 제거·청소주기·세척·살균.
//   허용 = 설치 위치 / 실내기·실외기 위치 / 배관 구성 / 전기 용량 / 설치 절차 / 교체 판단 / 추가설치 / 실외기실 확인 / 견적 영향요소.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const SYSTEMAIR_META = {
  industry: "systemair",
  label: "시스템에어컨",
  fullLabel: "시스템에어컨 설치 안내",
  greeting: "안녕하세요. {region} 시스템에어컨 업체입니다.",
  voice: "{region} 시스템에어컨 업체",
  badge: "신규",
  // 결정주기: 입주·리모델링·교체 시점 기반(일정성, 긴급 아님)
  decisionCycle: "compare",
  // 비용 단정 금지 — 평형·배관·전기·구조 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·만족도·과장광고·결과보장·추천 단정 + 청소 업종 오염 차단
export const SYSTEMAIR_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "100%", "완벽", "역대급", "초대박", "대박",
  // 보장·추천·순위 (정보형 고정)
  "보장", "효과 보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 후기·체험담·내돈내산
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도",
  "시공후기", "재이용", "확 달라진", "환골탈태",
  // ★ 청소 업종 오염 차단 (작업지시서 STEP5)
  "분해청소", "완전분해", "고압세척", "에바청소", "필터청소",
  "곰팡이 제거", "냄새 제거", "청소주기", "세척", "살균",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const SYSTEMAIR_CATS = [
  "설치",
  "아파트설치",
  "구축아파트",
  "교체",
  "견적",
  "추가설치",
  "배관",
  "실외기실",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — coating과 동형 구조 재사용 (지역+단지명+시스템에어컨 SEO).
//   단지명 활용: "{aptName} 시스템에어컨" 구조. 노원 관측 성공 시 동탄·강남·송도 확장.
//   ★ 단지명·생활권만 보유. 시공단가 등 시점 정보는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["설치", "구축아파트", "교체"],
    apts: [
      { name: "상계주공5단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "상계주공7단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "중계그린",     district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "중계무지개",   district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "하계장미",     district: "하계동", station: "하계역(7호선)", livingArea: "하계 생활권" },
      { name: "청구3차",      district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
    ],
  },
  dongtan: {
    label: "동탄",
    region: "화성시",
    focus: ["설치", "아파트설치", "추가설치"],
    apts: [
      { name: "동탄역센트럴푸르지오", district: "오산동", station: "동탄역(SRT)",  livingArea: "동탄역 생활권" },
      { name: "반도유보라아이비파크", district: "청계동", station: "동탄역(SRT)",  livingArea: "동탄역 생활권" },
      { name: "호반써밋",             district: "영천동", station: "동탄역(SRT)",  livingArea: "동탄2 생활권" },
      { name: "동탄린스트라우스",     district: "능동",   station: "동탄 호수공원", livingArea: "동탄1 생활권" },
    ],
  },
  gangnam: {
    label: "강남",
    region: "강남구",
    focus: ["설치", "구축아파트", "교체"],
    apts: [
      { name: "은마",               district: "대치동", station: "대치역(3호선)",      livingArea: "대치 생활권" },
      { name: "개포주공",           district: "개포동", station: "개포동역(분당선)",   livingArea: "개포 생활권" },
      { name: "래미안대치팰리스",   district: "대치동", station: "대치역(3호선)",      livingArea: "대치 생활권" },
      { name: "도곡렉슬",           district: "도곡동", station: "도곡역(3호선/분당선)", livingArea: "도곡 생활권" },
    ],
  },
  songdo: {
    label: "송도",
    region: "연수구",
    focus: ["설치", "아파트설치", "배관"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)",   livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)",   livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)",   livingArea: "송도 생활권" },
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
// 제목 패턴 — data.js 소유. 생성기는 소비만 한다.
//   ★ {aptName} 토큰은 단지 풀 매칭 시에만 사용(미선택 시 핸들러가 패턴 필터).
//   ★ region 중복 방지: {aptName} 미선택 폴백은 핸들러 buildTitle에서 토큰 삭제.
// ─────────────────────────────────────────────────────────────

// 설치형 (시스템에어컨 설치 — 단지명 적극)
const TP_INSTALL = (kase) => [
  `{region} {aptName} ${kase} 전 확인사항`,
  `{region} ${kase} 위치와 배관 구성`,
  `{aptName} ${kase} 준비 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 전 알아둘 내용`,
];

// 아파트설치 (실내기·실외기 위치·전기용량 축)
const TP_APT = (kase) => [
  `{region} {aptName} ${kase} 전 확인사항`,
  `{aptName} ${kase} 체크포인트`,
  `{region} ${kase} 위치 확인 안내`,
  `{livingArea} ${kase} 준비 사항`,
  `{region} ${kase} 진행 순서`,
];

// 구축아파트 (선배관 유무·전기 용량·구조 확인 축)
const TP_OLD = (kase) => [
  `{region} {aptName} ${kase} 시 확인할 부분`,
  `{aptName} ${kase} 체크포인트`,
  `{region} ${kase} 진행 순서 안내`,
  `{region} ${kase} 준비 사항`,
  `{livingArea} ${kase} 안내`,
];

// 교체 (노후화·냉방저하·소음·리모델링 축 — 단지명 일부)
const TP_REPLACE = (kase) => [
  `{region} {aptName} ${kase}가 필요한 경우`,
  `{region} ${kase} 판단 기준 안내`,
  `{aptName} ${kase} 준비 방법`,
  `{region} ${kase} 확인 항목`,
];

// 견적 (영향 요소·확인 항목 — 단지명 일부)
const TP_QUOTE = (kase) => [
  `{region} {aptName} ${kase} 시 살펴볼 부분`,
  `{region} ${kase} 전 알아둘 점`,
  `{aptName} ${kase} 체크포인트`,
  `{region} ${kase} 영향 요소 안내`,
];

// 추가설치 (후시공·실외기 용량·추가 배관·구조 확인 축)
const TP_ADD = (kase) => [
  `{region} {aptName} ${kase} 체크포인트`,
  `{aptName} ${kase} 전 확인사항`,
  `{region} ${kase} 진행 순서 안내`,
  `{region} ${kase} 준비 사항`,
];

// 배관 (선배관·단배관·배관 길이·배수배관 — 지역형 정보)
const TP_PIPE = (kase) => [
  `{region} ${kase} 확인사항`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 안내`,
  `{region} 시스템에어컨 ${kase} 정리`,
];

// 실외기실 (공간·환기·점검·배치 — 지역형)
const TP_OUTUNIT = (kase) => [
  `{region} ${kase} 체크 가이드`,
  `${kase} 확인 포인트`,
  `{region} {aptName} ${kase}`,
  `${kase} 알아두면 좋은 점`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 설치·교체·추가설치·배관·실외기실·확인.
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const SYSTEMAIR_TREATMENTS = [
  // ── 시스템에어컨 설치 ────────────────────────
  {
    id: "sa_install", industry: "systemair", name: "시스템에어컨 설치", cat: "설치", emoji: "❄️",
    titlePatterns: TP_INSTALL("시스템에어컨 설치"),
    keywords: ["시스템에어컨 설치", "천장형 에어컨", "실내기 설치", "냉방 설치"],
    analysisAxis: ["설치 위치", "실내기·실외기 위치", "배관 구성", "전기 용량", "설치 절차"],
    useApt: true, compareWith: "아파트 시스템에어컨", rank: 1, recommendedWeight: 16,
  },

  // ── 아파트 시스템에어컨 ──────────────────────
  {
    id: "sa_apt", industry: "systemair", name: "아파트 시스템에어컨", cat: "아파트설치", emoji: "🏢",
    titlePatterns: TP_APT("아파트 시스템에어컨"),
    keywords: ["아파트 시스템에어컨", "신축아파트 에어컨", "실내기 위치", "실외기 위치"],
    analysisAxis: ["실내기 위치", "실외기 위치", "전기 용량", "설치 절차"],
    useApt: true, compareWith: "시스템에어컨 설치", rank: 1, recommendedWeight: 13,
  },

  // ── 구축아파트 시스템에어컨 ──────────────────
  {
    id: "sa_oldapt", industry: "systemair", name: "구축아파트 시스템에어컨", cat: "구축아파트", emoji: "🧱",
    titlePatterns: TP_OLD("구축아파트 시스템에어컨"),
    keywords: ["구축아파트 시스템에어컨", "선배관 유무", "전기 증설", "구조 확인"],
    analysisAxis: ["선배관 유무", "전기 용량", "구조 확인", "설치 절차"],
    useApt: true, compareWith: "시스템에어컨 교체", rank: 1, recommendedWeight: 13,
  },

  // ── 시스템에어컨 교체 ────────────────────────
  {
    id: "sa_replace", industry: "systemair", name: "시스템에어컨 교체", cat: "교체", emoji: "🔄",
    titlePatterns: TP_REPLACE("시스템에어컨 교체"),
    keywords: ["시스템에어컨 교체", "노후 에어컨", "냉방 저하", "에어컨 소음"],
    analysisAxis: ["노후화", "냉방 저하", "소음", "리모델링"],
    useApt: true, compareWith: "시스템에어컨 추가설치", rank: 1, recommendedWeight: 12,
  },

  // ── 시스템에어컨 견적 ────────────────────────
  {
    id: "sa_quote", industry: "systemair", name: "시스템에어컨 견적", cat: "견적", emoji: "📋",
    titlePatterns: TP_QUOTE("시스템에어컨 견적"),
    keywords: ["시스템에어컨 견적", "설치 비용 요소", "평형 견적", "견적 확인"],
    analysisAxis: ["평형·대수", "배관·전기 영향", "설치 범위", "확인 항목"],
    useApt: true, compareWith: "시스템에어컨 설치", rank: 1, recommendedWeight: 12,
  },

  // ── 시스템에어컨 추가설치 ────────────────────
  {
    id: "sa_add", industry: "systemair", name: "시스템에어컨 추가설치", cat: "추가설치", emoji: "➕",
    titlePatterns: TP_ADD("시스템에어컨 추가설치"),
    keywords: ["시스템에어컨 추가설치", "후시공", "실외기 용량", "추가 배관"],
    analysisAxis: ["후시공", "실외기 용량", "추가 배관", "구조 확인"],
    useApt: true, compareWith: "시스템에어컨 교체", rank: 1, recommendedWeight: 12,
  },

  // ── 시스템에어컨 배관 (선배관·단배관·배관길이·배수배관 — 지역형) ──
  {
    id: "sa_pipe", industry: "systemair", name: "시스템에어컨 배관", cat: "배관", emoji: "🔧",
    titlePatterns: TP_PIPE("시스템에어컨 배관"),
    keywords: ["시스템에어컨 배관", "선배관", "단배관", "배수배관"],
    analysisAxis: ["선배관·단배관", "배관 길이", "배수배관", "확인 항목"],
    useApt: false, compareWith: "시스템에어컨 설치", rank: 1, recommendedWeight: 12,
  },

  // ── 시스템에어컨 실외기실 체크 (공간·환기·점검·배치 — 지역형) ──
  {
    id: "sa_outunit", industry: "systemair", name: "시스템에어컨 실외기실 체크", cat: "실외기실", emoji: "📐",
    titlePatterns: TP_OUTUNIT("실외기실"),
    keywords: ["실외기실", "실외기 공간", "실외기 환기", "실외기 배치"],
    analysisAxis: ["공간 확인", "환기 구조", "점검 공간", "배치 확인"],
    useApt: false, compareWith: "시스템에어컨 설치", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateSystemair.js pickInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const SYSTEMAIR_INFO_BLOCKS = {
  install: {
    title: "시스템에어컨 설치 확인 포인트",
    items: [
      "실내기 설치 위치(천장 매립 공간·라인)",
      "실외기 위치·실외기실 공간",
      "배관 구성·배관 길이",
      "전기 용량·전용 회로 여부",
    ],
  },
  apt: {
    title: "아파트 시스템에어컨 확인 포인트",
    items: [
      "실내기 위치(거실·방별 배치)",
      "실외기 위치·실외기실 환기",
      "전기 용량·분전반 확인",
      "천장 매립·점검구 공간",
    ],
  },
  oldapt: {
    title: "구축아파트 시스템에어컨 확인 포인트",
    items: [
      "선배관 유무·기존 배관 활용 가능 여부",
      "전기 용량·증설 필요 여부",
      "천장 구조·매립 공간 확인",
      "※ 단지·세대별 구조 상이 — 현장 확인 후 판단",
    ],
  },
  replace: {
    title: "시스템에어컨 교체 확인 포인트",
    items: [
      "교체 사유(노후화·냉방 저하·소음)",
      "기존 배관 재사용 가능 여부",
      "리모델링 일정과의 연계",
      "기존 실내기·실외기 철거 범위",
    ],
  },
  quote: {
    title: "시스템에어컨 견적 영향 요소",
    items: [
      "평형·실내기 대수",
      "배관 길이·전기 증설 여부",
      "실외기실·매립 등 설치 범위",
      "※ 정확한 금액은 현장 확인 후 산출",
    ],
  },
  add: {
    title: "시스템에어컨 추가설치 확인 포인트",
    items: [
      "후시공 가능 공간·천장 여유",
      "기존 실외기 용량·추가 가능 여부",
      "추가 배관 경로",
      "기존 설비와의 구조 확인",
    ],
  },
  pipe: {
    title: "시스템에어컨 배관 확인 포인트",
    items: [
      "선배관 = 골조 단계 매립 배관",
      "단배관·배관 길이에 따른 영향",
      "배수배관(드레인) 구배·경로",
      "배관 노출·매립 구분",
    ],
  },
  outunit: {
    title: "실외기실 확인 포인트",
    items: [
      "실외기실 공간·실외기 수용 대수",
      "환기 구조·열 배출 여건",
      "점검·정비 공간 확보",
      "실외기 배치·이격 거리",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3-2차] lib/spine/scenes/systemair.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("systemair");
export const SYSTEMAIR_SCENE_SPINE = SCENE_TABLE;

export const SYSTEMAIR_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 시스템에어컨 설치 위치 안내" },
  { slot: "info",    alt: "시스템에어컨 배관·실외기 안내 자료" },
  { slot: "consult", alt: "시스템에어컨 설치 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const SYSTEMAIR_COMPARE = {
  compareWith: "시스템에어컨 설치",
  compareWithText2: "현장 확인",
};

// BLOCK_MAP 격리용 — 에어컨청소/줄눈/인테리어/청소 등 인접업종과 교차 오염 차단.
//   systemair는 '시스템에어컨 설치·교체·추가설치·배관·실외기실' 정보만. 청소 토큰 전면 차단.
export const SYSTEMAIR_BLOCK_KEYWORDS = [
  "에어컨청소", "분해청소", "에바청소", "필터청소", "입주청소", "줄눈", "탄성코트", "도배장판",
];
