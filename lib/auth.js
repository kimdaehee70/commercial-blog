// lib/auth.js
// 카카오 OAuth — Supabase Auth 내장 사용
// Supabase Studio > Authentication > Providers > Kakao 활성화 필요

import { supabase } from './supabase';
import { clearAnonToken } from './store/bootstrap';

// ── 카카오 로그인 시작 ─────────────────────────────────────
export async function loginWithKakao() {
  if (typeof window === 'undefined') return;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    console.error('[auth] kakao login error:', error);
    throw error;
  }
}

// ── 로그아웃 ─────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut();
  // 익명 토큰도 제거 (재시작 시 새 익명 store 발급)
  clearAnonToken();
}

// ── 현재 세션 사용자 ─────────────────────────────────────
export async function getCurrentAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── 인증 상태 변화 구독 ──────────────────────────────────
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => subscription.unsubscribe();
}
