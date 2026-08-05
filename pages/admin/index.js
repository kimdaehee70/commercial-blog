// pages/admin/index.js
// v3.1 (세션77 · KpiSm 승격): 페이지 전용 KPI 제거 → adminTheme.Stat size="sm"
// - v2.8 에서 급히 만든 로컬 KpiSm 은 공통 Stat 과 같은 것의 두 번째 판이었다. 그대로 두면
//   색·굵기가 갈라진다 → adminTheme v2.2 의 size 옵션으로 흡수하고 여기서는 삭제.
// - 대시보드가 sm 인 이유: 반폭에 6칸이라 lg(실최소 158px)로는 물리적으로 접힌다.
//   lg 는 전폭 4~5칸 페이지용으로 남는다.
//
// v3.0 (세션77 · 좌우 역할 분리 확정): 좌측=운영 / 우측=정산
// - 우측 패널을 「오늘 가입 회원」 → 「정산」으로 교체. 가입은 이미 좌측 최근 활동에 섞여 들어오므로
//   같은 정보를 두 칸에 두는 셈이었다. 우측은 B-4 이후 결제·매출이 들어올 자리로 비워 둔다.
// - 지금은 자리만 잡고 안내 한 줄. 빈 패널을 미리 세워 두는 이유는, B-4 때 레이아웃을 다시 흔들지 않기 위해서다.
//   (오늘 결제금액 / 이번 달 매출 / 성공·실패 / 환불 / 정기결제 예정 / 최근 결제 5건이 이 안으로 들어온다.)
// - KPI 8 → 6 축소: 전체회원 · 유료회원 · 오늘가입 · 오늘발행 · 미관측 · Quota초과.
//   전체발행/이번달발행은 누적값이라 매일 볼 값이 아니다 → 오늘 발행 카드의 보조줄로 내렸다.
//   오늘 관측등록도 관측 보드 소관이므로 미관측 카드 보조줄로 합쳤다. B-4 이후 오늘매출·당월매출 2칸이 붙는다.
// - 하단 공지 줄은 우측 패널 안내와 중복이라 제거.
//
// v2.9 (세션77 · KPI 8칸): 발행 축을 전체/이번달/오늘 3단으로 분해 + 오늘 관측등록 추가
// - 순서 = 회원(전체·유료·오늘) → 발행(전체·이번달·오늘) → 관측(오늘등록·미관측).
//   같은 축의 값이 붙어 있어야 '누적 대비 오늘'이 한눈에 비교된다.
// - 8칸이 되면서 칸당 폭이 좁아져 gap 10→8, 좌우 패딩 12→10 으로 줄였다. 글자 크기는 유지.
// - 「오늘 관측등록」은 API v1.0 의 today_observed(observed_date=KST 오늘, publish_id 유니크).
// - Quota 초과는 0이 아닐 때만 미관측 카드 보조줄에 뜬다 — 이상 신호를 상시 칸으로 두지 않는다.
//
// v2.8 (세션77 · KPI 6칸 실제 1줄): 공통 Stat 이 반폭에서 접히는 문제 해결
// - 원인: adminTheme.Stat 은 flex '1 1 kpiMin(120px)' + padding 18px 좌우. box-sizing 기본값에서
//   실제 최소폭은 120+36+2 = 158px 이다. 6칸이면 998px 이 필요해 좌측 절반(≈910px)을 넘겨 접혔다.
//   즉 kpiMin 은 '전폭 4~5칸' 기준값이라 반폭 6칸에는 맞지 않는다.
// - 조치: 이 화면 전용 KpiSm 을 둔다. 색·굵기·계층은 T 토큰 그대로 쓰되 좌우 패딩과 최소폭만 줄인다.
//   adminTheme 의 kpiMin 을 낮추면 members/usage 의 전폭 KPI 가 같이 좁아지므로 공통값은 건드리지 않는다.
//   (세션76 원칙 — 페이지에 hex 를 새로 쓰지 않는다. 여기서도 색은 전부 T 에서 가져온다.)
//
// v2.7 (세션77 · KPI 1줄 반폭): 3×2 → 좌측 절반에 6칸 1줄
// - 2줄로 접으니 KPI 블록이 아래 패널보다 높아져 좌우 높이가 다시 어긋났다. 한 줄이면 정렬이 맞는다.
// - 1920 기준 좌측 절반 ≈ 910px → 6칸 각 ≈ 140px (kpiMin 120 이상). 접히지 않는다.
//   폭이 좁아진 만큼 라벨은 짧게 간다 — 「관측 등록/미등록」은 두 줄로 접히므로 「미관측」+보조줄로 분리.
// - 우측 절반은 비워 둔다. B-4 이후 매출·결제 KPI 가 이 자리에 들어간다.
//
// v2.6 (세션77 · KPI 좌측 반폭): KPI 줄을 전폭 6칸 → 좌측 절반 3×2
// - 아래 패널 줄이 이미 좌/우 2단인데 KPI만 전폭이라 좌우 축이 어긋나 보였다.
//   KPI 를 좌측 절반에 맞추면 화면이 '좌측 = 요약 / 우측 = 명단'으로 한 번에 읽힌다.
// - 폭은 아래 패널과 동일 계산(calc(50% - kpiGap/2))이라 세로선이 정확히 맞는다.
// - KPI 6종: 전체회원 · 유료회원 · 오늘가입 · 이번달발행 · 오늘발행 · 관측(등록/미등록).
//   관측은 등록/미등록을 한 칸에 합쳤다 — 두 값은 항상 같이 읽히고, 따로 두면 칸만 늘어난다.
// - 우측 상단은 비워 둔다. B-4 이후 매출·결제 KPI 가 이 자리에 들어간다.
//
// v2.5 (세션77 · 2단 배치): 좌 최근 활동 / 우 오늘 가입 회원
// - 좌측을 절반으로 줄이면서 생긴 우측 공백을 '오늘 가입'으로 채운다.
//   오늘 가입 KPI 는 숫자만 알려줄 뿐 '누가' 들어왔는지를 못 알려준다. 신규 가입은 확인 대상이라
//   숫자를 본 다음 곧바로 명단을 보게 되는데, 그때마다 회원관리로 넘어가는 건 불필요한 왕복이다.
// - 오늘 기준은 API v0.9 의 day_start(KST 00:00). KPI 「오늘 가입」과 같은 경계를 쓴다 —
//   두 값이 다른 기준을 쓰면 '3명인데 목록은 2명' 같은 불일치가 생긴다.
// - 데이터는 recent_accounts(최근 5명)에서 걸러 쓴다. 추가 쿼리 없음.
//   따라서 하루 6명 이상 가입하면 목록은 5명까지만 — 그 경우 안내 줄로 명시한다.
// - 결제 패널은 B-4 이후 이 줄 아래로 들어간다.
//
// v2.4 (세션77 · 폭 조정): 최근 활동 패널 가로 50%
// - 5줄 로그가 화면 전폭을 쓰면서 제목과 메타(업종·지역) 사이가 1,400px 넘게 벌어졌다.
//   같은 줄의 두 값이 눈으로 이어지지 않으면 목록이 아니라 띠가 된다.
// - 조치: 패널 width 50%(최소 520px). 우측 절반은 비워 둔다 — B-4 이후 결제·매출 패널 자리.
// - 제목 말줄임은 그대로 동작(feedText 가 flex:1 + ellipsis).
//
// v2.3 (세션77 · 밀도 조정): 최근 활동 패널 높이 축소 (약 320px → 180px)
// - 5줄짜리 목록이 세로를 과하게 먹어, 아래 여백이 '남은 공간'이 아니라 '빈 공간'으로 보였다.
// - 조치: 헤더 11px→7px · 행 10px→6px · 행 폰트 13→12.5 · 시간/태그 폭 축소.
//   행 높이 약 40px → 32px. 정보는 그대로 두고 여백만 깎았다(줄 수 감소 없음).
// - 남은 하단 여백은 의도적으로 비워 둔다. B-4 이후 매출·결제 KPI 줄이 여기에 들어간다.
//   지금 무언가로 채우면 결제 KPI 자리가 없어져 다시 레이아웃을 흔들게 된다.
//
// v2.2 (세션77 · 역할 분리): 본문에서 메뉴 카드 제거
// - 상단 AdminNav 가 이미 이동 수단이다. 본문에 같은 6개를 카드로 다시 두면 이동 경로가 둘이 되고,
//   운영자는 '어느 쪽이 정본인가'를 매번 판단하게 된다. 중복은 선택지가 아니라 비용이다.
// - 확정: 상단 = 메뉴(이동) / 본문 = 현재 상태(요약). 본문에 라우팅 UI 를 두지 않는다.
// - 남은 링크는 최근 활동 패널의 「더보기」 1개뿐 — 그 목록의 원본 페이지를 가리키는 문맥 링크이므로 메뉴가 아니다.
//
// v2.1 (세션77 · 무스크롤 콘솔): 리포트 화면 → 관제 화면
// - v2.0 판정: KPI 10개 + 표 2개로 세로가 길어져 '리포트'가 됐다. 최근가입·최근발행 표는
//   회원관리/발행 페이지에 이미 있는 정보를 다시 그린 것이라 중복이었다.
// - 기준: 1920×1080 에서 스크롤 없이 한 화면. 운영자는 숫자만 보고, 이상하면 해당 메뉴로 들어간다.
// - 구성 3단: ① KPI 6개 1줄 ② 최근 활동 5건(가입·발행 통합) ③ 공지 1줄.
// - 최근 활동은 '표'가 아니라 '한 줄 로그'. 판단 재료가 아니라 "지금 돌고 있다"의 확인용이다.
//   그래서 컬럼을 늘리지 않고, 더 볼 것이 있으면 우측 진입점으로 넘긴다.
// - KPI 6개 선정 근거: 규모(전체) · 수익(유료) · 오늘 유입(가입) · 오늘 가동(발행) ·
//   수집 적체(미관측) · 이상(Quota 초과). 나머지(활성률·관측 세부·fossil·관련도)는 각 보드 소관.
// - 범위: 스키마 변경 0 · 추가 쿼리 0. /api/admin/dashboard v0.9 파생 필드만 소비.
// - 제외(근거 부족): 오류 로그(테이블 미확인) / 시스템 헬스(실제 헬스체크 없음) / 배포 버전.
// - 결제 KPI(매출·오늘결제·실패)는 B-4(PortOne) 이후. 빈 카드로 자리를 만들지 않는다.
//
// v2.0 (세션77): 운영 데이터 확장 — KPI 7 + 최근가입/최근발행 표. 세로 길이 문제로 v2.1 에서 축약.
// v1.0 (세션75 · 구조 통합): /admin 자체가 대시보드. 허브 카드 화면 폐기.
// v0.9 (콘솔화) / v0.8 (다크 정합) / v0.7 (숫자 중심) / v0.6~v0.3 (관측 카드 위임)
// 55차 v0.2: owner 가드 + Authorization Bearer 전파 · 48차 v0.1: 운영 콘솔 v1 (read-only)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import { fmtDateTime } from '../../lib/adminUI';
import { T, PageHead, Stat, StatRow, ErrBox } from '../../lib/adminTheme';
import { kindLabel, kindColor, statusLabel, statusColor } from '../../lib/supportKinds';

