// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateRadioV2.js — 영상의학과 V2 Purpose      ║
// ║ generatePainV2 골격 복제 + 검사형 치환.                    ║
// ║ self-contained — v1 4파일 의존 0 (data만 공유).           ║
// ║ ★ 고유 축: 치료 판단 ❌ / 검사 선택 기준 + 판독 위임 ⭕    ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

import { RADIO_TREATMENTS } from "../../lib/radio-data";
import {
  buildRadioV2Prompt,
  RADIO_V2_SYSTEM_PROMPT,
  getRadioV2ImageAlts,
} from "../../lib/radio-v2-prompts";
import { RADIO_V2_FLOW_ENGINE } from "../../lib/radio-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01
import { isClinicPhotoSection } from "../../lib/photoPolicyRegistry"; // [HOSPITAL-PHOTO-POLICY-01]

// ============================================================
// CAT_FOCUS — 5계열 (cat 기준 · 검사 선택 축 보강)
// ============================================================
const RADIO_CAT_FOCUS = {
  "머리·어지럼": {
    axis: "급성 확인(CT) vs 실질·혈관 정밀 확인(MRI)",
    note: "출혈·외상 등 급한 확인과, 반복 증상의 원인 확인은 선택되는 검사가 다릅니다.",
  },
  "허리·목·관절": {
    axis: "뼈 확인(X-ray·CT) vs 연부조직·신경 확인(MRI)",
    note: "저림 등 신경 증상 동반 여부가 검사 선택의 기준이 됩니다. 치료 방법은 다루지 않습니다.",
  },
  "가슴·호흡": {
    axis: "1차 확인(엑스레이) vs 정밀 확인(저선량 CT)",
    note: "겹쳐 보이는 부위나 작은 결절 확인 필요성이 선택 기준입니다.",
  },
  "배·소화기": {
    axis: "1차 확인(초음파) vs 단면 정밀 확인(CT)",
    note: "방사선 유무와 관찰 가능 범위가 선택 기준입니다.",
  },
  "종합검진": {
    axis: "확인 목적·위험 요인에 따른 항목 구성",
    note: "모든 검사를 받는 것이 아니라 항목이 선별되는 구조입니다.",
  },
};

