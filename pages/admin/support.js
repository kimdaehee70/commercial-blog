// pages/admin/support.js  v0.1 (세션96)
// 접수 게시판 통합 관리 — 게시판은 하나. kind 로만 구분한다.
//
// 화면 구조: 좌 목록 / 우 상세+답변. 모달로 답변을 받으면 여러 건을 연달아 처리할 때
//   매번 열고 닫는 동작이 끼어든다. 접수 처리는 '훑고 답하고 다음'이 기본 동선이라 2단 고정.
//
// members.js 와 같은 디자인 언어(adminTheme T / Btn / Table / Th / Td) 사용.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import {
  T, PageHead, StatRow, Stat, Btn, ErrBox, inputStyle,
} from '../../lib/adminTheme';
import {
  SUPPORT_KINDS, SUPPORT_KIND_LIST, SUPPORT_STATUS,
  kindLabel, kindColor, statusLabel, statusColor,
} from '../../lib/supportKinds';

export default function SupportPage() {
  const router = useRouter();
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);

  const [fKind, setFKind] = useState('all');
  const [fStatus, setFStatus] = useState('all');

  const [q, setQ] = useState('');

  const [selId, setSelId] = useState(null);
  const [draftReply, setDraftReply] = useState('');
  const [draftStatus, setDraftStatus] = useState('pending');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [delAsk, setDelAsk] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 검색은 클라이언트 필터. 서버는 kind/status 만 거른다(최대 200건 로드).
  //   내용·이메일·블로그명은 부분일치라 서버 왕복 없이 즉시 좁히는 편이 응대 속도에 맞다.
  const view = rows.filter((r) => {
    const k = q.trim().toLowerCase();
    if (!k) return true;
    return [r.content, r.title, r.account?.email, r.account?.display_name, r.account?.blog_account]
      .some((v) => String(v || '').toLowerCase().includes(k));
  });

  const selected = rows.find((r) => r.id === selId) || null;
  const selIdx = view.findIndex((r) => r.id === selId);
  const goRel = (d) => {
    const n = selIdx + d;
    if (n >= 0 && n < view.length) setSelId(view[n].id);
  };
  const dirty = selected
    ? draftReply !== (selected.admin_reply || '') || draftStatus !== selected.status
    : false;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const qs = new URLSearchParams({ kind: fKind, status: fStatus, limit: '200' });
      const r = await fetch(`/api/admin/support-list?${qs}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await r.json();

      if (r.status === 401) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      if (r.status === 403) throw new Error('관리자 권한이 필요합니다.');
      if (!j.ok) throw new Error(j.detail || j.error || 'load_failed');

      setRows(j.rows || []);
      setSummary(j.summary || null);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router, fKind, fStatus]);

  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') router.replace('/login');
  }, [authState, router]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  // 선택이 바뀌면 답변 초안을 서버값으로 되돌린다.
  //   이걸 빼면 A 회원 답변을 쓰다 B 를 눌렀을 때 남의 답변이 그대로 남는다.
  useEffect(() => {
    setDraftReply(selected?.admin_reply || '');
    setDraftStatus(selected?.status || 'pending');
    setSaved(false);
    setDelAsk(false);
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 저장 안내는 3초 뒤 스스로 사라진다. 남겨두면 다음 건에서 '이미 저장됨' 으로 오독된다.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  // 목록이 갱신됐는데 선택 건이 사라졌으면 선택 해제
  useEffect(() => {
    if (selId && !rows.some((r) => r.id === selId)) setSelId(null);
  }, [rows, selId]);

  // 답변과 상태를 한 번에 보낸다. 두 버튼으로 나누면 '답변만 쓰고 상태를 안 바꾼 건' 이 계속 쌓인다.
  async function save() {
    if (!selected) return;
    setSaving(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const body = { id: selected.id, admin_reply: draftReply, status: draftStatus };

      const r = await fetch('/api/admin/support-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || j.detail || j.error || 'save_failed');

      setRows((prev) => prev.map((x) => (x.id === j.request.id ? { ...x, ...j.request } : x)));
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  // 삭제는 되돌릴 수 없다 — 정상 문의는 '보관' 상태로 내리고, 여기는 테스트·스팸·중복 전용이다.
  async function doDelete() {
    if (!selected) return;
    setDeleting(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const r = await fetch('/api/admin/support-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids: [selected.id] }),
      });
      const j = await r.json();
      if (!j.ok && (j.failed || []).length > 0) throw new Error(j.failed[0].error);
      if (!j.ok && !j.deleted) throw new Error(j.detail || j.error || 'delete_failed');

      setRows((prev) => prev.filter((x) => x.id !== selected.id));
      setSelId(null);
      setDelAsk(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || authState === 'unknown') {
    return <AdminLayout current="/admin/support" theme="dark"><div style={S.empty}>확인 중…</div></AdminLayout>;
  }

  return (
    <AdminLayout current="/admin/support" theme="dark">
      <PageHead
        title="접수 관리"
        version="v0.1"
        sub="게시판 통합 — 업종신청 / 운영대행 / 타이틀 / 불편사항 / 기능제안. 답변 시 감사 로그 자동 기록."
        right={<Btn onClick={load}>↻ 새로고침</Btn>}
      />

      {summary && (
        <StatRow size="sm">
          <Stat size="sm" label="전체"     value={summary.total ?? 0} />
          <Stat size="sm" label="미처리"  value={summary.pending ?? 0} tone={summary.pending > 0 ? 'warn' : undefined} />
          <Stat size="sm" label={SUPPORT_STATUS.answered.label}  value={summary.answered ?? 0} tone="ok" />
          <Stat size="sm" label={SUPPORT_STATUS.completed.label} value={summary.completed ?? 0} />
        </StatRow>
      )}

      {/* 필터 — 종류 / 상태 2그룹 */}
      <div style={S.filterRow}>
        <Btn size="sm" active={fKind === 'all'} onClick={() => setFKind('all')}>전체</Btn>
        {SUPPORT_KIND_LIST.map((k) => (
          <Btn key={k} size="sm" active={fKind === k} onClick={() => setFKind(k)}>{SUPPORT_KINDS[k].label}</Btn>
        ))}
        <span style={S.sep} />
        <Btn size="sm" active={fStatus === 'all'} onClick={() => setFStatus('all')}>상태 전체</Btn>
        {Object.keys(SUPPORT_STATUS).map((s) => (
          <Btn key={s} size="sm" active={fStatus === s} onClick={() => setFStatus(s)}>{SUPPORT_STATUS[s].label}</Btn>
        ))}
        <span style={S.sep} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 이메일 · 블로그명 · 내용 검색"
          style={S.search}
        />
        {q && <Btn size="sm" onClick={() => setQ('')}>×</Btn>}
        <span style={S.count}>{q ? `${view.length} / ${rows.length}건` : `${rows.length}건`}</span>
      </div>

      {err && <ErrBox>오류: {err}</ErrBox>}

      <div style={S.split}>
        {/* 좌 — 목록 */}
        <div style={S.listCol}>
          {loading ? (
            <div style={S.empty}>불러오는 중…</div>
          ) : view.length === 0 ? (
            <div style={S.empty}>{q ? '검색 결과 없음' : '접수 없음'}</div>
          ) : (
            view.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelId(r.id)}
                style={{ ...S.item, ...(r.id === selId ? S.itemOn : null) }}
              >
                <div style={S.itemTop}>
                  <span style={{ ...S.kindTag, color: kindColor(r.kind), borderColor: kindColor(r.kind) }}>
                    {kindLabel(r.kind)}
                  </span>
                  <span style={{ ...S.statusTag, color: statusColor(r.status) }}>{statusLabel(r.status)}</span>
                  <span style={S.date}>{fmtDate(r.created_at)}</span>
                </div>
                <div style={S.itemWho}>{r.account?.email || `account #${r.account_id}`}</div>
                <div style={S.itemBody}>{oneLine(r.content)}</div>
              </div>
            ))
          )}
        </div>

        {/* 우 — 상세 + 답변 */}
        <div style={S.detailCol}>
          {!selected ? (
            <div style={S.empty}>왼쪽에서 접수를 선택하세요.</div>
          ) : (
            <>
              <div style={S.dHead}>
                <span style={{ ...S.kindTag, color: kindColor(selected.kind), borderColor: kindColor(selected.kind) }}>
                  {kindLabel(selected.kind)}
                </span>
                <span style={S.dTitle}>{selected.title}</span>
                <span style={S.navWrap}>
                  <Btn size="sm" disabled={selIdx <= 0} onClick={() => goRel(-1)}>◀ 이전</Btn>
                  <Btn size="sm" disabled={selIdx < 0 || selIdx >= view.length - 1} onClick={() => goRel(1)}>다음 ▶</Btn>
                  <span style={S.navPos}>{selIdx >= 0 ? `${selIdx + 1} / ${view.length}` : '—'}</span>
                </span>
              </div>

              <div style={S.metaBox}>
                <div><span style={S.metaK}>회원</span>{selected.account?.email || '—'}</div>
                <div><span style={S.metaK}>이름</span>{selected.account?.display_name || '—'}</div>
                <div><span style={S.metaK}>플랜</span>{selected.account?.plan || '—'}</div>
                <div><span style={S.metaK}>블로그</span>{selected.account?.blog_account || '(미연결)'}</div>
                <div><span style={S.metaK}>접수</span>{fmtDateTime(selected.created_at)}</div>
                <div><span style={S.metaK}>답변</span>{selected.answered_at ? fmtDateTime(selected.answered_at) : '—'}</div>
              </div>

              <div style={S.sectionLabel}>접수 내용</div>
              <div style={S.contentBox}>{selected.content}</div>

              <div style={S.sectionLabel}>관리자 답변</div>
              <textarea
                value={draftReply}
                onChange={(e) => setDraftReply(e.target.value)}
                placeholder="답변을 입력하세요. 저장하면 회원 마이페이지에 즉시 표시됩니다."
                style={S.replyBox}
              />

              <div style={S.sectionLabel}>상태</div>
              <div style={S.statusRow}>
                {Object.keys(SUPPORT_STATUS).map((s) => (
                  <label key={s} style={{ ...S.radio, color: draftStatus === s ? statusColor(s) : T.textMuted }}>
                    <input type="radio" name="support-status" checked={draftStatus === s}
                      onChange={() => setDraftStatus(s)} style={S.radioInput} />
                    {SUPPORT_STATUS[s].label}
                  </label>
                ))}
              </div>

              <div style={S.actions}>
                <Btn variant="primary" disabled={saving || !dirty} onClick={save}>
                  {saving ? '저장 중…' : '저장'}
                </Btn>
                {saved && <span style={S.savedNote}>저장됨</span>}
                {!saved && dirty && <span style={S.dirtyNote}>변경사항 있음</span>}
                <span style={{ flex: 1 }} />
                <Btn size="sm" variant="danger" disabled={saving || deleting} onClick={() => setDelAsk(true)}>
                  삭제
                </Btn>
              </div>

              {delAsk && (
                <div style={S.confirm}>
                  <div style={S.confirmTitle}>정말 삭제하시겠습니까?</div>
                  <div style={S.confirmBody}>
                    이 작업은 되돌릴 수 없습니다. 실제 고객 문의라면 삭제 대신 상태를 「보관」으로 바꾸세요.
                  </div>
                  <div style={S.confirmActions}>
                    <Btn size="sm" disabled={deleting} onClick={() => setDelAsk(false)}>취소</Btn>
                    <Btn size="sm" variant="danger" disabled={deleting} onClick={doDelete}>
                      {deleting ? '삭제 중…' : '삭제'}
                    </Btn>
                  </div>
                </div>
              )}

              <div style={S.logLabel}>처리이력</div>
              <div style={S.logBox}>
                <div><span style={S.logT}>{fmtDateTime(selected.created_at)}</span>접수</div>
                {selected.answered_at && (
                  <div><span style={S.logT}>{fmtDateTime(selected.answered_at)}</span>답변 등록</div>
                )}
                {selected.status === 'completed' && selected.updated_at && (
                  <div><span style={S.logT}>{fmtDateTime(selected.updated_at)}</span>처리완료</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function fmtDate(s) { return s ? s.slice(0, 10) : '—'; }
function fmtDateTime(s) { return s ? s.slice(0, 16).replace('T', ' ') : '—'; }
function oneLine(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 60)}…` : t || '—';
}

const S = {
  filterRow: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', marginBottom: T.sectionGap },
  sep: { width: 1, height: 18, background: T.border, margin: '0 10px' },
  count: { marginLeft: 'auto', fontSize: 12, color: T.textMuted },

  split: { display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  listCol: {
    flex: '1 1 380px', minWidth: 0, maxHeight: '70vh', overflowY: 'auto',
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard, background: T.surface,
  },
  detailCol: {
    flex: '1 1 460px', minWidth: 0,
    border: `1px solid ${T.border}`, borderRadius: T.radiusCard, background: T.surface, padding: 16,
  },

  item: { padding: '10px 12px', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' },
  itemOn: { background: 'rgba(96,165,250,0.10)' },
  itemTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  kindTag: { fontSize: 11, fontWeight: 700, border: '1px solid', borderRadius: 4, padding: '1px 6px' },
  statusTag: { fontSize: 11, fontWeight: 700 },
  date: { marginLeft: 'auto', fontSize: 11, color: T.textFaint, fontFamily: T.mono },
  itemWho: { fontSize: 12, color: T.textMuted, fontFamily: T.mono },
  itemBody: { fontSize: 12.5, color: T.textSoft, marginTop: 3 },

  dHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  dTitle: { fontSize: 16, fontWeight: 700, color: T.textStrong },
  metaBox: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '4px 16px',
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: '10px 12px', fontSize: 12, color: T.textSoft, marginBottom: 14,
  },
  metaK: { display: 'inline-block', width: 48, color: T.textFaint },

  sectionLabel: { fontSize: 12, fontWeight: 700, color: T.textMuted, margin: '0 0 6px' },
  contentBox: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: '12px 14px', fontSize: 13.5, lineHeight: 1.75, color: T.text,
    whiteSpace: 'pre-wrap', marginBottom: 16, maxHeight: 260, overflowY: 'auto',
  },
  replyBox: {
    ...inputStyle, width: '100%', minHeight: 140, resize: 'vertical',
    lineHeight: 1.7, fontSize: 13.5, boxSizing: 'border-box', marginBottom: 12,
  },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  savedNote: { fontSize: 12, color: T.ok, marginLeft: 2 },
  dirtyNote: { fontSize: 12, color: T.textFaint, marginLeft: 2 },

  search: {
    ...inputStyle, width: 220, padding: '5px 9px', fontSize: 12,
    boxSizing: 'border-box',
  },
  navWrap: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 },
  navPos: { fontSize: 11, color: T.textFaint, fontFamily: T.mono, minWidth: 46, textAlign: 'right' },

  statusRow: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 },
  radio: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  radioInput: { accentColor: '#60a5fa', cursor: 'pointer', margin: 0 },

  logLabel: { fontSize: 11.5, fontWeight: 700, color: T.textFaint, margin: '18px 0 5px' },

  confirm: {
    marginTop: 12, padding: '12px 14px', borderRadius: 8,
    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)',
  },
  confirmTitle: { fontSize: 13, fontWeight: 700, color: T.danger || '#f87171', marginBottom: 4 },
  confirmBody: { fontSize: 12, lineHeight: 1.7, color: T.textSoft, marginBottom: 10 },
  confirmActions: { display: 'flex', gap: 6 },  logBox: {
    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8,
    padding: '9px 12px', fontSize: 12, lineHeight: 1.9, color: T.textSoft,
  },
  logT: { display: 'inline-block', width: 118, color: T.textFaint, fontFamily: T.mono },

  empty: { padding: '40px 16px', textAlign: 'center', color: T.textFaint, fontSize: 13 },
};
