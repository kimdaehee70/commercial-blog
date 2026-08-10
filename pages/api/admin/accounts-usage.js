// pages/api/admin/accounts-usage.js
// 세션131 v0.8: BOARD-PERIOD-SYNC-01 — 계정별 청구기간 반영 (달력월 고정 해제)
// - subscriptions 1회 일괄 조회 → accountId별 period map → 없으면 calendarMonthPeriod 폴백
//   (resolveBillingPeriod 계정별 호출 = N+1. 쿼리 증가는 +1 고정으로 묶는다)
// - 집계 루프(monthly)에 계정별 기간 적용 — map 생성과 적용을 같은 축에서 완결
// - ★ 기간 비교를 ISO 문자열 사전순 → epoch(Date.parse)로 전환.
//   created_at('+00:00')과 경계값('Z')은 형식이 달라 사전순 비교가 경계에서 어긋난다.
// - 캘린더식 인라인 재구현 제거 → lib/billing/subscription.calendarMonthPeriod 단일 진입점
// - 응답 가산: rows[].period_start/period_end/period_basis, summary.subscription_period_accounts
// - 기존 키(month_start / monthly_posts / over_quota 등) 100% 유지
//
// 세션74 v0.7: publish_history 전량 조회 페이지네이션 (1000행 상한 → 회원목록 이번달 0 오표시 수정)
// 세션73 v0.6: quota 집계 기준 정본 통일 (published → baseline)
// - 정본 = check-quota.js / lib/billing/usage.countGeneratedInPeriod
//   = publish_status 'baseline' + created_at [monthStart, monthEnd)
// - 변경 전: publish_status='published' 필터 → 보드만 '발행' 기준.
//   차단(생성)·표시(me/usage v154, 생성)와 어긋나 관리자 보드에서만 사용률 과소 표시.
// - monthly_posts / total_posts / quota_ratio / over_quota = 생성(baseline) 기준으로 전환.
// - published_posts / published_total_all 신규 필드 추가(실발행 관측 보존). latest_at = 실발행 기준 유지.
// - 121차 주석("정본은 published만 카운트")은 v138 정책 전환 이전 판단 → 폐기.
//
// 91차 v0.5: over_quota 경계 정합 (> → >=)
// - line 91: s.monthly > quota → s.monthly >= quota
// - 이유: check-quota.js 차단식(allowed = publish < quota)과 UI 표시 일치
//         10/10(한도 소진=발행불가) 계정이 보드에서 '정상'으로 보이던 off-by-one 제거
// - 영향: over_quota 파생 전부 자동 정합 (over_quota_count / by_plan.over_quota_count / quota.js a.over_quota)
// - spine/DB/quota값(plans.monthly_quota) 무변경. 표시 경계 1줄만.
//
// 87차 v0.4: /admin/quota 페이지 지원 — 응답 필드 추가만 (기존 필드 무변경)
// - rows[].plan_source 추가 ('db' | 'fallback', 전체 단일값이지만 row 단위에서도 접근 가능)
// - summary.plans_source / plans_loaded 추가
// - summary.by_plan 추가 (plan별 집계)
// - 기존 필드/응답 키 100% 무변경 (UI 호환 유지)
//
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - createClient / supabaseAuth / OWNER_UID import 제거
// - 비즈니스 로직 / 응답 포맷 무변경 (UI 호환 유지)
//
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드
// 47차 v0.1: 계정별 운영 현황 보드 API

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import {
  getPlan,
  quotaUsageRatio,
  DEFAULT_PLAN_ID,
  listPlans,
  _debugPlansSource,
} from '../../../lib/billing/plans';
import { requireOwner } from '../../../lib/guards';
// [BOARD-PERIOD-SYNC-01] 캘린더 폴백식을 인라인 재구현하지 않는다.
//   check-quota.js / me.js와 같은 함수를 써야 세 화면의 경계가 갈라지지 않는다.
import { calendarMonthPeriod } from '../../../lib/billing/subscription';

// getActiveSubscription과 동일한 유효 구독 정의(정의부 기준).
const VALID_SUB_STATUSES = ['active', 'canceled'];

