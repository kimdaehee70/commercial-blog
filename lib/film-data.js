// lib/film-data.js
// 인테리어필름(film) 업종 데이터셋 — v1 / 정보형 + 시공 안내형
// 화자 = {region} 인테리어필름 시공 업체. 정보형(범위·원단·부위별 조건·공정·문제해결). 후기·체험·과장광고 금지.
//
// 복제 베이스: flooring-data.js 구조. 엔진(FLOW/Runtime/Handler) 무변경 — data만 추가한다.
//
// ★ 공사군 분리:
//   도배 = 벽면 축 / 장판 = 바닥 축 / 줄눈·탄성코트 = 도포 축
//   필름 = 표면 축(탈거 → 하지 정리 → 프라이머 → 재단 → 부착 → 압착 → 열마감 → 재조립)
//   → 필름의 판단 축은 '두께'가 아니라 '하지(下地) 상태'다. 장판의 THICKNESS 자리에
//     FILM_SURFACES(원단 표면)와 FILM_BASE_GRADE(하지 등급)가 들어간다.
//
// ★ 현장정보(단지명·평형)는 lib/siteBlock.js 가 소유한다. 여기서 만들지 않는다.
//   자재(브랜드·표면)는 업종 소유.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
//   제목 우선순위: siteBlock(단지명 보유) → titleEngine(Intent) → 아래 titlePatterns
//   ※ titleEngine 금지토큰(안내/범위 안내/준비사항/체크포인트/체크리스트/확인사항/
//     알아보기/소개)을 titlePatterns에 쓰지 않는다. 폴백 제목 오염 방지.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고·비용 유도.
//   허용 = 시공 범위 / 원단·표면 차이 / 부위별 조건 / 공정 순서 / 문제 원인과 처리 / 관리.

export const FILM_META = {
  industry: "film",
  label: "인테리어필름",
  fullLabel: "인테리어필름 시공 정보",
  greeting: "안녕하세요. {region} 인테리어필름 시공 업체입니다.",
  voice: "{region} 인테리어필름 시공 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
  useSite: true,          // ★ siteBlock(단지명·평형) 사용 업종 — 공사군 공통 플래그
};

// ─────────────────────────────────────────────────────────────
// 메뉴 그룹 — standard(1차 릴리스) / experimental(2차 확장 대기)
//   experimental 은 CATS·TREATMENTS 에 포함하지 않는다.
// ─────────────────────────────────────────────────────────────
export const FILM_GROUP = {
  standard: [
    "전체필름",
    "싱크대필름",
    "현관문필름",
    "방문필름",
    "몰딩필름",
    "붙박이장필름",
    "샷시필름",
    "상가필름",
    "사무실필름",
    "엘리베이터필름",
  ],
  experimental: [
    "아트월필름",   // 검색 본질이 시공보다 디자인(패턴·연출) — 별도 데이터셋 축
    "방염필름",     // 다중이용업소 법규(방염성능·필증) 축 — 규격 데이터 확보 후 승격
  ],
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const FILM_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "소문이 자자",
  "새것처럼", "감쪽같이",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  "잘하는곳", "잘하는 곳", "필름잘하는곳", "믿고 맡기",
  // 후기·체험담·고객사례
  //   ★ [S140 FILM-STRIP-WORDCUT-01] "만족도" 제외 — stripForbidden 은 단어 경계 없이 부분 문자열을
  //     삭제하므로 "결과에 대한 만족도를 높일" → "결과에 대한 를 높일" 로 문장이 파괴된다(실측).
  //     정상 문장의 구성요소가 되는 명사형은 삭제 필터가 아니라 프롬프트 생성 금지로 다룬다.
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례",
  // AI 논문형 연결어
  //   ★ [S140 FILM-STRIP-WORDCUT-01] "따라서"·"정리하면" 제외 — 문중에서 정상 용례를 가진다.
  //     "상태에 따라서 달라진다" / "면을 정리하면 필름이 붙는다" 가 부분삭제로 파괴된다.
  //     기능 손실 없음: generateFilm.js 가 이 3개를 '문두 한정' 정규식으로 별도 제거한다.
  //     여기 잔류는 문중까지 무차별 삭제하는 중복이었다. "결론적으로" 는 문중 용례가 없어 유지.
  "결론적으로",
];

