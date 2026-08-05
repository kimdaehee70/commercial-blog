// ============================================================
// generatePediatrics.js — 소아청소년과 전용 블로그 생성기 v2.4
// v2.4 (2026.05.10): 검진·성장 카테고리 타임라인 분리
//   - isCheckup 분기: 영유아 건강검진/발달검사/성조숙증 → "검진 후 관찰 메모" 블록
//   - "처방약 복용 / 열 내림 / 일상 복귀" 차단 → "결과지·성장 곡선 / 식습관 점검 / 다음 검진 일정"
//   - 카테고리 분기 최종: ADHD·발달 / 예방접종 / 검진·성장 / 아토피 / 감염성 / 일반 질병
// v2.3 (2026.05.10): 예방접종 카테고리 타임라인 분리
//   - isVaccine 분기: 질병 회복 템플릿 차단 → "접종 후 관찰 메모" 블록
//   - INFO_BLOCKS BCG "면역 효과 높음" 단정 → "표준 권장 방식"
// v2.2 (2026.05.10): ADHD/발달 카테고리 안전 가드 분리
//   - isAdhdDev 분기: 회복 요약 → 관찰 변화 블록으로 교체
//   - 약효 단정 / 미래·희망 감성 / 권유형 CTA 차단
//   - 시스템 프롬프트에 ADHD/발달 전용 가드 주입
// v2.1 (2026.05.10): restoreKeyword 후처리 깨짐 방지
//   - "소아 장염이 소아과/병원/선생님" 등 변수 치환 오류 차단
//   - 따옴표 키워드 직후 진료명 붙는 패턴 교정
// ⚠️ clinic/dental 등 타 업종 데이터 절대 참조 금지
// ⚠️ 성형/피부/치과 표현 절대 사용 금지
// ⚠️ 보호자(부모) 1인칭 시점 유지 필수
// ============================================================
import { PEDIATRICS_TREATMENTS }               from "../../lib/pediatrics-data";
import {
  buildPediatricsPrompt,
  PEDIATRICS_SYSTEM_PROMPT,   // ★ V2 정보형·비1인칭 시스템 프롬프트 (병원군 One Axis 축)
} from "../../lib/pediatrics-prompts";
import { PEDIATRICS_FLOW_ENGINE }              from "../../lib/pediatrics-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, restoreKeywordV2, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";

// ★ v2.0 — 과별 침투 차단 + 안전 단어 제거 모듈
import { getCrossBlocks } from "../../lib/industryBlocks";
import { safeRemoveWords } from "../../lib/safeRemove";

// ★ PATCH-07 — 위치 공통화(locationBlock) 후단 연결 (SOP v4.2)
//   narrative·prompt·QC 무관. 응답 직전 「📍 찾아오시는 길」 삽입 전용.
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";

// ★ v2.0 — 과별 침투 차단 (lib/industryBlocks.js)
//   다른 과 정체성 키워드 자동 차단 (한 곳 수정 = 16개 파일 동시 적용)
const PEDIATRICS_CROSS_BLOCK = getCrossBlocks("pediatrics");

// ── 소아청소년과 전용 금지 키워드 ────────────────────────
const PEDIATRICS_FORBIDDEN = [
  // 타 업종 침투 방지
  "쌍꺼풀", "눈매교정", "눈밑지방", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "임플란트", "라미네이트", "스케일링", "투명교정", "신경치료",
  "전립선", "포경수술",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 진료", "이 방법",
  // ⚠️ "이 치료가/를/는"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 치료를 통해" → " 통해" / "이 치료의 필요" → 문장 와해
  //    → 본문 정규화 블록(forEach 직후)에서 안전 보정 처리
  // 광고성
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "후회 제로",
  // 성인 중심 표현
  "직장인", "회식", "성인교정",
];

