// pages/api/admin/publish-list.js
// v0.9 (세션86) — Queue starvation 방어. 실측: 큐 20건이 전부 5~6월 테스트 발행분(+55일)이었다.
//   overdue 우선 정렬 + 단일 상한 구조에서는 재고가 큐를 영구 점유해 신규 발행이 관측되지 않는다.
//   ① 운영 창(30일) — 발행 30일 초과분은 일상 Queue 대상에서 제외(archived). 데이터는 닫지 않는다.
//      fossil 자동 종료는 채택하지 않았다. 테스트 발행분도 ORBIT 검증 자료가 될 수 있다.
//   ② 슬롯 분할 — 신규(due) 10 + 지연(overdue) 10. 한쪽이 모자라면 남는 슬롯을 다른 쪽이 쓴다.
//   ③ queue_reason — NEW / SCHEDULE / OVERDUE / RECHECK. 자동수집기(E-3)가 붙어도 동일 Queue 사용.
// v0.8 (세션86) — 관측 Queue(E-1) 파생 계산. DEC-019 준수: Queue 는 저장하지 않는다.
//   published_at + 최근 observed_date + 문서05 §4 주기표 → due / overdue / done / pending / deferred
//   · 신규 컬럼 0개. ALTER 0. 기존 응답 필드 삭제 없음(추가만).
//   · 하루 due 총량 상한 20건(운영 확정) — 초과분은 deferred 로 익일 이월. overdue 우선순위 상향.
//   · closed 는 별도 상태값을 만들지 않고 alive_status='fossil' 로 대체한다.
//   · 자동수집기(E-3)가 붙어도 이 계산식은 그대로다. 입력 주체만 바뀐다(문서05 §5).
// v0.7 (세션85) — Soft Delete 도입. deleted_at IS NULL 필터 1줄 추가.
//   삭제는 행을 지우지 않는다. 관측(publish_metrics·post_ranks)은 그대로 남고 목록에서만 숨는다.
//   축 신설 근거: publish_status 는 CHECK 제약(baseline/generated/published/observed/
//   failed/pending/test)에 묶여 있어 'deleted' 를 넣을 수 없다. 허용값을 늘리면 발행 축에
//   삭제 축이 섞여 「삭제된 published」를 표현할 수 없게 된다. → deleted_at 별도 축(ALTER 1건).
// v0.6 (세션84) — 목록 행에 view_ok/related_ok 전달(노출 상태 표시용). 계약 추가만, 삭제 없음.
// v0.5 (세션83) — 조회 범위 제한 폐기. 전량 조회 + 서버 검색·필터·페이지네이션 (DEC-017)
//
// 배경: 목록이 id 1371에서 끊겼다. 버그가 아니라 `limit(400) → slice(200)` 의 설계 결과였다.
//   그 정책("Publish = 최근 200건")은 관측목록이 없던 시절의 임시 운영 방식이다.
//   DEC-017 로 폐기 — Publish 와 Observation 은 조회 범위가 아니라 책임으로 구분한다.
//     · Publish     = 운영 관리 (URL 등록·발행 상태·재발행·삭제·이력)
//     · Observation = 성과 관리 (순위·관련도·생존·Timeline)
//   두 화면 모두 전체 데이터에 접근한다. 역할은 겹치지 않는다.
//
// ⚠ 실측(세션83): supabase-js/PostgREST 는 요청당 기본 1000행 상한을 건다.
//   `.limit()` 을 지우는 것만으로는 전량이 되지 않는다. range() 루프(fetchAll)가 필요하다.
//   관측목록(observations.js v0.6)에서 먼저 확인된 사실이며 여기서도 동일하게 적용한다.
//
// 전량 렌더 금지 — 조회는 전체, 응답은 페이지 단위. 검색·필터·정렬은 전부 서버 기준.
//   운영자는 스크롤로 찾지 않는다. 페이지네이션은 보조 수단이다.
//
// 응답 계약: 기존 rows 필드 전부 무변경(프론트 RankCell/pickRepRank 계약 유지).
//   page / filters / industries / summary 추가. 기존 필드 삭제 없음.
// 읽기 전용. 스키마 무변경(ALTER 0). 엔진 무접촉.
//
// ── 이전 이력 ────────────────────────────────────────────────────────────
// 세션82 v0.4: 목록 obs 정합 — post_ranks(사용자 관측) 병행 조회
//   - 상세는 관리자1+사용자1=2인데 목록 obs는 1이었다. 이 파일이 post_ranks 를 보지 않은 탓(로직 유실 아님).
//   - 두 SoT 유지(DEC-006). post_ranks 를 publish_metrics 로 복사하지 않는다. 세는 것만 합친다.
//   - post_ranks.post_id 는 text. publish_history.id 는 int → String() 로 맞춰 조회한다.
// 세션78: baseline↔published 1행 병합 (읽기 전용)
//   - publish_history 는 글 1건을 2행으로 남긴다: baseline(생성) → published(URL 등록)
//   - 연결키는 published.source_post_id → baseline.id. 제목 병합 아님
//     (제목은 재발행·동일제목 재생성에서 충돌하므로 키로 쓰면 안 된다)
//   - published 가 있으면 그 짝 baseline 을 목록에서 흡수. 짝 없는 baseline 은 잔류
// 87차: select에 naver_post_url + publish_status 추가
// 86차 v0.3: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// 55차 v0.2: Bearer 토큰 검증 + OWNER_UID 가드
// 48차 v0.1: publish_metrics 단일 spine 통일

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';

