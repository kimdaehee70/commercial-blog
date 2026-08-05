// lib/flooring-prompts.js
// 장판(flooring) 프롬프트 — 정보형 + 시공 안내형. 화자 = {region} 장판 시공 업체.
// ★ 복제 베이스: dobae-prompts.js(세션62 Scene판) 동형. 시그니처 유지:
//     buildSystemPrompt / buildUserPrompt / getImageAlts / getSectionAlt / FORBIDDEN
//   4번째 인자 ctx = { site, material, thickness } (미전달 시 기존 동작 그대로).
//
// ★ [세션60 원칙] 금칙어를 프롬프트에 나열하지 않는다.
//   금지 예시 문구를 프롬프트에 열거하면 GPT 출력에 그대로 복사되는 사례가 확인됐다.
//   → 여기서는 '허용 범위'와 '형태 규칙'만 서술하고, 실제 제거는 핸들러 stripForbidden 이 담당.
//
// ★ [세션62 원칙] Scene 중심 — "도착 → 확인 → 발견 → 판단 → 작업 → 확인 → 다음 공간".
//   도배에서 실측된 실패 패턴을 그대로 차단한다:
//     ① intro 일반론 도입 ② axis1 "확인합니다" 연쇄 ③ axis3 성질 설명
//     ④ closing 추상 마무리 ⑤ 범위·자재·마감이 섹션을 넘나드는 중복
//   → 섹션별 소유 요소를 고정한다.
//
// ★ PHILOSOPHY 정합:
//   원칙1 매장명·브랜드명 본문 직접 노출 금지 → 업체명 미사용(화자만 {region} 장판 시공 업체).
//     ※ 장판 브랜드·두께는 '자재'이지 '매장명'이 아니므로 사용자 입력 시 자재 문맥에서만 허용.
//   원칙3 "지역+키워드" 결합 3회 이하 → 이후 "이 집·현장·해당 구간"으로 자연 치환.
//   원칙4 정보보다 장면(scene) → axis1/axis2 는 SCENE 토큰을 동선으로 전개.

import { FLOORING_FORBIDDEN, formatMaterial, getThicknessNote, getPhotoPool } from "./flooring-data.js";
import { resolveScene } from "./spine/sceneSpine.js";
import { SCENES as LOCAL_SCENES, DEFAULT_CAT as LOCAL_DEFAULT } from "./spine/scenes/flooring.js";

export const FORBIDDEN = FLOORING_FORBIDDEN;

// ── 자재축 분기 [세션71] ────────────────────────────────
//   업종 범위가 '바닥 마감재'(장판 + 마루)로 넓어졌다. 화자·예시 어휘만 cat으로 갈린다.
//   공간축 10 CAT 은 기존 "장판" 그대로 — 출력 무변경.
function tradeOf(cat) {
  return String(cat || "").includes("마루") ? "마루" : "장판";
}

// ── Scene 조회 ──────────────────────────────────────────
//   엔진(resolveScene) 우선. REGISTRY 미등록 시점에도 안전하도록 로컬 테이블로 축퇴한다.
//   ※ STEP 4에서 sceneSpine.js REGISTRY 에 flooring 등록 후에는 엔진 경로가 정상 사용된다.
function getScene(cat) {
  const s = resolveScene("flooring", cat);
  if (s && (s.arrive.length || s.work.length)) return s;
  const t = LOCAL_SCENES[cat] || LOCAL_SCENES[LOCAL_DEFAULT] || {};
  return {
    arrive: Array.isArray(t.arrive) ? t.arrive : [],
    work: Array.isArray(t.work) ? t.work : [],
    basis: Array.isArray(t.basis) ? t.basis : [],
  };
}

// ── 현장정보 문맥 문자열 ────────────────────────────────
//   siteBlock 이 소유한 값(단지명·평형)을 프롬프트 문맥으로만 전달한다.
//   본문 삽입은 핸들러의 insertSiteBeforeHashtags 가 담당(중복 서술 방지).
function siteLine(ctx) {
  const s = (ctx && ctx.site) || {};
  if (!s.siteName) return "";
  const size = s.siteSize ? ` ${s.siteSize}` : "";
  return `- 현장: ${s.siteName}${size} (현장명은 도입부에 1회까지만. 반복 금지)\n`;
}

