// =============================================
// pages/api/generateFishing.js — 고패킹 생성 핸들러 (Commercial 이식)
// 원본: 반장 pages/api/fishing-generate.js
// 1차 변형 금지: 생성로직·프롬프트·QC(removeBanned/calcCharCount) 무변형 보존.
//   환경대응만 교체:
//   ① 공통 LLM 통일      : new OpenAI → generateUtils.openai (gpt-4o 그대로)
//   ② Commercial 파이프라인: 결과 저장을 autoSave({...industry:'fishing'}) 1콜로
//   ③ locationBlock 후단  : 위치 5필드 수신 → insertLocationBeforeHashtags 1줄
//   ④ FISHING 게이트       : engineBootstrap register('fishing', handleFishing)
//   ⑤ 반환 10필드          : text/textMarkdown/content 3종 동시 + 메타
// industry: fishing | 단일호출형 (playConfig DEAD)
// =============================================

import { openai, autoSave } from "./generateUtils";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
import {
  buildMethodPrompt,
  buildAnalysisPrompt,
  buildComparePrompt,
  buildCatchPrompt,
  buildReviewPrompt,
  buildGuidePrompt,
  FISHING_BANNED,
} from "../../lib/fishing-prompts";

// ── QC: 금칙어 제거 (반장 원본 무변형) ───────────────
function removeBanned(text) {
  let result = text;
  FISHING_BANNED.forEach((word) => {
    result = result.replace(new RegExp(word, "g"), "");
  });
  return result;
}

// ── 글자수 계산 (반장 원본 무변형) ───────────────────
function calcCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")
    .replace(/\s/g, "")
    .length;
}

// ── 핸들러 본체 ───────────────────────────────────────
export async function handleFishing(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    type,
    // ── 위치 5필드(PATCH-07) ──
    address, map_guide, transit, building_desc, parking_info,
    ...data
  } = req.body;

  if (!type) return res.status(400).json({ error: "type이 필요합니다." });

  const _locStore = { address, map_guide, transit, building_desc, parking_info };

  try {
    let prompt;
    switch (type) {
      case "method":   prompt = buildMethodPrompt(data);   break;
      case "analysis": prompt = buildAnalysisPrompt(data); break;
      case "compare":  prompt = buildComparePrompt(data);  break;
      case "catch":    prompt = buildCatchPrompt(data);    break;
      case "review":   prompt = buildReviewPrompt(data);   break;
      case "guide":    prompt = buildGuidePrompt(data);    break;
      default:
        return res.status(400).json({ error: "잘못된 type입니다." });
    }

    console.log(`[fishing] type:${type} / ${prompt.length}자`);

    // ① 공통 LLM 통일 (gpt-4o 하드코딩 그대로)
    const message = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    let out = message.choices?.[0]?.message?.content || "";
    out = removeBanned(out);

    // ③ locationBlock 후단 1줄 (발행코치=삽입 / 일반글쓰기 빈값=원문 그대로)
    out = insertLocationBeforeHashtags(out, _locStore);

    const charCount = calcCharCount(out);
    console.log(`[fishing] 완료: ${charCount}자`);

    const hashtagMatch = out.match(/(#\S+[\s\t]*){3,}/gm);
    const hashtags = hashtagMatch
      ? hashtagMatch[hashtagMatch.length - 1].trim()
      : "";

    // ② Commercial 파이프라인 — autoSave 1콜
    try {
      await autoSave({
        industry: "fishing",
        type,
        text: out,
        charCount,
      });
    } catch (saveErr) {
      console.error("[fishing] autoSave 실패(비차단):", saveErr.message);
    }

    // ⑤ 반환 10필드 — text/textMarkdown/content 3종 동시
    return res.status(200).json({
      text: out,
      textMarkdown: out,
      content: out,
      hashtags,
      charCount,
      type,
      industry: "fishing",
      seoScore: null,
      diagResult: null,
      saved: true,
    });
  } catch (e) {
    console.error("[fishing] 오류:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

// 기존 라우트 호환 (직접 호출 경로 유지)
export default handleFishing;
