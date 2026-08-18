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
    // [SUBSCRIBE-OVERAGE-TEXT-UNBACKED-01] overage_per_post_krw 응답 제외.
    //   후불 초과청구는 제공하지 않는다(상품정책 A). 사용자 화면에 공급될 이유가 없다.
    //   ★ DB 컬럼은 삭제하지 않는다 — lib/billing/plans.js fallback · estimate.js(관리자)가 참조한다.
    //   실측: 이 응답의 해당 필드를 읽던 곳은 subscribe.js 1곳뿐이며 함께 제거됨.
    .select('id, label, monthly_quota, price_krw, description, sort_order')
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
