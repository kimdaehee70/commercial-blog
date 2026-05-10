// pages/api/image.js
// DALL-E 3 이미지 생성 API

import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "프롬프트가 없습니다." });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt + ", child-safe, no text overlay, photorealistic",
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    return res.status(200).json({
      success: true,
      url: response.data[0].url,
    });

  } catch (err) {
    console.error("Image gen error:", err);
    return res.status(500).json({ error: err.message || "이미지 생성 중 오류가 발생했습니다." });
  }
}
