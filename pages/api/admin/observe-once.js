// pages/api/admin/observe-once.js
// 86차 v0.4: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - createClient / supabaseAuth / OWNER_UID import 제거
// - POST 본문 / publish_metrics INSERT / days 계산 무변경 (비즈니스 freeze)
//
// 85차 v0.3: Bearer 토큰 검증 + OWNER_UID 가드 (84차 표준 패턴)
// 48차 v0.1: 수동 관측 1회 입력 — publish_metrics INSERT

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const ALIVE_VALUES = ['alive', 'fossil', 'gone', 'unknown'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.4: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    const body = req.body || {};
    const {
      publish_id,
      alive_status,
      observed_rank,
      observed_keyword,
      fossil_observed,
      observed_date,        // 'YYYY-MM-DD' optional
      keyword_rank_type,    // 'longtail' | 'mid' | 'main' optional
      exposure_note,        // optional free text
      fossil_note,          // optional
      ai_smell_note,        // optional
    } = body;

    // 1. 필수 검증
    if (!publish_id || typeof publish_id !== 'number') {
      return res.status(400).json({ ok: false, error: 'INVALID_PUBLISH_ID', hint: 'number required' });
    }
    if (!alive_status || !ALIVE_VALUES.includes(alive_status)) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_ALIVE_STATUS',
        hint: `must be one of ${ALIVE_VALUES.join(', ')}`,
      });
    }

    // 2. publish_history 존재 확인 + published_at 가져오기 (days 계산용)
    const { data: post, error: postErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, created_at, published_at')
      .eq('id', publish_id)
      .maybeSingle();

    if (postErr) throw postErr;
    if (!post) {
      return res.status(404).json({ ok: false, error: 'PUBLISH_NOT_FOUND', publish_id });
    }

    // 3. observed_date 기본값 = 오늘 (KST 기준 YYYY-MM-DD)
    const today = new Date();
    const ymd = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const obsDate = observed_date || ymd(today);

    // 4. days_since_publish 자동 계산 (published_at > created_at 우선)
    const baseDateStr = post.published_at || post.created_at;
    let daysSince = null;
    if (baseDateStr) {
      const base = new Date(baseDateStr);
      const obs = new Date(obsDate + 'T00:00:00');
      const diffMs = obs.getTime() - base.getTime();
      daysSince = Math.max(0, Math.floor(diffMs / (24 * 3600 * 1000)));
    }

    // 5. fossil_observed 정규화 — 문자열이면 배열로, 빈값은 null
    let fossilArr = null;
    if (Array.isArray(fossil_observed)) {
      fossilArr = fossil_observed.filter(x => x && String(x).trim() !== '');
      if (fossilArr.length === 0) fossilArr = null;
    } else if (typeof fossil_observed === 'string' && fossil_observed.trim() !== '') {
      fossilArr = fossil_observed.split(',').map(s => s.trim()).filter(Boolean);
      if (fossilArr.length === 0) fossilArr = null;
    }

    // 6. INSERT
    const insertRow = {
      publish_id,
      observed_date: obsDate,
      days_since_publish: daysSince,
      keyword_rank_type: keyword_rank_type || null,
      observed_rank: (observed_rank ?? null) === null ? null : Number(observed_rank),
      observed_keyword: observed_keyword || null,
      alive_status,
      exposure_note: exposure_note || null,
      ai_smell_note: ai_smell_note || null,
      fossil_observed: fossilArr,
      fossil_note: fossil_note || null,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('publish_metrics')
      .insert(insertRow)
      .select()
      .single();

    if (insErr) throw insErr;

    return res.status(200).json({
      ok: true,
      inserted,
      computed: {
        days_since_publish: daysSince,
        observed_date: obsDate,
        base_date: baseDateStr,
      },
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[observe-once] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'OBSERVE_ONCE_FAILED',
      detail: e.message,
    });
  }
}
