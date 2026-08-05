// pages/api/me/timeline.js
// 사용자 본인 관찰 타임라인 — SELECT only. DB 쓰기 0.
// 인증: requireAccount → user.id scope.
// 관측 이벤트 요약: 관련도 이동(keyword_rank_type/observed_rank) / 유지기간(days_since_publish).
// 소스: publish_metrics m JOIN publish_history h (account_id 필터). observed_date desc + id desc 보조정렬.
// Naver §2: 상태판 톤. rank_detail/ai_smell_note/fossil/memo/exposure_note 등 분석필드 제외. 점수0.
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  const limit = Math.min(parseInt(req.query.limit ?? "30", 10) || 30, 100);

  try {
    // 노출 허용 컬럼만. 같은 날짜 다건 안정 정렬 위해 id desc 보조정렬.
    const { data: rows, error: mErr } = await supabaseAdmin
      .from("publish_metrics")
      .select("id, observed_date, days_since_publish, keyword_rank_type, observed_rank, observed_keyword, alive_status, publish_id, publish_history!inner(account_id, title)")
      .eq("publish_history.account_id", account.id)
      .order("observed_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (mErr) {
      return res.status(500).json({ ok: false, error: "SELECT_FAILED", detail: mErr.message });
    }

    const events = (rows ?? []).map((r) => ({
      observed_date: r.observed_date,
      days_since_publish: r.days_since_publish,
      keyword_rank_type: r.keyword_rank_type,
      observed_rank: r.observed_rank,
      observed_keyword: r.observed_keyword,
      alive_status: r.alive_status,
      title: r.publish_history?.title ?? null,
    }));

    return res.status(200).json({ ok: true, events });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
