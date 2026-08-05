// pages/api/admin/observations-export.js
// v0.1 (세션86) — 신규. 파일 자체가 부재해 CSV 버튼이 404 였다(세션84 미기록 · 세션85 발견).
//
// 범위: CSV Export 단일. XLSX / PDF / 통계 리포트 / ZIP / 메일 전송은 이번 범위 밖.
//
// 설계 기준
//   · 화면과 같은 것을 내려준다 — 필터(status/q/industry/from/to/sort)를 publish-list 와 동일 규칙으로 처리.
//     Export 만 다른 기준을 쓰면 「화면 20건, 파일 340건」이 되어 백업본을 신뢰할 수 없다.
//   · 페이지네이션은 적용하지 않는다. 화면은 표시 단위가 있지만 백업은 필터 결과 전량이다.
//   · 읽기 전용. 스키마 무변경(ALTER 0). 엔진 무접촉.
//   · Queue 축(queue_state/queue_reason/next_due_at)도 함께 내린다 — ORBIT 단계에서 같은 API 를 쓴다.
//   · 삭제 행(deleted_at)은 제외. 목록과 같은 기준이다.
//   · UTF-8 BOM 선두 — 없으면 엑셀에서 한글이 깨진다.
//
// 응답: text/csv; charset=utf-8 · Content-Disposition attachment
//   파일명 observations_YYYY-MM-DD.csv (프런트가 자체 파일명을 쓰더라도 서버가 정본을 준다)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

const PAGE = 1000;
const HARD_CAP = 200000;
async function fetchAll(builder) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await builder().range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data || [];
    out.push(...batch);
    if (batch.length < PAGE) break;
    if (out.length >= HARD_CAP) break;
  }
  return out;
}

const hasUrl = (r) => !!String(r?.naver_post_url || '').trim();

// Queue 규칙 — publish-list.js v0.9 와 동일. 두 곳이 어긋나면 화면과 파일이 달라진다.
const DAY = 864e5;
const STEPS = [1, 2, 5, 7];
const QUEUE_WINDOW = 30;
const MISS_CLOSE = 3;                 // 관측 종료 ① 미노출 연속 회차
const MISS_MIN_DAYS = 7;              // 관측 종료 ② 발행 후 최소 경과일 (①과 AND)
const dayOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const stepIndex = (e) => (e < 1 ? 0 : e <= 7 ? 1 : e <= 30 ? 2 : 3);

const STATUSES = new Set(['all', 'published', 'draft', 'observed', 'unobserved', 'user_only', 'rank_out', 'due']);

