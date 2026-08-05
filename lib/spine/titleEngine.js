// ============================================================
// lib/spine/titleEngine.js
// Platform Spine STEP 3 — Title Engine (공통 제목 조립 Spine) ⭐
// ------------------------------------------------------------
// 역할:
//   풀(titlePatterns/SCENE/MIDDLE/SUFFIX/SEARCHWORD)을 "주입받아"
//   선택 → 토큰치환 → 조립 → 중복검사 → 길이제한 → 빈placeholder정리.
//   풀 자체는 각 엔진 data.js 소유(공통화 금지 — 결합도 폭발 방지).
//
// 소비:
//   - Purpose Registry  : purpose.type(place/menu) 기반 패턴 분기
//   - Region Strategy   : (현재 제목은 region 선두 고정. strategy는 STEP4/본문에서 주로 소비)
//
// 원칙(PHILOSOPHY):
//   - region+menu 선두 고정(원칙1). 매장명 본문/제목 직접노출 금지(Suffix는 예외 토글).
//   - 광고 단정 토큰은 data 풀이 책임(Spine은 조립만).
//
// strict:
//   - purpose label이 주어지면 resolvePurpose로 검증(미등록 throw).
//   - 풀 누락 시 안전 폴백(throw 아님 — 풀은 엔진 자율).
//
// ── v2 확장 (카페 B′ / 한식 C 흡수) ──
//   ① searchword → mid 폴백: pools.SEARCHWORD pick 빈값이면 mid 재활용(카페 동치).
//   ② purposeResolver 콜백: ctx.resolvePurpose 주입 시 Registry strict throw 우회.
//      Registry 밖 자유라벨 엔진(카페 purposeLabel·한식 displayPurpose)이 그대로 통과.
//      미주입이면 기존 strict resolvePurpose 경로(무변경 — 하위호환).
//   ③ FORM 가중선택: pools.FORMS([{id,weight,pattern}]) 주입 시 가중 비복원 선택.
//      {middle} 토큰 + 직전 form 회피(state.lastForm). titlePatterns보다 우선.
//   * menuClass 분기는 Spine 미지원 — 핸들러가 purpose 확정 후 주입(한식 master 본문 SoT 보존).
// ============================================================

import { resolvePurpose as resolvePurposeStrict, PURPOSE_TYPE } from "./purposeRegistry.js";

