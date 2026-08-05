// industry-tree.js — 업종 선택 UI의 유일한 Tree Source of Truth (SoT)
// ─────────────────────────────────────────────────────────────
// 역할: 업종 선택 "구조"만 담당한다 (그룹·표시명·표시순서·펼침·선택 id·enabled·status).
// 금지: 메뉴셋·SEARCHWORD·SPECIALTY 데이터·프롬프트 정보 (이는 *-data.js 소유).
//
// 관계:  catalog(보여줄까) → tree(어떻게 선택) → data(무엇 생성) → generate(어떻게 생성)
// 흐름:  tree → id 전달 → *-data SPECIALTY 조회 → generate
//
// 원칙:
//  1. id = 영구 키(Permanent Key). 표시명(name)은 변경 가능, id는 불변
//     (DB·URL·저장·발행기록 연결). 이름이 바뀌어도 id는 절대 바꾸지 않는다.
//  2. specialty에 group 중복 저장 금지 — 부모 group이 SoT.
//  3. 그룹은 배열 — 표시 순서 유지·drag/drop 정렬·map() 렌더.
//  4. type으로 렌더 분기: "group-specialty"(2단) / "menu"(1단) / "flat".
//
// catalog 연결: catalog 항목은 subItems 대신 hasTree 플래그만 둔다.
//   IndustryTree는 INDUSTRY_TREE[catalogItemId]?.items 로 조회해 2단 렌더.
//
// 호환성: 클릭 전달은 기존 "engineIndustry#specialty" 복합키 유지(내부 파싱 1:1).
//   Tree Spine은 그 위에 얹는다. 기존 저장·발행·URL 무손상.
//
// 확장: 업종 50+, SPECIALTY 300+ 대응. 신규 = 이 파일에 항목 추가만.

// group-specialty 타입 공통 헬퍼(전문점 항목 표준형)
const spec = (id, name, opts) => {
  opts = opts || {};
  return {
    id: id,
    name: name,
    specialty: opts.specialty || name,
    status: opts.status || "dev",
    enabled: opts.enabled === true,
  };
};

// ── restaurant 계열: engineIndustry="restaurant" 고정, specialty=id 해석 ──
// 각 key = catalog item id (Permanent Key). engineIndustry는 렌더 시 참조.
const RESTAURANT_GROUPS = {
  korean: {
    type: "group-specialty", engineIndustry: "restaurant", name: "한식",
    items: [
      spec("sundaeguk", "순대국"), spec("gukbap", "국밥"), spec("gamjatang", "감자탕"),
      spec("haejangguk", "해장국"), spec("samgyetang", "삼계탕"), spec("guksu", "국수"),
      spec("naengmyeon", "냉면"), spec("kalguksu", "칼국수"), spec("shabu", "샤브샤브"),
      spec("duck", "오리"), spec("eel", "장어"), spec("gopchang", "곱창·막창"),
      spec("jeon", "전"), spec("dakhanmari", "닭한마리"), spec("baeksuk", "백숙"),
      spec("boribap", "보리밥"), spec("cheonggukjang", "청국장"), spec("dubu", "두부"),
      spec("kongnamulgukbap", "콩나물국밥"), spec("yukgaejang", "육개장"), spec("chueotang", "추어탕"),
    ],
  },
  jokbal_bossam: {
    type: "group-specialty", engineIndustry: "restaurant", name: "족발·보쌈",
    items: [ spec("jokbal", "족발"), spec("bossam", "보쌈") ],
  },
  japanese: {
    type: "group-specialty", engineIndustry: "restaurant", name: "일식",
    items: [ spec("sushi", "초밥"), spec("donkatsu", "돈까스") ],
  },
  asian: {
    type: "group-specialty", engineIndustry: "restaurant", name: "아시안",
    items: [ spec("ricenoodle", "쌀국수"), spec("yangkkochi", "양꼬치") ],
  },
  seafood: {
    type: "group-specialty", engineIndustry: "restaurant", name: "해산물",
    items: [
      spec("crab", "대게·킹크랩"), spec("hoe", "횟집"), spec("agujjim", "아구찜"),
      spec("grilledfish", "생선구이"), spec("seafoodtang", "해물탕"), spec("daegutang", "대구탕"),
      spec("bokjip", "복집"), spec("shellfish", "조개구이"), spec("codari", "코다리"),
      spec("jjukkumi", "쭈꾸미"), spec("nakji", "낙지"), spec("mulhoe", "물회"),
      spec("muneo", "문어"), spec("gejang", "게장"), spec("dongtaetang", "동태탕"),
      spec("agutang", "아귀탕"), spec("maeuntang", "매운탕"),
    ],
  },
  jjim: {
    type: "group-specialty", engineIndustry: "restaurant", name: "찜·조림",
    items: [ spec("jjimdak", "찜닭") ],
  },
  grill: {
    type: "group-specialty", engineIndustry: "restaurant", name: "육류·구이",
    items: [
      spec("dakgalbi", "닭갈비"), spec("dakbokkeumtang", "닭볶음탕"),
      spec("galbi", "갈비"), spec("beef", "소고기"), spec("lamb", "양고기"),
      spec("dakbal", "닭발"),
    ],
  },
};

