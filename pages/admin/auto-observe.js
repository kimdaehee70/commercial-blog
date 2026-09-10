// pages/admin/auto-observe.js
// OBSERVATION-AUTO-DASHBOARD-01 v0.1 — 자동관측 전용 화면 (신규)
//
// - 기존 '관측'(/admin/observations) = 수동관측. 이 페이지와 무접촉.
// - 자동 SoT = survival_log. 수동값(publish_metrics)과 숫자 병합하지 않는다.
// - 검색어는 core_keyword 만. NULL 은 '—' 로 명시한다(full_keyword 대체 금지).
// - 그래프·알림·엔진별 성과분석 없음. V1 = "자동관측 결과를 한눈에 본다"까지.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import { fmtDate, fmtDateTime } from '../../lib/adminUI';

const C = {
  bg: '#0f1216', card: '#161b22', line: '#232a33',
  fg: '#e6edf3', dim: '#8b949e',
  up: '#3fb950', down: '#f85149', flat: '#8b949e', mark: '#58a6ff',
};

const S = {
  wrap: { padding: '18px 20px 60px' },
  h1: { fontSize: 20, fontWeight: 700, color: C.fg, margin: '0 0 4px' },
  sub: { fontSize: 12, color: C.dim, margin: '0 0 16px' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 10, marginBottom: 16 },
  card: { background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '12px 14px' },
  cardLabel: { fontSize: 11, color: C.dim, marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: 700, color: C.fg, lineHeight: 1.1 },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 },
  input: { background: '#0d1117', color: C.fg, border: `1px solid ${C.line}`, borderRadius: 6, padding: '6px 8px', fontSize: 12 },
  btn: { background: '#21262d', color: C.fg, border: `1px solid ${C.line}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', color: C.dim, fontWeight: 600, padding: '8px 10px', borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap', cursor: 'pointer' },
  td: { padding: '9px 10px', borderBottom: `1px solid ${C.line}`, color: C.fg, whiteSpace: 'nowrap' },
  rowSel: { background: '#1c2430' },
  panel: { marginTop: 18, background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '14px 16px' },
  tlRow: { display: 'grid', gridTemplateColumns: '150px 70px 70px 110px 1fr', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.line}`, fontSize: 12, color: C.fg },
  dimS: { color: C.dim },
};

const DELTA_LABEL = {
  first: { t: '최초', c: C.dim },
  flat: { t: '보합', c: C.flat },
  none_hold: { t: '미노출 유지', c: C.dim },
  entered: { t: '신규노출', c: C.up },
  dropped_out: { t: '노출이탈', c: C.down },
};

function Delta({ d }) {
  if (!d) return <span style={S.dimS}>—</span>;
  if (d.kind === 'up') return <span style={{ color: C.up }}>▲{d.value}</span>;
  if (d.kind === 'down') return <span style={{ color: C.down }}>▼{Math.abs(d.value)}</span>;
  const m = DELTA_LABEL[d.kind] || DELTA_LABEL.first;
  return <span style={{ color: m.c }}>{m.t}</span>;
}

function rk(v) {
  return v == null ? <span style={S.dimS}>—</span> : v;
}

async function authFetch(url) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || '';
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
  return j;
}

