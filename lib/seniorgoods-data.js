// lib/seniorgoods-data.js
// 노인용품 전문점 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 기관/전문점(노인용품 전문점·복지용품 전문점). 정보형. 후기·체험·광고·가격유도·판매유도 금지.
// 복사 베이스: welfarecare-data.js → 데이터 교체 (정보형/장기요양 제도설명부 계열 재사용)

// ★ 제도 변수 — 연 한도액. 제도 변경 시 이 상수 1곳만 수정.
//   주의: keywords의 "연 160만원"은 사용자 검색어축 → 상수화 제외(검색 의도 보존).
export const WELFARE_LIMIT = "160만원";

export const SENIORGOODS_META = {
  industry: "seniorgoods",
  label: "노인용품",
  fullLabel: "노인용품 전문점",
  greeting: "안녕하세요. {region} 노인용품 전문점입니다. 어르신 용품 안내를 도와드립니다.",
  voice: "기관/전문점(노인용품 전문점·복지용품 전문점)",
  badge: "신규",
  // 결정주기: 가족의사결정 (보호자)
  decisionCycle: "family",
  // ★ 비용 단정 금지 — 제품 가격/판매 유도 차단. 보험적용·한도·등급은 "상담 시 안내" 톤.
  costTone: "consult", // 세부 금액 나열 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const SENIORGOODS_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건",
  "완치", "치료보장", "효과보장", "의료기기 수준",
  // 가격유도·판매유도 차단
  "최저가", "할인", "특가", "이벤트가", "지금 구매", "구매하세요", "주문하세요", "전화주세요",
  // 비용 단정 차단
  "확정 비용", "정확한 금액 보장",
];

// 카테고리 탭 — 1차 제품 메뉴 12 + 2차 정보형 메뉴 5 = 17
export const SENIORGOODS_CATS = [
  // 1차 제품 메뉴 (12)
  "전동침대",
  "휠체어",
  "전동휠체어",
  "성인보행기",
  "실버카",
  "지팡이",
  "안전손잡이",
  "욕실안전용품",
  "이동변기",
  "목욕의자",
  "욕창예방매트리스",
  "미끄럼방지용품",
  // 2차 정보형 메뉴 (5)
  "복지용구보험적용",
  "장기요양등급복지용구",
  "복지용구대여",
  "복지용구구매",
  "복지용구선택방법",
];

// ★ UI 표시용 라벨 — CATS 키는 배선 매칭축(변경 금지). 화면 노출 시 띄어쓰기만 보정.
//   index.js 탭/업종센터에서 CAT_LABELS[cat] || cat 로 소비.
export const SENIORGOODS_CAT_LABELS = {
  복지용구보험적용: "복지용구 보험적용",
  장기요양등급복지용구: "장기요양등급 복지용구",
  복지용구대여: "복지용구 대여",
  복지용구구매: "복지용구 구매",
  복지용구선택방법: "복지용구 선택방법",
};

