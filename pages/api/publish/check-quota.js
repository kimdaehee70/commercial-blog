// pages/api/publish/check-quota.js
// 세션윰73 B-3 v0.6: quota 기간 기준 전환 (구독 우선 / 캘린더 폴백)
//   · 구독행이 있는 계정 → current_period_start/end 기준
//   · 구독행이 없는 계정 → 기존 KST 캘린더 월 기준 (기존 사용자 무영향)
//   · 기간 산정은 lib/billing/subscription.resolveBillingPeriod 단일 진입점으로 이관.
//     폴백식(calendarMonthPeriod)은 이전 인라인 계산과 1:1 동일.
//   · plan은 이번 축 밖 — 여전히 accounts.plan을 SoT로 쓴다.
//     (B-2에서 관리자 지급 시 accounts.plan과 subscriptions.plan_id를 함께 갱신하므로 일치)
//   · 응답에 period_basis / period_end 추가. 기존 키(month_start 등) 전부 유지.
// 74차: helper 도입 — countPublishedInPeriod 호출 + fallback 유지
// 65차 (B-1): P3 정책 반영 — publish_status='published' 필터 추가
// 50차: quota enforcement 미들웨어
// - publish.js 호출 전 프론트가 먼저 호출
// - publish.js FREEZE 유지 (직접 차단 없음)
// - owner role bypass (무제한)
// - 월별 발행 건수 hard block (>= quota)

import { createClient } from '@supabase/supabase-js';
import { getPlan, DEFAULT_PLAN_ID } from '../../../lib/billing/plans';
import { OWNER_UID } from '../../../lib/constants';
import { countGeneratedInPeriod } from '../../../lib/billing/usage';
import { resolveBillingPeriod } from '../../../lib/billing/subscription';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // 1. auth_user_id 추출 — POST body 또는 GET query
    const auth_user_id =
      (req.method === 'POST' ? req.body?.auth_user_id : req.query?.auth_user_id) ||
      req.headers['x-uid'] ||
      null;

    if (!auth_user_id) {
      return res.status(400).json({
        ok: false,
        error: 'AUTH_USER_ID_REQUIRED',
        allowed: false,
      });
    }

    // 2. Supabase 연결
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({
        ok: false,
        error: 'SUPABASE_ENV_MISSING',
        allowed: false,
      });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // 3. accounts 조회
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, email, plan, role, status')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (accErr) throw accErr;

    if (!account) {
      return res.status(404).json({
        ok: false,
        error: 'ACCOUNT_NOT_FOUND',
        allowed: false,
        hint: 'call /api/account/ensure first',
      });
    }

    // 4. status 차단
    if (account.status && account.status !== 'active') {
      return res.status(200).json({
        ok: true,
        allowed: false,
        reason: 'ACCOUNT_INACTIVE',
        account_id: account.id,
        status: account.status,
      });
    }

    // 5. owner bypass (role==='owner' 또는 auth_user_id===OWNER_UID)
    const isOwner = account.role === 'owner' || auth_user_id === OWNER_UID;
    if (isOwner) {
      return res.status(200).json({
        ok: true,
        allowed: true,
        reason: 'OWNER_BYPASS',
        account_id: account.id,
        plan_id: account.plan || DEFAULT_PLAN_ID,
        bypass: true,
      });
    }

    // 6. 월 '생성' 건수 카운트 (월 1일 00:00 KST 기준)
    // [v138] 정책 전환 — quota 기준 = '생성 횟수'(baseline). 호출(생성)이 곧 제공 서비스.
    //   → URL 등록/발행 여부 무관. 생성 시점(created_at)에 차감/차단.
    //   helper countGeneratedInPeriod(baseline + created_at) 사용. fallback도 동일 기준.
    //   (구: countPublishedInPeriod / published + published_at — 생성을 못 막던 원인. 폐기)
    // [B-3] 기간 산정 — 구독 우선, 없으면 KST 캘린더 월 폴백.
    //   resolveBillingPeriod 내부 조회 실패 시에도 캘린더 폴백을 돌려주므로
    //   fail-open(quota 열림)이 발생하지 않는다.
    const now = new Date();
    const period = await resolveBillingPeriod(account.id, now);
    const monthStartUtc = period.start;
    const monthEndUtc = period.end;

    let monthly_publish = 0;
    try {
      monthly_publish = await countGeneratedInPeriod(
        account.id,
        monthStartUtc,
        monthEndUtc
      );
    } catch (helperErr) {
      console.error('[check-quota] helper error, fallback to direct query:', helperErr);
      // fallback: helper 장애 시 quota 시스템 생존용 직접 쿼리.
      // [v138] 정본(countGeneratedInPeriod) 기준과 1:1 통일 — baseline + created_at.
      //   helper 장애 시에도 생성 글을 정확히 세어 fail-open(quota 열림) 방지.
      const { count, error: cntErr } = await supabase
        .from('publish_history')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
        .eq('publish_status', 'baseline')
        .gte('created_at', monthStartUtc)
        .lt('created_at', monthEndUtc);
      if (cntErr) throw cntErr;
      monthly_publish = count || 0;
    }

    // 7. plan 기준 quota 판정
    const planId = account.plan || DEFAULT_PLAN_ID;
    const plan = getPlan(planId);
    const quota = plan.monthly_quota;
    const remaining = Math.max(0, quota - monthly_publish);
    const allowed = monthly_publish < quota;

    return res.status(200).json({
      ok: true,
      allowed,
      reason: allowed ? 'WITHIN_QUOTA' : 'QUOTA_EXCEEDED',
      account_id: account.id,
      plan_id: plan.id,
      plan_label: plan.label,
      monthly_quota: quota,
      monthly_publish,
      remaining,
      month_start: monthStartUtc,
      period_end: monthEndUtc,          // B-3 신규
      period_basis: period.basis,       // 'subscription' | 'calendar'
    });
  } catch (e) {
    console.error('[check-quota] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'CHECK_QUOTA_FAILED',
      detail: e.message,
      allowed: false,
    });
  }
}
