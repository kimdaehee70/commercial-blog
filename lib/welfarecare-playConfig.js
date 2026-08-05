// lib/welfarecare-playConfig.js
// 복지용구 사업소 섹션 FLOW. 정보형 narrative (보호자고민→이용대상/등급→신청절차→비용/한도→선택기준/마무리)
// ⚠️ 현 단일호출형은 미참조 — DEAD CODE 보존(삭제 금지). 향후 섹션 FLOW 분기 복원 시 사용.
// 복사 베이스: daycare-playConfig.js → 섹션/길이 교체

export const WELFARECARE_PLAY_CONFIG = {
  industry: "welfarecare",
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
      role: "복지용구 이용 가능 대상과 등급 기준을 제도 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "procedure",
      title: "신청·이용절차",
      role: "급여확인서·사업소 선택·계약·배송설치 흐름 안내",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "cost",
      title: "비용·한도 구조",
      role: "연 한도(160만원)·본인부담금 구조 안내 (단정 금지, 상담 톤)",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "선택기준·상담 안내 마무리",
      role: "사업소 선택기준 체크 + 상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단)",
      minLength: 280,
      maxLength: 420,
    },
  ],
};

export default WELFARECARE_PLAY_CONFIG;
