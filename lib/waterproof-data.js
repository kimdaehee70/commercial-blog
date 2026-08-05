// lib/waterproof-data.js
// 방수공사(waterproof) 업종 데이터셋 — v1 / 정보형 + 출장 시공 안내형
// 화자 = {region} 방수 시공 업체. 정보형(누수 발견·원인 진단·범위 판단·공법 선택·검수). 후기·체험·과장광고 금지.
//
// 복제 베이스: door-data.js 구조(Construction V3). 엔진(FLOW/Runtime/Handler) 무변경 — data만 추가한다.
//
// ★ [세션65] 경쟁 실측 — 상위 노출 글은 4패턴으로 수렴한다.
//   ①공법 홍보(우레탄·PVC·TPO·시트·특허공법) ②오래가는 방수 ③견적/비용 ④공사 순서 설명.
//   네 패턴 모두 '설명형'이며 공통으로 비어 있는 축이 있다:
//     현장 발견(Scene) / 원인 진단 / 부분보수 vs 전체시공 판단 / 왜 이 공법을 골랐는가
//   → 이 엔진은 [발견 → 판단 → 공법 선택] 축을 본문 골격으로 세운다.
//     공법은 홍보 대상이 아니라 '판단의 결과'로만 등장한다.
//
// ★ cat 축이 셋으로 갈린다 (scenes/waterproof.js 와 동일 구분):
//   ① 부위 축 — 검색자가 '어디서 샌다'만 아는 경우 (5메뉴)
//   ② 손상 축 — 검색자가 손상 형태를 이미 아는 경우 (2메뉴)
//   ③ 공법 축 — 검색자가 공법을 이미 정한 경우 (2메뉴)
//   공법 축은 '기존 방수층 상태'가 진입 지점이라 infoKey 도 공법군으로 직결된다.
//
// ★ 시공군 분리:
//   탄성코트(coating) = 외벽 미관 도막 축 / 누수탐지(leakdetect) = 탐지·계측 축
//   방수공사(waterproof) = 방수층 축(도막·시트·지수제·양생·담수시험)
//
// ★ door 와 동일하게 siteBlock(단지명·평형)을 쓰지 않는다.
//   방수는 '어느 단지'가 아니라 '어디서 새는가·어느 층이 남았는가'가 축이다 → useSite:false.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
//   ※ titleEngine 금지토큰(안내/범위 안내/준비사항/체크포인트/체크리스트/확인사항/
//     알아보기/소개)을 titlePatterns에 쓰지 않는다.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고·비용 유도.
//   ★ 방수 업종 특유 금지: 하자보증 기간·재시공 보장·영구 방수·반영구 등 수명 약속,
//     특허공법·독자공법 등 우위 주장, 당일 시공 등 시간 약속.
//   허용 = 누수 흔적 구분 / 원인별 진단 / 부분보수와 전체시공 판단 / 진행 순서 / 검수 / 관리.

export const WATERPROOF_META = {
  industry: "waterproof",
  label: "방수공사",
  fullLabel: "방수공사 정보",
  greeting: "안녕하세요. {region} 방수 시공 업체입니다.",
  voice: "{region} 방수 시공 업체",
  badge: "신규",
  decisionCycle: "urgent",     // 누수 = 행동 직전 검색. compare가 아니라 urgent 축.
  costTone: "consult",
  useSite: false,              // ★ 단지명·평형 축 미사용
};

