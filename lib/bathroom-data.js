// lib/bathroom-data.js
// 욕실리모델링(bathroom) 업종 데이터셋 — v1 / 정보형 + 욕실 리모델링·교체·보수 안내 가이드형
// 화자 = {region} 욕실리모델링 업체. 정보형(욕실리모델링·타일·욕조·샤워부스·수전·환풍기·천장·실리콘·배수구·거울장·세면대·변기).
//   후기·체험·과장광고·추천·만족도·최저가·할인·이벤트·전화/상담/견적 유도 금지.
// 복제 베이스: homefix-data.js 40% (정보형 섹션루프 구조 동형) + sinkrepair 30% + plumbing 20%(PHOTO_POOL 슬롯) + grout 10%.
//   섹션축만 욕실리모델링형으로 교체. industry='bathroom' 고정.
//
// 설계 핵심 (SOP v4.2 + 욕실리모델링 작업지시서):
//   - 욕실 리모델링·교체·보수 정보형. 출장·현장방문 업종 → APT 미사용(useApt 전부 false). region 문자열만.
//     (베이스 4개 실측 결과 전부 useApt:false. APT_DATA 추가 구현 안 함 — v2 검토. 대표지역+생활권 구조.)
//   - 흐름: 인사 → 정보 → 작업범위 → 관리방법 → 마무리. (도입 → 사진 → 작업범위 → 점검·확인 → 진행절차 → 관리방법 → 마무리)
//   - 관련도 노출 축 = 욕실리모델링 / 타일 / 욕조 / 샤워부스 / 수전 / 환풍기 / 천장 / 실리콘 / 배수구 / 거울장·욕실장 / 세면대 / 변기.
//   - 타업종 오염 차단: 집수리(homefix)·싱크대수리(sinkrepair)·수도설비(plumbing)·줄눈(grout)·인테리어 화자 혼입 금지.
//
// ★ 절대 금지(정보형 고정): 후기·만족도·추천·최저가·할인·이벤트·전화/상담/견적 유도·과장광고·1등·최고·100%·완벽·강력추천·무조건·고객감동·시공후기·체험·홍보.
//   작업일지형(다녀왔습니다·시공했습니다·출동했습니다·당일출동·즉시방문) 차단.
//   ★ 타업종 영역 차단: 종합 인테리어(도배·장판·주방가구제작)·전기공사(분전반·배선·승압)·줄눈 단독시공 과확장 금지.
//
// ★ cat ↔ INFO_BLOCK 1:1 (12 cat = 12 block, UNDEFINED 0). 박제 0종.
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const BATHROOM_META = {
  industry: "bathroom",
  label: "욕실리모델링",
  fullLabel: "욕실리모델링 안내",
  greeting: "안녕하세요. {region} 욕실리모델링 업체입니다.",
  voice: "{region} 욕실리모델링 업체",
  badge: "신규",
  // 결정주기: 노후·파손·리모델링 시점 기반(교체·보수·시공 대응)
  decisionCycle: "compare",
  // 비용 단정 금지 — 자재·구조·시공 범위 변수 → "영향 요소" 톤
  costTone: "consult",
  synonyms: ["욕실리모델링", "화장실리모델링", "욕실수리"],
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 과장·후기·작업일지·보장·추천·순위·할인유도 + 지시서 금지어 + 타업종 오염 차단
export const BATHROOM_FORBIDDEN = [
  // 과장·광고 (지시서 금지어 포함)
  "최저가", "무조건", "업계 최고", "1등 업체", "1등", "1위", "최고", "역대급", "초대박", "대박",
  "100% 해결", "100%해결", "100%", "완벽",
  // 보장·추천·순위 (정보형 고정)
  "보장", "효과 보장", "반드시", "추천드립니다", "강력 추천", "강력추천", "추천 업체", "강추", "순위", "추천",
  // 할인·이벤트·유도
  "할인", "특가", "이벤트", "프로모션", "지금 전화", "전화주세요", "상담 신청", "견적 문의",
  "문의주세요", "연락주세요", "지금 상담",
  // 후기·체험담·작업일지형·홍보 (지시서 금지어 포함)
  "직접 해봤", "내돈내산", "후기입니다", "고객님 후기", "실제 시공 후기", "시공후기", "만족도", "만족", "재이용", "후기",
  "고객감동", "체험", "홍보",
  "다녀왔습니다", "고쳐드렸습니다", "시공했습니다", "출동했습니다", "긴급출동", "당일출동", "즉시방문",
  "확 달라진", "환골탈태", "전문가가 직접", "전후사진",
  // 단정형 해결
  "즉시 해결", "당일 해결", "확실히 해결", "완벽 해결",
  // 타업종 영역 차단 (종합 인테리어·주방가구·전기공사 과확장)
  "도배", "장판", "주방가구제작", "붙박이장", "분전반", "배선공사", "승압",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 12개 — cat 12종 1:1)
//   ★ 1차 확정 12개. 지시서 22개 후보 중 핵심군으로 압축(실측 후 추가 가능 명시 준수).
//      세부 메뉴(부분리모델링·타일보수·욕조철거·파티션·해바라기수전·천장·악세사리 등)는 v1.1 확장 여지.
export const BATHROOM_CATS = [
  "욕실리모델링",
  "화장실리모델링",
  "욕실타일",
  "욕조교체",
  "샤워부스",
  "변기교체",
  "세면대교체",
  "욕실수전",
  "욕실환풍기",
  "욕실실리콘",
  "욕실배수구",
  "거울장",
  // [v-menu 2026-07-27] 메뉴 확장 1종. bt_fan.compareWith가 참조하던 미존재 메뉴 정합.
  "욕실천장",
];

// ─────────────────────────────────────────────────────────────
// 제목 패턴 — data.js 소유. 생성기는 소비만 한다.
//   ★ 출장업종 → {aptName}/{livingArea} 토큰 미사용. {region} {menu} 축만.
//   ★ region 중복 방지: 패턴 내 {region} 1회만.
// ─────────────────────────────────────────────────────────────
const TP = (kase) => [
  `{region} ${kase}`,
  `{region} ${kase} 안내`,
  `{region} ${kase} 관리방법`,
  `{region} ${kase} 교체 전 확인사항`,
  `{region} ${kase} 점검방법`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 12개. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 정보형 섹션축(작업범위·점검항목·발생원인·관리방법).
//   useApt 전부 false (출장업종). weight 합계 100.
//   weight: 10/9/12/9/9/8/8/8/7/7/7/6 = 100
// ─────────────────────────────────────────────────────────────
export const BATHROOM_TREATMENTS = [
  // ── 욕실리모델링 (대표) ──────────────────────
  {
    id: "bt_remodel", industry: "bathroom", name: "욕실리모델링", cat: "욕실리모델링", emoji: "🛁",
    infoKey: "remodel",
    titlePatterns: TP("욕실리모델링"),
    keywords: ["욕실리모델링", "욕실 리모델링", "욕실 전체 교체", "노후 욕실"],
    analysisAxis: ["시공 범위 구분(전체·부분)", "노후·누수·곰팡이 상태", "작업 범위", "관리 방법"],
    useApt: false, compareWith: "화장실리모델링", rank: 1, recommendedWeight: 9,
  },

  // ── 화장실리모델링 ───────────────────────────
  {
    id: "bt_toilet_remodel", industry: "bathroom", name: "화장실리모델링", cat: "화장실리모델링", emoji: "🚽",
    infoKey: "toilet_remodel",
    titlePatterns: TP("화장실리모델링"),
    keywords: ["화장실리모델링", "화장실 리모델링", "화장실 교체", "화장실 수리"],
    analysisAxis: ["시공 범위 구분", "방수·배수 상태", "작업 범위", "관리 방법"],
    useApt: false, compareWith: "욕실리모델링", rank: 1, recommendedWeight: 8,
  },

  // ── 욕실타일 (교체·보수) ─────────────────────
  {
    id: "bt_tile", industry: "bathroom", name: "욕실타일교체", cat: "욕실타일", emoji: "⬜",
    infoKey: "tile",
    titlePatterns: TP("욕실타일교체"),
    keywords: ["욕실타일교체", "욕실 타일 교체", "욕실타일보수", "타일 들뜸"],
    analysisAxis: ["타일 들뜸·균열·탈락 상태", "교체·덧방·보수 범위 구분", "방수층 확인", "관리 방법"],
    useApt: false, compareWith: "욕실리모델링", rank: 1, recommendedWeight: 11,
  },

  // ── 욕조교체 ─────────────────────────────────
  {
    id: "bt_bathtub", industry: "bathroom", name: "욕조교체", cat: "욕조교체", emoji: "🛀",
    infoKey: "bathtub",
    titlePatterns: TP("욕조교체"),
    keywords: ["욕조교체", "욕조 교체", "욕조 철거", "욕조 설치"],
    analysisAxis: ["기존 욕조 철거 범위", "급배수·방수 연결부 확인", "규격·재질 구분", "관리 방법"],
    useApt: false, compareWith: "샤워부스설치", rank: 1, recommendedWeight: 8,
  },

  // ── 샤워부스 (설치·교체) ─────────────────────
  {
    id: "bt_booth", industry: "bathroom", name: "샤워부스설치", cat: "샤워부스", emoji: "🚿",
    infoKey: "booth",
    titlePatterns: TP("샤워부스설치"),
    keywords: ["샤워부스설치", "샤워부스 설치", "샤워부스 교체", "유리 파티션"],
    analysisAxis: ["설치 공간·구조 확인", "유리·프레임 유형 구분", "방수·배수 여건", "관리 방법"],
    useApt: false, compareWith: "욕조교체", rank: 1, recommendedWeight: 8,
  },

  // ── 변기교체 ─────────────────────────────────
  {
    id: "bt_toilet", industry: "bathroom", name: "변기교체", cat: "변기교체", emoji: "🚽",
    infoKey: "toilet",
    titlePatterns: TP("변기교체"),
    keywords: ["변기교체", "변기 교체", "양변기 교체", "변기 누수"],
    analysisAxis: ["기존 변기 철거·누수 상태", "급수·배수 연결부 확인", "규격(배수 간격) 구분", "관리 방법"],
    useApt: false, compareWith: "세면대교체", rank: 1, recommendedWeight: 8,
  },

  // ── 세면대교체 ───────────────────────────────
  {
    id: "bt_basin", industry: "bathroom", name: "세면대교체", cat: "세면대교체", emoji: "🪞",
    infoKey: "basin",
    titlePatterns: TP("세면대교체"),
    keywords: ["세면대교체", "세면대 교체", "세면기 교체", "세면대 누수"],
    analysisAxis: ["기존 세면대 철거 상태", "급배수·수전 연결부 확인", "유형(반다리·언더·일체형) 구분", "관리 방법"],
    useApt: false, compareWith: "변기교체", rank: 1, recommendedWeight: 8,
  },

  // ── 욕실수전 (교체) ──────────────────────────
  {
    id: "bt_faucet", industry: "bathroom", name: "욕실수전교체", cat: "욕실수전", emoji: "🚰",
    infoKey: "faucet",
    titlePatterns: TP("욕실수전교체"),
    keywords: ["욕실수전교체", "욕실 수전 교체", "샤워수전 교체", "해바라기수전"],
    analysisAxis: ["수전 유형(세면·샤워·해바라기) 구분", "누수·노후 증상", "연결부·규격 확인", "관리 방법"],
    useApt: false, compareWith: "세면대교체", rank: 1, recommendedWeight: 8,
  },

  // ── 욕실환풍기 (교체) ────────────────────────
  {
    id: "bt_fan", industry: "bathroom", name: "욕실환풍기교체", cat: "욕실환풍기", emoji: "🌀",
    infoKey: "fan",
    titlePatterns: TP("욕실환풍기교체"),
    keywords: ["욕실환풍기교체", "욕실 환풍기 교체", "환풍기 소음", "환풍기 작동 불량"],
    analysisAxis: ["소음·작동 불량·곰팡이 증상", "규격·배기 경로 확인", "교체 범위", "관리 방법"],
    useApt: false, compareWith: "욕실천장교체", rank: 1, recommendedWeight: 7,
  },

  // ── 욕실실리콘 (교체·보수) ───────────────────
  {
    id: "bt_silicone", industry: "bathroom", name: "욕실실리콘교체", cat: "욕실실리콘", emoji: "🧴",
    infoKey: "silicone",
    titlePatterns: TP("욕실실리콘교체"),
    keywords: ["욕실실리콘교체", "욕실 실리콘 교체", "곰팡이 실리콘", "코킹 보수"],
    analysisAxis: ["기존 실리콘 노후·곰팡이 상태", "제거·재시공 범위", "방수 부위 구분", "관리 방법"],
    useApt: false, compareWith: "욕실타일교체", rank: 1, recommendedWeight: 7,
  },

  // ── 욕실배수구 (교체·보수) ───────────────────
  {
    id: "bt_drain", industry: "bathroom", name: "욕실배수구교체", cat: "욕실배수구", emoji: "🕳️",
    infoKey: "drain",
    titlePatterns: TP("욕실배수구교체"),
    keywords: ["욕실배수구교체", "욕실 배수구 교체", "배수구 냄새", "트랩 교체"],
    analysisAxis: ["냄새·역류·배수 불량 증상", "트랩·커버 유형 구분", "교체 범위", "관리 방법"],
    useApt: false, compareWith: "욕실실리콘교체", rank: 1, recommendedWeight: 7,
  },

  // ── 거울장·욕실장 (교체) ─────────────────────
  {
    id: "bt_cabinet", industry: "bathroom", name: "거울장교체", cat: "거울장", emoji: "🪟",
    infoKey: "cabinet",
    titlePatterns: TP("거울장교체"),
    keywords: ["거울장교체", "욕실 거울장 교체", "욕실장 교체", "수납장 교체"],
    analysisAxis: ["기존 거울장·욕실장 상태", "벽 고정·하중 확인", "유형·규격 구분", "관리 방법"],
    useApt: false, compareWith: "세면대교체", rank: 1, recommendedWeight: 6,
  },

  // ══ [v-menu 2026-07-27] 메뉴 확장 1종 ═══════════════════════
  {
    id: "bt_ceiling", industry: "bathroom", name: "욕실천장교체", cat: "욕실천장", emoji: "🔲",
    infoKey: "ceiling",
    titlePatterns: TP("욕실천장교체"),
    keywords: ["욕실천장교체", "욕실 천장 교체", "화장실 천장", "돔천장 교체"],
    analysisAxis: ["작업 범위", "점검 항목", "발생 원인", "관리 방법"],
    useApt: false, compareWith: "욕실환풍기교체", rank: 1, recommendedWeight: 5,
  },
];

// 정보블럭 데이터 — generateBathroom.js pickInfoBlock에서 소비
//   ★ cat 12종 = block 12종 1:1. 박제 0종. 절차·체크포인트 등 시점 무관 구조 정보만.
export const BATHROOM_INFO_BLOCKS = {
  remodel: {
    title: "욕실리모델링 확인 포인트",
    items: [
      "시공 범위(전체·부분) 구분",
      "방수·배수·노후 배관 상태 확인",
      "타일·위생도기·수전 교체 범위",
      "※ 정확한 범위는 현장 확인 후 판단",
    ],
  },
  toilet_remodel: {
    title: "화장실리모델링 확인 포인트",
    items: [
      "방수층·배수 구배 상태 확인",
      "위생도기(변기·세면대) 교체 범위",
      "타일·천장·환기 구성 구분",
      "※ 작업 범위는 현장 확인 후 판단",
    ],
  },
  tile: {
    title: "욕실타일교체 확인 포인트",
    items: [
      "타일 들뜸·균열·탈락 상태",
      "철거 후 교체 / 덧방 / 부분 보수 구분",
      "방수층·바탕면 상태 확인",
      "줄눈·실리콘 마감 부위 확인",
    ],
  },
  bathtub: {
    title: "욕조교체 확인 포인트",
    items: [
      "기존 욕조 철거 범위·방식",
      "급수·배수 연결부 상태 확인",
      "규격·재질(아크릴·인조대리석) 구분",
      "방수·실리콘 마감 부위 확인",
    ],
  },
  booth: {
    title: "샤워부스 확인 포인트",
    items: [
      "설치 공간·바닥 구조 확인",
      "유리·프레임 유형 구분",
      "방수·배수 경사 여건 확인",
      "도어 방식(여닫이·슬라이딩) 구분",
    ],
  },
  toilet: {
    title: "변기교체 확인 포인트",
    items: [
      "기존 변기 누수·노후 상태",
      "급수·배수 연결부 확인",
      "배수 간격(벽~중심) 규격 확인",
      "바닥 고정·실리콘 마감 확인",
    ],
  },
  basin: {
    title: "세면대교체 확인 포인트",
    items: [
      "기존 세면대 철거·누수 상태",
      "급배수·수전 연결부 확인",
      "유형(반다리·언더·일체형) 구분",
      "벽 고정·하중 부위 확인",
    ],
  },
  faucet: {
    title: "욕실수전교체 확인 포인트",
    items: [
      "수전 유형(세면·샤워·해바라기) 구분",
      "누수·물줄기 약함·노후 증상",
      "연결부 규격·벽 간격 확인",
      "온수·냉수 연결 방향 확인",
    ],
  },
  fan: {
    title: "욕실환풍기교체 확인 포인트",
    items: [
      "소음·진동·작동 불량 증상",
      "규격(타공 크기)·풍량 확인",
      "배기 경로·덕트 연결 상태",
      "전원 연결·천장 고정 확인",
    ],
  },
  silicone: {
    title: "욕실실리콘교체 확인 포인트",
    items: [
      "기존 실리콘 노후·곰팡이 상태",
      "제거·재시공 범위",
      "방수 부위(욕조·세면대·코너) 구분",
      "건조·양생 시간 확인",
    ],
  },
  drain: {
    title: "욕실배수구교체 확인 포인트",
    items: [
      "냄새·역류·배수 지연 증상",
      "트랩(P·U)·커버 유형 구분",
      "교체·청소·실리콘 마감 범위",
      "배수 구배·연결부 확인",
    ],
  },
  // [v-menu 2026-07-27] 신규 메뉴 정보블럭 1종
  ceiling: {
    title: "욕실천장교체 확인 포인트",
    items: [
      "기존 천장(돔·SMC·PVC) 유형 구분",
      "누수·곰팡이·처짐 상태 확인",
      "점검구·환풍기·조명 연결 부위 확인",
      "습기 환경 마감·고정 방식 확인",
    ],
  },
  cabinet: {
    title: "거울장·욕실장교체 확인 포인트",
    items: [
      "기존 거울장·욕실장 노후 상태",
      "벽 고정·하중 부위 확인",
      "유형·규격(수납·조명형) 구분",
      "습기·곰팡이 환경 확인",
    ],
  },
};

// 사진 슬롯 — 4개 (정보형, 설명형 캡션. 현장 연출·후기·전후사진 금지)
//   ★ plumbing PHOTO_POOL 패턴 복제. 지시서: 작업전·작업부위·시공범위·마감(완료).
//   ★ PHOTO_BEFORE / PHOTO_PART / PHOTO_SCOPE / PHOTO_FINISH
//   ※ DEAD CODE: 현재 핸들러는 PHOTO_ALT(인라인)를 단일 소스로 사용 → PHOTO_POOL 미참조.
//     homefix/plumbing 동형(슬롯 미사용). 향후 슬롯 렌더 전환 시 alt는 핸들러 PHOTO_ALT와 일치 유지.
export const BATHROOM_PHOTO_POOL = [
  { slot: "PHOTO_BEFORE", alt: "{region} 욕실 작업 전 상태 안내" },
  { slot: "PHOTO_PART",   alt: "욕실 작업 부위 안내 자료" },
  { slot: "PHOTO_SCOPE",  alt: "욕실 시공 범위 안내 자료" },
  { slot: "PHOTO_FINISH", alt: "욕실 마감 상태 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const BATHROOM_COMPARE = {
  compareWith: "화장실리모델링",
  compareWithText2: "현장 확인",
};

// BLOCK_MAP 격리용 — 인접 수리/설비/인테리어 업종과 교차 오염 차단.
//   bathroom은 '욕실 리모델링·교체·보수' 정보만.
//   ★ 고유어 위주 등록(seniorgoods 교차오염 교훈). 겹치는 범용 토큰(실리콘·타일·수전·배수구)은
//      EXEMPTIONS 처리 대상이므로 BLOCK에 단독 등록하지 않음. industryBlocks 배선 시 면제 정합.
export const BATHROOM_BLOCK_KEYWORDS = [
  "도배", "장판", "주방가구제작", "붙박이장", "신발장",
  "수도설비", "수도배관설치", "저수조청소", "누수탐지", "하수구막힘",
  "분전반", "배선공사", "승압", "전기공사",
  "싱크대제작", "주방리모델링",
];
