// pages/p/[storeId]/[intentSlug].js
// ─────────────────────────────────────────────────────────────
// [PSEO-B2-ROUTING-01] Gate B-2a — 검색의도(Intent) 페이지 1장.
// [PSEO-B2b-CONTACT-CONTENT-01] Gate B-2b — 연락 결정 정보 3블록 추가.
//
// URL: /p/{storeId}/{encodeURIComponent(core_keyword)}
//   예) /p/8/공릉동%20법무사
//
// 확정 계약 (승인분):
//   · Intent SoT       = publish_history.core_keyword (생성시점 확정·역산 금지)
//   · 귀속             = publish_history.account_id → store_profiles.account_id → id
//   · 생성 자격        = 동일 account_id + 동일 core_keyword COUNT >= 2
//   · robots           = noindex, nofollow 유지 (B-2b PASS 전 해제 금지)
//   · canonical        = 자기 자신
//   · publish_history.store_id 백필 금지 / 신규 DDL 금지 / Blog Core 수정 금지
//
// 실측 근거:
//   · publish_history.store_id = 1/1809 (사실상 미사용) → account_id 경유가 유일 경로
//   · account ↔ store 1:1 확정 (다중 store 계정 0행)
//   · publish_status ∈ {published, baseline}. baseline 은 naver_post_url null → 반드시 제외
//   · naver_post_url 이 블로그 홈(글 번호 없음)인 행 존재(id=1914) → 링크 유효성 검사 필요
//   · store_profiles RLS = service_role only → SSR + service role 강제
//
// B-2b 실측 근거 (2026-09-09):
//   · photo_pool / treatments / real_menu / faq = 17행 전부 [] → 소재 없음. 사용 불가.
//   · business_hours / closed_days / specialty 컬럼 = 전 NULL 죽은 컬럼.
//     실제 영업시간·휴무·주차·교통은 visit_info(jsonb) 내부에 있다. 컬럼명으로 찾으면 실패한다.
//   · visit_info 보유 9/17. 키 39종이며 업종마다 집합이 다르다
//     (legal=closedDays / ortho=satHours / funeral=funeralHalls·dispatch24 …).
//     → 업종 분기 금지. 라벨 사전에 등록된 키 중 값이 있는 것만 렌더한다.
//   · price·walkIn·sameDay 등 8종은 키만 있고 값 0건 → 빈 값 스킵으로 자동 소멸.
//
// 절대 금지:
//   ★ content / text_markdown 미사용.
//     본문에 "📷 사진: … (업로드 후 이 줄 삭제)" 플레이스홀더와 전화·주소가 박혀 있다.
//     공개 시 (1) 네이버 원문과 중복 콘텐츠 (2) 미편집 흔적 노출.
//     Intent 페이지는 "목록 + 연락"이다. 본문 복제가 아니다.
//   ★ props 화이트리스트 유지. store_profiles 통째 전달 금지.
//   ★ visit_info 도 통째 전달 금지. 서버에서 사전 필터 후 {label, val} 만 넘긴다.
//     사전 미등록 키는 렌더하지 않는다(내부 키 노출 차단).
// ─────────────────────────────────────────────────────────────

import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// 허브(index.js)와 동일 화이트리스트. 유지보수 시 양쪽을 함께 본다.
const PUBLIC_FIELDS = [
  "id",
  "account_id",
  "store_name",
  "industry",
  "region",
  "sub_region",
  "address",
  "phone",
  "naver_place_url",
  "visit_info", // [B-2b] 서버에서 사전 필터 후 일부만 props 로 나간다
];

// Intent 생성 자격 하한 (승인분: cnt >= 2)
const MIN_POSTS = 2;

// 목록에 표시할 최대 글 수. thin/과다 양쪽 방지.
const MAX_LIST = 12;

// ── [B-2b] visit_info 라벨 사전 ───────────────────────────────
// 여기 없는 키는 화면에 나오지 않는다. 값이 비면 행 자체가 사라진다.
// 배열 순서 = 화면 표시 순서. 업종 분기 없음.
// visit_info.phone 은 의도적으로 제외 — 전화는 상단 CTA 가 담당한다.

