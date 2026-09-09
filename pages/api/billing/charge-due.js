// pages/api/billing/charge-due.js
// 정기결제 cron
//
// 매일 1회 실행 (Vercel Cron: "0 18 * * *" = 03:00 KST)
//
// 인증: Authorization: Bearer {CRON_SECRET} (Vercel Cron) 또는 x-cron-secret 헤더
// 메서드: POST / GET (Vercel Cron은 GET)
//
// ─────────────────────────────────────────────────────────────
// [BILLING-CHARGE-DUE-RENEWAL-01] 중복 실청구 차단 구조
//
//   구버전: SELECT → charge → UPDATE next_billing_at
//     재청구 배제 시점이 "청구 이후"였다. 청구와 배제 사이의 모든 중단
//     (타임아웃 / 프로세스 crash / DB UPDATE 실패)이 익일 재청구로 직결됐다.
//
//   현버전: SELECT → claim → pending 선기록 → charge → settle
//     ★ 배제 시점을 "청구 이전"으로 옮겼다. 이것이 이 파일의 유일한 핵심이다.
//     claim(next_billing_at 선전진)이 커밋된 뒤에만 charge에 진입하므로,
//     charge 이후 무엇이 실패해도 다음 실행의 due 쿼리에 걸리지 않는다.
//
//   3중 방어 (서로 독립):
//     G1 claim            — 관측값 조건부 UPDATE. 승자 1명만 charge 진입
//     G2 deterministic id — 같은 (구독, cycle, attempt)이면 항상 같은 paymentId.
//                           PortOne이 paymentId를 URL 자원으로 쓰므로 재사용을 서버가 거부
//     G3 payment_id UNIQUE — payment_history_payment_id_key. DB 레벨 최종 차단
//
//   ★ 이 3개 중 어느 것도 제거하지 않는다. 하나씩은 우회 시나리오가 존재한다.
// ─────────────────────────────────────────────────────────────
//
// [CHARGE-DUE-OVERAGE-LIVE-01] calcOverage import 제거 — 실청구 합산 경로 절단.
//   상품정책 A: 소진 시 차단 · 후불 초과청구 없음.

import { createClient } from '@supabase/supabase-js';
import { isConfigured, chargeBillingKey, getPayment } from '../../../lib/portone';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET    = process.env.CRON_SECRET || '';

const MAX_BATCH       = 20;   // 1회 실행당 최대 처리 건수 (타임아웃 여유 확보)
const RETRY_HOURS     = 24;   // 실패 후 재시도 대기 시간
const MAX_FAILED      = 2;    // 이 횟수에 도달하면 canceled
const RECONCILE_MIN   = 15;   // pending 행을 미결로 간주하기까지의 유예(분)
const RECONCILE_BATCH = 20;

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

// ─────────────────────────────────────────────
// [G2] 결정적 paymentId
//   단위 = (구독, 갱신주기, 시도회차). 같은 갱신 건이면 몇 번 재실행해도 같은 문자열.
//
//   · cycleKey: claim 이전에 관측한 앵커 시각을 UTC 분 단위로 압축.
//     재실행 시에도 DB의 같은 값을 읽으므로 동일하게 재생된다.
//   · attempt : failed_payment_count. "실패가 DB에 기록된 뒤에만" 증가하므로,
//     기록 없이 중단된 재실행은 같은 attempt = 같은 id로 묶인다.
//     ★ 회차를 분리하는 이유: PortOne은 실패한 paymentId도 소비한다.
//       재시도에 같은 id를 쓰면 PG가 거부해 재시도 자체가 불가능해진다.
//   · account_id 사용 근거: executeBillingIssue.js L425-468이 재구매 시 INSERT가 아니라
//     UPDATE를 하므로 account당 subscriptions 행은 1개다.
// ─────────────────────────────────────────────
function buildPaymentId(sub, cycleAnchorIso, attempt) {
  const d = new Date(cycleAnchorIso);
  const cycleKey =
    String(d.getUTCFullYear()) +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0');
  return `r_${sub.account_id}_${cycleKey}_a${attempt}`;
}

