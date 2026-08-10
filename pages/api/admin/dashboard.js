// pages/api/admin/dashboard.js
// v1.1 (세션134): ADMIN-BASELINE-ROWCAP-01 — 이 파일의 무제한 SELECT 전량 제거.
//   - S133에서 published 축만 .eq로 좁혀 막았고, baseline 축(rawPosts)은 상한에 걸린 채 이월됐다.
//     baseline 1620행 > 1000 → draft_count(917 오표시) / quota gen_monthly 과소집계.
//   - baseline은 .eq만으로는 1000을 못 넘긴다(모집단 자체가 1620). 두 축으로 분해한다:
//     · draft_count = head count(exact) — 행을 아예 가져오지 않는다. 상한 무관.
//     · gen_monthly = publish_status='baseline' AND created_at >= monthStart 로 DB에서 좁힌다.
//       "이번 달 생성"이 원래 모집단이므로 이건 상한 회피가 아니라 정의 교정이다.
//   - 남은 전량 SELECT(accounts / published / metrics)는 fetchAll 페이지네이션으로 통일.
//     ★ .range(0,9999) 같은 고정 상한 확장이 아니라 소진까지 수집이다(accounts-usage.js v0.7 동일 패턴).
//     metrics가 1000을 넘는 순간 observedCount가 잘려 S133에서 고친 unobserved_count가 다시 음수가 된다.
//     같은 결함 계열을 반쪽만 막지 않는다.
//   - rawPosts 변수 제거. 스키마·응답 키 무변경. 추가 쿼리 +1(head count).
// v1.0 (세션78): 발행/quota 축 분리. 발행 KPI = published, quota 사용량 = baseline.
//   - publish_history 는 글 1건 = 2행(baseline 생성 / published URL등록). 실측 1475 : 114 : 2.
//   - 발행 실적(total/monthly/today_posts·최근발행·관측 대상)은 published 만. baseline·test 제외.
//     기존에는 전 행을 세어 발행 KPI 가 10배 이상 부풀려져 있었다.
//   - quota(quota_ratio/over_quota)는 반대로 baseline 기준 — check-quota v138 정본
//     (countGeneratedInPeriod: publish_status='baseline' + created_at)과 같은 값을 봐야 한다.
//     여기서 published 를 쓰면 화면은 여유인데 실제로는 차단되는 mismatch 가 생긴다.
//   - 신규 필드: summary.draft_count / accountRows.monthly_generated. 추가 쿼리 0건, 스키마 무접촉.
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

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { getPlan, quotaUsageRatio, DEFAULT_PLAN_ID } from '../../../lib/billing/plans';
import { requireOwner } from '../../../lib/guards';

const RECENT_LIMIT = 10;

