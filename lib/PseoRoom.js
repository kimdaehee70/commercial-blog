// lib/PseoRoom.js
// [PSEO-MINIHOME-UI-01] P페이지 방 1차 — 껍데기 + 상태표현만. 저장/결제/권한 판정 로직 없음.
//   입장 판정은 서버(pseo_access)가 한다. 이 파일은 결과를 표시만 한다.
//   금지 문구: 상단노출 / 기간 보장 / 해지 즉시 소멸 안내 (해지 정책 미확정).
import React from "react";

const C = { ink: "#4A148C", sub: "#6b5a80", line: "#ece7f6", bg: "#fff" };
const card = { background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px 22px" };
const h1 = { fontSize: 17, fontWeight: 900, color: C.ink, margin: 0 };
const p = { fontSize: 13.5, fontWeight: 600, color: C.sub, lineHeight: 1.75, margin: "8px 0 0" };
const btn = { marginTop: 14, fontSize: 13, fontWeight: 800, color: "#fff", background: "#7B1FA2",
  border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontFamily: "inherit",
  textDecoration: "none", display: "inline-block" };
const btnGhost = { ...btn, color: "#7B1FA2", background: "#fff", border: "1.5px solid #d9c3ea" };

function Lock({ children }) {
  return (
    <div style={{ ...card, background: "#faf7fd" }}>
      <div style={h1}>🔒 {children}</div>
    </div>
  );
}

/**
 * props
 *  view        "pseo-intro" | "pseo-basic" | "pseo-home" | "pseo-asset"
 *  authed      로그인 여부
 *  store       hubStore (읽기 전용)
 *  access      pseo_access | null  ({state, can_enter, live, published_count})
 *  industryLabel  표시용 업종명
 *  onGoMypage  마이페이지(업체정보)로 이동
 *  onGoPosting 블로그 글 작성 방으로 이동 (선택)
 */
export default function PseoRoom({ view, authed, store, access, industryLabel, onGoMypage, onGoPosting }) {
  const canEnter = !!(access && access.can_enter);
  // 공개 전 안내 — 내 미니홈피 · 기본 설정 공용(문구 동일).
  const notLiveCard = () => (
    <div style={card}>
      <div style={h1}>🏠 미니홈피 준비 중</div>
      <p style={p}>블로그 글을 발행하고 발행 URL을 등록하면 검색노출 준비가 시작됩니다.</p>
      {onGoPosting && <button type="button" style={btn} onClick={onGoPosting}>블로그 글 쓰러 가기</button>}
    </div>
  );

  if (view === "pseo-intro") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={card}>
          <div style={h1}>🌐 P페이지란?</div>
          <p style={{ ...p, fontSize: 15, color: C.ink, fontWeight: 800 }}>
            홈페이지가 없어도, 검색되는 내 사업의 미니홈피
          </p>
          <p style={p}>AI-POST 유료회원에게 제공되는 검색자산 서비스입니다.</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Lock>로그인 후 이용할 수 있습니다.</Lock>;
  }

  if (view === "pseo-basic") {
    if (!canEnter) return <Lock>유료회원에게 제공되는 검색 미니홈피입니다.</Lock>;
    // [P-PAGE-ONE-SCREEN-01 ③] 편집은 좌측(StoreInfoForm section="pseo"). 우측 = 저장 결과는 실제 공개 P페이지에서 확인.
    //   별도 Preview 없음. 공개 여부·주소는 내 미니홈피와 동일(access.live · /p/{store.id}).
    const live = !!(access && access.live);
    if (!live) return notLiveCard();
    return (
      <div style={card}>
        <div style={h1}>🌐 내 공개 P페이지</div>
        <p style={p}>저장한 내용은 공개 P페이지에서 확인할 수 있습니다.</p>
        {store && store.id ? (
          <a href={`/p/${store.id}`} target="_blank" rel="noopener noreferrer" style={btn}>공개 P페이지 보기</a>
        ) : null}
      </div>
    );
  }

  if (view === "pseo-home") {
    if (!canEnter) return <Lock>유료회원에게 제공되는 검색 미니홈피입니다.</Lock>;
    const live = !!(access && access.live);
    if (!live) return notLiveCard();
    return (
      <div style={card}>
        <div style={h1}>🏠 미니홈피 운영 중</div>
        <p style={p}>등록된 발행 URL {access.published_count}건을 바탕으로 미니홈피가 운영되고 있습니다.</p>
        {store && store.id ? (
          <a href={`/p/${store.id}`} target="_blank" rel="noopener noreferrer" style={btn}>공개 P페이지 보기</a>
        ) : null}
      </div>
    );
  }

  if (view === "pseo-asset") {
    return <Lock>검색자산 관리는 준비 중입니다.</Lock>;
  }

  return null;
}
