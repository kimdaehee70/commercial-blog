// pages/api/account/me.js
// v0.6 — 세션131 ME-USAGE-BASIS-01 (quota 블록 = 차단 미러)
//
// 변경 (v0.5 → v0.6):
//   1) 사용량 분자: countPublishedInPeriod → countGeneratedInPeriod
//   2) 기간: getMonthlyPeriodKST(자체계산·삭제) → resolveBillingPeriod (구독 우선/캘린더 폴백)
//   3) 분모: 구독행 plan_id → accounts.plan (check-quota.js 차단 정본과 동일)
//      · free plan 직접 SELECT 제거 → getPlan 단일화 (DB 쿼리 -1)
//   4) quota 응답에 period_basis / bypass 추가 (가산 — 기존 키 전부 유지)
//   5) 불일치 감지 로그 2종: accounts.plan 미등록 / subscriptions.plan_id ≠ accounts.plan
//   ★ plan · subscription 응답 필드는 S130 계약(구독행 기준) 그대로 — 용도가 다르다
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
// [ME-USAGE-BASIS-01] 기간 SoT 정정 — 자체 계산 폐기, check-quota와 동일 진입점 사용.
import {
  getActiveSubscription,
  resolveBillingPeriod,
  calendarMonthPeriod,
} from '../../../lib/billing/subscription';
// [ME-USAGE-BASIS-01] 사용량 SoT 정정.
//   구: countPublishedInPeriod(published + published_at) — 차단 정본과 기준이 다르다.
//   정본은 check-quota.js가 쓰는 countGeneratedInPeriod(baseline + created_at).
//   기존 기준이면 사용자는 0/30을 보는데 생성 차단은 이미 진행된다.
import { countGeneratedInPeriod } from '../../../lib/billing/usage';
// [ME-SUBSCRIPTION-CONTRACT-01] plan 해석 SoT 통일.
//   check-quota.js / admin/accounts-usage.js / me/subscription.js 3파일이 이미 getPlan을 쓴다.
//   75차 "plans.js dependency 추가 없이 직접 SELECT" 결정은 free plan 조회 한정으로 남기고,
//   구독 plan 해석은 정본(getPlan)으로 맞춘다. 동기 함수 — DB 쿼리 추가 없음.
import { getPlan, DEFAULT_PLAN_ID } from '../../../lib/billing/plans';
import { OWNER_UID } from '../../../lib/constants';
import { requireAuth } from '../../../lib/guards';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// [ME-USAGE-BASIS-01] getMonthlyPeriodKST 제거.
//   자체 달력월 계산은 유료 구독기간(예: 8/20~9/20)을 무시했다.
//   기간 산정은 lib/billing/subscription.resolveBillingPeriod 단일 진입점으로 이관
//   (check-quota.js와 동일 함수 — 표시와 차단이 같은 경계를 쓴다).

