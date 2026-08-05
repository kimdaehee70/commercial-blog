// ============================================================
// lib/regionNormalize.js — 지역 문자열 정규화 (전 업종 공유 유틸 v1.0)
// ------------------------------------------------------------
// 목적: "대표지역 + 생활권" 입력값을 엔진 전달 전 보정.
//   · SEO 로직 아님 — 입력값 보정(normalize)만. narrative·QC·prompt 무관.
//   · locationBlock.js 동형: 전 업종 공유 기능 모듈(Naver §6 정합).
//   · 엔진별 예외처리 폐기 → 공통 Normalizer 단일 소스.
//
// 사용 (각 generateXxx.js 상단):
//   import { normalizeRegion } from "../../lib/regionNormalize";
//   const region = normalizeRegion(userRegion, { fallback: "구리" });
//
// 설계 의도(정상 입력):
//   대표지역(구) + 생활권(동/역) → "노원구 공릉동", "노원구 태릉입구"
// 오입력 방어:
//   생활권에 행정구를 넣으면 "노원구 성북구" 끊김 → 뒤 행정구만 사용.
//
// ⚠ 수정 시: 한 곳 수정 = 전 업종 동시 적용. 타입 판별표(REGION_TYPE) 우선.
// ============================================================

// ────────────────────────────────────────────────────────────
// 지역 타입 판별
//   '시도'  : 서울/경기/부산 등 광역 (향후 전국형 확장 대비)
//   '구'    : 행정구 (노원구·성북구) — 대표지역 후보
//   '시군'  : 행정시·군 (구리·남양주·하남) — 대표지역 후보(구 없는 지역)
//   '생활권': 동·읍·면·리·역·landmark (공릉동·태릉입구·역삼동) — 생활권
//   '미상'  : 위 어디에도 안 맞음 (그대로 통과)
// ────────────────────────────────────────────────────────────

const SIDO = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
  "서울특별시", "경기도", "강원도", "제주도", "제주특별자치도",
];

// landmark 접미 — '구'로 끝나도 행정구 아님(역명·지형지물)
const LANDMARK_SUFFIX = /(입구|출구|역구|사거리|오거리)$/;

// 생활권 접미 — 동/읍/면/리/역/가/로 등
const LIVING_SUFFIX = /(동|읍|면|리|역|가|로|길|지구|단지|마을)$/;

/**
 * 단일 지역 토큰의 타입을 판별.
 * @param {string} tok - 예: "노원구", "공릉동", "태릉입구", "서울", "구리"
 * @returns {'시도'|'구'|'시군'|'생활권'|'미상'}
 */
export function regionType(tok) {
  const s = (tok || "").trim();
  if (!s) return "미상";
  if (SIDO.includes(s)) return "시도";
  if (/시$/.test(s) || /도$/.test(s)) {
    // "서울시"·"경기도" 형태 (위 SIDO 미포함 변형)
    if (/시$/.test(s) && s.length <= 3) return "시군"; // "구리시"·"하남시"
    return "시도";
  }
  // landmark 우선(역명이 '구'로 끝나는 예외 차단)
  if (LANDMARK_SUFFIX.test(s)) return "생활권";
  if (/구$/.test(s)) return "구";
  if (/군$/.test(s)) return "시군";
  if (LIVING_SUFFIX.test(s)) return "생활권";
  return "미상";
}

/**
 * 지역 문자열 정규화.
 *   입력: "노원구 공릉동" | "노원구 성북구" | "노원구" | "구리" | ""
 *   규칙:
 *     - 빈값            → fallback
 *     - 단일 토큰        → 그대로
 *     - 구 + 생활권      → "노원구 공릉동"  (정상, 유지)
 *     - 구 + 동일 토큰   → "노원구"        (중복 제거)
 *     - 구 + 구          → 뒤 구만         ("성북구" — 생활권 우선)
 *     - 시도 + 구        → "서울 노원구"   (광역형, 유지)
 *     - 그 외            → 원문 유지       (안전: 모르면 건드리지 않음)
 *
 * @param {string} raw - userRegion 원문 (대표지역+생활권이 합쳐진 문자열)
 * @param {{fallback?: string}} [opts]
 * @returns {string}
 */
export function normalizeRegion(raw, opts = {}) {
  const fallback = opts.fallback || "구리";
  const s = (raw || "").trim().replace(/\s{2,}/g, " ");
  if (!s) return fallback;

  const parts = s.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];

  // 2토큰만 보정 대상(3토큰 이상은 광역형 가능성 — 원문 유지).
  if (parts.length === 2) {
    const [a, b] = parts;
    if (a === b) return a;                       // 중복 → 하나

    const ta = regionType(a);
    const tb = regionType(b);

    // 구+구 (둘 다 행정구) → 뒤 구만 (생활권 자리에 구 오입력)
    if (ta === "구" && tb === "구") return b;
    // 시군+시군 → 뒤만
    if (ta === "시군" && tb === "시군") return b;
    // 구+시군 또는 시군+구 (둘 다 대표지역급) → 뒤만
    if ((ta === "구" || ta === "시군") && (tb === "구" || tb === "시군")) return b;

    // 정상 조합(구/시군 + 생활권, 시도 + 구/시군) → 유지
    return s;
  }

  // 3토큰 이상(예: "서울 노원구 공릉동") → 원문 유지(광역형).
  return s;
}

// ────────────────────────────────────────────────────────────
// 디버그 헬퍼 — 보정 발생 시 콘솔 로그(옵션).
// ────────────────────────────────────────────────────────────
export function normalizeRegionDebug(raw, opts = {}) {
  const out = normalizeRegion(raw, opts);
  if (out !== (raw || "").trim().replace(/\s{2,}/g, " ")) {
    console.log(`[regionNormalize] "${raw}" → "${out}"`);
  }
  return out;
}
