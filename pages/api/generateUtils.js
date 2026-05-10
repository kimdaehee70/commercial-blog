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
    (match, josak) => `${kw}${josak}`
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
export async function autoSave({ assembled, charCount, subKw, region, seoScore, industry }) {
  try {
    if (seoScore > 0) {
      savePost({ text: assembled, charCount, keyword: subKw, region, score: seoScore, diagResult: null, industry });
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
