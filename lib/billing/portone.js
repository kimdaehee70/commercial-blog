// lib/billing/portone.js
// 세션74 B-4-2 v0.1 — PortOne 결제 검증 + 주문 확정 (complete / webhook 공용)
//
// 원칙:
//   · 클라이언트의 "결제 성공" 통보는 신뢰하지 않는다. 항상 PortOne 서버에 다시 물어본다.
//   · 금액 대조는 plans.price_krw가 아니라 payment_orders.amount(주문 시점 스냅샷)와 한다.
//     요금이 인상돼도 진행 중이던 주문이 금액 불일치로 터지지 않게 하기 위함.
//   · 멱등 — 이미 paid로 확정된 주문은 재호출해도 구독을 두 번 만들지 않는다.
//     complete와 webhook이 둘 다 도착하는 것이 정상 경로이므로 멱등성이 필수다.
//
// PortOne V2 기준. 인증은 Authorization: PortOne {API_SECRET} 헤더 하나.

import { supabaseAdmin } from '../supabaseAdmin';
import { applyPlan } from './subscriptionWrite';

const PORTONE_API = 'https://api.portone.io';

/** PortOne 결제 단건 조회. 실패 시 throw. */
export async function fetchPortOnePayment(paymentId) {
  const secret = process.env.PORTONE_V2_API_SECRET;
  if (!secret) throw new Error('PORTONE_V2_API_SECRET_MISSING');

  const r = await fetch(`${PORTONE_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${secret}` },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`PORTONE_LOOKUP_FAILED(${r.status}): ${body.slice(0, 200)}`);
  }
  return r.json();
}

/**
 * 결제 확정 — 조회 → 금액 대조 → 주문 상태 전이 → 구독 반영.
 * complete.js(사용자 리디렉션)와 webhook.js(서버 통보) 양쪽에서 같은 함수를 호출한다.
 *
 * @returns {{ok, status, order, subscription?, reason?}}
 */
export async function settlePayment(paymentId) {
  // ── 1. 내부 주문 조회 ──
  const { data: order, error: oErr } = await supabaseAdmin
    .from('payment_orders')
    .select('id, payment_id, account_id, plan_id, amount, currency, status, months, pg_payment_id')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (oErr) throw oErr;
  if (!order) return { ok: false, status: 'ORDER_NOT_FOUND' };

  // ── 2. 멱등 — 이미 확정된 주문은 그대로 성공 반환 ──
  if (order.status === 'paid') {
    return { ok: true, status: 'ALREADY_PAID', order };
  }

  // ── 3. PortOne 실조회 ──
  const payment = await fetchPortOnePayment(paymentId);
  const pgStatus = payment?.status;
  const pgAmount = Number(payment?.amount?.total);

  // ── 4. 결제 실패/취소 → 주문만 정리하고 구독은 건드리지 않는다 ──
  if (pgStatus === 'FAILED' || pgStatus === 'CANCELLED') {
    await updateOrder(order.id, {
      status: pgStatus === 'FAILED' ? 'failed' : 'cancelled',
      pg_payment_id: payment?.transactionId || null,
    });
    return { ok: false, status: pgStatus, order };
  }

  // ── 5. 아직 완료 전(가상계좌 발급·승인대기 등) → 대기. 재통보를 기다린다. ──
  if (pgStatus !== 'PAID') {
    return { ok: false, status: pgStatus || 'UNKNOWN', order, reason: 'NOT_PAID_YET' };
  }

  // ── 6. 금액 대조 (위변조 차단) ──
  if (!Number.isFinite(pgAmount) || pgAmount !== Number(order.amount)) {
    console.error(
      `[portone] 🚨 금액 불일치 payment_id=${paymentId} 주문=${order.amount} PG=${pgAmount}`
    );
    await updateOrder(order.id, { status: 'failed', pg_payment_id: payment?.transactionId || null });
    return { ok: false, status: 'AMOUNT_MISMATCH', order, reason: `order=${order.amount} pg=${pgAmount}` };
  }

  // ── 7. 주문 확정 — 조건부 UPDATE로 동시 도착(complete+webhook) 이중 처리 차단 ──
  const { data: claimed, error: cErr } = await supabaseAdmin
    .from('payment_orders')
    .update({
      status: 'paid',
      pg_payment_id: payment?.transactionId || null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .neq('status', 'paid')   // 이미 paid면 0행 → 다른 경로가 선점한 것
    .select('id')
    .maybeSingle();
  if (cErr) throw cErr;
  if (!claimed) {
    return { ok: true, status: 'ALREADY_PAID', order };
  }

  // ── 8. 구독 반영 — 관리자 지급과 동일 진입점. source만 payment. ──
  //   resetUsage 미전달(기본 false) — 같은 플랜 재결제는 '기간 연장'이지 주기 리셋이 아니다.
  //   주기 리셋은 B-5 자동 갱신에서만 명시적으로 true를 넘긴다.
  const sub = await applyPlan({
    accountId: order.account_id,
    planId: order.plan_id,
    months: order.months || 1,
    source: 'payment',
  });

  // accounts.plan 캐시 동기화 — 다운그레이드 예약은 현재 플랜을 바꾸지 않으므로 제외.
  if (!sub.error && sub.action !== 'downgrade_scheduled') {
    const { error: aErr } = await supabaseAdmin
      .from('accounts')
      .update({ plan: order.plan_id, updated_at: new Date().toISOString() })
      .eq('id', order.account_id);
    if (aErr) console.error('[portone] accounts.plan sync failed:', aErr.message);
  }

  return { ok: true, status: 'PAID', order, subscription: sub };
}

async function updateOrder(id, patch) {
  const { error } = await supabaseAdmin
    .from('payment_orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[portone] order update failed:', error.message);
}
