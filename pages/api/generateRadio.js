// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generateRadio.js — 영상의학과 검사 생성기 v1     ║
// ║ 검사형 신규 설계. pain 섹션루프 골격 계승 + 검사형 치환.   ║
// ║ dual 필드(text 평문 / textMarkdown 원본) + content 3종.    ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄 연결.            ║
// ║ ⚠ 관측 전. FREEZE 아님. STEP1 엔진 생성분.                 ║
// ║ 배선(engineBootstrap/index.js/catalog)은 STEP2에서.       ║
// ╚══════════════════════════════════════════════════════════╝

import { RADIO_TREATMENTS } from "../../lib/radio-data";
import { buildRadioPrompt, RADIO_SYSTEM_PROMPT, getRadioImageAlts } from "../../lib/radio-prompts";
import { RADIO_FLOW_ENGINE } from "../../lib/radio-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01

// ============================================================
// EXAM_VALUES — 검사별 정보 수치 (정보 표시용, 진단 아님)
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
      max_tokens: 1200,   // 검사형: 판독 섹션 여유 확보 (pain 800 대비 상향)
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

// ============================================================
// 글자수 (한글 기준, 공백 제외)
// ============================================================
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
// 검사형 금칙 — 진단 단정 / 광고 / AI 논문투
// ============================================================
const RADIO_FORBIDDEN = [
  "정확도 100", "완벽", "확실히", "반드시 발견", "무조건",
  "정상입니다", "이상 없습니다", "암입니다", "진단됩니다",
  "최고", "강력 추천", "후회 없", "꼭 받으세요",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
];

function countRadioViolations(text) {
  let n = 0;
  RADIO_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  return n;
}

function finalRadioClean(text) {
  let t = text;
  // 진단 단정 완화
  t = t.replace(/정상입니다|이상 없습니다/g, "영상에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 영상 확인 대상입니다");
  t = t.replace(/정확도\s*100(%|퍼센트)?/g, "정확도는 검사 조건에 따라 다릅니다");
  // 광고 어휘
  t = t.replace(/강력\s*추천|꼭 받으세요|후회 없\S*/g, "");
  // AI 논문투
  t = t.replace(/^정리하면[,\s]*/gm, "");
  t = t.replace(/^결론적으로[,\s]*/gm, "");
  // 연속 공백/빈줄 정리
  t = t.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return t;
}

// EXAM_VALUES 삽입 (판독 섹션 뒤)
function injectRadioExamValue(text, tid) {
  const ev = RADIO_EXAM_VALUES[tid];
  if (!ev) return text;
  const line = "\n\n📋 검사 참고: " + ev + " (정확한 사항은 검사 전 안내됩니다)\n";
  const idx = text.lastIndexOf("## 마무리");
  if (idx !== -1) return text.slice(0, idx) + line + text.slice(idx);
  return text + line;
}

// ============================================================
// 제목 빌더 (검사형 · 광고 어휘 필터)
// ============================================================
function buildRadioTitle(treatment, region) {
  const pats = treatment.titlePatterns || ["{region} {name} 정보"];
  let t = pats[0].replace(/{region}/g, region).replace(/{name}/g, treatment.name);
  // 광고 어휘 방어
  ["최고", "완벽", "100%", "강력"].forEach(w => { t = t.replace(new RegExp(w, "g"), ""); });
  return t.trim();
}

