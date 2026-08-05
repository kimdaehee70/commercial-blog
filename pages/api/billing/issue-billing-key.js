// pages/api/billing/issue-billing-key.js
// 빌링키 발급 콜백 — 골격
// 결제창에서 빌링키 발급 성공 후 클라이언트가 호출.
// billing_keys insert + 첫 결제(initial) + subscriptions insert.
//
// 호출 시점: 사용자가 결제창에서 카드 등록 + 첫 결제 완료 직후
// 입력:    { plan_id, billing_key, payment_id, customer_uid, card_info }
// 출력:    { ok, subscription_id, next_billing_at }

import { createClient } from '@supabase/supabase-js';
import { isConfigured, getBillingKey, getPayment } from '../../../lib/portone';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 말일 보정 (3/31 → 4/30)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // ─── 인증 ───
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  // ─── 입력 검증 ───
  const {
    plan_id,
    billing_key,
    payment_id,
    customer_uid,
    card_name,
    card_number_masked,
    card_type,
    pg_provider,
  } = req.body || {};

  if (!plan_id || !billing_key || !payment_id) {
    return res.status(400).json({ error: 'plan_id / billing_key / payment_id required' });
  }
  if (plan_id === 'free') {
    return res.status(400).json({ error: 'free plan cannot subscribe' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── 사용자 → account ───
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const authUserId = userData.user.id;

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, email, plan, status')
    .eq('auth_user_id', authUserId)
    .single();

  if (accErr || !account) return res.status(404).json({ error: 'account not found' });
  if (account.status !== 'active') return res.status(403).json({ error: 'account not active' });

  // ─── 플랜 검증 ───
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, label, price_krw, is_active')
    .eq('id', plan_id)
    .single();

  if (planErr || !plan) return res.status(404).json({ error: 'plan not found' });
  if (!plan.is_active) return res.status(400).json({ error: 'plan not available' });

  // ─── 기존 활성 구독 차단 ───
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('account_id', account.id)
    .in('status', ['active', 'past_due']);

  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'subscription already exists', subscription_id: existing[0].id });
  }

  // ─── 포트원 검증 (가맹점 등록 시) ───
  let pgVerified = false;
  let pgPaymentRaw = null;
  if (isConfigured()) {
    // TODO: 빌링키 + 첫 결제 결과 포트원 API로 재검증
    const bk = await getBillingKey(billing_key);
    const pay = await getPayment(payment_id);
    if (bk?.ok && pay?.ok) {
      pgVerified = true;
      pgPaymentRaw = pay.data || null;
    }
    if (!pgVerified) {
      return res.status(400).json({ error: 'portone verification failed' });
    }
  } else {
    // 가맹점 미등록 — dummy 모드. 실제 INSERT 차단.
    return res.status(503).json({
      dummy: true,
      message: '포트원 가맹점 미등록 — INSERT 차단 (코드 골격 단계)',
    });
  }

  // ─── 트랜잭션 흐름 (Supabase는 RPC 없으면 순차 처리) ───
  const now = new Date();
  const nextBillingAt = addMonths(now, 1);

  // 1) billing_keys insert
  const { data: bk, error: bkErr } = await supabase
    .from('billing_keys')
    .insert({
      account_id:         account.id,
      customer_uid:       customer_uid || null,
      billing_key:        billing_key,
      pg_provider:        pg_provider || null,
      channel_key:        process.env.PORTONE_V2_CHANNEL_KEY || null,
      card_name:          card_name || null,
      card_number_masked: card_number_masked || null,
      card_type:          card_type || null,
      status:             'active',
      is_default:         true,
    })
    .select('id')
    .single();

  if (bkErr) {
    console.error('[issue-billing-key] billing_keys insert failed', bkErr);
    return res.status(500).json({ error: 'billing_keys insert failed' });
  }

  // 2) subscriptions insert
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      account_id:             account.id,
      plan_id:                plan.id,
      billing_key_id:         bk.id,
      status:                 'active',
      current_period_start:   now.toISOString(),
      current_period_end:     nextBillingAt.toISOString(),
      next_billing_at:        nextBillingAt.toISOString(),
      cancel_at_period_end:   false,
      failed_payment_count:   0,
    })
    .select('id')
    .single();

  if (subErr) {
    console.error('[issue-billing-key] subscriptions insert failed', subErr);
    // billing_keys rollback (best effort)
    await supabase.from('billing_keys').delete().eq('id', bk.id);
    return res.status(500).json({ error: 'subscriptions insert failed' });
  }

  // 3) payment_history insert (initial)
  const { error: phErr } = await supabase
    .from('payment_history')
    .insert({
      account_id:         account.id,
      subscription_id:    sub.id,
      billing_key_id:     bk.id,
      payment_id:         payment_id,
      pg_tx_id:           pgPaymentRaw?.txId || null,
      amount:             plan.price_krw,
      base_amount:        plan.price_krw,
      overage_amount:     0,
      overage_quantity:   0,
      period_start:       now.toISOString(),
      period_end:         nextBillingAt.toISOString(),
      kind:               'initial',
      status:             'paid',
      pg_response_raw:    pgPaymentRaw,
      paid_at:            now.toISOString(),
    });

  if (phErr) {
    console.error('[issue-billing-key] payment_history insert failed', phErr);
    // 결제는 이미 PG에서 성공 → 로그만 남기고 진행 (사용자 영향 최소)
  }

  // 4) accounts.plan 업데이트
  const { error: accUpdErr } = await supabase
    .from('accounts')
    .update({ plan: plan.id, updated_at: now.toISOString() })
    .eq('id', account.id);

  if (accUpdErr) {
    console.error('[issue-billing-key] accounts.plan update failed', accUpdErr);
  }

  return res.status(200).json({
    ok:              true,
    subscription_id: sub.id,
    plan_id:         plan.id,
    next_billing_at: nextBillingAt.toISOString(),
  });
}
