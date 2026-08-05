import { createSceneResolver } from "./spine/sceneSpine.js";
import { SCENES as SCENE_TABLE } from "./spine/scenes/buildingclean.js";
// lib/buildingclean-data.js
// 건물청소(buildingclean) 업종 데이터셋 — v1 / 정보형 + 건물 유지관리 안내형
// 화자 = {region} 건물청소 업체. 정보형(범위·절차·정기관리·체크리스트). 후기·체험·과장광고 금지.
// 복제 베이스: cleaning-data.js 70% + pestcontrol-data.js 20% + moving 10%
//   - cleaning: cat 구성 + titlePatterns data.js 소유 구조
//   - pestcontrol: 출장업종 useApt=false (APT 미사용, 고정 사업장 위치블록 미노출)
// industry='buildingclean' 고정. 메뉴 8개.
//
// 설계 핵심:
//   - 아파트 입주 중심 아님 → 건물 유지관리 중심(상가·사무실·병원·학원·원룸건물·오피스텔·빌딩).
//   - APT_DATA 사용 금지(useApt=false 전메뉴).
//   - 관련도 노출 축 = 청소 범위 / 작업 절차 / 정기관리 / 건물 유형별 관리 / 체크리스트.
//
// ★ 절대 금지(정보형 고정): 후기·체험담·내돈내산·고객사례·만족도·추천·과장광고·비용 유도.
//   허용 = 청소 범위 / 작업 절차 / 정기관리 필요성 / 청소 주기 / 건물 유형별 관리 / 체크리스트.
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// ★ 반복 강조 요소: 공용부·계단·출입구·복도·화장실 관리 / 정기 점검 / 건물 이미지 관리.

export const BUILDINGCLEAN_META = {
  industry: "buildingclean",
  label: "건물청소",
  fullLabel: "건물청소 안내",
  greeting: "안녕하세요. {region} 건물청소 업체입니다.",
  voice: "{region} 건물청소 업체",
  badge: "신규",
  decisionCycle: "compare",
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const BUILDINGCLEAN_FORBIDDEN = [
  // 과장·광고
  "최저가", "무조건", "업계 최고", "1등 업체", "1위", "최고",
  "100% 만족", "완벽", "역대급", "초대박", "대박",
  // 보장·추천 (정보형 고정)
  "보장", "추천드립니다", "강력 추천", "추천 업체", "강추",
  // 후기·체험담·고객사례
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "고객 사례", "만족도",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 8개)
// [세션55] 평면 나열 전환 — "공간별청소" 1그룹에 3메뉴가 묶여 발행비율설정 화면에
//   소분류 헤더가 노출됐다. cleaning·systemair 등 타 업종은 "메뉴 1개 = cat 1개"
//   (8메뉴=8cat) 구조라 헤더가 사실상 평면으로 보인다. 동형으로 통일.
export const BUILDINGCLEAN_CATS = [
  "건물청소",
  "사무실청소",
  "상가청소",
  "계단청소",
  "정기청소",
  "준공청소",
  "외벽청소",
  "건물관리 체크리스트",
];

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} 치환. 후기형·결과보장·추천 배제. (APT 미사용)
//   메뉴(cat)별 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 건물청소 (종합)
const TP_BUILDING = (kase) => [
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 체크리스트`,
  `{region} ${kase} 전 확인사항`,
];

// 공간별 청소 (사무실·상가·계단)
const TP_SPACE = (kase) => [
  `{region} ${kase} 체크포인트`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 준비사항`,
];

// 정기청소 (주기·관리형)
const TP_PERIODIC = (kase) => [
  `{region} ${kase} 체크리스트`,
  `{region} ${kase} 주기 안내`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 필요성 정리`,
];

// 준공청소 (입주 전 마감)
const TP_FINISH = (kase) => [
  `{region} ${kase} 진행순서`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 전 확인사항`,
  `{region} ${kase} 체크리스트`,
];

// 외벽청소 (고소·유리)
const TP_EXTERIOR = (kase) => [
  `{region} ${kase} 확인사항`,
  `{region} ${kase} 진행 순서`,
  `{region} ${kase} 범위 안내`,
  `{region} ${kase} 관리방법`,
];

