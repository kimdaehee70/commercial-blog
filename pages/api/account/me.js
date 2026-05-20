// pages/api/account/me.js
// v0.4 — 76차 재작성 (A안: spine 통일 / dead code 복구 / quota 확장)
//
// 변경 (v0.3 → v0.4):
//   1) createServerSupabaseClient (dead code) 제거 → spine 패턴 통일
//      = createClient 핸들러 내부 생성 + Bearer 토큰 + supabase.auth.getUser(token)
//      = deactivate.js / ensure.js / signup.js 와 100% 동일 패턴
//   2) supabaseAdmin 외부 import 제거 → 핸들러 내부 createClient 단일화
//   3) 응답 확장: { ok, account, subscription, plan, quota }
//      - ok 필드 신규 (spine 표준)
//      - quota 신규: countPublishedInPeriod helper 직접 호출
//        * period: 달력 월 (KST 기준)
//        * 응답: { used, limit, period_start, period_end, plan_id }
//   4) GET only 유지 / 인증 실패 시 401 / account 없으면 404
//
// FREEZE 정책:
//   - getActiveSubscription helper 호출 보존 (72차 FREEZE)
//   - countPublishedInPeriod helper 호출 (74차 FREEZE)
//   - account 응답 형태 보존 (* 셀렉트)
//   - subscription/plan null = free 사용자 (UI 분기 그대로)
//
// 호출처: pages/account.js v0.4 (75차 작성, 미배포)

import { createClient } from '@supabase/supabase-js';
import { getActiveSubscription } from '../../../lib/billing/subscription';
import { countPublishedInPeriod } from '../../../lib/billing/usage';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// KST 기준 달력 월 범위 산출
// 반환: { period_start: ISOString, period_end: ISOString }
//   period_start = 이번달 1일 00:00 KST
//   period_end   = 다음달 1일 00:00 KST (배타)
function getMonthlyPeriodKST(now = new Date()) {
  // KST = UTC+9 — UTC 기준으로 이번달 1일 15:00Z (전일) = KST 이번달 1일 00:00
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kstNow.getUTCFullYear();
  const m = kstNow.getUTCMonth(); // 0~11

  // 이번달 1일 00:00 KST = UTC 전월 말일 15:00Z
  const startUTC = new Date(Date.UTC(y, m, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);
  // 다음달 1일 00:00 KST = UTC 이번달 말일 15:00Z
  const endUTC = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000);

  return {
    period_start: startUTC.toISOString(),
    period_end: endUTC.toISOString(),
  };
}

export default async function handler(req, res) {
  // 1) 메서드 가드
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // 2) env 가드
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase_env_missing' });
  }

  // 3) Bearer 토큰 추출 (deactivate.js / ensure.js 패턴)
  const authHeader = req.headers.authorization || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ ok: false, error: 'missing_bearer_token' });
  }
  const token = m[1];

  // 4) admin client (핸들러 내부 생성)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 5) token → auth user
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({
        ok: false,
        error: 'invalid_token',
        detail: userErr?.message || null,
      });
    }
    const auth_user_id = userData.user.id;

    // 6) accounts 조회
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (accErr) {
      return res.status(500).json({
        ok: false,
        error: 'accounts_select_failed',
        detail: accErr.message,
      });
    }
    if (!account) {
      return res.status(404).json({ ok: false, error: 'account_not_found' });
    }

    // 7) 활성 구독 조회 (helper — 72차 FREEZE)
    //    실패해도 응답 보장
    let subscription = null;
    let plan = null;
    try {
      const result = await getActiveSubscription(account.id);
      if (result) {
        subscription = result.subscription;
        plan = result.plan;
      }
    } catch (subErr) {
      console.error('[me.js] getActiveSubscription failed:', subErr.message);
    }

    // 8) quota 계산 (helper — 74차 FREEZE)
    //    달력 월 KST 기준
    //    limit: subscription 있으면 plan.monthly_quota, 없으면 free plan(id='free') 조회
    let quota = null;
    try {
      const { period_start, period_end } = getMonthlyPeriodKST();
      const used = await countPublishedInPeriod(account.id, period_start, period_end);

      // limit 결정
      let limit = null;
      let plan_id = null;

      if (plan?.monthly_quota != null) {
        // 활성 구독 있음 → 해당 plan 사용
        limit = plan.monthly_quota;
        plan_id = plan.id;
      } else {
        // 구독 없음 → free plan 직접 조회 (75차 결정: plans.js dependency 추가 없이 직접 SELECT)
        const { data: freePlan, error: planErr } = await supabase
          .from('plans')
          .select('id, monthly_quota')
          .eq('id', 'free')
          .maybeSingle();

        if (planErr) {
          console.error('[me.js] free plan select failed:', planErr.message);
        }
        if (freePlan) {
          limit = freePlan.monthly_quota;
          plan_id = freePlan.id;
        }
      }

      quota = {
        used,
        limit,
        period_start,
        period_end,
        plan_id,
      };
    } catch (quotaErr) {
      console.error('[me.js] quota calc failed:', quotaErr.message);
      // quota null 유지 / 응답 보장
    }

    // 9) 응답
    return res.status(200).json({
      ok: true,
      account,
      subscription, // null = free
      plan,         // null = free
      quota,        // null = 계산 실패 (응답은 보장)
    });
  } catch (err) {
    console.error('[me.js] error:', err);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      detail: String(err?.message || err),
    });
  }
}
