// pages/admin/accounts-usage.js
// 세션76 v0.6 — 다크 팔레트 기준 페이지(축 ②의 SoT).
//   · 색상 hex 직접 사용 전면 제거 → lib/adminTheme.js 의 T 토큰만 사용.
//   · 로컬 SummaryBox / Th / Td 삭제 → adminTheme 의 Stat / Th / Td 로 대체.
//   · quotaState / ratioColor 의 임계(0.8/1.0)·key·label 은 무변경. 색값만 토큰화.
//   · 이 페이지 확정 후 발행 → 관측 → 상태판 → 시스템 순으로 동일 적용.
//   API·DB 무접촉.
// 세션73 v0.5: 4-tier 정합 + quota 축 표기 정정 (표시계층만)
//   · PLAN_OPTIONS / PLAN_LABEL 에 standard 추가 — 기존 standard 계정이 select 미스매치로
//     빈 값 표시되고, 보드에서 스탠다드 지정이 불가하던 문제 해소. (accounts.js v0.6과 동일 축)
//   · API v0.6 전환 반영 — monthly_posts / total_posts = '생성(baseline)' 기준.
//     라벨을 '발행' → '생성'으로 정정. quota 차단 기준과 화면 문구 일치.
//   · '실발행' 컬럼/요약 신설(published_posts / published_total_all) — 관측 전용, quota 무관.
//   · quotaState / 임계 / 색상 / 차단 로직 무변경.
//
// [표시 한글화] 운영 UI — 표시 라벨만 한글화 (DB/API/option value/onChange 인자 전부 무변경)
//   · 원칙: 업무용어=한글 / 식별자(id·email·API경로)=영문 유지
//
// 111차 v0.4: quota 경고 동선 — 상태판(클라 표시계층만, 서버/API/plans 무수정)
// - quotaState() 헬퍼: 기존 ratioColor 임계(0.8/1.0) 승격. 새 임계 없음.
//   owner = quota 차단 예외 → '예외' 라벨(분포 카운트 제외).
//   <0.8 정상 / 0.8~0.99 임박 / >=1.0 초과 / 초과+active+owner아님 = 차단예정.
// - 'quota 초과 계정' 박스 = owner 제외 클라 재계산.
// - 실제 차단 주체는 /api/publish/check-quota(미들웨어). 상태판은 표시만.
//
// 55차 v0.3: OWNER_UID 로컬 제거 + Bearer 전파(2곳) + non-owner redirect
// 50차 v0.2: plan/status 인라인 편집
// 47차 v0.1 base

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import {
  T, PageHead, StatRow, Stat, Table, Th, Td, Btn, Badge, Dash,
  selectStyle, footNoteStyle,
} from '../../lib/adminTheme';

const PLAN_OPTIONS = ['free', 'basic', 'standard', 'pro'];
const STATUS_OPTIONS = ['active', 'suspended'];

// ── 표시 라벨 한글화 (표시 전용 — DB/API/option value/onChange 인자 전부 무변경) ──
const PLAN_LABEL   = { free: '무료', basic: '베이직', standard: '스탠다드', pro: '프로' };
const STATUS_LABEL = { active: '활성', pending: '대기', suspended: '정지' };
const planLabel   = (v) => PLAN_LABEL[v]   || v || '-';
const statusLabel = (v) => STATUS_LABEL[v] || v || '-';

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { hour12: false });
}

function fmtRelative(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR');
}

// 임계 무변경. 값만 다크 팔레트로.
function ratioColor(r) {
  if (r >= 1) return T.danger;
  if (r >= 0.8) return T.warn;
  if (r >= 0.5) return T.warn;
  return T.ok;
}

// quota 상태 판정 — 기존 ratioColor 임계(0.8/1.0) 승격. 새 임계 없음.
// 세션76: 임계(0.8/1.0)·key·label 무변경. color/bg 하드코딩 hex → tone 으로 교체(색은 adminTheme T 소유).
function quotaState(r, over, status, isOwner) {
  if (isOwner) {
    return { key: 'exempt', label: '예외', tone: 'info', strong: false };
  }
  const ratio = Number(r) || 0;
  const isOver = !!over || ratio >= 1;
  if (isOver) {
    if (status === 'active') {
      return { key: 'block', label: '차단예정', tone: 'danger', strong: true };
    }
    return { key: 'over', label: '초과', tone: 'danger', strong: false };
  }
  if (ratio >= 0.8) {
    return { key: 'near', label: '임박', tone: 'warn', strong: false };
  }
  return { key: 'ok', label: '정상', tone: 'ok', strong: false };
}

