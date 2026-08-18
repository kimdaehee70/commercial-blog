// pages/api/billing/issue-billing-key.js
// 빌링키 발급 콜백 + 첫 달 실청구
//
// [S193 BILLING-FIRSTMONTH-NOT-CHARGED-01]
//   기존: 카드등록 성공 = 결제 성공으로 간주 → 청구 0원인데 payment_history=paid,
//         subscriptions=active, accounts.plan 승격까지 실행됐다.
//   변경: billing_keys 저장 직후 chargeBillingKey()로 첫 달을 실제 청구하고,
//         청구 성공 응답을 받은 뒤에만 subscription active / payment_history paid /
//         accounts.plan 승격을 실행한다.
//
//   성공 흐름: billing_key 저장 → 실청구 → 성공 → subscription active
//              → payment_history paid → accounts.plan 승격 → 200
//   실패 흐름: billing_key 저장(유지) → 실청구 실패 → payment_history failed → 402
//              (subscription 미생성 / accounts.plan 무변경)
//
//   · paymentId는 서버가 생성한다. 클라이언트 전달값을 신뢰하지 않는다.
//     PortOne V2는 POST /payments/{paymentId}/billing-key 로 가맹점 지정 ID의 결제를
//     "생성"하므로, 청구 이전에 존재하는 payment_id란 있을 수 없다.
//     → 기존 getPayment(payment_id) 검증은 원천 성립 불가여서 제거했다.
//   · pg_tx_id는 실제 응답 필드명 미확정(PORTONE-TXID-FIELD-UNVERIFIED-01).
//     추측 매핑하지 않고 null로 두며, 원본은 pg_response_raw에 전량 보존한다.
//
// 호출 시점: 사용자가 결제창에서 카드 등록(빌링키 발급) 완료 직후
// 입력:    { plan_id, billing_key, customer_uid, card_info }   ※ payment_id 미사용
// 출력:    { ok, subscription_id, payment_id, next_billing_at }

import { createClient } from '@supabase/supabase-js';
import { isConfigured, getBillingKey, chargeBillingKey } from '../../../lib/portone';

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
  // ★ payment_id는 받지 않는다. 청구 ID 결정권은 서버가 갖는다.
  const {
    plan_id,
    billing_key,
    customer_uid,
    card_name,
    card_number_masked,
    card_type,
    pg_provider,
  } = req.body || {};

  if (!plan_id || !billing_key) {
    return res.status(400).json({ error: 'plan_id / billing_key required' });
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

  // ─── 포트원 빌링키 검증 (가맹점 등록 시) ───
  //   결제건 조회(getPayment)는 하지 않는다. 이 시점에 결제는 아직 존재하지 않는다.
  //   여기서 확인하는 것은 "카드가 유효하게 등록되었는가" 하나뿐이다.
  if (isConfigured()) {
    const bkInfo = await getBillingKey(billing_key);
    if (!bkInfo?.ok) {
      console.error('[issue-billing-key] billing key verify failed', bkInfo?.code, bkInfo?.reason);
      return res.status(400).json({
        error:  'billing key verification failed',
        code:   bkInfo?.code   || null,
        reason: bkInfo?.reason || null,
      });
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

  // ───────────────────────────────────────────────
  // ★ 2) 첫 달 실제 청구 — 이 지점을 통과하기 전에는
  //      유료 상태(subscription active / payment_history paid / accounts.plan)를
  //      단 하나도 확정하지 않는다.
  // ───────────────────────────────────────────────
  const paymentId = `sub_${account.id}_${plan.id}_${Date.now()}`;

  const charge = await chargeBillingKey({
    billingKey: billing_key,
    paymentId,
    orderName:  `${plan.label || plan.id} 월 정기결제`,
    amount:     plan.price_krw,   // 래퍼가 { total } 로 감싼다
    customer:   account.email ? { email: account.email } : undefined,
  });

  if (!charge?.ok) {
    console.error('[issue-billing-key] first charge failed', charge?.code, charge?.reason);

    // 실패 이력 보존 — 카드 등록(billing_keys)은 유지한다.
    // 카드 등록 성공과 첫 청구 실패는 별개 사건이다.
    const { error: failLogErr } = await supabase
      .from('payment_history')
      .insert({
        account_id:       account.id,
        subscription_id:  null,          // 구독 미생성
        billing_key_id:   bk.id,
        payment_id:       paymentId,
        pg_tx_id:         null,
        amount:           plan.price_krw,
        base_amount:      plan.price_krw,
        overage_amount:   0,
        overage_quantity: 0,
        period_start:     now.toISOString(),
        period_end:       nextBillingAt.toISOString(),
        kind:             'initial',
        status:           'failed',
        pg_response_raw:  charge || null,
        paid_at:          null,
      });

    if (failLogErr) {
      console.error('[issue-billing-key] failed-payment log insert failed', failLogErr);
    }

    return res.status(402).json({
      ok:      false,
      error:   'first charge failed',
      code:    charge?.code   || null,
      reason:  charge?.reason || null,
    });
  }

  // ── 여기부터는 실제로 청구가 성공한 뒤다 ──
  const chargeData = charge.data || null;

  // 3) subscriptions insert
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
    // ★ 이미 실청구가 성공한 상태다. billing_keys를 삭제하지 않는다.
    //   삭제하면 청구된 돈에 대응하는 카드 기록이 사라져 추적이 불가능해진다.
    //   결제 사실은 payment_history에 남기고 구독 생성 실패로 500을 반환한다.
    await supabase
      .from('payment_history')
      .insert({
        account_id:       account.id,
        subscription_id:  null,
        billing_key_id:   bk.id,
        payment_id:       paymentId,
        pg_tx_id:         null,
        amount:           plan.price_krw,
        base_amount:      plan.price_krw,
        overage_amount:   0,
        overage_quantity: 0,
        period_start:     now.toISOString(),
        period_end:       nextBillingAt.toISOString(),
        kind:             'initial',
        status:           'paid',
        pg_response_raw:  chargeData,
        paid_at:          now.toISOString(),
      });
    return res.status(500).json({
      error:      'subscriptions insert failed',
      payment_id: paymentId,
      charged:    true,
    });
  }

  // 4) payment_history insert (initial / paid)
  const { error: phErr } = await supabase
    .from('payment_history')
    .insert({
      account_id:         account.id,
      subscription_id:    sub.id,
      billing_key_id:     bk.id,
      payment_id:         paymentId,
      // pg_tx_id: 실제 응답 필드명 미확정(PORTONE-TXID-FIELD-UNVERIFIED-01).
      //           추측 매핑 금지 — 원본은 pg_response_raw에 보존한다.
      pg_tx_id:           null,
      amount:             plan.price_krw,
      base_amount:        plan.price_krw,
      overage_amount:     0,
      overage_quantity:   0,
      period_start:       now.toISOString(),
      period_end:         nextBillingAt.toISOString(),
      kind:               'initial',
      status:             'paid',
      pg_response_raw:    chargeData,
      paid_at:            now.toISOString(),
    });

  if (phErr) {
    // 청구는 이 시점에 이미 성공했다(위 chargeBillingKey 통과).
    // 내역 기록만 실패한 것이므로 사용자 플랜은 부여하고 로그로 남긴다.
    // payment_id를 함께 남겨 사후 대사(對査)가 가능하도록 한다.
    console.error('[issue-billing-key] payment_history insert failed', paymentId, phErr);
  }

  // 5) accounts.plan 업데이트
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
    payment_id:      paymentId,
    next_billing_at: nextBillingAt.toISOString(),
  });
}
