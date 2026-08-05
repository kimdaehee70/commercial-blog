// ============================================================
// lib/spine/titleSuffixRegistry.js
// Platform Spine STEP 4 — Title Suffix (가게명 꼬리 정책 SoT)
// ------------------------------------------------------------
// 역할:
//   제목 최후미 "| 실제업체명" 토글 정책의 SoT.
//   titleEngine.buildTitle 의 suffix hook 에 주입할 객체를 만든다.
//
// 원칙(확정):
//   - 구분자 분리: ｜(전각)=제목 내부 구조 / |(반각)=가게명 Suffix 전용.
//   - Suffix는 항상 "맨 마지막"에만 붙는다 (titleEngine이 보장).
//   - 기본값 OFF. 사용자 토글 시 ON.
//   - 사용하는 값 = 실제 업체명(사용자 입력 storeName). Display Name(catalog.label)과 독립.
//   - PHILOSOPHY 원칙1 경계: 본문 매장명 비노출은 불변.
//     제목 꼬리 Suffix는 "사용자가 명시적으로 ON 토글한 경우에만" 허용되는 예외.
//     storeName이 placeholder('이 고깃집' 등)거나 비면 강제 OFF (의미없는 꼬리 방지).
// ============================================================

export const SUFFIX_SEPARATOR = " | ";   // 반각 파이프 — 가게명 전용

// placeholder 패턴 — 실제 업체명이 아닌 일반명사 꼬리는 금지.
//   data.js의 name 필드가 '이 삼겹살집' '이 고깃집' 류 placeholder인 경우 차단.
const PLACEHOLDER_RE = /^(이|그|해당)\s|^(이곳|여기|매장|가게|식당|업체|업소)$/;

function isPlaceholderName(name) {
  if (!name) return true;
  const n = String(name).trim();
  if (!n) return true;
  if (PLACEHOLDER_RE.test(n)) return true;
  // '...집/...점/...당'으로 끝나지만 지역·메뉴 없이 일반명사뿐인 짧은 토큰 방지는
  // 호출측 책임(실제 storeName은 사용자 입력이므로 통상 통과).
  return false;
}

// ─────────────────────────────────────────────────────────
// resolveTitleSuffix — buildTitle suffix hook 입력 생성.
//
// @param opts {
//   enabled,            // 사용자 토글 (기본 false)
//   storeName,          // 실제 업체명(사용자 입력). placeholder면 무효.
// }
// @return { enabled, storeName, separator }
//   enabled=false 또는 storeName 무효 → { enabled:false } (꼬리 미부착)
// ─────────────────────────────────────────────────────────
export function resolveTitleSuffix(opts = {}) {
  const enabled = !!opts.enabled;
  const storeName = (opts.storeName || "").trim();

  if (!enabled) {
    return { enabled: false, storeName: "", separator: SUFFIX_SEPARATOR };
  }
  if (isPlaceholderName(storeName)) {
    // 토글 ON이어도 실제 업체명 없으면 부착 안 함(빈/placeholder 꼬리 방지).
    return { enabled: false, storeName: "", separator: SUFFIX_SEPARATOR };
  }
  return { enabled: true, storeName, separator: SUFFIX_SEPARATOR };
}

// 기본(OFF) 객체 — 토글 정보 없을 때 buildTitle에 그대로 넘김.
export const DEFAULT_TITLE_SUFFIX = Object.freeze({
  enabled: false, storeName: "", separator: SUFFIX_SEPARATOR,
});
