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
// [GENERATE-SERVER-QUOTA-BYPASS-01] 서버측 quota 게이트 — 산식 복제 금지.
//   check-quota.js L128~146 과 동일한 함수를 그대로 재사용한다.
import { resolveBillingPeriod } from "../../lib/billing/subscription";
import { countGeneratedInPeriod } from "../../lib/billing/usage";
import { getPlan, DEFAULT_PLAN_ID } from "../../lib/billing/plans";
import { OWNER_UID } from "../../lib/constants";

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
// ── [FUNERAL-HALL-IDENTITY-MERGE-01] 시설명 정규화 · Facts 병합 ──────────────
//   ⚠ _fhKey 는 generateFuneral.js L96 _hallKey 와 동일 규칙이다(공백·구분자 무시 + 소문자).
//     소비단이 non-export 라 import 할 수 없어 규칙만 복제했다.
//     ★ 한쪽만 바꾸면 라우터가 고른 엔트리를 소비단이 못 찾는다 — 반드시 함께 수정한다.
const _fhKey = (s) =>
  String(s || "").replace(/\s+/g, "").replace(/[·ㆍ,()]/g, "").toLowerCase();

// 사용자 입력 우선 병합. 빈 사용자 값은 public 값을 지우지 않는다.
//   · public 만 있음 → public
//   · user 만 있음   → user (공공 조회 실패·모호 시에도 사용자 Facts 는 살린다)
//   · 둘 다 있음     → public 기반 + 사용자 비어있지 않은 값으로 덮어쓰기
//   ★ funeral-prompts.js _HALL_FACT_LABELS 에 없는 키(ctpv·sigungu 등)는 소비단이
//     읽지 않으므로 그대로 실려 있어도 출력에 영향 없다.
function _mergeHallFacts(publicHall, userHall) {
  if (!publicHall && !userHall) return null;
  if (!publicHall) return userHall;
  if (!userHall) return publicHall;
  const out = { ...publicHall };
  for (const k of Object.keys(userHall)) {
    const v = userHall[k];
    if (String(v == null ? "" : v).trim()) out[k] = v;
  }
  return out;
}

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

// ── [B-WARNING-TAIL-GATE-01] 생성 후 경고 꼬리 제거 ────────────────────────
//   배경: baseline N=20 에서 제재 Fact 뒤 경고 부가가 11건. 계열이 2종으로 수렴.
//     B1 독립 경고문 (「이 점 역시 유의하시기 바랍니다」)      → 문장 삭제
//     B2 Fact 꼬리 부착 (「…처할 수 있으니 주의해야 합니다」) → 꼬리 절단 + 어미 복원
//
//   ★ 엔진 FREEZE 무접촉. _TOPIC_CONTRACT / 정보량 헤더 / assets / 프롬프트 무수정.
//     SELF-CLOSING-POST-GATE-01 과 같은 후처리 계층, 별도 함수. 내부에 섞지 않는다.
//
//   ★ B2 문장에는 「1년 이하 / 1천만원 이하」 같은 법정 수치가 함께 들어 있다.
//     문장 통째 삭제 절대 금지. STATUTORY-AMOUNT 5/5 보존을 깨뜨린다.
//
//   fail-safe 4중:
//     1) 경고 술어 사전 10종 닫힌 집합 — 목록 밖 표현 무변경
//     2) 술어 앞부분에 정보 토큰 없음 → B1(삭제) / 있음 → B2(절단)
//     3) 어미 매핑 4종 닫힌 집합 — 매핑 밖 / 후보 2개 이상 무변경
//     4) 문장 단위 숫자·금액·기간 토큰 감소 시 해당 문장 원복
//   실측(baseline N=20 오프라인): 검출 11 → 처리 7(B1 1 / B2 6) · 보류 4
//     숫자 손실 0 · 문장 파손 0 · 정상 문장 오탐 0
// ──────────────────────────────────────────────────────────────────────────
const _WT_WARN = [
  "주의해야 합니다", "주의가 필요합니다", "주의하셔야 합니다",
  "유의하시기 바랍니다", "유의해야 합니다", "유의하셔야 합니다",
  "유념하셔야 합니다", "유념해야 합니다",
  "기억해 주세요", "기억하시기 바랍니다",
];

const _WT_MAP = [
  ["있으니", "있습니다."],
  ["있음을", "있습니다."],
  ["되니", "됩니다."],
  ["것임을", "것입니다."],
];

const _WT_INFO = /[0-9]|(법|령|규칙|서식|조례)|(장관|시장|군수|구청장|지사|경찰|공무원|장례지도사|진흥원|주민센터|정부24)|(신고|신청|첨부|제출|교부|발급|통보|안치|분골|봉안|화장|매장|개장|상속|조회)/;
const _WT_NUMTOK = /\d[\d,]*\s?(?:천만원|만원|원|년|개월|일|시간|구|실|회|순위|호)?/g;

