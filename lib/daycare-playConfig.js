// lib/daycare-playConfig.js
// 데이케어센터 섹션 FLOW. 정보형 narrative (B-2: 보호자고민→입소자격→비용→선택기준→마무리)
// 의료 6섹션이 표준 아님 — 업종 narrative에 맞춰 5섹션.
// 복사 베이스: lawyer-playConfig.js → 섹션/길이 교체

export const DAYCARE_PLAY_CONFIG = {
  industry: "daycare",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "보호자 고민 도입",
      role: "보호자가 검색 직전 가진 고민에 기관 화자로 공감 시작",
      minLength: 280,
      maxLength: 420,
    },
    {
      key: "eligibility",
      title: "이용대상·장기요양등급",
      role: "이용 가능 대상과 등급 기준을 제도 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "service",
      title: "서비스·프로그램(송영·식사·인지·재활)",
      role: "센터에서 제공하는 서비스 흐름 안내",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "cost",
      title: "이용비용 구조",
      role: "본인부담금 구조·비급여 안내 (단정 금지, 상담 톤)",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "선택기준·상담 안내 마무리",
      role: "선택기준 체크 + 상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단)",
      minLength: 280,
      maxLength: 420,
    },
  ],
};

export default DAYCARE_PLAY_CONFIG;
