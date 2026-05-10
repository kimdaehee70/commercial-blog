// KeywordPage.jsx — 완성형
// components/KeywordPage.jsx — commercial-blog clinic

import { useState } from "react";

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

function SectionTitle({ emoji, text, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>{text}</span>
      {sub && <span style={{ fontSize: 11, color: "#90a4ae", fontWeight: 500 }}>{sub}</span>}
    </div>
  );
}

function analyzeBlogTags(blog) {
  const txt = blog.title + " " + blog.description;
  const tags = [];
  if (/후기|다녀왔|현장|스케치/.test(txt))  tags.push({ label: "후기형",   color: "#7B1FA2", bg: "#F3E5F5" });
  if (/사진|포토|이미지/.test(txt))           tags.push({ label: "사진 많음", color: "#2e7d32", bg: "#e8f5e9" });
  if (/추천|소개|홍보|광고/.test(txt))         tags.push({ label: "홍보형",   color: "#e65100", bg: "#fff3e0" });
  if (/방법|운영|구성|준비/.test(txt))         tags.push({ label: "구조 강함", color: "#6a1b9a", bg: "#f3e5f5" });
  if (/교사|선생님|원장/.test(txt))            tags.push({ label: "교사 관점", color: "#00695c", bg: "#e0f2f1" });
  if (/정보|안내|설명|자료/.test(txt))         tags.push({ label: "정보형",   color: "#546e7a", bg: "#f5f5f5" });
  if (tags.length === 0) tags.push({ label: "일반형", color: "#78909c", bg: "#f5f5f5" });
  return tags.slice(0, 3);
}

