// lib/seniorgoods-playConfig.js
// 노인용품 전문점 섹션 FLOW. 정보형 narrative (인사→상황→특징→대상→확인사항→관리→마무리)
// ⚠️ 현 단일호출형은 미참조 — DEAD CODE 보존(삭제 금지). 향후 섹션 FLOW 분기 복원 시 사용.
// 복사 베이스: welfarecare-playConfig.js → 섹션/길이 교체 (5섹션 → 7섹션)

export const SENIORGOODS_PLAY_CONFIG = {
  industry: "seniorgoods",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "인사·보호자 고민 도입",
      role: "보호자가 검색 직전 가진 고민에 전문점 화자로 공감 시작",
      minLength: 220,
      maxLength: 360,
    },
    {
      key: "situation",
      title: "제품이 필요한 상황",
      role: "어떤 상황에서 이 제품을 찾게 되는지 정보로 안내",
      minLength: 260,
      maxLength: 400,
    },
    {
      key: "feature",
      title: "제품 특징",
      role: "제품 기능·종류 차이를 정보 중심으로 설명 (과장·효과보장 금지)",
      minLength: 300,
      maxLength: 460,
    },
    {
      key: "target",
      title: "사용 대상",
      role: "어떤 어르신에게 적합한지 안내",
      minLength: 220,
      maxLength: 360,
    },
    {
      key: "choice",
      title: "선택 시 확인사항",
      role: "고를 때 점검할 기준을 안내 (보험·비용은 단정 금지, 상담 톤)",
      minLength: 260,
      maxLength: 400,
    },
    {
      key: "care",
      title: "관리방법",
      role: "사용 후 관리·점검 방법 안내",
      minLength: 200,
      maxLength: 320,
    },
    {
      key: "closing",
      title: "상담 안내 마무리",
      role: "상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단)",
      minLength: 180,
      maxLength: 320,
    },
  ],
};

export default SENIORGOODS_PLAY_CONFIG;
