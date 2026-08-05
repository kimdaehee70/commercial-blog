// pages/api/admin/publish-list.js
// v0.9 (?�션86) ??Queue starvation 방어. ?�측: ??20건이 ?��? 5~6???�스??발행�?+55???�었??
//   overdue ?�선 ?�렬 + ?�일 ?�한 구조?�서???�고가 ?��? ?�구 ?�유???�규 발행??관측되지 ?�는??
//   ???�영 �?30?? ??발행 30??초과분�? ?�상 Queue ?�?�에???�외(archived). ?�이?�는 ?��? ?�는??
//      fossil ?�동 종료??채택?��? ?�았?? ?�스??발행분도 ORBIT 검�??�료가 ?????�다.
//   ???�롯 분할 ???�규(due) 10 + 지??overdue) 10. ?�쪽??모자?�면 ?�는 ?�롯???�른 쪽이 ?�다.
//   ??queue_reason ??NEW / SCHEDULE / OVERDUE / RECHECK. ?�동?�집�?E-3)가 붙어???�일 Queue ?�용.
// v0.8 (?�션86) ??관�?Queue(E-1) ?�생 계산. DEC-019 준?? Queue ???�?�하지 ?�는??
//   published_at + 최근 observed_date + 문서05 §4 주기????due / overdue / done / pending / deferred
//   · ?�규 컬럼 0�? ALTER 0. 기존 ?�답 ?�드 ??�� ?�음(추�?�?.
//   · ?�루 due 총량 ?�한 20�??�영 ?�정) ??초과분�? deferred �??�일 ?�월. overdue ?�선?�위 ?�향.
//   · closed ??별도 ?�태값을 만들지 ?�고 alive_status='fossil' �??�체한??
//   · ?�동?�집�?E-3)가 붙어????계산?��? 그�?로다. ?�력 주체�?바뀐다(문서05 §5).
// v0.7 (?�션85) ??Soft Delete ?�입. deleted_at IS NULL ?�터 1�?추�?.
//   ??��???�을 지?��? ?�는?? 관�?publish_metrics·post_ranks)?� 그�?�??�고 목록?�서�??�는??
//   �??�설 근거: publish_status ??CHECK ?�약(baseline/generated/published/observed/
//   failed/pending/test)??묶여 ?�어 'deleted' �??�을 ???�다. ?�용값을 ?�리�?발행 축에
//   ??�� 축이 ?�여 ?�삭?�된 published?��? ?�현?????�게 ?�다. ??deleted_at 별도 �?ALTER 1�?.
// v0.6 (?�션84) ??목록 ?�에 view_ok/related_ok ?�달(?�출 ?�태 ?�시??. 계약 추�?�? ??�� ?�음.
// v0.5 (?�션83) ??조회 범위 ?�한 ?�기. ?�량 조회 + ?�버 검?�·필?�·페?��??�이??(DEC-017)
//
// 배경: 목록??id 1371?�서 ?�겼?? 버그가 ?�니??`limit(400) ??slice(200)` ???�계 결과?�??
//   �??�책("Publish = 최근 200�?)?� 관측목록이 ?�던 ?�절???�시 ?�영 방식?�다.
//   DEC-017 �??�기 ??Publish ?� Observation ?� 조회 범위가 ?�니??책임?�로 구분?�다.
//     · Publish     = ?�영 관�?(URL ?�록·발행 ?�태·?�발?�·삭?�·이??
//     · Observation = ?�과 관�?(?�위·관?�도·?�존·Timeline)
//   ???�면 모두 ?�체 ?�이?�에 ?�근?�다. ??��?� 겹치지 ?�는??
//
// ???�측(?�션83): supabase-js/PostgREST ???�청??기본 1000???�한??건다.
//   `.limit()` ??지?�는 것만?�로???�량???��? ?�는?? range() 루프(fetchAll)가 ?�요?�다.
//   관측목�?observations.js v0.6)?�서 먼�? ?�인???�실?�며 ?�기?�도 ?�일?�게 ?�용?�다.
//
// ?�량 ?�더 금�? ??조회???�체, ?�답?� ?�이지 ?�위. 검?�·필?�·정?��? ?��? ?�버 기�?.
//   ?�영?�는 ?�크롤로 찾�? ?�는?? ?�이지?�이?��? 보조 ?�단?�다.
//
// ?�답 계약: 기존 rows ?�드 ?��? 무�?�??�론??RankCell/pickRepRank 계약 ?��?).
//   page / filters / industries / summary 추�?. 기존 ?�드 ??�� ?�음.
// ?�기 ?�용. ?�키�?무�?�?ALTER 0). ?�진 무접�?
//
// ?�?� ?�전 ?�력 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// ?�션82 v0.4: 목록 obs ?�합 ??post_ranks(?�용??관�? 병행 조회
//   - ?�세??관리자1+?�용??=2?�데 목록 obs??1?�었?? ???�일??post_ranks �?보�? ?��? ??로직 ?�실 ?�님).
//   - ??SoT ?��?(DEC-006). post_ranks �?publish_metrics �?복사?��? ?�는?? ?�는 것만 ?�친??
//   - post_ranks.post_id ??text. publish_history.id ??int ??String() �?맞춰 조회?�다.
// ?�션78: baseline?�published 1??병합 (?�기 ?�용)
//   - publish_history ??글 1건을 2?�으�??�긴?? baseline(?�성) ??published(URL ?�록)
//   - ?�결?�는 published.source_post_id ??baseline.id. ?�목 병합 ?�님
//     (?�목?� ?�발?�·동?�제�??�생?�에??충돌?��?�??�로 ?�면 ???�다)
//   - published 가 ?�으�?�?�?baseline ??목록?�서 ?�수. �??�는 baseline ?� ?�류
// 87�? select??naver_post_url + publish_status 추�?
// 86�?v0.3: 가???�수 마이그레?�션 (lib/guards.requireOwner ?�용)
// 55�?v0.2: Bearer ?�큰 검�?+ OWNER_UID 가??// 48�?v0.1: publish_metrics ?�일 spine ?�일