const VISIT_HOURS = [
  ["businessHours", "영업시간"],
  ["lunchHours", "점심시간"],
  ["breakTime", "브레이크타임"],
  ["satHours", "토요일"],
  ["holidayHours", "공휴일"],
  ["nightHours", "야간"],
  ["nightWeekend", "야간·주말"],
  ["lastOrder", "라스트오더"],
  ["closedDays", "휴무일"],
];

const VISIT_ACCESS = [
  ["parkingOps", "주차"],
  ["transit", "오시는 길"],
  ["seats", "좌석"],
  ["groupSeats", "단체석"],
  ["waiting", "대기"],
  ["pet", "반려동물"],
];

const VISIT_TERMS = [
  ["reservation", "예약"],
  ["walkIn", "예약 없이 방문"],
  ["sameDay", "당일 가능"],
  ["firstConsult", "첫 상담"],
  ["phoneConsult", "전화 상담"],
  ["visitConsult", "방문 상담"],
  ["consult24", "24시간 상담"],
  ["dispatch24", "24시간 출동"],
  ["receive365", "365일 접수"],
  ["urgent", "긴급 대응"],
  ["reception", "접수"],
  ["director", "담당"],
  ["funeralHalls", "빈소"],
  ["funeralProducts", "장례 상품"],
  ["repMenu", "대표 메뉴"],
  ["examPrep", "검사 전 준비"],
  ["firstVisit", "첫 방문"],
  ["guardian", "보호자"],
  ["serviceArea", "서비스 지역"],
  ["nationwide", "전국"],
  ["partnerBranch", "제휴 지점"],
  ["price", "비용"],
  ["etc", "안내"],
];

// 값 정규화. 문자열/숫자/문자열배열만 통과. 객체·중첩은 버린다.
function visitValue(v) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    const parts = v
      .map((x) =>
        typeof x === "string" || typeof x === "number" ? String(x).trim() : ""
      )
      .filter(Boolean);
    return parts.join(" · ").slice(0, 200).trim();
  }
  if (typeof v === "object") return "";
  return String(v).trim().slice(0, 200);
}

// 사전 순회 → 값 있는 항목만 [{label, val}]. 미등록 키는 애초에 보지 않는다.
function pickVisit(vi, dict) {
  if (!vi || typeof vi !== "object" || Array.isArray(vi)) return [];
  const out = [];
  for (const [k, label] of dict) {
    const val = visitValue(vi[k]);
    if (val) out.push({ label, val });
  }
  return out;
}

