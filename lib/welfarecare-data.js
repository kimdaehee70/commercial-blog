// lib/welfarecare-data.js
// 복지용구 사업소 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 기관(복지용구 사업소/사회복지사). 정보형. 후기·체험·광고 금지.
// 복사 베이스: daycare-data.js → 데이터 교체 (제도설명부 재사용 계열)

// ★ 제도 변수 — 연 한도액. 제도 변경 시 이 상수 1곳만 수정(본문 출력 경로 effect/INFO_BLOCKS 연결).
//   주의: keywords의 "연 160만원"은 사용자 검색어축 → 상수화 제외(검색 의도 보존).
export const WELFARE_LIMIT = "160만원";

export const WELFARECARE_META = {
  industry: "welfarecare",
  label: "복지용구",
  fullLabel: "복지용구 사업소",
  greeting: "안녕하세요. {region} 복지용구 사업소입니다. 어르신 복지용구 안내를 도와드립니다.",
  voice: "기관(복지용구 사업소·사회복지사)",
  badge: "신규",
  // 결정주기: 가족의사결정 (보호자)
  decisionCycle: "family",
  // ★ 비용 단정 금지 — 본인부담금 전국 동일, 연 한도(160만원)·급여항목·등급 변수 → "상담 시 안내" 톤
  costTone: "consult", // 세부 금액 나열 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const WELFARECARE_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건",
  "완치", "치료보장", "효과보장", "의료기기 수준",
  // 비용 단정 차단
  "확정 비용", "정확한 금액 보장",
];

// 카테고리 탭 (1단계 출고 메뉴 8개)
export const WELFARECARE_CATS = [
  "장기요양등급",
  "복지용구신청방법",
  "전동침대",
  "휠체어",
  "보행기",
  "안전손잡이",
  "목욕용품",
  "복지용구한도액",
];

// ★ UI 표시용 라벨 — CATS 키는 배선 매칭축(변경 금지). 화면 노출 시 띄어쓰기만 보정.
//   index.js 탭/업종센터에서 CAT_LABELS[cat] || cat 로 소비.
export const WELFARECARE_CAT_LABELS = {
  복지용구신청방법: "복지용구 신청방법",
  복지용구한도액: "복지용구 한도액",
};

