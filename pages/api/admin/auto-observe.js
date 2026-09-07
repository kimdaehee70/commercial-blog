// pages/api/admin/auto-observe.js
// OBSERVATION-AUTO-DASHBOARD-01 v0.1 — 자동관측 전용 read 엔드포인트 (신규)
//
// 원칙 (선장 확정):
// - 자동 SoT = survival_log. 수동 SoT = publish_metrics. 두 숫자 병합 금지.
//   → 이 파일은 publish_metrics 를 단 한 번도 읽지 않는다.
// - 기존 observations.js / publish-list.js 의 fetchAll(range 루프 전량 로딩)을 복사하지 않는다.
//   요약 = 오늘 관측분만(상한 있음), 목록 = View + range 페이지네이션 + exact count.
// - 정렬 파라미터는 명시한다 (OBSERVE-SORT-PARAM-IMPLICIT-01 반복 금지).
// - 검색어는 core_keyword 만 공식 표시값. NULL 을 full_keyword 로 조용히 대체하지 않는다.
// - 엔진 / observer/tick.js / lib/observeSchedule.js / 사용자 화면 무접촉.
//
// GET /api/admin/auto-observe
//   ?from=YYYY-MM-DD & to=YYYY-MM-DD   (마지막 관측일 기준, KST)
//   &industry=legal
//   &status=top10|top30|none           (top30 = 1~30위 전체)
//   &q=검색어부분일치                    (core_keyword 대상)
//   &sort=last_observed_at|current_rank|best_rank|first_observed_at
//   &dir=desc|asc
//   &page=1 &size=50
//   &include_legacy=1                  (cutoff 이전 발행글 포함. 기본 제외)
//
// 응답: { ok, summary, rows, page:{page,size,total}, meta }

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

const VIEW = 'v_auto_observe_latest';
const SIZE_MAX = 200;
const TODAY_ROW_CAP = 500; // 오늘 관측행 상한. tick 상한(10/일)+기준선 대비 충분한 여유.

const SORTABLE = new Set([
  'last_observed_at',
  'first_observed_at',
  'current_rank',
  'best_rank',
]);

// DB TimeZone = UTC. 일자 절단은 반드시 KST 시프트. (스케줄러 kstDay() 와 동일 규약)
function kstDayString(d) {
  const t = new Date(d).getTime() + 9 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}
// KST 날짜(YYYY-MM-DD)의 00:00 KST 를 UTC ISO 로
function kstDayStartUtcIso(ymd) {
  return new Date(new Date(`${ymd}T00:00:00.000Z`).getTime() - 9 * 3600 * 1000).toISOString();
}
function kstDayEndUtcIso(ymd) {
  return new Date(new Date(`${ymd}T00:00:00.000Z`).getTime() - 9 * 3600 * 1000 + 24 * 3600 * 1000).toISOString();
}

function cutoffIso() {
  const raw = (process.env.OBSERVER_AUTO_START || '2026-09-06').trim();
  return kstDayStartUtcIso(raw.slice(0, 10));
}

