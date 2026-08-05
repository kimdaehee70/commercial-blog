// pages/admin/mismatch.js
// 98차 v0.1.1 — 죽은 네비 링크 1건 수정: /admin/users(404) → /admin/accounts (라벨도 정합). spine/로직/API 무변경.
// 83차 v0.1 — STUB 복구 (bak_46cha 기준)
// - 변경 1건: OWNER_UID 로컬 상수 → lib/constants import (49차 단일 truth 준수)
// - 나머지 UI / 로직 / API 호출 무변경
// - 실 빌드 차단 원인은 API(industry-mismatch.js) 인코딩 깨짐이었음. 페이지는 정상이었음.
//
// 16차 — industry mismatch 가시화 (read-only)
// A: 발행 단위 mismatch / C: store 단위 contamination
// 수정 ❌ / 자동 보정 ❌ / 가시화 only
//
// v2 (19차 — read-only navigation 보강):
//  - B1: store_id 셀 → /admin/stores 링크 (read-only)
//  - B2: pub_id 셀 → /admin/publish 링크 (read-only)
//  - B4: store_id (null) 강조 — orphan publish 가시화
//  - B3 (generated_post_id linkage)는 detail 구조 미고정 → 보류
//  - auto-fix ❌ / rewrite ❌ / reassignment ❌ / logging 증설 ❌

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAdminGuard } from "../../lib/useAdminGuard";

const STATE_COLOR = {
  match: "#16a34a",
  mismatch: "#dc2626",
  no_match: "#6b7280",
  ambiguous: "#f59e0b",
  clean: "#16a34a",
  mixed: "#f59e0b",
  unknown_contamination: "#dc2626",
  unknown_mixed: "#9333ea",
};

const STATE_LABEL = {
  match: "✓ match",
  mismatch: "✗ mismatch",
  no_match: "— no_match",
  ambiguous: "? ambiguous",
  clean: "clean",
  mixed: "mixed",
  unknown_contamination: "unknown",
  unknown_mixed: "unknown+mixed",
};

export default function MismatchPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("a"); // 'a' | 'c'
  const [filter, setFilter] = useState("all");

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
      const r = await fetch("/api/admin/industry-mismatch", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
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
    if (session) await load(session.access_token);
  }

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;
  if (loading) return <div style={{ padding: 24 }}>loading...</div>;
  if (err) return <div style={{ padding: 24, color: "#dc2626" }}>error: {err}</div>;
  if (!data) return null;

  const sumA = data.a_publish_mismatch.summary;
  const sumC = data.c_store_contamination.summary;

  // v2 — orphan publish 카운트 (state와 별개로 store_id null 가시화)
  const orphanCount = data.a_publish_mismatch.rows.filter(r => !r.store_id).length;

  const rowsA = data.a_publish_mismatch.rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "issues") return r.match_state !== "match";
    if (filter === "orphan") return !r.store_id;
    return r.match_state === filter;
  });
  const rowsC = data.c_store_contamination.rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "issues") return r.state !== "clean";
    if (filter === "orphan") return r.store_id === "(null)";
    return r.state === filter;
  });

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Industry Mismatch
          </h1>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {data.generated_at?.replace("T", " ").slice(0, 16)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
          <Link href="/admin/publish" style={navLink}>publish</Link>
          <Link href="/admin/stores" style={navLink}>stores</Link>
          <Link href="/admin/accounts" style={navLink}>accounts</Link>
          <button onClick={refresh} style={{ ...navLink, cursor: "pointer", border: "1px solid #d1d5db", background: "#fff" }}>
            ↻
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: "1px solid #e5e7eb" }}>
        <TabBtn active={tab === "a"} onClick={() => setTab("a")}>
          A. 발행 mismatch ({sumA.mismatch + sumA.no_match + sumA.ambiguous}/{sumA.total})
        </TabBtn>
        <TabBtn active={tab === "c"} onClick={() => setTab("c")}>
          C. store contamination ({sumC.mixed + sumC.unknown_contamination + sumC.unknown_mixed}/{sumC.total_stores})
        </TabBtn>
      </div>

      {/* 필터 (v2 — orphan 필터 추가) */}
      <div style={{ marginBottom: 8, display: "flex", gap: 6, fontSize: 12, flexWrap: "wrap" }}>
        <FilterBtn current={filter} value="all" onClick={setFilter}>all</FilterBtn>
        <FilterBtn current={filter} value="issues" onClick={setFilter}>issues only</FilterBtn>
        <FilterBtn current={filter} value="orphan" onClick={setFilter}>
          🔴 orphan ({orphanCount})
        </FilterBtn>
        {tab === "a" && (
          <>
            <FilterBtn current={filter} value="match" onClick={setFilter}>match</FilterBtn>
            <FilterBtn current={filter} value="mismatch" onClick={setFilter}>mismatch</FilterBtn>
            <FilterBtn current={filter} value="no_match" onClick={setFilter}>no_match</FilterBtn>
            <FilterBtn current={filter} value="ambiguous" onClick={setFilter}>ambiguous</FilterBtn>
          </>
        )}
        {tab === "c" && (
          <>
            <FilterBtn current={filter} value="clean" onClick={setFilter}>clean</FilterBtn>
            <FilterBtn current={filter} value="mixed" onClick={setFilter}>mixed</FilterBtn>
            <FilterBtn current={filter} value="unknown_contamination" onClick={setFilter}>unknown</FilterBtn>
            <FilterBtn current={filter} value="unknown_mixed" onClick={setFilter}>unknown_mixed</FilterBtn>
          </>
        )}
      </div>

      {/* 요약 박스 */}
      {tab === "a" ? <SummaryA s={sumA} orphan={orphanCount} /> : <SummaryC s={sumC} />}

      {/* 테이블 */}
      {tab === "a" ? <TableA rows={rowsA} /> : <TableC rows={rowsC} />}
    </div>
  );
}

