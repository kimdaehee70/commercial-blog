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
//         비용 메뉴에 지역을 붙이면 존재하지 않는 검색판에 진입한다.
//   ※ [FUNERAL-CORE-MENU-AXIS-01] 정정 — 「지역 결합은 cluster 경로에서만 성립」은
//     과했다. 「강남구 장례식장」은 실명 시설 없이도 검색시장이 성립한다(2026-08-21 실측).
//     지역결합형 메뉴는 아래 FUNERAL_REGION_MENU_CORE 가 담당한다.
//     이 상수(무지역)의 계약 자체는 무변경이다.
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
// [FUNERAL-CORE-MENU-AXIS-01] FUNERAL_REGION_MENU_CORE
//   상조 메뉴 중 '지역 결합형' Core — 실검색 검증 통과분만 등재한다.
//
//   근거: 「강남구 장례식장」 전용 광고판 + 플레이스 노출 확인(2026-08-21).
//         「강남구 상조」 검색판에도 장례식장 결과가 직접 노출된다.
//         S210 §3 「funeral 지역누락 12건 = 정상」 판정을 이 메뉴에 한해 정정한다.
//
//   ★ FUNERAL_MENU_CORE(무지역 전국축)와 별개 상수다. 어순 = 지역 + 값.
//   ★ treatment_name("장례식장 안내") 미사용 — 검색시장은 「장례식장」이다.
//     MENU_AXIS_INDUSTRY(region + tnm) 방식이면 「강남구 장례식장 안내」가 되어
//     검증한 검색판과 어긋난다. 그래서 별도 상수·별도 분기다.
//   ★ 미검증 메뉴를 추측으로 추가하지 않는다. ONE MENU AT A TIME.
//     funeral_hallbooking · funeral_afterdeath · funeral_type 등은 미등재 = 무변경.
//   ★ region 공백이면 null. 지역 없는 「장례식장」 단독은 시장이 아니다.
// ─────────────────────────────────────────────────────────
export const FUNERAL_REGION_MENU_CORE = {
  funeral_hall: "장례식장",
};

// ─────────────────────────────────────────────────────────
// [HOSPITAL-CORE-AUDIT-01] 병원군 Core = 지역 + 생성 전 확정된 선택 메뉴명.
//
//   근거: 「지역 + 진료과」는 업체 등록 속성이지 글이 경쟁하는 검색 시장이 아니다.
//         실측 — 제목 「상록수역 백내장 …」 글이 core_keyword=「상록수역 정형외과」로
//         저장되어 관측축이 실제 검색판과 어긋났다.
//         상조에서 확정한 「Core 는 업종이 아니라 메뉴의 속성」 원칙과 동일 구조다.
//
//   ★ 역산 금지 조항 준수:
//     treatment_name 은 생성 이전에 사용자가 선택한 메뉴명이다. 생성물 파생이 아니다.
//     단 호출부 폴백 체인에 extractedTitle 이 섞일 수 있으므로(_kwBase),
//     treatmentId 가 비어 있으면 메뉴 미선택으로 보고 사용하지 않는다 → ③ 폴백.
//     이 가드가 생성물 역산 유입을 차단한다.
//
//   ★ 병원 외 업종 무변화 — category 판정으로 건강·의료군만 통과시킨다.
// ─────────────────────────────────────────────────────────
export const MEDICAL_CATEGORY = "건강·의료";

export function isMedicalIndustry(industry) {
  const it = getCatalogItem(String(industry || "").trim());
  return !!(it && it.category === MEDICAL_CATEGORY);
}

// ─────────────────────────────────────────────────────────
// [INTERIOR-CORE-MENU-AXIS-01] 메뉴축 화이트리스트.
//
//   근거(S210 실측):
//     · interior 13개 지역 중 12개가 다중 메뉴(3~6종) 발행 중.
//       현행 「지역 + 인테리어」 Core 는 서로 다른 검색시장을 하나로 합쳐
//       같은 지역 글끼리 자기잠식을 일으킨다.
//     · 메뉴축 검색시장 3/3 성립(전용 광고판 기준) — 실검색 검증 완료:
//       중화동 싱크대필름 · 다산 주방 리모델링 · 마석 현관문필름.
//
//   ★ 화이트리스트 방식 — 등재된 업종만 메뉴축을 쓴다.
//     업종마다 실제 검색시장 구조가 다르다(funeral 비용메뉴 = 무지역 전국축).
//     한 업종씩 검색시장 검증 후 등재한다(ONE INDUSTRY AT A TIME).
//     legal · film · lawyer · pestcontrol 은 미등재 = 무변경.
//     shaman 은 어순이 달라 이 축을 쓰지 않는다 — 아래 SHAMAN 전용 분기 참조.
// ─────────────────────────────────────────────────────────
export const MENU_AXIS_INDUSTRY = new Set(["interior"]);