// CSV 이스케이프 — 제목에 쉼표·따옴표·줄바꿈이 실제로 들어온다.
//   선행 =, +, -, @ 는 엑셀이 수식으로 해석하므로 앞에 작은따옴표를 붙인다(CSV injection 방어).
function cell(v) {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const COLUMNS = [
  ['id', (r) => r.id],
  ['title', (r) => r.title],
  ['industry', (r) => r.industry],
  ['region', (r) => r.region],
  ['treatment', (r) => r.treatment_name],
  ['url', (r) => r.naver_post_url],
  ['publish_status', (r) => r.publish_status],
  ['created_at', (r) => r.created_at],
  ['published_at', (r) => r.published_at],
  ['survival_days', (r) => r.survival_days],
  ['alive_status', (r) => r.alive_status],
  ['observed_rank', (r) => r.observed_rank],
  ['observed_keyword', (r) => r.observed_keyword],
  ['view_ok', (r) => r.view_ok],
  ['related_ok', (r) => r.related_ok],
  ['latest_observed_at', (r) => r.latest_observed_at],
  ['admin_obs_count', (r) => r.observation_count],
  ['user_rank_count', (r) => r.user_rank_count],
  ['user_latest_rank', (r) => r.user_latest_rank],
  ['user_latest_at', (r) => r.user_latest_at],
  ['queue_state', (r) => r.queue_state],
  ['queue_reason', (r) => r.queue_reason],
  ['next_due_at', (r) => r.next_due_at],
  ['overdue_days', (r) => r.overdue_days],
  ['miss_streak', (r) => r.miss_streak],
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const qp = req.query || {};

    const posts = await fetchAll(() =>
      supabaseAdmin
        .from('publish_history')
        .select(`
          id, title, industry, region, treatment_name,
          naver_post_url, publish_status, source_post_id,
          created_at, published_at, deleted_at
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    );

    const obs = await fetchAll(() =>
      supabaseAdmin
        .from('publish_metrics')
        .select('publish_id, observed_date, alive_status, observed_rank, observed_keyword, created_at, view_ok, related_ok')
        .order('observed_date', { ascending: false })
        .order('created_at', { ascending: false })
    );

    const uobs = await fetchAll(() =>
      supabaseAdmin
        .from('post_ranks')
        .select('post_id, keyword, rank, checked_at, created_at')
        .order('checked_at', { ascending: false })
        .order('created_at', { ascending: false })
    );

    const countMap = {}, latestMap = {}, prevMap = {};
    for (const o of obs) {
      const pid = o.publish_id;
      countMap[pid] = (countMap[pid] || 0) + 1;
      if (!latestMap[pid]) latestMap[pid] = o;
      else if (!prevMap[pid]) prevMap[pid] = o;
    }
    // 미노출 연속 회차 — publish-list 와 동일 규칙. 두 곳이 어긋나면 화면과 파일이 달라진다.
    const missStreak = {}, streakSealed = {};
    for (const o of obs) {
      const pid = o.publish_id;
      if (streakSealed[pid]) continue;
      if (o.alive_status === 'fossil') missStreak[pid] = (missStreak[pid] || 0) + 1;
      else streakSealed[pid] = true;
    }

    const userCountMap = {}, userLatestMap = {};
    for (const u of uobs) {
      const pid = String(u.post_id);
      userCountMap[pid] = (userCountMap[pid] || 0) + 1;
      if (!userLatestMap[pid]) userLatestMap[pid] = u;
    }

    // baseline 흡수 — 목록과 동일. 글 1건이 2행으로 나가지 않는다.
    const absorbed = new Set();
    for (const r of posts) if (r.source_post_id) absorbed.add(r.source_post_id);

    const NOW = Date.now();
    const TODAY = dayOf(NOW);

    const merged = posts.filter((r) => !absorbed.has(r.id)).map((r) => {
      const src = r.source_post_id || null;
      const m = latestMap[r.id] || (src ? latestMap[src] : null) || null;
      const cnt = (countMap[r.id] || 0) + (src ? countMap[src] || 0 : 0);
      const uKey = String(r.id);
      const uSrcKey = src != null ? String(src) : null;
      const uCnt = (userCountMap[uKey] || 0) + (uSrcKey ? userCountMap[uSrcKey] || 0 : 0);
      const um = userLatestMap[uKey] || (uSrcKey ? userLatestMap[uSrcKey] : null) || null;
      const prv = (prevMap[r.id] || (src ? prevMap[src] : null) || null)?.observed_rank ?? null;

      const row = {
        ...r,
        observation_count: cnt,
        user_rank_count: uCnt,
        obs_total: cnt + uCnt,
        alive_status: m?.alive_status || null,
        latest_observed_at: m?.observed_date || null,
        observed_rank: m?.observed_rank ?? null,
        observed_keyword: m?.observed_keyword || null,
        view_ok: m?.view_ok ?? null,
        related_ok: m?.related_ok ?? null,
        user_latest_rank: um?.rank ?? null,
        user_latest_at: um?.checked_at || null,
        queue_state: null,
        queue_reason: null,
        next_due_at: null,
        overdue_days: 0,
        survival_days: null,
        miss_streak: (missStreak[r.id] != null ? missStreak[r.id] : (src ? missStreak[src] : 0)) || 0,
      };

      const pubAt = r.published_at || r.created_at;
      if (hasUrl(r) && pubAt) {
        row.survival_days = Math.floor((NOW - new Date(pubAt).getTime()) / DAY);
        const elapsed = (NOW - new Date(pubAt).getTime()) / DAY;
        // 미노출 연속 3회 「그리고」 발행 후 7일 경과 — 둘 다 충족할 때만 종료.
        if (row.miss_streak >= MISS_CLOSE && elapsed >= MISS_MIN_DAYS) row.queue_state = 'closed';
        else if (elapsed > QUEUE_WINDOW) row.queue_state = 'archived';
        else {
          let si = stepIndex(elapsed);
          const jump = typeof row.observed_rank === 'number' && typeof prv === 'number'
            && Math.abs(row.observed_rank - prv) >= 10;
          if (jump) si = Math.max(0, si - 1);
          const lastObs = row.latest_observed_at ? new Date(row.latest_observed_at).getTime() : null;
          const base = lastObs != null ? lastObs : new Date(pubAt).getTime();
          const due = dayOf(base) + STEPS[si] * DAY;
          row.next_due_at = new Date(due).toISOString().slice(0, 10);
          if (lastObs != null && dayOf(lastObs) === TODAY) row.queue_state = 'done';
          else if (due < TODAY) { row.queue_state = 'overdue'; row.overdue_days = Math.round((TODAY - due) / DAY); }
          else if (due <= TODAY) row.queue_state = 'due';
          else row.queue_state = 'pending';

          if (row.queue_state === 'overdue') row.queue_reason = 'OVERDUE';
          else if (jump) row.queue_reason = 'RECHECK';
          else if (row.obs_total === 0) row.queue_reason = 'NEW';
          else row.queue_reason = 'SCHEDULE';
        }
      }
      return row;
    });

    // 필터 — publish-list 와 같은 규칙. 페이지 분할만 없다.
    const status = STATUSES.has(qp.status) ? qp.status : 'all';
    const kw = String(qp.q || '').trim().toLowerCase();
    const industry = String(qp.industry || '').trim();
    const from = qp.from ? new Date(qp.from).getTime() : null;
    const to = qp.to ? new Date(qp.to).getTime() + DAY - 1 : null;

    const filtered = merged.filter((r) => {
      if (status === 'published' && !hasUrl(r)) return false;
      if (status === 'draft' && hasUrl(r)) return false;
      if (status === 'observed' && r.obs_total === 0) return false;
      if (status === 'unobserved' && r.obs_total > 0) return false;
      if (status === 'user_only' && !(r.user_rank_count > 0 && r.observation_count === 0)) return false;
      if (status === 'due' && !(r.queue_state === 'due' || r.queue_state === 'overdue')) return false;
      if (status === 'rank_out') {
        const seen = r.observation_count > 0 || r.user_rank_count > 0;
        const val = r.observation_count > 0 ? r.observed_rank : r.user_latest_rank;
        if (!seen || val != null) return false;
      }
      if (industry && r.industry !== industry) return false;
      if (kw) {
        const hay = `${r.title || ''} ${r.industry || ''} ${r.region || ''} ${r.treatment_name || ''} ${r.observed_keyword || ''} ${r.id}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (from || to) {
        const t = r.created_at ? new Date(r.created_at).getTime() : null;
        if (t == null) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      return true;
    });

    const ts = (v) => (v ? new Date(v).getTime() : 0);
    if (qp.sort === 'queue') {
      const w = (r) => (r.queue_state === 'overdue' ? 0 : r.queue_state === 'due' ? 1 : 2);
      filtered.sort((a, b) => (w(a) - w(b)) || String(a.next_due_at || '9999').localeCompare(String(b.next_due_at || '9999')));
    } else {
      filtered.sort((a, b) => ts(b.created_at) - ts(a.created_at));
    }

    const lines = [COLUMNS.map(([h]) => h).join(',')];
    for (const r of filtered) lines.push(COLUMNS.map(([, f]) => cell(f(r))).join(','));

    // 엑셀 한글 방어 — BOM 은 반드시 선두 1회.
    const csv = '\uFEFF' + lines.join('\r\n') + '\r\n';
    const fname = `observations_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(csv);
  } catch (e) {
    console.error('[observations-export] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
