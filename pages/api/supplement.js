// pages/api/supplement.js — commercial-blog clinic
// 재가공 API — 상담/선택/결과 강제

import OpenAI from "openai";

// ============================================================
// STEP 1: 코드 압축 — 중복·홍보·잘린 문장 전부 제거
// ============================================================

const REMOVE_KEYWORDS = [
  // 광고·홍보 계열
  "중요합니다", "확인하세요", "추천드립니다", "알아보세요",
  "최고의 병원", "검증된 의료진", "최첨단 장비", "업계 최고",
  "강력 추천", "놀라운 효과", "지금 바로 예약", "한정 이벤트",
  // 설명형 계열
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "이처럼", "자연스럽게 배우", "자연스럽게 익히",
  // 과장 계열
  "완전 대박", "인생 시술", "후회 제로", "100점 만점",
  "안 할 이유가 없다", "무조건 해야 한다",
  // 의학 단정 계열
  "효과가 확실합니다", "부작용 없습니다", "100% 안전합니다", "보장됩니다",
  // 홍보·CTA
  "문의", "예약", "신청", "www.", "010-",
];

function compressText(text) {
  const used = new Set();
  const fingerprints = new Set();

  return text
    .split("\n")
    .filter(line => {
      const s = line.trim();
      if (!s) return false;
      // 이미지·소제목·해시태그는 통과
      if (/^\[이미지:/.test(s) || /^##/.test(s) || /^#\S+/.test(s)) return true;

      // 1) 잘린 문장 제거
      if (
        /[하는하고이며하며하여을를은는]\s*$/.test(s) ||
        /기관\s*$/.test(s) || /자랑\s*$/.test(s) ||
        /원하는\s*$/.test(s) || /위한\s*$/.test(s) ||
        /중이라면\s*$/.test(s) || /계획\s*$/.test(s) ||
        (s.length < 8 && !/[.!?]$/.test(s))
      ) return false;

      // 2) 중복 키워드 문장 제거 (키워드별 1회 허용)
      for (const kw of REMOVE_KEYWORDS) {
        if (s.includes(kw)) {
          if (used.has(kw)) return false;
          used.add(kw);
          return true;
        }
      }

      // 3) 유사 문장 지문 제거 (앞 10자)
      const fp = s.replace(/\s/g, "").slice(0, 10);
      if (fp.length >= 7) {
        if (fingerprints.has(fp)) return false;
        fingerprints.add(fp);
      }

      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================================
// STEP 2: 골격 추출 — 현장 장면·에피소드·대사만 남김
// ============================================================

function extractSkeleton(text) {
  const skeleton = [];

  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;

    // 이미지·소제목·해시태그는 그대로 유지
    if (/^\[이미지:/.test(s) || /^##/.test(s) || /^#\S+/.test(s)) {
      skeleton.push(s); continue;
    }

    // 골격 단계 — 금지 키워드 포함 문장 완전 제거 (재작성 시 GPT가 새로 씀)
    let hasBanned = false;
    for (const kw of REMOVE_KEYWORDS) {
      if (s.includes(kw)) { hasBanned = true; break; }
    }
    if (hasBanned) continue;

    // 현장 가치 있는 줄만 추출
    const hasValue =
      s.includes('"') ||                                                    // 대사
      /달려|뛰어|집었|건넸|외쳤|말했|물었|웃|반짝|고민|선택/.test(s) ||  // 행동
      /가게|코너|기계|바구니|장바구니|모형|의상/.test(s) ||                // 현장 소품
      /민수|수진|재민|준호|지민|수아/.test(s) ||                            // 아이 이름
      /🎯|✅|🏫|👉/.test(s);                                               // 이모티콘 소제목

    if (hasValue) skeleton.push(s);
  }

  return skeleton.join("\n").trim();
}

// ============================================================
// STEP 3: GPT 재작성 프롬프트
// ============================================================

function buildRewritePrompt({ skeleton, diagResult, suppMemo, competitorData, originalCharCount, keyword }) {

  const failItems = [];
  const warnItems = [];
  [
    { label: "글자수",    status: diagResult?.charStatus,      comment: diagResult?.charComment },
    { label: "키워드",    status: diagResult?.keywordStatus,   comment: diagResult?.keywordComment },
    { label: "중복",      status: diagResult?.duplicateStatus, comment: diagResult?.duplicateComment },
    { label: "구조",      status: diagResult?.structureStatus, comment: diagResult?.structureComment },
  ].forEach(i => {
    if (i.status === "fail") failItems.push(`❌ ${i.label}: ${i.comment}`);
    else if (i.status === "warn") warnItems.push(`⚠️ ${i.label}: ${i.comment}`);
  });

  let compInfo = "";
  if (competitorData) {
    const { keyword, weaknesses = [], attackPoints = [] } = competitorData;
    const points = attackPoints.length ? attackPoints : weaknesses;
    compInfo = `
【경쟁 블로그 공략】
키워드: "${keyword}"
경쟁 글 약점 → 반드시 이것보다 잘 써라:
${points.slice(0, 3).map(p => `  · ${p}`).join("\n")}`;
  }

  const kw = keyword || "시술";
  return `당신은 성형외과·피부과 전환형 블로그 전문 작가입니다.
아래 [원문 골격]을 참고해서 완전히 새로운 전환형 블로그 글을 작성하세요.

【🔥 최우선 규칙】
① 글자수 2,500자 이상 — 절대 기준.
   → 골격: 약 \${originalCharCount}자 → 최소 3배 이상 확장
   → 각 문단 최소 5문장 이상

② 핵심 키워드 강제 삽입
   → "\${kw}" 최소 6회 이상 자연스럽게 포함
   → 키워드는 문단마다 1회씩 자연스럽게 배치

③ 문장 패턴 반복 절대 금지
   → "~했다" 3회 이상 연속 금지
   → "한편", "또한", "이날" 문장 시작 2회 이상 금지

【핵심 규칙】
- 골격 문장 복붙 금지 — 완전히 새 문장으로 재작성
- 단문 스타일 (한 문장 25자 이내)
- 리스트(①②③ / ✔ / -) 전부 금지
- 광고·홍보 표현 절대 금지
- 이미지 [이미지: Alt텍스트] 형식 5곳 이상

【절대 금지 표현】
❌ 중요합니다 / 확인하세요 / 추천드립니다 / 알아보세요
❌ 최고의 병원 / 검증된 의료진 / 놀라운 효과
❌ 완전 대박 / 인생 시술 / 후회 제로
→ 쓰고 싶으면 경험·감정·장면으로 대체

【🔥 반드시 포함할 4가지 — 없으면 실패】

1. 상담 장면 (300자 이상)
   → "상담실에서~" / "의사 선생님이~"
   → 따옴표 대화 최소 1개 포함
   → 비교 상황 포함 (다른 방법과 비교)

2. 선택 이유 (250자 이상)
   → 결정 순간 명확히: "그 말을 듣고 결심이 섰다"
   → 구체적 이유: "설명이 현실적이었다" / "과한 권유가 없었다"
   → 비교 탈락 흐름 포함

3. 결과 감정 (250자 이상)
   → "생각보다 자연스러웠다" / "처음 걱정보다 훨씬 편했다"
   → 변화 장면 포함: "거울을 봤는데" / "친구가 물어봤는데"
   → 솔직한 회복 과정 포함

4. 마무리 (100자 이상)
   → 경험 공유 형태로 자연스럽게
   → 키워드 자연 포함

\${failItems.length ? "【SEO 수정】\n" + failItems.join("\n") : ""}
\${warnItems.length ? "\n【개선 권장】\n" + warnItems.join("\n") : ""}
\${compInfo}
\${suppMemo ? "\n【추가 요청】\n" + suppMemo : ""}

【원문 골격 — 참고만, 복붙 금지】
\${skeleton}

【출력 구조 (반드시 이 순서로)】
# [제목 — 25~45자, 지역+시술명+결과 포함]

## 고민
[공감형 도입 — 고민 상황 묘사 / 150자 이상]

[이미지: Alt텍스트]

## 상황
[고민하게 된 계기 / 200자 이상]

[이미지: Alt텍스트]

## 상담
[상담 장면 + 따옴표 대화 + 비교 / 300자 이상]

[이미지: Alt텍스트]

## 선택
[선택 이유 + 결정 순간 + 비교 탈락 / 250자 이상]

[이미지: Alt텍스트]

## 결과
[변화 감정 + 회복 과정 솔직하게 / 250자 이상]

[이미지: Alt텍스트]

## 정리
[경험 공유 형태 마무리 / 100자 이상]

[해시태그 12개]`;
}

// ============================================================
// 메인 핸들러
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { originalText, diagResult, suppMemo, competitorData, keyword } = req.body;

  if (!originalText || originalText.trim().length < 100) {
    return res.status(400).json({ error: "재가공할 블로그 글을 입력해주세요." });
  }

  // ── STEP 1: 코드 압축 ────────────────────────────────────────
  const compressed = compressText(originalText);

  // ── STEP 2: 골격 추출 ───────────────────────────────────────
  const skeleton = extractSkeleton(compressed);
  const originalCharCount = skeleton.replace(/\s/g, "").length;

  // ── STEP 3: GPT 완전 재작성 ──────────────────────────────────
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const prompt = buildRewritePrompt({
      skeleton,
      diagResult,
      suppMemo,
      competitorData,
      originalCharCount,
      keyword,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",        // 재작성 품질 — 4o 사용
      max_tokens: 5000,
      temperature: 0.75,      // 창의적 재작성
      messages: [
        {
          role: "system",
          content: "성형외과·피부과 전환형 블로그 전문 작가. 경험형 단문 스타일. 상담·선택·결과 흐름 강제. 광고 표현 절대 금지. 복붙 금지.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = (completion.choices[0].message.content || "").trim();
    const charCount = text.replace(/\s/g, "").length;

    return res.status(200).json({
      success: true,
      text,
      charCount,
      competitorApplied:   !!competitorData,
      competitorKeyword:   competitorData?.keyword || null,
      attackPointsApplied: competitorData?.attackPoints || [],
      debug: {
        originalChars: originalText.replace(/\s/g, "").length,
        compressedChars: compressed.replace(/\s/g, "").length,
        skeletonChars: originalCharCount,
        rewrittenChars: charCount,
      },
    });

  } catch (err) {
    console.error("Supplement v4 error:", err);
    return res.status(500).json({ error: err.message || "재가공 중 오류가 발생했습니다." });
  }
}
