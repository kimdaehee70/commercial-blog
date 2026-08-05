// lib/spine/sceneSpine.js
// Scene 공통 엔진 — 콘텐츠 없음. 기계(resolver / fallback / validation / 판단근거)만.
//   [세션60] *-data.js에 중복 존재하던 SCENE_SPINE 조회 로직을 단일화.
//   ★ 원칙: arrive/work 토큰은 업종 고유 자산 → lib/spine/scenes/*.js (콘텐츠 계층)
//           조회·폴백·검증·확장은 이 파일 (엔진 계층)
//   ★ 업종 간 토큰 공유 금지. 여기서 공통화되는 것은 '구조'이지 '동선'이 아니다.
//     (Naver 플랫폼 대응 지침 §전략2 — 구조 다양성 유지)

import pestcontrol from "./scenes/pestcontrol.js";
import buildingclean from "./scenes/buildingclean.js";
import cleaning from "./scenes/cleaning.js";
import moving from "./scenes/moving.js";
import interior from "./scenes/interior.js";
import grout from "./scenes/grout.js";
import coating from "./scenes/coating.js";
import systemair from "./scenes/systemair.js";
import airclean from "./scenes/airclean.js";
import screen from "./scenes/screen.js";
import dobae from "./scenes/dobae.js";
import flooring from "./scenes/flooring.js";
import film from "./scenes/film.js";
import door from "./scenes/door.js";

// ─────────────────────────────────────────────────────────────
// 레지스트리 — 신규 업종은 여기 1줄만 추가한다.
// ─────────────────────────────────────────────────────────────
const REGISTRY = {
  pestcontrol,
  buildingclean,
  cleaning,
  moving,
  interior,
  grout,
  coating,
  systemair,
  airclean,
  screen,
  dobae,
  flooring,
  film,
  door,
};

export function registerScenes(industry, mod) {
  REGISTRY[industry] = mod;
}

export function hasScenes(industry) {
  return !!REGISTRY[industry];
}

export function listSceneIndustries() {
  return Object.keys(REGISTRY);
}

// ─────────────────────────────────────────────────────────────
// 스키마
//   { arrive: string[], work: string[], basis?: Basis[] }
//   Basis = { 발견, 원인, 제약, 선택 }  ← STEP B 판단 근거 축. 없으면 무시(하위호환).
// ─────────────────────────────────────────────────────────────
const EMPTY = { arrive: [], work: [], basis: [] };

function normalize(entry) {
  if (!entry) return null;
  return {
    arrive: Array.isArray(entry.arrive) ? entry.arrive : [],
    work: Array.isArray(entry.work) ? entry.work : [],
    basis: Array.isArray(entry.basis) ? entry.basis : [],
  };
}

// ─────────────────────────────────────────────────────────────
// 조회 — 3단 폴백
//   ① industry + cat 정확 매칭
//   ② industry 기본 cat (scenes/*.js DEFAULT_CAT)
//   ③ 미등록 업종 → EMPTY (Scene 축 미사용. 프롬프트가 기존 설명형으로 축퇴)
//   ★ ③에서 타 업종 동선으로 폴백하지 않는다 — 업종 오염 차단.
// ─────────────────────────────────────────────────────────────
export function resolveScene(industry, cat) {
  const mod = REGISTRY[industry];
  if (!mod) return EMPTY;
  const table = mod.SCENES || {};
  return normalize(table[cat]) || normalize(table[mod.DEFAULT_CAT]) || EMPTY;
}

// 업종 고정 조회기 — *-data.js / *-prompts.js에서 기존 getSceneSpine(cat) 시그니처 유지용.
export function createSceneResolver(industry) {
  return function getSceneSpine(cat) {
    return resolveScene(industry, cat);
  };
}

// 업종 전체 테이블 (관리·검증 화면용)
export function getSceneTable(industry) {
  const mod = REGISTRY[industry];
  return mod ? mod.SCENES : {};
}

// ─────────────────────────────────────────────────────────────
// 판단 근거 축 (STEP B) — 발견 토큰에 필드를 붙인다. Spine 단계는 늘리지 않는다.
// ─────────────────────────────────────────────────────────────
export const BASIS_FIELDS = ["발견", "원인", "제약", "선택"];

export function getBasis(industry, cat) {
  return resolveScene(industry, cat).basis;
}

export function isValidBasis(b) {
  return !!b && BASIS_FIELDS.every((k) => typeof b[k] === "string" && b[k].trim());
}

// ─────────────────────────────────────────────────────────────
// 검증 — 신규 Scene 이식 시 스모크에서 호출. 런타임 경로 아님.
// ─────────────────────────────────────────────────────────────
export function validateScenes(industry, opts = {}) {
  const minArrive = opts.minArrive || 4;
  const minWork = opts.minWork || 5;
  const mod = REGISTRY[industry];
  const errors = [];
  if (!mod) return { ok: false, errors: [`미등록 업종: ${industry}`] };
  if (!mod.DEFAULT_CAT) errors.push("DEFAULT_CAT 없음");
  const table = mod.SCENES || {};
  const cats = Object.keys(table);
  if (!cats.length) errors.push("SCENES 비어 있음");
  if (mod.DEFAULT_CAT && !table[mod.DEFAULT_CAT]) {
    errors.push(`DEFAULT_CAT '${mod.DEFAULT_CAT}' 이 SCENES에 없음`);
  }
  const seen = new Map();
  for (const cat of cats) {
    const e = normalize(table[cat]);
    if (e.arrive.length < minArrive) errors.push(`${cat}: arrive ${e.arrive.length}개 (< ${minArrive})`);
    if (e.work.length < minWork) errors.push(`${cat}: work ${e.work.length}개 (< ${minWork})`);
    for (const b of e.basis) {
      if (!isValidBasis(b)) errors.push(`${cat}: basis 4필드 불충족`);
    }
    // cat 간 동선 복제 감지 (동일 업종 내 재사용 차단)
    const sig = e.arrive.join("|") + "##" + e.work.join("|");
    if (seen.has(sig)) errors.push(`${cat}: '${seen.get(sig)}' 와 동선 완전 동일`);
    else seen.set(sig, cat);
  }
  return { ok: errors.length === 0, errors, cats: cats.length };
}

export default {
  registerScenes,
  hasScenes,
  listSceneIndustries,
  resolveScene,
  createSceneResolver,
  getSceneTable,
  getBasis,
  isValidBasis,
  validateScenes,
  BASIS_FIELDS,
};