// ─────────────────────────────────────────────────────────────
// 메뉴 그룹 — standard(1차 릴리스) / experimental(2차 확장 대기)
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_GROUP = {
  standard: [
    // ① 부위 축
    "옥상방수",
    "외벽방수",
    "베란다방수",
    "화장실방수",
    "지하주차장방수",
    // ② 손상 축
    "균열보수",
    "인젝션방수",
    // ③ 공법 축
    "우레탄방수",
    "PVC시트방수",
  ],
  // ★ CATS 미참조. DATA 보존 — 복원은 standard 이동 1줄.
  //   제외 사유 = 검색량·상업성 우선순위. 엔진 결함이 아니다.
  experimental: [
    "TPO시트방수",     // PVC시트 하위축. 자재 차이만으로는 검색 의도가 갈리지 않음
    "아스팔트방수",    // 토치 시공 축. 화기 작업 서술 기준 별도 필요
    "지붕방수",        // 옥상 하위축(경사지붕). 단독주택 축 확보 후 승격
    "물탱크방수",      // 위생 기준·수질 축이 섞여 검색 의도가 갈림
    "수영장방수",      // 상시 수압 축. 별도 데이터셋 필요
  ],
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const WATERPROOF_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "소문이 자자",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  "잘하는곳", "잘하는 곳", "방수잘하는곳", "믿고 맡기",
  // ★ 방수 업종 특유 — 수명·보증·우위 주장
  "영구 방수", "반영구", "평생 방수", "하자보증", "무상 재시공",
  "특허공법", "독자공법", "자체 개발 공법", "당일 시공", "누수 완전 차단",
  // 후기·체험담·고객사례
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 — 메뉴 1개 = cat 1개 평면 구조 (9메뉴 = 9cat)
//   ★ lib/spine/scenes/waterproof.js 의 SCENES 키와 1:1 동일해야 한다.
export const WATERPROOF_CATS = [
  // ① 부위 축
  "옥상방수",
  "외벽방수",
  "베란다방수",
  "화장실방수",
  "지하주차장방수",
  // ② 손상 축
  "균열보수",
  "인젝션방수",
  // ③ 공법 축
  "우레탄방수",
  "PVC시트방수",
];

// ─────────────────────────────────────────────────────────────
// Discovery — 현장 발견 어휘. 부위와 무관하게 공통.
//   ★ 판단 재료로만 소비. 프롬프트에 목록째 넣지 않는다.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_SYMPTOMS = [
  "균열", "크랙", "들뜸", "물고임", "백화현상", "방수층 박리",
  "배수 불량", "신축줄눈 손상", "난간 접합부 벌어짐",
  "천장 얼룩", "곰팡이", "물방울 맺힘",
];

// ─────────────────────────────────────────────────────────────
// Diagnosis — 진단 결론 어휘. axis3(판단 기준)이 도달하는 지점.
//   ★ 이 목록도 프롬프트에 나열하지 않는다. 판단 축 확인용.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_DIAGNOSIS = [
  "부분보수 가능", "전체 재시공 필요", "기존 방수층 제거",
  "배수 개선 필요", "균열 보강 필요", "공법 변경 필요",
];

// ─────────────────────────────────────────────────────────────
// 원인군(CAUSE) — ★ 업종 소유. waterproof 의 제1 판단 축.
//   key = infoKey 와 동일. parts = 점검 대상, note = 판단이 갈리는 지점.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_CAUSE_PARTS = {
  membrane: {
    label: "기존 방수층",
    parts: ["도막", "들뜸 구간", "박리면", "겹침 이음", "층 두께", "바탕 접착면"],
    note: "남은 층을 살려 덧올릴 수 있는지 걷어내야 하는지로 갈림",
  },
  crack: {
    label: "균열·틈",
    parts: ["표면 크랙", "관통 균열", "신축 이음", "커팅 홈", "실링재", "보강 메시"],
    note: "금이 더 벌어지는 중인지 멈춰 있는지로 처리가 갈림",
  },
  drain: {
    label: "배수·물길",
    parts: ["드레인", "배수구 목", "바닥 구배", "물고임 자리", "낙수관", "코너 마감"],
    note: "층을 다시 올려 잡히는지 물길 자체를 고쳐야 하는지로 갈림",
  },
  joint: {
    label: "접합부·신축줄눈",
    parts: ["신축줄눈", "파라펫 접합부", "벽·바닥 코너", "창틀 코킹", "난간 고정부"],
    note: "실링 교체로 끝나는지 접합부를 다시 짜야 하는지로 갈림",
  },
  penetration: {
    label: "관통부·배관 주변",
    parts: ["배수 트랩", "배관 슬리브", "관 목 주변", "문턱 하부", "슬래브 관통구"],
    note: "관 주변만 물려 올려 잡히는지 바닥까지 걷어야 하는지로 갈림",
  },
  urethane: {
    label: "도막(우레탄) 공법",
    parts: ["프라이머", "하도", "중도", "상도", "겹침 구간", "양생 조건"],
    note: "바탕 습기와 남은 층 상태에 따라 층을 몇 겹으로 나눌지가 갈림",
  },
  sheet: {
    label: "시트(PVC) 공법",
    parts: ["절연층", "시트", "융착 접합선", "모서리 마감재", "드레인 성형부"],
    note: "바탕 평탄도와 모서리 처리 방식에 따라 접합선 배치가 갈림",
  },
  // [세션65] experimental 이관 메뉴 전용 — CATS 미참조. 복원 시 그대로 사용.
  torch: {
    label: "아스팔트·토치 공법",
    parts: ["아스팔트 시트", "토치 가열면", "겹침 폭", "보호 몰탈", "화기 관리"],
    note: "화기 사용 가능 여부와 보호층 유무로 진행 자체가 갈림",
  },
};

