// pages/api/admin/pseo-list.js
// ─────────────────────────────────────────────────────────────
// [PSEO-ADMIN-DASHBOARD-01] pSEO 관제 데이터 — 조회 전용.
//
// 관제탑이지 조종장치가 아니다. 상태와 성과만 반환한다.
//   ★ 강제 공개/차단 액션 없음. GET 전용.
//   ★ DDL 0 / RPC 신규 0 / 인덱스 추가 0 / 백필 0.
//   ★ 판정 규칙 복제 금지 — 공개 자격은 lib/pseo/eligibility 의
//     isPseoEligible() / listQualifiedIntents() 를 그대로 호출한다.
//     여기서 subscriptions 를 직접 읽어 판정하면 규칙이 둘로 갈린다.
//
// 실측 근거:
//   · pseo_events 인덱스 = (store_id, created_at DESC) → 기간 집계에 정합.
//   · pseo_events 8컬럼: id / store_id / account_id / cta_type / source /
//     industry / region / created_at.
//   · store_profiles.account_id 는 NULL 허용(계정 삭제 시 SET NULL).
//   · stores-list.js 는 RPC get_stores_admin 경유라 열 추가에 DDL 이 필요하다.
//     그래서 이 API 는 RPC 를 쓰지 않고 테이블을 직접 읽는다.
//
// [PSEO-ADMIN-N1-LATENCY-01] N+1 은 유지하되 직렬 깊이만 줄인다.
//   실측: Production 29566ms / 18행. 총 DB 왕복 67회.
//     stores 1 + events 1
//     + isPseoEligible 31 (유료 1건은 subscriptions 1회, 나머지 15건은
//       구독 미해당으로 accounts 조회가 추가되어 2회씩)
//     + listQualifiedIntents 17 + countPublishedPosts 17
//   원인은 N+1 구조 자체가 아니라 for...of + await 로 67 왕복을 한 줄로
//   세운 것이다(병렬 구간 0). 29566 ÷ 67 ≈ 441ms/왕복.
//   ★ 대응은 루프 구조 변경뿐이다. 벌크 쿼리·판정 규칙 복제·DDL 은 쓰지 않는다.
//   ★ EXCLUDED store 의 Intent/글수 조회 생략(C안)은 기각됨 — 표시값이
//     바뀌므로 지연 개선 축에서 다루지 않는다. 현행 유지.
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';
import { isPseoEligible, listQualifiedIntents, MIN_POSTS, MIN_HUB_POSTS, countPublishedPosts } from '../../../lib/pseo/eligibility';

// 공개 페이지(index.js / [intentSlug].js)의 배제 목록과 같은 값.
//   store 1 = OWNER 전업종 혼합 테스트 계정.
const EXCLUDED_STORE_IDS = [1];

// CTA 집계 창. KPI 와 표가 같은 창을 쓴다(두 값이 어긋나면 읽는 사람이 혼란스럽다).
const CTA_WINDOW_DAYS = 7;

// 표에 세는 CTA 3종. 나머지 타입(sms_click / directions_click)은 total 에만 합산.
const CTA_COLS = ['page_view', 'phone_click', 'post_click'];

// [PSEO-ADMIN-N1-LATENCY-01] store 처리 동시성 상한.
//   Supabase 커넥션 풀에 부담을 주지 않는 선. 올리면 왕복 수는 그대로이고
//   직렬 깊이만 더 줄지만, 서버리스 인스턴스당 동시 연결이 늘어난다.
const STORE_CONCURRENCY = 6;

// 차단 사유 → 화면 라벨. eligibility 의 reason 을 그대로 받고 여기서만 번역한다.
const REASON_LABEL = {
  EXCLUDED: '테스트 계정 배제',
  STORE_INACTIVE: '업체 비활성',
  NO_ACCOUNT: '계정 연결 없음',
  BASIS_LIFETIME: 'FREE 체험',
  BASIS_CALENDAR: '유효 구독 없음',
  BASIS_NULL: '판정 불가',
  PLAN_NOT_PAID: '무료 플랜',
  NO_POSTS: '발행글 없음',
  PAID: '',
};

