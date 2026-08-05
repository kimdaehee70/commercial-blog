// ============================================================
// lib/Store.js — Store Spine (업체정보 폼 + 저장/API)
// ------------------------------------------------------------
// [Spine 분리 2026-07-06] index.js에서 이관. UI·동작 100% 유지.
//   포함: StoreInfoForm / industryPath(주입식) / createStore·saveStore 팩토리
//   주입: INDUSTRY_CONFIG·lex 는 index 본체 SoT → props/인자 주입 (SoT 무이동)
//   자체 import: IndustryPicker / SUB_TO_GROUP·INDUSTRY_GROUPS / getCatalogItem / supabase
//   FREEZE 원칙: 선택 UI는 IndustrySelector.js, 선택구조는 industry-tree.js, 여기는 Store 전용.
// [v-dept 2026-07-12] 병원 다중 진료과 — 진료과 복수선택 카드 추가(병원군만 노출).
//   저장: saveStore({departments}) — 기존 임의 patch PATCH 경로 재사용(팩토리 무수정).
//   불변식: departments[0] = 대표 진료과 = hubStore.industry (서버 store.js가 최종 강제).
//   비병원 업종·미확정 계정 = 카드 미렌더 → 영향 0.
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { IndustryPicker } from "./IndustrySelector";
import { SUB_TO_GROUP, INDUSTRY_GROUPS,
         HOSPITAL_DEPARTMENTS, isHospitalIndustry, normalizeDepartments,
         serviceGroupOf, hasServiceFields } from "./industry-tree";
import { getCatalogItem, hasPhysicalStore } from "./industry-catalog"; // [세션39][STORE-01] hasPhysicalStore 추가

// ─────────────────────────────────────────────────────────────
// createStore / saveStore 팩토리
//   index Home()의 setter(setStoreSaving/setHubStore/setStoreReady)를 주입받아
//   기존 useCallback 본문을 그대로 재현. 동작 무변경.
// ─────────────────────────────────────────────────────────────
export function makeStoreApi({ setStoreSaving, setHubStore, setStoreReady }) {
  // [v67] 온보딩 — 업종+업체명으로 store_profiles 1행 생성(POST). industry는 여기서만 확정(이후 고정).
  const createStore = async ({ industry, storeName }) => {
    try {
      setStoreSaving(true);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return { ok: false, error: "NO_SESSION" };
      const res = await fetch("/api/me/store", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ industry, storeName }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setHubStore(prev => ({ ...(prev || {}), industry: j.industry, store_name: j.storeName, id: j.storeId }));
        return { ok: true };
      }
      return { ok: false, error: j?.error || "CREATE_FAILED" };
    } catch (e) {
      return { ok: false, error: e?.message };
    } finally {
      setStoreSaving(false);
    }
  };

  // [v26] 업체정보 저장 — me/store PATCH. store_name/industry 는 변경 안 함.
  const saveStore = async (patch) => {
    try {
      setStoreSaving(true);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return { ok: false };
      const res = await fetch("/api/me/store", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch || {}),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok && j.store) {
        setHubStore(j.store);
        if ((j.store.region || "").trim()) setStoreReady("ready");
        return { ok: true };
      }
      return { ok: false, error: j?.error || "SAVE_FAILED" };
    } catch (e) {
      console.warn("[store] 저장 실패:", e?.message);
      return { ok: false, error: e?.message };
    } finally {
      setStoreSaving(false);
    }
  };

  return { createStore, saveStore };
}

// ─────────────────────────────────────────────────────────────
// StoreInfoForm — 업체정보 폼 (index.js 원본 이관, UI 무변경)
//   [주입] INDUSTRY_CONFIG·lex 를 props로 수신 (index 본체 SoT).
// ─────────────────────────────────────────────────────────────
// [세션57][AI영상코치] 입력 카드용 「▶ 영상보기」 — 클릭 시 좌측 코치창 영상이 해당 도우미로 교체.
//   onCoachVideo 미주입 시 렌더 안 함(하위호환). vkey = index.js COACH_VIDEOS 키.
function VideoHelpBtn({ onCoachVideo, vkey }) {
  if (!onCoachVideo) return null;
  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); onCoachVideo(vkey); }}
      style={{ flexShrink: 0, padding: "5px 11px", borderRadius: 14,
        border: "1px solid #e0c4f2", background: "#fff", color: "#7B1FA2",
        fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        whiteSpace: "nowrap" }}>
      ▶ 영상보기
    </button>
  );
}

