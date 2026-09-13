// pages/sitemap.xml.js
// ─────────────────────────────────────────────────────────────
// [PSEO-SITEMAP-FOUNDATION-01] pSEO 검색자산 sitemap. 요청 시점 파생.
//
// 이 파일의 정의: "검색엔진이 발견해도 되는 공개 URL 목록"을 내보낸다.
//   목록은 성격이 다른 두 축으로 구성된다.
//
//   ① 고객 pSEO URL  — 요청 시점 파생. eligibility 판정 결과가 그대로 목록이 된다.
//   ② 공식 검색자산   — 파생물이 아닌 상수. AI-POST 가 직접 소유·발행하는 페이지.
//
//   ②는 [AI-POST-OFFICIAL-SEARCH-PAGE-01] 에서 추가됐다. 아래 OFFICIAL_URLS 참조.
//   두 축을 한 파일에 두되 섞지 않는다. ①의 파생 루프 안에 ②가 들어가면 안 된다.
//
// ▸ 정적 public/sitemap.xml 은 기각됐다.
//   pSEO URL 을 저장하면 두 벌이 된다(PSEO-SEARCH-INDEX-BOARD-01 구조 발견).
//   페이지가 SSR 시점 파생물이라 만료·재결제 때 저장값과 실제 응답이 갈린다.
//   sitemap 도 같은 이유로 파생물이어야 한다.
//   가입자가 늘면 적격 자격이 생긴 업체가 자동으로 들어오고, 만료되면 빠진다.
//
// ▸ 판정 규칙을 복제하지 않는다.
//   isPseoEligible / countPublishedPosts / listQualifiedIntents 를 그대로 호출한다.
//   여기서 subscriptions·publish_history 를 직접 읽어 판정하면 규칙이 둘로 갈린다.
//   /admin/pseo/search(검색노출 보드)와 같은 함수를 쓰므로 두 목록은 같아야 한다.
//   보드 숫자와 sitemap URL 수가 다르면 그 자체가 결함 신호다(보드 = 조기경보).
//
//   ※ [AI-POST-OFFICIAL-SEARCH-PAGE-01] 이후 이 등식은 보정이 필요하다.
//     비교식:  sitemap <url> 총수 − OFFICIAL_URLS.length  ==  보드 pSEO URL 수
//     공식 검색자산은 보드 집계 대상이 아니다(고객 pSEO 와 SoT 가 다르다).
//     보정 없이 총수만 비교하면 OFFICIAL_URLS.length 만큼 상시 불일치로 오독한다.
//
// ▸ /api/admin/pseo-list 재호출은 불가하다. 그 API 는 requireOwner 가드 뒤에 있고
//   sitemap 은 크롤러가 익명으로 받는 공개 엔드포인트다.
//
// ▸ URL 은 lib/pseo/url.js 단일 파생 지점에서 조립한다.
//   보드·canonical·sitemap 3곳이 같은 함수를 쓴다. 문자열 직접 조립 금지.
//
// ▸ lastmod / changefreq / priority 는 넣지 않는다(선장 판정).
//   changefreq·priority 는 신뢰 SoT 자체가 없다.
//   lastmod 후보인 published_at 은 store_profiles 수정·구독 상태 변화를 반영하지
//   못한다. 부정확한 lastmod 는 무가치를 넘어 크롤러 신뢰를 깎는다.
//   정확한 SoT 가 생기면 그때 별도 축으로 연다.
//
// [PSEO-SITEMAP-CACHE-01] s-maxage=3600 (선장 판정 B안).
//   크롤러 요청마다 Supabase 를 왕복시키지 않는다.
//   자격 변동이 최대 1시간 늦게 반영되지만 실제 페이지는 eligibility Gate 를 그대로
//   타므로 만료 업체가 캐시에 남아 있어도 그 URL 은 404 를 준다.
//
// [PSEO-SITEMAP-COLD-LATENCY-01] store 루프 병렬화 (선장 판정 B안).
//   증상: 콜드 응답 8초대. Naver Search Advisor 가 Status 0(HTTP 응답 없음)으로 실패.
//   원인: Vercel 함수(iad1) ↔ Supabase(ap-northeast-2) 태평양 왕복을,
//         store 1건당 3회씩 순차로 약 50회 반복했다.
//   조치: store 단위 처리를 동시성 6으로 병렬화한다. 동시성 6은
//         PSEO-ADMIN-N1-LATENCY-01 에서 보드가 실사용 중인 값과 같다.
//   범위: 이 파일 1곳. eligibility 함수·url.js·XML 생성·캐시·robots 전부 무변경.
//   ※ 리전 불일치 자체는 INFRA-VERCEL-SUPABASE-REGION-ALIGN-01 로 별도 HOLD.
//     결제 charge-due 가 실제 갱신 검증 전이라 전 함수 리전 이동은 반경이 너무 크다.
//   ※ URL 순서는 store id 오름차순을 유지한다. 병렬 실행이 끝난 뒤 인덱스 순서로
//     합치므로, 실행 순서가 달라져도 출력은 매번 같다. sitemap 이 요청마다
//     뒤섞이면 크롤러 쪽에서 변경으로 오인될 수 있다.
//
// DDL · migration · RPC · 인덱스 · 신규 env = 전부 0.
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin } from '../lib/supabaseAdmin';
import {
  isPseoEligible,
  countPublishedPosts,
  listQualifiedIntents,
  MIN_HUB_POSTS,
} from '../lib/pseo/eligibility';
import { hubUrl, intentUrl } from '../lib/pseo/url';

