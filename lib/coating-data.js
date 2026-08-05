import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/coating.js";
// lib/coating-data.js
// 탄성코트(coating) 업종 데이터셋 — v1 / 정보형 + 시공선택 가이드형
// 화자 = {region} 탄성코트 업체. 정보형(결로·곰팡이·보수·종류). 후기·체험·과장광고·브랜드추천 금지.
// 복제 베이스: grout-data.js 80% + interior-data.js 15% + cleaning-data.js 5%
// industry='coating' 고정. 메뉴 8개.
//
// 설계 핵심 (시장 분석 결론):
//   - 줄눈 = 미관 + 오염관리 / 탄성코트 = 결로 + 곰팡이 + 보수.  축이 다름.
//   - 후기형 경쟁 진입 금지 → 정보형 + 시공선택 가이드형으로 차별화.
//   - 관련도 노출 축 = 결로 방지 / 곰팡이 예방 / 크랙·박리 보수 / 시공 범위 / 종류 비교 / 구축 관리.
//   - 최신순 실측 반복 출현: 베란다·세탁실·실외기실·대피공간 / 결로·곰팡이·크랙·박리 / 에어로겔·규조토.
//   - APT_DATA(grout/interior/cleaning 동형) 재사용: 지역+단지명+탄성코트 구조 SEO.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·만족도·과장광고·최저가·보장·추천·브랜드 단정 추천.
//   효과 보장형(곰팡이 완전 제거·결로 완전 차단·100%·완벽·반드시·무조건·효과 보장) 차단.
//   허용 = 결로 방지 / 곰팡이 예방 / 크랙·박리 보수 / 시공 범위 / 종류 비교(일반·세라믹·규조토·에어로겔 = 일반 정보) / 구축 관리 / 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const COATING_META = {
  industry: "coating",
  label: "탄성코트",
  fullLabel: "탄성코트 시공 안내",
  greeting: "안녕하세요. {region} 탄성코트 업체입니다.",
  voice: "{region} 탄성코트 업체",
  badge: "신규",
  // 결정주기: 결로·하자 발생 시점 + 입주준비 기반(일정성, 긴급 아님)
  decisionCycle: "compare",
  // 비용 단정 금지 — 범위·자재(일반/세라믹/규조토/에어로겔)·상태 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·만족도·과장광고·결과보장(효과 보장형)·브랜드 추천 단정 차단
