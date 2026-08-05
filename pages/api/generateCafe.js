// ============================================================
// ★★★ CAFE ENGINE 4 — RE-FROZEN 2026-06-28 ★★★
//   동결 대상: generateCafe.js (+ cafe-data.js / cafe-prompts.js / cafe-playConfig.js)
//   명시적 FREEZE 해제 없이 수정 금지. 변경 시 node --check → Babel(preset-env+react)
//     → 시뮬레이션 검증 필수.
//   노출 5메뉴(아메리카노·카페라떼·크로플·케이크·브런치) 스폿 전수 PASS 기준 동결.
//   이번 세션 동결 변경분: E-2(라떼 축약형 안전망) + E-3/STEP F-1c2(카페 조사 안전망).
//   미노출 메뉴(에이드·아포가토·아사이볼 등)는 "추가하며 검증" 방식 — append 후 스폿.
//   v2.5(문체·표현: 반복표현·권유형 과다·종결어미 혼용·"카페에서는 카페들은" 중복)는
//     별도 트랙. 재FREEZE 차단 사유 아님.
// ============================================================
// ============================================================
// generateRestaurant.js — 맛집 블로그 생성기 v1.0 (Phase 9.5)
//
// 기반: generateCafe.js v1.0 구조 이식 + 조합형 진화
// 작업 기준: Phase9_완료_Phase9_5_인계메모_v2_0
//
// ★ Phase 9.5 핵심 — 검색의도 SEO 엔진 (cafe 진화 방향 실험장)
//   cafe v1   = 브랜드형 (매장명 중심)
//   restaurant v1 = 조합형 (지역+메뉴+상황+목적 검색의도)
//
// cafe → restaurant 핵심 교체 (8블럭)
//   1. MENU_BLOCKS     → MEAL_BLOCKS    (카테고리별 메뉴 비교)
//   2. VISIT_VALUES    → MEAL_VALUES    (반찬·결제·1인석 9종)
//   3. DIRECTION 정적  → buildDirection({menu,situation,purpose}) 동적
//   4. stayTimeline    → sceneTimeline  (자리잡음/상차림/식사중/마무리)
//   5. CAFE_REC_MAP    → MEAL_REC_MAP   (상황·목적 결합)
//   6. CAFE_DECISION   → MEAL_DECISION  (위치/메뉴/장면/페이스)
//   7. 작업카페 안전핀  → 광고/홍보 안전핀 (브랜드 톤 차단)
//   8. 매장 ID 검증     → 조합 검증 (region+menu+situation+purpose)
// ============================================================

import {
  CAFE_TREATMENTS, CAFE_BLOCK_MAP,
  CAFE_TITLE_MIDDLE, CAFE_TITLE_SUFFIX,
  CAFE_TITLE_SCENE, CAFE_TITLE_SCENE_BY_CATEGORY,
} from "../../lib/cafe-data";
// ── Platform Spine (Title Engine v2) ──
import { buildTitle } from "../../lib/spine/titleEngine.js";
import { resolvePurpose as _resolvePurposeStrict } from "../../lib/spine/purposeRegistry.js";
import { resolveTitleSuffix } from "../../lib/spine/titleSuffixRegistry.js";
import {
  buildCafePrompt, getCafeDirection,
} from "../../lib/cafe-prompts";
import {
  getCafeSections,
} from "../../lib/cafe-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";
// 🛡️ 과별 침투 차단
import { getCrossBlocks } from "../../lib/industryBlocks";
// [v-loc] 위치/주차 공통 후단 블록 — 전 업종 공유. 응답 직전 해시태그 위 삽입.
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
// 🛡️ 안전 제거 + 공백/조사 normalize
import { safeRemoveWords, fixParticles, normalizeWhitespace } from "../../lib/safeRemove";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN) — Phase 9.5 핵심
// ============================================================
const CAFE_FORBIDDEN_BASE = [
  // 광고/홍보 (Phase 9.5 핵심 — 브랜드 톤 차단)
  "유명한 맛집", "이름난 곳", "맛집 인증",
  "찐맛집", "진짜 맛집", "인생 맛집", "내 인생 메뉴",
  "꼭 가봐야", "꼭 가보세요", "후회 안 함", "안 가면 손해",
  "강추", "강력 추천", "추천드려요", "무조건 추천",
  "맛 인정", "정통", "원조",
  "미친 맛", "미친 비주얼", "역대급", "레전드",
  "숨은 맛집", "보물 같은 곳", "숨겨진 명소", "현지인만 아는",
  "분위기 맛집", "사진 맛집", "감성 맛집", "감성 가득",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "체계적인 접근", "알아두면 좋은",
  "마음이 편안해지는", "위로받는 느낌", "힐링되는",
];

const CAFE_FORBIDDEN_AI = [
  "드디어 발견한", "결국 찾은 곳", "마침내", "비로소",
  "마음에 들었어요", "마음에 들었답니다",
  "차분하고 따뜻한", "안정감 있는 분위기",
];

// commercial 모드 — 협찬 표기 위반 패턴
const CAFE_FORBIDDEN_COMMERCIAL = [
  "저는 ", "제가 ", "내가 ", "나는 ", "저도 ",
  "다녀왔어요", "다녀왔습니다", "갔다왔어요", "방문했어요",
  "느꼈어요", "느꼈다", "느껴졌다",
  "최고였어요", "최고였다", "1등이에요", "유일한", "완벽했어요",
  "맛이 보장된", "100% 만족", "단연 최고",
  "추천합니다", "추천해요", "추천드립니다",
  "꼭 가보세요", "꼭 한 번", "꼭 들러보세요",
  "가보시길", "방문해보시는 걸",
  "할인 이벤트", "프로모션", "특가", "쿠폰",
];

// ============================================================
// 0-2. 🛡️ 과별 침투 차단 (의료·카페·학습 어휘 차단)
// ============================================================
const CAFE_CROSS_BLOCK = (function () {
  try {
    return getCrossBlocks("cafe");
  } catch (e) {
    return [
      ...CAFE_BLOCK_MAP.medical,
      ...CAFE_BLOCK_MAP.restaurant,
      ...CAFE_BLOCK_MAP.study,
      ...CAFE_BLOCK_MAP.ad,
    ];
  }
})();

// ============================================================
// [Phase 9.5 A안] MEAL_BLOCKS / MEAL_VALUES 정의부 삭제 완료
//   사유:
//   1) MEAL_BLOCKS  — "메뉴 구성 일반 정보" 표 fingerprint
//   2) MEAL_VALUES  — 9개 운영 정보 강제풀 (정보 SEO 회귀 원인)
//   현재 방향: 정보 박스 ❌ / scene·행동·순간·흐름 ⭕
// ============================================================

// ============================================================
// 3. 제목 생성 (mode 분기)
//   ★ Phase 9.5: 매장명 없음. {region} {menu} {situation}｜{purpose} 형식
// ============================================================
// 직전 commercial 제목 토큰 — 연속 발행 시 동일 MIDDLE/SUFFIX 회피용
let _titleState = {};

function buildCafeTitle(treatment, region, situation, purpose, seoData, mode, titleSuffix) {
  const menu = treatment.menu || treatment.menuRef || "";
  const cat  = treatment.cat || "커피";
  const sit  = situation || "";
  const pur  = purpose   || "";

  if (mode === "commercial") {
    // ── Platform Spine 위임 (Title Engine v2) ──
    //   카페=B′형: purposeLabel=Registry 밖 자유라벨 → resolvePurpose 콜백으로 strict throw 우회.
    //   {searchword}=풀 없으면 mid 폴백(Spine v2① — 기존 동작 동치).
    //   풀은 data 소유 그대로 주입(공통화 금지). region+menu 선두·매장명 0 유지.
    const dir = getCafeDirection(treatment, situation, purpose) || {};
    const purLabel = dir.purposeLabel || pur || "";   // 목적 라벨(선택값/메뉴폴백)

    const r = buildTitle({
      region, menu, cat,
      situation: sit,
      purpose: purLabel,                 // 자유라벨 — 아래 콜백으로 해석(미등록 throw 회피)
      mode: "commercial",
      pools: {
        titlePatterns: (seoData?.titlePatterns?.length ? seoData.titlePatterns : undefined),
        SCENE: CAFE_TITLE_SCENE,
        SCENE_BY_CAT: CAFE_TITLE_SCENE_BY_CATEGORY,
        MIDDLE: CAFE_TITLE_MIDDLE,
        SUFFIX: CAFE_TITLE_SUFFIX,
        // SEARCHWORD 미주입 — v1 동치 유지({searchword}=mid 재활용, Spine v2① 폴백).
        //   카페 commercial은 원래 별도 검색어 풀을 안 쓰고 mid를 {searchword}에 넣었음(generateCafe v3).
        //   CAFE_TITLE_SEARCHWORD 활성화는 별도 관측 후 결정(현 단계 동치 우선).
      },
      // 자유라벨: Registry 등록되어 있으면 strict 결과 사용, 아니면 라벨 그대로 통과(throw 우회).
      resolvePurpose: (label) => {
        if (!label) return null;
        try { return _resolvePurposeStrict(label); }
        catch { return { label, type: "menu", titleLabel: label }; }
      },
      purposeTitleLabel: purLabel,
      state: _titleState,
      sceneProbability: 0.4,
      suffix: titleSuffix,   // [v77] Spine §7 Title Suffix hook. 미주입=OFF.
    });
    _titleState = r.state;
    return r.title;
  }

  // personal — titlePatterns 우선 (placeholder 치환) — 무변경
  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    let t = raw
      .replace(/\{region\}/g, region)
      .replace(/\{menu\}/g, menu)
      .replace(/\{situation\}/g, sit)
      .replace(/\{purpose\}/g, pur);
    // 빈 placeholder 자국 정리
    t = t.replace(/\s+\|\s*$/g, "")
         .replace(/\s+｜\s*$/g, "")
         .replace(/\|\s+\|/g, "|")
         .replace(/｜\s+｜/g, "｜")
         .replace(/\s{2,}/g, " ")
         .trim();
    return t;
  }

  const defaults = [
    `${region} ${menu}${sit ? " " + sit : ""}${pur ? "｜" + pur : ""} 솔직 후기`,
    `${region} ${menu} 다녀온 후기${sit ? "｜" + sit : ""}`,
    `${region} ${menu} 후기 정리`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기) — 매장명 X, 검색의도 조합 중심
// ============================================================
function buildCafeHashtags(treatment, region, situation, purpose, mode) {
  const reg   = (region || "").replace(/\s/g, "");   // ★ region 공백 제거 — "노원구 태릉입구" → "노원구태릉입구" (해시태그 끊김 방지)
  const menu  = (treatment.menu || treatment.menuRef || "").replace(/\s/g, "");
  const catKw = (treatment.cat || "커피").replace(/\s/g, "");
  const sitKw = (situation || "").replace(/\s/g, "");
  const purKw = (purpose || "").replace(/\s/g, "");

  if (mode === "commercial") {
    return [
      `#${reg}카페`, `#${reg}${menu}`, `#${menu}안내`,
      `#${reg}${catKw}`, `#${reg}카페추천`, `#카페정보`,
    ].filter(t => t.length > 2).slice(0, 8).join(" ");
  }

  const base = [
    `#${reg}카페`, `#${reg}${menu}`, `#${menu}`,
    `#${reg}${catKw}`, `#${menu}카페`,
    sitKw ? `#${reg}${sitKw}` : "",
    purKw && purKw !== sitKw ? `#${reg}${purKw}` : "",
    `#${reg}후기`, `#${menu}후기`, `#카페후기`,
  ];
  return base.filter(t => t && t.length > 2).slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기)
