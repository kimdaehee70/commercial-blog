// pages/login.js
// 58차 수정 — suspended 계정 차단 (status 가드)
// 변경 vs 52차:
//   1) handleSubmit: ensureAccount 응답에 status !== 'active' → 강제 로그아웃 + 차단 메시지
//   2) useEffect: 기존 세션 진입 시에도 동일 가드
// FREEZE 준수: 엔진/publish.js/ensure.js/callback.js 무영향
// 기존 52차 흐름:
//   - 카카오 OAuth 버튼
//   - signInWithOAuth({ provider: 'kakao' })
//   - 콜백 흐름: 카카오 인증 → /auth/callback → ensureAccount → /
// 기존 49차 흐름:
//   1) 로그인 성공 후 /api/account/ensure 자동 호출 (accounts row 없으면 생성)
//   2) 이미 로그인된 상태로 진입 시에도 ensure 1회 호출 (안전망)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// 110차 — callback.js 차단 종착점 안내 메시지 (status별)
// 카카오 콜백 차단 시 /login?blocked={status} 로 진입 → 사유 안내
function blockedMessage(status) {
  switch (status) {
    case 'pending':   return '가입 승인 대기 중입니다. 관리자 승인 후 이용 가능합니다.';
    case 'suspended': return '정지된 계정입니다. 관리자에게 문의하세요.';
    default:          return `계정 상태가 "${status}" 입니다. 관리자에게 문의하세요.`;
  }
}