// 기간 값 방어 — current_period_* 가 null/파손이면 캘린더로 내린다.
function toPeriodMs(startIso, endIso, basis, fallback) {
  const s = Date.parse(startIso);
  const e = Date.parse(endIso);
  if (!Number.isNaN(s) && !Number.isNaN(e) && s < e) {
    return { startMs: s, endMs: e, start: startIso, end: endIso, basis };
  }
  return fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.3: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    // 1. accounts 전체 조회
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, display_name, plan, role, status, created_at')
      .order('id', { ascending: true });

    if (accErr) throw accErr;

    // 2. publish_history 전체
    //    세션73: 필터 제거 후 publish_status 동반 조회.
    //    quota 집계 = baseline(생성) / 실발행 관측 = published. 두 축을 한 번에 산출.
    // [세션74 v0.7] 1000행 상한 버그 수정 —
    //    Supabase PostgREST는 무제한 select에도 기본 1000행만 반환한다.
    //    행이 1000개를 넘으면 오래된 계정 행만 들어오고 최근 가입 계정은 통째로 누락 →
    //    회원목록 '이번달'이 0으로 표시됐다(실측: account 13 = baseline 39건인데 0 표시).
    //    check-quota는 계정별 count 쿼리라 무영향 → 두 화면이 갈라진 유일한 원인.
    //    range() 페이지네이션으로 전량 수집. 집계 로직은 무변경.
    const PAGE = 1000;
    const posts = [];
    for (let from = 0; ; from += PAGE) {
      const { data: chunk, error: pErr } = await supabaseAdmin
        .from('publish_history')
        .select('account_id, created_at, publish_status')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (pErr) throw pErr;
      if (!chunk || chunk.length === 0) break;
      posts.push(...chunk);
      if (chunk.length < PAGE) break;
    }

    // ───────── 3. 계정별 청구기간 [BOARD-PERIOD-SYNC-01] ─────────
    // 변경 전: 전 계정 달력월 고정 → 유료 구독기간(예 8/20~9/20) 계정은
    //   관리자가 고객 화면(me.js) / 차단(check-quota.js)과 다른 숫자를 봤다.
    //
    // ★ N+1 회피 — resolveBillingPeriod를 계정별로 부르면 계정 수만큼 쿼리가 늘어난다.
    //   subscriptions를 1회 일괄 조회해 accountId → period map을 만들고,
    //   없으면 calendarMonthPeriod로 폴백한다. 쿼리 증가는 +1 고정.
    //   유효 구독 정의는 getActiveSubscription과 동일:
    //     status in ('active','canceled') AND now < current_period_end,
    //     다건이면 current_period_end가 가장 늦은 것(desc 정렬 → 먼저 들어온 것이 승자).
    const now = new Date();
    const cal = calendarMonthPeriod(now);
    const calendarPeriod = {
      startMs: Date.parse(cal.start),
      endMs: Date.parse(cal.end),
      start: cal.start,
      end: cal.end,
      basis: 'calendar',
    };
    // 기존 응답 키 month_start 보존(전역 달력 기준값 — UI 호환)
    const monthStart = cal.start;
    const monthEnd = cal.end;

    const periodByAccount = new Map();
    {
      const { data: subs, error: sErr } = await supabaseAdmin
        .from('subscriptions')
        .select('account_id, plan_id, status, current_period_start, current_period_end')
        .in('status', VALID_SUB_STATUSES)
        .gt('current_period_end', now.toISOString())
        .order('current_period_end', { ascending: false });

      if (sErr) {
        // fail-safe: 조회 실패 시 전 계정 캘린더 폴백(기존 동작). 보드가 죽지 않는다.
        console.error('[accounts-usage] subscriptions lookup failed:', sErr.message);
      } else {
        for (const s of subs || []) {
          if (!s.account_id || periodByAccount.has(s.account_id)) continue; // desc 첫 행이 승자
          periodByAccount.set(
            s.account_id,
            toPeriodMs(
              s.current_period_start,
              s.current_period_end,
              'subscription',
              calendarPeriod
            )
          );
        }
      }
    }
    const periodOf = aid => periodByAccount.get(aid) || calendarPeriod;

    // 4. account_id별 집계 — monthly는 계정별 [period.start, period.end) 범위만
    //    (구독 계정=구독기간 / 그 외=달력월. 정본 lt 상한 정합)
    const stats = {};
    for (const p of posts || []) {
      if (!p.account_id) continue;
      const aid = p.account_id;
      if (!stats[aid]) stats[aid] = { total: 0, monthly: 0, published: 0, latest: null };

      // [BOARD-PERIOD-SYNC-01] 기간을 계정별로 적용 — 반쪽 수정 금지(map만 만들고 안 쓰면 무의미).
      // ★ 비교를 문자열 사전순 → epoch로 전환.
      //   created_at은 DB에서 '+00:00' 형식, 경계값은 toISOString()의 'Z' 형식으로 온다.
      //   형식이 다른 두 ISO 문자열의 사전순 비교는 경계에서 어긋난다(같은 시각도 대소가 갈림).
      //   구독기간이 월초가 아닌 임의 시각이 되면서 경계 충돌 확률이 올라가므로 같은 축에서 정리.
      const per = periodOf(aid);
      const tMs = p.created_at ? Date.parse(p.created_at) : NaN;
      const inMonth = !Number.isNaN(tMs) && tMs >= per.startMs && tMs < per.endMs;

      // quota 축 — 생성(baseline). check-quota 정본과 1:1.
      if (p.publish_status === 'baseline') {
        stats[aid].total += 1;
        if (inMonth) stats[aid].monthly += 1;
      }

      // 관측 축 — 실발행(published). 차단과 무관, 표시 전용.
      if (p.publish_status === 'published') {
        stats[aid].published += 1;
        if (!stats[aid].latest || (p.created_at && p.created_at > stats[aid].latest)) {
          stats[aid].latest = p.created_at;
        }
      }
    }

    // 5. accounts + quota 결합
    const planSourceInfo = _debugPlansSource(); // { source, loaded, ids }
    const rows = (accounts || []).map(a => {
      const s = stats[a.id] || { total: 0, monthly: 0, published: 0, latest: null };
      const planId = a.plan || DEFAULT_PLAN_ID;
      const plan = getPlan(planId);
      const ratio = quotaUsageRatio(planId, s.monthly);
      const per = periodOf(a.id); // [BOARD-PERIOD-SYNC-01] 이 행의 숫자가 어느 기간인지 명시
      return {
        id: a.id,
        email: a.email,
        display_name: a.display_name,
        plan_id: plan.id,
        plan_label: plan.label,
        monthly_quota: plan.monthly_quota,
        role: a.role,
        status: a.status,
        total_posts: s.total,          // 생성(baseline) 누적 — quota 축
        monthly_posts: s.monthly,      // 이번 달 생성 — quota 축(차단 기준과 동일)
        published_posts: s.published,  // 세션73: 실발행 누적(관측 전용)
        latest_at: s.latest,           // 실발행 기준 최근 시각
        quota_ratio: Number(ratio.toFixed(3)),
        over_quota: s.monthly >= plan.monthly_quota, // 91차: 차단 truth(check-quota: publish < quota)와 일치 — 10/10도 over 표시
        created_at: a.created_at,
        plan_source: planSourceInfo.source, // 87차: 'db' | 'fallback'
        // BOARD-PERIOD-SYNC-01 신규(가산 — 기존 키 무변경)
        period_start: per.start,
        period_end: per.end,
        period_basis: per.basis, // 'subscription' | 'calendar'
      };
    });

    // 6. 전체 집계
    //    by_plan: 전체 plan 목록을 기준으로 0건도 포함하여 표시
    //             (rows 만으로 집계하면 free/basic/pro 중 사용자가 없는 plan 누락됨)
    const byPlan = {};
    for (const p of listPlans()) {
      byPlan[p.id] = {
        plan_id: p.id,
        plan_label: p.label,
        monthly_quota: p.monthly_quota,
        is_active: !!p.is_active,
        account_count: 0,
        monthly_posts: 0,
        total_posts: 0,
        over_quota_count: 0,
      };
    }
    for (const r of rows) {
      const bucket = byPlan[r.plan_id];
      if (!bucket) continue; // 미등록 plan은 무시 (방어)
      bucket.account_count += 1;
      bucket.monthly_posts += r.monthly_posts;
      bucket.total_posts += r.total_posts;
      if (r.over_quota) bucket.over_quota_count += 1;
    }

    const summary = {
      total_accounts: rows.length,
      total_posts_all: rows.reduce((sum, r) => sum + r.total_posts, 0),
      monthly_posts_all: rows.reduce((sum, r) => sum + r.monthly_posts, 0),
      published_total_all: rows.reduce((sum, r) => sum + r.published_posts, 0), // 세션73
      usage_basis: 'generated_baseline', // 세션73: 집계 기준 명시(정본=check-quota)
      // BOARD-PERIOD-SYNC-01: 달력월이 아닌 구독기간으로 집계된 계정 수.
      //   0이면 전 계정이 캘린더 기준 = 이전 동작과 동일하다는 뜻(회귀 판단용).
      subscription_period_accounts: rows.filter(r => r.period_basis === 'subscription').length,
      over_quota_count: rows.filter(r => r.over_quota).length,
      // 87차 추가
      plans_source: planSourceInfo.source, // 'db' | 'fallback'
      plans_loaded: !!planSourceInfo.loaded,
      by_plan: Object.values(byPlan), // 배열 형태 (sort_order 순서)
    };

    return res.status(200).json({
      ok: true,
      observed_at: now.toISOString(),
      month_start: monthStart, // 전역 달력 기준(기존 키 보존). 계정별 기간은 rows[].period_*
      month_end: monthEnd,     // BOARD-PERIOD-SYNC-01 가산
      summary,
      rows,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[accounts-usage] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'ACCOUNTS_USAGE_FAILED',
      detail: e.message,
    });
  }
}