// ─────────────────────────────────────────────
// 결제 결과 3분류
//
//   ★ ok:false 를 전부 "실패"로 처리하면 안 된다.
//     lib/portone.js L67의 NETWORK_ERROR는 fetch 자체가 끊긴 것이고,
//     PortOne이 요청을 이미 수신·승인한 뒤에도 발생한다.
//     즉 "실패"가 아니라 "결과 불명"이다.
//
//     이를 실패로 처리하면 failed_payment_count가 올라가고 → attempt가 바뀌고
//     → paymentId가 달라져 → G2가 무력화되어 24h 뒤 이중청구가 된다.
//
//   INDETERMINATE는 아무것도 확정하지 않는다. pending 행을 남겨두고
//   다음 실행의 reconcile이 getPayment()로 PortOne에 직접 물어 확정한다.
// ─────────────────────────────────────────────
const RESULT = { PAID: 'paid', FAILED: 'failed', INDETERMINATE: 'indeterminate' };

function classifyCharge(charge) {
  if (charge && charge.ok) return RESULT.PAID;

  const code = String((charge && charge.code) || '');

  // 네트워크 절단 · 타임아웃 → 결과 불명
  if (code === 'NETWORK_ERROR') return RESULT.INDETERMINATE;

  // HTTP_5xx / HTTP_408 → PG측 미확정. 결과 불명
  const m = code.match(/^HTTP_(\d{3})$/);
  if (m) {
    const s = Number(m[1]);
    if (s === 408 || s >= 500) return RESULT.INDETERMINATE;
  }

  // 이미 결제된 paymentId → G2가 작동한 것.
  //   ★ PortOne 오류 type 문자열값이 문서로 확정되지 않았으므로 특정 문자열에
  //     의존해 성공으로 단정하지 않는다. 불명으로 두고 getPayment가 확정한다.
  if (/ALREADY|PAID/i.test(code)) return RESULT.INDETERMINATE;

  // 그 외(카드 거절 등 PortOne이 type을 실어 보낸 응답) = 확정 실패
  return RESULT.FAILED;
}