export default function AdminHome() {
  const { authState, session, err: authErr, loading: authLoading } = useAdminGuard();

  const [data, setData] = useState(null);
  const [sup, setSup] = useState(null);        // { rows, summary } — 실패해도 대시보드는 뜬다
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState(null);

  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;

    let cancelled = false;
    setDataLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json();
        if (cancelled) return;

        if (r.status === 401) setFetchErr('인증이 만료되었습니다. 다시 로그인해 주세요.');
        else if (r.status === 403) setFetchErr('관리자 권한이 필요합니다.');
        else if (!j.ok) setFetchErr(j.error + (j.detail ? ` — ${j.detail}` : ''));
        else setData(j);
      } catch (e) {
        if (!cancelled) setFetchErr(e.message);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    // 접수는 별도 호출. 대시보드 API 에 합치지 않는 이유는 support-list 를 그대로 재사용하기 위해서다.
    //   여기서 실패해도 fetchErr 를 건드리지 않는다 — 부가 패널 때문에 전체 화면이 에러로 덮이면 안 된다.
    (async () => {
      try {
        const r = await fetch('/api/admin/support-list?kind=all&status=all&limit=10', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json();
        if (!cancelled && j.ok) setSup({ rows: j.rows || [], summary: j.summary || null });
      } catch { /* 무시 */ }
    })();

    return () => { cancelled = true; };
  }, [authState, session]);

  const err = authErr || fetchErr;
  const loading = authLoading || (authState === 'owner' && dataLoading);

  // 로딩·에러에도 네비 유지(세션76 §3-2).
  if (loading) return (
    <AdminLayout current="/admin" theme="dark">
      <PageHead title="운영 현황" version="v3.1" sub="불러오는 중…" />
    </AdminLayout>
  );
  if (err) return (
    <AdminLayout current="/admin" theme="dark">
      <PageHead title="운영 현황" version="v3.1" />
      <ErrBox>
        {authState === 'unauth' && '🔒 '}
        {authState === 'non-owner' && '⛔ '}
        에러: {err}
      </ErrBox>
    </AdminLayout>
  );
  if (!data) return null;

  const { summary, observed_at } = data;
  const total     = num(summary.total_accounts);
  const paid      = num(summary.paid_accounts);
  const overQuota = num(summary.over_quota_count);
  const unobs     = num(summary.unobserved_count);
  const todaySignups = num(summary.today_signups);
  const todayPosts   = num(summary.today_posts);
  const paidRate = total > 0 ? Math.round((paid / total) * 1000) / 10 : null;

  const feed = buildFeed(data.recent_accounts, data.recent_publishes, 5);

  // 오늘 접수 — support-list summary 에는 오늘 값이 없다. 로드된 10건에서 센다.
  //   10건이 모두 오늘이면 그 이상일 수 있으므로 '+' 를 붙여 잘림을 숨기지 않는다.
  const todaySup = countToday(sup?.rows);


  return (
    <AdminLayout current="/admin" theme="dark">
      <PageHead
        title="운영 현황"
        version="v3.1"
        sub={`Commercial Blog Platform · 최종 갱신 ${fmtDateTime(observed_at)} · read-only`}
      />

      {/* ① KPI — 좌측 절반 1줄 6칸. B-4 이후 오늘매출·당월매출 2칸이 우측으로 이어 붙는다. */}
      <div style={S.kpiHalf}>
        <StatRow size="sm">
          <Stat size="sm" label="전체 회원" value={fmt(total)} sub={`활성 ${fmt(summary.active_accounts)}`} />
          <Stat size="sm" label="유료 회원" value={fmt(paid)} tone={paid > 0 ? 'ok' : undefined}
            sub={paidRate == null ? '—' : `전환 ${paidRate}%`} />
          <Stat size="sm" label="오늘 가입" value={fmt(todaySignups)} tone={todaySignups > 0 ? 'ok' : undefined} sub="KST" />
          <Stat size="sm" label="오늘 발행" value={fmt(todayPosts)} tone={todayPosts > 0 ? 'ok' : undefined}
            sub={`당월 ${fmt(summary.monthly_posts)} · 누적 ${fmt(summary.total_posts)}`} />
          <Stat size="sm" label="미관측" value={fmt(unobs)} tone={unobs > 0 ? 'warn' : undefined}
            sub={summary.max_unobserved_days == null ? '—' : `최장 ${fmt(summary.max_unobserved_days)}일`} />
          <Stat size="sm" label="Quota 초과" value={fmt(overQuota)} tone={overQuota > 0 ? 'danger' : undefined}
            sub={overQuota > 0 ? '확인 필요' : '정상'} />
        </StatRow>
      </div>

      {/* ② 좌 최근 활동 / 우 최근 접수 — 한 줄 2단. 세로를 늘리지 않고 가로를 쓴다. */}
      <div style={S.row2}>
        <div style={S.panel}>
          <div style={S.panelHead}>
            <span style={S.panelTitle}>최근 활동</span>
            <span style={S.panelNote}>최근 5건</span>
            <span style={{ flex: 1 }} />
            <Link href="/admin/publish" style={S.moreLink}>더보기 →</Link>
          </div>
          {feed.length === 0 && <div style={S.empty}>활동 이력이 없습니다.</div>}
          {feed.map((it, i) => (
            <div key={it.key} style={i === feed.length - 1 ? S.feedRowLast : S.feedRow}>
              <span style={S.feedTime}>{shortTime(it.at)}</span>
              <span style={{ ...S.feedTag, color: it.tagColor }}>{it.tag}</span>
              <span style={S.feedText} title={it.text}>{it.text}</span>
              {it.meta && <span style={S.feedMeta}>{it.meta}</span>}
            </div>
          ))}
        </div>

        {/* 최근 접수 — 운영자가 로그인 직후 가장 먼저 볼 값. support-list API 재사용(limit=10, 5건 노출).
            정산 패널은 B-4(PortOne) 이후 이 줄 아래 또는 3단으로 복귀한다.
            복귀 시 들어갈 값: 오늘 결제금액 · 이번 달 매출 · 성공/실패 · 환불 · 정기결제 예정 · 최근 결제 5건. */}
        <div style={S.panel}>
          <div style={S.panelHead}>
            <span style={S.panelTitle}>최근 접수</span>
            {sup?.summary && (
              <span style={S.panelNote}>
                <span style={{ color: T.textSoft, fontWeight: 700 }}>
                  오늘 {todaySup.n}{todaySup.capped ? '건+' : '건'}
                </span>
                {' · '}
                <span style={{ color: statusColor('pending'), fontWeight: 700 }}>
                  {statusLabel('pending')} {num(sup.summary.pending)}건
                </span>
                {' · '}
                {statusLabel('answered')} {num(sup.summary.answered)}건
              </span>
            )}
            <span style={{ flex: 1 }} />
            <Link href="/admin/support" style={S.moreLink}>더보기 →</Link>
          </div>
          {!sup ? (
            <div style={S.empty}>불러오는 중…</div>
          ) : sup.rows.length === 0 ? (
            <div style={S.empty}>접수된 문의가 없습니다.</div>
          ) : (
            sup.rows.slice(0, 5).map((r, i, arr) => (
              <Link key={r.id} href="/admin/support"
                style={i === arr.length - 1 ? S.supRowLast : S.supRow}>
                <span style={S.supTime}>{shortTime(r.created_at)}</span>
                <span style={{ ...S.supKind, color: kindColor(r.kind), borderColor: kindColor(r.kind) }}>
                  {kindLabel(r.kind)}
                </span>
                <span style={S.feedText} title={r.content}>{r.title}</span>
                <span style={{ ...S.supStatus, color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
              </Link>
            ))
          )}
        </div>
      </div>

    </AdminLayout>
  );
}

/* ── 데이터 가공 ─────────────────────────────────────── */
// 가입·발행을 시간순 단일 피드로 합친다. 두 리스트를 나란히 두면 다시 표가 되고 세로가 길어진다.
function buildFeed(accounts, publishes, limit) {
  const out = [];
  for (const a of accounts || []) {
    if (!a.created_at) continue;
    out.push({
      key: `a${a.id}`,
      at: a.created_at,
      tag: '가입',
      tagColor: T.info,
      text: a.display_name || a.email || `계정 #${a.id}`,
      meta: a.plan_label || null,
    });
  }
  for (const p of publishes || []) {
    if (!p.published_at) continue;
    out.push({
      key: `p${p.publish_id}`,
      at: p.published_at,
      tag: '발행',
      tagColor: T.ok,
      text: p.title || `발행 #${p.publish_id}`,
      meta: [p.industry, p.region].filter(Boolean).join(' · ') || null,
    });
  }
  return out
    .sort((x, y) => String(y.at).localeCompare(String(x.at)))
    .slice(0, limit);
}

/* ── 표시 유틸 ───────────────────────────────────────── */
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmt(v) { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString() : '—'; }

// 오늘(로컬 기준) 접수 건수. rows 는 최신순 10건이라, 전부 오늘이면 잘렸을 수 있다.
function countToday(rows) {
  const list = rows || [];
  const now = new Date();
  const n = list.filter((r) => {
    const d = new Date(r.created_at);
    return !Number.isNaN(d.getTime())
      && d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
  }).length;
  return { n, capped: list.length > 0 && n === list.length && list.length >= 10 };
}

// 오늘이면 HH:MM, 아니면 MM/DD. 피드는 '언제쯤'만 알면 되므로 폭을 최소화한다.
function shortTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const p = (n) => String(n).padStart(2, '0');
  return sameDay ? `${p(d.getHours())}:${p(d.getMinutes())}` : `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

const S = {
  // KPI 좌측 반폭 — 아래 2단 패널과 동일 계산이라 세로선이 맞는다.
  kpiHalf: { width: `calc(50% - ${T.kpiGap / 2}px)`, minWidth: 560 },

  // 2단 — 균등분배. 좁은 화면에서는 접혀 세로로 쌓인다.
  row2: { display: 'flex', gap: T.kpiGap, alignItems: 'flex-start', flexWrap: 'wrap' },
  panel: {
    flex: '1 1 460px', minWidth: 0,
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radiusPanel, overflow: 'hidden',
  },
  panelHead: {
    display: 'flex', alignItems: 'baseline', gap: 10,
    padding: '7px 14px', background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`,
  },
  panelTitle: { fontSize: 12.5, fontWeight: 700, color: T.text },
  panelNote: { fontSize: 11, color: T.textFaint },
  moreLink: { fontSize: 11.5, color: T.textMuted, textDecoration: 'none' },

  feedRow: {
    display: 'flex', alignItems: 'baseline', gap: 10,
    padding: '6px 14px', borderBottom: `1px solid ${T.borderRow}`,
  },
  // 마지막 행은 아래 구분선 제거 — 패널 테두리와 겹쳐 선이 두 겹으로 보인다.
  feedRowLast: {
    display: 'flex', alignItems: 'baseline', gap: 10,
    padding: '6px 14px',
  },
  feedTime: { fontFamily: T.mono, fontSize: 11.5, color: T.textFaint, flex: '0 0 42px' },
  feedTag: { fontSize: 10.5, fontWeight: 700, flex: '0 0 28px' },
  feedText: {
    fontSize: 12.5, color: T.textSoft, flex: 1, minWidth: 0,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  feedMeta: { fontSize: 11, color: T.textFaint, flex: '0 0 auto' },

  // 접수 행은 Link 라 텍스트 장식·색 상속을 명시로 끊는다.
  supRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 14px', borderBottom: `1px solid ${T.borderRow}`,
    textDecoration: 'none', color: 'inherit',
  },
  supRowLast: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 14px', textDecoration: 'none', color: 'inherit',
  },
  // 접수 시간은 활동 피드보다 한 단계 밝게 — 문의는 '언제 들어왔는가'가 우선 판단 재료다.
  supTime: { fontFamily: T.mono, fontSize: 11.5, color: T.textMuted, flex: '0 0 42px' },
  supKind: {
    fontSize: 10.5, fontWeight: 700, border: '1px solid', borderRadius: 4,
    padding: '1px 6px', flex: '0 0 auto', whiteSpace: 'nowrap',
  },
  supStatus: { fontSize: 11, fontWeight: 700, flex: '0 0 auto', whiteSpace: 'nowrap' },

  empty: { padding: '20px 14px', textAlign: 'center', color: T.textFaint, fontSize: 12 },
  emptySub: { marginTop: 6, fontSize: 11, color: T.textFaint, opacity: 0.7, lineHeight: 1.6 },
};
