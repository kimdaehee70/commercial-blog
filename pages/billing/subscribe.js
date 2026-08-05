// pages/billing/subscribe.js
// 결제 가입 페이지 — 골격 (가맹점 가입 전, 결제창 호출 미작동)
// 플랜 표시 + "결제하기" 버튼만. 실제 결제창은 portone.isConfigured() 후 활성.
//
// 94차 v0.2: Bearer 전파
// - checkout 호출 시 Authorization: Bearer 헤더 첨부
// - 세션 없으면 /login redirect
// - plans 조회는 공개 endpoint 라 무인증 유지

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function SubscribePage() {
  const router = useRouter();
  const [plans, setPlans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    fetch('/api/billing/plans')
      .then(r => r.json())
      .then(d => {
        setPlans(Array.isArray(d?.plans) ? d.plans : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubscribe(planId) {
    if (submitting) return;
    setSubmitting(true);
    setMsg('');
    try {
      // 94차 — Bearer 전파
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const r = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const d = await r.json();

      if (r.status === 401) {
        setMsg('인증이 만료되었습니다. 다시 로그인해 주세요.');
        setSubmitting(false);
        router.replace('/login');
        return;
      }
      if (!r.ok) {
        setMsg(d?.error || '결제 준비 실패');
        setSubmitting(false);
        return;
      }
      if (d?.dummy) {
        setMsg('포트원 가맹점 미등록 — 결제창은 가맹점 가입 후 활성화됩니다.');
        setSubmitting(false);
        return;
      }
      // TODO: PortOne.requestIssueBillingKey(d.params)
      setMsg('결제창 호출 준비 완료 (구현 예정)');
    } catch (e) {
      setMsg('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={S.wrap}>로딩…</div>;

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>요금제</h1>
      <p style={S.sub}>월 정기결제 (가입일 기준 매월 청구)</p>

      <div style={S.grid}>
        {plans.map(p => (
          <div key={p.id} style={S.card}>
            <div style={S.planLabel}>{p.label}</div>
            <div style={S.price}>{p.price_krw.toLocaleString()}원<span style={S.unit}>/월</span></div>
            <div style={S.quota}>월 {p.monthly_quota}건 포함</div>
            <div style={S.overage}>초과 1건당 {p.overage_per_post_krw.toLocaleString()}원</div>
            <button
              style={p.id === 'free' ? S.btnDisabled : S.btn}
              disabled={p.id === 'free' || submitting}
              onClick={() => handleSubscribe(p.id)}
            >
              {p.id === 'free' ? '기본 플랜' : '결제하기'}
            </button>
          </div>
        ))}
      </div>

      {msg && <div style={S.msg}>{msg}</div>}
    </div>
  );
}

const S = {
  wrap:    { maxWidth: 960, margin: '40px auto', padding: 24, fontFamily: 'system-ui' },
  h1:      { fontSize: 28, margin: 0 },
  sub:     { color: '#666', marginTop: 6, marginBottom: 24 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  card:    { border: '1px solid #e4e4e7', borderRadius: 12, padding: 20, background: '#fff' },
  planLabel:{ fontSize: 14, color: '#666', textTransform: 'uppercase' },
  price:   { fontSize: 28, fontWeight: 700, marginTop: 4 },
  unit:    { fontSize: 14, fontWeight: 400, color: '#666', marginLeft: 4 },
  quota:   { marginTop: 12, fontSize: 14 },
  overage: { marginTop: 4, fontSize: 13, color: '#666' },
  btn:     { marginTop: 16, width: '100%', padding: '10px 0', border: 0, borderRadius: 8, background: '#111', color: '#fff', cursor: 'pointer', fontSize: 14 },
  btnDisabled: { marginTop: 16, width: '100%', padding: '10px 0', border: 0, borderRadius: 8, background: '#e4e4e7', color: '#999', cursor: 'not-allowed', fontSize: 14 },
  msg:     { marginTop: 20, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 14 },
};
