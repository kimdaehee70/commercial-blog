// ============================================================
// pages/api/generateEye.js — 안과 전용 핸들러 v2.0
// 🚀 단일 호출 구조 (GPT 1번 호출 → 섹션 분리 후처리)
// ============================================================
import OpenAI from "openai";
import {
  EYE_SYSTEM_PROMPT,
  buildEyeFullPrompt,
  getEyeImageAlts,
} from "../../lib/eye-prompts";
import { EYE_TREATMENTS } from "../../lib/eye-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// 정보 비교 블럭 (결정 섹션 아래 자동 삽입)
// ============================================================
const INFO_BLOCKS = {
  lasik: `
| 비교 항목 | 라식 | 라섹 | 스마일라식 | ICL |
|----------|------|------|-----------|-----|
| 회복 기간 | 2~3일 | 1~2주 | 2~3일 | 1주 |
| 통증 | 낮음 | 중간 | 매우 낮음 | 낮음 |
| 각막 절개 | 큼 | 없음(레이저) | 최소 | 없음(렌즈 삽입) |
| 가역성 | 불가 | 불가 | 불가 | 가능(렌즈 제거) |
`,
  lasek: `
| 비교 항목 | 라섹 | 라식 | 스마일라식 |
|----------|------|------|-----------|
| 회복 기간 | 1~2주 | 2~3일 | 2~3일 |
| 각막 보존 | 높음 | 낮음 | 중간 |
| 충격 안정성 | 우수 | 보통 | 우수 |
| 통증 | 중간 | 낮음 | 매우 낮음 |
`,
  smile_lasik: `
| 비교 항목 | 스마일라식 | 라식 | 라섹 |
|----------|-----------|------|------|
| 절개 크기 | 최소 | 큼 | 없음 |
| 회복 기간 | 2~3일 | 2~3일 | 1~2주 |
| 안구건조 부담 | 낮음 | 중간 | 낮음 |
| 통증 | 매우 낮음 | 낮음 | 중간 |
`,
  icl: `
| 비교 항목 | ICL | 라식 | 라섹 |
|----------|------|------|------|
| 가역성 | 가능 | 불가 | 불가 |
| 고도근시 | 가능 | 제한 | 제한 |
| 각막 보존 | 높음 | 낮음 | 중간 |
| 비용 | 높음 | 중간 | 낮음 |
`,
  cataract: `
| 비교 항목 | 단초점렌즈 | 다초점렌즈 |
|----------|----------|----------|
| 가까운 시야 | 돋보기 필요 | 자연스럽게 보임 |
| 야간 빛번짐 | 적음 | 있을 수 있음 |
| 비용 | 보험 적용 | 비급여 추가 |
`,
  presbyopia: `
| 비교 항목 | 노안 교정 | 돋보기 | 다초점 안경 |
|----------|----------|--------|------------|
| 일상 편의 | 우수 | 번거로움 | 보통 |
| 시야 자연스러움 | 자연스러움 | 분리됨 | 적응 필요 |
| 비용 | 일회성 | 저렴 | 중간 |
`,
  dry_eye: `
| 비교 항목 | 인공눈물 | IPL 치료 | 마이봄샘 관리 |
|----------|---------|---------|------------|
| 즉각 효과 | 있음 | 1~2주 후 | 1~2주 후 |
| 근본 개선 | 어려움 | 좋음 | 좋음 |
| 횟수 | 매일 | 4~5회 | 정기 |
`,
};

// ============================================================
// 진료별 수치 데이터
// ============================================================
const EXAM_VALUES = {
  lasik:           { exam: "시력·안압·각막두께·각막지형도", recovery: "2~3일", pain: 2, cost: "150~250" },
  lasek:           { exam: "시력·안압·각막두께",           recovery: "1~2주", pain: 4, cost: "100~180" },
  smile_lasik:     { exam: "시력·안압·각막두께·각막지형도", recovery: "2~3일", pain: 1, cost: "250~350" },
  icl:             { exam: "시력·안압·전방깊이·각막내피세포", recovery: "3~7일", pain: 2, cost: "400~600" },
  cataract:        { exam: "시력·안압·안저·생체계측",      recovery: "1~2주", pain: 2, cost: "30~400" },
  presbyopia:      { exam: "시력·안압·각막지형도",         recovery: "1~2주", pain: 3, cost: "250~500" },
  retina:          { exam: "안저·OCT·시야검사",           recovery: "당일",   pain: 1, cost: "10~30" },
  glaucoma:        { exam: "안압·시야·OCT·시신경",        recovery: "정기",   pain: 1, cost: "5~20" },
  macular:         { exam: "안저·OCT·형광안저혈관조영",   recovery: "1주",    pain: 3, cost: "50~150" },
  diabetic_retina: { exam: "안저·OCT·형광안저혈관조영",   recovery: "정기",   pain: 1, cost: "10~50" },
  dry_eye:         { exam: "눈물막·마이봄샘·쉬르머검사",  recovery: "1~2주", pain: 2, cost: "10~50" },
  conjunctivitis:  { exam: "결막·각막 정밀검사",          recovery: "3~7일", pain: 2, cost: "5~10" },
  stye:            { exam: "눈꺼풀 정밀검사",             recovery: "3~5일", pain: 3, cost: "5~10" },
  strabismus:      { exam: "사시각·양안시·시력",          recovery: "1~2주", pain: 3, cost: "30~80" },
  myopia_control:  { exam: "시력·안축장·각막곡률",        recovery: "정기",   pain: 1, cost: "30~80" },
  amblyopia:       { exam: "시력·굴절·시기능",            recovery: "정기",   pain: 0, cost: "5~20" },
  eye_checkup:     { exam: "시력·안압·안저·OCT",          recovery: "당일",   pain: 0, cost: "5~15" },
};

