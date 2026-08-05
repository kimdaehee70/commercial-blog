// lib/constants.js
// 공용 상수
// 49차 v0.1: OWNER_UID 단일 truth + isOwner / resolveRole
// 85차 v0.2: RBAC 진입 — ROLES / ROLE_RANK / hasRole / resolveRoleFromAccount 추가
//   - 기존 OWNER_UID / isOwner / resolveRole 무변경 (호환 유지)
//   - 신규 함수는 DB accounts.role 우선, OWNER_UID fallback
//
// 사용처: pages/admin/*, pages/api/account/*, pages/login.js, pages/auth/callback.js, lib/guards.js

// ─────────────────────────────────────────────
// OWNER UID (단일 운영자 식별)
//   accounts.auth_user_id 와 매칭
//   role 결정 / admin 가드 / RBAC fallback
// ─────────────────────────────────────────────
export const OWNER_UID = "c704d83a-df00-4b65-8692-01a3706e1667";

// 헬퍼 — auth_user_id 가 owner 인지 판정
export function isOwner(authUserId) {
  return typeof authUserId === "string" && authUserId === OWNER_UID;
}

// 헬퍼 — role 결정 (가입/upsert 공통, DB 미조회)
// 49차 호환 유지: owner / user 2단계만 반환
export function resolveRole(authUserId) {
  return isOwner(authUserId) ? "owner" : "user";
}

// ─────────────────────────────────────────────
// RBAC — 85차 신규
// ─────────────────────────────────────────────

// 역할 enum (문자열 통일)
export const ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  USER: "user",
});

// 역할 우선순위 — hasRole 비교용
// owner > admin > user
export const ROLE_RANK = Object.freeze({
  owner: 100,
  admin: 50,
  user: 10,
});

// 헬퍼 — userRole 이 requiredRole 이상 권한인가
// 예: hasRole('admin', 'user') → true
//     hasRole('user', 'admin') → false
//     hasRole('owner', 'admin') → true
export function hasRole(userRole, requiredRole) {
  const u = ROLE_RANK[userRole] || 0;
  const r = ROLE_RANK[requiredRole] || 0;
  return u >= r;
}

// 헬퍼 — accounts 행 + auth_user_id 기반 role 결정
// 우선순위: OWNER_UID 일치 → owner
//          DB account.role 유효값 → 그대로
//          그 외 → user (fallback)
// 주의: account 가 null/undefined 여도 안전 (OWNER_UID 만으로도 owner 판정 가능)
export function resolveRoleFromAccount(account, authUserId) {
  if (isOwner(authUserId)) return ROLES.OWNER;
  const r = account?.role;
  if (r && ROLE_RANK[r] != null) return r;
  return ROLES.USER;
}

// ─────────────────────────────────────────────
// accounts 기본값 (가입/upsert 공통)
// ─────────────────────────────────────────────
export const DEFAULT_PLAN = "free";
export const DEFAULT_STATUS = "active";
