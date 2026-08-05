// ╔══════════════════════════════════════════════════════════╗
// ║ pages/api/generatePsyV2.js — 정신건강의학과 V2 Purpose     ║
// ║ generatePediatricsV2 골격 복제 + 정신건강의학과 치환.      ║
// ║ self-contained — v1(generatePsy) 보존·미호출.              ║
// ║ ★ 고유 축: decisionAxis 1필드로 4섹션 분기                 ║
// ║   exam(5종) = 검사 선택 기준 / disease(9종) = 치료 결정    ║
// ║ ★★ 최고 리스크 3중 차단(blockKeywords + FORBIDDEN +        ║
// ║    finalClean 문장단위): 자살·자해 / 약물 성분·용량 /      ║
// ║    비용·회기 수치 / 타 기관 비교 / 중증 진단명             ║
// ║ SOP v4.2 PATCH-07: locationBlock 후단 1줄.                ║
// ║ ★ fix-1~4 전부 적용 (①단 조사 정규화 포함)                ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

import { PSY_V2_TREATMENTS } from "../../lib/psy-v2-data";
import {
  buildPsyV2Prompt,
  PSY_V2_SYSTEM_PROMPT,
  getPsyV2ImageAlts,
  getPsyV2Direction,
} from "../../lib/psy-v2-prompts";
import { PSY_V2_FLOW_ENGINE } from "../../lib/psy-v2-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js"; // PATCH-07
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";       // VISIT-01

