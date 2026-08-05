// pages/admin/subscriptions.js
// 82차 v0.1 — 구독 현황 read-only 보드 (신규)
//
// 의도:
//   - /admin/billing (시뮬레이션) 과 역할 명확 분리
//   - /admin/billing      = 예상 청구 시뮬레이션 (plan 가정 변경)
//   - /admin/subscriptions = 실제 구독 현황 (현재 DB 상태)
//
// 패턴: billing.js v0.2 UI 컨벤션 준수
//   - 동일 다크 테마 (#0f1115)
//   - Bearer 토큰 + owner 가드
//   - summary bar + 계정별 표
//
// 데이터 소스: /api/admin/subscriptions-list v0.1
// publish.js / me.js / account.js 영향: 0

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';

const STATUS_STYLE = {
  active:    { bg: '#064e3b', fg: '#6ee7b7', label: '활성' },
  past_due:  { bg: '#3b2f1d', fg: '#fbbf24', label: '결제 지연' },
  paused:    { bg: '#3b2f1d', fg: '#fbbf24', label: '일시 중지' },
  // 104차: write 경로는 'canceled'(l 1개). 과거 'cancelled'(l 2개)도 보존해 둘 다 "해지됨" 표시.
  canceled:  { bg: '#1f242c', fg: '#9ca3af', label: '해지됨' },
  cancelled: { bg: '#1f242c', fg: '#9ca3af', label: '해지됨' },
  expired:   { bg: '#1f242c', fg: '#9ca3af', label: '만료됨' },
};

function statusBadge(st) {
  return STATUS_STYLE[st] || { bg: '#1f242c', fg: '#9ca3af', label: st || '—' };
}

function fmtDateOnly(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtKrw(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('ko-KR');
}

export default function AdminSubscriptions() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all / active / past_due / cancel_scheduled

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

      const r = await fetch('/api/admin/subscriptions-list', {
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
    if (filter === 'all') return true;
    if (filter === 'cancel_scheduled') return r.cancel_at_period_end;
    // 104차: 해지 필터는 canceled(l1)·cancelled(l2) 양쪽 흡수
    if (filter === 'canceled') return r.status === 'canceled' || r.status === 'cancelled';
    return r.status === filter;
  });

  const sm = data?.summary || {};

  if (!authed) return null;

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>
          📋 구독 현황 <span style={S.versionTag}>v0.1 · read-only</span>
        </h1>
        <div style={S.meta}>
          <span style={S.metaLabel}>필터:</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={S.select}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="past_due">결제 지연</option>
            <option value="paused">일시 중지</option>
            <option value="canceled">해지됨</option>
            <option value="expired">만료됨</option>
            <option value="cancel_scheduled">해지 예정 (cancel_at_period_end)</option>
          </select>
          <button onClick={load} style={S.refreshBtn}>↻ 새로고침</button>
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
            <span style={S.sumLabel}>총 구독</span>
            <b>{sm.total ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>활성</span>
            <b style={S.colorActive}>{sm.active ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>결제 지연</span>
            <b style={sm.past_due > 0 ? S.colorWarn : null}>{sm.past_due ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>일시 중지</span>
            <b>{sm.paused ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>해지됨</span>
            <b>{sm.cancelled ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>만료</span>
            <b>{sm.expired ?? 0}</b>
            <span style={S.divider}>·</span>
            <span style={S.sumLabel}>해지 예정</span>
            <b style={sm.cancel_scheduled > 0 ? S.colorWarn : null}>{sm.cancel_scheduled ?? 0}</b>
          </div>

          {/* plan 분포 */}
          {sm.by_plan && Object.keys(sm.by_plan).length > 0 && (
            <div style={S.planBar}>
              <span style={S.sumLabel}>플랜 분포:</span>
              {Object.entries(sm.by_plan).map(([pid, cnt]) => (
                <span key={pid} style={S.planChip}>
                  <code style={S.codeInline}>{pid}</code> {cnt}
                </span>
              ))}
            </div>
          )}

          {/* 구독 표 */}
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr style={S.theadRow}>
                  <th style={S.th}>계정</th>
                  <th style={S.th}>플랜</th>
                  <th style={S.thNum}>월 quota</th>
                  <th style={S.thNum}>월 요금</th>
                  <th style={S.th}>상태</th>
                  <th style={S.th}>주기 종료</th>
                  <th style={S.th}>자동 갱신</th>
                  <th style={S.th}>billing_key</th>
                  <th style={S.th}>생성일</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={9} style={S.empty}>표시할 구독이 없습니다</td></tr>
                ) : rows.map((r, i) => {
                  const badge = statusBadge(r.status);
                  return (
                    <tr key={r.id} style={i % 2 ? S.trAlt : S.tr}>
                      <td style={S.td}>
                        <div style={S.emailCell}>{r.account_email || '—'}</div>
                        <div style={S.subId}>#{r.account_id}</div>
                      </td>
                      <td style={S.td}>
                        <div style={S.planLabel}>{r.plan_label || '—'}</div>
                        <code style={S.codeSmall}>{r.plan_id || '—'}</code>
                      </td>
                      <td style={S.tdNum}>{r.plan_monthly_quota ?? '—'}</td>
                      <td style={S.tdNum}>{fmtKrw(r.plan_price_krw)}</td>
                      <td style={S.td}>
                        <span style={{
                          ...S.statusBadgeBase,
                          background: badge.bg,
                          color: badge.fg,
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={S.td}>{fmtDateOnly(r.current_period_end)}</td>
                      <td style={S.td}>
                        {r.cancel_at_period_end ? (
                          <span style={S.cancelScheduled}>해지 예정</span>
                        ) : (
                          <span style={S.autoRenew}>활성</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <code style={S.codeSmall}>
                          {r.billing_key_id ? String(r.billing_key_id).slice(0, 8) + '…' : '—'}
                        </code>
                      </td>
                      <td style={S.td}>{fmtDateOnly(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={S.note}>
            ※ read-only · DML 없음 · 최대 200건 (updated_at DESC) · subscriptions JOIN plans + accounts
          </div>
        </>
      )}

      <footer style={S.footer}>
        commercial-blog · 82차 /admin/subscriptions v0.1 · publish.js FREEZE · DB 변경 0
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
  colorActive: { color: '#6ee7b7' },
  colorWarn: { color: '#fbbf24', fontWeight: 600 },

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
  cancelScheduled: {
    fontSize: 11, padding: '3px 9px', borderRadius: 10,
    background: '#3b2f1d', color: '#fbbf24', fontWeight: 500,
  },
  autoRenew: {
    fontSize: 11, padding: '3px 9px', borderRadius: 10,
    background: '#064e3b', color: '#6ee7b7', fontWeight: 500,
  },

  note: {
    marginTop: 12, fontSize: 11, color: '#6b7280',
    padding: '8px 12px', background: '#13171d', borderRadius: 6,
  },
  footer: {
    marginTop: 24, textAlign: 'center', color: '#4b5563', fontSize: 11,
  },
};
