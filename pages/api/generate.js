// ============================================================
// generate.js — 업종 라우터 (분기만 담당)
// ⚠️ 이 파일에 업종별 로직 절대 추가 금지
// ⚠️ 새 업종 추가 시: generateXxx.js 생성 → engineBootstrap.js 에 register 1줄
//    (이제 이 파일은 수정 불필요 — Registry.resolve 가 라우팅 테이블)
// ------------------------------------------------------------
// [Spine 전환] if-분기 18줄 → Registry.resolve(industry) 1회.
//   · 라우터는 industry 문자열로 핸들러만 찾는다 (업종 로직 0).
//   · 핸들러 자체는 무수정 — 동일 (req,res) 호출 → 출력 무변화.
// ============================================================

import "../../lib/engineBootstrap";   // 모든 업종 핸들러 register (side-effect)
import { resolve } from "../../lib/engineRegistry";
import { hasPhysicalStore } from "../../lib/industry-catalog"; // [세션39][STORE-01] 매장 유무 게이트
import { getStoreRuntime } from "../../lib/storeRuntimeProvider"; // [D-4-4][A안] 라우터 공통 store 주입
import { buildStoreProfile } from "../../lib/buildStoreProfile"; // [D-4-5a] SoT 조립 (3소스→slots)
import { consumeStoreProfile } from "../../lib/consumeStoreProfile"; // [D-4-5a] View 분배 (CJS named interop)

// ── [세션39][STORE-01] 방문형(출장) 업종 위치/방문정보 스트립 ──────────────
//   방문형(hasPhysicalStore=false · 청소·이사·방역·누수·꽃배달·유치원 출장행사 등 24종)은
//   고객이 업체를 방문하지 않는다 → "찾아오시는 길"·"방문 안내"가 성립하지 않음.
//
//   ★ 라우터에서 1회 스트립 = 핸들러 40+개 전건 무수정(FREEZE 유지).
//     핸들러는 req.body에서 위치 5필드·visit_info를 읽어 후단 블록을 만든다.
//     여기서 빈값으로 만들면 buildLocationBlock/buildVisitBlock 이 "" 반환 → 블록 미생성.
//     (업종 전환 계정의 구 잔존값도 여기서 함께 차단됨 — DB 정리 불필요)
//
//   ⚠ address 는 스트립하지 않는다 — 대표지역 SoT(suggestRegion)·지역키워드의 기반.
//      단 buildLocationBlock 자체에도 industry 게이트가 있어(2중 방어) 블록은 미생성.
//   ⚠ 엔진(prompt/section/scene/QC) 무관 — req.body 필드 5+1개만 비운다.
const _VISIT_STRIP_KEYS = ["map_guide", "transit", "building_desc", "parking_info"];

function stripVisitFieldsIfNoStore(body, industry) {
  if (hasPhysicalStore(industry)) return;   // 매장형 → 무변경
  _VISIT_STRIP_KEYS.forEach(k => { if (k in body) body[k] = ""; });
  body.visit_info = {};                     // 방문정보 13/12필드 전체 무효화
  // address 는 보존(지역 SoT). locationBlock 은 industry 게이트로 이미 차단.
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { program } = req.body;
  if (!program) return res.status(400).json({ error: "프로그램 정보가 없습니다." });

  // ── 업종 결정 ────────────────────────────────────────
  const industry = req.body.industry || process.env.NEXT_PUBLIC_INDUSTRY || "clinic";

  // [STORE-01] 방문형 업종 → 위치 3필드·주차·방문정보 스트립(핸들러 무수정).
  stripVisitFieldsIfNoStore(req.body, industry);

  console.log(`[router] 업종: ${industry} | 시술: ${program.name}`);

  // ── [D-4-4][A안] Store Runtime 공통 주입 ──────────────────────
  //   라우터에서 getStoreRuntime(req) 1회 → req.storeRuntime={account,store} 주입.
  //   · 핸들러(엔진 4파일 FREEZE)는 이 값을 '읽기만' — 직접 호출 없음 → FREEZE 보존.
  //   · 익명/미인증/store 미존재 → {account:null,store:null}. 생성 정상(부작용0).
  //   · 조회 실패해도 생성 차단 금지(try/catch로 흡수) → store=null 로 진행.
  //   ⚠ D-4-5까지 '주입만·소비없음' — 핸들러가 아직 req.storeRuntime.store 를 소비하지 않음.
  //     소비 배선(consumeStoreProfile view 실사용)은 D-4-5에서 별도 진행.
  try {
    req.storeRuntime = await getStoreRuntime(req);
  } catch (e) {
    console.warn("[router] getStoreRuntime 실패(익명 처리):", e?.message);
    req.storeRuntime = { account: null, store: null };
  }

  // ── [D-4-5a] STORE_PROFILE 조립 + View 분배 (주입만 · 소비 없음) ─────
  //   ① buildStoreProfile: req.body + store(runtime) 3소스 → {industry,slots} SoT.
  //   ② consumeStoreProfile: SoT → {promptBody,visitBlock,homepage,aiConsult} View.
  //   ③ req.storeProfile / req.storeProfileView 주입 → 핸들러가 '읽기만' 가능.
  //   ⚠ D-4-5a 종료 범위 = 여기까지. 핸들러/prompts 는 아직 View 미소비(FREEZE 무접촉).
  //      실제 본문 반영(buildPrompt 소비 슬롯)은 D-4-5b에서 prompts 스코프 한정 해제 후 진행.
  //   · store=null(익명)이어도 buildStoreProfile는 req.body만으로 조립(부작용0).
  //   · 조립/분배 실패해도 생성 차단 금지(try/catch 흡수) → 빈 View 로 진행.
  try {
    req.storeProfile = buildStoreProfile({
      industry,
      reqBody: req.body,
      store: req.storeRuntime.store,
    });
    req.storeProfileView = consumeStoreProfile(req.storeProfile);
    console.log(`[router] storeProfile slots=${Object.keys(req.storeProfile.slots).length} view.promptBody=${req.storeProfileView.promptBody.length}`); // [D-4-5a 실증] 검증 후 제거
  } catch (e) {
    console.warn("[router] storeProfile 조립 실패(빈 View 진행):", e?.message);
    req.storeProfile = { industry, slots: {} };
    req.storeProfileView = { promptBody: [], visitBlock: [], homepage: [], aiConsult: [] };
  }

  // industry mismatch detection (observe only)
  if (program.industry && program.industry !== industry) {
    console.warn(`[router] MISMATCH: industry=${industry} | program.industry=${program.industry} | name: ${program.name}`);
  }

  // ── Registry 조회 1회 → 업종별 독립 핸들러로 라우팅 ──
  const handle = resolve(industry);
  if (!handle) {
    return res.status(400).json({ error: `지원하지 않는 업종: ${industry}` });
  }

  try {
    return handle(req, res);
  } catch (err) {
    console.error(`[router] ${industry} 오류:`, err);
    return res.status(500).json({ error: err.message || "글 생성 중 오류가 발생했습니다." });
  }
}
