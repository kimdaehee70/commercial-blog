// pages/api/observer/tick.js
// [OBSERVATION-AUTO-SCHEDULER-01] 자동관측 스케줄러 — 하루 1회 Cron 실행기.
//
// 역할: 오늘 관측할 글을 고르고, 기존 /api/observer/enqueue 를 순차 호출한다.
//   수집 로직은 전혀 갖지 않는다. enqueue.js 무수정.
//
// 확정 사양 (선장 Gate 2026-09-06):
//   · 발행 즉시 기준선은 publish-secure.js 가 담당. tick 은 D+1 부터.
//   · 주기 STEPS [1,2,5,7] → 30일 이후 주1회 무기한. 자동축은 종료하지 않는다.
//   · 자동축 SoT = survival_log.observed_at  (수동 publish_metrics 와 독립)
//   · [CUTOFF] 본선 대상 = 도입일(OBSERVER_AUTO_START, 기본 2026-09-06) 이후 발행글만.
//     레거시 소급 관측 금지 — 5월 발행분 150건이 신규 due 를 밀어내는 것을 차단한다.
//   · [SLOT] 신규 due 슬롯과 overdue 슬롯을 분리한다. 신규가 지연 재고에 밀리지 않는다.
//   · 중복 실행 차단 = observer_tick_run(run_date PK, KST). insert 성공자만 진행.
//   · Vercel Hobby = 하루 1회 · 함수 60초. 시간 예산 초과 전 안전 중단, 잔여는 익일 overdue.
//
// 무접촉: enqueue.js · observe-quick/once/batch · publish-secure.js · publish_metrics · 엔진
//
// 호출:
//   Vercel Cron  → GET  /api/observer/tick        (Authorization: Bearer CRON_SECRET)
//   수동 검증    → POST /api/observer/tick        (x-cron-secret: CRON_SECRET)
//   드라이런     → ?dry=1   대상 선정만. enqueue 미호출. tick_run 미기록.

import { createClient } from '@supabase/supabase-js';
import { computeDue, compareForQueue, kstToday, KST_OFFSET, autoStartDate, inAutoScope } from '../../../lib/observeSchedule';

export const config = { maxDuration: 60 };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET || '';

// ─── 실행 예산 ───
// Vercel Hobby 함수 상한 60초. 응답 직렬화·정리 시간을 남긴다.
const BUDGET_MS = 45000;
// enqueue 1건은 네이버 요청을 최대 3회(Core / Intent / index check) 순차 수행한다.
// 실측 전 보수값. 첫 실행 로그로 재조정한다.
const EST_ITEM_MS = 6000;
// 건간 지연 — 요청 분산. fire-and-forget 금지(Naver 지침 §2).
const GAP_MS = 2000;
// 상한. 시간 예산이 먼저 걸리는 것이 정상이며, 이 값은 폭주 방어용 하드캡이다.
const TICK_MAX = 10;
// 슬롯 분할 — publish-list.js L91~93(DUE_LIMIT/SLOT_NEW/SLOT_OVER) 패턴 상속.
//   한쪽이 비면 나머지 슬롯을 상대가 흡수한다.
const SLOT_DUE = 5;
const SLOT_OVER = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function todayKST(now = Date.now()) {
  return new Date(kstToday(now) + KST_OFFSET).toISOString().slice(0, 10);
}

function authorized(req) {
  if (!CRON_SECRET) return false;
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const header = req.headers['x-cron-secret'] || '';
  return bearer === CRON_SECRET || header === CRON_SECRET;
}