export const COATING_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "100%", "완벽", "역대급", "초대박", "대박", "반영구",
  // 보장·추천·순위 (정보형 고정)
  "보장", "효과 보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 효과 단정 (탄성코트 전용)
  "곰팡이 완전 제거", "결로 완전 차단", "완전 제거", "완전 차단",
  // 후기·체험담·내돈내산
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const COATING_CATS = [
  "베란다코트",
  "결로방지",
  "곰팡이예방",
  "구축아파트",
  "보수",
  "재시공",
  "종류비교",
  "시공범위",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — grout/interior/cleaning과 동형 구조 재사용 (지역+단지명+탄성코트 SEO).
//   단지명 활용: "{aptName} 탄성코트" 구조. 노원 관측 성공 시 동탄·강남·송도 확장.
//   ★ 단지명·생활권만 보유. 탄성코트 특화 시점 정보(시공단가)는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["베란다코트", "구축아파트", "결로방지"],
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
    focus: ["베란다코트", "결로방지", "곰팡이예방"],
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
    focus: ["베란다코트", "구축아파트", "보수"],
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
    focus: ["베란다코트", "결로방지", "시공범위"],
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
//   ★ region 중복 방지: {aptName} 미선택 폴백은 핸들러 buildTitle에서 토큰 삭제(폴백 region 치환 금지).
// ─────────────────────────────────────────────────────────────

// 공간형 (베란다 탄성코트 — 단지명 적극)
const TP_SPACE = (kase) => [
  `{region} {aptName} ${kase} 전 확인사항`,
  `{region} ${kase} 시공 범위와 관리 방법`,
  `{aptName} ${kase} 준비 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 전 알아둘 내용`,
];

// 관리형 (결로·곰팡이 예방 — 방법·체크포인트 축)
const TP_CARE = (kase) => [
  `{region} ${kase} 체크포인트`,
  `{region} {aptName} ${kase} 방법`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 안내`,
  `{livingArea} ${kase} 정리`,
];

// 구축아파트 (결로·곰팡이·크랙·박리 축)
const TP_OLD = (kase) => [
  `{region} {aptName} ${kase} 방법`,
  `{aptName} ${kase} 시 확인할 부분`,
  `{region} ${kase} 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 안내`,
];

// 보수 (들뜸·박리·균열·크랙 축 — 단지명 일부)
const TP_FIX = (kase) => [
  `{region} {aptName} ${kase}가 필요한 경우`,
  `{region} ${kase} 판단 기준 안내`,
  `{aptName} ${kase} 확인 항목`,
  `{region} ${kase} 준비 사항`,
];

// 재시공 (교체 시기·확인 항목 — 단지명 일부)
const TP_REDO = (kase) => [
  `{region} {aptName} ${kase}이 필요한 경우`,
  `{region} ${kase} 판단 기준 안내`,
  `{aptName} ${kase} 확인 항목`,
  `{region} ${kase} 준비 사항`,
];

// 종류 비교 (일반·세라믹·규조토·에어로겔 — 지역형 정보)
const TP_COMPARE = (kase) => [
  `{region} ${kase} 가이드`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 정리`,
  `{region} 탄성코트 시공 전 ${kase}`,
];

// 시공 범위 (안방·주방 베란다·세탁실·실외기실·대피공간 — 지역형)
const TP_SCOPE = (kase) => [
  `{region} ${kase} 안내`,
  `${kase} 정리`,
  `{region} {aptName} ${kase}`,
  `${kase} 알아두면 좋은 점`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 결로·곰팡이·보수·시공범위·진행순서·확인.
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const COATING_TREATMENTS = [
  // ── 베란다 탄성코트 ──────────────────────────
  {
    id: "co_veranda", industry: "coating", name: "베란다 탄성코트", cat: "베란다코트", emoji: "🪟",
    titlePatterns: TP_SPACE("베란다 탄성코트"),
    keywords: ["베란다 탄성코트", "베란다 결로", "베란다 곰팡이", "베란다 페인트"],
    analysisAxis: ["시공 범위", "결로·곰팡이 관리", "진행 순서", "체크포인트"],
    useApt: true, compareWith: "구축아파트 탄성코트", rank: 1, recommendedWeight: 16,
  },

  // ── 결로 방지 관리 ───────────────────────────
  {
    id: "co_condense", industry: "coating", name: "결로 방지 관리", cat: "결로방지", emoji: "💧",
    titlePatterns: TP_CARE("결로 방지 관리"),
    keywords: ["결로 방지", "결로 관리", "결로 곰팡이", "단열 결로"],
    analysisAxis: ["결로 발생 원인", "예방 관리", "시공 관점 관리", "체크포인트"],
    useApt: true, compareWith: "곰팡이 예방 방법", rank: 1, recommendedWeight: 13,
  },

  // ── 곰팡이 예방 방법 ─────────────────────────
  {
    id: "co_mold", industry: "coating", name: "곰팡이 예방 방법", cat: "곰팡이예방", emoji: "🦠",
    titlePatterns: TP_CARE("곰팡이 예방 방법"),
    keywords: ["곰팡이 예방", "곰팡이 관리", "벽면 곰팡이", "습기 곰팡이"],
    analysisAxis: ["발생 원인", "예방 관리", "시공 관점 관리", "체크포인트"],
    useApt: true, compareWith: "결로 방지 관리", rank: 1, recommendedWeight: 12,
  },

  // ── 구축아파트 탄성코트 (결로·곰팡이·크랙·박리) ──
  {
    id: "co_oldapt", industry: "coating", name: "구축아파트 탄성코트", cat: "구축아파트", emoji: "🧱",
    titlePatterns: TP_OLD("구축아파트 탄성코트"),
    keywords: ["구축아파트 탄성코트", "노후 벽면", "벽면 크랙", "벽면 박리"],
    analysisAxis: ["결로·곰팡이 상태", "크랙·박리 확인", "시공 판단", "관리 방법"],
    useApt: true, compareWith: "탄성코트 재시공", rank: 1, recommendedWeight: 13,
  },

  // ── 탄성코트 보수 (들뜸·박리·균열·크랙) ──────
  {
    id: "co_fix", industry: "coating", name: "탄성코트 보수", cat: "보수", emoji: "🩹",
    titlePatterns: TP_FIX("탄성코트 보수"),
    keywords: ["탄성코트 보수", "탄성코트 들뜸", "탄성코트 박리", "탄성코트 균열"],
    analysisAxis: ["들뜸·박리 확인", "균열·크랙 확인", "보수 범위", "진행 순서"],
    useApt: true, compareWith: "탄성코트 재시공", rank: 1, recommendedWeight: 12,
  },

  // ── 탄성코트 재시공 ──────────────────────────
  {
    id: "co_redo", industry: "coating", name: "탄성코트 재시공", cat: "재시공", emoji: "🔧",
    titlePatterns: TP_REDO("탄성코트 재시공"),
    keywords: ["탄성코트 재시공", "탄성코트 교체", "재도장", "탄성코트 재시공 시기"],
    analysisAxis: ["교체 시기", "확인 항목", "준비 사항", "진행 순서"],
    useApt: true, compareWith: "탄성코트 보수", rank: 1, recommendedWeight: 12,
  },

  // ── 탄성코트 종류 비교 (일반·세라믹·규조토·에어로겔 — 지역형) ──
  {
    id: "co_compare", industry: "coating", name: "탄성코트 종류 비교", cat: "종류비교", emoji: "🧪",
    titlePatterns: TP_COMPARE("탄성코트 종류 비교"),
    keywords: ["탄성코트 종류", "세라믹 탄성코트", "규조토", "에어로겔"],
    analysisAxis: ["일반 특성", "세라믹·규조토 특성", "에어로겔 특성", "선택 기준"],
    useApt: false, compareWith: "베란다 탄성코트", rank: 1, recommendedWeight: 12,
  },

  // ── 탄성코트 시공 범위 (안방·주방 베란다·세탁실·실외기실·대피공간 — 지역형) ──
  {
    id: "co_scope", industry: "coating", name: "탄성코트 시공 범위", cat: "시공범위", emoji: "📐",
    titlePatterns: TP_SCOPE("탄성코트 시공 범위"),
    keywords: ["탄성코트 시공 범위", "세탁실 탄성코트", "실외기실", "대피공간"],
    analysisAxis: ["시공 가능 공간", "공간별 확인", "시공 범위 판단", "체크포인트"],
    useApt: false, compareWith: "베란다 탄성코트", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateCoating.js pickInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const COATING_INFO_BLOCKS = {
  veranda: {
    title: "베란다 탄성코트 확인 포인트",
    items: [
      "시공 범위(안방·주방 베란다, 세탁실 등)",
      "기존 벽면 결로·곰팡이 진행 정도",
      "환기·제습 등 결로 예방 관리",
      "기존 도장 상태·박리 여부 확인",
    ],
  },
  condense: {
    title: "결로 방지 관리 확인 포인트",
    items: [
      "결로 발생 구간(외벽 접면·창호 주변)",
      "단열·온도차 등 발생 원인",
      "환기·제습 등 생활 관리 방법",
      "시공 관점 관리 범위 확인",
    ],
  },
  mold: {
    title: "곰팡이 예방 확인 포인트",
    items: [
      "곰팡이 발생 구간(습기·결로 부위)",
      "환기·습도 관리 방법",
      "기존 벽면 오염·번짐 상태",
      "시공 관점 예방 관리 범위",
    ],
  },
  oldapt: {
    title: "구축아파트 탄성코트 확인 포인트",
    items: [
      "결로·곰팡이 진행 정도",
      "벽면 크랙·박리 등 노후 상태",
      "부분 보수 vs 전체 재시공 판단",
      "※ 단지·세대별 상태 상이 — 현장 확인 후 판단",
    ],
  },
  fix: {
    title: "탄성코트 보수 확인 포인트",
    items: [
      "들뜸·박리 발생 범위",
      "균열·크랙 진행 정도",
      "기존 도장 제거 범위",
      "보수 전 건조·청소 등 준비 사항",
    ],
  },
  redo: {
    title: "탄성코트 재시공 확인 포인트",
    items: [
      "교체 시기(박리·균열·곰팡이 반복)",
      "기존 도장 제거 범위",
      "시공 전 건조·청소 등 준비 사항",
      "사용 자재(일반·세라믹 등) 선택 확인",
    ],
  },
  compare: {
    title: "탄성코트 자재 비교 포인트",
    items: [
      "일반 탄성코트 = 기본 탄성·방수 특성",
      "세라믹·규조토 = 흡방습·결로 관련 특성",
      "에어로겔 = 단열 관련 특성",
      "※ 자재별 특성은 일반 정보 — 현장 환경에 따라 적합도 상이",
    ],
  },
  scope: {
    title: "탄성코트 시공 범위 확인 포인트",
    items: [
      "안방·주방 베란다 등 공간 구분",
      "세탁실·실외기실·대피공간 등 확장 구간",
      "공간별 결로·습기 차이",
      "시공 범위에 따른 준비 사항 확인",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3-2차] lib/spine/scenes/coating.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("coating");
export const COATING_SCENE_SPINE = SCENE_TABLE;

export const COATING_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 탄성코트 시공 범위 안내" },
  { slot: "info",    alt: "탄성코트 관리 방법 안내 자료" },
  { slot: "consult", alt: "탄성코트 시공 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const COATING_COMPARE = {
  compareWith: "베란다 탄성코트",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 줄눈/인테리어/청소/이사 등 인접업종과 교차 오염 차단.
//   coating은 '탄성코트 시공·결로·곰팡이·보수' 범위·관리·체크리스트 정보만.
export const COATING_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "포장이사", "아파트 리모델링", "도배장판", "줄눈", "에어컨청소",
];