// 카테고리 탭 — 메뉴 1개 = cat 1개 평면 구조 (10메뉴 = 10cat)
//   ★ lib/spine/scenes/film.js 의 SCENES 키와 1:1 동일해야 한다.
export const FILM_CATS = [
  "전체필름",
  "싱크대필름",
  "현관문필름",
  "방문필름",
  "몰딩필름",
  "붙박이장필름",
  "샷시필름",
  "상가필름",
  "사무실필름",
  "엘리베이터필름",
];

// ─────────────────────────────────────────────────────────────
// 자재 — ★ 업종 소유.
//   사용자 입력값을 그대로 활용한다(제품군은 계속 바뀜). 아래는 선택 후보 목록.
// ─────────────────────────────────────────────────────────────
export const FILM_BRANDS = [
  { id: "lx",      brand: "LX하우시스" },
  { id: "hyundai", brand: "현대L&C" },
  { id: "samsung", brand: "삼성인테리어필름" },
  { id: "3m",      brand: "3M" },
  { id: "etc",     brand: "" },          // 직접입력
];

// 표면 — 원단 종류. use = 선택이 갈리는 지점(문장으로 쓰지 않고 판단 재료로만 소비)
export const FILM_SURFACES = [
  { s: "단색",   use: "면이 넓고 조명을 정면으로 받는 구간" },
  { s: "무광",   use: "손자국·반사가 신경 쓰이는 손 닿는 면" },
  { s: "유광",   use: "좁고 어두운 공간에서 반사를 쓰는 구간" },
  { s: "우드",   use: "결 방향을 맞춰야 하는 문짝·몰딩 연속면" },
  { s: "메탈",   use: "테두리·포인트로 좁게 들어가는 구간" },
  { s: "패브릭", use: "질감으로 하지 미세 요철을 덜 드러내는 구간" },
];

// 하지(下地) 등급 — 필름의 결과를 가르는 실제 축. 판단 재료로만 소비.
export const FILM_BASE_GRADE = [
  { g: "양호",   note: "탈지와 프라이머만으로 부착 가능한 상태" },
  { g: "흠집",   note: "찍힘·파임이 있어 퍼티 충전 후 샌딩이 필요한 상태" },
  { g: "재시공", note: "기존 필름 잔여 접착제가 남아 걷어낸 뒤 면을 다시 잡아야 하는 상태" },
  { g: "부적합", note: "습기·부풀음이 남아 부착 전 원인 처리가 먼저인 상태" },
];

// 시공 부위 — 부위별 탈거 대상이 갈리는 축(프롬프트 문맥 재료)
export const FILM_AREAS = [
  "싱크대", "현관문", "방문", "문틀", "몰딩", "붙박이장", "창틀", "기둥", "파티션",
];

// 입력값 → 본문 표기 문자열. 미입력이면 빈 문자열(부작용 0).
//   "LX 무광" / "무광" / "현대L&C" 어떤 형태로 들어와도 원형을 크게 훼손하지 않는다.
export function formatMaterial(input) {
  const v = String(input == null ? "" : input).replace(/\s+/g, " ").trim();
  if (!v) return "";
  const b = FILM_BRANDS.find((x) => x.brand && v.includes(x.brand));
  const s = FILM_SURFACES.find((x) => v.includes(x.s));
  if (b && s) return `${b.brand} ${s.s}`;
  if (b) return b.brand;
  if (s) return s.s;
  return v;   // 직접입력값 원형 보존
}