// 자재·두께 — 장판은 두께(T)가 판단 축이라 문맥 재료로 함께 전달한다.
function materialLine(ctx) {
  const m = formatMaterial(ctx && ctx.material);
  const th = getThicknessNote((ctx && ctx.thickness) || (ctx && ctx.material));
  let out = "";
  if (m) out += `- 사용 자재: ${m} (자재를 설명하는 문맥에서만 사용. 홍보 문구로 쓰지 않는다)\n`;
  if (th) out += `- 두께 판단 재료: ${th.t} — ${th.use} (이 문장을 그대로 옮기지 말고 선택 근거로만 쓴다)\n`;
  return out;
}

// ── 시스템 프롬프트 ─────────────────────────────────────
export function buildSystemPrompt(region, treatment, ctx) {
  const rg = String(region || "").trim();
  const kw = String((treatment && treatment.name) || "").trim();
  const axis = ((treatment && treatment.analysisAxis) || []).join(" · ");
  const trade = tradeOf((treatment && treatment.cat) || "");

  return [
    `당신은 ${rg} 지역에서 일하는 ${trade} 시공 업체의 담당자입니다.`,
    `오늘 다루는 주제는 "${kw}" 입니다.`,
    ``,
    `[글의 성격]`,
    `- 실제 현장에서 확인한 것을 설명하는 정보형 글입니다.`,
    `- 후기·체험담·고객사례 형식이 아닙니다. 감상이나 평가를 쓰지 않습니다.`,
    `- 서비스를 권하거나 문의를 유도하지 않습니다. 판단에 필요한 정보만 전달합니다.`,
    ``,
    `[다룰 수 있는 범위]`,
    `- ${axis || "시공 범위 · 철거·덧방 판단 · 바닥 밑작업 · 두께 선택 · 마감 확인"}`,
    `- 금액은 구체적 숫자 대신 "무엇에 따라 달라지는지"로 설명합니다.`,
    ``,
    `[이 글은 바닥 작업입니다]`,
    `- 벽지·초배·정배 등 벽면 작업 서술로 흘러가지 않습니다. 손은 바닥에서만 움직입니다.`,
    ``,
    `[문장]`,
    `- 실제 사람이 쓴 것처럼 자연스럽게. 문장 길이를 일정하게 맞추지 않습니다.`,
    `- 논문식 연결어나 요약 선언으로 문단을 시작하지 않습니다.`,
    `- 업체명·상호를 본문에 쓰지 않습니다.`,
    `- 종결어미는 "~합니다"로 통일합니다. "~한다" 체를 섞지 않습니다.`,
    `- "${rg}"와 "${kw}"를 함께 묶은 표현은 글 전체에서 3회를 넘기지 않습니다.`,
    `  이후에는 "이 집", "해당 구간", "현장", "이 바닥"처럼 자연스럽게 바꿔 씁니다.`,
    ``,
    siteLine(ctx) + materialLine(ctx),
    `[출력]`,
    `- 소제목·마크다운 기호·해시태그를 쓰지 않습니다. 본문 문단만 출력합니다.`,
  ].join("\n");
}

// ── 섹션별 사용자 프롬프트 ──────────────────────────────
//   섹션 소유 요소 고정:
//     intro=상황 / axis1=현장 발견·판단 / axis2=작업 전개 /
//     axis3=범위·두께 선택 / axis4=시공 후 확인 / closing=마지막 동작

// 섹션 공통 머리말
function base(rg, kw, trade) {
  return [
    `🔒 화자: ${rg} ${trade || "장판"} 시공 업체 1인칭. 업체명·상호는 쓰지 않습니다.`,
    `🔒 이 섹션이 맡은 내용만 씁니다. 다른 섹션이 맡은 내용을 미리 쓰거나 몰아 쓰지 않습니다.`,
    `🔒 금액은 숫자 대신 "무엇에 따라 달라지는지"로만.`,
    ``,
  ].join("\n");
}