import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { requireOwner } from '../../lib/guards';

// ?�?� ?�량 조회 ?�퍼 ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// builder ??�??�출 ??쿼리�?반환?�야 ?�다(range ?�적 방�?).
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

// URL ?�무가 발행 ?��???truth ???�션78). publish_status ??보정 경로???�라 ??�� 붙어 ?�뢰가 ??��.
const hasUrl = (r) => !!String(r?.naver_post_url || '').trim();

const SORTS = new Set(['recent', 'oldest', 'published_recent', 'obs_recent', 'rank_desc', 'rank_asc', 'queue']);
const STATUSES = new Set(['all', 'published', 'draft', 'observed', 'unobserved', 'user_only', 'rank_out', 'due']);

// ?�?� Queue(E-1) ?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�?�
// 관�?주기???�이?�의 ?�질?�서 ?�온?? 관측자???��??�서 ?�오지 ?�는??문서05 §4).
const DAY = 864e5;
const DUE_LIMIT = 20;                 // ?�루 due 총량 ?�한. 초과분�? ?�일 ?�월.
const SLOT_NEW = 10;                  // ?�규(due) ?�롯 ??지???�고가 ?��? ?�점?�는 것을 막는??const SLOT_OVER = 10;                 // 지??overdue) ?�롯
const QUEUE_WINDOW = 30;
const MISS_CLOSE = 3;                 // 관�?종료 조건 ??미노�??�속 ?�차
const MISS_MIN_DAYS = 7;              // 관�?종료 조건 ??발행 ??최소 경과?????�과 AND 조건              // ?�영 Queue �???. 초과분�? archived ??조회·분석?� 계속 가??const STEPS = [1, 2, 5, 7];           // 주기 ?�다�???급�? ??1?�계 ?�당김
const dayOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

