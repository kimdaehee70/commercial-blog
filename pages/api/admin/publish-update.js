// pages/api/admin/publish-update.js
// v0.1 (세션85) — 발행 행 수정. 범위 제한.
//
// 허용: title(오탈자 수준) · publish_status
// 금지: content · keyword · industry · region · 이미지 · 엔진 결과 일체
//
// 금지 이유 (세션85 확정):
//   관측 데이터는 '발행 당시 콘텐츠'를 기준으로 축적된다.
//   같은 publish_id 인데 본문이 달라지면 ORBIT 상관분석(QC × 관측)의 전제가 깨진다.
//   본문을 바꿀 정도면 새 글 생성 → 새 publish 가 맞다.
//   → 이 API 는 화이트리스트 방식이다. 필드를 늘릴 때 위 문단을 먼저 읽는다.
//
// URL 은 여기서 다루지 않는다: 신규 등록 = publish-correct-url.js / 교체 = publish-republish.js
//
// ⚠ publish_status 는 publish_history_publish_status_check 로 값이 고정돼 있다(세션85 실측).
//   허용값: baseline generated published observed failed pending test
//   'deleted' 는 없다 — 삭제는 deleted_at 축이 담당한다(publish-delete.js).
//
// ⚠ publish-status.js 와 혼동 금지. 그 파일은 존재하지 않는 컬럼(status/first_seen_at/
//   latest_alive_at/survival_hours)을 참조하는 잠복 버그 상태다(세션85 발견, 별도 이월).
//
// 스키마 무변경. 엔진 무접촉.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

// DB CHECK 제약과 일치시킨다. 여기만 늘리면 23514 로 떨어진다.
const ALLOWED_STATUS = [
  'baseline', 'generated', 'published', 'observed', 'failed', 'pending', 'test',
];

const TITLE_MAX = 200;

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const body = req.body || {};
  const { publish_id } = body;
  if (!publish_id) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }

  // 화이트리스트 — 정의되지 않은 키는 조용히 버린다.
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const t = String(body.title || '').trim();
    if (!t) return res.status(400).json({ ok: false, error: 'empty_title' });
    if (t.length > TITLE_MAX) {
      return res.status(400).json({ ok: false, error: 'title_too_long', max: TITLE_MAX });
    }
    patch.title = t;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'publish_status')) {
    const s = String(body.publish_status || '');
    if (!ALLOWED_STATUS.includes(s)) {
      return res.status(400).json({ ok: false, error: 'invalid_publish_status', allowed: ALLOWED_STATUS });
    }
    patch.publish_status = s;
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ ok: false, error: 'nothing_to_update' });
  }
  patch.updated_at = new Date().toISOString();

  try {
    const { data: cur, error: e0 } = await supabaseAdmin
      .from('publish_history')
      .select('id, deleted_at')
      .eq('id', publish_id)
      .maybeSingle();
    if (e0) throw e0;
    if (!cur) return res.status(404).json({ ok: false, error: 'not_found' });
    if (cur.deleted_at) return res.status(409).json({ ok: false, error: 'row_deleted' });

    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .update(patch)
      .eq('id', publish_id)
      .select('id, title, industry, publish_status, naver_post_url, updated_at')
      .single();
    if (error) throw error;

    return res.status(200).json({
      ok: true,
      updated: data,
      fields: Object.keys(patch).filter((k) => k !== 'updated_at'),
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[publish-update] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