export function isMenuAxisIndustry(industry) {
  return MENU_AXIS_INDUSTRY.has(String(industry || "").trim());
}

// ─────────────────────────────────────────────────────────
// [SHAMAN-CORE-SITUATION-HANDLE-01] 무속 상황 핸들.
//
//   Core = 「상황핸들 + 지역 + 점집」.  ※ interior(지역+메뉴)와 어순이 다르다.
//
//   근거(S210 실검색):
//     · 「자양동 점집」 하나에 같은 지역 글이 뭉쳐 자기잠식.
//     · 상황문 원문을 그대로 붙이면 시장이 없다 —
//       「자양동 돈이 계속 새어나갈 때」 = 광고 0 · 플레이스 0 · 결과 전량 무관.
//     · 핸들형은 시장이 선다 —
//       「재물운 자양동 점집」 광고 3 · 「사업운 신내동 점집」 광고 3.
//     · 「계약 구의동 점집」 「시험 자양동 점집」 은 자사 글이 블로그 1위 실측.
//       현행 Core(지역+점집)가 실제 승리 검색시장을 놓치고 있었다는 증거.
//
//   ★ 조어 금지 — 「계약운」 광고 0 / 「계약」 광고 2. 한 글자가 시장을 가른다.
//     "운" 접미는 재물·사업에만 붙는다. 추측으로 확장하지 않는다.
//   ★ 미등재 상황은 추가하지 않는다(ONE HANDLE AT A TIME).
//     실검색 검증 통과분만 등재하며, 미등재는 기존 「지역 + 점집」 폴백이다.
//   ★ 상황문 원문은 Core 가 아니라 intent_keyword(생존축)에 남는다. 축을 섞지 않는다.
// ─────────────────────────────────────────────────────────
export const SHAMAN_SITUATION_HANDLE = {
  biz_leak:     "재물운",  // 돈이 계속 새어나갈 때
  biz_slow:     "사업운",  // 장사가 계속 안될 때
  biz_contract: "계약",    // 계약이 계속 깨질 때
  study_exam:   "시험",    // 시험만 보면 떨어질 때
};

// ─────────────────────────────────────────────────────────
// [LEGAL-CORE-WORK-HANDLE-01] 법무사 업무 핸들.
//
//   Core = 「지역 + 업무」.  ※ 지역은 구 단위 전제(생활권 입력 안내는 별도 UI 축).
//
//   근거(S? 2026-09-06 실검색 · PROFESSIONAL-CORE-HANDLE-POLICY-01):
//     · 최상위 증거 — 동일 글 · 동시 비교(검색축 대조):
//       「태릉입구역 법무사」11위 → 「태릉입구역 법인등기」6위. 업무축이 5계단 우세.
//     · 구 단위 + 업무 = 상업 검색시장 성립. 3계열 재현:
//       노원구 상속등기(legal) · 노원구 음주운전(lawyer) · 노원구 상속세(tax)
//       — 전건 플레이스 소멸 · 광고 적합 · 블로그 의도 수렴.
//     · 역/동 + 업무는 3계열 표본에서 플레이스형으로 관측(확정 규칙 아님 · 관측 기록).
//     · 구 + 직종(노원구 법무사/변호사)도 시장은 있으나 업무 혼합 —
//       개별 글 주제와 Core 가 어긋난다. 주축에서 탈락, 폴백으로 존치.
//
//   ★ 등재 조건 2개 — (1) 구 단위 실검색으로 시장 성립 확인 (2) 형태소 충돌 없음.
//     형태소 충돌 실패 사례: 「기장대리」= 기장(부산 기장군) + 대리(대리운전).
//     세무 블로그 0건 — 시장 부재가 아니라 핸들 실패다. 두 가지를 분리 판정한다.
//   ★ corporate_register(법인등기)는 1차 제외 — 지역별 시장 깊이 편차.
//     노원구 얕음(광고 전건 부적합) / 강남 성립. resolver 에 지역 깊이 판단 장치가
//     없으므로 등재하면 전 지역 일괄 적용된다.
//   ★ 미등재 업무 19건 + 업무 미선택은 ④ 「지역 + 법무사」 폴백이다(안전 폴백 존치).
//   ★ ONE HANDLE AT A TIME — 실검색 검증 통과분만 등재한다.
//   ★ lawyer · tax 는 정책 방향의 검증 표본일 뿐 미등재다. 5직종 일괄 등재 금지.
// ─────────────────────────────────────────────────────────
export const LEGAL_WORK_HANDLE = {
  inheritance_registration: "상속등기",   // 노원구 PASS · 강남 성립
};

