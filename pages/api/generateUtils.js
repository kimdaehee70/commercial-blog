// ============================================================
// generateUtils.js — 업종 공통 유틸 (순수 함수만)
// ⚠️ 업종별 데이터/프롬프트/키워드는 절대 포함하지 않음
// ============================================================
import OpenAI from "openai";
import { savePost }              from "../../lib/savePost";
import { extractAndSavePattern } from "../../lib/extractPattern";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 글자수 계산 ───────────────────────────────────────────
export function calcCharCount(text) {
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "")
    .length;
}

// ── 중복 문장 제거 ────────────────────────────────────────
export function removeDuplicateSentences(text) {
  const lines = text.split("\n");
  const seen = new Set();
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[이미지:")) {
      result.push(line); continue;
    }
    const key = trimmed.replace(/\s/g, "");
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result.join("\n");
}

// ── 이미지 태그 제거 ─────────────────────────────────────
export function stripInlineImages(text) {
  return text.replace(/\[이미지:[^\]]*\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// ── 키워드 자연화 ─────────────────────────────────────────
// 주의: 정규식 오류로 키워드가 사라지는 버그 방지
// 조사 앞 공백만 있는 패턴(GPT가 키워드 삭제 시)을 복원
export function restoreKeyword(text, keyword) {
  if (!keyword || !text) return text;
  const kw = keyword.trim();
  if (!kw) return text;
  // 안전한 방식: 조사 단독 패턴만 처리 (공백+조사만 있는 경우)
  // 예: " 가 좋다" → "임플란트가 좋다"
  // 단, 이미 앞에 한글이 있으면 건드리지 않음
  const safe = text.replace(
    /(?<=[\s\n"'(｜]|^)(이|가|을|를|은|는|도|로|으로|와|과|의|에서|에게|에|랑|까지|부터|만|처럼|보다)(?=[\s,.]|$)/gm,
    (match, josak, offset, str) => {
      // [v3.9.3 방어] "이 치료"/"이 방법" placeholder의 "이"를 조사로 오인 방지.
      //   "이" 뒤 공백+치료/방법/병원/진료면 지시관형사 → 복원 제외.
      if (josak === "이") {
        const after = str.slice(offset + 1).match(/^\s+(치료|방법|병원|진료|치과|한의원)/);
        if (after) return match;
      }
      return `${kw}${josak}`;
    }
  );

  // [축2 / v3.9.3] 접미어=치료 키워드 접두부 복원 — 문두(줄 시작) 한정
  //   사유: subKw가 "…치료"로 끝나는데(체외충격파치료 등) GPT가 접두부를
  //         떼고 "치료"만 출력한 경우 완전 키워드로 승격.
  //   ⚠️ 범위 제한 원칙(FREEZE): 문맥 없이 bare "치료"가 일반어("환자 치료",
  //      "적절한 치료")인지 축약형인지 구분 불가 → 오탐 방지 위해
  //      "줄 시작 + 치료 + 주격/주제 조사(은/는/이/가)" 패턴으로만 제한.
  //      (블로그 문단 첫 문장이 키워드 주어로 시작하는 전형 패턴만 복원)
  if (/치료$/.test(kw) && kw !== "치료") {
    const re = /^(\s*)치료(은|는|이|가)(?=[\s,.])/gm;
    return safe
      .replace(re, (m, sp, josak) => `${sp}${kw}${josak}`)
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return safe.replace(/\n{3,}/g, "\n\n").trim();
}

// ── 키워드 자연화 V2 (정보형 병원군 전용) ─────────────────
// 병원군 One Axis 축. 기존 restoreKeyword(FREEZE)와 분리된 신규 함수.
//   [배경] 기존 restoreKeyword는 후기형 업종(임플란트 등 키워드 누락 잦음)용.
//          정보형 병원군은 GPT가 키워드를 거의 누락하지 않는 반면,
//          지시관형사 "이 과정 / 이 검사 / 이 진료"를 정상 생성 →
//          기존 함수가 단독 "이"를 조사로 오인해 "장염이 과정에서" 파괴.
//   [V2 정책]
//    ① 비교격 '보다' 조사 목록에서 제외 (「열성경련보다 정확한」 오탐 원천 차단)
//    ② '이' 뒤가 "공백+한글" 이면 지시관형사로 간주 → 복원 제외
//       (기존은 치료/방법/병원/진료/치과/한의원 6단어만 예외 → 과정/검사 등 무방비)
//    ③ 순수 공백·줄시작 뒤 단독 조사 복원 금지. 키워드 자리표시("' ( ｜)
//       직후일 때만 복원 — 정보형은 명시적 누락만 복구.
//   ⚠️ 정보형 진료과 핸들러에서만 restoreKeyword 대신 이 함수 호출.
//      후기형 업종은 기존 restoreKeyword 유지 (회귀 방지).
export function restoreKeywordV2(text, keyword) {
  if (!keyword || !text) return text;
  const kw = keyword.trim();
  if (!kw) return text;

  // '보다' 제외한 조사 목록
  const JOSA = "이|가|을|를|은|는|도|로|으로|와|과|의|에서|에게|에|랑|까지|부터|만|처럼";

  const safe = text.replace(
    new RegExp(`(?<=[\\s\\n"'(｜]|^)(${JOSA})(?=[\\s,.]|$)`, "gm"),
    (match, josak, offset, str) => {
      // [가드1] '이' + 공백 + 한글 → 지시관형사(이 과정/이 검사/이 진료) → 복원 제외
      if (josak === "이") {
        const after = str.slice(offset + 1);
        if (/^\s+[가-힣]/.test(after)) return match;
      }
      // [가드2] 키워드 자리표시(따옴표/괄호/｜) 직후일 때만 복원 허용.
      //   순수 공백·줄시작 뒤 단독 조사는 정보형에선 오탐 위험 → 복원 제외.
      const prevCh = str.slice(0, offset).slice(-1);
      if (!/["'(｜]/.test(prevCh)) return match;
      return `${kw}${josak}`;
    }
  );
  return safe.replace(/\n{3,}/g, "\n\n").trim();
}

// ── SEO 진단 ─────────────────────────────────────────────
export function diagnosePost(text, keyword) {
  let score = 60;
  const cc = calcCharCount(text);
  if (cc >= 2500) score += 15;
  else if (cc >= 2000) score += 10;
  else if (cc >= 1500) score += 5;
  const kwCount = (text.match(new RegExp(keyword.replace(/\s/g, ""), "g")) || []).length;
  if (kwCount >= 6) score += 10; else if (kwCount >= 3) score += 5;
  if (text.includes('"')) score += 5;
  if (text.includes("상담")) score += 5;
  if (text.includes("선택")) score += 5;
  return Math.min(score, 100);
}

// ── 빈 섹션 재생성 공통 로직 ─────────────────────────────
export async function generateSection({ systemPrompt, userPrompt, temperature = 0.68 }) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt },
    ],
  });
  return (res.choices[0].message.content || "").trim();
}

// ── 자동 저장 공통 로직 ──────────────────────────────────
// storeId: Phase F-1 듀얼 라이트용 옵셔널. 없으면 Supabase echo skip.
export async function autoSave({ assembled, charCount, subKw, region, seoScore, industry, storeId, familyId, diagResult }) {
  try {
    if (seoScore > 0) {
      savePost({ text: assembled, charCount, keyword: subKw, region, score: seoScore, diagResult: diagResult || null, industry, storeId, familyId });
      if (seoScore >= 90) {
        extractAndSavePattern(assembled, { totalScore: seoScore }, subKw)
          .then(p => p && console.log(`[${industry}] 패턴 추출: ${subKw}`))
          .catch(e => console.error(`[${industry}] 패턴 오류:`, e.message));
      }
    }
  } catch (saveErr) {
    console.error(`[${industry}] savePost 오류:`, saveErr.message);
  }
}
