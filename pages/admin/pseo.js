// pages/admin/pseo.js
// ─────────────────────────────────────────────────────────────
// [PSEO-ADMIN-DASHBOARD-01] pSEO 관제 화면 v0.1
//
// 관제탑이지 조종장치가 아니다. 상태와 성과만 보여준다.
//   ★ 강제 공개/차단 버튼 없음. 새로고침 외 액션 0.
//   ★ 데이터는 /api/admin/pseo-list 단일 호출. 화면에서 판정하지 않는다.
//
// 색은 adminNav.js 의 콘솔 팔레트를 그대로 쓴다(다크 표면 기준).
//   adminTheme 의 T/Stat 토큰이 확정되면 그쪽으로 치환한다.
//
// 인증 패턴: stores.js / index.js 동일 — useAdminGuard 판정 + Bearer 토큰.
//
// [PSEO-ADMIN-USABILITY-01] v0.2 — 운영 사용성. 목적은 "5초 안에 원하는 업체를 찾는 것".
//   ★ 서버 무접촉. pseo-list.js 는 한 글자도 바꾸지 않는다.
//     필터·검색·정렬은 전부 이미 받은 rows 배열 위에서만 계산한다.
//     서버는 계속 store id 오름차순으로 반환하고(mapWithLimit 순서 보존 규약),
//     재정렬은 화면이 소유한다.
//   ★ KPI 클릭 필터는 3개만 — 공개 / 차단 / 차단+실적.
//     Intent 총계·CTA 7일은 '합계' 카드다. 3을 눌렀는데 업체 2개가 나오면
//     카드 숫자와 결과 건수가 어긋나 읽는 사람이 혼란스럽다. 클릭 비활성.
//   ★ 페이지네이션·엑셀·고급필터·차트 없음. 의도적으로 넣지 않는다.
//   ★ 레이아웃은 PseoAdminLayout 이 소유한다(상단 활성 고정 + 좌측 레일).
//     이 페이지는 AdminLayout 을 직접 부르지 않는다 — current 를 두 곳에서 관리하지 않기 위해서다.
//     H1 'pSEO 관제'는 유지한다. 좌측 '관제'는 위치 탐색이고 H1 은 현재 화면 제목이라 역할이 다르다.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { PseoAdminLayout } from '../../lib/pseoLayout';

