// pages/api/billing/qr-session/public.js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP2] 모바일용 세션 조회 — 무인증.
//
// GET ?token=... → { ok, plan_id, plan_label, amount_krw, cust_phone_masked, expires_at }
//
// ★ 토큰이 곧 인증이다. 그래서 내보내는 것을 최소로 묶는다.
//   미공개: account_id · email · cust_name(원문) · token · 내부 id · 결제 이력 일체.
//   cust_name 은 선장 판정으로 이번 STEP 에서 공개하지 않는다.
//   PortOne 호출에 고객명이 필요한 시점의 전달 범위는 STEP3 에서 별도 승인한다
//   (QR-MOBILE-DISCLOSURE-SCOPE-01).
//
// ★ storeId / channelKey 는 여기서 주지 않는다. 모바일 페이지가 기존
//   /api/billing/config 를 그대로 호출한다. PG 설정 SoT 를 늘리지 않는다.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** 010-1234-5678 → 010-****-5678 / 01012345678 → 010****5678 */
function maskPhone(raw) {
  const s = String(raw || '');
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7) return '';
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}-****-${tail}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'token required' });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: selErr } = await supabase
    .from('billing_qr_sessions')
    .select('id, plan_id, plan_label, amount_krw, cust_phone, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (selErr) {
    console.error('[qr-session/public] select failed', selErr);
    return res.status(503).json({ error: 'lookup failed' });
  }
  if (!row) return res.status(404).json({ error: 'session not found' });

  // 만료 지연 처리 — pending/consuming 이면서 시각이 지났으면 여기서 닫는다.
  let status = row.status;
  if (
    (status === 'pending' || status === 'consuming') &&
    new Date(row.expires_at).getTime() <= Date.now()
  ) {
    await supabase
      .from('billing_qr_sessions')
      .update({ status: 'expired' })
      .eq('id', row.id)
      .in('status', ['pending', 'consuming']);
    status = 'expired';
  }

  // pending 이 아니면 결제 정보를 내보내지 않는다.
  //   이미 소비/완료/만료된 토큰으로 금액·플랜을 계속 조회할 이유가 없다.
  if (status !== 'pending') {
    return res.status(410).json({
      ok:     false,
      status,
      error:  'SESSION_NOT_AVAILABLE',
      message:
        status === 'expired'
          ? '결제 요청이 만료되었습니다. PC 화면에서 다시 시도해 주세요.'
          : '이미 처리된 결제 요청입니다.',
    });
  }

  return res.status(200).json({
    ok:                true,
    status,
    plan_id:           row.plan_id,
    plan_label:        row.plan_label,
    amount_krw:        row.amount_krw,
    cust_phone_masked: maskPhone(row.cust_phone),
    expires_at:        row.expires_at,
  });
}
