// ============================================================
// pages/api/generateFamily.js — 가정의학과 전용 핸들러 v1.0
// 🚀 단일 호출 구조 (GPT 1번 호출 → 섹션 분리 후처리)
// 🆕 v1.0 — Eye v3.0 베이스 → family 13개 진료 적용
//    1) VS_BLOCKS / HOSPITAL_PICK_BLOCK / SCENE_ALTS 13개
//    2) 만성 관리형 진료(고혈압·당뇨·고지혈증·만성피로) 표현 분기
//    3) 한의원·내시경·피부과 키워드 차단
// ============================================================
import OpenAI from "openai";
import {
  FAMILY_SYSTEM_PROMPT,
  buildFamilyFullPrompt,
  getFamilyImageAlts,
} from "../../lib/family-prompts";
import { FAMILY_TREATMENTS } from "../../lib/family-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// 정보 비교 블럭 (결정 섹션 아래 자동 삽입)
// ============================================================
const INFO_BLOCKS = {
  hypertension: `
| 비교 항목 | 약물 치료 | 생활습관 교정만 | 병행 |
|----------|---------|-------------|------|
| 효과 시점 | 1~4주 | 3~6개월 | 1~2주 |
| 혈압 안정성 | 강함 | 약함 | 매우 강함 |
| 부작용 | 미미 | 없음 | 미미 |
| 비용 | 월 5~15만원 | 식이비만 | 월 5~15만원 |
`,
  diabetes: `
| 비교 항목 | 약물 치료 | 식이 조절만 | 병행 |
|----------|---------|-----------|------|
| HbA1c 감소 | 1~2% | 0.3~0.8% | 1.5~2.5% |
| 효과 시점 | 1~3개월 | 6개월~ | 1~2개월 |
| 비용 | 월 5~20만원 | 식비만 | 월 5~20만원 |
| 합병증 예방 | 강함 | 보통 | 매우 강함 |
`,
  dyslipidemia: `
| 비교 항목 | 스타틴 약물 | 운동·식단만 | 병행 |
|----------|----------|-----------|------|
| LDL 감소 | 30~50% | 5~15% | 35~55% |
| 효과 시점 | 4~6주 | 3~6개월 | 4~6주 |
| 비용 | 월 3~10만원 | 식비만 | 월 3~10만원 |
| 심혈관 위험 감소 | 강함 | 약함 | 매우 강함 |
`,
  checkup: `
| 비교 항목 | 기본 검진 | 종합검진 | 정밀검진 |
|----------|---------|---------|---------|
| 항목 수 | 10~15개 | 30~50개 | 60~100개 |
| 소요 시간 | 30분 | 2~3시간 | 4~6시간 |
| 비용 | 5~15만원 | 30~80만원 | 80~200만원 |
| 조기 발견율 | 보통 | 높음 | 매우 높음 |
`,
  vaccination: `
| 비교 항목 | 대상포진 백신 | 독감 백신 | 폐렴구균 백신 |
|----------|------------|---------|------------|
| 권장 시기 | 50세 이상 | 매년 가을 | 65세 이상 |
| 접종 횟수 | 2회 (싱그릭스) | 연 1회 | 1~2회 |
| 비용 | 50~80만원 (2회) | 3~5만원 | 12~15만원 |
| 예방 효과 | 90%+ | 50~70% | 60~75% |
`,
  cold: `
| 비교 항목 | 약국 종합감기약 | 가정의학과 진료 | 병원+처방약 |
|----------|------------|------------|-----------|
| 진단 정확성 | 없음 | 정확 | 정확 |
| 회복 기간 | 7~10일 | 5~7일 | 3~5일 |
| 합병증 예방 | 어려움 | 가능 | 매우 강함 |
| 비용 | 5~10천원 | 진료비 1만원 + 약 | 1~3만원 |
`,
  reflux: `
| 비교 항목 | 약물 치료 (PPI) | 위내시경 우선 | 생활 교정만 |
|----------|------------|-----------|-----------|
| 효과 시점 | 1~2주 | 검사 후 처방 | 1~3개월 |
| 비용 | 월 3~8만원 | 검사 8~15만원 | 식비만 |
| 정확한 원인 진단 | 추정 진단 | 정확 | 추정 |
| 적합 대상 | 경증·중등증 | 만성·재발성 | 매우 경증 |
`,
  ibs: `
| 비교 항목 | 약물 치료 | 대장내시경 우선 | 생활 교정만 |
|----------|---------|------------|-----------|
| 진단 명확성 | 추정 진단 | 정확 진단 | 추정 |
| 비용 | 월 3~8만원 | 검사 10~20만원 | 식비만 |
| 효과 시점 | 1~2주 | 검사 후 결정 | 1~3개월 |
| 적합 대상 | 진단 후 | 만성·혈변 동반 | 매우 경증 |
`,
  weight_loss: `
| 비교 항목 | 삭센다 | 위고비 | 식단·운동만 |
|----------|------|------|-----------|
| 투여 방식 | 매일 자가 주사 | 주 1회 자가 주사 | 없음 |
| 평균 감량 | 5~7% | 12~15% | 3~5% |
| 월 비용 | 35~60만원 | 80~120만원 | 식비만 |
| 부작용 | 메스꺼움·소화 | 메스꺼움·소화 | 없음 |
`,
  iv_therapy: `
| 비교 항목 | 마늘주사 | 신데렐라주사 | 비타민 수액 |
|----------|--------|-----------|-----------|
| 주성분 | 푸르설티아민 | 글루타치온 | 비타민C·B군 |
| 효과 방향 | 피로 회복·체력 | 미백·항산화 | 면역·피로 |
| 시술 시간 | 20~30분 | 30~40분 | 30~40분 |
| 회당 비용 | 3~6만원 | 5~10만원 | 4~8만원 |
`,
  nutrition_shot: `
| 비교 항목 | 비타민D 주사 | 면역주사 | 경구 영양제 |
|----------|-----------|-------|-----------|
| 흡수율 | 95%+ | 95%+ | 30~60% |
| 지속 기간 | 3~6개월 | 1~2주 | 매일 복용 |
| 비용 | 회당 3~6만원 | 회당 4~8만원 | 월 3~10만원 |
| 적합 대상 | 결핍 진단 시 | 잦은 감염 | 일반 보충 |
`,
  smoking_cessation: `
| 비교 항목 | 챔픽스 | 니코틴 패치 | 의지로만 |
|----------|------|----------|--------|
| 6개월 금연 성공률 | 30~40% | 15~25% | 5~10% |
| 처방 기간 | 12주 | 8~10주 | 없음 |
| 본인 부담 비용 | 0~3만원 (지원) | 5~15만원 | 0원 |
| 부작용 | 메스꺼움·꿈 | 피부 자극 | 없음 |
`,
  fatigue: `
| 비교 항목 | 정밀 검사 | 영양 보충 | 휴식만 |
|----------|---------|--------|--------|
| 원인 진단 | 정확 | 부분적 | 없음 |
| 효과 시점 | 1~2주 | 2~4주 | 모호 |
| 비용 | 검사 5~20만원 | 월 3~10만원 | 0원 |
| 재발 방지 | 강함 | 보통 | 약함 |
`,
};

// ============================================================
// 진료별 수치 데이터
// ============================================================
const EXAM_VALUES = {
  hypertension:      { exam: "혈압·심전도·혈액검사·소변검사",     recovery: "지속 관리 필요",  pain: 0, cost: "월 5~15, 검사 5~10" },
  diabetes:          { exam: "공복혈당·HbA1c·당부하·소변검사",   recovery: "지속 관리 필요",  pain: 0, cost: "월 5~20, 검사 5~10" },
  dyslipidemia:      { exam: "지질검사·간기능·갑상선",           recovery: "지속 관리 필요",  pain: 0, cost: "월 3~10, 검사 5~10" },
  checkup:           { exam: "혈액·소변·심전도·CT·내시경",       recovery: "당일",            pain: 1, cost: "30~200" },
  vaccination:       { exam: "병력·알레르기 문진",               recovery: "당일",            pain: 1, cost: "3~80" },
  cold:              { exam: "체온·청진·인후 진찰",              recovery: "5~7일",            pain: 1, cost: "1~3" },
  reflux:            { exam: "문진·위내시경(필요시)",            recovery: "1~3개월",          pain: 1, cost: "월 3~8, 검사 8~15" },
  ibs:               { exam: "문진·혈액·대변·내시경(필요시)",    recovery: "지속 관리 필요",  pain: 2, cost: "월 3~8, 검사 10~20" },
  weight_loss:       { exam: "체성분·혈액·갑상선·문진",          recovery: "3~6개월 코스",    pain: 2, cost: "월 35~120" },
  iv_therapy:        { exam: "혈액·체성분·문진",                  recovery: "당일",            pain: 2, cost: "회당 3~10" },
  nutrition_shot:    { exam: "혈액·비타민D·문진",                recovery: "당일",            pain: 2, cost: "회당 3~8" },
  smoking_cessation: { exam: "폐기능·일산화탄소·문진",          recovery: "12주 코스",       pain: 0, cost: "0~3 (지원)" },
  fatigue:           { exam: "혈액·갑상선·비타민·호르몬",        recovery: "1~3개월",          pain: 1, cost: "검사 5~20, 관리 월 3~10" },
};

