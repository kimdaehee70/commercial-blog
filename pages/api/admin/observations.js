// pages/api/admin/observations.js
// v0.6 (세션83) — 관측목록 정식화. LIST 분기만 확장. 단건 GET / POST 무변경.
//
// ⚠ 최중요 실측 (세션83): "limit 이 없다"가 "전량"을 뜻하지 않는다.
//   supabase-js(PostgREST)는 요청당 기본 1000행 상한을 건다. v0.5 buildList 는 .limit() 을 쓰지
//   않았지만 publish_history 1595건 중 1000건만 받고 있었다. 즉 DEC-016(관측은 잘리지 않는다)은
//   서버에서 이미 깨져 있었다. range() 루프(fetchAll)로 끝까지 긁어야 성립한다.
//   → 목록 창(400건) 문제를 지적한 세션82의 판단은 옳았으나, 원인은 한 겹 더 아래에 있었다.
//
// 이번 세션 범위 (A안 · One Axis = 목록 완성)
//   ① baseline 흡수 — published.source_post_id 가 가리키는 baseline 행을 목록에서 제거(세션78 규칙 재사용)
//   ② post_ranks 병합 — 세는 것만 합친다. publish_metrics 로 복사하지 않는다 (DEC-006)
//   ③ 서버 페이지네이션 — limit 으로 관측 범위를 자르지 않는다. 전량 읽고 화면만 나눈다 (DEC-016)
//   ④ 필터 / 정렬 — 미관측·사용자관측·순위권밖 / 미관측 오래된 순·순위 하락순
//
// 무접촉 (E-1 Observation Queue 에서 일괄 처리 — 문서05 §3-2/§4)
//   · 단건 GET(snapshot/timeline/user_ranks) · POST(관측 INSERT) · resolveGroupIds · buildSnapshot
//   · observe-quick / observe-batch (별도 파일)
//
// 응답 계약: 기존 { ok, summary, rows, observed_at } 무변경(필드 삭제 없음). page/filters 추가.
// 읽기 전용. 스키마 무변경(ALTER 0). 엔진 무접촉.
//
// ── 이전 이력 ────────────────────────────────────────────────────────────
// v0.5 (세션81) — 발행 그룹 조회 + 사용자 순위(post_ranks) 병행 반환
// - 문제: 상세 Timeline 이 'no observations'인데 사용자는 순위를 등록해 둔 상태였다.
//   실측 원인 = 저장 대상 행이 다르다.
//     · 관리자 publish_metrics → published 행 (예: 1599)
//     · 사용자 post_ranks      → baseline  행 (예: 1598)
//   같은 글인데 서로 다른 행을 보고 있어 애초에 만나지 못하는 구조였다. 병합 로직 유실이 아니다.
// - 해결: 조회 단위를 '행' → '발행 그룹(baseline+published)'으로 확장.
//   연결키는 published.source_post_id (세션78 publish-list.js 와 동일 규칙. 제목 병합 아님).
// - post_ranks 는 publish_metrics 로 복사하지 않는다. 두 테이블 각자 SoT 유지(DEC-006).
// - ⚠ 실측(세션81): published 117건 중 source_post_id 없음 57건. 그룹 해석 불가 → 단일 행 처리.
//   추측 연결 금지. backfill 은 별도 축으로 이월.
// 116차 v0.4: 본체 유실 복구. GET ?publish_id= → { ok, snapshot, timeline } / POST → { ok, snapshot }
//   가드: Bearer + role>=admin (ADMIN-RBAC-02). 모든 응답 JSON(HTML 누출 금지). 테이블: publish_metrics(+publish_history)
// 55차 v0.2 / 48차 v0.1 = 구 LIST 보드 (세대 불일치로 폐기)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireRole } from '../../../lib/guards';
import { ROLES } from '../../../lib/constants';

