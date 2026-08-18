// pages/api/billing/checkout.js
// 세션74 B-4-1 v0.1 — 결제 주문 생성 (결제창 호출 직전 단계)
//
// 역할: 클라이언트가 보낸 금액을 절대 믿지 않는다. 서버가 plans.price_krw를 SoT로
//   금액을 확정하고 payment_orders에 스냅샷으로 박아둔다.
//   이후 complete/webhook은 PortOne 조회 금액을 이 스냅샷과만 대조한다.
//   plans.price_krw가 나중에 바뀌어도 기존 주문 금액은 흔들리지 않는다.
//
// 응답의 payment_id가 곧 PortOne paymentId. 클라이언트는 이 값으로 결제창을 연다.
//
// 이 단계에서는 구독을 만들지 않는다. 구독 반영은 결제 검증 통과 후 complete.js.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getPlan } from '../../../lib/billing/plans';

const PAID_PLANS = ['basic', 'standard', 'pro', 'enterprise']; // free는 결제 대상 아님
const MAX_MONTHS = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // ── 1. 인증 (Bearer) ──
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ ok: false, error: 'SUPABASE_ENV_MISSING' });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return res.status(401).json({ ok: false, error: 'MISSING_ACCESS_TOKEN' });

    const authClient = createClient(url, key, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }
    const authUserId = userData.user.id;

    // ── 2. 계정 확인 ──
    const { data: account, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, plan, status, role')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (accErr) throw accErr;
    if (!account) return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
    if (account.status && account.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'ACCOUNT_INACTIVE', status: account.status });
    }

    // ── 3. 입력 검증 ──
    const planId = String(req.body?.plan_id || '').trim();
    if (!PAID_PLANS.includes(planId)) {
      return res.status(400).json({ ok: false, error: 'INVALID_PLAN', allowed: PAID_PLANS });
    }

    let months = 1;
    if (req.body?.months != null && req.body.months !== '') {
      const m = Number(req.body.months);
      if (!Number.isInteger(m) || m < 1 || m > MAX_MONTHS) {
        return res.status(400).json({ ok: false, error: 'INVALID_MONTHS' });
      }
      months = m;
    }

    // ── 4. 금액 확정 (서버 SoT) ──
    const plan = getPlan(planId);
    if (!plan || plan.id !== planId) {
      return res.status(400).json({ ok: false, error: 'PLAN_NOT_FOUND' });
    }
    if (plan.is_active === false) {
      return res.status(400).json({ ok: false, error: 'PLAN_NOT_ON_SALE' });
    }
    const unit = Number(plan.price_krw);
    if (!Number.isFinite(unit) || unit <= 0) {
      return res.status(400).json({ ok: false, error: 'PLAN_PRICE_MISSING' });
    }
    const amount = unit * months;

    // ── 5. 주문 생성 ──
    // payment_id: PortOne paymentId 제약(ASCII만) 준수. 계정/시각/난수로 충돌 회피.
    const paymentId = `aipost-${account.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: order, error: oErr } = await supabaseAdmin
      .from('payment_orders')
      .insert({
        payment_id: paymentId,
        account_id: account.id,
        plan_id: planId,
        amount,
        currency: 'KRW',
        status: 'ready',
        pg_provider: 'portone',
        months,
      })
      .select('id, payment_id, plan_id, amount, currency, status, months')
      .single();
    if (oErr) throw oErr;

    return res.status(200).json({
      ok: true,
      order,
      // 결제창 파라미터 — 시크릿이 아닌 공개값만 내려준다(API Secret은 절대 노출 금지).
      portone: {
        storeId: process.env.PORTONE_V2_STORE_ID || null,
        channelKey: process.env.PORTONE_V2_CHANNEL_KEY || null,
        paymentId: order.payment_id,
        orderName: `AI-POST ${plan.label} ${months}개월`,
        totalAmount: order.amount,
        currency: 'CURRENCY_KRW',
        payMethod: 'CARD',
      },
      customer: { email: account.email || null },
    });
  } catch (e) {
    console.error('[checkout] error:', e);
    return res.status(500).json({ ok: false, error: 'CHECKOUT_FAILED', detail: e.message });
  }
}
