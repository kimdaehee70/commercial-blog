// pages/api/me/survival.js
// 사용자 본인 survival 요약 — SELECT only. DB 쓰기 0. 재판정 0.
// 인증: requireAccount → user.id scope.
// 단일출처: alive_status 는 publish_metrics에 이미 저장됨(판정규칙 v1 결과). 그대로 집계만.
// 소스: publish_metrics m JOIN publish_history h (account_id 필터). embedded inner join 실측 OK.
// Naver §2: 상태값만(alive/unknown/fossil/gone). 점수0. 재발행CTA0.
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";

const STATUS_KEYS = ["alive", "fossil", "gone", "unknown"]; // ALIVE_VALUES (판정규칙 v1)

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  try {
    // 본인 글 관측의 alive_status 분포 + post별 상태(treatment/region) — 저장값 그대로. 재판정 없음.
    // SELECT only. publish_history JOIN으로 treatment_name·region 동반 조회(이미 있는 데이터).
    const { data: rows, error: mErr } = await supabaseAdmin
      .from("publish_metrics")
      .select("alive_status, publish_id, publish_history!inner(account_id, treatment_name, region, title, created_at)")
      .eq("publish_history.account_id", account.id);

    if (mErr) {
      return res.status(500).json({ ok: false, error: "SELECT_FAILED", detail: mErr.message });
    }

    const summary = { alive: 0, fossil: 0, gone: 0, unknown: 0, observed: 0 };
    const items = []; // post별 [{ status, treatment, region, title, created_at }] — ⑤ 최근성과 분석용
    for (const r of rows ?? []) {
      const s = (r.alive_status ?? "unknown").toLowerCase();
      const key = STATUS_KEYS.includes(s) ? s : "unknown";
      summary[key] += 1;
      summary.observed += 1;
      const h = r.publish_history || {};
      items.push({
        publish_id: r.publish_id,
        status: key,
        treatment: h.treatment_name ?? "",
        region: h.region ?? "",
        title: h.title ?? "",
        created_at: h.created_at ?? null,
      });
    }

    return res.status(200).json({ ok: true, summary, items });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
