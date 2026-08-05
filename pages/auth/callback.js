// pages/auth/callback.js
// 109차 수정 (v51) — 카카오 OAuth 진입 role 분기 (login.js 107차 동선 이식)
// 변경 vs v50:
//   1) resolveLanding(role) 추가 (login.js와 동일: owner→/admin/publish, else→/dashboard)
//   2) 정상 진입 redirect '/' 고정 → resolveLanding(j.role)로 교체
//   ※ ensure 응답 j.role 이미 존재(로그 출력 중) → 추가 조회 불필요
// FREEZE 준수: 엔진/publish.js/ensure.js 무영향 (응답만 추가 소비)

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

// 109차 — role별 진입 동선 (login.js 107차 resolveLanding과 1:1 동일)
// owner → /admin/publish (운영 콘솔) / 그 외(user 등) → /dashboard
// role 출처: ensure 응답(j.role). 추가 조회 불필요.
function resolveLanding(role) {
  return role === 'owner' ? '/admin/publish' : '/';
}

async function enforceActiveStatus(ensured) {
  if (!ensured?.ok) return { blocked: false };
  if (ensured.status && ensured.status !== 'active') {
    await supabase.auth.signOut();
    return {
      blocked: true,
      reason: ensured.status,
    };
  }
  return { blocked: false };
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 1) Supabase가 URL 토큰을 자동 파싱 (detectSessionInUrl: true)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('[callback] no session detected');
        router.replace('/?auth_error=1');
        return;
      }

      // 2) /api/account/ensure 호출 — accounts row 보장
      let landingRole = 'user'; // 109차 — 정상 진입(try 밖)에서 role 사용 위해 끌어올림
      try {
        const r = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        const j = await r.json();
        if (!j.ok) {
          console.error('[callback] ensure failed:', j);
          router.replace('/?ensure_error=1');
          return;
        }
        console.log(`[callback] accounts ${j.action}: id=${j.id} role=${j.role || '-'} status=${j.status || '-'}`);

        // 3) status 가드 — active 외 차단
        const guard = await enforceActiveStatus(j);
        if (guard.blocked) {
          console.warn(`[callback] blocked: status=${guard.reason}`);
          router.replace(`/login?blocked=${encodeURIComponent(guard.reason)}`);
          return;
        }

        // 109차 — 가드 통과 후 role 확정 (try 밖 정상 진입에서 사용)
        landingRole = j.role || 'user';
      } catch (e) {
        console.error('[callback] ensure exception:', e);
        router.replace('/?ensure_error=2');
        return;
      }

      // 4) 정상 진입 — 109차 role별 동선 (owner→/admin/publish, else→/dashboard)
      const landing = resolveLanding(landingRole);
      console.log(`[callback] landing: role=${landingRole} → ${landing}`);
      setTimeout(() => router.replace(landing), 200);
    })();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: 16,
      background: '#fff8f0',
    }}>
      <div style={{ fontSize: 32 }}>🍲</div>
      <div style={{ color: '#888', fontSize: 14 }}>계정 정보를 확인하는 중...</div>
    </div>
  );
}
