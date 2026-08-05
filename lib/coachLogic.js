// 🧭 AI 운영코치 - 추천 산출 로직 (설계 검증용)
// 입력: 최근 10건 발행 + survival 상태
// 출력: { 집계, 진단(1~2줄), 추천(1개) }
//
// 우선순위:
//   1. Alive 발견 → 반응 키워드 추가 (최우선)
//   2. Alive 없음 → 묶음(같은 keyword 2건+) 형성중 키워드 1건 추가
//   3. 묶음 없음 → 지역 분산 → 한 지역 집중 권장
//   철학: "많이 쓰기"가 아니라 "살아남는 조합 찾기"

const RECENT_N = 10;
const BUNDLE_MIN = 2; // 같은 keyword 2건 이상 = 묶음

// ── 유틸 ──────────────────────────────────────────────
function keyOf(p) {
  // keyword 우선, 없으면 region+treatment 조합
  if (p.keyword) return p.keyword.trim();
  return [p.region, p.treatment].filter(Boolean).join(" ").trim();
}

function tally(posts, pick) {
  const m = {};
  for (const p of posts) {
    const k = pick(p);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m; // { key: count }
}

function sortDesc(m) {
  return Object.entries(m).sort((a, b) => b[1] - a[1]); // [[key,cnt],...]
}

// ── 메인 ──────────────────────────────────────────────
function coachLogic(allPosts = [], survival = {}) {
  // 최근 10건 (created_at desc 가정, 안전하게 정렬)
  const posts = [...allPosts]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, RECENT_N);

  // 케이스4: 발행 없음
  if (posts.length === 0) {
    return {
      recentCount: 0,
      tallyTreatment: [],
      tallyKeyword: [],
      diagnosis: "아직 발행 내역이 없습니다.",
      action: "첫 키워드를 발행하고 관측을 시작해 보세요.",
      reason: "no_posts",
    };
  }

  // 집계
  const byKeyword = tally(posts, keyOf);              // "분당 임플란트": 3
  const byTreatment = tally(posts, (p) => p.treatment); // "임플란트": 6
  const byRegion = tally(posts, (p) => p.region);     // "분당": 4
  const kwSorted = sortDesc(byKeyword);
  const trSorted = sortDesc(byTreatment);
  const rgSorted = sortDesc(byRegion);

  // Alive 키워드 수집 (post_id → keyword 매핑)
  const aliveKeywords = []; // {key, created_at}
  for (const p of posts) {
    const st = survival[p.id];
    if (st === "alive") aliveKeywords.push({ key: keyOf(p), created_at: p.created_at });
  }

  const base = {
    recentCount: posts.length,
    tallyTreatment: trSorted, // [["임플란트",6],...]
    tallyRegion: rgSorted,    // [["분당",4],...]
    tallyKeyword: kwSorted,
    tallyView: "treatment",   // 카드가 표시할 집계: "treatment" | "region"
  };

  // ── 1순위: Alive ──
  if (aliveKeywords.length > 0) {
    // 가장 최근 Alive 키워드
    aliveKeywords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const top = aliveKeywords[0].key;
    const aliveCnt = aliveKeywords.length;
    const diag =
      aliveCnt === 1
        ? `'${top}'에서 살아있는 반응이 확인됐습니다.`
        : `살아있는 반응 ${aliveCnt}건 — 가장 최근 반응은 '${top}'입니다.`;
    return {
      ...base,
      diagnosis: diag,
      action: `'${top}' 1건 추가 발행`,
      reason: "alive",
    };
  }

  // ── 2순위: 묶음 ──
  // 같은 keyword 2건 이상 중 가장 많은 것
  const bundle = kwSorted.find(([, c]) => c >= BUNDLE_MIN);
  if (bundle) {
    const [bk, bc] = bundle;
    return {
      ...base,
      diagnosis: `'${bk}' ${bc}건 — 묶음이 형성되는 중입니다. 아직 반응(Alive)은 없습니다.`,
      action: `'${bk}' 1건 추가 발행 후 관측`,
      reason: "bundle",
    };
  }

  // ── 3순위: 집중도 ──
  // 묶음 없음 = 전부 다른 keyword. 지역이 흩어졌는지 본다.
  const regionCount = rgSorted.length;
  if (regionCount >= 2) {
    // 가장 많이 쓴 지역(동률이면 첫번째)으로 집중 권장
    const topRegion = rgSorted[0][0];
    return {
      ...base,
      tallyView: "region",
      diagnosis: `발행이 ${regionCount}개 지역으로 분산돼 있습니다. 묶음이 아직 없습니다.`,
      action: topRegion
        ? `'${topRegion}' 한 지역에 집중 발행 권장`
        : "한 지역에 집중 발행 권장",
      reason: "focus",
    };
  }

  // 한 지역인데 전부 다른 시술 (묶음 없음)
  const topRegionSingle = rgSorted[0] ? rgSorted[0][0] : "";
  return {
    ...base,
    diagnosis: `${topRegionSingle ? `'${topRegionSingle}' ` : ""}한 지역에 여러 시술이 1건씩 흩어져 있습니다.`,
    action: "같은 키워드를 2건 이상 묶어 발행해 보세요.",
    reason: "focus_single_region",
  };
}

module.exports = { coachLogic };
