// lib/Observation.js
// [Observation Spine 2026-07-06] 관측(survival/rank) API 경계 분리 모듈.
//   index.js fetchHub의 survival/rank 응답 파싱 + saveRank(POST)를 setter 주입 팩토리로 이관.
//   ── 원칙: 동작 100% 유지. hubSurvival/hubRanks/rankDraft state·JSX·coach 무변경. ──
//   fetchHub는 4개 fetch 병렬(Promise.allSettled)을 그대로 유지하고,
//   survival/rank 응답 처리만 이 모듈의 apply* 헬퍼에 위임한다(로더 구조 무이동).
//   store/token 획득은 index(fetchHub·saveRank 내부)가 유지 — supabase 세션은 소비지점 주입.

import { supabase } from "./supabase";

/**
 * 관측 API 팩토리.
 * @param {object} setters
 *   - setHubSurvival, setHubSurvivalItems : me/survival 응답 반영
 *   - setHubRanks                          : me/rank(GET) 및 saveRank(POST) 응답 반영
 *   - setRankDraft, setRankSaving          : saveRank 입력값 초기화·저장중 표시
 * @returns { applySurvivalResponse, applyRankResponse, saveRank }
 */
export function makeObservationApi({
  setHubSurvival,
  setHubSurvivalItems,
  setHubRanks,
  setRankDraft,
  setRankSaving,
}) {
  // ── me/survival 응답 반영 (fetchHub sRes 처리부 그대로) ──
  //   sRes = Promise.allSettled 항목. fulfilled/ok 판정까지 원본 그대로 재현.
  async function applySurvivalResponse(sRes) {
    if (sRes && sRes.status === "fulfilled" && sRes.value.ok) {
      const sj = await sRes.value.json();
      if (sj?.ok && sj.summary) setHubSurvival(sj.summary);
      if (sj?.ok && Array.isArray(sj.items)) setHubSurvivalItems(sj.items);
    }
  }

  // ── me/rank(GET) 응답 반영 (fetchHub rRes 처리부 그대로) ──
  async function applyRankResponse(rRes) {
    if (rRes && rRes.status === "fulfilled" && rRes.value.ok) {
      const rj = await rRes.value.json();
      if (rj?.ok && rj.ranks) setHubRanks(rj.ranks);
    }
  }

  // ── [v24] 오늘 순위 저장 — post_ranks upsert. basis별(기본/후기) 분리 기록. ──
  //   index.js saveRank useCallback 본문 그대로 이관. 동작·API·엔드포인트 무변경.
  //   [v2] notFound=true 면 순위 대신 「미발견」을 기록한다(rank 미전송).
  //     사용자는 "몇 위인지"를 항상 알 수 없지만 "못 찾았다"는 확실히 안다.
  //     이 한 클릭이 「관측 안 함」과 「관측했는데 없음」을 갈라 준다 — ORBIT 이 쓰는 축이다.
  async function saveRank(post, raw, basis, notFound) {
    const pid = post?.id;
    const b = basis === "review" ? "review" : "rel";
    const isNF = notFound === true;
    const n = parseInt(raw, 10);
    if (!pid) return;
    if (!isNF && (!Number.isInteger(n) || n < 1 || n > 999)) return;
    const savingKey = `${pid}:${b}`;
    try {
      setRankSaving(savingKey);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return;
      const kw = [post.region, post.treatment_name || post.keyword].filter(Boolean).join(" ");
      const res = await fetch("/api/me/rank", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(isNF
          ? { post_id: String(pid), not_found: true, keyword: kw || null, basis: b }
          : { post_id: String(pid), rank: n, keyword: kw || null, basis: b }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setHubRanks((prev) => {
          const entry = { ...(prev[pid] || {}) };
          const cur = entry[b];
          const sameDay = cur && cur.checked_at === j.saved.checked_at;
          const prevRank = sameDay ? cur.prev : (cur ? cur.current : null);
          entry[b] = isNF
            ? {
                current: null,
                prev: prevRank,
                delta: null,
                checked_at: j.saved.checked_at,
                not_found: true,
              }
            : {
                current: n,
                prev: prevRank,
                delta: prevRank != null ? prevRank - n : null,
                checked_at: j.saved.checked_at,
                not_found: false,
              };
          return { ...prev, [pid]: entry };
        });
        setRankDraft((prev) => ({ ...prev, [savingKey]: "" }));
      }
    } catch (e) {
      console.warn("[rank] 저장 실패:", e?.message);
    } finally {
      setRankSaving(null);
    }
  }

  return { applySurvivalResponse, applyRankResponse, saveRank };
}