// ============================================================
// EXAM_VALUES — 정보 표시용 (진단 아님)
// ============================================================
const RADIO_EXAM_VALUES = {
  brain_mri_headache:   "검사 시간 대체로 20~30분 · 조영제 사용 여부는 목적에 따라 다름",
  brain_ct_screening:   "촬영 시간 짧음(수 분 내) · 급성 확인에 활용",
  carotid_ultrasound:   "검사 시간 대체로 15~20분 · 방사선 없음",
  spine_mri:            "검사 시간 대체로 20~30분 · 연부조직·신경 확인에 활용",
  joint_mri:            "검사 시간 대체로 20~30분 · 연골·인대 확인에 활용",
  bone_densitometry:    "검사 짧음 · 저선량 전용 장비로 골밀도 수치 측정",
  chest_ct:             "저선량 방식 · 촬영 시간 짧음",
  chest_xray:           "촬영 짧음 · 기본 폐·심장 음영 확인",
  abdominal_ultrasound: "검사 전 금식 필요할 수 있음 · 방사선 없음",
  abdominal_ct:         "조영제 사용 여부는 목적에 따라 다름 · 금식 필요할 수 있음",
  health_screening:     "구성 항목에 따라 소요 시간 상이 · 사전 안내 확인",
  thyroid_ultrasound:   "검사 시간 대체로 10~15분 · 방사선 없음",
  breast_ultrasound:    "검사 시간 대체로 15~20분 · 촬영 병행 시 별도 안내",
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
// QC — 진단 단정 / 광고 / 치료 이식 / AI 논문투
// ============================================================
const RADIO_V2_FORBIDDEN = [
  "정확도 100", "완벽", "확실히", "반드시 발견", "무조건", "최신 장비",
  "정상입니다", "이상 없습니다", "암입니다", "진단됩니다",
  "최고", "강력 추천", "후회 없", "꼭 받으세요", "예약하세요",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
  "수술 방법", "전신마취", "재활 운동", "도수 치료",
];

function countViolations(text) {
  let n = 0;
  RADIO_V2_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  return n;
}

function finalClean(text) {
  let t = text;
  t = t.replace(/정상입니다|이상 없습니다/g, "영상에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 영상에서 확인하는 항목입니다");
  t = t.replace(/정확도\s*100(%|퍼센트)?/g, "정확도는 검사 조건에 따라 다릅니다");
  t = t.replace(/최신\s*장비|최고\s*사양/g, "검사 장비");
  t = t.replace(/강력\s*추천|꼭 받으세요|예약하세요|후회 없\S*/g, "");
  t = t.replace(/^정리하면[,\s]*/gm, "");
  t = t.replace(/^결론적으로[,\s]*/gm, "");
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t;
}

// EXAM_VALUES 삽입 (마무리 직전)
function injectExamValue(text, tid) {
  const ev = RADIO_EXAM_VALUES[tid];
  if (!ev) return text;
  const line = "\n\n📋 검사 참고: " + ev + " (정확한 사항은 검사 전 안내됩니다)\n";
  const idx = text.lastIndexOf("## 마무리");
  if (idx !== -1) return text.slice(0, idx) + line + text.slice(idx);
  return text + line;
}

// ============================================================
// 제목 / 해시태그
// ============================================================
function buildTitle(treatment, region) {
  const pats = treatment.titlePatterns || ["{region} {name} 정보"];
  let t = pats[0].replace(/{region}/g, region).replace(/{name}/g, treatment.name);
  ["최고", "완벽", "100%", "강력"].forEach(w => { t = t.replace(new RegExp(w, "g"), ""); });
  return t.trim();
}

function buildHashtags(activeKeyword, region) {
  const base = activeKeyword.replace(/\s/g, "");
  const reg  = String(region || "").replace(/[\s·()]/g, "");   // PATCH-B: 지역 공백 제거(2어절 해시태그 무효화 차단)
  return "#" + reg + base + " #" + reg + "영상의학과 #" + base + "정보 #영상검사안내";
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
    RADIO_TREATMENTS.find(t => t.id === program?.id) ||
    RADIO_TREATMENTS[0];

  const tid           = treatment.id;
  const activeKeyword = treatment.name;
  const compare       = treatment.compareWith || "다른 검사";
  const fullKeyword   = region + " " + activeKeyword;

  const catFocus = RADIO_CAT_FOCUS[treatment.cat] || {
    axis: "확인 목적에 따른 검사 선택",
    note: "확인하려는 대상에 따라 적합한 검사가 달라집니다.",
  };

  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  const imgAlts = getRadioV2ImageAlts(treatment, region, activeKeyword);

  // ── 시스템 프롬프트 (focus 블록) ──
  const systemPrompt =
    RADIO_V2_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 검사 — 이탈 금지]\n" +
    "- 다루는 검사: " + activeKeyword + "\n" +
    "- 비교 검사: " + compare + "\n" +
    "- 검사 계열: " + treatment.cat + "\n" +
    "- 검사 선택 축: " + catFocus.axis + "\n" +
    "- 축 유의사항: " + catFocus.note + "\n" +
    "- 모든 섹션이 이 검사 중심으로 일관되게 작성되어야 합니다.\n" +
    "- 치료·시술의 방법이나 과정 설명 금지. 이 글은 '검사'에 대한 글입니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  // ── 섹션 루프 ──
  for (const sec of RADIO_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildRadioV2Prompt(sec.key, treatment, region);
    const min = sec.minLength;
    const max = sec.maxLength;

    const userPrompt =
      "검사명: " + activeKeyword + " | 지역: " + region + " | 비교검사: " + compare + "\n" +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + min + "~" + max + "자.\n" +
      "🔒 집중 검사: \"" + activeKeyword + "\" 로만 서술. 다른 검사는 비교 목적으로만 언급.\n" +
      "🔒 복합 키워드: \"" + fullKeyword + "\" 는 글 전체에서 과다 반복 금지 (이 섹션 1회 이내).\n\n" +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    // 섹션 헤더 중복 제거
    const secHeader = "## " + sec.label;
    const headerCount = (content.match(new RegExp(secHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (headerCount > 1) {
      const esc = secHeader.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  result = injectExamValue(result, tid);

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
    const PRONOUN_POOL = ["이 검사", "해당 검사", "검사"];
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

  // 해시태그
  const tags = buildHashtags(activeKeyword, region);
  result = result.replace(/\n+(HASHTAGS:.+)?$/s, "").trimEnd();
  result += "\n\n" + tags;   // [fix] closing ALT는 마지막 섹션에서 이미 부착 — 중복 삽입 제거

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
    engine: "radio-v2-purpose",
    qc: {
      violations,
      hasExamValue: !!RADIO_EXAM_VALUES[tid],
      fullKeyword,
      cat: treatment.cat,
    },
  });
}
