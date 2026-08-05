// pages/signup.js
// 110차 v0.3 — 즉시세션 가입 동선 정렬 (login.js 107차 / callback.js 109차와 1:1 일치)
//   변경 vs 57차:
//     1) resolveLanding(role) 추가 — owner→/admin/publish, 그 외(user 등)→/dashboard
//        (기존: 가입 성공 시 무조건 /admin/publish 직행 → 신규 user가 owner 콘솔로 착지하던 버그)
//     2) enforceActiveStatus(ensured) 추가 — active 외 상태 강제 로그아웃 + 차단 (login.js 58차와 동일)
//     3) 착지 분기: ensure 응답 j.role 사용 (추가 조회 불필요)
//   ※ confirm 활성 환경(세션 없음)은 종전대로 메일 확인 안내만 → 동선 분기 대상 아님
//   FREEZE 준수: 엔진/publish.js/ensure.js/callback.js 무영향 (ensure 응답만 추가 소비)
//
// 57차 v0.2: 클라이언트 직접 INSERT 제거 → /api/account/ensure 호출로 교체
//   - 기존: supabase.from('accounts').insert() 클라이언트 직접 호출 → RLS 401
//   - 변경: signUp 성공 후 access_token 확보 → ensure API (service_role) 호출
//   - ensure.js와 callback.js는 FREEZE 유지
//   - 이메일 confirm 활성 환경에서는 세션 없음 → INSERT 보류 (callback에서 처리)
//
// 46차 v0.1: signup 직후 클라이언트 INSERT (RLS 충돌로 실패 확인됨)

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// 110차 — role별 진입 동선 (login.js 107차 resolveLanding / callback.js 109차와 1:1 동일)
// owner → /admin/publish (운영 콘솔) / 그 외(user 등) → /dashboard (내 운영 현황)
// role 출처: ensure 응답(j.role). 추가 조회 불필요.
function resolveLanding(role) {
  return role === 'owner' ? '/admin/publish' : '/';
}

// 110차 — status 가드 (login.js 58차 enforceActiveStatus와 동일 규약)
// active가 아닌 경우 강제 로그아웃 + 차단 사유 반환
async function enforceActiveStatus(ensured) {
  if (!ensured?.ok) return { blocked: false };
  if (ensured.status && ensured.status !== 'active') {
    await supabase.auth.signOut();
    return {
      blocked: true,
      reason: ensured.status,
      message: `계정 상태가 "${ensured.status}" 입니다. 관리자에게 문의하세요.`,
    };
  }
  return { blocked: false };
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setErr('');

    if (!email || !password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }
    if (password.length < 6) {
      setErr('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // ── confirm 활성 환경 — session 없음 ─────────────────
    // accounts INSERT는 사용자가 메일 확인 후 첫 로그인 시 callback/login에서 ensure 호출로 처리
    if (data?.user && !data?.session) {
      setMsg(`가입 요청 완료. ${email} 메일함에서 확인 링크를 클릭한 뒤 로그인하세요.`);
      return;
    }

    // ── confirm 비활성 환경 — 즉시 세션 발급 ──────────────
    // /api/account/ensure 호출 → accounts row 보장 (service_role 사용)
    if (data?.session) {
      let ensured;
      try {
        const r = await fetch('/api/account/ensure', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        ensured = await r.json();
        if (!ensured.ok) {
          console.error('[signup] ensure failed:', ensured);
          setErr(`가입은 됐지만 계정 연결 실패: ${ensured.error || 'unknown'} ${ensured.detail || ''}`);
          return;
        }
        console.log(`[signup] ✓ accounts ${ensured.action}: id=${ensured.id} role=${ensured.role || '-'} status=${ensured.status || '-'}`);
      } catch (e) {
        console.error('[signup] ensure exception:', e);
        setErr(`가입은 됐지만 계정 연결 호출 실패: ${e.message}`);
        return;
      }

      // 110차 — status 가드 (active 외 차단). 가입 직후엔 보통 active지만 규약 일치 위해 적용.
      const guard = await enforceActiveStatus(ensured);
      if (guard.blocked) {
        setErr(guard.message);
        return;
      }

      // 110차 — role별 착지 (owner→/admin/publish, user→/dashboard)
      const landing = resolveLanding(ensured.role);
      setMsg(`가입 + 로그인 완료. 이동합니다... (role: ${ensured.role || 'user'})`);
      setTimeout(() => {
        window.location.href = landing;
      }, 1000);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>회원가입</h1>
        <p style={styles.sub}>commercial-blog 운영 콘솔</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={styles.input}
            autoComplete="email"
          />

          <label style={styles.label}>비밀번호 (최소 6자)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            style={styles.input}
            autoComplete="new-password"
          />

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        {msg && <div style={styles.msgOk}>{msg}</div>}
        {err && <div style={styles.msgErr}>{err}</div>}

        <div style={styles.footer}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" style={styles.link}>로그인</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f6f7f8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 32,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0, color: '#111' },
  sub: { fontSize: 13, color: '#6b7280', margin: '4px 0 24px' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, color: '#374151', marginBottom: 6, marginTop: 12, fontWeight: 500 },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  btn: {
    marginTop: 20,
    padding: '11px 0',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  msgOk: {
    marginTop: 16,
    padding: 12,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: 6,
    fontSize: 13,
  },
  msgErr: {
    marginTop: 16,
    padding: 12,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 6,
    fontSize: 13,
  },
  footer: { marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
};
