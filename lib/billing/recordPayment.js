// lib/billing/recordPayment.js
// v0.1 — 81차 신규 (billing_events INSERT helper / 멱등성 / try-catch 격리)
//
// 입력: { pg, imp_uid, event_type, account_id, status, payload, error_message }
// 동작:
//   1) billing_events INSERT (created_at default / processed_at = NULL)
//   2) UNIQUE(pg, imp_uid) 충돌 시 → skipped: true 반환 (멱등성)
//   3) 기타 에러 → ok: false 반환 (호출자 격리)
// 출력:
//   성공 신규: { ok: true, event_id: <id>, skipped: false }
//   성공 중복: { ok: true, event_id: <existing_id>, skipped: true }
//   실패:     { ok: false, error: <message> }
//
// 호출 예: webhook handler / 결제 완료 콜백
// 호출처 (예정): pages/api/billing/webhook/portone.js v0.1+

import { supabaseAdmin } from '../supabaseAdmin';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export async function recordPayment({
  pg,
  imp_uid,
  event_type,
  account_id = null,
  status,
  payload = null,
  error_message = null,
}) {
  // 1) 필수 입력 검증 (스키마 NOT NULL 추정 4컬럼)
  if (!pg || !imp_uid || !event_type || !status) {
    return {
      ok: false,
      error: 'missing_required_field (pg / imp_uid / event_type / status)',
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('billing_events')
      .insert({
        pg,
        imp_uid,
        event_type,
        account_id,
        status,
        payload,
        error_message,
      })
      .select('id')
      .single();

    // 2) UNIQUE(pg, imp_uid) 충돌 → 멱등성 skip
    if (error && error.code === POSTGRES_UNIQUE_VIOLATION) {
      // 기존 row id 조회 (호출자 알림용)
      const { data: existing, error: selErr } = await supabaseAdmin
        .from('billing_events')
        .select('id')
        .eq('pg', pg)
        .eq('imp_uid', imp_uid)
        .single();

      if (selErr) {
        console.warn('[recordPayment] unique violation but select failed:', selErr.message);
        return { ok: true, event_id: null, skipped: true };
      }
      return { ok: true, event_id: existing?.id ?? null, skipped: true };
    }

    // 3) 기타 에러
    if (error) {
      console.error('[recordPayment] insert failed:', error.message);
      return { ok: false, error: error.message };
    }

    // 4) 신규 INSERT 성공
    return { ok: true, event_id: data?.id ?? null, skipped: false };
  } catch (e) {
    console.error('[recordPayment] exception:', e.message);
    return { ok: false, error: e.message };
  }
}

export default recordPayment;
