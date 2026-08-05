import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/pestcontrol.js";
// lib/pestcontrol-data.js
// 방역(pestcontrol) 업종 데이터셋 — v1 / 정보형 + 서비스범위 설명형
// 화자 = {region} 방역 업체. 정보형(범위·해충종류·진행순서·관리방법). 후기·체험·과장광고 금지.
// 복제 베이스: cleaning-data.js (cat 구성 + titlePatterns data.js 소유)
// industry='pestcontrol' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 후기형 경쟁 진입 금지 → 정보형 + 서비스범위 설명형으로 차별화.
//   - 관련도 노출 축 = 방역 범위 / 해충 종류 / 진행 순서 / 관리방법.
//   - 출장·현장방문 업종 → useApt=false (APT 미사용, 고정 사업장 위치블록 미노출).
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고.
//   허용 = 방역 범위 / 해충 종류 / 진행 순서 / 관리방법 / 예방 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const PESTCONTROL_META = {
  industry: "pestcontrol",
  label: "방역",
  fullLabel: "방역 안내",
  greeting: "안녕하세요. {region} 방역 업체입니다.",
  voice: "{region} 방역 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const PESTCONTROL_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박", "박멸 보장",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  // 후기·체험담·고객사례
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
// [세션55] 평면 나열 전환 — 4그룹(공간방역/해충퇴치/해충방역/관리방법)에 8메뉴가 묶여
//   발행비율설정 화면에 소분류 헤더가 노출됐다. cleaning·systemair 등 타 업종은
//   "메뉴 1개 = cat 1개"(8메뉴=8cat) 구조라 헤더가 사실상 평면으로 보인다. 동형으로 통일.
export const PESTCONTROL_CATS = [
  "가정집 방역",
  "원룸 방역",
  "상가 방역",
  "음식점 방역",
  "바퀴벌레 퇴치",
  "개미 퇴치",
  "해충 방역",
  "방역 관리방법",
];

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·결과보장·추천 배제.
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 공간 방역 (가정집·원룸·상가·음식점)
const TP_SPACE = (kase) => [
  `{region} ${kase} 전 확인사항`,
  `{region} ${kase} 진행 순서 안내`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 체크리스트`,
  `{region} ${kase} 알아둘 점`,
];

// 해충 퇴치 (바퀴벌레·개미)
const TP_PEST = (kase) => [
  `{region} ${kase} 전 확인사항`,
  `{region} ${kase} 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 예방 방법`,
];

// 해충 방역 (통합)
const TP_INSECT = (kase) => [
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 예방 체크리스트`,
  `{region} ${kase} 전 확인할 점`,
];