export function buildUserPrompt(region, treatment, secKey, ctx) {
  const rg = String(region || "").trim();
  const kw = String((treatment && treatment.name) || "").trim();
  const cat = (treatment && treatment.cat) || "";
  const scene = getScene(cat);

  const arrive = scene.arrive.join(" → ");
  const work = scene.work.join(" → ");
  const basis = scene.basis && scene.basis.length ? scene.basis[0] : null;
  const trade = tradeOf(cat);
  const B = base(rg, kw, trade);

  switch (secKey) {
    case "intro":
      return B + [
        `[Opening — 사건으로 시작]`,
        `"${kw}"를 알아보는 사람이 지금 처한 상황을 한 장면으로 엽니다.`,
        `- ⭕ 사건이 먼저입니다: 바닥이 찍혀 자국이 남았다 / 이사 날짜가 잡혔다 / 가구를 옮기다 들뜬 자리를 봤다 / 영업을 언제 멈출지 정해야 한다.`,
        `- ❌ 일반론 도입 금지: ${trade}가 오래되면 / 세월이 지나면 / 분위기를 바꾸고 싶을 때 — 이런 문장으로 시작하지 마세요.`,
        `- ❌ 인사말·자기소개 금지. 첫 문장은 상황 또는 행동으로 들어갑니다.`,
        `- 마지막 1문장은 현장으로 넘어가는 연결부입니다. 문만 열고 작업을 전개하지 않습니다.`,
        `- ❌ 이 섹션에서 공정·자재·두께·범위·마감을 설명하지 않습니다. 뒤 섹션이 맡습니다.`,
        `- 3~4문장, 200자 내외. 문단을 늘리지 마세요.`,
      ].join("\n");

    case "axis1":
      return B + [
        `[Scene — 현장 진입과 판단]`,
        `현장에 들어가서 바닥을 보며 움직이는 순서를 시간 흐름으로 이어 씁니다.`,
        `- ⭕ 확인 동선을 순서대로 따라갑니다: ${arrive}`,
        `  (이 동선은 "${cat}" 현장의 실제 순서입니다. 토큰을 그대로 나열하지 말고 동작 문장으로 바꿔 씁니다.)`,
        basis
          ? `- 이 흐름을 한 번 통과시킵니다 — 발견: ${basis.발견} / 원인: ${basis.원인} / 제약: ${basis.제약} / 선택: ${basis.선택}\n  항목 형태로 적지 말고, 보이는 것 → 그래서 어떻게 하기로 했는지 순서의 문장으로 풉니다.`
          : `- 무엇이 보였고 그래서 어떻게 하기로 했는지를 한 번은 문장으로 남깁니다.`,
        `- 규칙 1: 한 문장 = 하나의 동작. 연결어("~하며/~면서")로 두 동작을 묶지 마세요.`,
        `- 규칙 2: 같은 서술어를 반복하지 마세요. "확인합니다"를 세 번 쓰지 말고 눌러 봅니다/걷어 봅니다/들춰 봅니다/짚어 봅니다로 바꿉니다.`,
        `- 규칙 3 [확인만 하고 끝내지 않기]: 확인 동작으로만 이어지는 문장이 세 개를 넘지 않게 합니다.`,
        `  [보는 행동] → [무엇이 드러났는지] → [그래서 어떻게 하기로 했는지] 묶음을 최소 두 번 넣습니다.`,
        trade === "마루"
          ? `  예: 가구를 밀어내고 벽 쪽 바닥에 자를 대 봅니다. 가운데보다 한 단 꺼져 있습니다. 이 구간은 판재를 올리기 전에 메우기로 합니다.`
          : `  예: 가구를 밀어내고 가장자리를 들춰 봅니다. 밑면이 눅눅하고 접착이 떨어져 있습니다. 이 구간은 덧방 대신 걷어내기로 합니다.`,
        `  (예시를 옮기지 말고 "${kw}" 현장에서 실제로 갈리는 지점으로 새로 씁니다.)`,
        `- 규칙 4: 판단은 이유를 설명하지 말고 다음 행동으로 드러냅니다.`,
        `  ❌ "단차가 있으면 보수가 필요합니다" → ⭕ "문턱 앞이 한 단 꺼져 있습니다. 이 자리는 퍼티로 먼저 잡기로 합니다."`,
        `- 규칙 5 [마무리]: 마지막 문장을 "순서를 결정합니다 / 계획을 세웁니다" 같은 추상 정리로 닫지 마세요. 마지막도 눈에 보이는 동작입니다.`,
        `- ❌ 부사 금지: 꼼꼼히 / 세심하게 / 주의 깊게 / 철저히 / 종합적으로.`,
        `- ❌ 두께 선택 기준과 시공 범위 기준은 여기서 쓰지 않습니다(뒤 섹션 소유).`,
        `- 동선 단계 수만큼 문장을 씁니다(5~6문장). 250~300자.`,
      ].join("\n");

    case "axis2":
      return B + [
        `[Scene — 작업 진행]`,
        `확인이 끝난 뒤 작업이 움직이는 순서를 시간 흐름으로 이어 씁니다.`,
        `- ⭕ 작업 동선을 순서대로 따라갑니다: ${work}`,
        `- ❌ 공정 이름 나열 금지: "철거, 면갈이, 본드, 재단, 압착을 진행합니다" 같은 문장은 쓰지 마세요.`,
        `- ⭕ 현장이 움직이게 씁니다. 진행 중에 걸리는 지점을 한 번은 넣습니다.`,
        trade === "마루"
          ? `  예: 걷어내자 벽 쪽 면이 한 단 낮습니다. 그 위에 바로 올리면 걸을 때 판재가 울어 낮은 구간을 먼저 메웁니다. 마르는 동안 판재를 방향에 맞춰 나눠 둡니다.`
          : `  예: 걷어내자 굳은 본드가 그대로 붙어 있습니다. 그 위에 덮으면 자국이 비쳐 면갈이로 걷어냅니다. 마르는 동안 다음 공간으로 넘어갑니다.`,
        `  (이 예시를 그대로 옮기지 말고 "${kw}" 현장에 맞게 새로 씁니다.)`,
        `- 규칙 1: 한 문장 = 하나의 동작. 규칙 2: 종결은 "~합니다"로 통일합니다.`,
        `- 규칙 3: 단계마다 "왜 필요한지"를 설명으로 붙이지 말고, 건너뛰면 뭐가 남는지를 행동·결과로 보여줍니다.`,
        `- 규칙 4: axis1에서 확인한 내용을 다시 확인하지 마세요. 여기서는 손이 움직입니다.`,
        `- 마지막 문장도 동작으로 끝냅니다. 총평·선언으로 닫지 마세요.`,
        `- 동선 단계 수만큼 문장(6~8문장). 300자 내외.`,
      ].join("\n");

    case "axis3":
      return B + [
        `[판단 기준 — 조건별 분기]`,
        `"${kw}"를 정할 때 갈라지는 지점만 씁니다. 이 섹션이 범위·두께를 맡습니다.`,
        `- ⭕ 실제 공간을 주어로 세웁니다: [어떤 공간이면 → 무엇으로 잡습니다] 2~3개.`,
        trade === "마루"
          ? `  예: 바닥면이 고르게 나온 집은 접착식으로 잡습니다. 습기가 남는 구간이 있는 집은 방습층을 깔 수 있는 조립식으로 정합니다.`
          : `  예: 아이가 뛰는 방은 발소리가 남는 자리라 두꺼운 쪽으로 잡습니다. 창고로 쓰는 방은 얇은 쪽으로도 충분하다고 봅니다.`,
        `  (예시를 옮기지 말고 "${kw}"에 해당하는 공간으로 새로 씁니다.)`,
        `- 규칙 [판단으로 닫기]: 각 공간은 [무엇이 잦은 공간인지] → [그래서 무엇으로 정하는지] 순서로 닫습니다.`,
        `  종결은 "~하기로 합니다 / ~로 정합니다 / ~로도 충분하다고 봅니다"처럼 결정 형태로 씁니다.`,
        `  ❌ "완충성이 좋아 많이 사용됩니다" → ⭕ "발소리가 남는 방이라 두꺼운 쪽으로 정합니다."`,
        `- ❌ 특성 나열 금지: 내구성·완충성·시공성 같은 성질 설명으로 문장을 만들지 마세요.`,
        `- ❌ 두께를 카탈로그처럼 훑지 마세요. 숫자를 늘어놓지 말고 무엇을 보고 갈리는지만 남깁니다.`,
        `- ❌ 판단 요소를 항목처럼 세우지 마세요: 용도 / 바닥 상태 / 보행량 을 차례로 훑는 구성 금지.`,
        `- ❌ "먼저 고려합니다 / 두 번째로 / 마지막으로" 같은 순번 연결 금지.`,
        `- ❌ 일반화 서술 금지: "~하는 경우가 많습니다 / 일반적입니다 / ~에 따라 달라집니다"로 문장을 닫지 마세요.`,
        `- ❌ 앞 섹션에서 이미 나온 확인 행동·공정 순서를 다시 쓰지 마세요.`,
        `- 2~3문단, 문단당 2~3문장.`,
      ].join("\n");

    case "axis4":
      return B + [
        `[시공 후 — 무엇을 보고 정상인지 가른다]`,
        `시공 직후 자리를 잡는 동안 생기는 현상과, 그것이 정상인지 아닌지 가르는 기준을 씁니다.`,
        `- ⭕ [이런 상태면 그대로 둡니다 / 이런 상태면 다시 봅니다] 로 갈라 씁니다.`,
        `- ⭕ 관찰 시점을 넣습니다: 첫날에는 어떻고, 며칠 지나면 어떻게 되는지.`,
        `- ❌ "마감을 확인합니다" 같은 뭉뚱그린 문장 금지. 어디를 어떤 상태로 보는지 남깁니다.`,
        `- ❌ 앞 섹션의 범위·두께·공정을 다시 꺼내지 마세요.`,
        `- 2문단, 250자 내외.`,
      ].join("\n");

    case "closing":
      return B + [
        `[마무리 — Scene을 끝까지 끌고 간다]`,
        `현장을 정리하며 빠져나오는 마지막 동작으로 닫습니다.`,
        `- ⭕ 마지막까지 눈에 보이는 행동입니다: 이음매를 다시 눌러 봅니다. 걸레받이 경계를 따라 훑어봅니다. 자재 잔여물을 걷고 나옵니다.`,
        `  (예시를 옮기지 말고 "${kw}" 현장의 마지막 동작으로 새로 씁니다.)`,
        `- ❌ 추상 마무리 금지: 현장을 조사합니다 / 계획을 세웁니다 / 일정을 확정하고 진행합니다 / 중요합니다.`,
        `- ❌ 요약 선언·앞 내용 반복·새 주제 도입 금지.`,
        `- ❌ 인사말·상담 유도·1인칭 주어("저희") 금지.`,
        `- 1문단, 3문장, 150자 이내.`,
      ].join("\n");

    default:
      return B + `"${kw}"에 대해 2~3문단 씁니다.`;
  }
}

// ── 이미지 alt ──────────────────────────────────────────
export function getImageAlts(region, treatment) {
  const rg = String(region || "").trim();
  const kw = String((treatment && treatment.name) || "").trim();
  const pool = getPhotoPool((treatment && treatment.cat) || "");
  return pool.map((p) => ({
    slot: p.slot,
    alt: p.alt.replace(/\{region\}/g, rg).replace(/\{kw\}/g, kw),
  }));
}

// 섹션 key → alt 문자열 (핸들러 사진 placeholder 부착용)
export function getSectionAlt(region, treatment, slot) {
  const alts = getImageAlts(region, treatment);
  const hit = alts.find((a) => a.slot === slot);
  const trade = tradeOf((treatment && treatment.cat) || "");
  return hit ? hit.alt : `${String(region || "").trim()} ${trade} 시공 확인`;
}

export default {
  FORBIDDEN, buildSystemPrompt, buildUserPrompt, getImageAlts, getSectionAlt,
};