// 원인군 입력 → 판단 재료 반환. 미입력·미매칭이면 null(프롬프트에 아무것도 붙지 않음).
export function getPartNote(input) {
  const v = String(input == null ? "" : input).trim();
  if (!v) return null;
  if (WATERPROOF_CAUSE_PARTS[v]) return WATERPROOF_CAUSE_PARTS[v];
  const hit = Object.values(WATERPROOF_CAUSE_PARTS).find(
    (x) => x.label.includes(v) || x.parts.some((p) => v.includes(p))
  );
  return hit || null;
}

// 발견 입력 → 원형 보존. 미입력이면 빈 문자열(부작용 0).
export function formatSymptom(input) {
  const v = String(input == null ? "" : input).replace(/\s+/g, " ").trim();
  if (!v) return "";
  const hit = WATERPROOF_SYMPTOMS.find((s) => v.includes(s));
  return hit || v;
}

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·추천·보장 배제. (폴백 전용)
//   ★ 경쟁 축(공법 홍보·비용)이 아니라 판단 축을 제목으로 세운다.
// ─────────────────────────────────────────────────────────────

// 부위형 (옥상·외벽·베란다·화장실·지하주차장) — 누수 지점이 축
const TP_AREA = (kase) => [
  `{region} ${kase} 누수 원인 잡는 순서`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 부분보수와 전체시공 판단 기준`,
  `{region} ${kase} 비용이 달라지는 이유`,
];

// 손상형 (균열보수·인젝션방수) — 손상 형태가 축
const TP_DAMAGE = (kase) => [
  `{region} ${kase} 보수 방식을 정하는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 다시 벌어지는 자리의 차이`,
  `{region} ${kase} 점검해야 하는 곳`,
];

// 공법형 (우레탄·PVC시트) — 기존 층 처리가 축
const TP_METHOD = (kase) => [
  `{region} ${kase} 공법을 정하는 기준`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 기존 방수층 처리 기준`,
  `{region} ${kase} 비용이 달라지는 이유`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 9개. cat / infoKey / titlePatterns / keywords / analysisAxis
//   infoKey = 세션60 pickInfoBlock 데이터 조회 표준.
//   recommendedWeight 합계 100.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_TREATMENTS = [
  // ── ① 부위 축 ──────────────────────────────────
  {
    id: "wp_roof", industry: "waterproof", name: "옥상방수", cat: "옥상방수", emoji: "🏢",
    infoKey: "membrane",
    titlePatterns: TP_AREA("옥상방수"),
    keywords: ["옥상방수", "옥상 물고임", "옥상 방수층 들뜸", "옥상 누수 보수"],
    analysisAxis: ["누수 흔적 위치", "물고임 자리", "방수층 들뜸", "시공 범위 판단", "담수 시험"],
    useApt: false, useSite: false, compareWith: "우레탄방수", rank: 1, recommendedWeight: 18,
  },
  {
    id: "wp_wall", industry: "waterproof", name: "외벽방수", cat: "외벽방수", emoji: "🧱",
    infoKey: "crack",
    titlePatterns: TP_AREA("외벽방수"),
    keywords: ["외벽방수", "외벽 크랙 보수", "외벽 백화현상", "벽 타고 내려오는 누수"],
    analysisAxis: ["백화 자국", "크랙 진행 방향", "창틀 코킹", "시공 범위 판단", "살수 시험"],
    useApt: false, useSite: false, compareWith: "균열보수", rank: 1, recommendedWeight: 13,
  },
  {
    id: "wp_veranda", industry: "waterproof", name: "베란다방수", cat: "베란다방수", emoji: "🪟",
    infoKey: "drain",
    titlePatterns: TP_AREA("베란다방수"),
    keywords: ["베란다방수", "베란다 누수", "아랫집 천장 얼룩", "배수구 주변 누수"],
    analysisAxis: ["배수구 주변", "코너 실리콘", "바닥 구배", "시공 범위 판단", "담수 시험"],
    useApt: false, useSite: false, compareWith: "우레탄방수", rank: 1, recommendedWeight: 13,
  },
  {
    id: "wp_bath", industry: "waterproof", name: "화장실방수", cat: "화장실방수", emoji: "🚿",
    infoKey: "penetration",
    titlePatterns: TP_AREA("화장실방수"),
    keywords: ["화장실방수", "욕실 바닥 누수", "타일 들뜸 누수", "배수 트랩 주변 누수"],
    analysisAxis: ["타일 들뜸", "줄눈 갈라짐", "배수 트랩 주변", "시공 범위 판단", "담수 시험"],
    useApt: false, useSite: false, compareWith: "베란다방수", rank: 1, recommendedWeight: 12,
  },
  {
    id: "wp_parking", industry: "waterproof", name: "지하주차장방수", cat: "지하주차장방수", emoji: "🅿️",
    infoKey: "joint",
    titlePatterns: TP_AREA("지하주차장방수"),
    keywords: ["지하주차장방수", "주차장 천장 누수", "신축줄눈 누수", "지하 백태"],
    analysisAxis: ["천장 백태", "신축줄눈 벌어짐", "유입 경로 추적", "시공 범위 판단", "건조 확인"],
    useApt: false, useSite: false, compareWith: "인젝션방수", rank: 2, recommendedWeight: 8,
  },

  // ── ② 손상 축 ──────────────────────────────────
  {
    id: "wp_crack", industry: "waterproof", name: "균열보수", cat: "균열보수", emoji: "〽️",
    infoKey: "crack",
    titlePatterns: TP_DAMAGE("균열보수"),
    keywords: ["균열보수", "콘크리트 크랙 보수", "V커팅 실링", "벽 금 보수"],
    analysisAxis: ["균열 폭", "진행성 여부", "관통 여부", "보수 방식 판단", "물 뿌려 확인"],
    useApt: false, useSite: false, compareWith: "인젝션방수", rank: 1, recommendedWeight: 10,
  },
  {
    id: "wp_inject", industry: "waterproof", name: "인젝션방수", cat: "인젝션방수", emoji: "💉",
    infoKey: "penetration",
    titlePatterns: TP_DAMAGE("인젝션방수"),
    keywords: ["인젝션방수", "지수제 주입", "역주입 방수", "물 새는 크랙 주입"],
    analysisAxis: ["물 나오는 속도", "관통 여부", "주입 간격", "보수 방식 판단", "누수 멈춤 확인"],
    useApt: false, useSite: false, compareWith: "균열보수", rank: 2, recommendedWeight: 8,
  },

  // ── ③ 공법 축 ──────────────────────────────────
  {
    id: "wp_ureth", industry: "waterproof", name: "우레탄방수", cat: "우레탄방수", emoji: "🪣",
    infoKey: "urethane",
    titlePatterns: TP_METHOD("우레탄방수"),
    keywords: ["우레탄방수", "우레탄 도막방수", "노출 우레탄", "기존 도막 위 덧방"],
    analysisAxis: ["기존 도막 상태", "바탕 함수 상태", "노출·비노출", "도포 방식 판단", "양생 조건"],
    useApt: false, useSite: false, compareWith: "PVC시트방수", rank: 1, recommendedWeight: 10,
  },
  {
    id: "wp_sheet", industry: "waterproof", name: "PVC시트방수", cat: "PVC시트방수", emoji: "📐",
    infoKey: "sheet",
    titlePatterns: TP_METHOD("PVC시트방수"),
    keywords: ["PVC시트방수", "시트방수 융착", "옥상 시트방수", "절연층 시트"],
    analysisAxis: ["바탕 평탄도", "접합선 방향", "모서리 마감", "부착 방식 판단", "담수 시험"],
    useApt: false, useSite: false, compareWith: "우레탄방수", rank: 2, recommendedWeight: 8,
  },
];