// ============================================================
// 텍스트 후처리
// ============================================================
function cleanText(text, keyword, region) {
  let t = text;

  // 조사 오류
  t = t.replace(/안과를을/g, "안과를");
  t = t.replace(/안과을를/g, "안과를");
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

  // 키워드 반복 (4회 이상 → 일부 대체)
  if (keyword) {
    const kwClean = keyword.replace(/\s/g, "");
    const re = new RegExp(kwClean, "g");
    let count = 0;
    t = t.replace(re, (m) => {
      count++;
      if (count > 4) return "이 진료";
      return m;
    });
  }

  // 중간 해시태그 제거
  t = t.replace(/\n#[^\n#]+(?=\n)/g, "\n");

  return t;
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
// 수치 강제 삽입
// ============================================================
function injectExamValue(text, treatmentId) {
  const v = EXAM_VALUES[treatmentId];
  if (!v) return text;

  const hasNumber = /\d/.test(text);
  const hasCost = /(만원|비용|가격)/.test(text);
  if (hasNumber && hasCost) return text;

  const inject =
    "\n\n실제 검사 항목은 " + v.exam + " 중심으로 진행됐고, " +
    "회복 기간은 " + v.recovery + " 정도, 통증은 10점 기준 " + v.pain + "점 정도, " +
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
  // 섹션 중복
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

  // 문단 중복
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

  // 문장 중복
  t = t.replace(/([^.!?\n]{15,}[.!?])\s*\1/g, "$1");

  return t;
}

// ============================================================
// 이미지 ALT 섹션별 삽입
// ============================================================
function insertImageAlts(text, imageAlts) {
  let t = text;

  if (imageAlts.concern && !t.includes(imageAlts.concern)) {
    t = t.replace(/(## 고민[^\n]*\n)/, "$1\n" + imageAlts.concern + "\n\n");
  }
  if (imageAlts.search && !t.includes(imageAlts.search)) {
    t = t.replace(/(## 탐색[^\n]*\n)/, "$1\n" + imageAlts.search + "\n\n");
  }
  if (imageAlts.consult && !t.includes(imageAlts.consult)) {
    t = t.replace(/(## 상담[^\n]*\n)/, "$1\n" + imageAlts.consult + "\n\n");
  }
  if (imageAlts.result1 && !t.includes(imageAlts.result1)) {
    t = t.replace(/(### 1주[^\n]*\n)/, "$1\n" + imageAlts.result1 + "\n\n");
  }
  if (imageAlts.result2 && !t.includes(imageAlts.result2)) {
    t = t.replace(/(### 2주[^\n]*\n)/, "$1\n" + imageAlts.result2 + "\n\n");
  }
  if (imageAlts.result3 && !t.includes(imageAlts.result3)) {
    t = t.replace(/(### 1개월[^\n]*\n)/, "$1\n" + imageAlts.result3 + "\n\n");
  }

  return t;
}

// ============================================================
// 메인 핸들러 — 단일 호출 구조 v2.0
// ============================================================
export default async function handleEye(req, res) {
  const startTime = Date.now();
  const { program, region: regionInput, keyword: keywordInput } = req.body;
  const region = regionInput || "강남";

  // 진료 매칭
  const treatment =
    EYE_TREATMENTS.find((t) => t.id === program.id) ||
    EYE_TREATMENTS.find((t) => t.name === program.name) ||
    program;

  // 부위 키워드 감지
  const SITE_KEYWORDS = ["야간", "고도근시", "노안", "다초점", "안구건조", "사시", "약시"];
  const titleRaw = (keywordInput || "") + " " + (treatment.name || "");
  const detectedSite = SITE_KEYWORDS.find((s) => titleRaw.includes(s)) || "";
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

  // 후기 중복 제거
  finalTitle = finalTitle.replace(/(후기)([^후]*)(후기)/, "$1$2");
  // 진료명 중복 제거
  if (treatment.name && treatment.name.length >= 2) {
    const nameRe = new RegExp("(" + treatment.name + ")([^" + treatment.name.charAt(0) + "]+)\\1", "g");
    finalTitle = finalTitle.replace(nameRe, "$1$2");
  }

  console.log(`[eye] 제목: ${finalTitle} | 집중 키워드: ${activeKeyword}`);

  // ── 단일 호출 (GPT 1번) ──────────────────────────
  const fullPrompt =
    buildEyeFullPrompt(treatment, region) +
    "\n\n🔒 집중 키워드: \"" + activeKeyword + "\" 으로만 서술. 다른 부위·증상 혼용 금지." +
    "\n🔒 복합 키워드 필수: \"" + fullKeyword + "\" 본문에 3회 이상 자연스럽게 포함." +
    "\n🔒 제목은 절대 출력하지 마세요. ## 고민 부터 시작하세요." +
    "\n🔒 모든 섹션(고민·탐색·상담·결정·변화·마무리) 빠짐없이 ## 헤더로 작성." +
    "\n🔒 변화 섹션은 ### 1일 / ### 1주 / ### 2주 / ### 1개월 순서 고정.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EYE_SYSTEM_PROMPT },
      { role: "user", content: fullPrompt },
    ],
    temperature: 0.85,
    max_tokens: 2500,
  });

  let body = completion.choices[0].message.content || "";

  // 모델이 제목을 출력했을 경우 제거
  body = body.replace(/^#\s+[^\n]*\n+/, "");
  body = body.trim();

  // 최종 조립
  let result = "# " + finalTitle + "\n\n" + body;

  // ── 후처리 ────────────────────────────────────
  result = cleanText(result, activeKeyword, region);
  result = result.replace(/\n#[^\n#]+(?=\n)/g, "\n");
  result = insertInfoBlock(result, treatment.id);
  result = injectExamValue(result, treatment.id);
  result = removeDuplicates(result);

  const imageAlts = getEyeImageAlts(treatment, region, activeKeyword);
  result = insertImageAlts(result, imageAlts);

  // fullKeyword 3회 체크
  const fullCount = (result.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  if (fullCount < 3) {
    const closingIdx = result.lastIndexOf("## 마무리");
    if (closingIdx !== -1) {
      const inject = "\n\n" + fullKeyword + "을(를) 고민하시는 분들께 도움이 됐으면 해서 솔직하게 정리해봤어요.\n";
      result = result.slice(0, closingIdx) + inject + result.slice(closingIdx);
    } else {
      result += "\n\n" + fullKeyword + "을(를) 고민하시는 분들께 도움이 됐으면 해서 솔직하게 정리해봤어요.\n";
    }
  }

  // 마무리 이미지
  if (imageAlts.closing && !result.includes(imageAlts.closing)) {
    result += "\n\n" + imageAlts.closing + "\n";
  }

  // 해시태그
  const tags = [
    "#" + region + "안과",
    "#" + activeKeyword.replace(/\s/g, ""),
    "#" + treatment.name.replace(/\s/g, "") + "후기",
    "#" + region + treatment.name.replace(/\s/g, ""),
    "#안과후기",
    "#" + activeKeyword.replace(/\s/g, "") + "후기",
  ];
  result += "\n\n" + tags.join(" ");

  // ── QC 로그 ────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const infoOk  = !INFO_BLOCKS[treatment.id] || result.includes(INFO_BLOCKS[treatment.id].trim().split("\n")[0]);
  const numOk   = /\d/.test(result) && /(만원|비용|회복|통증)/.test(result);
  const kwClean = activeKeyword.replace(/\s/g, "");
  const kwCount = (result.match(new RegExp(kwClean, "g")) || []).length;

  console.log(`[QC] 정보블럭: ${infoOk}`);
  console.log(`[QC] 수치: ${numOk}`);
  console.log(`[QC] 키워드반복: ${kwCount}`);
  console.log(`[QC] 완전체키워드: ${fullCount}`);
  console.log(`[QC] 글자수: ${result.length}`);
  console.log(`[QC] 소요시간: ${elapsed}초 (단일 호출)`);

  return res.status(200).json({
    title: finalTitle,
    content: result,
    industry: "eye",
    treatment: treatment.name,
    region,
    length: result.length,
    elapsed: elapsed + "s",
  });
}
