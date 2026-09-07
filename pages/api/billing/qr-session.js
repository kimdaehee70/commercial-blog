// pages/api/billing/qr-session.js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP2] PC용 QR 세션 생성 + 폴링.
//
// POST  → 세션 발급. { plan_id } → { ok, token, url, expires_at }
// GET   → 상태 폴링. ?token=... → { ok, status, expires_at, plan_id?, result_code? }
//
// 원칙:
//   · 결제 실행부(executeBillingIssue) 무접촉. 이 파일은 돈을 움직이지 않는다.
//   · 금액·플랜·고객정보는 발급 시점에 서버가 스냅샷한다. 이후 클라이언트 값은 신뢰하지 않는다.
//   · GET 은 Bearer 필수 + account_id 일치 확인. 토큰만으로 남의 결제 상태를 볼 수 없다.
//   · ★ 응답에 token 은 POST 에서만 나간다. GET 응답에 넣지 않는다.
//   · ★ billing_key / payment_id / subscription_id 는 어느 응답에도 넣지 않는다.
//
// 미포함(STEP3):
//   · qr-complete(토큰 claim + 결제 실행 호출)
//   · 모바일 페이지 /billing/m/[token]
//   · 재구매 Gate 사전 판정 — QR-PREGATE-NOT-APPLIED-01 로 이월.
//     현재는 결제 직전(qr-complete → executeBillingIssue)에 기존 Gate 가 전량 적용된다.
//     즉 정책 누수는 없고, "QR 을 뿌린 뒤에야 409 를 보는" UX 문제만 남는다.

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TTL_MS = 5 * 60 * 1000;   // 5분. 늘리지 않는다.

function db() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Bearer → accounts 행. 실패 시 { err:{status,body} } */
async function resolveAccount(supabase, req) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { err: { status: 401, body: { error: 'unauthorized' } } };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { err: { status: 401, body: { error: 'unauthorized' } } };
  }

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, plan, status')
    .eq('auth_user_id', userData.user.id)
    .single();

  if (accErr || !account) return { err: { status: 404, body: { error: 'account not found' } } };
  if (account.status !== 'active') return { err: { status: 403, body: { error: 'account not active' } } };

  return { account };
}

/** 만료 지연 처리 — 조회 시점에 pending 이면서 시각이 지난 행을 expired 로 내린다. */
async function lazyExpire(supabase, row) {
  if (!row) return row;
  const over = new Date(row.expires_at).getTime() <= Date.now();
  if (!over) return row;
  if (row.status !== 'pending' && row.status !== 'consuming') return row;

  // consuming 도 만료시킨다. 폰이 결제창을 열어둔 채 방치한 경우다.
  //   ★ completed/failed 는 건드리지 않는다. 결제 결과는 만료 대상이 아니다.
  await supabase
    .from('billing_qr_sessions')
    .update({ status: 'expired' })
    .eq('id', row.id)
    .in('status', ['pending', 'consuming']);

  return { ...row, status: 'expired' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const supabase = db();
  const { account, err } = await resolveAccount(supabase, req);
  if (err) return res.status(err.status).json(err.body);

  // ───────────────────────────────── GET — 폴링
  if (req.method === 'GET') {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'token required' });

    const { data: rowRaw, error: selErr } = await supabase
      .from('billing_qr_sessions')
      .select('id, account_id, plan_id, status, expires_at, result_code, plan_applied_id')
      .eq('token', token)
      .maybeSingle();

    if (selErr) {
      console.error('[qr-session] select failed', selErr);
      return res.status(503).json({ error: 'lookup failed' });
    }
    // ★ 없는 토큰과 남의 토큰을 같은 404 로 내린다. 존재 여부를 알려주지 않는다.
    if (!rowRaw || rowRaw.account_id !== account.id) {
      return res.status(404).json({ error: 'session not found' });
    }

    const row = await lazyExpire(supabase, rowRaw);

    return res.status(200).json({
      ok:              true,
      status:          row.status,
      expires_at:      row.expires_at,
      plan_id:         row.plan_id,
      result_code:     row.result_code     || null,
      plan_applied_id: row.plan_applied_id || null,
    });
  }

  // ───────────────────────────────── POST — 세션 발급
  const { plan_id } = req.body || {};
  if (!plan_id) return res.status(400).json({ error: 'plan_id required' });
  if (plan_id === 'free') return res.status(400).json({ error: 'free plan cannot subscribe' });

  // 플랜 스냅샷 — 금액 SoT 는 plans 테이블이다. 클라이언트 금액은 받지 않는다.
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, label, price_krw, is_active')
    .eq('id', plan_id)
    .single();

  if (planErr || !plan) return res.status(404).json({ error: 'plan not found' });
  if (!plan.is_active)  return res.status(400).json({ error: 'plan not available' });

  // 고객정보 스냅샷 — KG 빌링키 발급 필수값(fullName/phoneNumber).
  //   ★ 없으면 여기서 막는다. QR 을 뿌린 뒤 폰에서 실패시키지 않는다.
  //   ★ SoT 는 store_profiles. 여기서 값을 만들지 않는다(fallback 금지).
  const { data: store, error: stErr } = await supabase
    .from('store_profiles')
    .select('store_name, phone')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (stErr) {
    console.error('[qr-session] store lookup failed', stErr);
    return res.status(503).json({ error: 'store lookup failed' });
  }
  const custName  = store?.store_name || '';
  const custPhone = store?.phone || '';
  if (!custName || !custPhone) {
    return res.status(400).json({
      error:   'STORE_CONTACT_REQUIRED',
      message: '업체정보에서 연락처를 먼저 등록해 주세요.',
    });
  }

  // 계정당 진행 중 세션 1개 — 기존 pending/consuming 을 전부 만료시킨다.
  //   여러 QR 이 동시에 살아 있으면 어느 것으로 결제됐는지 PC 가 알 수 없다.
  const { error: expErr } = await supabase
    .from('billing_qr_sessions')
    .update({ status: 'expired' })
    .eq('account_id', account.id)
    .in('status', ['pending', 'consuming']);

  if (expErr) {
    // fail-closed. 이전 세션을 못 닫은 채 새로 발급하면 이중 진행이 생긴다.
    console.error('[qr-session] expire previous failed', expErr);
    return res.status(503).json({ error: 'session reset failed' });
  }

  const token     = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  const { data: ins, error: insErr } = await supabase
    .from('billing_qr_sessions')
    .insert({
      token,
      account_id: account.id,
      plan_id:    plan.id,
      plan_label: plan.label || plan.id,
      amount_krw: plan.price_krw,
      cust_name:  custName,
      cust_phone: custPhone,
      status:     'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insErr || !ins) {
    console.error('[qr-session] insert failed', insErr);
    return res.status(500).json({ error: 'session create failed' });
  }

  // url 은 QR 에 넣을 절대주소. 프록시 헤더를 그대로 믿지 않고 환경변수를 우선한다.
  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    (req.headers.host ? `https://${req.headers.host}` : '');

  return res.status(200).json({
    ok:         true,
    token,
    url:        `${origin}/billing/m/${token}`,
    expires_at: expiresAt,
    plan_id:    plan.id,
    amount_krw: plan.price_krw,
  });
}
