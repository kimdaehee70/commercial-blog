// pages/admin/usage.js
// 52차 — legacy redirect stub
// 변경 vs 44차-A:
//   1) 기존 코드 전체는 usage.js.bak_52cha로 백업 보존 (PHILOSOPHY: 삭제 ❌ / 부드러운 전환 ⭕)
//   2) 본 파일은 /admin/accounts-usage로 자동 redirect (1초 안내 후 이동)
//   3) 북마크/직접 URL 접근 안전 — 운영 혼선 제거
//
// 신 spine: /admin/accounts-usage (auth_user_id + accounts 단일)
// 폐기 spine: /api/usage/by-blog-account (blog_account 기반, 44차 legacy)

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminUsageLegacy() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/admin/accounts-usage');
    }, 1000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>📦</div>
        <div style={styles.title}>이 페이지는 이전되었습니다</div>
        <div style={styles.sub}>
          <code style={styles.code}>/admin/usage</code> →{' '}
          <code style={styles.code}>/admin/accounts-usage</code>
        </div>
        <div style={styles.note}>잠시 후 자동 이동합니다…</div>
        <a href="/admin/accounts-usage" style={styles.btn}>
          지금 이동 →
        </a>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f1115',
    color: '#e6e8eb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#161a20',
    border: '1px solid #2a2f38',
    borderRadius: 12,
    padding: '36px 40px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
  },
  icon: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 600, marginBottom: 12, color: '#e6e8eb' },
  sub: { fontSize: 13, color: '#9ca3af', marginBottom: 20, lineHeight: 1.7 },
  code: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: 12,
    color: '#a5d8ff',
    background: '#0f1115',
    padding: '3px 8px',
    borderRadius: 4,
  },
  note: { fontSize: 12, color: '#6b7280', marginBottom: 20 },
  btn: {
    display: 'inline-block',
    background: '#2563eb',
    color: '#fff',
    textDecoration: 'none',
    padding: '9px 18px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
  },
};
