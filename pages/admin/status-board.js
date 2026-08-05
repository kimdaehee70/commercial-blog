// pages/admin/status-board.js
// 99차 v0.1: 상태판 프론트 신규
// - observations.js 토큰/가드 패턴 답습 (getSession → access_token, OWNER_UID 가드, Bearer 전파, 401/403 분기)
// - API: GET /api/admin/status-board?industry=dental (read 전용, 98차 검증 완료)
// - 스키마 정합 (api/admin/status-board.js 실파일 기준):
//     group = { group_key, key_parts, post_count, title_rank, body_rank, posts[] }
//     post  = { id, title, blog_account, title_axis:{related,recent}, body_axis:{...}, observed_at, alive_status, has_observation }
//   ※ 묶음 카드 = title_rank/body_rank (축별 그룹 최상위 1값). 펼친 글 = related/recent 분리 4값.
// - 미분류 회색 펼침 / demo 토글 / 자연어 라벨·추세 = 보류 (순위 숫자만)
//
// v0.3 (세션76) — 다크 전환 (축 ②-④)
//   흰 배경 + 회색 안내박스 + 흰 카드 → 콘솔 다크로 통일. 아코디언 카드 구조는 유지.
//   상단 요약(묶음/전체글/관측/생존/미분류)이 한 줄 텍스트로 뭉쳐 있던 것을 KPI 카드로 승격.
//   순위 색 규칙 유지: 1위=초록 강조 / 미노출=흐림. 계산·API·묶음 로직 무변경.
//
// v0.2 (세션76) — AdminLayout 이관. 표시 계층만 변경, 데이터·가드·API 무접촉.
//   · S.page(padding:'24px 32px') 안에 AdminNav를 넣어 바가 32px 들여쓰기되던 문제 제거.
//   · Shell(로딩/에러/인증확인)에도 동일 네비가 보이도록 AdminLayout으로 통일 — 상태 전환 시 상단 바 불변.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import { fmtDate } from '../../lib/adminUI';
import {
  T, PageHead, StatRow, Stat, Btn, Badge, ErrBox, Dash, footNoteStyle,
} from '../../lib/adminTheme';

const INDUSTRY = 'dental'; // 1차: 검증 완료 업종 고정 (CLUSTER_KEY_BY_INDUSTRY에 dental만 검증).

