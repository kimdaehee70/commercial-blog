import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/interior.js";
// lib/interior-data.js
// 인테리어(interior) data — v1
// 방향: 정보형 + 단지명 적극 활용(realestate/cleaning 동형 APT_DATA) / 후기·시공자랑·Before·After 의존 금지
//   - 관측 단위 = 아파트(단지). 지역+단지명+인테리어 구조 SEO.
//   - useApt:true 기본(아파트 리모델링·구축·부분·욕실·주방·도배장판) / 상가·체크리스트=지역형.
//   - 제목패턴은 realestate 정보형 비중을 높여 "준비 전 확인사항/체크리스트/알아둘 내용" 축으로.
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 복제 베이스: moving-data.js (cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용)

export const INTERIOR_META = {
  industry: "interior",
  label: "인테리어",
  fullLabel: "인테리어 안내",
  greeting: "안녕하세요. {region} 인테리어 업체입니다.",
  voice: "{region} 인테리어 업체",
  badge: "신규",
  // 결정주기: 견적 비교·계획 기반(일정성, 긴급 아님)
  decisionCycle: "compare",
  // 비용 단정 금지 — 평형·범위·자재·상태 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·시공자랑·과장광고·결과보장·Before/After 강요 차단
export const INTERIOR_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박",
  // 보장·추천·순위 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위",
  // 후기·체험담·시공자랑
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도",
  "시공자랑", "비포애프터", "비포 애프터", "확 달라진", "환골탈태",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const INTERIOR_CATS = [
  "아파트리모델링",
  "구축아파트",
  "부분인테리어",
  "욕실리모델링",
  "주방리모델링",
  "도배장판",
  "상가인테리어",
  "체크리스트",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — realestate/cleaning/moving과 동형 구조 재사용 (지역+단지명+인테리어 SEO).
//   단지명 활용: "{aptName} 인테리어/리모델링" 구조. 인테리어는 단지명 의존도가 가장 높은 업종.
//   ★ 단지명·생활권만 보유. 인테리어 특화 시점 정보(시세·시공단가)는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["구축아파트", "욕실리모델링", "도배장판"],
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
    focus: ["아파트리모델링", "부분인테리어", "주방리모델링"],
    apts: [
      { name: "동탄역센트럴푸르지오", district: "오산동",   station: "동탄역(SRT)",   livingArea: "동탄역 생활권" },
      { name: "반도유보라아이비파크", district: "청계동",   station: "동탄역(SRT)",   livingArea: "동탄역 생활권" },
      { name: "호반써밋",             district: "영천동",   station: "동탄역(SRT)",   livingArea: "동탄2 생활권" },
      { name: "동탄린스트라우스",     district: "능동",     station: "동탄 호수공원",  livingArea: "동탄1 생활권" },
    ],
  },
  gangnam: {
    label: "강남",
    region: "강남구",
    focus: ["아파트리모델링", "욕실리모델링", "주방리모델링"],
    apts: [
      { name: "은마",             district: "대치동", station: "대치역(3호선)",       livingArea: "대치 생활권" },
      { name: "개포주공",         district: "개포동", station: "개포동역(분당선)",     livingArea: "개포 생활권" },
      { name: "래미안대치팰리스", district: "대치동", station: "대치역(3호선)",       livingArea: "대치 생활권" },
      { name: "도곡렉슬",         district: "도곡동", station: "도곡역(3호선/분당선)", livingArea: "도곡 생활권" },
    ],
  },
  songdo: {
    label: "송도",
    region: "연수구",
    focus: ["아파트리모델링", "부분인테리어", "도배장판"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)",   livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)",   livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
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
// 제목패턴 — {region} {aptName} 치환. 후기형·시공자랑·결과보장·추천·순위 배제.
//   realestate 정보형 비중↑: "준비 전 확인사항/체크리스트/계획 시 알아둘 내용".
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 아파트 리모델링 (단지 단위 정보형 — 단지명 적극)
const TP_APT = (kase) => [
  `{region} {aptName} ${kase} 준비 전 확인사항`,
  `{aptName} ${kase} 체크리스트`,
  `{aptName} ${kase} 계획 시 알아둘 내용`,
  `{region} {aptName} ${kase} 진행 순서 안내`,
  `{livingArea} ${kase} 준비 안내`,
  `{region} ${kase} 견적 전 확인할 점`,
];

// 구축아파트 (준공연차·노후화·배관·전기·단열 축)
const TP_OLD = (kase) => [
  `{region} {aptName} ${kase} 준비 전 확인사항`,
  `{aptName} ${kase} 시 확인할 부분`,
  `{region} ${kase} 체크리스트`,
  `{aptName} ${kase} 계획 시 알아둘 내용`,
  `{region} ${kase} 진행 순서 안내`,
];

// 부분 인테리어 (부분공사 단위)
const TP_PART = (kase) => [
  `{region} {aptName} ${kase} 준비 전 확인사항`,
  `{region} ${kase} 범위와 순서 안내`,
  `{aptName} ${kase} 계획 시 알아둘 내용`,
  `{region} ${kase} 견적 영향 요소`,
];

// 공간형 (욕실·주방 리모델링)
const TP_SPACE = (kase) => [
  `{region} {aptName} ${kase} 시 확인할 부분`,
  `{region} ${kase} 전 알아둘 내용`,
  `{aptName} ${kase} 준비 체크리스트`,
  `{region} ${kase} 진행 순서 안내`,
];

// 도배장판 (마감재 단위)
const TP_FINISH = (kase) => [
  `{region} {aptName} ${kase} 준비 전 확인사항`,
  `{region} ${kase} 시 알아둘 내용`,
  `{aptName} ${kase} 체크리스트`,
  `{region} ${kase} 범위와 순서 안내`,
];

// 상가 인테리어 (지역형 — APT 미사용)
const TP_SHOP = (kase) => [
  `{region} ${kase} 준비 전 확인사항`,
  `{region} ${kase} 진행 순서 안내`,
  `{region} ${kase} 견적 영향 요소`,
  `{region} ${kase} 계획 시 알아둘 내용`,
];

// 체크리스트 (확인 항목형 — 지역형)
const TP_CHECK = (kase) => [
  `${kase} 정리`,
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
  `{region} 인테리어 견적 전 확인사항`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 공사범위·견적요소·진행순서·예약확인.
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const INTERIOR_TREATMENTS = [
  // ── 아파트 리모델링 ───────────────────────────
  {
    id: "it_apt_remodel", industry: "interior", name: "아파트 리모델링", cat: "아파트리모델링", emoji: "🏢",
    titlePatterns: TP_APT("리모델링"),
    keywords: ["아파트 리모델링", "전체 리모델링", "턴키 인테리어", "리모델링 견적"],
    analysisAxis: ["공사 범위", "견적 영향 요소", "진행 순서", "준비 전 확인"],
    useApt: true, compareWith: "부분 인테리어", rank: 1, recommendedWeight: 18,
  },

  // ── 구축아파트 인테리어 (준공연차·노후화·배관·전기·단열) ──
  {
    id: "it_old_apt", industry: "interior", name: "구축아파트 인테리어", cat: "구축아파트", emoji: "🧱",
    titlePatterns: TP_OLD("구축아파트 인테리어"),
    keywords: ["구축아파트 인테리어", "구축 리모델링", "노후 배관 교체", "전체수리"],
    analysisAxis: ["준공연차·노후 상태", "배관·전기·단열 확인", "공사 범위", "진행 순서"],
    useApt: true, compareWith: "준신축 인테리어", rank: 1, recommendedWeight: 15,
  },

  // ── 부분 인테리어 ─────────────────────────────
  {
    id: "it_part", industry: "interior", name: "부분 인테리어", cat: "부분인테리어", emoji: "🔧",
    titlePatterns: TP_PART("부분 인테리어"),
    keywords: ["부분 인테리어", "부분 공사", "부분 시공 범위", "공간별 공사"],
    analysisAxis: ["공사 범위", "견적 영향 요소", "진행 순서", "예약 전 확인"],
    useApt: true, compareWith: "아파트 리모델링", rank: 2, recommendedWeight: 12,
  },

  // ── 욕실 리모델링 ─────────────────────────────
  {
    id: "it_bath", industry: "interior", name: "욕실 리모델링", cat: "욕실리모델링", emoji: "🚿",
    titlePatterns: TP_SPACE("욕실 리모델링"),
    keywords: ["욕실 리모델링", "욕실 공사 범위", "타일·방수", "욕실 견적"],
    analysisAxis: ["공사 범위", "방수·타일·설비", "진행 순서", "견적 영향 요소"],
    useApt: true, compareWith: "주방 리모델링", rank: 1, recommendedWeight: 13,
  },

  // ── 주방 리모델링 ─────────────────────────────
  {
    id: "it_kitchen", industry: "interior", name: "주방 리모델링", cat: "주방리모델링", emoji: "🍳",
    titlePatterns: TP_SPACE("주방 리모델링"),
    keywords: ["주방 리모델링", "주방 공사 범위", "싱크대·상부장", "주방 견적"],
    analysisAxis: ["공사 범위", "수납·동선·설비", "진행 순서", "견적 영향 요소"],
    useApt: true, compareWith: "욕실 리모델링", rank: 1, recommendedWeight: 12,
  },

  // ── 도배장판 ──────────────────────────────────
  {
    id: "it_paper", industry: "interior", name: "도배장판", cat: "도배장판", emoji: "🧻",
    titlePatterns: TP_FINISH("도배장판"),
    // [세션70 2026-07-29 · A안] 「장판·마루」 삭제 — flooring(바닥시공) 신설에 따른 LEX 중복 제거.
    //   경계: interior 도배장판 = 리모델링 마감재 축(도배 중심) / 장판·마루·강마루·데코타일 검색축 = flooring 전담.
    //   ★ 스코프 = keywords 1줄. CAT명·titlePatterns·useApt·트리·카탈로그 무변경(B/C안 반려).
    keywords: ["도배 장판", "도배 범위", "도배 견적"],
    analysisAxis: ["시공 범위", "자재 선택", "진행 순서", "견적 영향 요소"],
    useApt: true, compareWith: "부분 인테리어", rank: 2, recommendedWeight: 8,
  },

  // ── 상가 인테리어 (지역형) ────────────────────
  {
    id: "it_shop", industry: "interior", name: "상가 인테리어", cat: "상가인테리어", emoji: "🏪",
    titlePatterns: TP_SHOP("상가 인테리어"),
    keywords: ["상가 인테리어", "매장 인테리어", "상가 공사 범위", "상가 견적"],
    analysisAxis: ["공사 범위", "업종별 고려", "진행 순서", "견적 영향 요소"],
    useApt: false, compareWith: "아파트 리모델링", rank: 1, recommendedWeight: 10,
  },

  // ── 인테리어 견적 체크리스트 (지역형) ─────────
  {
    id: "it_check", industry: "interior", name: "인테리어 견적 체크리스트", cat: "체크리스트", emoji: "✅",
    titlePatterns: TP_CHECK("인테리어 견적 체크리스트"),
    keywords: ["인테리어 견적", "견적 비교", "공사 전 확인", "인테리어 체크리스트"],
    analysisAxis: ["견적 비교 요소", "공사 전 확인", "계약 전 확인", "공사 후 점검"],
    useApt: false, compareWith: "직접 견적", rank: 1, recommendedWeight: 12,
  },
];

// 정보블럭 데이터 — generateInterior.js insertInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만.
export const INTERIOR_INFO_BLOCKS = {
  remodel: {
    title: "리모델링 범위 확정 전 확인 포인트",
    items: [
      "전체 시공/부분 시공 중 어느 범위인지",
      "유지할 기존 마감·설비(주방·욕실·창호 등) 구분",
      "철거가 필요한 구간과 남길 구간의 경계",
      "한 업체 일괄 진행/공정별 분리 진행 여부",
      "※ 범위 경계는 현장 실측 후 확정",
    ],
  },
  oldapt: {
    title: "구축아파트 확인 포인트",
    items: [
      "준공연차·노후화 정도(전체수리 필요 여부)",
      "노후 배관(급수·배수) 교체 필요 여부",
      "전기 용량·배선 노후 상태",
      "단열·결로·창호 상태 확인",
      "※ 단지·세대별 상태 상이 — 현장 실측 후 확정",
    ],
  },
  space: {
    title: "공간별 공사 확인 포인트",
    items: [
      "욕실=방수·타일·설비 교체 범위",
      "주방=싱크대·상부장·동선·설비",
      "철거 후 추가 발견 항목 가능성",
      "사용 자재 등급에 따른 범위 차이",
    ],
  },
  cost: {
    title: "견적에 영향을 주는 요소",
    items: [
      "평형·공사 범위(전체/부분)",
      "자재 등급·마감 수준",
      "철거 범위·설비(배관·전기) 교체 여부",
      "공정 수·작업 인원·공사 기간",
      "※ 정확한 금액은 현장 실측 후 산정",
    ],
  },
  check: {
    title: "견적·계약 전 확인 체크리스트",
    items: [
      "공사 범위·자재 내역서 확인",
      "추가비용 발생 조건 사전 확인",
      "공사 기간·일정·A/S 기준 확인",
      "계약서·하자보수 조건 확인",
    ],
  },
  finish: {
    title: "도배·장판 시공 확인 포인트",
    items: [
      "기존 벽지·바닥 철거 범위",
      "자재(실크/합지·장판/마루) 선택",
      "곰팡이·결로 등 바탕면 상태",
      "가구 이동·정리 범위 사전 협의",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·시공자랑·Before/After 금지)
// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60 STEP3] lib/spine/scenes/interior.js 소유.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회는 lib/spine/sceneSpine.js 단일 엔진. 아래는 prompts.js 배선용 export.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("interior");
export const INTERIOR_SCENE_SPINE = SCENE_TABLE;

export const INTERIOR_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 인테리어 공사 범위 안내" },
  { slot: "info", alt: "인테리어 진행 순서 안내 자료" },
  { slot: "consult", alt: "인테리어 견적 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const INTERIOR_COMPARE = {
  compareWith: "부분 인테리어",
  compareWithText2: "직접 견적",
};

// BLOCK_MAP 격리용 — 청소/이사/줄눈 등 파생업종과 교차 오염 차단.
//   interior는 '인테리어/리모델링' 공사 범위·견적·체크리스트 정보만.
export const INTERIOR_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "포장이사", "줄눈시공", "탄성코트", "방충망설치", "에어컨청소",
];
