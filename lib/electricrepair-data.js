// lib/electricrepair-data.js
// 전기수리(electricrepair) 업종 데이터셋 — v1 / 정보형 + 생활전기 점검·교체 안내 가이드형
// 화자 = {region} 전기수리 업체. 정보형(누전·차단기·콘센트·스위치·조명·센서등).
//   후기·체험·과장광고·추천·만족도·최저가·할인·이벤트·전화/상담/견적 유도 금지.
// 복제 베이스: homefix-data.js 80% (정보형 섹션루프·출장업종 구조 동형) + plumbing 20%(안전 확인 톤).
//   섹션축만 전기수리형으로 교체.
// industry='electricrepair' 고정. 메뉴 8개(1차 확정).
//
// 설계 핵심 (SOP v4.2 + 전기수리 작업지시서):
//   - 생활전기 점검·교체 정보형. 출장/현장방문 업종 → APT 미사용(useApt 전부 false). region 문자열만.
//   - 흐름: 생활문제 → 원인 → 점검위치 → 확인사항 → 관리방법.
//   - 관련도 노출 축 = 누전 / 차단기 / 콘센트 / 스위치 / LED / 센서등 / 전등.
//   - 타업종 오염 차단: 집수리(문·손잡이·건조대·레일·실리콘) 혼입 금지 · 설비업체 화자 혼입 금지.
//     ★ 피부과 'sili_lifting'(실리프팅) 등 타업종 토큰과의 자연어 파서 충돌 주의(homefix STEP4 교훈).
//
// ★ 절대 금지(정보형 고정): 후기·만족도·추천·최저가·할인·이벤트·전화/상담/견적 유도·과장광고·1등·최고·100%해결.
//   작업일지형(다녀왔습니다·고쳐드렸습니다·시공했습니다·출동했습니다·당일출동·즉시방문) 차단.
//   ★ 전기공사 영역 과확장 차단: 점검·교체 안내 수준만. 분전반 증설·배선공사·승압 등 면허 전기공사 범위 금지.
//
// ★ cat ↔ INFO_BLOCK 1:1 (8 cat = 8 block, UNDEFINED 0). 박제 0종.
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const ELECTRICREPAIR_META = {
  industry: "electricrepair",
  label: "전기수리",
  fullLabel: "전기수리 안내",
  greeting: "안녕하세요. {region} 전기수리 업체입니다.",
  voice: "{region} 전기수리 업체",
  badge: "신규",
  // 결정주기: 고장·노후·증상 발생 시점 기반(점검·교체 대응)
  decisionCycle: "compare",
  // 비용 단정 금지 — 제품·구조·작업 범위 변수 → "영향 요소" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·만족도·과장광고·추천·할인유도 + 작업일지형 + 타업종 오염 차단
export const ELECTRICREPAIR_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1등", "1위", "최고", "역대급", "초대박", "대박",
  "100% 해결", "100%해결", "100%", "완벽",
  // 보장·추천·순위 (정보형 고정)
  "보장", "효과 보장", "반드시", "추천드립니다", "강력 추천", "추천 업체", "강추", "순위", "추천",
  // 할인·이벤트·유도
  "할인", "특가", "이벤트", "프로모션", "지금 전화", "전화주세요", "상담 신청", "견적 문의",
  "문의주세요", "연락주세요", "지금 상담", "비용문의", "상담문의",
  // 후기·체험담·작업일지형
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "만족도", "재이용", "후기",
  "작업후기", "시공후기",
  "다녀왔습니다", "고쳐드렸습니다", "시공했습니다", "출동했습니다", "긴급출동", "당일출동", "즉시방문",
  "출장", "24시", "전문업체 추천",
  "확 달라진", "환골탈태", "전문가가 직접",
  // 단정형 해결
  "즉시 해결", "당일 해결", "확실히 해결", "완벽 해결",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개 — cat 8종 1:1)
export const ELECTRICREPAIR_CATS = [
  "누전점검",
  "차단기점검",
  "차단기교체",
  "콘센트교체",
  "스위치교체",
  "LED교체",
  "센서등교체",
  "전등안들어옴",
  // [v-menu 2026-07-27] 메뉴 확장 3종. 면허 전기공사(배선·승압·분전반 증설) 범위 미포함 — 점검·교체 한정.
  "누전차단기교체",
  "분전함점검",
  "조명설치",
];

