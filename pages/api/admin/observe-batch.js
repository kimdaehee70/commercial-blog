// pages/api/admin/observe-batch.js
// 100차 v0.4: prev 없을 때 기본값 'alive' → 'unknown' (판정규칙 v1 정합)
//   - 신규/미관측 row가 가짜 alive로 박히던 문제 해결. 신호 4종 미수신 → deriveAliveStatus 불필요(단순 상속 도구).
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - createClient / supabaseAuth / OWNER_UID import 제거
// - batch INSERT 로직 / snapshot 상속 / BATCH_CAP 무변경
//
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드
// 48차 v0.1: 전체 발행 batch 재관측 (snapshot 누적)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const BATCH_CAP = 200;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.3: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    // 1. publish_history 전체
    const { data: posts, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, created_at, published_at')
      .order('id', { ascending: true })
      .limit(BATCH_CAP);

    if (pErr) throw pErr;
    if (!posts || posts.length === 0) {
      return res.status(200).json({ ok: true, mode: 'batch', inserted: 0, message: 'no posts' });
    }

    const ids = posts.map(p => p.id);

    // 2. publish_metrics — publish_id별 최신 1건만 사용
    const { data: metrics, error: mErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('publish_id, alive_status, observed_rank, observed_keyword, keyword_rank_type, observed_date, created_at')
      .in('publish_id', ids)
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (mErr) throw mErr;

    const latestByPid = {};
    for (const m of metrics || []) {
      if (!latestByPid[m.publish_id]) latestByPid[m.publish_id] = m;
    }

    // 3. observed_date = today
    const today = new Date();
    const ymd = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const obsDate = ymd(today);
    const obsMs = new Date(obsDate + 'T00:00:00').getTime();

    // 4. INSERT row 구성 — 직전 관측값 상속, 없으면 unknown (100차)
    const insertRows = posts.map(p => {
      const prev = latestByPid[p.id] || null;
      const baseDateStr = p.published_at || p.created_at;
      let daysSince = null;
      if (baseDateStr) {
        const base = new Date(baseDateStr).getTime();
        daysSince = Math.max(0, Math.floor((obsMs - base) / (24 * 3600 * 1000)));
      }
      return {
        publish_id: p.id,
        observed_date: obsDate,
        days_since_publish: daysSince,
        keyword_rank_type: prev?.keyword_rank_type || null,
        observed_rank: prev?.observed_rank ?? null,
        observed_keyword: prev?.observed_keyword || null,
        alive_status: prev?.alive_status || 'unknown', // 100차: prev 없으면 미관측 → unknown (v1 정합, 가짜 alive 방지)
        exposure_note: 'observe-batch (snapshot)',
        ai_smell_note: null,
        fossil_observed: null,
        fossil_note: null,
      };
    });

    // 5. INSERT (한 번에)
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('publish_metrics')
      .insert(insertRows)
      .select('id, publish_id, alive_status, observed_rank, observed_date, days_since_publish');

    if (insErr) throw insErr;

    // 6. 응답 요약
    const aliveN = (inserted || []).filter(r => r.alive_status === 'alive').length;
    const fossilN = (inserted || []).filter(r => r.alive_status === 'fossil').length;
    const otherN = (inserted || []).length - aliveN - fossilN;

    return res.status(200).json({
      ok: true,
      mode: 'batch',
      observed_date: obsDate,
      total_posts: posts.length,
      inserted_count: (inserted || []).length,
      breakdown: { alive: aliveN, fossil: fossilN, other: otherN },
      inserted: (inserted || []).map(r => ({
        publish_id: r.publish_id,
        alive_status: r.alive_status,
        observed_rank: r.observed_rank,
        days_since_publish: r.days_since_publish,
      })),
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[observe-batch] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'OBSERVE_BATCH_FAILED',
      detail: e.message,
    });
  }
}
