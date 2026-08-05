// lib/supabaseAdmin.js
// Supabase Admin 클라이언트 (service_role)
// ⚠️ 서버 전용 — 클라이언트 컴포넌트에서 절대 import 금지
// 사용처: pages/api/* 핸들러에서만

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.warn('[supabaseAdmin] env 누락 — SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
