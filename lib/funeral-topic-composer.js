// ════════════════════════════════════════════════════════════════════
// [FUNERAL-BODY-TOPIC-COMPOSER-01] 주제 조립기 — 신규 경로. 기존 경로 무수정.
//
//   ★ 왜 별도 파일인가:
//     기존 _flowHall(hasFacts=true) 는 "제공된 문장을 하나도 빼지 말고 전부 써라"는
//     계약이다. 본 Composer 는 "Fact 를 문장으로 써라"는 다른 계약이다.
//     두 계약을 한 함수에 넣으면 이번 실험이 BODY 확장이 아니라 기존 시설 Facts
//     경로의 회귀 실험까지 겸하게 된다. 물리적으로 분리한다.
//
//   ★ funeral-prompts.js 절개는 3줄뿐이다(import 1 / plan 1 / 분기 1).
//     _flowHall · _flowBereaved · _pickGeneralAssetSentences ·
//     pickPracticalSentences · _renderPracticalAssets · _axisHallSelect 는 무수정이다.
//     이 파일은 그 함수들을 호출하지도, 복제하지도 않는다(S1 잠금 문구만 자체 보유).
//
//   ★ 슬롯 구조 (S164 승인)
//     S1 hallFacts   150~250자  1     — 값 서술. 해석 금지
//     S2 TOPIC       300~450자  1 필수
//     S3 TOPIC       200~300자  0~1   — linkType 있을 때만
//     S4 PRACTICAL   100~180자  0~4문장 — 완성 문장 그대로
//     S5 DEFINITION    0~80자   0~2문장 — 완성 문장 그대로
//
//   ★ 결합 규칙 현행 상태
//     R1 S2 정확히 1개                                    — 구현
//     R2 S3 는 linkType 존재 시만. 없으면 null            — 구현
//     R3 지역 구속 fact 는 hall 지역 일치 시에만 후보 진입 — 구현(도달 차단)
//     R4 S4 는 S2/S3 themeId 일치 문장만 0~4. 하한 없음    — 구현(S165 개정판)
//     R5 S5 는 S2 에 처음 등장한 용어만 최대 2문장         — 구현
//     R6 동일 hall 직전 3편 themeId 재선택 금지            — DEFER (S165 판정)
//        이력 입력 경로가 없고, GENERAL theme 이 2개뿐이라 자산보다 규칙이 커진다.
//        N=20 Runner 가 선택 이력을 기록만 하고, 관측 후 형태를 정한다.
//
//   ★ BLOCKLIST 는 구조로 강제된다. S3 는 S2 와 동일 theme 안에서만 뽑으므로
//     "안심상속 × 화장절차", "24시간 × 사망신고" 같은 교차 조합은 발생 경로가 없다.
//     "서울요금 × 부산반환" 은 R3 지역 필터가 후보 단계에서 제거한다.
// ════════════════════════════════════════════════════════════════════

import {
  FUNERAL_TOPIC_ASSETS,
  FUNERAL_QUALIFICATIONS,
} from "./funeral-topic-assets.js";
import {
  FUNERAL_GENERAL_ASSETS,
  FUNERAL_PRACTICAL_ASSETS,
} from "./funeral-general-assets.js";

// ── 옵션 — Runner 전용 주입구 ────────────────────────────────────────
//   ★ buildPrompt 의 인자를 늘리지 않기 위한 장치다. 실운영은 기본값으로 돈다.
//     Runner(N=20 실험)만 setTopicComposerOptions 로 rng·조건부 개방을 바꾼다.
const _OPTS = {
  rng: Math.random,
  allowConditional: false, // RECIPIENT_SUPPORT 는 CONDITIONAL. 기본 비활성
  onSelect: null,          // (plan) => void. Runner 관측 훅. 생성에 개입하지 않는다
};



export function setTopicComposerOptions(patch = {}) {
  Object.assign(_OPTS, patch);
}

