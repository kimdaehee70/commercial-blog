// pages/api/observer/enqueue.js
// 옵저버 v1 — published 글 1건의 노린 키워드(full_keyword) 1개를 검색,
// 상위 10개 경쟁환경(competitor_env) + 내 글 생존(survival_log) 수집.
//
// 설계 확정 (인수인계 v126 + v127 세션):
//  - 트리거: published (URL 등록 직후, 호출부에서 fire-and-forget)
//  - 훅:     B — publish.js 무수정. 이 전용 API만 호출.
//  - 단위:   C — 글당 키워드 1개(full_keyword), 1검색.
//  - 경로:   HTML 스크래핑 v1.
//  - 캐시:   keyword+industry+rank_basis 24h. 동일 키워드 재검색 금지.
//  - 격리:   industry 컬럼으로 업종별 격리 저장.
//  - 발행 영향 0: 모든 실패 흡수. 200/204 외 발행 흐름에 역류 금지.
//
// FREEZE: publish.js / generate*.js / publish_history 무수정.
//
// ⚠ 배포 전 실측(버그1 점검): 아래 createClient의 URL 변수명이 .env.local 실제 키와
//   일치하는지 확인. DB_ENV 규칙상 키는 sb_publishable_/sb_secret_ 체계.
//   SUPABASE URL 변수명(NEXT_PUBLIC_SUPABASE_URL 등)을 cat .env.local로 실측 후 일치 확정.
//   불일치 시 createClient가 undefined URL로 생성 → 첫 쿼리에서 throw(단 try가 흡수, 발행영향0).

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CACHE_HOURS = 24;        // §5-1 쓰로틀
const RANK_BASIS = 'relevance'; // DB DEFAULT와 일치(관련도순). 추후 최신/후기 확장.

