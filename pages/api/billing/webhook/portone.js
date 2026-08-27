/**
 * pages/api/billing/webhook/portone.js
 *
 * 포트원(PortOne) V2 webhook 수신 엔드포인트
 *
 * 책임:
 *  - 포트원에서 전송하는 결제/빌링키 이벤트 수신
 *  - 서명 검증 (@portone/server-sdk 공식 Webhook.verify · fail-closed)
 *  - 이벤트 타입별 분기 → lib/billing/* helper 호출
 *  - 멱등성 보장 — 미구현. WEBHOOK-EVENT-LOG-TABLE-01 축에서 처리.
 *    ★ routeEvent 의 TODO 를 실제 구현으로 바꾸기 전에 반드시 선행 완료할 것.
 *      상태변경 코드가 살아난 상태에서 재시도 중복 수신 = 중복 결제 반영.
 *
 * 수신 이벤트 (V2 공식 6류):
 *  - payment.paid              : 결제 완료
 *  - payment.failed            : 결제 실패
 *  - payment.cancelled         : 결제 전체 취소
 *  - payment.partial_cancelled : 결제 부분 취소
 *  - billing_key.issued        : 빌링키 발급
 *  - billing_key.deleted       : 빌링키 삭제
 *
 * 에러 정책:
 *  - Secret 미설정 → 500 (검증 불가 = 통과 아님. fail-closed)
 *  - 서명 불일치 → 401 (재시도 무의미)
 *  - 본문 파싱 실패 → 400 (재시도 무의미)
 *  - 알 수 없는 event type → 200 (silent ignore)
 *  - 내부 처리 실패 (helper 등) → 5xx (포트원 재시도 유도)
 *  - 정상 처리 → 200
 *
 * env:
 *  - PORTONE_V2_WEBHOOK_SECRET
 *    ★ Vercel 실제 등록명. 구 주석의 PORTONE_WEBHOOK_SECRET 은 오기였음(v0.2 정정).
 *
 * URL (2026-08-27 실측):
 *  - 운영: https://ai-post.ai/api/billing/webhook/portone   ← apex. www. 아님
 *    ★ www. 로 등록하면 308 리다이렉트 구간이 생겨 POST body 유실 위험.
 *      PortOne 콘솔 등록값을 위 문자열과 한 글자까지 일치시킬 것.
 *  - 베타: https://commercial-blog.vercel.app/api/billing/webhook/portone
 *  - 로컬: ngrok 등 외부 노출 필요
 *
 * FREEZE: 라우팅 구조 / 에러 정책 — 본 구현 시 case 본문만 교체
 *
 * v0.2 · 2026-08-27 · WEBHOOK-PORTONE-STUB-SIGNATURE-01
 *   서명검증 stub 제거. 공식 SDK 도입. Secret env 정정. signatureValid 실값 기록.
 *   routeEvent 6 case 및 webhookLog.js 는 무접촉.
 * v0.1 · 71차 · 2026-05-20
 */

import * as PortOne from '@portone/server-sdk';
import { logWebhookEvent } from '../../../../lib/billing/webhookLog';

// raw body 수신 — 서명 검증은 raw 기반 필수 (bodyParser 를 켜면 검증 불가)
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * raw body 를 Buffer 로 수집 후 string 반환
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<string>}
 */
async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * 포트원 V2 서명 검증
 *
 * 규격: Standard Webhooks. 헤더 3종(webhook-id / webhook-timestamp / webhook-signature)이
 * 모두 있어야 성립하므로 개별 헤더를 뽑지 않고 req.headers 를 통째로 넘긴다.
 * 타임스탬프 허용오차(리플레이 방어)와 시크릿 prefix 처리도 SDK 가 담당한다.
 *
 * @param {string} rawBody
 * @param {Object} headers - req.headers 원본
 * @param {string} secret  - PORTONE_V2_WEBHOOK_SECRET
 * @returns {Promise<boolean>}
 */
async function verifyPortoneSignature(rawBody, headers, secret) {
  try {
    await PortOne.Webhook.verify(secret, rawBody, headers);
    return true;
  } catch (e) {
    console.warn('[portone-webhook] signature verification failed:', e?.message || e);
    return false;
  }
}

/**
 * 이벤트 타입별 분기
 *
 * ★ 무접촉 구간 — 본 구현은 결제 E2E 축 소관.
 *   여기를 살리기 전에 WEBHOOK-EVENT-LOG-TABLE-01(멱등성) 을 먼저 닫는다.
 *
 * @param {Object} payload - 파싱된 JSON body
 * @returns {Promise<{ ok: boolean, handlerStatus: string, reason?: string }>}
 */
