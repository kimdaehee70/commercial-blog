// pages/account.js
// v0.8 — 82차 (Free 플랜 카드 표시 / subscription null 사용자 surface)
// v0.7 — quota 임박 경고 라인 추가 (카드 2 내부 surface only)
// v0.6 — 81차 (F: data.account null 가드 추가 / 79차 발견 #3 해소)
// v0.5 — 77차 (me.js v0.4 신 스키마 맞춤 / 카드 2 quota 렌더 정상화)
// v0.4 — 75차 (구독 정보 카드 추가 / 72차 2순위 이월 완료)
// v0.3 — 68차 (죽은 코드 제거 — last_login_at 분기 + fmtDate 함수)
//
// 변경 (v0.7 → v0.8):
//   1) 카드 2.5 (구독 정보) — sub null 시에도 카드 렌더 (Free 플랜 표시)
//      - sub === null  : Free 플랜 카드 (status: 활성 / 결제 주기 — / 자동 갱신 —)
//      - sub !== null  : 기존 v0.7 동작 그대로 유지 (변경 없음)
//   2) plan_id fallback : sub null 시 'free' 라벨
//   3) me.js 영향 0 / publish.js 영향 0 / DB 변경 0 / 신규 helper 0
//   4) 의도: free 사용자도 자신의 플랜 상태를 인지 → 업그레이드 동선 확보
//
// 변경 (v0.6 → v0.7):
//   1) 카드 2 (이번 달 사용량) — quota 임박 경고 라인 1줄 추가
//      - pct ≥ 95% : 빨강 (임박 — 곧 발행 차단)
//      - pct ≥ 80% : 노랑 (경고 — 80% 도달)
//      - 그 외      : 표시 안 함
//      - owner role : 미표시 (quota 우회 / 참고값)
//      - limit ≤ 0 / quota null : 미표시 (안전 가드)
//   2) me.js 영향 0 / publish.js 영향 0 / 신규 helper 0
//   3) 표시 위치: 진행률 바 바로 아래, period 라인 위
//
// 변경 (v0.5 → v0.6):
//   1) acc 빈 객체 fallback — data.account null/undefined 대비
//      - 카드1 (이메일/권한/상태/가입일) TypeError 차단
//      - acc.role === "owner" 분기 안전 (탈퇴 버튼 렌더)
//   2) 79차 발견 #3 영구 해소 — fragile 가드 보강 완료
//
// 변경 (v0.4 → v0.5):
//   1) quota 필드명 신 스키마 적용
//      - q.used_this_month → q.used
//      - q.monthly_limit   → q.limit
//      - q.remaining       → (limit - used) 계산
//   2) plan 표시 필드 신 스키마 적용
//      - acc.plan_label / acc.plan_id (없음) → plan?.label / quota.plan_id
//   3) period 표시 추가 (period_start ~ period_end)
//   4) blog_accounts 응답에 없음 → 빈 배열 fallback (카드 3 안전)
//   5) quota null 대비 가드 추가 (limit=null / used=undefined 시 안전 렌더)
//   6) owner 라벨 표시 유지 (참고값 안내)
//
// 데이터 소스: /api/account/me (v0.4)
// 보호: 비로그인 시 /login 리다이렉트

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// 표준 인증 패턴 통일 — dashboard/login/plans와 동일 싱글톤 사용
// (별도 createClient 인스턴스 제거: 세션 저장소 일원화)
import { supabase } from "../lib/supabase";
import AppHeader from "../components/AppHeader";

