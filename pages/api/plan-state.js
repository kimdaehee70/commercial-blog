// pages/api/plan-state.js
// v1.0 — 발행비율/달력계획 계정 영속화 (D-5 축①)
//
// 목적: savedWeights·activePlan·menuWeights·extraMenus·myMenus 를 accounts.plan_state(jsonb)에 보존.
//   로그아웃/재로그인/타 PC 로그인에도 복원된다.
//
// 계약:
//   GET  /api/plan-state           → { ok, plan_state: {...}|null, updated_at }
//   PUT  /api/plan-state  body:{ plan_state } → { ok, saved:true }
//
// 원칙:
//   - me.js / guards.js / store.js 무수정 (FREEZE 유지). requireAuth만 재사용.
//   - accounts 테이블 plan_state 1컬럼만 사용. 다른 컬럼 미수정.
//   - 저장 실패해도 프론트 동작을 막지 않는다(프론트는 localStorage 캐시 병행).
//
// 스키마 전제:
//   ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plan_state jsonb;

import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../lib/guards';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 저장 허용 키 화이트리스트 — 임의 페이로드 누적 방지
const ALLOWED_KEYS = [
  'menuWeights',
  'savedWeights',
  'activePlan',
  'extraMenus',
  'myMenusMap',
  'industry',
  'calMonth',
];

const MAX_BYTES = 256 * 1024; // 256KB 상한 (달력 계획 기준 충분)

function sanitize(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const k of ALLOWED_KEYS) {
    if (k in input) out[k] = input[k];
  }
  out._v = 1;
  out._savedAt = new Date().toISOString();
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase_env_missing' });
  }

  // 인증 — guards.requireAuth (실패 시 내부에서 401 전송)
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 계정 식별 — auth_user_id → accounts.id (me.js와 동일 규약)
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, plan_state, updated_at')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (accErr) {
      return res.status(500).json({ ok: false, error: 'accounts_select_failed', detail: accErr.message });
    }
    if (!account) {
      return res.status(404).json({ ok: false, error: 'account_not_found' });
    }

    // ── GET ──
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        plan_state: account.plan_state || null,
        updated_at: account.updated_at || null,
      });
    }

    // ── PUT ──
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }
    const incoming = body && body.plan_state !== undefined ? body.plan_state : body;

    // null 명시 = 초기화(리셋 버튼 경로)
    if (incoming === null) {
      const { error: upErr } = await supabase
        .from('accounts')
        .update({ plan_state: null })
        .eq('id', account.id);
      if (upErr) {
        return res.status(500).json({ ok: false, error: 'plan_state_clear_failed', detail: upErr.message });
      }
      return res.status(200).json({ ok: true, saved: true, cleared: true });
    }

    const clean = sanitize(incoming);
    if (!clean) {
      return res.status(400).json({ ok: false, error: 'invalid_plan_state' });
    }

    const bytes = Buffer.byteLength(JSON.stringify(clean), 'utf8');
    if (bytes > MAX_BYTES) {
      return res.status(413).json({ ok: false, error: 'plan_state_too_large', bytes });
    }

    const { error: upErr } = await supabase
      .from('accounts')
      .update({ plan_state: clean })
      .eq('id', account.id);

    if (upErr) {
      return res.status(500).json({ ok: false, error: 'plan_state_update_failed', detail: upErr.message });
    }

    return res.status(200).json({ ok: true, saved: true, bytes });
  } catch (err) {
    console.error('[plan-state] error:', err);
    return res.status(500).json({ ok: false, error: 'internal_error', detail: String(err?.message || err) });
  }
}
