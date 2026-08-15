// pages/api/admin/publish-purge.js
// v0.1 (세션171) — 운영자 미발행 테스트 기록 전용 Hard Delete.
//
// 원칙: publish-delete.js(Soft) 를 대체하지 않는다. 조건을 통과한 건만 물리 삭제하고,
//   하나라도 어긋나면 그 건은 Soft Delete 로 폴백한다. 삭제 규칙 판정은 전부 서버에서 한다.
//   클라이언트가 "테스트다"라고 보낸 주장은 신뢰하지 않는다.
//
// ★ FK 실측 (2026-08-15, information_schema):
//     publish_metrics.publish_id  → ON DELETE CASCADE
//     survival_log.publish_id     → ON DELETE CASCADE
//   즉 DB 가 연쇄 삭제한다. 관측 보존 계약은 코드 게이트가 유일한 방어선이다.
//   두 테이블에 1건이라도 있으면 hard delete 금지 — 이 게이트를 제거하면 관측 자산이 사라진다.
//
// ★ 대상 축소 근거 (실측): 미발행 무관측 행 1,732건에 account_id 14종이 섞여 있다.
//   전량 purge 경로는 만들지 않는다. 화면에서 선택한 id 만 받는다.
//
// 게이트 5종 — 전부 통과해야 hard delete:
//   ① requireRole(owner)          ② account_id = 요청자 본인 account
//   ③ naver_post_url IS NULL      ④ publish_metrics 0건
//   ⑤ survival_log 0건
//
// 엔진 무접촉. 스키마 변경 없음.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

const MAX_IDS = 200;   // 1회 호출 상한. 대량 정리는 여러 번 나눠 부른다.

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE' && req.method !== 'PATCH') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // ① OWNER 게이트 — requireOwner 는 account 를 돌려주지 않아 ② 를 못 만든다.
  const ctx = await requireRole(req, res, ROLES.OWNER);
  if (!ctx) return;
  const myAccountId = ctx.account?.id ?? null;
  if (myAccountId == null) {
    return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
  }

  const raw = (req.body || {}).publish_ids;
  const ids = Array.isArray(raw) ? [...new Set(raw.filter((v) => v != null))] : [];
  if (!ids.length) return res.status(400).json({ ok: false, error: 'invalid_input' });
  if (ids.length > MAX_IDS) {
    return res.status(400).json({ ok: false, error: 'too_many_ids', max: MAX_IDS });
  }

  const purged = [];   // 물리 삭제 완료
  const softed = [];   // 게이트 위반 → 숨김 처리로 폴백
  const failed = [];   // 오류

  try {
    for (const id of ids) {
      // ── 행 실측. 존재하지 않으면 건너뛴다.
      const { data: row, error: e0 } = await supabaseAdmin
        .from('publish_history')
        .select('id, account_id, naver_post_url, deleted_at')
        .eq('id', id)
        .maybeSingle();
      if (e0) { failed.push({ id, reason: e0.message }); continue; }
      if (!row) { failed.push({ id, reason: 'not_found' }); continue; }

      // ② 본인 계정 소유인가
      const reasons = [];
      if (row.account_id !== myAccountId) reasons.push('not_own_account');
      // ③ 외부 발행 URL 이 있으면 테스트 기록이 아니다
      if (row.naver_post_url) reasons.push('has_url');

      // ④⑤ 관측·생존 데이터 — CASCADE 대상이므로 1건이라도 있으면 즉시 탈락
      if (!reasons.length) {
        const { count: mCount, error: e1 } = await supabaseAdmin
          .from('publish_metrics')
          .select('id', { count: 'exact', head: true })
          .eq('publish_id', id);
        if (e1) { failed.push({ id, reason: e1.message }); continue; }
        if (mCount) reasons.push(`has_metrics(${mCount})`);

        const { count: sCount, error: e2 } = await supabaseAdmin
          .from('survival_log')
          .select('id', { count: 'exact', head: true })
          .eq('publish_id', id);
        if (e2) { failed.push({ id, reason: e2.message }); continue; }
        if (sCount) reasons.push(`has_survival(${sCount})`);
      }

      // ── 게이트 위반 → Soft Delete 폴백. 데이터는 남기고 목록에서만 숨긴다.
      if (reasons.length) {
        if (!row.deleted_at) {
          const now = new Date().toISOString();
          const { error: e3 } = await supabaseAdmin
            .from('publish_history')
            .update({ deleted_at: now, updated_at: now })
            .eq('id', id);
          if (e3) { failed.push({ id, reason: e3.message }); continue; }
        }
        softed.push({ id, reasons });
        continue;
      }

      // ── 전 게이트 통과 → 물리 삭제
      const { error: e4 } = await supabaseAdmin
        .from('publish_history')
        .delete()
        .eq('id', id);
      if (e4) { failed.push({ id, reason: e4.message }); continue; }
      purged.push(id);
    }

    return res.status(200).json({
      ok: true,
      requested: ids.length,
      purged_count: purged.length,
      soft_deleted_count: softed.length,
      failed_count: failed.length,
      purged,
      soft_deleted: softed,
      failed,
      verified: { auth_user_id: ctx.user.id, account_id: myAccountId, role: ctx.role },
    });
  } catch (e) {
    console.error('[publish-purge] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
