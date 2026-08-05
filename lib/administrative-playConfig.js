// ============================================================
// lib/administrative-playConfig.js — 행정사 섹션 흐름 정의
// 섹션루프형(lawyer 동형). 핸들러가 ADMIN_FLOW 순회 생성.
// 6고정 구조: 도입→업무설명→준비서류→진행절차→주의사항→마무리
// ============================================================

export const ADMIN_FLOW = [
  { key: "intro",     label: "도입",     minLen: 180 },
  { key: "overview",  label: "업무 설명", minLen: 300 },
  { key: "documents", label: "준비서류",  minLen: 280 },
  { key: "procedure", label: "진행절차",  minLen: 320 },
  { key: "caution",   label: "주의사항",  minLen: 220 },
  { key: "closing",   label: "마무리",   minLen: 150 },
];

// 섹션별 사진 alt 매핑 (코드 강제 삽입. GPT 마커 의존 제거)
export const ADMIN_PHOTO_ALT = {
  intro:     "상담 안내",
  overview:  "절차 안내",
  documents: "준비서류 안내",
  procedure: "절차 안내",
  caution:   "준비서류 안내",
  closing:   "사무소 안내",
};

export default { ADMIN_FLOW, ADMIN_PHOTO_ALT };
