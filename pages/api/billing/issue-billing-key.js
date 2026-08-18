// pages/api/billing/issue-billing-key.js
// 빌링키 발급 콜백 + 첫 달 실청구 + 재구매/재결제
//
// [S193 BILLING-FIRSTMONTH-NOT-CHARGED-01]
//   기존: 카드등록 성공 = 결제 성공으로 간주 → 청구 0원인데 payment_history=paid,
//         subscriptions=active, accounts.plan 승격까지 실행됐다.
//   변경: billing_keys 저장 직후 chargeBillingKey()로 첫 달을 실제 청구하고,
//         청구 성공 응답을 받은 뒤에만 subscription active / payment_history paid /
//         accounts.plan 승격을 실행한다.
//
//   · paymentId는 서버가 생성한다. 클라이언트 전달값을 신뢰하지 않는다.
//   · pg_tx_id는 실제 응답 필드명 미확정(PORTONE-TXID-FIELD-UNVERIFIED-01).
//     추측 매핑하지 않고 null로 두며, 원본은 pg_response_raw에 전량 보존한다.
//
// ─────────────────────────────────────────────────────────────
// [S199 BILLING-SUBSCRIPTION-STATE-AXIS-01]
//   REPURCHASE-PATH-MISSING-01 / SUB-EXPIRED-ACTIVE-DEADLOCK-01 /
//   SUB-CANCELED-DOUBLE-INSERT-01 / BILLINGKEY-MULTI-DEFAULT-01 통합 폐쇄.
//
//   기존: status IN ('active','past_due') 이면 무조건 409, 아니면 무조건 INSERT.
//         → 만료된 active는 재결제 불가(데드락), canceled+기간유효는 subscription
//           2행 생성(이중 next_billing_at → 이중결제).
//
//   변경: 한 고객 = 활성 결제주기 1개. 재구매해도 행을 쌓지 않고 기존 행을 UPDATE한다.
//
//   재구매 Gate (status 단독 판정 금지 — 실제 quota 소진 여부로 결정)
//     sub 없음                              → INSERT 경로
//     past_due                              → 409 PAYMENT_PAST_DUE
//     canceled + failed_payment_count >= 2  → 허용 (미납 canceled. 잔여기간 무효)
//     기간유효 + used <  quota              → 409 QUOTA_REMAINING
//     기간유효 + used >= quota              → 허용
//     기간만료                              → 허용
//
//   ★ past_due를 재구매로 정상화하지 않는 이유:
//     charge-due.js가 past_due를 retry 큐(failed_payment_count<2)로 계속 잡고,
//     그 재청구 기간은 current_period_end 기준이다. 재구매는 now 기준이므로
//     두 경로가 같은 행에 다른 기간을 써서 이중청구가 된다. 정상화 경로는
//     retry 성공 또는 2회 실패 후 canceled 전이다.
//
//   ★ canceled 판별에 failed_payment_count를 쓰는 이유:
//     charge-due.js는 2회 실패 시 status='canceled'만 바꾸고 current_period_end를
//     그대로 둔다(CHARGE-DUE-RETRY-CANCEL-PERIOD-01). 그래서 "미납 canceled"에도
//     기간이 남아 있다. 잔량 판정으로 보내면 돈을 내지 않은 기간을 계속 쓰게 된다.
//     정상 해지 canceled(잔여 이용권 유효)와는 failed_payment_count로만 갈린다.
//
//   ★ 기간 산정은 항상 now 기준 1개월이다. 잔여기간을 승계하지 않는다.
//     전량 소진 후 산 이용권은 결제 시점부터 즉시 개시되어야 한다.
//     (REPURCHASE-PERIOD-TRUNCATE-01은 결함이 아니라 확정 정책으로 종결)
//
//   ★ quota 분모는 accounts.plan이다. subscriptions.plan_id가 아니다.
//     관리자 지급이 subscriptions를 만들지 않으므로 accounts.plan이 유일 SoT다
//     (QUOTA-DENOM-SOURCE-SPLIT-01 롤백 결과). 그래서 결제 성공 후
//     accounts.plan UPDATE는 이 흐름에서 생략할 수 없다.
//
//   ★ resolveBillingPeriod()를 쓰지 않는다.
//     내부 getActiveSubscription이 status IN ('active','canceled') AND
//     period_end > now로 필터하므로 past_due·만료 건은 캘린더월로 폴백된다.
//     Gate는 대상 행의 실제 기간을 봐야 하므로 자체 조회 + countGeneratedInPeriod만
//     재사용한다(산식 복사 아님).
//
//   ★ 결제 성공 전에는 기존 subscription과 기존 default billing_key를 훼손하지 않는다.
//     신규 billing_key는 is_default:false로 들어가고, 결제 성공 후에만 default가
//     이동한다. 실패하면 기존 결제수단이 그대로 살아 있다.
// ─────────────────────────────────────────────────────────────
//
// 호출 시점: 사용자가 결제창에서 카드 등록(빌링키 발급) 완료 직후
// 입력:    { plan_id, billing_key, customer_uid, card_info }   ※ payment_id 미사용
// 출력:    { ok, subscription_id, payment_id, next_billing_at, mode }

