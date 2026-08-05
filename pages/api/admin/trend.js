// pages/api/admin/trend.js
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 5줄 가드 패턴 → 1줄 requireOwner 호출
// - 응답 포맷 표준화 (METHOD_NOT_ALLOWED 대문자 / UNAUTHORIZED+detail)
// - 호출처: pages/admin/trend.js (j.ok / j.error / j.detail 모두 호환) — 무영향
// - SQL / 비즈니스 로직 무변경
//
// 84차 v0.2 — 인증 표준화 (system-stats v0.1 패턴 따라감)
// 48차 — survival trend API (read-only)
// 상단: alive율 · fossil율 · 평균 생존일 · 업종별 survival
// 하단: publish_id별 timeline (alive→fossil 변화, rank 변화, memo)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const TIMELINE_LIMIT = 50; // 화면 표시용 publish 상한

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- 가드 (86차 v0.3: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    // 1. publish_history
    const { data: posts, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, industry, region, treatment_name, created_at, published_at')
      .order('id', { ascending: false })
      .limit(TIMELINE_LIMIT);
    if (pErr) throw pErr;

    const ids = (posts || []).map(p => p.id);

    // 2. publish_metrics — timeline용 전체 행
    let allMetrics = [];
    if (ids.length) {
      const { data: m, error: mErr } = await supabaseAdmin
        .from('publish_metrics')
        .select('id, publish_id, observed_date, days_since_publish, alive_status, observed_rank, observed_keyword, keyword_rank_type, fossil_observed, fossil_note, exposure_note, created_at')
        .in('publish_id', ids)
        .order('observed_date', { ascending: true })
        .order('created_at', { ascending: true });
      if (mErr) throw mErr;
      allMetrics = m || [];
    }

    // 3. publish_id별 그룹화
    const metricsByPid = {};
    for (const m of allMetrics) {
      if (!metricsByPid[m.publish_id]) metricsByPid[m.publish_id] = [];
      metricsByPid[m.publish_id].push(m);
    }

    // 4. 행별 분석 — survival 통계
    const timelines = [];
    let totalObservations = 0;
    let aliveObservations = 0;
    let fossilObservations = 0;

    // 업종별 집계
    const byIndustry = {};

    for (const p of posts || []) {
      const obs = metricsByPid[p.id] || [];
      const sorted = obs; // already sorted asc

      const latest = sorted.length ? sorted[sorted.length - 1] : null;

      // 첫 fossil 관측 시점 → survival days
      let firstFossilDay = null;
      let lastAliveDay = null;
      for (const m of sorted) {
        if (m.alive_status === 'fossil' && firstFossilDay === null) {
          firstFossilDay = m.days_since_publish;
        }
        if (m.alive_status === 'alive') {
          lastAliveDay = m.days_since_publish;
        }
        totalObservations += 1;
        if (m.alive_status === 'alive') aliveObservations += 1;
        if (m.alive_status === 'fossil') fossilObservations += 1;
      }

      // rank 변화
      const rankSeries = sorted
        .filter(m => m.observed_rank != null)
        .map(m => ({ d: m.days_since_publish, rank: m.observed_rank, date: m.observed_date }));

      // status 변화 (alive↔fossil 전환 지점만)
      const statusChanges = [];
      let prev = null;
      for (const m of sorted) {
        if (m.alive_status !== prev) {
          statusChanges.push({
            d: m.days_since_publish,
            date: m.observed_date,
            from: prev,
            to: m.alive_status,
          });
          prev = m.alive_status;
        }
      }

      timelines.push({
        publish_id: p.id,
        title: p.title,
        industry: p.industry,
        region: p.region,
        treatment_name: p.treatment_name,
        published_at: p.created_at,
        observation_count: sorted.length,
        latest_status: latest?.alive_status || null,
        latest_rank: latest?.observed_rank ?? null,
        latest_keyword: latest?.observed_keyword || null,
        latest_observed_at: latest?.observed_date || null,
        first_fossil_day: firstFossilDay,
        last_alive_day: lastAliveDay,
        survival_days: firstFossilDay ?? lastAliveDay,
        rank_series: rankSeries,
        status_changes: statusChanges,
        full_timeline: sorted.map(m => ({
          d: m.days_since_publish,
          date: m.observed_date,
          status: m.alive_status,
          rank: m.observed_rank,
          keyword: m.observed_keyword,
          note: m.exposure_note,
          fossil: m.fossil_observed,
          fossil_note: m.fossil_note,
        })),
      });

      // 업종별 집계
      const ind = p.industry || '(unknown)';
      if (!byIndustry[ind]) {
        byIndustry[ind] = { posts: 0, latest_alive: 0, latest_fossil: 0, latest_unknown: 0, survival_sum: 0, survival_n: 0 };
      }
      byIndustry[ind].posts += 1;
      if (latest?.alive_status === 'alive') byIndustry[ind].latest_alive += 1;
      else if (latest?.alive_status === 'fossil') byIndustry[ind].latest_fossil += 1;
      else byIndustry[ind].latest_unknown += 1;
      const sd = firstFossilDay ?? lastAliveDay;
      if (sd != null) {
        byIndustry[ind].survival_sum += sd;
        byIndustry[ind].survival_n += 1;
      }
    }

    // 5. 상단 압축 지표
    const observedTimelines = timelines.filter(t => t.observation_count > 0);
    const latestAlive = timelines.filter(t => t.latest_status === 'alive').length;
    const latestFossil = timelines.filter(t => t.latest_status === 'fossil').length;
    const aliveRate = observedTimelines.length
      ? (latestAlive / observedTimelines.length)
      : 0;
    const fossilRate = observedTimelines.length
      ? (latestFossil / observedTimelines.length)
      : 0;

    const survivalSamples = timelines.map(t => t.survival_days).filter(d => d != null);
    const avgSurvivalDays = survivalSamples.length
      ? (survivalSamples.reduce((a, b) => a + b, 0) / survivalSamples.length)
      : null;

    const fossilDays = timelines.map(t => t.first_fossil_day).filter(d => d != null);
    const avgFossilDay = fossilDays.length
      ? (fossilDays.reduce((a, b) => a + b, 0) / fossilDays.length)
      : null;

    const industryRows = Object.entries(byIndustry).map(([industry, v]) => ({
      industry,
      posts: v.posts,
      latest_alive: v.latest_alive,
      latest_fossil: v.latest_fossil,
      latest_unknown: v.latest_unknown,
      alive_rate: v.posts ? Number((v.latest_alive / v.posts).toFixed(3)) : 0,
      avg_survival_days: v.survival_n ? Number((v.survival_sum / v.survival_n).toFixed(1)) : null,
    })).sort((a, b) => b.posts - a.posts);

    const summary = {
      total_posts: (posts || []).length,
      observed_posts: observedTimelines.length,
      latest_alive: latestAlive,
      latest_fossil: latestFossil,
      alive_rate: Number(aliveRate.toFixed(3)),
      fossil_rate: Number(fossilRate.toFixed(3)),
      avg_survival_days: avgSurvivalDays != null ? Number(avgSurvivalDays.toFixed(1)) : null,
      avg_fossil_day: avgFossilDay != null ? Number(avgFossilDay.toFixed(1)) : null,
      total_observations: totalObservations,
      alive_observations: aliveObservations,
      fossil_observations: fossilObservations,
    };

    return res.status(200).json({
      ok: true,
      observed_at: new Date().toISOString(),
      summary,
      industry: industryRows,
      timelines,
    });
  } catch (e) {
    console.error('[trend] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'TREND_FAILED',
      detail: e.message,
    });
  }
}
