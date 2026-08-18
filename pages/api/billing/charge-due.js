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
// [CHARGE-DUE-OVERAGE-LIVE-01] calcOverage import 제거 — 실청구 합산 경로 절단.
//   상품정책 A: 소진 시 차단 · 후불 초과청구 없음. 이 파일이 유일한 실청구 소비처였으므로
//   여기서 끊으면 고객에게 정가를 초과한 금액이 청구될 경로가 사라진다.
//   lib/overage.js 파일 자체 · DB 컬럼 · 관리자 과거 데이터는 이번 축에서 뜯지 않는다(One Axis).

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

      // ─── [CHARGE-DUE-OVERAGE-LIVE-01] 초과 청구 없음 ───
      //   상품정책 A 확정: 월 정액 → 정해진 생성량 → 소진 시 차단 → 추가 청구 없음.
      //   제공 건수를 넘긴 사용분에 대한 후불 청구는 제공하지 않는다.
      //
      //   ★ 기존 구조: calcOverage() → totalAmount = baseAmount + overageAmount.
      //     현재 무증상인 이유는 두 겹의 우연(generated_posts 테이블 부재로 amount=0,
      //     운영키 미적용으로 배치 미실행)뿐이었다. 둘 중 하나만 풀려도 고객에게
      //     정가를 초과한 금액이 청구된다. 그래서 산식이 아니라 합산 자체를 끊는다.
      //
      //   ★ payment_history 의 overage_* 컬럼은 0 으로 계속 기록한다(스키마 무변경).
      //     issue-billing-key.js 가 이미 0 하드코딩이므로 두 청구 경로가 일치한다.
      //   ★ 여기에 다시 overage 를 더하는 코드를 넣지 않는다. 넣으려면 상품정책부터 바꾼다.
      const overageAmount   = 0;
      const overageQuantity = 0;
      const totalAmount     = baseAmount;

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
