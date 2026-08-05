// lib/homecare-playConfig.js
// 방문요양 섹션 FLOW. 정보형 narrative (보호자고민→이용대상·등급→서비스→비용→선택기준·마무리)
// ★ 단일호출형 핸들러(generateHomecare = daycare 베이스)에서는 이 FLOW를 루프 소비하지 않는다.
//   = DEAD CODE. 섹션 설계 보존·문서화 목적으로만 유지(daycare-playConfig 동형).
//   섹션루프형으로 전환 시에만 활성. 그 전까지 import 후 미사용.
// 복사 베이스: daycare-playConfig.js → narrative 분리(시설→가정방문)

export const HOMECARE_PLAY_CONFIG = {
  industry: "homecare",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "보호자 고민 도입",
      role: "부모님을 집에서 모시려는 보호자가 검색 직전 가진 고민에 기관 화자로 공감 시작",
      minLength: 280,
      maxLength: 420,
    },
    {
      key: "eligibility",
      title: "이용대상·장기요양등급",
      role: "방문요양 이용 가능 대상과 등급 기준을 제도 정보로 안내",
      minLength: 380,
      maxLength: 560,
    },
    {
      key: "service",
      title: "방문 서비스(신체활동·가사·방문목욕·동행)",
      role: "요양보호사가 댁으로 찾아가 제공하는 재가 서비스 흐름 안내(가정 방문 narrative)",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "cost",
      title: "이용비용 구조",
      role: "본인부담금 구조·감경 안내 (단정 금지, 상담 톤)",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "센터 선택기준·상담 안내 마무리",
      role: "센터 선택기준 체크 + 상담 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단)",
      minLength: 280,
      maxLength: 420,
    },
  ],
};

export default HOMECARE_PLAY_CONFIG;
