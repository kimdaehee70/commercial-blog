// ============================================================
// pages/api/generateOrthoV2.js — 정형외과 정보형 V2 핸들러 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / neuro / pain 절대 참조 금지
// [V2] 정보형 단일(commercial 톤). ortho v1(후기형)은 generateOrtho.js — 무손상 A/B 보존.
//   engineBootstrap ortho 래퍼가 mode==='purpose'일 때만 이 핸들러로 위임.
// [화이트리스트 없음] ortho-data 전 치료(24종)가 정형외과 자산 → ALLOWED 필터 불필요.
// 골격: neuro-v2/clinic-v2/dental-v2 표준 = 핸들러 → 제목 → 7섹션 루프 → callGPT → 정보형 후처리 → QC → 응답
// [self-contained] generateUtils·generateOrtho(v1) import 없음. 유틸 전부 내장. v1 의존성 0 → FREEZE 안전.
// ============================================================

import { ORTHO_TREATMENTS }                                                    from "../../lib/ortho-data";
import { buildOrthoPromptV2, ORTHO_SYSTEM_PROMPT_V2, getOrthoImageAltsV2, ORTHO_DIRECTION } from "../../lib/ortho-v2-prompts";
import { ORTHO_FLOW_ENGINE_V2, ORTHO_TREATMENT_OVERRIDES_V2 }                   from "../../lib/ortho-v2-playConfig";
// [PATCH-07] 위치 공통 후단 블록 — SOP v4.2 누락 복구
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// [VISIT-01] 방문정보 공통 후단 블록
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";
import { isClinicPhotoSection } from "../../lib/photoPolicyRegistry"; // [HOSPITAL-PHOTO-POLICY-01]

// ------------------------------------------------------------
// 계열 키워드 (제목·activeKeyword 보조) — 정형외과 부위/증상 축
// ------------------------------------------------------------
const SITE_KEYWORDS = [
  "허리", "목", "경추", "요추", "척추", "엉덩이", "고관절", "사타구니",
  "무릎", "종아리", "다리", "발", "발목", "발바닥", "발뒤꿈치", "엄지발가락",
  "어깨", "팔", "팔꿈치", "손", "손목", "손가락",
];

// ------------------------------------------------------------
// 계열 혼용 차단 MAP — 정형외과 부위 계열 교차 침범 방지
//   treatment.cat → focus/forbid. (neuro의 NEURO_CAT_FOCUS 대응)
// ------------------------------------------------------------
const ORTHO_CAT_FOCUS = {
  "척추·디스크": { focus: "척추·디스크·신경 압박 관점", forbid: "무릎·어깨·발목·손목 통증" },
  "무릎·관절":   { focus: "무릎·관절 연골·인대 관점",   forbid: "허리디스크·목디스크·어깨·발목" },
  "어깨":        { focus: "어깨 관절·회전근개 관점",     forbid: "허리·무릎·발목·손목터널" },
  "발목·족부":   { focus: "발목·족부 인대·근막 관점",   forbid: "허리·무릎·어깨·목" },
  "비수술치료":  { focus: "비수술 시술(주사·충격파·도수) 관점", forbid: "수술·마취·재활 단정" },
  "수술·재활":   { focus: "수술 후 재활·회복 관점",     forbid: "타 부위 통증 혼용" },
};

function getOrthoFocus(treatment) {
  const m = ORTHO_CAT_FOCUS[treatment?.cat];
  if (!m) return null;
  return { focus: m.focus, effect: m.focus, forbid: m.forbid };
}

// ------------------------------------------------------------
// 제목 생성 (정보형) — CTR 유발어 배제, PHILOSOPHY 원칙1
// ------------------------------------------------------------
function buildOrthoTitleV2(treatment, region, activeKeyword) {
  const ak = activeKeyword || treatment.name;
  return region + " " + ak + ", 정형외과 진료 전 알아둘 점";
}

// ------------------------------------------------------------
// LLM 호출 (OpenAI gpt-4o) — neuro/clinic/dental v2 동형
// ------------------------------------------------------------
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
      max_tokens: 800,
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

