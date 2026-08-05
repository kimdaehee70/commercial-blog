// pages/admin/trend.js
// 84차 v0.2 — 권한 정비
// - OWNER_UID 가드 추가 (constants import)
// - Bearer 토큰 전파 추가 (system.js / mismatch.js 패턴 동일)
// - <></> Fragment → React.Fragment(key={t.publish_id}) 로 교체 (보류 이슈 [A] 1번)
// - rankSeries map key={i} → key={`${r.d}-${i}`} (보류 이슈 [A] 3번)
//
// 48차 — survival trend 보드 (read-only)

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { aliveStatusLabel } from '../../lib/adminUI';

export default function TrendPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expandedPid, setExpandedPid] = useState(null);

  // 가드 (B방식: unauth/non-owner → 기존처럼 /login)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) {
        setErr('no_token');
        setLoading(false);
        return;
      }

      const r = await fetch('/api/admin/trend', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!j.ok) setErr((j.error || 'error') + (j.detail ? ` — ${j.detail}` : ''));
      else { setData(j); setErr(null); }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  if (authState === 'unauth' || authState === 'non-owner') return <div style={S.page}><div style={S.h1}>Survival Trend</div><div>로그인 페이지로 이동 중…</div></div>;
  if (!authed) return <div style={S.page}><div style={S.h1}>Survival Trend</div><div>인증 확인 중…</div></div>;
  if (loading) return <div style={S.page}><div style={S.h1}>Survival Trend</div><div>로딩 중…</div></div>;
  if (err) return <div style={S.page}><div style={S.h1}>Survival Trend</div><div style={S.err}>에러: {err}</div></div>;
  if (!data) return null;

  const { summary, industry, timelines, observed_at } = data;

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <div>
          <div style={S.h1}>Survival Trend</div>
          <div style={S.sub}>관측 시각: {fmtDateTime(observed_at)}</div>
        </div>
        <button style={S.refreshBtn} onClick={load}>↻ 새로고침</button>
      </div>

      {/* 상단 — 압축 지표 */}
      <div style={S.section}>
        <div style={S.sectionTitle}>전체 압축</div>
        <div style={S.boxRow}>
          <Box label="전체 발행" value={summary.total_posts} />
          <Box label="관측됨" value={summary.observed_posts} tone="info" />
          <Box label="생존율" value={pct(summary.alive_rate)} tone="ok" />
          <Box label="보합율" value={pct(summary.fossil_rate)} tone={summary.fossil_rate > 0.3 ? 'warn' : 'muted'} />
          <Box label="평균 생존일" value={summary.avg_survival_days != null ? `${summary.avg_survival_days}d` : '—'} />
          <Box label="평균 보합 전환" value={summary.avg_fossil_day != null ? `D+${summary.avg_fossil_day}` : '—'} tone="warn" />
        </div>
      </div>

      {/* 업종별 표 */}
      <div style={S.section}>
        <div style={S.sectionTitle}>업종별 survival</div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>industry</th>
                <th style={S.thNum}>발행</th>
                <th style={S.thNum}>생존</th>
                <th style={S.thNum}>보합</th>
                <th style={S.thNum}>관찰중</th>
                <th style={S.thNum}>생존율</th>
                <th style={S.thNum}>평균 생존일</th>
              </tr>
            </thead>
            <tbody>
              {industry.length === 0 && (
                <tr><td colSpan={7} style={S.tdEmpty}>업종 데이터 없음</td></tr>
              )}
              {industry.map(r => (
                <tr key={r.industry}>
                  <td style={S.td}>{r.industry}</td>
                  <td style={S.tdNum}>{r.posts}</td>
                  <td style={S.tdNum}>{r.latest_alive}</td>
                  <td style={S.tdNum}>{r.latest_fossil}</td>
                  <td style={S.tdNum}>{r.latest_unknown}</td>
                  <td style={S.tdNum}><span style={rateStyle(r.alive_rate)}>{pct(r.alive_rate)}</span></td>
                  <td style={S.tdNum}>{r.avg_survival_days != null ? `${r.avg_survival_days}d` : <span style={S.muted}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 — publish 별 timeline */}
      <div style={S.section}>
        <div style={S.sectionTitle}>발행별 timeline ({timelines.length})</div>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.thNum}>id</th>
                <th style={S.th}>제목</th>
                <th style={S.th}>업종</th>
                <th style={S.thNum}>관측수</th>
                <th style={S.th}>현재 상태</th>
                <th style={S.thNum}>최근 rank</th>
                <th style={S.thNum}>생존일</th>
                <th style={S.th}>상태 변화</th>
                <th style={S.th}>펼치기</th>
              </tr>
            </thead>
            <tbody>
              {timelines.length === 0 && (
                <tr><td colSpan={9} style={S.tdEmpty}>발행 이력 없음</td></tr>
              )}
              {timelines.map(t => (
                <Fragment key={t.publish_id}>
                  <tr>
                    <td style={S.tdNum}>{t.publish_id}</td>
                    <td style={S.tdTitle} title={t.title || ''}>{t.title || <span style={S.muted}>(제목 없음)</span>}</td>
                    <td style={S.td}>{t.industry || <span style={S.muted}>—</span>}</td>
                    <td style={S.tdNum}>{t.observation_count}</td>
                    <td style={S.td}>{renderAliveBadge(t.latest_status)}</td>
                    <td style={S.tdNum}>{t.latest_rank ?? <span style={S.muted}>—</span>}</td>
                    <td style={S.tdNum}>{t.survival_days != null ? `${t.survival_days}d` : <span style={S.muted}>—</span>}</td>
                    <td style={S.td}>{renderStatusChanges(t.status_changes)}</td>
                    <td style={S.td}>
                      <button
                        style={S.btn}
                        onClick={() => setExpandedPid(expandedPid === t.publish_id ? null : t.publish_id)}
                      >
                        {expandedPid === t.publish_id ? '접기' : `펼치기 (${t.observation_count})`}
                      </button>
                    </td>
                  </tr>
                  {expandedPid === t.publish_id && (
                    <tr>
                      <td colSpan={9} style={S.detailCell}>
                        <TimelineDetail timeline={t.full_timeline} rankSeries={t.rank_series} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.footer}>
        ※ 데이터 spine = publish_metrics. snapshot이 누적될수록 정확도 상승.
        <br />
        ※ 생존율 = 최신 관측 기준. 평균 보합 전환 = 첫 보합 관측 시점의 발행 후 경과일 평균.
      </div>
    </div>
  );
}

function TimelineDetail({ timeline, rankSeries }) {
  if (!timeline || timeline.length === 0) {
    return <div style={S.muted}>관측 이력 없음</div>;
  }
  return (
    <div style={S.detailWrap}>
      <div style={S.detailTitle}>관측 이력 ({timeline.length})</div>
      <table style={S.innerTable}>
        <thead>
          <tr>
            <th style={S.innerTh}>D+</th>
            <th style={S.innerTh}>date</th>
            <th style={S.innerTh}>상태</th>
            <th style={S.innerThNum}>rank</th>
            <th style={S.innerTh}>keyword</th>
            <th style={S.innerTh}>note</th>
            <th style={S.innerTh}>보합 신호</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((m, i) => (
            <tr key={`${m.date || 'd'}-${m.d ?? i}-${i}`}>
              <td style={S.innerTdNum}>D+{m.d ?? '—'}</td>
              <td style={S.innerTd}>{fmtDate(m.date)}</td>
              <td style={S.innerTd}>{renderAliveBadge(m.status)}</td>
              <td style={S.innerTdNum}>{m.rank ?? <span style={S.muted}>—</span>}</td>
              <td style={S.innerTd}>{m.keyword || <span style={S.muted}>—</span>}</td>
              <td style={S.innerTd}>{m.note || <span style={S.muted}>—</span>}</td>
              <td style={S.innerTd}>{Array.isArray(m.fossil) && m.fossil.length ? m.fossil.join(', ') : <span style={S.muted}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rankSeries && rankSeries.length > 1 && (
        <div style={S.rankNote}>
          rank 변화: {rankSeries.map((r, i) => (
            <span key={`${r.d}-${i}`} style={S.rankPill}>D+{r.d}: {r.rank}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Box({ label, value, tone }) {
  const palette = {
    ok:   { bg: '#e8f5e9', fg: '#2e7d32' },
    warn: { bg: '#fff3e0', fg: '#e65100' },
    info: { bg: '#e3f2fd', fg: '#1565c0' },
    muted:{ bg: '#f5f5f5', fg: '#666' },
  };
  const p = palette[tone] || { bg: '#fafafa', fg: '#222' };
  return (
    <div style={{ ...S.box, background: p.bg }}>
      <div style={S.boxLabel}>{label}</div>
      <div style={{ ...S.boxValue, color: p.fg }}>{value}</div>
    </div>
  );
}

function renderAliveBadge(status) {
  if (!status) return <span style={S.muted}>—</span>;
  const isAlive = status === 'alive';
  const isFossil = status === 'fossil';
  const bg = isAlive ? '#e8f5e9' : isFossil ? '#fff3e0' : '#f5f5f5';
  const fg = isAlive ? '#2e7d32' : isFossil ? '#e65100' : '#666';
  return <span style={{ ...S.badge, background: bg, color: fg }}>{aliveStatusLabel(status)}</span>;
}

function renderStatusChanges(changes) {
  if (!changes || changes.length === 0) return <span style={S.muted}>—</span>;
  const transitions = changes.filter(c => c.from !== null);
  if (transitions.length === 0) {
    const init = changes[0];
    return <span style={S.transition}>{aliveStatusLabel(init.to)} (D+{init.d})</span>;
  }
  return (
    <span>
      {transitions.map((c, i) => (
        <span key={`${c.from || 'null'}-${c.to}-${c.d}-${i}`} style={S.transition}>{aliveStatusLabel(c.from)} → {aliveStatusLabel(c.to)} @ D+{c.d}</span>
      ))}
    </span>
  );
}

function pct(n) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(0)}%`;
}
function rateStyle(r) {
  if (r >= 0.7) return { color: '#2e7d32', fontWeight: 700 };
  if (r >= 0.4) return { color: '#222', fontWeight: 600 };
  return { color: '#e65100', fontWeight: 600 };
}
function fmtDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch { return s; }
}
function fmtDateTime(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return s; }
}
function pad(n) { return String(n).padStart(2, '0'); }

const S = {
  page: { padding: '24px 32px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#222', maxWidth: 1500, margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { fontSize: 12, color: '#888' },
  refreshBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8, letterSpacing: 0.3 },
  boxRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  box: { flex: '1 1 160px', minWidth: 160, padding: '14px 16px', borderRadius: 8, border: '1px solid #eee' },
  boxLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  boxValue: { fontSize: 22, fontWeight: 700 },
  tableWrap: { overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' },
  thNum: { padding: '10px 12px', textAlign: 'right', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f3f3', verticalAlign: 'middle' },
  tdNum: { padding: '10px 12px', borderBottom: '1px solid #f3f3f3', textAlign: 'right', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' },
  tdTitle: { padding: '10px 12px', borderBottom: '1px solid #f3f3f3', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#888' },
  muted: { color: '#bbb' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  err: { color: '#c62828', padding: '12px 16px', background: '#ffebee', borderRadius: 6 },
  footer: { fontSize: 11, color: '#999', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f3f3', lineHeight: 1.6 },
  btn: { padding: '4px 10px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  transition: { display: 'inline-block', padding: '2px 6px', background: '#fff8e1', color: '#7a5b00', borderRadius: 4, fontSize: 11, marginRight: 4 },
  detailCell: { padding: 16, background: '#fafbfc', borderBottom: '1px solid #eee' },
  detailWrap: { fontSize: 12 },
  detailTitle: { fontWeight: 600, marginBottom: 8, color: '#555' },
  innerTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12, background: '#fff' },
  innerTh: { padding: '6px 10px', textAlign: 'left', background: '#f3f5f7', borderBottom: '1px solid #e0e0e0', fontWeight: 600 },
  innerThNum: { padding: '6px 10px', textAlign: 'right', background: '#f3f5f7', borderBottom: '1px solid #e0e0e0', fontWeight: 600 },
  innerTd: { padding: '6px 10px', borderBottom: '1px solid #f0f0f0' },
  innerTdNum: { padding: '6px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  rankNote: { marginTop: 10, fontSize: 11, color: '#555' },
  rankPill: { display: 'inline-block', marginLeft: 6, padding: '2px 8px', background: '#e3f2fd', color: '#1565c0', borderRadius: 10, fontSize: 11 },
};
