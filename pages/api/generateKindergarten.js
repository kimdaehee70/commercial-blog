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
import { isOwner } from "../../lib/constants"; // [KINDERGARTEN-OWNER-ONLY-GATE-01]
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
  "블랙라이트": "7m 두꺼운 암막, 형광블럭 세트, VR 기본 12대(최대 24대), 블랙라이트·더비·레이저 조명", // [PILOT-02] 근거 없는 「블랙라이트 4대」 교체 — 사장님 확인값
  "에어바운스": "대형 8m 구조, 동시 20명 이용, 안전요원 4명 배치",
  "캠핑":       "텐트 4동, 모닥불존, 화로 2개, 별자리 프로젝터 구성",
  "시장놀이":   "8m 배경막, 6개 상점(교실 4곳), 놀이 화폐 약 500장, 장바구니 45개", // [MARKET-PILOT-01] 「4개 상점·화폐 400장」 교체 — 활동지·사장님 확인값(묶음 등 기존 경로용)
  "병원놀이":   "현수막 3개·접수+약국+진료과 5개+수술실 구성, 실제 혈압계·체중계·영상현미경·네뷸라이저, 가운 8벌+수술복 4벌",
  "목공":       "망치, 못, 사포 세트, 작업대 4개, 동시 20명 가능",
  "경찰":       "출동벨 시스템, 수사키트, 감옥존, 교통신호등 체험",
  "레트로":     "딱지, 구슬, 고무줄, 팽이 4종 구성",
  "반죽":       "반죽 20kg, 제면기, 쿠키오븐, 통밀 분쇄기",
  "전통놀이":   "윷놀이, 투호, 제기차기, 팽이 4개 코너 독립 운영",
  "병영":       "군복 약 65벌·교사 조교복 5벌, 입소·제식훈련·사격교실·유격코스 3개 코스와 유격 장애물 6종", // [MILITARY-PILOT-01] 근거 없는 「군복 30벌·장애물 5종·모형총 20정·단체훈련장」 교체 — 사장님 확인값·홈페이지
  "겨울":       "8m 겨울 배경막, 눈썰매장 에어바운스와 눈처럼 보이는 별폼, 자석 얼음낚시(낚싯대 약 10개), 먹거리 부스 4개(부산어묵·매콤달콤 떡볶이·군고구마·밥도둑 자반), 대형 에어텐트", // [WINTER-STORY-PILOT-01] 근거 없는 「인공눈 10kg·눈사람 키트·스노우볼 20개·포장 서비스」 교체 — 활동지·홈페이지·사장님 확인값(묶음 등 기존 경로용)
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

// ============================================================
// [KINDERGARTEN-BLACKLIGHT-PILOT-02 · B] 블랙라이트(별나라 우주여행) 전용 Pilot
//   대상: program.id === "blacklight" 단일 생성만. 다른 16개 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 사장님 확인값 > 홈페이지·영상 > 활동지 절차. data(KINDERGARTEN_TREATMENTS)는 보존·미변경.
//   GPT 1회 호출로 글 전체를 만든다(섹션별 FACT 분리 + 앞 섹션을 이어받는 흐름).
//   대사 강제 주입·DETAIL_MAP 삽입·단어 부분삭제·위치블록·autoSave 는 거치지 않는다.
// ============================================================
const BLACKLIGHT_PILOT = {
  // [BLACKLIGHT-PRODUCTION-FIX-01] 신규 공략 Core = 「어린이집 블랙라이트 체험」. 보호 Core 「유치원 블랙라이트 체험」(기존 글 1위)
  //   와 겹치지 않게 제목 맨 앞은 어린이집, 유치원은 부제로 함께 명시. 지역 입력 시에도 같은 풀에서 무작위(지역 앞에 붙임).
  titles: [
    "어린이집 블랙라이트 체험｜유치원까지 찾아가는 별나라 우주여행 3가지 활동",
    "어린이집 블랙라이트 체험, 교실을 우주로 바꾸는 방법｜유치원·어린이집 방문 체험",
    "어린이집 참여수업 블랙라이트 체험, 별자리 열쇠고리와 VR까지 한 번에",
    "어린이집 블랙라이트 체험 준비｜유치원·어린이집에서 할 일과 반장이 준비하는 것",
  ],
  regionTitle: (r, base) => `${r} ${base}`,
  sections: [
    { key: "intro", role: "행사를 준비하는 원장님·선생님에게 묻는 질문으로 시작 → 이 프로그램이 무엇이고 어떤 행사에 맞는지 소개",
      facts: [
        "도입은 고민을 모든 선생님의 사실처럼 단정하지 않고 질문으로 연다. 방향 예: '매번 비슷한 실내 행사 대신 교실 분위기부터 달라지는 체험을 찾고 계신가요?' (문장을 그대로 베끼지 말고 자연스럽게 새로 쓴다)",
        "핵심 메시지: 평소 쓰던 교실을 블랙라이트 놀이 공간으로 바꾸고, 만들기와 VR 체험까지 연결한 반장 자체 기획 프로그램이다",
        "반장이 유아 행사 현장 경험을 바탕으로 직접 기획·구성한 원방문 체험 프로그램 '별나라 우주여행'이다 (소품은 구매해 조합했다. '직접 제작'이라고 쓰지 않는다)",
        "블랙라이트 체험, 나만의 별자리 열쇠고리 만들기, VR 가상체험 3가지 활동으로 구성된다",
        "참여수업(부모참여수업)이나 스페셜데이 프로그램으로 활용할 수 있고, 부모와 아이가 함께 놀이할 수 있다",
        "유치원과 어린이집 모두 진행할 수 있다. 글 전체에서 '유치원·어린이집' 두 기관을 함께 독자로 부른다 (PILOT-06)",
      ] },
    { key: "space", role: "평범한 교실이 블랙라이트 공간으로 바뀌는 과정",
      facts: [
        "교실 한 곳, 또는 유희실·강당처럼 넓은 공간에 설치한다",
        "7m 길이의 두꺼운 암막 여러 장으로 빛을 완전히 차단한다",
        "블랙라이트 조명과 더비·레이저 조명을 쓴다. 불을 끄면 블랙라이트 효과가 나타난다",
        "교실 전체 암막 구성과 조명 설치는 반장이 준비한다",
        "[사진으로 보이는 장면] 교구장이 있던 평범한 교실 벽을 검은 암막이 둘러싸고, 불을 끄면 천장과 벽에 별빛 조명이 퍼진다",
      ],
      photo: { alt: "유치원 블랙라이트 체험 교실 설치 과정", caption: "일반 교실을 암막으로 감싸 블랙라이트 공간으로 바꾸는 과정" } },
    { key: "play", role: "블랙라이트 방에서 놀이가 이어지는 순서 (아래 ①→②→③→④ 순서를 바꾸거나 합치지 않는다)",
      facts: [
        "별과 물고기 소품은 찍찍이 재질이라 벽면에 붙일 수 있다",
        "① 별놀이: 먼저 별만 바닥에 뿌리고 '자신의 별자리를 만들어 보세요' 하고 시작해, 벽면에 별자리를 만든다 (이때 물고기는 아직 꺼내지 않는다)",
        "①의 [사진으로 보이는 장면] 어두운 벽에 형광 별이 빛나며 별자리가 하나씩 생긴다 (①단계 안에서만 묘사)",
        "② 물고기놀이: 별놀이가 끝나면 그다음에 물고기를 바닥에 뿌리고, 벽에 붙이면서 바다 생물 역할놀이를 한다",
        "②의 [사진으로 보이는 장면] 벽 가득 형광 물고기·해파리·해마·불가사리가 빛난다 (②단계 안에서만 묘사)",
        "③ 형광블럭놀이: 벽면놀이가 끝나면 바닥에 형광블럭을 뿌린다. 형광블럭은 카프라 소재라 다양한 블럭놀이를 할 수 있다",
        "③의 [사진으로 보이는 장면] 바닥에 형광블럭이 흩어져 알록달록한 무늬를 만들고, 아이들이 블럭을 바닥에 이어 모양을 만들기도 한다 (③단계 안에서만 묘사)",
        "④ 정리: 놀이가 끝나면 놀이한 역순으로 정리해 처음 상태로 돌려놓고 다음 팀이 입장한다 (④에는 정리 과정만 쓰고, 빛나는 벽·블럭 무늬 같은 놀이 장면을 넣지 않는다)",
        "블랙라이트 방은 한 반 또는 두 반이 함께 놀이한다",
        "블랙라이트 방에서 반 이름을 만들어 단체사진을 찍을 수 있다 (①~④ 단계와 별개로 쓴다. 반 이름을 블럭·소품 등 무엇으로 만드는지, '이렇게 만든'처럼 앞 놀이와 연결하는 말을 쓰지 않는다)",
        "디스코 타임(원에서 음악 준비)과 형광그림 그리기(원에서 형광펜·전지 준비)는 원 선택 활동이며, 참여수업 때는 시간상 하지 않아도 된다",
      ],
      photo: { alt: "유치원 블랙라이트 체험 벽면 별자리·물고기 놀이와 형광블럭 놀이", caption: "벽면 별자리·물고기 놀이에 이어 바닥 형광블럭 놀이로 이어지는 블랙라이트 방" } },
    { key: "keyring", role: "나만의 별자리 열쇠고리 만들기 과정",
      facts: [
        "마법필름을 한 명씩 나눠 준다",
        "그림판(별자리 도안, 예: 물고기자리)에 대고 네임펜이나 유성매직으로 선을 따라 그린다",
        "뒷면을 색연필로 색칠한다",
        "전기오븐에 약 10초 구우면 필름이 휘었다가 작아진다",
        "책으로 살짝 눌러 평평하게 편 뒤 군번줄을 끼워 완성하고, 아이가 가져간다",
        "엄마·아빠도 함께 열쇠고리를 만들 수 있다",
        "[사진으로 보이는 장면] 투명 그림판 위에 별자리 도안이 놓이고, 오븐 안 은박지 위에서 색칠한 필름이 구워지며, 완성된 열쇠고리를 목에 건다",
      ],
      photo: { alt: "유치원 블랙라이트 체험 별자리 열쇠고리 만들기", caption: "별자리 도안을 따라 그리고 색칠해 오븐에 구워 완성하는 열쇠고리" } },
    { key: "vr", role: "VR 가상체험 교실",
      facts: [
        "반장이 VR 기기와 휴대폰, 충전기를 함께 준비해 원에서 따로 준비할 것이 없다",
        "VR 기기는 기본 12대이고 최대 24대까지 지원한다",
        "휴대폰에서 앱을 실행한 뒤 VR 기기에 장착해 체험한다. 개인 휴대폰을 써도 된다",
        "우주, 바다속, 공룡탐험, 롤러코스터 같은 가상체험 콘텐츠가 있다 (콘텐츠 개수는 쓰지 않는다)",
        "[사진으로 보이는 장면] VR 화면 속에 토성과 별자리, 하늘로 솟는 로켓, 이글거리는 태양 같은 우주 장면이 펼쳐진다",
      ],
      photo: { alt: "유치원 블랙라이트 체험 VR 가상체험", caption: "VR 기기를 쓰고 우주·바다속을 가상으로 체험하는 교실" } },
    { key: "operation", role: "세 체험을 잇는 운영 방식 (행사 담당자의 선택 정보)",
      facts: [
        "보통은 강당이나 큰 교실 한 곳에 전체를 설치한다",
        "참여수업 때는 교실 세 곳에 체험을 하나씩 설치하고, 반마다 다음 교실로 옮겨 가며 체험한다. 한 체험에 드는 시간은 교실 이동까지 포함해 보통 30분이다 (사장님 확인). 예: 세 반이 세 교실에서 동시에 시작해 30분마다 다음 교실로 옮기면 세 반이 세 체험을 모두 거친다",
        "교실 공간이 부족하면 축소해서 설치할 수 있다",
        "세 체험의 방식이 서로 달라 순환 운영이 가능하고, 대기를 줄일 수 있다",
      ] },
    { key: "prepare", role: "원에서 준비할 것과 반장이 준비하는 것 (짧은 목록 형태 가능)",
      facts: [
        "원 준비: 열쇠고리 선 그리기용 네임펜 또는 유성매직. 선택 활동을 할 경우 디스코 타임 음악, 형광그림용 형광펜과 전지",
        "반장 준비: 교실 암막과 블랙라이트·더비·레이저 조명, 별자리·물고기 소품과 형광블럭",
        "반장 준비: 마법필름(인원수만큼), 색연필, 전기오븐, 그림판과 고리",
        "반장 준비: VR 기기, 휴대폰, 충전기",
      ] },
    { key: "closing", role: "마무리와 문의 안내 1회",
      facts: [
        "원의 공간과 행사 형태(일반 행사, 참여수업)에 맞춰 설치 방식을 정할 수 있다",
        "서울·인천·경기의 유치원·어린이집으로 찾아간다 (출장 가능 여부를 제한하는 문장은 쓰지 않는다 — 사장님 확인 2026-10-10)",
        "상담 때 원의 참여 인원, 사용할 수 있는 교실 수와 강당 여부, 행사 날짜를 알려 달라고 안내한다",
        "행사 일정과 공간 상담은 반장에 문의하면 된다 (전화번호·가격·할인은 본문에 쓰지 않는다 — 마지막에 고정 문의 안내가 따로 붙는다)",
      ] },
  ],
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"], // [PILOT-06] 고정 CTA
  hashtags: ["#유치원블랙라이트체험", "#어린이집블랙라이트체험", "#블랙라이트체험", "#별나라우주여행", "#유치원참여수업", "#유치원행사", "#어린이집행사", "#원방문체험", "#별자리열쇠고리", "#VR가상체험", "#반장"],
};

