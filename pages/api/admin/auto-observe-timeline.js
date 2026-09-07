// pages/api/admin/auto-observe-timeline.js
// OBSERVATION-AUTO-DASHBOARD-01 v0.1 — 단건 자동관측 이력 (신규)
//
// ★ 같은 날 복수 관측행을 병합·중복제거하지 않는다. survival_log 원본 그대로 시간순 반환한다.
//   (인수인계 §4: 같은 날 관측값이 실제로 변한다. 2125 07:10 미노출 → 08:24 rel 12)
// - 단건이므로 전량 조회 허용. 상한만 둔다.
// - publish_metrics 무접촉. 수동관측값과 섞지 않는다.
//
// GET /api/admin/auto-observe-timeline?publish_id=2125

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

const ROW_CAP = 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const guard = await requireRole(req, res, ROLES.ADMIN);
  if (!guard) return;

  const publishId = parseInt(req.query.publish_id, 10);
  if (!Number.isFinite(publishId)) {
    return res.status(400).json({ ok: false, error: 'PUBLISH_ID_REQUIRED' });
  }

  try {
    const { data: post, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, industry, cluster, core_keyword, title, region, treatment_name, published_at, naver_post_url')
      .eq('id', publishId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!post) return res.status(404).json({ ok: false, error: 'NOT_FOUND' });

    const { data: logs, error: sErr } = await supabaseAdmin
      .from('survival_log')
      .select('id, observed_at, rel_rank, is_alive, fossil_flag, rank_basis, note')
      .eq('publish_id', publishId)
      .order('observed_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(ROW_CAP);
    if (sErr) throw sErr;

    // 직전 행 대비 변화. 미노출↔노출은 숫자 증감으로 만들지 않는다.
    let prev = null;
    const items = (logs || []).map((r) => {
      let delta = { kind: 'first', value: null };
      if (prev) {
        const a = prev.rel_rank, b = r.rel_rank;
        if (a == null && b == null) delta = { kind: 'none_hold', value: null };
        else if (a == null && b != null) delta = { kind: 'entered', value: null };
        else if (a != null && b == null) delta = { kind: 'dropped_out', value: null };
        else {
          const d = a - b;
          delta = { kind: d === 0 ? 'flat' : d > 0 ? 'up' : 'down', value: d };
        }
      }
      prev = r;
      return {
        id: r.id,
        observed_at: r.observed_at,
        rel_rank: r.rel_rank,
        is_alive: r.is_alive,
        fossil_flag: r.fossil_flag,
        rank_basis: r.rank_basis,
        note: r.note,
        delta,
      };
    });

    return res.status(200).json({
      ok: true,
      post: {
        publish_id: post.id,
        core_keyword: post.core_keyword || null, // NULL 대체 금지
        industry: post.industry || null,
        cluster: post.cluster || null,
        title: post.title || null,
        region: post.region || null,
        treatment_name: post.treatment_name || null,
        published_at: post.published_at,
        naver_post_url: post.naver_post_url || null,
      },
      items,
      meta: { source: 'survival_log', count: items.length, row_cap_hit: items.length >= ROW_CAP },
    });
  } catch (e) {
    console.error('[auto-observe-timeline] ', e);
    return res.status(500).json({ ok: false, error: 'INTERNAL', detail: String(e?.message || e) });
  }
}
