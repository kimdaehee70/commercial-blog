// lib/flooring-data.js
// 장판(flooring) 업종 데이터셋 — v1 / 정보형 + 시공 안내형
// 화자 = {region} 장판 시공 업체. 정보형(범위·자재·공간별 조건·공정·문제해결). 후기·체험·과장광고 금지.
//
// 복제 베이스: dobae-data.js 구조. 엔진(FLOW/Runtime/Handler) 무변경 — data만 추가한다.
//
// ★ 도배와의 분리:
//   도배 = 벽면 축(제거·퍼티·초배·정배) / 장판 = 바닥 축(철거·면갈이·본드·재단·압착·이음매·걸레받이)
//   두 업종은 '도배장판' 묶음 메뉴에서만 만난다. Scene 토큰·정보블록을 공유하지 않는다.
//
// ★ 현장정보(단지명·평형)는 lib/siteBlock.js 가 소유한다. 여기서 만들지 않는다.
//   자재(브랜드·두께)는 업종 소유 — 장판은 '두께(T)'가 검색·판단의 핵심 축이라 별도 보유.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
//   제목 우선순위: siteBlock(단지명 보유) → titleEngine(Intent) → 아래 titlePatterns
//   ※ titleEngine 금지토큰(안내/범위 안내/준비사항/체크포인트/체크리스트/확인사항/
//     알아보기/소개)을 titlePatterns에 쓰지 않는다. 폴백 제목 오염 방지.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고·비용 유도.
//   허용 = 시공 범위 / 자재·두께 차이 / 공간별 조건 / 공정 순서 / 문제 원인과 처리 / 관리.

export const FLOORING_META = {
  industry: "flooring",
  label: "바닥시공",                                    // [세션71] 「장판」 → 「바닥시공」 개명(마루축 편입)
  fullLabel: "바닥 시공 정보",
  greeting: "안녕하세요. {region} 장판 시공 업체입니다.",
  voice: "{region} 장판 시공 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
  useSite: true,          // ★ siteBlock(단지명·평형) 사용 업종 — 공사군 공통 플래그
};

