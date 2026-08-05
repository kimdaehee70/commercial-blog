// pages/api/me/subscription.js
// 세션74 v0.1 — 사용자 본인 구독 조회 / 자동갱신 해지 / 해지 철회
//
// 마이페이지 「정기결제 관리」와 요금제 화면 버튼 분기가 같은 API를 본다.
// 화면마다 따로 판정하면 세션73의 "차단은 서버 / 표시는 클라" 같은 갈라짐이 재발한다.
//
// GET  → 현재 구독 상태(없으면 FREE로 응답. 404가 아니다 — 무구독도 정상 상태다)
// POST { action: 'cancel' }  → cancel_at_period_end=true (status는 active 유지)
// POST { action: 'resume' }  → cancel_at_period_end=false
//
// ★ 즉시 강등은 여기 없다. 그건 관리자 전용(update-account.js plan='free').
//   사용자 취소는 "기간 끝까지 쓰고 그 다음 FREE"가 확정 정책이다.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getPlan, DEFAULT_PLAN_ID } from '../../../lib/billing/plans';
import { getActiveSubscription } from '../../../lib/billing/subscription';
import { cancelAtPeriodEnd, resumeSubscription } from '../../../lib/billing/subscriptionWrite';

async function authenticate(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'SUPABASE_ENV_MISSING' });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ ok: false, error: 'MISSING_ACCESS_TOKEN' });
    return null;
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    return null;
  }

  const { data: account, error: accErr } = await supabaseAdmin
    .from('accounts')
    .select('id, email, plan, status, role')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (accErr) {
    res.status(500).json({ ok: false, error: 'ACCOUNT_SELECT_FAILED', detail: accErr.message });
    return null;
  }
  if (!account) {
    res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
    return null;
  }
  return account;
}

// 구독행 → 화면이 그대로 쓸 수 있는 형태로 정리.
function shape(account, sub) {
  const planId = sub?.plan_id || account.plan || DEFAULT_PLAN_ID;
  const plan = getPlan(planId);
  const scheduledId = sub?.scheduled_plan_id || null;
  const scheduled = scheduledId ? getPlan(scheduledId) : null;

  return {
    plan_id: plan.id,
    plan_label: plan.label,
    monthly_quota: plan.monthly_quota,
    price_krw: plan.price_krw,
    has_subscription: !!sub,
    // 구독행이 없으면 FREE. 결제 이력이 없는 신규 계정의 정상 상태다.
    status: sub ? sub.status : 'none',
    source: sub?.source || null,               // payment | admin | trial
    current_period_start: sub?.current_period_start || null,
    current_period_end: sub?.current_period_end || null,
    cancel_at_period_end: !!sub?.cancel_at_period_end,
    next_billing_at: sub?.next_billing_at || null,
    // 다운그레이드 예약 — 현재 기간은 상위 플랜 유지, 갱신 시 이 플랜으로 내려간다.
    scheduled_plan_id: scheduledId,
    scheduled_plan_label: scheduled ? scheduled.label : null,
    // 화면 문구 분기용. 관리자 지급분은 자동결제가 없으므로 취소 버튼을 띄우지 않는다.
    can_cancel: !!sub && sub.source === 'payment' && !sub.cancel_at_period_end,
    can_resume: !!sub && sub.source === 'payment' && !!sub.cancel_at_period_end,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const account = await authenticate(req, res);
    if (!account) return; // authenticate가 이미 응답함

    // ── GET — 현재 상태 ──
    if (req.method === 'GET') {
      const sub = await getActiveSubscription(account.id, new Date());
      return res.status(200).json({ ok: true, subscription: shape(account, sub) });
    }

    // ── POST — cancel / resume ──
    if (account.status && account.status !== 'active') {
      return res.status(403).json({ ok: false, error: 'ACCOUNT_INACTIVE', status: account.status });
    }

    const action = String(req.body?.action || '').trim();

    if (action === 'cancel') {
      const r = await cancelAtPeriodEnd(account.id);
      if (!r.ok) return res.status(400).json({ ok: false, error: r.error });
      const sub = await getActiveSubscription(account.id, new Date());
      return res.status(200).json({
        ok: true,
        action: 'cancel',
        // 기간 끝까지는 그대로 사용 가능하다는 사실을 응답에 담아 화면이 오해를 만들지 않게 한다.
        message: '자동 결제가 해지되었습니다. 남은 기간까지는 그대로 이용할 수 있습니다.',
        subscription: shape(account, sub),
      });
    }

    if (action === 'resume') {
      const r = await resumeSubscription(account.id);
      if (!r.ok) return res.status(400).json({ ok: false, error: r.error });
      const sub = await getActiveSubscription(account.id, new Date());
      return res.status(200).json({
        ok: true,
        action: 'resume',
        message: '자동 결제가 다시 시작됩니다.',
        subscription: shape(account, sub),
      });
    }

    return res.status(400).json({ ok: false, error: 'INVALID_ACTION', allowed: ['cancel', 'resume'] });
  } catch (e) {
    console.error('[me/subscription] error:', e);
    return res.status(500).json({ ok: false, error: 'SUBSCRIPTION_FAILED', detail: e.message });
  }
}
