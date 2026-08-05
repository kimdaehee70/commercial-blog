// lib/storeRuntimeProvider.js
// ─────────────────────────────────────────────────────────────
// D-4-3b Store Runtime Provider — 생성(generate) 시점의 store_profiles 조회 전용 계층.
//
// 책임 3개 (그 외 금지):
//   ① requireAccount(req) 로 account 해석 (인증)
//   ② store_profiles 1행 조회 (store.js GET 패턴 복제 — SELECT 재사용)
//   ③ { account, store } 반환 → buildStoreProfile(store) 로 직결
//
//   금지: Builder 호출 / Consumer 호출 / slot 조립 / 표현 / store.js(운영 API) 의존.
//         storeRuntimeProvider = Runtime 조회 전용. 운영 CRUD(store.js)와 아키텍처 분리.
//
// 인증 실패 정책 (D-4-3b 확정):
//   throw 금지 · 익명 허용. 토큰 없음/무효/account 없음 → { account:null, store:null }.
//   일반글쓰기(비로그인/구경로)는 store 없이도 생성돼야 함(generateFuneral _locStore 빈값 부작용0 정합).
//
//   ⚠ requireAccount(guards.js, FREEZE)는 실패 시 res.status().json() 직접 전송(방식 b).
//     익명 허용을 위해 여기서 더미 res 를 주입해 응답 전송을 흡수한다(guards 무수정).
//
// store SELECT = store.js GET 의 STORE_SELECT 와 동일 컬럼셋(Builder STORE_TOP_MAP 정합).
//   store.js 는 FREEZE(운영 레이어) — import 하지 않고 컬럼 문자열만 로컬 복제(결합도 0).
// ─────────────────────────────────────────────────────────────

import { supabaseAdmin } from "./supabaseAdmin";
import { requireAccount } from "./guards";

// store.js STORE_SELECT 복제 (결합 회피 — store.js 는 FREEZE, import 금지).
//   Builder STORE_TOP_MAP + VISIT_INFO_MAP 소비 컬럼 전부 포함(visit_info jsonb 포함).
const STORE_SELECT =
  "id, industry, store_name, region, address, sub_region, phone, " +
  "parking_info, business_hours, closed_days, naver_place_url, naver_blog_url, " +
  "map_guide, transit, building_desc, title_suffix_on, visit_info, specialty, " +
  "departments";

// requireAccount 의 res 전송을 흡수하는 더미 res (익명 허용 — guards 무수정 우회).
//   status().json() 체이닝만 no-op 캡처. 실제 응답 전송 없음.
function _silentRes() {
  const sink = {
    statusCode: null,
    status(code) { this.statusCode = code; return this; },
    json() { return this; },
  };
  return sink;
}

/**
 * 생성 시점 store 조회.
 * @param {object} req  - 핸들러 req (Authorization Bearer 토큰 소지 가정, 없으면 익명)
 * @returns {Promise<{ account: object|null, store: object|null }>}
 */
export async function getStoreRuntime(req) {
  // ① 인증 (익명 허용 — 실패 시 null, res 전송은 더미로 흡수)
  const ctx = await requireAccount(req, _silentRes());
  if (!ctx || !ctx.account) {
    return { account: null, store: null }; // 익명/미인증/account 없음 → store 없이 진행
  }
  const { account } = ctx;

  // ② store_profiles 조회 (store.js GET 패턴 복제)
  const { data: store, error } = await supabaseAdmin
    .from("store_profiles")
    .select(STORE_SELECT)
    .eq("account_id", account.id)
    .maybeSingle();

  // 조회 실패/미존재 → store=null (throw 금지). account 는 유지.
  if (error || !store) {
    return { account, store: null };
  }

  // ③ 반환 (Builder store 인자로 직결)
  return { account, store };
}

export default { getStoreRuntime };