export default async function handler(req, res) {
  // 옵저버는 절대 발행을 막지 않는다. 입력 문제도 조용히 종료.
  if (req.method !== 'POST') return res.status(405).end();

  const { publish_id } = req.body || {};
  if (!publish_id) return res.status(204).end();

  try {
    // 1) published 글 메타 읽기 (publish_history 읽기 전용)
    const { data: post, error: postErr } = await supabase
      .from('publish_history')
      .select('id, full_keyword, active_keyword, keyword, industry, region, naver_post_url, publish_status')
      .eq('id', publish_id)
      .single();

    if (postErr || !post) return res.status(204).end();
    if (post.publish_status !== 'published') return res.status(204).end();
    if (!post.naver_post_url) return res.status(204).end();

    // 검색 키워드: full_keyword → active_keyword → keyword 폴백
    const keyword = (post.full_keyword || post.active_keyword || post.keyword || '').trim();
    if (!keyword) return res.status(204).end();

    const industry = post.industry || null;
    const region = post.region || null;

    // 2) 24h 캐시 체크 (keyword + industry + region + rank_basis 단위)
    //    region 포함 이유: full_keyword 폴백이 keyword(region 미포함)까지 내려갈 때
    //    같은 키워드가 다른 지역 top10을 잘못 재사용하는 지역혼입 방지.
    const since = new Date(Date.now() - CACHE_HOURS * 3600 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('competitor_env')
      .select('id')
      .eq('keyword', keyword)
      .eq('industry', industry)
      .eq('region', region)
      .eq('rank_basis', RANK_BASIS)
      .gte('collected_at', since)
      .limit(1);

    const cacheHit = cached && cached.length > 0;

    // 3) 상위 10개 수집 (캐시 MISS일 때만 검색)
    let top10 = null;
    if (!cacheHit) {
      top10 = await scrapeNaverTop10(keyword);   // HTML 스크래핑 v1
      if (top10 && top10.length) {
        await supabase.from('competitor_env').insert({
          keyword,
          industry,
          region,
          rank_basis: RANK_BASIS,
          top10,                       // jsonb
          // collected_at = DEFAULT now()
        });
      }
    } else {
      // 캐시 HIT: 재검색 금지. 가장 최근 스냅샷 top10 재사용(내 순위 판정용)
      // ⚠ .single() 금지 — 동일 키 24h 내 2행 이상이면 single은 에러 반환 →
      //   top10 null → is_alive 오판정(false). limit(1) 후 [0]으로 안전 추출.
      const { data: latestRows } = await supabase
        .from('competitor_env')
        .select('top10')
        .eq('keyword', keyword)
        .eq('industry', industry)
        .eq('region', region)
        .eq('rank_basis', RANK_BASIS)
        .order('collected_at', { ascending: false })
        .limit(1);
      top10 = (latestRows && latestRows[0] && latestRows[0].top10) || null;
    }

    // 4) survival_log — 내 글이 그 자리에서 살아있나
    const { relRank, isAlive } = locateMyPost(top10, post.naver_post_url);
    await supabase.from('survival_log').insert({
      publish_id: post.id,
      rel_rank: relRank,             // null = 10위 밖/미발견
      is_alive: isAlive,             // top10 내 존재 여부
      fossil_flag: false,            // 추이 누적 후 관측방이 판정 (v1은 false 고정)
      rank_basis: RANK_BASIS,
      note: cacheHit ? 'cache_hit' : 'fresh',
      // observed_at = DEFAULT now()
    });

    return res.status(200).json({ ok: true, keyword, cacheHit, relRank, isAlive });
  } catch (e) {
    // 발행 영향 0. 조용히 삼킨다.
    console.error('[observer/enqueue]', e?.message || e);
    return res.status(204).end();
  }
}

// 내 post URL이 top10 중 몇 위인지
// 네이버 블로그 URL은 blogId + logNo가 글 식별자. 파라미터·도메인 변형(m.blog/blog,
// PostView.naver?blogId=..&logNo=.., /blogId/logNo)에 내성 있도록 두 값으로 비교.
function locateMyPost(top10, myUrl) {
  if (!Array.isArray(top10) || !myUrl) return { relRank: null, isAlive: false };
  const mine = parseBlogRef(myUrl);
  if (!mine) return { relRank: null, isAlive: false };
  const idx = top10.findIndex((it) => {
    const r = parseBlogRef(it?.url);
    return r && r.blogId === mine.blogId && r.logNo === mine.logNo;
  });
  if (idx < 0) return { relRank: null, isAlive: false };
  return { relRank: idx + 1, isAlive: true };
}

// 네이버 블로그 URL → { blogId, logNo }. 형식 불문 추출. 실패 시 null.
function parseBlogRef(u) {
  if (!u || typeof u !== 'string') return null;
  // 1) 쿼리 파라미터형: ...?blogId=xxx&logNo=123...
  const qBlog = u.match(/[?&]blogId=([^&]+)/i);
  const qLog = u.match(/[?&]logNo=(\d+)/i);
  if (qBlog && qLog) return { blogId: qBlog[1].toLowerCase(), logNo: qLog[1] };
  // 2) 경로형: blog.naver.com/{blogId}/{logNo}
  const p = u.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/i);
  if (p) return { blogId: p[1].toLowerCase(), logNo: p[2] };
  return null;
}

