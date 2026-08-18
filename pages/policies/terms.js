// pages/policies/terms.js
// [KG-05] PG 심사용 정책 URL 라우트. 본문 SoT = lib/policies/terms.js (무접촉).
//   심사 요건: 정책 내용이 고유 URL로 열람 가능해야 하고, 하단 사업자정보가 함께 노출되어야 한다.
//   렌더 스타일은 index.js 문서 뷰(L13319~13334)와 동일하게 유지 — 신규 서식 도입 금지.

import POLICY from "../../lib/policies/terms";
import SiteFooter from "../../components/SiteFooter";

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.body}>
        <div style={S.title}>{POLICY.title || ""}</div>
        <div style={S.content}>{POLICY.content || ""}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" },
  body: { flex: 1, maxWidth: 860, width: "100%", margin: "0 auto", padding: "18px 18px 40px" },
  title: { fontSize: 17, fontWeight: 900, color: "#2b2340", letterSpacing: "-0.4px", marginBottom: 14 },
  content: { whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.95, color: "#4a4459", fontWeight: 500, wordBreak: "break-word" },
};