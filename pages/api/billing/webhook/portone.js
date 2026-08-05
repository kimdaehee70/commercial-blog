/**
 * pages/api/billing/webhook/portone.js
 *
 * 포트원(PortOne) V2 webhook 수신 엔드포인트 (skeleton B 수준)
 *
 * 책임:
 *  - 포트원에서 전송하는 결제/빌링키 이벤트 수신
 *  - 서명 검증 (현재 stub · 본 구현 후 production)
 *  - 이벤트 타입별 분기 → lib/billing/* helper 호출
 *  - 멱등성 보장 (webhookLog.js 의 isDuplicate 활용)
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
 *  - 서명 불일치 → 401 (재시도 무의미)
 *  - 본문 파싱 실패 → 400 (재시도 무의미)
 *  - 알 수 없는 event type → 200 (silent ignore)
 *  - 내부 처리 실패 (helper 등) → 5xx (포트원 재시도 유도)
 *  - 정상 처리 → 200
 *
 * env:
 *  - PORTONE_WEBHOOK_SECRET (포트원 가입 후 발급 · 현재 미설정)
 *
 * URL:
 *  - 운영: https://www.ai-post.ai/api/billing/webhook/portone
 *  - 베타: https://commercial-blog.vercel.app/api/billing/webhook/portone
 *  - 로컬: ngrok 등 외부 노출 필요
 *
 * FREEZE: 라우팅 구조 / 에러 정책 — 본 구현 시 case 본문만 교체
 *
 * v0.1 · 71차 · 2026-05-20
 */

import { logWebhookEvent } from '../../../../lib/billing/webhookLog';

// raw body 수신 — 서명 검증은 raw 기반 HMAC 필수
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
 * 포트원 서명 검증 (현재 stub)
 *
 * @param {string} rawBody  - 수신 raw body
 * @param {string} signature- 수신 헤더 X-Portone-Signature (포트원 V2 공식 헤더명 확인 필요)
 * @returns {boolean}
 *
 * TODO (본 구현):
 *  - HMAC-SHA256(rawBody, PORTONE_WEBHOOK_SECRET) 계산
 *  - timing-safe equal 비교 (crypto.timingSafeEqual)
 *  - 포트원 V2 공식 시그니처 알고리즘 재확인 (가입 후 문서 접근)
 *  - 헤더명 확정 (X-Portone-Signature ? webhook-signature ?)
 */
function verifyPortoneSignature(rawBody, signature) {
  // stub: 검증 통과 (실 환경 진입 전 반드시 본 구현)
  if (process.env.NODE_ENV === 'production') {
    console.warn('[portone-webhook] signature verification is STUB in production');
  }
  return true;
}

/**
 * 이벤트 타입별 분기
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

  // 1. raw body 수신
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (e) {
    console.error('[portone-webhook] raw body read failed', e);
    return res.status(400).json({ ok: false, reason: 'body_read_failed' });
  }

  // 2. 서명 검증
  const signature = req.headers['x-portone-signature'] || req.headers['webhook-signature'] || '';
  const signatureValid = verifyPortoneSignature(rawBody, signature);
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
      signatureValid: true,
      handlerStatus: 'failed',
      errorMessage: 'json_parse_failed',
    });
    return res.status(400).json({ ok: false, reason: 'invalid_json' });
  }

  const eventType = payload?.type || payload?.event || 'unknown';
  const impUid = payload?.imp_uid || payload?.paymentId;
  const merchantUid = payload?.merchant_uid || payload?.orderId;

  // 4. 수신 로깅 (stub)
  await logWebhookEvent({
    pg: 'portone',
    eventType,
    impUid,
    merchantUid,
    payload,
    rawBody,
    signature,
    signatureValid: true,
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
