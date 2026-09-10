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
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';

export default function AdminPseo() {
  const router = useRouter();
  const { authState } = useAdminGuard();
  const authed = authState === 'owner';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

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

  return (
    <AdminLayout current="/admin/pseo" theme="dark">
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
          <Kpi label="공개 중" value={kpi.public_count} tone="ok" />
          <Kpi label="차단" value={kpi.blocked_count} tone={kpi.blocked_count ? 'warn' : 'plain'} />
          <Kpi label="Intent 총계" value={kpi.intent_total} />
          <Kpi label={`CTA ${win}일`} value={kpi.cta_window} />
          <Kpi
            label="차단 + 실적 보유"
            value={kpi.blocked_with_cta}
            tone={kpi.blocked_with_cta ? 'warn' : 'plain'}
            note="공개는 막혔는데 CTA가 발생한 업체"
          />
        </div>
      ) : null}

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>store</th>
            <th style={S.th}>업체명</th>
            <th style={S.th}>업종</th>
            <th style={S.th}>공개</th>
            <th style={S.th}>차단사유</th>
            <th style={S.thNum}>Intent</th>
            <th style={S.thNum}>글</th>
            <th style={S.thNum}>view</th>
            <th style={S.thNum}>phone</th>
            <th style={S.thNum}>post</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={S.empty}>
                {loading ? '조회 중…' : 'no rows'}
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
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
        {diag.stores != null ? `${diag.stores}개 업체 · 이벤트 ${diag.events}건` : ''}
        {typeof diag.ms === 'number' ? ` · ${diag.ms}ms` : ''}
        {` · CTA 집계는 최근 ${win}일 기준`}
      </div>
    </AdminLayout>
  );
}

function Kpi({ label, value, tone = 'plain', note }) {
  const color = tone === 'ok' ? C.ok : tone === 'warn' ? C.warn : C.text;
  return (
    <div style={S.kpi}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color }}>{value}</div>
      {note ? <div style={S.kpiNote}>{note}</div> : null}
    </div>
  );
}

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
  kpiLabel: { fontSize: 11, color: C.faint, fontWeight: 600, letterSpacing: '0.04em' },
  kpiValue: { fontSize: 24, fontWeight: 700, marginTop: 5, lineHeight: 1.1 },
  kpiNote: { fontSize: 10.5, color: C.faint, marginTop: 5, lineHeight: 1.4 },

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