// ─────────────────────────────────────────────────────────
// 내부 유틸 — 직전값 회피 랜덤 선택
// ─────────────────────────────────────────────────────────
function pickAvoid(arr, avoid) {
  if (!arr || !arr.length) return "";
  if (arr.length === 1) return arr[0];
  let v, g = 0;
  do { v = arr[Math.floor(Math.random() * arr.length)]; g++; }
  while (v === avoid && g < 8);
  return v;
}
function pick(arr) {
  if (!arr || !arr.length) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

// 빈 placeholder 자국·중복 구분자·공백 정리 (｜와 | 양쪽)
function cleanTitle(t) {
  return (t || "")
    .replace(/\s+\|\s*$/g, "")
    .replace(/\s+｜\s*$/g, "")
    .replace(/^\s*\|\s*/g, "")
    .replace(/^\s*｜\s*/g, "")
    .replace(/\|\s*\|/g, "|")
    .replace(/｜\s*｜/g, "｜")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────
// 제목 독립성(중복) 검사
//   prev 토큰(직전 MIDDLE/SUFFIX/완성제목)과 과도 중복 방지.
//   완성 제목이 직전과 동일하면 true(중복).
// ─────────────────────────────────────────────────────────
function isDuplicateTitle(title, prevTitle) {
  if (!prevTitle) return false;
  return cleanTitle(title) === cleanTitle(prevTitle);
}

// ─────────────────────────────────────────────────────────
// buildTitle — 공통 제목 조립 엔트리
//
// @param ctx {
//   region, menu, cat,                 // 필수 토큰
//   situation, purpose,                // purpose=label(Registry 검증)
//   mode,                              // "commercial" | "personal"
//   pools: {                           // 엔진 data.js 주입 (소유 유지)
//     titlePatterns: { purposeLead:[], menuLead:[] } | [string],
//     SCENE: { [menu]:[] }, SCENE_BY_CAT: { [cat]:[] },
//     MIDDLE: [], SUFFIX: [], SEARCHWORD: { [cat]:[], default:[] },
//     FORMS: [{ id, weight, pattern }],   // v2③ 가중 비복원(있으면 titlePatterns보다 우선). {middle} 토큰 지원.
//   },
//   resolvePurpose,                    // v2② (label)=>{label,type,titleLabel}|null. 자유라벨 엔진 strict우회.
//   purposeTitleLabel,                 // 폴백 라벨(엔진 base.titlePurpose 등). Registry 우선.
//   state: { lastMiddle, lastSuffix, lastTitle, lastForm },  // 연속발행 회피(호출측 보관)
//   suffix: { enabled, storeName },    // STEP4 Title Suffix hook (기본 OFF)
//   sceneProbability,                  // SCENE 사용 확률(기본 0.4)
//   maxLen,                            // 길이 제한(기본 40). 초과 시 SUFFIX 제거 후 재시도
// }
// @return { title, state, type }       // state = 갱신된 회피상태(호출측이 다시 보관)
// ─────────────────────────────────────────────────────────
export function buildTitle(ctx) {
  const {
    region = "", menu = "", cat = "",
    situation = "", purpose = "",
    mode = "commercial",
    pools = {},
    purposeTitleLabel = "",
    state = {},
    suffix = { enabled: false, storeName: "" },
    sceneProbability = 0.4,
    maxLen = 40,
    resolvePurpose = null,   // v2②: Registry 밖 자유라벨 우회 콜백. (label)=>{label,type,titleLabel}|null. 미주입=strict경로.
  } = ctx;

  // purpose strict 검증 (미선택 → null, 미등록 → throw)
  //   v2②: ctx.resolvePurpose 주입 시 그 콜백으로 해석(자유라벨 우회). 미주입이면 Registry strict.
  const _resolve = (typeof resolvePurpose === "function") ? resolvePurpose : resolvePurposeStrict;
  const resolved = _resolve(purpose);           // {label,type,titleLabel} | null
  const purType  = resolved ? resolved.type : null;
  const purLabel = (resolved && resolved.titleLabel) || purposeTitleLabel || "";

  const sit = situation || "";

  // ── 1) 패턴 선택: purpose.type 기반 분기 ──
  //   place → purposeLead(가게 수식 우선) / menu → menuLead(메뉴 수식)
  //   titlePatterns가 {purposeLead,menuLead} 형태면 type로 분기,
  //   배열이면 그대로(레거시 호환).
  const tp = pools.titlePatterns;
  let patternPool = [];
  if (Array.isArray(tp)) {
    patternPool = tp;
  } else if (tp && typeof tp === "object") {
    if (purType === PURPOSE_TYPE.MENU && tp.menuLead?.length) {
      patternPool = tp.menuLead;
    } else if (tp.purposeLead?.length) {
      patternPool = tp.purposeLead;
    } else {
      patternPool = tp.menuLead || [];
    }
    // purpose 미선택(null)인데 purposeLead만 있으면 menuLead로(빈 {purpose} 방지)
    if (!resolved && tp.menuLead?.length) patternPool = tp.menuLead;
  }

  // ── 2) 보조축 토큰 (SCENE → cat폴백 → MIDDLE) ──
  const scenePool = (pools.SCENE && pools.SCENE[menu])
                 || (pools.SCENE_BY_CAT && pools.SCENE_BY_CAT[cat])
                 || [];
  const useScene = scenePool.length && Math.random() < sceneProbability;
  const midPool  = useScene ? scenePool : (pools.MIDDLE || []);
  const mid = pickAvoid(midPool, state.lastMiddle);

  // ── 3) 접미 토큰 ──
  const suf = pickAvoid(pools.SUFFIX || [], state.lastSuffix);

  // ── 4) 검색어 (cat 정확매칭 → default → mid 폴백) ──
  //   v2①: SEARCHWORD 풀 없거나 pick 빈값이면 mid 재활용(카페 동치 — {searchword}=mid).
  const swPool = (pools.SEARCHWORD && (pools.SEARCHWORD[cat] || pools.SEARCHWORD.default)) || [];
  const searchword = pick(swPool) || mid;

  // ── 5) 토큰 치환 ──
  //   {middle}=={mid} 별칭(한식 FORM 패턴 호환). 둘 다 같은 mid값으로 치환.
  const fill = (raw) => cleanTitle(
    (raw || "")
      .replace(/\{purpose\}/g, purLabel)
      .replace(/\{region\}/g,  region)
      .replace(/\{menu\}/g,    menu)
      .replace(/\{situation\}/g, sit)
      .replace(/\{searchword\}/g, searchword)
      .replace(/\{middle\}/g,  mid)
      .replace(/\{mid\}/g,     mid)
      .replace(/\{suffix\}/g,  suf)
  );

  // ── 6) 제목 본문 조립 (FORM 가중 → 패턴 → 기본형) ──
  let core = "";
  let usedFormId = state.lastForm;

  // v2③: pools.FORMS 주입 시 가중 비복원 선택(직전 form 회피). titlePatterns보다 우선.
  const forms = pools.FORMS;
  if (Array.isArray(forms) && forms.length) {
    const usable = forms.length > 1
      ? forms.filter(f => f.id !== state.lastForm)
      : forms;
    const fpool = usable.length ? usable : forms;
    const total = fpool.reduce((s, f) => s + (f.weight || 1), 0);
    let r = Math.random() * total;
    let form = fpool[0];
    for (const f of fpool) { r -= (f.weight || 1); if (r <= 0) { form = f; break; } }
    usedFormId = form.id;
    core = fill(form.pattern || `${region} ${menu}`);
  }

  if (!core && patternPool.length) {
    // 직전 완성제목 회피 위해 최대 6회 재추첨
    let g = 0;
    do {
      core = fill(pick(patternPool));
      g++;
    } while (isDuplicateTitle(core, state.lastTitle) && g < 6);
  }
  if (!core) {
    // 기본 폴백: region menu {mid}｜{suf} (commercial) / 후기형 (personal)
    if (mode === "personal") {
      core = cleanTitle(
        `${region} ${menu}${sit ? " " + sit : ""}${purLabel ? "｜" + purLabel : ""} 후기`
      );
    } else {
      core = cleanTitle(`${region} ${menu}${mid ? " " + mid : ""}${suf ? "｜" + suf : ""}`);
    }
  }

  // ── 7) Title Suffix hook (STEP4에서 정책 주입. 기본 OFF) ──
  //   ON: "...추천 | ○○고기집" / OFF: 그대로.
  let title = core;
  if (suffix && suffix.enabled && suffix.storeName) {
    const sep = suffix.separator || " | ";   // 반각 | — 가게명 전용(전각 ｜와 분리)
    title = `${core}${sep}${suffix.storeName}`;
  }

  // ── 8) 길이 제한 ──
  //   초과 시: Suffix(가게명) 먼저 제거(core 보존). core 자체가 초과여도
  //   가게명 꼬리는 떼낸다(검색의도 토큰은 자르지 않음 — 의미훼손 방지).
  if (title.length > maxLen && title !== core) {
    title = core;   // 가게명 제거 → core만
  }

  return {
    title,
    type: purType,
    state: { lastMiddle: mid, lastSuffix: suf, lastTitle: core, lastForm: usedFormId },
  };
}
