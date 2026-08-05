// pages/api/store-industry.js
// v124: 업종(industry) 전용 변경 API — store.js(FREEZE) 무접촉 우회 경로.
// 정책:
//   - owner만 변경 가능 (role==='owner' || auth_user_id===OWNER_UID). 비owner 차단.
//   - store_profiles.industry / store_name PATCH (account_id 매칭).
//   - 변경 이력 industry_change_logs insert (from/to + changed_by).
//   - store.js / me.js 등 엔진 FREEZE 파일 미접촉.
// 인증·supabase 초기화 패턴은 check-quota.js와 동일.

import { createClient } from '@supabase/supabase-js';
import { OWNER_UID } from '../../lib/constants';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // 1. 입력 추출
    const auth_user_id =
      req.body?.auth_user_id || req.headers['x-uid'] || null;
    const next_industry = (req.body?.industry || '').trim();
    const next_store_name =
      req.body?.store_name != null ? String(req.body.store_name).trim() : null;

    if (!auth_user_id) {
      return res.status(400).json({ ok: false, error: 'AUTH_USER_ID_REQUIRED' });
    }
    if (!next_industry) {
      return res.status(400).json({ ok: false, error: 'INDUSTRY_REQUIRED' });
    }

    // 2. Supabase 연결 (service_role)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ ok: false, error: 'SUPABASE_ENV_MISSING' });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // 3. accounts 조회 (owner 판별)
    const { data: account, error: accErr } = await supabase
      .from('accounts')
      .select('id, role, status')
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (accErr) throw accErr;
    if (!account) {
      return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
    }

    // 4. owner 권한 강제 (비owner 차단)
    const isOwner = account.role === 'owner' || auth_user_id === OWNER_UID;
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: 'FORBIDDEN_NOT_OWNER',
        reason: 'industry change is owner-only',
      });
    }

    // 5. 현재 store_profiles 조회 (from 값 확보 + 존재 확인)
    const { data: profile, error: profErr } = await supabase
      .from('store_profiles')
      .select('id, industry, store_name')
      .eq('account_id', account.id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: 'STORE_PROFILE_NOT_FOUND',
        account_id: account.id,
      });
    }

    const from_industry = profile.industry || null;
    const from_store_name = profile.store_name || null;

    // 6. 무변경 가드 (industry 동일 + store_name 미변경)
    const storeNameChanged =
      next_store_name != null && next_store_name !== from_store_name;
    if (from_industry === next_industry && !storeNameChanged) {
      return res.status(200).json({
        ok: true,
        changed: false,
        reason: 'NO_CHANGE',
        account_id: account.id,
        industry: from_industry,
        store_name: from_store_name,
      });
    }

    // 7. store_profiles PATCH (industry + store_name)
    const patch = { industry: next_industry, updated_at: new Date().toISOString() };
    if (next_store_name != null) patch.store_name = next_store_name;

    const { data: updated, error: updErr } = await supabase
      .from('store_profiles')
      .update(patch)
      .eq('account_id', account.id)
      .select('id, industry, store_name')
      .maybeSingle();

    if (updErr) throw updErr;

    // 8. 이력 기록 (industry_change_logs) — 실패해도 PATCH는 유지(best-effort)
    let logged = true;
    try {
      const { error: logErr } = await supabase
        .from('industry_change_logs')
        .insert({
          account_id: account.id,
          from_industry,
          to_industry: next_industry,
          from_store_name,
          to_store_name: next_store_name != null ? next_store_name : from_store_name,
          changed_by: auth_user_id,
        });
      if (logErr) {
        logged = false;
        console.error('[store-industry] log insert failed:', logErr);
      }
    } catch (logEx) {
      logged = false;
      console.error('[store-industry] log insert exception:', logEx);
    }

    return res.status(200).json({
      ok: true,
      changed: true,
      account_id: account.id,
      industry: updated?.industry ?? next_industry,
      store_name: updated?.store_name ?? next_store_name,
      from_industry,
      logged,
    });
  } catch (e) {
    console.error('[store-industry] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'STORE_INDUSTRY_FAILED',
      detail: e.message,
    });
  }
}
