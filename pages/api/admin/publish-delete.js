// pages/api/admin/publish-delete.js
// v0.1 (세션85) — Soft Delete / 복원.
//
// 원칙: 관측은 AI-POST 의 자산이다. 발행 행을 지워도
//   publish_metrics · post_ranks · Timeline · 관측 이력은 남는다.
//   목록에서 숨기는 것이 삭제의 전부다. hard delete 경로는 이 파일에 없다.
//
// 축 선택 근거 (세션85 실측):
//   publish_history 에 삭제 축이 없었다. publish_status 재사용은 CHECK 제약 위반이고
//   (허용값 7종에 'deleted' 없음), 허용값을 늘리면 발행 축에 삭제 축이 섞인다
//   — 그러면 「삭제된 published」를 표현할 수 없다.
//   → deleted_at timestamptz NULL 신설(ALTER 1건, 사용자 승인). Additive 라 기존 119행 무영향.
//
// 복원: restore=true → deleted_at = NULL. 되돌리는 비용이 1컬럼인 것이 이 설계의 요점이다.
//
// 엔진 무접촉.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const { publish_id, restore } = req.body || {};
  if (!publish_id) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }
  const isRestore = restore === true;

  try {
    const { data: cur, error: e0 } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, deleted_at')
      .eq('id', publish_id)
      .maybeSingle();
    if (e0) throw e0;
    if (!cur) return res.status(404).json({ ok: false, error: 'not_found' });

    if (isRestore && !cur.deleted_at) {
      return res.status(409).json({ ok: false, error: 'not_deleted' });
    }
    if (!isRestore && cur.deleted_at) {
      return res.status(409).json({ ok: false, error: 'already_deleted', at: cur.deleted_at });
    }

    // 보존 사실을 응답에 담는다 — 관리자가 "관측까지 지워지나"를 화면에서 확인할 수 있어야 한다.
    const { count: obsCount } = await supabaseAdmin
      .from('publish_metrics')
      .select('id', { count: 'exact', head: true })
      .eq('publish_id', publish_id);

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .update({ deleted_at: isRestore ? null : now, updated_at: now })
      .eq('id', publish_id)
      .select('id, title, publish_status, naver_post_url, deleted_at')
      .single();
    if (error) throw error;

    return res.status(200).json({
      ok: true,
      mode: isRestore ? 'restore' : 'delete',
      row: data,
      observation_preserved: obsCount || 0,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[publish-delete] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
