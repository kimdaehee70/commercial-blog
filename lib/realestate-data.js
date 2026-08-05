// lib/realestate-data.js
// 부동산(realestate) 업종 데이터셋 — v1 / 부동산 분석 리포트형
// 화자 = {region} 공인중개사. 정보형(분석 리포트). 후기·체험·과장광고 금지.
// 복제 베이스: lawyer-data.js (검색시장 단위 cat 구성 + titlePatterns data.js 소유)
// industry='realestate' 고정. 메뉴 7개.
//
// 설계 핵심: 메뉴 엔진 30% / 아파트 데이터셋 70%.
//   - 메뉴 치환보다 아파트 데이터 치환이 본 엔진의 축.
//   - 관측 단위 = 아파트(단지). 지역별 단지 풀(APT_DATA) 내장 + {aptName} 치환 변수 유지.
//
// ★ 최신 뉴스 의존 금지(데이터셋 고정 시 빠르게 노후화):
//   GTX 진행률 / 광운대역 개발 현황 / 정비사업 최신 단계 = 본문 단정 금지.
//   허용 = 재건축 절차 / 재개발 절차 / 입지 분석 / 투자 체크포인트 /
//          전세·월세 계약 주의사항 / 아파트 분석 (시점 무관 구조 정보).
//
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.

export const REALESTATE_META = {
  industry: "realestate",
  label: "부동산",
  fullLabel: "부동산 분석",
  // 화자 우선순위: {region} 공인중개사 → {region} 부동산 시장 → {aptName} 분석
  greeting: "안녕하세요. {region} 공인중개사입니다.",
  voice: "{region} 공인중개사",
  badge: "신규",
  // 결정주기: 매매·임대차는 비교·검토 후 결정 (긴급 아님)
  decisionCycle: "compare",
  // 가격·시세 단정 금지 — 시점·동·층·향·옵션 변수 → "확인 필요" 톤
  costTone: "consult",
};

// 업종 금칙어 → prompts.js FORBIDDEN로 직결
// 후기형·체험담·과장광고·결과보장·최신뉴스 단정 차단
export const REALESTATE_FORBIDDEN = [
  // 과장·광고
  "강추", "원조", "찐", "인생", "최고", "1위", "무조건", "역대급",
  "급등 보장", "무조건 오릅니다", "지금 사면", "지금이 기회",
  "묻지마 투자", "초대박", "대박", "확실한 수익",
  // 후기·체험담 (정보형 고정)
  "직접 가봤", "후기입니다", "추천드립니다", "강력 추천",
  // 가격·수익 단정 (부동산 변동성 / 투자 권유 책임)
  "반드시 오릅니다", "100% 수익", "손해 없는", "원금 보장",
  // 최신뉴스 단정 (노후화 방지)
  "현재 진행률", "착공 임박", "곧 개통", "확정 발표",
  // AI 논문형 연결어
  "따라서", "결론적으로", "정리하면",
];

// 카테고리 탭 (메뉴 7개) — 재건축/재개발 분리 유지(검색의도 상이)
export const REALESTATE_CATS = [
  "아파트분석",
  "전세",
  "월세",
  "재건축",
  "재개발",
  "지역분석",
  "부동산상식",
];

