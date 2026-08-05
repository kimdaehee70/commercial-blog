// pages/api/admin/industry-mismatch.js
// 86차 v0.2: 가드 함수 마이그레이션 (lib/guards.requireOwner 사용)
// - 인증부만 표준화: requireOwner 적용 → 가드 응답 자동으로 표준 포맷
// - 비즈니스 응답(200 body) 100% 무변경 — UI freeze 원칙 준수
//   · generated_at / a_publish_mismatch / c_store_contamination 그대로
//   · 500 에러 응답도 그대로 ({ error: e.message })
// - createClient 인스턴스 제거 → supabaseAdmin 공용 import
// - OWNER_UID import 제거 (requireOwner 내부에서 사용)
//
// 83차 v0.1 — 복구 (bak_46cha 기준)
// 16차 — industry mismatch cross-check (read-only)
// A: 발행 단위 mismatch (publish_history vs generated_posts by title)
// C: store 단위 contamination (store_id 그룹별 industry 다양성)

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

export default async function handler(req, res) {
  // --- 가드 (86차 v0.2: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    // ─────────────────────────────────────────
    // 데이터 로드
    // ─────────────────────────────────────────
    const { data: phRows, error: phErr } = await supabaseAdmin
      .from("publish_history")
      .select("id, title, industry, store_id, created_at")
      .order("created_at", { ascending: false });
    if (phErr) throw phErr;

    const { data: gpRows, error: gpErr } = await supabaseAdmin
      .from("generated_posts")
      .select("id, title, industry, store_id, created_at")
      .order("created_at", { ascending: false });
    if (gpErr) throw gpErr;

    // ─────────────────────────────────────────
    // A. 발행 단위 mismatch (title 정확 일치)
    // ─────────────────────────────────────────
    // title → gp rows map (중복 title은 배열로 보관)
    const gpByTitle = new Map();
    for (const g of gpRows) {
      if (!g.title) continue;
      if (!gpByTitle.has(g.title)) gpByTitle.set(g.title, []);
      gpByTitle.get(g.title).push(g);
    }

    const publishMismatch = phRows.map((p) => {
      const matches = gpByTitle.get(p.title) || [];
      let match_state = "no_match";
      let generated_industry = null;
      let generated_post_id = null;
      let match_count = matches.length;

      if (matches.length === 1) {
        const g = matches[0];
        generated_industry = g.industry;
        generated_post_id = g.id;
        match_state =
          p.industry === g.industry ? "match" : "mismatch";
      } else if (matches.length > 1) {
        // title 중복 — store_id로 한 번 더 좁히기
        const sameStore = matches.filter((g) => g.store_id === p.store_id);
        if (sameStore.length === 1) {
          const g = sameStore[0];
          generated_industry = g.industry;
          generated_post_id = g.id;
          match_state =
            p.industry === g.industry ? "match" : "mismatch";
          match_count = 1;
        } else {
          match_state = "ambiguous";
          match_count = matches.length;
        }
      }

      return {
        publish_id: p.id,
        title: p.title,
        publish_industry: p.industry,
        generated_industry,
        generated_post_id,
        match_state,
        match_count,
        store_id: p.store_id,
        created_at: p.created_at,
      };
    });

    // 요약
    const summary_a = {
      total: publishMismatch.length,
      match: publishMismatch.filter((r) => r.match_state === "match").length,
      mismatch: publishMismatch.filter((r) => r.match_state === "mismatch").length,
      no_match: publishMismatch.filter((r) => r.match_state === "no_match").length,
      ambiguous: publishMismatch.filter((r) => r.match_state === "ambiguous").length,
    };

    // ─────────────────────────────────────────
    // C. store 단위 contamination
    // ─────────────────────────────────────────
    // store_id별로 publish industries / generated industries 집계
    const storeMap = new Map();

    for (const p of phRows) {
      const sid = p.store_id || "(null)";
      if (!storeMap.has(sid)) {
        storeMap.set(sid, {
          store_id: sid,
          publish_industries: new Map(), // industry -> count
          generated_industries: new Map(),
          publish_count: 0,
          generated_count: 0,
        });
      }
      const row = storeMap.get(sid);
      row.publish_count += 1;
      const ind = p.industry || "(null)";
      row.publish_industries.set(
        ind,
        (row.publish_industries.get(ind) || 0) + 1
      );
    }

    for (const g of gpRows) {
      const sid = g.store_id || "(null)";
      if (!storeMap.has(sid)) {
        storeMap.set(sid, {
          store_id: sid,
          publish_industries: new Map(),
          generated_industries: new Map(),
          publish_count: 0,
          generated_count: 0,
        });
      }
      const row = storeMap.get(sid);
      row.generated_count += 1;
      const ind = g.industry || "(null)";
      row.generated_industries.set(
        ind,
        (row.generated_industries.get(ind) || 0) + 1
      );
    }

    // Map → 직렬화 + mismatch_count 계산
    const storeContamination = [];
    for (const row of storeMap.values()) {
      const pubInds = Object.fromEntries(row.publish_industries);
      const genInds = Object.fromEntries(row.generated_industries);
      const allInds = new Set([
        ...Object.keys(pubInds),
        ...Object.keys(genInds),
      ]);

      // contamination 상태 판단 (가시화만 / 자동 보정 ❌)
      let state = "clean";
      if (allInds.size > 1) state = "mixed";
      if (allInds.has("unknown")) state = "unknown_contamination";
      if (allInds.size > 1 && allInds.has("unknown")) state = "unknown_mixed";

      storeContamination.push({
        store_id: row.store_id,
        publish_industries: pubInds,
        generated_industries: genInds,
        publish_count: row.publish_count,
        generated_count: row.generated_count,
        distinct_industries: [...allInds],
        distinct_count: allInds.size,
        state,
      });
    }

    // 정렬: contamination 있는 store 먼저
    const stateRank = {
      unknown_mixed: 0,
      unknown_contamination: 1,
      mixed: 2,
      clean: 3,
    };
    storeContamination.sort((a, b) => {
      const r = (stateRank[a.state] ?? 9) - (stateRank[b.state] ?? 9);
      if (r !== 0) return r;
      return b.publish_count + b.generated_count -
        (a.publish_count + a.generated_count);
    });

    const summary_c = {
      total_stores: storeContamination.length,
      clean: storeContamination.filter((r) => r.state === "clean").length,
      mixed: storeContamination.filter((r) => r.state === "mixed").length,
      unknown_contamination: storeContamination.filter(
        (r) => r.state === "unknown_contamination"
      ).length,
      unknown_mixed: storeContamination.filter(
        (r) => r.state === "unknown_mixed"
      ).length,
    };

    return res.status(200).json({
      generated_at: new Date().toISOString(),
      a_publish_mismatch: {
        summary: summary_a,
        rows: publishMismatch,
      },
      c_store_contamination: {
        summary: summary_c,
        rows: storeContamination,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