export default function StatusBoardPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [includeTest, setIncludeTest] = useState(false);
  const [openKey, setOpenKey] = useState(null);       // 펼친 묶음 group_key
  const [unclusteredOpen, setUnclusteredOpen] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const load = useCallback(async (withTest) => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const qs = new URLSearchParams({ industry: INDUSTRY });
      if (withTest) qs.set('include_test', '1');
      const r = await fetch(`/api/admin/status-board?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.status === 401) {
        setErr('인증이 만료되었습니다. 다시 로그인해 주세요.');
        return;
      }
      if (r.status === 403) {
        setErr('관리자 권한이 필요합니다.');
        return;
      }

      const j = await r.json();
      if (!j.ok) setErr(j.error + (j.detail ? ` — ${j.detail}` : ''));
      else { setData(j); setErr(null); }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, router]);

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState, router]);

  // owner 확정 시에만 최초 로드 (기존 가드 effect의 load(false) 호출 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    load(false);
  }, [authState, session, load]);

  const onToggleTest = useCallback(() => {
    const next = !includeTest;
    setIncludeTest(next);
    setOpenKey(null);
    setUnclusteredOpen(false);
    load(next);
  }, [includeTest, load]);

  if (authState === 'checking' || authLoading) return <Shell><div>인증 확인 중…</div></Shell>;
  if (authState === 'unauth' || authState === 'non-owner') return <Shell><div>로그인 페이지로 이동 중…</div></Shell>;
  if (loading) return <Shell><div>로딩 중…</div></Shell>;
  if (err) return <Shell><ErrBox>에러: {err}</ErrBox></Shell>;
  if (!data) return null;

  const { groups = [], unclustered = [], meta = {} } = data;

  return (
    <AdminLayout current="/admin/status-board" theme="dark">
      <PageHead
        title="상태판"
        version="v0.1"
        sub={<>
          묶음별 검색 순위 · 생존 현황
          {' · '}업종 <Badge tone="accent">{data.industry || INDUSTRY}</Badge>
          {' · '}추세 {meta.trend || 'deferred'}
          {Array.isArray(meta.cluster_keys) && meta.cluster_keys.length > 0 && (
            <span style={S.keyHint}> · 묶음키: {meta.cluster_keys.join(' · ')}</span>
          )}
        </>}
        right={<>
          <label style={S.testToggle}>
            <input type="checkbox" checked={includeTest} onChange={onToggleTest} />
            <span style={{ marginLeft: 6 }}>demo/test 포함</span>
          </label>
          <Btn onClick={() => load(includeTest)}>↻ 새로고침</Btn>
        </>}
      />

      {/* 세션76: 한 줄 텍스트로 뭉쳐 있던 요약을 KPI 로. tone 은 기본/ok 만(4색 규칙). */}
      <StatRow>
        <Stat label="묶음" value={meta.group_count ?? groups.length} />
        <Stat label="전체 글" value={meta.total_posts ?? '—'} />
        <Stat label="관측" value={meta.observed_count ?? '—'} />
        <Stat label="생존" value={meta.alive_count ?? '—'} tone="ok" />
        <Stat label="미분류" value={meta.unclustered_count ?? unclustered.length} />
      </StatRow>

      {/* observed≠alive 안내 — 표시 전용 */}
      {/* 세션76: 한 줄로 이어지던 안내를 키워드 단위로 끊어 읽게. 내용 무변경. */}
      <div style={S.dualNote}>
        <div style={S.noteLine}>
          <Badge tone="muted">관측</Badge>
          <span>순위 등 1건이라도 관측된 글 수</span>
        </div>
        <div style={S.noteLine}>
          <Badge tone="ok">생존</Badge>
          <span>최신 관측이 alive 로 판정된 글 수</span>
        </div>
        <div style={S.noteTail}>
          둘은 다른 지표입니다 (관측됐다고 생존은 아님). 생존/보합 판정은 발행 관측 현황에서 수동 기록.
        </div>
      </div>

      {/* 축 범례 — 운영자 해설 (표시 전용, 계산 무관) */}
      <div style={S.legendBox}>
        <div style={S.legendRow}>
          <span style={S.legChipTitle}>제목축 = 검색 제목 순위</span>
          <span style={S.legChipBody}>본문축 = 검색 본문 순위</span>
          <span style={S.legRule}>
            <b style={{ color: T.ok }}>숫자 작을수록 좋음</b> (1위가 최고)
            {' · '}<b>—</b> = 노출 없음
          </span>
        </div>
        <div style={S.legendRow}>
          <span style={S.legReadHint}>
            펼친 글의 두 숫자 = <b>관련도순 / 최신순</b> (예: <code style={S.legCode}>3/5</code> → 관련도 3위, 최신 5위)
          </span>
          <span style={S.legReadHint}>
            묶음 카드 숫자 = 그 묶음에서 <b>가장 잘 뜬 글 기준</b>(최상위)
          </span>
        </div>
      </div>

      {/* 묶음 카드 리스트 */}
      <div style={S.cardList}>
        {groups.length === 0 && (
          <div style={S.emptyCard}>표시할 묶음이 없습니다.</div>
        )}
        {groups.map((g) => {
          const isOpen = openKey === g.group_key;
          return (
            <div key={g.group_key} style={S.card}>
              <div
                style={S.cardHead}
                onClick={() => setOpenKey(isOpen ? null : g.group_key)}
                role="button"
              >
                <div style={S.cardTitle}>
                  {g.group_key} <span style={S.count}>({g.post_count})</span>
                </div>
                <div style={S.axisRow}>
                  <GroupSurvivalCell days={g.group_survival_days} alive={g.group_alive_count} observed={g.group_observed_count} />
                  <AxisCell label="제목 순위" v={g.title_rank} />
                  <AxisCell label="본문 순위" v={g.body_rank} />
                  <span style={S.caret}>{isOpen ? '▾' : '▸'}</span>
                </div>
              </div>
              {isOpen && <PostList posts={g.posts} />}
            </div>
          );
        })}
      </div>

      {/* 미분류 — 최하단 회색 펼침 */}
      {unclustered.length > 0 && (
        <div style={S.unclusterWrap}>
          <div
            style={S.unclusterHead}
            onClick={() => setUnclusteredOpen(!unclusteredOpen)}
            role="button"
          >
            미분류 <span style={S.count}>({unclustered.length})</span>
            <span style={S.caret}>{unclusteredOpen ? '▾' : '▸'}</span>
          </div>
          {unclusteredOpen && <PostList posts={unclustered} />}
        </div>
      )}

      <div style={footNoteStyle}>
        ※ 순위는 네이버 검색 노출 위치(작을수록 상위, 1=최상위). 노출 안 되면 —.
        <br />
        ※ 제목 순위 = 검색결과 제목 기준 / 본문 순위 = 본문 기준. 각각 관련도순·최신순으로 분리 관측.
        <br />
        ※ 묶음 카드 = 그 묶음에서 가장 잘 뜬 글 기준. 펼치면 글별 관련도/최신 순위.
        <br />
        ※ 묶음키: region · treatment_name (런타임 조합). 추세(상승/하락)는 후속 — 현재 순위 스냅샷만 표시.
      </div>
    </AdminLayout>
  );
}

// 소속 글 목록 (묶음·미분류 공용)
function PostList({ posts }) {
  const list = posts || [];
  return (
    <div style={S.postList}>
      {list.length === 0 && <div style={S.postEmpty}>소속 글 데이터 없음</div>}
      {list.map((p, i) => (
        <div key={p.id ?? i} style={S.postRow}>
          <div style={S.postTitle} title={p.title || ''}>
            {p.title || <span style={S.muted}>(제목 없음)</span>}
          </div>
          <div style={S.postMeta}>
            <span style={S.acct}>{p.blog_account || '—'}</span>
            <span style={S.axisMini}>
              <span style={S.axisMiniLabel}>제목</span>{' '}
              <RankPair related={p.title_axis?.related} recent={p.title_axis?.recent} />
              {'  '}<span style={S.axisMiniLabel}>본문</span>{' '}
              <RankPair related={p.body_axis?.related} recent={p.body_axis?.recent} />
            </span>
            <span style={S.survival}>{fmtSurvival(p.survival_days)}</span>
            <span style={S.obs}>
              {p.observed_at ? fmtDate(p.observed_at) : '미관측'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// 묶음 카드 헤더 — 그룹 대표 생존력 (순서4): survival 최댓값 + 관측/alive 글 수
// 세션76: 지금은 '유지' 단일 상태라 초록 고정. 상승/하락/보합이 생기면
//   adminTheme 의 STATUS_TONE / Badge tone 으로 분기할 것(여기서 hex 를 새로 만들지 말 것).
function GroupSurvivalCell({ days, alive, observed }) {
  return (
    <span style={S.survivalCell}>
      <span style={S.survivalVal}>{fmtSurvival(days)}</span>
      <span style={S.aliveMini}>관측 {observed ?? 0} · 생존 {alive ?? 0}</span>
    </span>
  );
}

// 묶음 카드 헤더 축 셀 — 그룹 대표 1값 (title_rank / body_rank)
// 표시 강화: 노출 시 'N위', 1위는 초록 강조, 미노출은 회색 '—'
function AxisCell({ label, v }) {
  const shown = !(v === null || v === undefined || v === '' || v === '-');
  const isTop = shown && Number(v) === 1;
  return (
    <span style={S.axisCell}>
      <span style={S.axisLabel}>{label}</span>
      <span style={{
        ...S.axisVal,
        color: !shown ? T.textFaint : (isTop ? T.ok : T.textStrong),
      }}>
        {shown ? `${v}위` : '—'}
      </span>
    </span>
  );
}

function fmtRank(v) {
  if (v === null || v === undefined || v === '' || v === '-') return '—';
  return String(v);
}

// 펼친 글의 관련도/최신 한 쌍을 운영자 언어로 표시.
//   예: "관련도 3위 / 최신 5위", 미노출은 "—", 1위는 초록 강조.
function RankPair({ related, recent }) {
  const fmt = (v) => {
    const ok = !(v === null || v === undefined || v === '' || v === '-');
    if (!ok) return { txt: '—', top: false, shown: false };
    return { txt: `${v}위`, top: Number(v) === 1, shown: true };
  };
  const rel = fmt(related);
  const rec = fmt(recent);
  const cell = (label, x) => (
    <span style={S.rankUnit}>
      <span style={S.rankUnitLabel}>{label}</span>
      <b style={{ color: !x.shown ? T.textFaint : (x.top ? T.ok : T.textSoft) }}>{x.txt}</b>
    </span>
  );
  return (
    <span style={S.rankPair}>
      {cell('관련도', rel)}
      <span style={S.rankSlash}>/</span>
      {cell('최신', rec)}
    </span>
  );
}

function fmtSurvival(v) {
  if (v === null || v === undefined) return '유지 —';
  return `유지 ${v}일`;
}

// 로딩/에러/인증확인 상태. 본문만 다르고 상단 바는 정상 화면과 100% 동일해야 한다.
function Shell({ children }) {
  return (
    <AdminLayout current="/admin/status-board" theme="dark">
      <PageHead title="상태판" version="v0.1" sub="묶음별 검색 순위 · 생존 현황" />
      {children}
    </AdminLayout>
  );
}

const S = {
  // 세션76 v0.3: 공통화된 키(headerRow/h1/ver/sub/indBadge/actionRow/refreshBtn/err/footer)는 삭제.
  //   → PageHead / Btn / Badge / ErrBox / footNoteStyle (lib/adminTheme.js) 소유.
  //   남은 것은 상태판 고유의 아코디언 카드·순위 셀뿐. 색은 전부 T 참조.
  keyHint: { color: T.textFaint },
  testToggle: {
    fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center',
    cursor: 'pointer', userSelect: 'none',
  },

  // 안내/범례 — 카드와 구분되도록 표면은 한 단계 낮게.
  dualNote: {
    fontSize: 12, color: T.textMuted, background: T.surfaceAlt,
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    padding: '12px 14px', marginBottom: T.sectionGap, lineHeight: 1.6,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  noteLine: { display: 'flex', alignItems: 'center', gap: 8 },
  noteTail: { fontSize: 11.5, color: T.textFaint, marginTop: 2 },
  legendBox: {
    marginBottom: T.sectionGap, padding: '12px 14px', background: T.surfaceAlt,
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  legendRow: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: T.textMuted },
  legChipTitle: { fontSize: 12, fontWeight: 700, color: T.info, background: T.infoBg, padding: '3px 10px', borderRadius: T.radius },
  legChipBody: { fontSize: 12, fontWeight: 700, color: T.warn, background: T.warnBg, padding: '3px 10px', borderRadius: T.radius },
  legRule: { fontSize: 12, color: T.textMuted },
  legReadHint: { fontSize: 12, color: T.textFaint },
  legCode: {
    fontFamily: T.mono, background: T.surface, border: `1px solid ${T.borderStrong}`,
    borderRadius: 3, padding: '1px 5px', fontSize: 11, color: T.text,
  },

  // 아코디언 카드
  cardList: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: { border: `1px solid ${T.border}`, borderRadius: T.radiusCard, overflow: 'hidden', background: T.surface },
  cardHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    // 세션76: 제목과 우측 지표 사이가 비어 보였다 → 좌우 패딩 축소로 밀도 확보.
    padding: '11px 14px', cursor: 'pointer', gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 700, color: T.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  count: { color: T.textMuted, fontWeight: 600, fontSize: 13 },
  axisRow: { display: 'flex', gap: 12, alignItems: 'center', flex: '0 0 auto' },
  survivalCell: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    minWidth: 64, paddingRight: 10, borderRight: `1px solid ${T.border}`,
  },
  survivalVal: { fontSize: 14, fontWeight: 700, color: T.ok, fontVariantNumeric: 'tabular-nums' },
  aliveMini: { fontSize: 10, color: T.textFaint },
  axisCell: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 56 },
  axisLabel: { fontSize: 10, color: T.textFaint },
  axisVal: { fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  caret: { fontSize: 13, color: T.textFaint, width: 14, textAlign: 'center' },

  // 펼친 글 목록 — 카드보다 한 단계 어둡게 해서 '안쪽'으로 읽히게.
  postList: { borderTop: `1px solid ${T.border}`, background: T.bg },
  postRow: { padding: '10px 16px', borderBottom: `1px solid ${T.borderRow}` },
  postTitle: { fontSize: 13, color: T.textSoft, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  postMeta: { display: 'flex', gap: 12, fontSize: 11, color: T.textMuted, flexWrap: 'wrap', alignItems: 'center' },
  acct: { color: T.textMuted, fontFamily: T.mono },
  axisMini: { fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  axisMiniLabel: { color: T.textFaint, fontWeight: 600 },
  rankPair: { display: 'inline-flex', alignItems: 'center', gap: 4 },
  rankUnit: { display: 'inline-flex', alignItems: 'baseline', gap: 2 },
  rankUnitLabel: { fontSize: 10, color: T.textFaint },
  rankSlash: { color: T.border, margin: '0 2px' },
  survival: { color: T.ok, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  obs: { marginLeft: 'auto', color: T.textFaint },
  postEmpty: { padding: '12px 16px', fontSize: 12, color: T.textFaint },

  unclusterWrap: {
    marginTop: T.sectionGap, border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard, overflow: 'hidden', background: T.surfaceAlt,
  },
  unclusterHead: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
    cursor: 'pointer', color: T.textMuted, fontWeight: 600, fontSize: 13,
  },
  emptyCard: {
    padding: 28, textAlign: 'center', color: T.textFaint,
    border: `1px dashed ${T.border}`, borderRadius: T.radiusCard,
  },
  muted: { color: T.textFaint },
};
