// IndustrySelector.js — 업종 선택 UI Spine (분리 모듈)
// ─────────────────────────────────────────────────────────────
// 역할: 업종 "선택" UI만 담당. IndustryPicker / IndustryTree / IndustryDetail
//       / IndustrySideMenu / industryStatusBadge.
// 원칙(Tree SoT 정합): 선택 "구조" 데이터(ONBOARD_*/INDUSTRY_GROUPS/SUB_TO_GROUP/
//       tree헬퍼)는 industry-tree.js(SoT)에서 import 소비만. 여기서 재정의 금지.
// 제외: StoreInfoForm·업체정보 저장·API·createStore/updateStore·Publish·Generate.
//       (industryPath는 StoreInfoForm closure라 index.js 잔류 — Store Spine에서 이동)
// index.js는 이 모듈을 import 배선만. UI 수정은 이 파일만 건드린다.
// ─────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import {
  INDUSTRY_CATALOG, INDUSTRY_STATUS_META, getCatalogByCategory, getCatalogItem,
} from "./industry-catalog";
import {
  INDUSTRY_GROUPS, SUB_TO_GROUP, treeItemsOf, treeEngineOf,
} from "./industry-tree";
import { getSpecialtyMenus } from "./restaurant-data";

// [상태 마크] status(서비스 단계) + verified(검색 검증) 2축 표시.
//   ⚪ 동그라미  = 준비중(dev·plan·stopped)
//   🟡 동그라미  = 관측중(review)
//   🟢 동그라미  = 이용가능(live) — 아직 대표 검증 전
//   🟩 초록 네모 = live + verified:true — 실발행 상위노출 확인 완료(대표 검증)
//   radius 반환: "50%"=동그라미 / 3=네모. ON/OFF 스위치 미도입.
//   🟦 파란 네모 = verified + version:"v2"       — V2 정식 승격
//   ⬜ 흰 네모    = verified + version:"v2-pilot" — V2 테스트/관측 중
//   🟨 노랑 네모 = verified + version:"v2-new"   — V2 신규 업종(첫 Pilot)
//   🟩 초록 네모 = closed:true — 서브메뉴(cat)까지 전수 검토 완료/CLOSE. 최우선 판정.
//     ★ 세션146 — done 과 별개 축. done=상위 메뉴 완료 / closed=서브메뉴까지 완료.
//       한 필드로 두 의미를 겸하지 않는다.
//   🟦 파란 네모 = done:true — 상위 메뉴 작업 마무리 완료(선장 표시축).
//     ★ 세션118 — done은 엔진 버전·검증 상태와 독립된 "작업 완료" 표시 전용 축이다.
//       version:"v2"를 가짜로 넣어 색을 맞추지 않기 위해 별도 필드로 분리했다.
function statusMark(status, verified, version, done, closed) {
  if (closed)                            return { bg: "#16a34a", bd: "#15803d", op: 1, radius: 3 };  // 🟩 서브까지 CLOSE
  if (done)                              return { bg: "#2563eb", bd: "#1d4ed8", op: 1, radius: 3 };  // 🟦 상위 완료
  if (verified && version === "v2")       return { bg: "#2563eb", bd: "#1d4ed8", op: 1, radius: 3 };  // 🟦 V2 승격
  // [v-tone] v2-pilot 은 verified 무관 — 관측 전(dev) 업종도 동일 ⬜ 로 표기.
  //   근거: catalog enabled/verified 는 발행 게이트용. 트리 배지는 엔진 버전 축만 본다.
  if (version === "v2-pilot")            return { bg: "#fff",    bd: "#2563eb", op: 1, radius: 3 };  // ⬜ V2 테스트
  if (verified && version === "v2-new")   return { bg: "#facc15", bd: "#ca8a04", op: 1, radius: 3 };  // 🟨 V2 신규 업종
  if (status === "live" && verified) return { bg: "#16a34a", bd: "#15803d", op: 1, radius: 3 };     // 🟩 검증 완료
  if (status === "live")   return { bg: "#16a34a", bd: "#16a34a", op: 1, radius: "50%" };            // 🟢 이용 가능
  if (status === "review") return { bg: "#eab308", bd: "#ca8a04", op: 1, radius: "50%" };            // 🟡 관측 중
  return { bg: "#fff", bd: "#c9ccd3", op: 0.7, radius: "50%" };                                      // ⚪ 준비 중
}


