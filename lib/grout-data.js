import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/grout.js";
// lib/grout-data.js
// 줄눈(grout) 업종 데이터셋 — v1 / 정보형 + 시공선택 가이드형
// 화자 = {region} 줄눈 시공 업체. 정보형(시공범위·관리·체크포인트). 후기·체험·과장광고·브랜드추천 금지.
// 복제 베이스: interior-data.js 70% + cleaning-data.js 30% (cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용)
// industry='grout' 고정. 메뉴 8개.
//
// 설계 핵심 (시장 분석 결론 — A급, 후기형 과다·정보형 부족):
//   - 후기형 경쟁 진입 금지 → 정보형 + 시공선택 가이드형으로 차별화.
//   - 관련도 노출 축 = 시공 범위 / 관리 방법 / 곰팡이·오염 예방 / 재시공 판단 / 종류 비교 / 체크리스트.
//   - 신축아파트·입주준비·구축 재시공·케라폭시·폴리우레아 비중 높음 → 정보형으로 흡수.
//   - APT_DATA(interior/cleaning 동형) 재사용: 지역+단지명+줄눈 구조 SEO.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·만족도·과장광고·최저가·보장·추천·브랜드 단정 추천.
//   허용 = 시공 범위 / 관리 방법 / 곰팡이·오염 예방 / 재시공 판단 / 종류 비교(케라폭시·폴리우레아 = 일반 정보) / 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const GROUT_META = {
  industry: "grout",
  label: "줄눈",
  fullLabel: "줄눈 시공 안내",
  greeting: "안녕하세요. {region} 줄눈 시공 업체입니다.",
  voice: "{region} 줄눈 시공 업체",
  badge: "신규",
  // 결정주기: 입주준비·재시공 계획 기반 비교(일정성, 긴급 아님)
  decisionCycle: "compare",
  // 비용 단정 금지 — 범위·자재(케라폭시/폴리우레아)·상태 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·만족도·과장광고·결과보장·브랜드 추천 단정 차단
