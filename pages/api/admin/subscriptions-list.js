// pages/api/admin/subscriptions-list.js
// 86차 v0.2: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - createClient / supabaseAuth / OWNER_UID import 제거
// - 비즈니스 로직 / 응답 포맷 / diag 구조 무변경 (UI 호환 유지)
//
// 82차 v0.1 — 구독 현황 read-only API (신규)
//
// 패턴: accounts-list.js v0.7 동일
//   - GET only
//   - read-only (SELECT only / DML 0)
//   - { ok, diag, rows, count, summary, checked_at } 응답 구조
//
// 차이:
//   - RPC 미사용 (direct SELECT — 사용자 결정)
//   - subscriptions JOIN plans + accounts(id, email)
//
// SELECT 컬럼 (실제 존재하는 것만):
//   subscriptions: id, account_id, plan_id, status, billing_key_id,
//                  current_period_start, current_period_end, cancel_at_period_end,
//                  created_at, updated_at
//   plans:         id, label, monthly_quota, price_krw
//   accounts:      id, email
//
// publish.js / me.js / account.js 영향: 0

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

// status별 카운트 + cancel_at_period_end 카운트 + plan별 카운트
function buildSummary(rows) {
  const s = {
    total: rows.length,
    active: 0,
    past_due: 0,
    paused: 0,
    cancelled: 0,
    expired: 0,
    other: 0,
    cancel_scheduled: 0, // cancel_at_period_end = true (status 무관)
    by_plan: {},         // { [plan_id]: count }
  };
  for (const r of rows) {
    const st = r.status;
    if (st === "active") s.active++;
    else if (st === "past_due") s.past_due++;
    else if (st === "paused") s.paused++;
    // 104차: write 경로(billing-action/issue-billing-key)는 'canceled'(l 1개)를 쓴다.
    //   과거 수기 'cancelled'(l 2개) 행도 같은 칸으로 흡수해 무손실 집계.
    else if (st === "canceled" || st === "cancelled") s.cancelled++;
    else if (st === "expired") s.expired++;
    else s.other++;

    if (r.cancel_at_period_end) s.cancel_scheduled++;

    const pid = r.plan_id || "(none)";
    s.by_plan[pid] = (s.by_plan[pid] || 0) + 1;
  }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // --- 가드 (86차 v0.2: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const diag = {
    version: "v0.2",
    source: "direct_select",
    started_at: new Date().toISOString(),
  };

  try {
    const t0 = Date.now();

    // direct SELECT — subscriptions + plans JOIN + accounts JOIN
    // 정렬: updated_at DESC (최신 변경 위로)
    // limit: 200 (운영 초기 충분)
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        account_id,
        plan_id,
        status,
        billing_key_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at,
        plans:plan_id (
          id,
          label,
          monthly_quota,
          price_krw
        ),
        accounts:account_id (
          id,
          email
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(200);

    const ms = Date.now() - t0;

    if (error) {
      return res.status(200).json({
        ok: false,
        diag: {
          ...diag,
          select_ok: false,
          select_ms: ms,
          error_message: error.message || null,
          error_details: error.details || null,
          error_hint: error.hint || null,
          error_code: error.code || null,
        },
        rows: [],
        count: 0,
        summary: { total: 0, active: 0, past_due: 0, paused: 0, cancelled: 0, expired: 0, other: 0, cancel_scheduled: 0, by_plan: {} },
        checked_at: new Date().toISOString(),
      });
    }

    const raw = Array.isArray(data) ? data : [];

    // Supabase JOIN 응답 정규화 — plans / accounts 객체를 평탄화
    const rows = raw.map((r) => ({
      id: r.id,
      account_id: r.account_id,
      account_email: r.accounts?.email || null,
      plan_id: r.plan_id,
      plan_label: r.plans?.label || null,
      plan_price_krw: r.plans?.price_krw ?? null,
      plan_monthly_quota: r.plans?.monthly_quota ?? null,
      status: r.status,
      billing_key_id: r.billing_key_id,
      current_period_start: r.current_period_start,
      current_period_end: r.current_period_end,
      cancel_at_period_end: !!r.cancel_at_period_end,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.status(200).json({
      ok: true,
      diag: { ...diag, select_ok: true, select_ms: ms },
      rows,
      count: rows.length,
      summary: buildSummary(rows),
      checked_at: new Date().toISOString(),
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      diag: {
        ...diag,
        select_ok: false,
        exception: e && e.message ? e.message : String(e),
      },
      rows: [],
      count: 0,
      summary: { total: 0, active: 0, past_due: 0, paused: 0, cancelled: 0, expired: 0, other: 0, cancel_scheduled: 0, by_plan: {} },
      checked_at: new Date().toISOString(),
    });
  }
}
