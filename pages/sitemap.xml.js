// pages/sitemap.xml.js
// ─────────────────────────────────────────────────────────────
// [PSEO-SITEMAP-FOUNDATION-01] pSEO 검색자산 sitemap — 조회 전용.
//
// 이 파일의 정의: "검색엔진이 발견할 수 있는 pSEO 공개 URL 목록"을
//   요청 시점에 파생해서 내보낸다.
//
// ★ 정적 public/sitemap.xml 은 기각됐다.
//   pSEO URL 은 저장하면 안 된다(PSEO-SEARCH-INDEX-BOARD-01 구조 발견).
//   페이지가 SSR 시점 파생물이라 만료·재결제·글삭제 때 저장값과 실제 응답이
//   어긋난다. sitemap 도 같은 이유로 파생물이어야 한다.
//   가입자가 늘면 유료 자격이 생긴 업체가 자동으로 들어오고, 만료되면 빠진다.
//
// ★ 판정 규칙을 복제하지 않는다.
//   isPseoEligible / countPublishedPosts / listQualifiedIntents 를 그대로 호출한다.
//   여기서 subscriptions 나 publish_history 를 직접 읽어 판정하면 규칙이 둘로 갈린다.
//   /admin/pseo/search(검색노출 보드)와 같은 함수를 쓰므로 두 목록은 같아야 한다.
//   ★ 보드 숫자와 sitemap URL 수가 다르면 그 자체가 결함 신호다(보드 = 조기경보).
//
// ★ /api/admin/pseo-list 재호출은 불가하다. 그 API 는 requireOwner 가드 뒤에 있고
//   sitemap 은 크롤러가 익명으로 받는 공개 엔드포인트다.
//
// ★ URL 은 lib/pseo/url.js 단일 파생 지점에서 조립한다.
//   보드·canonical·sitemap 3곳이 같은 함수를 쓴다. 문자열 직접 조립 금지.
//
// ★ lastmod / changefreq / priority 는 넣지 않는다(선장 판정).
//   changefreq·priority 는 신뢰 SoT 자체가 없다.
//   lastmod 후보인 published_at 은 store_profiles 수정·구독 상태 변화를 반영하지
//   못한다. 부정확한 lastmod 는 무가치를 넘어 크롤러 신뢰를 깎는다.
//   정확한 SoT 가 생기면 그때 별도 축으로 연다.
//
// [PSEO-SITEMAP-CACHE-01] s-maxage=3600 (선장 판정 B안).
//   크롤러 요청마다 Supabase 를 왕복시키지 않는다. 현재 규모 기준 약 20왕복이지만
//   가입자 N 에 비례해 늘고, PSEO-INTENT-POSTS-TIMEOUT-01 이 정확히 이 경로에서 났다.
//   자격 변동이 최대 1시간 늦게 반영되지만 실제 페이지의 eligibility Gate 는 그대로라
//   만료 업체가 캐시에 잠깐 남아도 그 URL 은 404 를 준다.
//   ★ 동시성 제한(mapWithLimit)은 이번에 넣지 않는다 — 최적화 두 개를 동시에 넣으면
//     어느 것이 필요했는지 검증이 흐려진다. 규모 증가 시 별도 축.
//
// DDL · migration · RPC · 인덱스 · 신규 env = 전부 0.
// robots.txt 는 이 축에서 건드리지 않는다 — Gate PASS 후 별도 커밋.
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
//   store 1 = OWNER 전업종 혼합 테스트 계정.
const EXCLUDED_STORE_IDS = [1];

// Intent 조회 상한. 보드(pseo-list.js)와 같은 값을 쓴다 —
//   두 목록이 같아야 보드가 조기경보 역할을 할 수 있다.
const INTENT_LIMIT = 500;

// store 조회 상한. 보드와 동일.
const STORE_LIMIT = 500;

// loc 값 방어적 이스케이프.
//   intentUrl 이 encodeURIComponent 를 거치므로 & < > " ' 가 남을 여지는 없지만,
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
  // ── 1) 후보 업체 ─────────────────────────────────────────
  //   보드는 차단 업체도 표시해야 해서 전수를 받았지만, sitemap 은 공개 자산만
  //   필요하다. 명백한 차단 조건은 SQL 에서 걸러 왕복 대상 자체를 줄인다.
  //   (판정 규칙이 아니라 조회 범위다 — eligibility 복제가 아니다.)
  const { data: stores, error: sErr } = await supabaseAdmin
    .from('store_profiles')
    .select('id, account_id')
    .eq('status', 'active')
    .not('account_id', 'is', null)
    .order('id', { ascending: true })
    .limit(STORE_LIMIT);

  // 오류를 빈 sitemap 으로 삼키지 않는다.
  //   빈 목록은 크롤러에게 "가져갈 것이 없다"는 잘못된 신호다. 500 을 주고 재시도받는다.
  if (sErr) {
    throw new Error(`SITEMAP_STORES_FAILED code=${sErr.code} msg=${sErr.message}`);
  }

  // ── 2) 공개 자격 판정 ────────────────────────────────────
  //   순서는 공개 페이지·보드와 같다: 배제 → 유료 자격 → 허브 최소 글수.
  const urls = [];
  for (const s of stores || []) {
    if (EXCLUDED_STORE_IDS.includes(s.id)) continue;

    const elig = await isPseoEligible(s.account_id);
    if (!elig.ok) continue;

    // [PSEO-EMPTY-HUB-01] 허브 최소 글수 Gate. 유료 판정 통과 이후에만 적용한다.
    const posts = await countPublishedPosts(supabaseAdmin, s.account_id);
    if (posts < MIN_HUB_POSTS) continue;

    const hub = hubUrl(s.id);
    if (hub) urls.push(hub);

    // 자격 있는 Intent(core_keyword cnt>=2)만. 미달 Intent 는 페이지 자체가 404다.
    const qualified = await listQualifiedIntents(supabaseAdmin, s.account_id, {
      limit: INTENT_LIMIT,
    });
    for (const item of qualified) {
      const u = intentUrl(s.id, item.intent);
      if (u) urls.push(u);
    }
  }

  // ── 3) XML ───────────────────────────────────────────────
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