export default function AdminPseo() {
  const router = useRouter();
  const { authState } = useAdminGuard();
  const authed = authState === 'owner';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  // [PSEO-ADMIN-USABILITY-01] 화면 상태 3종. 서버로 전달되지 않는다.
  const [filter, setFilter] = useState('all');   // all | public | blocked | blocked_cta
  const [q, setQ] = useState('');                // 업체명 부분일치 | store id 정확일치
  const [sortKey, setSortKey] = useState(null);  // null = 기본(공개 우선 → id 오름차순)
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') router.replace('/login');
  }, [authState, router]);

  const fetchData = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) { setErr('no_token'); setLoading(false); return; }

      const r = await fetch('/api/admin/pseo-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      setData(j);
      if (!r.ok) setErr(j?.error || `http_${r.status}`);
      else if (j.ok === false) setErr(j?.diag?.error_message || j?.diag?.exception || 'query_failed');
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) fetchData(); }, [authed]);

  if (authState === 'unauth' || authState === 'non-owner') {
    return <div style={{ padding: 24, color: C.dim }}>로그인 페이지로 이동 중…</div>;
  }
  if (!authed) {
    return <div style={{ padding: 24, color: C.dim }}>인증 확인 중…</div>;
  }

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const kpi = data?.kpi || null;
  const diag = data?.diag || {};
  const win = diag.cta_window_days ?? 7;

  // ── [PSEO-ADMIN-USABILITY-01] 필터 → 검색 → 정렬. 전부 클라이언트. ──
  const term = q.trim();
  const viewRows = rows
    .filter((r) => {
      if (filter === 'public') return r.is_public;
      if (filter === 'blocked') return !r.is_public;
      if (filter === 'blocked_cta') return !r.is_public && r.cta.total > 0;
      return true;
    })
    .filter((r) => {
      if (!term) return true;
      // 업체명은 부분일치, store id 는 정확일치. 둘 중 하나만 맞아도 통과.
      if (String(r.store_id) === term) return true;
      return String(r.store_name || '').toLowerCase().includes(term.toLowerCase());
    })
    .sort((a, b) => {
      if (sortKey) {
        const av = SORT_ACCESSOR[sortKey](a);
        const bv = SORT_ACCESSOR[sortKey](b);
        if (av !== bv) return sortDir === 'desc' ? bv - av : av - bv;
        return a.store_id - b.store_id; // 동값 tiebreak 고정
      }
      // 기본 정렬 — 공개 업체를 위로. 차단 17개 속에서 공개 1개를 눈으로 찾지 않게 한다.
      if (a.is_public !== b.is_public) return a.is_public ? -1 : 1;
      return a.store_id - b.store_id;
    });

  // 같은 카드를 다시 누르면 전체로 복귀. 필터 해제 경로를 항상 남긴다.
  const toggleFilter = (key) => setFilter((v) => (v === key ? 'all' : key));

  // desc → asc → 기본 복귀. 3번째 클릭이 탈출구다.
  const toggleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortDir('asc'); return; }
    setSortKey(null); setSortDir('desc');
  };
  const sortMark = (key) => (sortKey !== key ? '' : sortDir === 'desc' ? ' ▾' : ' ▴');

  return (
    <PseoAdminLayout current="/admin/pseo">
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>pSEO 관제</h1>
          <div style={S.sub}>
            read-only · 공개 자격은 결제 판정(resolveBillingPeriod)을 그대로 따른다 ·
            Intent 하한 cnt≥{diag.min_posts ?? 2}
          </div>
        </div>
        <button onClick={fetchData} disabled={loading} style={loading ? S.btnBusy : S.btn}>
          {loading ? '조회 중…' : '새로고침'}
        </button>
      </div>

      {err ? <div style={S.err}>⚠ {err}</div> : null}

      {kpi ? (
        <div style={S.kpiRow}>
          <Kpi
            label="공개 중" value={kpi.public_count} tone="ok"
            onClick={() => toggleFilter('public')} active={filter === 'public'}
          />
          <Kpi
            label="차단" value={kpi.blocked_count}
            tone={kpi.blocked_count ? 'warn' : 'plain'}
            onClick={() => toggleFilter('blocked')} active={filter === 'blocked'}
          />
          {/* 합계 카드 2종 — 클릭 비활성. 카드 숫자와 필터 결과 건수가 다르다. */}
          <Kpi label="Intent 총계" value={kpi.intent_total} />
          <Kpi label={`CTA ${win}일`} value={kpi.cta_window} />
          <Kpi
            label="차단 + 실적 보유"
            value={kpi.blocked_with_cta}
            tone={kpi.blocked_with_cta ? 'warn' : 'plain'}
            note="공개는 막혔는데 CTA가 발생한 업체"
            onClick={() => toggleFilter('blocked_cta')} active={filter === 'blocked_cta'}
          />
        </div>
      ) : null}

      <div style={S.toolbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="업체명 또는 store ID"
          style={S.search}
        />
        {filter !== 'all' || term || sortKey ? (
          <button
            onClick={() => { setFilter('all'); setQ(''); setSortKey(null); setSortDir('desc'); }}
            style={S.reset}
          >
            초기화
          </button>
        ) : null}
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>store</th>
            <th style={S.th}>업체명</th>
            <th style={S.th}>업종</th>
            <th style={S.th}>공개</th>
            <th style={S.th}>차단사유</th>
            <th style={S.thNum}>Intent</th>
            <th style={S.thSort} onClick={() => toggleSort('post_count')}>글{sortMark('post_count')}</th>
            <th style={S.thSort} onClick={() => toggleSort('page_view')}>view{sortMark('page_view')}</th>
            <th style={S.thSort} onClick={() => toggleSort('phone_click')}>phone{sortMark('phone_click')}</th>
            <th style={S.thSort} onClick={() => toggleSort('post_click')}>post{sortMark('post_click')}</th>
          </tr>
        </thead>
        <tbody>
          {viewRows.length === 0 ? (
            <tr>
              <td colSpan={10} style={S.empty}>
                {loading ? '조회 중…' : rows.length ? '조건에 맞는 업체 없음' : 'no rows'}
              </td>
            </tr>
          ) : null}
          {viewRows.map((r) => (
            <tr key={r.store_id}>
              <td style={S.td}>{r.store_id}</td>
              <td style={S.td}>{r.store_name}</td>
              <td style={S.tdDim}>{r.industry}</td>
              <td style={S.td}>
                <span style={r.is_public ? S.pillOk : S.pillOff}>
                  {r.is_public ? '공개' : '차단'}
                </span>
              </td>
              <td style={S.tdDim}>{r.reason_label}</td>
              <td style={S.tdNum}>{r.intent_count}</td>
              <td style={S.tdNum}>{r.post_count}</td>
              <td style={S.tdNum}>{r.cta.page_view || ''}</td>
              <td style={S.tdNum}>{r.cta.phone_click || ''}</td>
              <td style={S.tdNum}>{r.cta.post_click || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.foot}>
        {rows.length ? `표시 ${viewRows.length} / 전체 ${rows.length} · ` : ''}
        {diag.stores != null ? `이벤트 ${diag.events}건` : ''}
        {typeof diag.ms === 'number' ? ` · ${diag.ms}ms` : ''}
        {` · CTA 집계는 최근 ${win}일 기준`}
      </div>
    </PseoAdminLayout>
  );
}

// onClick 이 없으면 지금까지와 동일한 표시 전용 카드다(합계 카드 2종).
function Kpi({ label, value, tone = 'plain', note, onClick, active }) {
  const color = tone === 'ok' ? C.ok : tone === 'warn' ? C.warn : C.text;
  const base = onClick ? (active ? S.kpiActive : S.kpiClickable) : S.kpi;
  return (
    <div
      style={base}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={onClick ? (active ? '다시 누르면 전체' : '클릭하면 이 항목만') : undefined}
    >
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color }}>{value}</div>
      {note ? <div style={S.kpiNote}>{note}</div> : null}
    </div>
  );
}

// 정렬 대상 4열. 여기 없는 열은 정렬하지 않는다(Intent 는 합계 축과 층위가 달라 제외).
const SORT_ACCESSOR = {
  post_count: (r) => r.post_count || 0,
  page_view: (r) => r.cta.page_view || 0,
  phone_click: (r) => r.cta.phone_click || 0,
  post_click: (r) => r.cta.post_click || 0,
};

// adminNav.js 의 콘솔 팔레트. 페이지에서 새 hex 를 만들지 않는다.
const C = {
  surface: '#171a21',
  border: '#2a2f3a',
  line: '#232730',
  text: '#f2f4f7',
  body: '#c8ccd2',
  dim: '#9aa1ab',
  faint: '#6a6f78',
  accent: '#3b82f6',
  ok: '#4ade80',
  warn: '#fbbf24',
};

const S = {
  head: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, marginBottom: 18,
  },
  h1: { fontSize: 19, fontWeight: 700, color: C.text, margin: 0 },
  sub: { fontSize: 12, color: C.faint, marginTop: 5, lineHeight: 1.5 },
  btn: {
    fontSize: 12.5, color: C.body, background: '#141821',
    border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
    flex: '0 0 auto',
  },
  btnBusy: {
    fontSize: 12.5, color: C.faint, background: '#141821',
    border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '7px 14px', cursor: 'wait', fontFamily: 'inherit',
    flex: '0 0 auto',
  },
  err: {
    fontSize: 12.5, color: C.warn, background: '#1c1710',
    border: '1px solid #3a2f1a', borderRadius: 4,
    padding: '9px 12px', marginBottom: 16,
  },

  kpiRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  kpi: {
    flex: '1 1 140px', minWidth: 120, boxSizing: 'border-box',
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 4,
    padding: '12px 14px',
  },
  kpiClickable: {
    flex: '1 1 140px', minWidth: 120, boxSizing: 'border-box',
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 4,
    padding: '12px 14px', cursor: 'pointer',
  },
  kpiActive: {
    flex: '1 1 140px', minWidth: 120, boxSizing: 'border-box',
    background: '#111a2b', border: `1px solid ${C.accent}`, borderRadius: 4,
    padding: '12px 14px', cursor: 'pointer',
  },
  kpiLabel: { fontSize: 11, color: C.faint, fontWeight: 600, letterSpacing: '0.04em' },
  kpiValue: { fontSize: 24, fontWeight: 700, marginTop: 5, lineHeight: 1.1 },
  kpiNote: { fontSize: 10.5, color: C.faint, marginTop: 5, lineHeight: 1.4 },

  toolbar: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  search: {
    fontSize: 12.5, color: C.text, background: '#141821',
    border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '7px 11px', fontFamily: 'inherit',
    width: 240, boxSizing: 'border-box', outline: 'none',
  },
  reset: {
    fontSize: 12, color: C.dim, background: 'transparent',
    border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '6px 11px', cursor: 'pointer', fontFamily: 'inherit',
  },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: {
    textAlign: 'left', fontWeight: 600, fontSize: 11, color: C.faint,
    letterSpacing: '0.04em', padding: '8px 10px',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
  },
  thNum: {
    textAlign: 'right', fontWeight: 600, fontSize: 11, color: C.faint,
    letterSpacing: '0.04em', padding: '8px 10px',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
  },
  thSort: {
    textAlign: 'right', fontWeight: 600, fontSize: 11, color: C.dim,
    letterSpacing: '0.04em', padding: '8px 10px',
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
    cursor: 'pointer', userSelect: 'none',
  },
  td: { padding: '9px 10px', color: C.body, borderBottom: `1px solid ${C.line}` },
  tdDim: { padding: '9px 10px', color: C.dim, borderBottom: `1px solid ${C.line}` },
  tdNum: {
    padding: '9px 10px', color: C.body, textAlign: 'right',
    borderBottom: `1px solid ${C.line}`, fontVariantNumeric: 'tabular-nums',
  },
  empty: { padding: '20px 10px', textAlign: 'center', color: C.faint },

  pillOk: {
    display: 'inline-block', fontSize: 11, fontWeight: 700, color: C.ok,
    border: '1px solid #1f4d33', background: '#0f2019',
    borderRadius: 3, padding: '2px 7px',
  },
  pillOff: {
    display: 'inline-block', fontSize: 11, fontWeight: 700, color: C.dim,
    border: `1px solid ${C.border}`, background: '#14171e',
    borderRadius: 3, padding: '2px 7px',
  },

  foot: { fontSize: 11, color: C.faint, marginTop: 14 },
};
