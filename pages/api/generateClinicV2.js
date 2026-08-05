// ============================================================
// pages/api/generateClinicV2.js — 성형외과 정보형 V2 핸들러 (완전 독립)
// ⚠️ derma / dental / ent / oriental / ortho 절대 참조 금지
// [V2] 정보형 단일(commercial). clinic v1(후기형)은 generateClinic.js — 무손상 A/B 보존.
//   engineBootstrap clinic 래퍼가 mode==='purpose'일 때만 이 핸들러로 위임.
// [화이트리스트] clinic-data 무손상 참조 — CLINIC_V2_ALLOWED로 성형 시술만 필터(피부과=derma 배제).
// 골격: dental-v2 표준 = 핸들러 → 제목 → 7섹션 루프 → callGPT → 정보형 후처리 → QC → 응답
// ============================================================

import { ALL_TREATMENTS as CLINIC_TREATMENTS }         from "../../lib/clinic-data";
import { buildClinicPromptV2, CLINIC_SYSTEM_PROMPT_V2, getClinicImageAltsV2, CLINIC_DIRECTION } from "../../lib/clinic-v2-prompts";
import { CLINIC_FLOW_ENGINE_V2, CLINIC_V2_ALLOWED }    from "../../lib/clinic-v2-playConfig";
import { insertLocationBeforeHashtags }                from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags }                   from "../../lib/visitBlock.js";     // VISIT-01

// ------------------------------------------------------------
// 성형 부위 키워드 (제목·activeKeyword 결정용)
// ------------------------------------------------------------
const SITE_KEYWORDS = [
  "쌍꺼풀", "앞트임", "뒤트임", "눈매", "눈밑", "다크서클",
  "콧대", "코끝", "매부리",
  "사각턱", "광대", "이마", "볼", "턱선", "팔자주름", "팔자", "입술",
  "복부", "허벅지", "종아리", "부유방",
  "헤어라인", "정수리", "이마라인",
];

// 부위 미지정 시 자동 락(부위 필수 시술)
const SITE_LOCK_DEFAULTS = {
  botox:          "사각턱",
  filler:         "팔자",
  facial_contour: "사각턱",
};

// ------------------------------------------------------------
// FOCUS MAP — 부위 혼용 차단(성형 특화, 핵심 시술만)
// ------------------------------------------------------------
const CLINIC_FOCUS_MAP = {
  botox: {
    "사각턱":   { focus: "사각턱(저작근) 관점", effect: "턱선 라인 관점·저작근 부피 관점", forbid: "이마 주름·눈가 주름·팔자" },
    "이마":     { focus: "이마 표정 주름 관점", effect: "이마 가로 주름·표정선 관점", forbid: "사각턱·턱선·저작근" },
    "눈가":     { focus: "눈가 잔주름 관점",     effect: "눈가 잔주름 관점", forbid: "사각턱·턱선·저작근" },
    "default":  { focus: "보톡스 시술",          effect: "근육 부피 관점·주름 관점", forbid: "" },
  },
  filler: {
    "팔자":     { focus: "팔자 주름 볼륨 관점",  effect: "팔자 음영 관점·볼륨 관점", forbid: "사각턱·근육·저작근" },
    "콧대":     { focus: "콧대 라인 관점",        effect: "콧대 높이·라인 관점", forbid: "근육·저작근" },
    "입술":     { focus: "입술 볼륨·라인 관점",   effect: "입술 볼륨·라인 관점", forbid: "근육·저작근" },
    "default":  { focus: "필러 시술",             effect: "볼륨 보정·라인 관점", forbid: "" },
  },
  natural_double:  { default: { focus: "자연유착 쌍꺼풀", effect: "라인 형성·자연스러움 관점", forbid: "코·윤곽·리프팅" } },
  eye_fat:         { default: { focus: "눈밑지방재배치", effect: "눈밑 볼륨·그늘 관점", forbid: "코·윤곽·리프팅" } },
  epicanthoplasty: { default: { focus: "앞트임·뒤트임", effect: "눈 가로 폭·몽고주름 관점", forbid: "코·윤곽·리프팅" } },
  ptosis:          { default: { focus: "눈매교정", effect: "눈뜨는 힘·눈매 관점", forbid: "코·윤곽·리프팅" } },
  rhinoplasty:     { default: { focus: "코성형", effect: "콧대·코끝 구조 관점", forbid: "눈·윤곽·리프팅" } },
  sili_lifting:    { default: { focus: "실리프팅", effect: "리프팅 방향·라인 관점", forbid: "눈·코·기미·색소" } },
  ulthera:         { default: { focus: "울쎄라 리프팅", effect: "SMAS 자극·탄력 관점", forbid: "눈·코·여드름·색소" } },
  rf_lifting:      { default: { focus: "RF 리프팅", effect: "피부 탄력·결 관점", forbid: "눈·코·여드름·색소" } },
  facial_contour:  { default: { focus: "안면윤곽", effect: "골격 구조·라인 관점", forbid: "눈·코·리프팅" } },
  forehead:        { default: { focus: "이마성형", effect: "이마 곡선·옆선 관점", forbid: "눈·코·리프팅" } },
  liposuction:     { default: { focus: "지방흡입", effect: "부위별 지방·체형 라인 관점", forbid: "얼굴 부위·리프팅" } },
  fat_graft:       { default: { focus: "지방이식", effect: "자가지방·생착·볼륨 관점", forbid: "리프팅·윤곽" } },
  hair_transplant: { default: { focus: "모발이식", effect: "모낭 이식·라인 디자인 관점", forbid: "얼굴 부위·리프팅" } },
};

