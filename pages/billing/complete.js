// pages/billing/complete.js
// 결제 완료 확인 페이지 — S191 BILLING-COMPLETE-PAGE-01
// PortOne 결제창 종료 후 리다이렉트 착지점. payment_id를 받아 서버에 확정 요청만 한다.
//
// ★ 이 화면은 결제 성공을 스스로 판단하지 않는다. 판정은 전적으로 POST /api/billing/complete 응답이다.
//   - 200 → 완료(status: PAID | ALREADY_PAID)
//   - 202 → 확인 중(reason: NOT_PAID_YET). 실패가 아니다.
//   - 그 외 → 확인 실패. 성공으로 오인 표시 금지.
// - payment_id 부재 시 서버 호출 자체를 하지 않고 안내 상태로 끝낸다.
// - 표현 계층은 /billing/subscribe(065402a) 디자인 토큰 계승. 결제 로직·API 계약 무접촉.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import SiteFooter from '../../components/SiteFooter';

// 화면 상태 — 서버 응답에서만 파생된다.
const ST = {
  LOADING: 'LOADING',   // 확인 요청 중
  DONE:    'DONE',      // 200
  PENDING: 'PENDING',   // 202
  FAIL:    'FAIL',      // 400 / 401 / 403 / 404 / 500 / 네트워크
  NOPARAM: 'NOPARAM',   // payment_id 없음 — 성공 아님
};

export default function BillingCompletePage() {
  const router = useRouter();
  const [state, setState] = useState(ST.LOADING);
  const [detail, setDetail] = useState('');
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    // PortOne 리다이렉트 파라미터 표기 흔들림 수용(paymentId / payment_id)
    const q = router.query || {};
    const paymentId = String(q.paymentId || q.payment_id || '').trim();

    if (!paymentId) {
      setState(ST.NOPARAM);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;
        if (!session) {
          router.replace('/login');
          return;
        }

        const r = await fetch('/api/billing/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ payment_id: paymentId }),
        });

        let d = null;
        try { d = await r.json(); } catch (_) { d = null; }
        if (!alive) return;

        if (r.status === 200 && d?.ok) {
          setInfo({
            status: d?.status || null,
            plan_id: d?.plan_id || null,
            subscription: d?.subscription || null,
          });
          setState(ST.DONE);
          return;
        }

        if (r.status === 202) {
          setDetail(d?.reason || d?.error || '');
          setState(ST.PENDING);
          return;
        }

        setDetail(d?.detail || d?.reason || d?.error || `HTTP ${r.status}`);
        setState(ST.FAIL);
      } catch (e) {
        if (!alive) return;
        setDetail('네트워크 오류');
        setState(ST.FAIL);
      }
    })();

    return () => { alive = false; };
  }, [router.isReady, router.query]);

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

  const Body = (() => {
    if (state === ST.LOADING) {
      return (
        <Card tone="#4A148C" mark="…" title="결제 확인 중입니다">
          <p style={S.desc}>결제 결과를 확인하고 있습니다. 이 화면을 닫지 마세요.</p>
        </Card>
      );
    }

    if (state === ST.DONE) {
      return (
        <Card tone="#03c75a" mark="✓" title="결제가 완료되었습니다">
          <p style={S.desc}>구독이 정상 처리되었습니다.</p>
          <dl style={S.dl}>
            {info?.status ? <Row k="처리 상태" v={info.status} /> : null}
            {info?.plan_id ? <Row k="플랜" v={String(info.plan_id).toUpperCase()} /> : null}
            {info?.subscription?.id ? <Row k="구독 번호" v={info.subscription.id} /> : null}
          </dl>
          <div style={S.btnRow}>
            <Link href="/" style={S.btnPrimary}>서비스로 이동</Link>
          </div>
        </Card>
      );
    }

    if (state === ST.PENDING) {
      return (
        <Card tone="#E65100" mark="!" title="결제 확인 중입니다">
          <p style={S.desc}>
            아직 입금·승인이 확인되지 않았습니다. 실패가 아니며, 확인까지 시간이 걸릴 수 있습니다.
            잠시 후 다시 확인해 주세요.
          </p>
          {detail ? <p style={S.code}>{detail}</p> : null}
          <div style={S.btnRow}>
            <button type="button" onClick={() => router.reload()} style={S.btnPrimary}>다시 확인</button>
            <Link href="/billing/subscribe" style={S.btnGhost}>요금제로</Link>
          </div>
        </Card>
      );
    }

    if (state === ST.NOPARAM) {
      return (
        <Card tone="#8b83a0" mark="?" title="결제 정보가 없습니다">
          <p style={S.desc}>
            결제 식별자가 전달되지 않아 결과를 확인할 수 없습니다.
            결제를 진행하셨다면 요금제 화면에서 다시 시도해 주세요.
          </p>
          <div style={S.btnRow}>
            <Link href="/billing/subscribe" style={S.btnPrimary}>요금제로</Link>
          </div>
        </Card>
      );
    }

    return (
      <Card tone="#C62828" mark="×" title="결제 확인에 실패했습니다">
        <p style={S.desc}>
          결제 결과를 확인하지 못했습니다. 결제가 이미 처리되었을 수 있으니
          중복 결제를 피하기 위해 아래 문의처로 확인해 주세요.
        </p>
        {detail ? <p style={S.code}>{detail}</p> : null}
        <div style={S.btnRow}>
          <button type="button" onClick={() => router.reload()} style={S.btnPrimary}>다시 확인</button>
          <Link href="/billing/subscribe" style={S.btnGhost}>요금제로</Link>
        </div>
      </Card>
    );
  })();

  return (
    <div style={S.page}>
      {Header}
      <div style={S.wrap}>{Body}</div>
      <div style={S.footerZone}>
        <SiteFooter />
      </div>
    </div>
  );
}

