// pages/api/save-generated.js
// 생성 시점 기록 — 글 생성 성공 직후 publish_history에 'baseline'(미발행 생성본) row insert.
// 철학: 생성이력 복구 (달력 🔵 / 최근발행 / 생성글 목록 / 코치 진행상태).
//
// 설계 확정 (스키마 실측 기반):
//   - 테이블 재사용: publish_history (신규 테이블 X / generated_posts X)
//   - publish_status = 'baseline'  → quota 미차감 (check-quota는 'published'만 집계). CHECK 허용값(generated 미허용).
//   - naver_post_url = null          → 달력 🔵 / 미발행 판정
//   - blog_account = ""              → NOT NULL 제약 방어 (실측: NOT NULL, default 없음)
//   - publish.js 재사용 안 함 (publish.js는 naver_post_url 필수 + URL검증 → 발행 전용)
//   - supabaseAdmin 직접 insert (me/posts 패턴)
//
// 인증: publish-secure 패턴 재사용 — Bearer token → getUser → accounts → account_id 서버 확정.
//   body.account_id는 신뢰하지 않음 (서버 검증값으로만 저장).

import { createClient } from "@supabase/supabase-js";
// [CORE-AT-GENERATION-01] Core 는 URL 등록이 아니라 생성 시점에 확정한다.
//   Core 계산 SoT 는 lib/spine/serviceAxis 1곳. 이 파일에서 조합식을 재구현하지 않는다.
import { buildObservationCore } from "../../lib/spine/serviceAxis";

const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    // ─── 1. env / admin client ───
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail(res, 500, "SUPABASE_ENV_MISSING");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // ─── 2. Bearer token 추출 + 검증 (publish-secure 패턴) ───
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return fail(res, 401, "MISSING_ACCESS_TOKEN");

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return fail(res, 401, "INVALID_TOKEN", { detail: userErr?.message || null });
    }
    const authUserId = userData.user.id;

    // ─── 3. 본인 accounts row 조회 → account_id 서버 확정 ───
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("id, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (accErr) return fail(res, 500, "ACCOUNT_SELECT_FAILED", { detail: accErr.message });
    if (!account) {
      return fail(res, 404, "ACCOUNT_NOT_FOUND", { hint: "call /api/account/ensure first" });
    }
    if (account.status && account.status !== "active") {
      return res.status(403).json({ ok: false, error: "ACCOUNT_INACTIVE", status: account.status });
    }

    const verifiedAccountId = account.id;

    // ─── 4. body 파싱 ───
    const {
      industry,
      keyword,
      title,
      content,
      // 선택 (nullable)
      region,
      treatment_id,
      treatment_name,
      active_keyword,
      full_keyword,
      // [CORE-KEYWORD-HALL-01] cluster = 장례식장 선택 글의 hallName 내부 브리지.
      //   컬럼명과 의미가 다르다 — 기존 전량 NULL·미사용 컬럼 재사용(DB 변경 0).
      cluster,
      text_markdown,
      char_count,
      qc_score,
      model,
      store_id,
    } = req.body || {};

    // ─── 5. NOT NULL 필수 검증 (industry/keyword/title/content) ───
    const missing = [];
    if (!industry) missing.push("industry");
    if (!keyword)  missing.push("keyword");
    if (!title)    missing.push("title");
    if (!content)  missing.push("content");
    if (missing.length > 0) {
      return fail(res, 400, `필수 필드 누락: ${missing.join(", ")}`);
    }

    // ─── 6. insert row 구성 ───
    // NOT NULL 컬럼 전부 충족: blog_account / industry / keyword / title / content / publish_status(baseline)
    // created_at / updated_at = DB default now() → 생략
    // naver_post_url / published_at = 생략 → null (달력 🔵)
    const row = {
      account_id:     verifiedAccountId,
      blog_account:   "",            // NOT NULL 방어 (실측: NOT NULL, no default)
      publish_status: "baseline",    // CHECK 허용값 재사용 (generated 미허용). check-quota가 published만 집계 → baseline 미차감. naver_post_url=null → 달력 🔵.
      industry,
      keyword,
      title,
      content,
    };
    if (region != null)         row.region         = region;
    if (treatment_id != null)   row.treatment_id   = treatment_id;
    if (treatment_name != null) row.treatment_name = treatment_name;
    if (active_keyword != null) row.active_keyword = active_keyword;
    if (full_keyword != null)   row.full_keyword   = full_keyword;
    if (cluster != null)        row.cluster        = cluster;   // [CORE-KEYWORD-HALL-01] hallName 원형 그대로(가공 0)
    if (text_markdown != null)  row.text_markdown  = text_markdown;
    if (char_count != null)     row.char_count     = char_count;
    if (qc_score != null)       row.qc_score       = qc_score;
    if (model != null)          row.model          = model;
    if (store_id != null)       row.store_id       = store_id;

    // ─── 6-B. Core 관측축 확정 [CORE-AT-GENERATION-01] ───
    // Core 는 글의 속성이다. URL 의 속성이 아니다.
    //   URL 을 등록하지 않은 글도 생성 순간부터 자기 검색 좌표를 갖는다.
    //   → 🔎 검색 가능 · 관리자 수동관측 후보로 존재. 유령글이 되지 않는다.
    //
    // 계약 (funeral 파일럿 한정):
    //   funeral + cluster 존재 → stripCtpvPrefix(cluster)   예) 서울의료원 장례식장
    //   그 외                  → buildCoreKeyword(region, industry)  예) 강남구 상조
    //   축이 없으면 null → 미저장(기존 legacy 폴백 경로 그대로).
    //
    // ★ cluster 원본은 위에서 가공 없이 저장했다. 여기서만 접두를 뗀다.
    //
    // [FUNERAL-OTHER-MENU-EXPOSURE-01] treatment_id 4번째 인자 전달.
    //   메뉴별 Core 매핑(FUNERAL_MENU_CORE)이 생성 시점에 메뉴를 식별할 수 있어야 한다.
    //   treatment_id 는 위 §4 에서 이미 파싱·§6 에서 이미 저장되던 값 — 신규 배선 0.
    // [HOSPITAL-CORE-AUDIT-01] treatment_name 5번째 인자 전달.
    //   병원군 Core 는 진료과가 아니라 생성 전 선택된 메뉴명이 검색시장이다.
    //   treatment_name 은 위 §4 에서 이미 파싱·§6 에서 이미 저장되던 값 — 신규 배선 0.
    const _core = buildObservationCore(industry, region, cluster, treatment_id, treatment_name);
    if (_core) row.core_keyword = _core;

    // ─── 7. insert ───
    const { data, error } = await supabase
      .from("publish_history")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("[save-generated] insert error:", error);
      return fail(res, 500, error.message, { code: error.code });
    }

    console.log(`[save-generated] ✓ 생성 기록 저장: id=${data.id} / ${String(title).slice(0, 30)}`);
    return res.status(200).json({ ok: true, id: data.id, created_at: data.created_at });
  } catch (e) {
    console.error("[save-generated] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