function _wtTokens(s) {
  return (String(s).match(_WT_NUMTOK) || []).slice().sort();
}

function _wtSplitSents(p) {
  const out = [];
  let last = 0;
  for (let i = 0; i + 1 < p.length; i++) {
    if (p[i] === "다" && p[i + 1] === ".") {
      out.push(p.slice(last, i + 2));
      last = i + 2;
      while (last < p.length && /\s/.test(p[last])) last++;
      i = last - 1;
    }
  }
  if (last < p.length) out.push(p.slice(last));
  return out.filter((s) => s.trim());
}

//  returns { text: string|null, kind: "NOCHANGE"|"B1"|"B2"|"AMBIG"|"NOMAP" }
function _wtGateSentence(s) {
  const hits = _WT_WARN.filter((w) => s.includes(w));
  if (hits.length === 0) return { text: s, kind: "NOCHANGE" };
  // 원칙: 경고 술어가 2개 이상이면 무변경
  const total = hits.reduce((n, w) => n + s.split(w).length - 1, 0);
  if (hits.length > 1 || total > 1) return { text: s, kind: "AMBIG" };

  const w = hits[0];
  const head = s.slice(0, s.indexOf(w));

  // B1 — 술어 앞에 정보 토큰 없음 → 문장 삭제
  if (!_WT_INFO.test(head)) {
    if (_wtTokens(s).length > 0) return { text: s, kind: "NOMAP" }; // 가드
    return { text: null, kind: "B1" };
  }

  // B2 — 꼬리 절단 + 어미 복원
  const stem = head.replace(/\s+$/, "").replace(/,$/, "");
  const cands = _WT_MAP.filter(([k]) => stem.endsWith(k));
  if (cands.length !== 1) {
    return { text: s, kind: cands.length > 1 ? "AMBIG" : "NOMAP" };
  }
  const [k, v] = cands[0];
  const out = stem.slice(0, stem.length - k.length) + v;

  // 사후검증 — 숫자·금액·기간 토큰 감소 시 원복
  const a = _wtTokens(s);
  const b = _wtTokens(out);
  if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
    return { text: s, kind: "NOMAP" };
  }
  return { text: out, kind: "B2" };
}

