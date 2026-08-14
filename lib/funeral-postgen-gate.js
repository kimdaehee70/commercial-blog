// lib/funeral-postgen-gate.js — FUNERAL-POSTGEN-SAFE-DROP-01
// 생성 후 후처리 Gate. 순수 함수. 엔진/프롬프트/GENERAL_ASSET 의존 0. 부작용 0.
//
// 규칙 (DESIGN PASS 확정본):
//   삭제 = 금지형 3종 문구 일치
//        AND hallFacts 값 exact substring 미포함
//        AND 삭제 후 BODY 최종 요소가 [이미지: …] 캡션이 되지 않을 것
//   위 중 하나라도 걸리면 SKIP(원문 보존). SKIP 은 실패가 아니라 안전장치 발동이다.
//
// ★ 대상 3종만. 시설값→효과 는 절대 건드리지 않는다(FUNERAL-FACT-CLAUSE-BOUNDARY-01 FAIL · 공급측 HOLD).
// ★ 위치를 조건으로 쓰지 않는다(닫는 인사가 #2 도입부에서도 발현 — 16_광주국빈).
// ★ 삭제로 생긴 자리를 새 문장으로 메우지 않는다. 생성 금지.

// ★ ESM. generateFuneral.js 가 ESM import 체계이므로 CJS interop 변수를 만들지 않는다.

// ── 금지형 3종 (bm2.mjs 축자 동일) ──
export const SAFE_DROP_PATTERNS = {
  "주소→행동": [/주소[를은].{0,30}(참고|확인|바탕)/, /방문하시기 전/, /찾아가실 때/],
  "정보→도움/유용": [/유용한 정보/, /도움이 되는 정보/, /참고가 되는 정보/],
  "닫는 인사": [/도움이 되[길시]/, /참고가 되[길시]/, /잘 준비하시/, /안내는 여기까지/],
};

const CAPTION = /^\[이미지\s*:/;
const SPLIT_SENT = /(?<=[다요]\.)\s+/;

// hallFacts → 값 문자열 배열. 라벨은 쓰지 않는다.
// ★ 삭제 안전 판정은 값 대조여야 한다 — 라벨(주소) 기준이면 4건 전건이 오판된다.
export function factValues(hallFacts) {
  if (!hallFacts || typeof hallFacts !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(hallFacts)) {
    if (k === "name") continue;
    const s = String(v == null ? "" : v).trim();
    if (s) out.push(s);
  }
  return out;
}

function matchType(sentence) {
  for (const [type, pats] of Object.entries(SAFE_DROP_PATTERNS)) {
    for (const re of pats) {
      const m = sentence.match(re);
      if (m) return { type, pattern: re.source, matched: m[0] };
    }
  }
  return null;
}

// 본문을 [행 → 문장] 2단 구조로 분해. 삭제는 문장 단위, 재조립은 행 단위.
function decompose(body) {
  return body.split(/\r?\n/).map((line) => ({
    raw: line,
    sents: line.trim() ? line.split(SPLIT_SENT).map((s) => s.trim()).filter(Boolean) : [],
  }));
}

function recompose(lines) {
  return lines
    .filter((l) => (l.sents.length ? true : l.raw.trim() === ""))
    .map((l) => (l.sents.length ? l.sents.join(" ") : l.raw))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 재조립 결과의 최종 산문 요소가 캡션인가.
function endsWithCaption(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (!l.sents.length) continue;
    const last = l.sents[l.sents.length - 1];
    return CAPTION.test(last);
  }
  return true; // 산문이 하나도 남지 않음 → 파손으로 간주
}

/**
 * @param {string} bodyText  BODY 원문(■ 이후 블록 제외분을 넣는다)
 * @param {object} hallFacts 생성에 사용된 시설 Facts
 * @returns {{text:string, dropped:Array, skipped:Array, changed:boolean}}
 */
export function applySafeDropGate(bodyText, hallFacts) {
  const values = factValues(hallFacts);
  const lines = decompose(String(bodyText || ""));
  const dropped = [], skipped = [];

  for (let li = 0; li < lines.length; li++) {
    for (let si = 0; si < lines[li].sents.length; si++) {
      const sentence = lines[li].sents[si];
      if (CAPTION.test(sentence)) continue;

      const hit = matchType(sentence);
      if (!hit) continue;

      // ① Facts 값 exact substring
      const carried = values.filter((v) => sentence.includes(v));
      if (carried.length) {
        skipped.push({ ...hit, sentence, reason: "FACTS_VALUE", detail: carried });
        continue;
      }

      // ② 삭제 시뮬레이션 → 이미지 종결 여부
      // ★ 상태가 아니라 변화를 본다. 원래부터 캡션 종결이면 이 삭제가 만든 결과가 아니다.
      //    before=false && after=true 인 경우에만 SKIP.
      const beforeTail = endsWithCaption(lines);
      const backup = lines[li].sents;
      lines[li].sents = backup.filter((_, k) => k !== si);
      if (!beforeTail && endsWithCaption(lines)) {
        lines[li].sents = backup;
        skipped.push({ ...hit, sentence, reason: "IMAGE_TAIL" });
        continue;
      }

      dropped.push({ ...hit, sentence });
      si--; // 배열이 줄었으므로 같은 인덱스를 다시 본다
    }
  }

  return { text: recompose(lines), dropped, skipped, changed: dropped.length > 0 };
}
