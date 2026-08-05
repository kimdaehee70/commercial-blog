// ============================================================
// contextSpine.js — Context Spine (단일 진실원)
// ------------------------------------------------------------
// 계약 (설계서 §8-4):
//   · Spine은 "어떤 업체·업종·지역인가"만 안다.
//   · Spine은 엔진/핸들러/프롬프트를 모른다. (engine import 금지)
//   · Spine은 store_id·industry·rep_region·sub_regions 만 반환한다.
//   · 이 객체 = 배지(0장)·라우팅(2장)·profile(5장)·Observer(6장)가
//     전부 읽는 유일 진실원.
//
// 침범 금지:
//   · contexts/StoreContext (기존 SoT) 를 수정하지 않는다.
//   · 여기서는 currentStore 를 "읽어 정규화" 만 한다.
// ============================================================

// 기존 store 행(currentStore) → spine 컨텍스트로 정규화.
//   currentStore 스키마: { id, industry, store_name, region, sub_region, ... }
//   spine 출력 스키마  : { store_id, industry, rep_region, sub_regions }
//
// sub_region(단일 문자열, 콤마 구분) → sub_regions(배열)로 변환.
//   sub_region 은 사용자 자산이므로 원본을 변조하지 않고 파생 배열만 만든다.
export function normalizeContext(store) {
  const s = store || {};

  const subRaw = (s.sub_region || "").trim();
  const sub_regions = subRaw
    ? subRaw.split(",").map(x => x.trim()).filter(Boolean)
    : [];

  return {
    store_id:    s.id || null,
    industry:    s.industry || null,
    rep_region:  (s.region || "").trim() || null,
    sub_regions,                       // 파생 배열 (원본 sub_region 미변조)
  };
}

// getActiveContext — 활성 컨텍스트 반환 (단일 진실원).
//   currentStore 를 인자로 받아 정규화한다. (StoreContext 침범 없음)
//   미로딩/미등록이면 모든 키 null/[] 로 안전 반환.
export function getActiveContext(currentStore) {
  return normalizeContext(currentStore);
}

// 컨텍스트 준비 여부 — 라우팅/생성 가능 최소 조건.
export function isContextReady(ctx) {
  return !!(ctx && ctx.store_id && ctx.industry);
}

export default getActiveContext;
