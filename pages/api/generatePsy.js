// pages/api/generatePsy.js
// 정신건강의학과(psy) 전용 핸들러
// neuro v7 패턴 전체 복사 + 정신과 안전 가드레일 3종 신설
//
// 후처리 8단계 (neuro 7단계 + safetyGuard 1단계 신설):
//   0) safetyGuard()         ← psy 신설. 자살 검출 시 글 전체 차단(throw),
//                              약물명·진단코드는 문장 통째로 일반어 치환
//   1) cleanPsyText()        ← neuro의 cleanText v7 패턴 + psy FORBIDDEN
//   2) (해시태그 제거는 cleanText 안에 포함)
//   3) insertInfoBlock()     ← neuro 그대로 (앵커는 '진료 결정')
//   4) injectExamValue()     ← neuro 그대로 (앵커는 '## 첫 방문')
//   5) removeDuplicates()    ← neuro v7 (줄 단위 4단계 포함)
//   6) ensureFullKeyword()   ← neuro 그대로
//   7) 마무리 이미지 ALT + 해시태그
//
// neuro v7 핵심 패턴 보존:
//   - 헤더 무종결 어절 보정 (cleanText 11)
//   - 하시더라고요 → 설명해 주셨어요 직접화법 변환 (cleanText 8-3)
//   - 화자 시점 충돌 보정 (cleanText 8-2)
//   - ㄹ 받침 어간 우선 평가 (cleanText 10-d)
//   - 키워드 치환 가드 + fixReplacementJosa (limitKeywordRepeat)
//   - 줄 단위 중복 제거 (removeDuplicates)
//   - SITE_PREFIX_BLACKLIST (psy는 부위 개념 약하지만 구조 유지)
//   - 동적 정규식 → 리터럴 정규식 (인수인계 PART 3-2)

import OpenAI from 'openai';
import {
  PSY_TREATMENTS,
  DIRECTION,
} from '../../lib/psy-data';
import {
  PSY_FLOW,
  INFO_BLOCKS,
  EXAM_VALUES,
} from '../../lib/psy-playConfig';
import {
  SYSTEM_PROMPT,
  buildPrompt,
  getImageAlts,
} from '../../lib/psy-prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ──────────────────────────────────────────────────────────────
// 부위/세부 키워드 — psy는 신체 부위가 아니라 영역 개념
//   neuro의 SITE_KEYWORDS 자리. 정신과는 '수면/집중력/대인관계' 같은 영역으로
// ──────────────────────────────────────────────────────────────
const SITE_KEYWORDS = [
  '수면', '집중력', '기억력', '대인관계', '직장', '가족', '학업',
];

// 진료명에 영역이 이미 포함된 경우 SITE prefix 중복 방지
const SITE_PREFIX_BLACKLIST = {
  psy_insomnia: true,    // 불면증 (수면 의미 포함)
  psy_adhd:     true,    // 성인 ADHD (집중력 의미 포함)
  psy_relation: true,    // 관계 상담 (대인관계 의미 포함)
};

// ──────────────────────────────────────────────────────────────
// 🚨 SAFETY GUARDRAIL — 정신과 전용 (neuro에 없음)
// ──────────────────────────────────────────────────────────────

// (가) 자살·자해 표현 — 검출 시 글 전체 차단 (500 에러)
//   자살예방법 + 보도권고기준에 따라 본문 노출 자체 금지
//   감지 즉시 throw → 응답 차단. 부분 삭제 안 함.
const SUICIDE_PATTERNS = [
  /자살/, /자해/, /목숨/, /극단적\s*선택/,
  /죽고\s*싶/, /사라지고\s*싶/, /끝내고\s*싶/,
  /살\s*가치가\s*없/, /살아갈\s*이유/,
  /수면제\s*과다/, /약\s*과다\s*복용/,
  /투신/, /목\s*매/,
  // 자해 활용형 — '긋/그어/그은/그었', '베/베어/베었'
  // 조사(을/에/로) + 공백 허용: "손목을 그어"도 잡힘
  /손목(?:을|에|로)?\s*(?:긋|그어|그은|그었|베|베어|베었)/,
  /팔(?:을|에|로|뚝)?\s*(?:긋|그어|그은|그었|베|베어|베었)/,
  /칼(?:로|을|을\s*들)?\s*(?:긋|그어|그은|그었|베|베어|베었)/,
];

// (나) 약물 상품명·성분명 — 문장 통째로 일반어 치환
//   단순 단어 삭제는 비문 발생 → 문장 전체를 안전 표현으로 교체
//   국내 처방 빈도 상위 정신과 약물 위주 + 자주 거론되는 외국명
const MEDICATION_BLACKLIST = [
  // 항우울제 SSRI/SNRI
  '프로작', '플루옥세틴', '렉사프로', '에스시탈로프람', '시탈로프람',
  '졸로푸트', '설트랄린', '듀로테스트', '듀록세틴', '심발타',
  '벤라팍신', '이펙사', '미르타자핀', '레메론',
  // 항불안제 벤조
  '자낙스', '알프라졸람', '디아제팜', '바리움', '리보트릴', '클로나제팜',
  '아티반', '로라제팜',
  // 수면제
  '졸피뎀', '스틸녹스', '스틸녹스CR', '에스조피클론', '루네스타',
  // 기분조절제
  '리튬', '리튬카보네이트', '발프로익산', '데파코트',
  '라모트리진', '라믹탈',
  // ADHD
  '콘서타', '메디키넷', '메틸페니데이트', '스트라테라', '아토목세틴',
  // 항정신병
  '리스페달', '리스페리돈', '아빌리파이', '아리피프라졸',
  '쿠에티아핀', '세로켈', '올란자핀', '자이프렉사',
];

// (다) 진단 분류 코드 — 문장 통째로 일반어 치환
//   ICD-10 / DSM-5 코드는 의료법상 일반인 대상 광고에서 사용 금지
const DIAGNOSIS_CODE_PATTERNS = [
  /\bF\d{2}(?:\.\d+)?\b/g,      // F32, F32.1, F41.0 등 ICD
  /\bICD[-\s]?10\b/gi,
  /\bICD[-\s]?11\b/gi,
  /\bDSM[-\s]?5\b/gi,
  /\bDSM[-\s]?IV\b/gi,
];

// (라) 효과 보장·우월성 표현 — 매뉴얼 PART 4-2 + 정신과 특화
//   FORBIDDEN에 추가됨 (cleanText에서 split-join으로 제거)