function buildBlacklightPilotPrompt(title) {
  const secText = BLACKLIGHT_PILOT.sections.map((s, i) =>
    `${i + 1}. key="${s.key}" — 역할: ${s.role}\n` + s.facts.map(f => `   - ${f}`).join("\n")
  ).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희'로 부른다. 글을 읽는 원장님·선생님의 원은 그냥 '원'이라고 부르고(예: 원의 공간, 원에서 준비할 것), 반장을 원(유치원)처럼 쓰지 않는다.",
    "독자는 행사를 준비하는 원장님과 선생님이다. 이 프로그램을 자기 원에서 할지 판단할 수 있게 쓴다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 숫자·장비·시간·가격·수상·인원 기록을 만들지 않는다.",
    "재료에 ①②③④ 순서가 있으면 그 순서대로 설명한다. 순서를 바꾸거나 두 단계를 한 번에 한 것처럼 합치지 않는다.",
    "'[사진으로 보이는 장면]' 재료는 실제 사진에 담긴 모습이다. 이 장면을 적극적으로 살려 눈앞에 보이듯 묘사한다. 단 '사진에서는', '사진으로 보시면', '사진 속'처럼 사진을 가리키는 말은 쓰지 않고 장면 자체를 바로 묘사한다.",
    "문장마다 주어·조사·서술어가 서로 맞는지 확인한다. 재료 문장을 조각내 이어 붙이지 말고, 한 문장이 하나의 완결된 뜻을 갖게 쓴다 (예: '소품이 ~재질로 붙일 수 있습니다' 같은 주어·서술어 불일치 금지).",
    "재료에 없는 도구·재료·행동·결과를 구체적 사실처럼 덧붙이지 않는다. 재료의 괄호 지시('~는 쓰지 않는다')는 반드시 지킨다. 반장의 친절·신속·전문성 같은 성품·평판은 재료에 없으므로 쓰지 않는다.",
    "'[사진으로 보이는 장면]'은 앞에 표시된 단계(①②③) 안에서만 묘사한다. 다른 단계로 옮기거나 한데 모아 쓰지 않는다.",
    "원의 교실이나 공간을 반장 것처럼 '우리 교실', '우리 공간'이라고 쓰지 않는다.",
    "아이의 이름을 쓰지 않는다. 특정 아이가 한 말이나 행동을 실제로 있었던 일처럼 쓰지 않는다.",
    "아이들의 반응은 '~하는 경우가 많습니다', '~하게 됩니다'처럼 일반적인 모습으로 묘사할 수 있다.",
    "'상상력을 자극하는 체험', '특별한 하루', '눈길을 끄는 형광빛' 같은 자연스러운 감성·홍보 표현은 써도 된다. 다만 '유대감이 강화된다', '학습 효과가 있다'처럼 구체적인 효과·성과를 보장하는 문장은 '~하는 시간이 됩니다'처럼 경험으로 표현한다.",
    "반장이 직접 기획·구성한 프로그램이라는 점이 글 전체에서 자연스럽게 드러나게 한다.",
    "각 섹션은 앞 섹션 내용을 이어받아 자연스럽게 연결한다. 한 섹션에서 말한 내용을 다른 섹션에서 다시 설명하지 않는다.",
    "다른 업종(병원 시술, 미용, 음식점 등)이나 다른 프로그램 이야기는 쓰지 않는다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다(번호·'섹션' 같은 말 금지). body 는 문단 사이를 빈 줄로 나눈다.",
    "글 전체 본문은 공백 포함 약 2,000~2,600자를 목표로 하되, 같은 뜻을 반복해서 늘리지 않는다.",
  ].join("\n");
  const user = `제목: ${title}\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 단어 자체를 금지하지 않고, 실제 노출 여부를 문장 단위로 수집해 사람이 판정한다.
function auditBlacklightPilot(text, playBody = "") {
  const sentences = text.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  // 이름 의심: 「두 글자+이가/이는…」 중 「놀이·아이·사이」처럼 일반 명사로 끝나는 경우는 제외
  const NAME_RE = /(^|[\s"“])([가-힣]{2})(이는|이가|이도|이의|이랑|이와)\s/;
  const NOUN_END = /(놀이|아이|사이|차이|높이|길이|넓이)$/;
  // 순서(참고용): 놀이 섹션 본문에서 별 → 물고기 → 형광블럭이 처음 나오는 위치. FAIL 판정은 사람이 한다.
  const pos = (re) => { const m = playBody.search(re); return m < 0 ? null : m; };
  const order = { star: pos(/별/), fish: pos(/물고기/), block: pos(/형광\s?블[럭록]/) };
  order.ascending = order.star != null && order.fish != null && order.block != null && order.star < order.fish && order.fish < order.block;
  const COMMON_NAMES = /(민준|서준|도윤|예준|시우|하준|지호|지훈|지우|서연|하은|수진|민수|현수|서윤|지아|하윤|윤서|채원|유나)/;
  const numbers = (text.match(/\d+(\.\d+)?\s*(m|미터|대|세트|개|반|교실|분|초|가지|명|장|종|시간|원)/g) || []);
  const ALLOWED_NUM = /^(7\s*m|7\s*미터|12\s*대|24\s*대|3\s*가지|3\s*개|3\s*교실|30\s*분|10\s*초|1\s*반|2\s*반)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  return {
    foreignIndustry: pick(/(성형|피부과|시술|리프팅|레이저토닝|임플란트|한의원|쌍꺼풀)/),
    quotes: text.match(/["“”][^"“”\n]{1,40}["“”]/g) || [],
    names: sentences.filter(s => { const m = s.match(NAME_RE); return m && !NOUN_END.test(m[2] + "이"); }).concat(pick(COMMON_NAMES)),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    playOrderReference: order,
    leaks: pick(/(key=|섹션|재료|JSON|heading|body|프롬프트|🚨|지시문|사진에서|사진으로 보|사진 속)/), // [PILOT-06] 사진 메타 서술 감지
    truncation: pick(/(\s다\.|[가-힣](며|고|서)\s+다[.\s]|^적이다)/),
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    repeats,
    addressBlock: /찾아오시는 길/.test(text),
    charCount: text.length,
  };
}

async function generateBlacklightPilot({ region }) {
  const r = (region || "").trim();
  const day = Math.floor(Date.now() / 86400000);
  // [PILOT-06] 하루 고정 제목 → 생성마다 무작위(같은 날 반복 생성 시 같은 제목 반복 방지). day 는 미사용.
  void day;
  const baseTitle = BLACKLIGHT_PILOT.titles[Math.floor(Math.random() * BLACKLIGHT_PILOT.titles.length)];
  const title = r ? BLACKLIGHT_PILOT.regionTitle(r, baseTitle) : baseTitle; // [BLACKLIGHT-PRODUCTION-FIX-01] 지역 제목도 어린이집 Core·다중
  const { system, user } = buildBlacklightPilotPrompt(title);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const keys = BLACKLIGHT_PILOT.sections.map(s => s.key);
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (keys.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("블랙라이트 Pilot 생성 실패");

  const parts = [];
  for (const def of BLACKLIGHT_PILOT.sections) {
    const s = parsed.find(x => x.key === def.key);
    parts.push(`${String(s.heading || "").trim()}\n\n${String(s.body).trim()}`);
    if (def.photo) parts.push(`[이미지: ${def.photo.alt} | ${def.photo.caption}]`);
  }
  parts.push(BLACKLIGHT_PILOT.cta.join("\n")); // [PILOT-06] 고정 CTA
  const tags = (r ? [`#${r.replace(/\s/g, "")}어린이집행사`] : []).concat(BLACKLIGHT_PILOT.hashtags).slice(0, 12); // [BLACKLIGHT-PRODUCTION-FIX-01] 지역 태그도 어린이집 Core
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim(); // 기존 경로와 같은 「# 제목」 첫 줄 형식

  const images = BLACKLIGHT_PILOT.sections.filter(d => d.photo).map(d => ({ alt: d.photo.alt, caption: d.photo.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-BLACKLIGHT-PRODUCTION-FIX-01",
    pilotQC: auditBlacklightPilot(body, String((parsed.find(x => x.key === "play") || {}).body || "")),
    validation: { passed: charCount >= 1500, charCount },
  };
}

// ============================================================
// [KINDERGARTEN-MILITARY-ENGINE-PILOT-01] 병영체험 전용 Pilot
//   대상: program.id === "military" 단일 생성만. 블랙라이트 Pilot·다른 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 사장님 확인값(2026-10-10) > 홈페이지(pid=374) > 활동지-병영체험.pptx. data·playConfig 는 보존·미변경.
//   다양성: 생성마다 관점(angle) 1개를 골라 제목·도입·섹션 순서·강조점을 바꾼다. FACT 재료는 고정.
//   전화번호·출장지역은 GPT 가 쓰지 않고 마지막에 고정 문구로 붙인다.
// ============================================================
const MILITARY_PILOT = {
  angles: [
    { id: "program", focus: "반장 병영체험의 3코스 구성과 유격 6종을 원장님이 한눈에 비교할 수 있게 소개하는 데 힘을 준다",
      titles: ["어린이집 병영체험｜유치원까지 찾아가는 군복·유격·사격 3코스와 부모참여수업",
               "어린이집 병영체험 프로그램 구성｜유치원·어린이집 입소식부터 사격·유격까지"],
      order: ["intro", "courses", "ceremony", "shooting", "guerrilla", "uniform", "special", "parent", "closing"] },
    { id: "parent", focus: "아빠·엄마 참여수업으로 병영체험을 열 때 정식 입소식과 원의 준비가 어떻게 이어지는지에 힘을 준다",
      titles: ["어린이집 병영체험 부모참여수업｜유치원·어린이집 정식 입소식부터 유격코스까지",
               "어린이집 병영체험, 아빠참여수업으로 진행하는 방법｜유치원까지 방문 운영"],
      order: ["intro", "courses", "ceremony", "parent", "shooting", "guerrilla", "uniform", "special", "closing"] },
    { id: "promo", focus: "군복 등원과 동네 행군처럼 원 밖까지 이어지는 반장 병영체험만의 운영 방식에 힘을 준다",
      titles: ["어린이집 병영체험｜군복 입고 등원하는 날, 유치원·어린이집 행사 운영 방법",
               "어린이집 병영체험 군복 등원부터 3코스까지｜유치원·어린이집 방문 체험"],
      order: ["intro", "courses", "special", "ceremony", "shooting", "guerrilla", "uniform", "parent", "closing"] },
    { id: "space", focus: "원의 강당·교실 여건에 맞춰 3코스를 어떻게 설치하고 반별로 돌리는지에 힘을 준다",
      titles: ["어린이집 병영체험 준비｜강당 한 곳 또는 교실별로, 유치원·어린이집 3코스 운영",
               "어린이집 병영체험, 우리 원 공간에 맞춘 설치 방법｜유치원까지 찾아가는 3코스"],
      order: ["intro", "courses", "ceremony", "shooting", "guerrilla", "uniform", "special", "parent", "closing"] },
  ],
  sections: {
    intro: { len: "2문단 · 4~6문장", role: "행사를 고민하는 유치원·어린이집 원장님·선생님에게 질문으로 시작 → 반장 병영체험이 무엇인지 소개",
      facts: [
        "도입은 고민을 모든 원의 사실처럼 단정하지 않고 질문으로 연다 (예시 문장을 그대로 베끼지 말고 새로 쓴다)",
        "반장-노리야놀자는 유치원·어린이집으로 찾아가는 원방문 체험 프로그램을 직접 기획하고 운영하는 업체다 (경력 연수·설립연도는 쓰지 않는다)",
        "병영체험은 아이들이 군복과 베레모를 입고 입소·제식훈련, 사격교실, 유격코스 3코스를 체험하는 반장 자체 기획 프로그램이다",
        "유치원과 어린이집 모두 진행할 수 있다. 글 전체에서 '유치원·어린이집' 두 기관을 함께 독자로 부른다",
        "부모참여수업이나 호국보훈의 달·국군의 날 같은 원 행사로 활용할 수 있다",
      ],
      photo: { alt: "어린이집 병영체험 군복 입은 아이들 단체사진", caption: "군복과 베레모를 입은 아이들 단체사진 (대표사진)" } },
    courses: { len: "3코스 짧은 목록 + 2문단 · 4~6문장", role: "기본 3코스와 원 공간에 맞춘 설치 방식",
      facts: [
        "기본 3코스: ① 입소·제식훈련(군복 지급, 입소식, 경례·줄 맞춰 걷기) ② 사격교실(소총·박격포·수류탄) ③ 유격코스(징검다리·터널·목봉/외나무다리·보트이동·포복·균형잡기)",
        "원 공간에 맞춰 배치한다: 큰 강당이 있으면 한곳에 모두 설치하고, 강당이 없으면 교실별로 나누어 설치한다",
        "교실 공간이 부족하면 코스를 축소해 설치할 수 있다",
        "행사 전날 오후에 설치를 마치고, 당일에는 반별로 코스를 돌며 놀이한다",
        "놀이에 쓴 용품 정리는 반장이 한다",
      ] },
    ceremony: { len: "2~3문단 · 6~8문장", role: "① 입소·제식훈련 코스",
      facts: [
        "아이들은 군복과 베레모를 받아 입고 입소식에 참여한다",
        "경례 연습, 줄 맞추어 걷기 같은 제식훈련을 한다",
        "놀이 시작과 중간에 호루라기 신호에 맞춘 PT체조를 넣어 집중을 다시 모은다. 활동지의 진행 멘트: '잘 할 수 있겠습니까?', '목소리가 작습니다', '안 하는 사람이 있습니다' (진행자 멘트로만 쓰고, 특정 아이의 대답이나 반응으로 꾸미지 않는다)",
        "PT체조와 군가를 행사 전에 교실에서 미리 연습해 두면 당일에는 호루라기만으로 진행이 수월하다",
        "선생님용 조교복 5벌을 함께 제공한다. 조교 역할을 맡을 선생님을 미리 정해 두면 진행이 수월하다",
      ],
      photo: { alt: "어린이집 병영체험 입소식 제식훈련", caption: "입소식과 경례·제식훈련 장면" } },
    shooting: { len: "2문단 · 5~7문장 (소총·박격포·수류탄을 각각 설명)", role: "② 사격교실 코스",
      facts: [
        "소총 사격: 소프트 총과 총알로 과녁을 맞힌다",
        "박격포 사격: 소프트 박격포로 목표물을 맞힌다",
        "수류탄 투척: 모형 수류탄의 사용법을 배우고 목표를 향해 던진다",
        "사격 놀이 전에 사람을 향해 쏘지 않는 등 위험한 행동을 하지 않도록 아이들에게 미리 알려 주기를 원에 부탁한다 (반장이 안전을 보장한다고 쓰지 않는다)",
        "사격 사이사이에도 PT체조를 넣어 흐름을 정리한다",
      ],
      photo: { alt: "어린이집 병영체험 사격교실 소총 박격포 수류탄", caption: "소총·박격포·수류탄 중 한 장면" } },
    guerrilla: { len: "6종을 하나씩 짧게 소개(목록 가능) + 에어 조형물 옵션 1문단", role: "③ 유격코스 6종 (6가지를 모두 소개하고, 없는 장애물을 더하지 않는다)",
      facts: [
        "징검다리: 징검다리를 밟고 건너며 균형 감각을 익힌다",
        "터널: 터널을 기어서 통과한다",
        "목봉/외나무다리: 반 친구들이 함께 목봉을 들고, 외나무다리를 통과한다",
        "보트이동: 여럿이 보트를 머리 위로 들고 함께 이동한다",
        "포복: 그물 장애물 아래를 포복으로 통과한다",
        "균형잡기: 균형판 위에서 몸의 중심을 잡는다 (균형판 개수는 쓰지 않는다)",
        "행사 일정에 따라 유격장에 에어 조형물을 추가로 설치할 수 있다. 기본 구성이 아닌 추가 옵션이며 상담 때 정한다 (에어 조형물의 종류·크기는 쓰지 않는다)",
      ],
      photo: { alt: "어린이집 병영체험 유격코스", caption: "징검다리·터널·목봉·보트·포복·균형잡기 중 한 장면" } },
    uniform: { len: "계절별 짧은 목록 + 2문단 · 4~6문장", role: "계절별 군복 구성과 수량·연령 안내",
      facts: [
        "동절기: 군복 상의·하의 + 베레모",
        "하절기: 원복 흰 티셔츠 + 군복 바지 + 베레모 (더운 날에는 군복 상의 대신 원복 티셔츠를 입는다)",
        "아동 군복은 행사 요청 시 약 65벌을 기본으로 준비하고, 원아 수가 더 많으면 미리 상의한다 (사이즈별 수량은 쓰지 않는다)",
        "3~4세 반은 가장 작은 100호 군복을 원에서 자율로 배정하고, 군복을 입고 사진 촬영을 하는 방식으로도 참여할 수 있다. 연령별 참여 범위는 원 상황에 맞춰 상담한다 (특정 연령이 훈련에 참여한다·못 한다고 단정하지 않는다)",
      ] },
    special: { len: "군복 등원 2문단 + 동네 행군 1~2문단 · 8~11문장 (군복 등원·동네 행군을 굵은 소항목으로 나눠도 된다)", role: "반장 병영체험만의 선택 운영: 군복 등원과 동네 행군",
      facts: [
        "반장의 방문 프로그램은 보통 전날 설치하고 당일 원 안에서 놀이한다. 병영체험은 원 밖까지 이어지는 운영을 선택할 수 있다",
        "[필수] 군복 등원: 행사 전전날이나 전날 하원할 때 원아 수만큼 군복을 미리 나누어 준다 → 행사 당일 아이들이 군복을 입고 등원 → 하루 동안 군복을 입고 생활 → 행사가 끝나면 평상복으로 갈아입고 귀가",
        "[필수] 군복 등원 날 아침의 역할(주체를 바꾸지 않는다): 군복을 입는 사람 = 원아들 / 조교복을 입는 사람 = 차량 선생님 / 경례하며 아이들을 맞이해 차량에 태우는 사람 = 차량 선생님 / 그 모습을 보는 사람 = 통학버스 정류장에서 함께 아이를 기다리는 여러 기관 부모님들. 주변 부모님들의 시선이 모이고, 동네 부모님들은 서로 아는 사이가 많아 입소문으로 이어질 수 있다 (가능성으로만 쓰고 '화제가 된다', '홍보 효과 보장'처럼 결과를 단정하지 않는다)",
        "[필수] 군복 등원은 원아 수만큼 미리 지급하므로 수량에 따라 견적이 달라지며, 반장과 따로 상담한다 (금액·'약간의 추가비용' 같은 비용 표현은 쓰지 않는다)",
        "동네 행군: 원 여건에 따라 군복 입은 반 아이들이 원 주변 사람이 많이 다니는 길을 행군할 수 있다. 간단한 군가를 부르고 지나가는 분들께 '충성!' 하고 경례하면 웃음이 나고, 어느 교육기관인지 물어보는 분들이 생긴다",
        "동네 행군은 원에서 코스와 진행을 정하는 자율 활동이다 (반장이 행군을 진행·인솔한다고 쓰지 않는다. 행군 거리·시간·코스는 쓰지 않는다)",
      ],
      photo: { alt: "어린이집 병영체험 군복 등원 동네 행군", caption: "(선택) 군복 등원 또는 동네 행군 장면 — 실제 사진이 있을 때만" } },
    parent: { len: "1문단 + 식순 7줄 목록 + 1문단 + 원 준비물 짧은 목록 + 마무리 1문장", role: "부모참여수업으로 진행할 때와 원에서 준비할 것",
      facts: [
        "부모 참여수업 때는 정식 입소식을 할 수 있고, 식순과 음원은 반장이 준비한다. 입소식 참고 동영상이 필요하면 보내 준다",
        "[필수] 입소식 식순은 7줄 목록으로 모두 쓴다(순서·이름을 바꾸거나 줄이지 않는다): 1. 대대장님(원장님) 입장 2. 국기에 대한 맹세 3. 애국가 제창 4. 순국선열에 대한 묵념(생략 가능) 5. 입소자 대표 부모님 말씀(생략 가능) 6. 대대장님(원장님) 말씀 7. 반별 지정 위치로 이동",
        "부모님용 군복은 지급하지 않는다. 참여수업 때는 부모님께 집에 있는 군복을 입고 오시도록 안내하면 좋다",
        "[필수] 원에서 미리 준비하면 좋은 것(짧은 목록, 계급장 진급 순서 포함): PT체조와 군가 연습 / 명찰과 계급장(패턴 제공 — 코스를 통과할 때마다 이등병 → 일병 → 상병 → 병장으로 바꿔 달아 준다) / 행사 후 군복을 사이즈별로, 상의·하의를 나누어 정리",
        "마지막은 포토존 앞 반별 단체사진으로 마무리할 수 있다",
      ] },
    closing: { len: "2문단 · 4~5문장", role: "마무리와 상담 안내 1회",
      facts: [
        "같은 병영체험이라도 원의 공간, 원아 수, 연령, 부모참여 여부에 따라 구성이 달라진다",
        "강당 통합/교실별 배치, 군복 등원, 에어 조형물 옵션까지 원의 행사 목적에 맞춰 상담으로 정한다",
        "상담 때 원아 수, 연령, 사용할 수 있는 강당·교실, 행사 날짜, 부모참여 여부를 알려 달라고 안내한다",
      ] },
  },
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"],
  hashtags: ["#어린이집병영체험", "#유치원병영체험", "#병영체험", "#어린이집행사", "#유치원행사", "#부모참여수업", "#아빠참여수업", "#원방문체험", "#찾아가는체험", "#병영놀이", "#유격체험", "#반장노리야놀자"],
};

function buildMilitaryPilotPrompt(title, angle) {
  const secText = angle.order.map((k, i) => {
    const s = MILITARY_PILOT.sections[k];
    return `${i + 1}. key="${k}" — 역할: ${s.role} / 분량: ${s.len}\n` + s.facts.map(f => `   - ${f}`).join("\n");
  }).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장-노리야놀자'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희 반장'으로 부르고, 반장이 주어일 때는 '반장은', '반장이', '저희 반장은'처럼 쓴다. 반장을 유치원·어린이집처럼 쓰지 않고, '저희 원', '우리 원'이라고 쓰지 않는다. 독자의 원은 그냥 '원' 또는 '해당 기관'이라고 부른다(예: 원의 공간, 원에서 준비할 것). 원의 아이들은 '아이들' 또는 '원아들'이라고 부르고, 화자는 원이나 학부모가 아니므로 원의 아이들을 자기 아이처럼 부르지 않는다.",
    "독자는 병영체험 행사를 준비하는 유치원·어린이집 원장님과 선생님이다. 자기 원에서 이 프로그램을 할지, 반장에게 맡길지 판단할 수 있게 쓴다.",
    "이 글은 행사 후기가 아니라 프로그램 소개·선택 안내 글이다. 특정 날짜·특정 원에서 있었던 일처럼 쓰지 않는다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 숫자·장비·시간·거리·가격·수상·경력·인원 기록을 만들지 않는다.",
    "재료의 조건과 강도를 바꾸지 않는다: '옵션'은 기본처럼, '원 자율 활동'은 반장이 진행하는 것처럼, '상담'은 확정처럼 쓰지 않는다.",
    "아이 이름을 쓰지 않는다. 특정 아이가 한 말이나 행동을 실제 있었던 일처럼 쓰지 않는다. 따옴표 대사는 재료에 있는 진행 멘트와 '충성!'만 쓴다.",
    "아이들 모습은 '~하게 됩니다', '~할 수 있습니다'처럼 프로그램 설명으로 쓴다. '모두 좋아한다', '몰입이 훨씬 커진다'처럼 결과를 단정하지 않는다.",
    "자연스러운 홍보 표현('원 밖까지 이어지는 행사', '군복을 입는 순간부터 시작되는 체험')은 써도 된다. 효과·성과를 보장하는 문장은 쓰지 않는다. 근거 없는 최상급·순위·우월 표현(다른 업체보다 낫다는 말, 최상급 형용사)도 쓰지 않는다.",
    "반장이 직접 기획하고 운영하는 프로그램이라는 점과, 군복·3코스·선택 운영을 조합해 원마다 행사를 구성한다는 점이 자연스럽게 드러나게 한다.",
    "섹션마다 앞 섹션을 이어받아 연결한다. 한 섹션에서 설명한 내용을 다른 섹션에서 다시 설명하지 않는다. 같은 문장을 두 번 쓰지 않는다.",
    "다른 업체·다른 업종·다른 프로그램(에어바운스 대여, 병원, 미용 등) 이야기는 쓰지 않는다. '밀림'이라는 말은 쓰지 않는다.",
    "본문에 전화번호·출장지역·가격·할인을 쓰지 않고, '연락처는 별도로 안내됩니다' 같은 안내 문장도 쓰지 않는다. '다양한 연령에 맞춰져 있다'처럼 재료에 없는 대상·효과를 덧붙이지 않는다.",
    "굵게(**) 같은 마크다운 기호를 쓰지 않는다. 소항목이 필요하면 짧은 한 줄 제목으로 쓴다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다('섹션' 같은 말 금지, 코스 번호 ①②③은 써도 된다). body 는 문단 사이를 빈 줄로 나눈다. 목록이 자연스러운 곳(3코스, 계절별 군복, 식순, 원 준비물)은 짧은 목록을 써도 된다.",
    "소제목과 문장 표현은 매번 새로 쓴다. 재료 문장을 그대로 옮겨 적지 말고 자연스럽게 풀어 쓴다(식순 항목 이름과 진행 멘트는 그대로 둔다).",
    "[필수] 표시 재료는 하나도 빠뜨리거나 뭉뚱그리지 않는다('다양한 순서로 구성됩니다'처럼 요약해 넘기지 않는다).",
    "섹션마다 적힌 분량을 지킨다. 글 전체 본문은 공백 포함 약 2,500~3,200자다. 같은 뜻을 반복해서 늘리지 않는다.",
    "번역투·딱딱한 표현('반장 측', '삽입하여', '~하는 경우가 많습니다', '~를 배우게 됩니다')은 쓰지 않는다. 업체 사장님이 직접 소개하듯 자연스럽게 쓴다.",
  ].join("\n");
  const user = `제목: ${title}\n이번 글의 관점: ${angle.focus}\n(관점에 맞는 섹션은 조금 더 자세히, 나머지는 핵심만 쓴다. 단 모든 섹션의 재료는 빠뜨리지 않는다.)\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 금지 FACT·노출·누락을 문장 단위로 수집해 사람이 판정한다(차단하지 않음).
function auditMilitaryPilot(text) {
  const sentences = text.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  const numbers = (text.match(/\d+(\.\d+)?\s*(m|미터|벌|대|세트|개|정|문|발|종|반|교실|코스|분|초|가지|명|장|시간|원|년|호|세|단계|km)/g) || []);
  const ALLOWED_NUM = /^(65\s*벌|5\s*벌|3\s*코스|3\s*개|3\s*가지|6\s*종|6\s*가지|7\s*단계|100\s*호|3\s*세|4\s*세|1\s*개)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  const ALLOWED_QUOTE = /(잘\s?할\s?수\s?있겠습니까|목소리가\s?작습니다|안\s?하는\s?사람이\s?있습니다|충성)/;
  return {
    wrongFacts: pick(/(밀림|30\s*벌|20\s*정|장애물\s*코스\s*5|5\s*종|단체\s*훈련장|빨간\s*모자|에어\s*바운스|전국|소독|무료|할인|만\s*원|\d+\s*원\b|경력|\d+\s*년\s*(동안|간|째|경력)|설립)/),
    unsureClaims: pick(/(보장|확실히|반드시\s*(좋|효과)|모두\s*좋아|무척\s*좋아|훨씬|최고|압도|화제|대박|1위)/),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    quotesOutside: (text.match(/["“'‘][^"“”'‘’\n]{1,40}["”'’]/g) || []).filter(q => !ALLOWED_QUOTE.test(q)),
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    leaks: pick(/(key=|섹션|재료|JSON|heading|body|프롬프트|지시문|관점:)/),
    foreignIndustry: pick(/(성형|피부과|시술|임플란트|한의원|음식점)/),
    guerrillaMissing: ["징검다리", "터널", "목봉", "보트", "포복", "균형"].filter(w => !text.includes(w)),
    hasKindergarten: /유치원/.test(text), hasDaycare: /어린이집/.test(text),
    repeats,
    charCount: text.length,
  };
}

async function generateMilitaryPilot({ region }) {
  const r = (region || "").trim();
  const angle = MILITARY_PILOT.angles[Math.floor(Math.random() * MILITARY_PILOT.angles.length)];
  const baseTitle = angle.titles[Math.floor(Math.random() * angle.titles.length)];
  const title = r ? `${r} ${baseTitle}` : baseTitle;
  const { system, user } = buildMilitaryPilotPrompt(title, angle);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (angle.order.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("병영체험 Pilot 생성 실패");

  const parts = [];
  for (const k of angle.order) {
    const def = MILITARY_PILOT.sections[k];
    const s = parsed.find(x => x.key === k);
    const photo = def.photo ? `[이미지: ${def.photo.alt} | ${def.photo.caption}]\n\n` : "";
    const head = k === "intro" ? "" : `${String(s.heading || "").replace(/\*\*/g, "").trim()}\n\n`;
    let secBody = String(s.body).replace(/\*\*/g, "").trim(); // 마크다운 굵게 기호 제거(블로그 붙여넣기 시 그대로 노출)
    // [MILITARY-PRODUCTION-FIX-01] 근거 없는 최상급·순위 표현 문장 제거(병영 경로 한정 · 마무리 인사류에서 발생)
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).filter(s => !/(최고|최상|최적|1위|압도적|으뜸)/.test(s)).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // Hard FACT 고정(SOP §29.2): 군복 등원 견적 상담 문장은 GPT 가 자주 누락 → 없으면 고정 문장 1줄 보강
    if (k === "special" && !/견적/.test(secBody)) secBody += "\n\n군복 등원은 원아 수만큼 군복을 미리 지급하므로 수량에 따라 견적이 달라집니다. 반장과 따로 상담해 주세요.";
    // [MILITARY-FINAL-FIX-02] 군복 등원 보완을 역할 / 부모님 시선 두 부분으로 나눈다 — 동네 행군 소항목 앞에 넣는다
    //   역할(원아=군복 · 차량 선생님=조교복·경례·탑승)은 모든 관점에서 필수 → 차량 선생님 문장이 없을 때만 1회 보강
    //   부모님 시선은 선택 홍보 요소 → 군복 등원 홍보 관점(promo)에서만, 정류장·시선·입소문이 모두 없을 때만 1회 보강
    if (k === "special") {
      const add = [];
      if (!/차량 선생님/.test(secBody)) add.push("군복 등원 날 아침에는 조교복을 입은 차량 선생님이 경례하며 군복 입은 원아들을 맞이해 차량에 태웁니다.");
      if (angle.id === "promo" && !/(정류장|시선|입소문)/.test(secBody)) add.push("통학버스 정류장에서 함께 아이를 기다리던 다른 기관 부모님들도 이 모습을 보게 되고, 동네 부모님들 사이에서 입소문으로 이어질 수 있습니다.");
      if (add.length) {
        const scene = add.join(" ");
        secBody = /\n\n동네 행군/.test(secBody) ? secBody.replace(/\n\n동네 행군/, `\n\n${scene}\n\n동네 행군`) : `${secBody}\n\n${scene}`;
      }
    }
    secBody = secBody.replace(/반장에서(\s*)(준비|제공)/g, "반장이$1$2"); // [MILITARY-FINAL-FIX-02] 「반장에서 준비」 → 「반장이 준비」 국소 보정
    parts.push(`${head}${photo}${secBody}`);
  }
  parts.push(MILITARY_PILOT.cta.join("\n"));
  // [MILITARY-PRODUCTION-FIX-01] 지역 태그를 앞에 붙이면 12개 제한으로 끝의 #반장노리야놀자가 잘렸다 → 지역 입력 시 우선순위가 낮은 #찾아가는체험(#원방문체험과 중복 의미)을 빼서 개수 유지
  const tags = r ? [`#${r.replace(/\s/g, "")}어린이집행사`].concat(MILITARY_PILOT.hashtags.filter(h => h !== "#찾아가는체험")).slice(0, 12) : MILITARY_PILOT.hashtags.slice(0, 12);
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim();

  const images = angle.order.map(k => MILITARY_PILOT.sections[k].photo).filter(Boolean).map(p => ({ alt: p.alt, caption: p.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-MILITARY-PRODUCTION-FIX-01",
    pilotAngle: angle.id,
    pilotQC: auditMilitaryPilot(body),
    validation: { passed: charCount >= 1500, charCount },
  };
}

// ============================================================
// [KINDERGARTEN-MARKET-PILOT-01] 시장놀이 전용 Pilot
//   대상: program.id === "market" 단일 생성만. 블랙라이트·병영 Pilot·다른 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 사장님 확인값(2026-10-10) > 활동지-시장놀이.pptx(2025-05) > 홈페이지. data·playConfig 는 보존·미변경.
//   Search Question: 「어린이집·유치원 시장놀이, 원에서 무엇을 준비하고 무엇을 맡길 수 있을까?」 — 모든 관점의 제목·본문이 같은 질문에 답한다.
//   다양성: 생성마다 관점(angle) 1개를 골라 제목·섹션 순서·강조점을 바꾼다. FACT 재료는 고정.
//   전화번호·출장지역은 GPT 가 쓰지 않고 마지막에 고정 문구로 붙인다.
// ============================================================
const MARKET_PILOT = {
  angles: [
    { id: "prep", focus: "원에서 준비할 것과 반장이 가져오는 것을 또렷하게 나눠, 준비 부담을 줄이는 방법에 힘을 준다",
      titles: ["어린이집 시장놀이 준비｜원에서 챙길 것 4가지와 반장이 가져오는 것, 유치원도 함께",
               "어린이집 시장놀이｜유치원·어린이집 원 준비물과 반장 제공 물품 한 번에 정리"],
      opener: "시장놀이를 준비할 때 무엇을 만들고, 무엇을 보내고, 무엇을 구해야 할지 하는 준비 고민을 질문으로 꺼내며 시작한다",
      order: ["intro", "provide", "prepare", "shops", "play", "food", "operation", "closing"] },
    { id: "shops", focus: "과일·채소·생선·빵·서점(문구)·분식 6개 상점이 교실과 강당에 어떻게 들어서는지, 시장 거리 구성에 힘을 준다",
      titles: ["어린이집 시장놀이｜6개 상점이 원으로 찾아가는 유치원·어린이집 장보기 행사",
               "어린이집 시장놀이 상점 구성｜과일·채소·생선·빵·서점·분식, 유치원까지 방문"],
      opener: "과일·채소·생선·빵·서점·분식 가게가 줄지어 선 시장 거리가 교실과 강당에 펼쳐지는 모습으로 시작한다",
      order: ["intro", "shops", "provide", "play", "food", "prepare", "operation", "closing"] },
    { id: "food", focus: "장바구니와 화폐로 장을 보고 와플·솜사탕까지 이어지는 행사 하루의 흐름에 힘을 준다",
      titles: ["어린이집 시장놀이｜와플·솜사탕까지 이어지는 유치원·어린이집 장보기 행사",
               "어린이집 시장놀이 먹거리｜와플·솜사탕 기계와 재료까지 챙기는 유치원·어린이집 행사"],
      opener: "와플 기계와 솜사탕 기계가 놓인 먹거리 가게와, 장바구니를 들고 가게를 도는 장보기로 시작한다",
      order: ["intro", "play", "food", "shops", "provide", "prepare", "operation", "closing"] },
    { id: "operation", focus: "전날 설치와 선생님 안내, 당일 반별로 돌아가는 운영 방식과 원 공간에 맞춘 배치에 힘을 준다",
      titles: ["어린이집 시장놀이 운영 방법｜전날 설치하고 반별로 장보는 유치원·어린이집 행사",
               "어린이집 시장놀이, 원 공간에 맞춘 설치｜유치원·어린이집 교실·강당 구성과 준비물"],
      opener: "행사 전날 오후 반장이 시장을 설치하고, 다음 날 원에 시장이 열려 반별로 장을 보러 가는 흐름으로 시작한다",
      order: ["intro", "operation", "shops", "provide", "prepare", "play", "food", "closing"] },
  ],
  sections: {
    intro: { len: "2문단 · 4~6문장", role: "이번 관점의 시작점에서 열고 → 반장 시장놀이가 무엇인지 소개",
      facts: [
        "__OPENER__ (원의 고민을 모든 원의 사실처럼 단정하지 않는다. 예시 문장을 그대로 베끼지 말고 새로 쓴다)",
        "반장-노리야놀자는 유치원·어린이집으로 찾아가는 원방문 체험 프로그램을 직접 기획하고 운영하는 업체다 (경력 연수·설립연도는 쓰지 않는다)",
        "반장 시장놀이는 원 안에 6개 상점이 늘어선 시장 거리를 꾸미고, 아이들이 장바구니와 놀이 화폐로 장을 보는 방문 프로그램이다",
        "유치원과 어린이집 모두 진행할 수 있다. 글 전체에서 '유치원·어린이집' 두 기관을 함께 독자로 부르고, 어느 한쪽을 덧붙이듯 쓰지 않는다",
        "원 행사나 참여수업으로 활용할 수 있다",
      ],
      photo: { alt: "어린이집 시장놀이 상점이 늘어선 시장 거리 전경", caption: "교실·강당이 시장 거리로 바뀐 설치 전경 (대표사진)" } },
    shops: { len: "6개 상점 짧은 목록 또는 교실별 목록 + 2문단 · 4~6문장", role: "6개 상점과 교실·강당 배치",
      facts: [
        "[필수] 상점은 과일가게·채소가게·생선가게·빵가게·서점·분식점 6곳이다 (상점 수를 4개·네 코너처럼 바꾸지 않는다)",
        "기본 배치는 교실 4곳: 교실1 생선가게+빵가게 / 교실2 분식점+채소가게 / 교실3 과일가게+서점 / 교실4 포토존(판매할 물건이 있으면 아나바다 장터로 활용)",
        "강당이 있는 원은 교실 4곳 대신 강당 한 곳에 상점을 삼면이나 사면으로 둘러 시장 거리를 만들 수도 있다 (교실이 부족해서 강당을 쓰는 것이 아니라, 원 여건에 맞춰 교실 배치와 강당 배치 중에서 고른다)",
        "교실이든 강당이든 공간이 부족하면 상점 배치를 줄여서 설치한다",
        "배경막은 8m 길이 한 장에 상점 두 곳이 이어져 그려져 있어, 세우면 바로 가게 두 곳의 앞 풍경이 된다 (상점마다 8m 배경막이 하나씩 있는 것이 아니다. 배경막은 나누어 쓸 수 없다)",
        "가게에 진열하는 생선·빵·채소·과일 등은 음식 모형이다(판매·시식용이 아니다)",
        "서점은 문구점으로 넓혀 서점·문구·완구 가게처럼 꾸며 놀이할 수도 있다",
        "교구장이나 원의 책상을 따로 옮기지 않아도 설치할 수 있다",
        "설치된 모습은 생생하게 그려도 된다: 가게 그림 배경막 앞에 차양을 단 진열대가 서고, 그 위에 생선·빵·채소·과일 모형이 놓여 교실이 시장 거리로 바뀐다 (공간·가게 모습만 그리고, 아이들의 목소리·표정·반응은 쓰지 않는다)",
      ],
      photo: { alt: "유치원 시장놀이 가게 진열 모형", caption: "가게마다 진열된 생선·빵·채소·과일 모형" } },
    provide: { len: "강조 1~2문장 + 짧은 목록 + 1~2문단 · 4~6문장", role: "반장이 가져오는 것 (반장 시장놀이만의 준비를 앞에서 강조)",
      facts: [
        "[필수] 섹션 첫머리에서 목록보다 먼저, 반장이 와플·솜사탕 기계와 재료까지, 새 놀이 화폐 약 500장과 장바구니·돈통까지 챙겨 가고 화폐는 행사 뒤 원에 남는다는 점을 한두 문장으로 강조한다",
        "[필수] 시장 배경막과 가게 진열 모형",
        "[필수] 장바구니 45개",
        "[필수] 돈통 6개 (상점마다 1개)",
        "[필수] 놀이 화폐: 1,000원권 400장, 5,000원권·10,000원권 각 약 50장, 모두 약 500장 (권종별 수량을 모두 쓴다). 5,000원권·10,000원권은 거스름돈을 주고받아 보는 데 쓴다",
        "[필수] 화폐는 새것으로 드리고, 행사가 끝나면 원에 남겨 두어 교재로 계속 쓸 수 있다 (선생님이 화폐를 직접 만들거나 복사·자를 필요가 없다)",
        "와플 기계와 와플 믹스, 솜사탕 기계와 재료 (여기서는 이름만 짧게 쓰고, 양·옵션은 쓰지 않는다)",
      ],
      photo: { alt: "어린이집 시장놀이 장바구니 들고 장보기", caption: "장바구니를 들고 가게를 돌며 장보기" } },
    prepare: { len: "4줄 짧은 목록 + 1문단 · 2~4문장", role: "원에서 준비할 것 4가지 (준비 주체와 수량을 정확히)",
      facts: [
        "[필수] 원에서 준비할 것은 4가지로 정리한다: ① 상점을 차릴 교실마다 책상 2개 ② 가게마다 실물 1가지(예: 생선가게 굵은 멸치 소포장, 채소가게 감자·당근·오이, 과일가게 계절과일 1가지, 분식점 떡볶이·과자) ③ 서점에서 바꿔 볼 동화책(가정마다 2권씩) ④ 먹거리용 종이컵",
        "이 4가지 외의 시장 꾸미기 물품은 반장이 가져온다 (단, '선생님은 아무것도 준비하지 않아도 된다'처럼 쓰지 않는다)",
        "동화책은 각 가정에서 2권씩 보내 서점에서 서로 바꿔 보는 방식이라, 가정 안내문으로 미리 알려 두면 좋다",
      ] },
    play: { len: "2~3문단 · 6~8문장", role: "아이들의 장보기 놀이 흐름 (프로그램 설명으로)",
      facts: [
        "아이들은 장바구니를 들고 가게를 돌며 물건을 고르고, 놀이 화폐로 값을 치른다. 손님이 되어 장을 보거나 가게 주인이 되어 물건을 파는 역할놀이로 이어진다",
        "큰돈(5,000원권·10,000원권)을 내고 거스름돈을 받아 보는 계산 놀이를 할 수 있다",
        "서점에서는 집에서 가져온 동화책을 서로 바꿔 본다",
        "활동 목표: 돈을 쓰는 방법, 계획을 세워 사기, 아껴 쓰고 나눠 쓰는 습관 (목표로만 쓰고 '경제 개념이 생긴다'처럼 효과를 보장하지 않는다)",
        "아이 이름, 아이의 대사, 특정 원에서 있었던 장면은 쓰지 않는다",
      ],
      photo: { alt: "유치원 시장놀이 화폐로 계산하기", caption: "놀이 화폐로 값을 치르고 거스름돈 주고받기" } },
    food: { len: "2문단 · 4~6문장", role: "와플·솜사탕 먹거리와 추가 옵션",
      facts: [
        "[필수] 와플: 반장이 와플 기계와 10kg 와플 믹스 1포를 가져온다. 반죽 농도에 따라 와플 약 150개 분량이다 ('반죽 농도에 따라'라는 조건을 빼지 않는다. 몇 명분이라고 쓰지 않고, 남는다·모자라지 않는다처럼 소진량을 보장하지 않는다)",
        "[필수] 솜사탕: 반장이 솜사탕 기계와 재료를 가져온다 (분량은 쓰지 않는다)",
        "먹거리 기계 사용 방법은 행사 전날 설치하면서 선생님께 안내한다 (아이들이 먹거리를 직접 만든다고 쓰지 않는다)",
        "종이컵은 원에서 준비한다",
        "추가 옵션: 슬러쉬·팝콘을 더할 수 있다. 기본 구성이 아니며 상담 때 정한다 (옵션에 딸린 제공물·수량은 쓰지 않는다)",
        "먹거리 가게 모습은 생생하게 그려도 된다: 시장 거리 한쪽에 와플 기계와 솜사탕 기계가 놓인 먹거리 가게가 열린다",
      ],
      photo: { alt: "어린이집 시장놀이 와플 솜사탕 먹거리", caption: "와플·솜사탕 먹거리 가게" } },
    operation: { len: "2~3문단 · 5~7문장", role: "설치·운영 방식",
      facts: [
        "[필수] 반장은 행사 전날 원에 와서 설치하고, 설치하면서 선생님들께 운영 방법을 안내한다. 당일 놀이는 원에서 반별로 진행한다 (반장이 당일 진행·상주한다고 쓰지 않는다)",
        "[필수] 보통 한 반씩 놀이한다: 한 반이 장을 보고 교실로 돌아가면 다음 반이 들어오는 방식이라, 반 수가 많은 원도 순서대로 운영할 수 있다 (한 번에 몇 명, 몇 분처럼 숫자를 만들지 않는다)",
        "[필수] 설치·회수 시간은 원과 상의해 정한다. 보통 원 일과가 끝난 오후, 선생님이 퇴근하기 전 시간에 맞춘다(병설유치원처럼 퇴근이 이른 곳은 그 전에 설치한다) (특정 시각을 약속하지 않는다)",
      ] },
    closing: { len: "2문단 · 4~5문장", role: "마무리와 상담 안내 1회",
      facts: [
        "같은 시장놀이라도 원의 교실·강당 여건, 반 수, 참여수업 여부에 따라 배치와 구성이 달라진다",
        "교실 4곳 배치/강당 배치, 서점·문구 확장, 슬러쉬·팝콘 옵션까지 원의 행사 목적에 맞춰 상담으로 정한다",
        "상담 때 원아 수와 반 수, 사용할 수 있는 교실·강당, 행사 날짜, 옵션 여부를 알려 달라고 안내한다",
      ] },
  },
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"],
  hashtags: ["#어린이집시장놀이", "#유치원시장놀이", "#시장놀이", "#어린이집행사", "#유치원행사", "#시장놀이준비물", "#경제놀이", "#역할놀이", "#원방문체험", "#찾아가는체험", "#참여수업", "#반장노리야놀자"],
};

function buildMarketPilotPrompt(title, angle) {
  const secText = angle.order.map((k, i) => {
    const s = MARKET_PILOT.sections[k];
    return `${i + 1}. key="${k}" — 역할: ${s.role} / 분량: ${s.len}\n` + s.facts.map(f => `   - ${f.replace("__OPENER__", angle.opener)}`).join("\n");
  }).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장-노리야놀자'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희 반장'으로 부르고, 반장이 주어일 때는 '반장은', '반장이', '저희 반장은'처럼 쓴다('반장에서는'처럼 쓰지 않는다). 반장을 유치원·어린이집처럼 쓰지 않고, '저희 원', '우리 원'이라고 쓰지 않는다. 독자의 원은 그냥 '원'이라고 부른다(예: 원의 교실, 원에서 준비할 것). 원의 아이들은 '아이들' 또는 '원아들'이라고 부른다.",
    "독자는 시장놀이 행사를 준비하는 유치원·어린이집 원장님과 선생님이다. 이 글은 '원에서 무엇을 준비하고, 반장에게 무엇을 맡길 수 있을까?'라는 질문에 답한다. 준비물 구분과 함께, 6개 상점이 들어선 시장 공간과 와플·솜사탕까지 이어지는 행사 구성이 생생하게 그려지게 써서 예약을 검토할 수 있게 한다.",
    "이 글은 행사 후기가 아니라 프로그램 소개·준비 안내 글이다. 특정 날짜·특정 원에서 있었던 일처럼 쓰지 않는다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 숫자·장비·시간·가격·인원·연령·수상·경력, 인기·예약 빈도('많은 원에서 찾는다', '특정 달에 인기') 주장을 만들지 않는다. 상점은 6곳이다. 실제로 설치되는 공간과 먹거리 가게 모습은 재료를 바탕으로 생생하게 그린다(가상의 아이 반응·대사는 제외).",
    "재료의 조건과 강도를 바꾸지 않는다: '옵션'은 기본처럼, '상담'은 확정처럼, '원에서 준비'는 반장이 준비하는 것처럼, '원에서 반별로 진행'은 반장이 진행하는 것처럼 쓰지 않는다.",
    "아이 이름을 쓰지 않는다. 특정 아이가 한 말이나 행동을 실제 있었던 일처럼 쓰지 않는다. 따옴표로 된 대사는 쓰지 않는다.",
    "아이들 모습은 '~하게 됩니다', '~할 수 있습니다'처럼 프로그램 설명으로 쓴다. '모두 좋아한다', '경제 개념이 확실히 생긴다'처럼 결과를 단정하지 않는다.",
    "자연스러운 홍보 표현('교실이 하루 만에 시장 거리로 바뀝니다', '장바구니를 드는 순간부터 시작되는 장보기')은 써도 된다. 효과·성과를 보장하는 문장, 근거 없는 최상급·순위·다른 업체와 비교하는 표현은 쓰지 않는다.",
    "의상(상인 옷·앞치마·모자 등) 이야기는 쓰지 않는다(제공한다고도, 제공하지 않는다고도 쓰지 않는다).",
    "반장이 하는 일은 설치·선생님 안내·회수다. 반장을 주어로 '시장놀이를 진행한다', '놀이를 이끈다'처럼 쓰지 않는다. 당일 놀이의 주어는 원·선생님·아이들이다.",
    "섹션마다 앞 섹션을 이어받아 연결한다. 한 섹션에서 설명한 내용을 다른 섹션에서 다시 설명하지 않는다. 같은 문장을 두 번 쓰지 않는다.",
    "다른 업체·다른 업종·다른 프로그램 이야기는 쓰지 않는다. 반장을 '전문가'라고 부르지 않는다.",
    "본문에 전화번호·출장지역·가격·할인을 쓰지 않고, '연락처는 별도로 안내됩니다' 같은 안내 문장도 쓰지 않는다.",
    "굵게(**) 같은 마크다운 기호를 쓰지 않는다. 소항목이 필요하면 짧은 한 줄 제목으로 쓴다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다('섹션' 같은 말 금지). body 는 문단 사이를 빈 줄로 나눈다. 목록이 자연스러운 곳(6개 상점, 반장이 가져오는 것, 원에서 준비할 것 4가지)은 짧은 목록을 써도 된다.",
    "소제목과 문장 표현은 매번 새로 쓴다. 재료 문장을 그대로 옮겨 적지 말고 자연스럽게 풀어 쓴다(상점 이름·수량은 그대로 둔다).",
    "[필수] 표시 재료는 하나도 빠뜨리거나 뭉뚱그리지 않는다('다양한 물품을 제공합니다'처럼 요약해 넘기지 않는다).",
    "섹션마다 적힌 분량을 지킨다. 글 전체 본문은 공백 포함 약 2,500~3,200자다. 같은 뜻을 반복해서 늘리지 않는다.",
    "번역투·딱딱한 표현('반장 측', '삽입하여', '~하는 경우가 많습니다', '~를 배우게 됩니다')은 쓰지 않는다. 업체 사장님이 직접 소개하듯 자연스럽게 쓴다.",
  ].join("\n");
  const user = `제목: ${title}\n이번 글의 관점: ${angle.focus}\n(관점에 맞는 섹션은 조금 더 자세히, 나머지는 핵심만 쓴다. 단 모든 섹션의 재료는 빠뜨리지 않는다.)\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 금지 FACT·노출·누락을 문장 단위로 수집해 사람이 판정한다(차단하지 않음).
function auditMarketPilot(text) {
  const t = text.replace(/(\d),(\d{3})/g, "$1$2"); // 1,000원 → 1000원
  const sentences = t.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  const numbers = (t.match(/\d+(\.\d+)?\s*(m|미터|kg|킬로|벌|대|세트|개|반|교실|곳|분|초|가지|명|장|권|포|시간|원|년|세|면)/g) || []);
  const ALLOWED_NUM = /^(6\s*(개|곳|가지)|4\s*(곳|교실|가지|개)|8\s*(m|미터)|2\s*(개|곳|권)|45\s*개|1000\s*원|5000\s*원|10000\s*원|400\s*장|50\s*장|500\s*장|10\s*(kg|킬로)|1\s*(포|가지|장|개|곳|반)|150\s*개|[1-4]\s*교실)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  const NAME_RE = /(^|[\s"“])([가-힣]{2})(이는|이가|이도|이의|이랑|이와)\s/;
  const NOUN_END = /(놀이|아이|사이|차이|높이|길이|넓이|종이)$/;
  return {
    wrongFacts: pick(/(6\s*월|(?<!반\s*수가\s*)많은\s*원|인기|음료|옥수수|스푼|의상|앞치마|상인\s*옷|\d+\s*명\s*분|네\s*개의\s*(상점|가게|코너)|4\s*개\s*(상점|가게|코너)|네\s*곳의\s*(상점|가게)|화폐\s*5\s*장|계산대|가격표|강사|상주|\d+\s*만\s*원|무료|할인|경력|설립|\d+\s*년\s*(동안|간|째))/),
    unsureClaims: pick(/(보장|확실히|반드시\s*(좋|효과)|모두\s*좋아|무척\s*좋아|훨씬|최고|최상|최적|압도|화제|대박|1위|남지\s*않|모자라지\s*않|충분)/),
    teacherNoPrep: pick(/(아무것도\s*(준비하지|필요)|준비(할\s*것|물)?(이|은|는)?\s*없|준비\s*없이|손\s*하나)/),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    banjangParticle: pick(/(반장|노리야놀자)에서/),
    banjangRunsDay: pick(/반장(이|은|도)?[^.]{0,20}(진행합니다|진행해|진행하는|이끌)/),
    names: sentences.filter(s => { const m = s.match(NAME_RE); return m && !NOUN_END.test(m[2] + "이"); }),
    quotes: t.match(/["“'‘][^"“”'‘’\n]{1,40}["”'’]/g) || [],
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    leaks: pick(/(key=|섹션|재료:|\[섹션|JSON|heading|body|프롬프트|지시문|관점:)/),
    foreignIndustry: pick(/(성형|피부과|시술|임플란트|한의원|에어\s*바운스|병영|블랙라이트)/),
    conditionDropped: pick(/150\s*개/).filter(x => !/반죽/.test(x)).concat(pick(/(부족|좁)[^.]*강당/)),
    selfClaims: pick(/(전문가|직접\s*만들어)/),
    shopsMissing: ["과일", "채소", "생선", "빵", "서점", "분식"].filter(w => !t.includes(w)),
    prepareMissing: ["책상", "실물", "동화책", "종이컵"].filter(w => !t.includes(w)),
    provideMissing: ["장바구니", "돈통", "400", "와플", "솜사탕", "10kg"].filter(w => !t.replace(/10\s*킬로/g, "10kg").replace(/10\s*kg/g, "10kg").includes(w)),
    hasKindergarten: /유치원/.test(t), hasDaycare: /어린이집/.test(t),
    repeats,
    charCount: text.length,
  };
}

// [MARKET-FINAL-MICRO-FIX] 반복 생성에서 확인된 표현만 국소 보정(시장놀이 경로 한정 · 공간·상점·먹거리 묘사는 유지)
//   ① 확인되지 않은 아이 반응(목소리·웃음·환호·표정 등)을 사실처럼 쓴 문장만 제거
//   ② 「선생님이 따로 준비할 필요 없이/없습니다」 전체 준비 면제 → 반장 제공으로 덜어지는 준비(화폐·장바구니)로 한정
//   ③ 5,000원권·10,000원권 「(각) 50장」 → 「(각) 약 50장」  ④ 「선생님들이 준비를 덜어」 비문 교정
//   ⑤ 「행사에 필요한 모든 요소」 → 「필요한 시장 물품」(원 준비물 4가지가 있으므로 전체 준비 면제처럼 읽히지 않게)
function fixMarketWording(body) {
  const REACTION = /아이[들]?[^.!?]{0,20}(목소리|웃음|환호|탄성|함성|표정|눈빛|눈이\s*반짝)|(목소리|웃음소리|환호성|탄성|함성)[^.!?]{0,15}(가득|넘치|퍼지|울려)/;
  //   반응 앞에 공간 묘사 절(「가게가 줄지어 들어서면,」)이 있으면 그 절은 살리고 끝만 공간 묘사로 바꾼다. 절이 없으면 그 문장만 뺀다.
  let t = body.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
    if (!REACTION.test(x)) return x;
    const m = x.match(/^(.*?(?:면|고|며|자),?)\s+[^.!?]*[.!?]?$/);
    return m && !REACTION.test(m[1]) ? `${m[1]} 원 안에 시장 거리가 완성됩니다.` : "";
  }).filter(Boolean).join(" ")).join("\n");
  t = t.replace(/필요한\s*모든\s*(요소|것|준비물|물품)(을|를|이|가)?/g, (m, a, p) => `필요한 시장 물품${p ? ({ "를": "을", "을": "을", "가": "이", "이": "이" })[p] : ""}`);
  t = t.replace(/(따로|별도로|모두|아무것도|전혀)\s*준비(하실|할)\s*필요\s*없이/g, "화폐를 만들거나 장바구니를 구하지 않고도")
       .replace(/(따로|별도로|아무것도|전혀)\s*준비(하실|할)\s*(필요가|것이)\s*없/g, "화폐를 만들거나 장바구니를 따로 구할 필요가 없");
  t = t.replace(/(?<=(?:5|10),?000원권[^.\n\d]{0,10})(?<!약\s?)(\d+\s*장)/g, "약 $1").replace(/총\s*500\s*장/g, "모두 약 500장"); // 「각 50장」·「5,000원권 50장」 모두 · 총량도 「약」 유지
  t = t.replace(/선생님(들)?이\s*준비를\s*덜어/g, "선생님$1의 준비를 덜어");
  // [MARKET-POST-OPEN-FIX-01] ⑥ 「유아원」 오기 → 「유치원」 ⑦ 먹거리 문장의 「마음껏·실컷·배불리」(제공량 무제한 오해) 단어만 제거
  //   ⑧ 아이 감정을 관찰한 것처럼 단정(「설렘을 느끼게 됩니다」) → 가능성(「느낄 수 있습니다」)
  t = t.replace(/유아원/g, "유치원");
  t = t.split(/(?<=[.!?])/).map(x => /(먹거리|와플|솜사탕|간식|슬러쉬|팝콘)/.test(x) ? x.replace(/(마음껏|실컷|배불리)\s*/g, "") : x).join("");
  t = t.replace(/(아이[^.!?\n]{0,40}(설렘|기쁨|즐거움|행복|신남|뿌듯함)(을|를)\s*)(느끼게\s*됩니다|느낍니다|느끼게\s*될\s*것입니다)/g, "$1느낄 수 있습니다");
  // [MARKET-MICRO-PATCH] ⑨ 근거 없는 다수 원·기관의 관심·인기·선호 단정(「많은 원에서 주목받고 있습니다」)만 국소 보정
  //   「…수 있어(으며)/좋아(고)/적합해 + (특히 ○○에) 단정」이면 앞 절을 「…수 있습니다/좋습니다/적합합니다」로 맺고, 아니면 그 문장만 뺀다. 「반 수가 많은 원」(FACT)은 제외.
  const CROWD = /(?<![가이]\s?)(많은|여러|다수의?|수많은)\s*(원|유치원|어린이집|기관|곳|분|선생님|학부모)(들)?\s*(에서|이|가|께서|의)?\s*[^.!?\n]{0,15}?(주목|인기|찾|선택|관심|호응)|인기\s*(프로그램|가\s*(많|높)|를\s*(끌|얻))/;
  t = t.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
    const m = x.match(CROWD);
    if (!m) return x;
    const h = x.slice(0, m.index).match(/^(.*?(수\s*있|좋|적합하?|가능하?))(?:어서|어|아|여|해서|해|으며|며|고),?(?:\s*(?:특히|요즘|최근|주로)[^.!?,]{0,10}?)?\s*$/);
    if (h) return `${h[1].replace(/하$/, "")}${/[좋있]$/.test(h[2]) ? "습" : "합"}니다.`;
    const tail = /^(?:특히|요즘|최근|주로)?[^,.!?]{0,12}$/.test(x.slice(0, m.index)) && x.slice(m.index).match(/^[^,.!?]*?(?:으로|로|이라|라서|이며),\s*(.+)$/);
    return tail ? tail[1] : "";  // 「특히 6월에 많이 찾는 인기 프로그램으로, …적합합니다」 → 뒤 절만 남김
  }).filter(Boolean).join(" ")).join("\n");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

async function generateMarketPilot({ region }) {
  const r = (region || "").trim();
  const angle = MARKET_PILOT.angles[Math.floor(Math.random() * MARKET_PILOT.angles.length)];
  const baseTitle = angle.titles[Math.floor(Math.random() * angle.titles.length)];
  const title = r ? `${r} ${baseTitle}` : baseTitle;
  const { system, user } = buildMarketPilotPrompt(title, angle);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (angle.order.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("시장놀이 Pilot 생성 실패");

  const parts = [];
  for (const k of angle.order) {
    const def = MARKET_PILOT.sections[k];
    const s = parsed.find(x => x.key === k);
    const photo = def.photo ? `[이미지: ${def.photo.alt} | ${def.photo.caption}]\n\n` : "";
    // 소제목도 본문과 같은 「반장에서 제공/준비…」 → 「반장이 …」 조사 교정(시장놀이 경로 한정)
    const headText = String(s.heading || "").replace(/\*\*/g, "").trim()
      .replace(/반장-노리야놀자에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장-노리야놀자가$1$2").replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    const head = k === "intro" ? "" : `${headText}\n\n`;
    let secBody = String(s.body).replace(/\*\*/g, "").trim();
    // 일반 수식어(최적·최고의)는 단어만 바꿔 문장(상담·옵션 FACT)을 살린다 → 그래도 순위·최상급이 남은 문장만 제거(시장놀이 경로 한정)
    secBody = secBody.replace(/최적의/g, "알맞은").replace(/최적/g, "알맞은").replace(/최고의\s*/g, "");
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).filter(x => !/(최고|최상|1위|압도적|으뜸)/.test(x)).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // 「반장에서는/에서도/에서 준비」 → 「반장은/반장도/반장이 준비」 국소 보정
    secBody = secBody.replace(/반장-노리야놀자에서는/g, "반장-노리야놀자는").replace(/반장-노리야놀자에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장-노리야놀자가$1$2")
      .replace(/반장에서는/g, "반장은").replace(/반장에서도/g, "반장도").replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    secBody = fixMarketWording(secBody);
    // 조건이 뒤집히거나 소진량을 보장하는 문장은 반복 생성에서 계속 나와 문장 단위로 제거한다(시장놀이 경로 한정)
    //   ① 강당을 「교실이 부족할 때」 쓰는 해결책처럼 쓴 문장(「교실이든 강당이든 부족하면 줄여 설치」 같은 정상 축소 안내는 보존)
    //   ② 와플·먹거리 양이 「충분하다·넉넉하다·남는다」 ③ 근거 없는 반 순서(작은 반부터 등) ④ 섹션 구조 노출
    const MARKET_DROP = /((부족|좁|모자라)(하면|하다면|할\s*때|한\s*경우|할\s*경우|해서|하여)[^.!?]*강당[^.!?]{0,30}(활용|사용|이용|설치|배치|마련|만들)|(와플|솜사탕|먹거리|믹스|분량)[^.!?]*(충분|넉넉|남지\s*않|모자라지\s*않)|(충분|넉넉)[^.!?]*(와플|솜사탕|먹거리|나눠\s*먹)|(작은|어린|큰)\s*반부터|섹션|(다음|아래|뒤)\s*부분에서)/;
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).filter(x => /(교실이든\s*강당이든|줄여|줄인|축소)/.test(x) || !MARKET_DROP.test(x)).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (k === "shops" && !/강당/.test(secBody)) secBody += "\n\n강당이 있는 원은 교실 대신 강당 한 곳에 상점을 삼면이나 사면으로 둘러 시장 거리를 꾸밀 수도 있습니다.";
    // Hard FACT 고정(SOP §29.2): GPT 가 자주 빼먹는 조건·권종별 수량을 보강한다
    //   와플 「약 150개」 문장은 어느 섹션이든 「반죽 농도에 따라」 조건이 없으면 문장 안에 넣는다
    secBody = secBody.split(/(?<=[.!?])/).map(x => /150\s*개/.test(x) && !/반죽/.test(x) ? x.replace(/(와플\s*)?약\s*150\s*개/, m => `반죽 농도에 따라 ${m}`) : x).join("");
    if (k === "food") {
      if (!/150\s*개/.test(secBody)) secBody += "\n\n와플 믹스 10kg 1포는 반죽 농도에 따라 와플 약 150개 분량입니다.";
      // [MARKET-FINAL-RELEASE] 10kg 이 없으면 첫 「와플 믹스」를 「10kg 와플 믹스 1포」로 바꾼다(문장 안 보강 · 이미 있으면 그대로) → 「와플 믹스」 말이 없으면 1줄 보강
      if (!/10\s*(kg|킬로)/i.test(secBody)) {
        if (/와플\s*믹스/.test(secBody)) secBody = secBody.replace(/와플\s*믹스/, "10kg 와플 믹스 1포");
        else secBody += "\n\n와플 믹스는 10kg 1포를 가져갑니다.";
      }
    }
    if (k === "provide" && !/400\s*장/.test(secBody)) secBody += "\n\n놀이 화폐는 1,000원권 400장, 5,000원권·10,000원권 각 약 50장으로 모두 약 500장입니다.";
    parts.push(`${head}${photo}${secBody}`);
  }
  parts.push(MARKET_PILOT.cta.join("\n"));
  // 지역 입력 시 지역 태그를 앞에 두고 #찾아가는체험(#원방문체험과 같은 뜻)을 빼서 12개 유지 — 끝의 브랜드 태그 보존
  const tags = r ? [`#${r.replace(/\s/g, "")}어린이집행사`].concat(MARKET_PILOT.hashtags.filter(h => h !== "#찾아가는체험")).slice(0, 12) : MARKET_PILOT.hashtags.slice(0, 12);
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim();

  const images = angle.order.map(k => MARKET_PILOT.sections[k].photo).filter(Boolean).map(p => ({ alt: p.alt, caption: p.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-MARKET-PILOT-01",
    pilotAngle: angle.id,
    pilotQC: auditMarketPilot(body),
    validation: { passed: charCount >= 1500, charCount },
  };
}

// ============================================================
// [KINDERGARTEN-AIRBOUNCE-PILOT-01] 교실 에어바운스(교실바운스 크레용) 전용 Pilot
//   대상: program.id === "airbounce" 단일 생성만. 블랙라이트·병영·시장놀이 Pilot·다른 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 사장님 확인값(2026-10-10) > 설계도(높이 230cm)·홈페이지 「교실바운스/크레용」. data 의 airbounce 항목은 보존·미변경
//     (그 안의 「안전요원 상시 배치」「10~20명 동시」 등은 미확인이라 이 경로에서 쓰지 않는다).
//   Search Question: 「강당이 없어도 유치원·어린이집 교실에서 에어바운스 놀이를 할 수 있을까?」 — 모든 관점의 제목·본문이 같은 질문에 답한다.
//   230cm 는 장비 높이일 뿐 설치 가능 보장이 아니다 → 교실 천장 높이·바닥 공간 확인 조건을 Hard FACT 로 고정한다.
//   전화번호·출장지역은 GPT 가 쓰지 않고 마지막에 고정 문구로 붙인다.
// ============================================================
const AIRBOUNCE_PILOT = {
  angles: [
    { id: "classroom", focus: "강당이 없는 원도 교실에서 에어바운스 놀이를 할 수 있도록 높이 230cm로 만든 교실형 바운스라는 점과, 교실 천장 높이·공간 확인에 힘을 준다",
      titles: ["어린이집 에어바운스, 강당 없어도 교실에서｜높이 230cm 교실바운스로 유치원·어린이집 실내 놀이",
               "어린이집 에어바운스 교실 설치｜강당 없는 유치원·어린이집도 가능한지 천장 높이부터 확인"],
      opener: "강당이 없거나 강당 일정이 빠듯해서 에어바운스는 어렵다고 생각했던 원의 고민을 질문으로 꺼내며 시작한다",
      order: ["intro", "classroom", "bounce", "setup", "operation", "closing"] },
    { id: "operation", focus: "전날 설치하고 송풍기 스위치만 켜면 약 3분 안에 바운스가 서는 준비 과정과, 당일 원에서 반별로 놀이하는 운영 방식에 힘을 준다",
      titles: ["어린이집 에어바운스 대여｜전날 교실에 설치, 스위치 켜면 3분 만에 서는 유치원·어린이집 바운스",
               "어린이집 에어바운스 운영 방법｜교실 설치부터 당일 반별 놀이까지, 유치원도 함께"],
      opener: "행사 전날 반장이 교실에 바운스를 설치해 두고, 다음 날 송풍기 스위치를 켜면 교실 안에 바운스가 부풀어 오르는 장면으로 시작한다",
      order: ["intro", "setup", "operation", "classroom", "bounce", "closing"] },
    { id: "bounce", focus: "크레용 모양 기둥과 점프 공간, 미끄럼틀이 있는 교실바운스 크레용이 교실 안에 들어선 모습과 놀이에 힘을 준다",
      titles: ["어린이집 에어바운스｜교실 안에 들어서는 크레용 바운스, 유치원·어린이집 실내 놀이",
               "어린이집 에어바운스 크레용 교실바운스｜점프하고 미끄럼 타는 유치원·어린이집 교실 놀이"],
      opener: "평소 수업하던 교실에 알록달록한 크레용 기둥의 바운스가 들어선 모습으로 시작한다",
      order: ["intro", "bounce", "classroom", "setup", "operation", "closing"] },
  ],
  sections: {
    intro: { len: "2문단 · 4~6문장", role: "이번 관점의 시작점에서 열고 → 반장 교실바운스 크레용 소개",
      facts: [
        "__OPENER__ (원의 고민을 모든 원의 사실처럼 단정하지 않는다. 예시 문장을 그대로 베끼지 말고 새로 쓴다)",
        "반장-노리야놀자는 유치원·어린이집으로 찾아가는 원방문 체험 프로그램을 직접 기획하고 운영하는 업체다 (경력 연수·설립연도는 쓰지 않는다)",
        "반장의 교실바운스 크레용은 일반 에어바운스를 유치원·어린이집 실내에서 쓸 수 있도록 높이 230cm로 만든 교실형 에어바운스다",
        "유치원과 어린이집 모두 진행할 수 있다. 글 전체에서 '유치원·어린이집' 두 기관을 함께 독자로 부르고, 어느 한쪽을 덧붙이듯 쓰지 않는다",
        "원 행사나 실내 놀이 프로그램으로 단독 진행할 수 있다",
      ],
      photo: { alt: "어린이집 에어바운스 교실에 설치된 교실바운스 크레용", caption: "교실 안에 설치된 교실바운스 크레용 (대표사진)" } },
    classroom: { len: "3문단 · 6~8문장", role: "강당이 없어도 교실에서 할 수 있는 이유와 설치 공간 확인 (이 글의 질문에 대한 답)",
      facts: [
        "[필수] 교실바운스 크레용의 높이는 230cm다. 강당이 아닌 교실 천장 아래에도 설치하는 것을 생각해 높이를 맞춰 만들었다",
        "[필수] 230cm 는 바운스 자체의 높이다. 실제로 설치할 수 있는지는 원 교실의 천장 높이와 바운스를 펼칠 바닥 공간을 상담 때 함께 확인해서 정한다 (어느 교실·강당이든 설치된다고 쓰지 않는다)",
        "실내와 실외 모두 쓸 수 있다. 실외도 설치할 자리의 공간 조건을 확인해서 정한다",
        "바운스의 가로·세로 크기와 교실 면적 숫자는 쓰지 않는다 (재료에 없다)",
        "강당이 있는 원도 일정이나 행사 구성에 맞춰 교실 설치를 고를 수 있다",
      ],
      photo: { alt: "유치원 에어바운스 교실 천장 아래 설치 모습", caption: "교실 천장 아래에 맞춘 높이 230cm" } },
    bounce: { len: "2~3문단 · 6~8문장", role: "교실바운스 크레용의 모습과 놀이",
      facts: [
        "크레용 모양 기둥이 서 있는 알록달록한 바운스로, 안쪽에서 콩콩 뛰는 점프 공간과 미끄럼틀이 있다 (사진 속 실제 모습. 다른 놀이 구조물을 만들어 내지 않는다)",
        "[필수] 캠프장·이벤트용에 쓰는 튼튼한 소재로 만든 교실형 에어바운스다 (튼튼하다는 것은 소재 설명으로만 쓰고, 몇 명이 함께 타도 된다·안전하다·사고가 없다처럼 수용 인원이나 안전을 보장하는 말로 넓히지 않는다)",
        "아이들은 바운스 안에서 뛰고, 미끄럼틀을 타고 내려오며 몸을 마음껏 움직이는 실내 놀이를 할 수 있다 (프로그램 설명으로 쓴다)",
        "평소 수업하던 교실이 하루 동안 신나는 놀이 공간으로 바뀐다는 행사 분위기는 생생하게 그려도 된다 (아이들의 목소리·표정·반응을 실제 있었던 일처럼 쓰지 않는다)",
        "아이 이름, 아이의 대사, 특정 원에서 있었던 장면은 쓰지 않는다",
      ],
      photo: { alt: "어린이집 에어바운스 미끄럼틀 타기", caption: "점프 공간과 미끄럼틀이 있는 교실바운스 크레용" } },
    setup: { len: "2문단 · 4~6문장", role: "구성과 준비 (원이 놀이 장비를 따로 준비하지 않아도 되는 부분과 현장에서 확인할 부분을 구분)",
      facts: [
        "[필수] 구성은 에어바운스와 송풍기다. 반장이 함께 가져와 설치한다",
        "[필수] 송풍기 전기 스위치를 켜면 약 3분 안에 바운스가 부풀어 놀이를 시작할 수 있다 ('약 3분'을 지킨다. 1분·즉시처럼 줄이지 않는다)",
        "[필수] 원에서 따로 준비할 놀이 장비는 없다. 다만 송풍기에 전원을 연결할 수 있는 위치는 설치 공간을 확인할 때 함께 본다 (준비할 것이 '아무것도' 없다고 쓰지 않는다)",
      ],
      photo: { alt: "유치원 에어바운스 설치 구조", caption: "에어바운스와 송풍기로 이루어진 구성" } },
    operation: { len: "2문단 · 4~6문장", role: "설치·운영 방식",
      facts: [
        "[필수] 반장은 행사 전날 원에 와서 바운스를 설치하고, 설치하면서 선생님들께 사용 방법을 안내한다. 당일 놀이는 원에서 자체적으로 진행한다 (반장이 당일 진행·상주한다고 쓰지 않는다. 안전요원·진행 요원이 있다고 쓰지 않는다)",
        "[필수] 놀이가 끝난 당일에 반장이 회수한다. 설치·회수 시간은 원과 상의해 정한다 (특정 시각을 약속하지 않는다)",
        "보통 반별로 돌아가며 놀이한다 (한 번에 몇 명, 몇 분처럼 숫자를 만들지 않는다)",
      ] },
    closing: { len: "2문단 · 4~5문장", role: "마무리와 상담 안내 1회",
      facts: [
        "강당이 없어도 교실 여건이 맞으면 교실에서 에어바운스 놀이를 열 수 있다는 점을 다시 짚는다 (무조건 된다고 쓰지 않는다)",
        "반장 교실바운스는 크레용 외에 아쿠아 모델도 따로 대여할 수 있다 (아쿠아의 크기·구성은 쓰지 않는다)",
        "필요하면 슬라이드나 놀이동산 프로그램을 더해 함께 꾸밀 수 있으며, 상담으로 정한다",
        "상담 때 설치할 교실의 천장 높이와 공간, 행사 날짜, 원아 수와 반 수를 알려 달라고 안내한다",
      ] },
  },
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"],
  hashtags: ["#어린이집에어바운스", "#유치원에어바운스", "#교실에어바운스", "#실내에어바운스", "#에어바운스대여", "#교실바운스", "#어린이집행사", "#유치원행사", "#실내놀이", "#원방문체험", "#찾아가는체험", "#반장노리야놀자"],
};

function buildAirbouncePilotPrompt(title, angle) {
  const secText = angle.order.map((k, i) => {
    const s = AIRBOUNCE_PILOT.sections[k];
    return `${i + 1}. key="${k}" — 역할: ${s.role} / 분량: ${s.len}\n` + s.facts.map(f => `   - ${f.replace("__OPENER__", angle.opener)}`).join("\n");
  }).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장-노리야놀자'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희 반장'으로 부르고, 반장이 주어일 때는 '반장은', '반장이'처럼 쓴다('반장에서는'처럼 쓰지 않는다). '저희 원', '우리 원'이라고 쓰지 않는다. 독자의 원은 그냥 '원'이라고 부른다. 원의 아이들은 '아이들' 또는 '원아들'이라고 부른다.",
    "독자는 실내 에어바운스 행사를 고민하는 유치원·어린이집 원장님과 행사 담당 선생님이다. 이 글은 '강당이 없어도 유치원·어린이집 교실에서 에어바운스 놀이를 할 수 있을까?'라는 질문에 답한다. 읽고 나서 '우리 원 교실에도 설치할 수 있겠는데?' 하는 관심이 생기고, 설치 공간 확인과 예약 상담으로 이어지게 쓴다.",
    "이 글은 행사 후기가 아니라 프로그램 소개·설치 안내 글이다. 특정 날짜·특정 원에서 있었던 일처럼 쓰지 않는다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 숫자·크기·장비·시간·가격·인원·연령·수상·경력을 만들지 않는다. 숫자는 높이 230cm, 약 3분만 쓴다. 바운스 가로·세로 크기, 한 번에 탈 수 있는 인원, 권장 이용 인원은 쓰지 않는다.",
    "안전요원·진행 요원 배치, 안전 보장, 사고 예방 효과, 하중·수용 인원 보장, 재예약·인기·만족도('많은 원에서 찾는다', '한 번 하면 또 찾는다')를 만들지 않는다.",
    "230cm 는 바운스 높이일 뿐이다. '어느 교실이든', '강당·교실 어디든', '무조건' 설치된다고 쓰지 않는다. 설치 여부는 교실 천장 높이와 공간을 확인해서 정한다는 조건을 빼지 않는다.",
    "물놀이·물 미끄럼틀·워터 슬라이드 이야기는 쓰지 않는다.",
    "아이 이름을 쓰지 않는다. 특정 아이가 한 말이나 행동을 실제 있었던 일처럼 쓰지 않는다. 따옴표로 된 대사는 쓰지 않는다. 아이들 모습은 '~할 수 있습니다'처럼 프로그램 설명으로 쓴다.",
    "자연스러운 홍보 표현('평소 수업하던 교실이 하루 만에 놀이 공간으로 바뀝니다', '스위치를 켜면 교실 안에 크레용 바운스가 솟아오릅니다')은 적극적으로 써도 된다. 효과·성과를 보장하는 문장, 근거 없는 최상급·순위·다른 업체와 비교하는 표현은 쓰지 않는다.",
    "반장이 하는 일은 설치·선생님 안내·회수다. 반장을 주어로 '놀이를 진행한다', '놀이를 이끈다', '아이들을 지도한다'처럼 쓰지 않는다. 당일 놀이의 주어는 원·선생님·아이들이다. 반장이 하지 않는 일(상주하지 않는다, 진행하지 않는다 등)을 부정문으로 적지 않고, 원이 자체적으로 놀이한다는 긍정문으로 쓴다.",
    "소재는 '튼튼한 소재'라는 설명으로만 쓰고, '그래서 안전하다', '안심', '걱정 없다'로 잇지 않는다. 소제목·본문에 '쉽게 설치', '어디서나'처럼 설치를 장담하는 말을 쓰지 않는다.",
    "섹션마다 앞 섹션을 이어받아 연결한다. 한 섹션에서 설명한 내용을 다른 섹션에서 다시 설명하지 않는다. 같은 문장을 두 번 쓰지 않는다.",
    "다른 업체·다른 업종·다른 프로그램 이야기는 쓰지 않는다(재료에 있는 슬라이드·놀이동산 연계와 아쿠아 모델은 예외). 반장을 '전문가', '전문 업체'라고 부르지 않는다.",
    "본문에 전화번호·출장지역·가격·할인을 쓰지 않고, '연락처는 별도로 안내됩니다' 같은 안내 문장도 쓰지 않는다.",
    "굵게(**) 같은 마크다운 기호를 쓰지 않는다. 소항목이 필요하면 짧은 한 줄 제목으로 쓴다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다('섹션' 같은 말 금지). body 는 문단 사이를 빈 줄로 나눈다.",
    "소제목과 문장 표현은 매번 새로 쓴다. 재료 문장을 그대로 옮겨 적지 말고 자연스럽게 풀어 쓴다(230cm·약 3분 숫자는 그대로 둔다).",
    "[필수] 표시 재료는 하나도 빠뜨리거나 뭉뚱그리지 않는다.",
    "섹션마다 적힌 분량을 지킨다. 글 전체 본문은 공백 포함 약 2,500~3,200자다. 같은 뜻을 반복해서 늘리지 않고, 교실이 놀이 공간으로 바뀌는 장면·바운스 모습·설치 흐름을 구체적으로 그려 분량을 채운다.",
    "번역투·딱딱한 표현('반장 측', '삽입하여', '~하는 경우가 많습니다', '~하시는 분들이 많으실 텐데요')은 쓰지 않는다. 업체 사장님이 직접 소개하듯 자연스럽게 쓴다.",
  ].join("\n");
  const user = `제목: ${title}\n이번 글의 관점: ${angle.focus}\n(관점에 맞는 섹션은 조금 더 자세히, 나머지는 핵심만 쓴다. 단 모든 섹션의 재료는 빠뜨리지 않는다.)\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 금지 FACT·노출·누락을 문장 단위로 수집해 사람이 판정한다(차단하지 않음).
function auditAirbouncePilot(text) {
  const sentences = text.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  const numbers = (text.match(/\d+(\.\d+)?\s*(cm|센티|m|미터|mm|명|분|초|시간|개|대|곳|반|평|원|년|세|kg)/g) || []);
  const ALLOWED_NUM = /^(230\s*(cm|센티)|3\s*분)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  return {
    wrongFacts: pick(/(안전\s*요원|진행\s*요원|상주|강사|\d+\s*명|여러\s*명이\s*(함께|동시)|동시에\s*(타|이용)|하중|가로\s*·?\s*세로|가로\s*\d|세로\s*\d|물놀이|워터|물\s*미끄럼|재예약|재요청|다시\s*찾|인기|만족도|많은\s*(원|유치원|어린이집|기관)|\d+\s*만\s*원|무료|할인|경력|설립|\d+\s*년\s*(동안|간|째))/),
    unsureClaims: pick(/(보장|안전합니다|안전하게\s*즐길|사고\s*(없|걱정|예방)|걱정\s*없|확실히|모두\s*좋아|최고|최상|최적|압도|1위|무조건|어디(든|서나|서든|에서든)|어느\s*(교실|곳)(이든|에서나|이나)|언제든)/),
    teacherNoPrep: pick(/(아무것도\s*(준비하지|필요)|준비(할\s*것|물)?(이|은|는)?\s*(전혀\s*)?없(습니다|어요|이)|손\s*하나)/),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    banjangParticle: pick(/(반장|노리야놀자)에서/),
    banjangRunsDay: pick(/반장(이|은|도)?[^.]{0,20}(진행합니다|진행해|진행하는|이끌|지도)/),
    quotes: text.match(/["“'‘][^"“”'‘’\n]{1,40}["”'’]/g) || [],
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    leaks: pick(/(key=|섹션|재료:|\[섹션|JSON|heading|body|프롬프트|지시문|관점:)/),
    foreignIndustry: pick(/(성형|피부과|시술|임플란트|한의원|병영|블랙라이트|시장놀이)/),
    selfClaims: pick(/(전문가|전문\s*업체|직접\s*만들어)/),
    hardFactMissing: [["230cm", /230\s*(cm|센티)/], ["천장 높이 확인", /천장\s*높이/], ["약 3분", /3\s*분/], ["송풍기", /송풍기/], ["전날 설치", /전날/], ["당일 회수", /회수/], ["튼튼한 소재", /소재/], ["크레용", /크레용/], ["아쿠아", /아쿠아/]]
      .filter(([, re]) => !re.test(text)).map(([k]) => k),
    hasKindergarten: /유치원/.test(text), hasDaycare: /어린이집/.test(text),
    repeats,
    charCount: text.length,
  };
}

async function generateAirbouncePilot({ region }) {
  const r = (region || "").trim();
  const angle = AIRBOUNCE_PILOT.angles[Math.floor(Math.random() * AIRBOUNCE_PILOT.angles.length)];
  const baseTitle = angle.titles[Math.floor(Math.random() * angle.titles.length)];
  const title = r ? `${r} ${baseTitle}` : baseTitle;
  const { system, user } = buildAirbouncePilotPrompt(title, angle);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (angle.order.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("에어바운스 Pilot 생성 실패");

  const parts = [];
  for (const k of angle.order) {
    const def = AIRBOUNCE_PILOT.sections[k];
    const s = parsed.find(x => x.key === k);
    const photo = def.photo ? `[이미지: ${def.photo.alt} | ${def.photo.caption}]\n\n` : "";
    const headText = String(s.heading || "").replace(/\*\*/g, "").trim().replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    const head = k === "intro" ? "" : `${headText}\n\n`;
    let secBody = String(s.body).replace(/\*\*/g, "").trim()
      .replace(/반장-노리야놀자에서는/g, "반장-노리야놀자는").replace(/반장에서는/g, "반장은").replace(/반장에서도/g, "반장도").replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    // 소재를 안전·안심으로 넓힌 문장은 승인 FACT 문장으로 바꾸고, 설치를 장담(어디서나·무조건)하는 문장만 뺀다(에어바운스 경로 한정)
    //   「유치원과 어린이집 어디서든」처럼 두 기관을 가리킨 말은 「모두」로 바꿔 문장을 살린다
    secBody = secBody.replace(/(유치원\s*(과|·|,)\s*어린이집)\s*어디(서나|든|서든|에서든|에서나)/g, "$1 모두");
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
      if (/(튼튼|소재)/.test(x) && /(안전|안심|걱정\s*없|든든|문제\s*없|거뜬|끄떡\s*없)/.test(x)) return "캠프장·이벤트용에 쓰는 튼튼한 소재로 만든 교실형 에어바운스입니다.";
      // [AIRBOUNCE-FINAL-MICRO-PATCH] 놀이 결과를 안전으로 보장하는 「안전하게 (신나게/즐겁게) 놀/즐기/보낼」만 「안전하게」를 뺀다(안전수칙·주의 안내 문맥은 보존)
      if (!/(수칙|규칙|주의|지켜|지도)/.test(x)) x = x.replace(/안전하(게|고)\s*(?=[^.!?]{0,15}(놀|즐|보낼|보내|뛰))/g, "");
      // [AIRBOUNCE-CLOSE-PATCH] 높이 230cm 를 「안전하게 설치」로 잇는 문장 → 실내 설치를 고려한 제품(조건 FACT 는 아래 Hard FACT 로 보장) · 근거 없는 「일반 에어바운스와 달리」 비교 구절만 뺀다
      if (/(230|높이)/.test(x) && /안전(하게|한)\s*설치/.test(x)) return "높이 230cm로 제작된 교실바운스 크레용은 실내 설치를 고려한 제품입니다." + (/천장/.test(secBody) ? "" : " 실제 설치 가능 여부는 교실의 천장 높이와 바닥 공간을 확인해 결정합니다.");
      x = x.replace(/(일반적인|일반|기존의?|보통의?|다른)\s*에어\s*바운스(와|들과)\s*(달리|다르게|비교해),?\s*/g, "");
      return /(어디(서나|든|서든|에서든)|어느\s*(교실|곳|공간)(이든|에서나|이나)|무조건|문제\s*없이\s*설치)/.test(x) ? "" : x;
    }).filter(Boolean).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // 근거 없는 다수 원의 선택·인기 단정은 시장놀이 ⑨와 같은 방식으로 앞 절만 맺고, 「최적」은 「알맞은」으로(에어바운스 경로 한정 · fixMarketWording 은 시장 전용 규칙이 섞여 재사용하지 않는다)
    const CROWD = /(?<![가이]\s?)(많은|여러|다수의?|수많은)\s*(원|유치원|어린이집|기관|곳|분|선생님|학부모)(들)?\s*(에서|이|가|께서|의)?\s*[^.!?\n]{0,15}?(주목|인기|찾|선택|관심|호응)|인기\s*(프로그램|가\s*(많|높)|를\s*(끌|얻))/;
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
      const m = x.match(CROWD);
      if (!m) return x;
      const h = x.slice(0, m.index).match(/^(.*?(수\s*있|좋|적합하?|가능하?))(?:어서|어|아|여|해서|해|으며|며|고),?\s*$/);
      return h ? `${h[1].replace(/하$/, "")}${/[좋있]$/.test(h[2]) ? "습" : "합"}니다.` : "";
    }).filter(Boolean).join(" ")).join("\n").replace(/최적화하여/g, "맞춰").replace(/최적의/g, "알맞은").replace(/최적/g, "알맞은").replace(/\n{3,}/g, "\n\n").trim();
    // [AIRBOUNCE-PILOT-01 FINAL PATCH] 선장 판정 표현 3건 국소 보정(에어바운스 경로 한정)
    //   ① 확인 절차를 안심 보장으로 넓힌 말(「확인하므로 걱정 없이 진행」) → 확인 절차만 남긴다
    //   ② 번역투 「(특별한) 솔루션」 → 교실바운스 대여·설치 안내 · 「반장(-노리야놀자)에서 …제공/대여」 조사 교정
    //   ③ 「따로 준비할 것은 없습니다」 → 준비가 필요 없는 범위를 놀이 장비로 한정(전원·공간 확인 문장은 그대로)
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
      if (!/(걱정\s*(없|하지\s*않|마시|안\s*하)|안심하(고|셔도))/.test(x)) return x;
      const c = x.match(/^(.*?(확인|점검|상의|협의|안내))(하|해)(므로|니까|니|기\s*때문에|여|서)\s*,?\s/);
      if (c) return `${c[1]}합니다.`;
      const y = x.replace(/(걱정\s*없이|안심하고)\s*/g, "");
      return /걱정|안심/.test(y) ? "" : y;
    }).filter(Boolean).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    secBody = secBody.replace(/(특별한\s*|맞춤(형)?\s*)?솔루션을/g, "교실바운스 대여와 설치를").replace(/(특별한\s*|맞춤(형)?\s*)?솔루션/g, "교실바운스 대여·설치")
      .replace(/반장-노리야놀자에서(?=\s[^.!?\n]{0,30}(제공|운영|대여|선보|마련))/g, "반장-노리야놀자가").replace(/반장에서(?=\s[^.!?\n]{0,30}(제공|운영|대여|선보|마련))/g, "반장이");
    secBody = secBody.replace(/(따로|별도로|별도의|추가로)\s*준비(하실|할|해야\s*할)\s*(것|게)(은|이|는)?\s*없/g, "$1 준비할 놀이 장비는 없")
      .replace(/(별도의|따로|추가)\s*(추가\s*)?준비\s*없이/g, "놀이 장비를 따로 준비하지 않고도");
    // Hard FACT 고정(SOP §29.2): 질문의 답(230cm + 천장 높이·공간 확인 조건)과 준비 FACT(약 3분)를 해당 섹션에 보장한다
    if (k === "classroom") {
      if (!/230\s*(cm|센티)/.test(secBody)) secBody = `교실바운스 크레용은 교실 천장 아래 설치를 생각해 높이 230cm로 만들었습니다.\n\n${secBody}`;
      if (!/천장\s*높이/.test(secBody)) secBody += "\n\n다만 230cm는 바운스 자체의 높이라, 실제로 설치할 수 있는지는 원 교실의 천장 높이와 바닥 공간을 상담 때 함께 확인해서 정합니다.";
    }
    if (k === "setup" && !/3\s*분/.test(secBody)) secBody += "\n\n송풍기 전기 스위치를 켜면 약 3분 안에 바운스가 부풀어 놀이를 시작할 수 있습니다.";
    if (k === "setup" && !/전원/.test(secBody)) secBody += "\n\n원에서 따로 준비할 놀이 장비는 없고, 송풍기 전원을 연결할 위치는 설치 공간을 확인할 때 함께 봅니다.";
    if (k === "bounce" && !/소재/.test(secBody)) secBody += "\n\n교실바운스 크레용은 캠프장·이벤트용에 쓰는 튼튼한 소재로 만든 교실형 에어바운스입니다.";
    if (k === "closing" && !/아쿠아/.test(secBody)) secBody += "\n\n교실바운스는 크레용 외에 아쿠아 모델도 따로 대여할 수 있습니다.";
    parts.push(`${head}${photo}${secBody}`);
  }
  parts.push(AIRBOUNCE_PILOT.cta.join("\n"));
  const tags = r ? [`#${r.replace(/\s/g, "")}어린이집행사`].concat(AIRBOUNCE_PILOT.hashtags.filter(h => h !== "#찾아가는체험")).slice(0, 12) : AIRBOUNCE_PILOT.hashtags.slice(0, 12);
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim();

  const images = angle.order.map(k => AIRBOUNCE_PILOT.sections[k].photo).filter(Boolean).map(p => ({ alt: p.alt, caption: p.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-AIRBOUNCE-PILOT-01",
    pilotAngle: angle.id,
    pilotQC: auditAirbouncePilot(body),
    validation: { passed: charCount >= 1500, charCount },
  };
}

// ============================================================
// [KINDERGARTEN-WINTER-STORY-PILOT-01] 겨울이야기 전용 Pilot
//   대상: program.id === "winter" 단일 생성만. 블랙라이트·병영·시장놀이·에어바운스 Pilot·다른 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 활동지(활동지-겨울이야기.pptx) · 홈페이지 pid=440 · 사장님 확인값(2026-10-10: 에어텐트 휴식+놀이 · 부스 4개 명칭 · 「눈처럼 보이는 별폼」 허용).
//     data 의 winter 항목(인공눈·눈사람 만들기·스노우볼·붕어빵·자율 운영 등 미확인)은 보존·미변경 — 이 경로에서 쓰지 않는다.
//   Search Question: 「유치원·어린이집 겨울행사, 원 안에서 어떤 겨울 놀이를 할 수 있을까?」 · Core 어린이집 겨울행사(메인) / 유치원 겨울행사(보조)
//   핵심 차별화: 얼음낚시로 잡은 물고기를 먹거리 장터로 가져가 요리 역할놀이로 이어지는 흐름. 가격·설치 시점·천장 높이·최대 인원·운영 시즌은 쓰지 않는다.
//   전화번호·출장지역은 GPT 가 쓰지 않고 마지막에 고정 문구로 붙인다.
// ============================================================
const WINTER_PILOT = {
  angles: [
    { id: "flow", focus: "얼음낚시에서 잡은 물고기를 먹거리 장터로 가져가 요리 역할놀이로 이어지는 놀이 흐름에 힘을 준다",
      titles: ["어린이집 겨울행사｜낚은 물고기로 장터 요리까지, 유치원 겨울이야기",
               "어린이집 겨울행사 놀이 구성｜눈썰매장에서 먹거리 장터까지 이어지는 유치원 겨울이야기"],
      opener: "낚싯대로 물고기를 낚은 아이들이 그 물고기를 들고 옆 먹거리 장터로 옮겨 가는 장면을 떠올리게 하며 시작한다",
      order: ["intro", "space", "sled", "market", "tent", "teacher", "closing"] },
    { id: "space", focus: "외부로 나가지 않고 교실 2개 또는 강당 1개를 겨울축제장으로 바꾸는 공간 구성에 힘을 준다",
      titles: ["어린이집 겨울행사, 교실 2개로 여는 겨울축제｜유치원 겨울이야기",
               "어린이집 겨울행사 원내 체험｜교실 2개 또는 강당 하나로 여는 유치원 겨울이야기"],
      opener: "추운 날씨에 아이들을 데리고 밖으로 나가지 않고도 원 안에서 겨울축제를 열 수 있을지 고민하는 원의 질문으로 시작한다",
      order: ["intro", "space", "sled", "market", "tent", "teacher", "closing"] },
    { id: "festival", focus: "8m 겨울 배경막과 눈처럼 보이는 별폼이 깔린 눈썰매장, 「꽁꽁 얼음 축제 먹거리 장터」로 원이 겨울축제장처럼 바뀌는 분위기에 힘을 준다",
      titles: ["어린이집 겨울행사｜원 안이 겨울축제장이 되는 유치원 겨울이야기",
               "어린이집 겨울행사 추천 구성｜별폼 눈썰매장부터 먹거리 장터까지, 유치원 겨울이야기"],
      opener: "평소 지내던 교실에 겨울 풍경 배경막이 둘러지고 눈처럼 보이는 별폼이 깔린 눈썰매장이 들어선 모습으로 시작한다",
      order: ["intro", "sled", "market", "space", "tent", "teacher", "closing"] },
  ],
  sections: {
    intro: { len: "2문단 · 4~6문장", role: "이번 관점의 시작점(겨울행사 고민 또는 놀이 장면)에서 열고 → 반장 겨울이야기 소개",
      facts: [
        "__OPENER__ (원의 고민을 모든 원의 사실처럼 단정하지 않는다. 예시 문장을 그대로 베끼지 말고 새로 쓴다)",
        "반장-노리야놀자는 유치원·어린이집으로 찾아가는 원방문 체험 프로그램을 직접 기획하고 운영하는 업체다 (경력 연수·설립연도는 쓰지 않는다)",
        "[필수] 반장의 겨울이야기는 원 안을 겨울축제장처럼 꾸며 눈썰매장 에어바운스, 얼음낚시, 먹거리 장터, 대형 에어텐트에서 놀이하는 원방문 겨울 프로그램이다",
        "글을 소개하는 문장('이번 글에서는', '~라는 질문에 답해 보겠습니다', '몇 가지 코너로 소개해 드리겠습니다')은 쓰지 않는다. 바로 실제 겨울행사 이야기로 들어간다",
        "유치원과 어린이집 모두 진행할 수 있다. 글 전체에서 '유치원·어린이집' 두 기관을 함께 독자로 부른다",
      ],
      photo: { alt: "어린이집 겨울행사 겨울이야기 겨울 배경막과 눈썰매장", caption: "겨울축제장으로 바뀐 원 안 공간 (대표사진)" } },
    space: { len: "2문단 · 4~6문장", role: "원 안의 공간 구성 (교실 2개 또는 강당 1개)",
      facts: [
        "[필수] 겨울이야기는 교실 2개에 나누어 설치하거나 강당 1개에 설치한다",
        "[필수] 교실 공간이 좁으면 축소해서 설치할 수 있다. 어떻게 줄일지는 상담 때 원의 공간을 보고 정한다 (어떤 코너를 빼는지, 교실 크기·천장 높이 숫자는 쓰지 않는다)",
        "[필수] 교실 1은 눈썰매장 에어바운스와 얼음낚시, 교실 2는 먹거리 장터와 대형 에어텐트로 꾸민다",
        "[필수] 코너마다 겨울 풍경이 그려진 배경막을 두르고, 이와 따로 8m 대형 겨울 배경막이 공간 전체를 겨울 분위기로 바꾼다 (8m 배경막이 코너마다 있다고 쓰지 않는다. 배경막 개수·위치는 쓰지 않는다)",
        "반장이 이 겨울 공간을 준비해 설치한다 (장비 이름을 한 문장에 길게 나열하지 않는다. 장비 설명은 각 놀이 섹션에서 한다. 설치 시각·전날 설치·회수 시점은 쓰지 않는다)",
      ],
      photo: { alt: "유치원 겨울행사 교실에 설치된 겨울 배경막", caption: "겨울 풍경 배경막으로 꾸민 교실" } },
    sled: { len: "2~3문단 · 6~8문장", role: "교실 1 — 눈썰매장과 얼음낚시",
      facts: [
        "[필수] 눈썰매장은 아이들이 좋아하는 에어바운스 놀이에 눈처럼 보이는 별폼을 더해 겨울 느낌을 낸 코너다 (별폼을 인공눈·진짜 눈이라고 쓰지 않는다. 차갑다고 쓰지 않는다)",
        "[필수] 에어바운스에는 한 번에 2~3명 정도가 타고, 돌아가며(로테이션) 여러 아이가 놀이한다 (다른 인원 숫자를 만들지 않는다)",
        "에어바운스는 미끄럼틀을 타고 내려오며 노는 구조다 (사진 속 실제 모습. 썰매를 실제로 탄다고 쓰지 않는다)",
        "[필수] 얼음낚시는 동그란 원형 낚시터에서 자석 낚싯대로 물고기 모형을 낚는 놀이다. 낚싯대는 약 10개 내외다",
        "낚시터 주변에 작은 의자를 두고 앉아서 낚시한다 (사진 속 실제 모습)",
        "아이 이름, 아이의 대사, 특정 원에서 있었던 장면은 쓰지 않는다",
      ],
      photo: { alt: "어린이집 겨울행사 별폼 눈썰매장 에어바운스", caption: "눈처럼 보이는 별폼을 더한 눈썰매장" } },
    market: { len: "2~3문단 · 6~8문장", role: "얼음낚시에서 먹거리 장터로 이어지는 놀이 (이 글의 핵심 차별화)",
      facts: [
        "[필수] 얼음낚시에서 낚은 물고기를 먹거리 체험장(먹거리 장터)으로 가져가 요리하는 역할놀이로 이어진다 (이 연결을 글의 중심 장면으로 구체적으로 그린다)",
        "[필수] 먹거리 장터에는 부산어묵, 매콤달콤 떡볶이, 군고구마, 밥도둑 자반(생선) 부스 4개가 있고, 「꽁꽁 얼음 축제 먹거리 장터」 현수막이 걸린다 (이 4개 외의 음식·부스를 만들지 않는다)",
        "[필수] 음식은 실제로 조리하거나 먹는 것이 아니라 모형으로 하는 역할놀이다 (맛을 보거나 냄새를 맡는다고 쓰지 않는다)",
        "아이들은 파는 사람과 사는 사람이 되어 겨울 길거리 먹거리 장터 놀이를 할 수 있다 (프로그램 설명으로 쓴다)",
        "놀이 화폐·가격표·계산 놀이는 쓰지 않는다 (재료에 없다)",
      ],
      photo: { alt: "유치원 겨울행사 먹거리 장터 역할놀이 부스", caption: "부산어묵·떡볶이·군고구마·자반 부스가 있는 먹거리 장터" } },
    tent: { len: "1~2문단 · 3~5문장", role: "대형 에어텐트",
      facts: [
        "[필수] 대형 에어텐트를 설치해, 아이들이 쿠션에서 쉬기도 하고 친구들과 함께 놀이도 하는 공간으로 쓴다",
        "뛰고 움직이는 놀이 사이에 잠시 쉬어 가는 자리가 된다는 흐름으로 쓴다 (텐트 안 장난감 종류는 만들지 않는다)",
      ],
      photo: { alt: "어린이집 겨울행사 대형 에어텐트 쉼 공간", caption: "쉬기도 하고 함께 놀이도 하는 대형 에어텐트" } },
    teacher: { len: "2문단 · 4~6문장", role: "선생님 준비와 운영 (원이 맡는 부분)",
      facts: [
        "[필수] 행사 전에 수업 시간에 아이들과 역할을 나누고 사전교육을 해 두면 당일 계획적으로 놀이할 수 있다",
        "[필수] 에어바운스는 한 번에 많은 아이가 올라가면 위험하므로, 선생님이 순서대로 놀이하도록 지도한다 ('안전하다', '사고가 없다'처럼 보장하지 않는다)",
        "당일 놀이는 원·선생님·아이들이 주어다. 반장이 당일 진행·상주한다고 쓰지 않는다. 안전요원·진행 요원이 있다고 쓰지 않는다",
        "설치하는 날짜·시각(당일 설치·전날 설치)과 설치 뒤 반장이 하는 일(돕는다·지원한다·함께한다)은 쓰지 않는다 (재료에 없다)",
        "'선생님이 손댈 일이 없다', '자율 운영', '대기 없이'처럼 쓰지 않는다",
      ] },
    closing: { len: "2문단 · 4~6문장", role: "예약을 고민하는 원이 상담을 결심할 이유로 마무리 + 상담 안내 1회",
      facts: [
        "[필수] 4개 코너 이름을 다시 나열하지 않는다. 앞에서 그린 겨울축제 장면을 한 번 떠올리게 하는 정도로만 잇는다",
        "[필수] 예약할 이유: 반장이 원 안의 겨울 공간을 직접 준비해 설치하므로, 원은 행사 전에 아이들과 역할을 나누고 사전교육을 하는 준비에 집중하면 된다 (원이 준비할 것이 '전혀 없다'고 쓰지 않는다)",
        "[필수] 예약할 이유: 교실이 좁은 원도 축소 설치를 상담할 수 있으니, 공간 때문에 망설였다면 먼저 상담해 볼 수 있다 (반드시 설치된다고 쓰지 않는다)",
        "[필수] 상담 때 행사 날짜, 원아 수와 반 수, 설치할 교실이나 강당의 공간을 알려 달라고 안내한다",
        "'언제든지 연락 주시면 친절히 안내해 드리겠습니다', '큰 장점입니다', '많은 관심 부탁드립니다' 같은 상투적인 맺음말은 쓰지 않는다",
      ] },
  },
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"],
  hashtags: ["#어린이집겨울행사", "#유치원겨울행사", "#겨울이야기", "#겨울축제놀이", "#얼음낚시놀이", "#먹거리장터", "#어린이집행사", "#유치원행사", "#실내놀이", "#원방문체험", "#찾아가는체험", "#반장노리야놀자"],
};

function buildWinterPilotPrompt(title, angle) {
  const secText = angle.order.map((k, i) => {
    const s = WINTER_PILOT.sections[k];
    return `${i + 1}. key="${k}" — 역할: ${s.role} / 분량: ${s.len}\n` + s.facts.map(f => `   - ${f.replace("__OPENER__", angle.opener)}`).join("\n");
  }).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장-노리야놀자'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희 반장'으로 부르고, 반장이 주어일 때는 '반장은', '반장이'처럼 쓴다('반장에서는'처럼 쓰지 않는다). '저희 원', '우리 원'이라고 쓰지 않는다. 독자의 원은 그냥 '원'이라고 부른다. 원의 아이들은 '아이들' 또는 '원아들'이라고 부른다.",
    "독자는 겨울행사를 고민하는 유치원·어린이집 원장님과 행사 담당 선생님이다. 이 글은 '유치원·어린이집 겨울행사, 원 안에서 어떤 겨울 놀이를 할 수 있을까?'라는 질문에 답한다. 읽고 나서 '우리 원에서도 이렇게 겨울축제를 열 수 있겠다' 하는 장면이 그려지고, 예약 상담으로 이어지게 쓴다.",
    "이 글의 상품명은 '겨울이야기'다. 글의 중심은 놀이를 나열하는 것이 아니라 눈썰매장·얼음낚시·먹거리 장터·에어텐트가 하나의 겨울축제로 이어지는 흐름, 특히 얼음낚시에서 낚은 물고기를 먹거리 장터로 가져가 요리 역할놀이로 이어지는 장면이다.",
    "이 글은 행사 후기가 아니라 프로그램 소개 글이다. 특정 날짜·특정 원에서 있었던 일처럼 쓰지 않는다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 숫자·크기·장비·시간·가격·인원·연령·월·시즌·수상·경력을 만들지 않는다. 숫자는 교실 2개, 강당 1개, 2~3명, 낚싯대 약 10개, 부스 4개, 8m 배경막만 쓴다.",
    "재료에 없는 놀이와 소품을 만들지 않는다: 인공눈, 진짜 눈, 눈사람 만들기, 눈싸움, 눈 뭉치기, 스노우볼, 목도리·모자 꾸미기, 만들기 작품·포장, 붕어빵, 호떡, 생선구이, 빙어, 썰매 타기, 포토존 촬영 서비스, 놀이 화폐. 겨울 배경막 그림 속 풍경은 배경으로만 쓴다.",
    "먹거리는 모형으로 하는 역할놀이다. 실제로 조리하거나 맛보거나 먹는다고 쓰지 않는다.",
    "안전요원·진행 요원 배치, 안전 보장, 사고 예방 효과, 재예약·인기·만족도('많은 원에서 찾는다')를 만들지 않는다. '대기 없이', '자율 운영', '선생님 손이 필요 없다'처럼 쓰지 않는다.",
    "아이 이름을 쓰지 않는다. 특정 아이가 한 말이나 행동을 실제 있었던 일처럼 쓰지 않는다. 따옴표로 된 대사는 쓰지 않는다. 아이들 모습은 '~할 수 있습니다', '~하게 됩니다'처럼 프로그램 설명으로 쓴다.",
    "자연스러운 홍보 표현('평소 지내던 교실이 하루 동안 겨울축제장으로 바뀝니다', '낚싯대를 들고 장터로 향하는 발걸음') 과 겨울 분위기 묘사는 적극적으로 써도 된다. 효과·성과를 보장하는 문장, 근거 없는 최상급·순위·다른 업체와 비교하는 표현은 쓰지 않는다.",
    "반장이 하는 일은 겨울 공간을 준비해 설치하는 것이다. 반장을 주어로 '놀이를 진행한다', '아이들을 지도한다'처럼 쓰지 않는다. 당일 놀이의 주어는 원·선생님·아이들이다. 반장이 하지 않는 일을 부정문으로 적지 않는다.",
    "섹션마다 앞 섹션을 이어받아 연결한다. 한 섹션에서 설명한 내용을 다른 섹션에서 다시 설명하지 않는다. 같은 문장을 두 번 쓰지 않는다.",
    "다른 업체·다른 업종·다른 프로그램 이야기는 쓰지 않는다. 반장을 '전문가', '전문 업체'라고 부르지 않는다.",
    "본문에 전화번호·출장지역·가격·할인을 쓰지 않고, '연락처는 별도로 안내됩니다' 같은 안내 문장도 쓰지 않는다.",
    "굵게(**) 같은 마크다운 기호를 쓰지 않는다. 소항목이 필요하면 짧은 한 줄 제목으로 쓴다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다('섹션', '코너 1' 같은 말 금지). body 는 문단 사이를 빈 줄로 나눈다.",
    "소제목과 문장 표현은 매번 새로 쓴다. 재료 문장을 그대로 옮겨 적지 말고 자연스럽게 풀어 쓴다(숫자와 부스 이름은 그대로 둔다).",
    "[필수] 표시 재료는 하나도 빠뜨리거나 뭉뚱그리지 않는다.",
    "섹션마다 적힌 분량을 지킨다. 글 전체 본문은 공백 포함 약 2,500~3,200자다. 같은 뜻을 반복해서 늘리지 않고, 겨울 공간의 모습·놀이가 이어지는 동선·장터 역할놀이 장면을 구체적으로 그려 분량을 채운다.",
    "번역투·딱딱한 표현('반장 측', '~하는 경우가 많습니다', '~하시는 분들이 많으실 텐데요', '솔루션')은 쓰지 않는다. 업체 사장님이 직접 소개하듯 자연스럽게 쓴다.",
  ].join("\n");
  const user = `제목: ${title}\n이번 글의 관점: ${angle.focus}\n(관점에 맞는 섹션은 조금 더 자세히, 나머지는 핵심만 쓴다. 단 모든 섹션의 재료는 빠뜨리지 않는다.)\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 금지 FACT·노출·누락을 문장 단위로 수집해 사람이 판정한다(차단하지 않음).
function auditWinterPilot(text) {
  const sentences = text.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  const numbers = (text.match(/\d+(\.\d+)?(\s*~\s*\d+)?\s*(cm|센티|m|미터|mm|명|분|초|시간|개|대|곳|반|평|원|년|세|kg|월|일|교실)/g) || []);
  const ALLOWED_NUM = /^(2\s*~\s*3\s*명|3\s*명|10\s*개|4\s*개|8\s*(m|미터)|2\s*개|1\s*개|2\s*교실)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  return {
    wrongFacts: pick(/(아이스크림|핫도그|솜사탕|와플|인공\s*눈|진짜\s*눈|눈사람\s*(을\s*)?(만들|키트|꾸미)|눈\s*(싸움|뭉치)|스노우\s*볼|스노볼|목도리|모자\s*(쓰|꾸미)|포장\s*(서비스|해)|붕어빵|호떡|생선\s*구이|빙어|썰매를?\s*(타|끌)|화폐|가격표|맛(을|있게)?\s*(보|봐)(?!거나|지\s*않|는\s*것이\s*아니)|냄새|먹어\s*(보|봐)|직접\s*조리|실제로\s*(조리|요리)(하|해)(?!거나|지\s*않|는\s*것이\s*아니)|안전\s*요원|진행\s*요원|상주|전날|당일[^.!?]{0,6}설치|회수|재예약|다시\s*찾|인기|만족도|많은\s*(원|유치원|어린이집|기관)|\d+\s*만\s*원|무료|할인|경력|설립|\d+\s*년\s*(동안|간|째))/),
    unsureClaims: pick(/(보장|안전합니다|안전하게\s*(즐|놀)|사고\s*(없|걱정|예방)|걱정\s*없|확실히|모두\s*좋아|최고|최상|최적|압도|1위|무조건|어디(든|서나|서든|에서든)|언제든|대기\s*(없|시간\s*없)|기다리지\s*않|걱정할\s*필요|자율\s*(운영|진행)|손\s*(댈|갈)\s*(일|것)?이?\s*없|반장[^.!?]{0,40}(돕|지원|함께))/),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    banjangParticle: pick(/(반장|노리야놀자)에서/),
    banjangRunsDay: pick(/반장(이|은|도)?[^.]{0,20}(진행합니다|진행해|진행하는|이끌|지도)/),
    quotes: text.match(/["“'‘][^"“”'‘’\n]{1,40}["”'’]/g) || [],
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    leaks: pick(/(key=|섹션|재료:|\[섹션|JSON|heading|body|프롬프트|지시문|관점:)/),
    foreignIndustry: pick(/(성형|피부과|시술|임플란트|한의원|병영|블랙라이트|시장놀이|교실바운스)/),
    selfClaims: pick(/(전문가|전문\s*업체)/),
    hardFactMissing: [["별폼", /별폼/], ["2~3명", /2\s*~\s*3\s*명/], ["얼음낚시", /얼음\s*낚시/], ["자석", /자석/], ["낚싯대 약 10개", /10\s*개/], ["낚시→장터 연결", /(낚[은아]|잡은)[^.!?]{0,40}(장터|먹거리)/], ["부산어묵", /부산\s*어묵/], ["떡볶이", /떡볶이/], ["군고구마", /군고구마/], ["자반", /자반/], ["모형", /모형/], ["에어텐트", /에어\s*텐트/], ["교실 2개", /(교실\s*2\s*개|두\s*개의?\s*교실|교실\s*두\s*(개|곳)|2\s*교실)/], ["강당 1개", /강당/], ["축소 설치", /축소/], ["8m 배경막", /8\s*(m|미터)/], ["사전 역할분담", /역할/], ["순서 지도", /순서/]]
      .filter(([, re]) => !re.test(text)).map(([k]) => k),
    hasKindergarten: /유치원/.test(text), hasDaycare: /어린이집/.test(text),
    repeats,
    charCount: text.length,
  };
}

async function generateWinterPilot({ region }) {
  const r = (region || "").trim();
  const angle = WINTER_PILOT.angles[Math.floor(Math.random() * WINTER_PILOT.angles.length)];
  const baseTitle = angle.titles[Math.floor(Math.random() * angle.titles.length)];
  const title = r ? `${r} ${baseTitle}` : baseTitle;
  const { system, user } = buildWinterPilotPrompt(title, angle);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (angle.order.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("겨울이야기 Pilot 생성 실패");

  const parts = [];
  for (const k of angle.order) {
    const def = WINTER_PILOT.sections[k];
    const s = parsed.find(x => x.key === k);
    const photo = def.photo ? `[이미지: ${def.photo.alt} | ${def.photo.caption}]\n\n` : "";
    const OUR_WON = /(우리|저희)\s*원(?=\s|에|의|을|이|은|는|으로|$)/g; // 화자는 반장 — 독자의 원은 그냥 「원」
    const headText = String(s.heading || "").replace(/\*\*/g, "").trim().replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2").replace(OUR_WON, "원");
    const head = k === "intro" ? "" : `${headText}\n\n`;
    let secBody = String(s.body).replace(/\*\*/g, "").trim().replace(OUR_WON, "원")
      .replace(/반장-노리야놀자에서는/g, "반장-노리야놀자는").replace(/반장에서는/g, "반장은").replace(/반장에서도/g, "반장도").replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    // 문장 국소 보정(겨울 경로 한정): 반장이 하지 않는 일을 적은 부정문·안심 보장 문장은 빼고, 지도·순서 문맥 밖의 「안전하게」만 지운다
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).map(x => {
      if (/반장(은|이|도)?[^.!?]{0,15}((맡|진행하|상주하|함께하)지\s*않|(진행|상주)(하는|하거나)[^.!?]{0,15}(것이\s*아니|것은\s*아니))/.test(x)) return "";
      if (/반장(은|이|도)?[^.!?]{0,25}(빠지|떠나|철수|자리를\s*비우|두지\s*않)/.test(x) || /(안전|진행)\s*요원/.test(x)) return ""; // [PREDEPLOY-01] 설치 후 반장 행동·요원 배치는 미확인 — 같은 부정문 필터의 누락 보강
      // [PREDEPLOY-01] 원의 준비·운영 부담이 없다는 단정 → 실제 역할(설치는 반장)로 · 반장 언급이 없으면 문장만 뺀다
      if (/(원|선생님)(에서는|에서도|은|는|께서는|도)?[^.!?]{0,20}(걱정할\s*필요(가|는)?\s*없|부담(이|은|가)?\s*(전혀\s*)?없|신경\s*(쓸|쓰실)\s*(것|일|필요)(이|은|가|는)?\s*없)/.test(x)) return /반장/.test(x) ? "겨울 공간 설치는 반장이 맡습니다." : "";
      // [PREDEPLOY-01] 확인되지 않은 대기시간·대기 감소 단정: 대기 시간이 짧다·줄어든다는 문장은 빼고, 「오래 기다리지 않고」「대기 없이」 구절만 지운다
      if (/(대기|기다리는)\s*(시간)?(이|은|가)?\s*(짧|줄|거의\s*없|없)/.test(x)) return "";
      x = x.replace(/(오래\s*|크게\s*|길게\s*)?(기다리지\s*않고(도)?|기다릴\s*필요\s*(가\s*)?없이|기다림\s*없이|대기\s*(시간\s*)?없이)\s*/g, "");
      if (/(걱정\s*(없|하지\s*않|마시)|안심하(고|셔도))/.test(x)) return "";
      if (/(당일|전날|하루\s*전)[^.!?]{0,6}설치/.test(x) || /반장(은|이|도)?[^.!?]{0,70}(돕습니다|돕겠습니다|도와\s*드립|지원합니다|함께합니다)/.test(x)) return ""; // 설치 시점·당일 반장 역할은 미확인
      if (/(아이스크림|붕어빵|호떡|핫도그|솜사탕|와플|김밥|라면|만두|피자|치킨|햄버거|국수|과자|사탕)/.test(x)) return ""; // [QUALITY-FIX-01] 실제 4개 부스 밖 먹거리
      if (/많은\s*(원|유치원|어린이집|기관|곳)/.test(x)) return ""; // 근거 없는 다수 원 단정
      if (/(이번\s*글|이\s*글)에서(는)?|라는\s*질문에|코너로\s*(답|소개|안내)/.test(x)) return ""; // [QUALITY-FIX-01] 글 소개 메타 문장
      if (k === "closing" && ["눈썰매", "낚시", "장터", "텐트"].filter(w => x.includes(w)).length >= 3) return ""; // [QUALITY-FIX-01] 마무리의 코너 재나열
      // [FINAL-FIX-02] 원의 준비가 필요 없다고 읽히는 과장 → 반장이 덜어 주는 범위(공간 준비)로 한정(역할분담·사전교육·지도는 원의 몫으로 유지)
      x = x.replace(/(특별한|별도의?|따로|별다른|아무런?)\s*준비\s*없이(도)?\s*(손쉽게|쉽게|간편하게)?\s*/g, "공간 준비 부담을 덜고 ")
        .replace(/(따로|별도로|추가로)?\s*준비(할|하실)\s*(것|게)(이|은|는)?\s*(전혀\s*)?없/g, "겨울 공간을 따로 꾸밀 필요는 없");
      // [FINAL-FIX-02] 「코너마다 … 8m」처럼 8m 를 코너별 배경막으로 넓힌 문장은 8m 만 뺀다(8m 는 아래 Hard FACT 로 따로 잇는다)
      //   쉼표·마침표로 나뉜 다른 구절의 8m(「코너마다 배경막을 두르고, 특히 8m 대형 배경막이…」)는 정상 문장이라 그대로 둔다
      if (/(코너마다|각\s*코너|코너별|코너\s*곳곳)[^,.!?]*8\s*(m|미터)/.test(x)) x = x.replace(/((코너마다|각\s*코너|코너별|코너\s*곳곳)[^,.!?]*?)8\s*(m|미터)(에\s*이르는|짜리|크기의|의)?\s*/g, "$1");
      // [FINAL-FIX-02] 근거 없는 인기 단정 → 코너가 마련되어 있다는 사실로
      x = x.replace(/(큰|많은|높은|꾸준한)?\s*인기를\s*(끌고\s*있|얻고\s*있|끌|얻)습니다/g, "마련되어 있습니다")
        // [PRODUCTION-FIX-01] 「인기 만점의 코너」「인기 코너」처럼 인기를 단정하는 수식어만 지워 구성 설명으로 남긴다(「즐거운」「신나는」 등은 보존)
        .replace(/인기\s*(만점|최고|폭발|짱)(인|의)?\s*/g, "")
        .replace(/(\S+에게\s*)?인기(가|도)?\s*(많|높|좋)은\s*/g, "")
        .replace(/인기(가|도)?\s*(많|높|좋)습니다/g, "마련되어 있습니다")
        .replace(/인기\s*(코너|프로그램|놀이|체험)/g, "즐거운 $1");
      x = x.replace(/(유치원\s*(과|·|,)\s*어린이집)\s*어디(서나|든|서든|에서든|에서나)/g, "$1 모두");
      if (!/(지도|수칙|주의|지켜|순서)/.test(x)) x = x.replace(/(즐겁고\s*)?안전하(게|고)\s*/g, (m, a) => (a ? "즐겁게 " : ""));
      return x;
    }).filter(Boolean).join(" ")).join("\n").replace(/최적의/g, "알맞은").replace(/최적/g, "알맞은").replace(/\n{3,}/g, "\n\n").trim();
    // Hard FACT 고정(SOP §29.2): 질문의 답(4개 코너·공간)과 핵심 차별화(낚시 → 장터 연결)·운영 FACT 를 해당 섹션에 보장한다
    //   [FINAL-FIX-02] 누락 FACT 는 독립 문단으로 붙이지 않고, 같은 주제를 말하는 기존 문단 끝에 잇는다(주제 문단이 없으면 마지막 문단). 이미 일부가 있으면 빠진 부분만 짧게 잇는다
    const attach = (sentence, topicRe) => {
      const paras = secBody.split(/\n\n+/);
      let i = -1;
      for (let j = paras.length - 1; j >= 0; j--) if (topicRe.test(paras[j])) { i = j; break; }
      if (i < 0) i = paras.length - 1;
      const p = paras[i].trim();
      paras[i] = `${p}${/[.!?]$/.test(p) ? "" : "."} ${sentence}`;
      secBody = paras.join("\n\n");
    };
    if (k === "space") {
      if (!/강당/.test(secBody)) attach("교실 2개에 나누어 설치하거나 강당 1개에 설치할 수 있습니다.", /(교실|설치)/);
      if (!/축소/.test(secBody)) attach("교실 공간이 좁으면 축소해서 설치할 수 있고, 줄이는 방법은 상담 때 원의 공간을 보고 정합니다.", /(교실|강당|설치)/);
      // [FINAL-FIX-02] 8m 는 코너별 배경막과 따로 「더해지는」 대형 배경막으로만 잇는다(코너마다 8m 가 있다는 뜻으로 넓히지 않고, 개수·위치를 만들지 않는다)
      if (!/8\s*(m|미터)/.test(secBody)) {
        // 코너 구절 밖에서 이미 말한 「대형 (겨울) 배경막」이 있으면 그 앞에 8m 만 붙이고, 없을 때만 한 문장을 잇는다(같은 뜻 두 번 쓰기 방지)
        let done = false;
        secBody = secBody.replace(/대형\s*(겨울\s*)?배경막/g, (m, w, off, str) => {
          if (done) return m;
          const clause = str.slice(Math.max(str.lastIndexOf(",", off), str.lastIndexOf(".", off), str.lastIndexOf("\n", off)) + 1, off);
          if (/코너/.test(clause)) return m;
          done = true; return "8m " + m;
        });
        if (!done) attach("여기에 8m 대형 겨울 배경막이 더해져 공간 전체가 겨울 분위기로 바뀝니다.", /배경막/);
      }
    }
    if (k === "sled") {
      if (!/별폼/.test(secBody)) attach("에어바운스에는 눈처럼 보이는 별폼을 더해 겨울 느낌을 냈습니다.", /(눈썰매|에어바운스)/);
      if (!/2\s*~\s*3\s*명/.test(secBody)) attach("에어바운스에는 한 번에 2~3명 정도가 타고, 돌아가며 여러 아이가 놀이합니다.", /(에어바운스|미끄럼)/);
      const hasMag = /자석/.test(secBody), hasTen = /10\s*개/.test(secBody);
      if (!hasMag && !hasTen) attach("얼음낚시는 동그란 원형 낚시터에서 자석 낚싯대로 물고기 모형을 낚는 놀이로, 낚싯대는 약 10개 내외입니다.", /낚시/);
      else if (!hasMag) attach("낚싯대 끝의 자석으로 물고기 모형을 낚아 올립니다.", /낚시/);
      else if (!hasTen) attach("낚싯대는 약 10개 내외로 준비됩니다.", /낚시/);
    }
    if (k === "market") {
      if (!/(낚[은아]|잡은)[^.!?]{0,40}(장터|먹거리)/.test(secBody)) secBody = "얼음낚시에서 낚은 물고기는 그대로 먹거리 장터로 가져가 요리하는 역할놀이로 이어집니다. " + secBody;
      if (!(/부산\s*어묵/.test(secBody) && /떡볶이/.test(secBody) && /군고구마/.test(secBody) && /자반/.test(secBody))) attach("장터에는 부산어묵, 매콤달콤 떡볶이, 군고구마, 밥도둑 자반(생선) 부스 4개가 있습니다.", /(장터|부스)/);
      if (!/모형/.test(secBody)) attach("음식은 실제로 조리하는 것이 아니라 모형으로 하는 역할놀이입니다.", /(요리|역할|부스)/);
    }
    if (k === "tent") {
      const rest = /(쉬|쉴|쉼|휴식)/.test(secBody), play = /놀이/.test(secBody);
      if (!rest && !play) attach("대형 에어텐트는 아이들이 쿠션에서 쉬기도 하고 친구들과 함께 놀이도 하는 공간입니다.", /텐트/);
      else if (!play) attach("친구들과 함께 놀이도 할 수 있습니다.", /텐트/);
      else if (!rest) attach("쿠션에서 잠시 쉬어 갈 수도 있습니다.", /텐트/);
    }
    if (k === "teacher") {
      if (!/역할/.test(secBody)) attach("행사 전 수업 시간에 아이들과 역할을 나누고 사전교육을 해 두면 당일 계획적으로 놀이할 수 있습니다.", /(행사\s*전|사전|준비)/);
      if (!/순서/.test(secBody)) attach("에어바운스는 한 번에 많은 아이가 올라가면 위험하므로 선생님이 순서대로 놀이하도록 지도해 주세요.", /에어바운스/);
    }
    parts.push(`${head}${photo}${secBody.replace(/\n{3,}/g, "\n\n").trim()}`);
  }
  parts.push(WINTER_PILOT.cta.join("\n"));
  const tags = r ? [`#${r.replace(/\s/g, "")}어린이집겨울행사`].concat(WINTER_PILOT.hashtags.filter(h => h !== "#찾아가는체험")).slice(0, 12) : WINTER_PILOT.hashtags.slice(0, 12);
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim();

  const images = angle.order.map(k => WINTER_PILOT.sections[k].photo).filter(Boolean).map(p => ({ alt: p.alt, caption: p.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-WINTER-STORY-PILOT-01",
    pilotAngle: angle.id,
    pilotQC: auditWinterPilot(body),
    validation: { passed: charCount >= 1500, charCount },
  };
}

// ============================================================
// [KINDERGARTEN-CAMPING-01] 캠핑놀이체험 전용 Pilot
//   대상: program.id === "camping" 단일 생성만. 블랙라이트·병영·시장놀이·에어바운스·겨울이야기 Pilot·다른 프로그램·묶음·보완 경로는 기존 그대로.
//   FACT 출처: 활동지(활동지-캠핑놀이체험.pptx) · 홈페이지 pid=396 · 현장 사진 · 사장님 확인값(2026-10-10: 자석낚시 · 텐트 4동 기본/공간 맞춤 ·
//     불판 2·화로불 1 = 조명 효과로 뜨겁지 않음 · 먹거리 모형 7종 · 대형 조립식 해먹 1개 약 3명 · 물고기 약 20마리 · 곤충 = 캠핑장에서 흔히 보는 종류(수량 미지정) ·
//     밤놀이 = 불을 끄면 어두워지는 공간에서만 효과(창문 많은 공간은 약함) · 대부분 스페셜 놀이 데이 / 부모참여수업 가능) · 공통 운영(전날 설치 → 당일 원 자체 놀이 · 반별 순서).
//     data·playConfig·DETAIL_MAP 의 camping 항목(모닥불존·화로 2·별자리·마시멜로·핫도그·8m 배경막 3장·독보적 등)은 보존·미변경 — 이 경로에서 쓰지 않는다.
//   Search Question: 「원 안에서 하는 캠핑놀이, 아이들은 무엇을 하고 놀까?」(보조: 업체에 맡기면 반별로 충분히 놀 수 있을까?) · Core 어린이집 캠핑놀이(메인) / 유치원 캠핑놀이(보조)
//   세부 수량은 허위 방지 기준일 뿐 매번 나열하지 않는다(쓰면 정확히). 관점(play·space·day)마다 섹션 구성·깊이·전개가 다르다.
//   전화번호·출장지역은 GPT 가 쓰지 않고 마지막에 고정 문구로 붙인다.
// ============================================================
const CAMPING_FACTS = {
  space: [
    "[필수] 교실 2개에 나누어(교실1 캠핑체험 · 교실2 자연놀이체험) 설치하거나, 강당 한 곳에 모두 설치할 수 있다",
    "강당 한 곳에 모두 설치하면 물품이 많아 꽉 찬 느낌이 들 수 있다",
    "교실 공간이 작으면 현장 상황에 맞게 줄여서 설치한다 (무엇을 빼는지, 교실 크기·천장 높이 숫자는 쓰지 않는다)",
    "공간 둘레에 캠핑장·숲 그림 배경막을 두른다 (배경막 크기·개수는 쓰지 않는다)",
    "반장이 이 캠핑 공간을 준비해 설치한다",
  ],
  camp: [
    "[필수] 교실1(캠핑체험)은 반장이 텐트를 쳐 둔 캠핑장으로 꾸미고, 아이들은 그 안에서 고기를 굽고 식사 준비를 하는 캠핑 역할놀이를 한다",
    "텐트는 기본 4동이다 (공간이 작으면 현장 상황에 맞게 설치한다. 무엇을 몇 개 빼거나 줄이는지는 쓰지 않는다)",
    "캠핑 테이블 2개와 캠핑 의자 6개가 놓인다",
    "[필수] 고기불판 2개와 화로불 1개는 진짜 불이 아니라 조명으로 불빛을 낸 것이라, 실감 나 보이지만 뜨겁지 않다 (불판·화로를 말할 때는 조명이라 뜨겁지 않다는 점을 함께 쓴다. 뜨겁지 않다는 사실을 '안전하다', '안전하게'로 넓혀 쓰지 않는다)",
    "[필수] 먹거리는 모두 모형이다: 삼겹살, 소시지, 새우, 오징어, 문어, 등심, 라면 (일부만 골라 써도 된다. 이 밖의 음식은 만들지 않는다)",
    "집게·접시·컵·냄비 같은 캠핑 식기로 굽고 차리고 나누어 먹는 흉내를 낸다 (실제로 먹거나 맛보지 않는다)",
    "화로 옆에서 장작을 쌓는 장작 놀이를 한다",
    "대형 조립식 해먹 1개에서 약 3명이 함께 놀 수 있다 (교실·강당 안이므로 하늘·별·바람처럼 바깥 풍경을 보는 장면으로 쓰지 않는다)",
    "텐트 안에서 쉬거나 친구들과 모여 앉아 놀 수 있고, 텐트 안에는 등이 켜진다",
    "텐트·식사 준비·장작 놀이·해먹 타기 가운데 아이들이 원하는 놀이를 골라 한다",
  ],
  nature: [
    "[필수] 교실2(자연놀이체험)는 잔디밭 매트와 파란 개울 매트를 깔아 캠핑장 옆 자연 놀이터처럼 꾸민다",
    "[필수] 진짜 낚싯대로 개울 매트 위의 물고기를 낚는 자석낚시를 한다. 낚싯대는 6개다 (개수는 쓰지 않아도 된다)",
    "물고기는 약 20마리이고, 잉어·고등어처럼 생김새가 다른 물고기들이 섞여 있다",
    "잔디밭에는 메뚜기·사마귀·잠자리·사슴벌레·장수풍뎅이·무당벌레처럼 캠핑장에서 흔히 볼 수 있는 곤충 모형이 있다 (곤충이 몇 종·몇 마리인지 숫자는 쓰지 않는다)",
    "곤충 모형은 손에 들고 살펴볼 수 있을 만큼 큼직하다",
    "길이 3m의 큰 뱀 모형이 있다",
    "곤충의 종류와 생김새, 물고기의 종류를 알아보고, 잡은 물고기나 곤충을 들고 사진을 찍을 수 있다",
  ],
  night: [
    "[필수] 캠핑놀이는 낮 놀이와 밤 놀이를 함께 할 수 있다",
    "[필수] 지하나 강당처럼 불을 끄면 어두워지는 공간에서는, 실내등을 끄고 불판·화로의 불빛과 텐트 안 등만 남겨 야간 캠핑 분위기를 낼 수 있다",
    "[필수] 창문이 많은 공간은 실내등을 꺼도 밝아서 야간 분위기 효과가 약하다 (이 조건을 반드시 함께 쓴다. 모든 원에서 똑같이 된다고 쓰지 않는다)",
  ],
  operation: [
    "[필수] 반장이 행사 전날 설치하고, 설치할 때 선생님께 운영 방법을 안내한다",
    "[필수] 행사 당일에는 원이 자체적으로 놀이한다 (당일 놀이의 주어는 원·선생님·아이들이다)",
    "[필수] 보통 한 반씩 놀이하고, 다음 반이 이어서 들어오는 방식으로 운영한다",
    "설치·회수 시간은 원과 상의해 정한다 (구체적인 시각은 쓰지 않는다)",
    "행사 전 수업 시간에 아이들과 역할을 나누고 사전교육을 해 두면 당일 계획적으로 놀이할 수 있다",
    "이용 시간을 보장하지 않는다: '시간제한 없이', '하루 종일', '무제한', '원하는 만큼'이라고 쓰지 않는다",
  ],
  use: [
    "이 프로그램은 주로 아이들의 '스페셜 놀이 데이' 행사로 쓰이고, 부모참여수업으로도 진행할 수 있다 ('대부분의 원', '많은 원'처럼 원의 수를 말하지 않는다. 부모참여수업이 많다·사랑받는다고 쓰지 않는다)",
  ],
};

const CAMPING_PILOT = {
  angles: [
    { id: "play", focus: "아이들이 원 안의 캠핑장에서 실제로 무엇을 하며 노는지를 가장 자세히 보여준다. 공간과 운영은 짧게 정리한다",
      titles: ["어린이집 캠핑놀이｜고기 굽기부터 자석낚시·야간 캠핑까지, 유치원 원내 캠핑놀이",
               "어린이집 캠핑놀이 뭐 하고 놀까｜텐트·해먹·낚시로 채우는 유치원 캠핑놀이"],
      sections: [
        { key: "intro", len: "2문단 · 4~6문장", role: "놀이 장면으로 열고 → 반장 캠핑놀이 소개 → 질문의 답을 한 줄로",
          facts: ["캠핑 식기와 고기 모형으로 식사 준비를 하는 놀이 장면을 떠올리게 하며 시작한다 (특정 아이·특정 원의 일로 쓰지 않는다)",
                  "[필수] 원 안의 캠핑장에서 아이들은 텐트·불판·해먹으로 캠핑 역할놀이를 하고, 옆 교실에서는 자석낚시와 곤충·뱀 모형으로 자연놀이를 한다는 답을 첫 두 문단 안에 준다"],
          photo: { alt: "어린이집 캠핑놀이 텐트와 캠핑 테이블이 설치된 교실", caption: "교실이 캠핑장으로 바뀐 모습 (대표사진)" } },
        { key: "camp", topic: "camp", len: "3문단 · 8~11문장", role: "캠핑체험 — 아이들이 하는 캠핑 역할놀이를 가장 자세히",
          extra: "역할을 나눠 고기를 굽고 상을 차리고 텐트에서 쉬고 해먹을 타는 놀이의 흐름을 구체적으로 그린다. 장비 목록을 나열하지 말고 아이들이 그 장비로 무엇을 하는지로 쓴다",
          photo: { alt: "유치원 캠핑놀이 불판 고기 모형 굽기 역할놀이", caption: "조명 불빛이 들어오는 불판에서 고기 모형 굽기" } },
        { key: "nature", topic: "nature", len: "2~3문단 · 6~9문장", role: "자연놀이체험 — 자석낚시와 곤충·뱀 모형 관찰",
          extra: "낚싯대를 드리워 물고기를 낚고, 잔디밭의 곤충 모형을 찾아 살펴보고, 사진을 찍는 놀이 흐름으로 쓴다",
          photo: { alt: "어린이집 캠핑놀이 자연놀이 자석낚시", caption: "진짜 낚싯대로 하는 자석낚시" } },
        { key: "night", topic: "night", len: "1~2문단 · 3~5문장", role: "어두워지는 공간이라면 — 야간 캠핑 분위기",
          photo: { alt: "유치원 캠핑놀이 불을 끈 야간 캠핑 분위기", caption: "불을 끄면 불판·화로·텐트 등 불빛만 남는 야간 캠핑" } },
        { key: "setup", topic: "setup", len: "1문단 · 3~4문장", role: "공간과 운영을 짧게 정리 (교실 2개 또는 강당 · 전날 설치 · 당일 반별 놀이)" },
        { key: "closing", topic: "closing", len: "2문단 · 4~6문장", role: "상담을 결심할 이유와 상담 안내" },
      ] },
    { id: "space", focus: "평소 교실과 강당이 어떻게 캠핑장과 자연 놀이터로 바뀌는지, 공간별로 어떻게 설치하는지를 가장 자세히 보여준다",
      titles: ["어린이집 캠핑놀이｜교실 2개가 캠핑장과 자연놀이터로, 유치원 캠핑놀이",
               "어린이집 캠핑놀이 교실 구성｜교실 2개 또는 강당 하나로 여는 유치원 캠핑놀이"],
      sections: [
        { key: "intro", len: "2문단 · 4~6문장", role: "바뀐 공간의 모습으로 열고 → 반장 캠핑놀이 소개 → 질문의 답을 한 줄로",
          facts: ["평소 수업하던 교실에 캠핑장 그림 배경막이 둘러지고 텐트가 들어선 모습으로 시작한다 (특정 원의 일로 쓰지 않는다)",
                  "[필수] 원 안에 캠핑장 교실과 자연놀이 교실이 생겨, 아이들은 캠핑 역할놀이와 자석낚시·곤충 모형 자연놀이를 한다는 답을 첫 두 문단 안에 준다"],
          photo: { alt: "어린이집 캠핑놀이 캠핑장 배경막과 텐트로 꾸민 교실", caption: "캠핑장 배경막과 텐트로 바뀐 교실 (대표사진)" } },
        { key: "space", topic: "space", len: "3문단 · 7~10문장", role: "공간 구성 — 교실 2개 / 강당 한 곳 / 작은 공간",
          extra: "교실 2개로 나눌 때, 강당 한 곳에 모을 때, 공간이 작을 때 각각 어떻게 되는지 원이 자기 공간에 대입해 볼 수 있게 쓴다" },
        { key: "camp", topic: "camp", len: "2문단 · 5~7문장", role: "교실1 캠핑체험 — 무엇이 어떻게 놓이고 그 안에서 어떻게 노는지",
          extra: "텐트·테이블·불판·화로·해먹이 교실 안에 자리 잡은 모습을 먼저 그리고, 그 자리에서 하는 역할놀이로 잇는다",
          photo: { alt: "유치원 캠핑놀이 텐트 불판 해먹이 놓인 캠핑체험 교실", caption: "텐트·불판·해먹이 놓인 캠핑체험 교실" } },
        { key: "nature", topic: "nature", len: "2문단 · 5~7문장", role: "교실2 자연놀이체험 — 잔디밭·개울 매트 위의 놀이",
          extra: "잔디밭과 개울 매트가 깔린 교실 모습을 먼저 그리고, 그 위에서 하는 낚시·곤충 관찰로 잇는다",
          photo: { alt: "어린이집 캠핑놀이 잔디밭과 개울 매트 자연놀이 교실", caption: "잔디밭과 개울 매트로 꾸민 자연놀이 교실" } },
        { key: "night", topic: "night", len: "2문단 · 4~6문장", role: "공간에 따라 달라지는 밤 놀이 — 어떤 공간에서 야간 분위기가 나는지",
          extra: "지하·강당처럼 어두워지는 공간과 창문이 많은 공간을 비교해, 원이 밤 놀이를 어디에 둘지 판단할 수 있게 쓴다",
          photo: { alt: "유치원 캠핑놀이 강당 야간 캠핑 분위기", caption: "어두워지는 공간에서 연출한 야간 캠핑" } },
        { key: "operation", topic: "operation", len: "1문단 · 3~4문장", role: "설치와 당일 운영을 짧게 (전날 설치 · 당일 원 자체 놀이 · 반별 순서)" },
        { key: "closing", topic: "closing", len: "2문단 · 4~6문장", role: "상담을 결심할 이유와 상담 안내" },
      ] },
    { id: "day", focus: "원에서 캠핑놀이 행사를 어떻게 준비하고 당일 반별로 어떻게 운영하는지, 한 반이 들어와 무엇을 하고 노는지를 가장 자세히 보여준다",
      titles: ["어린이집 캠핑놀이 행사｜전날 설치해 두고 반별로 즐기는 유치원 캠핑놀이",
               "어린이집 캠핑놀이｜반별로 돌아가며 캠핑·낚시 놀이, 유치원 원내 캠핑"],
      sections: [
        { key: "intro", len: "2문단 · 4~6문장", role: "행사 운영 고민으로 열고 → 반장 캠핑놀이 소개 → 질문의 답을 한 줄로",
          facts: ["여러 반이 함께 하는 캠핑놀이 행사를 어떻게 준비하고 돌릴지 고민하는 원의 질문으로 시작한다 (모든 원의 사실처럼 단정하지 않는다)",
                  "[필수] 반장이 전날 원 안에 캠핑장과 자연놀이 공간을 설치해 두면, 당일 아이들은 반별로 들어와 캠핑 역할놀이와 자석낚시·곤충 모형 자연놀이를 한다는 답을 첫 두 문단 안에 준다"],
          photo: { alt: "어린이집 캠핑놀이 행사 설치된 캠핑장 교실", caption: "전날 설치를 마친 원 안의 캠핑장 (대표사진)" } },
        { key: "operation", topic: "operation", len: "3문단 · 7~10문장", role: "준비와 운영 — 전날 설치 · 선생님 안내 · 당일 반별 놀이 · 사전 역할분담",
          extra: "행사 전(사전교육·역할 나누기) → 전날(설치·운영 안내) → 당일(반별로 들어와 놀고 다음 반으로) 순서로, 원이 하루를 그려 볼 수 있게 쓴다" },
        { key: "tour", topic: "tour", len: "2~3문단 · 6~9문장", role: "한 반이 두 공간에서 하는 놀이 — 캠핑 역할놀이와 자연놀이",
          extra: "한 반이 캠핑체험 공간과 자연놀이 공간에서 각각 무엇을 하는지 짧고 생생하게 이어서 쓴다",
          photo: { alt: "유치원 캠핑놀이 반별 캠핑 역할놀이와 자석낚시", caption: "캠핑 역할놀이와 자석낚시" } },
        { key: "night", topic: "night", len: "1문단 · 3~4문장", role: "어두워지는 공간이라면 — 반마다 즐기는 야간 캠핑 분위기",
          photo: { alt: "어린이집 캠핑놀이 텐트 안 등 야간 분위기", caption: "불판·화로·텐트 안 등 불빛의 야간 캠핑" } },
        { key: "setup", topic: "space", len: "1~2문단 · 3~5문장", role: "우리 원 공간에 맞추기 — 교실 2개 / 강당 / 작은 공간" },
        { key: "closing", topic: "closing", len: "2문단 · 4~6문장", role: "상담을 결심할 이유와 상담 안내 (스페셜 놀이 데이 · 부모참여수업 활용)" },
      ] },
  ],
  closingFacts: [
    "[필수] 앞에서 쓴 놀이·장비 이름을 다시 나열하지 않는다. 앞의 장면을 한 번 떠올리게 하는 정도로만 잇는다",
    "예약할 이유: 반장이 캠핑 공간을 준비해 전날 설치하므로, 원은 아이들과 역할을 나누고 사전교육을 하는 준비에 집중할 수 있다 (원이 준비할 것이 '전혀 없다'고 쓰지 않는다)",
    "공간이 작거나 창문이 많아 망설이는 원도 먼저 상담해 볼 수 있다 (반드시 된다고 쓰지 않는다. '걱정 없이', '고민하지 마시고'처럼 쓰지 않는다)",
    "[필수] 상담 때 행사 날짜, 원아 수와 반 수, 설치할 교실이나 강당, 창문이 많은 공간인지를 알려 달라고 안내한다",
    "'언제든지 연락 주시면 친절히 안내해 드리겠습니다', '많은 관심 부탁드립니다' 같은 상투적인 맺음말은 쓰지 않는다",
  ],
  cta: ["📞 예약·상담 문의: 010-9020-4545", "출장 지역: 서울·인천·경기", "홈페이지: banjang.co.kr"],
  hashtags: ["#어린이집캠핑놀이", "#유치원캠핑놀이", "#캠핑놀이체험", "#실내캠핑놀이", "#캠핑역할놀이", "#자석낚시놀이", "#어린이집행사", "#유치원행사", "#원방문체험", "#찾아가는체험", "#반장노리야놀자"],
};

function campingSectionFacts(sec) {
  const t = sec.topic;
  if (!t) return sec.facts || [];
  if (t === "setup") return [CAMPING_FACTS.space[0], CAMPING_FACTS.space[2], ...CAMPING_FACTS.operation.slice(0, 3)];
  if (t === "tour") return [...CAMPING_FACTS.camp, ...CAMPING_FACTS.nature];
  if (t === "space") return [...CAMPING_FACTS.space];
  if (t === "closing") return [...CAMPING_FACTS.use, ...CAMPING_PILOT.closingFacts];
  return [...(CAMPING_FACTS[t] || [])];
}

function buildCampingPilotPrompt(title, angle) {
  const secText = angle.sections.map((s, i) => {
    const facts = campingSectionFacts(s);
    const extra = s.extra ? `\n   - (이 섹션 전개) ${s.extra}` : "";
    return `${i + 1}. key="${s.key}" — 역할: ${s.role} / 분량: ${s.len}${extra}\n` + facts.map(f => `   - ${f}`).join("\n");
  }).join("\n\n");
  const system = [
    "너는 유치원·어린이집 원방문 체험 업체 '반장-노리야놀자'의 네이버 블로그 글을 쓰는 작가다.",
    "화자는 원에 찾아가는 업체 반장이다. 반장은 '반장' 또는 '저희 반장'으로 부르고, 반장이 주어일 때는 '반장은', '반장이'처럼 쓴다. '저희 원', '우리 원'이라고 쓰지 않는다. 독자의 원은 그냥 '원'이라고 부른다. 원의 아이들은 '아이들' 또는 '원아들'이라고 부른다.",
    "독자는 원 안에서 캠핑놀이 행사를 열지 고민하는 유치원·어린이집 원장님과 행사 담당 선생님이다. 이 글은 '원 안에서 하는 캠핑놀이, 아이들은 무엇을 하고 놀까?'라는 질문에 답한다. 읽고 나서 '우리 어린이집·유치원에서도 이런 캠핑놀이를 해 보고 싶다'는 장면이 그려지고, 예약 상담으로 이어지게 쓴다. 유치원과 어린이집 두 기관을 모두 독자로 부른다.",
    "이 글의 상품명은 '캠핑놀이체험'이다. 이 글은 행사 후기가 아니라 프로그램 소개 글이다. 특정 날짜·특정 원에서 있었던 일처럼 쓰지 않는다.",
    "말투는 업체가 소개하는 따뜻하고 자신감 있는 존댓말(~합니다, ~해요)이다. 보고서체(~했다, ~이다)는 쓰지 않는다.",
    "사실은 아래 섹션별 재료 안에서만 쓴다. 재료에 없는 장비·놀이·음식·숫자·크기·시간·가격·인원·연령·시즌·경력을 만들지 않는다. 재료의 숫자(텐트 4동, 테이블 2개, 의자 6개, 불판 2개, 화로불 1개, 해먹 1개·약 3명, 낚싯대 6개, 물고기 약 20마리, 뱀 3m, 교실 2개)는 꼭 다 쓸 필요는 없고, 쓸 때는 정확히 쓴다.",
    "불판과 화로는 조명으로 불빛을 낸 것이라 뜨겁지 않다. 진짜 불·숯·연기·열기가 있다고 쓰지 않는다. 먹거리는 모두 모형이라 실제로 굽거나 먹거나 맛보지 않는다('먹는 흉내', '역할놀이'로 쓴다).",
    "아이들의 반응(무서워한다, 망설인다, 환호한다, 소리친다 등)을 실제 있었던 일처럼 정해 놓고 쓰지 않는다. '가장 좋아한다', '가장 흥미로워한다'처럼 아이들의 선호를 단정하거나, 피곤함처럼 아이들의 몸 상태를 상상해 쓰지 않는다. 아이 이름과 따옴표 대사도 쓰지 않는다. 장면은 재료에 있는 장비와 놀이 방식으로 그리고, '~할 수 있어요', '~하며 놀아요'처럼 프로그램 설명으로 쓴다. 캠핑장 분위기와 놀이 모습을 생생하게 묘사하는 홍보 표현은 적극적으로 써도 된다.",
    "반장이 하는 일은 캠핑 공간을 준비해 전날 설치하고, 설치할 때 선생님께 운영 방법을 안내하는 것이다. 반장이 당일 놀이를 진행하거나 상주한다고 쓰지 않는다. 안전요원·진행 요원이 있다고 쓰지 않는다.",
    "효과·안전·만족을 보장하는 문장, 인기·'많은 원에서 찾는다' 같은 근거 없는 주장, 최상급·순위·다른 업체와 비교하는 표현은 쓰지 않는다. 반장을 '전문가', '전문 업체'라고 부르지 않는다.",
    "글을 소개하는 문장('이번 글에서는', '~라는 질문에 답해 보겠습니다')은 쓰지 않는다. 바로 캠핑놀이 이야기로 들어간다.",
    "섹션마다 앞 섹션을 이어받아 연결한다. 한 섹션에서 설명한 내용을 다른 섹션에서 다시 설명하지 않는다. 같은 문장을 두 번 쓰지 않는다.",
    "본문에 전화번호·출장지역·가격·할인을 쓰지 않는다. 굵게(**) 같은 마크다운 기호를 쓰지 않는다.",
    "출력은 JSON 하나: {\"sections\":[{\"key\":\"...\",\"heading\":\"...\",\"body\":\"...\"}]}. 섹션 순서와 key 는 그대로 지킨다.",
    "heading 은 블로그 소제목으로 짧고 자연스럽게 쓴다('섹션', '코너 1' 같은 말 금지). body 는 문단 사이를 빈 줄로 나눈다. 소제목과 문장은 매번 새로 쓰고, 재료 문장을 그대로 옮겨 적지 말고 자연스럽게 풀어 쓴다.",
    "[필수] 표시 재료는 빠뜨리지 않는다. 섹션마다 적힌 분량(문장 수)을 지키고 짧게 끝내지 않는다. 글 전체 본문은 공백 포함 약 2,600~3,200자다. 같은 뜻을 반복해서 늘리지 말고, 관점에서 가장 자세히 다루는 섹션의 놀이 장면과 공간 모습을 구체적으로 그려 분량을 채운다.",
    "번역투·딱딱한 표현('반장 측', '~하는 경우가 많습니다', '솔루션')은 쓰지 않는다. 업체 사장님이 직접 소개하듯 자연스럽게 쓴다. '새로운 경험을 선사합니다', '특별한 추억이 됩니다' 같은 뻔한 문장으로 문단을 끝내지 말고, 아이들이 실제로 하는 놀이 모습으로 문단을 채운다.",
  ].join("\n");
  const user = `제목: ${title}\n이번 글의 관점: ${angle.focus}\n(관점에 맞게 섹션별 분량과 깊이를 지킨다. 짧은 섹션은 핵심만 쓴다.)\n\n[섹션별 재료]\n${secText}`;
  return { system, user };
}

// 자동검사 — 금지 FACT·수치·조건 누락을 문장 단위로 수집해 사람이 판정한다(차단하지 않음).
function auditCampingPilot(text) {
  const sentences = text.split(/(?<=[.!?。])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const pick = (re) => sentences.filter(s => re.test(s));
  // 장비별 수량이 확정값과 다른 문장
  const QTY = [
    [/텐트[^.!?\d]{0,8}(\d+)\s*(동|개)/, 4], [/(고기\s*)?불판[^.!?\d]{0,8}(\d+)\s*개/, 2], [/화로(불)?[^.!?\d]{0,8}(\d+)\s*개/, 1],
    [/낚싯대[^.!?\d]{0,8}(\d+)\s*(개|대)/, 6], [/물고기[^.!?\d]{0,10}(\d+)\s*마리/, 20], [/해먹[^.!?\d]{0,20}(\d+)\s*명/, 3],
    [/뱀[^.!?\d]{0,10}(\d+)\s*(m|미터)/, 3], [/테이블[^.!?\d]{0,6}(\d+)\s*개/, 2], [/의자[^.!?\d]{0,6}(\d+)\s*개/, 6],
  ];
  const wrongQty = [];
  for (const s of sentences) for (const [re, ok] of QTY) {
    const m = s.match(re); if (!m) continue;
    const n = Number([...m].slice(1).find(x => /^\d+$/.test(x || "")));
    if (n && n !== ok) wrongQty.push(s);
  }
  const numbers = (text.match(/\d+(\.\d+)?(\s*~\s*\d+)?\s*(cm|센티|m|미터|mm|명|분|초|시간|개|대|동|곳|반|평|원|년|세|kg|월|일|종|마리|교실)/g) || []);
  const ALLOWED_NUM = /^(4\s*(동|개)|2\s*개|1\s*개|6\s*개|6\s*대|20\s*마리|3\s*(m|미터)|3\s*명|2\s*교실|2\s*곳|1\s*곳)$/;
  const big = (s) => new Set(s.replace(/\s/g, "").match(/.{2}/g) || []);
  const sim = (a, b) => { const A = big(a), B = big(b); let n = 0; A.forEach(x => B.has(x) && n++); return n / Math.max(1, Math.min(A.size, B.size)); };
  const longS = sentences.filter(s => s.length >= 25);
  const repeats = [];
  for (let i = 0; i < longS.length; i++) for (let j = i + 1; j < longS.length; j++) if (sim(longS[i], longS[j]) >= 0.7) repeats.push([longS[i], longS[j]]);
  const nightSents = pick(/(야간|밤\s*(놀이|캠핑|분위기)|불을\s*끄|불을\s*끈|실내등)/);
  return {
    wrongFacts: pick(/(마시멜로|핫도그|별자리|모닥불\s*존|꼬치\s*만들|8\s*(m|미터)|진짜\s*(불|숯)(?!이\s*아니|은\s*아니|처럼)|연기가|숯불(?!처럼)|뜨거(?!지\s*않|운\s*것(이|은)\s*아니)(운|워)|맛(을|있게)?\s*(보|봐)(?!는\s*흉내|는\s*척)|실제로\s*(먹|구워\s*먹)|안전\s*요원|진행\s*요원|상주|무제한|시간\s*제한\s*없|하루\s*종일|원하는\s*만큼|독보적|타\s*업체|다른\s*업체|재예약|인기|사랑받|만족도|(?<!창문이\s*|창이\s*)많은\s*(원|유치원|어린이집|기관)|\d+\s*만\s*원|할인|경력|설립)/),
    insectCount: pick(/곤충[^.!?]{0,15}\d+\s*(종|마리|개)/),
    wrongQty,
    numbersOutsideFact: numbers.filter(n => !ALLOWED_NUM.test(n.replace(/\s+/g, " ").trim())),
    nightConditionMissing: nightSents.length > 0 && !/(창문|창이\s*많|밝(아|은|기)|어두워지는|어두운\s*공간|지하)/.test(nightSents.join(" ")),
    unsureClaims: pick(/(보장|안전합니다|안전하(게|고)|안전한\s*(환경|공간|놀이)|고민하지\s*마|사고\s*(없|걱정|예방)|걱정\s*없|확실히|모두\s*좋아|최고|최상|최적|압도|1위|무조건|어디(든|서나)|언제든|대기\s*(없|시간\s*없)|자율\s*(운영|진행)|손\s*(댈|갈)\s*(일|것)?이?\s*없|준비할\s*(것|게)(이|은)?\s*(전혀\s*)?없)/),
    reactionClaims: pick(/(무서워|환호|소리\s*(치|쳐|를\s*지르)|비명|울음)/),
    speakerAsKindergarten: pick(/(우리|저희)\s*(원|유치원|어린이집)(에서|에|의|은|는|이|을|으로)?(\s|$)/),
    banjangRunsDay: pick(/반장(이|은|도)?[^.]{0,20}(진행합니다|진행해|진행하는|이끌|지도)/),
    quotes: text.match(/["“'‘][^"“”'‘’\n]{1,40}["”'’]/g) || [],
    leaks: pick(/(key=|섹션|재료:|\[섹션|JSON|heading|body|프롬프트|지시문|관점:)/),
    foreignIndustry: pick(/(성형|피부과|시술|임플란트|한의원|병영|블랙라이트|시장놀이|교실바운스|겨울이야기)/),
    selfClaims: pick(/(전문가|전문\s*업체)/),
    coreMissing: [["캠핑 역할놀이", /(굽|식사\s*준비|역할)/], ["자석낚시", /자석/], ["곤충·뱀", /(곤충|뱀)/], ["공간(교실·강당)", /강당/], ["밤놀이", /(야간|밤)/], ["전날 설치", /전날/], ["반별 운영", /(반별|한\s*반씩|반마다|다음\s*반|각\s*반|순서대로)/], ["조명·안 뜨거움", /(뜨겁지|조명)/], ["모형", /모형/]]
      .filter(([, re]) => !re.test(text)).map(([k]) => k),
    hasKindergarten: /유치원/.test(text), hasDaycare: /어린이집/.test(text),
    repeats,
    charCount: text.length,
  };
}

async function generateCampingPilot({ region }) {
  const r = (region || "").trim();
  const angle = CAMPING_PILOT.angles[Math.floor(Math.random() * CAMPING_PILOT.angles.length)];
  const baseTitle = angle.titles[Math.floor(Math.random() * angle.titles.length)];
  const title = r ? `${r} ${baseTitle}` : baseTitle;
  const { system, user } = buildCampingPilotPrompt(title, angle);
  const keys = angle.sections.map(s => s.key);

  let parsed = null, lastErr = null;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const j = JSON.parse(resp.choices[0].message.content || "{}");
      const secs = Array.isArray(j.sections) ? j.sections : [];
      if (keys.every(k => secs.some(s => s.key === k && String(s.body || "").trim()))) parsed = secs;
      else lastErr = new Error("섹션 누락");
    } catch (e) { lastErr = e; }
  }
  if (!parsed) throw lastErr || new Error("캠핑놀이 Pilot 생성 실패");

  const fixes = [];
  const OUR_WON = /(우리|저희)\s*원(?=\s|에|의|을|이|은|는|으로|$)/g; // 화자는 반장 — 독자의 원은 그냥 「원」
  const parts = [];
  for (const def of angle.sections) {
    const k = def.key;
    const s = parsed.find(x => x.key === k);
    const photo = def.photo ? `[이미지: ${def.photo.alt} | ${def.photo.caption}]\n\n` : "";
    const headText = String(s.heading || "").replace(/\*\*/g, "").trim().replace(OUR_WON, "원");
    const head = k === "intro" ? "" : `${headText}\n\n`;
    let secBody = String(s.body).replace(/\*\*/g, "").trim().replace(OUR_WON, "원")
      .replace(/반장-노리야놀자에서는/g, "반장-노리야놀자는").replace(/반장에서는/g, "반장은").replace(/반장에서(\s*)(준비|제공|가져|챙겨|설치|안내)/g, "반장이$1$2");
    // 문장 국소 제거(캠핑 경로 한정 · 명백한 허위 FACT·무근거 보장만): 재료 밖 소재 · 실제 먹기 · 반장 당일 진행 · 이용시간 보장
    secBody = secBody.split("\n").map(line => line.split(/(?<=[.!?])\s+/).filter(x => {
      const drop = /(마시멜로|핫도그|별자리|모닥불\s*존|꼬치\s*만들|8\s*(m|미터))/.test(x)
        || /(실제로|진짜로)\s*(먹|구워\s*먹|맛)/.test(x)
        || /반장(은|이|도)?[^.!?]{0,20}(당일[^.!?]{0,10}(진행|함께|지도)|상주)/.test(x)
        || /(시간\s*제한\s*없|무제한|하루\s*종일|원하는\s*만큼\s*(오래|충분히|시간|놀|이용))/.test(x)
        || /인기\s*(만점|최고|폭발)|인기(가|를)\s*(끌|얻|많)/.test(x);
      if (drop) fixes.push(x);
      return !drop;
    }).map(x => {
      // 「뜨겁지 않다」(확정 FACT)를 안전 보장으로 넓힌 구절만 지운다 · 「최적」은 근거 없는 최상급
      const y = (!/뜨겁/.test(x) && /(불판|화로|조명|불빛)/.test(x) ? x.replace(/안전하게/g, "뜨겁지 않게").replace(/안전합니다/g, "뜨겁지 않습니다") : x)
        .replace(/(뜨겁지\s*않아(서)?)\s*안전합니다/g, "뜨겁지 않습니다").replace(/안전하(게|고)\s*/g, "").replace(/안전한\s*(환경|공간)에서\s*/g, "")
        .replace(/(으로|로)\s*인기가\s*(있으며|있고|높으며|높고)/g, "$1 쓰이며").replace(/최적의/g, "알맞은").replace(/최적/g, "알맞은");
      if (y !== x) fixes.push(`[fix] ${x}`);
      return y;
    }).join(" ")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    // 밤놀이 채광 조건(필수 FACT)이 빠졌을 때만 같은 문단 끝에 한 문장을 잇는다
    if (def.topic === "night" && !/(창문|창이\s*많|밝(아|은|기))/.test(secBody)) {
      const paras = secBody.split(/\n\n+/);
      const i = paras.length - 1;
      paras[i] = `${paras[i].trim()}${/[.!?]$/.test(paras[i].trim()) ? "" : "."} 다만 창문이 많은 공간은 불을 꺼도 밝아서 야간 분위기가 약하게 날 수 있습니다.`;
      secBody = paras.join("\n\n");
      fixes.push("[attach] night 채광 조건");
    }
    parts.push(`${head}${photo}${secBody}`);
  }
  parts.push(CAMPING_PILOT.cta.join("\n"));
  const tags = r ? [`#${r.replace(/\s/g, "")}어린이집캠핑놀이`].concat(CAMPING_PILOT.hashtags.filter(h => h !== "#찾아가는체험")).slice(0, 12) : CAMPING_PILOT.hashtags.slice(0, 12);
  const body = parts.join("\n\n");
  const text = `# ${title}\n\n${body}\n\n${tags.join(" ")}`.replace(/\n{3,}/g, "\n\n").trim();

  const images = angle.sections.map(d => d.photo).filter(Boolean).map(p => ({ alt: p.alt, caption: p.caption }));
  const charCount = calcCharCount(text);
  return {
    success: true,
    title,
    text,
    textMarkdown: text,
    hashtags: tags,
    images,
    imageMeta: images,
    charCount,
    mode: "commercial",
    pilot: "KINDERGARTEN-CAMPING-01",
    pilotAngle: angle.id,
    pilotQC: { ...auditCampingPilot(body), fixes },
    validation: { passed: charCount >= 1500, charCount },
  };
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

  // [KINDERGARTEN-OWNER-ONLY-GATE-01] 유치원·어린이집 엔진은 관리자(OWNER) 검증 전용.
  //   화면은 IndustrySelector TREE_OWNER_ONLY 로 숨기지만, /api/generate 는 body.industry 를 그대로 받아
  //   일반 회원의 API 직접 요청이 이 핸들러에 도달할 수 있었다 → 모든 모드(사진메타·묶음·일반·Pilot) 진입 전 차단.
  //   req.storeRuntime 은 라우터가 주입(인증 실패는 라우터에서 이미 401). GPT·사용량 이전.
  if (!isOwner(req.storeRuntime?.account?.auth_user_id)) {
    return res.status(403).json({ error: "관리자 전용 기능입니다.", code: "OWNER_ONLY_INDUSTRY" });
  }

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

  // [KINDERGARTEN-BLACKLIGHT-PILOT-02] 블랙라이트 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "blacklight") {
    try {
      return res.status(200).json(await generateBlacklightPilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 블랙라이트 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "블랙라이트 원고 생성 중 오류가 발생했습니다." });
    }
  }

  // [KINDERGARTEN-MILITARY-ENGINE-PILOT-01] 병영체험 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "military") {
    try {
      return res.status(200).json(await generateMilitaryPilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 병영체험 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "병영체험 원고 생성 중 오류가 발생했습니다." });
    }
  }

  // [KINDERGARTEN-MARKET-PILOT-01] 시장놀이 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "market") {
    try {
      return res.status(200).json(await generateMarketPilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 시장놀이 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "시장놀이 원고 생성 중 오류가 발생했습니다." });
    }
  }

  // [KINDERGARTEN-AIRBOUNCE-PILOT-01] 에어바운스 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "airbounce") {
    try {
      return res.status(200).json(await generateAirbouncePilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 에어바운스 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "에어바운스 원고 생성 중 오류가 발생했습니다." });
    }
  }

  // [KINDERGARTEN-WINTER-STORY-PILOT-01] 겨울이야기 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "winter") {
    try {
      return res.status(200).json(await generateWinterPilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 겨울이야기 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "겨울이야기 원고 생성 중 오류가 발생했습니다." });
    }
  }

  // [KINDERGARTEN-CAMPING-01] 캠핑놀이체험 단일 생성만 Pilot 경로. 그 외 프로그램은 아래 기존 경로 그대로.
  if (mainProgram.id === "camping") {
    try {
      return res.status(200).json(await generateCampingPilot({ region }));
    } catch (e) {
      console.error("[kindergarten] 캠핑놀이 Pilot 생성 실패:", e?.message);
      return res.status(500).json({ error: "캠핑놀이 원고 생성 중 오류가 발생했습니다." });
    }
  }

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