async function routeEvent(payload) {
  const eventType = payload?.type || payload?.event || 'unknown';
  const impUid = payload?.imp_uid || payload?.paymentId;
  const merchantUid = payload?.merchant_uid || payload?.orderId;

  switch (eventType) {
    case 'payment.paid':
      // TODO: lib/billing/charge.js  chargeBillingKey 검증 (금액 일치)
      // TODO: lib/billing/recordPayment.js  recordPayment(account_id, subscription_id, ...)
      // TODO: lib/billing/syncAccountPlan.js  syncAccountPlan(account_id) — 결제 성공 → 플랜 활성
      // TODO: subscriptions.status = 'active', next_billing_at 갱신
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_payment_paid' };

    case 'payment.failed':
      // TODO: lib/billing/recordPayment.js  recordPayment(status='failed')
      // TODO: subscriptions.status = 'past_due' (grace period 진입)
      // TODO: 사용자 알림 트리거 (이메일/카톡)
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_payment_failed' };

    case 'payment.cancelled':
      // TODO: lib/billing/recordPayment.js  recordRefund(full)
      // TODO: subscriptions.status = 'cancelled' 또는 환불 정책에 따른 상태
      // TODO: syncAccountPlan — 환불 시 플랜 다운그레이드 정책 검토
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_payment_cancelled' };

    case 'payment.partial_cancelled':
      // TODO: lib/billing/recordPayment.js  recordRefund(partial, amount)
      // TODO: payment_history append (refund_amount, status='partial_refunded')
      // TODO: 일할 계산 정책 미정 — 플랜 변경 여부 사용자 판단
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_partial_cancelled' };

    case 'billing_key.issued':
      // TODO: billing_keys INSERT (customer_uid, card_name, card_number_masked ...)
      // TODO: subscriptions.billing_key_id UPDATE (기존 있으면 교체)
      // TODO: accounts.has_card_registered = true (정책에 따라)
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_billing_key_issued' };

    case 'billing_key.deleted':
      // TODO: billing_keys.deleted_at = now() (soft delete)
      // TODO: subscriptions.billing_key_id = NULL (FK SET NULL 정합)
      // TODO: subscriptions.status = 'past_due' 또는 'cancelled' 정책 결정
      return { ok: true, handlerStatus: 'processed', reason: 'TODO_billing_key_deleted' };

    default:
      // 알 수 없는 이벤트 → silent ignore (200)
      return { ok: true, handlerStatus: 'ignored', reason: `unknown_event:${eventType}` };
  }
}

// ────────────────────────────────────────────────────────────────────────
// 메인 핸들러
// ────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // POST 외 차단
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  }

  // 0. Secret 확인 — 검증 불가 상태를 통과로 처리하지 않는다 (fail-closed)
  const secret = process.env.PORTONE_V2_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[portone-webhook] PORTONE_V2_WEBHOOK_SECRET is not set — refusing request');
    return res.status(500).json({ ok: false, reason: 'webhook_secret_missing' });
  }

  // 1. raw body 수신
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    console.error('[portone-webhook] raw body read failed', e);
    return res.status(400).json({ ok: false, reason: 'body_read_failed' });
  }

  // 2. 서명 검증
  const signature = req.headers['webhook-signature'] || '';
  const signatureValid = await verifyPortoneSignature(rawBody, req.headers, secret);
  if (!signatureValid) {
    await logWebhookEvent({
      pg: 'portone',
      eventType: 'unknown',
      rawBody,
      signature,
      signatureValid: false,
      handlerStatus: 'failed',
      errorMessage: 'signature_invalid',
    });
    return res.status(401).json({ ok: false, reason: 'signature_invalid' });
  }

  // 3. JSON 파싱
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    console.error('[portone-webhook] JSON parse failed', e);
    await logWebhookEvent({
      pg: 'portone',
      eventType: 'unknown',
      rawBody,
      signature,
      signatureValid,
      handlerStatus: 'failed',
      errorMessage: 'json_parse_failed',
    });
    return res.status(400).json({ ok: false, reason: 'invalid_json' });
  }

  const eventType = payload?.type || payload?.event || 'unknown';
  const impUid = payload?.imp_uid || payload?.paymentId;
  const merchantUid = payload?.merchant_uid || payload?.orderId;

  // 4. 수신 로깅
  //    ★ webhookLog.js 는 현재 stub(NOT_IMPLEMENTED) — 실제 적재 없음.
  //      WEBHOOK-EVENT-LOG-TABLE-01 에서 본 구현.
  await logWebhookEvent({
    pg: 'portone',
    eventType,
    impUid,
    merchantUid,
    payload,
    rawBody,
    signature,
    signatureValid,
    handlerStatus: 'received',
  });

  // 5. 이벤트 라우팅
  try {
    const result = await routeEvent(payload);

    await logWebhookEvent({
      pg: 'portone',
      eventType,
      impUid,
      merchantUid,
      handlerStatus: result.handlerStatus,
    });

    // 정상 / unknown event 모두 200 (포트원 정상 수신 시그널)
    return res.status(200).json({ ok: true, handlerStatus: result.handlerStatus });
  } catch (e) {
    // 내부 처리 실패 → 5xx (포트원 재시도 유도)
    console.error('[portone-webhook] handler error', e);
    await logWebhookEvent({
      pg: 'portone',
      eventType,
      impUid,
      merchantUid,
      handlerStatus: 'failed',
      errorMessage: e?.message || 'internal_error',
    });
    return res.status(500).json({ ok: false, reason: 'internal_error' });
  }
}
