// pages/api/billing/charge-due.js
// ?•ê¸°ê²°ì œ cron
//
// ë§¤ì¼ 1???¤í–‰ (Vercel Cron: "0 18 * * *" = 03:00 KST)
//
// ?¸ì¦: Authorization: Bearer {CRON_SECRET} (Vercel Cron) ?ëŠ” x-cron-secret ?¤ë”
// ë©”ì„œ?? POST / GET (Vercel Cron?€ GET)
//
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// [BILLING-CHARGE-DUE-RENEWAL-01] ì¤‘ë³µ ?¤ì²­êµ?ì°¨ë‹¨ êµ¬ì¡°
//
//   êµ¬ë²„?? SELECT ??charge ??UPDATE next_billing_at
//     ?¬ì²­êµ?ë°°ì œ ?œì ??"ì²?µ¬ ?´í›„"?€?? ì²?µ¬?€ ë°°ì œ ?¬ì´??ëª¨ë“  ì¤‘ë‹¨
//     (?€?„ì•„??/ ?„ë¡œ?¸ìŠ¤ crash / DB UPDATE ?¤íŒ¨)???µì¼ ?¬ì²­êµ¬ë¡œ ì§ê²°?ë‹¤.
//
//   ?„ë²„?? SELECT ??claim ??pending ? ê¸°ë¡???charge ??settle
//     ??ë°°ì œ ?œì ??"ì²?µ¬ ?´ì „"?¼ë¡œ ??²¼?? ?´ê²ƒ?????Œì¼??? ì¼???µì‹¬?´ë‹¤.
//     claim(next_billing_at ? ì „ì§???ì»¤ë°‹???¤ì—ë§?charge??ì§„ì…?˜ë?ë¡?
//     charge ?´í›„ ë¬´ì—‡???¤íŒ¨?´ë„ ?¤ìŒ ?¤í–‰??due ì¿¼ë¦¬??ê±¸ë¦¬ì§€ ?ŠëŠ”??
//
//   3ì¤?ë°©ì–´ (?œë¡œ ?…ë¦½):
//     G1 claim            ??ê´€ì¸¡ê°’ ì¡°ê±´ë¶€ UPDATE. ?¹ì 1ëª…ë§Œ charge ì§„ì…
//     G2 deterministic id ??ê°™ì? (êµ¬ë…, cycle, attempt)?´ë©´ ??ƒ ê°™ì? paymentId.
//                           PortOne??paymentIdë¥?URL ?ì›?¼ë¡œ ?°ë?ë¡??¬ì‚¬?©ì„ ?œë²„ê°€ ê±°ë?
//     G3 payment_id UNIQUE ??payment_history_payment_id_key. DB ?ˆë²¨ ìµœì¢… ì°¨ë‹¨
//
//   ????3ê°?ì¤??´ëŠ ê²ƒë„ ?œê±°?˜ì? ?ŠëŠ”?? ?˜ë‚˜?©ì? ?°íšŒ ?œë‚˜ë¦¬ì˜¤ê°€ ì¡´ì¬?œë‹¤.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
//
// [CHARGE-DUE-OVERAGE-LIVE-01] calcOverage import ?œê±° ???¤ì²­êµ??©ì‚° ê²½ë¡œ ?ˆë‹¨.
//   ?í’ˆ?•ì±… A: ?Œì§„ ??ì°¨ë‹¨ Â· ?„ë¶ˆ ì´ˆê³¼ì²?µ¬ ?†ìŒ.

import { createClient } from '@supabase/supabase-js';
import { isConfigured, chargeBillingKey, getPayment } from '../../../lib/portone';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET    = process.env.CRON_SECRET || '';

