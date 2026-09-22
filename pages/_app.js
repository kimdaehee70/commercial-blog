// pages/_app.js
// StoreProvider로 전체 앱 wrap
// 기존 _app.js가 있다면 StoreProvider만 추가하세요
//
// [ADMIN-ROUTE-AUTH-GATE-01 FIX-A] /admin, /admin/* 진입 Gate (클라이언트)
//   - 판정 전(checking)      → null 렌더 (관리자 Layout/메뉴 0프레임)
//   - owner(admin 포함)       → 기존 페이지 그대로 렌더
//   - non-owner / 판정 실패   → router.replace('/')
//   - unauth(세션 없음)       → router.replace('/login') (기존 admin 페이지 동작 보존)
//   - 판정 기준 = lib/useAdminGuard (무수정 재사용)
//   - 일반 페이지 경로는 Gate 미경유 → 동작 불변
//   - 서버측 차단 아님: API 는 각 /api/admin/* requireOwner/requireRole 이 담당

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { StoreProvider } from '../contexts/StoreContext';
import { useAdminGuard } from '../lib/useAdminGuard';

function isAdminPath(pathname) {
  return pathname === '/admin' || (pathname || '').startsWith('/admin/');
}

function AdminGate({ children }) {
  const router = useRouter();
  const { authState, loading } = useAdminGuard();

  useEffect(() => {
    if (loading) return;
    if (authState === 'owner') return;
    router.replace(authState === 'unauth' ? '/login' : '/');
  }, [authState, loading, router]);

  if (authState !== 'owner') return null;
  return children;
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const page = <Component {...pageProps} />;

  return (
    <StoreProvider>
      {isAdminPath(router.pathname) ? <AdminGate>{page}</AdminGate> : page}
    </StoreProvider>
  );
}
