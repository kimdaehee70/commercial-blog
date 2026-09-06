// lib/observeSchedule.js
// [OBSERVATION-AUTO-SCHEDULER-01] 관측 주기 계산 단일 모듈.
//
// 축 분리 (DEC-006 계승):
//   manual  = publish_metrics.observed_date 기준. 30일 초과 시 archived (현행 화면 큐 정책).
//   auto    = survival_log.observed_at   기준. 30일 이후 주1회로 무기한 지속.
//
// ★ 이번 커밋에서는 auto 모드만 사용한다.
//   manual 모드는 publish-list.js L277~320 / observations.js L179~206 의 인라인 계산을
//   대체할 목적으로 정의만 해 두었으나, 해당 파일의 라인 단위 실측 전까지 배선하지 않는다.
//   (무접촉 유지 — 화면 큐 동작을 이번 축에서 바꾸지 않는다)
//
// 날짜 기준: KST. DB TimeZone = UTC 이므로 반드시 +9h 시프트 후 일자 절단한다.
//   UTC 기준으로 자르면 한국 오전 9시 이전 관측이 전날로 묶인다.

const DAY = 864e5;
const KST_OFFSET = 9 * 3600 * 1000;

const STEPS = [1, 2, 5, 7];   // 주기 사다리 — publish-list.js L97 과 동일값
const QUEUE_WINDOW = 30;      // manual 전용. auto 는 종료하지 않는다.
const LONG_TERM_STEP = 7;     // auto · 30일 초과 시 주1회

// [AUTO-SCHEDULER-CUTOFF] 자동 스케줄러 본선 시작일 (KST, YYYY-MM-DD).
//   이 날짜 이전 발행글은 tick 본선 대상에서 제외한다. 기존 관측 데이터는 보존한다.
//   장기관측(30일 이후 주1회)은 "앞으로 발행되는 글"에 적용하는 정책이지,
//   도입 이전 전량을 소급 관측하라는 뜻이 아니다. 레거시 소급은 별도 배치축에서 판단한다.
//   운영 중 조정은 환경변수 OBSERVER_AUTO_START 로만 한다. 코드에 날짜를 흩뿌리지 않는다.
const AUTO_START_DEFAULT = '2026-09-06';

function autoStartDate() {
  const v = (process.env.OBSERVER_AUTO_START || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : AUTO_START_DEFAULT;
}

// 자동 스케줄러 본선 대상 여부 — 발행일(KST)이 시작일 이상인가
function inAutoScope(published_at, startDate = autoStartDate()) {
  const d = kstDay(published_at);
  if (d == null) return false;
  return new Date(d + KST_OFFSET).toISOString().slice(0, 10) >= startDate;
}

// KST 기준 일자 시작 시각(ms). null/invalid → null
function kstDay(t) {
  if (t == null) return null;
  const ms = t instanceof Date ? t.getTime() : new Date(t).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor((ms + KST_OFFSET) / DAY) * DAY - KST_OFFSET;
}

function kstToday(now = Date.now()) {
  return kstDay(now);
}

// 경과일에 따른 다음 관측 간격(일)
//   0~1일   → 1일 후
//   2~7일   → 2일 후
//   8~30일  → 5일 후
//   30일 초과 → 7일 후 (auto 전용. manual 은 이 구간 진입 전 archived)
function intervalFor(elapsedDays) {
  if (elapsedDays <= 1) return STEPS[0];
  if (elapsedDays <= 7) return STEPS[1];
  if (elapsedDays <= QUEUE_WINDOW) return STEPS[2];
  return LONG_TERM_STEP;
}

/**
 * 다음 관측 예정일과 큐 상태를 계산한다.
 *
 * @param {Object}  p
 * @param {string|Date} p.published_at      발행 시각 (없으면 created_at 을 넘길 것)
 * @param {string|Date|null} p.last_observed_at  해당 축의 마지막 관측 시각
 * @param {'auto'|'manual'} p.mode
 * @param {number}  [p.now]                 테스트용 고정 시각(ms)
 * @returns {{ next_due_at: string|null, queue_state: string, overdue_days: number,
 *             elapsed_days: number, interval: number|null }}
 *
 * queue_state: 'due' | 'overdue' | 'done' | 'pending' | 'archived' | 'invalid'
 */
function computeDue({ published_at, last_observed_at = null, mode = 'auto', now = Date.now() }) {
  const TODAY = kstToday(now);
  const pub = kstDay(published_at);

  if (pub == null) {
    return { next_due_at: null, queue_state: 'invalid', overdue_days: 0, elapsed_days: 0, interval: null };
  }

  const elapsedDays = Math.floor((TODAY - pub) / DAY);

  // manual 축만 30일에서 관측을 종료한다. auto 는 종료하지 않는다.
  if (mode === 'manual' && elapsedDays > QUEUE_WINDOW) {
    return { next_due_at: null, queue_state: 'archived', overdue_days: 0, elapsed_days: elapsedDays, interval: null };
  }

  const lastObs = kstDay(last_observed_at);

  // 오늘 이미 관측됨 → done. (동일 tick 재실행 / 수동 중복 호출 방어의 1차선)
  if (lastObs != null && lastObs === TODAY) {
    return { next_due_at: null, queue_state: 'done', overdue_days: 0, elapsed_days: elapsedDays, interval: null };
  }

  // 기준점: 마지막 관측이 있으면 그 날, 없으면 발행일.
  //   발행 즉시 기준선은 publish-secure.js 가 이미 수집한다. tick 은 D+1 부터 관여한다.
  const base = lastObs != null ? lastObs : pub;
  const interval = intervalFor(elapsedDays);
  const due = base + interval * DAY;

  let queue_state = 'pending';
  let overdue_days = 0;

  if (due < TODAY) {
    queue_state = 'overdue';
    overdue_days = Math.floor((TODAY - due) / DAY);
  } else if (due <= TODAY) {
    queue_state = 'due';
  }

  return {
    next_due_at: new Date(due + KST_OFFSET).toISOString().slice(0, 10),
    queue_state,
    overdue_days,
    elapsed_days: elapsedDays,
    interval,
  };
}

// 관측 대상 정렬: overdue 우선 → 지연일 많은 순 → 예정일 이른 순 → id 오름차순
function compareForQueue(a, b) {
  const w = (r) => (r.queue_state === 'overdue' ? 0 : 1);
  return (
    (w(a) - w(b)) ||
    (b.overdue_days - a.overdue_days) ||
    String(a.next_due_at || '9999').localeCompare(String(b.next_due_at || '9999')) ||
    (a.publish_id - b.publish_id)
  );
}

module.exports = {
  DAY,
  KST_OFFSET,
  STEPS,
  QUEUE_WINDOW,
  LONG_TERM_STEP,
  AUTO_START_DEFAULT,
  autoStartDate,
  inAutoScope,
  kstDay,
  kstToday,
  intervalFor,
  computeDue,
  compareForQueue,
};
