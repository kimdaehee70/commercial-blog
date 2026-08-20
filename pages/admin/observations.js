// pages/admin/observations.js
// v0.7 (세션84) — 관측 상세패널 + 관리자 관측 입력 이관 (A안 1단계)
//   Publish 는 '운영', Observation 은 '관측'. 두 화면이 각각 한 역할만 한다(DEC-017 연장).
//   ⚠ 순서 원칙: 대체 경로를 먼저 완성한 뒤 기존 기능을 걷어낸다.
//      이 파일(입력 신설)이 배포·검증된 뒤에야 publish.js 의 관측 입력을 제거한다(2단계).
//   · 행 「관측」 → 우측 드로어: 검색링크 3층 · 현재상태/변화 · 순위입력 3칸 · 노출체크 · 저장 · Timeline
//   · 저장 경로는 publish.js 에서 검증된 것을 그대로 쓴다 — POST /api/admin/observations 무변경.
//     rank_detail 6키 스키마·SHOW_RECENT_AXIS 플래그·emptyRankDetail 전부 동일(스키마 무변경).
//   · 목록/필터/정렬/페이저(v0.6)는 무접촉. 드로어는 오버레이라 표 레이아웃을 건드리지 않는다.
//
// v0.6 (세션83) — 관측목록 정식화 (A안)
//   ① 순위 컬럼 — 3단계 대표값(관리자 우선 → 없으면 사용자). 세션82 발행목록과 동일 정책.
//      검정=관리자 / 파랑=사용자 / 「밖」=관측했으나 순위권 밖 / 「-」=미관측. 건수는 별도 컬럼.
//   ② 관측 컬럼 — 관리자·사용자 건수를 나눠 표시(합산 숫자 하나로 두면 순위로 오독된다 — 세션82 §4-2).
//   ③ 필터 — 미관측 / 관측완료 / 사용자관측만 / 순위권밖 / 생존 / 보합 · 업종 · 검색 · 기간
//   ④ 정렬 — 최근발행 / 최근관측 / 미관측 오래된 순 / 순위 하락순 / 상위순
//   ⑤ 페이지네이션 — 서버 분할. 전량 조회는 서버가 유지한다(DEC-016). 화면만 나눈다.
//   ⑥ 보합관측(fossil_observed) 컬럼 제거 — 상태 뱃지와 중복. 데이터·API 는 무삭제.
//   ※ +생존 / +보합 / batch observe all 은 무접촉. E-1(Observation Queue)에서 일괄 정리 — 문서05 §3-2.
//
// 100차 v0.3: quick observe 버튼 → '+ alive' / '+ fossil' 2분기 (alive_status 명시 전송).
// 55차 v0.2: owner 가드 + Bearer 전파(3곳) + 401/403 분기
// 48차 v3: + batch observe all 버튼
// 세션76 v0.5 — 다크 전환 / v0.4 — AdminLayout 이관

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import { renderAliveBadge, fmtDate, fmtDateTime } from '../../lib/adminUI';
import {
  T, PageHead, StatRow, Stat, Table, Th, Td, Btn, ErrBox, Dash, footNoteStyle,
} from '../../lib/adminTheme';
// [BLOG-ACCOUNT-AUTO-LINK-01 · STEP 3] 관측 대상 식별 — naver_post_url 파싱 전용(추가 fetch 0)
import { extractNaverPost } from '../../lib/naverPostId';
// [LENS-CORE-SOT-01] 돋보기 검색어 = Core 관측축. 화면에서 재조립하지 않는다.
//   ★ 이 화면은 ORBIT 관측 입력 화면이다. 여기 돋보기가 관측축과 다르면
//     전 업종 관측 데이터가 엉뚱한 검색어 기준으로 쌓인다.
import { buildObservationCore } from '../../lib/spine/serviceAxis';

const STATUS_TABS = [
  { key: 'all',        label: '전체' },
  { key: 'unobserved', label: '미관측' },
  { key: 'observed',   label: '관측완료' },
  { key: 'user_only',  label: '사용자 관측만' },
  { key: 'rank_out',   label: '순위권 밖' },
  { key: 'alive',      label: '생존' },
  { key: 'fossil',     label: '보합' },
];

const SORT_OPTS = [
  { key: 'recent',          label: '최근 발행순' },
  { key: 'observed_recent', label: '최근 관측순' },
  { key: 'unobserved_old',  label: '미관측 오래된 순' },
  { key: 'rank_desc',       label: '순위 하락순' },
  { key: 'rank_asc',        label: '순위 상위순' },
];

// ── [세션84] 관측 입력 자산 — publish.js 에서 그대로 옮긴다(로직 변경 없음) ──────────
// 열 = query_type(기본/후기/제목), 행 = axis(관련/최신)
const RANK_GROUPS = [
  { type: 'core',   label: '기본',     relatedKey: 'core_related',   recentKey: 'core_recent' },
  { type: 'review', label: '후기',     relatedKey: 'review_related', recentKey: 'review_recent' },
  { type: 'full',   label: '전체제목', relatedKey: 'full_related',   recentKey: 'full_recent' },
];

