// pages/api/admin/publish-status.js
// v0.4 (세션86) — 잠복 버그 수정. 이 API 는 존재하지 않는 컬럼 4종을 참조하고 있었다.
//   실측(세션85): publish_history 31컬럼 중 status / first_seen_at / latest_alive_at / survival_hours 부재.
//   → UPDATE 대상 자체가 없어 호출 시 500. SHOW_ALIVE_SELECT=false 라 화면에서 미발현이었을 뿐이다.
//
//   원인은 오타가 아니라 축 혼선이다. pending/alive/fading/dead 는 「우리 글의 성과」이므로
//   관측 축(publish_metrics.alive_status)에 속한다. 발행 축(publish_history)에 있던 적이 없다.
//   → 쓰기 대상을 publish_metrics 최신 회차로 옮긴다. ALTER 0. 관측 정본 유지(DEC-005).
//
//   관측 이력이 없는 글은 생존 상태를 바꾸지 않는다(409). 없는 회차를 만들어 넣으면
//   「관측하지 않았는데 생존 판정이 있는 글」이 생겨 표본이 오염된다. 순위 입력이 먼저다.
//
//   생존시간은 저장값이 아니라 파생값이다. published_at 에서 계산해 응답에만 싣는다.
//   DEC-007 준수 — 파일을 삭제하지 않는다. 관측 개시 시 SHOW_ALIVE_SELECT 로 되살릴 경로다.
//
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const ALLOWED = ['pending', 'alive', 'fading', 'dead'];
const DAY = 864e5;

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const { publish_id, status } = req.body || {};
  if (!publish_id || !ALLOWED.includes(status)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  try {
    // 1. 발행 행 — 존재 확인 + 파생 계산 기준값. 실재 컬럼만 select 한다.
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, industry, publish_status, published_at, created_at, deleted_at')
      .eq('id', publish_id)
      .single();
    if (rowErr) throw rowErr;
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });

    // 2. 관측 최신 회차 — 생존 상태의 실제 소재지.
    const { data: obs, error: obsErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('id, alive_status, observed_date, created_at')
      .eq('publish_id', publish_id)
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);
    if (obsErr) throw obsErr;

    const latest = (obs || [])[0] || null;
    if (!latest) {
      // 관측 없이 생존만 바꾸지 않는다. 표본 오염 방지.
      return res.status(409).json({ ok: false, error: 'no_observation' });
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from('publish_metrics')
      .update({ alive_status: status })
      .eq('id', latest.id)
      .select('id, publish_id, alive_status, observed_date, observed_rank')
      .single();
    if (upErr) throw upErr;

    // 3. 생존시간 — 파생값. 저장하지 않는다.
    const base = row.published_at || row.created_at;
    const survival_hours = base ? Math.floor((Date.now() - new Date(base).getTime()) / 36e5) : null;

    return res.status(200).json({
      ok: true,
      snapshot: {
        id: row.id,
        title: row.title,
        industry: row.industry,
        publish_status: row.publish_status,
        published_at: row.published_at,
        created_at: row.created_at,
        alive_status: updated.alive_status,
        latest_observed_at: updated.observed_date,
        observed_rank: updated.observed_rank,
        survival_hours,
        survival_days: survival_hours == null ? null : Math.floor(survival_hours / 24),
      },
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[publish-status] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
