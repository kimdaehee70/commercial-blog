// ============================================================
// lib/spine/regionStrategyRegistry.js
// Platform Spine STEP 2 — Region Strategy Registry (공통 정책 SoT)
// ------------------------------------------------------------
// 역할:
//   업종의 "지역 검색 행동"을 strategy 로 분류하는 SoT.
//   제목·본문·해시태그·LocationBlock 이 이 정책을 소비한다.
//   (Normalizer는 표기 정규화만 — 정책 결정 안 함. 인수계 §4 정합)
//
// 원칙(인수계 §4):
//   - strict. 미등록 strategy throw (fallback = SoT 모순).
//   - 정책 데이터만 제공. 실제 문자열 조립은 소비측(Title/Location)이 수행.
//
// strategy 어휘 (PHILOSOPHY "행동 직전 검색" 정합):
//   visit   : 방문형 — 손님이 찾아온다. 소재지 = 검색지.
//             지역 = 대표지역(소재지) + 생활권(하위 동/역) 결합.
//             "근처/일대/동네" 자연치환 허용. 「📍 찾아오시는 길」
//   service : 출동형 — 업체가 찾아간다. 작업지 = 검색지.
//             지역 = 생활권(작업지)만. 대표지역(소재지)은 업체정보 전용.
//             「📍 서비스 지역」
//   wide    : 광역형 — 지역 경계 약함(온라인 상담·전국). LocationBlock 선택적.
//
// ============================================================
// [v-region 2026-07-27] 지역 모델 정정 — service 업종의 대표지역 혼입 차단.
//   배경(실측): 대표지역=중랑구 / 생활권=중곡동(광진구) 입력 시
//     composeRegion 이 무조건 결합 → "중랑구 중곡동"(존재하지 않는 행정구역)이
//     제목·본문·ALT·해시태그 전체로 전파. 상조(중랑구+일산·분당)도 동일 원인.
//   판단: 동→구 전국 매핑 테이블 도입은 불필요. 상위 원인은 지역 모델 자체.
//     출동업종에서 고객의 검색 의도는 "현장 위치"이지 "업체 소재지"가 아니다.
//     따라서 service = 생활권 단독. 대표지역은 업체정보·지도·찾아오시는 길 전용.
//   효과: 구 불일치가 구조적으로 발생 불가능(전국 확장 시에도 동일).
// ============================================================

export const REGION_STRATEGY = Object.freeze({
  VISIT:   "visit",
  SERVICE: "service",
  WIDE:    "wide",
});

const _VALID = new Set(Object.values(REGION_STRATEGY));

// ─────────────────────────────────────────────────────────
// STRATEGY_POLICY — strategy → 소비측이 읽는 정책 플래그
//   allowNearbySwap    : 본문 "근처/이 동네" 자연치환 허용 (visit만 true)
//   nearbyTokens       : 치환 어휘 풀
//   locationBlockLabel : LocationBlock 헤더 라벨 ("" = 미삽입)
//   hashtagRegionStyle : 해시태그 지역 결합 방식
//   useRepRegionInBody : [v-region] 제목·본문 지역에 대표지역(소재지) 사용 여부.
//                        false = 생활권만(생활권 미입력 시에만 대표지역 fallback).
// ─────────────────────────────────────────────────────────
const STRATEGY_POLICY = {
  [REGION_STRATEGY.VISIT]: {
    allowNearbySwap: true,
    nearbyTokens: ["이 동네", "이 일대", "근처", "여기"],
    locationBlockLabel: "📍 찾아오시는 길",
    hashtagRegionStyle: "concat",   // #지역맛집
    useRepRegionInBody: true,       // 소재지 = 검색지 → 결합 유지
  },
  [REGION_STRATEGY.SERVICE]: {
    allowNearbySwap: false,
    nearbyTokens: ["이 지역", "해당 지역", "이 일대"],
    locationBlockLabel: "📍 서비스 지역",
    hashtagRegionStyle: "concat",
    useRepRegionInBody: false,      // 작업지 = 검색지 → 생활권 단독
  },
  [REGION_STRATEGY.WIDE]: {
    allowNearbySwap: false,
    nearbyTokens: [],
    locationBlockLabel: "",         // 미삽입
    hashtagRegionStyle: "concat",
    useRepRegionInBody: false,
  },
};