// 최신축은 화면에서만 숨긴다(입력·저장 스키마·기존 기록 보존). 되살릴 때 한 줄.
const SHOW_RECENT_AXIS = false;
const axesOf = (g) =>
  SHOW_RECENT_AXIS
    ? [{ axis: '관련', key: g.relatedKey }, { axis: '최신', key: g.recentKey }]
    : [{ axis: '관련', key: g.relatedKey }];

const emptyRankDetail = () => ({
  core_related: '', core_recent: '',
  review_related: '', review_recent: '',
  full_related: '', full_recent: '',
});

const RANK_SHORT = {
  core_related: '기본관', core_recent: '기본최',
  review_related: '후기관', review_recent: '후기최',
  full_related: '제목관', full_recent: '제목최',
};

const rankDetailSummary = (rd) => {
  if (!rd || typeof rd !== 'object') return '';
  const parts = [];
  for (const k of Object.keys(RANK_SHORT)) {
    if (typeof rd[k] === 'number' && rd[k] > 0) parts.push(`${RANK_SHORT[k]} ${rd[k]}`);
  }
  return parts.join(' · ');
};

const CYCLE_OPTIONS = ['24h', '72h', '7d', '30d'];
const ALIVE_OPTIONS = [
  { v: '', label: '상태 미지정' },
  { v: 'alive', label: '생존' },
  { v: 'fossil', label: '보합' },
];

const defaultForm = () => ({
  check_cycle: '24h',
  alive_status: '',
  view_ok: true,
  related_ok: true,
  recent_ok: true,
  thumbnail_ok: true,
  memo: '',
  rank_detail: emptyRankDetail(),
});

// [LENS-CORE-SOT-01] 검색어 우선순위 — 3단. index.js · admin/publish.js 와 동일 규칙.
//   ① row.core_keyword          생성 시점 확정 Core(관측축 SoT). 정본.
//   ② row.full_keyword          [OBSERVATION-KEYWORD-IDENTITY-01] legacy(core NULL) 행의 실제 검색시장.
//   ③ buildObservationCore(...)  축 자체가 없는 행 폴백. lib 단일 계산.
//   ④ 제목 앞머리                 최후 폴백(기존 동작 보존).
//   ★ region+treatment_name 재조립은 폐기. 화면마다 다른 검색어를 열던 원인.
//
// [OBSERVATION-KEYWORD-IDENTITY-01] ② full_keyword 삽입 근거 — 실측.
//   core_keyword NULL 행이 ③으로 떨어져 「지역+업종」으로 재계산되고 있었다.
//   #1611: 최초 관측 「평내동 거실수납장제작」(1위) → 화면 재계산 「평내동 인테리어」
//   #1583: 최초 관측 「평내동 전체장판」(2위)     → 화면 재계산 「평내동 인테리어」
//   두 값 모두 full_keyword 와 일치한다. 즉 full_keyword 가 그 글의 실제 검색시장이다.
//   ★ enqueue.js L55 의 폴백 순서(core → full → active → keyword)와 동일화.
//   ★ publish.js 의 동명 함수와 반드시 동시 수정한다 — 반쪽 수정은 불일치를 남긴다.
const extractSearchKeyword = (row) => {
  if (!row) return '';
  const core = row.core_keyword
    || row.full_keyword
    || buildObservationCore(row.industry, row.region, row.cluster);
  if (core) return core;
  const title = row.title || '';
  return (title.split(/[｜|]/)[0].trim() || title.slice(0, 20));
};
const naverUrl = (q, recent) =>
  `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}${recent ? '&sort=ent_date' : ''}`;
const buildNaverLinks = (row) => {
  const core = extractSearchKeyword(row);
  if (!core) return null;
  const review = `${core} 후기`;
  const full = (row.title || '').replace(/[｜|].*$/, '').trim() || core;
  return {
    keyword: core, core, review, full,
    core_related: naverUrl(core, false),
    review_related: naverUrl(review, false),
    full_related: naverUrl(full, false),
  };
};

// 대표순위 방향 판정 — 숫자 작을수록 상위. timeline 은 최신순(desc).
const TREND = {
  up:    { icon: '↑', label: '상승중',   color: T.ok },
  flat:  { icon: '→', label: '보합',     color: T.textMuted },
  down:  { icon: '↓', label: '하락중',   color: T.danger },
  enter: { icon: '✨', label: '신규진입', color: T.info },
  exit:  { icon: '✗', label: '이탈',     color: T.textFaint },
};
const calcTrend = (cur, prev) => {
  const c = typeof cur === 'number' && cur > 0 ? cur : null;
  const p = typeof prev === 'number' && prev > 0 ? prev : null;
  if (c == null && p == null) return null;
  if (c != null && p == null) return TREND.enter;
  if (c == null && p != null) return TREND.exit;
  if (c < p) return TREND.up;
  if (c > p) return TREND.down;
  return TREND.flat;
};
const axisDelta = (cur, prev) => {
  const c = typeof cur === 'number' && cur > 0 ? cur : null;
  const p = typeof prev === 'number' && prev > 0 ? prev : null;
  if (c == null && p == null) return null;
  return { c, p, trend: calcTrend(c, p), diff: (c != null && p != null) ? Math.abs(p - c) : null, noPrev: p == null };
};

