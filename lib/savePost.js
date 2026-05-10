// lib/savePost.js — commercial-blog clinic
// 생성글 저장
// generated_posts_clinic/ → 시술별 최근 10개만 유지 (자동 정리)
// best_posts_clinic/      → 90점 이상만 저장 (영구 보관)

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const GEN_DIR  = "generated_posts_clinic";
const BEST_DIR = "best_posts_clinic";

// 프로그램별 유지할 최대 파일 수
const MAX_PER_PROGRAM = 10;

// ── 프로그램별 오래된 파일 자동 정리 ─────────────────────────
// 파일명 형식: 날짜_시간_프로그램명_점수점.json
// → 같은 프로그램 파일이 MAX_PER_PROGRAM 초과 시 오래된 것부터 삭제
function cleanupByProgram(dir, keyword) {
  try {
    const kwClean = (keyword || "unknown").replace(/\s/g, "_").slice(0, 20);

    // 해당 프로그램 파일만 필터 (파일명에 keyword 포함된 것)
    const allFiles = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    const programFiles = allFiles
      .filter(f => f.includes(`_${kwClean}_`))
      .sort(); // 날짜 오름차순 (오래된 것이 앞)

    // 초과분 삭제 (오래된 것부터)
    const overCount = programFiles.length - MAX_PER_PROGRAM + 1; // +1: 지금 저장할 것 포함
    if (overCount > 0) {
      programFiles.slice(0, overCount).forEach(f => {
        try {
          fs.unlinkSync(path.join(dir, f));
          console.log(`[savePost] 🗑️ 정리: ${f}`);
        } catch {}
      });
    }
  } catch (e) {
    console.error("[savePost] cleanup 오류:", e.message);
  }
}

// ── 저장 ────────────────────────────────────────────────────
export function savePost({ text, charCount, keyword, region, score, diagResult }) {
  try {
    // 폴더 생성
    const genDir  = path.join(DATA_DIR, GEN_DIR);
    const bestDir = path.join(DATA_DIR, BEST_DIR);
    if (!fs.existsSync(genDir))  fs.mkdirSync(genDir,  { recursive: true });
    if (!fs.existsSync(bestDir)) fs.mkdirSync(bestDir, { recursive: true });

    // 파일명: 날짜_시간_키워드_점수.json
    const now      = new Date();
    const dateStr  = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr  = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const kwClean  = (keyword || "unknown").replace(/\s/g, "_").slice(0, 20);
    const filename = `${dateStr}_${timeStr}_${kwClean}_${score || 0}점.json`;

    const data = {
      savedAt:   now.toISOString(),
      keyword:   keyword || "",
      region:    region  || "",
      score:     score   || 0,
      charCount: charCount || 0,
      text,
      diagResult: diagResult || null,
    };

    // 0점 저장 방지 — 점수 계산 실패한 글은 저장하지 않음
    if ((score || 0) === 0) {
      console.log(`[savePost] ⚠️ 0점 저장 건너뜀: ${filename}`);
      return { success: false, error: "0점 저장 방지" };
    }

    // generated_posts — 저장 전 프로그램별 오래된 파일 정리
    cleanupByProgram(genDir, keyword);
    fs.writeFileSync(path.join(genDir, filename), JSON.stringify(data, null, 2), "utf-8");

    // 90점 이상이면 best_posts에도 저장 (정리 없이 영구 보관)
    if ((score || 0) >= 90) {
      fs.writeFileSync(path.join(bestDir, filename), JSON.stringify(data, null, 2), "utf-8");
      console.log(`[savePost] ⭐ best_posts 저장: ${filename}`);
    } else {
      console.log(`[savePost] generated_posts 저장: ${filename}`);
    }

    return { success: true, filename };

  } catch (e) {
    console.error("[savePost] 오류:", e.message);
    return { success: false, error: e.message };
  }
}
