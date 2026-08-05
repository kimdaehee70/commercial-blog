// lib/daycare-data.js
// 데이케어센터(주간보호센터) 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 기관(사회복지사/센터). 정보형. 후기·체험·광고 금지.
// 복사 베이스: lawyer-data.js → 데이터 교체

export const DAYCARE_META = {
  industry: "daycare",
  label: "데이케어센터",
  fullLabel: "데이케어센터(주간보호센터)",
  greeting: "안녕하세요. {region} 데이케어센터입니다. 어르신 주간보호 안내를 도와드립니다.",
  voice: "기관(사회복지사·센터)",
  badge: "신규",
  // 결정주기: 가족의사결정
  decisionCycle: "family",
  // ★ 비용 단정 금지 — 본인부담금 전국 동일, 등급·시간·가산·감경 변수 → "상담 시 안내" 톤
  costTone: "consult", // 세부 금액 나열 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const DAYCARE_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건",
  "완치", "치료보장", "효과보장", "전문병원 수준",
  // 비용 단정 차단
  "확정 비용", "정확한 금액 보장",
];

// 카테고리 탭 (우선 메뉴 8개)
export const DAYCARE_CATS = [
  "입소자격",
  "장기요양등급",
  "이용비용",
  "치매돌봄",
  "재활프로그램",
  "송영서비스",
  "보호자상담",
  "센터선택기준",
  // ── B-라이트(신뢰글 축) 추가 5개 — 운영 기준 정보형 ──
  "생활실소개",
  "식사관리",
  "인지프로그램",
  "시설환경",
  "하루일과",
];

