// pages/api/diagnose.js — commercial-blog clinic
// 블로그 SEO 진단 API

import OpenAI from "openai";
import { extractAndSavePattern } from "../../lib/extractPattern";
import { savePost } from "../../lib/savePost";
// buildDiagnosisPrompt — clinic-prompts에 없으므로 직접 정의
import { calcImageScore } from "../../lib/imageScore";
import { scoreToPercent, calcScoreChange } from "../../lib/scoreToPercent";

// ── SEO 진단 프롬프트 (업종 공통) ────────────────────────────
function buildDiagnosisPrompt(blogText) {
  return `아래 블로그 글을 네이버 SEO 기준으로 분석해주세요.

【분석 글】
${blogText.slice(0, 4000)}

【평가 항목 및 배점】
- titleScore (10점): 지역+시술+의도 포함 여부
- keywordScore (20점): 핵심 키워드 자연 삽입 (3~8회)
- duplicateScore (10점): 문장/표현 반복 없음
- structureScore (15점): 6섹션 흐름 (고민→상황→상담→선택→결과→정리)
- hashtagScore (10점): 관련 해시태그 5개 이상
- ctaScore (10점): 전환 유도 문장 포함
- closingScore (15점): 추천 대상 + 자연스러운 마무리
- charScore (10점): 2000자 이상

【출력 — JSON만, 다른 텍스트 없음】
{
  "totalScore": 0,
  "titleScore": 0, "titleComment": "",
  "keywordScore": 0, "keywordComment": "",
  "duplicateScore": 0, "duplicateComment": "",
  "structureScore": 0, "structureComment": "",
  "hashtagScore": 0, "hashtagComment": "",
  "ctaScore": 0, "ctaComment": "",
  "closingScore": 0, "closingComment": "",
  "charScore": 0,
  "improvements": ["개선점1", "개선점2", "개선점3"]
}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { blogText, imageCount: rawImageCount = 0, imageAlt: rawImageAlt = false, imageFilename = false } = req.body;

  if (!blogText || blogText.trim().length < 100) {
    return res.status(400).json({ error: "진단할 블로그 글을 입력해주세요." });
  }

  // ── 이미지 정보 자동 감지 ────────────────────────────────────
  // [이미지: ALT텍스트] 패턴을 blogText에서 직접 파싱
  const imgMatches = blogText.match(/\[이미지:\s*([^\]]+)\]/g) || [];
  const autoImageCount = imgMatches.length;
  // ALT가 5자 이상이면 의미있는 ALT로 판단
  const autoImageAlt = imgMatches.some(m => {
    const alt = m.replace(/\[이미지:\s*/, "").replace(/\]$/, "").trim();
    return alt.length >= 5;
  });

  // 수동 입력값이 있으면 우선, 없으면 자동 감지값 사용
  const imageCount = rawImageCount > 0 ? rawImageCount : autoImageCount;
  const imageAlt   = rawImageAlt || autoImageAlt;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2500,
      temperature: 0.3,
      messages: [
        { role: "user", content: buildDiagnosisPrompt(blogText) },
      ],
    });

    let raw = completion.choices[0].message.content || "";
    // JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");
    const result = JSON.parse(jsonMatch[0]);

    // ── 글자수 재계산 (서버 직접 계산 — GPT 값 사용 안 함) ──
    // generate.js와 동일 기준: 이미지태그 + 해시태그 + ## + 공백 제거
    const charCountNoSpace = blogText
      .replace(/\[이미지:[^\]]*\]/g, "")   // 이미지 태그 제거
      .replace(/^#.*$/gm, "")              // 해시태그 줄 전체 제거 (줄 기준)
      .replace(/^HASHTAGS:.+$/gm, "")      // HASHTAGS: 줄 제거
      .replace(/^##\s*/gm, "")             // ## 기호 제거 (텍스트 유지)
      .replace(/\s/g, "")                  // 공백 제거
      .length;

    result.charCount  = charCountNoSpace;
    result.charStatus = charCountNoSpace >= 2500 ? "pass" : charCountNoSpace >= 2000 ? "warn" : "fail";
    result.charComment =
      charCountNoSpace >= 2500
        ? `${charCountNoSpace.toLocaleString()}자로 네이버 상단 노출에 매우 적합합니다! ✅`
        : charCountNoSpace >= 2000
        ? `현재 ${charCountNoSpace.toLocaleString()}자입니다. 2,500자 이상이면 더 좋습니다. ⚠️`
        : charCountNoSpace >= 1500
        ? `현재 ${charCountNoSpace.toLocaleString()}자입니다. 2,000자 이상으로 늘려주세요. ❌`
        : `현재 ${charCountNoSpace.toLocaleString()}자로 많이 부족합니다. 2,500자 이상 필요합니다. ❌`;

    // ★ charScore 서버 계산값으로 강제 덮어쓰기 (GPT 값 무시)
    result.charScore =
      charCountNoSpace >= 2500 ? 100 :
      charCountNoSpace >= 2000 ? 70  :
      charCountNoSpace >= 1500 ? 45  : 20;

    // ── 이미지 점수 계산 ──────────────────────────────
    const imgResult = calcImageScore({
      count:    Number(imageCount),
      alt:      Boolean(imageAlt),
      filename: Boolean(imageFilename),
    });

    result.imageScore    = imgResult.totalScore;
    result.imageStatus   = imgResult.status === "none" ? "fail"
                         : imgResult.status === "pass" ? "pass"
                         : imgResult.status === "warn" ? "warn" : "fail";
    result.imageComment  = imgResult.comment;
    result.imageDetail   = imgResult;

    // ── 총점 완전 재계산 (GPT totalScore 기반 탈피) ──────────
    // 가중치: 제목10 + 키워드20 + 중복10 + 구조15 + 해시태그10 + CTA10 + 마무리15 + 글자수10 + 이미지
    // GPT가 주는 글자수/이미지 점수는 버리고 서버 계산값으로 교체
    const GPT_WEIGHT_CHAR  = 0.10;  // GPT totalScore에서 글자수 기여분
    const GPT_WEIGHT_IMAGE = 0.20;  // GPT totalScore에서 이미지 기여분

    // GPT가 준 글자수·이미지 기여 제거 → 나머지 GPT 점수만 추출
    const gptCharContrib   = Math.round((result.charScore  ?? 20) * GPT_WEIGHT_CHAR);
    const gptImageContrib  = Math.round((result.imageScore ?? 10) * GPT_WEIGHT_IMAGE);
    const gptBaseScore     = Math.max(0, result.totalScore - gptCharContrib - gptImageContrib);

    // 서버 계산값으로 글자수·이미지 재합산
    const serverCharContrib  = Math.round(result.charScore * GPT_WEIGHT_CHAR);
    const serverImageContrib = imgResult.totalScore;
    result.totalScore = Math.min(gptBaseScore + serverCharContrib + serverImageContrib, 100);

    // ── 확률 계산 ─────────────────────────────────────
    const { percent, grade: pGrade, label: pLabel } = scoreToPercent(result.totalScore);
    result.exposurePercent = percent;
    result.exposureLabel   = pLabel;

    // ── 이미지 입력 전/후 변화 ────────────────────────
    const scoreWithoutImg = Math.max(0, result.totalScore - imgResult.totalScore);
    const change = calcScoreChange(scoreWithoutImg, imgResult.totalScore);
    result.scoreChange = change;
    // 예시 시뮬레이션: 이미지 5장 + Alt 적용 시 예상 점수
    const maxImgScore = calcImageScore({ count: 5, alt: true, filename: false });
    const maxChange   = calcScoreChange(scoreWithoutImg, maxImgScore.totalScore);
    result.maxImageScenario = {
      label:          "이미지 5장 + Alt 적용 시",
      imageScore:      maxImgScore.totalScore,
      totalScore:      Math.min(scoreWithoutImg + maxImgScore.totalScore, 100),
      exposurePercent: maxChange.percentAfter,
      scoreDiff:       maxChange.scoreDiff,
      percentDiff:     maxChange.percentDiff,
    };

    // ── 90점 이상 → 패턴 추출 + best_posts 저장 ──────────────
    if (result.totalScore >= 90) {
      // keyword 자동 추출 fallback — 프론트에서 안 넘긴 경우 blogText에서 감지
      const PROGRAM_KEYWORDS = [
        "자연유착쌍꺼풀", "자연유착", "쌍꺼풀",
        "실리프팅", "리프팅",
        "피코레이저", "레이저토닝",
        "눈성형", "코성형", "보톡스", "필러",
        "지방흡입", "윤곽주사", "울쎄라", "써마지",
      ];
      let keyword = req.body.keyword || "";
      if (!keyword) {
        const found = PROGRAM_KEYWORDS.find(k => blogText.includes(k));
        if (found) keyword = found;
      }
      const region  = req.body.region  || "";
      console.log(`[diagnose] ⭐ ${result.totalScore}점 — 패턴 추출 + 저장 트리거`);
      // 패턴 추출 (비동기)
      extractAndSavePattern(blogText, result, keyword).catch(e =>
        console.error("[diagnose] extractPattern 오류:", e.message)
      );
      // best_posts 저장
      try {
        savePost({
          text:      blogText,
          charCount: result.charCount,
          keyword,
          region,
          score:     result.totalScore,
          diagResult: result,
        });
      } catch (saveErr) {
        console.error("[diagnose] savePost 오류:", saveErr.message);
      }
    }

    return res.status(200).json({ success: true, result });

  } catch (err) {
    console.error("Diagnose error:", err);
    return res.status(500).json({ error: err.message || "진단 중 오류가 발생했습니다." });
  }
}