function getClinicFocus(treatmentId, site) {
  const m = CLINIC_FOCUS_MAP[treatmentId];
  if (!m) return null;
  if (typeof m.default === "object" && !site) return m.default;
  return m[site] || m.default || null;
}

// ------------------------------------------------------------
// 제목 생성 (정보형)
// ------------------------------------------------------------
function buildClinicTitleV2(treatment, region, activeKeyword) {
  const ak = activeKeyword || treatment.name;
  // 검색의도형: 부위+지역 결합, 정보성 유지. CTR 유발어(추천/베스트/잘하는곳) 배제 — PHILOSOPHY 원칙1.
  return region + " " + ak + ", 성형외과 시술 전 알아둘 점";
}

// ------------------------------------------------------------
// LLM 호출 (OpenAI gpt-4o) — derma/dental v2 동형
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
// 위반 카운트(정보형 안전망) — 1인칭·후기·효과단정·발화인용·타임라인
// ------------------------------------------------------------
const V2_VIOLATION_PATTERNS = [
  /저는|제가|저도|저희|내가|제\s*케이스/g,                     // 1인칭
  /했어요|더라고요|거든요|봤어요|받아봤|느꼈어요/g,             // 후기 어미
  /확실히|완벽(히|하게|한)|100%|완치|기적|드라마틱/g,           // 효과 단정
  /또렷해졌|자연스러워졌|사라졌|없어졌|좋아졌/g,                // 결과 단정
  /추천|강추|꼭\s|권해드|받아보세요|방문해보세요/g,             // 추천·CTA
  /친절|따뜻|신뢰가\s*갔|믿음직|경험\s*많은\s*의사/g,           // 병원 평가
  /원장님(이|은|께서)?\s*.{0,10}(라고|하셨|설명해|말씀)/g,      // 발화 인용
  /1일차|1주일차|2주차|1개월차|시술\s*후\s*첫날|다음날\s*아침/g, // 타임라인
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
// 정보형 후처리(경량 안전망) — 생성 단계 차단의 보완
// ------------------------------------------------------------
function cleanClinicTextV2(text, keyword) {
  let t = String(text || "");

  // 후기 어미 → 정보형
  t = t
    .replace(/받아봤어요/g, "진행되는 경우가 있습니다")
    .replace(/느꼈어요/g, "살펴보게 됩니다")
    .replace(/했어요/g, "합니다")
    .replace(/더라고요/g, "습니다")
    .replace(/거든요/g, "습니다");

  // 1인칭 제거(문장 흐름 보존 최소 치환)
  t = t
    .replace(/저는\s*/g, "")
    .replace(/제가\s*/g, "")
    .replace(/저희\s*/g, "")
    .replace(/저도\s*/g, "");

  // 효과·결과 단정 완화
  t = t
    .replace(/확실히\s*(좋아|개선|또렷|자연스러|줄어)/g, "상태에 따라 $1")
    .replace(/완벽(히|하게|한)/g, "")
    .replace(/(또렷해|자연스러워|밝아)졌(어요|습니다|다)/g, "지는 방향으로 안내됩니다")
    .replace(/(사라|없어)졌(어요|습니다|다)/g, "지는 변화 여부는 상태에 따라 다릅니다")
    .replace(/100%\s*(만족|효과|개선)/g, "개인차가 있는 부분");

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

  // 조사 오류(시술명 직결) 교정 — activeKeyword 받침 기반
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
    "#" + rg + "성형외과",
    "#" + rg + name,
    "#" + name + "정보",
    "#성형외과정보",
    "#" + rg + "성형",
  ];
  // 중복 제거
  return [...new Set(tags)].join(" ");
}