import { createClient } from '@supabase/supabase-js';
import { isConfigured, getBillingKey, chargeBillingKey } from '../../../lib/portone';
import { getPlan, DEFAULT_PLAN_ID } from '../../../lib/billing/plans';
import { countGeneratedInPeriod } from '../../../lib/billing/usage';

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

  // ─────────────────────────────────────────────────────────
  // ★ 재구매 Gate [BILLING-SUBSCRIPTION-STATE-AXIS-01]
  //   status는 조회 조건에 넣지 않는다. 만료된 active·미납 canceled까지
  //   전부 같은 판정표를 태워야 하므로 최신 1행을 그대로 가져온다.
  // ─────────────────────────────────────────────────────────
  const { data: subRows, error: subFindErr } = await supabase
    .from('subscriptions')
    .select(
      'id, status, plan_id, billing_key_id, failed_payment_count, ' +
      'current_period_start, current_period_end'
    )
    .eq('account_id', account.id)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1);

  if (subFindErr) {
    // fail-closed. 조회 장애를 신규 가입으로 오인해 INSERT하면 행이 중복된다.
    console.error('[issue-billing-key] subscription lookup failed', subFindErr);
    return res.status(503).json({ error: 'subscription lookup failed' });
  }

  const existingSub = (subRows && subRows.length > 0) ? subRows[0] : null;
  const isRepurchase = !!existingSub;

  if (existingSub) {
    const nowTs = Date.now();
    const periodValid = existingSub.current_period_end
      ? new Date(existingSub.current_period_end).getTime() > nowTs
      : false;
    const unpaidCanceled =
      existingSub.status === 'canceled' &&
      (existingSub.failed_payment_count || 0) >= 2;

    // ① past_due — retry 큐가 물고 있다. 재구매로 대체하지 않는다.
    if (existingSub.status === 'past_due') {
      return res.status(409).json({
        error:           'PAYMENT_PAST_DUE',
        message:         '미납 결제가 처리 중입니다. 결제 재시도 완료 후 이용권을 구매할 수 있습니다.',
        subscription_id: existingSub.id,
      });
    }

    // ② 기간이 유효하고 미납 canceled가 아니면 → 실제 소진 여부로 판정
    if (periodValid && !unpaidCanceled) {
      let used;
      try {
        const usedRaw = await countGeneratedInPeriod(
          account.id,
          existingSub.current_period_start,
          existingSub.current_period_end
        );
        // 반환형이 number가 아닐 경우까지 추측 매핑하지 않고 유한수 여부로만 판정한다.
        used = (typeof usedRaw === 'number') ? usedRaw : Number(usedRaw?.count);
        if (!Number.isFinite(used)) throw new Error('unexpected usage shape');
      } catch (e) {
        // fail-closed. 사용량을 모른 채 결제를 통과시키면 잔량 있는 고객이 이중과금된다.
        console.error('[issue-billing-key] usage count failed', e);
        return res.status(503).json({ error: 'quota check failed' });
      }

      const quota = getPlan(account.plan || DEFAULT_PLAN_ID).monthly_quota;

      if (used < quota) {
        return res.status(409).json({
          error:           'QUOTA_REMAINING',
          message:         '현재 이용권의 잔여 제공량이 남아 있어 새 이용권을 구매할 수 없습니다.',
          subscription_id: existingSub.id,
          used,
          quota,
          remaining:       Math.max(0, quota - used),
          period_end:      existingSub.current_period_end,
        });
      }
      // used >= quota → 전량 소진. 재구매 허용.
    }
    // periodValid=false(만료) 또는 unpaidCanceled → 재결제 허용
  }

  // ─── 포트원 빌링키 검증 (가맹점 등록 시) ───
  //   결제건 조회(getPayment)는 하지 않는다. 이 시점에 결제는 아직 존재하지 않는다.
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
  //    ★ is_default:false 로 넣는다. 결제가 성공하기 전에 기존 default를 흔들지 않는다.
  //      여기서 true로 넣거나 기존 키를 먼저 false로 만들면, 이어지는 결제가 실패했을 때
  //      정상 동작하던 결제수단까지 함께 잃는다.
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
      is_default:         false,
    })
    .select('id')
    .single();

  if (bkErr) {
    console.error('[issue-billing-key] billing_keys insert failed', bkErr);
    return res.status(500).json({ error: 'billing_keys insert failed' });
  }

  // ───────────────────────────────────────────────
  // ★ 2) 실제 청구 — 이 지점을 통과하기 전에는
  //      유료 상태(subscription / payment_history paid / accounts.plan / default key)를
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
    console.error('[issue-billing-key] charge failed', charge?.code, charge?.reason);

    // 실패 이력 보존 — 카드 등록(billing_keys)은 유지한다.
    // ★ 기존 subscription 무변경 / 기존 default billing_key 무변경.
    //   신규 키는 is_default:false 로 남아 결제수단 목록만 늘어난다.
    const { error: failLogErr } = await supabase
      .from('payment_history')
      .insert({
        account_id:       account.id,
        subscription_id:  isRepurchase ? existingSub.id : null,
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

  // 3) subscriptions — 재구매면 UPDATE, 신규면 INSERT.
  //    ★ 재구매에서 INSERT하지 않는다. 행이 2개가 되면 next_billing_at도 2개가 되어
  //      charge-due가 같은 고객을 두 번 청구한다(SUB-CANCELED-DOUBLE-INSERT-01).
  let sub = null;
  let subErr = null;

  if (isRepurchase) {
    const { data: upd, error: uErr } = await supabase
      .from('subscriptions')
      .update({
        plan_id:                plan.id,
        billing_key_id:         bk.id,
        status:                 'active',
        current_period_start:   now.toISOString(),
        current_period_end:     nextBillingAt.toISOString(),
        next_billing_at:        nextBillingAt.toISOString(),
        cancel_at_period_end:   false,
        failed_payment_count:   0,
        last_failed_at:         null,
        scheduled_plan_id:      null,   // 이전 주기의 변경예약 잔재 제거
        updated_at:             now.toISOString(),
      })
      .eq('id', existingSub.id)
      .select('id')
      .single();
    sub = upd; subErr = uErr;
  } else {
    const { data: ins, error: iErr } = await supabase
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
    sub = ins; subErr = iErr;
  }

  if (subErr || !sub) {
    console.error('[issue-billing-key] subscriptions write failed', subErr);
    // ★ 이미 실청구가 성공한 상태다. billing_keys를 삭제하지 않는다.
    //   삭제하면 청구된 돈에 대응하는 카드 기록이 사라져 추적이 불가능해진다.
    await supabase
      .from('payment_history')
      .insert({
        account_id:       account.id,
        subscription_id:  isRepurchase ? existingSub.id : null,
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
      error:      'subscriptions write failed',
      payment_id: paymentId,
      charged:    true,
    });
  }

  // 3-b) default billing_key 이동 — 결제 성공 이후에만 수행한다.
  //      [BILLINGKEY-MULTI-DEFAULT-01] default가 여러 개면 charge-due의
  //      결제수단 선택이 비결정적이 된다. 계정당 정확히 1개를 보장한다.
  const { error: unsetErr } = await supabase
    .from('billing_keys')
    .update({ is_default: false })
    .eq('account_id', account.id)
    .neq('id', bk.id);

  if (unsetErr) {
    console.error('[issue-billing-key] previous default unset failed', unsetErr);
  }

  const { error: setDefaultErr } = await supabase
    .from('billing_keys')
    .update({ is_default: true })
    .eq('id', bk.id);

  if (setDefaultErr) {
    // 결제·구독은 이미 확정됐다. default 표식만 실패한 것이므로 로그만 남긴다.
    console.error('[issue-billing-key] set default failed', bk.id, setDefaultErr);
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
    console.error('[issue-billing-key] payment_history insert failed', paymentId, phErr);
  }

  // 5) accounts.plan 업데이트
  //    ★ 생략 금지. check-quota의 분모가 accounts.plan이므로 이 UPDATE가 빠지면
  //      결제는 됐는데 제공량이 이전 등급으로 남는다.
  const { error: accUpdErr } = await supabase
    .from('accounts')
    .update({ plan: plan.id, updated_at: now.toISOString() })
    .eq('id', account.id);

  if (accUpdErr) {
    console.error('[issue-billing-key] accounts.plan update failed', accUpdErr);
  }

  return res.status(200).json({
    ok:              true,
    mode:            isRepurchase ? 'repurchase' : 'new',
    subscription_id: sub.id,
    plan_id:         plan.id,
    payment_id:      paymentId,
    period_start:    now.toISOString(),
    next_billing_at: nextBillingAt.toISOString(),
  });
}
