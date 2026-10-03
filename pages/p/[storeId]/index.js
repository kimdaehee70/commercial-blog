// pages/p/[storeId]/index.js
// ─────────────────────────────────────────────────────────────
// [PSEO-V0-CONTACT-FIRST-DESIGN-01] Gate A — 업체 공개 페이지 1장.
// [PSEO-V1-PAID-USER-EXPANSION-01]   V1 — 유료 Gate + Intent 목록 자동 표시.
// [PSEO-HUB-RECENT-POSTS-01]         허브 「최근 글」 블록.
//
// 목적: 검색 사용자가 이 페이지에서 "업체에 직접" 연락한다.
//   AI-POST 가입 CTA 없음. 상담 동선 탈취 0. (지시서 §9)
//
// 실측 근거 (S-pSEO-A):
//   · store_profiles RLS = service_role_all 단 1건 → anon 읽기 0행.
//     따라서 반드시 SSR + service role. 클라이언트 조회 불가.
//   · store_profiles.id = bigint identity → URL 세그먼트는 정수.
//   · account_id = bigint NULL 허용 (FK accounts(id) ON DELETE SET NULL)
//     → 계정 삭제된 고아 store 존재 가능 → 렌더 금지.
//   · status text NOT NULL default 'active' → 'active' 만 공개.
//
// V1 추가 (승인분):
//   ★ 유료 자격 Gate. isPseoEligible() 이 false 면 notFound.
//     판정 규칙은 기존 resolveBillingPeriod() 재사용 — 신규 규칙·grace·
//     우회 스위치 없음.
//   ★ 자격 있는 Intent(core_keyword cnt>=2) 목록을 자동 표시.
//     저장물이 아니라 요청 시점 집계이므로 발행만 하면 누적되고,
//     만료·삭제 시 별도 정리 없이 자동으로 사라진다.
//
// [PSEO-HUB-RECENT-POSTS-01] (LG 인테리어 Pilot TRACE 발견)
//   결손: 허브는 발행글을 읽지 않았다. Intent(cnt>=2) 가 0개인 업체는
//     발행글이 노출될 경로가 없었다. store 14 = published 27 / 화면 노출 0.
//     core_keyword 는 NULL 20 + 나머지 전부 1건씩 → Intent 구조적 0.
//   조치: 최근 발행글 목록을 허브에 표시. core_keyword 무관(NULL 도 글은 글).
//   규칙: Intent 페이지([intentSlug].js)와 동일
//     · published + deleted_at null 만. baseline 제외.
//     · 블로그 홈 URL(글 번호 없음)은 링크 금지 → 제목만.
//     · 제목·날짜·원문 링크만. content/text_markdown 미사용(본문 복제 금지).
//   DDL 0 / 신규 cta_type 0 (post_click 은 Intent 페이지가 이미 사용 중).
//
// 절대 원칙 (승인분):
//   ★ service role 은 getServerSideProps 안에서만. 브라우저 번들 유입 금지.
//   ★ props 에 store 전체 객체 전달 금지. 아래 PUBLIC_FIELDS 화이트리스트만.
//     (service role 은 전 컬럼 접근권 → 통째 전달 시 notes/meta 가 HTML 에 박힌다)
//   ★ account_id 는 서버 판정 전용. props 로 내보내지 않는다.
//   ★ 엔진·결제·관측 SoT 무접촉. DDL 0.
// ─────────────────────────────────────────────────────────────

import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { isPseoEligible, listQualifiedIntents, MIN_HUB_POSTS, countPublishedPosts } from "../../../lib/pseo/eligibility";
// [PSEO-CANONICAL-FOUNDATION-01] self-canonical 은 URL 단일 파생 지점에서 조립한다.
//   검색노출 보드와 같은 함수를 쓰므로 두 값이 갈릴 수 없다.
import { hubUrl } from "../../../lib/pseo/url";
import { resolvePhone } from "../../../lib/pseo/phone";
import { hasPhysicalStore } from "../../../lib/industry-catalog";

