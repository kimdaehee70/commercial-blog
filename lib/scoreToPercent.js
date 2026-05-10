// lib/scoreToPercent.js
// SEO 총점 → 네이버 상단 노출 확률 변환

/**
 * SEO 점수를 상단 노출 확률(%)로 변환
 * @param {number} score - 0~100 사이의 SEO 점수
 * @returns {{ percent: number, grade: string, label: string }}
 */
export function scoreToPercent(score) {
  // ── 확률 테이블 ──────────────────────────────────
  // 실무 기반: 85점 이상부터 급격히 확률 상승
  let percent;
  if      (score >= 95) percent = 97;
  else if (score >= 90) percent = 93;
  else if (score >= 85) percent = 87;
  else if (score >= 80) percent = 80;
  else if (score >= 75) percent = 72;
  else if (score >= 70) percent = 63;
  else if (score >= 65) percent = 53;
  else if (score >= 60) percent = 43;
  else if (score >= 50) percent = 32;
  else                  percent = 20;

  // ── 등급 ─────────────────────────────────────────
  const grade =
    score >= 90 ? "S" :
    score >= 80 ? "A" :
    score >= 70 ? "B" :
    score >= 60 ? "C" : "D";

  // ── 라벨 ─────────────────────────────────────────
  const label =
    score >= 90 ? "🔥 상단 노출 거의 확실" :
    score >= 80 ? "🎉 상단 노출 가능" :
    score >= 70 ? "👍 조금만 더 보완하면 가능" :
    score >= 60 ? "⚠️ 보완 필요" : "❌ 많은 보완 필요";

  return { percent, grade, label };
}

/**
 * 이미지 입력 전/후 점수 변화 계산
 * @param {number} baseScore     - 이미지 제외한 기존 점수
 * @param {number} imageScore    - 이미지 점수 (0~20)
 * @returns {{ before, after, scoreDiff, percentBefore, percentAfter, percentDiff }}
 */
export function calcScoreChange(baseScore, imageScore) {
  const before = Math.min(baseScore, 100);
  const after  = Math.min(baseScore + imageScore, 100);

  const { percent: percentBefore } = scoreToPercent(before);
  const { percent: percentAfter  } = scoreToPercent(after);

  return {
    before,
    after,
    scoreDiff:    after - before,
    percentBefore,
    percentAfter,
    percentDiff:  percentAfter - percentBefore,
  };
}
