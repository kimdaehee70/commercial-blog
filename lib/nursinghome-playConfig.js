// lib/nursinghome-playConfig.js
// 요양원 섹션 FLOW. 정보형 narrative (보호자고민→등급·입소자격→입소절차→비용구조→선택기준)
// 의료 6섹션이 표준 아님 — 업종 narrative에 맞춰 5섹션.
// 복사 베이스: daycare-playConfig.js → 섹션/길이 교체 (daycare 원본 무수정)
//
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지)
//   generateNursinghome.js 는 단일호출형이며 이 FLOW를 소비하지 않는다.
//   향후 섹션 루프 분기 복원 시 사용. SOP v4.2 STEP 1 "단일호출형이면 DEAD CODE 마커로 보존" 준수.

export const NURSINGHOME_PLAY_CONFIG = {
  industry: "nursinghome",
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
      key: "grade",
      title: "장기요양등급·입소자격",
      role: "등급 판정과 시설급여 대상 여부를 제도 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "process",
      title: "입소 절차",
      role: "상담→서류→사전방문→계약 일반 절차 안내. 입소 가능 여부 서술 금지",
      minLength: 340,
      maxLength: 520,
    },
    {
      key: "cost",
      title: "비용 구조·비급여",
      role: "본인부담 구조·비급여 안내 (금액 단정 금지, 상담 톤)",
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

export default NURSINGHOME_PLAY_CONFIG;