// ── 브라우저로 내보낼 컬럼 화이트리스트 ────────────────────────
//   여기 없는 컬럼은 HTML 에 절대 나가지 않는다.
//   account_id 는 조회는 하되 props 로는 나가지 않는다(서버 판정 전용).
//   photo_pool 도 SSR 원천 전용 — 검증된 path 를 public URL 로 바꾼 store.photos 만 나간다(⑦-F).
//   제외 확정: notes / meta / blog_account / treatments / real_menu /
//             faq / homepage_url / blog_url
const PUBLIC_FIELDS = [
  "id",
  "account_id", // [V1] 유료 판정·Intent 집계용. props 미포함.
  "store_name",
  "industry",
  "region",
  "sub_region",
  "address",
  "phone",
  "naver_place_url",
  "visit_info",
  "photo_pool", // [P-PAGE-ONE-SCREEN-01 ⑦-F] SSR 원천 전용. raw path 는 props 미포함.
];

// [P-PAGE-ONE-SCREEN-01 ⑦-F] 업체사진 — SoT store_profiles.photo_pool([{path}], [0]=대표).
//   공개 직전 재검증: "{현재 storeId}/{UUID}.jpg" 형식만 · 최대 6장. Storage 추가 조회 없음.
//   (pages/api/me/store-photo.js isOwnPath · MAX_PHOTOS 와 같은 규칙 — 동기화 지점)
const PHOTO_BUCKET = "store-photos";
const MAX_PHOTOS = 6;
const PHOTO_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

// visit_info(jsonb) 중 공개 대상 키. Store.js 실측 키만.
const VISIT_KEYS = [
  ["businessHours", "영업시간"],
  ["closedDays", "휴무"],
  ["parkingOps", "주차"],
  ["reservation", "예약"],
];
// [P-PAGE-F3-TRAVEL-INFO-CONSISTENCY-01] 출장형 전용 — VISIT_KEYS 뒤에 붙인다. 라벨 = 입력 화면 라벨.
//   출장형 판정 = lib/Store.js isField 와 같은 규칙. 다른 업종의 etc/dispatch24 는 표시하지 않는다.
//   (lib/PseoRoom.js FIELD_VISIT_KEYS 와 같은 값 — 동기화 지점)
const FIELD_VISIT_KEYS = [
  ["dispatch24", "출동 가능시간"],
  ["serviceArea", "출동 가능지역"], // [P-PAGE-F2-SERVICE-AREA-POSITION-01] 독립 「서비스 지역」 블록에서 이동
  ["etc", "출장 안내"],
];

// 허브에 노출할 Intent 최대 개수.
const MAX_INTENTS = 20;

// [PSEO-HUB-RECENT-POSTS-01] 허브 최근 글 최대 개수. Intent 페이지 MAX_LIST 와 같은 값.
const MAX_RECENT = 12;

// ── [PSEO-LG-FOUNDATION-V1-01] 업체 검색 FACT ─────────────────────
//   원천: store_profiles.meta.search_fact (업체 입력 · AI 생성 없음).
//   ★ PUBLIC_FIELDS 에 meta 추가 금지 — 별도 select 후 search_fact 만 추출.
//     meta 의 다른 키(note 등)는 props 로 나가지 않는다.
//   ★ 상담 전 확인은 visit_info SoT 에서 읽는다(복제 없음). 출동 가능지역(serviceArea)은 FIELD_VISIT_KEYS 로 영업·이용정보에 표시.
//   ★ 입력 없는 블록은 렌더하지 않는다. title/description·Intent 무접촉.
//   (pages/api/me/store.js pickSearchFact 와 같은 규칙 — 파일 3개 제한으로 로컬 정의)
function pickSearchFact(meta) {
  const sf = meta && typeof meta === "object" ? meta.search_fact : null;
  if (!sf || typeof sf !== "object") return { services: [], process: [], differentiators: [] };
  const strs = (v) =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];
  const services = Array.isArray(sf.services)
    ? sf.services
        .filter((x) => x && typeof x === "object" && typeof x.name === "string" && x.name.trim())
        .map((x) => ({ name: x.name.trim(), note: typeof x.note === "string" ? x.note.trim() : "" }))
    : [];
  return { services, process: strs(sf.process), differentiators: strs(sf.differentiators) };
}

