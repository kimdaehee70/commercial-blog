// pages/admin/dashboard.js
// [ADMIN-DASHBOARD-500-01] 이 경로에 API 핸들러 코드(pages/api/admin/dashboard.js 사본)가
//   들어 있어 페이지 렌더 시 req.method 접근에서 예외 → 500 Internal Server Error 가 났다.
//   · 정본 API 는 pages/api/admin/dashboard.js 에 그대로 있다(무접촉).
//   · 대시보드 화면은 현재 미사용이므로 기능을 복구하지 않는다. 500 제거만 한다.
//   · 삭제(404)가 아니라 redirect 인 이유 — 운영 콘솔 상단 네비에 「대시보드」 링크가 살아 있다.
//     404 로 바꾸는 것은 오류를 다른 오류로 옮기는 것일 뿐이다.
//   · 목적지 = /admin/members (실제 운영 회원관리 경로. 실측 확인).
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/members');
  }, [router]);
  return null;
}
