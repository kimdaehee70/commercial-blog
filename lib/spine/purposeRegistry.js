// ============================================================
// lib/spine/purposeRegistry.js
// Platform Spine STEP 1 — Purpose Registry (공통 정책 SoT)
// ------------------------------------------------------------
// 역할:
//   방문목적(purpose) label → type 의 단일 진실원(SoT).
//   엔진은 allowedPurposes(label 배열)만 선언하고,
//   type/제목수식/본문프레임은 이 Registry가 소유한다.
//
// 원칙(인수계 §4):
//   - strict resolve. 미등록 label은 throw (fallback 금지 = SoT 모순).
//   - type 어휘: place / menu (확장 occasion·season·event = 데이터추가, 코드무변경)
//       place : "누구와/어떤 자리" — 가게를 수식 (가족과 가기 좋은)
//       menu  : "무엇을 먹으러"     — 메뉴를 수식 (혼밥하기 좋은 / 한 점 즐기기 좋은)
//   - 엔진별 narrative 아님. 공통 기능 모듈 (Naver §6 정합).
// ============================================================

// ─────────────────────────────────────────────────────────
// PURPOSE_TYPE — type 어휘 (확장 시 여기에 추가, 소비측 코드 무변경)
// ─────────────────────────────────────────────────────────
export const PURPOSE_TYPE = Object.freeze({
  PLACE: "place",   // 가게 수식형 (누구와/어떤 자리)
  MENU:  "menu",    // 메뉴 수식형 (무엇을/어떻게)
  // 예약(데이터만 추가하면 됨, 코드 무변경):
  // OCCASION: "occasion",
  // SEASON:   "season",
  // EVENT:    "event",
});

const _VALID_TYPES = new Set(Object.values(PURPOSE_TYPE));

// ─────────────────────────────────────────────────────────
// PURPOSE_REGISTRY — label → { type, titleLabel }
//   titleLabel : 제목 {purpose} 자리에 들어가는 자연스러운 수식형
//   ※ 외식군 표준안. 신규 업종은 자기 label을 여기에 등록(또는 registerPurpose)한다.
//   ※ label 자체는 업종 무관 공통 어휘 — 같은 의미면 같은 항목 재사용.
// ─────────────────────────────────────────────────────────
const PURPOSE_REGISTRY = {
  // ── place 계열 (누구와/어떤 자리 → 가게 수식) ──
  "회식":        { type: PURPOSE_TYPE.PLACE, titleLabel: "회식하기 좋은" },
  "가족 외식":   { type: PURPOSE_TYPE.PLACE, titleLabel: "가족과 가기 좋은" },
  "데이트":      { type: PURPOSE_TYPE.PLACE, titleLabel: "데이트하기 좋은" },
  "친구 모임":   { type: PURPOSE_TYPE.PLACE, titleLabel: "친구들과 모임하기 좋은" },
  "술자리":      { type: PURPOSE_TYPE.PLACE, titleLabel: "한잔하기 좋은" },
  "주말 외식":   { type: PURPOSE_TYPE.PLACE, titleLabel: "주말에 가기 좋은" },
  "부모님 식사": { type: PURPOSE_TYPE.PLACE, titleLabel: "부모님 모시기 좋은" },
  "기념일":      { type: PURPOSE_TYPE.PLACE, titleLabel: "기념일에 가기 좋은" },
  "모임":        { type: PURPOSE_TYPE.PLACE, titleLabel: "모임하기 좋은" },

  // ── menu 계열 (무엇을/어떻게 → 메뉴 수식) ──
  "저녁 식사":   { type: PURPOSE_TYPE.MENU,  titleLabel: "저녁 먹기 좋은" },
  "혼밥":        { type: PURPOSE_TYPE.MENU,  titleLabel: "혼밥하기 좋은" },
  "점심 식사":   { type: PURPOSE_TYPE.MENU,  titleLabel: "점심 먹기 좋은" },
};

// 런타임 확장용(신규 업종이 자기 label을 추가할 때). 무결성 검사 포함.
export function registerPurpose(label, def) {
  if (!label || typeof label !== "string") {
    throw new Error(`[purposeRegistry] label은 비어있지 않은 문자열이어야 함: ${JSON.stringify(label)}`);
  }
  if (!def || !_VALID_TYPES.has(def.type)) {
    throw new Error(`[purposeRegistry] '${label}' type 미상/오류: ${def && def.type} (허용: ${[..._VALID_TYPES].join("/")})`);
  }
  if (!def.titleLabel || typeof def.titleLabel !== "string") {
    throw new Error(`[purposeRegistry] '${label}' titleLabel 누락`);
  }
  if (PURPOSE_REGISTRY[label] && PURPOSE_REGISTRY[label].type !== def.type) {
    throw new Error(`[purposeRegistry] '${label}' type 충돌: 기존 ${PURPOSE_REGISTRY[label].type} ≠ 신규 ${def.type}`);
  }
  PURPOSE_REGISTRY[label] = { type: def.type, titleLabel: def.titleLabel };
  return PURPOSE_REGISTRY[label];
}

// ─────────────────────────────────────────────────────────
// resolvePurpose — strict. 미등록이면 throw.
//   반환: { label, type, titleLabel }
//   빈 purpose(미선택)는 null 반환 — 호출측이 메뉴/상황 폴백 결정 (throw 아님).
// ─────────────────────────────────────────────────────────
export function resolvePurpose(label) {
  if (label == null || label === "") return null;   // 미선택 = 정상(폴백 위임)
  const hit = PURPOSE_REGISTRY[label];
  if (!hit) {
    throw new Error(
      `[purposeRegistry] 미등록 purpose: '${label}'. ` +
      `등록 필요(registerPurpose) 또는 오타. 등록목록: ${Object.keys(PURPOSE_REGISTRY).join(", ")}`
    );
  }
  return { label, type: hit.type, titleLabel: hit.titleLabel };
}

// ─────────────────────────────────────────────────────────
// validateAllowedPurposes — 엔진 allowedPurposes(label 배열) 전수 검증.
//   SOP v4.2 STEP4 게이트: 신규 업종 오타·미등록 조기 검출.
//   미등록 1건이라도 있으면 throw(누적 메시지). 통과 시 resolve 결과 배열 반환.
// ─────────────────────────────────────────────────────────
export function validateAllowedPurposes(allowedPurposes, industryName = "?") {
  if (!Array.isArray(allowedPurposes)) {
    throw new Error(`[purposeRegistry] '${industryName}' allowedPurposes는 배열이어야 함`);
  }
  const bad = [];
  const resolved = [];
  for (const label of allowedPurposes) {
    try {
      resolved.push(resolvePurpose(label));
    } catch {
      bad.push(label);
    }
  }
  if (bad.length) {
    throw new Error(
      `[purposeRegistry] '${industryName}' 미등록 purpose ${bad.length}건: ${bad.join(", ")} — ` +
      `registerPurpose로 등록하거나 오타 수정`
    );
  }
  return resolved;
}

// 조회 유틸(소비측 편의)
export function getPurposeType(label) {
  const r = resolvePurpose(label);
  return r ? r.type : null;
}
export function getPurposeTitleLabel(label) {
  const r = resolvePurpose(label);
  return r ? r.titleLabel : "";
}
export function listPurposes() {
  return Object.keys(PURPOSE_REGISTRY);
}