// Timeline 표시 병합 — 관리자/사용자는 각자 SoT(DEC-006). 정렬 + 출처 배지만 붙인다.
const mergeTimeline = (adminRows, userRows) => {
  const admin = adminRows || [];
  const user = userRows || [];
  const prevById = new Map();
  admin.forEach((t, i) => prevById.set(t.id, admin[i + 1] ? admin[i + 1].observed_rank : undefined));
  const merged = [
    ...admin.map((t) => ({ ...t, source: 'admin', _prevRank: prevById.get(t.id) })),
    ...user.map((u) => ({ ...u, source: 'user' })),
  ];
  const ts = (r) => new Date(r.recorded_at || r.created_at || 0).getTime();
  merged.sort((a, b) => ts(b) - ts(a));
  return merged;
};

export default function ObservationsPage() {
  const router = useRouter();
  const { authState, session, loading: authLoading } = useAdminGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  // 조회 조건 (서버 전달)
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [industry, setIndustry] = useState('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);

  // [세션84] 관측 드로어
  const [selId, setSelId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const qs = new URLSearchParams({
        status, sort, page: String(page), size: String(size),
      });
      if (industry) qs.set('industry', industry);
      if (q) qs.set('q', q);

      const r = await fetch(`/api/admin/observations?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.status === 401) { setErr('인증이 만료되었습니다. 다시 로그인해 주세요.'); return; }
      if (r.status === 403) { setErr('관리자 권한이 필요합니다.'); return; }

      const j = await r.json();
      if (!j.ok) setErr(j.error + (j.detail ? ` — ${j.detail}` : ''));
      else { setData(j); setErr(null); }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, router, status, sort, industry, q, page, size]);

  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') router.replace('/login');
  }, [authState, router]);

  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    load();
  }, [authState, session, load]);

  // 조건이 바뀌면 1페이지로 되돌린다 (마지막 페이지에서 필터 바꿔 빈 화면 나오는 것 방지)
  const applyFilter = (fn) => { fn(); setPage(1); };

  const showFlash = (type, msg) => {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 4500);
  };

  // ── 드로어: 단건 조회 (snapshot / timeline / user_ranks) ──
  const fetchDetail = useCallback(async (publish_id) => {
    if (!publish_id) { setDetail(null); return; }
    setDetailLoading(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }
      const r = await fetch(`/api/admin/observations?publish_id=${publish_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (j.ok) setDetail(j);
      else showFlash('err', `상세 조회 실패: ${j.error || ''}`);
    } catch (e) {
      showFlash('err', `네트워크 에러: ${e.message}`);
    } finally {
      setDetailLoading(false);
    }
  }, [getToken, router]);

  useEffect(() => {
    setForm(defaultForm());
    fetchDetail(selId);
  }, [selId, fetchDetail]);

  // ── 드로어: 관측 저장. 경로는 publish.js 에서 검증된 것과 동일(API 무변경) ──
  const saveObservation = useCallback(async (row) => {
    if (!selId || saving) return;
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }
      const links = buildNaverLinks(row);
      const r = await fetch('/api/admin/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          publish_id: selId,
          ...form,
          alive_status: form.alive_status || null,
          observed_keyword: links?.keyword ?? null,
        }),
      });
      if (r.status === 401) { showFlash('err', '인증이 만료되었습니다. 다시 로그인해 주세요.'); return; }
      if (r.status === 403) { showFlash('err', '관리자 권한이 필요합니다.'); return; }
      const j = await r.json();
      if (!j.ok) { showFlash('err', `저장 실패: ${j.error}${j.detail ? ` — ${j.detail}` : ''}`); return; }
      setForm(defaultForm());
      await fetchDetail(selId);
      await load();          // 목록 순위/건수 동기화 — 저장 직후 화면과 DB 를 맞춘다
      showFlash('ok', `관측 저장됨 — pid=${selId}`);
    } catch (e) {
      showFlash('err', `네트워크 에러: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [selId, saving, form, getToken, router, fetchDetail, load]);

  const onQuickObserve = useCallback(async (publish_id, alive_status) => {
    setBusyId(publish_id);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }
      const qsx = alive_status ? `&alive_status=${encodeURIComponent(alive_status)}` : '';
      const r = await fetch(`/api/admin/observe-quick?publish_id=${publish_id}${qsx}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { showFlash('err', '인증이 만료되었습니다. 다시 로그인해 주세요.'); return; }
      if (r.status === 403) { showFlash('err', '관리자 권한이 필요합니다.'); return; }

      const j = await r.json();
      if (!j.ok) {
        showFlash('err', `실패: ${j.error}${j.detail ? ` — ${j.detail}` : ''}`);
      } else {
        const ins = j.inserted || {};
        showFlash('ok', `관측 추가됨 — pid=${publish_id} · ${ins.alive_status} · ${ins.observed_date} · D+${ins.days_since_publish}`);
        await load();
      }
    } catch (e) {
      showFlash('err', `네트워크 에러: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }, [load, getToken, router]);

  const onBatchObserve = useCallback(async () => {
    if (batchBusy) return;
    if (!confirm('전체 발행을 일괄 재관측합니다 (snapshot 누적). 진행할까요?')) return;
    setBatchBusy(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }
      const r = await fetch('/api/admin/observe-batch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { showFlash('err', '인증이 만료되었습니다. 다시 로그인해 주세요.'); return; }
      if (r.status === 403) { showFlash('err', '관리자 권한이 필요합니다.'); return; }

      const j = await r.json();
      if (!j.ok) {
        showFlash('err', `batch 실패: ${j.error}${j.detail ? ` — ${j.detail}` : ''}`);
      } else {
        const b = j.breakdown || {};
        showFlash('ok', `batch 완료 — ${j.inserted_count}건 · ${j.observed_date} · alive ${b.alive ?? 0} / fossil ${b.fossil ?? 0} / other ${b.other ?? 0}`);
        await load();
      }
    } catch (e) {
      showFlash('err', `네트워크 에러: ${e.message}`);
    } finally {
      setBatchBusy(false);
    }
  }, [batchBusy, load, getToken, router]);

  const Gate = ({ children }) => (
    <AdminLayout current="/admin/observations" theme="dark">
      <PageHead title="관측 목록" version="v0.6" sub="발행 전체 대상 · 최근 N건으로 자르지 않는다 (DEC-016)" />
      {children}
    </AdminLayout>
  );
  if (authState === 'checking' || authLoading) return <Gate><div>인증 확인 중…</div></Gate>;
  if (authState === 'unauth' || authState === 'non-owner') return <Gate><div>로그인 페이지로 이동 중…</div></Gate>;
  if (loading && !data) return <Gate><div>로딩 중…</div></Gate>;
  if (err && !data) return <Gate><ErrBox>에러: {err}</ErrBox></Gate>;
  if (!data) return null;

  const { summary, rows, observed_at, page: pg, industries = [], scope } = data;
  const anyBusy = busyId !== null || batchBusy;
  const totalPages = pg?.total_pages || 1;
  const cur = pg?.page || 1;

  return (
    <AdminLayout current="/admin/observations" theme="dark">
      <PageHead
        title="관측 목록"
        version="v0.6"
        sub={`발행 전체 ${summary.total_posts}건 대상 · 관측 시각 ${fmtDateTime(observed_at)}`}
        right={<>
          <Btn variant="ok" onClick={onBatchObserve} disabled={anyBusy} title="전체 발행 1행씩 snapshot 누적">
            {batchBusy ? '● batch 중…' : '▶ batch observe all'}
          </Btn>
          <Btn onClick={load} disabled={anyBusy}>↻ 새로고침</Btn>
        </>}
      />

      {flash && <div style={flash.type === 'ok' ? S.flashOk : S.flashErr}>{flash.msg}</div>}
      {err && <ErrBox>에러: {err}</ErrBox>}

      <StatRow>
        <Stat label="전체 발행" value={summary.total_posts} />
        <Stat label="관측됨" value={summary.observed_count} />
        <Stat label="생존" value={summary.alive_count} tone="ok" />
        <Stat label="보합" value={summary.fossil_count} tone="warn" />
        <Stat label="미관측" value={summary.unobserved_count} />
      </StatRow>

      {/* ── 필터 바 ── */}
      <div style={S.filterBar}>
        <div style={S.tabRow}>
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => applyFilter(() => setStatus(t.key))}
              style={status === t.key ? S.tabOn : S.tab}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={S.ctrlRow}>
          <select value={sort} onChange={(e) => applyFilter(() => setSort(e.target.value))} style={S.select}>
            {SORT_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>

          <select value={industry} onChange={(e) => applyFilter(() => setIndustry(e.target.value))} style={S.select}>
            <option value="">업종 전체</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>

          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyFilter(() => setQ(qInput)); }}
            placeholder="제목 · 키워드 · 지역 · pid 검색"
            style={S.input}
          />
          <Btn size="sm" onClick={() => applyFilter(() => setQ(qInput))} disabled={anyBusy}>조회</Btn>
          {(q || industry || status !== 'all' || sort !== 'recent') && (
            <Btn
              size="sm"
              onClick={() => applyFilter(() => { setQ(''); setQInput(''); setIndustry(''); setStatus('all'); setSort('recent'); })}
              disabled={anyBusy}
            >
              초기화
            </Btn>
          )}

          <span style={S.spacer} />

          <select value={size} onChange={(e) => applyFilter(() => setSize(Number(e.target.value)))} style={S.select}>
            {[50, 100, 200].map((n) => <option key={n} value={n}>{n}건씩</option>)}
          </select>
        </div>
      </div>

      <div style={S.resultLine}>
        {pg?.total ?? 0}건 · {cur} / {totalPages} 페이지
        {loading && <span style={S.loadingTag}>불러오는 중…</span>}
      </div>

      <Table minWidth={1180}>
        <thead>
          <tr>
            <Th>제목</Th>
            <Th align="right">publish_id</Th>
            <Th>상태</Th>
            <Th align="right">순위</Th>
            <Th align="right">관측</Th>
            <Th>키워드</Th>
            <Th align="right">경과일</Th>
            <Th>최근 관측</Th>
            <Th>액션</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={9} style={S.tdEmpty}>조건에 해당하는 글이 없습니다.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.publish_id}>
              <Td style={S.tdTitle} title={r.title || ''}>
                {r.title || <span style={S.muted}>(제목 없음)</span>}
                {r.industry && <span style={S.tagInline}>{r.industry}</span>}
              </Td>
              <Td align="right" mono style={{ color: T.textMuted }}>{r.publish_id}</Td>
              <Td>{renderAliveBadge(r.alive_status)}</Td>
              <Td align="right" mono><RankCell r={r} /></Td>
              <Td align="right" mono style={{ color: T.textMuted }} title={`관리자 ${r.obs_admin_count} · 사용자 ${r.obs_user_count}`}>
                {r.obs_total > 0
                  ? <>{r.obs_admin_count}<span style={S.slash}>/</span><span style={{ color: T.info }}>{r.obs_user_count}</span></>
                  : <Dash />}
              </Td>
              <Td>
                {r.observed_keyword
                  ? <>{r.observed_keyword}{r.keyword_rank_type && <span style={S.tagInline}>{r.keyword_rank_type}</span>}</>
                  : <Dash />}
              </Td>
              <Td align="right" mono>{r.days_since_publish ?? <Dash />}</Td>
              <Td style={{ color: T.textMuted }}>
                {r.latest_observed_at
                  ? fmtDate(r.latest_observed_at)
                  : (r.user_latest_at ? <span style={{ color: T.info }}>{fmtDate(r.user_latest_at)}</span> : <span style={S.muted}>미관측</span>)}
              </Td>
              <Td>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn size="sm" variant="ok" onClick={() => onQuickObserve(r.publish_id, 'alive')} disabled={anyBusy}
                    title="이 글이 현재 살아있음(노출 유지)으로 1건 관측 추가 → survival 계산에 반영">
                    {busyId === r.publish_id ? '…' : '+ 생존'}
                  </Btn>
                  <Btn size="sm" variant="warn" onClick={() => onQuickObserve(r.publish_id, 'fossil')} disabled={anyBusy}
                    title="이 글이 화석화(노출 소멸/하락)됨으로 1건 관측 추가">
                    {busyId === r.publish_id ? '…' : '+ 보합'}
                  </Btn>
                  <Btn size="sm" onClick={() => setSelId(r.publish_id)} disabled={anyBusy}
                    title="관측 상세 · 순위 입력">
                    관측
                  </Btn>
                  <Btn size="sm" onClick={() => router.push(`/admin/publish?id=${r.publish_id}`)} disabled={anyBusy}
                    title="발행 관리(운영) 화면으로 이동 — URL·발행상태">
                    발행
                  </Btn>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ── 페이지네이션 ── */}
      <div style={S.pager}>
        <Btn size="sm" onClick={() => setPage(1)} disabled={cur <= 1 || loading}>« 처음</Btn>
        <Btn size="sm" onClick={() => setPage(cur - 1)} disabled={cur <= 1 || loading}>‹ 이전</Btn>
        <span style={S.pagerNow}>{cur} / {totalPages}</span>
        <Btn size="sm" onClick={() => setPage(cur + 1)} disabled={cur >= totalPages || loading}>다음 ›</Btn>
        <Btn size="sm" onClick={() => setPage(totalPages)} disabled={cur >= totalPages || loading}>마지막 »</Btn>
      </div>

      <div style={footNoteStyle}>
        ※ 순위 = 대표값 1개. 관리자 관측이 있으면 그 값(흰색), 없을 때만 사용자 등록값(파랑). 두 축을 평균내지 않는다 (DEC-006).
        <br />
        ※ 「밖」 = 관측했으나 순위권 밖. 「-」 = 미관측. 관측 컬럼은 관리자/사용자 건수.
        <br />
        ※ baseline(생성) 행은 published(URL 등록) 행에 흡수. 짝 없는 baseline 은 잔류
        {scope ? ` — 원본 ${scope.source_rows}행 → 병합 ${scope.merged_rows}행 (흡수 ${scope.absorbed})` : ''}.
        <br />
        ※ 관측 범위는 발행 전체다. 페이지 분할은 표시 수단일 뿐 관측 대상을 자르지 않는다 (DEC-016).
      </div>

      {/* ── [세션84] 관측 드로어 — 관리자 관측의 유일한 입력 화면 ── */}
      {selId != null && (
        <ObservePanel
          row={rows.find((r) => r.publish_id === selId) || null}
          publishId={selId}
          detail={detail}
          loading={detailLoading}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={saveObservation}
          onClose={() => setSelId(null)}
        />
      )}
    </AdminLayout>
  );
}

// ── [세션84] 관측 패널 ────────────────────────────────────────────────────
// Publish 에 있던 관측 입력을 이 화면으로 옮긴 것. 로직은 그대로 두고 배치만 바꾼다.
//   상단부터: 검색 → 현재상태/변화 → 순위입력 → 노출체크 → 저장 → Timeline (관측 동선 순서)
function ObservePanel({ row, publishId, detail, loading, form, setForm, saving, onSave, onClose }) {
  const links = buildNaverLinks(row);
  // [STEP 3] 검색결과에서 찾을 대상. SoT=naver_post_url, 여기서는 파싱 파생값만 쓴다(DB 저장 0).
  //   식별 근거는 회원 일반정보가 아니라 '바로 그 발행글' → row.naver_post_url 우선.
  const naverPost = extractNaverPost(row?.naver_post_url);
  const timeline = detail?.timeline || [];
  const userRanks = detail?.user_ranks || [];
  const snapshot = detail?.snapshot || null;
  const cur = timeline[0] || null;
  const prev = timeline[1] || null;
  const rd = (cur && cur.rank_detail) || {};
  const prd = (prev && prev.rank_detail) || {};
  const hasDetail = Object.keys(rd).length > 0 || Object.keys(prd).length > 0;
  const trend = cur ? calcTrend(cur.observed_rank, prev ? prev.observed_rank : undefined) : null;

  const setRank = (k, v) => setForm((f) => ({ ...f, rank_detail: { ...f.rank_detail, [k]: v } }));
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }));
  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSave(row);
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      <div style={S.backdrop} onClick={onClose} />
      <aside style={S.drawer} onKeyDown={onKeyDown}>
        <div style={S.dHead}>
          <div style={{ minWidth: 0 }}>
            <div style={S.dPid}>#{publishId}{row?.industry ? ` · ${row.industry}` : ''}</div>
            <div style={S.dTitle} title={row?.title || ''}>{row?.title || '(제목 없음)'}</div>
          </div>
          <Btn size="sm" onClick={onClose}>닫기 ✕</Btn>
        </div>

        {loading && <div style={S.dLoading}>불러오는 중…</div>}

        {/* 1. 검색 — 순위를 보려면 먼저 열어야 한다 */}
        {links && (
          <div style={S.dCard}>
            <div style={S.dCardHead}>검색어 <strong style={{ color: T.text }}>{links.core}</strong></div>
            <div style={S.dRow}>
              <Btn size="sm" variant="ok"
                onClick={() => [links.core_related, links.review_related, links.full_related].forEach((u) => window.open(u, '_blank'))}>
                🔍 3층 동시 열기
              </Btn>
              <a href={links.core_related} target="_blank" rel="noreferrer" style={S.dLink}>기본</a>
              <a href={links.review_related} target="_blank" rel="noreferrer" style={S.dLink}>후기</a>
              <a href={links.full_related} target="_blank" rel="noreferrer" style={S.dLink}>제목</a>
            </div>
            {naverPost && (
              <div style={S.dRow}>
                <span style={S.dFindLabel}>찾을 블로그</span>
                <strong style={S.dFindVal}>{naverPost.blogId}</strong>
                {naverPost.postId && (
                  <>
                    <span style={S.dFindLabel}>글 번호</span>
                    <strong style={S.dFindVal}>{naverPost.postId}</strong>
                  </>
                )}
              </div>
            )}
            {row?.naver_post_url && (
              <a href={row.naver_post_url} target="_blank" rel="noreferrer" style={S.dUrl}>{row.naver_post_url}</a>
            )}
          </div>
        )}

        {/* 2. 현재 상태 + 6축 변화 (근거) */}
        <div style={S.dCard}>
          <div style={S.dRow}>
            <span style={{ color: T.textMuted, fontSize: 11 }}>현재 상태</span>
            {cur?.alive_status && renderAliveBadge(cur.alive_status)}
            {cur?.observed_rank != null && <strong style={{ fontSize: 15 }}>대표 {cur.observed_rank}위</strong>}
            {trend && <span style={{ color: trend.color, fontSize: 12 }}>{trend.icon} {trend.label}</span>}
            <span style={S.spacer} />
            <span style={{ color: T.textFaint, fontSize: 11 }}>
              최근 관측 {cur ? fmtDateTime(cur.recorded_at) : '—'} · 관측 {timeline.length}회
            </span>
          </div>
          {snapshot && (
            <div style={{ ...S.dRow, color: T.textMuted, fontSize: 11 }}>
              first_seen {snapshot.first_seen_at ? fmtDate(snapshot.first_seen_at) : '—'} ·
              latest_alive {snapshot.latest_alive_at ? fmtDate(snapshot.latest_alive_at) : '—'} ·
              survival {snapshot.survival_hours ?? '—'} h
            </div>
          )}
          {hasDetail && (
            <div style={S.rankGrid}>
              {RANK_GROUPS.map((g) => (
                <div key={g.type} style={S.rankCol}>
                  <div style={S.rankColHead}>{g.label}</div>
                  {axesOf(g).map((r2) => {
                    const d = axisDelta(rd[r2.key], prd[r2.key]);
                    return (
                      <div key={r2.key} style={S.rankRow}>
                        <span style={S.rankAxis}>{r2.axis}</span>
                        <span style={S.deltaCell}>
                          {d == null ? <span style={{ color: T.textFaint }}>—</span>
                            : d.noPrev ? <><strong>{d.c}위</strong><span style={S.noPrev}> 직전기록 없음</span></>
                            : <>
                                <span style={{ color: T.textFaint }}>{d.p ?? '밖'}</span>
                                <span style={{ color: T.textFaint }}> → </span>
                                <strong>{d.c ?? '밖'}</strong>
                                {d.trend && <span style={{ color: d.trend.color }}> {d.trend.icon}{d.diff || ''}</span>}
                              </>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. 관측 입력 */}
        <div style={S.dCard}>
          <div style={S.dRow}>
            <select value={form.check_cycle} onChange={(e) => setForm((f) => ({ ...f, check_cycle: e.target.value }))} style={S.select}>
              {CYCLE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.alive_status} onChange={(e) => setForm((f) => ({ ...f, alive_status: e.target.value }))} style={S.select}>
              {ALIVE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>

          <div style={S.rankGridLabel}>
            순위 입력 <span style={{ color: T.textFaint, fontWeight: 400 }}>(검색 후 보이는 칸만 / 빈칸 = 순위 밖)</span>
          </div>
          <div style={S.rankGrid}>
            {RANK_GROUPS.map((g) => (
              <div key={g.type} style={S.rankCol}>
                <div style={S.rankColHead}>{g.label}</div>
                {axesOf(g).map((r2) => (
                  <div key={r2.key} style={S.rankRow}>
                    <span style={S.rankAxis}>{r2.axis}</span>
                    <input type="number" min="1" inputMode="numeric" placeholder="—"
                      value={form.rank_detail[r2.key]}
                      onChange={(e) => setRank(r2.key, e.target.value)}
                      style={S.rankInput} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={S.subLabel}>노출 체크 (보조)</div>
          <div style={S.dRow}>
            <ToggleBtn label="VIEW" on={form.view_ok} onClick={() => toggle('view_ok')} />
            <ToggleBtn label="관련도" on={form.related_ok} onClick={() => toggle('related_ok')} />
            <ToggleBtn label="최신순" on={form.recent_ok} onClick={() => toggle('recent_ok')} />
            <ToggleBtn label="썸네일" on={form.thumbnail_ok} onClick={() => toggle('thumbnail_ok')} />
          </div>

          <input type="text" placeholder="memo (선택)" value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} style={S.memoInput} />

          <button onClick={() => onSave(row)} disabled={saving} style={S.saveBtn}>
            {saving ? '저장중…' : '저장 (Ctrl+Enter)'}
          </button>
        </div>

        {/* 4. Timeline — 관리자 + 사용자 통합(출처 배지) */}
        <div style={S.dCard}>
          <div style={S.dCardHead}>
            Timeline ({timeline.length + userRanks.length})
            <span style={{ color: T.textFaint, marginLeft: 6 }}>관리자 {timeline.length} · 사용자 {userRanks.length}</span>
          </div>
          {timeline.length + userRanks.length === 0 ? (
            <div style={{ color: T.textFaint, fontSize: 12.5, padding: 8 }}>no observations</div>
          ) : mergeTimeline(timeline, userRanks).map((t) => {
            const isUser = t.source === 'user';
            const tr = isUser ? null : calcTrend(t.observed_rank, t._prevRank);
            return (
              <div key={t.id} style={S.tlRow}>
                <div style={S.dRow}>
                  <span style={isUser ? S.badgeUser : S.badgeAdmin}>{isUser ? '👤 사용자' : '🛡 관리자'}</span>
                  {!isUser && t.check_cycle && <span style={S.tagInline}>{t.check_cycle}</span>}
                  <span style={{ color: T.textMuted, fontSize: 11.5 }}>{fmtDateTime(t.recorded_at)}</span>
                </div>
                <div style={{ fontSize: 12.5, marginTop: 3 }}>
                  {t.observed_rank != null
                    ? <strong>{isUser ? '관련도 ' : '대표 '}{t.observed_rank}위</strong>
                    : <span style={{ color: T.textMuted }}>순위 밖</span>}
                  {tr && <span style={{ color: tr.color, marginLeft: 6 }}>{tr.icon} {tr.label}</span>}
                  {!isUser && t.rank_detail && (
                    <span style={{ color: T.textMuted, marginLeft: 8 }}>{rankDetailSummary(t.rank_detail)}</span>
                  )}
                  {t.observed_keyword && <span style={{ color: T.textFaint, marginLeft: 8 }}>{t.observed_keyword}</span>}
                </div>
                {t.memo && <div style={{ color: T.textFaint, fontSize: 11.5, marginTop: 2 }}>{t.memo}</div>}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}

const ToggleBtn = ({ label, on, onClick }) => (
  <button onClick={onClick} style={on ? S.tglOn : S.tglOff}>{label} {on ? '✓' : '✕'}</button>
);

// 순위 셀 — 3단계 대표값. 숫자 색으로 출처를 구분한다(세션82 §4-2: 관측 화면의 숫자 컬럼은 건수가 아니라 상태여야 한다).
function RankCell({ r }) {
  if (!r.rep_source) return <Dash />;
  if (r.rep_out) return <span style={{ color: r.rep_source === 'user' ? T.info : T.textMuted }}>밖</span>;
  return (
    <span
      style={{ color: r.rep_source === 'user' ? T.info : T.text, fontWeight: 700 }}
      title={r.rep_source === 'user' ? '사용자 등록 순위' : '관리자 관측 순위'}
    >
      {r.rep_rank}
    </span>
  );
}

const S = {
  tdTitle: { maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdEmpty: { padding: '40px 16px', textAlign: 'center', color: T.textFaint },
  muted: { color: T.textFaint },
  slash: { color: T.textFaint, margin: '0 3px' },
  tagInline: {
    display: 'inline-block', marginLeft: 6, padding: '1px 6px',
    background: T.infoBg, color: T.info, borderRadius: 4, fontSize: 11,
  },
  filterBar: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '12px 14px', marginBottom: 12,
    background: T.surface || '#171a21',
    border: `1px solid ${T.border || '#232730'}`,
    borderRadius: T.radiusCard,
  },
  tabRow: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab: {
    fontSize: 12.5, color: T.textMuted, background: 'transparent',
    border: `1px solid ${T.border || '#232730'}`, borderRadius: 4,
    padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit',
  },
  tabOn: {
    fontSize: 12.5, color: '#fff', background: '#1d4ed8',
    border: '1px solid #3b82f6', borderRadius: 4,
    padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
  },
  ctrlRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  select: {
    fontSize: 12.5, color: T.text, background: '#0f1115',
    border: `1px solid ${T.border || '#232730'}`, borderRadius: 4,
    padding: '5px 8px', fontFamily: 'inherit',
  },
  input: {
    fontSize: 12.5, color: T.text, background: '#0f1115',
    border: `1px solid ${T.border || '#232730'}`, borderRadius: 4,
    padding: '5px 10px', minWidth: 240, fontFamily: 'inherit',
  },
  spacer: { flex: '1 1 auto' },
  resultLine: { fontSize: 12, color: T.textMuted, margin: '0 0 8px 2px' },
  loadingTag: { marginLeft: 10, color: T.textFaint },
  pager: { display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', margin: '14px 0 4px' },
  pagerNow: { fontSize: 12.5, color: T.textMuted, margin: '0 8px' },
  flashOk: {
    padding: '10px 14px', background: T.okBg, color: T.ok,
    borderRadius: T.radiusCard, marginBottom: T.sectionGap, fontSize: 13,
    border: '1px solid rgba(52,211,153,.35)',
  },
  // ── [세션84] 드로어 ──
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 40 },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '94vw', zIndex: 41,
    background: T.surface || '#171a21', borderLeft: `1px solid ${T.border || '#232730'}`,
    padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
  },
  dHead: { display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' },
  dPid: { fontSize: 11, color: T.textFaint, fontFamily: 'monospace' },
  dTitle: { fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.35 },
  dLoading: { fontSize: 12.5, color: T.textFaint },
  dCard: {
    background: '#0f1115', border: `1px solid ${T.border || '#232730'}`,
    borderRadius: T.radiusCard, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
  },
  dCardHead: { fontSize: 12, color: T.textMuted, fontWeight: 600 },
  dRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  dLink: { fontSize: 12, color: T.info, textDecoration: 'none', border: `1px solid ${T.border || '#232730'}`, borderRadius: 4, padding: '4px 9px' },
  dUrl: { fontSize: 11.5, color: T.info, wordBreak: 'break-all' },
  // [STEP 3] 관측 대상 식별 — 검색 버튼 바로 아래. OWNER 가 클릭 전에 읽는다.
  dFindLabel: { fontSize: 11, color: T.textMuted },
  dFindVal: { fontSize: 13.5, color: T.text, fontFamily: 'monospace', wordBreak: 'break-all' },
  rankGridLabel: { fontSize: 12, color: T.textMuted, fontWeight: 600, marginTop: 2 },
  rankGrid: { display: 'flex', gap: 8 },
  rankCol: { flex: 1, border: `1px solid ${T.border || '#232730'}`, borderRadius: 4, padding: 8 },
  rankColHead: { fontSize: 11.5, color: T.textMuted, textAlign: 'center', marginBottom: 6 },
  rankRow: { display: 'flex', gap: 6, alignItems: 'center' },
  rankAxis: { fontSize: 11, color: T.textFaint, width: 26 },
  rankInput: {
    flex: 1, width: '100%', minWidth: 0, textAlign: 'center', fontSize: 13,
    color: T.text, background: '#0b0d11', border: `1px solid ${T.border || '#232730'}`,
    borderRadius: 4, padding: '5px 4px', fontFamily: 'inherit',
  },
  deltaCell: { flex: 1, textAlign: 'center', fontSize: 12.5, color: T.text },
  noPrev: { fontSize: 10.5, color: T.textFaint },
  subLabel: { fontSize: 11, color: T.textFaint, marginTop: 2 },
  memoInput: {
    fontSize: 12.5, color: T.text, background: '#0b0d11',
    border: `1px solid ${T.border || '#232730'}`, borderRadius: 4, padding: '6px 10px', fontFamily: 'inherit',
  },
  saveBtn: {
    padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#fff',
    background: '#1d4ed8', border: '1px solid #3b82f6', borderRadius: 4,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  tglOn: {
    fontSize: 12, color: T.ok, background: T.okBg, border: '1px solid rgba(52,211,153,.35)',
    borderRadius: 4, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
  },
  tglOff: {
    fontSize: 12, color: T.textFaint, background: 'transparent',
    border: `1px solid ${T.border || '#232730'}`, borderRadius: 4,
    padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit',
  },
  tlRow: { padding: '7px 0', borderTop: `1px solid ${T.border || '#232730'}` },
  badgeAdmin: { fontSize: 10.5, color: T.textMuted, border: `1px solid ${T.border || '#232730'}`, borderRadius: 3, padding: '1px 5px' },
  badgeUser: { fontSize: 10.5, color: T.info, background: T.infoBg, borderRadius: 3, padding: '1px 5px' },
  flashErr: {
    padding: '10px 14px', background: T.dangerBg, color: T.danger,
    borderRadius: T.radiusCard, marginBottom: T.sectionGap, fontSize: 13,
    border: '1px solid rgba(248,113,113,.35)',
  },
};
