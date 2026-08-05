// lib/funeral-playConfig.js
// 상조(funeral) 섹션 FLOW. 정보형 narrative (도입→절차→비용→형태/선택→마무리)
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용.
// 복사 베이스: daycare-playConfig.js → 섹션/길이 교체

export const FUNERAL_PLAY_CONFIG = {
  industry: "funeral",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "유가족 고민 도입",
      role: "장례 발생 직후 유가족이 가진 막막함에 장례지도사 화자로 차분히 공감 시작",
      minLength: 280,
      maxLength: 420,
    },
    {
      key: "procedure",
      title: "장례 절차 안내",
      role: "임종→안치→빈소→발인→화장/매장 절차를 단계별 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "cost",
      title: "장례비용 구조",
      role: "빈소·용품·화장 비용 구성 안내 (금액 단정 금지, 상담 톤)",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "choice",
      title: "장례형태·장례식장 선택 기준",
      role: "가족장·무빈소·일반장 차이 및 빈소 선택 기준 안내",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "상담 안내 마무리",
      role: "상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단). 상조 가입 강권 금지",
      minLength: 280,
      maxLength: 420,
    },
  ],
};

export default FUNERAL_PLAY_CONFIG;
