// pages/signup.js
// v0.4 — EMAIL-CONFIRM-REDIRECT-ENSURE-MISSING-01 : emailRedirectTo 명시
//   변경 vs v0.3 (110차):
//     1) signUp() options.emailRedirectTo = `${origin}/auth/callback` 추가. 그 외 무변경.
//
//   배경 (Confirm email ON 전환으로 드러난 연결 누락):
//     Confirm email OFF 시절엔 가입 즉시 세션이 나와 이 파일이 직접 ensure 를 호출했다.
//     ON 으로 바꾸자 세션이 없는 분기로 흐르고, 인증메일 링크가 Supabase Site URL
//     (https://ai-post.ai = pages/index.js) 로 착지했다. index.js 에는 ensure 호출이 없다.
//     결과: auth.users 는 email_confirmed_at 이 찍히고 로그인도 되는데
//           accounts 행이 생성되지 않았다. (실측: auth 1행 / accounts 0행)
//
//   Site URL 을 /auth/callback 으로 바꾸는 방식(A안)은 기각.
//     Site URL 은 비밀번호 재설정 등 다른 메일 템플릿의 기본 착지에도 쓰인다.
//     가입 인증메일에만 국한해서 지정하는 것이 정확하다.
//
//   착지 후 흐름 (pages/auth/callback.js 기존 구현, 무수정):
//     getSession → /api/account/ensure → accounts INSERT (plan=free)
//     → enforceActiveStatus → resolveLanding(role)
//
//   FREEZE 준수: ensure.js / callback.js / login.js / 엔진 / publish.js 무영향
//
// ── 이하 110차 v0.3 주석 유지 ──
// 110차 v0.3 — 즉시세션 가입 동선 정렬 (login.js 107차 / callback.js 109차와 1:1 일치)
//     1) resolveLanding(role) — owner→/admin/publish, 그 외→/
//     2) enforceActiveStatus(ensured) — active 외 강제 로그아웃
//     3) 착지 분기: ensure 응답 j.role 사용
// 57차 v0.2: 클라이언트 직접 INSERT 제거 → /api/account/ensure 호출로 교체
// 46차 v0.1: signup 직후 클라이언트 INSERT (RLS 충돌로 실패 확인됨)

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// 110차 — role별 진입 동선 (login.js 107차 resolveLanding / callback.js 109차와 1:1 동일)
function resolveLanding(role) {
  return role === 'owner' ? '/admin/publish' : '/';
}

// 110차 — status 가드 (login.js 58차 enforceActiveStatus와 동일 규약)
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
    // EMAIL-CONFIRM-REDIRECT-ENSURE-MISSING-01
    // emailRedirectTo 미지정 시 Supabase Site URL(= /) 로 착지하여 ensure 가 호출되지 않는다.
    // /auth/callback 은 Redirect URLs 의 https://ai-post.ai/** 로 이미 허용돼 있다.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    // ── confirm 활성 환경 — session 없음 (현행 정본 경로) ─────────────
    // accounts INSERT 는 인증링크 클릭 후 /auth/callback 의 ensure 호출로 처리된다.
    if (data?.user && !data?.session) {
      setMsg(`가입 요청 완료. ${email} 메일함에서 확인 링크를 클릭한 뒤 로그인하세요.`);
      return;
    }

    // ── confirm 비활성 환경 — 즉시 세션 발급 (현재 미사용 경로, 회귀 대비 유지) ──
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

      const guard = await enforceActiveStatus(ensured);
      if (guard.blocked) {
        setErr(guard.message);
        return;
      }

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
