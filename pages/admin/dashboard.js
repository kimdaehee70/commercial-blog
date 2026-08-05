// pages/api/admin/dashboard.js
// v1.0 (세션77): today_observed 추가 — 대시보드 KPI 「오늘 관측등록」 지원.
//   publish_metrics 를 이미 전량 읽고 있으므로 파생만 추가(추가 쿼리 0건).
//   기준: observed_date(date 컬럼)가 KST 오늘 == dayStart 의 날짜부. created_at 이 아니라 observed_date 를
//   쓰는 이유는 '언제 관측했는가'가 아니라 '어느 날짜의 관측인가'가 운영 판단 기준이기 때문.
//   중복 관측 방지를 위해 publish_id 기준 유니크 카운트.
// v0.9 (세션77): 대시보드 v2.0 지원 — 파생 집계만 추가. DB/스키마/쿼리 무접촉(추가 쿼리 0건).
//   - 추가 summary: paid_accounts / free_accounts / today_signups / today_posts
//   - 추가 응답: recent_accounts(최근 가입 5명) / day_start
//   - accountRows 에 created_at · is_paid 2필드 추가 (기존 필드 무변경)
//   - 오늘 경계는 KST 고정. 서버 TZ(UTC)에 의존하면 09:00 이전 발행이 전날로 새는 문제 발생.
//   - 유료 판정 = plan.id !== DEFAULT_PLAN_ID (요금제 SoT는 lib/billing/plans). 결제 테이블 미참조.
//   - 기존 응답 키 전부 유지 (하위호환). B-4(PG) 이후 매출·결제 필드는 별도 추가 예정.
// v0.8 (99차): survival_hours 제거 — publish_history.survival_hours 컬럼 DB 미존재로 dashboard 500(DASHBOARD_FAILED) 유발.
//   SELECT/파생집계/summary 2필드 삭제. DB 무접촉. 컬럼 정식 추가(DDL) 시 복구.
//   ※ v0.5에서 'publish-list 실존 확인됨' 주석은 오판 — publish_history엔 컬럼 없음.
// v0.7 (99차): over_quota 경계 > → >= (line102) — accounts-usage 91차 v0.5와 정합.
//   - 같은 10/10(한도 소진) 계정이 dashboard='정상' / accounts-usage='over'로 갈리던 mismatch 제거.
//   - check-quota 차단 truth(publish < quota)와 일치. spine/DB/quota값 무변경. 표시 경계 1줄만.
// v0.6 (관측4): 관련도 이동 집계 추가 (rank_detail related/recent 축) — 추가만, 기존 응답 무변경
// - publish_metrics select에 rank_detail 컬럼 1개 추가 (추가 쿼리 0, latestMetricByPid 재사용)
// - summary 신규 필드: related_exposed_count / recent_only_count / avg_related_rank
// - 기존 필드/로직/응답 키 전부 무변경 (하위호환). UI 미사용 신규 필드는 무해.
//
// v0.5 (운영 UI 방): Tier 3 관측 집계 추가 (survival/fossil/미관측) — 추가만, 기존 응답 포맷 무변경
// - publish_history select에 survival_hours 컬럼 1개 추가 (publish-list에서 실존 확인됨)
// - summary에 신규 필드 추가: avg_survival_hours / max_survival_hours / fossil_recent_7d / max_unobserved_days
// - 기존 필드/로직/응답 키 전부 무변경 (하위호환). UI 미사용 신규 필드는 무해.
//
// 86차 v0.4: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - 비즈니스 로직 / 응답 포맷 무변경 (UI 호환 유지)
// - OWNER_UID / supabaseAdmin.auth.getUser 직접 호출 제거
//
// 84차 v0.3: 인증 클라이언트 통일 (supabaseAuth → supabaseAdmin)
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드
// 48차 v0.1: 운영 콘솔 v1 통합 보드 API (read-only)

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { getPlan, quotaUsageRatio, DEFAULT_PLAN_ID } from '../../lib/billing/plans';
import { requireOwner } from '../../lib/guards';

