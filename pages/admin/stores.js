// pages/admin/stores.js
// 84차 v0.1 복구 (bak_46cha 기준 + 현 stores-list.js v0.6 응답 구조 매핑)
// 패턴: system.js / mismatch.js 동일 (OWNER_UID import 가드 + Bearer + 표)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { useAdminGuard } from "../../lib/useAdminGuard";

export default function AdminStores() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  // 가드 (B방식: unauth/non-owner → 기존처럼 /login)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState, router]);

  // fetch
  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) { setErr("no_token"); setLoading(false); return; }

      const r = await fetch("/api/admin/stores-list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error || `http_${r.status}`);
        setData(j);
      } else {
        setData(j);
        if (j.ok === false) {
          setErr(j?.diag?.error_message || "rpc_failed");
        }
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) fetchData();
  }, [authed]);

  if (authState === 'unauth' || authState === 'non-owner') return <div style={{ padding: 24 }}>로그인 페이지로 이동 중…</div>;
  if (!authed) return <div style={{ padding: 24 }}>인증 확인 중…</div>;

  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const diag = data?.diag || {};

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 1200 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>/admin/stores</h1>
      <div style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
        read-only · store_profiles · v0.1 (84차)
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "6px 14px", border: "1px solid #ccc",
            background: loading ? "#eee" : "#fff", cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "조회 중…" : "새로고침"}
        </button>
        {err && <span style={{ marginLeft: 12, color: "#c00" }}>error: {err}</span>}
      </div>

      {data && (
        <>
          {/* 진단 패널 — 현 API 구조(diag) 기준 */}
          <div style={{
            border: "1px solid #ddd", padding: 12, marginBottom: 16,
            background: "#fafafa", fontSize: 13,
          }}>
            <div><b>ok:</b>{" "}
              <span style={{ color: data.ok ? "#080" : "#c00" }}>
                {String(data.ok)}
              </span>
            </div>
            <div><b>count:</b> {data.count ?? 0}</div>
            <div><b>version:</b> {diag.version || "-"} · <b>rpc:</b> {diag.rpc || "-"}</div>
            <div>
              <b>rpc_ok:</b>{" "}
              <span style={{ color: diag.rpc_ok ? "#080" : "#c00" }}>
                {String(diag.rpc_ok)}
              </span>
              {typeof diag.rpc_ms === "number" && <> · {diag.rpc_ms}ms</>}
            </div>
            {diag.error_message && (
              <div style={{ marginTop: 8, color: "#c00" }}>
                ⚠ {diag.error_message}
                {diag.error_code && <> ({diag.error_code})</>}
              </div>
            )}
            {diag.exception && (
              <div style={{ marginTop: 8, color: "#c00" }}>
                ⚠ exception: {diag.exception}
              </div>
            )}
          </div>

          {/* 표 */}
          {data.ok && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f0f0f0" }}>
                  <th style={th}>id</th>
                  <th style={th}>store_name</th>
                  <th style={th}>industry</th>
                  <th style={th}>region</th>
                  <th style={th}>blog_account</th>
                  <th style={th}>status</th>
                  <th style={th}>created_at</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "#888" }}>no rows</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.id ?? i}>
                    <td style={td}>{r.id}</td>
                    <td style={td}>{r.store_name}</td>
                    <td style={td}>{r.industry}</td>
                    <td style={td}>{r.region}</td>
                    <td style={td}>{r.blog_account}</td>
                    <td style={td}>{r.status}</td>
                    <td style={td}>{typeof r.created_at === "string" ? r.created_at.slice(0, 19).replace("T", " ") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const th = { border: "1px solid #ddd", padding: "6px 10px", textAlign: "left", fontWeight: 600 };
const td = { border: "1px solid #ddd", padding: "6px 10px" };
