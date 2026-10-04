// lib/PseoRoom.js
// [PSEO-MINIHOME-UI-01] P페이지 방 1차 — 껍데기 + 상태표현만. 저장/결제/권한 판정 로직 없음.
//   입장 판정은 서버(pseo_access)가 한다. 이 파일은 결과를 표시만 한다.
//   금지 문구: 상단노출 / 기간 보장 / 해지 즉시 소멸 안내 (해지 정책 미확정).
import React, { useEffect, useRef, useState } from "react";
import { resolvePhone } from "./pseo/phone";
import { hasPhysicalStore, getCatalogItem } from "./industry-catalog";

const C = { ink: "#4A148C", sub: "#6b5a80", line: "#ece7f6", bg: "#fff" };
const card = { background: C.bg, border: `1px solid ${C.line}`, borderRadius: 14, padding: "20px 22px" };
const h1 = { fontSize: 17, fontWeight: 900, color: C.ink, margin: 0 };
const p = { fontSize: 13.5, fontWeight: 600, color: C.sub, lineHeight: 1.75, margin: "8px 0 0" };
const btn = { marginTop: 14, fontSize: 13, fontWeight: 800, color: "#fff", background: "#7B1FA2",
  border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontFamily: "inherit",
  textDecoration: "none", display: "inline-block" };
const btnGhost = { ...btn, color: "#7B1FA2", background: "#fff", border: "1.5px solid #d9c3ea" };

// ── [P-PAGE-ONE-SCREEN-01 ③] 기본 설정 우측 「수정 확인」 — 저장된 업체정보(hubStore)가 P페이지에 어떻게 놓이는지 표시만.
//   저장 전 입력값 실시간 반영 없음 · 링크/추적 없음 · DB/API 없음. 최종 확인은 [공개 P페이지 보기](/p 실제 페이지).
//   항목·순서·라벨은 pages/p/[storeId]/index.js 공개 허브 기준. 전화 해석은 같은 공용 모듈(resolvePhone).
//   ※ 공개 허브 VISIT_KEYS 와 같은 4키 — 그쪽 목록이 바뀌면 여기도 맞춘다.
const HUB_VISIT_KEYS = [["businessHours", "영업시간"], ["closedDays", "휴무"], ["parkingOps", "주차"], ["reservation", "예약"]];
// [P-PAGE-F3-TRAVEL-INFO-CONSISTENCY-01] 출장형 전용 — 공개 허브 FIELD_VISIT_KEYS 와 같은 값(동기화 지점).
const FIELD_VISIT_KEYS = [["dispatch24", "출동 가능시간"], ["serviceArea", "출동 가능지역"], ["etc", "출장 안내"]]; // [F2] serviceArea 이동
const pv = {
  wrap: { background: "#fdfcfa", border: "1px solid #e8e2da", borderRadius: 14, padding: "22px 20px 18px", color: "#23201d",
    fontFamily: "\"Apple SD Gothic Neo\", \"Malgun Gothic\", system-ui, sans-serif" },
  area: { margin: "0 0 4px", fontSize: 13, color: "#857c72" },
  name: { margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.02em" },
  kind: { margin: "7px 0 0", fontSize: 14, fontWeight: 600, color: "#1c6b3f" },
  addr: { margin: "8px 0 0", fontSize: 14, lineHeight: 1.55, color: "#5c5550" },
  call: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 20,
    padding: "15px 18px", borderRadius: 9, background: "#1c6b3f", color: "#fff" },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { flex: "1 1 auto", minWidth: 80, padding: "11px 12px", border: "1px solid #ddd6cd", borderRadius: 8,
    background: "#fff", color: "#2f2a26", fontSize: 14, textAlign: "center" },
  h2: { margin: "26px 0 8px", fontSize: 13, fontWeight: 600, color: "#857c72" },
  row: { display: "flex", gap: 14, padding: "11px 0", borderBottom: "1px solid #f0ebe4", fontSize: 14, lineHeight: 1.5 },
  li: { padding: "11px 0", borderBottom: "1px solid #f0ebe4", fontSize: 14, lineHeight: 1.55 },
  empty: { color: "#b0a3c0" },
  photoMain: { display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 9, background: "#f0ebe4" },
  photoThumb: { width: 72, height: 54, objectFit: "cover", borderRadius: 6, background: "#f0ebe4" },
  // [P-PAGE-FIRST-USER-EDIT-FLOW-01] 빈 자리 안내 — 수정 확인 화면 전용(공개 /p 미적용). 실제 FACT 처럼 보이지 않게 점선·회색.
  hole: { padding: "12px 14px", border: "1.5px dashed #d8cfe6", borderRadius: 8, color: "#a99bbb", fontSize: 12.5, textAlign: "center" },
};