// 공개 페이지(index.js / [intentSlug].js)·보드와 같은 값.
//   store 1 = OWNER 자사 계정.
const EXCLUDED_STORE_IDS = [1];

// Intent 조회 상한. 보드(pseo-list.js)와 같은 값을 쓴다.
const INTENT_LIMIT = 500;

// store 조회 상한. 보드와 동일.
const STORE_LIMIT = 500;

// [AI-POST-OFFICIAL-SEARCH-PAGE-01] AI-POST 공식 검색자산.
//   파생물이 아니다. store_profiles · subscriptions · publish_history · eligibility
//   어디에도 종속되지 않는다. 그래서 상수다. DB 왕복 증가 = 0.
//
//   자사 계정을 고객 pSEO 에 가짜 업체로 넣는 방식은 기각됐다(선장 판정).
//   EXCLUDED_STORE_IDS = [1] 은 그대로 유지된다. 공식 자산은 이 상수로만 들어온다.
//
//   ▸ 페이지 실체: pages/guide/clinic-blog-marketing.js (정적 렌더, self canonical)
//   ▸ lastmod 는 붙이지 않는다. 위 [PSEO-SITEMAP-FOUNDATION-01] 선장 판정과 동일 원칙.
//     정적 페이지라 published_at 조차 없다. 부정확한 lastmod 는 크롤러 신뢰를 깎는다.
//   ▸ 추가/삭제 시 이 배열만 고친다. 파생 루프는 건드리지 않는다.
const OFFICIAL_URLS = [
  'https://ai-post.ai/guide/clinic-blog-marketing',
];

// [PSEO-SITEMAP-COLD-LATENCY-01] 동시 실행 폭.
//   보드(PSEO-ADMIN-N1-LATENCY-01)가 쓰는 값과 같은 6.
//   올리면 Supabase 동시 부하가 같이 올라간다. 근거 없이 키우지 않는다.
const STORE_CONCURRENCY = 6;

// 입력 배열을 동시성 limit 으로 처리하고, 결과를 입력과 같은 인덱스에 담아 돌려준다.
//   Promise.all(items.map(...)) 은 N 을 한꺼번에 던져 Supabase 를 때린다.
//   여기서는 워커 limit 개가 공유 커서에서 다음 인덱스를 집어가는 방식이다.
async function mapWithLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return out;
}

