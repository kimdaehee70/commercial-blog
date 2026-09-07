// pages/billing/m/[token].js
// [PAYMENT-PC-MOBILE-QR-BRIDGE-01 / STEP3] 모바일 결제 페이지.
//
// 동선: QR 스캔 → 이 페이지 → public 조회로 금액·플랜 확인 → 사용자가 버튼 클릭 →
//       PortOne 브라우저 SDK requestIssueBillingKey → billing_key 를 /api/billing/qr-complete 로 전달.
//
// 원칙:
//   · ★ 자동 실행 금지. 페이지 진입만으로 결제창을 열지 않는다.
//     단 [PORTONE-MOBILE-REDIRECT-RETURN-01] 카드사 앱 인증 후 복귀는 예외다.
//     이미 사용자가 결제를 마치고 돌아온 것이므로 추가 클릭을 요구하지 않는다.
//   · ★ 금액·플랜은 표시만 한다. qr-complete 로 보내지 않는다(서버가 토큰에서 읽는다).
//   · ★ 업체명 미표시 확정 — QR-MOBILE-DISCLOSURE-SCOPE-01.
//   · 로그인 불필요. 신원은 token 이 증명한다.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

const PHASE = {
  LOADING: 'loading',
  READY:   'ready',
  PAYING:  'paying',
  DONE:    'done',
  ERROR:   'error',
};

// [PORTONE-MOBILE-REDIRECT-RETURN-01] 리디렉션 복귀 파라미터.
//   ★ 실측 출처: @portone/browser-sdk 의 IssueBillingKeyResponse 타입.
//     - 해당 타입 주석: 「리디렉션 없이 빌링키 발급 UI가 표시된 경우 반환값」
//       → 리디렉션 방식에서는 Promise 가 해소되지 않는다.
//     - forceRedirect 주석: 「원래 프로미스로 resolve 되었을 상황에서도
//       redirectUrl 로 쿼리 파라미터와 함께 리디렉션합니다」
//       → 쿼리 파라미터 집합 = resolve 페이로드 = IssueBillingKeyResponse 필드.
//   ★ 확정 필드만 쓴다: billingKey · code · message · pgMessage.
//     추측한 이름을 추가하지 않는다.
const RET_KEYS = ['billingKey', 'code'];

function won(n) {
  return typeof n === 'number' ? n.toLocaleString('ko-KR') : '-';
}

