// pages/admin/ops.js — 운영 상태판 (v0.1)
// 126차 신규. 보조감사화면(AdminNav 미사용·자체헤더·SECTIONS '시스템' 카드 진입 전용).
// READ-ONLY 전용. write(insert/update/delete/upsert/rpc-write) 0건.
// 데이터소스 = 살아있는 read-only API 4종만 재사용:
//   · /api/admin/accounts-usage  (quota 4중정합 정본식 출력 — 직접계산 금지·그대로 표시)
//   · /api/admin/publish-list    (status = alive_status alias)
//   · /api/admin/trend           (survival summary/industry/timelines)
//   · /api/admin/stores-list     (rpc get_stores_admin v0.8)
// dead path(industry-mismatch / publish-status) = 호출 안 함.
// 가드 = 보조화면 패턴 동일: 클라 user.id !== OWNER_UID → /login + Bearer 전파.
//
// ※ 이 파일은 설계 산출물(skeleton). 다음 방에서 실 import 경로(supabaseClient/OWNER_UID 상수)만
//    프로젝트 실제 경로로 맞춰 배선하면 됨. 그 외 로직은 read-only 정합 유지.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";   // 실경로 확정(stores.js 동일)
import { useAdminGuard } from "../../lib/useAdminGuard";

const S = {
  wrap: { maxWidth: 1100, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a" },
  head: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: 700, margin: 0 },
  badge: { fontSize: 11, fontWeight: 600, color: "#3b6", border: "1px solid #cead", borderRadius: 6, padding: "2px 6px" },
  sub: { fontSize: 12, color: "#888", margin: "0 0 20px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 20 },
  card: { border: "1px solid #eee", borderRadius: 10, padding: "14px 16px", background: "#fafafa" },
  cardTitle: { fontSize: 12, color: "#999", margin: "0 0 6px", fontWeight: 600 },
  metric: { fontSize: 26, fontWeight: 700, lineHeight: 1.1 },
  metricSub: { fontSize: 12, color: "#888", marginTop: 4 },
  sec: { marginTop: 24 },
  secH: { fontSize: 14, fontWeight: 700, margin: "0 0 10px", borderBottom: "1px solid #eee", paddingBottom: 6 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #eee", color: "#888", fontWeight: 600 },
  td: { padding: "8px 10px", borderBottom: "1px solid #f2f2f2" },
  over: { color: "#d33", fontWeight: 700 },
  ok: { color: "#3a3", fontWeight: 600 },
  err: { fontSize: 12, color: "#c66", padding: "8px 0" },
  loading: { fontSize: 13, color: "#999", padding: "8px 0" },
  refresh: { marginLeft: "auto", fontSize: 12, padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" },
};

// 살아있는 read-only API만. dead path 제외.
const SOURCES = [
  { key: "usage",   url: "/api/admin/accounts-usage" },
  { key: "publish", url: "/api/admin/publish-list" },
  { key: "trend",   url: "/api/admin/trend" },
  { key: "stores",  url: "/api/admin/stores-list" },
];

export default function OpsPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [data, setData] = useState({});   // { usage, publish, trend, stores }
  const [errs, setErrs] = useState({});   // { key: msg }
  const [loading, setLoading] = useState(true);

  // 가드 (B방식: unauth/non-owner → 기존처럼 /login)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token || "";
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const nextData = {};
    const nextErrs = {};
    // GET only. method 미지정 = GET. write 없음.
    await Promise.all(SOURCES.map(async (s) => {
      try {
        const r = await fetch(s.url, { headers });
        if (!r.ok) { nextErrs[s.key] = `${s.url} → ${r.status}`; return; }
        nextData[s.key] = await r.json();
      } catch (e) {
        nextErrs[s.key] = `${s.url} → ${e?.message || "fetch error"}`;
      }
    }));
    setData(nextData);
    setErrs(nextErrs);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;

  // ── 파생 집계 (전부 API 출력 그대로. over_quota는 API 계산값 사용·직접계산 금지) ──
  // accounts-usage 실응답 = { ok, summary:{total_accounts,over_quota_count,...}, rows:[{email,plan_label,monthly_posts,monthly_quota,over_quota,...}] }
  const usageSummary = data.usage?.summary || {};
  const usageRows = normalizeUsage(data.usage);
  const memberCount = usageSummary.total_accounts ?? usageRows.length;
  const overCount = usageSummary.over_quota_count ?? usageRows.filter((u) => u.over).length;

  // publish-list 실응답 = { ok, rows:[{...,published_at,status(=alive_status alias),...}] }
  // 발행여부 = published_at 존재 기준(status는 관측상태지 발행여부 아님). 대기 = published_at 없음.
  const pubRows = Array.isArray(data.publish?.rows) ? data.publish.rows : [];
  const publishedCount = pubRows.filter((r) => r.published_at != null).length;
  const pendingCount = pubRows.filter((r) => r.published_at == null).length;

  // trend 실응답 = { ok, summary:{total_posts,observed_posts,alive_rate,fossil_rate,...}, industry, timelines }
  const trend = data.trend?.summary || {};
  const total = trend.total_posts ?? null;
  const observed = trend.observed_posts ?? null;
  const aliveRate = trend.alive_rate ?? null;
  const fossilRate = trend.fossil_rate ?? null;

  // stores: stores-list.js 실응답 = { ok, count, rows:[...], diag:{} }
  const stores = data.stores;
  const storeRows = Array.isArray(stores?.rows) ? stores.rows : [];
  const storeCount = (typeof stores?.count === "number") ? stores.count : storeRows.length;

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.h1}>운영 상태판</h1>
        <span style={S.badge}>v0.1</span>
        <button style={S.refresh} onClick={load} disabled={loading}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>
      <p style={S.sub}>회원·발행·quota·관측 한눈 상태판 · read-only · 살아있는 API 4종 집계</p>

      {/* 상단 메트릭 카드 */}
      <div style={S.grid}>
        <Metric title="회원 수" value={fmt(memberCount)} sub={`초과 ${overCount}명`} />
        <Metric title="발행(published)" value={fmt(publishedCount)} sub={`대기 ${fmt(pendingCount)}`} />
        <Metric title="관측 글" value={fmt(observed)} sub={total != null ? `전체 ${fmt(total)}` : "-"} />
        <Metric title="alive율" value={pct(aliveRate)} sub={`fossil ${pct(fossilRate)}`} />
        <Metric title="등록 매장" value={fmt(storeCount)} sub="store_profiles" />
      </div>

      {/* 회원·quota 상세 (accounts-usage 정본식 출력 그대로) */}
      <div style={S.sec}>
        <h2 style={S.secH}>회원 · quota</h2>
        {errs.usage ? <div style={S.err}>{errs.usage}</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>계정</th>
                <th style={S.th}>플랜</th>
                <th style={S.th}>사용/quota</th>
                <th style={S.th}>상태</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((u) => (
                <tr key={u.id}>
                  <td style={S.td}>{u.label}</td>
                  <td style={S.td}>{u.plan}</td>
                  <td style={{ ...S.td, ...(u.over ? S.over : null) }}>
                    {u.unlimited ? "발행 ∞" : `${fmt(u.used)}/${fmt(u.quota)}`}
                  </td>
                  <td style={S.td}>{u.over ? <span style={S.over}>초과</span> : <span style={S.ok}>정상</span>}</td>
                </tr>
              ))}
              {usageRows.length === 0 && !loading && (
                <tr><td style={S.td} colSpan={4}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 소스 상태 푸터 (어느 API가 살아있는지 한눈) */}
      <div style={S.sec}>
        <h2 style={S.secH}>소스 상태</h2>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>API</th><th style={S.th}>상태</th></tr>
          </thead>
          <tbody>
            {SOURCES.map((s) => (
              <tr key={s.key}>
                <td style={S.td}>{s.url}</td>
                <td style={S.td}>
                  {errs[s.key] ? <span style={S.over}>{errs[s.key]}</span>
                    : data[s.key] ? <span style={S.ok}>ok</span>
                    : <span style={{ color: "#999" }}>-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ title, value, sub }) {
  return (
    <div style={S.card}>
      <p style={S.cardTitle}>{title}</p>
      <div style={S.metric}>{value}</div>
      <div style={S.metricSub}>{sub}</div>
    </div>
  );
}

// accounts-usage rows[] 정규화 — 실키 고정.
// 실키: email / plan_label / monthly_posts / monthly_quota / over_quota(API계산값·그대로 사용).
function normalizeUsage(raw) {
  const arr = Array.isArray(raw?.rows) ? raw.rows : [];
  return arr.map((a, i) => {
    const used = a.monthly_posts ?? 0;
    const quota = a.monthly_quota ?? null;
    return {
      id: a.id ?? i,
      label: a.email ?? a.display_name ?? `#${a.id ?? i}`,
      plan: a.plan_label ?? "-",
      used,
      quota,
      unlimited: false,
      over: a.over_quota === true, // API 계산값 그대로(직접계산 금지)
    };
  });
}

const fmt = (v) => (v == null ? "-" : String(v));
const pct = (v) => {
  if (v == null) return "-";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return String(v);
  return n <= 1 ? `${Math.round(n * 100)}%` : `${Math.round(n)}%`;
};