// [P-PAGE-FIRST-USER-EDIT-FLOW-01] 좌측 진입 영역 → 우측 대표 위치 1곳(data-pv). 이동 1회 + 약 1.6초 테두리 강조.
//   focusKey 가 바뀔 때만 동작(같은 영역 안 입력·클릭·저장 = 변화 없음). 저장 데이터와 무관.
const FLASH_MS = 1600;
function useFocusFlash(focusKey, scrollBoxRef, rootRef) {
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!focusKey) return undefined;
    const root = rootRef.current;
    const el = root && root.querySelector(`[data-pv="${focusKey}"]`);
    if (!el) return undefined;
    const box = scrollBoxRef && scrollBoxRef.current;
    // 좌측 편집영역이 같은 스크롤 상자 안이면(좁은 배치) 이동 생략 — 강조만.
    const leftInBox = box && box.contains(document.getElementById("pseo-sec-basic"));
    if (box && box.contains(el) && !leftInBox) {
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top < b.top || r.bottom > b.bottom) {
        const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        box.scrollTo({ top: box.scrollTop + (r.top - b.top) - 16, behavior: reduce ? "auto" : "smooth" });
      }
    }
    setFlash(focusKey);
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // outline = 레이아웃 무영향. 평소엔 투명.
  return (k) => ({ outline: "2px solid", outlineColor: flash === k ? "#CE93D8" : "transparent",
    outlineOffset: 4, transition: "outline-color .3s ease" });
}

function HubCheck({ store, photos, focusKey, scrollBoxRef, onPick }) {
  const rootRef = useRef(null);
  const flashStyle = useFocusFlash(focusKey, scrollBoxRef, rootRef);
  const hl = (k) => (onPick ? { ...flashStyle(k), cursor: "pointer" } : flashStyle(k));
  // 역방향 — 대표 위치 클릭(또는 Enter) → 좌측 입력 위치로. 표시 전용.
  const tap = (k) => (onPick ? {
    role: "button", tabIndex: 0, title: "왼쪽에서 수정",
    onClick: () => onPick(k),
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(k); } },
  } : {});
  const pics = Array.isArray(photos) ? photos : []; // [⑦-E] [0] = 대표 · 이후 = 순서대로. 읽기 전용.
  const s = store || {};
  const vi = s.visit_info && typeof s.visit_info === "object" ? s.visit_info : {};
  const sf = s.search_fact && typeof s.search_fact === "object" ? s.search_fact : {};
  const ph = resolvePhone(s.phone, vi.phone);
  const area = [s.region, s.sub_region].filter(Boolean).join(" · ");
  const ind = String(s.industry || "");
  const isField = !hasPhysicalStore(ind) && ind !== "funeral";
  // [P-PAGE-1F-IDENTITY-01] 업종 표시명 — /p 와 같은 규칙(카탈로그 name · 없으면 미표시). 동기화 지점.
  const indName = (getCatalogItem(ind) && getCatalogItem(ind).name) || "";
  const visit = (isField ? [...HUB_VISIT_KEYS, ...FIELD_VISIT_KEYS] : HUB_VISIT_KEYS).map(([k, l]) => [l, String(vi[k] || "").trim()]).filter(([, v]) => v);
  const services = Array.isArray(sf.services) ? sf.services.filter(x => x && x.name) : [];
  const process = Array.isArray(sf.process) ? sf.process.filter(Boolean) : [];
  const diff = Array.isArray(sf.differentiators) ? sf.differentiators.filter(Boolean) : [];
  const preVisit = String(vi.preVisit || "").trim();
  const list = (title, items) => items.length > 0 && (
    <>
      <div style={pv.h2}>{title}</div>
      <div style={{ borderTop: "1px solid #e8e2da" }}>{items}</div>
    </>
  );
  const identEmpty = !s.store_name && !s.address && ph.tel.length < 8;
  return (
    <div ref={rootRef} style={pv.wrap}>
      {area
        ? <p data-pv="region" {...tap("region")} style={{ ...pv.area, ...hl("region") }}>{area}</p>
        : <div data-pv="region" {...tap("region")} style={{ ...pv.hole, marginBottom: 10, ...hl("region") }}>생활권이 여기에 표시됩니다</div>}
      <div data-pv="ident" {...tap("ident")} style={hl("ident")}>
        <h2 style={pv.name}>{s.store_name || <span style={pv.empty}>업체명</span>}</h2>
        {indName && <p style={pv.kind}>{indName}</p>}
        {s.address && <p style={pv.addr}>{s.address}</p>}
        {ph.tel.length >= 8 && (
          <div style={pv.call}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>전화 걸기</span>
            <span style={{ fontSize: 14, opacity: 0.85, whiteSpace: "nowrap" }}>{ph.display}</span>
          </div>
        )}
        <div style={pv.chips}>
          {ph.smsTel.length >= 8 && <span style={pv.chip}>문자</span>}
          {s.address && <span style={pv.chip}>길찾기</span>}
          {String(s.naver_place_url || "").trim() && <span style={pv.chip}>네이버 플레이스</span>}
        </div>
        {identEmpty && <div style={{ ...pv.hole, marginTop: 10 }}>업체 정보가 여기에 표시됩니다</div>}
      </div>
      {pics.length > 0 ? (
        <div data-pv="photo" {...tap("photo")} style={{ marginTop: 18, ...hl("photo") }}>
          <img src={pics[0].url} alt="대표사진" style={pv.photoMain} />
          {pics.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {pics.slice(1).map((x, i) => <img key={x.path} src={x.url} alt={`업체사진 ${i + 2}`} style={pv.photoThumb} />)}
            </div>
          )}
        </div>
      ) : <div data-pv="photo" {...tap("photo")} style={{ ...pv.hole, marginTop: 18, ...hl("photo") }}>업체 사진이 여기에 표시됩니다</div>}
      {visit.length > 0 ? (
        <div data-pv="visit" {...tap("visit")} style={{ marginTop: 26, borderTop: "1px solid #e8e2da", ...hl("visit") }}>
          {visit.map(([l, v]) => (
            <div key={l} style={pv.row}><span style={{ flex: "0 0 64px", color: "#857c72" }}>{l}</span><span style={{ flex: 1 }}>{v}</span></div>
          ))}
        </div>
      ) : <div data-pv="visit" {...tap("visit")} style={{ ...pv.hole, marginTop: 26, ...hl("visit") }}>영업·이용정보가 여기에 표시됩니다</div>}
      {services.length > 0 ? (
        <div data-pv="sf" {...tap("sf")} style={hl("sf")}>
          {/* [P-PAGE-MULTI-SERVICE-HUB-V1-01] /p 와 같은 구조 — 「{지역} {업체명} 제공 서비스」 + 한 줄 「서비스명 - note」. 동기화 지점. */}
          {list(`${s.region ? s.region + " " : ""}${s.store_name || ""} 제공 서비스`.trim(), services.map((x, i) => (
            <div key={i} style={pv.li}><span style={{ fontWeight: 600 }}>{x.name}</span>{x.note && <span style={{ fontSize: 13, color: "#5c5550" }}> - {x.note}</span>}</div>
          )))}
        </div>
      ) : <div data-pv="sf" {...tap("sf")} style={{ ...pv.hole, marginTop: 26, ...hl("sf") }}>입력한 서비스가 여기에 표시됩니다</div>}
      {list("진행 순서", process.map((x, i) => <div key={i} style={pv.li}>{i + 1}. {x}</div>))}
      {list("이렇게 일합니다", diff.map((x, i) => <div key={i} style={pv.li}>{x}</div>))}
      {preVisit && list("상담 전 확인사항", [<div key="v" style={{ ...pv.li, whiteSpace: "pre-line" }}>{preVisit}</div>])}
      <p style={{ margin: "22px 0 0", fontSize: 11.5, color: "#a49a8f", lineHeight: 1.6 }}>
        최근 글·다루는 내용은 발행한 글을 바탕으로 공개 P페이지에만 표시됩니다.
      </p>
    </div>
  );
}

