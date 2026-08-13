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
import { supabaseAdmin } from "../../lib/supabaseAdmin"; // [FUNERAL-PUBLIC-RUNTIME-INJECT-01] 공공 장례식장 정본 조회

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

// ── [SELF-CLOSING-POST-GATE-01] 생성 후 자가 마무리 단락 1개 제거 ──────────
//   배경: S152 프롬프트 3층(A·L761 / B·L734 / C·L39) 전부 FAIL.
//     지시를 빼도 재현율이 내려가지 않았다 → 프롬프트가 아니라 생성 후 처리로 닫는다.
//
//   ★ 엔진 FREEZE 무접촉. generateFuneral.js 무수정.
//     라우터에서 res.json 을 1회 프록시해 out.text/textMarkdown/content 만 치환한다.
//     롤백 단위 = 이 파일 1개.
//
//   구조 조건(창): [마지막 이미지태그 다음 단락] ~ [■ 정보블럭 직전]
//     · ■ 이하 이용안내(주소·빈소·안치)·해시태그·이미지태그는 창 밖 → 구조적으로 접근 불가.
//     · Facts 전량이 ■ 블럭 안이므로 Facts 삭제 경로 자체가 없다.
//
//   의미 조건 3개 AND (하나라도 불충족 → 보존):
//     (v1의 M1·M2는 아래 v2 개정에서 대체됨 — 실제 발동 조건은 v2 주석 참조)
//
//   ★ 창 안 후보가 2개 이상이면 전량 보존(과삭제 방지) — 삭제는 최대 1단락.
//   실측(B 10표본): 재현 2/2 제거 · 정상 General Asset 오삭제 0/8.
// ── v2 개정 (S154) — M1 삭제 (→ v3에서 window·가드 재정의) ────────────────────────────────────────────
//   M1(도메인어 0 · 숫자 0)은 SELF-CLOSING을 거르지 못하고 놓치는 방향으로 작동했다.
//     · 축약 hallName("서울의료원 장례식장") → split(hallName) 미제거 → 도메인어 잔류
//     · "시설" 한 단어 잔류로 탈락
//   어휘 목록으로 생성물을 분류하는 방식의 한계. 분류축은 문장의 형태로 옮긴다.
//
//   20표본 전수 대조 — 창 안 단락은 두 종류뿐이며 형태로 완전 분리된다:
//     General Asset (8건) : 6~8문장 · 174~244자 · 수혜종결 0/8 (3인칭 서술 종결)
//     SELF-CLOSING  (4건) : 1~2문장 ·  28~ 60자 · 수혜종결 4/4
//
// ── v3 개정 (S154) — window 확대 + 숫자 가드 ─────────────────────────────
//   v2 FAIL 원인은 판정식이 아니라 탐색 범위였다.
//     GATE2 10표본에서 마지막 이미지태그가 ■ 바로 앞에 붙어 창이 0단락(9/10).
//     SELF-CLOSING(#7·#9)은 두 이미지태그 '사이'에 있어 판정 자체에 도달하지 못했다.
//
//   v3 최종 조건:
//     WINDOW  [첫 이미지태그 다음] ~ [■ 직전]   · 이미지태그 줄은 후보에서 제외
//     G  숫자 포함 단락은 보존 (정보 가드)
//     M2′ 수혜종결 보유
//     M3′ 3문장 이하 && 120자 이하
//     삭제는 최대 1단락 (후보 2개 이상 → 전량 보존)
//
//   ★ G가 어휘 목록(구 M1)의 자리를 대신한다. 창 확대로 다시 노출되는 Facts 단락
//     (「…신내로 156입니다. … 참고하시면 됩니다」 74자·2문장)은 M2′·M3′를 통과하므로
//     숫자 하나로만 막는다. 도메인어 목록은 부활시키지 않는다 — 축약 표기에 뚫린 방식이다.
//   실측(GATE2 10표본 역적용): 제거 2/2 · 오삭제 0/8 · Facts 손상 0.
const _SC_BENEFIT = /(도움이 되|바랍니다|되시길|참고하시)/;

function _scIsSelfClosing(para) {
  if (/\d/.test(para)) return false;                                       // G 정보 가드
  const m2 = _SC_BENEFIT.test(para);                                       // 수혜종결
  const m3 = (para.match(/다\./g) || []).length <= 3 && para.length <= 120; // 분량
  return m2 && m3;
}