// ------------------------------------------------------------
// QC
// ------------------------------------------------------------
function runClinicQCV2(text, keyword, fullKeyword) {
  const kwCount     = (text.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const fullKwCount = (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const v = countViolations(text);
  const hasAllSections = CLINIC_FLOW_ENGINE_V2.sections.every(s =>
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

  const {
    program, userRegion, userMemo, subSite, photoContext,
    address, map_guide, transit, building_desc, parking_info, // PATCH-07
  } = req.body;
  const _locStore = { address, map_guide, transit, building_desc, parking_info };
  // ── VISIT-01: 방문정보 (store_profiles.visit_info JSONB) ──
  const { visit_info } = req.body;
  const _visitStore = (visit_info && typeof visit_info === "object") ? visit_info : null;

  const region = (userRegion || "강남").trim();
  const memo   = (userMemo || "").trim();
  const explicitSite = (subSite || program?.site || "").trim();

  // ── 성형 시술 화이트리스트 필터(피부과=derma 배제) ──
  const reqId = program?.id;
  const isAllowed = reqId && CLINIC_V2_ALLOWED.includes(reqId);
  const treatment =
    (isAllowed && CLINIC_TREATMENTS.find(t => t.id === reqId)) ||
    CLINIC_TREATMENTS.find(t => t.id === "natural_double") ||
    CLINIC_TREATMENTS[0];

  // 피부과 시술 요청 시 차단 안내
  if (reqId && !CLINIC_V2_ALLOWED.includes(reqId)) {
    return res.status(400).json({
      success: false,
      error: "clinic-v2는 성형 시술만 지원합니다. 피부 시술(피코레이저·레이저토닝 등)은 피부과(derma) 엔진을 이용하세요.",
      allowed: CLINIC_V2_ALLOWED,
    });
  }

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
  if (!detectedSite && SITE_LOCK_DEFAULTS[tid]) {
    detectedSite = SITE_LOCK_DEFAULTS[tid];
  }

  let activeKeyword = detectedSite ? detectedSite + " " + keyword : keyword;
  let fullKeyword   = region + " " + activeKeyword;

  const focus   = getClinicFocus(tid, detectedSite);
  const compare = (CLINIC_DIRECTION[tid]?.compare) || treatment.compareWith || "다른 시술";

  const finalTitle = buildClinicTitleV2(treatment, region, activeKeyword);

  // ── 이미지 ALT(5종 풀 통일) ──
  const ALT_POOL = ["상담 사진", "시술전 사진", "시술중 사진", "경과 사진", "일상 사진"];
  const _alt = (label) => `[이미지: ${label}]`;
  const imgAlts = {
    concern:     _alt("상담 사진"),
    examination: _alt("상담 사진"),
    diagnosis:   _alt("시술전 사진"),
    treatment:   _alt("시술중 사진"),
    visitInfo:   _alt("상담 사진"),
    checkPoint:  _alt("경과 사진"),
    closing:     _alt("일상 사진"),
  };

  // ── PHOTO_BLOCK ──
  const PHOTO_BLOCK = photoContext
    ? "\n\n[사진 컨텍스트]\n" + String(photoContext).slice(0, 500) + "\n"
    : "";

  const focusBlock = focus
    ? "[집중 방향 — 부위 혼용 금지]\n🎯 " + focus.focus + " (관점: " + focus.effect + ")"
      + (focus.forbid ? " — \"" + focus.forbid + "\" 언급 금지" : "") + "\n\n"
    : "";

  // ── 시스템 프롬프트(정보형 단일) ──
  const systemPrompt =
    "당신은 " + region + " 성형외과 " + activeKeyword + " 진료에 대한 정보를 3인칭 정보형으로 안내하는 작성자입니다. " +
    "광고·후기 톤이 아닌 \"정보 안내\" 형식으로 작성합니다.\n\n" +
    "[톤 — 정보형 안내 (가장 중요)]\n" +
    "  - 1인칭 시점 절대 금지: \"저는/제가/내가/저도/저희/제 케이스\" 사용 금지\n" +
    "  - 어미는 정보형 — 다양하게 섞어 쓸 것: ~됩니다 / ~로 안내됩니다 / ~경우가 있습니다 / ~로 진행됩니다\n" +
    "  - 동일 어미 2회 이상 연속 금지\n" +
    "  - 후기 어미 금지: \"~했어요/~더라고요/~거든요\"\n" +
    "  - 원장·의사 발화 인용 금지: \"원장님이 ~라고 하셨어요\" 일체 금지\n" +
    "  - 추천·CTA 금지: \"추천합니다/방문해보세요/꼭 받으세요/권해드립니다\" 금지\n" +
    "  - 효과 단정 금지: \"확실히/100%/완치/또렷해졌다/자연스러워졌다\" → \"상태에 따라 안내됩니다\"\n" +
    "  - 가격 직접 표기 금지: \"비용은 상담 시 안내됩니다\"\n" +
    "  - 병원·의료진 평가 금지: \"친절/전문/최고/믿음\" 어휘 금지\n\n" +
    focusBlock +
    "[글 구조 — 순서 절대 유지 (정보형 7섹션)]\n" +
    "## 증상·상황 (최소 200자)\n" +
    "## 시술 전 확인사항 (최소 200자)\n" +
    "## 성형외과적 판단 요소 (최소 250자)\n" +
    "## 시술 방법 안내 (최소 250자)\n" +
    "## 진료 안내 (최소 200자)\n" +
    "## 확인 포인트 (최소 200자)\n" +
    "## 마무리 (최소 150자)\n\n" +
    "[정보형 원칙 — 개인 타임라인·회복일지 금지]\n" +
    "- ### 1일 / 1주 / 2주 / 1개월 등 개인 경과 타임라인 절대 금지\n" +
    "- 수술 횟수·회복 기간·비용 단정 금지 — \"개인 상태에 따라 상담 시 안내\" 수준\n" +
    "- 본문 내 가격 직접 표기 절대 금지\n\n" +
    "[필수 비교]\n" +
    activeKeyword + " vs " + compare + " 일반 비교 1회 필수 (사실 기술 형식, 우열 단정 금지)\n\n" +
    "[narrative — scene 확보]\n" +
    "- 설명문보다 행동·상황 중심 문장 비율 30% 이상 유지\n" +
    "- 최소 1개 단락에서 실제 공간 장면 묘사 포함 (예: \"진료실에 앉아 모니터로 본인 사진을 보며 설명을 듣는다\")\n" +
    "- 동일 패턴(\"진행된다/작용한다/확인된다\") 3회 이상 연속 금지\n\n" +
    "[출력 형식]\n" +
    "마크다운 / 제목(# 시작) / 섹션(## 유지) / 마지막 해시태그\n\n" +
    "[금지]\n" +
    "❌ 같은 문단·구조 반복\n" +
    "❌ 부위/시술 혼용\n" +
    "❌ AI 느낌 문장 / \"드디어/결국 결심하고\"\n" +
    "❌ \"특히/또한/무엇보다\" 연속 나열\n" +
    "❌ 매장명(지점명) 본문 노출\n" +
    PHOTO_BLOCK;

  // ── 섹션 루프 ──
  const SECTION_CAP = {
    concern:     { min: 200, max: 300 },
    examination: { min: 200, max: 300 },
    diagnosis:   { min: 250, max: 350 },
    treatment:   { min: 250, max: 350 },
    visitInfo:   { min: 200, max: 300 },
    checkPoint:  { min: 200, max: 300 },
    closing:     { min: 150, max: 220 },
  };

  let result = "# " + finalTitle + "\n\n";
  const writtenSections = new Set();

  for (const sec of CLINIC_FLOW_ENGINE_V2.sections) {
    if (writtenSections.has(sec.key)) continue;
    writtenSections.add(sec.key);

    const basePrompt = buildClinicPromptV2(sec.key, treatment, region, "commercial");
    const cap = SECTION_CAP[sec.key] || { min: 200, max: 300 };

    const focusLine = focus
      ? "🎯 핵심 방향: " + focus.focus + " (관점: " + focus.effect + ")"
        + (focus.forbid ? " — \"" + focus.forbid + "\" 언급 금지" : "") + "\n"
      : "";

    const userPrompt =
      "시술명: " + activeKeyword + " | 지역: " + region + " | 비교시술: " + compare + "\n" +
      focusLine +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + cap.min + "~" + cap.max + "자.\n" +
      "🔒 집중 키워드: \"" + activeKeyword + "\" 으로만 서술. 다른 부위 혼용 금지.\n" +
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
        "효과단정(확실히/완벽/100%/사라짐/완치/또렷해졌), 발화인용(원장님이~하셨), " +
        "병원평가(친절/전문/최고/믿음), 가격(만원/저렴/할인), 후기어투(만족/후회없/다행).\n" +
        "어미는 ~됩니다/~안내됩니다/~경우가 있습니다로만.";
      const restrict = await callGPT(systemPrompt, strictPrompt);
      if (countViolations(restrict).total < sv.total) content = restrict;
    }

    // 섹션 헤더 정규화 — content 확정(retry/strict 포함) 후.
    // GPT가 헤더를 0~N회, 위치·조사·공백 변형해 출력해도 무조건 1개만 남긴다.
    const secHeader = "## " + sec.label;
    const escLabel = sec.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 1) 본문 어디에 있든 "## <라벨...>" 형태의 헤더 라인 전부 제거 (라벨 뒤 조사/공백 허용)
    content = content.replace(new RegExp("^\\s*#{1,3}\\s*" + escLabel + "[^\\n]*$", "gm"), "");
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 2) 코드가 헤더 정확히 1개를 선두에 부여
    if (sec.key === "concern") {
      // [세션40][NOHDR-01] concern(첫 섹션) = 헤더 미출력. 본문부터 시작.
      content = content.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    } else {
      content = secHeader + "\n\n" + content;
    }

    result += content + "\n\n";

    if (imgAlts[sec.key] && sec.key !== "closing") {
      result += imgAlts[sec.key] + "\n\n";
    }
  }

  // ── 후처리 ──
  result = cleanClinicTextV2(result, activeKeyword);
  result = removeDuplicateSentences(result);

  // [A-2 fix 2026-07-13] 본문 중간 해시태그 제거 — 반복분산 블록 "앞"으로 이동.
  //   기존 결함: ①블록 뒤에서 제거 ②{2,}=3개 이상만 제거 → 2개짜리 태그가 블록을 통과해
  //   "#실리프팅" → "#이 시술" 로 치환되는 오염 발생(실측).
  //   조치: 블록 진입 전에 제거하고, 임계를 {1,}(=2개 이상)로 완화. 단일 태그는 문장 내 자연 표기라 보존.
  //   최종 해시태그는 아래 normalizeHashtags에서 별도 부착 → 손실 없음.
  result = result.replace(/#[가-힣a-zA-Z0-9]+(\s+#[가-힣a-zA-Z0-9]+){1,}/g, "").trim();

  // 최종 강제 정화 — 위반 5건 초과 시 1회 더
  let finalViolations = countViolations(result);
  if (finalViolations.total > 5) {
    result = cleanClinicTextV2(result, activeKeyword);
    finalViolations = countViolations(result);
  }


  // ============================================================
  // 반복 분산 후처리 — 라인 단위 단일 패스   [v2-fix 2026-07-13 / derma 이식]
  //   보호 라인: 제목(#)·섹션헤더(##)·해시태그(#)·ALT([이미지:)
  //   순서: 복합(지역+시술명) → 지역명 단독 → 시술명 단독. 카운터는 문서 전체 누적.
  //   ★ [fix-1] 소유격(의) 치환 금지 — "이 시술의 상태"는 지시대상 소실 비문. 카운트만.
  //   ★ [fix-2] PRONOUN_CAP = 2 — 라인(문단)당 대명사 발행 한도.
  //   ★ [fix-3] 대명사 종성 판정 후 조사 정규화.
  //             ★ clinic 대명사 = "이 시술" → ㄹ 받침. "이 시술가/를/와" 차단 실사용 케이스.
  //             ㄹ 받침은 "로"(으로 아님) 예외.
  // ============================================================
  {
    // [세션40][PRON-CYCLE] 대명사 순환 — 동일 표현 반복 방지 ("이 검사"×N → 이 검사 / 해당 검사 / 검사)
    const PRONOUN_POOL = ["이 시술", "해당 시술", "시술"];
    let _pIdx = 0;
    const nextPronoun = () => PRONOUN_POOL[_pIdx++ % PRONOUN_POOL.length];

    // [세션40][PRON-CYCLE] 종성 판정 — 후보별 계산 (POOL 요소마다 받침 상이 가능: "이 시술"=ㄹ / "검사"=없음)
    const _jongOf = (w) => {
      const c = w.charCodeAt(w.length - 1);
      return (c >= 0xAC00 && c <= 0xD7A3) ? (c - 0xAC00) % 28 : 0;
    };
    const JOSA_OPEN  = { "이": "가", "은": "는", "을": "를", "과": "와", "으로": "로", "이나": "나" };
    const JOSA_CLOSE = { "가": "이", "는": "은", "를": "을", "와": "과", "나": "이나" };
    const normalizeJosa = (j, pron) => {
      if (!j) return "";
      const _j = _jongOf(pron);
      const HAS_BATCHIM = _j !== 0;
      const IS_RIEUL    = _j === 8;
      if (j === "로" || j === "으로") return HAS_BATCHIM ? (IS_RIEUL ? "로" : "으로") : "로";
      return HAS_BATCHIM ? (JOSA_CLOSE[j] || j) : (JOSA_OPEN[j] || j);
    };

    const kwEsc = fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rEsc  = region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nEsc  = activeKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const JOSA_MAP = {
      "에서": "여기서",
      "에":   "이 지역에",
      "의":   "이 지역의",
      "은":   "이 지역은",
      "는":   "이 지역은",
      "도":   "이 지역도",
    };

    const isBlockStart = (pre) =>
      pre === "" ||
      /^\s*$/.test(pre) ||
      /[「『"'(\[]\s*$/.test(pre);

    const KW_THRESHOLD     = 2;
    const REGION_THRESHOLD = 3;
    const NAME_THRESHOLD   = 4;
    const PRONOUN_CAP      = 2;

    let cKw = 0, cRg = 0, cNm = 0;

    const lines = result.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let ln = lines[i];

      if (/^\s*#/.test(ln) || /^\s*\[이미지:/.test(ln)) continue;
      if (!ln.trim()) continue;

      let emitted = 0;

      // ① 복합(지역+시술명)
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + kwEsc + "(\\s?(?:시술|수술|진료))?", "g"),
        (m, pre) => {
          cKw++;
          if (cKw <= KW_THRESHOLD) return m;
          if (isBlockStart(pre)) return m;
          if (emitted >= PRONOUN_CAP) return m;
          emitted++;
          return pre + nextPronoun();
        }
      );

      // ② 지역명 단독 (대명사 아님 — CAP 무관)
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + rEsc + "(에서|에|의|은|는|도)(?![가-힣])", "g"),
        (m, pre, josa) => {
          cRg++;
          if (cRg <= REGION_THRESHOLD) return m;
          if (isBlockStart(pre)) return m;
          const rep = JOSA_MAP[josa];
          return rep ? (pre + rep) : m;
        }
      );

      // ③ 시술명 단독
      const JOSA_TAIL = "(가|이|는|은|를|을|로|으로|와|과|의|도|에|에서|에는|만|부터|까지|라도|라는|나|이나|보다)?";
      const APPOS  = "(\\s?(?:시술|수술|진료))?";
      const preLen = Math.max(2, region.length + 1);
      const lnSnap = ln;
      ln = ln.replace(
        new RegExp("([\\s\\S]{0," + preLen + "})" + nEsc + APPOS + JOSA_TAIL, "g"),
        (m, pre, appos, josa, off) => {
          if (/[가-힣A-Za-z0-9]$/.test(pre)) return m;
          if (new RegExp(rEsc + "\\s$").test(pre)) return m;
          if (/#$/.test(pre)) return m;   // [A-2b] 해시태그 토큰 내부 → 치환 금지
          cNm++;
          if (cNm <= NAME_THRESHOLD) return m;
          if (/^\s*$/.test(lnSnap.slice(0, off) + pre)) return m;
          if (josa === "의") return m;            // [fix-1]
          if (emitted >= PRONOUN_CAP) return m;   // [fix-2]
          emitted++;
          { const _p = nextPronoun(); return pre + _p + normalizeJosa(josa, _p); }   // [fix-3]
        }
      );

      lines[i] = ln;
    }
    result = lines.join("\n");
  }

  // ============================================================
  // [A-1 fix 2026-07-13] 대명사 조사 최종 정규화 — 결과 전체 1패스
  //   대상: 우리 블록이 발행한 것 + ★GPT가 프롬프트 지시("이 시술로 대체")에 따라 직접 쓴 것.
  //   "이 시술"은 ㄹ 받침 → 가/는/를/와/으로 는 전부 비문. 이/은/을/과/로 로 교정.
  //   실측 결함: "이 시술는 이러한 체계적인 과정을 통해…" (GPT 작성분)
  // [A-3] 문장 붙음 공백 보정 — "있습니다.진료를" → "있습니다. 진료를"
  // ============================================================
  {
    const P = "이 시술";
    const FIX = { "가": "이", "는": "은", "를": "을", "와": "과", "로": "로", "으로": "로", "나": "이나" };
    result = result.replace(
      new RegExp(P + "(으로|가|는|를|와|나)(?![가-힣])", "g"),
      (m, j) => P + (FIX[j] || j)
    );
    // 문장 종결 직후 공백 누락 복구 (한글 문장에 한정 — 소수점·약어 오손상 방지)
    result = result.replace(/([다요])\.([가-힣])/g, "$1. $2");
  }

  // 해시태그 부착(정규화 — 업종 혼재·깨진 태그 차단)
  const hashtags = normalizeHashtags(region, treatment);
  result = result.replace(/\n#[가-힣a-zA-Z0-9\s#]+$/g, "").trim();
  result += "\n\n" + hashtags;

  // ── VISIT-01: visitBlock 후단 1줄 (locationBlock 앞 → 🏥 → 📍 → #) ──
  result = insertVisitBeforeHashtags(result, _visitStore);
  // ── PATCH-07: locationBlock 후단 1줄 ──
  result = insertLocationBeforeHashtags(result, _locStore);

  // ── QC ──
  const qc = runClinicQCV2(result, keyword, fullKeyword);

  console.log("[CLINIC-V2] tid=" + tid + " site=" + (detectedSite || "-") + " kw=" + activeKeyword);
  console.log("[QC] firstPerson=" + qc.firstPerson + " ad=" + qc.ad + " emo=" + qc.emo + " (목표 0)");
  console.log("[QC] sections=" + qc.hasAllSections + " kwCount=" + qc.kwCount + " fullKw=" + qc.fullKwCount);
  console.log("[QC] violations=" + finalViolations.total);

  const resultMarkdown = result;
  const charCountPlain = calcCharCount(result);

  return res.status(200).json({
    success: true,
    text: result,
    textMarkdown: resultMarkdown,
    content: result,                 // PATCH-09 #5 — text/textMarkdown/content 3종
    charCount: charCountPlain,
    mode: "purpose",
    engine: "clinic-v2",
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