// [v71] 계층형 업종 선택 — 1차 대분류 → 2차 세부업종.
//   value = 최종 세부업종 key. onChange(key) 로 2차 선택 시 emit.
// [v125] 재사용 — store 미확정(최초등록) 화면 STEP1에서 인라인 호출(좌측 사이드바 의존 제거).
export function IndustryPicker({ value, onChange }) {
  const C = { purple: "#9C27B0", purpleDark: "#4A148C", border: "#e0d0f0" };
  // 이미 선택된 세부업종이 있으면 그 그룹을 1차로 복원, 없으면 미선택.
  const [group, setGroup] = useState(value ? (SUB_TO_GROUP[value] || "") : "");
  const activeGroup = INDUSTRY_GROUPS.find(g => g.key === group) || null;

  const card = (sel) => ({
    padding: "7px 6px", borderRadius: 8, textAlign: "center", cursor: "pointer",
    border: sel ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
    background: sel ? "#faf5ff" : "#fff", color: sel ? C.purpleDark : "#555",
    fontSize: 12, fontWeight: sel ? 800 : 600, fontFamily: "inherit", transition: "all .15s",
    lineHeight: 1.25,
  });
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(76px,1fr))", gap: 6 };
  // [v77] 1단계 대분류는 칩 수가 적어(2개) 좁은 셀에서 글자 줄바꿈됨 → 넉넉한 폭의 별도 그리드.
  const gridTop = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 };
  const cardTop = (sel) => ({ ...card(sel), padding: "10px 12px", fontSize: 13, whiteSpace: "nowrap" });
  const stepBadge = (n, txt, on) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: on ? C.purple : "#cbb8dd",
        borderRadius: 12, padding: "2px 9px" }}>{n}단계</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: on ? "#666" : "#bbb" }}>{txt}</span>
    </div>
  );

  return (
    <>
      {/* 1단계 — 업종 대분류 */}
      {stepBadge("1", "업종 대분류 선택", true)}
      <div style={gridTop}>
        {INDUSTRY_GROUPS.map(g => {
          const sel = group === g.key;
          return (
            <div key={g.key} role="button" tabIndex={0} style={cardTop(sel)}
              onClick={() => {
                setGroup(g.key);
                // 1차를 바꾸면 기존 2차 선택은 초기화(다른 그룹의 값 잔존 방지)
                if (value && SUB_TO_GROUP[value] !== g.key) onChange("");
              }}>
              {g.emoji} {g.label}
              {/* [v77] 확장 진행 신호 — 음식·카페는 계속 작업 중. 라벨은 안 바꾸고 배지만(경로 오염 방지). */}
              {g.key === "food" && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#C2185B",
                  background: "#fde7ef", borderRadius: 8, padding: "1px 6px", marginLeft: 6, whiteSpace: "nowrap" }}>
                  작업중
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 2단계 — 세부업종 (1차 선택 시 활성화) */}
      <div style={{ height: 10 }} />
      {stepBadge("2", activeGroup ? `${activeGroup.label} · 세부업종 선택` : "세부업종 선택", !!activeGroup)}
      {activeGroup ? (
        <div style={grid}>
          {activeGroup.items.map(it => {
            // [가오픈 게이트] catalog enabled 를 업체정보 단계에도 동일 적용.
            //   근거: 업종센터(IndustryCenter)는 enabled 로 채택을 막지만 이 경로는 INDUSTRY_GROUPS 만 보므로
            //         게이트가 없으면 준비중 업종이 여기서 선택된다(우회 경로). 카탈로그 SoT 를 그대로 따른다.
            //   표시 원칙: 숨기지 않는다. 노출은 유지하고 선택만 차단 + '준비중' 표기.
            //   key 가 'engine#specialty' 복합형일 수 있어 '#' 앞을 카탈로그 id 로 본다.
            //   카탈로그 미등록 key 는 기존대로 선택 허용(안전측 — 게이트 도입이 기존 경로를 막지 않는다).
            const _catId = String(it.key || "").split("#")[0];
            const _cat = getCatalogItem(_catId);
            const _locked = !!_cat && _cat.enabled === false;
            return (
              <div key={it.key} role="button" tabIndex={_locked ? -1 : 0}
                aria-disabled={_locked || undefined}
                title={_locked ? "준비 중인 업종입니다" : undefined}
                style={_locked
                  ? { ...card(false), cursor: "not-allowed", opacity: 0.5,
                      background: "#f7f7f9", borderColor: "#ececef", color: "#999" }
                  : card(value === it.key)}
                onClick={() => { if (!_locked) onChange(it.key); }}>
                {it.label}
                {_locked ? (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#8a8a94",
                    background: "#ececef", borderRadius: 6, padding: "1px 6px" }}>준비중</span>
                ) : it.badge ? (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#C2185B",
                    background: "#fce4ec", borderRadius: 6, padding: "1px 6px" }}>{it.badge}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "14px 12px", borderRadius: 10, border: "1.5px dashed #e0d0f0",
          background: "#fafafa", textAlign: "center", fontSize: 12, color: "#bbb", fontWeight: 600 }}>
          위에서 업종 대분류를 먼저 선택하세요.
        </div>
      )}
    </>
  );
}

// [v25] IndustrySidePicker — 좌측 코치창 전용 경량 업종 선택기.
//   역할: "선택만". 카탈로그/로드맵/신청은 포함하지 않음(그건 IndustryCenter 둘러보기 전용).
//   데이터 = INDUSTRY_CATALOG 중 enabled(엔진 등록=발행가능) 업종만 카테고리 그룹으로 표시.
//   흐름: 업종 클릭(임시 선택) → [이 업종으로 시작하기] 확인 1스텝 → onConfirm(key) emit.
//   확정 계정(confirmedIndustry 있음)은 선택 잠금 + 안내. 좌측 폭이 좁으므로 1열 리스트.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// [v26→폐기] IndustrySideMenu — 좌측 다크 세로띠(사이드바) 상시 고정 "지원 업종" 패널.
//   ⚠️ 호출처 제거됨(업종센터 승격). 좌측 세로띠는 '🗂️ 업종센터' 진입 버튼으로 대체 →
//      트리/상태/상세/채택은 IndustryCenter가 전담. 본 컴포넌트는 미사용(렌더 안 됨).
//      정의는 보존(다음 방 좌측 도움말/리스트 작업 시 참고용). industrySidePick 배선도 죽은 채 무해.
//   역할: ① 일반 안내("이런 업종을 지원하는구나") ② 클릭 = 업종 선택 시도(채택은 호출부 판단).
//   데이터 = INDUSTRY_CATALOG 중 enabled(엔진 등록=발행가능) 업종만. 카테고리 무시 평면 리스트.
//   항상 클릭 가능(2-B). 저장 단계 분기(미확정=적용/확정=잠금)는 onPick 호출부에서 처리.
//   확정 계정의 현재 업종은 ● 표시(현재 사용중). 첫 N개만 + 더보기 토글.
//   collapsed(세로띠 접힘)일 때는 아이콘만, 펼침일 때 라벨.
// ─────────────────────────────────────────────────────────────────────────
export function IndustrySideMenu({ collapsed, currentIndustry, onPick }) {
  const FIRST_N = 5;
  const [expanded, setExpanded] = useState(false);
  const items = INDUSTRY_CATALOG.filter(it => it.enabled);
  const shown = expanded ? items : items.slice(0, FIRST_N);

  if (collapsed) {
    // 접힘(60px): 아이콘만. 클릭 시 펼치도록 유도(세로띠 토글은 부모가 담당하므로 여기선 표시만).
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginTop: 4 }}>
        <div title="지원 업종" style={{ fontSize: 18, lineHeight: 1, color: "#9a9ab5", padding: "8px 0" }}>🗂️</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 6px 6px",
        color: "#cbb8dd", fontSize: 11, fontWeight: 800, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
        <span>🗂️ 지원 업종</span>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.10)" }} />
      </div>

      {shown.map((it) => {
        const cur = currentIndustry && currentIndustry === it.id;
        return (
          <button key={it.id} type="button" onClick={() => onPick && onPick(it)}
            title={it.name}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              width: "100%", height: 38, borderRadius: 9, cursor: "pointer", flexShrink: 0,
              border: "none", fontFamily: "inherit", padding: "0 12px",
              fontSize: 13.5, fontWeight: cur ? 800 : 600,
              color: cur ? "#fff" : "#9a9ab5",
              background: cur ? "rgba(156,39,176,.28)" : "transparent",
              transition: "background .15s" }}
            onMouseOver={e => { if (!cur) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
            onMouseOut={e => { if (!cur) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cur ? "● " : ""}{it.name}
            </span>
          </button>
        );
      })}

      {items.length > FIRST_N && (
        <button type="button" onClick={() => setExpanded(v => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left",
            padding: "7px 12px", borderRadius: 9, fontFamily: "inherit", fontWeight: 700,
            fontSize: 12.5, color: "#7e7e9a", whiteSpace: "nowrap", transition: "color .15s" }}
          onMouseOver={e => { e.currentTarget.style.color = "#CE93D8"; }}
          onMouseOut={e => { e.currentTarget.style.color = "#7e7e9a"; }}>
          {expanded ? "접기 ▲" : `더보기 (${items.length - FIRST_N}) ▼`}
        </button>
      )}
    </div>
  );
}

