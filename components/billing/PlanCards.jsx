// components/billing/PlanCards.jsx
// [PLAN-CARDS-SHARED-COMPONENT-01] 요금제 카드 + 결제 로직 공용 1벌.
//
// 배경: 동일 상품 표현·결제 동선이 pages/billing/subscribe.js 와 pages/index.js(요금제 탭)에
//   나뉘어 있었다. index.js 쪽은 PLAN-TAB-SIMPLIFY-01 로 카드 렌더만 제거되고 표현 상수
//   (PLAN_ACCENT/PLAN_ORDER/PLAN_HIGHLIGHT/PLAN_CROWN)는 남아 死상수가 되어 있었다.
//   이 파일이 카드 UI·결제 로직의 정본이며, 두 화면은 여기를 호출하기만 한다.
//
// ★ 이관 범위(subscribe.js 원본 기준):
//     ACCENT / BADGE / acOf / RETURN_SEC / plans fetch / 5카드 grid / styled-jsx 반응형 /
//     handleSubscribe 전량 / submitting·msg·paymentRecovery·done 상태 / 완료카드 / 고지 안내박스
// ★ 이관하지 않음: 페이지 셸(Header/Footer/정책링크/S.page/S.wrap/h1/sub) — 호출측 소관.
//
// ★ 무접촉 원칙(이번 축에서 의미를 바꾸지 않은 것):
//   - 상품값(가격·quota·description·활성상태)은 /api/billing/plans 응답만 사용한다.
//     ACCENT / BADGE 는 표현 전용 토큰이며 상품 데이터가 아니다.
//   - 결제 성공 확정 지점 = issue-billing-key 200. 카드등록만으로 완료 표시하지 않는다.
//   - PLAN_APPLY_FAILED 는 반드시 일반 오류 분기보다 먼저 잡는다. 뒤로 흘리면
//     "구독 처리에 실패했습니다" 로 표시돼 사용자가 재결제 = 이중과금이 된다.
//   - paymentRecovery 는 화면 안내·재클릭 차단용이다. 안전장치 정본은 서버다
//     (PLAN-APPLY-RECOVERY-GATE-01 별도 축).
//
// 계약:
//   currentPlanId   현재 이용 중 플랜 id(소문자). 호출측이 이미 가진 값을 넘긴다.
//                   ★ 이 컴포넌트는 현재 플랜을 스스로 조회하지 않는다. 조회원이 늘면
//                     플랜 판정 출처가 2개가 된다.
//   onComplete      (done) => void. 결제 200 이후 RETURN_SEC 초 뒤 1회만 호출된다.
//                   즉시 실행 버튼도 같은 함수를 쓰며, 내부 ref 로 중복 호출을 막는다.
//                   미전달이면 완료 카드만 남고 아무 동작도 하지 않는다.
//   showNotice      하단 「서비스 제공기간 및 이용 안내」 노출 여부(기본 true).
//   variant         'grid'(기본) = 5카드 격자, 표준 여백. 넓은 폭(/billing/subscribe) 정본.
//                   'compact'    = 같은 카드형이되 세로 여백만 압축. 마이페이지 우측
//                                  반쪽(약 836px)에서 3+2 로 접히며, 하단 이용안내가
//                                  스크롤 없이 함께 보이게 하는 것이 목적이다.
//                   ★ 얇은 가로형(스틱) 안은 기각됐다. 249,000원짜리 상품이 설정 목록처럼
//                     보여 결제 상품의 가치감이 떨어진다. 결제 화면에서는 공간 절약보다
//                     「돈을 내는 상품으로 보이는 것」이 우선한다.
//                   ★ compact 가 바꾸는 것은 여백·최소높이뿐이다. 가격 글자크기·배지·버튼
//                     크기·설명 문구·색 토큰은 grid 와 동일하다.
//                   ★ 컨테이너 쿼리로 자동 전환하지 않고 prop 으로 명시하는 이유:
//                     카드 내부 배치값(minHeight·padding)이 인라인 style 이라 CSS 규칙이
//                     이를 이길 수 없다. 실제로 같은 함정에 한 번 걸렸다
//                     (S.grid 의 gridTemplateColumns 가 @container 를 무력화).
//                     열 수는 CSS(@container)가, 여백은 prop 이 정한다.
//   doneActionLabel / doneCountText / doneDoneText
//                   완료 카드 하단 문구. 호출측 동선(이동 vs 갱신)에 따라 달라진다.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