export function resetTopicComposerOptions() {
  _OPTS.rng = Math.random;
  _OPTS.allowConditional = false;
  _OPTS.onSelect = null;
}

// ── theme 종류 ──────────────────────────────────────────────────────
//   GENERAL     = 사용자 자격정보 없이 선택 가능
//   CONDITIONAL = 제목·INTENT·입력으로 조건이 명시됐을 때만
//   ★ 일반 장례식장 글에 수급자 이야기가 튀어나오면 안 된다.
const THEME_KIND = {
  CREM_TIMING: "GENERAL",
  POST_DEATH_ADMIN: "GENERAL",
  RECIPIENT_SUPPORT: "CONDITIONAL",
};

// ── S2 블록 — 한 편의 메인 주제 단위 ─────────────────────────────────
//   ★ 블록 정의는 Composer 소관이다. 자산 파일에 넣지 않는다.
//     자산은 사실의 창고이고, "무엇을 한 편으로 묶는가"는 편집 결정이다.
const S2_BLOCKS = [
  { key: "CREM_24H",       themeId: "CREM_TIMING",       ids: ["TC-CREM-01", "TC-CREM-02", "TC-CREM-03", "TC-CREM-04", "TC-CREM-05"] },
  { key: "CREM_FILING",    themeId: "CREM_TIMING",       ids: ["TC-CREM-06", "TC-CREM-07", "TC-CREM-08", "TC-CREM-09", "TC-CREM-10", "TC-CREM-11"] },
  { key: "CREM_REOPEN",    themeId: "CREM_TIMING",       ids: ["TC-CREM-12", "TC-CREM-13", "TC-CREM-14"] },
  // ★ [S2-MINIMUM-DENSITY-01] CREM_AFTER 는 S2 후보에서 제외했다. 아래 S3_BLOCKS 로 이동.
  //   Fact 3건·110자로 6개 블록 중 유일한 최악값이고 S3 결합 상대도 없어,
  //   이 블록이 메인 주제로 뽑히면 어떤 규칙으로도 BODY 가 500자대에 갇힌다.
  //   묶음 자체가 틀린 게 아니라 "화장 후"라는 후속 정보가 메인 자리를 차지한 것이 문제였다.
  //   자산은 무수정이다. 역할만 S2 → S3 로 바꾼다.
  { key: "ADMIN_DOC",      themeId: "POST_DEATH_ADMIN",  ids: ["TC-ADMIN-01", "TC-ADMIN-02", "TC-ADMIN-03", "TC-ADMIN-04", "TC-ADMIN-05"] },
  { key: "ADMIN_ACTOR",    themeId: "POST_DEATH_ADMIN",  ids: ["TC-ADMIN-06", "TC-ADMIN-07", "TC-ADMIN-08", "TC-ADMIN-09", "TC-ADMIN-10"] },
  { key: "RECIP_TARGET",   themeId: "RECIPIENT_SUPPORT", ids: ["TC-RECIP-01", "TC-RECIP-02", "TC-RECIP-03", "TC-RECIP-04", "TC-RECIP-05"] },
  { key: "RECIP_APPLICANT", themeId: "RECIPIENT_SUPPORT", ids: ["TC-RECIP-06", "TC-RECIP-07", "TC-RECIP-08", "TC-RECIP-09"] },
  { key: "RECIP_PROCESS",  themeId: "RECIPIENT_SUPPORT", ids: ["TC-RECIP-10", "TC-RECIP-11", "TC-RECIP-12", "TC-RECIP-13", "TC-RECIP-14", "TC-RECIP-15"] },
];

