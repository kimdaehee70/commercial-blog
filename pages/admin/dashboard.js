// pages/api/admin/dashboard.js
// v1.0 (?�션77): today_observed 추�? ???�?�보??KPI ?�오??관측등록�?지??
//   publish_metrics �??��? ?�량 ?�고 ?�으므�??�생�?추�?(추�? 쿼리 0�?.
//   기�?: observed_date(date 컬럼)가 KST ?�늘 == dayStart ???�짜부. created_at ???�니??observed_date �?//   ?�는 ?�유??'?�제 관측했?��?'가 ?�니??'?�느 ?�짜??관측인가'가 ?�영 ?�단 기�??�기 ?�문.
//   중복 관�?방�?�??�해 publish_id 기�? ?�니??카운??
// v0.9 (?�션77): ?�?�보??v2.0 지?????�생 집계�?추�?. DB/?�키�?쿼리 무접�?추�? 쿼리 0�?.
//   - 추�? summary: paid_accounts / free_accounts / today_signups / today_posts
//   - 추�? ?�답: recent_accounts(최근 가??5�? / day_start
//   - accountRows ??created_at · is_paid 2?�드 추�? (기존 ?�드 무�?�?
//   - ?�늘 경계??KST 고정. ?�버 TZ(UTC)???�존?�면 09:00 ?�전 발행???�날�??�는 문제 발생.
//   - ?�료 ?�정 = plan.id !== DEFAULT_PLAN_ID (?�금??SoT??lib/billing/plans). 결제 ?�이�?미참�?
//   - 기존 ?�답 ???��? ?��? (?�위?�환). B-4(PG) ?�후 매출·결제 ?�드??별도 추�? ?�정.
// v0.8 (99�?: survival_hours ?�거 ??publish_history.survival_hours 컬럼 DB 미존?�로 dashboard 500(DASHBOARD_FAILED) ?�발.
//   SELECT/?�생집계/summary 2?�드 ??��. DB 무접�? 컬럼 ?�식 추�?(DDL) ??복구.
//   ??v0.5?�서 'publish-list ?�존 ?�인?? 주석?� ?�판 ??publish_history??컬럼 ?�음.
// v0.7 (99�?: over_quota 경계 > ??>= (line102) ??accounts-usage 91�?v0.5?� ?�합.
//   - 같�? 10/10(?�도 ?�진) 계정??dashboard='?�상' / accounts-usage='over'�?갈리??mismatch ?�거.
//   - check-quota 차단 truth(publish < quota)?� ?�치. spine/DB/quota�?무�?�? ?�시 경계 1줄만.
// v0.6 (관�?): 관?�도 ?�동 집계 추�? (rank_detail related/recent �? ??추�?�? 기존 ?�답 무�?�?// - publish_metrics select??rank_detail 컬럼 1�?추�? (추�? 쿼리 0, latestMetricByPid ?�사??
// - summary ?�규 ?�드: related_exposed_count / recent_only_count / avg_related_rank
// - 기존 ?�드/로직/?�답 ???��? 무�?�?(?�위?�환). UI 미사???�규 ?�드??무해.
//
// v0.5 (?�영 UI �?: Tier 3 관�?집계 추�? (survival/fossil/미�?�? ??추�?�? 기존 ?�답 ?�맷 무�?�?// - publish_history select??survival_hours 컬럼 1�?추�? (publish-list?�서 ?�존 ?�인??
// - summary???�규 ?�드 추�?: avg_survival_hours / max_survival_hours / fossil_recent_7d / max_unobserved_days
// - 기존 ?�드/로직/?�답 ???��? 무�?�?(?�위?�환). UI 미사???�규 ?�드??무해.
//
// 86�?v0.4: 가???�수 마이그레?�션 (lib/guards.requireOwner ?�용)
// - 5�?가???�턴 ??1�?requireOwner ?�출
// - 비즈?�스 로직 / ?�답 ?�맷 무�?�?(UI ?�환 ?��?)
// - OWNER_UID / supabaseAdmin.auth.getUser 직접 ?�출 ?�거
//
// 84�?v0.3: ?�증 ?�라?�언???�일 (supabaseAuth ??supabaseAdmin)
// 55�?v0.2: Bearer ?�큰 검�?+ OWNER_UID 가??// 48�?v0.1: ?�영 콘솔 v1 ?�합 보드 API (read-only)

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { getPlan, quotaUsageRatio, DEFAULT_PLAN_ID } from '../../lib/billing/plans';
import { requireOwner } from '../../lib/guards';