// ─────────────────────────────────────────────────────────────
// APT_DATA — 지역별 단지 풀 (관측 단위). 본문은 {aptName} 치환.
//   노원 관측 성공 시 동일 엔진으로 강남·송도·세종 확장.
//   ★ 단지명만 보유. 개발호재·진행률 등 시점 정보는 보유 금지(노후화).
// ─────────────────────────────────────────────────────────────
export const APT_DATA = {
  nowon: {
    label: "노원",
    region: "노원구",
    focus: ["재건축", "입지", "학군"],
    apts: [
      { name: "상계주공5단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "상계주공7단지", district: "상계동", station: "상계역(4호선)", livingArea: "상계 생활권" },
      { name: "중계그린",     district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "중계무지개",   district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
      { name: "하계장미",     district: "하계동", station: "하계역(7호선)", livingArea: "하계 생활권" },
      { name: "청구3차",      district: "중계동", station: "중계역(7호선)", livingArea: "중계 생활권" },
    ],
  },
  gangnam: {
    label: "강남",
    region: "강남구",
    focus: ["재건축", "학군", "입지"],
    apts: [
      { name: "은마",               district: "대치동", station: "대치역(3호선)", livingArea: "대치 생활권" },
      { name: "개포주공",           district: "개포동", station: "개포동역(분당선)", livingArea: "개포 생활권" },
      { name: "래미안대치팰리스",   district: "대치동", station: "대치역(3호선)", livingArea: "대치 생활권" },
      { name: "도곡렉슬",           district: "도곡동", station: "도곡역(3호선/분당선)", livingArea: "도곡 생활권" },
    ],
  },
  songdo: {
    label: "송도",
    region: "연수구",
    focus: ["아파트분석", "생활권", "입지"],
    apts: [
      { name: "더샵퍼스트파크",       district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "송도더샵센트럴파크",   district: "송도동", station: "센트럴파크역(인천1호선)", livingArea: "송도 생활권" },
      { name: "힐스테이트레이크송도", district: "송도동", station: "인천대입구역(인천1호선)", livingArea: "송도 생활권" },
    ],
  },
  sejong: {
    label: "세종",
    region: "세종시",
    focus: ["지역분석", "생활권", "학군"],
    apts: [
      { name: "첫마을",   district: "한솔동", station: "BRT 첫마을", livingArea: "한솔 생활권" },
      { name: "가재마을", district: "종촌동", station: "BRT 종촌", livingArea: "종촌 생활권" },
      { name: "새뜸마을", district: "다정동", station: "BRT 다정", livingArea: "다정 생활권" },
      { name: "도램마을", district: "도담동", station: "BRT 도담", livingArea: "도담 생활권" },
    ],
  },
};

// APT_DATA helper — 지역키로 단지명 풀 조회 (없으면 빈 배열)
export function getAptPool(regionKey) {
  const e = APT_DATA[regionKey];
  return e ? e.apts.map((a) => (typeof a === "string" ? a : a.name)) : [];
}

// 단지명 → 단지 메타(district/station/livingArea) 조회
export function getAptMeta(regionKey, aptName) {
  const e = APT_DATA[regionKey];
  if (!e) return null;
  return e.apts.find((a) => (typeof a === "string" ? a : a.name) === aptName) || null;
}

// ─────────────────────────────────────────────────────────────
// 제목패턴 — {region} {aptName} 치환. 후기형·결과보장 배제.
//   메뉴(cat)별로 검색의도가 다르므로 패턴도 cat별 분리.
// ─────────────────────────────────────────────────────────────

// 아파트분석 (단지 단위 분석 리포트)
const TP_APT = (kase) => [
  `{region} {aptName} ${kase}`,
  `{region} {aptName} 입지 분석`,
  `{region} {aptName} 실거주 관점 정리`,
  `{region} {aptName} 투자 관점 체크포인트`,
  `{region} {aptName} 살펴보기`,
];

// 전세/월세 (계약 주의사항형)
const TP_LEASE = (kase) => [
  `{region} ${kase} 계약 주의사항`,
  `{region} ${kase} 시세 보는 법`,
  `{region} ${kase} 계약 전 체크포인트`,
  `{region} ${kase} 구할 때 확인할 점`,
];

// 재건축/재개발 (절차·입주권형, 시점 정보 배제)
const TP_REDEV = (kase) => [
  `{region} ${kase} 절차 정리`,
  `{region} ${kase} 진행 단계 안내`,
  `{region} {aptName} ${kase} 알아보기`,
  `{region} ${kase} 투자 전 확인할 점`,
];

// 지역분석 (입지·교통·생활권·학군) — 일부 {aptName} 활용 가능
const TP_AREA = (kase) => [
  `{region} ${kase}`,
  `{region} 입지 분석`,
  `{region} 생활권·교통 정리`,
  `{region} 학군·실거주 관점 정리`,
];

// 지역분석 중 단지 기준 생활권 (aptName 활용)
const TP_AREA_APT = (kase) => [
  `{region} {aptName} ${kase}`,
  `{region} {aptName} 생활권 분석`,
  `{region} {aptName} 입지·교통 정리`,
];

// 부동산상식 (정보형 일반)
const TP_TIP = (kase) => [
  `${kase} 정리`,
  `${kase} 쉽게 이해하기`,
  `${kase} 알아두면 좋은 점`,
  `{region} 부동산 ${kase}`,
];

// ─────────────────────────────────────────────────────────────
// TREATMENTS — 메뉴 단위. cat / titlePatterns / keywords / analysisAxis
//   analysisAxis = 분석축 정의(엔진 방향): 입지·교통·생활권·학군·실거주·투자·체크포인트
// ─────────────────────────────────────────────────────────────
export const REALESTATE_TREATMENTS = [
  // ── 아파트분석 ────────────────────────────────
  {
    id: "re_apt_analysis", industry: "realestate", name: "아파트분석", cat: "아파트분석", emoji: "🏢",
    titlePatterns: TP_APT("분석"),
    keywords: ["아파트 분석", "단지 분석", "입지 분석", "실거주 투자 관점"],
    analysisAxis: ["입지", "교통", "생활권", "학군", "실거주 관점", "투자 관점", "체크포인트"],
    useApt: true, compareWith: "인근 단지", rank: 1, recommendedWeight: 25,
  },
  {
    id: "re_apt_livability", industry: "realestate", name: "실거주분석", cat: "아파트분석", emoji: "🏠",
    titlePatterns: TP_APT("실거주 분석"),
    keywords: ["실거주", "생활권", "학군", "단지 환경"],
    analysisAxis: ["생활권", "학군", "교통", "단지 환경", "실거주 관점", "체크포인트"],
    useApt: true, compareWith: "투자 관점", rank: 2, recommendedWeight: 10,
  },

  // ── 전세 ──────────────────────────────────────
  {
    id: "re_jeonse", industry: "realestate", name: "전세", cat: "전세", emoji: "🔑",
    titlePatterns: TP_LEASE("전세"),
    keywords: ["전세 계약", "전세 시세", "전세 주의사항", "전세 보증금"],
    analysisAxis: ["시세 확인", "보증금 안전", "계약 주의사항", "체크포인트"],
    useApt: false, compareWith: "월세", rank: 1, recommendedWeight: 9,
  },
  {
    id: "re_jeonse_safety", industry: "realestate", name: "전세보증금", cat: "전세", emoji: "🛡️",
    titlePatterns: TP_LEASE("전세 보증금"),
    keywords: ["전세보증금 반환", "보증보험", "전세 사기 예방", "확정일자"],
    analysisAxis: ["보증금 안전", "확정일자·전입신고", "보증보험", "계약 주의사항"],
    useApt: false, compareWith: "전세 계약", rank: 2, recommendedWeight: 6,
  },

  // ── 월세 ──────────────────────────────────────
  {
    id: "re_wolse", industry: "realestate", name: "월세", cat: "월세", emoji: "💵",
    titlePatterns: TP_LEASE("월세"),
    keywords: ["월세 계약", "월세 시세", "월세 주의사항", "보증금 월세 전환"],
    analysisAxis: ["시세 확인", "보증금·월세 구조", "계약 주의사항", "체크포인트"],
    useApt: false, compareWith: "전세", rank: 1, recommendedWeight: 10,
  },

  // ── 재건축 ────────────────────────────────────
  {
    id: "re_rebuild", industry: "realestate", name: "재건축", cat: "재건축", emoji: "🏗️",
    titlePatterns: TP_REDEV("재건축"),
    keywords: ["재건축 절차", "재건축 단계", "재건축 투자", "안전진단"],
    // ★ 절차·단계만. 특정 단지 진행률 단정 금지.
    analysisAxis: ["재건축 절차", "진행 단계", "투자 관점", "체크포인트"],
    useApt: true, compareWith: "재개발", rank: 1, recommendedWeight: 15,
  },

  // ── 재개발 ────────────────────────────────────
  {
    id: "re_redevelop", industry: "realestate", name: "재개발", cat: "재개발", emoji: "🏘️",
    titlePatterns: TP_REDEV("재개발"),
    keywords: ["재개발 절차", "재개발 입주권", "재개발 단계", "조합원 분양"],
    analysisAxis: ["재개발 절차", "진행 단계", "입주권", "체크포인트"],
    useApt: false, compareWith: "재건축", rank: 1, recommendedWeight: 10,
  },

  // ── 지역분석 ──────────────────────────────────
  {
    id: "re_area", industry: "realestate", name: "지역분석", cat: "지역분석", emoji: "🗺️",
    titlePatterns: TP_AREA("부동산 시장 분석"),
    keywords: ["지역 분석", "입지 분석", "생활권", "교통 학군"],
    analysisAxis: ["입지", "교통", "생활권", "학군", "실거주 관점", "투자 관점"],
    useApt: false, compareWith: "인근 지역", rank: 1, recommendedWeight: 6,
  },
  {
    id: "re_area_apt", industry: "realestate", name: "단지생활권", cat: "지역분석", emoji: "📍",
    titlePatterns: TP_AREA_APT("생활권 분석"),
    keywords: ["단지 생활권", "단지 입지", "주변 환경", "교통 접근성"],
    analysisAxis: ["생활권", "교통", "학군", "주변 환경", "실거주 관점"],
    useApt: true, compareWith: "인근 단지", rank: 2, recommendedWeight: 4,
  },

  // ── 부동산상식 ────────────────────────────────
  {
    id: "re_tip_contract", industry: "realestate", name: "계약상식", cat: "부동산상식", emoji: "📑",
    titlePatterns: TP_TIP("부동산 계약 상식"),
    keywords: ["부동산 계약", "등기부등본", "계약 절차", "중개수수료"],
    analysisAxis: ["계약 절차", "확인 서류", "주의사항", "체크포인트"],
    useApt: false, compareWith: "직접 계약", rank: 1, recommendedWeight: 3,
  },
  {
    id: "re_tip_tax", industry: "realestate", name: "세금상식", cat: "부동산상식", emoji: "🧾",
    titlePatterns: TP_TIP("부동산 세금 상식"),
    keywords: ["취득세", "양도세", "보유세", "부동산 세금"],
    analysisAxis: ["취득 단계 세금", "보유 단계 세금", "양도 단계 세금", "확인할 점"],
    useApt: false, compareWith: "세무 상담", rank: 2, recommendedWeight: 2,
  },
];

// 정보블럭 데이터 — generateRealestate.js insertInfoBlock에서 소비
//   ★ 절차·체크포인트 등 시점 무관 구조 정보만. 진행률/현황 금지.
export const REALESTATE_INFO_BLOCKS = {
  rebuild: {
    title: "재건축 진행 단계",
    items: [
      "정비구역 지정 → 추진위 → 조합 설립",
      "안전진단 → 사업시행인가 → 관리처분인가",
      "이주·철거 → 착공 → 입주",
      "※ 단지별 진행 시점은 다르므로 현재 단계는 별도 확인",
    ],
  },
  redevelop: {
    title: "재개발 진행 단계",
    items: [
      "정비구역 지정 → 조합 설립",
      "사업시행인가 → 조합원 분양 → 관리처분인가",
      "이주·철거 → 착공 → 입주(입주권)",
      "※ 구역별 진행 시점 상이 — 현재 단계는 별도 확인",
    ],
  },
  jeonse: {
    title: "전세 계약 체크포인트",
    items: [
      "등기부등본 확인(근저당·소유자)",
      "전입신고 + 확정일자 → 대항력·우선변제권",
      "전세보증금 반환보증(보증보험) 가입 가능 여부",
      "시세 대비 보증금 비율(깡통전세 주의)",
    ],
  },
  wolse: {
    title: "월세 계약 체크포인트",
    items: [
      "보증금·월세 구조 및 관리비 범위 확인",
      "등기부등본·소유자 일치 확인",
      "전입신고·확정일자(보증금 보호)",
      "계약 기간·갱신·중도해지 조건",
    ],
  },
  apt: {
    title: "아파트 분석 7축",
    items: [
      "입지 / 교통 / 생활권 / 학군",
      "실거주 관점(거주 편의·환경)",
      "투자 관점(수요·공급·정비사업 여부)",
      "체크포인트(층·향·동·관리 상태)",
    ],
  },
};

// 사진 슬롯 — 정보형, 캡션 선택 (현장 연출 금지)
export const REALESTATE_PHOTO_POOL = [
  { slot: "apt", alt: "{region} 단지 전경 안내" },
  { slot: "info", alt: "입지·교통 안내 자료" },
  { slot: "consult", alt: "부동산 상담 안내" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const REALESTATE_COMPARE = {
  compareWith: "인근 단지",
  compareWithText2: "인근 지역",
};

// BLOCK_MAP 격리용 — lawyer(부동산분쟁) / legal(부동산등기)과 교차 오염 차단.
//   부동산'분쟁'=lawyer, 부동산'등기'=legal. realestate는 분석/시세/계약 정보만.
export const REALESTATE_BLOCK_KEYWORDS = [
  "부동산분쟁", "부동산소송", "부동산등기", "소유권이전등기", "명도소송",
];
