// pages/api/getPatterns.js
// patterns.json을 읽어서 클라이언트에 반환
// KeywordPage의 패턴 현황 카드에서 사용

import { readPatternDB } from "../../lib/patternDB";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const db = readPatternDB();
    return res.status(200).json({ success: true, data: db });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
