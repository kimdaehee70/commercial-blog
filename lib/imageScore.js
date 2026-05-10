// lib/imageScore.js
// 이미지 점수 계산 로직

/**
 * 이미지 점수 계산
 * @param {Object} params
 * @param {number} params.count     - 이미지 장수
 * @param {boolean} params.alt      - Alt 텍스트 적용 여부
 * @param {boolean} params.filename - 파일명 최적화 여부
 * @returns {{ baseScore, altBonus, filenameBonus, totalScore, maxScore, status, comment, plusPercent }}
 */
export function calcImageScore({ count = 0, alt = false, filename = false }) {
  // ── 기본 점수 (이미지 장수) ──────────────────────────
  let baseScore = 0;
  if      (count === 0)  baseScore = 0;   // 평가 제외 → 0
  else if (count <= 2)   baseScore = 3;
  else if (count <= 4)   baseScore = 6;
  else                   baseScore = 10;  // 5장 이상

  // ── 추가 점수 ─────────────────────────────────────
  const altBonus      = alt      ? 5 : 0;
  const filenameBonus = filename ? 5 : 0;

  // ── 총점 (최대 20점) ──────────────────────────────
  const totalScore = Math.min(baseScore + altBonus + filenameBonus, 20);
  const maxScore   = 20;

  // ── 상태 ──────────────────────────────────────────
  const status =
    count === 0        ? "none" :
    totalScore >= 15   ? "pass" :
    totalScore >= 8    ? "warn" : "fail";

  // ── 코멘트 ────────────────────────────────────────
  const comment =
    count === 0
      ? "이미지 없음 — 이미지 장수를 입력하면 점수에 반영됩니다."
      : count <= 2
      ? `${count}장 입력 — 3장 이상이면 점수가 더 올라갑니다. ⚠️`
      : count <= 4
      ? `${count}장 입력 — 좋습니다! 5장 이상이면 최고 점수입니다.`
      : `${count}장 입력 — 최적 장수입니다! ✅`;

  // ── SEO 확률 증가분 (%p 단위) ──────────────────────
  // 점수 1점당 약 1%p 기여 (최대 15%p)
  const plusPercent = Math.min(Math.round(totalScore * 1.2), 15);

  return { baseScore, altBonus, filenameBonus, totalScore, maxScore, status, comment, plusPercent };
}
