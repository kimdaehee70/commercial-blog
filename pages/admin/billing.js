// pages/admin/billing.js
// v0.1: 결제 상태 관리 보드 (PG 미연동, 수동 운영)
//
// A 구조 (94차 확정):
//   accounts.plan = plan 진실 소스 / subscriptions = 결제 상태 레이어.
//   결제완료 → accounts.plan + subscriptions 동기화. quota는 계속 accounts.plan 참조.
//
// 상태 4-state:
//   정상(active) / 해지예정(active+cancel_at_period_end) / 미납(past_due) / 해지완료(canceled)
//
// API: GET /api/admin/subscriptions  ·  POST /api/admin/billing-action
// 패턴 출처: accounts-usage.js (인증/Bearer/카드/필터칩/테이블/owner잠금/savingId) — 운영 UI 일관성 유지.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminNav } from '../../lib/adminNav';

const PLAN_OPTIONS = ['free', 'basic', 'pro'];

// 상태별 표시 규약 (subscriptions.js billingState와 1:1)
const STATE_META = {
  active:           { label: '정상',    color: '#16a34a', bg: 'transparent' },
  scheduled_cancel: { label: '해지예정', color: '#ea580c', bg: '#fff7ed' },
  past_due:         { label: '미납',    color: '#dc2626', bg: '#fef2f2' },
  canceled:         { label: '해지완료', color: '#6b7280', bg: '#f9fafb' },
  none:             { label: '구독없음', color: '#9ca3af', bg: 'transparent' },
};

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { hour12: false });
}

