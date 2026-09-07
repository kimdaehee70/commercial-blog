// lib/billing/executeBillingIssue.js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP1] 결제 실행 공통 서비스.
//
// 출처: pages/api/billing/issue-billing-key.js 본문을 그대로 이관했다.
//   · 재구매 Gate · 포트원 빌링키 검증 · billing_keys insert · 첫 달 실청구 ·
//     subscriptions · default key 이동 · payment_history · accounts.plan 반영
//   ★ 판정 순서 · 상태코드 · 응답 body 키 · 로그 문자열까지 1:1 보존.
//     회귀 Gate 통과 전까지 정책을 한 줄도 바꾸지 않는다.
//
// 호출자 2본이 이 함수를 공유한다(결제 SoT 단일화).
//   PC   : /api/billing/issue-billing-key  ─ Bearer 인증 후 호출
//   모바일: /api/billing/qr-complete       ─ QR 토큰 원자적 claim 후 호출
//   ★ 이 함수는 인증을 하지 않는다. 인증은 호출자의 책임이다.
//     account 행은 호출자가 이미 신원 확인을 마친 것으로 간주한다.
//
// 반환 계약: { status, body }  — 호출자는 res.status(status).json(body) 로 그대로 내린다.
//   throw 하지 않는다. HTTP 계층 판단을 호출자에 남기지 않기 위해 status 를 함께 돌려준다.

import { isConfigured, getBillingKey, chargeBillingKey } from '../portone';
import { getPlan, DEFAULT_PLAN_ID } from './plans';
import { countGeneratedInPeriod } from './usage';

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // 말일 보정 (3/31 → 4/30)
  if (d.getDate() < day) d.setDate(0);
  return d;
}

/**
 * @param {object}  p
 * @param {object}  p.supabase      service-role 클라이언트 (호출자가 생성)
 * @param {object}  p.account       { id, email, plan, status } — 호출자가 신원 확인 완료
 * @param {string}  p.planId
 * @param {string}  p.billing_key
 * @param {string=} p.customer_uid
 * @param {string=} p.card_name
 * @param {string=} p.card_number_masked
 * @param {string=} p.card_type
 * @param {string=} p.pg_provider
 * @returns {Promise<{status:number, body:object}>}
 */