// plan id → 액센트 컬러. 표현 전용 상수(상품 데이터 아님).
const ACCENT = {
  free:       '#9C27B0',
  basic:      '#1565C0',
  standard:   '#03c75a',
  pro:        '#E65100',
  enterprise: '#7B1FA2',
};
const FALLBACK_AC = '#4A148C';
const acOf = (id) => ACCENT[String(id || '').toLowerCase()] || FALLBACK_AC;

// 배지 — 판매 위계(확정 상품정책 A). id 고정 매핑뿐이며 추천 판정 로직이 아니다.
const BADGE = {
  standard:   '가장 많이 선택',
  enterprise: '가장 강력한 플랜',
};

// 완료 카드 노출 시간(초). 결제금액·다음 결제일·주문번호를 읽을 시간이다. 짧게 만들지 않는다.
const RETURN_SEC = 5;

export default function PlanCards({
  currentPlanId    = null,
  onComplete       = null,
  showNotice       = true,
  variant          = 'grid',
  doneActionLabel  = '서비스로 이동',
  doneCountText    = (n) => `${n}초 후 자동으로 이동합니다`,
  doneDoneText     = '이동 중…',
}) {
  const router = useRouter();
  const [plans, setPlans]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg]               = useState('');
  // done: issue-billing-key 가 200 을 반환한 뒤에만 채워진다.
  //       = 첫 달 실청구까지 성공한 상태. 카드등록만으로는 절대 채우지 않는다.
  const [done, setDone]             = useState(null);
  // [ACCOUNT-PLAN-UPDATE-SILENT-FAIL-01] 청구는 성공했으나 accounts.plan 반영이 실패한 상태.
  //   ★ submitting 과 의미가 다르다. submitting = 요청 진행 중(finally 에서 풀림),
  //     paymentRecovery = 이미 청구됨 + 복구 필요 → 이 세션에서 재결제를 막아야 한다.
  const [paymentRecovery, setPaymentRecovery] = useState(false);
  // 타이머와 버튼이 각각 onComplete 를 호출하면 2회 실행된다. 먼저 실행된 쪽만 통과시킨다.
  //   state 가 아니라 ref 인 이유: 리렌더를 유발하면 완료 카드가 다시 그려지며 effect 가 재실행된다.
  const navRef = useRef(false);
  const [leftSec, setLeftSec] = useState(RETURN_SEC);

  const curPlan = currentPlanId ? String(currentPlanId).toLowerCase() : null;

  useEffect(() => {
    let alive = true;
    fetch('/api/billing/plans')
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        setPlans(Array.isArray(d?.plans) ? d.plans : []);
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  async function handleSubscribe(planId) {
    if (submitting) return;
    setSubmitting(true);
    setMsg('');
    try {
      // Bearer 전파
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // ── 1. 공개 PG 설정 조회 (storeId / channelKey) ──
      const cfgRes = await fetch('/api/billing/config');
      const cfg = await cfgRes.json();

      if (!cfgRes.ok || !cfg?.ok) {
        setMsg('결제 설정을 불러오지 못했습니다.');
        return;
      }
      // ★ 미설정이면 여기서 확실하게 멈춘다. 가짜 성공을 만들지 않는다.
      if (!cfg.configured || !cfg.storeId) {
        setMsg(cfg.message || '결제 모듈이 아직 활성화되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      // ── 2. 카드등록(빌링키 발급) 창 호출 ──
      //    이 단계에서는 돈이 빠져나가지 않는다. 카드 등록만 한다.
      const PortOne = (await import('@portone/browser-sdk/v2')).default;

      const plan = plans.find(p => p.id === planId);
      const issueId = `bk-${planId}-${Date.now()}`;

      const issue = await PortOne.requestIssueBillingKey({
        storeId:          cfg.storeId,
        ...(cfg.channelKey ? { channelKey: cfg.channelKey } : {}),
        billingKeyMethod: 'CARD',
        issueId,
        issueName:        `AI-POST ${plan?.label || planId} 월 정기결제`,
        customer: {
          customerId: session.user?.id || undefined,
          email:      session.user?.email || undefined,
        },
        // 모바일 리디렉션 방식 대비. 복귀 후 처리는 미구현
        //   (PORTONE-MOBILE-REDIRECT-RETURN-01 / 운영키 이후 별도 축).
        redirectUrl: typeof window !== 'undefined'
          ? `${window.location.origin}/billing/subscribe`
          : undefined,
      });

      // 실측 계약: 실패는 throw 가 아니라 code 로 온다. undefined 반환도 가능.
      if (!issue) {
        setMsg('카드 등록이 완료되지 않았습니다.');
        return;
      }
      if (issue.code) {
        setMsg(issue.message || issue.pgMessage || '카드 등록에 실패했습니다.');
        return;
      }
      if (!issue.billingKey) {
        setMsg('빌링키를 받지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      // ── 3. 서버로 전달 → 서버가 첫 달을 실제로 청구한다 ──
      //    ★ payment_id 는 보내지 않는다. 청구 ID 결정권은 서버에 있다.
      const subRes = await fetch('/api/billing/issue-billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan_id:      planId,
          billing_key:  issue.billingKey,
          customer_uid: session.user?.id || null,
          pg_provider:  'portone',
        }),
      });
      const sd = await subRes.json().catch(() => ({}));

      if (subRes.status === 401) {
        setMsg('인증이 만료되었습니다. 다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      if (subRes.status === 402) {
        // 카드 등록은 됐지만 첫 달 청구가 거절된 경우. 구독은 생성되지 않았다.
        setMsg(`첫 결제가 승인되지 않았습니다. ${sd?.reason || ''} 다른 카드로 다시 시도해 주세요.`.trim());
        return;
      }
      if (subRes.status === 409) {
        // [SUBSCRIBE-409-REASON-COLLAPSED-01] 서버가 보낸 사유를 그대로 쓴다.
        //   PAYMENT_PAST_DUE 와 QUOTA_REMAINING 은 다른 상황이다.
        setMsg(sd?.message || '현재 상태에서는 새 이용권을 구매할 수 없습니다.');
        return;
      }
      // [ACCOUNT-PLAN-UPDATE-SILENT-FAIL-01]
      //   실청구는 성공했고 subscription 도 확정됐다. accounts.plan 반영만 실패한 상태다.
      //   ★ 반드시 아래 일반 오류 분기보다 먼저 잡는다.
      //   ★ setDone 을 호출하지 않는다. 완료카드도 자동 후속동작도 발생시키지 않는다.
      if (sd?.error === 'PLAN_APPLY_FAILED') {
        setPaymentRecovery(true);
        setMsg(
          '결제는 정상적으로 완료되었습니다. 다만 이용권 등급 반영에 문제가 발생했습니다. '
          + '다시 결제하지 마시고 고객센터로 문의해 주세요.'
          + (sd?.payment_id ? ` (결제번호 ${sd.payment_id})` : '')
        );
        return;
      }

      if (!subRes.ok || !sd?.ok) {
        setMsg(sd?.error || '구독 처리에 실패했습니다. 고객센터로 문의해 주세요.');
        return;
      }

      // ── 4. 여기부터가 진짜 완료 ──
      //    실청구 성공 + subscription active + accounts.plan 승격이 끝난 상태다.
      setDone({
        planId,
        planLabel:     plan?.label || planId,
        priceKrw:      plan?.price_krw ?? null,
        nextBillingAt: sd.next_billing_at || null,
        paymentId:     sd.payment_id || null,
      });
    } catch (e) {
      setMsg('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // 완료 카드 → RETURN_SEC 초 후 onComplete 1회.
  //   ★ 조건부 return(loading/done) 보다 위에 있어야 한다. 훅은 매 렌더 같은 순서로 호출돼야 한다.
  useEffect(() => {
    if (!done) return;
    let n = RETURN_SEC;
    setLeftSec(n);
    const tick = setInterval(() => {
      n -= 1;
      setLeftSec(n > 0 ? n : 0);
    }, 1000);
    const timer = setTimeout(() => fireComplete(), RETURN_SEC * 1000);
    return () => { clearInterval(tick); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // 타이머·버튼 공용. navRef 로 1회만 통과시킨다.
  function fireComplete() {
    if (navRef.current) return;
    navRef.current = true;
    if (typeof onComplete === 'function') onComplete(done);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  if (loading) {
    return <div style={S.loading}>로딩…</div>;
  }

  // ── 완료 화면 ──
  // 도달 조건: issue-billing-key 200. 즉 첫 달 실청구 성공 + 구독 active + 플랜 승격 완료.
  if (done) {
    return (
      <div style={S.doneCard}>
        <div style={S.doneMark}>✓</div>
        <div style={S.doneTitle}>결제가 완료되었습니다</div>
        <div style={S.doneRow}>
          <span style={S.doneKey}>플랜</span>
          <span style={S.doneVal}>{done.planLabel}</span>
        </div>
        {done.priceKrw != null && (
          <div style={S.doneRow}>
            <span style={S.doneKey}>결제금액</span>
            <span style={S.doneVal}>{done.priceKrw.toLocaleString()}원</span>
          </div>
        )}
        {done.nextBillingAt && (
          <div style={S.doneRow}>
            <span style={S.doneKey}>다음 결제일</span>
            <span style={S.doneVal}>{fmtDate(done.nextBillingAt)}</span>
          </div>
        )}
        {done.paymentId && (
          <div style={S.doneRow}>
            <span style={S.doneKey}>주문번호</span>
            <span style={S.doneCode}>{done.paymentId}</span>
          </div>
        )}
        <div style={S.doneNote}>
          결제 완료 즉시 이용할 수 있습니다. 매월 같은 날짜에 동일 플랜으로 자동 갱신됩니다.
        </div>
        {/* Link 가 아니라 button 인 이유: Link 는 클릭을 가로채 이동해 버려
            타이머 취소와 중복 실행 가드를 걸 수 없다. */}
        <button type="button" style={S.doneBtn} onClick={fireComplete}>
          {doneActionLabel}
        </button>
        <div style={S.doneCount}>
          {leftSec > 0 ? doneCountText(leftSec) : doneDoneText}
        </div>
      </div>
    );
  }

  // [PLAN-CARDS-SHARED-COMPONENT-01] 여백 압축 여부. 열 수는 CSS(@container)가 정하고,
  //   여백·최소높이는 이 플래그가 정한다. 색·글자크기·버튼크기는 어느 쪽도 건드리지 않는다.
  const dense = variant === 'compact';

  // [PLAN-CARD-FREE-01] free 는 판매상품이 아니다. 렌더에서만 제외한다.
  //   ★ plans 원본·DB·quota·currentPlanId 로직 무접촉. 표시 계층 단독 변경.
  const visiblePlans = plans.filter((p) => p.id !== 'free');

  return (
    <div className="planCardsRoot">
      <div className="planGrid" style={dense ? { ...S.grid, ...S.gridDense } : S.grid}>
        {visiblePlans.map((p, i) => {
          const ac = acOf(p.id);
          const isFree = p.id === 'free';
          // [SUBSCRIBE-CURRENT-PLAN-NOT-REFLECTED-01] 현재 이용 중 판정.
          //   ★ 배지 슬롯은 1개다. 「현재 이용 중」이 추천배지보다 우선한다.
          //     두 개를 나란히 두면 labelRow minHeight 20 이 깨져 5장 가격선이 어긋난다.
          const isCur = !!curPlan && String(p.id).toLowerCase() === curPlan;
          return (
            <div
              key={p.id}
              /* [PLAN-CARDS-SHARED-COMPONENT-01] 3+2 접힘 시 둘째 줄을 오른쪽으로 민다.
                 5개가 3열로 접히면 둘째 줄이 1·2열에 붙어 BASIC 아래가 PRO 가 아니라
                 FREE 아래가 PRO 가 된다. 4번째 카드를 2열에서 시작시키면
                 BASIC↔PRO / STANDARD↔ENTERPRISE 로 세로가 맞는다.
                 ★ 인라인이 아니라 클래스인 이유: 2열·1열로 더 접힐 때 이 규칙이
                   남아 있으면 안 되며, 해제는 @container 가 해야 한다. */
              className={dense && i === 3 && visiblePlans.length === 5 ? 'shiftStart' : undefined}
              style={{
                ...S.card,
                ...(dense ? S.cardDense : null),
                borderColor: isFree ? '#E8E0F4' : `${ac}33`,
                boxShadow: isFree ? 'none' : `0 6px 20px ${ac}14`,
              }}
            >
              <div style={S.labelRow}>
                <div style={{ ...S.planLabel, color: ac }}>{p.label}</div>
                {(isCur || BADGE[p.id]) && (
                  <span style={{ ...S.badge, color: ac, background: `${ac}12`, border: `1px solid ${ac}2e` }}>
                    {isCur ? '현재 이용 중' : BADGE[p.id]}
                  </span>
                )}
              </div>

              {/* 「/월」 없음 — 캘린더 월 이용권 오해를 만든다. 이용기간은 하단 안내가 설명한다. */}
              <div style={dense ? { ...S.price, ...S.priceDense } : S.price}>
                {p.price_krw.toLocaleString()}원
              </div>

              <div style={{ ...S.quotaBox, ...(dense ? S.quotaBoxDense : null), background: `${ac}0d`, border: `1px solid ${ac}1f` }}>
                {/* free 는 결제 상품이 아니므로 「월」 기준이 유지된다. */}
                {/* [PLAN-CARD-PERIOD-01] KG 심사 요건 — 비실물(컨텐츠) 서비스는 이용기간 표기 필수.
                    ★ 「30일」 금지. 확정 정책은 달력 30일 고정이 아니라 결제일 +1개월이다.
                    하단 안내 「서비스 제공기간 — 결제일로부터 1개월(월 단위)」와 동일 기준.
                    ★ 개행은 명시(\n + pre-line)한다. 자연 줄바꿈에 맡기면 건수 자릿수(30/60/100/150)에
                      따라 BASIC만 1줄로 남아 4카드 정렬이 어긋난다. 실측으로 확인된 사항. */}
                <div style={{ ...S.quota, ...S.quotaWrap, color: ac }}>
                  {isFree
                    ? `월 ${p.monthly_quota}건 포함`
                    : `이용기간 1개월 ·\n${p.monthly_quota}건 포함`}
                </div>
                {/* [SUBSCRIBE-OVERAGE-TEXT-UNBACKED-01] 후불 초과청구는 제공하지 않는다. */}
                <div style={S.overage}>이용기간 내 자유롭게 사용</div>
              </div>

              <div style={dense ? { ...S.desc, ...S.descDense } : S.desc}>{p.description || ''}</div>

              <div style={dense ? { ...S.ctaZone, ...S.ctaZoneDense } : S.ctaZone}>
                <button
                  style={
                    (isFree || isCur)
                      ? S.btnDisabled
                      : { ...S.btn, background: ac, boxShadow: `0 4px 14px ${ac}3d` }
                  }
                  disabled={isFree || isCur || submitting || paymentRecovery}
                  onClick={() => handleSubscribe(p.id)}
                >
                  {isFree ? '기본 플랜' : (isCur ? '현재 이용 중' : '결제하기')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {msg && <div style={S.msg}>{msg}</div>}

      {showNotice && <Notice compact={dense} />}

      {/* [PLAN-CARDS-SHARED-COMPONENT-01] 반응형 기준 = 뷰포트 → 컨테이너.
          ★ 종전 media query 는 뷰포트 폭을 봤다. /billing/subscribe 는 페이지 전체(1212px)를
            쓰므로 문제가 없었으나, 마이페이지 요금제 탭은 우측 반쪽(약 836px)에 들어간다.
            뷰포트가 1920 이면 컨테이너가 836 이어도 5열을 유지해 카드당 153px 로 눌리고
            가격 줄바꿈·quotaBox 높이 불일치·가격선 어긋남이 발생한다.
            컨테이너 폭을 보게 하면 두 화면 모두 자기 폭에 맞는 열 수를 고른다.
          ★ 카드 디자인·크기·토큰은 1도 바뀌지 않는다. 접히는 지점의 기준만 바꾼다.
          ★ 분기값 재산정 근거(실측): subscribe 컨테이너 1212px → 5열 유지(종전과 동일),
            마이페이지 우측 836px → 3열(카드당 약 264px, subscribe 의 228px 보다 넓다).
          ★ auto-fit 을 쓰지 않는 이유는 종전과 같다 — 접힘 지점을 브라우저가 정하면
            4+1 같은 형태가 나온다.
          ★ @supports 폴백: 컨테이너 쿼리 미지원 브라우저에서는 종전 뷰포트 규칙 그대로. */}
      <style jsx>{`
        .planCardsRoot { container-type: inline-size; }
        .planGrid { grid-template-columns: repeat(4, 1fr); }
        @container (max-width: 820px) {
          .planGrid { grid-template-columns: repeat(3, 1fr); }
          .planGrid .shiftStart { grid-column-start: 2; }
        }
        @container (max-width: 620px)  {
          .planGrid { grid-template-columns: repeat(2, 1fr); }
          .planGrid .shiftStart { grid-column-start: auto; }
        }
        @container (max-width: 420px)  { .planGrid { grid-template-columns: 1fr; } }
        @supports not (container-type: inline-size) {
          @media (max-width: 900px)  { .planGrid { grid-template-columns: repeat(3, 1fr); } }
          @media (max-width: 660px)  { .planGrid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 520px)  { .planGrid { grid-template-columns: 1fr; } }
        }
      `}</style>
    </div>
  );
}

// 서비스 제공기간·자동갱신 고지 — 전자상거래법 및 PG 심사 모니터링 항목.
//   ★ 문안은 1글자도 변경하지 않는다. grid / compact 두 모드가 같은 이 함수를 부른다 —
//     모드별로 복사해 두면 한쪽만 고쳐졌을 때 정책 문구가 어긋난다(S202 사고 유형).
function Notice({ compact = false }) {
  const box  = compact ? { ...S.notice, ...S.noticeCompact } : S.notice;
  const head = compact ? { ...S.noticeHead, ...S.noticeHeadCompact } : S.noticeHead;
  const item = compact ? { ...S.noticeItem, ...S.noticeItemCompact } : S.noticeItem;
  return (
    <div style={box}>
      <div style={head}>서비스 제공기간 및 이용 안내</div>
      <div style={item}>· 서비스 제공기간 — 결제일로부터 1개월(월 단위). 별도 배송이 없는 온라인 서비스로, 결제 완료 즉시 이용할 수 있습니다.</div>
      <div style={item}>· 자동갱신 — 월 정기결제이며 매 결제일에 동일 플랜으로 자동 갱신됩니다. 해지 시 다음 결제일부터 청구되지 않으며, 이미 결제된 이용기간은 만료일까지 이용할 수 있습니다.</div>
      <div style={item}>· 제공 건수 — 각 플랜의 월 제공 생성 건수는 이용기간 내 자유롭게 사용할 수 있으며, 이용기간 시작 시 초기화되고 다음 기간으로 이월되지 않습니다. 일별 사용 제한은 없습니다.</div>
      <div style={item}>· 초과 이용 — 제공 건수를 모두 사용하면 추가 생성이 중지됩니다. 초과 사용분에 대한 후불 추가 요금은 청구되지 않습니다.</div>
      <div style={item}>· 청약철회 및 환불 — 환불정책에 따르며, 사용한 생성 건수만큼 공제 후 잔액을 환불합니다.</div>
      <div style={item}>· 이용요금은 부가세 포함 금액입니다.</div>
    </div>
  );
}

const S = {
  loading: { padding: '60px 0', textAlign: 'center', color: '#8b83a0', fontSize: 14 },

  // [PLAN-CARDS-SHARED-COMPONENT-01] gridTemplateColumns 인라인 삭제.
  //   ★ 인라인 style 은 CSS 명시도 최상위라 @media·@container 어떤 규칙보다 우선한다.
  //     여기에 repeat(5,1fr) 이 남아 있으면 접힘 규칙이 영원히 적용되지 않는다.
  //     종전 subscribe.js 에도 동일 결함이 있었으나 뷰포트 1920 에서 5열이 정답이라
  //     증상이 드러나지 않았을 뿐이다(DevTools 실측: 컨테이너 460px 에서도 5열 유지).
  //   ★ 열 수 결정권은 아래 .planGrid 규칙 1곳뿐이다. 기본값이 repeat(4,1fr) 이므로
  //     [PLAN-CARD-FREE-01] 유료 4카드 한 줄이 정본이다. <style jsx> 는 SSR 시 함께 인라인되어 깜빡임도 없다.
  grid:    { display: 'grid', gap: 17, alignItems: 'stretch' },
  card:    { display: 'flex', flexDirection: 'column', border: '1px solid #E8E0F4', borderRadius: 16, padding: '22px 20px 20px', background: '#fff', boxSizing: 'border-box' },

  // 배지 자리를 항상 확보한다(minHeight). 배지 유무로 아래 요소가 밀리면 5장 가격선이 어긋난다.
  labelRow:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 20 },
  planLabel: { fontSize: 11.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em' },
  badge:     { fontSize: 10, fontWeight: 900, padding: '3.5px 8px', borderRadius: 999, whiteSpace: 'nowrap', letterSpacing: '-.01em' },

  // [PLAN-CARD-CENTER-01] 플랜명·배지(labelRow)는 좌우 분할 유지. 금액부터 아래만 중앙 정렬한다.
  price:     { fontSize: 28, fontWeight: 900, color: '#2c2340', marginTop: 9, letterSpacing: '-.02em', textAlign: 'center' },

  quotaBox: { marginTop: 15, padding: '11px 12px', borderRadius: 11, minHeight: 84, boxSizing: 'border-box', textAlign: 'center' },
  quota:    { fontSize: 13.5, fontWeight: 800 },
  // [PLAN-CARD-PERIOD-01] 2줄 확정 토큰. pre-line 이 \n 을 살리고, lineHeight 명시로
  //   상속값 변동에 관계없이 4카드 줄높이가 동일해진다. 폰트크기·굵기 무접촉.
  quotaWrap: { whiteSpace: 'pre-line', lineHeight: 1.45 },
  overage:  { marginTop: 3.5, fontSize: 11.5, color: '#8b83a0', fontWeight: 700 },

  // minHeight 고정 = CTA Y축 일치의 근거. description 줄 수가 플랜마다 달라도 버튼선이 유지된다.
  desc:    { marginTop: 13, fontSize: 12.5, color: '#4a4458', lineHeight: 1.6, borderTop: '1px solid #F4F0FA', paddingTop: 12, minHeight: 62, textAlign: 'center' },

  ctaZone: { marginTop: 'auto', paddingTop: 16 },

  // ── compact(dense) 전용 여백 오버라이드 ── [PLAN-CARDS-SHARED-COMPONENT-01]
  //   ★ 여백과 최소높이만 줄인다. 폭·가격 글자크기(28)·배지·버튼 크기·설명 문구·색은 무접촉이다.
  //   ★ 2차 압축(누적 약 22%). 1차(12%) 후에도 가격 아래·설명 아래·버튼 위에 여유가 남아
  //     추가로 줄였다. 20% 이상 한 번에 줄이면 카드가 스틱형처럼 보여 상품 가치감이 떨어지므로
  //     단계를 나눴다.
  //   ★ 4차 미세 압축(누적 약 32%). 1920×1080 에서 3+2 카드 + 이용안내 박스 하단까지
  //     여백을 두고 들어오는 선이다. 여기서 종료하며 더 줄이지 않는다 — 더 압축하면
  //     상품 카드가 아니라 설정 목록처럼 보인다(스틱형 기각 사유와 동일).
  //   ★ desc 의 minHeight 를 유지하는 이유는 grid 모드와 같다 — CTA 버튼선 일치의 근거다.
  //     값만 62 → 41 로 줄이고 역할은 그대로 둔다.
  gridDense:     { gap: 10, marginTop: 10 },
  cardDense:     { padding: '18px 18px 16px' },
  priceDense:    { marginTop: 7 },
  quotaBoxDense: { marginTop: 12, padding: '9px 12px', minHeight: 80 },
  descDense:     { marginTop: 10, paddingTop: 10, minHeight: 54 },
  ctaZoneDense:  { paddingTop: 13 },
  btn:     { width: '100%', padding: '11.5px 0', border: 0, borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' },
  btnDisabled: { width: '100%', padding: '11.5px 0', border: '1.5px solid #E8E0F4', borderRadius: 10, background: '#F7F5FB', color: '#b4adc4', cursor: 'not-allowed', fontSize: 14, fontWeight: 800, fontFamily: 'inherit' },

  msg:     { marginTop: 22, padding: '12px 14px', background: '#fef3c7', border: '1px solid #f5dfa0', borderRadius: 10, fontSize: 13, color: '#6b5a2a', fontWeight: 700 },

  notice:     { marginTop: 32, padding: '26px 30px 28px', background: '#fff', border: '1px solid #e8e4f0', borderRadius: 14, fontSize: 13.5, color: '#54546a', lineHeight: 1.8 },
  noticeHead: { fontWeight: 900, color: '#4A148C', fontSize: 14.5, marginBottom: 13 },
  noticeItem: { marginTop: 8, breakInside: 'avoid' },
  //   compact 모드 전용 여백 축소. 문안은 1글자도 바꾸지 않는다 — 여백·줄간격·글자크기만 줄인다.
  //   ★ 목적은 첫 화면에서 3+2 카드 + 이용안내 6항목이 스크롤 없이 함께 보이는 것이다.
  //     항목을 줄이거나 접는 방식은 쓰지 않는다. 이 문안은 전자상거래법·PG 심사 고지문이라
  //     화면에 전량 노출되어 있어야 한다.
  noticeCompact:     { marginTop: 4, padding: '14px 16px 15px', fontSize: 12, lineHeight: 1.55 },
  noticeHeadCompact: { fontSize: 13, marginBottom: 9 },
  noticeItemCompact: { marginTop: 5 },

  // 완료 화면 — 기존 브랜드 토큰 재사용(신규 색 도입 없음)
  doneCard:  { maxWidth: 440, margin: '40px auto 0', background: '#fff', border: '1px solid #E8E0F4', borderRadius: 16, padding: '30px 26px 26px', textAlign: 'center' },
  doneMark:  { width: 46, height: 46, margin: '0 auto 14px', borderRadius: '50%', background: '#4A148C0d', border: '1px solid #4A148C1f', color: '#4A148C', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 19, fontWeight: 900, color: '#2c2340', letterSpacing: '-.02em', marginBottom: 18 },
  doneRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '9px 0', borderTop: '1px solid #F4F0FA', textAlign: 'left' },
  doneKey:   { fontSize: 12, color: '#8b83a0', fontWeight: 700 },
  doneVal:   { fontSize: 13.5, color: '#2c2340', fontWeight: 800 },
  doneCode:  { fontSize: 11, color: '#8b83a0', fontWeight: 700, wordBreak: 'break-all', textAlign: 'right' },
  doneNote:  { marginTop: 16, padding: '11px 12px', background: '#F7F5FB', borderRadius: 10, fontSize: 11.5, color: '#5a5a6a', lineHeight: 1.65, textAlign: 'left' },
  doneBtn:   { display: 'block', width: '100%', marginTop: 18, padding: '12px 0', border: 0, borderRadius: 10, background: '#4A148C', color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 14px #4A148C3d' },
  doneCount: { marginTop: 10, fontSize: 11.5, color: '#8b83a0', fontWeight: 700 },
};
