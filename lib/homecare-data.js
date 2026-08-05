// lib/homecare-data.js
// 방문요양 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 기관(방문요양센터/사회복지사). 정보형. 후기·체험·광고 금지.
// 복사 베이스: daycare-data.js → narrative 분리(시설→가정방문)
//
// [contamination 차단 — Naver §3 / PHILOSOPHY]
//   데이케어 = 시설에 모시는 구조(어떤 곳인가)
//   방문요양 = 요양보호사가 집으로 오는 구조(누가 우리집에 오는가)
//   PHOTO_POOL·FORBIDDEN·INFO_BLOCKS 별도. narrative 공유 금지.
//
// [제외 방향] 요양보호사 자격증·채용·구인·구직(보호자 검색과 거리 멈)
// [치매] 독립 cat 아님 — 등급/퇴원후/가족요양 내 상황 묘사로만 흡수(효과표현 금지)

export const HOMECARE_META = {
  industry: "homecare",
  label: "방문요양",
  fullLabel: "방문요양(재가 방문요양)",
  greeting: "안녕하세요. {region} 방문요양센터입니다. 어르신 재가 돌봄 안내를 도와드립니다.",
  voice: "기관(방문요양센터·사회복지사)",
  badge: "신규",
  // 결정주기: 가족의사결정 (어르신 본인 아님 — 보호자가 검색·결정·지불)
  decisionCycle: "family",
  // ★ 비용 단정 금지 — 본인부담금 전국 동일, 등급·시간·가산·감경 변수 → "상담 시 안내" 톤
  costTone: "consult", // 세부 금액 나열 금지
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
export const HOMECARE_FORBIDDEN = [
  "최고", "1위", "전국 최고", "무조건",
  "완치", "치료보장", "효과보장", "전문병원 수준",
  // 비용 단정 차단
  "확정 비용", "정확한 금액 보장",
  // 제외 방향 차단(보호자 검색과 거리 멈 — 구인구직·자격증 오염 방지)
  "요양보호사 자격증", "요양보호사 채용", "구인", "구직", "모집", "시급",
];

// 카테고리 탭 (확정 메뉴 7개 — 상담3 / 신뢰2 / 비교1 / 진입1)
export const HOMECARE_CATS = [
  "장기요양등급",        // 상담축
  "방문요양비용",        // 상담축
  "신청방법",            // 상담축
  "가족요양",            // 신뢰축
  "방문요양vs요양원",    // 비교축
  "병원퇴원후돌봄",      // 진입축
  "센터선택기준",        // 신뢰축
];

// ★ 서비스 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword) — 없으면 GPT가 전부 같은 방향으로 씀
export const HOMECARE_TREATMENTS = [
  {
    id: "homecare_grade",
    industry: "homecare",
    name: "장기요양등급",
    cat: "장기요양등급",
    emoji: "🏷️",
    titlePatterns: [
      "{region} 방문요양 장기요양등급부터 알아보기",
      "장기요양 4등급이면 {region} 방문요양 이용 가능할까요?",
      "{region} 방문요양 등급 신청부터 이용까지",
    ],
    keywords: ["장기요양등급", "인정조사", "의사소견서", "방문요양 등급"],
    compareWith: "요양원",
    DIRECTION: {
      concern: "부모님이 방문요양을 받을 수 있는 등급인지, 신청은 어떻게 하는지 모름",
      effect: "장기요양등급 신청 절차(인정조사·의사소견서)와 등급별 이용 범위 안내",
      hook: "방문요양은 장기요양등급이 있어야 이용 가능한데 신청부터 안내드리면",
      keyword: "장기요양등급",
    },
  },
  {
    id: "homecare_cost",
    industry: "homecare",
    name: "방문요양 비용(본인부담금)",
    cat: "방문요양비용",
    emoji: "💳",
    titlePatterns: [
      "{region} 방문요양 비용, 본인부담금 얼마나",
      "{region} 방문요양 월 이용료는 어떻게 되나요?",
      "{region} 방문요양 본인부담금·감경제도 안내",
    ],
    keywords: ["방문요양 비용", "본인부담금", "월 이용료", "감경제도"],
    compareWith: "요양원 비용",
    DIRECTION: {
      concern: "한 달에 얼마가 드는지, 감경 대상이 되는지 불안",
      effect: "본인부담금 구조(15%·감경 9·6%·면제)와 이용시간별 변동을 단정 없이 안내",
      hook: "비용은 등급과 이용시간에 따라 달라지는데 구조부터 안내드리면",
      keyword: "방문요양 비용",
    },
  },
  {
    id: "homecare_apply",
    industry: "homecare",
    name: "방문요양 신청방법",
    cat: "신청방법",
    emoji: "📋",
    titlePatterns: [
      "{region} 방문요양 신청, 어디서부터 시작하나요?",
      "{region} 방문요양 신청 절차와 준비서류 정리",
      "{region} 방문요양 이용 순서 한눈에",
    ],
    keywords: ["방문요양 신청", "이용순서", "준비서류", "방문요양 절차"],
    compareWith: "주간보호센터",
    DIRECTION: {
      concern: "방문요양을 어디서부터 어떻게 신청하는지 막막함",
      effect: "등급 신청부터 센터 계약·서비스 개시까지 이용 순서와 준비서류 안내",
      hook: "방문요양은 신청부터 이용까지 순서가 정해져 있는데 차례로 안내드리면",
      keyword: "방문요양 신청",
    },
  },
  {
    id: "homecare_family",
    industry: "homecare",
    name: "가족요양",
    cat: "가족요양",
    emoji: "👨‍👩‍👧",
    titlePatterns: [
      "{region} 가족요양, 딸·아들도 가능한가요?",
      "{region} 방문요양 가족이 직접 돌볼 수 있을까요?",
      "{region} 가족요양 자격과 이용 방법 안내",
    ],
    keywords: ["가족요양", "가족 요양보호사", "가족 수발", "방문요양 가족"],
    compareWith: "일반 방문요양",
    DIRECTION: {
      concern: "가족이 직접 부모님을 돌보면서 급여도 받을 수 있는지 궁금",
      effect: "가족요양 가능 조건과 일반 방문요양과의 차이를 제도 기준으로 안내",
      hook: "가족이 직접 어르신을 돌보는 가족요양이 가능한 경우를 안내드리면",
      keyword: "가족요양",
    },
  },
  {
    id: "homecare_vs_nursinghome",
    industry: "homecare",
    name: "방문요양 vs 요양원",
    cat: "방문요양vs요양원",
    emoji: "⚖️",
    titlePatterns: [
      "{region} 방문요양과 요양원, 무엇이 다를까요?",
      "집에서 모실까 요양원에 모실까 {region} 고민이라면",
      "{region} 방문요양 vs 요양원 선택 기준 정리",
    ],
    keywords: ["방문요양 요양원 차이", "재가 시설 비교", "집 돌봄 시설 돌봄", "요양 선택"],
    compareWith: "요양원",
    DIRECTION: {
      concern: "집에서 모실지 요양원에 모실지 결정하기 어려움",
      effect: "재가(방문요양)와 시설(요양원)의 돌봄 방식·비용·생활 차이를 균형 있게 안내",
      hook: "집에서 모실지 시설에 모실지는 가장 큰 고민인데 차이부터 정리드리면",
      keyword: "방문요양 요양원 차이",
    },
  },
  {
    id: "homecare_afterdischarge",
    industry: "homecare",
    name: "병원 퇴원 후 돌봄",
    cat: "병원퇴원후돌봄",
    emoji: "🏥",
    titlePatterns: [
      "{region} 병원 퇴원 후 부모님 돌봄, 어떻게 이어갈까요?",
      "퇴원 후 거동 불편한 어르신 {region} 방문요양",
      "{region} 병원 퇴원 후 방문요양 연결 안내",
    ],
    keywords: ["퇴원 후 돌봄", "퇴원 후 방문요양", "거동불편 어르신", "재가 돌봄 연결"],
    compareWith: "요양병원",
    DIRECTION: {
      concern: "퇴원했는데 거동이 불편한 부모님을 집에서 어떻게 돌볼지 막막함",
      effect: "퇴원 직후 등급 신청과 방문요양 연결 절차, 초기 돌봄 흐름 안내",
      hook: "막 퇴원하신 어르신은 집에서의 돌봄 연결이 급한데 순서를 안내드리면",
      keyword: "퇴원 후 방문요양",
    },
  },
  {
    id: "homecare_selectcenter",
    industry: "homecare",
    name: "방문요양센터 선택기준",
    cat: "센터선택기준",
    emoji: "🔎",
    titlePatterns: [
      "{region} 방문요양센터 어떻게 골라야 할까요?",
      "{region} 좋은 방문요양센터 선택 기준 정리",
      "{region} 방문요양센터 비교할 때 확인할 점",
    ],
    keywords: ["방문요양센터 선택", "방문요양센터 비교", "요양보호사 매칭", "센터 확인사항"],
    compareWith: "주간보호센터",
    DIRECTION: {
      concern: "어느 방문요양센터를 골라야 할지, 무엇을 확인해야 할지 모름",
      effect: "요양보호사 매칭·서비스 범위·운영 신뢰도 등 센터 확인 기준 안내",
      hook: "방문요양센터를 고를 때 무엇을 확인해야 하는지 기준을 안내드리면",
      keyword: "방문요양센터 선택",
    },
  },
];

// 정보블럭 → prompts.renderInfoBlocks가 Object.values 순회
// [방문요양 narrative] 시설 서비스 아님 — 가정 방문 기준으로 재작성
export const HOMECARE_INFO_BLOCKS = {
  eligibility: {
    title: "이용대상",
    items: [
      "장기요양 1~5등급 판정 어르신",
      "인지지원등급 어르신",
      "퇴원 후 거동이 불편해 가정 내 돌봄이 필요한 어르신",
    ],
  },
  service: {
    title: "주요 서비스",
    items: [
      "신체활동 지원(세면·식사·이동 보조)",
      "가사·일상생활 지원",
      "방문목욕",
      "병원 동행·외출 지원",
      "복약·건강상태 확인",
    ],
  },
  cost: {
    title: "이용비용 안내",
    items: [
      "본인부담금: 일반 15% / 감경 9%·6% / 기초생활수급 면제(급여항목)",
      "이용시간(방문 횟수·시간)에 따라 월 한도 내에서 산정",
      "※ 등급·이용시간·가산에 따라 달라지므로 정확한 금액은 상담 시 안내",
    ],
  },
  choice: {
    title: "센터 선택 기준",
    items: [
      "요양보호사 매칭·교체 지원 체계",
      "제공 서비스 범위(방문목욕·동행 포함 여부)",
      "이용시간·요일 조정 가능 여부",
      "센터 운영 신뢰도(소재지·상담 응대)",
    ],
  },
};

// 사진 슬롯 — [방문요양 narrative] 가정 방문 장면. 시설 외관 아님.
export const HOMECARE_PHOTO_POOL = [
  { slot: "visit", alt: "{region} 방문요양 가정 방문" },
  { slot: "care", alt: "요양보호사 어르신 돌봄" },
  { slot: "meal", alt: "식사·일상생활 지원" },
  { slot: "bath", alt: "방문목욕 서비스" },
  { slot: "accompany", alt: "병원 동행·외출 지원" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const HOMECARE_COMPARE = {
  compareWith: "요양원",
  compareWithText2: "주간보호센터",
};
