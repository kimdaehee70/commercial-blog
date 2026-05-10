// ============================================================
// lib/safeRemove.js — 안전한 단어 제거 + 후처리 모듈 v1.0
// ============================================================
// 목적: forEach 기반 빈문자열 replace의 구조적 한계 해결
//
// 기존 문제:
//   ① "시술" 제거 → "추나 시술하는" → "추나  하는" (공백 2개)
//   ② 부분 매칭으로 "보톡스" → "톡스" 잔존 가능
//   ③ 빈자리 발생 → 다른 정규식이 "이 치료" 강제 삽입 (오작동)
//
// 해결:
//   1) 조사 포함 패턴 함께 제거 ("보톡스을" → "")
//   2) 단어 경계 검증 (앞뒤 한글이면 부분매칭 → SKIP)
//   3) 제거 직후 공백 normalize (이중 공백 → 1개)
//   4) 빈 따옴표/괄호/문장부호 정리
//
// 사용 예:
//   import { safeRemoveWords, normalizeWhitespace } from "../../lib/safeRemove";
//   result = safeRemoveWords(result, removeList);
//
// ⚠️ 마이그레이션:
//   기존 forEach replace를 이 함수로 교체하면 됨 (1줄 변경).
// ============================================================

// 한글 조사 패턴 (단어 뒤에 붙는 모든 케이스)
const KOREAN_PARTICLES = "(?:을|를|이|가|은|는|의|에|에서|으로|로|와|과|도|만|까지|부터|이라|라는|이라는|이라도|라도)";

// 한글 글자 판별 — 부분 매칭 방지용
const HANGUL_RE = /[\uAC00-\uD7A3]/;

// ────────────────────────────────────────────────────────────
// 1. 정규식 이스케이프
// ────────────────────────────────────────────────────────────
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ────────────────────────────────────────────────────────────
// 2. 단어가 한글 단어인지 (조사 처리 적용 대상)
// ────────────────────────────────────────────────────────────
function isHangulWord(w) {
  // 한글이 1글자라도 있으면 한글 단어로 취급
  return HANGUL_RE.test(w);
}

// ────────────────────────────────────────────────────────────
// 3. 메인: 안전한 단어 제거
//   words: 제거할 단어 배열
//   opts.keepBoundary: true (default) — 한글 부분매칭 방지
//   opts.removeParticles: true (default) — 조사 함께 제거
// ────────────────────────────────────────────────────────────
export function safeRemoveWords(text, words, opts = {}) {
  const { keepBoundary = true, removeParticles = true } = opts;

  let result = text;

  // 길이 긴 단어 먼저 (긴 매칭 우선 — "보톡스 후기" > "보톡스")
  const sorted = [...words].filter(Boolean).sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    if (!word) continue;
    const esc = escapeRegExp(word);

    // 한글 단어이고 조사 제거 옵션이 켜져 있으면 조사 포함 패턴부터
    if (isHangulWord(word) && removeParticles) {
      // "단어 + 조사" 패턴: 조사가 있으면 단어+조사 통째 제거
      // 단, 단어 자체가 조사로 끝나는 경우는 SKIP (이중 처리 방지)
      const reWithParticle = new RegExp(esc + KOREAN_PARTICLES + "(?=[\\s.!?,;:\"')\\]]|$)", "g");
      result = result.replace(reWithParticle, "");
    }

    // 단어 단독 제거 — 경계 검증
    if (keepBoundary && isHangulWord(word)) {
      // 한글 단어: 앞뒤가 한글이면 부분매칭 → SKIP
      // 음독: 앞뒤가 한글이 아닌 경우만 제거
      const re = new RegExp("(^|[^\\uAC00-\\uD7A3])" + esc + "(?![\\uAC00-\\uD7A3])", "g");
      result = result.replace(re, "$1");
    } else {
      // 영문/특수문자 포함 단어 또는 경계 검증 OFF
      const re = new RegExp(esc, "g");
      result = result.replace(re, "");
    }
  }

  // 제거 후 공백 normalize
  result = normalizeWhitespace(result);

  return result;
}