// ── S3 블록 — 보조 주제. linkType 이 정의된 것만 존재한다 ─────────────
//   ★ S3 는 S2 와 같은 theme 안에서만 뽑는다. 교차 theme 조합은 만들지 않는다.
//     from 은 이 S3 가 붙을 수 있는 S2 블록 키다. 목록 밖이면 결합하지 않는다.
const S3_BLOCKS = [
  {
    key: "CREM_SYSTEM", themeId: "CREM_TIMING", linkType: "TEMPORAL_NEXT",
    from: ["CREM_24H", "CREM_FILING", "CREM_REOPEN"],
    ids: ["TC-CREM-18", "TC-CREM-19", "TC-CREM-20", "TC-CREM-21"],
  },
  {
    // [S2-MINIMUM-DENSITY-01] S2 에서 강등. 화장 절차 뒤에 실제로 이어지는 처리라 TEMPORAL_NEXT 다.
    key: "CREM_AFTER", themeId: "CREM_TIMING", linkType: "TEMPORAL_NEXT",
    from: ["CREM_24H", "CREM_FILING", "CREM_REOPEN"],
    ids: ["TC-CREM-15", "TC-CREM-16", "TC-CREM-17"],
  },
  {
    key: "ADMIN_INHERIT_CORE", themeId: "POST_DEATH_ADMIN", linkType: "SAME_TRANSACTION",
    from: ["ADMIN_DOC", "ADMIN_ACTOR"],
    ids: ["TC-ADMIN-11", "TC-ADMIN-12", "TC-ADMIN-13", "TC-ADMIN-14"],
  },
  {
    key: "ADMIN_INHERIT_RANK", themeId: "POST_DEATH_ADMIN", linkType: "SAME_TRANSACTION",
    from: ["ADMIN_DOC", "ADMIN_ACTOR"],
    ids: ["TC-ADMIN-15", "TC-ADMIN-16", "TC-ADMIN-17", "TC-ADMIN-18", "TC-ADMIN-19"],
  },
  {
    key: "RECIP_QUALIFY", themeId: "RECIPIENT_SUPPORT", linkType: "SAME_QUALIFICATION",
    from: ["RECIP_TARGET", "RECIP_APPLICANT", "RECIP_PROCESS"],
    ids: ["TC-RECIP-16", "TC-RECIP-17", "TC-RECIP-18", "TC-RECIP-19", "TC-RECIP-20"],
  },
];

// ── R5 용 용어 사전 — S2 에 실제로 등장한 용어만 연다 ────────────────
//   ★ 억지매칭 방지: fact 문자열에 용어가 문자 그대로 나올 때만 후보가 된다.
const TERM_TO_ASSET = {
  빈소: "hallRole", 안치실: "mortuaryRole", 입관: "encoffinDef", 발인: "funeralDepartDef",
  조문: "condolence", 부고: "obituary", 영정: "portrait", 상주: "chiefMourner",
  방명록: "guestbook", 장례식장: "funeralHome", 성복: "mourningRite",
  조문객: "mourner", 상례: "funeralTerm", 운구: "bier", 분향: "condolenceAct",
  헌화: "condolenceAct", 조화: "condolenceFlower",
};

// ── 지역 판정 (R3) ──────────────────────────────────────────────────
//   hall 의 주소에서 광역 단위만 뽑는다. 값이 없으면 지역 구속 fact 는 전부 탈락한다.
const _REGION_ALIAS = [
  ["서울특별시", ["서울특별시", "서울시", "서울"]],
  ["부산광역시", ["부산광역시", "부산시", "부산"]],
];

export function hallRegion(hallFacts) {
  const addr = String(hallFacts?.address || "").trim();
  if (!addr) return null;
  for (const [canon, aliases] of _REGION_ALIAS) {
    for (const a of aliases) if (addr.startsWith(a)) return canon;
  }
  return null;
}

// scope 별 적격 판정 — 후보 진입 자체를 막는 1층 방어.
function _factEligible(asset, region) {
  switch (asset.scope) {
    case "NATIONAL":
    case "NATIONAL_SYSTEM":
      return true;
    case "REGION_ORD":
      return !!region && asset.scopeKey === region;
    case "QUALIFY_X_REGION": {
      const r = asset.scopeKey && typeof asset.scopeKey === "object" ? asset.scopeKey.region : null;
      return r === null ? true : !!region && r === region;
    }
    case "FACILITY_OP":
      return false; // 이번 자산에 없다. 들어와도 시설 일치 판정 전까지 열지 않는다
    default:
      return false;
  }
}

