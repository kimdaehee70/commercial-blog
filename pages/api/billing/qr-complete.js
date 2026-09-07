// pages/api/billing/qr-complete.js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP3] 모바일 결제 완료 수신 → 토큰 원자적 claim → 결제 실행.
//
// POST { token, billing_key, customer_uid?, card_name?, card_number_masked?, card_type?, pg_provider? }
//
// 원칙:
//   · 무인증이다. 신원은 token 이 증명한다. Bearer 를 요구하지 않는다(폰은 로그인 상태가 아니다).
//   · ★ plan_id · amount · account_id 는 토큰 레코드에서만 읽는다. 클라이언트 전달값 전량 무시.
//     body 에 plan_id 가 와도 읽지 않는다.
//   · ★ consuming 고착 금지. claim 성공 후에는 어떤 경로로도 completed / failed 로 종결한다.
//   · ★ 재시도는 신규 QR 세션 발급으로만 처리한다. pending 복구 금지.
//   · 응답에 subscription_id · payment_id · account_id · billing_key 를 넣지 않는다(STEP2 노출 정책 승계).

import { createClient } from '@supabase/supabase-js';
import { executeBillingIssue } from '../../../lib/billing/executeBillingIssue';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function db() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** 세션 종결. consuming 에서만 이동한다. 여기서 실패해도 응답은 이미 확정된 결제 결과를 따른다. */
async function settle(supabase, sessionId, status, resultCode, planAppliedId) {
  const patch = { status, result_code: resultCode || null };
  if (planAppliedId) patch.plan_applied_id = planAppliedId;

  const { error } = await supabase
    .from('billing_qr_sessions')
    .update(patch)
    .eq('id', sessionId)
    .eq('status', 'consuming');

  if (error) {
    // ★ 결제는 이미 끝났다. 여기 실패는 PC 폴링이 못 끝나는 문제일 뿐 돈 문제가 아니다.
    console.error('[qr-complete] settle failed', sessionId, status, error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { token, billing_key, customer_uid, card_name, card_number_masked, card_type, pg_provider } =
    req.body || {};

  if (!token)       return res.status(400).json({ error: 'token required' });
  if (!billing_key) return res.status(400).json({ error: 'billing_key required' });

  const supabase = db();

  // ─────────────────────────────────────────────────────────
  // 1) 원자적 claim — pending + 미만료 인 행만 consuming 으로 올린다.
  //    UPDATE ... WHERE 조건 자체가 락이다. 조회 후 갱신으로 나누면 이중 결제가 열린다.
  //    ★ 0행이면 409. 이미 소비됐거나 만료됐거나 없는 토큰이다.
  // ─────────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();

  const { data: claimed, error: claimErr } = await supabase
    .from('billing_qr_sessions')
    .update({ status: 'consuming' })
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', nowIso)
    .select('id, account_id, plan_id, plan_label, amount_krw, expires_at')
    .maybeSingle();

  if (claimErr) {
    // fail-closed. claim 결과를 모른 채 결제를 진행하지 않는다.
    console.error('[qr-complete] claim failed', claimErr);
    return res.status(503).json({ error: 'claim failed' });
  }

  if (!claimed) {
    // 왜 실패했는지만 되읽는다. 값은 노출하지 않는다.
    const { data: probe } = await supabase
      .from('billing_qr_sessions')
      .select('status, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (!probe) return res.status(404).json({ error: 'SESSION_NOT_FOUND' });

    const overdue = new Date(probe.expires_at).getTime() <= Date.now();
    if (overdue || probe.status === 'expired') {
      return res.status(409).json({
        error:   'SESSION_EXPIRED',
        message: 'QR 유효시간이 지났습니다. PC 화면에서 QR 을 다시 발급해 주세요.',
      });
    }
    return res.status(409).json({
      error:   'SESSION_NOT_PENDING',
      message: '이미 처리된 QR 입니다. PC 화면에서 QR 을 다시 발급해 주세요.',
    });
  }

  // ─────────────────────────────────────────────────────────
  // 2) 계정 로드 — executeBillingIssue 가 요구하는 { id, email, plan, status }.
  //    ★ account_id 는 토큰 레코드 값이다. 클라이언트가 보낸 어떤 값도 쓰지 않는다.
  // ─────────────────────────────────────────────────────────
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, email, plan, status')
    .eq('id', claimed.account_id)
    .single();

  if (accErr || !account) {
    console.error('[qr-complete] account lookup failed', claimed.account_id, accErr);
    await settle(supabase, claimed.id, 'failed', 'ACCOUNT_LOOKUP_FAILED');
    return res.status(503).json({ error: 'account lookup failed' });
  }

  // ─────────────────────────────────────────────────────────
  // 3) 결제 실행 — 재구매 Gate·청구·구독·plan 반영 전량이 여기 안에서 돈다.
  //    ★ throw 를 잡는다. 예외로 빠지면 consuming 이 고착된다.
  // ─────────────────────────────────────────────────────────
  let result;
  try {
    result = await executeBillingIssue({
      supabase,
      account,
      planId: claimed.plan_id,          // ★ 토큰 레코드 값
      billing_key,
      customer_uid,
      card_name,
      card_number_masked,
      card_type,
      pg_provider,
    });
  } catch (e) {
    console.error('[qr-complete] executeBillingIssue threw', claimed.id, e);
    await settle(supabase, claimed.id, 'failed', 'EXECUTE_THREW');
    return res.status(500).json({ ok: false, error: 'payment execution failed' });
  }

  const status = result?.status;
  const body   = result?.body || {};

  // ─────────────────────────────────────────────────────────
  // 4) 세션 종결
  //    ★ charged:true 는 failed 로 내리지 않는다.
  //      PLAN_APPLY_FAILED(503) · PLAN_APPLY_RECOVERY_REQUIRED(409) 는 이미 돈이 나간 상태다.
  //      failed 로 표시하면 PC 화면이 재결제를 유도하고 그대로 이중과금이 된다.
  //      completed 로 종결하되 result_code 를 남겨 운영이 구분한다.
  // ─────────────────────────────────────────────────────────
  const charged = body.charged === true;

  if (status === 200) {
    await settle(supabase, claimed.id, 'completed', null, body.plan_id || claimed.plan_id);
    return res.status(200).json({
      ok:         true,
      status:     'completed',
      plan_label: claimed.plan_label,
      amount_krw: claimed.amount_krw,
    });
  }

  if (charged) {
    await settle(supabase, claimed.id, 'completed', body.error || 'CHARGED_NOT_APPLIED', body.plan_id || null);
    return res.status(status).json({
      ok:      false,
      status:  'completed',
      error:   body.error || 'CHARGED_NOT_APPLIED',
      charged: true,
      message: body.message || '결제는 정상 완료되었습니다. 다시 결제하지 마시고 고객센터로 문의해 주세요.',
    });
  }

  await settle(supabase, claimed.id, 'failed', body.error || `HTTP_${status}`);
  return res.status(status || 500).json({
    ok:      false,
    status:  'failed',
    error:   body.error || 'payment failed',
    message: body.message || null,
  });
}