// ── service role 클라이언트 (서버 전용) ────────────────────────
function serverClient() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  // 오류를 삼키지 않는다(승인 원칙 5). 환경변수명이 다르면 여기서 이름이 드러난다.
  if (!url || !key) {
    throw new Error(
      `PSEO_ENV_MISSING url=${url ? "ok" : "MISSING"} serviceKey=${key ? "ok" : "MISSING"}`
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// [PSEO-HUB-RECENT-POSTS-01] Intent 페이지와 동일 규칙.
//   블로그 홈(글 번호 없음)은 링크로 쓰지 않는다. 실측: id=1914
function isRealPostUrl(u) {
  const s = String(u || "").trim();
  if (!/^https?:\/\//i.test(s)) return false;
  return /\/\d{6,}(\?|#|$)/.test(s);
}

function ymd(v) {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day}`;
}

// ── [PSEO-HUB-PHONE-FALLBACK-02] ─────────────────────────────
//   기존 dialable() 제거. 허브만 다른 규칙을 쓰던 것이 결함의 원인이었다.
//     · dialable 은 자릿수 상한 검증이 없고 "+" 를 남긴다.
//     · visit_info.phone fallback 이 없어 store 12(1522-9939, 유일한 공개 허브)에서
//       전화 CTA 가 통째로 사라졌다 — 같은 업체 Intent 페이지에서는 표시됨.
//   → Intent 페이지와 동일한 lib/pseo/phone.js 의 resolvePhone() 을 공유한다.

export async function getServerSideProps(ctx) {
  const raw = ctx.params?.storeId;

  // bigint 컬럼에 문자열을 던지면 22P02. 라우트 단계에서 정수만 통과시킨다.
  if (!/^[0-9]+$/.test(String(raw || ""))) {
    return { notFound: true };
  }
  const storeId = Number(raw);
  if (!Number.isSafeInteger(storeId) || storeId <= 0) {
    return { notFound: true };
  }

  // [PSEO-STORE1-EXCLUDE-01] store 1 = OWNER 전업종 혼합 테스트 계정.
  //   noindex 는 색인 차단이지 접근 차단이 아니다 → 명시 게이트로 404.
  const EXCLUDED_STORE_IDS = [1];
  if (EXCLUDED_STORE_IDS.includes(storeId)) {
    return { notFound: true };
  }

  let sb;
  try {
    sb = serverClient();
  } catch (e) {
    // 환경변수 누락은 404 로 감추지 않는다. 로컬에서 즉시 보이게 한다.
    throw e;
  }

  const { data, error } = await sb
    .from("store_profiles")
    .select(PUBLIC_FIELDS.join(","))
    .eq("id", storeId)
    .eq("status", "active")
    .not("account_id", "is", null)
    .maybeSingle();

  // SELECT 오류를 notFound 로 삼키면 "왜 안 뜨는지"를 영원히 모른다.
  if (error) {
    throw new Error(`PSEO_STORE_SELECT_FAILED code=${error.code} msg=${error.message}`);
  }
  if (!data) {
    // 없음 / status≠active / account_id null → 전부 404. 사유를 외부에 노출하지 않는다.
    return { notFound: true };
  }

  // ── [V1] 유료 자격 Gate ──────────────────────────────────────
  //   store 조회 성공 이후에 검사한다. 순서를 바꾸면 존재하지 않는 store 와
  //   무자격 store 의 응답 시간이 갈려 존재 여부가 새어나간다.
  //   사유는 서버 로그에만 남기고 응답에는 싣지 않는다.
  const elig = await isPseoEligible(data.account_id);
  if (!elig.ok) {
    console.warn(`[pseo] hub blocked store=${storeId} reason=${elig.reason}`);
    return { notFound: true };
  }

  // ── [PSEO-EMPTY-HUB-01] 허브 최소 글수 Gate ──────────────────
  //   허브 자격 = 유효 PAID + published >= MIN_HUB_POSTS(=1).
  //   Intent 자격(core_keyword cnt>=2)과 완전히 별도다. 두 규칙을 섞지 않는다.
  //   core_keyword 는 이 계산에 개입하지 않는다 — NULL 이어도 글은 글이다.
  //   유료 Gate 이후에 둔다. 순서를 바꾸면 무자격 store 의 글수를 조회하게 된다.
  const hubPosts = await countPublishedPosts(sb, data.account_id);
  if (hubPosts < MIN_HUB_POSTS) {
    console.warn(`[pseo] hub blocked store=${storeId} reason=NO_POSTS count=${hubPosts}`);
    return { notFound: true };
  }

  // ── [V1] 자격 있는 Intent 목록 ───────────────────────────────
  //   cnt>=2 판정은 eligibility.MIN_POSTS 단일 상수.
  const qualified = await listQualifiedIntents(sb, data.account_id, {
    limit: MAX_INTENTS,
  });
  const intents = qualified.map((q) => q.intent);

  // ── [PSEO-HUB-RECENT-POSTS-01] 최근 발행글 ───────────────────
  //   account_id 경유(store_id 불신 1/1809). core_keyword 조건 없음.
  //   조회 오류는 삼키지 않는다 — 빈 목록으로 위장하면 원인을 모른다.
  const { data: recentRows, error: rErr } = await sb
    .from("publish_history")
    .select("id, title, naver_post_url, published_at")
    .eq("account_id", data.account_id)
    .eq("publish_status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(MAX_RECENT);

  if (rErr) {
    throw new Error(`PSEO_HUB_RECENT_FAILED code=${rErr.code} msg=${rErr.message}`);
  }

  const recent = (recentRows || [])
    .map((r) => ({
      id: r.id,
      title: String(r.title || "").trim(),
      url: isRealPostUrl(r.naver_post_url) ? r.naver_post_url : "",
      date: ymd(r.published_at),
    }))
    .filter((p) => p.title);

  // visit_info 도 통째로 넘기지 않는다. 키 화이트리스트 적용.
  const vi = data.visit_info && typeof data.visit_info === "object" ? data.visit_info : {};
  const ind = String(data.industry || "");
  const isField = !hasPhysicalStore(ind) && ind !== "funeral";
  const visit = (isField ? [...VISIT_KEYS, ...FIELD_VISIT_KEYS] : VISIT_KEYS)
    .map(([k, label]) => [label, String(vi[k] || "").trim()])
    .filter(([, v]) => v.length > 0);

  // [PSEO-HUB-PHONE-FALLBACK-02] 전화 해석은 서버에서 끝낸다.
  //   Intent 페이지와 동일한 resolvePhone(). visit_info.phone 원문(문구형)은
  //   여기서 소비하고 버린다 — props 로 나가지 않는다.
  //   VISIT_KEYS 화이트리스트는 손대지 않는다(phone 키는 계속 미포함).
  const resolved = resolvePhone(data.phone, vi.phone);

  // ── [PSEO-LG-FOUNDATION-V1-01] 검색 FACT ─────────────────────
  //   자격 Gate 통과 후에만 조회. 오류는 삼키지 않는다.
  const { data: metaRow, error: mErr } = await sb
    .from("store_profiles")
    .select("meta")
    .eq("id", storeId)
    .maybeSingle();
  if (mErr) {
    throw new Error(`PSEO_HUB_FACT_FAILED code=${mErr.code} msg=${mErr.message}`);
  }
  const sf = pickSearchFact(metaRow && metaRow.meta);
  const fact = {
    services: sf.services,
    process: sf.process,
    differentiators: sf.differentiators,
    preVisit: String(vi.preVisit || "").trim(),
  };

  // [⑦-F] photo_pool → 검증 → public URL(getPublicUrl = 네트워크 호출 없음). path 는 여기서 버린다.
  const pool = Array.isArray(data.photo_pool) ? data.photo_pool : [];
  const prefix = `${data.id}/`;
  const photos = pool
    .map((el) => (el && typeof el === "object" ? el.path : null))
    .filter((p) => typeof p === "string" && p.startsWith(prefix) && PHOTO_FILE.test(p.slice(prefix.length)))
    .slice(0, MAX_PHOTOS)
    .map((p) => sb.storage.from(PHOTO_BUCKET).getPublicUrl(p).data.publicUrl)
    .filter(Boolean);

  const store = {
    id: data.id,
    storeName: data.store_name || "",
    industry: data.industry || "",
    region: data.region || "",
    subRegion: data.sub_region || "",
    address: data.address || "",
    phone: resolved.display,
    tel: resolved.tel,
    smsTel: resolved.smsTel,
    placeUrl: data.naver_place_url || "",
    visit,
    photos,
  };

  // source 라벨: 유입 출처. 개인정보 아님. referer 호스트만 본다.
  const ref = String(ctx.req.headers.referer || "");
  let source = "direct";
  if (/naver\./i.test(ref)) source = "search_naver";
  else if (/google\./i.test(ref)) source = "search_google";
  else if (/youtube\.|youtu\.be/i.test(ref)) source = "shorts";
  else if (ref) source = "referral";

  return { props: { store, fact, intents, recent, source } };
}

export default function StorePublicPage({ store, fact, intents = [], recent = [], source }) {
  const sentRef = useRef(false);
  // [⑦-F-4] 큰 사진에 표시 중인 index. 화면 표시만 — DB 대표사진·순서와 무관. 초기 0 = SSR 출력 동일.
  const [photoSel, setPhotoSel] = useState(0);

  // page_view 1회. StrictMode 이중 실행 방어.
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    track(store.id, "page_view", source);
  }, [store.id, source]);

  // [PSEO-HUB-PHONE-FALLBACK-02] 전화와 문자를 분리 판정한다.
  //   smsTel 은 store_profiles.phone 경로에서만 채워진다. fallback 대표번호
  //   (1522 등)는 SMS 수신이 불가하므로 문자 CTA 를 만들지 않는다.
  const tel = String(store.tel || "");
  const smsTel = String(store.smsTel || "");
  const hasPhone = tel.length >= 8;
  const hasSms = smsTel.length >= 8;
  const hasAddress = String(store.address || "").trim().length > 0;
  const hasPlace = String(store.placeUrl || "").trim().length > 0;

  const mapUrl = hasAddress
    ? `https://map.naver.com/p/search/${encodeURIComponent(store.address)}`
    : "";
  const placeHref = hasPlace
    ? (/^https?:\/\//i.test(store.placeUrl) ? store.placeUrl : `https://${store.placeUrl}`)
    : "";

  const areaLine = [store.region, store.subRegion].filter(Boolean).join(" · ");
  const f = fact || { services: [], process: [], differentiators: [], preVisit: "" };
  const photos = Array.isArray(store.photos) ? store.photos : [];
  const cur = photoSel < photos.length ? photoSel : 0;

  return (
    <>
      <Head>
        <title>{store.storeName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content={`${areaLine ? areaLine + " " : ""}${store.storeName} 연락처와 방문 안내`}
        />
        {/* [PSEO-CANONICAL-FOUNDATION-01] 이 페이지의 정본 주소 고지.
            query string(utm 등)이 붙어도 params 기반이라 값은 불변이다. */}
        <link rel="canonical" href={hubUrl(store.id)} />
      </Head>

      <main className="wrap">
        <header className="head">
          {areaLine ? <p className="area">{areaLine}</p> : null}
          <h1 className="name">{store.storeName}</h1>
          {hasAddress ? <p className="addr">{store.address}</p> : null}
        </header>

        {hasPhone ? (
          <a
            className="call"
            href={`tel:${tel}`}
            onClick={() => track(store.id, "phone_click", source)}
          >
            <span className="callLabel">전화 걸기</span>
            <span className="callNum">{store.phone}</span>
          </a>
        ) : null}

        <nav className="row">
          {hasSms ? (
            <a
              className="chip"
              href={`sms:${smsTel}`}
              onClick={() => track(store.id, "sms_click", source)}
            >
              문자
            </a>
          ) : null}
          {hasAddress ? (
            <a
              className="chip"
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(store.id, "directions_click", source)}
            >
              길찾기
            </a>
          ) : null}
          {hasPlace ? (
            <a
              className="chip"
              href={placeHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track(store.id, "place_click", source)}
            >
              네이버 플레이스
            </a>
          ) : null}
        </nav>

        {/* [P-PAGE-ONE-SCREEN-01 ⑦-F] 업체사진 — 처음엔 [0] 대표 크게 · 썸네일 = 대표 포함 전체. 0장이면 없음. 링크·추적 없음.
            [⑦-F-4] 썸네일 클릭 = 큰 사진 표시만 변경(페이지 이동·DB 변경 없음). */}
        {photos.length > 0 ? (
          <section className="photos">
            <img
              className="photoMain"
              src={photos[cur]}
              alt={cur === 0 ? `${store.storeName} 대표사진` : `${store.storeName} 사진 ${cur + 1}`}
            />
            {photos.length > 1 ? (
              <div className="thumbs">
                {photos.map((u, i) => (
                  <button
                    type="button"
                    className={i === cur ? "thumbBtn on" : "thumbBtn"}
                    key={u}
                    aria-pressed={i === cur}
                    onClick={() => setPhotoSel(i)}
                  >
                    <img
                      className="thumb"
                      src={u}
                      alt={i === 0 ? `${store.storeName} 대표사진` : `${store.storeName} 사진 ${i + 1}`}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {store.visit.length > 0 ? (
          <section className="info">
            {store.visit.map(([label, value]) => (
              <div className="infoRow" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </section>
        ) : null}

        {/* [PSEO-LG-FOUNDATION-V1-01] 업체 검색 FACT — 입력된 블록만. 문장 생성 없음. */}
        {f.services.length > 0 ? (
          <section className="intents">
            <h2 className="h2">제공 서비스</h2>
            <ul className="facts">
              {f.services.map((s, i) => (
                <li className="fact" key={i}>
                  <span className="factName">{s.name}</span>
                  {s.note ? <span className="factNote">{s.note}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {f.process.length > 0 ? (
          <section className="intents">
            <h2 className="h2">진행 순서</h2>
            <ol className="steps">
              {f.process.map((p, i) => (
                <li className="step" key={i}>
                  <span className="stepNo">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {f.differentiators.length > 0 ? (
          <section className="intents">
            <h2 className="h2">이렇게 일합니다</h2>
            <ul className="facts">
              {f.differentiators.map((d, i) => (
                <li className="fact" key={i}>{d}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {f.preVisit ? (
          <section className="intents">
            <h2 className="h2">상담 전 확인사항</h2>
            <p className="factText">{f.preVisit}</p>
          </section>
        ) : null}

        {/* [V1] 자격 있는 Intent 목록. 비어 있으면 섹션 자체가 없다.
            클릭 추적 없음 — pseo_events_cta_type_check 에 해당 타입이 없고
            추가하려면 DDL 이 필요하다(이번 축 제외). */}
        {intents.length > 0 ? (
          <section className="intents">
            <h2 className="h2">이런 내용을 다룹니다</h2>
            <ul className="intentList">
              {intents.map((intent) => (
                <li key={intent}>
                  <Link
                    className="intentRow"
                    href={`/p/${store.id}/${encodeURIComponent(intent)}`}
                  >
                    {intent}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* [PSEO-HUB-RECENT-POSTS-01] 최근 글. 제목·날짜·원문 링크만. 본문 복제 없음. */}
        {recent.length > 0 ? (
          <section className="intents">
            <h2 className="h2">최근 글</h2>
            <ul className="posts">
              {recent.map((p) => (
                <li className="post" key={p.id}>
                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track(store.id, "post_click", source)}
                    >
                      {p.title}
                    </a>
                  ) : (
                    <span className="noLink">{p.title}</span>
                  )}
                  {p.date ? <span className="date">{p.date}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 출처 표기 — CTA 아님. 링크 없음. (지시서 §2·§9) */}
        <footer className="foot">AI-POST로 작성한 페이지입니다</footer>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 30rem;
          margin: 0 auto;
          padding: 2.5rem 1.25rem 3.5rem;
          font-family: "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          color: #23201d;
          -webkit-text-size-adjust: 100%;
        }
        .head {
          margin-bottom: 2rem;
        }
        .area {
          margin: 0 0 0.35rem;
          font-size: 0.875rem;
          color: #857c72;
        }
        .name {
          margin: 0;
          font-size: 1.9rem;
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.02em;
        }
        .addr {
          margin: 0.6rem 0 0;
          font-size: 0.95rem;
          line-height: 1.55;
          color: #5c5550;
        }
        .call {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1.15rem 1.3rem;
          border-radius: 0.6rem;
          background: #1c6b3f;
          color: #fff;
          text-decoration: none;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
        }
        .call:active {
          background: #175934;
        }
        .callLabel {
          font-size: 1.05rem;
          font-weight: 700;
        }
        .callNum {
          font-size: 0.95rem;
          opacity: 0.85;
          white-space: nowrap;
        }
        .row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }
        .chip {
          flex: 1 1 auto;
          min-width: 6rem;
          padding: 0.8rem 0.9rem;
          border: 1px solid #ddd6cd;
          border-radius: 0.5rem;
          background: #fff;
          color: #2f2a26;
          font-size: 0.95rem;
          text-align: center;
          text-decoration: none;
        }
        .chip:active {
          background: #f4f0eb;
        }
        .photos {
          margin: 1.5rem 0 0;
        }
        .photoMain {
          display: block;
          width: 100%;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          border-radius: 0.6rem;
          background: #f0ebe4;
        }
        /* [⑦-F-5] 한 줄 고정 — 폭이 모자라면(모바일 5~6장) 줄바꿈 대신 좌우 스크롤.
           padding 4px = 선택 테두리·포커스 외곽선이 스크롤 영역에 잘리지 않게, 음수 margin 으로 위치 보정. */
        .thumbs {
          display: flex;
          flex-wrap: nowrap;
          gap: 0.4rem;
          overflow-x: auto;
          padding: 4px;
          margin: calc(0.4rem - 4px) -4px 0;
          scrollbar-width: thin;
        }
        .thumbs::-webkit-scrollbar {
          height: 4px;
        }
        .thumbs::-webkit-scrollbar-thumb {
          background: #d8d0c6;
          border-radius: 2px;
        }
        .thumbBtn {
          flex: 0 0 auto;
          display: block;
          padding: 0;
          border: 0;
          background: none;
          border-radius: 0.4rem;
          cursor: pointer;
        }
        .thumbBtn.on .thumb {
          box-shadow: 0 0 0 2px #1c6b3f;
        }
        .thumbBtn:focus-visible {
          outline: 2px solid #1c6b3f;
          outline-offset: 2px;
        }
        .thumb {
          display: block;
          width: 4.5rem;
          height: 3.375rem;
          object-fit: cover;
          border-radius: 0.4rem;
          background: #f0ebe4;
        }
        .info {
          margin: 2.25rem 0 0;
          border-top: 1px solid #e8e2da;
        }
        .infoRow {
          display: flex;
          gap: 1rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid #f0ebe4;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .infoRow dt {
          flex: 0 0 4.5rem;
          margin: 0;
          color: #857c72;
        }
        .infoRow dd {
          margin: 0;
          flex: 1;
        }
        .intents {
          margin: 2.25rem 0 0;
        }
        .h2 {
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #857c72;
          letter-spacing: 0;
        }
        .intentList {
          margin: 0;
          padding: 0;
          list-style: none;
          border-top: 1px solid #e8e2da;
        }
        .intentList li {
          border-bottom: 1px solid #f0ebe4;
        }
        .intentRow {
          display: block;
          padding: 0.9rem 0;
          font-size: 1rem;
          line-height: 1.45;
          color: #23201d;
          text-decoration: none;
        }
        .intentRow:active {
          color: #1c6b3f;
        }
        .posts {
          list-style: none;
          margin: 0;
          padding: 0;
          border-top: 1px solid #e8e2da;
        }
        .post {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.9rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid #f0ebe4;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .post a {
          color: #23201d;
          text-decoration: none;
        }
        .post a:hover {
          text-decoration: underline;
        }
        .noLink {
          color: #857c72;
        }
        .date {
          flex: 0 0 auto;
          font-size: 0.8rem;
          color: #a49a8f;
          white-space: nowrap;
        }
        .facts,
        .steps {
          list-style: none;
          margin: 0;
          padding: 0;
          border-top: 1px solid #e8e2da;
        }
        .fact,
        .step {
          padding: 0.85rem 0;
          border-bottom: 1px solid #f0ebe4;
          font-size: 0.95rem;
          line-height: 1.55;
        }
        .fact {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .factName {
          font-weight: 600;
        }
        .factNote {
          font-size: 0.875rem;
          color: #5c5550;
        }
        .step {
          display: flex;
          gap: 0.75rem;
        }
        .stepNo {
          flex: 0 0 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: #eef4ef;
          color: #1c6b3f;
          font-size: 0.8rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .factText {
          margin: 0;
          padding: 0.85rem 0;
          border-top: 1px solid #e8e2da;
          border-bottom: 1px solid #f0ebe4;
          font-size: 0.95rem;
          line-height: 1.6;
          white-space: pre-line;
        }
        .foot {
          margin-top: 2.5rem;
          font-size: 0.75rem;
          color: #a49a8f;
        }
        a:focus-visible {
          outline: 2px solid #1c6b3f;
          outline-offset: 2px;
        }
      `}</style>
      <style jsx global>{`
        body {
          margin: 0;
          background: #fdfcfa;
        }
      `}</style>
    </>
  );
}

// ── CTA 기록 ──────────────────────────────────────────────────
//   브라우저는 store_id / cta_type / source 만 보낸다.
//   account_id·industry·region 은 서버가 store_profiles 재조회로 채운다(승인 원칙 1·4).
//   keepalive: tel:/sms: 는 페이지를 떠나므로 없으면 요청이 잘린다.
function track(storeId, ctaType, source) {
  try {
    fetch("/api/pseo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_id: storeId, cta_type: ctaType, source }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    /* 기록 실패가 연락 동선을 막지 않는다 */
  }
}
