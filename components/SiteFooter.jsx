// components/SiteFooter.jsx
// [v4 2026-08-07] 전체 폭 한 줄 푸터 · 가운데 정렬 · 구분자 여백 확대 — PG(KG이니시스) 심사 요건.
//   심사 모니터링은 "사이트 하단 사업자정보 = PG 등록 사업자정보 일치"를 확인한다.
//   좌측 사이드바 정책 링크는 navOpen 기본값이 false(접힘)이라 첫 화면에서 노출되지 않으므로,
//   좌우 분할 아래 전체 폭에 한 줄로 상시 노출한다.
//   ★ 사업자정보 문자열은 lib/policies/* 5종과 반드시 동일하게 유지할 것.
//   ★ onDoc(id) — 정책 링크 클릭 시 index.js가 navView="doc:{id}"로 문서 뷰를 연다. 없으면 텍스트 취급.
export default function SiteFooter({ onDoc }) {
  const sep = (
    <span style={{ color: "#dcdce4", margin: "0 12px" }} aria-hidden="true">
      |
    </span>
  );

  const LinkItem = ({ id, label }) =>
    onDoc ? (
      <button
        type="button"
        onClick={() => onDoc(id)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          fontSize: 11,
          color: "#6b6b80",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          whiteSpace: "nowrap",
        }}
        onMouseOver={(e) => { e.currentTarget.style.color = "#4a148c"; }}
        onMouseOut={(e) => { e.currentTarget.style.color = "#6b6b80"; }}
      >
        {label}
      </button>
    ) : (
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    );

  return (
    <footer
      style={{
        flexShrink: 0,
        width: "100%",
        minHeight: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        rowGap: 2,
        textAlign: "center",
        padding: "9px 18px",
        borderTop: "1px solid #e5e5ee",
        background: "#f2f2f7",
        fontSize: 11,
        lineHeight: 1.6,
        color: "#909099",
        fontFamily: "inherit",
        wordBreak: "keep-all",
      }}
    >
      <span style={{ color: "#9a9ab0" }}>ⓒ 2026 AI-POST.AI</span>
      {sep}
      <span style={{ fontWeight: 700, color: "#5a5a70" }}>다원테크</span>
      {sep}
      <span>대표 김대희</span>
      {sep}
      <span>사업자등록번호 715-23-01605</span>
      {sep}
      <span>통신판매업신고 2023-서울노원-0233</span>
      {sep}
      <span>서울특별시 노원구 화랑로 465, 지층 B01-1호</span>
      {sep}
      <span>support@ai-post.ai</span>
      {sep}
      <span>010-9020-4545</span>
      {sep}
      <LinkItem id="terms" label="이용약관" />
      {sep}
      <LinkItem id="privacy" label="개인정보처리방침" />
      {sep}
      <LinkItem id="refund" label="환불정책" />
    </footer>
  );
}