// ── 전량 조회 헬퍼 ────────────────────────────────────────────────────────
// builder 는 매 호출 새 쿼리를 반환해야 한다(range 누적 방지).
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
    if (out.length >= HARD_CAP) {
      console.warn('[publish-list:fetchAll] HARD_CAP reached', out.length);
      break;
    }
  }
  return out;
}

// URL 유무가 발행 여부의 truth 다(세션78). publish_status 는 보정 경로에 따라 늦게 붙어 신뢰가 낮다.
const hasUrl = (r) => !!String(r?.naver_post_url || '').trim();

const SORTS = new Set(['recent', 'oldest', 'published_recent', 'obs_recent', 'rank_desc', 'rank_asc', 'queue']);
const STATUSES = new Set(['all', 'published', 'draft', 'observed', 'unobserved', 'user_only', 'rank_out', 'due']);

// ── Queue(E-1) ───────────────────────────────────────────────────────────
// 관측 주기는 데이터의 성질에서 나온다. 관측자의 의지에서 나오지 않는다(문서05 §4).
const DAY = 864e5;
const DUE_LIMIT = 20;                 // 하루 due 총량 상한. 초과분은 익일 이월.
const SLOT_NEW = 10;                  // 신규(due) 슬롯 — 지연 재고가 큐를 독점하는 것을 막는다
const SLOT_OVER = 10;                 // 지연(overdue) 슬롯
const QUEUE_WINDOW = 30;
const MISS_CLOSE = 3;                 // 관측 종료 조건 ① 미노출 연속 회차
const MISS_MIN_DAYS = 7;              // 관측 종료 조건 ② 발행 후 최소 경과일 — ①과 AND 조건              // 운영 Queue 창(일). 초과분은 archived — 조회·분석은 계속 가능
const STEPS = [1, 2, 5, 7];           // 주기 사다리 — 급변 시 1단계 앞당김
const dayOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

