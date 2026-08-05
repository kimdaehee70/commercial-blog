// pages/api/admin/audit-list.js
// audit v0.1 신규 — audit_logs 조회 (owner 전용)
// 가드: requireOwner (admin API 통일 패턴)
// 정책: SELECT-only / 최신순 / 필터(action, target_type) / 페이지네이션(limit, before_id)
//
// 사용처: pages/admin/audit.js (보드)
//
// FREEZE 무관 — 신규 파일.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    // ── 쿼리 파라미터 ─────────────────────────────────────────
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const action = req.query.action || null;           // 예: 'account.set_role'
    const target_type = req.query.target_type || null; // 예: 'account'
    const before_id = req.query.before_id ? parseInt(req.query.before_id, 10) : null; // 커서

    // ── 쿼리 빌드 ─────────────────────────────────────────────
    let q = supabaseAdmin
      .from('audit_logs')
      .select('id, actor_id, actor_email, actor_role, action, target_type, target_id, before, after, detail, status, error_message, created_at')
      .order('id', { ascending: false })
      .limit(limit);

    if (action) q = q.eq('action', action);
    if (target_type) q = q.eq('target_type', target_type);
    if (before_id && !isNaN(before_id)) q = q.lt('id', before_id);

    const { data, error } = await q;

    if (error) {
      // 테이블 미존재(42P01) 시 친절한 안내 — DDL 실행 전 상태
      const tableMissing = error.code === '42P01';
      return res.status(200).json({
        ok: false,
        error: tableMissing ? 'AUDIT_TABLE_MISSING' : 'QUERY_FAILED',
        detail: error.message,
        hint: tableMissing ? 'audit_logs.sql DDL 을 Supabase 에서 먼저 실행하세요.' : null,
        rows: [],
        count: 0,
      });
    }

    const rows = Array.isArray(data) ? data : [];
    return res.status(200).json({
      ok: true,
      rows,
      count: rows.length,
      next_before_id: rows.length === limit ? rows[rows.length - 1].id : null, // 다음 페이지 커서
      checked_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[audit-list] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'AUDIT_LIST_FAILED',
      detail: String(e?.message || e),
      rows: [],
      count: 0,
    });
  }
}