// 해시태그 (검사형)
function buildRadioHashtags(activeKeyword, region) {
  const base = activeKeyword.replace(/\s/g, "");
  return "#" + region + base + " #" + region + "영상의학과 #" + base + "정보 #영상검사안내";
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
  const region = (userRegion || "강남").trim();
  const photoCtx = (photoContext && typeof photoContext === "string") ? photoContext.trim() : "";

  const treatment =
    RADIO_TREATMENTS.find(t => t.id === program?.id) ||
    RADIO_TREATMENTS[0];
  const keyword = treatment.name;
  const tid     = treatment.id;
  const compare = treatment.compareWith || "다른 검사";

  const activeKeyword = keyword;
  const fullKeyword   = region + " " + activeKeyword;

  const finalTitle = buildRadioTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  // 이미지 ALT — 검사형 5종 풀 통일
  const _alt = (label) => `[이미지: ${label}]`;
  const imgAlts = {
    concern: _alt("증상 사진"),
    search:  _alt("검사 장비 사진"),
    consult: _alt("검사 안내 사진"),
    result:  _alt("판독 사진"),
    closing: _alt("접수 사진"),
  };

  // 시스템 프롬프트 (focus 블록 포함)
  const systemPrompt =
    RADIO_SYSTEM_PROMPT +
    "\n\n[🎯 이 글의 핵심 검사 — 이탈 금지]\n" +
    "- 다루는 검사: " + activeKeyword + "\n" +
    "- 비교 검사: " + compare + "\n" +
    "- 모든 섹션이 이 검사 중심으로 일관되게 작성되어야 합니다.\n" +
    (photoCtx ? "\n[사진 컨텍스트]\n" + photoCtx + "\n" : "");

  // ── 섹션 루프 ──
  const SECTION_CAP = {
    concern:  { min: 220, max: 340 },
    search:   { min: 200, max: 300 },
    consult:  { min: 250, max: 360 },
    decision: { min: 200, max: 300 },
    result:   { min: 280, max: 400 },
    closing:  { min: 180, max: 280 },
  };

  const altKeyBySection = {
    concern: imgAlts.concern, search: imgAlts.search, consult: imgAlts.consult,
    decision: imgAlts.search, result: imgAlts.result, closing: imgAlts.closing,
  };

  for (const sec of RADIO_FLOW_ENGINE.sections) {
    const basePrompt = buildRadioPrompt(sec.key, treatment, region, "personal");
    const cap = SECTION_CAP[sec.key] || { min: 200, max: 300 };

    const userPrompt =
      "검사명: " + activeKeyword + " | 지역: " + region + " | 비교검사: " + compare + "\n" +
      "현재 섹션: [" + sec.label + "] — 이 섹션만 작성. 다른 섹션 추가 금지.\n" +
      "글자수: " + cap.min + "~" + cap.max + "자.\n" +
      "🔒 집중 검사: \"" + activeKeyword + "\" 로만 서술. 다른 검사 혼용 금지.\n" +
      "🔒 복합 키워드: \"" + fullKeyword + "\" 1~2회 자연 포함.\n\n" +
      basePrompt;

    let content = await callGPT(systemPrompt, userPrompt);

    // 섹션 헤더 중복 제거
    const secHeader = "## " + sec.label;
    const headerCount = (content.match(new RegExp(secHeader, "g")) || []).length;
    if (headerCount > 1) {
      content = content.replace(new RegExp("(" + secHeader + ".*?)(?=" + secHeader + ")", "s"), "");
    }

    // 글자수 부족 시 1회 재시도
    if (calcCharCount(content) < cap.min) {
      const retry = await callGPT(
        systemPrompt,
        userPrompt + "\n\n[재작성] 반드시 " + cap.min + "자 이상. 이전과 다른 표현 사용."
      );
      if (calcCharCount(retry) > calcCharCount(content)) content = retry;
    }

    // 섹션 헤더 없으면 부여
    if (!content.trim().startsWith("##")) {
      content = "## " + sec.label + "\n" + content.trim();
    }

    // 섹션 이미지 ALT 부착
    const secAlt = altKeyBySection[sec.key] || imgAlts.consult;
    result += content.trim() + "\n\n" + secAlt + "\n\n";
  }

  // ── 후처리 ──
  result = injectRadioExamValue(result, tid);

  // 진단 단정·광고·AI투 최종 정화
  if (countRadioViolations(result) > 0) {
    result = finalRadioClean(result);
  }

  // 지역+검사명 반복 분산 (4회 초과 시 '이 검사/해당 검사'로)
  {
    const kwEsc = fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let cnt = 0;
    result = result.replace(new RegExp(kwEsc, "g"), (m) => {
      cnt++;
      return cnt > 3 ? "이 검사" : m;
    });
  }

  // 해시태그
  const tags = buildRadioHashtags(activeKeyword, region);
  result = result.replace(/\n+(HASHTAGS:.+)?$/s, "").trimEnd();
  result += "\n\n" + tags;   // [fix] closing ALT는 마지막 섹션에서 이미 부착 — 중복 삽입 제거

  // 백슬래시·공백 정리
  result = result
    .replace(/\\n\\n/g, "\n\n").replace(/\\n/g, " ")
    .replace(/\\r/g, "").replace(/\\t/g, " ")
    .replace(/\n /g, "\n").replace(/ \n/g, "\n")
    .replace(/[ \t]{2,}/g, " ");

  // ── PATCH-07: locationBlock 후단 1줄 (해시태그 직전 삽입) ──
  // ── VISIT-01: visitBlock 후단 1줄 (locationBlock 앞 → 🏥 → 📍 → #) ──
  result = insertVisitBeforeHashtags(result, _visitStore);
  result = insertLocationBeforeHashtags(result, _locStore);

  // ── dual render ──
  const resultMarkdown = result;                  // 마크다운 원본 (패턴 추출용)
  const resultPlain    = stripMarkdownForNaver(result); // 네이버 복사용 평문

  const charCount = calcCharCount(resultPlain);
  const violations = countRadioViolations(resultPlain);

  return res.status(200).json({
    success: true,
    text: resultPlain,            // 네이버 복사용
    textMarkdown: resultMarkdown, // 마크다운 원본
    content: resultPlain,         // SOP §5 content 필드 (3종 동시)
    charCount,
    title: finalTitle,
    qc: {
      violations,
      hasExamValue: !!RADIO_EXAM_VALUES[tid],
      fullKeyword,
    },
  });
}