// ────────────────────────────────────────────────────────────
// 4. 공백/문장부호 normalize
//   - 이중 공백 → 1개
//   - 줄 시작 공백 제거
//   - 문장부호 앞 공백 제거
//   - 빈 따옴표/괄호 제거
// ────────────────────────────────────────────────────────────
export function normalizeWhitespace(text) {
  return text
    // 이중 공백 → 1개
    .replace(/[ \t]{2,}/g, " ")
    // 줄 끝 공백 제거
    .replace(/[ \t]+$/gm, "")
    // 문장부호 앞 공백 제거
    .replace(/\s+([.,!?;:])/g, "$1")
    // 빈 따옴표 / 빈 괄호 제거
    .replace(/""\s*/g, "")
    .replace(/''\s*/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    // 빈 인용 ", " 같은 잔해
    .replace(/"\s*"/g, "")
    // 3줄 이상 빈 줄 → 2줄
    .replace(/\n{3,}/g, "\n\n")
    // 앞뒤 trim
    .trim();
}

// ────────────────────────────────────────────────────────────
// 5. 조사 자동 보정 — 받침 판별 기반
//   "보톡스을" → "보톡스를" / "추나가" → "추나가" (받침 없음 → "가" OK)
//   word: 단어, text: 본문
// ────────────────────────────────────────────────────────────
export function fixParticles(text, word) {
  if (!word || word.length < 2) return text;

  const lastChar = word[word.length - 1];
  const code = lastChar.charCodeAt(0);
  // 한글 음절 범위 안에 있고, 종성(받침) 있음/없음 판별
  const isHangul = code >= 0xAC00 && code <= 0xD7A3;
  if (!isHangul) return text; // 영문/숫자로 끝나면 보정 안 함

  const hasJongseong = (code - 0xAC00) % 28 !== 0;
  const esc = escapeRegExp(word);

  // ─────────────────────────────────────────────────────
  // [v1.1 추가] "치료명 + 주격조사 + 치료/치과/시술" 비문 보정
  //   사고 케이스: "임플란트가 치료를 받기로" / "임플란트가 치과를 선택"
  //   → "임플란트 치료를 받기로" / "임플란트 치과를 선택" (주격 중복 제거)
  //   ⚠️ 받침 무관 — "임플란트가/임플란트는" + 치료/치과/시술 모두 비문
  // ─────────────────────────────────────────────────────
  text = text
    .replace(new RegExp(`${esc}(?:가|는|이|은)\\s+(치료|치과|시술|진료|병원)`, "g"), `${word} $1`)
    // "치료명 + 라도" 비문 ("임플란트가라도" → "임플란트라도")
    .replace(new RegExp(`${esc}(?:가|이)라도`, "g"), `${word}라도`);

  if (hasJongseong) {
    // 받침 있음: 가/는/를/와/로 (잘못) → 이/은/을/과/으로 (정정)
    return text
      .replace(new RegExp(esc + "가(?=[\\s가-힣])", "g"), word + "이")
      .replace(new RegExp(esc + "는(?=[\\s가-힣])", "g"), word + "은")
      .replace(new RegExp(esc + "를(?=[\\s가-힣])", "g"), word + "을");
    // 단, "이/는/을"이 SEO 문장에 어색할 수 있어 와/과·로/으로는 보정 안 함
  } else {
    // 받침 없음: 이/은/을 (잘못) → 가/는/를 (정정)
    return text
      .replace(new RegExp(esc + "이(?=[\\s가-힣])", "g"), word + "가")
      .replace(new RegExp(esc + "은(?=[\\s가-힣])", "g"), word + "는")
      .replace(new RegExp(esc + "을(?=[\\s가-힣])", "g"), word + "를");
  }
}

// ────────────────────────────────────────────────────────────
// 6. "이 치료/시술" 조사 보정 — 모든 업종 공통
//   기존 본문 정규화 블록의 핵심 패턴 통합
// ────────────────────────────────────────────────────────────
export function fixThisTreatmentParticles(text) {
  return text
    // "이 치료은/시술은" — 받침 없으니 "는" 정상
    .replace(/이\s*치료은(?=[\s가-힣])/g, "이 치료는")
    .replace(/이\s*시술은(?=[\s가-힣])/g, "이 시술은") // OK 그대로 (이미 맞음)
    // "이 시술는/이 시술를" — 받침 없으니 "는/를" 정상이지만, 한국어 어법은 "은/을"
    //   ※ "시술" 받침 있음 → "은/을" 이 맞음
    .replace(/이\s*시술는(?=[\s가-힣])/g, "이 시술은")
    .replace(/이\s*시술를(?=[\s가-힣])/g, "이 시술을")
    .replace(/이\s*시술가(?=[\s가-힣])/g, "이 시술이")
    // "이 치료의 필요/진행/시작/결정/중요"
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)합니다/g, "이 치료가 $1합니다")
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)해요/g,   "이 치료가 $1해요")
    .replace(/이\s*시술의\s+(필요|진행|시작|결정|중요)합니다/g, "이 시술이 $1합니다")
    .replace(/이\s*시술의\s+(필요|진행|시작|결정|중요)해요/g,   "이 시술이 $1해요")
    // 단독 " 통해" 복구 — 단, "검색해보니" 같은 따옴표 직후는 제외 (오작동 방지)
    .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 치료를 통해 ")
    // 이중 "통해 통해"
    .replace(/통해\s+통해/g, "통해")
    // 톤 약화
    .replace(/추천드리고 싶어요/g,  "고려해볼 수 있어요")
    .replace(/추천드립니다/g,        "고려해볼 수 있어요")
    .replace(/적극 추천/g,           "괜찮은 선택")
    .replace(/강력 추천/g,           "괜찮은 선택")
    .replace(/적절하게 짧아서/g,     "짧아서")
    .replace(/적절하게 길어서/g,     "여유 있게")
    .replace(/고려해보는 것도\s+덕분에/g, "고려해볼 수 있어요. 덕분에")
    .replace(/고려하는 것도\s+덕분에/g,   "고려해볼 수 있어요. 덕분에");
}

// ────────────────────────────────────────────────────────────
// 7. 통합 cleanup — 한 번에 모두 처리
//   기존 cleanText 함수의 forEach 부분 대체용
// ────────────────────────────────────────────────────────────
export function safeCleanup(text, removeList, treatmentName = "") {
  let result = text;

  // 1) 안전 단어 제거 (단어 경계 + 조사 포함 + 공백 normalize)
  result = safeRemoveWords(result, removeList);

  // 2) "이 치료/시술" 조사 보정
  result = fixThisTreatmentParticles(result);

  // 3) 시술명 받침 자동 보정
  if (treatmentName) {
    result = fixParticles(result, treatmentName);
  }

  // 4) 마지막 공백 normalize
  result = normalizeWhitespace(result);

  return result;
}
