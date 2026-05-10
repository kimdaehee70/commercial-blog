// ============================================================
// generateOriental.js — 한의원 블로그 생성기 v3.8
//
// 변경사항 (v3.8) — 신경계 카테고리 별도 가드 (의료광고법 민감 영역):
//   ⭐ isStrokeRehab / isNeuroOriental 분기 추가
//      · 중풍재활 / 안면마비 / 교통사고 후유증 묶음 처리
//   ⭐ 회복 요약 분기 강화:
//      · 1주일차/1개월차/3개월차 전부 신경계 분기 적용
//      · "회복" / "개선" / "체감" 단정 표현 → 적응·관리·관찰 톤
//   ⭐ cleanText 신경계 후처리 블록 추가:
//      · "발음 살짝 개선" / "마비가 풀렸" / "후유증이 줄어들었" 등 효과 단정 약화
//      · "회복 속도가 빨라" / "회복이 잘 되고 있" 단정 약화
//      · 신경계 글에 섞이는 일반 근골격 디테일(어깨 뻐근/무릎 시큰) 약화
//
// 변경사항 (v3.7) — 업종 혼선 차단 + 조사 깨짐 처리:
//   ⭐ manual_therapy(도수치료) 영역 분리 — ortho/pain 전용으로
//      · INFO_BLOCKS / EXAM_VALUES / ORIENTAL_REC_MAP 에서 manual_therapy 제거
//      · ORIENTAL_IDS / ORIENTAL_NAMES 배열에서 "도수치료" 제거
//      · 도수치료 진입 시 명시적 차단 메시지 ("ortho/pain 핸들러 사용" 안내)
//      · isManual 분기 제거
//   ⭐ 회복 요약 3개월차 표현 분기 처리 ("체질 변화" → 근골격은 다른 문구)
//      · 추나·체외충격파·관절: "꾸준한 관리로 일상 활동 안정"
//      · 교통사고: "후유증 관리 마무리, 일상 복귀"
//      · 그 외: "꾸준한 관리로 변화 안정화"
//   ⭐ "이 치료이 N" 받침 조사 깨짐 보정 (W3 신규):
//      · "이 치료이 정도/증상/상태" → "이런 정도/증상/상태"
//      · "{kw}이 정도" → "이런 정도의" 패턴
//
// 변경사항 (v3.6.1) — 해시태그 깨짐 수정:
//   ⭐ "#압구정이 치료" / "#이 치료후기" 깨짐 차단
//      원인: cleanText의 키워드 치환이 해시태그 안 키워드까지 영향
//      처리: 해시태그 추가를 cleanText 이후로 이동 (line ~1070)
//
// 변경사항 (v3.6) — prompts v1.2 정합 + 자동 삽입 블록 제거:
//   ⭐ "이런 분들께 추천" 블록 자동 삽입 제거 (personal 분기 line ~1007)
//   ⭐ "비슷한 고민이라면 한의원 상담 ~ 도움이 됩니다" CTA 자동 삽입 제거
//   [v1.2 cleanText 보강] 잔존 광고 표현 후처리:
//     - "변화를 느끼실 수 있을" / "효과를 보실 수 있을" → 회차 안내문
//     - "혈액 순환 도와주는" / "특정 부위 자극" 치료 설명문 제거
//     - "근본 치료" / "피부 상태를 개선" 효과 단정 제거
//     - "도움이 됩니다" / "도움이 될 수 있어요" 권유 차단
//     - "체감 변화" / "안정되길 기대" 표현 정리
//     - "이런 분들께 추천" 헤더 안전망 제거
//
// 변경사항 (v3.5) — v2 패치 + 톤 패치 1회:
//   [v2] 네이버 본문용 dual 필드:
//     ① stripMarkdownForNaver 함수 추가 (handler 직전)
//     ② 응답: text(strip 적용) + textMarkdown(원본 보존) 동시 반환
//     ③ charCount 재계산 (charCountPlain — 공백 제외)
//   [v1.1 톤] 추천형·광고형 차단 (실발행 78~83 → 85+ 목표):
//     ① 추천·권유 표현 제거 ("추천드려요" / "고려해 보시는 것도" / "도움이 될 거예요")
//     ② 광고형 형용사 약화 ("친절한 상담" / "합리적인 비용" / "자연스러운 방법")
//     ③ "체질 개선" 빈도 제어 (2회 초과 시 일부 "관리"로)
//     ④ 단정·과장형 약화 ("70%는 좋아진" / "확실히 효과")
//     ⑤ "호르몬제 없이 체질 개선" 비교 우위형 → 정보형 ("비호르몬 방식으로 관리")
//     ⑥ 키워드 반복 임계 강화 (count 6→4, MAX 3→6)
//
// 변경사항 (v3.4) — clinic v3.4 후처리 로직 완전 이식:
//   ① cleanText 통합 (mode 분기 + 헤더 정규화 + 가격 치환 + 동사 변환)
//   ② [V/W/X/X-Min/V2/Y/Y2/B2/B/B3/Z] 모든 보정 단계 이식
//   ③ INFO_BLOCKS / EXAM_VALUES / runQC 정리
//   ④ 회복 타임라인 / 추천 대상 / 광고법 위반 자동 제거
//   ⑤ 이전 버그 수정:
//      - buildOrientalHashtags 안에 cleanText 코드 잘못 들어가 있던 문제 해결
//      - runQC certaintyCount/recommendCount/reviewFlowCount 미정의 버그 해결
// ============================================================
import { ORIENTAL_TREATMENTS }                  from "../../lib/oriental-data";
import { buildOrientalPrompt } from "../../lib/oriental-prompts";
import { ORIENTAL_FLOW_ENGINE }                 from "../../lib/oriental-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";
// 🛡️ 과별 침투 차단 (v1.0) — 16개 업종 정체성 토큰 자동 차단
import { getCrossBlocks } from "../../lib/industryBlocks";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN)
// ============================================================
const ORIENTAL_FORBIDDEN_BASE = [
  // 광고성
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "인생 시술", "후회 제로", "강력 추천", "베스트",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 시술", "이 방법",
  // ⚠️ "이 치료가/를/은"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 치료를 통해" → " 통해" / "이 치료의 필요" → 문장 와해
  //    → 헤더 정규화(아래)에서 치료명으로 치환 + 본문 정규화 블록에서 안전 보정 처리
  "기준으로 살펴본", "관리 방법과 생활 속", "예방 전략",
  "체계적인 접근", "알아두면 좋은",
  // 한의원 막연 표현 — AI 한의원 글에서 자주 나오는 클리셰
  "자연 치유의 힘", "기혈 순환에 도움", "체질적으로도 변화가",
  "따뜻한 차 한 잔", "차분하고 따뜻한 느낌",
  // 성형외과·피부과 침투 차단
  "쌍꺼풀", "눈매교정", "눈밑지방", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "붓기 회복 일지", "멍 빠지는", "티 안 나게",
  // 치과 침투 차단
  "임플란트", "스케일링", "사랑니", "크라운", "치석", "충치",
  // 이비인후과 침투 차단
  "비염", "축농증", "편도선수술", "이명치료", "난청",
  // 비뇨기과 침투 차단
  "전립선", "포경수술", "요로결석", "발기부전", "정관수술",
];

const ORIENTAL_FORBIDDEN_AI = [
  "드디어 결심하고", "결국 선택하게 되었어요", "마침내", "비로소",
  "마음이 편안해졌어요", "믿음이 갔어요", "친절하고 전문적이셔서",
  "따뜻한 분위기", "차분하고 따뜻한", "안정감 있는 분위기",
  "미소를 되찾았어요", "자신감을 찾았어요", "새로운 삶",
];

const ORIENTAL_FORBIDDEN_COMMERCIAL = [
  // ── 1인칭 시점 ──
  "저는 ", "제가 ", "내가 ", "나는 ", "저도 ",
  "받아봤어요", "받았어요", "받고 나서", "받았더니",
  "느꼈어요", "느꼈다", "느껴졌다",
  "결심했어요", "결정했어요", "고민했어요", "고민하다",
  "맞아봤어요", "맞았어요",
  // ── 효과 단정 ──
  "좋아졌어요", "좋아졌다", "또렷해졌어요", "또렷해졌다",
  "만족합니다", "만족했어요", "만족했다", "마음에 들었어요",
  "잘 됐어요", "잘됐다", "결과가 좋", "결과가 마음에",
  "확실히 좋", "확실히 효과", "확실히 잘", "분명히 좋",
  "완치", "100%", "반드시 효과", "효과 보장",
  // ── 추천·유도 ──
  "추천합니다", "추천해요", "추천드립니다", "추천드려요",
  "꼭 받으세요", "꼭 한 번", "꼭 받아보세요",
  "상담 받아보세요", "상담받아보세요", "상담 받아 보세요",
  "받아보시길", "받아보시는 걸",
  "도움이 됩니다", "도움 됩니다", "도움이 될 거",
  // ── 환자 유인 ──
  "실비 적용", "실비로 거의", "실손 보험", "본인부담 없음",
  "할인 이벤트", "프로모션", "특가",
  // ── 병원·의료진 직접 평가 ──
  "이 병원 추천", "여기서 받으세요", "이곳 추천",
  "원장님이 친절", "친절하셨어요", "친절하셨고",
  "설명이 좋", "설명도 좋", "잘 설명해 주",
];