// [PSEO-ADMIN-N1-LATENCY-01] 동시성 제한 map.
//   결과는 반드시 입력 순서로 되돌린다(out[i] 직접 대입). 완료 순서로 push 하면
//   화면 정렬이 store id 오름차순에서 무너진다.
//   worker 하나가 예외를 던지면 Promise.all 이 그대로 reject → 기존 try/catch 로
//   전달된다. 오류를 빈 목록으로 삼키지 않는 기존 동작과 동일하다.
async function mapWithLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: size }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  const diag = {
    version: 'v0.2',
    min_posts: MIN_POSTS,
    cta_window_days: CTA_WINDOW_DAYS,
    concurrency: STORE_CONCURRENCY,
    started_at: new Date().toISOString(),
  };

  const t0 = Date.now();

  try {
    // ── 1) 업체 목록 ─────────────────────────────────────────
    const { data: stores, error: sErr } = await supabaseAdmin
      .from('store_profiles')
      .select('id, account_id, store_name, industry, region, sub_region, status')
      .order('id', { ascending: true })
      .limit(500);

    if (sErr) {
      return res.status(200).json({
        ok: false,
        diag: { ...diag, step: 'stores', error_code: sErr.code, error_message: sErr.message },
        rows: [], kpi: null, count: 0,
      });
    }

    // ── 2) CTA 집계 (기간 1회 조회 → JS 집계) ────────────────
    //   (store_id, created_at DESC) 인덱스가 있으므로 기간 필터가 싸다.
    const since = new Date(Date.now() - CTA_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error: eErr } = await supabaseAdmin
      .from('pseo_events')
      .select('store_id, cta_type')
      .gte('created_at', since)
      .limit(20000);

    if (eErr) {
      return res.status(200).json({
        ok: false,
        diag: { ...diag, step: 'events', error_code: eErr.code, error_message: eErr.message },
        rows: [], kpi: null, count: 0,
      });
    }

    const ctaByStore = new Map();
    for (const ev of events || []) {
      const sid = ev.store_id;
      if (sid === null || sid === undefined) continue;
      if (!ctaByStore.has(sid)) ctaByStore.set(sid, { total: 0 });
      const bucket = ctaByStore.get(sid);
      bucket.total += 1;
      const t = String(ev.cta_type || '');
      bucket[t] = (bucket[t] || 0) + 1;
    }

    // ── 3) 업체별 판정 ───────────────────────────────────────
    //   [PSEO-ADMIN-N1-LATENCY-01] store 단위로 최대 6건 동시 처리.
    //   판정 순서·호출 함수·상수는 패치 전과 동일하다. 바뀐 것은 실행 구조뿐.
    const storeList = stores || [];
    const rows = await mapWithLimit(storeList, STORE_CONCURRENCY, async (s) => {
      // 공개 차단 사유는 공개 페이지와 같은 순서로 판정한다.
      //   배제 → 비활성 → 계정 없음 → 유료 자격.
      let reason;
      if (EXCLUDED_STORE_IDS.includes(s.id)) {
        reason = 'EXCLUDED';
      } else if (s.status !== 'active') {
        reason = 'STORE_INACTIVE';
      } else if (!s.account_id) {
        reason = 'NO_ACCOUNT';
      } else {
        const elig = await isPseoEligible(s.account_id);
        reason = elig.reason;
      }

      // Intent 수 / 글수 — account_id 가 없으면 조회 자체를 하지 않는다.
      //   글수는 countPublishedPosts() 단일 함수 경유. 쿼리를 여기에 복제하지 않는다.
      //   [PSEO-ADMIN-N1-LATENCY-01] 두 조회는 서로 독립(account_id 만 필요)이므로
      //   병렬로 돌린다. 순서 의존이 없으며 결과 값도 달라지지 않는다.
      let intentCount = 0;
      let postCount = 0;
      if (s.account_id) {
        const [qualified, published] = await Promise.all([
          listQualifiedIntents(supabaseAdmin, s.account_id, { limit: 500 }),
          countPublishedPosts(supabaseAdmin, s.account_id),
        ]);
        intentCount = qualified.length;
        postCount = published;
      }

      // [PSEO-EMPTY-HUB-01] 허브 최소 글수 Gate.
      //   공개 페이지(index.js)와 동일 순서·동일 함수·동일 상수.
      //   유료 판정 통과 이후에만 적용한다 — 다른 차단 사유를 덮어쓰지 않는다.
      if (reason === 'PAID' && postCount < MIN_HUB_POSTS) {
        reason = 'NO_POSTS';
      }
      const isPublic = reason === 'PAID';

      const cta = ctaByStore.get(s.id) || { total: 0 };

      return {
        store_id: s.id,
        account_id: s.account_id,
        store_name: s.store_name || '',
        industry: s.industry || '',
        region: [s.region, s.sub_region].filter(Boolean).join(' · '),
        status: s.status,
        is_public: isPublic,
        reason,
        reason_label: REASON_LABEL[reason] ?? reason,
        intent_count: intentCount,
        post_count: postCount,
        cta: {
          page_view: cta.page_view || 0,
          phone_click: cta.phone_click || 0,
          post_click: cta.post_click || 0,
          total: cta.total || 0,
        },
      };
    });

    // ── 4) KPI ───────────────────────────────────────────────
    const kpi = {
      public_count: rows.filter((r) => r.is_public).length,
      blocked_count: rows.filter((r) => !r.is_public).length,
      intent_total: rows.reduce((a, r) => a + r.intent_count, 0),
      cta_window: rows.reduce((a, r) => a + r.cta.total, 0),
      // 관제 관점에서 가장 중요한 대비 — 실적은 있는데 공개가 막힌 업체 수.
      blocked_with_cta: rows.filter((r) => !r.is_public && r.cta.total > 0).length,
    };

    return res.status(200).json({
      ok: true,
      diag: { ...diag, ms: Date.now() - t0, stores: rows.length, events: (events || []).length },
      kpi,
      rows,
      count: rows.length,
    });
  } catch (e) {
    // 오류를 빈 목록으로 삼키지 않는다. 화면에 사유가 그대로 뜨게 한다.
    return res.status(200).json({
      ok: false,
      diag: { ...diag, ms: Date.now() - t0, exception: e && e.message ? e.message : String(e) },
      rows: [], kpi: null, count: 0,
    });
  }
}