// 표면 입력 → 판단 재료 반환. 미입력·미매칭이면 null(프롬프트에 아무것도 붙지 않음).
export function getSurfaceNote(input) {
  const v = String(input == null ? "" : input);
  const hit = FILM_SURFACES.find((x) => v.includes(x.s));
  return hit || null;
}

// 하지 상태 입력 → 판단 재료 반환. 미입력·미매칭이면 null.
export function getBaseNote(input) {
  const v = String(input == null ? "" : input);
  const hit = FILM_BASE_GRADE.find((x) => v.includes(x.g));
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

// 가구형 (싱크대·붙박이장) — 탈거와 곡면이 축
const TP_FURN = (kase) => [
  `{region} ${kase} 문짝을 떼고 하는 이유`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 모서리가 들뜨는 자리`,
  `{region} ${kase} 시공 후 관리 방법`,
];

// 도어형 (현관문·방문) — 하지 흠집과 재조립이 축
const TP_DOOR = (kase) => [
  `{region} ${kase} 하지 작업이 갈리는 지점`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 찍힌 자국을 잡는 방법`,
  `{region} ${kase} 시공 후 관리 방법`,
];

// 선·프레임형 (몰딩·샷시) — 이음과 코너가 축
const TP_TRIM = (kase) => [
  `{region} ${kase} 이음선이 생기는 자리`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 코너 마감이 갈리는 지점`,
  `{region} ${kase} 전 점검할 곳`,
];

// 상업형 (상가·사무실·엘리베이터)
const TP_BIZ = (kase) => [
  `{region} ${kase} 작업 시간대를 잡는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 원단을 정하는 기준`,
  `{region} ${kase} 비용이 달라지는 이유`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 10개. cat / infoKey / titlePatterns / keywords / analysisAxis
//   infoKey = 세션60 pickInfoBlock 데이터 조회 표준.
//     BLOCKS[t.infoKey] || BLOCKS[t.cat] || BLOCKS.prebook
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const FILM_TREATMENTS = [
  // ── 범위 축 ───────────────────────────────────
  {
    id: "fm_full", industry: "film", name: "전체필름", cat: "전체필름", emoji: "🏠",
    infoKey: "scope",
    titlePatterns: TP_SCOPE("전체필름"),
    keywords: ["전체필름", "집 전체 인테리어필름", "아파트 필름 시공", "인테리어필름 전체 교체"],
    analysisAxis: ["시공 범위", "하지 상태 판단", "탈거 범위", "원단 선택", "마감 확인"],
    useApt: false, useSite: true, compareWith: "방문필름", rank: 1, recommendedWeight: 14,
  },

  // ── 가구 축 ───────────────────────────────────
  {
    id: "fm_sink", industry: "film", name: "싱크대필름", cat: "싱크대필름", emoji: "🍳",
    infoKey: "furniture",
    titlePatterns: TP_FURN("싱크대필름"),
    keywords: ["싱크대필름", "주방 가구 필름", "싱크대 도어 필름", "부엌 가구 리폼"],
    analysisAxis: ["문짝 탈거", "기름때 탈지", "곡면 부착", "수증기 구간", "재조립 확인"],
    useApt: false, useSite: true, compareWith: "붙박이장필름", rank: 1, recommendedWeight: 14,
  },
  {
    id: "fm_closet", industry: "film", name: "붙박이장필름", cat: "붙박이장필름", emoji: "🚪",
    infoKey: "furniture",
    titlePatterns: TP_FURN("붙박이장필름"),
    keywords: ["붙박이장필름", "장롱 필름 시공", "슬라이딩 도어 필름", "수납장 리폼"],
    analysisAxis: ["레일 보호", "기존 필름 제거", "대면적 재단", "슬라이딩 간섭", "재조립 확인"],
    useApt: false, useSite: true, compareWith: "싱크대필름", rank: 2, recommendedWeight: 8,
  },

  // ── 도어 축 ───────────────────────────────────
  {
    id: "fm_entdoor", industry: "film", name: "현관문필름", cat: "현관문필름", emoji: "🔑",
    infoKey: "door",
    titlePatterns: TP_DOOR("현관문필름"),
    keywords: ["현관문필름", "현관문 리폼", "철재 현관문 필름", "현관 도어 시공"],
    analysisAxis: ["도어록 탈거", "철재면 정리", "흠집 충전", "외부면 조건", "모서리 마감"],
    useApt: false, useSite: true, compareWith: "방문필름", rank: 1, recommendedWeight: 12,
  },
  {
    id: "fm_door", industry: "film", name: "방문필름", cat: "방문필름", emoji: "🚪",
    infoKey: "door",
    titlePatterns: TP_DOOR("방문필름"),
    keywords: ["방문필름", "문틀 필름", "방문 리폼", "도어 필름 시공"],
    analysisAxis: ["문짝 분리", "하부 긁힘 보수", "문선 폭", "결 방향", "개폐 확인"],
    useApt: false, useSite: true, compareWith: "현관문필름", rank: 1, recommendedWeight: 10,
  },

  // ── 선·프레임 축 ──────────────────────────────
  {
    id: "fm_molding", industry: "film", name: "몰딩필름", cat: "몰딩필름", emoji: "📐",
    infoKey: "trim",
    titlePatterns: TP_TRIM("몰딩필름"),
    keywords: ["몰딩필름", "걸레받이 필름", "천장 몰딩 시공", "문선 필름"],
    analysisAxis: ["길이 실측", "이음부 처리", "코너 열성형", "연속면 결 방향", "이음선 점검"],
    useApt: false, useSite: true, compareWith: "방문필름", rank: 2, recommendedWeight: 10,
  },
  {
    id: "fm_frame", industry: "film", name: "샷시필름", cat: "샷시필름", emoji: "🪟",
    infoKey: "frame",
    titlePatterns: TP_TRIM("샷시필름"),
    keywords: ["샷시필름", "창틀 필름", "새시 리폼", "베란다 창틀 시공"],
    analysisAxis: ["실링 상태", "프레임 건조", "개폐 간섭", "이음부 재시공", "마감 확인"],
    useApt: false, useSite: true, compareWith: "몰딩필름", rank: 2, recommendedWeight: 8,
  },

  // ── 상업 축 ───────────────────────────────────
  {
    id: "fm_store", industry: "film", name: "상가필름", cat: "상가필름", emoji: "🏪",
    infoKey: "biz",
    titlePatterns: TP_BIZ("상가필름"),
    keywords: ["상가필름", "매장 인테리어필름", "영업 중 필름 시공", "기둥 필름"],
    analysisAxis: ["영업 시간 조건", "구역 분할", "냄새·분진 조건", "대면적 재단", "개점 전 정리"],
    useApt: false, useSite: true, compareWith: "사무실필름", rank: 1, recommendedWeight: 10,
  },
  {
    id: "fm_office", industry: "film", name: "사무실필름", cat: "사무실필름", emoji: "🏢",
    infoKey: "biz",
    titlePatterns: TP_BIZ("사무실필름"),
    keywords: ["사무실필름", "오피스 필름 시공", "파티션 필름", "사무실 도어 리폼"],
    analysisAxis: ["근무 시간 조건", "출입 통제", "면 단위 재단", "손잡이 재조립", "복귀 전 점검"],
    useApt: false, useSite: true, compareWith: "상가필름", rank: 2, recommendedWeight: 8,
  },
  {
    id: "fm_elev", industry: "film", name: "엘리베이터필름", cat: "엘리베이터필름", emoji: "🛗",
    infoKey: "biz",
    titlePatterns: TP_BIZ("엘리베이터필름"),
    keywords: ["엘리베이터필름", "승강기 내부 필름", "엘리베이터 리폼", "공용부 필름"],
    analysisAxis: ["운행 중단 시간", "벽판 재질", "버튼 간섭", "동 단위 순서", "운행 재개 확인"],
    useApt: false, useSite: true, compareWith: "사무실필름", rank: 3, recommendedWeight: 6,
  },
];

// ─────────────────────────────────────────────────────────────
// 정보블럭 — pickInfoBlock 에서 소비 (infoKey → cat → prebook)
//   ★ 절차·조건 등 시점 무관 구조 정보만. 비용 수치·보장 표현 금지.
// ─────────────────────────────────────────────────────────────
export const FILM_INFO_BLOCKS = {
  scope: {
    title: "시공 범위 구분",
    items: [
      "집 전체 / 부위 단위 / 손상 구간만",
      "문짝·문틀·몰딩은 따로 끊어 잡을 수 있음",
      "붙박이장 내부면 포함 여부는 별도 확인",
      "※ 기존 표면 상태에 따라 범위는 달라질 수 있음",
    ],
  },
  furniture: {
    title: "가구 부위 확인 사항",
    items: [
      "문짝은 떼어 눕혀야 곡면 모서리가 접힘 없이 넘어감",
      "경첩 위치를 표시해 두어야 재조립 후 문이 맞음",
      "조리 수증기가 닿는 하부 도어는 건조 상태를 먼저 확인",
      "손잡이 구멍 주변은 필름을 접어 넘겨 마감",
    ],
  },
  door: {
    title: "도어 부위 확인 사항",
    items: [
      "찍힘·파임은 퍼티로 채우고 샌딩해야 표면에 비치지 않음",
      "철재문은 녹 자국을 걷어낸 뒤 프라이머를 올림",
      "도어록·손잡이는 떼고 진행해야 경계가 남지 않음",
      "외부면은 온도 변화가 커서 하지 정리 폭을 더 잡음",
    ],
  },
  trim: {
    title: "몰딩·프레임 확인 사항",
    items: [
      "길이 방향으로 이어 붙는 자리라 이음선 위치를 먼저 정함",
      "벌어진 이음부는 메운 뒤 샌딩해야 선이 곧게 남음",
      "코너는 열을 주어 각을 잡아야 뜨지 않음",
      "연속면은 결 방향을 한쪽으로 통일",
    ],
  },
  frame: {
    title: "창틀 시공 조건",
    items: [
      "갈라진 실링은 걷어낸 뒤 진행",
      "프레임에 물기가 남아 있으면 건조 확인 후 부착",
      "개폐 시 서로 닿는 면은 두께를 감안해 범위를 잡음",
      "부착 후 이음부는 실리콘으로 다시 막음",
    ],
  },
  biz: {
    title: "영업 공간 시공 조건",
    items: [
      "영업 종료 후·휴무일 등 작업 가능 시간대 확인",
      "구역을 나눠 진행하면 부분 개방이 가능",
      "접착제 냄새가 빠지는 시간을 일정에 포함",
      "손이 자주 닿는 면은 표면 종류를 달리 잡음",
    ],
  },
  base: {
    title: "하지 상태 구분",
    items: [
      "양호: 탈지와 프라이머만으로 부착 가능",
      "흠집: 퍼티로 채우고 샌딩해 면을 맞춘 뒤 진행",
      "재시공: 기존 필름과 잔여 접착제를 걷어낸 뒤 면을 다시 잡음",
      "※ 같은 원단이라도 하지 상태에 따라 결과가 달라짐",
    ],
  },
  material: {
    title: "원단 표면 구분",
    items: [
      "무광: 손자국·반사가 신경 쓰이는 손 닿는 면",
      "유광: 좁고 어두운 공간에서 반사를 쓰는 구간",
      "우드: 결 방향을 맞춰야 하는 연속면",
      "패브릭·엠보: 하지 미세 요철이 덜 드러나는 구간",
    ],
  },
  order: {
    title: "시공 진행 순서",
    items: [
      "현장 확인 → 손잡이·경첩 탈거 → 기존 실리콘 제거",
      "표면 탈지 → 흠집 퍼티 충전 → 샌딩",
      "프라이머 도포 → 재단 → 부착 → 헤라 압착",
      "열풍기 마감 → 모서리 각잡기 → 재조립",
    ],
  },
  aftercare: {
    title: "시공 후 관리",
    items: [
      "접착이 자리를 잡는 동안 강한 세제로 문지르지 않음",
      "모서리와 이음선은 손톱으로 긁지 않도록 주의",
      "가열 기구 가까운 면은 열이 직접 닿지 않게 관리",
      "한 자리에서 들뜸이 반복되면 하지 원인부터 확인",
    ],
  },
  prebook: {
    title: "시공 전 확인",
    items: [
      "시공 부위와 원단 표면 사전 확인",
      "기존 표면 상태(찍힘·들뜸·습기) 확인",
      "문짝·손잡이 탈거 가능 여부 확인",
      "작업 가능 시간대와 일정 협의",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// cat 전용 INFO_BLOCKS — 공통 블록이 문맥과 어긋나는 cat만 override.
//   ★ 여기 없는 cat은 공통 블록 그대로(무영향).
// ─────────────────────────────────────────────────────────────
export const FILM_CAT_INFO_BLOCKS = {
  싱크대필름: {
    order: {
      title: "시공 진행 순서",
      items: [
        "문짝 탈거 → 경첩 위치 표시",
        "기름때 탈지 → 들뜬 모서리 정리",
        "샌딩 → 프라이머 도포 → 재단",
        "곡면 부착 → 헤라 압착 → 열풍기 마감 → 재조립",
      ],
    },
  },
  샷시필름: {
    order: {
      title: "시공 진행 순서",
      items: [
        "실링 상태 확인 → 기존 실리콘 제거",
        "프레임 물기 건조 → 표면 탈지",
        "샌딩 → 프라이머 도포 → 프레임 재단",
        "부착 → 압착 → 이음부 실리콘 재시공 → 개폐 확인",
      ],
    },
  },
  엘리베이터필름: {
    biz: {
      title: "영업 공간 시공 조건",
      items: [
        "승강기 운행을 멈출 수 있는 시간대를 먼저 확인",
        "버튼·손잡이 커버는 떼고 진행",
        "동이 여러 곳이면 한 대씩 끊어 운행을 남김",
        "입주민 통행 안내 시점을 관리 주체와 협의",
      ],
    },
  },
};

// cat 전용 블록이 있으면 공통 블록 위에 덮어씌운다. 미정의 cat은 공통 그대로.
export function getInfoBlocks(cat) {
  const over = FILM_CAT_INFO_BLOCKS[cat];
  return over ? { ...FILM_INFO_BLOCKS, ...over } : FILM_INFO_BLOCKS;
}

// 사진 슬롯 — 정보형, 캡션 선택 (연출·후기 금지)
//   ★ closing 미부착 5슬롯 고정 (세션62 도배 결함3 재발 방지)
export const FILM_PHOTO_POOL = [
  { slot: "before",   alt: "{region} 인테리어필름 시공 전 표면 상태" },
  { slot: "base",     alt: "퍼티 충전·샌딩 하지 정리 확인" },
  { slot: "process",  alt: "필름 재단·부착 진행" },
  { slot: "material", alt: "인테리어필름 원단 표면 확인" },
  { slot: "after",    alt: "인테리어필름 시공 후 마감 상태" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const FILM_COMPARE = {
  compareWith: "방문필름",
  compareWithText2: "기존 표면 유지",
};

// BLOCK_MAP 격리용 — 도배·장판·인테리어 등 인접 업종과 교차 오염 차단.
//   ★ 필름은 '표면 마감재 시공' 범위만. 벽면(dobae)·바닥(flooring)·전체 리모델링(interior)과 분리.
export const FILM_BLOCK_KEYWORDS = [
  "실크벽지", "합지벽지", "초배", "정배", "벽지 제거",
  "면갈이", "본드 도포", "걸레받이 시공", "장판 재단",
  "줄눈시공", "탄성코트", "욕실리모델링", "주방리모델링",
];
