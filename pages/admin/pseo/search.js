// pages/admin/pseo/search.js
// ─────────────────────────────────────────────────────────────
// [PSEO-SEARCH-INDEX-BOARD-01] 검색노출 보드 V1
//
// 이 화면의 정의: "검색엔진에 내보낼 pSEO 검색자산 목록"의 정본.
//   ★ 차단 업체는 이 목록에 URL 로 등장하지 않는다(선장 Gate).
//     상단 요약 숫자 1개로만 센다. 섞는 순간 이 보드는 내보낼 자산 목록이 아니라
//     그냥 업체 목록이 되고, 앞으로 sitemap 원본으로 발전할 수 없다.
//     업체 단위 전수 현황은 /admin/pseo(관제)가 이미 담당한다 — 역할 분리.
//
// ★ 행 단위가 관제와 다르다. 관제 = store 1행. 여기 = 페이지 1행.
//   허브 1행 + 그 업체의 Intent N행으로 평탄화한다.
//   검색엔진이 가져가는 단위는 업체가 아니라 URL 이다.
//
// ★ Google/Naver 열은 연동·저장소가 없어 '미확인' 고정이다.
//   추정·판정 로직을 넣지 않는다. 헤더에 (연동 전)을 박아 자동판정이 아님을 명시한다.
//   실측(2026-09-13): Google site: 0건 / Naver 0건 / 코드는 index 허용 상태.
//   V2 에서 DDL 과 함께 실제 상태로 교체한다.
//
// ★ API 는 신규로 만들지 않고 /api/admin/pseo-list 를 그대로 쓴다.
//   eligibility·Intent 판정을 여기서 복제하면 관제와 판정이 갈라진다.
//   왕복도 늘지 않는다(기존 조회 결과에 URL 만 파생 추가).
//
// ★ AdminNav 활성 판정이 문자열 완전일치라 PseoAdminLayout 이 상단을 고정한다.
//   이 페이지는 current="/admin/pseo/search" 만 넘긴다(좌측 레일 활성용).
//   AdminNav 에 prefix matching 을 넣지 않는다 — 전역 규칙 변경 금지.
//
// 인증 패턴: pseo.js / stores.js 동일 — useAdminGuard 판정 + Bearer 토큰.
//
// 이번 커밋 범위 밖(금지): robots.txt · sitemap · canonical · GSC/Search Advisor 연동 · DDL.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAdminGuard } from '../../../lib/useAdminGuard';
import { PseoAdminLayout } from '../../../lib/pseoLayout';