const _byId = new Map(FUNERAL_TOPIC_ASSETS.map((a) => [a.id, a]));

function _resolveBlock(block, region) {
  const facts = block.ids.map((id) => _byId.get(id)).filter(Boolean).filter((a) => _factEligible(a, region));
  return facts.length ? { ...block, facts } : null;
}

function _pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── R4 — S4 PRACTICAL 선택 ──────────────────────────────────────────
//   ★ S165 개정판: 하한 없음. 일치 문장 수만큼 0~4문장.
//     최소 개수를 맞추기 위한 UNTAGGED 대체·억지매칭을 하지 않는다.
function _pickPractical(themeIds, rng, cap = 4) {
  const pool = [];
  for (const key of Object.keys(FUNERAL_PRACTICAL_ASSETS)) {
    const axis = FUNERAL_PRACTICAL_ASSETS[key];
    axis.sentences.forEach((s, idx) => {
      const tags = Array.isArray(s.themeIds) ? s.themeIds : [];
      if (tags.some((t) => themeIds.includes(t))) {
        pool.push({ axis: axis.id, key, idx, text: s.t });
      }
    });
  }
  // 무작위로 고르되, 출력 순서는 축 번호(P1 접수 → P6 형태) 오름차순으로 고정한다.
  // 셔플 그대로 넘기면 발인 문장이 접수 문장보다 앞에 놓여 시간 역행 글이 나온다.
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled
    .slice(0, cap)
    .sort((a, b) => (a.axis === b.axis ? a.idx - b.idx : a.axis < b.axis ? -1 : 1));
}

