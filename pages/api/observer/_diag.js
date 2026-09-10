// pages/api/observer/_diag.js
// OBS-VERCEL-EGRESS-DIAG-01 — 진단 전용 일회성 엔드포인트. 원인 확정 후 삭제.
// 조건: 기존 파일 무수정 · DB write 0 · DDL 0 · 네이버 fetch 1회 · HTML 본문 미반환.
// 인증: ADMIN. 기존 admin API와 동일 패턴.

import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

const TIMEOUT_MS = 15000;

export default async function handler(req, res) {
  const guard = await requireRole(req, res, ROLES.ADMIN);
  if (!guard) return;

  const kw = String(req.query.kw || '노원구 법무사').trim();
  const url =
    'https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&query=' +
    encodeURIComponent(kw);

  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

  try {
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
      status: null,
      response_bytes: null,
      elapsed_ms: Date.now() - t0,
      error_name: e?.name || null,
      error_message: [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(' | ') || null,
      scrape_live: process.env.OBSERVER_SCRAPE_LIVE === 'true',
    });
  } finally {
    clearTimeout(timer);
  }
}