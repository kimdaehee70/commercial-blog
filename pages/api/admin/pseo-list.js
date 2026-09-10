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
// N+1 주의: 업체 1건마다 eligibility 판정 1회 + Intent 집계 1회 + 글수 1회.
//   현재 17행 규모라 허용한다(승인분). 100행을 넘으면 재검토 대상이며,
//   그때도 판정 규칙을 여기에 복제하는 방식은 택하지 않는다.
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';
import { isPseoEligible, listQualifiedIntents, MIN_POSTS } from '../../../lib/pseo/eligibility';

// 공개 페이지(index.js / [intentSlug].js)의 배제 목록과 같은 값.
//   store 1 = OWNER 전업종 혼합 테스트 계정.
const EXCLUDED_STORE_IDS = [1];

// CTA 집계 창. KPI 와 표가 같은 창을 쓴다(두 값이 어긋나면 읽는 사람이 혼란스럽다).
const CTA_WINDOW_DAYS = 7;

// 표에 세는 CTA 3종. 나머지 타입(sms_click / directions_click)은 total 에만 합산.
const CTA_COLS = ['page_view', 'phone_click', 'post_click'];

// 차단 사유 → 화면 라벨. eligibility 의 reason 을 그대로 받고 여기서만 번역한다.
const REASON_LABEL = {
  EXCLUDED: '테스트 계정 배제',
  STORE_INACTIVE: '업체 비활성',
  NO_ACCOUNT: '계정 연결 없음',
  BASIS_LIFETIME: 'FREE 체험',
  BASIS_CALENDAR: '유효 구독 없음',
  BASIS_NULL: '판정 불가',
  PLAN_NOT_PAID: '무료 플랜',
  PAID: '',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  const diag = {
    version: 'v0.1',
    min_posts: MIN_POSTS,
    cta_window_days: CTA_WINDOW_DAYS,
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
    const rows = [];
    for (const s of stores || []) {
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
      const isPublic = reason === 'PAID';

      // Intent 수 / 글수 — account_id 가 없으면 조회 자체를 하지 않는다.
      let intentCount = 0;
      let postCount = 0;
      if (s.account_id) {
        const qualified = await listQualifiedIntents(supabaseAdmin, s.account_id, { limit: 500 });
        intentCount = qualified.length;

        const { count, error: pErr } = await supabaseAdmin
          .from('publish_history')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', s.account_id)
          .eq('publish_status', 'published')
          .is('deleted_at', null);
        if (pErr) throw new Error(`PSEO_ADMIN_POSTS_FAILED code=${pErr.code} msg=${pErr.message}`);
        postCount = count || 0;
      }

      const cta = ctaByStore.get(s.id) || { total: 0 };

      rows.push({
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
      });
    }

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
