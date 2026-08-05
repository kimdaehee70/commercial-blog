// pages/api/account/ensure.js
// 49차 신규 — auth 사용자 ↔ accounts row 보장
// 호출처: callback.js (OAuth 후), login.js (이메일 로그인 후)
// spine: public.accounts (단일 통일)
// 권한: service_role (RLS 우회) — 클라이언트가 access_token 전송
//
// 흐름:
//   1) Bearer access_token 추출
//   2) supabaseAdmin.auth.getUser(token) → auth user 확정
//   3) accounts SELECT (auth_user_id 기준) → 있으면 skip
//   4) 없으면 INSERT (role = OWNER 비교 / plan='free' / status='active')
//
// FREEZE 준수: publish.js / engine / RPC 무영향

import { createClient } from "@supabase/supabase-js";
import { OWNER_UID, DEFAULT_PLAN, DEFAULT_STATUS, resolveRole } from "../../../lib/constants";

const ok = (res, body) => res.status(200).json({ ok: true, ...body });
const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    // ─── 1. env / admin client (publish.js 패턴 미러링) ───
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail(res, 500, "SUPABASE_ENV_MISSING");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // ─── 2. Bearer token 추출 ───
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return fail(res, 401, "MISSING_ACCESS_TOKEN");

    // ─── 3. token → auth user 확정 ───
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return fail(res, 401, "INVALID_TOKEN", {
        detail: userErr?.message || null,
      });
    }
    const authUser = userData.user;
    const authUserId = authUser.id;
    const email = authUser.email || null;

    // ─── 4. 기존 accounts row 확인 ───
    const { data: existing, error: selErr } = await supabase
      .from("accounts")
      .select("id, email, role, status, plan")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (selErr) {
      console.error("[ensure] select error:", selErr);
      return fail(res, 500, "SELECT_FAILED", { detail: selErr.message });
    }

    if (existing) {
      // 이미 있음 → skip (이번 작업에서는 갱신 없음, 다음 단계 RBAC에서 처리)
      return ok(res, {
        action: "exists",
        id: existing.id,
        role: existing.role,
        status: existing.status,
        plan: existing.plan,
      });
    }

    // ─── 5. 없으면 INSERT ───
    const role = resolveRole(authUserId);
    const displayName =
      authUser.user_metadata?.display_name ||
      authUser.user_metadata?.name ||
      (email ? email.split("@")[0] : "user");

    const row = {
      email,
      display_name: displayName,
      role,
      status: DEFAULT_STATUS,
      auth_user_id: authUserId,
      plan: DEFAULT_PLAN,
      meta: {},
    };

    const { data: inserted, error: insErr } = await supabase
      .from("accounts")
      .insert(row)
      .select("id, created_at")
      .single();

    if (insErr) {
      console.error("[ensure] insert error:", insErr);
      return fail(res, 500, "INSERT_FAILED", {
        detail: insErr.message,
        code: insErr.code,
      });
    }

    console.log(`[ensure] ✓ accounts row 생성: id=${inserted.id} / ${email} / role=${role}`);
    return ok(res, {
      action: "created",
      id: inserted.id,
      role,
      status: DEFAULT_STATUS,
      created_at: inserted.created_at,
    });
  } catch (e) {
    console.error("[ensure] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
