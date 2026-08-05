// pages/api/billing/plans.js
// 활성 플랜 목록 조회 — 공개 (read-only)
// subscribe 페이지에서 호출. 인증 불필요.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('plans')
    .select('id, label, monthly_quota, price_krw, overage_per_post_krw, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[plans] query error', error);
    return res.status(500).json({ error: 'query failed' });
  }

  return res.status(200).json({
    ok: true,
    plans: data || [],
  });
}
