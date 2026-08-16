// ============================================================
// lib/spine/serviceAxis.js
// Platform Spine — Core 관측축 SoT (세션117)
// ------------------------------------------------------------
// 역할:
//   ORBIT Core축(상업 경쟁키워드) 검색어의 단일 진실원.
//     core_keyword = region + serviceAxis
//     serviceAxis  = INDUSTRY_CATALOG[industry].name  (읽기 전용 참조)
//
// 축 분리 (헌법 §3 계승 · 혼동 금지):
//   - core_keyword  = 상업 검색 관측축. 고객이 "업체를 찾을 때" 치는 말.
//                     예) '자양동 점집', '김포 상조', '구리 누수탐지'
//   - full_keyword  = 기존 소재/생성축(_kwBase 파생). Core가 아니다.
//   - intent_keyword= 제목 ' - ' 좌측 생존축.
//   세 축은 섞지 않는다. 평균 순위를 하나로 내지 않는다.
//
// ★ 절대 조항 — 생성 결과물 역산 금지:
//   extractedTitle · 본문 · 생성된 제목에서 Core를 파생하지 않는다.
//   Core는 생성 이전에 결정되는 독립 관측 기준값이다.
//   (S117 실측 근거: _kwBase 폴백 체인이 extractedTitle까지 내려가
//    카탈로그 없는 업종에서 상황어가 그대로 Core로 새어나갔다.
//    shaman/funeral/general/daycare/coating 5종에서 확인.)
//
// catalog.name 계약:
//   읽기 전용 참조만 허용. 음식점 계열 등 기존 소비 의미는 변경하지 않는다.
// ============================================================

import { getCatalogItem } from "../industry-catalog";

// ─────────────────────────────────────────────────────────
// SERVICE_AXIS_OVERRIDE
//   실검색어가 catalog.name 과 다른 업종만 등재한다.
//   기본은 override 없이 catalog.name 을 쓴다 — 83종 전수 보유 확인(S117).
//
//   shaman: catalog.name = '무속 상담'. 그러나 이는 탐색축이 아니다.
//           업계 디렉터리 실측상 검색자는 '점집'을 상위 탐색어로 친다.
//           (lib/shaman-data.js SHAMAN_TITLE_SERVICES 근거 계승)
// ─────────────────────────────────────────────────────────
const SERVICE_AXIS_OVERRIDE = {
  shaman: "점집",
};

// ─────────────────────────────────────────────────────────
// resolveServiceAxis — 업종 → 상업 서비스 명사.
//   @param industry  카탈로그 id (예: 'dental', 'shaman')
//   @return string|null   미등록·공백이면 null (호출측이 폴백 판단)
// ─────────────────────────────────────────────────────────
export function resolveServiceAxis(industry) {
  const key = String(industry || "").trim();
  if (!key) return null;
  if (SERVICE_AXIS_OVERRIDE[key]) return SERVICE_AXIS_OVERRIDE[key];
  const it = getCatalogItem(key);
  const name = it && typeof it.name === "string" ? it.name.trim() : "";
  return name || null;
}

// ─────────────────────────────────────────────────────────
// buildCoreKeyword — 지역 + 서비스축 조립.
//   @param region    발행 시점 지역(userRegion 축). publish_history.region.
//   @param industry  카탈로그 id
//   @return string|null   축이 없으면 null → 기존 full_keyword 폴백 유지
//
//   ※ region 이 비어도 축만 있으면 반환한다(전국 공통 엔진 대비).
// ─────────────────────────────────────────────────────────
export function buildCoreKeyword(region, industry) {
  const axis = resolveServiceAxis(industry);
  if (!axis) return null;
  const r = String(region || "").trim();
  const out = `${r} ${axis}`.trim();
  return out || null;
}

// ============================================================
// [CORE-AT-GENERATION-01] Core 생성 SoT — 생성 시점 확정용.
// ------------------------------------------------------------
// 상위 원칙: Core 는 글의 속성이다. URL 의 속성이 아니다.
//   모든 생성글은 생성 순간부터 자기 검색 좌표(Core)를 가진다.
//   URL 등록은 선택이며 Core 생성 조건이 아니다.
//
// 적용 범위: 상조(funeral) 파일럿 한정.
//   기존 buildCoreKeyword 는 무변경. funeral 특수형만 위에 얹는다.
//   치과·변호사·인테리어·무속 등 타 업종 Core 계산법은 변경 0.
//   전 업종 확장 여부는 별도 축 CORE-DEFINITION-AUDIT-01 에서 판단.
//
// Core 유형 분류(감사 축 예고 · 여기서 구현하지 않음):
//   유형A 지역+업종      예) 공릉동 치과 · 강남구 상조
//   유형B 지역+서비스    예) 잠실 개인회생 · 송파구 누수탐지
//   유형C 고유시설명     예) 서울의료원 장례식장   ← 이번 특수형
// ============================================================