export default function AdminPseoSearch() {
  const { authState } = useAdminGuard();
  const authed = authState === 'owner';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token || '';
        const r = await fetch('/api/admin/pseo-list', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        if (!alive) return;
        // 오류를 빈 화면으로 삼키지 않는다 — API 와 같은 원칙.
        if (!j.ok) setErr(j?.diag?.exception || j?.diag?.error_message || '조회 실패');
        else setData(j);
      } catch (e) {
        if (alive) setErr(e && e.message ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [authed]);

  const rows = data?.rows || [];
  const kpi = data?.kpi || null;

  // 공개 적격 업체만 페이지 단위로 평탄화한다.
  //   is_public 이 false 인 업체는 여기서 걸러진다 — URL 목록에 섞이지 않는다.
  //   서버가 store id 오름차순으로 주므로 정렬을 다시 하지 않는다.
  const pages = [];
  for (const r of rows) {
    if (!r.is_public) continue;
    pages.push({
      key: `hub-${r.store_id}`,
      store_id: r.store_id,
      store_name: r.store_name,
      sub: r.region,
      kind: '허브',
      url: r.hub_url,
      intent_count: r.intent_count,
      cta: r.cta?.total ?? 0,
    });
    for (const it of (r.intents || [])) {
      pages.push({
        key: `int-${r.store_id}-${it.keyword}`,
        store_id: r.store_id,
        store_name: r.store_name,
        sub: it.keyword,
        kind: 'Intent',
        url: it.url,
        // CTA 집계는 store 단위다. Intent 행에 배분하면 없는 수치를 만드는 것이다.
        intent_count: null,
        cta: null,
      });
    }
  }

  if (!authed) return null;

  return (
    <PseoAdminLayout current="/admin/pseo/search">
      <h1 style={S.h1}>검색노출</h1>
      <p style={S.lead}>
        검색엔진에 내보낼 pSEO 검색자산 목록입니다. 공개 적격 페이지만 표시합니다.
      </p>

      <div style={S.kpiRow}>
        <Kpi label="검색자산 페이지" value={pages.length} tone="accent" />
        <Kpi label="공개 업체" value={kpi?.public_count ?? 0} />
        <Kpi label="차단 업체(목록 제외)" value={kpi?.blocked_count ?? 0} tone="dim" />
      </div>

      {loading ? <p style={S.dim}>불러오는 중…</p> : null}
      {err ? <p style={S.err}>{err}</p> : null}

      {!loading && !err ? (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>업체 / 페이지</th>
                <th style={S.th}>유형</th>
                <th style={S.th}>공개상태</th>
                <th style={{ ...S.th, minWidth: 280 }}>pSEO URL</th>
                <th style={S.th}>Google <span style={S.thNote}>(연동 전)</span></th>
                <th style={S.th}>Naver <span style={S.thNote}>(연동 전)</span></th>
                <th style={S.thNum}>Intent</th>
                <th style={S.thNum}>CTA 7일</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 ? (
                <tr><td style={S.empty} colSpan={8}>공개 적격 검색자산이 없습니다.</td></tr>
              ) : pages.map((p) => (
                <tr key={p.key}>
                  <td style={S.td}>
                    <div style={S.name}>{p.store_name}</div>
                    {p.sub ? <div style={S.subline}>{p.sub}</div> : null}
                  </td>
                  <td style={S.td}>
                    <span style={p.kind === '허브' ? S.tagHub : S.tagIntent}>{p.kind}</span>
                  </td>
                  <td style={S.td}><span style={S.pubOk}>공개</span></td>
                  <td style={S.td}>
                    {/* 관리자가 URL 정합성을 즉시 확인하는 기본 기능(선장 지시).
                        저장·외부 조회 없음. 새 탭 + noopener. */}
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={S.url}>
                        {p.url}
                      </a>
                    ) : <span style={S.dimInline}>—</span>}
                  </td>
                  <td style={S.td}><span style={S.unknown}>미확인</span></td>
                  <td style={S.td}><span style={S.unknown}>미확인</span></td>
                  <td style={S.tdNum}>{p.intent_count ?? ''}</td>
                  <td style={S.tdNum}>{p.cta ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p style={S.foot}>
        Google·Naver 상태는 연동·저장소가 없어 전부 미확인으로 표시합니다.
        robots · canonical · sitemap · 검색엔진 등록은 이 보드 다음 단계에서 순서대로 엽니다.
      </p>
    </PseoAdminLayout>
  );
}

function Kpi({ label, value, tone }) {
  const valStyle = {
    ...S.kpiVal,
    ...(tone === 'accent' ? S.kpiValAccent : null),
    ...(tone === 'dim' ? S.kpiValDim : null),
  };
  return (
    <div style={S.kpi}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={valStyle}>{value}</div>
    </div>
  );
}

// adminNav.js 콘솔 팔레트. 새 hex 를 만들지 않는다.
const C = {
  surface: '#171a21',
  border: '#2a2f3a',
  line: '#232730',
  text: '#f2f4f7',
  body: '#c8ccd2',
  dim: '#9aa1ab',
  faint: '#6a6f78',
  accent: '#3b82f6',
  ok: '#34d399',
  warn: '#fbbf24',
};

const S = {
  h1: { fontSize: 20, fontWeight: 800, color: C.text, margin: '0 0 6px' },
  lead: { fontSize: 12.5, color: C.dim, margin: '0 0 18px', lineHeight: 1.6 },

  kpiRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 },
  kpi: {
    flex: '0 0 auto', minWidth: 140, padding: '10px 14px',
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
  },
  kpiLabel: {
    fontSize: 10.5, color: C.faint, fontWeight: 700,
    letterSpacing: '0.04em', marginBottom: 4, whiteSpace: 'nowrap',
  },
  kpiVal: { fontSize: 20, fontWeight: 800, color: C.body },
  kpiValAccent: { color: C.accent },
  kpiValDim: { color: C.faint },

  tableWrap: { overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 6 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 960 },

  th: {
    textAlign: 'left', padding: '9px 12px', color: C.faint, fontWeight: 700,
    fontSize: 10.5, letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}`,
    background: C.surface, whiteSpace: 'nowrap',
  },
  thNum: {
    textAlign: 'right', padding: '9px 12px', color: C.faint, fontWeight: 700,
    fontSize: 10.5, letterSpacing: '0.04em', borderBottom: `1px solid ${C.border}`,
    background: C.surface, whiteSpace: 'nowrap',
  },
  thNote: { color: C.faint, fontWeight: 500, letterSpacing: 0 },

  td: {
    padding: '10px 12px', color: C.body,
    borderBottom: `1px solid ${C.line}`, verticalAlign: 'top',
  },
  tdNum: {
    padding: '10px 12px', color: C.body, textAlign: 'right',
    borderBottom: `1px solid ${C.line}`, verticalAlign: 'top',
  },

  name: { color: C.text, fontWeight: 700 },
  subline: { color: C.faint, fontSize: 11, marginTop: 2 },

  tagHub: {
    fontSize: 11, color: C.accent, border: `1px solid ${C.accent}`,
    borderRadius: 3, padding: '1px 7px', whiteSpace: 'nowrap',
  },
  tagIntent: {
    fontSize: 11, color: C.dim, border: `1px solid ${C.border}`,
    borderRadius: 3, padding: '1px 7px', whiteSpace: 'nowrap',
  },

  pubOk: { fontSize: 11.5, color: C.ok, fontWeight: 700 },
  unknown: { fontSize: 11.5, color: C.faint },

  url: { color: C.accent, textDecoration: 'none', wordBreak: 'break-all' },

  empty: { padding: '22px 12px', color: C.faint, textAlign: 'center' },
  dim: { color: C.dim, fontSize: 12.5 },
  dimInline: { color: C.faint },
  err: { color: C.warn, fontSize: 12.5 },
  foot: { marginTop: 16, fontSize: 11.5, color: C.faint, lineHeight: 1.7 },
};
