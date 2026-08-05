// lib/portone.js
// 포트원 V2 클라이언트 — 골격 (가맹점 가입 전 더미 상태)
// 실제 호출은 ENV 채워진 후 활성화

const PORTONE_V2_API_BASE = 'https://api.portone.io';

const STORE_ID       = process.env.PORTONE_V2_STORE_ID       || '';
const API_SECRET     = process.env.PORTONE_V2_API_SECRET     || '';
const CHANNEL_KEY    = process.env.PORTONE_V2_CHANNEL_KEY    || '';
const WEBHOOK_SECRET = process.env.PORTONE_V2_WEBHOOK_SECRET || '';

function isConfigured() {
  return !!(STORE_ID && API_SECRET && CHANNEL_KEY);
}

function getPublicConfig() {
  // 클라이언트에서 결제창 호출 시 필요한 값
  return {
    storeId:    STORE_ID,
    channelKey: CHANNEL_KEY,
  };
}

// ─────────────────────────────────────────────
// 빌링키 발급 후 단건 결제 (정기결제 / 초과결제 공용)
// ─────────────────────────────────────────────
async function chargeBillingKey({ billingKey, paymentId, orderName, amount, customer }) {
  if (!isConfigured()) {
    return { ok: false, dummy: true, reason: 'portone not configured' };
  }
  // TODO: 실제 포트원 V2 API 호출
  // POST /payments/{paymentId}/billing-key
  // Authorization: PortOne {API_SECRET}
  return { ok: false, todo: true };
}

// ─────────────────────────────────────────────
// 빌링키 조회 (검증용)
// ─────────────────────────────────────────────
async function getBillingKey(billingKey) {
  if (!isConfigured()) {
    return { ok: false, dummy: true };
  }
  // TODO: GET /billing-keys/{billingKey}
  return { ok: false, todo: true };
}

// ─────────────────────────────────────────────
// 결제 단건 조회 (webhook 검증 / 사후 확인)
// ─────────────────────────────────────────────
async function getPayment(paymentId) {
  if (!isConfigured()) {
    return { ok: false, dummy: true };
  }
  // TODO: GET /payments/{paymentId}
  return { ok: false, todo: true };
}

// ─────────────────────────────────────────────
// Webhook 서명 검증 (포트원 V2 표준)
// ─────────────────────────────────────────────
function verifyWebhookSignature({ rawBody, signature, timestamp }) {
  if (!WEBHOOK_SECRET) return { ok: false, dummy: true };
  // TODO: HMAC-SHA256(rawBody + timestamp, WEBHOOK_SECRET) 비교
  return { ok: false, todo: true };
}

module.exports = {
  isConfigured,
  getPublicConfig,
  chargeBillingKey,
  getBillingKey,
  getPayment,
  verifyWebhookSignature,
  PORTONE_V2_API_BASE,
};