function applyWarningTailGate(text) {
  if (typeof text !== "string" || !text) return { out: text, stats: null };
  const stats = { B1: 0, B2: 0, AMBIG: 0, NOMAP: 0, samples: [] };
  const paras = text.split("\n\n").map((p) => {
    if (p.startsWith("[이미지") || p.startsWith("■") || p.startsWith("#")) return p;
    const kept = [];
    for (const s of _wtSplitSents(p)) {
      const r = _wtGateSentence(s.trim());
      if (r.kind !== "NOCHANGE") {
        stats[r.kind] += 1;
        if (r.kind === "B1" || r.kind === "B2") stats.samples.push(s.trim().slice(0, 60));
      }
      if (r.text !== null) kept.push(r.text);
    }
    return kept.join(" ");
  });
  const changed = stats.B1 + stats.B2 > 0;
  return { out: changed ? paras.join("\n\n") : text, stats: changed ? stats : null };
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

  // ── [GENERATE-SERVER-QUOTA-BYPASS-01] 서버측 월 제공량 게이트 ────────────
  //   배경: 이 라우터에는 quota 검증이 0줄이었다. check-quota 호출처는 index.js(브라우저)뿐이라
  //     API 직접 POST 시 제공량 무제한 우회 + GPT 비용 무방어였다.
  //     "화면에서 작동한다"와 "서버가 막는다"는 다른 판정이다.
  //
  //   ★ 산식을 복제하지 않는다. 3축 전부 check-quota.js 와 같은 함수를 그대로 쓴다.
  //       기간 = resolveBillingPeriod (구독 우선 / 캘린더 폴백)
  //       분자 = countGeneratedInPeriod (baseline + created_at)
  //       분모 = accounts.plan → getPlan
  //     한 줄이라도 다르게 쓰면 "보이는 한도"와 "막히는 한도"가 또 갈라진다.
  //
  //   ★ account===null(익명)은 통과 — storeRuntimeProvider 익명 허용 설계 보존.
  //   ★ owner bypass: requireAccount select 에 role 이 없다(id,auth_user_id,email,plan,status).
  //     OWNER_UID 는 즉시 비교, DB role 조회는 차단 직전 1회만 → 정상 경로 쿼리 증가 0.
  //   ★ resolve() 도달 전이므로 초과 시 GPT 호출 0.
  //   ★ 산정 예외는 통과(fail-open) — 라우터 무중단.
  //     ⚠ GENERATE-QUOTA-FAILOPEN-01 = 출시 차단 등록됨. DB/usage 조회 장애 시 유료 API 가
  //       무제한으로 열린다. 출시 전 fail-closed 전환 판정 필요. 이 주석을 지우지 말 것.
  try {
    const _acc = req.storeRuntime?.account || null;
    if (_acc && Number.isInteger(_acc.id) && _acc.id > 0) {
      const _period = await resolveBillingPeriod(_acc.id);
      const _used   = await countGeneratedInPeriod(_acc.id, _period.start, _period.end);
      const _plan   = getPlan(_acc.plan || DEFAULT_PLAN_ID);

      if (_used >= _plan.monthly_quota) {
        let _bypass = !!(_acc.auth_user_id && _acc.auth_user_id === OWNER_UID);
        if (!_bypass) {
          const { data: _r } = await supabaseAdmin
            .from("accounts").select("role").eq("id", _acc.id).maybeSingle();
          _bypass = _r?.role === "owner";
        }
        if (!_bypass) {
          console.warn(`[router] QUOTA_EXCEEDED account=${_acc.id} used=${_used} quota=${_plan.monthly_quota} basis=${_period.basis}`);
          return res.status(403).json({
            error: "이번 이용기간의 생성 가능 건수를 모두 사용했습니다. 추가 이용을 원하시면 새 이용권을 결제해 주세요.",
            code: "QUOTA_EXCEEDED",
            used: _used,
            quota: _plan.monthly_quota,
            plan_id: _plan.id,
            period_end: _period.end,
          });
        }
      }
    }
  } catch (e) {
    console.warn("[router] quota 산정 예외 — 통과 처리(GENERATE-QUOTA-FAILOPEN-01):", e?.message);
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
  //
  // ── [FUNERAL-HALL-IDENTITY-MERGE-01] S156 STEP2-A ────────────────────────
  //   실측으로 확인된 결함 2건을 함께 닫는다. T2 신규 9필드는 이 축에 넣지 않는다.
  //
  //   ① 오식별 — .eq("name") 단독 식별.
  //      T2 원본 실측: 중복 시설명 27종 / 66행(중앙장례식장 6·시민장례식장 4·제일장례식장 4…).
  //      .limit(1) 이 걸려 있어 어느 지역 시설이 잡힐지는 name 정렬 우연이었다.
  //      = 서울 사용자가 부산 시설의 주차·빈소·안치 값을 받을 수 있는 오정보 경로.
  //      ★ 또한 maybeSingle() 은 2건 이상에서 error 를 내는데 error 를 구조분해하지 않아
  //        로그조차 남지 않았다. 조용히 실패하고 있었다.
  //
  //   ② 사용자 입력 소실 — funeralHalls 전면치환.
  //      Store.js hallEditor 10필드 중 public 에 없는 5필드
  //      (parkingFee·restaurant·facilities·crematorium·memo)가 생성 직전에 사라졌다.
  //      = 입력 UI 는 살아 있는데 소비단에 도달하지 못하는 기능 손실.
  //
  //   ★ 식별자 출처 = 저장된 hall 엔트리의 ctpv/sigungu.
  //     이 두 값은 funeral-halls-search.js 가 같은 테이블에서 내려준 값을 그대로 저장한 것이라
  //     표기 정규화(trim/별칭)가 불필요하다 — 자기 자신과 비교한다.
  //   ★ 구(舊) 저장분에는 ctpv/sigungu 가 없다 → name 단독 폴백. 단 2건 이상이면 '모호'로
  //     판정해 주입하지 않는다. 틀린 Facts 보다 무Facts 가 낫다(장례 업종 오정보 = 신뢰 붕괴).
  //   ★ 병합 규칙: 사용자 입력값(비어있지 않은 것) > public > 없음.
  //     빈 사용자 값이 public 값을 지우지 않는다.
  //   ★ FREEZE 무접촉 — generateFuneral.js / funeral-prompts.js 무수정.
  //     소비단(matchFuneralHall)은 여전히 name 완전일치 1건만 본다. 규약 불변.
  if (industry === "funeral" && String(req.body.hallName || "").trim()) {
    const _hallName = String(req.body.hallName).trim();
    const _key = _fhKey(_hallName);

    // 치환 전에 사용자 저장분을 먼저 읽는다 — 식별자(ctpv/sigungu)와 병합 원본이 여기 있다.
    const _store = req.storeRuntime.store || {};
    const _vi = (_store.visit_info && typeof _store.visit_info === "object") ? _store.visit_info : {};
    const _userHalls = Array.isArray(_vi.funeralHalls) ? _vi.funeralHalls : [];
    const _userHall = _userHalls.find((h) => h && _fhKey(h.name) === _key) || null;

    let _publicHall = null;
    let _ambiguous = false;
    try {
      let _q = supabaseAdmin
        .from("funeral_halls_public")
        .select("ctpv, sigungu, name, address, parking, halls, mortuary, " +
                "restaurant_raw, store_raw, waitroom_raw, disabled_facility_raw")
        .eq("name", _hallName);
      const _ctpv = String(
        req.body.hallCtpv || (_userHall && _userHall.ctpv) || ""
      ).trim();
      const _sig = String(
        req.body.hallSigungu || (_userHall && _userHall.sigungu) || ""
      ).trim();
      if (_ctpv) _q = _q.eq("ctpv", _ctpv);
      if (_sig)  _q = _q.eq("sigungu", _sig);

      // limit(2) — 1건 확정 / 2건 이상 모호 판정용. maybeSingle 미사용(error 은폐 회피).
      const { data, error } = await _q.limit(2);
      if (error) throw error;
      const _rows = Array.isArray(data) ? data : [];
      if (_rows.length === 1) {
        _publicHall = _rows[0];
      } else if (_rows.length > 1) {
        _ambiguous = true;
        console.warn(`[funeral-inject] AMBIGUOUS: "${_hallName}" 동명 다수 · 지역 식별자 없음 → public 주입 생략`);
      }
    } catch (e) {
      console.warn("[funeral-inject] public 조회 실패(사용자 입력만으로 진행):", e?.message);
    }

    // ── [FUNERAL-DETAIL-T2-RECOVERY-01] STEP2-B · T2 편의시설 → 기존 슬롯 조립 ──
    //   ★ _HALL_FACT_LABELS(funeral-prompts.js L408) 기존 9키에 얹는다. 신규 슬롯 0.
    //     소비단(generateFuneral / funeral-prompts) 무수정 — FREEZE 유지.
    //   ★ 설치 → 소비 / 미설치·결측 → 키 자체를 만들지 않는다.
    //     빈 문자열조차 넣지 않아야 funeral-prompts.js L661 「미등록 시설 존재 창작 금지」와
    //     정합하고 '없다'는 서술까지 자동 차단된다(미설치 침묵).
    //   ★ raw 컬럼은 소비단에 넘기지 않는다 — 규약 밖 키가 hallFacts 에 섞이면 안 된다.
    //   ★ 적재 실측(S157): T2 1,117행 중 962행(86.1%) UPDATE. 미매칭 155행은 결측일 뿐
    //     오염이 아니다 — 기존 4필드로 종전과 동일하게 동작한다.
    if (_publicHall) {
      const _on = (v) => String(v || "").trim() === "설치";
      const _fac = [
        _on(_publicHall.store_raw) && "매점",
        _on(_publicHall.waitroom_raw) && "유족대기실",
        _on(_publicHall.disabled_facility_raw) && "장애인편의시설",
      ].filter(Boolean);

      const _rest = _on(_publicHall.restaurant_raw);
      delete _publicHall.restaurant_raw;
      delete _publicHall.store_raw;
      delete _publicHall.waitroom_raw;
      delete _publicHall.disabled_facility_raw;

      if (_rest) _publicHall.restaurant = "있음";
      if (_fac.length) _publicHall.facilities = _fac.join(", ");
      console.log(
        `[funeral-t2] restaurant:${_rest ? "Y" : "-"}` +
        ` / facilities:${_fac.length ? _fac.join("·") : "-"}`
      );
    }

    const _merged = _mergeHallFacts(_publicHall, _userHall);

    // store=null(익명/미등록)이어도 소비 경로가 성립하도록 객체를 세운다.
    //   ⚠ visit_info 는 spread 로 보존 — 13키(lunchHours·reservation·parkingOps 등)를 잃으면
    //     buildStoreProfile VISIT_INFO_MAP slot 이 통째로 사라진다(생성 결과 회귀).
    req.storeRuntime.store = {
      ..._store,
      visit_info: {
        ..._vi,
        funeralHalls: _merged ? [_merged] : [],
      },
    };
    console.log(
      `[funeral-inject] ${_hallName} → public:${_publicHall ? "Y" : (_ambiguous ? "AMBIG" : "N")}` +
      ` / user:${_userHall ? "Y" : "N"} / merged:${_merged ? "Y" : "N"}` +
      ` / idSrc:${String(req.body.hallCtpv || "").trim() ? "body" : ((_userHall && _userHall.ctpv) ? "store" : "none")}`
    );
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
          const wt = applyWarningTailGate(payload.text);
          if (wt.stats) {
            payload.text = wt.out;
            if (typeof payload.textMarkdown === "string") payload.textMarkdown = wt.out;
            if (typeof payload.content === "string") payload.content = wt.out;
            console.log(`[B-WARNING-TAIL-GATE-01] B1=${wt.stats.B1} B2=${wt.stats.B2} hold=${wt.stats.AMBIG + wt.stats.NOMAP}`);
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
