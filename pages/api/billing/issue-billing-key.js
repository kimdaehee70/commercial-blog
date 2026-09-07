// pages/api/billing/issue-billing-key.js
// 빌링키 발급 콜백 + 첫 달 실청구 + 재구매/재결제  ── PC(Bearer) 경로
//
// ─────────────────────────────────────────────────────────────
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP1] 결제 본문 로직을
//   lib/billing/executeBillingIssue.js 로 이관했다.
//
//   이 파일에 남는 것: HTTP 메서드 · Bearer 인증 · 입력 1차 검증 · account 조회.
//   이관된 것:         재구매 Gate · 포트원 검증 · billing_keys · 첫 달 실청구 ·
//                      subscriptions · default key · payment_history · accounts.plan.
//
//   ★ 정책은 한 줄도 바뀌지 않았다. 판정 순서·상태코드·응답 body 키 전량 동일.
//     회귀 Gate(추출 전후 PC 결제 동일 동작) 통과가 다음 단계의 선행 조건이다.
//
//   ★ 이 파일은 QR 토큰을 인증수단으로 받지 않는다(선장 판정).
//     모바일 경로는 /api/billing/qr-complete 가 토큰을 원자적 claim 한 뒤
//     같은 공통 함수를 서버 내부에서 호출한다. 결제 SoT 는 하나다.
//
//   이관 전 이력(정책 근거)은 lib/billing/executeBillingIssue.js 주석에 보존.
//     BILLING-FIRSTMONTH-NOT-CHARGED-01 / BILLING-SUBSCRIPTION-STATE-AXIS-01 /
//     PLAN-CHANGE-POLICY-V1-01 / PLAN-APPLY-RECOVERY-REQUIRED-01 /
//     ACCOUNT-PLAN-UPDATE-SILENT-FAIL-01 / BILLINGKEY-MULTI-DEFAULT-01 등.
// ─────────────────────────────────────────────────────────────
//
// 호출 시점: 사용자가 결제창에서 카드 등록(빌링키 발급) 완료 직후
// 입력:    { plan_id, billing_key, customer_uid, card_info }   ※ payment_id 미사용
// 출력:    { ok, subscription_id, payment_id, next_billing_at, mode }

import { createClient } from '@supabase/supabase-js';
import { executeBillingIssue } from '../../../lib/billing/executeBillingIssue';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // ─── 인증 ───
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  // ─── 입력 검증 ───
  // ★ payment_id는 받지 않는다. 청구 ID 결정권은 서버가 갖는다.
  const {
    plan_id,
    billing_key,
    customer_uid,
    card_name,
    card_number_masked,
    card_type,
    pg_provider,
  } = req.body || {};

  if (!plan_id || !billing_key) {
    return res.status(400).json({ error: 'plan_id / billing_key required' });
  }
  if (plan_id === 'free') {
    return res.status(400).json({ error: 'free plan cannot subscribe' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ─── 사용자 → account ───
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const authUserId = userData.user.id;

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, email, plan, status')
    .eq('auth_user_id', authUserId)
    .single();

  if (accErr || !account) return res.status(404).json({ error: 'account not found' });

  // ─── 결제 실행 (공통 SoT) ───
  //   account.status 검증 · 플랜 검증부터는 전부 공통 함수 안에 있다.
  const { status, body } = await executeBillingIssue({
    supabase,
    account,
    planId: plan_id,
    billing_key,
    customer_uid,
    card_name,
    card_number_masked,
    card_type,
    pg_provider,
  });

  return res.status(status).json(body);
}