// ── 공통 Tree Spine — key = catalog item id (Permanent Key) ──
//   group-specialty : 2단(그룹 헤더 → 전문점). restaurant 계열.
//   menu            : 1단(catalog item 자체가 선택 대상). tree 항목 불필요 → 미등록.
//   신규 업종이 전문점 트리를 가질 때만 여기에 추가한다.
export const INDUSTRY_TREE = Object.assign({}, RESTAURANT_GROUPS);
// dental / legal / daycare 등 menu 타입은 tree 미등록(catalog item 직접 선택).
// 향후 3단 트리 필요 업종은 { type:"group-tree", groups:[...] } 형태로 확장.

// 조회 헬퍼 — catalog item id로 트리 노드를 얻는다(없으면 null = menu 타입).
export function getTreeNode(catalogItemId) {
  return INDUSTRY_TREE[catalogItemId] || null;
}

// ── [Spine 이관] tree 조회 헬퍼 — catalog item(it) 기준. index/IndustrySelector 공유 소비.
//   Tree(SoT) 우선, 없으면 catalog.subItems 폴백(호환). engineIndustry도 Tree 우선.
export const treeNodeOf = (it) => (it && INDUSTRY_TREE[it.id]) || null;
export const treeItemsOf = (it) => {
  const n = treeNodeOf(it);
  if (n && Array.isArray(n.items) && n.items.length) return n.items;
  return (Array.isArray(it.subItems) && it.subItems.length) ? it.subItems : [];
};
export const treeEngineOf = (it) => {
  const n = treeNodeOf(it);
  return (n && n.engineIndustry) || it.engineIndustry || "restaurant";
};

// ── [Spine 이관] 온보딩/업종 대분류 선택 구조 — IndustryPicker + industryPath(store) + index 본체 공유.
//   업종 선택 "구조" 데이터이므로 Tree SoT에 귀속. 각 모듈은 import 소비만.
export const ONBOARD_MED_PRIMARY = [
  { key: "dental",   label: "치과" },
  { key: "oriental", label: "한의원" },
  { key: "derma",    label: "피부과" },
  { key: "clinic",   label: "성형외과" },
  { key: "ortho",    label: "정형외과" },
  { key: "ent",      label: "이비인후과" },
  { key: "urology",  label: "비뇨기과" },
  { key: "radio",    label: "영상의학과" },   // [v2승격] 검사형 V2 PASS — 온보딩 노출
];
export const ONBOARD_MED_MORE = [
  // [v120] 미검증 의료 세부업종은 노출 보류(엔진은 존재, 발행검증 후 PRIMARY로 승격).
  //   안과·내과·소아청소년과·정신건강의학과·산부인과·신경외과·소화기내과·통증의학과·가정의학과 숨김.
];
export const ONBOARD_GENERAL = [
  // [v120] 분식점(맵꼬 테스트) 1종만. 카페는 숨김.
  { key: "restaurant", label: "분식점", badge: "테스트중" },
];
// [v142] 전문직 그룹 — 법무사 첫 노출. 변호사 추가 시 여기 한 줄.
export const ONBOARD_PROFESSIONAL = [
  { key: "legal", label: "법무사", badge: "신규" },
  { key: "lawyer", label: "변호사", badge: "신규" },
];
// [v10] 생활·유통 그룹 — 이브자리 침구(용인점 시범). 본사 검토 전 테스트 노출.
export const ONBOARD_LIFESTYLE = [
  { key: "bedding", label: "침구·이브자리", badge: "테스트중" },
  { key: "systemair", label: "시스템에어컨", badge: "신규" },
];

