// pages/api/admin/missing-audit.js
// 누락 감사 — 생성된 우수글(best_posts) ↔ 발행 기록(publish_history) 대조
//
// 철학: 자동 기록 ≠ 자동 발행.
//   이 API는 read-only. publish_history에 INSERT 하지 않는다.
//   "생성됐지만 발행 기록이 없는 글"을 보여주기만 한다(관측).
//
// 동작:
//   1) data/best_posts_{업종}/ 폴더 전부 스캔 (업종 자동 감지)
//   2) 각 json: savedAt·keyword·region·score + text 첫 # 줄에서 title 추출
//   3) publish_history 전체 title SELECT (read-only)
//   4) 정규화(trim·소문자·공백/특수문자 제거) 후 대조
//   5) 업종별 요약 + 미등록 후보 리스트 반환
//
// freeze 경계: 발행 spine(publish.js/publish-secure.js) 무관. DB는 SELECT만.

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { requireOwner } from "../../../lib/guards";

// ── 제목 정규화 (제목 수정 이력 흡수) ──
function normalizeTitle(s) {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, "")          // 모든 공백 제거
    .replace(/[|｜·・,.!?~\-–—()[\]{}'"“”‘’]/g, "") // 흔한 구분/특수문자 제거
    .trim();
}

// ── text 본문에서 # 제목 추출 (index.js 발행 핸들러와 동일 방식) ──
function extractTitle(text) {
  if (!text) return "";
  const m = String(text).match(/^#{1,6}\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

// ── 파일명 파싱: 20260527_185504_임플란트_95점.json ──
function parseFilename(fname) {
  const base = fname.replace(/\.json$/i, "");
  const parts = base.split("_");
  // [날짜, 시각, ...키워드, 점수표기]
  const date = parts[0] || "";
  const time = parts[1] || "";
  const scoreToken = parts[parts.length - 1] || "";
  const scoreMatch = scoreToken.match(/(\d+)/);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;
  const keyword = parts.slice(2, parts.length - 1).join("_");
  // 날짜 표기 정리: 20260527 → 2026-05-27
  let dateFmt = date;
  if (/^\d{8}$/.test(date)) {
    dateFmt = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  let timeFmt = time;
  if (/^\d{6}$/.test(time)) {
    timeFmt = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
  }
  return { date: dateFmt, time: timeFmt, keyword, score };
}

export default async function handler(req, res) {
  // ── 가드 (requireOwner 통일 — 96차 권한 감사) ──
  const user = await requireOwner(req, res);
  if (!user) return; // res 이미 전송됨 (401/403)

  try {
    // ── 1. best_posts_* 폴더 스캔 ──
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      return res.status(200).json({
        ok: true,
        warning: "data 폴더 없음",
        summary: [],
        missing: [],
      });
    }

    // best_posts_{업종} 폴더만 (generated_posts_* 는 draft·실험 포함이라 제외)
    const folders = fs
      .readdirSync(dataDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("best_posts_"))
      .map((d) => d.name);

    // 모든 우수글 메타 수집
    const posts = []; // { industry, file, title, normTitle, keyword, region, score, savedAt, date, time }
    for (const folder of folders) {
      const industry = folder.replace(/^best_posts_/, "");
      const folderPath = path.join(dataDir, folder);
      let files = [];
      try {
        files = fs.readdirSync(folderPath).filter((f) => f.toLowerCase().endsWith(".json"));
      } catch (_) {
        continue;
      }
      for (const file of files) {
        const fp = path.join(folderPath, file);
        let json = {};
        try {
          json = JSON.parse(fs.readFileSync(fp, "utf8"));
        } catch (_) {
          // 깨진 파일은 title 못 뽑아도 파일명 정보는 남김
        }
        const parsed = parseFilename(file);
        const title = extractTitle(json.text) || "";
        posts.push({
          industry,
          file,
          title,
          normTitle: normalizeTitle(title),
          keyword: json.keyword || parsed.keyword || "",
          region: json.region || "",
          score: json.score != null ? json.score : parsed.score,
          savedAt: json.savedAt || null,
          date: parsed.date,
          time: parsed.time,
        });
      }
    }

    // ── 2. publish_history 전체 title SELECT (read-only) ──
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ ok: false, error: "Supabase env 누락" });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    const { data: rows, error } = await supabase
      .from("publish_history")
      .select("title, region, keyword, blog_account, naver_post_url, published_at");

    if (error) {
      console.error("[missing-audit] select error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // 발행된 제목 정규화 Set + (보조) 지역+키워드 Set
    const publishedNorm = new Set();
    (rows || []).forEach((r) => {
      if (r.title) publishedNorm.add(normalizeTitle(r.title));
    });

    // ── 3. 대조: 우수글 title 이 발행 기록에 있나 ──
    const missing = [];
    const matched = [];
    for (const p of posts) {
      const isPublished = p.normTitle && publishedNorm.has(p.normTitle);
      if (isPublished) matched.push(p);
      else missing.push(p);
    }

    // ── 4. 업종별 요약 ──
    const byIndustry = {};
    for (const p of posts) {
      const k = p.industry;
      if (!byIndustry[k]) byIndustry[k] = { industry: k, total: 0, registered: 0, missing: 0 };
      byIndustry[k].total += 1;
      if (p.normTitle && publishedNorm.has(p.normTitle)) byIndustry[k].registered += 1;
      else byIndustry[k].missing += 1;
    }

    // 미등록: 최신순 (savedAt → date+time)
    missing.sort((a, b) => {
      const ka = a.savedAt || `${a.date} ${a.time}`;
      const kb = b.savedAt || `${b.date} ${b.time}`;
      return kb.localeCompare(ka);
    });

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      totals: {
        bestPosts: posts.length,
        registered: matched.length,
        missing: missing.length,
        publishHistoryRows: (rows || []).length,
      },
      summary: Object.values(byIndustry).sort((a, b) => b.missing - a.missing),
      missing: missing.map((p) => ({
        industry: p.industry,
        file: p.file,
        title: p.title || "(제목 추출 실패)",
        keyword: p.keyword,
        region: p.region,
        score: p.score,
        date: p.date,
        time: p.time,
      })),
    });
  } catch (e) {
    console.error("[missing-audit] 예외:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
