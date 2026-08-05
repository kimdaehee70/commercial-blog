// pages/api/generate.js — v31-charcount-fix
// 섹션별 개별 생성 구조
//
// v27 변경점:
//   - SYSTEM_CONTEXT: 운영 기록형 문단 구조 강제 (행사상황→공간→이동→교사→추천)
//   - SYSTEM_CONTEXT: 강제 삽입 문장 4개 (배치/자유이동/대기없음/교사편의)
//   - BASE_RULE: 없는 내용 생성 금지 (회전목마/기차/상점/풍선 등)
//   - BASE_RULE: 감탄사 섹션당 1개 이하 제한
//   - BASE_RULE: 반복 표현 금지 ("재밌어요" 등)
//   - EXPLAIN_BANNED: 놀이동산 없는내용/감정과다 패턴 추가
//   - OFF_TOPIC: 회전목마/기차/사탕가게 등 추가 차단

// [이식] OpenAI 직접 인스턴스화 제거 → generateUtils 공통 openai 사용 (결정1: 공통 LLM)
import { openai, autoSave } from "./generateUtils";
import {
  getMainKeyword,
  buildKeywordVariants,
  buildHashtags,
  buildCTABlock,
  cleanOutputText,
  autoRepair,
  buildSupplementPrompt,
  buildPatternBlock,
} from "../../lib/kindergarten-prompts";
import {
  getPlayConfig,
  buildClassroomInstruction,
  buildIntroInstruction,
  buildOperationInstruction,
  buildFlowBlock,
  buildFlowBlockForSection,
  getSectionInstruction,
} from "../../lib/kindergarten-playConfig";
import { readPatternDB } from "../../lib/kindergarten-patternDB";
// [이식] 위치 공통 후단 블록 (SOP PATCH-07)
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
// [이식] 데이터 — fallback/게이트용 (handler는 req.body.program 우선)
import { KINDERGARTEN_TREATMENTS } from "../../lib/kindergarten-data";
// [이식] savePost/extractPattern 직접 import 제거 → autoSave 래퍼 사용 (결정2)


// ============================================================
// 상수
// ============================================================


// ─── seoData → 현장 + 운영 데이터 블록 (v23) ────────────────
function buildSceneDataBlock(program) {
  const sd = program?.seoData;
  if (!sd) return "";
  const lines = [];

  if (sd.emotionFlow)   lines.push(`감정 흐름: ${sd.emotionFlow}`);
  if (sd.coreStructure) lines.push(`활동 흐름: ${sd.coreStructure}`);

  const scenes = sd.scenes || [];
  if (scenes.length > 0) {
    lines.push("\n[현장 장면 — 생동감 있게 묘사]");
    scenes.slice(0, 6).forEach(s => {
      lines.push(`▶ ${s.title}`);
      if (s.actions?.length)   lines.push(`  행동: ${s.actions.join(", ")}`);
      if (s.reactions?.length) lines.push(`  실제 반응: "${s.reactions.join('" / "')}"`);
      if (s.emotions)          lines.push(`  감정변화: ${s.emotions}`);
    });
  }

  if (sd.운영구성?.length) {
    lines.push("\n[운영 구성 — 글에 반드시 포함]");
    sd.운영구성.forEach(v => lines.push(`  · ${v}`));
  }

  if (sd.아이반응?.length) {
    lines.push("\n[아이 반응 — 구체적으로 묘사]");
    sd.아이반응.forEach(v => lines.push(`  · ${v}`));
  }

  if (sd.진행포인트?.length) {
    lines.push("\n[진행 포인트 — 교사 관점으로 작성]");
    sd.진행포인트.forEach(v => lines.push(`  · ${v}`));
  }

  if (sd.추천대상?.length) {
    lines.push("\n[추천 대상 — 마무리에 반드시 포함]");
    sd.추천대상.forEach(v => lines.push(`  · ${v}`));
  }

  if (sd.동선구조?.length) {
    lines.push("\n[동선 구조 — 반드시 본문에 반영]");
    sd.동선구조.forEach(v => lines.push(`  · ${v}`));
  }

  if (sd.mustInclude?.length) {
    lines.push(`\n[필수 포함 요소] ${sd.mustInclude.join(" / ")}`);
  }

  if (sd.teacherWorries?.length) {
    lines.push(`\n[선생님 고민] ${sd.teacherWorries.slice(0,2).join(" / ")}`);
  }
  if (sd.intro?.length) {
    lines.push(`\n[도입부 힌트] ${sd.intro.slice(0,2).join(" / ")}`);
  }
  if (sd.captions?.length) {
    lines.push(`\n[이미지 묘사 힌트] ${sd.captions.slice(0,3).join(" / ")}`);
  }

  return lines.length ? "\n\n[프로그램 운영/현장 데이터]\n" + lines.join("\n") : "";
}

// ── v30: 운영형 구조 (감정형 → 구조형) ──────────────────────
// 공통: structure → flow → activity → detail → scene → target → closing
// 프로그램별 분기는 getSectionPrompt 내에서 처리

const SECTIONS = ["structure", "flow", "activity", "detail", "scene", "target", "closing"];

// 섹션별 최소 글자수
const SECTION_MIN = {
  structure:  600,  // 공간/동선 (핵심 — 맨 앞)
  flow:       600,  // 운영 흐름
  activity:   700,  // 놀이/체험
  detail:     600,  // 교사 기준 (안전/준비/편의)
  scene:      500,  // 현장 장면 (에피소드)
  target:     350,  // 추천 대상
  closing:    100,  // 마무리
};


// 섹션별 max_tokens (v4 — 700자 목표 / 한국어 1tok≈0.7자, 여유 30%)
const MAX_TOKENS = {
  intro:      900,   // 도입   600자 목표
  reaction:   1100,  // 현장반응 700자 목표
  classroom:  1100,  // 교실구성 700자 목표
  operation:  1100,  // 운영방법 700자 목표
  episode:    1000,  // 에피소드 650자 목표
  recommend:  600,   // 추천대상 350자 목표
  closing:    300,   // 마무리   150자 목표
  // 하위호환
  structure:  1100,
  flow:       1100,
  activity:   1100,
  detail:     1100,
  scene:      1000,
  target:     600,
};

// ALT 텍스트 — 섹션별로 맥락 있는 ALT 생성
const ALT_BY_SECTION = {
  intro:     (loc, kw) => `유치원 ${kw} 교실 입장 장면`,
  reaction:  (loc, kw) => `유치원 ${kw} 아이들 첫 반응 모습`,
  classroom: (loc, kw) => `유치원 ${kw} 교실 구성 모습`,
  operation: (loc, kw) => `유치원 ${kw} 운영 진행 장면`,
  episode:   (loc, kw) => `유치원 ${kw} 아이들 체험 에피소드`,
};

// 하위 호환용 풀 (섹션키 없을 때)
const ALT_SITUATIONS = [
  "현장", "아이들 활동", "아이들 반응", "체험 장면",
  "아이들 모습", "교실 구성 모습", "체험 활동 장면", "현장 기록",
];


// ============================================================
// 유틸
// ============================================================

