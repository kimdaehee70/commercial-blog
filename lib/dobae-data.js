// lib/dobae-data.js
// 도배(dobae) 업종 데이터셋 — v1 / 정보형 + 시공 안내형
// 화자 = {region} 도배 업체. 정보형(범위·자재·상황·공정·문제해결). 후기·체험·과장광고 금지.
//
// 복제 베이스: buildingclean-data.js 구조 70% + 실측 재설계 30%
//   실측(2026-07-28, 네이버 블로그 「용인도배」·「동백동도배」 약 60건):
//     ① 지역 3계층 반복 — 시(용인) / 구(기흥·수지·처인) / 동(동백동·죽전·풍덕천)
//     ② ★ 단지명 + 평형이 제1 롱테일 축 — 제목 다수가 단지명 보유,
//        동일 단지가 여러 업체 글에 반복(신동백롯데캐슬에코 7건)
//     ③ 벽지 제품명이 검색어화(디아망·로하스·프라임·스케치)
//     ④ 상황 축이 독립 검색 — 거주중(살림집·짐 있는 집) / 입주 전·직후
//     ⑤ 문제 축 — 곰팡이·결로가 항상 동반 등장, 누수는 얼룩·아랫집 복구로 분화
//
// ★ 현장정보(단지명·평형)는 lib/siteBlock.js 가 소유한다. 여기서 만들지 않는다.
//   자재(벽지 제품)는 업종마다 의미가 달라 공통 인프라가 아니므로 이 파일이 소유한다.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
//   제목 우선순위: siteBlock(단지명 보유) → titleEngine(Intent) → 아래 titlePatterns
//   ※ titlePatterns에는 titleEngine 금지토큰(안내/범위 안내/준비사항/체크포인트/
//     체크리스트/확인사항/알아보기/소개)을 쓰지 않는다. 폴백 제목 품질 하락 방지.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고·비용 유도.
//   허용 = 시공 범위 / 자재 차이 / 상황별 조건 / 공정 순서 / 문제 원인과 처리 / 관리.

export const DOBAE_META = {
  industry: "dobae",
  label: "도배",
  fullLabel: "도배 시공 정보",
  greeting: "안녕하세요. {region} 도배 업체입니다.",
  voice: "{region} 도배 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
  useSite: true,          // ★ siteBlock(단지명·평형) 사용 업종 — 공사군 공통 플래그
};

