// components/ExperienceOverlay.js — commercial-blog · 비로그인 체험 오버레이 (v6 1단계)
// 표시 조건: index.js Home 에서 authChecked && !authUserId 일 때만.
// 동작: 칩 선택 → 스트리밍 흉내 → 2~3문단 프리뷰 → 게이트("로그인 후 이용").
// FREEZE 정합: 엔진/generate/parseNaturalInput 무호출. 전부 하드코딩 샘플.
//   실제 생성·발행·편집은 게이트 통과(로그인) 후 기존 index.js 본체가 담당.
// 닫기(× 또는 "그냥 둘러보기") → onClose() → 미로그인 상태로 기존 화면 노출.

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";

const SAMPLE_TEXT = [
  "분당에서 임플란트 상담을 알아보기 시작한 건, 아랫쪽 어금니가 빠진 채로 1년 가까이 버티다가 반대쪽 잇몸까지 시큰거리기 시작하면서였어요. 밥 먹을 때마다 한쪽으로만 씹다 보니 턱이 뻐근하더라고요.",
  "처음엔 인터넷만 며칠을 뒤졌습니다. 임플란트 비용, 뼈이식이 필요한 경우, 회복 기간 같은 걸 검색하다 보니 정보는 많은데 정작 내 상태가 어느 쪽인지는 알 수가 없었어요. 그래서 일단 상담만 받아보자는 마음으로 집 근처 치과 두 곳을 예약했습니다.",
  "상담에서 가장 인상 깊었던 건 CT를 찍고 나서 원장님이 잇몸뼈는 충분한 편이라 뼈이식 없이 식립이 가능하다고 짚어준 부분이었어요. 막연하던 게 회차랑 기간으로 정리되니까…",
];
const PHOTO_STAGES = ["이미지 불러오는 중...", "배경 분석 중...", "인물·상품 경계 감지 중...", "배경 제거 적용 중..."];

const CHIPS = [
  { label: "분당 임플란트 글 써줘", kind: "text" },
  { label: "치과 후기 글 생성해줘", kind: "text" },
  { label: "사진 배경 제거해줘", kind: "photo" },
  { label: "맛집 글 써줘", kind: "soon", name: "맛집" },
];

export default function ExperienceOverlay({ onClose }) {
  const router = useRouter();
  const [feed, setFeed] = useState([]);   // {role, body, type}
  const [phase, setPhase] = useState("idle"); // idle|running|gate
  const scroller = useRef(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearInterval), []);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [feed]);

  function clearTimers() { timers.current.forEach(clearInterval); timers.current = []; }

  function start(chip) {
    clearTimers();
    setPhase("running");
    setFeed([{ role: "user", body: chip.label }]);
    if (chip.kind === "soon") return runSoon(chip.name);
    if (chip.kind === "photo") return runPhoto();
    return runText();
  }

  function runSoon(name) {
    setPhase("idle");
    setTimeout(() => {
      setFeed((f) => [...f, { role: "ai", type: "soon", body: name }]);
    }, 320);
  }

  function runText() {
    const full = SAMPLE_TEXT.join("\n\n");
    let i = 0;
    setFeed((f) => [...f, { role: "ai", type: "stream", body: "" }]);
    const t = setInterval(() => {
      i += Math.floor(Math.random() * 3) + 2;
      const slice = full.slice(0, i);
      setFeed((f) => { const c = [...f]; c[c.length - 1] = { role: "ai", type: "stream", body: slice, typing: i < full.length }; return c; });
      if (i >= full.length) { clearInterval(t); setTimeout(toGate, 500); }
    }, 28);
    timers.current.push(t);
  }

  function runPhoto() {
    let s = 0;
    setFeed((f) => [...f, { role: "ai", type: "photo", stages: [] }]);
    const t = setInterval(() => {
      if (s < PHOTO_STAGES.length) {
        const cur = PHOTO_STAGES.slice(0, s + 1);
        setFeed((f) => { const c = [...f]; c[c.length - 1] = { role: "ai", type: "photo", stages: cur }; return c; });
        s++;
      } else { clearInterval(t); setTimeout(toGate, 400); }
    }, 520);
    timers.current.push(t);
  }

  function toGate() { setPhase("gate"); setFeed((f) => [...f, { role: "ai", type: "gate" }]); }
  function login() { router.push("/login"); }

  return (
    <div style={S.backdrop}>
      <div style={S.modal}>
        <div style={S.bar}>
          <span style={S.brand}><span style={S.dot} />commercial-blog · 체험</span>
          <button style={S.x} onClick={onClose} aria-label="닫기">그냥 둘러보기 ✕</button>
        </div>

        {phase === "idle" && feed.length === 0 ? (
          <div style={S.hero}>
            <div style={S.kicker}>로그인 없이 먼저 체험</div>
            <h2 style={S.h2}>검색 상단에 살아남는 글, 미리 보기</h2>
            <p style={S.sub}>아래에서 하나를 눌러보세요. 실제 생성·편집은 로그인 후 가능합니다.</p>
            <div style={S.avail}>
              <span style={S.availTtl}>사용 가능</span><span style={{ ...S.tag, ...S.tagOk }}>✓ 병원 블로그</span>
              <span style={{ ...S.availTtl, marginLeft: 10 }}>개발 중</span>
              {["맛집", "학원", "법률", "미용"].map((x) => <span key={x} style={{ ...S.tag, ...S.tagDev }}>△ {x}</span>)}
            </div>
          </div>
        ) : (
          <div style={S.feed} ref={scroller}>
            {feed.map((m, i) => <Msg key={i} m={m} onLogin={login} onTextChip={() => start(CHIPS[0])} onBack={() => { clearTimers(); setFeed([]); setPhase("idle"); }} />)}
          </div>
        )}

        <div style={S.chips}>
          {CHIPS.map((c) => (
            <button key={c.label} onClick={() => start(c)}
              style={{ ...S.chip, ...(c.kind === "soon" ? S.chipSoon : {}) }}>
              {c.label}{c.kind === "soon" && <em style={S.chipSoonTag}>개발중</em>}
            </button>
          ))}
        </div>
        <div style={S.foot}>— 실제 생성·편집은 로그인 후 —</div>
      </div>
    </div>
  );
}