// ─────────────────────────────────────────────────────────
// buildObservationCore — Core 계산 단일 진입점.
//   @param industry     카탈로그 id
//   @param region       발행 시점 지역
//   @param cluster      장례식장 공식명 브리지(생성 시점 hallName 원형)
//   @param treatmentId  생성 시점 선택 메뉴 id (선택 · 미전달이면 기존 동작)
//   @return string|null
//
//   @param treatmentName 생성 시점 선택 메뉴명 (선택 · 병원군에서만 소비)
//
//   우선순위 (cluster 최상단 고정 — 장례식장 정책 회귀 방지):
//     ① funeral + cluster              → stripCtpvPrefix(cluster)   유형C 고유시설명
//     ② funeral + FUNERAL_MENU_CORE    → 등재된 메뉴 Core           지역 미사용
//     ②-a funeral + FUNERAL_REGION_MENU_CORE
//                                      → region + 메뉴 Core         유형E 지역+시설군
//     ②-b shaman + SHAMAN_SITUATION_HANDLE
//                                      → 핸들 + region + 점집       유형D 상황+지역+업종
//     ②-c legal + LEGAL_WORK_HANDLE
//                                      → region + 업무 핸들          유형F 지역+업무
//     ③ 건강·의료 또는 메뉴축 등재업종 + treatmentId·Name
//                                      → region + treatmentName     유형B 지역+서비스
//     ④ 그 외                          → buildCoreKeyword(region, industry)
//
//   ★ cluster 원본은 절대 가공하지 않는다. Core 를 만드는 이 순간에만 접두 제거.
//   ★ 접미 " 장례식장" 부착 금지 — hallName 이 이미 공식명으로 끝난다.
//   ★ treatmentId 미전달(undefined) 호출부는 ③으로 떨어져 기존 동작 그대로다.
//   ★ 타 업종은 ③만 통과 — Core 계산법 변경 0.
// ─────────────────────────────────────────────────────────
export function buildObservationCore(industry, region, cluster, treatmentId, treatmentName) {
  const ind = String(industry     || "").trim();
  const cl  = String(cluster      || "").trim();
  const tid = String(treatmentId  || "").trim();
  const tnm = String(treatmentName || "").trim();
  if (ind === "funeral" && cl) return stripCtpvPrefix(cl) || null;
  if (ind === "funeral" && FUNERAL_MENU_CORE[tid]) return FUNERAL_MENU_CORE[tid];
  // [FUNERAL-CORE-MENU-AXIS-01] 상조 지역결합 메뉴 — 등재 메뉴만. 어순 = 지역 + 메뉴.
  //   ①(실명 시설 cluster) 미해당 + ②(무지역 메뉴) 미해당 건만 여기 걸린다.
  //   미등재 tid 는 빠져 ④ 「지역 + 상조」 폴백으로 간다.
  if (ind === "funeral" && FUNERAL_REGION_MENU_CORE[tid]) {
    const r = String(region || "").trim();
    return r ? `${r} ${FUNERAL_REGION_MENU_CORE[tid]}`.trim() : null;
  }
  // [SHAMAN-CORE-SITUATION-HANDLE-01] 무속 — 등재 핸들만. 어순 = 핸들 + 지역 + 점집.
  //   미등재 tid 는 여기서 빠져 ④ 「지역 + 점집」 폴백으로 간다.
  if (ind === "shaman" && SHAMAN_SITUATION_HANDLE[tid]) {
    const base = buildCoreKeyword(region, ind);   // "자양동 점집"
    return base ? `${SHAMAN_SITUATION_HANDLE[tid]} ${base}`.trim() : null;
  }
  // [LEGAL-CORE-WORK-HANDLE-01] 법무사 — 등재 업무만. 어순 = 지역 + 업무.
  //   미등재 tid · tid 공백은 여기서 빠져 ④ 「지역 + 법무사」 폴백으로 간다.
  if (ind === "legal" && LEGAL_WORK_HANDLE[tid]) {
    const r = String(region || "").trim();
    return r ? `${r} ${LEGAL_WORK_HANDLE[tid]}`.trim() : null;
  }
  // [HOSPITAL-CORE-AUDIT-01] 병원군 — 메뉴 선택이 확정된 경우에만 메뉴축 Core.
  // [INTERIOR-CORE-MENU-AXIS-01] 화이트리스트 등재 업종도 동일 규칙으로 통과.
  //   tid 공백 = 메뉴 미선택(호출부 폴백 경로) → 아래 ④ 로 떨어져 기존 동작 유지.
  if (tid && tnm && (isMedicalIndustry(ind) || isMenuAxisIndustry(ind))) {
    const r = String(region || "").trim();
    return `${r} ${tnm}`.trim() || null;
  }
  return buildCoreKeyword(region, industry);
}