const MAX_BATCH       = 20;   // 1???¤í–‰??ìµœë? ì²˜ë¦¬ ê±´ìˆ˜ (?€?„ì•„???¬ìœ  ?•ë³´)
const RETRY_HOURS     = 24;   // ?¤íŒ¨ ???¬ì‹œ???€ê¸??œê°„
const MAX_FAILED      = 2;    // ???Ÿìˆ˜???„ë‹¬?˜ë©´ canceled
const RECONCILE_MIN   = 15;   // pending ?‰ì„ ë¯¸ê²°ë¡?ê°„ì£¼?˜ê¸°ê¹Œì???? ì˜ˆ(ë¶?
const RECONCILE_BATCH = 20;

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// [G2] ê²°ì •??paymentId
//   ?¨ìœ„ = (êµ¬ë…, ê°±ì‹ ì£¼ê¸°, ?œë„?Œì°¨). ê°™ì? ê°±ì‹  ê±´ì´ë©?ëª?ë²??¬ì‹¤?‰í•´??ê°™ì? ë¬¸ì??
//
//   Â· cycleKey: claim ?´ì „??ê´€ì¸¡í•œ ?µì»¤ ?œê°??UTC ë¶??¨ìœ„ë¡??•ì¶•.
//     ?¬ì‹¤???œì—??DB??ê°™ì? ê°’ì„ ?½ìœ¼ë¯€ë¡??™ì¼?˜ê²Œ ?¬ìƒ?œë‹¤.
//   Â· attempt : failed_payment_count. "?¤íŒ¨ê°€ DB??ê¸°ë¡???¤ì—ë§? ì¦ê??˜ë?ë¡?
//     ê¸°ë¡ ?†ì´ ì¤‘ë‹¨???¬ì‹¤?‰ì? ê°™ì? attempt = ê°™ì? idë¡?ë¬¶ì¸??
//     ???Œì°¨ë¥?ë¶„ë¦¬?˜ëŠ” ?´ìœ : PortOne?€ ?¤íŒ¨??paymentId???Œë¹„?œë‹¤.
//       ?¬ì‹œ?„ì— ê°™ì? idë¥??°ë©´ PGê°€ ê±°ë????¬ì‹œ???ì²´ê°€ ë¶ˆê??¥í•´ì§„ë‹¤.
//   Â· account_id ?¬ìš© ê·¼ê±°: executeBillingIssue.js L425-468???¬êµ¬ë§???INSERTê°€ ?„ë‹ˆ??//     UPDATEë¥??˜ë?ë¡?account??subscriptions ?‰ì? 1ê°œë‹¤.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ê²°ì œ ê²°ê³¼ 3ë¶„ë¥˜
//
//   ??ok:false ë¥??„ë? "?¤íŒ¨"ë¡?ì²˜ë¦¬?˜ë©´ ???œë‹¤.
//     lib/portone.js L67??NETWORK_ERROR??fetch ?ì²´ê°€ ?Šê¸´ ê²ƒì´ê³?
//     PortOne???”ì²­???´ë? ?˜ì‹ Â·?¹ì¸???¤ì—??ë°œìƒ?œë‹¤.
//     ì¦?"?¤íŒ¨"ê°€ ?„ë‹ˆ??"ê²°ê³¼ ë¶ˆëª…"?´ë‹¤.
//
//     ?´ë? ?¤íŒ¨ë¡?ì²˜ë¦¬?˜ë©´ failed_payment_countê°€ ?¬ë¼ê°€ê³???attemptê°€ ë°”ë€Œê³ 
//     ??paymentIdê°€ ?¬ë¼????G2ê°€ ë¬´ë ¥?”ë˜??24h ???´ì¤‘ì²?µ¬ê°€ ?œë‹¤.
//
//   INDETERMINATE???„ë¬´ê²ƒë„ ?•ì •?˜ì? ?ŠëŠ”?? pending ?‰ì„ ?¨ê²¨?ê³ 
//   ?¤ìŒ ?¤í–‰??reconcile??getPayment()ë¡?PortOne??ì§ì ‘ ë¬¼ì–´ ?•ì •?œë‹¤.
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const RESULT = { PAID: 'paid', FAILED: 'failed', INDETERMINATE: 'indeterminate' };

function classifyCharge(charge) {
  if (charge && charge.ok) return RESULT.PAID;

  const code = String((charge && charge.code) || '');

  // ?¤íŠ¸?Œí¬ ?ˆë‹¨ Â· ?€?„ì•„????ê²°ê³¼ ë¶ˆëª…
  if (code === 'NETWORK_ERROR') return RESULT.INDETERMINATE;

  // HTTP_5xx / HTTP_408 ??PGì¸?ë¯¸í™•?? ê²°ê³¼ ë¶ˆëª…
  const m = code.match(/^HTTP_(\d{3})$/);
  if (m) {
    const s = Number(m[1]);
    if (s === 408 || s >= 500) return RESULT.INDETERMINATE;
  }

  // ?´ë? ê²°ì œ??paymentId ??G2ê°€ ?‘ë™??ê²?
  //   ??PortOne ?¤ë¥˜ type ë¬¸ì?´ê°’??ë¬¸ì„œë¡??•ì •?˜ì? ?Šì•˜?¼ë?ë¡??¹ì • ë¬¸ì?´ì—
  //     ?˜ì¡´???±ê³µ?¼ë¡œ ?¨ì •?˜ì? ?ŠëŠ”?? ë¶ˆëª…?¼ë¡œ ?ê³  getPaymentê°€ ?•ì •?œë‹¤.
  if (/ALREADY|PAID/i.test(code)) return RESULT.INDETERMINATE;

  // ê·???ì¹´ë“œ ê±°ì ˆ ??PortOne??type???¤ì–´ ë³´ë‚¸ ?‘ë‹µ) = ?•ì • ?¤íŒ¨
  return RESULT.FAILED;
}