export function StoreInfoForm({ hubStore, setHubStore, saveStore, createStore, storeSaving, industryLabel, hubLoading, isOwner, initialPick, initialSpecialty, onGoIndustryCenter, onCoachVideo, authUserId, editRef, INDUSTRY_CONFIG, lex }) {
  // 2순위 기본정보 필드 (지역 전략 2개는 별도 강조 렌더)
  // [v77] parking_info 제거 → 신원(기본정보) 박스로 이동. 여기엔 변동성 큰 진료시간·URL만.
  // [v122] business_hours 라벨/placeholder/hint = 업종 용어집(lex) 기준. 음식점=영업시간.
  const _LX = lex(hubStore && hubStore.industry);
  // [세션35] 추가정보 → '참고 링크'로 축소. business_hours는 방문정보(visit_info.businessHours)로 일원화(입력칸 제거).
  //   위치 3필드(map_guide/transit/building_desc)는 방문정보(찾아오시는 길) 영역으로 이동 → LOCATION_FIELDS로 분리.
  //   기존 business_hours 컬럼은 유지(기존 데이터 보호). 읽기 경로는 visit_info.businessHours fallback.
  const BASIC_FIELDS = [
    { key: "naver_place_url", label: "네이버 플레이스/홈페이지", ph: "예: www.ai-post.ai", area: false, hint: "https:// 없이 입력해도 됩니다" },
    { key: "naver_blog_url", label: "블로그",    ph: "예: blog.naver.com/아이디 (주소창 복붙)", area: false, hint: "기존 운영 스타일 참고 (추후)" },
  ];
  // [v127] 찾아오시는 길(위치 3필드) 은퇴 — 대중교통은 방문정보 transit로 통합, 주차는 parkingOps 단일화.
  //   map_guide/building_desc 폐기(주소 중복). LOCATION_KEYS는 빈값 PATCH 유지 → locationBlock 자동 미생성(FREEZE 무수정).
  const LOCATION_FIELDS = [];
  const LOCATION_KEYS = ["map_guide", "transit", "building_desc", "parking_info"];
  const ALL_KEYS = ["region", "sub_region", "address", "phone", ...BASIC_FIELDS.map(f => f.key), ...LOCATION_FIELDS.map(f => f.key)];

  // [v68] 업종 확정 여부 — store_profiles 행에 industry가 있으면 확정(최초 1회·고정).
  //   미확정이면 상단에서 업종 선택 + 업체명 입력 → createStore(POST)로 확정.
  //   확정 후 업종은 읽기전용 배지 + 변경 안내문구(고객지원 요청). store_name/industry는 서버 PATCH 차단.
  const industryConfirmed = !!(hubStore && hubStore.industry);
  const [pickIndustry, setPickIndustry] = useState(initialPick || "");
  const [confirmErr, setConfirmErr] = useState("");
  // [업종센터] initialPick 반영 useEffect는 ident state 선언 이후로 이동(아래).
  // [v124] 온보딩 1화면 통합 — 업종 카드 선택 즉시 업체정보 폼 노출(중간 '입력 시작' 버튼 제거).
  //   1단계: 업종 선택 → 같은 화면에서 폼 즉시 펼침. 2단계 버튼 클릭(onStartReg/regExpand state) 폐지.
  //   regExpand = 업종 선택 여부 파생값. 업종 미선택=picker만 / 선택=폼 확장. 최종 [저장]에서만 createStore→saveStore.
  //   업종 선택 ≠ DB 저장 / 최종 저장 = DB 생성. placeholder·빈 레코드 없음. me/store API 무접촉.
  const regExpand = !!pickIndustry;

  // ─────────────────────────────────────────────────────────────
  // [v72][B안] 테스트 단계 임시 정책: 확정계정도 업체명+업종 자유 수정 허용.
  //   서버 store.js(FREEZE)는 PATCH로 store_name/industry를 막으므로,
  //   여기선 프론트 hubStore만 로컬 갱신 → 폼·코치·라벨이 즉시 새 업종으로 재렌더(화면 확인용).
  //   생성/발행은 hubStore를 소스로 보므로 테스트 확인에 충분.
  // TODO: 오픈 시 → 업종 최초 1회 확정 + 이후 변경은 industry PATCH 1회 제한(서버)으로 전환.
  //       이 editIdent 블록 제거하고 v68 읽기전용 배지로 복귀.
  // ─────────────────────────────────────────────────────────────
  const [editIdent, setEditIdent] = useState(false);
  const [identIndustry, setIdentIndustry] = useState((hubStore && hubStore.industry) || "");
  // [전문점 2단 트리] 전문점명(specialty) 보관. 센터 전달값(initialSpecialty) 우선, 없으면 hubStore 복원.
  const [specialty, setSpecialty] = useState((initialSpecialty || (hubStore && hubStore.specialty) || ""));
  const [identName, setIdentName] = useState((hubStore && hubStore.store_name) || "");
  const [identConfirm, setIdentConfirm] = useState(false); // [v72] 적용 직전 확인 단계
  // [업종선택 직접갱신] 명령형 핸들 등록. onSelect(부모)가 업종 선택 이벤트마다 openEditFor를 직접 호출.
  //   값의존 useEffect([initialPick]) 제거 — 같은 업종 재선택/동일값에도 항상 우측 폼이 갱신되도록 이벤트 기반으로 전환.
  //   확정계정: 수정모드 자동 오픈 + identIndustry 갱신. 미확정: pickIndustry 반영.
  const openEditFor = (ind, spec) => {
    if (!ind) return;
    if (industryConfirmed) {
      setIdentIndustry(ind);
      setIdentName((hubStore && hubStore.store_name) || "");
      setIdentConfirm(false);
      setEditIdent(true);
    } else {
      setPickIndustry(ind);
      setConfirmErr("");
    }
    if (spec) setSpecialty(spec);
  };
  // [업종선택 직접갱신] pending 소비 — 마운트/리렌더 시점 모두 대응.
  //   onSelect가 editRef.current.pending에 담으면, 이 폼이 리렌더될 때 감지해 openEditFor 1회 실행.
  //   editRef.current를 openEditFor 핸들로 되돌려 다음 pending을 받을 준비.
  useEffect(() => {
    const pend = editRef && editRef.current && editRef.current.pending;
    if (pend && pend.ind) {
      openEditFor(pend.ind, pend.spec);
      editRef.current = { openEditFor };
    } else if (editRef && !editRef.current) {
      editRef.current = { openEditFor };
    }
  });
  // [전문점 2단 트리] 센터에서 전문점 선택 시 specialty 반영.
  useEffect(() => {
    if (initialSpecialty && initialSpecialty !== specialty) setSpecialty(initialSpecialty);
    /* eslint-disable-next-line */
  }, [initialSpecialty]);
  // 세부업종 key → "그룹라벨 > 세부라벨" 경로 문자열
  const industryPath = (key, spec) => {
    if (!key) return "";
    const gKey = SUB_TO_GROUP[key];
    const g = INDUSTRY_GROUPS.find(x => x.key === gKey);
    let subLbl = (INDUSTRY_CONFIG[key] && INDUSTRY_CONFIG[key].label) || (getCatalogItem(key) && getCatalogItem(key).name) || key;
    // [전문점 표시] restaurant는 TREE_HIDDEN_BASE라 base명만 나옴 → 표시 레이어에서 specialty 결합 (표시 전용, 저장/URL 무관)
    if (key === "restaurant" && spec) subLbl = `${subLbl} > ${spec}`;
    return g ? `${g.label} > ${subLbl}` : subLbl;
  };

  // [v127] 주차정보(parking_info) 입력 제거 — 주차는 방문정보(parkingOps) 단일화. PARK_OPTS/parseParking/composeParking 폐기.

  const [identMsg, setIdentMsg] = useState("");
  // [v-savefix 2026-07-22] 저장 버튼 상태(idle|saving|done) + 성공 메시지.
  //   기존 identMsg는 오류 전용(빨강)이라 성공 피드백이 없어 "저장됐는지 실패인지" 판단 불가였다.
  const [identSaveState, setIdentSaveState] = useState("idle");
  const [identOkMsg, setIdentOkMsg] = useState("");

  const initial = () => {
    const s = hubStore || {};
    const o = {};
    ALL_KEYS.forEach(k => { o[k] = s[k] || ""; });
    return o;
  };
  const [form, setForm] = useState(initial);
  const [savedMsg, setSavedMsg] = useState("");
  const [savedMsgSuffix, setSavedMsgSuffix] = useState(""); // [v78] 제목 설정 카드 전용 저장 메시지
  // [v78] 제목 끝 상호 표시 토글 — 신규 업체 기본 ON, 기존 업체는 DB값 유지(?? true).
  //   row 있는 기존 업체는 NOT NULL이라 true/false 확정값 → 그대로 복원. row 없는 신규만 undefined → ON.
  const [suffixOn, setSuffixOn] = useState((hubStore && hubStore.title_suffix_on) ?? true);
  const [moreOpen, setMoreOpen] = useState(false); // [v126] 최초 등록 '추가정보'(전화·방문안내) 접이식 — 저장과 무관
  const [editRegion, setEditRegion] = useState(false); // [v27] 대표지역 수동 수정 토글(기본 배지 표시)

  // ─────────────────────────────────────────────────────────────
  // [v-visit] Visit Info Spine — 방문판단정보 입력 (UI/state만. DB 저장·엔진·프롬프트 무연결)
  //   근거: 세션31 §4 — Restaurant 상단글 = Purpose + Visit Info 양대축. 우리 글은 둘 다 부재.
  //   범위(세션32): 입력 UI + form state + JSON 구조 확정까지. 저장은 VISIT_INFO_SAVE_ENABLED 플래그 뒤 대기.
  //   저장 보류 이유: store에 visit_info jsonb 컬럼 없음 → 진짜 무변경 저장 경로 없음. schema 승인+store.js(배포순서 규칙) 별도 게이트.
  //   구조 원칙: 외식업 전반(카페/고깃집/치킨/한식/일식/중식) 공통 Spine. 업종별 필요 항목만 노출(향후 룸/발렛/오션뷰 등 확장 시 스키마 무변경).
  //   빈값 필드는 향후 출력 단계에서 자동 미출력(§4 입력 원칙).
  const VISIT_INFO_SAVE_ENABLED = true; // [세션34] store.js visit_info jsonb 승인·배포 완료 → 저장 활성. (schema 승인 2026-07-02)

  // ── [세션38][VISIT-STEP3] 병원군 방문정보 13필드 ──────────────────────────
  //   근거: lib/visitBlock.js(세션37) 13키 = 출력 순서 SoT. 입력란이 없어 값이 항상 빈값이던 상태 → 여기서 공급.
  //   ⚠ 게이트 실측 2건 — 둘 다 사용 금지:
  //     (a) index.js isMedical(NONMEDICAL_INDUSTRIES): Set이 10개뿐 → 청소/이사/세무 등 수십 비의료 업종이 의료로 오판정.
  //     (b) industry-tree isHospitalIndustry(HOSPITAL_DEPT_IDS): dental/oriental/clinic 의도적 제외(다중진료과 전용 SoT)
  //         → 치과·한의원·성형외과가 외식 필드를 받게 됨.
  //   → 방문정보 전용 판정. HOSPITAL_DEPT_IDS(17) + 단독개원 3(dental/oriental/clinic) = visitBlock 배선 병원군 20.
  //   비병원 업종 = 기존 외식형 12필드 그대로(무변경·무손상).
  const isHospital = (() => {
    const ind = String((hubStore && hubStore.industry) || "");
    return isHospitalIndustry(ind) || ind === "dental" || ind === "oriental" || ind === "clinic";
  })();

  // ── [세션47][PRO-VISIT] 전문직 방문정보 게이트 ────────────────────────────
  //   근거: 실측상 전문직 5개(lawyer/legal/administrative/labor/tax)는 isHospital=false →
  //         VISIT_INFO_FIELDS_GEN(외식형 12필드)으로 떨어져 "라스트오더·웨이팅·반려동물·대표메뉴·가격"이
  //         변호사 업체정보 화면에 노출되던 상태. 업종 성격 불일치.
  //   → 전문직 전용 11필드(VISIT_INFO_FIELDS_PRO) 신설. lib/proVisitBlock.js PRO_VISIT_LINES 와 1:1.
  //   ⚠ 하드코딩 명단 유지 이유: catalog에 "전문직군" 플래그가 없다. 회계사·관세사·변리사 엔진 추가 시
  //     이 배열에 id 1개 추가 = 방문정보 자동 연결(모듈·핸들러 무수정).
  const PRO_INDUSTRIES = [
    "lawyer",         // 변호사
    "legal",          // 법무사
    "administrative", // 행정사
    "labor",          // 노무사
    "tax",            // 세무사
    // ↓ 엔진 추가 시 주석 해제 (Store.js 1줄 = 방문정보 즉시 연결)
    // "accounting",  // 회계사
    // "customs",     // 관세사
    // "patent",      // 변리사
  ];
  const isPro = PRO_INDUSTRIES.includes(String((hubStore && hubStore.industry) || ""));

  // ── [세션48][FUNERAL-VISIT] 상조 게이트 ───────────────────────────────────
  //   상조(funeral)는 병원·전문직·외식 어디에도 안 맞음 → 전용 UI로 분기. GEN 폴백 차단.
  const isFuneral = String((hubStore && hubStore.industry) || "") === "funeral";

  // ── [세션39][STORE-01] 매장 유무 게이트 ───────────────────────────────
  //   hasStore=false(방문형·출장 서비스) → 방문정보 박스 + 찾아오시는 길(위치 3필드) 전체 미노출.
  //   근거: 고객이 업체를 방문하지 않는 업종(청소·이사·방역·누수·꽃배달·유치원 출장행사 등 24종).
  //   ⚠ address(주소)는 유지 — 대표지역 SoT(suggestRegion)·지역키워드 기반이라 제거 시 지역 판정 파괴.
  //   SoT = industry-catalog.hasPhysicalStore(). 미기재/미등록 = true(매장형 기본).
  const hasStore = hasPhysicalStore(String((hubStore && hubStore.industry) || ""));

  // [v127] 병원 방문정보 축소 — 예약/접수/당일접수/예약없이방문/초진준비/검사전준비/보호자동행/문의/기타 삭제.
  //   근거: 예약 과정에서 안내되는 공통 정보 = 차별성 0 · 입력 부담만 증가.
  //   유지 = 검색자가 실제 묻는 것: 평일·점심·토요일·야간·공휴일 진료시간 + 주차 운영.
  const VISIT_INFO_FIELDS_MED = [
    { key: "businessHours", label: "평일 진료시간", ph: "예: 09:00~18:00",            area: false, hint: "월~금 기준" },
    { key: "lunchHours",    label: "점심시간",     ph: "예: 13:00~14:00",            area: false, hint: "선택 · 비우면 미출력" },
    { key: "satHours",      label: "토요일 진료",   ph: "예: 09:00~13:00 / 토요일 휴진", area: false, hint: "선택 · 비우면 미출력" },
    { key: "nightHours",    label: "야간진료",     ph: "예: 월·목 20:00까지",          area: false, hint: "선택 · 비우면 미출력" },
    { key: "holidayHours",  label: "일요일·공휴일", ph: "예: 휴진 / 공휴일 오전 진료",    area: false, hint: "선택 · 비우면 미출력" },
    { key: "parkingOps",    label: "🚗 주차안내",   ph: "예: 건물 지하주차장 · 2시간 무료 · 데스크 등록", area: false, hint: "주차 위치·무료시간·등록방법", full: true },
    { key: "transit",       label: "🚇 대중교통",   ph: "예: 태릉입구역 6번 출구 도보 3분 / 버스 1222·1132", area: false, hint: "가장 쉬운 이동 방법 1가지", full: true },
  ];


  const VISIT_INFO_FIELDS_GEN = [
    { key: "businessHours", label: "영업시간",   ph: "예: 11:30 ~ 22:00",        area: false, hint: "요일별로 다르면 함께 적어주세요" },
    { key: "breakTime",     label: "브레이크타임", ph: "예: 15:00 ~ 17:00 (없으면 비워두세요)", area: false, hint: "비우면 글에 나오지 않습니다" },
    { key: "lastOrder",     label: "라스트오더",  ph: "예: 21:00",               area: false, hint: "주문 마감 시간" },
    { key: "closedDays",    label: "휴무일",     ph: "예: 매주 월요일 / 명절 당일", area: false, hint: "정기 휴무를 적어주세요" },
    { key: "reservation",   label: "예약",       ph: "예: 전화 예약 가능 / 네이버 예약", area: false, hint: "선택 · 비우면 미출력" },
    { key: "waiting",       label: "웨이팅",     ph: "예: 주말 저녁 대기 있음 / 웨이팅 없음", area: false, hint: "선택 · 비우면 미출력" },
    { key: "seats",         label: "좌석 정보",   ph: "예: 창가석 · 4인 테이블 위주 / 혼밥 가능", area: false, hint: "선택 · 비우면 미출력" },
    { key: "groupSeats",    label: "단체석",     ph: "예: 10인 룸 있음 / 단체 예약 가능",  area: false, hint: "선택 · 비우면 미출력" },
    { key: "pet",           label: "반려동물",    ph: "예: 동반 가능 / 야외석만 가능",     area: false, hint: "선택 · 비우면 미출력" },
    { key: "repMenu",       label: "대표메뉴",    ph: "예: 소금빵 · 아메리카노 / 한우 등심 · 냉면", area: true,  hint: "선택 · 실제 판매 메뉴만 · 비우면 미출력", full: true },
    { key: "price",         label: "가격",       ph: "예: 소금빵 3,500원 · 아메리카노 4,000원", area: true,  hint: "실제 판매 가격만 입력 · 변동 시 최신가로 수정 · AI는 가격을 생성/추정하지 않습니다", full: true },
    { key: "etc",           label: "기타 안내",   ph: "예: 포장 가능 · 주차권 2시간 무료",  area: true,  hint: "선택 · 위 항목에 없는 방문 안내", full: true },
  ];
  // ── [세션47][PRO-VISIT] 전문직 방문정보 11필드 ────────────────────────────
  //   출력 SoT = lib/proVisitBlock.js PRO_VISIT_LINES (키·순서 1:1 정합. 어긋나면 그 줄이 미출력).
  //   ⚠ 상호(store_name)는 여기 없음 — 제목 접미사(TITLE-SUFFIX) 소관. PHILOSOPHY 원칙1.
  //   ⚠ 주소·주차위치·교통은 여기 없음 — '찾아오시는 길'(위치 5필드 · locationBlock) 소관.
  //     parkingOps는 '운영 안내'(무료시간·등록방법)만. 위치는 아래 찾아오시는 길에.
  const VISIT_INFO_FIELDS_PRO = [
    { key: "businessHours", label: "상담시간",     ph: "예: 평일 09:00~18:00 / 토 09:00~13:00", area: false, hint: "요일별로 다르면 함께 적어주세요" },
    { key: "lunchHours",    label: "점심시간",     ph: "예: 12:00~13:00",                     area: false, hint: "선택 · 비우면 미출력" },
    { key: "closedDays",    label: "휴무일",       ph: "예: 토·일·공휴일 휴무",                 area: false, hint: "정기 휴무를 적어주세요" },
    { key: "reservation",   label: "상담예약",     ph: "예: 전화 예약 / 홈페이지 예약 가능",      area: false, hint: "선택 · 비우면 미출력" },
    { key: "phoneConsult",  label: "전화상담",     ph: "예: 간단한 문의는 전화 상담 가능",        area: false, hint: "선택 · 비우면 미출력" },
    { key: "visitConsult",  label: "방문상담",     ph: "예: 방문 상담은 예약 후 진행",           area: false, hint: "선택 · 비우면 미출력" },
    { key: "nightWeekend",  label: "야간·주말",    ph: "예: 사전 협의 시 야간·주말 상담 가능",     area: false, hint: "선택 · 비우면 미출력" },
    { key: "firstConsult",  label: "초회상담 준비", ph: "예: 관련 서류·계약서 지참",              area: false, hint: "선택 · 처음 오는 분 안내" },
    { key: "parkingOps",    label: "주차 안내(운영)", ph: "예: 2시간 무료 · 사무소에서 주차 등록",  area: false, hint: "무료시간·등록방법만 (위치는 아래 '찾아오시는 길')" },
    { key: "phone",         label: "문의",         ph: "예: 상담 문의는 전화로 가능합니다",       area: false, hint: "선택 · 비우면 미출력" },
    { key: "etc",           label: "기타 안내",     ph: "예: 온라인 상담 · 출장 상담 가능",        area: true,  hint: "선택 · 위 항목에 없는 방문 안내", full: true },
  ];

  // ── [세션48][FUNERAL-VISIT] 상조 전용 입력 UI ─────────────────────────────
  //   근거: 상조는 isHospital=false·isPro=false → VISIT_INFO_FIELDS_GEN(외식형)으로 떨어져
  //         "영업시간·좌석·대표메뉴·가격" 음식점 필드가 상조 업체정보 화면에 노출되던 상태.
  //   ★ 이번 작업 범위 = 입력 UI 정상화만. Engine FREEZE 유지 —
  //     generateFuneral.js는 visit_info 미소비(위치 5필드만 사용). 아래 값은 화면 입력·저장까지만.
  //     글 출력 배선은 다음 세션 이관(핸들러 FREEZE). 그래서 출력 SoT 모듈(1:1 정합) 없음 — 무해.
  //   ★ 개념 분리(funeral-data.js V2와 동일): 상조회사(상품·서비스·상담) ⊥ 장례식장(시설).
  //     빈소·안치실·입관실은 상조회사 정보 아님 → '장례식장 정보(선택)' 그룹으로 분리.
  //   구획 헤더는 렌더 로직 무수정 원칙상 full 안내행(area=false, placeholder 없는 라벨)로 표현.
  const VISIT_INFO_FIELDS_FUNERAL = [
    // ① 상품정보 (상조회사가 운영하는 상품)
    { key: "_h_product",    label: "■ 상품정보",    header: true, hint: "상조회사가 운영하는 상품 구성 · 여러 개 추가 가능" },
    { key: "_productEditor", label: "운영 상품",    productEditor: true, full: true },
    // [세션52] 가족장/무빈소/후불/선불 개별 입력 삭제 — 상품 편집기의 대상·특징에서 이미 표현(중복 제거).
    // ② 서비스정보 (상조회사 제공 서비스 — 대부분 공통 기본값)
    { key: "_h_service",    label: "■ 서비스정보",  header: true, hint: "상조회사가 제공하는 서비스 (대부분 공통)" },
    { key: "consult24",     label: "24시간 상담",   ph: "예: 24시간 상담 가능",                 area: false, hint: "선택 · 비우면 미출력" },
    { key: "dispatch24",    label: "24시간 출동",   ph: "예: 전국 24시간 출동",                 area: false, hint: "선택 · 비우면 미출력" },
    { key: "receive365",    label: "365일 접수",    ph: "예: 연중무휴 접수",                    area: false, hint: "선택 · 비우면 미출력" },
    { key: "urgent",        label: "긴급 장례",     ph: "예: 긴급 장례 즉시 대응",              area: false, hint: "선택 · 비우면 미출력" },
    { key: "director",      label: "장례지도사 배정", ph: "예: 전담 장례지도사 배정",           area: false, hint: "선택 · 비우면 미출력" },
    // ③ 상담정보 — [세션53] 대표번호 1필드로 축소.
    //   근거: "24시간 상담 가능"은 ② 서비스정보에서 이미 자동 노출 → 상담정보 중복.
    //   블로그 독자 행동 = 대표번호 → 바로 전화. 그 1개만 남긴다.
    //   삭제: 전화상담/방문상담/출장상담/카카오상담/상담가능시간(phoneConsult·visitConsult·outreach·kakao·consultHours).
    //   VISIT_INFO_KEYS는 이 배열에서 파생(365) → 저장 키도 자동 제거. init 기본값 무관(FUNERAL_SERVICE_DEFAULTS에 없음).
    { key: "_h_consult",    label: "■ 상담정보",    header: true, hint: "상담 연결 채널" },
    { key: "phone",         label: "대표전화",      ph: "예: 대표번호 안내",                    area: false, hint: "선택 · 비우면 미출력" },
    // ④ [C-2] 장례식장 정보 — 검색 주체. 상조회사 상호와 달리 '정보 대상'이라 본문 노출 허용.
    //   중앙 DB 미구축. 업체가 직접 관리하는 STORE_PROFILE 단일 SoT (visit_info.funeralHalls[]).
    //   주차·빈소·식당·안치실은 GPT 생성 금지 영역(오정보=신뢰 붕괴) → 입력값만 소비.
    { key: "_h_hall",       label: "■ 장례식장 정보", header: true, hint: "주로 진행하는 장례식장 · 여러 곳 추가 가능 · 입력한 항목만 글에 반영" },
    { key: "_hallEditor",   label: "장례식장",      hallEditor: true, full: true },
    // ⑤ 출동지역 (선택) — ★ 연계(화장·봉안)는 상조 기본 업무라 입력 제외.
    //   고객이 실제로 확인하는 건 "어디까지 출동하는가". 그것만 남긴다.
    { key: "_h_area",       label: "■ 출동지역 (선택)", header: true, hint: "고객이 많이 확인하는 정보 — 어느 지역까지 출동하는지" },
    { key: "serviceArea",   label: "주요 출동 지역",  ph: "예: 서울 전 지역 · 경기 남부 · 인천·김포 / 전국 가능", area: true, hint: "선택 · 비우면 미출력", full: true },
    // [C-2] 출동권(Service Area) 확장 2필드. 24시간 출동은 ② 서비스정보 dispatch24 재사용(중복 입력 금지).
    { key: "nationwide",    label: "전국 체인 여부",  ph: "예: 전국 지사망 운영 / 수도권 단독 운영",  area: false, hint: "선택 · 비우면 미출력" },
    { key: "partnerBranch", label: "협력 지사",      ph: "예: 대전·대구·부산 협력 지사 연계",        area: false, hint: "선택 · 비우면 미출력" },
    { key: "etc",           label: "기타 안내",     ph: "예: 상담 예약 · 지역 안내",            area: true,  hint: "선택 · 위 항목에 없는 안내", full: true },
  ];

  // ── [세션54][COMMON-VISIT] 음식점 게이트 + 공통 운영정보 4필드 ──────────────
  //   근거: 실측상 리빙·이브자리·공사군 등 비(非)병원·비전문직·비상조 업종이 전부
  //         VISIT_INFO_FIELDS_GEN(외식형 12필드)으로 폴백 → "라스트오더·브레이크타임·좌석·
  //         단체석·대표메뉴·가격"이 청소·이사·매장 업종 화면에 노출되던 상태.
  //   → 음식점만 GEN 유지, 그 외 폴백을 공통 4필드로 교체.
  //   ⚠ 하드코딩 명단 유지 이유: SERVICE_GROUPS에 음식점군 미등록(이월 과제).
  //     외식 엔진 추가 시 이 배열에 id 1개 추가 = GEN 유지.
  //   ★ 저장 키는 전부 기존 키 재사용(businessHours/closedDays/reservation/parkingOps)
  //     → DB·스키마·기존 저장데이터 무영향. 축소된 필드의 기존 값도 삭제되지 않음(초기화 로직 무수정).
  const FOOD_INDUSTRIES = [
    "restaurant",   // 음식점(대표)
    "korean",       // 한식
    "chinese",      // 중식
    "japanese",     // 일식
    "western",      // 양식
    "chicken",      // 치킨
    "snack",        // 분식
    "cafe",         // 카페
  ];
  const isFood = FOOD_INDUSTRIES.includes(String((hubStore && hubStore.industry) || ""));

  // 공통 운영정보 — 전 업종 표준 4항목. 업종 전용 항목은 각 전용 세트에서만 유지.
  const VISIT_INFO_FIELDS_COMMON = [
    { key: "businessHours", label: "영업시간",  ph: "예: 평일 09:00~18:00",              area: false, hint: "요일별로 다르면 함께 적어주세요" },
    { key: "closedDays",    label: "휴무일",    ph: "예: 매주 일요일 / 명절 당일",        area: false, hint: "정기 휴무를 적어주세요" },
    { key: "reservation",   label: "예약 상담", ph: "예: 전화 예약 / 방문 상담 예약 가능", area: false, hint: "선택 · 비우면 미출력" },
    { key: "parkingOps",    label: "주차",      ph: "예: 건물 주차장 이용 · 2시간 무료",   area: false, hint: "주차 가능 여부·무료시간·등록방법", full: true },
    // [세션54] 대중교통 — locationBlock 소비 키(transit)와 동일. '찾아오시는 길' 입력 은퇴(v127) 이후
    //   신규 매장이 위치 안내를 채울 경로가 없던 갭 보완. 건물설명(building_desc)은 주소로 대체 가능 → 미추가.
    { key: "transit",       label: "대중교통",  ph: "예: 태릉입구역 6번 출구 도보 3분",     area: false, hint: "가장 쉬운 이동 방법 1가지", full: true },
  ];

  // [세션38] 업종군 분기. 병원군=13필드(visitBlock SoT) / 그 외=기존 12필드(무변경).
  // [세션47] 전문직 분기 추가. 전문직=11필드(proVisitBlock SoT). 병원·외식 경로 무손상.  // [세션48] 상조 분기 추가. 상조=상조전용필드(입력 UI만·Engine FREEZE). 병원·전문직·외식 경로 무손상.
  // [세션54] 음식점 분기 추가. 음식점=GEN 12필드(무변경) / 그 외 폴백=공통 4필드.
  const VISIT_INFO_FIELDS = isHospital ? VISIT_INFO_FIELDS_MED
                          : isPro      ? VISIT_INFO_FIELDS_PRO
                          : isFuneral  ? VISIT_INFO_FIELDS_FUNERAL
                          : isFood     ? VISIT_INFO_FIELDS_GEN
                          :              VISIT_INFO_FIELDS_COMMON;
  const VISIT_INFO_KEYS = VISIT_INFO_FIELDS.filter(f => !f.header && !f.productEditor && !f.hallEditor).map(f => f.key);
  // [세션50] 상조 서비스정보 기본값 — 신규 상조 계정만 자동 채움(Default Value).
  //   ★ Placeholder 아님 — 실제 저장 가능한 초기값. 사용자가 수정/삭제 가능.
  //   신규 판별: visit_info에 해당 키 자체가 없을 때(hasOwnProperty=false)만 주입.
  //     사용자가 지워서 ""로 저장된 경우(hasOwnProperty=true)는 삭제 의사 존중 → 재주입 안 함.
  //   funeral 아닌 업종은 이 맵이 비므로 무영향.
  const FUNERAL_SERVICE_DEFAULTS = isFuneral ? {
    consult24:  "24시간 상담 가능",
    dispatch24: "24시간 출동 가능",
    receive365: "365일 접수",
    urgent:     "긴급 장례 대응",
    director:   "전담 장례지도사 배정",
  } : {};

  const initVisitInfo = () => {
    const src = (hubStore && hubStore.visit_info) || {};
    const o = {};
    VISIT_INFO_KEYS.forEach(k => {
      // 저장 이력 없는 서비스 기본값 키 → 기본값 주입. 그 외/저장값 있으면 저장값(빈값 포함) 유지.
      if (!Object.prototype.hasOwnProperty.call(src, k) && FUNERAL_SERVICE_DEFAULTS[k]) {
        o[k] = FUNERAL_SERVICE_DEFAULTS[k];
      } else {
        o[k] = src[k] || "";
      }
    });
    // [세션49] 상조 상품 Array — 문자열 필드와 별도. jsonb 배열 보존(빈 문자열로 덮지 않음).
    o.funeralProducts = Array.isArray(src.funeralProducts) ? src.funeralProducts : [];
    // [C-2] 장례식장 Array — funeralProducts 동형. jsonb 배열 보존(빈 문자열로 덮지 않음).
    o.funeralHalls = Array.isArray(src.funeralHalls) ? src.funeralHalls : [];
    return o;
  };
  const [visitInfo, setVisitInfo] = useState(initVisitInfo);
  // [세션46] 같은 매장 hubStore 부분갱신 시 입력 소실 방지 — storeId 전환 시에만 재초기화.
  const _visitStoreIdRef = useRef(hubStore && hubStore.id);
  const [visitOpen, setVisitOpen] = useState(false); // [세션36] 지역전략 아래로 이동. 기본 접힘.
  const [visitMsg, setVisitMsg] = useState("");
  // [세션37][A안] 등록 직후 방문정보 자동안내(1회). onCreateAndSave 성공 → justRegistered=true.
  //   industryConfirmed 전환 감지 effect가 visitOpen 펼침 + 스크롤 + 배너 1회 표시.
  const [justRegistered, setJustRegistered] = useState(false);
  const visitBoxRef = useRef(null);
  const setVisit = (k, v) => setVisitInfo(prev => ({ ...prev, [k]: v }));

  // [세션49] 상조 상품 Array 조작 — 추가/삭제/필드수정. jsonb 저장(payload visit_info 자동 포함).
  const FUNERAL_PRODUCT_BLANK = { name: "", price: "", target: "", feature: "", note: "" };
  const addFuneralProduct = () =>
    setVisitInfo(prev => ({ ...prev, funeralProducts: [...(prev.funeralProducts || []), { ...FUNERAL_PRODUCT_BLANK }] }));
  const removeFuneralProduct = (idx) =>
    setVisitInfo(prev => ({ ...prev, funeralProducts: (prev.funeralProducts || []).filter((_, i) => i !== idx) }));
  const setFuneralProduct = (idx, field, val) =>
    setVisitInfo(prev => ({
      ...prev,
      funeralProducts: (prev.funeralProducts || []).map((p, i) => i === idx ? { ...p, [field]: val } : p),
    }));

  // [C-2] 장례식장 Array 조작 — funeralProducts 동형. jsonb 저장(payload visit_info 자동 포함).
  const FUNERAL_HALL_BLANK = {
    name: "", address: "", parking: "", parkingFee: "", restaurant: "",
    halls: "", mortuary: "", facilities: "", crematorium: "", memo: "",
  };
  const addFuneralHall = () =>
    setVisitInfo(prev => ({ ...prev, funeralHalls: [...(prev.funeralHalls || []), { ...FUNERAL_HALL_BLANK }] }));
  const removeFuneralHall = (idx) =>
    setVisitInfo(prev => ({ ...prev, funeralHalls: (prev.funeralHalls || []).filter((_, i) => i !== idx) }));
  const setFuneralHall = (idx, field, val) =>
    setVisitInfo(prev => ({
      ...prev,
      funeralHalls: (prev.funeralHalls || []).map((h, i) => i === idx ? { ...h, [field]: val } : h),
    }));

  // [세션37][A안] 등록 직후 방문정보 자동안내 — justRegistered && industryConfirmed 전환 시 1회.
  //   visitOpen 펼침 + 박스로 스크롤. 배너는 justRegistered 플래그로 조건부 렌더(사용자가 접거나 저장 시 해제).
  useEffect(() => {
    if (justRegistered && industryConfirmed) {
      setVisitOpen(true);
      // hubStore 갱신·리렌더 후 DOM 준비되면 스크롤. 최소 지연.
      setTimeout(() => {
        if (visitBoxRef.current) {
          visitBoxRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    }
    /* eslint-disable-next-line */
  }, [justRegistered, industryConfirmed]);

  useEffect(() => {
    if (!storeSaving) {
      setForm(initial());
      setEditRegion(false);
      setSuffixOn((hubStore && hubStore.title_suffix_on) ?? true); // [v78] 신규=ON, 기존=DB값 유지
      // [세션46] visitInfo 재초기화는 storeId 전환(계정/업장 변경) 시에만.
      //   같은 매장의 hubStore 부분갱신(생활권/주차/suffix 저장 등)에서는 사용자 입력 보존.
      const _curId = hubStore && hubStore.id;
      if (_curId !== _visitStoreIdRef.current) {
        _visitStoreIdRef.current = _curId;
        setVisitInfo(initVisitInfo());
      }
    }
    /* eslint-disable-next-line */
  }, [hubStore]);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // [v127] 주소 자동 정리 — 사용자가 플레이스 정보(상호+주소)를 통째 복붙하는 경우 방어.
  //   ① 상호(identName)가 주소 앞/뒤에 붙어 있으면 제거(공백 유무 무시 매칭)
  //   ② 주소 시작 토큰(시/도)부터, 끝은 층/호/건물 뒤 상호 꼬리 절단.
  //   판단 애매하면 원문 유지(입력을 막지 않음).
  const REGION_HEAD = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|충청|전라|경상)/;
  const cleanAddress = (raw) => {
    let s = (raw || "").replace(/\s+/g, " ").trim();
    if (!s) return s;
    const store = (identName || "").trim();
    const bare = (t) => (t || "").replace(/\s+/g, ""); // 공백 제거본
    // 앞: 시/도 앞에 상호가 있으면 시/도부터
    const m = s.match(REGION_HEAD);
    if (m && m.index > 0) {
      const head = s.slice(0, m.index).trim();
      if (head.length <= 20 && !REGION_HEAD.test(head)) s = s.slice(m.index).trim();
    }
    // 뒤: 상호가 접미로 붙은 경우 제거(공백 유무 무시). "…8층 러반로제레스토랑" / "…8층러반로제 레스토랑" 모두.
    if (store && store.length >= 2) {
      const bStore = bare(store);
      // 뒤에서부터 토큰을 떼며 상호와 공백무시 일치하는 꼬리를 찾아 절단
      const toks = s.split(" ");
      for (let i = toks.length; i >= 1; i--) {
        const tail = bare(toks.slice(i - 1).join(" ")); // 마지막 (n-i+1)개 토큰 결합
        if (tail === bStore || tail.endsWith(bStore)) {
          // 상호 꼬리 발견 → 그 앞까지만
          const kept = toks.slice(0, i - 1).join(" ").trim();
          if (kept && REGION_HEAD.test(kept)) { s = kept; break; }
        }
      }
      // 접두 상호(공백무시)도 한 번 더
      if (bare(s).startsWith(bStore) && bare(s) !== bStore) {
        // 앞 토큰들을 제거해 시/도부터 남김
        const m2 = s.match(REGION_HEAD);
        if (m2 && m2.index > 0) s = s.slice(m2.index).trim();
      }
    }
    return s.replace(/\s+/g, " ").trim();
  };

  // [v27] 주소 → 대표지역/생활권 자동 제안. 각 칸이 비어있을 때만 채움(사용자 입력 보존).
  //   대표지역: 강한 브랜드 별칭만 치환, 나머지 '구'는 그대로 유지(노원구·성북구…).
  //   생활권: 주소의 동/읍/면 추출.
  //   [v126] regMissing/identMissing이 이 함수를 참조 → 게이트 정의보다 반드시 위에 둔다(TDZ 회피).
  const REGION_ALIAS = {
    "분당구": "분당", "강남구": "강남", "서초구": "서초", "송파구": "잠실",
    "연수구": "송도", "동안구": "평촌", "기흥구": "기흥", "수지구": "수지",
    "일산동구": "일산", "일산서구": "일산",
  };
  const suggestRegion = (addr) => {
    const a = (addr || "").trim();
    if (!a) return "";
    // 1) "OO구" — 별칭 있으면 별칭, 없으면 '구' 포함 그대로 유지(브랜드성 보존)
    let m = a.match(/([가-힣]{2,5}구)(?:\s|$|[가-힣])/);
    if (m) return REGION_ALIAS[m[1]] || m[1];
    // 2) 구 없으면 "OO시" — '시' 떼고
    m = a.match(/([가-힣]{2,4})시(?:\s|$|[가-힣])/);
    if (m) return m[1].replace(/광역$|특별$/, "");
    // 3) "OO군"
    m = a.match(/([가-힣]{2,4})군(?:\s|$|[가-힣])/);
    if (m) return m[1] + "군";
    return "";
  };
  // 주소에서 생활권(동/읍/면) 추출 — 첫 1개만 제안.
  const suggestSubRegion = (addr) => {
    const a = (addr || "").trim();
    if (!a) return "";
    const m = a.match(/([가-힣]{2,5}(?:동|읍|면))(?:\s|$|[가-힣0-9])/);
    return m ? m[1] : "";
  };

  // [v126] 신원블록 저장 게이트 — 필수: 업종·업체명·주소. 방문안내는 선택(제외).
  //   생활권(sub_region)은 이 폼에 입력칸이 없고 별도 '생활권 저장' 박스가 전담 → 여기 게이트엔 넣지 않음.
  const identMissing = () => {
    const miss = [];
    if (!identName.trim())            miss.push("업체명");
    if (!identIndustry)               miss.push("업종");
    if (!(form.address || "").trim()) miss.push("주소");
    return miss;
  };
  const identReady = identMissing().length === 0;
  const onApplyIdent = async () => {
    const miss = identMissing();
    if (miss.length) { setIdentMsg(`빠진 필수 항목 : ${miss.join(", ")}`); return; }
    setIdentMsg("");
    // [v76] 신원 일괄 저장 — store_name/industry/주소/전화 한 번에 서버 PATCH.
    //   [v77] 주차정보(parking_info)도 신원 묶음에 합류 — 생성기 기본정보로 항상 사용.
    //   [v77] region 비어있으면 주소에서 추출. 추출 실패 시 키 자체를 안 보내 기존값 보존.
    const autoRegion = suggestRegion(form.address || "");
    const payload = {
      store_name: identName.trim(),
      industry: identIndustry,
      address: form.address || "",
      phone: form.phone || "",
      parking_info: "", // [v127] 주차 → 방문정보(parkingOps) 단일화
      specialty: specialty || "",   // [전문점 2단 트리] 빈값=일반 업종(부작용 0)
    };
    if (autoRegion) payload.region = autoRegion;
    setIdentSaveState("saving"); setIdentOkMsg("");
    const r = await saveStore(payload);
    if (!r.ok) { setIdentSaveState("idle"); setIdentMsg("저장 실패. 다시 시도해주세요."); return; }
    // [v-savefix 2026-07-22] store-industry(owner-only) 호출을 "업종이 실제 바뀐 경우"로 한정.
    //   기존: 저장할 때마다 무조건 호출 → 일반회원은 FORBIDDEN_NOT_OWNER로 return되어
    //         업체명·주소·전화가 이미 PATCH 성공했는데도 화면엔 "업종 변경 권한이 없습니다"만 떠
    //         저장 여부를 알 수 없었다. (store.js v76은 store_name/industry PATCH를 이미 허용 —
    //         "store.js가 막는다"는 v124 주석은 낡음.)
    //   현재: 업종 미변경이면 스킵 → 기본정보 저장으로 정상 완료.
    //         업종 변경 시도 + 권한 없음이면 기본정보는 저장됐음을 알리고 업종만 유지.
    const _prevIndustry = String((hubStore && hubStore.industry) || "");
    const _industryChanged = !!_prevIndustry && _prevIndustry !== identIndustry;
    let nextIndustry = _industryChanged ? identIndustry : (_prevIndustry || identIndustry);
    let nextStoreName = identName.trim();
    let _industryDenied = false;
    if (_industryChanged) {
      try {
        const ir = await fetch("/api/store-industry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_user_id: authUserId, industry: identIndustry, store_name: identName.trim() }),
        }).then(x => x.json());
        if (ir?.ok) { nextIndustry = ir.industry ?? nextIndustry; nextStoreName = ir.store_name ?? nextStoreName; }
        else if (ir?.error === "FORBIDDEN_NOT_OWNER") { _industryDenied = true; nextIndustry = _prevIndustry; }
        else { _industryDenied = true; nextIndustry = _prevIndustry; }
      } catch (e) { _industryDenied = true; nextIndustry = _prevIndustry; }
    }
    setHubStore && setHubStore(prev => ({ ...(prev || {}),
      industry: nextIndustry, store_name: nextStoreName,
      address: form.address || "", phone: form.phone || "",
      parking_info: "", // [v127] 주차 → 방문정보(parkingOps) 단일화
      specialty: specialty || "",
      ...(autoRegion ? { region: autoRegion } : {}) }));
    // 성공 피드백 — 업종 거부 시에도 "기본정보는 저장됨"을 분명히 알린다.
    setIdentMsg(_industryDenied ? "업종은 관리자만 변경할 수 있습니다. (업체명·주소·전화는 저장되었습니다)" : "");
    setIdentOkMsg("업체정보가 저장되었습니다.");
    setIdentSaveState("done");
    setTimeout(() => {
      setIdentSaveState("idle"); setIdentOkMsg("");
      setIdentConfirm(false); setEditIdent(false);
    }, 1400);
  };

  // [v121] 신규 등록 통합 저장 — 2단계 [저장]. 같은 화면에서 받은 전체 정보를
  //   createStore(업종+업체명) → saveStore(주소·전화·생활권·주차) 연속 처리. 버튼은 1번.
  //   필수검증은 identMissing 재사용(업종은 pickIndustry로 대체 체크).
  // [v126] 최초 등록 필수 = 업종·업체명·주소·생활권. (반장 지시: AI글쓰기 가능 최소셋)
  //   방문안내(주차/대중교통)는 필수 제외 → 저장 후 '추가정보'에서 이어 입력. 저장 문턱 최소화.
  //   생활권: form.sub_region 우선, 비었으면 주소 자동추출(suggestSubRegion) 폴백 인정.
  const regMissing = () => {
    const miss = [];
    if (!pickIndustry)                miss.push("업종");
    if (!identName.trim())            miss.push("업체명");
    if (!(form.address || "").trim()) miss.push("주소");
    // [v127] 생활권은 최초등록 필수 제외 → 등록 후 'AI 지역 전략'에서 별도 설정(주소 기반 추천).
    return miss;
  };
  const regReady = regMissing().length === 0;
  const onCreateAndSave = async () => {
    const miss = regMissing();
    if (miss.length) { setConfirmErr(`빠진 필수 항목 : ${miss.join(", ")}`); return; }
    setConfirmErr("");
    // ① DB 행 생성(업종+업체명) — 최종 저장 시점에만 POST.
    const c = await createStore({ industry: pickIndustry, storeName: identName.trim() });
    // [v127] 이미 존재(ALREADY_EXISTS/409)면 실패가 아니라 '기존 행 수정'으로 이어간다.
    //   재테스트 계정·중복 진입에서 등록이 막히지 않게. 그 외 오류만 중단.
    if (!c.ok && c.error !== "ALREADY_EXISTS") {
      setConfirmErr("등록에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // ② 나머지 정보 PATCH — 주소·전화·주차. region은 주소에서 자동 추출.
    //   [v127] 생활권(sub_region)은 최초등록에서 제외 → 등록 후 'AI 지역 전략'에서 별도 설정(주소 기반 추천).
    // [v127] 저장 직전 주소 정리 — onBlur를 놓쳐도(예: 바로 저장) 상호 꼬리 제거 후 파싱.
    const cleanAddr = cleanAddress(form.address || "");
    if (cleanAddr !== (form.address || "")) set("address", cleanAddr); // 화면도 동기화
    const autoRegion = suggestRegion(cleanAddr);
    const payload = {
      store_name: identName.trim(),
      industry: pickIndustry,
      address: cleanAddr,
      phone: form.phone || "",
      parking_info: "", // [v127] 주차 → 방문정보(parkingOps) 단일화
      specialty: specialty || "",   // [전문점 2단 트리] 빈값=일반 업종(부작용 0)
    };
    if (autoRegion) payload.region = autoRegion;
    // [v127] 생활권은 선택 — 사용자가 입력했을 때만 저장. 비우면 등록 후 'AI 지역 전략'에서 설정.
    const subVal = (form.sub_region || "").trim();
    if (subVal) payload.sub_region = subVal;
    const r = await saveStore(payload);
    if (!r.ok) { setConfirmErr("기본 등록은 됐지만 상세정보 저장에 실패했습니다. 업체정보에서 다시 저장해 주세요."); return; }
    // [v124] 확정 완료 → hubStore.industry 채워짐 → industryConfirmed=true 자동 전환(수정모드 폼 노출).
    // [세션37][A안] 등록 성공 → 방문정보 자동안내 1회 트리거. (전환 감지 effect가 펼침·스크롤·배너 수행)
    setJustRegistered(true);
  };

  // [v27] 주소 = 1회성 추출 도구. 대표지역·생활권이 '비어있을 때만' 채운다(제안).
  // 한 번 채워지거나 사용자가 만진 뒤엔 주소가 바뀌어도(예: 465→621) 두 값은 보존.
  // → 주소는 SEO/관측 데이터가 아니라 참고용. 지역 자산은 독립적으로 산다.
  //   [v126] REGION_ALIAS/suggestRegion/suggestSubRegion 정의는 위(identMissing 앞)로 이동 — regReady TDZ 회피.
  useEffect(() => {
    const sugR = suggestRegion(form.address);
    const sugS = suggestSubRegion(form.address);
    setForm(prev => {
      const next = { ...prev };
      if (sugR && !(prev.region || "").trim()) next.region = sugR;
      if (sugS && !(prev.sub_region || "").trim()) next.sub_region = sugS;
      return next;
    });
    /* eslint-disable-next-line */
  }, [form.address]);

  const onSave = async () => {
    setSavedMsg("");
    // [v45] URL 정규화 — 사용자는 보통 'www.banjang.co.kr'처럼 스킴 없이 입력하거나
    //   'https://blog.naver.com/...'를 복붙한다. 스킴 없으면 https:// 자동 보정(값 있을 때만).
    const normUrl = (u) => {
      const s = String(u || "").trim();
      if (!s) return s;                                  // 빈값은 그대로(미입력 유지)
      if (/^https?:\/\//i.test(s)) return s;             // 이미 스킴 있음 → 그대로
      return "https://" + s.replace(/^\/+/, "");         // 'www...', '도메인...' → https:// 보정
    };
    // [v75] 추가정보 박스 전용 저장 — BASIC_FIELDS 키만. (신원=신원박스, 생활권=지역전략박스에서 따로 저장)
    const payload = {};
    BASIC_FIELDS.forEach(f => { payload[f.key] = form[f.key]; });
    for (const k of ["naver_place_url", "naver_blog_url"]) {
      if (k in payload) payload[k] = normUrl(payload[k]);
    }
    // [v77] 제목 끝 상호 표시 토글 — 추가정보 박스에서 함께 저장.
    payload.title_suffix_on = !!suffixOn;
    const r = await saveStore(payload);
    setSavedMsg(r?.ok ? "저장되었습니다." : "저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    if (r?.ok) setTimeout(() => setSavedMsg(""), 2500);
  };

  // [v-visit] 방문정보 저장 — VISIT_INFO_SAVE_ENABLED 플래그 뒤 대기.
  //   현재(세션32) = false: schema(visit_info jsonb) 미승인 → 저장 미연결. 입력값은 화면 state로만 유지.
  //   승인 후 활성화 절차: (1) DB visit_info jsonb 컬럼 신설 (2) store.js 화이트리스트에 visit_info 추가 (배포순서: store.js→index.js)
  //   (3) 아래 플래그 true. saveStore는 이미 임의 patch를 PATCH하므로 프론트 추가 변경 불필요.
  const onSaveVisit = async () => {
    setVisitMsg("");
    if (!VISIT_INFO_SAVE_ENABLED) {
      setVisitMsg("입력이 확인되었습니다. 저장 연결은 준비 중입니다.");
      setTimeout(() => setVisitMsg(""), 3000);
      return;
    }
    // [세션35] 방문정보 저장 시 위치 3필드(찾아오시는 길)도 함께 store PATCH.
    //   위치 필드는 방문정보 영역으로 이동 → 저장도 이 버튼에 통합. store_profiles 개별 컬럼(jsonb 아님).
    // [세션54] 기존 저장값 보존 병합 — 화면에 없는 키(업종군 전환·필드 축소로 미표시)를
    //   빈 payload가 덮어써 삭제하는 것을 차단. 화면 입력값이 항상 우선.
    const payload = { visit_info: { ...((hubStore && hubStore.visit_info) || {}), ...visitInfo } }; // 승인 후 경로
    LOCATION_KEYS.forEach(k => { payload[k] = ""; }); // [v127] 위치 컬럼 은퇴 — 빈값 고정
    const r = await saveStore(payload);
    setVisitMsg(r?.ok ? "저장되었습니다." : "저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    if (r?.ok) { setJustRegistered(false); setTimeout(() => setVisitMsg(""), 2500); }
  };

  // ── [v-svcgroup] 서비스 분야 다중선택 (구 v-dept 병원 진료과) ──
  //   업체 1곳 = 공통 업체정보 1행 + 서비스 분야 N개. 대표(=hubStore.industry)는 해제 불가.
  //   선택 분야는 AI 글쓰기 진입 시 스위처로 노출 → CURRENT_INDUSTRY 전환(엔진 무수정).
  //   그룹: 병원=진료과 / 공사=시공분야. SERVICE_GROUPS(industry-tree.js)에서 주입.
  //   저장 필드는 departments 재사용 — 스키마 변경 없음.
  const _repDept  = (hubStore && hubStore.industry) || "";
  // [v-svcgroup] 병원 전용 → 서비스 그룹 공통. 대표 업종이 속한 그룹의 분야 목록을 렌더.
  //   병원(hospital) 동작은 기존과 동일. 공사(construction) 신규. 미소속 업종은 미노출(영향 0).
  const _svcGroup = serviceGroupOf(_repDept);
  const _hasSvc   = hasServiceFields(_repDept);
  const _svcItems = (_svcGroup && _svcGroup.items) || [];
  const [depts, setDepts] = useState(
    normalizeDepartments((hubStore && hubStore.departments) || [], _repDept)
  );
  const [deptMsg, setDeptMsg] = useState("");
  // hubStore 재로드(저장 후 setHubStore) 시 목록 동기화. 대표는 항상 [0].
  useEffect(() => {
    setDepts(normalizeDepartments((hubStore && hubStore.departments) || [], _repDept));
  }, [hubStore && hubStore.industry, JSON.stringify((hubStore && hubStore.departments) || [])]);

  const toggleDept = (id) => {
    if (id === _repDept) return;             // 대표(=industry)는 해제 불가(불변식)
    setDeptMsg("");
    setDepts(prev => {
      const has = prev.includes(id);
      const next = has ? prev.filter(x => x !== id) : [...prev, id];
      return normalizeDepartments(next, _repDept);
    });
  };

  const onSaveDepartments = async () => {
    setDeptMsg("");
    const payload = { departments: normalizeDepartments(depts, _repDept) };
    const r = await saveStore(payload);
    setDeptMsg(r?.ok ? "저장되었습니다." : "저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    if (r?.ok) setTimeout(() => setDeptMsg(""), 2500);
  };

  // [v75] 생활권 저장 — 지역전략 박스 전용. sub_region + (주소 기반 자동) region 동반 저장.
  //   대표지역(region) UI는 숨김 — 주소에서 자동 추출되어 Observer 기준으로만 내부 사용.
  const [subRegionMsg, setSubRegionMsg] = useState("");
  // [v111] 생활권 1개 저장 시 1회 확인. 쉼표 기준 1곳이면 권장(3~4개) 안내 후, 한 번 더 누르면 그대로 저장.
  const [subRegionConfirm, setSubRegionConfirm] = useState(false);
  const onSaveSubRegion = async () => {
    setSubRegionMsg("");
    // [v128] 구분자 정규화 — 가운뎃점(·)·중복쉼표·마침표를 쉼표로 통일한 뒤 저장. 카운트 기준도 동일.
    const subs = (form.sub_region || "").split(/[,·]/).map(s => s.trim().replace(/[.·]+$/, "")).filter(Boolean);
    const subNorm = subs.join(", ");
    if (subs.length === 1 && !subRegionConfirm) {
      setSubRegionConfirm(true);   // 1회 확인 단계 — 저장 보류
      return;
    }
    setSubRegionConfirm(false);
    if (subNorm !== (form.sub_region || "")) set("sub_region", subNorm);   // 입력칸도 쉼표 표기로 정리
    const r = await saveStore({ sub_region: subNorm, region: form.region || "" });
    setSubRegionMsg(r?.ok ? "저장되었습니다." : "저장 실패. 다시 시도해주세요.");
    if (r?.ok) setTimeout(() => setSubRegionMsg(""), 2500);
  };

  // [fix] hubStore===null = 아직 안 불러옴(미로딩). hubLoading 값과 무관하게 로딩 표시.
  //   로드 완료 시 최소 {} 이므로, null 단독 체크가 "미로딩 vs 업체없음" 정확 구분.
  //   (기존 AND 가드는 hubLoading=false·hubStore=null 창에서 STEP1로 오판 → 재입력 회귀)
  if (hubStore === null) {
    return <div style={{ padding: 24, textAlign: "center", color: "#999", fontSize: 13 }}>업체정보를 불러오는 중입니다…</div>;
  }

  // [v121] 업종 미확정 — 최초 등록. 2단계(같은 화면 확장).
  //   1단계: 업종만 선택 → [등록 시작](DB 저장 X, 확장만). 2단계: 전체 정보 입력 → [저장](createStore→saveStore).
  if (!industryConfirmed) {
    const gInput = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e0d0f0",
      fontSize: 14, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" };
    // [v125] 입력 중심 개편 — 진입 즉시 STEP1 업종선택 노출. 설명 카드/좌측의존 안내 제거.
    //   업종 선택(pickIndustry)은 우측 본문 인라인 IndustryPicker로 직접 수행 → 좌측 사이드바 의존 제거.
    //   선택 즉시 regExpand=true → 같은 화면에서 입력폼 펼침(기존 로직·저장 흐름 무변경).
    return (
      <div style={{ maxWidth: 580, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, animation: "fadeIn .25s ease" }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "16px 18px" }}>
          {/* ── STEP 1 — 업종 선택 (좌측 '나의 업종' 트리에서 선택 → 여기 반영) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: "#9C27B0",
              borderRadius: 12, padding: "3px 11px" }}>STEP 1</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>나의 업종은?</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#b0a3c0" }}>(최초 1회 확정)</span>
          </div>

          {!pickIndustry ? (
            /* 미선택 — 좌측 '나의 업종' 트리에서 선택 유도. 선택 시 아래 STEP2~ 순차 오픈. */
            <div style={{ width: "100%", padding: "16px 16px", borderRadius: 11,
              border: "1.5px dashed #c9a8e0", background: "#faf5ff", color: "#7B1FA2",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit", textAlign: "center", lineHeight: 1.6 }}>
              👈 왼쪽에서 <b>나의 업종</b>을 선택하세요
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#a98bc0", marginTop: 5 }}>
                선택하면 업체명·주소·생활권 입력이 여기에 순서대로 나타납니다
              </div>
            </div>
          ) : (
            /* 선택됨 — 선택 업종 배지 + 다시 선택(왼쪽 트리에서 교체). */
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, padding: "12px 14px", borderRadius: 11, border: "1.5px solid #c9a8e0",
              background: "#faf5ff" }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: "#6A1B9A" }}>
                {industryPath(pickIndustry) || pickIndustry}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#a98bc0", whiteSpace: "nowrap", flexShrink: 0 }}>
                변경은 왼쪽에서
              </span>
            </div>
          )}

          {/* ── STEP2~4 순차 개방: 업종 선택 후 위 칸을 채우면 다음 칸이 열림. 필수 4셋(업종·업체명·주소·생활권) 충족 시 저장. ── */}
          {regExpand && (() => {
            const nameOk = identName.trim().length > 0;
            const addrOk = (form.address || "").trim().length > 0;
            // 생활권: form값 우선, 없으면 주소 자동추출 프리필값. 표시용 현재값.
            const subShown = (form.sub_region || "").trim() || suggestSubRegion(form.address || "");
            const subOk = subShown.length > 0;
            const stepHeader = (n, txt) => (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: "#9C27B0",
                  borderRadius: 12, padding: "3px 11px" }}>STEP {n}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>{txt}</span>
              </div>
            );
            const block = { marginTop: 16, paddingTop: 14, borderTop: "1px dashed #e0d0f0", animation: "fadeIn .2s ease" };
            return (
              <>
                {/* STEP 2 — 업체명 */}
                <div style={block}>
                  {stepHeader(2, "업체명")}
                  <input value={identName} onChange={e => { setIdentName(e.target.value); setConfirmErr(""); }}
                    placeholder="예: 노원 OO치과" style={gInput} />
                </div>

                {/* STEP 3 — 주소 (업체명 입력 시 열림) */}
                {nameOk && (
                  <div style={block}>
                    {stepHeader(3, "주소")}
                    <input value={form.address} onChange={e => { set("address", e.target.value); setConfirmErr(""); }}
                      onBlur={e => { const c = cleanAddress(e.target.value); if (c !== (form.address || "")) set("address", c); }}
                      placeholder="예: 서울 노원구 공릉동 OO로 12" style={gInput} />
                    <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 3 }}>↳ 주소만 입력하세요. 상호명이 섞여 있으면 자동으로 정리됩니다.</div>
                  </div>
                )}

                {/* STEP 4 — 생활권 (선택 · 등록 후에도 설정 가능. 지금 넣어도 됨) */}
                {nameOk && addrOk && (
                  <div style={block}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: "#b39ddb",
                        borderRadius: 12, padding: "3px 11px" }}>STEP 4</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>생활권</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#b0a3c0" }}>(선택 · 등록 후에도 설정 가능)</span>
                    </div>
                    <input value={form.sub_region || ""} onChange={e => { set("sub_region", e.target.value); setConfirmErr(""); }}
                      placeholder={subShown ? "" : "예: 공릉동, 태릉입구역, 하계동"}
                      style={gInput} />
                    <div style={{ fontSize: 10.5, color: "#9457b8", marginTop: 4, lineHeight: 1.5 }}>
                      ⭐ 고객이 실제로 검색하는 지역입니다. 지금 비워둬도 등록 후 'AI 지역 전략'에서 주소 기반으로 추천해 드려요.
                      {(!(form.sub_region || "").trim() && subShown) ? ` (주소에서 '${subShown}' 자동 추출 — 수정 가능)` : ""}
                    </div>
                    {/* [v127] 실시간 카운트 도우미 — 경고 아님. 추천 3~5개 대비 현재 개수 안내. */}
                    {(() => {
                      const cnt = (form.sub_region || "").split(/[,·]/).map(s => s.trim()).filter(Boolean).length;
                      const good = cnt >= 3 && cnt <= 5;
                      const tone = cnt === 0 ? "#b0a3c0" : good ? "#2e7d32" : "#c77800";
                      return (
                        <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ fontWeight: 800, color: tone }}>
                            현재 {cnt}개 입력{good ? " ✓" : ""}
                          </span>
                          <span style={{ color: "#b0a3c0" }}>·</span>
                          <span style={{ color: "#a98bc0", fontWeight: 600 }}>추천 3~5개</span>
                          {cnt > 0 && !good && (
                            <span style={{ color: "#c77800", fontWeight: 600 }}>
                              {cnt < 3 ? `(${3 - cnt}개 더 넣으면 좋아요)` : "(너무 많으면 분산돼요)"}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {confirmErr && <div style={{ marginTop: 14, color: "#c62828", fontSize: 12.5, whiteSpace: "pre-line" }}>{confirmErr}</div>}

                {/* ★ 저장 — 필수(업종·업체명·주소) 충족 시 활성. 생활권은 선택(등록 후 설정). */}
                {nameOk && addrOk && (
                  <div style={{ marginTop: 18, animation: "fadeIn .2s ease" }}>
                    <button onClick={onCreateAndSave} disabled={storeSaving || !regReady}
                      style={{ width: "100%", padding: "13px 0", borderRadius: 9, border: "none",
                        background: (storeSaving || !regReady) ? "#ccc" : "linear-gradient(90deg,#9C27B0,#7B1FA2)",
                        color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: "inherit",
                        cursor: (storeSaving || !regReady) ? "default" : "pointer" }}>
                      {storeSaving ? "등록 중…" : "✓ 업체 등록 완료 — 바로 사용하기"}
                    </button>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#b0a3c0", textAlign: "center", lineHeight: 1.5 }}>
                      지금 등록하면 바로 AI 글쓰기를 쓸 수 있어요. 전화·영업시간·주차 등은 등록 후에도 언제든 수정·추가할 수 있습니다.
                    </div>

                    {/* 추가정보 — 접이식(저장과 무관). 지금 채워도 되고 나중에 채워도 됨. */}
                    <div style={{ marginTop: 14, borderTop: "1px dashed #e0d0f0", paddingTop: 12 }}>
                      <button type="button" onClick={() => setMoreOpen(v => !v)}
                        style={{ width: "100%", background: "#faf7fd", border: "1.5px solid #ece3f6",
                          borderRadius: 9, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: "#7B1FA2" }}>＋ 추가정보 (선택) — 나중에 입력해도 됩니다</span>
                        <span style={{ fontSize: 12, color: "#a98bc0" }}>{moreOpen ? "▲ 접기" : "▼ 지금 입력"}</span>
                      </button>

                      {moreOpen && (
                        <div style={{ marginTop: 12, animation: "fadeIn .2s ease" }}>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>전화번호</label>
                            <input value={form.phone} onChange={e => set("phone", e.target.value)}
                              placeholder="예: 02-123-4567" style={gInput} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    );
  }

  const labelStyle = { fontSize: 12, color: "#888", fontWeight: 700, marginBottom: 4, display: "block" };
  const inputStyle = { width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
    fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" };
  // 지역 전략용 강조 입력 (테두리 진하게)
  const strategyInputStyle = { ...inputStyle, border: "2px solid #9C27B0", background: "#fffdff" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeIn .25s ease" }}>

      {/* [v72][B안] 테스트 단계 — 업체명+업종 자유 수정. (오픈 시 1회 확정으로 전환 예정) */}
      <div style={{ background: "#f7f2fb", border: "1px solid #e5dcef", borderRadius: 12, padding: "11px 16px" }}>
        {/* [v127] 정체성 = 1줄 요약(확인용). 라벨 제거 · 구분자만. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap", fontSize: 12.5, color: "#7a6a8a" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#4A148C" }}>
              🏥 {(hubStore && hubStore.store_name) || "내 업체"}
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ fontWeight: 700, color: "#6A1B9A" }}>
              {(hubStore && hubStore.industry) ? industryPath(hubStore.industry, hubStore.specialty) : industryLabel}
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ color: (form.address || "").trim() ? "#4a3a5a" : "#c0a0d0" }}>
              {(form.address || "").trim() || "주소 미입력"}
            </span>
            <span style={{ color: "#ddd" }}>|</span>
            <span style={{ color: (form.phone || "").trim() ? "#4a3a5a" : "#c0a0d0" }}>
              {(form.phone || "").trim() || "전화 미입력"}
            </span>
          </div>
          {!editIdent && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <VideoHelpBtn onCoachVideo={onCoachVideo} vkey="store_ident" />
              <button onClick={() => { setIdentIndustry((hubStore && hubStore.industry) || ""); setIdentName((hubStore && hubStore.store_name) || ""); setIdentConfirm(false); setEditIdent(true); }}
                style={{ fontSize: 11.5, fontWeight: 700, color: "#9C27B0", background: "#fff",
                  border: "1.5px solid #e0d0f0", borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                업종·업체명 수정
              </button>
            </div>
          )}
        </div>

        {editIdent && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #e0d0f0" }}>
            {/* [v77] 업체명·주소·전화 = 한 줄 3박스(폭 절감). 좁은 화면은 자동 줄바꿈. */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <div style={{ flex: "1 1 150px", minWidth: 130 }}>
                <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>업체명</label>
                <input value={identName} onChange={e => { setIdentName(e.target.value); setIdentConfirm(false); }}
                  placeholder="업체명"
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
                    fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: "2 1 200px", minWidth: 160 }}>
                <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>주소</label>
                <input value={form.address} onChange={e => { set("address", e.target.value); setIdentConfirm(false); }}
                  onBlur={e => { const c = cleanAddress(e.target.value); if (c !== (form.address || "")) set("address", c); }}
                  placeholder="예: 서울 노원구 공릉동 OO로 12"
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
                    fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" }} />
                <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 3 }}>↳ 주소를 입력하면 대표지역이 자동으로 잡힙니다</div>
              </div>
              <div style={{ flex: "1 1 140px", minWidth: 120 }}>
                <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 4 }}>전화번호</label>
                <input value={form.phone} onChange={e => { set("phone", e.target.value); setIdentConfirm(false); }}
                  placeholder="예: 02-123-4567"
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e0d0f0",
                    fontSize: 13, fontFamily: "inherit", color: "#1a1a2e", background: "#fff", boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }} />

            {/* [v127] 주차정보 입력 제거 — 주차는 방문정보(parkingOps) 단일화. parking_info는 빈값 저장. */}

            {/* [v121] 업종 = 최초 1회 확정. 엔진·데이터셋·관측 클러스터·발행이력 기준이라 변경 시 데이터 꼬임.
                일반 계정은 읽기전용 배지. OWNER(테스트)만 업종 변경 허용. */}
            {isOwner ? (
              <div style={{ marginTop: 4 }}>
                <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 6 }}>업종</label>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
                  background: "#f4eefb", border: "1.5px solid #e5dcef", borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#4A148C" }}>
                    {identIndustry ? industryPath(identIndustry, specialty) : <span style={{ color: "#a08ab0", fontWeight: 600 }}>아직 선택 안 됨</span>}
                  </span>
                  <button type="button"
                    onClick={() => onGoIndustryCenter && onGoIndustryCenter()}
                    style={{ marginLeft: "auto", flexShrink: 0, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      border: "1.5px solid #c8a8e0", background: "#fff", color: "#9C27B0",
                      borderRadius: 8, padding: "5px 11px", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    🗂️ 업종센터에서 {identIndustry ? "변경" : "선택"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: "#a08ab0", marginTop: 5, lineHeight: 1.6 }}>
                  업종센터에서 대분류 → 세부업종을 단계적으로 선택합니다.
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                <label style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 800, display: "block", marginBottom: 6 }}>업종</label>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
                  background: "#f4eefb", border: "1.5px solid #e5dcef", borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#4A148C" }}>
                    {(hubStore && hubStore.industry) ? industryPath(hubStore.industry, hubStore.specialty) : industryLabel}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9457b8",
                    background: "#fff", border: "1px solid #e0d0f0", borderRadius: 12, padding: "2px 9px" }}>
                    🔒 변경 불가
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#a08ab0", marginTop: 5, lineHeight: 1.6 }}>
                  업종은 가입 시 1회 확정됩니다. 업체명·주소·전화·생활권·주차 정보는 언제든 수정할 수 있습니다.
                </div>
              </div>
            )}

            {identConfirm && identReady && (
              <div style={{ marginTop: 14, background: "#faf5ff", border: "1.5px solid #CE93D8",
                borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#4A148C", lineHeight: 1.6 }}>
                  입력하신 내용 확인
                  <div style={{ fontSize: 13.5, color: "#4A148C", marginTop: 6 }}>
                    <div><b>{identName.trim()}</b> · {industryPath(identIndustry, specialty)}</div>
                    <div style={{ fontSize: 12.5, color: "#6a5a7a", marginTop: 2 }}>
                      주소: {(form.address || "").trim() || <span style={{ color: "#c0a0d0" }}>미입력</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6a5a7a" }}>
                      전화: {(form.phone || "").trim() || <span style={{ color: "#c0a0d0" }}>미입력</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#6A1B9A", marginTop: 6 }}>이대로 저장할까요?</div>
                </div>
                {hubStore && hubStore.industry && identIndustry && identIndustry !== hubStore.industry && (
                  <div style={{ marginTop: 10, background: "#fff4f4", border: "1.5px solid #f0c0c0",
                    borderRadius: 9, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, color: "#c0392b", lineHeight: 1.6 }}>
                    ⚠️ 업종 변경은 되돌릴 수 없습니다. 기존 발행 전략·관측 데이터에 영향이 있으니 신중하게 결정하세요.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={onApplyIdent} disabled={identSaveState !== "idle"}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                      background: identSaveState === "done" ? "#2e7d32"
                        : identSaveState === "saving" ? "#b39ddb"
                        : "linear-gradient(90deg,#9C27B0,#7B1FA2)", color: "#fff",
                      transition: "background .15s",
                      fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                      cursor: identSaveState === "idle" ? "pointer" : "default" }}>
                    {identSaveState === "saving" ? "저장 중…" : identSaveState === "done" ? "✅ 저장 완료" : "저장"}
                  </button>
                  <button onClick={() => setIdentConfirm(false)}
                    style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #e0d0f0",
                      background: "#fff", color: "#888", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                    뒤로
                  </button>
                </div>
              </div>
            )}

            {!identConfirm && (
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => { const miss = identMissing(); if (miss.length) { setIdentMsg(`빠진 필수 항목 : ${miss.join(", ")}`); return; } setIdentMsg(""); setIdentConfirm(true); }}
                  disabled={!identReady}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                    background: !identReady ? "#ccc" : "linear-gradient(90deg,#9C27B0,#7B1FA2)",
                    color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                    cursor: !identReady ? "default" : "pointer" }}>
                  적용
                </button>
                <button onClick={() => { setEditIdent(false); setIdentConfirm(false); }}
                  style={{ padding: "10px 18px", borderRadius: 9, border: "1.5px solid #e0d0f0",
                    background: "#fff", color: "#888", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>
                  취소
                </button>
              </div>
            )}
            {identOkMsg && <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2e7d32", background: "#e8f5e9",
              border: "1.5px solid #a5d6a7", borderRadius: 8, padding: "9px 12px", marginTop: 8, textAlign: "center" }}>✅ {identOkMsg}</div>}
            {identMsg && <div style={{ fontSize: 12.5, fontWeight: 800, color: "#c62828", background: "#fdecea",
              border: "1.5px solid #f5c6cb", borderRadius: 8, padding: "9px 12px", marginTop: 8, textAlign: "center" }}>⚠️ {identMsg}</div>}
            {/* [v77] 중요 변경 경고 — 횟수 제한 대신 문제인식 유도(1계정=1사업장 원칙). 변경이력 로그/관리자 모니터링은 추후. */}
            <div style={{ fontSize: 13.5, color: "#C2185B", fontWeight: 800, background: "#fdeef4",
              border: "1.5px solid #f6cfde", borderRadius: 10, padding: "13px 14px", marginTop: 12, lineHeight: 1.55, textAlign: "center" }}>
              ⚠️ 지역·업종 변경 시 기존 발행 전략과 관측 데이터에 영향이 있을 수 있습니다.
            </div>
            <div style={{ fontSize: 10.5, color: "#c0a0d0", marginTop: 6, lineHeight: 1.5 }}>
              저장 시 업체정보에 반영됩니다. (테스트 단계 — 업종·업체명 자유 변경 가능)
            </div>
          </div>
        )}
      </div>

      {/* [v77] 신원 에디터 입력 중에는 하단 박스 숨김 — 업체정보 마무리에 집중 유도. 닫으면 다시 노출. */}
      {!editIdent && (<>

      {/* [v-svcgroup] 서비스 분야 — 그룹 소속 업종만 노출. 미소속은 렌더 안 함(영향 0). */}
      {_hasSvc && (
      <div style={{ background: "linear-gradient(180deg,#f2f8ff,#fff)", borderRadius: 14,
        border: "2px solid #90CAF9", padding: "13px 16px",
        boxShadow: "0 2px 12px rgba(33,150,243,.10)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: "#0D47A1" }}>
            {_svcGroup.emoji} {_svcGroup.label} <span style={{ fontSize: 11, fontWeight: 700, color: "#5b8fc8" }}>{_svcGroup.hint}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {deptMsg && <span style={{ fontSize: 12, fontWeight: 700,
              color: deptMsg.includes("실패") ? "#c62828" : "#2e7d32" }}>{deptMsg}</span>}
            <VideoHelpBtn onCoachVideo={onCoachVideo} vkey="store_dept" />
            <button onClick={onSaveDepartments} disabled={storeSaving}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none",
                cursor: storeSaving ? "default" : "pointer", fontFamily: "inherit",
                background: storeSaving ? "#e8e8ed" : "linear-gradient(135deg,#0D47A1,#2196F3)",
                color: storeSaving ? "#aaa" : "#fff", fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap" }}>
              {storeSaving ? "저장 중…" : `${_svcGroup.label} 저장`}
            </button>
          </div>
        </div>

        {/* [v127] 설명 제거 — 🎥 사용법 영상으로 이관 */}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {_svcItems.map(d => {
            const isRep  = d.id === _repDept;
            const picked = depts.includes(d.id);
            const off    = !d.available;   // 예약석(엔진 미배선) — 선택·저장 불가
            return (
              <button key={d.id} type="button"
                onClick={() => { if (!off) toggleDept(d.id); }}
                disabled={off || isRep}
                title={off ? "준비 중입니다" : (isRep ? `${_svcGroup.repHint} — 해제할 수 없습니다` : "")}
                style={{
                  padding: "8px 13px", borderRadius: 999, fontFamily: "inherit",
                  fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap",
                  cursor: (off || isRep) ? "default" : "pointer",
                  border: off ? "1.5px dashed #ddd"
                        : isRep ? "2px solid #0D47A1"
                        : picked ? "2px solid #2196F3" : "1.5px solid #cfd8e3",
                  background: off ? "#f7f7f9"
                        : isRep ? "linear-gradient(135deg,#0D47A1,#1976D2)"
                        : picked ? "#E3F2FD" : "#fff",
                  color: off ? "#c0c0c8"
                        : isRep ? "#fff"
                        : picked ? "#0D47A1" : "#7a8699",
                }}>
                {isRep ? "★ " : picked ? "✓ " : ""}{d.label}{off ? " (준비중)" : ""}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 11.5, color: "#7a8699", marginTop: 9, lineHeight: 1.55 }}>
          선택됨 <strong style={{ color: "#0D47A1" }}>{depts.length}</strong>개
          {depts.length > 1 && <> — 대표: <strong style={{ color: "#0D47A1" }}>
            {(_svcItems.find(x => x.id === _repDept) || {}).label || _repDept}</strong></>}
          <br />↳ {_svcGroup.repHint} 변경은 위 <strong>업체정보(업종)</strong>에서 진행합니다.
        </div>
      </div>
      )}

      {/* ★ 1순위 — AI 지역 전략 (대표지역 + 생활권). 가장 중요. 강조 박스. */}
      <div style={{ background: "linear-gradient(180deg,#fbf5ff,#fff)", borderRadius: 14,
        border: "2px solid #CE93D8", padding: "13px 16px",
        boxShadow: "0 2px 12px rgba(156,39,176,.10)" }}>
        {/* [v77] 헤더 row: 제목 + 저장버튼 우측(추가정보 박스와 통일감). */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: "#6A1B9A" }}>
            📍 생활권 <span style={{ fontSize: 12, fontWeight: 700, color: "#8E6BA8" }}>(쉼표로 구분)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {subRegionMsg && <span style={{ fontSize: 12, fontWeight: 700,
              color: subRegionMsg.includes("실패") ? "#c62828" : "#2e7d32" }}>{subRegionMsg}</span>}
            <VideoHelpBtn onCoachVideo={onCoachVideo} vkey="store_region" />
            <button onClick={onSaveSubRegion} disabled={storeSaving}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none",
                cursor: storeSaving ? "default" : "pointer", fontFamily: "inherit",
                background: storeSaving ? "#e8e8ed" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                color: storeSaving ? "#aaa" : "#fff", fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap" }}>
              {storeSaving ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>

        {/* 1. 생활권 — 사용자 입력 핵심. 가장 강조. */}
        <div>
          {/* [v127] 라벨·설명 제거 — placeholder로 흡수. 상세는 🎥 사용법 영상. */}
          <input value={form.sub_region} onChange={e => { set("sub_region", e.target.value); setSubRegionConfirm(false); }}
            placeholder="생활권 3~5개 입력 (쉼표로 구분) · 예: 공릉동, 태릉입구역, 하계동" style={strategyInputStyle} />
          {/* [v111] 생활권 1개 권장 확인창 — 강제 아님. [그대로 저장] / [생활권 추가하기] */}
          {subRegionConfirm && (
            <div style={{ marginTop: 12, background: "#fff8e1", border: "1.5px solid #ffe082",
              borderRadius: 12, padding: "13px 15px", animation: "fadeIn .2s ease" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#8a6d00", marginBottom: 6 }}>
                💡 생활권이 1개만 등록되어 있습니다
              </div>
              <div style={{ fontSize: 12, color: "#7a6a3a", lineHeight: 1.65 }}>
                보통은 3~4개의 생활권을 함께 설정합니다. 많을수록 검색 노출이 넓어집니다.<br />
                <span style={{ color: "#9c8a4a" }}>예) 공릉동, 태릉입구역, 하계동, 중계동</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <button onClick={onSaveSubRegion} disabled={storeSaving}
                  style={{ padding: "8px 16px", borderRadius: 9, border: "1.5px solid #d4b84a",
                    cursor: storeSaving ? "default" : "pointer", fontFamily: "inherit",
                    background: "#fff", color: "#8a6d00", fontSize: 12.5, fontWeight: 800 }}>
                  그대로 저장
                </button>
                <button onClick={() => setSubRegionConfirm(false)}
                  style={{ padding: "8px 16px", borderRadius: 9, border: "none", cursor: "pointer",
                    fontFamily: "inherit", background: "linear-gradient(135deg,#4A148C,#9C27B0)",
                    color: "#fff", fontSize: 12.5, fontWeight: 800 }}>
                  생활권 추가하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* [v-visit] 방문정보 — 검색자의 마지막 질문 "지금 가도 되나?"에 답하는 재료.
          UI/state만 (세션32). 저장은 준비 중 · 채운 값은 글에 자동 반영될 예정.
          빈 항목은 글에 나오지 않음 → 부담 없이 아는 것만 입력. */}
      {/* [세션39][STORE-01] 매장 유무 게이트 — 방문형(출장 서비스)은 박스 전체 미노출.
          방문정보(영업시간·좌석·예약)와 찾아오시는 길은 "고객이 온다"는 전제의 재료.
          출장 업종(청소·이사·방역·누수·꽃배달 등 24종)에는 성립하지 않음.
          ⚠ 주소(address)는 위 기본정보에 그대로 유지 — 대표지역 SoT.
          [세션55] 상조 예외 — funeral은 이 박스가 '방문정보'가 아니라 '업체정보(상품·서비스·상담)'로
          isFuneral 분기 렌더 중. hasPhysicalStore:false가 상품 편집기까지 숨기던 버그 수정.
          위치(찾아오시는 길)는 아래 !isFuneral 게이트로 이미 차단 — 이중 안전. */}
      {(hasStore || isFuneral) && (
      <div ref={visitBoxRef} style={{ background: "#fff", borderRadius: 14, border: justRegistered ? "1.5px solid #d4b3ec" : "1.5px solid #e8e8ed",
        padding: "16px 18px", marginTop: 4, scrollMarginTop: 16 }}>
        {/* [세션37][A안] 등록 직후 1회 안내 배너 — 다음 할 일(방문정보) 유도. 접거나 저장하면 사라짐. */}
        {justRegistered && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            background: "linear-gradient(90deg,#f7edff,#faf5ff)", border: "1px solid #e0c4f2",
            borderRadius: 10, padding: "10px 14px", marginBottom: 12, animation: "fadeIn .25s ease" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#7B1FA2", lineHeight: 1.5 }}>
              ✓ 업체 등록 완료! 이제 <b>방문정보</b>를 채우면 글이 훨씬 풍부해집니다 · 아는 것만 입력해도 됩니다.
            </span>
            <button type="button" onClick={() => setJustRegistered(false)}
              style={{ flexShrink: 0, background: "transparent", border: "none", cursor: "pointer",
                fontSize: 16, color: "#b0a3c0", fontFamily: "inherit", lineHeight: 1, padding: 2 }}>×</button>
          </div>
        )}
        {/* [세션58][DOM] 내부에 VideoHelpBtn(<button>)이 들어가므로 바깥은 <div role="button">.
             <button> 중첩 = HTML 무효(React validateDOMNesting 경고). 기능·스타일 동일, 태그만 교체. */}
        <div role="button" tabIndex={0}
          onClick={() => setVisitOpen(v => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setVisitOpen(v => !v); } }}
          style={{ width: "100%", boxSizing: "border-box", background: visitOpen ? "#faf7fd" : "#f3e9fb",
            border: visitOpen ? "1.5px solid #ece3f6" : "1.5px solid #d4b3ec",
            borderRadius: 9, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", marginTop: 8,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#7B1FA2" }}>
              {isHospital ? "🏥 진료 및 방문안내"
                : isFuneral ? "📦 상품 · 서비스 · 상담 정보 입력"
                : isPro ? "🕒 상담시간 · 예약 · 주차 등 입력"
                : isFood ? "🕒 영업시간 · 예약 · 좌석 · 대표메뉴 등 입력"
                : "🕒 영업시간 · 휴무일 · 예약 상담 · 주차 · 대중교통 입력"}
            </span>
            <span style={{ fontSize: 11.5, color: "#9457b8", fontWeight: 600 }}>
              {isFuneral
                ? "상담 연결에 필요한 정보 — 채우면 글에 자동 반영됩니다"
                : "채우면 글에 자동 반영됩니다"}
            </span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <VideoHelpBtn onCoachVideo={onCoachVideo} vkey="store_visit" />
            <span style={{ fontSize: 12.5, color: "#9C27B0", fontWeight: 800,
              background: "#fff", borderRadius: 14, padding: "4px 11px", border: "1px solid #e0c4f2" }}>
              {visitOpen ? "▲ 접기" : "＋ 지금 입력"}
            </span>
          </span>
        </div>

        {visitOpen && (
          <div style={{ marginTop: 12, animation: "fadeIn .2s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
              {VISIT_INFO_FIELDS.map(f => (
                f.header ? (
                  // [세션48] 구획 헤더 타입 — 입력칸 아님. header 키 없는 기존 필드는 이 분기 미진입(무영향).
                  <div key={f.key} style={{ gridColumn: "1 / -1", marginTop: 6, paddingTop: 10, borderTop: "1px solid #f0e9f7" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#7B1FA2" }}>{f.label}</div>
                    {f.hint && <div style={{ fontSize: 10.5, color: "#b0a3c0", marginTop: 2 }}>↳ {f.hint}</div>}
                  </div>
                ) : f.productEditor ? (
                  // [세션49] 상조 상품 Array 편집기 — 여러 상품 추가/삭제. productEditor 키 없는 필드는 미진입(무영향).
                  <div key={f.key} style={{ gridColumn: "1 / -1" }}>
                    {(visitInfo.funeralProducts || []).map((p, idx) => (
                      <div key={idx} style={{ border: "1px solid #ece3f5", borderRadius: 10, padding: 10, marginBottom: 8, background: "#faf7fd" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7B1FA2" }}>상품 {idx + 1}</span>
                          <button type="button" onClick={() => removeFuneralProduct(idx)}
                            style={{ fontSize: 11, color: "#b0559b", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>삭제</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
                          <input value={p.name || ""} onChange={e => setFuneralProduct(idx, "name", e.target.value)}
                            placeholder="상품명 (예: 프리미엄 129 / 후불 가족장)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={p.price || ""} onChange={e => setFuneralProduct(idx, "price", e.target.value)}
                            placeholder="가격 (예: 129만원)" style={inputStyle} />
                          <input value={p.target || ""} onChange={e => setFuneralProduct(idx, "target", e.target.value)}
                            placeholder="대상 (예: 가족장)" style={inputStyle} />
                          <input value={p.feature || ""} onChange={e => setFuneralProduct(idx, "feature", e.target.value)}
                            placeholder="특징 (예: 후불제 상품)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={p.note || ""} onChange={e => setFuneralProduct(idx, "note", e.target.value)}
                            placeholder="기타안내 (선택)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFuneralProduct}
                      style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#7B1FA2",
                        background: "#f3ebfa", border: "1px dashed #c9a9e0", borderRadius: 8, cursor: "pointer" }}>
                      + 상품 추가
                    </button>
                    <div style={{ fontSize: 10.5, color: "#b0a3c0", marginTop: 4 }}>↳ 입력한 상품만 글 하단 안내 블록에 표시됩니다 · 없으면 미표시</div>
                  </div>
                ) : f.hallEditor ? (
                  // [C-2] 장례식장 Array 편집기 — productEditor 동형. hallEditor 키 없는 필드는 미진입(무영향).
                  <div key={f.key} style={{ gridColumn: "1 / -1" }}>
                    {(visitInfo.funeralHalls || []).map((h, idx) => (
                      <div key={idx} style={{ border: "1px solid #ece3f5", borderRadius: 10, padding: 10, marginBottom: 8, background: "#faf7fd" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7B1FA2" }}>장례식장 {idx + 1}</span>
                          <button type="button" onClick={() => removeFuneralHall(idx)}
                            style={{ fontSize: 11, color: "#b0559b", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>삭제</button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
                          <input value={h.name || ""} onChange={e => setFuneralHall(idx, "name", e.target.value)}
                            placeholder="장례식장명 (예: 을지대병원 장례식장)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={h.address || ""} onChange={e => setFuneralHall(idx, "address", e.target.value)}
                            placeholder="주소 (예: 서울 중랑구 …)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={h.parking || ""} onChange={e => setFuneralHall(idx, "parking", e.target.value)}
                            placeholder="주차 (예: 지하 200대)" style={inputStyle} />
                          <input value={h.parkingFee || ""} onChange={e => setFuneralHall(idx, "parkingFee", e.target.value)}
                            placeholder="주차요금 (예: 조문객 3시간 무료)" style={inputStyle} />
                          <input value={h.halls || ""} onChange={e => setFuneralHall(idx, "halls", e.target.value)}
                            placeholder="빈소 (예: 지하1층 5실 · 20~100명)" style={inputStyle} />
                          <input value={h.mortuary || ""} onChange={e => setFuneralHall(idx, "mortuary", e.target.value)}
                            placeholder="안치실 (예: 지하2층 12구)" style={inputStyle} />
                          <input value={h.restaurant || ""} onChange={e => setFuneralHall(idx, "restaurant", e.target.value)}
                            placeholder="식당 (예: 빈소별 접객실 · 100석)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={h.facilities || ""} onChange={e => setFuneralHall(idx, "facilities", e.target.value)}
                            placeholder="편의시설 (예: 유족대기실 · 샤워실 · 엘리베이터)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={h.crematorium || ""} onChange={e => setFuneralHall(idx, "crematorium", e.target.value)}
                            placeholder="화장장 (예: 서울추모공원 차량 30분)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                          <input value={h.memo || ""} onChange={e => setFuneralHall(idx, "memo", e.target.value)}
                            placeholder="메모 (선택 · 조문시간 등)" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFuneralHall}
                      style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#7B1FA2",
                        background: "#f3ebfa", border: "1px dashed #c9a9e0", borderRadius: 8, cursor: "pointer" }}>
                      + 장례식장 추가
                    </button>
                    <div style={{ fontSize: 10.5, color: "#b0a3c0", marginTop: 4 }}>↳ 입력한 항목만 글에 반영됩니다 · 빈칸은 문장으로 만들지 않습니다</div>
                  </div>
                ) : (
                <div key={f.key} style={f.full ? { gridColumn: "1 / -1" } : undefined}>
                  <label style={{ ...labelStyle, marginBottom: 3, fontSize: 11.5 }}>{f.label}</label>
                  {f.area ? (
                    <textarea value={visitInfo[f.key]} onChange={e => setVisit(f.key, e.target.value)}
                      placeholder={f.ph} rows={1}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.4 }} />
                  ) : (
                    <input value={visitInfo[f.key]} onChange={e => setVisit(f.key, e.target.value)}
                      placeholder={f.ph} style={inputStyle} />
                  )}
                  {f.hint && <div style={{ fontSize: 10.5, color: "#b0a3c0", marginTop: 3 }}>↳ {f.hint}</div>}
                </div>
                )
              ))}
            </div>

            {/* [v127] 찾아오시는 길 입력 은퇴 — 주차·대중교통은 위 방문정보로 통합 */}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
              {visitMsg && <span style={{ fontSize: 12, fontWeight: 700,
                color: visitMsg.includes("실패") ? "#c62828" : "#2e7d32" }}>{visitMsg}</span>}
              <button onClick={onSaveVisit} disabled={storeSaving}
                style={{ padding: "10px 26px", borderRadius: 10, border: "none",
                  cursor: storeSaving ? "default" : "pointer", fontFamily: "inherit",
                  background: storeSaving ? "#e8e8ed" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                  color: storeSaving ? "#aaa" : "#fff", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>
                {isFuneral ? "업체정보 저장" : "방문정보 저장"}
              </button>
            </div>
          </div>
        )}
      </div>
      )}{/* [세션39][STORE-01] hasStore 게이트 끝 */}

      {/* [세션36] 제목 설정 — 축소(한 줄 토글). 상세 설명·예시 제거. */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ede4f7",
        padding: "12px 16px", marginTop: 4,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#4A148C" }}>
            제목 끝에 업체명 표시 <span style={{ fontSize: 11, color: "#9C27B0", fontWeight: 700 }}>(권장)</span>
          </span>
          <span style={{ fontSize: 12.5, color: "#7a6a8a", fontWeight: 600, marginLeft: 8 }}>
            제목에만 ' | {(hubStore && hubStore.store_name) || "업체명"}' 추가 · 본문 비노출
          </span>
          {savedMsgSuffix && <span style={{ fontSize: 11.5, fontWeight: 700, marginLeft: 8,
            color: savedMsgSuffix.includes("실패") ? "#c62828" : "#2e7d32" }}>{savedMsgSuffix}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <VideoHelpBtn onCoachVideo={onCoachVideo} vkey="store_title" />
        <button onClick={async () => {
            const nextOn = !suffixOn;
            setSuffixOn(nextOn);
            setSavedMsgSuffix("");
            const r = await saveStore({ title_suffix_on: nextOn });
            setSavedMsgSuffix(r?.ok ? "저장됨" : "실패");
            if (r?.ok) setTimeout(() => setSavedMsgSuffix(""), 2500);
            else setSuffixOn(!nextOn); // 실패 시 롤백
          }}
          style={{ flexShrink: 0, width: 52, height: 28, borderRadius: 999, border: "none",
            cursor: "pointer", position: "relative", transition: "background .2s",
            background: suffixOn ? "linear-gradient(135deg,#4A148C,#9C27B0)" : "#d6cce4" }}>
          <span style={{ position: "absolute", top: 3, left: suffixOn ? 27 : 3,
            width: 22, height: 22, borderRadius: "50%", background: "#fff",
            transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
        </button>
        </div>
      </div>
      </>)}

      <div style={{ fontSize: 11, color: "#bbb", textAlign: "center" }}>
        업체 사진 등록은 준비 중입니다. (2차)
      </div>
    </div>
  );
}
