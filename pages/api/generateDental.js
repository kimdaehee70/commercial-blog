// ============================================================
// generateDental.js — 치과 블로그 생성기 v3.5
//
// 변경사항 (v3.5) — 실전 진단 3개 보정 (수원 임플란트 케이스):
//   ① [T] "통해" 반복 분산 — 시술명/치료/시술/상담/이 치료 5계열 회전
//      → "임플란트를 통해" 반복 → "임플란트 후" / "임플란트받고 나서" 등
//   ② injectKeywordDensity — fullKeyword(region+subKw) 본문 중간/후반 자연 삽입
//      → 결정 섹션 끝 + 변화 섹션 끝 2지점, 3회 미만일 때만 작동
//   ③ DENTAL_DECISION_CRITERIA — 마무리 결론 강화
//      "추천합니다" 감정 → "위치/상담/경험/사후관리" 4가지 객관 판단 기준
//   ④ 시스템 프롬프트 v3.5 가이드 추가 (통해 자제 + fullKeyword 분산)
//   ⑤ runQC: tongheCount + fullKwCount 신설 → 4회 초과/2회 미만 경고
//
// 변경사항 (v3.4) — clinic v3.4 후처리 로직 완전 이식:
//   ① cleanText 통합 (mode 분기 + 헤더 정규화 + 가격 치환 + 동사 변환)
//   ② [V/W/X/X-Min/V2/Y/Y2/B2/B/B3/Z] 모든 보정 단계 이식
//   ③ INFO_BLOCKS / EXAM_VALUES / runQC 정리
//   ④ 회복 타임라인 / 추천 대상 / 광고법 위반 자동 제거
//   ⑤ 이전 버그 수정:
//      - buildDentalHashtags 안에 cleanText 코드 잘못 들어가 있던 문제 해결
//      - runQC certaintyCount/recommendCount/reviewFlowCount 미정의 버그 해결
// ============================================================
import { DENTAL_TREATMENTS }                  from "../../lib/dental-data";
import { buildDentalPrompt, getDentalDirection } from "../../lib/dental-prompts";
import { DENTAL_FLOW_ENGINE }                 from "../../lib/dental-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";
// 🛡️ 과별 침투 차단 (v1.0) — 16개 업종 정체성 토큰 자동 차단
import { getCrossBlocks } from "../../lib/industryBlocks";
// 🛡️ 안전 제거 + 공백/조사 normalize (v1.0) — 강제 삽입 사고 방지
import { safeRemoveWords, fixThisTreatmentParticles, fixParticles, normalizeWhitespace } from "../../lib/safeRemove";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN)
// ============================================================
const DENTAL_FORBIDDEN_BASE = [
  // 광고성
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "인생 시술", "후회 제로", "강력 추천", "베스트",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 시술", "이 방법",
  // ⚠️ "이 치료가/를/은"은 빈 문자열로 제거하면 조사 깨짐 발생 (예: "이 치료를 통해" → " 통해")
  //    → 헤더 정규화(아래)에서 치료명으로 치환 처리하므로 여기 목록에서 제외
  "기준으로 살펴본", "관리 방법과 생활 속", "예방 전략",
  "체계적인 접근", "알아두면 좋은",
  // 성형외과·피부과 침투 차단
  "쌍꺼풀", "눈매교정", "눈밑지방", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "붓기 회복 일지", "멍 빠지는", "티 안 나게",
  // 한의원 침투 차단
  "추나", "한약", "뜸", "부항",
];

const DENTAL_FORBIDDEN_AI = [
  "드디어 결심하고", "결국 선택하게 되었어요", "마침내", "비로소",
  "마음이 편안해졌어요", "믿음이 갔어요", "친절하고 전문적이셔서",
  "따뜻한 분위기", "차분하고 따뜻한", "안정감 있는 분위기",
  "미소를 되찾았어요", "자신감을 찾았어요", "새로운 삶",
];

