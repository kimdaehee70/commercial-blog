// pages/api/test-supabase.js
// Dev DB 연결 확인 + publish_history insert 테스트 (v2 — 에러 상세화)

import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  const result = {
    env_check: {},
    connection_test: null,
    insert_test: null,
    select_test: null,
    cleanup: null,
  };

  result.env_check = {
    url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    url_value: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    service_key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    service_key_prefix: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 15) + '...'
      : null,
    service_key_length: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.length
      : 0,
  };

  if (!result.env_check.url_present || !result.env_check.service_key_present) {
    return res.status(500).json({ ok: false, stage: 'env_missing', result });
  }

  try {
    const { data, count, error, status, statusText } = await supabaseAdmin
      .from('publish_history')
      .select('*', { count: 'exact', head: true });

    console.log('[test-supabase] connection raw:', { data, count, error, status, statusText });

    if (error) {
      result.connection_test = {
        ok: false,
        error_message: error.message || '(empty)',
        error_code: error.code || null,
        error_details: error.details || null,
        error_hint: error.hint || null,
        status: status || null,
        statusText: statusText || null,
        full_error: JSON.stringify(error),
      };
      return res.status(500).json({ ok: false, stage: 'connection_failed', result });
    }

    result.connection_test = { ok: true, current_row_count: count, status };
  } catch (e) {
    console.error('[test-supabase] exception:', e);
    result.connection_test = {
      ok: false,
      error_message: e.message || '(no message)',
      error_name: e.name || null,
      error_stack: e.stack ? e.stack.split('\n').slice(0, 5).join('\n') : null,
    };
    return res.status(500).json({ ok: false, stage: 'connection_exception', result });
  }

  let insertedId = null;
  try {
    const testRow = {
      industry: 'test',
      cluster: 'connection_check',
      title: '[TEST] Dev DB 연결 확인용 — 삭제 예정',
      body_text: 'connection + insert 동작 확인용.',
      publish_status: 'draft',
      qc_detail: { test: true, timestamp: new Date().toISOString() },
    };

    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .insert(testRow)
      .select()
      .single();

    if (error) {
      result.insert_test = {
        ok: false,
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        error_hint: error.hint,
      };
      return res.status(500).json({ ok: false, stage: 'insert_failed', result });
    }
    insertedId = data.id;
    result.insert_test = { ok: true, inserted_id: data.id };
  } catch (e) {
    result.insert_test = { ok: false, error_message: e.message };
    return res.status(500).json({ ok: false, stage: 'insert_exception', result });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('publish_history')
      .select('id, industry, title, publish_status, created_at')
      .eq('id', insertedId)
      .single();

    if (error) throw error;
    result.select_test = { ok: true, row: data };
  } catch (e) {
    result.select_test = { ok: false, error_message: e.message };
  }

  try {
    const { error } = await supabaseAdmin
      .from('publish_history')
      .delete()
      .eq('id', insertedId);

    if (error) throw error;
    result.cleanup = { ok: true, deleted_id: insertedId };
  } catch (e) {
    result.cleanup = { ok: false, error_message: e.message };
  }

  return res.status(200).json({ ok: true, stage: 'all_passed', result });
}
