// =============================================
// lib/fishing-catalog.js — 고패킹 index.js 배선 정합용 카탈로그
// 고패킹은 시술목록(유치원 edu 18 같은 구조)이 없다.
// 외부 글유형 3종(method/analysis/compare)을 treatment 형식으로 래핑해
// index.js(INDUSTRY_TREATMENTS/activeCats/ALL_TREATMENTS_FLAT) 정합을 맞춘다.
// 숨김 3종(catch/review/guide)은 미노출(반장 프론트와 동일).
// 엔진 4파일과 별개 — 배선 보조 파일.
// =============================================

export const FISHING_CATS = ["방법형", "분석형", "비교형"];

export const FISHING_TREATMENTS = [
  { id: "method",   name: "낚시 방법",         cat: "방법형", industry: "fishing" },
  { id: "analysis", name: "입질·조황 분석",     cat: "분석형", industry: "fishing" },
  { id: "compare",  name: "자동 vs 수동 비교",  cat: "비교형", industry: "fishing" },
];

export const FISHING_META = {
  industry: "fishing",
  label: "고패킹·바다낚시",
  inputMode: "memo",                 // 시술선택 아님 — memo 자유입력(반장 프론트 정합)
  types: ["method", "analysis", "compare"],
};