function applySelfClosingGate(text, hallName) {
  if (typeof text !== "string" || !text) return { out: text, removed: null };
  const lines = text.split("\n");
  const idx = lines.map((l, i) => [i, l.trim()]).filter(([, t]) => t);   // 비어있지 않은 줄만

  const infoAt = idx.findIndex(([, t]) => t.startsWith("■"));
  if (infoAt < 0) return { out: text, removed: null };                    // 정보블럭 없음 → 무처리

  const before = idx.slice(0, infoAt);
  const imgAt = before.findIndex(([, t]) => t.startsWith("[이미지"));      // ★ v3: 첫 이미지태그
  if (imgAt < 0) return { out: text, removed: null };                     // 이미지태그 없음 → 무처리

  const win = before.slice(imgAt + 1).filter(([, t]) => !t.startsWith("[이미지")); // 창(태그 줄 제외)
  const hits = win.filter(([, t]) => _scIsSelfClosing(t));
  if (hits.length !== 1) return { out: text, removed: null };             // 0개 또는 2개↑ → 보존

  const lineNo = hits[0][0];
  lines.splice(lineNo, 1);
  if (lines[lineNo] === "" && lines[lineNo - 1] === "") lines.splice(lineNo, 1); // 빈 줄 1개 정리
  return { out: lines.join("\n"), removed: hits[0][1] };
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

  // ── [FUNERAL-PUBLIC-RUNTIME-INJECT-01] 장례식장 공공데이터 런타임 주입 ──────
  //   구조: 사용자는 장례식장을 '선택'만 한다. Facts 정본은 funeral_halls_public(서버) 하나.
  //     선택 → 이 회차 요청 동안만 기존 소비 규약 모양(visit_info.funeralHalls[])으로 조립 → 폐기.
  //
  //   ★ DB 저장 0. store_profiles.visit_info 는 읽지도 쓰지도 않고 원본 그대로 남는다.
  //     여기서 바꾸는 것은 요청 1회 수명의 메모리 객체(req.storeRuntime.store)뿐이다.
  //   ★ FREEZE 무접촉. generateFuneral.js:102 matchFuneralHall 이 읽는 경로를 그대로 채운다 —
  //     소비단은 자기가 보는 값의 출처가 바뀐 사실을 모른다(hallName 완전일치 1건 규약 불변).
  //   ★ 결정론 원칙: 조회 성공=[public] / 실패=[] 로 고정.
  //     실패 시 기존 저장본을 살리면 "공공 조회 실패인데 과거 수동 Facts로 조용히 폴백"하는
  //     이중 출처가 되고, 422 발생 여부가 계정 데이터 상태에 따라 갈린다. 그래서 빈 배열이다.
  //     빈 배열 = MISMATCH-GUARD-01(generateFuneral.js:264) 미발동 → Facts 없는 일반 안내글로 생성.
  //   ★ 게이트 2조건(industry==="funeral" && hallName 존재) — 타 업종은 index.js isHall 게이트로
  //     hallName="" 이라 진입 자체가 불가. 영향 0.
  if (industry === "funeral" && String(req.body.hallName || "").trim()) {
    const _hallName = String(req.body.hallName).trim();
    let _publicHall = null;
    try {
      const { data } = await supabaseAdmin
        .from("funeral_halls_public")
        .select("name, address, parking, halls, mortuary")
        .eq("name", _hallName)
        .limit(1)
        .maybeSingle();
      _publicHall = data || null;
    } catch (e) {
      console.warn("[funeral-inject] public 조회 실패(Facts 없이 진행):", e?.message);
    }

    // store=null(익명/미등록)이어도 소비 경로가 성립하도록 객체를 세운다.
    //   ⚠ visit_info 는 spread 로 보존 — 13키(lunchHours·reservation·parkingOps 등)를 잃으면
    //     buildStoreProfile VISIT_INFO_MAP slot 이 통째로 사라진다(생성 결과 회귀).
    const _store = req.storeRuntime.store || {};
    req.storeRuntime.store = {
      ..._store,
      visit_info: {
        ...(_store.visit_info && typeof _store.visit_info === "object" ? _store.visit_info : {}),
        funeralHalls: _publicHall ? [_publicHall] : [],
      },
    };
    console.log(`[funeral-inject] ${_hallName} → ${_publicHall ? "public matched" : "no public facts"}`);
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

  // ── [SELF-CLOSING-POST-GATE-01] 응답 프록시 (funeral + hallName 경로 한정) ──
  //   Gate 1회 계산 → text/textMarkdown/content 3필드에 동일 결과 주입.
  //   title·qc 무접촉. 타 업종·hallName 미지정은 프록시 자체를 걸지 않는다(영향 0).
  //   ⚠ 실측: generateFuneral.js L375 성공 응답은 res.status(200).json({ title, text,
  //     textMarkdown, content, qc }) 단일 경로이고 3필드는 동일 out 참조 → 1회 계산이면 충분.
  if (industry === "funeral" && String(req.body.hallName || "").trim()) {
    const _hallName = String(req.body.hallName).trim();
    const _origJson = res.json.bind(res);
    res.json = (payload) => {
      try {
        if (payload && typeof payload.text === "string") {
          const { out, removed } = applySelfClosingGate(payload.text, _hallName);
          if (removed) {
            payload.text = out;
            if (typeof payload.textMarkdown === "string") payload.textMarkdown = out;
            if (typeof payload.content === "string") payload.content = out;
            console.log(`[SELF-CLOSING-POST-GATE-01] removed: ${removed.slice(0, 60)}`);
          }
        }
      } catch (e) {
        console.warn("[SELF-CLOSING-POST-GATE-01] 스킵(원문 유지):", e?.message);
      }
      return _origJson(payload);
    };
  }

  try {
    return handle(req, res);
  } catch (err) {
    console.error(`[router] ${industry} 오류:`, err);
    return res.status(500).json({ error: err.message || "글 생성 중 오류가 발생했습니다." });
  }
}
