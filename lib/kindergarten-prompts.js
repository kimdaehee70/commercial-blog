// lib/prompts.js
// 반장-노리야놀자 블로그 생성 시스템 v6
//
// 핵심 설계:
//   글 구조 (이미지 위치 고정):
//   도입 → [이미지] → 현장 → [이미지] → 아이행동 → [이미지] → 반응 → [이미지] → 후기 → [이미지] → 마무리(1회)
//
//   - 교육효과 블록 / CTA 블록 / 프로그램 나열 → 완전 제거
//   - 마무리 정리 = 랜덤 5패턴 (문의 유도 없음)
//   - "팔지 말고, 경험만 남겨라"


// ============================================================
// 랜덤 요소 데이터
// ============================================================

const BLOG_STYLES = [
  { type: "현장후기형",  hint: "행사 당일 현장을 생생하게 담은 후기 스타일." },
  { type: "시즌공략형",  hint: "지금 이 시기에 이 프로그램이 왜 딱 맞는지 강조." },
  { type: "문제해결형",  hint: "행사 준비의 어려움에 공감하고 경험으로 풀어내는 글." },
  { type: "사례중심형",  hint: "실제 아이들 반응과 에피소드 중심의 체험 스케치." },
  { type: "담당자시각형", hint: "행사 담당 선생님 관점으로 준비·진행·마무리를 담담하게 기록." },
];

const PERSPECTIVES = [
  { name: "담임선생님 시선", tone: "아이들을 가장 잘 아는 선생님의 따뜻하고 현실적인 말투." },
  { name: "행사 담당자 시선", tone: "준비부터 마무리까지 직접 챙긴 담당자의 솔직한 기록." },
  { name: "학부모 시선",     tone: "아이가 즐거워하는 모습에 흐뭇해하는 부모의 감성적인 말투." },
  { name: "현장 기자 시선",  tone: "생생한 현장 르포 스타일. 객관적이고 생동감 있는 묘사." },
];

const SITUATIONS = [
  { name: "행사 당일 현장", hint: "행사가 막 끝난 생생한 현장 스케치." },
  { name: "행사 후 후기",   hint: "행사가 끝난 후 돌아보는 따뜻한 후기." },
  { name: "시즌 특집",     hint: "봄/여름/가을/겨울 시즌에 맞춘 기획 글." },
  { name: "행사 전 예고",   hint: "곧 있을 행사를 미리 소개하고 기대감을 높이는 글." },
];

// 도입부 패턴 풀 — 매 글마다 다르게 (유사문서 차단)
const INTRO_PATTERNS = [
  { name: "질문형",        hint: "독자에게 직접 질문으로 시작. '~고민해보신 적 있나요?' 형태." },
  { name: "공감형",        hint: "담당자의 어려움에 먼저 공감. '매년 이맘때면 고민이 시작되죠.' 형태." },
  { name: "현장스케치형",  hint: "현장 장면을 바로 묘사. '교실 한가득 시장이 차려졌습니다.' 형태." },
  { name: "계절·시기형",  hint: "지금 이 시기를 자연스럽게 연결. '봄 소풍 시즌이 돌아왔어요.' 형태." },
  { name: "인용형",        hint: "실제 선생님 말을 인용해 시작. '\"행사 준비, 뭘 해야 할지 모르겠어요.\"' 형태." },
  { name: "비교형",        hint: "준비 전·후를 대비. '작년엔 행사 준비에 2주가 걸렸다는 이야기입니다.' 형태." },
  { name: "수치·사실형",  hint: "구체적 숫자로 시작. '유치원 행사, 1년에 평균 4~6회 진행됩니다.' 형태." },
];

// 마무리 정리 랜덤 패턴 풀 (문의 유도 없음 — 경험만)
const CLOSING_PATTERNS = [
  (prog) => `끝날 시간이 됐는데 아이들이 자리를 뜨지 않았다. 😊
선생님이 불러도 한 번 더, 한 번 더를 외쳤다.
그날 교실은 오래도록 시끌벅적했다.`,

  (prog) => `아이가 집에 가면서 엄마한테 말했다. 🌟
"나 오늘 ${prog} 진짜 재밌었어."
그 한 마디로 하루가 설명됐다.`,

  (prog) => `마지막까지 웃음소리가 끊이지 않았다. 😊
아이들 표정에는 아직 흥분이 남아 있었다.
그걸로 충분했다.`,

  (prog) => `정리할 때도 아이들이 도왔다. 🔥
자기가 쓴 도구를 제자리에 놓으면서도 아쉬운 표정이었다.
내일도 하고 싶다는 아이도 있었다.`,

  (prog) => `${prog}이 끝나고 교실이 조용해졌다. 🎉
그 조용함이 오히려 오래 남았다.
아이들이 얼마나 몰입했는지 알 수 있었다.`,
];

