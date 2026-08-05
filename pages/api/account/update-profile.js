// pages/api/account/update-profile.js
// 신규 — accounts 지역 2축(rep_region / sub_regions) 갱신 전용
// 호출처: account.js (또는 onboarding.js) 프로필 저장
// spine: public.accounts (단일 통일)
// 권한: service_role (RLS 우회) — 클라이언트가 access_token 전송
//
// 인증 패턴: ensure.js 100% 미러링 (Bearer → supabase.auth.getUser(token))
//   - guards.js requireAuth 미사용 (ensure.js와 동일 spine 유지)
//
// 갱신 범위: rep_region(text 단일) / sub_regions(text, CSV 문자열) 만.
//   - 화이트리스트 외 필드 무시. plan/status/role/email 등 절대 미갱신.
//   - sub_regions 저장 포맷 = CSV (예: "공릉동,상계동,중계동,노원역")
//     · 코치/옵저버에서 split(",") 으로 분해 사용
//
// FREEZE 준수: me.js / ensure.js / publish.js / engine / DB 스키마 무영향
//   - accounts 컬럼 기존재(rep_region/sub_regions, text, nullable) → 스키마 변경 없음

import { createClient } from "@supabase/supabase-js";

const ok = (res, body) => res.status(200).json({ ok: true, ...body });
const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

// CSV 정규화: 공백 트림, 빈 항목 제거, 중복 제거.
// 입력이 빈 문자열/공백뿐이면 "" 반환(= 해당 필드 비우기 허용).
function normalizeCsv(raw) {
  if (typeof raw !== "string") return null; // 미전송 → 갱신 안 함
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // 순서 보존 중복 제거
  const seen = new Set();
  const uniq = [];
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p);
      uniq.push(p);
    }
  }
  return uniq.join(",");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    // ─── 1. env / admin client (ensure.js 패턴 미러링) ───
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail(res, 500, "SUPABASE_ENV_MISSING");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // ─── 2. Bearer token 추출 (ensure.js 동일) ───
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return fail(res, 401, "MISSING_ACCESS_TOKEN");

    // ─── 3. token → auth user 확정 (ensure.js 동일) ───
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return fail(res, 401, "INVALID_TOKEN", { detail: userErr?.message || null });
    }
    const authUserId = userData.user.id;

    // ─── 4. 화이트리스트 — 지역 2축만 ───
    const body = req.body || {};

    const patch = {};

    // rep_region: 단일 text (대표지역). 문자열로 전송된 경우에만 갱신.
    if (typeof body.rep_region === "string") {
      patch.rep_region = body.rep_region.trim(); // "" 허용(비우기)
    }

    // sub_regions: CSV text (세부지역). 정규화 후 갱신.
    if (typeof body.sub_regions === "string") {
      const csv = normalizeCsv(body.sub_regions);
      patch.sub_regions = csv; // "" 허용(비우기)
    }

    if (Object.keys(patch).length === 0) {
      return fail(res, 400, "NO_FIELDS", {
        detail: "rep_region 또는 sub_regions 중 최소 1개 필요",
      });
    }

    patch.updated_at = new Date().toISOString();

    // ─── 5. accounts UPDATE (auth_user_id 기준) ───
    const { data: updated, error: updErr } = await supabase
      .from("accounts")
      .update(patch)
      .eq("auth_user_id", authUserId)
      .select("id, rep_region, sub_regions, updated_at")
      .maybeSingle();

    if (updErr) {
      console.error("[update-profile] update error:", updErr);
      return fail(res, 500, "UPDATE_FAILED", { detail: updErr.message });
    }
    if (!updated) {
      // accounts row 없음 (ensure 미선행) → 404
      return fail(res, 404, "ACCOUNT_NOT_FOUND");
    }

    console.log(
      `[update-profile] ✓ id=${updated.id} rep=${updated.rep_region} sub=${updated.sub_regions}`
    );
    return ok(res, { action: "updated", account: updated });
  } catch (e) {
    console.error("[update-profile] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
