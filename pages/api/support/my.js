// pages/api/support/my.js
// 세션96 v0.1 — 내 접수내역 (마이페이지)
//
// account_id 는 토큰에서 해석한다. 클라이언트가 보낸 account_id 는 절대 신뢰하지 않는다 —
// 그 한 줄이 남의 접수·답변을 열람하는 경로가 된다.
//
// 요청:  GET
// 응답:  { ok, rows: [{id,kind,title,content,status,admin_reply,created_at,answered_at}] }

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAccount } from '../../../lib/guards';

const LIMIT = 100;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  try {
    const { data, error } = await supabaseAdmin
      .from('support_requests')
      .select('id, kind, title, content, status, admin_reply, created_at, answered_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (error) throw error;

    return res.status(200).json({ ok: true, rows: data || [] });
  } catch (e) {
    console.error('[support/my] error:', e);
    return res.status(500).json({ ok: false, error: 'LOAD_FAILED', detail: e.message, rows: [] });
  }
}