// ★ 품목 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword)
export const SENIORGOODS_TREATMENTS = [
  // ───────── 1차 제품 메뉴 (12) ─────────
  {
    id: "senior_bed",
    industry: "seniorgoods",
    name: "전동침대",
    cat: "전동침대",
    emoji: "🛏️",
    titlePatterns: [
      "{region} 노인용품 전동침대 선택 전 확인사항",
      "{region} 어르신 전동침대 어떤 기능을 볼까요?",
      "{region} 노인용품 전동침대 사용 대상 안내",
    ],
    keywords: ["전동침대", "노인 전동침대", "어르신 침대", "전동침대 기능"],
    compareWith: "일반 침대",
    DIRECTION: {
      concern: "거동이 불편한 어르신을 위해 전동침대가 필요한지, 어떤 기능을 봐야 하는지 막막함",
      effect: "전동침대가 필요한 상황·기능·사용 대상을 정보 중심으로 안내",
      hook: "전동침대는 어르신의 거동 상태부터 살펴보고 고르는데요",
      keyword: "노인용품 전동침대",
    },
  },
  {
    id: "senior_wheelchair",
    industry: "seniorgoods",
    name: "휠체어",
    cat: "휠체어",
    emoji: "♿",
    titlePatterns: [
      "{region} 노인용품 휠체어 선택 기준",
      "{region} 어르신 수동휠체어 확인할 사항",
      "{region} 노인용품 휠체어 어떻게 고르나요?",
    ],
    keywords: ["수동휠체어", "노인 휠체어", "어르신 휠체어", "휠체어 선택"],
    compareWith: "전동휠체어",
    DIRECTION: {
      concern: "어르신 상태에 맞는 휠체어가 무엇인지, 무게와 접이 방식이 궁금함",
      effect: "수동휠체어 종류·선택 기준·사용 대상을 정보 중심으로 안내",
      hook: "휠체어는 어르신 체형과 이동 환경에 따라 종류가 달라지는데요",
      keyword: "노인용품 휠체어",
    },
  },
  {
    id: "senior_ewheelchair",
    industry: "seniorgoods",
    name: "전동휠체어",
    cat: "전동휠체어",
    emoji: "🦽",
    titlePatterns: [
      "{region} 노인용품 전동휠체어 사용 대상 안내",
      "{region} 어르신 전동휠체어 확인할 사항",
      "{region} 노인용품 전동휠체어 선택 전 점검",
    ],
    keywords: ["전동휠체어", "노인 전동휠체어", "전동휠체어 사용", "전동휠체어 기능"],
    compareWith: "수동휠체어",
    DIRECTION: {
      concern: "전동휠체어를 어르신이 직접 조작할 수 있는지, 어떤 점을 확인해야 하는지",
      effect: "전동휠체어 사용 대상·조작 방식·확인 사항을 정보 중심으로 안내",
      hook: "전동휠체어는 어르신이 직접 조작 가능한지부터 확인하는데요",
      keyword: "노인용품 전동휠체어",
    },
  },
  {
    id: "senior_walker",
    industry: "seniorgoods",
    name: "성인보행기",
    cat: "성인보행기",
    emoji: "🚶",
    titlePatterns: [
      "{region} 노인용품 성인보행기 선택 기준",
      "{region} 어르신 보행기 어떤 종류가 있나요?",
      "{region} 노인용품 성인보행기 사용 대상 안내",
    ],
    keywords: ["성인보행기", "노인 보행기", "어르신 보행기", "보행보조"],
    compareWith: "실버카",
    DIRECTION: {
      concern: "어르신 거동에 맞는 보행기가 무엇인지, 종류별 차이가 막막함",
      effect: "성인보행기 종류·선택 기준·사용 대상을 정보 중심으로 안내",
      hook: "성인보행기는 어르신 거동 상태에 따라 종류를 고르는데요",
      keyword: "노인용품 성인보행기",
    },
  },
  {
    id: "senior_silvercar",
    industry: "seniorgoods",
    name: "실버카",
    cat: "실버카",
    emoji: "🛒",
    titlePatterns: [
      "{region} 노인용품 실버카 선택 기준",
      "{region} 어르신 실버카 확인할 사항",
      "{region} 노인용품 실버카 사용 대상 안내",
    ],
    keywords: ["실버카", "노인 실버카", "보행보조차", "실버카 선택"],
    compareWith: "성인보행기",
    DIRECTION: {
      concern: "실버카가 보행기와 어떻게 다른지, 어떤 어르신에게 맞는지 궁금함",
      effect: "실버카 특징·보행기와의 차이·사용 대상을 정보 중심으로 안내",
      hook: "실버카는 보행은 가능하지만 앉을 자리가 필요한 어르신께 살펴보는데요",
      keyword: "노인용품 실버카",
    },
  },
  {
    id: "senior_cane",
    industry: "seniorgoods",
    name: "지팡이",
    cat: "지팡이",
    emoji: "🦯",
    titlePatterns: [
      "{region} 노인용품 지팡이 선택 기준",
      "{region} 어르신 지팡이 어떤 종류를 고를까요?",
      "{region} 노인용품 지팡이 사용 대상 안내",
    ],
    keywords: ["노인 지팡이", "어르신 지팡이", "사발지팡이", "지팡이 선택"],
    compareWith: "성인보행기",
    DIRECTION: {
      concern: "어르신 균형 상태에 맞는 지팡이 종류를 어떻게 고르는지",
      effect: "지팡이 종류(일자·사발·접이식)·선택 기준·사용 대상을 정보 중심으로 안내",
      hook: "지팡이는 어르신 균형 상태에 따라 받침 형태를 고르는데요",
      keyword: "노인용품 지팡이",
    },
  },
  {
    id: "senior_handle",
    industry: "seniorgoods",
    name: "안전손잡이",
    cat: "안전손잡이",
    emoji: "🔧",
    titlePatterns: [
      "{region} 노인용품 안전손잡이 설치가 필요한 경우",
      "{region} 화장실·침실 안전손잡이 안내",
      "낙상예방 {region} 노인용품 안전손잡이 정리",
    ],
    keywords: ["안전손잡이", "화장실 안전바", "침실 안전손잡이", "낙상예방"],
    compareWith: "설치 없이 사용",
    DIRECTION: {
      concern: "집 안 어디에 안전손잡이를 설치해야 낙상을 막을 수 있는지",
      effect: "화장실·침실·현관 설치 위치 기준과 필요 상황을 정보 중심으로 안내",
      hook: "안전손잡이는 낙상이 잦은 위치부터 설치를 검토하는데요",
      keyword: "노인용품 안전손잡이",
    },
  },
  {
    id: "senior_bathsafe",
    industry: "seniorgoods",
    name: "욕실안전용품",
    cat: "욕실안전용품",
    emoji: "🚿",
    titlePatterns: [
      "{region} 노인용품 욕실안전용품 무엇부터 준비할까요?",
      "{region} 어르신 욕실 안전용품 선택 기준",
      "{region} 노인용품 욕실안전용품 사용 대상 안내",
    ],
    keywords: ["욕실안전용품", "미끄럼방지매트", "욕실 안전바", "어르신 욕실"],
    compareWith: "일반 욕실용품",
    DIRECTION: {
      concern: "욕실에서 어르신이 미끄러지지 않도록 무엇을 준비해야 하는지",
      effect: "욕실안전용품 종류·설치 위치·사용 대상을 정보 중심으로 안내",
      hook: "욕실안전용품은 물기가 많은 공간 특성부터 살펴보고 고르는데요",
      keyword: "노인용품 욕실안전용품",
    },
  },
  {
    id: "senior_commode",
    industry: "seniorgoods",
    name: "이동변기",
    cat: "이동변기",
    emoji: "🚽",
    titlePatterns: [
      "{region} 노인용품 이동변기 선택 기준",
      "{region} 어르신 이동변기 확인할 사항",
      "{region} 노인용품 이동변기 사용 대상 안내",
    ],
    keywords: ["이동변기", "노인 이동변기", "어르신 변기", "좌변기"],
    compareWith: "일반 변기",
    DIRECTION: {
      concern: "거동이 불편한 어르신을 위한 이동변기를 어떻게 고르는지",
      effect: "이동변기 종류·선택 기준·사용 대상을 정보 중심으로 안내",
      hook: "이동변기는 어르신 거동 범위와 설치 공간부터 확인하는데요",
      keyword: "노인용품 이동변기",
    },
  },
  {
    id: "senior_bathchair",
    industry: "seniorgoods",
    name: "목욕의자",
    cat: "목욕의자",
    emoji: "🪑",
    titlePatterns: [
      "{region} 노인용품 목욕의자 선택 기준",
      "{region} 어르신 목욕의자 확인할 사항",
      "{region} 노인용품 목욕의자 사용 대상 안내",
    ],
    keywords: ["목욕의자", "샤워의자", "어르신 목욕의자", "목욕보조"],
    compareWith: "일반 욕실의자",
    DIRECTION: {
      concern: "목욕할 때 어르신이 앉을 수 있는 의자를 어떻게 고르는지",
      effect: "목욕의자 종류·선택 기준·사용 대상을 정보 중심으로 안내",
      hook: "목욕의자는 욕실 환경과 어르신 상태에 맞춰 고르는데요",
      keyword: "노인용품 목욕의자",
    },
  },
  {
    id: "senior_mattress",
    industry: "seniorgoods",
    name: "욕창예방매트리스",
    cat: "욕창예방매트리스",
    emoji: "🛌",
    titlePatterns: [
      "{region} 노인용품 욕창예방매트리스 사용 대상 안내",
      "{region} 어르신 욕창예방매트리스 확인할 사항",
      "{region} 노인용품 욕창예방매트리스 선택 기준",
    ],
    keywords: ["욕창예방매트리스", "에어매트", "욕창방지", "장기와상"],
    compareWith: "일반 매트리스",
    DIRECTION: {
      concern: "오래 누워 계신 어르신의 욕창을 예방하려면 어떤 매트리스가 필요한지",
      effect: "욕창예방매트리스 종류·사용 대상·관리 방법을 정보 중심으로 안내",
      hook: "욕창예방매트리스는 와상 기간과 어르신 상태부터 살펴보는데요",
      keyword: "노인용품 욕창예방매트리스",
    },
  },
  {
    id: "senior_antislip",
    industry: "seniorgoods",
    name: "미끄럼방지용품",
    cat: "미끄럼방지용품",
    emoji: "🧦",
    titlePatterns: [
      "{region} 노인용품 미끄럼방지용품 무엇이 있나요?",
      "{region} 어르신 미끄럼방지용품 사용 대상 안내",
      "낙상예방 {region} 노인용품 미끄럼방지용품 정리",
    ],
    keywords: ["미끄럼방지용품", "미끄럼방지양말", "미끄럼방지매트", "낙상예방"],
    compareWith: "일반 생활용품",
    DIRECTION: {
      concern: "집 안에서 어르신이 미끄러지지 않도록 어떤 용품이 도움이 되는지",
      effect: "미끄럼방지용품 종류·설치 위치·사용 대상을 정보 중심으로 안내",
      hook: "미끄럼방지용품은 낙상이 잦은 동선부터 점검하고 고르는데요",
      keyword: "노인용품 미끄럼방지용품",
    },
  },

  // ───────── 2차 정보형 메뉴 (5) ─────────
  {
    id: "senior_insurance",
    industry: "seniorgoods",
    name: "복지용구 보험적용",
    cat: "복지용구보험적용",
    emoji: "🩺",
    titlePatterns: [
      "{region} 복지용구 보험적용 어떻게 되나요?",
      "{region} 복지용구 보험적용 대상·절차 안내",
      "{region} 복지용구 보험적용 전 확인할 사항",
    ],
    keywords: ["복지용구 보험적용", "장기요양보험", "급여 대상", "보험 절차"],
    compareWith: "전액 자비 구매",
    DIRECTION: {
      concern: "노인용품이 보험 적용이 되는지, 어떤 절차를 거쳐야 하는지 막막함",
      effect: "장기요양보험 복지용구 급여 대상·적용 절차를 제도 정보로 안내",
      hook: "복지용구는 장기요양보험 급여 대상인지부터 확인하는 것이 시작인데요",
      keyword: "복지용구 보험적용",
    },
  },
  {
    id: "senior_grade",
    industry: "seniorgoods",
    name: "장기요양등급 복지용구",
    cat: "장기요양등급복지용구",
    emoji: "🏷️",
    titlePatterns: [
      "{region} 장기요양등급 복지용구 이용절차",
      "{region} 장기요양등급 후 복지용구 이용 안내",
      "{region} 장기요양등급 복지용구 신청은 어떻게 하나요?",
    ],
    keywords: ["장기요양등급", "등급신청", "복지용구 이용", "인정절차"],
    compareWith: "등급 외 일반구매",
    DIRECTION: {
      concern: "부모님이 복지용구를 이용하려면 어떤 등급이 필요한지, 절차가 막막함",
      effect: "장기요양등급 신청·인정절차·복지용구 이용 흐름을 제도 정보로 안내",
      hook: "복지용구는 장기요양등급부터 확인하는 것이 시작인데요",
      keyword: "장기요양등급 복지용구",
    },
  },
  {
    id: "senior_rental",
    industry: "seniorgoods",
    name: "복지용구 대여",
    cat: "복지용구대여",
    emoji: "🔄",
    titlePatterns: [
      "{region} 복지용구 대여 어떤 품목이 가능한가요?",
      "{region} 복지용구 대여 이용절차 안내",
      "{region} 복지용구 대여 전 확인할 사항",
    ],
    keywords: ["복지용구 대여", "대여 품목", "대여 절차", "이용조건"],
    compareWith: "복지용구 구매",
    DIRECTION: {
      concern: "복지용구를 대여로 이용할 수 있는지, 어떤 품목이 대여 대상인지",
      effect: "대여 가능 품목·이용절차·이용조건을 제도 기준으로 안내",
      hook: "복지용구는 대여와 구입 품목이 나뉘어 먼저 확인하는데요",
      keyword: "복지용구 대여",
    },
  },
  {
    id: "senior_purchase",
    industry: "seniorgoods",
    name: "복지용구 구매",
    cat: "복지용구구매",
    emoji: "🧾",
    titlePatterns: [
      "{region} 복지용구 구매 어떤 품목이 해당되나요?",
      "{region} 복지용구 구매 이용절차 안내",
      "{region} 복지용구 구매 전 확인할 사항",
    ],
    keywords: ["복지용구 구매", "구입 품목", "급여 구매", "이용절차"],
    compareWith: "복지용구 대여",
    DIRECTION: {
      concern: "복지용구를 구입으로 이용하는 경우 어떤 품목과 절차가 있는지",
      effect: "구입 품목·이용절차·확인 사항을 제도 기준으로 안내",
      hook: "복지용구 구입 품목은 위생·개인사용 특성을 기준으로 나뉘는데요",
      keyword: "복지용구 구매",
    },
  },
  {
    id: "senior_select",
    industry: "seniorgoods",
    name: "복지용구 선택방법",
    cat: "복지용구선택방법",
    emoji: "📋",
    titlePatterns: [
      "{region} 복지용구 선택방법 정리",
      "{region} 복지용구 무엇부터 준비할까요?",
      "{region} 복지용구 전문점 선택 전 확인할 사항",
    ],
    keywords: ["복지용구 선택방법", "전문점 선택", "선택 기준", "이용절차"],
    compareWith: "일반 의료기기 구매",
    DIRECTION: {
      concern: "어떤 복지용구를 어떤 기준으로 골라야 하는지, 전문점을 어떻게 고르는지",
      effect: "어르신 상태별 품목 선택 기준·전문점 선택 기준을 정보 중심으로 안내",
      hook: "복지용구는 어르신 상태와 생활 환경부터 살펴보고 고르는데요",
      keyword: "복지용구 선택방법",
    },
  },
];