const RECENT_LIMIT = 10;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가??(86�?v0.4: requireOwner ?�일) ---
  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // v0.9(?�션77): '?�늘' 경계 ??KST 00:00 ??UTC ISO �??�산. ?�버 TZ ???�존?��? ?�는??
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + KST_OFFSET);
    const dayStart = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()) - KST_OFFSET
    ).toISOString();
    // KST 기�? ?�늘 ?�짜(YYYY-MM-DD) ??observed_date(date 컬럼) 비교??
    const todayKst = kstNow.toISOString().slice(0, 10);

    // 1. accounts ?�체
    const { data: accounts, error: accErr } = await supabaseAdmin
      .from('accounts')
      .select('id, email, display_name, plan, role, status, created_at')
      .order('id', { ascending: true });
    if (accErr) throw accErr;

    // 2. publish_history ?�체
    const { data: posts, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, account_id, title, industry, region, treatment_name, created_at')
      .order('created_at', { ascending: false });
    if (pErr) throw pErr;

    // 3. publish_metrics ?�체
    const { data: metrics, error: mErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('publish_id, observed_date, alive_status, observed_rank, observed_keyword, days_since_publish, created_at, rank_detail')
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    // 4. 계정�?발행 집계
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

    // 5. publish_id�?최신 metric 1�?    const latestMetricByPid = {};
    for (const m of metrics || []) {
      if (!m.publish_id) continue;
      if (!latestMetricByPid[m.publish_id]) latestMetricByPid[m.publish_id] = m;
    }

    // 6. accounts ??+ plan/quota
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
        created_at: a.created_at,           // v0.9: 최근 가?�·오??가???�생??        is_paid: plan.id !== DEFAULT_PLAN_ID, // v0.9: ?�료/무료 구분 (?�금??SoT 기�?)
        total_posts: s.total,
        monthly_posts: s.monthly,
        latest_at: s.latest,
        quota_ratio: Number(ratio.toFixed(3)),
        over_quota: s.monthly >= plan.monthly_quota, // v0.7: accounts-usage 91�?>=)?� ?�합 ??10/10 계정 ??보드 ?�시 ?�치 (check-quota: publish < quota)
      };
    });

    // 7. 최근 발행 N�?    const recentPublishes = (posts || []).slice(0, RECENT_LIMIT).map(p => {
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

    // 8. 최근 관�?N�?    const postById = {};
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

    // 9. ?�체 ?�약
    const observedCount = Object.keys(latestMetricByPid).length;
    const aliveCount = Object.values(latestMetricByPid).filter(m => m.alive_status === 'alive').length;
    const fossilCount = Object.values(latestMetricByPid).filter(m => m.alive_status === 'fossil').length;

    // 9-b. Tier 3 관�?집계 (fossil 추세 / 미�?�??�체)
    // ??v0.8(99�?: survival_hours ?�생 ?�거 ??publish_history.survival_hours 컬럼 미존?�로 dashboard 500 ?�발.
    //   ?�당 컬럼 SELECT/집계 ??��. summary.avg_survival_hours/max_survival_hours ?�거.
    //   컬럼??DB???�식 추�?(DDL)?�면 복구. fossil_recent_7d/max_unobserved_days??무�? ???��?.

    // fossil 최근 7?? publish_metrics �?alive_status='fossil' & observed_date 최근 7??(publish_id 중복 ?�거)
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

    // 미�?�??�체: 관�???번도 ?�는 발행 �? 발행 ??가???�래 경과???�수
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

    // 9-c. 관�?: 관?�도 ?�동 집계 (rank_detail related/recent �?
    // rank_detail 6?? core/review/full × related/recent (observations API RANK_KEYS?� ?�치)
    // 최신 metric 1�?latestMetricByPid) 기�? ??발행�??�재 ?�출 ?�태�?분류.
    //   · related �?관?�도?? ?�위 보유 ??관?�도 ?�출
    //   · related ?�고 recent �?최신??�?보유 ??최신?�만 ?�출 (관?�도 ?�동 ?��?
    //   · 관?�도 ?�균?�위 = related 보유 발행?�의 "?�??related ?�위" ?�균 (review_related?�core_related?�full_related ?�선)
    const REL_KEYS = ['core_related', 'review_related', 'full_related'];
    const REC_KEYS = ['core_recent', 'review_recent', 'full_recent'];
    const posRank = (v) => (typeof v === 'number' && v > 0 ? v : null);
    const pickRelated = (rd) => {
      // ?�??related ?�위 ?�선?�위: review ??core ??full
      for (const k of ['review_related', 'core_related', 'full_related']) {
        const r = posRank(rd?.[k]);
        if (r != null) return r;
      }
      return null;
    };
    const hasAxis = (rd, keys) => keys.some(k => posRank(rd?.[k]) != null);

    let relatedExposedCount = 0;   // 관?�도 ?�출 건수
    let recentOnlyCount = 0;       // 최신?�만 ?�출 건수
    const relatedRankVals = [];    // 관?�도 ?�?�순??모음 (?�균??
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

    // 9-d. v0.9(?�션77): 최근 가??5�???1번에???��? accounts ?�사??추�? 쿼리 ?�음).
    //   accounts ??id ?�름차순?�로 ?�렬???�으므�?created_at 기�? ?�정?�이 ?�요?�다.
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

    // v1.0: ?�늘 관측등�???observed_date 가 KST ?�늘??발행 ??publish_id ?�니??.
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
      // v0.9(?�션77) ?�규 ???�생�? 추�? 쿼리·DB 변�??�음.
      paid_accounts: paidAccounts,
      free_accounts: accountRows.length - paidAccounts,
      today_signups: accountRows.filter(r => r.created_at && r.created_at >= dayStart).length,
      today_posts: (posts || []).filter(p => p.created_at && p.created_at >= dayStart).length,
      today_observed: todayObservedPids.size, // v1.0
      observed_count: observedCount,
      alive_count: aliveCount,
      fossil_count: fossilCount,
      unobserved_count: (posts || []).length - observedCount,
      // Tier 3 (UI 미사????무시?????�위?�환)
      // ??v0.8: avg/max_survival_hours ?�거 (survival_hours 컬럼 미존??
      fossil_recent_7d: fossilRecent7d,
      max_unobserved_days: maxUnobservedDays,
      // 관�? ?�규 ??관?�도 ?�동 (UI 미사????무시?????�위?�환)
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
