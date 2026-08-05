// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateGeneralV2.js — 내과 V2 생성기            ║
// ║ 1차 진료 허브 축. 7섹션 정보형.                            ║
// ║ dual 필드(text 평문 / textMarkdown 원본) + content 3종.    ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄 연결.            ║
// ║ ⚠ 관측 전. FREEZE 아님.                                    ║
// ║ v1(후기형·FREEZE)과 분리. generateGeneral.js 무수정.       ║
// ╚══════════════════════════════════════════════════════════╝

import { GENERAL_V2_TREATMENTS } from "../../lib/general-v2-data";
import {
  buildGeneralPrompt,
  GENERAL_SYSTEM_PROMPT,
  getGeneralImageAlts,
  GENERAL_FORBIDDEN,
} from "../../lib/general-v2-prompts";
import { GENERAL_V2_FLOW_ENGINE } from "../../lib/general-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01

// ============================================================
// INFO_VALUES — 진료별 참고 정보 (정보 표시용, 진단 아님)
// ============================================================
const GENERAL_INFO_VALUES = {
  fatigue:           "원인 범위 확인 후 방향 안내 · 필요 시 전문 진료 연계",
  fever:             "지속 기간·동반 증상 함께 확인 · 필요 시 추가 검사",
  cough:             "지속 기간 기준 확인 · 필요 시 호흡기 진료 연계",
  abdominal:         "증상 양상·기간 확인 · 필요 시 소화기 진료 연계",
  dizziness:         "혈압·혈액 상태 함께 확인 · 원인에 따라 연계 방향 상이",
  checkup:           "결과 항목별 확인 · 이상 소견 시 해당 전문 진료 연계",
  blood_test:        "이전 수치와 대조 확인 · 재검 간격 개인별 상이",
  bp_consult:        "진료실·가정 혈압 함께 확인 · 지속 시 순환기 진료 연계",
  chronic_care:      "정기 수치 추적 · 질환별 세부 관리는 전문 진료 연계",
  health_consult:    "확인 범위에 따라 방향 안내 · 개인별 상이",
  smoking_cessation: "금연 지원 방향 개인별 상이 · 상담 안내",
  lifestyle_consult: "생활 요인·수치 함께 확인 · 추적 간격 안내",
  flu:               "증상 심하거나 오래갈 시 확인 · 개인별 경과 상이",
  shingles:          "초기 확인 중요 · 경과 관리 방향 안내",
  vaccination:       "접종 시기·종류 개인별 상이 · 사전 안내 확인",
  nutrition_consult: "영양 지표 확인 후 방향 안내 · 개인차 있음",
};

// ============================================================
// GPT 호출
// ============================================================
async function callGPT(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. .env.local 에서 OPENAI_API_KEY 를 확인하세요.");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1200,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "GPT API 오류 (status " + res.status + ")");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function calcCharCount(text) {
  return (text || "").replace(/\s/g, "").length;
}

