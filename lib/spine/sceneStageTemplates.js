// lib/spine/sceneStageTemplates.js
// Spine 단계 순서 템플릿 — 2종 분기(STEP C). 토큰 저장소 아님.
//   ★ 여기 있는 것은 '단계 이름의 순서'뿐이다. 실제 동선 토큰은 scenes/*.js.
//   ★ 엔진 신설 아님. handler / locationBlock / QC 공통 유지, Spine만 분기.
//   [세션60] 정의만 선반영. 프롬프트 소비 배선은 STEP C에서 진행.

export const LIVING_STAGES = [
  "문제발생", "발견", "원인판단", "처리우선순위", "약제선택",
  "조치", "재확인", "생활관리", "재발방지",
];

export const CONSTRUCTION_STAGES = [
  "상담", "현장도착", "발견", "판단", "작업범위결정",
  "공법선택", "시공", "검수", "고객확인",
];

export const STAGE_TEMPLATES = {
  living: LIVING_STAGES,
  construction: CONSTRUCTION_STAGES,
};

// 업종 → 템플릿 매핑. 미등록 업종은 null → 프롬프트가 기존 흐름 유지(축퇴).
const INDUSTRY_STAGE_KIND = {
  pestcontrol: "living",
  buildingclean: "construction",
  cleaning: "construction",
  moving: "construction",
  interior: "construction",
  grout: "construction",
  coating: "construction",
  systemair: "construction",
  airclean: "living",
  screen: "construction",
};

export function registerStageKind(industry, kind) {
  INDUSTRY_STAGE_KIND[industry] = kind;
}

export function getStageKind(industry) {
  return INDUSTRY_STAGE_KIND[industry] || null;
}

export function getStages(industry) {
  const kind = getStageKind(industry);
  return kind ? STAGE_TEMPLATES[kind] : null;
}

export default { STAGE_TEMPLATES, LIVING_STAGES, CONSTRUCTION_STAGES, getStages, getStageKind, registerStageKind };