function removeBadSentences(text) {
  // 번호 헤더 제거 (1. 도입 / 2. 현장 반응 등)
  let result = text.replace(/^\d+\.\s*(도입|현장 반응|교실 구성|운영 방법|에피소드|마무리)\s*$/gm, "");

  // 약한 필터 — 문단 안 날리고 패턴만 교체
  const replacements = [
    [/호기심이 가득했다/g, ""],
    [/호기심이 가득했습니다/g, ""],
    [/만족감이 가득했다/g, ""],
    [/기대감이 가득했다/g, ""],
    [/을 통해 .{0,15} 배웠다/g, ""],
    [/협동과 선택의 중요성을[^.]*\./g, ""],
    // v37 — 설명형 후처리 제거
    [/이처럼[^.]*\./g, ""],
    [/[^.]{0,10}을 통해[^.]*\./g, ""],
    [/[^.]{0,10}를 통해[^.]*\./g, ""],
    [/자연스럽게 배우[^.]*\./g, ""],
    [/자연스럽게 익히[^.]*\./g, ""],
    [/협동심을 기르[^.]*\./g, ""],
    [/사회적 기술[^.]*\./g, ""],
    [/기회를 제공[^.]*\./g, ""],
    // v47 — 코너 구성 재설명 패턴 차단
    [/[^\n]*교실 구성은 크게 \d+개 코너로[^.]*\./g, ""],
    [/[^\n]*코너로 나뉜다[^.]*\./g, ""],
    [/첫 번째 코너인[^.]*\./g, ""],
    [/다음으로 이동한[^.]*교실에서는[^.]*\./g, ""],
    [/마지막으로[^.]*교실에서는[^.]*\./g, ""],
    // v47b — 변형 패턴 추가 차단
    [/^첫 번째는[^.]*교실[^.]*\.$/gm, ""],
    [/^두 번째 코너는[^.]*\.$/gm, ""],
    [/^세 번째[^.]*교실[^.]*\.$/gm, ""],
    [/^두 번째는[^.]*교실[^.]*\.$/gm, ""],
    [/^마지막 코너는[^.]*\.$/gm, ""],
    // v47c — 추가 변형
    [/^첫 번째 코너는[^.]*\.$/gm, ""],
    [/^두 번째는[^.]*\.$/gm, ""],
    [/^세 번째 코너는[^.]*\.$/gm, ""],
    [/^마지막은[^.]*교실[^.]*\.$/gm, ""],
    // v49b — 전통놀이 코너 소개 변형 패턴
    [/^먼저\s+[^.]*교실에서는[^.]*\.$/gm, ""],
    [/^다음으로\s+[^.]*교실에서는[^.]*\.$/gm, ""],
    [/^[^.]*놀이A교실에서는[^.]*\.$/gm, ""],
    [/^[^.]*놀이B교실에서는[^.]*\.$/gm, ""],
    [/^[^.]*체험교실에서는[^.]*\.$/gm, ""],
    // v49c — "첫 번째로/두 번째로 ~교실" 변형
    [/^첫\s*번째로[^.]*교실[^.]*\.$/gm, ""],
    [/^두\s*번째로[^.]*교실[^.]*\.$/gm, ""],
    [/^세\s*번째로[^.]*교실[^.]*\.$/gm, ""],
    [/^마지막으로[^.]*교실에서는[^.]*\.$/gm, ""],
  ];

  replacements.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function calcCharCount(text) {
  // 유효 글자수 = 전체 - [이미지:...] 태그 - 해시태그 줄 - 소제목 ## 기호 - 공백
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")      // 이미지 태그 전체 제거
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")   // 해시태그 줄 제거
    .replace(/^HASHTAGS:.+$/gm, "")          // HASHTAGS: 줄 제거
    .replace(/^##\s*/gm, "")                 // ## 소제목 기호만 제거 (텍스트는 유지)
    .replace(/\s/g, "")                      // 공백 제거
    .length;
}

function extractRegionShort(region) {
  if (!region) return "";
  return region
    .replace(/^(서울|경기|인천|부산|대구|광주|대전|울산)\s*/u, "")
    .replace(/(시|구|군)$/, "")
    .trim();
}

// [수정] 지역 40% 확률로만 사용
function shouldUseRegion(region) {
  return false; // v41: 지역 완전 차단
}

// [수정] 본문 내 지역 최대 3회까지만 허용
function limitRegionUsage(text, region) {
  if (!region) return text;
  let count = 0;
  return text.replace(new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), () => {
    count++;
    return count <= 3 ? region : "";
  });
}

function buildAlt(region, subKw, usedAlts, sectionKey) {
  // 섹션별 맥락 있는 ALT 우선 사용 (지역 제거)
  if (sectionKey && ALT_BY_SECTION[sectionKey]) {
    return ALT_BY_SECTION[sectionKey]("", subKw);
  }
  const pool = ALT_SITUATIONS.filter(s => !(usedAlts || []).includes(s));
  const sit  = pool.length > 0
    ? pool[Math.floor(Math.random() * pool.length)]
    : ALT_SITUATIONS[Math.floor(Math.random() * ALT_SITUATIONS.length)];
  return `유치원 ${subKw} ${sit}`;
}

// 제목 자동생성
// 구조: 패턴 3개 × 결과 유형 4개 × 각 8문장 + 강한문장 20% = S급
// 문맥 맞춤 선택 + 동일 표현 반복 방지 필터 포함
function generateTitle(subKw, region, memo, program) {
  // v40: 지역 로직 완전 제거

  // ── titlePatterns 우선 사용 (data.js seoData 연결) ──────────
  if (program?.seoData?.titlePatterns?.length) {
    const patterns = program.seoData.titlePatterns;
    if (!generateTitle._usedPatterns) generateTitle._usedPatterns = [];
    const used = generateTitle._usedPatterns;
    const fresh = patterns.filter(p => !used.includes(p));
    const chosen = fresh.length > 0
      ? fresh[Math.floor(Math.random() * fresh.length)]
      : patterns[Math.floor(Math.random() * patterns.length)];
    used.push(chosen);
    if (used.length > 3) used.shift();
    return chosen;
  }

  // ── 중복 방지 pick ─────────────────────────────────────────
  // 최근 사용 표현 기억 (모듈 스코프 캐시)
  if (!generateTitle._usedEndings) generateTitle._usedEndings = [];
  const usedEndings = generateTitle._usedEndings;

  // 풀에서 최근 3회 사용된 표현 제외 후 선택
  const pickFresh = (arr) => {
    const fresh = arr.filter(s => !usedEndings.includes(s));
    const chosen = fresh.length > 0
      ? fresh[Math.floor(Math.random() * fresh.length)]
      : arr[Math.floor(Math.random() * arr.length)]; // 전부 사용됐으면 그냥 랜덤
    usedEndings.push(chosen);
    if (usedEndings.length > 3) usedEndings.shift(); // 최근 3개만 기억
    return chosen;
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 시기 자동 감지
  const month  = new Date().getMonth() + 1;
  const season = month >= 3 && month <= 5  ? "봄학기"
               : month >= 6 && month <= 8  ? "여름방학"
               : month >= 9 && month <= 11 ? "가을학기"
               : "겨울방학";

  // ── 결과 유형별 풀 ─────────────────────────────────────────

  // ① 반응형 — 아이 중심
  const POOL_REACTION = [
    "아이들 반응 좋았습니다",
    "아이들이 먼저 찾습니다",
    "집중해서 끝까지 참여했습니다",
    "끝나고도 아쉬워했습니다",
    "아이들이 정말 좋아했습니다",
    "생각보다 훨씬 잘 됐습니다",
    "아이들 표정이 달랐습니다",
    "몰입도가 확실히 높았습니다",
  ];

  // ② 운영형 — 교사 중심
  const POOL_OPERATION = [
    "준비가 훨씬 수월합니다",
    "교사 부담이 줄어듭니다",
    "진행이 끊기지 않습니다",
    "동선이 자연스럽게 돌아갑니다",
    "이렇게 운영하니 훨씬 쉬웠습니다",
    "교실 세팅 이것만 알면 됩니다",
    "준비부터 마무리 이렇게 했습니다",
    "처음인데도 수월하게 됩니다",
  ];

  // ③ 결과형 — 분위기 변화
  const POOL_RESULT = [
    "교실 분위기가 완전히 달라집니다",
    "행사 만족도가 높습니다",
    "참여도가 확실히 올라갑니다",
    "교실이 살아났습니다",
    "사진 결과도 잘 나옵니다",
    "준비보다 효과가 컸습니다",
    "분위기가 처음부터 달랐습니다",
    "마무리까지 에너지가 유지됩니다",
  ];

  // ④ 비교형 — 차별화
  const POOL_DIFF = [
    "다른 체험보다 반응이 다릅니다",
    "한 번 해보면 차이가 느껴집니다",
    "기존 프로그램과 확실히 다릅니다",
    "직접 해보니 확실히 달랐습니다",
    "매년 다시 찾는 데는 이유가 있습니다",
    "선생님들이 계속 찾는 이유 있습니다",
    "해보면 왜 인기인지 압니다",
    `${season} 행사로 이만한 게 없습니다`,
  ];

  // ⑤ 강한 문장 풀 — 클릭률 상승용 (20% 확률로 섞임)
  const POOL_STRONG = [
    "이건 무조건 반응 나옵니다",
    "이거 하나로 분위기 바뀝니다",
    "처음부터 끝까지 집중합니다",
    "한 번만 해봐도 바로 압니다",
    "이게 왜 인기인지 직접 확인했습니다",
    "아이들이 스스로 움직입니다",
    "교실이 완전히 달라지는 경험입니다",
    "준비 10분, 반응은 2시간입니다",
  ];

  // ── 문맥 맞춤: memo/subKw 키워드 → 유형 자동 선택 ───────────
  const memoText = (memo || "") + subKw;
  let pool;
  if      (/반응|아이|몰입|집중|좋아|참여/.test(memoText))        pool = POOL_REACTION;
  else if (/운영|구성|준비|진행|동선|교사|선생/.test(memoText))   pool = POOL_OPERATION;
  else if (/분위기|만족|결과|변화|효과/.test(memoText))            pool = POOL_RESULT;
  else if (/비교|차이|다른|차별|추천/.test(memoText))              pool = POOL_DIFF;
  else    pool = pick([POOL_REACTION, POOL_OPERATION, POOL_RESULT, POOL_DIFF]);

  // 20% 확률로 강한 문장 풀로 교체
  const activePool = Math.random() < 0.2 ? POOL_STRONG : pool;

  // ── [주제명] 메모 감지 ─────────────────────────────────────
  const specialMatch = memo?.match(/^\[([^\]]+)\]/);
  if (specialMatch) {
    const topic = specialMatch[1];
    const specialPatterns = [
      `유치원 ${subKw} 후기, ${topic} ${pickFresh(POOL_REACTION)}`,
      `유치원 ${subKw}, ${topic} ${pickFresh(POOL_OPERATION)}`,
      `${topic} 유치원 ${subKw}, ${pickFresh(POOL_DIFF)}`,
    ];
    const validSpecial = specialPatterns.filter(p => p.length >= 20 && p.length <= 48);
    if (validSpecial.length > 0) return pick(validSpecial);
  }

  // ── 3패턴 × 선택된 풀 조합 ────────────────────────────────
  // 1️⃣ 후기형
  const reviewTitles = [
    `유치원 ${subKw} 후기, ${pickFresh(activePool)}`,
    `유치원 ${subKw} 현장 후기, ${pickFresh(pool)}`,
    `유치원 ${subKw} 운영 후기, ${pickFresh(pool)}`,
  ];

  // 2️⃣ 방법형 — 운영형 우선, 20% 강한 문장
  const opPool = Math.random() < 0.2 ? POOL_STRONG : pick([POOL_OPERATION, pool]);
  const howTitles = [
    `유치원 ${subKw}, ${pickFresh(opPool)}`,
    `유치원 ${subKw} 운영, ${pickFresh(opPool)}`,
    `유치원 ${subKw} 교실 구성, ${pickFresh(POOL_OPERATION)}`,
  ];

  // 3️⃣ 추천형 — 비교/결과 우선, 20% 강한 문장
  const recPool = Math.random() < 0.2 ? POOL_STRONG : pick([POOL_DIFF, POOL_RESULT]);
  const recommendTitles = [
    `${season} 유치원 ${subKw}, ${pickFresh(recPool)}`,
    `유치원 ${subKw} 추천, ${pickFresh(recPool)}`,
    `${season} 유치원 ${subKw} 추천, ${pickFresh(POOL_DIFF)}`,
  ];

  const all   = [...reviewTitles, ...howTitles, ...recommendTitles];
  const valid = all.filter(p => p.length >= 20 && p.length <= 48);
  // subKw 강제 포함 보장
  let finalTitle = pick(valid) || `유치원 ${subKw} 후기, 아이들 반응 좋았습니다`;
  if (!finalTitle.includes(subKw)) {
    finalTitle = `${subKw} ${finalTitle}`;
  }
  return finalTitle;
}


// ============================================================
// v14 확장 로직
// ============================================================

// 행동 동사 다양화 — 반복 동사 교체용
const ACTION_VARIANTS = {
  "웃었다":    ["환하게 웃음을 터뜨렸다", "입가에 웃음이 번졌다", "소리 내어 웃었다"],
  "놀았다":    ["신나게 뛰어다녔다", "이곳저곳을 누볐다", "활기차게 움직였다"],
  "고른다":    ["손을 뻗어 집었다", "꼼꼼하게 살펴보며 골랐다", "여러 개를 비교해봤다"],
  "담는다":    ["바구니에 조심스럽게 넣었다", "하나씩 쌓아 담았다", "가득 채워 넣었다"],
  "건넨다":    ["두 손으로 건네줬다", "활짝 웃으며 내밀었다", "조심스럽게 전달했다"],
  "말했다":    ["목소리를 높여 외쳤다", "또렷하게 말했다", "친구에게 속삭였다"],
  "봤다":      ["눈을 동그랗게 뜨고 바라봤다", "뚫어지게 쳐다봤다", "흘끔 곁눈질했다"],
};

/**
 * diversifyActions — 동일 동사가 3회 이상 반복되면 교체
 */
function diversifyActions(text) {
  let result = text;
  for (const [verb, variants] of Object.entries(ACTION_VARIANTS)) {
    const regex = new RegExp(verb, "g");
    const matches = result.match(regex) || [];
    if (matches.length < 3) continue;
    // 3번째 이상 등장부터 순환 교체
    let count = 0;
    result = result.replace(regex, (match) => {
      count++;
      if (count <= 2) return match;
      const pick = variants[(count - 3) % variants.length];
      return pick;
    });
  }
  return result;
}

/**
 * expandSection — 반복 동사 교체만 수행 (단문 확장 제거)
 * 단문 스타일로 전환 후 expandLine은 오히려 방해가 되므로 비활성화
 */
function expandSection(text) {
  if (!text) return text;
  return diversifyActions(text);
}


// ============================================================
// v15 후처리 파이프라인
// ============================================================

// 1) 설명형 문장 제거 — v32: 감성/교육 서술 + 반복 장면 차단
const EXPLAIN_BANNED = [
  // 기존
  "상상력", "행복으로 가득", "특별한 순간", "특별한 경험", "특별한 하루",
  "잊지 못할", "소중한 추억", "성장", "교육적", "발달에", "효과",
  "아이들에게 좋", "도움이 되", "의미 있", "값진", "보람",
  // v17
  "특별함을", "새로운 경험", "풍부한", "느끼며", "만들었다",
  "소중한", "특별한 기억", "선사", "순간 속에서",
  "아이들의 눈은 반짝", "행사의 순간",
  // v18
  "유치원 행사답게", "행사가 끝날 때까지", "즐겁게 참여했다",
  "웃음소리가 끊이지 않았다", "배우고 있었다", "활기가 넘쳤다",
  "느껴졌다", "인상적이었다", "성취감을 느끼는",
  "모든 것이 진짜처럼", "행사장 곳곳에서",
  // v19
  "꿈의 공간", "굉장히", "작은 손길로 가득",
  "하는 법을 배우", "를 통해 아이들", "에서 아이들은",
  "이 선생님이 말했다", "김 선생님이 말했다", "박 선생님이 말했다",
  "선생님이 말했다", "학부모가 말했다", "학부모 한 분이",
  "오늘은 행사가 있었다", "다들 준비됐죠",
  // v27
  "회전목마", "기차를 타", "풍선 장식", "사탕과 장난감", "놀이공원 느낌",
  "오래도록 기억", "설렘이 가득", "기억을 쌓", "그날의 경험",
  "재밌어요", "재밌었어", "즐거운 시간을 보냈",
  "구름 위를 걷는", "아슬아슬한 순간", "반복된 탑승에도",
  "떨어질 듯 말 듯", "날아가는 것 같",
  "보석 찾기", "형광 페인팅", "형광 페인트", "액세서리", "목걸이", "팔찌",
  "빛나는 액세서리", "자갈 사이에서", "신비로운 어둠 속에서 아이들의 눈이 반짝",
  // v32 — 반복 감성 패턴 + GPT 우회 패턴 차단
  "자신감을 심어주", "창의력", "즐거움으로 가득", "사회성을 키",
  "눈빛은 즐거움", "눈빛이 빛났", "모두가 만족",
  "행사를 준비할 때 가장 고민", // 도입부 반복 차단
  // v33 — recommend 섹션 설명형 회귀 패턴
  "자연스럽게 익힌", "가치를 알아", "전략도 구상",
  "수학적 개념", "물건의 가치", "팀을 이뤄",
  "만족스러운 활동이 될", "직접 느끼게 된",
  // v34 — 경찰놀이 recommend 설명형 회귀 패턴
  "교통사고 예방에 대한", "경각심을 일깨", "책임감을 심어",
  "교통 수신호를 학습", "경찰관 모자를 쓰고",
  "실제 도로 상황을 재현", "신호등이 어떻게 변할까",
  "역할을 나누며 안전 교육",
  // v37 — 설명형 반복 패턴 추가 (키워드 점수 저하 원인)
  "이처럼", "자연스럽게 배우", "자연스럽게 익히",
  "협동심을 기르", "사회적 기술", "사회성을 기르",
  "기회를 제공", "시간을 보냈다", "시간이었다",
  // v38 — 추가 설명형 차단
  "도움이 된다", "이해를 높이",
  // "효과적으로" 제외 — v47c: 단어 잘림 부작용 ("더욱 적으로" 잔재)
  "교육적 가치", "중요하다", "경험을 제공",
  "가치를 느끼", "흥미를 유도",
  // v41 — 자동100점 엔진 병합
  "자연스럽게 익히다", "교육적 효과", "이해를 돕는다", "의미 있는 경험",
  // v42~v46 프로그램별 특화 패턴 — 전체 공통 적용 금지 (쏠림 원인)
  // 아래는 설명형/교육효과 중 진짜 공통인 것만 유지
  "중요한 부분이었다", "성공적으로 진행",
  "호기심과 몰입을 이끌어", "이끌어내며",
  "구성되어 있다", "구성되었다",
  // v46b — 방송국체험 테스트 (방송 관련 고유 표현만 유지)
  "새로운 도전과 성취감", "일방통행 운영 구조",
  "발표를 주저하던", "자신만의 방송국",
  // v49 — 전통놀이 설명형 + 금지 도구 차단
  "전통 놀이의 재미와 가치를", "자연스럽게 전달", "협동과 몰입의 과정",
  // v49c — 전통놀이 금지 도구 (기본형 외 도구 차단)
  "굴렁쇠를", "떡매치기", "줄다리기에서", "사방치기에서", "버나돌리기",
  // v47 — 코너 구성 재설명 차단
  "교실 구성은 크게", "코너로 나뉜다", "코너로 구성된다",
  "첫 번째 코너인", "두 번째 코너인", "세 번째 코너인",
  "다음으로 이동한", "마지막 코너인",
  // v47b — 변형 패턴
  "첫 번째는 신병", "두 번째 코너는", "세 번째는 사격",
  "첫 번째는 유격", "두 번째는 사격", "마지막 코너는",
];

function removeExplanation(text) {
  let r = text;
  EXPLAIN_BANNED.forEach(w => {
    const safe = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    r = r.replace(new RegExp(safe, "g"), "");
  });
  return r.replace(/\n{3,}/g, "\n\n").trim();
}

// 1-a) 오타 교정 — v18
function fixTypo(text) {
  return text
    .replace(/맛있었다\s*보여/g, "맛있어 보여")
    .replace(/맛있었다\s*보인다/g, "맛있어 보인다")
    .replace(/맛있었다\s*보였다/g, "맛있어 보였다")
    .replace(/좋았다\s*보여/g, "좋아 보여")
    .replace(/예뻤다\s*보여/g, "예뻐 보여");
}

// 1-b) 도입부 라인 수 제한 (trimIntro)
function trimIntro(text) {
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(0, 6).join("\n");
}

// 1-c) 섹션별 라인 수 제한 — operation/classroom은 넉넉하게
const SECTION_LINE_LIMIT = {
  intro:      28,   // 600자 목표 (25자×28줄)
  reaction:   32,   // 700자 목표
  classroom:  32,   // 700자 목표
  operation:  32,   // 700자 목표
  episode:    28,   // 600자 목표
  recommend:  20,   // 400자 목표
  closing:    8,    // 150자 목표
};

function applySectionLimit(text, sectionKey) {
  const limit = SECTION_LINE_LIMIT[sectionKey] || 8;
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(0, limit).join("\n");
}

// 2) 의미 중복 문장 제거 — 동사 기준 + 구조 문장 기준
const SEMANTIC_VERBS = [
  "웃", "뛰", "달려", "소리", "외쳤", "자랑", "고민", "선택", "집었", "건넸",
  "바라봤", "돌아다", "몰려", "모여", "줄 서",
];

// 구조 문장 패턴 — 이 패턴이 감지되면 2번째부터 제거
const STRUCTURAL_PHRASES = [
  /대기\s*(없이|없음|가\s*없)/,
  /자유롭게\s*이동/,
  /아이들이\s*자유롭게/,
  /교사\s*개입\s*(없이|최소)/,
  /조명.*암막|암막.*조명/,
  /반복\s*체험이?\s*가능/,
  /이동하며\s*체험을?\s*선택/,
  /입구와\s*출구를?\s*분리/,
  // v32 — 장면 자체 복붙 차단 (3회 반복 패턴)
  /아이들이\s*교실에\s*들어섰다/,
  /눈앞에\s*상점이\s*펼쳐졌다/,
  /아이들은\s*바로\s*달려갔다/,
  /환호성이\s*터졌다/,
  /행사를\s*준비할\s*때\s*가장\s*고민/,
  /단순\s*(놀이|체험)로는\s*부족/,
  // v34 — 경찰놀이 반복 구조 차단
  /경찰\s*출동센터.*교통안전.*설치/,
  /두\s*공간.*분리.*설치/,
  /호출벨.*유치원\s*전체.*연결/,
  // v33 — 프로그램별 도입부 반복 차단
  /아이들이\s*가장\s*좋아하는\s*역할놀이/,
  /단순\s*놀이보다\s*실제처럼/,
];

// 3) 대사 강제 주입 — v17: 풀 확장 + 섹션 확대
const DIALOGUE_POOL = [
  '"나도 해볼게!" 앞으로 끼어들었다.',
  '"이거 어떻게 해요?" 손을 들었다.',
  '"여기 봐봐!" 손짓하며 불렀다.',
  '"같이 가자!" 손을 잡아끌었다.',
  '"내가 먼저!" 발걸음이 빨라졌다.',
  '"이게 뭐야?" 고개를 기울였다.',
  '"다시 하면 안 돼요?" 눈을 반짝였다.',
  '"나도 저거 할 거야!" 결심한 듯 말했다.',
  '"선생님, 됐어요!" 또렷하게 외쳤다.',
];

// 경찰·교통안전 전용 대사풀
const DIALOGUE_POOL_POLICE = [
  '"출동이다!" 경광봉을 쥐고 뛰쳐나갔다.',
  '"내가 왜요?!" 잡히면서 버텼다.',
  '"범인 하실래요?" 원장님에게 공손하게 물었다.',
  '"왜 안 울려?" 디스플레이 앞에 붙어 기다렸다.',
  '"빨간불이야 멈춰!" 경광봉을 들고 소리쳤다.',
  '"나 경찰 할래요!" 손을 번쩍 들었다.',
  '"여기다!" 지문 보드판을 손가락으로 짚었다.',
  '"잡았다!" 두 팔로 범인을 에워쌌다.',
];

function enforceDialogue(text, sectionKey, subKw) {
  // intro 제외 전 섹션 적용
  if (sectionKey === "closing") return text;
  if (text.includes('"')) return text; // 이미 대사 있으면 스킵
  // 경찰·교통안전 전용 대사풀 분기
  const pool = (subKw && subKw.includes("경찰")) ? DIALOGUE_POOL_POLICE : DIALOGUE_POOL;
  const line = pool[Math.floor(Math.random() * pool.length)];
  const lines = text.split("\n");
  const mid = Math.max(1, Math.floor(lines.length / 2));
  lines.splice(mid, 0, line);
  return lines.join("\n");
}

// 4) 최대 라인 수 제한 — 밀도 유지
function trimToMaxLines(text, maxLines = 22) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n");
}

// 5) 섹션 역할 검증 — 역할 벗어난 문장 제거
const SECTION_BANNED = {
  intro:      ["얼마예요", "계산", "거스름돈", "선생님이 말했다", "학부모",
               "꿈의 공간", "굉장히", "하는 법을 배우"],
  reaction:   ["선생님이 말했다", "학부모", "꿈의 공간", "굉장히",
               "하는 법을 배우", "를 통해 아이들"],
  classroom:  ["선생님이 말했다", "학부모가 말했다", "꿈의 공간",
               "굉장히", "하는 법을 배우"],
  operation:  ["선생님이 말했다", "학부모가 말했다", "꿈의 공간",
               "굉장히", "하는 법을 배우"],
  episode:    ["선생님이 말했다", "꿈의 공간", "굉장히"],
  recommend:  [], // 추천 대상은 허용 범위 넓음
  closing:    ["얼마예요", "계산", "거스름돈", "선생님이 말했다",
               "꿈의 공간", "굉장히"],
};

