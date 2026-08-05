// pages/forgot-password.js
// 세션98 v2 — AI-POST 디자인 톤 정합 (index.js 로그인 카드 L 스타일과 동일 토큰)
//   배경 #faf8ff / 브랜드 그라디언트 텍스트 / 카드 radius16 · border #ece2f5
//   버튼 linear-gradient(135deg,#4A148C,#9C27B0) — 로그인 버튼과 동일
//
// 흐름: 이메일 입력 → resetPasswordForEmail → 메일 링크 → /reset-password
// 원칙:
//   - 계정 존재 여부를 노출하지 않는다. 성공/미가입 모두 동일 문구.
//     (가입 여부 스캐닝 차단. Supabase도 미가입을 에러로 주지 않는다)
//   - 카카오 가입자는 비번이 없다 → 재설정하면 이메일 로그인이 추가로 생긴다. 안내 문구 포함.
// FREEZE 준수: 엔진/publish.js/ensure.js/callback.js 무영향. 신규 API 0. 스키마 변경 0.

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    const addr = email.trim();
    if (!addr) {
      setErr('이메일을 입력해주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setErr('이메일 형식이 올바르지 않습니다.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    // 발송 자체가 막힌 경우(rate limit)만 노출.
    // "가입되지 않은 이메일"은 에러로 오지 않으며, 와도 구분해서 알리지 않는다.
    if (error && /rate|limit|too many/i.test(error.message || '')) {
      setErr('요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setSent(true);
  }

  return (
    <div style={S.wrap}>
      <div style={S.brand}>AI-POST.AI</div>
      <div style={S.tagline}>AI를 이용한 콘텐츠 운영 플랫폼</div>

      <div style={S.card}>
        <div style={S.iconRing}>
          <span style={S.icon}>🔒</span>
        </div>

        <h1 style={S.title}>비밀번호 찾기</h1>

        {sent ? (
          <>
            <div style={S.sentBox}>
              <div style={S.sentIcon}>📩</div>
              <div style={S.sentTitle}>재설정 메일을 보냈습니다</div>
              <div style={S.sentMail}>{email.trim()}</div>
              <div style={S.sentDesc}>
                메일함에서 링크를 눌러 새 비밀번호를 설정해주세요.
                <br />
                보통 1~2분 안에 도착합니다.
              </div>
            </div>

            <div style={S.tipBox}>
              메일이 보이지 않는다면 <b>스팸메일함</b>도 확인해주세요.
              <br />
              링크는 발송 후 <b>1시간</b> 동안만 사용할 수 있습니다.
            </div>

            <button
              onClick={() => { setSent(false); setEmail(''); setErr(''); }}
              style={S.btnGhost}
            >
              다른 이메일로 다시 보내기
            </button>
          </>
        ) : (
          <>
            <p style={S.sub}>
              가입한 이메일 주소를 입력하시면
              <br />
              비밀번호를 다시 설정할 수 있는 링크를 보내드립니다.
            </p>

            <form onSubmit={handleSubmit} style={S.form}>
              <label style={S.label}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={S.input}
                autoComplete="email"
                autoFocus
              />
              <button type="submit" disabled={loading} style={S.btn}>
                {loading ? '보내는 중...' : '재설정 메일 보내기'}
              </button>
            </form>

            <div style={S.hr} />

            <div style={S.kakaoNote}>
              <span style={S.kakaoPin}>📌</span>
              <div>
                <b>카카오로 가입한 계정</b>은 비밀번호가 없습니다.
                <br />
                로그인 화면의 <b>카카오로 시작하기</b>를 이용해주세요.
              </div>
            </div>
          </>
        )}

        {err && <div style={S.err}>{err}</div>}

        <div style={S.footer}>
          <Link href="/login" style={S.link}>← 로그인으로 돌아가기</Link>
          <span style={S.bar}>|</span>
          <Link href="/signup" style={S.link}>회원가입</Link>
        </div>
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
  sub: { fontSize: 13, color: '#7a6a8a', lineHeight: 1.7, margin: '0 0 24px' },

  form: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  label: { fontSize: 12.5, color: '#5a4a6a', fontWeight: 700, marginBottom: 7 },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 13px',
    border: '1px solid #e0d0f0', borderRadius: 9,
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  },
  btn: {
    width: '100%', padding: '13px 0', marginTop: 18,
    border: 'none', borderRadius: 9,
    background: 'linear-gradient(135deg,#4A148C,#9C27B0)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  btnGhost: {
    width: '100%', padding: '12px 0', marginTop: 16,
    background: '#fff', color: '#7B1FA2',
    border: '1px solid #e0d0f0', borderRadius: 9,
    fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },

  hr: { height: 1, background: '#f0eaf7', margin: '22px 0 18px' },

  kakaoNote: {
    display: 'flex', gap: 9, textAlign: 'left',
    padding: '13px 14px',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 10, fontSize: 12.5, color: '#92400e', lineHeight: 1.65,
  },
  kakaoPin: { fontSize: 13, lineHeight: 1.5 },

  sentBox: {
    padding: '22px 18px 20px',
    background: 'linear-gradient(180deg,#f6fffa 0%,#f3fdf7 100%)',
    border: '1px solid #bbf7d0', borderRadius: 12,
    marginBottom: 14,
  },
  sentIcon: { fontSize: 30, marginBottom: 8 },
  sentTitle: { fontSize: 15, fontWeight: 800, color: '#166534', marginBottom: 6 },
  sentMail: {
    fontSize: 13, fontWeight: 700, color: '#15803d',
    wordBreak: 'break-all', marginBottom: 10,
  },
  sentDesc: { fontSize: 12.5, color: '#3f7a56', lineHeight: 1.7 },
  tipBox: {
    padding: '12px 14px', background: '#faf8ff',
    border: '1px solid #ece2f5', borderRadius: 10,
    fontSize: 12, color: '#7a6a8a', lineHeight: 1.7, textAlign: 'left',
  },

  err: {
    marginTop: 14, padding: 11,
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#991b1b', borderRadius: 9, fontSize: 12.5, textAlign: 'left',
  },
  footer: {
    marginTop: 22, fontSize: 12.5, color: '#8a7a9a',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, whiteSpace: 'nowrap',
  },
  bar: { color: '#ddd2ea' },
  link: { color: '#7B1FA2', textDecoration: 'none', fontWeight: 700 },
};
