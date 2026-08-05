// lib/store/profile.js (stub — 35차 archive 대응)
// 원본: _archive_34ch/lib/store/profile.js
// stores 테이블 archive로 인한 stub
// pages/index.js:3431에서 dynamic import 중 → 컴파일 실패 방지용
// 회원 시스템 재설계 시 재작성

export async function updateStoreIndustry(industry) {
  // no-op stub
  // 원본은 Supabase stores 테이블의 industry 컬럼 직접 UPDATE
  console.warn('[stub] updateStoreIndustry called with:', industry, '— no-op');
  return { ok: false, stub: true };
}

export async function getStoreProfile() {
  return null;
}

export async function updateStoreProfile() {
  return { ok: false, stub: true };
}

// ── draft no-op stub (97차) ──────────────────────────────
// stores 테이블 archive 상태 → draft 저장/복구 비활성.
// index.js StatusBoard의 loadDraft() 호출이 "is not a function"으로
// 렌더를 깨뜨려 URL 등록 버튼 클릭까지 막던 문제 차단용.
// loadDraft는 "복구할 draft 없음"을 의미하는 null 반환.
// DB 미접근. 회원 시스템 재설계 시 실구현으로 교체.
export async function loadDraft() {
  return null;
}

export async function saveDraft() {
  return { ok: false, stub: true };
}

export async function clearDraft() {
  return { ok: false, stub: true };
}

export default {
  updateStoreIndustry,
  getStoreProfile,
  updateStoreProfile,
  loadDraft,
  saveDraft,
  clearDraft,
};
