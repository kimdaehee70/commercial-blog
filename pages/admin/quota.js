// pages/admin/quota.js
// [표시 한글화] 운영 UI — 화면 표시 라벨만 한글화. CSV/DB/API/plan_id·plan_label 원본·정렬 입력·경로 무변경
//   · 원칙: 화면=한글 / 데이터 교환(CSV·API·DB)=영문 / 식별자(email)·경로·db표시=유지
//   · STATUS_LABEL(활성/대기/정지) PLAN_KO(무료/베이직/프로) + statusLabelKo/planLabelKo(plan_id 기준).
//   · plan/status 헤더·필터·카드제목·행표시·상태뱃지·inactive→비활성·over→초과 한글. downloadQuotaCSV 무변경.
//
// 88차 v0.3: CSV export 추가 (클라이언트 생성, 한글 헤더, UTF-8 BOM)
//   - 현재 화면 상태 그대로 저장 (filtered + sorted)
//   - API 신규 없음, Bearer 미사용 (현재 메모리 데이터 그대로)
//   - 파일명: quota_YYYY-MM-DD_HHmm.csv (관측 시각 기준)
//   - 헤더: 이메일/플랜ID/플랜명/월발행/월한도/사용률(%)/초과여부/누적발행/상태/최근발행일
//
// 88차 v0.2: 클라이언트 정렬 추가 (API 무변경, read-only 유지)
//   - 정렬 컬럼: email / plan / monthly_posts / quota_ratio / latest_at
//   - 기본: quota_ratio desc (over_quota 최상위)
//   - 클릭 시 asc/desc 토글, 다른 컬럼 클릭 시 기본 방향 시작
//     · email / plan         → asc 시작
//     · 월발행 / 사용률 / 최근발행 → desc 시작
//   - null latest_at 은 항상 맨 아래
//   - over_quota row 는 사용률 정렬 시 ratio=Infinity 취급
//   - summary / 필터 / API / 응답 필드 무변경
//
// 87차 v0.1: /admin/quota — 계정별 quota 사용량 관측 보드 (read-only)
//
// 데이터 소스: GET /api/admin/accounts-usage (v0.4)
//   - summary.by_plan / plans_source / plans_loaded 사용
//   - rows[].plan_source (전체 단일값) 사용
//
// 톤: dashboard.js 라이트 톤 100% 재사용 (S 객체 / Box / badge 패턴 동일)
// 가드: OWNER_UID 클라이언트 가드 + Bearer 전파 (dashboard.js 패턴)
//
// 필터:
//   - plan: 전체 / free / basic / pro
//   - over_quota only 토글

import { useEffect, useMemo, useState } from 'react';
import { useAdminGuard } from '../../lib/useAdminGuard';

// ── 표시 라벨 한글화 (표시 전용 — CSV/DB/API/plan_id·plan_label 원본·정렬 입력 전부 무변경) ──
//   "화면=한글 / 데이터 교환(CSV·API·DB)=영문" 원칙. 식별자(email 등)는 유지.
//   plan은 코드값(plan_id) 기준 매핑이 안정적. 매핑 없으면 서버 plan_label → 원문 폴백.
const STATUS_LABEL = { active: '활성', pending: '대기', suspended: '정지' };
const PLAN_KO = { free: '무료', basic: '베이직', pro: '프로' };
const statusLabelKo = (v) => STATUS_LABEL[v] || v || '';
// planId(코드값) 우선 → 없으면 서버 plan_label → 원문
const planLabelKo = (planId, serverLabel) => PLAN_KO[planId] || serverLabel || planId || '';