// ============================================================
// 0-2. 🛡️ 과별 침투 차단 (lib/industryBlocks.js)
//   - 16개 업종 정체성 키워드 자동 차단
//   - oriental 자기 키워드 + EXEMPTIONS는 자동 면제
//   - 한방 키워드(추나/한약/뜸/부항)는 면제, 양방 시술은 차단
//   ⚠️ 새 업종 추가 시 lib/industryBlocks.js 만 수정
// ============================================================
const ORIENTAL_CROSS_BLOCK = getCrossBlocks("oriental");

// ============================================================
// 1. INFO_BLOCKS — 결정 섹션 아래 자동 삽입
// ============================================================
const INFO_BLOCKS = {
  // [v3.7] manual_therapy(도수치료) 제거 — ortho/pain 영역으로 분리
  //   사유: oriental에서 "체질 변화" / 한방 vocabulary 와 충돌
  //   처리: oriental은 침/뜸/한약/추나/부항 등 한방 고유 영역만 유지
  chuna: {
    title: "추나요법 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 시간", "1회 20~40분"],
      ["권장 회차", "주 1~2회 / 총 6~10회"],
      ["적합 케이스", "척추·골반 틀어짐, 일자목"],
      ["보험", "건강보험 적용 가능"],
    ],
  },
  oriental_diet: {
    title: "한방다이어트 일반 비교",
    rows: [
      ["항목", "한약 처방", "침치료 병행", "약침"],
      ["방식", "체질 한약 복용", "복부·경혈 침", "지방 부위 약침"],
      ["권장 기간", "1~3개월", "주 1~2회", "주 1~2회"],
      ["적합 케이스", "체질 개선", "식욕 조절", "부분 체형"],
    ],
  },
  acupuncture: {
    title: "침치료 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 시간", "1회 20~30분"],
      ["권장 회차", "주 2~3회 / 총 6~10회"],
      ["적합 케이스", "통증·근골격·내과 증상"],
      ["보험", "건강보험 적용"],
    ],
  },
  herbal_medicine: {
    title: "한약처방 일반 정보",
    rows: [
      ["항목", "내용"],
      ["복용 기간", "보통 1~3개월"],
      ["체질 진단", "맥진·복진·문진 종합"],
      ["적합 케이스", "만성 피로·면역·소화·여성 증상"],
      ["주의 사항", "복용 중 의료진 안내 따라 조절"],
    ],
  },
  traffic_accident: {
    title: "교통사고 한방치료 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 종류", "침·뜸·부항·추나·한약"],
      ["권장 회차", "주 2~3회 / 총 8~16회 (자보 기준)"],
      ["적합 케이스", "목·허리·어깨 후유증, 두통"],
      ["보험", "자동차보험 100% 적용"],
    ],
  },
  default: {
    title: "한의원 진료 검토 시 일반 안내",
    rows: [
      ["확인 항목", "내용"],
      ["전문의 자격", "한의사 면허 확인"],
      ["진료 분야", "본인 증상 대응 분야 여부"],
      ["치료 종류", "침·한약·추나 등 본원 보유 치료"],
      ["보험 적용", "건강보험·자동차보험 적용 가능 여부"],
      ["주의 사항", "개인 체질·증상에 따라 적용 차이"],
    ],
  },
};

function getInfoBlock(treatmentId) {
  return INFO_BLOCKS[treatmentId] || INFO_BLOCKS.default;
}

function renderInfoBlock(block) {
  const lines = [`\n\n**${block.title}**\n`];
  block.rows.forEach((row, i) => {
    lines.push(`| ${row.join(" | ")} |`);
    if (i === 0) lines.push(`|${row.map(() => "---").join("|")}|`);
  });
  return lines.join("\n") + "\n";
}

// ============================================================
// 2. EXAM_VALUES (personal 전용)
// ============================================================
const EXAM_VALUES = {
  // [v3.7] manual_therapy 제거 — ortho/pain 영역으로 분리
  chuna:             { duration: "1회 20~40분, 총 6~10회",  recovery: "당일 일상 회복",            pain: "통증점수 2~3점" },
  acupuncture:       { duration: "1회 20~30분",             recovery: "당일 회복",                  pain: "통증점수 1~2점" },
  herbal_medicine:   { duration: "1~3개월 복용",             recovery: "체질별 차이 있음",          pain: "통증 없음" },
  oriental_diet:     { duration: "1~3개월 프로그램",          recovery: "복용 중 효과 체감",         pain: "통증 거의 없음" },
  cupping:           { duration: "1회 15~20분",             recovery: "1~2일 자국 남음",            pain: "통증점수 2~3점" },
  moxibustion:       { duration: "1회 20~30분",             recovery: "당일 회복",                  pain: "통증 거의 없음" },
  postpartum:        { duration: "출산 후 6주 이내 시작 권장", recovery: "체질·산후 회복 정도 차이", pain: "통증점수 1~2점" },
  shockwave_oriental:{ duration: "1회 15~20분, 주 1~2회",    recovery: "당일 회복",                  pain: "통증점수 4~6점" },
  facial_palsy:      { duration: "발병 72시간 내 시작 권장",  recovery: "1~3개월 (개인차)",          pain: "통증점수 2~3점" },
  traffic_accident:  { duration: "주 2~3회, 총 8~16회",      recovery: "후유증 정도별 차이",        pain: "통증점수 2~4점" },
  default:           { duration: "치료별 상이",              recovery: "개인차 있음",                pain: "치료별 차이" },
};

function getExamValues(treatmentId) {
  return EXAM_VALUES[treatmentId] || EXAM_VALUES.default;
}