// ── R5 — S5 DEFINITION 선택 ─────────────────────────────────────────
//   S2 본문에 문자 그대로 등장한 용어만, 정의 문장으로만, 최대 2문장.
function _pickDefinitions(s2facts, cap = 2) {
  const body = s2facts.map((f) => f.fact).join(" ");
  const used = new Set();
  const out = [];
  for (const term of Object.keys(TERM_TO_ASSET)) {
    if (out.length >= cap) break;
    if (!body.includes(term)) continue;
    const key = TERM_TO_ASSET[term];
    if (used.has(key)) continue;
    const asset = FUNERAL_GENERAL_ASSETS[key];
    const def = asset?.sentences?.find((s) => s.g === "definition");
    if (!def) continue;
    used.add(key);
    out.push({ key, term, text: def.t });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════
// composeTopicPlan — 계획 산출. 실패 시 null 을 돌려 기존 경로로 넘긴다.
//   ★ 생성을 막지 않는다. null 이면 buildPrompt 가 _flowHall(true, ...) 로 간다.
// ════════════════════════════════════════════════════════════════════
export function composeTopicPlan(hallFacts) {
  const rng = typeof _OPTS.rng === "function" ? _OPTS.rng : Math.random;
  const region = hallRegion(hallFacts);

  // R1 — S2 후보. CONDITIONAL theme 은 기본적으로 열지 않는다.
  const s2cands = S2_BLOCKS
    .filter((b) => (THEME_KIND[b.themeId] === "GENERAL" || _OPTS.allowConditional))
    .map((b) => _resolveBlock(b, region))
    .filter(Boolean);

  if (!s2cands.length) {
    const plan = null;
    if (typeof _OPTS.onSelect === "function") {
      _OPTS.onSelect({ plan, reason: "no_eligible_s2", region });
    }
    return plan;
  }

  const s2 = _pick(s2cands, rng);

  // R2 — S3 는 linkType 이 정의된 결합만. 없으면 null. 미달이어도 채우지 않는다.
  const s3cands = S3_BLOCKS
    .filter((b) => b.themeId === s2.themeId && b.from.includes(s2.key))
    .map((b) => _resolveBlock(b, region))
    .filter(Boolean);
  const s3 = s3cands.length ? _pick(s3cands, rng) : null;

  const themeIds = [...new Set([s2.themeId, s3 ? s3.themeId : null].filter(Boolean))];

  const plan = {
    themeId: s2.themeId,
    themeIds,
    region,
    s2: { key: s2.key, facts: s2.facts.slice(0, 6) },
    s3: s3 ? { key: s3.key, linkType: s3.linkType, facts: s3.facts.slice(0, 5) } : null,
    s4: _pickPractical(themeIds, rng),       // R4 — 0~4. 하한 없음
    s5: _pickDefinitions(s2.facts),          // R5 — 0~2
  };

  if (typeof _OPTS.onSelect === "function") _OPTS.onSelect({ plan, reason: "ok", region });
  // [DIRECTION-CONFLICT-01] 관측 로그. 선택에 개입하지 않는다. 사후 판정에 selected id 가 필요하다.
  console.log(`[TOPIC-COMPOSER] theme=${plan.themeId} S2=${plan.s2.key}(${plan.s2.facts.map((f) => f.id).join("+")}) S3=${plan.s3 ? `${plan.s3.key}/${plan.s3.linkType}(${plan.s3.facts.map((f) => f.id).join("+")})` : "null"} S4=${plan.s4.length} S5=${plan.s5.length} region=${region || "-"}`);
  return plan;
}

// ════════════════════════════════════════════════════════════════════
// flowHallTopic — 프롬프트 렌더. buildPrompt 의 flow 자리에 들어간다.
//   ★ 계약이 두 가지라 블록을 물리적으로 분리하고 각 블록 머리에 계약을 밝힌다.
//     [주제 정보층] = 사실을 문장으로 쓴다   (LLM 이 문장화)
//     [실용 안내층] = 문장을 그대로 쓴다     (LLM 이 재작성 금지)
//     [일반 정보층] = 문장을 그대로 쓴다     (LLM 이 재작성 금지)
//     섞이면 LLM 이 실용 안내 문장까지 다시 쓴다.
// ════════════════════════════════════════════════════════════════════
function _renderTopicBlock(title, facts, extra = "") {
  const lines = facts
    .map((f) => `  \u00b7 ${f.fact}${f.statute ? `  (근거: ${f.statute})` : ""}`)
    .join("\n");
  return `${title}
${lines}
${extra}`;
}

function _qualificationNote(facts) {
  const keys = new Set();
  for (const f of facts) {
    const k = f.scope === "QUALIFY_X_REGION" && f.scopeKey && typeof f.scopeKey === "object"
      ? f.scopeKey.qualification : null;
    if (k && FUNERAL_QUALIFICATIONS[k]) keys.add(k);
  }
  if (!keys.size) return "";
  const lines = [...keys].map((k) => {
    const q = FUNERAL_QUALIFICATIONS[k];
    return `  \u00b7 ${q.label} — 제외: ${q.excludes.join(", ")}`;
  }).join("\n");
  return `
- \u2605 자격 축약 금지. 아래 표기를 그대로 쓴다. "수급자" "기초생활수급자" 로 줄이지 않는다.
${lines}`;
}

export function flowHallTopic(treatment, plan) {
  const _TOPIC_CONTRACT = `
- 허용 작업: 사실 하나를 여러 문장으로 나누기 / 조건·대상·예외를 문장 안에 풀어 쓰기 /
  두 사실의 순서를 정해 이어 쓰기.
- \u2605 사실에 적혀 있지 않은 이유·목적·근거를 붙이지 않는다.
  "~때문에" "~를 위해" "~에 따른 것입니다" 로 문장을 늘리지 않는다.
- \u2605 사실에 순위나 무게를 매기지 않는다. 사실을 소개하는 문장에도 적용된다.
  "중요한" "핵심적인" "특히" "주의가 필요한" 을 쓰지 않는다.
  단락을 "~은 중요합니다"로 열지 않고, 사실의 서술로 바로 시작한다.
- \u2605 사실의 의미 범위 안에서만 풀어 쓴다.
  독자에게 지키라고 권고하거나, 사실에 없는 결과·경고를 덧붙이지 않는다.
- \u2605 사실에 적힌 숫자와 그에 붙은 한정 표현을 빠짐없이 옮긴다.
  금액·기간·시간·나이·순위와 "이하" "이내" "지난 후" "되기 전" "부터"를
  줄이거나 생략하지 않는다. 근거 조문 번호는 본문에 쓰지 않더라도,
  사실 자체에 포함된 숫자와 한정 표현은 생략하지 않는다.
- \u2605 열거를 조건으로 바꾸지 않는다. 사실이 대상을 여러 개 나열하면 나열로 쓰고,
  자격·근거를 밝힌 부분("~의 자격으로", "~에 해당하여")도 함께 옮긴다.`;
  const s2 = _renderTopicBlock("[주제 정보층 — 이 글의 중심. 첫 문장을 읽은 사람이 아래 사실 하나를 이미 알게 되어야 한다. 사실을 예고하는 문장으로 시작하지 않는다]", plan.s2.facts, _TOPIC_CONTRACT);
  const s3 = plan.s3
    ? `\n${_renderTopicBlock("[보조 주제 — 위 주제 다음에 이어 쓴다]", plan.s3.facts)}`
    : "";
  const s4 = plan.s4.length
    ? `\n[실용 안내층 — 아래 문장만 사용한다]
${plan.s4.map((p) => `  \u00b7 ${p.text}`).join("\n")}
- 허용 작업은 하나다: \u2460 문장 순서 배열.
- \u2605 문장을 새로 만들지 않는다. 위 문장 밖의 사실·설명·예시·부연을 쓰지 않는다.
- \u2605 위에 제공된 문장은 하나도 빼지 않고 모두 사용한다.\n`
    : "";
  const s5 = plan.s5.length
    ? `\n[일반 정보층 — 용어의 뜻. 아래 문장만 사용한다]
${plan.s5.map((d) => `  \u00b7 ${d.text}`).join("\n")}
- \u2605 이 문장들을 이어 붙여 단락을 만들지 않는다. 용어가 처음 나오는 자리 근처에 한 문장씩 놓는다.`
    : "";

  return `
[★ 위 지시 무효화 — 이 글에만 적용한다]
- 위 [이 글이 답해야 할 유가족 고민]·[안내 방향]·[도입 훅 예시]·[핵심 키워드]는
  이 글에 적용하지 않는다.
- 이 글의 중심 주제는 아래 [주제 정보층]이다.
- 위 도입 훅을 그대로 쓰거나 변형해서 사용하지 않는다.
- 제공되지 않은 비용·시설·절차 정보를 도입에 추가하지 않는다.

[★ 최상위 규칙 — 사실 보존. 아래 모든 지시보다 우선한다]
- 이 글의 재료는 아래 세 블록이 전부다. 블록 밖의 사실·절차·서류·기관·기한을 쓰지 않는다.
- \u2605 수치 창작 금지: 위 블록에 없는 숫자는 어떤 형태로도 쓰지 않는다.
  날짜·기간·금액·인원·횟수를 추정하거나 "보통 며칠" 같은 관례로 보완하지 않는다.
- \u2605 지역 확대 금지: 특정 지역의 규칙으로 제시된 사실은 그 지역명을 문장 안에 유지한다.
  전국에 통용되는 규칙처럼 서술하지 않는다.
- \u2605 제공된 사실을 요약하거나 합치면서 조건을 떨어뜨리지 않는다.
  "~인 경우에만" "~를 제외하고" 같은 한정은 그대로 남긴다.
- \u2605 근거로 표기된 법령·조문은 문장을 정확히 쓰기 위한 참고다.
  본문에 조문 번호를 나열하지 않는다. 법령 이름 정도까지만 자연스럽게 쓴다.
- \u2605 [확인된 시설 정보]의 값(수치·주소·시설명)을 주제 설명에 끌어들이지 않는다.
  제도·절차의 사실은 특정 시설의 사실이 아니다.${_qualificationNote([...plan.s2.facts, ...(plan.s3 ? plan.s3.facts : [])])}

${s2}${s3}${s4}${s5}

[글 구성 — 이 순서를 지킬 것]
① 시설 정보: [확인된 시설 정보]에 실제로 등록된 항목만 서술하고 그 문장에서 끝낸다.
   등록되지 않은 항목은 언급조차 하지 않는다. 값이 적으면 짧게 끝낸다 — 늘리지 않는다.
   \u2605 값에 평가·판정을 붙이지 않는다("여유롭다", "다양하다" 등 전부 금지). 값 그대로만 쓴다.
   \u2605 값에서 적합성·선택 기준·효과·조문객 규모를 추론하지 않는다.
   \u2605 값을 쓴 뒤 "확인하세요·참고하세요·활용하실 수 있습니다" 류로 잇지 않는다.
   \u2605 없는 정보를 "문의·상담·방문으로 알 수 있다"는 식으로 보완하지 않는다.
② 주제: [주제 정보층]의 사실을 이 글의 중심으로 서술한다. 이 구간이 본문에서 가장 길다.
   ①의 값을 다시 꺼내지 않는다.${plan.s3 ? `
③ 보조 주제: [보조 주제]의 사실을 ②에 이어 서술한다. ②와 같은 사실을 반복하지 않는다.` : ``}
${plan.s3 ? `④` : `③`} 실용 안내: [실용 안내층]과 [일반 정보층]에 제공된 문장을 쓴다.
   \u2605 제공된 문장이 없으면 이 단락을 만들지 않는다. 채우려고 문장을 만들지 않는다.
   \u2605 [일반 정보층]은 보조다. 정의 문장을 연달아 쓰지 않는다.
${plan.s3 ? `⑤` : `④`} 마무리: 마지막 사실의 서술이 곧 글의 마지막 문장이다.
   \u2605 상담·문의·맞춤 안내를 권하는 단락을 만들지 않는다.
   \u2605 닫는 인사·덕담·소감도 쓰지 않는다("도움이 되셨길 바랍니다" 류 전부 금지).
   \u2605 글 전체를 다시 요약하지 않는다.

[비중]
- ①(시설 Facts) = Facts 가 적으면 짧게 끝낸다. 채우려고 추론하지 않는다.
- ②${plan.s3 ? `③` : ``}(주제) = 본문의 중심. 제공된 사실의 수가 곧 분량이다.
- 나머지 = 짧게.

[표현]
- 평가·추천·홍보 표현 금지("깨끗한", "최신", "편리한" 등 주관 형용 금지). 사실 서술만.
- 제도·절차를 설명할 때 독자에게 행동을 지시하지 않는다. 무엇이 정해져 있는지를 쓴다.

[상품 언급 — 전면 금지]
- 상품 구성·상품 연결 문장을 쓰지 않는다. 상품명·가격·구성 비교도 본문에서 다루지 않는다.

[비용 언급 — 이 글에서는 금지]
- 빈소 임대료·식대·용품·화장료 등 비용 항목과 그 변동 요인을 쓰지 않는다.
  요금은 [확인된 시설 정보]에 등록된 항목만 그대로 쓴다.
- 위 블록에 법정 제재 금액이 있으면 그것은 요금이 아니다. 제공된 대로 쓴다.
- "비용은 상담 시 안내" 류 문장도 쓰지 않는다.
`.trim();
}