const REGIONS = [
  "서울 강남구", "서울 서초구", "서울 송파구", "서울 강동구",
  "서울 마포구", "서울 용산구", "서울 성동구", "서울 광진구",
  "서울 노원구", "서울 도봉구", "서울 강북구", "서울 성북구",
  "서울 은평구", "서울 서대문구", "서울 중구", "서울 종로구",
  "서울 강서구", "서울 양천구", "서울 구로구", "서울 영등포구",
  "서울 동작구", "서울 관악구", "서울 금천구",
  "경기 수원시", "경기 성남시", "경기 용인시", "경기 고양시",
  "경기 부천시", "경기 안산시", "경기 안양시", "경기 남양주시",
  "경기 화성시", "경기 평택시", "경기 의정부시", "경기 시흥시",
  "경기 파주시", "경기 광명시", "경기 김포시",
  "인천시", "대전시", "대구시", "부산시", "광주시", "울산시",
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ============================================================
// 마무리 정리 블록 (하단 고정 — 마무리만 남김)
// ============================================================

// buildFixedBottomBlock(programName)으로 동적 생성 — 하위 호환용 기본값
export const FIXED_BOTTOM_BLOCK = `## 🎯 마무리 정리

이번 체험은
교실 공간을 크게 바꾸지 않아도 자연스럽게 분위기가 만들어지는 점이 좋았습니다.

아이들이 직접 참여하는 활동을 좋아하는 반이나
활동 참여도가 높은 연령대에서 특히 반응이 좋았고,
준비 과정이 복잡하지 않아서
행사를 처음 준비하는 기관에서도 부담 없이 진행할 수 있는 구성입니다.`.trim();

/**
 * 프로그램명에 맞는 마무리 정리 블록 동적 생성
 */
export function buildFixedBottomBlock(programName = "") {
  const prog = programName || "이번 체험";
  const pattern = CLOSING_PATTERNS[Math.floor(Math.random() * CLOSING_PATTERNS.length)];
  return [
    "## 🎯 마무리 정리",
    "",
    pattern(prog),
  ].join("\n");
}


// ============================================================
// 해시태그 생성
// ============================================================

export function buildHashtags(programName, region, extra = []) {
  const regionClean = (region || "").replace(/^(서울|경기|인천|부산|대구|광주|대전|울산)\s*/u, "").trim();
  const regionShort = regionClean.replace(/(시|구|군)$/, "");
  const prog = (programName || "").trim();

  const main = ["#유치원행사", "#어린이집행사"];
  const program = prog
    ? [`#${prog}`, `#유치원${prog}`, `#어린이집${prog}`]
    : ["#유아체험", "#체험프로그램", "#어린이프로그램"];
  const location = regionClean
    ? [`#${regionShort}유치원`, `#${regionClean}유치원행사`]
    : ["#유치원행사프로그램", "#어린이집행사프로그램"];  // v41: 서울 기본값 제거
  const similarPool = [
    "#유아체험활동", "#체험수업", "#원내행사", "#방문체험",
    "#유치원체험활동", "#어린이체험", "#원내체험수업",
    "#유아교육프로그램", "#어린이집체험활동",
  ];
  const expandPool = [
    "#행사프로그램", "#행사대여", "#유치원프로그램",
    "#어린이집프로그램", "#방문행사", "#체험행사대여",
  ];
  const similar = shuffleArray(similarPool).slice(0, 3);
  const expand  = shuffleArray(expandPool).slice(0, 2);

  const all    = [...main, ...program, ...location, ...similar, ...expand, ...extra];
  const unique = [...new Set(all)];
  return unique.slice(0, 12).join(" ");
}


// ============================================================
// 마무리 정리 블록 삽입
// ============================================================

export function insertFixedBottomBlock(text, programName = "", region = "") {
  if (!text) return text;
  const MARKER = "## 🎯 마무리 정리";
  const hashtags = buildHashtags(programName, region);

  // 1) 기존 마무리 정리 블록 이하 전부 제거
  let cleaned = text;
  const markerIdx = cleaned.indexOf(MARKER);
  if (markerIdx !== -1) {
    cleaned = cleaned.slice(0, markerIdx).trimEnd();
  }

  // 2) HASHTAGS: 줄 제거
  cleaned = cleaned.replace(/^HASHTAGS:\s*.+$/gm, "").trimEnd();

  // 3) AI가 본문 끝에 붙인 해시태그 줄 제거
  cleaned = cleaned.replace(/\n(#\S+\s*){3,}[^\n]*/g, "").trimEnd();

  // 4) 랜덤 패턴 마무리 + 해시태그 1회 붙이기
  const block = buildFixedBottomBlock(programName);
  return cleaned + "\n\n" + block + "\n\n" + hashtags;
}


// ============================================================
// 유틸
// ============================================================

function josa(word, type) {
  if (!word) return "";
  const code = word[word.length - 1].charCodeAt(0);
  const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
  switch (type) {
    case "을/를":   return hasBatchim ? "을" : "를";
    case "은/는":   return hasBatchim ? "은" : "는";
    case "으로/로": return hasBatchim ? "으로" : "로";
    default: return "";
  }
}

function countInText(text, keyword) {
  if (!keyword) return 0;
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(esc, "g")) || []).length;
}

function isTitleLine(para) {
  return /^#{1,3}\s/.test(para.trim());
}

// CTA·문의 유도 문단 여부 (마무리 정리는 제외)
function isCTAPara(para) {
  if (/마무리\s*정리/.test(para)) return false;
  return /문의|예약|신청|www\.banjang|📞|💌|전화|일정|비용/.test(para);
}


// ============================================================
// 키워드 관련
// ============================================================

export function buildKeywordVariants(subKeyword) {
  if (!subKeyword) return [];
  return [
    `유치원 ${subKeyword}`,
    `어린이집 ${subKeyword}`,
    `${subKeyword} 체험`,
    `${subKeyword} 프로그램`,
    `${subKeyword} 행사`,
  ];
}

export function getMainKeyword(target, program) {
  return (target?.seoKeys?.[0]) || program?.name || "";
}

const INJECT_PATTERNS = [
  (kw) => `${kw}${josa(kw, "을/를")} 고민하는 기관이라면\n${kw}${josa(kw, "은/는")} 좋은 선택입니다.`,
  (kw) => `이 프로그램은 ${kw} 형태로 진행되어\n별도 준비 없이 바로 운영이 가능합니다.`,
  (kw) => `${kw}${josa(kw, "으로/로")} 진행되기 때문에\n기관의 부담을 크게 줄일 수 있습니다.`,
  (kw) => `${kw}${josa(kw, "을/를")} 통해 아이들에게 특별한 경험을 제공해보세요.`,
];

function getParagraphRole(idx, total, para) {
  if (/반장|서비스|담당/.test(para)) return "service";
  if (idx < total * 0.2) return "intro";
  if (idx > total * 0.75) return "preCTA";
  return "middle";
}

function pickPattern(role, insertCount) {
  switch (role) {
    case "intro":   return INJECT_PATTERNS[0];
    case "preCTA":  return INJECT_PATTERNS[3];
    default: return insertCount % 2 === 0 ? INJECT_PATTERNS[1] : INJECT_PATTERNS[2];
  }
}

export function injectKeywords(text, mainKw, subKw, subVariants = [], targetCount = 10) {
  if (!text) return { text, insertedCount: 0, totalCount: 0 };
  const allKws = [mainKw, subKw, ...subVariants].filter(Boolean);
  const currentCount = allKws.reduce((s, kw) => s + countInText(text, kw), 0);
  const needCount = Math.max(0, targetCount - currentCount);
  if (needCount === 0) return { text, insertedCount: 0, totalCount: currentCount };

  const paragraphs = text.split("\n");
  const total = paragraphs.length;
  const candidateIndexes = paragraphs
    .map((para, idx) => ({ para, idx }))
    .filter(({ para }) =>
      !isTitleLine(para) &&
      !isCTAPara(para) &&
      !/\[이미지:/.test(para) &&
      !allKws.some(kw => para.includes(kw)) &&
      para.replace(/\s/g, "").length >= 15
    )
    .map(({ idx }) => idx);

  let insertedCount = 0;
  const mod = [...paragraphs];
  const used = new Set();

  for (let i = 0; i < needCount; i++) {
    const avail = candidateIndexes.filter(idx => !used.has(idx));
    if (avail.length === 0) break;
    const roleOrder = ["intro", "preCTA", "middle"];
    let targetIdx = null;
    for (const role of roleOrder) {
      const found = avail.find(idx => getParagraphRole(idx, total, mod[idx]) === role);
      if (found !== undefined) { targetIdx = found; break; }
    }
    if (targetIdx === null) targetIdx = avail[0];
    const role = getParagraphRole(targetIdx, total, mod[targetIdx]);
    const kw = i % 2 === 0
      ? mainKw
      : (subVariants[Math.floor(i / 2) % subVariants.length] || subKw || mainKw);
    const pattern = pickPattern(role, insertedCount);
    mod[targetIdx] = mod[targetIdx] + "\n" + pattern(kw);
    insertedCount++;
    used.add(targetIdx);
  }

  const finalText = mod.join("\n");
  return {
    text: finalText,
    insertedCount,
    totalCount: allKws.reduce((s, kw) => s + countInText(finalText, kw), 0),
  };
}


// ============================================================
// 마무리 정리 블록 생성 (랜덤 패턴)
// ============================================================

export function buildCTABlock(mainKw, subKw) {
  const prog = subKw || mainKw;
  const pattern = CLOSING_PATTERNS[Math.floor(Math.random() * CLOSING_PATTERNS.length)];
  return [
    "",
    "## 🎯 마무리 정리",
    "",
    pattern(prog),
    "",
  ].join("\n");
}


// ============================================================
// 확장 블록 (⑥ 이런 프로그램도) — 간단 언급만
// ============================================================

export function insertExpansionBlock(text, currentProgram, otherPrograms = []) {
  if (!text || !currentProgram) return text;

  const MARKER = "## 🎯 마무리 정리";
  // 이미 있으면 스킵
  if (text.includes("이런 프로그램도")) return text;

  const defaultOthers = ["병원놀이", "시장놀이", "전통놀이", "블랙라이트체험", "과학아놀자", "캠핑놀이체험"]
    .filter(p => p !== currentProgram);
  const others = otherPrograms.length > 0
    ? otherPrograms.filter(p => p !== currentProgram).slice(0, 3).join(", ")
    : defaultOthers.slice(0, 3).join(", ");

  const block = [
    "",
    "## 🎪 이런 프로그램도 함께 운영돼요!",
    "",
    `${currentProgram} 외에도`,
    `${others} 등 다양한 프로그램으로 진행 가능합니다. 😊`,
    "",
  ].join("\n");

  const markerIdx = text.indexOf(MARKER);
  if (markerIdx !== -1) {
    return text.slice(0, markerIdx).trimEnd() + "\n" + block + "\n\n" + text.slice(markerIdx);
  }
  return text.trimEnd() + "\n" + block;
}


// ============================================================
// CTA 강화 — 마무리 정리로 교체
// ============================================================

export function enhanceCTA(text, mainKw, subKw) {
  if (!text) return text;
  const MARKER = "## 🎯 마무리 정리";
  // 이미 마무리 정리 있으면 중복 생성 방지
  const count = (text.match(/## 🎯 마무리 정리/g) || []).length;
  if (count >= 1) return text;
  // 없으면 추가
  const closing = buildCTABlock(mainKw, subKw).trim();
  return text.trimEnd() + "\n\n" + closing;
}


// ============================================================
// 이미지 캡션 — 형식 유지만
// ============================================================

export function insertImageCaptions(text, subKw) {
  return text;
}


// ============================================================
// 출력 정리
// ============================================================

export function cleanOutputText(text) {
  if (!text) return text;
  let result = text;

  // 슬롯 라벨 제거
  result = result.replace(/^\[([①②③④⑤⑥⑦⑧])[^\]]*\]\s*$/gm, "");
  result = result.replace(/\[([①②③④⑤⑥⑦⑧])[^\]]*\]/g, "");
  result = result.replace(/^\[본문:[^\]]*\]\s*$/gm, "");
  result = result.replace(/^\[해시태그[^\]]*\]\s*$/gm, "");
  result = result.replace(/^형식:\s*#/gm, "#");

  // 사진 첨부 안내 제거
  result = result.replace(/👉\s*사진을 첨부하고[^\n]*/g, "");
  result = result.replace(/📷\s*사진첨부[^\n]*/g, "");
  result = result.replace(/\(작업 후 이 문구는 삭제하세요\)[^\n]*/g, "");

  // HASHTAGS: 제거
  result = result.replace(/^HASHTAGS:\s*.+$/gm, "");

  // 해시태그 중복 → 마지막만 유지
  const HASHTAG_LINE = /^(#\S+[ \t]*){3,}/;
  const rLines = result.split("\n");
  const htIdxs = rLines.map((l, i) => HASHTAG_LINE.test(l.trim()) ? i : -1).filter(i => i !== -1);
  if (htIdxs.length > 1) {
    const keep = htIdxs[htIdxs.length - 1];
    result = rLines.filter((_, i) => !htIdxs.includes(i) || i === keep).join("\n");
  }

  // 마무리 정리 중복 → 첫 번째만 유지
  result = keepFirstClosing(result);

  // 연속 빈 줄 정리
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

/** 마무리 정리 소제목이 2개 이상이면 첫 번째만 유지 */
function keepFirstClosing(text) {
  const MARKER = "## 🎯 마무리 정리";
  const lines = text.split("\n");
  let found = false;
  const removeRanges = new Set();

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith(MARKER)) {
      if (!found) { found = true; continue; }
      // 두 번째 이후 → 블록 끝까지 제거
      const start = i;
      let end = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        if (/^##\s/.test(lines[j])) { end = j; break; }
      }
      for (let k = start; k < end; k++) removeRanges.add(k);
      i = end - 1;
    }
  }

  if (removeRanges.size === 0) return text;
  return lines.filter((_, i) => !removeRanges.has(i)).join("\n");
}


// ============================================================
// autoRepair
// ============================================================

export function autoRepair(text, diagResult, mainKw, subKw, subVariants = [], otherPrograms = [], region = "") {
  let result = text;
  const actions = [];

  const kwScore = diagResult?.keywordScore ?? 100;
  const hasClosing = text.includes("## 🎯 마무리 정리");

  if (kwScore < 90) {
    const extra = Math.ceil((90 - kwScore) / 10);
    const { text: repaired } = injectKeywords(result, mainKw, subKw, subVariants, extra + 10);
    result = repaired;
    actions.push(`키워드 보완 (점수 ${kwScore} → 목표 90+)`);
  }

  if (!hasClosing) {
    result = insertFixedBottomBlock(result, subKw, region);
    actions.push("마무리 정리 삽입");
  }

  return { text: result, actions };
}


// ============================================================
// 슬롯 파싱 — 5단 구조 기준
// ============================================================

export function parseSlots(text) {
  const lines = text.split("\n");
  const hashtagIdx = lines.findIndex(l => /^HASHTAGS:/.test(l));
  const endBoundary = hashtagIdx !== -1 ? hashtagIdx : lines.length;
  const bodyLines = lines.slice(0, endBoundary);

  const slotPatterns = {
    closing:   (l) => /마무리\s*정리/.test(l),
    recommend: (l) => /^##/.test(l) && /추천|대상|기관|어울리/.test(l),
    episode:   (l) => /^##/.test(l) && /에피소드|이야기|장면|순간/.test(l),
    operation: (l) => /^##/.test(l) && /운영|진행|방법|방식/.test(l),
    classroom: (l) => /^##/.test(l) && /교실|구성|코너|공간|배치/.test(l),
    reaction:  (l) => /^##/.test(l) && /반응|표정|소감|현장|아이들이/.test(l),
    program:   (l) => /^##/.test(l),
  };

  const blocks = [];
  let current = { type: "intro", lines: [] };

  for (const line of bodyLines) {
    if (/^##\s/.test(line)) {
      blocks.push(current);
      let type = "program";
      for (const [t, fn] of Object.entries(slotPatterns)) {
        if (fn(line)) { type = t; break; }
      }
      current = { type, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  blocks.push(current);

  const slots = { intro: "", program: "", reaction: "", classroom: "", operation: "", episode: "", recommend: "", closing: "", expansion: "", cta: "", education: "" };
  const seen = new Set();
  for (const block of blocks) {
    const t = block.type;
    if (!seen.has(t)) {
      slots[t] = block.lines.join("\n").trim();
      seen.add(t);
    }
  }
  // education은 항상 비움 (설명형 블록 차단)
  slots.education = "";
  return slots;
}


export function checkSlotSufficiency(slots) {
  const MIN = { intro: 300, program: 600, reaction: 500, review: 250 };
  const result = {};
  for (const [key, min] of Object.entries(MIN)) {
    const charCount = (slots[key] || "").replace(/\s/g, "").length;
    result[key] = { charCount, sufficient: charCount >= min, needed: Math.max(0, min - charCount) };
  }
  return result;
}

export function buildSlotFillPrompt(slotKey, subKw, mainKw, existing = "") {
  const guides = {
    intro: `【작성 규칙】
- ${mainKw} 준비 고민에 공감하는 도입부
- 메인 키워드(${mainKw}) 1~2회 자연스럽게 포함
- 200자 이상, 단문, 이모지 포함
- 새로운 내용만 (기존 반복 금지)`,

    program: `【작성 규칙】
- ${subKw} 현장이 어떻게 시작됐는지 아이 시선으로
- 서브 키워드(${subKw}) 소제목에 1회 포함
- 300자 이상, 단문, 이모지 포함
- 나열 금지 / 행동 묘사만`,

    reaction: `【작성 규칙】
- ${subKw} 현장에서의 아이들 행동·표정·에피소드
- 생생한 현장감 있는 묘사
- 구체적인 에피소드 1~2개 포함
- 250자 이상, 단문, 이모지 포함
- 리스트(①②③/✔/-) 절대 금지`,

    review: `【작성 규칙】
- 선생님·학부모 실제 반응을 인용 형식으로
- "○○ 선생님 말씀" / "한 학부모님께서" 형태
- 메인 키워드(${mainKw}) 1회 자연스럽게 포함
- 200자 이상, 단문, 이모지 포함`,
  };

  const existingBlock = existing
    ? "【기존 내용 (참고만, 반복 금지)】\n" + existing + "\n"
    : "";

  return "당신은 네이버 블로그 SEO 전문 작가입니다.\n아래 섹션을 작성해주세요.\n\n"
    + (guides[slotKey] || "")
    + "\n\n"
    + existingBlock
    + "위 규칙에 따라 해당 섹션 내용만 작성하세요.";
}

export function assembleSlots(slots, hashtags = [], programName = "", region = "") {
  // 7단 구조 고정: 도입 → 현장반응 → 교실구성 → 운영방법 → 에피소드 → 추천대상 → 마무리
  const order = ["intro", "reaction", "classroom", "operation", "episode", "recommend"];
  const parts = order.map(key => slots[key]).filter(Boolean);
  const body = parts.join("\n\n");
  return insertFixedBottomBlock(body, programName, region);
}


// ============================================================
// 후처리 파이프라인
// ============================================================

function injectMainKwIntoHeadings(text, mainKw) {
  if (!mainKw || !text) return text;
  const lines = text.split("\n");
  let injected = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^##\s/.test(lines[i])) continue;
    if (/마무리|이런 프로그램도/.test(lines[i])) continue;
    if (lines[i].includes(mainKw)) continue;
    if (injected >= 1) break;
    lines[i] = lines[i].replace(
      /^(##\s+)([\p{Emoji_Presentation}\p{Extended_Pictographic}]*\s*)/u,
      (match, hashes, emoji) => hashes + emoji + mainKw + " "
    );
    injected++;
  }
  return lines.join("\n");
}

function removeOldBlocks(text) {
  // 확장 블록·마무리 이전 CTA 제거 후 재삽입
  const lines = text.split("\n");
  const MARKER = "## 🎯 마무리 정리";
  const markerIdx = lines.findIndex(l => l.trim().startsWith(MARKER));
  const endBoundary = markerIdx !== -1 ? markerIdx : lines.length;

  const isBadBlock = (l) =>
    /문의.*예약|예약.*안내|문의.*안내|문의\s*&|문의\s*및/.test(l);

  const removeSet = new Set();
  let i = 0;
  while (i < endBoundary) {
    if (isBadBlock(lines[i]) && lines[i].trim().length > 3) {
      const start = /^##\s/.test(lines[i]) ? i : Math.max(0, i - 1);
      let end = endBoundary;
      for (let j = start + 1; j < endBoundary; j++) {
        if (/^##\s/.test(lines[j])) { end = j; break; }
      }
      for (let k = start; k < end; k++) removeSet.add(k);
      i = end;
    } else { i++; }
  }

  if (removeSet.size === 0) return text;
  return lines.filter((_, idx) => !removeSet.has(idx)).join("\n");
}

export function optimizeBlogPost(text, mainKw, subKw, otherPrograms = [], region = "") {
  const subVariants = buildKeywordVariants(subKw);

  const headingText = injectMainKwIntoHeadings(text, mainKw);
  const { text: kwText, insertedCount, totalCount } = injectKeywords(
    headingText, mainKw, subKw, subVariants, 10
  );
  const cleanText  = removeOldBlocks(kwText);
  const expandText = insertExpansionBlock(cleanText, subKw, otherPrograms);
  const fixedText  = insertFixedBottomBlock(expandText, subKw, region);
  const finalText  = cleanOutputText(fixedText);

  return { text: finalText, keywordInserted: insertedCount, keywordTotal: totalCount, mainKw, subKw, subVariants };
}


// ============================================================
// buildSystemPrompt
// ============================================================

export function buildSystemPrompt(target) {
  return `너는 네이버 블로그 상단 노출 전문 작성자다.
정보성(교실 구성·운영 방법) + 현장감(에피소드·반응)을 동시에 담아야 한다.

【업체 정보】
${target.ctx}

【출력 구조 — 7단계 고정, 절대 변경 금지】
① 도입       → [이미지]
② 현장 반응  → [이미지]
③ 교실 구성  → [이미지]
④ 운영 방법  → [이미지]
⑤ 에피소드   → [이미지]
⑥ 추천 대상
⑦ 마무리 정리 (1회만)

【각 블록 핵심 역할】
① 도입: 검색자 공감 → 메인키워드 2회 자연 포함
② 현장 반응: 아이들 첫 반응 묘사 → "아이들이 ~했다" 형태, 감정·표정 포함
③ 교실 구성: "교실 구성" 키워드 포함 → 공간·코너 배치를 현장 시선으로 설명
④ 운영 방법: "운영 방법" 키워드 포함 → 진행 흐름을 경험담 형태로 서술
⑤ 에피소드: 아이 이름·대화·장면 2~3개 → 가장 생동감 있는 블록
⑥ 추천 대상: 어떤 기관에 맞는지 2~3문장 (나열 금지, 문장형)
   → 🔑 서브키워드(프로그램명) 1회 필수 포함 — 후반 키워드 밀도 유지
⑦ 마무리: 경험 요약 1~3문장, 문의·CTA 절대 금지
   → 🔑 마무리 정리 직전 단락에 서브키워드(프로그램명) 1회 자연스럽게 포함

【절대 규칙】
- 리스트 금지: ①②③ / ✔ / - 기호 전부 금지
- CTA 금지: 문의 / 예약 / 전화 / 사이트 URL 금지
- 마무리 정리는 반드시 1회만
- 같은 내용 반복 금지: 암막·VR·형광 설명은 블록당 1회만
- 블록 순서 절대 변경 금지
- 🔑 키워드 후반 유지: ⑥ 추천대상 + ⑦ 마무리 직전에 서브키워드 각 1회 필수
- ❌ 감상·홍보 표현 금지: "매료된다" / "안성맞춤" / "더할 나위 없이" / "매력적이다"
- ❌ 설명형 문장 금지: "추천합니다" / "적합합니다" / "도움이 됩니다" / "효과적입니다" / "제공합니다" / "경제 교육" / "성장" / "발달" / "부담을 덜어줍니다" / "특별한 경험" / "잊지 못할"

【문장 스타일 — 핵심】
- 한 문장 15~20자 이내 (단문 필수)
- 2~3문장마다 줄바꿈 → 읽기 편하게
- 대사("...") 적극 활용 → 현장감 UP
- "~했다" / "~이었다" / "~터졌다" 형태
- 감정·표정·소리 포함: 웃음 / 눈빛 / 외침 / 표정

✍️ 단문 스타일 예시 (반드시 이 형태로)
❌ 금지: "아이들이 강당에 들어서자마자 환호성이 울렸고, 현수막으로 꾸며진 4개의 상점이 눈앞에 펼쳐졌다."
✅ 권장:
아이들이 강당에 들어섰다.
"와!" 환호성이 터졌다.

현수막으로 꾸며진 상점이 보였다.
4개 코너가 눈앞에 펼쳐졌다.

【이모티콘 규칙 — 소제목 앞에만】
- 소제목(##) 앞에만 이모티콘 1개
- 본문 안에 이모티콘 삽입 금지
- 허용 이모티콘: 🏫 👉 🎯 ✅ 🔥 📋 😊
- 예시:
  ## 🏫 블랙라이트체험 교실 구성
  ## 👉 운영 방법과 진행 흐름
  ## 🎯 에피소드

【이미지 표기】
형식: [이미지: ALT텍스트 | 캡션텍스트]
예: [이미지: 강동구 유치원 블랙라이트체험 교실 구성 상점 배치 모습 | 코너별 배치로 아이들 이동 동선이 자연스럽게 이어진 구성]

▸ ALT (검색용) — 키워드 2~3개 반드시 조합
  - 구성: 지역 + 대상(유치원/어린이집) + 프로그램명 + 블록핵심행동
  - 예시:
    ① 강동구 유치원 시장놀이 교실 구성 상점 배치 모습
    ② 서울 어린이집 시장놀이 과일가게 체험 활동
    ③ 유치원 시장놀이 결제 역할놀이 아이들 모습
    ④ 서울 유치원 시장놀이 운영 진행 장면
    ⑤ 서울 유치원 시장놀이 역할체험 에피소드
  - ❌ 금지: "체험 모습" / "활동 장면" 단독 사용 (키워드 없이 쓰지 말 것)

▸ 캡션 (체류시간용) — 지역 + 프로그램명 + 장면 + 구조(동선/배치/운영)
  - 공식: [지역 유치원 프로그램명] + [장면 설명] + [운영 구조/배치 포인트]
  - 예시:
    ① 서울 유치원 시장놀이 교실 입장 장면, 상점 구성으로 입장과 동시에 관심이 분산되지 않는 구조
    ② 서울 유치원 시장놀이 첫 반응, 과일 상점으로 몰리며 역할놀이가 자연스럽게 시작되는 장면
    ③ 서울 유치원 시장놀이 교실 구성, 상점 4개를 나누고 중앙 통로로 이동 동선을 확보한 배치
    ④ 서울 유치원 시장놀이 운영 장면, 결제 코너와 체험 코너를 분리해 대기 없이 진행되는 구조
    ⑤ 서울 유치원 시장놀이 체험 에피소드, 상점 간 이동과 반복 참여가 자연스럽게 이어지는 놀이 흐름
  - ❌ 금지: "아이들이 ~했다" 서술형 결말 문장
  - ❌ 금지: "환호성이 터졌다" / "즐거워했다" / "인상적이었다" 등 감정·감상 표현
  - ❌ 금지: 프로그램명 없이 "체험 모습" / "활동 장면" 단독 사용

- 각 블록(①~⑤) 끝에 1장씩, 총 5장 이상 필수
- 이미지 아래 추가 설명 금지

【네이버 SEO 규칙】
- 글자수: 1,200자 이상 (공백 제외) — 구조·이미지 충분 시 상단 노출 가능
- 제목: 25~40자, 메인키워드 + "교실 구성" 또는 "운영 방법" 또는 "진행 방식" 포함
  ❌ 금지: 최고 / 특가 / 문의 / 추천 / 대박
- 키워드: 도입 2회 / 소제목 포함 / 본문 총 5~8회

【출력 형식 고정】
# 제목 (25~40자)

① 도입 본문
[이미지: 지역 유치원 프로그램명 도입 장면 | 운영포인트 설명형 캡션]

## 소제목 (현장 반응 관련)
② 현장 반응 본문
[이미지: 지역 유치원 프로그램명 아이들 첫 반응 모습 | 운영포인트 설명형 캡션]

## 소제목 (교실 구성 포함)
③ 교실 구성 본문
[이미지: 지역 유치원 프로그램명 교실 구성 상점 배치 모습 | 운영포인트 설명형 캡션]

## 소제목 (운영 방법 포함)
④ 운영 방법 본문
[이미지: 지역 유치원 프로그램명 운영 진행 장면 | 운영포인트 설명형 캡션]

## 소제목 (에피소드 관련)
⑤ 에피소드 본문
[이미지: ALT]

## 소제목 (추천 대상 관련)
⑥ 추천 대상 본문

## 🎯 마무리 정리
⑦ 마무리 본문 (1회만)

#해시태그 (8~12개, 1줄)

【출력 금지 예시】
❌ "이 프로그램은 ~으로 구성되어 있습니다"
❌ "진행 가능합니다"
❌ "효과가 있습니다"
❌ "문의 주세요"
❌ 암막 / VR / 형광 설명 동일 내용 2회 이상`;
}



/**
 * seoData에서 현장 묘사용 데이터 블록 구성
 * 장면·행동·반응·감정흐름을 프롬프트에 주입
 */
function buildSceneBlock(program) {
  const sd = program?.seoData;
  if (!sd) return "";

  const lines = [];

  // 감정 흐름
  if (sd.emotionFlow) {
    lines.push(`감정 흐름: ${sd.emotionFlow}`);
  }

  // 핵심 구조
  if (sd.coreStructure) {
    lines.push(`활동 흐름: ${sd.coreStructure}`);
  }

  // 장면별 데이터 (최대 4개)
  const scenes = sd.scenes || [];
  if (scenes.length > 0) {
    lines.push("\n【현장 장면 데이터 — 아래 내용을 바탕으로 생동감 있게 묘사할 것】");
    scenes.slice(0, 4).forEach((s) => {
      lines.push(`▶ ${s.title}`);
      if (s.actions?.length) lines.push(`  행동: ${s.actions.join(", ")}`);
      if (s.reactions?.length) lines.push(`  아이 반응: "${s.reactions.join('" / ')}"`);
      if (s.emotions) lines.push(`  감정변화: ${s.emotions}`);
    });
  }

  // 교사 고민 (공감 도입용)
  if (sd.teacherWorries?.length) {
    lines.push(`\n【선생님 고민 — 도입부 공감에 활용】`);
    lines.push(sd.teacherWorries.slice(0, 3).map(w => `"↔ ${w}"`).join(" / "));
  }

  // 캡션 (이미지 ALT 힌트)
  if (sd.captions?.length) {
    lines.push(`\n【이미지 묘사 힌트】`);
    lines.push(sd.captions.slice(0, 4).join(" / "));
  }

  // 구성 목록 (운영 특징)
  const compList = sd.composition || sd.gameList || sd.operationFlow || sd.classrooms?.map(c => c.name);
  if (compList?.length) {
    lines.push(`\n【운영 구성】 ${compList.slice(0, 6).join(" → ")}`);
  }

  // 마무리 문장
  if (sd.closing?.length) {
    lines.push(`\n【마무리 느낌 — 참고용】`);
    lines.push(sd.closing.join(" / "));
  }

  return lines.length ? "\n【프로그램 현장 데이터】\n" + lines.join("\n") : "";
}


// ============================================================
// buildUserPrompt
// ============================================================

export function buildUserPrompt({ target, program, programs, blogType, userRegion, userMemo, photoAnalysis }) {
  const region = userRegion || "서울";
  const programName = program.name;

  return `아래 조건으로 네이버 블로그 글을 작성하세요.

【핵심 목표】
- 버튼 1번으로 완성형 글 작성
- 자연스러운 흐름 중심
- 체크리스트 채우는 글 금지

--------------------------------------------------

① 도입

행사가 시작되는 공간에서
아이들이 입장하는 순간부터
자연스럽게 상황이 이어지도록 작성하세요.

아이들이 들어오는 흐름,
놀이 도구(장바구니, 화폐 등)가 등장하는 장면,
공간 이동 흐름이 자연스럽게 연결되도록 묘사합니다.

→ [이미지: ${region} 유치원 ${programName} 도입 장면 | 입장과 동시에 동선이 자연스럽게 이어지는 구조]

--------------------------------------------------

② 현장 반응

아이들이 실제로 어떻게 움직였는지 중심으로 작성합니다.

특정 코너에서 머무는 모습,
다른 코너로 이동하는 흐름,
아이들의 말이나 반응이 자연스럽게 섞이도록 구성하세요.

표정, 움직임, 소리 등 현장 분위기가 드러나야 합니다.

→ [이미지: ${region} 유치원 ${programName} 아이들 반응 장면 | 코너 이동이 자연스럽게 이어지는 흐름]

--------------------------------------------------

③ 교실 구성

교실 또는 강당이 어떻게 구성되어 있었는지
공간 흐름 중심으로 설명하세요.

코너 배치,
아이들이 해당 공간에서 어떤 행동을 하는지
자연스럽게 이어지도록 작성합니다.

단순 나열 금지, 반드시 흐름으로 연결합니다.

→ [이미지: ${region} 유치원 ${programName} 교실 구성 모습 | 코너 배치와 이동 동선이 연결된 구조]

--------------------------------------------------

④ 운영 방법

행사가 어떻게 진행되었는지 흐름 중심으로 작성합니다.

시작 방식,
아이들이 이동하는 방식,
교사의 개입 정도,
전체 진행 흐름이 자연스럽게 이어지도록 구성합니다.

설명형 문장 금지, 경험형으로 작성하세요.

→ [이미지: ${region} 유치원 ${programName} 운영 장면 | 공간 분리로 대기 없이 진행되는 구조]

--------------------------------------------------

⑤ 에피소드

아이 한 명 이상의 흐름이 자연스럽게 드러나도록 작성합니다.

아이의 행동 → 말 → 결과가 이어지는 장면을 중심으로 구성하세요.

억지 개수 맞추지 말고,
현장 장면처럼 자연스럽게 풀어냅니다.

→ [이미지: ${region} 유치원 ${programName} 에피소드 장면 | 아이 행동 흐름이 이어지는 순간]

--------------------------------------------------

⑥ 추천 대상

어떤 기관에서 진행하면 잘 맞는지
자연스럽게 정리하세요.

문장 흐름 안에서 "${programName}"이 한 번 포함되면 좋습니다.

나열형 금지.

--------------------------------------------------

⑦ 마무리 정리

행사가 끝나는 장면으로 마무리하세요.

아이들의 반응이나 마지막 분위기가 자연스럽게 담기도록 작성합니다.

절대 설명하지 말고
장면으로 끝내세요.

--------------------------------------------------

【절대 금지】

- "추천합니다"
- "적합합니다"
- "도움이 됩니다"
- "효과적입니다"
- "특별한 경험"
- "잊지 못할"
- 설명형 문장 전체 금지

--------------------------------------------------

【스타일 규칙】

- 한 문장 짧게
- 줄바꿈 자주
- 대사 적극 사용
- 장면 중심

--------------------------------------------------

【출력 조건】

- 2000자 이상
- 자연스럽게 길어져야 함
- 억지로 늘리지 말 것
- 이미지 5개 포함
- 해시태그 마지막 1줄

--------------------------------------------------

👉 핵심

"조건을 채우지 말고
현장을 그대로 써라"
`;
}


export function buildDiagnosisPrompt(blogText) {
  return `당신은 네이버 블로그 SEO 전문 진단가입니다. 아래 블로그 글을 분석하여 진단 리포트를 작성해주세요.

【진단할 블로그 글】
${blogText}

【채점 기준 — 항목별 점수 범위】

① 글자수 (charScore): 공백 제외 실제 글자수 기준
   ※ 네이버 현행 SEO 기준: 구조·이미지·키워드가 충분하면 1,200자 이상으로 상단 노출 가능
   - 2,000자 이상 = 100점 (pass)
   - 1,200~1,999자 = 80점 (pass) ← 구조·이미지 충분 시 상단 노출 가능 구간
   - 800~1,199자   = 55점 (warn)
   - 800자 미만    = 25점 (fail)

② 제목 (titleScore): 제목 첫 10자 이내 핵심 키워드 포함 여부
   - 포함됨 = 90~100점 (pass)
   - 포함되나 위치 늦음 = 70~89점 (warn)
   - 미포함 = 50점 이하 (fail)

③ 키워드 밀도 (keywordScore): 본문 내 핵심 키워드 자연스러운 반복
   - 5회 이상 자연스럽게 = 90~100점 (pass)
   - 3~4회 = 70~89점 (warn)
   - 1~2회 = 50점 이하 (fail)

④ 중복 표현 (duplicateScore): 동일 문장·표현 반복 여부
   - 중복 없음 = 90~100점 (pass)
   - 일부 중복 = 70~89점 (warn)
   - 심한 중복 = 50점 이하 (fail)

⑤ 글 구조 (structureScore): 5단 구조 — 도입/현장/행동/반응/마무리
   - 5단 완비 = 90~100점 (pass)
   - 4단 = 70~89점 (warn)
   - 3단 이하 = 50점 이하 (fail)

⑥ 해시태그 (hashtagScore): 8~12개, 관련 키워드 포함
   - 8~12개 적절 = 90~100점 (pass)
   - 5~7개 또는 중복 = 70~89점 (warn)
   - 5개 미만 = 50점 이하 (fail)

⑦ CTA (ctaScore): 문의/예약/전화 없고 마무리 정리로 마감
   - 완전 없음 = 100점 (pass)
   - 1회 언급 = 70점 (warn)
   - 2회 이상 = 50점 이하 (fail)

⑧ 마무리 정리 블록 (fixedBlockScore): "## 🎯 마무리 정리" 1회 포함
   - 정확히 1회 = 100점 (pass)
   - 없음 또는 2회 이상 = 0점 (fail)

【totalScore 계산 방법】
위 항목들을 아래 가중치로 합산하라:
- 글자수 10% + 제목 10% + 키워드 20% + 중복 10% + 구조 15% + 해시태그 10% + CTA 10% + 마무리 15%
- 이미지는 별도 계산이므로 totalScore에서 제외
- 글 품질을 있는 그대로 반영하라. 예시 점수에 맞추지 말 것.
- ※ 글자수가 1,200~1,999자라도 키워드·구조·이미지가 충분하면 pass로 판정

【출력 형식 — 반드시 아래 JSON 구조만 출력, 점수는 실제 분석 결과로】
{
  "totalScore": [실제계산값],
  "grade": "[A+/A/B+/B/C 중 하나]",
  "charCount": [실제글자수],
  "charStatus": "[pass/warn/fail]",
  "charComment": "[실제 글자수 기반 코멘트]",
  "titleScore": [실제점수],
  "titleStatus": "[pass/warn/fail]",
  "titleComment": "[실제 분석 코멘트]",
  "keywordScore": [실제점수],
  "keywordStatus": "[pass/warn/fail]",
  "keywordComment": "[실제 분석 코멘트]",
  "duplicateScore": [실제점수],
  "duplicateStatus": "[pass/warn/fail]",
  "duplicateComment": "[실제 분석 코멘트]",
  "structureScore": [실제점수],
  "structureStatus": "[pass/warn/fail]",
  "structureComment": "[실제 분석 코멘트]",
  "expansionScore": [실제점수],
  "expansionStatus": "[pass/warn/fail]",
  "expansionComment": "[실제 분석 코멘트]",
  "imageScore": 0,
  "imageStatus": "warn",
  "imageComment": "이미지는 별도 입력값으로 계산됩니다.",
  "hashtagScore": [실제점수],
  "hashtagStatus": "[pass/warn/fail]",
  "hashtagComment": "[실제 분석 코멘트]",
  "ctaScore": [실제점수],
  "ctaStatus": "[pass/warn/fail]",
  "ctaComment": "[실제 분석 코멘트]",
  "fixedBlockScore": [실제점수],
  "fixedBlockStatus": "[pass/warn/fail]",
  "fixedBlockComment": "[실제 분석 코멘트]",
  "improvements": ["[실제 개선 제안 1]", "[실제 개선 제안 2]"],
  "strengths": ["[실제 강점 1]", "[실제 강점 2]"],
  "competitionReport": {
    "competitorTypes": ["[경쟁 블로그 유형 1 — 예: 후기형·사진위주·홍보형]", "[유형 2]"],
    "competitorPrograms": ["[경쟁 프로그램 1 — 예: 쿠킹클래스·촉감놀이]", "[프로그램 2]"],
    "myPosition": "[상위권/중상위권/중위권/하위권 중 하나]",
    "myPositionReasons": ["[위치 이유 1 — 예: 현장감 강함]", "[이유 2]", "[이유 3]"],
    "attackStrategy": ["[공략 전략 1 — 예: 교사 관점 강조]", "[전략 2]", "[전략 3]"],
    "fixGuide": ["[즉시 수정 1 — 예: 도입부 키워드 2회 추가]", "[수정 2]", "[수정 3]"],
    "finalVerdict": "[지금 발행 가능/보완 후 발행 추천 중 하나]",
    "finalVerdictReason": "[최종 판단 이유 1~2줄]"
  }
}`;
}


// ============================================================
// buildSupplementPrompt
// ============================================================

export function buildSupplementPrompt({ originalText, diagResult, suppMemo, competitorData }) {
  const failItems = [];
  const warnItems = [];

  [
    { label: "글자수",      status: diagResult?.charStatus,      comment: diagResult?.charComment },
    { label: "제목 키워드", status: diagResult?.titleStatus,     comment: diagResult?.titleComment },
    { label: "키워드 밀도", status: diagResult?.keywordStatus,   comment: diagResult?.keywordComment },
    { label: "중복 표현",   status: diagResult?.duplicateStatus, comment: diagResult?.duplicateComment },
    { label: "글 구조",     status: diagResult?.structureStatus, comment: diagResult?.structureComment },
    { label: "이미지",      status: diagResult?.imageStatus,     comment: diagResult?.imageComment },
    { label: "해시태그",    status: diagResult?.hashtagStatus,   comment: diagResult?.hashtagComment },
    { label: "마무리 정리", status: diagResult?.ctaStatus,       comment: diagResult?.ctaComment },
  ].forEach(i => {
    if (i.status === "fail") failItems.push(`❌ ${i.label}: ${i.comment}`);
    else if (i.status === "warn") warnItems.push(`⚠️ ${i.label}: ${i.comment}`);
  });

  const improvements = diagResult?.improvements?.map((v, i) => `${i + 1}. ${v}`).join("\n") || "";

  // ── 경쟁 데이터 섹션 생성 (경쟁사 분석 엔진 v2) ────────────
  let competitorSection = "";
  if (competitorData) {
    const {
      keyword, topBlogs = [], patterns = {},
      weaknesses = [], attackPoints = [],
      kwDensity = [], monopoly, monopolyNote,
      competition, blogCount,
    } = competitorData;

    const top3 = topBlogs.slice(0, 3).map((b, i) =>
      `  ${i+1}위: "${b.title}" — ${b.description?.slice(0, 60) || ""}...`
    ).join("\n");

    const weakList = weaknesses.length > 0
      ? weaknesses.map(w => `  · ${w}`).join("\n")
      : "  · 분석 데이터 없음";

    const attackList = attackPoints.length > 0
      ? attackPoints.map(a => `  · ${a}`).join("\n")
      : "";

    const densityInfo = kwDensity.length > 0
      ? kwDensity.map(k => `"${k.keyword}" ${k.count}회`).join(", ")
      : "";

    const compInfo = blogCount
      ? `총 ${blogCount.toLocaleString()}개 포스팅 / 경쟁도: ${competition?.level || "보통"}`
      : `경쟁도: ${competition?.level || "보통"}`;

    competitorSection = `
【실제 경쟁 블로그 분석 — "${keyword}"】
▶ 경쟁 현황: ${compInfo}
▶ ${monopolyNote || ""}
▶ 상위 3개 글 패턴:
${top3 || "  데이터 없음"}

▶ 경쟁 글 유형: ${patterns.types?.join(", ") || "일반형"}

▶ 경쟁 글 공통 약점:
${weakList}

▶ 공략 포인트 (반드시 반영):
${attackList || weakList}

▶ 키워드 밀도: ${densityInfo || "분석 중"}

【상단 노출 공략 전략】
- 위 공략 포인트를 하나씩 정확히 채워라
- 경쟁 글에 없는 내용(교사관점·에피소드·교육효과)을 반드시 추가하라
- 단순 사진 나열이 아닌 현장 묘사 + 교사 관점으로 차별화
- 아이 반응·에피소드를 경쟁 글보다 3배 이상 풍부하게 작성
- 키워드 "${keyword}"를 제목·도입부·본문에 자연스럽게 배치`;
  }

  return `당신은 네이버 블로그 SEO 전문가입니다.
아래 글은 중복 문장이 이미 제거된 상태입니다.
기존 글 구조(소제목·이미지 위치)는 유지하되, 문장은 전부 새로 재구성하고 2,500자 이상으로 완성하세요.

【SEO 진단 결과】
${failItems.length ? "🚨 즉시 수정:\n" + failItems.join("\n") : ""}
${warnItems.length ? "\n⚠️ 개선 권장:\n" + warnItems.join("\n") : ""}
${improvements ? "\n📋 개선 제안:\n" + improvements : ""}
${competitorSection}

【추가 요청】
${suppMemo || "없음"}

【기존 글 — 구조 참고용 (문장 복붙 금지)】
${originalText}

【🔥 재구성 작업 목록 — 반드시 전부 실행】
1. 기존 문장 복붙 금지 — 반드시 새 문장으로 재작성
   → 같은 의미라도 표현·어순·시점을 바꿔서 새 문장으로
   → 기존 문장을 그대로 유지하는 것은 실패로 간주

2. 각 문단 1.5~2배 확장
   → 현재 2~3문장 → 4~6문장으로
   → 구체적 행동 묘사·소리·표정·대화 추가

3. 아이 이름 에피소드 1개 신규 추가 (필수)
   → 특정 아이(가명) + 대화 + 행동 + 결과 흐름
   → 예: "수아는 솜사탕 앞에서 멈췄다. '이게 진짜 솜사탕이야?' 눈이 동그래졌다."

4. 교사 관점 운영 디테일 1문단 추가 (필수)
   → 화폐 배분 방법 / 코너 전환 방식 / 준비 과정 구체적으로

5. 이미지 태그 5개 이상 유지
   → [이미지: Alt텍스트] 형식으로 현장 묘사 문장과 함께

6. 글자수 2,500자 이상 (최우선)
   → 현재 기준: 약 ${Math.round(originalText.replace(/\s/g, "").length / 100) * 100}자
   → 부족하면 현장 장면·대화·교사 시점 추가로 채울 것

【🚨 절대 금지】
❌ 기존 문장 그대로 복붙 금지 — 반드시 새 표현으로
❌ "추천한다", "적합하다", "특별한 경험", "잊지 못할" 계열 금지
❌ 리스트(①②③/✔/-) 금지
❌ 문의·예약·전화번호 금지
❌ 2,500자 미만 금지

【재작성 규칙】
- 단문 스타일 (한 문장 25자 이내)
- 이미지는 [이미지: Alt텍스트] 형식
- 해시태그는 맨 마지막 1회만

## 🎯 마무리 정리 (감정형 장면 2~3줄 — 설명형 금지)`;
}


// ============================================================
// buildPatternBlock — generate.js 프롬프트에 주입할 패턴 슬롯
// ============================================================
// patternDB에서 읽은 patterns 객체를 받아서 프롬프트 텍스트로 변환
// generate.js에서: const patternBlock = buildPatternBlock(patterns);
// 프롬프트 안에: ${patternBlock} 으로 삽입

export function buildPatternBlock(patterns) {
  if (!patterns) return "";

  const p = patterns;
  const total =
    (p.structures?.length || 0) +
    (p.sentences?.length  || 0) +
    (p.details?.length    || 0);

  if (total === 0) return "";

  const lines = ["[📊 상단 노출 축적 패턴 — 아래 패턴을 자연스럽게 반영할 것]"];

  // 구조 3개만
  if (p.structures?.length > 0) {
    lines.push("\n▶ 글 구조 패턴");
    p.structures.slice(0, 3).forEach(s => lines.push(`  · ${s}`));
  }

  // 디테일 5개만
  if (p.details?.length > 0) {
    lines.push("\n▶ 운영 디테일 패턴");
    p.details.slice(0, 5).forEach(s => lines.push(`  · ${s}`));
  }

  // 문장 패턴 3개만
  if (p.sentences?.length > 0) {
    lines.push("\n▶ 효과적인 문장 패턴");
    p.sentences.slice(0, 3).forEach(s => lines.push(`  · ${s}`));
  }

  // 도입/마무리는 1개씩만 (굳어짐 방지)
  if (p.openings?.length > 0) {
    lines.push(`\n▶ 도입부 힌트: ${p.openings[0]}`);
  }
  if (p.closings?.length > 0) {
    lines.push(`▶ 마무리 힌트: ${p.closings[0]}`);
  }

  lines.push("\n※ 위 패턴은 참고용. 그대로 복붙 금지. 자연스럽게 녹여낼 것.");

  return lines.join("\n");
}

