// pages/api/dashboard/survival.js
// 사용자 대시보드 — 생존 현황 카드 데이터
// 인증: 기존 requireAuth() 패턴 재사용 (Bearer token → getUser())
// DB: vuuqtrzcfjbywlxqskoi 단일 / 읽기 전용 SELECT 만
//
// ⚠️ TODO(다음 방): observations / timeline / status 실제 컬럼명 확인 후
//    [SELECT 본문] 구간만 채울 것. 응답 형태는 Mockup 더미와 1:1 고정.

import { requireAuth } from "../../../lib/requireAuth"; // 기존 패턴 (경로는 프로젝트 기준 확인)

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // 1) 인증 — Bearer token → getUser() → uid
  const auth = await requireAuth(req, res);
  if (!auth?.ok) return; // requireAuth 내부에서 401 응답 처리
  const uid = auth.userId;
  const supabase = auth.supabase; // service/anon 클라이언트 (기존 패턴 따름)

  try {
    // ── [SELECT 본문] ───────────────────────────────────────
    // TODO: 실제 컬럼명 확정 후 작성. 아래는 형태 가이드.
    //
    // const { data: rows } = await supabase
    //   .from("observations")            // 또는 publish_metrics / timeline 조합
    //   .select("status, days_alive, rank_move")  // ← 실제 컬럼명 확인 필요
    //   .eq("auth_user_id", uid);        // ← user 식별 컬럼명 확인 필요
    //
    // 집계 (내부 status 키 → 사용자 표기로 변환은 클라이언트가 함):
    //   alive     = status === 'alive'   count
    //   unknown   = status === 'unknown' count
    //   attention = status === 'fossil'  count   ← fossil 은 내부키, 노출 X
    //   avgDays   = avg(days_alive of alive)
    //   moveUp    = rank_move > 0 count (최근 윈도우)
    //   moveDown  = rank_move < 0 count (최근 윈도우)
    // ─────────────────────────────────────────────────────────

    // 임시 응답 형태 (Mockup 더미와 동일 키) — 연결 시 위 집계 결과로 교체
    const payload = {
      ok: true,
      alive: 0,
      unknown: 0,
      attention: 0, // 내부 fossil 집계값. 키 이름은 사용자 친화어로 통일
      avgDays: 0,
      moveUp: 0,
      moveDown: 0,
    };

    return res.status(200).json(payload);
  } catch (e) {
    console.error("[dashboard/survival]", e?.message);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
}
