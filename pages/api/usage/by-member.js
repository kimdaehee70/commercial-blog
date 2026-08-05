// pages/api/usage/by-member.js
// v0.2 — 93차 (quota 진실 소스 단일화: DB plans 테이블)
// 목적: accounts(get_accounts_admin RPC) ↔ usage(by-blog-account self-fetch) 조인
//       → 회원별 monthly_publish + plan 기준 quota 계산
// 철학: 얇은 어댑터. 신규 테이블 ❌, by-blog-account.js 무수정, RPC 무수정,
//       publish.js / 엔진 FREEZE.
//
// 92차→93차 변경:
//   - PLAN_QUOTA 하드코딩(free=10/basic=30/pro=100) 제거.
//   - quota 진실 소스 = DB `plans` 테이블(monthly_quota). 시작 시 1회 조회 → 맵 구성.
//   - ⚠️ is_active 필터 없이 전 plan 로드. (basic은 is_active=false지만 quota 계산엔 필요.)
//   - plans 조회 실패 시 폴백 맵 사용(레이어가 죽지 않게). diag.quota_source로 출처 표기.
//
// 진실 소스: RPC=accounts, by-blog-account=usage, plans 테이블=quota.
//
// 흐름:
//   requireOwner
//     → plans 조회 → quotaMap
//     → RPC get_accounts_admin(p_limit:100)   ← accounts (id, role, plan, blog_account ...)
//     → self-fetch /api/usage/by-blog-account  ← usage (blog_account → monthly_publish)
//     → blog_account 기준 조인
//     → plan → quota 계산 (owner=null 무제한 예외)
//     → { ok, members: [...] }
//
// ⚠️ OUT (93차+): 고아 blog_account 정리 / 실발행 검증 / quota 차감 검증

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

// 폴백 quota (plans 조회 실패 시에만 사용). DB 값과 동일하게 유지.
// 평상시엔 사용되지 않음 — 진실 소스는 DB plans.monthly_quota.
const FALLBACK_PLAN_QUOTA = {
  free: 10,
  basic: 30,
  pro: 100,
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // ── owner 가드 (86차 requireOwner 통일) ──────────────────
  const user = await requireOwner(req, res);
  if (!user) return; // requireOwner가 이미 401/403 응답 처리
  const authUserId = user.id;

  const diag = {
    version: "v0.1",
    layer: "by-member",
    started_at: new Date().toISOString(),
  };

  try {
    // ── 0. quota 진실 소스: DB plans 테이블 (93차 단일화) ──
    //   is_active 필터 없이 전 plan 로드 (basic은 inactive지만 quota 계산엔 필요).
    //   실패해도 레이어 죽이지 않고 폴백 맵 사용.
    let quotaMap = { ...FALLBACK_PLAN_QUOTA };
    let quotaSource = "fallback";
    const tp = Date.now();
    const { data: planRows, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("id, monthly_quota");
    const plansMs = Date.now() - tp;
    if (!planErr && Array.isArray(planRows) && planRows.length > 0) {
      const m = {};
      for (const p of planRows) {
        if (p && p.id != null && typeof p.monthly_quota === "number") {
          m[p.id] = p.monthly_quota;
        }
      }
      if (Object.keys(m).length > 0) {
        quotaMap = m;
        quotaSource = "db_plans";
      }
    }

    // ── 1. accounts (RPC 재사용, 무수정) ───────────────────
    const t0 = Date.now();
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc(
      "get_accounts_admin",
      { p_limit: 100 }
    );
    const rpcMs = Date.now() - t0;

    if (rpcErr) {
      return res.status(200).json({
        ok: false,
        diag: { ...diag, step: "rpc", rpc_ok: false, rpc_ms: rpcMs, error: rpcErr.message || null, code: rpcErr.code || null },
        members: [],
      });
    }
    const accounts = Array.isArray(rpcData) ? rpcData : [];

    // ── 2. usage (by-blog-account self-fetch, 무수정) ──────
    // base URL: req.headers.host 동적 (localhost/beta/운영 자동 대응, env 불필요)
    const host = req.headers.host || "";
    const proto =
      req.headers["x-forwarded-proto"] ||
      (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    const usageUrl = `${proto}://${host}/api/usage/by-blog-account`;

    // owner Bearer 토큰 패스스루 (by-blog-account도 owner 가드라 동일 토큰 필요)
    const authHeader = req.headers.authorization || "";

    const t1 = Date.now();
    let usageJson = null;
    let usageErr = null;
    try {
      const r = await fetch(usageUrl, {
        method: "GET",
        headers: { Authorization: authHeader },
      });
      usageJson = await r.json();
      if (!r.ok || !usageJson?.ok) {
        usageErr = usageJson?.error || `usage_fetch_status_${r.status}`;
      }
    } catch (e) {
      usageErr = e && e.message ? e.message : String(e);
    }
    const usageMs = Date.now() - t1;

    if (usageErr) {
      return res.status(200).json({
        ok: false,
        diag: { ...diag, step: "usage_self_fetch", usage_url: usageUrl, usage_ms: usageMs, error: usageErr },
        members: [],
      });
    }

    // by-blog-account 전체 요약: { accounts: [{ blog_account, monthly_publish, ... }] }
    const usageList = Array.isArray(usageJson.accounts) ? usageJson.accounts : [];
    const usageMap = new Map();
    for (const u of usageList) {
      if (u && u.blog_account != null) {
        usageMap.set(u.blog_account, u);
      }
    }

    // ── 3. 조인 + quota 계산 ───────────────────────────────
    const members = accounts.map((a) => {
      const isOwner = a.role === "owner";
      const ba = a.blog_account || null;
      const u = ba ? usageMap.get(ba) : null;
      const monthly = u && typeof u.monthly_publish === "number" ? u.monthly_publish : 0;

      // quota: owner는 예외(null=무제한). 그 외 quotaMap(DB plans), 미정의 plan은 null.
      const quota = isOwner ? null : (quotaMap[a.plan] ?? null);
      const remaining = quota == null ? null : quota - monthly;
      const over_quota = quota == null ? false : monthly > quota;

      return {
        id: a.id,
        blog_account: ba,
        plan: a.plan ?? null,
        role: a.role ?? null,
        monthly_publish: monthly,
        quota,
        remaining,
        over_quota,
        // 참고용 메타 (조인 진단)
        matched_usage: !!u,
      };
    });

    return res.status(200).json({
      ok: true,
      diag: {
        ...diag,
        rpc_ok: true,
        rpc_ms: rpcMs,
        usage_ms: usageMs,
        usage_url: usageUrl,
        account_count: accounts.length,
        usage_account_count: usageList.length,
        quota_source: quotaSource,
        plans_ms: plansMs,
      },
      members,
      checked_at: new Date().toISOString(),
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      diag: { ...diag, exception: e && e.message ? e.message : String(e) },
      members: [],
    });
  }
}
