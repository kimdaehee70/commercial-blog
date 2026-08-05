// lib/labor-playConfig.js
// 노무사(labor) 섹션 FLOW. 정보형 narrative (도입→권리/절차→판단구조→선택/판단→마무리)
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용.
// 복제 베이스: tax-playConfig.js → 섹션/길이 교체

export const LABOR_PLAY_CONFIG = {
  industry: "labor",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "검색자 고민 도입",
      role: "노동 문제를 겪는 근로자·사업주가 가진 막막함(어디에·인정되나·어떻게)에 노무사 화자로 차분히 공감 시작",
      minLength: 280,
      maxLength: 420,
    },
    {
      key: "procedure",
      title: "권리·신청 절차 안내",
      role: "해당 사안의 신청 대상·기한·절차를 단계별 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "structure",
      title: "판단·인정 구조",
      role: "인정 요소·판단 기준·필요 자료 안내 (결과 단정 금지, 상담 톤)",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "choice",
      title: "대응·선택 기준",
      role: "진정·구제신청·자문 등 대응 방법 선택 기준 안내 (구제 단정 금지)",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "상담 안내 마무리",
      role: "상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단). 수임 강권 금지",
      minLength: 280,
      maxLength: 420,
    },
  ],
};

export default LABOR_PLAY_CONFIG;
