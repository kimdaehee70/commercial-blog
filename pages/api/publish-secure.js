// pages/api/publish-secure.js
// 53차 신규 — publish.js 보안 미들웨어
//
// 목적: publish.js의 토큰 미검증 / account_id 위조 leak 차단
// 정책: publish.js FREEZE 유지 (직접 수정 없음) → fetch self call로 위임
//
// 흐름:
//   1) Bearer access_token 추출 + 검증 (supabase.auth.getUser)
//   2) accounts SELECT (auth_user_id 기준) → verifiedAccountId 확정
//   3) status !== 'active' 차단
//   4) body.account_id 있으면 verifiedAccountId와 일치 검증 (위조 차단)
//   5) owner 아니면 quota 확인 (check-quota 호출)
//   6) 검증된 account_id 강제 주입 후 publish.js로 fetch self call
//   7) publish.js 응답 그대로 반환
//
// v2 (60차): self call 시 x-internal-secret 헤더 동봉
//   - publish.js v2의 직접 호출 차단과 한 쌍
//   - PUBLISH_INTERNAL_SECRET env 미설정 시 500

import { createClient } from "@supabase/supabase-js";
import { OWNER_UID } from "../../lib/constants";

const ok = (res, body) => res.status(200).json({ ok: true, ...body });
const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    // ─── 1. env / admin client ───
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail(res, 500, "SUPABASE_ENV_MISSING");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // internal secret 사전 검증 (60차) — self call 전에 fail-fast
    const INTERNAL_SECRET = process.env.PUBLISH_INTERNAL_SECRET;
    if (!INTERNAL_SECRET) {
      console.error("[publish-secure] 🚨 PUBLISH_INTERNAL_SECRET not configured");
      return fail(res, 500, "SERVER_MISCONFIG");
    }

    // ─── 2. Bearer token 추출 + 검증 ───
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return fail(res, 401, "MISSING_ACCESS_TOKEN");

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return fail(res, 401, "INVALID_TOKEN", {
        detail: userErr?.message || null,
      });
    }
    const authUserId = userData.user.id;

    // ─── 3. 본인 accounts row 조회 (서버 측 정답) ───
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("id, email, role, plan, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (accErr) {
      console.error("[publish-secure] account select error:", accErr);
      return fail(res, 500, "ACCOUNT_SELECT_FAILED", { detail: accErr.message });
    }

    if (!account) {
      return fail(res, 404, "ACCOUNT_NOT_FOUND", {
        hint: "call /api/account/ensure first",
      });
    }

    // ─── 4. status 차단 ───
    if (account.status && account.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "ACCOUNT_INACTIVE",
        status: account.status,
      });
    }

    const verifiedAccountId = account.id;
    const isOwner = account.role === "owner" || authUserId === OWNER_UID;

    // ─── 5. body.account_id 위조 차단 ───
    // 클라이언트가 account_id를 보내면 반드시 서버 검증값과 일치해야 함
    const bodyAccountId = req.body?.account_id;
    if (bodyAccountId != null && Number(bodyAccountId) !== Number(verifiedAccountId)) {
      console.warn(
        `[publish-secure] 🚨 account_id 위조 시도: authUserId=${authUserId} (verified=${verifiedAccountId}) → 요청=${bodyAccountId}`
      );
      return res.status(403).json({
        ok: false,
        error: "ACCOUNT_ID_MISMATCH",
        detail: "body.account_id does not match authenticated user",
      });
    }

    // ─── 6. quota 확인 (owner는 skip) ───
    if (!isOwner) {
      // check-quota.js 재사용 — 동일 origin 호출
      const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
      try {
        const cq = await fetch(`${origin}/api/publish/check-quota`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_user_id: authUserId }),
        });
        const cqJson = await cq.json();

        if (cqJson.allowed !== true) {
          return res.status(403).json({
            ok: false,
            error: cqJson.reason || "QUOTA_BLOCKED",
            quota: cqJson,
          });
        }
      } catch (e) {
        console.error("[publish-secure] check-quota error:", e);
        return fail(res, 500, "QUOTA_CHECK_FAILED", { detail: String(e?.message || e) });
      }
    }

    // ─── 7. publish.js로 fetch self call (FREEZE 준수) ───
    // 검증된 account_id 강제 주입 (위조 불가)
    // 60차: x-internal-secret 헤더 동봉 (publish.js v2 가드 통과)
    const sanitizedBody = {
      ...req.body,
      account_id: verifiedAccountId, // 서버 확정값으로 덮어씀
    };

    const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
    const pubRes = await fetch(`${origin}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET, // 60차 추가
      },
      body: JSON.stringify(sanitizedBody),
    });
    const pubJson = await pubRes.json();

    // publish.js 응답 그대로 + 검증 정보 부가
    return res.status(pubRes.status).json({
      ...pubJson,
      verified: {
        auth_user_id: authUserId,
        account_id: verifiedAccountId,
        is_owner: isOwner,
      },
    });
  } catch (e) {
    console.error("[publish-secure] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