// ─────────────────────────────────────────────────────────
// INDUSTRY_REGION_STRATEGY — 업종 → strategy 매핑 SoT
//   범위: pages/api/me/store.js INDUSTRY_KEYS 전종 등록(누락 = strict throw).
//   신규 업종 추가 시 여기에도 반드시 등록(SOP v4.2 STEP 3 배선 항목).
// ─────────────────────────────────────────────────────────
const INDUSTRY_REGION_STRATEGY = {
  // ── VISIT — 손님이 찾아온다(소재지 = 검색지) ──────────────
  // 의료군
  clinic:      REGION_STRATEGY.VISIT,
  dental:      REGION_STRATEGY.VISIT,
  ent:         REGION_STRATEGY.VISIT,
  oriental:    REGION_STRATEGY.VISIT,
  ortho:       REGION_STRATEGY.VISIT,
  urology:     REGION_STRATEGY.VISIT,
  pediatrics:  REGION_STRATEGY.VISIT,
  gastro:      REGION_STRATEGY.VISIT,
  general:     REGION_STRATEGY.VISIT,
  obgyn:       REGION_STRATEGY.VISIT,
  derma:       REGION_STRATEGY.VISIT,
  pain:        REGION_STRATEGY.VISIT,
  neuro:       REGION_STRATEGY.VISIT,
  psy:         REGION_STRATEGY.VISIT,
  eye:         REGION_STRATEGY.VISIT,
  family:      REGION_STRATEGY.VISIT,
  pulmo:       REGION_STRATEGY.VISIT,
  card:        REGION_STRATEGY.VISIT,
  endo:        REGION_STRATEGY.VISIT,
  radio:       REGION_STRATEGY.VISIT,
  plastic:     REGION_STRATEGY.VISIT,
  // 외식·카페
  cafe:        REGION_STRATEGY.VISIT,
  restaurant:  REGION_STRATEGY.VISIT,
  chinese:     REGION_STRATEGY.VISIT,
  korean:      REGION_STRATEGY.VISIT,
  japanese:    REGION_STRATEGY.VISIT,
  snack:       REGION_STRATEGY.VISIT,
  chicken:     REGION_STRATEGY.VISIT,
  western:     REGION_STRATEGY.VISIT,
  meat:        REGION_STRATEGY.VISIT,
  // 전문서비스 — 사무실 방문 상담이 기본 동선
  legal:          REGION_STRATEGY.VISIT,
  lawyer:         REGION_STRATEGY.VISIT,
  tax:            REGION_STRATEGY.VISIT,
  labor:          REGION_STRATEGY.VISIT,
  administrative: REGION_STRATEGY.VISIT,
  realestate:     REGION_STRATEGY.VISIT,
  // 실버케어 — 내원·내점형
  daycare:     REGION_STRATEGY.VISIT,
  welfarecare: REGION_STRATEGY.VISIT,
  seniorgoods: REGION_STRATEGY.VISIT,
  // 교육·행사 / 레저 / 리빙 내점형
  kindergarten: REGION_STRATEGY.VISIT,
  fishing:      REGION_STRATEGY.VISIT,
  bedding:      REGION_STRATEGY.VISIT,

  // ── SERVICE — 업체가 찾아간다(작업지 = 검색지) ────────────
  //   제목·본문 지역 = 생활권만. 대표지역은 업체정보·지도 전용.
  cleaning:       REGION_STRATEGY.SERVICE,
  moving:         REGION_STRATEGY.SERVICE,
  interior:       REGION_STRATEGY.SERVICE,
  grout:          REGION_STRATEGY.SERVICE,
  coating:        REGION_STRATEGY.SERVICE,
  systemair:      REGION_STRATEGY.SERVICE,
  airclean:       REGION_STRATEGY.SERVICE,
  screen:         REGION_STRATEGY.SERVICE,
  pestcontrol:    REGION_STRATEGY.SERVICE,
  buildingclean:  REGION_STRATEGY.SERVICE,
  birdcontrol:    REGION_STRATEGY.SERVICE,
  tankclean:      REGION_STRATEGY.SERVICE,
  leakdetect:     REGION_STRATEGY.SERVICE,
  sewer:          REGION_STRATEGY.SERVICE,
  plumbing:       REGION_STRATEGY.SERVICE,
  boiler:         REGION_STRATEGY.SERVICE,
  homefix:        REGION_STRATEGY.SERVICE,
  electricrepair: REGION_STRATEGY.SERVICE,
  sinkrepair:     REGION_STRATEGY.SERVICE,
  bathroom:       REGION_STRATEGY.SERVICE,

  // ── 공사군(SERVICE) — 업체가 현장으로 간다. 작업지 = 검색지.
  //   [v-region2 2026-07-28] 미등록 4업종 추가. 등록 전에는 index.js가
  //   getRegionStrategySafe 로 visit 축퇴 → useRepRegionInBody:true →
  //   대표지역+생활권 무조건 결합 → "노원구 먹골역"(먹골역=중랑구 묵동) 전파.
  //   중랑구+중곡동(v-region)과 동일 계열. 엔진 무수정으로 해소.
  //   ※ film·dobae·flooring 은 useSite:true(단지명 축)지만 전략은 출동형.
  //      siteBlock(단지) 과 regionStrategy(지역) 는 별개 축이다.
  dobae:          REGION_STRATEGY.SERVICE,
  flooring:       REGION_STRATEGY.SERVICE,
  film:           REGION_STRATEGY.SERVICE,
  door:           REGION_STRATEGY.SERVICE,
  waterproof:     REGION_STRATEGY.SERVICE,  // 방수공사 — 업체가 현장으로 간다(작업지 = 검색지)
  paint:          REGION_STRATEGY.SERVICE,  // 페인트공사 — 업체가 현장으로 간다(작업지 = 검색지)
  tile:           REGION_STRATEGY.SERVICE,  // 타일시공 — 업체가 현장으로 간다(작업지 = 검색지)
  window:         REGION_STRATEGY.SERVICE,  // 창호시공 — 업체가 현장으로 간다(작업지 = 검색지)
  furniture:      REGION_STRATEGY.SERVICE,  // 맞춤가구 — 업체가 현장으로 간다(작업지 = 검색지)
  lighting:       REGION_STRATEGY.SERVICE,  // 조명 — 업체가 현장으로 간다(작업지 = 검색지)
  demolition:     REGION_STRATEGY.SERVICE,  // 철거공사 — 업체가 현장으로 간다(작업지 = 검색지)
  funeral:        REGION_STRATEGY.SERVICE,  // 상조 — 서비스 권역형(장례식장 이동)
  homecare:       REGION_STRATEGY.SERVICE,  // 방문요양 — 가정 방문
  flower:         REGION_STRATEGY.SERVICE,  // 꽃배달 — 배송 권역
};