// 49차 — 로그인/세션 진입 후 accounts row 보장 (있으면 skip, 없으면 생성)
async function ensureAccount(session) {
  if (!session?.access_token) return { ok: false, error: 'no_session' };
  try {
    const r = await fetch('/api/account/ensure', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    const j = await r.json();
    if (!j.ok) console.warn('[login] ensure failed:', j);
    else console.log(`[login] accounts ${j.action}: id=${j.id} role=${j.role || '-'} status=${j.status || '-'}`);
    return j;
  } catch (e) {
    console.error('[login] ensure exception:', e);
    return { ok: false, error: 'exception' };
  }
}

// 58차 — status 가드 헬퍼
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

// 107차 → [v15] role별 진입 동선
// owner → /admin/publish (운영 콘솔) / 그 외(user 등) → / (메인 생성기, 우측이 작업화면으로 전환)
// role 출처: ensureAccount 응답(ensured.role). 추가 조회 불필요.
function resolveLanding(role) {
  return role === 'owner' ? '/admin/publish' : '/';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [landingPath, setLandingPath] = useState('/'); // dashboard 페이지 제거: 폴백을 resolveLanding user값(/)과 일치
  const router = useRouter();

  // 110차 — callback.js 차단 종착점: ?blocked={status} 안내 표시
  useEffect(() => {
    if (!router.isReady) return;
    const b = router.query.blocked;
    if (b) setErr(blockedMessage(Array.isArray(b) ? b[0] : b));
  }, [router.isReady, router.query.blocked]);

  // 이미 로그인된 상태인지 확인 (auth.uid 검증 + ensure 1회 + status 가드)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        // 49차 — 기존 세션에 대해서도 ensure 1회 (안전망)
        const ensured = await ensureAccount(session);

        // 58차 — status 가드
        const guard = await enforceActiveStatus(ensured);
        if (guard.blocked) {
          if (mounted) {
            setCurrentUser(null);
            setErr(guard.message);
          }
          return;
        }

        if (mounted) {
          const landing = resolveLanding(ensured.role);
          setLandingPath(landing);
          setCurrentUser(session.user);
          // 107차 — 기존 세션으로 /login 진입 시 role별 자동 이동
          window.location.href = landing;
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setErr('');

    if (!email || !password) {
      setErr('이메일과 비밀번호를 입력하세요.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (data?.user && data?.session) {
      // 49차 — 로그인 직후 accounts row 보장
      const ensured = await ensureAccount(data.session);

      // 58차 — status 가드 (suspended 등 차단)
      const guard = await enforceActiveStatus(ensured);
      if (guard.blocked) {
        setCurrentUser(null);
        setErr(guard.message);
        return;
      }

      setCurrentUser(data.user);
      const action = ensured.ok ? ensured.action : 'ensure_failed';
      const landing = resolveLanding(ensured.role);
      setLandingPath(landing);
      setMsg(`로그인 성공. auth.uid = ${data.user.id} / accounts: ${action} / role: ${ensured.role || '-'}`);

      // role별 이동: owner→/admin/publish, user→/ (resolveLanding)
      setTimeout(() => {
        window.location.href = landing;
      }, 1200);
    }
  }

  // 52차 — 카카오 OAuth 로그인
  // 흐름: signInWithOAuth → 카카오 인증 페이지 → /auth/callback → ensureAccount → /
  // 주의: 카카오 흐름의 status 가드는 callback.js에서 처리 필요 (이번 세션은 미수정)
  async function handleKakao() {
    setMsg('');
    setErr('');
    setKakaoLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setKakaoLoading(false);
      setErr(`카카오 로그인 실패: ${error.message}`);
    }
    // 성공 시 즉시 카카오 페이지로 리다이렉트되므로 loading 해제 불필요
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setMsg('로그아웃 완료.');
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.sub}>commercial-blog 운영 콘솔</p>

        {currentUser ? (
          <div style={styles.loggedIn}>
            <div style={styles.loggedInLabel}>이미 로그인됨</div>
            <div style={styles.uidBox}>
              <div style={styles.uidLabel}>auth.uid</div>
              <code style={styles.uidValue}>{currentUser.id}</code>
            </div>
            <div style={styles.emailRow}>{currentUser.email}</div>
            <div style={styles.btnRow}>
              <button
                onClick={() => (window.location.href = landingPath)}
                style={styles.btn}
              >
                {landingPath === '/admin/publish' ? '운영 콘솔로 이동' : '생성기로 이동'}
              </button>
              <button onClick={handleLogout} style={styles.btnGhost}>
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <>
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

              <label style={styles.label}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                style={styles.input}
                autoComplete="current-password"
              />

              <button type="submit" disabled={loading} style={styles.btn}>
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            {/* 세션98 — 비밀번호 찾기.
                인증은 Supabase Auth 이메일+비번이며 별도 아이디 컬럼이 없다.
                따라서 「아이디 찾기」는 만들지 않는다(찾을 대상이 없음). */}
            <div style={styles.findRow}>
              <Link href="/forgot-password" style={styles.findLink}>비밀번호 찾기</Link>
            </div>

            {/* 52차 — 카카오 OAuth */}
            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>또는</span>
              <span style={styles.dividerLine} />
            </div>

            <button
              onClick={handleKakao}
              disabled={kakaoLoading}
              style={styles.btnKakao}
            >
              <span style={styles.kakaoIcon}>💬</span>
              {kakaoLoading ? '이동 중...' : '카카오로 시작하기'}
            </button>

            <div style={styles.footer}>
              계정이 없으신가요?{' '}
              <Link href="/signup" style={styles.link}>회원가입</Link>
            </div>
          </>
        )}

        {msg && <div style={styles.msgOk}>{msg}</div>}
        {err && <div style={styles.msgErr}>{err}</div>}
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
    width: '100%',
  },
  btnGhost: {
    marginTop: 8,
    padding: '11px 0',
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
  },
  btnRow: { display: 'flex', flexDirection: 'column', marginTop: 8 },
  loggedIn: { display: 'flex', flexDirection: 'column' },
  loggedInLabel: { fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 12 },
  uidBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: 12,
  },
  uidLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  uidValue: { fontSize: 12, color: '#111', wordBreak: 'break-all', fontFamily: 'monospace' },
  emailRow: { fontSize: 13, color: '#374151', marginTop: 8, marginBottom: 4 },

  // 52차 — divider + 카카오 버튼
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0 12px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#e5e7eb',
  },
  dividerText: {
    padding: '0 12px',
    color: '#9ca3af',
    fontSize: 12,
  },
  btnKakao: {
    width: '100%',
    padding: '11px 0',
    background: '#FEE500',
    color: '#191919',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  msgOk: {
    marginTop: 16,
    padding: 12,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: 6,
    fontSize: 13,
    wordBreak: 'break-all',
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
  // 세션98 — 로그인 버튼 아래 찾기 링크. whiteSpace:nowrap 으로 좁은 화면에서도 줄바꿈 방지.
  findRow: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  findLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
};
