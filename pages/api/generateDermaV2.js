// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateDermaV2.js — 피부과 V2 Purpose           ║
// ║ generateCardV2 골격 복제 + 피부과 치환.                     ║
// ║ v1(generateDerma.js)은 FREEZE. 이 파일은 독립 V2.          ║
// ║ ★ 고유 축: decisionAxis 1필드로 4섹션 분기                 ║
// ║   procedure(9종) = 시술 선택 기준 / disease(18종) = 치료 결정 ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                ║
// ║ ⚠ closing ALT 중복 금지 — 섹션 루프에서만 부착.            ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

import { DERMA_V2_TREATMENTS } from "../../lib/derma-v2-data";
import {
  buildDermaV2Prompt,
  DERMA_V2_SYSTEM_PROMPT,
  getDermaV2ImageAlts,
  getDermaV2Direction,
} from "../../lib/derma-v2-prompts";
import { DERMA_V2_FLOW_ENGINE } from "../../lib/derma-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01
import { isClinicPhotoSection } from "../../lib/photoPolicyRegistry"; // [HOSPITAL-PHOTO-POLICY-01]

// ============================================================
// CAT_FOCUS — 8계열 (cat 기준)
// ============================================================
const DERMA_CAT_FOCUS = {
  "여드름·흉터":       { note: "병변 형태와 염증 정도 구분 → 단계별 접근 → 흉터 가능성 평가 순의 판단 축입니다. 시술 홍보로 흐르지 않습니다." },
  "색소질환":          { note: "색소의 경계·깊이·분포로 유형을 가르는 것이 축입니다. 유형에 따라 접근과 재발 관리가 달라집니다." },
  "염증성 피부질환":   { note: "급성기 조절과 이후 유지 관리가 서로 다른 단계로 나뉘는 것이 축입니다. 악화 요인 관리가 함께 이어집니다." },
  "감염·양성병변":     { note: "유사 병변과의 구분이 중심 축. 필요 시 확인 검사가 함께 검토되고, 관리 기간과 재발 요인이 안내됩니다." },
  "탈모":              { note: "빠지는 패턴과 경계를 확인해 유형을 가르는 것이 축입니다. 진행 특성과 경과 확인이 함께 이어집니다." },
  "리프팅·탄력":       { note: "처짐이 어느 층에서 비롯되는지가 선택 기준입니다. 시술 소개가 아니라 '어떤 상태에서 검토되는가'가 축입니다." },
  "레이저·색소시술":   { note: "색소 유형·모발 주기 등 대상 상태가 선택 기준입니다. 우열이 아니라 '목표 대상이 다르다'는 관점을 유지합니다." },
  "주사시술":          { note: "주름이 근육에서 오는지 볼륨에서 오는지, 결·수분 문제인지를 가르는 것이 선택 기준입니다." },
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
// QC — 진단/효과 단정 · 광고 · 가격/이벤트 · 후기 잔재 · AI 논문투
// ============================================================
const DERMA_V2_FORBIDDEN = [
  "완치됩니다", "재발하지 않습니다", "반드시 좋아집니다", "확실히", "무조건",
  "정상입니다", "이상 없습니다", "진단됩니다",
  "최고", "완벽", "최신 장비", "잘하는 곳", "무통", "강력 추천", "후회 없", "꼭 받으세요", "예약하세요",
  "인생시술", "리즈시절", "동안", "확 달라",
  "이벤트", "할인", "특가", "패키지", "프로모션", "저렴",
  "시술 전후", "전후 비교", "눈에 띄게 달라",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
  "했어요", "더라고요", "거든요", "원장님이", "저희",
];

// 1인칭 검출 — 어절 경계 기준. substring 매칭 금지(오탐 방지).
const FIRST_PERSON_RE = /(^|[\s"'(\[])(제가|저는|저도|내가|나는|제\s|저의|제\s?케이스)/;

function countViolations(text) {
  let n = 0;
  DERMA_V2_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  if (FIRST_PERSON_RE.test(text)) n++;
  return n;
}

function finalClean(text) {
  let t = text;
  // 진단·효과 단정
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  t = t.replace(/완치됩니다|재발하지 않습니다|반드시 좋아집니다/g, "경과에 따라 달라질 수 있습니다");
  // 광고
  t = t.replace(/최신\s*장비|최고\s*사양/g, "진료 장비");
  t = t.replace(/잘하는\s*곳/g, "진료 가능한 곳");
  t = t.replace(/강력\s*추천|꼭 받으세요|예약하세요|후회 없\S*/g, "");
  t = t.replace(/인생시술\S*|리즈시절\S*/g, "");
  // 가격·이벤트 (의료광고법)
  t = t.replace(/이벤트\S*|할인\S*|특가\S*|프로모션\S*/g, "");
  t = t.replace(/비용은[^.]*저렴[^.]*\./g, "비용은 진료 항목에 따라 안내됩니다.");
  // 전후 비교
  t = t.replace(/시술 전후\S*|전후 비교\S*/g, "경과");
  t = t.replace(/눈에 띄게 달라\S*/g, "상태에 따라 달라질 수 있습니다");
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
  const d    = getDermaV2Direction(treatment.id);
  const isProc = d.decisionAxis === "procedure";
  const t = isProc
    ? region + " " + name + " 정보｜어떤 경우에 검토되는지 안내"
    : region + " " + name + " 정보｜치료 결정 기준 안내";
  return t.trim();
}

function buildHashtags(name, region) {
  const base = name.replace(/[\s·()]/g, "");
  const reg  = String(region || "").replace(/[\s·()]/g, "");   // PATCH-B: 지역 공백 제거(2어절 해시태그 무효화 차단)
  return "#" + reg + base + " #" + reg + "피부과 #" + base + "정보 #피부진료안내";
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
    DERMA_V2_TREATMENTS.find(t => t.id === program?.id) ||
    DERMA_V2_TREATMENTS[0];

  const tid           = treatment.id;
  const activeKeyword = treatment.name;
  const compare       = treatment.compareWith || "다른 방법";
  const fullKeyword   = region + " " + activeKeyword;

  const dir     = getDermaV2Direction(tid);
  const axis    = dir.decisionAxis === "procedure" ? "procedure" : "disease";
  const catNote = (DERMA_CAT_FOCUS[treatment.cat] || { note: "확인 항목과 결정 기준을 중심으로 서술합니다." }).note;

  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  const imgAlts = getDermaV2ImageAlts(treatment, region, activeKeyword);

  // ── 시스템 프롬프트 (focus 블록) ──
  const systemPrompt =
    DERMA_V2_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 주제 — 이탈 금지]\n" +
    "- 다루는 주제: " + activeKeyword + "\n" +
    "- 비교 대상: " + compare + "\n" +
    "- 진료 계열: " + treatment.cat + "\n" +
    "- 판단 축: " + (axis === "procedure"
        ? "시술형 — '어떤 피부 상태에서 이 시술이 검토되는가(선택 기준)'가 4번째 섹션의 축입니다. 시술 소개·홍보 금지. 질환 치료 설명 금지."
        : "질환형 — '치료가 어떤 기준으로 결정되는가'가 4번째 섹션의 축입니다. 구체적 약물명·용량 설명 금지(단계 수준만).") + "\n" +
    "- 계열 유의사항: " + catNote + "\n" +
    "- 모든 섹션이 이 주제 중심으로 일관되게 작성되어야 합니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  // ── 섹션 루프 ──
  for (const sec of DERMA_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildDermaV2Prompt(sec.key, treatment, region);
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
  // 반복 분산 후처리 — 라인 단위 단일 패스 (card-v2 실측 보정본 이식)
  //   ★ 본문 라인만 대상. 제목(#)·섹션헤더(##)·ALT([이미지:)·해시태그 라인은 보호.
  //   순서: 복합(지역+진료명) → 지역명 단독 → 진료명 단독. 카운터는 문서 전체 누적.
  // ============================================================
  {
    // [세션40][PRON-CYCLE] 대명사 순환 — 동일 표현 반복 방지 ("이 검사"×N → 이 검사 / 해당 검사 / 검사)
    const PRONOUN_POOL = axis === "procedure" ? ["이 시술", "해당 시술", "시술"] : ["이 진료", "해당 진료", "진료"];
    let _pIdx = 0;
    const nextPronoun = () => PRONOUN_POOL[_pIdx++ % PRONOUN_POOL.length];
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

    // 문단 첫머리 판정 — 줄(문단) 시작 + 여는 괄호·따옴표 직후로 한정.
    const isBlockStart = (pre) =>
      pre === "" ||
      /^\s*$/.test(pre) ||
      /[「『"'(\[]\s*$/.test(pre);

    // ★ [fix 2026-07-13 · derma-v2 실측] 조사 받침 정규화
    //   card/pulmo는 대명사가 "이 검사"·"이 진료"(무받침)뿐이라 무받침 조사 고정 매핑이 통했다.
    //   derma는 procedure 축 대명사가 "이 시술"(받침 ㄹ) → 같은 매핑을 쓰면
    //   "이 시술가 / 이 시술를 / 이 시술와" 비문이 발생한다(실측 확인).
    //   → 대명사의 종성을 판정해 조사를 붙인다. ㄹ 받침은 '로'(으로 아님) 예외 처리.
    // [세션40][PRON-CYCLE] POOL 전 후보를 순회하며 조사 정규화 (후보별 받침 상이)
    const JOSA_PAIRS = [["으로", "로"], ["이나", "나"], ["은", "는"], ["이", "가"], ["을", "를"], ["과", "와"]];
    const normalizeJosa = (s) => {
      for (const P of PRONOUN_POOL) {
        const _lastCh = P.charCodeAt(P.length - 1);
        const _jong   = (_lastCh >= 0xAC00 && _lastCh <= 0xD7A3) ? (_lastCh - 0xAC00) % 28 : 0;
        const HAS_BATCHIM = _jong !== 0;
        const IS_RIEUL    = _jong === 8;   // ㄹ 받침 → "로" (시술로 ○ / 시술으로 ✕)
        const pEsc = P.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const [withB, withoutB] of JOSA_PAIRS) {
          const correct =
            (withB === "으로")
              ? (HAS_BATCHIM && !IS_RIEUL ? "으로" : "로")
              : (HAS_BATCHIM ? withB : withoutB);
          s = s.replace(
            new RegExp(pEsc + "(?:" + withB + "|" + withoutB + ")(?![가-힣])", "g"),
            P + correct
          );
        }
      }
      return s;
    };

    let cKw = 0;
    let cRg = 0;
    let cNm = 0;

    // ★ [fix 2026-07-13 · derma-v2 실측] 대명사 남용 3종 차단
    //   실측 결함: "이 진료의 상태 / 이 진료의 원인 / 이 진료 증상의 유발" 처럼
    //     ① 소유격(의) 자리를 대명사로 바꾸면 지시대상이 사라져 비문이 된다.
    //     ② 임계 초과 후 '모든' 등장을 치환해 한 문단에 "이 진료"가 5~6회 반복된다.
    //   대응:
    //     ① 뒤에 조사 '의'가 오면 치환 금지 (카운트는 함).  → "기미의 상태" 원문 유지
    //     ② 문단(라인)당 대명사 발행 한도 2회. 3번째부터 원문 복귀.  → PRONOUN_CAP
    //     ③ 진료명 단독 치환 임계 3 → 4 완화.
    //   ※ card/pulmo/gastro/endo/radio 동일 결함 — derma 검증 PASS 후 이식(별도 축).
    const PRONOUN_CAP = 2;   // 문단(라인)당 대명사 최대 발행 수
    const NAME_THRESHOLD = 4; // 진료명 단독 치환 임계 (기존 3)

    const lines = result.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let ln = lines[i];

      if (/^\s*#/.test(ln) || /^\s*\[이미지:/.test(ln)) continue;
      if (!ln.trim()) continue;

      let pUsed = 0;   // ★ 이 문단에서 발행한 대명사 수 (①·③ 공통 예산)

      // ① 복합(지역+진료명) — 2회 초과 & 문단 첫머리 아닐 때만 대명사
      //    뒤따르는 범주어(시술/진료/치료)도 함께 흡수 — "이 시술 시술" 중복 차단.
      //    ★ 소유격(의) 뒤 치환 금지 + 문단 대명사 한도 적용.
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + kwEsc + "(\\s?(?:시술|진료|치료))?(의)?", "g"),
        (m, pre, appos, possessive) => {
          cKw++;
          if (cKw <= 2) return m;
          if (isBlockStart(pre)) return m;
          if (possessive) return m;              // ★ "…기미의" → 원문 유지
          if (pUsed >= PRONOUN_CAP) return m;    // ★ 문단 대명사 한도 초과 → 원문 유지
          pUsed++;
          return pre + nextPronoun();
        }
      );

      // ② 지역명 단독 — 3회 초과 & 문단 첫머리 아닐 때만 치환
      ln = ln.replace(
        new RegExp("([\\s\\S]{0,2})" + rEsc + "(에서|에|의|은|는|도)(?![가-힣])", "g"),
        (m, pre, josa) => {
          cRg++;
          if (cRg <= 3) return m;
          if (isBlockStart(pre)) return m;
          const rep = JOSA_MAP[josa];
          return rep ? (pre + rep) : m;
        }
      );

      // ③ 진료명 단독 — NAME_THRESHOLD 초과 & 문단 첫머리 아닐 때만 치환
      const JOSA_TAIL = "(가|이|는|은|를|을|로|으로|와|과|의|도|에|에서|에는|만|부터|까지|라도|라는|나|이나|보다)?";
      const APPOS = "(\\s?(?:시술|진료|치료))?";
      const preLen = Math.max(2, region.length + 1);
      const lnSnap = ln;
      ln = ln.replace(
        new RegExp("([\\s\\S]{0," + preLen + "})" + nEsc + APPOS + JOSA_TAIL, "g"),
        (m, pre, appos, josa, off) => {
          // 앞이 한글/영숫자 → 더 긴 진료명의 일부
          if (/[가-힣A-Za-z0-9]$/.test(pre)) return m;
          // 앞이 '지역명 + 공백' → ①단이 보존한 복합 키워드의 뒷부분
          if (new RegExp(rEsc + "\\s$").test(pre)) return m;
          cNm++;
          if (cNm <= NAME_THRESHOLD) return m;                      // ★ 임계 3 → 4
          if (/^\s*$/.test(lnSnap.slice(0, off) + pre)) return m;   // 주어 자리 보존

          // ★ 소유격(의) 자리는 치환 금지 — "기미의 상태" 유지.
          //   대명사로 바꾸면 "이 진료의 상태"가 되어 지시대상이 사라진다(실측 결함).
          //   APPOS가 붙은 "기미 진료의" 형태도 동일하게 원문 유지.
          if (josa === "의") return m;

          // ★ 문단(라인)당 대명사 한도 — 3번째부터 원문(진료명) 복귀.
          if (pUsed >= PRONOUN_CAP) return m;
          pUsed++;

          // 조사는 원문 그대로 붙이고, 받침 정규화는 아래 normalizeJosa 에서 일괄 처리.
          return pre + nextPronoun() + (josa || "");
        }
      );

      // ★ 조사 받침 정규화 — ①·③ 양쪽에서 생긴 대명사+조사를 한 번에 교정.
      //   ①단은 조사를 캡처하지 않고 원문 뒤에 남기므로 여기서만 교정된다.
      if (pUsed > 0) ln = normalizeJosa(ln);

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
    engine: "derma-v2-purpose",
    qc: {
      violations,
      fullKeyword,
      cat: treatment.cat,
      decisionAxis: axis,
    },
  });
}