export function registerIndustryStrategy(industry, strategy) {
  if (!industry || typeof industry !== "string") {
    throw new Error(`[regionStrategy] industry 문자열 필요: ${JSON.stringify(industry)}`);
  }
  if (!_VALID.has(strategy)) {
    throw new Error(`[regionStrategy] '${industry}' strategy 오류: ${strategy} (허용: ${[..._VALID].join("/")})`);
  }
  INDUSTRY_REGION_STRATEGY[industry] = strategy;
  return strategy;
}

// ─────────────────────────────────────────────────────────
// resolveRegionStrategy — strict. 미등록 업종 throw.
//   반환: { industry, strategy, policy }
// ─────────────────────────────────────────────────────────
export function resolveRegionStrategy(industry) {
  const strategy = INDUSTRY_REGION_STRATEGY[industry];
  if (!strategy) {
    throw new Error(
      `[regionStrategy] 미등록 업종: '${industry}'. ` +
      `registerIndustryStrategy 등록 필요. 등록목록: ${Object.keys(INDUSTRY_REGION_STRATEGY).join(", ")}`
    );
  }
  const policy = STRATEGY_POLICY[strategy];
  if (!policy) {
    // strategy는 등록됐는데 정책 누락 = 내부 정합성 오류 (등록 함수가 막지만 방어).
    throw new Error(`[regionStrategy] '${industry}' strategy='${strategy}' 정책 미정의(내부 오류)`);
  }
  return { industry, strategy, policy };
}

// 소비측 편의 — 정책 직접 조회
export function getRegionPolicy(industry) {
  return resolveRegionStrategy(industry).policy;
}
export function getNearbyTokens(industry) {
  return resolveRegionStrategy(industry).policy.nearbyTokens.slice();
}
export function getLocationBlockLabel(industry) {
  return resolveRegionStrategy(industry).policy.locationBlockLabel;
}
export function allowsNearbySwap(industry) {
  return resolveRegionStrategy(industry).policy.allowNearbySwap;
}
export function listIndustries() {
  return Object.keys(INDUSTRY_REGION_STRATEGY);
}

// [v-region] 소비측 안전 조회 — UI 레이어 전용.
//   Registry 본체의 strict 원칙은 유지하되, 화면이 미등록 업종 하나로 죽지 않도록
//   호출측(index.js)에서 이 함수를 쓰면 visit(= 기존 동작)으로 안전 축퇴한다.
export function getRegionStrategySafe(industry) {
  try {
    return resolveRegionStrategy(industry).strategy;
  } catch {
    return REGION_STRATEGY.VISIT;
  }
}
