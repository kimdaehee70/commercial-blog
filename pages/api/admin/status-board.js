// pages/api/admin/status-board.js
// 100차+ v0.2: group_observed_count + meta.observed_count/alive_count 추가 (append만). observed≠alive 분리표시용.
//   기존 응답 키 전부 무변경. 추가 쿼리 0 (기존 latestByPost 재사용). DB/스키마/엔진 무접촉.
// 98차 v0.1: 운영 상태판 — read 전용 집계 엔드포인트 (신규)
// - observations.js(관측 원본)와 분리. 이 파일은 POST 없음 = write 표면 0 = FREEZE 정합.
// - GET ?industry=dental → { ok, industry, groups, unclustered, meta }
// - 가드: Bearer + OWNER_UID (observations.js 패턴 그대로).
// - 소스: publish_history(read) + publish_metrics(read). 단일 DB. SELECT only.
//
// 데이터 계약 (98차 확정):
//   그룹키       = region + '·' + treatment_name (런타임 조합)
//                  ※ publish_history.cluster 컬럼은 전부 NULL → 신뢰 안 함, 사용 안 함.
//   demo/test    = industry='demo' 기본 제외 (?include_test=1 일 때만 포함)
//   미분류       = region·treatment_name 둘 다 NULL → unclustered로 분리 (프론트 최하단/회색)
//   2축 분리     = rank_detail 6키 그대로 (Math.min 안 함)
//                    제목축 = core_related / core_recent
//                    본문축 = review_related / review_recent
//                    전체축 = full_related / full_recent (참고)
//
// FREEZE: 엔진 / publish.js / RPC / check-quota.js 불변. 이 파일은 그 어느 것도 호출/수정 안 함.

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { OWNER_UID } from '../../../lib/constants';

// auth 검증 전용 (anon key) — observations.js와 동일 패턴
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── STEP 2: 업종별 그룹키 주입 (하드코딩 금지, 설정으로) ──────────────
// 새 업종 = 여기 한 줄 추가. 골격 코드 불변.
// 치과 외 전부 "미검증" — 관측 쌓이면 키 조정 (명세 v0.2 일치).
const CLUSTER_KEY_BY_INDUSTRY = {
  dental: ['region', 'treatment_name'], // 1순위 검증중 (cluster컬럼 NULL이라 조합으로)
  // mudang: ['case', 'region'],         // 무속: 사례 중심, 지역 약함 (미검증)
  // food:   ['region', 'menu'],          // 식당: 지역+메뉴 (미검증)
  // event:  ['program', 'region'],       // 행사: 프로그램+지역 (미검증)
};

// 새 업종 default 미지정 시 안전값 = region+treatment_name 못 잡으면 글 단위 fallback은
// 프론트 책임. API는 키 없으면 단순히 키 배열을 빈 값으로 처리 → 전부 미분류로 떨어짐.
function getClusterKeys(industry) {
  return CLUSTER_KEY_BY_INDUSTRY[industry] || [];
}

// ── 2축 분리순위 추출 (rank_detail 6키, Math.min 안 함) ──────────────
// 그룹 내 "대표순위" = 각 축별로 그룹에 속한 글들의 최상위(min) 값.
// ※ 이건 그룹 집계 차원의 min이지, observations.js처럼 한 글의 6키를 1개로 뭉개는 게 아님.
//   각 축은 끝까지 분리 유지된다.
function pickAxisRanks(rankDetail) {
  const rd = rankDetail && typeof rankDetail === 'object' ? rankDetail : {};
  const num = (v) => {
    const n = typeof v === 'string' ? parseInt(v, 10) : v;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    title: { related: num(rd.core_related), recent: num(rd.core_recent) },   // 제목축
    body: { related: num(rd.review_related), recent: num(rd.review_recent) }, // 본문축
    full: { related: num(rd.full_related), recent: num(rd.full_recent) },     // 전체축(참고)
  };
}

// 두 순위 중 더 상위(작은 값) 반환. 둘 다 null이면 null.
function bestRank(a, b) {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return Math.min(a, b);
}