// loc 값 방어용 이스케이프.
//   intentUrl 이 encodeURIComponent 를 거치므로 & < > " ' 가 남을 여지는 없지만
//   XML 을 만드는 지점에서 이스케이프를 생략하지 않는다.
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function getServerSideProps({ res }) {
  // ── 1) 후보 업체 ───────────────────────────────────────────
  //   보드는 차단 업체도 표시해야 해서 전수를 받지만, sitemap 은 공개 자산만
  //   필요하다. 명백한 차단 조건은 SQL 에서 걸러 왕복 자체를 줄인다.
  //   (판정 규칙이 아니라 조회 범위다. eligibility 복제가 아니다.)
  const { data: stores, error: sErr } = await supabaseAdmin
    .from('store_profiles')
    .select('id, account_id')
    .eq('status', 'active')
    .not('account_id', 'is', null)
    .order('id', { ascending: true })
    .limit(STORE_LIMIT);

  // 오류를 빈 sitemap 으로 삼키지 않는다.
  //   빈 목록은 크롤러에게 "가져갈 것이 없다"는 의미의 신호다. 500 을 주고 재시도받는다.
  if (sErr) {
    throw new Error(`SITEMAP_STORES_FAILED code=${sErr.code} msg=${sErr.message}`);
  }

  // ── 2) 공개 자격 판정 ──────────────────────────────────────
  //   판정 순서는 공개 페이지·보드와 같다: 배제 → 유료 자격 → 발행 최소 기준.
  //   [PSEO-SITEMAP-COLD-LATENCY-01] store 단위로 병렬 실행한다.
  //     한 store 안에서는 여전히 순차다(자격 미달이면 뒤 조회를 하지 않기 위함).
  const candidates = (stores || []).filter((s) => !EXCLUDED_STORE_IDS.includes(s.id));

  const perStore = await mapWithLimit(candidates, STORE_CONCURRENCY, async (s) => {
    const elig = await isPseoEligible(s.account_id);
    if (!elig.ok) return [];

    // [PSEO-EMPTY-HUB-01] 발행 최소 기준 Gate. 유료 자격 통과 이후에만 적용한다.
    const posts = await countPublishedPosts(supabaseAdmin, s.account_id);
    if (posts < MIN_HUB_POSTS) return [];

    const list = [];

    const hub = hubUrl(s.id);
    if (hub) list.push(hub);

    // 자격 있는 Intent(core_keyword cnt>=2)만. 미달 Intent 는 페이지 자체가 404다.
    const qualified = await listQualifiedIntents(supabaseAdmin, s.account_id, {
      limit: INTENT_LIMIT,
    });
    for (const item of qualified) {
      const u = intentUrl(s.id, item.intent);
      if (u) list.push(u);
    }

    return list;
  });

  // store id 오름차순 그대로 이어 붙인다. 병렬 완료 순서와 무관하게 출력이 고정된다.
  const urls = [];
  for (const list of perStore) {
    for (const u of list || []) urls.push(u);
  }

  // [AI-POST-OFFICIAL-SEARCH-PAGE-01] 공식 검색자산은 파생 루프가 끝난 뒤 붙인다.
  //   ▸ mapWithLimit · eligibility · 캐시 헤더 전부 무접촉.
  //   ▸ 고객 pSEO URL 뒤에 고정 위치로 들어간다. 출력 순서는 매 요청 동일하다.
  //   ▸ stores 조회가 실패하면 위에서 이미 throw 다. 즉 공식 URL 만 담긴 sitemap 은
  //     나가지 않는다. 부분 성공을 정상 응답으로 위장하지 않는다.
  urls.push(...OFFICIAL_URLS);

  // ── 3) XML ────────────────────────────────────────────────
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n') +
    (urls.length ? '\n' : '') +
    '</urlset>\n';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.write(body);
  res.end();

  return { props: {} };
}

// getServerSideProps 가 응답을 직접 끝내므로 이 컴포넌트는 렌더되지 않는다.
export default function Sitemap() {
  return null;
}
