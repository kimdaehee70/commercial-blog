// pages/admin/accounts.js
// 세션73 v0.6: 헤더 버전 표기 정정 (v0.4 → v0.6). 표시 문자열 1곳만. 로직 무변경.
//   · 세션72에서 ALLOWED_PLANS standard 추가 + 검색 input 신설(v0.6)했으나 헤더 표기가 v0.4로 잔존.
//   · 회원관리 6항목 실측 완료 — 검색/플랜4tier/상태/가입일 ✅,
//     관리자 지급은 '기간 없음=영구' 구조 → 결제 B단계로 이월.
// 91차 v0.5: blog_account 인라인 편집 UI 추가 (회원 ↔ publish_history 연결고리)
// - blog_account 컬럼: status 뒤 / plan 앞. text input (select 아님).
// - select와 상호작용 모델 다름: onChange 즉시저장 ❌ → blur 시 변경 있으면 confirm → 저장.
// - owner row는 🔒 읽기전용 (기존 패턴 답습).
// - updateField에 blog_account 분기 추가 (endpoint=update-account, API v0.4 계약 존재).
// - 빈문자 → null 매핑 해제 허용 (API와 정합). 형식 검증은 API가 담당(영숫자/_/-).
// - colSpan 9 → 10. 그 외 role/plan/status 흐름 전부 무변경.
//
// 89차 v0.4: role 인라인 select 변경 UI 추가
// - role 컬럼: 기존 span 표시 → select (admin/user)
// - owner row는 select 전체 disabled (자해 방지 시각화)
// - updateField(row, 'role', value) 분기 추가:
//     · field === 'role' → /api/admin/set-role
//     · field === 'plan'|'status' → /api/admin/update-account (v0.3 그대로)
// - 기존 plan/status select 흐름 무변경
//
// 57차 v0.3: plan/status 인라인 select 변경 UI 추가
// 55차 v0.2: OWNER_UID single truth + 401/403 분기
// 38차 v0.1: accounts read-only list

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { OWNER_UID } from "../../lib/constants";
import { useAdminGuard } from "../../lib/useAdminGuard";
import { AdminNav } from "../../lib/adminNav";

const ROLE_COLOR = {
  owner: "#7c3aed",
  admin: "#2563eb",
  user:  "#6b7280",
};

const STATUS_COLOR = {
  active:    "#16a34a",
  pending:   "#f59e0b",
  suspended: "#dc2626",
  inactive:  "#9ca3af",
};

// [v0.6] standard 누락 수정 — 요금제는 4-tier(free3/basic30/standard60/pro100) 확정인데
//   select 목록에 standard가 없어 관리자 화면에서 지급 불가였다. lib/billing/plans.js sort_order 순.
const ALLOWED_PLANS = ["free", "basic", "standard", "pro"];
const ALLOWED_STATUS = ["active", "suspended"];
const ALLOWED_ROLES = ["admin", "user"]; // 89차 신규 — owner 제외

// 89차 신규 — field별 API endpoint 매핑
const API_BY_FIELD = {
  plan:         "/api/admin/update-account",
  status:       "/api/admin/update-account",
  role:         "/api/admin/set-role",
  blog_account: "/api/admin/update-account", // 91차 신규
};

