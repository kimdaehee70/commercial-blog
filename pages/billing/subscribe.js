// pages/billing/subscribe.js
// 결제 가입 페이지 — 페이지 셸 + PlanCards 호출.
//
// [PLAN-CARDS-SHARED-COMPONENT-01] 카드 UI·결제 로직 전량을 components/billing/PlanCards.jsx 로 이관.
// - 이 파일에 남는 것: 헤더 / 푸터(사업자정보·정책 3종 링크) / 페이지 레이아웃 /
//   현재 플랜 조회 / 결제 완료 후 복귀 동선.
// - 이관된 것: ACCENT·BADGE 표현 토큰, /api/billing/plans 조회, 5카드 grid, 반응형 styled-jsx,
//   handleSubscribe 전량, submitting·msg·paymentRecovery·done 상태, 완료 카드, 고지 안내박스.
// - ★ 결제 동선·문안·디자인·상품 SoT 는 1글자도 바뀌지 않았다. 위치만 옮겼다.
//   이 페이지의 완료 후 동작(5초 뒤 /?tab=plans&paid= 복귀)도 종전과 동일하다.
//
// 이관 전 이력(보존):
// - [S191 KG-SUBSCRIBE-UI-ALIGN-01] index.js 디자인 토큰 이식. 하단 SiteFooter = 사업자정보
//   상시 노출(KG 심사 요건). 정책 이동은 아래 /policies/* 3종 <a> 링크가 담당(KG-05 운영 라우트).
// - [S193 PORTONE-BROWSER-SDK-MISSING-01] 정기결제(B) 동선 실배선. /api/billing/checkout 은
//   일회성(A) 경로 자산이라 호출하지 않는다. 금액은 이 화면에서 결제되지 않으며,
//   첫 달 실청구는 서버 /api/billing/issue-billing-key 의 chargeBillingKey() 가 수행한다.
// - [SUBSCRIBE-POST-PAYMENT-RETURN-01] 완료 후 마이페이지 요금제 탭으로 복귀.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import SiteFooter from '../../components/SiteFooter';
import PlanCards from '../../components/billing/PlanCards';

// 복귀 목적지 — 마이페이지 요금제 탭. plan id 만 싣는다.
//   ★ label 을 URL 에 싣지 않는다. 조작 가능하고 상품 SoT 가 하나 더 늘어난다.
//     표시명은 도착 화면이 /api/billing/plans 응답에서 찾는다.
const returnUrl = (planId) => `/?tab=plans&paid=${encodeURIComponent(planId || '')}`;

export default function SubscribePage() {
  const router = useRouter();
  // [SUBSCRIBE-CURRENT-PLAN-NOT-REFLECTED-01] 현재 이용 중인 플랜 id.
  //   ★ 신규 API 를 만들지 않는다. check-quota 가 이미 plan_id 를 반환한다(accounts.plan SoT).
  const [curPlan, setCurPlan] = useState(null);
  // 완료 후 이동 가드. PlanCards 내부에도 1회 가드가 있으나, 이 페이지의 목적지
  //   중복 push 를 막는 최종 방어는 여기에 둔다.
  const navRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) return;
        const r = await fetch(`/api/publish/check-quota?auth_user_id=${encodeURIComponent(uid)}`);
        const j = await r.json();
        if (alive && j && j.ok !== false && j.plan_id) setCurPlan(String(j.plan_id).toLowerCase());
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, []);

  // 결제 완료 → 5초 뒤(또는 버튼 클릭 시 즉시) 마이페이지 요금제 탭으로 복귀.
  //   replace 인 이유: 뒤로가기로 완료 화면(=이미 끝난 결제)에 되돌아오지 못하게 한다.
  function handleComplete(done) {
    if (navRef.current) return;
    navRef.current = true;
    router.replace(returnUrl(done?.planId));
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

  return (
    <div style={S.page}>
      {Header}

      <div style={S.wrap}>
        <h1 style={S.h1}>요금제 선택</h1>
        <p style={S.sub}>구매일부터 1개월 · 이용기간 내 제공량 자유사용</p>

        <PlanCards
          currentPlanId={curPlan}
          onComplete={handleComplete}
          showNotice={true}
        />
      </div>

      {Footer}
    </div>
  );
}

const S = {
  page:    { minHeight: '100vh', background: '#fafafd', fontFamily: 'system-ui, -apple-system, "Malgun Gothic", sans-serif', display: 'flex', flexDirection: 'column' },

  header:      { background: '#fff', borderBottom: '1px solid #E8E0F4' },
  // headerInner 의 maxWidth 는 wrap 과 반드시 동일값이어야 헤더 로고선과 카드 좌단이
  //   같은 축에 선다. 한쪽만 바꾸면 축이 어긋난다.
  headerInner: { maxWidth: 1260, margin: '0 auto', padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 12 },
  brand:       { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandMark:   { width: 26, height: 26, borderRadius: 8, background: '#4A148C', color: '#fff', fontSize: 11.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.02em' },
  brandName:   { fontSize: 15, fontWeight: 900, color: '#4A148C', letterSpacing: '-.01em' },
  brandDot:    { color: '#9C27B0' },
  brandTag:    { fontSize: 11.5, color: '#8b83a0', fontWeight: 700 },

  wrap:    { flex: 1, width: '100%', maxWidth: 1260, margin: '0 auto', padding: '42px 24px 56px', boxSizing: 'border-box' },
  h1:      { fontSize: 28, fontWeight: 900, color: '#2c2340', margin: 0, letterSpacing: '-.02em' },
  sub:     { color: '#8b83a0', fontSize: 13.5, fontWeight: 700, marginTop: 8, marginBottom: 28 },

  footerZone: { borderTop: '1px solid #E8E0F4', background: '#fff', padding: '18px 24px 8px' },
  policyRow:  { display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  policyLink: { fontSize: 11.5, color: '#6b6b80', textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap' },
  policySep:  { color: '#dcdce4', margin: '0 12px', fontSize: 11.5 },
};
