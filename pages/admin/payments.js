// pages/admin/payments.js
// 93차 v0.1 — 결제 이력 read-only 보드 (신규)
//
// 의도:
//   - /admin/billing       = 시뮬레이션 (예상 청구)
//   - /admin/subscriptions = 실제 구독 현황 (현재 상태)
//   - /admin/payments      = 실제 결제 ledger (이력) ← 본 파일
//
// 패턴: subscriptions.js v0.1 답습
//   - 다크 톤 (#0f1115)
//   - Bearer + owner 가드
//   - summary bar + 표 + 필터
//   - CSV export (90차 패턴: Blob + 동적 <a> + 1초 지연 revoke)
//
// 데이터: /api/admin/payments-list v0.1
// publish.js / me.js / billing.js / subscriptions.js: 무변경

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';

const STATUS_STYLE = {
  paid:     { bg: '#064e3b', fg: '#6ee7b7', label: '결제완료' },
  failed:   { bg: '#3b1d1d', fg: '#fca5a5', label: '실패' },
  refunded: { bg: '#1f242c', fg: '#9ca3af', label: '환불' },
  pending:  { bg: '#3b2f1d', fg: '#fbbf24', label: '대기' },
};

const KIND_STYLE = {
  initial:   { bg: '#1e293b', fg: '#93c5fd', label: '최초' },
  recurring: { bg: '#1e2e1e', fg: '#86efac', label: '정기' },
  retry:     { bg: '#3b2f1d', fg: '#fbbf24', label: '재시도' },
};

function statusBadge(st) {
  return STATUS_STYLE[st] || { bg: '#1f242c', fg: '#9ca3af', label: st || '—' };
}

