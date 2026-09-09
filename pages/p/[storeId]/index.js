// pages/p/[storeId].js
// ─────────────────────────────────────────────────────────────
// [PSEO-V0-CONTACT-FIRST-DESIGN-01] Gate A — 업체 공개 페이지 1장.
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
// 절대 원칙 (승인분):
//   ★ service role 은 getServerSideProps 안에서만. 브라우저 번들 유입 금지.
//   ★ props 에 store 전체 객체 전달 금지. 아래 PUBLIC_FIELDS 화이트리스트만.
//     (service role 은 전 컬럼 접근권 → 통째 전달 시 notes/meta 가 HTML 에 박힌다)
//   ★ 엔진·결제·관측 SoT 무접촉. 이 파일은 신규이며 기존 파일을 import 하지 않는다.
//
// Gate A 한정:
//   ★ noindex 고정. 색인·검색노출은 Gate A 범위 밖(지시서 §7 DOGFOOD 이전).
//     Gate B 승인 시 이 메타 1줄만 제거한다.
// ─────────────────────────────────────────────────────────────

import Head from "next/head";
import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── 브라우저로 내보낼 컬럼 화이트리스트 ────────────────────────
//   여기 없는 컬럼은 HTML 에 절대 나가지 않는다.
//   제외 확정: notes / meta / blog_account / treatments / real_menu /
//             photo_pool / faq / homepage_url / blog_url
//   · notes·meta        = 내부 운영 메모
//   · homepage_url·blog_url = 레거시 중복컬럼. Store.js 가 쓰지 않으므로
//     사용자가 수정할 수 없는 유령값이다. 읽지 않는다.
const PUBLIC_FIELDS = [
  "id",
  "store_name",
  "industry",
  "region",
  "sub_region",
  "address",
  "phone",
  "naver_place_url",
  "visit_info",
];

// visit_info(jsonb) 중 공개 대상 키. Store.js 실측 키만.
const VISIT_KEYS = [
  ["businessHours", "영업시간"],
  ["closedDays", "휴무"],
  ["parkingOps", "주차"],
  ["reservation", "예약"],
];

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

// 전화번호 → tel:/sms: 용. 숫자와 + 만 남긴다.
function dialable(phone) {
  return String(phone || "").replace(/[^0-9+]/g, "");
}

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

  // visit_info 도 통째로 넘기지 않는다. 키 화이트리스트 적용.
  const vi = data.visit_info && typeof data.visit_info === "object" ? data.visit_info : {};
  const visit = VISIT_KEYS
    .map(([k, label]) => [label, String(vi[k] || "").trim()])
    .filter(([, v]) => v.length > 0);

  const store = {
    id: data.id,
    storeName: data.store_name || "",
    industry: data.industry || "",
    region: data.region || "",
    subRegion: data.sub_region || "",
    address: data.address || "",
    phone: data.phone || "",
    placeUrl: data.naver_place_url || "",
    visit,
  };

  // source 라벨: 유입 출처. 개인정보 아님. referer 호스트만 본다.
  const ref = String(ctx.req.headers.referer || "");
  let source = "direct";
  if (/naver\./i.test(ref)) source = "search_naver";
  else if (/google\./i.test(ref)) source = "search_google";
  else if (/youtube\.|youtu\.be/i.test(ref)) source = "shorts";
  else if (ref) source = "referral";

  return { props: { store, source } };
}

export default function StorePublicPage({ store, source }) {
  const sentRef = useRef(false);

  // page_view 1회. StrictMode 이중 실행 방어.
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    track(store.id, "page_view", source);
  }, [store.id, source]);

  const tel = dialable(store.phone);
  const hasPhone = tel.length >= 8;
  const hasAddress = String(store.address || "").trim().length > 0;
  const hasPlace = String(store.placeUrl || "").trim().length > 0;

  const mapUrl = hasAddress
    ? `https://map.naver.com/p/search/${encodeURIComponent(store.address)}`
    : "";
  const placeHref = hasPlace
    ? (/^https?:\/\//i.test(store.placeUrl) ? store.placeUrl : `https://${store.placeUrl}`)
    : "";

  const areaLine = [store.region, store.subRegion].filter(Boolean).join(" · ");

  return (
    <>
      <Head>
        <title>{store.storeName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Gate A 한정 — 색인 차단. Gate B 승인 시 이 줄만 제거. */}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={`${areaLine ? areaLine + " " : ""}${store.storeName} 연락처와 방문 안내`}
        />
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
          {hasPhone ? (
            <a
              className="chip"
              href={`sms:${tel}`}
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