// ★ 서비스 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword) — 없으면 GPT가 전부 같은 방향으로 씀
export const DAYCARE_TREATMENTS = [
  {
    id: "daycare_eligibility",
    industry: "daycare",
    name: "입소자격(이용대상)",
    cat: "입소자격",
    emoji: "📋",
    titlePatterns: [
      "{region} 데이케어센터 이용 가능한 대상은?",
      "{region} 주간보호센터 이용 대상 정리",
      "치매 초기에도 {region} 주간보호센터 이용할 수 있을까요?",
    ],
    keywords: ["데이케어센터 이용대상", "주간보호센터 자격", "장기요양 이용", "치매 주간보호"],
    compareWith: "요양원",
    DIRECTION: {
      concern: "부모님이 데이케어센터를 이용할 수 있는 대상인지 모름",
      effect: "장기요양등급·인지지원등급 기준으로 이용 가능 여부 안내",
      hook: "장기요양등급만 있으면 이용 가능한지 궁금하실 텐데요",
      keyword: "데이케어센터 이용대상",
    },
  },
  {
    id: "daycare_grade",
    industry: "daycare",
    name: "장기요양등급",
    cat: "장기요양등급",
    emoji: "🏷️",
    titlePatterns: [
      "장기요양 4등급이면 {region} 데이케어센터 이용 가능할까요?",
      "{region} 데이케어센터 장기요양등급별 안내",
      "{region} 주간보호센터 인지지원등급도 이용되나요?",
    ],
    keywords: ["장기요양등급", "인지지원등급", "4등급 주간보호", "등급별 이용"],
    compareWith: "방문요양",
    DIRECTION: {
      concern: "장기요양등급별로 무엇이 달라지는지 모름",
      effect: "1~5등급·인지지원등급별 이용 범위와 한도 안내",
      hook: "등급마다 이용 한도가 달라지는 부분을 안내드리면",
      keyword: "장기요양등급",
    },
  },
  {
    id: "daycare_cost",
    industry: "daycare",
    name: "이용비용(본인부담금)",
    cat: "이용비용",
    emoji: "💳",
    titlePatterns: [
      "{region} 데이케어센터 비용 알아보는 방법",
      "{region} 주간보호센터 본인부담금은 어떻게 되나요?",
      "{region} 데이케어센터 이용요금 구조 안내",
    ],
    keywords: ["데이케어센터 비용", "본인부담금", "주간보호센터 요금", "비급여 항목"],
    compareWith: "요양원 비용",
    DIRECTION: {
      concern: "한 달에 얼마가 드는지, 비급여가 뭔지 불안",
      effect: "본인부담금 구조(15%·감경·면제)와 비급여 항목을 단정 없이 안내",
      hook: "비용은 등급과 이용시간에 따라 달라지는데 구조부터 안내드리면",
      keyword: "데이케어센터 비용",
    },
  },
  {
    id: "daycare_dementia",
    industry: "daycare",
    name: "치매돌봄",
    cat: "치매돌봄",
    emoji: "🧠",
    titlePatterns: [
      "{region} 데이케어센터 치매 어르신 돌봄은 어떻게 이뤄지나요?",
      "{region} 주간보호센터 치매 프로그램 안내",
      "치매 초기 부모님 {region} 데이케어센터 고민이라면",
    ],
    keywords: ["치매 데이케어", "치매 주간보호", "치매 돌봄", "인지프로그램"],
    compareWith: "재가 방문요양",
    DIRECTION: {
      concern: "치매 어르신을 낮 동안 안전하게 맡길 수 있을지 걱정",
      effect: "인지 강화·정서 안정 프로그램과 안전관리 흐름 안내",
      hook: "치매 어르신은 낮 시간 돌봄이 특히 중요한데요",
      keyword: "치매 주간보호",
    },
  },
  {
    id: "daycare_rehab",
    industry: "daycare",
    name: "재활프로그램",
    cat: "재활프로그램",
    emoji: "🤸",
    titlePatterns: [
      "{region} 데이케어센터 재활프로그램은 어떤 게 있나요?",
      "{region} 주간보호센터 신체활동 프로그램 안내",
      "거동 불편한 어르신 {region} 데이케어센터 이용 안내",
    ],
    keywords: ["주간보호 재활", "신체활동 프로그램", "파킨슨 돌봄", "거동불편 어르신"],
    compareWith: "요양병원",
    DIRECTION: {
      concern: "거동이 불편한 부모님이 활동을 이어갈 수 있을지",
      effect: "신체활동·재활 프로그램 구성과 어르신 상태별 적용 안내",
      hook: "거동이 불편하셔도 가능한 신체활동을 안내드리면",
      keyword: "주간보호 재활프로그램",
    },
  },
  {
    id: "daycare_transport",
    industry: "daycare",
    name: "송영서비스",
    cat: "송영서비스",
    emoji: "🚐",
    titlePatterns: [
      "{region} 데이케어센터 송영서비스 지역은 어디까지인가요?",
      "{region} 주간보호센터 차량 송영 안내",
      "{region} 데이케어센터 송영 가능 지역 확인 방법",
    ],
    keywords: ["데이케어 송영", "주간보호 차량", "송영지역", "송영서비스"],
    compareWith: "도보 이용",
    DIRECTION: {
      concern: "우리 동네까지 차량이 오는지, 시간이 얼마나 걸리는지",
      effect: "송영 가능 지역·노선·탑승시간 기준 안내",
      hook: "송영은 거주 지역과 노선에 따라 달라지는데요",
      keyword: "데이케어센터 송영서비스",
    },
  },
  {
    id: "daycare_consult",
    industry: "daycare",
    name: "보호자상담",
    cat: "보호자상담",
    emoji: "🧑‍🤝‍🧑",
    titlePatterns: [
      "{region} 데이케어센터 상담 전 확인할 사항",
      "{region} 주간보호센터 보호자 상담은 어떻게 진행되나요?",
      "낮 시간 부모님 돌봄 {region} 데이케어센터 상담 안내",
    ],
    keywords: ["데이케어 상담", "보호자 상담", "주간보호 문의", "입소 상담"],
    compareWith: "전화 문의",
    DIRECTION: {
      concern: "무엇부터 물어봐야 할지, 어떤 서류가 필요한지 모름",
      effect: "상담 전 확인사항·구비서류·진행 절차 안내",
      hook: "상담 전에 미리 확인해두면 좋은 부분을 정리해드리면",
      keyword: "데이케어센터 상담",
    },
  },
  {
    id: "daycare_choice",
    industry: "daycare",
    name: "센터선택기준",
    cat: "센터선택기준",
    emoji: "✅",
    titlePatterns: [
      "{region} 주간보호센터 선택 전 확인할 사항",
      "{region} 데이케어센터 좋은 곳 고르는 기준",
      "{region} 주간보호센터 상담 전 체크리스트",
    ],
    keywords: ["주간보호센터 선택", "데이케어 고르는 법", "센터 체크리스트", "좋은 데이케어"],
    compareWith: "단순 거리 비교",
    DIRECTION: {
      concern: "어떤 기준으로 센터를 골라야 할지 막막",
      effect: "송영지역·프로그램·인력구성·운영시간 기준 체크리스트 안내",
      hook: "센터를 고를 때 꼭 확인하면 좋은 기준을 정리하면",
      keyword: "주간보호센터 선택기준",
    },
  },

  // ───────────────────────────────────────────────────────────
  // B-라이트(신뢰글 축) 5개 — "실제 센터를 보여주는" 운영 기준 정보형
  // 톤 경계: ✅ 어떻게 운영/제공/진행되나요  ❌ 즐거운시간·환한미소·잔치·나들이
  // 소재 차단 1차 방어 = title/keyword에 일기형 어휘 미포함
  // 묘사 기준 = 몇 인실·안전손잡이·환기·식단구성 등 운영 사실(사진 의존 최소화)
  // ───────────────────────────────────────────────────────────
  {
    id: "daycare_livingroom",
    industry: "daycare",
    name: "생활실 소개",
    cat: "생활실소개",
    emoji: "🛋️",
    titlePatterns: [
      "{region} 데이케어센터 생활실은 어떻게 운영되나요?",
      "{region} 주간보호센터 어르신 생활공간 안내",
      "{region} 데이케어센터 휴게·좌석 공간은 어떤가요?",
    ],
    keywords: ["데이케어 생활실", "주간보호 생활공간", "어르신 휴게공간", "주간보호 좌석배치"],
    compareWith: "요양원 생활실",
    DIRECTION: {
      concern: "어르신이 낮 동안 머무는 공간이 안전하고 편안한지",
      effect: "좌석 배치·휴게공간·냉난방·안전손잡이 등 생활실 운영 기준 안내",
      hook: "어르신이 하루를 보내는 생활실이 어떻게 운영되는지 안내드리면",
      keyword: "데이케어센터 생활실",
    },
  },
  {
    id: "daycare_meal",
    industry: "daycare",
    name: "식사·간식 관리",
    cat: "식사관리",
    emoji: "🍚",
    titlePatterns: [
      "{region} 데이케어센터 식사는 어떻게 제공되나요?",
      "{region} 주간보호센터 식사·간식 운영 안내",
      "{region} 데이케어센터 어르신 영양관리는 어떤가요?",
    ],
    keywords: ["데이케어 식사", "주간보호 간식", "어르신 영양관리", "연하식 제공"],
    compareWith: "가정 내 식사",
    DIRECTION: {
      concern: "어르신이 끼니를 제대로, 안전하게 드시는지",
      effect: "식단 구성 기준·간식 시간·연하식/특별식 대응·수분 관리 안내",
      hook: "식사가 어떻게 제공되고 관리되는지 안내드리면",
      keyword: "데이케어센터 식사관리",
    },
  },
  {
    id: "daycare_cognitive",
    industry: "daycare",
    name: "인지활동 프로그램",
    cat: "인지프로그램",
    emoji: "🧩",
    titlePatterns: [
      "{region} 데이케어센터 인지활동 프로그램은 어떻게 진행되나요?",
      "{region} 주간보호센터 인지강화 프로그램 운영 안내",
      "{region} 데이케어센터 하루 프로그램은 어떤 방식인가요?",
    ],
    keywords: ["데이케어 인지프로그램", "주간보호 인지강화", "인지활동 운영", "치매 인지프로그램"],
    compareWith: "재가 돌봄",
    DIRECTION: {
      concern: "어르신이 낮 동안 어떤 활동으로 인지 기능을 유지하는지",
      effect: "인지 강화 활동의 진행 방식·구성 기준을 운영 관점에서 안내",
      hook: "인지활동 프로그램이 어떤 방식으로 진행되는지 안내드리면",
      keyword: "데이케어센터 인지프로그램",
    },
  },
  {
    id: "daycare_facility",
    industry: "daycare",
    name: "시설 환경 소개",
    cat: "시설환경",
    emoji: "🏛️",
    titlePatterns: [
      "{region} 데이케어센터 시설 환경은 어떻게 관리되나요?",
      "{region} 주간보호센터 안전시설 안내",
      "{region} 데이케어센터 낙상예방은 어떻게 하나요?",
    ],
    keywords: ["데이케어 시설", "주간보호 안전바", "낙상예방 시설", "어르신 출입관리"],
    compareWith: "일반 가정 환경",
    DIRECTION: {
      concern: "어르신이 다치지 않고 안전하게 지낼 수 있는 환경인지",
      effect: "복도·화장실 안전바·낙상예방·출입관리 등 시설 운영 기준 안내",
      hook: "어르신 안전을 위한 시설 환경이 어떻게 관리되는지 안내드리면",
      keyword: "데이케어센터 시설환경",
    },
  },
  {
    id: "daycare_dayschedule",
    industry: "daycare",
    name: "하루 일과 소개",
    cat: "하루일과",
    emoji: "🕘",
    titlePatterns: [
      "{region} 데이케어센터 하루 일과는 어떻게 운영되나요?",
      "{region} 주간보호센터 등원부터 귀가까지 일과 안내",
      "{region} 데이케어센터 하루 일정은 어떤 흐름인가요?",
    ],
    keywords: ["데이케어 하루일과", "주간보호 일정", "등원 귀가 흐름", "주간보호 하루"],
    compareWith: "재가 방문요양",
    DIRECTION: {
      concern: "어르신이 센터에서 하루를 어떻게 보내는지 그려지지 않음",
      effect: "등원·오전 프로그램·식사·휴식·오후 활동·귀가까지 일과 흐름을 운영 기준으로 안내",
      hook: "등원부터 귀가까지 하루가 어떻게 운영되는지 안내드리면",
      keyword: "데이케어센터 하루일과",
    },
  },
];