// 변화 판정 — 미노출↔노출은 숫자 증감으로 계산하지 않는다. (선장 Gate 실증 항목)
function calcDelta(row) {
  if (!row.has_prev) return { kind: 'first', value: null };
  const prev = row.prev_rank;
  const cur = row.current_rank;
  if (prev == null && cur == null) return { kind: 'none_hold', value: null };
  if (prev == null && cur != null) return { kind: 'entered', value: null };
  if (prev != null && cur == null) return { kind: 'dropped_out', value: null };
  const diff = prev - cur; // 양수 = 순위 상승
  if (diff === 0) return { kind: 'flat', value: 0 };
  return { kind: diff > 0 ? 'up' : 'down', value: diff };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const guard = await requireRole(req, res, ROLES.ADMIN);
  if (!guard) return;

  const q = req.query || {};
  const industry = q.industry ? String(q.industry) : '';
  const status = q.status ? String(q.status) : '';
  const kw = q.q ? String(q.q).trim() : '';
  const from = q.from ? String(q.from).slice(0, 10) : '';
  const to = q.to ? String(q.to).slice(0, 10) : '';
  const includeLegacy = q.include_legacy === '1';

  const sort = SORTABLE.has(String(q.sort)) ? String(q.sort) : 'last_observed_at';
  const dir = String(q.dir) === 'asc' ? 'asc' : 'desc';

  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const size = Math.min(SIZE_MAX, Math.max(1, parseInt(q.size, 10) || 50));
  const fromIdx = (page - 1) * size;
  const toIdx = fromIdx + size - 1;

  const cutoff = cutoffIso();
  const todayKst = kstDayString(Date.now());

  try {
    // ── ① 요약 — 오늘(KST) 자동관측분만. 분모도 오늘 실제 관측된 글. (선장 확정 ①-a)
    //    survival_log 원본을 직접 읽는다. 하루치라 행 수가 작다.
    const todayStart = kstDayStartUtcIso(todayKst);
    const todayEnd = kstDayEndUtcIso(todayKst);

    const { data: todayRows, error: tErr } = await supabaseAdmin
      .from('survival_log')
      .select('publish_id, observed_at, rel_rank, id')
      .gte('observed_at', todayStart)
      .lt('observed_at', todayEnd)
      .order('observed_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(TODAY_ROW_CAP);
    if (tErr) throw tErr;

    // 글별 "오늘의 최신 관측" 1건으로 접는다. 원본 행은 그대로 남아 있다(삭제·병합 아님).
    const latestToday = new Map();
    for (const r of todayRows || []) latestToday.set(r.publish_id, r); // 오름차순이므로 마지막이 최신

    let top10 = 0, top30 = 0, none = 0;
    for (const r of latestToday.values()) {
      const rk = r.rel_rank;
      if (rk == null || rk > 30) none += 1;
      else {
        top30 += 1;
        if (rk <= 10) top10 += 1;
      }
    }
    const observedToday = latestToday.size;
    const summary = {
      kst_date: todayKst,
      observed_today: observedToday,
      top10,
      top30,                       // 1~30위 전체 (top10 포함)
      not_exposed: none,
      top10_rate: observedToday > 0 ? Math.round((top10 / observedToday) * 1000) / 10 : null,
      row_cap_hit: (todayRows || []).length >= TODAY_ROW_CAP,
    };

    // ── ② 목록 — View + range 페이지네이션. 전량 로딩 금지.
    let sel = supabaseAdmin
      .from(VIEW)
      .select(
        'publish_id, obs_count, first_observed_at, last_observed_at, first_rank, current_rank, prev_rank, has_prev, best_rank, last_alive_at, current_is_alive, survival_days, exposure_state, industry, cluster, core_keyword, title, region, treatment_name, published_at, naver_post_url',
        { count: 'exact' }
      )
      .is('deleted_at', null);

    if (!includeLegacy) sel = sel.gte('published_at', cutoff);
    if (industry) sel = sel.eq('industry', industry);
    if (kw) sel = sel.ilike('core_keyword', `%${kw}%`);
    if (from) sel = sel.gte('last_observed_at', kstDayStartUtcIso(from));
    if (to) sel = sel.lt('last_observed_at', kstDayEndUtcIso(to));

    if (status === 'top10') sel = sel.eq('exposure_state', 'top10');
    else if (status === 'top30') sel = sel.in('exposure_state', ['top10', 'top11_30']);
    else if (status === 'none') sel = sel.in('exposure_state', ['none', 'over30']);

    // null 순위가 정렬 상단을 먹지 않도록 nullsFirst 명시
    sel = sel.order(sort, { ascending: dir === 'asc', nullsFirst: false }).range(fromIdx, toIdx);

    const { data: rows, count, error: lErr } = await sel;
    if (lErr) throw lErr;

    const out = (rows || []).map((r) => ({
      publish_id: r.publish_id,
      // 검색어 = core_keyword 만. NULL 은 대체하지 않고 null 로 내보낸다(화면에서 '—').
      core_keyword: r.core_keyword || null,
      industry: r.industry || null,
      cluster: r.cluster || null,
      title: r.title || null,
      region: r.region || null,
      treatment_name: r.treatment_name || null,
      published_at: r.published_at,
      naver_post_url: r.naver_post_url || null,
      first_rank: r.first_rank,
      current_rank: r.current_rank,
      best_rank: r.best_rank,
      delta: calcDelta(r),
      survival_days: r.survival_days,          // null → '—'
      first_observed_at: r.first_observed_at,
      last_observed_at: r.last_observed_at,
      obs_count: r.obs_count,
      current_is_alive: r.current_is_alive,
      exposure_state: r.exposure_state,
    }));

    return res.status(200).json({
      ok: true,
      summary,
      rows: out,
      page: { page, size, total: count ?? null },
      meta: {
        source: 'survival_log',            // 자동 SoT 명시. publish_metrics 미사용.
        cutoff,
        include_legacy: includeLegacy,
        sort,
        dir,
      },
    });
  } catch (e) {
    console.error('[auto-observe] ', e);
    return res.status(500).json({ ok: false, error: 'INTERNAL', detail: String(e?.message || e) });
  }
}
