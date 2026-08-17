// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateCardV2.js — 순환기내과 V2 Purpose        ║
// ║ generatePulmoV2 골격 복제 + 순환기 치환.                   ║
// ║ self-contained — v1 없음(신규 업종, V2 단독).             ║
// ║ ★ 고유 축: decisionAxis 1필드로 4섹션 분기                 ║
// ║   exam(5종) = 검사 선택 기준 / disease(5종) = 치료 결정    ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

import { CARD_TREATMENTS } from "../../lib/card-data";
import {
  buildCardV2Prompt,
  CARD_V2_SYSTEM_PROMPT,
  getCardV2ImageAlts,
  getCardV2Direction,
} from "../../lib/card-v2-prompts";
import { CARD_V2_FLOW_ENGINE } from "../../lib/card-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01
import { isClinicPhotoSection } from "../../lib/photoPolicyRegistry"; // [HOSPITAL-PHOTO-POLICY-01]

// ============================================================
// CAT_FOCUS — 5계열 (cat 기준)
// ============================================================
const CARD_CAT_FOCUS = {
  "검사":         { note: "검사 선택 기준과 확인 범위가 축입니다. 질환 치료 설명으로 흐르지 않습니다." },
  "혈압질환":     { note: "반복 측정·수치 흐름 확인 → 위험 요인 종합 → 생활 관리와 약물 접근 순의 판단 축입니다." },
  "허혈성심질환": { note: "증상 유발 상황 확인 → 심전도·부하검사 → 소견에 따라 약물과 추가 확인 순의 판단 축입니다. 시술·수술은 상급 진료 위임 수준만. 급성기 응급 대응 서술 금지." },
  "리듬질환":     { note: "증상 시점의 리듬 기록 확보가 중심 축. 심전도로 확인되지 않으면 하루 기록 검사로 이어집니다. 다른 유발 요인 확인도 함께." },
  "심장기능":     { note: "심장 기능 수치와 위험 요인 확인이 중심 축. 심장 원인인지 아닌지를 가르는 흐름이 함께 이어집니다." },
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
// QC — 진단/효과 단정 · 광고 · 시술 상세 · 후기 잔재 · AI 논문투
// ============================================================
const CARD_V2_FORBIDDEN = [
  "완치됩니다", "재발하지 않습니다", "반드시 좋아집니다", "확실히", "무조건",
  "정상입니다", "이상 없습니다", "심근경색입니다", "진단됩니다",
  "최고", "완벽", "최신 장비", "잘하는 곳", "무통", "강력 추천", "후회 없", "꼭 받으세요", "예약하세요",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
  "절개", "전신마취", "개흉", "봉합", "수술 방법", "스텐트 삽입", "카테터",
  "돌연사", "사망률", "생존율", "골든타임", "응급실로", "즉시 119", "지체 없이",
  "지금 바로 병원", "즉시 내원", "서둘러", "한시라도", "급성 흉통", "응급 대처",
  "했어요", "더라고요", "거든요", "원장님이", "저희",
];

// 1인칭 검출 — 어절 경계 기준. substring 매칭 금지(오탐 방지).
const FIRST_PERSON_RE = /(^|[\s"'(\[])(제가|저는|저도|내가|나는|제\s|저의|제\s?케이스)/;

function countViolations(text) {
  let n = 0;
  CARD_V2_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  if (FIRST_PERSON_RE.test(text)) n++;
  return n;
}

function finalClean(text) {
  let t = text;
  // 진단·효과 단정
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  t = t.replace(/완치됩니다|재발하지 않습니다|반드시 좋아집니다/g, "경과에 따라 달라질 수 있습니다");
  // 불안 조장
  t = t.replace(/돌연사\S*|사망률\S*|생존율\S*|골든타임\S*/g, "경과");
  // 불안 조성·응급 유도 (심근경색 외래 정보형 고정)
  t = t.replace(/지금 바로 병원\S*|즉시 내원\S*|응급실로\S*|즉시 119\S*|지체 없이|서둘러\S*|한시라도\S*/g, "");
  t = t.replace(/급성 흉통/g, "흉통");
  t = t.replace(/응급 대처\S*/g, "확인 항목");
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
  const d    = getCardV2Direction(treatment.id);
  const isExam = d.decisionAxis === "exam";
  const t = isExam
    ? region + " " + name + " 정보｜어떤 경우에 검토되는지 안내"
    : region + " " + name + " 정보｜검사·치료 결정 기준 안내";
  return t.trim();
}

function buildHashtags(name, region) {
  const base = name.replace(/[\s·()]/g, "");
  const reg  = String(region || "").replace(/[\s·()]/g, "");   // PATCH-B: 지역 공백 제거(2어절 해시태그 무효화 차단)
  return "#" + reg + base + " #" + reg + "순환기내과 #" + base + "정보 #심장진료안내";
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
    CARD_TREATMENTS.find(t => t.id === program?.id) ||
    CARD_TREATMENTS[0];

  const tid           = treatment.id;
  const activeKeyword = treatment.name;
  const compare       = treatment.compareWith || "다른 방법";
  const fullKeyword   = region + " " + activeKeyword;

  const dir     = getCardV2Direction(tid);
  const axis    = dir.decisionAxis === "exam" ? "exam" : "disease";
  const catNote = (CARD_CAT_FOCUS[treatment.cat] || { note: "확인 항목과 결정 기준을 중심으로 서술합니다." }).note;

  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  const imgAlts = getCardV2ImageAlts(treatment, region, activeKeyword);

  // ── 시스템 프롬프트 (focus 블록) ──
  const systemPrompt =
    CARD_V2_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 주제 — 이탈 금지]\n" +
    "- 다루는 주제: " + activeKeyword + "\n" +
    "- 비교 대상: " + compare + "\n" +
    "- 진료 계열: " + treatment.cat + "\n" +
    "- 판단 축: " + (axis === "exam"
        ? "검사형 — '어떤 검사를 선택하는가'가 4번째 섹션의 축입니다. 치료 방법 설명 금지."
        : "질환형 — '검사·치료가 어떤 기준으로 결정되는가'가 4번째 섹션의 축입니다. 시술·수술 상세 설명 금지(상급 진료 위임 수준만).") + "\n" +
    "- 계열 유의사항: " + catNote + "\n" +
    "- 모든 섹션이 이 주제 중심으로 일관되게 작성되어야 합니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  // ── 섹션 루프 ──
  for (const sec of CARD_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildCardV2Prompt(sec.key, treatment, region);
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

    // [HOSPITAL-PHOTO-POLICY-01] 3슬롯 정책 — 강제 폴백 제거
    const secAlt = isClinicPhotoSection(sec.key) ? imgAlts[sec.key] : null;
    result += content.trim() + "\n\n" + (secAlt ? secAlt + "\n\n" : "");
  }

  // ── 후처리 ──
  if (countViolations(result) > 0) {
    result = finalClean(result);
  }

  // ============================================================
  // 반복 분산 후처리 — 라인 단위 단일 패스   [v2-fix 2026-07-13 / derma 이식]
  //   보호 라인: 제목(#)·섹션헤더(##)·해시태그(#)·ALT([이미지:)
  //   순서: 복합(지역+진료명) → 지역명 단독 → 진료명 단독. 카운터는 문서 전체 누적.
  //   ★ [fix-1] 소유격(의) 치환 금지 — "기미의 상태" → "이 진료의 상태" 는 지시대상 소실 비문.
  //             josa === "의" 이면 카운트만 하고 원문 유지.
  //   ★ [fix-2] PRONOUN_CAP = 2 — 라인(문단)당 대명사 발행 한도. 3번째부터 원문 복귀.
  //             (기존: 임계 초과 후 전(全) 등장 치환 → 한 문단에 대명사 5~6회)
  //   ★ [fix-3] 대명사 종성 판정 후 조사 정규화 — "이 시술가/를/와" 차단.
  //             ㄹ 받침은 "로"(으로 아님) 예외.
  //   부가: NAME_THRESHOLD 3 → 4 완화.
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
    const NAME_THRESHOLD   = 4;   // [fix] 3 → 4 완화 (진료명 과밀 재발 없음 확인)
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
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + kwEsc + "(\\s?(?:검사|진료|검진))?", "g"),
        (m, pre) => {
          cKw++;
          if (cKw <= KW_THRESHOLD) return m;
          if (isBlockStart(pre)) return m;
          if (emitted >= PRONOUN_CAP) return m;   // [fix-2]
          emitted++;
          return pre + nextPronoun();
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
    engine: "card-v2-purpose",
    qc: {
      violations,
      fullKeyword,
      cat: treatment.cat,
      decisionAxis: axis,
    },
  });
}