function originOf(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// range 루프로 전량 읽기 (Supabase 기본 1000행 상한 회피)
async function fetchAll(table, columns, applyFilters) {
  const out = [];
  const SIZE = 1000;
  for (let from = 0; ; from += SIZE) {
    let q = supabase.from(table).select(columns).range(from, from + SIZE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < SIZE) break;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const dry = req.query?.dry === '1' || req.query?.dry === 'true';
  const started = Date.now();
  const run_date = todayKST(started);

  try {
    // ─── 1) 중복 실행 차단 ───
    // observer_tick_run.run_date 는 PK. 두 인스턴스가 동시에 진입해도 하나만 insert 에 성공한다.
    // 애플리케이션 락이 아니라 DB 제약이므로 서버리스 다중 인스턴스에서도 성립한다.
    if (!dry) {
      const { error: lockErr } = await supabase
        .from('observer_tick_run')
        .insert({ run_date, started_at: new Date().toISOString() });

      if (lockErr) {
        // 23505 = unique_violation → 오늘 이미 실행됨. 정상 종료.
        if (lockErr.code === '23505') {
          return res.status(200).json({ ok: true, skipped: 'already_ran', run_date });
        }
        throw new Error(`tick_run lock: ${lockErr.message}`);
      }
    }

    // ─── 2) 후보 수집 ───
    // 관측 가능 조건: published + 네이버 URL 등록됨.
    // Identity Gate(source_post_id / core_keyword)는 enqueue.js 가 자체 판정하므로 여기서 중복 검사하지 않는다.
    const allPosts = await fetchAll(
      'publish_history',
      'id, published_at, created_at, naver_post_url, publish_status',
      (q) => q.eq('publish_status', 'published').not('naver_post_url', 'is', null)
    );

    // [CUTOFF] 도입일 이전 발행글은 본선에서 제외. 데이터는 삭제하지 않는다.
    const AUTO_START = autoStartDate();
    const posts = allPosts.filter((p) => inAutoScope(p.published_at || p.created_at, AUTO_START));
    const legacyExcluded = allPosts.length - posts.length;

    // 자동축 마지막 관측 시각 — survival_log 만 본다. publish_metrics 무접촉.
    const logs = await fetchAll('survival_log', 'publish_id, observed_at');
    const lastObs = new Map();
    for (const r of logs) {
      const prev = lastObs.get(r.publish_id);
      if (!prev || r.observed_at > prev) lastObs.set(r.publish_id, r.observed_at);
    }

    // ─── 3) due 판정 ───
    const scored = posts.map((p) => {
      const d = computeDue({
        published_at: p.published_at || p.created_at,
        last_observed_at: lastObs.get(p.id) || null,
        mode: 'auto',
        now: started,
      });
      return { publish_id: p.id, ...d };
    });

    // [SLOT] 신규 due 우선. overdue 는 별도 슬롯에서만 소비한다.
    const dueList = scored.filter((r) => r.queue_state === 'due').sort(compareForQueue);
    const overList = scored.filter((r) => r.queue_state === 'overdue').sort(compareForQueue);
    const queue = [...dueList, ...overList];

    let takeDue = Math.min(dueList.length, Math.max(SLOT_DUE, TICK_MAX - overList.length));
    let takeOver = Math.min(overList.length, TICK_MAX - takeDue);
    takeDue = Math.min(dueList.length, TICK_MAX - takeOver);

    const picked = [...dueList.slice(0, takeDue), ...overList.slice(0, takeOver)];

    if (dry) {
      return res.status(200).json({
        ok: true, dry: true, run_date,
        auto_start: AUTO_START,
        candidates: posts.length,
        legacy_excluded: legacyExcluded,
        due: dueList.length,
        overdue: overList.length,
        picked: picked.length,
        slot: { due: takeDue, overdue: takeOver },
        deferred: queue.length - picked.length,
        preview: picked,
      });
    }

    // ─── 4) 순차 관측 ───
    const origin = originOf(req);
    const stats = { done: 0, blocked: 0, failed: 0 };
    const detail = [];
    let processed = 0;
    let stop = null;

    for (const item of picked) {
      const elapsed = Date.now() - started;
      // 남은 예산으로 1건을 마칠 수 없으면 시작하지 않는다. 잔여는 익일 overdue.
      if (elapsed + EST_ITEM_MS > BUDGET_MS) { stop = 'budget'; break; }
      if (processed > 0) await sleep(GAP_MS);

      const t0 = Date.now();
      try {
        const r = await fetch(`${origin}/api/observer/enqueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publish_id: item.publish_id }),
        });
        // enqueue 는 성공 200 / 게이트·조용한실패 204 두 가지로만 응답한다.
        if (r.status === 200) stats.done += 1;
        else stats.blocked += 1;
        detail.push({ publish_id: item.publish_id, status: r.status, ms: Date.now() - t0 });
      } catch (e) {
        stats.failed += 1;
        detail.push({ publish_id: item.publish_id, error: e?.message || String(e) });
      }
      processed += 1;
    }

    const deferred = queue.length - processed;

    await supabase
      .from('observer_tick_run')
      .update({
        finished_at: new Date().toISOString(),
        picked: picked.length,
        done: stats.done,
        deferred,
        note: [
          `start=${AUTO_START}`,
          `cand=${posts.length}`,
          `legacy_excl=${legacyExcluded}`,
          `queue=${queue.length}`,
          `processed=${processed}`,
          `blocked=${stats.blocked}`,
          `failed=${stats.failed}`,
          stop ? `stop=${stop}` : 'stop=complete',
          `ms=${Date.now() - started}`,
        ].join(' '),
      })
      .eq('run_date', run_date);

    return res.status(200).json({
      ok: true, run_date,
      auto_start: AUTO_START,
      candidates: posts.length,
      legacy_excluded: legacyExcluded,
      queue: queue.length,
      slot: { due: takeDue, overdue: takeOver },
      picked: picked.length,
      processed,
      deferred,
      ...stats,
      stop: stop || 'complete',
      ms: Date.now() - started,
      detail,
    });
  } catch (e) {
    console.error('[observer/tick]', e?.message || e);
    if (!dry) {
      await supabase
        .from('observer_tick_run')
        .update({ finished_at: new Date().toISOString(), note: `error: ${e?.message || e}` })
        .eq('run_date', run_date)
        .then(() => {}, () => {});
    }
    return res.status(500).json({ error: 'tick failed', detail: e?.message || String(e) });
  }
}
