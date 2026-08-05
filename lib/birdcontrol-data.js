// lib/birdcontrol-data.js
// 비둘기퇴치(birdcontrol) 업종 데이터셋 — v1 / 정보형 + 차단·예방 안내형
// 화자 = {region} 비둘기퇴치 업체. 정보형(범위·원인·차단방법·관리체크리스트). 후기·체험·과장광고 금지.
// 복제 베이스: pestcontrol-data.js 50% + buildingclean-data.js 30% + screen 20%
//   - pestcontrol: 출장업종 useApt=false / 발생원인·진행순서·예방관리 축
//   - buildingclean: 건물·상가 유지관리 cat 구성 / titlePatterns data.js 소유
// industry='birdcontrol' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 차단·예방 설명형으로 차별화.
//   - 관련도 노출 축 = 차단 범위 / 발생 원인(귀소본능) / 차단 방법(망·스파이크) / 관리 체크리스트.
//   - 출장·현장방문 업종 → useApt=false (APT 미사용, 고정 사업장 위치블록 미노출).
//   - 관측 반영: 실외기실·비둘기퇴치망·비둘기똥(배설물)·버드스파이크 비중 강화. 버드와이어 제외.
//
// ★ 절대 금지(정보형 고정): 후기·시공일지·체험담·내돈내산·고객사례·추천·과장광고.
//   포획·독극물·살처분·불법퇴치·천적이용·민원유도·행정처분 내용 전면 제외.
//   허용 = 차단 범위 / 발생 원인 / 차단 방법 / 위생 관리 / 재유입 예방 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const BIRDCONTROL_META = {
  industry: "birdcontrol",
  label: "비둘기퇴치",
  fullLabel: "비둘기퇴치 안내",
  greeting: "안녕하세요. {region} 비둘기퇴치 업체입니다.",
  voice: "{region} 비둘기퇴치 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const BIRDCONTROL_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "박멸 보장", "완전 퇴치",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  // 후기·체험담·고객사례·시공일지
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도", "시공일지", "작업일지",
  // 제외 항목 (포획·독극물·살처분·불법·천적·민원·행정)
  "포획", "독극물", "살처분", "천적", "민원", "행정처분",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
// [세션55] 평면 나열 전환 — 5그룹에 8메뉴가 묶여 발행비율설정 화면에 소분류 헤더가
//   노출됐다. cleaning·systemair 등 타 업종은 "메뉴 1개 = cat 1개"(8메뉴=8cat)
//   구조라 헤더가 사실상 평면으로 보인다. 동형으로 통일.
export const BIRDCONTROL_CATS = [
  "비둘기퇴치",
  "실외기실 비둘기퇴치",
  "베란다 비둘기퇴치",
  "비둘기퇴치망",
  "버드스파이크",
  "상가 비둘기퇴치",
  "건물 비둘기퇴치",
  "조류퇴치 체크리스트",
  // [v-menu 2026-07-27] 메뉴 확장 4종 — 옥상/둥지/배설물/소독. 엔진·프롬프트 무수정.
  "옥상 비둘기퇴치",
  "비둘기 둥지제거",
  "비둘기 배설물청소",
  "비둘기 소독",
];

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·결과보장·추천 배제. (APT 미사용)
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 비둘기퇴치 (종합)
const TP_BIRD = (kase) => [
  `{region} ${kase} 방법 알아보기`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 전 확인사항`,
  `{region} ${kase} 체크리스트`,
];

// 공간별 퇴치 (실외기실·베란다)
const TP_SPACE = (kase) => [
  `{region} ${kase} 문제 관리방법`,
  `{region} ${kase} 전 확인사항`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 예방 방법`,
];