function Msg({ m, onLogin, onTextChip, onBack }) {
  if (m.role === "user") return (
    <div style={S.row}><div style={S.who}>나</div><div style={S.userBubble}>{m.body}</div></div>
  );
  if (m.type === "soon") return (
    <div style={S.row}><div style={{ ...S.who, color: "#5f9d7d" }}>AI</div>
      <div style={S.aiBubble}>
        <b>{m.body}</b> 엔진은 개발 중입니다.<br /><br />
        지금은 <b style={{ color: "#3f7d5e" }}>병원 엔진</b>을 체험할 수 있어요.
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button style={S.miniBtn} onClick={onTextChip}>병원 글 체험하기</button>
          <button style={S.miniBtnGhost} onClick={onBack}>돌아가기</button>
        </div>
      </div>
    </div>
  );
  if (m.type === "stream") return (
    <div style={S.row}><div style={{ ...S.who, color: "#5f9d7d" }}>AI · 미리보기</div>
      <div style={S.aiBubble}>
        {m.body.split("\n\n").map((p, i) => <p key={i} style={{ margin: i ? "12px 0 0" : 0 }}>{p}</p>)}
        {m.typing && <span style={S.cursor} />}
      </div>
    </div>
  );
  if (m.type === "photo") return (
    <div style={S.row}><div style={{ ...S.who, color: "#5f9d7d" }}>AI · 미리보기</div>
      <div style={S.aiBubble}>
        {m.stages.map((s, i) => <div key={i} style={S.stage}>▸ {s}</div>)}
      </div>
    </div>
  );
  if (m.type === "gate") return (
    <div style={S.row}><div style={{ width: 0 }} />
      <div style={S.gate}>
        <h4 style={S.gateH}>여기까지 미리보기예요</h4>
        <p style={S.gateP}>나머지 작업은 로그인 후 이용할 수 있어요.</p>
        <div style={S.gateActs}>
          {[["전체 글 생성", "2,000자 완성본"], ["이미지 생성", "본문용 이미지"], ["발행 관리", "내 블로그 발행"], ["관측 기능", "상단 유지 관찰"]].map(([t, d]) => (
            <button key={t} style={S.gateAct} onClick={onLogin}>
              <span style={S.gateActT}>{t}</span><span style={S.gateActD}>{d}</span>
              <span style={S.lock}>🔒</span>
            </button>
          ))}
        </div>
        <button style={S.gateLogin} onClick={onLogin}>로그인하고 계속하기</button>
      </div>
    </div>
  );
  return null;
}