export default function QuotaPage() {
  // 공통 가드 (getSession → OWNER_UID 비교는 훅 내부) — dashboard 패턴(에러화면형, 동작 동치)
  const { authState, session, err: authErr, loading: authLoading } = useAdminGuard();
  const [data, setData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState(null);

  // 필터 상태
  const [planFilter, setPlanFilter] = useState('all'); // 'all' | 'free' | 'basic' | 'pro' | ...
  const [overOnly, setOverOnly] = useState(false);

  // 88차: 정렬 상태 (기본 사용률 desc)
  const [sortKey, setSortKey] = useState('quota_ratio'); // email | plan | monthly_posts | quota_ratio | latest_at
  const [sortDir, setSortDir] = useState('desc');        // 'asc' | 'desc'

  // 컬럼별 기본 정렬 방향
  const defaultDirOf = (key) => {
    if (key === 'email' || key === 'plan') return 'asc';
    return 'desc'; // monthly_posts / quota_ratio / latest_at
  };

  const onSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(defaultDirOf(key));
    }
  };

  // owner 확정 + session 확보 시에만 API 호출 (dashboard 패턴)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    let cancelled = false;
    setDataLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/admin/accounts-usage', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json();
        if (cancelled) return;

        if (r.status === 401) {
          setFetchErr('인증이 만료되었습니다. 다시 로그인해 주세요.');
        } else if (r.status === 403) {
          setFetchErr('관리자 권한이 필요합니다.');
        } else if (!j.ok) {
          setFetchErr(j.error + (j.detail ? ` — ${j.detail}` : ''));
        } else {
          setData(j);
        }
      } catch (e) {
        if (!cancelled) setFetchErr(e.message);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authState, session]);

  // 표시용 통합 (가드 에러 우선, 그다음 fetch 에러)
  const err = authErr || fetchErr;
  const loading = authLoading || (authState === 'owner' && dataLoading);

  // 필터링 + 정렬된 rows (useMemo)
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    let rows = data.rows;
    if (planFilter !== 'all') {
      rows = rows.filter(r => r.plan_id === planFilter);
    }
    if (overOnly) {
      rows = rows.filter(r => r.over_quota);
    }

    // 정렬값 추출 (null / over_quota 처리 포함)
    const valueOf = (r, key) => {
      switch (key) {
        case 'email':
          return (r.email || '').toLowerCase();
        case 'plan':
          // plan_label 우선, 없으면 plan_id (한글 라벨 자연순)
          return (r.plan_label || r.plan_id || '').toLowerCase();
        case 'monthly_posts':
          return Number(r.monthly_posts ?? 0);
        case 'quota_ratio':
          // over_quota 는 ratio 정렬 시 최상위 (Infinity)
          if (r.over_quota) return Number.POSITIVE_INFINITY;
          return Number(r.quota_ratio ?? 0);
        case 'latest_at':
          // null 은 정렬 방향 무관하게 맨 아래 → 별도 처리
          return r.latest_at ? new Date(r.latest_at).getTime() : null;
        default:
          return 0;
      }
    };

    const dirMul = sortDir === 'asc' ? 1 : -1;
    const sorted = [...rows].sort((a, b) => {
      const va = valueOf(a, sortKey);
      const vb = valueOf(b, sortKey);

      // null 처리 (latest_at 전용) — 방향 무관 항상 아래
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;

      // 문자열
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'ko') * dirMul;
      }
      // 숫자 / 시간
      if (va < vb) return -1 * dirMul;
      if (va > vb) return  1 * dirMul;
      return 0;
    });

    return sorted;
  }, [data, planFilter, overOnly, sortKey, sortDir]);

  if (loading) return <div style={S.page}><div style={S.h1}>Quota 보드</div><div>로딩 중…</div></div>;
  if (err) return (
    <div style={S.page}>
      <div style={S.h1}>Quota 보드</div>
      <div style={S.err}>
        {authState === 'unauth' && '🔒 '}
        {authState === 'non-owner' && '⛔ '}
        에러: {err}
      </div>
    </div>
  );
  if (!data) return null;

  const { summary, rows, observed_at, month_start } = data;
  const planOptions = ['all', ...(summary.by_plan || []).map(p => p.plan_id)];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.h1}>
            Quota 보드 <span style={S.ver}>v0.3</span>
          </div>
          <div style={S.sub}>
            관측 시각: {fmtDateTime(observed_at)} · 월 시작: {fmtDate(month_start)} · plans:{' '}
            {renderPlansSourceBadge(summary.plans_source, summary.plans_loaded)}
          </div>
        </div>
        <div style={S.linkRow}>
          <a href="/admin/dashboard" style={S.link}>대시보드</a>
          <a href="/admin/accounts" style={S.link}>계정</a>
          <a href="/admin/publish" style={S.link}>발행</a>
          <a href="/admin/observations" style={S.link}>관측</a>
        </div>
      </div>

      {/* 상단 — 이번달 totals */}
      <div style={S.section}>
        <div style={S.sectionTitle}>이번달 사용량</div>
        <div style={S.boxRow}>
          <Box label="전체 계정" value={summary.total_accounts} />
          <Box label="이번달 총 발행" value={summary.monthly_posts_all} tone="info" />
          <Box label="누적 총 발행" value={summary.total_posts_all} tone="muted" />
          <Box
            label="quota 초과"
            value={summary.over_quota_count}
            tone={summary.over_quota_count > 0 ? 'warn' : 'muted'}
          />
        </div>
      </div>

      {/* 중단 — plan별 카드 */}
      <div style={S.section}>
        <div style={S.sectionTitle}>플랜별 현황</div>
        <div style={S.planCardRow}>
          {(summary.by_plan || []).map(p => (
            <div key={p.plan_id} style={{ ...S.planCard, ...(p.is_active ? {} : S.planCardInactive) }}>
              <div style={S.planCardHeader}>
                <span style={S.planCardLabel}>{planLabelKo(p.plan_id, p.plan_label)}</span>
                {!p.is_active && <span style={S.inactiveBadge}>비활성</span>}
              </div>
              <div style={S.planCardBody}>
                <div style={S.planCardRow2}>
                  <span style={S.muted}>계정</span>
                  <span style={S.planCardNum}>{p.account_count}</span>
                </div>
                <div style={S.planCardRow2}>
                  <span style={S.muted}>한도</span>
                  <span style={S.planCardNumSmall}>{p.monthly_quota}/월</span>
                </div>
                <div style={S.planCardRow2}>
                  <span style={S.muted}>이번달 발행</span>
                  <span style={S.planCardNum}>{p.monthly_posts}</span>
                </div>
                <div style={S.planCardRow2}>
                  <span style={S.muted}>초과 계정</span>
                  <span style={p.over_quota_count > 0 ? S.planCardOverNum : S.planCardNumSmall}>
                    {p.over_quota_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 필터 */}
      <div style={S.filterRow}>
        <span style={S.filterLabel}>플랜:</span>
        {planOptions.map(pid => (
          <button
            key={pid}
            onClick={() => setPlanFilter(pid)}
            style={{
              ...S.filterBtn,
              ...(planFilter === pid ? S.filterBtnActive : {}),
            }}
          >
            {pid === 'all' ? '전체' : planLabelKo(pid, planLabelOf(summary.by_plan, pid))}
          </button>
        ))}
        <span style={S.filterDivider}>|</span>
        <label style={S.checkLabel}>
          <input
            type="checkbox"
            checked={overOnly}
            onChange={e => setOverOnly(e.target.checked)}
            style={S.check}
          />
          quota 초과만
        </label>
        <span style={S.filterCount}>
          ({filteredRows.length} / {rows.length})
        </span>
        <button
          type="button"
          onClick={() => downloadQuotaCSV(filteredRows, observed_at)}
          disabled={filteredRows.length === 0}
          style={{
            ...S.csvBtn,
            ...(filteredRows.length === 0 ? S.csvBtnDisabled : {}),
          }}
          title="현재 화면 상태(필터·정렬 반영) 그대로 CSV 다운로드"
        >
          ⬇ CSV
        </button>
      </div>

      {/* 계정별 테이블 */}
      <div style={S.section}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>
                  <SortHeader label="email" colKey="email" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="left" />
                </th>
                <th style={S.th}>
                  <SortHeader label="플랜" colKey="plan" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="left" />
                </th>
                <th style={S.thNum}>
                  <SortHeader label="월 발행" colKey="monthly_posts" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
                </th>
                <th style={S.thNum}>한도</th>
                <th style={S.th}>
                  <SortHeader label="사용률" colKey="quota_ratio" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="left" />
                </th>
                <th style={S.thNum}>총 발행</th>
                <th style={S.th}>상태</th>
                <th style={S.th}>
                  <SortHeader label="최근 발행" colKey="latest_at" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="left" />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr><td colSpan={8} style={S.tdEmpty}>해당 조건의 계정이 없습니다.</td></tr>
              )}
              {filteredRows.map(a => (
                <tr key={a.id}>
                  <td style={S.td}>{a.email}</td>
                  <td style={S.td}>
                    {planLabelKo(a.plan_id, a.plan_label)}
                    {a.over_quota && <span style={S.overBadge}>초과</span>}
                  </td>
                  <td style={S.tdNum}>{a.monthly_posts}</td>
                  <td style={S.tdNum}>{a.monthly_quota}</td>
                  <td style={S.td}>{renderRatioBar(a.quota_ratio, a.over_quota)}</td>
                  <td style={S.tdNum}>{a.total_posts}</td>
                  <td style={S.td}>{renderStatusBadge(a.status)}</td>
                  <td style={S.td}>
                    {a.latest_at ? fmtDateTime(a.latest_at) : <span style={S.muted}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.footer}>
        ※ read-only. quota = plans.monthly_quota 기준. 플랜 변경은 /admin/accounts 에서. CSV = 현재 화면 상태 그대로 저장.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

// 88차 v0.3: CSV 셀 이스케이프
//   - 쉼표 / 따옴표 / 개행 포함 시 큰따옴표 감싸기
//   - 내부 따옴표는 두 번 ("")
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// 88차 v0.3: 파일명 타임스탬프 (관측 시각 기준)
//   - 결과: 2026-05-21_2046
function fmtFileStamp(s) {
  const d = s ? new Date(s) : new Date();
  if (Number.isNaN(d.getTime())) return 'unknown';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `_${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}

// 88차 v0.3: CSV 빌드 + 다운로드 트리거
//   - 현재 filteredRows (정렬·필터 반영 상태) 그대로 사용
//   - UTF-8 BOM 포함 (엑셀 한글 호환)
function downloadQuotaCSV(rows, observedAt) {
  const HEADERS = [
    '이메일',
    '플랜ID',
    '플랜명',
    '월발행',
    '월한도',
    '사용률(%)',
    '초과여부',
    '누적발행',
    '상태',
    '최근발행일',
  ];

  const lines = [HEADERS.join(',')];

  for (const r of rows) {
    const pct = Math.round(((r.quota_ratio ?? 0) * 100));
    const line = [
      csvEscape(r.email),
      csvEscape(r.plan_id),
      csvEscape(r.plan_label),
      csvEscape(r.monthly_posts ?? 0),
      csvEscape(r.monthly_quota ?? 0),
      csvEscape(pct),
      csvEscape(r.over_quota ? 'Y' : 'N'),
      csvEscape(r.total_posts ?? 0),
      csvEscape(r.status || ''),
      csvEscape(r.latest_at ? fmtDateTime(r.latest_at) : ''),
    ].join(',');
    lines.push(line);
  }

  const csv = lines.join('\r\n');
  const BOM = '\uFEFF'; // UTF-8 BOM (엑셀 한글 깨짐 방지)
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const filename = `quota_${fmtFileStamp(observedAt)}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // URL 해제 (지연 — Safari 안정성)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SortHeader({ label, colKey, sortKey, sortDir, onSort, align }) {
  const active = sortKey === colKey;
  const arrow = active ? (sortDir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      style={{
        ...S.sortBtn,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        color: active ? '#1565c0' : '#555',
        fontWeight: active ? 700 : 600,
      }}
      title={`${label} 기준 정렬 (현재: ${active ? (sortDir === 'asc' ? '오름차순' : '내림차순') : '미선택'})`}
    >
      <span>{label}</span>
      <span style={{ ...S.sortArrow, opacity: active ? 1 : 0.35 }}>{arrow}</span>
    </button>
  );
}

function Box({ label, value, tone }) {
  const palette = {
    ok:    { bg: '#e8f5e9', fg: '#2e7d32' },
    warn:  { bg: '#fff3e0', fg: '#e65100' },
    info:  { bg: '#e3f2fd', fg: '#1565c0' },
    muted: { bg: '#f5f5f5', fg: '#666' },
  };
  const p = palette[tone] || { bg: '#fafafa', fg: '#222' };
  return (
    <div style={{ ...S.box, background: p.bg }}>
      <div style={S.boxLabel}>{label}</div>
      <div style={{ ...S.boxValue, color: p.fg }}>{value}</div>
    </div>
  );
}

function renderRatioBar(ratio, over) {
  const pct = Math.min(100, Math.round((ratio || 0) * 100));
  const showOver = over;
  const barColor = showOver ? '#c62828' : ratio >= 0.8 ? '#e65100' : ratio >= 0.5 ? '#1565c0' : '#2e7d32';
  const textColor = showOver ? '#c62828' : ratio >= 0.8 ? '#e65100' : '#222';
  return (
    <div style={S.ratioWrap}>
      <div style={S.ratioBarBg}>
        <div style={{ ...S.ratioBarFg, width: `${Math.min(100, pct)}%`, background: barColor }} />
      </div>
      <span style={{ ...S.ratioText, color: textColor, fontWeight: showOver ? 700 : 600 }}>
        {pct}%
      </span>
    </div>
  );
}

function renderStatusBadge(status) {
  if (!status) return <span style={S.muted}>—</span>;
  const isActive = status === 'active';
  const bg = isActive ? '#e8f5e9' : '#f5f5f5';
  const fg = isActive ? '#2e7d32' : '#666';
  return <span style={{ ...S.badge, background: bg, color: fg }}>{statusLabelKo(status)}</span>;
}

function renderPlansSourceBadge(source, loaded) {
  if (!source) return <span style={S.muted}>—</span>;
  const isDb = source === 'db';
  const bg = isDb ? '#e8f5e9' : '#fff3e0';
  const fg = isDb ? '#2e7d32' : '#e65100';
  const label = isDb ? 'db' : 'fallback';
  return (
    <span style={{ ...S.badgeSmall, background: bg, color: fg }} title={loaded ? 'plans cache loaded' : 'plans cache not loaded yet'}>
      {label}
      {!loaded && <span style={{ marginLeft: 4, opacity: 0.7 }}>(stale)</span>}
    </span>
  );
}

function planLabelOf(byPlan, planId) {
  const p = (byPlan || []).find(x => x.plan_id === planId);
  return p?.plan_label || planId;
}

function fmtDate(s) {
  if (!s) return '';
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

// ─────────────────────────────────────────────
// 스타일 (dashboard.js S 객체 + quota 전용 추가)
// ─────────────────────────────────────────────
const S = {
  page: { padding: '24px 32px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#222', maxWidth: 1400, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  ver: { fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 8 },
  sub: { fontSize: 12, color: '#888' },
  linkRow: { display: 'flex', gap: 12 },
  link: { fontSize: 12, color: '#1565c0', textDecoration: 'none', padding: '4px 10px', background: '#e3f2fd', borderRadius: 4 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8, letterSpacing: 0.3 },

  boxRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  box: { flex: '1 1 140px', minWidth: 140, padding: '14px 16px', borderRadius: 8, border: '1px solid #eee' },
  boxLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  boxValue: { fontSize: 24, fontWeight: 700 },

  // plan별 카드
  planCardRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  planCard: { flex: '1 1 200px', minWidth: 200, padding: '14px 16px', borderRadius: 8, border: '1px solid #eee', background: '#fff' },
  planCardInactive: { opacity: 0.5, background: '#fafafa' },
  planCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f3f3f3' },
  planCardLabel: { fontSize: 14, fontWeight: 700, color: '#222' },
  planCardBody: { display: 'flex', flexDirection: 'column', gap: 6 },
  planCardRow2: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 },
  planCardNum: { fontSize: 16, fontWeight: 700, color: '#222', fontVariantNumeric: 'tabular-nums' },
  planCardNumSmall: { fontSize: 13, fontWeight: 600, color: '#222', fontVariantNumeric: 'tabular-nums' },
  planCardOverNum: { fontSize: 16, fontWeight: 700, color: '#c62828', fontVariantNumeric: 'tabular-nums' },
  inactiveBadge: { fontSize: 10, color: '#999', background: '#f5f5f5', padding: '1px 6px', borderRadius: 10 },

  // 필터
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, color: '#666', fontWeight: 600 },
  filterBtn: { padding: '4px 12px', fontSize: 12, border: '1px solid #ddd', background: '#fff', borderRadius: 4, cursor: 'pointer', color: '#555' },
  filterBtnActive: { background: '#1565c0', color: '#fff', borderColor: '#1565c0', fontWeight: 600 },
  filterDivider: { color: '#ddd', margin: '0 4px' },
  checkLabel: { fontSize: 12, color: '#555', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  check: { cursor: 'pointer' },
  filterCount: { fontSize: 11, color: '#999', marginLeft: 'auto' },

  // 88차 v0.3: CSV 다운로드 버튼
  csvBtn: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid #1565c0',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  csvBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },

  // 테이블
  tableWrap: { overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' },
  thNum: { padding: '10px 12px', textAlign: 'right', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 600, whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f3f3', verticalAlign: 'middle' },
  tdNum: { padding: '10px 12px', borderBottom: '1px solid #f3f3f3', textAlign: 'right', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' },
  tdEmpty: { padding: '24px', textAlign: 'center', color: '#888' },

  // ratio bar
  ratioWrap: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 },
  ratioBarBg: { flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  ratioBarFg: { height: '100%', borderRadius: 4, transition: 'width 0.2s' },
  ratioText: { fontSize: 12, minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },

  // 88차: 정렬 헤더 버튼
  sortBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  sortArrow: { fontSize: 10, color: '#888' },

  // 기타
  muted: { color: '#bbb' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  badgeSmall: { display: 'inline-block', padding: '1px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, marginLeft: 4 },
  overBadge: { display: 'inline-block', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: '#ffebee', color: '#c62828', marginLeft: 6 },
  err: { color: '#c62828', padding: '12px 16px', background: '#ffebee', borderRadius: 6 },
  footer: { fontSize: 11, color: '#999', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f3f3' },
};
