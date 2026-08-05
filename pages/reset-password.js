// pages/reset-password.js
// 세션98 v2 — AI-POST 디자인 톤 정합 (forgot-password.js와 동일 토큰)
//
// 재설정 메일 링크 착지점. 새 비밀번호 설정.
// 흐름: 메일 링크 → 이 페이지 → 복구 세션 확인 → updateUser({password}) → signOut → /login
//
// 구조 주의 — 링크가 세션을 싣고 오는 방식이 2가지다:
//   (A) implicit : URL 해시 #access_token=...&type=recovery  → supabase-js가 자동으로 세션 수립
//   (B) PKCE     : 쿼리 ?code=...                            → exchangeCodeForSession 수동 호출 필요
//   프로젝트 설정에 따라 둘 중 하나만 오므로 둘 다 받는다. 한쪽만 처리하면
//   "링크가 만료되었습니다"가 뜨는데 실제 원인은 만료가 아니라 미처리다.
//
// 재설정 성공 후 반드시 signOut 한다. 복구 세션을 유지한 채 서비스로 들어가면
// 메일 링크만으로 로그인이 되는 셈이라, 새 비밀번호가 실제로 동작하는지 확인되지 않는다.
//
// FREEZE 준수: 엔진/publish.js/ensure.js/callback.js 무영향. 신규 API 0. 스키마 변경 0.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState('checking'); // checking | ready | invalid | done
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    // PASSWORD_RECOVERY: 해시 토큰을 supabase-js가 처리한 직후 발생
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && mounted) setPhase('ready');
    });

    (async () => {
      try {
        // (B) PKCE — ?code= 가 있으면 세션으로 교환
        const qs = new URLSearchParams(window.location.search);
        const code = qs.get('code');
        const qErr = qs.get('error_description') || qs.get('error');

        if (qErr) {
          if (mounted) { setPhase('invalid'); setErr(decodeURIComponent(qErr)); }
          return;
        }
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (mounted) { setPhase('invalid'); setErr(error.message); }
            return;
          }
        }

        // (A) implicit — 해시 처리 완료 후 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setPhase(session ? 'ready' : 'invalid');
      } catch (e) {
        if (mounted) { setPhase('invalid'); setErr(e.message); }
      }
    })();

    return () => { mounted = false; sub?.subscription?.unsubscribe(); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    if (pw1.length < 6) {
      setErr('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (pw1 !== pw2) {
      setErr('두 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);

    if (error) {
      if (/different from the old/i.test(error.message || '')) {
        setErr('기존 비밀번호와 다른 비밀번호를 입력해주세요.');
      } else {
        setErr(error.message);
      }
      return;
    }

    // 복구 세션 종료 → 새 비밀번호로 실제 로그인시켜 검증
    await supabase.auth.signOut();
    setPhase('done');
    setTimeout(() => { window.location.href = '/login'; }, 2200);
  }

  // 길이 기준 단순 강도 표시. 정책이 아니라 안내다(통과 조건은 6자 이상 하나뿐).
  const strength = pw1.length === 0 ? 0 : pw1.length < 6 ? 1 : pw1.length < 10 ? 2 : 3;
  const strengthLabel = ['', '짧음', '보통', '안전'][strength];
  const strengthColor = ['#eee', '#ef4444', '#f59e0b', '#16a34a'][strength];
  const match = pw2.length > 0 && pw1 === pw2;

  return (
    <div style={S.wrap}>
      <div style={S.brand}>AI-POST.AI</div>
      <div style={S.tagline}>AI를 이용한 콘텐츠 운영 플랫폼</div>

      <div style={S.card}>
        <div style={S.iconRing}>
          <span style={S.icon}>{phase === 'done' ? '✅' : phase === 'invalid' ? '⚠️' : '🔑'}</span>
        </div>

        <h1 style={S.title}>
          {phase === 'done' ? '변경 완료' : phase === 'invalid' ? '링크 확인 필요' : '새 비밀번호 설정'}
        </h1>

        {phase === 'checking' && (
          <p style={S.sub}>링크를 확인하는 중입니다...</p>
        )}

        {phase === 'invalid' && (
          <>
            <p style={S.sub}>
              링크가 만료되었거나 이미 사용되었습니다.
              <br />
              재설정 링크는 <b>발송 후 1시간</b>, <b>1회</b>만 사용할 수 있습니다.
            </p>
            {err && <div style={S.errDetail}>{err}</div>}
            <Link href="/forgot-password" style={S.btnLink}>
              재설정 메일 다시 받기
            </Link>
          </>
        )}

        {phase === 'ready' && (
          <>
            <p style={S.sub}>
              앞으로 로그인에 사용할
              <br />
              새 비밀번호를 입력해주세요.
            </p>

            <form onSubmit={handleSubmit} style={S.form}>
              <label style={S.label}>새 비밀번호 <span style={S.hint}>(최소 6자)</span></label>
              <input
                type="password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                placeholder="••••••"
                style={S.input}
                autoComplete="new-password"
                autoFocus
              />
              <div style={S.meterRow}>
                <div style={S.meterTrack}>
                  <div style={{ ...S.meterFill, width: `${strength * 33.3}%`, background: strengthColor }} />
                </div>
                <span style={{ ...S.meterLabel, color: strength ? strengthColor : '#bbb' }}>
                  {strengthLabel}
                </span>
              </div>

              <label style={{ ...S.label, marginTop: 14 }}>새 비밀번호 확인</label>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••"
                style={{
                  ...S.input,
                  borderColor: pw2.length === 0 ? '#e0d0f0' : match ? '#86efac' : '#fecaca',
                }}
                autoComplete="new-password"
              />
              {pw2.length > 0 && (
                <div style={{ ...S.matchMsg, color: match ? '#16a34a' : '#dc2626' }}>
                  {match ? '✓ 일치합니다' : '✕ 일치하지 않습니다'}
                </div>
              )}

              <button type="submit" disabled={loading} style={S.btn}>
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <div style={S.doneBox}>
            비밀번호가 변경되었습니다.
            <br />
            새 비밀번호로 로그인해주세요.
            <div style={S.doneSub}>잠시 후 로그인 화면으로 이동합니다.</div>
          </div>
        )}

        {err && phase === 'ready' && <div style={S.err}>{err}</div>}

        {phase !== 'invalid' && (
          <div style={S.footer}>
            <Link href="/login" style={S.link}>← 로그인으로 돌아가기</Link>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: '100vh',
    background: '#faf8ff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", Roboto, sans-serif',
  },
  brand: {
    fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg,#4A148C,#9C27B0)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 4,
  },
  tagline: { fontSize: 13, color: '#7a6a8a', marginBottom: 28 },
  card: {
    width: '100%', maxWidth: 380, background: '#fff',
    borderRadius: 16, border: '1px solid #ece2f5',
    boxShadow: '0 4px 20px rgba(74,20,140,.08)',
    padding: '34px 32px 28px',
    textAlign: 'center',
  },
  iconRing: {
    width: 54, height: 54, margin: '0 auto 14px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#f3ecff,#faf5ff)',
    border: '1px solid #e6d8f7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 24, lineHeight: 1 },
  title: { fontSize: 19, fontWeight: 800, color: '#1a1a2e', margin: '0 0 10px' },
  sub: { fontSize: 13, color: '#7a6a8a', lineHeight: 1.7, margin: '0 0 22px' },

  form: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  label: { fontSize: 12.5, color: '#5a4a6a', fontWeight: 700, marginBottom: 7 },
  hint: { fontWeight: 500, color: '#a396b0' },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 13px',
    border: '1px solid #e0d0f0', borderRadius: 9,
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  },
  meterRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  meterTrack: { flex: 1, height: 4, background: '#f0eaf7', borderRadius: 3, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 3, transition: 'width .2s' },
  meterLabel: { fontSize: 11, fontWeight: 700, minWidth: 26, textAlign: 'right' },
  matchMsg: { fontSize: 11.5, fontWeight: 700, marginTop: 7 },

  btn: {
    width: '100%', padding: '13px 0', marginTop: 20,
    border: 'none', borderRadius: 9,
    background: 'linear-gradient(135deg,#4A148C,#9C27B0)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnLink: {
    display: 'block', marginTop: 6, padding: '13px 0',
    background: 'linear-gradient(135deg,#4A148C,#9C27B0)',
    color: '#fff', borderRadius: 9,
    fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none',
  },

  doneBox: {
    padding: '22px 18px',
    background: 'linear-gradient(180deg,#f6fffa 0%,#f3fdf7 100%)',
    border: '1px solid #bbf7d0', borderRadius: 12,
    fontSize: 13.5, fontWeight: 700, color: '#166534', lineHeight: 1.7,
  },
  doneSub: { marginTop: 8, fontSize: 12, fontWeight: 500, color: '#3f7a56' },

  err: {
    marginTop: 14, padding: 11,
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#991b1b', borderRadius: 9, fontSize: 12.5, textAlign: 'left',
  },
  errDetail: {
    marginBottom: 14, padding: 10,
    background: '#faf8ff', border: '1px solid #ece2f5', borderRadius: 9,
    fontSize: 11, color: '#8a7a9a', wordBreak: 'break-all', textAlign: 'left',
  },
  footer: { marginTop: 22, fontSize: 12.5, color: '#8a7a9a', whiteSpace: 'nowrap' },
  link: { color: '#7B1FA2', textDecoration: 'none', fontWeight: 700 },
};
