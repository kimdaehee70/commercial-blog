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