export default function AccountsUsage() {
  const router = useRouter();
  const { authState, session, loading: authLoading } = useAdminGuard();
  const requesterUid = session?.user?.id || null;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadData = async (uid) => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const r = await fetch(`/api/admin/accounts-usage?uid=${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (r.status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      }
      if (r.status === 403) {
        throw new Error('관리자 권한이 필요합니다.');
      }

      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'FETCH_FAILED');
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState]);

  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      await loadData(session.user.id);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authState, session]);

  const handleUpdate = async (target_id, field, value, isOwnerRow) => {
    if (isOwnerRow) {
      alert('owner 계정은 자해 방지를 위해 읽기 전용입니다.');
      return;
    }
    setSavingId(target_id);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const r = await fetch('/api/admin/update-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requester_uid: requesterUid,
          target_id,
          [field]: value,
        }),
      });

      if (r.status === 401) {
        throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      }
      if (r.status === 403) {
        throw new Error('관리자 권한이 필요합니다.');
      }

      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'UPDATE_FAILED');
      await loadData(requesterUid);
    } catch (e) {
      alert(`변경 실패: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  };

  // 세션76: 게이트/로딩/에러 상태에서도 상단 바 동일. 상태 전환 시 네비가 사라지지 않는다.
  const Gate = ({ children }) => (
    <AdminLayout current="/admin/accounts-usage" theme="dark">{children}</AdminLayout>
  );
  if (authState === 'checking' || authLoading) {
    return <Gate><div style={{ color: T.textMuted }}>인증 확인 중...</div></Gate>;
  }
  if (authState === 'unauth' || authState === 'non-owner') {
    return <Gate><div style={{ color: T.textMuted }}>로그인 페이지로 이동 중...</div></Gate>;
  }
  if (loading) {
    return <Gate><div style={{ color: T.textMuted }}>로딩 중...</div></Gate>;
  }
  if (error) {
    return (
      <Gate>
        <h2 style={{ color: T.danger, marginTop: 0, fontSize: 18 }}>오류</h2>
        <pre style={{ background: T.dangerBg, color: T.danger, padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap' }}>{error}</pre>
      </Gate>
    );
  }

  const { summary, rows, observed_at } = data;

  const stateCounts = rows.reduce((acc, r) => {
    const s = quotaState(r.quota_ratio, r.over_quota, r.status, r.role === 'owner').key;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const cntOk = stateCounts.ok || 0;
  const cntNear = stateCounts.near || 0;
  const cntOver = stateCounts.over || 0;
  const cntBlock = stateCounts.block || 0;
  const cntExempt = stateCounts.exempt || 0;
  const overExclOwner = cntOver + cntBlock;

  return (
    <AdminLayout current="/admin/accounts-usage" theme="dark">
      <PageHead
        title="운영 현황 보드"
        version="v0.5"
        sub={`/admin/accounts-usage · ${fmtDate(observed_at)} 기준`}
        right={<Btn onClick={() => loadData(requesterUid)}>↻ 새로고침</Btn>}
      />

      <StatRow>
        <Stat label="전체 계정" value={summary.total_accounts} />
        <Stat label="총 생성" value={summary.total_posts_all} />
        <Stat label="이번 달 생성" value={summary.monthly_posts_all} tone="info" />
        <Stat label="총 실발행" value={summary.published_total_all ?? '-'} tone="info" />
        <Stat label="quota 초과 계정" value={overExclOwner} tone={overExclOwner > 0 ? 'danger' : 'ok'} />
      </StatRow>

      <div style={{ display: 'flex', gap: 8, marginBottom: T.sectionGap, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: T.textMuted, marginRight: 4 }}>quota 상태</span>
        <StatePill label="정상" value={cntOk} tone="ok" />
        <StatePill label="임박" value={cntNear} tone="warn" />
        <StatePill label="초과" value={cntOver} tone="danger" />
        <StatePill label="차단예정" value={cntBlock} tone="danger" strong />
        <StatePill label="예외" value={cntExempt} tone="info" />
        <span style={{ fontSize: 11, color: T.textFaint, marginLeft: 4 }}>
          임박 ≥80% · 초과 ≥100% · 차단예정 = 초과+활성 · 예외 = 운영자
        </span>
      </div>

      <Table minWidth={1100}>
          <thead>
            <tr>
              <Th>id</Th>
              <Th>email</Th>
              <Th>플랜</Th>
              <Th align="right">총 생성</Th>
              <Th align="right">월 생성</Th>
              <Th align="right">월 한도</Th>
              <Th align="right">사용률</Th>
              <Th>quota상태</Th>
              <Th align="right">실발행</Th>
              <Th>최근 발행</Th>
              <Th>상태</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 28, textAlign: 'center', color: T.textFaint }}>데이터 없음</td></tr>
            ) : rows.map(r => {
              const isOwnerRow = r.role === 'owner';
              const isSaving = savingId === r.id;
              const qs = quotaState(r.quota_ratio, r.over_quota, r.status, isOwnerRow);
              const rowBg = qs.strong ? T.dangerBg : 'transparent';
              return (
                <tr key={r.id} style={{ opacity: isSaving ? 0.5 : 1, background: rowBg }}>
                  <Td>{r.id}</Td>
                  <Td>
                    {r.email || '-'}
                    {isOwnerRow && <span style={{ marginLeft: 6, fontSize: 10, color: T.info, fontWeight: 700 }}>운영자</span>}
                  </Td>
                  <Td>
                    {isOwnerRow ? (
                      <Badge>{planLabel(r.plan_id)} 🔒</Badge>
                    ) : (
                      <select
                        value={r.plan_id}
                        disabled={isSaving}
                        onChange={(e) => handleUpdate(r.id, 'plan', e.target.value, isOwnerRow)}
                        style={{ ...selectStyle, padding: '4px 8px', fontSize: 12 }}
                      >
                        {PLAN_OPTIONS.map(p => (
                          <option key={p} value={p}>{planLabel(p)}</option>
                        ))}
                      </select>
                    )}
                  </Td>
                  <Td align="right" mono>{r.total_posts}</Td>
                  <Td align="right" mono style={{ fontWeight: r.monthly_posts > 0 ? 700 : 400 }}>
                    {r.monthly_posts}
                  </Td>
                  <Td align="right" mono style={{ color: T.textMuted }}>{r.monthly_quota}</Td>
                  <Td align="right">
                    <span style={{ color: isOwnerRow ? T.textMuted : ratioColor(r.quota_ratio), fontWeight: 700 }}>
                      {(r.quota_ratio * 100).toFixed(1)}%
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={qs.tone}>{qs.label}</Badge>
                  </Td>
                  <Td align="right" mono style={{ color: T.info }}>{r.published_posts ?? <Dash />}</Td>
                  <Td title={fmtDate(r.latest_at)} style={{ color: T.textMuted }}>{fmtRelative(r.latest_at)}</Td>
                  <Td>
                    {isOwnerRow ? (
                      <span style={{ color: r.status === 'active' ? T.ok : T.textMuted, fontSize: 12, fontWeight: 600 }}>
                        {statusLabel(r.status)} 🔒
                      </span>
                    ) : (
                      <select
                        value={r.status || 'active'}
                        disabled={isSaving}
                        onChange={(e) => handleUpdate(r.id, 'status', e.target.value, isOwnerRow)}
                        style={{
                          ...selectStyle,
                          padding: '4px 8px',
                          fontSize: 12,
                          color: r.status === 'active' ? T.ok : T.danger,
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
      </Table>

      <p style={footNoteStyle}>
        ※ quota는 <b>생성(baseline) 건수</b> 기준입니다. 실발행 컬럼은 관측용이며 차단과 무관합니다.
        플랜/상태는 즉시 반영. 운영자 본인 계정은 자해 방지 잠금. 발행 차단은 /api/publish/check-quota 미들웨어로 동작.
      </p>
    </AdminLayout>
  );
}

// 세션76: 로컬 SummaryBox 삭제 → adminTheme 의 StatRow/Stat 사용.
function StatePill({ label, value, tone, strong = false }) {
  const active = value > 0;
  const fg = { ok: T.ok, warn: T.warn, danger: T.danger, info: T.info }[tone] || T.textMuted;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 11px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: strong && active ? 700 : 600,
      color: active ? fg : T.textFaint,
      background: active && strong ? T.dangerBg : T.surface,
      border: `1px solid ${active ? fg : T.border}`,
    }}>
      {label}
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
}

// 세션76: 로컬 Th/Td 삭제 → adminTheme 의 Th/Td 사용(색·패딩 SoT 단일화).