// 정보블럭 데이터 (B-4) — generateDaycare.js INFO_BLOCKS에서 소비
export const DAYCARE_INFO_BLOCKS = {
  eligibility: {
    title: "이용대상",
    items: [
      "장기요양 1~5등급 판정 어르신",
      "인지지원등급 어르신",
      "치매·뇌졸중 등으로 가정 내 돌봄이 어려운 어르신",
    ],
  },
  service: {
    title: "주요 서비스",
    items: ["송영(차량 이동지원)", "식사·간식", "인지 강화 프로그램", "신체활동", "복약·건강관리"],
  },
  cost: {
    title: "이용비용 안내",
    items: [
      "본인부담금: 일반 15% / 감경 9%·6% / 기초생활수급 면제(급여항목)",
      "비급여: 식사재료비, 이·미용비 등(별도)",
      "※ 등급·이용시간·가산에 따라 달라지므로 정확한 금액은 상담 시 안내",
    ],
  },
  choice: {
    title: "센터 선택 기준",
    items: ["송영 가능 지역(거리)", "프로그램 구성", "인력 구성", "운영시간(주간·주야간)"],
  },
};

// 사진 슬롯 (B-3) — 정보형, 캡션 선택
export const DAYCARE_PHOTO_POOL = [
  { slot: "exterior", alt: "{region} 데이케어센터 외관" },
  { slot: "program", alt: "인지·신체활동 프로그램실" },
  { slot: "meal", alt: "어르신 식사 공간" },
  { slot: "vehicle", alt: "송영 차량" },
  { slot: "activity", alt: "어르신 활동 모습" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const DAYCARE_COMPARE = {
  compareWith: "요양원",
  compareWithText2: "방문요양",
};