//   ★ 핵심 추가: 지역+메뉴 결합 3회 초과 시 자동 대체
// ============================================================
function cleanCafeText(text, treatment, region, situation, purpose, mode = "personal") {
  const menu = treatment.menu || treatment.menuRef || "";
  const direction = getCafeDirection(treatment, situation, purpose);
  const genericName = direction.genericName || "이 카페";
  let result = text;

  // [임시진단 2026-06-28] 프라푸치노 은으로 비문 추적 — 3지점 로그(로직 무변경)
  const _DBG = (menu === "프라푸치노");
  if (_DBG) console.log("[DBG-1 진입]", "은으로잔존:", result.includes("프라푸치노은으로"), "| menu:", menu);
  const removeList = [...CAFE_FORBIDDEN_BASE, ...CAFE_FORBIDDEN_AI, ...CAFE_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...CAFE_FORBIDDEN_COMMERCIAL);

  // 🛡️ safeRemoveWords — 조사 깨짐 방지
  result = safeRemoveWords(result, removeList);

  // [헤더 정규화] 헤더 안 placeholder → genericName
  result = result.split("\n").map(line => {
    if (/^#{1,6}\s/.test(line)) {
      return line
        .replace(/그\s*가게를/g, `${genericName}을`)
        .replace(/그\s*가게가/g, `${genericName}이`)
        .replace(/그\s*가게는/g, `${genericName}은`)
        .replace(/그\s*가게\s+/g, `${genericName} `);
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 v4 — P1 fingerprint 차단
  //   현상: "순대국이 메뉴를", "순대국 메뉴가", "순대국이 메뉴의"
  //   원인: 프롬프트 "메뉴" 단어 노출 + GPT가 키워드 강제 결합 시도
  //   교정: 메뉴명+(조사)?+공백?+메뉴 → "이 한 그릇 / 이거 / 그것" 분산
  //   주의: "메뉴판"은 보존 (메뉴판 보면서 / 메뉴판 한 장)
  //   QC: menuMetaCount 누적 → 후단 로그
  // ─────────────────────────────────────────────────────
  let menuMetaCount = 0;
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 패턴 A: "메뉴명 + 조사 + 공백 + 메뉴" (메뉴판 제외)
    const reA = new RegExp(`${menuEsc}(이|가|을|를|은|는|의|도|에)\\s+메뉴(?!판)`, "g");
    // 패턴 B: "메뉴명 + 공백 + 메뉴" (조사 없이 띄어쓰기로 결합, 메뉴판 제외)
    const reB = new RegExp(`${menuEsc}\\s+메뉴(?!판)`, "g");

    // ★ [CAFE] cat-aware 분산: servingUnit 기준(커피/음료=한 잔, 디저트=한 조각, 브런치=한 접시)
    //   분식 복사 잔재 "이 한 그릇" 하드코딩 제거 — direction.servingUnit로 동적 정합.
    const _su = (direction.servingUnit || "한 잔").trim();
    result = result.replace(reA, () => {
      const alts = [`이 ${_su}`, "이거", "그것"];
      const r = alts[menuMetaCount % alts.length];
      menuMetaCount++;
      return r;
    });
    result = result.replace(reB, () => {
      const alts = [`이 ${_su}`, "이거", "그것"];
      const r = alts[menuMetaCount % alts.length];
      menuMetaCount++;
      return r;
    });
  }

  // 조사 보정
  result = fixParticles(result, genericName);

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 이슈 #1: 메뉴명+조사 + 장소명사 조사 오류 교정
  //   현상: "순대국이 동네", "순대국은 골목", "순대국에 일대" 등
  //   원인: GPT가 결합 회피하며 단어 끊기다 조사 오발
  //   교정: 메뉴명+(이|가|은|는|에|을|를) + 장소명사 → "이 장소명사"
  //   QC: particleErrorCount 누적 → 후단 로그
  // ─────────────────────────────────────────────────────
  const PLACE_NOUNS = "(동네|일대|집|골목|쪽|근처|거리|상권|먹자골목|가게|매장|식당|집안|안쪽|입구)";
  const PARTICLES   = "(이|가|은|는|에|을|를)";
  let particleErrorCount = 0;

  // 1) 동적: 실제 메뉴명 + 6종 조사 + 장소명사 (가장 정확)
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const dynRe = new RegExp(`${menuEsc}${PARTICLES}\\s+${PLACE_NOUNS}`, "g");
    result = result.replace(dynRe, (m, _p, place) => {
      particleErrorCount++;
      return `이 ${place}`;
    });
  }

  // 2) 일반화: 한식 메뉴 어미 + 6종 조사 + 장소명사
  //    (국/탕/찌개/밥/면/구이/볶음/전/회/탕면/국밥/덮밥/비빔밥)
  //    + 분식 어미 (떡볶이/김밥/튀김/순대/어묵/라면/만두)
  const genericMenuRe = new RegExp(
    `[가-힣]{1,4}(?:국|탕|찌개|밥|면|구이|볶음|전|회|탕면|국밥|덮밥|비빔밥|떡볶이|김밥|튀김|순대|어묵|라면|만두)${PARTICLES}\\s+${PLACE_NOUNS}`,
    "g"
  );
  result = result.replace(genericMenuRe, (m, _p, place) => {
    particleErrorCount++;
    return `이 ${place}`;
  });

  // 3) 안전망: 음식명사 컨텍스트에서 (조사 + 장소명사) 직전 음식 추정 단어
  //    1)·2) 둘 다 놓친 케이스 (예: "수제비가 동네", "라멘에 일대")
  //    조건: 앞 단어가 한글 0~3자 + 음식어미 + 조사 + 공백 + 장소명사
  //    보수적: 흔한 음식 어미 — {0,3}로 단독 단어("치킨", "수제비")도 매칭
  const safetyFoodRe = /[가-힣]{0,3}(?:국수|수제비|치킨|피자|초밥|라멘|우동|냉면|짬뽕|짜장|돈까스|회덮밥|덮밥|토스트|버거|파스타|커리|샐러드|샌드위치)(이|가|은|는|에|을|를)\s+(동네|일대|집|골목|쪽|근처|거리|상권|먹자골목)/g;
  result = result.replace(safetyFoodRe, (m, _p, place) => {
    particleErrorCount++;
    return `이 ${place}`;
  });

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 핵심: 지역+메뉴 결합 3회 초과 자동 대체
  // ─────────────────────────────────────────────────────
  if (region && menu) {
    const combo = `${region} ${menu}`;
    const comboEsc = combo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(comboEsc, "g");
    let count = 0;
    result = result.replace(re, (m) => {
      count++;
      if (count > 3) {
        const alts = ["이 동네", "이 일대", "근처", "여기"];
        return alts[(count - 4) % alts.length];
      }
      return m;
    });
    // ★ region 단독 과밀도 제한 (commercial 8섹션 prefix 반복 차단)
    const regEsc = region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reRegion = new RegExp(`${regEsc}(?:\\s*(?:일대|일원|지역|에서|에는|의))?`, "g");
    let rc = 0;
    result = result.replace(reRegion, (m) => {
      rc++;
      if (rc > 3) {
        const alts = ["이 동네", "이 일대", "근처", "인근"];
        return alts[(rc - 4) % alts.length];
      }
      return m;
    });
  }

  // ─────────────────────────────────────────────────────
  // commercial 모드: 강제 정보형 변환
  // ─────────────────────────────────────────────────────
  if (mode === "commercial") {
    result = result.replace(/\d+,?\d+원\s*대?/g, "매장 가격 기준 확인");
    result = result.replace(/\d+\s*만원\s*대?/g, "매장 가격 기준 확인");
    result = result.replace(/약\s*\d+,?\d+원/g, "매장 가격 기준 확인");

    result = result.replace(/(?:^|[\s,.])저는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])제가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])내가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])나는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])저도\s+/g, " ");

    const verbConv = [
      [/다녀왔어요/g,   "방문이 가능합니다"],
      [/다녀왔습니다/g, "방문이 가능합니다"],
      [/갔다왔어요/g,   "방문이 가능합니다"],
      [/방문했어요/g,   "방문이 안내됩니다"],
      [/최고였어요/g,   "매장 안내 기준 참고"],
      [/완벽했어요/g,   "매장 안내 기준 참고"],
      [/추천합니다/g,   "고려해볼 수 있습니다"],
      [/추천해요/g,     "고려해볼 수 있습니다"],
      [/추천드립니다/g, "고려해볼 수 있습니다"],
      [/꼭 가보세요/g,  "고려해볼 수 있습니다"],
      [/가보시길/g,     "고려해보시길"],
      [/가보시는 걸/g,  "고려해보시는 것을"],
      [/맛이 보장된/g,  "매장별 차이가 있는"],
      [/100%\s+/g,      "일반적으로 "],
      [/단연 최고/g,    "매장별 차이"],
    ];
    verbConv.forEach(([re, to]) => { result = result.replace(re, to); });

    // ★ v2 어색 결합 치환 — "${menu} 음식", "${menu} 지역" (GPT 산출 버그)
    if (menu) {
      const mEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // "순대국 음식은/이/을/도..." → "순대국은/이/을/도..."
      result = result.replace(new RegExp(`${mEsc}\\s*음식([은는이가을를도]?)`, "g"), `${menu}$1`);

      // ★ [CAFE] "케이크 지역 + (전문점/집/매장)…" 중복 결합 → 지시형 치환 (뒤 조사 보존)
      //   genericName='카페'라 직접 삽입 시 인접 '카페'와 "카페의 카페" 중복 → 지시어로 흡수.
      //   '이 동네 카페' 형태로 1회만 노출.
      result = result.replace(
        new RegExp(`${mEsc}\\s*지역(?:에서는|에서|에는|의|은|는|마다|별로)?\\s*(?:${mEsc}\\s*)?(전문점|집|식당|매장)(들)?(은|는|에서는|에서|마다|별로|의)?`, "g"),
        (m, kind, plural, josa) => `이 동네 카페${josa || "에서는"}`
      );
      // ★ [CAFE] 잔여 단독 "케이크 지역+조사" → 지시형+조사
      result = result.replace(
        new RegExp(`${mEsc}\\s*지역(에서는|에서|에는|의|은|는|마다|별로|에)?`, "g"),
        (m, josa) => `이 동네 카페${josa ? (josa === "에" ? "에서" : josa) : "에서는"}`
      );
      // ★ [CAFE] "케이크 전문점" / "아메리카노 점" 잔여 직접 치환 → 지시형
      //   "케이크 전문점의 케이크" → "이 동네 카페의 케이크" / "아메리카노 점을" → "이 동네 카페를"
      //   '카페'는 받침無 → 을/은/이 들어오면 를/는/가로 정정
      result = result.replace(
        new RegExp(`${mEsc}\\s*(?:전문점|점)(들)?(은|는|에서는|에서|의|을|를|이|가|마다|별로)?`, "g"),
        (m, plural, josa) => {
          const fix = { "을": "를", "은": "는", "이": "가" };  // 카페=받침無 정합
          const j = fix[josa] || josa || "";
          return `이 동네 카페${plural ? "" : ""}${j}`;  // '들' 흡수(이 동네 카페+조사)
        }
      );

      // "이거를/이거는/그것을/그것는" AI투 → 메뉴명 환원
      result = result.replace(/이거를\s*선택/g, `${menu}을 선택`);
      result = result.replace(/이거를/g, `${menu}을`).replace(/이거는/g, `${menu}은`);
      result = result.replace(/그것를/g, `${menu}을`).replace(/그것는/g, `${menu}은`);

      // ★ [CAFE] 카페 중복·오류 공통 청소 (genericName='카페' 인접 중복 + GPT 원문오류)
      //   순서 주의: '많은/여러' 한정수식 패턴을 '다양한'·무수식 패턴보다 먼저(선점 방지).
      result = result
        .replace(/카페의\s*(?:많은|여러|수많은)\s*카페(들)?/g, "이 동네의 많은 카페$1")
        .replace(/카페의\s*(?:다양한\s*)?카페(들)?/g, "이 동네 카페$1")
        .replace(/이\s*동네\s*카페의\s*카페/g, "이 동네 카페")
        .replace(/이\s*동네\s+이\s*동네\s*카페/g, "이 동네 카페")
        .replace(/다양한\s*카페에서\s*카페/g, "다양한 카페에서")
        .replace(new RegExp(`${mEsc}(?:이|가|를|을)\\s*같은\\s*경험을\\s*만날\\s*수\\s*있`, "g"), `${menu}와 비슷한 분위기를 즐길 수 있`)
        .replace(/같은\s*경험을\s*만날\s*수\s*있습니다/g, "비슷한 분위기를 즐길 수 있습니다");

      // ★ [CAFE] "이 메뉴/이거" 등 받침無 지시어 뒤 "으로" 오결합 정정 (이 메뉴으로 → 이 메뉴로)
      result = result
        .replace(/이\s*메뉴으로(?=\s|[,.!?]|$)/g, "이 메뉴로")
        .replace(/이거으로(?=\s|[,.!?]|$)/g, "이거로");

      // ★ [CAFE] ② "이 메뉴는 제공하는 여유" (동사 누락 비문) → 자연 보정
      result = result
        .replace(/이\s*메뉴는\s*제공하는\s*여유/g, "이 메뉴와 함께 여유")
        .replace(new RegExp(`${mEsc}는\\s*제공하는\\s*여유`, "g"), `${menu}와 함께 여유`);

      // ★ [CAFE] 잔여 청소: "이 동네 카페에서는마다/별로" → 자연 어미
      result = result.replace(/이\s*동네\s*카페에서는(마다|별로)/g, "이 동네 카페에서는");

      // ★ [CAFE] 지시형 치환('이 동네 카페'=받침無) 뒤 받침의존 조사 정정
      //   현상: "메뉴 점을/은" → 치환 시 메뉴 받침 조사가 그대로 흡수돼 "이 동네 카페을/은" 발생.
      //   '카페'는 받침無이므로 을→를·은→는·이→가로 정정 (확실분, FREEZE 엔진 무영향)
      result = result
        .replace(/이\s*동네\s*카페을(?=\s|[,.!?]|$)/g, "이 동네 카페를")
        .replace(/이\s*동네\s*카페은(?=\s|[,.!?]|$)/g, "이 동네 카페는")
        .replace(/이\s*동네\s*카페이(?=\s|[,.!?]|$)/g, "이 동네 카페가")
        .replace(/이\s*동네\s*카페으로(?=\s|[,.!?]|$)/g, "이 동네 카페로");

      // ★ [CAFE] ① 받침 없는 메뉴 뒤 조사 오결합 정정 (FREEZE 엔진 무영향, 카페 한정 후행 정정)
      //   safeRemove.fixParticles 미커버분 보강:
      //     - "아메리카노은으로"(이중조사 은+으로) → "아메리카노로"
      //     - "아메리카노으로"(으로 단독)          → "아메리카노로"
      //     - "아메리카노은"(받침無 주제 오류)      → "아메리카노는"
      //     - "아메리카노을"(받침無 목적 오류)      → "아메리카노를"
      //   ※ "메뉴+이" 정정은 여기서 하지 않는다. 받침無 메뉴 직후 '이'는 주격이 아니라
      //     placeholder('이거/이 메뉴') 머리글자 잔재인 경우가 많아, '가'로 바꾸면
      //     "아메리카노가 한 잔" 같은 과교정이 발생한다. '이' 처리는 하단 블록 E
      //     (685줄 phReE1: 받침無 메뉴+이 → 메뉴+공백 제거)에 위임한다.
      //   받침有 메뉴엔 미적용 — 받침無일 때만(과교정 방지).
      {
        const lc = menu[menu.length - 1];
        const cc = lc ? lc.charCodeAt(0) : 0;
        const isHan = cc >= 0xAC00 && cc <= 0xD7A3;
        if (isHan) {
          const hasJong = (cc - 0xAC00) % 28 !== 0;
          if (!hasJong) {
            // 이중조사 우선(은으로/는으로 → 로)
            result = result.replace(new RegExp(`${mEsc}(?:은|는)으로(?=\\s|[,.!?]|$)`, "g"), `${menu}로`);
            // 으로 단독 → 로
            result = result.replace(new RegExp(`${mEsc}으로(?=\\s|[,.!?]|$)`, "g"), `${menu}로`);
            // 받침無 주제 '은' → '는' (받침無 명사+은은 명백 오류, placeholder 무관)
            result = result.replace(new RegExp(`${mEsc}은(?=\\s)`, "g"), `${menu}는`);
            // 받침無 목적 '을' → '를'
            result = result.replace(new RegExp(`${mEsc}을(?=\\s)`, "g"), `${menu}를`);
          }
        }
      }

      if (_DBG) console.log("[DBG-2 정정직후]", "은으로잔존:", result.includes("프라푸치노은으로"));

      // ★ [CAFE] ③ "케이크를 방문" (메뉴를 장소처럼) → 지시형 치환
      result = result.replace(new RegExp(`${mEsc}(?:을|를)\\s*(방문|찾아|들러)`, "g"), `이런 카페를 $1`);
      // ★ [CAFE] ③ "케이크 제격입니다" (주격조사 누락) → "케이크가 제격"
      {
        const lc2 = menu[menu.length - 1];
        const cc2 = lc2 ? lc2.charCodeAt(0) : 0;
        const jong2 = cc2 >= 0xAC00 && cc2 <= 0xD7A3 && (cc2 - 0xAC00) % 28 !== 0;
        result = result.replace(new RegExp(`${mEsc}\\s*제격`, "g"), `${menu}${jong2 ? "이" : "가"} 제격`);
      }

      // ★ "메뉴 한 그릇/한 접시" 반복 과다 → 3회 초과분 자연 대체 (가독성)
      const unitWord = (direction.servingUnit || "한 잔");
      const muEsc = `${menu}\\s*${unitWord.replace(/\s+/g, "\\s*")}`;
      const muRe = new RegExp(muEsc, "g");
      let muCount = 0;
      result = result.replace(muRe, (m) => {
        muCount++;
        if (muCount > 3) {
          const alts = [`${menu}은`, "이 메뉴는", "이 메뉴", `${menu}`];
          return alts[(muCount - 4) % alts.length];
        }
        return m;
      });
    }
  }

  // ★ 받침 뒤 주격/주제 조사 오타 정정 (GPT 빈발: "한 그릇는"→"한 그릇은", "그것는"→"그것은")
  result = result.replace(/그릇는/g, "그릇은");
  result = result.replace(/그것는/g, "그것은").replace(/그것를/g, "그것을");
  result = normalizeWhitespace(result);

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 광고형 평가어 → 행동·장면 표현 치환 (personal 전용)
  //   현상: "기대 이상이더라고요", "만족스러웠어요", "든든했어요"
  //   원칙: 평가는 줄이고, 행동/장면/체감으로 환원
  //   다양성: 같은 표현 반복 방지 위해 풀에서 순환 선택
  // ─────────────────────────────────────────────────────
  let adEvalFixed = 0;
  if (mode === "personal") {
    // (어구, 치환 후보 배열) — 후보는 순환 선택
    const evalConv = [
      // 기대 이상 — "이상이더라고요" / "이상이었어요" / "이상이에요" / "이상이다" 전부 커버
      [/기대\s*이상이?(?:더라고요|었어요|었습니다|에요|예요|었다|다)\.?/g, [
        "생각보다 진했어요",
        "예상보다 깊더라고요",
        "한 술 뜨고 멈칫했어요"
      ]],
      // 만족
      [/만족스러웠어요\.?/g, [
        "한 그릇 비울 동안 다른 생각이 안 들었어요",
        "끝까지 손이 자주 갔어요",
        "다 먹고도 한참 기분 좋게 앉아 있었어요"
      ]],
      [/만족스러웠습니다\.?/g, [
        "한 그릇 비울 동안 다른 생각이 안 들었어요",
        "끝까지 손이 자주 갔어요"
      ]],
      [/만족스럽게\s+/g, ["천천히 ", "끝까지 "]],
      [/만족스러운\s+/g, ["꾸준한 ", "한결같은 "]],
      // 든든
      [/든든했어요\.?/g, [
        "속이 따뜻하게 차오르더라고요",
        "한 그릇으로 점심이 끝났어요",
        "먹고 나니 출출함이 가셨어요"
      ]],
      [/든든했습니다\.?/g, [
        "속이 따뜻하게 차오르더라고요",
        "한 그릇으로 점심이 끝났어요"
      ]],
      [/든든하더라고요\.?/g, [
        "속이 따뜻해지더라고요",
        "먹고 나니 든든하게 채워졌어요"
      ]],
      [/든든한\s+한\s*끼/g, ["한 그릇으로 끝나는 점심"]],
      // 평가형 종결 ("좋았어요" 류 — 부사 강조 패턴만 차단)
      [/정말\s*좋았어요\.?/g, ["수저가 멈추지 않았어요", "한 그릇 금방 비웠어요"]],
      [/너무\s*좋았어요\.?/g, ["수저가 멈추지 않았어요", "한 그릇 금방 비웠어요"]],
      // 평가형 부사
      [/깔끔하게\s+잘\s+나왔어요\.?/g, ["반찬도 한 번에 차려졌어요", "그릇이 빠르게 정리됐어요"]],
      [/깔끔하게\s+잘\s+나왔습니다\.?/g, ["반찬도 한 번에 차려졌어요"]],
      // "기대 이상" 단독 (위 종결 패턴이 안 잡은 경우)
      [/기대\s*이상/g, "예상보다 진한"],
    ];

    const pickerCount = {};
    for (const [re, repl] of evalConv) {
      result = result.replace(re, (m) => {
        adEvalFixed++;
        if (typeof repl === "string") return repl;
        // 배열: 순환 선택 (같은 패턴 반복 시 다른 치환 적용)
        const key = re.source;
        pickerCount[key] = (pickerCount[key] || 0);
        const choice = repl[pickerCount[key] % repl.length];
        pickerCount[key]++;
        return choice;
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 이슈 #1 QC: 조사 오류 교정 횟수 로그
  //   교정이 발생했다는 것 = GPT가 조사 오류를 출력했다는 신호
  //   0건이 이상적, 1~2건은 후처리로 잡힘, 5건+ 시 프롬프트 점검 필요
  // ─────────────────────────────────────────────────────
  if (particleErrorCount > 0) {
    console.log(`[cafe][QC] 조사오류 교정: ${particleErrorCount}건 (메뉴+조사+장소 패턴 → "이 장소"로 자동 교정)`);
  }
  if (menuMetaCount > 0) {
    console.log(`[cafe][QC] 메뉴 fingerprint 차단: ${menuMetaCount}건 ("${menu}+조사+메뉴" → "이 한 그릇/이거/그것" ★ Phase 9.5 v4)`);
  }
  if (adEvalFixed > 0) {
    console.log(`[cafe][QC] 광고평가어 치환: ${adEvalFixed}건 (기대이상/만족/든든 류 → 행동·장면 표현)`);
  }
  // ─────────────────────────────────────────────────────
  // ★ v1.2 가격 출력 안전망 (personal 전용) — 숫자 가격 제거
  //   사유: data/prompts에서 가격 원천 제거했으나 LLM 환각 방어선
  //   "3천원", "4천 5백원", "5천원대", "1만원" 등 → "부담 없는 가격" 결로 치환
  //   commercial 모드는 이미 위(299~302)에서 차단됨
  // ─────────────────────────────────────────────────────
  let priceStripCount = 0;
  if (mode === "personal") {
    const priceRes = [
      /\d+\s*만\s*\d*\s*천?\s*원\s*대?/g,        // 1만원, 1만 8천원, 1만원대
      /\d+\s*천\s*\d*\s*백?\s*원\s*대?/g,        // 3천원, 4천 5백원, 5천원대
      /\d+,?\d+\s*원\s*대?/g,                    // 9000원, 9,000원
      /개당\s*\d[\d,\s천백만]*원\s*대?/g,        // 개당 1천원
    ];
    for (const re of priceRes) {
      result = result.replace(re, () => { priceStripCount++; return "부담 없는 가격"; });
    }
    // 치환 후 거친 조사·어미 연결 자연화
    result = result
      .replace(/부담 없는 가격\s*~\s*부담 없는 가격/g, "부담 없는 가격")      // 범위(A~B) → 단일
      .replace(/부담 없는 가격(?:에서)?\s*부담 없는 가격/g, "부담 없는 가격")  // 중복 제거
      .replace(/부담 없는 가격정도/g, "부담 없는 정도")
      .replace(/부담 없는 가격였(어요|고|다)/g, "부담 없는 가격이었$1")
      .replace(/부담 없는 가격안팎/g, "부담 없는 가격대")
      .replace(/부담 없는 가격부터/g, "부담 없는 가격대부터");
  }
  if (priceStripCount > 0) {
    console.log(`[cafe][QC] ★ v1.2 가격 출력 제거: ${priceStripCount}건 (숫자 가격 → "부담 없는 가격")`);
  }
  // ─────────────────────────────────────────────────────
  // ★ FREEZE 예외 #1 (분식 placeholder 결합 교정) — restaurant 전용
  //   현상: restoreKeyword 복원 시 "메뉴명 + 이 한 그릇/이거/그것/조합" 결합
  //         → "순대이 한 그릇", "어묵이 한 그릇", "맵고떡볶이이 한 그릇",
  //           "로제떡볶이이 한 그릇", "라면이 한 그릇", "순대이 조합", "이거가"
  //   원인: 받침 메뉴명 + placeholder 머리글자('이') 가 조사처럼 달라붙음
  //   교정: 메뉴명 + (이|가) + "한 그릇/조합" → 메뉴명 + " 한 그릇/조합"
  //         (받침 유무 무관 — placeholder 'ㅇ'머리 제거가 목적)
  //   주의: 실제 메뉴명 리스트로만 제한 → "없이 한 그릇" 등 정상 문장 보존
  //   QC: placeholderFixCount 누적
  // ─────────────────────────────────────────────────────
  let placeholderFixCount = 0;
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // A) "메뉴명 + (이|가) + 한 그릇/조합/접시"  →  "메뉴명 + 공백 + 명사"
    const phReA = new RegExp(`${menuEsc}(?:이|가)\\s*(한\\s*그릇|조합|접시)`, "g");
    result = result.replace(phReA, (m, noun) => {
      placeholderFixCount++;
      return `${menu} ${noun}`;
    });
    // B) "메뉴명 + (이|가) + 나오자/나왔/담긴/먹"  (서술 직결형 깨짐)
    const phReB = new RegExp(`${menuEsc}(?:이|가)\\s+(나오|나왔|담긴|담겨|먹)`, "g");
    result = result.replace(phReB, (m, verb) => {
      placeholderFixCount++;
      // 받침 유무에 따라 주격조사 정정 (받침O→이, 받침X→가)
      const last = menu.charCodeAt(menu.length - 1);
      const hasJong = (last - 0xac00) % 28 !== 0;
      return `${menu}${hasJong ? "이" : "가"} ${verb}`;
    });
  }
  // C) placeholder 자체 깨짐: "이거가/이거이" → 메뉴명+주격(있으면) 아니면 "이게"
  //    ※ 기존 \b 는 한글 뒤 단어경계 미작동 → lookahead로 교체
  {
    const cRepl = menu
      ? (() => { const last = menu.charCodeAt(menu.length - 1); const jong = (last - 0xac00) % 28 !== 0; return `${menu}${jong ? "이" : "가"}`; })()
      : "이게";
    result = result.replace(/이거(?:가|이)(?=\s|[,.!?]|$)/g, () => { placeholderFixCount++; return cRepl; });
  }
  // D) 잔존 "메뉴명+이/가 한 그릇" 일반화 안전망 (분식 어미 한정)
  {
    const genRe = /([가-힣]{1,5}(?:떡볶이|김밥|튀김|꼬치|순대|어묵|라면|만두))(?:이|가)\s*(한\s*그릇|조합|접시)/g;
    result = result.replace(genRe, (m, mn, noun) => {
      placeholderFixCount++;
      return `${mn} ${noun}`;
    });
  }
  // E) ★ v1.2 표시명 길어짐 부작용 — 메뉴 표시명 직후 placeholder 잉여 '이' 제거
  //   현상(실측): "매콤한 떡볶이이 분위기", "참치마요 꼬마김밥이 김밥은",
  //               "꼬마김밥이 작은", "매운어묵 꼬마김밥이 분식집"
  //   원인: placeholder 머리글자 '이'가 표시명 끝에 달라붙음. 뒤 명사가
  //         한 그릇/조합 등 한정 목록이 아니라 임의어라 A·D가 못 잡음.
  //   교정 원칙:
  //     - 받침無 메뉴(떡볶이): 직후 '이'는 주격조사로 부적격(정상=가) → placeholder 확정 → 제거
  //     - 받침有 메뉴(김밥/순대/어묵 등): 직후 '이' 다음에 서술어가 아닌
  //       '명사후보'(또 다른 한글 1~ + 조사/공백, 또는 장소·동격어)면 잉여로 판정 → 제거
  //   보존: "김밥이 맛있다" 같은 정상 주격(뒤가 형용사/동사)은 건드리지 않음.
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const last = menu.charCodeAt(menu.length - 1);
    const hasJong = (last - 0xac00) % 28 !== 0;
    // 정상 주격 '이' 보존 목록(서술어 핵심). 이 어간으로 시작하면 진짜 주격 → 미교정.
    //   '작/크/많' 등 형용사 관형형은 보존에서 제외(placeholder 뒤 관형어가 실패 패턴).
    const KEEP = "맛있|좋|괜찮|들|나오|나왔|있|없|되|같|생각|들었|드|맞|어울|적합|무난|제격|알맞|낫|나은|편하|편안|인기|추천|충분";
    if (!hasJong) {
      // 받침無(예: 떡볶이): 직후 '이'.
      //   ① 뒤가 서술어(KEEP)면 → 진짜 주격인데 받침無라 '가'가 정상 → "이"를 "가"로 정정.
      //      ("매콤한 떡볶이이 잘 맞는다" → "매콤한 떡볶이가 잘 맞는다")
      //      서술어 앞 부사는 좁은 화이트리스트(잘/더/특히/꽤/매우/가장/잘) 1개만 허용 — 관형어 오정정 방지.
      //   ② 뒤가 비서술어(명사후보)면 → placeholder 'ㅇ'머리 확정 → 제거.
      const ADV = "잘|더|특히|꽤|매우|가장|아주|정말|상당히";
      const subjFixE = new RegExp(`${menuEsc}이(\\s+(?:${ADV}))?\\s+(?=(?:${KEEP}))`, "g");
      result = result.replace(subjFixE, (m, adv) => {
        placeholderFixCount++;
        return `${menu}가${adv || ""} `;
      });
      const phReE1 = new RegExp(`${menuEsc}이(\\s|(?=[가-힣]))`, "g");
      result = result.replace(phReE1, () => {
        placeholderFixCount++;
        return `${menu} `;
      });
    } else {
      // 받침有(예: 김밥/순대/어묵): "메뉴명이 + 비서술어"일 때만 잉여 제거. 서술어면 보존.
      const phReE2 = new RegExp(`${menuEsc}이\\s+(?!(?:${KEEP}))([가-힣])`, "g");
      result = result.replace(phReE2, (m, nextCh) => {
        placeholderFixCount++;
        return `${menu} ${nextCh}`;
      });
      // 공백 없이 바로 붙은 경우: "꼬마김밥이작은" → "꼬마김밥 작은"
      const phReE3 = new RegExp(`${menuEsc}이(?=(?!(?:${KEEP}))[가-힣])`, "g");
      result = result.replace(phReE3, () => {
        placeholderFixCount++;
        return `${menu} `;
      });
    }
  }

  // E-2) ★ [CAFE] 메뉴 축약형(별칭) 누출 안전망 — menu==="카페라떼" 한정
  //   현상(실측): GPT가 풀네임 "카페라떼"를 본문에서 "라떼"로 축약 출력 →
  //     블록 E(menu=풀네임 기준 정규식)가 매칭 못 함 → 누출:
  //       (a) "다양한 카페에서라떼이 한 잔" : 공백누락 + 받침無 별칭+이+명사
  //       (b) "라떼를 한 잔" / "라떼이 적합" 등 별칭+조사 결합 오류
  //   원칙: 전역 "라떼→카페라떼" 치환 절대 금지(바닐라라떼/말차라떼 등 충돌).
  //         menu가 정확히 "카페라떼"일 때만, 별칭 "라떼"에 대해
  //         블록 E phReE1/subjFixE 와 동형의 좁은 규칙만 적용.
  //   풀네임 보호: "카페라떼"(앞 글자가 "카페")는 negative lookbehind(?<!카페)로 제외.
  if (menu === "카페라떼") {
    const ALIAS = "라떼";
    // 정상 주격 '이' 보존 목록(블록 E와 동일). 뒤가 서술어면 받침無→'가' 정정.
    const KEEP_A = "맛있|좋|괜찮|들|나오|나왔|있|없|되|같|생각|들었|드|맞|어울|적합|무난|제격|알맞|낫|나은|편하|편안|인기|추천|충분";
    const ADV_A = "잘|더|특히|꽤|매우|가장|아주|정말|상당히";
    // (1) 조사/연결어미 뒤에 별칭이 붙은 공백누락만 복원: "...에서라떼" → "...에서 라떼"
    //     ★ 좁은 화이트리스트(조사/어미)로 한정 — "바닐라라떼/말차라떼" 등
    //       합성 메뉴명(앞이 명사어근)을 잘못 분리하지 않도록 함.
    //       "카페라떼"(풀네임)도 앞이 명사 '카페'라 자동 제외됨.
    result = result.replace(/(?<=(?:에서|에|의|는|은|이|가|을|를|와|과|도|로|으로|면|서|고|며|서는))라떼/g, () => {
      placeholderFixCount++;
      return " 라떼";
    });
    // (2) 별칭 주격 복구: "라떼이 +(부사)? 서술어" → "라떼가 ..."
    //     ★ 단독 별칭만(앞이 한글이면 합성메뉴 X라떼 — 제외).
    const aSubj = new RegExp(`(?<![가-힣])${ALIAS}이(\\s+(?:${ADV_A}))?\\s+(?=(?:${KEEP_A}))`, "g");
    result = result.replace(aSubj, (m, adv) => {
      placeholderFixCount++;
      return `${ALIAS}가${adv || ""} `;
    });
    // (3) 별칭+이+명사(placeholder 잉여 '이') 제거: "라떼이 한 잔" → "라떼 한 잔"
    //     (2)를 먼저 돌려 서술어 케이스를 소진한 뒤 나머지를 제거. 단독 별칭만.
    const aPh = new RegExp(`(?<![가-힣])${ALIAS}이(\\s|(?=[가-힣]))`, "g");
    result = result.replace(aPh, () => {
      placeholderFixCount++;
      return `${ALIAS} `;
    });
    result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1: 조사 중복 제거 (모드 무관 공통 안전망)
  //   현상: GPT/치환 잔여로 동일 조사 2연 출력 ("국물은은", "그것는는",
  //         "수육이가", "반찬을를", "여기도도", "국밥과과", "공깃밥와와")
  //   원칙: 받침/문맥 무관, 동일 조사 2연 → 1개로 축약. 의미 보존.
  //   주의: 정상 어휘("과과류" 등) 오교정 방지 위해 조사로만 쓰이는 2연만.
  //   QC: particleDupCount 누적
  // ─────────────────────────────────────────────────────
  let particleDupCount = 0;
  {
    // 받침 무관 '동일 조사 2연'만 축약. 이가/가이(주격)·을를(목적격)은 받침에
    // 따라 정답이 갈려 단순 축약 시 비문 위험 → STEP F 범위에서 제외.
    const dupRes = [
      /은은(?=\s|[,.!?]|$)/g,   // 은은 → 은
      /는는(?=\s|[,.!?]|$)/g,   // 는는 → 는
      /도도(?=\s|[,.!?]|$)/g,   // 도도 → 도
      /과과(?=\s|[,.!?]|$)/g,   // 과과 → 과
      /와와(?=\s|[,.!?]|$)/g,   // 와와 → 와
      /에에(?=\s|[,.!?]|$)/g,   // 에에 → 에
      /의의(?=\s|[,.!?]|$)/g,   // 의의 → 의
    ];
    const dupTo = ["은 ", "는 ", "도 ", "과 ", "와 ", "에 ", "의 "];
    dupRes.forEach((re, i) => {
      result = result.replace(re, () => { particleDupCount++; return dupTo[i]; });
    });
    result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1b: 이종(異種) 조사 2연 + placeholder 조사 오결합 정규화
  //   현상(실측): 메뉴반복 대체("이 메뉴"/"이 메뉴는")·placeholder 환원 뒤
  //     원래 조사가 남아 서로 다른 조사 2개가 연달아 출력됨.
  //       "이 메뉴는은", "순대국은을", "이 메뉴은"(받침無 명사+은)
  //   원칙: 뒤 조사를 정답으로 채택(문장 핵심 격), 앞 잉여 조사 제거.
  //   QC: particleDupCount 에 합산
  // ─────────────────────────────────────────────────────
  {
    const isoRes = [
      // 주제+주제/주격 충돌: "…는은" "…은는" → 핵심 격(뒤) 채택 후 받침 정정은 아래서
      [/는은(?=\s|[,.!?]|$)/g, "는 "],   // 이 메뉴는은 → 이 메뉴는
      [/은는(?=\s|[,.!?]|$)/g, "은 "],
      // 주제+목적격: "…은을" "…는을" → 목적격 채택
      [/은을(?=\s|[,.!?]|$)/g, "을 "],   // 순대국은을 → 순대국을
      [/는을(?=\s|[,.!?]|$)/g, "을 "],
      [/은를(?=\s|[,.!?]|$)/g, "를 "],
      [/는를(?=\s|[,.!?]|$)/g, "를 "],
      // 주제+주격: "…은이" "…는가" "…는이"
      [/은이(?=\s|[,.!?]|$)/g, "이 "],
      [/는가(?=\s|[,.!?]|$)/g, "가 "],
      [/는이(?=\s|[,.!?]|$)/g, "는 "],   // 이 메뉴는이 → 이 메뉴는
      [/은가(?=\s|[,.!?]|$)/g, "은 "],
      [/는의(?=\s|[,.!?]|$)/g, "의 "],   // 이 메뉴는의 → 이 메뉴의
      [/은의(?=\s|[,.!?]|$)/g, "의 "],
      [/는과(?=\s|[,.!?])/g, "와 "],      // 이 메뉴는과 → 이 메뉴와
      [/은과(?=\s|[,.!?])/g, "과 "],      // (받침 메뉴)은과 → 과
      [/은와(?=\s|[,.!?])/g, "과 "],      // 수육은와 → 수육과 (이종 + 와)
      [/는와(?=\s|[,.!?])/g, "와 "],      // (무받침)는와 → 와
    ];
    for (const [re, to] of isoRes) {
      result = result.replace(re, () => { particleDupCount++; return to; });
    }
    // "이 메뉴는에는/은에는" 등 주제격+부사격 2연 → 부사격 단일화 (단일조사 규칙보다 먼저)
    //   현상: "이 메뉴는에는 기본 반찬으로…" → "이 메뉴에는"
    result = result.replace(/이\s*메뉴(?:는|은)에(는|도)?(?=\s|[,.!?])/g, (m, p) => { particleDupCount++; return `이 메뉴에${p || ""} `; });
    result = result.replace(/이\s*메뉴(?:는|은)의(?=\s|[,.!?])/g, () => { particleDupCount++; return "이 메뉴의 "; });
    // "이 메뉴은/이 메뉴이"(받침無 '메뉴') → 는/가, "이 메뉴을" → 를
    result = result.replace(/이\s*메뉴은(?=\s|[,.!?]|$)/g, () => { particleDupCount++; return "이 메뉴는 "; });
    result = result.replace(/이\s*메뉴이(?=\s|[,.!?]|$)/g, () => { particleDupCount++; return "이 메뉴가 "; });
    result = result.replace(/이\s*메뉴을(?=\s|[,.!?]|$)/g, () => { particleDupCount++; return "이 메뉴를 "; });
    // ★ STEP F-1b-josa3: 검수 잔여 비문 명시 가드 (실생성 기반 — 술국/수육 교차검증)
    //   상위 일반망(651/674행)에서 새는 케이스를 명시 케이스로 보강. menu 무관 안전 치환만.
    {
      const josa3 = [
        [/술국은에는(?=\s|[,.!?])/g, "술국에는 "],          // 비문: 주제격+부사격 오결합
        [/술국\s*점에서(?=\s|[,.!?])/g, "술국은 "],          // 오타: '술국 점' → 술국은
        [/수육\s*전문점에서는\s*인근의\s*한식당에서는/g, "인근 한식당에서는 "], // 부사격 2연 중복
        [/이\s*메뉴는에는(?=\s|[,.!?])/g, "이 메뉴에는 "],   // 주제격+부사격 오결합 (명시 보강)
        [/그것의\s*장점/g, "이 메뉴의 장점"],                 // 대명사 '그것의' → 메뉴 지시
        [/함꼐/g, "함께"],                                    // 오타: 함꼐 → 함께
        // ★ [CAFE] ③ 비문 보강 (판정 실측분)
        [/이\s*메뉴씩\s*나눠/g, "이 메뉴를 나눠"],            // "이 메뉴씩 나눠" → "이 메뉴를 나눠"
        [/이\s*메뉴과(?=\s|[,.!?])/g, "이 메뉴와"],           // "이 메뉴과" → "이 메뉴와"
      ];
      for (const [re, to] of josa3) {
        result = result.replace(re, () => { particleDupCount++; return to; });
      }
      // ★ 대명사 '그것' 주격/주제격 → 메뉴 지시 (있으면 menu, 없으면 '이 메뉴')
      //   "그것가/그것이→메뉴가/이", "그것은/그것는→메뉴은/는". 받침 정합 반영.
      {
        const ref = menu || "이 메뉴";
        const last = ref.charCodeAt(ref.length - 1);
        const jongR = (last - 0xac00) % 28 !== 0;
        const subj = `${ref}${jongR ? "이" : "가"}`;  // 주격
        const topi = `${ref}${jongR ? "은" : "는"}`;  // 주제격
        const pron = [
          // 단어 앞: 공백 1개 유지(흡수). 부호/문장끝 앞: 공백 없이.
          [/그것가\s+(?=\S)/g, `${subj} `], [/그것가(?=[,.!?)]|$)/g, subj],
          [/그것이\s+(?=\S)/g, `${subj} `], [/그것이(?=[,.!?)]|$)/g, subj],
          [/그것은\s+(?=\S)/g, `${topi} `], [/그것은(?=[,.!?)]|$)/g, topi],
          [/그것는\s+(?=\S)/g, `${topi} `], [/그것는(?=[,.!?)]|$)/g, topi],
        ];
        for (const [re, to] of pron) {
          result = result.replace(re, () => { particleDupCount++; return to; });
        }
      }
      // ★ 메뉴명 직후 placeholder '이' 머리 + 은에는/는에는 오결합 → 메뉴+에는
      //   "매콤한 떡볶이은에는→매콤한 떡볶이에는" (받침無 메뉴 떡볶이 + 'ㅇ'머리 placeholder)
      if (menu) {
        const mE2 = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        result = result.replace(
          new RegExp(`${mE2}(?:은|는)에(는|도)?\\s+(?=\\S)`, "g"),
          (m, p) => { particleDupCount++; return `${menu}에${p || ""} `; }
        );
        result = result.replace(
          new RegExp(`${mE2}(?:은|는)에(는|도)?(?=[,.!?)]|$)`, "g"),
          (m, p) => { particleDupCount++; return `${menu}에${p || ""}`; }
        );
        // ★ 메뉴명 + 공백 + '다'(문장종결) → 서술격조사 누락 보강.
        //   "순대국 다." → "순대국이다." (받침有) / "로제떡볶이 다." → "로제떡볶이다." (받침無)
        //   종결부호/줄끝 직전만 — "순대국 다음/다섯" 등 정상어구 오교정 방지.
        {
          const mLast = menu.charCodeAt(menu.length - 1);
          const mJong = (mLast - 0xac00) % 28 !== 0;
          result = result.replace(
            new RegExp(`${mE2}\\s+다(?=[.!?]|$)`, "g"),
            () => { particleDupCount++; return `${menu}${mJong ? "이다" : "다"}`; }
          );
        }
      }
    }
    // 메뉴명 직후 이종조사 2연 한정 정리 (정상어구 과교정 방지 — menu 한정)
    //   "순대국은과→순대국과", "순대국은을→순대국을", "순대국은를→순대국를(→을 정정 후속)"
    if (menu) {
      const mE = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const last = menu.charCodeAt(menu.length - 1);
      const jong = (last - 0xac00) % 28 !== 0;
      const menuIso = [
        [new RegExp(`${mE}은과(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "과" : "와"} `],
        [new RegExp(`${mE}는과(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "과" : "와"} `],
        // ★ 은와/는와 (이종 + 와) 추가: "수육은와→수육과", "수육는와→수육과"
        [new RegExp(`${mE}은와(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "과" : "와"} `],
        [new RegExp(`${mE}는와(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "과" : "와"} `],
        [new RegExp(`${mE}은을(?=\\s|[,.!?])`, "g"), `${menu}을 `],
        [new RegExp(`${mE}는을(?=\\s|[,.!?])`, "g"), `${menu}을 `],
        [new RegExp(`${mE}은이(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "이" : "가"} `],
        [new RegExp(`${mE}는이(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "은" : "는"} `],
        // 받침 기반 잘못된 주제격 정정: "수육는→수육은"(받침有 메뉴에 는), "메뉴은→메뉴는"(받침無에 은)
        [new RegExp(`${mE}${jong ? "는" : "은"}(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "은" : "는"} `],
        // 받침 기반 잘못된 목적격 정정: 받침有 메뉴+"를"→"을", 받침無 메뉴+"을"→"를"
        [new RegExp(`${mE}${jong ? "를" : "을"}(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "을" : "를"} `],
        // 받침 기반 잘못된 접속조사 정정: 받침無 메뉴+"과"→"와", 받침有 메뉴+"와"→"과"
        //   "매콤 로제 떡볶이과→떡볶이와", "수육와→수육과"
        [new RegExp(`${mE}${jong ? "와" : "과"}(?=\\s|[,.!?])`, "g"), `${menu}${jong ? "과" : "와"} `],
      ];
      for (const [re, to] of menuIso) {
        result = result.replace(re, () => { particleDupCount++; return to; });
      }
    }
    // "메뉴명 + 공백 + 수사(두/세/몇/여러) + 반찬/가지" 깨짐 → 지시어로 환원
    //   현상: "순대국 두 반찬은" (메뉴명이 수식어 자리에 잘못 결합)
    if (menu) {
      const menuEsc2 = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const numNounRe = new RegExp(`${menuEsc2}\\s+(두|세|네|몇|여러)\\s+(반찬|가지)`, "g");
      result = result.replace(numNounRe, (m, num, noun) => { particleDupCount++; return `이 ${num} ${noun}`; });
    }
    // "한 그릇/한 접시"(받침 명사) 뒤 받침의존 조사 오결합 정정
    result = result.replace(/(그릇|접시)를(?=\s|[,.!?]|$)/g, (m, n) => { particleDupCount++; return `${n}을 `; });
    result = result.replace(/(그릇|접시)이(?=\s|[,.!?]|$)/g, (m, n) => { particleDupCount++; return `${n}이 `; });
    // 접시(받침無)+을 → 를 ("한 접시을→한 접시를"). 그릇(받침有)+을은 정상이라 제외.
    result = result.replace(/접시을(?=\s|[,.!?]|$)/g, () => { particleDupCount++; return "접시를 "; });
    // "에서을/에서를"(부사격+목적격 깨짐) → "을/를" : "전문점에서을→전문점을"
    result = result.replace(/에서을(?=\s|[,.!?])/g, () => { particleDupCount++; return "을 "; });
    result = result.replace(/에서를(?=\s|[,.!?])/g, () => { particleDupCount++; return "를 "; });
    // placeholder 잔여 지시어 잉여: "이 매장마다/별로/에서는/에서" → 지시어 제거
    result = result.replace(/이\s*매장(마다|별로|에서는|에서)(?=\s|[,.!?])/g, (m, p) => { particleDupCount++; return `매장${p}`; });
    // "이 매장에 따라" → "매장에 따라" (잉여 지시어)
    result = result.replace(/이\s*매장에\s*따라(?=\s|[,.!?])/g, () => { particleDupCount++; return "매장에 따라"; });
    // "이 가게들은/이 가게들이/이 가게는" → 일반 안내체("매장에서는") 환원 (매장명 비노출 정합)
    result = result.replace(/이\s*가게들?(?:은|는|이|에서는|에서)(?=\s|[,.!?])/g, () => { particleDupCount++; return "매장에서는"; });
    // 종결부호 깨짐: ".," / ". ," → "." (문장 끝에 쉼표 잘못 붙은 경우)
    result = result.replace(/\.\s*,\s*/g, () => { particleDupCount++; return ". "; });
    result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1c: 메뉴명 직후 주격조사 누락 자연화 (서술어 직결형)
  //   현상(실측): 치환 잔여로 "순대국 잘 어울린다", "순대국 자주 선택된다"
  //     처럼 주어(메뉴)와 서술어 사이 주격조사가 빠져 어색.
  //   원칙: "메뉴명 + 공백 + (잘|자주|매우|특히 …)부사 + 서술" 한정으로만
  //     주격조사(받침→이/무→가) 삽입. 좁은 화이트리스트라 과교정 위험 낮음.
  //   QC: subjParticleFixCount
  // ─────────────────────────────────────────────────────
  let subjParticleFixCount = 0;
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const last = menu.charCodeAt(menu.length - 1);
    const hasJong = (last - 0xac00) % 28 !== 0;
    const subjP = hasJong ? "이" : "가";
    // 메뉴명 + 공백 + (부사) + 서술핵심  → 메뉴명+주격 삽입
    const advRe = new RegExp(`${menuEsc}\\s+(잘|자주|특히|매우|꽤|항상|늘|두루)\\s+(어울|선택|인기|사랑|적합|무난|제격|찾)`, "g");
    result = result.replace(advRe, (m, adv, verb) => {
      subjParticleFixCount++;
      return `${menu}${subjP} ${adv} ${verb}`;
    });
    // ★ 메뉴명 + 속성명사(매운맛/매운 정도/과정 등) 직결 → 소유격 '의' 삽입
    //   현상: "꼬마김밥 매운맛은", "순대국 과정에서" (관형 소유 자리 조사 누락)
    const possRe = new RegExp(`${menuEsc}\\s+(매운맛|매운\\s*정도|과정|국물|양념|구성|반찬)([은는이가을를에의]|에서|마다)`, "g");
    result = result.replace(possRe, (m, noun, p) => {
      subjParticleFixCount++;
      return `${menu}의 ${noun}${p}`;
    });
    // ★ 메뉴명 + 관형어(매력적인/특별한/매콤한 등) + 명사 → 주격 삽입
    //   현상: "매콤한 떡볶이 매력적인 선택", "떡볶이 매콤한 요리는"
    const adnRe = new RegExp(`${menuEsc}\\s+(매력적인|특별한|무난한|괜찮은|든든한)\\s+(선택|메뉴|요리|구성|한\\s*끼)`, "g");
    result = result.replace(adnRe, (m, adn, noun) => {
      subjParticleFixCount++;
      return `${menu}${subjP === "이" ? "은" : "는"} ${adn} ${noun}`;
    });
  }
  if (subjParticleFixCount > 0) result = normalizeWhitespace(result);

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1c2: [CAFE] 조사 결합 잔여 안전망 (카페 계열 전용)
  //   사유: 기존 후처리(menuIso/F-1c)는 분식·식당 기준이라 카페 단위명사(잔/조각)
  //     및 카페 특유 placeholder 잔여를 못 잡음. OWNER 스폿에서 확인된 본문 실재
  //     5계열만 좁게 보정. 전부 받침판정 기반 — 과교정 위험 낮음.
  //   QC: cafeJosaFixCount
  // ─────────────────────────────────────────────────────
  let cafeJosaFixCount = 0;
  {
    // (1) 단위명사(받침有: 잔·조각) 조사 오결합 정정
    //     "이 한 잔는 / 이 한 조각는" → "...은" (주제조사)
    //     "이 한 조각가 / 이 한 잔가" → "...이" (주격) ★스폿 재발분 추가
    result = result.replace(/(잔|조각)는(?=\s|[,.!?]|$)/g, (m, n) => {
      cafeJosaFixCount++; return `${n}은`;
    });
    result = result.replace(/(잔|조각)가(?=\s|[,.!?]|$)/g, (m, n) => {
      cafeJosaFixCount++; return `${n}이`;
    });
    // (1b) 일반명사 "카페"(받침無) 조사 오결합 정정 ★스폿 재발분
    //      "이 동네 카페을 / 카페이" → "카페를 / 카페가". placeholder 잔여 오조사.
    result = result.replace(/카페을(?=\s|[,.!?]|$)/g, () => { cafeJosaFixCount++; return "카페를"; });
    result = result.replace(/카페이(?=\s|[,.!?]|$)/g, () => { cafeJosaFixCount++; return "카페가"; });
    // (2) placeholder 이중조사 "이 메뉴는으로 / 이 메뉴은으로" → "이 메뉴로"
    //     (주제조사+부사격 충돌 → 부사격 우선 보존, 받침無 '메뉴'라 '로')
    result = result.replace(/이\s*메뉴(?:는|은)으로(?=\s|[,.!?])/g, () => {
      cafeJosaFixCount++; return "이 메뉴로";
    });
    // (3) 메뉴명 + 공백 + 지시관형사(그/이/저) + 명사 → 주제조사 삽입
    //     "크로플 그 순간을" → "크로플은 그 순간을". placeholder 제거 후 조사 누락 케이스.
    if (menu) {
      const mE = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const last = menu.charCodeAt(menu.length - 1);
      const jong = (last - 0xac00) % 28 !== 0;
      const topP = jong ? "은" : "는";
      const demonRe = new RegExp(`${mE}\\s+(그|이|저)\\s+([가-힣])`, "g");
      result = result.replace(demonRe, (m, dem, nextCh) => {
        cafeJosaFixCount++; return `${menu}${topP} ${dem} ${nextCh}`;
      });
      // (4) 메뉴명 + 공백 + 서술어(적당/적합/무난/충분/좋/괜찮…) 직결 → 주제조사 삽입
      //     "케이크 적당합니다" → "케이크는 적당합니다". F-1c는 부사 있을 때만이라 미커버.
      const PRED = "적당|적합|무난|충분|괜찮|좋|편하|편안|어울|제격|알맞|낫|나은|인기|넉넉|만족";
      const predRe = new RegExp(`${mE}\\s+(?=(?:${PRED}))`, "g");
      result = result.replace(predRe, () => {
        cafeJosaFixCount++; return `${menu}${topP} `;
      });
      // (5) 메뉴명 + 공백 + 피동/자동 서술어(제공되/제공된/준비되/마련되…) → 주격 삽입
      //     "방문 시 크로플 제공되는" → "크로플이 제공되는". 주제조사(은/는)가 아니라
      //     주격(이/가)이 자연스러운 피동 구문. '제공' 단독(명사)은 제외 — 활용형만.
      const subjP2 = jong ? "이" : "가";
      const PASV = "제공되|제공된|준비되|준비된|마련되|마련된|제공돼|준비돼|마련돼";
      const pasvRe = new RegExp(`${mE}\\s+(?=(?:${PASV}))`, "g");
      result = result.replace(pasvRe, () => {
        cafeJosaFixCount++; return `${menu}${subjP2} `;
      });
      // (6) 메뉴명 + 공백 + 장소명사(근방/일대/근처/동네/일원) + 조사 → 메뉴 잉여 제거
      //     현상(실측): "크로플 근방에서는 크로플을" — GPT가 "이 근방" 자리에 메뉴명
      //       잉여 주입. 메뉴명을 지시어 "이"로 환원해 "이 근방에서는"으로 정정.
      //     주의: 뒤따르는 본래 메뉴(크로플을)는 건드리지 않음.
      const placeRe = new RegExp(`${mE}\\s+(근방|일대|근처|동네|일원)(에서는|에서|에는|에|의|는|은|가|이)?`, "g");
      result = result.replace(placeRe, (m, place, josa) => {
        cafeJosaFixCount++; return `이 ${place}${josa || ""}`;
      });
    }
    if (cafeJosaFixCount > 0) result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1d: 효능·의학 단정 표현 제거 (mode 무관 공통 안전망)
  //   사유: 식당 정보형 글에 효능 단정은 의료/과장 위험 + PHILOSOPHY 광고배제.
  //   원칙: 효과를 단정하지 않는 '행동·선택' 표현으로 환원.
  //   QC: efficacyFixCount
  // ─────────────────────────────────────────────────────
  let efficacyFixCount = 0;
  {
    const effConv = [
      // 숙취/해장 효능 단정 → 행동 표현
      [/숙취\s*해소에\s*도움(?:을)?\s*(?:줄\s*수\s*있다|준다|된다)\.?/g, "해장 메뉴로 찾는 사람들도 있다."],
      [/숙취\s*해소에\s*좋다\.?/g, "해장용으로 찾는 사람들도 있다."],
      [/해장에\s*(?:좋다|효과적이다|그만이다)\.?/g, "해장용으로 찾는 경우도 있다."],
      // 해장용 '적합/인기' 단정 → 식사 선택 표현 (효능 암시 완화)
      [/(?:회식\s*후\s*)?해장용으로(?:도)?\s*(?:적합하다|좋다|제격이다)\.?/g, "간단한 한 끼로 선택하는 경우도 있다."],
      [/해장(?:을\s*위한)?\s*속풀이\s*메뉴로(?:도)?\s*인기가?\s*(?:높다|많다|높으며|많으며|높고|많고)/g, "든든한 한 끼로 찾는 경우가 많으며"],
      [/해장용으로\s*찾는\s*이들이\s*많(?:으며|다)/g, "든든한 한 끼로 찾는 경우가 많으며"],
      // 스트레스 해소 효능 → 행동·취향 표현
      [/스트레스\s*해소에\s*(?:적합한|좋은|도움(?:을)?\s*(?:줄\s*수\s*있다|준다|되는))/g, "매운맛이 생각날 때 찾기 좋은"],
      [/매운맛이\s*스트레스(?:를|가)?\s*날려(?:줄\s*수\s*있는|주는)?\s*역할(?:을\s*한다|을\s*할\s*수\s*있다|도\s*한다)?\.?/g, "칼칼한 맛을 즐기는 사람들이 찾는 편이다."],
      [/스트레스(?:를|가)?\s*날려(?:줄\s*수\s*있는|주는)\s*역할(?:을\s*한다|을\s*할\s*수\s*있다)?\.?/g, "칼칼한 맛을 즐기는 사람들이 찾는 편이다."],
      [/스트레스(?:를|가)?\s*(?:해소)(?:하는|시키는|할\s*수\s*있는)?(?:\s*데)?\s*(?:도움(?:을)?\s*(?:줄\s*수\s*있다|준다|되는|되며)|역할(?:을\s*한다|을\s*할\s*수\s*있다)?)\.?/g, "칼칼한 맛을 즐기는 사람들이 찾는 편이다."],
      [/스트레스(?:를)?\s*해소(?:하길|하고자)\s*(?:원하는|찾는)\s*경우/g, "매운맛이 생각나는 경우"],
      [/스트레스\s*해소/g, "기분 전환"],
      // 해장 '원할 때/위한 아침' + 숙취 '달램' → 식사 표현
      [/해장(?:을)?\s*(?:원할|하고\s*싶을)\s*때(?:\s*부담\s*없이\s*선택할\s*수\s*있으며)?/g, "든든한 한 끼가 필요할 때"],
      [/해장(?:을\s*위한|이나)?\s*(?:아침\s*식사|혼밥)/g, "든든한 식사"],
      [/해장이나\s*술안주로(?:도)?\s*적합(?:하다|한\s*메뉴다)?\.?/g, "가벼운 모임에서 선택하는 경우도 있다."],
      [/(?:전날의\s*)?숙취를\s*달래기(?:에)?\s*좋다\.?/g, "따뜻하게 즐기기 좋다."],
      [/숙취\s*해소를\s*위한\s*아침\s*식사/g, "따뜻한 국물이 생각나는 아침"],
      // 속을 편안/달램 효능 → 국물 표현 (종결형 포함)
      [/속을\s*편안하게\s*(?:해주는|해\s*주는|만들어주는)/g, "따뜻하게 즐기기 좋은"],
      [/속을\s*편안하게\s*(?:해준다|해\s*준다|만들어준다)\.?/g, "따뜻한 국물을 즐길 수 있다."],
      // 입맛 돋움 / 상쇄 / 업그레이드 — 기능성 표현 완화
      [/입맛을\s*돋우는\s*역할(?:을\s*한다|을\s*하며|을\s*한다고\s*알려져\s*있다)?\.?/g, "함께 곁들이는 경우가 많다."],
      [/(?:기름진\s*맛|느끼함)(?:을|를)?\s*상쇄(?:시켜준다|해준다|시킨다|한다)\.?/g, "함께 곁들이는 경우가 많다."],
      [/(?:얼큰함|매콤함|풍미)(?:을|를)?\s*(?:한층\s*)?업그레이드\s*(?:시킨다|해준다|시켜준다|한다)\.?/g, "함께 곁들이는 경우도 있다."],
      [/(?:부드러운\s*)?크림의\s*풍미가\s*매운맛을\s*완화해/g, "크림의 풍미가 매운맛과 균형을 이뤄"],
      [/매운맛을\s*완화(?:해|시켜|하여)(?=\s)/g, "매운맛과 균형을 이뤄"],
      // 일반 효능/건강 단정 → 완화
      [/속을\s*풀어준다\.?/g, "속을 달래려 찾는 경우도 있다."],
      [/피로\s*해소에\s*도움(?:을)?\s*(?:줄\s*수\s*있다|준다)\.?/g, "가볍게 한 끼로 찾는 경우도 있다."],
      [/건강에\s*좋다\.?/g, "부담 없이 즐기는 사람들도 있다."],
      [/면역력?(?:에|을)\s*(?:좋다|높여준다|도움)\.?/g, "꾸준히 찾는 사람들도 있다."],
    ];
    for (const [re, to] of effConv) {
      result = result.replace(re, () => { efficacyFixCount++; return to; });
    }
    if (efficacyFixCount > 0) result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1e: 특정 매장 지칭 표현 → 메뉴 일반화 (PHILOSOPHY 정합)
  //   사유: Restaurant 엔진은 '메뉴 일반 정보형'. "이 가게의/그 가게의/이 집의"
  //     같은 특정 매장 지칭은 매장 소개형으로 읽혀 철학 위배.
  //   원칙: 매장 지칭 → 메뉴명(있으면) 또는 "이 메뉴는"으로 환원.
  //     ※ 후처리 차단만. prompts FORBIDDEN 등재는 v2.10으로 분리.
  //   QC: storeRefFixCount
  // ─────────────────────────────────────────────────────
  let storeRefFixCount = 0;
  {
    const menuSubj = menu
      ? (((menu.charCodeAt(menu.length - 1) - 0xac00) % 28 !== 0) ? `${menu}은` : `${menu}는`)
      : "이 메뉴는";
    const storeConv = [
      // "이/그/저 가게의 + 메뉴명" → 메뉴명 직결 (소유격 흡수)
      [new RegExp(`[이그저]\\s*(?:가게|집|식당|매장|곳)의\\s*(?=\\S)`, "g"), ""],
      // "이/그/저 가게는/가게에서는" 등 주제·부사격 → "이 메뉴는"/"매장에서는"
      [/[이그저]\s*(?:가게|집|식당|곳)는/g, menuSubj],
      [/[이그저]\s*(?:가게|집|식당|곳)에서는/g, "매장에서는"],
      [/[이그저]\s*(?:가게|집|식당|곳)가/g, menu ? `${menu}이` : "이 메뉴가"],
      [/[이그저]\s*(?:가게|집|식당|곳)을/g, menu ? `${menu}을` : "이 메뉴를"],
    ];
    for (const [re, to] of storeConv) {
      result = result.replace(re, () => { storeRefFixCount++; return to; });
    }
    if (storeRefFixCount > 0) result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1f: 메뉴명 직후 동일 키워드 중복 제거 (확장)
  //   현상(실측): "매콤한 떡볶이 떡볶이를", "○○ 순대국 순대국은" 등
  //     수식형 메뉴명 + 핵심명사 중복. 치환 잔여로 발생.
  //   원칙: 메뉴명 끝 토큰(공백 기준 마지막 어절)이 직후에 반복되면 1회 제거.
  //     좁은 패턴(메뉴명 + 공백 + 끝토큰)이라 정상어구 손상 위험 낮음.
  //   QC: menuDupCount
  // ─────────────────────────────────────────────────────
  let menuDupCount = 0;
  if (menu) {
    const tail = (menu.trim().split(/\s+/).pop() || "");
    if (tail && tail.length >= 2 && tail !== menu) {
      const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tailEsc = tail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // "메뉴명 + 공백 + 끝토큰 + (조사)" → "메뉴명 + (조사)"
      const dupRe = new RegExp(`(${menuEsc})\\s+${tailEsc}([은는이가을를도와과에의]?)`, "g");
      result = result.replace(dupRe, (m, mm, p) => { menuDupCount++; return `${mm}${p}`; });
    }
    // ★ 전체 메뉴명 즉시 반복 → 1회 제거 ("매콤한 떡볶이 매콤한 떡볶이는" → "매콤한 떡볶이는")
    //   끝토큰 패턴(위)이 못 잡는 수식형 메뉴명 통째 반복 케이스.
    {
      const menuEscF = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fullDupRe = new RegExp(`${menuEscF}\\s+${menuEscF}([은는이가을를도와과에의]?)`, "g");
      result = result.replace(fullDupRe, (m, p) => { menuDupCount++; return `${menu}${p}`; });
    }
    // "메뉴명 외에도 메뉴명+조사" → "메뉴명은/는" (자기참조 중복: 머릿고기 외에도 머릿고기와)
    if (menu) {
      const menuEsc2 = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const last = menu.charCodeAt(menu.length - 1);
      const jong = (last - 0xac00) % 28 !== 0;
      const selfRefRe = new RegExp(`${menuEsc2}\\s*외에도\\s*${menuEsc2}([은는와과])`, "g");
      result = result.replace(selfRefRe, () => {
        menuDupCount++;
        return `${menu}${jong ? "은" : "는"}`;
      });
    }
    // ★ "전문점에서는 + 업종복수(분식점들은/가게들은/한식당에서는...)" 중복 비문 → 앞단만 유지
    //   "전문점에서는 분식점들은" → "전문점에서는" / "전문점의 가게들은" → "전문점에서는"
    //   치환 잔여로 '전문점'과 '업종 복수형'이 이중 노출되는 패턴. menu 무관.
    {
      const bizDup = [
        [/전문점에서는\s*(?:분식점들은|가게들은|식당들은|한식당들은|매장들은|음식점들은)/g, "전문점에서는"],
        [/전문점의\s*(?:가게들은|분식집에서는|식당들은|한식당들은|매장들은)/g, "전문점에서는"],
        [/전문점의\s*한식당/g, "전문점"],   // "수육 전문점의 한식당" → "수육 전문점"
      ];
      for (const [re, to] of bizDup) {
        result = result.replace(re, () => { menuDupCount++; return to; });
      }
    }
    if (menuDupCount > 0) result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1g: 과(過)수식어 제거 (광고성 표현 — PHILOSOPHY 정합)
  //   사유: "완벽한 한 끼", "최고의", "역대급" 등은 광고형. 정보형 글에 부적합.
  //   원칙: 수식어를 떼고 중립 명사구로 환원하거나 삭제.
  //     ※ 후처리 차단만. prompts FORBIDDEN 등재는 v2.10으로 분리.
  //   QC: superlativeFixCount
  // ─────────────────────────────────────────────────────
  let superlativeFixCount = 0;
  {
    const supConv = [
      [/완벽한\s*한\s*끼[를을]?\s*즐길\s*수\s*있다/g, "함께 즐기기 좋은 조합이다"],
      [/완벽한\s*한\s*끼/g, "괜찮은 한 끼"],
      [/완벽한\s*조합/g, "잘 어울리는 조합"],
      [/완벽하게\s*/g, ""],
      [/완벽한\s*/g, ""],
      [/최고의\s*/g, ""],
      [/역대급\s*/g, ""],
      [/인생\s*(?=맛집|메뉴|음식)/g, ""],
      [/찐\s*맛집/g, "분식점"],
      [/강추\s*/g, ""],
    ];
    for (const [re, to] of supConv) {
      result = result.replace(re, () => { superlativeFixCount++; return to; });
    }
    if (superlativeFixCount > 0) result = normalizeWhitespace(result);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-1h: 단위(그릇/접시) 정합 — data.servingUnit 기준
  //   현상(실측): servingUnit이 "한 접시"인 메뉴(머릿고기/수육 등)에서
  //     GPT가 "이 한 그릇", "한 그릇을" 처럼 그릇으로 잘못 쓰는 경우.
  //   원칙: data.servingUnit이 '접시' 계열일 때만 본문 '그릇'→'접시' 치환.
  //     servingUnit 미지정/그릇 계열이면 무변경(과교정 방지).
  //   QC: unitFixCount
  // ─────────────────────────────────────────────────────
  let unitFixCount = 0;
  {
    const su = (direction.servingUnit || "").replace(/\s+/g, "");
    if (su.includes("접시")) {
      const unitConv = [
        // "이 한 그릇 + 조사" 우선 처리 (조사 받침 정합 동시) — 접시=받침無
        [/이\s*한\s*그릇을(?=\s|[,.!?])/g, "이 한 접시를"],
        [/이\s*한\s*그릇은(?=\s|[,.!?])/g, "이 한 접시는"],
        [/이\s*한\s*그릇이(?=\s|[,.!?])/g, "이 한 접시가"],
        [/이\s*한\s*그릇(?=[\s,.])/g, "이 한 접시"],
        // 일반 "한 그릇 + 조사"
        [/한\s*그릇을(?=\s|[,.!?])/g, "한 접시를"],
        [/한\s*그릇은(?=\s|[,.!?])/g, "한 접시는"],
        [/한\s*그릇이(?=\s|[,.!?])/g, "한 접시가"],
        [/한\s*그릇(?=[\s,.])/g, "한 접시"],
      ];
      for (const [re, to] of unitConv) {
        result = result.replace(re, () => { unitFixCount++; return to; });
      }
      // "접시를/은/가" 받침 정합 재확정 (접시=받침無)
      result = result.replace(/한\s*접시은(?=\s|[,.!?])/g, "한 접시는");
      result = result.replace(/한\s*접시이(?=\s|[,.!?])/g, "한 접시가");
      if (unitFixCount > 0) result = normalizeWhitespace(result);
    } else if (su.includes("잔")) {
      // ★ [CAFE] 커피·음료(servingUnit=한 잔)인데 GPT/분산잔재가 '그릇' 또는 '접시'로 쓴 경우 → '잔' 정합.
      //   '잔'=받침無 → 조사도 받침無형으로 동시 정정(을/는/가/로). 과교정 방지: '잔' 계열일 때만.
      const unitConv = [
        // "이 한 그릇/접시 + 조사" 우선 (받침無 조사 동시 정합)
        [/이\s*한\s*(?:그릇|접시)을(?=\s|[,.!?])/g, "이 한 잔을"],
        [/이\s*한\s*(?:그릇|접시)은(?=\s|[,.!?])/g, "이 한 잔은"],
        [/이\s*한\s*(?:그릇|접시)이(?=\s|[,.!?])/g, "이 한 잔이"],
        [/이\s*한\s*(?:그릇|접시)가(?=\s|[,.!?])/g, "이 한 잔이"],  // 그릇+가(이중오류) → 잔이
        [/이\s*한\s*(?:그릇|접시)으로(?=\s|[,.!?])/g, "이 한 잔으로"],
        [/이\s*한\s*(?:그릇|접시)(?=[\s,.])/g, "이 한 잔"],
        // 일반 "한 그릇/접시 + 조사"
        [/한\s*(?:그릇|접시)을(?=\s|[,.!?])/g, "한 잔을"],
        [/한\s*(?:그릇|접시)은(?=\s|[,.!?])/g, "한 잔은"],
        [/한\s*(?:그릇|접시)이(?=\s|[,.!?])/g, "한 잔이"],
        [/한\s*(?:그릇|접시)가(?=\s|[,.!?])/g, "한 잔이"],  // 그릇+가(이중오류) → 잔이
        [/한\s*(?:그릇|접시)으로(?=\s|[,.!?])/g, "한 잔으로"],
        [/한\s*(?:그릇|접시)(?=[\s,.])/g, "한 잔"],
      ];
      for (const [re, to] of unitConv) {
        result = result.replace(re, () => { unitFixCount++; return to; });
      }
      if (unitFixCount > 0) result = normalizeWhitespace(result);
    }
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP F-2: 완전 동일 문장만 제거 (유사도 미적용 — 안전)
  //   사유: Restaurant 정보형 → 유사 설명 반복은 정상. 100% 동일만 제거.
  //   방식: 종결부호(. ! ? \n) 기준 분할, trim 후 완전일치 2회차부터 삭제.
  //   보존: 표/해시태그/짧은 라벨(8자 미만)·숫자단독 줄은 dedup 제외.
  //   QC: dupSentenceCount 누적
  // ─────────────────────────────────────────────────────
  let dupSentenceCount = 0;
  {
    const lines = result.split("\n");
    const seen = new Set();
    const outLines = lines.map((line) => {
      // 표/해시태그/이미지마커/빈줄은 그대로 통과
      if (/^\s*$/.test(line) || /^\s*[#|]/.test(line) || /\[사진/.test(line) || /^\s*\|/.test(line)) {
        return line;
      }
      // 한 줄 안에서도 문장 단위 분할 (종결부호 보존)
      const parts = line.split(/(?<=[.!?])\s+/);
      const kept = parts.filter((s) => {
        const key = s.trim();
        if (key.length < 8) return true;           // 짧은 라벨·감탄사 보존
        if (/^[\d\s,.~원분]+$/.test(key)) return true; // 숫자/가격 단독 보존
        if (seen.has(key)) { dupSentenceCount++; return false; }
        seen.add(key);
        return true;
      });
      return kept.join(" ");
    });
    result = outLines.join("\n");
    result = normalizeWhitespace(result);
  }

  if (particleDupCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 조사중복/이종2연 제거: ${particleDupCount}건 (은은/는은/은을/이메뉴은 등 → 단일화)`);
  }
  if (subjParticleFixCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 주격조사 자연화: ${subjParticleFixCount}건 (메뉴 잘/자주+서술 → 메뉴+이/가)`);
  }
  if (efficacyFixCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 효능표현 제거: ${efficacyFixCount}건 (숙취해소/건강 단정 → 행동·선택 표현)`);
  }
  if (storeRefFixCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 매장지칭 일반화: ${storeRefFixCount}건 (이 가게의/그 집의 → 메뉴명/이 메뉴는)`);
  }
  if (menuDupCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 메뉴명 중복 제거: ${menuDupCount}건 (○○ 떡볶이 떡볶이 → ○○ 떡볶이)`);
  }
  if (superlativeFixCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 과수식어 제거: ${superlativeFixCount}건 (완벽한/최고의/역대급 → 중립화)`);
  }
  if (unitFixCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 단위 정합: ${unitFixCount}건 (servingUnit=접시 → 그릇→접시)`);
  }
  if (dupSentenceCount > 0) {
    console.log(`[cafe][QC] ★ STEP F 동일문장 제거: ${dupSentenceCount}건 (완전일치 중복만, 유사도 미적용)`);
  }

  // 외부 QC 집계용
  cleanCafeText.__lastParticleDup = particleDupCount;
  cleanCafeText.__lastSubjParticleFix = subjParticleFixCount;
  cleanCafeText.__lastEfficacyFix = efficacyFixCount;
  cleanCafeText.__lastStoreRefFix = storeRefFixCount;
  cleanCafeText.__lastMenuDup = menuDupCount;
  cleanCafeText.__lastSuperlativeFix = superlativeFixCount;
  cleanCafeText.__lastUnitFix = unitFixCount;
  cleanCafeText.__lastDupSentence = dupSentenceCount;
  cleanCafeText.__lastParticleErrors = particleErrorCount;
  cleanCafeText.__lastMenuMeta = menuMetaCount;
  cleanCafeText.__lastAdEvalFixed = adEvalFixed;
  cleanCafeText.__lastPlaceholderFix = placeholderFixCount;
  cleanCafeText.__lastCafeJosaFix = cafeJosaFixCount;

  if (_DBG) console.log("[DBG-3 반환직전]", "은으로잔존:", result.includes("프라푸치노은으로"));

  return result;
}

// ============================================================
// [Phase 9.5 A안] insertSceneTimeline 정의부 삭제 완료
//   사유: "식사 흐름 요약 - 자리 잡음 - 상차림" fingerprint 핵심
//   대체: GPT가 scene 섹션에서 자연스럽게 흐름 생성 (두 번째 술 / 반찬 리필 / 옆 테이블 등)
// ============================================================

// ============================================================
// [Phase 9.5 A안] 정적 블록·강제삽입 함수 정의부 일괄 삭제
//   - MEAL_REC_MAP / getMealRec — "이런 상황에 다시 가요" fingerprint
//   - MEAL_DECISION_CRITERIA / getMealDecisionCriteria — "판단 기준" fingerprint
//   - injectKeywordDensity — "자리를 찾으면서 가장 먼저 본 건..." 정적 문장 강제삽입
//   대체: 재방문·판단·키워드 밀도는 GPT가 본문에 자연스럽게 녹여서 처리
// ============================================================

// ============================================================
// 8. QC 체크 — cafe runQC + restaurant 추가 검사 (조합·침투·광고)
// ============================================================
function runQC(text, treatment, region, situation, purpose, mode, fullKeyword) {
  const menu = treatment.menu || treatment.menuRef || "";
  const charCount = calcCharCount(text);

  const hasMealBlock = /\|\s*항목\s*\||\|\s*확인 항목\s*\||\|\s*[가-힣]+\s*\|/.test(text);
  const hasMealValue = /(\d+\s*분|\d+,?\d+원|좌석|웨이팅|영업시간|주차|반찬|결제|뚝배기|공깃밥)/.test(text);

  // 운영 정보 카운트 (9개 중 5개 이상 권장)
  let mealValueCount = 0;
  if (/\d+\s*분|\d+\s*시간/.test(text))            mealValueCount++;
  if (/\d+,?\d+원|\d+\s*만원/.test(text))           mealValueCount++;
  if (/좌석|자리|테이블|1인석|카운터/.test(text))    mealValueCount++;
  if (/반찬|기본찬|김치 리필|깍두기/.test(text))     mealValueCount++;
  if (/영업시간|라스트오더|브레이크/.test(text))     mealValueCount++;
  if (/주차/.test(text))                            mealValueCount++;
  if (/카드|키오스크|현금|결제/.test(text))          mealValueCount++;
  if (/웨이팅|대기|기다림/.test(text))               mealValueCount++;
  if (/공깃밥/.test(text))                          mealValueCount++;

  // ★ Phase 9.5 핵심: 지역+메뉴 결합 카운트
  const combo = `${region} ${menu}`;
  const comboEsc = combo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const comboCount = (text.match(new RegExp(comboEsc, "g")) || []).length;

  const menuCount   = (text.match(new RegExp(menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const regionCount = (text.match(new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;

  const firstPersonCount = (text.match(/저는\s|제가\s|내가\s|나는\s|저도\s|다녀왔|갔다왔|느꼈어|느꼈다/g) || []).length;
  const priceCount = (text.match(/\d+,?\d+원/g) || []).length;

  // 광고/홍보 패턴 (★ Phase 9.5 안전핀 — 0 필수)
  const adPatternCount = (text.match(/찐맛집|인생맛집|숨은 맛집|꼭 가|강추|미친 맛|역대급|레전드|원조|정통|맛 인정/g) || []).length;
  const recommendCount = (text.match(/추천합|추천해요|추천드립|꼭 가|가보시는 걸|가보시길/g) || []).length;

  // 타업종 침투 (0 필수)
  const medicalLeak = (text.match(/시술|치료|진료|병원|원장님/g) || []).length;
  const restaurantLeak = (text.match(/국밥|순대국|떡볶이|뚝배기|공깃밥|반찬|상차림|회식|식당|셰프|주방장/g) || []).length;

  const fullKwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 이슈 #1 QC: 조사 오류 잔존 검출 (후처리 후 0이어야 함)
  //   - menuLeak: 메뉴명+조사+장소 패턴 (동적)
  //   - genericLeak: 한식 메뉴 어미+조사+장소 패턴 (일반)
  //   - safetyLeak: 추가 음식명+조사+장소 패턴 (안전망)
  //   모두 0이 정상. 1건+ 이면 후처리 누락 또는 신규 패턴.
  // ─────────────────────────────────────────────────────
  const PARTICLE_PLACE_RE = /(?:이|가|은|는|에|을|를)\s+(?:동네|일대|집|골목|쪽|근처|거리|상권|먹자골목|가게|매장|식당|집안|안쪽|입구)/g;
  let particleLeakCount = 0;
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const menuLeakRe = new RegExp(`${menuEsc}${PARTICLE_PLACE_RE.source}`, "g");
    particleLeakCount += (text.match(menuLeakRe) || []).length;
  }
  const genericLeakRe = /[가-힣]{1,4}(?:국|탕|찌개|밥|면|구이|볶음|전|회|탕면|국밥|덮밥|비빔밥|떡볶이|김밥|튀김|순대|어묵|라면|만두)(?:이|가|은|는|에|을|를)\s+(?:동네|일대|집|골목|쪽|근처|거리|상권|먹자골목|가게|매장|식당|집안|안쪽|입구)/g;
  particleLeakCount += (text.match(genericLeakRe) || []).length;
  const safetyLeakRe = /[가-힣]{0,3}(?:국수|수제비|치킨|피자|초밥|라멘|우동|냉면|짬뽕|짜장|돈까스|회덮밥|덮밥|토스트|버거|파스타|커리|샐러드|샌드위치)(?:이|가|은|는|에|을|를)\s+(?:동네|일대|집|골목|쪽|근처|거리|상권|먹자골목|가게|매장|식당|집안|안쪽|입구)/g;
  particleLeakCount += (text.match(safetyLeakRe) || []).length;

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 광고형 평가어 QC: 잔존 + 후처리 누적
  //   잔존 = 후처리 후에도 남은 평가어 (0 권장)
  //   누적 = cleanCafeText가 치환한 총 횟수
  // ─────────────────────────────────────────────────────
  const adEvalLeakRe = /기대\s*이상이?(?:더라고요|었어요|었습니다|에요|예요|었다|다)|기대\s*이상[가-힣]?|만족스러[웠운]|만족스럽게|든든했|든든하더|정말\s*좋았어요|너무\s*좋았어요|깔끔하게\s+잘\s+나왔/g;
  const adEvalLeakCount = (text.match(adEvalLeakRe) || []).length;
  const adEvalFixed = (typeof cleanCafeText.__lastAdEvalFixed === "number")
    ? cleanCafeText.__lastAdEvalFixed : 0;

  // cleanCafeText 마지막 호출 시 누적된 교정 횟수
  const particleFixed = (typeof cleanCafeText.__lastParticleErrors === "number")
    ? cleanCafeText.__lastParticleErrors : 0;

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 v4 — P1 메뉴 fingerprint 잔존 QC (0 필수)
  //   후처리 차단 후에도 본문에 "메뉴명+조사+메뉴" 패턴이 남았는지 검출
  //   1건+ = 프롬프트 강화 또는 차단 정규식 누락 신호
  // ─────────────────────────────────────────────────────
  let menuMetaLeakCount = 0;
  if (menu) {
    const menuEsc = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const leakA = new RegExp(`${menuEsc}(?:이|가|을|를|은|는|의|도|에)\\s+메뉴(?!판)`, "g");
    const leakB = new RegExp(`${menuEsc}\\s+메뉴(?!판)`, "g");
    menuMetaLeakCount += (text.match(leakA) || []).length;
    menuMetaLeakCount += (text.match(leakB) || []).length;
  }
  const menuMetaFixed = (typeof cleanCafeText.__lastMenuMeta === "number")
    ? cleanCafeText.__lastMenuMeta : 0;

  // ─────────────────────────────────────────────────────
  // ★ Phase 9.5 v4.1 — fossilization 관찰 카운터 (측정만, 자동 수정 X)
  //   목적: 발행 20~30건 누적 후 fingerprint 패턴 식별
  //   원칙: 본 항목들은 절대 자동 치환·차단·재생성 트리거 만들지 않음
  //         → 데이터 누적 후 풀 재설계 단계에서만 활용
  //   임계: 글당 3회 초과 시 모니터링 필요 (액션은 별도 결정)
  // ─────────────────────────────────────────────────────
  const fossil_kkujun     = (text.match(/꾸준한/g) || []).length;      // adEvalFixed 부산물
  const fossil_hangyeol   = (text.match(/한결같[은이]/g) || []).length; // adEvalFixed 부산물
  const fossil_kkalkkeum  = (text.match(/깔끔하[게다고]/g) || []).length; // AI 디폴트 어휘
  const fossil_ttukbaegi  = (text.match(/뚝배기/g) || []).length;      // trio 후보 1
  const fossil_gim        = (text.match(/김이\s*(?:올라|모락|확|피어)/g) || []).length; // trio 후보 2
  const fossil_hansul     = (text.match(/한\s*술/g) || []).length;     // taste 빌더 박제
  const fossil_morak      = (text.match(/모락모락/g) || []).length;    // AI 의성어 박제
  const fossil_ipan       = (text.match(/입안\s*가득/g) || []).length; // AI 디폴트 표현
  const fossil_chokchok   = (text.match(/촉촉/g) || []).length;        // AI 묘사어 (사람 잘 안 씀)
  const fossil_majimak    = (text.match(/마지막\s*한\s*술/g) || []).length; // taste ritual
  const fossil_cheossul   = (text.match(/첫\s*[입술]/g) || []).length;  // taste 오프닝 ritual
  const fossil_ijibui     = (text.match(/이\s*집의/g) || []).length;    // 설명형 잔존

  console.log(`[cafe][QC] 메뉴블럭: ${hasMealBlock}`);
  console.log(`[cafe][QC] 운영정보: ${hasMealValue} (포함 ${mealValueCount}/9, 5개 이상 권장)`);
  console.log(`[cafe][QC] 지역+메뉴 결합 "${combo}": ${comboCount}회 (3회 이하 ★ Phase 9.5)`);
  console.log(`[cafe][QC] 메뉴명 "${menu}": ${menuCount}회 / 지역명 "${region}": ${regionCount}회`);
  console.log(`[cafe][QC] 조사오류 잔존(0 필수 ★ 이슈 #1): ${particleLeakCount}건 / 후처리 교정: ${particleFixed}건`);
  console.log(`[cafe][QC] 메뉴 fingerprint 잔존(0 필수 ★ v4 P1): ${menuMetaLeakCount}건 / 후처리 차단: ${menuMetaFixed}건`);
  console.log(`[cafe][QC] 광고평가어 잔존(0 권장): ${adEvalLeakCount}건 / 후처리 치환: ${adEvalFixed}건`);
  console.log(`[cafe][QC] 광고패턴(0 필수 ★ Phase 9.5): ${adPatternCount}`);
  console.log(`[cafe][QC] 추천유도(0 권장): ${recommendCount}`);
  console.log(`[cafe][QC] 의료 침투(0 필수): ${medicalLeak} / 음식점 침투(0 필수): ${restaurantLeak}`);
  console.log(`[cafe][QC] 🔍 fossil[꾸준한:${fossil_kkujun}|한결같:${fossil_hangyeol}|깔끔:${fossil_kkalkkeum}|뚝배기:${fossil_ttukbaegi}|김올라:${fossil_gim}|한술:${fossil_hansul}|모락:${fossil_morak}|입안가득:${fossil_ipan}] (★ v4.1 측정만)`);
  console.log(`[cafe][QC] 🔍 fossil2[촉촉:${fossil_chokchok}|마지막한술:${fossil_majimak}|첫입첫술:${fossil_cheossul}|이집의:${fossil_ijibui}] (★ v4.2 측정만)`);
  if (fullKeyword) console.log(`[cafe][QC] 완전체키워드(${fullKeyword}): ${fullKwCount}`);
  if (mode === "commercial") {
    console.log(`[cafe][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[cafe][QC] 가격명시(commercial 위반): ${priceCount}건`);
  }

  return {
    hasMealBlock, hasMealValue, mealValueCount,
    comboCount, menuCount, regionCount,
    firstPersonCount, priceCount,
    adPatternCount, recommendCount,
    medicalLeak, restaurantLeak,
    particleLeakCount, particleFixed,
    menuMetaLeakCount, menuMetaFixed,
    adEvalLeakCount, adEvalFixed,
    fossil_kkujun, fossil_hangyeol, fossil_kkalkkeum,
    fossil_ttukbaegi, fossil_gim, fossil_hansul,
    fossil_morak, fossil_ipan,
    fossil_chokchok, fossil_majimak, fossil_cheossul, fossil_ijibui,
    fullKwCount, charCount,
  };
}

// ============================================================
// 9. stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;
  t = t.replace(/^#\s+(.+)$/gm, "$1");
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1");
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleCafe(req, res) {
  const {
    target, program, blogType,
    userRegion, userMemo, overrideTitle,
    situation: bodySituation,    // ★ 신규 — 상황 (해장·혼밥·비 오는 날·야식)
    purpose:   bodyPurpose,       // ★ 신규 — 목적 (혼밥·가족모임·...)
    // [2026-06-25 Restaurant v2 정책] 기본 생성 정책 = commercial(메뉴 정보형).
    //   FREEZE 해제 아님 — 업종 기본값 전환. personal은 명시 요청 시만(DEAD CODE 보존·롤백).
    mode = "commercial",
  } = req.body;

  // [v-loc] 위치 공통화 — LocationBlock 후단 주입용 위치 필드 수신(index.js hubStore 출처).
  const locStore = {
    address:       req.body?.address,
    map_guide:     req.body?.map_guide,
    transit:       req.body?.transit,
    building_desc: req.body?.building_desc,
    parking_info:  req.body?.parking_info,
  };

  // [v77] 제목 끝 상호 표시 — 운영 레이어 토글. Spine titleSuffixRegistry가 placeholder/빈값 방어.
  const _titleSuffix = resolveTitleSuffix({
    enabled:   req.body?.titleSuffixOn,
    storeName: req.body?.storeName,
  });

  const name      = program.name || "이 식당";
  const region    = (userRegion || "구리").trim();
  const memo      = (userMemo || "").trim();
  const targetId  = target?.id   || "visit";
  const blogTypeId = blogType?.id || "review";
  const industry  = "cafe";
  // [v2] personal은 명시적으로 요청된 경우에만. 그 외(미지정·commercial) = commercial.
  const validMode = (mode === "personal") ? "personal" : "commercial";

  // 상황·목적 (body 우선, program 보조)
  const situation = bodySituation || program.situation || "";
  const purpose   = bodyPurpose   || program.purpose   || "";

  console.log(`[cafe] mode: ${validMode} | 상황: ${situation || "(미지정)"} | 목적: ${purpose || "(미지정)"}`);
  console.log(`[cafe][BUILD] v4.0-people-subject (배포검증: 이 줄이 안 보이면 구버전 실행 중)`);

  // ── restaurant 조합 검증 ─────────────────────────────────
  const CAFE_IDS = CAFE_TREATMENTS.map(t => t.id);
  const isCafe = CAFE_IDS.includes(program.id) || program.industry === "cafe";
  if (!isCafe) {
    console.error(`[cafe] 잘못된 조합 진입 차단: ${name} / id=${program.id}`);
    return res.status(400).json({ error: `카페 생성기에 잘못된 항목이 전달되었습니다: ${name}` });
  }

  // ── 데이터 로드 ─────────────────────────────────
  const treatmentData = CAFE_TREATMENTS.find(t => t.id === program.id)
    || CAFE_TREATMENTS[0];
  const cat  = treatmentData?.cat || "커피";
  const menu = treatmentData?.menu || treatmentData?.menuRef || "";

  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  console.log(`[cafe] 지역: ${region} | 카테고리: ${cat} | 메뉴: ${menu}`);

  // ── DIRECTION 동적 생성 (하이브리드 merge) ─────────────────
  const direction   = getCafeDirection(treatmentData, situation, purpose);
  const genericName = direction.genericName || "이 카페";
  const flowBias    = direction.flowBias || "";
  console.log(`[cafe] flowBias: ${flowBias || "(없음)"} | genericName: ${genericName}`);

  // ── 시스템 프롬프트 ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 "${menu}를 설명하는 작가"가 아닙니다.
당신의 임무는 ${region} 일대에서 "오늘 ${menu}를 먹으러 갈까?" 하고 검색하는 사람의 상황을 읽고, 그 사람이 "이 한 끼면 내 상황이 해결되겠다"고 스스로 판단하도록 돕는 것입니다.

[★★ 최상위 관점 — 글의 주어는 '메뉴'가 아니라 '사람'이다]
- 사람들은 재료나 조리법이 궁금해서 검색하지 않는다. 자신의 상황(배고픔·혼밥·해장·가족식사·추운 날 국물)을 해결하려고 식당을 찾는다.
- 그러므로 모든 섹션은 '${menu}는 ~한 음식이다'(메뉴 주어)가 아니라 '~한 상황의 사람은 ${menu}로 ~를 해결한다'(사람 주어)로 쓴다.
- 메뉴 설명(재료·국물·식감·곁들임)은 그 자체가 목적이 아니라, "이 상황의 사람에게 왜 맞는가"를 뒷받침하는 근거로만 등장한다.
- 사전·백과사전식 정의("${menu}는 ~로 만든 음식으로, ~가 특징이다") 금지. 사람의 하루·끼니·상황에서 출발한다.
- 글을 다 읽은 독자에게 "${menu}가 어떤 음식인지 알았다"가 아니라 "오늘 같은 날 ${menu} 먹으러 갈까"라는 마음이 남아야 한다.
- 비중 기준: 사람의 상황·목적·만족 70 / 메뉴 자체 설명 30.

업종: 맛집·식당 | 지역: ${region} | 메뉴: ${menu} | 카테고리: ${cat}

[협찬·표시광고법 준수]
- ❌ 1인칭 후기 시점 금지 (저는/제가/다녀왔어요)
- ❌ 가격 단정 명시 금지 → "매장 가격 기준 확인"
- ❌ 효과 단정 금지 (최고/1등/유일한/완벽/원조/정통)
- ❌ 고객 유인 금지 (할인/이벤트/쿠폰)
- ❌ 매장 직접 추천 단정 금지
- ❌ [v4] 만족 단정 금지 (푸짐하다/가성비 최고/배부르다/또 가고 싶다) → 독자가 가늠할 '판단 재료'로만 제공

[권장 표현]
- "일반적으로 ~ 안내됩니다" / "매장별 차이가 있습니다"
- "방문 시 매장에서 확인 가능합니다"

3인칭 정보형(독자에게 말 거는 질문체 허용). 자연스러운 안내 톤.
[문단 길이] 한 문단 2~4줄로 유지 (5줄 이상 ❌).`
    : `당신은 ${region} 일대를 자주 다니는 일반인입니다. ${region}에서 ${menu} 한 그릇 먹은 1인칭 블로그 후기를 작성합니다.
업종: 맛집·식당 | 지역: ${region} | 메뉴: ${menu} | 카테고리: ${cat}
상황: ${situation || "(일반)"} | 목적: ${purpose || "(일반)"}

[절대 금지 ★★ Phase 9.5 핵심 — 브랜드 홍보 톤 차단]
  ❌ 매장 홍보: "유명한 맛집", "이름난", "원조", "정통", "맛 인정"
  ❌ 광고 패턴: "찐맛집", "인생맛집", "강추", "꼭 가보세요"
  ❌ 미사여구: "미친 맛", "역대급", "레전드", "분위기 맛집"
  ❌ 매장 특정: "이 식당은 유명", "사장님이 알려져서"
  → 매장 자체가 아닌 공간 맥락(골목·일대·동선)으로 자연 치환

[절대 금지] 의료·음식점·학습 어휘 일절 사용 금지
  ❌ 시술/치료/회복/통증 (의료)
  ❌ 국밥/순대국/떡볶이/뚝배기/공깃밥/반찬/상차림 (음식점)
  ❌ 식당/셰프/주방장/회식/코스 요리 (음식점)
  ❌ 공부하기 좋은/집중하기 좋은/스터디카페 (학습)

[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함

[문단 길이 ★ 네이버 카페판 상단 구조]
- 한 문단 2~4줄로 유지 (5줄 이상 ❌)
- 사진 사이 짧은 문단이 체류시간 향상

[표현 다양성 ★ Phase 9.5 이슈 #2 — 처음부터 자연 치환 권장]
- "${menu}" 직접 표기는 글 전체 8~12회 이내 (메뉴명 과밀 차단)
- "${region} ${menu}" 결합 표현은 처음부터 최소화 — 1~2회 자연스럽게 등장하면 충분
  · 도입 1회 정도로 검색 의도만 충족하고, 이후는 자연스러운 공간 지시어로 분산 치환
  · 같은 치환 어휘를 글 전체에서 3회 이상 반복하지 않는다 (어휘 자체의 박제도 차단)
  · 결합을 3회 이상 쓰지 않는다 (4회 이상은 자동 차단됨 — 처음부터 회피 권장)
- "${genericName}" 표기는 섹션당 2~3회 이내
- 메뉴명+조사 결합 시 자연스럽게: "${menu}을/를 먹으러", "${menu} 한 그릇"
  · 메뉴명 뒤에 장소명사(동네/일대/집/골목/상권 등) 직결 금지 — 문장이 끊김

[문장 종결 절대 규칙]
- 모든 문장은 "다." / "요." / "죠." / "어요." / "습니다." 중 하나로 종결
- 미완성 문장·비문 금지`;

  // ── 섹션별 순차 생성 (flowBias 적용) ─────────────────────────────────
  // [2026-06-25 mode 전달 1줄 배선 예외 / generate FREEZE 해제 아님]
  //   사유: playConfig·index에 이미 존재하는 commercial 분기로 가는 유일 경로.
  //   validMode 미전달 시 commercial이어도 항상 personal 6섹션 반환 → 8섹션 사문화.
  //   허용 범위 = 본 1줄(인자 추가)뿐. 순회·생성·후처리·prompt·이미지 로직 무수정.
  const SECTIONS = getCafeSections(cat, flowBias, validMode);
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = buildCafePrompt(sec.key, treatmentData, region, {
      mode: validMode, situation, purpose,
    });
    const prevBlock = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: cafe | 지역: ${region} | 메뉴: ${menu} | 카테고리: ${cat} | 상황: ${situation} | 목적: ${purpose} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 의료·카페·학습·광고 어휘 금지. ${sec.minLength}자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanCafeText(secText, treatmentData, region, situation, purpose, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, menu);

    if (calcCharCount(secText) < 100) {
      console.log(`[cafe] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 ${sec.minLength}자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanCafeText(retry, treatmentData, region, situation, purpose, validMode);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, menu);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[cafe] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT (카페 5종 풀: 외관/메뉴판/음료·디저트/좌석/마무리) ─────────
  const _CAFE_ALT_BY_KEY = {
    // personal 6섹션
    visit:   "외관 사진",
    arrive:  "외관 사진",
    order:   "메뉴판·픽업 사진",
    taste:   "음료·디저트 클로즈업",
    scene:   "좌석·체류 장면",
    revisit: "마무리 사진",
    // commercial 8섹션
    menuIntro:         "메뉴 사진",
    menuScene:         "메뉴 클로즈업",
    menuComposition:   "구성·세팅 사진",
    tasteFeature:      "음료·디저트 디테일",
    pairing:           "페어링·세트 사진",
    decision:          "메뉴 비교 사진",
    recommendSituation:"좌석 분위기",
    storeFeature:      "매장 내부 사진",
  };
  // commercial은 8섹션, personal은 5장까지 — 섹션 수에 맞춰 alt 생성
  const _altCount = validMode === "commercial" ? Math.min(SECTIONS.length, 6) : 5;
  const altList = SECTIONS.slice(0, _altCount).map(sec => {
    const label = _CAFE_ALT_BY_KEY[sec.key] || "메뉴 사진";
    return `[이미지: ${label}]`;
  });
  console.log(`[cafe][ALT] mode=${validMode} keys=[${SECTIONS.map(s=>s.key).join(",")}] labels=[${altList.join(" ")}]`);

  // ── 제목 생성 ─────────────────────────
  let title = overrideTitle || buildCafeTitle(treatmentData, region, situation, purpose, seoData, validMode, _titleSuffix);
  // 의료·카페 어휘가 제목에 새면 차단
  const TITLE_BLOCK = /시술|치료|성형|진료|병원|국밥|순대국|떡볶이|식당|셰프|회식/;
  if (TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${menu} 안내｜운영 정보 정리`
      : `${region} ${menu} 다녀온 솔직 후기`;
  }
  if (!title.includes(region) || !title.includes(menu)) {
    title = validMode === "commercial"
      ? `${region} ${menu} 안내`
      : `${region} ${menu}${situation ? " " + situation : ""} 솔직 후기`;
  }

  // ── 조립 ────────────────────────────────────────────
  const secKeys = SECTIONS.map(s => s.key);

  // ── [Phase 9.5 A안] 정적 블록 4종 전체 비활성화 ─────────
  //   1) MEAL_BLOCKS (메뉴 구성 일반 정보 표)
  //   2) insertSceneTimeline (식사 흐름 요약)
  //   3) MEAL_REC_MAP (이런 상황에 다시 가요)
  //   4) MEAL_DECISION_CRITERIA (판단 기준 + 마무리 closing)
  //   사유: 정보 박스 = 행동 SEO 충돌 / 엔진 fingerprint 형성 / fossilization
  //   personal 모드 마무리는 GPT가 자연스럽게 본문에 녹여 쓰도록 위임

  // ── 마무리 섹션 (commercial만 CTA 부착) ─────────────────
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey] && validMode === "commercial") {
    const commercialCTAs = [
      `\n\n${region} ${menu} 관련 정보는 일반적인 안내입니다. 메뉴·가격·영업시간은 매장 상황에 따라 달라질 수 있으니, 방문 시 매장에서 직접 확인해보시는 것이 권장됩니다.`,
      `\n\n위 내용은 ${region} ${menu} 일반 정보 안내입니다. 운영 정보·웨이팅·메뉴 구성은 시기에 따라 차이가 있으므로 방문 전 확인해보시기 바랍니다.`,
      `\n\n${menu} 관련 운영 정보를 정리한 내용입니다. 본인 방문 목적에 맞는지는 매장 안내 후 확인해보시는 것이 좋습니다.`,
    ];
    sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
      + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
  }

  let assembled = `# ${title}\n\n`;
  secKeys.forEach((key, i) => {
    const secContent = sectionTexts[key] || "";
    if (calcCharCount(secContent) < 50) return;
    assembled += secContent + "\n\n";
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + "\n\n";
  });
  assembled = assembled.replace(/\n{3,}/g, "\n\n").trim();
  assembled = removeDuplicateSentences(assembled);

  // ── [Phase 9.5 A안] 키워드 밀도 강제삽입 제거 ──
  //   사유: "자리를 찾으면서 가장 먼저 본 건..." 정적 문장 fingerprint
  //   대체: systemPrompt에서 GPT가 본문에 자연 녹임

  assembled += "\n\n" + buildCafeHashtags(treatmentData, region, situation, purpose, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  // ★ FREEZE 예외 #2 (제목 보존) — restaurant 전용
  //   현상: 최종 clean의 menuMeta 차단(reB: "메뉴명+공백+메뉴")이
  //         제목 "{region} {menu} 메뉴 정리/소개/안내/고민될 때" 의
  //         "{menu} 메뉴"를 "이 한 그릇"으로 치환 → 제목에서 메뉴명 증발
  //   교정: 첫 줄(# 제목)을 분리 보존 → 본문에만 clean → 제목 재결합
  //         제목은 buildCafeTitle 단계에서 이미 menu 포함 보장됨
  {
    const nlIdx = assembled.indexOf("\n");
    const titleLine = nlIdx >= 0 ? assembled.slice(0, nlIdx) : assembled;
    const bodyPart  = nlIdx >= 0 ? assembled.slice(nlIdx) : "";
    let cleanedBody = cleanCafeText(bodyPart, treatmentData, region, situation, purpose, validMode);
    if (validMode === "commercial") {
      cleanedBody = cleanCafeText(cleanedBody, treatmentData, region, situation, purpose, validMode);
    }
    assembled = titleLine + "\n\n" + cleanedBody.replace(/^\n+/, "");
  }

  // ★ 본문 인라인 볼드 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // alt 강제 정규화 — 카페 5종 풀 (외관/메뉴판/음료·디저트/좌석/마무리)
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner).trim();
    if (/^(외관|메뉴판|상차림|장면|마무리)\s*사진$/.test(s)) return `[이미지: ${s}]`;
    if (/외관|입구|간판|건물|골목/.test(s))                  return "[이미지: 외관 사진]";
    if (/메뉴판|메뉴|가격표/.test(s))                         return "[이미지: 메뉴판 사진]";
    if (/상차림|반찬|국물|클로즈업|뚝배기|음식/.test(s))      return "[이미지: 상차림 사진]";
    if (/장면|분위기|테이블|창가|동행/.test(s))                return "[이미지: 장면 사진]";
    if (/마무리|퇴장|계산/.test(s))                           return "[이미지: 마무리 사진]";
    return "[이미지: 장면 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(외관|메뉴판|상차림|장면|마무리)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC ──────────────────────────────────────────
  const fullKeywordForQC = `${region} ${menu}`;
  const qc = runQC(assembled, treatmentData, region, situation, purpose, validMode, fullKeywordForQC);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, menu);
  console.log(`[cafe] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  // 경고
  if (qc.adPatternCount > 0)
    console.error(`[cafe] 🚨 광고 패턴 ${qc.adPatternCount}회 — Phase 9.5 안전핀 위반 (브랜드 톤)`);
  if (qc.medicalLeak > 0)
    console.error(`[cafe] 🚨 의료 어휘 침투 ${qc.medicalLeak}회`);
  if (qc.cafeLeak > 0)
    console.error(`[cafe] 🚨 카페 어휘 침투 ${qc.cafeLeak}회`);
  if (qc.comboCount > 3)
    console.warn(`[cafe] ⚠️ "${region} ${menu}" 결합 ${qc.comboCount}회 (3회 초과 — Phase 9.5 위반)`);
  if (validMode === "personal" && qc.fullKwCount < 2)
    console.warn(`[cafe] ⚠️ "${fullKeywordForQC}" 노출 ${qc.fullKwCount}회 — 키워드 밀도 부족`);
  // [Phase 9.5 A안] mealValueCount는 관찰용만 (강제 경고 제거 — 정보 SEO 회귀 차단)
  // → 콘솔 출력 L648에서 이미 노출됨
  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[cafe] ⚠️ commercial 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[cafe] ⚠️ commercial 가격 ${qc.priceCount}건 잔존`);
  }

  await autoSave({ assembled, charCount, subKw: menu, region, seoScore, industry });

  // ── 이미지 메타 ─────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

  // [v-loc] LocationBlock 후단 주입 — clean 완료 후라 주소 변형 0. 해시태그 위에 배치.
  assembled = insertLocationBeforeHashtags(assembled, locStore);

  // ★★★ 네이버 블로그 복사용 평문 변환 ★★★
  const assembledMarkdown = assembled;
  const assembledPlain    = stripMarkdownForNaver(assembled);
  const charCountPlain    = calcCharCount(assembledPlain);

  return res.status(200).json({
    success: true,
    text: assembledPlain,
    textMarkdown: assembledMarkdown,
    hashtags: hashtagsArr,
    images, charCount: charCountPlain, seoScore,
    mode: validMode,
    // ★ Phase 9.5: 조합 메타 반환 (디버깅·로그용)
    combination: { region, menu, cat, situation, purpose, flowBias },
    qc: {
      hasMealBlock:    qc.hasMealBlock,
      hasMealValue:    qc.hasMealValue,
      mealValueCount:  qc.mealValueCount,
      comboCount:      qc.comboCount,
      menuCount:       qc.menuCount,
      regionCount:     qc.regionCount,
      firstPersonCount: qc.firstPersonCount,
      priceCount:      qc.priceCount,
      adPatternCount:  qc.adPatternCount,
      recommendCount:  qc.recommendCount,
      medicalLeak:     qc.medicalLeak,
      cafeLeak:        qc.restaurantLeak,
      particleLeakCount: qc.particleLeakCount,
      particleFixed:   qc.particleFixed,
      menuMetaLeakCount: qc.menuMetaLeakCount,
      menuMetaFixed:   qc.menuMetaFixed,
      adEvalLeakCount: qc.adEvalLeakCount,
      adEvalFixed:     qc.adEvalFixed,
      fossil: {
        kkujun:    qc.fossil_kkujun,
        hangyeol:  qc.fossil_hangyeol,
        kkalkkeum: qc.fossil_kkalkkeum,
        ttukbaegi: qc.fossil_ttukbaegi,
        gim:       qc.fossil_gim,
        hansul:    qc.fossil_hansul,
        morak:     qc.fossil_morak,
        ipan:      qc.fossil_ipan,
        chokchok:  qc.fossil_chokchok,
        majimak:   qc.fossil_majimak,
        cheossul:  qc.fossil_cheossul,
        ijibui:    qc.fossil_ijibui,
      },
      fullKwCount:     qc.fullKwCount,
    },
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
