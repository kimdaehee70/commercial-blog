// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateFamilyV2.js — 가정의학과 V2 (병원군 표준)║
// ║ 7섹션 · decisionAxis(exam/disease) 분기 · fix-1~4 적용     ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                 ║
// ║ ⚠ 관측 전. FREEZE 아님. v1(후기형) 무손상·미호출.          ║
// ╚══════════════════════════════════════════════════════════╝

import { FAMILY_V2_TREATMENTS } from "../../lib/family-v2-data";
import {
  buildFamilyPrompt, FAMILY_SYSTEM_PROMPT, FAMILY_FORBIDDEN, getFamilyImageAlts,
} from "../../lib/family-v2-prompts";
import { FAMILY_V2_FLOW_ENGINE } from "../../lib/family-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01

// ============================================================
// GPT 호출
// ============================================================
async function callGPT(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다. .env.local 의 OPENAI_API_KEY 확인.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1200,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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

const calcCharCount = (t) => (t || "").replace(/\s/g, "").length;

// ============================================================
// 네이버 복사용 평문 변환
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;
  t = t.replace(/^#\s+(.+)$/gm, "$1");
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// QC — 금칙어 카운트
// ============================================================
function countViolations(text) {
  let n = 0;
  FAMILY_FORBIDDEN.forEach((w) => { if (text.includes(w)) n++; });
  return n;
}

// ============================================================
// finalClean — 문장단위 제거 우선(부분 치환은 비문 유발)
// ============================================================
// [경계 필수] 아래 패턴은 문장 통째로 제거한다.
const SENTENCE_KILL = [
  /[^.!?\n]*(완치|효과를 체감|효과가 나타납니다|효과 보장|좋아졌|달라진 삶|극복)[^.!?\n]*[.!?]/g,
  /[^.!?\n]*(방치하면|더 늦기 전에|의지 부족|게을러)[^.!?\n]*[.!?]/g,
  /[^.!?\n]*(챔픽스|삭센다|위고비|스타틴|메트포르민|PPI)[^.!?\n]*[.!?]/g,
  /[^.!?\n]*(마늘주사|신데렐라주사|영양수액|수액치료|비만치료)[^.!?\n]*[.!?]/g,
  /[^.!?\n]*(즉시 응급실|응급실로 바로)[^.!?\n]*[.!?]/g,
  /[^.!?\n]*(강력 추천|꼭 받으세요|후회 없)[^.!?\n]*[.!?]/g,
  // 진단 컷오프 수치(140/90, 6.5% 등) 포함 문장 제거
  /[^.!?\n]*\d{2,3}\s*\/\s*\d{2,3}\s*(mmHg)?[^.!?\n]*[.!?]/g,
  /[^.!?\n]*\d+(\.\d+)?\s*%\s*(이상|미만|이하|초과)[^.!?\n]*[.!?]/g,
  // 비용 수치 포함 문장 제거
  /[^.!?\n]*\d+\s*(만원|원)[^.!?\n]*[.!?]/g,
];

// [fix-3 폐기 2026-07-14] normalizeJosa 제거.
//   ★ 실측 근거(family 실 GPT 3종): 정규식 `([가-힣])(은|는|이|가|을|를|과|와|으로|로)` 가
//     조사가 아닌 '어미·활용형·명사 일부'까지 잡아 비문을 대량 생산했다.
//       나이→나가 / 맞는→맞은 / 나은→나는 / 찾는→찾은 / 있는→있은 / 항목별로→항목별으로
//   한국어에서 조사와 어미는 표층 형태가 동일해 정규식으로 분리 불가.
//   GPT-4o는 조사를 이미 정확히 생성하므로 교정 이득이 없다(psy 6종 실측 발동 0건).
//   → 함수 자체를 제거한다. 이후 세션에서 재도입 금지.

// [fix-2] 지시대명사 상한 — 한 줄당 2회
const PRONOUN_CAP = 2;
// 초과분은 삭제하지 않고 대체 관형어로 순환한다.
//   삭제 방식은 뒤 명사를 고아로 만들어 비문("기록을 방식으로 봅니다")을 유발한다.
const PRONOUN_ALT = ["해당", "위", "앞선"];
function capPronouns(text) {
  return text.split("\n").map((line) => {
    let n = 0;
    let k = 0;
    return line.replace(/(이러한|이런|그러한|그런)/g, (m) => {
      n++;
      if (n <= PRONOUN_CAP) return m;
      return PRONOUN_ALT[k++ % PRONOUN_ALT.length];
    });
  }).join("\n");
}

function finalClean(text) {
  let t = text;
  SENTENCE_KILL.forEach((re) => { t = t.replace(re, ""); });
  // 진단 단정 완화(문장 유지 가능한 것만)
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  // AI 논문투
  t = t.replace(/^\s*(정리하면|결론적으로)[,\s]*/gm, "");
  t = t.replace(/(^|[.!?]\s*)따라서[,\s]*/g, "$1");
  t = capPronouns(t);
  // [fix-4] 공백·비문 정리
  t = t.replace(/\s+([.,!?])/g, "$1");
  t = t.replace(/([.!?])\s*,/g, "$1");
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// 제목 / 해시태그
// ============================================================
function buildTitle(t, region) {
  const pats = t.titlePatterns || ["{region} 가정의학과 {name} 정보"];
  let s = pats[0].replace(/{region}/g, region).replace(/{name}/g, t.name);
  ["최고", "완벽", "100%", "강력"].forEach((w) => { s = s.replace(new RegExp(w, "g"), ""); });
  return s.trim();
}
// [fix-1] 해시태그 공백 제거 — 지역명 내부 공백까지 제거(#잠실 송파구… 방지)
function buildHashtags(name, region) {
  const r = String(region).replace(/\s+/g, "");
  const k = String(name).replace(/\s+/g, "").replace(/[·]/g, "");
  return `#${r}${k} #${r}가정의학과 #${k}정보 #가정의학과진료안내`;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    program, userRegion, photoContext,
    address, map_guide, transit, building_desc, parking_info, // PATCH-07
  } = req.body;
  const _locStore = { address, map_guide, transit, building_desc, parking_info };

  // ── VISIT-01: 방문정보 (store_profiles.visit_info JSONB) ──
  const { visit_info } = req.body;
  const _visitStore = (visit_info && typeof visit_info === "object") ? visit_info : null;
  const region = (userRegion || "강남").trim();
  const photoCtx = typeof photoContext === "string" ? photoContext.trim() : "";

  const treatment =
    FAMILY_V2_TREATMENTS.find((t) => t.id === program?.id) ||
    FAMILY_V2_TREATMENTS.find((t) => t.name === program?.name) ||
    FAMILY_V2_TREATMENTS[0];

  const keyword = treatment.name;
  const axis = treatment.decisionAxis === "exam" ? "exam" : "disease";
  const compare = treatment.compareWith || "다른 확인 항목";
  const fullKeyword = region + " " + keyword;

  const alts = getFamilyImageAlts(treatment, region);
  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  // ── 축별 서술 지침 (섹션4 분기) ──
  const AXIS_NOTE =
    axis === "exam"
      ? "\n[축: 검사·확인 항목]\n- 이 항목은 진단 도구가 아니라 상태를 이해하기 위한 확인 항목이다.\n- 결과는 단독 해석하지 않고 진료 확인·생활 기록과 함께 읽는다.\n- 항목 구성과 범위가 어떻게 정해지는지를 중심으로 서술한다.\n"
      : "\n[축: 증상·질환 진료]\n- 한 시점의 값·한 번의 확인만으로 판단하지 않는다. 흐름과 이전 기록이 판단의 한 축이다.\n- 몸의 다른 원인이 같은 증상으로 나타날 수 있어 함께 확인한다.\n- 생활·환경 조정이 우선인지, 약물 접근이 진료에서 함께 검토되는 방향인지를 구분해 서술한다(약물명·효과 금지).\n";

  const systemPrompt =
    FAMILY_SYSTEM_PROMPT +
    AXIS_NOTE +
    "\n[🎯 이 글의 핵심 항목 — 이탈 금지]\n" +
    "- 다루는 항목: " + keyword + "\n" +
    "- 비교 항목: " + compare + "\n" +
    "- 모든 섹션이 이 항목 중심으로 일관되게 작성되어야 합니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  const SECTION_CAP = {
    concern:     { min: 200, max: 300 },
    consider:    { min: 220, max: 330 },
    checkItems:  { min: 250, max: 370 },
    decision:    { min: 250, max: 370 },
    choosePoint: { min: 220, max: 330 },
    process:     { min: 250, max: 370 },
    closing:     { min: 160, max: 260 },
  };

  // ── 섹션 루프 ──
  for (const sec of FAMILY_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildFamilyPrompt(sec.key, treatment, region);
    const cap = SECTION_CAP[sec.key] || { min: 200, max: 320 };

    const userPrompt =
      "항목명: " + keyword + " | 지역: " + region + " | 비교항목: " + compare + "\n" +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + cap.min + "~" + cap.max + "자.\n" +
      '🔒 집중 항목: "' + keyword + '" 로만 서술. 다른 진료 혼용 금지.\n' +
      '🔒 복합 키워드: "' + fullKeyword + '" 1~2회 자연 포함.\n\n' +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    // 섹션 헤더 중복 제거
    const secHeader = "## " + sec.label;
    const cnt = (content.match(new RegExp(secHeader, "g")) || []).length;
    if (cnt > 1) {
      content = content.replace(new RegExp("(" + secHeader + ".*?)(?=" + secHeader + ")", "s"), "");
    }

    // 글자수 부족 → 1회 재시도
    if (calcCharCount(content) < cap.min) {
      const retry = await callGPT(
        systemPrompt,
        userPrompt + "\n\n[재작성] 반드시 " + cap.min + "자 이상. 이전과 다른 표현 사용."
      );
      if (calcCharCount(retry) > calcCharCount(content)) content = retry;
    }

    if (sec.key === "concern") {
      // [세션40][NOHDR-01] concern(첫 섹션) = 헤더 미출력. 본문부터 시작.
      content = content.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    } else if (!content.trim().startsWith("##")) {
      content = secHeader + "\n" + content.trim();
    }

    result += content.trim() + "\n\n" + (alts[sec.key] || alts.closing) + "\n\n";
  }

  // ── 후처리 ──
  result = finalClean(result);

  // 키워드 과밀 분산 (3회 초과 → 대체 표현)
  //   ★ [2026-07-14 실측] 기존 "이 진료" 치환은 세 가지 비문을 만들었다.
  //     ① "당뇨 진료" 원문 → "이 진료 진료" (진료 중복)
  //     ② "…를/을" 조사 불일치 → "이 진료을"
  //     ③ ALT 캡션([이미지: 잠실 당뇨 …])까지 치환 → "[이미지: 이 진료 확인 항목]"
  //   → ALT 줄은 치환 대상에서 제외하고, 본문만 "해당 항목"(종성 O)으로 치환한다.
  {
    const esc = fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(esc + "(\\s*(진료|검사|관리))?", "g");
    let n = 0;
    // [세션40][PRON-CYCLE] 대명사 후보 순환 (모두 종성 O → 조사 정합 동일)
    const POOL = axis === "exam" ? ["해당 항목", "이 항목", "확인 항목"] : ["해당 항목", "이 항목", "진료 항목"];
    let _pIdx = 0;
    result = result.split("\n").map((line) => {
      if (line.trim().startsWith("[이미지:")) return line;   // ALT 캡션 보존
      if (line.trim().startsWith("#")) return line;           // 제목·해시태그 보존
      return line.replace(re, (m, tail) => {
        n++;
        if (n <= 3) return m;
        // tail("진료"/"검사"/"관리")은 흡수해 버린다. 대명사가 이미 그 의미를 담는다.
        // [세션40][PRON-CYCLE] 동일 표현 반복 방지 — 후보 순환
        return POOL[_pIdx++ % POOL.length];
      });
    }).join("\n");
    // 조사 정합 — "해당 항목"은 종성 O → 을/은/이/과/으로 고정
    result = result
      .replace(/해당 항목를/g, "해당 항목을")
      .replace(/해당 항목는/g, "해당 항목은")
      .replace(/해당 항목가/g, "해당 항목이")
      .replace(/해당 항목와/g, "해당 항목과")
      .replace(/해당 항목로/g, "해당 항목으로");
  }

  // 해시태그
  result = result.replace(/\n+(HASHTAGS:.+)?$/s, "").trimEnd();
  result += "\n\n" + buildHashtags(keyword, region);

  // 백슬래시·공백 정리
  result = result
    .replace(/\\n\\n/g, "\n\n").replace(/\\n/g, " ")
    .replace(/\\r/g, "").replace(/\\t/g, " ")
    .replace(/\n /g, "\n").replace(/ \n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");

  // ── PATCH-07: locationBlock 후단 1줄 ──
  // ── VISIT-01: visitBlock 후단 1줄 (locationBlock 앞 → 🏥 → 📍 → #) ──
  result = insertVisitBeforeHashtags(result, _visitStore);
  result = insertLocationBeforeHashtags(result, _locStore);

  // ── dual render ──
  const resultMarkdown = result;
  const resultPlain = stripMarkdownForNaver(result);

  return res.status(200).json({
    success: true,
    text: resultPlain,
    textMarkdown: resultMarkdown,
    content: resultPlain,
    charCount: calcCharCount(resultPlain),
    title: finalTitle,
    qc: {
      violations: countViolations(resultPlain),
      axis,
      fullKeyword,
    },
  });
}