// 구독행의 current_period_* 가 null인 비정상 행 방어.
//   usage.js는 문자열이 아니면 throw → quota 전체가 null이 되어 화면에서 사라진다.
//   그 경우 캘린더 폴백으로 내려 표시를 살리고 basis를 낮춘다.
function normalizePeriod(period) {
  const ok =
    typeof period?.start === 'string' &&
    typeof period?.end === 'string' &&
    !isNaN(new Date(period.start).getTime()) &&
    !isNaN(new Date(period.end).getTime()) &&
    new Date(period.start) < new Date(period.end);

  if (ok) return { start: period.start, end: period.end, basis: period.basis };

  console.error(
    '[me.js] invalid billing period, falling back to calendar:',
    JSON.stringify({ start: period?.start, end: period?.end, basis: period?.basis })
  );
  const cal = calendarMonthPeriod();
  return { start: cal.start, end: cal.end, basis: 'calendar' };
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
    // ───────── [ME-SUBSCRIPTION-CONTRACT-01] 반환 계약 정정 ─────────
    // 실측: lib/billing/subscription.getActiveSubscription 은 subscriptions 행 자체를 반환한다
    //   (data[0] — plan_id / status / source / current_period_* / cancel_at_period_end 등).
    //   { subscription, plan } 래퍼가 아니다. 기존 코드는 result.subscription / result.plan 을 읽어
    //   둘 다 항상 undefined 였다 → plan 이 늘 undefined → 아래 8)의 plan?.monthly_quota 가 항상 false
    //   → 유료 구독자도 free 한도로 표시되고, 응답 subscription 도 undefined.
    //   현재 무증상인 이유는 유효 구독행이 0건이라 결과가 우연히 일치했기 때문. 결제 연결 시 즉시 드러난다.
    //   ★ 같은 helper를 pages/api/me/subscription.js 는 행으로 올바르게 소비 중(sub.status 등) — 그쪽이 정본.
    let subscription = null;
    let plan = null;
    try {
      const sub = await getActiveSubscription(account.id);
      if (sub) {
        subscription = sub;
        // getPlan 은 미등록 planId 를 free 로 조용히 폴백시킨다(null 아님).
        //   구독행 plan_id 가 plans 에 없으면 유료 구독자가 무음으로 free 한도가 되므로 로그로 드러낸다.
        const resolved = getPlan(sub.plan_id);
        if (sub.plan_id && resolved.id !== sub.plan_id) {
          console.error('[me.js] subscription plan_id not found in plans:', sub.plan_id, '→ fallback', resolved.id);
        }
        plan = resolved;
      }
    } catch (subErr) {
      console.error('[me.js] getActiveSubscription failed:', subErr.message);
    }

    // ───────── 8) quota 계산 [ME-USAGE-BASIS-01] ─────────
    // 원칙: quota 블록은 "차단(check-quota.js)이 내릴 판정"을 그대로 비춘다.
    //   화면 숫자와 차단 숫자가 다르면 사용자는 0/30을 보면서 차단당한다.
    //   따라서 분자·분모·기간 3개를 모두 check-quota.js와 같은 정본으로 맞춘다.
    //     분자 = countGeneratedInPeriod (baseline + created_at)
    //     분모 = accounts.plan → getPlan   ★ 구독행 plan_id 아님
    //     기간 = resolveBillingPeriod (구독 우선 / 캘린더 폴백)
    //
    // ★ 분모가 accounts.plan인 이유: check-quota.js가 그것으로 차단한다.
    //   구독행 plan_id로 표시하면 "보이는 한도"와 "막히는 한도"가 갈라진다.
    //   둘이 어긋나는 상황 자체가 데이터 결함이므로 숨기지 않고 로그로 드러낸다.
    //   (응답의 plan / subscription 필드는 구독 정보 표시용으로 그대로 유지 — 용도가 다르다)
    let quota = null;
    try {
      const period = normalizePeriod(await resolveBillingPeriod(account.id));
      const used = await countGeneratedInPeriod(account.id, period.start, period.end);

      // 분모 — 차단 정본과 동일
      const planId = account.plan || DEFAULT_PLAN_ID;
      const quotaPlan = getPlan(planId);

      // getPlan은 미등록 ID를 free로 조용히 폴백시킨다(null 아님) → 무음 강등 감지
      if (account.plan && quotaPlan.id !== account.plan) {
        console.error(
          '[me.js] accounts.plan not found in plans:', account.plan,
          '→ fallback', quotaPlan.id
        );
      }
      // 구독행 plan_id와 accounts.plan 불일치 = 지급/결제 반영 누락. 표시는 차단 기준을 따른다.
      if (subscription?.plan_id && subscription.plan_id !== quotaPlan.id) {
        console.error(
          '[me.js] plan mismatch — subscriptions.plan_id:', subscription.plan_id,
          '/ accounts.plan:', quotaPlan.id, '(quota는 accounts.plan 기준)'
        );
      }

      // owner는 check-quota.js에서 무제한 통과 → 표시도 동일하게 알린다(가산 필드)
      const isOwner = account.role === 'owner' || auth_user_id === OWNER_UID;

      quota = {
        used,
        limit: quotaPlan.monthly_quota,
        period_start: period.start,
        period_end: period.end,
        period_basis: period.basis, // 'subscription' | 'calendar'
        plan_id: quotaPlan.id,
        bypass: isOwner,            // true = 한도 미적용(owner)
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