function fmtDateOnly(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 75차 — subscription status 색상 매핑 (72차 5상태 매트릭스)
function subStatusBadge(status) {
  const map = {
    active:    { bg: "bg-emerald-100", fg: "text-emerald-700", label: "활성" },
    past_due:  { bg: "bg-amber-100",   fg: "text-amber-700",   label: "결제 지연" },
    paused:    { bg: "bg-amber-100",   fg: "text-amber-700",   label: "일시 중지" },
    cancelled: { bg: "bg-gray-100",    fg: "text-gray-700",    label: "해지됨" },
    expired:   { bg: "bg-gray-100",    fg: "text-gray-700",    label: "만료됨" },
  };
  return map[status] || { bg: "bg-gray-100", fg: "text-gray-700", label: status || "—" };
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // 67차 — 탈퇴 흐름 state
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateErr, setDeactivateErr] = useState(null);

  // 지역 2축 설정 state (rep_region / sub_regions CSV)
  const [repRegion, setRepRegion] = useState("");
  const [subRegions, setSubRegions] = useState("");
  const [savingRegion, setSavingRegion] = useState(false);
  const [regionErr, setRegionErr] = useState(null);
  const [regionSaved, setRegionSaved] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (!token) {
          router.replace("/login");
          return;
        }

        const r = await fetch("/api/account/me", {
          headers: { Authorization: "Bearer " + token },
        });
        const j = await r.json();
        if (aborted) return;
        if (!j.ok) {
          setError(j.error || "조회 실패");
        } else {
          setData(j);
          // 지역 2축 폼 초기값 (accounts.rep_region / sub_regions — me.js select('*') 포함)
          const a = j.account || {};
          setRepRegion(a.rep_region || "");
          setSubRegions(a.sub_regions || "");
        }
      } catch (e) {
        if (!aborted) setError(String(e.message));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // 67차 — 탈퇴 처리
  async function handleDeactivate() {
    setDeactivateErr(null);

    if (!confirmDeactivate) {
      setDeactivateErr("탈퇴 안내를 확인하고 체크박스를 선택하세요.");
      return;
    }

    setDeactivating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        setDeactivateErr("세션이 없습니다. 다시 로그인하세요.");
        setDeactivating(false);
        return;
      }

      const r = await fetch("/api/account/deactivate", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      const j = await r.json();

      if (!j.ok) {
        setDeactivateErr(j.error || "탈퇴 처리 실패");
        setDeactivating(false);
        return;
      }

      console.log(`[account] deactivated: id=${j.account_id} ${j.previous_status} → ${j.new_status}`);
      await supabase.auth.signOut();
      router.replace("/");
    } catch (e) {
      setDeactivateErr(String(e?.message || e));
      setDeactivating(false);
    }
  }

  // 지역 2축 저장 — update-profile.js 호출 (handleDeactivate 인증 패턴 미러링)
  async function handleSaveRegion() {
    setRegionErr(null);
    setRegionSaved(false);
    setSavingRegion(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        setRegionErr("세션이 없습니다. 다시 로그인하세요.");
        setSavingRegion(false);
        return;
      }

      const r = await fetch("/api/account/update-profile", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rep_region: repRegion,
          sub_regions: subRegions,
        }),
      });
      const j = await r.json();

      if (!j.ok) {
        setRegionErr(j.error || "저장 실패");
        setSavingRegion(false);
        return;
      }

      // 서버 정규화 결과로 폼 동기화 (CSV 트림/중복제거 반영)
      const a = j.account || {};
      setRepRegion(a.rep_region || "");
      setSubRegions(a.sub_regions || "");
      setRegionSaved(true);
      setSavingRegion(false);
    } catch (e) {
      setRegionErr(String(e?.message || e));
      setSavingRegion(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">불러오는 중…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <div className="text-red-600 text-sm mb-3">에러: {error}</div>
          <button
            onClick={() => router.replace("/login")}
            className="text-sm text-gray-600 hover:underline"
          >
            로그인으로
          </button>
        </div>
      </div>
    );
  }

  // G3 79차 — data null 가드 (78차 회귀 차단)
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">데이터가 없습니다.</div>
      </div>
    );
  }

  // 77차 — 신 스키마 매핑
  // 81차 F — data.account null/undefined 대비 빈 객체 fallback (TypeError 차단)
  const acc = data.account || {};
  const plan = data.plan || null;             // 활성 구독의 plan (없으면 null)
  const sub = data.subscription || null;
  const q = data.quota || null;               // null 대비 가드
  const blogs = data.blog_accounts || [];     // me.js v0.4 응답에 없음 → 빈 배열 fallback

  // 카드 2: 사용량 계산
  const used = q && Number.isFinite(q.used) ? q.used : 0;
  const limit = q && Number.isFinite(q.limit) ? q.limit : 0;
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  // 플랜 라벨 — plan.label 우선 / 없으면 quota.plan_id / 그것도 없으면 '—'
  const planLabel = plan?.label || (q?.plan_id ? q.plan_id : "—");

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* 카드 1: 계정 정보 */}
        <section className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">계정 정보</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div>
              <dt className="text-gray-500 text-xs">이메일</dt>
              <dd className="text-gray-900 mt-0.5">{acc.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">권한</dt>
              <dd className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                  acc.role === "owner"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {acc.role || "—"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">상태</dt>
              <dd className="mt-0.5">
                <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                  acc.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {acc.status || "—"}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 text-xs">가입일</dt>
              <dd className="text-gray-900 mt-0.5">{fmtDateOnly(acc.created_at)}</dd>
            </div>
          </dl>
        </section>

        {/* 카드 1.5: 지역 설정 — rep_region / sub_regions (CSV) */}
        <section className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">지역 설정</h2>
          <p className="text-xs text-gray-500 mb-4">
            대표지역은 관측 기준, 세부지역은 글에 쓰일 동·역·상권입니다. 세부지역은 쉼표(,)로 구분해 입력하세요.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1">대표지역</label>
              <input
                type="text"
                value={repRegion}
                onChange={(e) => { setRepRegion(e.target.value); setRegionSaved(false); }}
                placeholder="예: 노원구"
                className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs mb-1">세부지역 (쉼표 구분)</label>
              <input
                type="text"
                value={subRegions}
                onChange={(e) => { setSubRegions(e.target.value); setRegionSaved(false); }}
                placeholder="예: 공릉동,상계동,중계동,노원역"
                className="w-full text-sm border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {subRegions.trim() && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {subRegions.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} className="inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {regionErr && (
              <p className="text-xs text-red-600">{regionErr}</p>
            )}
            {regionSaved && (
              <p className="text-xs text-emerald-600">저장되었습니다.</p>
            )}

            <div>
              <button
                type="button"
                onClick={handleSaveRegion}
                disabled={savingRegion}
                className="text-sm px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingRegion ? "저장 중…" : "지역 저장"}
              </button>
            </div>
          </div>
        </section>

        {/* 카드 2: 이번 달 사용량 — 77차 신 스키마 맞춤 */}
        <section className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">이번 달 사용량</h2>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              {planLabel}
            </span>
          </div>

          <div className="mb-2 flex items-baseline justify-between">
            <div className="text-2xl font-semibold text-gray-900">
              {used}
              <span className="text-base text-gray-400 font-normal"> / {limit || "—"}</span>
            </div>
            <div className="text-xs text-gray-500">
              남은 quota <span className="font-semibold text-gray-900">{remaining}</span>
            </div>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* v0.7 — quota 임박 경고 (owner 제외 / limit>0 / quota 있을 때) */}
          {q && limit > 0 && acc.role !== "owner" && pct >= 80 && (
            <div
              className={`mt-3 px-3 py-2 rounded text-xs border ${
                pct >= 95
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {pct >= 95
                ? `⚠️ quota 임박 — 남은 발행 ${remaining}회 (${pct}% 사용). 한도 초과 시 발행이 차단됩니다.`
                : `⚠️ 사용량 ${pct}% — 남은 quota ${remaining}회. 플랜 업그레이드를 검토해보세요.`}
            </div>
          )}

          {q?.period_start && q?.period_end && (
            <p className="text-xs text-gray-500 mt-3">
              집계 기간 {fmtDateOnly(q.period_start)} ~ {fmtDateOnly(q.period_end)} (KST)
            </p>
          )}

          {acc.role === "owner" && (
            <p className="text-xs text-purple-600 mt-1">
              owner 권한 — quota 제한 우회 (참고값)
            </p>
          )}
        </section>

        {/* 카드 2.5: 구독 정보 — 75차 추가 / v0.8 sub null = Free 플랜 카드 렌더 */}
        {sub ? (() => {
          const badge = subStatusBadge(sub.status);
          const subPlanLabel = plan?.label || sub.plan_id || "—";
          const failed = Number(sub.failed_payment_count || 0);
          return (
            <section className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">구독 정보</h2>
                <span className={`inline-block px-2 py-0.5 text-xs rounded ${badge.bg} ${badge.fg}`}>
                  {badge.label}
                </span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs">플랜</dt>
                  <dd className="text-gray-900 mt-0.5">{subPlanLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">현재 결제 주기 종료</dt>
                  <dd className="text-gray-900 mt-0.5">{fmtDateOnly(sub.current_period_end)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">다음 결제 예정</dt>
                  <dd className="text-gray-900 mt-0.5">
                    {sub.cancel_at_period_end ? "—" : fmtDateOnly(sub.next_billing_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">자동 갱신</dt>
                  <dd className="mt-0.5">
                    {sub.cancel_at_period_end ? (
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">
                        기간 만료 시 해지 예정
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700">
                        활성
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {failed > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  ⚠️ 결제 실패 {failed}회 — 결제 수단을 확인해주세요.
                  {sub.last_failed_at && (
                    <span className="ml-1 text-amber-600">
                      (최근 실패 {fmtDateOnly(sub.last_failed_at)})
                    </span>
                  )}
                </div>
              )}
            </section>
          );
        })() : (
          // v0.8 — sub null = Free 플랜 사용자 surface
          <section className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">구독 정보</h2>
              <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                무료
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <div>
                <dt className="text-gray-500 text-xs">플랜</dt>
                <dd className="text-gray-900 mt-0.5">
                  {plan?.label || (q?.plan_id === "free" ? "Free" : q?.plan_id || "Free")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">현재 결제 주기 종료</dt>
                <dd className="text-gray-400 mt-0.5">—</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">다음 결제 예정</dt>
                <dd className="text-gray-400 mt-0.5">—</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">자동 갱신</dt>
                <dd className="text-gray-400 mt-0.5">—</dd>
              </div>
            </dl>

            <p className="text-xs text-gray-500 mt-4">
              현재 Free 플랜 사용 중입니다. 더 많은 quota가 필요하면 플랜 업그레이드를 검토해주세요.
            </p>
          </section>
        )}

        {/* 카드 3: 연결된 블로그 계정 — me.js v0.4 응답에 없음 / 빈 상태 표시 */}
        <section className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">연결된 블로그 계정</h2>
            <span className="text-xs text-gray-500">{blogs.length}개</span>
          </div>

          {blogs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              아직 발행 이력이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {blogs.map((b) => (
                <li key={b.blog_account} className="py-2.5 flex items-center justify-between">
                  <div className="text-sm text-gray-900 font-mono">{b.blog_account}</div>
                  <div className="text-xs text-gray-500">
                    최근 발행 {fmtDateOnly(b.last_published_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 카드 4: 회원 탈퇴 — 67차 추가 */}
        <section className="bg-white rounded-lg shadow-sm border border-red-200 p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-3">회원 탈퇴</h2>

          <div className="text-sm text-gray-700 space-y-2 mb-4">
            <p>탈퇴 시 다음과 같이 처리됩니다:</p>
            <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
              <li>계정 상태가 <span className="font-mono">deactivated</span>로 변경되어 <strong>즉시 로그인이 차단</strong>됩니다.</li>
              <li>모든 기기의 세션이 무효화됩니다.</li>
              <li>발행 이력(publish_history)은 보존됩니다.</li>
              <li>동일 이메일로 재가입은 가능하나, 기존 데이터와는 별개의 계정이 됩니다.</li>
              <li>탈퇴 후 계정 복구는 관리자 문의가 필요합니다.</li>
            </ul>
          </div>

          {acc.role === "owner" && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              ⚠️ <strong>owner 계정 경고</strong> — 운영자 권한이 있는 계정입니다.
              탈퇴 시 다른 owner가 없다면 운영 콘솔 접근이 불가능해질 수 있습니다.
            </div>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer select-none mb-3">
            <input
              type="checkbox"
              checked={confirmDeactivate}
              onChange={(e) => setConfirmDeactivate(e.target.checked)}
              className="mt-0.5"
              disabled={deactivating}
            />
            <span>위 안내를 모두 확인했으며, 탈퇴에 동의합니다.</span>
          </label>

          <button
            onClick={handleDeactivate}
            disabled={!confirmDeactivate || deactivating}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            style={{
              padding: "8px 16px",
              background: confirmDeactivate && !deactivating ? "#dc2626" : "#d1d5db",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              border: "none",
              borderRadius: 6,
              cursor: confirmDeactivate && !deactivating ? "pointer" : "not-allowed",
            }}
          >
            {deactivating ? "처리 중…" : "탈퇴하기"}
          </button>

          {deactivateErr && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded"
                 style={{ marginTop: 12, padding: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 12, borderRadius: 4 }}>
              {deactivateErr}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-400 pt-2">
          commercial-blog · 마이페이지 v0.8
        </p>
      </div>
    </div>
  );
}