// [v71] 업종 1차 대분류(그룹) → 2차 세부업종. A안: 신규 등록 화면 전용 계층 선택.
//   1차 선택 → 2차 활성화 → 2차 선택 → (등록 버튼 직전 확인). 18키 ↔ 서버 INDUSTRY_KEYS 정합 유지.
//   업종 확장 시 여기 그룹만 추가하면 됨(예: beauty/clinic 등).
export const INDUSTRY_GROUPS = [
  { key: "med",     label: "병원·의원", emoji: "🏥",
    items: [...ONBOARD_MED_PRIMARY, ...ONBOARD_MED_MORE] },
  { key: "food",    label: "음식점", emoji: "🍽",
    items: ONBOARD_GENERAL },
  { key: "pro",     label: "전문직", emoji: "⚖️",
    items: ONBOARD_PROFESSIONAL },
  { key: "life",    label: "생활·유통", emoji: "🛏️",
    items: ONBOARD_LIFESTYLE },
];
// 세부업종 key → 소속 그룹 key (이미 선택된 값이 있을 때 1차 자동 복원용)
export const SUB_TO_GROUP = INDUSTRY_GROUPS.reduce((acc, g) => {
  g.items.forEach(it => { acc[it.key] = g.key; });
  return acc;
}, {});

// ============================================================
// [v-dept] 병원 다중 진료과 (Multi-Department) — 2026-07-12
// ------------------------------------------------------------
// 목적: 병원 1곳이 여러 진료과를 함께 운영하는 실제 구조 반영.
//   계정 → 병원(업체정보 공통 1행) → 진료과 N개.
//
// 원칙:
//   1. departments[0] = 대표 진료과. store_profiles.industry 와 항상 동일.
//      → 병원카드·검색·통계·기본생성은 기존 industry 그대로 사용(무손상).
//   2. id = 엔진 industry key 와 1:1. Registry/engineBootstrap 무수정.
//      진료과 선택 = CURRENT_INDUSTRY 전환일 뿐 → 엔진 계약 불변.
//   3. available:false = 엔진 미배선(예약석). UI 비활성 + 저장 거부.
//      엔진 추가 시점에만 true 로 전환(+ INDUSTRY_KEYS/index 배선 동반).
//
// 제외(의도적): dental / oriental / clinic
//   → 독립 개원이 압도적. 필요 시 allowExtraDepartments 옵션으로 별도 확장.
// ============================================================
export const HOSPITAL_DEPARTMENTS = [
  // ── 근골격·통증 계열
  { id: "ortho",      label: "정형외과",       available: true },
  { id: "neuro",      label: "신경외과",       available: true },
  { id: "pain",       label: "통증의학과",     available: true },
  { id: "radio",      label: "영상의학과",     available: true },
  // ── 내과 계열 (내과=1차 진료 허브 → 전문내과 4종 → 기타)
  { id: "general",    label: "내과",           available: true },
  { id: "gastro",     label: "소화기내과",     available: true },
  { id: "pulmo",      label: "호흡기내과",     available: true },
  { id: "card",       label: "순환기내과",     available: true },
  { id: "endo",       label: "내분비내과",     available: true },
  { id: "family",     label: "가정의학과",     available: true },
  { id: "pediatrics", label: "소아청소년과",   available: true },
  // ── 감각·표피 계열
  { id: "derma",      label: "피부과",         available: true },
  { id: "ent",        label: "이비인후과",     available: true },
  { id: "eye",        label: "안과",           available: true },
  { id: "urology",    label: "비뇨의학과",     available: true },
  // ── 기타
  { id: "obgyn",      label: "산부인과",       available: true },
  { id: "psy",        label: "정신건강의학과", available: true },
  // ── 예약석(엔진 미배선 — 선택·저장 불가)
  { id: "rehab",      label: "재활의학과",     available: false },
  { id: "surgery",    label: "외과",           available: false },
];