// ─────────────────────────────────────────────────────────
// CORE_CTPV_PREFIX / stripCtpvPrefix
//   [S174→S175 이관] pages/index.js 로컬 정의 → lib 이관.
//   서버(save-generated)에서도 Core 를 만들 수 있어야 하므로 공용화.
//
//   규칙 — 첫 토큰이 아래 목록과 "정확히" 같을 때만 1회 제거.
//        부분매칭·정규식 치환 없음.
//        · 공백이 없으면 그대로 ("대전을지대학교병원장례식장" 무변화)
//        · 토큰 경계 불일치면 그대로 ("서울특별시립승화원" 무변화)
//        · 제거 후 빈 문자열이면 원본 유지
//   시·군·구는 제거하지 않는다(광역 접두만).
// ─────────────────────────────────────────────────────────
export const CORE_CTPV_PREFIX = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
  "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원도",
  "강원특별자치도", "충청북도", "충청남도", "전라북도", "전북특별자치도",
  "전라남도", "경상북도", "경상남도", "제주도", "제주특별자치도",
];

export function stripCtpvPrefix(s) {
  const t = String(s || "").trim();
  const i = t.indexOf(" ");
  if (i < 0) return t;
  const head = t.slice(0, i);
  const rest = t.slice(i + 1).trim();
  return (CORE_CTPV_PREFIX.includes(head) && rest) ? rest : t;
}

// ─────────────────────────────────────────────────────────
// [FUNERAL-OTHER-MENU-EXPOSURE-01] FUNERAL_MENU_CORE
//   상조 메뉴별 Core — 검색시장 검증(STEP 2) 결과 확정분만 등재한다.
//
//   근거: 「지역 + 상조」는 내부 카테고리 라벨이지 검색 시장이 아니다.
//         지역 결합은 「지역 + 장례식장」 형태(= cluster 경로)에서만 시장이 성립한다.
//         비용 메뉴에 지역을 붙이면 존재하지 않는 검색판에 진입한다.
//
//   ★ 미등재 메뉴는 여기에 추측으로 추가하지 않는다.
//     한 메뉴씩 검색시장 검증 후 등재한다(ONE MENU AT A TIME).
//   ★ 지역 토큰 미사용 — 값은 전국 공통 Core 다.
// ─────────────────────────────────────────────────────────
export const FUNERAL_MENU_CORE = {
  funeral_cost:       "장례비용",
  funeral_familycost: "가족장 비용",
  // [FUNERAL-OTHER-MENU-EXPOSURE-02] 절차 총론. 검색시장 = 무지역 절차 순서 문서군.
  funeral_procedure:  "장례절차",
};

// ─────────────────────────────────────────────────────────
// buildObservationCore — Core 계산 단일 진입점.
//   @param industry     카탈로그 id
//   @param region       발행 시점 지역
//   @param cluster      장례식장 공식명 브리지(생성 시점 hallName 원형)
//   @param treatmentId  생성 시점 선택 메뉴 id (선택 · 미전달이면 기존 동작)
//   @return string|null
//
//   우선순위 (cluster 최상단 고정 — 장례식장 정책 회귀 방지):
//     ① funeral + cluster              → stripCtpvPrefix(cluster)   유형C 고유시설명
//     ② funeral + FUNERAL_MENU_CORE    → 등재된 메뉴 Core           지역 미사용
//     ③ 그 외                          → buildCoreKeyword(region, industry)
//
//   ★ cluster 원본은 절대 가공하지 않는다. Core 를 만드는 이 순간에만 접두 제거.
//   ★ 접미 " 장례식장" 부착 금지 — hallName 이 이미 공식명으로 끝난다.
//   ★ treatmentId 미전달(undefined) 호출부는 ③으로 떨어져 기존 동작 그대로다.
//   ★ 타 업종은 ③만 통과 — Core 계산법 변경 0.
// ─────────────────────────────────────────────────────────
export function buildObservationCore(industry, region, cluster, treatmentId) {
  const ind = String(industry   || "").trim();
  const cl  = String(cluster    || "").trim();
  const tid = String(treatmentId || "").trim();
  if (ind === "funeral" && cl) return stripCtpvPrefix(cl) || null;
  if (ind === "funeral" && FUNERAL_MENU_CORE[tid]) return FUNERAL_MENU_CORE[tid];
  return buildCoreKeyword(region, industry);
}