export default function KeywordPage({
  kwInput, setKwInput,
  kwLoading, kwResult,
  kwError, kwTab, setKwTab,
  kwSeason, blogPage, setBlogPage,
  diagResult, result,
  onSearch, onGoGenerate, onGoDiagnose, onReset,
  competitorData,
  patternData,
}) {
  const [copied, setCopied] = useState(null);
  const [kwListTab, setKwListTab] = useState("list"); // list | add

  const blogs   = kwResult?.topBlogs || [];
  const allText = blogs.map(b => b.title + " " + b.description).join(" ");
  const total   = blogs.length || 1;

  const afterCount  = blogs.filter(b => /후기|다녀왔|현장/.test(b.title + b.description)).length;
  const photoCount  = blogs.filter(b => /사진|포토|이미지/.test(b.title + b.description)).length;
  const promoCount  = blogs.filter(b => /추천|소개|홍보/.test(b.title + b.description)).length;
  const structCount = blogs.filter(b => /방법|운영|구성|준비/.test(b.title + b.description)).length;
  const teachCount  = blogs.filter(b => /교사|선생님|원장/.test(b.title + b.description)).length;

  const patterns = [];
  if (afterCount  > 0) patterns.push(`후기형 글 ${Math.round(afterCount/total*100)}%`);
  if (photoCount  > 0) patterns.push(`사진 위주 ${Math.round(photoCount/total*100)}%`);
  if (promoCount  > 0) patterns.push(`홍보·소개형 ${Math.round(promoCount/total*100)}%`);
  if (structCount > 0) patterns.push(`구조 설명형 ${Math.round(structCount/total*100)}%`);
  if (teachCount  > 0) patterns.push(`교육기관형 ${Math.round(teachCount/total*100)}%`);
  if (patterns.length === 0) patterns.push("일반 정보형 글 다수");

  const strategyConclusion =
    afterCount  >= total * 0.5 ? "현장 후기 + 사진 중심 글이 유리" :
    structCount >= total * 0.4 ? "구조·운영 디테일형 글이 유리" :
    promoCount  >= total * 0.5 ? "차별화된 체험 후기형 글이 유리" :
    "현장감 있는 에피소드 중심 글이 유리";

  const opportunities = [];
  if (photoCount  < total * 0.5)           opportunities.push({ icon: "❌", text: "사진 캡션·ALT 없음 — 이미지 SEO 취약" });
  if (teachCount  < total * 0.3)           opportunities.push({ icon: "❌", text: "교사 관점·운영 설명 부족" });
  if (structCount < total * 0.3)           opportunities.push({ icon: "❌", text: "동선·교실 구성 디테일 부족" });
  if (!/반응|환호|웃음/.test(allText))      opportunities.push({ icon: "❌", text: "아이 반응 묘사 없음" });
  if (!/에피소드|기억|순간/.test(allText))  opportunities.push({ icon: "❌", text: "현장 에피소드 없음" });
  if (!/CTA|문의|연락|상담/.test(allText))  opportunities.push({ icon: "❌", text: "CTA (문의 유도 문장) 없음" });
  if (opportunities.length === 0) opportunities.push({ icon: "⚠️", text: "경쟁이 강함 — 독창적 차별화 필수" });

  const winningTip =
    opportunities.some(o => o.text.includes("교실")) ? "교실 구성 + 동선 + 사진 설명 강화" :
    opportunities.some(o => o.text.includes("에피소드")) ? "현장 에피소드 + 아이 반응 묘사 강화" :
    opportunities.some(o => o.text.includes("CTA")) ? "문의·상담 유도 문장 + 차별화 강조" :
    "후기 중심 + 사진 SEO 최적화";

  const myText  = result?.text || "";
  const myScore = diagResult?.totalScore || 0;
  const kwScore = kwResult?.competition?.score ?? 2;

  const myMetrics = [
    { label: "구조",     mine: /##|소제목|단계|순서/.test(myText),      comp: structCount > total * 0.3 },
    { label: "키워드",   mine: diagResult?.keywordScore >= 80,            comp: true },
    { label: "사진",     mine: diagResult?.imageScore >= 10,              comp: photoCount > total * 0.4 },
    { label: "에피소드", mine: /아이|친구|웃음|반응|환호/.test(myText),   comp: afterCount > total * 0.3 },
    { label: "CTA",      mine: diagResult?.ctaScore >= 80,                comp: /문의|연락|상담/.test(allText) },
  ];

  const verdict =
    myScore >= 80 && kwScore <= 2 ? { text: "🏆 지금 바로 발행!", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" } :
    myScore >= 70 && kwScore <= 3 ? { text: "✅ 약간 보완 후 발행", color: "#7B1FA2", bg: "#F3E5F5", border: "#CE93D8" } :
    myScore >= 60 ? { text: "⚠️ 보완 후 발행 권장", color: "#e65100", bg: "#fff3e0", border: "#ffcc80" } :
    { text: "🔧 수정 필요", color: "#c62828", bg: "#fce4ec", border: "#f48fb1" };

  const competitionLabel =
    kwScore <= 1 ? { text: "약함",    color: "#2e7d32", bg: "#e8f5e9" } :
    kwScore <= 2 ? { text: "보통",    color: "#7B1FA2", bg: "#F3E5F5" } :
    kwScore <= 3 ? { text: "강함",    color: "#e65100", bg: "#fff3e0" } :
    { text: "매우 강함", color: "#c62828", bg: "#fce4ec" };

  return (
    <div style={{ fontFamily: "'Noto Sans KR',sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ════════════════════════════════════════
          키워드 수명 관리 (뼈대 — 로직은 추후 연결)
      ════════════════════════════════════════ */}
      <Card style={{ border: "1.5px solid #b39ddb", background: "linear-gradient(135deg,#f3e5f5,#ede7f6)", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#4a148c" }}>📋 키워드 관리</span>
            <span style={{ fontSize: 11, background: "#7c4dff", color: "#fff", borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>수명 추적</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["list", "add"].map(t => (
              <button key={t} onClick={() => setKwListTab(t)}
                style={{ padding: "5px 12px", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif",
                  background: kwListTab === t ? "#7c4dff" : "#F3E5F5",
                  color: kwListTab === t ? "#fff" : "#5c6bc0" }}>
                {t === "list" ? "📋 목록" : "➕ 등록"}
              </button>
            ))}
          </div>
        </div>

        {kwListTab === "list" && (
          <KeywordListPanel competitorData={competitorData} kwResult={kwResult} />
        )}
        {kwListTab === "add" && (
          <KeywordAddPanel kwInput={kwInput} setKwInput={setKwInput} onSearch={onSearch} kwLoading={kwLoading} />
        )}
      </Card>

      {/* ════════════════════════════════════════
          📈 시스템 성장 현황
      ════════════════════════════════════════ */}
      <PatternStatusCard patternData={patternData} />

      {/* ════════════════════════════════════════
          🔍 경쟁글 분석 — 상단글 패턴 추출
      ════════════════════════════════════════ */}
      <CompetitorAnalysisCard />

      {/* 검색창 */}
      <Card>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{ flex: 1, border: "1.5px solid #E1BEE7", borderRadius: 12, padding: "13px 16px", fontSize: 15, fontFamily: "'Noto Sans KR',sans-serif", outline: "none" }}
            type="text"
            placeholder="예: 강남 피코레이저 후기"
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSearch()}
          />
          <button onClick={() => onSearch()} disabled={kwLoading}
            style={{ padding: "13px 24px", border: "none", borderRadius: 12, background: kwLoading ? "#b0bec5" : "linear-gradient(135deg,#4A148C,#7B1FA2)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: kwLoading ? "not-allowed" : "pointer", fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: "nowrap" }}>
            {kwLoading ? "분석중..." : "🔍 분석"}
          </button>
        </div>
        {!kwResult && kwSeason?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#90a4ae", fontWeight: 700, marginBottom: 8 }}>📅 이번 달 추천</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {kwSeason.map(kw => (
                <button key={kw} onClick={() => { setKwInput(kw); onSearch(kw); }}
                  style={{ background: "#F3E5F5", color: "#8E24AA", border: "1px solid #E1BEE7", borderRadius: 20, padding: "5px 13px", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {kwError && <div style={{ background: "#fce4ec", borderRadius: 12, padding: "12px 16px", marginBottom: 12, fontSize: 13, color: "#c62828", fontWeight: 700 }}>❌ {kwError}</div>}

      {kwLoading && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ width: 44, height: 44, border: "4px solid #e0e0e0", borderTopColor: "#7B1FA2", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7B1FA2" }}>네이버에서 데이터를 가져오는 중...</div>
          </div>
        </Card>
      )}

      {kwResult && !kwLoading && (
        <>
          <button onClick={onReset}
            style={{ background: "none", border: "none", color: "#5c6bc0", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12, fontFamily: "'Noto Sans KR',sans-serif" }}>
            ← 새 키워드 분석
          </button>

          {/* ① 핵심 요약 */}
          <Card>
            <SectionTitle emoji="📊" text="핵심 요약" sub={`— ${kwResult.keyword}`} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              <div style={{ background: myScore >= 80 ? "#e8f5e9" : myScore >= 60 ? "#fff3e0" : myScore > 0 ? "#fce4ec" : "#f5f5f5", borderRadius: 14, padding: "14px 12px", textAlign: "center", border: "1.5px solid #F3E5F5" }}>
                <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 700, marginBottom: 4 }}>현재 점수</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: myScore >= 80 ? "#2e7d32" : myScore >= 60 ? "#e65100" : myScore > 0 ? "#c62828" : "#90a4ae", lineHeight: 1 }}>{myScore || "—"}</div>
                <div style={{ fontSize: 10, color: "#78909c", marginTop: 4 }}>{myScore ? `노출 ${scoreToPercent(myScore)}%` : "진단 필요"}</div>
              </div>
              <div style={{ background: "#f8f9ff", borderRadius: 14, padding: "14px 12px", textAlign: "center", border: "1.5px solid #F3E5F5" }}>
                <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 700, marginBottom: 4 }}>내 위치</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>
                  {myScore >= 80 ? "상단 가능" : myScore >= 65 ? "중상위권" : myScore > 0 ? "중위권" : "—"}
                </div>
                <div style={{ fontSize: 10, color: "#78909c", marginTop: 4 }}>{myScore >= 80 ? "🎉 발행 가능!" : myScore > 0 ? "📝 보완 필요" : "글 생성 필요"}</div>
              </div>
              <div style={{ background: competitionLabel.bg, borderRadius: 14, padding: "14px 12px", textAlign: "center", border: "1.5px solid #F3E5F5" }}>
                <div style={{ fontSize: 11, color: "#546e7a", fontWeight: 700, marginBottom: 4 }}>경쟁 강도</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: competitionLabel.color }}>{competitionLabel.text}</div>
                <div style={{ fontSize: 10, color: "#78909c", marginTop: 4 }}>{kwResult.blogCount.toLocaleString()}개 글</div>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg,#F3E5F5,#f3f4ff)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #E1BEE7" }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <div>
                <span style={{ fontSize: 11, color: "#546e7a", fontWeight: 700 }}>추천 전략 </span>
                <span style={{ fontSize: 13, fontWeight: 900, color: "#4A148C" }}>{strategyConclusion}</span>
              </div>
            </div>
          </Card>

          {/* ② 경쟁 블로그 TOP 5 */}
          <Card>
            <SectionTitle emoji="🏆" text="상위 노출 글 TOP 5" sub="— 실제 네이버 검색 결과" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {blogs.slice(0, 5).map((blog, i) => {
                const tags = analyzeBlogTags(blog);
                const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7f32" : "#E1BEE7";
                return (
                  <div key={i} style={{ background: "#f8f9ff", borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${rankColor}`, border: "1.5px solid #F3E5F5", borderLeftWidth: 4, borderLeftColor: rankColor, borderLeftStyle: "solid" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: rankColor, minWidth: 20 }}>{i+1}.</span>
                      <a href={blog.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 700, color: "#7B1FA2", textDecoration: "none", lineHeight: 1.4, flex: 1 }}>
                        {blog.title}
                      </a>
                    </div>
                    <div style={{ fontSize: 11, color: "#90a4ae", marginBottom: 6, marginLeft: 28 }}>
                      ✍️ {blog.bloggerName} · 📅 {blog.postDate}
                    </div>
                    <div style={{ fontSize: 12, color: "#546e7a", lineHeight: 1.5, marginBottom: 8, marginLeft: 28 }}>
                      {blog.description?.slice(0, 90)}...
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginLeft: 28 }}>
                      {tags.map((tag, ti) => (
                        <span key={ti} style={{ fontSize: 11, fontWeight: 700, color: tag.color, background: tag.bg, borderRadius: 20, padding: "3px 10px" }}>
                          ✔ {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ③ 경쟁 패턴 분석 */}
          <Card>
            <SectionTitle emoji="📊" text="경쟁 패턴 분석" sub="— 자동 요약" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {patterns.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8f9ff", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #F3E5F5" }}>
                  <span style={{ fontSize: 13, color: "#546e7a" }}>·</span>
                  <span style={{ fontSize: 13, color: "#37474f", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(135deg,#4A148C,#7B1FA2)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>👉</span>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginBottom: 2 }}>결론</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>"{strategyConclusion}"</div>
              </div>
            </div>
          </Card>

          {/* ④ 공략 포인트 */}
          <Card style={{ border: "2px solid #ffe082" }}>
            <SectionTitle emoji="🔥" text="공략 포인트" sub="— 경쟁 글의 빈틈" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {opportunities.map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff8e1", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #ffe082" }}>
                  <span style={{ fontSize: 14, minWidth: 20 }}>{o.icon}</span>
                  <span style={{ fontSize: 13, color: "#37474f", fontWeight: 600 }}>{o.text}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(135deg,#e65100,#f57c00)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginBottom: 2 }}>이렇게 쓰면 이김</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>"{winningTip}"</div>
              </div>
            </div>
          </Card>

          {/* ⑤ 내 글 vs 경쟁 비교 */}
          {result ? (
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                <SectionTitle emoji="📈" text="내 글 vs 경쟁 비교" />
                <div style={{ background: verdict.bg, border: `1.5px solid ${verdict.border}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 800, color: verdict.color }}>
                  {verdict.text}
                </div>
              </div>
              {/* 헤더 */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div />
                <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#4A148C" }}>내 글</div>
                <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#546e7a" }}>경쟁 평균</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {myMetrics.map((m, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#546e7a" }}>{m.label}</span>
                    <div style={{ background: m.mine ? "#e8f5e9" : "#fce4ec", borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: m.mine ? "#2e7d32" : "#c62828" }}>
                      {m.mine ? "✔ 좋음" : "❌ 부족"}
                    </div>
                    <div style={{ background: m.comp ? "#F3E5F5" : "#f5f5f5", borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: m.comp ? "#8E24AA" : "#90a4ae" }}>
                      {m.comp ? "강함" : "약함"}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #F3E5F5" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#8E24AA", marginBottom: 8 }}>📊 경쟁 평균 대비 분석</div>
                {myMetrics.filter(m => !m.mine && m.comp).length > 0 ? (
                  myMetrics.filter(m => !m.mine && m.comp).map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#c62828", marginBottom: 4 }}>· {m.label} 부족 → 보강 필요</div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: "#2e7d32" }}>✅ 경쟁 대비 전반적으로 좋음!</div>
                )}
                {myMetrics.filter(m => m.mine && !m.comp).map((m, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#2e7d32", marginBottom: 4 }}>· {m.label} 우위 — 차별화 강점</div>
                ))}
              </div>
            </Card>
          ) : (
            <Card style={{ textAlign: "center", padding: "24px 20px" }}>
              <div style={{ fontSize: 13, color: "#90a4ae", marginBottom: 12 }}>내 글이 없어 비교할 수 없습니다</div>
              <button onClick={onGoGenerate}
                style={{ padding: "10px 24px", background: "linear-gradient(135deg,#4A148C,#7B1FA2)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>
                ✍️ 블로그 생성하러 가기
              </button>
            </Card>
          )}

          {/* ⑥ 액션 버튼 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button onClick={() => { onReset(); onGoGenerate(); }}
              style={{ padding: "14px 0", background: "linear-gradient(135deg,#4A148C,#7B1FA2)", border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", boxShadow: "0 4px 12px rgba(26,35,126,.3)" }}>
              ✍️ 이 키워드로 글 생성
            </button>
            <button onClick={onGoDiagnose}
              style={{ padding: "14px 0", background: result ? "linear-gradient(135deg,#4a148c,#7b1fa2)" : "#e0e0e0", border: "none", borderRadius: 12, color: result ? "#fff" : "#9e9e9e", fontSize: 13, fontWeight: 800, cursor: result ? "pointer" : "default", fontFamily: "'Noto Sans KR',sans-serif" }}>
              🔍 {result ? "진단 탭에서 수정" : "글 먼저 생성 필요"}
            </button>
          </div>

          {/* 시즌 + 연관 키워드 + 제목 추천 + 뉴스 */}
          {kwResult.seasonKeywords?.length > 0 && (
            <Card style={{ background: "#f8f9ff" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#8E24AA", marginBottom: 10 }}>📅 이번 달 시즌 키워드</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {kwResult.seasonKeywords.map(kw => (
                  <button key={kw} onClick={() => { setKwInput(kw); onSearch(kw); }}
                    style={{ background: "#F3E5F5", color: "#8E24AA", border: "1px solid #E1BEE7", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600 }}>
                    {kw}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {kwResult.relatedKeywords?.length > 0 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", marginBottom: 10 }}>🏷️ 연관 키워드 <span style={{ fontSize: 11, color: "#90a4ae", fontWeight: 500 }}>클릭하면 바로 분석</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {kwResult.relatedKeywords.map((kw, i) => (
                  <button key={i} onClick={() => { setKwInput(kw); onSearch(kw); }}
                    style={{ background: "#f0f2f5", color: "#8E24AA", border: "1.5px solid #E1BEE7", borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", fontWeight: 600 }}>
                    {kw}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {kwResult.titleSuggestions?.length > 0 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", marginBottom: 10 }}>✍️ 블로그 제목 추천</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {kwResult.titleSuggestions.map((title, i) => (
                  <div key={i} style={{ background: "#f8f9ff", borderRadius: 10, padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, border: "1.5px solid #F3E5F5" }}>
                    <span style={{ fontSize: 12, color: "#37474f", lineHeight: 1.5, flex: 1 }}>📌 {title}</span>
                    <button onClick={() => { navigator.clipboard.writeText(title); setCopied(i); setTimeout(() => setCopied(null), 2000); }}
                      style={{ background: copied === i ? "#e8f5e9" : "#8E24AA", color: copied === i ? "#2e7d32" : "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Noto Sans KR',sans-serif" }}>
                      {copied === i ? "✓" : "복사"}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {kwResult.recentNews?.length > 0 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", marginBottom: 10 }}>📰 최신 뉴스</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {kwResult.recentNews.map((news, i) => (
                  <div key={i} style={{ background: "#f8f9ff", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #F3E5F5" }}>
                    <a href={news.link} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#7B1FA2", textDecoration: "none", fontWeight: 700, display: "block", marginBottom: 3 }}>
                      {news.title}
                    </a>
                    <div style={{ fontSize: 10, color: "#90a4ae" }}>📅 {news.pubDate}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── 키워드 목록 패널 ─────────────────────────────────────────
function KeywordListPanel({ competitorData, kwResult }) {
  const STORAGE_KEY = "banjang_kw_list_v1";
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });

  const saveList = (data) => {
    setList(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  };

  const removeKw = (idx) => saveList(list.filter((_, i) => i !== idx));

  const autoKw   = competitorData?.keyword || kwResult?.keyword || null;
  const alreadyIn = autoKw && list.some(k => k.keyword === autoKw);

  const addAutoKw = () => {
    if (!autoKw || alreadyIn) return;
    saveList([{ keyword: autoKw, blogCount: kwResult?.blogCount || 0, competitionLevel: kwResult?.competition?.level || "보통", status: "사용중", addedAt: new Date().toISOString().slice(0, 10) }, ...list]);
  };

  const STATUS_COLOR = {
    "초기":   { bg: "#e8f5e9", color: "#2e7d32",  border: "#a5d6a7" },
    "사용중": { bg: "#F3E5F5", color: "#7B1FA2",  border: "#CE93D8" },
    "포화":   { bg: "#fce4ec", color: "#c62828",  border: "#f48fb1" },
  };

  const cycleStatus = (idx) => {
    const order = ["초기", "사용중", "포화"];
    const next  = order[(order.indexOf(list[idx].status || "초기") + 1) % order.length];
    saveList(list.map((k, i) => i === idx ? { ...k, status: next } : k));
  };

  if (list.length === 0 && !autoKw) return (
    <div style={{ textAlign: "center", padding: "16px 0", color: "#90a4ae", fontSize: 13 }}>
      아직 등록된 키워드가 없습니다<br />
      <span style={{ fontSize: 11 }}>블로그 생성 후 자동 추가되거나 ➕ 등록으로 추가하세요</span>
    </div>
  );

  return (
    <div>
      {autoKw && !alreadyIn && (
        <div style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", marginBottom: 10, border: "1.5px solid #ce93d8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#4a148c" }}><strong>"{autoKw}"</strong> 키워드를 목록에 추가할까요?</div>
          <button onClick={addAutoKw} style={{ padding: "5px 12px", background: "#7c4dff", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>➕ 추가</button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((k, i) => {
          const sc = STATUS_COLOR[k.status] || STATUS_COLOR["초기"];
          return (
            <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #F3E5F5", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#4A148C", marginBottom: 2 }}>{k.keyword}</div>
                <div style={{ fontSize: 11, color: "#90a4ae" }}>{k.blogCount ? `${k.blogCount.toLocaleString()}개 · ` : ""}경쟁도 {k.competitionLevel} · {k.addedAt}</div>
              </div>
              <button onClick={() => cycleStatus(i)} style={{ padding: "4px 10px", background: sc.bg, color: sc.color, border: `1.5px solid ${sc.border}`, borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", whiteSpace: "nowrap" }}>{k.status || "초기"}</button>
              <button onClick={() => removeKw(i)} style={{ background: "none", border: "none", color: "#bdbdbd", fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "#b39ddb", marginTop: 8, textAlign: "right" }}>상태 클릭 시 초기→사용중→포화 순 변경</div>
    </div>
  );
}

// ── 키워드 등록 패널 ─────────────────────────────────────────
function KeywordAddPanel({ kwInput, setKwInput, onSearch, kwLoading }) {
  const STORAGE_KEY = "banjang_kw_list_v1";
  const [input, setInput] = useState("");

  const addManual = () => {
    if (!input.trim()) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (saved.some(k => k.keyword === input.trim())) { alert("이미 등록된 키워드입니다."); return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([{ keyword: input.trim(), blogCount: 0, competitionLevel: "분석 전", status: "초기", addedAt: new Date().toISOString().slice(0, 10) }, ...saved]));
      setInput("");
      alert(`"${input.trim()}" 등록 완료!`);
    } catch {}
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "#4a148c", fontWeight: 700, marginBottom: 8 }}>직접 키워드 등록</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addManual()}
          placeholder="예: 강남 피코레이저 후기"
          style={{ flex: 1, border: "1.5px solid #ce93d8", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "'Noto Sans KR',sans-serif", outline: "none" }} />
        <button onClick={addManual} style={{ padding: "10px 18px", background: "#7c4dff", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>등록</button>
      </div>
      <div style={{ fontSize: 11, color: "#b39ddb", marginTop: 8 }}>등록 후 키워드 분석 탭에서 검색하면 경쟁도·포스팅수가 자동 반영됩니다</div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// 📊 패턴 현황 카드
// ══════════════════════════════════════════════════════════════
// ════════════════════════════════════════
// 경쟁글 분석 컴포넌트
// ════════════════════════════════════════
function CompetitorAnalysisCard() {
  const [text, setText]           = useState("");
  const [keyword, setKeyword]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [saved, setSaved]         = useState(false);

  const analyze = async () => {
    if (!text.trim() || text.trim().length < 100) {
      setError("상단글을 100자 이상 붙여넣어 주세요."); return;
    }
    setError(""); setLoading(true); setResult(null); setSaved(false);

    try {
      const res  = await fetch("/api/extractCompetitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      setResult(data.patterns);
      setSaved(data.saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg,#fff8e1,#fff3e0)",
      border: "1.5px solid #ffcc02",
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#e65100" }}>🔍 경쟁글 분석</span>
        <span style={{ fontSize: 11, background: "#ff6d00", color: "#fff", borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>
          상단글 패턴 추출
        </span>
      </div>

      {/* 안내 */}
      <div style={{ fontSize: 12, color: "#bf360c", marginBottom: 10, lineHeight: 1.6 }}>
        네이버 상단 글을 복사해서 붙여넣으세요.<br />
        <span style={{ color: "#e65100", fontWeight: 700 }}>글 전체가 아닌 구조·패턴만 추출</span>합니다. 복제 아닙니다.
      </div>

      {/* 키워드 입력 */}
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="예: 자연유착 쌍꺼풀, 실리프팅"
        style={{ width: "100%", border: "1.5px solid #ffcc02", borderRadius: 10, padding: "9px 12px",
          fontSize: 13, fontFamily: "'Noto Sans KR',sans-serif", marginBottom: 8, boxSizing: "border-box",
          outline: "none", background: "#fffde7" }}
      />

      {/* 글 입력 */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="네이버 상단 블로그 글을 여기에 붙여넣으세요..."
        style={{ width: "100%", minHeight: 100, border: "1.5px solid #ffcc02", borderRadius: 10,
          padding: "10px 12px", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif",
          resize: "vertical", boxSizing: "border-box", outline: "none", background: "#fffde7" }}
      />

      {/* 글자수 */}
      {text.length > 0 && (
        <div style={{ fontSize: 11, color: "#e65100", textAlign: "right", marginTop: 2, marginBottom: 6 }}>
          {text.replace(/\s/g, "").length.toLocaleString()}자 입력됨
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{ fontSize: 12, color: "#c62828", background: "#ffebee", borderRadius: 8,
          padding: "8px 12px", marginBottom: 8 }}>{error}</div>
      )}

      {/* 분석 버튼 */}
      <button
        onClick={analyze}
        disabled={loading}
        style={{ width: "100%", padding: "12px 0", background: loading ? "#ffcc80" : "linear-gradient(135deg,#ff6d00,#ff8f00)",
          border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Noto Sans KR',sans-serif", marginBottom: 10 }}
      >
        {loading ? "⏳ 패턴 추출 중..." : "🔍 패턴 추출하기"}
      </button>

      {/* 결과 */}
      {result && (
        <div style={{ background: "#fff", border: "1.5px solid #ffe082", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#e65100", marginBottom: 10 }}>
            ✅ 추출 완료 {saved && <span style={{ fontSize: 11, background: "#2e7d32", color: "#fff", borderRadius: 6, padding: "2px 8px", marginLeft: 6 }}>패턴DB 저장됨</span>}
          </div>

          {result.structures?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#bf360c", marginBottom: 4 }}>📐 구조 패턴</div>
              {result.structures.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: "#37474f", background: "#fff8e1", borderRadius: 6,
                  padding: "4px 10px", marginBottom: 4 }}>· {s}</div>
              ))}
            </div>
          )}

          {result.details?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#bf360c", marginBottom: 4 }}>⚙️ 운영 디테일</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {result.details.map((d, i) => (
                  <span key={i} style={{ fontSize: 11, background: "#fff3e0", color: "#e65100",
                    borderRadius: 6, padding: "3px 8px", border: "1px solid #ffcc02" }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {result.sentences?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#bf360c", marginBottom: 4 }}>✍️ 장면 패턴</div>
              {result.sentences.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: "#37474f", background: "#fff8e1", borderRadius: 6,
                  padding: "4px 10px", marginBottom: 4, fontStyle: "italic" }}>· {s}</div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: "#9e9e9e", marginTop: 10, borderTop: "1px solid #ffe082", paddingTop: 8 }}>
            💡 위 패턴은 다음 글 생성 시 자동으로 참고됩니다. 복제가 아닌 구조·방식만 반영됩니다.
          </div>
        </div>
      )}
    </div>
  );
}

function PatternStatusCard({ patternData }) {
  const [open, setOpen] = useState(false);

  // patternData 없거나 비어있으면 빈 상태 표시
  const p        = patternData?.patterns || {};
  const total    = patternData?.totalSaved || 0;
  const updated  = patternData?.updatedAt
    ? new Date(patternData.updatedAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
    : null;

  // competitor 버킷 집계
  const competitorPrograms = Object.entries(patternData?.programs || {})
    .filter(([k]) => k.endsWith("_competitor"))
    .map(([k, v]) => ({
      name: k.replace("_competitor", ""),
      structures: (v.structures || []).length,
      details:    (v.details    || []).length,
    }));
  const hasCompetitor = competitorPrograms.length > 0;

  const structures = p.structures || [];
  const sentences  = p.sentences  || [];
  const details    = p.details    || [];
  const openings   = p.openings   || [];
  const closings   = p.closings   || [];

  const MAX = 10; // 적용률 기준 최대값
  const pctBar = (count) => Math.min(Math.round((count / MAX) * 100), 100);

  const barColor = (pct) =>
    pct >= 70 ? "#2e7d32" : pct >= 40 ? "#7B1FA2" : "#e65100";

  const isEmpty = total === 0;

  return (
    <div style={{
      background: "linear-gradient(135deg,#e8f5e9,#f1f8e9)",
      border: "1.5px solid #a5d6a7",
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isEmpty ? 0 : 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: "#1b5e20" }}>📈 시스템 성장 현황</span>
          {total > 0 && (
            <span style={{ fontSize: 11, background: "#2e7d32", color: "#fff", borderRadius: 8, padding: "2px 8px", fontWeight: 700 }}>
              글 {total}편 학습 완료
            </span>
          )}
        </div>
        {!isEmpty && (
          <button onClick={() => setOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#2e7d32", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }}>
            {open ? "접기 ▲" : "자세히 ▼"}
          </button>
        )}
      </div>

      {/* 비어있을 때 */}
      {isEmpty && (
        <div style={{ textAlign: "center", padding: "12px 0", color: "#81c784", fontSize: 13 }}>
          아직 데이터가 없습니다<br />
          <span style={{ fontSize: 11 }}>글을 생성하면 자동으로 학습됩니다</span>
        </div>
      )}

      {/* 요약 바 */}
      {!isEmpty && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* 최근 업데이트 */}
          {updated && (
            <div style={{ fontSize: 11, color: "#388e3c", fontWeight: 600, marginBottom: 2 }}>
              🕐 최근 업데이트: {updated}
            </div>
          )}

          {/* 적용률 바 3개 */}
          {[
            { label: "글 흐름 학습",  count: structures.length },
            { label: "운영 노하우",   count: details.length   },
            { label: "현장 표현",    count: sentences.length  },
          ].map(({ label, count }) => {
            const pct = pctBar(count);
            const col = barColor(pct);
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#37474f", marginBottom: 4 }}>
                  <span>{label}</span>
                  <span style={{ color: col }}>{count}개 ({pct}%)</span>
                </div>
                <div style={{ background: "#c8e6c9", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, background: col, height: "100%", borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}

          {/* 적용 상태 뱃지 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 11, background: "#2e7d32", color: "#fff", borderRadius: 8, padding: "3px 10px", fontWeight: 700 }}>
              ✔ 생성할수록 더 강한 글이 나옵니다
            </span>
          </div>
        </div>
      )}

      {/* 상세 펼치기 */}
      {open && !isEmpty && (
        <div style={{ marginTop: 16, borderTop: "1px solid #a5d6a7", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>

          {structures.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>▶ 글 흐름 학습 데이터</div>
              {structures.slice(0, 5).map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: "#37474f", background: "#f1f8e9", borderRadius: 8, padding: "5px 10px", marginBottom: 4 }}>· {s}</div>
              ))}
            </div>
          )}

          {details.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>▶ 운영 노하우 데이터</div>
              {details.slice(0, 5).map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: "#37474f", background: "#f1f8e9", borderRadius: 8, padding: "5px 10px", marginBottom: 4 }}>· {s}</div>
              ))}
            </div>
          )}

          {sentences.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>▶ 현장 표현 데이터</div>
              {sentences.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: "#37474f", background: "#f1f8e9", borderRadius: 8, padding: "5px 10px", marginBottom: 4 }}>· {s}</div>
              ))}
            </div>
          )}

          {(openings.length > 0 || closings.length > 0) && (
            <div style={{ display: "flex", gap: 10 }}>
              {openings.length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>▶ 도입부 힌트</div>
                  <div style={{ fontSize: 11, color: "#37474f", background: "#f1f8e9", borderRadius: 8, padding: "5px 10px" }}>· {openings[0]}</div>
                </div>
              )}
              {closings.length > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1b5e20", marginBottom: 6 }}>▶ 마무리 힌트</div>
                  <div style={{ fontSize: 11, color: "#37474f", background: "#f1f8e9", borderRadius: 8, padding: "5px 10px" }}>· {closings[0]}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 10, color: "#81c784", textAlign: "right" }}>
            ※ 쌓인 데이터는 다음 글 생성 시 자동으로 반영됩니다
          </div>

          {/* ── competitor 버킷 현황 ── */}
          {hasCompetitor && (
            <div style={{ marginTop: 8, borderTop: "1px solid #a5d6a7", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#e65100", marginBottom: 8 }}>
                🔍 경쟁글 패턴 (분석 완료)
              </div>
              {competitorPrograms.map(cp => (
                <div key={cp.name} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 8,
                  padding: "6px 10px", marginBottom: 4,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e65100" }}>{cp.name}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 11, background: "#ff6d00", color: "#fff", borderRadius: 6, padding: "1px 7px" }}>
                      구조 {cp.structures}개
                    </span>
                    <span style={{ fontSize: 11, background: "#ff8f00", color: "#fff", borderRadius: 6, padding: "1px 7px" }}>
                      디테일 {cp.details}개
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#e65100", marginTop: 4 }}>
                ✔ 다음 생성 시 경쟁글보다 더 나은 글 자동 작성
              </div>
            </div>
          )}
          {!hasCompetitor && (
            <div style={{ marginTop: 8, borderTop: "1px solid #a5d6a7", paddingTop: 10,
              fontSize: 11, color: "#9e9e9e", textAlign: "center" }}>
              🔍 아직 경쟁 분석 데이터 없음<br/>
              상단 글을 붙여넣으면 경쟁자보다 강한 글이 자동으로 생성됩니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