// 네이버 복사용 평문 변환
function stripMarkdownForNaver(text) {
  let t = text;
  // ⚠ 순서 중요: 줄 중간에 낀 ## 를 먼저 개행 분리 → 그 다음 줄머리 처리.
  //   (BUGFIX 2026-07-13: "# 제목 ## 섹션" 이 한 줄로 붙어 H1 렌더되던 문제)
  t = t.replace(/([^\n])\s*###\s+/g, "$1\n\n### ");
  t = t.replace(/([^\n])\s*##\s+/g, "$1\n\n## ");
  t = t.replace(/^#\s+(.+)$/gm, "$1");
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

// ── QC 1: 금칙어 ──
function countGeneralViolations(text) {
  let n = 0;
  GENERAL_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  return n;
}

// ── QC 2: 1인칭 (regex 기반 — 키워드 blocklist 아님) ──
const FIRST_PERSON_RE = /(했어요|하더라고요|제가\s|저는\s|저희\s|봤어요|받았어요|다녔어요|같아요)/g;
function countFirstPerson(text) {
  return (text.match(FIRST_PERSON_RE) || []).length;
}

// ── QC 3: 질환 확정형 (허브 축 이탈 감지) ──
function countReferViolations(text) {
  let n = 0;
  (GENERAL_V2_FLOW_ENGINE.referOnlyKeywords || []).forEach(w => {
    if (text.includes(w)) n++;
  });
  return n;
}

function finalGeneralClean(text) {
  let t = text;
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  t = t.replace(/완치(됩니다|가능)?/g, "관리가 이어집니다");
  t = t.replace(/효과 보장\S*/g, "");
  t = t.replace(/강력\s*추천|꼭 받으세요|후회 없\S*/g, "");
  t = t.replace(/^정리하면[,\s]*/gm, "");
  t = t.replace(/^결론적으로[,\s]*/gm, "");
  // 질환 확정형 → 조건부 서술로 완화
  t = t.replace(/([가-힣A-Za-z]+)입니다\.(?=\s|$)/g, (m, w) => {
    const list = GENERAL_V2_FLOW_ENGINE.referOnlyKeywords || [];
    return list.includes(w + "입니다") ? "여부는 추가 확인이 필요할 수 있습니다." : m;
  });
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// [공통 후처리] 인접 중복 명사 제거 — 치환 부산물 정리
//   "내과내과" / "병원병원" / "진료 진료" / "이 지역 이 지역" 등.
//   지역명 치환 대체어("이 지역")가 원문 명사와 인접하며 발생. 업종 공통 문제.
// ============================================================
const DEDUPE_NOUNS = [
  "내과", "병원", "진료", "검사", "지역", "의원", "클리닉",
  "상담", "관리", "확인", "안내", "치료", "센터",
];

/* ★ [2026-07-14] 효과 단정 중화 — 의료광고 경계 (치과 V2 세션 이식)
 *   실측 사례(치과): "지르코니아크라운은 이러한 불편함을 완화하는 데 도움을 줄 수 있습니다."
 *   → 시술/진료명이 '주어'일 때만 효과 동사 결합을 검토 프레임으로 치환.
 *   ★ 오탐 0 설계: 주어가 subKw(진료명)일 때만 발동. "검사는 ~ 도움을 줍니다" 무손상.
 *   ★ 치환문 주격조사(_subjJosa)는 종성 판정 — 본문 조사 정규화(금지 원칙)와 무관.
 */
const EFFECT_VERBS = /(완화(하|해|되)|개선(하|해|되)|해결(하|해|되)|치료(하|해|되)|호전(시키|되)|줄여|줄이|없애|낫게|효과(가|를)|도움을?\s*(주|줄|줍))/;

function _subjJosa(word) {
  const ch = (word || "").trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (isNaN(code) || code < 0xAC00 || code > 0xD7A3) return "는";
  return ((code - 0xAC00) % 28) > 0 ? "은" : "는";
}

function neutralizeEffectClaim(text, subKw) {
  if (!subKw) return text;
  const esc = subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const josa = _subjJosa(subKw);
  // 문장 단위로만 검사 — subKw가 문장의 주어(subKw + 은/는/이/가) 위치일 때만 발동
  return text.split(/(?<=[.!?])\s+/).map(sent => {
    const subjRe = new RegExp("(^|[\\s(\"'])" + esc + "\\s*(은|는|이|가)\\s");
    if (!subjRe.test(sent)) return sent;
    if (!EFFECT_VERBS.test(sent)) return sent;
    // 검토 프레임으로 문장 단위 치환 (단정 → 진료 중 검토 방향)
    return subKw + josa + " 진료 상담에서 상태에 따라 함께 검토되는 방향 중 하나입니다.";
  }).join(" ");
}

/* ★ QC — 효과 단정 잔존 카운트 (0이 정상) */
function countEffectClaims(text, subKw) {
  if (!subKw) return 0;
  const esc = subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const subjRe = new RegExp("(^|[\\s(\"'])" + esc + "\\s*(은|는|이|가)\\s");
  return text.split(/(?<=[.!?])\s+/).filter(s => subjRe.test(s) && EFFECT_VERBS.test(s)).length;
}

function dedupeAdjacentNouns(text) {
  let t = text;
  // ① 붙어있는 중복 (내과내과)
  DEDUPE_NOUNS.forEach(n => {
    t = t.replace(new RegExp("(" + n + ")\\1+", "g"), "$1");
  });
  // ② 공백 낀 중복 (진료 진료 / 이 지역 이 지역)
  DEDUPE_NOUNS.forEach(n => {
    t = t.replace(new RegExp("(" + n + ")\\s+\\1(?![가-힣])", "g"), "$1");
  });
  // ③ 대체어 + 동일 명사 조합 파손 ("이 지역 내과내" / "가까운 내과주변")
  t = t.replace(/이 지역\s*이 지역/g, "이 지역");
  // [세션40][PRON-CYCLE] 후보 3종(이 진료/해당 진료/진료) 대응
  t = t.replace(/(이|해당)\s*진료\s*(이|해당)\s*진료/g, "$1 진료");
  t = t.replace(/((?:이|해당)\s*진료)\s*진료(?=[는은를을가이의로에와과도\s.,·]|$)/g, "$1");   // "이 진료 진료는" → "이 진료는"
  t = t.replace(/내과내(?![과가-힣])/g, "내과");        // "내과내" 절단형
  t = t.replace(/(내과|병원)(주변|근처|인근)/g, "$1 $2");  // "내과주변" → "내과 주변"
  // ④ 대체어("가까운 내과"/"이 지역") 연속 반복 — 치환 부산물
  t = t.replace(/(가까운 내과)(\s*\S{0,3}\s*)?\s*가까운 내과/g, "$1");
  t = t.replace(/(이 지역)(\s*\S{0,3}\s*)?\s*이 지역/g, "$1");
  // ⑤ 공백 정리
  t = t.replace(/[ \t]{2,}/g, " ");
  return t;
}

// INFO_VALUES 삽입 (마무리 섹션 앞)
function injectGeneralInfoValue(text, tid) {
  const iv = GENERAL_INFO_VALUES[tid];
  if (!iv) return text;
  const line = "\n\n📋 진료 참고: " + iv + " (정확한 사항은 진료 상담에서 안내됩니다)\n";
  const idx = text.lastIndexOf("## 마무리");
  if (idx !== -1) return text.slice(0, idx) + line + text.slice(idx);
  return text + line;
}

function buildGeneralTitle(treatment, region) {
  const pats = treatment.titlePatterns || ["{region} 내과 {name} 정보"];
  let t = pats[0].replace(/{region}/g, region).replace(/{name}/g, treatment.name);
  ["최고", "완벽", "100%", "강력"].forEach(w => { t = t.replace(new RegExp(w, "g"), ""); });
  return t.trim();
}

function buildGeneralHashtags(activeKeyword, region) {
  const base = activeKeyword.replace(/\s/g, "");
  // ★ [BUGFIX 2026-07-14 · 축 A] 지역명 공백 제거 — "#잠실 송파구내과" → "#잠실송파구내과"
  //   해시태그는 공백에서 끊김 → 지역명이 2어절이면 태그가 분리되어 무효.
  const reg = (region || "").replace(/\s/g, "");
  return "#" + reg + base + " #" + reg + "내과 #" + base + "정보 #내과진료안내";
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    program, userRegion, userMemo, photoContext,
    // ── PATCH-07 위치 5필드 ──
    address, map_guide, transit, building_desc, parking_info,
  } = req.body;
  const _locStore = { address, map_guide, transit, building_desc, parking_info };

  // ── VISIT-01: 방문정보 (store_profiles.visit_info JSONB) ──
  const { visit_info } = req.body;
  const _visitStore = (visit_info && typeof visit_info === "object") ? visit_info : null;
  const region   = (userRegion || "강남").trim();
  const photoCtx = (photoContext && typeof photoContext === "string") ? photoContext.trim() : "";

  const treatment =
    GENERAL_V2_TREATMENTS.find(t => t.id === program?.id) ||
    GENERAL_V2_TREATMENTS[0];

  const keyword   = treatment.name;
  const tid       = treatment.id;
  const compare   = treatment.compareWith || "다른 접근";
  const referHint = treatment.referHint   || "";

  const activeKeyword = keyword;
  const fullKeyword   = region + " " + activeKeyword;

  const finalTitle = buildGeneralTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";  // ← 제목 뒤 빈 줄 2개 (섹션 헤더와 분리)

  const imgAlts = getGeneralImageAlts(treatment, region);

  const systemPrompt =
    GENERAL_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 진료 — 이탈 금지]\n" +
    "- 다루는 진료: " + activeKeyword + "\n" +
    "- 비교 접근: " + compare + "\n" +
    "- 연계 방향: " + referHint + "\n" +
    "- 이 글은 1차 진료 허브 관점입니다. 질환 확정·치료 상세 설명 금지.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  const SECTION_CAP = {
    concern: { min: 200, max: 300 },
    visit:   { min: 220, max: 340 },
    exam:    { min: 250, max: 380 },
    refer:   { min: 250, max: 380 },
    choice:  { min: 220, max: 340 },
    process: { min: 250, max: 380 },
    closing: { min: 180, max: 280 },
  };

  for (const sec of GENERAL_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildGeneralPrompt(sec.key, treatment, region);
    const cap = SECTION_CAP[sec.key] || { min: 200, max: 300 };

    const userPrompt =
      "진료명: " + activeKeyword + " | 지역: " + region + " | 비교접근: " + compare + "\n" +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + cap.min + "~" + cap.max + "자.\n" +
      "🔒 집중 진료: \"" + activeKeyword + "\" 로만 서술. 다른 진료 혼용 금지.\n" +
      "🔒 복합 키워드: \"" + fullKeyword + "\" 1~2회 자연 포함.\n" +
      "🔒 '진료' 단어 반복 주의 — 문장마다 반복하지 말고 표현을 변주할 것.\n\n" +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    const secHeader = "## " + sec.label;
    const headerCount = (content.match(new RegExp(secHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (headerCount > 1) {
      content = content.replace(
        new RegExp("(" + secHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ".*?)(?=" + secHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "s"),
        ""
      );
    }

    if (calcCharCount(content) < cap.min) {
      const retry = await callGPT(
        systemPrompt,
        userPrompt + "\n\n[재작성] 반드시 " + cap.min + "자 이상. 이전과 다른 표현 사용."
      );
      if (calcCharCount(retry) > calcCharCount(content)) content = retry;
    }

    // 헤더 정규화 — 반드시 "## 라벨\n" 형태로 줄 분리 (BUGFIX: 본문과 붙어 H1 렌더 방지)
    content = content.trim();
    if (sec.key === "concern") {
      // [세션40][NOHDR-01] concern(첫 섹션) = 헤더 미출력. 본문부터 시작.
      content = content.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    } else if (!content.startsWith("##")) {
      content = "## " + sec.label + "\n" + content;
    } else {
      // GPT가 "## 라벨 본문..." 처럼 한 줄로 붙여준 경우 강제 개행
      content = content.replace(/^##\s*([^\n]+?)\s{2,}/, "## $1\n");
      const m = content.match(/^##\s*(.+)$/m);
      if (m && !/^##[^\n]*\n/.test(content)) {
        content = content.replace(/^(##[^\n]*)/, "$1\n");
      }
    }

    const secAlt = imgAlts[sec.key] || imgAlts.exam;
    result += content.trim() + "\n\n" + secAlt + "\n\n";
  }

  // ── 후처리 ──
  result = injectGeneralInfoValue(result, tid);

  // ★ [2026-07-14] 효과 단정 중화 — 의료광고 경계 (치과 V2 세션 이식)
  //   발동 조건: 「진료명 + 조사 + 효과동사」 결합만. 주어가 activeKeyword일 때만 발동 → 오탐 0.
  //   「검사는 ~ 도움을 줍니다」 같은 일반 서술은 무손상.
  result = neutralizeEffectClaim(result, activeKeyword);

  if (countGeneralViolations(result) > 0 || countReferViolations(result) > 0) {
    result = finalGeneralClean(result);
  }

  // ── 지역명 반복 분산 (BUGFIX 2026-07-13) ──
  //   ⚠ 이전 버그: 3회 초과분을 "" 로 삭제 → "잠실 송파구에서" → "에서" (문장 파손)
  //   원칙: 삭제 금지. 조사를 포함해 자연 대체어로 치환한다.
  const _esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ★ [BUGFIX 2026-07-14 · 축 A] ALT 라인 치환 제외 (마스킹)
  //   실측 결함: [이미지: 이 진료 병원 선택 안내] / [이미지: 이 지역기침 지속 확인 항목]
  //   원인: ALT 텍스트가 지역명/키워드 반복 카운트에 포함 → 대체어가 ALT에 침투.
  //   ALT는 본문 반복(체류·밀도) 대상이 아님 → 카운트·치환 양쪽에서 제외한다.
  const _altStore = [];
  result = result.replace(/\[이미지:[^\]]*\]/g, (m) => {
    _altStore.push(m);
    return "\u0000ALT" + (_altStore.length - 1) + "\u0000";
  });

  // ① 복합 키워드(지역+진료명) — 2회 초과 시 "이 진료"로. 뒤따르는 "진료" 중복 흡수.
  {
    const kwEsc = _esc(fullKeyword);
    let cnt = 0;
    // fullKeyword 뒤에 조사/"진료"가 붙는 경우까지 한 덩어리로 잡는다
    //   진료명이 "~ 진료"로 끝나는 경우, 뒤에 또 "진료"가 이어지면 함께 흡수 ("이 진료 진료는" 방지)
    // [세션40][PRON-CYCLE] 대명사 후보 순환 — 동일 표현 반복 방지
    const POOL = ["이 진료", "해당 진료", "진료"];
    let _pIdx = 0;
    result = result.replace(new RegExp(kwEsc + "(\\s*진료)?", "g"), (m) => {
      cnt++;
      return cnt > 2 ? POOL[_pIdx++ % POOL.length] : m;
    });
  }

  // ② 지역명 단독 — 3회 초과 시 조사와 함께 자연 대체어로 치환 (삭제 금지)
  {
    const rEsc = _esc(region);
    // 지역명 + (조사) 를 통째로 잡아 대체. 조사 없으면 "가까운 내과"로.
    const JOSA = "(에서의|에서는|에서|에는|에|의|는|은|이|가|도|와|과|인근|지역)?";
    let cnt = 0;
    result = result.replace(new RegExp(rEsc + "\\s*" + JOSA, "g"), (m, j) => {
      cnt++;
      if (cnt <= 3) return m;
      const josa = j || "";
      if (josa === "에서의")  return "이 지역의";
      if (josa === "에서는")  return "이 지역에서는";
      if (josa === "에서")    return "이 지역에서";
      if (josa === "에는")    return "이 지역에는";
      if (josa === "에")      return "이 지역에";
      if (josa === "의")      return "이 지역의";
      if (josa === "는" || josa === "은") return "이 지역은";
      if (josa === "이" || josa === "가") return "이 지역이";
      if (josa === "도")      return "이 지역도";
      if (josa === "와" || josa === "과") return "이 지역과";
      if (josa === "인근")    return "이 지역 인근";
      if (josa === "지역")    return "이 지역";
      return "이 지역";       // 조사 없음 (단독 노출) — "가까운 내과"는 뒤따르는 "내과"와 중복(내과내과) 유발
    });
  }

  // ③ 잔여 파손·중복·조사 부정합 정리 (안전망)
  result = result
    .replace(/(^|[\s(])(에서의|에서는|에서|에는)\s/g, "$1")   // 앞 명사 잃은 조사 시작 제거
    // 받침 없는 대체어("이 진료"/"이 지역") 뒤 받침용 조사 → 받침 없는 조사로 보정
    // [세션40][PRON-CYCLE] 후보 3종 + 이 지역 — 모두 무받침(료/역)
    .replace(/(이 진료|해당 진료|(?<![가-힣])진료|이 지역)으로/g, "$1로")
    .replace(/(이 진료|해당 진료|이 지역)은(?=\s)/g, "$1는")
    .replace(/(이 진료|해당 진료|이 지역)이(?=\s)/g, "$1가")
    .replace(/(이 진료|해당 진료|이 지역)과(?=\s)/g, "$1와")
    .replace(/(이 진료|이 지역)을(?=\s)/g, "$1를");

  // ★ [BUGFIX 2026-07-14 · 축 A] 대체어 뒤 명사 공백 보정
  //   실측 결함: "이 지역내과" / "이 지역기침 지속" — 조사 없는 지역명 뒤 명사가 붙어버림.
  //   원인: JOSA 그룹이 조사 미매치(빈값)일 때 원문의 공백까지 흡수(\s*) → 대체어와 뒤 명사가 밀착.
  //   조치: 대체어("이 지역"/"이 진료") 직후가 조사가 아닌 한글이면 공백 1칸 삽입.
  //   ⚠ 조사(는/은/이/가/의/에/도/와/과/로/를/을/만/부터/까지)는 붙여쓰기 유지 → 조사 정규화 아님(금지 원칙 무관).
  result = result
    .replace(/(이 지역|이 진료)(?![\s.,·)\]])(?!는|은|이|가|의|에|도|와|과|로|를|을|만|부터|까지|실)([가-힣])/g, "$1 $2")
    .replace(/(이 진료실)(?![\s.,·)\]])([가-힣])/g, "$1 $2");

  // ④ [공통 후처리] 중복 단어 자동 제거 — 치환 과정에서 생기는 "내과내과" 류.
  //   원인: 대체어에 명사가 포함되면 원문의 같은 명사와 인접 중복. 다른 업종에도 동일 발생.
  result = dedupeAdjacentNouns(result);

  // ★ ALT 복원 (마스킹 해제) — 원문 ALT 무손상
  result = result.replace(/\u0000ALT(\d+)\u0000/g, (m, i) => _altStore[Number(i)] || "");

  const tags = buildGeneralHashtags(activeKeyword, region);
  result = result.replace(/\n+(HASHTAGS:.+)?$/s, "").trimEnd();
  result += "\n\n" + tags;

  result = result
    .replace(/\\n\\n/g, "\n\n").replace(/\\n/g, " ")
    .replace(/\\r/g, "").replace(/\\t/g, " ")
    .replace(/\n /g, "\n").replace(/ \n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");

  // ── PATCH-07: locationBlock 후단 1줄 ──
  // ── VISIT-01: visitBlock 후단 1줄 (locationBlock 앞 → 🏥 → 📍 → #) ──
  result = insertVisitBeforeHashtags(result, _visitStore);
  result = insertLocationBeforeHashtags(result, _locStore);

  const resultMarkdown = result;
  const resultPlain    = stripMarkdownForNaver(result);

  const charCount   = calcCharCount(resultPlain);
  const violations  = countGeneralViolations(resultPlain);
  const firstPerson = countFirstPerson(resultPlain);
  const referViol   = countReferViolations(resultPlain);
  const effectClaim = countEffectClaims(resultPlain, activeKeyword);   // ★ 2026-07-14 — 정상 0

  return res.status(200).json({
    success: true,
    text: resultPlain,
    textMarkdown: resultMarkdown,
    content: resultPlain,
    charCount,
    title: finalTitle,
    qc: {
      violations,
      firstPerson,
      referViolations: referViol,
      effectClaims: effectClaim,          // ★ 의료광고 경계 — 정상 0
      hasInfoValue: !!GENERAL_INFO_VALUES[tid],
      fullKeyword,
    },
  });
}