function stepIndex(elapsedDays) {
  if (elapsedDays < 1) return 0;      // 24시간 이내 → 익일
  if (elapsedDays <= 7) return 1;     // 1~7일    → 2일 후
  if (elapsedDays <= 30) return 2;    // 8~30일   → 5일 후
  return 3;                           // 30일 초과 → 주 1회
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    const qp = req.query || {};

    // 1. publish_history — 전량. limit 없음(DEC-017).
    const data = await fetchAll(() =>
      supabaseAdmin
        .from('publish_history')
        .select(`
          id, title, industry, region, treatment_name,
          naver_post_url, publish_status, source_post_id,
          created_at, published_at, deleted_at
        `)
        .is('deleted_at', null)   // [세션85] Soft Delete — 삭제 행은 목록에서 숨긴다
        .order('created_at', { ascending: false })
    );

    // 2. publish_metrics — 전량. count + latest 매핑.
    const obs = await fetchAll(() =>
      supabaseAdmin
        .from('publish_metrics')
        .select('publish_id, observed_date, alive_status, observed_rank, observed_keyword, days_since_publish, created_at, rank_detail, view_ok, related_ok')
        .order('observed_date', { ascending: false })
        .order('created_at', { ascending: false })
    );

    const countMap = {};
    const latestMap = {};
    const prevMap = {};   // 직전 회차 — 순위 급변(±10) 판정용. 저장 아님, 계산용.
    for (const o of obs) {
      const pid = o.publish_id;
      countMap[pid] = (countMap[pid] || 0) + 1;
      if (!latestMap[pid]) latestMap[pid] = o;
      else if (!prevMap[pid]) prevMap[pid] = o;
    }

    // 3. post_ranks — 사용자 순위등록(별도 SoT). 합치지 않고 각각 센다(DEC-006).
    //    OWNER 화면이므로 auth_user_id 필터 없음 — 전 계정 관측을 본다(observations.js 와 동일 기준).
    const uobs = await fetchAll(() =>
      supabaseAdmin
        .from('post_ranks')
        .select('post_id, keyword, rank, checked_at, basis, created_at')
        .order('checked_at', { ascending: false })
        .order('created_at', { ascending: false })
    );

    const userCountMap = {};
    const userLatestMap = {};
    for (const u of uobs) {
      const pid = String(u.post_id);
      userCountMap[pid] = (userCountMap[pid] || 0) + 1;
      if (!userLatestMap[pid]) userLatestMap[pid] = u;
    }


    // [세션86] 미노출 연속 회차 — 「1회 미노출 = 소멸」 판정을 막는다.
    //   발행 직후 미노출은 색인 지연일 수 있다. 저장값(fossil)은 그대로 두고 Queue 해석만 완화한다.
    const missStreak = {}, streakSealed = {};
    for (const o of obs) {
      const pid = o.publish_id;
      if (streakSealed[pid]) continue;
      if (o.alive_status === 'fossil') missStreak[pid] = (missStreak[pid] || 0) + 1;
      else streakSealed[pid] = true;
    }

    // 4. baseline 흡수 — published.source_post_id 가 가리키는 baseline 행 제거.
    const absorbed = new Set();
    for (const r of data) if (r.source_post_id) absorbed.add(r.source_post_id);

    // 5. 결합 (관측은 흡수된 baseline 쪽에 붙어 있을 수 있어 양쪽을 합산)
    const merged = data
      .filter((r) => !absorbed.has(r.id))
      .map((r) => {
        const src = r.source_post_id || null;
        const m = latestMap[r.id] || (src ? latestMap[src] : null) || null;
        const cnt = (countMap[r.id] || 0) + (src ? countMap[src] || 0 : 0);

        const uKey = String(r.id);
        const uSrcKey = src != null ? String(src) : null;
        const uCnt = (userCountMap[uKey] || 0) + (uSrcKey ? userCountMap[uSrcKey] || 0 : 0);
        const um = userLatestMap[uKey] || (uSrcKey ? userLatestMap[uSrcKey] : null) || null;

        return {
          ...r,
          observation_count: cnt,
          user_rank_count: uCnt,
          obs_total: cnt + uCnt,
          user_latest_rank: um?.rank ?? null,
          user_latest_keyword: um?.keyword || null,
          user_latest_at: um?.checked_at || null,
          status: m?.alive_status || null,
          latest_observed_at: m?.observed_date || null,
          observed_rank: m?.observed_rank ?? null,
          observed_keyword: m?.observed_keyword || null,
          rank_detail: m?.rank_detail || null,
          // [세션84] 노출 축 — 순위가 없어도 '메인창 노출'이면 「밖」이 아니다.
          view_ok: m?.view_ok ?? null,
          related_ok: m?.related_ok ?? null,
          days_since_publish: m?.days_since_publish ?? null,
          // [세션86] surv 「-h」 정정 — survival_hours 컬럼은 실재하지 않는다(세션85 실측).
          //   생존시간은 저장값이 아니라 published_at 에서 나오는 파생값이다.
          survival_days: hasUrl(r) && (r.published_at || r.created_at)
            ? Math.floor((Date.now() - new Date(r.published_at || r.created_at).getTime()) / 864e5)
            : null,
          prev_observed_rank: (prevMap[r.id] || (src ? prevMap[src] : null))?.observed_rank ?? null,
        };
      });

    // 5-2. Queue 파생 계산 (DEC-019 — 저장하지 않는다)
    //   기준시각 = 최근 관측일이 있으면 그 날, 없으면 발행일. 거기에 §4 주기를 더한 날이 권장 관측일이다.
    //   대상: URL 이 있고 발행 30일 이내인 행만. 운영 Queue 와 히스토리는 분리한다.
    const NOW = Date.now();
    const TODAY = dayOf(NOW);
    for (const r of merged) {
      r.queue_state = null;
      r.queue_reason = null;
      r.next_due_at = null;
      r.overdue_days = 0;

      const pubAt = r.published_at || r.created_at;
      if (!hasUrl(r) || !pubAt) continue;                  // 미발행 → Queue 밖
      const src = r.source_post_id || null;

      const lastObs = r.latest_observed_at ? new Date(r.latest_observed_at).getTime() : null;
      const elapsed = (NOW - new Date(pubAt).getTime()) / DAY;

      // 관측 종료 — 미노출 연속 3회 「그리고」 발행 후 7일 경과. 둘 다 충족해야 닫는다.
      //   한쪽만으로 닫으면 색인 지연을 소멸로 오기록한다. 생존 기간이 실제보다 짧게 남는다.
      const streak = (missStreak[r.id] != null ? missStreak[r.id] : (src ? missStreak[src] : 0)) || 0;
      r.miss_streak = streak;
      if (streak >= MISS_CLOSE && elapsed >= MISS_MIN_DAYS) { r.queue_state = 'closed'; continue; }

      // 운영 창 밖 — 큐에서만 뺀다. 관측 이력·분석 대상에서 제외하는 것이 아니다.
      if (elapsed > QUEUE_WINDOW) { r.queue_state = 'archived'; continue; }

      let si = stepIndex(elapsed);

      // 보조 규칙 — 전회 대비 ±10위 이상이면 다음 주기를 1단계 앞당긴다.
      const cur = r.observed_rank, prv = r.prev_observed_rank;
      const jump = typeof cur === 'number' && typeof prv === 'number' && Math.abs(cur - prv) >= 10;
      if (jump) si = Math.max(0, si - 1);

      const base = lastObs != null ? lastObs : new Date(pubAt).getTime();
      const due = dayOf(base) + STEPS[si] * DAY;
      r.next_due_at = new Date(due).toISOString().slice(0, 10);

      if (lastObs != null && dayOf(lastObs) === TODAY) r.queue_state = 'done';
      else if (due < TODAY) { r.queue_state = 'overdue'; r.overdue_days = Math.round((TODAY - due) / DAY); }
      else if (due <= TODAY) r.queue_state = 'due';
      else r.queue_state = 'pending';

      // 사유 — 입력 주체가 사람이든 자동수집기든 동일한 축이다(문서05 §5).
      if (r.queue_state === 'overdue') r.queue_reason = 'OVERDUE';
      else if (jump) r.queue_reason = 'RECHECK';
      else if (r.obs_total === 0) r.queue_reason = 'NEW';
      else r.queue_reason = 'SCHEDULE';
    }

    // 5-3. 하루 상한 — 슬롯 분할(신규 10 / 지연 10). 남는 슬롯은 다른 쪽이 사용한다.
    //   단일 상한 + overdue 우선으로는 지연 재고가 신규를 영구히 밀어낸다(세션86 실측).
    const byDue = (a, b) => String(a.next_due_at || '').localeCompare(String(b.next_due_at || ''));
    const dueList = merged.filter((r) => r.queue_state === 'due').sort(byDue);
    const overList = merged.filter((r) => r.queue_state === 'overdue')
      .sort((a, b) => (b.overdue_days - a.overdue_days) || byDue(a, b));

    let takeOver = Math.min(overList.length, SLOT_OVER);
    let takeNew = Math.min(dueList.length, DUE_LIMIT - takeOver);
    takeOver = Math.min(overList.length, DUE_LIMIT - takeNew);   // 남는 슬롯은 다른 쪽이 쓴다

    for (let i = takeNew; i < dueList.length; i += 1) dueList[i].queue_state = 'deferred';
    for (let i = takeOver; i < overList.length; i += 1) overList[i].queue_state = 'deferred';
    const todayQueue = [...dueList.slice(0, takeNew), ...overList.slice(0, takeOver)];

    // 6. summary — 필터 무관 전체 기준(병합 후). 헤더 카운트용.
    let publishedCnt = 0, observedCnt = 0;
    for (const r of merged) {
      if (hasUrl(r)) publishedCnt += 1;
      if (r.obs_total > 0) observedCnt += 1;
    }
    const summary = {
      total: merged.length,
      published: publishedCnt,
      draft: merged.length - publishedCnt,
      observed: observedCnt,
      unobserved: merged.length - observedCnt,
      queue: {
        today: todayQueue.length,                                              // 오늘 처리 대상(상한 적용 후)
        fresh: takeNew,                                                        // 신규 슬롯 사용분
        overdue: takeOver,                                                     // 지연 슬롯 사용분
        deferred: (dueList.length - takeNew) + (overList.length - takeOver),   // 익일 이월
        done_today: merged.filter((r) => r.queue_state === 'done').length,
        archived: merged.filter((r) => r.queue_state === 'archived').length,   // 운영 창(30일) 밖
        limit: DUE_LIMIT, window_days: QUEUE_WINDOW,
      },
    };

    // 7. 필터 — 검색은 서버 기준. 운영자는 스크롤로 찾지 않는다.
    const status = STATUSES.has(qp.status) ? qp.status : 'all';
    const kw = String(qp.q || '').trim().toLowerCase();
    const industry = String(qp.industry || '').trim();
    const from = qp.from ? new Date(qp.from).getTime() : null;
    const to = qp.to ? new Date(qp.to).getTime() + 864e5 - 1 : null;

    const filtered = merged.filter((r) => {
      if (status === 'published' && !hasUrl(r)) return false;
      if (status === 'draft' && hasUrl(r)) return false;
      if (status === 'observed' && r.obs_total === 0) return false;
      if (status === 'unobserved' && r.obs_total > 0) return false;
      if (status === 'user_only' && !(r.user_rank_count > 0 && r.observation_count === 0)) return false;
      // 화면에는 due 만 노출한다. 전체 목록을 매일 보여주면 Queue 의 의미가 사라진다(문서05 §3-3).
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

    // 8. 정렬
    const sort = SORTS.has(qp.sort) ? qp.sort : 'recent';
    const ts = (v) => (v ? new Date(v).getTime() : 0);
    const repRank = (r) => (r.observation_count > 0 ? r.observed_rank : (r.user_rank_count > 0 ? r.user_latest_rank : null));
    const cmp = {
      recent: (a, b) => ts(b.created_at) - ts(a.created_at),
      oldest: (a, b) => ts(a.created_at) - ts(b.created_at),
      published_recent: (a, b) => ts(b.published_at || b.created_at) - ts(a.published_at || a.created_at),
      obs_recent: (a, b) => ts(b.latest_observed_at) - ts(a.latest_observed_at),
      rank_desc: (a, b) => {
        const av = repRank(a), bv = repRank(b);
        if (av == null && bv == null) return ts(b.created_at) - ts(a.created_at);
        if (av == null) return 1;
        if (bv == null) return -1;
        return bv - av;
      },
      // 관측 순서 — overdue 가 먼저, 그다음 권장일이 오래된 순.
      queue: (a, b) => {
        const w = (r) => (r.queue_state === 'overdue' ? 0 : r.queue_state === 'due' ? 1 : 2);
        if (w(a) !== w(b)) return w(a) - w(b);
        return String(a.next_due_at || '9999').localeCompare(String(b.next_due_at || '9999'));
      },
      rank_asc: (a, b) => {
        const av = repRank(a), bv = repRank(b);
        if (av == null && bv == null) return ts(b.created_at) - ts(a.created_at);
        if (av == null) return 1;
        if (bv == null) return -1;
        return av - bv;
      },
    }[sort];
    filtered.sort(cmp);

    // 9. 페이지 분할 — 전량 렌더 금지. 조회 범위가 아니라 표시 단위다.
    const size = Math.min(Math.max(parseInt(qp.size, 10) || 100, 20), 300);
    const totalPages = Math.max(1, Math.ceil(filtered.length / size));
    const page = Math.min(Math.max(parseInt(qp.page, 10) || 1, 1), totalPages);
    const start = (page - 1) * size;
    const rows = filtered.slice(start, start + size);

    const industries = Array.from(new Set(merged.map((r) => r.industry).filter(Boolean))).sort();

    return res.status(200).json({
      ok: true,
      rows,
      summary,
      page: { page, size, total: filtered.length, total_pages: totalPages },
      filters: { status, sort, q: qp.q || '', industry, from: qp.from || '', to: qp.to || '' },
      industries,
      scope: { source_rows: data.length, merged_rows: merged.length, absorbed: absorbed.size },
      verified: { auth_user_id: authUserId, is_owner: true },
    });
  } catch (e) {
    console.error('[publish-list] error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