// ─────────────────────────────────────────────────────────────
// 제목 패턴 — data.js 소유. 생성기는 소비만 한다.
//   ★ 출장업종 → {aptName}/{livingArea} 토큰 미사용. {region} {menu} 축만.
//   ★ region 중복 방지: 패턴 내 {region} 1회만.
// ─────────────────────────────────────────────────────────────
const TP = (kase) => [
  `{region} ${kase}`,
  `{region} ${kase} 안내`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 확인방법`,
  `{region} ${kase} 점검방법`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축(원인·점검위치·증상·확인사항·관리방법).
//   useApt 전부 false (출장업종). weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const ELECTRICREPAIR_TREATMENTS = [
  // ── 누전점검 ─────────────────────────────────
  {
    id: "er_leak", industry: "electricrepair", name: "누전점검", cat: "누전점검", emoji: "⚡",
    infoKey: "leak",
    titlePatterns: [
      "{region} 누전 원인 확인",
      "{region} 누전차단기 내려감 안내",
      "{region} 전기 안들어옴 원인",
      "{region} 누전 확인 방법",
      "{region} 누전점검 안내",
    ],
    keywords: ["누전점검", "누전 점검", "누전차단기 내려감", "전기 안들어옴"],
    analysisAxis: ["누전 발생 원인", "누전 증상 확인", "점검 위치", "안전 확인사항"],
    useApt: false, compareWith: "차단기점검", rank: 1, recommendedWeight: 16,
  },

  // ── 차단기점검 ───────────────────────────────
  {
    id: "er_breaker_check", industry: "electricrepair", name: "차단기점검", cat: "차단기점검", emoji: "🔧",
    infoKey: "breaker_check",
    titlePatterns: [
      "{region} 차단기 내려가는 이유",
      "{region} 차단기 점검 방법",
      "{region} 반복 차단 원인 안내",
      "{region} 차단기 확인 순서",
      "{region} 차단기점검 안내",
    ],
    keywords: ["차단기점검", "차단기 점검", "차단기 내려감", "반복 차단"],
    analysisAxis: ["차단기 역할", "반복 차단 원인", "점검 위치", "확인 방법"],
    useApt: false, compareWith: "차단기교체", rank: 1, recommendedWeight: 13,
  },

  // ── 차단기교체 ───────────────────────────────
  {
    id: "er_breaker_swap", industry: "electricrepair", name: "차단기교체", cat: "차단기교체", emoji: "⚙️",
    infoKey: "breaker_swap",
    titlePatterns: TP("차단기교체"),
    keywords: ["차단기교체", "차단기 교체", "노후 차단기", "차단기 불량"],
    analysisAxis: ["교체 필요 상황", "노후 징후", "교체 범위", "확인 사항"],
    useApt: false, compareWith: "차단기점검", rank: 1, recommendedWeight: 10,
  },

  // ── 콘센트교체 ───────────────────────────────
  {
    id: "er_outlet", industry: "electricrepair", name: "콘센트교체", cat: "콘센트교체", emoji: "🔌",
    infoKey: "outlet",
    titlePatterns: [
      "{region} 콘센트 교체 시기",
      "{region} 콘센트 발열 원인",
      "{region} 콘센트 흔들림 점검",
      "{region} 콘센트 관리 방법",
      "{region} 콘센트교체 안내",
    ],
    keywords: ["콘센트교체", "콘센트 교체", "콘센트 발열", "콘센트 흔들림"],
    analysisAxis: ["교체 이유", "사용 환경", "교체 범위", "확인 사항"],
    useApt: false, compareWith: "스위치교체", rank: 1, recommendedWeight: 11,
  },

  // ── 스위치교체 ───────────────────────────────
  {
    id: "er_switch", industry: "electricrepair", name: "스위치교체", cat: "스위치교체", emoji: "🎚️",
    infoKey: "switch",
    titlePatterns: [
      "{region} 스위치 안눌림 원인",
      "{region} 스위치 교체 시기",
      "{region} 스위치 고장 확인",
      "{region} 전등 스위치 관리",
      "{region} 스위치교체 안내",
    ],
    keywords: ["스위치교체", "스위치 교체", "스위치 안눌림", "스위치 고장"],
    analysisAxis: ["고장 원인", "증상 확인", "교체 범위", "점검 사항"],
    useApt: false, compareWith: "콘센트교체", rank: 1, recommendedWeight: 11,
  },

  // ── LED교체 ──────────────────────────────────
  {
    id: "er_led", industry: "electricrepair", name: "LED교체", cat: "LED교체", emoji: "💡",
    infoKey: "led",
    titlePatterns: [
      "{region} LED 교체 방법",
      "{region} 조명 교체 시기",
      "{region} LED 수명 확인",
      "{region} 실내 조명 관리",
      "{region} LED교체 안내",
    ],
    keywords: ["LED교체", "LED 교체", "조명 교체", "LED 수명"],
    analysisAxis: ["교체 필요성", "조명 종류", "교체 범위", "확인 사항"],
    useApt: false, compareWith: "센서등교체", rank: 1, recommendedWeight: 8,
  },

  // ── 센서등교체 ───────────────────────────────
  {
    id: "er_sensor", industry: "electricrepair", name: "센서등교체", cat: "센서등교체", emoji: "🔦",
    infoKey: "sensor",
    titlePatterns: TP("센서등교체"),
    keywords: ["센서등교체", "센서등 교체", "센서등 오작동", "감지등 교체"],
    analysisAxis: ["오작동 원인", "설치 위치", "교체 범위", "확인 사항"],
    useApt: false, compareWith: "LED교체", rank: 1, recommendedWeight: 6,
  },

  // ── 전등안들어옴 ─────────────────────────────
  {
    id: "er_nolight", industry: "electricrepair", name: "전등안들어옴", cat: "전등안들어옴", emoji: "🌑",
    infoKey: "nolight",
    titlePatterns: TP("전등안들어옴"),
    keywords: ["전등안들어옴", "전등 안들어옴", "불이 안들어와요", "조명 불량"],
    analysisAxis: ["원인 확인", "점검 순서", "확인 위치", "주의 사항"],
    useApt: false, compareWith: "LED교체", rank: 1, recommendedWeight: 9,
  },

  // ══ [v-menu 2026-07-27] 메뉴 확장 3종 ═══════════════════════
  //   엔진·프롬프트 무수정. infoKey 지정만으로 정보블럭 연결.
  //   ★ 배선공사·승압·분전반 증설 등 면허 전기공사 범위는 계속 제외(점검·교체 안내 한정).
  {
    id: "er_elcb_swap", industry: "electricrepair", name: "누전차단기교체", cat: "누전차단기교체", emoji: "🔩",
    infoKey: "breaker_swap",
    titlePatterns: TP("누전차단기교체"),
    keywords: ["누전차단기교체", "누전차단기 교체", "누전차단기 불량", "누전차단기 노후"],
    analysisAxis: ["교체 필요 상황", "노후 징후", "교체 범위", "확인 사항"],
    useApt: false, compareWith: "차단기교체", rank: 1, recommendedWeight: 10,
  },
  {
    id: "er_panel", industry: "electricrepair", name: "분전함점검", cat: "분전함점검", emoji: "🗄️",
    infoKey: "panel",
    titlePatterns: TP("분전함점검"),
    keywords: ["분전함점검", "분전함 점검", "두꺼비집 점검", "분전반 확인"],
    analysisAxis: ["점검 항목", "점검 위치", "확인 방법", "안전 확인사항"],
    useApt: false, compareWith: "차단기점검", rank: 1, recommendedWeight: 3,
  },
  {
    id: "er_lightinst", industry: "electricrepair", name: "조명설치", cat: "조명설치", emoji: "🏮",
    infoKey: "lighting",
    titlePatterns: TP("조명설치"),
    keywords: ["조명설치", "조명 설치", "등기구 설치", "실내조명 설치"],
    analysisAxis: ["설치 위치", "조명 종류", "설치 범위", "확인 사항"],
    useApt: false, compareWith: "LED교체", rank: 1, recommendedWeight: 3,
  },
];

// 정보블럭 데이터 — generateElectricrepair.js pickInfoBlock에서 소비
//   ★ cat 8종 = block 8종 1:1. 박제 0종. 절차·체크포인트 등 시점 무관 구조 정보만.
//   ★ 안전 확인(차단기 차단 등) 항목은 plumbing 안전 톤 반영분.
export const ELECTRICREPAIR_INFO_BLOCKS = {
  leak: {
    title: "누전점검 확인 포인트",
    items: [
      "누전차단기 반복 내려감 여부",
      "물기·습기 많은 구역(욕실·주방·베란다) 확인",
      "노후 배선·피복 손상 가능성",
      "※ 점검 전 차단기 차단 등 안전 확인",
    ],
  },
  breaker_check: {
    title: "차단기점검 확인 포인트",
    items: [
      "특정 차단기만 반복 내려가는지",
      "과부하·누전 구분 필요 여부",
      "차단기 단자 발열·변색 상태",
      "※ 정확한 원인은 현장 확인 후 판단",
    ],
  },
  breaker_swap: {
    title: "차단기교체 확인 포인트",
    items: [
      "노후·변색·발열 등 교체 필요 징후",
      "용량(A)·종류(누전·배선용) 구분",
      "교체 대상 범위 확인",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  outlet: {
    title: "콘센트교체 확인 포인트",
    items: [
      "발열·그을음·흔들림·접촉 불량 증상",
      "사용 환경(고전력 가전·물기 구역) 확인",
      "교체 대상(콘센트·커버) 구분",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  switch: {
    title: "스위치교체 확인 포인트",
    items: [
      "안눌림·접촉 불량·소음 증상",
      "스위치 유형(일반·3로·디머) 구분",
      "교체 대상 범위 확인",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  led: {
    title: "LED교체 확인 포인트",
    items: [
      "조명 종류(직부등·매입등·평판등) 구분",
      "수명·밝기 저하·깜빡임 증상",
      "안정기·컨버터 상태 확인",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  sensor: {
    title: "센서등교체 확인 포인트",
    items: [
      "감지 불량·오작동·점멸 증상",
      "설치 위치(현관·복도·계단) 구분",
      "센서 유형·감지 범위 확인",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  // [v-menu 2026-07-27] 신규 메뉴 정보블럭 2종
  panel: {
    title: "분전함점검 확인 포인트",
    items: [
      "차단기 배열·회로 표기 상태 확인",
      "단자 조임·발열·변색 여부",
      "누전차단기 동작 시험 가능 여부",
      "※ 점검 전 차단기 차단 등 안전 확인",
    ],
  },
  lighting: {
    title: "조명설치 확인 포인트",
    items: [
      "설치 위치(천장·벽·주방·현관) 구분",
      "등기구 종류(직부·매입·레일) 확인",
      "기존 전원선·타공 여건 확인",
      "※ 작업 전 차단기 차단 등 안전 확인",
    ],
  },
  nolight: {
    title: "전등안들어옴 점검 포인트",
    items: [
      "전구·램프 자체 불량 여부",
      "스위치·소켓·배선 순서대로 점검",
      "해당 구역 차단기 상태 확인",
      "※ 점검 전 차단기 차단 등 안전 확인",
    ],
  },
};

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const ELECTRICREPAIR_COMPARE = {
  compareWith: "차단기점검",
  compareWithText2: "현장 확인",
};

// BLOCK_MAP 격리용 — 집수리/수도설비/보일러 등 인접업종과 교차 오염 차단.
//   electricrepair는 '생활전기 점검·교체(누전·차단기·콘센트·스위치·조명·센서등)' 정보만. 인접 토큰 차단.
//   ★ 면허 전기공사 영역(분전반 증설·배선공사·승압) 토큰도 차단 — 점검·교체 안내 수준 고정.
export const ELECTRICREPAIR_BLOCK_KEYWORDS = [
  "수도설비", "보일러", "방충망", "건물청소", "누수탐지", "하수구막힘", "저수조청소",
  "에어컨청소", "도배", "장판", "인테리어",
  "문손잡이", "현관문", "도어클로저", "빨래건조대", "커튼레일", "실리콘",
  "배선공사", "승압", "분전반 증설", "전기공사 도급",
];
