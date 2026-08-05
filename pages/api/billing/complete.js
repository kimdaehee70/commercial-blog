// pages/api/billing/complete.js
// 세션74 B-4-2 v0.1 — 결제창 성공 콜백 처리 (사용자 경로)
//
// 클라이언트가 결제창에서 성공 응답을 받으면 이 API를 호출한다.
// 단, 이 호출 자체는 신뢰 근거가 아니다 — 실제 판정은 lib/billing/portone.settlePayment가
// PortOne 서버에 다시 물어보고 금액을 대조해서 내린다.
// 웹훅과 동시에 도착해도 settlePayment가 멱등이라 구독이 두 번 생기지 않는다.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { settlePayment } from '../../../lib/billing/portone';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(500).json({ ok: false, error: 'SUPABASE_ENV_MISSING' });

    // ── 인증 ──
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return res.status(401).json({ ok: false, error: 'MISSING_ACCESS_TOKEN' });

    const authClient = createClient(url, key, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }

    const paymentId = String(req.body?.payment_id || req.body?.paymentId || '').trim();
    if (!paymentId) return res.status(400).json({ ok: false, error: 'PAYMENT_ID_REQUIRED' });

    // ── 소유권 확인 — 남의 주문을 확정시키지 못하게 ──
    const { data: account } = await supabaseAdmin
      .from('accounts').select('id').eq('auth_user_id', userData.user.id).maybeSingle();
    if (!account) return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });

    const { data: own } = await supabaseAdmin
      .from('payment_orders').select('id, account_id')
      .eq('payment_id', paymentId).maybeSingle();
    if (!own) return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
    if (Number(own.account_id) !== Number(account.id)) {
      console.warn(`[complete] 🚨 타 계정 주문 확정 시도 account=${account.id} order=${own.account_id}`);
      return res.status(403).json({ ok: false, error: 'ORDER_OWNER_MISMATCH' });
    }

    const result = await settlePayment(paymentId);

    if (!result.ok) {
      // 아직 미완료(가상계좌 등)는 실패가 아니다 — 202로 구분해 프론트가 대기 안내를 띄운다.
      const pending = result.reason === 'NOT_PAID_YET';
      return res.status(pending ? 202 : 400).json({
        ok: false,
        error: result.status,
        reason: result.reason || null,
      });
    }

    return res.status(200).json({
      ok: true,
      status: result.status,          // PAID | ALREADY_PAID
      plan_id: result.order?.plan_id,
      subscription: result.subscription || null,
    });
  } catch (e) {
    console.error('[complete] error:', e);
    return res.status(500).json({ ok: false, error: 'COMPLETE_FAILED', detail: e.message });
  }
}
