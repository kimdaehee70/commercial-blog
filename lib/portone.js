// lib/portone.js
// 포트원 V2 클라이언트
//
// [S191 PORTONE-SERVER-STUB-01] chargeBillingKey / getBillingKey / getPayment 3함수를
//   TODO 스텁 → PortOne V2 REST 실호출로 교체.
//   · 인증은 Authorization: PortOne {API_SECRET} 헤더 하나 (lib/billing/portone.js와 동일 패턴).
//   · 시그니처·반환 계약·export 목록·isConfigured()·verifyWebhookSignature 무변경.
//     호출부(issue-billing-key.js / charge-due.js)는 접촉하지 않는다.
//   · 반환 계약 { ok, data?, reason?, code? } — 실패해도 throw하지 않고 ok:false로 내린다.
//     호출부가 h.ok / h.data / h.reason / h.code 만 보고 분기하므로 그 형태를 유지한다.
//   · ★ Currency는 서버 SDK/REST 기준 'KRW'다. 브라우저 SDK의 'CURRENCY_KRW'와 값이 다르므로
//     교차 적용하지 않는다(PORTONE-CURRENCY-ENUM-SPLIT-01).
//   · ★ amount는 숫자가 아니라 객체다. REST 계약이 { total: number }를 요구하므로
//     호출부가 넘긴 숫자를 이 래퍼 안에서 감싼다. 호출부 수정 불필요.
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
// 공용 REST 호출기
//   PortOne 오류 응답은 { type, message } 형태다. type을 code로, message를 reason으로 올린다.
//   네트워크/파싱 실패도 throw하지 않고 ok:false로 내려 호출부 분기를 단순하게 유지한다.
// ─────────────────────────────────────────────
async function callPortOne(method, path, body) {
  try {
    const r = await fetch(`${PORTONE_V2_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `PortOne ${API_SECRET}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const raw = await r.text().catch(() => '');
    let data = null;
    if (raw) {
      try { data = JSON.parse(raw); } catch (_) { data = null; }
    }

    if (!r.ok) {
      return {
        ok: false,
        code: data?.type || `HTTP_${r.status}`,
        reason: data?.message || raw.slice(0, 200) || `PORTONE_HTTP_${r.status}`,
        data,
      };
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, code: 'NETWORK_ERROR', reason: e?.message || 'portone request failed' };
  }
}

// ─────────────────────────────────────────────
// 빌링키 발급 후 단건 결제 (정기결제 / 초과결제 공용)
//   POST /payments/{paymentId}/billing-key
//   필수: billingKey · orderName · amount{total} · currency
// ─────────────────────────────────────────────
async function chargeBillingKey({ billingKey, paymentId, orderName, amount, customer }) {
  if (!isConfigured()) {
    return { ok: false, dummy: true, reason: 'portone not configured' };
  }
  if (!billingKey || !paymentId || !orderName) {
    return { ok: false, code: 'INVALID_ARGS', reason: 'billingKey / paymentId / orderName required' };
  }

  const total = Number(amount);
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, code: 'INVALID_AMOUNT', reason: `amount=${amount}` };
  }

  const body = {
    billingKey,
    orderName,
    amount: { total },      // ★ REST 계약: 숫자가 아니라 객체
    currency: 'KRW',        // ★ 서버 기준 enum. CURRENCY_KRW 아님
    ...(STORE_ID    ? { storeId: STORE_ID }       : {}),
    ...(CHANNEL_KEY ? { channelKey: CHANNEL_KEY } : {}),
    ...(customer    ? { customer }                : {}),
  };

  return callPortOne('POST', `/payments/${encodeURIComponent(paymentId)}/billing-key`, body);
}

// ─────────────────────────────────────────────
// 빌링키 조회 (검증용)
//   GET /billing-keys/{billingKey}
// ─────────────────────────────────────────────
async function getBillingKey(billingKey) {
  if (!isConfigured()) {
    return { ok: false, dummy: true };
  }
  if (!billingKey) {
    return { ok: false, code: 'INVALID_ARGS', reason: 'billingKey required' };
  }

  return callPortOne('GET', `/billing-keys/${encodeURIComponent(billingKey)}`);
}

// ─────────────────────────────────────────────
// 결제 단건 조회 (webhook 검증 / 사후 확인)
//   GET /payments/{paymentId}
// ─────────────────────────────────────────────
async function getPayment(paymentId) {
  if (!isConfigured()) {
    return { ok: false, dummy: true };
  }
  if (!paymentId) {
    return { ok: false, code: 'INVALID_ARGS', reason: 'paymentId required' };
  }

  return callPortOne('GET', `/payments/${encodeURIComponent(paymentId)}`);
}

// ─────────────────────────────────────────────
// Webhook 서명 검증 (포트원 V2 표준)
//   [S191] 이번 축 무접촉. 스텁 유지.
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
