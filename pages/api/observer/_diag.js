// pages/api/observer/_diag.js
// OBS-VERCEL-EGRESS-DIAG-01 / OBS-VERCEL-SELF-CALL-DIAG-01 — 진단 전용. 원인 확정 후 삭제.
// 기존 파일 무수정 · DDL 0 · 반복 호출 금지.
//   mode=egress (기본) : 네이버 fetch 1회
//   mode=self          : tick 과 동일 방식 self-call 1회 (publish_id 고정)

import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

const TIMEOUT_MS = 15000;

// tick.js originOf() 와 동일 로직 (복사, 원본 무수정)
function originOf(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const guard = await requireRole(req, res, ROLES.ADMIN);
  if (!guard) return;

  const mode = String(req.query.mode || 'egress');
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
    if (mode === 'self') {
      const origin = originOf(req);
      const r = await fetch(`${origin}/api/observer/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: 2131 }),
        signal: ac.signal,
      });
      const body = await r.text();
      return res.status(200).json({
        ok: true,
        mode: 'self',
        origin,
        status: r.status,
        response_bytes: body.length,
        elapsed_ms: Date.now() - t0,
        error_name: null,
        error_message: null,
      });
    }

    const url =
      'https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&query=' +
      encodeURIComponent(String(req.query.kw || '노원구 법무사').trim());
    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ' +
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: ac.signal,
    });
    const html = await r.text();
    return res.status(200).json({
      ok: true,
      mode: 'egress',
      status: r.status,
      response_bytes: html.length,
      elapsed_ms: Date.now() - t0,
      error_name: null,
      error_message: null,
      scrape_live: process.env.OBSERVER_SCRAPE_LIVE === 'true',
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      mode,
      status: null,
      response_bytes: null,
      elapsed_ms: Date.now() - t0,
      error_name: e?.name || null,
      error_message: [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(' | ') || null,
    });
  } finally {
    clearTimeout(timer);
  }
}