function serverClient() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!url || !key) {
    throw new Error(
      `PSEO_ENV_MISSING url=${url ? "ok" : "MISSING"} serviceKey=${key ? "ok" : "MISSING"}`
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function dialable(phone) {
  return String(phone || "").replace(/[^0-9+]/g, "");
}

// ── [PSEO-PHONE-FALLBACK-01] ─────────────────────────────────
// 실측: visit_info.phone 은 번호 필드가 아니라 자유 텍스트다.
//   "1522-9939"(번호) / "직통 : 010-4277-2345"(접두어+번호)
//   "전화문의 후 ,내원" / "상담문의는 전화로만 가능합니다"(문구) / ""(빈값)
// → 원문을 그대로 tel: 이나 화면에 쓰지 않는다. 유효 번호만 추출해 쓴다.

// 숫자 8자리 이상일 때만 번호로 인정. 문구형은 여기서 전부 탈락한다.
function extractTel(raw) {
  const d = String(raw || "").replace(/[^0-9]/g, "");
  if (d.length < 8 || d.length > 12) return "";
  return d;
}

// 표시용 하이픈. 접두어·안내문구는 이미 제거된 숫자만 들어온다.
function formatTel(d) {
  const s = String(d || "");
  if (/^02\d{7,8}$/.test(s)) return `02-${s.slice(2, -4)}-${s.slice(-4)}`;
  if (/^1[5678]\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
  if (/^0\d{9,10}$/.test(s)) return `${s.slice(0, 3)}-${s.slice(3, -4)}-${s.slice(-4)}`;
  return s;
}

// 전화와 문자를 분리해서 해석한다.
//   전화 : store_profiles.phone 우선 → 없으면 visit_info.phone 에서 유효 번호 추출
//   문자 : store_profiles.phone 전용. 대표번호(1522 등)는 SMS 수신이 불가하므로
//          fallback 경로에서는 문자 CTA 를 만들지 않는다.
function resolvePhone(colPhone, visitPhoneRaw) {
  const col = extractTel(colPhone);
  if (col) {
    return {
      tel: col,
      smsTel: col,
      display: String(colPhone || "").trim() || formatTel(col),
    };
  }
  const fb = extractTel(visitPhoneRaw);
  if (fb) return { tel: fb, smsTel: "", display: formatTel(fb) };
  return { tel: "", smsTel: "", display: "" };
}

// 실제 "글" URL 인지 검사. 블로그 홈(글 번호 없음)은 링크로 쓰지 않는다.
//   실측: id=1914 naver_post_url = https://blog.naver.com/aeang71  ← 글이 아님
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

export async function getServerSideProps(ctx) {
  const rawId = ctx.params?.storeId;
  if (!/^[0-9]+$/.test(String(rawId || ""))) return { notFound: true };
  const storeId = Number(rawId);
  if (!Number.isSafeInteger(storeId) || storeId <= 0) return { notFound: true };

  // Next 가 이미 디코딩해서 넘긴다. 빈 값·과길이는 차단.
  const intent = String(ctx.params?.intentSlug || "").trim();
  if (!intent || intent.length > 60) return { notFound: true };

  const sb = serverClient();

  // ── 1) 업체 ─────────────────────────────────────────────
  const { data: store, error: sErr } = await sb
    .from("store_profiles")
    .select(PUBLIC_FIELDS.join(","))
    .eq("id", storeId)
    .eq("status", "active")
    .not("account_id", "is", null)
    .maybeSingle();

  if (sErr) {
    throw new Error(`PSEO_STORE_SELECT_FAILED code=${sErr.code} msg=${sErr.message}`);
  }
  if (!store) return { notFound: true };

  // ── 2) 해당 Intent 의 발행글 ────────────────────────────
  //   account_id 경유. store_id 는 신뢰하지 않는다(1/1809).
  const { data: rows, error: pErr } = await sb
    .from("publish_history")
    .select("id, title, naver_post_url, published_at, treatment_name, publish_status")
    .eq("account_id", store.account_id)
    .eq("core_keyword", intent)
    .eq("publish_status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(60);

  if (pErr) {
    throw new Error(`PSEO_POSTS_SELECT_FAILED code=${pErr.code} msg=${pErr.message}`);
  }

  const all = Array.isArray(rows) ? rows : [];

  // 생성 자격 게이트. 하한 미달 Intent 는 페이지 자체가 존재하지 않는다.
  if (all.length < MIN_POSTS) return { notFound: true };

  const posts = all.slice(0, MAX_LIST).map((r) => ({
    id: r.id,
    title: String(r.title || "").trim(),
    url: isRealPostUrl(r.naver_post_url) ? r.naver_post_url : "",
    date: ymd(r.published_at),
    topic: String(r.treatment_name || "").trim(),
  }));

  // 다룬 주제 = treatment_name 중복 제거. 이 Intent 안에서 어떤 일을 하는지의 축.
  const topics = [];
  for (const p of posts) {
    if (p.topic && !topics.includes(p.topic)) topics.push(p.topic);
  }

  // 같은 업체의 다른 Intent (허브 대신 옆으로 가는 통로). 자격 하한 동일 적용.
  const { data: sib } = await sb
    .from("publish_history")
    .select("core_keyword")
    .eq("account_id", store.account_id)
    .eq("publish_status", "published")
    .is("deleted_at", null)
    .not("core_keyword", "is", null)
    .limit(500);

  const cnt = new Map();
  for (const r of sib || []) {
    const k = String(r.core_keyword || "").trim();
    if (!k || k === intent) continue;
    cnt.set(k, (cnt.get(k) || 0) + 1);
  }
  const siblings = [...cnt.entries()]
    .filter(([, c]) => c >= MIN_POSTS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  // ── 3) [B-2b] 연락 결정 정보 ────────────────────────────
  //   visit_info 원본은 props 로 나가지 않는다. 사전 통과분만 나간다.
  const vi = store.visit_info;
  const hours = pickVisit(vi, VISIT_HOURS);
  const access = pickVisit(vi, VISIT_ACCESS);
  const terms = pickVisit(vi, VISIT_TERMS);

  // [PSEO-PHONE-FALLBACK-01] 전화/문자 분리 해석. visit_info 원문은 여기서 소비하고 버린다.
  const resolved = resolvePhone(store.phone, vi && typeof vi === "object" ? vi.phone : "");

  const ref = String(ctx.req.headers.referer || "");
  let source = "direct";
  if (/naver\./i.test(ref)) source = "search_naver";
  else if (/google\./i.test(ref)) source = "search_google";
  else if (/youtube\.|youtu\.be/i.test(ref)) source = "shorts";
  else if (ref) source = "referral";

  return {
    props: {
      store: {
        id: store.id,
        storeName: store.store_name || "",
        region: store.region || "",
        subRegion: store.sub_region || "",
        address: store.address || "",
        // [PSEO-PHONE-FALLBACK-01] 원문 문구는 props 로 나가지 않는다.
        phone: resolved.display,
        tel: resolved.tel,
        smsTel: resolved.smsTel,
        placeUrl: store.naver_place_url || "",
      },
      intent,
      posts,
      topics,
      siblings,
      hours,
      access,
      terms,
      source,
    },
  };
}

// [B-2b] 사전 통과분만 받는 표시 전용 블록. 빈 배열이면 렌더 안 함.
function InfoBlock({ title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="block">
      <h2 className="h2">{title}</h2>
      <dl className="info">
        {items.map((it) => (
          <div className="infoRow" key={it.label}>
            <dt className="infoK">{it.label}</dt>
            <dd className="infoV">{it.val}</dd>
          </div>
        ))}
      </dl>
      <style jsx>{`
        .block { margin-top: 2.25rem; }
        .h2 {
          margin: 0 0 0.75rem; font-size: 0.8rem; font-weight: 600;
          color: #857c72; letter-spacing: 0.02em;
        }
        .info { margin: 0; padding: 0; border-top: 1px solid #e8e2da; }
        .infoRow {
          display: flex; align-items: baseline; gap: 0.9rem;
          padding: 0.7rem 0; border-bottom: 1px solid #f0ebe4;
        }
        .infoK {
          flex: 0 0 5.5rem; margin: 0; font-size: 0.85rem;
          color: #857c72; white-space: nowrap;
        }
        .infoV {
          flex: 1 1 auto; margin: 0; font-size: 0.95rem;
          line-height: 1.55; color: #23201d; word-break: keep-all;
        }
      `}</style>
    </section>
  );
}

export default function IntentPage({
  store, intent, posts, topics, siblings, hours, access, terms, source,
}) {
  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    track(store.id, "page_view", source);
  }, [store.id, source]);

  // [PSEO-PHONE-FALLBACK-01] 전화와 문자는 별개 조건이다.
  const tel = dialable(store.tel);
  const smsTel = dialable(store.smsTel);
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

  const hubHref = `/p/${store.id}`;

  return (
    <>
      <Head>
        <title>{`${intent} · ${store.storeName}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* B-2b PASS 전까지 색인 차단 유지. 해제는 별도 승인 사항. */}
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`${intent} 관련 안내와 연락처 · ${store.storeName}`} />
      </Head>

      <main className="wrap">
        <header className="head">
          <h1 className="intent">{intent}</h1>
          <p className="store">
            <Link href={hubHref} className="storeLink">{store.storeName}</Link>
          </p>
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
            <a className="chip" href={`sms:${smsTel}`}
              onClick={() => track(store.id, "sms_click", source)}>문자</a>
          ) : null}
          {hasAddress ? (
            <a className="chip" href={mapUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => track(store.id, "directions_click", source)}>길찾기</a>
          ) : null}
          {hasPlace ? (
            <a className="chip" href={placeHref} target="_blank" rel="noopener noreferrer"
              onClick={() => track(store.id, "place_click", source)}>네이버 플레이스</a>
          ) : null}
        </nav>

        {/* [B-2b] ③ 연락 가능 시간 — "지금 전화해도 되나" */}
        <InfoBlock title="연락 가능 시간" items={hours} />

        {topics.length > 0 ? (
          <section className="block">
            <h2 className="h2">다루는 일</h2>
            <ul className="tags">
              {topics.map((t) => <li className="tag" key={t}>{t}</li>)}
            </ul>
          </section>
        ) : null}

        {/* [B-2b] ⑤ 업종 특이 조건 — 예약·긴급·24시간 등 전환 직결 */}
        <InfoBlock title="이용 안내" items={terms} />

        {/* [B-2b] ④ 찾아오는 조건 — 방문형 결정 요인 */}
        <InfoBlock title="방문 안내" items={access} />

        <section className="block">
          <h2 className="h2">관련 글</h2>
          <ul className="posts">
            {posts.map((p) => (
              <li className="post" key={p.id}>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => track(store.id, "post_click", source)}>{p.title}</a>
                ) : (
                  <span className="noLink">{p.title}</span>
                )}
                {p.date ? <span className="date">{p.date}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        {siblings.length > 0 ? (
          <section className="block">
            <h2 className="h2">다른 문의</h2>
            <ul className="tags">
              {siblings.map((s) => (
                <li className="tag" key={s}>
                  <Link href={`/p/${store.id}/${encodeURIComponent(s)}`}>{s}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="foot">
          <Link href={hubHref}>← {store.storeName} 전체 안내</Link>
          <span className="src">AI-POST로 작성한 페이지입니다</span>
        </footer>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 30rem; margin: 0 auto; padding: 2.5rem 1.25rem 3.5rem;
          font-family: "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif;
          color: #23201d; -webkit-text-size-adjust: 100%;
        }
        .head { margin-bottom: 1.75rem; }
        .intent { margin: 0; font-size: 1.75rem; font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; }
        .store { margin: 0.55rem 0 0; font-size: 0.95rem; }
        .storeLink { color: #1c6b3f; text-decoration: none; font-weight: 600; }
        .addr { margin: 0.4rem 0 0; font-size: 0.9rem; line-height: 1.55; color: #5c5550; }
        .call {
          display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem;
          padding: 1.15rem 1.3rem; border-radius: 0.6rem; background: #1c6b3f; color: #fff;
          text-decoration: none; box-shadow: 0 1px 0 rgba(0,0,0,.12);
        }
        .call:active { background: #175934; }
        .callLabel { font-size: 1.05rem; font-weight: 700; }
        .callNum { font-size: 0.95rem; opacity: 0.85; white-space: nowrap; }
        .row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
        .chip {
          flex: 1 1 auto; min-width: 6rem; padding: 0.8rem 0.9rem;
          border: 1px solid #ddd6cd; border-radius: 0.5rem; background: #fff;
          color: #2f2a26; font-size: 0.95rem; text-align: center; text-decoration: none;
        }
        .chip:active { background: #f4f0eb; }
        .block { margin-top: 2.25rem; }
        .h2 { margin: 0 0 0.75rem; font-size: 0.8rem; font-weight: 600; color: #857c72; letter-spacing: 0.02em; }
        .tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .tag {
          padding: 0.35rem 0.7rem; border: 1px solid #e8e2da; border-radius: 999px;
          background: #fbf9f6; font-size: 0.875rem; color: #4a443f;
        }
        .tag :global(a) { color: inherit; text-decoration: none; }
        .posts { list-style: none; margin: 0; padding: 0; border-top: 1px solid #e8e2da; }
        .post {
          display: flex; align-items: baseline; justify-content: space-between; gap: 0.9rem;
          padding: 0.85rem 0; border-bottom: 1px solid #f0ebe4; font-size: 0.95rem; line-height: 1.5;
        }
        .post a { color: #23201d; text-decoration: none; }
        .post a:hover { text-decoration: underline; }
        .noLink { color: #857c72; }
        .date { flex: 0 0 auto; font-size: 0.8rem; color: #a49a8f; white-space: nowrap; }
        .foot { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.8rem; }
        .foot :global(a) { color: #1c6b3f; text-decoration: none; }
        .src { color: #a49a8f; font-size: 0.75rem; }
        a:focus-visible { outline: 2px solid #1c6b3f; outline-offset: 2px; }
      `}</style>
      <style jsx global>{`
        body { margin: 0; background: #fdfcfa; }
      `}</style>
    </>
  );
}

// 허브와 동일 계약: store_id / cta_type / source 3개만 전송.
// account_id·industry·region 은 서버가 store_profiles 재조회로 채운다.
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