export default function Billing() {
  const router = useRouter();
  // 공통 가드 (getSession → OWNER_UID 비교는 훅 내부) — B방식: 판정만 위임, 리다이렉트 동작은 아래 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const requesterUid = session?.user?.id || null;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [filter, setFilter] = useState('all');
  // 결제완료 시 적용할 plan 선택값 (account별)
  const [planDraft, setPlanDraft] = useState({});

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
      const r = await fetch(`/api/admin/subscriptions?uid=${uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      if (r.status === 403) throw new Error('관리자 권한이 필요합니다.');
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'FETCH_FAILED');
      setData(d);
    } catch (e) {
      setError(e.message);
    }
  };

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트 (UX 100% 보존)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState]);

  // owner 확정 시에만 데이터 로드 (기존 mount effect의 loadData+setLoading 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    let cancelled = false;
    (async () => {
      await loadData(session.user.id);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authState, session]);

  const doAction = async (target_id, action, extra, isOwnerRow) => {
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
      const r = await fetch('/api/admin/billing-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requester_uid: requesterUid,
          target_id,
          action,
          ...(extra || {}),
        }),
      });
      if (r.status === 401) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      if (r.status === 403) throw new Error('관리자 권한이 필요합니다.');
      const d = await r.json();
      if (!d.ok) throw new Error(d.message || d.error || 'ACTION_FAILED');
      await loadData(requesterUid);
    } catch (e) {
      alert(`처리 실패: ${e.message}`);
    } finally {
      setSavingId(null);
    }
  };

  if (authState === 'checking' || authLoading) return <div style={{ padding: 40, color: '#666' }}>인증 확인 중...</div>;
  if (authState === 'unauth' || authState === 'non-owner') return <div style={{ padding: 40, color: '#666' }}>로그인 페이지로 이동 중...</div>;
  if (loading) return <div style={{ padding: 40, color: '#666' }}>로딩 중...</div>;
  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2 style={{ color: '#dc2626' }}>오류</h2>
        <pre style={{ background: '#fef2f2', padding: 12, borderRadius: 4 }}>{error}</pre>
      </div>
    );
  }

  const { summary, rows, observed_at } = data;
  const shown = filter === 'all' ? rows : rows.filter(r => r.state_key === filter);

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'system-ui, sans-serif' }}>
      <AdminNav current="/admin/billing" />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>
          결제 상태 관리 <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>v0.1</span>
        </h1>
        <span style={{ color: '#999', fontSize: 13 }}>
          /admin/billing · {fmtDateTime(observed_at)} 기준
        </span>
        <button
          onClick={() => loadData(requesterUid)}
          style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}
        >
          새로고침
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <SummaryBox label="전체 계정" value={summary.total_accounts} />
        <SummaryBox label="구독 보유" value={summary.with_subscription} accent="#2563eb" />
        <SummaryBox label="미납" value={summary.past_due} accent={summary.past_due > 0 ? '#dc2626' : '#16a34a'} />
        <SummaryBox label="해지예정" value={summary.scheduled_cancel} accent={summary.scheduled_cancel > 0 ? '#ea580c' : '#16a34a'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#888', marginRight: 4 }}>상태 필터</span>
        <FilterPill label="전체" k="all" cur={filter} setCur={setFilter} count={rows.length} color="#374151" />
        <FilterPill label="정상" k="active" cur={filter} setCur={setFilter} count={summary.active} color="#16a34a" />
        <FilterPill label="해지예정" k="scheduled_cancel" cur={filter} setCur={setFilter} count={summary.scheduled_cancel} color="#ea580c" />
        <FilterPill label="미납" k="past_due" cur={filter} setCur={setFilter} count={summary.past_due} color="#dc2626" />
        <FilterPill label="해지완료" k="canceled" cur={filter} setCur={setFilter} count={summary.canceled} color="#6b7280" />
        <FilterPill label="구독없음" k="none" cur={filter} setCur={setFilter} count={summary.none} color="#9ca3af" />
        {summary.plan_drift_count > 0 && (
          <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 4 }}>
            ⚠ plan 드리프트 {summary.plan_drift_count}건 (구독 plan ≠ accounts.plan)
          </span>
        )}
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              <Th>id</Th>
              <Th>email</Th>
              <Th>plan</Th>
              <Th>결제상태</Th>
              <Th>시작일</Th>
              <Th>종료일</Th>
              <Th align="center">결제완료</Th>
              <Th align="center">미납</Th>
              <Th align="center">해지예정</Th>
              <Th align="center">해지</Th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#999' }}>데이터 없음</td></tr>
            ) : shown.map(r => {
              const isOwnerRow = r.is_owner;
              const isSaving = savingId === r.account_id;
              const meta = STATE_META[r.state_key] || STATE_META.none;
              const draftPlan = planDraft[r.account_id] || r.plan_id;
              return (
                <tr key={r.account_id} style={{ borderTop: '1px solid #f3f4f6', opacity: isSaving ? 0.5 : 1, background: meta.bg }}>
                  <Td>{r.account_id}</Td>
                  <Td>
                    {r.email || '-'}
                    {isOwnerRow && <span style={{ marginLeft: 6, fontSize: 10, color: '#2563eb', fontWeight: 600 }}>OWNER</span>}
                  </Td>
                  <Td>
                    <span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 12 }}>
                      {r.plan_id}
                    </span>
                    {r.plan_drift && (
                      <span title={`구독 plan_id=${r.sub_plan_id}`} style={{ marginLeft: 4, fontSize: 11, color: '#dc2626' }}>⚠</span>
                    )}
                  </Td>
                  <Td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 600, color: '#fff', background: meta.color,
                      opacity: (r.state_key === 'active' || r.state_key === 'none' || r.state_key === 'canceled') ? 0.7 : 1,
                    }}>
                      {meta.label}
                    </span>
                    {r.state_key === 'past_due' && r.failed_payment_count > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#dc2626' }}>×{r.failed_payment_count}</span>
                    )}
                  </Td>
                  <Td title={fmtDateTime(r.current_period_start)}>{fmtDate(r.current_period_start)}</Td>
                  <Td title={fmtDateTime(r.current_period_end)}>{fmtDate(r.current_period_end)}</Td>

                  {/* 결제완료: plan 선택 + 적용 */}
                  <Td align="center">
                    {isOwnerRow ? <Lock /> : (
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <select
                          value={draftPlan}
                          disabled={isSaving}
                          onChange={(e) => setPlanDraft({ ...planDraft, [r.account_id]: e.target.value })}
                          style={{ padding: '2px 4px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}
                        >
                          {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ActBtn
                          label="결제"
                          color="#16a34a"
                          disabled={isSaving}
                          onClick={() => {
                            if (!confirm(`${r.email} → ${draftPlan} 결제완료 처리합니다.\naccounts.plan이 ${draftPlan}로 변경되고 구독이 active로 기록됩니다.`)) return;
                            doAction(r.account_id, 'mark_paid', { plan: draftPlan }, isOwnerRow);
                          }}
                        />
                      </span>
                    )}
                  </Td>

                  {/* 미납 */}
                  <Td align="center">
                    {isOwnerRow ? <Lock /> : (
                      <ActBtn
                        label="미납"
                        color="#dc2626"
                        disabled={isSaving || !r.has_subscription}
                        onClick={() => {
                          if (!confirm(`${r.email} 미납 처리합니다.`)) return;
                          doAction(r.account_id, 'mark_past_due', null, isOwnerRow);
                        }}
                      />
                    )}
                  </Td>

                  {/* 해지예정 토글 */}
                  <Td align="center">
                    {isOwnerRow ? <Lock /> : (
                      <ActBtn
                        label={r.cancel_at_period_end ? '예정해제' : '예정'}
                        color="#ea580c"
                        outline={!r.cancel_at_period_end}
                        disabled={isSaving || !r.has_subscription}
                        onClick={() => {
                          const next = !r.cancel_at_period_end;
                          if (!confirm(`${r.email} 해지예정 ${next ? '설정' : '해제'}합니다.${next ? '\n기간 종료일에 해지됩니다.' : ''}`)) return;
                          doAction(r.account_id, 'schedule_cancel', { cancel: next }, isOwnerRow);
                        }}
                      />
                    )}
                  </Td>

                  {/* 즉시 해지 */}
                  <Td align="center">
                    {isOwnerRow ? <Lock /> : (
                      <ActBtn
                        label="해지"
                        color="#6b7280"
                        disabled={isSaving || !r.has_subscription || r.state_key === 'canceled'}
                        onClick={() => {
                          if (!confirm(`${r.email} 즉시 해지합니다.\n구독 status=canceled. (accounts.plan은 자동 강등 안 함 — 필요 시 회원관리에서 free 전환)`)) return;
                          doAction(r.account_id, 'cancel_now', null, isOwnerRow);
                        }}
                      />
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: '#999', lineHeight: 1.7 }}>
        ※ plan 진실 소스 = accounts.plan. 결제완료 시 accounts.plan + subscriptions 동기화, quota는 계속 accounts.plan 참조.<br />
        ※ 해지(canceled)는 구독 상태만 변경하며 accounts.plan을 자동 강등하지 않습니다(잔여기간 정책은 운영자 판단). plan 강등은 회원관리에서.<br />
        ※ owner 계정은 자해 방지 잠금. PG(KG이니시스) 자동청구는 미연동(수동 운영).
      </p>
    </div>
  );
}

function SummaryBox({ label, value, accent = '#111' }) {
  return (
    <div style={{ padding: '14px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6 }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  );
}

function FilterPill({ label, k, cur, setCur, count, color }) {
  const active = cur === k;
  return (
    <button
      onClick={() => setCur(k)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        cursor: 'pointer',
        color: active ? '#fff' : color,
        background: active ? color : '#fff',
        border: `1px solid ${color}`,
      }}
    >
      {label}<span style={{ fontWeight: 700 }}>{count}</span>
    </button>
  );
}

function ActBtn({ label, color, onClick, disabled, outline }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        color: outline ? color : '#fff',
        background: disabled ? '#e5e7eb' : (outline ? '#fff' : color),
        border: `1px solid ${disabled ? '#e5e7eb' : color}`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Lock() {
  return <span style={{ fontSize: 12, color: '#bbb' }}>🔒</span>;
}

function Th({ children, align = 'left' }) {
  return <th style={{ padding: '10px 12px', textAlign: align, fontWeight: 600, color: '#374151', fontSize: 12 }}>{children}</th>;
}
function Td({ children, align = 'left', style = {}, title }) {
  return <td style={{ padding: '10px 12px', textAlign: align, ...style }} title={title}>{children}</td>;
}
