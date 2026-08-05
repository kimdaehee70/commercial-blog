// pages/api/admin/schema-inspect.js
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 인증부만 표준화: requireOwner 적용 → 가드 응답 자동으로 표준 포맷
// - 비즈니스 응답(200 body) 100% 무변경 — UI freeze 원칙 준수
//   · result.publish_history / result.generated_posts / result.join_candidates 그대로
//   · 500 에러 응답도 그대로 ({ error, partial })
// - OWNER_UID import 제거 (requireOwner 내부에서 사용)
//
// 84차 v0.2 — 권한 정비
// 16차 — generated_posts / publish_history 스키마 조사 (read-only)
// 목적: mismatch cross-check 전에 정확한 컬럼 확정

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // --- 가드 (86차 v0.3: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  const result = {
    publish_history: { columns: [], sample: null, count: 0 },
    generated_posts: { columns: [], sample: null, count: 0 },
    join_candidates: {},
  };

  try {
    // publish_history 샘플 1행 (컬럼 추출용)
    const { data: phSample, count: phCount } = await supabaseAdmin
      .from("publish_history")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);
    if (phSample?.[0]) {
      result.publish_history.columns = Object.keys(phSample[0]);
      result.publish_history.sample = phSample[0];
    }
    result.publish_history.count = phCount || 0;

    // generated_posts 샘플 1행
    const { data: gpSample, count: gpCount } = await supabaseAdmin
      .from("generated_posts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);
    if (gpSample?.[0]) {
      result.generated_posts.columns = Object.keys(gpSample[0]);
      result.generated_posts.sample = gpSample[0];
    }
    result.generated_posts.count = gpCount || 0;

    // 연결점 정보 체크
    const phCols = new Set(result.publish_history.columns);
    const gpCols = new Set(result.generated_posts.columns);
    result.join_candidates = {
      has_generated_post_id: phCols.has("generated_post_id"),
      has_post_id: phCols.has("post_id"),
      has_content_hash_ph: phCols.has("content_hash"),
      has_content_hash_gp: gpCols.has("content_hash"),
      has_title_ph: phCols.has("title"),
      has_title_gp: gpCols.has("title"),
      shared_columns: [...phCols].filter((c) => gpCols.has(c)),
    };

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message, partial: result });
  }
}
