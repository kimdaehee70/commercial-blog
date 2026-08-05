// pages/api/admin/publish-correct-url.js
// 120차 신규: 보정 길A — naver_post_url 사후 주입 전용 경로
// - publish.js / publish-status.js / publish-secure.js 무수정 (전부 FREEZE 유지)
// - publish-status.js 가드/응답 패턴 차용 (requireOwner, supabaseAdmin)
// - publish_history 단일행 UPDATE만. naver_post_url 채우고 publish_status=published 전환.
// - URL 누락 유령글(예: id=13) 복구 전용. 정상 발행 게이트(publish.js의 naver_post_url 필수)는 무변경.
//
// 컬럼 실측(2026-05-26): publish_status=text(enum 아님), naver_post_url=text, id=bigint=number.
// publish_history에 'status' 컬럼 없음 → publish-status.js와 대상 컬럼 다름.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

// 네이버 블로그 URL만 허용 (오주입 차단)
function isValidNaverPostUrl(u) {
  if (typeof u !== 'string') return false;
  const s = u.trim();
  if (s.length < 10 || s.length > 500) return false;
  try {
    const url = new URL(s);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return /(^|\.)naver\.com$/.test(url.hostname) || /(^|\.)blog\.naver\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // --- 가드 (publish-status.js와 동일: requireOwner) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  const body = req.body || {};
  const publishId = Number(body.publish_id);
  const naverPostUrl = typeof body.naver_post_url === 'string' ? body.naver_post_url.trim() : '';

  // id number 강제 (account.id/publish_history.id = bigint = number)
  if (!Number.isInteger(publishId) || publishId <= 0) {
    return res.status(400).json({ ok: false, error: 'invalid_publish_id' });
  }
  if (!isValidNaverPostUrl(naverPostUrl)) {
    return res.status(400).json({ ok: false, error: 'invalid_naver_post_url' });
  }

  try {
    // 단일행 선조회 — 존재 + URL 누락 상태 확인 (이미 URL 있으면 덮어쓰기 차단)
    const { data: row, error: selErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, publish_status, naver_post_url, title, keyword')
      .eq('id', publishId)
      .single();

    if (selErr) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }

    const existing = row.naver_post_url;
    if (existing && existing.trim() !== '') {
      return res.status(409).json({
        ok: false,
        error: 'url_already_set',
        current: existing,
      });
    }

    // 단일행 UPDATE: URL 주입 + published 전환
    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .update({ naver_post_url: naverPostUrl, publish_status: 'published' })
      .eq('id', publishId)
      .select('id, publish_status, naver_post_url, title, keyword')
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      corrected: data,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
