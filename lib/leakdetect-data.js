// lib/leakdetect-data.js
// 누수탐지(leakdetect) 업종 데이터셋 — v1 / 정보형 + 원인·절차·장비 안내 가이드형
// 화자 = {region} 누수탐지 업체. 정보형(원인·탐지절차·탐지장비·공사범위·보험·예방).
//   후기·체험·과장광고·최저가·1위·100%해결 금지.
// 복제 베이스: tankclean-data.js 70% + buildingclean 60% 성격 혼합.
//   - cat 구성 + titlePatterns data.js 소유 + APT_DATA 재사용 구조 동형.
// industry='leakdetect' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 원인분석/탐지절차 안내형으로 차별화.
//   - 관련도 노출 축 = 누수 원인/탐지 절차/탐지 장비/공사 범위/보험 처리/예방 관리.
//   - APT_DATA(tankclean 동형) 재사용: 지역+단지명+누수탐지 구조 SEO.
//   - 출장/현장방문 업종 → 고정 사업장 위치블록 미노출(_locStore={}).
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·시공후기·만족도·강력추천
//   ·최저가·전국1위·업계최고·100% 해결.
//   허용 = 누수 원인 / 탐지 절차 / 탐지 장비 / 공사 범위 / 보험 처리 / 예방 관리
//          / 점검 항목 / 예약 전 확인 (시점 무관 구조 정보).
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const LEAKDETECT_META = {
  industry: "leakdetect",
  label: "누수탐지",
  fullLabel: "누수탐지 안내",
  greeting: "안녕하세요. {region} 누수탐지 업체입니다.",
  voice: "{region} 누수탐지 업체",
  badge: "신규",
  decisionCycle: "compare",
  // 비용 단정 금지 — 누수 위치·배관 유형·공사 범위 변수 → "영향 요소" 톤
  costTone: "consult",
  // 동의어 없음(누수탐지 단일). 관련어: 누수, 배관누수.
  synonyms: ["누수탐지", "누수"],
};

// 누수 유형 8종 — 본문/제목 다양화용.
export const LEAKDETECT_LEAK_TYPES = [
  "화장실누수", "천장누수", "수도배관누수", "보일러배관누수",
  "옥상누수", "외벽누수", "바닥누수", "아래층누수",
];

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const LEAKDETECT_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "업계최고", "1등 업체", "1위", "전국1위", "최고",
  "100% 해결", "100퍼센트 해결", "완벽", "역대급", "초대박", "대박",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "강력추천", "추천 업체", "강추",
  // 후기·체험담
  "직접 해봤", "내돈내산", "시공후기", "리얼후기", "후기입니다", "고객님 후기", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
