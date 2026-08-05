// pages/api/admin/observe-quick.js
// 100차 v0.3: alive_status 미지정 시 기본값 'alive' → 'unknown' (가짜 alive 차단, observe-batch 100차와 대칭, 판정규칙 v1 정합)
//   - 신호 4종 미수신·환산 없음 = 단순 baseline INSERT 도구. 명시 파라미터로만 alive 기록.
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드
// - uid 쿼리/x-uid 헤더 분기 제거 (Bearer single truth)
// - getUser(token) → 401 / OWNER_UID 비교 → 403
// - INSERT 로직 / 기본값 / days_since_publish 계산 무변경
//
// 48차 v0.1: 관측 입력 자동화 최소 버전 (publish_metrics baseline INSERT)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const ALIVE_VALUES = ['alive', 'fossil', 'gone', 'unknown'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 인증 + owner 가드 — requireOwner (guards.js 통합 / 85차 단일화) ---
  //     인라인 가드와 응답 포맷 100% 동치 (UNAUTHORIZED/FORBIDDEN, not_owner, anon key).
  const user = await requireOwner(req, res);
  if (!user) return; // res 이미 전송됨 (401/403)
  const authUserId = user.id;

  try {
    const q = req.query || {};

    // 1. publish_id 필수
    const publishIdRaw = q.publish_id;
    const publish_id = Number(publishIdRaw);
    if (!publishIdRaw || !Number.isFinite(publish_id) || publish_id <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_PUBLISH_ID',
        hint: 'usage: /api/admin/observe-quick?publish_id=2',
      });
    }

    // 2. 옵션 — 모두 기본값 있음
    const alive_status = (q.alive_status && ALIVE_VALUES.includes(q.alive_status))
      ? q.alive_status
      : 'unknown'; // 100차: 미지정 시 'alive' 하드기본 → 'unknown' (가짜 alive 차단, batch와 대칭, v1 정합)

    const observed_rank = q.observed_rank !== undefined && q.observed_rank !== ''
      ? Number(q.observed_rank)
      : null;

    const observed_keyword = q.observed_keyword || null;
    const keyword_rank_type = q.keyword_rank_type || null;

    // 3. publish_history 존재 확인 + 발행일
    const { data: post, error: postErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, created_at, published_at')
      .eq('id', publish_id)
      .maybeSingle();

    if (postErr) throw postErr;
    if (!post) {
      return res.status(404).json({ ok: false, error: 'PUBLISH_NOT_FOUND', publish_id });
    }

    // 4. observed_date = today (server 기준)
    const today = new Date();
    const ymd = (d) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const obsDate = ymd(today);

    // 5. days_since_publish 자동 계산
    const baseDateStr = post.published_at || post.created_at;
    let daysSince = null;
    if (baseDateStr) {
      const base = new Date(baseDateStr);
      const obs = new Date(obsDate + 'T00:00:00');
      const diffMs = obs.getTime() - base.getTime();
      daysSince = Math.max(0, Math.floor(diffMs / (24 * 3600 * 1000)));
    }

    // 6. INSERT
    const insertRow = {
      publish_id,
      observed_date: obsDate,
      days_since_publish: daysSince,
      keyword_rank_type,
      observed_rank: observed_rank !== null && Number.isFinite(observed_rank) ? observed_rank : null,
      observed_keyword,
      alive_status,
      exposure_note: 'observe-quick (auto baseline)',
      ai_smell_note: null,
      fossil_observed: null,
      fossil_note: null,
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('publish_metrics')
      .insert(insertRow)
      .select()
      .single();

    if (insErr) throw insErr;

    return res.status(200).json({
      ok: true,
      mode: 'quick',
      publish: { id: post.id, title: post.title },
      inserted,
      computed: {
        observed_date: obsDate,
        days_since_publish: daysSince,
        base_date: baseDateStr,
      },
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[observe-quick] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'OBSERVE_QUICK_FAILED',
      detail: e.message,
    });
  }
}
