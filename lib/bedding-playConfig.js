// lib/bedding-playConfig.js
// 이브자리 용인점 — 정보형 플로우 설계
// v9 §5 비율: 선택기준형 40 · 생활정보형 25 · 계절관리형 20 · 매장상담형 15 · 후기형 0
// 섹션 순서 고정(매뉴얼 PART3-2): 찾는이유→확인요소→소재/기능→사용환경→계절/생활→비교→마무리

// ── 콘텐츠 형태 비율 (후기형 0% 고정) ───────────────────────────
export const BEDDING_CONTENT_MIX = [
  { type: "선택기준형", ratio: 40, note: "가장 큰 축. 제목 A패턴(~선택 시 확인할 기준)" },
  { type: "생활정보형", ratio: 25, note: "관리·세탁·소재 정보. 제목 C패턴(~소재에 따라 달라지는 점)" },
  { type: "계절관리형", ratio: 20, note: "계절 교체·준비 시기. 냉감/여름이불/사계절" },
  { type: "매장상담형", ratio: 15, note: "맞춤베개·혼수 상담 전 확인사항. 방문 안내까지만" },
  { type: "후기형",     ratio: 0,  note: "절대 0. 후기/체험/구매 표현 차단" },
];

// ── FLOW_ENGINE 7섹션 ───────────────────────────────────────────
export const BEDDING_FLOW = [
  { key: "intro",    label: "찾는 이유",        minLength: 180, role: "검색 상황·이 글의 목적 안내. 매장 화자 첫 문장 고정." },
  { key: "check",    label: "먼저 확인할 요소",  minLength: 320, role: "선택 기준 2~3가지. 선택기준형의 핵심." },
  { key: "material", label: "소재/기능",        minLength: 320, role: "소재·기능 차이 정보형 비교." },
  { key: "usage",    label: "사용환경",         minLength: 260, role: "환경별 적합 기준. 단정 금지." },
  { key: "season",   label: "계절/생활패턴",     minLength: 260, role: "교체 시점·관리 주기·세탁 정보." },
  { key: "compare",  label: "비교 확인요소",     minLength: 240, role: "인접 선택지 차이. 순위/평가 금지." },
  { key: "outro",    label: "마무리",           minLength: 160, role: "매장 방문 안내. 구매 유도 금지." },
];

// 형태별 섹션 강조 가중치 (생성기에서 비율 배분에 참고)
export const BEDDING_FORM_WEIGHTS = {
  선택기준형: { check: 1.4, compare: 1.2 },
  생활정보형: { material: 1.3, season: 1.3 },
  계절관리형: { season: 1.5, usage: 1.1 },
  매장상담형: { check: 1.1, outro: 1.4 },
};

// 카테고리 → 기본 콘텐츠 형태 매핑 (비율 자연 분배용)
export const BEDDING_CAT_FORM = {
  honsu: "선택기준형", newlywed: "선택기준형", yedan: "매장상담형",
  cooling: "계절관리형", summer: "계절관리형", goose: "생활정보형",
  allseason: "선택기준형", allergy: "생활정보형",
  funcpillow: "선택기준형", custompillow: "매장상담형",
  mattress: "선택기준형", topper: "생활정보형",
};

export const BEDDING_MIN_TOTAL = 1800;
// [fix v16-B] 밀도형 목표 범위. 권장 2500~3200자. MAX 초과 시 비대화 경고(강제 절단 아님).
export const BEDDING_TARGET_MIN = 2500;
export const BEDDING_TARGET_MAX = 3200;

export default BEDDING_FLOW;
