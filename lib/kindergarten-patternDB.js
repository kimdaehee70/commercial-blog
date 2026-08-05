// lib/kindergarten-patternDB.js
// 유치원 엔진 전용 패턴 DB 읽기 / 쓰기 / 병합 (반장 원본 무변형 이식)
// 원본: 반장 lib/patternDB.js
// 격리: 저장 위치 data/kindergarten-patterns.json (Commercial 공용 patternDB.js 무오염)
//   - Commercial lib/patternDB.js(정적 헬퍼)와 별개. 충돌 없음.
//   - 다른 엔진(gopacking 등)도 동일 패턴으로 *-patternDB.js 독립 이식 가능.

import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "kindergarten-patterns.json");

// ── 기본 구조 ────────────────────────────────────────────────
const DEFAULT_DB = {
  version: 2,
  updatedAt: null,
  totalSaved: 0,
  patterns: {
    structures: [],
    sentences:  [],
    details:    [],
    openings:   [],
    closings:   [],
    keywords:   [],
  },
  // 프로그램별 패턴 (v2 — 프로그램 격리)
  programs: {},
};

// 프로그램별 기본 패턴 구조
function defaultProgramPatterns() {
  return {
    structures: [],
    sentences:  [],
    details:    [],
  };
}

// ── 카테고리별 최대 저장 수 (비율 강제) ─────────────────────
const MAX_PER_CATEGORY = {
  structures: 10,  // 구조 패턴 — 10개
  details:    30,  // 디테일   — 30개
  sentences:   4,  // 문장     — 최대 4개만 (과다 방지)
  openings:    0,  // 힌트 완전 차단
  closings:    0,  // 힌트 완전 차단
  keywords:    5,
};

// ── 읽기 ────────────────────────────────────────────────────
export function readPatternDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return { ...DEFAULT_DB };
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("[kindergarten-patternDB] 읽기 오류:", e.message);
    return { ...DEFAULT_DB };
  }
}

// ── 쓰기 ────────────────────────────────────────────────────
export function writePatternDB(db) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("[kindergarten-patternDB] 쓰기 오류:", e.message);
    return false;
  }
}

// ── 패턴 병합 저장 ───────────────────────────────────────────
// program: 프로그램명 (예: "병원놀이", "시장놀이") — 프로그램별 격리 저장
export function mergePatterns(newPatterns, program = "") {
  // [object Object] 키 방지 — program이 객체로 넘어올 경우 빈 문자열로 처리
  if (typeof program !== "string") {
    console.warn("[kindergarten-patternDB] program이 문자열이 아님 — 무시:", program);
    program = "";
  }
  program = program.trim();

  const db = readPatternDB();

  // ── 1) 공통 패턴 (기존 호환 유지) ──────────────────────────
  for (const key of Object.keys(newPatterns)) {
    const max = MAX_PER_CATEGORY[key] ?? 20;
    if (max === 0) continue;

    if (!db.patterns[key]) db.patterns[key] = [];
    const incoming = newPatterns[key] || [];

    for (const item of incoming) {
      if (item && !db.patterns[key].includes(item)) {
        db.patterns[key].unshift(item);
      }
    }
    db.patterns[key] = db.patterns[key].slice(0, max);
  }

  // ── 2) 프로그램별 격리 저장 (v2) ────────────────────────────
  if (program) {
    if (!db.programs) db.programs = {};
    if (!db.programs[program]) db.programs[program] = defaultProgramPatterns();

    const prog = db.programs[program];
    for (const key of ["structures", "details", "sentences"]) {
      // sentences는 프로그램별 2개, 공통도 2개 — 글 굳어짐 방지
      const max = key === "sentences" ? 2 : (MAX_PER_CATEGORY[key] ?? 20);
      if (!prog[key]) prog[key] = [];
      const incoming = newPatterns[key] || [];
      for (const item of incoming) {
        if (item && !prog[key].includes(item)) {
          prog[key].unshift(item);
        }
      }
      prog[key] = prog[key].slice(0, max);
    }
  }

  // 기존 sentences 초과분 정리
  if (db.patterns.sentences?.length > 4) {
    db.patterns.sentences = db.patterns.sentences.slice(0, 4);
  }
  db.patterns.openings = [];
  db.patterns.closings = [];

  db.updatedAt  = new Date().toISOString();
  db.totalSaved = (db.totalSaved || 0) + 1;

  writePatternDB(db);
  return db;
}