// ★ 품목 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword)
export const WELFARECARE_TREATMENTS = [
  {
    id: "welfare_grade",
    industry: "welfarecare",
    name: "장기요양등급",
    cat: "장기요양등급",
    emoji: "🏷️",
    titlePatterns: [
      "{region} 복지용구 장기요양등급 이용절차",
      "{region} 복지용구 등급신청은 어떻게 하나요?",
      "장기요양등급 후 {region} 복지용구 이용 안내",
    ],
    keywords: ["장기요양등급", "등급신청", "인정절차", "방문조사"],
    compareWith: "등급 외 일반구매",
    DIRECTION: {
      concern: "부모님이 복지용구를 이용하려면 어떤 등급이 필요한지, 신청 절차가 막막함",
      effect: "장기요양등급 신청·인정절차·방문조사 흐름을 제도 정보로 안내",
      hook: "복지용구는 장기요양등급부터 확인하는 것이 시작인데요",
      keyword: "장기요양등급",
    },
  },
  {
    id: "welfare_apply",
    industry: "welfarecare",
    name: "복지용구 신청방법",
    cat: "복지용구신청방법",
    emoji: "📋",
    titlePatterns: [
      "{region} 복지용구 신청방법 정리",
      "{region} 복지용구 이용절차 안내",
      "{region} 복지용구 사업소 선택 전 확인할 사항",
    ],
    keywords: ["복지용구 신청방법", "급여확인서", "이용절차", "사업소 선택"],
    compareWith: "일반 의료기기 구매",
    DIRECTION: {
      concern: "급여확인서가 뭔지, 어디서 어떻게 신청하는지 모름",
      effect: "급여확인서 발급·이용절차·사업소 선택 기준을 단계로 안내",
      hook: "복지용구 신청은 급여확인서 확인부터 시작되는데요",
      keyword: "복지용구 신청방법",
    },
  },
  {
    id: "welfare_bed",
    industry: "welfarecare",
    name: "전동침대",
    cat: "전동침대",
    emoji: "🛏️",
    titlePatterns: [
      "{region} 복지용구 전동침대 대여 전 확인사항",
      "{region} 전동침대 대여·설치 안내",
      "{region} 복지용구 전동침대 이용조건 정리",
    ],
    keywords: ["전동침대 대여", "전동침대 설치", "복지용구 침대", "이용조건"],
    compareWith: "일반 침대 구매",
    DIRECTION: {
      concern: "전동침대를 대여할 수 있는지, 설치와 이용조건이 어떻게 되는지",
      effect: "대여 가능 여부·설치 절차·이용조건을 제도 기준으로 안내",
      hook: "전동침대는 대여 품목으로 이용조건을 먼저 확인하는데요",
      keyword: "복지용구 전동침대",
    },
  },
  {
    id: "welfare_wheelchair",
    industry: "welfarecare",
    name: "휠체어",
    cat: "휠체어",
    emoji: "♿",
    titlePatterns: [
      "{region} 복지용구 휠체어 대여방법 안내",
      "{region} 수동휠체어 이용 전 확인할 사항",
      "{region} 복지용구 휠체어 어떻게 신청하나요?",
    ],
    keywords: ["수동휠체어", "휠체어 대여방법", "복지용구 휠체어", "휠체어 이용"],
    compareWith: "사설 휠체어 구매",
    DIRECTION: {
      concern: "어떤 휠체어를 대여할 수 있는지, 신청 방법이 궁금함",
      effect: "수동휠체어 대여 절차·이용 기준을 제도 정보로 안내",
      hook: "휠체어는 어르신 상태에 따라 품목이 달라지는데요",
      keyword: "복지용구 휠체어",
    },
  },
  {
    id: "welfare_walker",
    industry: "welfarecare",
    name: "보행기",
    cat: "보행기",
    emoji: "🚶",
    titlePatterns: [
      "{region} 복지용구 보행기 선택 기준",
      "{region} 성인용보행기·실버카 이용 안내",
      "{region} 복지용구 보행기 어떤 종류가 있나요?",
    ],
    keywords: ["성인용보행기", "실버카", "복지용구 보행기", "보행보조"],
    compareWith: "지팡이 사용",
    DIRECTION: {
      concern: "어르신 거동에 맞는 보행기가 무엇인지 막막함",
      effect: "성인용보행기·실버카 종류와 선택 기준을 운영 정보로 안내",
      hook: "보행기는 어르신 거동 상태에 따라 종류를 고르는데요",
      keyword: "복지용구 보행기",
    },
  },
  {
    id: "welfare_handle",
    industry: "welfarecare",
    name: "안전손잡이",
    cat: "안전손잡이",
    emoji: "🔧",
    titlePatterns: [
      "{region} 복지용구 안전손잡이 설치가 필요한 경우",
      "{region} 화장실·침실 안전손잡이 설치 안내",
      "낙상예방 {region} 복지용구 안전손잡이 정리",
    ],
    keywords: ["안전손잡이", "화장실 안전바", "침실 안전손잡이", "낙상예방"],
    compareWith: "설치 없이 사용",
    DIRECTION: {
      concern: "집 안 어디에 안전손잡이를 설치해야 낙상을 막을 수 있는지",
      effect: "화장실·침실·현관 설치 위치 기준과 필요 상황을 안내",
      hook: "안전손잡이는 낙상이 잦은 위치부터 설치를 검토하는데요",
      keyword: "복지용구 안전손잡이",
    },
  },
  {
    id: "welfare_bath",
    industry: "welfarecare",
    name: "목욕용품",
    cat: "목욕용품",
    emoji: "🚿",
    titlePatterns: [
      "{region} 복지용구 목욕의자 선택 기준",
      "{region} 목욕의자·이동변기 이용 안내",
      "{region} 복지용구 목욕용품 무엇부터 준비할까요?",
    ],
    keywords: ["목욕의자", "이동변기", "복지용구 목욕용품", "목욕보조"],
    compareWith: "일반 욕실용품",
    DIRECTION: {
      concern: "목욕·배변 보조용품을 어떻게 골라야 안전한지",
      effect: "목욕의자·이동변기 선택 기준과 이용 방법을 안내",
      hook: "목욕용품은 욕실 환경과 어르신 상태에 맞춰 고르는데요",
      keyword: "복지용구 목욕용품",
    },
  },
  {
    id: "welfare_limit",
    industry: "welfarecare",
    name: "복지용구 한도액",
    cat: "복지용구한도액",
    emoji: "💳",
    titlePatterns: [
      "{region} 복지용구 한도액 알아보기",
      "{region} 복지용구 연 한도·본인부담금 안내",
      "{region} 복지용구 본인부담금은 어떻게 되나요?",
    ],
    keywords: ["복지용구 한도액", "연 160만원", "본인부담금", "급여 한도"],
    compareWith: "전액 자비 구매",
    DIRECTION: {
      concern: "연 한도가 얼마인지, 본인부담금이 어떻게 되는지 불안",
      effect: `연 한도(${WELFARE_LIMIT}) 구조와 본인부담금(15%·감경·면제)을 단정 없이 안내`,
      hook: "복지용구는 연 한도 안에서 본인부담금 구조부터 안내드리면",
      keyword: "복지용구 한도액",
    },
  },
];

// 정보블럭 데이터 — generateWelfarecare.js INFO_BLOCKS에서 소비
export const WELFARECARE_INFO_BLOCKS = {
  eligibility: {
    title: "이용대상",
    items: [
      "장기요양 1~5등급 판정 어르신",
      "인지지원등급 어르신",
      "급여확인서상 복지용구 급여 대상 어르신",
    ],
  },
  procedure: {
    title: "이용절차",
    items: [
      "장기요양등급 확인(급여확인서)",
      "복지용구 사업소 방문·상담",
      "품목 선택(대여 또는 구입) 및 계약",
      "배송·설치 및 사용 안내",
    ],
  },
  cost: {
    title: "비용·한도 안내",
    items: [
      `연 한도: 1인당 연 ${WELFARE_LIMIT}(급여 범위 내)`,
      "본인부담금: 일반 15% / 감경 9%·6% / 기초생활수급 면제",
      "※ 등급·품목·대여/구입에 따라 달라지므로 정확한 금액은 상담 시 안내",
    ],
  },
  choice: {
    title: "사업소 선택 기준",
    items: ["급여확인서 처리 경험", "품목 구비 현황(전시장)", "배송·설치·사후관리", "상담·방문 가능 여부"],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (1장만 있어도 가능)
export const WELFARECARE_PHOTO_POOL = [
  { slot: "bed", alt: "{region} 복지용구 전동침대" },
  { slot: "wheelchair", alt: "수동휠체어" },
  { slot: "handle", alt: "안전손잡이 설치 예시" },
  { slot: "showroom", alt: "복지용구 사업소 전시장" },
  { slot: "bath", alt: "목욕의자·이동변기" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const WELFARECARE_COMPARE = {
  compareWith: "일반 의료기기 구매",
  compareWithText2: "전액 자비 구매",
};
