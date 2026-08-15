// pages/api/usage/by-blog-account.js
// v0.2 — 56차 (owner 가드 + Bearer 검증)
// 변경:
//   - Authorization: Bearer <token> 검증 추가
//   - [ADMIN-RBAC-02] role>=admin 검증 → 미달 403
//   - 응답에 verified 객체 추가
//   - 비즈니스 로직 무변경 (집계·정렬·KST 계산 등 v0.1 그대로)
//
// v0.1 — 42차 (blog_account 기반 usage spine)
// 목적: publish_history에서 blog_account 단위 usage 집계
// 철학: 신규 테이블 ❌, publish.js FREEZE, 읽기 전용
//
// 응답:
//   - 단일 blog_account 조회 (?blog_account=xxx): 해당 계정 상세 usage
//   - 전체 조회 (인자 없음): 모든 blog_account 요약 리스트
//
// 집계 항목:
//   - total_publish
//   - monthly_publish (이번 달, KST 기준)
//   - latest_published_at
//   - industries (활동 업종 분포)
//   - avg_qc_score

import { createClient } from "@supabase/supabase-js";
import { requireRole } from "../../../lib/guards";
import { ROLES } from "../../../lib/constants";

// KST 이번 달 첫날 ISO (시작 시각)
function kstMonthStartISO() {
  const now = new Date();
  // KST = UTC+9
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth();
  // KST 1일 00:00:00 = UTC 전날 15:00:00
  const kstFirstDay = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const utcEquiv = new Date(kstFirstDay.getTime() - kstOffsetMs);
  return utcEquiv.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return res.status(500).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
    }

    // ── [ADMIN-RBAC-02] RBAC 가드 (Bearer + accounts.role >= admin) ──
    const guard = await requireRole(req, res, ROLES.ADMIN);
    if (!guard) return;

    // ── 비즈니스 로직 (v0.1 그대로) ─────────────────────────
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    const targetAccount = req.query.blog_account || null;
    const monthStart = kstMonthStartISO();

    // ── 단일 blog_account 조회 ──────────────────────────────
    if (targetAccount) {
      const { data, error } = await supabase
        .from("publish_history")
        .select("id, blog_account, industry, keyword, published_at, qc_score, naver_post_url")
        .eq("blog_account", targetAccount)
        .order("published_at", { ascending: false });

      if (error) {
        return res.status(500).json({ ok: false, error: error.message, code: error.code });
      }

      const rows = data || [];
      const total = rows.length;
      const monthly = rows.filter(r => r.published_at >= monthStart).length;
      const latest = rows[0]?.published_at || null;
      const industries = [...new Set(rows.map(r => r.industry).filter(Boolean))];
      const scores = rows.map(r => r.qc_score).filter(v => typeof v === "number");
      const avgQc = scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;

      // 최근 5건만 미리보기
      const recent = rows.slice(0, 5).map(r => ({
        id: r.id,
        industry: r.industry,
        keyword: r.keyword,
        published_at: r.published_at,
        qc_score: r.qc_score,
        url: r.naver_post_url,
      }));

      return res.status(200).json({
        ok: true,
        blog_account: targetAccount,
        usage: {
          total_publish: total,
          monthly_publish: monthly,
          latest_published_at: latest,
          industries,
          avg_qc_score: avgQc,
        },
        recent,
        month_start_kst: monthStart,
        verified: { auth_user_id: guard.user.id, role: guard.role },
      });
    }

    // ── 전체 blog_account 요약 ──────────────────────────────
    const { data, error } = await supabase
      .from("publish_history")
      .select("id, blog_account, industry, published_at, qc_score")
      .order("published_at", { ascending: false });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message, code: error.code });
    }

    const rows = data || [];
    // blog_account별 그룹핑
    const groupMap = new Map();
    for (const r of rows) {
      const k = r.blog_account || "(unknown)";
      if (!groupMap.has(k)) {
        groupMap.set(k, {
          blog_account: k,
          total_publish: 0,
          monthly_publish: 0,
          latest_published_at: null,
          industries: new Set(),
          scores: [],
        });
      }
      const g = groupMap.get(k);
      g.total_publish += 1;
      if (r.published_at >= monthStart) g.monthly_publish += 1;
      if (!g.latest_published_at || r.published_at > g.latest_published_at) {
        g.latest_published_at = r.published_at;
      }
      if (r.industry) g.industries.add(r.industry);
      if (typeof r.qc_score === "number") g.scores.push(r.qc_score);
    }

    const summary = [...groupMap.values()]
      .map(g => ({
        blog_account: g.blog_account,
        total_publish: g.total_publish,
        monthly_publish: g.monthly_publish,
        latest_published_at: g.latest_published_at,
        industries: [...g.industries],
        avg_qc_score: g.scores.length
          ? Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => (b.latest_published_at || "").localeCompare(a.latest_published_at || ""));

    return res.status(200).json({
      ok: true,
      total_accounts: summary.length,
      total_publish_all: rows.length,
      month_start_kst: monthStart,
      accounts: summary,
      verified: { auth_user_id: guard.user.id, role: guard.role },
    });
  } catch (e) {
    console.error("[usage] 예외:", e);
    return res.status(500).json({ ok: false, error: String(e.message) });
  }
}
