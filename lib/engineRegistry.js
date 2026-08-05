// ============================================================
// engineRegistry.js — Engine Registry
// ------------------------------------------------------------
// 계약 (설계서 §8-4):
//   · Registry는 industry → handler 만 담당한다.
//   · Registry는 store_id / profile / 지역 을 모른다. (spine 모름)
//   · 라우팅 = 레지스트리 조회 1회.
//
// 게이트 (설계서 §8-2):
//   · dental 은 "기존 엔진을 등록만" 한다 (래퍼만, 코드 무수정).
//   · dental 출력 1바이트 무변화가 증명되어야 FREEZE 유지된 채 플랫폼화 성립.
//
// Spine ↔ Registry 분리:
//   · spine 이 industry 문자열을 주면, registry 는 그 문자열로 handler 만 찾는다.
//   · 둘이 섞이면(예: registry가 store_id를 읽으면) 하드코딩 → 롤백.
// ============================================================

const ENGINES = Object.create(null);

// register(industry, handler) — 업종 엔진 등록.
//   handler 시그니처 = (req, res) => Promise  (기존 generateXxx 와 동일).
export function register(industry, handler) {
  if (!industry || typeof industry !== "string") {
    throw new Error("[registry] industry(string) 필수");
  }
  if (typeof handler !== "function") {
    throw new Error(`[registry] handler(function) 필수: ${industry}`);
  }
  ENGINES[industry] = handler;
  return handler;
}

// resolve(industry) — 등록된 핸들러 조회 (없으면 null).
export function resolve(industry) {
  return ENGINES[industry] || null;
}

// has(industry) — 등록 여부.
export function has(industry) {
  return !!ENGINES[industry];
}

// list() — 등록된 업종 키 목록 (디버그/검증용).
export function list() {
  return Object.keys(ENGINES);
}

export default { register, resolve, has, list };