const navLink = {
  padding: "4px 10px",
  fontSize: 12,
  color: "#374151",
  textDecoration: "none",
  border: "1px solid #d1d5db",
  borderRadius: 4,
  background: "#fff",
};

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        fontSize: 13,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
        fontWeight: active ? 600 : 400,
        color: active ? "#2563eb" : "#374151",
      }}
    >
      {children}
    </button>
  );
}

function FilterBtn({ current, value, onClick, children }) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      style={{
        padding: "3px 8px",
        fontSize: 11,
        border: "1px solid " + (active ? "#2563eb" : "#d1d5db"),
        background: active ? "#dbeafe" : "#fff",
        color: active ? "#1e40af" : "#374151",
        borderRadius: 3,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SummaryA({ s, orphan }) {
  return (
    <div style={summaryWrap}>
      <Stat label="total" value={s.total} />
      <Stat label="match" value={s.match} color="#16a34a" />
      <Stat label="mismatch" value={s.mismatch} color="#dc2626" bold={s.mismatch > 0} />
      <Stat label="no_match" value={s.no_match} color="#6b7280" />
      <Stat label="ambiguous" value={s.ambiguous} color="#f59e0b" />
      <Stat label="🔴 orphan" value={orphan} color="#dc2626" bold={orphan > 0} />
    </div>
  );
}

function SummaryC({ s }) {
  return (
    <div style={summaryWrap}>
      <Stat label="stores" value={s.total_stores} />
      <Stat label="clean" value={s.clean} color="#16a34a" />
      <Stat label="mixed" value={s.mixed} color="#f59e0b" />
      <Stat label="unknown" value={s.unknown_contamination} color="#dc2626" bold={s.unknown_contamination > 0} />
      <Stat label="unknown_mixed" value={s.unknown_mixed} color="#9333ea" bold={s.unknown_mixed > 0} />
    </div>
  );
}

const summaryWrap = {
  display: "flex",
  gap: 8,
  marginBottom: 12,
  padding: 8,
  background: "#f9fafb",
  borderRadius: 4,
  flexWrap: "wrap",
};

function Stat({ label, value, color = "#111827", bold = false }) {
  return (
    <div style={{ fontSize: 12, padding: "2px 8px" }}>
      <span style={{ color: "#6b7280" }}>{label}: </span>
      <span style={{ color, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}

// v2 — 공통 링크 스타일 (B1/B2)
const cellLink = {
  color: "#2563eb",
  textDecoration: "none",
  borderBottom: "1px dotted #93c5fd",
};

// v2 — orphan store_id 강조 (B4)
function OrphanBadge() {
  return (
    <span
      style={{
        padding: "1px 6px",
        background: "#fee2e2",
        color: "#991b1b",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
      title="orphan publish — store_id 없음 (runtime drift / hydration mismatch 가능성)"
    >
      🔴 orphan
    </span>
  );
}

function TableA({ rows }) {
  if (rows.length === 0) {
    return <div style={{ padding: 24, color: "#6b7280", fontSize: 12 }}>(no rows)</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
            <th style={th}>pub_id</th>
            <th style={th}>title</th>
            <th style={th}>publish_ind</th>
            <th style={th}>generated_ind</th>
            <th style={th}>state</th>
            <th style={th}>gp_id</th>
            <th style={th}>store_id</th>
            <th style={th}>created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOrphan = !r.store_id;
            return (
              <tr
                key={r.publish_id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: isOrphan ? "#fef2f2" : "transparent",
                }}
              >
                {/* B2 — publish 링크 */}
                <td style={td}>
                  <Link href="/admin/publish" style={cellLink} title="open /admin/publish">
                    {r.publish_id}
                  </Link>
                </td>
                <td style={{ ...td, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>
                  {r.title}
                </td>
                <td style={td}>
                  <IndBadge value={r.publish_industry} />
                </td>
                <td style={td}>
                  <IndBadge value={r.generated_industry} />
                </td>
                <td style={td}>
                  <StateBadge state={r.match_state} />
                  {r.match_state === "ambiguous" && (
                    <span style={{ marginLeft: 4, fontSize: 10, color: "#6b7280" }}>
                      ({r.match_count})
                    </span>
                  )}
                </td>
                <td style={td}>{r.generated_post_id ?? "—"}</td>
                {/* B1 + B4 — store_id 링크 / orphan 강조 */}
                <td style={{ ...td, fontFamily: "monospace", fontSize: 10 }}>
                  {isOrphan ? (
                    <OrphanBadge />
                  ) : (
                    <Link href="/admin/stores" style={{ ...cellLink, color: "#6b7280" }} title={r.store_id}>
                      {r.store_id.slice(0, 8)}
                    </Link>
                  )}
                </td>
                <td style={{ ...td, color: "#6b7280" }}>
                  {r.created_at?.replace("T", " ").slice(5, 16)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableC({ rows }) {
  if (rows.length === 0) {
    return <div style={{ padding: 24, color: "#6b7280", fontSize: 12 }}>(no rows)</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
            <th style={th}>store_id</th>
            <th style={th}>state</th>
            <th style={th}>publish_industries</th>
            <th style={th}>generated_industries</th>
            <th style={th}>pub</th>
            <th style={th}>gen</th>
            <th style={th}>distinct</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOrphan = r.store_id === "(null)";
            return (
              <tr
                key={r.store_id}
                style={{
                  borderBottom: "1px solid #f3f4f6",
                  background: isOrphan ? "#fef2f2" : "transparent",
                }}
              >
                {/* B1 + B4 — store_id 링크 / orphan 강조 */}
                <td style={{ ...td, fontFamily: "monospace", fontSize: 10 }}>
                  {isOrphan ? (
                    <OrphanBadge />
                  ) : (
                    <Link href="/admin/stores" style={{ ...cellLink, color: "#374151" }} title={r.store_id}>
                      {r.store_id.slice(0, 12)}
                    </Link>
                  )}
                </td>
                <td style={td}>
                  <StateBadge state={r.state} />
                </td>
                <td style={td}>
                  <IndMap m={r.publish_industries} />
                </td>
                <td style={td}>
                  <IndMap m={r.generated_industries} />
                </td>
                <td style={td}>{r.publish_count}</td>
                <td style={td}>{r.generated_count}</td>
                <td style={td}>{r.distinct_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IndBadge({ value }) {
  if (!value) return <span style={{ color: "#9ca3af" }}>—</span>;
  const isUnknown = value === "unknown";
  return (
    <span
      style={{
        padding: "1px 6px",
        background: isUnknown ? "#fee2e2" : "#f3f4f6",
        color: isUnknown ? "#991b1b" : "#374151",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: isUnknown ? 600 : 400,
      }}
    >
      {value}
    </span>
  );
}

function StateBadge({ state }) {
  return (
    <span
      style={{
        padding: "1px 6px",
        background: STATE_COLOR[state] + "1a",
        color: STATE_COLOR[state] || "#374151",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {STATE_LABEL[state] || state}
    </span>
  );
}

function IndMap({ m }) {
  const entries = Object.entries(m);
  if (entries.length === 0) return <span style={{ color: "#9ca3af" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {entries.map(([k, v]) => (
        <span key={k} style={{ fontSize: 11 }}>
          <IndBadge value={k} />
          <span style={{ color: "#6b7280", marginLeft: 2 }}>×{v}</span>
        </span>
      ))}
    </span>
  );
}

const th = { padding: "6px 8px", fontWeight: 500, fontSize: 11 };
const td = { padding: "6px 8px", verticalAlign: "middle" };