export default function AutoObservePage() {
  // useAdminGuard 반환 계약: { authState, session, err, loading }
  //   authState: 'checking' | 'unauth' | 'non-owner' | 'owner'  (admin 이상은 'owner' 로 매핑됨)
  const { authState, err: authErr, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';

  // include_legacy: cutoff(OBSERVER_AUTO_START) 이전 발행글 포함 여부. 기본 OFF(본선 제외 원칙 유지).
  const [f, setF] = useState({ from: '', to: '', industry: '', status: '', q: '', legacy: false });
  const [sort, setSort] = useState({ key: 'last_observed_at', dir: 'desc' });
  const [page, setPage] = useState(1);
  const size = 50;

  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [sel, setSel] = useState(null);
  const [tl, setTl] = useState(null);
  const [tlLoading, setTlLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const qs = new URLSearchParams({ page: String(page), size: String(size), sort: sort.key, dir: sort.dir });
      if (f.from) qs.set('from', f.from);
      if (f.to) qs.set('to', f.to);
      if (f.industry) qs.set('industry', f.industry);
      if (f.status) qs.set('status', f.status);
      if (f.q) qs.set('q', f.q);
      if (f.legacy) qs.set('include_legacy', '1');
      const j = await authFetch(`/api/admin/auto-observe?${qs.toString()}`);
      setSummary(j.summary); setRows(j.rows || []); setTotal(j.page?.total ?? 0);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setLoading(false); }
  }, [f, sort, page]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const openTimeline = useCallback(async (publishId) => {
    setSel(publishId); setTl(null); setTlLoading(true);
    try {
      const j = await authFetch(`/api/admin/auto-observe-timeline?publish_id=${publishId}`);
      setTl(j);
    } catch (e) { setErr(String(e.message || e)); }
    finally { setTlLoading(false); }
  }, []);

  const th = (key, label) => (
    <th style={S.th} onClick={() => { setPage(1); setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })); }}>
      {label}{sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
    </th>
  );

  if (authLoading) {
    return (
      <AdminLayout current="/admin/auto-observe" theme="dark" fluid>
        <div style={S.wrap}><p style={S.sub}>권한 확인 중…</p></div>
      </AdminLayout>
    );
  }
  if (!authed) {
    return (
      <AdminLayout current="/admin/auto-observe" theme="dark" fluid>
        <div style={S.wrap}>
          <h1 style={S.h1}>자동관측</h1>
          <p style={{ ...S.sub, color: C.down }}>{authErr || '관리자 권한이 필요합니다.'}</p>
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    ['오늘 관측', summary ? summary.observed_today : '—'],
    ['TOP10', summary ? summary.top10 : '—'],
    ['TOP30', summary ? summary.top30 : '—'],
    ['미노출', summary ? summary.not_exposed : '—'],
    ['TOP10 진입률', summary && summary.top10_rate != null ? `${summary.top10_rate}%` : '—'],
  ];

  return (
    <AdminLayout current="/admin/auto-observe" theme="dark" fluid>
      <div style={S.wrap}>
        <h1 style={S.h1}>자동관측</h1>
        <p style={S.sub}>
          자동 스케줄러(survival_log) 전용. 수동관측(publish_metrics)과 숫자를 합치지 않습니다.
          {summary?.kst_date ? ` · 요약 기준일 ${summary.kst_date} (KST)` : ''}
        </p>

        <div style={S.cards}>
          {cards.map(([l, v]) => (
            <div key={l} style={S.card}>
              <div style={S.cardLabel}>{l}</div>
              <div style={S.cardValue}>{v}</div>
            </div>
          ))}
        </div>

        <div style={S.filters}>
          <input style={S.input} type="date" value={f.from} onChange={(e) => { setPage(1); setF({ ...f, from: e.target.value }); }} />
          <span style={S.dimS}>~</span>
          <input style={S.input} type="date" value={f.to} onChange={(e) => { setPage(1); setF({ ...f, to: e.target.value }); }} />
          <input style={S.input} placeholder="업종 (industry)" value={f.industry} onChange={(e) => { setPage(1); setF({ ...f, industry: e.target.value }); }} />
          <select style={S.input} value={f.status} onChange={(e) => { setPage(1); setF({ ...f, status: e.target.value }); }}>
            <option value="">노출상태 전체</option>
            <option value="top10">TOP10</option>
            <option value="top30">TOP30 (1~30)</option>
            <option value="none">미노출</option>
          </select>
          <input style={S.input} placeholder="검색어 (core_keyword)" value={f.q} onChange={(e) => { setPage(1); setF({ ...f, q: e.target.value }); }} />
          <label style={{ ...S.dimS, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={f.legacy}
              onChange={(e) => { setPage(1); setF({ ...f, legacy: e.target.checked }); }}
            />
            레거시 포함
          </label>
          <button style={S.btn} onClick={load}>조회</button>
          <span style={S.dimS}>{loading ? '불러오는 중…' : `${total}건`}</span>
        </div>

        {err ? <div style={{ ...S.card, borderColor: C.down, color: C.down, marginBottom: 12 }}>{err}</div> : null}

        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>검색어</th>
              <th style={S.th}>업종</th>
              {th('first_observed_at', '최초')}
              {th('current_rank', '현재')}
              {th('best_rank', '최고')}
              <th style={S.th}>변화</th>
              <th style={S.th}>생존</th>
              {th('last_observed_at', '마지막 관측')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.publish_id}
                style={sel === r.publish_id ? S.rowSel : undefined}
                onClick={() => openTimeline(r.publish_id)}
              >
                <td style={{ ...S.td, cursor: 'pointer' }}>
                  {r.core_keyword || <span style={S.dimS}>검색어 없음</span>}
                </td>
                <td style={S.td}>{r.industry || <span style={S.dimS}>—</span>}</td>
                <td style={S.td}>{rk(r.first_rank)}</td>
                <td style={S.td}>{rk(r.current_rank)}</td>
                <td style={S.td}>{rk(r.best_rank)}</td>
                <td style={S.td}><Delta d={r.delta} /></td>
                <td style={S.td}>{r.survival_days == null ? <span style={S.dimS}>—</span> : `${r.survival_days}일`}</td>
                <td style={S.td}>{fmtDate ? fmtDate(r.last_observed_at) : String(r.last_observed_at || '')}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr><td style={{ ...S.td, color: C.dim }} colSpan={8}>표시할 자동관측 결과가 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>

        {total > size ? (
          <div style={{ ...S.filters, marginTop: 12 }}>
            <button style={S.btn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>이전</button>
            <span style={S.dimS}>{page} / {Math.max(1, Math.ceil(total / size))}</span>
            <button style={S.btn} disabled={page >= Math.ceil(total / size)} onClick={() => setPage((p) => p + 1)}>다음</button>
          </div>
        ) : null}

        {sel ? (
          <div style={S.panel}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: C.fg }}>
              자동관측 Timeline · #{sel}
            </div>
            <div style={{ ...S.sub, marginBottom: 12 }}>
              {tl?.post?.core_keyword || '검색어 없음'} · {tl?.post?.industry || '—'} ·
              {' '}발행 {tl?.post?.published_at ? (fmtDateTime ? fmtDateTime(tl.post.published_at) : tl.post.published_at) : '—'}
              {tl?.meta ? ` · 관측 ${tl.meta.count}행 (원본 그대로)` : ''}
            </div>
            {tlLoading ? <div style={S.dimS}>불러오는 중…</div> : null}
            {tl ? (
              <div>
                <div style={{ ...S.tlRow, color: C.dim, fontWeight: 600 }}>
                  <div>관측시각</div><div>순위</div><div>생존</div><div>변화</div><div>note / basis</div>
                </div>
                {tl.items.map((it) => (
                  <div key={it.id} style={S.tlRow}>
                    <div>{fmtDateTime ? fmtDateTime(it.observed_at) : it.observed_at}</div>
                    <div>{rk(it.rel_rank)}</div>
                    <div style={{ color: it.is_alive ? C.up : C.dim }}>{it.is_alive ? 'alive' : '—'}</div>
                    <div><Delta d={it.delta} /></div>
                    <div style={S.dimS}>{[it.note, it.rank_basis].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
                {tl.items.length === 0 ? <div style={S.dimS}>관측 이력이 없습니다.</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