// PortOne ê²°ì œ ?¨ê±´ ì¡°íšŒ ê²°ê³¼ ??3ë¶„ë¥˜
function classifyLookup(look) {
  if (!look || !look.ok) {
    const code = String((look && look.code) || '');
    if (code === 'HTTP_404') return RESULT.FAILED;   // ê²°ì œ ?ì²´ê°€ ?ì„±?˜ì? ?ŠìŒ
    return RESULT.INDETERMINATE;                      // ì¡°íšŒ ë¶ˆê? ???•ì •?˜ì? ?ŠëŠ”??  }
  const st = String((look.data && look.data.status) || '').toUpperCase();
  if (st === 'PAID') return RESULT.PAID;
  if (st === 'FAILED' || st === 'CANCELLED' || st === 'CANCELED') return RESULT.FAILED;
  return RESULT.INDETERMINATE;  // READY / PENDING / VIRTUAL_ACCOUNT_ISSUED ??}

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
    pending: 0,          // ê²°ê³¼ ë¶ˆëª…?¼ë¡œ ?¨ê¸´ ê±´ìˆ˜
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

  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  // 0) RECONCILE ???´ì „ ?¤í–‰???¨ê¸´ pending ?•ë¦¬
  //
  //   "?ˆì? ?˜ê°”?”ë° DB ì²˜ë¦¬ê°€ ???? ?íƒœ??? ì¼???´ì†Œ ê²½ë¡œ.
  //   charge ?´í›„ crash / settle ?¤íŒ¨ / NETWORK_ERROR ê°€ ?„ë? ?¬ê¸°ë¡?ëª¨ì¸??
  //   ???¬ì²­êµ¬í•˜ì§€ ?ŠëŠ”?? PortOne???¤ì œ ?íƒœë¥?ë¬¼ì–´ë³´ê³  ê·??µì„ ?°ë? ë¿ì´??
  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  if (isConfigured()) {
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

        if (verdict === RESULT.INDETERMINATE) continue;  // ?¤ìŒ ?Œì°¨???¤ì‹œ ë³¸ë‹¤

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

          // êµ¬ë… ê¸°ê°„ settle ??ë¯¸ë°˜?ì´?ˆë‹¤ë©?ì§€ê¸?ë°˜ì˜?œë‹¤.
          //   next_billing_at?€ claim?ì„œ ?´ë? ?•ì •?ìœ¼ë¯€ë¡?ê±´ë“œë¦¬ì? ?ŠëŠ”??
          //   lt() ì¡°ê±´?¼ë¡œ ?´ë? ë°˜ì˜??ê²½ìš°??no-op???œë‹¤.
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
          // ?•ì • ?¤íŒ¨ ???¤íŒ¨ ?´ë ¥?¼ë¡œ êµ³íˆê³?retry ?ë¡œ ë³´ë‚¸??
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

  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  // 1) ?•ê¸°ê²°ì œ ?€??ì¡°íšŒ
  //   ??cancel_at_period_end=false ?„ìˆ˜. ?´ì? ?ˆì•½ êµ¬ë…??ì²?µ¬?˜ë©´ ???œë‹¤.
  //     (ë§Œë£Œ ??status ?„í™˜?€ ?Œëœ ë³€ê²??•ì±… ì¶•ì—??ë³„ë„ ì²˜ë¦¬ ???¬ê¸°?œëŠ” ì²?µ¬ë§?ë§‰ëŠ”??
  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  const { data: dueSubs, error: dueErr } = await supabase
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

  // 2) past_due ?¬ì‹œ???€??  const retryThreshold = new Date(now.getTime() - RETRY_HOURS * 60 * 60 * 1000);
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
    console.log('[charge-due] portone not configured ??noop', stats);
    return res.status(200).json({ ok: true, dummy: true, ...stats });
  }

  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  // 3) ?œì°¨ ê²°ì œ ì²˜ë¦¬
  // ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??  for (const { sub, kind } of targets) {
    try {
      // ?€?€ ?¬ì „ ê²€??(claim ?´ì „???ë‚¸?? claim ???´íƒˆ?˜ë©´ ë¡¤ë°±???„ìš”?´ì§„?? ?€?€
      if (!sub.billing_keys || sub.billing_keys.status !== 'active') {
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'billing_key not active' });
        continue;
      }

      const periodStart = new Date(sub.current_period_end || now);
      const periodEnd   = addMonths(periodStart, 1);
      const baseAmount  = sub.plans.price_krw;
      const totalAmount = baseAmount;   // [CHARGE-DUE-OVERAGE-LIVE-01] ì´ˆê³¼ì²?µ¬ ?†ìŒ

      const attempt = sub.failed_payment_count || 0;

      // cycle ?µì»¤: recurring?€ next_billing_at, retry??current_period_end.
      //   ???¬ì‹¤???œì—??DB??ê°™ì? ê°’ì„ ?½ì–´???˜ë?ë¡?now()ë¥??°ì? ?ŠëŠ”??
      const cycleAnchor = kind === 'recurring'
        ? sub.next_billing_at
        : (sub.current_period_end || sub.next_billing_at);

      if (!cycleAnchor) {
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'no cycle anchor' });
        continue;
      }

      const paymentId = buildPaymentId(sub, cycleAnchor, attempt);

      // ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
      // [G1] ATOMIC CLAIM ??ì²?µ¬ ?´ì „????ê°±ì‹ ì£¼ê¸°ë¥??…ì ?œë‹¤.
      //
      //   ê´€ì¸¡ê°’??WHERE??ê·¸ë?ë¡??£ëŠ” optimistic lock.
      //   Postgresê°€ ?¨ì¼ ??UPDATEë¥?ì§ë ¬?”í•˜ë¯€ë¡??¹ì???•í™•??1ëª…ì´??
      //   ?¨ì???¬í‰ê°€ ?œì ??ê°’ì´ ?´ë? ë°”ë€Œì–´ 0?‰ì„ ë°›ëŠ”??
      //
      //   ??status='charging' ê°™ì? ???íƒœê°’ì„ ?°ì? ?ŠëŠ” ?´ìœ :
      //     crash ??êµ¬ë…??activeê°€ ?„ë‹Œ ?íƒœë¡?ê³ ì°©?˜ì–´ ?œë¹„?¤ê? ?Šê¸°ê³?
      //     ?´ë–¤ ì¿¼ë¦¬?ë„ ?¡íˆì§€ ?ŠëŠ” ê³ ì•„ ?‰ì´ ?œë‹¤.
      //     ê¸°ì¡´ ì»¬ëŸ¼???„ì§„?œí‚¤ë©?crash?´ë„ êµ¬ë…?€ activeë¡??¨ëŠ”??
      // ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
      let claimed = null;

      if (kind === 'recurring') {
        // next_billing_at??ë¯¸ë¦¬ ?„ì§„ ???¤ìŒ ?¤í–‰??due ì¿¼ë¦¬?ì„œ ì¦‰ì‹œ ë°°ì œ?œë‹¤
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
        // last_failed_at???„ì§„ ??24h ?¬ì‹œ??ì°?ë°–ìœ¼ë¡?ë°€?´ë‚¸??        const { data, error } = await supabase
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
        // ?¤ë¥¸ ?¤í–‰???´ë? ? ì ?ˆê±°???íƒœê°€ ë³€?ˆë‹¤. ì²?µ¬ ì§„ì… ê¸ˆì?.
        stats.skipped++;
        stats.errors.push({ sub_id: sub.id, reason: 'claim lost', kind });
        continue;
      }

      // claim ?´í›„ ?´íƒˆ ???˜ëŒë¦¬ê¸° ??pending INSERT ?¤íŒ¨ ê²½ë¡œ?ì„œë§??¬ìš©?œë‹¤.
      //   ì¡°ê±´ë¶€ UPDATE?´ë?ë¡??¤ë¥¸ ?¤í–‰???´ë? ë°”ê¿”?“ì? ?íƒœë¥???? ?ŠëŠ”??
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

      // ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
      // pending ? ê¸°ë¡???ì²?µ¬ ?´ì „??ì¦ê±°ë¥??¨ê¸´??
      //
      //   ??INSERT ?¤íŒ¨ ??ì²?µ¬?˜ì? ?ŠëŠ”??
      //     ì¦ê±° ?†ì´ ?ˆì„ ë¹¼ë©´ reconcile??ê·?ê±´ì„ ?ì˜ ì°¾ì? ëª»í•œ??
      //
      //   ??kind??'recurring' ê³ ì •.
      //     [PAYMENT-HISTORY-KIND-RETRY-CHECK-VIOLATION-01]
      //     payment_history_kind_check = ARRAY['recurring','initial','manual','refund'].
      //     'retry'???ˆìš©ê°’ì´ ?„ë‹ˆ??CHECK ?„ë°˜(23514)?¼ë¡œ INSERTê°€ ì¡°ìš©???¤íŒ¨???”ë‹¤
      //     (êµ¬ë²„??L178???ëŸ¬ë¥??•ì¸?˜ì? ?Šì•˜??. ê·?ê²°ê³¼ ?¬ì‹œ??ê²°ì œ???¤ì²­êµ¬ë˜?´ë„
      //     ?´ë ¥???¨ì? ?Šì•˜ê³? reconcileÂ·UNIQUE ë°©ì–´ê°€ ?™ì‹œ??ë¬´ë ¥?”ë??
      //     retry??ê²°ì œ???±ê²©???„ë‹ˆ???™ì¼ recurring ê²°ì œ???¬ì‹œ?„ì´ë¯€ë¡?      //     kind='recurring'?¼ë¡œ ê¸°ë¡?˜ê³  ?Œì°¨??paymentId??a{n}?¼ë¡œ ?ë³„?œë‹¤. (DDL ë¬´ë?ê²?
      //
      //   ??status??ì»¬ëŸ¼ DEFAULTê°€ 'pending'?´ì?ë§??˜ë„ë¥??œëŸ¬?´ê¸° ?„í•´ ëª…ì‹œ?œë‹¤.
      // ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
        // [G3] payment_id UNIQUE ?„ë°˜(23505) = ê°™ì? cycle/attemptê°€ ?´ë? ì¡´ì¬?œë‹¤.
        //   claim???µê³¼?ˆëŠ”???¬ê¸°??ê±¸ë ¸?¤ë©´ ?´ì „ ?¤í–‰??ë¯¸ê²° ê±´ì´??
        //   ???¬ì²­êµ¬í•˜ì§€ ?ŠëŠ”?? claim???˜ëŒë¦¬ì? ?ŠëŠ”???˜ëŒë¦¬ë©´ ?¬ì²­êµ?ê²½ë¡œê°€ ?´ë¦°??.
        //   ê¸°ì¡´ ?‰ì„ reconcile???•ì •?œë‹¤.
        if (phErr && phErr.code === '23505') {
          stats.pending++;
          stats.errors.push({
            sub_id: sub.id,
            reason: 'duplicate payment_id ??left to reconcile',
            payment_id: paymentId,
          });
          continue;
        }
        console.error('[charge-due] pending insert failed ??charge aborted', sub.id, phErr);
        await releaseClaim();
        stats.skipped++;
        stats.errors.push({
          sub_id: sub.id,
          reason: 'pending insert failed',
          detail: phErr && phErr.message,
        });
        continue;
      }

      // ?€?€?€ PG ê²°ì œ ?¸ì¶œ ?€?€?€
      const charge = await chargeBillingKey({
        billingKey: sub.billing_keys.billing_key,
        paymentId,
        orderName: `${sub.plans.label} ?Œëœ ?•ê¸°ê²°ì œ`,
        amount: totalAmount,
        customer: { customerId: sub.account_id },
      });

      const verdict = classifyCharge(charge);

      // ?€?€?€ ê²°ê³¼ ë¶ˆëª… ???„ë¬´ê²ƒë„ ?•ì •?˜ì? ?ŠëŠ”???€?€?€
      //   failed_payment_countë¥??¬ë¦¬ì§€ ?ŠëŠ”?? ?¬ë¦¬ë©?attemptê°€ ë°”ë€Œì–´
      //   ?¤ìŒ ?œë„??paymentIdê°€ ?¬ë¼ì§€ê³?G2ê°€ ë¬´ë„ˆì§„ë‹¤.
      if (verdict === RESULT.INDETERMINATE) {
        console.warn('[charge-due] indeterminate ??left pending', paymentId, charge && charge.code);
        stats.pending++;
        stats.errors.push({
          sub_id: sub.id,
          reason: `indeterminate: ${(charge && charge.code) || '?'}`,
          payment_id: paymentId,
        });
        continue;   // pending ??? ì? ???¤ìŒ ?¤í–‰ reconcile???•ì •
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

        // ????UPDATE ?¤íŒ¨ê°€ ?„ë˜ settle??ë§‰ê²Œ ?˜ì? ?ŠëŠ”??
        //   ?ˆì? ?´ë? ?˜ê°”?¼ë?ë¡??œë¹„?¤ëŠ” ë¶€?¬í•´???œë‹¤.
        //   ?‰ì? pending?¼ë¡œ ?¨ê³  reconcile???Œìˆ˜?œë‹¤.
        if (upErr) console.error('[charge-due] CRITICAL ph paid update failed', paymentId, upErr);

        const { error: setErr } = await supabase
          .from('subscriptions')
          .update({
            status:               'active',
            current_period_start: periodStart.toISOString(),
            current_period_end:   periodEnd.toISOString(),
            // next_billing_at?€ claim?ì„œ ?´ë? ?•ì •. ?¬ê¸°ë¡í•˜ì§€ ?ŠëŠ”??
            failed_payment_count: 0,
            last_failed_at:       null,
            updated_at:           new Date().toISOString(),
          })
          .eq('id', sub.id);

        if (setErr) {
          // ?¬ì²­êµ?ì°¨ë‹¨ ê·¼ê±°??settle???„ë‹ˆ??claim?´ë?ë¡??´ì¤‘ê³¼ê¸ˆ?€ ?†ë‹¤.
          // quota ê¸°ê°„ë§?ë¯¸ê°±? ìœ¼ë¡??¨ê³ , paid ??ê¸°ì??¼ë¡œ ë³µêµ¬ ê°€?¥í•˜??
          console.error('[charge-due] CRITICAL settle failed', sub.id, paymentId, setErr);
          stats.errors.push({ sub_id: sub.id, reason: 'settle failed (charged)', payment_id: paymentId });
        }

        stats.charged++;
      } else {
        // ?€?€?€ ?•ì • ?¤íŒ¨ë§??¬ê¸°ë¡??¨ë‹¤ ?€?€?€
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
      // claim?€ ?´ë? ì»¤ë°‹?ë‹¤. ?˜ëŒë¦¬ì? ?ŠëŠ”?????˜ëŒë¦¬ë©´ ?¬ì²­êµ?ê²½ë¡œê°€ ?´ë¦°??
      // pending ?‰ì´ ?¨ì•„ ?ˆìœ¼ë©?reconcile??ì²˜ë¦¬?œë‹¤.
      console.error('[charge-due] sub error', sub.id, e);
      stats.errors.push({ sub_id: sub.id, reason: e.message || 'exception' });
    }
  }

  // [SUBSCRIPTION-EXPIRY-ENFORCE-01] period end passed -> expired + plan free
  // no source exception. idempotent: status filter excludes already-expired rows.
  try {
    const nowIso = new Date().toISOString();

    const { data: expTargets, error: expSelErr } = await supabase
      .from('subscriptions')
      .select('id, account_id')
      .in('status', ['active', 'canceled'])
      .lt('current_period_end', nowIso);

    if (expSelErr) throw expSelErr;

    const expIds  = (expTargets || []).map(r => r.id);
    const expAccs = [...new Set((expTargets || []).map(r => r.account_id))];

    stats.expired_subs = 0;
    stats.expired_accounts = 0;

    if (expIds.length) {
      const { error: expSubErr } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled', next_billing_at: null, updated_at: nowIso })
        .in('id', expIds)
        .in('status', ['active', 'canceled']);
      if (expSubErr) throw expSubErr;
      stats.expired_subs = expIds.length;

      const { error: expAccErr } = await supabase
        .from('accounts')
        .update({ plan: 'free' })
        .in('id', expAccs)
        .neq('plan', 'free');
      if (expAccErr) throw expAccErr;
      stats.expired_accounts = expAccs.length;
    }

    console.log('[charge-due] expiry enforced', stats.expired_subs, stats.expired_accounts);
  } catch (e) {
    console.error('[charge-due] expiry enforce failed:', e.message || e);
    stats.errors.push({ reason: 'expiry enforce failed: ' + (e.message || 'exception') });
  }

  console.log('[charge-due] done', stats);
  return res.status(200).json({ ok: true, ...stats });
}
