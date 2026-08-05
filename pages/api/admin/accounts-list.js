// pages/api/admin/accounts-list.js
// 86차 v0.9: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - OWNER_UID / supabaseAdmin.auth.getUser 직접 호출 제거
// - 비즈니스 로직 / 응답 포맷 / diag 구조 무변경 (UI 호환 유지)
//
// 84차 v0.8: 인증 클라이언트 통일 (supabaseAuth → supabaseAdmin)
// 57차 v0.7: summary 집계 추가
// 55차 v0.6: Bearer 토큰 검증 + OWNER_UID 가드
// 40차-C v0.5: rpc 시그니처 변경 대응

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

// 57차: status 집계
function buildSummary(rows) {
  const s = { total: rows.length, active: 0, pending: 0, suspended: 0, other: 0 };
  for (const r of rows) {
    const st = r.status;
    if (st === "active") s.active++;
    else if (st === "pending") s.pending++;
    else if (st === "suspended") s.suspended++;
    else s.other++;
  }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // --- 가드 (86차 v0.9: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const diag = {
    version: "v0.9",
    rpc: "get_accounts_admin",
    started_at: new Date().toISOString(),
  };

  try {
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin.rpc("get_accounts_admin", {
      p_limit: 100,
    });
    const ms = Date.now() - t0;

    if (error) {
      return res.status(200).json({
        ok: false,
        diag: {
          ...diag,
          rpc_ok: false,
          rpc_ms: ms,
          error_message: error.message || null,
          error_details: error.details || null,
          error_hint: error.hint || null,
          error_code: error.code || null,
        },
        rows: [],
        count: 0,
        summary: { total: 0, active: 0, pending: 0, suspended: 0, other: 0 },
        checked_at: new Date().toISOString(),
      });
    }

    const rows = Array.isArray(data) ? data : [];
    return res.status(200).json({
      ok: true,
      diag: { ...diag, rpc_ok: true, rpc_ms: ms },
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
        rpc_ok: false,
        exception: e && e.message ? e.message : String(e),
      },
      rows: [],
      count: 0,
      summary: { total: 0, active: 0, pending: 0, suspended: 0, other: 0 },
      checked_at: new Date().toISOString(),
    });
  }
}
