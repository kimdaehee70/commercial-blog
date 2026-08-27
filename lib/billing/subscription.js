// lib/billing/subscription.js
// 세션73 B-1 v0.1 — 구독 기간 조회 helper (신규. 기존 파일 무접촉)
//
// 목적: quota 기간 산정의 단일 진입점. 지금은 "읽기 전용"이며 아직 아무도 호출하지 않는다.
//   B-3에서 check-quota.js / me/usage.js가 이 함수를 쓰도록 배선한다.
//
// 설계 원칙(세션73 확정):
//   · 구독행이 있는 계정 → current_period_start/end 기준
//   · 구독행이 없는 계정 → 기존 KST 캘린더 월 기준으로 폴백 (기존 사용자 무영향)
//   · 폴백식은 check-quota.js 정본을 1:1 복사. 두 곳이 어긋나면 차단/표시가 갈라진다.
//
// 유효 구독 정의:
//   status in ('active','canceled') AND now() < current_period_end
//   - canceled = 해지 예약. 기간 끝까지는 유효(잔여 이용권). v_current_usage와 동일 해석.
//   - past_due 등 기타 status는 무효 처리 → 캘린더 폴백 → 사실상 FREE 취급.
//
// source 컬럼(세션73 추가): 'payment' | 'admin' | 'trial'
//   갱신 배치(B-5)가 자동결제 시도 대상을 고르는 기준. admin/trial은 시도하지 않는다.

import { createClient } from '@supabase/supabase-js';

const VALID_STATUSES = ['active', 'canceled'];

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// KST 캘린더 월 경계 — check-quota.js 정본식 1:1
export function calendarMonthPeriod(now = new Date()) {
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const startKst = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1, 0, 0, 0)
  );
  const endKst = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() + 1, 1, 0, 0, 0)
  );
  return {
    start: new Date(startKst.getTime() - 9 * 60 * 60 * 1000).toISOString(),
    end: new Date(endKst.getTime() - 9 * 60 * 60 * 1000).toISOString(),
  };
}

// [FREE-LIFETIME-TRIAL-3-01] FREE 누적 체험 기간 — 가입 시점 ~ 현재.
//   FREE는 캘린더 월 리셋 대상이 아니다. 계정당 최초 3건이 전부이며 월이 바뀌어도 복구되지 않는다.
//   ★ FREE 에 calendar 경로가 다시 살아나는 분기를 만들지 않는다(정책 무력화 경로).
//   end 를 now+1s 로 두는 이유: countGeneratedInPeriod 가 [start, end) 반개구간이라
//   방금 생성한 행이 상한에서 탈락하면 사용량이 1건 적게 잡힌다.
export function lifetimeTrialPeriod(createdAt, now = new Date()) {
  const ms = Date.parse(createdAt);
  const start = Number.isNaN(ms)
    ? '1970-01-01T00:00:00.000Z'   // created_at 파손 방어 — 전 이력 포함(관대 금지)
    : new Date(ms).toISOString();
  return { start, end: new Date(now.getTime() + 1000).toISOString() };
}

// accounts.plan / created_at 조회. 호출부가 account 를 넘기면 실행되지 않는다(쿼리 0).
async function fetchAccountPlan(accountId) {
  const supabase = client();
  if (!supabase || !accountId) return null;
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('plan, created_at')
      .eq('id', accountId)
      .maybeSingle();
    if (error) {
      console.error('[FREE-LIFETIME] account plan lookup failed:', error.message);
      return null;
    }
    return data || null;
  } catch (e) {
    console.error('[FREE-LIFETIME] account plan lookup exception:', e?.message);
    return null;
  }
}

// 계정의 유효 구독행 1건. 없으면 null.
// 여러 행이 있으면 current_period_end가 가장 늦은 것을 채택(업그레이드 중복 대비).
export async function getActiveSubscription(accountId, now = new Date()) {
  if (!accountId) return null;
  const supabase = client();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id, account_id, plan_id, status, source, current_period_start, current_period_end, next_billing_at, cancel_at_period_end, billing_key_id'
      )
      .eq('account_id', accountId)
      .in('status', VALID_STATUSES)
      .gt('current_period_end', now.toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[subscription] lookup failed:', error.message);
      return null; // 조회 실패 → 폴백 경로로 (fail-safe: 기존 동작 유지)
    }
    return Array.isArray(data) && data.length ? data[0] : null;
  } catch (e) {
    console.warn('[subscription] lookup exception:', e?.message);
    return null;
  }
}

// quota 산정용 기간 + plan 결정.
// 반환: { start, end, basis: 'subscription'|'calendar', plan_id, subscription }
//   plan_id는 구독행이 있을 때만 신뢰. 없으면 null → 호출부가 accounts.plan을 쓴다(현행 유지).
// [FREE-LIFETIME-TRIAL-3-01] 세 번째 basis 'lifetime' 추가.
//   account 인자는 호출부가 이미 조회한 accounts 행(plan, created_at 포함)을 재사용하기 위한 것.
//   넘기지 않으면 여기서 1회 조회한다.
export async function resolveBillingPeriod(accountId, now = new Date(), account = null) {
  const sub = await getActiveSubscription(accountId, now);
  if (sub) {
    return {
      start: sub.current_period_start,
      end: sub.current_period_end,
      basis: 'subscription',
      plan_id: sub.plan_id,
      subscription: sub,
    };
  }

  // [FREE-LIFETIME-TRIAL-3-01] FREE = 누적 3건 1회. 달력월 폴백으로 내려보내지 않는다.
  //   기간 1곳만 바꾸면 분자(countGeneratedInPeriod)·분모(getPlan)·표시 3화면이 동시에 정합된다.
  const acc = account || (await fetchAccountPlan(accountId));
  if (acc && (acc.plan || 'free') === 'free') {
    const lt = lifetimeTrialPeriod(acc.created_at, now);
    return {
      start: lt.start,
      end: lt.end,
      basis: 'lifetime',
      plan_id: 'free',
      subscription: null,
    };
  }

  const cal = calendarMonthPeriod(now);
  return {
    start: cal.start,
    end: cal.end,
    basis: 'calendar',
    plan_id: null,
    subscription: null,
  };
}

// 기간 부여 계산 — 관리자 지급(B-2) / 결제 갱신(B-5) 공용.
// months 개월치. 시작 시각 기준으로 종료 시각 산출.
export function periodFrom(startDate = new Date(), months = 1) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(months || 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