export async function executeBillingIssue({
  supabase,
  account,
  planId,
  billing_key,
  customer_uid,
  card_name,
  card_number_masked,
  card_type,
  pg_provider,
}) {
  if (account.status !== 'active') {
    return { status: 403, body: { error: 'account not active' } };
  }

  // ─── 플랜 검증 ───
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, label, price_krw, is_active')
    .eq('id', planId)
    .single();

  if (planErr || !plan) return { status: 404, body: { error: 'plan not found' } };
  if (!plan.is_active) return { status: 400, body: { error: 'plan not available' } };

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
    return { status: 503, body: { error: 'subscription lookup failed' } };
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
      return {
        status: 409,
        body: {
          error:           'PAYMENT_PAST_DUE',
          message:         '미납 결제가 처리 중입니다. 결제 재시도 완료 후 이용권을 구매할 수 있습니다.',
          subscription_id: existingSub.id,
        },
      };
    }

    // ─────────────────────────────────────────────────────
    // ② [PLAN-CHANGE-POLICY-V1-01] 플랜 서열 판정
    //   현재 플랜 SoT = accounts.plan (quota 분모와 동일 값을 봐야 한다.
    //     existingSub.plan_id 를 쓰면 관리자 지급 계정에서 분모와 판정이 갈린다
    //     — ADMIN-GRANT-NO-SUBSCRIPTION-01).
    //   서열 SoT = plans.sort_order (가격은 프로모션으로 뒤집히고, quota 는 상품 정책값이다).
    //   ★ getPlan() 은 미등록 id 에 free 를 돌려준다. 그대로 쓰면 DB 에만 있고
    //     fallback 미러가 빠진 신규 플랜이 「최하위」로 오판된다. id 일치까지 확인한다.
    // ─────────────────────────────────────────────────────
    const curPlanId  = String(account.plan || DEFAULT_PLAN_ID);
    const curPlanObj = getPlan(curPlanId);
    const reqPlanObj = getPlan(plan.id);
    const curOrder   = Number(curPlanObj?.sort_order);
    const reqOrder   = Number(reqPlanObj?.sort_order);
    const orderKnown =
      String(curPlanObj?.id) === curPlanId &&
      String(reqPlanObj?.id) === String(plan.id) &&
      Number.isFinite(curOrder) && Number.isFinite(reqOrder);

    // ②-a 서열 확인 불가 — fail-closed. 순서를 모른 채 통과시키면 하향이 섞인다.
    if (!orderKnown) {
      console.error('[issue-billing-key] plan order unknown', curPlanId, plan.id);
      return {
        status: 409,
        body: {
          error:           'PLAN_ORDER_UNKNOWN',
          message:         '플랜 정보를 확인할 수 없어 결제를 진행할 수 없습니다. 고객센터로 문의해 주세요.',
          subscription_id: existingSub.id,
        },
      };
    }

    // ─────────────────────────────────────────────────────
    // ②-a2 [PLAN-APPLY-RECOVERY-REQUIRED-01] 결제완료·등급미반영 상태 차단
    //   ACCOUNT-PLAN-UPDATE-SILENT-FAIL-01 의 최종 분기(503 PLAN_APPLY_FAILED)로
    //   빠진 계정은 DB 가 이렇게 남는다:
    //     subscriptions = active / plan_id = 신규 / 기간 유효
    //     accounts.plan = 이전 등급  ← UPDATE 실패분
    //   이 상태로 재진입하면 curPlanId(=accounts.plan)가 이전 등급이므로
    //   ②-c 가 이를 「정상 상향」으로 읽고 잔량 판정까지 건너뛴 채 통과시킨다.
    //   → chargeBillingKey() 재호출 = 이중과금. 실패가 게이트를 여는 구조였다.
    //
    //   ★ 방향을 고정한다. sub 서열 > accounts.plan 서열 인 경우만 막는다.
    //     반대 방향(accounts.plan > sub.plan_id)은 관리자 지급의 정상 상태다
    //     (ADMIN-GRANT-NO-SUBSCRIPTION-01). 단순 불일치로 만들면 지급 계정이 전부 막힌다.
    //
    //   ★ subOrderKnown=false 는 fail-open + 로그다. 여기까지 fail-closed 로 넓히면
    //     정상 예외를 오차단한다(선장 승인).
    //
    //   ★ 재결제를 유도하지 않는다. 돈은 이미 나갔다. 복구는 운영 경로로 처리한다.
    // ─────────────────────────────────────────────────────
    const subPlanId    = String(existingSub.plan_id || '');
    const subPlanObj   = getPlan(subPlanId);
    const subOrder     = Number(subPlanObj?.sort_order);
    const subOrderKnown =
      String(subPlanObj?.id) === subPlanId && Number.isFinite(subOrder);

    if (!subOrderKnown && subPlanId && subPlanId !== curPlanId) {
      // 판정 불가. 차단하지 않는다(관리자 지급 오차단 방지). 관측만 남긴다.
      console.error(
        '[issue-billing-key] sub plan order unknown', account.id, subPlanId, curPlanId
      );
    }

    if (
      existingSub.status === 'active' &&
      periodValid &&
      subOrderKnown &&
      subOrder > curOrder
    ) {
      console.error(
        '[issue-billing-key] PLAN_APPLY_RECOVERY_REQUIRED',
        account.id, 'sub=', subPlanId, 'accounts.plan=', curPlanId
      );
      return {
        status: 409,
        body: {
          error:           'PLAN_APPLY_RECOVERY_REQUIRED',
          charged:         true,   // ★ 이미 청구 완료. 재결제 유도 금지.
          plan_applied:    false,
          recovery_needed: true,
          subscription_id: existingSub.id,
          paid_plan_id:    subPlanId,
          current_plan_id: curPlanId,
          period_end:      existingSub.current_period_end,
          message:         '이전 결제가 정상 완료되었으나 이용권 등급 반영이 처리 중입니다. 다시 결제하지 마시고 고객센터로 문의해 주세요.',
        },
      };
    }

    // ②-b 하위 전환 — V1 미지원.
    //   ★ 허용하면 quota 분모가 즉시 낮아져 이미 사용한 건수가 새 분모를 넘길 수 있다
    //     (60건 중 40건 사용 → 30건 플랜 = 즉시 소진). 잔량·환불·기간 정산 정책이
    //     함께 열리는 사안이므로 출시 V1 에서는 닫는다.
    if (reqOrder < curOrder) {
      return {
        status: 409,
        body: {
          error:           'PLAN_DOWNGRADE_NOT_SUPPORTED',
          message:         '현재 이용 중인 플랜보다 낮은 등급으로는 변경할 수 없습니다. 이용기간 만료 후 선택해 주세요.',
          subscription_id: existingSub.id,
          current_plan_id: curPlanId,
          period_end:      existingSub.current_period_end,
        },
      };
    }

    // ②-c 상위 전환 — 잔량과 무관하게 허용한다.
    //   상품이 「기간 내 사용량 구매」 구조이므로, 더 많은 사용량을 원하는 고객의
    //   상위 상품 구매를 막으면 판매 구조와 충돌한다. 아래 잔량 판정을 건너뛴다.

    // ②-d 동일 플랜 + 기간 유효 + 미납 canceled 아님 → 실제 소진 여부로 판정
    //   ★ 전량 소진 후 같은 플랜 재구매는 계속 허용된다(기존 동작 보존).
    if (reqOrder === curOrder && periodValid && !unpaidCanceled) {
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
        return { status: 503, body: { error: 'quota check failed' } };
      }

      const quota = getPlan(account.plan || DEFAULT_PLAN_ID).monthly_quota;

      if (used < quota) {
        return {
          status: 409,
          body: {
            error:           'QUOTA_REMAINING',
            message:         '현재 이용권의 잔여 제공량이 남아 있어 새 이용권을 구매할 수 없습니다.',
            subscription_id: existingSub.id,
            used,
            quota,
            remaining:       Math.max(0, quota - used),
            period_end:      existingSub.current_period_end,
          },
        };
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
      return {
        status: 400,
        body: {
          error:  'billing key verification failed',
          code:   bkInfo?.code   || null,
          reason: bkInfo?.reason || null,
        },
      };
    }
  } else {
    // 가맹점 미등록 — dummy 모드. 실제 INSERT 차단.
    return {
      status: 503,
      body: {
        dummy: true,
        message: '포트원 가맹점 미등록 — INSERT 차단 (코드 골격 단계)',
      },
    };
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
    return { status: 500, body: { error: 'billing_keys insert failed' } };
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

    return {
      status: 402,
      body: {
        ok:      false,
        error:   'first charge failed',
        code:    charge?.code   || null,
        reason:  charge?.reason || null,
      },
    };
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
    return {
      status: 500,
      body: {
        error:      'subscriptions write failed',
        payment_id: paymentId,
        charged:    true,
      },
    };
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
  //
  //    [ACCOUNT-PLAN-UPDATE-SILENT-FAIL-01]
  //      과거에는 실패해도 로그만 남기고 200 ok:true 를 내렸다. 그 결과
  //      응답(plan_id=신규) / 화면(완료카드) / DB(accounts.plan=이전등급) 가
  //      3중으로 어긋났고, 장애가 정상 성공으로 집계됐다.
  //      ★ 이제 이 UPDATE 성공을 결제 완료의 조건으로 삼는다.
  //
  //      단, 이 지점은 이미 실청구가 끝난 뒤다.
  //        - 롤백하지 않는다(청구 취소 API 호출 없음). 증거를 지우는 쪽이 더 위험하다.
  //        - "결제 실패"로 표시해 재결제를 유도하면 절대 안 된다. 이중과금이 된다.
  async function applyAccountPlan() {
    const { error } = await supabase
      .from('accounts')
      .update({ plan: plan.id, updated_at: new Date().toISOString() })
      .eq('id', account.id);
    return error;
  }

  let accUpdErr = await applyAccountPlan();

  if (accUpdErr) {
    console.error('[issue-billing-key] accounts.plan update failed (1st)', account.id, accUpdErr);
    // 순간적인 커넥션 장애를 흡수하기 위한 1회 재시도. 그 이상은 하지 않는다.
    accUpdErr = await applyAccountPlan();
    if (accUpdErr) {
      console.error('[issue-billing-key] accounts.plan update failed (retry)', account.id, accUpdErr);
    }
  }

  if (accUpdErr) {
    // ★ 200 금지. 2xx 로 내리면 프록시·모니터링에서 성공군으로 집계된다.
    //   503 을 쓰되, 프론트가 error 코드로 먼저 분기하므로
    //   일반 "결제 실패" 안내로 떨어지지 않는다.
    return {
      status: 503,
      body: {
        ok:              false,
        error:           'PLAN_APPLY_FAILED',
        charged:         true,    // ★ 돈은 이미 나갔다. 재결제 유도 금지.
        plan_applied:    false,
        recovery_needed: true,
        mode:            isRepurchase ? 'repurchase' : 'new',
        subscription_id: sub.id,
        plan_id:         plan.id,
        payment_id:      paymentId,
        period_start:    now.toISOString(),
        next_billing_at: nextBillingAt.toISOString(),
        message:         '결제는 정상 완료되었으나 이용권 등급 반영에 실패했습니다. 다시 결제하지 마시고 고객센터로 문의해 주세요.',
      },
    };
  }

  return {
    status: 200,
    body: {
      ok:              true,
      plan_applied:    true,
      mode:            isRepurchase ? 'repurchase' : 'new',
      subscription_id: sub.id,
      plan_id:         plan.id,
      payment_id:      paymentId,
      period_start:    now.toISOString(),
      next_billing_at: nextBillingAt.toISOString(),
    },
  };
}

export default executeBillingIssue;
