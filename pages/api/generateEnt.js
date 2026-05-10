// ============================================================
// generateEnt.js — 이비인후과 블로그 생성기 v3.4
//
// 변경사항 (v3.4) — clinic v3.4 후처리 로직 완전 이식:
//   ① cleanText 통합 (mode 분기 + 헤더 정규화 + 가격 치환 + 동사 변환)
//   ② [V/W/X/X-Min/V2/Y/Y2/B2/B/B3/Z] 모든 보정 단계 이식
//   ③ INFO_BLOCKS / EXAM_VALUES / runQC 정리
//   ④ 회복 타임라인 / 추천 대상 / 광고법 위반 자동 제거
//   ⑤ 이전 버그 수정:
//      - buildEntHashtags 안에 cleanText 코드 잘못 들어가 있던 문제 해결
//      - runQC certaintyCount/recommendCount/reviewFlowCount 미정의 버그 해결
// ============================================================
import { ENT_TREATMENTS }                  from "../../lib/ent-data";
import { buildEntPrompt, getEntDirection } from "../../lib/ent-prompts";
import { ENT_FLOW_ENGINE }                 from "../../lib/ent-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";

// ★ v2.0 — 과별 침투 차단 + 안전 단어 제거 모듈
import { getCrossBlocks } from "../../lib/industryBlocks";
import { safeRemoveWords, fixThisTreatmentParticles, fixParticles } from "../../lib/safeRemove";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN)
// ============================================================
const ENT_FORBIDDEN_BASE = [
  // 광고성
  // ⚠️ v2.2: "중요합니다", "확인하세요" 제거 — commercial 모드 정보형 글에서
  //    "선택하는 것이 중요합니다" → "선택하는 것이." 미완성 문장 유발
  //    이 두 표현은 광고법 위반이 아니므로 유지해도 무해
  "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "인생 시술", "후회 제로", "강력 추천", "베스트",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 시술", "이 방법",
  // ⚠️ "이 치료가/를/은"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 치료를 통해" → " 통해" / "이 치료의 필요" → 문장 와해
  //    → 헤더 정규화(아래)에서 치료명으로 치환 + 본문 정규화 블록에서 안전 보정 처리
  "기준으로 살펴본", "관리 방법과 생활 속", "예방 전략",
  "체계적인 접근", "알아두면 좋은",
  // 성형외과·피부과 침투 차단
  "쌍꺼풀", "눈매교정", "리프팅", "울쎄라", "써마지", "필러", "보톡스",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "붓기 회복 일지", "멍 빠지는", "티 안 나게",
  // 치과 침투 차단
  "임플란트", "스케일링", "사랑니", "크라운", "치석", "잇몸치료", "치주",
  // 한의원 침투 차단
  "추나", "한약", "뜸", "부항",
];

const ENT_FORBIDDEN_AI = [
  "드디어 결심하고", "결국 선택하게 되었어요", "마침내", "비로소",
  "마음이 편안해졌어요", "믿음이 갔어요", "친절하고 전문적이셔서",
  "따뜻한 분위기", "차분하고 따뜻한", "안정감 있는 분위기",
  "미소를 되찾았어요", "자신감을 찾았어요", "새로운 삶",
];

const ENT_FORBIDDEN_COMMERCIAL = [
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
  // ★ v2.1 — 검증 글 잔존 광고법 톤 (HANDOFF B항목)
  // ⚠️ "신뢰가 갔어요" / "믿음이 갔어요" 등은 personal에선 자연스러우므로
  //    commercial 모드 한정으로 차단 (이 배열은 commercial일 때만 합류)
  "믿음이 갔어요", "믿음이 갑니다", "신뢰가 갔어요", "신뢰가 갑니다",
  "체감 변화가 있", "체감 변화는",
  "친절하게 설명해 주시니까", "꼼꼼한 상담 덕분에", "꼼꼼하게 설명해",
  "잘한 결정이라는 생각", "선택하길 잘했다는 생각",
  "마음이 놓이더라고요", "마음이 한결 가벼워",
  "후기 보고 결정", "후기를 보고 결정",
  "장기적으로도 만족", "최신 장비와 기술",
];

// ★ v2.0 — 과별 침투 차단 (lib/industryBlocks.js)
//   다른 과 정체성 키워드 자동 차단 (한 곳 수정 = 16개 파일 동시 적용)
const ENT_CROSS_BLOCK = getCrossBlocks("ent");

