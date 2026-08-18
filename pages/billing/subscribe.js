// pages/billing/subscribe.js
// 결제 가입 페이지 — 골격 (가맹점 가입 전, 결제창 호출 미작동)
// 플랜 표시 + "결제하기" 버튼만. 실제 결제창은 portone.isConfigured() 후 활성.
//
// 94차 v0.2: Bearer 전파
// - checkout 호출 시 Authorization: Bearer 헤더 첨부
// - 세션 없으면 /login redirect
// - plans 조회는 공개 endpoint 라 무인증 유지
//
// [S191 KG-SUBSCRIBE-UI-ALIGN-01] 표현 계층만 정렬. 결제 로직·데이터 계약 무접촉.
// - index.js 요금제 화면(NavPanel PLANS 카드)의 디자인 토큰을 이식: 브랜드 퍼플 #4A148C,
//   보더 #E8E0F4/#F4F0FA, 배경 #fafafd/#F7F5FB, 플랜 액센트 + 투명도 접미사(0d/12/1a/1f/3d).
// - ★ ACCENT는 UI 표현 토큰이다. 상품정보(가격·quota·description·활성상태)는 전부 API 응답만 사용한다.
//   여기에 상품값을 하드코딩하면 DB/화면 이중 SoT가 되어 KG 심사 정합이 깨진다.
// - 하단 SiteFooter = 사업자정보 상시 노출(KG 심사 요건). onDoc 미전달 → 정책 링크는 텍스트 폴백,
//   실제 이동은 아래 /policies/* 3종 <a> 링크가 담당(KG-05 운영 라우트 재사용).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import SiteFooter from '../../components/SiteFooter';

