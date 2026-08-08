// pages/api/publish.js
// 사용자가 네이버에 수동 발행 완료 → publish_history insert
// 철학: 실제 발행 데이터 축적 (자동 발행 X)
//
// v2 (60차): internal secret 가드 추가
//   - 직접 호출 차단 — publish-secure.js 경로만 허용
//   - x-internal-secret 헤더 검증 (PUBLISH_INTERNAL_SECRET env)
//   - FREEZE 해제 (14세션째 → 0)

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  // ─── 0. internal secret 가드 (60차 추가) ───
  // publish-secure.js → publish.js self call만 허용
  // 외부에서 /api/publish 직접 호출 시 403
  const INTERNAL_SECRET = process.env.PUBLISH_INTERNAL_SECRET;
  if (!INTERNAL_SECRET) {
    console.error("[publish] 🚨 PUBLISH_INTERNAL_SECRET not configured");
    return res.status(500).json({ ok: false, error: "SERVER_MISCONFIG" });
  }
  const reqSecret = req.headers["x-internal-secret"];
  if (reqSecret !== INTERNAL_SECRET) {
    console.warn(`[publish] 🚨 direct call blocked: ip=${req.headers["x-forwarded-for"] || "unknown"}`);
    return res.status(403).json({ ok: false, error: "DIRECT_CALL_FORBIDDEN" });
  }

  try {
    const {
      // 필수
      blog_account,
      naver_post_url,
      industry,
      keyword,
      title,
      content,
      qc_score,
      // 선택 (있으면 저장)
      active_keyword,
      full_keyword,
      core_keyword,
      region,
      treatment_id,
      treatment_name,
      qc_detail,
      text_markdown,
      char_count,
      placeholder_count,
      raw_prompt,
      final_prompt,
      model,
      generated_version,
      // nullable (회원 시스템 전)
      account_id,
      store_id,
      cluster,
      is_personal_post,
    } = req.body || {};

    // 필수 검증
    const missing = [];
    if (!blog_account)   missing.push("blog_account");
    if (!naver_post_url) missing.push("naver_post_url");
    if (!industry)       missing.push("industry");
    if (!keyword)        missing.push("keyword");
    if (!title)          missing.push("title");
    if (!content)        missing.push("content");
    if (qc_score == null) missing.push("qc_score");

    if (missing.length > 0) {
      return res.status(400).json({
        ok: false,
        error: `필수 필드 누락: ${missing.join(", ")}`,
      });
    }

    // URL 형식 간단 검증
    if (!/^https?:\/\//.test(naver_post_url)) {
      return res.status(400).json({
        ok: false,
        error: "naver_post_url은 http(s)://로 시작해야 합니다",
      });
    }

    // Supabase 연결
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ ok: false, error: "Supabase env 누락" });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // insert payload — 정의된 필드만 포함 (undefined 자동 제외)
    const row = {
      blog_account,
      naver_post_url,
      industry,
      keyword,
      title,
      content,
      qc_score,
      published_at: new Date().toISOString(),
      publish_status: "published",
    };
    if (active_keyword != null)    row.active_keyword    = active_keyword;
    if (full_keyword != null)      row.full_keyword      = full_keyword;
    if (core_keyword != null)      row.core_keyword      = core_keyword;
    if (region != null)            row.region            = region;
    if (treatment_id != null)      row.treatment_id      = treatment_id;
    if (treatment_name != null)    row.treatment_name    = treatment_name;
    if (qc_detail != null)         row.qc_detail         = qc_detail;
    if (text_markdown != null)     row.text_markdown     = text_markdown;
    if (char_count != null)        row.char_count        = char_count;
    if (placeholder_count != null) row.placeholder_count = placeholder_count;
    if (raw_prompt != null)        row.raw_prompt        = raw_prompt;
    if (final_prompt != null)      row.final_prompt      = final_prompt;
    if (model != null)             row.model             = model;
    if (generated_version != null) row.generated_version = generated_version;
    if (account_id != null)        row.account_id        = account_id;
    if (store_id != null)          row.store_id          = store_id;
    if (cluster != null)           row.cluster           = cluster;
    if (is_personal_post != null)  row.is_personal_post  = is_personal_post;

    const { data, error } = await supabase
      .from("publish_history")
      .insert(row)
      .select("id, published_at")
      .single();

    if (error) {
      console.error("[publish] insert error:", error);
      return res.status(500).json({ ok: false, error: error.message, code: error.code });
    }

    console.log(`[publish] ✓ 발행 기록 저장: id=${data.id} / ${title.slice(0, 30)}`);
    return res.status(200).json({ ok: true, id: data.id, published_at: data.published_at });

  } catch (e) {
    console.error("[publish] 예외:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
