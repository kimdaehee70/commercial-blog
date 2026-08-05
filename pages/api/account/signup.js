// pages/api/account/signup.js
// v0.4 — 49차 (spine 통일: user_accounts → accounts)
// 변경 vs v0.3:
//   1) INSERT 대상: user_accounts → public.accounts
//   2) role 결정: 하드코딩 "owner" → resolveRole(authUserId)
//      (OWNER_UID 비교 후 일치하면 owner, 아니면 user)
//   3) constants.js 의존 추가
// FREEZE 준수: engine / publish.js / callback.js / _app.js 무영향
//
// 비고:
//   - accounts.id 는 bigint
//     .select("id, created_at") 호환 OK
//   - (구) user_accounts 테이블은 폐기 완료 (2026-06-03 DROP). 현 spine = accounts 단일.

import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PLAN, DEFAULT_STATUS, resolveRole } from "../../../lib/constants";

const ok = (res, body) => res.status(200).json({ ok: true, ...body });
const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

function isEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    const { email, password, display_name } = req.body || {};

    if (!isEmail(email)) return fail(res, 400, "INVALID_EMAIL");
    if (typeof password !== "string" || password.length < 8) {
      return fail(res, 400, "INVALID_PASSWORD", { hint: "8자 이상" });
    }
    const displayName =
      typeof display_name === "string" && display_name.trim()
        ? display_name.trim().slice(0, 40)
        : email.split("@")[0];

    // Supabase 연결 — publish.js 패턴 (핸들러 내부 생성)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return fail(res, 500, "SUPABASE_ENV_MISSING");
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // 1) Supabase auth — admin API
    const { data: authData, error: authErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });

    if (authErr || !authData?.user?.id) {
      const msg = authErr?.message || "AUTH_CREATE_FAILED";
      if (/already|exists|registered/i.test(msg)) {
        return fail(res, 409, "EMAIL_ALREADY_EXISTS");
      }
      return fail(res, 400, msg);
    }

    const authUserId = authData.user.id;

    // 2) accounts insert — 49차 spine 통일
    //    - 테이블: user_accounts → accounts
    //    - role: OWNER_UID 비교로 결정 (resolveRole)
    const role = resolveRole(authUserId);
    const row = {
      email,
      display_name: displayName,
      role,
      status: DEFAULT_STATUS,
      auth_user_id: authUserId,
      plan: DEFAULT_PLAN,
      meta: {},
    };

    const { data, error } = await supabase
      .from("accounts")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[signup] insert error:", error);
      // 정합성 — auth user rollback
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      return fail(res, 500, "ACCOUNTS_INSERT_FAILED", {
        detail: error.message,
        code: error.code,
      });
    }

    console.log(`[signup] ✓ 가입 완료: id=${data.id} / ${email} / role=${role}`);
    return ok(res, {
      id: data.id,
      created_at: data.created_at,
      email,
      role,
    });
  } catch (e) {
    console.error("[signup] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
