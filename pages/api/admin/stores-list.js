// pages/api/admin/stores-list.js
// 86차 v0.8: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - createClient / supabaseAuth / OWNER_UID import 제거
// - RPC 호출 / 응답 포맷 / diag 구조 무변경 (UI 호환 유지)
//
// 85차 v0.7 — Bearer 토큰 검증 + OWNER_UID 가드 추가 (84차 표준 패턴)
// v0.6 (40차-C) — 시그니처 변경 대응: rpc(name, { p_limit })

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  // --- 가드 (86차 v0.8: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  const diag = {
    version: "v0.8",
    rpc: "get_stores_admin",
    started_at: new Date().toISOString(),
  };

  try {
    const t0 = Date.now();
    const { data, error } = await supabaseAdmin.rpc("get_stores_admin", {
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
      });
    }

    const rows = Array.isArray(data) ? data : [];
    return res.status(200).json({
      ok: true,
      diag: { ...diag, rpc_ok: true, rpc_ms: ms },
      rows,
      count: rows.length,
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
    });
  }
}
