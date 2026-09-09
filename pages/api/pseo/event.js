// pages/api/pseo/event.js
// ─────────────────────────────────────────────────────────────
// [PSEO-V0-CONTACT-FIRST-DESIGN-01] Gate A — CTA 이벤트 기록.
//
// 개인정보 미수집. 저장하는 것은 다음뿐이다:
//   store_id · account_id · cta_type · source · industry · region · created_at
// 전화번호·문자내용·IP·UA·세션 미수집. (승인 원칙)
//
// 승인 원칙 반영:
//   1. 클라이언트의 account_id / industry / region 을 신뢰하지 않는다.
//      → 요청 본문에 들어와도 전부 무시한다. 파싱조차 하지 않는다.
//   2. 브라우저 최소값 = store_id · cta_type · source
//   3. 서버가 store_profiles 재조회 → status='active' AND account_id IS NOT NULL
//      을 모두 만족할 때만 INSERT.
//   4. account_id / industry / region = 재조회한 store_profiles 값 스냅샷.
//   5. SELECT/INSERT 오류를 삼키지 않는다. 명시 반환 + 서버로그.
//
// 인증 없음(공개 페이지용). middleware.js 는 /api/generate* 만 개입하므로
//   이 경로는 무간섭이다. (middleware.js L44 실측)
//
// ⚠ CHECK 제약 위반(23514)을 조용히 삼키면 "실청구는 됐는데 기록이 없다"와
//   같은 무증상 결함이 된다(PAYMENT-HISTORY-KIND-RETRY 선례).
//   그래서 아래에서 error 를 반드시 확인하고 code 를 그대로 반환한다.
// ─────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// DDL 의 pseo_events_cta_type_check 와 동일 집합. 둘이 어긋나면 23514 가 난다.
const CTA_TYPES = new Set([
  "page_view",
  "phone_click",
  "sms_click",
  "directions_click",
  "place_click",
  "post_click",
]);

const SOURCE_MAX = 32;

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  // ── 입력 3개만 수용. 나머지 키는 존재해도 사용하지 않는다. ──
  const body = typeof req.body === "object" && req.body ? req.body : {};

  const rawId = body.store_id;
  if (!/^[0-9]+$/.test(String(rawId ?? ""))) {
    return res.status(400).json({ ok: false, code: "BAD_STORE_ID" });
  }
  const storeId = Number(rawId);
  if (!Number.isSafeInteger(storeId) || storeId <= 0) {
    return res.status(400).json({ ok: false, code: "BAD_STORE_ID" });
  }

  const ctaType = String(body.cta_type || "");
  if (!CTA_TYPES.has(ctaType)) {
    return res.status(400).json({ ok: false, code: "BAD_CTA_TYPE" });
  }

  let source = String(body.source || "direct").trim();
  if (!/^[a-z0-9_]{1,32}$/i.test(source)) source = "unknown";
  source = source.slice(0, SOURCE_MAX);

  let sb;
  try {
    sb = serverClient();
  } catch (e) {
    console.error("[pseo/event] env", e.message);
    return res.status(500).json({ ok: false, code: "ENV_MISSING" });
  }

  // ── ③ store_profiles 재조회 — 게이트 겸 스냅샷 원본 ──────────
  const { data: store, error: selErr } = await sb
    .from("store_profiles")
    .select("id,account_id,industry,region,status")
    .eq("id", storeId)
    .maybeSingle();

  if (selErr) {
    console.error("[pseo/event] select", selErr.code, selErr.message);
    return res
      .status(500)
      .json({ ok: false, code: "STORE_SELECT_FAILED", pg: selErr.code });
  }
  if (!store) {
    return res.status(404).json({ ok: false, code: "STORE_NOT_FOUND" });
  }
  if (store.status !== "active") {
    return res.status(409).json({ ok: false, code: "STORE_NOT_ACTIVE" });
  }
  if (store.account_id === null || store.account_id === undefined) {
    // 계정 삭제된 고아 store. 귀속 없는 이벤트를 만들지 않는다.
    return res.status(409).json({ ok: false, code: "STORE_UNLINKED" });
  }

  // ── ④ 서버 스냅샷으로 INSERT ────────────────────────────────
  const { data: row, error: insErr } = await sb
    .from("pseo_events")
    .insert({
      store_id: store.id,
      account_id: store.account_id,
      cta_type: ctaType,
      source,
      industry: store.industry || null,
      region: store.region || null,
    })
    .select("id")
    .single();

  if (insErr) {
    // 23514 = CHECK 위반(cta_type 집합 불일치). 여기서 반드시 드러나야 한다.
    console.error("[pseo/event] insert", insErr.code, insErr.message);
    return res
      .status(500)
      .json({ ok: false, code: "EVENT_INSERT_FAILED", pg: insErr.code });
  }

  return res.status(200).json({ ok: true, id: row?.id ?? null });
}
