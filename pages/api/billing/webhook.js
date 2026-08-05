// pages/api/billing/webhook.js
// 세션74 B-4-3 v0.1 — PortOne 웹훅 수신 (서버 경로)
//
// 사용자가 결제 직후 창을 닫아도 이 경로로 최종 상태가 도착한다.
// complete.js와 순서가 보장되지 않으므로 둘 다 settlePayment(멱등)를 호출한다.
//
// ★ 서명 검증을 위해 raw body가 필요하다. Next의 자동 JSON 파싱을 반드시 꺼야 한다.
//   bodyParser가 켜져 있으면 본문이 재직렬화되면서 서명이 불일치한다.

import * as PortOne from '@portone/server-sdk';
import { settlePayment } from '../../../lib/billing/portone';

export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; });
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let raw;
  try {
    raw = await readRaw(req);
  } catch {
    return res.status(400).end();
  }

  // ── 1. 서명 검증 ──
  const secret = process.env.PORTONE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] PORTONE_WEBHOOK_SECRET not configured');
    return res.status(500).end();
  }

  let webhook;
  try {
    webhook = await PortOne.Webhook.verify(secret, raw, req.headers);
  } catch (e) {
    console.warn('[webhook] signature verification failed:', e?.message);
    return res.status(400).end();  // 검증 실패는 처리하지 않는다(위조 가능성)
  }

  // ── 2. 결제 이벤트만 처리. 모르는 타입은 조용히 200 — 재시도를 유발하지 않는다. ──
  const paymentId = webhook?.data?.paymentId;
  if (!paymentId) return res.status(200).end();

  try {
    const result = await settlePayment(paymentId);
    console.log(`[webhook] ${webhook.type} payment_id=${paymentId} → ${result.status}`);
    // 미완료(가상계좌 발급 등)도 200으로 받는다. 다음 이벤트가 다시 온다.
    return res.status(200).end();
  } catch (e) {
    // 5xx를 반환하면 PortOne이 재시도한다. 일시 장애는 재시도로 복구되는 게 맞다.
    console.error('[webhook] settle failed:', e?.message);
    return res.status(500).end();
  }
}
