// lib/guards.js
// 85차 v0.1 — API 공통 가드 함수
// 목적: 84차 표준 가드 5줄 패턴 추출 → 호출부 1줄로 압축
//
// 사용 방식 (b): 실패 시 내부에서 res.status().json() 직접 전송 + null 반환
//   const user = await requireOwner(req, res);
//   if (!user) return; // res 이미 전송됨
//
// 응답 포맷: 84차 표준 그대로 유지 (UI 호환)
//   { ok: false, error: 'UNAUTHORIZED', detail: '...' } / 401
//   { ok: false, error: 'FORBIDDEN', detail: '...' } / 403

import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";
import {
  OWNER_UID,
  ROLES,
  ROLE_RANK,
  hasRole,
  resolveRoleFromAccount,
} from "./constants";

// auth 검증 전용 (anon key) — 패턴 통일
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────
// 내부 — Bearer 토큰 추출
// ─────────────────────────────────────────────
function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

// ─────────────────────────────────────────────
// requireAuth — 토큰 검증만 (역할 검사 ❌)
//   성공: supabase user 객체 반환
//   실패: res.status(401).json() 전송 후 null 반환
// ─────────────────────────────────────────────
export async function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      error: "UNAUTHORIZED",
      detail: "missing_bearer_token",
    });
    return null;
  }

  const { data: userData, error: userErr } =
    await supabaseAuth.auth.getUser(token);

  if (userErr || !userData?.user) {
    res.status(401).json({
      ok: false,
      error: "UNAUTHORIZED",
      detail: "invalid_token",
    });
    return null;
  }

  return userData.user;
}

// ─────────────────────────────────────────────
// requireOwner — 84차 표준 가드 (OWNER_UID 단순 비교)
//   DB 미조회 (가장 빠름, 기존 가드와 100% 동치)
//   성공: user 반환
//   실패: 401 / 403 전송 후 null 반환
// ─────────────────────────────────────────────
export async function requireOwner(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (user.id !== OWNER_UID) {
    res.status(403).json({
      ok: false,
      error: "FORBIDDEN",
      detail: "not_owner",
    });
    return null;
  }

  return user;
}

// ─────────────────────────────────────────────
// requireAccount — 인증 + account 해석 (auth_user_id → account)
//   v163 회원관리: account_id 해석 단일 출처.
//   me/* 의 "requireAuth 후 accounts 재조회" 중복 패턴을 1줄로 압축.
//   DB 1회 조회 (accounts where auth_user_id = user.id)
//   성공: { user, account } 반환 (account.id 보장)
//   실패: 401(미인증) / 404(account 없음) 전송 후 null 반환
//
//   ★ 응답 포맷: 기존 me/* 와 동일하게 유지 (UI 호환)
//      { ok:false, error:"ACCOUNT_NOT_FOUND" } / 404
//   ★ requireRole 과 달리 role 산출/검사 없음 (account 해석 전용).
// ─────────────────────────────────────────────
export async function requireAccount(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null; // res 이미 전송됨 (401)

  const { data: account, error: accErr } = await supabaseAdmin
    .from("accounts")
    .select("id, auth_user_id, email, plan, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (accErr || !account) {
    res.status(404).json({ ok: false, error: "ACCOUNT_NOT_FOUND" });
    return null;
  }

  // [DEACTIVATED-LOGIN-NOT-BLOCKED-01] 비활성 계정 전역 차단 (owner 예외 없음)
  if (account.status !== "active") {
    res.status(403).json({
      ok: false,
      error: "ACCOUNT_DEACTIVATED",
      detail: account.status,
    });
    return null;
  }

  return { user, account };
}

// ─────────────────────────────────────────────
// requireRole — RBAC 가드 (accounts.role 조회)
//   DB 1회 조회 (accounts where auth_user_id = user.id)
//   성공: { user, account, role } 반환
//   실패: 401 / 403 전송 후 null 반환
//
//   role 결정: OWNER_UID 일치 → owner (DB 무관)
//             accounts.role 유효값 → 그대로
//             그 외 → user (fallback)
//
//   requiredRole: 'owner' | 'admin' | 'user'
//   hasRole 비교로 이상 권한이면 통과
// ─────────────────────────────────────────────
export async function requireRole(req, res, requiredRole = ROLES.USER) {
  const user = await requireAuth(req, res);
  if (!user) return null;

  // accounts 조회 (DB 1회) — auth_user_id 기준
  const { data: account, error: accErr } = await supabaseAdmin
    .from("accounts")
    .select("id, auth_user_id, email, role, plan, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // accErr 는 throw 대신 무시 — role 결정은 OWNER_UID fallback 으로도 가능
  // 단, DB 장애 시 일반 user 는 자동 user role 로 처리됨
  if (accErr) {
    console.warn("[requireRole] accounts lookup failed:", accErr.message);
  }

  // [DEACTIVATED-LOGIN-NOT-BLOCKED-01] 비활성 계정 전역 차단 (owner 예외 없음)
  if (account && account.status !== "active") {
    res.status(403).json({
      ok: false,
      error: "ACCOUNT_DEACTIVATED",
      detail: account.status,
    });
    return null;
  }

  const role = resolveRoleFromAccount(account, user.id);

  if (!hasRole(role, requiredRole)) {
    res.status(403).json({
      ok: false,
      error: "FORBIDDEN",
      detail: "insufficient_role",
      required: requiredRole,
      actual: role,
    });
    return null;
  }

  return { user, account: account || null, role };
}
