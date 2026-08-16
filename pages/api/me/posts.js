// pages/api/me/posts.js
// 사용자 본인 최근 발행글 — SELECT only. DB 쓰기 0.
// 인증: requireAccount → user.id scope. 쿼리파라미터 식별 제거.
// Naver §2: qc_score/qc_detail/raw_prompt/final_prompt/content 절대 미노출(점수0).
//
// 세션79 [관측 공유] 관리자가 입력한 관측을 사용자에게 '읽기 전용'으로 내려준다.
//   - 근거 실측(2026-08-01): publish_metrics.publish_id 는 published 행에 붙는다
//     (published 166행/33건 · baseline 4행/1건은 2026-05-19 초기 테스트 잔재 1개뿐).
//     → 별도 source_post_id 우회 불필요. publish_history.id 직결.
//   - 권한 구조: 입력=관리자(/api/admin/observations POST) / 조회=사용자. 여기서는 쓰기 없음.
//   - 노출 범위: 순위 · 관련도 · 생존만. memo/*_note/ai_smell/fossil 등 내부 관측 메모는 미노출.
//   - 관측 없으면 obs=null → 화면은 기존과 동일하게 렌더(하위호환).
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";

// 사용자 노출 관련도 3키 (관리자 입력도 세션78 이후 관련도 3칸만 사용)
const RELATED_KEYS = ["core_related", "review_related", "full_related"];

// 한 글의 관측 행들(최신순) → 사용자 노출용 요약 1건
function summarize(rowsDesc) {
  if (!rowsDesc || !rowsDesc.length) return null;
  const latest = rowsDesc[0];
  const oldest = rowsDesc[rowsDesc.length - 1];

  // 관련도 3키만 추림 (최신 관측 기준)
  const rd = latest.rank_detail && typeof latest.rank_detail === "object" ? latest.rank_detail : {};
  const related = {};
  for (const k of RELATED_KEYS) {
    const n = typeof rd[k] === "string" ? parseInt(rd[k], 10) : rd[k];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) related[k] = n;
  }

  // 생존 = 첫 관측 ~ 마지막 alive 관측 경과(시간). admin buildSnapshot 과 동일 산식.
  const firstSeenAt = oldest.created_at || oldest.observed_date || null;
  const aliveRows = rowsDesc.filter((m) => m.alive_status === "alive");
  const latestAliveAt = aliveRows.length
    ? (aliveRows[0].created_at || aliveRows[0].observed_date)
    : null;
  let survivalHours = null;
  if (firstSeenAt && latestAliveAt) {
    const diffMs = new Date(latestAliveAt).getTime() - new Date(firstSeenAt).getTime();
    if (Number.isFinite(diffMs) && diffMs >= 0) survivalHours = Math.round(diffMs / 36e5);
  }

  return {
    observed_rank: latest.observed_rank ?? null,        // 대표순위 = rank_detail 최소값(admin 산출)
    related: Object.keys(related).length ? related : null,
    alive_status: latest.alive_status || null,          // alive / fading / dead / null
    observed_at: latest.created_at || latest.observed_date || null,
    days_since_publish: latest.days_since_publish ?? null,
    survival_hours: survivalHours,
    observed_count: rowsDesc.length,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  // [fix] 상한 50→1000. 화면(fetchHub)이 limit=1000 요청하나 50 캡에 걸려
  //   상위 50건만 반환 → published_at=null인 baseline(생성글)이 뒤로 밀려 잘림 → 최근발행 0건.
  const limit = Math.min(parseInt(req.query.limit ?? "10", 10) || 10, 1000);

  try {
    // 노출 허용 컬럼만 명시 선택.
    const { data: posts, error: postErr } = await supabaseAdmin
      .from("publish_history")
      .select("id, title, industry, region, keyword, treatment_name, publish_status, naver_post_url, published_at, created_at, source_post_id, cluster, core_keyword")  // [CORE-KEYWORD-HALL-01] cluster — baseline 저장 hallName 브리지. 미노출 시 openPost.cluster=undefined → Core 가 fallback(생활권+업종)으로 새어 관측축 오염. Naver §2 미노출 대상 아님(화면 렌더 미사용, 내부 브리지값). / [LENS-CORE-SOT-01] core_keyword — 생성 시점 확정 Core(관측축 SoT). 돋보기 검색어 정본. 미노출 시 화면이 region+treatment_name 으로 재조립 → 관측축과 다른 검색어를 연다. / [fix] source_post_id — baseline↔published 병합 식별자(§merge-A안). 미노출 시 프론트가 제목 병합에 의존 → 등록완료인데 미등록 표시 + 재등록 409.
      .eq("account_id", account.id)
      // [세션135 · MY-USAGE-SOFTDELETE-DISPLAY-01] 삭제된 글은 사용자 화면에서 제외.
      //   이 API 하나가 마이페이지 이용내역 + 최근발행 두 화면의 목록 정본이라 여기서만 막으면 된다.
      //   ※ quota 계산은 이 경로를 쓰지 않는다(lib/billing/usage.countGeneratedInPeriod).
      //     quota 축은 deleted_at 미필터가 확정 정책이므로(QUOTA-SOFTDELETE-POLICY-01)
      //     이 필터를 그쪽으로 옮기거나 복사하지 않는다. 표시 축 전용.
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      // [fix] 2차 키 — published_at=null(baseline) 그룹은 1차 키만으론 순서 불안정.
      //   created_at(NOT NULL) → id로 완전 결정적 정렬. 누락·뒤섞임 방지.
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (postErr) {
      return res.status(500).json({ ok: false, error: "SELECT_FAILED", detail: postErr.message });
    }

    const list = posts ?? [];

    // ── 세션79: 관측 흡수 (읽기 전용) ───────────────────────────────
    // 실패해도 목록은 그대로 내려준다(관측은 부가 정보 — 본 화면을 막지 않는다).
    let obsMap = new Map();
    if (list.length) {
      const ids = list.map((p) => p.id);
      const { data: metrics, error: mErr } = await supabaseAdmin
        .from("publish_metrics")
        .select("publish_id, observed_date, created_at, days_since_publish, observed_rank, alive_status, rank_detail")
        .in("publish_id", ids)
        .order("observed_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!mErr && metrics) {
        const byPid = new Map();
        for (const m of metrics) {
          if (!byPid.has(m.publish_id)) byPid.set(m.publish_id, []);
          byPid.get(m.publish_id).push(m); // 이미 desc 정렬
        }
        for (const [pid, rows] of byPid) obsMap.set(pid, summarize(rows));
      }
    }

    // [세션79 필수] 프론트(최근발행) merge 대표행 = baseline 이다(index.js §merge-A안).
    //   관측은 published id 에 붙으므로, 그대로 두면 대표행에 obs 가 실리지 않는다.
    //   → published 행의 obs 를 source_post_id(=baseline id) 행에도 복사한다.
    //     프론트 병합 로직은 무수정. baseline 이 이미 obs 를 들고 대표가 된다.
    for (const p of list) {
      if (p.publish_status === "baseline") continue;
      if (p.source_post_id == null) continue;
      const o = obsMap.get(p.id);
      if (o && !obsMap.has(p.source_post_id)) obsMap.set(p.source_post_id, o);
    }

    const withObs = list.map((p) => ({ ...p, obs: obsMap.get(p.id) || null }));

    return res.status(200).json({ ok: true, posts: withObs });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