function Card({ tone, mark, title, children }) {
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${tone}` }}>
      <div style={{ ...S.mark, background: `${tone}12`, color: tone, border: `1px solid ${tone}3d` }}>{mark}</div>
      <h1 style={S.title}>{title}</h1>
      {children}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={S.row}>
      <dt style={S.dt}>{k}</dt>
      <dd style={S.dd}>{v}</dd>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#fafafd',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Malgun Gothic","맑은 고딕",sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: { background: '#fff', borderBottom: '1px solid #E8E0F4' },
  headerInner: {
    maxWidth: 1080, margin: '0 auto', padding: '14px 20px',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  brandMark: {
    width: 28, height: 28, borderRadius: 8, background: '#4A148C', color: '#fff',
    fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 17, fontWeight: 800, color: '#4a4458', letterSpacing: '-0.3px' },
  brandDot: { color: '#4A148C' },
  brandTag: { fontSize: 12, color: '#b4adc4' },

  wrap: { flex: 1, maxWidth: 560, width: '100%', margin: '0 auto', padding: '48px 20px 64px' },
  card: {
    background: '#fff', border: '1px solid #E8E0F4', borderRadius: 14,
    padding: '32px 28px', textAlign: 'center',
  },
  mark: {
    width: 52, height: 52, borderRadius: '50%', margin: '0 auto 18px',
    fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: 800, color: '#4a4458', margin: '0 0 10px', letterSpacing: '-0.4px' },
  desc: { fontSize: 14, lineHeight: 1.7, color: '#8b83a0', margin: '0 0 4px' },
  code: {
    fontSize: 12, color: '#b4adc4', background: '#F7F5FB', border: '1px solid #F4F0FA',
    borderRadius: 8, padding: '8px 10px', margin: '14px 0 0', wordBreak: 'break-all',
  },

  dl: { margin: '20px 0 0', padding: '16px 0 0', borderTop: '1px solid #F4F0FA', textAlign: 'left' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0' },
  dt: { fontSize: 13, color: '#b4adc4', margin: 0 },
  dd: { fontSize: 13, color: '#4a4458', fontWeight: 600, margin: 0, wordBreak: 'break-all' },

  btnRow: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' },
  btnPrimary: {
    display: 'inline-block', padding: '11px 22px', borderRadius: 9,
    background: '#4A148C', color: '#fff', fontSize: 14, fontWeight: 700,
    textDecoration: 'none', border: 'none', cursor: 'pointer',
  },
  btnGhost: {
    display: 'inline-block', padding: '11px 22px', borderRadius: 9,
    background: '#fff', color: '#4A148C', fontSize: 14, fontWeight: 700,
    textDecoration: 'none', border: '1px solid #E8E0F4', cursor: 'pointer',
  },

  footerZone: { borderTop: '1px solid #E8E0F4', background: '#fff' },
};
