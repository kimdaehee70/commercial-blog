// ============================================================
// textPatch.js  —  조사/키워드 삽입 버그 통합 패치
// 사용법:
//   const { cleanText, safeInjectKeyword, josa } = require('./textPatch');
// generate{업종}.js 의 cleanText() 자리에 import 해서 사용
// ============================================================


// ─────────────────────────────────────────────
// 1. 받침 판별 + 조사 자동 결합
// ─────────────────────────────────────────────
function hasJongseong(word) {
  if (!word) return false;
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

function josa(word, withJong, withoutJong) {
  return word + (hasJongseong(word) ? withJong : withoutJong);
}

const JOSA_PAIRS = {
  '이': '가',  '가': '이',
  '은': '는',  '는': '은',
  '을': '를',  '를': '을',
  '과': '와',  '와': '과',
  '으로': '로','로': '으로',
};

function fixJosa(word, currentJosa) {
  const need = hasJongseong(word);
  const hasJong = ['이','은','을','과','으로'].includes(currentJosa);
  if (need === hasJong) return word + currentJosa;
  return word + JOSA_PAIRS[currentJosa];
}


// ─────────────────────────────────────────────
// 2. cleanText — 깨진 패턴 일괄 수정
// ─────────────────────────────────────────────
function cleanText(text, keyword, region) {
  if (!text) return text;
  let out = text;
  const kwRe = escapeRegex(keyword);

  // [A] 키워드+조사 자동 교정
  //   "대장내시경이 용종" → 대장내시경 받침 없음 → "대장내시경가"
  //   "대장내시경와" → "대장내시경과"
  const josaList = ['으로','로','이','가','은','는','을','를','과','와'];
  for (const j of josaList) {
    const re = new RegExp(`(${kwRe})${j}(?=[\\s가-힣])`, 'g');
    out = out.replace(re, (m, kw) => fixJosa(kw, j));
  }

  // [B] 따옴표 직후 키워드 붙음 분리
  //   '"조기"대장내시경' → '"조기" 대장내시경'
  out = out.replace(/(["'\u201C\u201D\u2018\u2019])([가-힣A-Za-z])/g, '$1 $2');
  out = out.replace(/([가-힣A-Za-z])(["'\u201C\u201D\u2018\u2019])([가-힣A-Za-z])/g, '$1$2 $3');

  // [C] 마침표 누락 + 따옴표 + 키워드 붙음 복구
  //   '안전하다"대장내시경는' → '안전하다." 대장내시경은'
  out = out.replace(
    new RegExp(`([가-힣])(["'\u201C\u201D\u2018\u2019])(${kwRe})`, 'g'),
    (m, c, q, kw) => `${c}.${q} ${kw}`
  );

  // [D] 키워드+조사 + 다른 명사 직접 결합 차단
  //   "대장내시경이 소화기내과에서" → "소화기내과에서 대장내시경을"
  out = out.replace(
    new RegExp(`(${kwRe})(이|가|은|는)\\s+(소화기내과|병원|의원|클리닉|센터)(에서|에|는|은)?`, 'g'),
    (m, kw, j, noun, particle) => {
      const kwJ = josa(kw, '을', '를');
      return `${noun}${particle || '에서'} ${kwJ}`;
    }
  );

  // [E] 키워드 반복 차단 (3회 초과 시 "이 검사 / 검사"로 치환)
  //     한 번 치환된 건 절대 되돌리지 않음
  let count = 0;
  out = out.replace(new RegExp(kwRe, 'g'), (m) => {
    count++;
    if (count <= 3) return m;
    return count % 2 === 0 ? '이 검사' : '검사';
  });

  // [F] 공백/조사 잔여 정리
  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/\.\s*\./g, '.');

  // [G] AI 냄새 표현 제거 — 문장 단위 split 후 매칭 문장 통째 삭제
  const aiKeywords = [
    '섬세한 관리 덕분',
    '상담해보는 것도 좋',
    '고려해볼 만',
    '방법이에요',
    '드디어 결심하고',
    '결국 선택하게 되었',
    '마음이 편안해졌',
  ];
  // 종결어 없을 수 있어 문장+줄바꿈 모두로 split
  const sents = out.split(/(?<=[.!?\n])\s*/);
  const filtered = sents.filter(s => {
    if (!s.trim()) return false;
    return !aiKeywords.some(kw => s.includes(kw));
  });
  out = filtered.join(' ');
  // 안전장치: 출력이 완전히 빈 경우만 원본 복원 (부분 삭제는 OK)
  if (!out.trim()) out = '';

  // [H] "수면 증상" 오류 → "수면내시경"
  out = out.replace(/수면\s+(증상|이라는|이라고|있다는|받았)/g, '수면내시경 $1');

  return out.trim();
}


// ─────────────────────────────────────────────
// 3. 안전한 키워드 강제삽입
//   문장 중간 삽입 금지 — 마침표 뒤에서만
// ─────────────────────────────────────────────
function safeInjectKeyword(text, fullKeyword, minCount = 3) {
  const re = new RegExp(escapeRegex(fullKeyword), 'g');
  const matches = text.match(re) || [];
  const need = minCount - matches.length;
  if (need <= 0) return text;

  const sentences = text.split(/(?<=[.!?])\s+/);
  let injected = 0;
  for (let i = 1; i < sentences.length && injected < need; i += 2) {
    if (!sentences[i].includes(fullKeyword)) {
      sentences[i] = `${fullKeyword} 관련해서 보면, ${sentences[i]}`;
      injected++;
    }
  }
  return sentences.join(' ');
}


// ─────────────────────────────────────────────
// 4. 헬퍼
// ─────────────────────────────────────────────
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickJosa(word, originalJosa) {
  const map = {
    '이':'가', '가':'이', '은':'는', '는':'은',
    '을':'를', '를':'을', '과':'와', '와':'과'
  };
  const need = hasJongseong(word);
  const hasJ = ['이','은','을','과'].includes(originalJosa);
  return need === hasJ ? originalJosa : map[originalJosa];
}


// ─────────────────────────────────────────────
// 5. 셀프 테스트
// ─────────────────────────────────────────────
function runTests() {
  const cases = [
    { in: '대장내시경이 용종을 발견했어요',          kw: '대장내시경' },
    { in: '대장내시경와 위내시경을 같이 받았어요',   kw: '대장내시경' },
    { in: '"조기"대장내시경는 중요해요',              kw: '대장내시경' },
    { in: '안전하다"대장내시경는 검사예요',           kw: '대장내시경' },
    { in: '대장내시경이 소화기내과에서 진행되었어요',kw: '대장내시경' },
    { in: '수면 증상이 있다는 이야기를 들었어요',     kw: '대장내시경' },
    { in: '섬세한 관리 덕분인지 좋아졌어요',          kw: '대장내시경' },
    { in: '상담해보는 것도 좋아요. 고려해볼 만해요.',kw: '대장내시경' },
  ];
  console.log('─── cleanText 셀프 테스트 ───');
  for (const c of cases) {
    const out = cleanText(c.in, c.kw, '서울');
    console.log(`IN : ${c.in}`);
    console.log(`OUT: ${out}\n`);
  }
}


module.exports = {
  cleanText,
  safeInjectKeyword,
  josa,
  hasJongseong,
  fixJosa,
  runTests,
};

if (require.main === module) runTests();