export const GROUT_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "반영구",
  // 보장·추천·순위 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 후기·체험담·내돈내산
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const GROUT_CATS = [
  "욕실줄눈",
  "주방줄눈",
  "현관줄눈",
  "베란다줄눈",
  "구축아파트",
  "재시공",
  "종류비교",
  "체크리스트",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — interior/cleaning과 동형 구조 재사용 (지역+단지명+줄눈 SEO).
//   단지명 활용: "{aptName} 줄눈" 구조. 노원 관측 성공 시 동탄·강남·송도 확장.
//   ★ 단지명·생활권만 보유. 줄눈 특화 시점 정보(시공단가)는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["욕실줄눈", "구축아파트", "재시공"],
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
    focus: ["욕실줄눈", "주방줄눈", "베란다줄눈"],
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
    focus: ["욕실줄눈", "구축아파트", "재시공"],
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
    focus: ["욕실줄눈", "주방줄눈", "체크리스트"],
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

// 공간형 (욕실·주방·현관·베란다 줄눈 — 단지명 적극)
const TP_SPACE = (kase) => [
  `{region} {aptName} ${kase} 시공 전 확인사항`,
  `{region} ${kase} 시공 범위와 관리 방법`,
  `{aptName} ${kase} 준비 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 시공 전 알아둘 내용`,
];

// 구축아파트 줄눈 관리 (변색·균열·재시공 판단 축)
const TP_OLD = (kase) => [
  `{region} {aptName} ${kase} 방법`,
  `{aptName} ${kase} 시 확인할 부분`,
  `{region} ${kase} 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 안내`,
];

// 재시공 (교체 시기·확인 항목 — 단지명 일부)
const TP_REDO = (kase) => [
  `{region} {aptName} ${kase}이 필요한 경우`,
  `{region} ${kase} 판단 기준 안내`,
  `{aptName} ${kase} 확인 항목`,
  `{region} ${kase} 준비 사항`,
];

// 종류 비교 (케라폭시·폴리우레아 — 지역형 정보)
const TP_COMPARE = (kase) => [
  `{region} ${kase} 가이드`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 정리`,
  `{region} 줄눈 시공 전 ${kase}`,
];

// 입주 전 체크리스트 (확인 항목형 — 지역형)
const TP_CHECK = (kase) => [
  `{region} ${kase}`,
  `${kase} 정리`,
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 시공범위·관리방법·진행순서·예약확인.
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const GROUT_TREATMENTS = [
  // ── 욕실 줄눈 시공 ───────────────────────────
  {
    id: "gr_bath", industry: "grout", name: "욕실 줄눈 시공", cat: "욕실줄눈", emoji: "🚿",
    titlePatterns: TP_SPACE("욕실 줄눈"),
    keywords: ["욕실 줄눈", "욕실 줄눈 시공", "욕실 곰팡이", "타일 줄눈"],
    analysisAxis: ["시공 범위", "관리 방법", "곰팡이 예방", "체크포인트"],
    useApt: true, compareWith: "주방 줄눈 시공", rank: 1, recommendedWeight: 18,
  },

  // ── 주방 줄눈 시공 ───────────────────────────
  {
    id: "gr_kitchen", industry: "grout", name: "주방 줄눈 시공", cat: "주방줄눈", emoji: "🍳",
    titlePatterns: TP_SPACE("주방 줄눈"),
    keywords: ["주방 줄눈", "주방 줄눈 시공", "싱크대 줄눈", "주방 오염"],
    analysisAxis: ["오염 관리", "물기 관리", "시공 범위", "체크포인트"],
    useApt: true, compareWith: "욕실 줄눈 시공", rank: 1, recommendedWeight: 14,
  },

  // ── 현관 줄눈 시공 ───────────────────────────
  {
    id: "gr_entrance", industry: "grout", name: "현관 줄눈 시공", cat: "현관줄눈", emoji: "🚪",
    titlePatterns: TP_SPACE("현관 줄눈"),
    keywords: ["현관 줄눈", "현관 줄눈 시공", "현관 타일", "현관 오염"],
    analysisAxis: ["오염 방지", "청소 관리", "시공 범위", "체크포인트"],
    useApt: true, compareWith: "베란다 줄눈 시공", rank: 2, recommendedWeight: 10,
  },

  // ── 베란다 줄눈 시공 ─────────────────────────
  {
    id: "gr_veranda", industry: "grout", name: "베란다 줄눈 시공", cat: "베란다줄눈", emoji: "🪟",
    titlePatterns: TP_SPACE("베란다 줄눈"),
    keywords: ["베란다 줄눈", "베란다 줄눈 시공", "베란다 결로", "베란다 곰팡이"],
    analysisAxis: ["결로 관리", "습기 관리", "시공 범위", "체크포인트"],
    useApt: true, compareWith: "욕실 줄눈 시공", rank: 2, recommendedWeight: 10,
  },

  // ── 구축아파트 줄눈 관리 (변색·균열·재시공 판단) ──
  {
    id: "gr_oldapt", industry: "grout", name: "구축아파트 줄눈 관리", cat: "구축아파트", emoji: "🧱",
    titlePatterns: TP_OLD("구축아파트 줄눈 관리"),
    keywords: ["구축아파트 줄눈", "줄눈 변색", "줄눈 균열", "줄눈 노후"],
    analysisAxis: ["변색·노후 상태", "균열 확인", "재시공 판단", "관리 방법"],
    useApt: true, compareWith: "줄눈 재시공", rank: 1, recommendedWeight: 13,
  },

  // ── 줄눈 재시공 체크포인트 ────────────────────
  {
    id: "gr_redo", industry: "grout", name: "줄눈 재시공", cat: "재시공", emoji: "🔧",
    titlePatterns: TP_REDO("줄눈 재시공"),
    keywords: ["줄눈 재시공", "줄눈 교체", "줄눈 보수", "줄눈 재시공 시기"],
    analysisAxis: ["교체 시기", "확인 항목", "준비 사항", "진행 순서"],
    useApt: true, compareWith: "구축아파트 줄눈 관리", rank: 1, recommendedWeight: 12,
  },

  // ── 줄눈 종류 비교 (케라폭시·폴리우레아 — 지역형) ──
  {
    id: "gr_compare", industry: "grout", name: "줄눈 종류 비교", cat: "종류비교", emoji: "🧪",
    titlePatterns: TP_COMPARE("줄눈 종류 비교"),
    keywords: ["줄눈 종류", "케라폭시", "폴리우레아", "줄눈 자재 비교"],
    analysisAxis: ["케라폭시 특성", "폴리우레아 특성", "선택 기준", "관리 차이"],
    useApt: false, compareWith: "욕실 줄눈 시공", rank: 1, recommendedWeight: 12,
  },

  // ── 입주 전 줄눈 체크리스트 (지역형) ──────────
  {
    id: "gr_check", industry: "grout", name: "입주 전 줄눈 체크리스트", cat: "체크리스트", emoji: "✅",
    titlePatterns: TP_CHECK("입주 전 줄눈 준비 체크리스트"),
    keywords: ["입주 전 줄눈", "줄눈 체크리스트", "입주 청소 줄눈", "신축 줄눈"],
    analysisAxis: ["입주 전 준비", "시공 일정", "확인사항", "관리 방법"],
    useApt: false, compareWith: "직접 점검", rank: 1, recommendedWeight: 11,
  },
];

// 정보블럭 데이터 — generateGrout.js pickInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const GROUT_INFO_BLOCKS = {
  bath: {
    title: "욕실 줄눈 확인 포인트",
    items: [
      "시공 범위(타일 줄눈 전체/부분)",
      "기존 줄눈 상태·곰팡이 정도",
      "물기·환기 등 곰팡이 예방 관리",
      "방수·코너부 마감 확인",
    ],
  },
  kitchen: {
    title: "주방 줄눈 확인 포인트",
    items: [
      "조리부·싱크대 주변 오염 관리",
      "물기 잔류·곰팡이 발생 구간",
      "시공 범위(벽·바닥 타일)",
      "사용 자재에 따른 오염 저항 차이",
    ],
  },
  entrance: {
    title: "현관 줄눈 확인 포인트",
    items: [
      "외부 유입 오염 방지",
      "타일 줄눈 변색·오염 상태",
      "청소·관리 주기",
      "시공 범위 확인",
    ],
  },
  veranda: {
    title: "베란다 줄눈 확인 포인트",
    items: [
      "결로·습기 발생 구간 확인",
      "곰팡이·변색 진행 정도",
      "환기·제습 등 관리 방법",
      "시공 범위 확인",
    ],
  },
  oldapt: {
    title: "구축아파트 줄눈 확인 포인트",
    items: [
      "줄눈 변색·오염 진행 정도",
      "균열·탈락 등 노후 상태",
      "부분 보수 vs 전체 재시공 판단",
      "※ 단지·세대별 상태 상이 — 현장 확인 후 판단",
    ],
  },
  redo: {
    title: "줄눈 재시공 확인 포인트",
    items: [
      "교체 시기(변색·균열·곰팡이 반복)",
      "기존 줄눈 제거 범위",
      "시공 전 건조·청소 등 준비 사항",
      "사용 자재(에폭시 계열 등) 선택 확인",
    ],
  },
  compare: {
    title: "줄눈 자재 비교 포인트",
    items: [
      "케라폭시(에폭시 계열) = 오염·곰팡이 저항 특성",
      "폴리우레아 = 탄성·내구 관련 특성",
      "공간·사용 환경에 따른 선택 기준",
      "※ 자재별 특성은 일반 정보 — 현장 상태에 따라 적합도 상이",
    ],
  },
  check: {
    title: "입주 전 줄눈 체크리스트",
    items: [
      "입주청소·도배 등 일정과 줄눈 시공 순서",
      "신축 타일 줄눈 상태 확인",
      "시공 일정·건조 시간 확인",
      "시공 후 관리(물기·환기) 확인",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3] lib/spine/scenes/grout.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("grout");
export const GROUT_SCENE_SPINE = SCENE_TABLE;

export const GROUT_PHOTO_POOL = [
  { slot: "scope",   alt: "{region} 줄눈 시공 범위 안내" },
  { slot: "info",    alt: "줄눈 관리 방법 안내 자료" },
  { slot: "consult", alt: "줄눈 시공 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const GROUT_COMPARE = {
  compareWith: "욕실 줄눈 시공",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 인테리어/청소/이사 등 인접업종과 교차 오염 차단.
//   grout는 '줄눈 시공·관리·재시공' 범위·관리·체크리스트 정보만.
export const GROUT_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "포장이사", "아파트 리모델링", "도배장판", "탄성코트", "에어컨청소",
];