// ============================================================
// 3. 제목 생성 (mode 분기)
// ============================================================
function buildOrientalTitle(treatmentName, region, seoData, blogTypeId, mode) {
  if (mode === "commercial") {
    const defaults = [
      `${region} ${treatmentName} 진료 안내｜치료 과정과 일반 정보 정리`,
      `${region} ${treatmentName} 정보 가이드｜한의원 검토 시 확인할 항목`,
      `${region} ${treatmentName} 진료 정보｜일반 안내`,
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    return raw.replace(/\{region\}/g, region);
  }
  if (blogTypeId === "compare") {
    const cw = seoData?.compareWith || "다른 치료";
    return [
      `${region} ${treatmentName} vs ${cw} 비교｜직접 상담 후 선택한 이유`,
      `${region} ${treatmentName}｜${cw} 고민하다 결정한 이유`,
    ][Math.floor(Math.random() * 2)];
  }
  if (blogTypeId === "consult") {
    return `${region} ${treatmentName} 상담 후기｜처음 가기 전에 알았으면 좋았을 것들`;
  }
  const defaults = [
    `${region} ${treatmentName} 후기｜상담부터 치료까지 솔직하게 정리했습니다`,
    `${treatmentName} 고민 3개월｜${region} 한의원에서 받고 나서 드는 생각`,
    `${region} ${treatmentName}｜망설이다가 결국 결정한 이유`,
    `${treatmentName} 받기 전 알았으면 좋았을 것들｜${region} 한의원 실제 후기`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기)
// ============================================================
function buildOrientalHashtags(treatmentName, region, mode) {
  const kw = treatmentName.replace(/\s/g, "");
  if (mode === "commercial") {
    return [
      `#${region}${kw}`, `#${kw}정보`, `#${kw}안내`,
      `#${kw}`, `#${region}한의원`, `#한의원정보`,
      `#${region}진료안내`, `#한의원진료`,
    ].slice(0, 8).join(" ");
  }
  return [
    `#${region}${kw}`, `#${kw}후기`, `#${kw}상담`,
    `#${kw}`, `#${region}한의원`, `#한의원후기`,
    `#${region}후기`, `#한방치료`, `#${region}한의원추천`,
  ].slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기) — clinic v3.4 후처리 로직 완전 이식
// ============================================================
function cleanOrientalText(text, treatmentName, region, mode = "personal") {
  let result = text;

  // ─────────────────────────────────────────────────────
  // [v3.8 신경계 가드] 중풍재활 / 안면마비 / 교통사고 후유증 — 효과 단정 추가 차단
  //   사유: 의료광고법상 신경계 회복 표현은 일반 한방보다 민감 영역
  //   처리: 효과 단정 표현 → 관찰·기록형 톤으로 약화
  //         일반 직장인 만성통증 디테일(어깨 뻐근/무릎 시큰)이 신경계 글에 섞이는 문제도 일부 정리
  // ─────────────────────────────────────────────────────
  const isNeuroCleanup = /중풍|뇌졸중|구안와사|안면\s*마비|교통사고/.test(treatmentName);
  if (isNeuroCleanup) {
    result = result
      // 신경계 효과 단정 표현 약화
      .replace(/(발음|언어|말)이?\s*(살짝|조금|많이)?\s*(개선|회복|좋아졌|또렷해졌)/g, "$1 변화는 천천히 관찰하고 있")
      .replace(/마비(가|이)?\s*(많이|조금)?\s*(풀렸|풀려|개선|회복)/g, "경과를 관찰하고 있")
      .replace(/(편마비|반신|언어장애)\s*(이|가)?\s*(완화|개선|회복)/g, "$1 경과를 관찰하고 있")
      // "회복 속도가 빨라" / "회복이 잘 되고 있" — 신경계 단정
      .replace(/회복\s*속도가?\s*(빨라|좋아|향상|증가)/g, "회복 속도는 개인차가 크다고 해")
      .replace(/회복이?\s*잘?\s*(되고|되는|진행)/g, "경과를 지켜보고")
      // "후유증이 줄어들었" / "후유증이 사라졌" — 효과 단정
      .replace(/후유증이?\s*(많이|크게|확실히|점차)?\s*(줄어들었|사라졌|없어졌|호전)/g, "후유증 경과를 관찰하고 있")
      // 일반 근골격 디테일이 신경계 글에 들어왔을 때 약화
      // (어깨 뻐근/무릎 시큰 같은 표현이 신경계 후기에 섞이면 카테고리 흐림)
      .replace(/어깨가?\s*(전보다)?\s*덜\s*뻐근/g, "일상 활동에서 변화는 천천히 관찰")
      .replace(/무릎이?\s*(통증|시큰|아프|불편)/g, "일상 활동에서 불편한 부분");
  }

  // ─────────────────────────────────────────────────────
  // [v1.2 톤 패치] prompts v1.2 + 잔존 표현 후처리
  //   사유: prompts에서 차단해도 GPT가 변형으로 출력 → cleanText 재차 차단
  // ─────────────────────────────────────────────────────
  result = result
    // "변화를 느끼실 수 있을" / "효과를 보실 수 있을" 권유형 효과 단정
    .replace(/변화를?\s*느끼실?\s*수\s*있을?\s*거?예요/g, "보통 5~7회 정도 다닌다고 해요")
    .replace(/변화를?\s*느끼실?\s*수\s*있을?\s*겁니다/g, "보통 5~7회 정도 다닌다고 해요")
    .replace(/효과를?\s*보실?\s*수\s*있을?\s*거?예요/g, "보통 5~7회 정도 다닌다고 해요")
    .replace(/효과를?\s*보실?\s*수\s*있을?\s*겁니다/g, "보통 5~7회 정도 다닌다고 해요")
    // 치료 원리/효과 설명문 — 광고형
    .replace(/혈액\s*순환을?\s*도와주는?(\s*방법)?/g, "")
    .replace(/혈액\s*순환을?\s*돕는?(\s*방법)?/g, "")
    .replace(/혈액\s*순환에?\s*도움이?\s*된다?(고|는)?/g, "")
    .replace(/특정\s*부위에?\s*집중해서?\s*자극을?\s*줄?\s*수\s*있/g, "부위별로 안내받")
    .replace(/직접적으로?\s*특정\s*부위/g, "필요한 부위")
    .replace(/근본\s*치료/g, "")
    .replace(/근본적으로?\s*개선/g, "")
    .replace(/피부\s*상태를?\s*개선/g, "피부 관리를 이어")
    // "도움이 될 수 있어요" / "도움이 됩니다" 권유 잔존
    .replace(/도움이?\s*될\s*수\s*있어요/g, "")
    .replace(/도움이?\s*됩니다/g, "")
    .replace(/도움\s*됩니다/g, "")
    .replace(/도움이?\s*되[실길]\s*거?예요/g, "")
    // "체감 변화" / "안정되길 기대" 잔존
    .replace(/체감\s*변화/g, "변화")
    .replace(/안정되길?\s*기대/g, "지켜보고 있어")
    .replace(/회복되길?\s*기대/g, "지켜보고 있어")
    // "비슷한 고민이라면 ~" CTA 자동삽입 잔존
    .replace(/비슷한\s*고민이라면\s*한의원\s*상담[^.!?]*도움이?\s*됩니다\.?/g, "")
    .replace(/비슷한\s*상황이라면\s*참고가?\s*될\s*수\s*있어요\.?/g, "")
    // "이런 분들께 추천" 헤더 + 그 아래 항목 (폴백 — 외부 코드 제거됐지만 안전망)
    .replace(/\*\*이런\s*분들께\s*추천\*\*[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/이런\s*분들께\s*추천\s*\n[\s\S]*?(?=\n\n|$)/g, "");

  // ─────────────────────────────────────────────────────
  // [v1.1 톤 패치] 추천형·광고형·단정형 표현 — 모드 무관 강제 차단
  //   사유: oriental은 한의원 광고 톤이 강해 personal 모드에서도 제거 필요
  //   원칙: 후기형 단어로 약화. 의료광고법 민감 표현 우선 차단.
  // ─────────────────────────────────────────────────────
  result = result
    // 추천·권유 표현 — 후기형으로 약화
    .replace(/추천드려요|추천드립니다|추천해요|추천합니다/g, "참고가 됐어요")
    .replace(/추천드리고\s*싶어요|추천하고\s*싶어요/g, "참고가 됐어요")
    .replace(/고려해\s*보시는\s*것도\s*([^.!?\n]{0,20}?)(좋|괜찮|도움)([^.!?\n]*)/g, "저는 알아보길 잘했다 싶었어요")
    .replace(/고려해\s*보시는\s*것도/g, "저처럼 알아보셔도")
    .replace(/도움이\s*될\s*거예요|도움이\s*될\s*것\s*같아요|도움이\s*되실\s*거예요/g, "참고가 되실 것 같아요")
    .replace(/도움이\s*됩니다|도움\s*됩니다/g, "참고가 됩니다")
    .replace(/꼭\s*받아보세요|꼭\s*한\s*번\s*받아보세요/g, "")
    .replace(/상담\s*받아보세요|상담받아보세요/g, "")
    // 광고형 형용사 — 약화 또는 삭제
    .replace(/합리적인\s*비용/g, "비용 부담은 덜한 편")
    .replace(/합리적인\s*가격/g, "비용 부담은 덜한 편")
    .replace(/친절한\s*상담/g, "차분한 상담")
    .replace(/친절하고\s*전문적/g, "차분하게 안내")
    .replace(/친절하셨어요|친절하셨고|친절하셨습니다/g, "차근차근 안내해주셨어요")
    .replace(/원장님이\s*친절하/g, "원장님이 차근차근 안내해주")
    .replace(/세심한\s*설명|세심하게\s*설명/g, "차근차근 설명")
    .replace(/자연스러운\s*방법/g, "비수술적 방법")
    .replace(/자연\s*치유의?\s*힘/g, "")
    // "체질 개선" 빈도 제어 — 2회 초과 시 일부 축약
    ;
  {
    const ce = /체질\s*개선/g;
    const ceMatches = result.match(ce) || [];
    if (ceMatches.length > 2) {
      let cnt = 0;
      result = result.replace(ce, (m) => {
        cnt++;
        // 1, 2, 마지막은 유지 — 중간만 축약
        if (cnt <= 2) return m;
        return cnt % 2 === 0 ? "관리" : m;
      });
    }
  }
  // 단정·과장형 약화
  result = result
    .replace(/(\d+)%\s*는?\s*좋아진?\s*것\s*같아요/g, "전보다 한결 편해진 것 같아요")
    .replace(/(\d+)%\s*는?\s*나아진?\s*것\s*같아요/g, "전보다 한결 편해진 것 같아요")
    .replace(/확실히\s*좋아|확실히\s*효과|확실히\s*잘/g, "전보다 편해")
    .replace(/분명히\s*좋아/g, "전보다 편해")
    .replace(/마음이\s*놓였(어요|습니다|다)/g, "걱정이 줄었$1")
    // "호르몬제 없이 체질 개선" 비교 우위형 → 정보형
    .replace(/호르몬제?\s*없이\s*체질\s*개선/g, "비호르몬 방식으로 관리")
    .replace(/호르몬제?\s*없이도\s*체질\s*개선/g, "비호르몬 방식으로도 관리");

  // 공통: 기본 + AI 냄새 금지어
  const removeList = [...ORIENTAL_FORBIDDEN_BASE, ...ORIENTAL_FORBIDDEN_AI, ...ORIENTAL_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...ORIENTAL_FORBIDDEN_COMMERCIAL);

  removeList.forEach(w => {
    result = result.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  });

  // 조사 오류 교정 (한의원 치료명 + 잘못된 조사)
  result = result
    .replace(/한약를/g, "한약을")
    .replace(/침를/g, "침을")
    .replace(/뜸를/g, "뜸을")
    .replace(/추나를를/g, "추나를")
    .replace(/도수치료를(?=\s)/g, "도수치료를")
    .replace(/공진단를/g, "공진단을");

  // ─────────────────────────────────────────────────────
  // [헤더 정규화] 헤더 안 '그 방법'/'이 방법' → 치료명
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    if (/^#{1,6}\s/.test(line)) {
      return line
        .replace(/그\s*방법을/g, `${treatmentName}을`)
        .replace(/그\s*방법이/g, `${treatmentName}이`)
        .replace(/그\s*방법은/g, `${treatmentName}은`)
        .replace(/그\s*방법에/g, `${treatmentName}에`)
        .replace(/그\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*방법을/g, `${treatmentName}을`)
        .replace(/이\s*방법이/g, `${treatmentName}이`)
        .replace(/이\s*방법은/g, `${treatmentName}은`)
        .replace(/이\s*방법에/g, `${treatmentName}에`)
        .replace(/이\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*치료를/g, `${treatmentName}을`)
        .replace(/이\s*치료가/g, `${treatmentName}이`)
        .replace(/이\s*치료는/g, `${treatmentName}은`)
        .replace(/이\s*치료의/g, `${treatmentName}의`)
        .replace(/이\s*치료에/g, `${treatmentName}에`)
        .replace(/이\s*치료과/g, `${treatmentName}과`)
        .replace(/이\s*치료\s+/g, `${treatmentName} `);
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [본문 정규화] FORBIDDEN 목록에서 제거된 "이 치료가/를/은" 보정
  //   - 본문에 GPT가 직접 출력한 "이 치료를 통해" 같은 표현은 자연스럽게 둠
  //   - 단, 조사 깨짐 패턴(아래 참조)만 안전하게 보정
  //   ⚠️ 이 블록 제거 금지 — FORBIDDEN_BASE에서 조사어 빠진 이유와 짝
  // ─────────────────────────────────────────────────────
  {
    const tnEscEarly = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      // "이 치료은" (잘못된 조사) → "이 치료는"
      .replace(/이\s*치료은/g, "이 치료는")
      // 단독 " 통해" (앞에 공백, 문장 시작) — "이 치료를" 또는 비슷한 주어가 사라진 경우 복구
      .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 치료를 통해 ")
      // "이 치료의 필요/진행/시작/결정/중요" — 잘못된 조사
      .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)합니다/g, "이 치료가 $1합니다")
      .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)해요/g,   "이 치료가 $1해요")
      // "{치료명}이 과정/단계/시간/결과" → "{치료명}의 ~"
      .replace(new RegExp(`${tnEscEarly}이\\s+(과정|단계|시간|결과|이후|이전)`, "g"), `${treatmentName}의 $1`)
      // 이중 "통해 통해"
      .replace(/통해\s+통해/g, "통해")
      // ── 톤 약화 (병원 안전 표현으로) ──
      .replace(/추천드리고 싶어요/g,  "고려해볼 수 있어요")
      .replace(/추천드립니다/g,        "고려해볼 수 있어요")
      .replace(/적극 추천/g,           "괜찮은 선택")
      .replace(/강력 추천/g,           "괜찮은 선택")
      .replace(/적절하게 짧아서/g,     "짧아서")
      .replace(/적절하게 길어서/g,     "여유 있게")
      // 두 문장 합쳐진 어색한 패턴
      .replace(/고려해보는 것도\s+덕분에/g, "고려해볼 수 있어요. 덕분에")
      .replace(/고려하는 것도\s+덕분에/g,   "고려해볼 수 있어요. 덕분에");
  }

  // ─────────────────────────────────────────────────────
  // commercial 모드: 강제 정보형 변환
  // ─────────────────────────────────────────────────────
  if (mode === "commercial") {
    // [1] 가격 패턴 자동 치환
    result = result.replace(/회당\s*\d+\s*만원[^\s.,!?]*/g, "회당 비용은 병원 안내 참고");
    result = result.replace(/약\s*\d+\s*만원[^\s.,!?]*/g, "비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*정도/g, "비용은 병원 안내 참고");
    result = result.replace(/한 달에\s*약\s*\d+\s*만원/g, "월 비용은 병원 안내 참고");
    result = result.replace(/총\s*\d+\s*만원/g, "총 비용은 병원 안내 참고");
    result = result.replace(/한 개당\s*약\s*\d+\s*만원/g, "비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*대?/g, "비용은 병원 안내 참고");

    // [2] 1인칭 잔존 정리
    result = result.replace(/(?:^|[\s,.])저는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])제가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])내가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])나는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])저도\s+/g, " ");

    // [3] 후기형 동사 → 정보형 동사 자동 변환
    const verbConversion = [
      [/좋아졌습니다/g, "일반적인 경과를 보입니다"],
      [/좋아졌어요/g,   "일반적인 경과를 보입니다"],
      [/좋아졌다/g,     "일반적인 경과를 보입니다"],
      [/또렷해졌어요/g, "일반적인 변화가 안내됩니다"],
      [/또렷해졌습니다/g, "일반적인 변화가 안내됩니다"],
      [/또렷해졌다/g,   "일반적인 변화가 안내됩니다"],
      [/만족합니다/g,   "일반적인 경과로 안내됩니다"],
      [/만족했어요/g,   "일반적인 경과로 안내됩니다"],
      [/만족했다/g,     "일반적인 경과로 안내됩니다"],
      [/마음에 들었어요/g, "일반적인 경과로 안내됩니다"],
      [/잘 됐어요/g,    "일반적인 경과로 안내됩니다"],
      [/잘됐어요/g,     "일반적인 경과로 안내됩니다"],
      [/잘됐다/g,       "일반적인 경과로 안내됩니다"],
      [/결과가 좋아요/g, "일반적인 경과를 보입니다"],
      [/결과가 좋았어요/g, "일반적인 경과를 보입니다"],
      [/확실히\s+/g,    "일반적으로 "],
      [/분명히\s+/g,    "일반적으로 "],
      [/100%\s*/g,      "일반적으로 "],
      [/완치(되었|됐|돼)/g, "회복되었"],
      [/반드시\s+/g,    "일반적으로 "],
      [/추천합니다/g,        "고려해볼 수 있습니다"],
      [/추천해요/g,          "고려해볼 수 있습니다"],
      [/추천드립니다/g,      "고려해볼 수 있습니다"],
      [/추천드려요/g,        "고려해볼 수 있습니다"],
      [/꼭 받으세요/g,       "고려해볼 수 있습니다"],
      [/꼭 받아보세요/g,     "고려해볼 수 있습니다"],
      [/상담\s*받아보세요/g, "상담을 통해 결정하는 것이 권장됩니다"],
      [/받아보시는 걸/g,     "고려해보시는 것을"],
      [/받아보시길/g,        "고려해보시길"],
      [/도움이 됩니다/g,     "참고가 될 수 있습니다"],
      [/도움 됩니다/g,       "참고가 될 수 있습니다"],
      [/도움이 될\s*거/g,   "참고가 될 수 있을 거"],
      [/원장님이 친절하/g,   "상담 시 일반적으로 안내가 진행되"],
      [/친절하셨어요/g,      "안내가 진행되었습니다"],
      [/친절하셨고/g,        "안내가 진행되었고"],
      [/설명이 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/설명도 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/잘 설명해 주셨어요/g, "상세히 안내가 진행되었습니다"],
      [/받아봤어요/g,        "진료가 진행됩니다"],
      [/받았어요/g,          "진료가 진행됩니다"],
      [/받았더니/g,          "진료 후"],
      [/맞아봤어요/g,        "치료가 진행됩니다"],
      [/맞았어요/g,          "치료가 진행됩니다"],
      [/느꼈어요/g,          "안내됩니다"],
      [/느꼈다/g,            "안내됩니다"],
      [/느껴졌다/g,          "안내됩니다"],
      [/결심했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/결정했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/고민했어요/g,        "고민하는 경우가 많습니다"],
      [/고민하다가/g,        "고민하는 경우"],
    ];
    verbConversion.forEach(([from, to]) => {
      result = result.replace(from, to);
    });

    // [4] 후기형 어미 → 안내형 어미
    result = result.replace(/받았다\b/g, "진행된다");
    result = result.replace(/받았습니다\b/g, "진행됩니다");
  }

  // ─────────────────────────────────────────────────────
  // [공통 보정] — personal·commercial 모두 적용
  // ─────────────────────────────────────────────────────
  const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // [V] 치료명 빈자리 복구
  result = result.replace(/에서\s{2,}받/g, "에서 이 치료를 받");
  result = result.replace(/에서\s{2,}선택/g, "에서 이 치료를 선택");
  result = result.replace(/에서\s{2,}결정/g, "에서 이 치료를 결정");
  result = result.replace(/에서\s{2,}고려/g, "에서 이 치료를 고려");
  result = result.replace(/에서\s{2,}알아보/g, "에서 이 치료를 알아보");
  result = result.replace(/에서\s{2,}찾/g, "에서 이 치료를 찾");
  result = result.replace(/([.!?])\s{2,}(받기로|받고|받는|받았)/g, "$1 이 치료를 $2");
  result = result.replace(/(^|[\s.!?,])(을|를)\s+(만들어|찾던|알아보던|고려하던)/g, "$1 이 치료를 $3");
  // 줄 시작 깨진 조사 제거
  result = result.replace(/^\s*(을|를|가|은|는|에서|으로|로)\s+/gm, "");
  result = result.replace(/^\s*이\s+(?!치료|병원|방법|진료|곳|집|쪽|분야|업종)/gm, "");

  // [W] 조사 깨짐 보정
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료로`, "g"), `${treatmentName} 치료로`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료에`, "g"), `${treatmentName} 치료에`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료은`, "g"), `${treatmentName} 치료은`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료을`, "g"), `${treatmentName} 치료을`);

  // [W2] 치료명 + "이 치료 치료" / "이 치료 [동사]" 비문 처리
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+치료`, "g"), `${treatmentName} 치료`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료([을를이가은는의과와도만]|으로|로)\\s`, "g"), `${treatmentName}$1 `);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+(?=[가-힣])`, "g"), `${treatmentName}이 `);

  // [W3 / v3.7] "이 치료이 N" 받침 조사 깨짐 — "이 치료이 정도", "이 치료이 증상" 등
  //   원인: GPT가 "이 치료" 치환물에 받침 있는 명사 패턴으로 조사 "이"를 잘못 부착
  //   처리: 뒤따르는 명사에 따라 "이 치료의" / "이런" / 단순 공백 치환
  result = result
    // "이 치료이 정도/수준/상태" → "이 정도의" 패턴
    .replace(/이\s*치료이\s*(정도|수준|상태)/g, "이런 $1의")
    // "이 치료이 증상/문제/상황" → "이런 증상" 패턴
    .replace(/이\s*치료이\s*(증상|문제|상황|불편|통증|느낌)/g, "이런 $1")
    // "이 치료이 [기타 명사]" → "이 치료의 N" 일반 케이스
    .replace(/이\s*치료이\s+([가-힣])/g, "이 치료의 $1")
    // 치료명 직접 + "이 정도/증상/상태" — 받침 단어용
    .replace(new RegExp(`${tnEsc}이\\s+(정도|수준|상태)`, "g"), "이런 $1의")
    .replace(new RegExp(`${tnEsc}이\\s+(증상|문제|상황|불편|통증|느낌)`, "g"), "이런 $1");

  // [X] 키워드 + 치환 총량 제어 — 대체어 임계 6회 (v1.1: 3 → 6 / 임계 6 → 4)
  //   사유: oriental 글에서 치료명 8~10회 노출 → 광고 톤 유발
  //   원칙: 4회까지 그대로 유지 후 최대 6회 "이 치료"로 축약
  {
    const kwRegex = new RegExp(tnEsc, "g");
    const MAX_REPLACEMENTS = 6;
    let count = 0;
    let replaced = 0;
    result = result.replace(kwRegex, (m) => {
      count++;
      if (count <= 4) return m;
      if (replaced >= MAX_REPLACEMENTS) return m;
      replaced++;
      return "이 치료";
    });
  }

  // [X-Min] 치료명 노출 최소 보장 — 5회 미만이면 "이 치료" 일부 → 치료명 역치환
  {
    const tnCount = (result.match(new RegExp(tnEsc, "g")) || []).length;
    if (tnCount < 5) {
      const need = 5 - tnCount;
      let restored = 0;
      const candEsc = "이\\s*치료";
      const re = new RegExp(`([.!?]\\s+|^|\\n)${candEsc}(\\s+[가-힣])`, "g");
      result = result.replace(re, (m, p1, p2) => {
        if (restored >= need) return m;
        restored++;
        return `${p1}${treatmentName}${p2}`;
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // [V2] 치환 후 보정 — "이 치료 치료" / "이 치료가 [명사]" 비문 차단
  // ─────────────────────────────────────────────────────
  result = result
    // ① 직접 치환 패턴
    .replace(/이\s*치료가\s+말에/g, "그 말에")
    .replace(/이\s*치료가\s+이야기에/g, "그 이야기에")
    // ② 조사 붙은 패턴
    .replace(/이\s*치료\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    .replace(/이\s*치료가\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    // ③ "이 치료 후기" / "이 치료가 후기" → "그 후기"
    .replace(/이\s*치료가?\s+후기/g, "그 후기")
    // ④ "이 치료 치료" → "이 치료"
    .replace(/이\s*치료\s+치료(?![가-힣])/g, "이 치료")
    .replace(/이\s*치료가\s+치료(?![가-힣])/g, "이 치료")
    // ⑤ "이 치료가 [명사]" 비문 처리 — 화이트리스트
    .replace(/이\s*치료가\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|시간|기간|상황|경험|선택|순간|중요|필요|기대|걱정|불안|이야기|설명|안내|결정|판단|이해|기억|느낌|생각|부분|두\s*가지|세\s*가지|덕분|때문)/g, "이 치료의 $1")
    // ⑥ "이 치료가 + 형용사" 비문
    .replace(/이\s*치료가\s+(만족|적절|중요|필요|좋[으았은])/g, "이 치료는 $1")
    // ⑦ "{치료명}이 + 명사" 비문 직접 처리
    .replace(new RegExp(`${tnEsc}이\\s+(부분|두\\s*가지|세\\s*가지|덕분|때문)`, "g"), `${treatmentName} $1`)
    .replace(new RegExp(`${tnEsc}이\\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|상황|경험|선택|순간|이야기|설명|안내|결정|느낌|생각)`, "g"), `${treatmentName}의 $1`)
    // ⑧ 연속 "이 치료 X 이 치료" 정리
    .replace(/(이\s*치료[을를이가은는의로]?\s+){2,}/g, "이 치료 ");

  // [Y] AI 부사 반복 정리
  ["정말", "특히 ", "무엇보다"].forEach(adv => {
    const re = new RegExp(adv, "g");
    let cnt = 0;
    result = result.replace(re, (m) => {
      cnt++;
      return cnt <= 2 ? m : "";
    });
  });

  // ─────────────────────────────────────────────────────
  // [Y2] 문장 끝 어미 다양화 — 3회 연속 시 3번째만 변형
  // ─────────────────────────────────────────────────────
  {
    const endings = [
      { match: /했어요\.\s/g, alt: "했답니다. " },
      { match: /했죠\.\s/g, alt: "했답니다. " },
      { match: /됐어요\.\s/g, alt: "됐답니다. " },
      { match: /있었어요\.\s/g, alt: "있었답니다. " },
    ];
    endings.forEach(({ match, alt }) => {
      let cnt = 0;
      result = result.replace(match, (m) => {
        cnt++;
        return cnt === 3 ? alt : m;
      });
    });
  }

  // ─────────────────────────────────────────────────────
  // [B2] 애매 문장 + 비문 직접 차단
  // ─────────────────────────────────────────────────────
  result = result
    .replace(/기대할\s*수\s*있는\s+(고민해|추천|좋을|괜찮)[^.!?\n]*[.!?]/g, "기대할 수 있어요.")
    .replace(/원할\s*때\s+(고민해|추천)[^.!?\n]*[.!?]/g, "원할 수 있어요.")
    .replace(/선택이\s*될\s*수\s*있는\s+(고민|추천|좋)[^.!?\n]*[.!?]/g, "선택이 될 수 있어요.")
    .replace(/이\s*치료과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 치료와 비교해봤어요.")
    .replace(/이\s*방법과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 방법과 비교해봤어요.")
    // 줄 시작에 "에서도"는 항상 비문 → 줄 자체 제거
    .replace(/^\s*에서도\s+[^.!?\n]*[.!?]?\s*$/gm, "")
    // 어색한 지시어 + 한자어 병치
    .replace(/([가-힣]+)\s+그\s+후기를/g, "$1 후기를")
    .replace(/([가-힣]+)\s+그\s+후기/g, "$1 후기")
    // 자기 비교 → 다른 치료 비교로 전환
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교해도`, "g"), "다른 치료와 비교해도")
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교했을\\s*때`, "g"), "다른 치료와 비교했을 때")
    // 약한 CTA → 정보형 마무리로 재작성
    .replace(/시도해볼\s*만한\s*방법이라\s*생각합니다\.?/g, "")
    .replace(/시도해볼\s*만한\s*방법이에요\.?/g, "")
    .replace(/시도해볼\s*만해요\.?/g, "")
    .replace(/시도해보시는\s*것도[^.!?\n]*[.!?]?/g, "")
    .replace(/손색이\s*없다는\s*생각이?\s*들었어요\.?/g, "비슷한 만족감을 느꼈어요.")
    .replace(/손색이\s*없다는\s*생각이?\s*들었습니다\.?/g, "비슷한 만족감을 느꼈습니다.")
    .replace(/손색이\s*없어요\.?/g, "충분했어요.")
    .replace(/손색이\s*없습니다\.?/g, "충분했습니다.")
    .replace(/[가-힣]+도?\s*부럽지\s*않네요\.?/g, "만족스러워요.")
    .replace(/[가-힣]+도?\s*부럽지\s*않습니다\.?/g, "만족스럽습니다.");

  // ─────────────────────────────────────────────────────
  // [Z] CTA 완전 제거
  // ─────────────────────────────────────────────────────
  const ctaPatterns = [
    /한\s*번\s+고민해\s*보세요\.?/g,
    /한\s*번\s+생각해\s*보세요\.?/g,
    /한\s*번\s+상담\s*받아보세요\.?/g,
    /한\s*번\s+방문해\s*보세요\.?/g,
    /한\s*번쯤\s+고민해\s*보세요\.?/g,
    /상담\s*한\s*번\s+받아보는\s*것도[^.!?\n]*[.!?]?/g,
    /고민\s*한\s*번\s+해보는\s*것도[^.!?\n]*[.!?]?/g,
    /방문해\s*보는\s*것도[^.!?\n]*[.!?]?/g,
    /비슷한\s*고민이라면[^.!?\n]*[.!?]?/g,
    /참고\s*하시면\s*좋[을습]\s*[것니]?[다까요]?\.?/g,
    /참고가\s*되었으면\s*합니다\.?/g,
    /참고가\s*될\s*수\s*있을\s*거[예에]요\.?/g,
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같습니다\.?/g,
    /고민해\s*보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /생각해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /좋[으을]\s*선택이\s*될\s*[수것]\s*있[어습]+\.?/g,
    /좋[으을]\s*[것거]\s*같[아습]+요\.?/g,
    /괜찮겠다는\s*생각이?\s*들[더었]?라?고요?\.?/g,
    /내게\s*꼭\s*맞는\s*선택이라\s*느꼈[어습]+\.?/g,
  ];
  ctaPatterns.forEach(re => { result = result.replace(re, ""); });

  if (mode === "personal") {
    result = result.replace(/추천하고\s*싶습니다\.?/g, "");
    result = result.replace(/추천하고\s*싶다\.?/g, "");
    result = result.replace(/추천하고\s*싶어요\.?/g, "");
    result = result.replace(/추천드립니다\.?/g, "");
    result = result.replace(/추천해요\.?/g, "");
    result = result.replace(/추천합니다\.?/g, "");
    result = result.replace(/고민해보세요\.?/g, "");
    result = result.replace(/고민해\s*보세요\.?/g, "");
    result = result.replace(/고민해보셔도\.?/g, "");
    result = result.replace(/고민해\s*보셔도\.?/g, "");
    result = result.replace(/고려해보세요\.?/g, "");
    result = result.replace(/고려해\s*보세요\.?/g, "");
    result = result.replace(/고려해보시면\s*좋[을습][것니다까요]+\.?/g, "");
    result = result.replace(/도움이 되길 바랍니다\.?/g, "");
    result = result.replace(/도움이 됩니다\.?/g, "");
    result = result.replace(/정말 만족스럽습니다/g, "체감 변화가 있었습니다");
    result = result.replace(/정말 만족했습니다/g, "체감 변화가 있었습니다");
    result = result.replace(/결과가\s*만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/결과가\s*만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/결과가\s*만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스럽습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/확실히\s+/g, "");
  }

  // ─────────────────────────────────────────────────────
  // [B3] 잔해 청소 필터
  // ─────────────────────────────────────────────────────
  result = result
    .replace(/되고\s+요\.?/g, "되었어요.")
    .replace(/되었고\s+요\.?/g, "되었어요.")
    .replace(/없어지고\s+요\.?/g, "없어졌어요.")
    .replace(/들고\s+요\.?/g, "들었어요.")
    .replace(/하고\s+요\.?/g, "했어요.")
    .replace(/정말\s+니다\.?/g, "정말 좋아졌습니다.")
    .replace(/정말\s+습니다\.?/g, "정말 좋았습니다.")
    .replace(/정말\s+어요\.?/g, "정말 좋았어요.")
    .replace(/^(\s*-?\s*\d+일차):\s*$/gm, "$1: 자연스러워짐")
    .replace(/^(\s*-?\s*\d+~\d+일차):\s*$/gm, "$1: 자연스러워짐")
    .replace(/^\s*(정말|특히|무엇보다)\s*$/gm, "");

  // ─────────────────────────────────────────────────────
  // [B] 문장 종결 검증 — 잘린 문장 재작성
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (/^(#{1,6}\s|[|*\-]\s|\[이미지|#[가-힣a-zA-Z]|>\s)/.test(trimmed)) return line;
    if (/^\*\*/.test(trimmed)) return line;
    if (/[.?!"”’」』)\]》〉]$/.test(trimmed)) return line;
    if (/(증상이|통증이|체질이|결과가|컨디션이)\s*$/.test(trimmed)) {
      console.log(`[v3.4 잔해복구] 미완성 → 종결 추가: "${trimmed}"`);
      return line + " 호전되었어요.";
    }
    if (/(을|를|이|가|의|에서|에게|으로)\s*$/.test(trimmed)) {
      console.log(`[v3.4 문장종결] 미완성 문장 제거: "${trimmed}"`);
      return "";
    }
    if (/(고|며|면서|지만|는데|아서|어서|니까)\s*$/.test(trimmed)) {
      console.log(`[v3.4 잔해복구] 연결어미 → 종결: "${trimmed}"`);
      return line + " 변화가 있었습니다.";
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [최종 정리]
  // ─────────────────────────────────────────────────────
  result = result
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{3,}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/['"]\s*['"]/g, "")
    .replace(/['"]\s+할\s+수/g, "할 수")
    .replace(/['"]\s+될\s+수/g, "될 수")
    .replace(/(["“])\s+([가-힣])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s.,]+/, "")
    .replace(/(^|\n)\s*\.\s*(\n|$)/g, "$1$2")
    .replace(/(^|\n)\s*\.\.\s*(\n|$)/g, "$1$2")
    .trim();

  return result;
}

// ============================================================
// 6. 회복 타임라인 (personal 전용)
// ============================================================
function insertOrientalTimeline(text, treatmentName, mode) {
  if (mode === "commercial") return text;
  const hasTimeline = /회차|주일|개월|일차/.test(text);
  if (!hasTimeline) return text;

  // 치료별 분기 플래그
  const isDiet        = /다이어트/.test(treatmentName);
  const isPostpartum  = /산후/.test(treatmentName);
  const isFacialPalsy = /구안와사/.test(treatmentName);
  const isAccident    = /교통사고/.test(treatmentName);
  const isChuna       = /추나/.test(treatmentName);
  // [v3.7] isManual 분기 제거 — 도수치료는 ortho/pain 영역으로 분리
  const isShock       = /체외충격파/.test(treatmentName);
  const isJoint       = /관절/.test(treatmentName);
  // [v3.8] 신경계 카테고리 분기 — 중풍재활 (의료광고법 민감 영역)
  const isStrokeRehab = /중풍|뇌졸중/.test(treatmentName);
  // [v3.8] 신경계 통합 플래그 — 효과 단정 차단 + 보수적 회복 표현
  const isNeuroOriental = isFacialPalsy || isStrokeRehab || isAccident;

  // [v3.8] 신경계는 효과 단정 표현 약화 — "회복" / "개선" 표현 자제
  const week1Note = isDiet        ? "식욕 조절 시작, 부종 감소 체감"
                  : isPostpartum  ? "오로 배출 개선, 관절 통증 완화 시작"
                  : isStrokeRehab ? "치료 리듬 적응 시작, 일상 활동 점검"
                  : isFacialPalsy ? "치료 리듬 적응 시작, 경과 관찰 단계"
                  : isAccident    ? "치료 리듬 적응 시작, 후유증 관리 단계"
                  : "증상 완화 시작, 치료 리듬 안정";

  const firstNote = isChuna       ? "교정 직후 허리·골반 개운한 느낌, 뻐근함 일시적으로 있을 수 있음"
                  : isShock       ? "시술 직후 해당 부위 압통·뻐근함, 당일 보행 가능"
                  : isJoint       ? "치료 직후 관절 주변 열감, 다음날 더 부드러워지는 느낌"
                  : isStrokeRehab ? "치료 후 일상 적응 단계 — 변화는 개인차가 큰 영역이라 천천히 관찰"
                  : isFacialPalsy ? "치료 후 경과 관찰 단계 — 회복 속도는 발병 시점·개인차가 큼"
                  : isAccident    ? "치료 후 일상 적응 단계 — 후유증 관리는 장기적으로 진행"
                  : "치료 후 즉각적 느낌 변화";

  // [v3.7/v3.8] 3개월차 표현 분기
  //   - 근골격: "꾸준한 관리로 일상 활동 안정"
  //   - 신경계(중풍/안면마비/교통사고): 효과 단정 자제, 적응·관리 톤
  const month3Note = (isChuna || isShock || isJoint)
                    ? "꾸준한 관리로 일상 활동 안정"
                    : isStrokeRehab
                    ? "장기 관리 단계 진입 — 일상 적응 위주로 기록"
                    : isFacialPalsy
                    ? "경과 관찰 단계 — 회복 속도 개인차 큼"
                    : isAccident
                    ? "후유증 관리 마무리, 일상 복귀"
                    : "꾸준한 관리로 변화 안정화";

  // [v3.8] 1개월차도 신경계는 "일상 변화 체감"이 효과 단정처럼 읽힐 수 있어 분기
  const month1Note = isNeuroOriental
                    ? "치료 일정 정착, 본인 상태 기록 위주"
                    : "일상 변화 체감";

  const timeline = `\n\n**회복 요약**\n- 1회 직후: ${firstNote}\n- 1주일차: ${week1Note}\n- 1개월차: ${month1Note}\n- 3개월차: ${month3Note}`;
  return text.trimEnd() + timeline;
}

// ============================================================
// 7. 추천 대상 (personal 전용)
// ============================================================
const ORIENTAL_REC_MAP = {
  // [v3.7] "도수치료" 제거 — ortho/pain 영역으로 분리
  "추나요법":         ["척추·골반 틀어짐으로 허리 통증이 있는 경우", "건강보험으로 부담 없이 치료받고 싶은 경우"],
  "한방다이어트":     ["운동·식이요법으로 효과가 부족한 경우", "요요 없이 체질 개선을 원하는 경우"],
  "침치료":           ["만성 두통·어깨·목·허리 통증이 있는 경우", "진통제 없이 통증을 조절하고 싶은 경우"],
  "한약처방":         ["만성 피로·소화불량·면역력 저하로 일상이 힘든 경우", "체질 개선을 통한 근본 건강 회복을 원하는 경우"],
  "부항치료":         ["어깨·등·허리 근육 뭉침·통증이 반복되는 경우", "혈액순환이 안 되어 항상 피로한 경우"],
  "뜸치료":           ["만성 냉증·수족냉증으로 고생하는 경우", "소화불량·복부 냉감이 지속되는 경우"],
  "산후한방치료":     ["출산 후 관절 통증·부종·냉증이 있는 경우", "산후풍 예방과 체질 회복을 원하는 경우"],
  "체외충격파치료":   ["족저근막염으로 아침 보행 통증이 있는 경우", "어깨 석회 힘줄염·회전근개 손상이 있는 경우"],
  "구안와사치료":     ["갑작스러운 안면 마비 증상이 발생한 경우", "발병 초기 72시간 내 빠른 치료가 필요한 경우"],
  "중풍재활치료":     ["뇌졸중 후 마비·언어장애 후유증이 있는 경우", "양방 재활에 한방을 병행해 회복 속도를 높이고 싶은 경우"],
  "교통사고한방치료": ["교통사고 후 목·허리·어깨 통증이 있는 경우", "자동차보험으로 부담 없이 치료받고 싶은 경우"],
  "한방피부질환치료": ["스테로이드 치료 후 재발이 반복되는 경우", "기미·흑자·아토피 등 만성 피부질환이 있는 경우"],
  "갱년기한약치료":   ["안면홍조·열감·불면 등 갱년기 증상이 있는 경우", "호르몬제 없이 체질 개선으로 증상을 다스리고 싶은 경우"],
  "소화기한방치료":   ["공복에도 계속되는 불편함·담적 증상이 있는 경우", "역류성 식도염이 반복되어 근본 치료가 필요한 경우"],
  "면역한방치료":     ["환절기마다 비염·감기에 자주 걸리는 경우", "만성 피로·면역력 저하로 일상이 힘든 경우"],
  "공진단처방":       ["만성 피로·체력 저하로 활력 회복이 필요한 경우", "면역력이 약하고 반복 감기·잔병치레가 많은 경우"],
  "관절한방치료":     ["무릎·어깨 퇴행성 관절염으로 통증이 있는 경우", "수술 없이 보존적 치료로 관절을 관리하고 싶은 경우"],
};

// ============================================================
// 8. QC 체크
// ============================================================
function runQC(text, treatmentName, mode) {
  const charCount = calcCharCount(text);

  const hasInfoBlock = /\|\s*항목\s*\||\|\s*확인 항목\s*\||\|\s*[가-힣]+\s*\|/.test(text);
  const hasExamValue = /\d+\s*(분|일|주|개월|회|점|만원)/.test(text);
  const kwCount = (text.match(new RegExp(treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const firstPersonCount = (text.match(/저는\s|제가\s|내가\s|나는\s|저도\s|받아봤|받았더|느꼈어|느꼈다|결심했어|결정했어|고민했어/g) || []).length;
  const priceCount = (text.match(/\d+\s*만원/g) || []).length;
  const certaintyCount = (text.match(/좋아졌|또렷해졌|만족합|만족했|마음에 들었|확실히 좋|확실히 효과|분명히 좋|완치|100%|결과가 좋/g) || []).length;
  const recommendCount = (text.match(/추천합|추천해요|추천드립|꼭 받|상담\s*받아보|받아보시|도움이 됩|도움이 될/g) || []).length;
  const reviewFlowCount = (text.match(/고민하다가|결국 받|결심하고|결정했다|받기로 했|받고 나서/g) || []).length;

  console.log(`[oriental][QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[oriental][QC] 수치: ${hasExamValue}`);
  console.log(`[oriental][QC] 키워드반복: ${kwCount}`);
  if (mode === "commercial") {
    console.log(`[oriental][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[oriental][QC] 가격(commercial 위반): ${priceCount}건`);
    console.log(`[oriental][QC] 효과단정(commercial 위반): ${certaintyCount}건`);
    console.log(`[oriental][QC] 추천유도(commercial 위반): ${recommendCount}건`);
    console.log(`[oriental][QC] 후기흐름(commercial 위반): ${reviewFlowCount}건`);
  }

  return {
    hasInfoBlock, hasExamValue, kwCount,
    firstPersonCount, priceCount,
    certaintyCount, recommendCount, reviewFlowCount,
    charCount,
  };
}

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
export default async function handleOriental(req, res) {
  const {
    target, program, blogType,
    userRegion, userMemo, overrideTitle,
    mode = "personal",
  } = req.body;

  const subKw      = program.name || "";
  const region     = (userRegion || "강남").trim();
  const memo       = (userMemo || "").trim();
  const targetId   = target?.id   || "consult";
  const blogTypeId = blogType?.id || "review";
  const industry   = "oriental";
  const validMode  = (mode === "commercial") ? "commercial" : "personal";
  console.log(`[oriental] mode: ${validMode}`);

  // ── oriental 치료 검증 ─────────────────────────────────
  // [v3.7] manual_therapy / "도수치료" 제거 — ortho/pain 영역으로 분리
  //   사유: oriental vocabulary("체질 변화" 등)와 도수치료가 충돌하여 글 톤 흔들림
  //   처리: 도수치료는 ortho 또는 pain 핸들러에서만 처리. oriental 진입 차단.
  const ORIENTAL_IDS   = ["chuna","oriental_diet","acupuncture","herbal_medicine","cupping","moxibustion","postpartum","shockwave_oriental","facial_palsy","stroke_rehab","traffic_accident","skin_disease","menopause","digestive","immunity","gongjindan","joint"];
  const ORIENTAL_NAMES = ["추나요법","한방다이어트","침치료","한약처방","부항치료","뜸치료","산후한방치료","체외충격파치료","구안와사치료","중풍재활치료","교통사고한방치료","한방피부질환치료","갱년기한약치료","소화기한방치료","면역한방치료","공진단처방","관절한방치료"];
  const isOriental = ORIENTAL_IDS.includes(program.id) || ORIENTAL_NAMES.includes(subKw);
  if (!isOriental) {
    // [v3.7] 도수치료 명시적 차단 메시지
    if (program.id === "manual_therapy" || subKw === "도수치료" || /도수/.test(subKw)) {
      console.error(`[oriental] 도수치료는 oriental 영역이 아닙니다. ortho/pain 핸들러로 라우팅 필요: ${subKw}`);
      return res.status(400).json({
        error: `도수치료는 정형외과(ortho) 또는 통증의학과(pain) 영역입니다. 한의원에서는 추나요법으로 안내됩니다.`,
        suggestion: "추나요법(chuna) 또는 ortho/pain 핸들러 사용",
      });
    }
    console.error(`[oriental] 잘못된 치료 진입 차단: ${subKw}`);
    return res.status(400).json({ error: `한의원 생성기에 잘못된 치료가 전달되었습니다: ${subKw}` });
  }
  console.log(`[oriental] 치료 검증 통과: ${subKw}`);

  // ── 시술 데이터 로드 ─────────────────────────────────
  const treatmentData = ORIENTAL_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || ORIENTAL_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 (mode 분기) ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 ${region} 지역 ${subKw} 진료 정보를 정리하는 정보형 블로그 작가입니다.
업종: 한의원 | 치료: ${subKw} | 지역: ${region}

[의료광고법 준수]
- ❌ 1인칭 환자 시점 금지 (저는/제가/받아봤어요)
- ❌ 가격 직접 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지 (확실히/100%/완치)
- ❌ 환자 유인 금지 (실비/할인)
- ❌ 병원 직접 추천 금지

[권장 표현]
- "일반적으로 ~ 안내됩니다" / "병원에 따라 차이가 있습니다"
- "진료 시 의료진과 상담하여 결정하는 것이 권장됩니다"

3인칭 정보형. 자연스러운 안내 톤. 표·불릿 사용 가능.

[어법 절대 규칙 — v3.4 핵심]
※ 치료명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ "${subKw}" (그대로) / "${subKw}을" / "${subKw}를" / "${subKw}은" / "${subKw}는" / "${subKw}이" (주격) / "${subKw}로" / "${subKw}에"
  ✅ 대체어: "이 치료" / "해당 치료"
  ❌ "${subKw} 치료" 금지 (이중 표현)
  ❌ "${subKw}이 치료" 금지 (어순 붕괴)
  ❌ "이 치료가 치료" 금지
  ❌ "이 치료가 [명사]" 금지`
    : `당신은 ${region} 거주 일반인입니다. ${subKw} 진료를 받아본 1인칭 블로그 후기를 작성합니다.
업종: 한의원 | 치료: ${subKw} | 지역: ${region}
[절대 금지] 성형/피부/치과/이비인후과/비뇨기과 관련 표현 일절 사용 금지
[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[절대 금지] "자연 치유의 힘" / "기혈 순환에 도움" / "체질적으로도 변화가" — 막연한 한방 클리셰
[절대 금지] "따뜻한 차 한 잔" / "차분하고 따뜻한 느낌" — 과잉 감성 묘사
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함
[필수 포함]
- 구체적 수치: 치료 회차(3회차, 7회차 등), 비용(대략 얼마), 기간(2주, 한 달)
- 실생활 맥락: 직장/집/가족 등 일상에서 불편했던 상황 1개 이상
- 원장님 말 직접 인용 1회: "원장님이 '~' 라고 하시더라고요" 형태

[어법 절대 규칙 — v3.4 핵심]
※ 치료명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ "${subKw}" (그대로) / "${subKw}을" / "${subKw}를" / "${subKw}은" / "${subKw}는" / "${subKw}이" (주격) / "${subKw}로" / "${subKw}에"
  ✅ 대체어: "이 치료" (조사 자연스럽게)
  ❌ "${subKw} 치료" 금지 (이중 표현)
  ❌ "이 치료가 [명사]" 금지 — "이 치료의 [명사]" 또는 "이 치료는 [형용사]"

[문장 종결 절대 규칙]
- 모든 문장은 "다." / "요." / "죠." / "어요." / "습니다." 중 하나로 종결
- 미완성 문장·비문 금지`;

  // ── 섹션별 순차 생성 ─────────────────────────────────
  const SECTIONS = ORIENTAL_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = buildOrientalPrompt(sec.key, treatmentData, region, { mode: validMode });
    const prevBlock  = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: oriental | 키워드: ${subKw} | 지역: ${region} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 성형외과·피부과 표현 금지. 200자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanOrientalText(secText, subKw, region, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      console.log(`[oriental] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanOrientalText(retry, subKw, region, validMode);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, subKw);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[oriental] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 상담 / 침치료 / 한약 / 부항 / 일상
  const ORIENTAL_ALT_POOL = ["상담 사진", "침치료 사진", "한약 사진", "부항 사진", "일상 사진"];
  const _ORIENTAL_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "상담 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "침치료 사진",
    result:   "한약 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _ORIENTAL_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (mode 분기) ─────────────────────────
  let title = overrideTitle || buildOrientalTitle(subKw, region, seoData, blogTypeId, validMode);
  const ORIENTAL_TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|써마지|필러|보톡스|피코레이저|성형외과|임플란트|치아|스케일링|사랑니|비염|축농증|편도|이명|난청|전립선|포경/;
  if (ORIENTAL_TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜치료 과정과 일반 정보`
      : `${region} ${subKw} 후기｜망설이다가 결국 결정한 이유`;
  }
  if (!title.includes(subKw)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜치료 과정과 일반 정보`
      : `${region} ${subKw} 후기｜상담부터 치료까지 솔직하게 정리했습니다`;
  }

  // ── 조립 ────────────────────────────────────────────
  const secKeys = SECTIONS.map(s => s.key);

  // ── INFO_BLOCKS 삽입 (결정 섹션 아래) ─────────────
  const infoBlock = getInfoBlock(treatmentId);
  const infoBlockText = renderInfoBlock(infoBlock);
  if (sectionTexts["reason"]) {
    sectionTexts["reason"] = sectionTexts["reason"].trimEnd() + infoBlockText;
  } else if (sectionTexts["result"]) {
    sectionTexts["result"] = infoBlockText + "\n\n" + sectionTexts["result"];
  }

  // ── 회복 타임라인 (personal만) ────────────────────
  if (sectionTexts["result"]) {
    sectionTexts["result"] = insertOrientalTimeline(sectionTexts["result"], subKw, validMode);
  }

  // ── 마무리 섹션 (mode 분기) ─────────────────────
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    if (validMode === "commercial") {
      const commercialCTAs = [
        `\n\n${subKw}에 대한 정보는 일반적인 안내일 뿐, 개인의 증상·체질에 따라 적용은 달라질 수 있습니다. 정확한 진단과 치료 방향은 의료진과의 직접 상담을 통해 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${subKw} 진료에 대한 일반 정보 안내입니다. 적합 여부·회복 경과는 개인차가 있으므로, ${region} 내 한의원에서 충분한 상담 후 결정하시는 것이 좋습니다.`,
        `\n\n${subKw} 관련 일반 정보를 정리한 내용입니다. 본인 상태에 맞는 치료 방법은 한의원 진료 후 안내받는 것이 권장되며, 궁금한 부분은 상담 시 직접 문의해보시기 바랍니다.`,
      ];
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
    } else {
      // [v1.2] "이런 분들께 추천" 블록 + 권유 CTA 자동 삽입 제거
      //   사유: oriental v1.2 prompts에서 추천·권유 표현 차단 강화 (생활 기록 톤)
      //         외부 코드의 추천 블록 + "도움이 됩니다" CTA가 prompts와 정면 충돌
      //   처리: 마무리는 closing 빌더가 본인 상태 + 다음 일정으로 종결하도록 위임
      // (이전 코드: ORIENTAL_REC_MAP 추천 블록 + "비슷한 고민이라면 ~ 도움이 됩니다" CTA)
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

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  // [v3.6 fix] 해시태그를 cleanText 이후에 추가 — 해시태그 안 키워드 치환 방지
  //   기존: cleanText가 해시태그 안 "관절한방치료" 등을 "이 치료"로 치환 → "#압구정이 치료" 깨짐
  //   처리: cleanText 통과 후 buildOrientalHashtags 호출
  assembled = cleanOrientalText(assembled, subKw, region, validMode);
  // commercial 모드는 2회 통과
  if (validMode === "commercial") {
    assembled = cleanOrientalText(assembled, subKw, region, validMode);
  }
  // 해시태그는 클리닝 이후 추가 (치환 영향 차단)
  assembled += "\n\n" + buildOrientalHashtags(subKw, region, validMode);

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 상담 / 침치료 / 한약 / 부항 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(상담|침치료|한약|부항|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/침치료|침\s|약침|봉침|전침|매선/.test(s))            return "[이미지: 침치료 사진]";
    if (/한약|탕약|환약|보약|첩약|달이/.test(s))              return "[이미지: 한약 사진]";
    if (/부항|뜸|좌훈|온열|추나|도수|체외충격파/.test(s))      return "[이미지: 부항 사진]";
    if (/상담|진료|설명|차트|문진|원장|한의사|한의원/.test(s)) return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))            return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(상담|침치료|한약|부항|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC ──────────────────────────────────────────
  const qc = runQC(assembled, subKw, validMode);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, subKw);
  console.log(`[oriental] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[oriental] ⚠️ commercial 모드 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[oriental] ⚠️ commercial 모드 가격 ${qc.priceCount}건 잔존`);
  }

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry });

  // ── 이미지 메타 ─────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

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
    mode: validMode,
    qc: {
      hasInfoBlock: qc.hasInfoBlock,
      hasExamValue: qc.hasExamValue,
      kwCount: qc.kwCount,
      firstPersonCount: qc.firstPersonCount,
      priceCount: qc.priceCount,
      certaintyCount: qc.certaintyCount,
      recommendCount: qc.recommendCount,
      reviewFlowCount: qc.reviewFlowCount,
    },
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
