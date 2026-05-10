// pages/api/getPosts.js — commercial-blog clinic
// 저장된 글 목록 및 내용 읽기 API
// GET  /api/getPosts?type=best&keyword=병원놀이&limit=20  → 목록
// GET  /api/getPosts?file=20260422_083012_병원놀이_0점.json&type=best → 단일 글 내용

import fs   from "fs";
import path from "path";

const DIRS = {
  best:      path.join(process.cwd(), "data", "best_posts_clinic"),
  generated: path.join(process.cwd(), "data", "generated_posts_clinic"),
};

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { type = "best", keyword = "", file, limit = "20" } = req.query;
  const dir = DIRS[type] || DIRS.best;

  // ── 단일 파일 읽기 ──────────────────────────────────────────
  if (file) {
    try {
      const filePath = path.join(dir, file);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "파일 없음" });
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      return res.status(200).json({ success: true, post: data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── 목록 읽기 ───────────────────────────────────────────────
  try {
    if (!fs.existsSync(dir)) return res.status(200).json({ success: true, posts: [] });

    let files = fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .sort((a, b) => b.localeCompare(a)); // 최신순

    // 키워드 필터
    if (keyword) {
      files = files.filter(f => f.includes(keyword));
    }

    // limit 적용
    const maxCount = Math.min(parseInt(limit) || 20, 100);
    files = files.slice(0, maxCount);

    // 파일명에서 메타 파싱
    // 형식: 20260422_083012_병원놀이_94.5점.json
    const posts = files.map(filename => {
      const base    = filename.replace(".json", "");
      const parts   = base.split("_");
      const date    = parts[0] || "";
      const time    = parts[1] || "";
      const program = parts[2] || "unknown";
      const score   = parts[3] ? parseFloat(parts[3].replace("점", "")) : 0;

      // 날짜 포맷
      const dateStr = date.length === 8
        ? `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`
        : date;
      const timeStr = time.length === 6
        ? `${time.slice(0,2)}:${time.slice(2,4)}`
        : time;

      return { filename, program, score, date: dateStr, time: timeStr };
    });

    return res.status(200).json({ success: true, posts, total: posts.length });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
