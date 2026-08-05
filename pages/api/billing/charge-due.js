// pages/api/billing/charge-due.js
// 정기결제 cron — 골격
//
// 매일 1회 실행 (Vercel Cron 또는 외부 스케줄러)
// next_billing_at <= now() AND status='active' 조회 → 빌링키 결제 호출
// 실패 1회 자동 재시도 (24h 후, kind='retry')
//
// 인증: 헤더 'x-cron-secret' === process.env.CRON_SECRET
// 메서드: POST (Vercel Cron은 GET이므로 두 메서드 모두 허용)

import { createClient } from '@supabase/supabase-js';
import { isConfigured, chargeBillingKey } from '../../../lib/portone';
import { calcOverage } from '../../../lib/overage';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET    = process.env.CRON_SECRET || '';

const MAX_BATCH = 50;          // 1회 실행당 최대 처리 건수 (안전장치)
const RETRY_HOURS = 24;        // 실패 후 재시도 대기 시간

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // ─── cron 인증 ───
  // Vercel Cron은 Authorization: Bearer {CRON_SECRET} 전달
  // 수동 호출 시 x-cron-secret 헤더로도 허용
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const headerSecret = req.headers['x-cron-secret'] || '';
  const provided = bearer || headerSecret;

  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const stats = {
    scanned: 0,
    charged: 0,
    failed:  0,
    skipped: 0,
    errors:  [],
  };

  // ─── 1) 정기결제 대상 조회 ───
  // status='active' AND next_billing_at <= now
  const { data: dueSubs, error: dueErr } = await supabase
    .from('subscriptions')
    .select(`
      id, account_id, plan_id, billing_key_id,
      current_period_start, current_period_end, next_billing_at,
      failed_payment_count, last_failed_at,
      plans!inner(id, label, price_krw),
      billing_keys!inner(id, billing_key, status)
    `)
    .eq('status', 'active')
    .lte('next_billing_at', now.toISOString())
    .limit(MAX_BATCH);

  if (dueErr) {
    console.error('[charge-due] query failed', dueErr);
    return res.status(500).json({ error: 'query failed', detail: dueErr.message });
  }

  // ─── 2) past_due 재시도 대상 조회 ───
  // status='past_due' AND failed_payment_count < 2 AND last_failed_at <= now - 24h
  const retryThreshold = new Date(now.getTime() - RETRY_HOURS * 60 * 60 * 1000);
  const { data: retrySubs, error: retryErr } = await supabase
    .from('subscriptions')
    .select(`
      id, account_id, plan_id, billing_key_id,
      current_period_start, current_period_end, next_billing_at,
      failed_payment_count, last_failed_at,
      plans!inner(id, label, price_krw),
      billing_keys!inner(id, billing_key, status)
    `)
    .eq('status', 'past_due')
    .lt('failed_payment_count', 2)
    .lte('last_failed_at', retryThreshold.toISOString())
    .limit(MAX_BATCH);

  if (retryErr) {
    console.error('[charge-due] retry query failed', retryErr);
    // 정기 결제는 계속 진행
  }

  const targets = [
    ...(dueSubs  || []).map(s => ({ sub: s, kind: 'recurring' })),
    ...(retrySubs || []).map(s => ({ sub: s, kind: 'retry' })),
  ];
  stats.scanned = targets.length;

  // ─── 3) 가맹점 미등록 시 noop ───
  if (!isConfigured()) {
    console.log('[charge-due] portone not configured — noop', stats);
    return res.status(200).json({ ok: true, dummy: true, ...stats });
  }

  // ─── 4) 순차 결제 처리 ───
  for (const { sub, kind } of targets) {
    try {
      // billing_key 비활성 차단
      if (sub.billing_keys?.status !== 'active') {
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'billing_key not active' });
        continue;
      }

      const periodStart = new Date(sub.current_period_end || now);
      const periodEnd   = addMonths(periodStart, 1);
      const paymentId   = `${sub.account_id}-${kind}-${Date.now()}`;
      const baseAmount  = sub.plans.price_krw;

      // ─── overage 계산 (94차 — lib/overage.js) ───
      // 직전 사이클(current_period_start ~ current_period_end) 기준 집계
      // helper 내부에서 예외 시 0 fallback. 결제 차단 없음.
      const cycleStart = sub.current_period_start || periodStart.toISOString();
      const cycleEnd   = sub.current_period_end   || periodStart.toISOString();

      const { data: planFull } = await supabase
        .from('plans')
        .select('monthly_quota, overage_per_post_krw')
        .eq('id', sub.plan_id)
        .single();

      const overage = await calcOverage({
        account_id:   sub.account_id,
        period_start: cycleStart,
        period_end:   cycleEnd,
        plan: {
          monthly_quota:        planFull?.monthly_quota || 0,
          overage_per_post_krw: planFull?.overage_per_post_krw || 0,
        },
      });

      if (overage.error) {
        console.warn('[charge-due] overage calc error', sub.id, overage.error);
      }

      const overageAmount   = Number(overage.amount || 0);
      const overageQuantity = Number(overage.quantity || 0);
      const totalAmount     = baseAmount + overageAmount;

      // ─── PG 결제 호출 ───
      const charge = await chargeBillingKey({
        billingKey: sub.billing_keys.billing_key,
        paymentId,
        orderName: `${sub.plans.label} 플랜 ${kind === 'retry' ? '재시도 ' : ''}정기결제`,
        amount: totalAmount,
        customer: { customerId: sub.account_id },
      });

      // ─── payment_history insert ───
      const phRow = {
        account_id:        sub.account_id,
        subscription_id:   sub.id,
        billing_key_id:    sub.billing_key_id,
        payment_id:        paymentId,
        pg_tx_id:          charge?.data?.txId || null,
        amount:            totalAmount,
        base_amount:       baseAmount,
        overage_amount:    overageAmount,
        overage_quantity:  overageQuantity,
        period_start:      periodStart.toISOString(),
        period_end:        periodEnd.toISOString(),
        kind:              kind,  // 'recurring' or 'retry'
        status:            charge.ok ? 'paid' : 'failed',
        failure_reason:    charge.ok ? null : (charge.reason || 'unknown'),
        failure_code:      charge.ok ? null : (charge.code   || null),
        pg_response_raw:   charge.data || null,
        paid_at:           charge.ok ? new Date().toISOString() : null,
      };

      await supabase.from('payment_history').insert(phRow);

      if (charge.ok) {
        // 성공 → 다음 사이클로
        await supabase
          .from('subscriptions')
          .update({
            status:                'active',
            current_period_start:  periodStart.toISOString(),
            current_period_end:    periodEnd.toISOString(),
            next_billing_at:       periodEnd.toISOString(),
            failed_payment_count:  0,
            last_failed_at:        null,
            updated_at:            new Date().toISOString(),
          })
          .eq('id', sub.id);

        stats.charged++;
      } else {
        // 실패 → past_due로 전환 (또는 canceled)
        const newFailedCount = (sub.failed_payment_count || 0) + 1;
        const newStatus = newFailedCount >= 2 ? 'canceled' : 'past_due';

        await supabase
          .from('subscriptions')
          .update({
            status:                newStatus,
            failed_payment_count:  newFailedCount,
            last_failed_at:        new Date().toISOString(),
            updated_at:            new Date().toISOString(),
          })
          .eq('id', sub.id);

        stats.failed++;
        stats.errors.push({ sub_id: sub.id, reason: charge.reason || 'pg failed', kind });
      }
    } catch (e) {
      console.error('[charge-due] sub error', sub.id, e);
      stats.failed++;
      stats.errors.push({ sub_id: sub.id, reason: e.message || 'exception' });
    }
  }

  console.log('[charge-due] done', stats);
  return res.status(200).json({ ok: true, ...stats });
}