// 선택 가능한 진료과 id Set — UI 게이트 + 서버 검증 공용 SoT.
export const HOSPITAL_DEPT_IDS = new Set(
  HOSPITAL_DEPARTMENTS.filter((d) => d.available).map((d) => d.id)
);

// ============================================================
// [v-svcgroup] 서비스 분야 다중선택 공통화 — 2026-07-21
// ------------------------------------------------------------
// 목적: 병원 "진료과" 다중선택 UX를 업종군 공통 컴포넌트로 일반화.
//   업체 1곳 = 공통 업체정보 1행 + 서비스 분야 N개.
//   예) 인테리어 업체가 욕실·도배·장판·타일·조명까지 함께 시공 → 분야별 글 각각 작성.
//
// 원칙 (병원 v-dept 계약 그대로 승계):
//   1. items[0] = 대표 = store_profiles.industry. 해제 불가.
//   2. id = 엔진 industry key 와 1:1. engineBootstrap/엔진 무수정.
//      분야 선택 = CURRENT_INDUSTRY 전환일 뿐 → 엔진 계약 불변. FREEZE 무영향.
//   3. available:false = 엔진 미배선(예약석). UI 비활성 + 저장 거부.
//
// 저장 필드는 기존 departments 를 그대로 재사용한다(스키마 변경 없음).
// ============================================================
// [v-cl 2026-07-27] Construction / Living 표시 2분리.
//   · section: "construction"(시공) | "living"(생활서비스) — 칩 UI 소제목 분기 전용.
//   · SERVICE_GROUPS.construction(검증집합)은 통합 유지 → 겸업 조합 저장 무손상.
//     (예: 인테리어+입주청소 / 이사업체+입주청소 — 실제 겸업 빈도 높음)
//   · section 미기재 항목은 "construction" 로 간주(안전측 기본값).
export const CONSTRUCTION_FIELDS = [
  // ══ 🏗️ 건설·시공 ══════════════════════════════════════════
  // ── 종합·공간
  { id: "interior",       label: "인테리어",     available: true,  section: "construction" },
  { id: "bathroom",       label: "욕실리모델링", available: true,  section: "construction" },
  // ── 마감·표면
  { id: "grout",          label: "줄눈",         available: true,  section: "construction" },
  { id: "coating",        label: "탄성코트",     available: true,  section: "construction" },
  { id: "dobae",          label: "도배",         available: true,  section: "construction" },
  { id: "flooring",       label: "바닥시공",     available: true,  section: "construction" },   // [세션71] 장판+마루 통합 개명
  { id: "film",           label: "인테리어필름", available: true,  section: "construction" },
  { id: "door",           label: "도어수리",     available: true,  section: "construction" },
  { id: "waterproof",     label: "방수공사",     available: true,  section: "construction" },
  { id: "paint",          label: "페인트공사",   available: true,  section: "construction" },
  { id: "tile",           label: "타일시공",     available: true,  section: "construction" },
  { id: "window",         label: "창호시공",     available: true,  section: "construction" },
  { id: "demolition",     label: "철거공사",     available: true,  section: "construction" },
  { id: "lighting",       label: "조명",         available: true,  section: "construction" },
  { id: "furniture",      label: "맞춤가구",     available: true,  section: "construction" },
  // ── 설비·냉난방
  { id: "plumbing",       label: "수도설비",     available: true,  section: "construction" },
  { id: "systemair",      label: "시스템에어컨", available: true,  section: "construction" },
  // ── 예약석(엔진 미배선 — 선택·저장 불가)

  // ══ 🏠 생활서비스 ═════════════════════════════════════════
  // ── 수리·유지
  { id: "homefix",        label: "집수리",       available: true,  section: "living" },
  { id: "electricrepair", label: "전기수리",     available: true,  section: "living" },
  { id: "sinkrepair",     label: "싱크대수리",   available: true,  section: "living" },
  { id: "boiler",         label: "보일러설치",   available: true,  section: "living" },
  { id: "leakdetect",     label: "누수탐지",     available: true,  section: "living" },
  { id: "sewer",          label: "하수구막힘",   available: true,  section: "living" },
  { id: "screen",         label: "방충망",       available: true,  section: "living" },
  // ── 청소·방역
  { id: "cleaning",       label: "입주청소",     available: true,  section: "living" },
  { id: "buildingclean",  label: "건물청소",     available: true,  section: "living" },
  { id: "airclean",       label: "에어컨청소",   available: true,  section: "living" },
  { id: "tankclean",      label: "저수조청소",   available: true,  section: "living" },
  { id: "pestcontrol",    label: "방역",         available: true,  section: "living" },
  { id: "birdcontrol",    label: "비둘기퇴치",   available: true,  section: "living" },
  // ── 이사
  { id: "moving",         label: "이사업체",     available: true,  section: "living" },
];

