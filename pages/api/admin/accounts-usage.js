// pages/api/admin/accounts-usage.js
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

    // 3. 월 경계 — 121차 §1: check-quota.js 정본식 1:1 복사 (KST 1일 00:00 기준)
    //    변경 전: new Date(now.getFullYear(), now.getMonth(), 1) = 서버 로컬타임존 월초 (KST 아님)
    //    변경 후: KST 월초/월말 UTC 환산 + [start,end) lt 상한 (created_at 비교는 ISO 문자열 사전순=시간순 동일)
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const monthStartKst = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), 1, 0, 0, 0)
    );
    const monthStart = new Date(monthStartKst.getTime() - 9 * 60 * 60 * 1000).toISOString();
    const nextMonthKst = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() + 1, 1, 0, 0, 0)
    );
    const monthEnd = new Date(nextMonthKst.getTime() - 9 * 60 * 60 * 1000).toISOString();

    // 4. account_id별 집계 — monthly는 [monthStart, monthEnd) 범위만 (정본 lt 상한 정합)
    const stats = {};
    for (const p of posts || []) {
      if (!p.account_id) continue;
      const aid = p.account_id;
      if (!stats[aid]) stats[aid] = { total: 0, monthly: 0, published: 0, latest: null };

      const inMonth =
        !!p.created_at && p.created_at >= monthStart && p.created_at < monthEnd;

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
      over_quota_count: rows.filter(r => r.over_quota).length,
      // 87차 추가
      plans_source: planSourceInfo.source, // 'db' | 'fallback'
      plans_loaded: !!planSourceInfo.loaded,
      by_plan: Object.values(byPlan), // 배열 형태 (sort_order 순서)
    };

    return res.status(200).json({
      ok: true,
      observed_at: now.toISOString(),
      month_start: monthStart,
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