function enforceRole(text, sectionKey) {
  const banned = SECTION_BANNED[sectionKey] || [];
  if (banned.length === 0) return text;
  return text
    .split("\n")
    .filter(line => {
      const s = line.trim();
      if (!s || /^\[이미지:/.test(s)) return true;
      return !banned.some(w => s.includes(w));
    })
    .join("\n");
}

/**
 * postProcess — 전체 후처리 파이프라인
 * generateSection 안에서 filter → expand 다음에 실행
 */
function postProcess(text, sectionKey) {
  if (!text) return text;
  let t = text;
  t = fixTypo(t);                       // 0) 오타 교정
  t = removeExplanation(t);             // 1) 설명형 제거
  t = removeMeaningDuplicate(t);        // 2) 의미 중복 제거 (removeMeaningDuplicate 단일화)
  t = enforceRole(t, sectionKey);       // 3) 섹션 역할 강제
  if (sectionKey === "intro") t = trimIntro(t); // 4) 도입부 제한
  t = applySectionLimit(t, sectionKey); // 5) 섹션별 라인 제한
  t = fixTruncated(t);                  // 6) 깨진 문장 제거 (v44: postProcess에도 추가)
  // v44 — 공백 2칸 이상으로 끊긴 문장 제거
  t = t.split("\n").filter(line => {
    const s = line.trim();
    if (!s || /^\[이미지:/.test(s) || /^#/.test(s)) return true;
    if (/\s{2,}/.test(s)) return false;      // 공백 2칸 이상
    if (/\s+,/.test(s)) return false;         // 쉼표 앞 공백 ("즐거움을 ,")
    if (/[가-힣]\s+하며[,.]?\s*$/.test(s)) return false; // "다양한 하며," 패턴
    return true;
  }).join("\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

// ============================================================
// v38 — 프로그램별 운영 스펙 디테일 + 마무리 + 사진 포인트
// ============================================================

const DETAIL_MAP = {
  "과학":       "비커 10세트, 보호안경, 실험테이블 2개, 동시 12명 운영 구조",
  "블랙라이트": "암막커튼 완전 차단, 블랙라이트 4대, 형광블락 세트, VR 12세트",
  "에어바운스": "대형 8m 구조, 동시 20명 이용, 안전요원 4명 배치",
  "캠핑":       "텐트 4동, 모닥불존, 화로 2개, 별자리 프로젝터 구성",
  "시장놀이":   "8m 배경막, 4개 상점 구성, 화폐 400장, 장바구니 제공",
  "병원놀이":   "현수막 3개·접수+약국+진료과 5개+수술실 구성, 실제 혈압계·체중계·영상현미경·네뷸라이저, 가운 8벌+수술복 4벌",
  "목공":       "망치, 못, 사포 세트, 작업대 4개, 동시 20명 가능",
  "경찰":       "출동벨 시스템, 수사키트, 감옥존, 교통신호등 체험",
  "레트로":     "딱지, 구슬, 고무줄, 팽이 4종 구성",
  "반죽":       "반죽 20kg, 제면기, 쿠키오븐, 통밀 분쇄기",
  "전통놀이":   "윷놀이, 투호, 제기차기, 팽이 4개 코너 독립 운영",
  "병영":       "군복 30벌, 장애물코스 5종, 모형총 20정, 단체훈련장",
  "겨울":       "인공눈 10kg, 눈사람 키트, 스노우볼 20개, 완성품 포장 서비스",
  "여름캠프":   "물총 30정, 워터슬라이드 2대, 물풍선 200개, 안전요원 배치",
};

function injectDetail(text, subKw) {
  if (!subKw) return text;
  const key = Object.keys(DETAIL_MAP).find(k => subKw.includes(k));
  if (!key) return text;
  const detail = DETAIL_MAP[key];
  // 도입부 두 번째 줄 뒤에 자연스럽게 삽입
  const lines = text.split("\n");
  const insertIdx = Math.min(3, lines.length);
  lines.splice(insertIdx, 0, `\n운영 규모는 ${detail}으로 구성된다.\n`);
  return lines.join("\n");
}

function addPhotoPoint(text) {
  return text + `\n\n사진은 아이들이 활동에 몰입하는 순간을 중심으로 촬영하면 좋다.\n손을 사용하는 장면, 표정이 살아있는 순간, 친구와 상호작용하는 장면이 가장 잘 나온다.`;
}

function addEnding(text) {
  // v45e — 고정 반복 문구 제거 (네이버 중복 콘텐츠 감지 방지)
  return text;
}


// ============================================================
// 필터 — 섹션 텍스트에 적용 (삭제만 하던 것 → 확장 후 적용)
// ============================================================

function filterSection(text, subKw) {
  // 금지어
  const FORBIDDEN = /구성됩니다|구성되어|제공됩니다|설치됩니다|가능합니다|안내드립|포함됩니다|진행됩니다|시작됩니다|시작되었습니다|운영됩니다|이루어집니다|커스터마이징|경험을 쌓|새로운 세상|상상력과 에너지|펼쳐졌어요|특별한 날|꿈속 같|추천합니다|인기 프로그램/;
  // 설명형 패턴
  const EXPLAIN = /으로\s*(구성|진행|운영|제공)|을\s*통해.{0,15}(있습니다|됩니다)|에\s*(도움|효과)가\s*(있|됩)/;
  // 리스트
  const LIST = /^\s*([\u2460-\u2469]|\d+\.|[✔✅•·]|-\s)/;
  // CTA
  const CTA = /문의|예약|연락주|전화|홈페이지|banjang|010-\d/;
  // 주제 이탈
  const OFF_TOPIC = /운동장에서|마당에서|풍선을 불|나무 그늘|블록을 쌓|하늘로 날아|바람에 흩날|꿈속 같았|리듬을 타며 춤|물감으로 그림|모래밭|하늘을 수놓|회전목마|기차를 타|사탕 가게|장난감 상점|놀이공원처럼|어느새 한 쌍|순찰차\s*(탑승|모형|타고)|경찰차\s*모형|교통사고\s*예방에\s*대한|교통\s*수신호를\s*학습|경찰관\s*모자를\s*쓰고/;
  // 나열형
  const ENUM = /[가-힣]{1,6},\s*[가-힣]{1,6},\s*[가-힣]{1,6}/;

  const lines = text.split("\n");
  const out = [];
  let imnidaCount = 0;

  for (const line of lines) {
    const s = line.trim();
    if (!s || /^\[이미지:/.test(s)) { imnidaCount = 0; out.push(line); continue; }
    // 해시태그 줄 원천 차단
    if (/^(#\S+[\s\t]*){2,}/.test(s)) continue;
    if (LIST.test(s))      continue;
    if (CTA.test(s))       continue;
    if (OFF_TOPIC.test(s)) continue;
    if (FORBIDDEN.test(s)) continue;
    if (EXPLAIN.test(s))   continue;
    if (ENUM.test(s))      continue;
    if (/입니다[.!]?$|습니다[.!]?$|됩니다[.!]?$/.test(s)) {
      imnidaCount++;
      if (imnidaCount >= 4) continue;
    } else {
      imnidaCount = 0;
    }
    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}


// ============================================================
// 섹션별 프롬프트
// ============================================================

function getSectionPrompt(sectionKey, subKw, mainKw, region, memo, existing, program) {
  const loc        = extractRegionShort(region);
  const playConfig = getPlayConfig(subKw);
  // ── flow 슬라이스: 섹션마다 담당 단계만 받음 (flowIndex 공유) ──
  const flowBlock     = buildFlowBlockForSection(playConfig.flow, sectionKey);
  // ── 전체 흐름: 각 섹션이 참고용으로 사용 ──────────────────────
  const fullFlowBlock = buildFlowBlock(playConfig.flow);

  const BASE_RULE = `[절대 규칙]
- 주제 고정: "${subKw}" 현장만 작성. 다른 활동/장소 절대 금지.
- 문장 길이: 15~20자. 짧고 리듬감 있게.
- 줄바꿈: 2~3문장마다 빈 줄 하나 → 가독성 확보
- 구어체/존댓말 금지: "~했어/~했지/~해요" 전부 "~했다"로
- 리스트 금지 (①②③ ✔ • - 전부)
- CTA 금지 (문의/예약/전화)
- 소제목(##) 금지 (섹션 내부에서)
- 감성 서술 금지: "꿈의 공간", "굉장히", "특별한", "소중한"
- 교사 개입 금지 (review 섹션 제외)
- 같은 동사 3회 이상 반복 금지
- 이모티콘 본문 삽입 금지 (소제목에만 허용)
- 없는 내용 생성 금지: 회전목마, 기차, 상점, 풍선 장식 등 실제 구성에 없는 기구/소품 절대 금지
- 감탄사 제한: "와!", "우와!" 등 감탄사는 이 섹션에서 1개 이하
- 반복 표현 금지: "재밌어요", "즐거운 시간" 2회 이상 사용 금지

[🚨 중복 완전 차단 — 절대 규칙]
- "추천", "적합", "교사 부담" 등 동일 의미 표현은 글 전체에서 최대 1회만 사용
- 유사 표현도 반복 금지 — 두 번째부터는 다른 상황·행동 묘사로 대체
- 같은 추천 대상(유치원·어린이집·원장 등)을 반복 언급 금지
- "적합하다", "추천한다" 계열 문장이 이미 나왔으면 → 다음엔 반드시 장면/행동/대화로 전환
- 추천 문장 쓰고 싶으면 → 쓰지 말고 그 상황의 아이 반응으로 대체

[🔥 에피소드 최소 개수 강제]
- 아이 행동 중심의 실제 상황 에피소드를 글 전체에서 최소 2~3개 반드시 포함
- 에피소드 형식: 특정 아이 행동 + 대화 + 표정 또는 선택·갈등·행동 변화 포함
- "아이들이 좋아했다" 같은 설명형 문장으로 대체 금지

[🎯 마지막 장면 고정]
- 글 마지막은 반드시 감정형 장면으로 마무리
- 아이의 행동, 질문, 표정 등 기억에 남는 장면 2~3줄로 구성
- 설명형 문장("이 행사는 ~에 적합하다")으로 끝내지 말 것

[📍 후반부 30% 규칙]
- 글 후반부 30%는 설명형 문장을 줄이고 현장 장면·행동·대화 중심으로 작성
- "추천한다", "적합하다", "좋다" 같은 설명 문장은 후반부에 1회 이하로 제한

[단문 스타일 — 반드시 준수]
❌ 금지: "아이들이 교실에 들어서자마자 환호성이 울렸고 눈앞에 펼쳐진 장면을 보며 달려갔다."
✅ 권장 (짧게 끊어서):
아이들이 교실에 들어섰다.
"와!" 환호성이 터졌다.

${
  subKw.includes("시장") ? `눈앞에 상점이 펼쳐졌다.\n아이들은 바로 달려갔다.` :
  subKw.includes("병원") ? `접수대 앞에 줄이 생겼다.\n가운을 집어 든 아이가 먼저 뛰었다.` :
  subKw.includes("소방") ? `소방복이 눈앞에 놓였다.\n아이들은 서로 먼저 입으려 했다.` :
  subKw.includes("전통") ? `윷이 바닥에 떨어졌다.\n팀 전체가 소리를 질렀다.` :
  subKw.includes("캠핑") ? `모닥불 앞에 아이들이 모였다.\n텐트 안을 들여다보던 아이가 안으로 기어들었다.` :
  subKw.includes("방송") ? `카메라 앞에 섰다.\n마이크를 쥔 손이 떨렸다.` :
  subKw.includes("목공") ? `망치를 처음 쥐었다.\n손을 어디 두어야 할지 몰랐다.` :
  subKw.includes("과학") ? `비커 속 액체가 변했다.\n아이들이 일제히 앞으로 몸을 기울였다.` :
  subKw.includes("블랙라이트") ? `불이 꺼졌다.\n형광 빛이 손 위에서 번졌다.` :
  subKw.includes("반죽") ? `반죽이 손에 붙었다.\n아이는 잡아당기며 웃었다.` :
  subKw.includes("부모") ? `부모가 자리에 앉았다.\n아이가 먼저 재료를 집어 들었다.` :
  `무언가가 시작됐다.\n아이들이 먼저 움직였다.`
}`;

  // [주제명] 형식 감지 — 특별 주제 글 지시
  const specialTopicMatch = memo?.match(/^\[([^\]]+)\]/);
  const memoBlock = memo
    ? specialTopicMatch
      ? `\n[특별 주제 글 지시]\n이 글은 "${specialTopicMatch[1]}" 주제의 기획 글입니다.\n정해진 ${subKw} 현장 형식 안에서, 해당 주제에 맞게 도입부와 제목을 자연스럽게 구성하세요.\n추가 메모: ${memo.replace(/^\[[^\]]+\]\s*/, '').trim() || '없음'}`
      : `\n[현장 메모]\n${memo}`
    : "";
  const sceneBlock = buildSceneDataBlock(program);
  const 운영구성   = program?.seoData?.운영구성?.slice(0, 4).join(" / ") || "";
  // ── 이전 섹션 연결 블록 (generateSection 경로용) ────────────
  const existingBlock = existing
    ? `\n[이전 흐름 연결]\n${existing.slice(-800)}\n`
    : "";

  // ── 행동 구조 유형 분류 ───────────────────────────────────────
  const ROLE_PLAY  = ["시장", "병원", "경찰", "방송", "소방", "미용", "우체국"];
  const EXPERIENCE = ["블랙라이트", "과학", "목공", "반죽", "쿠키", "캠핑", "요리"];
  const PHYSICAL   = ["에어바운스", "여름캠프", "물놀이", "운동회"];
  const TRADITION  = ["전통놀이", "민속놀이", "투호", "윷놀이"];
  const RETRO      = ["레트로", "7080", "복고"];

  // [수정 1] default 제거 — 매칭 실패 시 null
  const playType =
    ROLE_PLAY .some(k => subKw.includes(k)) ? "역할놀이형" :
    EXPERIENCE.some(k => subKw.includes(k)) ? "체험형"     :
    PHYSICAL  .some(k => subKw.includes(k)) ? "신체활동형" :
    TRADITION .some(k => subKw.includes(k)) ? "전통놀이형" :
    RETRO     .some(k => subKw.includes(k)) ? "복고체험형" :
    null;

  // [수정 4] 매칭 실패 강제 차단
  if (playType === null) {
    throw new Error(`프로그램 유형 매칭 실패: "${subKw}" — playConfig 또는 ROLE_PLAY/EXPERIENCE 목록에 키워드 추가 필요`);
  }

  // [수정 2] TYPE_INST — 설명형 제거, 행동 강제형으로 교체
  const TYPE_INST = {
    역할놀이형: {
      reaction:  `[역할놀이형 — 행동 강제 규칙]
- 첫 문장: 역할이 나뉘는 순간 (배정/선택/착용) 으로 시작. 공간 설명 금지.
- 아이 3명 이상 등장. 각자 맡은 역할 + 역할에 맞는 행동 + 대사 1개씩.
- "역할이 다른 두 아이가 마주치는 장면" 1개 필수.
- 금지: "즐거워했다" / "참여했다" / "반응이 좋았다"`,
      classroom: `[역할놀이형 — 행동 강제 규칙]
- "코너에 무엇이 있다" 형태 절대 금지.
- 반드시: "아이가 코너에서 무엇을 했다" 행동 중심으로.
- 각 코너마다 아이 행동 1문장 + 대사 1문장 포함.
- 역할 공간이 분리된 이유를 행동으로 증명할 것.`,
      operation: `[역할놀이형 — 행동 강제 규칙]
- 역할 교체 타이밍을 구체적 숫자로 표현 (예: 3분, 5명씩).
- 역할 이동 순간 아이 행동 1문장 필수.
- "역할 충돌 또는 혼선 발생 → 교사 대응" 장면 1개 포함.
- 금지: "원활하게 진행됐다" / "자연스럽게 이동했다"`,
      episode:   `[역할놀이형 — 행동 강제 규칙]
- 에피소드마다 역할이 서로 다른 아이를 주인공으로.
- 에피소드 1: 역할 고집 장면 (자기 역할을 계속 하려는 아이).
- 에피소드 2: 역할 교체 갈등 장면 (바꾸기 싫어하거나 뺏기는 순간).
- 에피소드 3: 예상 못한 역할 역전 장면.
- 각 에피소드마다 대사 1개 이상 필수.`,
    },
    체험형: {
      reaction:  `[체험형 — 행동 강제 규칙]
- 첫 문장: 손이 재료/도구에 닿는 순간으로 시작. 공간 설명 금지.
- 촉각/시각 변화 반응을 신체 동작으로 표현 (손 뻗기, 코 가져다대기 등).
- "이게 뭐야?" "어떻게 해요?" 같은 탐색 대사 1개 필수.
- 금지: "흥미를 보였다" / "호기심을 느꼈다" / "신기해했다"`,
      classroom: `[체험형 — 행동 강제 규칙]
- 도구/재료 이름 + 수량 + 위치를 아이 행동으로 설명.
- 예: "테이블 위 비커 3개를 나눠 받았다. 지아는 바로 냄새를 맡았다."
- "재료를 보자마자 한 행동" 각 구역마다 1문장씩.
- 금지: "재료가 준비되어 있었다" / "도구가 배치되었다"`,
      operation: `[체험형 — 행동 강제 규칙]
- 준비→체험→결과 각 단계에서 교사가 한 행동 구체적으로.
- 예상 실패 상황 1개 + 교사 대응 방법 (숫자 포함).
- 결과물이 남는 체험: 완성 순간 아이 반응 1문장 포함.
- 금지: "원활하게 진행됐다" / "문제없이 마무리됐다"`,
      episode:   `[체험형 — 행동 강제 규칙]
- 에피소드마다 재료/도구의 "변화 순간"을 중심으로.
- 에피소드 1: 처음 시도 → 실패 → 다시 시도 흐름.
- 에피소드 2: 완성 순간 반응 (들고 다니기, 친구에게 보여주기).
- 에피소드 3: 예상 못한 결과 (색 변화, 모양 변화, 소리 등).
- 각 에피소드마다 대사 1개 이상 필수.`,
    },
    신체활동형: {
      reaction:  `[신체활동형 — 행동 강제 규칙]
- 첫 문장: 첫 번째 움직임 시작 순간. 속도감 있는 동사 필수.
- "달렸다" "뛰어들었다" "굴렀다" 같은 동사 각 아이마다.
- 반복 행동 표현: 같은 행동을 몇 번 반복했는지 숫자 포함.
- 금지: "활발하게 참여했다" / "신나게 뛰놀았다"`,
      classroom: `[신체활동형 — 행동 강제 규칙]
- 공간 크기를 아이 행동으로 표현 (예: "10명이 동시에 뛰어도 겹치지 않았다").
- 구역 간 이동 동선을 아이 실제 경로로 묘사.
- 충돌 방지 배치를 "아이가 어떻게 움직이는지"로 증명.
- 금지: "넓은 공간이 확보됐다" / "안전하게 배치됐다"`,
      operation: `[신체활동형 — 행동 강제 규칙]
- 순서 교체 타이밍 숫자 포함 (예: 2분 간격, 5명씩).
- 충돌 발생 순간 + 교사 대응 장면 1개 포함.
- 반복 횟수 제한 방식 구체적으로.
- 금지: "안전하게 진행됐다" / "질서 있게 참여했다"`,
      episode:   `[신체활동형 — 행동 강제 규칙]
- 에피소드마다 반복할수록 달라지는 행동 변화 표현.
- 에피소드 1: 처음엔 망설이다 뛰어든 장면.
- 에피소드 2: 실패 → 재도전 → 성공 흐름.
- 에피소드 3: 다른 아이 보고 따라하다 자기 방식 찾는 장면.
- 각 에피소드마다 대사 1개 이상 필수.`,
    },
    전통놀이형: {
      reaction:  `[전통놀이형 — 행동 강제 규칙]
- 첫 문장: 낯선 도구를 처음 집어드는 순간. "이게 뭐야?" 반응.
- 규칙을 이해 못해 당황하는 장면 1개 필수.
- 도구를 어떻게 잡았는지, 어떻게 써봤는지 손 동작 중심.
- 금지: "전통 문화를 경험했다" / "의미 있는 시간이었다"`,
      classroom: `[전통놀이형 — 행동 강제 규칙]
- 도구 이름 + 놀이 공간 배치를 팀 이동 경로로 설명.
- "팀이 자리 잡는 순간" 행동으로 묘사.
- 대기 공간과 참여 공간 구분을 아이 동선으로 증명.
- 금지: "전통 도구가 배치됐다" / "놀이 공간이 준비됐다"`,
      operation: `[전통놀이형 — 행동 강제 규칙]
- 규칙 설명 방식: 교사가 직접 시연하는 장면으로.
- 팀 나누는 방법 + 첫 번째 판 시작 순간.
- 규칙 분쟁 발생 → 교사 중재 장면 1개 포함.
- 금지: "규칙을 익혔다" / "이해했다"`,
      episode:   `[전통놀이형 — 행동 강제 규칙]
- 에피소드마다 팀 경쟁 또는 협력 장면 중심.
- 에피소드 1: 규칙 몰라서 실수하는 장면.
- 에피소드 2: 이기는 순간 팀 반응 (소리, 동작).
- 에피소드 3: 지는 팀 반응 + 다시 하자는 장면.
- 각 에피소드마다 대사 1개 이상 필수.`,
    },
    복고체험형: {
      reaction:  `[복고체험형 — 행동 강제 규칙]
- 첫 문장: 배경막/소품 보는 순간 멈추는 동작.
- "이거 옛날 거예요?" 같은 인지 대사 1개 필수.
- 소품을 만지거나 입어보는 신체 행동 중심.
- 금지: "옛날 분위기를 느꼈다" / "복고 감성을 경험했다"`,
      classroom: `[복고체험형 — 행동 강제 규칙]
- 배경막 앞에서 아이가 한 첫 행동으로 시작.
- 소품 종류별 아이 행동 (집어들기, 입어보기, 사진 찍으려고 서기).
- 사진 찍기 좋은 구도: 어느 위치에서 어떤 소품과 함께.
- 금지: "배경막이 설치됐다" / "소품이 준비됐다"`,
      operation: `[복고체험형 — 행동 강제 규칙]
- 소품 대여 순서를 아이 동선으로 표현.
- 배경막 앞 순서 대기 방식 + 교사 위치.
- 사진 촬영 흐름: 준비→포즈→촬영→이동 각 단계 행동.
- 금지: "원활하게 촬영됐다" / "질서 있게 진행됐다"`,
      episode:   `[복고체험형 — 행동 강제 규칙]
- 에피소드마다 소품/의상 선택 갈등 또는 포즈 고민 장면.
- 에피소드 1: 소품 선택 못 하고 계속 바꾸는 장면.
- 에피소드 2: 교사/부모가 소품 쓰는 장면 (아이 반응 포함).
- 에피소드 3: 사진 보고 다시 찍으러 오는 장면.
- 각 에피소드마다 대사 1개 이상 필수.`,
    },
  };

  // [수정 3] playConfig(getSectionInstruction) 메인 + TYPE_INST 보조
  const typeInst = TYPE_INST[playType];

  // ── 경찰·교통안전 전용 6단 구조 프롬프트 ──────────────────
  // 규칙: [놀이]+[공간/상황]+[구성/운영/정리] 구조로 상단 고정
  const isPolice = subKw.includes("경찰");
  if (isPolice) {
    const sd = program?.seoData || {};
    const 코너구성 = sd.운영구성?.join("\n") || "";
    const 동선 = sd.동선구조?.join(" / ") || "";
    const 반응 = sd.아이반응?.slice(0, 4).join(" / ") || "";
    const 포인트 = sd.진행포인트?.slice(0, 4).join(" / ") || "";
    const 추천 = sd.추천대상?.join(" / ") || "";
    const 흐름 = sd.coreStructure || "";
    const 감정 = sd.emotionFlow || "";

    const POLICE_RULE = `[절대 규칙 — 경찰놀이 글]
- 주제 고정: "경찰놀이" / "교통안전 체험" 현장만 작성
- 문장 길이: 15~20자. 짧고 리듬감 있게.
- 줄바꿈: 2~3문장마다 빈 줄 하나
- 구어체 금지: "~했어/~해요" → "~했다"
- 리스트 금지 (①②③ ✔ • - 전부)
- CTA 금지 (문의/예약/전화)
- 소제목(##) 금지
- 없는 소품 생성 금지: 순찰차 모형, 경찰차 모형, 교통사고 예방 교육 등 실제 구성에 없는 것
- 감탄사: 섹션당 1개 이하
- 감성 서술 절대 금지: "즐거운 시간", "의미 있는 경험", "아이들이 좋아했다", "자연스럽게 배운다", "신나는 하루"
- 이거 쓰면 70점: "아이들이 너무 좋아했다" / "자연스럽게 배운다" / "의미 있는 경험"
- 무조건 써야 하는 것: 동선 / 코너 / 반복 / 이동 / 행동`;

    const policeSectionPrompts = {

      // ① 도입 — 언제/어디 + 왜 경찰놀이 + 전체 구조 한 줄
      intro: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 도입 3줄 구조]
① 언제 / 어디 → ② 왜 경찰놀이 선택 → ③ 전체 구조 한 줄 요약
🚨 첫 문장 반드시: 공간 + 설치 + 구조 형태로 시작
🚨 "경찰놀이", "교통안전", "유치원 행사" 세 키워드를 첫 문단 안에 모두 포함
🚨 "대기 없이", "자유 이동", "교사 개입 없이" → 이 섹션에서 각 1회만, 이후 금지

예시 도입 (변형해서 사용):
"강당에 경찰놀이 체험존을 설치했다. 코너별 순환 구조로 운영했다. 동선을 분리해 대기 없이 진행되도록 구성했다."

[작성 순서]
1. 공간·설치 구조 (1~2문장)
2. 운영 방식 요약 — 입장→출동→체험→이동 흐름 (1문장)
3. 전체 코너 수·동선 한 줄 요약 (1문장)

참고 흐름: ${흐름}
- 700자 이상
${memoBlock}`,

      // ② 전체 흐름 — 아이들이 어떻게 움직이는지 (설명 ❌ 움직임 ⭕)
      reaction: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 전체 흐름]
"이 글이 상단 가는 이유" 구간이다.
❌ 설명하지 마라 ⭕ 움직임을 써라
패턴: 처음 반응 → 중간 변화 → 끝 집중

[작성 순서]
1. 처음 반응 — 경찰복 착용 순간, 첫 행동 (2문장)
2. 중간 변화 — 벨 울리는 순간, 이동 흐름 (2문장)
3. 끝 집중 — 후반 행동 변화, 교통안전존 집중 (2문장)
4. 대사 1개 필수 (경찰놀이 대사풀에서 선택)

참고 반응: ${반응}
참고 감정: ${감정}
- 700자 이상
${memoBlock}${sceneBlock}`,

      // ③ 교실 구성 — 코너 번호 + 아이들이 무엇을 하는지
      classroom: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 교실 구성]
🚨 반드시 4개 코너를 문장형으로 설명
🚨 "무엇이 있다" ❌ → "아이들이 무엇을 한다" ⭕
🚨 첫 문장: "${subKw} 교실 구성은 크게 4개 코너로 나뉜다."

[코너별 작성 구조 — 각 2~3문장]
① 출동센터: 아이들이 경찰 역할 선택 후 출동 신호 대기하는 행동
② 과학수사: 아이들이 지문을 비교하고 범인을 찾는 협력 행동
③ 감옥: 경찰과 범인이 함께 입장해 퀴즈 후 석방되는 흐름
④ 교통안전: 멈춤→확인→이동을 반복하는 보행자·차량·경찰 역할 행동

마지막 1문장: 사진이 잘 나오는 코너 + 이유

참고 구성:
${코너구성}
- 700자 이상
${memoBlock}${sceneBlock}`,

      // ④ 운영 포인트 — 동선/인원/반복/교사 개입 (상단 확정 구간)
      operation: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 운영 포인트]
👉 여기 들어가면 상단 확정 구간이다
무조건 써야 하는 4가지: 동선 분리 / 인원 수 / 반복 구조 / 교사 개입 여부

[작성 구조]
1. 동선 분리 방식 (1~2문장) — 어떻게 나눴는지
2. 코너당 인원 수 (1문장) — 구체적 숫자 포함
3. 반복 구조 (1~2문장) — 어떻게 반복되는지
4. 교사 개입 여부 (1문장) — 최소화 방식
5. 필수 운영 요소 (2문장) — 출동일지, 감옥 안내

참고 포인트: ${포인트}
참고 동선: ${동선}
- 700자 이상
${memoBlock}${sceneBlock}`,

      // ⑤ 에피소드 — 3개 장면 (출동·체포·역전)
      episode: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 아이들 반응 3장면]
🚨 에피소드 정확히 3개만. 4개 이상 금지.
🚨 "왜 여기 왔지"는 1회만 / "여기다"는 1회만

반드시 아래 중 2개 이상 사용:
- 장면 A: 경찰복 착용 → 벨 대기 → 출동 뛰쳐나가는 흐름
- 장면 B: 선생님 지목 → 체포 → 감옥 퀴즈 → 석방
- 장면 C: 벨 뜸해짐 → 아이가 어른에게 "범인 하실래요?" → 역전

에피소드 1 — 특정 아이 이름(가명) + 진지한 행동 + 대사 1개
에피소드 2 — 두 아이 이상 상호작용 + 대사 1~2개
에피소드 3 — 예상 못한 순간 (어른 체포 or 단골 범인 or 울음 터짐)

- 700자 이상
${memoBlock}${sceneBlock}`,

      // ⑥ 마무리 — 어떤 기관에 맞는지 + 언제 쓰면 좋은지
      recommend: `너는 유치원 행사 블로그 작성자다.

${POLICE_RULE}

[이 섹션 — 마무리]
한 줄 구조: 어떤 기관에 맞는지 + 언제 쓰면 좋은지
나열 금지 — 반드시 문장형으로 작성

[작성 구조]
1. 어떤 연령/기관에 맞는지 (1~2문장) — 5~7세, 행동 변화 목표 기관
2. 언제 쓰면 좋은지 (1문장) — 전교생 행사, 안전교육 목적
3. 동선 설계 한 줄 마무리 (1문장)

참고: ${추천}
- 400자 이상`,

      // closing은 공통 사용
      closing: null,
    };

    if (policeSectionPrompts[sectionKey] !== undefined) {
      // null이면 공통 closing으로 fall-through
      if (policeSectionPrompts[sectionKey] !== null) {
        return policeSectionPrompts[sectionKey];
      }
    }
  }
  // ── 경찰놀이 전용 끝 — 이하 공통 프롬프트 ──────────────────

  const prompts = {

    // ① 도입 — 프로그램별 동적 생성
    intro: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

${buildIntroInstruction(subKw, playConfig, mainKw)}

${memoBlock}`,

    // ② 현장 반응 — playConfig 구조 + TYPE_INST 행동 강제 (마지막)
    reaction: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

${getSectionInstruction(subKw, "reaction", "")}

[전체 흐름 참고]
${fullFlowBlock}

[이 섹션 담당 단계]
${flowBlock}
${existingBlock}
[행동 강제 규칙]
${typeInst.reaction}

- 700자 이상
${memoBlock}${sceneBlock}`,

    // ③ 교실 구성 — playConfig 구조 + TYPE_INST 행동 강제 (마지막)
    classroom: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

🚨 [교실 구성 섹션 역할 고정]
- 이 섹션에서 코너 구성을 1회만 설명한다.
- 여기서 설명한 내용은 이후 섹션(운영·에피소드)에서 절대 반복하지 않는다.
- 코너 나열로 끝내지 말 것 — 각 코너의 핵심 소품·행동 1개씩 구체 묘사로 마무리
- "교실 구성은 크게 N개 코너로 나뉜다" 같은 나열형 시작 절대 금지
- "첫 번째 코너는", "두 번째 코너는" 시작 금지
${subKw.includes("전통") ? `\n🚨 [전통놀이 도구 고정] 한복/대형윷/투호/제기/팽이/고리던지기만. 굴렁쇠·줄다리기·떡매·사방치기 절대 금지.` : ""}

${buildClassroomInstruction(subKw, playConfig, 운영구성)}
${subKw.includes("블랙라이트") ? `
[블랙라이트체험 코너 비중 — 반드시 준수]
① 벽면놀이 + 형광블락 → 글 비중 50% 이상 (메인)
② 열쇠고리 만들기(오븐 포함) → 글 비중 30% (부속)
③ VR 체험 → 글 비중 20% (부속)
🚨 형광 페인팅, 보석찾기, 풍선 — 없는 활동 절대 금지` : ""}
${existingBlock}
[행동 강제 규칙]
${typeInst.classroom}

${memoBlock}${sceneBlock}`,

    // ④ 운영 방법 — playConfig 구조 + TYPE_INST 행동 강제 (마지막)
    operation: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

🚨 [운영 섹션 핵심 금지 — 최우선]
- 앞 섹션(교실 구성)에서 이미 설명한 코너 구조 재설명 절대 금지
- "~교실에서는", "~코너에서는" 으로 시작하는 코너 소개 문장 금지
- 교실/코너 순서 나열 금지 ("첫 번째 ~, 두 번째 ~" 구조 금지)
- 이미 앞에서 설명한 내용을 다시 풀어 설명하는 문장 전부 금지
→ 이 섹션은 오직 "교사가 실제로 한 행동 + 운영 핵심 디테일"만 작성

${buildOperationInstruction(subKw, playConfig)}

[운영 핵심 데이터 참고 — 행동 서술에만 활용, 코너 구조 재설명 금지]
${fullFlowBlock}
${existingBlock}
[행동 강제 규칙]
${typeInst.operation}

🚨 운영방법 섹션 절대 금지 문장 유형:
- "이러한 경험은 아이들이 ~" 형태 금지
- "경험할 수 있도록 돕는다" 금지
- "몰입하게 된다" 금지
- "즐거움과 함께 다양한 학습" 금지
- "예상치 못한 상황으로는" 같은 매뉴얼형 표현 금지
- "이를 해결하기 위해" 금지
→ 반드시 교사가 실제로 한 행동 + 숫자로만 서술할 것

${memoBlock}${sceneBlock}`,

    // ⑤ 에피소드 — playConfig 구조 + TYPE_INST 행동 강제 (마지막)
    episode: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

${getSectionInstruction(subKw, "episode", "")}

🚨 에피소드는 반드시 3개만. 4개 이상 금지.
${mainKw && mainKw !== subKw ? `🚨 핵심 장면 강제: 에피소드 중 반드시 1개는 "${mainKw}" 관련 장면으로 작성할 것. 아이가 직접 체험하는 순간 묘사.` : ""}

[전체 흐름 참고]
${fullFlowBlock}

[이 섹션 담당 단계]
${flowBlock}
${existingBlock}
[행동 강제 규칙]
${typeInst.episode}

- 700자 이상
${memoBlock}${sceneBlock}`,

    // ⑥ 추천 대상 — 어떤 기관에 맞는지
    recommend: `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

[이 섹션의 역할]
검색자가 "우리 기관에도 맞겠다"고 판단하는 구간이다.
나열 금지 — 반드시 문장형으로 작성한다.

[작성 구조]
1. 어떤 연령/기관에 잘 맞는지 (2문장)
   - 구체적 연령대 포함
   - 예: "역할놀이를 즐기는 5~7세 반이라면 특히 반응이 좋다."

2. 어떤 상황/목적의 행사에 적합한지 (1~2문장)
   - 부모참여수업 / 사진 중요한 기관 / 여름·겨울 행사 등
   - ${mainKw} 1회 자연스럽게 포함

3. 준비 난이도 or 소요 시간 (1문장)
   - 예: "준비 시간이 짧아 갑작스러운 행사에도 적합하다."

- 400자 이상 (재생성 없음 — 처음부터 충분히 작성)
🚨 중복 금지: "연중 행사" → 이 섹션에서 1회만 사용
✅ "추천한다", "적합하다" → 최대 3회까지 허용 (단, 같은 문장 반복 금지 / 표현 형태 다양하게)
🚨 같은 의미 반복 절대 금지 — 추천 대상은 하나의 문단으로만 압축`,

    // ⑦ 마무리 — 프로그램별 분기
    closing: (() => {
      // 마무리 마지막 문장 풀 — 매 글마다 랜덤 선택
      const CLOSING_POOL = [
        "행사가 끝난 뒤에도 아이들은 그 공간을 쉽게 떠나지 않았다.",
        "정리가 시작됐지만 아이들은 계속 손을 움직이고 있었다.",
        "마무리 순간까지 아이들의 움직임은 끊기지 않았다.",
        "끝난 뒤에도 아이들은 다시 한 번 해보려는 모습을 보였다.",
        "활동이 끝났는데도 아이들은 자리를 벗어나지 않았다.",
        "그날의 ${subKw}는 단순한 체험이 아니라 아이들 기억 속에 남는 하루의 사건이었다.",
        "행사가 끝난 뒤에도 아이들은 그 코너에서 벗어나지 않으려 했다.",
      ];
      const closingEnding = CLOSING_POOL[Math.floor(Math.random() * CLOSING_POOL.length)];

      // 프로그램별 마무리 힌트
      const closingHints = {
        "시장놀이":      "화폐 거래와 역할 교체가 자연스럽게 이어지는 구조 / 경제·사회성 체험이 동시에 가능한 행사",
        "반죽놀이":      "발로 밟는 순간부터 끝날 때까지 아쉬워하는 구조 / 잘하는 사람이 없어 부모도 아이도 부담 없이 몰입",
        "병원놀이":      "스탬프 완성까지 스스로 이동하는 구조 / 진료실별 특수 장비 덕분에 단순 놀이가 아닌 진짜 체험",
        "블랙라이트체험": "암막과 조명만 갖춰지면 어디서든 안정적으로 운영 / 사진 결과물이 다른 체험과 확연히 다름",
        "캠핑놀이체험":   "텐트 설치부터 마무리까지 아이들이 주도 / 실내에서도 야외 감성 그대로 연출 가능",
        "경찰·교통안전": "호출벨 하나로 유치원 전체가 하루 종일 하나의 놀이터가 됨 / 범인 잡고 감옥 퀴즈 통과하는 과정에서 생활습관이 자연스럽게 체득됨",
        "과학아놀자":     "실험 과정이 단계별로 나뉘어 집중력 유지 / 직접 만든 결과물이 남아 기관 만족도 높음",
      };
      const hint = Object.entries(closingHints).find(([k]) => subKw.includes(k))?.[1]
        || "아이들이 스스로 움직이며 완성하는 구조 / 준비 부담 없이 완성도 높은 행사 가능";

      return `너는 유치원 행사 블로그 작성자다.

${BASE_RULE}

[이 섹션의 역할 — 현장 정리]
글 전체를 새로운 표현으로 마무리한다. 앞 섹션 내용 반복 절대 금지.
🚨 절대 금지:
- "대기 없이", "자유 이동", "교사 개입 없이" → 이미 앞에서 다뤘으므로 금지
- 구조 설명 반복 → 금지
- "~가능한 구조였다", "~운영이 가능하다" 형태 → 금지
- 다른 프로그램 소품/장면 섞어 쓰는 것 → 금지 (프로그램 혼용)

[작성 규칙]
- 총 3~4문장
- 형식:
  ① 행사 끝난 뒤 아이들 반응 에피소드 1~2문장 (감성 마무리)
  ② 이 프로그램이 남긴 것 1문장 (체험의 의미)
- 이 프로그램 힌트 참고: "${hint}"
- 반드시 아래 문장 중 하나로 끝낼 것 (자연스럽게 변형 가능):
  "${closingEnding}"
- "추천한다", "적합하다", "연중 행사" → 이 섹션 금지 (앞에서 이미 사용)
- "어떤 기관에 맞는지" 설명 금지 → recommend 섹션에서 이미 다룸
- "운영이 안정적", "몰입도가 높고", "넓은 공간" 반복 금지
- 기관 추천 문장 금지 — 반드시 아이 행동 장면으로만 마무리
- 150자 이상`;
    })(),
  };

  return prompts[sectionKey] || prompts.action;
}

// ============================================================
// 섹션 1개 생성 (필터 → 확장 → 재시도)
// ============================================================

// 전체 글자수 검증 후 재생성 (2,500자 미달 시)
async function ensureCharCount(openai, sectionTexts, subKw, mainKw, region, memo, target = 2500, program = null) {
  const assembled = Object.values(sectionTexts).join(" ");
  const charCount  = assembled.replace(/\s/g, "").length;
  if (charCount >= target) return sectionTexts;

  // 부족한 만큼 operation + classroom + activity 재생성
  console.log(`[v31] 글자수 부족 (${charCount}자) → operation + classroom + activity 보강`);
  const newOperation = await generateSection(openai, "operation", subKw, mainKw, region, memo, 1, program);
  if (newOperation && newOperation.replace(/\s/g, "").length > (sectionTexts.operation || "").replace(/\s/g, "").length) {
    sectionTexts.operation = newOperation;
  }
  const newClassroom = await generateSection(openai, "classroom", subKw, mainKw, region, memo, 1, program);
  if (newClassroom && newClassroom.replace(/\s/g, "").length > (sectionTexts.classroom || "").replace(/\s/g, "").length) {
    sectionTexts.classroom = newClassroom;
  }
  // 여전히 부족하면 activity도 보강
  const assembled2 = Object.values(sectionTexts).join(" ");
  if (assembled2.replace(/\s/g, "").length < target) {
    const newActivity = await generateSection(openai, "activity", subKw, mainKw, region, memo, 1, program);
    if (newActivity && newActivity.replace(/\s/g, "").length > (sectionTexts.activity || "").replace(/\s/g, "").length) {
      sectionTexts.activity = newActivity;
    }
  }
  return sectionTexts;
}

async function generateSection(openai, sectionKey, subKw, mainKw, region, memo, maxRetry = 1, program = null, existing = "") {
  const minChar = SECTION_MIN[sectionKey];
  let result = "";

  const SYSTEM_CONTEXT = `당신은 유치원 체험 프로그램 현장을 직접 운영한 전문가입니다.
블로그 글을 작성할 때 설명이 아니라 "현장 기록" 방식으로 작성합니다.

[핵심 원칙]
1. 설명 금지 → "아이들이 즐거워했다", "흥미를 느꼈다" 같은 문장 절대 금지
2. 반드시 행동 + 대사 + 결과 구조로 작성 → 아이의 행동, 말, 반응이 반드시 포함
3. 교사 입장이 아닌 "현장 관찰 기록"처럼 작성
4. 같은 표현 반복 금지 → "대기 없이", "자유롭게", "자연스럽게" 반복 금지

[절대 금지]
- "${subKw}" 외 다른 활동/장소 금지
- 소제목(##) 금지
- 설명형 문장 금지: "꿈의 공간", "굉장히", "특별한", "소중한", "흥미를 느꼈다"
- 감정 요약 금지: "즐거웠다", "신났다", "행복했다", "보람 있었다"
- 판매 유도 문장 금지: 문의/예약/전화 금지
- 구어체 금지: "~했어/~했지/~해요" → 반드시 "~했다"
- 없는 소품/기구 생성 금지

[반복 표현 1회만 허용]
- "대기 없이" / "자유롭게 이동" / "교사 개입 없이" / "반복 체험 가능"

[작성 방식 핵심]
모든 문장은 반드시 "행동 → 대사 → 결과" 구조로 작성한다.
예시:
${getActionExample(subKw)}

[작성 원칙]
- 문장 15~25자, 리듬감 있게
- 모든 문장은 반드시 마침표(.)로 끝낼 것 — 중간에 끊기는 문장 절대 금지
- 대사("...") 각 섹션 1개 이상, 동일 대사 전체 글에서 1회만 사용
- 같은 동사 3회 이상 반복 금지
- 어떤 도구, 어떤 코너, 어떤 순서 — 정보 밀도 있게

[프로그램 집중 원칙]
- 한 글에는 "${subKw}" 하나만 집중 서술
- 없는 활동 생성 금지 (실제 구성에 없는 소품·기구·장면 절대 금지)`;

  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    const prompt = getSectionPrompt(sectionKey, subKw, mainKw, region, memo, existing, program);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: MAX_TOKENS[sectionKey] || 600,
      temperature: 0.75 + attempt * 0.05,
      messages: [
        { role: "system", content: SYSTEM_CONTEXT },
        { role: "user",   content: prompt },
      ],
    });

    const raw      = (completion.choices[0].message.content || "").trim();
    const filtered = filterSection(raw, subKw);
    const expanded = expandSection(filtered);
    // v15: 후처리 파이프라인
    const processed = postProcess(expanded, sectionKey);
    const charCount = processed.replace(/\s/g, "").length;

    if (charCount >= minChar) {
      result = processed;
      break;
    }

    if (processed.length > 0) {
      // 누적이 아닌 교체 — 더 긴 결과로만 갱신 (중복 방지)
      if (processed.replace(/\s/g, "").length > result.replace(/\s/g, "").length) {
        result = processed;
      }
      if (result.replace(/\s/g, "").length >= minChar) break;
    }
  }

  return result;
}


// ============================================================
// 섹션 제한 함수들
// ============================================================

// 라인 수 강제 제한 — v14: MAX_LINES 상향으로 실질 삭제 최소화
// 섹션별 최대 라인 수 (v4 — 700자 목표 기준 상향)
const MAX_LINES = {
  structure:  32,
  flow:       32,
  activity:   32,
  detail:     32,
  scene:      28,
  target:     20,
  closing:    8,
};

function trimLines(text, sectionKey) {
  const max = MAX_LINES[sectionKey] || 30;
  const lines = text.split("\n").filter(l => l.trim());
  return lines.slice(0, max).join("\n");
}

// 중복 유사 문장 제거 (앞 10자 기준)
// removeSimilar 삭제 (v41: removeMeaningDuplicate로 통합)

// 핵심 명사 기준 의미 중복 제거 — 같은 수치/사실이 반복되면 첫 번째만 유지
const DEDUP_PATTERNS = [
  // 운영 수치
  /150명/,
  /동시 운영/,
  /화폐[만을]?\s*배분/,
  /상점\s*4개/,
  /현수막\s*4장/,
  /책상\s*2개/,
  /순환\s*운영/,
  /대기\s*시간?\s*(을|를|이|가)?\s*(최소|줄)/,
  // 블랙라이트 관련
  /암막\s*(교실|준비|철저|커튼)/,
  /빛\s*차단/,
  /VR\s*기기?\s*\d+/,
  /오븐\s*(예열|미리)/,
  /형광\s*오브젝트/,
  /열쇠고리\s*(만들기|색칠|변화|작아)/,
  // 추천 대상 반복 차단
  /시각\s*자극.*추천/,
  /부모참여수업.*적합/,
  /행사\s*사진.*중요/,
  /체험\s*다양성/,
  /대규모\s*인원.*(적합|추천)/,
  /여러\s*반.*동시.*(추천|적합)/,
  /행사\s*완성도.*(추천|적합)/,
  /체험\s*사진.*(추천|적합)/,
  /5~7세.*(추천|적합)/,
  /역할놀이.*좋아하는.*(추천|적합)/,
  /대형\s*강당.*(추천|적합)/,
  /부모\s*참여.*(추천|적합)/,
  /갑작스러운\s*행사.*(적합|추천)/,
  // 기타
  /달고나\s*(체험|만들기)/,
  // 경찰·교통안전 반복 표현
  /왜\s*여기\s*왔지/,
  /여기다[!]?\s*(손가락|짚|고)/,
  /범인\s*하실래요/,
  /호출벨\s*하나로\s*(유치원|전체)/,
  /이마에?\s*땀방울/,
  // ★ 중복 점수 핵심 원인 — 아래는 v38에서 제거 (핵심 문장까지 삭제되는 부작용)
  // /적합하다/ → 삭제
  // /추천한다/ → 삭제
  // /추천합니다/ → 삭제
  // /경제교육/ → 삭제
  // /화폐\s*개념/ → 삭제
  // /유치원[··]\s*어린이집/ → 삭제
  /연중\s*행사/,
  /역할놀이\s*프로그램/,
  /완성도\s*높은/,
  /교사\s*부담\s*(없이|줄)/,
  // v42 — 대사 중복 차단
  /이거\s*얼마예요/,
  /얼마예요\s*[?？]/,
  /하나\s*더\s*살\s*수\s*있어/,
  /돈이\s*다\s*떨어졌어/,
  // v43 — 2차 테스트 반복 대사 추가
  /이거\s*진짜\s*돈이야/,
  /진짜\s*돈이야\s*[?？]/,
  /다\s*샀어[요]?[!]?/,
  // v45e — 목공놀이 반복 대사
  /이거\s*진짜\s*망치예요/,
  /진짜\s*망치예요\s*[?？]/,
  // v46 — 과학아놀자 반복 대사
  /오줌\s*싸라[!！]?/,
  /와\s*연기\s*난다[!！]?/,
  /떠\s*있다[!！]?/,
  // v46b — 방송국체험 반복 표현
  /저기\s*나다[!！]?/,
  /저\s*앵커\s*하고\s*싶어요/,
  /마녀\s*목소리다[!！]?/,
  /내\s*목소리가\s*왜\s*이래/,
  /서울은\s*맑겠습니다[!！]?/,
];

// ── 잘린 문장 감지 및 제거 ──────────────────────────────────
// "~하는", "~하고", "~이며", "기관", "자랑" 등으로 끝나는 미완성 문장 제거
function fixTruncated(text) {
  const lines = text.split("\n");
  const result = [];
  for (const line of lines) {
    const s = line.trim();
    // 이미지·소제목·해시태그·제목·빈줄은 통과
    if (!s || /^\[이미지:/.test(s) || /^##/.test(s) || /^#/.test(s)) {
      result.push(line);
      continue;
    }
    // 미완성 문장 패턴 감지
    const isTruncated =
      /[하는하고이며하며하여하기이고하기을를은는]\s*$/.test(s) ||  // 조사/어미로 끝
      /기관\s*$/.test(s) ||           // "기관" 으로 끝
      /자랑\s*$/.test(s) ||           // "자랑" 으로 끝
      /원하는\s*$/.test(s) ||         // "원하는" 으로 끝
      /위한\s*$/.test(s) ||           // "위한" 으로 끝
      /중이라면\s*$/.test(s) ||       // "중이라면" 으로 끝
      /계획\s*$/.test(s) ||           // "계획" 으로 끝
      /것이\s*[.。]?\s*$/.test(s) ||  // "것이 ." 형태 (v41 추가)
      /하는 동안\s*$/.test(s) ||      // "하는 동안" 으로 끝 (v41 추가)
      /수진이는 피\s*$/.test(s) ||    // "수진이는 피" 문장 붕괴 (v41 추가)
      /선택의\s*$/.test(s) ||         // "선택의" 으로 끝 (v41 추가)
      /맡은 역할\s*$/.test(s) ||      // "각자 맡은 역할" 잘림
      /다양한 학습\s*$/.test(s) ||    // "다양한 학습" 잘림
      /특히 적\s*$/.test(s) ||        // "특히 적이다" 오타+잘림
      /의 이야기를\s*$/.test(s) ||    // "의 이야기를" 잘림
      /문진표 작\s*$/.test(s) ||      // "문진표 작" 잘림
      /극복는\s*/.test(s) ||          // "극복는" 오타 문장
      /이 과정\s{2,}/.test(s) ||      // "이 과정  원활하게" 공백 붕괴
      /지켜보며,\s*아이들이\s*어떻게/.test(s) || // v42 — 쉼표+종속절 끊김
      /[,，]\s*[가나다라마바사아자차카타파하]\S+며\s*$/.test(s) || // v42 — ~하며로 끝나는 종속절 잘림
      /[,，]\s*\S+는지\s*$/.test(s) || // v42 — "~는지" 종속절 잘림
      /^은\s+아이들이/.test(s) ||      // v43 — 문장 앞 잘림 "은 아이들이"
      /^는\s+아이들이/.test(s) ||      // v43 — 문장 앞 잘림 "는 아이들이"
      /자랑하며\s*다\s*[.]?\s*$/.test(s) || // v43 — "자랑하며 다." 끊김
      /교사들은\s*아이들은/.test(s) || // v43 — 주어 충돌 깨진 문장
      /\s*아이들은\s*$/.test(s) ||     // v43 — "아이들은" 으로 끝나는 잘림
      /화폐를\s*사용하고\s*$/.test(s) || // v44 — "화폐를 사용하고" 잘림
      /교사들에게도\s*있는\s*시간/.test(s) || // v44 — "교사들에게도 있는 시간" 붕괴
      /아이들이\s*참여하도록\s*했다\s*$/.test(s) || // v44 — 앞이 잘린 채 끝나는 패턴
      /중요한\s+하며/.test(s) ||       // v45b — "중요한 하며" 동사 잘림
      /스탬프\s*$/.test(s) ||          // v45b — "스탬프" 로 끝나는 잘림
      /^은\s+아이들이\s*각/.test(s) || // v45b — "은 아이들이 각" 앞 잘림 강화
      /서로의\s*역할을\s*인정/.test(s) || // v45b — 설명형 문장
      /이러한\s*행동들은\s*실제/.test(s) || // v45b — 설명형 문장
      /적합했다\s*[.]?\s*$/.test(s) || // v45b — "적합했다" 설명형 마무리
      /인상적인\s*장면을\s*한다/.test(s) || // v45c — "인상적인 장면을 한다" 동사 잘림
      /병원을\s+각자/.test(s) ||        // v45c — "병원을 각자" 공백+문맥 붕괴
      /각\s*코너\s+맡은/.test(s) ||     // v45d — "각 코너 맡은 역할에" 중간 잘림
      /이\s*과정\s+진짜/.test(s) ||     // v45d — "이 과정 진짜" 앞 잘림
      /역할에\s+돕는다/.test(s) ||      // v45d — "역할에 돕는다" 동사 잘림
      /놀이터로\s*[.]/.test(s) ||       // v45f — "놀이터로 ." 잘림
      /반복하며\s*다[.]/.test(s) ||     // v45f — "반복하며 다." 잘림
      /^적으로\s+운영/.test(s) ||       // v45f — "적으로 운영" 앞 잘림
      /이어서\s+[가-힣]+존\s*$/.test(s) || // v46 — "이어서 플라즈마존" 잘림
      /이어서\s+[가-힣]+존\s+마지막/.test(s) || // v46 — 연결 끊김
      /받자마자\s{2,}/.test(s) ||        // v46b — "받자마자  쥐고" 공백 2칸
      /^을\s+맡은/.test(s) ||            // v46b — "을 맡은 민수는" 앞 잘림
      /진행에\s*,/.test(s) ||            // v46b — "진행에 , 큐시트" 쉼표 앞 공백
      /게임에\s{2,}/.test(s) ||          // v46b — "게임에  돕는다" 공백 2칸
      /특별한\s*$/.test(s) ||            // v46b — "특별한" 으로 끝나는 잘림
      /^지호는\s+을\s+맡/.test(s) ||     // v46b — "지호는 을 맡았고" 앞 잘림
      /실시간\s*$/.test(s) ||            // v46b — "실시간" 으로 끝나는 잘림
      /아이의\s*$/.test(s) ||            // v46b — "아이의" 로 끝나는 잘림
      /나머지\s*$/.test(s) ||            // v46b — "나머지" 로 끝나는 잘림
      /큰\s+었다/.test(s) ||             // v46b — "큰 었다" 내용 소실
      /되어보는\s*[.]/.test(s) ||        // v46b — "되어보는 ." 마침표 앞 공백
      /입장하자마\s*$/.test(s) ||        // v46c — "입장하자마" 끝 잘림
      /있도록\s*[.]\s*$/.test(s) ||      // v46c — "있도록 ." 잘림
      /녹음하고[,，]\s*$/.test(s) ||     // v46c — "녹음하고, " 쉼표 끝 잘림
      /체험\s+무작위로/.test(s) ||       // v46c — "체험 무작위로" 중간 잘림
      /카메라맨[,，]\s*기상캐스터/.test(s) || // v46c — 카메라맨 등장 차단
      /흥미를\s*잃지\s*$/.test(s) ||         // v47b — "흥미를 잃지" 끝 잘림
      /않도록\s*$/.test(s) ||                 // v47b — "않도록" 끝 잘림
      /잃지\s*않\s*$/.test(s) ||              // v47b — "잃지 않" 끝 잘림
      /자부심을\s*$/.test(s) ||               // v47c — "자부심을" 끝 잘림
      /기관에\s*[.。]\s*$/.test(s) ||         // v47c — "기관에 ." 잘림
      /있는\s*[.。]\s*$/.test(s) ||           // v47c — "있는 ." 잘림
      /더욱\s*적으로\s*$/.test(s) ||          // v47c — "더욱 적으로" BANNED 잔재
      // v48 — 캠핑놀이체험 잘림 패턴
      /수\s*있도록\s*[.。]?\s*$/.test(s) ||  // v48 — "수 있도록 ." 잘림
      /아이들의\s*을\s*/.test(s) ||           // v48 — "아이들의 을" 중간 소실
      /재미를\s*$/.test(s) ||                 // v48 — "재미를" 끝 잘림
      /아이들이\s*[.。]?\s*$/.test(s) ||      // v48 — "아이들이 ." 끝 잘림
      /교사는\s*아이들이\s*$/.test(s) ||      // v48 — "교사는 아이들이" 끝 잘림
      // v49c — 겨울이야기 잘림 패턴
      /^의\s+손에/.test(s) ||                 // v49c — "의 손에" 주어 소실
      /마지막으로[,，]\s*에어\s*$/.test(s) ||  // v49c — "마지막으로, 에어" 중간 소실
      /^을\s+자극하며/.test(s) ||              // v49c — "을 자극하며" 앞 소실
      /^을\s+제공/.test(s) ||                  // v49c — "을 제공했다" 앞 소실
      // v49 — 전통놀이 잘림 패턴
      /보며\s*을\s*느낍/.test(s) ||           // v49 — "보며 을 느낍" 중간 소실
      /이루어\s*을\s*만들/.test(s) ||         // v49 — "이루어 을 만들" 중간 소실
      /자극하며\s*[.。]?\s*$/.test(s) ||      // v49 — "자극하며 ." 끝 잘림
      /모습을\s*보며\s*[.。]?\s*$/.test(s) || // v49 — "모습을 보며 ." 끝 잘림
      /^아\s+교사/.test(s) ||                 // v49 — "아 교사들은" 앞 잘림
      /즐거움을\s*할\s*/.test(s) ||           // v49b — "즐거움을 할" 중간 소실
      /[,，]\s*$/.test(s) ||                  // v49b — 쉼표로 끝나는 문장
      /다음은\s*도가\s*나와야\s*해[,，]/.test(s) || // v49b — 대사 쉼표 끝 잘림
      (s.length < 10 && !/[.!?]$/.test(s)); // 10자 미만 + 마침표 없음
    if (!isTruncated) result.push(line);
  }
  return result.join("\n");
}

// v44 — 대사 패턴은 1회만 허용 (일반 패턴은 2회 허용 유지)
const DEDUP_ONCE = [
  /이거\s*얼마예요/,
  /얼마예요\s*[?？]/,
  /이거\s*진짜\s*돈이야/,
  /진짜\s*돈이야\s*[?？]/,
  /다\s*샀어[요]?[!]?/,
  /하나\s*더\s*살\s*수\s*있어/,
  /돈이\s*다\s*떨어졌어/,
];

function removeMeaningDuplicate(text) {
  const lines = text.split("\n");
  const usedPatterns = new Map();
  return lines.filter(line => {
    const s = line.trim();
    if (!s || /^\[이미지:/.test(s) || /^##/.test(s) || /^#/.test(s)) return true;
    // 대사 패턴 — 1회만 허용
    for (const pat of DEDUP_ONCE) {
      if (pat.test(s)) {
        const key = "once_" + pat.toString();
        if (usedPatterns.has(key)) return false;
        usedPatterns.set(key, 1);
        return true;
      }
    }
    // 일반 패턴 — 2회 허용
    for (const pat of DEDUP_PATTERNS) {
      if (pat.test(s)) {
        const key = pat.toString();
        if (usedPatterns.has(key)) {
          if (usedPatterns.get(key) >= 2) return false;
          usedPatterns.set(key, usedPatterns.get(key) + 1);
          return true;
        }
        usedPatterns.set(key, 1);
        return true;
      }
    }
    return true;
  }).join("\n");
}

// 말투 통일 — 반말/존댓말 혼용 → "~다" 체로 통일 + "행사 행사" 중복 제거
function normalizeTone(text) {
  return text
    // 버그1: "행사 행사" 중복 제거
    .replace(/행사\s+행사/g, "행사")
    // 버그4: 존댓말/반말 → "~다" 체 통일
    .replace(/했어요([.!, ])/g, "했다$1")
    .replace(/했어([.!, ])/g,   "했다$1")
    .replace(/있어요([.!, ])/g, "있었다$1")
    .replace(/있어([.!, ])/g,   "있었다$1")
    .replace(/이에요([.!, ])/g, "이었다$1")
    .replace(/해요([.!, ])/g,   "했다$1")
    .replace(/돼요([.!, ])/g,   "됐다$1")
    .replace(/나와요([.!, ])/g, "나왔다$1")
    .replace(/봐요([.!, ])/g,   "봤다$1")
    .replace(/가요([.!, ])/g,   "갔다$1")
    .replace(/와요([.!, ])/g,   "왔다$1")
    .replace(/줘요([.!, ])/g,   "줬다$1")
    // 문장 끝 처리
    .replace(/했어요$/gm,  "했다.")
    .replace(/했어$/gm,    "했다.")
    .replace(/있어요$/gm,  "있었다.")
    .replace(/해요$/gm,    "했다.")
    .replace(/돼요$/gm,    "됐다.")
    .replace(/가요$/gm,    "갔다.")
    .replace(/와요$/gm,    "왔다.");
}

// 버그2: 마무리 1줄 강제 (중복 제거)
function fixClosing(text) {
  // closing 전체 내용 유지 (기존 slice(0,1)은 1줄만 남기는 버그였음)
  const lines = text.split("\n").filter(l => l.trim());
  return lines.join("\n");
}

// 문단 수 제한 (하위 호환용)
function limitParagraphs(text, sectionKey) {
  return trimLines(text, sectionKey);
}


// ============================================================
// 조합 — 섹션 + 이미지 삽입
// ============================================================

// 섹션키별 소제목 이모티콘
const SECTION_EMOJI = {
  reaction:  "✅",
  classroom: "🏫",
  operation: "👉",
  episode:   "🎯",
  recommend: "📋",
};

// 소제목 첫 줄에 이모티콘 자동 삽입
function injectSectionEmoji(text, sectionKey) {
  if (!text) return text;
  const emoji = SECTION_EMOJI[sectionKey];
  if (!emoji) return text;
  const lines = text.split("\n");
  // 첫 번째 비어있지 않은 줄 앞에 이모티콘 추가
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) {
      // 이미 이모티콘이 있으면 스킵
      if (!/^[\u{1F000}-\u{1FFFF}✅👉🎯📋🏫]/u.test(lines[i].trim())) {
        lines[i] = emoji + " " + lines[i].trimStart();
      }
      break;
    }
  }
  return lines.join("\n");
}

function assembleWithImages(sections, region, subKw) {
  const usedAlts = [];
  const parts = [];

  const addSection = (text, key) => {
    if (!text) return;
    let t = normalizeTone(text);
    t = removeMeaningDuplicate(t);
    t = trimLines(t, key);
    t = injectSectionEmoji(t, key);
    // v45c — 섹션 조립 시점에도 공백/마침표 앞 공백 제거
    t = t.split("\n").filter(line => {
      const s = line.trim();
      if (!s || /^\[이미지:/.test(s) || /^#/.test(s)) return true;
      if (/\s{2,}/.test(s)) return false;
      if (/\s+[,.]/.test(s)) return false;
      if (/^[을를이가은는의]\s/.test(s)) return false; // "의 상태를~" 앞 조사 잘림
      // v45f — 내용 소실 후 마침표/조사만 남는 패턴
      if (/[가-힣]+\s+[을를]\s*[.]?\s*$/.test(s) && s.length < 20) return false; // "구조물을 ." 패턴
      if (/[가-힣]{1,3}\s*[.]\s*$/.test(s) && s.length < 8) return false; // 짧은 단어+마침표 잔여
      if (/^[가-힣]{1,2}\s+[가-힣]/.test(s) && s.length < 15) return false; // "은 민감한" 앞 잘림
      return true;
    }).join("\n");
    t = fixTruncated(t); // v45d — 조립 시점에도 잘린 문장 제거
    if (!t.trim()) return;
    parts.push(t);
    const alt = buildAlt(region, subKw, usedAlts, key);
    usedAlts.push(key);
    parts.push(`[이미지: ${alt}]`);
  };

  // 7단 구조 순서 고정
  addSection(sections.intro,      "intro");
  addSection(sections.reaction,   "reaction");
  addSection(sections.classroom,  "classroom");
  addSection(sections.operation,  "operation");
  addSection(sections.episode,    "episode");

  // 추천 대상 — 이미지 없음
  if (sections.recommend) {
    let t = normalizeTone(sections.recommend);
    t = removeMeaningDuplicate(t);
    t = trimLines(t, "recommend");
    if (t.trim()) parts.push(t);
  }

  // 마무리
  if (sections.closing) {
    const closingText = fixClosing(sections.closing);
    parts.push("## 🎯 마무리 정리");
    parts.push(closingText);
  }

  return removeMeaningDuplicate(parts.join("\n\n"));
}


// ============================================================
// 키워드 삽입 (간단 버전)
// ============================================================

// ============================================================
// 최종 출력 정리
// ============================================================

function finalClean(text) {
  let r = text
    .replace(/👉\s*사진을 첨부하고[^\n]*/g, "")
    .replace(/^HASHTAGS:\s*.+$/gm, "")
    // 오타 교정
    .replace(/맛있었다 보여/g, "맛있어 보여")
    .replace(/맛있었다 보인다/g, "맛있어 보인다")
    // 설명형 문장 제거 — v38: 내용 삭제 최소화, 명백한 설명형만 차단
    .replace(/^.*(?:선사했다|잊지 못할 추억|유치원 행사답게|배우고 있었다|인상적이었다|활기가 넘쳤다|모든 것이 진짜처럼).*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // v45 — 공백 2칸/쉼표 앞 공백/깨진 문장 최종 제거 (finalClean에서 확실히 처리)
  r = r.split("\n").filter(line => {
    const s = line.trim();
    if (!s || /^\[이미지:/.test(s) || /^#/.test(s)) return true;
    if (/\s{2,}/.test(s)) return false;       // 공백 2칸 이상
    if (/\s+,/.test(s)) return false;          // 쉼표 앞 공백
    if (/\s+[.]/.test(s)) return false;        // 마침표 앞 공백 ("얼굴에는 .")
    if (/[가-힣]+\s+하며[,.]?\s*$/.test(s)) return false; // "다양한 하며," 패턴
    if (/[가-힣]+\s+의\s+[가-힣]/.test(s) && s.length < 20) return false; // "꽂아보는 의 체온" 패턴
    if (/각\s*코너의\s*$/.test(s)) return false; // "각 코너의" 잘림
    // v45f — 내용 소실 후 마침표/조사만 남는 패턴
    if (/[가-힣]+\s+[을를]\s*[.]?\s*$/.test(s) && s.length < 20) return false; // "구조물을 ." 패턴
    if (/^[가-힣]{1,3}\s*[.]\s*$/.test(s)) return false; // 짧은 단어+마침표 잔여
    if (/^[가-힣]{1,2}\s+[가-힣]/.test(s) && s.length < 15) return false; // "은 민감한" 앞 잘림
    return true;
  }).join("\n");

  // ★ 잘린 문장 제거 (v4 신규)
  r = fixTruncated(r);

  // ★ 의미 중복 제거 (v4 신규 — 추천/적합/경제교육 계열)
  r = removeMeaningDuplicate(r);

  // 마무리 중복 제거 — 첫 번째 블록만 유지 (내용 포함)
  const CLOSING_MARKER = "## 🎯 마무리 정리";
  const firstIdx = r.indexOf(CLOSING_MARKER);
  if (firstIdx !== -1) {
    const secondIdx = r.indexOf(CLOSING_MARKER, firstIdx + CLOSING_MARKER.length);
    if (secondIdx !== -1) {
      // 두 번째 마커부터 제거 (첫 번째 블록 내용은 보존)
      r = r.slice(0, secondIdx).trimEnd();
    }
    // 마무리 정리 뒤 내용이 비어있으면 closing 내용 없음 — 그대로 유지
    const afterClosing = r.slice(firstIdx + CLOSING_MARKER.length).trim();
    if (!afterClosing || afterClosing.startsWith("#")) {
      // closing 내용이 없거나 바로 해시태그면 기본 문구 삽입
      r = r.slice(0, firstIdx + CLOSING_MARKER.length) + "\n\n아이들이 스스로 움직이며 완성하는 시간이었다.\n" + r.slice(firstIdx + CLOSING_MARKER.length);
    }
  }

  // ── 해시태그 중복 제거 ───────────────────────────────────────
  // 전체 줄에서 해시태그 줄을 모두 찾아 마지막 1개만 유지
  const IS_HT = /^(#\S+[ \t]*){3,}/;
  const allLines = r.split("\n");

  const htIdxs = allLines.reduce((acc, l, i) => {
    if (IS_HT.test(l.trim())) acc.push(i);
    return acc;
  }, []);

  if (htIdxs.length > 1) {
    const allTags = htIdxs.flatMap(i =>
      allLines[i].trim().split(/\s+/).filter(t => t.startsWith("#"))
    );
    const uniqueTags = [...new Set(allTags)].slice(0, 12).join(" ");
    const keep = htIdxs[htIdxs.length - 1];
    allLines[keep] = uniqueTags;
    r = allLines.filter((_, i) => !htIdxs.includes(i) || i === keep).join("\n");
  } else if (htIdxs.length === 1) {
    const rawTags = allLines[htIdxs[0]].trim().split(/\s+/).filter(t => t.startsWith("#"));
    allLines[htIdxs[0]] = [...new Set(rawTags)].slice(0, 12).join(" ");
    r = allLines.join("\n");
  }

  // ── 최종 해시태그 강제 1회 정리 ─────────────────────────────
  // 위 로직이 모두 실패해도 이 단계에서 반드시 1개만 남김
  const finalLines = r.split("\n");
  const htLineIdxs = finalLines.reduce((acc, l, i) => {
    if (/^(#\S+[\s\t]*){2,}/.test(l.trim())) acc.push(i);
    return acc;
  }, []);

  if (htLineIdxs.length > 1) {
    // 모든 태그 합쳐서 중복 제거 후 마지막 줄에만 유지
    const merged = [...new Set(
      htLineIdxs.flatMap(i => finalLines[i].trim().split(/\s+/).filter(t => t.startsWith("#")))
    )].slice(0, 12).join(" ");
    const lastHt = htLineIdxs[htLineIdxs.length - 1];
    finalLines[lastHt] = merged;
    r = finalLines.filter((_, i) => !htLineIdxs.includes(i) || i === lastHt).join("\n");
  }

  return r.replace(/\n{3,}/g, "\n\n").trim();
}


// ============================================================
// 후처리 유틸 — 키워드 재주입 + 프로그램 오염 제거
// ============================================================

/**
 * removeRepeatSentence — 반복 패턴 2회 이상 등장 시 두 번째부터 제거
 */
function removeRepeatSentence(text) {
  const patterns = [
    "아이들이 교실에 들어서자",
    "자연스럽게",
    "대기 없이",
    "활동을 이어갔다",
    "아이들은 서로",
    "아이들이 안전하게",
    "교사는 지켜보며",
    "교사들은 지켜보며",
    "교사는 아이들이",
    "아이들이 몰입",
    "역할을 수행",
  ];
  patterns.forEach(p => {
    let first = true;
    text = text.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), () => {
      if (first) { first = false; return p; }
      return "";
    });
  });
  return text;
}

/**
 * reinforceKeyword — 키워드 6회 미만 시 문장 끝에 자연 삽입 (v41)
 * 복합 키워드(체험/프로그램)도 함께 보강
 */
function reinforceKeyword(text, subKw) {
  if (!subKw) return text;
  const escaped = subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let count = (text.match(new RegExp(escaped, "g")) || []).length;
  if (count >= 6) return text;
  const lines = text.split("\n");
  // 복합 키워드 후보 — 자연스러운 형태
  const variants = [`${subKw} 체험`, `${subKw} 프로그램`, subKw, subKw, subKw, subKw];
  let vIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i] || lines[i].startsWith("[이미지:") || lines[i].startsWith("#")) continue;
    if (!lines[i].includes(subKw)) {
      lines[i] = `${lines[i]} ${variants[vIdx] || subKw}`;
      count++;
      vIdx++;
    }
    if (count >= 6) break;
  }
  return lines.join("\n");
}

/**
 * processFinalText — 후처리 통합 함수 (v41)
 */
function processFinalText(assembled, subKw, region) {
  assembled = removeForeignConcept(assembled, subKw);
  assembled = removeRepeatSentence(assembled);
  // 👉 디테일 먼저
  assembled = injectDetail(assembled, subKw);
  // 👉 키워드 먼저
  assembled = reinforceKeyword(assembled, subKw);
  // 👉 그 다음 중복 제거
  assembled = removeMeaningDuplicate(assembled);
  // 👉 마무리 구성
  assembled = addPhotoPoint(assembled);
  assembled = addEnding(assembled);
  // 👉 지역 제한
  assembled = limitRegionUsage(assembled, region);
  // 👉 최종 정리
  assembled = finalClean(assembled);
  return assembled;
}

/**
 * getPrevContext — 이전 섹션 컨텍스트 축소 (반복 방지)
 */
function getPrevContext(prevText) {
  return prevText ? prevText.slice(-300) : "";
}

// ============================================================
// v41 — 자동 100점 엔진 핵심 함수
// ============================================================

/**
 * sanitizeRegion — 서울 등 금지 지역 강제 제거
 */
function sanitizeRegion(region) {
  if (!region) return "";
  const bannedRegions = ["서울", "서울시", "서울 유치원"];
  if (bannedRegions.includes(region.trim())) return "";
  return region;
}

/**
 * diagnosePost — 생성 글 품질 진단 (점수 반환)
 */
function diagnosePost(text, subKw) {
  let score = 100;
  // 글자수
  const len = text.replace(/\s/g, "").length;
  if (len < 2000) score -= 25;
  else if (len < 2500) score -= 10;
  // 키워드 밀도
  const count = (text.match(new RegExp(subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  if (count < 4) score -= 25;
  else if (count < 6) score -= 10;
  // 반복 문장
  const lines = text.split("\n").filter(v => v.trim());
  const unique = new Set(lines);
  if (lines.length - unique.size > 5) score -= 15;
  // 금지어
  EXPLAIN_BANNED.forEach(w => {
    if (text.includes(w)) score -= 5;
  });
  return Math.max(score, 0);
}

/**
 * autoFixPost — 진단 결과 기반 자동 보정
 */
function autoFixPost(text, subKw) {
  let fixed = text;
  fixed = reinforceKeyword(fixed, subKw);
  fixed = removeMeaningDuplicate(fixed);
  fixed = removeExplanation(fixed);
  // 글자수 부족 시 보완 문단 추가
  if (fixed.replace(/\s/g, "").length < 2300) {
    fixed += `\n\n아이들이 코너를 이동하는 과정에서 흐름이 끊기지 않도록 구성되며,\n각 활동은 다음 단계로 자연스럽게 이어진다.\n교사는 개입을 최소화하면서 전체 흐름과 안전만 유지하는 방식으로 운영된다.`;
  }
  return fixed;
}

/**
/**
 * getActionExample — 프로그램별 행동→대사→결과 예시 동적 생성
 */
function getActionExample(subKw) {
  if (!subKw) return "아이가 앞으로 나갔다.\n\"나도 해볼게!\" 손을 뻗었다.\n결과물을 들고 친구에게 보여줬다.";
  if (subKw.includes("시장"))     return "지민이는 과일코너에서 바나나를 들었다.\n\"이거 얼마예요?\" 가격표를 짚었다.\n화폐를 세며 계산대로 이동했다.";
  if (subKw.includes("병원"))     return "서연이는 청진기를 귀에 꽂았다.\n\"숨 크게 쉬어보세요.\" 진지하게 말했다.\n처방전을 들고 약국 코너로 걸어갔다.";
  if (subKw.includes("과학"))     return "민수가 두 비커를 섞었다.\n\"색이 바뀌어요!\" 소리를 질렀다.\n옆 친구에게 결과물을 들이밀었다.";
  if (subKw.includes("소방"))     return "지호가 소방복 앞에 섰다.\n\"내가 먼저 입을게!\" 소매를 끌어당겼다.\n헬멧을 쓰고 출동 구역으로 뛰었다.";
  if (subKw.includes("전통"))     return "은지가 윷을 집어들었다.\n\"이렇게 던지는 거야?\" 고개를 기울였다.\n바닥에 던지자 팀 전체가 소리를 질렀다.";
  if (subKw.includes("캠핑"))     return "준서가 텐트 입구를 들여다봤다.\n\"안에 들어가도 돼요?\" 물었다.\n몸을 굽혀 기어들며 안을 살폈다.";
  if (subKw.includes("블랙라이트")) return "하은이가 형광 블락을 손에 쥐었다.\n\"이게 왜 빛나요?\" 눈을 가늘게 떴다.\n벽에 붙이자 바로 빛이 번졌다.";
  if (subKw.includes("목공"))     return "재윤이가 망치를 처음 쥐었다.\n\"못이 안 들어가요!\" 힘을 더 줬다.\n작업대 위에 완성된 판자를 내려놓았다.";
  if (subKw.includes("방송"))     return "시아가 마이크 앞에 섰다.\n\"안녕하세요, 오늘의 날씨입니다.\" 또렷하게 읽었다.\n카메라를 향해 고개를 들었다.";
  if (subKw.includes("반죽"))     return "민아가 반죽을 발로 밟았다.\n\"으아, 이상해!\" 발을 떼려 했다.\n다시 밟으며 웃음이 터졌다.";
  if (subKw.includes("경찰"))     return "태양이가 경광봉을 쥐었다.\n\"출동이다!\" 달려나갔다.\n범인 역할 친구를 에워쌌다.";
  return "아이가 앞으로 나갔다.\n\"나도 해볼게!\" 손을 뻗었다.\n결과물을 들고 친구에게 보여줬다.";
}

/**
 * removeForeignConcept — BLOCK_MAP 기반 프로그램 격리 (2차 후처리 차단)
 * 현재 프로그램(subKw)에 해당하지 않는 카테고리 키워드 전부 제거
 */
function removeForeignConcept(text, subKw) {
  if (!subKw || !text) return text;

  const BLOCK_MAP = {
    시장:       [/화폐[^.]*\./g, /결제[^.]*\./g, /장바구니[^.]*\./g, /가격표[^.]*\./g, /상점[^.]*\./g, /거스름돈[^.]*\./g, /가짜\s*돈[^.]*\./g],
    병원:       [/진료[^.]*\./g, /처방[^.]*\./g, /약국[^.]*\./g, /수술[^.]*\./g, /환자[^.]*\./g, /의사[^.]*\./g],
    과학:       [/실험[^.]*\./g, /비커[^.]*\./g, /관찰[^.]*\./g, /결과\s*기록[^.]*\./g],
    경찰:       [/체포[^.]*\./g, /수사[^.]*\./g, /범인[^.]*\./g, /출동[^.]*\./g],
    전통:       [/윷놀이[^.]*\./g, /제기[^.]*\./g, /투호[^.]*\./g, /한복[^.]*\./g],
    캠핑:       [/텐트[^.]*\./g, /모닥불[^.]*\./g, /취사[^.]*\./g, /야영[^.]*\./g],
    전통놀이:    [/굴렁쇠[^.]*\./g, /떡매치기[^.]*\./g, /사방치기[^.]*\./g, /널뛰기[^.]*\./g, /버나돌리기[^.]*\./g],
    블랙라이트: [/형광[^.]*\./g, /암막[^.]*\./g, /UV[^.]*\./g],
  };

  let result = text;
  for (const [category, patterns] of Object.entries(BLOCK_MAP)) {
    // 현재 프로그램이 이 카테고리에 해당하면 스킵 (해당 프로그램은 해당 키워드 허용)
    if (subKw.includes(category)) continue;
    for (const pattern of patterns) {
      result = result.replace(pattern, "");
    }
  }
  return result.replace(/\n{3,}/g, "\n\n");
}

export default async function handleKindergarten(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    bundleMode,          // ← 묶음 생성 모드
    target, program, programs, blogType,
    photoAnalysis, images: reqImages, userRegion, userMemo,
    supplementMode, originalText, diagResult, suppMemo,
    expandMode, caption,
    guidelineText,
    seoAutoMode, deficitItems,
    photoMetaMode, blogText: photoMetaBlogText, photoCount, blogInfo,
  } = req.body;

  // [이식] openai = generateUtils 공통 인스턴스 (상단 import). 내부 함수는 이 openai를 인자로 전달받음.

  // ── 사진 메타 자동생성 모드 ───────────────────────────────
  if (photoMetaMode && photoMetaBlogText && blogInfo) {
    try {
      const count = photoCount || 5;

      // program 정규화 — "블랙라이트" 단독 입력 시 "블랙라이트체험"으로 보정
      const PROGRAM_NORMALIZE = {
        "블랙라이트":   "블랙라이트체험",
        "캠핑놀이":     "캠핑놀이체험",
        "방송국":       "방송국체험",
        "목공":        "목공·공구놀이",
        "공구놀이":    "목공·공구놀이",
        "반죽":        "반죽놀이",
        "쿠키":        "반죽놀이",
        "반죽·쿠키만들기": "반죽놀이",
        "경찰":        "경찰·교통안전",
        "교통안전":    "경찰·교통안전",
      };
      const rawProgram = blogInfo.program || "체험";
      const normalizedProgram = PROGRAM_NORMALIZE[rawProgram] || rawProgram;

      // 프로그램별 구조 키워드 맵 (A안 — SEO 통제용)
      const PROGRAM_STRUCTURE_MAP = {
        "시장놀이":      ["상점 4개 분리","중앙 통로 동선","결제·체험 코너 분리","화폐 배분만으로 자율 운영 가능한 구조","과일·채소·먹거리 코너 순환 배치"],
        "블랙라이트체험": ["완전 암막 교실 빛 차단 세팅","벽면놀이·형광블락놀이 메인 구역 배치","열쇠고리 만들기 테이블(오븐 포함) 별도 구역","VR 헤드셋 구역 분리 배치","반 단위 순환 — 대기 없는 자유 이동 구조"],
        "병원놀이":      ["진료·처치·약국 코너 분리","역할별 동선 구성","대기 없이 순환 진행","의사·간호사·환자 역할 구역 분리","처치대·약국 동선 순환 배치"],
        "방송국체험":    ["스튜디오·촬영 구역 분리","장비 중심 동선 구성","역할 체험 순환 구조","앵커·카메라맨·기상캐스터 구역 배치","촬영→편집→방송 순서로 이어지는 동선"],
        "과학아놀자":    ["실험 테이블 구역 분리","재료·도구 사전 배치 구조","반 단위 순환 실험 동선","안전 구역 확보 배치","체험 순서별 테이블 구성"],
        "목공·공구놀이": ["작업대 간격 확보 배치","공구 종류별 구역 분리","안전 동선 중심 공간 구성","못질·조립·완성 단계별 테이블 배치","공구 반납 동선 분리 구조"],
        "반죽놀이":       ["반죽놀이·쿠키만들기·통밀갈기 3교실 분리 배치","바닥 천막+8미터 배경막 중심 반죽놀이 공간","오븐·쟁반 중심 쿠키만들기 테이블 구성","분쇄기·채·풀그림 통밀갈기 테이블 배치","강당형 원스톱 또는 교실별 로테이션 운영"],
        "캠핑놀이체험":  ["텐트·모닥불·먹거리 코너 분리","캠핑 구역 중심 동선 구성","야외 감성 공간 배치 구조","텐트 설치→요리→모닥불 순환 동선","소그룹 캠프 구역 분리 배치"],
        "미용놀이":      ["네일·헤어·메이크업 코너 분리","의자·거울 중심 동선 배치","역할 체험 순환 구조","1인 1스테이션 배치로 대기 최소화","완성 사진 촬영 구역 별도 구성"],
        "전통놀이":      ["윷놀이·제기·팽이 코너 분리","전통 놀이 종류별 구역 배치","실내 동선 중심 순환 구조","그룹 참여 가능한 넓은 공간 배치","놀이 도구 반납 동선 분리"],
        "경찰·교통안전": ["경찰 출동센터·감옥·교통안전 체험존 2공간 분리 배치","호출벨 수신 디스플레이+출동일지 중심 출동센터 구성","철창 감옥 — 범인·경찰 함께 입장하는 놀이 공간","과학수사 대기존 — 지문보드판·돋보기·수갑·권총 배치","8미터 배경막+횡단보도 매트+왕복 2차선 교통안전 체험존"],
      };
      const DEFAULT_STRUCTURE = ["코너별 구역 분리 배치","반 단위 순환 동선 구성","대기 없이 진행되는 순환 구조","체험 흐름 중심 공간 배치","역할 구역 분리 운영 구조"];
      const structs = PROGRAM_STRUCTURE_MAP[normalizedProgram] || DEFAULT_STRUCTURE;

      // 사진 순번별 장면 슬롯
      const sceneSlots = ["교실 입장 장면","첫 반응","교실 구성","운영 진행 장면","체험 에피소드","현장 활동","코너 체험","역할놀이","활동 구성","운영 구조"];
      const fileSlots  = ["교실_입장","첫_반응","교실_구성","운영_진행","체험_에피소드","현장_활동","코너_체험","역할놀이","활동_구성","운영_구조"];

      // 사진별 메타 직접 생성
      const photoMeta = Array.from({ length: count }, (_, i) => {
        const struct   = structs[i % structs.length];
        const scene    = sceneSlots[i % sceneSlots.length];
        const fileSlot = fileSlots[i % fileSlots.length];
        const num      = String(i + 1).padStart(2, "0");
        const r        = blogInfo.region  || "";
        const t        = blogInfo.target  || "유치원";
        const p        = normalizedProgram;

        return {
          filename: `${r}_${t}_${p}_${fileSlot}-${num}.jpg`,
          alt:      `${r} ${t} ${p} ${scene} ${struct}`,
          caption:  `${p} ${scene}, ${struct}`,
        };
      });

      return res.status(200).json({ success: true, photoMeta });

    } catch (err) {
      console.error("photoMeta error:", err);
      return res.status(200).json({ success: false, photoMeta: null });
    }
  }

  // ── 캡션 변환 모드 ────────────────────────────────────────
  if (expandMode && caption) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        temperature: 0.5,
        messages: [{
          role: "system",
          content: `캡션을 블로그 문장으로 변환. 1~2문장(50자 내외). 끝: ~이었습니다/했습니다. 현장감 있게. 금지어: 모습입니다/장면입니다/진행됩니다`,
        }, {
          role: "user",
          content: `캡션: ${caption}\n→`,
        }],
      });
      return res.status(200).json({
        success: true,
        blogSentence: completion.choices[0].message.content?.trim() || "",
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "변환 오류" });
    }
  }

  // ── SEO 자동 보완 모드 ────────────────────────────────────
  if (seoAutoMode && originalText) {
    try {
      const deficitList = Array.isArray(deficitItems) && deficitItems.length > 0
        ? deficitItems.join("\n") : "- 글자수, 키워드, 이미지 ALT 전반 점검";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4500,
        temperature: 0.5,
        messages: [{
          role: "system",
          content: `네이버 블로그 SEO 편집자. 부족한 부분만 보완. 전체 재작성 금지. 문의/예약/전화 금지. 리스트 금지. 짧은 문장은 다음 행동까지 이어서 확장해라.${guidelineText ? "\n\n[지침]\n" + guidelineText : ""}`,
        }, {
          role: "user",
          content: `[현재 글]\n${originalText}\n\n[부족한 항목]\n${deficitList}\n\n위 항목만 보완하여 전체 출력`,
        }],
      });

      let bodyText = (completion.choices[0].message.content || "").trim();
      bodyText = filterSection(bodyText);
      bodyText = expandSection(bodyText);
      bodyText = postProcess(bodyText, "action"); // 보완 모드는 전체 글 — action 기준 적용
      bodyText = finalClean(bodyText);

      return res.status(200).json({
        success: true, text: bodyText, hashtags: [], images: [],
        charCount: calcCharCount(bodyText), seoAutoMode: true,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "SEO 자동 보완 오류" });
    }
  }

  // ── 보완 모드 ─────────────────────────────────────────────
  if (supplementMode && originalText) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 3500,
        temperature: 0.75,
        messages: [{
          role: "system",
          content: `네이버 블로그 SEO 전문 작가. 현장 기록형 글로 개선. 문의/예약/전화 금지. 리스트 금지. 마무리 1회. 짧은 문장은 다음 행동까지 이어서 확장해라.${guidelineText ? "\n\n[지침]\n" + guidelineText : ""}`,
        }, {
          role: "user",
          content: buildSupplementPrompt({ originalText, diagResult, suppMemo }),
        }],
      });

      let bodyText = (completion.choices[0].message.content || "")
        .replace(/HASHTAGS:.+/s, "").trim();

      if (diagResult && target && program) {
        const mainKw      = getMainKeyword(target, program);
        const subKw       = program.name;
        const subVariants = buildKeywordVariants(subKw);
        const otherProgs  = (programs || []).filter(p => p.name !== subKw).map(p => p.name);
        const region      = sanitizeRegion(userRegion?.trim() || "");
        const { text: repaired } = autoRepair(bodyText, diagResult, mainKw, subKw, subVariants, otherProgs, region);
        bodyText = repaired;
      }

      bodyText = filterSection(bodyText);
      bodyText = expandSection(bodyText);
      bodyText = postProcess(bodyText, "action");
      bodyText = finalClean(bodyText);

      return res.status(200).json({
        success: true, text: bodyText, hashtags: [], images: [],
        charCount: calcCharCount(bodyText),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "보완 생성 오류" });
    }
  }

  // ── 묶음 생성 모드 (bundleMode) ─────────────────────────────
  // 동일 키워드로 성격이 다른 3개 글을 순차 생성
  if (bundleMode) {
    const progList = programs?.length > 0 ? programs : (program ? [program] : []);
    if (!target || progList.length === 0) {
      return res.status(400).json({ error: "bundleMode: 타겟·프로그램 필수" });
    }
    const mainProg = progList[0];
    const tgt      = target;
    const mk       = getMainKeyword(tgt, mainProg);
    const sk       = mainProg.name;
    const reg      = sanitizeRegion(userRegion?.trim() || "");
    const mem      = userMemo?.trim() || "";
    const guide    = guidelineText || "";

    // 3가지 타입 정의 — 성격 완전 다르게
    const BUNDLE_TYPES = [
      {
        id: "overview",
        label: "전체 구조형",
        memoPrefix: "[전체구조] 공간 배치·운영 동선·구성 중심으로 작성. 처음 방문자가 전체 그림을 이해하도록.",
      },
      {
        id: "operation",
        label: "운영 방법형",
        memoPrefix: "[운영방법] 교사 실무 중심. 준비·진행·철수·인원 배치·주의사항 위주로 작성. 교사가 바로 쓸 수 있는 노하우.",
      },
      {
        id: "review",
        label: "후기/반응형",
        memoPrefix: "[현장후기] 아이들 반응·표정·대사·에피소드 중심. 감정 흐름 위주. 사진 묘사 포함.",
      },
    ];

    try {
      const bundleResults = [];
      for (const bType of BUNDLE_TYPES) {
        // 각 타입별 메모 prefix 삽입 (기존 memo 앞에 붙임)
        const typeMemo = bType.memoPrefix + (mem ? " / " + mem : "");

        // 섹션 생성
        const secTexts = {};
        secTexts.intro = await generateSection(openai, "intro", sk, mk, reg, typeMemo, 1, mainProg);
        const midKeys  = ["reaction", "classroom", "operation", "episode", "recommend"];
        const midRes   = await Promise.all(midKeys.map(k => generateSection(openai, k, sk, mk, reg, typeMemo, 1, mainProg)));
        midKeys.forEach((k, i) => { secTexts[k] = midRes[i]; });
        secTexts.closing = await generateSection(openai, "closing", sk, mk, reg, typeMemo, 1, mainProg);

        // 조립 + 후처리 v41: processFinalText 통합 함수 사용
        const assembled   = assembleWithImages(secTexts, reg, sk);
        let processed     = processFinalText(assembled, sk, reg);

        // v41 자동 100점 보정 루프 (최대 2회)
        let seoScore = diagnosePost(processed, sk);
        let fixLoop  = 0;
        while (seoScore < 95 && fixLoop < 2) {
          processed  = autoFixPost(processed, sk);
          seoScore   = diagnosePost(processed, sk);
          fixLoop++;
          console.log(`[v41-bundle] 보정 ${fixLoop}회: ${seoScore}점`);
        }
        const title       = generateTitle(sk, reg, typeMemo, mainProg);
        const withTitle   = `# ${title}\n\n${processed}`;
        const cleanedT    = withTitle.split("\n").filter(l => !/^(#\S+[\s\t]*){2,}/.test(l.trim())).join("\n").trimEnd();
        const rawTags     = buildHashtags(sk, reg);
        const uniqueTags  = [...new Set(rawTags.trim().split(/\s+/).filter(t => t.startsWith("#")))].slice(0, 12).join(" ");
        const withTags    = cleanedT + "\n\n" + uniqueTags;
        const finalText   = finalClean(withTags);
        const charCount   = calcCharCount(finalText);

        // 이미지 파싱
        const imgReg  = /\[이미지:\s*([^\]]+)\]/g;
        const images  = [];
        let imgMatch;
        while ((imgMatch = imgReg.exec(finalText)) !== null) {
          images.push({ alt: imgMatch[1].trim(), caption: "" });
        }

        bundleResults.push({
          id:       bType.id,
          label:    bType.label,
          text:     finalText,
          charCount,
          images,
          hashtags: finalText.trimEnd().split("\n").pop()?.startsWith("#")
            ? finalText.trimEnd().split("\n").pop().split(/\s+/).filter(t => t.startsWith("#"))
            : [],
        });

        console.log(`[bundle] ${bType.label} 완성: ${charCount}자`);
      }

      return res.status(200).json({ success: true, bundleMode: true, bundle: bundleResults });

    } catch (err) {
      console.error("[bundle] error:", err);
      return res.status(500).json({ error: err.message || "묶음 생성 오류" });
    }
  }

  // ── 일반 생성 모드 (v36 — 섹션 분할 생성) ────────────────────
  const progList = programs?.length > 0 ? programs : (program ? [program] : []);
  if (!target || progList.length === 0) {
    return res.status(400).json({ error: "필수 파라미터가 누락되었습니다." });
  }

  const mainProgram = progList[0];

  // [이식] EDU 조합 게이트 (레일 isRest식) — 잘못된 업종 항목 진입 차단
  const EDU_IDS = KINDERGARTEN_TREATMENTS.map(t => t.id);
  const isEdu = EDU_IDS.includes(mainProgram.id) || mainProgram.industry === "kindergarten";
  if (!isEdu) {
    console.error(`[kindergarten] 잘못된 조합 진입 차단: ${mainProgram.name} / id=${mainProgram.id}`);
    return res.status(400).json({ error: `유치원 생성기에 잘못된 항목이 전달되었습니다: ${mainProgram.name}` });
  }

  // [이식] 위치 공통화 — locationBlock 후단 주입용 5필드 수신 (SOP PATCH-07)
  const _locStore = {
    address:       req.body?.address,
    map_guide:     req.body?.map_guide,
    transit:       req.body?.transit,
    building_desc: req.body?.building_desc,
    parking_info:  req.body?.parking_info,
  };

  const subKw       = mainProgram.name;
  const mainKw      = getMainKeyword(target, mainProgram);
  const region      = sanitizeRegion(userRegion?.trim() || "");
  const memo        = userMemo?.trim() || "";

  try {
    console.log("[v36] 섹션 분할 생성 시작");

    // 이미지 재분석 (사진 있으면 gpt-4o-mini로 디테일 추출)
    let imageDetail = photoAnalysis || "";
    if (reqImages && reqImages.length > 0) {
      try {
        const visionRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_tokens: 800,
          messages: [{
            role: "system",
            content: "사진을 보고 블로그 글에 쓸 현장 디테일만 추출해라.\n금지: 감정표현/추상표현/일반설명\n필수: 공간구조/아이행동/도구/배치방식\n짧고 구체적으로 5문장 이상",
          }, {
            role: "user",
            content: reqImages.slice(0, 5).map(img => ({
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${img}` },
            })),
          }],
        });
        imageDetail = visionRes.choices[0].message.content || imageDetail;
        console.log("[v35] 이미지 재분석 완료");
      } catch(e) {
        console.error("[v35] 이미지 분석 실패, photoAnalysis 사용:", e.message);
      }
    }

    // buildImageMeta — 프로그램별 동적 ALT/캡션 생성
    const buildImageMeta = (regionStr, progName) => {
      const pc = getPlayConfig(progName);
      return [
        { alt: `유치원 ${progName} 입장 장면`,     caption: `아이들이 입장하면서 ${pc.corners[0] || "첫 코너"}를 처음 마주치는 순간` },
        { alt: `유치원 ${progName} 아이들 반응`,   caption: `${pc.corners.slice(0, 2).join("·")} 코너를 이동하며 자연스럽게 참여하는 모습` },
        { alt: `유치원 ${progName} 교실 구성`,     caption: `${pc.corners.join("·")} 구성과 이동 동선이 연결된 공간` },
        { alt: `유치원 ${progName} 운영 장면`,     caption: `대기 없이 흐름이 이어지는 ${progName} 운영 방식` },
        { alt: `유치원 ${progName} 체험 에피소드`, caption: `아이들의 행동과 반응이 자연스럽게 이어지는 ${pc.corners[pc.corners.length - 1] || "마지막 코너"} 장면` },
      ];
    };
    const imageMeta = buildImageMeta(region, subKw);
    const imageGuide = imageMeta.map((img, i) =>
      `이미지${i+1}: [이미지: ${img.alt} | ${img.caption}]`
    ).join("\n");

    // imageDetail(재분석) 또는 photoAnalysis 프롬프트에 주입
    const photoSection = imageDetail
      ? `\n[사진 기반 현장 정보 — 반드시 글에 자연스럽게 반영]\n${imageDetail}\n`
      : "";

    // ── 패턴 DB 읽기 → 프롬프트 주입 블록 생성 ──────────────
    const patternDB    = readPatternDB();
    const patternBlock = buildPatternBlock(patternDB.patterns, subKw);

    // ── 경쟁글 패턴 블록 생성 ─────────────────────────────────
    const competitorBucket = patternDB.programs?.[`${subKw}_competitor`];
    const competitorBlock  = competitorBucket && (
      (competitorBucket.structures?.length || 0) +
      (competitorBucket.details?.length    || 0) > 0
    ) ? (() => {
      const lines = ["[🔍 경쟁 상단글 패턴 — 이것보다 더 나은 글을 써라]"];
      if (competitorBucket.structures?.length > 0) {
        lines.push("경쟁글 구조:");
        competitorBucket.structures.slice(0, 1).forEach(s => lines.push(`  · ${s}`));
      }
      if (competitorBucket.details?.length > 0) {
        lines.push("경쟁글 운영 디테일 (참고하되 더 구체적으로):");
        competitorBucket.details.slice(0, 5).forEach(s => lines.push(`  · ${s}`));
      }
      if (competitorBucket.sentences?.length > 0) {
        lines.push("경쟁글 장면 패턴 (이 방식보다 더 현장감 있게):");
        competitorBucket.sentences.slice(0, 2).forEach(s => lines.push(`  · ${s}`));
      }
      lines.push("※ 위 패턴은 벤치마크용. 복제 금지. 반드시 더 구체적·현장감 있게 작성할 것.");
      return lines.join("\n");
    })() : "";

    // ── 섹션 정의 — flow 인덱스 공유 기반 동적 생성 ──────────
    const handlerPlayConfig = getPlayConfig(subKw);
    const hFlow = handlerPlayConfig.flow;  // flow 단일 참조점

    const SECTIONS = [
      {
        key: "intro",
        label: "도입",
        minChar: 400,
        instruction: buildIntroInstruction(subKw, handlerPlayConfig, mainKw || subKw)
          + `
🚨 도입 섹션: 코너 흐름 설명은 이 섹션에서 1회만. 이후 섹션에서 동선 반복 금지.`,
        // flow[0]: 입장 단계
      },
      {
        key: "reaction",
        label: "현장 반응",
        minChar: 500,
        instruction: getSectionInstruction(subKw, "reaction", buildFlowBlockForSection(hFlow, "reaction"))
          + (mainKw && mainKw !== subKw ? `
🚨 핵심 강제: 이 섹션에서 반드시 "${mainKw}" 관련 장면을 1개 이상 포함할 것. 아이가 직접 체험하는 순간으로 묘사.` : ""),
        // flow[0~1]: 첫 반응 단계 — 프로그램별 분기
      },
      {
        key: "classroom",
        label: "교실 구성",
        minChar: 700,
        instruction: buildClassroomInstruction(subKw, handlerPlayConfig, "")
          + `
🚨 [교실 구성 역할 고정] 이 섹션에서 코너 구성 1회 설명 완료. 이후 섹션에서 코너 구조 재설명 절대 금지.
🚨 "교실 구성은 크게 N개 코너로 나뉜다" 나열형 시작 절대 금지.
🚨 "첫 번째 코너는", "두 번째 코너는", "세 번째 코너는" 시작 금지.`
          + (subKw.includes("전통") ? `
🚨 [전통놀이 도구 고정] 한복/대형윷/투호/제기/팽이/고리던지기만. 굴렁쇠·줄다리기·떡매·사방치기 절대 금지.` : ""),
        // flow 전체: 코너별 매핑
      },
      {
        key: "operation",
        label: "운영 방식",
        minChar: 500,
        instruction: (() => {
          const baseOp = (() => {
            try {
              return getSectionInstruction(subKw, "operation", "");
            } catch(e) {
              return buildOperationInstruction(subKw, handlerPlayConfig)
                + `
🚨 운영방법 절대 금지 문장:
- "이 과정은 ~ 돕는다" 형태 금지
- "원활한 진행을 돕는다" 금지
- "아이들이 자율적으로 ~ 있도록" 금지
- 매뉴얼형 서술 금지 → 반드시 교사가 실제로 한 행동 + 숫자로만 서술`;
            }
          })();
          return baseOp + `
🚨 [운영 섹션 최우선 금지]
- 앞 섹션(교실 구성)에서 설명한 코너 구조 재설명 절대 금지
- "~교실에서는", "~코너에서는" 으로 시작하는 문장 금지
- 교실/코너 순서 나열 금지
→ 이 섹션은 오직 교사 행동 + 운영 핵심 디테일만 작성`;
        })(),
        // flow 전체: 교사 역할 기준
      },
      {
        key: "episode",
        label: "에피소드",
        minChar: 600,
        instruction: getSectionInstruction(subKw, "episode", buildFlowBlockForSection(hFlow, "episode")),
        // flow[중간~끝-1]: 핵심 체험 단계 — 프로그램별 분기
      },
      {
        key: "closing",
        label: "마무리",
        minChar: 300,
        instruction: (() => {
          // 프로그램별 전용 closing instruction 있으면 우선 사용
          try {
            return getSectionInstruction(subKw, "closing", "");
          } catch(e) {
            // 없으면 공통 CLOSING_POOL 적용
            const CLOSING_POOL = [
              "행사가 끝난 뒤에도 아이들은 그 공간을 쉽게 떠나지 않았다.",
              "정리가 시작됐지만 아이들은 계속 손을 움직이고 있었다.",
              "마무리 순간까지 아이들의 움직임은 끊기지 않았다.",
              "끝난 뒤에도 아이들은 다시 한 번 해보려는 모습을 보였다.",
              "활동이 끝났는데도 아이들은 자리를 벗어나지 않았다.",
              `그날의 ${subKw}는 단순한 체험이 아니라 아이들 기억 속에 남는 하루의 사건이었다.`,
            ];
            const ending = CLOSING_POOL[Math.floor(Math.random() * CLOSING_POOL.length)];
            return `[마무리 섹션 규칙]
🚨 절대 금지:
- 기관 추천 반복 금지 (앞 섹션에서 이미 다룸)
- "운영이 안정적", "몰입도가 높고", "넓은 공간" 반복 금지
- 구조 설명 반복 금지
- 설명형 문장 금지

[작성 규칙]
- 총 3~4문장만
- 반드시 아이 행동 장면으로 마무리
- 마지막 문장: "${ending}"`;
          }
        })(),
      },
    ];

    // ── 공통 컨텍스트 ────────────────────────────────────────
    const isMarket = subKw.includes("시장");
    const currencyBan = isMarket ? "" : `- 절대 금지 (이 프로그램에 없는 요소): 화폐, 돈, 결제, 구매, 장바구니, 거스름돈, 가격표\n`;

    // 🔥 핵심: data.js seoData → 프롬프트에 직접 주입
    const sceneDataBlock = buildSceneDataBlock(mainProgram);

    const commonContext = `
주제: 유치원 ${subKw}
추가 메모: ${memo || "없음"}
${photoSection}
${patternBlock ? patternBlock + "\n" : ""}${competitorBlock ? competitorBlock + "\n" : ""}${sceneDataBlock}
규칙:
- 감성 금지: 특별한/신나는/즐거운/설레는/행복/소중한/느꼈다/배웠다
- 설명 금지: 경험했다/참여했다/즐겼다/할 수 있었다/이처럼/을 통해/를 통해/자연스럽게 배우
- 반드시 장면으로: 행동 + 대사 + 물건 + 숫자
- 위 [프로그램 운영/현장 데이터]의 실제 소품·코너·반응을 반드시 글에 반영할 것
${currencyBan}- 섹션 제목/번호 출력 금지. 본문만`.trim();

    // ── 섹션별 순차 생성 ─────────────────────────────────────
    const sectionTexts = {};
    const imageKeys = ["intro", "reaction", "classroom", "operation", "episode"];
    let prevText = "";  // ← 이전 섹션 누적 텍스트 (연결용)

    for (const sec of SECTIONS) {
      // ── 이전 섹션 연결 블록 ──────────────────────────────────
      const prevBlock = prevText
        ? `\n[이전 섹션 내용 — 아래 내용은 절대 반복하지 말 것]\n${getPrevContext(prevText)}\n🚨 위 내용에서 이미 언급한 코너 흐름 및 구조 설명 반복 금지. 새로운 장면/디테일로만 작성.\n`
        : "";

      const secPrompt = `${commonContext}
${prevBlock}
이 글은 하나의 흐름으로 이어지는 글이다.
이전 내용과 반드시 연결해서 이어서 작성하라.
절대 새로운 글처럼 시작하지 마라.
지금 이어서 작성할 부분: [${sec.label}]
최소 글자수: ${sec.minChar}자 이상 (공백 제외)

작성 지침:
${sec.instruction}

이전 문단과 자연스럽게 이어지도록 작성하라.
같은 시작 문장 패턴 반복 금지.
위 지침대로 [${sec.label}] 부분만 작성하라. 다른 섹션 내용 포함 금지.`;

      const secRes = await openai.chat.completions.create({
        model:       "gpt-4o",
        max_tokens:  1600,  // v41: 1200 → 1600 (문장 잘림 방지)
        temperature: 0.6,
        messages: [
          { role: "system", content: `당신은 유치원 체험 프로그램 현장을 직접 운영한 전문가입니다. 설명이 아니라 현장 기록 방식으로 작성합니다. 행동 + 대사 + 결과 구조를 반드시 지킵니다. 지시된 섹션만 작성하고 최소 글자수를 반드시 채웁니다. 짧게 끝내지 마십시오.` },
          { role: "user",   content: secPrompt },
        ],
      });

      let secText = (secRes.choices[0].message.content || "").trim();
      secText = removeBadSentences(secText);
      const secLen = calcCharCount(secText);
      console.log(`[v36] ${sec.label}: ${secLen}자`);

      sectionTexts[sec.key] = secText;
      prevText += "\n" + secText;  // ← 다음 섹션에 전달할 누적 텍스트 갱신
    }

    // ── 섹션 조립 ────────────────────────────────────────────
    const altList = imageMeta.map(img => `[이미지: ${img.alt} | ${img.caption}]`);
    let assembled = "";

    // ── 제목 생성 후 본문 맨 앞에 추가 ─────────────────────────
    const title = generateTitle(subKw, region, memo, mainProgram);
    assembled += `# ${title}\n\n`;

    assembled += sectionTexts.intro    + "\n\n" + (altList[0] || "") + "\n\n";
    assembled += sectionTexts.reaction + "\n\n" + (altList[1] || "") + "\n\n";
    assembled += sectionTexts.classroom + "\n\n" + (altList[2] || "") + "\n\n";
    assembled += sectionTexts.operation + "\n\n" + (altList[3] || "") + "\n\n";
    assembled += sectionTexts.episode   + "\n\n" + (altList[4] || "") + "\n\n";
    assembled += sectionTexts.closing;

    // ── 후처리 v41: processFinalText 통합 함수 사용
    assembled = processFinalText(assembled, subKw, region);

    // ── v41 자동 100점 보정 루프 (최대 2회)
    let seoScore = diagnosePost(assembled, subKw);
    let fixLoop = 0;
    while (seoScore < 95 && fixLoop < 2) {
      assembled = autoFixPost(assembled, subKw);
      seoScore = diagnosePost(assembled, subKw);
      fixLoop++;
      console.log(`[v41] 보정 ${fixLoop}회: ${seoScore}점`);
    }
    console.log(`[v41] 최종 진단: ${seoScore}점`);

    // 해시태그 추가
    const rawTags = buildHashtags(subKw, region);
    const uniqueTags = [...new Set(rawTags.trim().split(/\s+/).filter(t => t.startsWith("#")))].slice(0, 12).join(" ");
    assembled += "\n\n" + uniqueTags;

    let finalText = assembled.replace(/\n{3,}/g, "\n\n").trim();
    let charCount = calcCharCount(finalText);

    console.log(`[v36] 최종: ${charCount}자`);

    const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
    const images = [];
    let m;
    while ((m = imageRegex.exec(finalText)) !== null) {
      images.push({ alt: m[1].trim(), caption: "" });
    }

    const lastLine    = finalText.trimEnd().split("\n").pop() || "";
    const hashtagsArr = lastLine.startsWith("#")
      ? lastLine.split(/\s+/).filter(t => t.startsWith("#"))
      : [];

    // [이식] 생성글 자동 저장 + 패턴 추출 → autoSave 공통 래퍼 (결정2: Commercial 파이프라인)
    await autoSave({
      assembled: finalText,
      charCount,
      subKw,
      region,
      seoScore,
      industry: "kindergarten",
    });

    // [이식] 위치블록 후단 삽입 — 해시태그 직전 (SOP PATCH-07). 빈값이면 원문 그대로(부작용 0).
    let finalWithLoc = insertLocationBeforeHashtags(finalText, _locStore);
    const charCountFinal = calcCharCount(finalWithLoc);

    return res.status(200).json({
      success: true,
      text: finalWithLoc,            // 평문(네이버 붙여넣기)
      textMarkdown: finalWithLoc,    // [이식] 레일 정합 — 마크다운 동시 반환
      hashtags: hashtagsArr,
      images,
      imageMeta,
      charCount: charCountFinal,
      seoScore,                      // [이식] 레일 정합 — SEO 점수 반환
      mode: "commercial",            // [이식] 레일 정합
      validation: { passed: charCountFinal >= 2000, charCount: charCountFinal },
    });

  } catch (err) {
    console.error("[v35] Generate error:", err);
    return res.status(500).json({ error: err.message || "글 생성 중 오류가 발생했습니다." });
  }
}
