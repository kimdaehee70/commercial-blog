// pages/api/_test/publish-select.js
// 42차 — publish_history SELECT body 검증 (1회용)
// 목적: insert만 cache 정상인지, select body도 정상인지 확인
// 패턴: publish.js와 100% 동일 (createClient 핸들러 내부 + persistSession:false)
// 삭제 예정: 검증 후 _archive 처리

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ ok: false, error: "SUPABASE_ENV_MISSING" });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const results = {};

    // Test 1: HEAD count (40차에서 정상 확인된 패턴)
    try {
      const t1 = await supabase
        .from("publish_history")
        .select("id", { count: "exact", head: true });
      results.test1_head_count = {
        ok: !t1.error,
        count: t1.count,
        error: t1.error?.message,
      };
    } catch (e) {
      results.test1_head_count = { ok: false, error: String(e.message) };
    }

    // Test 2: SELECT body 최소 (id 1개만, limit 1)
    try {
      const t2 = await supabase
        .from("publish_history")
        .select("id")
        .limit(1);
      results.test2_select_min = {
        ok: !t2.error,
        rows: t2.data?.length || 0,
        error: t2.error?.message,
      };
    } catch (e) {
      results.test2_select_min = { ok: false, error: String(e.message) };
    }

    // Test 3: SELECT body 다중 컬럼 (quota 집계에 필요한 컬럼)
    try {
      const t3 = await supabase
        .from("publish_history")
        .select("id, account_id, industry, published_at, qc_score")
        .limit(5);
      results.test3_select_multi = {
        ok: !t3.error,
        rows: t3.data?.length || 0,
        sample: t3.data?.[0] || null,
        error: t3.error?.message,
      };
    } catch (e) {
      results.test3_select_multi = { ok: false, error: String(e.message) };
    }

    // Test 4: SELECT + filter (account_id 그룹 시뮬레이션)
    try {
      const t4 = await supabase
        .from("publish_history")
        .select("id, account_id, published_at")
        .order("published_at", { ascending: false })
        .limit(10);
      results.test4_select_filter = {
        ok: !t4.error,
        rows: t4.data?.length || 0,
        latest: t4.data?.[0]?.published_at || null,
        error: t4.error?.message,
      };
    } catch (e) {
      results.test4_select_filter = { ok: false, error: String(e.message) };
    }

    // 종합 판정
    const allOk =
      results.test1_head_count?.ok &&
      results.test2_select_min?.ok &&
      results.test3_select_multi?.ok &&
      results.test4_select_filter?.ok;

    return res.status(200).json({
      ok: true,
      verdict: allOk ? "SELECT_BODY_AVAILABLE" : "PARTIAL_OR_BLOCKED",
      results,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message) });
  }
}