// 건물관리 (점검·체크형)
const TP_MANAGE = (kase) => [
  `{region} ${kase} 점검항목`,
  `{region} ${kase} 정리`,
  `${kase} 알아두면 좋은 점`,
  `${kase} 쉽게 이해하기`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 8개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축: 범위·절차·정기관리·건물유형·체크리스트
//   weight 합계 100. 정기청소·계단청소·사무실청소 비중 우선.
// ─────────────────────────────────────────────────────────────
export const BUILDINGCLEAN_TREATMENTS = [
  // ── 건물청소 ──────────────────────────────────
  {
    id: "bc_building", industry: "buildingclean", name: "건물청소", cat: "건물청소", emoji: "🏢",
    titlePatterns: TP_BUILDING("건물청소"),
    keywords: ["건물청소", "건물 청소 범위", "건물 유지관리", "건물 위생관리"],
    analysisAxis: ["청소 범위", "작업 절차", "공용부 관리", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "정기청소", rank: 1, recommendedWeight: 12,
  },

  // ── 공간별청소 ────────────────────────────────
  {
    id: "bc_office", industry: "buildingclean", name: "사무실청소", cat: "사무실청소", emoji: "🏬",
    titlePatterns: TP_SPACE("사무실청소"),
    keywords: ["사무실청소", "오피스 청소", "사무공간 위생관리", "사무실 정기청소"],
    analysisAxis: ["청소 범위", "작업 절차", "복도·출입구 관리", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "상가청소", rank: 1, recommendedWeight: 16,
  },
  {
    id: "bc_store", industry: "buildingclean", name: "상가청소", cat: "상가청소", emoji: "🛍️",
    titlePatterns: TP_SPACE("상가청소"),
    keywords: ["상가청소", "매장 청소", "상업공간 위생관리", "상가 정기청소"],
    analysisAxis: ["청소 범위", "작업 절차", "출입구·화장실 관리", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "사무실청소", rank: 2, recommendedWeight: 12,
  },
  {
    id: "bc_stairs", industry: "buildingclean", name: "계단청소", cat: "계단청소", emoji: "🪜",
    titlePatterns: TP_SPACE("계단청소"),
    keywords: ["계단청소", "공용부 청소", "복도 청소", "건물 계단 관리"],
    analysisAxis: ["청소 범위", "계단·복도 관리", "작업 절차", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "정기청소", rank: 1, recommendedWeight: 16,
  },

  // ── 정기청소 ──────────────────────────────────
  {
    id: "bc_periodic", industry: "buildingclean", name: "정기청소", cat: "정기청소", emoji: "🔁",
    titlePatterns: TP_PERIODIC("정기청소"),
    keywords: ["정기청소", "건물 정기관리", "청소 주기", "공용부 정기청소"],
    analysisAxis: ["정기관리 필요성", "청소 주기", "공용부 관리", "정기 점검", "체크포인트"],
    useApt: false, compareWith: "건물청소", rank: 1, recommendedWeight: 16,
  },

  // ── 준공청소 ──────────────────────────────────
  {
    id: "bc_finish", industry: "buildingclean", name: "준공청소", cat: "준공청소", emoji: "🧱",
    titlePatterns: TP_FINISH("준공청소"),
    keywords: ["준공청소", "입주 전 청소", "건축 마감 청소", "분진 제거"],
    analysisAxis: ["청소 범위", "작업 절차", "분진·잔재 제거", "마감 점검", "체크포인트"],
    useApt: false, compareWith: "건물청소", rank: 2, recommendedWeight: 8,
  },

  // ── 외벽청소 ──────────────────────────────────
  {
    id: "bc_exterior", industry: "buildingclean", name: "외벽청소", cat: "외벽청소", emoji: "🧗",
    titlePatterns: TP_EXTERIOR("외벽청소"),
    keywords: ["외벽청소", "유리창 청소", "건물 외관 관리", "고소 청소"],
    analysisAxis: ["청소 범위", "작업 절차", "건물 이미지 관리", "안전 확인", "체크포인트"],
    useApt: false, compareWith: "건물청소", rank: 2, recommendedWeight: 8,
  },

  // ── 건물관리 ──────────────────────────────────
  {
    id: "bc_manage", industry: "buildingclean", name: "건물관리 체크리스트", cat: "건물관리 체크리스트", emoji: "✅",
    titlePatterns: TP_MANAGE("건물관리"),
    keywords: ["건물관리 체크리스트", "건물 점검항목", "공용부 점검", "건물 위생 점검"],
    analysisAxis: ["정기 점검", "공용부 관리", "건물 이미지 관리", "체크포인트"],
    useApt: false, compareWith: "정기청소", rank: 1, recommendedWeight: 12,
  },
];

// 정보블럭 데이터 — generateBuildingclean.js insertInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만. (8종)
export const BUILDINGCLEAN_INFO_BLOCKS = {
  scope: {
    title: "건물청소 범위 안내",
    items: [
      "공용부(로비·복도·계단·출입구)",
      "화장실·세면대·공용 급탕실",
      "유리창·엘리베이터 내부",
      "※ 건물 유형·규모에 따라 범위는 달라질 수 있음",
    ],
  },
  process: {
    title: "작업 절차 안내",
    items: [
      "사전 점검 → 구역별 작업 계획",
      "공용부·바닥 청소 → 화장실·출입구",
      "유리·외부 정리 → 마감 점검",
      "정기 일정 시 동일 절차 반복 점검",
    ],
  },
  periodic: {
    title: "정기관리 필요성",
    items: [
      "공용부는 이용 빈도가 높아 오염이 빠름",
      "정기 관리로 건물 이미지·위생 유지",
      "누적 오염·곰팡이 사전 예방",
      "출입구·계단 안전(미끄럼·이물) 관리",
    ],
  },
  cycle: {
    title: "청소 주기 안내",
    items: [
      "일상관리(출입구·로비): 주 단위 점검 권장",
      "공용 화장실: 사용 빈도에 따라 조정",
      "유리·외벽: 계절·환경에 따라 주기 조정",
      "※ 주기는 건물 유형·이용량에 따라 달라짐",
    ],
  },
  bytype: {
    title: "건물 유형별 관리",
    items: [
      "사무실·오피스텔: 복도·공용 라운지 관리",
      "상가·병원·학원: 출입구·화장실 위생 비중↑",
      "원룸건물: 계단·우편함·분리수거 구역",
      "빌딩: 로비·엘리베이터·외벽 이미지 관리",
    ],
  },
  season: {
    title: "계절별 관리 포인트",
    items: [
      "봄·가을: 황사·낙엽 등 외부 유입 관리",
      "여름: 습기·곰팡이·화장실 위생 비중↑",
      "겨울: 출입구 결빙·미끄럼·제설 동선",
      "환절기: 환기·먼지 관리 점검",
    ],
  },
  prebook: {
    title: "예약 전 확인사항",
    items: [
      "청소 범위(공용부/내부) 사전 확인",
      "정기/일회성 여부와 주기 협의",
      "작업 시간대(영업·근무 외 시간) 조정",
      "외벽·고소 작업 시 안전 조건 확인",
    ],
  },
  checkend: {
    title: "마무리 점검사항",
    items: [
      "공용부·출입구 마감 상태 확인",
      "화장실·복도 이물·물기 점검",
      "유리·엘리베이터 자국 점검",
      "정기관리 시 다음 점검 일정 안내",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// [세션59 V4] cat 전용 INFO_BLOCKS — 공통 블록(로비·복도·화장실)이 외벽청소 글에
//   삽입되면서 몰입이 깨지는 문제. cat별 override만 정의하고, 미정의 cat은 공통 사용.
//   ★ 여기 없는 cat은 기존 BUILDINGCLEAN_INFO_BLOCKS 그대로 (무영향).
// ─────────────────────────────────────────────────────────────
export const BUILDINGCLEAN_CAT_INFO_BLOCKS = {
  외벽청소: {
    scope: {
      title: "외벽청소 범위 안내",
      items: [
        "외벽면(석재·타일·드라이비트·복합패널)",
        "유리 외벽·창호 프레임·실리콘 마감부",
        "간판 주변·환기구·배관 주변 오염부",
        "※ 마감재와 층수에 따라 범위는 달라질 수 있음",
      ],
    },
    process: {
      title: "외벽청소 작업 절차 안내",
      items: [
        "오염 유형 확인(빗물 자국·녹조·매연·백화)",
        "마감재 확인 → 세척 방식·수압 결정",
        "공법 선택(로프 하강 / 고소작업차 / 곤돌라)",
        "상층부 → 하층부 순차 세척 → 지상 정리",
      ],
    },
    cycle: {
      title: "외벽청소 주기 안내",
      items: [
        "일반 건물: 연 1회 전면 세척 기준으로 검토",
        "간선도로·공사장 인접: 매연·분진 누적 빠름",
        "북측·저층부: 녹조·이끼 발생 구간 별도 점검",
        "※ 주기는 입지·마감재·오염도에 따라 달라짐",
      ],
    },
    prebook: {
      title: "외벽청소 전 확인사항",
      items: [
        "층수·외벽 마감재·고정점 설치 가능 여부",
        "작업일 창문 폐쇄·간판 보호 범위 협의",
        "주차 차량 이동·지상 통제 구간 확보",
        "강풍·강우 시 작업 연기 기준 사전 협의",
      ],
    },
    checkend: {
      title: "외벽청소 마무리 점검사항",
      items: [
        "유리면 물자국·세정제 잔여 확인",
        "실리콘·창호 프레임 손상 여부 확인",
        "지상 물기·낙하물 정리 상태 확인",
        "제거되지 않은 오염 구간 별도 안내",
      ],
    },
  },
};

// cat 전용 블록이 있으면 공통 블록 위에 덮어씌운다. 미정의 cat은 공통 그대로.
export function getInfoBlocks(cat) {
  const over = BUILDINGCLEAN_CAT_INFO_BLOCKS[cat];
  return over ? { ...BUILDINGCLEAN_INFO_BLOCKS, ...over } : BUILDINGCLEAN_INFO_BLOCKS;
}

// ─────────────────────────────────────────────────────────────
// SCENE_SPINE — [세션60] lib/spine/scenes/buildingclean.js 로 이관.
//   Data 계층은 TREATMENTS / META / CATS / titlePatterns 만 보유(Data FREEZE 정합).
//   조회 로직은 lib/spine/sceneSpine.js 단일 엔진. 아래는 기존 import 하위호환 shim.
//   ★ 신규 코드는 sceneSpine.js 의 resolveScene(industry, cat) 을 직접 쓴다.
// ─────────────────────────────────────────────────────────────
export const getSceneSpine = createSceneResolver("buildingclean");
export const BUILDINGCLEAN_SCENE_SPINE = SCENE_TABLE;

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출·후기 금지)
export const BUILDINGCLEAN_PHOTO_POOL = [
  { slot: "scope", alt: "{region} 건물청소 범위 안내" },
  { slot: "process", alt: "건물청소 작업 절차 안내" },
  { slot: "periodic", alt: "건물 정기관리 안내" },
  { slot: "manage", alt: "건물관리 체크리스트 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const BUILDINGCLEAN_COMPARE = {
  compareWith: "정기청소",
  compareWithText2: "자체 관리",
};

// BLOCK_MAP 격리용 — 입주청소·방역·방충망 등 파생업종과 교차 오염 차단.
//   buildingclean은 '건물 유지관리' 범위·절차·정기관리 정보만.
//   ★ APT 입주청소(cleaning)·방역(pestcontrol)·이사(moving)와 분리.
export const BUILDINGCLEAN_BLOCK_KEYWORDS = [
  "입주청소", "이사청소", "새집증후군", "포장이사", "줄눈시공",
  "탄성코트", "방충망설치", "바퀴벌레", "해충방역", "에어컨분해청소",
];
