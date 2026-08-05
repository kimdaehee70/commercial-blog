// pages/api/admin/support-delete.js
// 세션97 v0.1 — 접수 완전삭제 (owner 전용, 다중 선택)
//
// [삭제 vs 보관]
//   삭제는 테스트·스팸·중복 전용이다. 실제 고객 문의는 status='archived'(보관)로 내린다.
//   3개월 뒤 "예전에 신청했었는데요" 를 확인할 수 있어야 하므로, 정상 문의를 지우면 그 근거가 사라진다.
//   → 이 API 는 되돌릴 수 없다. UI 에서 반드시 확인 모달을 거칠 것.
//
// [delete-account.js 와 다른 점]
//   support_requests 는 자식 테이블이 없다. FK 순차 삭제가 필요 없어 단순 DELETE 로 끝난다.
//   (accounts 쪽은 NO ACTION FK 4개 때문에 순서를 서버가 소유해야 했다 — 세션96 §2-1)
//
// 요청:  POST { ids: [number, ...] }   (1~50건)
// 응답:  { ok, deleted:[id], skipped:[id], failed:[{id,error}] }
//        · skipped = 이미 없는 행. 목록 갱신 전 재선택 시 발생하며 실패가 아니다(세션96 §2-2).
//        · 일부 실패해도 200. 성공분은 이미 커밋되었다.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';

const MAX_BATCH = 50;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const { ids: rawIds } = req.body || {};

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'IDS_REQUIRED' });
    }
    if (rawIds.length > MAX_BATCH) {
      return res.status(400).json({
        ok: false,
        error: 'TOO_MANY_TARGETS',
        message: `한 번에 최대 ${MAX_BATCH}건까지 삭제할 수 있습니다.`,
      });
    }

    // 중복 제거 — 같은 id 가 두 번 오면 두 번째는 skipped 로 잡혀 혼란만 준다.
    const ids = [...new Set(rawIds.map(Number).filter(Number.isFinite))];
    if (ids.length === 0) {
      return res.status(400).json({ ok: false, error: 'IDS_INVALID' });
    }

    const deleted = [];
    const skipped = [];
    const failed = [];

    for (const id of ids) {
      try {
        // 삭제 전 스냅샷 — audit 에 남기지 않으면 '무엇을 지웠는지' 를 영영 못 찾는다.
        const { data: target, error: tErr } = await supabaseAdmin
          .from('support_requests')
          .select('id, account_id, kind, title, content, status, admin_reply, created_at, answered_at')
          .eq('id', id)
          .maybeSingle();

        if (tErr) throw tErr;
        if (!target) { skipped.push(id); continue; }

        const { error: dErr } = await supabaseAdmin
          .from('support_requests')
          .delete()
          .eq('id', id);
        if (dErr) throw dErr;

        await writeAudit({
          actor: user,
          actor_role: 'owner',
          action: 'support.delete',
          target_type: 'support_request',
          target_id: String(id),
          before: {
            kind: target.kind,
            title: target.title,
            status: target.status,
            account_id: target.account_id,
            created_at: target.created_at,
            content: String(target.content || '').slice(0, 500),
            has_reply: !!target.admin_reply,
          },
          after: null,
          detail: { hard_delete: true },
        });

        console.log(`[support-delete] ✓ id=${id} kind=${target.kind} status=${target.status} by=${user.id}`);
        deleted.push(id);
      } catch (e) {
        console.error(`[support-delete] ✗ id=${id}`, e);
        failed.push({ id, error: e.message || 'DELETE_FAILED' });
      }
    }

    return res.status(200).json({ ok: failed.length === 0, deleted, skipped, failed });
  } catch (e) {
    console.error('[support-delete] error:', e);
    return res.status(500).json({ ok: false, error: 'DELETE_FAILED', detail: e.message });
  }
}
