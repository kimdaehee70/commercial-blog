// pages/api/analyze.js
// 사진 분석 API (GPT-4o Vision)
// v2.0 (2026-05-13) — industry 분기 / commercial scene extraction 추가
// 반환: { success, photoContext }  (구버전 호환: analysis 키도 함께 반환)

import OpenAI from "openai";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

// ─────────────────────────────────────────────────────────
// 업종별 scene 추출 프롬프트
// ─────────────────────────────────────────────────────────
function buildScenePrompt(industry, treatmentName, region) {
  const tn = (treatmentName || "").trim();
  const rg = (region || "").trim();

  // ─── 의료 업종 (병원 계열) ───
  const MEDICAL = new Set([
    "clinic", "derma", "dental", "ent", "urology", "oriental",
    "ortho", "pediatrics", "gastro", "general", "obgyn",
    "pain", "neuro", "psy", "eye", "family",
  ]);

  if (MEDICAL.has(industry)) {
    return [
      `이 사진들에서 ${tn ? `'${tn}' ` : ""}현장의 분위기·디테일만 추출해 주세요. 블로그 본문에 직접 인용되는 글이 아니라, 작성자가 참고할 "현장 단서 메모"입니다.`,
      ``,
      `[추출 항목 — 보이는 것만, 추측 금지]`,
      `1. 공간 분위기: 채광, 색감, 인테리어 톤, 가구 배치`,
      `2. 장비·기기: 형태·색·배치 (구체 제품명·브랜드 절대 금지 — "레이저 장비", "초음파 기기" 수준)`,
      `3. 소품·도구: 시술 도구, 일회용품, 보호장구, 상담 자료 등 (일반화하여 묘사)`,
      `4. 동선·구조: 대기실→상담실→시술실 흐름 단서가 보이면 한 줄`,
      `5. 시점 단서: 사진이 시술 전·중·후 중 어디로 보이는지 (확신 없으면 생략)`,
      ``,
      `[절대 금지]`,
      `- 병원 이름, 간판, 로고, 상호 인식·언급`,
      `- 환자/의료진 식별 정보 (얼굴 묘사, 인상 평가, 외모 언급)`,
      `- "친절", "전문", "최신식", "고급", "프리미엄" 등 평가 형용사`,
      `- "추천", "꼭 가보세요", "강추" 등 광고 표현`,
      `- 효과 단정 ("완벽", "100%", "확실히")`,
      `- 가격·비용 직접 언급`,
      ``,
      `[출력 형식]`,
      `- 한 줄씩 단문으로, 3~7개 항목`,
      `- 전체 300~500자`,
      `- 보이지 않는 항목은 생략 (억지 작성 금지)`,
      `- 평어체 ("~된다", "~으로 보인다")`,
    ].join("\n");
  }

  // ─── 카페·식당 계열 ───
  if (industry === "cafe" || industry === "restaurant") {
    return [
      `이 사진들에서 ${tn ? `'${tn}' ` : ""}매장의 분위기·디테일만 추출해 주세요. 본문에 직접 인용되지 않는 "현장 단서 메모"입니다.`,
      ``,
      `[추출 항목 — 보이는 것만]`,
      `1. 공간 분위기: 조명, 좌석 배치, 인테리어 톤, 창·천장 단서`,
      `2. 메뉴·플레이팅: 그릇, 비주얼, 색감, 양 (구체 메뉴명 추정 금지)`,
      `3. 동행·테이블 단서: 옆 테이블 분위기, 좌석 종류 (1인석/단체석)`,
      `4. 시간대·날씨 단서: 자연광/조명, 창밖, 옷차림`,
      `5. 특이 디테일: 눈에 띄는 소품, 굿즈, 손글씨 메뉴판 등`,
      ``,
      `[절대 금지]`,
      `- 매장 이름, 간판, 로고, 상호 인식·언급`,
      `- "맛집", "강추", "찐맛집", "원조", "꼭 가보세요" 등 광고 표현`,
      `- "최고", "역대급", "인생" 등 단정 표현`,
      ``,
      `[출력 형식]`,
      `- 한 줄씩 단문으로, 3~7개 항목`,
      `- 전체 300~500자`,
      `- 평어체`,
    ].join("\n");
  }

  // ─── 유치원 행사 (legacy) ───
  if (industry === "kindergarten" || industry === "banjang") {
    return `이 행사 사진들을 보고 블로그 글에 그대로 쓸 수 있는 현장 묘사를 작성해주세요.

아래 순서로 작성합니다:

1. 공간 구성 — 강당/교실이 어떻게 꾸며져 있는지, 코너 배치와 동선 흐름
2. 아이들 첫 반응 — 입장 순간 행동, 표정, 움직임
3. 코너별 장면 — 각 코너에서 아이들이 하는 행동 (최소 3개 코너)
4. 특징적인 순간 — 눈에 띄는 소품, 장비, 상황
5. 분위기 — 현장 전체 에너지, 소리, 감정

규칙:
- 최소 5문장 이상
- 설명형 금지 (좋다/의미있다 금지)
- 아이 행동과 반응 중심
- 자연스럽게 이어지는 문장으로 작성
- 블로그 본문에 바로 쓸 수 있는 수준으로 작성`;
  }

  // ─── 기본 (general scene) ───
  return [
    `이 사진들에서 현장의 분위기·디테일만 추출해 주세요. 작성자가 참고할 "현장 단서 메모"입니다.`,
    ``,
    `[추출 항목]`,
    `1. 공간 분위기 (조명, 색감, 배치)`,
    `2. 소품·도구 (구체적 브랜드명 금지)`,
    `3. 시점·상황 단서`,
    ``,
    `[금지]`,
    `- 상호·간판·로고 인식`,
    `- 광고형 표현 ("최고", "강추", "꼭")`,
    `- 인물 외모 평가`,
    ``,
    `[출력]`,
    `- 한 줄씩 단문 3~6개, 전체 300~500자, 평어체`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────
// handler
// ─────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images, industry, treatmentName, region } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "이미지가 없습니다." });
  }

  // 1~3장 제한 (commercial 업종은 디테일 추출 목적이라 1~3장이 적절)
  const MAX_IMAGES = 3;
  const imageContents = images.slice(0, MAX_IMAGES).map(b64 => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "low" },
  }));

  const promptText = buildScenePrompt(industry, treatmentName, region);

  console.log(`[analyze] industry=${industry || "default"} | imgs=${imageContents.length} | treatment=${treatmentName || "-"}`);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            { type: "text", text: promptText },
          ],
        },
      ],
    });

    const photoContext = (completion.choices[0]?.message?.content || "").trim();

    console.log(`[analyze] photoContext: ${photoContext.length}자`);

    return res.status(200).json({
      success: true,
      photoContext,         // 새 키 (권장)
      analysis: photoContext, // 구버전 호환
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message || "사진 분석 중 오류가 발생했습니다." });
  }
}
