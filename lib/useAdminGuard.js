// lib/useAdminGuard.js
// v0.2 — admin 페이지 공통 가드 훅 (2단계: role 기반 전환)
//
// 목적: 19개 admin 페이지 프론트 가드를 훅 1곳으로 통일.
//       2단계에서 판정 기준을 OWNER_UID 직접비교 → role 기반(hasRole)으로 전환.
//       훅 1곳 수정으로 19개 페이지 자동 반영.
//
// 사용:
//   const { authState, session, err, loading } = useAdminGuard();
//   if (loading) return ...;            // authState === 'checking'
//   if (err) return ...;                // authState: 'unauth' | 'non-owner'
//   // 통과 시 authState === 'owner', session.access_token 으로 API fetch
//
// 반환 계약 (기존 4-state 보존 — UI 호환):
//   authState: 'checking' | 'unauth' | 'non-owner' | 'owner'
//   session  : 통과 시 supabase session 객체 (Bearer 전파용), 그 외 null
//   err      : 에러 메시지 (unauth/non-owner 시), 정상 시 null
//   loading  : 검증 진행 중 (authState === 'checking' 와 동치)
//
// ★ 2단계 판정 (v0.2):
//   1) 세션 없음            → unauth
//   2) id === OWNER_UID     → owner 즉시 통과 (DB 미조회, v0.1 과 100% 동치, fallback 보존)
//   3) 그 외                → accounts.role 1회 조회 → hasRole(role,'admin') ?
//                              통과 → authState 'owner' (값 보존: 19개 페이지 렌더 무수정)
//                              미달 → non-owner (값 보존)
//
// ★ 불변 (사용자 확정):
//   - authState 라벨 유지 (non-owner / owner 값 그대로, 의미만 admin 포함으로 확장)
//   - owner 우회 유지 (OWNER_UID 즉시 통과)
//   - accounts.role CHECK 제약은 별도 작업으로 분리 (이번 방 범위 아님)
//   - role source of truth = accounts.role (DB). JWT claim 아님 → owner 아닌 경우만 DB 1회 조회.

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { OWNER_UID, hasRole, resolveRoleFromAccount, ROLES } from "./constants";

export function useAdminGuard() {
  const [authState, setAuthState] = useState("checking"); // checking | unauth | non-owner | owner
  const [session, setSession] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session: sess },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        // ── 1) 세션 없음 → unauth ────────────────────────────
        if (!sess?.access_token) {
          setAuthState("unauth");
          setErr("로그인이 필요합니다.");
          setLoading(false);
          return;
        }

        const uid = sess.user?.id;

        // ── 2) owner 우회 (OWNER_UID 즉시 통과, DB 미조회) ────
        //   v0.1 와 100% 동치. role 인프라 장애 시에도 owner 진입 보장 (fallback).
        if (uid === OWNER_UID) {
          setAuthState("owner");
          setSession(sess);
          setLoading(false);
          return;
        }

        // ── 3) 그 외 → accounts.role 1회 조회 → admin 판정 ───
        //   role source of truth = accounts.role (DB). 읽기 1회 (계정 행동 아님).
        const { data: account, error: accErr } = await supabase
          .from("accounts")
          .select("role")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (cancelled) return;

        // DB 장애/조회 실패 → role 미상 → user fallback → 차단 (안전측)
        if (accErr) {
          console.warn("[useAdminGuard] role lookup failed:", accErr.message);
        }

        const role = resolveRoleFromAccount(account, uid); // owner/admin/user

        if (hasRole(role, ROLES.ADMIN)) {
          // admin 이상 → 통과. authState 값은 'owner' 로 매핑(렌더 호환 보존).
          setAuthState("owner");
          setSession(sess);
          setLoading(false);
          return;
        }

        // user → 차단 (라벨 'non-owner' 유지)
        setAuthState("non-owner");
        setErr("관리자 권한이 필요합니다.");
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e.message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { authState, session, err, loading };
}
