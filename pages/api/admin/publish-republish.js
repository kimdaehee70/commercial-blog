// pages/api/admin/publish-republish.js
// v0.1 (세션85) — 재발행. 엔진 무접촉.
//
// 「재발행」의 정의 (세션85 확정):
//   URL 재연결 + 발행 상태 갱신 까지만. AI 글 재생성은 재발행이 아니다(= 새 글 생성).
//   generate*.js / publish.js(엔진) 를 호출하지 않는다. FREEZE 유지.
//
// publish-correct-url.js 와의 차이:
//   correct-url = URL 이 '없는' 행에 사후 주입. 이미 있으면 url_already_set 거부.
//   republish   = URL 이 '있는' 행의 교체. 잘못 등록·글 재작성 후 새 URL 연결이 대상.
//   두 경로를 합치지 않는다 — 거부 조건이 정반대라 합치면 오등록 방어가 사라진다.
//
// ⚠ reset_observation: 기본 false. true 면 publish_metrics 행을 실제 삭제한다.
//   관측은 AI-POST 의 자산이다. URL 이 바뀌어 이전 관측이 다른 글의 것이 된 경우에만 쓴다.
//   post_ranks(사용자 입력)는 건드리지 않는다 — 두 SoT 유지(DEC-006).
//
// 스키마 무변경. 엔진 무접촉.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const isNaverUrl = (u) => {
  try {
    const h = new URL(u).hostname;
    return /(^|\.)naver\.com$/.test(h);
  } catch {
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const { publish_id, naver_post_url, reset_observation } = req.body || {};
  if (!publish_id) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }
  const url = String(naver_post_url || '').trim();
  if (!url || !isNaverUrl(url)) {
    return res.status(400).json({ ok: false, error: 'invalid_naver_post_url' });
  }

  try {
    // 1. 대상 확인 — 삭제된 행은 재발행 대상이 아니다.
    const { data: cur, error: e0 } = await supabaseAdmin
      .from('publish_history')
      .select('id, naver_post_url, publish_status, deleted_at')
      .eq('id', publish_id)
      .maybeSingle();
    if (e0) throw e0;
    if (!cur) return res.status(404).json({ ok: false, error: 'not_found' });
    if (cur.deleted_at) {
      return res.status(409).json({ ok: false, error: 'row_deleted' });
    }

    const prevUrl = String(cur.naver_post_url || '').trim();
    if (prevUrl && prevUrl === url) {
      return res.status(409).json({ ok: false, error: 'same_url', current: prevUrl });
    }

    // 2. 관측 초기화 — 명시적 요청일 때만. 기본은 보존.
    let removedObs = 0;
    if (reset_observation === true) {
      const { data: del, error: e1 } = await supabaseAdmin
        .from('publish_metrics')
        .delete()
        .eq('publish_id', publish_id)
        .select('id');
      if (e1) throw e1;
      removedObs = (del || []).length;
    }

    // 3. URL 교체 + 발행 상태 갱신
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .update({
        naver_post_url: url,
        publish_status: 'published',
        published_at: now,
        updated_at: now,
      })
      .eq('id', publish_id)
      .select('id, title, industry, naver_post_url, publish_status, published_at, updated_at')
      .single();
    if (error) throw error;

    return res.status(200).json({
      ok: true,
      republished: data,
      previous_url: prevUrl || null,
      observation_removed: removedObs,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[publish-republish] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