// ============================================================
// 1. INFO_BLOCKS — 결정 섹션 아래 자동 삽입
// ============================================================
const INFO_BLOCKS = {
  rhinitis: {
    title: "비염 치료법 일반 비교",
    rows: [
      ["항목", "약물치료", "면역치료", "수술"],
      ["기간", "복용 중 효과", "3~5년 장기", "1회"],
      ["근본 개선", "증상 완화", "장기 개선 가능", "구조 교정"],
      ["적합 케이스", "경증·일시적", "약 의존 심한 경우", "비중격·구조 문제"],
    ],
  },
  sinusitis: {
    title: "축농증 치료법 일반 비교",
    rows: [
      ["항목", "약물치료", "내시경 수술"],
      ["기간", "2~4주", "1회"],
      ["회복 기간", "복용 중", "1~2주"],
      ["적합 케이스", "급성", "만성 반복"],
    ],
  },
  tonsil: {
    title: "편도 수술 일반 정보",
    rows: [
      ["항목", "내용"],
      ["수술 시간", "30~60분"],
      ["입원 기간", "1~2일 (의료진 안내)"],
      ["회복 기간", "1~2주"],
      ["적합 케이스", "연 4회 이상 편도염, 만성 편도 비대"],
    ],
  },
  snoring: {
    title: "코골이 치료법 일반 비교",
    rows: [
      ["항목", "양압기(CPAP)", "수술", "구강내장치"],
      ["방식", "기계 사용", "구조 교정", "장치 착용"],
      ["적합 케이스", "중등도~중증 무호흡", "구조 문제", "경증"],
      ["편의성", "야간 착용 필요", "1회 시술", "야간 착용"],
    ],
  },
  default: {
    title: "이비인후과 진료 검토 시 일반 안내",
    rows: [
      ["확인 항목", "내용"],
      ["전문의 자격", "이비인후과 전문의 여부 확인"],
      ["검사 장비", "내시경·청력검사 장비 보유 여부"],
      ["진료 분야", "본인 증상 대응 분야 여부"],
      ["주의 사항", "개인 증상·체질에 따라 적용 차이"],
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
  rhinitis:        { duration: "약물 2~4주, 면역치료 3~5년", recovery: "복용 중 효과", pain: "통증점수 1~2점" },
  sinusitis:       { duration: "약물 2~4주 또는 수술 1회",   recovery: "수술 시 1~2주 회복", pain: "수술 후 2~3점" },
  tonsil:          { duration: "수술 30~60분",             recovery: "1~2주",       pain: "통증점수 4~6점" },
  sudden_hearing:  { duration: "스테로이드 치료 1~2주",     recovery: "72시간 내 시작 시 회복률 높음", pain: "통증 거의 없음" },
  default:         { duration: "치료별 상이",              recovery: "개인차 있음",   pain: "치료별 차이" },
};

function getExamValues(treatmentId) {
  return EXAM_VALUES[treatmentId] || EXAM_VALUES.default;
}

// ============================================================
// 3. 제목 생성 (mode 분기)
// ============================================================
function buildEntTitle(treatmentName, region, seoData, blogTypeId, mode) {
  if (mode === "commercial") {
    const defaults = [
      `${region} ${treatmentName} 진료 안내｜치료 과정과 일반 정보 정리`,
      `${region} ${treatmentName} 정보 가이드｜이비인후과 검토 시 확인할 항목`,
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
    `${region} ${treatmentName} 후기｜증상부터 치료까지 솔직하게 정리했습니다`,
    `${treatmentName} 고민 한 달｜${region} 이비인후과에서 받고 나서 드는 생각`,
    `${region} ${treatmentName}｜증상 기간 솔직 정리`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기)
// ============================================================
function buildEntHashtags(treatmentName, region, mode) {
  const kw = treatmentName.replace(/\s/g, "");
  if (mode === "commercial") {
    return [
      `#${region}${kw}`, `#${kw}정보`, `#${kw}안내`,
      `#${kw}`, `#${region}이비인후과`, `#이비인후과정보`,
      `#${region}진료안내`, `#이비인후과진료`,
    ].slice(0, 8).join(" ");
  }
  return [
    `#${region}${kw}`, `#${kw}후기`, `#${kw}상담`,
    `#${kw}`, `#${region}이비인후과`, `#이비인후과후기`,
    `#${region}후기`, `#비염치료`, `#${region}이비인후과추천`,
  ].slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기) — clinic v3.4 후처리 로직 완전 이식
// ============================================================
function cleanEntText(text, treatmentName, region, mode = "personal") {
  let result = text;

  // 공통: 기본 + AI 냄새 금지어 + 과별 침투 차단
  const removeList = [...ENT_FORBIDDEN_BASE, ...ENT_FORBIDDEN_AI, ...ENT_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...ENT_FORBIDDEN_COMMERCIAL);

  // 🛡️ v2.0 — 단순 forEach replace 대신 safeRemoveWords 사용
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전에는 forEach로 빈 문자열 치환 → "시술하는" → " 하는" 사고 발생
  result = safeRemoveWords(result, removeList);

  // 조사 오류 교정 (치료명 + 잘못된 조사)
  result = result
    .replace(/비염를/g, "비염을")
    .replace(/축농증를/g, "축농증을")
    .replace(/중이염를/g, "중이염을")
    .replace(/편도선를/g, "편도선을")
    .replace(/이명를/g, "이명을");

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

    // [5] v2.2 — 미완성 문장 자동 복구 (commercial 모드 한정)
    //   FORBIDDEN_BASE 제거 후 GPT의 "~것이 중요합니다" 같은 어미가 잘려 "~것이." 잔존하는 경우
    //   ⚠️ commercial 모드만 적용 — personal 후기 톤에서는 자연스러운 종결도 있음
    result = result
      // "~하는 것이." → "~하는 것이 중요합니다."
      .replace(/(하는|되는|있는|받는|받으시는|고려하는|선택하는|상담하는|진행하는|결정하는|확인하는|점검하는|수립하는|조정하는|이해하는|파악하는|준비하는|검토하는|진단받는|치료받는|관리하는|유지하는|보호하는|개선하는|적합한)\s+것이\.(?=\s|$)/g, "$1 것이 중요합니다.")
      // "~것이" 단독 종결 (위의 동사와 매칭 안 된 케이스)
      .replace(/([가-힣])\s+것이\.(?=\s|$)/g, "$1 것이 중요합니다.")
      // "~기 위해서는." 미완성
      .replace(/위해서는\.(?=\s|$)/g, "위해서는 충분한 상담이 권장됩니다.")
      // 문장 시작 "따라서," 뒤가 결론 없이 끊긴 경우 — 안전 보정
      .replace(/^따라서,\s*$/gm, "")
      // 줄 시작 "그러므로 " 단독 → 제거
      .replace(/^그러므로\s*\.?\s*$/gm, "");
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
  //     5개가 순차 실행되면 상호 충돌 → "{치료명}가 치료" / "{치료명}가 치과"
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
    if (/(코가|귀가|목이|증상이|결과가|모습이)\s*$/.test(trimmed)) {
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
function insertEntTimeline(text, treatmentName, mode) {
  if (mode === "commercial") return text;
  const hasTimeline = /일차|일째|주일|개월/.test(text);
  if (!hasTimeline) return text;
  const isSurgery = /수술|편도|아데노이드|비중격/.test(treatmentName);
  const isAcute   = /돌발성|급성/.test(treatmentName);
  const day7Note  = isSurgery ? "수술 부위 회복 진행"
                  : isAcute   ? "치료 시작 1주차 호전 여부 확인"
                  : "증상 변화 체감 시작";
  const timeline = `\n\n**일반 회복 경과 (개인차 있음)**\n- 1~3일차: 치료 직후 반응 관찰\n- 7일차: ${day7Note}\n- 1개월차: 증상 안정화 여부 점검\n- 3개월차: 최종 상태 확인`;
  return text.trimEnd() + timeline;
}

// ============================================================
// 7. 추천 대상 (personal 전용)
// ============================================================
const ENT_REC_MAP = {
  "비염치료":       ["환절기마다 재채기·콧물이 심한 경우", "약물 의존이 심해진 경우"],
  "축농증치료":     ["감기 후 증상이 한 달 이상 이어진 경우", "두통·코막힘이 반복되는 경우"],
  "코골이수면치료": ["가족이 코골이로 불편을 호소하는 경우", "낮 시간 피로가 심한 경우"],
  "편도선수술":     ["연 4회 이상 편도염을 앓는 경우", "만성 편도 비대로 호흡이 어려운 경우"],
  "중이염치료":     ["귀가 자주 먹먹해지는 경우", "청력 저하가 느껴지는 경우"],
  "이명치료":       ["귀울림으로 수면이 어려운 경우", "이명이 점점 커지는 경우"],
  "돌발성난청치료": ["갑자기 한쪽 귀가 안 들리는 경우 (72시간 내 진료 권장)"],
  "어지럼증치료":   ["어지럼이 반복되어 일상이 어려운 경우"],
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

  console.log(`[ent][QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[ent][QC] 수치: ${hasExamValue}`);
  console.log(`[ent][QC] 키워드반복: ${kwCount}`);
  if (mode === "commercial") {
    console.log(`[ent][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[ent][QC] 가격(commercial 위반): ${priceCount}건`);
    console.log(`[ent][QC] 효과단정(commercial 위반): ${certaintyCount}건`);
    console.log(`[ent][QC] 추천유도(commercial 위반): ${recommendCount}건`);
    console.log(`[ent][QC] 후기흐름(commercial 위반): ${reviewFlowCount}건`);
  }

  return {
    hasInfoBlock, hasExamValue, kwCount,
    firstPersonCount, priceCount,
    certaintyCount, recommendCount, reviewFlowCount,
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
export default async function handleEnt(req, res) {
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
  const industry   = "ent";
  const validMode  = (mode === "commercial") ? "commercial" : "personal";
  console.log(`[ent] mode: ${validMode}`);

  // ── ent 진료 검증 ─────────────────────────────────
  // 검증 생략: ENT_TREATMENTS 테이블에 없는 진료는 자동으로 fallback 처리됨
  console.log(`[ent] 치료 진입: ${subKw}`);

  // ── 시술 데이터 로드 ─────────────────────────────────
  const treatmentData = ENT_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || ENT_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 (mode 분기) ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 ${region} 지역 ${subKw} 진료 정보를 정리하는 정보형 블로그 작가입니다.
업종: 이비인후과 | 치료: ${subKw} | 지역: ${region}

[🚨 어법 절대 규칙 — 가장 먼저 지킬 것 (v2.1)]
※ 치료명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ 그대로: "${subKw}"
  ✅ 조사: "${subKw}을/를/은/는/이/의/로/에/도/만"
  ✅ 대체어: "이 치료" / "해당 치료" / "진료"

🚫 절대 금지 패턴 (생성하지 말 것):
  ❌ "${subKw} 치료"  ← 이중 표현 (예: "비염치료 치료" 금지)
  ❌ "${subKw} 시술"  ← 이중 표현
  ❌ "${subKw} 진료"  ← 이중 표현
  ❌ "${subKw}이 치료"  ← 어순 붕괴 (예: "비염이 치료" 금지)
  ❌ "${subKw}이 시술"  ← 어순 붕괴
  ❌ "${subKw}이 ${region}"  ← 잘못된 주격
  ❌ "이 치료가 치료"  ← 동어 반복
  ❌ "이 치료가 [명사]"  ← "이 치료의 [명사]" 또는 "이 치료는 [형용사]"로

[좋은 예시]
  "${subKw}을 받고 나서" / "${subKw} 후" / "${subKw} 이후"
  "이 치료의 회복 기간" / "이 치료는 빠르게 진행됩니다"

[의료광고법 준수]
- ❌ 1인칭 환자 시점 금지 (저는/제가/받아봤어요)
- ❌ 가격 직접 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지 (확실히/100%/완치)
- ❌ 환자 유인 금지 (실비/할인)
- ❌ 병원 직접 추천 금지
- ❌ 신뢰 표현 금지 (믿음이 갔어요/신뢰가 갔어요/꼼꼼한 상담 덕분에)
- ❌ 결정 정당화 금지 (잘한 결정/선택하길 잘했다)
- ❌ 후기 의존 표현 금지 (후기 보고 결정/체감 변화)

[권장 표현]
- "일반적으로 ~ 안내됩니다" / "병원에 따라 차이가 있습니다"
- "진료 시 의료진과 상담하여 결정하는 것이 권장됩니다"

[🚨 문장 종결 절대 규칙 (v2.2)]
- 모든 문장은 반드시 완전한 종결 어미로 끝낼 것
  ✅ "~중요합니다." / "~권장됩니다." / "~좋습니다." / "~필요합니다." / "~안내됩니다." / "~가능합니다."
  ❌ "~것이." (미완성 — 절대 금지)
  ❌ "~하는 것이." / "~중요하는 것이." (미완성)
  ❌ "~따라서," 로 문장 시작 후 결론 빠진 케이스
- "~것이" 뒤에는 반드시 "중요합니다 / 권장됩니다 / 좋습니다 / 필요합니다 / 도움이 됩니다" 중 하나로 마무리

3인칭 정보형. 자연스러운 안내 톤. 표·불릿 사용 가능.`
    : `당신은 ${region} 거주 일반인입니다. ${subKw} 진료를 받아본 1인칭 블로그 후기를 작성합니다.
업종: 이비인후과 | 치료: ${subKw} | 지역: ${region}
[절대 금지] 성형/피부/치과 관련 표현 일절 사용 금지
[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함

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
  const SECTIONS = ENT_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = buildEntPrompt(sec.key, treatmentData, region, { mode: validMode });
    const prevBlock  = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: ent | 키워드: ${subKw} | 지역: ${region} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 성형외과·피부과 표현 금지. 200자 이상.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanEntText(secText, subKw, region, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      console.log(`[ent] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanEntText(retry, subKw, region, validMode);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, subKw);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[ent] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 치료 / 시술 / 일상
  const ENT_ALT_POOL = ["검사 사진", "상담 사진", "치료 사진", "시술 사진", "일상 사진"];
  const _ENT_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "검사 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "치료 사진",
    result:   "시술 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _ENT_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (mode 분기) ─────────────────────────
  let title = overrideTitle || buildEntTitle(subKw, region, seoData, blogTypeId, validMode);
  const ENT_TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|써마지|필러|보톡스|피코레이저|성형외과|임플란트|치아|잇몸|스케일링|사랑니|크라운/;
  if (ENT_TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜치료 과정과 일반 정보`
      : `${region} ${subKw} 후기｜증상 기간 솔직 정리`;
  }
  if (!title.includes(subKw)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜치료 과정과 일반 정보`
      : `${region} ${subKw} 후기｜증상부터 치료까지 솔직하게 정리했습니다`;
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
    sectionTexts["result"] = insertEntTimeline(sectionTexts["result"], subKw, validMode);
  }

  // ── 마무리 섹션 (mode 분기) ─────────────────────
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    if (validMode === "commercial") {
      const commercialCTAs = [
        `\n\n${subKw}에 대한 정보는 일반적인 안내일 뿐, 개인의 증상에 따라 적용은 달라질 수 있습니다. 정확한 진단과 치료 방향은 의료진과의 직접 상담을 통해 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${subKw} 진료에 대한 일반 정보 안내입니다. 적합 여부·회복 경과는 개인차가 있으므로, ${region} 내 이비인후과에서 충분한 상담 후 결정하시는 것이 좋습니다.`,
        `\n\n${subKw} 관련 일반 정보를 정리한 내용입니다. 본인 상태에 맞는 치료 방법은 이비인후과 진료 후 안내받는 것이 권장되며, 궁금한 부분은 상담 시 직접 문의해보시기 바랍니다.`,
      ];
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
    } else {
      const recList = ENT_REC_MAP[subKw] || [];
      const recBlock = recList.length > 0
        ? `\n\n**이런 분들께 추천**\n${recList.map(r => `- ${r}`).join("\n")}`
        : "";
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + recBlock
        + "\n\n비슷한 고민이라면 이비인후과 상담 한 번 받아보는 것도 도움이 됩니다.";
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
  assembled += "\n\n" + buildEntHashtags(subKw, region, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  assembled = cleanEntText(assembled, subKw, region, validMode);
  // commercial 모드는 2회 통과
  if (validMode === "commercial") {
    assembled = cleanEntText(assembled, subKw, region, validMode);
  }

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 치료 / 시술 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|치료|시술|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|내시경|영상|진단|소견|청력|코내시경/i.test(s)) return "[이미지: 검사 사진]";
    if (/시술|수술|레이저|코성형|코뼈|편도|아데노이드/.test(s)) return "[이미지: 시술 사진]";
    if (/치료|약물|처방|네뷸라이저|면역치료|요법/.test(s))   return "[이미지: 치료 사진]";
    if (/상담|진료|설명|차트|문진|원장|의사|병원/.test(s))   return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|치료|시술|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC ──────────────────────────────────────────
  const qc = runQC(assembled, subKw, validMode);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, subKw);
  console.log(`[ent] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[ent] ⚠️ commercial 모드 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[ent] ⚠️ commercial 모드 가격 ${qc.priceCount}건 잔존`);
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
    },
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