// ============================================================
// 텍스트 후처리
// ============================================================
function cleanText(text, keyword, region) {
  let t = text;

  // ── 어미 정리 ──
  t = t.replace(/자고예요/g, "더라고요");
  t = t.replace(/라고예요/g, "라더라고요");
  t = t.replace(/했었어요/g, "했어요");
  t = t.replace(/했었거든요/g, "했거든요");
  t = t.replace(/했었습니다/g, "했습니다");
  t = t.replace(/되었어요/g, "됐어요");
  t = t.replace(/되었거든요/g, "됐거든요");
  t = t.replace(/되었습니다/g, "됐습니다");
  t = t.replace(/하였어요/g, "했어요");
  t = t.replace(/하였습니다/g, "했습니다");
  t = t.replace(/이었어요/g, "였어요");
  t = t.replace(/이었습니다/g, "였습니다");
  t = t.replace(/봤었어요/g, "봤어요");
  t = t.replace(/갔었어요/g, "갔어요");
  t = t.replace(/왔었어요/g, "왔어요");
  t = t.replace(/받았었어요/g, "받았어요");

  // ── 문두 쉼표 정리 ──
  t = t.replace(/(\n)\s*,\s*/g, "$1");
  t = t.replace(/^\s*,\s*/g, "");
  t = t.replace(/(##\s*[^\n]+\n+)\s*,\s*/g, "$1");
  t = t.replace(/(그래서|그런데|그리고|그러나|하지만|또한|그러면서|그러다|그러니까)\s*,\s+/g, "$1 ");

  // 조사 오류
  t = t.replace(/가정의학과를을/g, "가정의학과를");
  t = t.replace(/가정의학과을를/g, "가정의학과를");
  t = t.replace(/을을/g, "을");
  t = t.replace(/를를/g, "를");
  t = t.replace(/이이/g, "이");
  t = t.replace(/가가/g, "가");
  t = t.replace(/은은/g, "은");
  t = t.replace(/는는/g, "는");
  t = t.replace(/와와/g, "와");
  t = t.replace(/과과/g, "과");

  // 마침표 오타
  t = t.replace(/(\S)\.\s*라는/g, "$1이라는");

  // 공백 오류
  t = t.replace(/를\s+\s+/g, "를 ");
  t = t.replace(/받고나면/g, "받고 나면");
  t = t.replace(/받고나서/g, "받고 나서");

  // ── 키워드 반복 — 대명사 교체 비활성화 ──
  if (keyword) {
    t = t.replace(/해당\s*진료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|진단|치료|관리|시작|선택|받|하|시|할|진행|결정)/g, keyword);
  }
  if (keyword) {
    t = t.replace(/이\s*진료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|진단|치료|관리|시작|선택|받|하|시|할|진행|결정)/g, keyword);
    t = t.replace(/이\s*치료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|시작|선택|받|하|시|할|진행|결정)/g, keyword);
    t = t.replace(/이\s*시술(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|시작|선택|받|하|시|할|진행|결정)/g, keyword);
  }

  // 단어 중복 자동 정리
  t = t.replace(/([가-힣]{2,5})\s+\1(\s|을|를|이|가|은|는|에|와|과|로|의|$)/g, "$1$2");
  t = t.replace(/([가-힣]{2,5})\1(을|를|이|가|은|는|에|와|과|로|의)/g, "$1$2");

  // 어색한 톤 정리
  t = t.replace(/그래서 나는/g, "그래서");
  t = t.replace(/그러나 나는/g, "그러나");
  t = t.replace(/하지만 나는/g, "하지만");

  // 신뢰도 깨는 문장 제거 (가정의학과인데 다른 영역 언급)
  t = t.replace(/[^.!?\n]*(?:한약|침 치료|추나|공진단|보약|기혈 순환)[^.!?\n]*[.!?]\s*/g, "");
  t = t.replace(/[^.!?\n]*(?:자연 치유의 힘|체질적으로도 변화)[^.!?\n]*[.!?]\s*/g, "");
  // 미용·시술 언급 차단
  t = t.replace(/[^.!?\n]*(?:보톡스|필러|레이저 시술|여드름 치료)[^.!?\n]*[.!?]\s*/g, "");

  // ── FORBIDDEN 표현 차단 ──
  const FORBIDDEN_SENTENCE_PATTERNS = [
    /[^.!?\n]*드디어 결심하고[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*결국 선택하게 되었[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*마음이 편안해졌[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*믿음이 갔[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*친절하고 전문적이[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*따뜻한 차 한 잔[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*차분하고 따뜻한 느낌[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*미소를 되찾[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*새로운 삶[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*삶의 질이 크게[^.!?\n]*[.!?]\s*/g,
  ];
  for (const re of FORBIDDEN_SENTENCE_PATTERNS) {
    t = t.replace(re, "");
  }

  // ── 추천 톤 차단 ──
  t = t.replace(/추천드리고 싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/추천드립니다/g, "참고하시면 좋겠습니다");
  t = t.replace(/강력(히|하게)?\s*추천(해요|합니다|드려요|드립니다)/g, "참고하시면 좋겠어요");
  t = t.replace(/꼭\s*추천(해요|합니다|드려요|드립니다)/g, "참고가 되었으면 합니다");
  t = t.replace(/적극\s*추천(해요|합니다|드려요|드립니다)/g, "참고할 만하다고 봐요");
  t = t.replace(/([가-힣]+분들?에게는?)\s*강력히\s*추천하고\s*싶어요/g, "$1 참고가 됐으면 좋겠어요");
  t = t.replace(/([가-힣]+분들?에게는?)\s*추천하고\s*싶어요/g, "$1 참고가 됐으면 좋겠어요");
  t = t.replace(/추천할\s*수\s*있을\s*것\s*같아요/g, "참고가 될 수 있다고 봐요");
  t = t.replace(/추천할\s*만하다고\s*생각해요/g, "참고할 만하다고 봐요");
  t = t.replace(/추천하고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/권해드리고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/권해드립니다/g, "참고하시면 좋겠습니다");
  t = t.replace(/권하고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/고려해보는\s*것을?\s*권해(드리고\s*싶어요|드립니다|요)/g, "고려해볼 만한 부분이라고 봐요");
  t = t.replace(/한\s*번쯤\s*고려해보는\s*것을?/g, "검사 결과에 따라 고려해볼 만한 부분이라고");
  t = t.replace(/재방문\s*의사도?\s*(충분히\s*)?있고[,.]?\s*/g, "");
  t = t.replace(/주변에\s*적극적으로\s*추천할\s*수\s*있을\s*것\s*같아요\s*\.?/g, "");

  // ── 약한 마무리 차단 ──
  t = t.replace(/(이\s*후기가\s*)?조금이나마\s*도움이\s*되(었으면|면)\s*(좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");
  t = t.replace(/이\s*후기가\s*도움이\s*되(었으면|면)\s*(좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");
  t = t.replace(/([가-힣A-Za-z]+이\s*)?좋은\s*기준이\s*될\s*수\s*있을\s*것\s*같아요\.?\s*/g, "");
  t = t.replace(/이\s*후기가\s*[^.\n]*고민하(시|는)는?\s*분들?에게\s*참고가\s*(됐|되)으?면\s*좋(겠|겠어요|겠습니다)\.?\s*/g, "");
  t = t.replace(/[^.\n]*고민하시는?\s*분들?(께|에게)\s*참고가\s*(됐|되)으?면\s*좋(겠|겠어요|겠습니다)\.?\s*/g, "");
  t = t.replace(/이\s*후기가\s*[^.\n]{0,40}참고가\s*(됐|되)으?면\s*(합니다|좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");

  // 부사 연속 나열 정리
  t = t.replace(/(특히,?\s+)(.*?)(특히,?\s+)/g, "$1$2");
  t = t.replace(/(또한,?\s+)(.*?)(또한,?\s+)/g, "$1$2");
  t = t.replace(/(무엇보다,?\s+)(.*?)(무엇보다,?\s+)/g, "$1$2");

  // ── 어미 다양화 ──
  const vary1 = ["라고 판단했어요", "이 기준이 됐어요", "쪽으로 결정하게 됐어요", "이 결정 요인이었어요"];
  let vary1Idx = 0;
  t = t.replace(/([^.!?\n]+)더라고요\.([^.!?\n]+)더라고요\./g, (m, a, b) => {
    const replacement = vary1[vary1Idx % vary1.length];
    vary1Idx++;
    return a + "더라고요." + b + replacement + ".";
  });
  t = t.replace(/(했어요\.[^.!?\n]+){3,}/g, (m) => {
    const sentences = m.split(/(?<=했어요\.)/);
    if (sentences.length >= 4) {
      sentences[sentences.length - 2] = sentences[sentences.length - 2].replace(/했어요\.$/, "했습니다.");
      if (sentences.length >= 5) {
        sentences[sentences.length - 3] = sentences[sentences.length - 3].replace(/했어요\.$/, "한 셈이에요.");
      }
    }
    return sentences.join("");
  });

  // 중간 해시태그 제거
  t = t.replace(/\s+#[가-힣A-Za-z0-9]+(?=\s|$|[.,!?])/g, "");
  t = t.replace(/\n#[^\n]+(?=\n)/g, "\n");

  return t;
}

// ============================================================
// 헤더 누락 자동 복원
// ============================================================
function restoreHeadersIfMissing(text) {
  const requiredHeaders = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 마무리"];
  const present = requiredHeaders.filter((h) => text.includes(h)).length;
  if (present >= 3) return text;

  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const title = titleMatch ? titleMatch[1] : "";
  const body = titleMatch ? text.slice(titleMatch[0].length) : text;
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 5) return text;

  const sectionLabels = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 진료 후 변화", "## 마무리"];
  const total = paragraphs.length;
  const out = [title.trim()];
  const ratios = [0.15, 0.15, 0.25, 0.15, 0.20, 0.10];
  let idx = 0;
  for (let s = 0; s < sectionLabels.length; s++) {
    const count = s === sectionLabels.length - 1
      ? total - idx
      : Math.max(1, Math.round(total * ratios[s]));
    if (idx >= total) break;

    out.push("");
    out.push(sectionLabels[s]);
    out.push("");

    const sectionParas = paragraphs.slice(idx, idx + count);
    if (sectionLabels[s] === "## 진료 후 변화" && sectionParas.length >= 4) {
      const timeLabels = ["### 1일", "### 1주", "### 2주", "### 1개월"];
      sectionParas.forEach((p, i) => {
        if (i < 4) out.push(timeLabels[i]);
        out.push(p);
        out.push("");
      });
    } else {
      sectionParas.forEach((p) => {
        out.push(p);
        out.push("");
      });
    }
    idx += count;
  }
  return out.join("\n");
}

// ============================================================
// 약한 첫 문장 제거
// ============================================================
function strengthenOpening(text) {
  const concernIdx = text.indexOf("## 고민");
  if (concernIdx === -1) return text;
  const afterHeader = text.indexOf("\n", concernIdx);
  if (afterHeader === -1) return text;

  let firstParaStart = afterHeader + 1;
  while (firstParaStart < text.length && /\s/.test(text[firstParaStart])) {
    firstParaStart++;
  }
  const firstSentence = text.slice(firstParaStart, firstParaStart + 50);

  const WEAK_PATTERNS = [
    /^어느 날 거울/,
    /^거울을 보는데/,
    /^화면 속 셀카/,
    /^어느 날 문득/,
    /^어느 순간부터/,
    /^언젠가부터/,
  ];
  const isWeak = WEAK_PATTERNS.some((re) => re.test(firstSentence));
  if (!isWeak) return text;

  const endMatch = text.slice(firstParaStart).match(/^[^.!?\n]+[.!?]\s*/);
  if (!endMatch) return text;
  return text.slice(0, firstParaStart) + text.slice(firstParaStart + endMatch[0].length);
}

// ============================================================
// 오타 수정
// ============================================================
function fixCommonTypos(text) {
  let t = text;
  t = t.replace(/혈압이이/g, "혈압이");
  t = t.replace(/당뇨이/g, "당뇨가");
  t = t.replace(/검진이를/g, "검진을");
  t = t.replace(/가정의학과를을/g, "가정의학과를");
  t = t.replace(/가정의학과을를/g, "가정의학과를");
  return t;
}

// ============================================================
// 헤더 정규화
// ============================================================
function normalizeHeaders(text) {
  const SECTION_LABELS = ["고민", "탐색", "상담", "결정", "변화", "진료 후 변화", "마무리"];
  let t = text;
  for (const label of SECTION_LABELS) {
    const re = new RegExp("(##\\s*" + label + ")(?!\\s*\\n)(?!\\s*$)([가-힣을를이가은는에과와로의])", "g");
    t = t.replace(re, "$1\n\n$2");
  }
  t = t.replace(/(###\s*\d+(?:일|주|개월))(?!\s*\n)(?!\s*$)([가-힣을를이가은는에과와로의])/g, "$1\n\n$2");
  return t;
}

// ============================================================
// GPT 표 제거
// ============================================================
function removeOrphanTable(text, treatmentId) {
  if (!INFO_BLOCKS[treatmentId]) return text;
  const consultIdx = text.indexOf("## 상담");
  const decisionIdx = text.indexOf("## 결정");
  if (consultIdx === -1 || decisionIdx === -1) return text;
  const before = text.slice(0, consultIdx);
  const middle = text.slice(consultIdx, decisionIdx);
  const after  = text.slice(decisionIdx);
  const cleaned = middle.replace(/\n\|[^\n]+\|\n\|[^\n]*[-:]+[^\n]*\|\n(?:\|[^\n]+\|\n?)+/g, "\n");
  return before + cleaned + after;
}

// ============================================================
// 정보 블럭 결정 섹션 아래 삽입
// ============================================================
function insertInfoBlock(text, treatmentId) {
  const block = INFO_BLOCKS[treatmentId];
  if (!block) return text;
  const firstLine = block.trim().split("\n")[0];
  if (text.includes(firstLine)) return text;
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx === -1) return text + "\n\n" + block;
  const nextSection = text.indexOf("\n## ", decisionIdx + 1);
  if (nextSection === -1) return text + "\n\n" + block;
  return text.slice(0, nextSection) + "\n\n" + block + "\n" + text.slice(nextSection);
}

// ============================================================
// 결정 섹션 판단 근거
// ============================================================
const DECISION_REASONS = {
  hypertension: {
    reject: "생활습관 교정만",
    why: "이미 수축기 150 넘게 측정된 상태에서 식이·운동만으로는 기준치까지 떨어뜨리기 어렵다고 했어요. 합병증 위험 줄이려면 약물과 생활 관리 병행이 더 안전하다고 판단했어요.",
    criteria: "혈압 수치·합병증 위험·관리 안정성",
  },
  diabetes: {
    reject: "식이 조절만",
    why: "공복 혈당 130 넘는 상태로 진단됐고 HbA1c도 기준선을 넘었어요. 식이 조절만으로는 단기간 안정화가 어렵다고 해서 메트포르민과 식이 관리를 병행하는 쪽으로 결정했어요.",
    criteria: "HbA1c 수치·공복 혈당 추이·합병증 예방",
  },
  dyslipidemia: {
    reject: "운동·식단만",
    why: "LDL이 160을 넘는 고위험 수치로 확인됐고 가족력도 있어서 식단·운동만으론 빠른 개선이 어렵다고 했어요. 스타틴 저용량으로 시작하면서 생활 관리 병행이 더 효율적이라 판단했어요.",
    criteria: "LDL 수치·가족력·심혈관 위험도",
  },
  checkup: {
    reject: "기본 검진만",
    why: "최근 컨디션 변화가 있었고 가족 중 암 병력이 있어서 기본 검진으로는 안심이 안 됐어요. 종합검진 항목으로 위·대장·심혈관까지 한 번에 확인하는 게 효율적이라 판단했어요.",
    criteria: "가족력·자각 증상 변화·검진 주기",
  },
  vaccination: {
    reject: "접종 안 함",
    why: "주변에서 대상포진으로 한 달 넘게 고생하는 사례를 봤고 50대 이후엔 합병증 위험도 크다고 했어요. 비용은 들어도 예방이 훨씬 낫다고 판단했어요.",
    criteria: "연령 위험도·합병증 가능성·예방 효과",
  },
  cold: {
    reject: "약국 종합감기약",
    why: "약국 약을 1주일 넘게 먹어도 기침이 안 잡혔고 미열이 계속됐어요. 2차 감염 가능성도 있어서 정확한 진찰과 처방이 더 빠른 회복 방법이라 판단했어요.",
    criteria: "증상 지속 기간·합병증 위험·회복 속도",
  },
  reflux: {
    reject: "위내시경 우선",
    why: "전형적인 역류 증상이 분명했고 야간 신물·속쓰림 패턴이 명확해서 우선 PPI 약물 치료를 시작하기로 했어요. 4~8주 후 호전 안 되면 그때 내시경 검사를 받기로 결정했어요.",
    criteria: "증상 패턴·연령·내시경 필요성",
  },
  ibs: {
    reject: "대장내시경 우선",
    why: "혈변·체중감소 같은 경고 증상은 없고 스트레스 상황과 명확히 연관된 패턴이라 기능성 장애일 가능성이 높다고 했어요. 우선 약물·식이 관리로 1~2개월 보고 결정하기로 했어요.",
    criteria: "경고 증상 유무·증상 패턴·연령",
  },
  weight_loss: {
    reject: "식단·운동만",
    why: "식단·운동을 6개월 이상 시도했는데 정체가 길어졌고 BMI도 30에 가까웠어요. 약물 치료로 식욕 조절이 가능해지면서 생활 관리도 같이 해야 효과가 크다고 판단했어요.",
    criteria: "BMI·기존 시도 결과·정체 기간",
  },
  iv_therapy: {
    reject: "영양제 복용만",
    why: "경구 영양제는 흡수율이 30~60% 정도라 효과 체감까지 오래 걸렸어요. 급한 컨디션 회복이 필요한 상황이라 흡수율 95% 이상인 수액 쪽이 더 빠른 선택이었어요.",
    criteria: "흡수율·즉각 효과 필요성·컨디션 상태",
  },
  nutrition_shot: {
    reject: "경구 영양제",
    why: "비타민D 검사 결과 결핍 진단을 받았고 경구로는 회복이 느렸어요. 주사로 결핍 보충부터 빠르게 잡고 그다음 경구로 유지하는 방향이 더 효율적이라 판단했어요.",
    criteria: "결핍 진단·흡수율·관리 효율성",
  },
  smoking_cessation: {
    reject: "의지로만",
    why: "혼자 끊기는 시도를 여러 번 했지만 매번 1~2주 안에 다시 피우게 됐어요. 챔픽스 같은 약물 도움 + 정기 진료 관리가 6개월 금연 성공률이 훨씬 높다고 해서 결정했어요.",
    criteria: "기존 시도 횟수·실패 패턴·성공률 차이",
  },
  fatigue: {
    reject: "쉬는 것만",
    why: "충분히 자도 피로가 안 풀린 게 한 달 넘게 이어졌고 갑상선·빈혈·비타민D까지 검사해보니 결핍 항목이 있었어요. 원인 파악 후 맞춤 관리가 더 빠른 회복 방법이라 판단했어요.",
    criteria: "피로 지속 기간·검사 결핍 항목·관리 방향",
  },
};

function injectDecisionReason(text, treatmentId, region, name) {
  const reason = DECISION_REASONS[treatmentId];
  if (!reason) return text;
  const firstCriterion = reason.criteria.split("·")[0];
  if (text.includes(firstCriterion) && text.includes(reason.reject)) return text;
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx === -1) return text;
  const nextSection = text.indexOf("\n## ", decisionIdx + 1);
  const insertAt = nextSection === -1 ? text.length : nextSection;
  const inject =
    "\n\n" +
    reason.reject + "이 아니라 " + name + "을(를) 고른 이유는 명확했어요. " +
    reason.why +
    " 결국 " + reason.criteria + " 이 세 가지가 판단의 기준이 됐어요.\n";
  return text.slice(0, insertAt) + inject + text.slice(insertAt);
}

// ============================================================
// 탐색 비교 4축 강제 삽입
// ============================================================
function injectSearchComparison(text, region, name) {
  // HOSPITAL_PICK_BLOCK이 이미 4축을 채우므로 그 흔적이 있으면 스킵
  if (text.includes("네 가지에서 차이가 분명했다는")) return text;

  const hasExam = /(검사 항목|정밀 검사|기본 검사|호르몬·심전도|체성분)/.test(text);
  const hasConsult = /(상담 시간|상담 스타일|설명 방식|진료 시간|충분히 설명|짚어주)/.test(text);
  const hasCost = /(비용 범위|가격대|금액 차이|비급여|30~50%|항목 구성)/.test(text);
  const hasEquip = /(장비|기기 차이|최신 장비|검사 시스템|시스템 수준)/.test(text);
  const presentCount = [hasExam, hasConsult, hasCost, hasEquip].filter(Boolean).length;
  // 4축 전부 충족해야만 스킵 (이전: 3축이면 스킵 → 약했음)
  if (presentCount >= 4) return text;
  const searchIdx = text.indexOf("## 탐색");
  if (searchIdx === -1) return text;
  const nextSection = text.indexOf("\n## ", searchIdx + 1);
  const insertAt = nextSection === -1 ? text.length : nextSection;
  const inject =
    "\n\n" + region + "에서 가정의학과 3곳을 비교했을 때 차이가 분명했어요. " +
    "검사 측면에서는 기본 혈액검사만 하는 곳과 호르몬·비타민·심전도까지 종합으로 보는 곳이 갈렸고, " +
    "상담은 5분 안에 끝나는 곳과 20분 이상 충분히 설명해주는 곳이 달랐어요. " +
    "비용은 같은 " + name + "이라도 30~50% 차이가 나는 경우가 있었고, " +
    "장비는 최신 검사 시스템 도입 여부에서 격차가 컸어요. " +
    "결국 검사 항목·상담 시간·비용 범위·장비 수준 이 네 가지를 비교 기준으로 잡았어요.\n";
  return text.slice(0, insertAt) + inject + text.slice(insertAt);
}

// ============================================================
// 진료별 전문성 한 줄
// ============================================================
const EXPERT_LINES = {
  hypertension:      "{region} 가정의학과 고혈압 관리 기준으로 혈압 수치와 동반 질환에 따라 약물 선택이 달라진다고 설명해주셨어요.",
  diabetes:          "{region} 가정의학과 당뇨 관리 기준으로 HbA1c·공복혈당·합병증 위험을 종합해서 약물·식이·운동 비중이 결정된다고 안내받았어요.",
  dyslipidemia:      "{region} 가정의학과 고지혈증 관리 기준으로 LDL 수치와 심혈관 위험도에 따라 스타틴 용량과 시작 시점이 달라진다고 설명해주셨어요.",
  checkup:           "{region} 가정의학과 종합건강검진 기준으로 연령·가족력·자각 증상에 따라 추가 정밀 검사 항목이 결정된다고 안내받았어요.",
  vaccination:       "{region} 가정의학과 예방접종 기준으로 연령·기저질환·과거 접종력에 따라 우선순위가 정해진다고 설명해주셨어요.",
  cold:              "{region} 가정의학과 감기·몸살 진료 기준으로 증상 지속 기간과 동반 증상에 따라 처방 약물이 달라진다고 안내받았어요.",
  reflux:            "{region} 가정의학과 역류성식도염 기준으로 증상 패턴과 지속 기간에 따라 PPI 용량과 내시경 시점이 결정된다고 설명해주셨어요.",
  ibs:               "{region} 가정의학과 과민성대장증후군 기준으로 경고 증상 유무와 패턴에 따라 약물·식이 관리 방향이 갈린다고 안내받았어요.",
  weight_loss:       "{region} 가정의학과 비만치료 기준으로 BMI·체성분·기저질환에 따라 삭센다·위고비 중 적합한 약물이 선택된다고 설명해주셨어요.",
  iv_therapy:        "{region} 가정의학과 수액치료 기준으로 컨디션·검사 결과에 따라 마늘·신데렐라·비타민 수액 종류가 달라진다고 안내받았어요.",
  nutrition_shot:    "{region} 가정의학과 영양주사 기준으로 혈액 검사 결핍 항목에 따라 비타민D·B군·면역주사 처방이 결정된다고 설명해주셨어요.",
  smoking_cessation: "{region} 가정의학과 금연클리닉 기준으로 흡연력·금단증상 강도에 따라 챔픽스·니코틴 패치 중 처방이 갈린다고 안내받았어요.",
  fatigue:           "{region} 가정의학과 만성피로 관리 기준으로 갑상선·빈혈·비타민·호르몬 검사를 종합해 원인별 관리 방향을 잡는다고 설명해주셨어요.",
};

function injectExpertLine(text, treatmentId, region) {
  const tpl = EXPERT_LINES[treatmentId];
  if (!tpl) return text;
  const line = "\n\n" + tpl.replace(/{region}/g, region) + "\n";
  if (text.includes(tpl.replace(/{region}/g, region).slice(0, 25))) return text;
  const consultIdx = text.indexOf("## 상담");
  if (consultIdx === -1) return text + line;
  const nextSection = text.indexOf("\n## ", consultIdx + 1);
  if (nextSection === -1) return text + line;
  return text.slice(0, nextSection) + line + text.slice(nextSection);
}

// ============================================================
// 수치 강제 삽입
// ============================================================
function injectExamValue(text, treatmentId) {
  const v = EXAM_VALUES[treatmentId];
  if (!v) return text;
  const hasNumber = /\d/.test(text);
  const hasCost = /(만원|비용|가격)/.test(text);
  if (hasNumber && hasCost) return text;

  const CHRONIC_IDS = ["hypertension", "diabetes", "dyslipidemia", "ibs", "fatigue"];
  const isChronic = CHRONIC_IDS.includes(treatmentId);

  const inject = isChronic
    ? "\n\n실제 검사 항목은 " + v.exam + " 중심으로 진행됐고, " +
      "이 질환은 " + v.recovery + "로 꾸준한 관리가 핵심이라고 해요. " +
      "검사·약물 비용은 " + v.cost + "만원 선이라고 안내받았어요.\n"
    : "\n\n실제 검사 항목은 " + v.exam + " 중심으로 진행됐고, " +
      "치료 기간은 " + v.recovery + " 정도, 통증은 10점 기준 " + v.pain + "점 정도, " +
      "비용은 " + v.cost + "만원 선이라고 안내받았어요.\n";

  const consultIdx = text.indexOf("## 상담");
  if (consultIdx === -1) return text + inject;
  const nextSection = text.indexOf("\n## ", consultIdx + 1);
  if (nextSection === -1) return text + inject;
  return text.slice(0, nextSection) + inject + text.slice(nextSection);
}

// ============================================================
// 중복 제거 3단계
// ============================================================
function removeDuplicates(text) {
  const sections = text.split(/\n(?=## )/);
  const seenHeaders = new Set();
  const uniqueSections = sections.filter((s) => {
    const header = s.match(/^## (.+)/)?.[1]?.trim();
    if (!header) return true;
    if (seenHeaders.has(header)) return false;
    seenHeaders.add(header);
    return true;
  });
  let t = uniqueSections.join("\n");

  const paragraphs = t.split(/\n\n+/);
  const seen = new Set();
  const unique = paragraphs.filter((p) => {
    const key = p.trim().slice(0, 60);
    if (key.length < 20) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  t = unique.join("\n\n");
  t = t.replace(/([^.!?\n]{15,}[.!?])\s*\1/g, "$1");
  return t;
}

function removeRedundantCompareSection(text) {
  const lines = text.split("\n");
  const out = [];
  let skip = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+.*(vs|비교|비교표).*$/i.test(line) && !line.includes("결정")) {
      skip = true;
      continue;
    }
    if (skip && /^##\s+/.test(line)) {
      skip = false;
    }
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

// ============================================================
// 이미지 ALT 삽입
// ============================================================
function insertImageAlts(text, imageAlts) {
  if (!imageAlts) return text;
  let t = text;
  const tryInsert = (regex, alt) => {
    if (!alt) return;
    if (t.includes(alt)) return;
    if (regex.test(t)) {
      t = t.replace(regex, (m) => m + "\n" + alt + "\n\n");
    }
  };
  tryInsert(/(## 고민[^\n]*\n)/, imageAlts.concern);
  tryInsert(/(## 탐색[^\n]*\n)/, imageAlts.search);
  tryInsert(/(## 상담[^\n]*\n)/, imageAlts.consult);
  tryInsert(/(## 결정[^\n]*\n)/, imageAlts.decision);
  tryInsert(/(### 1일[^\n]*\n)/, imageAlts.result0);
  tryInsert(/(### 1주[^\n]*\n)/, imageAlts.result1);
  tryInsert(/(### 2주[^\n]*\n)/, imageAlts.result2);
  tryInsert(/(### 1개월[^\n]*\n)/, imageAlts.result3);
  tryInsert(/(## 마무리[^\n]*\n)/, imageAlts.summary);

  const changeMatch = t.match(/(##\s*(?:진료\s*후\s*)?변화[^\n]*\n)/);
  if (changeMatch) {
    const inserts = [];
    if (imageAlts.result1 && !t.includes(imageAlts.result1)) inserts.push(imageAlts.result1);
    if (imageAlts.result2 && !t.includes(imageAlts.result2)) inserts.push(imageAlts.result2);
    if (imageAlts.result3 && !t.includes(imageAlts.result3)) inserts.push(imageAlts.result3);
    if (inserts.length > 0) {
      t = t.replace(changeMatch[1], changeMatch[1] + "\n" + inserts.join("\n") + "\n\n");
    }
  }

  const allAlts = [
    imageAlts.concern, imageAlts.search, imageAlts.consult, imageAlts.decision,
    imageAlts.result1, imageAlts.result2, imageAlts.result3, imageAlts.summary,
  ].filter(Boolean);
  const missing = allAlts.filter((a) => !t.includes(a));
  if (missing.length > 0) {
    const titleMatch = t.match(/^(#\s+[^\n]+\n+)/);
    const head = titleMatch ? titleMatch[1] : "";
    let body = titleMatch ? t.slice(titleMatch[0].length) : t;
    let tail = "";
    const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
    if (tagMatch) {
      tail = tagMatch[1];
      body = body.slice(0, body.length - tail.length);
    }
    const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
    if (paras.length >= 4) {
      const positions = [];
      const n = missing.length;
      for (let i = 0; i < n; i++) {
        const pos = Math.floor(((i + 1) * paras.length) / (n + 1));
        positions.push(Math.min(Math.max(pos, 1), paras.length - 1));
      }
      const sortedPairs = positions
        .map((p, i) => ({ pos: p, alt: missing[i] }))
        .sort((a, b) => b.pos - a.pos);
      for (const { pos, alt } of sortedPairs) {
        paras.splice(pos, 0, alt);
      }
      t = head + paras.join("\n\n") + tail;
    }
  }
  return t;
}

// ============================================================
// 사진 ALT 장면 구체화
// ============================================================
const SCENE_ALTS = {
  hypertension:      { concern: "가정용 혈압계 수축기 150 측정된 화면", search: "가정의학과 3곳 검사 항목 비교 메모", consult: "혈압·심전도·혈액검사 받는 장면", decision: "혈압약 처방받는 진료실 모습", result0: "약 첫 복용한 첫날 혈압 기록", result1: "1주차 혈압 안정화된 가정 측정 일지", result2: "2주차 두통·어지럼 줄어든 일상", result3: "1개월차 혈압 정상 범위 회복한 측정지", summary: "정기 진료 일정 다이어리 적는 손", closing: "혈압 수첩 정리한 책상 위" },
  diabetes:          { concern: "공복혈당 130 넘는 자가 측정 결과지", search: "당뇨 약물·식이 관리 비교 자료", consult: "HbA1c·공복혈당 검사받는 장면", decision: "메트포르민 처방받는 진료실", result0: "약 시작한 첫날 혈당 기록", result1: "1주차 혈당 안정화된 측정 일지", result2: "2주차 식이 관리 병행한 식단표", result3: "1개월차 HbA1c 감소한 검사 결과지", summary: "혈당 수첩과 식단 관리 메모", closing: "정기 검진 예약 카드 정리" },
  dyslipidemia:      { concern: "LDL 165 넘게 나온 검진 결과지", search: "스타틴·생활습관 비교 자료 화면", consult: "지질·간기능 검사받는 장면", decision: "스타틴 저용량 처방받는 진료실", result0: "약 시작한 첫날 기록", result1: "1주차 식단 관리 병행한 일상", result2: "2주차 컨디션 변화 없는 일상", result3: "1개월차 LDL 감소 확인한 재검 결과", summary: "정기 지질 검사 일정 다이어리", closing: "검사 결과 파일 정리한 서랍" },
  checkup:           { concern: "회사 건강검진 재검 통보 받은 화면", search: "종합·정밀검진 항목 비교 자료", consult: "혈액·심전도·내시경 검사 장면", decision: "추가 정밀검사 결정한 상담실", result0: "검진 당일 결과지 받은 장면", result1: "1주차 결과 정리한 메모", result2: "2주차 추적 검사 일정 확인", result3: "1개월차 재검 결과 안내받은 상담실", summary: "정기 검진 일정 적은 다이어리", closing: "검진 결과 파일 정리한 서랍" },
  vaccination:       { concern: "주변에서 대상포진 고생한 사례 들은 메모", search: "대상포진·독감·폐렴구균 백신 비교 자료", consult: "병력·알레르기 문진받는 장면", decision: "싱그릭스 2회차 결정한 진료실", result0: "1차 접종 직후 회복실 모습", result1: "1주차 접종 부위 회복 일상", result2: "2개월 후 2차 접종 받는 장면", result3: "접종 완료 확인서 받은 모습", summary: "예방접종 기록 정리한 수첩", closing: "다음 접종 일정 메모 책상" },
  cold:              { concern: "기침·미열 1주일째 안 떨어진 일상 모습", search: "약국 약·병원 진료 비교 검색 화면", consult: "체온·청진 진찰받는 장면", decision: "처방약 결정한 진료실 모습", result0: "처방약 첫 복용한 첫날 기록", result1: "1주차 기침 줄어든 일상", result2: "2주차 컨디션 회복된 출근길", result3: "1개월차 후속 검진 결과", summary: "정기 환절기 관리 메모지", closing: "약 정리한 책상 위 모습" },
  reflux:            { concern: "밤에 누우면 신물 올라오는 일상 모습", search: "PPI·내시경·생활 교정 비교 자료", consult: "역류 증상 문진·진찰 장면", decision: "PPI 처방받는 진료실 모습", result0: "약 첫 복용한 첫날 기록", result1: "1주차 속쓰림 줄어든 일상", result2: "2주차 야간 신물 거의 사라진 수면", result3: "1개월차 재진 결과 안내받은 모습", summary: "식단·자세 관리 메모한 책상", closing: "약 보관함 정리한 모습" },
  ibs:               { concern: "회의 직전 배 아파 화장실 뛰어가는 모습", search: "기능성·기질성 장 질환 비교 자료", consult: "장 트러블 문진·검사받는 장면", decision: "약물·식이 관리 결정한 진료실", result0: "약 첫 복용한 첫날 기록", result1: "1주차 복통 빈도 줄어든 일상", result2: "2주차 식이 관리 병행한 식단", result3: "1개월차 증상 안정화 확인 검진", summary: "스트레스 관리 일정 메모", closing: "관리 일지 정리한 책상" },
  weight_loss:       { concern: "옷 사이즈 한 단계 올라간 거울 앞 모습", search: "삭센다·위고비·식단 비교 자료", consult: "체성분·혈액·갑상선 검사 장면", decision: "삭센다 처방 결정한 진료실 모습", result0: "첫 자가 주사한 첫날 기록", result1: "1주차 식욕 감소 체감한 일상", result2: "2주차 체중 감소 시작된 측정지", result3: "1개월차 평균 5% 감량 확인한 결과", summary: "식단·운동 병행 일지 정리", closing: "체중 측정 다이어리 책상 위" },
  iv_therapy:        { concern: "월요일 아침에도 피곤한 사무실 책상 모습", search: "마늘·신데렐라·비타민 수액 비교 자료", consult: "혈액·체성분 검사받는 장면", decision: "수액 종류 결정한 진료실", result0: "1회차 수액 시술 직후 회복실", result1: "1주차 컨디션 개선된 일상", result2: "2회차 시술 후 변화 메모", result3: "1개월차 정기 코스 마친 결과", summary: "에너지 관리 일정 메모지", closing: "다음 수액 예약 카드" },
  nutrition_shot:    { concern: "잦은 감기·입병 반복된 메모지", search: "비타민D·면역·B군 주사 비교 자료", consult: "비타민D·혈액 결핍 검사 장면", decision: "비타민D 주사 결정한 진료실", result0: "1차 주사 직후 회복실 모습", result1: "1주차 컨디션 개선된 일상", result2: "2주차 면역력 체감 변화 메모", result3: "1개월차 비타민D 정상 범위 회복", summary: "정기 영양주사 일정 다이어리", closing: "다음 주사 예약 메모지" },
  smoking_cessation: { concern: "수년째 끊으려 시도한 담배 갑 모습", search: "챔픽스·패치·의지 금연 비교 자료", consult: "폐기능·일산화탄소 측정 장면", decision: "챔픽스 12주 코스 결정한 진료실", result0: "약 첫 복용한 첫날 기록", result1: "1주차 흡연량 줄어든 일상", result2: "2주차 금연 유지한 일정", result3: "1개월차 완전 금연 확인한 일산화탄소 측정", summary: "금연 일지 정리한 책상", closing: "남은 약 정리한 보관함" },
  fatigue:           { concern: "충분히 자도 안 풀린 피로 일상 모습", search: "갑상선·빈혈·비타민D 검사 비교 자료", consult: "혈액·갑상선·호르몬 검사 장면", decision: "맞춤 관리 시작한 진료실", result0: "관리 시작 첫날 컨디션 기록", result1: "1주차 컨디션 호전된 일상", result2: "2주차 수면 질 개선된 메모", result3: "1개월차 검사 결핍 항목 회복 결과", summary: "생활 관리 일정 정리한 다이어리", closing: "정기 진료 예약 카드" },
};

function buildSceneAlts(treatmentId, region, name) {
  const scene = SCENE_ALTS[treatmentId];
  if (!scene) return null;
  const prefix = region + " " + name + " 후기";
  return {
    concern:  "[이미지: " + prefix + " | " + scene.concern + "]",
    search:   "[이미지: " + prefix + " | " + scene.search + "]",
    consult:  "[이미지: " + prefix + " | " + scene.consult + "]",
    decision: "[이미지: " + prefix + " | " + scene.decision + "]",
    result0:  "[이미지: " + prefix + " | " + scene.result0 + "]",
    result1:  "[이미지: " + prefix + " | " + scene.result1 + "]",
    result2:  "[이미지: " + prefix + " | " + scene.result2 + "]",
    result3:  "[이미지: " + prefix + " | " + scene.result3 + "]",
    summary:  "[이미지: " + prefix + " | " + scene.summary + "]",
    closing:  "[이미지: " + prefix + " | " + scene.closing + "]",
  };
}

// ============================================================
// VS_BLOCKS — A vs B 고민 블록
// ============================================================
const VS_BLOCKS = {
  hypertension: {
    rival: "생활습관 교정만",
    body: [
      "검사를 받고 나서 가장 고민됐던 부분은 약을 바로 시작할지, 우선 식이·운동만으로 버텨볼지였어요. 단순히 부담만 볼 문제가 아니라, 혈압 수치와 합병증 위험까지 보면 결정 기준이 달라진다는 설명을 들었어요.",
      "생활습관 교정은 부작용이 없고 부담이 적지만, 이미 수축기 150을 넘는 상태에서 단기간에 기준치까지 떨어뜨리기 어렵다는 점이 부담이었어요. 반대로 약물 치료는 1~4주 안에 안정화가 가능하고 합병증 위험을 빠르게 줄일 수 있다는 점이 기준이 됐어요.",
      "혈압 수치가 이미 고위험 단계로 올라간 상태라 약물과 생활 관리를 병행하는 쪽으로 결정하게 됐어요.",
    ],
  },
  diabetes: {
    rival: "식이 조절만",
    body: [
      "검사 후 가장 오래 고민했던 부분은 식이 조절만으로 버텨볼지, 약물을 바로 시작할지였어요. 부담만 비교하면 식이가 가볍지만, HbA1c와 공복혈당 수치까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "식이 조절만 하는 방식은 6개월 이상 시간이 필요하고 그 사이 합병증 진행 가능성이 있다는 점이 부담이었어요. 반대로 메트포르민 같은 약물은 1~3개월 안에 HbA1c 1~2% 감소가 가능하고 합병증 예방력이 강하다는 점이 기준이 됐어요.",
      "이미 HbA1c가 기준선을 넘은 상태라 약물과 식이 관리를 병행하는 쪽으로 결정하게 됐어요.",
    ],
  },
  dyslipidemia: {
    rival: "운동·식단만",
    body: [
      "LDL 수치가 높게 나오면서 가장 고민됐던 부분은 운동·식단만으로 관리할지, 스타틴을 시작할지였어요. 비용 부담만 보면 식단이 가볍지만, 가족력과 심혈관 위험도까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "운동·식단만 하는 방식은 6개월 이상 시간이 걸리고 LDL 감소폭도 5~15%로 제한적이라는 점이 부담이었어요. 반대로 스타틴 저용량은 4~6주 안에 30~50% 감소가 가능하고 심혈관 위험을 직접 줄여준다는 점이 기준이 됐어요.",
      "가족력이 있고 LDL이 160을 넘는 고위험 상태라 스타틴과 생활 관리를 병행하는 쪽으로 결정하게 됐어요.",
    ],
  },
  checkup: {
    rival: "기본 검진만",
    body: [
      "검진을 앞두고 가장 고민됐던 부분은 기본 검진만 받을지, 종합검진까지 받을지였어요. 비용만 보면 기본이 가볍지만, 가족력과 자각 증상 변화까지 보면 결정 기준이 달라진다는 설명을 들었어요.",
      "기본 검진은 항목 10~15개로 한정적이라 위·대장·심혈관 위험은 따로 챙겨야 한다는 점이 부담이었어요. 반대로 종합검진은 30~50개 항목을 한 번에 보면서 조기 발견율이 훨씬 높다는 점이 기준이 됐어요.",
      "최근 컨디션 변화가 있고 가족 중 암 병력이 있는 상황이라 종합검진 쪽으로 결정하게 됐어요.",
    ],
  },
  vaccination: {
    rival: "접종 안 함",
    body: [
      "예방접종을 앞두고 가장 고민됐던 부분은 비용을 들여 받을지, 우선 미룰지였어요. 당장의 부담만 보면 안 받는 쪽이 가볍지만, 연령 위험도와 합병증 가능성까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "접종을 미루는 방식은 부담이 적지만 50대 이후 대상포진은 합병증으로 한 달 이상 고생하는 사례가 많다는 점이 부담이었어요. 반대로 싱그릭스 2회 접종은 비용은 들지만 90% 이상 예방 효과가 있다는 점이 기준이 됐어요.",
      "주변에서 고생하는 사례를 직접 본 상황이라 접종을 받는 쪽으로 결정하게 됐어요.",
    ],
  },
  cold: {
    rival: "약국 종합감기약",
    body: [
      "감기 증상이 길어지면서 가장 고민됐던 부분은 약국 약으로 버틸지, 진료를 받을지였어요. 비용 부담만 보면 약국이 가볍지만, 증상 지속 기간과 합병증 위험까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "약국 종합감기약은 진단 없이 복용하는 방식이라 1주일 넘게 안 떨어지면 2차 감염으로 진행될 위험이 있다는 점이 부담이었어요. 반대로 가정의학과 진료는 정확한 진찰과 처방이 가능해 회복 기간이 단축된다는 점이 기준이 됐어요.",
      "이미 1주일 넘게 기침이 안 잡힌 상태라 진료를 받는 쪽으로 결정하게 됐어요.",
    ],
  },
  reflux: {
    rival: "위내시경 우선",
    body: [
      "역류 증상이 길어지면서 가장 고민됐던 부분은 PPI 약물부터 쓸지, 위내시경부터 받을지였어요. 비용 부담만 보면 약물이 가볍지만, 증상 패턴과 연령까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "위내시경부터 받는 방식은 8~15만원 비용이 들고 검사 부담이 있다는 점이 부담이었어요. 반대로 PPI 약물은 4~8주 동안 1~2주 안에 효과가 나타나고 그 후 안 들으면 그때 내시경을 결정하면 된다는 점이 기준이 됐어요.",
      "전형적인 역류 증상이 분명하고 경고 증상이 없는 상태라 우선 약물부터 시도하는 쪽으로 결정하게 됐어요.",
    ],
  },
  ibs: {
    rival: "대장내시경 우선",
    body: [
      "장 트러블이 반복되면서 가장 고민됐던 부분은 약물·식이 관리로 갈지, 대장내시경부터 받을지였어요. 비용 부담만 보면 약물이 가볍지만, 경고 증상 유무와 증상 패턴까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "대장내시경부터 받는 방식은 10~20만원 비용이 들고 준비 과정이 부담이라는 점이 있었어요. 반대로 약물·식이 관리는 1~2개월 시도하면서 호전 여부로 진단을 좁힐 수 있다는 점이 기준이 됐어요.",
      "혈변·체중감소 같은 경고 증상이 없고 스트레스와 명확히 연관된 패턴이라 약물·식이 관리부터 시작하는 쪽으로 결정하게 됐어요.",
    ],
  },
  weight_loss: {
    rival: "식단·운동만",
    body: [
      "체중 정체가 길어지면서 가장 고민됐던 부분은 식단·운동만으로 더 버틸지, 약물 치료를 시작할지였어요. 비용 부담만 보면 식단이 가볍지만, BMI와 기존 시도 결과까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "식단·운동만 하는 방식은 부작용이 없지만 6개월 이상 시도해서 정체된 상황에선 추가 감량이 어렵다는 점이 부담이었어요. 반대로 삭센다·위고비는 월 비용이 들지만 평균 5~15% 감량이 가능하고 식욕 조절이 같이 된다는 점이 기준이 됐어요.",
      "BMI가 30에 가깝고 기존 시도가 정체된 상태라 약물과 생활 관리를 병행하는 쪽으로 결정하게 됐어요.",
    ],
  },
  iv_therapy: {
    rival: "영양제 복용만",
    body: [
      "피로가 길어지면서 가장 고민됐던 부분은 경구 영양제만 더 챙길지, 수액으로 갈지였어요. 비용 부담만 보면 영양제가 가볍지만, 흡수율과 즉각 효과 필요성까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "경구 영양제는 흡수율이 30~60% 정도라 효과 체감까지 시간이 걸린다는 점이 부담이었어요. 반대로 수액치료는 회당 비용이 들지만 흡수율 95% 이상이라 컨디션 회복이 빠르다는 점이 기준이 됐어요.",
      "급한 회복이 필요한 상태라 수액 코스 + 경구 보충 병행 쪽으로 결정하게 됐어요.",
    ],
  },
  nutrition_shot: {
    rival: "경구 영양제",
    body: [
      "검사 후 가장 고민됐던 부분은 경구 영양제로 보충할지, 영양주사로 갈지였어요. 비용 부담만 보면 경구가 가볍지만, 결핍 진단 결과와 흡수율까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "경구 영양제는 매일 복용해야 하고 흡수율이 낮아 결핍 회복까지 시간이 걸린다는 점이 부담이었어요. 반대로 비타민D 주사는 회당 비용이 들지만 흡수율 95% 이상이고 3~6개월 지속 효과가 있다는 점이 기준이 됐어요.",
      "비타민D 결핍 진단을 받은 상태라 주사로 빠르게 보충하고 경구로 유지하는 쪽으로 결정하게 됐어요.",
    ],
  },
  smoking_cessation: {
    rival: "의지로만",
    body: [
      "금연을 결심하면서 가장 고민됐던 부분은 혼자 의지로 갈지, 약물 도움을 받을지였어요. 비용 부담만 보면 의지가 가볍지만, 기존 시도 횟수와 성공률 차이까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "의지로만 하는 방식은 6개월 성공률이 5~10% 정도로 낮고 금단증상에 취약하다는 점이 부담이었어요. 반대로 챔픽스 12주 코스는 성공률이 30~40%로 높고 정부 지원으로 본인 부담도 적다는 점이 기준이 됐어요.",
      "혼자 시도해서 여러 번 실패한 상태라 약물 도움 + 정기 진료 관리 쪽으로 결정하게 됐어요.",
    ],
  },
  fatigue: {
    rival: "쉬는 것만",
    body: [
      "피로가 한 달 넘게 이어지면서 가장 고민됐던 부분은 더 쉬어볼지, 검사를 받을지였어요. 비용 부담만 보면 휴식이 가볍지만, 피로 지속 기간과 결핍 가능성까지 보면 판단 기준이 달라진다는 설명을 들었어요.",
      "쉬는 것만 하는 방식은 원인을 모르는 상태라 회복 여부가 모호하다는 점이 부담이었어요. 반대로 정밀 검사는 비용은 들지만 갑상선·빈혈·비타민D 같은 결핍 항목을 정확히 짚어준다는 점이 기준이 됐어요.",
      "충분히 자도 피로가 안 풀린 상태가 한 달 넘게 이어진 상황이라 검사 + 맞춤 관리 쪽으로 결정하게 됐어요.",
    ],
  },
};

function injectVsBlock(text, treatmentId, name) {
  const vs = VS_BLOCKS[treatmentId];
  if (!vs) return text;
  if (text.includes(vs.body[0].slice(0, 30))) return text;

  // 결정 섹션에 이미 충분한 비교/결정 내용이 있으면 스킵 (중복 방지)
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx !== -1) {
    const nextHeader = text.indexOf("\n## ", decisionIdx + 1);
    const decisionBody = text.slice(decisionIdx, nextHeader === -1 ? text.length : nextHeader);
    const hasRival = decisionBody.includes(vs.rival) || /생활습관|식이.{0,3}조절|운동.{0,3}식단/.test(decisionBody);
    const hasReason = /(결정|선택|판단)했|결정하게|선택하게|기준이 됐|기준으로 잡/.test(decisionBody);
    const hasComparison = /(반대로|병행|단기간|장기간|빠르게|안정화|기준)/.test(decisionBody);
    const decisionLength = decisionBody.replace(/\s/g, "").length;
    // 결정 섹션이 250자 이상 + 비교 의도 + 결정 표현 + 거부 옵션 모두 갖추면 VS 블록 불필요
    if (decisionLength >= 250 && hasRival && hasReason && hasComparison) {
      return text;
    }
  }

  const block = "\n\n" + vs.body.join("\n\n") + "\n\n";

  if (decisionIdx !== -1) {
    return text.slice(0, decisionIdx) + block + text.slice(decisionIdx);
  }
  const consultIdx = text.indexOf("## 상담");
  if (consultIdx !== -1) {
    const nextSection = text.indexOf("\n## ", consultIdx + 1);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    return text.slice(0, insertAt) + block + text.slice(insertAt);
  }
  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const head = titleMatch ? titleMatch[1] : "";
  let body = titleMatch ? text.slice(titleMatch[0].length) : text;
  let tail = "";
  const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
  if (tagMatch) {
    tail = tagMatch[1];
    body = body.slice(0, body.length - tail.length);
  }
  const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paras.length >= 4) {
    const insertIdx = Math.floor(paras.length * 0.6);
    paras.splice(insertIdx, 0, vs.body.join("\n\n"));
    return head + paras.join("\n\n") + tail;
  }
  return text + block;
}

// ============================================================
// 병원 선택 기준 블록 — 탐색 섹션 4축 보강용
// ============================================================
const HOSPITAL_PICK_BLOCK = [
  "비교하면서 느낀 건, 같은 가정의학과여도 검사 항목 / 상담 시간 / 비용 / 장비 시스템 네 가지에서 차이가 분명했다는 점이에요. 단순히 후기 평점만으로는 안 보이던 부분이었어요.",
  "검사 항목은 기본 혈액검사만 보는 곳과 호르몬·심전도·체성분까지 함께 보는 곳이 갈렸고, 상담 시간은 5분 안에 끝나는 곳과 20분 이상 충분히 짚어주는 곳이 달랐어요. 비용은 같은 진료라도 항목 구성에 따라 30~50% 차이가 났고, 장비는 최신 검사 시스템 도입 여부에서 격차가 컸어요.",
  "결국 저는 검사 범위와 상담 시간 두 가지를 가장 중요한 기준으로 잡았어요. 처방만 빠르게 받는 곳보다, 제 상태를 수치 기준으로 설명해주고 관리 방향까지 짚어주는 곳을 우선순위에 두기로 한 거죠.",
];

function injectHospitalPickBlock(text) {
  if (text.includes("네 가지에서 차이가 분명했다는")) return text;
  const block = "\n\n" + HOSPITAL_PICK_BLOCK.join("\n\n") + "\n";

  // 1순위: ## 탐색 섹션 끝 (가장 자연스러움)
  const searchIdx = text.indexOf("## 탐색");
  if (searchIdx !== -1) {
    const nextSection = text.indexOf("\n## ", searchIdx + 1);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    return text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  // 2순위: ## 결정 섹션 끝 (탐색이 없을 때 fallback)
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx !== -1) {
    const nextSection = text.indexOf("\n## ", decisionIdx + 1);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    return text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const head = titleMatch ? titleMatch[1] : "";
  let body = titleMatch ? text.slice(titleMatch[0].length) : text;
  let tail = "";
  const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
  if (tagMatch) {
    tail = tagMatch[1];
    body = body.slice(0, body.length - tail.length);
  }
  const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paras.length >= 5) {
    const insertIdx = Math.floor(paras.length * 0.6);
    paras.splice(insertIdx, 0, HOSPITAL_PICK_BLOCK.join("\n\n"));
    return head + paras.join("\n\n") + tail;
  }
  return text + block;
}

// ============================================================
// 변화 섹션 앞 정렬 — 변화 섹션 사이에 끼어든 분석 단락을 탐색 섹션 끝으로 끌어올림
// (결정 섹션 끝이 아니라 탐색 섹션 끝이 정답 — 정답 구조: 고민→탐색→결정→경과)
// ============================================================
function reorderAnalysisBeforeResult(text) {
  const resultIdx = text.indexOf("## 진료 후 변화");
  if (resultIdx === -1) return text;
  const closingIdx = text.indexOf("## 마무리", resultIdx);
  if (closingIdx === -1) return text;

  // 변화 섹션 본문 (## 진료 후 변화 ~ ## 마무리 직전)
  const resultStart = resultIdx;
  const resultEnd = closingIdx;
  const resultBlock = text.slice(resultStart, resultEnd);

  // 변화 섹션 안에 끼어든 분석성 문단을 식별할 키워드
  const analysisMarkers = [
    "검사를 받고 나서 가장 고민됐던",
    "단순히 부담만 볼 문제가 아니라",
    "생활습관 교정은 부작용이 없고",
    "혈압 수치가 이미 고위험 단계로",
    "비교하면서 느낀 건",
    "네 가지에서 차이가 분명했다는",
    "검사 항목은 기본 혈액검사만 보는",
    "결국 저는 검사 범위와 상담 시간",
    "검사 측면에서는 기본 혈액검사만",
    "상담은 5분 안에 끝나는 곳과",
    "결국 검사 항목·상담 시간·비용 범위·장비 수준",
  ];

  // 변화 섹션을 라인 단위로 자르고 분석 단락만 추출
  const lines = resultBlock.split("\n");
  const cleanLines = [];
  const extractedParas = [];
  let currentPara = [];

  const flushPara = () => {
    if (currentPara.length === 0) return;
    const paraText = currentPara.join("\n");
    const isAnalysis = analysisMarkers.some((m) => paraText.includes(m));
    if (isAnalysis) {
      extractedParas.push(paraText.trim());
    } else {
      cleanLines.push(...currentPara);
    }
    currentPara = [];
  };

  for (const line of lines) {
    if (/^##/.test(line) || /^###/.test(line) || /^\[이미지:/.test(line.trim())) {
      flushPara();
      cleanLines.push(line);
    } else if (line.trim() === "") {
      flushPara();
      cleanLines.push(line);
    } else {
      currentPara.push(line);
    }
  }
  flushPara();

  if (extractedParas.length === 0) return text;

  // 변화 섹션에서 분석 단락 제거된 깨끗한 본문
  const cleanedResultBlock = cleanLines.join("\n").replace(/\n{3,}/g, "\n\n");

  // 삽입 위치 우선순위: ① 탐색 섹션 끝 (정답 위치) → ② 결정 섹션 끝 (fallback)
  const searchIdx = text.indexOf("## 탐색");
  const decisionIdx = text.indexOf("## 결정");
  let insertTarget = -1;

  if (searchIdx !== -1) {
    // 탐색 섹션 끝 = 다음 ## 헤더 직전
    const nextAfterSearch = text.indexOf("\n## ", searchIdx + 1);
    insertTarget = nextAfterSearch === -1 ? -1 : nextAfterSearch;
  }
  if (insertTarget === -1 && decisionIdx !== -1 && decisionIdx < resultStart) {
    // 탐색이 없으면 결정 끝(= 변화 시작 직전)으로 fallback
    insertTarget = resultStart;
  }
  if (insertTarget === -1) return text;

  // 변화 섹션 부분만 깨끗하게 교체
  const beforeResult = text.slice(0, resultStart);
  const afterResult = text.slice(resultEnd);
  const textWithCleanResult = beforeResult + cleanedResultBlock + afterResult;

  // 삽입 위치 재계산 (cleanedResultBlock으로 길이가 달라졌을 수 있음)
  const newSearchIdx = textWithCleanResult.indexOf("## 탐색");
  let finalInsertAt = -1;
  if (newSearchIdx !== -1) {
    const nextAfter = textWithCleanResult.indexOf("\n## ", newSearchIdx + 1);
    finalInsertAt = nextAfter === -1 ? -1 : nextAfter;
  }
  if (finalInsertAt === -1) {
    // fallback: 변화 시작 직전
    finalInsertAt = textWithCleanResult.indexOf("## 진료 후 변화");
  }
  if (finalInsertAt === -1) return text;

  const insertedAnalysis = "\n\n" + extractedParas.join("\n\n") + "\n";
  return textWithCleanResult.slice(0, finalInsertAt) + insertedAnalysis + textWithCleanResult.slice(finalInsertAt);
}

// ============================================================
// 변화 섹션 내부 ### 헤더 순서 강제 정렬 (1일 → 1주 → 2주 → 1개월)
// ============================================================
function enforceTimelineOrder(text) {
  const resultIdx = text.indexOf("## 진료 후 변화");
  if (resultIdx === -1) return text;
  const closingIdx = text.indexOf("## 마무리", resultIdx);
  if (closingIdx === -1) return text;

  const resultBlock = text.slice(resultIdx, closingIdx);
  const headerOrder = ["### 1일", "### 1주", "### 2주", "### 1개월"];

  // 각 ### 헤더의 위치 확인
  const positions = headerOrder.map((h) => resultBlock.indexOf(h));
  if (positions.some((p) => p === -1)) return text;

  // 이미 순서대로면 스킵
  let isSorted = true;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] < positions[i - 1]) { isSorted = false; break; }
  }
  if (isSorted) return text;

  // 변화 섹션 헤더(## 진료 후 변화) 본문 + 각 ### 블록 분리
  const mainHeaderEnd = resultBlock.indexOf("\n", 0) + 1;
  const mainHeader = resultBlock.slice(0, mainHeaderEnd);

  // 헤더 시작 인덱스 정렬
  const sorted = headerOrder.map((h, i) => ({ header: h, start: positions[i] }))
    .sort((a, b) => headerOrder.indexOf(a.header) - headerOrder.indexOf(b.header));

  // 각 ### 블록의 텍스트 추출 (현재 위치 기준)
  const blocks = headerOrder.map((h) => {
    const start = resultBlock.indexOf(h);
    const nextHeaderIdx = headerOrder
      .map((h2) => resultBlock.indexOf(h2))
      .filter((idx) => idx > start)
      .sort((a, b) => a - b)[0];
    const end = nextHeaderIdx === undefined ? resultBlock.length : nextHeaderIdx;
    return resultBlock.slice(start, end).trim();
  });

  // 헤더 순서대로 재조립
  const reordered = mainHeader + "\n" + blocks.join("\n\n") + "\n\n";
  return text.slice(0, resultIdx) + reordered + text.slice(closingIdx);
}


function repositionVsBlock(text, treatmentId) {
  const vs = VS_BLOCKS[treatmentId];
  if (!vs) return text;
  const vsFirstLine = vs.body[0];
  const vsBlockText = vs.body.join("\n\n");
  const vsStart = text.indexOf(vsFirstLine);
  if (vsStart === -1) return text;
  const vsLastLine = vs.body[vs.body.length - 1];
  const vsLastLineStart = text.indexOf(vsLastLine, vsStart);
  if (vsLastLineStart === -1) return text;
  const vsEnd = vsLastLineStart + vsLastLine.length;

  const decisionMarkers = [
    /([가-힣A-Za-z]+\s*수술을\s*결정하게\s*된\s*[^.\n]*이유[^.\n]*[.\n])/,
    /([가-힣A-Za-z]+\s*(?:수술|시술|치료|진료|관리)?을?를?\s*결정한\s*[^.\n]*이유[^.\n]*[.\n])/,
    /(결국[^.\n]{0,40}(선택|결정)[^.\n]{0,30}[.\n])/,
    /([가-힣A-Za-z]+을?를?\s*선택하게\s*된\s*[^.\n]*[.\n])/,
    /([가-힣A-Za-z]+을?를?\s*선택한\s*(?:가장\s*큰\s*)?이유[^.\n]*[.\n])/,
    /([가-힣A-Za-z]+을?를?\s*고른\s*(?:가장\s*큰\s*)?이유[^.\n]*[.\n])/,
    /([가-힣A-Za-z]+이?가?\s*아니라\s*[가-힣A-Za-z]+을?를?\s*고른\s*이유[^.\n]*[.\n])/,
    /(결정하게\s*된\s*가장\s*큰\s*이유[^.\n]*[.\n])/,
    /(가장\s*큰\s*이유는[^.\n]*[.\n])/,
    /(선택한\s*가장\s*큰\s*이유[^.\n]*[.\n])/,
    /(선택한\s*이유는[^.\n]*[.\n])/,
    /(고른\s*이유는[^.\n]*[.\n])/,
  ];

  let decisionMarkerText = null;
  for (const re of decisionMarkers) {
    const m = text.match(re);
    if (m) {
      decisionMarkerText = m[1];
      break;
    }
  }
  if (!decisionMarkerText) return text;

  const decisionMarkerIdx = text.indexOf(decisionMarkerText);
  if (vsEnd <= decisionMarkerIdx) return text;

  let beforeVs = text.slice(0, vsStart);
  let afterVs = text.slice(vsEnd);
  beforeVs = beforeVs.replace(/\n{3,}$/, "\n\n");
  afterVs = afterVs.replace(/^\n{2,}/, "\n\n");
  const cleaned = beforeVs + afterVs;

  let newDecisionIdx = -1;
  for (const re of decisionMarkers) {
    const m = cleaned.match(re);
    if (m) {
      newDecisionIdx = cleaned.indexOf(m[1]);
      break;
    }
  }
  if (newDecisionIdx === -1) return text;

  let paraStart = cleaned.lastIndexOf("\n\n", newDecisionIdx);
  if (paraStart === -1) paraStart = 0;
  else paraStart += 2;

  const prevText = cleaned.slice(0, paraStart).trimEnd();
  if (prevText.endsWith("]")) {
    const imgStart = prevText.lastIndexOf("[이미지:");
    if (imgStart !== -1) {
      let imgPara = cleaned.lastIndexOf("\n\n", imgStart);
      if (imgPara === -1) imgPara = 0;
      else imgPara += 2;
      paraStart = imgPara;
    }
  }

  const insertion = vsBlockText + "\n\n";
  return cleaned.slice(0, paraStart) + insertion + cleaned.slice(paraStart);
}

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;

  // ① 줄 시작 헤더 변환 (제목·섹션·하위섹션)
  t = t.replace(/^#\s+(.+)$/gm, "$1");                    // # 제목 → 평문
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");              // ## 섹션 → 빈줄+텍스트+빈줄
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");                // ### 변화(1일/1주) → ▶ 마커

  // ② 인라인에 끼어있는 헤더 (줄바꿈 없이 본문 중간에 박힌 경우)
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1"); // " ## 제목" → 줄바꿈
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1"); // " ### 1일" → 줄바꿈+마커

  // ③ 굵게/이탤릭 마크다운 제거 (혹시 GPT가 출력했을 경우)
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");                 // **굵게** → 평문
  t = t.replace(/\*([^*]+)\*/g, "$1");                     // *이탤릭* → 평문

  // ④ 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleFamily(req, res) {
  const startTime = Date.now();
  const { program, region: regionInput, keyword: keywordInput } = req.body;
  const region = regionInput || "강남";

  const treatment =
    FAMILY_TREATMENTS.find((t) => t.id === program.id) ||
    FAMILY_TREATMENTS.find((t) => t.name === program.name) ||
    program;

  // 부위 키워드 감지
  const SITE_KEYWORDS = ["초기", "재발", "만성", "급성"];
  const titleRaw = (keywordInput || "") + " " + (treatment.name || "");
  const detectedSite = SITE_KEYWORDS.find(
    (s) => titleRaw.includes(s) && !(treatment.name || "").includes(s)
  ) || "";
  const activeKeyword = detectedSite ? detectedSite + " " + treatment.name : treatment.name;
  const fullKeyword = region + " " + activeKeyword;

  // 제목 생성
  const titlePattern =
    treatment.titlePatterns?.[
      Math.floor(Math.random() * (treatment.titlePatterns?.length || 1))
    ] || "{region} {name} 후기";

  let finalTitle = titlePattern
    .replace("{region}", region)
    .replace("{name}", treatment.name);

  finalTitle = finalTitle.replace(/(후기)([^후]*)(후기)/, "$1$2");
  if (treatment.name && treatment.name.length >= 2) {
    const nameRe = new RegExp("(" + treatment.name + ")([^" + treatment.name.charAt(0) + "]+)\\1", "g");
    finalTitle = finalTitle.replace(nameRe, "$1$2");
  }

  console.log(`[family] 제목: ${finalTitle} | 집중 키워드: ${activeKeyword}`);

  // 만성 관리형 — 회복기간 개념 없음
  const CHRONIC_IDS = ["hypertension", "diabetes", "dyslipidemia", "ibs", "fatigue"];
  const isChronic = CHRONIC_IDS.includes(treatment.id);

  // ── 단일 호출 ─────────
  const headerForceTop =
    "🚨 응답 첫 글자는 반드시 \"## 고민\" 입니다. 그 외 어떤 텍스트(인사말·제목·설명)도 앞에 쓰지 마세요.\n" +
    "🚨 응답에는 ## 헤더가 정확히 6개 필요: ## 고민 / ## 탐색 / ## 상담 / ## 결정 / ## 진료 후 변화 / ## 마무리\n" +
    "🚨 ## 진료 후 변화 안에는 ### 헤더 4개: ### 1일 / ### 1주 / ### 2주 / ### 1개월\n" +
    "🚨 헤더와 본문 사이 빈 줄 1개. 헤더 줄에 본문 붙이기 절대 금지.\n" +
    "🚨 위 헤더 구조 누락 시 응답 무효 처리됩니다.\n\n";

  const fullPrompt =
    headerForceTop +
    buildFamilyFullPrompt(treatment, region) +
    "\n\n🔒 집중 키워드: \"" + activeKeyword + "\" 으로만 서술. 다른 진료·증상 혼용 금지." +
    "\n🔒 본문에 반드시 포함:" +
    "\n   - \"" + region + " 가정의학과 " + activeKeyword + "\" → 4회 이상 (고민·상담·변화·마무리 각 1회씩 자연스럽게)" +
    "\n   - \"" + region + " " + activeKeyword + "\" → 3회 이상" +
    "\n   - \"" + activeKeyword + "\" → 5회 이상" +
    "\n🔒 진료명을 절대 \"이 진료\", \"이 치료\", \"이 시술\" 같은 대명사로 바꾸지 말 것. 매번 \"" + activeKeyword + "\" 그대로 쓸 것." +
    "\n🔒 제목은 절대 출력하지 마세요. ## 고민 부터 시작하세요." +
    "\n🔒 모든 섹션(고민·탐색·상담·결정·변화·마무리) 빠짐없이 ## 헤더로 작성." +
    "\n🔒 변화 섹션은 ### 1일 / ### 1주 / ### 2주 / ### 1개월 순서 고정." +
    "\n🔒 별도의 \"## ○○ vs 다른 진료 비교\" 섹션 만들지 말 것 (비교표는 결정 섹션에 자동 삽입됨)." +
    "\n🔒 본문에 표(|---|---|) 직접 만들지 말 것. 비교표는 시스템이 자동 삽입함." +
    "\n🔒 ## 헤더 형식 엄수: \"## 상담\\n\\n실제 상담을 받았어요\" 형태로 헤더와 본문 사이 빈 줄 1개 필수." +
    "\n🔒 절대 금지: \"## 상담을 받으러 간 날\", \"## 결정을 내리고\" 처럼 헤더에 본문 붙여 쓰지 말 것." +
    "\n🔒 본문 중간에 #해시태그 절대 쓰지 말 것 (마지막 해시태그는 시스템이 자동 추가함)." +
    "\n🔒 신뢰도 깨는 표현 금지: '한약·침·추나·공진단·보약·기혈 순환' 같은 한의원 영역 언급 금지. '보톡스·필러·레이저 시술·여드름 치료' 같은 미용 영역 언급 금지." +
    "\n🔒 어미 자연스럽게: '~자고예요', '~라고예요', '~했었어요', '~되었어요' 사용 금지. '~더라고요', '~했어요', '~됐어요'로 작성." +
    "\n🔒 어미 다양화 필수: 같은 종결 어미('~더라고요' 또는 '~했어요')를 한 문단에서 3회 이상 연속 사용 금지. '~라고 판단했어요', '~이 기준이 됐어요', '~한 셈이에요' 같은 판단형도 섞을 것." +
    "\n🔒 후기 아닌 판단 글로 쓸 것: '왜 이걸 골랐는가'를 구체 근거로 설명. 감정만 나열 금지. 각 결정에는 반드시 '수치·조건·기준' 중 하나를 포함." +
    "\n🔒 [정답 구조 절대 준수] 다음 순서를 반드시 지킬 것 — 고민 → 탐색(검색·혼란·병원 비교) → 상담(검사·비용·옵션 비교) → 결정(최종 선택 이유) → 진료 후 변화(경과) → 마무리. 결정을 탐색보다 먼저 내리지 말 것. 고민 섹션에서 결론을 미리 내리지 말 것. 탐색 섹션이 끝날 때까지는 '아직 결정 안 함' 상태를 유지할 것." +
    "\n🔒 [고민 섹션 금지] '결국 ~받기로 했어요', '결국 약물 치료를 시작했어요' 같은 결정 문장 금지. 고민 섹션 끝은 '검색을 시작했어요 / 알아보기 시작했어요' 식의 탐색 진입 신호로만 마무리." +
    "\n🔒 [상담 vs 결정 분리] 상담 섹션에서는 의사 설명·검사 결과·옵션 비교만 다루고, '~로 결정했어요'는 결정 섹션에서만 쓸 것. 상담에서 결정을 내려버리면 결정 섹션이 빈약해짐." +
    "\n🔒 ## 진료 후 변화 섹션은 1일·1주·2주·1개월 시간순 경과만 작성. 비교·결정·병원 비교·옵션 분석을 변화 섹션 안에 절대 끼워 넣지 말 것. 비교/결정 내용은 반드시 ## 결정 섹션이 끝나기 전까지 모두 마무리할 것." +
    "\n🔒 탐색 섹션은 3단계 흐름 필수: ①검색 시작·정보 혼란 (네이버·블로그·카페 검색 → 정보 과부하) → ②병원 3곳 비교 4축 (검사 항목·상담 시간·비용 범위·장비 시스템 — 4축 모두 명시) → ③본인이 가장 중요하게 본 1~2축으로 후보 좁히기 (최종 선택은 결정 섹션에서). 추상 표현('친절했다·느낌 좋았다·추천 받았다')만 나열 금지." +
    "\n🔒 고민 섹션 마지막 2~3문장은 '병원 vs 자가관리' 망설임 → '일단 알아보기는 해야겠다' 식 검색 시작 신호로 마무리. 이 흐름이 탐색 섹션 도입과 자연스럽게 이어져야 함." +
    "\n🔒 결정 섹션에는 '왜 다른 옵션이 아니었는가'를 명확히: '식이 조절이 아닌 약물', '약국 약이 아닌 진료' 식으로 거부한 옵션을 명시하고 그 이유를 댈 것." +
    "\n🔒 첫 문장은 짧고 강하게: '어느 날 거울을 보는데...', '화면 속 셀카...', '언젠가부터...' 같은 약한 시작 절대 금지. 구체 상황 1줄로 시작." +
    "\n🔒 AI 클리셰 금지: '드디어 결심하고', '결국 선택하게 되었어요', '마음이 편안해졌어요', '믿음이 갔어요', '친절하고 전문적이셔서', '미소를 되찾았어요' 등 사용 금지." +
    "\n🔒 광고 톤 금지: '추천드리고 싶어요', '강력 추천', '권해드리고 싶어요', '한 번쯤 고려해보는 것을 권해', '적극 추천', '재방문 의사', '주변에 적극적으로 추천' 등 사용 금지. 마무리는 '참고가 됐으면 좋겠어요', '판단의 기준이 됐어요' 같은 판단형으로." +
    "\n🔒 부사 연속 나열 금지: '특히', '또한', '무엇보다'를 한 문단에 2회 이상 쓰지 말 것." +
    (isChronic
      ? "\n🔒 이 질환은 만성 관리형 — '회복 기간', '완치', '나았다' 같은 표현 절대 금지. 대신 '안정', '수치 개선', '관리', '경과 안정화' 사용." +
        "\n🔒 비용 표현은 '월 약물비', '검사 주기 비용', '정기 진료비' 형태로 — 일회성 총비용 금지."
      : "");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: FAMILY_SYSTEM_PROMPT },
      { role: "user", content: fullPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3500,
  });

  let body = completion.choices[0].message.content || "";

  // 헤더 누락 검증 → 1회 재생성
  const requiredHeaders = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 마무리"];
  const presentCount = requiredHeaders.filter((h) => body.includes(h)).length;

  if (presentCount < 3) {
    console.log(`[family] 헤더 누락 감지 (${presentCount}/5) — 재생성 시도`);
    const retryPrompt =
      "🚨🚨🚨 직전 응답이 헤더 구조를 무시했습니다. 무효 처리.\n" +
      "🚨 이번에는 반드시 \"## 고민\" 으로 시작해서 ## 헤더 6개·### 헤더 4개를 정확히 출력하세요.\n" +
      "🚨 평문 출력 절대 금지. 모든 섹션은 ## 으로 시작하는 헤더가 줄 맨 앞에 있어야 합니다.\n\n" +
      fullPrompt;

    const retry = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: FAMILY_SYSTEM_PROMPT },
        { role: "user", content: retryPrompt },
      ],
      temperature: 0.5,
      max_tokens: 3500,
    });

    const retryBody = retry.choices[0].message.content || "";
    const retryCount = requiredHeaders.filter((h) => retryBody.includes(h)).length;

    if (retryCount > presentCount) {
      console.log(`[family] 재생성 성공 (${retryCount}/5)`);
      body = retryBody;
    } else {
      console.log(`[family] 재생성 실패 (${retryCount}/5) — fallback 후처리로 복원`);
    }
  }

  body = body.replace(/^#\s+[^\n]*\n+/, "");
  // ★ 본문 인라인 볼드 제거 — 헤더(#)는 보존, 본문 내 **텍스트** 만 제거
  body = body.replace(/\*\*([^*\n]+?)\*\*/g, "$1");
  body = body.trim();

  let result = "# " + finalTitle + "\n\n" + body;

  // ── 후처리 ─────
  result = restoreHeadersIfMissing(result);
  result = normalizeHeaders(result);
  result = fixCommonTypos(result);
  result = strengthenOpening(result);
  result = cleanText(result, activeKeyword, region);
  // ★ 제목 보호 패치 — 본문 중간 끼어든 # 라인 제거 정규식이 제목 삭제하지 않도록
  // 시작에 빈 줄(\n)이 있으면 첫 줄 제목이 \n# 로 매칭돼서 통째로 사라지는 버그 방지
  result = result.replace(/^\n+/, "");
  result = result.replace(/\n#[^\n#]+(?=\n)/g, "\n");
  result = removeRedundantCompareSection(result);
  result = removeOrphanTable(result, treatment.id);
  result = insertInfoBlock(result, treatment.id);
  result = injectExamValue(result, treatment.id);
  result = injectExpertLine(result, treatment.id, region);
  result = injectVsBlock(result, treatment.id, treatment.name);
  result = injectDecisionReason(result, treatment.id, region, treatment.name);
  result = injectHospitalPickBlock(result);
  result = injectSearchComparison(result, region, treatment.name);
  result = removeDuplicates(result);
  result = repositionVsBlock(result, treatment.id);
  result = reorderAnalysisBeforeResult(result);
  result = enforceTimelineOrder(result);

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 진료 / 처방 / 일상
  // ─────────────────────────────────────────────
  const _baseAlts = getFamilyImageAlts(treatment, region, activeKeyword);
  const _sceneAlts = buildSceneAlts(treatment.id, region, treatment.name);
  const _rawImageAlts = _sceneAlts ? { ..._baseAlts, ..._sceneAlts } : _baseAlts;
  const _alt = (label) => `[이미지: ${label}]`;
  // ★ 이미지 5장 표준 — 과다 삽입 방지 (search/result0/result2 비활성화)
  const imageAlts = {
    concern:  _alt("일상 사진"),
    search:   "",
    consult:  _alt("검사 사진"),
    decision: _alt("상담 사진"),
    result0:  "",
    result1:  _alt("진료 사진"),
    result2:  "",
    result3:  _alt("처방 사진"),
    summary:  _alt("일상 사진"),
  };
  result = insertImageAlts(result, imageAlts);

  // 핵심 키워드 4회 자동 보강
  const fullCount = (result.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const regionPlusName = region + " 가정의학과 " + activeKeyword;
  const regionPlusNameRe = new RegExp(regionPlusName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const regionPlusNameCount = (result.match(regionPlusNameRe) || []).length;

  const concernIdx = result.indexOf("## 고민");
  if (concernIdx !== -1) {
    const nextHeaderIdx = result.indexOf("\n## ", concernIdx + 1);
    const concernSection = result.slice(concernIdx, nextHeaderIdx === -1 ? result.length : nextHeaderIdx);
    if (!concernSection.includes(regionPlusName)) {
      const insertAt = nextHeaderIdx === -1 ? result.length : nextHeaderIdx;
      const concernInject = "\n그래서 " + regionPlusName + "을(를) 알아보기 시작했어요.\n";
      result = result.slice(0, insertAt) + concernInject + result.slice(insertAt);
    }
  }

  const recount = (result.match(regionPlusNameRe) || []).length;
  if (recount < 4) {
    const closingIdx = result.lastIndexOf("## 마무리");
    const inject =
      "\n\n" + regionPlusName + " 기준으로 본인 상태와 환경을 함께 고려해서 결정하는 게 가장 중요하다고 느꼈어요. " +
      regionPlusName + "을(를) 고민하시는 분들께 도움이 됐으면 해서 솔직하게 정리해봤습니다.\n\n";
    if (closingIdx !== -1) {
      result = result.slice(0, closingIdx) + inject + result.slice(closingIdx);
    } else {
      result += inject;
    }
  }

  const reviewKeyword = region + " " + activeKeyword + " 후기";
  const reviewCount = (result.match(new RegExp(reviewKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  if (reviewCount < 2) {
    const closingIdx = result.lastIndexOf("## 마무리");
    const inject2 = "\n\n" + reviewKeyword + "를 찾고 계셨다면 제 경험이 작은 참고가 됐으면 좋겠어요.\n";
    if (closingIdx !== -1) {
      const nextSection = result.indexOf("\n## ", closingIdx + 1);
      if (nextSection !== -1) {
        result = result.slice(0, nextSection) + inject2 + result.slice(nextSection);
      } else {
        result += inject2;
      }
    } else {
      result += inject2;
    }
  }

  // 마무리 판단형 톤 보강
  const judgmentClosing =
    "\n건강 관리를 고민하고 있다면 단순한 후기보다는 검사 결과와 생활 패턴을 기준으로 관리 방향을 잡는 것이 도움이 됐어요. " +
    "개인적으로는 검사 수치와 생활 습관 변화를 기준으로 결정했고, 그 기준이 결과적으로 맞는 선택이었다고 판단하게 됐어요.\n";

  if (!result.includes("단순한 후기보다는")) {
    const closingIdx = result.lastIndexOf("## 마무리");
    if (closingIdx !== -1) {
      const nextSection = result.indexOf("\n## ", closingIdx + 1);
      const insertAt = nextSection === -1 ? result.length : nextSection;
      result = result.slice(0, insertAt) + judgmentClosing + result.slice(insertAt);
    } else {
      const tagMatch = result.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
      if (tagMatch) {
        const cut = result.length - tagMatch[1].length;
        result = result.slice(0, cut) + judgmentClosing + result.slice(cut);
      } else {
        result += judgmentClosing;
      }
    }
  }

  // 마무리 이미지
  if (imageAlts.closing && !result.includes(imageAlts.closing)) {
    result += "\n\n" + imageAlts.closing + "\n";
  }

  result = result.replace(/(\s|^)#[가-힣A-Za-z0-9]+(?=\s|$)/g, (m, p1) => p1);
  result = result.replace(/\n#[^\n]+\n+(?=\[이미지)/g, "\n");
  result = result.replace(/\n+$/, "");

  // 해시태그
  const tags = [
    "#" + region + "가정의학과",
    "#" + region + "가정의학과" + activeKeyword.replace(/\s/g, ""),
    "#" + activeKeyword.replace(/\s/g, ""),
    "#" + treatment.name.replace(/\s/g, "") + "후기",
    "#" + region + treatment.name.replace(/\s/g, ""),
    "#가정의학과후기",
    "#" + activeKeyword.replace(/\s/g, "") + "후기",
  ];
  result += "\n\n" + tags.join(" ");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 진료 / 처방 / 일상
  // ─────────────────────────────────────────────
  result = result.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|진료|처방|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|혈액|영상|진단|소견|건강검진|x.?ray/i.test(s))   return "[이미지: 검사 사진]";
    if (/처방|약물|복용|투약|약제/.test(s))                   return "[이미지: 처방 사진]";
    if (/진료|치료|처치|주사|시술/.test(s))                   return "[이미지: 진료 사진]";
    if (/상담|설명|차트|문진|원장|의사|병원/.test(s))         return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = result.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|진료|처방|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // QC 로그
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const hasInfoBlock = !INFO_BLOCKS[treatment.id] || result.includes(INFO_BLOCKS[treatment.id].trim().split("\n")[0]);
  const hasExamValue = /\d/.test(result) && /(만원|비용|회복|통증|관리)/.test(result);
  const kwClean = activeKeyword.replace(/\s/g, "");
  const kwCount = (result.match(new RegExp(kwClean, "g")) || []).length;
  const finalRegionPlusNameCount = (result.match(new RegExp(regionPlusName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const charCount = calcFamilyCharCount(result);

  console.log(`[QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[QC] 수치: ${hasExamValue}`);
  console.log(`[QC] 키워드반복: ${kwCount}`);
  console.log(`[QC] 지역+가정의학과+진료명: ${finalRegionPlusNameCount}회 (목표 4회+)`);
  console.log(`[QC] 완전체키워드(지역+진료): ${fullCount}`);
  console.log(`[QC] 글자수: ${charCount}`);
  console.log(`[QC] 소요시간: ${elapsed}초 (단일 호출)`);

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const resultMarkdown = result;                          // 마크다운 원본 보존
  result = stripMarkdownForNaver(result);                 // 네이버 복사용 평문
  const charCountPlain = calcFamilyCharCount(result);

  return res.status(200).json({
    success: true,
    text: result,
    textMarkdown: resultMarkdown,
    charCount: charCountPlain,
    qc: { hasInfoBlock, hasExamValue, kwCount, regionPlusNameCount: finalRegionPlusNameCount },
  });
}

// ============================================================
// 글자수 계산
// ============================================================
function calcFamilyCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "").length;
}