const DENTAL_FORBIDDEN_COMMERCIAL = [
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
//   - dental 자기 키워드 + EXEMPTIONS는 자동 면제
//   ⚠️ 새 업종 추가 시 lib/industryBlocks.js 만 수정
// ============================================================
const DENTAL_CROSS_BLOCK = getCrossBlocks("dental");

// ============================================================
// 1. INFO_BLOCKS — 결정 섹션 아래 자동 삽입
// ============================================================
const INFO_BLOCKS = {
  implant: {
    title: "임플란트 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 기간", "보통 3~6개월 (뼈 이식 시 추가)"],
      ["식립 시간", "1개당 30~60분"],
      ["회복 기간", "골유착 2~4개월"],
      ["재료", "타이타늄 픽스처 + 세라믹/지르코니아 보철"],
      ["주의 사항", "뼈 양·잇몸 상태 따라 적용 차이"],
    ],
  },
  braces: {
    title: "교정 방법별 일반 비교",
    rows: [
      ["항목", "투명교정", "일반교정", "설측교정"],
      ["외관", "거의 안 보임", "보임", "안 보임"],
      ["기간", "1~2년", "1.5~3년", "1.5~3년"],
      ["관리", "탈착 가능", "고정", "고정 안쪽"],
      ["적합 케이스", "경증·중등도", "전 케이스", "외관 부담 큰 분"],
    ],
  },
  rootcanal: {
    title: "신경치료 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 횟수", "보통 2~4회"],
      ["1회 시간", "30~60분"],
      ["보철 필요", "치료 후 크라운 권장"],
      ["성공률", "치아 보존이 일반적이나 개인차 있음"],
    ],
  },
  scaling: {
    title: "스케일링 일반 정보",
    rows: [
      ["항목", "내용"],
      ["권장 주기", "6개월~1년"],
      ["소요 시간", "30~60분"],
      ["보험 적용", "연 1회 건강보험 적용"],
      ["효과", "치석 제거, 잇몸 출혈 완화"],
    ],
  },
  default: {
    title: "치과 진료 검토 시 일반 안내",
    rows: [
      ["확인 항목", "내용"],
      ["전문의 자격", "치과 전문의 여부 확인"],
      ["상담 충실도", "충분한 상담 시간 제공 여부"],
      ["사후 관리", "치료 후 정기 점검 여부"],
      ["회복 기간", "치료별 일반 회복 기간 안내 받기"],
      ["주의 사항", "개인 구강 상태 따라 차이 있음"],
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
  implant: {
    duration: "치료 기간 보통 3~6개월",
    recovery: "골유착 2~4개월, 보철 후 일상 회복",
    pain:     "마취 후 통증 거의 없음, 통증점수 1~2점",
  },
  rootcanal: {
    duration: "1회 30~60분, 총 2~4회 방문",
    recovery: "치료 후 1~2일 시린 느낌",
    pain:     "통증점수 2~3점",
  },
  scaling: {
    duration: "30~60분 1회",
    recovery: "당일 일상 회복, 1~2일 잇몸 시린 느낌",
    pain:     "통증점수 1~2점",
  },
  wisdom: {
    duration: "발치 30~60분",
    recovery: "붓기 3~5일, 1주일 후 일상 회복",
    pain:     "통증점수 3~5점, 진통제로 조절",
  },
  default: {
    duration: "치료별 상이",
    recovery: "회복 기간은 치료·개인차 따라 다름",
    pain:     "통증은 시술 방식에 따라 차이 있음",
  },
};

function getExamValues(treatmentId) {
  return EXAM_VALUES[treatmentId] || EXAM_VALUES.default;
}

// ============================================================
// 3. 제목 생성 (mode 분기)
// ============================================================
function buildDentalTitle(treatmentName, region, seoData, blogTypeId, mode) {
  if (mode === "commercial") {
    const defaults = [
      `${region} ${treatmentName} 진료 안내｜치료 과정과 일반 정보 정리`,
      `${region} ${treatmentName} 정보 가이드｜치과 검토 시 확인할 항목`,
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
    `${treatmentName} 고민 3개월｜${region} 치과에서 받고 나서 드는 생각`,
    `${region} ${treatmentName}｜두려워서 미루다가 결국 결정한 이야기`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기)
// ============================================================
function buildDentalHashtags(treatmentName, region, mode) {
  const kw = treatmentName.replace(/\s/g, "");
  if (mode === "commercial") {
    return [
      `#${region}${kw}`, `#${kw}정보`, `#${kw}안내`,
      `#${kw}`, `#${region}치과`, `#치과정보`,
      `#${region}진료안내`, `#치과진료`,
    ].slice(0, 8).join(" ");
  }
  return [
    `#${region}${kw}`, `#${kw}후기`, `#${kw}상담`,
    `#${kw}`, `#${region}치과`, `#치과후기`,
    `#${region}후기`, `#치아건강`, `#${region}치과추천`,
  ].slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기) — clinic v3.4 후처리 로직 완전 이식
// ============================================================
function cleanDentalText(text, treatmentName, region, mode = "personal") {
  let result = text;

  // 공통: 기본 + AI 냄새 금지어
  const removeList = [...DENTAL_FORBIDDEN_BASE, ...DENTAL_FORBIDDEN_AI, ...DENTAL_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...DENTAL_FORBIDDEN_COMMERCIAL);

  // 🛡️ v1.0 — 단순 forEach replace 대신 safeRemoveWords 사용
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전에는 forEach로 빈 문자열 치환 → "시술하는" → " 하는" 사고 발생
  result = safeRemoveWords(result, removeList);

  // 조사 오류 교정 (치료명 + 잘못된 조사)
  result = result
    .replace(/임플란트는(?=\s)/g, "임플란트는")
    .replace(/스케일링를/g, "스케일링을")
    .replace(/교정를/g, "교정을")
    .replace(/신경치료를(?=\s)/g, "신경치료를")
    .replace(/사랑니를(?=\s)/g, "사랑니를");

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
  // [본문 정규화 v2.0] safeRemove 모듈로 위임 (강제 삽입 사고 방지)
  //   - "이 치료은 → 이 치료는" / "이 치료의 필요 → 이 치료가 필요" 보정
  //   - 톤 약화 (추천드리고 싶어요 → 고려해볼 수 있어요)
  //   - {치료명} 받침 자동 보정
  //   ⚠️ v1.0의 "통해 강제 삽입" 패턴 제거 — 따옴표 직후 등에서 사고 발생
  //      예: "검색해보니" 통해 → 잘못 매칭되어 "이 치료를 통해" 삽입
  // ─────────────────────────────────────────────────────
  result = fixThisTreatmentParticles(result);
  result = fixParticles(result, treatmentName);

  // {치료명}이 과정/단계 보정 (치료명 의존 — 모듈에선 처리 못함)
  {
    const tnEscEarly = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      .replace(new RegExp(`${tnEscEarly}이\\s+(과정|단계|시간|결과|이후|이전)`, "g"), `${treatmentName}의 $1`);
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

  // ─────────────────────────────────────────────────────
  // [V v2.0] 치료명 빈자리 복구 — 🚫 비활성화 (사고 원인)
  //   원래 의도: FORBIDDEN 제거 후 "에서   받" 같은 빈자리에 "이 치료를" 강제 삽입
  //   문제: safeRemoveWords가 normalize 처리하므로 이중 공백 자체가 안 생김
  //         + 다른 합법 문맥("따옴표"+공백+동사) 까지 잘못 매칭되어 사고 발생
  //   ⚠️ 다시 활성화하지 말 것 — 같은 사고 재발
  /*
  result = result.replace(/에서\s{2,}받/g, "에서 이 치료를 받");
  result = result.replace(/에서\s{2,}선택/g, "에서 이 치료를 선택");
  result = result.replace(/에서\s{2,}결정/g, "에서 이 치료를 결정");
  result = result.replace(/에서\s{2,}고려/g, "에서 이 치료를 고려");
  result = result.replace(/에서\s{2,}알아보/g, "에서 이 치료를 알아보");
  result = result.replace(/에서\s{2,}찾/g, "에서 이 치료를 찾");
  result = result.replace(/([.!?])\s{2,}(받기로|받고|받는|받았)/g, "$1 이 치료를 $2");
  result = result.replace(/(^|[\s.!?,])(을|를)\s+(만들어|찾던|알아보던|고려하던)/g, "$1 이 치료를 $3");
  */
  // 줄 시작 깨진 조사 제거 — 이건 안전한 정리이므로 유지
  result = result.replace(/^\s*(을|를|가|은|는|에서|으로|로)\s+/gm, "");
  result = result.replace(/^\s*이\s+(?!치료|병원|방법|진료|곳|집|쪽|분야|업종)/gm, "");

  // ─────────────────────────────────────────────────────
  // 🚫 [W] [W2] [X] [X-Min] [V2] 5중 후처리 체인 비활성화 (v2.0)
  //   원래 의도:
  //     [W]/[W2] — "{치료명}이 치료" 비문 처리
  //     [X]      — 치료명 6회+ → "이 치료"로 분산
  //     [X-Min]  — 치료명 5회- → "이 치료" 일부 역치환
  //     [V2]     — 위 결과의 잔해 비문 정리
  //   문제 (실증):
  //     5개가 순차 실행되면 상호 충돌 → "임플란트가 치료" / "임플란트가 치과"
  //     같은 비문이 5회+ 누적 발생 (강남 임플란트 글에서 확인)
  //   v2.0 결정:
  //     - safeRemove + fixParticles + fixThisTreatmentParticles 조합으로 충분
  //     - 키워드 횟수 강제 제어 X (GPT 자연 출력 신뢰)
  //   ⚠️ 다시 활성화하지 말 것 — 같은 사고 재발
  /*
  // [W] 조사 깨짐 보정
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료로`, "g"), `${treatmentName} 치료로`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료에`, "g"), `${treatmentName} 치료에`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료은`, "g"), `${treatmentName} 치료은`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료을`, "g"), `${treatmentName} 치료을`);

  // [W2] 치료명 + "이 치료 치료" / "이 치료 [동사]" 비문 처리
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+치료`, "g"), `${treatmentName} 치료`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료([을를이가은는의과와도만]|으로|로)\\s`, "g"), `${treatmentName}$1 `);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+(?=[가-힣])`, "g"), `${treatmentName}이 `);

  // [X] 키워드 + 치환 총량 제어 — 대체어 임계 3회
  {
    const kwRegex = new RegExp(tnEsc, "g");
    const MAX_REPLACEMENTS = 3;
    let count = 0;
    let replaced = 0;
    result = result.replace(kwRegex, (m) => {
      count++;
      if (count <= 6) return m;
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

  // [V2] 치환 후 보정 — 위 [X]/[X-Min] 잔해 정리용 (현재 불필요)
  result = result
    .replace(/이\s*치료가\s+말에/g, "그 말에")
    .replace(/이\s*치료가\s+이야기에/g, "그 이야기에")
    .replace(/이\s*치료\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    .replace(/이\s*치료가\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    .replace(/이\s*치료가?\s+후기/g, "그 후기")
    .replace(/이\s*치료\s+치료(?![가-힣])/g, "이 치료")
    .replace(/이\s*치료가\s+치료(?![가-힣])/g, "이 치료")
    .replace(/이\s*치료가\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|시간|기간|상황|경험|선택|순간|중요|필요|기대|걱정|불안|이야기|설명|안내|결정|판단|이해|기억|느낌|생각|부분|두\s*가지|세\s*가지|덕분|때문)/g, "이 치료의 $1")
    .replace(/이\s*치료가\s+(만족|적절|중요|필요|좋[으았은])/g, "이 치료는 $1")
    .replace(new RegExp(`${tnEsc}이\\s+(부분|두\\s*가지|세\\s*가지|덕분|때문)`, "g"), `${treatmentName} $1`)
    .replace(new RegExp(`${tnEsc}이\\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|상황|경험|선택|순간|이야기|설명|안내|결정|느낌|생각)`, "g"), `${treatmentName}의 $1`)
    .replace(/(이\s*치료[을를이가은는의로]?\s+){2,}/g, "이 치료 ");
  */

  // 최소 안전 보정만 유지 (V2의 ① ③ 만 잔존)
  result = result
    .replace(/이\s*치료가\s+말에/g, "그 말에")
    .replace(/이\s*치료가?\s+후기/g, "그 후기");

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
  // [T 신설 v3.5] "통해" 반복 분산 — AI 패턴 + SEO 점수 깎임
  //   원인: GPT가 "임플란트를 통해", "치료를 통해", "상담을 통해" 반복
  //   처리: 3회째부터 다른 표현으로 회전 분산 (의미 보존)
  //         "치료를 통해" → "치료 후" / "치료받고" / "시술 이후"
  // ─────────────────────────────────────────────────────
  {
    const tnEsc2 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ① 시술명+조사+통해 패턴
    const tongheVariants1 = ["을 받고 나서", "을 진행한 뒤", "을 마친 후"];
    let cnt1 = 0;
    result = result.replace(new RegExp(`${tnEsc2}을\\s+통해`, "g"), (m) => {
      cnt1++;
      if (cnt1 <= 1) return m;
      return `${treatmentName}${tongheVariants1[(cnt1 - 2) % tongheVariants1.length]}`;
    });
    let cnt1b = 0;
    result = result.replace(new RegExp(`${tnEsc2}를\\s+통해`, "g"), (m) => {
      cnt1b++;
      if (cnt1b <= 1) return m;
      return `${treatmentName}${tongheVariants1[(cnt1b - 2) % tongheVariants1.length]}`;
    });

    // ② "치료를 통해" / "치료 통해" 일반 패턴
    const tongheVariants2 = ["치료 이후", "치료받고 나니", "치료 후"];
    let cnt2 = 0;
    result = result.replace(/치료를?\s+통해/g, (m) => {
      cnt2++;
      if (cnt2 <= 1) return m;
      return tongheVariants2[(cnt2 - 2) % tongheVariants2.length];
    });

    // ③ "시술을 통해" / "시술 통해"
    const tongheVariants3 = ["시술 이후", "시술받고 나니", "시술 후"];
    let cnt3 = 0;
    result = result.replace(/시술을?\s+통해/g, (m) => {
      cnt3++;
      if (cnt3 <= 1) return m;
      return tongheVariants3[(cnt3 - 2) % tongheVariants3.length];
    });

    // ④ "상담을 통해" — 1회는 자연스러우므로 보존, 2회+만 회전
    const tongheVariants4 = ["상담받고 나서", "상담 자리에서", "상담 자리에서 직접"];
    let cnt4 = 0;
    result = result.replace(/상담을?\s+통해/g, (m) => {
      cnt4++;
      if (cnt4 <= 1) return m;
      return tongheVariants4[(cnt4 - 2) % tongheVariants4.length];
    });

    // ⑤ "이 치료를 통해" / "이 치료 통해"
    const tongheVariants5 = ["이 치료 후", "이 치료받고 나니", "이 치료 이후"];
    let cnt5 = 0;
    result = result.replace(/이\s*치료를?\s+통해/g, (m) => {
      cnt5++;
      if (cnt5 <= 1) return m;
      return tongheVariants5[(cnt5 - 2) % tongheVariants5.length];
    });
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
    if (/(잇몸이|치아가|구강이|입안이|결과가|모습이)\s*$/.test(trimmed)) {
      console.log(`[v3.4 잔해복구] 미완성 → 종결 추가: "${trimmed}"`);
      return line + " 회복되었어요.";
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
function insertDentalTimeline(text, treatmentName, mode) {
  if (mode === "commercial") return text;
  const hasTimeline = /일차|일째|주일|개월/.test(text);
  if (!hasTimeline) return text;
  const isImplant = /임플란트/.test(treatmentName);
  const isWisdom  = /사랑니/.test(treatmentName);
  const isScaling = /스케일링/.test(treatmentName);
  const day7Note  = isImplant ? "식립 부위 안정화, 부드러운 식사 가능"
                  : isWisdom  ? "붓기 대부분 빠짐, 일반 식사 가능"
                  : isScaling ? "잇몸 민감도 정상화"
                  : "회복 진행 중";
  const timeline = `\n\n**회복 요약**\n- 1~2일차: 통증·붓기 가장 심함\n- 3~5일차: 부드러운 식단 유지\n- 7일차: ${day7Note}\n- 1개월: 일상 식사 완전 회복`;
  return text.trimEnd() + timeline;
}

// ============================================================
// 7. 추천 대상 (personal 전용)
// ============================================================
const DENTAL_REC_MAP = {
  "임플란트":         ["치아가 1개 이상 빠진 경우", "틀니 불편함을 해소하고 싶은 경우", "자연치아에 가까운 기능을 원하는 경우"],
  "라미네이트":       ["앞니 착색·변색이 심한 경우", "치아 모양을 빠르게 개선하고 싶은 경우"],
  "투명교정":         ["직장인·성인으로 심미적 교정을 원하는 경우", "철 교정이 부담스러운 경우"],
  "신경치료":         ["충치가 신경까지 진행된 경우", "치아를 최대한 살리고 싶은 경우"],
  "스케일링":         ["1년에 1회 정기 구강 관리가 필요한 경우", "잇몸 출혈·구취가 있는 경우"],
  "사랑니발치":       ["사랑니로 잇몸이 자주 붓는 경우", "발치 두려움 때문에 미루고 있는 경우"],
  "지르코니아크라운": ["신경치료 후 크라운이 필요한 경우", "심미성과 내구성을 함께 원하는 경우"],
  "치아미백":         ["커피·차·흡연으로 착색이 심한 경우", "빠른 효과를 원하는 경우"],
  "턱관절치료":       ["턱에서 소리가 나거나 통증이 있는 경우", "이갈이·이 악물기 습관이 있는 경우"],
};

// ============================================================
// 7-2. 판단 기준 (v3.5 신설) — 결론 강화용
//   원인: 마무리가 "추천합니다" / "좋겠어요" 감정 반복 → 상단 유지력↓
//   처리: 치료별 객관적 판단 기준 4가지 제시 (정보형 결론)
// ============================================================
const DENTAL_DECISION_CRITERIA = {
  "임플란트": [
    "위치: 통원 부담을 줄여 사후 관리까지 꾸준히 받을 수 있는 거리인지",
    "상담: 상태 진단·치료 계획·예상 비용을 충분히 설명받을 수 있는지",
    "경험: 임플란트 케이스 누적이 충분한지, 보철 단계까지 일관되게 진행되는지",
    "사후 관리: 정기 검진·보철 교체까지 장기적으로 관리받을 수 있는 체계가 있는지",
  ],
  "라미네이트": [
    "위치: 디자인 시안 확인·재방문이 편한 거리인지",
    "상담: 치아 삭제량·자연치 보존 방식을 명확히 설명받는지",
    "경험: 케이스별 시안과 결과가 충분한지",
    "사후 관리: 색·접착 상태 점검을 정기적으로 받을 수 있는지",
  ],
  "투명교정": [
    "위치: 2~4주 간격 점검을 부담 없이 받을 수 있는 거리인지",
    "상담: 교정 기간·예상 단계 수·중도 변경 가능성을 안내받는지",
    "경험: 동일 시스템(인비절라인 등) 케이스 누적이 충분한지",
    "사후 관리: 유지장치 단계까지 책임지는지",
  ],
  "신경치료": [
    "위치: 치료 후 통증·재내원 시 빠르게 방문할 수 있는 거리인지",
    "상담: 신경 상태·재신경치료 가능성·크라운 단계까지 일관되게 안내받는지",
    "경험: 마이크로스코프·러버댐 등 정밀 장비를 사용하는지",
    "사후 관리: 크라운 후 정기 점검 체계가 있는지",
  ],
  "스케일링": [
    "위치: 1년 1~2회 정기 방문에 부담 없는 거리인지",
    "상담: 잇몸 상태 진단을 함께 안내받는지",
    "경험: 잇몸 출혈·민감도가 큰 경우에도 부드럽게 진행되는지",
    "사후 관리: 잇몸치료가 필요할 경우 단계별 안내가 있는지",
  ],
  "사랑니발치": [
    "위치: 발치 후 통증·붓기 발생 시 빠르게 방문할 수 있는 거리인지",
    "상담: CT·파노라마로 신경 위치를 정확히 확인하는지",
    "경험: 매복·수평 사랑니 발치 케이스 누적이 충분한지",
    "사후 관리: 봉합 제거·합병증 발생 시 후속 진료가 가능한지",
  ],
  "지르코니아크라운": [
    "위치: 보철 시안 확인·재방문이 편한 거리인지",
    "상담: 자연치 색조 매칭·교합 조정을 충분히 진행하는지",
    "경험: 보철 케이스 누적이 충분한지",
    "사후 관리: 교합·접착 상태 점검을 정기적으로 받을 수 있는지",
  ],
  "치아미백": [
    "위치: 추가 시술 시 재방문 부담이 적은 거리인지",
    "상담: 시린이 발생 가능성·미백 한계를 명확히 안내받는지",
    "경험: 전문가·홈블리칭 병행 케이스 누적이 충분한지",
    "사후 관리: 색 유지 관리·재시술 가능 여부 안내가 있는지",
  ],
  "턱관절치료": [
    "위치: 장기 진료가 필요하므로 통원 부담이 적은 거리인지",
    "상담: 영상·근육·교합까지 다각도로 진단받는지",
    "경험: 스플린트·물리치료 등 단계별 접근이 가능한지",
    "사후 관리: 증상 변화에 따른 장기 추적이 가능한지",
  ],
};
function getDecisionCriteria(treatmentName) {
  return DENTAL_DECISION_CRITERIA[treatmentName] || [
    `위치: ${treatmentName} 진료 후 재방문에 부담이 없는 거리인지`,
    `상담: 치료 계획·예상 기간·비용을 충분히 안내받을 수 있는지`,
    `경험: ${treatmentName} 케이스 누적이 충분한지`,
    `사후 관리: 정기 점검까지 장기적으로 진행되는지`,
  ];
}

// ============================================================
// 7-3. 키워드 밀도 보정 (v3.5 신설)
//   원인: "OO 임플란트 잘하는 곳" 등 fullKeyword가 초반에만 노출
//   처리: 본문 중간/후반에 자연스러운 문장 2회 자연 삽입
//        - 결정 섹션 직후 1회 (fullKeyword)
//        - 변화 섹션 직후 1회 (fullKeyword)
// ============================================================
function injectKeywordDensity(text, fullKeyword, treatmentName, region) {
  // 이미 충분히 분포된 경우 스킵 (3회 이상)
  const fkEsc = fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fkCount = (text.match(new RegExp(fkEsc, "g")) || []).length;
  if (fkCount >= 3) return text;

  const insertA = `\n\n${fullKeyword}을(를) 찾을 때 가장 먼저 봤던 건 거리·상담 분위기였어요. 멀면 아무리 좋아도 사후 관리가 어렵거든요.\n`;
  const insertB = `\n\n${region}에서 ${treatmentName} 고민이라면, 처음부터 한 곳만 보지 말고 2~3곳 비교 상담해보는 걸 권합니다.\n`;

  let result = text;
  let inserted = 0;

  // 1순위: 결정 섹션 끝 (다음 ## 헤더 직전)
  const decisionIdx = result.indexOf("## 결정");
  if (decisionIdx !== -1 && inserted < 1) {
    const nextHeader = result.indexOf("\n##", decisionIdx + 5);
    if (nextHeader !== -1) {
      result = result.slice(0, nextHeader) + insertA + result.slice(nextHeader);
      inserted++;
    }
  }

  // 2순위: 변화/결과 섹션 끝
  const resultIdx = result.lastIndexOf("## 변화");
  if (resultIdx !== -1 && inserted < 2) {
    const nextHeader = result.indexOf("\n##", resultIdx + 5);
    if (nextHeader !== -1) {
      result = result.slice(0, nextHeader) + insertB + result.slice(nextHeader);
      inserted++;
    } else {
      // 변화가 마지막 섹션
      result = result + insertB;
      inserted++;
    }
  }
  // 폴백: 시술 후/치료 후 변화
  if (inserted === 0) {
    const fbIdx = result.indexOf("## 시술 후") !== -1
      ? result.indexOf("## 시술 후")
      : result.indexOf("## 치료 후");
    if (fbIdx !== -1) {
      const nextHeader = result.indexOf("\n##", fbIdx + 5);
      if (nextHeader !== -1) {
        result = result.slice(0, nextHeader) + insertA + result.slice(nextHeader);
      } else {
        result = result + insertA;
      }
    }
  }

  console.log(`[dental][v3.5] 키워드 밀도 보정: ${inserted}회 삽입 (기존 ${fkCount}회)`);
  return result;
}


// ============================================================
// 8. QC 체크
// ============================================================
function runQC(text, treatmentName, mode, fullKeyword) {
  const charCount = calcCharCount(text);

  const hasInfoBlock = /\|\s*항목\s*\||\|\s*확인 항목\s*\||\|\s*[가-힣]+\s*\|/.test(text);
  const hasExamValue = /\d+\s*(분|일|주|개월|회|점|만원)/.test(text);
  const kwCount = (text.match(new RegExp(treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const firstPersonCount = (text.match(/저는\s|제가\s|내가\s|나는\s|저도\s|받아봤|받았더|느꼈어|느꼈다|결심했어|결정했어|고민했어/g) || []).length;
  const priceCount = (text.match(/\d+\s*만원/g) || []).length;
  const certaintyCount = (text.match(/좋아졌|또렷해졌|만족합|만족했|마음에 들었|확실히 좋|확실히 효과|분명히 좋|완치|100%|결과가 좋/g) || []).length;
  const recommendCount = (text.match(/추천합|추천해요|추천드립|꼭 받|상담\s*받아보|받아보시|도움이 됩|도움이 될/g) || []).length;
  const reviewFlowCount = (text.match(/고민하다가|결국 받|결심하고|결정했다|받기로 했|받고 나서/g) || []).length;

  // v3.5 신설
  const tongheCount = (text.match(/통해/g) || []).length;
  const fullKwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;

  console.log(`[dental][QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[dental][QC] 수치: ${hasExamValue}`);
  console.log(`[dental][QC] 키워드반복: ${kwCount}`);
  console.log(`[dental][QC] 통해(2회 이하 권장): ${tongheCount}`);
  if (fullKeyword) console.log(`[dental][QC] 완전체키워드(${fullKeyword}): ${fullKwCount}`);
  if (mode === "commercial") {
    console.log(`[dental][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[dental][QC] 가격(commercial 위반): ${priceCount}건`);
    console.log(`[dental][QC] 효과단정(commercial 위반): ${certaintyCount}건`);
    console.log(`[dental][QC] 추천유도(commercial 위반): ${recommendCount}건`);
    console.log(`[dental][QC] 후기흐름(commercial 위반): ${reviewFlowCount}건`);
  }

  return {
    hasInfoBlock, hasExamValue, kwCount,
    firstPersonCount, priceCount,
    certaintyCount, recommendCount, reviewFlowCount,
    tongheCount, fullKwCount,
    charCount,
  };
}

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;

  // ① 줄 시작 헤더 변환 (제목·섹션·하위섹션)
  t = t.replace(/^#\s+(.+)$/gm, "$1");                    // # 제목 → 평문
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");              // ## 섹션 → 빈줄+텍스트+빈줄
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");                // ### 변화(1일/1주) → ▶ 마커

  // ② 인라인에 끼어있는 헤더 (줄바꿈 없이 본문 중간에 박힌 경우)
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1"); // " ## 제목" → 줄바꿈
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1"); // " ### 1일" → 줄바꿈+마커

  // ③ 굵게/이탤릭 마크다운 제거 (혹시 GPT가 출력했을 경우)
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");                 // **굵게** → 평문
  t = t.replace(/\*([^*]+)\*/g, "$1");                     // *이탤릭* → 평문

  // ④ 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleDental(req, res) {
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
  const industry   = "dental";
  const validMode  = (mode === "commercial") ? "commercial" : "personal";
  console.log(`[dental] mode: ${validMode}`);

  // ── dental 시술 검증 ─────────────────────────────────
  const DENTAL_IDS = ["implant","laminate","braces","rootcanal","scaling","wisdom","zirconia","whitening","tmj",
                      "resin","inlay","ceramic_crown","metal_braces","lingual_braces","periodontal","gum_contour","pedo_caries","implant_redo"];
  const DENTAL_NAMES = ["임플란트","라미네이트","투명교정","신경치료","스케일링","사랑니발치","지르코니아크라운","치아미백","턱관절치료",
                        "레진치료","인레이·온레이","올세라믹크라운","일반교정","설측교정","잇몸치료","잇몸성형","소아충치치료","임플란트재수술"];
  const isDental = DENTAL_IDS.includes(program.id) || DENTAL_NAMES.includes(subKw);
  if (!isDental) {
    console.error(`[dental] 잘못된 치료 진입 차단: ${subKw}`);
    return res.status(400).json({ error: `치과 생성기에 잘못된 치료가 전달되었습니다: ${subKw}` });
  }
  console.log(`[dental] 치료 검증 통과: ${subKw}`);

  // ── 시술 데이터 로드 ─────────────────────────────────
  const treatmentData = DENTAL_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || DENTAL_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 (mode 분기) ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 ${region} 지역 ${subKw} 진료 정보를 정리하는 정보형 블로그 작가입니다.
업종: 치과 | 치료: ${subKw} | 지역: ${region}

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
업종: 치과 | 치료: ${subKw} | 지역: ${region}
[절대 금지] 성형외과·피부과 관련 표현 일절 사용 금지
[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함

[v3.5 표현 다양성 규칙]
- "${subKw}을(를) 통해" / "치료를 통해" / "시술을 통해" 표현은 글 전체 1회 이내로만 사용
  → 대체: "${subKw} 후" / "${subKw} 받고 나서" / "치료 이후" / "시술 이후" / "받고 나니"
- "좋을 것 같아요" / "좋겠어요" 같은 추정형 마무리 자제 → 객관적 정보·근거 제시
- "${region} ${subKw}" 복합 키워드를 본문 중간·후반에도 자연스럽게 2~3회 등장시킬 것
  → 단, 같은 문장 안 반복 금지

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
  const SECTIONS = DENTAL_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = buildDentalPrompt(sec.key, treatmentData, region, { mode: validMode });
    const prevBlock  = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: dental | 키워드: ${subKw} | 지역: ${region} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 성형외과·피부과 표현 금지. 200자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanDentalText(secText, subKw, region, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      console.log(`[dental] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanDentalText(retry, subKw, region, validMode);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, subKw);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[dental] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 치료 / 보철 / 일상
  const DENTAL_ALT_POOL = ["검사 사진", "상담 사진", "치료 사진", "보철 사진", "일상 사진"];
  const _DENTAL_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "검사 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "치료 사진",
    result:   "보철 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _DENTAL_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (mode 분기) ─────────────────────────
  let title = overrideTitle || buildDentalTitle(subKw, region, seoData, blogTypeId, validMode);
  const DENTAL_TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|써마지|필러|보톡스|피코레이저|성형외과/;
  if (DENTAL_TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜치료 과정과 일반 정보`
      : `${region} ${subKw} 후기｜두려워서 미루다가 결국 결정한 이야기`;
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
    sectionTexts["result"] = insertDentalTimeline(sectionTexts["result"], subKw, validMode);
  }

  // ── 마무리 섹션 (mode 분기) ─────────────────────
  //   v3.5: 결론 강화 — "추천합니다" 감정 → "판단 기준" 정보형
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    if (validMode === "commercial") {
      const commercialCTAs = [
        `\n\n${subKw}에 대한 정보는 일반적인 안내일 뿐, 개인의 구강 상태에 따라 적용은 달라질 수 있습니다. 정확한 진단과 치료 방향은 의료진과 직접 상담하여 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${subKw} 진료에 대한 일반 정보 안내입니다. 적합 여부·회복 경과는 개인차가 있으므로, ${region} 내 치과에서 충분한 상담 후 결정하시는 것이 좋습니다.`,
        `\n\n${subKw} 관련 일반 정보를 정리한 내용입니다. 본인 상태에 맞는 치료 방법은 치과 진료 후 안내받는 것이 권장되며, 궁금한 부분은 상담 시 직접 문의해보시기 바랍니다.`,
      ];
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
    } else {
      // personal v3.5: 추천 대상 + 판단 기준(객관적) + 짧은 정보형 마무리
      const recList = DENTAL_REC_MAP[subKw] || [];
      const recBlock = recList.length > 0
        ? `\n\n**이런 경우에 고려해볼 만해요**\n${recList.map(r => `- ${r}`).join("\n")}`
        : "";

      const decisionList = getDecisionCriteria(subKw);
      const decisionBlock = `\n\n**${region}에서 ${subKw} 병원 고를 때 본 판단 기준**\n${decisionList.map(d => `- ${d}`).join("\n")}`;

      const closing = `\n\n${region} ${subKw} 자체보다 위 4가지를 더 비중 있게 봤어요. 같은 ${subKw}이라도 어느 곳에서 받느냐로 사후 관리 만족도가 갈리더라고요.`;

      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + recBlock
        + decisionBlock
        + closing;
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

  // ── v3.5: 키워드 밀도 보정 (해시태그 추가 전, cleanText 전) ──
  if (validMode === "personal") {
    const fullKeyword = `${region} ${subKw}`;
    assembled = injectKeywordDensity(assembled, fullKeyword, subKw, region);
  }

  assembled += "\n\n" + buildDentalHashtags(subKw, region, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  assembled = cleanDentalText(assembled, subKw, region, validMode);
  // commercial 모드는 2회 통과
  if (validMode === "commercial") {
    assembled = cleanDentalText(assembled, subKw, region, validMode);
  }

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 치료 / 보철 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|치료|보철|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|엑스레이|X.?ray|CT|파노라마|영상|진단/i.test(s)) return "[이미지: 검사 사진]";
    if (/보철|크라운|임플란트\s*보철|틀니|라미네이트|세라믹/.test(s)) return "[이미지: 보철 사진]";
    if (/치료|시술|발치|신경치료|충치|스케일링|교정|식립/.test(s)) return "[이미지: 치료 사진]";
    if (/상담|진료|설명|차트|원장|의사|치과/.test(s))         return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|치료|보철|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC ──────────────────────────────────────────
  const fullKeywordForQC = `${region} ${subKw}`;
  const qc = runQC(assembled, subKw, validMode, fullKeywordForQC);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, subKw);
  console.log(`[dental] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  // v3.5 경고
  if (qc.tongheCount > 4) console.warn(`[dental] ⚠️ "통해" ${qc.tongheCount}회 — AI 패턴 위험`);
  if (validMode === "personal" && qc.fullKwCount < 2) console.warn(`[dental] ⚠️ "${fullKeywordForQC}" 노출 ${qc.fullKwCount}회 — 키워드 밀도 부족`);

  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[dental] ⚠️ commercial 모드 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[dental] ⚠️ commercial 모드 가격 ${qc.priceCount}건 잔존`);
  }

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry });

  // ── 이미지 메타 ─────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const assembledMarkdown = assembled;                         // 마크다운 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled);  // 네이버 복사용 평문
  const charCountPlain    = calcCharCount(assembledPlain);

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
      tongheCount: qc.tongheCount,
      fullKwCount: qc.fullKwCount,
    },
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