// ── 소아청소년과 전용 제목 생성 ──────────────────────────
function buildPediatricsTitle(treatmentName, region, seoData, blogTypeId) {
  // 1순위: titlePatterns (pediatrics-data.js에서 직접 읽기)
  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    return raw.replace(/\{region\}/g, region);
  }
  // 2순위: 비교형 (정보형)
  if (blogTypeId === "compare") {
    const cw = seoData?.compareWith || "다른 접근";
    return [
      `${region} 소아과 ${treatmentName} vs ${cw}｜함께 고려하는 기준 안내`,
      `${region} ${treatmentName}과(와) ${cw}｜어떤 상황에서 고려되는지 정보`,
    ][Math.floor(Math.random() * 2)];
  }
  // 3순위: 상담형 (정보형)
  if (blogTypeId === "consult") {
    return `${region} 소아과 ${treatmentName}｜진료 진행 방식과 확인 항목 안내`;
  }
  // 4순위: 소아과 전용 default (정보형·비1인칭)
  const defaults = [
    `${region} 소아과 ${treatmentName}｜증상·진료 정보 안내`,
    `${treatmentName}, 어떤 상황에서 고려되나요｜${region} 소아청소년과 정보`,
    `${region} ${treatmentName} 진료 안내｜확인·관리 항목 정리`,
    `${treatmentName} 진료 정보｜${region} 소아청소년과 안내`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── 소아청소년과 전용 해시태그 ───────────────────────────
function buildPediatricsHashtags(treatmentName, region) {
  const kw = treatmentName.replace(/\s/g, "");
  // ★ V2 정보형: 후기 계열 태그(#OO후기·#소아과후기) 제거 — PHILOSOPHY 광고/후기형 배제
  return [
    `#${region}소아과`, `#소아청소년과`, `#${kw}`,
    `#${region}${kw}`, `#아이건강`, `#소아과정보`,
    `#육아정보`, `#${region}소아청소년과`,
  ].slice(0, 10).join(" ");
}

// ── 소아청소년과 전용 본문 정제 ──────────────────────────
function cleanPediatricsText(text, treatmentName) {
  let result = text;

  // ★ v2.2: ADHD/발달 카테고리 판별 (의료광고법·정신건강 민감 영역)
  const isAdhdDev = /ADHD|발달장애|발달지연|틱|자폐|주의력|과잉행동/.test(treatmentName || "");

  // 금지 키워드 제거 — 🛡️ v2.0 safeRemoveWords + CROSS_BLOCK
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전 forEach replace는 "시술하는" → " 하는" 사고 유발
  const removeList = [...PEDIATRICS_FORBIDDEN, ...PEDIATRICS_CROSS_BLOCK];
  result = safeRemoveWords(result, removeList);

  // ─────────────────────────────────────────────────────
  // [본문 정규화] FORBIDDEN 목록에서 제거된 "이 치료가/를/는" 보정
  //   - 본문에 GPT가 직접 출력한 "이 치료를 통해" 같은 표현은 자연스럽게 둠
  //   - 단, 조사 깨짐 패턴(아래 참조)만 안전하게 보정
  //   ⚠️ 이 블록 제거 금지 — FORBIDDEN_BASE에서 조사어 빠진 이유와 짝
  // ─────────────────────────────────────────────────────
  result = result
    // "이 치료은" (잘못된 조사) → "이 치료는"
    .replace(/이\s*치료은/g, "이 치료는")
    // 단독 " 통해" (앞에 공백, 문장 시작) — "이 치료를" 또는 비슷한 주어가 사라진 경우 복구
    .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 치료를 통해 ")
    // "이 치료의 필요/진행/시작/결정/중요" — 잘못된 조사
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)합니다/g, "이 치료가 $1합니다")
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)해요/g,   "이 치료가 $1해요")
    // 이중 "통해 통해"
    .replace(/통해\s+통해/g, "통해")
    // ── 톤 약화 (병원 안전·정보형 표현으로) ──
    .replace(/추천드리고 싶어요/g,  "고려됩니다")
    .replace(/추천드립니다/g,        "고려됩니다")
    .replace(/적극 추천/g,           "고려 대상")
    .replace(/강력 추천/g,           "고려 대상")
    .replace(/적절하게 짧아서/g,     "짧아서")
    .replace(/적절하게 길어서/g,     "여유 있게")
    // 두 문장 합쳐진 어색한 패턴
    .replace(/고려해보는 것도\s+덕분에/g, "고려됩니다. ")
    .replace(/고려하는 것도\s+덕분에/g,   "고려됩니다. ");

  // 진료명 직접 조사 연결 오류 패턴 교정 (버그 #3 방지)
  if (treatmentName) {
    const tn = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 진료명+조사 직접 연결 — 전체 조사 패턴 강제 교정
    const joinPatterns = [
      [`${tn}이\s+소아`, "소아"],
      [`${tn}이\s+진단`, "진단"],
      [`${tn}이\s+나`, "증상이 나"],
      [`${tn}이\s+있`, "증상이 있"],
      [`${tn}이\s+생`, "증상이 생"],
      [`${tn}이\s+심`, "증상이 심"],
      [`${tn}이\s+걱`, "걱"],
      [`${tn}을\s+치료`, "치료를"],
      [`${tn}을\s+받`, "치료를 받"],
      [`${tn}으로\s+진단`, "으로 진단"],
      [`${tn}가\s+나`, "증상이 나"],
      [`${tn}가\s+소아`, "소아"],
      [`${tn}에\s+걸`, "에 걸"],
      [`${tn}\s*\.\s*라는`, "이라는"],
      [`${tn}이\s+수치`, "수치"],
      [`${tn}이\s+치료에`, "이 치료에"],
      [`${tn}이\s+검사`, "검사"],
      [`${tn}이\s+약`, "약이"],
      [`${tn}이\s+처방`, "처방이"],
      // ★ v2.1 패치: restoreKeyword 후처리 깨짐 방지 ──────────────
      [`${tn}이\s+소아과`, "소아과"],          // "소아 장염이 소아과" → "소아과"
      [`${tn}이\s+소아청소년과`, "소아청소년과"],
      [`${tn}이\s+병원`, "이 병원"],            // "소아 장염이 병원은" → "이 병원은"
      [`${tn}이\s+의원`, "이 의원"],
      [`${tn}이\s+선생님`, "선생님"],
      [`${tn}을\s+선택`, "이 병원을 선택"],     // "소아 장염을 선택" 방지
      [`${tn}를\s+선택`, "이 병원을 선택"],
      // 따옴표 키워드 직후 진료명 붙는 패턴: "강남 소아과"소아 장염를 → "강남 소아과 소아 장염"을
      [`"\\s*${tn}를`, `${tn}"을`],
      [`"\\s*${tn}을`, `${tn}"을`],
      [`"\\s*${tn}\\s+`, `${tn}" `],
    ];
    joinPatterns.forEach(([pat, rep]) => {
      try { result = result.replace(new RegExp(pat, "g"), rep); } catch(e) {}
    });
  }

  // 조사 오류 교정
  result = result
    .replace(/장염를/g, "장염을")
    .replace(/접종를/g, "접종을")
    .replace(/검진를/g, "검진을")
    .replace(/빈혈를/g, "빈혈을")
    .replace(/변비를/g, "변비를")
    .replace(/천식를/g, "천식을");

  // 동일 키워드 3회 초과 반복 → 마지막 등장은 "증상" or "이 상황"으로 교체
  if (treatmentName && treatmentName.length > 1) {
    const tnRaw = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = result.match(new RegExp(tnRaw, "g")) || [];
    if (matches.length > 3) {
      let count = 0;
      result = result.replace(new RegExp(tnRaw, "g"), (m) => {
        count++;
        return count > 3 ? "이 증상" : m;
      });
    }
  }

  // 문장 끊김 패턴 교정 (버그 #2) — ★ V2 정보형: 후기형 인용("하셨어요") 마감 제거, 열린 따옴표는 중립 제거
  result = result
    .replace(/\u201c|\u201d|\u2018|\u2019/g, '"')
    .replace(/([\uAC00-\uD7A3])\s*"\s*\n/g, '$1\n')
    .replace(/([\uAC00-\uD7A3])\s*"\s*$/gm, '$1')
    .replace(/하는 것이\s*"\s*$/gm, '하는 것이 확인됩니다');

  // ★ V2 정보형: 후기형/감성 표현 잔재 → 중립 정보형으로 치환
  result = result
    .replace(/드디어 결심하고/g, "")
    .replace(/결국 선택하게 되었어요/g, "고려됩니다")
    .replace(/마음이 편안해졌어요/g, "안정적으로 관리됩니다")
    .replace(/믿음이 갔어요/g, "")
    .replace(/친절하고 전문적이셔서/g, "");

  // 공백 오류 교정
  result = result
    .replace(/를  /g, "를 ")
    .replace(/을  /g, "을 ")
    .replace(/받고나면/g, "받고 나면")
    .replace(/가고나서/g, "가고 나서");

  // ★ v2.3: 예방접종 단정 표현 약화 (의료 단정 회피)
  result = result
    .replace(/면역\s*효과가\s*더\s*높다/g, "표준 권장 방식이라")
    .replace(/면역\s*효과\s*더\s*높/g, "표준 권장 방식이")
    .replace(/면역\s*효과가\s*높다고\s*해서/g, "표준 권장 방식이라고 해서")
    .replace(/면역\s*효과\s*높음/g, "표준 권장 방식");

  // ★ v2.2→V2: ADHD/발달 카테고리 전용 후처리 (정보형·비1인칭) ───────
  if (isAdhdDev) {
    result = result
      // 약효 단정 약화 (정보형)
      .replace(/메틸페니데이트\s*약물의\s*효과가\s*눈에\s*띄었어요/g, "약물 반응은 전문의 관찰로 확인됩니다")
      .replace(/메틸페니데이트\s*효과가\s*눈에\s*띄었어요/g, "약물 반응은 전문의 관찰로 확인됩니다")
      .replace(/약물의\s*효과가\s*눈에\s*띄었어요/g, "약물 반응은 전문의 관찰로 확인됩니다")
      .replace(/효과가\s*눈에\s*띄었어요/g, "변화는 관찰을 통해 확인됩니다")
      .replace(/효과가\s*나타나기\s*시작했어요/g, "변화는 관찰을 통해 확인됩니다")
      .replace(/행동치료\s*효과가\s*나타나/g, "행동치료 후 변화는 관찰으로 확인되")
      .replace(/약\s*복용한\s*지\s*3일째\s*되던\s*날부터는/g, "약물 반응 시점은 개인차가 있으며")
      .replace(/즉각적인\s*효과/g, "초기 변화")
      .replace(/극적인\s*변화/g, "점진적 변화")
      // 미래/희망 감성 차단 (정보형)
      .replace(/아이의\s*미래가\s*더\s*밝게\s*느껴져요/g, "경과는 관찰을 통해 확인됩니다")
      .replace(/아이의\s*밝은\s*미래/g, "아이의 일상")
      .replace(/밝은\s*미래/g, "이후 일상")
      .replace(/작은\s*변화가\s*큰\s*차이를\s*만들/g, "작은 변화도 관찰 대상이 되")
      .replace(/긍정적으로\s*바라볼\s*수\s*있게\s*되었어요/g, "관찰을 통해 확인됩니다")
      .replace(/좋은\s*선택이었음을\s*확신/g, "진료 필요 여부는 상담에서 확인")
      .replace(/확신하게\s*되었어요/g, "확인됩니다")
      // 권유·CTA 약화 (정보형)
      .replace(/꼭\s*한\s*번\s*소아과\s*상담을\s*받아보세요/g, "전문 평가를 고려할 수 있습니다")
      .replace(/꼭\s*방문해\s*보시길\s*권해요/g, "전문 평가를 고려할 수 있습니다")
      .replace(/방문해\s*보시길\s*권해요/g, "전문 평가를 고려할 수 있습니다")
      .replace(/가장\s*빠른\s*길이에요/g, "한 가지 확인 방법입니다")
      .replace(/전문\s*진료가\s*큰\s*도움이\s*될\s*수\s*있어요/g, "전문의 진료에서 확인됩니다")
      .replace(/전문가\s*상담이\s*큰\s*도움이\s*됩니다/g, "전문의 진료에서 확인됩니다")
      // 단정형·감성 잔재 약화 (정보형)
      .replace(/뿌듯해하는\s*모습을\s*보니\s*정말\s*대견했어요/g, "스스로 마무리하는 모습이 관찰됩니다")
      .replace(/대견했어요/g, "관찰됩니다")
      .replace(/정말\s*기뻤답니다/g, "확인됩니다")
      .replace(/정말\s*기뻤어요/g, "확인됩니다");
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

// ── 정보 블럭 강제 삽입 (reason 섹션에 추가) ────────────────
const PEDIATRICS_INFO_BLOCKS = {
  "소아 폐렴·기관지염": {
    title: "폐렴 vs 기관지염, 어떻게 다른가요?",
    items: ["기관지염: 기도 염증, 쌕쌕거림·기침 중심, 대부분 바이러스성", "폐렴: 폐 실질 감염, 고열·호흡 곤란 동반, 세균성이면 항생제 필요"],
    warning: "숨 쉴 때 갈비뼈 사이가 쑥 들어가거나 산소포화도 95% 미만이면 즉시 소아과로",
  },
  "고열·열성경련": {
    title: "열이 나면 바로 응급실? 기준이 뭔가요?",
    items: ["소아과 기준: 38.5도 이상 + 24시간 이상 or 해열제 효과 없음", "응급실 기준: 경련 5분 이상 / 생후 3개월 미만 38도 이상 / 의식 저하"],
    warning: "경련이 5분 이상 멈추지 않거나 생후 3개월 미만 고열은 즉시 응급실",
  },
  "소아 장염": {
    title: "장염 종류에 따라 대처가 달라요",
    items: ["바이러스성(노로·로타): 항생제 불필요, 수분·전해질 보충이 핵심", "세균성: 혈변·고열 동반, 항생제 처방 필요할 수 있음"],
    warning: "8시간 이상 소변 없거나 울어도 눈물 안 나면 탈수 위험 — 즉시 소아과",
  },
  "소아 중이염": {
    title: "중이염, 항생제 꼭 먹여야 하나요?",
    items: ["급성 중이염: 세균성이면 항생제 5~10일 처방", "삼출성 중이염: 물만 찬 상태 → 3개월 경과 관찰 후 결정"],
    warning: "귀를 자꾸 잡아당기거나 부를 때 잘 못 들으면 중이염 의심",
  },
  "소아 아토피": {
    title: "스테로이드 연고, 얼마나 써야 할까요?",
    items: ["약한 스테로이드: 얼굴·접힌 부위 적용", "보습제 하루 2회 이상이 기본 — 스테로이드는 증상 있을 때만 단기 사용"],
    warning: "밤새 긁어 상처·진물이 생기거나 2주 이상 연고 효과 없으면 재진료",
  },
  "영유아 건강검진": {
    title: "영유아 건강검진, 어떤 항목을 보나요?",
    items: ["신체 계측: 키·몸무게·머리 둘레 → 성장 곡선 대조", "발달 평가: 대근육·소근육·언어·사회성 4개 영역"],
    warning: "18개월에 단어 5개 못 하거나 24개월에 두 단어 조합 안 되면 발달 지연 상담 권장",
  },
  "수족구·수두": {
    title: "수족구 vs 수두, 어떻게 구별하나요?",
    items: ["수족구: 손·발·입 안에 수포, 어린이집 집단 유행", "수두: 온몸에 수포·딱지 혼재, 더 가렵고 예방접종 미접종 시 발생"],
    warning: "40도 이상 고열 이틀 이상 or 먹지도 마시지도 않으면 즉시 소아과",
  },
  "소아 천식·알레르기": {
    title: "소아 천식 vs 단순 기침, 어떻게 달라요?",
    items: ["단순 기침: 감기 후 1~2주, 열 동반, 쉬면 호전", "천식: 운동·새벽·찬 공기에 악화, 쌕쌕거림 반복"],
    warning: "흡입기 써도 30분 내 호전 없거나 입술이 파랗게 변하면 즉시 응급실",
  },
  "소아 ADHD·발달장애": {
    title: "ADHD vs 단순 산만함, 어떻게 구별하나요?",
    items: ["ADHD: 6개월 이상, 가정+학교 두 곳에서 동일 증상, 일상 기능 저하", "단순 산만: 특정 상황에서만, 흥미 있는 것엔 집중 가능"],
    warning: "착석 상황에서 자리 이탈이 반복되거나 지시를 끝까지 못 따르면 전문 검사 권장",
  },
  "신생아·영아 진료": {
    title: "황달 수치, 어느 정도면 치료가 필요한가요?",
    items: ["생리적 황달: 생후 2~3일 발생, 2주 내 자연 소실", "병적 황달: 24시간 이내 발생 or 수치 15 이상 → 광선치료"],
    warning: "귀 교정은 생후 6주 이후 효과 급감 — 빠를수록 좋아요",
  },
  "성조숙증": {
    title: "성조숙증, 소아과 vs 한의원 어디로 가야 하나요?",
    items: ["소아과(소아내분비): 골연령 X-ray + 호르몬 검사로 정확한 진단, 억제제 처방 가능", "한의원: 진단 검사 불가, 생활 관리 보조만 가능"],
    warning: "여아 만 8세 이전 가슴 멍울이 잡히면 바로 소아과 방문 권장",
  },
  "소아 변비": {
    title: "변비, 유산균만으로 안 되는 이유",
    items: ["기능성 변비: 식이·수분 부족 → 유산균·식이섬유 먼저", "기질성 변비: 원인 질환 → 처방 변완화제 + 원인 치료 필요"],
    warning: "주 2회 이하 대변에 출혈 동반하거나 배변 공포증이 생기면 소아과 처방 권장",
  },
  "소아 빈혈": {
    title: "소아 빈혈, 어떤 검사로 확인하나요?",
    items: ["혈액검사(CBC): 헤모글로빈·적혈구 크기 → 철 결핍 선별", "혈청 페리틴: 철 저장량 직접 확인 — CBC 정상이어도 페리틴 낮으면 초기 철 결핍"],
    warning: "얼굴·결막이 창백하고 쉽게 지치는 아이는 혈액검사 먼저 받아보세요",
  },
  "영유아 예방접종": {
    title: "BCG 피내용 vs 경피용, 뭐가 다른가요?",
    items: ["피내용: 소아청소년과·결핵협회 시행, 흉터 1개, 표준 권장 방식", "경피용: 일부 병원, 9개 흉터, 보험 미적용"],
    warning: "접종 후 15분 이내 두드러기·호흡 곤란 시 즉시 병원 신고",
  },
  "독감예방접종": {
    title: "독감 예방접종, 맞아도 독감 걸릴 수 있나요?",
    items: ["예방 목적: 중증화·합병증 예방이 핵심 (완벽 차단 아님)", "초접종(만 9세 미만 첫 접종): 4주 간격으로 2회 필수"],
    warning: "접종 후 38.5도 이상 고열이 48시간 이상 지속되면 소아과 재방문",
  },
};

// 진료별 기본 검사 수치 (AI가 수치를 안 쓸 경우 강제 삽입)
const PEDIATRICS_EXAM_VALUES = {
  "소아 폐렴·기관지염": ["산소포화도 97%", "흉부 X-ray상 폐 우하엽에 음영", "CRP 수치 2.3"],
  "고열·열성경련":       ["체온 39.2도", "해열제 복용 후 38.1도로 하강", "혈액검사상 WBC 12,000"],
  "소아 장염":           ["전해질 수치 정상", "체중 감소 300g", "수액 500mL 투여"],
  "소아 중이염":         ["이경 검사상 좌측 고막 충혈 확인", "고막 운동성 저하", "체온 38.3도"],
  "소아 아토피":         ["SCORAD 점수 32점(중등도)", "혈청 IgE 450 IU/mL", "긁은 부위 진물"],
  "영유아 건강검진":     ["키 성장 곡선 50퍼센타일", "발달 평가 K-DST 정상 범위", "체중 11.2kg"],
  "수족구·수두":         ["체온 38.7도", "손발 수포 총 12개 확인", "구강 내 궤양 3개소"],
  "소아 천식·알레르기":  ["폐기능 FEV1 78% (경증 감소)", "산소포화도 99%", "알레르기 혈액검사 집먼지진드기 양성"],
  "소아 ADHD·발달장애":  ["K-ARS 점수 22점(임상적 의미 있음)", "주의력 지속 시간 4분", "K-CBCL 주의문제 임계치 이상"],
  "신생아·영아 진료":    ["경피적 빌리루빈 12.8 mg/dL", "체중 3.4kg", "산소포화도 98%"],
  "성조숙증":            ["골연령 8.5세 (실제 나이 6.5세 대비 약 2년 앞섬)", "LH 기저치 0.6 IU/L", "자궁 길이 35mm"],
  "소아 변비":           ["복부 X-ray상 횡행결장 대변 축적", "배변 횟수 주 1~2회", "항문 균열 1곳"],
  "소아 빈혈":           ["헤모글로빈 10.2 g/dL(정상 하한 11.0)", "혈청 페리틴 8 ng/mL", "MCV 72 fL(소구성)"],
  "영유아 예방접종":     ["접종 부위 발적 직경 2cm", "접종 후 체온 37.8도", "15분 대기 후 이상 반응 없음"],
  "독감예방접종":        ["접종 부위 부종 없음", "접종 후 체온 37.2도", "15분 대기 후 정상 반응"],
};

function insertInfoBlock(text, treatmentName) {
  const block = PEDIATRICS_INFO_BLOCKS[treatmentName];
  if (!block) return text;

  // 이미 정보 블럭이 있으면 스킵
  if (text.includes(block.title) || text.includes("vs") && text.includes("어떻게")) return text;

  const blockText = "\n\n**" + block.title + "**\n"
    + block.items.map(i => "- " + i).join("\n")
    + "\n\n> ⚠️ " + block.warning;
  return text.trimEnd() + blockText;
}

function injectExamValue(text, treatmentName) {
  const values = PEDIATRICS_EXAM_VALUES[treatmentName];
  if (!values) return text;

  // 이미 수치가 있으면 스킵 (숫자+단위 패턴)
  if (/\d+(\.\d+)?\s*(도|%|g\/dL|mg\/dL|점|kg|mm|mL|IU)/.test(text)) return text;

  // 수치 없으면 consult 섹션(세 번째 이미지 태그 직전)에 삽입
  const examNote = "\n\n(검사 결과: " + values[0] + ", " + (values[1] || "") + ")";
  // 첫 번째 이미지 태그 앞에 삽입
  if (text.includes("[이미지:")) {
    return text.replace(/(\[이미지:[^\]]+\])/, examNote + "\n\n$1");
  }
  return text + examNote;
}

// ── 회복 타임라인 자동 삽입 ──────────────────────────────
function insertPediatricsTimeline(text, treatmentName) {
  const hasTimeline = /일차|일째|주일|개월|D\+/.test(text);
  if (!hasTimeline) return text;

  // ★ v2.2: ADHD/발달 카테고리는 회복 템플릿 차단 → 관찰 변화 블록으로 교체
  const isAdhdDev = /ADHD|발달장애|발달지연|틱|자폐|주의력|과잉행동/.test(treatmentName || "");
  if (isAdhdDev) {
    const observeBlock = `\n\n**관찰·확인 흐름 안내**\n- 진료 직후: 검사 결과 확인 및 일상 점검\n- 1~2주차: 가정·기관에서의 행동 관찰\n- 1개월차: 환경 조정과 약물 여부를 전문의와 확인\n- 이후: 지속 진료를 통한 변화 점검\n\n※ 변화 양상은 아이마다 개인차가 있으며, 일반적 효과를 보장하지 않습니다.`;
    return text.trimEnd() + observeBlock;
  }

  // ★ v2.3: 예방접종 카테고리는 질병 회복 템플릿 차단 → 접종 후 관찰 흐름으로 교체
  const isVaccine = /예방접종|독감예방접종|영유아 예방접종|BCG|접종/.test(treatmentName || "");
  if (isVaccine) {
    const vaccineBlock = `\n\n**아이 접종 후 관찰 메모**\n- 당일~1일차: 접종 부위 미열·붓기 관찰, 컨디션 점검\n- 2~3일차: 부위 통증·불편감 완화, 평소 수유·식사 회복\n- 1주차: 접종 부위 정상화, 일상 활동 그대로\n- 2주차 이후: 다음 접종 일정 확인 및 컨디션 유지`;
    return text.trimEnd() + vaccineBlock;
  }

  // ★ v2.4: 검진·성장 카테고리는 질병 회복 템플릿 차단 → 검진 후 관찰 흐름으로 교체
  const isCheckup = /건강검진|영유아 건강검진|영유아건강검진|발달검사|성장검사|성조숙증|성장 추적/.test(treatmentName || "");
  if (isCheckup) {
    const checkupBlock = `\n\n**아이 검진 후 관찰 메모**\n- 검진 직후: 결과지·성장 곡선 확인, 궁금한 항목 메모\n- 1주차: 식습관·수면 등 생활 패턴 점검\n- 2~4주차: 언어·놀이·또래 상호작용 등 일상 변화 관찰\n- 다음 검진 시점: 권장 월령 기준으로 일정 미리 확인`;
    return text.trimEnd() + checkupBlock;
  }

  const isAtopy       = /아토피/.test(treatmentName);
  const isInfectious  = /수족구|수두/.test(treatmentName);

  const w1Note = isAtopy      ? "보습 루틴 정착, 야간 긁음 감소"
               : isInfectious ? "물집 딱지 형성, 격리 해제 검토"
               : "증상 대부분 소실, 식욕·활력 회복";

  const timeline = `\n\n**아이 회복 요약**\n- 당일~1일차: 증상 가장 심함, 처방약 복용 시작\n- 2~3일차: 열 내림·식욕 조금씩 회복\n- 1주일차: ${w1Note}\n- 2주일차: 일상 완전 복귀`;
  return text.trimEnd() + timeline;
}

// ── 추천 대상 자동 삽입 ──────────────────────────────────
const PEDIATRICS_REC_MAP = {
  "독감예방접종":   ["생후 6개월 이상 영유아", "어린이집·유치원에 다니는 아이"],
  "소아 장염":      ["구토·설사가 하루 이상 지속되는 아이", "탈수 증상이 의심되는 경우"],
  "고열·열성경련":  ["38.5도 이상 고열이 24시간 이상 지속되는 아이", "열성경련 병력이 있는 경우"],
  "소아 폐렴·기관지염": ["2주 이상 기침이 지속되는 아이", "호흡 시 쌕쌕거림이 있는 경우"],
  "소아 중이염":    ["귀를 자주 만지거나 잡아당기는 아이", "중이염이 반복되는 경우"],
  "소아 아토피":    ["생후 2개월 이상 피부 발진·가려움이 있는 아이", "스테로이드 관리 방법을 체계적으로 알고 싶은 경우"],
  "영유아 건강검진": ["국가 영유아 건강검진 대상 월령 아이", "발달 지연이 걱정되는 경우"],
  "수족구·수두":    ["어린이집·유치원에 다니는 영유아", "형제자매 간 감염 전파가 걱정되는 경우"],
  "소아 천식·알레르기": ["운동 후 기침·쌕쌕거림이 반복되는 아이", "가족 중 천식 병력이 있는 경우"],
  "소아 ADHD·발달장애": ["주의력 부족·과잉행동이 6개월 이상 지속되는 아이", "어린이집·학교에서 산만하다는 지적을 반복적으로 받는 경우"],
  "신생아·영아 진료": ["생후 2~3일 이후 황달 증상이 있는 신생아", "귀 모양 교정이 필요한 생후 6주 이내 신생아"],
  "성조숙증": ["여아 만 8세·남아 만 9세 이전 2차 성징이 시작되는 경우", "또래보다 키가 매우 빠르게 자라는 경우"],
  "소아 변비": ["주 2회 이하 대변으로 통증을 호소하는 아이", "배변 공포증이 생겨 변 보기를 거부하는 경우"],
  "소아 빈혈": ["얼굴·잇몸이 창백하고 쉽게 피로해하는 아이", "혈액검사에서 헤모글로빈 수치가 낮게 나온 경우"],
  "영유아 예방접종": ["생후 2개월 이상 영아", "BCG 피내용 접종을 계획 중인 초보 부모"],
};

// ============================================================
// [v2] 네이버 본문용 마크다운 strip — text 필드 전용
// textMarkdown 필드는 원본 마크다운 보존, text 필드는 strip 적용
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
export default async function handlePediatrics(req, res) {
  const {
    target, program, blogType, userRegion, userMemo, overrideTitle,
    // ★ PATCH-07 위치 5필드 (발행코치=값 존재 / 일반글쓰기=빈값 → 부작용 0)
    address, map_guide, transit, building_desc, parking_info,
  } = req.body;
  const _locStore = { address, map_guide, transit, building_desc, parking_info };

  // ── 소아청소년과 전용: 진료명 강제 검증 ─────────────────
  const subKw      = program.name || "";
  const region     = (userRegion || "강남").trim();
  const memo       = (userMemo || "").trim();
  const targetId   = target?.id   || "consult";
  const blogTypeId = blogType?.id || "review";
  const industry   = "pediatrics"; // 절대 고정 — 변경 금지

  // 소아청소년과 진료인지 검증
  // ★ data.js(PEDIATRICS_TREATMENTS) 22건과 완전 동기화 — 신규 진료 400 차단 방지
  const PEDIATRICS_IDS = [
    "flu", "gastroenteritis", "fever", "pneumonia",
    "otitis", "atopy", "growth", "infectious", "asthma",
    "adhd", "newborn", "precocious_puberty", "constipation", "anemia", "vaccination",
    "rhinitis", "stomatitis", "enuresis", "growth_hormone", "bronchiolitis",
    "conjunctivitis", "obesity",
  ];
  const PEDIATRICS_NAMES = [
    "독감예방접종", "소아 장염", "고열·열성경련", "소아 폐렴·기관지염",
    "소아 중이염", "소아 아토피", "영유아 건강검진", "수족구·수두", "소아 천식·알레르기",
    "소아 ADHD·발달장애", "신생아·영아 진료", "성조숙증", "소아 변비", "소아 빈혈", "영유아 예방접종",
    "소아 비염·축농증", "구내염·헤르판지나", "소아 야뇨증", "소아 키성장클리닉", "모세기관지염·RSV",
    "소아 결막염·다래끼", "소아 비만관리",
  ];
  const isPediatricsTreatment =
    PEDIATRICS_IDS.includes(program.id) || PEDIATRICS_NAMES.includes(subKw);

  if (!isPediatricsTreatment) {
    console.error(`[pediatrics] 잘못된 진료 진입 차단: ${subKw} (${program.id})`);
    return res.status(400).json({
      error: `소아청소년과 생성기에 잘못된 진료가 전달되었습니다: ${subKw}`,
    });
  }
  console.log(`[pediatrics] 진료 검증 통과: ${subKw}`);

  // ── 진료 데이터 로드 ─────────────────────────────────────
  const treatmentData =
    PEDIATRICS_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || PEDIATRICS_TREATMENTS[0];

  // {region} 치환
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 ──────────────────────────────────────
  // ★ v2.2: ADHD/발달 카테고리 전용 가드 (의료광고법·정신건강 민감)
  const isAdhdDevTop = /ADHD|발달장애|발달지연|틱|자폐|주의력|과잉행동/.test(subKw || "");
  // ★ V2: 정보형·비1인칭 정합. 약효/미래 단정만 추가 억제 (1인칭 한정표현 제거)
  const adhdGuide = isAdhdDevTop ? `

[★ ADHD·발달 카테고리 안전 가드 — 절대 준수 (정보형)]
- "효과가 눈에 띄었다", "극적인 변화", "즉각적인 효과" 등 약효 단정 표현 금지
- 약물명+효과 직접 결합 금지 → "약물 반응은 전문의 관찰로 확인됩니다" 수준으로
- "아이의 미래가 밝아진다", "큰 차이를 만든다" 등 미래·희망 단정 금지
- 권유형 CTA 금지 → "전문 평가를 고려할 수 있습니다" 수준
- 진단·치료 효과를 일반화하지 말 것 — 경과는 아이마다 개인차가 있음을 안내
- 약물 복용 시기·용량 구체 명시 금지 → 전문의 진료 안내로만 표현
- 회복·완치 표현 금지 → "관찰·확인" 수준 표현 사용` : "";

  // ★ V2 정보형 시스템 프롬프트 (병원군 One Axis 축) + 민감군 안전 가드
  const systemPrompt = PEDIATRICS_SYSTEM_PROMPT + adhdGuide;

  // ── 섹션별 순차 생성 ─────────────────────────────────────
  const SECTIONS = PEDIATRICS_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = buildPediatricsPrompt(sec.key, treatmentData, region);
    const prevBlock  = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 아래와 같은 장면·표현 절대 반복 금지]\n${prevTextRaw}\n[끝]\n`
      : "";

    const userPrompt = `업종: pediatrics | 키워드: ${subKw} | 지역: ${region}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 성형외과·피부과·치과 표현 절대 금지. 반드시 200자 이상.
⚠️ 정보 안내형·비1인칭. "저는/제가/저희 아이/우리 아이" 및 "~했어요/~더라고요" 후기 톤 금지.
아이 증상·상황을 일반 정보로 설명할 것 (특정 아이 사연 아님).
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanPediatricsText(secText, subKw);
    secText = stripInlineImages(secText);
    secText = restoreKeywordV2(secText, subKw);    // ★ V2 정보형: 지시관형사·보다 오탐 차단 (병원군 One Axis)
    secText = cleanPediatricsText(secText, subKw); // 재정제 (V2 후 잔여 보정)

    // 빈 섹션 재생성
    if (calcCharCount(secText) < 100) {
      console.log(`[pediatrics] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성하세요.`,
        temperature: 0.72,
      });
      retry = cleanPediatricsText(retry, subKw);
      retry = stripInlineImages(retry);
      retry = restoreKeywordV2(retry, subKw);    // ★ V2 정보형
      retry = cleanPediatricsText(retry, subKw); // 재정제
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[pediatrics] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT 생성 ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 진료 / 상담 / 치료 / 처방 / 일상
  const PEDIATRICS_ALT_POOL = ["진료 사진", "상담 사진", "치료 사진", "처방 사진", "일상 사진"];
  const _PED_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "진료 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "치료 사진",
    result:   "처방 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _PED_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (소아청소년과 전용) ────────────────────────
  let title = overrideTitle || buildPediatricsTitle(subKw, region, seoData, blogTypeId);

  // ── 제목 오염 검증 ───────────────────────────────────────
  const PEDIATRICS_TITLE_BLOCK =
    /쌍꺼풀|눈매|리프팅|울쎄라|써마지|필러|보톡스|피코레이저|성형외과|임플란트|스케일링/;
  if (PEDIATRICS_TITLE_BLOCK.test(title)) {
    console.log(`[pediatrics] 제목 오염 감지 → 교체: "${title}"`);
    title = `${region} 소아과 ${subKw}｜증상·진료 정보 안내`;
  }
  if (!title.includes(subKw) && !title.includes("소아")) {
    console.log(`[pediatrics] 제목 싱크 실패 → 교체`);
    title = `${region} 소아과 ${subKw} 진료 안내｜확인·관리 항목 정리`;
  }

  // ── 조립 ─────────────────────────────────────────────────
  const secKeys = SECTIONS.map(s => s.key);

  // result 섹션 타임라인 삽입
  if (sectionTexts["result"]) {
    sectionTexts["result"] = insertPediatricsTimeline(sectionTexts["result"], subKw);
  }

  // ── 정보 블럭 강제 삽입 (reason 섹션) ────────────────────
  if (sectionTexts["reason"]) {
    sectionTexts["reason"] = insertInfoBlock(sectionTexts["reason"], subKw);
    console.log(`[pediatrics] 정보 블럭 삽입 완료: ${subKw}`);
  }

  // ── 검사 수치 강제 삽입 (consult 섹션 — 수치 없을 때만) ──
  if (sectionTexts["consult"]) {
    sectionTexts["consult"] = injectExamValue(sectionTexts["consult"], subKw);
    console.log(`[pediatrics] 수치 삽입 체크 완료: ${subKw}`);
  }

  // 마지막 섹션 추천 대상 삽입
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    // ★ v2.2: ADHD/발달 카테고리는 권유형 CTA 제거 + 톤 변경
    const isAdhdDev = /ADHD|발달장애|발달지연|틱|자폐|주의력|과잉행동/.test(subKw || "");
    const recList = PEDIATRICS_REC_MAP[subKw] || [];

    if (isAdhdDev) {
      const recBlock = recList.length > 0
        ? `\n\n**전문 평가가 고려되는 경우**\n${recList.map(r => `- ${r}`).join("\n")}`
        : "";
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + recBlock
        + "\n\n경과는 아이마다 개인차가 있으며, 정확한 평가 필요 여부는 전문의 진료에서 안내됩니다.";
    } else {
      const recBlock = recList.length > 0
        ? `\n\n**소아과 확인이 권장되는 경우**\n${recList.map(r => `- ${r}`).join("\n")}`
        : "";
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + recBlock
        + "\n\n증상·상황에 따라 진료 범위가 달라지므로, 정확한 확인은 소아청소년과 진료에서 안내됩니다.";
    }
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

  const tags = buildPediatricsHashtags(subKw, region);
  assembled += "\n\n" + tags;

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 진료 / 상담 / 치료 / 처방 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(진료|상담|치료|처방|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/처방|약물|복용|투약|약제|시럽/.test(s))             return "[이미지: 처방 사진]";
    if (/치료|시술|네뷸라이저|주사|수액/.test(s))            return "[이미지: 치료 사진]";
    if (/진료|검사|청진|문진|x.?ray|영상|진단/i.test(s))     return "[이미지: 진료 사진]";
    if (/상담|설명|차트|원장|의사|소아과/.test(s))          return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(진료|상담|치료|처방|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ★ PATCH-07 — 위치블록 후단 삽입 (해시태그 직전 「📍 찾아오시는 길」)
  //   발행코치: 위치 5필드 존재 → 삽입 / 일반글쓰기: 빈값 → 원문 그대로(부작용 0)
  //   해시태그를 떼어 [본문 + 위치블록 + 해시태그] 재조립 (daycare/dental/restaurant/bedding 동형)
  //   삽입 이후에 charCount·seoScore·autoSave 산출 → 저장·채점 대상에 위치블록 포함
  assembled = insertLocationBeforeHashtags(assembled, _locStore);

  const charCount = calcCharCount(assembled);
  const seoScore  = diagnosePost(assembled, subKw);

  // QC 검증 로그
  const hasInfoBlock  = /vs|어떻게 다른가요|어떻게 달라요|어떻게 구별/.test(assembled);
  const hasExamValue  = /\d+(\.\d+)?\s*(도|%|g\/dL|mg\/dL|점|kg|mm|mL)/.test(assembled);
  const repeatCount   = (assembled.match(new RegExp(subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  console.log(`[pediatrics] 완료: ${charCount}자 / SEO ${seoScore}점`);
  console.log(`[pediatrics] QC — 정보블럭: ${hasInfoBlock} / 수치: ${hasExamValue} / 키워드반복: ${repeatCount}회`);
  if (!hasInfoBlock) console.warn(`[pediatrics] ⚠️ 정보 블럭 미삽입 — 수동 확인 필요`);
  if (!hasExamValue) console.warn(`[pediatrics] ⚠️ 검사 수치 미포함 — 수동 확인 필요`);
  if (repeatCount > 5) console.warn(`[pediatrics] ⚠️ 키워드 ${repeatCount}회 반복 — cleanText 재확인`);

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry });

  // ── 이미지 메타 ─────────────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#")
    ? lastLine.split(/\s+/).filter(t => t.startsWith("#"))
    : [];

  // ── [v2] 네이버 본문용 strip + dual 필드 ───────────
  const assembledMarkdown = assembled;                              // 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled);       // 네이버용
  const charCountPlain    = assembledPlain.replace(/\s/g, "").length;

  return res.status(200).json({
    success: true,
    text: assembledPlain,
    textMarkdown: assembledMarkdown,
    hashtags: hashtagsArr,
    images, charCount: charCountPlain, seoScore,
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