const ACCENT = "#c8451f", GREEN = "#3f7d5e";
const S = {
  backdrop: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(20,18,14,.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Noto Sans KR', sans-serif" },
  modal: { width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", background: "#1b1813", borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 90px -30px rgba(0,0,0,.6)" },
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,.07)" },
  brand: { display: "flex", alignItems: "center", gap: 9, color: "#f4efe6", fontWeight: 700, fontSize: 14 },
  dot: { width: 8, height: 8, background: ACCENT, borderRadius: 2, transform: "rotate(45deg)", display: "inline-block" },
  x: { background: "none", border: "none", color: "#8a8170", cursor: "pointer", fontSize: 12, fontFamily: "monospace" },
  hero: { padding: "40px 28px", color: "#e8e1d2" },
  kicker: { fontFamily: "monospace", fontSize: 11, letterSpacing: 2, color: ACCENT, textTransform: "uppercase", marginBottom: 16 },
  h2: { fontSize: 24, letterSpacing: "-0.5px", margin: 0, color: "#f4efe6" },
  sub: { fontSize: 14, color: "#a39a86", lineHeight: 1.6, margin: "12px 0 0" },
  avail: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 22, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,.08)" },
  availTtl: { fontFamily: "monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#8a8170" },
  tag: { fontSize: 12, padding: "5px 11px", borderRadius: 30, border: "1px solid rgba(255,255,255,.12)" },
  tagOk: { background: "rgba(63,125,94,.18)", borderColor: "rgba(63,125,94,.5)", color: "#7fc4a0", fontWeight: 600 },
  tagDev: { color: "#8a8170" },
  feed: { flex: 1, overflowY: "auto", padding: "24px 22px", minHeight: 200 },
  row: { display: "flex", flexDirection: "column", marginBottom: 20 },
  who: { fontFamily: "monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, color: "#6f6757" },
  userBubble: { alignSelf: "flex-start", background: ACCENT, color: "#fff", padding: "11px 16px", borderRadius: "14px 14px 4px 14px", fontSize: 15, display: "inline-block", maxWidth: "85%" },
  aiBubble: { fontSize: 15, lineHeight: 1.75, color: "#e3dccc", maxWidth: "92%" },
  stage: { fontFamily: "monospace", fontSize: 13, color: "#8a8170", marginBottom: 6 },
  cursor: { display: "inline-block", width: 8, height: 17, background: ACCENT, verticalAlign: "-3px", marginLeft: 2, animation: "bounce 1s steps(2) infinite" },
  gate: { border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, background: "rgba(255,255,255,.03)", padding: 22 },
  gateH: { fontSize: 14, color: "#f4efe6", margin: 0 },
  gateP: { fontSize: 13, color: "#8a8170", margin: "4px 0 18px" },
  gateActs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  gateAct: { position: "relative", display: "flex", flexDirection: "column", gap: 4, textAlign: "left", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: 14, cursor: "pointer", color: "#e8e1d2", fontFamily: "inherit" },
  gateActT: { fontSize: 13.5, fontWeight: 600 },
  gateActD: { fontSize: 11, color: "#8a8170" },
  lock: { position: "absolute", top: 12, right: 12, fontSize: 12, opacity: .5 },
  gateLogin: { width: "100%", background: ACCENT, border: "none", color: "#fff", padding: 14, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, padding: "0 22px 14px" },
  chip: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "#d8d0bf", fontSize: 12.5, padding: "9px 14px", borderRadius: 30, cursor: "pointer", fontFamily: "inherit" },
  chipSoon: { opacity: .55, cursor: "not-allowed" },
  chipSoonTag: { fontStyle: "normal", fontFamily: "monospace", fontSize: 10, color: "#dba23a", marginLeft: 5 },
  miniBtn: { background: ACCENT, border: "none", color: "#fff", fontSize: 12.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" },
  miniBtnGhost: { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "#d8d0bf", fontSize: 12.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit" },
  foot: { textAlign: "center", fontFamily: "monospace", fontSize: 11, color: "#7d7666", padding: "0 0 16px" },
};
