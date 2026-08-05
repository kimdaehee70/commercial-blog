// pages/admin/audit.js
// 누락 감사 패널 — 생성된 우수글 중 발행 기록 없는 글 관측
//
// 철학: 관측만 한다. 여기서 자동 등록하지 않는다.
//   "미등록 후보"를 보여주고, 등록은 사용자가 publish 보드에서 수동으로.
//
// 데이터: /api/admin/missing-audit (read-only)

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { useAdminGuard } from "../../lib/useAdminGuard";

export default function AuditPage() {
  const router = useRouter();
  // 공통 가드 (getSession → OWNER_UID 비교는 훅 내부) — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [industryFilter, setIndustryFilter] = useState("all");

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const r = await fetch("/api/admin/missing-audit", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) throw new Error("인증이 만료되었습니다. 다시 로그인해 주세요.");
      if (r.status === 403) throw new Error("관리자 권한이 필요합니다.");
      const j = await r.json();
      if (!j.ok) {
        setErr(j.error || "조회 실패");
      } else {
        setData(j);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트 (UX 100% 보존)
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState]);

  // owner 확정 시에만 데이터 로드 (기존 mount effect의 load() 호출 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    load();
  }, [authState, session]);

  const C = {
    bg: "#0f1115",
    panel: "#171a21",
    line: "#262b35",
    text: "#e6e8ec",
    dim: "#8a909c",
    accent: "#ff7a3d",
    warn: "#ffb340",
    ok: "#4ec98a",
    chipBg: "#1e222b",
  };

  const missing = data?.missing || [];
  const filtered =
    industryFilter === "all"
      ? missing
      : missing.filter((m) => m.industry === industryFilter);

  if (authState === 'checking' || authLoading)
    return <div style={{ padding: 40, color: "#8a909c", background: "#0f1115", minHeight: "100vh" }}>인증 확인 중...</div>;
  if (authState === 'unauth' || authState === 'non-owner')
    return <div style={{ padding: 40, color: "#8a909c", background: "#0f1115", minHeight: "100vh" }}>로그인 페이지로 이동 중...</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
        padding: "32px 28px 80px",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            누락 감사
          </h1>
          <a
            href="/admin/publish"
            style={{ color: C.dim, fontSize: 13, textDecoration: "none" }}
          >
            발행 보드 →
          </a>
        </div>
        <p style={{ color: C.dim, fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
          생성된 우수글(best_posts) 중 <b style={{ color: C.text }}>발행 기록(publish_history)이
          없는 글</b>입니다. 네이버에 발행했지만 URL 등록을 안 했거나, 아직 발행 전인 글입니다.
          <br />
          <span style={{ color: C.warn }}>※ 관측 전용. 자동 등록하지 않습니다.</span> 등록은 발행
          보드에서 수동으로 진행하세요.
        </p>

        {loading && <div style={{ color: C.dim, padding: "40px 0" }}>스캔 중…</div>}

        {err && (
          <div
            style={{
              background: "#2a1416",
              border: "1px solid #5a2a2e",
              color: "#ff9b9b",
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 13,
            }}
          >
            ⚠ {err}
          </div>
        )}

        {!loading && !err && data && (
          <>
            {/* 전체 요약 카드 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <SummaryCard C={C} label="우수글 생성" value={data.totals.bestPosts} />
              <SummaryCard
                C={C}
                label="발행 기록됨"
                value={data.totals.registered}
                color={C.ok}
              />
              <SummaryCard
                C={C}
                label="미등록 후보"
                value={data.totals.missing}
                color={C.warn}
                emphasize
              />
              <SummaryCard
                C={C}
                label="발행 기록 총행"
                value={data.totals.publishHistoryRows}
                color={C.dim}
              />
            </div>

            {/* 업종별 요약 + 필터 */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <FilterChip
                  C={C}
                  active={industryFilter === "all"}
                  onClick={() => setIndustryFilter("all")}
                  label="전체"
                  count={data.totals.missing}
                />
                {data.summary.map((s) => (
                  <FilterChip
                    key={s.industry}
                    C={C}
                    active={industryFilter === s.industry}
                    onClick={() => setIndustryFilter(s.industry)}
                    label={s.industry}
                    count={s.missing}
                    sub={`/${s.total}`}
                  />
                ))}
                <button
                  onClick={load}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: `1px solid ${C.line}`,
                    color: C.dim,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  ↻ 새로고침
                </button>
              </div>
            </div>

            {/* 미등록 리스트 */}
            {filtered.length === 0 ? (
              <div
                style={{
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  borderRadius: 12,
                  padding: "40px 20px",
                  textAlign: "center",
                  color: C.ok,
                  fontSize: 14,
                }}
              >
                ✓ 미등록 후보가 없습니다.
              </div>
            ) : (
              <div
                style={{
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* 헤더 행 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 90px 110px 88px",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: `1px solid ${C.line}`,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.dim,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <div>제목</div>
                  <div>업종</div>
                  <div>점수</div>
                  <div>생성일</div>
                  <div></div>
                </div>

                {filtered.map((m, i) => (
                  <div
                    key={m.file + i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 90px 110px 88px",
                      gap: 12,
                      padding: "13px 16px",
                      borderBottom:
                        i === filtered.length - 1 ? "none" : `1px solid ${C.line}`,
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: 600,
                        }}
                        title={m.title}
                      >
                        {m.title}
                      </div>
                      <div
                        style={{
                          color: C.dim,
                          fontSize: 11,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.region ? `${m.region} · ` : ""}
                        {m.keyword} · {m.file}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          background: C.chipBg,
                          border: `1px solid ${C.line}`,
                          borderRadius: 6,
                          padding: "2px 8px",
                          fontSize: 11,
                          color: C.dim,
                        }}
                      >
                        {m.industry}
                      </span>
                    </div>
                    <div style={{ color: scoreColor(m.score, C) }}>
                      {m.score != null ? `${m.score}점` : "—"}
                    </div>
                    <div style={{ color: C.dim, fontSize: 12 }}>{m.date}</div>
                    <div>
                      <a
                        href={`/admin/publish?prefill=${encodeURIComponent(m.title)}`}
                        style={{
                          display: "inline-block",
                          background: C.accent,
                          color: "#1a0e06",
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        등록 →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ color: C.dim, fontSize: 11, marginTop: 16, lineHeight: 1.7 }}>
              매칭 기준: 우수글 본문 첫 제목 ↔ publish_history.title (공백·구분자·대소문자
              무시 비교).
              <br />
              제목이 크게 수정된 글은 미등록으로 오탐될 수 있습니다. 발행 여부는 네이버 URL로 최종
              확인하세요.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ C, label, value, color, emphasize }) {
  return (
    <div
      style={{
        background: emphasize ? "#211a10" : C.panel,
        border: `1px solid ${emphasize ? "#4a3a1c" : C.line}`,
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: color || C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FilterChip({ C, active, onClick, label, count, sub }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.accent : C.chipBg,
        border: `1px solid ${active ? C.accent : C.line}`,
        color: active ? "#1a0e06" : C.text,
        borderRadius: 8,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: active ? 800 : 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.7, fontSize: 11 }}>
        {count}
        {sub || ""}
      </span>
    </button>
  );
}

function scoreColor(score, C) {
  if (score == null) return C.dim;
  if (score >= 95) return C.ok;
  if (score >= 90) return C.text;
  return C.warn;
}