export default function MobileBillingPage() {
  const router = useRouter();
  const { token } = router.query;

  const [phase, setPhase] = useState(PHASE.LOADING);
  const [session, setSession] = useState(null);
  const [msg, setMsg] = useState('');
  const [charged, setCharged] = useState(false);

  // ─── 세션 조회 (무인증 public) ───
  //   [QR-MOBILE-SESSION-LOAD-01]
  //   ★ router.isReady 를 기다린 뒤 그 시점의 query 에서 token 을 직접 읽는다.
  //     구조분해한 token 을 의존성으로 쓰면 isReady 전환과 token 채워짐이
  //     서로 다른 렌더에서 일어나며 effect 가 두 번 돌고, 첫 회 cleanup 이
  //     두 번째 회의 응답을 무효화할 수 있다. 진입점을 하나로 만든다.
  //   ★ 실패 사유를 화면에 그대로 노출한다. public.js 의 비200 경로는
  //     400 token required · 404 session not found · 410 SESSION_NOT_AVAILABLE ·
  //     503 lookup failed 4개다. 어느 쪽인지 감추면 진단이 한 번 더 필요해진다.
  useEffect(() => {
    if (!router.isReady) return;

    const q  = router.query || {};
    // 복귀 진입이면 세션 조회로 화면을 READY 로 되돌리지 않는다.
    //   되돌리면 결제가 끝난 사용자에게 결제 버튼이 다시 보인다.
    if (RET_KEYS.some((k) => q[k] != null && q[k] !== '')) return;

    const tk = Array.isArray(q.token) ? q.token[0] : q.token;
    if (!tk) {
      setPhase(PHASE.ERROR);
      setMsg('결제 주소가 올바르지 않습니다. PC 화면에서 QR 을 다시 발급해 주세요.');
      return;
    }

    let alive = true;

    (async () => {
      try {
        const r = await fetch(`/api/billing/qr-session/public?token=${encodeURIComponent(tk)}`);
        const j = await r.json().catch(() => null);
        if (!alive) return;

        if (!r.ok) {
          setPhase(PHASE.ERROR);
          if (j?.error === 'SESSION_NOT_AVAILABLE') {
            setMsg('QR 유효시간이 지났거나 이미 처리된 결제입니다.\nPC 화면에서 QR 을 다시 발급해 주세요.');
          } else {
            setMsg(
              '결제 정보를 불러오지 못했습니다. PC 화면에서 QR 을 다시 발급해 주세요.\n'
              + `(${r.status} ${j?.error || 'unknown'})`
            );
          }
          return;
        }
        setSession(j);
        setPhase(PHASE.READY);
      } catch (e) {
        if (!alive) return;
        setPhase(PHASE.ERROR);
        setMsg(`네트워크 오류입니다. 잠시 후 다시 시도해 주세요.\n(${String(e?.message || e)})`);
      }
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.asPath]);

  // ─────────────────────────────────────────────────────────
  // [PORTONE-MOBILE-REDIRECT-RETURN-01] 카드사 앱 인증 후 복귀 처리.
  //   ★ 사용자가 결제 버튼을 다시 누르게 만들지 않는다. billingKey 가 있으면 즉시 청구한다.
  //   ★ code 가 있으면 자동청구하지 않는다. 실패로 표시하고 끝낸다.
  //   ★ 복귀 여부 판정은 쿼리 파라미터 존재로만 한다. 세션 status 로 추측하지 않는다.
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query || {};
    const isReturn = RET_KEYS.some((k) => q[k] != null && q[k] !== '');
    if (!isReturn) return;

    // 실패 복귀 — 돈이 나가지 않았다. 청구를 시도하지 않는다.
    if (q.code) {
      setPhase(PHASE.ERROR);
      setMsg(
        String(q.message || q.pgMessage || '카드 등록에 실패했습니다.')
        + '\nPC 화면에서 QR 을 다시 발급해 주세요.'
      );
      return;
    }

    // 성공 복귀 — 추가 클릭 없이 이어서 청구한다.
    submitBillingKey(String(q.billingKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query?.billingKey, router.query?.code]);

  // ─── billingKey → qr-complete. 리디렉션 복귀와 Promise 복귀가 공유한다. ───
  const submitBillingKey = useCallback(async (billingKey) => {
    if (!billingKey) {
      setPhase(PHASE.ERROR);
      setMsg('카드 등록 결과를 확인하지 못했습니다. PC 화면에서 QR 을 다시 발급해 주세요.');
      return;
    }
    setPhase(PHASE.PAYING);
    setMsg('');
    try {
      const r = await fetch('/api/billing/qr-complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // ★ plan_id · amount 를 보내지 않는다. 서버가 토큰에서 읽는다.
        body: JSON.stringify({
          token,
          billing_key: billingKey,
          // ★ 실측: issue 응답에 card.* / pgProvider 필드는 없다.
          //   PC 경로(PlanCards.jsx)도 pg_provider 를 'portone' 고정으로 보낸다.
          pg_provider: 'portone',
        }),
      });
      const j = await r.json().catch(() => ({}));

      if (j?.charged) {
        setCharged(true);
        setPhase(PHASE.DONE);
        setMsg(j.message || '결제는 정상 완료되었습니다. 다시 결제하지 마시고 고객센터로 문의해 주세요.');
        return;
      }
      if (r.ok && j?.ok) {
        setPhase(PHASE.DONE);
        return;
      }
      setPhase(PHASE.ERROR);
      setMsg(j?.message || '결제에 실패했습니다. PC 화면에서 QR 을 다시 발급해 주세요.');
    } catch (e) {
      console.error('[billing/m] qr-complete failed', e);
      setPhase(PHASE.ERROR);
      setMsg('결제 진행 중 오류가 발생했습니다. PC 화면에서 QR 을 다시 발급해 주세요.');
    }
  }, [token]);

  const pay = useCallback(async () => {
    if (phase !== PHASE.READY) return;   // ★ 중복 클릭 차단
    setPhase(PHASE.PAYING);
    setMsg('');

    try {
      // ── PG 설정 조회 ──
      //   ★ 실측: storeId/channelKey 는 NEXT_PUBLIC 환경변수가 아니라 /api/billing/config 다.
      //     PlanCards.jsx 와 동일 경로를 쓴다. 이 엔드포인트는 무인증이다.
      const cfgRes = await fetch('/api/billing/config');
      const cfg = await cfgRes.json();
      if (!cfgRes.ok || !cfg?.ok || !cfg.configured || !cfg.storeId) {
        setPhase(PHASE.ERROR);
        setMsg(cfg?.message || '결제 모듈이 아직 활성화되지 않았습니다.');
        return;
      }

      // ── KG 필수 고객정보 [BILLINGKEY-CUSTOMER-REQUIRED-01] ──
      //   ★ fullName / phoneNumber 는 REQUIRED. 누락 시 KG 가 400 INVALID_REQUEST 로 거절한다.
      //     폰은 로그인 상태가 아니므로 /api/me/store 를 쓸 수 없다.
      //   ★ 결제 버튼을 누른 뒤에 가져온다. 페이지 진입만으로 이름·전화번호를 내려받지 않는다.
      //   ★ fail-closed. 없으면 결제창을 열지 않는다. 값을 여기서 만들지 않는다.
      const ipRes = await fetch(
        `/api/billing/qr-session/issue-params?token=${encodeURIComponent(token)}`
      );
      const ip = await ipRes.json();
      if (!ipRes.ok || !ip?.ok || !ip.cust_name || !ip.cust_phone) {
        setPhase(PHASE.ERROR);
        setMsg('QR 유효시간이 지났거나 이미 처리된 결제입니다.\nPC 화면에서 QR 을 다시 발급해 주세요.');
        return;
      }

      const PortOne = (await import('@portone/browser-sdk/v2')).default;

      const issued = await PortOne.requestIssueBillingKey({
        storeId:          cfg.storeId,
        ...(cfg.channelKey ? { channelKey: cfg.channelKey } : {}),
        billingKeyMethod: 'CARD',
        issueId:          `bk-qr-${String(token).slice(0, 12)}-${Date.now()}`,
        issueName:        `AI-POST ${session.plan_label} 월 정기결제`,
        customer: {
          fullName:    ip.cust_name,
          phoneNumber: ip.cust_phone,
        },
        // ★ window.location.href 를 쓰지 않는다. 복귀 파라미터가 붙은 URL 로 재시도하면
        //   이전 결과가 새 결과와 섞인다. 항상 깨끗한 기준 URL 로 돌아온다.
        redirectUrl: typeof window !== 'undefined'
          ? `${window.location.origin}/billing/m/${token}`
          : undefined,
        // ★ [PORTONE-OFFER-PERIOD-REQUIRED-01] forceRedirect 경로 전용 필수 필드.
        //   forceRedirect 방식에서만 SDK 가 offerPeriod 를 (null, null) 로 직렬화해 전송한다.
        //   서버는 range | interval 중 하나를 요구하므로 그대로 거절된다.
        //     실측 에러: offerPeriod violates the rule AT_LEAST_ONE_REQUIRED
        //               (value="(null, null)") | code=INVALID_REQUEST
        //   PC 창 방식(PlanCards.jsx)은 필드 자체가 생략되어 무영향 — PC 에 넣지 않는다.
        //   ★ 실측 출처: @portone/browser-sdk dist/v2/request/OfferPeriod.d.ts
        //     interval 형식 = `${number}d | ${number}m | ${number}y` (공식 예: '30d' '6m' '1y')
        //     월 정기결제이므로 '1m'. 다른 표기(P1M 등)는 규격 위반이다.
        offerPeriod: { interval: '1m' },
        // ★ [PORTONE-MOBILE-REDIRECT-RETURN-01] 복귀 경로를 하나로 고정한다.
        //   모바일은 어차피 리디렉션이고, 이 페이지는 모바일 전용이다. 경로가 둘이면
        //   한쪽만 고쳐졌을 때 조용히 갈라진다.
        forceRedirect: true,
      });

      // ── 여기 아래는 forceRedirect 가 동작하지 않은 경우에만 도달한다 ──
      //   ★ 정상 모바일 동선에서는 위 호출에서 페이지가 리디렉션되어 이 줄에 오지 않는다.
      //     복귀 처리는 상단 useEffect 가 담당한다.
      //   ★ 그래도 남겨 둔다. 도달했다는 것은 창 방식으로 열렸다는 뜻이고,
      //     그때 결과를 버리면 카드만 등록되고 청구가 누락된다.
      if (!issued) {
        setPhase(PHASE.ERROR);
        setMsg('카드 등록이 완료되지 않았습니다.');
        return;
      }
      if (issued.code) {
        setPhase(PHASE.ERROR);
        setMsg(issued.message || issued.pgMessage || '카드 등록에 실패했습니다.');
        return;
      }
      await submitBillingKey(issued.billingKey);
      return;
    } catch (e) {
      console.error('[billing/m] pay failed', e);
      setPhase(PHASE.ERROR);
      // ── [PORTONE-MOBILE-PAY-EXCEPTION-01] CLOSED ──
      //   ★ 원인 확정 완료(PORTONE-OFFER-PERIOD-REQUIRED-01). TRACE 전용 화면 출력을 제거했다.
      //     예외 상세는 console.error 로만 남긴다. 사용자 화면에 내부 문자열을 노출하지 않는다.
      setMsg('결제 진행 중 오류가 발생했습니다. PC 화면에서 QR 을 다시 발급해 주세요.');
    }
  }, [phase, token]);

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.brand}>AI-POST 정기결제</div>

        {phase === PHASE.LOADING && <p style={S.dim}>결제 정보를 불러오는 중…</p>}

        {(phase === PHASE.READY || phase === PHASE.PAYING) && session && (
          <>
            <dl style={S.dl}>
              <Row k="플랜"   v={session.plan_label} />
              <Row k="금액"   v={`${won(session.amount_krw)}원 / 월`} />
              <Row k="연락처" v={session.cust_phone_masked} />
            </dl>

            <p style={S.notice}>
              결제 후 해당 AI-POST 계정에 {session.plan_label} 플랜이 적용됩니다.
            </p>

            <button
              onClick={pay}
              disabled={phase === PHASE.PAYING}
              style={{ ...S.btn, ...(phase === PHASE.PAYING ? S.btnOff : null) }}
            >
              {phase === PHASE.PAYING ? '진행 중…' : '카드 등록하고 결제하기'}
            </button>

            <p style={S.fine}>QR 은 발급 후 10분간 유효합니다.</p>
          </>
        )}

        {phase === PHASE.DONE && (
          <>
            <div style={S.ok}>{charged ? '결제 완료' : '결제가 완료되었습니다'}</div>
            <p style={S.dim}>
              {msg || 'PC 화면이 자동으로 갱신됩니다. 이 창은 닫으셔도 됩니다.'}
            </p>
          </>
        )}

        {phase === PHASE.ERROR && (
          <>
            <div style={S.bad}>진행할 수 없습니다</div>
            <p style={{ ...S.dim, whiteSpace: 'pre-line' }}>{msg}</p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={S.row}>
      <dt style={S.dt}>{k}</dt>
      <dd style={S.dd}>{v || '-'}</dd>
    </div>
  );
}

const S = {
  wrap:   { minHeight: '100vh', background: '#f5f6f8', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' },
  card:   { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: '28px 22px',
            boxShadow: '0 2px 16px rgba(0,0,0,.06)' },
  brand:  { fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 20 },
  dl:     { margin: 0 },
  row:    { display: 'flex', justifyContent: 'space-between', padding: '11px 0',
            borderBottom: '1px solid #eee' },
  dt:     { margin: 0, fontSize: 14, color: '#777' },
  dd:     { margin: 0, fontSize: 15, fontWeight: 600, color: '#111' },
  notice: { fontSize: 13, color: '#555', lineHeight: 1.6, margin: '18px 0 20px' },
  btn:    { width: '100%', padding: '15px 0', fontSize: 16, fontWeight: 700, color: '#fff',
            background: '#2f6bff', border: 0, borderRadius: 12, cursor: 'pointer' },
  btnOff: { background: '#9db4e8', cursor: 'default' },
  fine:   { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 14 },
  ok:     { fontSize: 18, fontWeight: 700, color: '#137333', marginBottom: 10 },
  bad:    { fontSize: 17, fontWeight: 700, color: '#b3261e', marginBottom: 10 },
  dim:    { fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0 },
};