// ─────────────────────────────────────────────────────────────
// 정보블럭 — pickInfoBlock 에서 소비 (infoKey → cat → prebook)
//   ★ 절차·조건 등 시점 무관 구조 정보만. 비용 수치·보장 표현·수명 약속 금지.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_INFO_BLOCKS = {
  membrane: {
    title: "기존 방수층 확인 사항",
    items: [
      "두드렸을 때 빈 소리가 나는 범위가 어디까지인지 표시",
      "남은 층을 살려 덧올릴지 걷어낼지는 들뜸 비율로 갈림",
      "층 아래 습기가 남으면 새로 올려도 같은 자리가 부풂",
      "겹침 이음 자리는 새 층과 만나는 지점부터 확인",
    ],
  },
  crack: {
    title: "균열·틈 확인 사항",
    items: [
      "금이 더 벌어지는 중인지 멈춰 있는지를 먼저 구분",
      "표면만 갈라진 것과 뒤까지 관통한 것은 처리가 다름",
      "폭이 좁아도 길게 이어지면 홈을 내 채우는 범위가 늘어남",
      "신축 이음 자리는 움직임을 흡수하는 재료로 채움",
    ],
  },
  drain: {
    title: "배수·물길 확인 사항",
    items: [
      "비 그친 뒤 물이 남는 자리와 남는 시간을 확인",
      "드레인이 막히면 층 상태와 무관하게 같은 자리가 젖음",
      "배수구 목까지 방수층이 물려 올라가 있는지 확인",
      "구배가 죽었으면 층을 다시 올리기 전에 물길부터 잡음",
    ],
  },
  joint: {
    title: "접합부·신축줄눈 확인 사항",
    items: [
      "벽과 바닥이 만나는 코너가 물이 먼저 지나는 자리",
      "신축줄눈은 굳은 재료로 채우면 다음 계절에 다시 벌어짐",
      "파라펫 상부 마감이 끊기면 위에서 물이 넘어 들어옴",
      "실링 교체로 끝나는 범위인지 접합부를 다시 짤 범위인지 구분",
    ],
  },
  penetration: {
    title: "관통부·배관 주변 확인 사항",
    items: [
      "물은 관을 타고 옆으로 흘러 새는 자리가 어긋나 보임",
      "관 목 주변은 방수층이 끊기기 쉬운 자리",
      "문턱 아래는 눈에 안 보여도 물이 넘어가는 통로가 됨",
      "관 주변만 물려 올려 잡히는지 바닥까지 걷을지 구분",
    ],
  },
  urethane: {
    title: "도막 공법 확인 사항",
    items: [
      "바탕에 습기가 남으면 층이 붙지 않고 뒤에서 들뜸",
      "층은 한 번에 두껍게가 아니라 나눠 올려야 고르게 굳음",
      "겹쳐 바르는 자리는 이어지는 방향을 미리 정해 둠",
      "노출과 비노출은 마감층에서 처리가 갈림",
    ],
  },
  sheet: {
    title: "시트 공법 확인 사항",
    items: [
      "바탕 돌기가 남으면 그 점에서 시트가 눌려 손상됨",
      "접합선은 물이 흐르는 방향을 거스르지 않게 배치",
      "융착 자리는 검침으로 붙지 않은 구간을 찾아냄",
      "드레인·모서리는 평면보다 성형 처리 범위가 넓음",
    ],
  },
  discovery: {
    title: "누수 흔적 구분",
    items: [
      "천장 얼룩 / 곰팡이 — 물이 오래 머문 자리",
      "흰 가루 자국 — 물이 지나간 길",
      "물고임 / 배수 불량 — 물길이 죽은 자리",
      "들뜸 / 박리 — 층 아래에 물이나 습기가 갇힌 자리",
    ],
  },
  decide: {
    title: "부분보수와 전체시공 구분",
    items: [
      "새는 자리가 한 곳으로 모이면 그 구간만 걷어내 이음",
      "들뜬 자리가 여러 곳으로 흩어지면 면 단위로 정리",
      "층을 올려도 물길이 그대로면 배수부터 손봄",
      "금이 계속 벌어지는 중이면 덮는 대신 움직임을 받는 재료로 채움",
    ],
  },
  order: {
    title: "진행 순서",
    items: [
      "누수 흔적 확인 → 물길 추적 → 손상 범위 표시",
      "주변 보양 → 기존 층·이물 정리 → 바탕 말리기",
      "균열·접합부 보강 → 프라이머 → 층 올리기 또는 시트 부착",
      "양생 → 담수·살수 시험 → 시공 내역 설명",
    ],
  },
  aftercare: {
    title: "시공 후 관리",
    items: [
      "굳는 동안에는 밟거나 물건을 올려 두지 않음",
      "드레인 주변 낙엽·이물은 주기적으로 걷어냄",
      "장마 뒤 물이 남는 자리가 생기면 위치를 기록해 둠",
      "같은 자리에 얼룩이 다시 올라오면 층보다 물길을 먼저 봄",
    ],
  },
  prebook: {
    title: "방문 전 확인",
    items: [
      "언제부터 어디에 얼룩이나 물이 보였는지 확인",
      "지난 시공 이력과 대략적인 경과 연수 확인",
      "옥상·베란다는 물건을 미리 옮겨 바닥을 비움",
      "작업 가능 시간대와 날씨 일정 협의",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// cat 전용 INFO_BLOCKS — 공통 블록이 문맥과 어긋나는 cat만 override.
// ─────────────────────────────────────────────────────────────
export const WATERPROOF_CAT_INFO_BLOCKS = {
  화장실방수: {
    order: {
      title: "진행 순서",
      items: [
        "누수 흔적 확인 → 타일 들뜸 두드려 보기 → 범위 표시",
        "위생도기 보양 → 타일 철거 → 슬래브 정리",
        "배관 주변 되메움 → 액체방수 → 코너 보강 → 몰탈 미장",
        "양생 → 담수 시험 → 타일 재부착 → 줄눈 채움",
      ],
    },
  },
  지하주차장방수: {
    order: {
      title: "진행 순서",
      items: [
        "유입 경로 추적 → 백태 시작 지점 표시",
        "차량 이동 안내 → 작업 구간 분리",
        "신축줄눈 실링 교체 → 들뜬 도막 제거 → 패인 자리 메움",
        "프라이머 → 도막 도포 → 건조 → 라인 마킹 복원",
      ],
    },
  },
  인젝션방수: {
    decide: {
      title: "주입과 표면 보수 구분",
      items: [
        "물이 나오는 상태에서는 표면 재료가 밀려 붙지 않음",
        "금이 뒤까지 관통했으면 안쪽에서 채워 물길을 막음",
        "표면만 갈라진 자리는 주입 대신 홈을 내 채움",
        "주입 뒤에도 옆에서 물이 나오면 간격을 좁혀 다시 잡음",
      ],
    },
  },
  PVC시트방수: {
    decide: {
      title: "시트와 도막 구분",
      items: [
        "바탕 굴곡이 심하면 시트가 뜨는 자리가 생김",
        "형상이 복잡한 면은 이어 붙이는 자리가 늘어남",
        "넓고 평평한 면은 접합선을 길게 한 방향으로 잡음",
        "기존 층을 남길지에 따라 절연층 유무가 갈림",
      ],
    },
  },
};

// cat 전용 블록이 있으면 공통 블록 위에 덮어씌운다. 미정의 cat은 공통 그대로.
export function getInfoBlocks(cat) {
  const over = WATERPROOF_CAT_INFO_BLOCKS[cat];
  return over ? { ...WATERPROOF_INFO_BLOCKS, ...over } : WATERPROOF_INFO_BLOCKS;
}

// 사진 슬롯 — 정보형, 캡션 선택 (연출·후기 금지)
//   ★ closing 미부착 5슬롯 고정 (세션62 도배 결함3 재발 방지)
export const WATERPROOF_PHOTO_POOL = [
  { slot: "before",   alt: "{region} 방수공사 전 누수 흔적" },
  { slot: "diagnose", alt: "누수 원인 진단 확인" },
  { slot: "scope",    alt: "손상 범위 표시 상태" },
  { slot: "process",  alt: "방수층 시공 진행" },
  { slot: "after",    alt: "양생 후 누수 시험 상태" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const WATERPROOF_COMPARE = {
  compareWith: "우레탄방수",
  compareWithText2: "손상 구간만 부분보수",
};

// BLOCK_MAP 격리용 — 인접 업종과 교차 오염 차단.
//   ★ waterproof 는 '방수층 축'만. 미관 도막(coating)·탐지(leakdetect)·
//     배관 교체(plumbing)·리모델링(interior)과 분리.
//   ★ [인수계 세션64 원칙] 단독 명사가 아니라 의도가 확정되는 복합어로 등록한다.
//     단독 등록은 자기 업종 검색축을 스스로 막는다.
//     (예: "균열"·"크랙"·"누수"는 이 엔진의 검색축이므로 절대 차단어로 넣지 않는다)
export const WATERPROOF_BLOCK_KEYWORDS = [
  "탄성코트시공", "외벽도색", "페인트 붓질",
  "누수탐지기", "열화상 탐지", "가스 추적 탐지",
  "배관교체공사", "수도관 동파", "변기 막힘",
  "욕실리모델링", "주방리모델링", "줄눈시공", "타일덧방시공",
  "인테리어필름", "필름 재단", "실크벽지", "초배", "정배",
  "방충망", "미세망",
];
