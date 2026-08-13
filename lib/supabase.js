// lib/supabase.js
// Supabase 클라이언트 (싱글톤)
// 사용처: 클라이언트 컴포넌트, API 라우트 양쪽

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabase] env 누락 — NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── [SESSION-EXPIRE-01] 세션 복구 1회 + 실패 시 로그인 상태 동시 종료 ──────
//   증상: getSession()이 null인데 UI는 로그인 유지 → "세션이 만료되었습니다"만 뜨고
//         화면은 로그인 상태 그대로 남아 사용자가 원인을 알 수 없다.
//   ★ 정상 세션은 기존과 완전 동일 비용 — refreshSession()을 매 요청마다 부르지 않는다.
//     null일 때만 1회 복구하고, 그래도 실패하면 signOut()으로 UI 상태를 맞춘다.
//   ★ auth.getSession() 호출부는 21곳. 이번 축은 index.js 2곳만 연결한다.
//     나머지는 인증 helper 통합 축에서 일괄 정리(호출부 1줄 치환이라 무비용).
export async function getFreshToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;   // 정상 → 복구 미시도
  } catch (e) {
    console.warn("[session] getSession 실패:", e?.message);
  }
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data?.session?.access_token) return data.session.access_token;
  } catch (e) {
    console.warn("[session] refreshSession 실패:", e?.message);
  }
  try { await supabase.auth.signOut(); } catch {}             // 복구 불가 → 로그인 상태 종료
  return null;
}
