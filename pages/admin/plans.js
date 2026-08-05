// pages/admin/plans.js
// 84차 v0.2: source 표기 정정 (B안)
//   admin/plans.js는 클라이언트(브라우저)에서 lib/billing/plans.js를 읽는다.
//   해당 모듈의 DB 로드는 SUPABASE_SERVICE_ROLE_KEY(서버 전용 ENV)를 쓰므로
//   브라우저 컨텍스트에선 항상 fallback 경로를 탄다 → source가 늘 'fallback'으로 보였다.
//   단 fallback PLANS는 DB 정본과 1:1 미러(plans.js v0.3)라 표시값 자체는 정확하다.
//   따라서 'fallback'을 'client mirror'로 라벨링해 오해를 제거한다(데이터는 정본과 동일).
//   ※ 서버 실제 source(db/fallback) 확인은 별도 /api 경유 필요 — 결제 정합 단계로 이월.
//
// 82차 v0.1: plans 읽기 전용 UI 신규
// - lib/billing/plans.js listPlans() 호출 → 4 plan 카드 표시
// - is_active=false → 회색 + 비활성 뱃지
// - 편집 없음 / DML 0 / E 진입 단위
// - accounts.js v0.3 UI 컨벤션 준수 (OWNER_UID 가드 / Bearer / supabase auth)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAdminGuard } from "../../lib/useAdminGuard";
import { listPlans, _debugPlansSource } from "../../lib/billing/plans";

const SOURCE_COLOR = {
  db: "#16a34a",
  fallback: "#6b7280",      // client mirror — 정본 미러이므로 경고색 아님
};

// 클라이언트에서 본 source 라벨 정정
function sourceLabel(s) {
  if (!s) return "—";
  if (s === "fallback") return "client mirror";
  return s;
}

export default function PlansPage() {
  const router = useRouter();
  // 공통 가드 (getSession → OWNER_UID 비교는 훅 내부) — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const [plans, setPlans] = useState([]);
  const [source, setSource] = useState(null);

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트 (UX 100% 보존)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState]);

  // owner 확정 시에만 plans 로드 (기존 mount effect의 listPlans/_debugPlansSource 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    setPlans(listPlans());
    setSource(_debugPlansSource());
  }, [authState, session]);

  function refresh() {
    setPlans(listPlans());
    setSource(_debugPlansSource());
  }

  if (authState !== 'owner') return null;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          /admin/plans — 요금제 목록 <span style={{ fontSize: 11, color: "#888", fontWeight: 400, marginLeft: 6 }}>v0.2 (read-only)</span>
        </h1>
        <button onClick={refresh} style={btnStyle}>새로고침</button>
        {source && (
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            source: <span style={{
              color: SOURCE_COLOR[source.source] || "#374151",
              fontWeight: 500,
            }}>{sourceLabel(source.source)}</span>
            {" · "}ids: [{(source.ids || []).join(", ")}]
          </span>
        )}
      </div>

      <div style={{ marginBottom: 12, color: "#6b7280", fontSize: 11 }}>
        읽기 전용 · 브라우저는 lib/billing/plans.js의 정본 미러를 표시(서버 DB값과 동일) · 편집은 DB 직접 수정 후 서버 재배포
      </div>

      <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 11 }}>
        {plans.length} plans
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={tblStyle}>
          <thead>
            <tr style={trhStyle}>
              <th style={thStyle}>sort</th>
              <th style={thStyle}>id</th>
              <th style={thStyle}>label</th>
              <th style={thStyle}>monthly_quota</th>
              <th style={thStyle}>price_krw</th>
              <th style={thStyle}>overage_per_post_krw</th>
              <th style={thStyle}>is_active</th>
              <th style={thStyle}>description</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>
                  no plans
                </td>
              </tr>
            ) : (
              plans.map((p) => {
                const inactive = !p.is_active;
                return (
                  <tr key={p.id} style={{
                    ...trStyle,
                    opacity: inactive ? 0.55 : 1,
                    background: inactive ? "#fafafa" : "transparent",
                  }}>
                    <td style={tdNum}>{p.sort_order ?? "—"}</td>
                    <td style={tdMono}>{p.id}</td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500 }}>{p.label}</span>
                      {inactive && (
                        <span style={inactiveBadge}>비활성</span>
                      )}
                    </td>
                    <td style={tdNum}>{p.monthly_quota}</td>
                    <td style={tdNum}>{fmtKrw(p.price_krw)}</td>
                    <td style={tdNum}>{fmtKrw(p.overage_per_post_krw)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        color: p.is_active ? "#16a34a" : "#9ca3af",
                        fontWeight: 500,
                      }}>
                        {String(!!p.is_active)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "#4b5563", fontSize: 11 }}>
                      {p.description || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#9ca3af" }}>
        ※ 캐시는 서버 모듈 로드 시 1회 채워집니다. DB 변경 후 즉시 반영하려면 서버 재배포 필요.
      </div>
    </div>
  );
}

function fmtKrw(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("ko-KR");
}

const btnStyle = {
  padding: "4px 10px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  borderRadius: 4,
};

const inactiveBadge = {
  marginLeft: 6,
  padding: "1px 6px",
  fontSize: 10,
  border: "1px solid #d1d5db",
  borderRadius: 3,
  background: "#f3f4f6",
  color: "#6b7280",
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
};
const tdMono = {
  padding: "5px 8px",
  fontFamily: "ui-monospace, monospace",
};