function stepIndex(elapsedDays) {
  if (elapsedDays < 1) return 0;      // 24?�간 ?�내 ???�일
  if (elapsedDays <= 7) return 1;     // 1~7??   ??2????  if (elapsedDays <= 30) return 2;    // 8~30??  ??5????  return 3;                           // 30??초과 ??�?1??}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false });

  const user = await requireOwner(req, res);
  if (!user) return;
  const authUserId = user.id;

  try {
    const qp = req.query || {};

    // 1. publish_history ???�량. limit ?�음(DEC-017).
    const data = await fetchAll(() =>
      supabaseAdmin
        .from('publish_history')
        .select(`
          id, title, industry, region, treatment_name,
          naver_post_url, publish_status, source_post_id,
          created_at, published_at, deleted_at
        `)
        .is('deleted_at', null)   // [?�션85] Soft Delete ????�� ?��? 목록?�서 ?�긴??        .order('created_at', { ascending: false })
    );

    // 2. publish_metrics ???�량. count + latest 매핑.
    const obs = await fetchAll(() =>
      supabaseAdmin
        .from('publish_metrics')
        .select('publish_id, observed_date, alive_status, observed_rank, observed_keyword, days_since_publish, created_at, rank_detail, view_ok, related_ok')
        .order('observed_date', { ascending: false })
        .order('created_at', { ascending: false })
    );

    const countMap = {};
    const latestMap = {};
    const prevMap = {};   // 직전 ?�차 ???�위 급�?(±10) ?�정?? ?�???�님, 계산??
    for (const o of obs) {
      const pid = o.publish_id;
      countMap[pid] = (countMap[pid] || 0) + 1;
      if (!latestMap[pid]) latestMap[pid] = o;
      else if (!prevMap[pid]) prevMap[pid] = o;
    }

    // 3. post_ranks ???�용???�위?�록(별도 SoT). ?�치지 ?�고 각각 ?�다(DEC-006).
    //    OWNER ?�면?��?�?auth_user_id ?�터 ?�음 ????계정 관측을 본다(observations.js ?� ?�일 기�?).
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


    // [?�션86] 미노�??�속 ?�차 ??????미노�?= ?�멸???�정??막는??
    //   발행 직후 미노출�? ?�인 지?�일 ???�다. ?�?�값(fossil)?� 그�?�??�고 Queue ?�석�??�화?�다.
    const missStreak = {}, streakSealed = {};
    for (const o of obs) {
      const pid = o.publish_id;
      if (streakSealed[pid]) continue;
      if (o.alive_status === 'fossil') missStreak[pid] = (missStreak[pid] || 0) + 1;
      else streakSealed[pid] = true;
    }

    // 4. baseline ?�수 ??published.source_post_id 가 가리키??baseline ???�거.
    const absorbed = new Set();
    for (const r of data) if (r.source_post_id) absorbed.add(r.source_post_id);

    // 5. 결합 (관측�? ?�수??baseline 쪽에 붙어 ?�을 ???�어 ?�쪽???�산)
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
          // [?�션84] ?�출 �????�위가 ?�어??'메인�??�출'?�면 ?�밖?�이 ?�니??
          view_ok: m?.view_ok ?? null,
          related_ok: m?.related_ok ?? null,
          days_since_publish: m?.days_since_publish ?? null,
          // [?�션86] surv ??h???�정 ??survival_hours 컬럼?� ?�재?��? ?�는???�션85 ?�측).
          //   ?�존?�간?� ?�?�값???�니??published_at ?�서 ?�오???�생값이??
          survival_days: hasUrl(r) && (r.published_at || r.created_at)
            ? Math.floor((Date.now() - new Date(r.published_at || r.created_at).getTime()) / 864e5)
            : null,
          prev_observed_rank: (prevMap[r.id] || (src ? prevMap[src] : null))?.observed_rank ?? null,
        };
      });

    // 5-2. Queue ?�생 계산 (DEC-019 ???�?�하지 ?�는??
    //   기�??�각 = 최근 관측일???�으�?�??? ?�으�?발행?? 거기??§4 주기�??�한 ?�이 권장 관측일?�다.
    //   ?�?? URL ???�고 발행 30???�내???�만. ?�영 Queue ?� ?�스?�리??분리?�다.
    const NOW = Date.now();
    const TODAY = dayOf(NOW);
    for (const r of merged) {
      r.queue_state = null;
      r.queue_reason = null;
      r.next_due_at = null;
      r.overdue_days = 0;

      const pubAt = r.published_at || r.created_at;
      if (!hasUrl(r) || !pubAt) continue;                  // 미발????Queue �?      const src = r.source_post_id || null;

      const lastObs = r.latest_observed_at ? new Date(r.latest_observed_at).getTime() : null;
      const elapsed = (NOW - new Date(pubAt).getTime()) / DAY;

      // 관�?종료 ??미노�??�속 3???�그리고??발행 ??7??경과. ????충족?�야 ?�는??
      //   ?�쪽만으�??�으�??�인 지?�을 ?�멸�??�기록한?? ?�존 기간???�제보다 짧게 ?�는??
      const streak = (missStreak[r.id] != null ? missStreak[r.id] : (src ? missStreak[src] : 0)) || 0;
      r.miss_streak = streak;
      if (streak >= MISS_CLOSE && elapsed >= MISS_MIN_DAYS) { r.queue_state = 'closed'; continue; }

      // ?�영 �?�????�에?�만 뺀?? 관�??�력·분석 ?�?�에???�외?�는 것이 ?�니??
      if (elapsed > QUEUE_WINDOW) { r.queue_state = 'archived'; continue; }

      let si = stepIndex(elapsed);

      // 보조 규칙 ???�회 ?��?±10???�상?�면 ?�음 주기�?1?�계 ?�당긴다.
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

      // ?�유 ???�력 주체가 ?�람?�든 ?�동?�집기든 ?�일??축이??문서05 §5).
      if (r.queue_state === 'overdue') r.queue_reason = 'OVERDUE';
      else if (jump) r.queue_reason = 'RECHECK';
      else if (r.obs_total === 0) r.queue_reason = 'NEW';
      else r.queue_reason = 'SCHEDULE';
    }

    // 5-3. ?�루 ?�한 ???�롯 분할(?�규 10 / 지??10). ?�는 ?�롯?� ?�른 쪽이 ?�용?�다.
    //   ?�일 ?�한 + overdue ?�선?�로??지???�고가 ?�규�??�구??밀?�낸???�션86 ?�측).
    const byDue = (a, b) => String(a.next_due_at || '').localeCompare(String(b.next_due_at || ''));
    const dueList = merged.filter((r) => r.queue_state === 'due').sort(byDue);
    const overList = merged.filter((r) => r.queue_state === 'overdue')
      .sort((a, b) => (b.overdue_days - a.overdue_days) || byDue(a, b));

    let takeOver = Math.min(overList.length, SLOT_OVER);
    let takeNew = Math.min(dueList.length, DUE_LIMIT - takeOver);
    takeOver = Math.min(overList.length, DUE_LIMIT - takeNew);   // ?�는 ?�롯?� ?�른 쪽이 ?�다

    for (let i = takeNew; i < dueList.length; i += 1) dueList[i].queue_state = 'deferred';
    for (let i = takeOver; i < overList.length; i += 1) overList[i].queue_state = 'deferred';
    const todayQueue = [...dueList.slice(0, takeNew), ...overList.slice(0, takeOver)];

    // 6. summary ???�터 무�? ?�체 기�?(병합 ??. ?�더 카운?�용.
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
        today: todayQueue.length,                                              // ?�늘 처리 ?�???�한 ?�용 ??
        fresh: takeNew,                                                        // ?�규 ?�롯 ?�용�?        overdue: takeOver,                                                     // 지???�롯 ?�용�?        deferred: (dueList.length - takeNew) + (overList.length - takeOver),   // ?�일 ?�월
        done_today: merged.filter((r) => r.queue_state === 'done').length,
        archived: merged.filter((r) => r.queue_state === 'archived').length,   // ?�영 �?30?? �?        limit: DUE_LIMIT, window_days: QUEUE_WINDOW,
      },
    };

    // 7. ?�터 ??검?��? ?�버 기�?. ?�영?�는 ?�크롤로 찾�? ?�는??
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
      // ?�면?�는 due �??�출?�다. ?�체 목록??매일 보여주면 Queue ???��?가 ?�라진다(문서05 §3-3).
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

    // 8. ?�렬
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
      // 관�??�서 ??overdue 가 먼�?, 그다??권장?�이 ?�래????
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

    // 9. ?�이지 분할 ???�량 ?�더 금�?. 조회 범위가 ?�니???�시 ?�위??
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