// 관리방법 (예방·관리형)
const TP_MANAGE = (kase) => [
  `{region} ${kase} 정리`,
  `{region} ${kase} 안내`,
  `${kase} 알아두면 좋은 점`,
  `${kase} 쉽게 이해하기`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 범위·해충종류·진행순서·예방확인·체크리스트
//   weight 합계 100.
// ─────────────────────────────────────────────────────────────
export const PESTCONTROL_TREATMENTS = [
  // ── 공간방역 ──────────────────────────────────
  {
    id: "pc_home", industry: "pestcontrol", name: "가정집 방역", cat: "가정집 방역", emoji: "🏠",
    titlePatterns: TP_SPACE("가정집 방역"),
    keywords: ["가정집 방역", "가정 방역 범위", "가정 방역 순서", "주거 방역"],
    analysisAxis: ["방역 범위", "주요 해충 종류", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "원룸 방역", rank: 1, recommendedWeight: 16,
  },
  {
    id: "pc_oneroom", industry: "pestcontrol", name: "원룸 방역", cat: "원룸 방역", emoji: "🛏️",
    titlePatterns: TP_SPACE("원룸 방역"),
    keywords: ["원룸 방역", "원룸 해충", "소형 공간 방역", "자취방 방역"],
    analysisAxis: ["방역 범위", "주요 해충 종류", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "가정집 방역", rank: 1, recommendedWeight: 12,
  },
  {
    id: "pc_store", industry: "pestcontrol", name: "상가 방역", cat: "상가 방역", emoji: "🏬",
    titlePatterns: TP_SPACE("상가 방역"),
    keywords: ["상가 방역", "매장 방역", "사무실 방역", "상업공간 방역"],
    analysisAxis: ["방역 범위", "주요 해충 종류", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "음식점 방역", rank: 1, recommendedWeight: 12,
  },
  {
    id: "pc_restaurant", industry: "pestcontrol", name: "음식점 방역", cat: "음식점 방역", emoji: "🍴",
    titlePatterns: TP_SPACE("음식점 방역"),
    keywords: ["음식점 방역", "식당 방역", "주방 방역", "위생 방역"],
    analysisAxis: ["방역 범위", "주요 해충 종류", "진행 순서", "위생 관리", "체크포인트"],
    useApt: false, compareWith: "상가 방역", rank: 1, recommendedWeight: 14,
  },

  // ── 해충퇴치 ──────────────────────────────────
  {
    id: "pc_roach", industry: "pestcontrol", name: "바퀴벌레 퇴치", cat: "바퀴벌레 퇴치", emoji: "🪳",
    titlePatterns: TP_PEST("바퀴벌레 퇴치"),
    keywords: ["바퀴벌레 퇴치", "바퀴벌레 방역", "바퀴벌레 예방", "바퀴벌레 원인"],
    analysisAxis: ["발생 원인", "방역 범위", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "개미 퇴치", rank: 1, recommendedWeight: 14,
  },
  {
    id: "pc_ant", industry: "pestcontrol", name: "개미 퇴치", cat: "개미 퇴치", emoji: "🐜",
    titlePatterns: TP_PEST("개미 퇴치"),
    keywords: ["개미 퇴치", "개미 방역", "개미 예방", "개미 원인"],
    analysisAxis: ["발생 원인", "방역 범위", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "바퀴벌레 퇴치", rank: 2, recommendedWeight: 10,
  },

  // ── 해충방역 ──────────────────────────────────
  {
    id: "pc_insect", industry: "pestcontrol", name: "해충 방역", cat: "해충 방역", emoji: "🦟",
    titlePatterns: TP_INSECT("해충 방역"),
    keywords: ["해충 방역", "종합 방역", "해충 종류", "해충 예방"],
    analysisAxis: ["주요 해충 종류", "방역 범위", "진행 순서", "예방 관리", "체크포인트"],
    useApt: false, compareWith: "방역 관리방법", rank: 1, recommendedWeight: 12,
  },

  // ── 관리방법 ──────────────────────────────────
  {
    id: "pc_manage", industry: "pestcontrol", name: "방역 관리방법", cat: "방역 관리방법", emoji: "✅",
    titlePatterns: TP_MANAGE("방역 관리방법"),
    keywords: ["방역 관리방법", "해충 예방법", "방역 후 관리", "재발 방지"],
    analysisAxis: ["예방 관리", "재발 방지", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "해충 방역", rank: 1, recommendedWeight: 10,
  },
];

// 정보블럭 데이터 — generatePestcontrol.js insertInfoBlock에서 소비
//   ★ 해충 종류·절차 등 시점 무관 구조 정보만.
export const PESTCONTROL_INFO_BLOCKS = {
  roach: {
    title: "바퀴벌레 주요 발생 원인",
    items: [
      "주방 음식물·기름때 잔류",
      "배수구·하수구 틈새 유입",
      "습기·온기가 있는 좁은 공간",
      "※ 발생 환경에 따라 방역 범위는 달라질 수 있음",
    ],
  },
  ant: {
    title: "개미 발생·유입 경로",
    items: [
      "음식물·단 음식 잔류물",
      "창틀·문틈·벽 균열 유입",
      "화분·베란다 등 외부 연결부",
      "이동 경로 차단이 우선",
    ],
  },
  rat: {
    title: "쥐 유입·서식 점검 포인트",
    items: [
      "배관·하수구·환기구 틈새",
      "창고·천장 등 어두운 공간",
      "음식물·쓰레기 보관 상태",
      "유입 차단(틈새 메움) 안내",
    ],
  },
  bedbug: {
    title: "빈대 주요 점검 포인트",
    items: [
      "침대 매트리스·프레임 틈새",
      "소파·커튼 등 직물류",
      "콘센트·벽지 틈새",
      "고온 처리·약제 처리 병행 안내",
    ],
  },
  drainfly: {
    title: "나방파리 발생 환경",
    items: [
      "배수구·하수구 슬러지",
      "습한 욕실·주방 바닥",
      "정체된 물·배관 내부",
      "배수구 청소·건조가 기본",
    ],
  },
  centipede: {
    title: "돈벌레(그리마) 발생 환경",
    items: [
      "습기 많은 욕실·다용도실",
      "어둡고 좁은 틈새 공간",
      "다른 해충(먹이) 존재 여부",
      "습도 관리가 예방의 핵심",
    ],
  },
  mosquito: {
    title: "모기 발생·유입 환경",
    items: [
      "정체된 물(화분 받침·배수구)",
      "방충망 손상·틈새",
      "어둡고 습한 실내 구석",
      "고인 물 제거가 우선",
    ],
  },
  prevent: {
    title: "해충 예방 체크리스트",
    items: [
      "음식물·쓰레기 밀폐 보관",
      "배수구·하수구 정기 청소",
      "창틀·문틈·균열 점검 및 차단",
      "습도 관리(욕실·주방 환기)",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60] lib/spine/scenes/pestcontrol.js 로 이관.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회 로직은 lib/spine/sceneSpine.js 단일 엔진. 아래는 기존 import 하위호환 shim.
//   ★ 신규 코드는 sceneSpine.js 의 resolveScene(industry, cat) 을 직접 쓴다.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("pestcontrol");
export const PESTCONTROL_SCENE_SPINE = SCENE_TABLE;

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
export const PESTCONTROL_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 방역 서비스 범위 안내" },
  { slot: "pest", alt: "주요 해충 종류 안내 자료" },
  { slot: "order", alt: "방역 진행 순서 안내" },
  { slot: "manage", alt: "방역 관리방법 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const PESTCONTROL_COMPARE = {
  compareWith: "해충 방역",
  compareWithText2: "직접 방역",
};

// BLOCK_MAP 격리용 — 청소/방충망/시공 등 파생업종과 교차 오염 차단.
export const PESTCONTROL_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "줄눈시공", "탄성코트", "인테리어공사", "방충망설치", "에어컨청소",
];
