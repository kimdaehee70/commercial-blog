// pages/api/analyze.js
// 사진 분석 API (GPT-4o Vision)

import OpenAI from "openai";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images } = req.body; // base64 배열
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "이미지가 없습니다." });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const imageContents = images.slice(0, 5).map(b64 => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "low" },
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            {
              type: "text",
              text: `이 행사 사진들을 보고 블로그 글에 그대로 쓸 수 있는 현장 묘사를 작성해주세요.

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
- 블로그 본문에 바로 쓸 수 있는 수준으로 작성`,
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      analysis: completion.choices[0].message.content,
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: err.message || "사진 분석 중 오류가 발생했습니다." });
  }
}