// plan id → 액센트 컬러. 표현 전용 상수(상품 데이터 아님). index.js PLANS와 동일값.
const ACCENT = {
  free:       '#9C27B0',
  basic:      '#1565C0',
  standard:   '#03c75a',
  pro:        '#E65100',
  enterprise: '#7B1FA2',
};
const FALLBACK_AC = '#4A148C';
const acOf = (id) => ACCENT[String(id || '').toLowerCase()] || FALLBACK_AC;

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

  // ── 헤더(B) — 서비스 연속성. 요금제 → 결제 페이지가 같은 서비스로 읽히게 한다.
  const Header = (
    <div style={S.header}>
      <div style={S.headerInner}>
        <Link href="/" style={S.brand}>
          <span style={S.brandMark}>AI</span>
          <span style={S.brandName}>AI-POST<span style={S.brandDot}>.AI</span></span>
        </Link>
        <span style={S.brandTag}>검색 노출 블로그 자동 생성</span>
      </div>
    </div>
  );

  // ── 푸터(C) — 사업자정보 + 정책 3종 실링크
  const Footer = (
    <div style={S.footerZone}>
      <div style={S.policyRow}>
        <a href="/policies/terms" style={S.policyLink}>이용약관</a>
        <span style={S.policySep}>|</span>
        <a href="/policies/privacy" style={S.policyLink}>개인정보처리방침</a>
        <span style={S.policySep}>|</span>
        <a href="/policies/refund" style={S.policyLink}>취소·환불 규정</a>
      </div>
      <SiteFooter />
    </div>
  );

  if (loading) {
    return (
      <div style={S.page}>
        {Header}
        <div style={S.wrap}>
          <div style={S.loading}>로딩…</div>
        </div>
        {Footer}
      </div>
    );
  }

  return (
    <div style={S.page}>
      {Header}

      <div style={S.wrap}>
        <h1 style={S.h1}>요금제</h1>
        <p style={S.sub}>월 정기결제 (가입일 기준 매월 청구)</p>

        <div style={S.grid}>
          {plans.map(p => {
            const ac = acOf(p.id);
            const isFree = p.id === 'free';
            return (
              <div
                key={p.id}
                style={{
                  ...S.card,
                  borderColor: isFree ? '#E8E0F4' : `${ac}33`,
                  boxShadow: isFree ? 'none' : `0 6px 20px ${ac}14`,
                }}
              >
                <div style={{ ...S.planLabel, color: ac }}>{p.label}</div>

                <div style={S.price}>
                  {p.price_krw.toLocaleString()}원<span style={S.unit}>/월</span>
                </div>

                <div style={{ ...S.quotaBox, background: `${ac}0d`, border: `1px solid ${ac}1f` }}>
                  <div style={{ ...S.quota, color: ac }}>월 {p.monthly_quota}건 포함</div>
                  <div style={S.overage}>
                    초과 1건당 {p.overage_per_post_krw.toLocaleString()}원
                  </div>
                </div>

                {p.description && <div style={S.desc}>{p.description}</div>}

                <div style={S.ctaZone}>
                  <button
                    style={
                      isFree
                        ? S.btnDisabled
                        : { ...S.btn, background: ac, boxShadow: `0 4px 14px ${ac}3d` }
                    }
                    disabled={isFree || submitting}
                    onClick={() => handleSubscribe(p.id)}
                  >
                    {isFree ? '기본 플랜' : '결제하기'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {msg && <div style={S.msg}>{msg}</div>}

        {/* 서비스 제공기간·자동갱신 고지 — 전자상거래법 및 PG 심사 모니터링 항목. */}
        <div style={S.notice}>
          <div style={S.noticeHead}>서비스 제공기간 및 이용 안내</div>
          · 서비스 제공기간 — 결제일로부터 1개월(월 단위). 별도 배송이 없는 온라인 서비스로, 결제 완료 즉시 이용할 수 있습니다.<br />
          · 자동갱신 — 월 정기결제이며 매 결제일에 동일 플랜으로 자동 갱신됩니다. 해지 시 다음 결제일부터 청구되지 않으며, 이미 결제된 이용기간은 만료일까지 이용할 수 있습니다.<br />
          · 발행 한도 — 각 플랜의 월 발행 건수는 결제 주기 시작 시 초기화되며 다음 달로 이월되지 않습니다.<br />
          · 청약철회 및 환불 — 환불정책에 따르며, 사용한 발행 건수만큼 공제 후 잔액을 환불합니다.<br />
          · 이용요금은 부가세 포함 금액입니다.
        </div>
      </div>

      {Footer}
    </div>
  );
}

const S = {
  page:    { minHeight: '100vh', background: '#fafafd', fontFamily: 'system-ui, -apple-system, "Malgun Gothic", sans-serif', display: 'flex', flexDirection: 'column' },

  header:      { background: '#fff', borderBottom: '1px solid #E8E0F4' },
  headerInner: { maxWidth: 960, margin: '0 auto', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 },
  brand:       { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandMark:   { width: 26, height: 26, borderRadius: 8, background: '#4A148C', color: '#fff', fontSize: 11.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.02em' },
  brandName:   { fontSize: 15, fontWeight: 900, color: '#4A148C', letterSpacing: '-.01em' },
  brandDot:    { color: '#9C27B0' },
  brandTag:    { fontSize: 11.5, color: '#8b83a0', fontWeight: 700 },

  wrap:    { flex: 1, width: '100%', maxWidth: 960, margin: '0 auto', padding: '36px 24px 44px', boxSizing: 'border-box' },
  loading: { padding: '60px 0', textAlign: 'center', color: '#8b83a0', fontSize: 14 },
  h1:      { fontSize: 26, fontWeight: 900, color: '#2c2340', margin: 0, letterSpacing: '-.02em' },
  sub:     { color: '#8b83a0', fontSize: 13, fontWeight: 700, marginTop: 7, marginBottom: 26 },

  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(232px, 1fr))', gap: 14, alignItems: 'stretch' },
  card:    { display: 'flex', flexDirection: 'column', border: '1px solid #E8E0F4', borderRadius: 15, padding: '18px 17px 17px', background: '#fff' },

  planLabel: { fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' },
  price:     { fontSize: 25, fontWeight: 900, color: '#2c2340', marginTop: 6, letterSpacing: '-.02em' },
  unit:      { fontSize: 12.5, fontWeight: 700, color: '#b4adc4', marginLeft: 3 },

  quotaBox: { marginTop: 12, padding: '9px 10px', borderRadius: 11 },
  quota:    { fontSize: 12.5, fontWeight: 800 },
  overage:  { marginTop: 3, fontSize: 11, color: '#8b83a0', fontWeight: 700 },

  desc:    { marginTop: 10, fontSize: 11.5, color: '#4a4458', lineHeight: 1.55, borderTop: '1px solid #F4F0FA', paddingTop: 10 },

  ctaZone: { marginTop: 'auto', paddingTop: 14 },
  btn:     { width: '100%', padding: '10px 0', border: 0, borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' },
  btnDisabled: { width: '100%', padding: '10px 0', border: '1.5px solid #E8E0F4', borderRadius: 10, background: '#F7F5FB', color: '#b4adc4', cursor: 'not-allowed', fontSize: 13, fontWeight: 800, fontFamily: 'inherit' },

  msg:     { marginTop: 22, padding: '12px 14px', background: '#fef3c7', border: '1px solid #f5dfa0', borderRadius: 10, fontSize: 13, color: '#6b5a2a', fontWeight: 700 },

  notice:     { marginTop: 24, padding: '16px 18px', background: '#fff', border: '1px solid #e8e4f0', borderRadius: 12, fontSize: 12.5, color: '#5a5a6a', lineHeight: 1.75 },
  noticeHead: { fontWeight: 900, color: '#4A148C', fontSize: 13, marginBottom: 6 },

  footerZone: { borderTop: '1px solid #E8E0F4', background: '#fff', padding: '18px 24px 8px' },
  policyRow:  { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  policyLink: { fontSize: 11.5, color: '#6b6b80', textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap' },
  policySep:  { color: '#dcdce4', margin: '0 12px', fontSize: 11.5 },
};