// ─────────────────────────────────────────────────────────────
// 메뉴 그룹 — standard(1차 릴리스) / experimental(2차 확장 대기)
//   experimental 은 CATS·TREATMENTS 에 포함하지 않는다.
//   승격 조건(전세임대도배): 지원금 · 신청조건 · 필요서류 · 진행절차 · 정산방식
//   5축 데이터셋 완비 후 standard 로 이동 + TREATMENTS 항목 추가.
// ─────────────────────────────────────────────────────────────
export const DOBAE_GROUP = {
  standard: [
    "전체도배",
    "부분도배",
    "실크도배",
    "합지도배",
    "거주중도배",
    "입주도배",
    "곰팡이·결로도배",
    "누수도배",
    "도배장판",
  ],
  experimental: [
    "전세임대도배",   // LH·GH — 검색 본질이 시공보다 제도(지원금·서류·정산)
  ],
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
//   실측상 경쟁 글에 광고어가 많다("잘하는곳"·"추천"·"소문이 자자"). 우리는 쓰지 않는다.
export const DOBAE_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "소문이 자자",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  "잘하는곳", "잘하는 곳", "도배잘하는곳", "믿고 맡기",
  // 후기·체험담·고객사례
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 — 메뉴 1개 = cat 1개 평면 구조 (9메뉴 = 9cat)
//   ※ buildingclean 세션55 평면 전환과 동형. 발행비율설정 화면 소분류 헤더 미노출.
export const DOBAE_CATS = [
  "전체도배",
  "부분도배",
  "실크도배",
  "합지도배",
  "거주중도배",
  "입주도배",
  "곰팡이·결로도배",
  "누수도배",
  "도배장판",
];

// ─────────────────────────────────────────────────────────────
// 자재(벽지) — ★ 업종 소유. siteBlock 이 아니다.
//   사용자 입력값을 그대로 활용한다(브랜드는 계속 바뀜). 아래는 선택 후보 목록.
//   실측 확인 제품: LX 디아망 / 개나리 로하스·프라임·아트북 / KCC신한 스케치 / LX 베스트
// ─────────────────────────────────────────────────────────────
export const DOBAE_MATERIALS = [
  { id: "diamant", brand: "LX하우시스", line: "디아망", type: "실크" },
  { id: "lohas",   brand: "개나리",     line: "로하스", type: "실크" },
  { id: "prime",   brand: "개나리",     line: "프라임", type: "실크" },
  { id: "sketch",  brand: "KCC신한",    line: "스케치", type: "실크" },
  { id: "best",    brand: "LX하우시스", line: "베스트", type: "실크" },
  { id: "etc",     brand: "",           line: "직접입력", type: "" },
];

// 입력값 → 본문 표기 문자열. 미입력이면 빈 문자열(부작용 0).
export function formatMaterial(input) {
  const v = String(input == null ? "" : input).replace(/\s+/g, " ").trim();
  if (!v) return "";
  const hit = DOBAE_MATERIALS.find((m) => m.line && v.includes(m.line));
  if (hit && hit.brand) return `${hit.brand} ${hit.line}`;
  return v;   // 직접입력값 원형 보존
}

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·추천·보장 배제.
//   ※ 이것은 폴백 전용이다. 단지명 보유 시 siteBlock 제목이 우선한다.
// ─────────────────────────────────────────────────────────────

// 범위형 (전체·부분)
const TP_SCOPE = (kase) => [
  `{region} ${kase} 시공 범위를 정하는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 비용이 달라지는 이유`,
  `{region} ${kase} 전 살펴볼 부분`,
];

// 자재형 (실크·합지)
const TP_MATERIAL = (kase) => [
  `{region} ${kase} 어떤 공간에 맞을까`,
  `{region} ${kase} 비용이 달라지는 이유`,
  `{region} ${kase} 시공 후 관리 방법`,
  `{region} ${kase} 진행 순서`,
];

// 상황형 (거주중·입주)
const TP_SITUATION = (kase) => [
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 전 정리해야 할 것`,
  `{region} ${kase} 하루에 가능한 범위`,
  `{region} ${kase} 일정을 잡는 기준`,
];

// 문제형 (곰팡이·결로 / 누수)
const TP_TROUBLE = (kase) => [
  `{region} ${kase} 원인과 처리 방법`,
  `{region} ${kase} 다시 생기는 이유`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 전 점검할 곳`,
];

// 묶음형 (도배장판)
const TP_BUNDLE = (kase) => [
  `{region} ${kase} 시공 순서`,
  `{region} ${kase} 함께 진행할 때 달라지는 점`,
  `{region} ${kase} 일정을 잡는 기준`,
  `{region} ${kase} 비용이 달라지는 이유`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 9개. cat / infoKey / titlePatterns / keywords / analysisAxis
//   infoKey = 세션60 pickInfoBlock 데이터 조회 표준.
//     BLOCKS[t.infoKey] || BLOCKS[t.cat] || BLOCKS.prebook
//     → 핸들러에 cat 하드코딩 if 체인을 두지 않는다. 메뉴 확장은 data.js 단독 작업.
//   useSite = 현장정보(단지명·평형) 노출 여부. 도배는 전메뉴 true.
//   useApt=false — APT_DATA(입주청소 계열) 미사용. 단지 정보는 siteBlock 이 담당.
//   weight 합계 100. 실측 빈도 반영(실크·거주중 우선).
// ─────────────────────────────────────────────────────────────
export const DOBAE_TREATMENTS = [
  // ── 범위 축 ───────────────────────────────────
  {
    id: "do_full", industry: "dobae", name: "전체도배", cat: "전체도배", emoji: "🏠",
    infoKey: "scope",
    titlePatterns: TP_SCOPE("전체도배"),
    keywords: ["전체도배", "집 전체 도배", "벽천장 전체도배", "아파트 전체도배"],
    analysisAxis: ["시공 범위", "밑작업", "공정 순서", "자재 선택", "마감 확인"],
    useApt: false, useSite: true, compareWith: "부분도배", rank: 1, recommendedWeight: 12,
  },
  {
    id: "do_partial", industry: "dobae", name: "부분도배", cat: "부분도배", emoji: "🧩",
    infoKey: "partial",
    titlePatterns: TP_SCOPE("부분도배"),
    keywords: ["부분도배", "방 한 칸 도배", "벽면만 도배", "천장만 도배"],
    analysisAxis: ["시공 범위", "기존 벽지와의 차이", "이음매 처리", "공정 순서", "마감 확인"],
    useApt: false, useSite: true, compareWith: "전체도배", rank: 1, recommendedWeight: 12,
  },

  // ── 자재 축 ───────────────────────────────────
  {
    id: "do_silk", industry: "dobae", name: "실크도배", cat: "실크도배", emoji: "✨",
    infoKey: "material",
    titlePatterns: TP_MATERIAL("실크도배"),
    keywords: ["실크도배", "실크벽지", "실크벽지 시공", "실크 도배 관리"],
    analysisAxis: ["자재 특성", "초배·밑작업", "공정 순서", "공간별 선택", "시공 후 관리"],
    useApt: false, useSite: true, compareWith: "합지도배", rank: 1, recommendedWeight: 16,
  },
  {
    id: "do_hapji", industry: "dobae", name: "합지도배", cat: "합지도배", emoji: "📄",
    infoKey: "material",
    titlePatterns: TP_MATERIAL("합지도배"),
    keywords: ["합지도배", "합지벽지", "전세집 도배", "임대 도배"],
    analysisAxis: ["자재 특성", "이음매 특성", "공정 순서", "공간별 선택", "시공 후 관리"],
    useApt: false, useSite: true, compareWith: "실크도배", rank: 2, recommendedWeight: 10,
  },

  // ── 상황 축 ───────────────────────────────────
  {
    id: "do_live", industry: "dobae", name: "거주중도배", cat: "거주중도배", emoji: "📦",
    infoKey: "live",
    titlePatterns: TP_SITUATION("거주중도배"),
    keywords: ["거주중도배", "살림집 도배", "짐 있는 집 도배", "사는집 도배"],
    analysisAxis: ["짐 정리 범위", "가구 이동 조건", "작업 시간", "시공 순서", "생활 동선"],
    useApt: false, useSite: true, compareWith: "입주도배", rank: 1, recommendedWeight: 14,
  },
  {
    id: "do_movein", industry: "dobae", name: "입주도배", cat: "입주도배", emoji: "🔑",
    infoKey: "movein",
    titlePatterns: TP_SITUATION("입주도배"),
    keywords: ["입주도배", "이사 전 도배", "입주 전 도배", "빈집 도배"],
    analysisAxis: ["일정 조율", "공실 조건", "공정 순서", "타 공정과의 선후", "마감 확인"],
    useApt: false, useSite: true, compareWith: "거주중도배", rank: 1, recommendedWeight: 12,
  },

  // ── 문제 축 ───────────────────────────────────
  {
    id: "do_mold", industry: "dobae", name: "곰팡이·결로도배", cat: "곰팡이·결로도배", emoji: "🌫️",
    infoKey: "mold",
    titlePatterns: TP_TROUBLE("곰팡이 도배"),
    keywords: ["곰팡이도배", "결로도배", "곰팡이 제거 후 도배", "단열 도배"],
    analysisAxis: ["발생 원인", "제거·차단 처리", "단열 병행 판단", "공정 순서", "재발 관리"],
    useApt: false, useSite: true, compareWith: "누수도배", rank: 1, recommendedWeight: 10,
  },
  {
    id: "do_leak", industry: "dobae", name: "누수도배", cat: "누수도배", emoji: "💧",
    infoKey: "leak",
    titlePatterns: TP_TROUBLE("누수 도배"),
    keywords: ["누수도배", "누수 얼룩 도배", "천장 누수 도배", "누수 보수 도배"],
    analysisAxis: ["원인 확인", "얼룩 처리", "건조 확인", "공정 순서", "재시공 판단"],
    useApt: false, useSite: true, compareWith: "곰팡이·결로도배", rank: 2, recommendedWeight: 8,
  },

  // ── 묶음 축 ───────────────────────────────────
  {
    id: "do_janpan", industry: "dobae", name: "도배장판", cat: "도배장판", emoji: "🧱",
    infoKey: "janpan",
    titlePatterns: TP_BUNDLE("도배장판"),
    keywords: ["도배장판", "도배 장판 동시", "도배 마루 순서", "바닥재 교체"],
    analysisAxis: ["공정 선후", "일정 조율", "시공 범위", "마감 처리", "생활 복귀 시점"],
    useApt: false, useSite: true, compareWith: "전체도배", rank: 2, recommendedWeight: 6,
  },
];

// ─────────────────────────────────────────────────────────────
// 정보블럭 — generateDobae.js pickInfoBlock 에서 소비 (infoKey → cat → prebook)
//   ★ 절차·조건 등 시점 무관 구조 정보만. 비용 수치·보장 표현 금지.
// ─────────────────────────────────────────────────────────────
export const DOBAE_INFO_BLOCKS = {
  scope: {
    title: "시공 범위 구분",
    items: [
      "벽면·천장 전체 / 벽면만 / 천장만",
      "붙박이장 내부·베란다는 별도 확인",
      "몰딩·문틀 주변 마감 범위 확인",
      "※ 구조와 상태에 따라 범위는 달라질 수 있음",
    ],
  },
  partial: {
    title: "부분 시공 시 확인",
    items: [
      "기존 벽지와 색·질감 차이가 남을 수 있음",
      "같은 면 단위로 끊어야 이음매가 덜 보임",
      "단종 제품은 동일 벽지 확보가 어려울 수 있음",
      "오염 범위보다 한 면 넓게 잡는 편이 자연스러움",
    ],
  },
  material: {
    title: "벽지 종류별 특성",
    items: [
      "실크: 표면 코팅으로 오염에 강하고 물걸레 관리 가능",
      "합지: 통기성이 있고 이음매(미미선)가 보이는 편",
      "실크는 초배·밑작업 비중이 커 공정 시간이 길어짐",
      "공간 용도에 따라 혼합 시공도 가능",
    ],
  },
  live: {
    title: "거주 중 시공 조건",
    items: [
      "서랍·책장 속 잔짐은 미리 정리 필요",
      "냉장고·침대 등은 작업자가 이동하며 진행",
      "붙박이장·돌침대 등 중량물은 이동 불가",
      "공동주택은 작업 가능 시간대가 정해져 있음",
    ],
  },
  movein: {
    title: "입주 일정 확인",
    items: [
      "공실 상태일수록 공정이 단순해짐",
      "전출 당일 시공 후 당일 입주는 시간 확보가 관건",
      "타 공정(마루·주방·필름)과의 선후 확인",
      "풀이 마르는 시간을 감안해 일정 조정",
    ],
  },
  mold: {
    title: "곰팡이·결로 처리 순서",
    items: [
      "발생 원인(결로·누수·환기) 먼저 구분",
      "기존 벽지 제거 → 표면 처리 → 차단제 도포",
      "외벽면 반복 발생 시 단열 보강 병행 검토",
      "원인 처리 없이 도배만 반복하면 재발할 수 있음",
    ],
  },
  leak: {
    title: "누수 자국 처리 순서",
    items: [
      "누수 지점 처리·건조 여부 먼저 확인",
      "젖은 상태에서 시공하면 자국이 다시 배어 나옴",
      "얼룩 부위 차단 처리 후 시공",
      "아래층 피해 동반 시 범위를 함께 확인",
    ],
  },
  janpan: {
    title: "도배·바닥 공정 순서",
    items: [
      "도배 후 장판 시공이 일반적인 순서",
      "마루는 절단 분진 때문에 도배보다 먼저 진행",
      "반나절에 도배와 바닥을 모두 끝내기는 어려움",
      "가구·주방 설치 시점과 함께 일정 조율",
    ],
  },
  order: {
    title: "시공 진행 순서",
    items: [
      "현장 확인 → 자재 선택 → 기존 벽지 제거",
      "면 정리(퍼티·평탄화) → 초배 → 정배",
      "마감 확인 → 잔여물 정리",
      "건조 기간 동안 급격한 환기·난방은 피함",
    ],
  },
  prebook: {
    title: "시공 전 확인",
    items: [
      "시공 범위와 자재 종류 사전 확인",
      "현장 상태(단차·손상·기존 마감) 확인",
      "작업 가능 시간대와 일정 협의",
      "가구 이동 여부와 정리 범위 협의",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// cat 전용 INFO_BLOCKS — 공통 블록이 문맥과 어긋나는 cat만 override.
//   ★ 여기 없는 cat은 공통 블록 그대로(무영향).
// ─────────────────────────────────────────────────────────────
export const DOBAE_CAT_INFO_BLOCKS = {
  "곰팡이·결로도배": {
    order: {
      title: "시공 진행 순서",
      items: [
        "발생 부위·원인 확인 → 기존 벽지 제거",
        "표면 곰팡이 제거 → 건조 → 차단제 도포",
        "필요 시 단열·방습 보강 → 초배 → 정배",
        "시공 후 환기·습도 관리 안내",
      ],
    },
  },
  누수도배: {
    order: {
      title: "시공 진행 순서",
      items: [
        "누수 지점 처리 완료 여부 확인",
        "건조 상태 확인 → 기존 벽지 제거",
        "얼룩 부위 차단 처리 → 초배 → 정배",
        "재발 여부를 두고 마감 상태 확인",
      ],
    },
  },
  도배장판: {
    scope: {
      title: "시공 범위 구분",
      items: [
        "벽·천장(도배) + 바닥(장판·마루) 구분",
        "걸레받이 마감은 도배 후 바닥 시공 시 처리",
        "문턱·현관 경계부 마감 범위 확인",
        "※ 바닥재 종류에 따라 공정 순서가 달라질 수 있음",
      ],
    },
  },
};

// cat 전용 블록이 있으면 공통 블록 위에 덮어씌운다. 미정의 cat은 공통 그대로.
export function getInfoBlocks(cat) {
  const over = DOBAE_CAT_INFO_BLOCKS[cat];
  return over ? { ...DOBAE_INFO_BLOCKS, ...over } : DOBAE_INFO_BLOCKS;
}

// 사진 슬롯 — 정보형, 캡션 선택 (연출·후기 금지)
//   공사군 기준 5~6슬롯. 시공 전/중/후 축.
export const DOBAE_PHOTO_POOL = [
  { slot: "before",   alt: "{region} 도배 시공 전 벽면 상태" },
  { slot: "base",     alt: "도배 밑작업 확인" },
  { slot: "process",  alt: "도배 시공 진행" },
  { slot: "material", alt: "벽지 자재 확인" },
  { slot: "after",    alt: "도배 시공 후 마감 상태" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const DOBAE_COMPARE = {
  compareWith: "부분도배",
  compareWithText2: "기존 벽지 유지",
};

// BLOCK_MAP 격리용 — 인테리어·청소·줄눈 등 인접 업종과 교차 오염 차단.
//   ★ 도배는 '벽지 시공' 범위만. 전체 리모델링(interior)과 분리 운영.
export const DOBAE_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "줄눈시공", "탄성코트", "욕실리모델링",
  "주방리모델링", "전체리모델링", "에어컨설치", "방충망", "새시교체",
];