export const LEAKDETECT_CATS = [
  "누수탐지",
  "아파트누수",
  "화장실누수",
  "천장누수",
  "수도배관누수",
  "누수탐지비용",
  "누수보험처리",
  "아래층누수",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — tankclean과 동형 구조 재사용 (지역+단지명+누수탐지 SEO).
//   ★ 단지명·생활권만 보유. 누수 특화 시점 정보는 보유 금지.
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["누수탐지", "아파트누수", "아래층누수"],
    apts: [
      { name: "상계주공5단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "상계주공7단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "중계그린",     district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "중계무지개",   district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "하계장미",     district: "하계동", station: "하계역(7호선)", livingArea: "하계 생활권" },
      { name: "공릉우성",     district: "공릉동", station: "공릉역(7호선)", livingArea: "공릉 생활권" },
    ],
  },
  gangnam: {
    label: "강남",
    region: "강남구",
    focus: ["누수탐지", "아파트누수", "수도배관누수"],
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
    focus: ["누수탐지", "아파트누수", "천장누수"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
    ],
  },
  sejong: {
    label: "세종",
    region: "세종시",
    focus: ["누수탐지", "아파트누수"],
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
// 제목패턴 — {region} {aptName} {livingArea} 치환. 후기형·결과보장·추천 배제.
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 누수탐지 (지역/단지 단위 안내)
const TP_LEAK = (kase) => [
  `{region} ${kase} 전 확인사항`,
  `{region} {aptName} ${kase} 원인 점검`,
  `{aptName} ${kase} 확인방법`,
  `{livingArea} ${kase} 안내`,
  `{region} ${kase} 절차 정리`,
  `{region} ${kase} 점검 항목 안내`,
];

// 아파트누수
const TP_APT = (kase) => [
  `{region} ${kase} 원인 점검`,
  `{region} {aptName} ${kase} 확인방법`,
  `{region} ${kase} 탐지 절차`,
  `{region} ${kase} 점검 항목`,
];

// 화장실누수
const TP_BATHROOM = (kase) => [
  `{region} ${kase} 확인방법`,
  `{region} ${kase} 원인 점검`,
  `{region} ${kase} 탐지 절차 안내`,
  `{region} ${kase} 점검 항목 정리`,
];

// 천장누수
const TP_CEILING = (kase) => [
  `{region} ${kase} 원인 분석`,
  `{region} ${kase} 확인방법`,
  `{region} ${kase} 탐지 절차`,
  `{region} ${kase} 점검 항목`,
];

// 수도배관누수
const TP_PIPE = (kase) => [
  `{region} ${kase} 점검 절차`,
  `{region} ${kase} 원인 점검`,
  `{region} ${kase} 확인방법 안내`,
  `{region} ${kase} 탐지 장비 안내`,
];

// 누수탐지비용 (영향 요소형)
const TP_COST = (kase) => [
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 영향 요소 안내`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 점검 전 확인`,
];

// 누수보험처리 (절차·서류형)
const TP_INSURANCE = (kase) => [
  `{region} ${kase} 준비서류`,
  `{region} ${kase} 절차 안내`,
  `${kase} 알아두면 좋은 점`,
  `{region} ${kase} 확인사항 정리`,
];

// 아래층누수 (대처형)
const TP_DOWNSTAIRS = (kase) => [
  `{region} ${kase} 대처방법`,
  `{region} ${kase} 확인 절차`,
  `${kase} 점검 항목 안내`,
  `{region} ${kase} 예약 전 확인사항`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 원인·절차·장비·범위·보험·예방
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const LEAKDETECT_TREATMENTS = [
  // ── 누수탐지 ──────────────────────────────────
  {
    id: "ld_leak", industry: "leakdetect", name: "누수탐지", cat: "누수탐지", emoji: "💧",
    titlePatterns: TP_LEAK("누수탐지"),
    keywords: ["누수탐지 절차", "누수 원인", "누수 탐지 장비", "누수 점검"],
    analysisAxis: ["누수 원인", "탐지 절차", "탐지 장비", "공사 범위", "예방 관리"],
    useApt: true, compareWith: "아파트누수", rank: 1, recommendedWeight: 20,
  },

  // ── 아파트누수 ────────────────────────────────
  {
    id: "ld_apt", industry: "leakdetect", name: "아파트누수", cat: "아파트누수", emoji: "🏢",
    titlePatterns: TP_APT("아파트누수"),
    keywords: ["아파트 누수 원인", "아파트 누수탐지", "공용 배관 누수", "세대 누수 점검"],
    analysisAxis: ["누수 원인", "탐지 절차", "탐지 장비", "공사 범위", "보험 처리"],
    useApt: true, compareWith: "아래층누수", rank: 1, recommendedWeight: 15,
  },

  // ── 화장실누수 ────────────────────────────────
  {
    id: "ld_bathroom", industry: "leakdetect", name: "화장실누수", cat: "화장실누수", emoji: "🚽",
    titlePatterns: TP_BATHROOM("화장실누수"),
    keywords: ["화장실 누수 원인", "방수층 누수", "화장실 누수 확인", "욕실 누수 점검"],
    analysisAxis: ["누수 원인", "탐지 절차", "탐지 장비", "공사 범위"],
    useApt: true, compareWith: "천장누수", rank: 1, recommendedWeight: 13,
  },

  // ── 천장누수 ──────────────────────────────────
  {
    id: "ld_ceiling", industry: "leakdetect", name: "천장누수", cat: "천장누수", emoji: "🏠",
    titlePatterns: TP_CEILING("천장누수"),
    keywords: ["천장 누수 원인", "윗집 누수", "천장 누수 확인", "누수 위치 탐지"],
    analysisAxis: ["누수 원인", "탐지 절차", "탐지 장비", "공사 범위"],
    useApt: true, compareWith: "아래층누수", rank: 1, recommendedWeight: 12,
  },

  // ── 수도배관누수 ──────────────────────────────
  {
    id: "ld_pipe", industry: "leakdetect", name: "수도배관누수", cat: "수도배관누수", emoji: "🔧",
    titlePatterns: TP_PIPE("수도배관누수"),
    keywords: ["수도배관 누수", "온수배관 누수", "냉수배관 누수", "배관 누수 점검"],
    analysisAxis: ["누수 원인", "탐지 절차", "탐지 장비", "점검 항목"],
    useApt: false, compareWith: "누수탐지", rank: 2, recommendedWeight: 10,
  },

  // ── 누수탐지비용 ──────────────────────────────
  {
    id: "ld_cost", industry: "leakdetect", name: "누수탐지비용", cat: "누수탐지비용", emoji: "📋",
    titlePatterns: TP_COST("누수탐지비용"),
    keywords: ["누수탐지 영향 요소", "누수 점검 범위", "탐지 장비 종류", "공사 범위"],
    analysisAxis: ["영향 요소", "공사 범위", "탐지 장비", "예약 전 확인"],
    useApt: false, compareWith: "누수보험처리", rank: 1, recommendedWeight: 8,
  },

  // ── 누수보험처리 ──────────────────────────────
  {
    id: "ld_insurance", industry: "leakdetect", name: "누수보험처리", cat: "누수보험처리", emoji: "🗂️",
    titlePatterns: TP_INSURANCE("누수보험처리"),
    keywords: ["누수 보험 처리", "누수 보험 서류", "일상생활배상책임", "누수 보상 절차"],
    analysisAxis: ["보험 처리", "준비 서류", "공사 범위", "확인할 점"],
    useApt: false, compareWith: "누수탐지비용", rank: 1, recommendedWeight: 12,
  },

  // ── 아래층누수 ────────────────────────────────
  {
    id: "ld_downstairs", industry: "leakdetect", name: "아래층누수대처", cat: "아래층누수", emoji: "⬇️",
    titlePatterns: TP_DOWNSTAIRS("아래층누수"),
    keywords: ["아래층 누수 대처", "누수 책임 확인", "세대 간 누수", "누수 분쟁 절차"],
    analysisAxis: ["누수 원인", "탐지 절차", "보험 처리", "예방 관리"],
    useApt: false, compareWith: "아파트누수", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generateLeakdetect.js renderInfoBlock에서 소비
//   ★ 원인·절차·장비 등 시점 무관 구조 정보만. INFO_BLOCKS 8종.
export const LEAKDETECT_INFO_BLOCKS = {
  cause: {
    title: "누수 원인",
    items: [
      "배관 노후·이음부 균열",
      "방수층 손상·실리콘 노화",
      "보일러 분배기·난방배관 누수",
      "※ 누수 위치·배관 유형에 따라 원인은 달라질 수 있음",
    ],
  },
  process: {
    title: "탐지 절차",
    items: [
      "현장 상태·누수 흔적 확인",
      "의심 구간 탐지 장비 점검",
      "누수 위치 특정 → 범위 판단",
      "공사 범위·후속 안내",
    ],
  },
  equipment: {
    title: "탐지 장비",
    items: [
      "열화상카메라(온도차 확인)",
      "청음 탐지기(누수음 확인)",
      "가스 탐지(추적가스 주입)",
      "배관 내시경·압력 테스트",
    ],
  },
  scope: {
    title: "공사 범위",
    items: [
      "탐지 후 누수 구간 한정 확인",
      "배관·방수층·이음부 상태 점검",
      "복구 범위는 현장 상태에 따라 구분",
      "※ 범위·방식은 현장 확인 후 안내",
    ],
  },
  insurance: {
    title: "보험 처리 안내",
    items: [
      "일상생활배상책임 보험 해당 여부 확인",
      "누수 원인·책임 구분 자료 준비",
      "탐지 결과·현장 사진 기록",
      "※ 보상 가능 여부는 약관·가입 조건에 따름",
    ],
  },
  prevent: {
    title: "예방 관리",
    items: [
      "노후 배관·이음부 정기 점검",
      "방수층·실리콘 상태 주기 확인",
      "수도 계량기 미사용 시 회전 확인",
      "이상 징후 시 조기 점검",
    ],
  },
  check: {
    title: "점검 항목",
    items: [
      "누수 흔적·곰팡이·얼룩 위치 확인",
      "수도 계량기 회전 여부 확인",
      "윗집·아래층·공용배관 연관성 확인",
      "탐지 후 누수 위치 특정 여부",
    ],
  },
  prebook: {
    title: "예약 전 확인 체크리스트",
    items: [
      "누수 발생 위치·증상 정리",
      "탐지 가능 시간대 협의",
      "탐지 범위·장비 사전 확인",
      "탐지 결과·기록 제공 여부",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
export const LEAKDETECT_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 누수탐지 범위 안내" },
  { slot: "info", alt: "누수 탐지 절차 안내 자료" },
  { slot: "consult", alt: "누수탐지 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const LEAKDETECT_COMPARE = {
  compareWith: "아파트누수",
  compareWithText2: "직접 점검",
};

// BLOCK_MAP 격리용 — 인접 청소/설비 업종과 교차 오염 차단.
//   leakdetect는 '누수 원인·탐지·공사범위·보험' 정보만.
//   저수조청소(급수시설)·입주청소(실내)·인테리어(시공)와 구분.
export const LEAKDETECT_BLOCK_KEYWORDS = [
  "저수조청소", "물탱크청소", "입주청소", "이사청소", "인테리어", "줄눈시공", "탄성코트", "방역소독",
];