// HTML 스크래핑 v1 — 네이버 m_blog 검색 상위 10개 메타
// 설계서 §2 수집 항목: 제목/작성자/블로그명/URL/발행일 (+ 본문메타는 v1.1)
// 반환 형태: [{ rank, title, author, blog_name, url, posted_at }]
//
// ⚠️ v1 = 검증 모드. 실제 셀렉터는 네이버 검색결과 HTML 1건 실측 후 확정.
//    OBSERVER_SCRAPE_LIVE=true 환경변수로 라이브 전환. 기본은 더미 1건 반환.
//    → enqueue/캐시/INSERT/survival 흐름을 실데이터로 검증하기 위함.
//    실제 scrape 완성 시 아래 LIVE 블록만 채우고 더미 제거.
async function scrapeNaverTop10(keyword) {
  if (process.env.OBSERVER_SCRAPE_LIVE === 'true') {
    // LIVE: 네이버 블로그탭(정적 HTML) → cheerio 파싱.
    //   블로그탭 엔드포인트 사용 이유: 통합검색(where=m_blog)은 플레이스·쇼핑·지도가
    //   섞여 광고 혼입이 큼. 블로그탭은 광고 + 블로그만 → 광고만 걸러내면 organic top10.
    //   실측 확정(2026-06-14, 분당_임플란트 블로그탭 dump):
    //     organic 항목 컨테이너 = ._fe_view_power_content (글 단위, 30개 검증)
    //     글 URL = m.blog.naver.com/{blogId}/{logNo} (path 2-segment)
    //     통합검색 fallback 컨테이너 = .fds-ugc-single-intention-item-list-rra
    //   ⚠ 해시 클래스(qFRTSc.. / fender-ui_..) 금지 — 빌드마다 변동.
    //   ⚠ url은 logNo 포함 2-segment여야 locateMyPost(parseBlogRef) 매칭됨.
    const url =
      'https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&query=' +
      encodeURIComponent(keyword);
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) ' +
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseNaverTop10(html);
  }
  // 검증용 더미 1건 (아키텍처 검증 전용)
  return [{
    rank: 1,
    title: `[검증더미] ${keyword}`,
    author: 'verify',
    blog_name: 'verify_blog',
    url: 'https://blog.naver.com/verify/0',
    posted_at: null,
  }];
}

// 네이버 블로그탭/통합검색 HTML → organic 상위 10개 메타.
// 실측 확정(2026-06-14). 블로그탭 ._fe_view_power_content 30개 + 통합검색 fallback 검증.
function parseNaverTop10(html) {
  const $ = cheerio.load(html);

  // 컨테이너 우선순위: 블로그탭(_fe_view_power_content) → 통합검색(item-list-rra)
  let $items = $('._fe_view_power_content');
  if ($items.length === 0) {
    $items = $('.fds-ugc-single-intention-item-list-rra');
  }

  const results = [];
  const seen = new Set();

  $items.each((_, el) => {
    if (results.length >= 10) return;
    const $item = $(el);

    // 광고 제외: 항목 앞부분에 '광고' 배지가 붙은 글은 스킵.
    //   (organic 컨테이너는 광고 클래스를 안 쓰지만, 혼입 대비 이중 안전.)
    const head = $item.text().trim().slice(0, 12);
    if (head.startsWith('광고')) return;

    // 글 링크: m.blog.naver.com/{blogId}/{logNo} (2-segment, logNo 필수)
    let url = null, title = null, blogId = null;
    $item.find('a[href*="m.blog.naver.com/"]').each((__, a) => {
      if (url) return;
      const href = ($(a).attr('href') || '').split('?')[0];
      const m = href.match(/m\.blog\.naver\.com\/([^/?#]+)\/(\d+)/i);
      if (m) {
        const t = $(a).text().trim();
        if (t && t.length > 3) {   // 썸네일(빈 텍스트) 링크 배제, 제목 링크만
          url = href; blogId = m[1]; title = t;
        }
      }
    });
    if (!url || seen.has(url)) return;
    seen.add(url);

    // 작성자(블로그명): 1-segment 프로필 링크 중 텍스트 있는 것
    let author = null;
    $item.find('a[href*="m.blog.naver.com/"]').each((__, a) => {
      if (author) return;
      const href = $(a).attr('href') || '';
      if (/m\.blog\.naver\.com\/[^/?#]+\/?$/i.test(href)) {
        const t = $(a).text().trim();
        if (t) author = t;
      }
    });

    // 발행일: 절대(YYYY.MM.DD.) 또는 상대(N주 전/N일 전/어제 등). 없으면 null.
    const dm = $item.text().match(
      /20\d\d\.\d{1,2}\.\d{1,2}\.?|\d+주\s*전|\d+일\s*전|\d+시간\s*전|\d+분\s*전|어제|하루\s*전/
    );

    results.push({
      rank: results.length + 1,
      title: title || null,
      author: author || null,
      blog_name: author || null,   // v1: 작성자 표시명을 블로그명으로 겸용
      blogId,                       // 상단 계정 연구 DB용 식별자
      url,
      posted_at: dm ? dm[0].replace(/\s+/g, ' ') : null,
    });
  });

  return results;
}