// 섹션 메타 — 칩 UI 소제목. 그룹에 sections가 없으면 소제목 없이 기존 1단 렌더(하위호환).
export const SERVICE_SECTIONS = {
  construction: { key: "construction", label: "건설·시공",   emoji: "🏗️" },
  living:       { key: "living",       label: "생활서비스", emoji: "🏠" },
};

// [v-svcgroup-silver 2026-07-22] 실버케어 서비스분야 — 공통 4종(daycare·homecare·welfarecare·seniorgoods).
//   funeral(상조)은 미포함 = 그룹 미소속 → 기존 단독 업종 동작 100% 유지(칩 UI 미노출).
export const SILVERCARE_FIELDS = [
  { id: "daycare",     label: "주간보호센터", available: true },
  { id: "homecare",    label: "방문요양",     available: true },
  { id: "welfarecare", label: "복지용구",     available: true },
  { id: "seniorgoods", label: "노인용품",     available: true },
];

// 서비스 그룹 레지스트리 — 신규 그룹은 여기에만 추가하면 UI/검증 자동 적용.
export const SERVICE_GROUPS = {
  hospital: {
    key: "hospital",
    label: "진료과",
    emoji: "🏥",
    hint: "(여러 과 함께 운영 시 선택)",
    repHint: "대표 진료과",
    items: HOSPITAL_DEPARTMENTS,
  },
  construction: {
    key: "construction",
    label: "시공·서비스 분야",
    emoji: "🔧",
    hint: "(함께 하는 분야 선택 — 시공/생활서비스 겸업 가능)",
    repHint: "대표 분야",
    items: CONSTRUCTION_FIELDS,
    // [v-cl] 표시 2분리. 검증(groupEnabledIds)은 items 전체 기준 = 통합 유지.
    sections: ["construction", "living"],
  },
  silvercare: {
    key: "silvercare",
    label: "서비스 분야",
    emoji: "🧓",
    hint: "(함께 운영하는 서비스 선택)",
    repHint: "대표 분야",
    items: SILVERCARE_FIELDS,
  },
};

// id → 그룹 역인덱스 (available 무관 — 예약석도 라벨 조회는 가능해야 함)
const _ID_TO_GROUP = (() => {
  const m = new Map();
  for (const g of Object.values(SERVICE_GROUPS)) {
    for (const it of g.items) if (!m.has(it.id)) m.set(it.id, g.key);
  }
  return m;
})();

