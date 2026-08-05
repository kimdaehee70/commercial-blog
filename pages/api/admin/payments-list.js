// pages/api/admin/payments-list.js
// 93차 v0.1 — 결제 이력 read-only 조회 (신규)
//
// 패턴: subscriptions-list.js 답습
//   - requireOwner 가드
//   - 200건 제한 (created_at DESC)
//   - JOIN: payment_history × subscriptions × plans × accounts
//   - summary: 건수/총액 (status×kind 매트릭스)
//
// publish.js / me.js / DB 스키마: 무변경

import { createClient } from '@supabase/supabase-js';
import { requireOwner } from '../../../lib/guards';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // 인증 + owner 가드 — requireOwner (guards.js 통합 / 85차 단일화)
  //   자체 requireOwner(객체반환) → guards(res 직접전송+null) 규약 전환.
  //   응답 포맷 변화: NO_TOKEN/INVALID_TOKEN/NOT_OWNER → UNAUTHORIZED/FORBIDDEN(detail).
  //   getUser 키 service_role→anon 이나 토큰 자체검증이라 동치. 본문 JOIN은 supabaseAdmin 유지.
  const user = await requireOwner(req, res);
  if (!user) return; // res 이미 전송됨 (401/403)

  try {
    // 1) payment_history 200건
    const { data: payments, error: payErr } = await supabaseAdmin
      .from('payment_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (payErr) throw new Error('PAYMENT_QUERY: ' + payErr.message);

    const rows = payments || [];

    // 2) JOIN 보강 — subscriptions / accounts / plans
    const subIds = [...new Set(rows.map(r => r.subscription_id).filter(Boolean))];
    const acctIds = [...new Set(rows.map(r => r.account_id).filter(Boolean))];

    let subsMap = {};
    let acctMap = {};
    let plansMap = {};

    if (subIds.length > 0) {
      const { data: subs } = await supabaseAdmin
        .from('subscriptions')
        .select('id, plan_id, status')
        .in('id', subIds);
      (subs || []).forEach(s => { subsMap[s.id] = s; });

      const planIds = [...new Set((subs || []).map(s => s.plan_id).filter(Boolean))];
      if (planIds.length > 0) {
        const { data: plans } = await supabaseAdmin
          .from('plans')
          .select('id, label, price_krw, monthly_quota')
          .in('id', planIds);
        (plans || []).forEach(p => { plansMap[p.id] = p; });
      }
    }

    if (acctIds.length > 0) {
      const { data: accts } = await supabaseAdmin
        .from('accounts')
        .select('id, email, display_name')
        .in('id', acctIds);
      (accts || []).forEach(a => { acctMap[a.id] = a; });
    }

    // 3) row 보강
    const enriched = rows.map(r => {
      const sub = subsMap[r.subscription_id] || null;
      const plan = sub ? plansMap[sub.plan_id] : null;
      const acct = acctMap[r.account_id] || null;
      return {
        ...r,
        account_email: acct?.email || null,
        account_display_name: acct?.display_name || null,
        plan_id: sub?.plan_id || null,
        plan_label: plan?.label || null,
        subscription_status: sub?.status || null,
      };
    });

    // 4) summary
    const summary = {
      total: enriched.length,
      paid: 0,
      failed: 0,
      refunded: 0,
      by_kind: { initial: 0, recurring: 0, retry: 0 },
      total_amount_krw: 0,
      total_overage_krw: 0,
      total_paid_krw: 0,
    };

    for (const r of enriched) {
      const st = r.status || 'unknown';
      if (st === 'paid') summary.paid++;
      else if (st === 'failed') summary.failed++;
      else if (st === 'refunded') summary.refunded++;

      const k = r.kind || 'unknown';
      if (summary.by_kind[k] !== undefined) summary.by_kind[k]++;

      const amt = Number(r.amount || 0);
      const over = Number(r.overage_amount || 0);
      summary.total_amount_krw += amt;
      summary.total_overage_krw += over;
      if (st === 'paid') summary.total_paid_krw += (amt + over);
    }

    return res.status(200).json({
      ok: true,
      checked_at: new Date().toISOString(),
      summary,
      rows: enriched,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      diag: {
        error_message: e.message,
        exception: String(e),
      },
    });
  }
}
