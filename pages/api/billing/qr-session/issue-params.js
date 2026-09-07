// pages/api/billing/qr-session/issue-params.js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP3-B] PortOne SDK 실행 필수 파라미터 전달 전용.
//
// GET ?token=...  →  { ok, cust_name, cust_phone }
//
// 존재 이유:
//   [BILLINGKEY-CUSTOMER-REQUIRED-01] KG이니시스 빌링키 발급은 customer.fullName / phoneNumber 가
//   REQUIRED 다. 누락 시 400 INVALID_REQUEST 로 거절된다. 폰은 로그인 상태가 아니므로
//   /api/me/store 경로를 쓸 수 없다.
//
// public.js 와 역할을 분리한다 (선장 판정 B):
//   public.js       → 사용자에게 "표시"할 최소 정보 (plan_label · amount_krw · cust_phone_masked · expires_at)
//   issue-params.js → SDK 에 "전달"할 필수 파라미터 (cust_name · cust_phone)
//   ★ public.js 의 최소공개 계약은 손대지 않는다. cust_name 은 여전히 public 미노출이다.
//
// 반환 금지 (예외 없음):
//   account_id · email · token · billing_key · payment_id · subscription_id · plan_id · amount_krw
//   ★ 이 파일이 다른 값을 돌려주기 시작하면 분리한 의미가 사라진다. 필드를 늘리지 않는다.
//
// 노출 범위 판정:
//   QR-MOBILE-DISCLOSURE-SCOPE-01 유지. SDK 전달과 화면 표시는 별개다.
//   화면에는 계속 업체명을 표시하지 않는다.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function db() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // ★ 캐시 금지. 중간 캐시에 이름·전화번호가 남으면 토큰 만료 후에도 노출된다.
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'token required' });

  const supabase = db();

  const { data: row, error: selErr } = await supabase
    .from('billing_qr_sessions')
    .select('id, status, expires_at, cust_name, cust_phone')
    .eq('token', token)
    .maybeSingle();

  if (selErr) {
    console.error('[qr-session/issue-params] select failed', selErr);
    return res.status(503).json({ error: 'lookup failed' });
  }

  // ★ 없는 토큰과 사용 끝난 토큰을 같은 410 으로 내린다. 존재 여부를 알려주지 않는다.
  if (!row) {
    return res.status(410).json({ error: 'SESSION_NOT_AVAILABLE' });
  }

  const overdue = new Date(row.expires_at).getTime() <= Date.now();

  // lazy expire — public.js 와 동일 규칙. 별도 cron 없음.
  if (overdue && (row.status === 'pending' || row.status === 'consuming')) {
    await supabase
      .from('billing_qr_sessions')
      .update({ status: 'expired' })
      .eq('id', row.id)
      .in('status', ['pending', 'consuming']);
  }

  // ★ pending + 미만료 에서만 응답한다.
  //   consuming 은 이미 결제가 시작된 상태다. 여기서 파라미터를 다시 내주면 이중 발급이 열린다.
  if (row.status !== 'pending' || overdue) {
    return res.status(410).json({ error: 'SESSION_NOT_AVAILABLE' });
  }

  // 값은 발급 시점 store_profiles 스냅샷이다. 여기서 만들지 않는다(fallback 금지).
  if (!row.cust_name || !row.cust_phone) {
    console.error('[qr-session/issue-params] snapshot incomplete', row.id);
    return res.status(410).json({ error: 'SESSION_NOT_AVAILABLE' });
  }

  return res.status(200).json({
    ok:         true,
    cust_name:  row.cust_name,
    cust_phone: row.cust_phone,
  });
}
