// ============================================================
// lib/spine/displayName.js
// Platform Spine STEP 5 — Display Name SoT (catalog.label)
// ------------------------------------------------------------
// 역할:
//   "업종 표시명"의 단일 진실원(SoT)을 catalog.label 로 고정.
//   UI/제목/로그 어디서든 업종명을 부를 때 이 함수를 거친다.
//   (세션17 PASS: catalog.label = Display Name SoT 확인)
//
// 핵심 분리(혼동 금지):
//   - Display Name  = catalog.label   → "업종"의 표시명 (예: '고깃집', '치과')
//                                        모든 사용자 공통. 고정값.
//   - Store Name    = 사용자 입력      → "개별 업체"의 실제 상호 (예: '공릉동참숯갈비')
//                                        Title Suffix(STEP4) 전용. 사용자별.
//   둘은 출처·수명·용도가 전부 다르다. 절대 혼용 금지.
//
// strict:
//   - catalog 항목에 label 없으면 throw (SoT 누락은 오류).
//   - industry-catalog.js 구조에 의존하지 않도록, catalog 객체를 주입받는다
//     (Spine은 catalog 형태를 모름 — 호출측이 항목을 넘김).
// ============================================================

// ─────────────────────────────────────────────────────────
// resolveDisplayName — catalog 항목에서 표시명 추출(strict).
//
// @param catalogItem { label, ... }   // industry-catalog.js의 한 항목
// @param industryKey                  // 에러 메시지용(선택)
// @return string                      // 표시명(label)
// ─────────────────────────────────────────────────────────
export function resolveDisplayName(catalogItem, industryKey = "?") {
  if (!catalogItem || typeof catalogItem !== "object") {
    throw new Error(`[displayName] '${industryKey}' catalog 항목 없음 — Display Name SoT 누락`);
  }
  const label = catalogItem.label;
  if (!label || typeof label !== "string" || !label.trim()) {
    throw new Error(
      `[displayName] '${industryKey}' catalog.label 누락/공백 — ` +
      `Display Name SoT는 catalog.label이 유일. (icon/summary/version과 별개로 label 필수)`
    );
  }
  return label.trim();
}

// ─────────────────────────────────────────────────────────
// resolveDisplayNameByKey — catalog 맵 + key 로 조회(strict).
//   @param catalog  { [industryKey]: { label, ... } }
//   @param industryKey
// ─────────────────────────────────────────────────────────
export function resolveDisplayNameByKey(catalog, industryKey) {
  if (!catalog || typeof catalog !== "object") {
    throw new Error(`[displayName] catalog 맵 없음`);
  }
  const item = catalog[industryKey];
  if (!item) {
    throw new Error(
      `[displayName] 미등록 업종: '${industryKey}'. catalog에 항목 추가 필요. ` +
      `등록목록: ${Object.keys(catalog).join(", ")}`
    );
  }
  return resolveDisplayName(item, industryKey);
}

// ─────────────────────────────────────────────────────────
// assertNotStoreName — Display Name 자리에 실제 업체명이 잘못 들어갔는지
//   개발 단계 가드(선택적). storeName과 displayName이 같으면 혼용 의심.
//   (강제 throw 아님 — 우연 일치 가능. 경고 반환.)
// ─────────────────────────────────────────────────────────
export function checkNameSeparation(displayName, storeName) {
  if (!storeName) return { ok: true };
  if (displayName && storeName && displayName.trim() === storeName.trim()) {
    return {
      ok: false,
      warn: `[displayName] Display Name('${displayName}')과 Store Name이 동일 — ` +
            `업종표시명(catalog.label)과 실제업체명 혼용 의심`,
    };
  }
  return { ok: true };
}