// 정보블럭 데이터 — generateSeniorgoods.js INFO_BLOCKS에서 소비
export const SENIORGOODS_INFO_BLOCKS = {
  eligibility: {
    title: "이용대상",
    items: [
      "거동·일상생활이 불편한 어르신",
      "장기요양 1~5등급·인지지원등급 어르신(복지용구 급여 이용 시)",
      "낙상·욕창 예방 등 안전 보조가 필요한 어르신",
    ],
  },
  situation: {
    title: "제품이 필요한 상황",
    items: [
      "거동이 불편해 이동·보행 보조가 필요할 때",
      "욕실·화장실 낙상 위험이 있을 때",
      "장기 와상으로 욕창 예방이 필요할 때",
    ],
  },
  procedure: {
    title: "이용절차",
    items: [
      "어르신 상태·생활 환경 확인",
      "전문점 방문·상담 및 제품 안내",
      "복지용구 급여 이용 시 급여확인서 확인",
      "사용 안내 및 사후관리",
    ],
  },
  cost: {
    title: "보험적용·한도 안내",
    items: [
      `복지용구 급여 이용 시 연 한도: 1인당 연 ${WELFARE_LIMIT}(급여 범위 내)`,
      "본인부담금: 일반 15% / 감경 9%·6% / 기초생활수급 면제",
      "※ 등급·품목·대여/구입에 따라 달라지므로 정확한 내용은 상담 시 안내",
    ],
  },
  choice: {
    title: "선택 시 확인사항",
    items: ["어르신 상태·체형 적합성", "안전성·사용 편의", "사후관리·A/S", "복지용구 급여 처리 가능 여부"],
  },
  care: {
    title: "관리방법",
    items: ["사용 후 청결 관리", "정기 점검·소모품 교체", "보관 환경 확인", "이상 시 사용 중단 및 점검 문의"],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (1장만 있어도 가능)
// ① 매장 전경 ② 제품 진열 ③ 제품 상세 ④ 사용 예시 ⑤ 안내 이미지
export const SENIORGOODS_PHOTO_POOL = [
  { slot: "store", alt: "{region} 노인용품 전문점 전경" },
  { slot: "display", alt: "노인용품 제품 진열" },
  { slot: "detail", alt: "제품 상세" },
  { slot: "usage", alt: "사용 예시" },
  { slot: "guide", alt: "복지용구 안내 이미지" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const SENIORGOODS_COMPARE = {
  compareWith: "일반 생활용품 구매",
  compareWithText2: "전액 자비 구매",
};