function kindBadge(k) {
  return KIND_STYLE[k] || { bg: '#1f242c', fg: '#9ca3af', label: k || '—' };
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function fmtKrw(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('ko-KR');
}

// CSV escape (90차 accounts CSV 패턴)
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default function AdminPayments() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKind, setFilterKind] = useState('all');

  // owner 가드 (B방식: unauth/non-owner → 기존처럼 /login)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState, router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw new Error('SESSION_ERROR');
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('로그인이 필요합니다');

      const r = await fetch('/api/admin/payments-list', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (r.status === 401) throw new Error('인증 만료 — 다시 로그인하세요');
      if (r.status === 403) throw new Error('owner 권한 필요');

      const d = await r.json();
      if (d.ok === false) throw new Error(d.diag?.error_message || d.diag?.exception || 'FETCH_FAILED');
      setData(d);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  useEffect(() => { if (authed) load(); /* eslint-disable-next-line */ }, [authed]);

  // 필터 적용
  const rows = (data?.rows || []).filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterKind !== 'all' && r.kind !== filterKind) return false;
    return true;
  });

  const sm = data?.summary || {};

  // CSV export — 현재 필터된 rows
  const exportCSV = () => {
    if (!rows.length) {
      alert('내보낼 데이터가 없습니다');
      return;
    }
    const header = [
      'id', 'created_at', 'paid_at', 'account_id', 'account_email',
      'subscription_id', 'plan_id', 'plan_label', 'kind', 'status',
      'amount', 'overage_amount', 'overage_quantity',
      'pg_tx_id', 'failed_reason',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([
        csvCell(r.id),
        csvCell(r.created_at),
        csvCell(r.paid_at),
        csvCell(r.account_id),
        csvCell(r.account_email),
        csvCell(r.subscription_id),
        csvCell(r.plan_id),
        csvCell(r.plan_label),
        csvCell(r.kind),
        csvCell(r.status),
        csvCell(r.amount),
        csvCell(r.overage_amount),
        csvCell(r.overage_quantity),
        csvCell(r.pg_tx_id),
        csvCell(r.failed_reason),
      ].join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `payments_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>
          💳 결제 이력 <span style={S.versionTag}>v0.1 · read-only</span>
        </h1>
        <div style={S.meta}>
          <span style={S.metaLabel}>상태:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={S.select}>
            <option value="all">전체</option>
            <option value="paid">결제완료</option>
            <option value="failed">실패</option>
            <option value="refunded">환불</option>
            <option value="pending">대기</option>
          </select>

          <span style={S.metaLabel}>종류:</span>
          <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} style={S.select}>
            <option value="all">전체</option>
            <option value="initial">최초</option>
            <option value="recurring">정기</option>
            <option value="retry">재시도</option>
          </select>

          <button onClick={load} style={S.refreshBtn}>↻ 새로고침</button>
          <button onClick={exportCSV} style={S.csvBtn}>📥 CSV ({rows.length})</button>

          {data?.checked_at && (
            <span style={S.checkedAt}>
              조회: {new Date(data.checked_at).toLocaleString('ko-KR')}
            </span>
          )}
        </div>
      </header>

      {loading ? (
        <div style={S.loading}>로딩 중...</div>
      ) : error ? (
        <div style={S.error}>에러: {error}</div>
      ) : !data ? (
        <div style={S.empty}>데이터 없음</div>
      ) : (
        <>
          {/* summary bar */}
          <div style={S.summaryBar}>
            <span style={S.sumLabel}>총 결제</span>
            <b>{sm.total ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>완료</span>
            <b style={S.colorPaid}>{sm.paid ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>실패</span>
            <b style={sm.failed > 0 ? S.colorFail : null}>{sm.failed ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>환불</span>
            <b>{sm.refunded ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>완납 합계</span>
            <b style={S.totalBig}>{fmtKrw(sm.total_paid_krw)}원</b>
          </div>

          {/* kind 분포 */}
          {sm.by_kind && (
            <div style={S.planBar}>
              <span style={S.sumLabel}>종류 분포:</span>
              <span style={S.planChip}>
                <code style={S.codeInline}>initial</code> {sm.by_kind.initial ?? 0}
              </span>
              <span style={S.planChip}>
                <code style={S.codeInline}>recurring</code> {sm.by_kind.recurring ?? 0}
              </span>
              <span style={S.planChip}>
                <code style={S.codeInline}>retry</code> {sm.by_kind.retry ?? 0}
              </span>
              <span style={S.divider}>·</span>
              <span style={S.sumLabel}>기본료 합</span>
              <b>{fmtKrw(sm.total_amount_krw)}원</b>
              <span style={S.divider}>·</span>
              <span style={S.sumLabel}>초과료 합</span>
              <b style={sm.total_overage_krw > 0 ? S.colorOverage : null}>
                {fmtKrw(sm.total_overage_krw)}원
              </b>
            </div>
          )}

          {/* 결제 표 */}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr style={S.theadRow}>
                  <th style={S.th}>일시</th>
                  <th style={S.th}>계정</th>
                  <th style={S.th}>플랜</th>
                  <th style={S.th}>종류</th>
                  <th style={S.th}>상태</th>
                  <th style={S.thNum}>기본료</th>
                  <th style={S.thNum}>초과</th>
                  <th style={S.thNum}>총액</th>
                  <th style={S.th}>PG 거래</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} style={S.empty}>표시할 결제 내역이 없습니다</td></tr>
                ) : rows.map((r, i) => {
                  const sb = statusBadge(r.status);
                  const kb = kindBadge(r.kind);
                  const total = Number(r.amount || 0) + Number(r.overage_amount || 0);
                  return (
                    <tr key={r.id} style={i % 2 ? S.trAlt : S.tr}>
                      <td style={S.td}>
                        <div>{fmtDateTime(r.paid_at || r.created_at)}</div>
                        {r.paid_at && r.created_at && r.paid_at !== r.created_at && (
                          <div style={S.subId}>요청: {fmtDateTime(r.created_at)}</div>
                        )}
                      </td>
                      <td style={S.td}>
                        <div style={S.emailCell}>{r.account_email || '—'}</div>
                        <div style={S.subId}>#{r.account_id ?? '—'}</div>
                      </td>
                      <td style={S.td}>
                        <div style={S.planLabel}>{r.plan_label || '—'}</div>
                        <code style={S.codeSmall}>{r.plan_id || '—'}</code>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          ...S.statusBadgeBase,
                          background: kb.bg, color: kb.fg,
                        }}>{kb.label}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          ...S.statusBadgeBase,
                          background: sb.bg, color: sb.fg,
                        }}>{sb.label}</span>
                        {r.status === 'failed' && r.failed_reason && (
                          <div style={S.failReason} title={r.failed_reason}>
                            {r.failed_reason.slice(0, 30)}{r.failed_reason.length > 30 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td style={S.tdNum}>{fmtKrw(r.amount)}</td>
                      <td style={S.tdNum}>
                        {r.overage_amount > 0 ? (
                          <span style={S.colorOverage}>
                            {fmtKrw(r.overage_amount)}
                            {r.overage_quantity > 0 && (
                              <small style={S.smallDim}> ({r.overage_quantity}건)</small>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={S.tdNum}><b>{fmtKrw(total)}</b></td>
                      <td style={S.td}>
                        {r.pg_tx_id ? (
                          <code style={S.codeSmall} title={r.pg_tx_id}>
                            {String(r.pg_tx_id).slice(0, 10)}…
                          </code>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={S.note}>
            ※ read-only · DML 없음 · 최대 200건 (created_at DESC) · payment_history JOIN subscriptions + plans + accounts
          </div>
        </>
      )}

      <footer style={S.footer}>
        commercial-blog · 93차 /admin/payments v0.1 · publish.js FREEZE · DB 변경 0
      </footer>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#0f1115',
    color: '#e6e8eb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '24px',
  },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, margin: '0 0 8px' },
  versionTag: {
    fontSize: 11, color: '#9ca3af', fontWeight: 400,
    background: '#1e293b', padding: '2px 7px', borderRadius: 10, marginLeft: 6,
  },
  meta: {
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    fontSize: 13, color: '#9ca3af',
  },
  metaLabel: { color: '#9ca3af' },
  select: {
    background: '#1f2937', color: '#e6e8eb', border: '1px solid #374151',
    padding: '5px 10px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  refreshBtn: {
    background: '#1f2937', color: '#e6e8eb',
    border: '1px solid #374151', padding: '6px 12px', borderRadius: 6,
    cursor: 'pointer', fontSize: 12,
  },
  csvBtn: {
    background: '#1e3a2b', color: '#86efac',
    border: '1px solid #2d5a3f', padding: '6px 12px', borderRadius: 6,
    cursor: 'pointer', fontSize: 12,
  },
  checkedAt: {
    marginLeft: 'auto', color: '#6b7280', fontSize: 11,
  },

  summaryBar: {
    display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    background: '#13171d', border: '1px solid #2a2f38', borderRadius: 8,
    padding: '12px 16px', marginBottom: 10, fontSize: 13,
  },
  planBar: {
    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    background: '#13171d', border: '1px solid #2a2f38', borderRadius: 8,
    padding: '10px 16px', marginBottom: 14, fontSize: 12,
  },
  planChip: {
    background: '#1c2129', border: '1px solid #2a2f38',
    padding: '3px 9px', borderRadius: 10,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  sumLabel: { color: '#9ca3af', fontSize: 12 },
  divider: { color: '#374151', margin: '0 4px' },
  colorPaid: { color: '#6ee7b7' },
  colorFail: { color: '#f87171', fontWeight: 700 },
  colorOverage: { color: '#fbbf24', fontWeight: 600 },
  totalBig: { fontSize: 16, color: '#6ee7b7' },

  loading: { padding: 40, textAlign: 'center', color: '#9ca3af' },
  error: { padding: 20, background: '#3b1d1d', color: '#fca5a5', borderRadius: 8 },
  empty: { padding: 24, textAlign: 'center', color: '#6b7280' },

  tableWrap: {
    background: '#161a20', border: '1px solid #2a2f38',
    borderRadius: 10, overflow: 'hidden', overflowX: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  theadRow: { background: '#1c2129', borderBottom: '1px solid #2a2f38' },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' },
  thNum: { padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #1f242c' },
  trAlt: { borderBottom: '1px solid #1f242c', background: '#13171d' },
  td: { padding: '10px 12px', verticalAlign: 'middle' },
  tdNum: {
    padding: '10px 12px', textAlign: 'right',
    verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums',
  },

  emailCell: { color: '#e6e8eb', fontSize: 13 },
  subId: { color: '#6b7280', fontSize: 11, marginTop: 2, fontFamily: 'ui-monospace, monospace' },
  planLabel: { color: '#e6e8eb', fontWeight: 500 },
  smallDim: { color: '#6b7280', fontSize: 11 },
  failReason: { color: '#fca5a5', fontSize: 11, marginTop: 3 },

  codeInline: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: 11, color: '#a5d8ff',
  },
  codeSmall: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: 11, color: '#a5d8ff', background: '#0f1115',
    padding: '2px 6px', borderRadius: 4,
  },

  statusBadgeBase: {
    fontSize: 11, padding: '3px 9px', borderRadius: 10,
    fontWeight: 500, display: 'inline-block',
  },

  note: {
    marginTop: 12, fontSize: 11, color: '#6b7280',
    padding: '8px 12px', background: '#13171d', borderRadius: 6,
  },
  footer: {
    marginTop: 24, textAlign: 'center', color: '#4b5563', fontSize: 11,
  },
};
