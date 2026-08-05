// pages/api/dashboard/recent.js
// 사용자 대시보드 — 최근 발행 카드 데이터 (최근 5건)
// 인증: 기존 requireAuth() 패턴 재사용 (Bearer token → getUser())
// DB: vuuqtrzcfjbywlxqskoi 단일 / 읽기 전용 SELECT 만
//
// ⚠️ TODO(다음 방): publish_history (+ publish_metrics) 실제 컬럼명 확인 후
//    [SELECT 본문] 구간만 채울 것. 응답 형태는 Mockup 더미와 1:1 고정.

import { requireAuth } from "../../../lib/requireAuth"; // 기존 패턴 (경로는 프로젝트 기준 확인)

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth?.ok) return;
  const uid = auth.userId;
  const supabase = auth.supabase;

  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

  try {
    // ── [SELECT 본문] ───────────────────────────────────────
    // TODO: 실제 컬럼명 확정 후 작성.
    //
    // const { data: rows } = await supabase
    //   .from("publish_history")
    //   .select("id, region, title, published_at, url, status") // ← 컬럼명 확인 필요
    //   .eq("auth_user_id", uid)         // ← user 식별 컬럼명 확인 필요
    //   .order("published_at", { ascending: false })
    //   .limit(limit);
    //
    // status 가 publish_history 에 없고 metrics/observations 에 있으면
    // post_id 기준 조인 또는 2차 조회로 status 매핑.
    //
    // 변환:
    //   date    = published_at → 상대시간은 클라이언트에서 포맷
    //   status  = 'alive' | 'unknown' | 'fossil(내부)' 그대로 전달 (클라가 라벨 변환)
    //   url     = 응답에는 포함하되 화면엔 숨김 (제목 클릭 시 이동에 사용)
    // ─────────────────────────────────────────────────────────

    // 임시 응답 형태 (Mockup 더미와 동일 키) — 연결 시 위 결과로 교체
    const payload = {
      ok: true,
      items: [
        // { id, region, title, published_at, status, url }
      ],
    };

    return res.status(200).json(payload);
  } catch (e) {
    console.error("[dashboard/recent]", e?.message);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
