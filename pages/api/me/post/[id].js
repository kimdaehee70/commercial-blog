// pages/api/me/post/[id].js
// 단건 조회 — 최근발행에서 "글 열기" 시 본문/메타 1건만 가져온다. SELECT only. DB 쓰기 0.
//
// 왜 단건 분리인가:
//   목록(me/posts)은 content/text_markdown을 절대 싣지 않는다(Naver §2 + 트래픽).
//   본문 재복사·URL 재등록은 "그 순간 그 글 하나"만 필요 → 클릭 시 단건 fetch.
//
// 인증/스코프:
//   requireAccount → account.id 확정. WHERE account_id = 본인 + id 일치 이중 조건.
//   남의 글 id를 넣어도 account_id 불일치로 0건 → 404. (IDOR 차단)
//
// 반환 컬럼 정책:
//   - 본문 복사용: title, content, text_markdown  (text_markdown 우선 — 원본 포맷 보존)
//   - URL 재등록용 메타: keyword, active_keyword, full_keyword, region,
//     treatment_id, treatment_name, industry, char_count, model, store_id
//   - 상태 표시용: naver_post_url, publish_status, published_at, created_at
//   - §2 미노출 유지: qc_score / qc_detail / raw_prompt / final_prompt 반환 안 함(점수화 방지).
//     (본문 복사·재등록에 불필요. 단건이라도 점수계열은 싣지 않는다.)
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAccount } from "../../../../lib/guards";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  const rawId = req.query.id;
  const id = parseInt(Array.isArray(rawId) ? rawId[0] : rawId, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ ok: false, error: "INVALID_ID" });
  }

  try {
    const { data: post, error: selErr } = await supabaseAdmin
      .from("publish_history")
      .select([
        "id", "title", "content", "text_markdown",
        "keyword", "active_keyword", "full_keyword",
        "region", "treatment_id", "treatment_name", "industry",
        "char_count", "model", "store_id",
        "naver_post_url", "publish_status", "published_at", "created_at",
      ].join(", "))
      .eq("account_id", account.id)   // 본인 스코프 — IDOR 차단 핵심
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (selErr) {
      return res.status(500).json({ ok: false, error: "SELECT_FAILED", detail: selErr.message });
    }
    if (!post) {
      // 존재하지 않거나 타인 글 → 동일하게 404 (존재 여부 leak 방지)
      return res.status(404).json({ ok: false, error: "POST_NOT_FOUND" });
    }

    return res.status(200).json({ ok: true, post });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