// [업종센터/A] 좌·우 분리 구조.
//   좌측 코치창 = IndustryTree(대표업종→하위업종 트리). 우측 작업영역 = IndustryDetail(선택 1개 상세).
//   selId는 부모(최상위)가 보유(industryCenterSel) → 좌클릭 setIndustryCenterSel → 우측 갱신.
//   업종센터 = 전체 catalog 노출(enabled 무관). 채택은 enabled+미확정 계정만(우측 가드).
//   신규 신청 = 우측 폼(UI만, DB 저장 없음).
// ─────────────────────────────────────────────────────────────────────────
export function industryStatusBadge(status, size) {
  const m = INDUSTRY_STATUS_META[status] || INDUSTRY_STATUS_META.plan;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: size === "lg" ? 12.5 : 11, fontWeight: 700, color: m.color,
      background: m.bg, border: `1px solid ${m.border}`, borderRadius: 12,
      padding: size === "lg" ? "3px 11px" : "2px 8px", whiteSpace: "nowrap" }}>
      {m.dot} {m.label}
    </span>
  );
}

// 좌측 코치창 전용 — 카탈로그 트리(대표업종 그룹 → 하위업종). 클릭 시 onPick(id).
export function IndustryTree({ selId, confirmedIndustry, onPick, onSelect, isOwner, authUserId, counts }) {
  const C = { purple: "#9C27B0", purpleDark: "#4A148C" };
  // [v127] base(상위 분류) 업종은 트리에서 선택 대상이 아니다 — 그룹 헤더 역할만.
  //   restaurant='음식점'은 카테고리 개념. 사용자는 한식/중식/치킨/카페 등 세부만 선택.
  //   catalog 무변경(SoT 유지) — 트리 표시 단계에서만 제외.
  //   [세션50] realtor·presale(부동산 기획중 2종) 숨김 — 엔진 없는 plan 항목이 UI 혼동 유발.
  //           실제 엔진 생기면 이 셋에서 제거하면 재노출(catalog 무변경).
  const TREE_HIDDEN_BASE = new Set(["restaurant", "realtor", "presale"]);
  // [세션50] OWNER 전용 업종 — 일반 사용자 트리에서 완전 숨김(OWNER만 노출·채택).
  //   kindergarten(유치원·어린이집)·fishing(고패킹·바다낚시) = 관리자 검증용. catalog enabled:false와 병행(이중 가드).
  const TREE_OWNER_ONLY = new Set(["kindergarten", "fishing"]);
  const _hideSet = isOwner ? TREE_HIDDEN_BASE : new Set([...TREE_HIDDEN_BASE, ...TREE_OWNER_ONLY]);
  const groups = getCatalogByCategory()
    .map(g => ({ ...g, items: (g.items || []).filter(it => !_hideSet.has(it.id)) }))
    .filter(g => (g.items || []).length > 0);
  // [v-search] 업종 검색어. 업종명 + summary(대표서비스) 동시 매칭.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // 검색 결과: 그룹별로 매칭 item만 남김. 빈 그룹은 제거.
  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(it =>
          (it.name || "").toLowerCase().includes(q) ||
          (it.summary || "").toLowerCase().includes(q) ||
          // [v-search B] Tree 하위 전문점(sub.name/specialty)까지 매칭. SoT=industry-tree, 별도 인덱스 없음.
          treeItemsOf(it).some(sub =>
            ((sub.name || "").toLowerCase().includes(q)) ||
            ((sub.specialty || "").toLowerCase().includes(q))
          )
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [groups, q]);

  // 아코디언: 기본 전부 접힘. 단 현재 selId/confirmed가 속한 그룹은 자동 펼침(초기 1회).
  const autoOpenCat = (() => {
    const target = confirmedIndustry || selId;
    const hit = groups.find(g => g.items.some(it => it.id === target));
    return hit ? hit.category : "";
  })();
  const [openCats, setOpenCats] = useState(autoOpenCat ? { [autoOpenCat]: true } : {});
  const toggle = (cat) => setOpenCats(p => ({ ...p, [cat]: !p[cat] }));
  // 검색 중에는 매칭된 그룹을 모두 펼쳐 보여줌(접힘 토글 무시).
  const isOpen = (cat) => (q ? true : !!openCats[cat]);

  // [v-menu 2026-07-27] 가독성 개선 — 메뉴는 앞 SUMMARY_VISIBLE개만 노출하고 나머지는 "+N" 칩으로 접는다.
  //   근거: 메뉴 확장(업종당 8→13)으로 ellipsis 말줄임만으로는 "몇 개가 더 있는지" 정보가 사라졌다.
  //   접기 후에도 총량은 +N으로 보이므로 "메뉴가 이만큼 많다"(v127 의도)는 유지된다.
  const SUMMARY_VISIBLE = 8;
  // [v-tone] 트리 텍스트 농도는 enabled(발행 게이트)가 아니라 "표시 대상 여부"로 판정.
  //   plan(계획)만 흐리게. dev/review/live 는 동일 톤 → 관측 전 업종도 색이 갈라지지 않는다.
  const toneOn = (o) => !!o && o.status !== "plan";
  const splitSummary = (s) => (s ? String(s).split(/\s*·\s*/).filter(Boolean) : []);
  const trimSummary = (s) => splitSummary(s).slice(0, SUMMARY_VISIBLE).join(" · ");
  const moreCount = (s) => Math.max(0, splitSummary(s).length - SUMMARY_VISIBLE);

  const rowStyle = (active) => ({
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
    background: active ? "#faf5ff" : "transparent",
    border: active ? `1.5px solid ${C.purple}` : "1.5px solid transparent",
    transition: "all .12s",
  });

  return (
    <div style={{ animation: "fadeIn .25s ease", display: "flex", flexDirection: "column" }}>
      {/* ── 헤더 고정(sticky): 타이틀+카운트 → 아래 줄에 검색+신규. 스크롤해도 상단 노출 ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 3, background: "#fff", paddingTop: 20,
        marginTop: -4, borderBottom: "1px solid #f0e8f8" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "0 11px 12px" }}>
        <div style={{ fontSize: 19, fontWeight: 900, color: "#4A148C", flexShrink: 0 }}>🗂️ 업종센터</div>
        {counts && (
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", flexShrink: 0 }}>
            {counts.industries}개 업종 · {counts.menus}+ 메뉴 · {counts.categories}개 분야
          </div>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexShrink: 0 }}>
          <span style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "#b3a3c2", pointerEvents: "none" }}>🔍</span>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="업종 검색 (예: 치킨, 누수, 상속)"
              style={{ width: 240, boxSizing: "border-box", padding: "8px 26px 8px 30px",
                fontSize: 13, fontFamily: "inherit", color: "#2a2336",
                border: "1.5px solid #e6dcf2", borderRadius: 9, outline: "none",
                background: "#faf7fd", transition: "border .12s" }}
              onFocus={e => { e.currentTarget.style.border = `1.5px solid ${C.purple}`; }}
              onBlur={e => { e.currentTarget.style.border = "1.5px solid #e6dcf2"; }} />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent", cursor: "pointer",
                  fontSize: 12, color: "#b3a3c2", padding: 2 }}>✕</button>
            )}
          </span>
          <button type="button" onClick={() => onPick && onPick("__apply__")}
            title="신규 업종 신청"
            style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: C.purpleDark,
              background: "#f7f2fc", border: "1.5px dashed #ddd0ee", borderRadius: 8,
              padding: "8px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>➕ 신규</button>
        </span>
      </div>
      </div>{/* /sticky 헤더 */}

      {/* ── 업종 리스트 — 높이 제한 없음(페이지 스크롤). 검색은 상단 고정 입력. ── */}
      <div>
        {filtered.length === 0 && (
          <div style={{ padding: "18px 10px", fontSize: 12.5, color: "#9a92a6", textAlign: "center" }}>
            ‘{query}’ 와 일치하는 업종이 없어요.<br />
            위 <b style={{ color: C.purpleDark }}>➕ 신규</b> 버튼으로 알려주세요.
          </div>
        )}
        {filtered.map(g => {
          const open = isOpen(g.category);
          return (
            <div key={g.category} style={{ marginBottom: 4 }}>
              {/* 대분류 헤더(아코디언 토글) */}
              <div role="button" tabIndex={0} onClick={() => toggle(g.category)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  padding: "9px 10px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                  background: open ? "#f6f0fc" : "#faf9fc", transition: "background .12s" }}
                onMouseOver={e => { if (!open) e.currentTarget.style.background = "#f3eefb"; }}
                onMouseOut={e => { if (!open) e.currentTarget.style.background = "#faf9fc"; }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: "#9457b8", width: 10, flexShrink: 0,
                    transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#6a4a88", whiteSpace: "nowrap" }}>{g.category}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#a08ab0" }}>({g.items.length})</span>
                </span>
              </div>
              {/* 하위업종 — 펼쳐졌을 때만. 좌측 가이드라인으로 그룹 소속 시각화. */}
              {open && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2,
                  padding: "2px 0 6px 0", marginLeft: 14,
                  borderLeft: "1.5px solid #efe6f7" }}>
                  {g.items.map(it => {
                    // [Tree Spine 2단] 전문점 목록은 Tree(SoT)에서 조회. catalog subItems 폴백(호환).
                    //   전문점 클릭 → onSelect("restaurant#specialty") 복합키 유지. 엔진 무수정.
                    // [v-search B] 검색어 있으면 하위 노드를 q로 필터 — 매칭된 전문점만 렌더.
                    let _subItems = treeItemsOf(it);
                    if (q) {
                      const _hit = _subItems.filter(sub =>
                        ((sub.name || "").toLowerCase().includes(q)) ||
                        ((sub.specialty || "").toLowerCase().includes(q)));
                      // 하위 매칭 없고 상위(name)만 매칭이면 전체 유지(그룹 자체 검색).
                      if (_hit.length) _subItems = _hit;
                      else if (!(it.name || "").toLowerCase().includes(q)) _subItems = [];
                    }
                    if (_subItems.length) {
                      const eng = treeEngineOf(it);
                      return (
                        <div key={it.id} style={{ marginBottom: 2 }}>
                          {/* 대분류 소헤더(비클릭 — 그룹 라벨만) */}
                          <div style={{ display: "flex", alignItems: "center", gap: 7,
                            padding: "6px 8px 2px 6px" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: "#6a4a88", whiteSpace: "nowrap" }}>
                              {it.icon ? it.icon + " " : ""}{it.name}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#a08ab0" }}>({_subItems.length})</span>
                          </div>
                          {/* 하위 전문점 행 */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2,
                            marginLeft: 10, borderLeft: "1.5px solid #f2ecf9", paddingLeft: 4, minWidth: 0 }}>
                            {_subItems.map(sub => {
                              const subKey = eng + "#" + (sub.specialty || sub.name);
                              const active = selId === subKey;
                              const canSelect = authUserId && (isOwner
                                ? sub.status !== 'plan'
                                : (sub.enabled && !confirmedIndustry));
                              // [전문점 메뉴 인라인] 전문점 표준 메뉴셋(SPECIALTY.menus) 읽기전용 표시.
                              //   소스 = restaurant-data getSpecialtyMenus(SoT). 하드코딩 없음 · MENUS 변경 시 자동 반영.
                              //   restaurant 엔진(eng==='restaurant')만 대상. 클릭 대상 아님(전문점 행만 선택).
                              const specMenus = (eng === "restaurant")
                                ? getSpecialtyMenus(sub.specialty || sub.name) : [];
                              return (
                                <div key={sub.id}>
                                  {/* [v131] 전문점 행 클릭 = 미리보기(onPick)만 → 다른 전문점 계속 둘러보기 가능. 채택은 아래 선택하기 버튼으로만. */}
                                  <div role="button" tabIndex={0}
                                    onClick={() => { if (onPick) onPick(subKey); }}
                                    style={{ ...rowStyle(active), marginLeft: 4, alignItems: "center" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden", flex: 1, flexWrap: "nowrap" }}>
                                      <span style={{ width: 10, height: 10, flexShrink: 0,
                                        borderRadius: statusMark(sub.status, sub.verified, sub.version, sub.done, sub.closed).radius,
                                        background: statusMark(sub.status, sub.verified, sub.version, sub.done, sub.closed).bg,
                                        border: `2px solid ${statusMark(sub.status, sub.verified, sub.version, sub.done, sub.closed).bd}`,
                                        opacity: statusMark(sub.status, sub.verified, sub.version, sub.done, sub.closed).op }} />
                                      <span style={{ fontSize: 14, fontWeight: active ? 900 : 700,
                                        color: active ? C.purpleDark : (toneOn(sub) ? "#1a1a2e" : "#5a5270"),
                                        whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "-0.2px" }}>{sub.name}</span>
                                      {specMenus.length > 0 && (
                                        <>
                                          <span style={{ width: 1, height: 11, background: "#d8c8ec", flexShrink: 0, margin: "0 2px" }} />
                                          <span style={{ fontSize: 11.5, color: "#a89dba",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                                            {specMenus.slice(0, SUMMARY_VISIBLE).join(" · ")}</span>
                                          {specMenus.length > SUMMARY_VISIBLE && (
                                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a",
                                              background: "#f5f0fa", border: "1px solid #ece3f5", borderRadius: 7,
                                              padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>
                                              +{specMenus.length - SUMMARY_VISIBLE}</span>
                                          )}
                                        </>
                                      )}
                                    </span>
                                    {/* [v127] 선택하기 = 행 안쪽 우측 고정(1줄 유지) */}
                                    {!(active && canSelect && onSelect) && <span style={{ width: 78, flexShrink: 0 }} />}
                                    {active && canSelect && onSelect && (
                                      <button type="button"
                                        onClick={(e) => { e.stopPropagation(); onSelect(subKey); }}
                                        style={{ fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0,
                                          border: "none", background: C.purpleDark, color: "#fff",
                                          borderRadius: 8, padding: "5px 13px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                                        선택하기
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    const active = selId === it.id;
                    const m = INDUSTRY_STATUS_META[it.status] || INDUSTRY_STATUS_META.plan;
                    const canSelect = authUserId && (isOwner
                      ? it.status !== 'plan'
                      : (it.enabled && !confirmedIndustry));
                    return (
                      <div key={it.id}>
                        {/* [v131] 행 클릭 = 미리보기(onPick)만 → 다른 업종 계속 둘러보기 가능. 채택은 선택하기 버튼으로만. */}
                        <div role="button" tabIndex={0}
                          onClick={() => { if (onPick) onPick(it.id); }}
                          style={{ ...rowStyle(active), marginLeft: 6, alignItems: "center" }}>
                          {/* [v130] 한 줄 구조 — 상태원 · 업종명 · 구분선 · 대표메뉴(최대4개). nowrap, 넘치면 말줄임. */}
                          <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden", flex: 1, flexWrap: "nowrap" }}>
                            <span style={{
                              width: 12, height: 12, flexShrink: 0,
                              borderRadius: statusMark(it.status, it.verified, it.version, it.done, it.closed).radius,
                              background: statusMark(it.status, it.verified, it.version, it.done, it.closed).bg,
                              border: `2px solid ${statusMark(it.status, it.verified, it.version, it.done, it.closed).bd}`,
                              opacity: statusMark(it.status, it.verified, it.version, it.done, it.closed).op,
                            }} />
                            {/* [v-menu] 업종명 강조 — 메뉴 대비 크기·굵기·색 3단 대비로 스캔 속도 확보 */}
                            <span style={{ fontSize: 15.5, fontWeight: active ? 900 : (toneOn(it) ? 900 : 700),
                              color: active ? C.purpleDark : (toneOn(it) ? "#15121f" : "#9a92a6"),
                              whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "-0.3px" }}>{it.name}</span>
                            {it.status === 'plan' && (
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: m.color,
                                background: m.bg, border: `1px solid ${m.border}`, borderRadius: 8,
                                padding: "1.5px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{m.label}</span>
                            )}
                            {it.summary && (
                              <>
                                {/* 업종 ↔ 메뉴 구분선 */}
                                <span style={{ width: 1, height: 11, background: "#d8c8ec", flexShrink: 0, margin: "0 2px" }} />
                                <span style={{ fontSize: 11.5,
                                  color: active ? "#a37ec4" : (toneOn(it) ? "#9a91a8" : "#b3aabf"),
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                                  {trimSummary(it.summary)}</span>
                                {moreCount(it.summary) > 0 && (
                                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a",
                                    background: "#f5f0fa", border: "1px solid #ece3f5", borderRadius: 7,
                                    padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    +{moreCount(it.summary)}</span>
                                )}
                              </>
                            )}
                          </span>
                          {/* [v127] 선택하기 = 행 안쪽 우측 고정(1줄 유지). 좌측 텍스트는 버튼 직전까지 채우고 말줄임.
                              비활성 행도 동일 폭을 비워둬 선택 시 텍스트가 흔들리지 않게 한다. */}
                          {!(active && canSelect && onSelect) && <span style={{ width: 78, flexShrink: 0 }} />}
                          {active && canSelect && onSelect && (
                            <button type="button"
                              onClick={(e) => { e.stopPropagation(); onSelect(it.id); }}
                              style={{ fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0,
                                border: "none", background: C.purpleDark, color: "#fff",
                                borderRadius: 8, padding: "5px 13px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                              선택하기
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 우측 작업영역 전용 — 선택된 업종 상세 1개 OR 신규 신청 폼.
export function IndustryDetail({ selId, confirmedIndustry, onSelect, onPick }) {
  const [applyForm, setApplyForm] = useState({ name: "", homepage: "", refsite: "", detail: "" });
  const [applySent, setApplySent] = useState(false);
  const sel = getCatalogItem(selId);

  // [v27] 첫 진입(selId 없음) = 전체 업종 카드 카탈로그. 카드 클릭 → onPick(id) → 상세 전환.
  if (!selId) {
    // [A안 복구] 우측 그리드 제거 → 좌측 트리 선택 유도. 업종 30~50개 확장 시 우측 과열 방지.
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn .25s ease" }}>
        <div style={{ background: "linear-gradient(135deg,#f3e9ff,#fdfbff)", border: "1.5px solid #e0d0f0",
          borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#4A148C", marginBottom: 4 }}>🗂️ 업종센터</div>
          <div style={{ fontSize: 12.5, color: "#6a5a7a", lineHeight: 1.6 }}>
            왼쪽 트리에서 업종을 선택하면 여기에 상세가 표시됩니다. <b style={{ color: "#16a34a" }}>🟢 운영중</b> 업종만 바로 시작할 수 있어요.
          </div>
        </div>
        <div style={{ background: "#fafafa", border: "1.5px dashed #e0d0f0", borderRadius: 14,
          padding: "44px 20px", textAlign: "center", color: "#a08ab0", fontSize: 13.5, fontWeight: 700 }}>
          👈 왼쪽 업종센터에서 업종을 선택하세요.
        </div>
      </div>
    );
    }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn .25s ease" }}>
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg,#f3e9ff,#fdfbff)", border: "1.5px solid #e0d0f0",
        borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#4A148C", marginBottom: 4 }}>🗂️ 업종센터</div>
        <div style={{ fontSize: 12.5, color: "#6a5a7a", lineHeight: 1.6 }}>
          왼쪽에서 업종을 선택하면 상세가 표시됩니다. <b>🟢 운영중</b> 업종만 시작할 수 있습니다.
          {confirmedIndustry && " 이미 업종이 확정된 계정은 선택이 잠겨 있습니다(변경은 관리자 요청)."}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "18px 20px" }}>
        {selId === "__apply__" ? (
          // ── 신규 업종 신청 (UI만, DB 저장 없음) ──
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#4A148C" }}>➕ 신규 업종 신청</div>
            <div style={{ fontSize: 12.5, color: "#6a5a7a", lineHeight: 1.6 }}>
              원하시는 업종이 목록에 없나요? 아래에 알려주시면 개발 우선순위 검토에 반영합니다.
            </div>
            {applySent ? (
              <div style={{ background: "#e7f7ee", border: "1.5px solid #bfe8cf", borderRadius: 10,
                padding: "14px 16px", fontSize: 13, color: "#16794a", fontWeight: 700, lineHeight: 1.6 }}>
                ✅ 신청이 접수되었습니다. 검토 후 업종센터에 반영됩니다.
                <div style={{ fontSize: 11.5, color: "#5a9a78", fontWeight: 500, marginTop: 4 }}>
                  (현재 단계에서는 화면 접수만 됩니다. 실제 등록은 개발 일정에 따라 진행됩니다.)
                </div>
              </div>
            ) : (
              <>
                {[
                  { k: "name", label: "업종명", ph: "예: 동물병원" },
                  { k: "homepage", label: "홈페이지", ph: "예: https://..." },
                  { k: "refsite", label: "참고 사이트", ph: "예: 잘 쓰는 블로그 URL" },
                ].map(f => (
                  <div key={f.k}>
                    <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input value={applyForm[f.k]} onChange={e => setApplyForm(p => ({ ...p, [f.k]: e.target.value }))}
                      placeholder={f.ph}
                      style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
                        fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>요청 내용</label>
                  <textarea value={applyForm.detail} onChange={e => setApplyForm(p => ({ ...p, detail: e.target.value }))}
                    placeholder="어떤 글을 쓰고 싶은지, 주요 고객층 등 자유롭게 적어주세요"
                    rows={3}
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
                      fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box", resize: "vertical" }} />
                </div>
                <button type="button"
                  disabled={!applyForm.name.trim()}
                  onClick={() => { if (applyForm.name.trim()) setApplySent(true); }}
                  style={{ padding: "11px 18px", borderRadius: 10, border: "none",
                    background: applyForm.name.trim() ? "#7B1FA2" : "#e8e8ed",
                    color: applyForm.name.trim() ? "#fff" : "#aaa",
                    fontSize: 13.5, fontWeight: 800, cursor: applyForm.name.trim() ? "pointer" : "default",
                    fontFamily: "inherit" }}>
                  신청 보내기
                </button>
              </>
            )}
          </div>
        ) : sel ? (
          // ── 업종 상세 ──
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div role="button" tabIndex={0} onClick={() => onPick && onPick("")}
              style={{ fontSize: 12, fontWeight: 700, color: "#9457b8", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5, width: "fit-content" }}>
              ← 전체 업종 보기
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {sel.icon && <span style={{ fontSize: 24, lineHeight: 1 }}>{sel.icon}</span>}
              <span style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{sel.name}</span>
              {industryStatusBadge(sel.status, "lg")}
              {sel.version && (
                <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11.5,
                  fontWeight: 800, color: "#4A148C", background: "#f4eefb", border: "1px solid #e5dcef",
                  borderRadius: 12, padding: "3px 10px", whiteSpace: "nowrap" }}>
                  {sel.version}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "#999", marginTop: -8 }}>{sel.category}</div>

            {sel.description && (
              <div style={{ fontSize: 13.5, color: "#444", lineHeight: 1.7 }}>{sel.description}</div>
            )}

            {sel.example && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#8a6aa8", marginBottom: 5 }}>생성 예시</div>
                <div style={{ fontSize: 12.5, color: "#5a5a6a", background: "#faf7fd",
                  border: "1px solid #efe6f7", borderRadius: 8, padding: "9px 12px", lineHeight: 1.6 }}>
                  {sel.example}
                </div>
              </div>
            )}

            {Array.isArray(sel.features) && sel.features.length > 0 && (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#8a6aa8", marginBottom: 6 }}>지원 기능</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {sel.features.map((f, i) => (
                    <span key={i} style={{ fontSize: 11.5, fontWeight: 700, color: "#7B1FA2",
                      background: "#f4eefb", border: "1px solid #e5dcef", borderRadius: 12, padding: "4px 10px" }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 선택 버튼 — enabled만 활성. 확정 계정은 잠금. */}
            <div style={{ marginTop: 6, paddingTop: 14, borderTop: "1px dashed #e0d0f0" }}>
              {confirmedIndustry ? (
                confirmedIndustry === sel.id ? (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#4A148C",
                    background: "#f4eefb", border: "1.5px solid #e5dcef", borderRadius: 10,
                    padding: "11px 14px", textAlign: "center" }}>
                    ✓ 현재 운영 중인 업종입니다
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#a08ab0", lineHeight: 1.6, textAlign: "center" }}>
                    🔒 업종은 가입 시 1회 확정됩니다. 변경은 관리자 요청이 필요합니다.
                  </div>
                )
              ) : sel.enabled ? (
                <button type="button" onClick={() => onSelect && onSelect(sel.id)}
                  style={{ width: "100%", padding: "12px 18px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg,#4A148C,#9C27B0)", color: "#fff",
                    fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                    boxShadow: "0 2px 8px rgba(74,20,140,.25)" }}>
                  이 업종으로 시작하기 →
                </button>
              ) : (
                <div style={{ fontSize: 12.5, color: "#999", lineHeight: 1.6, textAlign: "center",
                  background: "#f7f7f9", border: "1px solid #ececef", borderRadius: 10, padding: "11px 14px" }}>
                  아직 준비 중인 업종입니다. 준비가 끝나면 선택할 수 있어요.
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>
                    먼저 쓰고 싶으시면 왼쪽 ‘신규 업종 신청’으로 알려주세요.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#999", textAlign: "center", padding: "40px 0" }}>
            왼쪽 업종센터에서 업종을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
