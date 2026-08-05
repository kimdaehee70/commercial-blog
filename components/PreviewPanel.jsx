// [v38] PreviewPanel — 비로그인 사용자가 좌측 메뉴 클릭 시 우측에 보여주는 "샘플 미리보기".
//   실제 NavPanel/실데이터를 쓰지 않고 더미 데이터로 화면 형태만 보여준 뒤 로그인 유도.
//   대상 view: stats(발행비율설정) / coach(AI 발행코치) / posts(최근발행) / survival(관측) / account(마이페이지)
//   plans(요금제)는 실제 카드 사용 → 이 컴포넌트에서 처리하지 않음.
// props: view, onLogin
const C = {
  purple: "#7B1FA2", deep: "#4A148C", grad: "linear-gradient(135deg,#4A148C,#9C27B0)",
  green: "#2E7D32", orange: "#E65100", gray: "#999", line: "#ece2f5",
};

function Badge({ children, color }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, color: color || C.purple,
      background: "#faf6fe", border: `1px solid ${C.line}`, borderRadius: 8,
      padding: "2px 8px", whiteSpace: "nowrap" }}>{children}</span>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: C.deep }}>{icon} {title}</div>
      {sub && <div style={{ fontSize: 12.5, color: "#8a7a9a", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// 흐림 처리 래퍼 — 샘플 데이터 위에 살짝 베일
function Blurred({ children, blur = 0 }) {
  return (
    <div style={{ filter: blur ? `blur(${blur}px)` : "none", opacity: blur ? 0.85 : 1,
      pointerEvents: "none", userSelect: "none" }}>{children}</div>
  );
}

// ── 발행비율설정 샘플 ──
function PreviewStats() {
  const rows = [
    { name: "임플란트", pct: 35, color: "#7B1FA2" },
    { name: "교정", pct: 25, color: "#1565C0" },
    { name: "충치치료", pct: 20, color: "#2E7D32" },
    { name: "스케일링", pct: 12, color: "#E65100" },
    { name: "심미보철", pct: 8, color: "#9457b8" },
  ];
  return (
    <div>
      <SectionTitle icon="📊" title="발행비율 설정" sub="알릴 항목과 비중을 직접 정하면 발행 계획이 그 비율대로 만들어집니다." />
      <Blurred>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
          {rows.map((r) => (
            <div key={r.name} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#3a2a4a", marginBottom: 5 }}>
                <span>{r.name}</span><span>{r.pct}%</span>
              </div>
              <div style={{ height: 8, background: "#f1ecf7", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${r.pct}%`, height: "100%", background: r.color, borderRadius: 6 }} />
              </div>
            </div>
          ))}
          <div style={{ textAlign: "right", fontSize: 11, color: C.gray, marginTop: 6 }}>합계 100%</div>
        </div>
      </Blurred>
    </div>
  );
}

// ── AI 발행코치 샘플 ──
function PreviewCoach() {
  const cards = [
    { d: "오늘", t: "임플란트 후기 글 1건 발행 권장", why: "최근 7일 임플란트 비중이 목표보다 낮습니다.", ic: "📌", color: "#7B1FA2" },
    { d: "내일", t: "교정 비교글 — 공백 키워드 진입", why: "경쟁 글이 적어 상단 진입 가능성이 높습니다.", ic: "🟢", color: "#2E7D32" },
    { d: "이번 주", t: "스케일링 글 과발행 주의", why: "동일 키워드 집중을 줄이는 것이 안전합니다.", ic: "⚠️", color: "#E65100" },
  ];
  return (
    <div>
      <SectionTitle icon="🤖" title="AI 발행코치" sub="‘오늘은 뭘 쓰지?’를 대신 정리합니다. 비중과 관측 데이터를 바탕으로 다음 행동을 추천합니다." />
      <Blurred>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12,
            padding: "14px 16px", marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>{c.ic}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: c.color, marginBottom: 3 }}>{c.d}</div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#2a1a3a", marginBottom: 3 }}>{c.t}</div>
              <div style={{ fontSize: 12, color: "#8a7a9a" }}>{c.why}</div>
            </div>
          </div>
        ))}
      </Blurred>
    </div>
  );
}

// ── 최근발행 샘플 ──
function PreviewPosts() {
  const posts = [
    { title: "강남 임플란트 후기 — 식립부터 보철까지", date: "06-05", rank: "3위", state: "Alive", sc: C.green },
    { title: "분당 투명교정 vs 일반교정 비교", date: "06-03", rank: "7위", state: "Alive", sc: C.green },
    { title: "수원 사랑니 발치 후기", date: "05-30", rank: "—", state: "관측중", sc: C.orange },
  ];
  return (
    <div>
      <SectionTitle icon="📝" title="최근발행" sub="발행한 글의 주소를 등록하면 순위와 생존 상태를 기록합니다." />
      <Blurred>
        {posts.map((p, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12,
            padding: "13px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2a1a3a", marginBottom: 6 }}>{p.title}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5, color: "#8a7a9a" }}>
              <span>{p.date}</span>
              <Badge color={C.deep}>현재 {p.rank}</Badge>
              <Badge color={p.sc}>{p.state}</Badge>
            </div>
          </div>
        ))}
      </Blurred>
    </div>
  );
}

// ── 관측 샘플 ──
function PreviewSurvival() {
  const items = [
    { kw: "강남 임플란트", days: 32, state: "Alive", sc: C.green },
    { kw: "분당 교정", days: 21, state: "Alive", sc: C.green },
    { kw: "수원 사랑니", days: 4, state: "관측중", sc: C.orange },
    { kw: "송파 충치치료", days: 0, state: "Fossil", sc: "#c62828" },
  ];
  return (
    <div>
      <SectionTitle icon="📈" title="검색 관측" sub="발행 글이 검색에 살아있는지(노출 유지), 가라앉았는지(Fossil)를 추적합니다." />
      <Blurred>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>3</div>
            <div style={{ fontSize: 11.5, color: "#8a7a9a" }}>Alive</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#c62828" }}>1</div>
            <div style={{ fontSize: 11.5, color: "#8a7a9a" }}>Fossil</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.deep }}>78%</div>
            <div style={{ fontSize: 11.5, color: "#8a7a9a" }}>생존율</div>
          </div>
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 10,
            padding: "11px 15px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2a1a3a" }}>{it.kw}</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 11.5, color: "#8a7a9a" }}>{it.days}일 유지</span>
              <Badge color={it.sc}>{it.state}</Badge>
            </span>
          </div>
        ))}
      </Blurred>
    </div>
  );
}

// ── 마이페이지 샘플 ──
function PreviewAccount() {
  return (
    <div>
      <SectionTitle icon="👤" title="마이페이지" sub="플랜·사용량·이용내역을 한 곳에서 관리합니다." />
      <Blurred>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#2a1a3a" }}>사용자님</span>
            <Badge color={C.deep}>STANDARD 플랜</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: "#8a7a9a", marginBottom: 6 }}>이번 달 발행</div>
          <div style={{ height: 10, background: "#f1ecf7", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ width: "42%", height: "100%", background: C.grad, borderRadius: 6 }} />
          </div>
          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: C.purple }}>25 / 60건</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 16px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3a2a4a", marginBottom: 8 }}>최근 이용내역</div>
          {["06-05 글 생성 · 임플란트", "06-03 글 생성 · 교정", "05-30 URL 등록 · 사랑니"].map((t, i) => (
            <div key={i} style={{ fontSize: 12, color: "#8a7a9a", padding: "4px 0" }}>{t}</div>
          ))}
        </div>
      </Blurred>
    </div>
  );
}

const MAP = {
  stats: { node: <PreviewStats />, cta: "로그인 후 발행 비중을 직접 설정할 수 있습니다" },
  coach: { node: <PreviewCoach />, cta: "로그인 후 내 데이터 기반 맞춤 추천을 제공합니다" },
  posts: { node: <PreviewPosts />, cta: "로그인 후 내가 발행한 글을 기록·관리할 수 있습니다" },
  survival: { node: <PreviewSurvival />, cta: "로그인 후 내 글의 검색 생존을 실시간 관측합니다" },
  account: { node: <PreviewAccount />, cta: "로그인 후 내 플랜과 사용량을 확인할 수 있습니다" },
};

export default function PreviewPanel({ view, onLogin }) {
  const cfg = MAP[view] || MAP.stats;
  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#f7f7fb", padding: "22px 24px 28px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* 미리보기 안내 배지 */}
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: C.purple,
          background: "#fff", border: `1px solid ${C.line}`, borderRadius: 20,
          padding: "4px 12px", marginBottom: 16 }}>👀 미리보기 — 샘플 화면입니다</div>

        {cfg.node}

        {/* 하단 로그인 CTA */}
        <div style={{ marginTop: 22, background: "#fff", border: `1.5px solid ${C.line}`,
          borderRadius: 14, padding: "20px 22px", textAlign: "center",
          boxShadow: "0 4px 18px rgba(74,20,140,.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.deep, marginBottom: 6 }}>🔒 {cfg.cta}</div>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
            글쓰기는 로그인 없이 바로 체험할 수 있어요.
          </div>
          <button onClick={onLogin}
            style={{ width: "100%", maxWidth: 280, padding: "12px 0", borderRadius: 11, border: "none",
              background: C.grad, color: "#fff", fontSize: 14.5, fontWeight: 800,
              cursor: "pointer", fontFamily: "inherit" }}>🔑 로그인하고 시작하기</button>
        </div>
      </div>
    </div>
  );
}