// PortOne 결제 단건 조회 결과 → 3분류
function classifyLookup(look) {
  if (!look || !look.ok) {
    const code = String((look && look.code) || '');
    if (code === 'HTTP_404') return RESULT.FAILED;   // 결제 자체가 생성되지 않음
    return RESULT.INDETERMINATE;                      // 조회 불가 → 확정하지 않는다
  }
  const st = String((look.data && look.data.status) || '').toUpperCase();
  if (st === 'PAID') return RESULT.PAID;
  if (st === 'FAILED' || st === 'CANCELLED' || st === 'CANCELED') return RESULT.FAILED;
  return RESULT.INDETERMINATE;  // READY / PENDING / VIRTUAL_ACCOUNT_ISSUED 등
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

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
    pending: 0,          // 결과 불명으로 남긴 건수
    reconciled_paid:   0,
    reconciled_failed: 0,
    errors:  [],
  };

  const SUB_FIELDS = `
    id, account_id, plan_id, billing_key_id, status,
    current_period_start, current_period_end, next_billing_at,
    failed_payment_count, last_failed_at, cancel_at_period_end,
    plans!inner(id, label, price_krw),
    billing_keys!inner(id, billing_key, status)
  `;

  // ═══════════════════════════════════════════
  // 0) RECONCILE — 이전 실행이 남긴 pending 정리
  //
  //   "돈은 나갔는데 DB 처리가 덜 된" 상태의 유일한 해소 경로.
  //   charge 이후 crash / settle 실패 / NETWORK_ERROR 가 전부 여기로 모인다.
  //   ★ 재청구하지 않는다. PortOne에 실제 상태를 물어보고 그 답을 따를 뿐이다.
  // ═══════════════════════════════════════════
  if (isConfigured()) {
    const staleBefore = new Date(now.getTime() - RECONCILE_MIN * 60 * 1000).toISOString();

    const { data: pendings, error: pendErr } = await supabase
      .from('payment_history')
      .select('id, payment_id, subscription_id, account_id, period_start, period_end, amount')
      .eq('status', 'pending')
      .lte('created_at', staleBefore)
      .limit(RECONCILE_BATCH);

    if (pendErr) {
      console.error('[charge-due] reconcile query failed', pendErr);
    }

    for (const ph of (pendings || [])) {
      try {
        const look = await getPayment(ph.payment_id);
        const verdict = classifyLookup(look);

        if (verdict === RESULT.INDETERMINATE) continue;  // 다음 회차에 다시 본다

        if (verdict === RESULT.PAID) {
          await supabase
            .from('payment_history')
            .update({
              status:          'paid',
              pg_tx_id:        (look.data && (look.data.id || look.data.txId)) || null,
              pg_response_raw: look.data || null,
              paid_at:         (look.data && look.data.paidAt) || new Date().toISOString(),
            })
            .eq('id', ph.id)
            .eq('status', 'pending');

          // 구독 기간 settle — 미반영이었다면 지금 반영한다.
          //   next_billing_at은 claim에서 이미 확정됐으므로 건드리지 않는다.
          //   lt() 조건으로 이미 반영된 경우는 no-op이 된다.
          if (ph.subscription_id && ph.period_end) {
            await supabase
              .from('subscriptions')
              .update({
                status:               'active',
                current_period_start: ph.period_start,
                current_period_end:   ph.period_end,
                failed_payment_count: 0,
                last_failed_at:       null,
                updated_at:           new Date().toISOString(),
              })
              .eq('id', ph.subscription_id)
              .lt('current_period_end', ph.period_end);
          }
          stats.reconciled_paid++;
        } else {
          // 확정 실패 → 실패 이력으로 굳히고 retry 큐로 보낸다.
          await supabase
            .from('payment_history')
            .update({
              status:          'failed',
              failure_reason:  (look.data && look.data.failure && look.data.failure.message) || 'reconciled as failed',
              failure_code:    (look.data && look.data.failure && look.data.failure.pgCode) || look.code || null,
              pg_response_raw: look.data || null,
            })
            .eq('id', ph.id)
            .eq('status', 'pending');

          if (ph.subscription_id) {
            const { data: cur } = await supabase
              .from('subscriptions')
              .select('failed_payment_count, status')
              .eq('id', ph.subscription_id)
              .single();

            const n = ((cur && cur.failed_payment_count) || 0) + 1;
            const st = n >= MAX_FAILED ? 'canceled' : 'past_due';

            await supabase
              .from('subscriptions')
              .update({
                status:               st,
                failed_payment_count: n,
                last_failed_at:       new Date().toISOString(),
                ...(st === 'canceled' ? { next_billing_at: null } : {}),
                updated_at:           new Date().toISOString(),
              })
              .eq('id', ph.subscription_id);
          }
          stats.reconciled_failed++;
        }
      } catch (e) {
        console.error('[charge-due] reconcile error', ph.payment_id, e);
        stats.errors.push({ payment_id: ph.payment_id, reason: e.message || 'reconcile exception' });
      }
    }
  }

  // ═══════════════════════════════════════════
  // 1) 정기결제 대상 조회
  //   ★ cancel_at_period_end=false 필수. 해지 예약 구독을 청구하면 안 된다.
  //     (만료 시 status 전환은 플랜 변경 정책 축에서 별도 처리 — 여기서는 청구만 막는다)
  // ═══════════════════════════════════════════
  const { data: dueSubs, error: dueErr } = await supabase
    .from('subscriptions')
    .select(SUB_FIELDS)
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('next_billing_at', now.toISOString())
    .order('next_billing_at', { ascending: true })
    .limit(MAX_BATCH);

  if (dueErr) {
    console.error('[charge-due] query failed', dueErr);
    return res.status(500).json({ error: 'query failed', detail: dueErr.message });
  }

  // 2) past_due 재시도 대상
  const retryThreshold = new Date(now.getTime() - RETRY_HOURS * 60 * 60 * 1000);
  const { data: retrySubs, error: retryErr } = await supabase
    .from('subscriptions')
    .select(SUB_FIELDS)
    .eq('status', 'past_due')
    .lt('failed_payment_count', MAX_FAILED)
    .lte('last_failed_at', retryThreshold.toISOString())
    .order('last_failed_at', { ascending: true })
    .limit(MAX_BATCH);

  if (retryErr) {
    console.error('[charge-due] retry query failed', retryErr);
  }

  const targets = [
    ...(dueSubs   || []).map(s => ({ sub: s, kind: 'recurring' })),
    ...(retrySubs || []).map(s => ({ sub: s, kind: 'retry' })),
  ];
  stats.scanned = targets.length;

  if (!isConfigured()) {
    console.log('[charge-due] portone not configured — noop', stats);
    return res.status(200).json({ ok: true, dummy: true, ...stats });
  }

  // ═══════════════════════════════════════════
  // 3) 순차 결제 처리
  // ═══════════════════════════════════════════
  for (const { sub, kind } of targets) {
    try {
      // ── 사전 검사 (claim 이전에 끝낸다. claim 후 이탈하면 롤백이 필요해진다) ──
      if (!sub.billing_keys || sub.billing_keys.status !== 'active') {
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'billing_key not active' });
        continue;
      }

      const periodStart = new Date(sub.current_period_end || now);
      const periodEnd   = addMonths(periodStart, 1);
      const baseAmount  = sub.plans.price_krw;
      const totalAmount = baseAmount;   // [CHARGE-DUE-OVERAGE-LIVE-01] 초과청구 없음

      const attempt = sub.failed_payment_count || 0;

      // cycle 앵커: recurring은 next_billing_at, retry는 current_period_end.
      //   ★ 재실행 시에도 DB의 같은 값을 읽어야 하므로 now()를 쓰지 않는다.
      const cycleAnchor = kind === 'recurring'
        ? sub.next_billing_at
        : (sub.current_period_end || sub.next_billing_at);

      if (!cycleAnchor) {
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'no cycle anchor' });
        continue;
      }

      const paymentId = buildPaymentId(sub, cycleAnchor, attempt);

      // ─────────────────────────────────────
      // [G1] ATOMIC CLAIM — 청구 이전에 이 갱신주기를 독점한다.
      //
      //   관측값을 WHERE에 그대로 넣는 optimistic lock.
      //   Postgres가 단일 행 UPDATE를 직렬화하므로 승자는 정확히 1명이다.
      //   패자는 재평가 시점에 값이 이미 바뀌어 0행을 받는다.
      //
      //   ★ status='charging' 같은 새 상태값을 쓰지 않는 이유:
      //     crash 시 구독이 active가 아닌 상태로 고착되어 서비스가 끊기고,
      //     어떤 쿼리에도 잡히지 않는 고아 행이 된다.
      //     기존 컬럼을 전진시키면 crash해도 구독은 active로 남는다.
      // ─────────────────────────────────────
      let claimed = null;

      if (kind === 'recurring') {
        // next_billing_at을 미리 전진 → 다음 실행의 due 쿼리에서 즉시 배제된다
        const { data, error } = await supabase
          .from('subscriptions')
          .update({ next_billing_at: periodEnd.toISOString(), updated_at: new Date().toISOString() })
          .eq('id', sub.id)
          .eq('status', 'active')
          .eq('next_billing_at', sub.next_billing_at)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        claimed = data;
      } else {
        // last_failed_at을 전진 → 24h 재시도 창 밖으로 밀어낸다
        const { data, error } = await supabase
          .from('subscriptions')
          .update({ last_failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', sub.id)
          .eq('status', 'past_due')
          .eq('failed_payment_count', attempt)
          .eq('last_failed_at', sub.last_failed_at)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        claimed = data;
      }

      if (!claimed) {
        // 다른 실행이 이미 선점했거나 상태가 변했다. 청구 진입 금지.
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'claim lost', kind });
        continue;
      }

      // claim 이후 이탈 시 되돌리기 — pending INSERT 실패 경로에서만 사용한다.
      //   조건부 UPDATE이므로 다른 실행이 이미 바꿔놓은 상태를 덮지 않는다.
      const releaseClaim = async () => {
        if (kind === 'recurring') {
          await supabase
            .from('subscriptions')
            .update({ next_billing_at: sub.next_billing_at, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
            .eq('next_billing_at', periodEnd.toISOString());
        } else {
          await supabase
            .from('subscriptions')
            .update({ last_failed_at: sub.last_failed_at, updated_at: new Date().toISOString() })
            .eq('id', sub.id)
            .eq('failed_payment_count', attempt);
        }
      };

      // ─────────────────────────────────────
      // pending 선기록 — 청구 이전에 증거를 남긴다.
      //
      //   ★ INSERT 실패 시 청구하지 않는다.
      //     증거 없이 돈을 빼면 reconcile이 그 건을 영영 찾지 못한다.
      //
      //   ★ kind는 'recurring' 고정.
      //     [PAYMENT-HISTORY-KIND-RETRY-CHECK-VIOLATION-01]
      //     payment_history_kind_check = ARRAY['recurring','initial','manual','refund'].
      //     'retry'는 허용값이 아니라 CHECK 위반(23514)으로 INSERT가 조용히 실패해 왔다
      //     (구버전 L178이 에러를 확인하지 않았다). 그 결과 재시도 결제는 실청구되어도
      //     이력이 남지 않았고, reconcile·UNIQUE 방어가 동시에 무력화됐다.
      //     retry는 결제의 성격이 아니라 동일 recurring 결제의 재시도이므로
      //     kind='recurring'으로 기록하고 회차는 paymentId의 a{n}으로 식별한다. (DDL 무변경)
      //
      //   ★ status는 컬럼 DEFAULT가 'pending'이지만 의도를 드러내기 위해 명시한다.
      // ─────────────────────────────────────
      const { data: phRow, error: phErr } = await supabase
        .from('payment_history')
        .insert({
          account_id:       sub.account_id,
          subscription_id:  sub.id,
          billing_key_id:   sub.billing_key_id,
          payment_id:       paymentId,
          amount:           totalAmount,
          base_amount:      baseAmount,
          overage_amount:   0,
          overage_quantity: 0,
          period_start:     periodStart.toISOString(),
          period_end:       periodEnd.toISOString(),
          kind:             'recurring',
          status:           'pending',
        })
        .select('id')
        .single();

      if (phErr || !phRow) {
        // [G3] payment_id UNIQUE 위반(23505) = 같은 cycle/attempt가 이미 존재한다.
        //   claim을 통과했는데 여기서 걸렸다면 이전 실행의 미결 건이다.
        //   ★ 재청구하지 않는다. claim도 되돌리지 않는다(되돌리면 재청구 경로가 열린다).
        //   기존 행을 reconcile이 확정한다.
        if (phErr && phErr.code === '23505') {
          stats.pending++;
          stats.errors.push({
            sub_id: sub.id,
            reason: 'duplicate payment_id — left to reconcile',
            payment_id: paymentId,
          });
          continue;
        }
        console.error('[charge-due] pending insert failed — charge aborted', sub.id, phErr);
        await releaseClaim();
        stats.skipped++;
        stats.errors.push({
          sub_id: sub.id,
          reason: 'pending insert failed',
          detail: phErr && phErr.message,
        });
        continue;
      }

      // ─── PG 결제 호출 ───
      const charge = await chargeBillingKey({
        billingKey: sub.billing_keys.billing_key,
        paymentId,
        orderName: `${sub.plans.label} 플랜 정기결제`,
        amount: totalAmount,
        customer: { customerId: sub.account_id },
      });

      const verdict = classifyCharge(charge);

      // ─── 결과 불명 → 아무것도 확정하지 않는다 ───
      //   failed_payment_count를 올리지 않는다. 올리면 attempt가 바뀌어
      //   다음 시도의 paymentId가 달라지고 G2가 무너진다.
      if (verdict === RESULT.INDETERMINATE) {
        console.warn('[charge-due] indeterminate — left pending', paymentId, charge && charge.code);
        stats.pending++;
        stats.errors.push({
          sub_id: sub.id,
          reason: `indeterminate: ${(charge && charge.code) || '?'}`,
          payment_id: paymentId,
        });
        continue;   // pending 행 유지 → 다음 실행 reconcile이 확정
      }

      if (verdict === RESULT.PAID) {
        const { error: upErr } = await supabase
          .from('payment_history')
          .update({
            status:          'paid',
            pg_tx_id:        (charge.data && (charge.data.id || charge.data.txId)) || null,
            pg_response_raw: charge.data || null,
            paid_at:         new Date().toISOString(),
          })
          .eq('id', phRow.id);

        // ★ 이 UPDATE 실패가 아래 settle을 막게 하지 않는다.
        //   돈은 이미 나갔으므로 서비스는 부여해야 한다.
        //   행은 pending으로 남고 reconcile이 회수한다.
        if (upErr) console.error('[charge-due] CRITICAL ph paid update failed', paymentId, upErr);

        const { error: setErr } = await supabase
          .from('subscriptions')
          .update({
            status:               'active',
            current_period_start: periodStart.toISOString(),
            current_period_end:   periodEnd.toISOString(),
            // next_billing_at은 claim에서 이미 확정. 재기록하지 않는다.
            failed_payment_count: 0,
            last_failed_at:       null,
            updated_at:           new Date().toISOString(),
          })
          .eq('id', sub.id);

        if (setErr) {
          // 재청구 차단 근거는 settle이 아니라 claim이므로 이중과금은 없다.
          // quota 기간만 미갱신으로 남고, paid 행 기준으로 복구 가능하다.
          console.error('[charge-due] CRITICAL settle failed', sub.id, paymentId, setErr);
          stats.errors.push({ sub_id: sub.id, reason: 'settle failed (charged)', payment_id: paymentId });
        }

        stats.charged++;
      } else {
        // ─── 확정 실패만 여기로 온다 ───
        await supabase
          .from('payment_history')
          .update({
            status:          'failed',
            failure_reason:  (charge && charge.reason) || 'pg failed',
            failure_code:    (charge && charge.code)   || null,
            pg_response_raw: (charge && charge.data)   || null,
          })
          .eq('id', phRow.id);

        const newFailedCount = attempt + 1;
        const newStatus = newFailedCount >= MAX_FAILED ? 'canceled' : 'past_due';

        await supabase
          .from('subscriptions')
          .update({
            status:               newStatus,
            failed_payment_count: newFailedCount,
            last_failed_at:       new Date().toISOString(),
            ...(newStatus === 'canceled' ? { next_billing_at: null } : {}),
            updated_at:           new Date().toISOString(),
          })
          .eq('id', sub.id);

        stats.failed++;
        stats.errors.push({ sub_id: sub.id, reason: (charge && charge.reason) || 'pg failed', kind });
      }
    } catch (e) {
      // claim은 이미 커밋됐다. 되돌리지 않는다 — 되돌리면 재청구 경로가 열린다.
      // pending 행이 남아 있으면 reconcile이 처리한다.
      console.error('[charge-due] sub error', sub.id, e);
      stats.errors.push({ sub_id: sub.id, reason: e.message || 'exception' });
    }
  }

  console.log('[charge-due] done', stats);
  return res.status(200).json({ ok: true, ...stats });
}
