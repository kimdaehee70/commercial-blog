// ============================================================
// generateSnack.js — 한식(한식) 블로그 생성기 v1.0 (Snack Engine 독립)
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
  SNACK_TREATMENTS, SNACK_BLOCK_MAP,
  SNACK_TITLE_MIDDLE, SNACK_TITLE_SUFFIX,
  SNACK_TITLE_SCENE, SNACK_TITLE_SCENE_BY_CATEGORY,
  SNACK_TITLE_MENU_CLASS, SNACK_TITLE_PURPOSE_BY_CLASS,
  SNACK_TITLE_PURPOSE_FALLBACK, SNACK_TITLE_FORMS,
  pickRotatedSituations,
  SNACK_TITLE_PURPOSE_TO_MASTER,
} from "../../lib/snack-data";
import {
  buildSnackPrompt, getSnackDirection,
} from "../../lib/snack-prompts";
import {
  getSnackSections,
} from "../../lib/snack-playConfig";
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
const SNK_FORBIDDEN_BASE = [
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

const SNK_FORBIDDEN_AI = [
  "드디어 발견한", "결국 찾은 곳", "마침내", "비로소",
  "마음에 들었어요", "마음에 들었답니다",
  "차분하고 따뜻한", "안정감 있는 분위기",
];

// commercial 모드 — 협찬 표기 위반 패턴
const SNK_FORBIDDEN_COMMERCIAL = [
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
const SNK_CROSS_BLOCK = (function () {
  try {
    return getCrossBlocks("snack");
  } catch (e) {
    return [
      ...SNACK_BLOCK_MAP.medical,
      ...SNACK_BLOCK_MAP.cafe,
      ...SNACK_BLOCK_MAP.study,
      ...SNACK_BLOCK_MAP.ad,
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
// 직전 commercial 제목 토큰 — 연속 발행 시 동일 FORM/MIDDLE/PURPOSE 회피용
let _lastTitleForm = "";
let _lastTitleMiddle = "";
let _lastTitlePurpose = "";

// ★ [v2.6] purpose 단일 SoT — 제목 purpose 추첨을 buildSnackTitle 밖으로 분리.
//   본문 순회 전에 1회 호출 → 표시 라벨(displayPurpose) + 본문 필터용 master 동시 확정.
//   제목·본문·recommendSituation이 모두 이 결과를 공유(SoT 일치).
function pickTitlePurpose(menu) {
  const pickAvoid = (arr, avoid) => {
    if (!arr || !arr.length) return "";
    if (arr.length === 1) return arr[0];
    let v, g = 0;
    do { v = arr[Math.floor(Math.random() * arr.length)]; g++; }
    while (v === avoid && g < 8);
    return v;
  };
  const menuClass = SNACK_TITLE_MENU_CLASS[menu] || "soup";
  const purposePool = (SNACK_TITLE_PURPOSE_BY_CLASS[menuClass]
                     || SNACK_TITLE_PURPOSE_FALLBACK);
  const displayPurpose = pickAvoid(purposePool, _lastTitlePurpose) || purposePool[0] || "";
  _lastTitlePurpose = displayPurpose;
  // 표시 라벨 → Master 정규화(본문 상황 필터용). 미매칭 시 표시 라벨 그대로.
  const master = SNACK_TITLE_PURPOSE_TO_MASTER[displayPurpose] || displayPurpose;
  return { displayPurpose, master, menuClass };
}

function buildSnackTitle(treatment, region, situation, purpose, seoData, mode, titlePurpose) {
  const menu = treatment.menu || treatment.menuRef || "";
  const cat  = treatment.cat || "한식";
  const sit  = situation || "";
  const pur  = purpose   || "";

  if (mode === "commercial") {
    // ★ [v2.4] 제목 엔진 — 방문목적 선두 구조 (검색의도 강화)
    //   FORM 가중선택(A 지역+목적+메뉴 40% 등) → purpose(결별 폴백) + middle 치환.
    //   region/menu 본문 placeholder 정합 / 매장명 0 (PHILOSOPHY 원칙1).
    //   직전 FORM·PURPOSE·MIDDLE 각각 회피 → 연속 발행 반복 인상 감소.
    //   본문 후처리(cleanSnackText)와 완전 격리 — 제목만 산출.
    const pickAvoid = (arr, avoid) => {
      if (!arr || !arr.length) return "";
      if (arr.length === 1) return arr[0];
      let v, g = 0;
      do { v = arr[Math.floor(Math.random() * arr.length)]; g++; }
      while (v === avoid && g < 8);
      return v;
    };
    // ① 결(menuClass) 판정 → 방문목적 풀 선택 (미매칭 soup 기본, 풀 부재 시 보편 폴백)
    //   ★ [v2.6] 외부에서 확정한 titlePurpose가 있으면 그대로 사용(SoT 일치). 없으면 기존 추첨(하위호환).
    const menuClass = SNACK_TITLE_MENU_CLASS[menu] || "soup";
    const purposePool = (SNACK_TITLE_PURPOSE_BY_CLASS[menuClass]
                       || SNACK_TITLE_PURPOSE_FALLBACK);
    let tPurpose;
    if (titlePurpose) {
      tPurpose = titlePurpose;
    } else {
      tPurpose = pickAvoid(purposePool, _lastTitlePurpose) || purposePool[0] || "";
      _lastTitlePurpose = tPurpose;
    }
    // ② MIDDLE(정보형 토큰) — SCENE 메뉴매칭 40% 확률, 아니면 일반 MIDDLE
    const scenePool = SNACK_TITLE_SCENE[menu]
                   || SNACK_TITLE_SCENE_BY_CATEGORY[cat]
                   || [];
    const useScene = scenePool.length && Math.random() < 0.4;
    const midPool = useScene ? scenePool : SNACK_TITLE_MIDDLE;
    const tMiddle = pickAvoid(midPool, _lastTitleMiddle);
    // ③ FORM 가중 비복원 선택 (직전 form 회피)
    const forms = SNACK_TITLE_FORMS || [];
    let form = forms[0];
    if (forms.length) {
      const usable = forms.length > 1
        ? forms.filter(f => f.id !== _lastTitleForm)
        : forms;
      const pool = usable.length ? usable : forms;
      const total = pool.reduce((s, f) => s + (f.weight || 1), 0);
      let r = Math.random() * total;
      for (const f of pool) { r -= (f.weight || 1); if (r <= 0) { form = f; break; } }
    }
    _lastTitleForm = form.id;
    _lastTitleMiddle = tMiddle;
    // ④ placeholder 치환 + 빈 자국·구분자 정리
    let t = (form.pattern || "{region} {menu}")
      .replace(/\{region\}/g, region)
      .replace(/\{menu\}/g, menu)
      .replace(/\{situation\}/g, sit)
      .replace(/\{purpose\}/g, tPurpose)
      .replace(/\{middle\}/g, tMiddle);
    t = t.replace(/｜\s*$/g, "").replace(/^\s*｜/g, "")     // 끝/앞 빈 구분자
         .replace(/｜\s*｜/g, "｜")                          // 연속 구분자
         .replace(/\s+｜/g, "｜").replace(/｜\s+/g, "｜")    // 구분자 주변 공백
         .replace(/\s{2,}/g, " ")                            // 중복 공백
         .trim();
    return t;
  }

  // personal — titlePatterns 우선 (placeholder 치환)
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
function buildSnackHashtags(treatment, region, situation, purpose, mode) {
  const reg   = (region || "").replace(/\s/g, "");   // ★ region 공백 제거 — "노원구 태릉입구" → "노원구태릉입구" (해시태그 끊김 방지)
  const menu  = (treatment.menu || treatment.menuRef || "").replace(/\s/g, "");
  const catKw = (treatment.cat || "한식").replace(/\s/g, "");
  const sitKw = (situation || "").replace(/\s/g, "");
  const purKw = (purpose || "").replace(/\s/g, "");

  if (mode === "commercial") {
    return [
      `#${reg}맛집`, `#${reg}${menu}`, `#${menu}안내`,
      `#${reg}${catKw}`, `#${reg}식당`, `#맛집정보`,
    ].filter(t => t.length > 2).slice(0, 8).join(" ");
  }

  const base = [
    `#${reg}맛집`, `#${reg}${menu}`, `#${menu}`,
    `#${reg}${catKw}`, `#${menu}맛집`,
    sitKw ? `#${reg}${sitKw}` : "",
    purKw && purKw !== sitKw ? `#${reg}${purKw}` : "",
    `#${reg}후기`, `#${menu}후기`, `#맛집후기`,
  ];
  return base.filter(t => t && t.length > 2).slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기)
//   ★ 핵심 추가: 지역+메뉴 결합 3회 초과 시 자동 대체
// ============================================================
function cleanSnackText(text, treatment, region, situation, purpose, mode = "personal") {
  const menu = treatment.menu || treatment.menuRef || "";
  const direction = getSnackDirection(treatment, situation, purpose);
  const genericName = direction.genericName || "이 식당";
  let result = text;

  const removeList = [...SNK_FORBIDDEN_BASE, ...SNK_FORBIDDEN_AI, ...SNK_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...SNK_FORBIDDEN_COMMERCIAL);

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

    result = result.replace(reA, () => {
      const alts = ["이 한 그릇", "이거", "그것"];
      const r = alts[menuMetaCount % alts.length];
      menuMetaCount++;
      return r;
    });
    result = result.replace(reB, () => {
      const alts = ["이 한 그릇", "이거", "그것"];
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

      // ★ "순대국 지역 + (전문점/집/매장)…" 중복 결합 → "순대국 전문점" 단일화 (뒤 조사 보존)
      //   예: "순대국 지역의 순대국 전문점들은" → "순대국 전문점들은"
      result = result.replace(
        new RegExp(`${mEsc}\\s*지역(?:에서는|에서|에는|의|은|는|마다|별로)?\\s*(?:${mEsc}\\s*)?(전문점|집|식당|매장)(들)?(은|는|에서는|에서|마다|별로|의)?`, "g"),
        (m, kind, plural, josa) => `${menu} 전문점${plural || ""}${josa || ""}`
      );
      // ★ 잔여 단독 "순대국 지역+조사" → "순대국 전문점+조사" (조사 보존: 마다/별로/에서/의…)
      result = result.replace(
        new RegExp(`${mEsc}\\s*지역(에서는|에서|에는|의|은|는|마다|별로|에)?`, "g"),
        (m, josa) => `${menu} 전문점${josa ? (josa === "에" ? "에서" : josa) : "에서는"}`
      );

      // "이거를/이거는/그것을/그것는" AI투 → 메뉴명 환원
      result = result.replace(/이거를\s*선택/g, `${menu}을 선택`);
      result = result.replace(/이거를/g, `${menu}을`).replace(/이거는/g, `${menu}은`);
      result = result.replace(/그것를/g, `${menu}을`).replace(/그것는/g, `${menu}은`);

      // ★ 과거 치환 잔여물 안전청소: "전문점에서는마다/에서는별로" → 자연 어미
      result = result.replace(new RegExp(`${mEsc}\\s*전문점에서는(마다|별로)`, "g"), `${menu} 전문점$1`);

      // ★ "메뉴 한 그릇/한 접시" 반복 과다 → 3회 초과분 자연 대체 (가독성)
      const unitWord = (direction.servingUnit || "한 그릇");
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
    console.log(`[snack][QC] 조사오류 교정: ${particleErrorCount}건 (메뉴+조사+장소 패턴 → "이 장소"로 자동 교정)`);
  }
  if (menuMetaCount > 0) {
    console.log(`[snack][QC] 메뉴 fingerprint 차단: ${menuMetaCount}건 ("${menu}+조사+메뉴" → "이 한 그릇/이거/그것" ★ Phase 9.5 v4)`);
  }
  if (adEvalFixed > 0) {
    console.log(`[snack][QC] 광고평가어 치환: ${adEvalFixed}건 (기대이상/만족/든든 류 → 행동·장면 표현)`);
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
    console.log(`[snack][QC] ★ v1.2 가격 출력 제거: ${priceStripCount}건 (숫자 가격 → "부담 없는 가격")`);
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
    const KEEP = "맛있|좋|괜찮|들|나오|나왔|있|없|되|같|생각|들었|드|맞|어울|적합";
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
      // ★ [v2.10] 주제격+부사격 2연 → 부사격 채택. "순대국은에서"→"순대국에서" (Stage-2 실측 누락분)
      //   정상 한국어에 '은/는' 직후 '에서' 직결 활용 없음. 공백분리('것은 에서')는 경계라 미매칭 → 오교정 0.
      [/은에서(?=\s|[,.!?])/g, "에서 "],  // 순대국은에서 → 순대국에서
      [/는에서(?=\s|[,.!?])/g, "에서 "],  // (무받침/주제격)…는에서 → 에서
      // ★ [v2.11] 주제격+부사격(으로) 2연 → 부사격 채택. "삼계탕은으로"→"삼계탕으로"
      //   '은/는' 직후 '으로' 직결 정상활용 없음. 공백분리는 경계라 미매칭 → 오교정 0.
      [/은으로(?=\s|[,.!?])/g, "으로 "],  // 삼계탕은으로 → 삼계탕으로
      [/는으로(?=\s|[,.!?])/g, "으로 "],  // (무받침/주제격)…는으로 → 으로
    ];
    for (const [re, to] of isoRes) {
      result = result.replace(re, () => { particleDupCount++; return to; });
    }
    // ★ [v2.11-2] 주제격+보조사+부사격 3연 "…은만으로(도/는)" → 주제격 탈락, 보조사 변이 보존.
    //   "해장국은만으로도"→"해장국만으로도", "삼계탕은만으로"→"삼계탕만으로". '은/는' 직후 '만으로' 직결 정상활용 없음.
    //   공백분리("좋은 만으로")는 붙어있지 않아 미매칭 → 오교정 0. 변이(도/는/은)는 캡처해 그대로 재부착(trailing-space 비의존).
    result = result.replace(/[은는]만으로(도|는|은)?/g, (m, p) => { particleDupCount++; return "만으로" + (p || ""); });
    // ★ [v2.11-3] "메뉴명 경우"(조사 없는 맨명사+공백+경우) → "메뉴명의 경우". 관형형 보존을 위해 현재 글 menu 1개만 동적 참조(리스트 하드코딩 아님).
    //   정상 "이런/원할/하는 경우" 및 이미 조사 붙은 "메뉴의/메뉴는/메뉴가 경우"는 menu 단어 직결이 아니라 미매칭 → 오교정 0.
    if (menu) {
      const _menuEscC = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(_menuEscC + "\\s+경우", "g"), () => { particleDupCount++; return menu + "의 경우"; });
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
        // ★ [v2.3·layered 검수] 받침메뉴명 + 공백 + '나'(나열조사) → '이나'. "소머리국밥 나"→"소머리국밥이나"
        //   받침有 메뉴 직후 띄어쓰기 '나'는 보조사 '이나' 탈락. 받침無는 '나'가 정상이라 건드리지 않음.
        [/(국밥|순대국|해장국|갈비탕|설렁탕|곰탕|수육|머릿고기|술국|비빔밥)\s+나(?=\s|[,.])/g, "$1이나"],
        // ★ [v2.3·layered 검수] "메뉴보다 편리/편하게" → 비교격 오용. "국밥보다 편리하게"→"더욱 편리하게"
        //   이용정보 문맥에서 메뉴를 비교대상으로 둔 비문. 비교 의미가 아니라 강조 → '더욱'.
        [/(?:국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|메뉴)보다\s+(편리|편하게|간편)/g, "더욱 $1"],
        // ★ [v2.3.1·2차검수] 어절 깨짐: "…경우가 많다.을 합니다/한다.을 합니다" → 앞 종결 채택, 잉여 제거
        //   섹션 병합 시 GPT가 종결어미 뒤에 조사구를 흘리는 사고. 마침표 직후 '을 합니다/를 합니다' 잉여 절단.
        [/(다|음|함)\.\s*(?:을|를)\s*합니다\.?/g, "$1."],
        // ★ [v2.3.1·2차검수] "이 메뉴으로" → "이 메뉴로" ('메뉴' 받침無 → 부사격 '로')
        [/이\s*메뉴으로(?=\s|[,.!?])/g, "이 메뉴로 "],
        // ★ [v2.3.6·6차검수] "이 메뉴는으로" → "이 메뉴로" (주제격 placeholder + 부사격 중첩 — 양쪽 글 반복 출현)
        //   placeholder '이 메뉴는'(주제격 고정형) 뒤에 GPT가 '으로'를 직결 → '는으로' 비문. 받침無 '메뉴'라 '로'.
        [/이\s*메뉴는으로(?=\s|[,.!?])/g, "이 메뉴로 "],
        // ★ [v2.3.6·6차검수] "먼이용 정보" → "매장 이용 정보" (placeholder 환원 사고 — '먼저'+'이용' 깨짐 토큰)
        [/먼이용\s*정보/g, "매장 이용 정보"],
        // ★ [v2.3.1·2차검수] 받침메뉴명 + 공백 + '많은/많이/적은'(주제격 탈락) → 메뉴+은 + 어절
        //   "순대국 많은 사람들" → "순대국은 많은 사람들". 받침有 메뉴 직후 형용사로 바로 붙는 주제격 누락.
        [/(국밥|순대국|해장국|갈비탕|설렁탕|곰탕|수육|머릿고기|술국|비빔밥)\s+(많은|많이|적은)(?=\s)/g, "$1은 $2"],
        // ★ [v2.3.2·3차검수] 받침有 메뉴 + 공백 + '으로' 중첩 → '만으로'. "순대국은으로"는 '은+으로' 잉여 중첩.
        //   "순대국은으로" → "순대국만으로". 받침有 메뉴 직후 '은으로'는 주제격+부사격 중첩 비문.
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|수육|술국|비빔밥|순댓국|뼈해장국|육개장|갈비찜|제육|보쌈)\s*은으로(?=\s|[,.!?])/g, "$1만으로"],
        // ★ [v2.3.2·3차검수] 받침有 메뉴 + 공백 + 관형격 탈락 '모든/여러' → 메뉴+의 + 어절
        //   "순대국 모든 선택 과정" → "순대국의 모든 선택 과정".
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|수육|술국|비빔밥|순댓국|뼈해장국|육개장|갈비찜|제육|보쌈)\s+(모든|여러)(?=\s)/g, "$1의 $2"],
        // ★ [v2.3.2·3차검수] 받침有 메뉴 + 공백 + 형용사(주제격 탈락) → 메뉴+은. 기존 '많은/적은' 일반화.
        //   "설렁탕 적절한 선택" → "설렁탕은 적절한 선택".
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|수육|술국|비빔밥|순댓국|뼈해장국|육개장|갈비찜|제육|보쌈)\s+(적절한|좋은|괜찮은|훌륭한|든든한|충분한|적당한)(?=\s)/g, "$1은 $2"],
        // ★ [v2.3.2·3차검수] 받침有 메뉴 + 공백 + 위치/지시 명사(주격 탈락) → 메뉴+이.
        //   "설렁탕 머릿속에 떠오를" → "설렁탕이 머릿속에 떠오를".
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|수육|술국|비빔밥|순댓국|뼈해장국|육개장|갈비찜|제육|보쌈)\s+(머릿속|생각|기억)(?=에|이|을|\s)/g, "$1이 $2"],
        // ★ [v2.3.2·3차검수] 받침無 메뉴(불고기/머릿고기/우거지) + 형용사/관형 주제격 탈락 → 메뉴+는.
        //   받침無는 '은'이 아니라 '는'. "불고기 적절한"→"불고기는 적절한". 그룹 분리로 오교정 방지.
        [/(불고기|머릿고기|우거지)\s+(적절한|좋은|괜찮은|훌륭한|든든한|충분한|적당한|모든)(?=\s)/g, "$1는 $2"],
        // ★ [v2.3.5·5차검수] 받침有 메뉴 + 공백 + 출현동사(주격 탈락) → 메뉴+이.
        //   "국밥 떠오릅니다/떠오른다/생각납니다" → "국밥이 떠오릅니다". 받침有 메뉴 직후 동사 직결 주격 누락.
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|수육|술국|비빔밥|순댓국|뼈해장국|육개장|갈비찜|제육|보쌈)\s+(떠오릅니다|떠오른다|떠오를|떠오르는|떠오르게|떠오르기|떠오르곤|생각납니다|생각난다|생각나는|어울립니다|어울린다)(?=\s|[,.]|$)/g, "$1이 $2"],
        // ★ [v2.3.6·6차검수] 받침無 메뉴 + 출현동사 → 메뉴+가 (떠오르게/떠오르기/떠오르곤 변형 동반)
        [/(불고기|머릿고기|우거지)\s+(떠오릅니다|떠오른다|떠오를|떠오르는|떠오르게|떠오르기|떠오르곤|생각납니다|생각난다|생각나는|어울립니다|어울린다)(?=\s|[,.]|$)/g, "$1가 $2"],
        // ★ [v2.3.5·5차검수] 받침有 메뉴 + 공백 + '냐'(서술격 의문 탈락) → 메뉴+이냐. "어떤 국밥 냐에 따라"→"국밥이냐에".
        //   isCommon 안내문 "어떤 ${menu}냐에 따라"에서 GPT가 '국밥 냐'로 띄어 쓴 케이스. 받침有만.
        [/(국밥|순대국|돼지국밥|소머리국밥|콩나물국밥|해장국|갈비탕|설렁탕|곰탕|순댓국)\s+냐(?=에|\s|[,.])/g, "$1이냐"],
        // ★ [v2.12·1배치 보쌈/족발 실측] 받침有 메뉴 + '은로도'(주제격+부사격 오결합, '으' 탈락) → '만으로도'.
        //   실측: "보쌈은로도 충분히" → "보쌈만으로도 충분히". 기존 '은으로'(800행)와 토큰 달라 별도 가드.
        [/(고등어조림|소고기국밥|소머리국밥|오리주물럭|쭈꾸미볶음|코다리조림|콩나물국밥|갈치조림|낙지볶음|닭볶음탕|돼지국밥|뼈해장국|오리백숙|제육볶음|갈비찜|갈비탕|감자탕|동태탕|비빔밥|삼계탕|설렁탕|순대국|순댓국|아구찜|육개장|청국장|추어탕|해장국|곰탕|국밥|냉면|보쌈|수육|술국|제육|족발)\s*은로도(?=\s|[,.!?])/g, "$1만으로도"],
        // ★ [v2.13·족발 purpose측정 실측] 받침有 메뉴 + '은로'('도' 없음, 주제격+부사격 오결합 '으' 탈락) → '로'.
        //   실측: "족발은로 여유로운 시간" → "족발로 여유로운 시간". 위 '은로도'(824)와 토큰 분리 — 부정탐색 (?![도])로 '은로도' 중복 미발생.
        [/(고등어조림|소고기국밥|소머리국밥|오리주물럭|쭈꾸미볶음|코다리조림|콩나물국밥|갈치조림|낙지볶음|닭볶음탕|돼지국밥|뼈해장국|오리백숙|제육볶음|갈비찜|갈비탕|감자탕|동태탕|비빔밥|삼계탕|설렁탕|순대국|순댓국|아구찜|육개장|청국장|추어탕|해장국|곰탕|국밥|냉면|보쌈|수육|술국|제육|족발)\s*은로(?![도])(?=\s|[,.!?])/g, "$1로"],
        // ★ [v2.12·1배치 족발 실측] 삶는 메뉴 '육즙' 사실오류 → '식감'. 족발/보쌈은 삶은 메뉴라 육즙 표현 부적격.
        //   "족발의 육즙을 더욱 돋보이게" → "족발의 식감을 더욱 돋보이게". 메뉴+의 직후 '육즙' 한정.
        [/(족발|보쌈|수육|머릿고기)의\s*육즙/g, "$1의 식감"],
        // ★ [v2.12·1배치 족발 실측] "불족발보다 기본 이 집중하는" 어절 깨짐 → "기본 족발에 집중하는".
        //   GPT가 '기본 (족발)' 토큰 흘리고 주격 placeholder '이' 잔존. 비교격 '불족발보다'도 강조로 환원.
        [/불족발보다\s*기본\s*이\s*집중하는/g, "기본 족발에 집중하는"],
        // ★ [v2.12·1배치 보쌈 실측] "양념 강도 고려할 요소" 보조사 '도' 누락 → "양념 강도도 고려할 요소".
        //   병렬 나열 문맥("부위…, 김치/쌈장의 양념 강도(도) 고려할")에서 '도' 탈락. 명사+'고려할 요소' 한정 — 좁은 가드.
        [/(강도|양|종류|구성)\s+(고려할\s*요소)/g, "$1도 $2"],
      ];
      for (const [re, to] of josa3) {
        result = result.replace(re, (...args) => {
          particleDupCount++;
          // ★ [v2.3.3·치명버그 수정] 콜백에서 return to 하면 "$1/$2"가 리터럴로 남는다(치환 무력화).
          //   match·캡처그룹을 직접 받아 to 내 "$n"을 실제 그룹 문자열로 전개한다. (v2.3.2 잠복버그)
          const groups = args.slice(1, -2); // 마지막 2개(offset, string) 제외 = 캡처그룹들
          return to.replace(/\$(\d+)/g, (_, n) => groups[Number(n) - 1] ?? "");
        });
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
        // ★★ [snack v1.0·동적 받침가드] '은로도/는로도'(주제격+부사격+보조사 오결합) → '만으로도'.
        //   실측 한식 '보쌈은로도→보쌈만으로도'(824행) 일반화. 종성 동적판정.
        //   ⚠ 반드시 '은로'(아래)보다 먼저 — 한식 josa3 824→827 순서 정합.
        [new RegExp(`${mE}${jong ? "은" : "는"}로도(?=\\s|[,.!?])`, "g"), `${menu}만으로도 `],
        // ★★ [snack v1.0·동적 받침가드] 주제격+부사격 오결합 '은로/는로'('으' 탈락) → '로'.
        //   한식 josa3 하드코딩(은로→로, 받침有만)을 menu 종성 동적판정으로 일반화.
        //   종성有(튀김·김밥·쫄면·우동·어묵·라면): GPT 산출 '은로' → 'menu+로'
        //   종성無(떡볶이·라볶이·국물떡볶이·순대·비빔국수·잔치국수·돈가스): GPT 산출 '는로' → 'menu+로'
        //   ⚠ '은로도/는로도'는 위에서 먼저 처리 → 부정탐색 (?![도])로 이중 안전.
        [new RegExp(`${mE}${jong ? "은" : "는"}로(?![도])(?=\\s|[,.!?])`, "g"), `${menu}로 `],
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
  // ★ STEP F-1d2: globalBan 강조클리셰 후처리 강제치환 (v2.3.6·6차검수)
  //   사유: 프롬프트 globalBan(예방)만으론 본문 출현을 못 막음 — 실생성에서 '한층 더/풍성한 식사/
  //     풍부한 육즙/다채롭게/만족스러운 식사/몸을 녹여줄/이 동네를 방문해보세요'가 그대로 노출됨.
  //     PHILOSOPHY 원칙2(광고보다 행동) 정합 — 강조·감성·광고성 표현을 관찰가능 표현으로 강제 환원.
  //   원칙: 리터럴 to(캡처참조 0)만 사용 → josa3와 같은 $1 함정 회피.
  {
    let banFixCount = 0;
    const banConv = [
      // 강조 클리셰 '한층' — 종결/연결 어미까지 흡수해 비문 방지
      //   '~을/를 한층 더 돋보이게 합니다'(사동·목적격) → '더욱 살려줍니다'. 주격은 '잘 어울리다'.
      [/(을|를)\s*한층\s*더\s*돋보이게\s*(?:합니다|해줍니다|해\s*줍니다)/g, "$1 더욱 살려줍니다"],
      [/(을|를)\s*한층\s*더\s*돋보이게\s*(?:하며|하고)/g, "$1 더욱 살려주며"],
      [/한층\s*더\s*돋보이게\s*(?:합니다|해줍니다|해\s*줍니다)/g, "잘 어울립니다"],
      [/한층\s*더\s*돋보이게\s*(?:하며|하고)/g, "잘 어울리며"],
      [/한층\s*더\s*돋보이게/g, "잘 어울리게"],
      [/한층\s*더(?=\s)/g, "더욱"],
      [/한층\s*부드럽게/g, "더욱 부드럽게"],
      [/한층\s*(?:살아납니다|풍부해집니다)/g, "살아납니다"],
      [/한층(?=\s)/g, "더"],
      // '풍성/풍부' 감성 수식 — 뒤 조사·동사구까지 흡수
      [/더욱\s*풍성한\s*식사를\s*즐길\s*수\s*있(?:게\s*합니다|습니다)/g, "더욱 다양하게 즐길 수 있습니다"],
      [/풍성한\s*식사를\s*즐길\s*수\s*있(?:게\s*합니다|습니다)/g, "든든하게 즐길 수 있습니다"],
      [/풍성한\s*식사/g, "든든한 식사"],
      [/풍성하게(?=\s)/g, "넉넉하게"],
      // ★ [v2.4·후처리] '풍성해지다' 어미활용 — 기존 '풍성한 식사/풍성하게'만 커버, 동사형 누락분
      //   실측(순대국 발행본): "한 끼 식사가 더욱 풍성해지지만, 혼자라면…"
      //   '더욱' 수식 흡수 + 역접/종결 어미 분기. '식사가/끼가' 주격 잔여 방지로 앞부분까지 흡수.
      [/(?:더욱\s*)?풍성해지지만/g, "다양해지지만"],
      [/(?:더욱\s*)?풍성해집니다/g, "다양해집니다"],
      [/(?:더욱\s*)?풍성해져(?=\s|서|요)/g, "다양해져"],
      [/(?:더욱\s*)?풍성해(?:지며|지고)/g, "다양해지고"],
      [/풍부한\s*육즙을\s*(?:느낄|맛볼)\s*수\s*있습니다/g, "고기의 육즙을 느낄 수 있습니다"],
      [/풍부한\s*육즙(?:을|이)?/g, "고기의 육즙"],
      [/육즙이\s*풍부(?:한|하게|하며|합니다)/g, "육즙이 배어 있어"],
      // '다채' 과장
      [/다채롭게(?=\s)/g, "다양하게"],
      [/다채로운\s*맛/g, "다양한 맛"],
      // '만족스러운 식사' 감상 닫기 — 종결구 흡수
      [/만족스러운\s*식사를\s*(?:경험할|즐길|할)\s*수\s*있습니다/g, "한 끼 식사로 즐기기 좋습니다"],
      [/만족스러운\s*식사가\s*됩니다/g, "한 끼 식사가 됩니다"],
      [/만족스러운\s*식사/g, "든든한 한 끼"],
      // '몸을 녹여줄/녹이' 효능·감성 — 뒤 어미 흡수해 잔여 방지, '따뜻한' 중복 회피
      [/(?:얼어붙은\s*)?몸을\s*녹여줄\s*따뜻한/g, "속을 데워줄"],
      [/(?:얼어붙은\s*)?몸을\s*녹여줄(?=\s)/g, "속을 데워줄"],
      [/(?:얼어붙은\s*)?몸을\s*녹이고자\s*하는/g, "따뜻하게 먹으려는"],
      [/(?:얼어붙은\s*)?몸을\s*녹이(?:려는|는)/g, "따뜻하게 먹는"],
      // 광고성 CTA '이 동네를 방문해보세요' (PHILOSOPHY 원칙2)
      [/이\s*동네를\s*방문해\s*보세요\.?/g, "이 지역에서 찾아볼 수 있습니다."],
      [/이\s*동네를\s*방문해보세요\.?/g, "이 지역에서 찾아볼 수 있습니다."],
      // 메뉴 중복 '다양한 X 전문점' (불고기 검수: '다양한 불고기 전문점')
      [/다양한\s*(불고기|국밥|순대국|칼국수|설렁탕|곰탕)\s*전문점/g, "$1 전문점"],
      // ─── [v2.3.6·6차검수 추가] ───────────────────────────
      // 중복 부사 '더 더' (실측: "국물의 깊이를 더 더해줍니다")
      [/더\s+더해(줍니다|준다|주며|진다)/g, "더해$1"],
      [/더\s+더(?=\s)/g, "더"],
      // 문장 절단 '확인하는 것을.' → '확인하는 것이 좋습니다.' (목적격 잔여 종결)
      [/확인하는\s*것을\.(?=\s|$)/g, "확인하는 것이 좋습니다."],
      [/(?:체크|점검)하는\s*것을\.(?=\s|$)/g, "확인하는 것이 좋습니다."],
      // ★ [v2.4·후처리] 어절깨짐 '식감이 괜찮은, 국물과' — 관형형 형용사+쉼표+명사 비문
      //   실측(순대국 발행본): "부드러운 식감이 괜찮은, 국물과 함께 먹으면"
      //   원인: GPT가 서술 자리에 관형형+쉼표 오삽입. 쉼표 제거 + 서술형 복원.
      //   ⚠ 일반화 금지(주어 흡수 비문) — 실측 정확 케이스만. 추가 변종은 v2.5 통합 QC.
      [/식감이\s*괜찮은,\s*(국물|밥|면)과/g, "식감이 좋아 $1과"],
      // AI 관용어 globalBan 후처리 강제치환
      [/안성맞춤입니다/g, "잘 맞습니다"],
      [/안성맞춤(?:인|이다|이며)?/g, "잘 맞는"],
      [/실용적이고\s*만족스러운\s*선택(?:이\s*될\s*수\s*있습니다|입니다)?/g, "부담 없는 선택이 될 수 있습니다"],
      [/실용적이고\s*만족스러운/g, "부담 없는"],
      [/만족스러운\s*선택(?:이\s*될\s*수\s*있습니다|입니다)?/g, "무난한 선택이 될 수 있습니다"],
      [/풍요롭게(?=\s)/g, "다양하게"],
      [/곁들이기에\s*매력적입니다/g, "곁들이기 좋습니다"],
      [/매력적입니다/g, "괜찮습니다"],
      [/매력적(?:인|이며|이고)/g, "괜찮은"],
      [/제격입니다/g, "잘 어울립니다"],
      // '몸과 마음' — 주격(이)/목적격(을)/보조사(도) 정합 분기
      [/몸과\s*마음이/g, "속이"],
      [/몸과\s*마음을/g, "속을"],
      [/몸과\s*마음도/g, "속도"],
      [/몸과\s*마음(?=\s)/g, "속"],
      // '넉넉하게/넉넉한' 반복 분산 — 동의어 치환으로 누적 반복 완화(반복억제, globalBan 아님)
      [/넉넉하게\s*만들어\s*(줍니다|준다)/g, "든든하게 채워 $1"],
      [/더욱\s*넉넉하게\s*즐기고/g, "더 든든하게 즐기고"],
      [/넉넉하게\s*즐기고/g, "든든하게 즐기고"],
      // ─────────────────────────────────────────────────────────────
      // [v2.9·Stage-1] AI 클리셰 "종결형 연어구" 제거
      //   측정근거: 순대국/해장국 2샘플 교차 — 아래 연어구가 양쪽 공통 고빈도.
      //   원칙: 종결형 연어구만 치환. 관형형('적합한','고려할 부분/수')·단독 '중요합니다'는 미접촉.
      //         전역 문법치환(수 있습니다/됩니다/선택) 금지 = banConv 철학 유지.
      //   FREEZE-safe: 기존 banConv는 광고형 전담, 본 블록은 설명체 클리셰로 계열 비중복.
      [/(을|를)\s*(?:선택하는|고르는)\s*것이\s*중요합니다/g, "$1 취향대로 고르면 됩니다"],
      [/(?:선택하는|고르는)\s*것이\s*중요합니다/g, "고르면 됩니다"],
      [/좋은\s*선택이\s*될\s*수\s*있습니다/g, "괜찮은 한 끼가 됩니다"],
      [/좋은\s*선택입니다/g, "괜찮은 한 끼입니다"],
      [/무난한\s*선택이\s*될\s*수\s*있습니다/g, "부담 없이 즐기기 좋습니다"],
      [/고려할\s*만합니다/g, "선택지가 됩니다"],
      [/고려할\s*만하다/g, "선택지가 된다"],
      [/적합합니다/g, "잘 어울립니다"],
      [/좋은\s*방법입니다/g, "함께 즐기기 좋습니다"],
      [/좋은\s*방법이다/g, "함께 즐기기 좋다"],
    ];
    for (const [re, to] of banConv) {
      result = result.replace(re, (...args) => {
        banFixCount++;
        const groups = args.slice(1, -2);
        return to.replace(/\$(\d+)/g, (_, n) => groups[Number(n) - 1] ?? "");
      });
    }
    if (banFixCount > 0) result = normalizeWhitespace(result);
    cleanSnackText.__lastBanFix = banFixCount;
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
    console.log(`[snack][QC] ★ STEP F 조사중복/이종2연 제거: ${particleDupCount}건 (은은/는은/은을/이메뉴은 등 → 단일화)`);
  }
  if (subjParticleFixCount > 0) {
    console.log(`[snack][QC] ★ STEP F 주격조사 자연화: ${subjParticleFixCount}건 (메뉴 잘/자주+서술 → 메뉴+이/가)`);
  }
  if (efficacyFixCount > 0) {
    console.log(`[snack][QC] ★ STEP F 효능표현 제거: ${efficacyFixCount}건 (숙취해소/건강 단정 → 행동·선택 표현)`);
  }
  if (storeRefFixCount > 0) {
    console.log(`[snack][QC] ★ STEP F 매장지칭 일반화: ${storeRefFixCount}건 (이 가게의/그 집의 → 메뉴명/이 메뉴는)`);
  }
  if (menuDupCount > 0) {
    console.log(`[snack][QC] ★ STEP F 메뉴명 중복 제거: ${menuDupCount}건 (○○ 떡볶이 떡볶이 → ○○ 떡볶이)`);
  }
  if (superlativeFixCount > 0) {
    console.log(`[snack][QC] ★ STEP F 과수식어 제거: ${superlativeFixCount}건 (완벽한/최고의/역대급 → 중립화)`);
  }
  if (unitFixCount > 0) {
    console.log(`[snack][QC] ★ STEP F 단위 정합: ${unitFixCount}건 (servingUnit=접시 → 그릇→접시)`);
  }
  if (dupSentenceCount > 0) {
    console.log(`[snack][QC] ★ STEP F 동일문장 제거: ${dupSentenceCount}건 (완전일치 중복만, 유사도 미적용)`);
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP G — 한식 검수(4종 실생성) 기반 후처리 보강
  //   원칙: "거슬리는 것만 제거, 사람다운 반복은 유지(메뉴명 포함)"
  //   G-1~3 = 무조건 수정(전량) / G-4 = 카운트 제한(첫 2회 보존, 3회째+만)
  //   PHILOSOPHY 정합: 광고SEO 이동 0 · scene 무관 · 매장명 무관 · 정제과잉 금지(반복 잔존 허용)
  // ─────────────────────────────────────────────────────

  // G-1. 번역체 '그것의/그것을/그것이' (josa3는 '그것가/그것이→ref'만 커버, '그것의' 미커버)
  //   "그것의 매력을 직접 경험해 볼 수 있다" → "메뉴의 특징을 경험할 수 있다" 류
  let transFixCount = 0;
  {
    const before = result;
    result = result
      .replace(/다양한 상황에서 그것의 매력을 직접 경험해\s*볼 수 있다\.?/g, "다양한 상황에서 즐기기 좋은 메뉴다.")
      .replace(/그것의(?=\s)/g, "메뉴의")
      .replace(/그것을(?=\s)/g, "메뉴를")
      .replace(/그것이(?=\s)/g, "메뉴가");
    if (before !== result) transFixCount = (before.match(/그것의|그것을|그것이/g) || []).length;
  }

  // G-2. 어절 인접 중복 (동일 명사가 바로 옆에서 군더더기로 반복)
  //   "김치찌개 김치 국물" → "김치 국물" / "순대국 조합은 순대국의 …" → "이러한 구성은 …"
  let phraseDupCount = 0;
  {
    const before = result;
    // (a) "메뉴명 + 메뉴어두 소스/맛" 류: 메뉴명이 바로 뒤 명사구 머리를 중복 → 메뉴명 제거
    if (menu) {
      const mE = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // "김치찌개 김치" → "김치" / "된장찌개 된장 국물" → "된장 국물" (메뉴명 직후 그 메뉴의 핵심어가 다시 오는 경우만)
      result = result.replace(new RegExp(`${mE}\\s+(국물|소스|양념|김치|된장|육수|고기)\\s`, "g"), "$1 ");
      // "메뉴 조합은 메뉴의" → "이러한 구성은" (메뉴명 2회 인접 설명 군더더기)
      result = result.replace(new RegExp(`${mE}\\s*조합은\\s*${mE}의`, "g"), "이러한 구성은");
    }
    // (b) 현재 메뉴명과 무관하게 "동일토큰 조합은 동일토큰의" 일반 패턴 (예: 순대국 조합은 순대국의)
    result = result.replace(/([가-힣]{2,6})\s*조합은\s*\1의/g, "이러한 구성은");
    if (before !== result) phraseDupCount = 1;
  }

  // G-3. 일반화 표현 안전화 (근거 없는 단정 → "매장에 따라"로 통일)
  //   "일부 가게에서는 / 일부 한식당은 / 매장은 대부분 …" → 안전 표현
  let generalizeFixCount = 0;
  {
    const before = result;
    result = result
      .replace(/일부 가게에서는/g, "매장에 따라")
      .replace(/일부 한식당은/g, "매장에 따라")
      .replace(/일부 한식당에서는/g, "매장에 따라")
      .replace(/매장은 대부분 좌석이 넉넉하여/g, "매장에 따라 좌석 구성은 다를 수 있으며")
      .replace(/대부분 좌석이 넉넉하여/g, "좌석 구성은 매장에 따라 다를 수 있으며");
    generalizeFixCount = (before.match(/일부 가게에서는|일부 한식당은|일부 한식당에서는|매장은 대부분 좌석이 넉넉하여|대부분 좌석이 넉넉하여/g) || []).length;
  }

  // G-4. 과반복 카운트 제한 (첫 2회 보존, 3회째부터만 축약 — 랜덤치환 아님 / 메뉴명 제외)
  //   대상: "직접 확인/방문 시 확인", "다양한 해물", "깊은 풍미"
  let repeatCapCount = 0;
  {
    const capPhrase = (src, re, replacer, keep = 2) => {
      let n = 0;
      const out = src.replace(re, (m) => {
        n++;
        if (n <= keep) return m;          // 첫 keep회 보존
        repeatCapCount++;
        return replacer(m);               // 초과분만 축약
      });
      return out;
    };
    // "방문 시 (직접) 확인" / "직접 확인" — 초과분은 "매장 안내 참고"로
    result = capPhrase(result, /방문\s*시\s*(?:직접\s*)?확인해?\s*보는 것이 좋다/g, () => "매장 안내를 참고하면 된다");
    result = capPhrase(result, /직접\s*확인/g, () => "매장 안내 참고");
    // "다양한 해물" 초과분 → "해산물"
    result = capPhrase(result, /다양한 해물/g, () => "해산물");
    // "깊은 풍미" 초과분 → "진한 맛" (국물/육수 문맥 공통)
    result = capPhrase(result, /깊은 풍미/g, () => "진한 맛");
  }

  // ─────────────────────────────────────────────────────
  // ★ STEP G2 — 한식 검수(양장피/팔보채/칠리새우) 잔여 6룰 (G-4 산출물까지 정정 위해 G-4 뒤 배치)
  //   원칙 동일: 거슬리는 깨짐·번역체만 제거, 사람다운 반복·메뉴명 보존
  //   주의: G-4가 초과분을 "매장 안내 참고"로 만들므로 G2-a는 반드시 G-4 이후 실행
  // ─────────────────────────────────────────────────────
  let stepG2Count = 0;
  {
    const before = result;
    // G2-a. "매장 안내 참고/참고하면 된다" → 자연 표현 (방문 전 확인 / 매장에 문의 교차)
    let saToggle = 0;
    result = result
      .replace(/매장에서\s*매장 안내(?:를)?\s*참고/g, "매장에 문의")
      .replace(/매장 안내(?:를)?\s*참고해\s*보는 것이 좋다/g, () => (saToggle++ % 2 === 0) ? "방문 전 확인하는 것이 좋다" : "매장에 문의하는 것이 좋다")
      .replace(/매장 안내(?:를)?\s*참고해보시는 것이 권장됩니다/g, "방문 전 확인하시는 것이 권장됩니다")
      .replace(/매장 안내(?:를)?\s*참고할 수 있다/g, "방문 전 확인할 수 있다")
      .replace(/매장 안내(?:를)?\s*참고하면 된다/g, "방문 전 확인하면 된다")
      .replace(/매장 안내(?:를)?\s*참고/g, () => (saToggle++ % 2 === 0) ? "방문 전 확인" : "매장에 문의");

    // G2-b. 번역체 대명사 "이거의" → "이 메뉴의" (josa3 미커버)
    result = result.replace(/이거의(?=\s)/g, "이 메뉴의");

    // G2-c. 단위+조사 깨짐 받침 정합 (한식: '그릇' 받침○ → 이/은/을 / '접시' 받침× → 가/는/를)
    //   GPT 빈발: "한 그릇가/한 그릇는" → "한 그릇이/한 그릇은" · "한 접시이/한 접시은" → "한 접시가/한 접시는"
    result = result
      .replace(/(한\s*그릇)가(?=\s|[,.!?]|$)/g, "$1이")
      .replace(/(한\s*그릇)는(?=\s|[,.!?]|$)/g, "$1은")
      .replace(/(한\s*그릇)를(?=\s|[,.!?]|$)/g, "$1을")
      .replace(/(한\s*접시)이(?=\s|[,.!?]|$)/g, "$1가")
      .replace(/(한\s*접시)은(?=\s|[,.!?]|$)/g, "$1는")
      .replace(/(한\s*접시)을(?=\s|[,.!?]|$)/g, "$1를");

    // G2-d. "메뉴명 + 조합" 백레퍼런스 → "이 조합" (G-2가 '조합은 X의'만 커버 → 단독 '메뉴명 조합' 보강)
    if (menu) {
      const mE2 = menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`${mE2}\\s*조합`, "g"), "이 조합");
    }

    // G2-e. "전문점의 한식당들은/한식당들은" 군더더기 → "한식당에서는"
    result = result
      .replace(/[가-힣]{2,8}\s*전문점의\s*한식당들은/g, "한식당에서는")
      .replace(/한식당들은(?=\s)/g, "한식당에서는");

    // G2-f. "이 가게마다 / 가게마다" → "매장마다" (표현 통일)
    result = result
      .replace(/이 가게마다/g, "매장마다")
      .replace(/가게마다/g, "매장마다");

    // G2-g. "방문 시 방문 전 확인" 중복 → "방문 전 확인" (G2-a 산출물 앞 '방문 시' 잔존 흡수)
    result = result
      .replace(/방문\s*시\s*방문\s*전\s*확인/g, "방문 전 확인");

    // G2-h. "맛" + 잘못된 조사 (받침○ '맛' → 이/과/을 정합)
    result = result
      .replace(/맛가(?=\s)/g, "맛이")
      .replace(/맛와(?=\s)/g, "맛과")
      .replace(/맛를(?=\s)/g, "맛을");

    // G2-i. "한식당 전문점에서는 / OO 전문점에서는(한식당 문맥)" → "한식당에서는"
    result = result
      .replace(/한식당\s*전문점에서는/g, "한식당에서는")
      .replace(/한식\s*전문점에서는/g, "한식당에서는");

    if (before !== result) stepG2Count = 1;
  }
  if (stepG2Count > 0) console.log(`[snack][QC] ★ STEP G2 잔여정정: 매장안내참고/이거의/한그릇가/메뉴명조합/전문점한식당들은/가게마다/방문시중복/맛조사/한식당전문점`);

  if (transFixCount > 0)     console.log(`[snack][QC] ★ STEP G 번역체 정정: ${transFixCount}건 (그것의/그것을/그것이 → 메뉴)`);
  if (phraseDupCount > 0)    console.log(`[snack][QC] ★ STEP G 어절중복 제거: ${phraseDupCount}건 (메뉴명 군더더기 인접반복)`);
  if (generalizeFixCount > 0) console.log(`[snack][QC] ★ STEP G 일반화 안전화: ${generalizeFixCount}건 (일부 가게/대부분 → 매장에 따라)`);
  if (repeatCapCount > 0)    console.log(`[snack][QC] ★ STEP G 과반복 제한: ${repeatCapCount}건 (3회째+ 축약 · 첫 2회·메뉴명 보존)`);

  // 외부 QC 집계용
  cleanSnackText.__lastParticleDup = particleDupCount;
  cleanSnackText.__lastSubjParticleFix = subjParticleFixCount;
  cleanSnackText.__lastEfficacyFix = efficacyFixCount;
  cleanSnackText.__lastStoreRefFix = storeRefFixCount;
  cleanSnackText.__lastMenuDup = menuDupCount;
  cleanSnackText.__lastSuperlativeFix = superlativeFixCount;
  cleanSnackText.__lastUnitFix = unitFixCount;
  cleanSnackText.__lastDupSentence = dupSentenceCount;
  cleanSnackText.__lastParticleErrors = particleErrorCount;
  cleanSnackText.__lastMenuMeta = menuMetaCount;
  cleanSnackText.__lastAdEvalFixed = adEvalFixed;
  cleanSnackText.__lastPlaceholderFix = placeholderFixCount;
  cleanSnackText.__lastTransFix = transFixCount;
  cleanSnackText.__lastPhraseDup = phraseDupCount;
  cleanSnackText.__lastGeneralizeFix = generalizeFixCount;
  cleanSnackText.__lastRepeatCap = repeatCapCount;
  cleanSnackText.__lastStepG2 = stepG2Count;

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
  const cafeLeak    = (text.match(/카공|작업카페|스터디카페|디저트카페|콘센트 자리|드립커피|라떼아트/g) || []).length;

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
  //   누적 = cleanSnackText가 치환한 총 횟수
  // ─────────────────────────────────────────────────────
  const adEvalLeakRe = /기대\s*이상이?(?:더라고요|었어요|었습니다|에요|예요|었다|다)|기대\s*이상[가-힣]?|만족스러[웠운]|만족스럽게|든든했|든든하더|정말\s*좋았어요|너무\s*좋았어요|깔끔하게\s+잘\s+나왔/g;
  const adEvalLeakCount = (text.match(adEvalLeakRe) || []).length;
  const adEvalFixed = (typeof cleanSnackText.__lastAdEvalFixed === "number")
    ? cleanSnackText.__lastAdEvalFixed : 0;

  // cleanSnackText 마지막 호출 시 누적된 교정 횟수
  const particleFixed = (typeof cleanSnackText.__lastParticleErrors === "number")
    ? cleanSnackText.__lastParticleErrors : 0;

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
  const menuMetaFixed = (typeof cleanSnackText.__lastMenuMeta === "number")
    ? cleanSnackText.__lastMenuMeta : 0;

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

  console.log(`[snack][QC] 메뉴블럭: ${hasMealBlock}`);
  console.log(`[snack][QC] 운영정보: ${hasMealValue} (포함 ${mealValueCount}/9, 5개 이상 권장)`);
  console.log(`[snack][QC] 지역+메뉴 결합 "${combo}": ${comboCount}회 (3회 이하 ★ Phase 9.5)`);
  console.log(`[snack][QC] 메뉴명 "${menu}": ${menuCount}회 / 지역명 "${region}": ${regionCount}회`);
  console.log(`[snack][QC] 조사오류 잔존(0 필수 ★ 이슈 #1): ${particleLeakCount}건 / 후처리 교정: ${particleFixed}건`);
  console.log(`[snack][QC] 메뉴 fingerprint 잔존(0 필수 ★ v4 P1): ${menuMetaLeakCount}건 / 후처리 차단: ${menuMetaFixed}건`);
  console.log(`[snack][QC] 광고평가어 잔존(0 권장): ${adEvalLeakCount}건 / 후처리 치환: ${adEvalFixed}건`);
  console.log(`[snack][QC] 광고패턴(0 필수 ★ Phase 9.5): ${adPatternCount}`);
  console.log(`[snack][QC] 추천유도(0 권장): ${recommendCount}`);
  console.log(`[snack][QC] 의료 침투(0 필수): ${medicalLeak} / 카페 침투(0 필수): ${cafeLeak}`);
  console.log(`[snack][QC] 🔍 fossil[꾸준한:${fossil_kkujun}|한결같:${fossil_hangyeol}|깔끔:${fossil_kkalkkeum}|뚝배기:${fossil_ttukbaegi}|김올라:${fossil_gim}|한술:${fossil_hansul}|모락:${fossil_morak}|입안가득:${fossil_ipan}] (★ v4.1 측정만)`);
  console.log(`[snack][QC] 🔍 fossil2[촉촉:${fossil_chokchok}|마지막한술:${fossil_majimak}|첫입첫술:${fossil_cheossul}|이집의:${fossil_ijibui}] (★ v4.2 측정만)`);
  if (fullKeyword) console.log(`[snack][QC] 완전체키워드(${fullKeyword}): ${fullKwCount}`);
  if (mode === "commercial") {
    console.log(`[snack][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[snack][QC] 가격명시(commercial 위반): ${priceCount}건`);
  }

  return {
    hasMealBlock, hasMealValue, mealValueCount,
    comboCount, menuCount, regionCount,
    firstPersonCount, priceCount,
    adPatternCount, recommendCount,
    medicalLeak, cafeLeak,
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
export default async function handleSnack(req, res) {
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

  const name      = program.name || "이 식당";
  const region    = (userRegion || "구리").trim();
  const memo      = (userMemo || "").trim();
  const targetId  = target?.id   || "visit";
  const blogTypeId = blogType?.id || "review";
  const industry  = "snack";
  // [v2] personal은 명시적으로 요청된 경우에만. 그 외(미지정·commercial) = commercial.
  const validMode = (mode === "personal") ? "personal" : "commercial";

  // 상황·목적 (body 우선, program 보조)
  const situation = bodySituation || program.situation || "";
  const purpose   = bodyPurpose   || program.purpose   || "";

  console.log(`[snack] mode: ${validMode} | 상황: ${situation || "(미지정)"} | 목적: ${purpose || "(미지정)"}`);
  console.log(`[snack][BUILD] snack-v1.0-from-korean-v2.3.6+t2.4 (Restaurant 한식 v2.3.6 본문 후처리 승계(FREEZE) · 제목엔진 v2.4 가중폼 승계 · ★분식 신규: class 4축(soup국물/meat양념·볶음·튀김/rice밥/noodle면) SoT · 떡볶이(meat)↔국물떡볶이(soup) 분리 · ★받침가드: menu 종성 동적판정(은로/는로/은로도/는로도→로/만으로도) 13메뉴 자동대응 · menu-map 진단: id실패시 menu재매칭 방어 + 대표메뉴 무음폴백 경고로그 · 배포검증: +snackv1.0 안 보이면 구버전 실행 중)`);

  // ── restaurant 조합 검증 ─────────────────────────────────
  const SNK_IDS = SNACK_TREATMENTS.map(t => t.id);
  const isRest = SNK_IDS.includes(program.id) || program.industry === "snack";
  if (!isRest) {
    console.error(`[snack] 잘못된 조합 진입 차단: ${name} / id=${program.id}`);
    return res.status(400).json({ error: `맛집 생성기에 잘못된 항목이 전달되었습니다: ${name}` });
  }

  // ── 데이터 로드 ─────────────────────────────────
  // ★ [v2.4·치명버그 진단] 메뉴 매핑 오류 추적 (삼계탕/제육 선택 → 국밥 생성 케이스)
  //   배경: program.id로 treatment를 찾는데, 실패 시 SNACK_TREATMENTS[0](국밥)으로
  //         무음 폴백 → 본문 전체가 국밥으로 생성되는 Silent Fallback 위험.
  //   원인 후보(미확정): ①program.id 미전달 ②id 형식 불일치(_guri_01 vs _nowon_01 등)
  //         ③program.id undefined. 근본 진단은 index.js payload 점검 필요(다음 세션).
  //   ⚠ 본문 서술/프롬프트/데이터 무관 — 진단 로그 + 방어 재매칭만(FREEZE-safe).
  const _idMatch   = SNACK_TREATMENTS.find(t => t.id === program.id);
  // 2차 방어: id 실패 시 program.menu/menuRef 명으로 재매칭 (지역 접미 불일치 복구).
  const _menuKey   = program?.menu || program?.menuRef || program?.name || "";
  const _menuMatch = !_idMatch && _menuKey
    ? SNACK_TREATMENTS.find(t => t.menu === _menuKey || t.menuRef === _menuKey)
    : null;
  const treatmentData = _idMatch || _menuMatch || SNACK_TREATMENTS[0];

  // 진단 로그 — 매핑 경로를 명시. 운영 로그에서 즉시 원인 판별 가능.
  if (!_idMatch) {
    console.error(
      `[snack][★MENU-MAP] id 매칭 실패! programId=${JSON.stringify(program?.id)} ` +
      `| programMenu=${JSON.stringify(_menuKey)} ` +
      `| menu재매칭=${_menuMatch ? _menuMatch.id + "(" + _menuMatch.menu + ")" : "실패"} ` +
      `| 최종선택=${treatmentData.id}(${treatmentData.menu})` +
      `${(!_idMatch && !_menuMatch) ? " ← ⚠대표메뉴[0] 무음폴백 발생(잘못된 글 생성 위험)" : " ← menu명으로 복구됨"}`
    );
    console.error(`[snack][★MENU-MAP] availableIds=${JSON.stringify(SNACK_TREATMENTS.map(t => t.id))}`);
  }
  console.log(`[snack][treatment] 선택: ${treatmentData.id} / ${treatmentData.menu} (경로: ${_idMatch ? "id직매칭" : _menuMatch ? "menu재매칭" : "대표메뉴폴백"})`);

  const cat  = treatmentData?.cat || "분식";
  const menu = treatmentData?.menu || treatmentData?.menuRef || "";

  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  console.log(`[snack] 지역: ${region} | 카테고리: ${cat} | 메뉴: ${menu}`);

  // ── DIRECTION 동적 생성 (하이브리드 merge) ─────────────────
  const direction   = getSnackDirection(treatmentData, situation, purpose);
  const genericName = direction.genericName || "이 식당";
  const flowBias    = direction.flowBias || "";
  console.log(`[snack] flowBias: ${flowBias || "(없음)"} | genericName: ${genericName}`);

  // ── 시스템 프롬프트 ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 "${menu}를 설명하는 작가"가 아닙니다.
당신의 임무는 ${region} 일대에서 "오늘 ${menu} 먹으러 갈까?" 하고 검색하는 사람의 상황을 읽고, 그 사람이 "이 한 끼면 내 상황이 해결되겠다"고 스스로 판단하도록 돕는 것입니다.

[★★★ 최상위 관점 — 글의 주어는 '메뉴'가 아니라 '사람'이다]
- 사람은 재료·조리법이 궁금해서 검색하지 않는다. 자기 상황(배고픔·혼밥·해장·가족식사·추운 날 국물·제대로 된 한 끼)을 해결하려고 식당을 찾는다.
- 그러므로 모든 문단을 '${menu}는 ~한 음식이다'(메뉴 주어)가 아니라 '~한 상황의 사람은 ${menu}로 ~를 해결한다'(사람 주어)로 쓴다.
- 메뉴 정보(재료·국물·식감·곁들임)는 그 자체가 목적이 아니라 "이 상황의 사람에게 왜 맞는가"를 뒷받침하는 근거로만 등장한다.
- 사전·백과사전식 정의("${menu}는 ~로 만든 음식으로 ~가 특징이다") 절대 금지. 사람의 하루·끼니·상황에서 출발한다.
- 식사 후 남는 것도 재료가 아니라 '해결된 상황'이다 — "속이 풀렸다 / 든든하게 한 끼 했다 / 같이 먹기 편했다" 같은 경험이 자연스럽게 떠오르게 한다(단, 1인칭 후기나 단정은 금지 — 독자가 스스로 느끼게).
- 글을 다 읽은 독자에게 "${menu}가 어떤 음식인지 알았다"가 아니라 "오늘 같은 날 ${menu} 먹으러 갈까"라는 마음이 남아야 한다.
- ★ 비중 절대 기준: 사람의 상황·목적·식후 만족 70~80 / 메뉴 자체 설명 20~30. 한 문단 안에서 재료·조리·식감만 2문장 이상 연속하면 실패(백과사전 회귀).

업종: 맛집·식당 | 지역: ${region} | 메뉴: ${menu} | 카테고리: ${cat}

[협찬·표시광고법 준수]
- ❌ 1인칭 후기 시점 금지 (저는/제가/다녀왔어요)
- ❌ 가격 단정 명시 금지 → "매장 가격 기준 확인"
- ❌ 효과 단정 금지 (최고/1등/유일한/완벽/원조/정통)
- ❌ 고객 유인 금지 (할인/이벤트/쿠폰)
- ❌ 매장 직접 추천 단정 금지
- ❌ 만족 단정 금지 (푸짐하다/가성비 최고/배부르다/또 가고 싶다) → 독자가 가늠할 '판단 재료'로만 제공

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

[절대 금지] 의료·카페·학습 어휘 일절 사용 금지
  ❌ 시술/치료/회복/통증 (의료)
  ❌ 카공/콘센트/스터디카페/드립커피 (카페)
  ❌ 공부하기 좋은/집중하기 좋은 (학습)

[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함

[문단 길이 ★ 네이버 맛집판 상단 구조]
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
  const SECTIONS = getSnackSections(cat, flowBias, validMode);
  const sectionTexts = {};
  let prevTextRaw = "";

  // ★ [v2.6] purpose 단일 SoT — 제목 purpose를 본문 순회 전에 1회 확정.
  //   menu → menuClass → 표시 purpose + 본문 필터용 master. 제목·본문·recommendSituation 공유.
  const _titlePurpose = validMode === "commercial" ? pickTitlePurpose(menu) : null;
  const _masterPurpose = _titlePurpose ? _titlePurpose.master : null;

  // ★ [v2.1-rotate] commercial: 섹션마다 다른 방문상황 배정 (혼밥/가족 2개 반복 차단)
  //   사용자가 고른 situation은 도입(menuIntro)에 우선 반영, 나머지 섹션은 풀에서 로테이션.
  //   ★ [v2.6] _masterPurpose 전달 → 제목 purpose 계열 상황만 필터(SoT 일치). 풀 부족 시 전체 보충.
  const _rotSits = validMode === "commercial"
    ? pickRotatedSituations(SECTIONS.length, _masterPurpose)
    : [];

  for (let _si = 0; _si < SECTIONS.length; _si++) {
    const sec = SECTIONS[_si];
    const _secSit = _rotSits[_si] || null;
    const richPrompt = buildSnackPrompt(sec.key, treatmentData, region, {
      mode: validMode, situation, purpose,
      sectionSituation: _secSit,   // ★ [v2.1] 섹션별 배정 상황
      masterPurpose: _masterPurpose,   // ★ [v2.6] purpose 단일 SoT (recommendSituation 계열 좁히기)
    });
    const prevBlock = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: snack | 지역: ${region} | 메뉴: ${menu} | 카테고리: ${cat} | 상황: ${situation} | 목적: ${purpose} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 의료·카페·학습·광고 어휘 금지. ${sec.minLength}자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanSnackText(secText, treatmentData, region, situation, purpose, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, menu);

    if (calcCharCount(secText) < 100) {
      console.log(`[snack] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 ${sec.minLength}자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanSnackText(retry, treatmentData, region, situation, purpose, validMode);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, menu);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[snack] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT (맛집 5종 풀: 외관/메뉴판/상차림/장면/마무리) ─────────
  const _SNK_ALT_BY_KEY = {
    // personal 6섹션
    visit:   "외관 사진",
    arrive:  "외관 사진",
    order:   "메뉴판 사진",
    taste:   "상차림 사진",
    scene:   "장면 사진",
    revisit: "마무리 사진",
    // commercial 8섹션 — ★ [v2.1] 사진 다양화(외관→메뉴판→국물→부속→상차림→테이블)
    menuIntro:         "가게 외관 사진",
    menuScene:         "메뉴판 사진",
    menuComposition:   "순대·부속 구성 사진",
    tasteFeature:      "음식 클로즈업 사진",
    pairing:           "반찬·곁들임 사진",
    decision:          "상차림 전체 사진",
    recommendSituation:"테이블 분위기 사진",
    storeFeature:      "매장 내부 사진",
  };
  // commercial은 8섹션, personal은 5장까지 — 섹션 수에 맞춰 alt 생성
  const _altCount = validMode === "commercial" ? Math.min(SECTIONS.length, 6) : 5;
  const altList = SECTIONS.slice(0, _altCount).map(sec => {
    const label = _SNK_ALT_BY_KEY[sec.key] || "메뉴 사진";
    return `[이미지: ${label}]`;
  });
  console.log(`[snack][ALT] mode=${validMode} keys=[${SECTIONS.map(s=>s.key).join(",")}] labels=[${altList.join(" ")}]`);

  // ── 제목 생성 ─────────────────────────
  let title = overrideTitle || buildSnackTitle(treatmentData, region, situation, purpose, seoData, validMode, _titlePurpose ? _titlePurpose.displayPurpose : undefined);
  // 의료·카페 어휘가 제목에 새면 차단
  const TITLE_BLOCK = /시술|치료|성형|진료|병원|카공|콘센트|드립|라떼아트/;
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

  assembled += "\n\n" + buildSnackHashtags(treatmentData, region, situation, purpose, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  // ★ FREEZE 예외 #2 (제목 보존) — restaurant 전용
  //   현상: 최종 clean의 menuMeta 차단(reB: "메뉴명+공백+메뉴")이
  //         제목 "{region} {menu} 메뉴 정리/소개/안내/고민될 때" 의
  //         "{menu} 메뉴"를 "이 한 그릇"으로 치환 → 제목에서 메뉴명 증발
  //   교정: 첫 줄(# 제목)을 분리 보존 → 본문에만 clean → 제목 재결합
  //         제목은 buildSnackTitle 단계에서 이미 menu 포함 보장됨
  {
    const nlIdx = assembled.indexOf("\n");
    const titleLine = nlIdx >= 0 ? assembled.slice(0, nlIdx) : assembled;
    const bodyPart  = nlIdx >= 0 ? assembled.slice(nlIdx) : "";
    let cleanedBody = cleanSnackText(bodyPart, treatmentData, region, situation, purpose, validMode);
    if (validMode === "commercial") {
      cleanedBody = cleanSnackText(cleanedBody, treatmentData, region, situation, purpose, validMode);
    }
    assembled = titleLine + "\n\n" + cleanedBody.replace(/^\n+/, "");
  }

  // ★ 본문 인라인 볼드 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // alt 강제 정규화 — 맛집 5종 풀 (외관/메뉴판/상차림/장면/마무리)
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
  console.log(`[snack] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  // 경고
  if (qc.adPatternCount > 0)
    console.error(`[snack] 🚨 광고 패턴 ${qc.adPatternCount}회 — Phase 9.5 안전핀 위반 (브랜드 톤)`);
  if (qc.medicalLeak > 0)
    console.error(`[snack] 🚨 의료 어휘 침투 ${qc.medicalLeak}회`);
  if (qc.cafeLeak > 0)
    console.error(`[snack] 🚨 카페 어휘 침투 ${qc.cafeLeak}회`);
  if (qc.comboCount > 3)
    console.warn(`[snack] ⚠️ "${region} ${menu}" 결합 ${qc.comboCount}회 (3회 초과 — Phase 9.5 위반)`);
  if (validMode === "personal" && qc.fullKwCount < 2)
    console.warn(`[snack] ⚠️ "${fullKeywordForQC}" 노출 ${qc.fullKwCount}회 — 키워드 밀도 부족`);
  // [Phase 9.5 A안] mealValueCount는 관찰용만 (강제 경고 제거 — 정보 SEO 회귀 차단)
  // → 콘솔 출력 L648에서 이미 노출됨
  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[snack] ⚠️ commercial 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[snack] ⚠️ commercial 가격 ${qc.priceCount}건 잔존`);
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
      cafeLeak:        qc.cafeLeak,
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
