// pages/api/admin/system-stats.js
// 86차 v0.2: 가드 함수 마이그레이션 + 응답 포맷 표준화
// - lib/guards.requireOwner 사용 (5줄 → 1줄)
// - 응답 포맷 표준 통일 (ok:false/error/detail)
// - 정상 응답에 ok:true 추가 (UI 호환: tables/views/checked_at 그대로)
// - 호출처: pages/admin/system.js (data.tables/data.views/data.checked_at 사용) — 무영향 확인
//
// 83차 v0.1 — 복구 (bak_46cha 기준)
// 38차 — 운영 truth dashboard API (read-only)
// DB 실존 테이블/뷰의 count + last created_at 조회
//
// 원칙:
//  - read-only (count + select 1 row만)
//  - 자동 보정 ❌
//  - 추측 ❌ (38차 SQL 조사로 확정된 목록만 조회)
//  - 실패는 실패대로 표시 (missing / no_access)

import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireOwner } from "../../../lib/guards";

// 38차 SQL 조사로 확정된 실존 테이블/뷰
const TABLES = [
  { name: "accounts",         hasCreatedAt: true,  note: "사용자 계정" },
  { name: "publish_history",  hasCreatedAt: true,  note: "발행 이력" },
  { name: "publish_metrics",  hasCreatedAt: true,  note: "발행 관찰 지표" },
  { name: "store_profiles",   hasCreatedAt: true,  note: "사업장 프로필" },
];

const VIEWS = [
  { name: "v_account_post_mix",      note: "계정별 발행 mix" },
  { name: "v_fossil_observed_count", note: "fossil 관찰 카운트" },
  { name: "v_industry_survival",     note: "업종 생존율" },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // --- 가드 (86차 v0.2: requireOwner 통일) ---
  const user = await requireOwner(req, res);
  if (!user) return;

  // 테이블 조회
  const tableResults = [];
  for (const t of TABLES) {
    const r = await probeTable(t.name, t.hasCreatedAt);
    tableResults.push({ ...t, ...r });
  }

  // 뷰 조회 (count만)
  const viewResults = [];
  for (const v of VIEWS) {
    const r = await probeView(v.name);
    viewResults.push({ ...v, ...r });
  }

  return res.status(200).json({
    ok: true,
    checked_at: new Date().toISOString(),
    tables: tableResults,
    views: viewResults,
  });
}

async function probeTable(name, hasCreatedAt) {
  try {
    // count
    const { count, error: cerr } = await supabaseAdmin
      .from(name)
      .select("*", { count: "exact", head: true });

    if (cerr) {
      return {
        exists: false,
        count: null,
        last_created_at: null,
        probe_error: cerr.message,
      };
    }

    // last created_at (있으면)
    let last_created_at = null;
    if (hasCreatedAt && count > 0) {
      const { data: lastRow } = await supabaseAdmin
        .from(name)
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (lastRow && lastRow.length > 0) {
        last_created_at = lastRow[0].created_at;
      }
    }

    return {
      exists: true,
      count: count ?? 0,
      last_created_at,
    };
  } catch (e) {
    return {
      exists: false,
      count: null,
      last_created_at: null,
      probe_error: String(e?.message || e),
    };
  }
}

async function probeView(name) {
  try {
    const { count, error } = await supabaseAdmin
      .from(name)
      .select("*", { count: "exact", head: true });

    if (error) {
      return { exists: false, count: null, probe_error: error.message };
    }
    return { exists: true, count: count ?? 0 };
  } catch (e) {
    return {
      exists: false,
      count: null,
      probe_error: String(e?.message || e),
    };
  }
}