// survival 일수 (99차 B-2): 발행일 ~ 최신 alive 관측일 차이.
//   - alive 관측이 한 번도 없으면 null (= "유지 기록 없음", 0과 구분).
//   - 음수 방지 위해 Math.max(0, …).
function calcSurvivalDays(publishedAt, latestAliveDate) {
  if (!publishedAt || !latestAliveDate) return null;
  const base = new Date(publishedAt).getTime();
  const alive = new Date(
    String(latestAliveDate).length <= 10 ? latestAliveDate + 'T00:00:00' : latestAliveDate
  ).getTime();
  if (!Number.isFinite(base) || !Number.isFinite(alive)) return null;
  return Math.max(0, Math.floor((alive - base) / (24 * 3600 * 1000)));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  // --- Bearer 토큰 검증 (observations.js 패턴 그대로) ---
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED', detail: 'missing_bearer_token' });
  }
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED', detail: 'invalid_token' });
  }
  if (userData.user.id !== OWNER_UID) {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN', detail: 'not_owner' });
  }

  const industry = (req.query.industry || 'dental').toString();
  const includeTest = req.query.include_test === '1'; // demo/test 토글

  try {
    // ── STEP 1: 데이터 fetch (read only) ───────────────────────────
    // 1) publish_history — 상태판에 필요한 컬럼만
    let phQuery = supabaseAdmin
      .from('publish_history')
      .select('id, title, industry, region, treatment_name, blog_account, is_personal_post, published_at, created_at, publish_status');

    // demo 제외 (토글 시 포함). industry 필터는 'demo' 토글과 충돌하지 않게:
    //   기본: 선택 업종만. include_test면 demo도 추가로.
    if (includeTest) {
      phQuery = phQuery.in('industry', [industry, 'demo']);
    } else {
      phQuery = phQuery.eq('industry', industry);
    }

    const { data: posts, error: phErr } = await phQuery;
    if (phErr) throw phErr;

    const postList = posts || [];
    if (postList.length === 0) {
      return res.status(200).json({
        ok: true, industry, groups: [], unclustered: [],
        meta: { total_posts: 0, group_count: 0, unclustered_count: 0, include_test: includeTest },
      });
    }

    // 2) 해당 글들의 최신 관측 1건씩 (publish_metrics)
    const ids = postList.map((p) => p.id);
    const { data: metrics, error: mErr } = await supabaseAdmin
      .from('publish_metrics')
      .select('publish_id, observed_date, created_at, rank_detail, alive_status, exposure_note, fossil_observed')
      .in('publish_id', ids)
      .order('observed_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (mErr) throw mErr;

    // publish_id → 최신 관측 1건 (정렬이 desc이므로 첫 등장이 최신)
    const latestByPost = {};
    // publish_id → 최신 alive 관측의 observed_date (survival 계산용, 99차 B-2)
    //   정의: 발행일 ~ "가장 최근 alive 관측일" 차이 일수.
    //   metrics가 observed_date desc 정렬이므로, alive인 첫 등장이 곧 최신 alive.
    const latestAliveDateByPost = {};
    for (const m of metrics || []) {
      if (!(m.publish_id in latestByPost)) latestByPost[m.publish_id] = m;
      if (m.alive_status === 'alive' && !(m.publish_id in latestAliveDateByPost)) {
        latestAliveDateByPost[m.publish_id] = m.observed_date || m.created_at || null;
      }
    }

    // ── STEP 2 + 3: 런타임 그룹핑 + 2축 분리 집계 ──────────────────
    const keys = getClusterKeys(industry);
    const groupMap = new Map(); // groupKey → 집계객체
    const unclustered = [];     // region·treatment 둘 다 NULL

    for (const p of postList) {
      const latest = latestByPost[p.id] || null;
      const axis = pickAxisRanks(latest?.rank_detail);

      const postRow = {
        id: p.id,
        title: p.title,
        region: p.region,
        treatment_name: p.treatment_name,
        blog_account: p.blog_account,
        published_at: p.published_at || p.created_at || null,
        publish_status: p.publish_status,
        title_axis: axis.title, // {related, recent}
        body_axis: axis.body,
        full_axis: axis.full,
        observed_at: latest ? (latest.observed_date || latest.created_at) : null,
        alive_status: latest?.alive_status || null,
        has_observation: !!latest,
        survival_days: calcSurvivalDays(
          p.published_at || p.created_at || null,
          latestAliveDateByPost[p.id] || null
        ), // 99차 B-2: 발행~최신 alive 관측 일수. alive 없으면 null.
      };

      // 미분류 판정: 그룹키 구성 필드가 전부 비었는가
      const keyVals = keys.map((k) => p[k]).filter((v) => v != null && v !== '');
      const isUnclustered = keys.length === 0 || keyVals.length === 0;

      if (isUnclustered) {
        unclustered.push(postRow);
        continue;
      }

      const groupKey = keyVals.join('·');
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          group_key: groupKey,
          industry,
          // 키 구성요소를 그대로 노출 (프론트 라벨/축 커스터마이즈용)
          key_parts: keys.reduce((acc, k) => { acc[k] = p[k] ?? null; return acc; }, {}),
          posts: [],
          // 그룹 대표 2축 순위 (그룹 내 최상위)
          title_rank: null, // 제목축 대표 (related/recent 중 상위)
          body_rank: null,  // 본문축 대표
          // 순서4 (7-2): 묶음 대표 생존력
          group_survival_days: null, // 그룹 내 글 survival_days 최댓값 (가장 오래 버틴 글). 전부 null이면 null.
          group_alive_count: 0,      // 그룹 내 최신 관측 alive_status === 'alive' 글 수
          group_observed_count: 0,   // 100차+: 그룹 내 최신 관측 1건이라도 존재(has_observation)하는 글 수. observed≠alive 분리표시용. alive_status 무관.
        });
      }
      const g = groupMap.get(groupKey);
      g.posts.push(postRow);

      // 그룹 대표순위 = 그룹 내 각 축 최상위. 축은 끝까지 분리.
      const titleBest = bestRank(axis.title.related, axis.title.recent);
      const bodyBest = bestRank(axis.body.related, axis.body.recent);
      g.title_rank = bestRank(g.title_rank, titleBest);
      g.body_rank = bestRank(g.body_rank, bodyBest);

      // 순서4: 묶음 대표 생존력 — survival_days 최댓값(null 제외), alive 글 수
      if (postRow.survival_days != null) {
        g.group_survival_days = g.group_survival_days == null
          ? postRow.survival_days
          : Math.max(g.group_survival_days, postRow.survival_days);
      }
      if (postRow.alive_status === 'alive') {
        g.group_alive_count += 1;
      }
      // observed: 최신 관측 1건이라도 있으면 카운트 (순위/생존 무관). observed≠alive 분리표시.
      if (postRow.has_observation) {
        g.group_observed_count += 1;
      }
    }

    // 집계 마무리: 글수 + 정렬
    const groups = Array.from(groupMap.values()).map((g) => ({
      ...g,
      post_count: g.posts.length,
    }));

    // 정상 묶음 = 글수 desc. (미분류는 별도 배열 → 프론트가 최하단 배치)
    groups.sort((a, b) => b.post_count - a.post_count);

    // meta 전체 합계 (observed≠alive 분리표시용). groups+unclustered 전수 1회 스캔. 표시 전용.
    let totalObserved = 0;
    let totalAlive = 0;
    for (const g of groups) {
      totalObserved += g.group_observed_count || 0;
      totalAlive += g.group_alive_count || 0;
    }
    for (const p of unclustered) {
      if (p.has_observation) totalObserved += 1;
      if (p.alive_status === 'alive') totalAlive += 1;
    }

    return res.status(200).json({
      ok: true,
      industry,
      groups,
      unclustered, // 프론트: 최하단 / 회색 / 클릭 시 개별 글 펼침
      meta: {
        total_posts: postList.length,
        group_count: groups.length,
        unclustered_count: unclustered.length,
        observed_count: totalObserved, // 100차+: 관측 1건이라도 있는 글 수 (alive 무관)
        alive_count: totalAlive,       // 100차+: 최신 관측 alive 글 수
        include_test: includeTest,
        cluster_keys: keys,           // 어떤 키로 묶었는지 프론트에 노출
        trend: 'deferred',            // 추세 = survival 버그 해소 후 (명세 6단계)
      },
    });
  } catch (e) {
    console.error('[status-board:GET] error:', e);
    return res.status(500).json({ ok: false, error: 'STATUS_BOARD_GET_FAILED', detail: e.message });
  }
}