// 차단시설 (망·스파이크)
const TP_FACILITY = (kase) => [
  `{region} ${kase} 설치 시 체크포인트`,
  `{region} ${kase} 설치 전 알아둘 점`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 관리방법`,
];

// 건물 퇴치 (상가·건물)
const TP_BUILDING = (kase) => [
  `{region} ${kase} 문제 관리방법`,
  `{region} ${kase} 유입 예방법`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
];

// 관리방법 (예방·체크형)
const TP_MANAGE = (kase) => [
  `{region} ${kase}`,
  `{region} ${kase} 정리`,
  `${kase} 알아두면 좋은 점`,
  `${kase} 쉽게 이해하기`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 차단범위·발생원인·차단방법·위생관리·체크리스트
//   weight 합계 100. 실외기실·차단망·버드스파이크 비중 우선(관측 반영).
// ─────────────────────────────────────────────────────────────
export const BIRDCONTROL_TREATMENTS = [
  // ── 비둘기퇴치 ────────────────────────────────
  {
    id: "bd_bird", industry: "birdcontrol", name: "비둘기퇴치", cat: "비둘기퇴치", emoji: "🕊️",
    infoKey: "cause",
    titlePatterns: TP_BIRD("비둘기퇴치"),
    keywords: ["비둘기퇴치", "비둘기 차단", "비둘기 유입 차단", "비둘기 예방"],
    analysisAxis: ["차단 범위", "발생 원인", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "조류퇴치 체크리스트", rank: 1, recommendedWeight: 12,
  },

  // ── 공간별퇴치 ────────────────────────────────
  {
    id: "bd_outdoor", industry: "birdcontrol", name: "실외기실 비둘기퇴치", cat: "실외기실 비둘기퇴치", emoji: "🌀",
    infoKey: "outdoor",
    titlePatterns: TP_SPACE("실외기실 비둘기"),
    keywords: ["실외기실 비둘기퇴치", "실외기실 비둘기", "에어컨 실외기 비둘기", "실외기 부식"],
    analysisAxis: ["발생 원인", "차단 범위", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "베란다 비둘기퇴치", rank: 1, recommendedWeight: 14,
  },
  {
    id: "bd_veranda", industry: "birdcontrol", name: "베란다 비둘기퇴치", cat: "베란다 비둘기퇴치", emoji: "🪟",
    infoKey: "cause",
    titlePatterns: TP_SPACE("베란다 비둘기"),
    keywords: ["베란다 비둘기퇴치", "베란다 비둘기", "발코니 비둘기", "베란다 배설물"],
    analysisAxis: ["발생 원인", "차단 범위", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "실외기실 비둘기퇴치", rank: 1, recommendedWeight: 10,
  },

  // ── 차단시설 ──────────────────────────────────
  {
    id: "bd_net", industry: "birdcontrol", name: "비둘기퇴치망", cat: "비둘기퇴치망", emoji: "🕸️",
    infoKey: "net",
    titlePatterns: TP_FACILITY("비둘기퇴치망"),
    keywords: ["비둘기퇴치망", "비둘기 차단망", "조류 차단망", "방조망"],
    analysisAxis: ["차단 범위", "차단 방법", "설치 전 확인", "재유입 예방", "체크포인트"],
    useApt: false, compareWith: "버드스파이크", rank: 1, recommendedWeight: 14,
  },
  {
    id: "bd_spike", industry: "birdcontrol", name: "버드스파이크", cat: "버드스파이크", emoji: "📍",
    infoKey: "spike",
    titlePatterns: TP_FACILITY("버드스파이크"),
    keywords: ["버드스파이크", "조류 스파이크", "비둘기 스파이크", "착지 방지"],
    analysisAxis: ["차단 방법", "차단 범위", "설치 전 확인", "재유입 예방", "체크포인트"],
    useApt: false, compareWith: "비둘기퇴치망", rank: 1, recommendedWeight: 10,
  },

  // ── 건물퇴치 ──────────────────────────────────
  {
    id: "bd_store", industry: "birdcontrol", name: "상가 비둘기퇴치", cat: "상가 비둘기퇴치", emoji: "🏬",
    infoKey: "dropping",
    titlePatterns: TP_BUILDING("상가 비둘기"),
    keywords: ["상가 비둘기퇴치", "매장 비둘기", "간판 비둘기", "상가 배설물"],
    analysisAxis: ["발생 원인", "차단 범위", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "건물 비둘기퇴치", rank: 2, recommendedWeight: 6,
  },
  {
    id: "bd_building", industry: "birdcontrol", name: "건물 비둘기퇴치", cat: "건물 비둘기퇴치", emoji: "🏢",
    infoKey: "dropping",
    titlePatterns: TP_BUILDING("건물 비둘기"),
    keywords: ["건물 비둘기퇴치", "건물 비둘기 유입", "옥상 비둘기", "건물 배설물"],
    analysisAxis: ["발생 원인", "차단 범위", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "상가 비둘기퇴치", rank: 2, recommendedWeight: 6,
  },

  // ── 관리방법 ──────────────────────────────────
  {
    id: "bd_manage", industry: "birdcontrol", name: "조류퇴치 체크리스트", cat: "조류퇴치 체크리스트", emoji: "✅",
    infoKey: "checklist",
    titlePatterns: TP_MANAGE("조류퇴치 체크리스트"),
    keywords: ["조류퇴치 체크리스트", "비둘기 예방 점검", "재유입 예방", "비둘기 관리방법"],
    analysisAxis: ["재유입 예방", "위생 관리", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "비둘기퇴치", rank: 1, recommendedWeight: 10,
  },

  // ══ [v-menu 2026-07-27] 메뉴 확장 4종 ═══════════════════════
  //   엔진·프롬프트·SCENE 무수정. infoKey 지정으로 데드블록(recurrence·hygiene) 가동.
  {
    id: "bd_roof", industry: "birdcontrol", name: "옥상 비둘기퇴치", cat: "옥상 비둘기퇴치", emoji: "🏗️",
    infoKey: "cause",
    titlePatterns: TP_SPACE("옥상 비둘기"),
    keywords: ["옥상 비둘기퇴치", "옥상 비둘기", "옥상 배설물", "옥상 조류 차단"],
    analysisAxis: ["발생 원인", "차단 범위", "차단 방법", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "건물 비둘기퇴치", rank: 2, recommendedWeight: 6,
  },
  {
    id: "bd_nest", industry: "birdcontrol", name: "비둘기 둥지제거", cat: "비둘기 둥지제거", emoji: "🪹",
    infoKey: "recurrence",
    titlePatterns: TP_BIRD("비둘기 둥지제거"),
    keywords: ["비둘기 둥지제거", "비둘기 둥지", "둥지 재유입", "둥지 정리"],
    analysisAxis: ["재유입 예방", "발생 원인", "차단 범위", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "비둘기퇴치망", rank: 2, recommendedWeight: 5,
  },
  {
    id: "bd_clean", industry: "birdcontrol", name: "비둘기 배설물청소", cat: "비둘기 배설물청소", emoji: "🧹",
    infoKey: "dropping",
    titlePatterns: TP_BIRD("비둘기 배설물청소"),
    keywords: ["비둘기 배설물청소", "비둘기똥 청소", "배설물 제거", "실외기 배설물"],
    analysisAxis: ["위생 관리", "발생 원인", "차단 범위", "재유입 예방", "체크포인트"],
    useApt: false, compareWith: "비둘기 소독", rank: 2, recommendedWeight: 4,
  },
  {
    id: "bd_disinfect", industry: "birdcontrol", name: "비둘기 소독", cat: "비둘기 소독", emoji: "🧴",
    infoKey: "hygiene",
    titlePatterns: TP_MANAGE("비둘기 소독"),
    keywords: ["비둘기 소독", "조류 소독", "배설물 소독", "위생 소독"],
    analysisAxis: ["위생 관리", "재유입 예방", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "비둘기 배설물청소", rank: 2, recommendedWeight: 3,
  },
];

// 정보블럭 데이터 — generateBirdcontrol.js insertInfoBlock에서 소비
//   ★ 원인·절차·체크포인트 등 시점 무관 구조 정보만. (8종)
export const BIRDCONTROL_INFO_BLOCKS = {
  cause: {
    title: "비둘기 유입 주요 원인",
    items: [
      "귀소본능 — 한 번 자리 잡으면 같은 곳으로 반복 회귀",
      "실외기실·베란다 등 비바람 피하는 은신 공간",
      "먹이·물·둥지 재료가 가까운 환경",
      "※ 유입 원인에 따라 차단 범위는 달라질 수 있음",
    ],
  },
  dropping: {
    title: "배설물 문제 점검 포인트",
    items: [
      "배설물 누적 시 악취·위생 문제 발생",
      "산성 배설물로 실외기·금속 부식 진행",
      "병원성 세균·곰팡이 등 위생 위험",
      "차단 전 배설물 청소·소독 병행 안내",
    ],
  },
  outdoor: {
    title: "실외기실 비둘기 점검 포인트",
    items: [
      "실외기 상부·후면 틈새 둥지 여부",
      "배설물로 인한 실외기 부식·고장 위험",
      "환기·배수 통로 막힘 점검",
      "차단망 설치 전 내부 청소·소독 안내",
    ],
  },
  net: {
    title: "비둘기퇴치망 설치 전 확인사항",
    items: [
      "차단 범위(개구부·발코니·실외기실) 확인",
      "건물 구조·고정 지점 점검",
      "통풍·채광 영향 최소화 방식 확인",
      "정기 점검으로 망 손상·이탈 여부 관리",
    ],
  },
  spike: {
    title: "버드스파이크 설치 전 확인사항",
    items: [
      "비둘기가 착지·정착하는 난간·간판 상부 확인",
      "설치면 청소·고정 상태 점검",
      "주변 환경(배관·돌출부) 추가 차단 여부",
      "단독보다 차단망과 병행 시 효과 차이",
    ],
  },
  hygiene: {
    title: "위생 관리 포인트",
    items: [
      "배설물 제거 시 보호장비 착용 권장",
      "고압 세척·소독으로 2차 오염 예방",
      "환기·건조로 악취·세균 잔류 관리",
      "차단 후에도 주기적 위생 점검 필요",
    ],
  },
  recurrence: {
    title: "재유입 원인·예방",
    items: [
      "차단되지 않은 인접 개구부로 재유입",
      "차단망·스파이크 손상·이탈 방치",
      "주변 먹이·둥지 환경 미정리",
      "정기 점검으로 재유입 경로 사전 차단",
    ],
  },
  checklist: {
    title: "조류퇴치 관리 체크리스트",
    items: [
      "유입 경로(개구부·틈새) 사전 점검",
      "배설물 청소·소독 선행 여부",
      "차단 시설(망·스파이크) 고정·손상 점검",
      "정기 점검 일정으로 재유입 관리",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
export const BIRDCONTROL_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 비둘기퇴치 차단 범위 안내" },
  { slot: "cause", alt: "비둘기 유입 원인 안내 자료" },
  { slot: "facility", alt: "비둘기 차단 시설 안내" },
  { slot: "manage", alt: "조류퇴치 관리방법 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const BIRDCONTROL_COMPARE = {
  compareWith: "조류퇴치 체크리스트",
  compareWithText2: "자체 차단",
};

// BLOCK_MAP 격리용 — 방역·청소·방충망 등 파생업종과 교차 오염 차단.
//   birdcontrol은 '조류(비둘기) 차단·예방' 범위·원인·차단방법 정보만.
//   ★ 방역(pestcontrol)·건물청소(buildingclean)·방충망(screen)과 분리.
export const BIRDCONTROL_BLOCK_KEYWORDS = [
  "바퀴벌레", "해충방역", "쥐 퇴치", "입주청소", "에어컨청소",
  "방충망설치", "줄눈시공", "탄성코트", "포획", "살처분",
];