// 대표 업종 id → 소속 그룹 객체. 미소속이면 null(=칩 UI 미노출, 영향 0).
export function serviceGroupOf(industry) {
  const gk = _ID_TO_GROUP.get(String(industry || "").trim());
  return gk ? SERVICE_GROUPS[gk] : null;
}

// 그룹별 선택가능 id Set (available:true 만) — UI 게이트 + 서버 검증 공용.
const _GROUP_ENABLED_IDS = (() => {
  const m = new Map();
  for (const g of Object.values(SERVICE_GROUPS)) {
    m.set(g.key, new Set(g.items.filter((d) => d.available).map((d) => d.id)));
  }
  return m;
})();

export function groupEnabledIds(groupKey) {
  return _GROUP_ENABLED_IDS.get(groupKey) || new Set();
}

// [v-cl] 칩 UI 렌더용 — 그룹 items 를 섹션별로 분해.
//   sections 미보유 그룹(hospital·silvercare) → [{ key:null, label:null, items:전체 }] 1개 반환
//   = 소제목 없이 기존 1단 렌더 그대로. 호출부 분기 불필요.
export function serviceSectionsOf(groupKey) {
  const g = SERVICE_GROUPS[groupKey];
  if (!g) return [];
  const secs = Array.isArray(g.sections) ? g.sections : null;
  if (!secs || !secs.length) {
    return [{ key: null, label: null, emoji: null, items: g.items }];
  }
  return secs.map((sk) => {
    const meta = SERVICE_SECTIONS[sk] || { key: sk, label: sk, emoji: "" };
    return {
      key: meta.key,
      label: meta.label,
      emoji: meta.emoji,
      items: g.items.filter((it) => (it.section || "construction") === sk),
    };
  }).filter((s) => s.items.length);
}

// 다중선택 지원 업종 여부 — 병원/공사 등 그룹 소속 + 대표가 선택가능한 경우.
export function hasServiceFields(industry) {
  const g = serviceGroupOf(industry);
  if (!g) return false;
  return groupEnabledIds(g.key).has(String(industry || "").trim());
}

// 병원군 여부 — departments UI/스위처 노출 판정. 비병원 업종은 영향 0.
export function isHospitalIndustry(industry) {
  return HOSPITAL_DEPT_IDS.has(String(industry || ""));
}

// 표시명 조회 (없으면 id 그대로).
export function deptLabel(id) {
  const key = String(id || "").trim();
  for (const g of Object.values(SERVICE_GROUPS)) {
    const d = g.items.find((x) => x.id === key);
    if (d) return d.label;
  }
  return key;
}

// departments 정규화 — 저장/소비 공용.
//   · 배열 아님/빈값 → []
//   · 미배선(available:false)·중복·비병원 id 제거
//   · rep(대표=industry)가 있으면 항상 [0]으로 승격
//   [v-svcgroup] rep 소속 그룹 기준으로 검증. rep이 병원이면 기존 동작과 완전 동일.
//   그룹 미소속 rep(단독 업종) → 빈 배열 반환(기존 병원 외 업종 동작과 동일).
export function normalizeDepartments(list, rep) {
  const arr = Array.isArray(list) ? list : [];
  const r0 = String(rep || "").trim();
  const _g = serviceGroupOf(r0);
  // rep이 그룹 미소속이면 허용 집합 없음 → 기존과 동일하게 전부 탈락.
  const VALID = _g ? groupEnabledIds(_g.key) : new Set();
  const seen = new Set();
  const out = [];
  for (const raw of arr) {
    const id = String(raw || "").trim();
    if (!VALID.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  const r = r0;
  if (VALID.has(r)) {
    const i = out.indexOf(r);
    if (i > 0) out.splice(i, 1);      // 중간에 있으면 뽑아서
    if (out[0] !== r) out.unshift(r); // 맨 앞으로(대표)
  }
  return out;
}

export default INDUSTRY_TREE;