function Lock({ children }) {
  return (
    <div style={{ ...card, background: "#faf7fd" }}>
      <div style={h1}>🔒 {children}</div>
    </div>
  );
}

/**
 * props
 *  view        "pseo-intro" | "pseo-basic" | "pseo-asset"  (pseo-home = 기본 설정으로 흡수)
 *  authed      로그인 여부
 *  store       hubStore (읽기 전용)
 *  access      pseo_access | null  ({state, can_enter, live, published_count})
 *  photos      업체사진 [{path,url}] (Home storePhotos · 읽기 전용, ⑦-E)
 *  focusKey    좌측 진입 영역 key | null (Home pseoFocus · 표시 전용)
 *  scrollBoxRef 우측 스크롤 상자 ref (Home navScrollRef)
 *  onPreviewPick 우측 대표 위치 클릭 → 좌측 입력 위치 이동(key) · 표시 전용
 *  industryLabel  표시용 업종명
 *  onGoMypage  마이페이지(업체정보)로 이동
 *  onGoPosting 블로그 글 작성 방으로 이동 (선택)
 */
export default function PseoRoom({ view, authed, store, photos, access, industryLabel, onGoMypage, onGoPosting, focusKey, scrollBoxRef, onPreviewPick }) {
  const canEnter = !!(access && access.can_enter);
  // 공개 전 안내 — 기존 내 미니홈피 문구 그대로(기본 설정으로 흡수).
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
    // 왼쪽 수정·저장 → 오른쪽 수정 확인(저장값) → [공개 P페이지 보기]로 실제 페이지 최종 확인.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {live ? (
          <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={h1}>🌐 내 P페이지 수정 확인</div>
              <p style={{ ...p, marginTop: 4 }}>저장한 내용은 공개 P페이지에서 확인할 수 있습니다.</p>
            </div>
            {store && store.id ? (
              <a href={`/p/${store.id}`} target="_blank" rel="noopener noreferrer" style={{ ...btn, marginTop: 0 }}>공개 P페이지 보기</a>
            ) : null}
          </div>
        ) : notLiveCard()}
        <HubCheck store={store} photos={photos} focusKey={focusKey} scrollBoxRef={scrollBoxRef} onPick={onPreviewPick} />
      </div>
    );
  }

  if (view === "pseo-asset") {
    return <Lock>검색자산 관리는 준비 중입니다.</Lock>;
  }

  return null;
}
