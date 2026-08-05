// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generatePediatricsV2.js — 소아청소년과 V2 Purpose║
// ║ generateObgynV2 골격 복제 + 소아청소년과 치환.             ║
// ║ self-contained — v1(generatePediatrics) 보존·미호출.       ║
// ║ ★ 고유 축: decisionAxis 1필드로 4섹션 분기                 ║
// ║   exam(5종) = 검사 선택 기준 / disease(9종) = 치료 결정    ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

import { PEDIATRICS_V2_TREATMENTS } from "../../lib/pediatrics-v2-data";
import {
  buildPediatricsV2Prompt,
  PEDIATRICS_V2_SYSTEM_PROMPT,
  getPediatricsV2ImageAlts,
  getPediatricsV2Direction,
} from "../../lib/pediatrics-v2-prompts";
import { PEDIATRICS_V2_FLOW_ENGINE } from "../../lib/pediatrics-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01

// ============================================================
// CAT_FOCUS — 5계열 (cat 기준)
// ============================================================
const PEDIATRICS_CAT_FOCUS = {
  "검사":         { note: "검사 선택 기준과 확인 범위가 축입니다. 질환 치료 설명으로 흐르지 않습니다. 결과는 보호자 관찰 기록·증상 경과와 함께 해석되며, 나이와 성장에 따라 재확인 시점이 검토된다는 구조를 유지합니다." },
  "호흡기":       { note: "증상이 심해지는 시간대·상황과 진찰 소견이 판단의 출발점. 먹는 양·활력 등 아이의 일상 상태가 방향을 가릅니다. 응급 판단 기준·해열제 사용법 설명 절대 금지 — 상태 변화 시 확인 지점은 '진료에서 안내되는 항목' 수준만." },
  "알레르기·피부": { note: "증상이 나타나는 부위·시기 기록이 축. 관련 자극 요인 확인은 '증상 기록과 함께 해석되는 항목' 수준으로만. 특정 식품·환경을 원인으로 단정 금지. 성장하며 양상이 달라진다는 구조 유지." },
  "소화기":       { note: "물과 음식을 받아들이는 정도, 소변 횟수, 활력 등 일상 상태가 방향을 가르는 축입니다. 구토·설사 횟수를 판단 기준 수치로 단정 금지. 수분 보충 방법은 '진료에서 안내되는 항목' 수준만." },
  "감염·성장":    { note: "수족구는 먹고 마시는 정도와 단체 생활 복귀 시점 확인이 축. 성조숙증은 성장 기록·뼈 나이·수치를 함께 확인하는 흐름이 축이며, 예상 키·최종 키 언급과 또래 비교 압박 절대 금지. 성장호르몬 치료 언급 금지." },
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
      max_tokens: 1000,
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

// ============================================================
// 네이버 복사용 평문 변환
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;
  t = t.replace(/^#\s+(.+)$/gm, "$1");
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1");
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// QC — 진단/효과 단정 · 광고 · 수술 상세 · 후기 잔재 · AI 논문투 · 경계 침범
// ============================================================
const PEDIATRICS_V2_FORBIDDEN = [
  "완치됩니다", "재발하지 않습니다", "반드시 좋아집니다", "확실히", "무조건",
  "정상입니다", "이상 없습니다", "진단됩니다",
  "최고", "완벽", "최신 장비", "잘하는 곳", "무통", "강력 추천", "후회 없", "꼭 받으세요", "예약하세요",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
  "골든타임", "지금 바로 병원", "즉시 내원", "지체 없이", "서둘러", "한시라도", "응급 대처",
  // 경계 침범 — 예방접종 (백신 권장·효과 리스크)
  "예방접종", "백신", "독감주사", "접종 일정", "접종 시기", "항체 형성",
  // 경계 침범 — 응급 프레이밍 (고열·열성경련)
  "열성경련", "해열제", "고열 대처", "응급실 가야", "경련이 일어나면",
  // 경계 침범 — 성장호르몬·비만 (비급여 광고)
  "성장호르몬", "키성장클리닉", "성장 주사", "예상 키", "최종 키", "저신장 치료",
  "소아비만", "체중 감량", "다이어트",
  // 경계 침범 — 신생아
  "신생아 황달", "영아 산통", "모유수유",
  // 경계 침범 — 이비인후과 SoT
  "중이염", "비염", "축농증", "부비동염", "편도", "이명", "난청",
  // 경계 침범 — 안과 SoT
  "결막염", "다래끼", "소아근시", "안압",
  // 경계 침범 — 정신건강의학과 SoT
  "ADHD", "주의력결핍", "발달장애", "자폐", "틱장애",
  // 보호자 불안·죄책감 자극 (소아 고유 리스크)
  "방치하면", "더 늦기 전에", "부모라면", "엄마라면", "엄마 잘못",
  "아이 인생", "평생 후회", "치료 시기를 놓치면",
  "또래보다 뒤처", "남들보다 늦어",
  // 커뮤니티 인용 톤
  "맘카페", "엄마들 사이",
  "했어요", "더라고요", "거든요", "원장님이", "저희", "우리 아이는",
];

// 1인칭 검출 — 어절 경계 기준. substring 매칭 금지(오탐 방지).
const FIRST_PERSON_RE = /(^|[\s"'(\[])(제가|저는|저도|내가|나는|제\s|저의|제\s?케이스|우리\s?아이)/;

function countViolations(text) {
  let n = 0;
  PEDIATRICS_V2_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  if (FIRST_PERSON_RE.test(text)) n++;
  return n;
}

function finalClean(text) {
  let t = text;
  // 진단·효과 단정
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  t = t.replace(/완치됩니다|재발하지 않습니다|반드시 좋아집니다/g, "경과에 따라 달라질 수 있습니다");
  // 불안 조장·응급 유도
  t = t.replace(/골든타임\S*/g, "경과");
  t = t.replace(/지금 바로 병원\S*|즉시 내원\S*|지체 없이|서둘러\S*|한시라도\S*/g, "");
  t = t.replace(/응급 대처\S*/g, "확인 항목");
  // 경계 — 응급 대처법 문장 단위 제거 (해열제·경련)
  t = t.replace(/[^.!?\n]*(?:해열제|열성경련|경련이 일어나면|응급실 가야|고열 대처)[^.!?\n]*[.!?]/g, "");
  // 경계 — 예방접종 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:예방접종|백신|접종 일정|접종 시기|항체 형성|독감주사)[^.!?\n]*[.!?]/g, "");
  // 경계 — 성장호르몬·예상 키 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:성장호르몬|키성장클리닉|성장 주사|예상 키|최종 키|저신장 치료)[^.!?\n]*[.!?]/g, "");
  // 보호자 불안·죄책감 자극 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:방치하면|더 늦기 전에|부모라면|엄마라면|엄마 잘못|아이 인생|평생 후회|치료 시기를 놓치면|또래보다 뒤처|남들보다 늦어)[^.!?\n]*[.!?]/g, "");
  // 커뮤니티 인용 톤 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:맘카페|엄마들 사이)[^.!?\n]*[.!?]/g, "");
  // 광고
  t = t.replace(/최신\s*장비|최고\s*사양/g, "검사 장비");
  t = t.replace(/잘하는\s*곳/g, "진료 가능한 곳");
  t = t.replace(/강력\s*추천|꼭 받으세요|예약하세요|후회 없\S*/g, "");
  // AI 논문투
  t = t.replace(/^정리하면[,\s]*/gm, "");
  t = t.replace(/^결론적으로[,\s]*/gm, "");
  // 공백
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// 제목 / 해시태그
// ============================================================
function buildTitle(treatment, region) {
  const name = treatment.name;
  const d    = getPediatricsV2Direction(treatment.id);
  const isExam = d.decisionAxis === "exam";
  const t = isExam
    ? region + " " + name + " 정보｜어떤 경우에 검토되는지 안내"
    : region + " " + name + " 정보｜검사·치료 결정 기준 안내";
  return t.trim();
}

function buildHashtags(name, region) {
  const base = name.replace(/[\s·()]/g, "");
  const reg  = String(region || "").replace(/[\s·()]/g, "");   // PATCH-B: 지역 공백 제거(2어절 해시태그 무효화 차단)
  return "#" + reg + base + " #" + reg + "소아과 #" + base + "정보 #소아청소년과진료안내";
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    program, userRegion, photoContext,
    address, map_guide, transit, building_desc, parking_info, // PATCH-07
  } = req.body;
  const _locStore = { address, map_guide, transit, building_desc, parking_info };

  // ── VISIT-01: 방문정보 (store_profiles.visit_info JSONB) ──
  const { visit_info } = req.body;
  const _visitStore = (visit_info && typeof visit_info === "object") ? visit_info : null;
  const region   = (userRegion || "강남").trim();
  const photoCtx = (photoContext && typeof photoContext === "string") ? photoContext.trim() : "";

  const treatment =
    PEDIATRICS_V2_TREATMENTS.find(t => t.id === program?.id) ||
    PEDIATRICS_V2_TREATMENTS[0];

  const tid           = treatment.id;
  const activeKeyword = treatment.name;
  const compare       = treatment.compareWith || "다른 방법";
  const fullKeyword   = region + " " + activeKeyword;

  const dir     = getPediatricsV2Direction(tid);
  const axis    = dir.decisionAxis === "exam" ? "exam" : "disease";
  const catNote = (PEDIATRICS_CAT_FOCUS[treatment.cat] || { note: "확인 항목과 결정 기준을 중심으로 서술합니다." }).note;

  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  const imgAlts = getPediatricsV2ImageAlts(treatment, region, activeKeyword);

  // ── 시스템 프롬프트 (focus 블록) ──
  const systemPrompt =
    PEDIATRICS_V2_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 주제 — 이탈 금지]\n" +
    "- 다루는 주제: " + activeKeyword + "\n" +
    "- 비교 대상: " + compare + "\n" +
    "- 진료 계열: " + treatment.cat + "\n" +
    "- 판단 축: " + (axis === "exam"
        ? "검사형 — '어떤 검사를 선택하는가'가 4번째 섹션의 축입니다. 치료 방법 설명 금지."
        : "질환형 — '검사·치료가 어떤 기준으로 결정되는가'가 4번째 섹션의 축입니다. 수술 상세 설명 금지(진료에서 논의되는 방향 수준만).") + "\n" +
    "- 계열 유의사항: " + catNote + "\n" +
    "- 모든 섹션이 이 주제 중심으로 일관되게 작성되어야 합니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  // ── 섹션 루프 ──
  for (const sec of PEDIATRICS_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildPediatricsV2Prompt(sec.key, treatment, region);
    const min = sec.minLength;
    const max = sec.maxLength;

    const userPrompt =
      "주제: " + activeKeyword + " | 지역: " + region + " | 비교: " + compare + "\n" +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + min + "~" + max + "자.\n" +
      "🔒 집중 주제: \"" + activeKeyword + "\" 로만 서술. 다른 진료는 비교 목적으로만 언급.\n" +
      "🔒 복합 키워드: \"" + fullKeyword + "\" 는 과다 반복 금지 (이 섹션 1회 이내).\n" +
      "🔒 1인칭 후기 금지. 정보 안내형으로만 작성.\n\n" +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    // 섹션 헤더 중복 제거
    const esc = ("## " + sec.label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const headerCount = (content.match(new RegExp(esc, "g")) || []).length;
    if (headerCount > 1) {
      content = content.replace(new RegExp("(" + esc + ".*?)(?=" + esc + ")", "s"), "");
    }

    // 글자수 부족 시 1회 재시도
    if (calcCharCount(content) < min) {
      const retry = await callGPT(
        systemPrompt,
        userPrompt + "\n\n[재작성] 반드시 " + min + "자 이상. 이전과 다른 표현 사용."
      );
      if (calcCharCount(retry) > calcCharCount(content)) content = retry;
    }

    // 섹션 헤더 부여
    if (sec.key === "concern") {
      // [세션40][NOHDR-01] concern(첫 섹션) = 헤더 미출력. 본문부터 시작.
      content = content.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    } else if (!content.trim().startsWith("##")) {
      content = "## " + sec.label + "\n" + content.trim();
    }

    const secAlt = imgAlts[sec.key] || imgAlts.examination;
    result += content.trim() + "\n\n" + secAlt + "\n\n";
  }

  // ── 후처리 ──
  if (countViolations(result) > 0) {
    result = finalClean(result);
  }

  // ============================================================
  // 반복 분산 후처리 — 라인 단위 단일 패스   [3종 결함 수정본 · urology 이식]
  //   보호 라인: 제목(#)·섹션헤더(##)·해시태그(#)·ALT([이미지:)
  //   순서: 복합(지역+진료명) → 지역명 단독 → 진료명 단독. 카운터는 문서 전체 누적.
  //   ★ [fix-1] 소유격(의) 치환 금지 — 지시대상 소실 비문 차단. 카운트만 하고 원문 유지.
  //   ★ [fix-2] PRONOUN_CAP = 2 — 라인(문단)당 대명사 발행 한도. 3번째부터 원문 복귀.
  //   ★ [fix-3] 대명사 종성 판정 후 조사 정규화. ㄹ 받침은 "로"(으로 아님) 예외.
  //     pediatrics 대명사 = "이 검사"·"이 진료" → 둘 다 무받침. obgyn과 동일 잠복(무해) 상태.
  //   부가: NAME_THRESHOLD 4.
  // ============================================================
  {
    // [세션40][PRON-CYCLE] 대명사 순환 — 동일 표현 반복 방지 ("이 검사"×N → 이 검사 / 해당 검사 / 검사)
    const PRONOUN_POOL = axis === "exam" ? ["이 검사", "해당 검사", "검사"] : ["이 진료", "해당 진료", "진료"];
    let _pIdx = 0;
    const nextPronoun = () => PRONOUN_POOL[_pIdx++ % PRONOUN_POOL.length];

    // ── [fix-3] 대명사 종성 판정 → 조사 정규화 ──
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

    // 지역명 조사별 치환 매핑 (이중 조사·부유 표현 방지)
    const JOSA_MAP = {
      "에서": "여기서",
      "에":   "이 지역에",
      "의":   "이 지역의",
      "은":   "이 지역은",
      "는":   "이 지역은",
      "도":   "이 지역도",
    };

    // 문단 첫머리 판정 — 줄(문단) 시작 + 여는 괄호·따옴표 직후만 보호.
    const isBlockStart = (pre) =>
      pre === "" ||
      /^\s*$/.test(pre) ||
      /[「『"'(\[]\s*$/.test(pre);

    const KW_THRESHOLD     = 2;
    const REGION_THRESHOLD = 3;
    const NAME_THRESHOLD   = 4;
    const PRONOUN_CAP      = 2;   // [fix-2] 라인(문단)당 대명사 발행 한도

    let cKw = 0;   // 복합 카운트
    let cRg = 0;   // 지역명 단독 카운트
    let cNm = 0;   // 진료명 단독 카운트

    const lines = result.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let ln = lines[i];

      // 보호 라인: 제목/섹션헤더/해시태그(#) · ALT([이미지:)
      if (/^\s*#/.test(ln) || /^\s*\[이미지:/.test(ln)) continue;
      if (!ln.trim()) continue;

      let emitted = 0;   // [fix-2] 이 라인에서 발행한 대명사 수

      // ① 복합(지역+진료명) — 임계 초과 & 문단 첫머리 아닐 때만 대명사
      //   뒤따르는 범주어(검사/진료/검진)도 함께 흡수 — "이 검사 검사" 중복 차단.
      //   ★ [fix-4] 뒤따르는 조사도 흡수 → 대명사 종성 기준 정규화.
      //     (기존: 원문 조사 그대로 잔존 → "이 진료이 함께" 비문. obgyn/urology 잠복 결함 동형)
      //     소유격(의)은 [fix-1] 원칙대로 치환하지 않고 원문 유지.
      const KW_JOSA = "(가|이|는|은|를|을|로|으로|와|과|의|도|에|에서|에는|만|부터|까지|라도|라는|나|이나|보다)?";
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + kwEsc + "(\\s?(?:검사|진료|검진))?" + KW_JOSA, "g"),
        (m, pre, appos, josa) => {
          cKw++;
          if (cKw <= KW_THRESHOLD) return m;
          if (isBlockStart(pre)) return m;
          if (josa === "의") return m;            // [fix-1] 소유격 보존
          if (emitted >= PRONOUN_CAP) return m;   // [fix-2]
          emitted++;
          { const _p = nextPronoun(); return pre + _p + normalizeJosa(josa, _p); }   // [fix-3] 조사 정규화
        }
      );

      // ② 지역명 단독 — 대명사 아님(PRONOUN_CAP 무관)
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

      // ③ 진료명 단독 — 조사는 명시 허용, 앞 문자만으로 연장어 차단
      const JOSA_TAIL = "(가|이|는|은|를|을|로|으로|와|과|의|도|에|에서|에는|만|부터|까지|라도|라는|나|이나|보다)?";
      const APPOS  = "(\\s?(?:검사|진료|검진))?";   // 동격 명사 흡수 ("이 검사 검사" 방지)
      const preLen = Math.max(2, region.length + 1);
      const lnSnap = ln;   // replace 중 재할당 방지용 스냅샷
      ln = ln.replace(
        new RegExp("([\\s\\S]{0," + preLen + "})" + nEsc + APPOS + JOSA_TAIL, "g"),
        (m, pre, appos, josa, off) => {
          // 앞이 한글/영숫자 → 더 긴 진료명의 일부
          if (/[가-힣A-Za-z0-9]$/.test(pre)) return m;
          // 앞이 '지역명 + 공백' → ①단이 보존한 복합 키워드의 뒷부분
          if (new RegExp(rEsc + "\\s$").test(pre)) return m;
          cNm++;
          if (cNm <= NAME_THRESHOLD) return m;
          // 문단 첫머리 → 주어 자리 보존
          if (/^\s*$/.test(lnSnap.slice(0, off) + pre)) return m;
          // [fix-1] 소유격(의) → 지시대상 소실 비문. 카운트만 하고 원문 유지.
          if (josa === "의") return m;
          if (emitted >= PRONOUN_CAP) return m;   // [fix-2]
          emitted++;
          // [fix-3] 대명사 종성 기준 조사 정규화
          { const _p = nextPronoun(); return pre + _p + normalizeJosa(josa, _p); }
        }
      );

      lines[i] = ln;
    }
    result = lines.join("\n");
  }

  // 해시태그 (closing ALT는 섹션 루프에서 이미 부착 — 중복 append 안 함)
  const tags = buildHashtags(activeKeyword, region);
  result = result.replace(/\n+(HASHTAGS:.+)?$/s, "").trimEnd();
  result += "\n\n" + tags;

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
  const resultPlain    = stripMarkdownForNaver(result);

  const charCount  = calcCharCount(resultPlain);
  const violations = countViolations(resultPlain);

  return res.status(200).json({
    success: true,
    text: resultPlain,
    textMarkdown: resultMarkdown,
    content: resultPlain,
    charCount,
    title: finalTitle,
    engine: "pediatrics-v2-purpose",
    qc: {
      violations,
      fullKeyword,
      cat: treatment.cat,
      decisionAxis: axis,
    },
  });
}