// ------------------------------------------------------------
// 글자수(공백·마크다운 제외 근사)
// ------------------------------------------------------------
function calcCharCount(text) {
  return String(text || "")
    .replace(/[#*`>\-\|\[\]]/g, "")
    .replace(/\s+/g, "")
    .length;
}

// ------------------------------------------------------------
// 위반 카운트(정보형 안전망) — 1인칭·후기·효과단정·발화인용·타임라인·가격
// ------------------------------------------------------------
const V2_VIOLATION_PATTERNS = [
  /저는|제가|저도|저희|내가|제\s*케이스/g,                     // 1인칭
  /했어요|더라고요|거든요|봤어요|받아봤|느꼈어요/g,             // 후기 어미
  /확실히|완벽(히|하게|한)|100%|완치|기적|드라마틱/g,           // 효과 단정
  /나았|사라졌|없어졌|좋아졌|잡아준|없애준/g,                   // 결과 단정
  /추천|강추|꼭\s|권해드|받아보세요|방문해보세요/g,             // 추천·CTA
  /친절|따뜻|신뢰가\s*갔|믿음직|경험\s*많은\s*의사/g,           // 병원 평가
  /원장님(이|은|께서)?\s*.{0,10}(라고|하셨|설명해|말씀)/g,      // 발화 인용
  /1일차|1주일차|2주차|1개월차|치료\s*후\s*첫날|다음날\s*아침/g, // 타임라인
  /만원|원대|저렴|할인|이벤트|비용은\s*\d/g,                    // 가격 직접
];

function countViolations(text) {
  let total = 0;
  const hits = [];
  for (const re of V2_VIOLATION_PATTERNS) {
    const m = String(text || "").match(re);
    if (m) { total += m.length; hits.push(...m); }
  }
  return { total, hits };
}

// ------------------------------------------------------------
// 정보형 후처리(경량 안전망)
// ------------------------------------------------------------
function cleanOrthoTextV2(text, keyword) {
  let t = String(text || "");

  // 후기 어미 → 정보형
  t = t
    .replace(/받아봤어요/g, "진행되는 경우가 있습니다")
    .replace(/느꼈어요/g, "살펴보게 됩니다")
    .replace(/했어요/g, "합니다")
    .replace(/더라고요/g, "습니다")
    .replace(/거든요/g, "습니다");

  // 1인칭 제거
  t = t
    .replace(/저는\s*/g, "")
    .replace(/제가\s*/g, "")
    .replace(/저희\s*/g, "")
    .replace(/저도\s*/g, "");

  // 효과·결과 단정 완화
  t = t
    .replace(/확실히\s*(좋아|개선|줄어|호전)/g, "상태에 따라 $1")
    .replace(/완벽(히|하게|한)/g, "")
    .replace(/(저림이|통증이|증상이)\s*(사라|없어)졌(어요|습니다|다)/g, "$1 변화하는지 여부는 상태에 따라 다릅니다")
    .replace(/(나았|호전되었)(어요|습니다|다)/g, "지는 변화 여부는 상태에 따라 다릅니다")
    .replace(/100%\s*(만족|효과|개선|완치)/g, "개인차가 있는 부분");

  // 발화 인용 → 일반 정보
  t = t
    .replace(/원장님(이|은|께서)?\s*["'][^"']*["']\s*(라고\s*)?(하셨어요|하셨다|설명해\s*주셨어요|말씀하셨어요|하시더라고요)?\.?/g,
             "상담 시 이러한 점이 안내됩니다.")
    .replace(/["']([^"']{5,40})["']\s*라고\s*(하셨|말씀|설명)[^.]*\./g, "이러한 점이 상담 시 안내됩니다.");

  // 개인 타임라인 헤더 제거
  t = t.replace(/###?\s*(1일차?|2일차?|3일차?|5일차?|1주일?차?|2주차?|1개월차?)\b.*$/gm, "");

  // 추천·CTA 제거
  t = t
    .replace(/(꼭\s*)?추천(드립니다|합니다|해요|드려요)?\.?/g, "")
    .replace(/방문해\s*보세요\.?/g, "")
    .replace(/받아\s*보세요\.?/g, "");

  // 조사 오류(치료명 직결) 교정 — activeKeyword 받침 기반
  if (keyword) {
    const last = keyword[keyword.length - 1];
    const code = last ? last.charCodeAt(0) : 0;
    const isHangul = code >= 0xAC00 && code <= 0xD7A3;
    const hasJong = isHangul ? ((code - 0xAC00) % 28 !== 0) : null;
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (hasJong === true) {
      t = t
        .replace(new RegExp(esc + "는(?![가-힣])", "g"), keyword + "은")
        .replace(new RegExp(esc + "를(?![가-힣])", "g"), keyword + "을")
        .replace(new RegExp(esc + "가(?![가-힣])", "g"), keyword + "이");
    } else if (hasJong === false) {
      t = t
        .replace(new RegExp(esc + "은(?![가-힣])", "g"), keyword + "는")
        .replace(new RegExp(esc + "을(?![가-힣])", "g"), keyword + "를");
    }
  }

  // 공백 정리
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t;
}

// 중복 문장 제거
function removeDuplicateSentences(text) {
  const seen = new Set();
  return String(text || "")
    .split(/(?<=[.!?。])\s+/)
    .filter(s => {
      const key = s.trim();
      if (!key || key.length < 6) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
}

// 해시태그 정규화(공백 포함 깨진 태그·업종 혼재 차단)
function normalizeHashtags(region, treatment) {
  const name = treatment.name.replace(/\s+/g, "");
  const rg   = region.replace(/\s+/g, "");
  const tags = [
    "#" + rg + "정형외과",
    "#" + rg + name,
    "#" + name + "정보",
    "#정형외과정보",
    "#" + rg + "정형외과진료",
  ];
  return [...new Set(tags)].join(" ");
}

// ------------------------------------------------------------
// QC
// ------------------------------------------------------------
function runOrthoQCV2(text, keyword, fullKeyword) {
  const kwCount     = (text.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const fullKwCount = (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const v = countViolations(text);
  const hasAllSections = ORTHO_FLOW_ENGINE_V2.sections.every(s =>
    text.includes("## " + s.label)
  );
  return {
    kwCount,
    fullKwCount,
    violations: v,
    firstPerson: (text.match(/저는|제가|저도|저희/g) || []).length,
    ad:          (text.match(/추천|강추|친절|최고|믿음/g) || []).length,
    emo:         (text.match(/했어요|더라고요|거든요|받아봤/g) || []).length,
    hasAllSections,
    charCount: calcCharCount(text),
  };
}

// ============================================================
// 핸들러
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { program, userRegion, userMemo, subSite, photoContext } = req.body;


  // ── PATCH-07 위치 5필드 / VISIT-01 방문정보 ──

  const { address, map_guide, transit, building_desc, parking_info, visit_info } = req.body;

  const _locStore   = { address, map_guide, transit, building_desc, parking_info };

  const _visitStore = (visit_info && typeof visit_info === "object") ? visit_info : null;
  const region = (userRegion || "강남").trim();
  const memo   = (userMemo || "").trim();
  const explicitSite = (subSite || program?.site || "").trim();

  // ── 치료 선택 (ortho-data 전체가 정형외과 자산 → 화이트리스트 필터 없음) ──
  const reqId = program?.id;
  const treatment =
    (reqId && ORTHO_TREATMENTS.find(t => t.id === reqId)) ||
    ORTHO_TREATMENTS.find(t => t.id === "lumbar_disc") ||
    ORTHO_TREATMENTS[0];

  const keyword = treatment.name;
  const tid     = treatment.id;

  // ── activeKeyword/fullKeyword 결정 ──
  let detectedSite = "";
  if (explicitSite) {
    detectedSite = SITE_KEYWORDS.find(s => explicitSite.includes(s) && !keyword.includes(s)) || "";
  }
  if (!detectedSite && memo) {
    detectedSite = SITE_KEYWORDS.find(s => memo.includes(s) && !keyword.includes(s)) || "";
  }

  let activeKeyword = detectedSite ? detectedSite + " " + keyword : keyword;
  let fullKeyword   = region + " " + activeKeyword;

  const focus   = getOrthoFocus(treatment);
  const compare = (ORTHO_DIRECTION[tid]?.compare) || treatment.compareWith || "다른 치료";

  const finalTitle = buildOrthoTitleV2(treatment, region, activeKeyword);

  // ── 이미지 ALT (Purpose 7섹션 — 공감/판단/확인/결정/선택/장면/마무리) ──
  const _alt = (label) => `[이미지: ${label}]`;
  const imgAlts = {
    concern:           _alt("공감 증상 사진"),
    visitTrigger:      _alt("진료 고려 사진"),
    examination:       _alt("검사 사진"),
    treatmentDecision: _alt("치료 상담 사진"),
    checkPoint:        _alt("병원 선택 사진"),
    sceneVisit:        _alt("진료실 검사실 사진"),
    closing:           _alt("일상 사진"),
  };

  // ── PHOTO_BLOCK ──
  const PHOTO_BLOCK = photoContext
    ? "\n\n[사진 컨텍스트]\n" + String(photoContext).slice(0, 500) + "\n"
    : "";

  const focusBlock = focus
    ? "[집중 방향 — 계열 혼용 금지]\n🎯 " + focus.focus
      + (focus.forbid ? " — \"" + focus.forbid + "\" 언급 금지" : "") + "\n\n"
    : "";

  // ── 시스템 프롬프트(정보형 단일) ──
  const systemPrompt =
    "당신은 " + region + " 정형외과 " + activeKeyword + " 진료에 대한 정보를 3인칭 정보형으로 안내하는 작성자입니다. " +
    "광고·후기 톤이 아닌 \"정보 안내\" 형식으로 작성합니다.\n\n" +
    "[톤 — 정보형 안내 (가장 중요)]\n" +
    "  - 1인칭 시점 절대 금지: \"저는/제가/내가/저도/저희/제 케이스\" 사용 금지\n" +
    "  - 어미는 정보형 — 다양하게 섞어 쓸 것: ~됩니다 / ~로 안내됩니다 / ~경우가 있습니다 / ~로 진행됩니다\n" +
    "  - 동일 어미 2회 이상 연속 금지\n" +
    "  - 후기 어미 금지: \"~했어요/~더라고요/~거든요\"\n" +
    "  - 원장·의사 발화 인용 금지: \"원장님이 ~라고 하셨어요\" 일체 금지\n" +
    "  - 추천·CTA 금지: \"추천합니다/방문해보세요/꼭 받으세요/권해드립니다\" 금지\n" +
    "  - 효과 단정 금지: \"확실히/100%/완치/나았다/통증이 사라졌다\" → \"상태에 따라 안내됩니다\"\n" +
    "  - 검사·진단 단정 금지: 검사는 \"원인을 살피기 위한 과정\"으로, 진단은 진료 시 안내되는 것으로 서술\n" +
    "  - 가격 직접 표기 금지: \"비용은 상담 시 안내됩니다\"\n" +
    "  - 병원·의료진 평가 금지: \"친절/전문/최고/믿음\" 어휘 금지\n\n" +
    focusBlock +
    "[글 구조 — 순서 절대 유지 (Purpose 7섹션)]\n" +
    "[핵심 전환] 검사·진단·치료는 '설명 대상'이 아니라 '사용자의 의사결정을 돕는 수단'이다. 각 섹션은 독자가 스스로 판단·결정하도록 돕는 흐름으로 서술한다.\n" +
    "(첫 문단 — 소제목 없이 본문으로 시작 · 120~180자, 짧게 — 공감·검색 계기) // [세션40][NOHDR-01]\n" +
    "## 이럴 때 진료를 고려해볼 수 있습니다 (180~250자 — 방문 판단)\n" +
    "## 진료에서는 무엇을 확인하나요? (200~300자 — 판단 기준 먼저, 검사는 수단으로 종속)\n" +
    "## 치료는 어떤 기준으로 결정되나요? (250~350자 — 의사결정 흐름, 핵심 축)\n" +
    "## 병원 선택 시 확인할 점 (200~300자 — 사용자 판단 기준)\n" +
    "## 진료실과 검사실에서 확인하는 과정 (150~250자 — 장면+방문 안내)\n" +
    "## 마무리 (100~150자)\n\n" +
    "[Purpose 원칙 — 설명보다 결정]\n" +
    "- 목적은 '많이 설명하는 것'이 아니라 '사용자가 빨리 판단하도록 돕는 것'.\n" +
    "- 각 섹션 첫 문장은 그 섹션 제목(질문)에 바로 답하는 문장으로 시작한다.\n" +
    "- 검사·치료 용어를 나열하기 전에 '무엇을 판단하기 위한 것인지'를 먼저 제시한다.\n" +
    "[가독성 원칙 — 모바일]\n" +
    "- 문단당 2~3문장. 한 문장 40~70자 내외. 긴 문단·만연체 금지.\n" +
    "- \"예를 들어 / 또한 / 이러한\" 등 접속 표현 남발 금지.\n" +
    "[나열 제약]\n" +
    "- 검사 종류는 한 번에 최대 2개, 치료 종류는 최대 3개까지만 언급.\n" +
    "- 같은 검사·치료 내용을 반복 설명 금지. 한방·한의 치료는 다루지 않는다.\n" +
    "[정보형 원칙 — 개인 타임라인·회복일지 금지]\n" +
    "- ### 1일 / 1주 / 2주 / 1개월 등 개인 경과 타임라인 절대 금지\n" +
    "- 치료 횟수·회복 기간·비용 단정 금지 — \"개인 상태에 따라 상담 시 안내\" 수준\n" +
    "- 본문 내 가격 직접 표기 절대 금지\n\n" +
    "[필수 비교]\n" +
    activeKeyword + " 관련 접근 vs " + compare + " 일반 비교 1회 필수 (사실 기술 형식, 우열 단정 금지)\n\n" +
    "[narrative — scene 확보]\n" +
    "- 설명문보다 행동·상황 중심 문장 비율 30% 이상 유지\n" +
    "- 최소 1개 단락에서 실제 공간 장면 묘사 포함 (예: \"진료실에서 모니터로 X-ray·MRI 영상을 함께 보며 설명을 듣는다\")\n" +
    "- 동일 패턴(\"진행된다/작용한다/확인된다\") 3회 이상 연속 금지\n\n" +
    "[출력 형식]\n" +
    "마크다운 / 제목(# 시작) / 섹션(## 유지) / 마지막 해시태그\n\n" +
    "[금지]\n" +
    "❌ 같은 문단·구조 반복\n" +
    "❌ 부위·계열 혼용(척추·무릎·어깨·발목·손목 교차 금지)\n" +
    "❌ AI 느낌 문장 / \"드디어/결국 결심하고\"\n" +
    "❌ \"특히/또한/무엇보다\" 연속 나열\n" +
    "❌ 매장명(지점명) 본문 노출\n" +
    "❌ 한방·성형·신경외과 표현\n" +
    PHOTO_BLOCK;

  // ── 섹션 캡 (playConfig override 반영) ──
  const overrides = ORTHO_TREATMENT_OVERRIDES_V2[tid] || {};
  const SECTION_CAP = {};
  for (const sec of ORTHO_FLOW_ENGINE_V2.sections) {
    const ov = overrides[sec.key] || {};
    SECTION_CAP[sec.key] = {
      min: ov.minLength || sec.minLength || 200,
      max: ov.maxLength || sec.maxLength || 300,
    };
  }

  let result = "# " + finalTitle + "\n\n";
  const writtenSections = new Set();

  for (const sec of ORTHO_FLOW_ENGINE_V2.sections) {
    if (writtenSections.has(sec.key)) continue;
    writtenSections.add(sec.key);

    const basePrompt = buildOrthoPromptV2(sec.key, treatment, region, "commercial");
    const cap = SECTION_CAP[sec.key] || { min: 200, max: 300 };

    const focusLine = focus
      ? "🎯 핵심 방향: " + focus.focus
        + (focus.forbid ? " — \"" + focus.forbid + "\" 언급 금지" : "") + "\n"
      : "";

    const userPrompt =
      "질환/치료명: " + activeKeyword + " | 지역: " + region + " | 비교: " + compare + "\n" +
      focusLine +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + cap.min + "~" + cap.max + "자 (상한 엄수 — 넘기지 말 것).\n" +
      "가독성: 문단당 2~3문장, 한 문장 40~70자 내외. 첫 문장은 섹션 제목(질문)에 바로 답할 것.\n" +
      "🔒 집중 키워드: \"" + activeKeyword + "\" 으로만 서술. 다른 계열 혼용 금지.\n" +
      "🔒 복합 키워드: \"" + fullKeyword + "\" 1~2회 자연스럽게 포함.\n" +
      "⚠️ 섹션 제목(## ...)은 쓰지 말 것 — 본문 문장만 작성.\n\n" +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    // 글자수 부족 시 1회 재시도
    if (calcCharCount(content) < cap.min) {
      const retry = await callGPT(
        systemPrompt,
        userPrompt + "\n\n[재작성] 반드시 " + cap.min + "자 이상. 이전과 다른 표현 사용."
      );
      if (calcCharCount(retry) > calcCharCount(content)) content = retry;
    }

    // 섹션 위반 5건 초과 시 strict 재생성
    const sv = countViolations(content);
    if (sv.total > 5) {
      const strictPrompt = userPrompt +
        "\n\n[STRICT 재생성 — 위반 발생]\n" +
        "다음 표현 절대 금지: 1인칭(저는/제가/저희), 추천(추천/꼭/강력), " +
        "효과단정(확실히/완벽/100%/사라짐/완치/나았다), 발화인용(원장님이~하셨), " +
        "병원평가(친절/전문/최고/믿음), 가격(만원/저렴/할인), 후기어투(만족/후회없/다행).\n" +
        "어미는 ~됩니다/~안내됩니다/~경우가 있습니다로만.";
      const restrict = await callGPT(systemPrompt, strictPrompt);
      if (countViolations(restrict).total < sv.total) content = restrict;
    }

    // 섹션 헤더 정규화 — content 확정(retry/strict 포함) 후.
    const secHeader = "## " + sec.label;
    const escLabel = sec.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content.replace(new RegExp("^\\s*#{1,3}\\s*" + escLabel + "[^\\n]*$", "gm"), "");
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    if (sec.key === "concern") {
      // [세션40][NOHDR-01] concern(첫 섹션) = 헤더 미출력. 본문부터 시작.
      content = content.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    } else {
      content = secHeader + "\n\n" + content;
    }

    result += content + "\n\n";

    // [HOSPITAL-PHOTO-POLICY-01] 3슬롯 정책 — closing 조건 → 레지스트리 판정
    if (isClinicPhotoSection(sec.key) && imgAlts[sec.key]) {
      result += imgAlts[sec.key] + "\n\n";
    }
  }

  // ── 후처리 ──
  result = cleanOrthoTextV2(result, activeKeyword);
  result = removeDuplicateSentences(result);

  // 본문 중간 해시태그 제거(끝단 태그줄만 유지)
  // LLM이 섹션 끝마다 자발적으로 붙이는 태그(1개·2개 묶음 모두) 제거.
  // 최종 끝단 태그줄은 아래 447~448에서 통째로 재부착되므로, 여기서는 마지막 줄을 보존한 채 나머지 본문의 모든 #태그를 제거.
  {
    const _lines = result.split("\n");
    let _lastIdx = _lines.length - 1;
    while (_lastIdx >= 0 && _lines[_lastIdx].trim() === "") _lastIdx--;
    const _tail = _lines.slice(_lastIdx + 1).join("\n");
    const _lastLine = _lastIdx >= 0 ? _lines[_lastIdx] : "";
    const _isTailTagLine = /^\s*#[가-힣a-zA-Z0-9]/.test(_lastLine);
    const _bodyEnd = _isTailTagLine ? _lastIdx : _lastIdx + 1;
    const _body = _lines.slice(0, _bodyEnd)
      .map(l => l.replace(/#[가-힣a-zA-Z0-9]+/g, "").replace(/[ \t]+$/g, ""))
      .join("\n");
    const _keep = _lines.slice(_bodyEnd).join("\n");
    result = (_body + (_keep ? "\n" + _keep : "") + (_tail ? "\n" + _tail : "")).trim();
  }

  // 최종 강제 정화 — 위반 5건 초과 시 1회 더
  let finalViolations = countViolations(result);
  if (finalViolations.total > 5) {
    result = cleanOrthoTextV2(result, activeKeyword);
    finalViolations = countViolations(result);
  }

  // 해시태그 부착(정규화 — 업종 혼재·깨진 태그 차단)
  const hashtags = normalizeHashtags(region, treatment);
  result = result.replace(/\n#[가-힣a-zA-Z0-9\s#]+$/g, "").trim();
  result += "\n\n" + hashtags;


  // ── VISIT-01 → PATCH-07 : 🏥 방문 안내 → 📍 찾아오시는 길 → #해시태그 ──
  result = insertVisitBeforeHashtags(result, _visitStore);
  result = insertLocationBeforeHashtags(result, _locStore);
  // ── QC ──
  const qc = runOrthoQCV2(result, keyword, fullKeyword);

  console.log("[ORTHO-V2] tid=" + tid + " site=" + (detectedSite || "-") + " kw=" + activeKeyword);
  console.log("[QC] firstPerson=" + qc.firstPerson + " ad=" + qc.ad + " emo=" + qc.emo + " (목표 0)");
  console.log("[QC] sections=" + qc.hasAllSections + " kwCount=" + qc.kwCount + " fullKw=" + qc.fullKwCount);
  console.log("[QC] violations=" + finalViolations.total);

  const resultMarkdown = result;
  const charCountPlain = calcCharCount(result);

  return res.status(200).json({
    success: true,
    text: result,
    textMarkdown: resultMarkdown,
    content: result,
    charCount: charCountPlain,
    mode: "purpose",
    engine: "ortho-v2",
    title: finalTitle,
    qc: {
      hasAllSections: qc.hasAllSections,
      kwCount: qc.kwCount,
      fullKwCount: qc.fullKwCount,
      firstPerson: qc.firstPerson,
      ad: qc.ad,
      emo: qc.emo,
      violations: finalViolations,
    },
  });
}