export default function AccountsPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존. OWNER_UID는 owner행 판정에 별도 사용(유지).
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState(""); // [v0.6] 이메일/이름 검색
  const [savingId, setSavingId] = useState(null); // 현재 저장 중인 row id

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState, router]);

  // owner 확정 시에만 최초 로드 (기존 가드 effect의 load(token) 호출 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    load(session.access_token);
  }, [authState, session]);

  async function load(token) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/accounts-list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();

      if (r.status === 401) {
        throw new Error("인증이 만료되었습니다. 다시 로그인해 주세요.");
      }
      if (r.status === 403) {
        throw new Error("관리자 권한이 필요합니다.");
      }
      if (!r.ok) throw new Error(j.error || "load_failed");

      setData(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    await load(session.access_token);
  }

  // ── 57차: plan/status 변경 / 89차: role 분기 추가 ──────────
  async function updateField(row, field, newValue) {
    // owner row 차단 (UI에서 이미 disabled지만 이중 방어)
    if (row.role === "owner" || row.auth_user_id === OWNER_UID) {
      alert("owner 계정은 변경할 수 없습니다.");
      return;
    }

    const oldValue = row[field];

    // 91차: blog_account는 빈문자 ↔ null 정규화 후 비교 (불필요한 저장 방지)
    if (field === "blog_account") {
      const oldNorm = oldValue == null ? "" : String(oldValue).trim();
      const newNorm = newValue == null ? "" : String(newValue).trim();
      if (oldNorm === newNorm) return;
    } else {
      if (oldValue === newValue) return;
    }

    const ok = window.confirm(
      `${row.email || "(id=" + row.id + ")"}\n\n${field}: ${oldValue || "(없음)"} → ${newValue || "(해제)"}\n\n변경하시겠습니까?`
    );
    if (!ok) return;

    // 89차 — field별 API endpoint 분기
    const endpoint = API_BY_FIELD[field];
    if (!endpoint) {
      alert("지원하지 않는 field: " + field);
      return;
    }

    setSavingId(row.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          target_id: row.id,
          [field]: newValue,
        }),
      });
      const j = await r.json();

      if (r.status === 401) throw new Error("인증 만료 — 다시 로그인하세요");
      if (r.status === 403) {
        if (j.error === "OWNER_ACCOUNT_READONLY") {
          throw new Error("owner 계정은 변경할 수 없습니다.");
        }
        throw new Error("권한이 부족합니다.");
      }
      if (r.status === 400 && j.error === "INVALID_ROLE") {
        throw new Error("허용되지 않은 role입니다 (admin/user만 가능)");
      }
      // 91차 — blog_account 전용 에러
      if (r.status === 409 && j.error === "BLOG_ACCOUNT_TAKEN") {
        throw new Error("이미 다른 회원에 연결된 블로그 계정입니다.");
      }
      if (r.status === 400 && j.error === "INVALID_BLOG_ACCOUNT") {
        throw new Error("블로그 계정은 영문/숫자/_/- 만 가능합니다.");
      }
      if (!r.ok) throw new Error(j.error || j.detail || "update_failed");

      // 성공 → 재로드
      await load(session.access_token);
    } catch (e) {
      alert("변경 실패: " + e.message);
    } finally {
      setSavingId(null);
    }
  }

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;
  if (loading) return <div style={{ padding: 24 }}>loading...</div>;
  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>error: {err}</div>;
  if (!data) return null;

  // [v0.6] 상태 필터 + 검색어(이메일·display_name·blog_account) AND 결합. 대소문자 무시.
  const _q = query.trim().toLowerCase();
  const rows = (data.rows || []).filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (!_q) return true;
    return [r.email, r.display_name, r.blog_account]
      .some((v) => String(v || "").toLowerCase().includes(_q));
  });

  const summary = data.summary || {};

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <AdminNav current="/admin/accounts" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          /admin/accounts — 계정 목록 <span style={{ fontSize: 11, color: "#888", fontWeight: 400, marginLeft: 6 }}>v0.6</span>
        </h1>
        <button onClick={refresh} style={btnStyle}>새로고침</button>
        <span style={{ color: "#6b7280", fontSize: 11 }}>
          checked: {data.checked_at}
        </span>
      </div>

      <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 11 }}>
        role / plan / status 직접 변경 · blog_account 입력 후 Enter 또는 클릭 이탈 시 저장 · owner 행은 보호됨
      </div>

      {/* 요약 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 12 }}>
        <SummaryBox label="total" value={summary.total ?? 0} />
        <SummaryBox label="active" value={summary.active ?? 0} color="#16a34a" />
        <SummaryBox label="pending" value={summary.pending ?? 0} color="#f59e0b" />
        <SummaryBox label="suspended" value={summary.suspended ?? 0} color="#dc2626" />
        <SummaryBox label="other" value={summary.other ?? 0} color="#9ca3af" />
      </div>

      {/* 필터 */}
      <div style={{ marginBottom: 8, display: "flex", gap: 6 }}>
        {["all", "active", "pending", "suspended"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...filterBtn,
              background: filter === f ? "#111827" : "#fff",
              color: filter === f ? "#fff" : "#374151",
            }}
          >
            {f}
          </button>
        ))}
        {/* [v0.6] 검색 — 클라이언트 필터. API 무변경. */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이메일 · 이름 · blog_account 검색"
          style={{
            marginLeft: 8, padding: "4px 8px", fontSize: 12, minWidth: 240,
            border: "1px solid #d1d5db", borderRadius: 4, outline: "none",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={filterBtn}>지우기</button>
        )}
      </div>

      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>
        {rows.length} rows
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tblStyle}>
          <thead>
            <tr style={trhStyle}>
              <th style={thStyle}>id</th>
              <th style={thStyle}>email</th>
              <th style={thStyle}>display_name</th>
              <th style={thStyle}>role</th>
              <th style={thStyle}>status</th>
              <th style={thStyle}>blog_account</th>
              <th style={thStyle}>plan</th>
              <th style={thStyle}>auth_user_id</th>
              <th style={thStyle}>created_at</th>
              <th style={thStyle}>updated_at</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>
                  no rows
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOwnerRow = r.role === "owner" || r.auth_user_id === OWNER_UID;
                const isSaving = savingId === r.id;
                return (
                  <tr key={r.id} style={trStyle}>
                    <td style={tdNum}>{r.id}</td>
                    <td style={tdMono}>{r.email || "—"}</td>
                    <td style={tdStyle}>{r.display_name || "—"}</td>
                    {/* role — 89차 신규 select */}
                    <td style={tdStyle}>
                      {isOwnerRow ? (
                        <span style={{
                          color: ROLE_COLOR[r.role] || "#374151",
                          fontWeight: 500,
                          opacity: 0.7,
                        }}>
                          🔒 {r.role || "—"}
                        </span>
                      ) : (
                        <select
                          value={r.role || ""}
                          disabled={isSaving}
                          onChange={(e) => updateField(r, "role", e.target.value)}
                          style={{
                            ...selectStyle,
                            color: ROLE_COLOR[r.role] || "#374151",
                            fontWeight: 500,
                          }}
                        >
                          {/* 현재 값이 whitelist 밖이면 표시만 (예: 빈값) */}
                          {!ALLOWED_ROLES.includes(r.role) && r.role && (
                            <option value={r.role} disabled>{r.role} (lock)</option>
                          )}
                          {ALLOWED_ROLES.map((rl) => (
                            <option key={rl} value={rl}>{rl}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {isOwnerRow ? (
                        <span style={{
                          color: STATUS_COLOR[r.status] || "#374151",
                          fontWeight: 500,
                          opacity: 0.7,
                        }}>
                          🔒 {r.status || "—"}
                        </span>
                      ) : (
                        <select
                          value={r.status || ""}
                          disabled={isSaving}
                          onChange={(e) => updateField(r, "status", e.target.value)}
                          style={{
                            ...selectStyle,
                            color: STATUS_COLOR[r.status] || "#374151",
                            fontWeight: 500,
                          }}
                        >
                          {/* 현재 값이 whitelist 밖이면 표시만 */}
                          {!ALLOWED_STATUS.includes(r.status) && r.status && (
                            <option value={r.status} disabled>{r.status} (lock)</option>
                          )}
                          {ALLOWED_STATUS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    {/* blog_account — 91차 신규 (text input, blur 저장) */}
                    <td style={tdStyle}>
                      {isOwnerRow ? (
                        <span style={{ opacity: 0.7 }}>
                          🔒 {r.blog_account || "—"}
                        </span>
                      ) : (
                        <BlogAccountCell
                          row={r}
                          disabled={isSaving}
                          onCommit={(val) => updateField(r, "blog_account", val)}
                        />
                      )}
                    </td>
                    <td style={tdStyle}>
                      {isOwnerRow ? (
                        <span style={{ opacity: 0.7 }}>🔒 {r.plan || "—"}</span>
                      ) : (
                        <select
                          value={r.plan || ""}
                          disabled={isSaving}
                          onChange={(e) => updateField(r, "plan", e.target.value)}
                          style={selectStyle}
                        >
                          {!ALLOWED_PLANS.includes(r.plan) && r.plan && (
                            <option value={r.plan} disabled>{r.plan} (lock)</option>
                          )}
                          {ALLOWED_PLANS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={tdMonoSm}>
                      {r.auth_user_id
                        ? r.auth_user_id.slice(0, 8) + "..."
                        : "—"}
                    </td>
                    <td style={tdMonoSm}>{fmtDate(r.created_at)}</td>
                    <td style={tdMonoSm}>{fmtDate(r.updated_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 91차 신규 — blog_account 인라인 편집 셀
// text input이라 select와 달리 onChange 즉시저장 부적합.
// 로컬 편집 상태 유지 → blur(또는 Enter) 시 변경 있으면 onCommit 호출.
// onCommit 내부에서 confirm + null 정규화 + API 저장 처리.
function BlogAccountCell({ row, disabled, onCommit }) {
  const original = row.blog_account || "";
  const [val, setVal] = useState(original);

  // 부모 재로드로 row.blog_account가 바뀌면 로컬값 동기화
  useEffect(() => {
    setVal(row.blog_account || "");
  }, [row.blog_account]);

  const dirty = (val || "").trim() !== original.trim();

  function commit() {
    if (!dirty) return;
    onCommit(val.trim()); // 빈문자 → API에서 null 매핑 해제 처리
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input
        type="text"
        value={val}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.target.blur();
          } else if (e.key === "Escape") {
            setVal(original);
          }
        }}
        style={{
          ...inputStyle,
          borderColor: dirty ? "#f59e0b" : "#d1d5db",
          background: dirty ? "#fffbeb" : "#fff",
        }}
      />
      {dirty && (
        <span style={{ fontSize: 10, color: "#f59e0b", whiteSpace: "nowrap" }}>
          미저장
        </span>
      )}
    </div>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      padding: "6px 10px",
      borderRadius: 4,
      minWidth: 70,
    }}>
      <div style={{ fontSize: 10, color: "#6b7280" }}>{label}</div>
      <div style={{
        fontSize: 16,
        fontWeight: 600,
        color: color || "#111827",
      }}>{value}</div>
    </div>
  );
}

function fmtDate(s) {
  if (!s) return "—";
  return s.slice(0, 16).replace("T", " ");
}

const btnStyle = {
  padding: "4px 10px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  borderRadius: 4,
};

const filterBtn = {
  padding: "3px 10px",
  fontSize: 11,
  border: "1px solid #d1d5db",
  cursor: "pointer",
  borderRadius: 3,
};

const selectStyle = {
  padding: "2px 6px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  borderRadius: 3,
  background: "#fff",
  cursor: "pointer",
  fontFamily: "inherit",
};

// 91차 신규 — blog_account text input
const inputStyle = {
  padding: "2px 6px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  borderRadius: 3,
  fontFamily: "ui-monospace, monospace",
  width: 120,
  outline: "none",
};

const tblStyle = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: 12,
};
const trhStyle = { background: "#f3f4f6" };
const trStyle = { borderBottom: "1px solid #e5e7eb" };
const thStyle = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #d1d5db",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "5px 8px" };
const tdNum = {
  padding: "5px 8px",
  fontFamily: "ui-monospace, monospace",
  textAlign: "right",
  width: 50,
};
const tdMono = {
  padding: "5px 8px",
  fontFamily: "ui-monospace, monospace",
};
const tdMonoSm = {
  padding: "5px 8px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11,
  color: "#4b5563",
  whiteSpace: "nowrap",
};