const RECENT_LIMIT = 10;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.4: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // v0.9(세션77): '오늘' 경계 — KST 00:00 을 UTC ISO 로 환산. 서버 TZ 에 의존하지 않는다.
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + KST_OFFSET);
    const dayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
    ).toISOString();
    // KST 기준 오늘 날짜(YYYY-MM-DD) — observed_date(date 컬럼) 비교용.
    const todayKst = kstNow.toISOString().slice(0, 10);

    // 1. accounts 전체
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, display_name, plan, role, status, created_at')
      .order('id', { ascending: true });
    if (accErr) throw accErr;

    // 2. publish_history 전체
    const { data: posts, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, account_id, title, industry, region, treatment_name, created_at')
      .order('created_at', { ascending: false });
    if (pErr) throw pErr;

    // 3. publish_metrics 전체
    const { data: metrics, error: mErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('publish_id, observed_date, alive_status, observed_rank, observed_keyword, days_since_publish, created_at, rank_detail')
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    // 4. 계정별 발행 집계
    const acctStats = {};
    for (const p of posts || []) {
      if (!p.account_id) continue;
      const aid = p.account_id;
      if (!acctStats[aid]) acctStats[aid] = { total: 0, monthly: 0, latest: null };
      acctStats[aid].total += 1;
      if (p.created_at && p.created_at >= monthStart) acctStats[aid].monthly += 1;
      if (!acctStats[aid].latest || (p.created_at && p.created_at > acctStats[aid].latest)) {
        acctStats[aid].latest = p.created_at;
      }
    }

    // 5. publish_id별 최신 metric 1건
    const latestMetricByPid = {};
    for (const m of metrics || []) {
      if (!m.publish_id) continue;
      if (!latestMetricByPid[m.publish_id]) latestMetricByPid[m.publish_id] = m;
    }

    // 6. accounts 행 + plan/quota
    const accountRows = (accounts || []).map(a => {
      const s = acctStats[a.id] || { total: 0, monthly: 0, latest: null };
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
        created_at: a.created_at,           // v0.9: 최근 가입·오늘 가입 파생용
        is_paid: plan.id !== DEFAULT_PLAN_ID, // v0.9: 유료/무료 구분 (요금제 SoT 기준)
        total_posts: s.total,
        monthly_posts: s.monthly,
        latest_at: s.latest,
        quota_ratio: Number(ratio.toFixed(3)),
        over_quota: s.monthly >= plan.monthly_quota, // v0.7: accounts-usage 91차(>=)와 정합 — 10/10 계정 양 보드 표시 일치 (check-quota: publish < quota)
      };
    });

    // 7. 최근 발행 N건
    const recentPublishes = (posts || []).slice(0, RECENT_LIMIT).map(p => {
      const m = latestMetricByPid[p.id] || null;
      return {
        publish_id: p.id,
        title: p.title,
        industry: p.industry,
        region: p.region,
        treatment_name: p.treatment_name,
        account_id: p.account_id,
        published_at: p.created_at,
        alive_status: m?.alive_status || null,
        observed_rank: m?.observed_rank ?? null,
      };
    });

    // 8. 최근 관측 N건
    const postById = {};
    for (const p of posts || []) postById[p.id] = p;
    const recentObservations = (metrics || []).slice(0, RECENT_LIMIT).map(m => {
      const p = postById[m.publish_id] || null;
      return {
        publish_id: m.publish_id,
        title: p?.title || null,
        observed_date: m.observed_date,
        alive_status: m.alive_status,
        observed_rank: m.observed_rank,
        observed_keyword: m.observed_keyword,
        days_since_publish: m.days_since_publish,
      };
    });

    // 9. 전체 요약
    const observedCount = Object.keys(latestMetricByPid).length;
    const aliveCount = Object.values(latestMetricByPid).filter(m => m.alive_status === 'alive').length;
    const fossilCount = Object.values(latestMetricByPid).filter(m => m.alive_status === 'fossil').length;

    // 9-b. Tier 3 관측 집계 (fossil 추세 / 미관측 적체)
    // ※ v0.8(99차): survival_hours 파생 제거 — publish_history.survival_hours 컬럼 미존재로 dashboard 500 유발.
    //   해당 컬럼 SELECT/집계 삭제. summary.avg_survival_hours/max_survival_hours 제거.
    //   컬럼이 DB에 정식 추가(DDL)되면 복구. fossil_recent_7d/max_unobserved_days는 무관 — 유지.

    // fossil 최근 7일: publish_metrics 중 alive_status='fossil' & observed_date 최근 7일 (publish_id 중복 제거)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fossilRecentPids = new Set();
    for (const m of metrics || []) {
      if (m.alive_status !== 'fossil') continue;
      const od = m.observed_date ? new Date(m.observed_date) : null;
      if (od && !Number.isNaN(od.getTime()) && od >= sevenDaysAgo) {
        fossilRecentPids.add(m.publish_id);
      }
    }
    const fossilRecent7d = fossilRecentPids.size;

    // 미관측 적체: 관측 한 번도 없는 발행 중, 발행 후 가장 오래 경과한 일수
    const observedPidSet = new Set(Object.keys(latestMetricByPid).map(k => Number(k)));
    let maxUnobservedDays = null;
    for (const p of posts || []) {
      if (observedPidSet.has(p.id)) continue;
      if (!p.created_at) continue;
      const created = new Date(p.created_at);
      if (Number.isNaN(created.getTime())) continue;
      const days = Math.floor((now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
      if (maxUnobservedDays == null || days > maxUnobservedDays) maxUnobservedDays = days;
    }

    // 9-c. 관측4: 관련도 이동 집계 (rank_detail related/recent 축)
    // rank_detail 6키: core/review/full × related/recent (observations API RANK_KEYS와 일치)
    // 최신 metric 1건(latestMetricByPid) 기준 — 발행별 현재 노출 상태로 분류.
    //   · related 축(관련도순) 순위 보유 → 관련도 노출
    //   · related 없고 recent 축(최신순)만 보유 → 최신순만 노출 (관련도 이동 대기)
    //   · 관련도 평균순위 = related 보유 발행들의 "대표 related 순위" 평균 (review_related→core_related→full_related 우선)
    const REL_KEYS = ['core_related', 'review_related', 'full_related'];
    const REC_KEYS = ['core_recent', 'review_recent', 'full_recent'];
    const posRank = (v) => (typeof v === 'number' && v > 0 ? v : null);
    const pickRelated = (rd) => {
      // 대표 related 순위 우선순위: review → core → full
      for (const k of ['review_related', 'core_related', 'full_related']) {
        const r = posRank(rd?.[k]);
        if (r != null) return r;
      }
      return null;
    };
    const hasAxis = (rd, keys) => keys.some(k => posRank(rd?.[k]) != null);

    let relatedExposedCount = 0;   // 관련도 노출 건수
    let recentOnlyCount = 0;       // 최신순만 노출 건수
    const relatedRankVals = [];    // 관련도 대표순위 모음 (평균용)
    for (const m of Object.values(latestMetricByPid)) {
      const rd = m.rank_detail || null;
      if (!rd) continue;
      const hasRel = hasAxis(rd, REL_KEYS);
      const hasRec = hasAxis(rd, REC_KEYS);
      if (hasRel) {
        relatedExposedCount += 1;
        const rr = pickRelated(rd);
        if (rr != null) relatedRankVals.push(rr);
      } else if (hasRec) {
        recentOnlyCount += 1;
      }
    }
    const avgRelatedRank = relatedRankVals.length
      ? Number((relatedRankVals.reduce((a, b) => a + b, 0) / relatedRankVals.length).toFixed(1))
      : null;

    // 9-d. v0.9(세션77): 최근 가입 5명 — 1번에서 읽은 accounts 재사용(추가 쿼리 없음).
    //   accounts 는 id 오름차순으로 정렬돼 있으므로 created_at 기준 재정렬이 필요하다.
    const recentAccounts = accountRows
      .filter(r => r.created_at)
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        email: r.email,
        display_name: r.display_name,
        plan_label: r.plan_label,
        is_paid: r.is_paid,
        status: r.status,
        created_at: r.created_at,
        total_posts: r.total_posts,
      }));

    const paidAccounts = accountRows.filter(r => r.is_paid).length;

    // v1.0: 오늘 관측등록 — observed_date 가 KST 오늘인 발행 수(publish_id 유니크).
    const todayObservedPids = new Set();
    for (const m of metrics || []) {
      if (!m.observed_date || !m.publish_id) continue;
      if (String(m.observed_date).slice(0, 10) === todayKst) todayObservedPids.add(m.publish_id);
    }

    const summary = {
      total_accounts: accountRows.length,
      active_accounts: accountRows.filter(r => r.status === 'active').length,
      over_quota_count: accountRows.filter(r => r.over_quota).length,
      total_posts: (posts || []).length,
      monthly_posts: (posts || []).filter(p => p.created_at && p.created_at >= monthStart).length,
      // v0.9(세션77) 신규 — 파생만. 추가 쿼리·DB 변경 없음.
      paid_accounts: paidAccounts,
      free_accounts: accountRows.length - paidAccounts,
      today_signups: accountRows.filter(r => r.created_at && r.created_at >= dayStart).length,
      today_posts: (posts || []).filter(p => p.created_at && p.created_at >= dayStart).length,
      today_observed: todayObservedPids.size, // v1.0
      observed_count: observedCount,
      alive_count: aliveCount,
      fossil_count: fossilCount,
      unobserved_count: (posts || []).length - observedCount,
      // Tier 3 (UI 미사용 시 무시됨 — 하위호환)
      // ※ v0.8: avg/max_survival_hours 제거 (survival_hours 컬럼 미존재)
      fossil_recent_7d: fossilRecent7d,
      max_unobserved_days: maxUnobservedDays,
      // 관측4 신규 — 관련도 이동 (UI 미사용 시 무시됨 — 하위호환)
      related_exposed_count: relatedExposedCount,
      recent_only_count: recentOnlyCount,
      avg_related_rank: avgRelatedRank,
    };

    return res.status(200).json({
      ok: true,
      observed_at: now.toISOString(),
      month_start: monthStart,
      day_start: dayStart,          // v0.9
      summary,
      accounts: accountRows,
      recent_accounts: recentAccounts, // v0.9
      recent_publishes: recentPublishes,
      recent_observations: recentObservations,
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[dashboard] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'DASHBOARD_FAILED',
      detail: e.message,
    });
  }
}

export async function getServerSideProps() { return { props: {} }; }
