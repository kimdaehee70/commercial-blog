// pages/api/billing/estimate.js
// 54차: 토큰 검증 + owner 가드 추가 (leak 차단)
// 이전: 44차-B-E v0.2 (ESM default export)
// 목적: blog_account의 이번 달 발행량 + plan_id 기반 예상 요금 계산
// 읽기전용. enforcement 없음. DB 변경 없음. publish.js FREEZE.
//
// 54차 변경:
//   - Bearer access_token 검증 (supabase.auth.getUser)
//   - OWNER_UID 일치 검증 (비-owner 차단)
//   - 401 / 403 응답 추가
//   - 하위 API(/api/usage/by-blog-account) 호출 시 Authorization 헤더 전달
//   - 기존 계산 로직 무변경

import { createClient } from '@supabase/supabase-js';
import { OWNER_UID } from '../../../lib/constants';
import {
  calculateCharge,
  quotaUsageRatio,
  getPlan,
  DEFAULT_PLAN_ID,
} from '../../../lib/billing/plans';

async function fetchUsage(req, blog_account, authHeader) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = `${proto}://${host}`;
  const url = blog_account
    ? `${base}/api/usage/by-blog-account?blog_account=${encodeURIComponent(blog_account)}`
    : `${base}/api/usage/by-blog-account`;

  // [54차] 하위 API에 인증 헤더 전파 (하위 API도 가드 추가 시 정합)
  const headers = {};
  if (authHeader) headers['authorization'] = authHeader;

  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`USAGE_API_FAILED_${r.status}`);
  const d = await r.json();
  if (d.ok === false) throw new Error(d.error || 'USAGE_API_ERROR');
  return d;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // ─────────────────────────────────────────────
    // [54차 신설] 토큰 검증 + owner 가드
    // ─────────────────────────────────────────────
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('[BILLING_ESTIMATE v0.3] ENV 누락');
      return res.status(500).json({ ok: false, error: 'SERVER_ENV_MISSING' });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
    }

    if (userData.user.id !== OWNER_UID) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN_NOT_OWNER' });
    }
    // ─────────────────────────────────────────────
    // 가드 통과 → 기존 로직 실행
    // ─────────────────────────────────────────────

    const blog_account = req.query.blog_account || null;
    const plan_id = req.query.plan || DEFAULT_PLAN_ID;
    const plan = getPlan(plan_id);

    if (blog_account) {
      const data = await fetchUsage(req, blog_account, authHeader);
      const monthly = data?.usage?.monthly_publish ?? 0;
      const charge = calculateCharge(plan.id, monthly);
      const ratio = quotaUsageRatio(plan.id, monthly);

      return res.status(200).json({
        ok: true,
        endpoint_version: 'v0.3',
        mode: 'single',
        blog_account,
        plan: {
          id: plan.id,
          label: plan.label,
          monthly_quota: plan.monthly_quota,
          price_krw: plan.price_krw,
          overage_per_post_krw: plan.overage_per_post_krw,
        },
        usage: data.usage || null,
        charge,
        quota_usage_ratio: Number(ratio.toFixed(3)),
        over_quota: monthly > plan.monthly_quota,
        enforcement: 'observation_only',
        verified: { auth_user_id: userData.user.id, is_owner: true },
      });
    }

    const data = await fetchUsage(req, null, authHeader);
    const accounts = data?.accounts || [];

    const items = accounts.map(a => {
      const monthly = a.monthly_publish || 0;
      const charge = calculateCharge(plan.id, monthly);
      const ratio = quotaUsageRatio(plan.id, monthly);
      return {
        blog_account: a.blog_account,
        monthly_publish: monthly,
        total_publish: a.total_publish,
        latest_published_at: a.latest_published_at,
        industries: a.industries || [],
        charge,
        quota_usage_ratio: Number(ratio.toFixed(3)),
        over_quota: monthly > plan.monthly_quota,
      };
    });

    const sum = items.reduce((s, i) => ({
      base_krw: s.base_krw + i.charge.base_krw,
      overage_krw: s.overage_krw + i.charge.overage_krw,
      total_krw: s.total_krw + i.charge.total_krw,
      overage_count: s.overage_count + i.charge.overage_count,
      over_quota_accounts: s.over_quota_accounts + (i.over_quota ? 1 : 0),
    }), { base_krw: 0, overage_krw: 0, total_krw: 0, overage_count: 0, over_quota_accounts: 0 });

    return res.status(200).json({
      ok: true,
      endpoint_version: 'v0.3',
      mode: 'all',
      plan: {
        id: plan.id,
        label: plan.label,
        monthly_quota: plan.monthly_quota,
        price_krw: plan.price_krw,
        overage_per_post_krw: plan.overage_per_post_krw,
      },
      month_start_kst: data.month_start_kst || null,
      total_accounts: items.length,
      summary: sum,
      accounts: items,
      enforcement: 'observation_only',
      verified: { auth_user_id: userData.user.id, is_owner: true },
    });
  } catch (e) {
    console.error('[BILLING_ESTIMATE v0.3] error:', e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || 'INTERNAL_ERROR',
    });
  }
}