// ── [세션83] 전량 조회 헬퍼 ──────────────────────────────────────────────
// PostgREST 기본 상한(1000행)을 range 루프로 넘긴다. builder 는 매 호출 새 인스턴스를 반환해야 한다
// (쿼리 빌더는 재사용 시 range 가 누적되므로 () => supabaseAdmin.from(...) 형태로 넘길 것).
const PAGE = 1000;
const HARD_CAP = 200000; // 무한루프 방어. 도달 시 로그만 남기고 중단.
async function fetchAll(builder) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await builder().range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = data || [];
    out.push(...batch);
    if (batch.length < PAGE) break;
    if (out.length >= HARD_CAP) {
      console.warn('[observations:fetchAll] HARD_CAP reached', out.length);
      break;
    }
  }
  return out;
}

// ── [세션81] 발행 그룹 해석 ──────────────────────────────────────────────
// publish_history 는 글 1건을 2행으로 남긴다: baseline(생성) → published(URL 등록).
// 연결키 = published.source_post_id → baseline.id (세션78 publish-list.js 와 동일 규칙).
// 관측이 어느 쪽 행에 붙었는지는 입력 주체마다 다르다:
//   · 관리자 publish_metrics → published 행
//   · 사용자 post_ranks      → baseline 행   ← 이것 때문에 상세 Timeline 에 사용자 입력이 안 보였다
// 따라서 상세 조회는 '행 1개'가 아니라 '그룹 전체'를 본다.
async function resolveGroupIds(publishId) {
  const pid = Number(publishId);
  const ids = new Set();
  if (Number.isFinite(pid)) ids.add(pid);

  // ① 자기 행 → 부모(baseline) 방향
  const { data: self, error: sErr } = await supabaseAdmin
    .from('publish_history')
    .select('id, source_post_id')
    .eq('id', publishId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (self?.source_post_id) ids.add(self.source_post_id);

  // ② 자기 행 → 자식(published) 방향. baseline id 로 들어온 경우.
  const { data: children, error: cErr } = await supabaseAdmin
    .from('publish_history')
    .select('id')
    .eq('source_post_id', publishId);
  if (cErr) throw cErr;
  for (const c of children || []) ids.add(c.id);

  return Array.from(ids);
}

// post_ranks(사용자 SoT) 한 행 → timeline 과 같은 형태로 변환.
//   ※ publish_metrics 로 복사하지 않는다. 두 테이블은 각자 SoT 로 남는다(DEC-006).
//   ※ post_ranks.post_id 는 text 컬럼 → 조회 시 문자열로 넘긴다.
function toUserRankRow(r) {
  return {
    source: 'user',
    id: `u${r.id}`,
    recorded_at: r.created_at || null,
    observed_date: r.checked_at || null,
    observed_rank: typeof r.rank === 'number' ? r.rank : null,
    observed_keyword: r.keyword || null,
    keyword_rank_type: r.basis || null,
    auth_user_id: r.auth_user_id || null,
    post_id: r.post_id || null,
  };
}

// publish_metrics 한 행 → 프론트 timeline 행 형태로 변환
function toTimelineRow(m) {
  return {
    source: 'admin',
    id: m.id,
    check_cycle: m.check_cycle || null,
    recorded_at: m.created_at || m.observed_date || null,
    observed_date: m.observed_date || null,
    view_ok: m.view_ok,
    related_ok: m.related_ok,
    recent_ok: m.recent_ok,
    thumbnail_ok: m.thumbnail_ok,
    observed_rank: m.observed_rank ?? null,
    rank_detail: m.rank_detail || null,
    latest_rank_note: m.latest_rank_note || null,
    memo: m.memo || null,
    alive_status: m.alive_status || null,
    keyword_rank_type: m.keyword_rank_type || null,
    observed_keyword: m.observed_keyword || null,
    days_since_publish: m.days_since_publish ?? null,
  };
}

// publish_history(1행) + 관측들(desc) → snapshot 집계
function buildSnapshot(post, metricsDesc) {
  const latest = metricsDesc[0] || null;
  const oldest = metricsDesc.length ? metricsDesc[metricsDesc.length - 1] : null;

  const firstSeenAt = oldest ? (oldest.created_at || oldest.observed_date) : null;
  const aliveRows = metricsDesc.filter((m) => m.alive_status === 'alive');
  const latestAliveAt = aliveRows.length
    ? (aliveRows[0].created_at || aliveRows[0].observed_date)
    : null;

  let survivalHours = null;
  if (firstSeenAt && latestAliveAt) {
    const diffMs = new Date(latestAliveAt).getTime() - new Date(firstSeenAt).getTime();
    if (Number.isFinite(diffMs) && diffMs >= 0) {
      survivalHours = Math.round(diffMs / 36e5);
    }
  }

  return {
    status: post?.publish_status ?? null,
    published_at: post?.published_at || post?.created_at || null,
    created_at: post?.created_at || null,
    first_seen_at: firstSeenAt,
    latest_alive_at: latestAliveAt,
    // [세션86] 관측일 기준 축 추가 — latest_alive_at 은 alive 회차가 없으면 null 이라
    //   「관측했는데 화면은 비어 있는」 상태가 된다. 생존 판정과 관측 시점은 다른 축이다.
    first_observed_at: oldest ? (oldest.observed_date || oldest.created_at) : null,
    latest_observed_at: latest ? (latest.observed_date || latest.created_at) : null,
    survival_hours: survivalHours,
    latest_alive_status: latest?.alive_status || null,
    // [세션84] 저장 직후 목록 대표순위 동기화 — 프런트가 snapshot 을 그대로 덮어쓰므로
    //   이 키가 없으면 observation_count 만 오르고 순위는 이전 값(null)에 머문다 → "밖" 오표시.
    observed_rank: latest?.observed_rank ?? null,
  };
}

// ============ LIST: 관측목록 ============
// 전량 조회 → 그룹 병합 → 필터/정렬 → 화면 페이지 분할.
// limit 은 표시 수단일 뿐이며 관측 범위를 정의하지 않는다 (DEC-016).
const SORTS = new Set(['recent', 'observed_recent', 'unobserved_old', 'rank_desc', 'rank_asc']);
const STATUSES = new Set(['all', 'unobserved', 'observed', 'admin_only', 'user_only', 'rank_out', 'alive', 'fossil']);

async function buildList(q = {}) {
  // 1) 발행 전체 (운영자는 모든 글을 보고 관측)
  const posts = await fetchAll(() =>
    supabaseAdmin
      .from('publish_history')
      .select('id, title, industry, region, treatment_name, core_keyword, cluster, naver_post_url, source_post_id, created_at, published_at, publish_status')
      .order('created_at', { ascending: false })
  );

  // 2) 관리자 관측 전체 (최신순). 글별 최신 1건 + 건수 매핑용.
  const metrics = await fetchAll(() =>
    supabaseAdmin
      .from('publish_metrics')
      .select('id, publish_id, observed_date, created_at, days_since_publish, keyword_rank_type, observed_rank, observed_keyword, alive_status, fossil_observed')
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false })
  );

  // 3) 사용자 순위등록 전체. 별도 SoT — 합치지 않고 각각 센 뒤 화면에서만 통합(DEC-006).
  const uranks = await fetchAll(() =>
    supabaseAdmin
      .from('post_ranks')
      .select('id, post_id, keyword, rank, checked_at, basis, created_at')
      .order('checked_at', { ascending: false })
      .order('created_at', { ascending: false })
  );

  // publish_id별 최신 1건 + 건수 (이미 desc 정렬 → 첫 등장이 최신)
  const latestByPid = new Map();
  const countByPid = new Map();
  for (const m of metrics) {
    if (!latestByPid.has(m.publish_id)) latestByPid.set(m.publish_id, m);
    countByPid.set(m.publish_id, (countByPid.get(m.publish_id) || 0) + 1);
  }

  // post_ranks.post_id 는 text → 문자열 키로 센다.
  const uLatestByPid = new Map();
  const uCountByPid = new Map();
  for (const u of uranks) {
    const k = String(u.post_id);
    if (!uLatestByPid.has(k)) uLatestByPid.set(k, u);
    uCountByPid.set(k, (uCountByPid.get(k) || 0) + 1);
  }

  // 4) baseline 흡수 — published.source_post_id 가 가리키는 baseline 행은 목록에서 제거.
  //    짝 없는 baseline 은 잔류(생성만 하고 발행 안 한 글의 추적을 잃지 않는다).
  const absorbed = new Set();
  for (const p of posts) if (p.source_post_id) absorbed.add(p.source_post_id);

  const merged = posts
    .filter((p) => !absorbed.has(p.id))
    .map((p) => {
      const src = p.source_post_id || null;
      const m = latestByPid.get(p.id) || (src ? latestByPid.get(src) : null) || null;
      const aCnt = (countByPid.get(p.id) || 0) + (src ? countByPid.get(src) || 0 : 0);

      const uKey = String(p.id);
      const uSrcKey = src != null ? String(src) : null;
      const um = uLatestByPid.get(uKey) || (uSrcKey ? uLatestByPid.get(uSrcKey) : null) || null;
      const uCnt = (uCountByPid.get(uKey) || 0) + (uSrcKey ? uCountByPid.get(uSrcKey) || 0 : 0);

      // 대표순위 3단계 (목록 한정 · 세션82 정책 동일)
      //   관리자 관측이 있으면 그 값이 대표. 없을 때만 사용자값으로 대신한다.
      //   두 축을 평균내거나 섞지 않는다(DEC-006). 관측했으나 순위 없음 = rep_out(=「밖」).
      let repRank = null, repSource = null, repOut = false;
      if (aCnt > 0) {
        repSource = 'admin';
        if (typeof m?.observed_rank === 'number') repRank = m.observed_rank;
        else repOut = true;
      } else if (uCnt > 0) {
        repSource = 'user';
        if (typeof um?.rank === 'number') repRank = um.rank;
        else repOut = true;
      }

      return {
        // ── 기존 계약 (프론트 무수정 호환) ──
        publish_id: p.id,
        title: p.title || null,
        status: p.publish_status ?? null,
        alive_status: m?.alive_status || null,
        observed_rank: m?.observed_rank ?? null,
        observed_keyword: m?.observed_keyword || um?.keyword || null,
        keyword_rank_type: m?.keyword_rank_type || null,
        days_since_publish: m?.days_since_publish ?? null,
        fossil_observed: m?.fossil_observed || null,
        latest_observed_at: m ? (m.created_at || m.observed_date) : null,
        // ── 세션83 신규 ──
        group_ids: src ? [p.id, src] : [p.id],
        industry: p.industry || null,
        region: p.region || null,
        naver_post_url: p.naver_post_url || null,
        treatment_name: p.treatment_name || null,   // [세션84] 관측 패널 검색어 조립용(region+treatment_name)
        created_at: p.created_at || null,
        published_at: p.published_at || null,
        obs_admin_count: aCnt,
        obs_user_count: uCnt,
        obs_total: aCnt + uCnt,
        user_latest_rank: typeof um?.rank === 'number' ? um.rank : null,
        user_latest_keyword: um?.keyword || null,
        user_latest_at: um?.checked_at || null,
        rep_rank: repRank,
        rep_source: repSource,
        rep_out: repOut,
      };
    });

  // 5) summary — 병합 후 전체 기준(필터 무관). 화면 상단 KPI 계약 무변경.
  let observedCount = 0, aliveCount = 0, fossilCount = 0;
  for (const r of merged) {
    if (r.obs_total > 0) observedCount += 1;
    if (r.alive_status === 'alive') aliveCount += 1;
    else if (r.alive_status === 'fossil') fossilCount += 1;
  }
  const summary = {
    total_posts: merged.length,
    observed_count: observedCount,
    alive_count: aliveCount,
    fossil_count: fossilCount,
    unobserved_count: merged.length - observedCount,
  };

  // 6) 필터
  const status = STATUSES.has(q.status) ? q.status : 'all';
  const kw = (q.q || '').trim().toLowerCase();
  const industry = (q.industry || '').trim();
  const from = q.from ? new Date(q.from).getTime() : null;
  const to = q.to ? new Date(q.to).getTime() + 864e5 - 1 : null;

  const filtered = merged.filter((r) => {
    if (status === 'unobserved' && r.obs_total > 0) return false;
    if (status === 'observed' && r.obs_total === 0) return false;
    if (status === 'admin_only' && r.obs_admin_count === 0) return false;
    if (status === 'user_only' && !(r.obs_user_count > 0 && r.obs_admin_count === 0)) return false;
    if (status === 'rank_out' && !r.rep_out) return false;
    if (status === 'alive' && r.alive_status !== 'alive') return false;
    if (status === 'fossil' && r.alive_status !== 'fossil') return false;
    if (industry && r.industry !== industry) return false;
    if (kw) {
      const hay = `${r.title || ''} ${r.observed_keyword || ''} ${r.region || ''} ${r.industry || ''} ${r.publish_id}`.toLowerCase();
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

  // 7) 정렬
  const sort = SORTS.has(q.sort) ? q.sort : 'recent';
  const ts = (v) => (v ? new Date(v).getTime() : 0);
  const cmp = {
    // 최근 발행순 (기존 동작)
    recent: (a, b) => ts(b.created_at) - ts(a.created_at),
    // 최근 관측순 — 관측된 것부터, 최신 관측이 위로
    observed_recent: (a, b) => ts(b.latest_observed_at) - ts(a.latest_observed_at),
    // 미관측 오래된 순 — 관측이 밀린 것부터. 관측 부하 해소용.
    unobserved_old: (a, b) => {
      if ((a.obs_total === 0) !== (b.obs_total === 0)) return a.obs_total === 0 ? -1 : 1;
      return ts(a.latest_observed_at || a.created_at) - ts(b.latest_observed_at || b.created_at);
    },
    // 순위 하락순 — 큰 숫자(하위)가 위로. 미관측은 항상 뒤로.
    rank_desc: (a, b) => {
      const av = a.rep_rank, bv = b.rep_rank;
      if (av == null && bv == null) return ts(b.created_at) - ts(a.created_at);
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    },
    // 상위순
    rank_asc: (a, b) => {
      const av = a.rep_rank, bv = b.rep_rank;
      if (av == null && bv == null) return ts(b.created_at) - ts(a.created_at);
      if (av == null) return 1;
      if (bv == null) return -1;
      return av - bv;
    },
  }[sort];
  filtered.sort(cmp);

  // 8) 페이지 분할 — 관측 범위를 자르는 것이 아니라 화면만 나눈다.
  const size = Math.min(Math.max(parseInt(q.size, 10) || 50, 10), 200);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const page = Math.min(Math.max(parseInt(q.page, 10) || 1, 1), totalPages);
  const start = (page - 1) * size;
  const rows = filtered.slice(start, start + size);

  // 필터 UI용 업종 목록 (병합 후 실제 존재하는 값만)
  const industries = Array.from(new Set(merged.map((r) => r.industry).filter(Boolean))).sort();

  return {
    summary,
    rows,
    observed_at: new Date().toISOString(),
    page: { page, size, total: filtered.length, total_pages: totalPages },
    filters: { status, sort, q: q.q || '', industry, from: q.from || '', to: q.to || '' },
    industries,
    scope: { source_rows: posts.length, merged_rows: merged.length, absorbed: absorbed.size },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- [ADMIN-RBAC-02] RBAC 가드 (Bearer + accounts.role >= admin) ---
  const guard = await requireRole(req, res, ROLES.ADMIN);
  if (!guard) return;

  // ============ GET ============
  if (req.method === 'GET') {
    const publishId = req.query.publish_id;

    // publish_id 없음 → 관측목록(LIST).
    if (!publishId) {
      try {
        const list = await buildList(req.query || {});
        return res.status(200).json({ ok: true, ...list });
      } catch (e) {
        console.error('[observations:LIST] error:', e);
        return res.status(500).json({ ok: false, error: 'OBSERVATIONS_LIST_FAILED', detail: e.message });
      }
    }

    // publish_id 있음 → 단건 snapshot + timeline (세션81 v0.5 무변경)
    try {
      const groupIds = await resolveGroupIds(publishId);

      const { data: post, error: pErr } = await supabaseAdmin
        .from('publish_history')
        .select('id, title, account_id, created_at, published_at, publish_status, source_post_id')
        .eq('id', publishId)
        .maybeSingle();
      if (pErr) throw pErr;

      const { data: metrics, error: mErr } = await supabaseAdmin
        .from('publish_metrics')
        .select('id, publish_id, observed_date, created_at, days_since_publish, keyword_rank_type, observed_rank, observed_keyword, alive_status, exposure_note, ai_smell_note, fossil_observed, fossil_note, check_cycle, view_ok, related_ok, recent_ok, thumbnail_ok, latest_rank_note, memo, rank_detail')
        .in('publish_id', groupIds)
        .order('observed_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (mErr) throw mErr;

      const { data: uranks, error: uErr } = await supabaseAdmin
        .from('post_ranks')
        .select('id, post_id, auth_user_id, keyword, rank, checked_at, basis, created_at')
        .in('post_id', groupIds.map(String))
        .order('created_at', { ascending: false });
      if (uErr) throw uErr;

      const metricsDesc = metrics || [];
      const timeline = metricsDesc.map(toTimelineRow);
      const snapshot = buildSnapshot(post, metricsDesc);
      const userRanks = (uranks || []).map(toUserRankRow);

      return res.status(200).json({
        ok: true,
        snapshot,
        timeline,
        user_ranks: userRanks,
        group_ids: groupIds,
      });
    } catch (e) {
      console.error('[observations:GET] error:', e);
      return res.status(500).json({ ok: false, error: 'OBSERVATIONS_GET_FAILED', detail: e.message });
    }
  }

  // ============ POST: 관측 INSERT ============ (세션81 무변경)
  try {
    const b = req.body || {};
    const publishId = b.publish_id;
    if (!publishId) {
      return res.status(400).json({ ok: false, error: 'BAD_REQUEST', detail: 'publish_id_required' });
    }

    let daysSincePublish = null;
    const { data: post, error: pErr } = await supabaseAdmin
      .from('publish_history')
      .select('id, title, account_id, created_at, published_at, publish_status')
      .eq('id', publishId)
      .maybeSingle();
    if (pErr) throw pErr;
    const pubDate = post?.published_at || post?.created_at || null;
    if (pubDate) {
      const diffMs = Date.now() - new Date(pubDate).getTime();
      if (Number.isFinite(diffMs) && diffMs >= 0) {
        daysSincePublish = Math.floor(diffMs / 864e5);
      }
    }

    const rd = b.rank_detail && typeof b.rank_detail === 'object' ? b.rank_detail : {};
    const rankDetail = {};
    for (const k of ['core_related', 'core_recent', 'review_related', 'review_recent', 'full_related', 'full_recent']) {
      const v = rd[k];
      const n = typeof v === 'string' ? parseInt(v, 10) : v;
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) rankDetail[k] = n;
    }

    const rankVals = Object.values(rankDetail);
    const observedRank = rankVals.length ? Math.min(...rankVals) : null;

    const insertRow = {
      publish_id: publishId,
      observed_date: new Date().toISOString().slice(0, 10),
      days_since_publish: daysSincePublish,
      observed_keyword: b.observed_keyword || null,
      observed_rank: observedRank,
      alive_status: b.alive_status || null,
      check_cycle: b.check_cycle || null,
      view_ok: typeof b.view_ok === 'boolean' ? b.view_ok : null,
      related_ok: typeof b.related_ok === 'boolean' ? b.related_ok : null,
      recent_ok: typeof b.recent_ok === 'boolean' ? b.recent_ok : null,
      thumbnail_ok: typeof b.thumbnail_ok === 'boolean' ? b.thumbnail_ok : null,
      latest_rank_note: b.latest_rank_note || null,
      memo: b.memo || null,
      rank_detail: Object.keys(rankDetail).length ? rankDetail : null,
    };

    const { error: insErr } = await supabaseAdmin
      .from('publish_metrics')
      .insert(insertRow);
    if (insErr) throw insErr;

    const { data: metrics, error: mErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('id, observed_date, created_at, alive_status, observed_rank')
      .eq('publish_id', publishId)
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    const snapshot = buildSnapshot(post, metrics || []);
    return res.status(200).json({ ok: true, snapshot });
  } catch (e) {
    console.error('[observations:POST] error:', e);
    return res.status(500).json({ ok: false, error: 'OBSERVATIONS_POST_FAILED', detail: e.message });
  }
}
