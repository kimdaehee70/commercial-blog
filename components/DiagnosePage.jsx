// DiagnosePage.jsx
// 블로그 SEO 분석 페이지 — 독립 컴포넌트

import { useState, useCallback } from "react";

// ── 유틸 ────────────────────────────────────────────────────
function calcValidCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "")
    .length;
}

function scoreToPercent(score) {
  if      (score >= 95) return 97;
  else if (score >= 90) return 93;
  else if (score >= 85) return 87;
  else if (score >= 80) return 80;
  else if (score >= 75) return 72;
  else if (score >= 70) return 63;
  else if (score >= 65) return 53;
  else if (score >= 60) return 43;
  else if (score >= 50) return 32;
  else                  return 20;
}

function md2html(text) {
  return text
    .replace(/^# (.+)$/gm,    "<h1 style=\"font-size:18px;font-weight:900;color:#4A148C;margin:16px 0 8px\">$1</h1>")
    .replace(/^## (.+)$/gm,   "<h2 style=\"font-size:15px;font-weight:800;color:#4A148C;margin:14px 0 6px\">$1</h2>")
    .replace(/^### (.+)$/gm,  "<h3 style=\"font-size:13px;font-weight:700;color:#37474f;margin:10px 0 4px\">$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,    "<em>$1</em>");
}

const S_ICON  = { pass: "✅", warn: "⚠️", fail: "❌" };
const S_COLOR = { pass: "#2e7d32", warn: "#e65100", fail: "#c62828" };
const S_BG    = { pass: "#e8f5e9", warn: "#fff3e0", fail: "#fce4ec" };
const S_BORDER= { pass: "#a5d6a7", warn: "#ffcc80", fail: "#f48fb1" };

// ── 카드 ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "18px 20px",
      marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.07)",
      border: "1.5px solid #F3E5F5", ...style,
    }}>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export default function DiagnosePage({
  result,
  diagText, setDiagText,
  diagResult, setDiagResult,
  diagLoading, setDiagLoading,
  diagError, setDiagError,
  diagImgCount, setDiagImgCount,
  diagImgAlt, setDiagImgAlt,
  diagImgFile, setDiagImgFile,
  kwResult,
  loading,
  onGoGenerate,
  competitorData,
  suppLoading,
  suppResult,
  suppMemo, setSuppMemo,
  onSupplement,
}) {
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  // ── 저장 글 불러오기 ────────────────────────────────────────
  const [postList, setPostList]         = useState([]);
  const [postListOpen, setPostListOpen] = useState(false);
  const [postListLoading, setPostListLoading] = useState(false);

  const loadPostList = useCallback(async (type = "best") => {
    setPostListLoading(true);
    try {
      const res  = await fetch(`/api/getPosts?type=${type}&limit=30`);
      const data = await res.json();
      if (data.success) setPostList(data.posts || []);
    } catch (e) {
      console.error("getPosts 오류:", e);
    } finally {
      setPostListLoading(false);
      setPostListOpen(true);
    }
  }, []);

  const loadPostContent = useCallback(async (filename, type = "best") => {
    try {
      const res  = await fetch(`/api/getPosts?file=${encodeURIComponent(filename)}&type=${type}`);
      const data = await res.json();
      if (data.success && data.post?.text) {
        setDiagText(data.post.text);
        setPostListOpen(false);
      }
    } catch (e) {
      console.error("글 불러오기 오류:", e);
    }
  }, [setDiagText]);

  // ── 진단 ──────────────────────────────────────────────────
  const diagnose = useCallback(async () => {
    if (!diagText?.trim() || diagText.trim().length < 100) {
      setDiagError("블로그 글을 붙여넣어 주세요 (최소 100자 이상)."); return;
    }
    setDiagError(""); setDiagLoading(true); setDiagResult(null);

    // blogText에서 프로그램명 자동 감지
    const PROGRAM_KEYWORDS = [
  "자연유착쌍꺼풀", "자연유착", "쌍꺼풀",
  "실리프팅", "리프팅",
  "피코레이저", "레이저토닝",
  "눈성형", "코성형", "보톡스", "필러",
  "지방흡입", "울쎄라", "써마지",
];
    const detectedKeyword = PROGRAM_KEYWORDS.find(k => diagText.includes(k)) || "";

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogText: diagText,
          imageCount: diagImgCount,
          imageAlt: diagImgAlt,
          imageFilename: diagImgFile,
          keyword: detectedKeyword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiagResult(data.result);
    } catch (e) {
      setDiagError(e.message || "진단 중 오류 발생");
    } finally {
      setDiagLoading(false);
    }
  }, [diagText, diagImgCount, diagImgAlt, diagImgFile]);

  // ── 복사 ──────────────────────────────────────────────────
  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCaptionCopy = () => {
    if (!result?.text) return;
    const hashtags = result.text.match(/^#\S+/gm)?.join(" ") || "";
    const caption = hashtags || result.text.slice(0, 100);
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  // ── 이미지 점수 계산 ───────────────────────────────────────
  const imgBase    = diagImgCount === 0 ? 0 : diagImgCount <= 2 ? 3 : diagImgCount <= 4 ? 6 : 10;
  const imgTotal   = Math.min(imgBase + 10, 20);
  const dr         = diagResult;
  const baseNoImg  = Math.max(0, (dr?.totalScore || 0) - (dr?.imageScore || 0));
  const scoreAfter = Math.min(baseNoImg + imgTotal, 100);
  const pctBefore  = scoreToPercent(baseNoImg);
  const pctAfter   = scoreToPercent(scoreAfter);
  const imgStatus  = diagImgCount === 0 ? "fail" : imgTotal >= 15 ? "pass" : "warn";

  const score = dr?.totalScore || 0;

  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "\'Noto Sans KR\',sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── 로딩 ── */}
      {(loading || diagLoading) && (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ width: 40, height: 40, border: "4px solid #E1BEE7", borderTopColor: "#8E24AA", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#4A148C" }}>
              {loading ? "✍️ 블로그 생성 중..." : "🔍 SEO 진단 중..."}
            </div>
          </div>
        </Card>
      )}

      {/* ── 글 없을 때 ── */}
      {!loading && !result && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#546e7a", marginBottom: 6 }}>아직 생성된 글이 없습니다</div>
            <div style={{ fontSize: 12, color: "#90a4ae", marginBottom: 16 }}>블로그 생성 탭에서 글을 먼저 만들어주세요</div>
            <button onClick={onGoGenerate} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#4A148C,#7B1FA2)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}>
              ✨ 블로그 생성하러 가기
            </button>
          </div>
        </Card>
      )}

      {!loading && result && (
        <>
          {/* ════════════════════════════════════════
              ① SEO 진단
          ════════════════════════════════════════ */}
          <Card>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#4A148C" }}>📊 SEO 진단</span>
                {dr && (
                  <>
                    <span style={{ fontSize: 32, fontWeight: 900, color: score >= 85 ? "#2e7d32" : score >= 70 ? "#e65100" : "#c62828", lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 13, color: "#9e9e9e" }}>/100</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: score >= 85 ? "#2e7d32" : score >= 70 ? "#e65100" : "#c62828", borderRadius: 20, padding: "3px 12px" }}>{dr.grade}</span>
                    <span style={{ fontSize: 12, color: "#546e7a" }}>{score >= 85 ? "🎉 상단 노출 가능!" : score >= 70 ? "👍 조금만 더!" : "⚠️ 보완 필요"}</span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!dr && !diagLoading && (
                  <button onClick={diagnose} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#4A148C,#7B1FA2)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}>
                    🔍 진단 시작
                  </button>
                )}
                {dr && (
                  <button onClick={diagnose} style={{ padding: "8px 14px", background: "#F3E5F5", border: "none", borderRadius: 8, color: "#8E24AA", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}>
                    🔄 재진단
                  </button>
                )}
                {/* 저장 글 불러오기 */}
                <button
                  onClick={() => postListOpen ? setPostListOpen(false) : loadPostList("best")}
                  style={{ padding: "8px 14px", background: "#e8f5e9", border: "none", borderRadius: 8, color: "#2e7d32", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}
                >
                  {postListLoading ? "⏳ 로딩..." : "📂 저장 글 불러오기"}
                </button>
              </div>

              {/* 저장 글 목록 */}
              {postListOpen && (
                <div style={{ background: "#fff", border: "1.5px solid #a5d6a7", borderRadius: 10, padding: "8px 0", marginTop: 6, maxHeight: 260, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {postList.length === 0 ? (
                    <div style={{ padding: "12px 16px", fontSize: 12, color: "#9e9e9e" }}>저장된 글이 없습니다.</div>
                  ) : (
                    <>
                      <div style={{ padding: "4px 16px 8px", fontSize: 11, color: "#757575", borderBottom: "1px solid #f0f0f0", marginBottom: 4 }}>
                        클릭하면 진단 입력란에 자동으로 불러옵니다
                      </div>
                      {postList.map((post, i) => (
                        <div
                          key={i}
                          onClick={() => loadPostContent(post.filename, "best")}
                          style={{ padding: "8px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f5f5f5" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f1f8e9"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1b5e20" }}>{post.program}</span>
                          <span style={{ fontSize: 11, color: "#757575" }}>{post.date} {post.time} · {post.score}점</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 글자수 미리 표시 (진단 전) */}
            {!dr && !diagLoading && (
              <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "12px 16px", border: "1.5px solid #E1BEE7", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#4A148C" }}>현재 {calcValidCharCount(result.text).toLocaleString()}자 유효</span>
                <span style={{ fontSize: 12, color: calcValidCharCount(result.text) >= 2500 ? "#2e7d32" : "#e65100", fontWeight: 700 }}>
                  {calcValidCharCount(result.text) >= 2500 ? "✅ 2,500자 충족" : `⚠️ ${(2500 - calcValidCharCount(result.text)).toLocaleString()}자 부족`}
                </span>
              </div>
            )}

            {/* ── 점수 텍스트 표 ── */}
            {dr && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "글자수",   score: dr.charScore    ?? (dr.charCount >= 2500 ? 100 : dr.charCount >= 2000 ? 70 : 40), status: dr.charStatus },
                    { label: "제목",     score: dr.titleScore    ?? 0, status: dr.titleStatus },
                    { label: "키워드",   score: dr.keywordScore  ?? 0, status: dr.keywordStatus },
                    { label: "중복",     score: dr.duplicateScore?? 0, status: dr.duplicateStatus },
                    { label: "구조",     score: dr.structureScore?? 0, status: dr.structureStatus },
                    { label: "해시태그", score: dr.hashtagScore  ?? 0, status: dr.hashtagStatus },
                    { label: "CTA",      score: dr.ctaScore      ?? 0, status: dr.ctaStatus },
                    { label: "이미지",   score: imgTotal,              status: imgStatus },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: S_BG[item.status] || "#f5f5f5",
                      border: `1.5px solid ${S_BORDER[item.status] || "#ccc"}`,
                      borderRadius: 10, padding: "10px 8px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: S_COLOR[item.status] || "#666", lineHeight: 1 }}>{item.score}</div>
                      <div style={{ fontSize: 10, color: S_COLOR[item.status], marginTop: 3 }}>{S_ICON[item.status]}</div>
                    </div>
                  ))}
                </div>

                {/* 이미지 장수 입력 */}
                <div style={{ background: "#f8f9ff", border: "1.5px solid #E1BEE7", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4A148C" }}>📸 이미지 장수</span>
                    <div style={{ display: "flex", alignItems: "center", border: "2px solid #8E24AA", borderRadius: 10, overflow: "hidden" }}>
                      <button style={{ width: 32, height: 32, border: "none", background: "#F3E5F5", color: "#8E24AA", fontSize: 18, fontWeight: 900, cursor: "pointer" }}
                        onClick={() => setDiagImgCount(c => Math.max(0, c - 1))}>−</button>
                      <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 900, color: "#4A148C", padding: "0 4px" }}>{diagImgCount}</span>
                      <button style={{ width: 32, height: 32, border: "none", background: "#F3E5F5", color: "#8E24AA", fontSize: 18, fontWeight: 900, cursor: "pointer" }}
                        onClick={() => setDiagImgCount(c => Math.min(20, c + 1))}>+</button>
                    </div>
                    <span style={{ fontSize: 12, color: "#2e7d32", fontWeight: 700 }}>✅ Alt +5 · 파일명 +5 자동 적용</span>
                    {diagImgCount > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", background: "#e8f5e9", borderRadius: 8, padding: "3px 10px", border: "1.5px solid #a5d6a7" }}>
                        이미지 삽입 후 → {scoreAfter}점 / 노출 {pctAfter}% (+{pctAfter - pctBefore}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* 강점 / 보완 */}
                {(dr.strengths?.length > 0 || dr.improvements?.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {dr.strengths?.length > 0 && (
                      <div style={{ background: "#e8f5e9", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #a5d6a7" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#2e7d32", marginBottom: 8 }}>✅ 강점</div>
                        {dr.strengths.map((v, i) => <div key={i} style={{ fontSize: 12, color: "#37474f", marginBottom: 4 }}>· {v}</div>)}
                      </div>
                    )}
                    {dr.improvements?.length > 0 && (
                      <div style={{ background: "#fce4ec", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #f48fb1" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#c62828", marginBottom: 8 }}>❌ 보완 필요</div>
                        {dr.improvements.map((v, i) => <div key={i} style={{ fontSize: 12, color: "#37474f", marginBottom: 4 }}>· {v}</div>)}
                      </div>
                    )}
                  </div>
                )}

                {diagError && (
                  <div style={{ marginTop: 10, background: "#fce4ec", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828" }}>⚠️ {diagError}</div>
                )}
              </>
            )}

            {!dr && diagError && (
              <div style={{ marginTop: 10, background: "#fce4ec", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#c62828" }}>⚠️ {diagError}</div>
            )}
          </Card>

          {/* ════════════════════════════════════════
              ② 경쟁사 분석 + 재가공 엔진
          ════════════════════════════════════════ */}
          {competitorData && (
            <Card style={{ border: "1.5px solid #b39ddb", background: "linear-gradient(135deg,#f3e5f5,#ede7f6)" }}>
              {/* 헤더 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: "#4a148c" }}>🔍 경쟁사 분석</span>
                  <span style={{ background: "#7c4dff", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 8, padding: "2px 8px" }}>
                    "{competitorData.keyword}"
                  </span>
                  {competitorData.blogCount && (
                    <span style={{ fontSize: 11, color: "#7b1fa2" }}>
                      {competitorData.blogCount.toLocaleString()}개 포스팅 · 경쟁도 {competitorData.competition?.level || "보통"}
                    </span>
                  )}
                </div>
                {competitorData.monopolyNote && (
                  <span style={{ fontSize: 11, color: "#6a1b9a", background: "#e1bee7", borderRadius: 8, padding: "3px 10px", fontWeight: 700 }}>
                    {competitorData.monopoly ? "🎯 " : "⚔️ "}{competitorData.monopolyNote}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {/* 경쟁 블로그 유형 */}
                <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #ce93d8" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#6a1b9a", marginBottom: 8 }}>📊 경쟁 블로그 유형</div>
                  {(competitorData.patterns?.types || []).map((t, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#37474f", marginBottom: 4, paddingLeft: 8, borderLeft: "3px solid #ce93d8" }}>· {t}</div>
                  ))}
                </div>
                {/* 공통 약점 */}
                <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #f48fb1" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#c62828", marginBottom: 8 }}>⚠️ 경쟁 글 공통 약점</div>
                  {(competitorData.weaknesses || []).map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#37474f", marginBottom: 4, paddingLeft: 8, borderLeft: "3px solid #f48fb1" }}>· {w}</div>
                  ))}
                </div>
              </div>

              {/* 공략 포인트 */}
              {competitorData.attackPoints?.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #80cbc4", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#00695c", marginBottom: 8 }}>🎯 공략 포인트 (재가공 시 반영)</div>
                  {competitorData.attackPoints.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#37474f", marginBottom: 4, paddingLeft: 8, borderLeft: "3px solid #80cbc4" }}>{a}</div>
                  ))}
                </div>
              )}

              {/* 재가공 메모 입력 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#4a148c", marginBottom: 6 }}>💬 추가 요청사항 (선택)</div>
                <textarea
                  value={suppMemo || ""}
                  onChange={e => setSuppMemo && setSuppMemo(e.target.value)}
                  placeholder="예: 솜사탕 에피소드 더 추가해줘 / 마무리 강화해줘"
                  style={{ width: "100%", minHeight: 56, borderRadius: 10, border: "1.5px solid #ce93d8", padding: "10px 12px", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", resize: "vertical", boxSizing: "border-box", background: "#fafafa" }}
                />
              </div>

              {/* 재가공 버튼 */}
              <button
                onClick={onSupplement}
                disabled={suppLoading}
                style={{
                  width: "100%", padding: "14px 0",
                  background: suppLoading ? "#b39ddb" : "linear-gradient(135deg,#6a1b9a,#7c4dff)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontSize: 15, fontWeight: 800, cursor: suppLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Noto Sans KR',sans-serif", letterSpacing: "0.03em",
                  boxShadow: suppLoading ? "none" : "0 4px 16px rgba(124,77,255,.35)",
                }}
              >
                {suppLoading ? "⏳ 경쟁 이기는 방향으로 재가공 중..." : "🚀 경쟁 글 이기는 방향으로 재가공하기"}
              </button>

              {/* 재가공 완료 안내 */}
              {suppResult && !suppLoading && (
                <div style={{ marginTop: 12, background: "#e8f5e9", borderRadius: 10, padding: "12px 14px", border: "1.5px solid #a5d6a7" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#2e7d32", marginBottom: 4 }}>
                    ✅ 재가공 완료! {suppResult.charCount?.toLocaleString()}자
                    {suppResult.competitorApplied && <span style={{ marginLeft: 8, fontSize: 11, background: "#7c4dff", color: "#fff", borderRadius: 6, padding: "1px 7px" }}>경쟁사 분석 반영</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#388e3c" }}>재진단이 자동으로 실행됩니다. 점수 변화를 확인해 주세요.</div>
                </div>
              )}
            </Card>
          )}

          {/* 경쟁 데이터 없을 때 안내 */}
          {!competitorData && result && dr && (
            <Card style={{ border: "1.5px solid #e0e0e0", background: "#fafafa" }}>
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 13, color: "#90a4ae", marginBottom: 4 }}>🔍 경쟁사 분석 데이터가 없습니다</div>
                <div style={{ fontSize: 12, color: "#bdbdbd" }}>블로그 생성 시 자동으로 수집됩니다</div>
              </div>
            </Card>
          )}

          {/* ════════════════════════════════════════
              ③ 생성된 블로그 글
          ════════════════════════════════════════ */}
          <Card style={{ border: "1.5px solid #E1BEE7" }}>
            {/* 헤더 + 복사 버튼 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#4A148C" }}>📄 생성된 블로그 글</span>
                <span style={{ fontSize: 12, color: "#78909c" }}>{calcValidCharCount(result.text).toLocaleString()}자</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleCaptionCopy}
                  style={{ padding: "7px 14px", background: captionCopied ? "#e8f5e9" : "#fff8e1", border: `1.5px solid ${captionCopied ? "#a5d6a7" : "#ffe082"}`, borderRadius: 8, color: captionCopied ? "#2e7d32" : "#e65100", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}
                >
                  {captionCopied ? "✓ 복사됨" : "📋 캡션 복사"}
                </button>
                <button
                  onClick={handleCopy}
                  style={{ padding: "7px 14px", background: copied ? "#e8f5e9" : "linear-gradient(135deg,#4A148C,#7B1FA2)", border: "none", borderRadius: 8, color: copied ? "#2e7d32" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "\'Noto Sans KR\',sans-serif" }}
                >
                  {copied ? "✓ 복사됨" : "⎘ 전체 복사"}
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div style={{
              fontSize: 13, lineHeight: 1.9, color: "#37474f",
              fontFamily: "\'Noto Sans KR\',sans-serif", wordBreak: "break-word",
              whiteSpace: "pre-wrap", maxHeight: 500, overflowY: "auto",
              background: "#fafbff", borderRadius: 12, padding: "16px 18px",
              border: "1.5px solid #F3E5F5",
            }}
              dangerouslySetInnerHTML={{ __html: md2html(result.text) }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