// ──────────────────────────────────────────────────────────────
// safetyGuard — 후처리 0단계 (가장 먼저 실행)
//
// 흐름:
//   1. 자살 표현 검출 → 즉시 throw (응답 차단)
//   2. 약물명 포함 문장 검출 → 문장 통째로 일반어 치환
//   3. 진단코드 검출 → 일반어 치환
// ──────────────────────────────────────────────────────────────
function safetyGuard(text) {
  // (1) 자살·자해 검출 → 글 전체 차단
  for (const pat of SUICIDE_PATTERNS) {
    if (pat.test(text)) {
      console.error('[SAFETY] 자살·자해 표현 검출 — 글 전체 차단', { pattern: pat.toString() });
      const err = new Error('정신건강 안전 정책에 따라 일부 표현이 검출되어 글 생성을 중단했습니다. 다른 키워드나 진료로 다시 시도해주세요.');
      err.code = 'PSY_SAFETY_SUICIDE';
      throw err;
    }
  }

  let t = text;
  let medCount = 0;
  let codeCount = 0;

  // (2) 약물명 포함 문장 통째로 치환
  //   문장 분리 → 약물명 포함 문장만 안전 표현으로 교체
  //   문장 분리는 마침표·줄바꿈 기준 (마크다운 헤더는 보존)
  const lines = t.split('\n');
  const safeLines = lines.map(line => {
    // 헤더(##/###)와 표(|)는 그대로
    if (/^(##|###|####|\|)/.test(line.trim())) return line;
    // 빈 줄 그대로
    if (line.trim() === '') return line;

    // 라인 내 문장 단위 검사 (마침표·물음표·느낌표)
    const sentences = line.split(/(?<=[.!?])\s+/);
    const safeSentences = sentences.map(sent => {
      const hasMed = MEDICATION_BLACKLIST.some(m => sent.includes(m));
      if (hasMed) {
        medCount++;
        // 안전 표현으로 통째 치환 — 문맥 보존을 위해 짧고 중립적으로
        return '처방받은 약을 복용했어요.';
      }
      return sent;
    });
    return safeSentences.join(' ');
  });
  t = safeLines.join('\n');

  // (3) 진단 분류 코드 치환 — 단어 단위 교체
  //   "F32.1로 진단" → "관련 진단으로 진단"
  //   치환 후 받침 규칙에 맞게 조사 자동 보정
  for (const pat of DIAGNOSIS_CODE_PATTERNS) {
    t = t.replace(pat, () => {
      codeCount++;
      return '관련 진단';
    });
  }
  // 받침 없는 '관련 진단' 뒤에 받침 있는 형태 조사 보정
  //   '관련 진단로' → '관련 진단으로'  (단/받침 없음 + 으로/로 규칙)
  //   '관련 진단을' → '관련 진단을' (받침 있는 '단' + 을 → 그대로 OK)
  //   사실 '단'에는 받침(ㄴ) 있어서 조사가 대부분 자동으로 맞지만,
  //   '로'는 예외 — 받침 ㄹ만 '로', 그 외 자음 받침은 '으로'
  t = t.replace(/관련 진단로(\s|,|\.|$)/g, '관련 진단으로$1');

  if (medCount > 0) console.warn('[SAFETY] 약물명 포함 문장 치환:', medCount);
  if (codeCount > 0) console.warn('[SAFETY] 진단코드 치환:', codeCount);

  return t;
}

// ──────────────────────────────────────────────────────────────
// 금지 표현 — 인수인계 PART 4-2 + 정신과 특화 효과 보장 표현
// ──────────────────────────────────────────────────────────────
const FORBIDDEN = [
  // 결심·감정 (neuro 공통)
  '드디어 결심하고', '결국 선택하게 되었어요',
  '마음이 편안해졌어요', '믿음이 갔어요', '친절하고 전문적이셔서',
  '따뜻한 차 한 잔', '차분하고 따뜻한 느낌',
  '미소를 되찾았어요', '새로운 삶', '삶의 질이 크게',

  // 추측·생각 표현
  '것 같았어요', '것 같았다', '것 같아서',
  '생각이 들었어요', '생각이 들었다',
  '느껴졌어요', '느껴졌다',
  '게 일상이 됐어요', '게 일상이 됐다',
  '마음이 무거웠어요', '마음이 무거웠다',

  // 권유·CTA 표현
  '알아보시는 것도 좋아요', '알아보시면 좋아요',
  '상담 받아보세요', '상담 받아보시는 걸 추천', '한번 받아보세요',
  '꼭 받으세요', '추천드립니다', '추천드려요',
  '꼭 가보세요', '방문해보세요', '예약하시는 걸 추천',
  '여러 군데 알아보시면', '여러 군데 알아보면',
  '비교해보시면 좋아요', '확인해보시면 좋아요',

  // [1] 고민 — 감정·고통·결심
  '결국 병원을 찾기로 마음먹었습니다', '결국 병원을 찾기로 했습니다',
  '결국 병원을 찾았어요', '병원을 찾기로 마음먹었',
  '집중하기 힘들었어요', '집중하기 어려웠어요',
  '일상생활에 불편함이 커져서', '일에 방해가 됐어요',
  '점점 더 심해졌고', '점점 심해졌어요',
  '그러다 보니', '이러다 보니',

  // [2] 탐색 — 신뢰·믿음·인상
  '신뢰가 갔어요', '신뢰가 갔어',
  '인상적이었어요', '인상적이었거든',
  '후기가 좋아 보여서', '느낌이 좋아서',
  '유명한 병원', '잘하는 병원으로',
  '큰 영향을 미쳤어요', '큰 영향을 미쳤다',
  '결정적이었어요', '마음을 사로잡았어요',
  '후회 없는 선택', '정답이었어요',
  '선택이었답니다', '선택이었어요!',
  '고려한 선택이었답니다', '결정이었답니다',

  // [3] 마무리 — 격언·교훈·미래·CTA
  '작은 변화가 큰 차이', '도전이 답', '시작이 반',
  '자신에게 맞는 방식이 보일 거예요', '맞는 방식이 보일',
  '회복될 거예요', '좋아질 거예요', '나아질 거예요',
  '비슷한 분이라면', '여러분도',
  '후회 없는', '만족스러운 결과',

  // 🚫 정신과 특화: 효과 보장·완치 표현
  '100% 효과', '100% 좋아졌', '확실히 낫는다', '완치되었어요', '완치됐어요',
  '완전히 사라졌어요', '완전히 좋아졌어요', '약 없이 나았어요',
  '깨끗이 나았어요', '말끔히 사라졌어요',
  '우울증이 사라졌어요', '불안이 사라졌어요', '공황이 사라졌어요',
  '불면이 완치', '불안이 완치', '공황이 완치',
  '재발 없이', '재발은 없을',

  // 🚫 정신과 특화: 의료광고법 우월성 표현
  '최고의 정신건강의학과', '유일한 정신건강의학과', '특화된 정신건강의학과',
  '전국 최다', '국내 최고', '대한민국 최고',
  '명의로 유명한', '명의가 있는',

  // 🚫 정신과 특화: 자가 진단 유도 표현
  '당신도 우울증', '당신도 불안장애', '당신도 ADHD',
  '이런 증상이라면 우울증', '이런 증상이라면 불안',
];

// ──────────────────────────────────────────────────────────────
// 텍스트 정제 — neuro v7 cleanText 패턴 그대로
// ──────────────────────────────────────────────────────────────
function cleanPsyText(text, { activeKeyword, fullKeyword, region } = {}) {
  if (!text) return '';
  let t = text;

  // 🔧 v6: 공통 엔진 3종 우선 적용
  // (a) region 중복 방어 (한글 토큰 경계 우회)
  if (region) {
    const regionDupRe = new RegExp(`(${escapeRegex(region)})\\s+\\1(?=\\s|[가-힣])`, 'g');
    t = t.replace(regionDupRe, '$1');
  }

  // (b) [엔진 1] 키워드 정합성 복구
  t = sanitizeKeywordIntegrity(t, region, activeKeyword);

  // (c) [엔진 2] 깨진 문장 구조 복구
  t = sanitizeBrokenSentence(t);

  // (d) [엔진 3] 효과 표현 완화
  t = sanitizeEffectExpression(t);

  // (1) 금지 표현 제거
  for (const f of FORBIDDEN) {
    t = t.split(f).join('');
  }

  // (2) 마침표 오타
  t = t.replace(/([가-힣]{2,8})\.\s*라는/g, '$1이라는');
  t = t.replace(/([가-힣]{2,8})\.\s*라고/g, '$1이라고');

  // (3) 공백 오류
  t = t.replace(/를\s{2,}시작/g, '를 시작');
  t = t.replace(/받고나면/g, '받고 나면');
  t = t.replace(/하고나서/g, '하고 나서');
  t = t.replace(/했는데도\s{2,}/g, '했는데도 ');

  // (4) 연속 마침표·쉼표
  t = t.replace(/\.{2,}/g, '.');
  t = t.replace(/,{2,}/g, ',');

  // (5) "특히/또한/무엇보다" 연속 사용 — 첫 등장 외 전부 제거
  t = removeConsecutive(t, ['특히', '또한', '무엇보다']);

  // (6) 키워드 반복 차단
  if (activeKeyword) {
    t = limitKeywordRepeat(t, activeKeyword, 5);
    t = fixReplacementJosa(t);
  }

  // (6-2) 🔧 v6: limitKeywordRepeat 후 다시 키워드 정합성 보정
  // (limitKeywordRepeat이 새로운 깨짐을 만들 수 있어 재실행)
  t = sanitizeKeywordIntegrity(t, region, activeKeyword);

  // (7) CTA 생략 보정
  if (region && activeKeyword) {
    const re = new RegExp(`(${escapeRegex(region)}에서)\\s+(고려해보|알아보)`, 'g');
    t = t.replace(re, `$1 ${activeKeyword} $2`);
  }

  // (8) 본문 중간 해시태그 제거
  t = t.replace(/(^|[^A-Za-z0-9가-힣])#[^\s#]+/g, '$1');

  // (8-1) 섹션 메타 문구 제거
  t = t.replace(/\[섹션:[^\]]*\]\s*(?:최소\s*\d+자\.?)?\s*/g, '');
  t = t.replace(/^최소\s*\d+자\.?\s*/gm, '');
  t = t.replace(/^역할:\s*[^\n]*\n/gm, '');

  // (8-2) 화자 시점 충돌 보정
  t = t.replace(/["“]([^"”]{2,40})["”]?\s*라고\s*(하더라고요|했어요|말했어요)/g, (match, quote, _verb, offset, full) => {
    const before = full.slice(Math.max(0, offset - 30), offset);
    if (/(원장|의사|선생|간호|닥터|교수|남편|아내|친구|동료)/.test(before)) {
      return match;
    }
    return quote + ' 싶었어요';
  });
  t = t.replace(/([가-힣]+(?:구나|네|군))\s*라고\s*(하더라고요|했어요|말했어요)/g, (match, ending, _verb, offset, full) => {
    const before = full.slice(Math.max(0, offset - 30), offset);
    if (/(원장|의사|선생|간호|닥터|교수|남편|아내|친구|동료)/.test(before)) {
      return match;
    }
    return ending + ' 싶었어요';
  });

  // (8-3) 간접화법 → 직접 진술 변환
  t = t.replace(/라고\s*하시더라고요/g, '라고 설명해 주셨어요');
  t = t.replace(/라고\s*하시더군요/g, '라고 설명해 주셨어요');
  t = t.replace(/라고\s*하셨어요/g, '라고 설명해 주셨어요');
  t = t.replace(/고\s*하시더라고요/g, '고 짚어 주셨어요');
  t = t.replace(/고\s*하시더군요/g, '고 짚어 주셨어요');

  // (9) 줄 끝 공백 정리
  t = t.replace(/[ \t]+\n/g, '\n');

  // (10) 불완전 문장 정리 — ㄹ 받침 어간 우선
  t = t.replace(/([가-힣]+)\s+\.(?=\s|$|\n)/g, (match, word) => {
    if (/(요|다|음|습니다|니다|어요|아요|네요|군요)$/.test(word)) {
      return word + '.';
    }
    if (/(게|것|수|줄)$/.test(word)) {
      return word + ' 느껴졌어요.';
    }
    if (/(될|할|볼|올|들|일|날|쓸|갈|만들|받을|얻을|쥘|찾을|풀|걸|얼|뜰)$/.test(word)) {
      return word + ' 거예요.';
    }
    if (/(이|가|을|를|는|은|에|도|로|으로|와|과|만|까지|부터|에서|에게)$/.test(word)) {
      return '';
    }
    if (/(느낌|생각|기분|마음)$/.test(word)) {
      return word + '이었어요.';
    }
    const lastChar = word[word.length - 1];
    const code = lastChar.charCodeAt(0) - 0xAC00;
    const hasJongseong = code >= 0 && code < 11172 && (code % 28) !== 0;
    if (!hasJongseong) {
      return word + '예요.';
    }
    return word + '이에요.';
  });

  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/(?<=\.|\n)\s+(?=[가-힣A-Za-z0-9])/g, ' ');

  // (11) 헤더 직전 무종결 어절 보정
  t = t.replace(
    /([가-힣]+(?:이|가|을|를|는|은|에|도|로|으로|와|과|만|까지|부터|에서|에게))\s*\n+(?=##|###)/g,
    (match, word) => {
      if (/(이|가)$/.test(word))           return word + ' 줄었어요.\n\n';
      if (/(을|를)$/.test(word))           return word + ' 느꼈어요.\n\n';
      if (/(에|에서|까지|부터|로|으로)$/.test(word)) return word + ' 진행됐어요.\n\n';
      if (/(는|은|도|만|와|과|에게)$/.test(word))   return word + ' 호전됐어요.\n\n';
      return word + '.\n\n';
    }
  );
  t = t.replace(
    /([가-힣]+(?:게|것|수|줄))\s*\n+(?=##|###)/g,
    '$1 느껴졌어요.\n\n'
  );

  return t.trim();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ══════════════════════════════════════════════════════════════
// 🔧 v6 공통 엔진 — 모든 항목별 버그를 한 곳에서 차단
// ══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// [엔진 1] sanitizeKeywordIntegrity — 키워드 정합성 일괄 처리
//   - region+진료 단독 어색 결합 복구
//   - region+(이|이번|해당|그) 진료 결합 복구
//   - 진료+(진단|검사|상담|클리닉|병원|센터|전문) 키워드 누락 복구
//   - 진료 과정 / 해당 진료 같은 모호 축약 복구
// ─────────────────────────────────────────────────────────────
function sanitizeKeywordIntegrity(text, region, activeKeyword) {
  if (!text) return '';
  let t = text;
  if (!activeKeyword) return t;

  const akEsc = escapeRegex(activeKeyword);
  const NOUN_CHASE = '진단|검사|상담|클리닉|병원|센터|전문|치료|진료';
  const PARTICLE = '을|를|은|는|이|가|에|로|으로|와|과|에서|에게|까지|부터';
  const VERB_AFTER = '처음|덕분|시작|받|중|선택|결정|진행';

  // (a) region 결합 깨짐
  if (region) {
    const rEsc = escapeRegex(region);

    // "강남 해당 진료" / "강남 그 진료" / "강남 이 진료" / "강남 이번 진료"
    // → 뒤에 명사가 안 붙으면 활성키워드로 복원
    t = t.replace(
      new RegExp(`${rEsc}\\s+(해당|그|이|이번)\\s+진료(?!\\s+(?:${NOUN_CHASE}))`, 'g'),
      `${region} ${activeKeyword}`
    );
    // "강남 해당/그/이/이번 진료 + 명사" → "강남 (활성키워드) 명사"
    t = t.replace(
      new RegExp(`${rEsc}\\s+(?:해당|그|이|이번)\\s+진료\\s+(${NOUN_CHASE})`, 'g'),
      `${region} ${activeKeyword} $1`
    );
    // "강남 진료 진단/클리닉/전문/검사/상담/병원/센터" → "강남 (활성키워드) X"
    t = t.replace(
      new RegExp(`${rEsc}\\s+진료\\s+(${NOUN_CHASE})`, 'g'),
      `${region} ${activeKeyword} $1`
    );
    // "강남 진료 과정 X" → "강남 (활성키워드) X"
    t = t.replace(
      new RegExp(`${rEsc}\\s+진료\\s+과정\\s+(${NOUN_CHASE})`, 'g'),
      `${region} ${activeKeyword} $1`
    );
    // "강남 진료 (조사)" 단독 — region+진료만 단독 사용 → 활성키워드 복원
    t = t.replace(
      new RegExp(`${rEsc}\\s+진료(?=\\s*(?:${PARTICLE})\\s)`, 'g'),
      `${region} ${activeKeyword}`
    );
    // "강남 진료 (부사/동사어간)" — 시작/덕분/처음/받/중 등
    t = t.replace(
      new RegExp(`${rEsc}\\s+진료(?=\\s+(?:${VERB_AFTER}))`, 'g'),
      `${region} ${activeKeyword}`
    );
    // "강남 진료." / "강남 진료," — 구두점 직전
    t = t.replace(
      new RegExp(`${rEsc}\\s+진료(?=\\s*[.,!?])`, 'g'),
      `${region} ${activeKeyword}`
    );
  }

  // (b) region 없이 등장하는 깨진 결합
  // "이/이번/해당/그 진료 + 명사" → "(활성키워드) 명사"
  // 단, 활성키워드가 '... 진료'로 끝나면 중복 방지
  const akEndsJinryo = /진료$/.test(activeKeyword);
  if (!akEndsJinryo) {
    t = t.replace(
      new RegExp(`(이|이번|해당|그)\\s+진료\\s+(${NOUN_CHASE})`, 'g'),
      `${activeKeyword} $2`
    );
  } else {
    const akBase = activeKeyword.replace(/\s*진료\s*$/, '');
    if (akBase) {
      t = t.replace(
        new RegExp(`(이|이번|해당|그)\\s+진료\\s+(${NOUN_CHASE})`, 'g'),
        `${akBase} 진료 $2`
      );
    }
  }

  // "진료 과정 + 명사" 단독 (region 없이)
  if (!akEndsJinryo) {
    t = t.replace(
      new RegExp(`진료\\s+과정\\s+(${NOUN_CHASE})`, 'g'),
      `${activeKeyword} $1`
    );
  }

  // "해당 진료" 단독 (조사 결합 외)
  t = t.replace(/해당\s+진료(?!\s*(이|가|는|은|을|를|에|로|와|과|의))/g, activeKeyword);

  // 🔧 v8: 진단명 약어/잘림 오타 복구
  t = t.replace(/불안장이(?!애)/g, '불안장애');
  t = t.replace(/공황장이(?!애)/g, '공황장애');
  t = t.replace(/수면장이(?!애)/g, '수면장애');
  t = t.replace(/우울장이(?!애)/g, '우울장애');
  t = t.replace(/적응장이(?!애)/g, '적응장애');
  // '~장' 단독 (조사 결합형) → '~장애'
  t = t.replace(/(불안|공황|수면|우울|적응)장(?=\s+(있|없|진료|치료|증상|관련|진단))/g, '$1장애');

  // 🔧 v10: 받침 명사 + '로' 조사 오류 → '으로' 보정
  // GPT 빈출 오류: "격주 간격로", "주 1회 간격로", "정기적로"
  t = t.replace(/격주\s+간격로/g, '격주 간격으로');
  t = t.replace(/주\s+1회\s+간격로/g, '주 1회 간격으로');
  t = t.replace(/주\s+(\d+)회\s+간격로/g, '주 $1회 간격으로');
  t = t.replace(/([가-힣]+간격)로(?=\s|,|\.|$)/g, '$1으로');
  t = t.replace(/정기적로/g, '정기적으로');
  t = t.replace(/장기적로/g, '장기적으로');
  t = t.replace(/단기적로/g, '단기적으로');
  t = t.replace(/꾸준적로/g, '꾸준하게');

  // 🔧 v7: 활성키워드 + 어색 동사 결합 보정 ('하면서/해서' → '받으면서/받아서')
  // 진료/상담/치료는 '받다'가 자연 — '하다'는 능동(시술자) 어감
  if (activeKeyword) {
    const akEsc = escapeRegex(activeKeyword);
    // 진료/치료/상담으로 끝나는 키워드만 처리
    if (/(진료|치료|상담)$/.test(activeKeyword)) {
      t = t.replace(new RegExp(`${akEsc}를\\s+하면서`, 'g'), `${activeKeyword}를 받으면서`);
      t = t.replace(new RegExp(`${akEsc}을\\s+하면서`, 'g'), `${activeKeyword}을 받으면서`);
      t = t.replace(new RegExp(`${akEsc}를\\s+해서`, 'g'), `${activeKeyword}를 받아서`);
      t = t.replace(new RegExp(`${akEsc}을\\s+해서`, 'g'), `${activeKeyword}을 받아서`);
      t = t.replace(new RegExp(`${akEsc}를\\s+한\\s+지`, 'g'), `${activeKeyword}를 받은 지`);
      t = t.replace(new RegExp(`${akEsc}을\\s+한\\s+지`, 'g'), `${activeKeyword}을 받은 지`);
      t = t.replace(new RegExp(`${akEsc}를\\s+하고\\s+나서`, 'g'), `${activeKeyword}를 받고 나서`);
      t = t.replace(new RegExp(`${akEsc}을\\s+하고\\s+나서`, 'g'), `${activeKeyword}을 받고 나서`);
    }
  }

  return t;
}

// ─────────────────────────────────────────────────────────────
// [엔진 2] sanitizeBrokenSentence — 문장 구조 일괄 처리
//   - 명사 누락 (조사만 남음)
//   - 의존명사+새주체 (것도/수 다음 명사 직결)
//   - 부사 위치 어색 (물론/사실/결국 동사·체언 사이)
//   - 동사 활용 미완 (필요할/있을/줄어들고 등)
//   - '대해예요' '되어가요' 어색 종결
// ─────────────────────────────────────────────────────────────
function sanitizeBrokenSentence(text) {
  if (!text) return '';
  let t = text;

  // (a) 명사 누락 — 조사만 남은 패턴
  t = t.replace(/생활에서의\s+(가|이|을|를|은|는)\s+/g, '생활에서의 변화$1 ');
  t = t.replace(/일상에서의\s+(가|이|을|를|은|는)\s+/g, '일상에서의 변화$1 ');
  t = t.replace(/([가-힣]{2,5})에서의\s+(가|이|을|를|은|는)\s+(되어|자리|찾아|이어)/g,
                '$1에서의 변화$2 $3');
  // 문장 끝 명사 누락
  t = t.replace(/생활에서의\s*\.?\s*$/gm, '생활에서의 변화가 자리잡고 있어요.');
  t = t.replace(/느낌이\s*$/gm, '느낌이에요.');
  t = t.replace(/상태가\s*$/gm, '상태예요.');

  // 🔧 v7: 어미 잘림 — '필요하단이에요' 같은 비문 종결
  t = t.replace(/필요하단이에요\.?/g, '필요하다는 생각이 들어요.');
  t = t.replace(/필요하단\s*$/gm, '필요하다는 생각이 들어요.');
  // 일반 패턴: '~단이에요' / '~단에요' → '~다는 생각이 들어요'
  t = t.replace(/([가-힣]{1,4})단이에요\.?/g, '$1다는 생각이 들어요.');
  t = t.replace(/([가-힣]{1,4})단에요\.?/g, '$1다는 생각이 들어요.');

  // 🔧 v8: 의존명사 '수' 단독 종결 — '나아질 수' / '할 수' 끊김
  // (특수 케이스 우선)
  t = t.replace(/([가-힣]+)을\s+통해\s+조금씩\s+나아질\s+수\s*\.?\s*$/gm,
                '$1을 통해 조금씩 나아질 수 있겠다 싶어요.');
  t = t.replace(/([가-힣]+)을\s+통해\s+조금씩\s+나아질\s+수\s*\n/g,
                '$1을 통해 조금씩 나아질 수 있겠다 싶어요.\n');
  t = t.replace(/나아질\s+수\s*\.?\s*$/gm, '나아질 수 있겠다 싶어요.');
  t = t.replace(/나아질\s+수\s*\n\n/g, '나아질 수 있겠다 싶어요.\n\n');
  // 🔧 v10: '알 수' 종결 — '직접 방문해 봐야 정확히 알 수' 끊김
  t = t.replace(/직접\s+방문해\s+봐야\s+정확히\s+알\s+수\s*\.?\s*$/gm,
                '직접 방문해 봐야 정확히 알 수 있겠더라고요.');
  t = t.replace(/직접\s+방문해\s+봐야\s+정확히\s+알\s+수\s*\n/g,
                '직접 방문해 봐야 정확히 알 수 있겠더라고요.\n');
  t = t.replace(/([가-힣]+)\s+알\s+수\s*\n\n/g, '$1 알 수 있겠더라고요.\n\n');
  t = t.replace(/([가-힣]+)\s+알\s+수\s*\.?\s*$/gm, '$1 알 수 있겠더라고요.');
  // 일반 ㄹ받침 동사 + 수 단독 종결
  t = t.replace(/([가-힣]+)할\s+수\s*\.?\s*$/gm, '$1할 수 있어요.');
  t = t.replace(/([가-힣]+)할\s+수\s*\n\n/g, '$1할 수 있어요.\n\n');
  t = t.replace(/([가-힣]+)볼\s+수\s*\.?\s*$/gm, '$1볼 수 있어요.');
  t = t.replace(/([가-힣]+)들\s+수\s*\.?\s*$/gm, '$1들 수 있어요.');

  // 🔧 v8: 부사 단독 종결 — '훨씬이에요' / '많이에요' / '조금이에요'
  t = t.replace(/예전보다\s+훨씬이에요\.?/g, '예전보다 훨씬 편해졌어요.');
  t = t.replace(/([가-힣]+)\s+훨씬이에요\.?/g, '$1 훨씬 편해졌어요.');
  t = t.replace(/훨씬이에요\.?/g, '훨씬 편해졌어요.');
  t = t.replace(/훨씬\s*\.?\s*$/gm, '훨씬 나아졌어요.');
  t = t.replace(/많이에요\.?/g, '많이 좋아졌어요.');
  t = t.replace(/조금이에요\.?/g, '조금 나아졌어요.');
  t = t.replace(/꽤이에요\.?/g, '꽤 나아졌어요.');

  // 🔧 v10: '~진이에요' 어미 잘림 — '산만해진이에요' / '좋아진이에요'
  t = t.replace(/산만해진이에요\.?/g, '산만해졌어요.');
  t = t.replace(/덜\s+산만해진이에요\.?/g, '덜 산만해졌어요.');
  // 일반 패턴: '~아/어/여진이에요' → '~아/어/여졌어요'
  t = t.replace(/([가-힣]*[아])진이에요\.?/g, '$1졌어요.');
  t = t.replace(/([가-힣]*[어])진이에요\.?/g, '$1졌어요.');
  t = t.replace(/([가-힣]*[여])진이에요\.?/g, '$1졌어요.');
  t = t.replace(/([가-힣]*[해])진이에요\.?/g, '$1졌어요.');

  // 🔧 v11: 'ㄹ이에요' 어미 잘림 — '어려울이에요' / '힘들이에요' / '할이에요'
  t = t.replace(/어려울이에요\.?/g, '어려울 것 같아요.');
  t = t.replace(/힘들이에요\.?/g, '힘들 것 같아요.');
  t = t.replace(/까다로울이에요\.?/g, '까다로울 것 같아요.');
  t = t.replace(/([가-힣]+)할이에요\.?/g, '$1할 것 같아요.');
  t = t.replace(/([가-힣]+)볼이에요\.?/g, '$1볼 것 같아요.');
  t = t.replace(/([가-힣]+)될이에요\.?/g, '$1될 것 같아요.');
  // 일반 ㄹ받침 어간(을/울/들/일) + 이에요
  t = t.replace(/([가-힣]+[을울들일])이에요\.?/g, '$1 것 같아요.');

  // 🔧 v9: 감정 강도 완화 — safetyGuard에서 차단되는 표현 자동 치환
  //   "감정 ↓ / 상황 설명 ↑" 톤으로 변환 (자살·자해 직접 표현은 별도 차단 유지)
  // (a) '버티기/버겁' 류
  t = t.replace(/버티기\s+힘들었(어요|네요|다)/g, '일상이 불편했$1');
  t = t.replace(/버티기\s+힘들/g, '일상이 불편하');
  t = t.replace(/버겁(다|어요|었어요|네요|더라고요)/g, '신경 쓰여$1');
  t = t.replace(/버거웠(어요|네요|다)/g, '신경 쓰였$1');
  t = t.replace(/버거워서/g, '신경 쓰여서');
  // (b) '무너질/무너지' 류
  t = t.replace(/무너질\s+것\s+같았어요/g, '많이 신경 쓰였어요');
  t = t.replace(/무너질\s+것\s+같(아요|네요|다)/g, '많이 신경 쓰여$1');
  t = t.replace(/무너질\s+것\s+같/g, '많이 신경 쓰이');
  t = t.replace(/무너지(는|고|네|더라고요)/g, '버겁게 느껴지$1');
  // (c) '숨이 막힌' 류
  t = t.replace(/숨이\s+막힌다/g, '긴장이 됩니다');
  t = t.replace(/숨이\s+막힌(어요|었어요|네요)/g, '긴장이 됐$1');
  t = t.replace(/숨이\s+막힐\s+것\s+같/g, '긴장이 많이 되');
  // (d) 극단 표현
  t = t.replace(/살기\s+힘들었(어요|네요|다)/g, '일상이 버거웠$1');
  t = t.replace(/살기\s+힘드(네요|네)/g, '일상이 버겁$1');
  t = t.replace(/살기\s+힘들/g, '일상이 버거우');
  t = t.replace(/너무\s+심했(어요|네요|다)/g, '반복됐$1');
  // 시작 문장형(특수) 먼저 처리
  t = t.replace(/불안이\s+너무\s+심해서/g, '불안한 상황이 자주 생겨서');
  t = t.replace(/우울이\s+너무\s+심해서/g, '우울한 기분이 자주 이어져서');
  t = t.replace(/너무\s+심해서/g, '반복돼서');
  t = t.replace(/일상이\s+너무\s+힘들어서/g, '일상에서 불편함이 반복되면서');
  t = t.replace(/일상이\s+너무\s+힘들었(어요|네요|다)/g, '일상에서 불편함이 반복됐$1');
  t = t.replace(/너무\s+힘들었(어요|네요|다)/g, '불편함이 반복됐$1');
  t = t.replace(/너무\s+힘들어서/g, '불편함이 반복되면서');
  t = t.replace(/너무\s+힘들/g, '불편함이 이어지');
  // (e) 진단 확정 → 상담·확인 톤
  t = t.replace(/(불안장애|공황장애|우울장애|수면장애|적응장애)였(어요|네요|다)/g, '$1 관련 상담을 받았$2');
  t = t.replace(/(ADHD|성인 ADHD)였(어요|네요|다)/g, '$1 관련 상담을 받았$2');
  t = t.replace(/(우울증|불안장애|공황장애|수면장애)\s+진단을\s+받았(어요|네요|다)/g,
                '$1 관련 상담을 받았$2');

  // (b) 의존명사+새주체 (의존명사 다음 종결어미 누락)
  // "고민할 수 첫" / "받을 수 다음" 류
  t = t.replace(/([가-힣]+)할\s+수\s+(첫|마지막|이번|다음|한번|한)\s+(방문|진료|상담|회의|단계)/g,
                '$1할 수 있겠다 싶었어요. $2 $3');
  t = t.replace(/함께\s+고민할\s+수\s+(첫|마지막|이번|다음|한)/g,
                '함께 고민할 수 있겠다 싶었어요. $1');
  // "알아보는 것도 (새 주체)"
  t = t.replace(/알아보는\s+것도\s+(주말|평일|일상|회사|가족|동료|친구|아이|아침|저녁|밤)/g,
                '알아보고 싶었어요. $1');
  t = t.replace(/고민하는\s+것도\s+(주말|평일|일상|회사|가족|동료|친구|아이|아침|저녁|밤)/g,
                '고민이 됐어요. $1');
  // "있을 수 (줄바꿈)"
  t = t.replace(/있을\s+수\s*\n/g, '있을 수 있어요.\n');

  // (c) 부사 위치 어색 — '물론' 동사·체언 사이
  t = t.replace(/효과가\s+물론\s+완전히/g, '효과가 있더라고요. 물론 완전히');
  t = t.replace(/효과가\s+([가-힣]{1,5})\s+물론\s+완전히/g, '효과가 $1 있어요. 물론 완전히');
  t = t.replace(/변화가\s+물론\s+완전히/g, '변화가 있더라고요. 물론 완전히');
  // '사실/결국' 도 동일
  t = t.replace(/(효과|변화|결과)가\s+사실\s+완전히/g, '$1가 있더라고요. 사실 완전히');

  // (d) 동사 활용 미완 — '필요할/있을/줄어들고' 등
  t = t.replace(/필요할\s+알아봐야겠다/g, '필요한지 알아봐야겠다');
  t = t.replace(/필요할\s+알아/g, '필요한지 알아');
  // "(동사 ㄹ받침) 필요가 (명사)" → 동사 보존하고 종결
  t = t.replace(/([가-힣]+[을|ㄹ])\s+필요가\s+(성인 ADHD|치료|진료|증상|약물치료|상담)/g,
                '$1 필요가 있어요. $2');
  t = t.replace(/(있을|볼|할|들을|받을|찾을|만들)\s+필요가\s+(성인 ADHD|치료|진료|증상|약물치료|상담)/g,
                '$1 필요가 있어요. $2');
  // "필요가 (명사)라는" — 명사 직결
  t = t.replace(/필요가\s+(성인 ADHD|치료|진료|증상|약물치료|상담)라는/g,
                '필요했어요. $1라는');

  // (e) 미완성 종결 — 헤더 직전/뒤
  const ENDING_VERBS = '줄어들고|나아지고|회복되고|돌아오고|개선되고|잡혀가고|적응되고|안정되고|호전되고';
  t = t.replace(
    new RegExp(`(### \\d+(?:일|주|개월|달)[^\\n]*)\\n([\\s\\S]*?)(${ENDING_VERBS})\\s*(\\n\\s*\\n\\s*###)`, 'g'),
    '$1\n$2$3 있어요.$4'
  );
  t = t.replace(
    new RegExp(`(${ENDING_VERBS})\\s*(\\n\\s*\\n)`, 'g'),
    '$1 있어요.$2'
  );
  t = t.replace(new RegExp(`(${ENDING_VERBS})\\s*$`, 'gm'), '$1 있어요.');

  // (f) '~에 대해예요' 종결
  t = t.replace(/(향후|앞으로의)\s+(치료|진료|관리)\s+(방향|방법)에\s+대해예요\.?/g,
                '$1 $2 $3을 안내받았어요.');
  t = t.replace(/(방향|치료|진료|상담|진단|증상)에\s+대해예요\.?/g,
                '$1에 대한 안내를 받았어요.');
  t = t.replace(/([가-힣]+)에\s+대해예요\.?/g, '$1에 대한 이해가 생겼어요.');
  t = t.replace(/대해\s+있었어요\.?/g, '대해 안내를 받았어요.');

  return t;
}

// ─────────────────────────────────────────────────────────────
// [엔진 3] sanitizeEffectExpression — 효과 표현 일괄 처리
//   - 직설 단정 → 점진적 표현 ('확실히' 제거)
//   - 미래 단정 → 가능성 표현
//   - 효과 보장 → 변화 표현
// ─────────────────────────────────────────────────────────────
function sanitizeEffectExpression(text) {
  if (!text) return '';
  let t = text;

  // 직설 단정 '확실히' 제거
  t = t.replace(/확실히\s+잡혀가([요고])/g, '점차 잡혀가고 있어$1');
  t = t.replace(/확실히\s+잡혀\s*있/g, '점차 잡혀 있');
  t = t.replace(/확실히\s+좋아(졌|지)/g, '조금씩 좋아$1');
  t = t.replace(/확실히\s+나아(졌|지)/g, '조금씩 나아$1');
  t = t.replace(/확실히\s+줄어(들었|들고|드)/g, '점차 줄어$1');
  t = t.replace(/확실히\s+회복(됐|되|하)/g, '점차 회복$1');
  t = t.replace(/확실히\s+개선(됐|되)/g, '점차 개선$1');
  t = t.replace(/확실히\s+체감(되|됐|했)/g, '체감이 되$1');
  t = t.replace(/확실히\s+달라(졌|지)/g, '달라진 부분이 있$1');
  t = t.replace(/확실히\s+효과/g, '효과가 조금씩 나타');
  t = t.replace(/확실히\s+차이가\s*나/g, '차이가 느껴지');

  // 미래 단정
  t = t.replace(/꾸준히\s*관리하면\s*좋아질\s*거에요/g, '꾸준히 관리하시면 도움이 될 거예요');
  t = t.replace(/꾸준히\s*관리하면\s*좋아질\s*거예요/g, '꾸준히 관리하시면 도움이 될 거예요');
  t = t.replace(/반드시\s*좋아(질|져)/g, '나아질 가능성이 있$1');
  t = t.replace(/곧\s*완치(될|되)/g, '관리되$1');
  t = t.replace(/100%\s*(좋아|나아|회복)/g, '점차 $1');

  // 🔧 v7: '분명히' 직설 단정 (확실히와 동일 처리)
  t = t.replace(/분명히\s+있어요/g, '느껴져요');
  t = t.replace(/분명히\s+(나아|좋아|줄어|회복|개선)/g, '점차 $1');
  t = t.replace(/분명히\s+(잡혀|체감)/g, '점차 $1');
  t = t.replace(/분명히\s+달라(졌|지)/g, '달라진 부분이 있$1');
  // '명백히' 도 동일
  t = t.replace(/명백히\s+(있|나아|좋아|줄어|회복|개선)/g, '점차 $1');

  // 🔧 v7: 마무리 미래 약속 표현 차단
  // 통째 패턴 우선 처리 — 부분 매칭 시 '꾸준히' 중복 방지
  t = t.replace(/꾸준히\s*노력하면\s*더\s*좋은\s*결과가\s*이어질\s*것\s*같아요\.?/g,
                '꾸준히 이어가려고 해요.');
  t = t.replace(/꾸준히\s*노력하면\s*더\s*좋은\s*결과/g, '꾸준히 관리하면서 변화');
  t = t.replace(/더\s*좋은\s*결과가\s*이어질\s*것\s*같아요\.?/g, '꾸준히 이어가려고 해요.');
  t = t.replace(/(좋은|긍정적인|만족스러운)\s*결과가\s*이어질\s*것\s*같아요\.?/g,
                '$1 변화가 이어지길 바라며 관리 중이에요.');
  t = t.replace(/곧\s*나아질\s*거예요/g, '점차 나아지길 기대하고 있어요');

  // 🔧 v11: 반복 표현 차단 — 같은 종결구가 글 안에서 2회 초과 등장 시 변형
  const REPEAT_PATTERNS = [
    { re: /적합할\s*거예요/g,    alts: ['잘 맞을 것 같아요',     '적절해 보여요',         '맞춰갈 만해요'] },
    { re: /도움이\s*될\s*거예요/g, alts: ['효과를 기대해볼 만해요', '의미가 있을 것 같아요', '괜찮은 선택이에요'] },
    { re: /나아질\s*거예요/g,    alts: ['회복 흐름이 잡혀가요',   '점차 변화가 보여요',     '꾸준히 나아지고 있어요'] },
    { re: /도움이\s*되었어요/g,  alts: ['도움이 됐어요',          '의미가 있었어요',        '효과를 체감했어요'] },
  ];
  for (const { re, alts } of REPEAT_PATTERNS) {
    let count = 0;
    t = t.replace(re, m => {
      count++;
      if (count <= 1) return m;
      return alts[(count - 2) % alts.length];
    });
  }

  return t;
}

function removeConsecutive(text, words) {
  let t = text;
  for (const w of words) {
    let count = 0;
    const re = new RegExp(escapeRegex(w), 'g');
    t = t.replace(re, m => (++count > 1 ? '' : m));
  }
  return t;
}

// 🔒 v7: 문맥 기반 안전 치환
function limitKeywordRepeat(text, keyword, max) {
  const re = new RegExp(escapeRegex(keyword), 'g');
  const matches = text.match(re);
  if (!matches || matches.length <= max) return text;

  // 🔧 v6 patch: '이 진료', '이번 진료' 도 제거 — 모든 축약이 깨짐 유발
  // 활성 키워드를 그대로 두는 것이 가장 안전
  const REPLACEMENTS = ['진료'];

  let count = 0;
  return text.replace(re, (m, offset, full) => {
    count++;
    if (count <= max) return m;

    const before = full.slice(Math.max(0, offset - 5), offset);
    const after  = full.slice(offset + m.length, offset + m.length + 5);
    const ctx = before + after;

    const COLLISION = ['치료', '시술', '수술', '요법', '진료', '진단', '검사'];
    const hasCollision = COLLISION.some(c => ctx.includes(c));
    if (hasCollision) return m;

    // v7 가드 1: 키워드 직후 잘못된 조사 감지
    const afterChar = full[offset + m.length] || '';
    const afterChar2 = full[offset + m.length + 1] || '';
    const lastKwChar = m[m.length - 1];
    const lastCode = lastKwChar.charCodeAt(0) - 0xAC00;
    const lastHasJongseong = lastCode >= 0 && lastCode < 11172 && (lastCode % 28) !== 0;
    if (!lastHasJongseong && afterChar === '이' && /[\s가-힣]/.test(afterChar2)) {
      return m;
    }

    // v7 가드 2: 시간 한정사 + 명사 직결 회피
    // 🔧 v3: '진단/검사/상담' 추가 — '이 진료 진단' 같은 깨짐 방지
    const NOUN_AFTER = /^(\s*)(전문가|병원|원장|선생|의료진|기관|센터|클리닉|진단|검사|상담)/;
    const nounDirectlyAfter = NOUN_AFTER.test(after);
    // 🔧 v3: 명사가 바로 뒤에 오는 경우 치환 자체를 회피 (원형 그대로)
    if (nounDirectlyAfter) return m;

    let pick = REPLACEMENTS[(count - max) % REPLACEMENTS.length];
    return pick;
  });
}

// 🔒 v7: 치환 결과 후속 정리
function fixReplacementJosa(text) {
  let t = text;
  // 🔧 v6: REPLACEMENTS가 '진료' 단일이라 패턴도 단순화
  t = t.replace(/(^|[\s,.])진료이(\s|,|\.|$)/g, '$1진료가$2');
  t = t.replace(/(^|[\s,.])진료을(\s|,|\.|$)/g, '$1진료를$2');
  t = t.replace(/(^|[\s,.])진료은(\s|,|\.|$)/g, '$1진료는$2');
  return t;
}

// ──────────────────────────────────────────────────────────────
// 섹션별 이미지 박스 삽입 — 매뉴얼 PART 2-4 ⑦단계
// 🔒 v3 (2026.05): 5장 최적 (상단 노출 최적화)
//   - 유지: intro / consult / change2(2주) / change3(1개월) / closing
//   - 제거: search(본문형) / decision(비교표가 시각 대체) / change1(1주는 적응기)
//   - 사용자가 네이버 블로그에 붙여넣을 때 사진 자리 표시로 활용
// ──────────────────────────────────────────────────────────────
function insertSectionImages(text, imageAlts) {
  if (!text || !imageAlts) return text;
  let t = text;

  // (1) ## 고민 직후 → intro 박스
  t = t.replace(/(##\s*고민\s*\n)/, `$1${imageAlts.intro}\n\n`);
  // (2) ## 첫 방문 직후 → consult 박스
  t = t.replace(/(##\s*첫\s*방문\s*\n)/, `$1${imageAlts.consult}\n\n`);
  // (3) ### 2주 헤더 직후 → change2 박스 (가시적 변화 시점)
  t = t.replace(/(###\s*2\s*주[^\n]*\n)/, `$1${imageAlts.change2}\n\n`);
  // (4) ### 1개월 헤더 직후 → change3 박스 (회복 흐름)
  t = t.replace(/(###\s*1\s*개월[^\n]*\n)/, `$1${imageAlts.change3}\n\n`);
  // (5) ## 마무리 직후 → closing 박스
  t = t.replace(/(##\s*마무리\s*\n)/, `$1${imageAlts.closing}\n\n`);

  return t;
}

// ──────────────────────────────────────────────────────────────
// 정보블럭 삽입 — neuro v3 그대로 (앵커: '진료 결정')
// ──────────────────────────────────────────────────────────────
function insertInfoBlock(text, decisionAnchor = '진료 결정') {
  const blocks = INFO_BLOCKS.default;
  const block = blocks[Math.floor(Math.random() * blocks.length)];
  const md = renderBlockAsMarkdown(block);

  const findH2 = (label) => {
    const re = new RegExp(`(^|\\n)## ${escapeRegex(label)}\\b`, 'm');
    const m = re.exec(text);
    return m ? m.index + (m[1] === '\n' ? 1 : 0) : -1;
  };

  const decisionIdx = findH2(decisionAnchor);
  if (decisionIdx === -1) {
    const closingIdx = findH2('마무리');
    if (closingIdx === -1) return text + '\n\n' + md + '\n';
    return text.slice(0, closingIdx) + md + '\n\n' + text.slice(closingIdx);
  }

  let nextH2 = findH2('진료 후 변화');
  if (nextH2 === -1 || nextH2 < decisionIdx) {
    const re = /\n## /g;
    re.lastIndex = decisionIdx + 1;
    const m = re.exec(text);
    nextH2 = m ? m.index + 1 : -1;
  }

  if (nextH2 === -1) {
    return text + '\n\n' + md + '\n';
  }

  return text.slice(0, nextH2) + md + '\n\n' + text.slice(nextH2);
}

function renderBlockAsMarkdown(block) {
  const header = `### ${block.title}`;
  const headerRow = block.rows[0];
  const colCount = headerRow.length;
  const sep = `|${' --- |'.repeat(colCount)}`;
  const lines = [header, '', `| ${headerRow.join(' | ')} |`, sep];
  for (let i = 1; i < block.rows.length; i++) {
    lines.push(`| ${block.rows[i].join(' | ')} |`);
  }
  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────
// 수치 강제 삽입 — psy 변경: 앵커가 '## 첫 방문' (neuro는 '## 검진')
//                  pain 라벨도 '스트레스 강도'로 표현됨 (playConfig)
// ──────────────────────────────────────────────────────────────
function injectExamValue(text) {
  const v = EXAM_VALUES.default;
  const consultIdx = text.indexOf('## 첫 방문');
  if (consultIdx === -1) return text;
  const next = text.indexOf('\n## ', consultIdx + 1);
  const section = next === -1 ? text.slice(consultIdx) : text.slice(consultIdx, next);

  const hasNumber = /\d+\s*(회|주|일|개월|만원|점)/.test(section);
  if (hasNumber) return text;

  const inject = `\n원장님께서 일반적으로 ${v.sessions}, ${v.interval}로 진행하고, ${v.pain}, 비용은 ${v.cost}라고 설명해 주셨어요.\n`;
  if (next === -1) return text + inject;
  return text.slice(0, next) + inject + text.slice(next);
}

// ──────────────────────────────────────────────────────────────
// 중복 제거 — neuro v7 (줄 단위 4단계 포함)
// ──────────────────────────────────────────────────────────────
function removeDuplicates(text) {
  // 섹션 단위
  const sections = text.split(/\n## /);
  const seenSec = new Set();
  const uniqSec = [];
  sections.forEach((s, i) => {
    const head = s.split('\n')[0].slice(0, 30);
    if (i > 0 && seenSec.has(head)) return;
    seenSec.add(head);
    uniqSec.push(s);
  });
  let t = uniqSec.join('\n## ');

  // 문단 단위
  const paras = t.split(/\n{2,}/);
  const seenPara = new Set();
  const uniqPara = paras.filter(p => {
    const k = p.trim().slice(0, 60);
    if (!k) return false;
    if (seenPara.has(k)) return false;
    seenPara.add(k);
    return true;
  });
  t = uniqPara.join('\n\n');

  // v7: 줄 단위 중복 제거
  const lines = t.split('\n');
  const seenLine = new Set();
  const uniqLine = lines.filter(line => {
    if (/^(##|###|####)/.test(line.trim())) return true;
    if (line.trim().startsWith('|')) return true;
    if (line.trim() === '') return true;
    const norm = line.trim().replace(/[\s.,!?·…+\-]/g, '');
    if (norm.length < 6) return true;
    if (seenLine.has(norm)) return false;
    seenLine.add(norm);
    return true;
  });
  t = uniqLine.join('\n');

  // 문장 단위
  const sents = t.split(/(?<=[.!?])\s+/);
  const seenSent = new Set();
  const uniqSent = sents.filter(s => {
    const k = s.trim();
    if (k.length < 10) return true;
    const norm = k.replace(/[\s.,!?·…+\-]/g, '');
    if (seenSent.has(norm)) return false;
    seenSent.add(norm);
    return true;
  });
  return uniqSent.join(' ');
}

// ──────────────────────────────────────────────────────────────
// [v2] 네이버 본문용 마크다운 strip — text 필드 전용
// textMarkdown 필드는 원본 마크다운 보존, text 필드는 strip 적용
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// 메인 핸들러
// ──────────────────────────────────────────────────────────────
export default async function handlePsy(req, res) {
  const isPost = req.method === 'POST';
  const writtenSections = new Set();
  let totalText = '';
  let titleRaw = '';
  let detectedSite = '';
  let activeKeyword = '';
  let fullKeyword = '';

  if (!isPost) {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const body = req.body || {};
    const program = body.program || {};

    const region =
      body.region || program.region || '강남';

    const treatmentId =
      program.id || body.treatmentId || program.treatmentId || null;

    const treatmentName =
      program.name || body.treatmentName || program.treatmentName || null;

    const titleInput =
      body.title || program.title || null;

    console.log('[generatePsy] payload', { region, treatmentId, treatmentName });

    const treatment = PSY_TREATMENTS.find(
      t =>
        (treatmentId && t.id === treatmentId) ||
        (treatmentName && t.name === treatmentName)
    );
    if (!treatment) {
      console.error('[generatePsy] 진료 매칭 실패', {
        treatmentId,
        treatmentName,
        available: PSY_TREATMENTS.map(t => ({ id: t.id, name: t.name })),
      });
      res.status(400).json({
        error: `정신건강의학과 진료 정보를 찾을 수 없습니다. (id=${treatmentId}, name=${treatmentName})`,
      });
      return;
    }

    const tName = treatment.name;
    const dir = DIRECTION[treatment.id] || {};
    const keyword = dir.keyword || tName;

    titleRaw = titleInput || pickTitle(treatment, region);

    // 🔧 v2: region 중복 prefix 방어 — 한글에서 \b 미동작 우회
    titleRaw = titleRaw.replace(/(^|\s)([가-힣]{2,5})\s+\2(\s|$)/g, '$1$2$3');
    if (region) {
      const regionRe = new RegExp(`(^|\\s)(${escapeRegex(region)})\\s+\\2(\\s|$)`, 'g');
      titleRaw = titleRaw.replace(regionRe, '$1$2$3');
      // "인천 인천 성인 ADHD" 같이 입력 자체가 중복인 경우도 1회 더
      const regionRe2 = new RegExp(`${escapeRegex(region)}\\s+${escapeRegex(region)}\\s+`, 'g');
      titleRaw = titleRaw.replace(regionRe2, `${region} `);
    }

    detectedSite = SITE_KEYWORDS.find(s => titleRaw.includes(s)) || '';
    const isPrefixBlacklisted = SITE_PREFIX_BLACKLIST[treatment.id] === true;
    activeKeyword = (detectedSite && !isPrefixBlacklisted)
      ? `${detectedSite} ${keyword}`
      : keyword;
    fullKeyword = `${region} ${activeKeyword}`;

    // 섹션 순차 생성 (prevSummary 사용 금지)
    for (const section of PSY_FLOW) {
      if (writtenSections.has(section.key)) continue;

      const userPrompt = buildPrompt({
        sectionKey: section.key,
        region,
        treatmentId: treatment.id,
        treatmentName: tName,
        activeKeyword,
        fullKeyword,
        writtenSections,
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 1500,
      });

      const sectionText = completion.choices?.[0]?.message?.content || '';

      // 🔧 v2: 섹션 종결 검증 — 마지막 비공백 문자가 종결부호가 아니면 마침표 부착
      let sectionFinal = sectionText.trimEnd();
      const lastChar = sectionFinal.slice(-1);
      if (sectionFinal && !/[.!?。…”")\]]/.test(lastChar)) {
        // 한글/영문/숫자로 끝나는 경우만 마침표 부착 (특수기호는 그대로)
        if (/[가-힣A-Za-z0-9]/.test(lastChar)) {
          sectionFinal += '.';
        }
      }

      writtenSections.add(section.key);
      totalText += `\n\n## ${section.label}\n${sectionFinal}`;
    }

    // ── 후처리 9단계 (v6: 공통 엔진 통합) ─────────────────────
    // 0) 🚨 SAFETY GUARD — 가장 먼저
    let final = safetyGuard(totalText);
    // 1) cleanText (공통 엔진 3종 + 잔여 정리 통합)
    final = cleanPsyText(final, { activeKeyword, fullKeyword, region });
    // 2) 정보블럭 삽입 (앵커: 진료 결정)
    final = insertInfoBlock(final, '진료 결정');
    // 3) 수치 강제 삽입 (앵커: ## 첫 방문)
    final = injectExamValue(final);
    // 4) 중복 제거
    final = removeDuplicates(final);
    // 5) fullKeyword 3회 보강
    final = ensureFullKeyword(final, fullKeyword, 3);
    // 6) 🔧 v6: insertInfoBlock·injectExamValue·ensureFullKeyword가 만든 새 깨짐 재정리
    //    (공통 엔진 3종 재실행 — 키워드 정합성 + 문장 구조 + 효과 표현)
    final = sanitizeKeywordIntegrity(final, region, activeKeyword);
    final = sanitizeBrokenSentence(final);
    final = sanitizeEffectExpression(final);
    // 7) 자살 표현 재검사
    for (const pat of SUICIDE_PATTERNS) {
      if (pat.test(final)) {
        console.error('[SAFETY] 후처리 후 자살 표현 검출 — 글 차단');
        const err = new Error('정신건강 안전 정책에 따라 글 생성을 중단했습니다.');
        err.code = 'PSY_SAFETY_SUICIDE_POST';
        throw err;
      }
    }
    // 8) 🔧 v2: 이미지 ALT (섹션별 박스 객체) + 본문에 [이미지:] 박스 삽입
    // ─────────────────────────────────────────────
    // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
    //   풀: 상담 / 검사 / 치료 / 면담 / 일상
    // ─────────────────────────────────────────────
    const _rawImageAlts = getImageAlts(tName, region, activeKeyword);
    const _alt = (label) => `[이미지: ${label}]`;
    const imageAlts = {
      intro:   _alt("일상 사진"),
      consult: _alt("상담 사진"),
      change2: _alt("치료 사진"),
      change3: _alt("면담 사진"),
      closing: _alt("일상 사진"),
    };
    final = insertSectionImages(final, imageAlts);

    // 제목 정리
    let finalTitle = titleRaw.replace('{region}', region);
    finalTitle = finalTitle.replace(/(후기)([\s\S]*?)(후기)/, '$1$2');
    const tNameRe = new RegExp(`(${escapeRegex(tName)})\\s+\\1`, 'g');
    finalTitle = finalTitle.replace(tNameRe, '$1');

    // 해시태그 6개
    const hashtags = buildHashtags({ region, activeKeyword, treatmentName: tName });
    final = `# ${finalTitle}\n${final}\n\n${hashtags}`;

    // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
    final = final.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

    // ─────────────────────────────────────────────
    // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
    //   풀: 상담 / 검사 / 치료 / 면담 / 일상
    // ─────────────────────────────────────────────
    final = final.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
      const s = String(inner);
      if (/^(상담|검사|치료|면담|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
      if (/검사|심리검사|MMPI|진단|소견|평가/i.test(s))         return "[이미지: 검사 사진]";
      if (/치료|약물|처방|투약|항우울|항불안/.test(s))         return "[이미지: 치료 사진]";
      if (/면담|인지치료|CBT|행동치료|상담치료|세션/.test(s))   return "[이미지: 면담 사진]";
      if (/상담|진료|설명|차트|문진|원장|의사|병원/.test(s))   return "[이미지: 상담 사진]";
      if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
      return "[이미지: 상담 사진]";
    });

    const _altAll = final.match(/\[이미지:[^\]]+\]/g) || [];
    const _altOk  = _altAll.filter(a => /\[이미지:\s*(상담|검사|치료|면담|일상)\s*사진\]/.test(a));
    console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

    // ── QC 로그 ──────────────────────────────────────────────
    const qcInfoBlock = /### .+\n\n\| /.test(final);
    const qcExamValue = /\d+\s*(회|주|일|개월|만원|점)/.test(final);
    const qcKeywordRepeat = (final.match(new RegExp(escapeRegex(activeKeyword), 'g')) || []).length;
    const qcFullKeyword = (final.match(new RegExp(escapeRegex(fullKeyword), 'g')) || []).length;
    const charCount = final.replace(/\s/g, '').length;

    console.log('[QC] 정보블럭:', qcInfoBlock);
    console.log('[QC] 수치:', qcExamValue);
    console.log('[QC] 키워드반복:', qcKeywordRepeat);
    console.log('[QC] 완전체키워드:', qcFullKeyword);
    console.log('[QC] 글자수:', charCount);

    // 🔧 v6 공통 엔진 진단 — 잔존 깨짐 카운트
    const regionEsc = region ? escapeRegex(region) : '';
    const qcKeywordIntegrity =
      (region ? (final.match(new RegExp(`${regionEsc}\\s+(이|이번|해당|그)\\s+진료(?!\\s+(?:진단|검사|상담|클리닉|병원|센터|전문|치료))`, 'g')) || []).length : 0) +
      (region ? (final.match(new RegExp(`${regionEsc}\\s+진료\\s+(진단|클리닉|전문|검사|상담)`, 'g')) || []).length : 0) +
      (final.match(/해당\s+진료(?!\s*(이|가|는|은|을|를|에|로|와|과|의))/g) || []).length;
    const qcBrokenSentence =
      (final.match(/대해예요/g) || []).length +
      (final.match(/생활에서의\s+(가|이|을|를)/g) || []).length +
      (final.match(/효과가\s+물론\s+완전히/g) || []).length +
      (final.match(/[가-힣]+할\s+수\s+(첫|마지막|이번|다음)\s+(방문|진료|상담)/g) || []).length;
    console.log('[QC] 키워드정합성잔존:', qcKeywordIntegrity, qcKeywordIntegrity > 0 ? '⚠️' : '✅');
    console.log('[QC] 문장깨짐잔존:', qcBrokenSentence, qcBrokenSentence > 0 ? '⚠️' : '✅');

    // 🔒 안전 가드 통과 로그
    console.log('[QC] 안전가드: 통과 ✅');

    // 반말 검출 (참고)
    const banmalPatterns = [/었거든\b/g, /더라고\b(?!요)/g, /이었어\b(?!요)/g, /했어\b(?!요)/g, /있었어\b(?!요)/g];
    const banmalCount = banmalPatterns.reduce((s, re) => s + (final.match(re) || []).length, 0);
    console.log('[QC] 반말검출:', banmalCount, banmalCount >= 5 ? '⚠️ 톤 점검 필요' : '');

    // ★ [v2] 네이버 본문용 plain 텍스트 + textMarkdown dual 필드 ──────
    const finalPlain = stripMarkdownForNaver(final);
    const charCountPlain = finalPlain.replace(/\s/g, '').length;

    res.status(200).json({
      ok: true,
      industry: 'psy',
      text: finalPlain,
      textMarkdown: final,
      title: finalTitle,
      content: finalPlain,
      post: finalPlain,
      html: final,
      imageAlts,
      alts: imageAlts,
      treatment: { id: treatment.id, name: tName, cat: treatment.cat },
      meta: {
        region,
        activeKeyword,
        fullKeyword,
        imageAlts,
        qc: {
          infoBlock: qcInfoBlock,
          examValue: qcExamValue,
          keywordRepeat: qcKeywordRepeat,
          fullKeyword: qcFullKeyword,
          charCount: charCountPlain,
          safetyGuard: 'passed',
        },
      },
    });
  } catch (e) {
    console.error('[generatePsy ERROR]', e);
    // 안전 가드 위반은 400으로 (서버 오류와 구분)
    if (e.code === 'PSY_SAFETY_SUICIDE' || e.code === 'PSY_SAFETY_SUICIDE_POST') {
      res.status(400).json({ error: e.message, code: e.code });
      return;
    }
    res.status(500).json({ error: e.message || '정신건강의학과 글 생성 중 오류' });
  }
}

// 보조: 제목 패턴 랜덤 선택
function pickTitle(treatment, region) {
  const patterns = treatment.titlePatterns || [`{region} ${treatment.name} 후기`];
  const pick = patterns[Math.floor(Math.random() * patterns.length)];
  return pick.replace('{region}', region);
}

// 보조: fullKeyword 3회 미만이면 정보형 풀에서 보강
function ensureFullKeyword(text, fullKeyword, minCount) {
  const re = new RegExp(escapeRegex(fullKeyword), 'g');
  const count = (text.match(re) || []).length;
  if (count >= minCount) return text;

  const need = minCount - count;

  // 정신과 정보형 풀 — CTA 없음, 권유 없음, 사실·정보 진술
  const POOL = [
    `${fullKeyword} 관련 사례를 찾아보면 비슷한 경우가 많다.`,
    `${fullKeyword} 검색 시 유사한 진료 흐름을 확인할 수 있다.`,
    `${fullKeyword} 기준으로 보면 비슷한 결정 과정이 반복된다.`,
    `${fullKeyword} 관련 후기 글에서 변화 체감 시점이 비슷하게 나타난다.`,
    `${fullKeyword} 사례 비교 자료를 보면 판단 기준이 명확해진다.`,
  ];

  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  const lines = [];
  for (let i = 0; i < need; i++) {
    lines.push(shuffled[i % shuffled.length]);
  }
  const block = '\n' + lines.join(' ') + '\n';

  const closingIdx = text.lastIndexOf('## 마무리');
  if (closingIdx === -1) return text + block;
  return text.slice(0, closingIdx) + block + text.slice(closingIdx);
}

// 보조: 해시태그 6개
function buildHashtags({ region, activeKeyword, treatmentName }) {
  const tags = [
    `#${region}정신건강의학과`,
    `#${region}${treatmentName}`,
    `#${activeKeyword.replace(/\s/g, '')}`,
    `#${treatmentName}후기`,
    `#${region}${treatmentName}후기`,
    `#정신건강의학과후기`,
  ];
  return [...new Set(tags)].slice(0, 6).join(' ');
}
