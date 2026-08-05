// pages/api/account/me.js
// v0.5 — 80차 추가 (blog_accounts 응답 / publish_history GROUP BY)
//
// 변경 (v0.4 → v0.5):
//   1) blog_accounts 응답 신규 추가 (8.5 블록)
//      - publish_history GROUP BY blog_account (client-side 집계)
//      - publish_status='published' 만 (test/baseline 제외)
//      - 응답 형태: [{ blog_account, count, last_published_at }]
//      - blog_accounts 테이블 부재 대응 (78·79차 carry over)
//      - 실패해도 응답 보장 (빈 배열 fallback)
//   2) 응답 키 추가: blog_accounts
//   3) 79차 G3 가드 (account.js v0.6) 보호됨 — client data null 시 안전
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
// 호출처: pages/account.js v0.6 (79차 G3 가드 추가)

import { createClient } from '@supabase/supabase-js';
import { getActiveSubscription } from '../../../lib/billing/subscription';
import { countPublishedInPeriod } from '../../../lib/billing/usage';
import { requireAuth } from '../../../lib/guards';

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

  // 3) 인증 — requireAuth (guards.js 통합 / 85차 가드 단일화)
  //    토큰 추출 + getUser 검증을 흡수. 실패 시 내부에서 401 전송 후 null.
  //    인증키는 anon(supabaseAuth)이나 getUser는 토큰 자체검증이라 동치.
  const user = await requireAuth(req, res);
  if (!user) return; // res 이미 전송됨 (401)
  const auth_user_id = user.id;

  // 4) admin client (핸들러 내부 생성) — DB 조회용 service_role 유지 (RLS 우회)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
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

    // 8.5) blog_accounts 집계 (80차 추가 / 79차 결정: publish_history GROUP BY)
    //      - blog_accounts 테이블 부재 → publish_history 단일 소스
    //      - publish_status='published' 만 (test/baseline 제외)
    //      - 카드3 UI 호환: { blog_account, count, last_published_at }
    //      - 실패해도 응답 보장 (빈 배열 fallback)
    let blog_accounts = [];
    try {
      const { data: rows, error: baErr } = await supabase
        .from('publish_history')
        .select('blog_account, published_at')
        .eq('account_id', account.id)
        .eq('publish_status', 'published')
        .not('blog_account', 'is', null)
        .order('published_at', { ascending: false });

      if (baErr) {
        console.error('[me.js] blog_accounts select failed:', baErr.message);
      } else if (rows && rows.length > 0) {
        // client-side GROUP BY (Postgres GROUP BY 없이 집계)
        // ORDER BY published_at DESC 이므로 첫 등장이 최신 → last_published_at 갱신 불필요
        const map = new Map();
        for (const r of rows) {
          if (!r.blog_account) continue;
          const cur = map.get(r.blog_account);
          if (!cur) {
            map.set(r.blog_account, {
              blog_account: r.blog_account,
              count: 1,
              last_published_at: r.published_at,
            });
          } else {
            cur.count += 1;
          }
        }
        blog_accounts = Array.from(map.values());
      }
    } catch (baErr) {
      console.error('[me.js] blog_accounts calc failed:', baErr.message);
      // blog_accounts = [] 유지
    }

    // 9) 응답
    return res.status(200).json({
      ok: true,
      account,
      subscription, // null = free
      plan,         // null = free
      quota,        // null = 계산 실패 (응답은 보장)
      blog_accounts, // [] = 발행 이력 없음 또는 계산 실패
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
