// pages/api/admin/support-reply.js
// 세션96 v0.1 — 답변 작성 / 상태 변경 (owner 전용)
//
// 답변과 상태를 한 API 로 묶는다. 두 개로 나누면 "답변은 저장됐는데 상태가 pending" 같은
// 중간 상태가 반드시 생긴다 — 운영자는 그걸 답변 누락으로 읽는다.
//
// 요청:  POST { id, admin_reply?, status? }
//   · admin_reply 만 오면 status 는 answered 로 자동 승격(이미 completed 면 유지).
//   · status 만 오면 답변 본문은 건드리지 않는다.
// 응답:  { ok, request }

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';
import { SUPPORT_STATUS_LIST } from '../../../lib/supportKinds';

const MAX_REPLY = 4000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const { id, admin_reply, status } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'ID_REQUIRED' });

    const { data: target, error: tErr } = await supabaseAdmin
      .from('support_requests')
      .select('id, account_id, kind, title, status, admin_reply')
      .eq('id', id)
      .maybeSingle();

    if (tErr) throw tErr;
    if (!target) return res.status(404).json({ ok: false, error: 'TARGET_NOT_FOUND' });

    const updates = { updated_at: new Date().toISOString() };

    if (admin_reply !== undefined) {
      const v = String(admin_reply || '').trim();
      if (v.length > MAX_REPLY) {
        return res.status(400).json({
          ok: false, error: 'REPLY_TOO_LONG',
          message: `답변은 ${MAX_REPLY}자 이내로 입력해 주세요.`,
        });
      }
      updates.admin_reply = v || null;

      // 답변이 처음 붙는 순간에만 answered_at 을 찍는다. 수정할 때마다 갱신하면
      // 사용자 화면의 "답변일"이 계속 미래로 밀린다.
      if (v && !target.admin_reply) updates.answered_at = new Date().toISOString();
      if (!v) updates.answered_at = null;

      if (status === undefined && v && target.status === 'pending') {
        updates.status = 'answered';
      }
    }

    if (status !== undefined) {
      if (!SUPPORT_STATUS_LIST.includes(status)) {
        return res.status(400).json({ ok: false, error: 'INVALID_STATUS', allowed: SUPPORT_STATUS_LIST });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length <= 1) {
      return res.status(400).json({ ok: false, error: 'NO_UPDATES' });
    }

    const { data: updated, error: uErr } = await supabaseAdmin
      .from('support_requests')
      .update(updates)
      .eq('id', id)
      .select('id, account_id, kind, title, content, status, admin_reply, created_at, answered_at')
      .single();

    if (uErr) throw uErr;

    await writeAudit({
      actor: user,
      actor_role: 'owner',
      action: 'support.reply',
      target_type: 'support_request',
      target_id: String(id),
      before: { status: target.status, has_reply: !!target.admin_reply },
      after: { status: updated.status, has_reply: !!updated.admin_reply },
      detail: { kind: target.kind, account_id: target.account_id },
    });

    return res.status(200).json({ ok: true, request: updated });
  } catch (e) {
    console.error('[support-reply] error:', e);
    return res.status(500).json({ ok: false, error: 'REPLY_FAILED', detail: e.message });
  }
}
