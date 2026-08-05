// pages/api/_test/publish-schema.js
// 42차 — publish_history 스키마 확인 (1회용)
// 목적: account_id 타입 / FK / 참조 대상 확인
// 패턴: publish.js와 동일 (createClient 핸들러 내부)
// 우회: information_schema는 read-only system view → cache 영향 받을 수 있음
//       실패 시 publish_history 자체 SELECT로 샘플 row 분석 fallback

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

    // Test 1: information_schema.columns (account_id 타입 확인)
    //   - 보통 PostgREST는 information_schema 노출 안 함 → 실패 예상
    //   - 일단 시도
    try {
      const t1 = await supabase
        .schema("information_schema")
        .from("columns")
        .select("column_name, data_type, is_nullable, column_default")
        .eq("table_schema", "public")
        .eq("table_name", "publish_history");
      results.test1_information_schema = {
        ok: !t1.error,
        rows: t1.data?.length || 0,
        columns: t1.data || null,
        error: t1.error?.message,
      };
    } catch (e) {
      results.test1_information_schema = { ok: false, error: String(e.message) };
    }

    // Test 2: publish_history 전체 컬럼 SELECT (실 row로 타입 추정)
    try {
      const t2 = await supabase
        .from("publish_history")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(1);
      const row = t2.data?.[0] || null;
      results.test2_sample_row = {
        ok: !t2.error,
        column_count: row ? Object.keys(row).length : 0,
        columns: row ? Object.keys(row) : [],
        sample: row,
        error: t2.error?.message,
      };
    } catch (e) {
      results.test2_sample_row = { ok: false, error: String(e.message) };
    }

    // Test 3: account_id 컬럼 단독 조회 (모든 row의 account_id 값 분포)
    try {
      const t3 = await supabase
        .from("publish_history")
        .select("id, account_id");
      const accountIds = (t3.data || []).map(r => r.account_id);
      const distinct = [...new Set(accountIds)];
      results.test3_account_id_values = {
        ok: !t3.error,
        total_rows: t3.data?.length || 0,
        distinct_values: distinct,
        null_count: accountIds.filter(v => v === null).length,
        non_null_count: accountIds.filter(v => v !== null).length,
        error: t3.error?.message,
      };
    } catch (e) {
      results.test3_account_id_values = { ok: false, error: String(e.message) };
    }

    // Test 4: 임의 uuid로 insert 시도 → FK 에러 메시지로 FK 존재 확인
    //   ⚠️ 실제 insert 발생함 → 검증 후 즉시 삭제 필요
    //   안전: 실제 row 생성 시도 회피, dry-run 형태로
    //   → 스킵. test3로 충분히 추론 가능.
    results.test4_fk_probe = {
      skipped: true,
      reason: "실제 insert 위험 회피. test3 결과로 추론.",
    };

    // 종합 판정
    const accountIdInSchema = results.test2_sample_row?.columns?.includes("account_id");
    const hasNonNullValues = (results.test3_account_id_values?.non_null_count || 0) > 0;

    return res.status(200).json({
      ok: true,
      verdict: {
        account_id_column_exists: accountIdInSchema,
        has_existing_account_id_values: hasNonNullValues,
        information_schema_accessible: results.test1_information_schema?.ok || false,
      },
      results,
      hint: "test2.sample의 모든 컬럼명 + test3의 distinct_values로 account_id 정체 추론. FK는 실제 insert 시도 시 에러 메시지로만 확정 가능.",
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message) });
  }
}