// ============================================================
// CAT_FOCUS — 5계열 (cat 기준)
// ============================================================
const PSY_CAT_FOCUS = {
  "검사":          { note: "검사 선택 기준과 확인 범위가 축입니다. 질환 치료 설명으로 흐르지 않습니다. ★ 검사는 진단을 정하는 도구가 아니라 이해를 돕는 확인 항목이며, 진료 소견·일상 기록과 함께 해석된다는 구조를 유지합니다. 점수·기준값 단정 금지." },
  "우울·불안":     { note: "이어진 기간과 일상 기능의 변화가 판단의 출발점. 몸의 다른 원인이 함께 확인된다는 구조 유지. ★ 자살·자해 관련 표현 어떤 맥락에서도 금지. 약물은 '진료에서 함께 검토되는 방향' 수준만 — 상품명·성분·계열·용량·효과·부작용 절대 금지." },
  "강박·사회불안": { note: "반복되는 행동에 드는 시간, 회피가 미치는 범위가 확인 축. 특정 행동을 교정 대상으로 규정하지 않습니다. 개별 치료 프로그램명(인지행동치료 등) 언급 절대 금지." },
  "집중":          { note: "여러 환경에서 함께 확인되는지가 판단의 한 축. 성인은 성장기부터의 기록, 아동은 보호자·교사 관찰 기록이 함께 확인됨. 수면·기분 요인이 같은 양상으로 나타날 수 있어 구분 확인이 포함됨. 약물 상품명·용량 절대 금지." },
  "수면·소진":     { note: "수면 기록과 부담이 이어진 상황 요인이 확인 축. 기분 변화가 함께 이어지는지 확인이 포함됨. 수면제·복용 방법 언급 절대 금지 — 약물은 '진료에서 함께 검토되는 방향' 수준만." },
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
const PSY_V2_FORBIDDEN = [
  // ★★ 최고 리스크 — 자살·자해 (자살예방법). 언급 자체 차단.
  "자살", "자해", "극단적 선택", "죽고 싶", "살고 싶지 않", "없어지고 싶", "생명의전화",
  // ★ 중증 진단명 — 진단 단정 리스크
  "조현병", "양극성", "조울증", "환청", "망상", "인격장애", "경계선",
  // ★ 입원·법적 절차
  "폐쇄병동", "보호입원", "강제입원", "진단서", "소견서", "산재", "실비", "보험 청구",
  // ★ 약물 — 향정신성. 상품명·성분·계열·용량 전면 차단
  "SSRI", "SNRI", "벤조", "자낙스", "렉사프로", "졸피뎀", "리탈린", "콘서타",
  "항우울제", "항불안제", "수면제", "신경안정제", "복용량", "증량", "감량",
  "금단", "의존성", "내성",
  // ★ 비용·회기·기간 수치 (v1 EXAM_VALUES 폐기)
  "초진 비용", "만원", "비급여", "보험 적용", "회기", "주 1회", "격주",
  // ★ 타 기관 비교 (폄훼 소지)
  "심리상담센터", "상담센터", "진단 권한", "처방 권한", "처방 불가",
  // ★ 비급여 프로그램 (v1 폐기 8종)
  "CBT", "인지행동치료", "rTMS", "경두개자기자극", "뉴로피드백",
  "EMDR", "안구운동", "MBCT", "마음챙김", "명상치료",
  // ★ 후기형 잔재 — 효과·완치·변화 서사
  "완치", "극복", "달라진 삶", "인생이 바뀌", "효과를 체감", "효과가 나타",
  "좋아졌", "나아졌", "회복되었",
  // 낙인·재촉 (정신과 고유 리스크)
  "의지 부족", "마음먹기", "나약", "핑계", "게을러", "정신병",
  "방치하면", "더 늦기 전에", "평생 후회", "치료 시기를 놓치면",
  "남들은 다", "남들보다 뒤처",
  // 진단·효과 단정 · 광고 · AI 논문투
  "재발하지 않습니다", "반드시 좋아집니다", "확실히", "무조건",
  "정상입니다", "이상 없습니다", "진단됩니다",
  "최고", "완벽", "최신 장비", "잘하는 곳", "강력 추천", "후회 없", "꼭 받으세요", "예약하세요",
  "정리하면", "결론적으로", "따라서", "체계적인", "살펴보겠습니다",
  "골든타임", "지금 바로 병원", "즉시 내원", "지체 없이", "서둘러", "한시라도",
  // 경계 침범 — neuro SoT
  "치매", "파킨슨", "뇌졸중", "뇌경색", "뇌전증",
  // 경계 침범 — pediatrics SoT
  "수족구", "소아천식", "아토피피부염", "성조숙증", "예방접종",
  // 후기 잔재
  "했어요", "더라고요", "거든요", "원장님이", "저희", "맘카페",
];

// 1인칭 검출 — 어절 경계 기준. substring 매칭 금지(오탐 방지).
const FIRST_PERSON_RE = /(^|[\s"'(\[])(제가|저는|저도|내가|나는|제\s|저의|제\s?케이스)/;

function countViolations(text) {
  let n = 0;
  PSY_V2_FORBIDDEN.forEach(w => { if (text.includes(w)) n++; });
  if (FIRST_PERSON_RE.test(text)) n++;
  return n;
}

function finalClean(text) {
  let t = text;
  // ★★ 최고 리스크 — 자살·자해: 문장 단위 제거 (부분 치환 금지)
  t = t.replace(/[^.!?\n]*(?:자살|자해|극단적 선택|죽고 싶|살고 싶지 않|없어지고 싶|생명의전화)[^.!?\n]*[.!?]/g, "");
  // ★ 중증 진단명 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:조현병|양극성|조울증|환청|망상|인격장애|경계선)[^.!?\n]*[.!?]/g, "");
  // ★ 약물 성분·계열·용량 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:SSRI|SNRI|벤조|자낙스|렉사프로|졸피뎀|리탈린|콘서타|항우울제|항불안제|수면제|신경안정제|복용량|증량|감량|금단|의존성|내성)[^.!?\n]*[.!?]/g, "");
  // ★ 비용·회기·기간 수치 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:초진 비용|만원|비급여|보험 적용|회기|주 1회|격주)[^.!?\n]*[.!?]/g, "");
  // ★ 타 기관 비교 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:심리상담센터|상담센터|진단 권한|처방 권한|처방 불가)[^.!?\n]*[.!?]/g, "");
  // ★ 비급여 프로그램 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:인지행동치료|CBT|rTMS|경두개자기자극|뉴로피드백|EMDR|안구운동|MBCT|마음챙김|명상치료)[^.!?\n]*[.!?]/g, "");
  // ★ 입원·법적 절차 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:폐쇄병동|보호입원|강제입원|진단서|소견서|산재|실비|보험 청구)[^.!?\n]*[.!?]/g, "");
  // ★ 낙인·재촉 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:의지 부족|마음먹기|나약|핑계|게을러|정신병|방치하면|더 늦기 전에|평생 후회|치료 시기를 놓치면|남들은 다|남들보다 뒤처)[^.!?\n]*[.!?]/g, "");
  // ★ 회복·변화 서사 — 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:완치|극복|달라진 삶|인생이 바뀌|효과를 체감|효과가 나타|좋아졌|나아졌|회복되었)[^.!?\n]*[.!?]/g, "");
  // 경계 침범 — 타 진료과 SoT 문장 단위 제거
  t = t.replace(/[^.!?\n]*(?:치매|파킨슨|뇌졸중|뇌경색|뇌전증|수족구|소아천식|아토피피부염|성조숙증|예방접종)[^.!?\n]*[.!?]/g, "");
  // 커뮤니티 인용 톤
  t = t.replace(/[^.!?\n]*(?:맘카페|커뮤니티에서)[^.!?\n]*[.!?]/g, "");
  // 진단·효과 단정
  t = t.replace(/정상입니다|이상 없습니다/g, "진료에서 확인하는 항목입니다");
  t = t.replace(/(으로|로)?\s*진단됩니다/g, "은 진료에서 확인하는 항목입니다");
  t = t.replace(/재발하지 않습니다|반드시 좋아집니다/g, "경과에 따라 달라질 수 있습니다");
  // 불안 조장·응급 유도
  t = t.replace(/골든타임\S*/g, "경과");
  t = t.replace(/지금 바로 병원\S*|즉시 내원\S*|지체 없이|서둘러\S*|한시라도\S*/g, "");
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
  const d    = getPsyV2Direction(treatment.id);
  const isExam = d.decisionAxis === "exam";
  const t = isExam
    ? region + " " + name + " 정보｜어떤 경우에 검토되는지 안내"
    : region + " " + name + " 정보｜검사·치료 결정 기준 안내";
  return t.trim();
}

function buildHashtags(name, region) {
  const base = name.replace(/[\s·()]/g, "");
  const reg  = String(region || "").replace(/[\s·()]/g, "");   // PATCH-B: 지역 공백 제거(2어절 해시태그 무효화 차단)
  return "#" + reg + base + " #" + reg + "정신건강의학과 #" + base + "정보 #정신건강의학과진료안내";
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
    PSY_V2_TREATMENTS.find(t => t.id === program?.id) ||
    PSY_V2_TREATMENTS[0];

  const tid           = treatment.id;
  const activeKeyword = treatment.name;
  const compare       = treatment.compareWith || "다른 방법";
  const fullKeyword   = region + " " + activeKeyword;

  const dir     = getPsyV2Direction(tid);
  const axis    = dir.decisionAxis === "exam" ? "exam" : "disease";
  const catNote = (PSY_CAT_FOCUS[treatment.cat] || { note: "확인 항목과 결정 기준을 중심으로 서술합니다." }).note;

  const finalTitle = buildTitle(treatment, region);
  let result = "# " + finalTitle + "\n\n";

  const imgAlts = getPsyV2ImageAlts(treatment, region, activeKeyword);

  // ── 시스템 프롬프트 (focus 블록) ──
  const systemPrompt =
    PSY_V2_SYSTEM_PROMPT +
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
  for (const sec of PSY_V2_FLOW_ENGINE.sections) {
    const basePrompt = buildPsyV2Prompt(sec.key, treatment, region);
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
  //     psy 대명사 = "이 검사"·"이 진료" → 둘 다 무받침. pediatrics 동형 → fix-4 필수 적용.
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
    engine: "psy-v2-purpose",
    qc: {
      violations,
      fullKeyword,
      cat: treatment.cat,
      decisionAxis: axis,
    },
  });
}