// [ADMIN-BASELINE-ROWCAP-01] PostgREST 기본 1000행 상한 회피 — 소진까지 수집.
//   빌더를 매 회차 새로 만든다(같은 빌더 재사용 시 range가 누적돼 조용히 틀린다).
const PAGE = 1000;
async function fetchAll(buildQuery) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

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

    // 1. accounts 전체
    const accounts = await fetchAll(() =>
      supabaseAdmin
        .from('accounts')
        .select('id, email, display_name, plan, role, status, created_at')
        .order('id', { ascending: true })
    );

    // 2. publish_history — 발행 기준 정합 (세션78)
    //   publish_history 는 글 1건을 2행으로 남긴다: baseline(생성) → published(URL 등록).
    //   실측 baseline 1475 / published 114 / test 2. baseline 은 URL 0건이라 네이버에 존재하지 않는다.
    //   지금까지 전 행을 세어 발행 KPI·quota 사용량이 10배 이상 부풀려져 있었다.
    //   → '발행' = publish_status==='published' 하나로 고정. baseline·test 는 집계에서 제외.
    //   (회원 「최근발행」·admin/publish 목록과 동일 기준)
    //   [세션134 · ADMIN-BASELINE-ROWCAP-01] 조건 없는 전량 SELECT(rawPosts) 제거.
    //   이 쿼리의 유일한 용도는 baseline 축 2개(draft_count / gen_monthly)였고,
    //   1620행이 1000행 상한에 잘려 draft_count 917 오표시 + quota 과소집계를 만들고 있었다.
    //   행이 필요 없는 것은 count로, 이번 달만 필요한 것은 DB에서 기간으로 좁힌다.
    const { count: draftCountRaw, error: dErr } = await supabaseAdmin
      .from('publish_history')
      .select('id', { count: 'exact', head: true })
      .eq('publish_status', 'baseline');
    if (dErr) throw dErr;
    const draftCount = draftCountRaw || 0;

    //   quota 축 — 이번 달 생성분만. 전량을 받아 JS에서 거르던 것을 DB 조건으로 옮긴다.
    //   모집단이 "이번 달 baseline"이므로 상한을 만들 일 자체가 없어진다(현재 149건 규모).
    const baselineMonthRows = await fetchAll(() =>
      supabaseAdmin
        .from('publish_history')
        .select('account_id, created_at')
        .eq('publish_status', 'baseline')
        .gte('created_at', monthStart)
        .order('id', { ascending: true })
    );

    // 2-b. published 축 분리 조회 (세션133 · ADMIN-UNOBSERVED-NEGATIVE-01)
    //   위 rawPosts 는 조건 없는 전량 SELECT 라 PostgREST 기본 1000행 상한에 걸린다.
    //   세션78 시점 총 1591행일 때는 상한 미만이라 무증상이었고, 총행이 1000을 넘어선 뒤
    //   「잘린 1000행 안에서 published 필터」가 되어 분모만 축소됐다(실측: published 135 → 83).
    //   분자 observedCount 는 publish_metrics 정본(135)이므로 83-135 = -52.
    //   → published 는 DB 단계에서 .eq 로 좁혀 상한 자체를 만들지 않는다. 고정 상한 확장(.range)은 재발 예약이라 채택하지 않는다.
    //   ※ S133이 남긴 baseline 이월분은 세션134에서 CLOSE(위 2번 블록).
    //   [세션134] published도 언젠가 1000을 넘는다. .eq는 지금 유효할 뿐 영구 방어가 아니다.
    const posts = await fetchAll(() =>
      supabaseAdmin
        .from('publish_history')
        .select('id, account_id, title, industry, region, treatment_name, created_at, publish_status')
        .eq('publish_status', 'published')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    );

    // 3. publish_metrics 전체
    //   [세션134] 무제한 SELECT였다. metrics가 1000을 넘으면 observedCount가 잘리고
    //   S133에서 고친 unobserved_count가 다시 음수가 된다(분자만 축소되는 대칭 결함).
    //   id 보조정렬 — 동일 observed_date/created_at 다건에서 페이지 경계가 흔들리지 않게 한다.
    const metrics = await fetchAll(() =>
      supabaseAdmin
        .from('publish_metrics')
        .select('id, publish_id, observed_date, alive_status, observed_rank, observed_keyword, days_since_publish, created_at, rank_detail')
        .order('observed_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    );

    // 4. 계정별 집계 — 축이 둘이다(세션78).
    //   · quota 사용량 = baseline(생성) — check-quota v138 정본과 동일 기준.
    //     countGeneratedInPeriod(publish_status='baseline' + created_at). 여기서 published 를 쓰면
    //     화면은 여유인데 실제로는 차단되는 mismatch 가 생긴다.
    //   · 발행 실적 = published(URL 등록) — 네이버에 실제 존재하는 글.
    const acctStats = {};
    const touch = (aid) => {
      if (!acctStats[aid]) {
        acctStats[aid] = { total: 0, monthly: 0, latest: null, gen_monthly: 0 };
      }
      return acctStats[aid];
    };
    // quota 축 — baseline 기준. [세션134] 기간 필터는 이미 DB에서 적용됨(baselineMonthRows).
    for (const p of baselineMonthRows) {
      if (!p.account_id) continue;
      touch(p.account_id).gen_monthly += 1;
    }
    // 발행 축 — published 기준
    for (const p of posts || []) {
      if (!p.account_id) continue;
      const s = touch(p.account_id);
      s.total += 1;
      if (p.created_at && p.created_at >= monthStart) s.monthly += 1;
      if (!s.latest || (p.created_at && p.created_at > s.latest)) {
        s.latest = p.created_at;
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
      const s = acctStats[a.id] || { total: 0, monthly: 0, latest: null, gen_monthly: 0 };
      const planId = a.plan || DEFAULT_PLAN_ID;
      const plan = getPlan(planId);
      // 세션78: quota 는 생성(baseline) 기준 — check-quota v138 과 동일
      const ratio = quotaUsageRatio(planId, s.gen_monthly);
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
        monthly_generated: s.gen_monthly, // 세션78: quota 소진 기준값(생성)
        latest_at: s.latest,
        quota_ratio: Number(ratio.toFixed(3)),
        over_quota: s.gen_monthly >= plan.monthly_quota, // 세션78: 생성 기준(check-quota v138 정합) / v0.7의 >= 경계 유지
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
      // 세션78: 생성만 하고 발행(URL 등록) 안 한 글. 발행 KPI 와 섞지 않는다.
      draft_count: draftCount,
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