// ─────────────────────────────────────────────────────────────
// 메뉴 그룹 — standard(1차 릴리스) / experimental(2차 확장 대기)
//   experimental 은 CATS·TREATMENTS 에 포함하지 않는다.
// ─────────────────────────────────────────────────────────────
export const FLOORING_GROUP = {
  standard: [
    "전체장판",
    "거실장판",
    "방장판",
    "주방장판",
    "베란다장판",
    "현관장판",
    "상가장판",
    "사무실장판",
    "학원장판",
    "병원장판",
    "마루시공",       // [세션71] 자재축 1 CAT. 강마루/강화마루/원목마루 = keywords 흡수(CAT 미분리)
  ],
  experimental: [
    "전세임대장판",   // LH·GH — 검색 본질이 시공보다 제도(지원금·서류·정산)
    "노인시설장판",   // 미끄럼·완충 기준이 별도 규격 축 — 데이터셋 확보 후 승격
  ],
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const FLOORING_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "소문이 자자",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  "잘하는곳", "잘하는 곳", "장판잘하는곳", "믿고 맡기",
  // 후기·체험담·고객사례
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 — 메뉴 1개 = cat 1개 평면 구조 (11메뉴 = 11cat)
//   ★ [세션71] 공간축 10 + 자재축 1(마루시공). 강마루시공은 CAT 신설 안 함 —
//     work 첫 3토큰이 마루시공과 동일해 Scene 분리 기준 미충족(세션70 검증 조건).
export const FLOORING_CATS = [
  "전체장판",
  "거실장판",
  "방장판",
  "주방장판",
  "베란다장판",
  "현관장판",
  "상가장판",
  "사무실장판",
  "학원장판",
  "병원장판",
  "마루시공",
];

// ─────────────────────────────────────────────────────────────
// 자재 — ★ 업종 소유.
//   장판은 브랜드보다 '두께(T)'가 판단 축이다. 두 값을 분리 보유한다.
//   사용자 입력값을 그대로 활용한다(제품군은 계속 바뀜). 아래는 선택 후보 목록.
// ─────────────────────────────────────────────────────────────
export const FLOORING_BRANDS = [
  { id: "lx",      brand: "LX하우시스" },
  { id: "kcc",     brand: "KCC글라스" },
  { id: "hyundai", brand: "현대L&C" },
  { id: "donghwa", brand: "동화자연마루" },
  { id: "etc",     brand: "" },          // 직접입력
];

// 두께 — 숫자 뒤 T 표기. use = 두께가 갈리는 지점(문장으로 쓰지 않고 판단 재료로만 소비)
export const FLOORING_THICKNESS = [
  { t: "1.8T", use: "임대·창고 등 사용 빈도가 낮은 공간" },
  { t: "2.0T", use: "일반 주거 표준 구간" },
  { t: "2.2T", use: "주거 중 보행이 잦은 거실·복도" },
  { t: "3.2T", use: "완충이 필요한 방·아이 있는 집" },
  { t: "4.5T", use: "층간소음·완충 비중이 큰 구간" },
  { t: "5.0T", use: "상업·다중이용 공간의 보행량 구간" },
];

// [세션71] 마루 두께 — 장판 T축과 판단 기준이 다르다(접착식/조립식 구분이 함께 붙는다).
//   formatMaterial/getThicknessNote 는 장판 T축 소유 → 마루는 아래 목록을 문맥 재료로만 소비.
export const FLOORING_WOOD_THICKNESS = [
  { t: "7.5T", use: "접착식 강마루 표준 구간" },
  { t: "8T",   use: "조립식 강화마루·보행 잦은 구간" },
  { t: "15T",  use: "원목·합판마루 계열 구간" },
];

// 시공 위치 — 공간별 확인 대상이 갈리는 축(프롬프트 문맥 재료)
export const FLOORING_AREAS = [
  "거실", "방", "복도", "주방", "베란다", "현관", "상가", "사무실",
];

// 입력값 → 본문 표기 문자열. 미입력이면 빈 문자열(부작용 0).
//   "LX 2.2T" / "2.2T" / "현대L&C" 어떤 형태로 들어와도 원형을 크게 훼손하지 않는다.
export function formatMaterial(input) {
  const v = String(input == null ? "" : input).replace(/\s+/g, " ").trim();
  if (!v) return "";
  const b = FLOORING_BRANDS.find((x) => x.brand && v.includes(x.brand));
  const th = FLOORING_THICKNESS.find((x) => v.toUpperCase().includes(x.t));
  if (b && th) return `${b.brand} ${th.t}`;
  if (b) return b.brand;
  if (th) return th.t;
  return v;   // 직접입력값 원형 보존
}

// 두께 입력 → 판단 재료 반환. 미입력·미매칭이면 null(프롬프트에 아무것도 붙지 않음).
export function getThicknessNote(input) {
  const v = String(input == null ? "" : input).toUpperCase();
  const hit = FLOORING_THICKNESS.find((x) => v.includes(x.t));
  return hit || null;
}

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·추천·보장 배제. (폴백 전용)
// ─────────────────────────────────────────────────────────────

// 범위형 (전체)
const TP_SCOPE = (kase) => [
  `{region} ${kase} 시공 범위를 정하는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 비용이 달라지는 이유`,
  `{region} ${kase} 전 살펴볼 부분`,
];

// 공간형 (거실·방·현관)
const TP_AREA = (kase) => [
  `{region} ${kase} 두께를 정하는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 이음매가 생기는 자리`,
  `{region} ${kase} 시공 후 관리 방법`,
];

// 물·습기형 (주방·베란다)
const TP_WET = (kase) => [
  `{region} ${kase} 들뜨는 이유`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 전 점검할 곳`,
  `{region} ${kase} 마감이 갈리는 지점`,
];

// [세션71] 자재축 (마루) — 데코타일은 여기 쓰지 않는다(공간 CAT keywords 소유).
const TP_WOOD = (kase) => [
  `{region} ${kase} 전 바닥 상태를 보는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 강마루와 강화마루가 갈리는 지점`,
  `{region} ${kase} 두께를 정하는 기준`,
];

// 상업형 (상가·사무실·학원·병원)
const TP_BIZ = (kase) => [
  `{region} ${kase} 작업 시간대를 잡는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 두께를 정하는 기준`,
  `{region} ${kase} 비용이 달라지는 이유`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 10개. cat / infoKey / titlePatterns / keywords / analysisAxis
//   infoKey = 세션60 pickInfoBlock 데이터 조회 표준.
//     BLOCKS[t.infoKey] || BLOCKS[t.cat] || BLOCKS.prebook
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const FLOORING_TREATMENTS = [
  // ── 범위 축 ───────────────────────────────────
  {
    id: "fl_full", industry: "flooring", name: "전체장판", cat: "전체장판", emoji: "🏠",
    infoKey: "scope",
    titlePatterns: TP_SCOPE("전체장판"),
    keywords: ["전체장판", "집 전체 장판", "아파트 장판 교체", "바닥재 전체 교체"],
    analysisAxis: ["시공 범위", "철거·덧방 판단", "바닥 밑작업", "두께 선택", "마감 확인"],
    useApt: false, useSite: true, compareWith: "방장판", rank: 1, recommendedWeight: 10,
  },

  // ── 주거 공간 축 ──────────────────────────────
  {
    id: "fl_living", industry: "flooring", name: "거실장판", cat: "거실장판", emoji: "🛋️",
    infoKey: "area",
    titlePatterns: TP_AREA("거실장판"),
    keywords: ["거실장판", "거실 바닥재", "거실 장판 교체", "넓은 폭 장판", "거실 데코타일"],
    analysisAxis: ["폭·이음매", "가구 이동", "두께 선택", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "방장판", rank: 1, recommendedWeight: 10,
  },
  {
    id: "fl_room", industry: "flooring", name: "방장판", cat: "방장판", emoji: "🛏️",
    infoKey: "area",
    titlePatterns: TP_AREA("방장판"),
    keywords: ["방장판", "안방 장판", "작은방 장판", "방 바닥재 교체"],
    analysisAxis: ["방별 범위", "붙박이장 하부", "눌림·찍힘 보수", "두께 선택", "문턱 마감"],
    useApt: false, useSite: true, compareWith: "거실장판", rank: 1, recommendedWeight: 10,
  },
  {
    id: "fl_kitchen", industry: "flooring", name: "주방장판", cat: "주방장판", emoji: "🍳",
    infoKey: "wet",
    titlePatterns: TP_WET("주방장판"),
    keywords: ["주방장판", "싱크대 앞 장판", "주방 바닥재", "물 새는 장판"],
    analysisAxis: ["물기 확인", "이음매 위치", "방수 처리", "공정 순서", "재발 관리"],
    useApt: false, useSite: true, compareWith: "베란다장판", rank: 2, recommendedWeight: 10,
  },
  {
    id: "fl_veranda", industry: "flooring", name: "베란다장판", cat: "베란다장판", emoji: "🌤️",
    infoKey: "wet",
    titlePatterns: TP_WET("베란다장판"),
    keywords: ["베란다장판", "발코니 바닥재", "베란다 결로 바닥", "확장 베란다 장판"],
    analysisAxis: ["결로·배수 확인", "시공 가능 조건", "접합부 처리", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "주방장판", rank: 2, recommendedWeight: 8,
  },
  {
    id: "fl_entrance", industry: "flooring", name: "현관장판", cat: "현관장판", emoji: "🚪",
    infoKey: "area",
    titlePatterns: TP_AREA("현관장판"),
    keywords: ["현관장판", "중문 앞 바닥재", "현관 단차 마감", "신발장 하부 마감"],
    analysisAxis: ["단차 확인", "경계 마감", "곡선 재단", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "거실장판", rank: 3, recommendedWeight: 6,
  },

  // ── 상업 축 ───────────────────────────────────
  {
    id: "fl_store", industry: "flooring", name: "상가장판", cat: "상가장판", emoji: "🏪",
    infoKey: "biz",
    titlePatterns: TP_BIZ("상가장판"),
    keywords: ["상가장판", "매장 바닥재", "영업 중 장판 교체", "상가 바닥 시공", "상가 데코타일"],
    analysisAxis: ["영업 시간 조건", "구역 분할", "보행량과 두께", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "사무실장판", rank: 1, recommendedWeight: 10,
  },
  {
    id: "fl_office", industry: "flooring", name: "사무실장판", cat: "사무실장판", emoji: "🏢",
    infoKey: "biz",
    titlePatterns: TP_BIZ("사무실장판"),
    keywords: ["사무실장판", "오피스 바닥재", "사무실 바닥 교체", "파티션 하부 마감", "사무실 데코타일"],
    analysisAxis: ["집기 이동", "배선 정리", "휴무일 일정", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "상가장판", rank: 2, recommendedWeight: 10,
  },
  {
    id: "fl_academy", industry: "flooring", name: "학원장판", cat: "학원장판", emoji: "📚",
    infoKey: "biz",
    titlePatterns: TP_BIZ("학원장판"),
    keywords: ["학원장판", "강의실 바닥재", "학원 바닥 교체", "완충 장판"],
    analysisAxis: ["수업 시간 조건", "완충 두께", "미끄럼 상태", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "사무실장판", rank: 2, recommendedWeight: 8,
  },
  {
    id: "fl_clinic", industry: "flooring", name: "병원장판", cat: "병원장판", emoji: "🏥",
    infoKey: "biz",
    titlePatterns: TP_BIZ("병원장판"),
    keywords: ["병원장판", "의원 바닥재", "진료실 바닥 교체", "이음매 열용접", "병원 데코타일"],
    analysisAxis: ["진료 일정 조건", "구획 분할", "이음매 처리", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "상가장판", rank: 2, recommendedWeight: 8,
  },

  // ── 자재 축 [세션71] ──────────────────────────
  //   ★ 강마루시공 CAT 미생성 — work 첫 3토큰 동일(세션70 Scene 검증 FAIL).
  //     강마루·강화마루·원목마루는 keywords 로 흡수한다.
  {
    id: "fl_wood", industry: "flooring", name: "마루시공", cat: "마루시공", emoji: "🟫",   // [세션71] 🪵(U+1FAB5, Unicode 13.0)는 Windows Chrome 기본 폰트 미지원 → □ 렌더. 🟫(12.0)로 교체
    infoKey: "wood",
    titlePatterns: TP_WOOD("마루시공"),
    keywords: ["마루시공", "강마루", "강화마루", "원목마루", "마루 교체", "아파트 마루"],
    analysisAxis: ["바닥 수평·습기", "철거·덧방 판단", "접착식·조립식 구분", "유격·몰딩 마감", "시공 후 확인"],
    useApt: false, useSite: true, compareWith: "전체장판", rank: 1, recommendedWeight: 10,
  },
];

// ─────────────────────────────────────────────────────────────
// 정보블럭 — pickInfoBlock 에서 소비 (infoKey → cat → prebook)
//   ★ 절차·조건 등 시점 무관 구조 정보만. 비용 수치·보장 표현 금지.
// ─────────────────────────────────────────────────────────────
export const FLOORING_INFO_BLOCKS = {
  scope: {
    title: "시공 범위 구분",
    items: [
      "집 전체 / 공간 단위 / 손상 구간만",
      "붙박이장 하부·베란다는 별도 확인",
      "문턱·현관 경계부 마감 범위 확인",
      "※ 기존 바닥 상태에 따라 범위는 달라질 수 있음",
    ],
  },
  area: {
    title: "공간별 확인 사항",
    items: [
      "거실은 폭이 넓어 이음매 위치가 먼저 정해짐",
      "방은 붙박이장 하부와 문턱 단차를 함께 확인",
      "현관은 곡선 구간과 경계 마감 방식이 갈림",
      "가구가 놓였던 자리는 눌림 자국이 남아 있을 수 있음",
    ],
  },
  wet: {
    title: "물기 있는 공간 확인",
    items: [
      "싱크대 앞·배수구 주변은 이음매 위치를 비켜 잡음",
      "밑면이 눅눅하면 건조 확인 후 시공",
      "벽면 접합부는 실리콘으로 막아 유입 차단",
      "원인 처리 없이 덮으면 같은 자리에서 다시 들뜸",
    ],
  },
  biz: {
    title: "영업 공간 시공 조건",
    items: [
      "영업 종료 후·휴무일 등 작업 가능 시간대 확인",
      "구역을 나눠 진행하면 부분 개방이 가능",
      "보행량이 많은 구간은 두께를 달리 잡음",
      "이음매는 보행 동선을 피해 위치를 정함",
    ],
  },
  material: {
    title: "두께별 구분",
    items: [
      "1.8~2.0T: 사용 빈도가 낮거나 임대 목적 구간",
      "2.2~3.2T: 일반 주거에서 많이 쓰이는 구간",
      "4.5~5.0T: 완충·보행량 비중이 큰 구간",
      "※ 같은 두께라도 바닥 밑작업 상태에 따라 결과가 달라짐",
    ],
  },
  demolish: {
    title: "철거·덧방 구분",
    items: [
      "기존 바닥이 평탄하면 덧방으로 진행하기도 함",
      "들뜸·습기·단차가 있으면 철거 후 시공",
      "덧방은 문턱·문 하부 높이가 달라질 수 있음",
      "밑면 잔여물은 면갈이로 걷어낸 뒤 진행",
    ],
  },
  order: {
    title: "시공 진행 순서",
    items: [
      "현장 확인 → 가구 이동 → 기존 바닥재 철거",
      "바닥 청소 → 면갈이 → 퍼티 보수",
      "본드 도포 → 재단 → 압착 → 이음매 처리",
      "걸레받이·실리콘 마감 → 마감 청소",
    ],
  },
  aftercare: {
    title: "시공 후 관리",
    items: [
      "접착이 자리를 잡는 동안 무거운 가구 이동은 피함",
      "이음매 부근에 물이 고이지 않게 관리",
      "가구 다리에는 받침을 두어 눌림 자국을 줄임",
      "들뜸이 한 자리에서 반복되면 원인부터 확인",
    ],
  },
  wood: {
    title: "마루 시공 전 확인",
    items: [
      "바닥 수평 오차와 습기 상태를 먼저 확인",
      "기존 바닥재를 걷어낼지 그 위에 시공할지 구분",
      "접착식은 면 상태, 조립식은 방습·유격이 갈리는 지점",
      "문 하부·문턱 높이 여유 확인",
    ],
  },
  prebook: {
    title: "시공 전 확인",
    items: [
      "시공 범위와 두께 사전 확인",
      "기존 바닥 상태(들뜸·단차·습기) 확인",
      "가구·집기 이동 범위 협의",
      "작업 가능 시간대와 일정 협의",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// cat 전용 INFO_BLOCKS — 공통 블록이 문맥과 어긋나는 cat만 override.
//   ★ 여기 없는 cat은 공통 블록 그대로(무영향).
// ─────────────────────────────────────────────────────────────
export const FLOORING_CAT_INFO_BLOCKS = {
  주방장판: {
    order: {
      title: "시공 진행 순서",
      items: [
        "물기·곰팡이 확인 → 가전 이동",
        "기존 바닥재 철거 → 건조 확인",
        "바닥면 정리 → 방수 본드 도포 → 재단·압착",
        "싱크대 하부 마감 → 실리콘 코킹",
      ],
    },
  },
  베란다장판: {
    order: {
      title: "시공 진행 순서",
      items: [
        "배수구 위치·결로 흔적 확인",
        "기존 마감재 제거 → 바닥 건조 확인",
        "배수구 주변 재단 → 본드 도포 → 압착",
        "벽면 접합부 실리콘 → 문턱 경계 마감",
      ],
    },
  },
  마루시공: {
    order: {
      title: "시공 진행 순서",
      items: [
        "바닥 수평·습기 확인 → 가구 반출",
        "기존 바닥재 철거 → 바닥면 평탄 작업",
        "판재 방향 결정 → 시공 방식에 맞춘 부착·조립",
        "벽면 유격 확보 → 걸레받이·몰딩 마감",
      ],
    },
    material: {
      title: "마루 구분",
      items: [
        "강마루: 접착식. 바닥면 평탄 상태가 결과를 좌우",
        "강화마루: 조립식. 방습층과 벽면 유격이 판단 축",
        "원목·합판마루: 두께가 커져 문 하부 여유를 함께 확인",
        "※ 같은 제품도 바닥 밑작업 상태에 따라 결과가 달라짐",
      ],
    },
  },
  병원장판: {
    biz: {
      title: "영업 공간 시공 조건",
      items: [
        "진료 일정에 맞춰 구획을 나눠 진행",
        "장비·침대 이동 가능 범위 사전 확인",
        "이음매는 열용접으로 틈을 남기지 않음",
        "걸레받이 일체 마감은 청소 동선과 함께 확인",
      ],
    },
  },
};

// cat 전용 블록이 있으면 공통 블록 위에 덮어씌운다. 미정의 cat은 공통 그대로.
export function getInfoBlocks(cat) {
  const over = FLOORING_CAT_INFO_BLOCKS[cat];
  return over ? { ...FLOORING_INFO_BLOCKS, ...over } : FLOORING_INFO_BLOCKS;
}

// 사진 슬롯 — 정보형, 캡션 선택 (연출·후기 금지)
export const FLOORING_PHOTO_POOL = [
  { slot: "before",   alt: "{region} 장판 시공 전 바닥 상태" },
  { slot: "base",     alt: "바닥 면갈이·퍼티 보수 확인" },
  { slot: "process",  alt: "장판 재단·압착 진행" },
  { slot: "material", alt: "장판 자재 두께 확인" },
  { slot: "after",    alt: "장판 시공 후 마감 상태" },
];

// [세션71] cat 전용 사진 캡션 — 자재축(마루)은 장판 공정어(면갈이·압착)와 어긋난다.
//   여기 없는 cat 은 FLOORING_PHOTO_POOL 그대로(무영향).
export const FLOORING_CAT_PHOTO_POOL = {
  마루시공: [
    { slot: "before",   alt: "{region} 마루 시공 전 바닥 상태" },
    { slot: "base",     alt: "바닥 수평·습기 확인" },
    { slot: "process",  alt: "마루 판재 시공 진행" },
    { slot: "material", alt: "마루 자재 두께 확인" },
    { slot: "after",    alt: "마루 시공 후 마감 상태" },
  ],
};

// cat 전용 캡션이 있으면 그것을, 없으면 공통 풀을 반환.
export function getPhotoPool(cat) {
  return FLOORING_CAT_PHOTO_POOL[cat] || FLOORING_PHOTO_POOL;
}

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const FLOORING_COMPARE = {
  compareWith: "방장판",
  compareWithText2: "기존 바닥 유지",
};

// BLOCK_MAP 격리용 — 도배·인테리어 등 인접 업종과 교차 오염 차단.
//   ★ [세션71] 마루는 flooring 소유(자재축 CAT)로 편입 → 차단 대상에서 제외.
//     업종 범위 = '바닥 마감재 시공'(장판 + 마루). 벽면(dobae)·전체 리모델링(interior)과 분리 운영.
export const FLOORING_BLOCK_KEYWORDS = [
  "실크벽지", "합지벽지", "초배", "정배", "벽지 제거",
  "입주청소", "줄눈시공", "탄성코트", "욕실리모델링", "주방리모델링",
];
