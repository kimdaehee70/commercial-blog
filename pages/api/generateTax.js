// ============================================================
// pages/api/generateTax.js — 세무사(tax) 엔진 핸들러 V2
// ============================================================
// [세션43][SPINE7-TAX] 단일호출 → 7섹션 전문직 Spine.
//   concern / firstMove / deadline / documents / savings / process / closing
//
//   엔진 축(법무사 V2 세션42 공통 재사용):
//     · Spine 조립 · 소제목 코드부여 · 사진 5슬롯
//     · stripCliche / capEvalSentences / removeDupParagraphs / compressDupSentencesV2
//     · GEO-GATE / GEO-CAP / SELF-PROMO / SPEAKER-CLEAN / DROP-FIX
//     · [세션43] DOC-SOT / DOC-SPLIT / SPACE-FIX
//   콘텐츠 축(세무사 전용):
//     · ★ cost → savings 교체 (유일한 축 변경)
//       법무사 검색자 = "비용이 얼마나 드나" / 세무사 검색자 = "세금을 얼마나 줄이나"
//     · tax-v2-prompts · tax-v2-data · mistake·consult 미이식
//
//   ★ V1 실측 병리 — legal보다 앞단계:
//     tax V1 = funeral 복사베이스 + GPT 1회 단일호출. 섹션 개념 자체가 부재.
//     tax-playConfig(5섹션)는 핸들러 미참조 DEAD CODE였고,
//     정보블럭은 본문 끝 덤프, 사진은 문단 인덱스 홀수마다 기계 삽입되었다.
//     -> 역할 배타화가 성립할 구조가 없었다. Spine 도입 = 구조 신설.
//
//   ★ tax 고유 최대 리스크 = 결과 보장이 아니라 '절세·환급 단정'(세무사법).
//     legal MONEY-CAP(금액·요율 드롭)에 더해 [SAVINGS-CAP] 신설:
//     "줄일 수 있습니다 / 환급받을 수 있습니다" 같은 결과 약속 문장을 통째로 드롭.
//     savings 섹션이 정확히 그 지뢰밭이다.
//
// engineBootstrap에서 register("tax", handleTax) — 이미 등록됨. 무수정.
// (주의) 작업DB vuuqtrzcfjbywlxqskoi — 본 세션 DB 변경 0.
// ============================================================

import OpenAI from "openai";
import { TAX_TREATMENTS } from "../../lib/tax-data";
import { FORBIDDEN as TAX_FORBIDDEN } from "../../lib/tax-prompts";
import { TAX_FLOW } from "../../lib/tax-playConfig";
import { buildSystemPromptV2, buildUserPromptV2, AI_CLICHE, TAX_GUARANTEE_BAN } from "../../lib/tax-v2-prompts";
import { TAX_AXIS } from "../../lib/tax-v2-data";   // ★ [세션43-2] filing | managing
// [v-loc] 위치/주차 공통 후단 블록 — 전 업종 공유(PATCH-07). 응답 직전 본문 끝 삽입.
// [세션47][PRO-VISIT] 전문직 방문정보 공통 모듈. locationBlock 재사용(내부 호출) — 위치블록 직접 호출 제거.
import { insertProVisitInfo, PRO_PHOTO_POOL } from "../../lib/proVisitBlock.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 공백·조사 정리 ────────────────────────
//   [세션41 계승] 업무명 generic 치환 금지. '상속등기 등기'류 문장 파손 원인.
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  t = t.replace(/받고나면/g, "받고 나면");
  return t.trim();
}

// ── 금칙어 제거 (후기형·결과보장·AI 논문투) ──────────
function stripForbidden(text) {
  let t = text;
  for (const w of TAX_FORBIDDEN) t = t.split(w).join("");
  for (const w of TAX_GUARANTEE_BAN) t = t.split(w).join("");
  // AI 논문형 연결어 (줄머리)
  ["따라서", "결론적으로", "정리하면", "살펴보겠습니다"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  return t;
}

// ── [세션43][CLICHE] AI 상투어 문장 제거 ────────────────
//   프롬프트 금지만으론 GPT가 회귀 → 후처리 이중 차단.
//   상투어 포함 '문장'을 통째로 드롭(구절만 지우면 문장이 깨짐).
//   ⚠ 목록 줄(- ·) 보존. 소제목(## ) 블록 보호.
//
//   ★ [세션43][DROP-FIX] 전량삭제 방지 로직 수정 (실측 버그).
//     구: (kept.length ? kept : sents) — 블록의 문장이 전부 드롭 대상이면 '원문 복구'.
//     문제: 단일 문장 블록(상투어 1문장 = 1블록)은 kept.length===0 → 원문이 그대로 살아남음.
//           → 필터가 사실상 무력화. 다문장 블록에서만 우연히 작동했음.
//     신: 빈 블록은 그대로 비우고, 최종 filter(Boolean)로 제거한다.
//         소제목 블록은 헤더 라인을 항상 보존해 섹션 소실을 막는다.
//     ⚠ 변호사(lawyer) 엔진에 동일 병리 존재 — FREEZE·관측 중이므로 본 세션 미변경(후속 과제).
function _headOf(block) {
  const m = block.match(/^(##\s*[^\n]*)\n*/);
  return m ? m[1] : null;
}
function stripCliche(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;           // 목록 보존
    const head = _headOf(block);                             // 소제목 보호
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => s.trim() && !AI_CLICHE.some((c) => s.includes(c)));
    const joined = kept.join(" ").trim();                    // 전량 드롭 시 빈 문자열 허용
    if (head) return joined ? `${head}\n\n${joined}` : head; // 헤더는 항상 보존
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [세션43][EVAL-CAP] 평가 종결 문장 상한 ──────────────
//   "중요합니다 / 필요합니다 / 주의가 필요합니다" 반복 = 같은 말 반복 체감의 실체.
//   전문(全文) 기준 2회 초과분 문장 드롭. 목록 줄 보존.
const EVAL_TAIL = /(중요합니다|필요합니다|영향을 미칩니다|주의가 필요합니다|고려해야 합니다|인지해야 합니다|유의해야 합니다)\s*[.]?\s*$/;
const EVAL_CAP = 2;
//   ★ [세션43][DROP-FIX] stripCliche와 동일 수정. 단일 문장 블록도 정상 드롭.
function capEvalSentences(text) {
  let hit = 0;
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;           // 목록 보존
    const head = _headOf(block);                             // 소제목 보호
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => {
      if (!s.trim()) return false;
      if (!EVAL_TAIL.test(s.trim())) return true;
      hit += 1;
      return hit <= EVAL_CAP;                                // 상한 초과분만 드롭
    });
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [세션43][MONEY-CAP] 금액·요율 수치 단정 차단 ─────────
//   금액·요율 수치가 나오면 세액 단정이 된다. savings·process에서 회귀 대비.
//   ⚠ deadline의 기간 숫자(3개월·5월 31일·20일)는 잡지 않는다 — MONEY_RE는 금액/%만 매칭.
//   금액/요율 표기 문장을 드롭(구절 제거 시 문장 파손). 목록 줄 보존.
const MONEY_RE = /(\d[\d,]*\s*(만원|원|천원|억)|\d+(\.\d+)?\s*%)/;
//   ★ [세션43][DROP-FIX] 동일 수정. 목록 줄에도 금액이 섞이므로 목록 줄 단위로도 검사.
function stripMoneyClaims(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    // 목록 블록: 줄 단위로 금액 포함 줄만 드롭 (목록 구조 보존)
    if (/(^|\n)\s*[-·]/.test(block)) {
      const lines = block.split("\n").filter((l) => !MONEY_RE.test(l));
      return lines.join("\n").trim();
    }
    const head = _headOf(block);
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => s.trim() && !MONEY_RE.test(s));
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [세션43][SPEAKER-CLEAN] 화자 오염 단독 라인 차단 ────────
//   ★ 실측(1차 생성): 본문 끝에 "관리자" 단독 라인 출현.
//     GPT가 블로그 서명 습관으로 붙이는 패턴. 변호사는 "운영자"만 차단하고 있었음(누락).
//   대응: 서명형 호칭을 목록으로 차단. 조사·마침표 없는 '단독 라인'만 대상 →
//         본문 중 "관리자에게 문의" 같은 정상 문장은 보존된다.
const SPEAKER_POLLUTION = [
  "운영자", "관리자", "작성자", "편집자", "블로그지기", "블로그 관리자",
  "담당자", "글쓴이", "에디터", "admin", "Admin",
];
const SPEAKER_POLLUTION_RE = new RegExp(
  `(^|\\n)\\s*(?:${SPEAKER_POLLUTION.join("|")})\\s*(?=\\n|$)`, "g"
);

// ── [세션43-2][SELF-PROMO] 사무소 자기지시·홍보 문장 드롭 ────
//   ★ 실측(1차 생성) firstMove 말미:
//     "잠실 송리단길 상속등기 세무사 사무소에서는 이 과정에서 필요한 모든 정보를 제공하며,
//      각 상황에 맞는 조언을 통해 절차를 지원합니다."
//   결합 키워드만 지워도 "정보를 제공하며 … 절차를 지원합니다"라는 홍보 절이 남는다.
//   중간 섹션(판단기준·기한·서류·비용·절차)의 역할은 '설명'이지 '사무소 소개'가 아니다.
//   → 자기지시 술어를 가진 문장을 통째로 드롭. 목록 줄·소제목은 보존.
//   ⚠ closing에는 미적용(상담 안내는 closing의 정상 역할).
//   ★ 실측(2차 생성) firstMove 말미: "상속등기에서는 이 모든 확인 과정을 통해 정확한 서류 준비에
//     도움을 줍니다." → "도움을 드리"만 막고 있어 어미 변형("도움을 줍니다")이 통과했다.
//     GPT는 금칙 표현의 '어미만 바꿔' 회귀한다(변호사 세션41-3과 동일 병리). 어간 기준으로 넓힌다.
const SELF_PROMO_RE = /(정보를 제공|조언을 통해|절차를 지원|지원합니다|제공하며|제공합니다|도움을 (드리|주|줍니다|드립니다)|도움이 되도록|안내해 드립니다|맞춤형|함께 진행|상담을 통해 확인|문의 주시면|연락 주시면|준비에 도움|진행을 돕|절차를 돕)/;
function stripSelfPromo(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;           // 목록 보존
    const head = _headOf(block);
    const bodyPart = head ? block.slice(head.length).trim() : block;
    const sents = bodyPart.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => s.trim() && !SELF_PROMO_RE.test(s));
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── 중간 해시태그 제거 ──────────────────────────
function stripMidHashtags(text) {
  return text.replace(/(^|\s)#[^\s#]+/g, "$1").trim();
}

// ── 절차·서수 나열 산문화 (documents는 목록 유지) ─────
function deListForV2(text) {
  let t = text;
  t = t.replace(/(^|\n|\s)(첫째|둘째|셋째|넷째|다섯째)[,.]?\s*/g, "$1");
  t = t.replace(/(^|\n)\s*\d+\s*[.)]\s*/g, "$1");
  t = t.replace(/\n(?!\n)/g, " ").replace(/\s{2,}/g, " ");
  return t.trim();
}

// ── [세션43][SPACE-FIX] 조사·의존명사 앞 오공백 정규화 ─────────
//   ★ 실측(상속포기 deadline): "경우에 는 기한을" — GPT가 조사를 띄어 씀.
//   구조 무관·품질 전용. 어절 경계만 붙인다(문장 삭제 없음).
function fixKoSpacing(text) {
  let t = text;
  // 조사가 단독 어절로 떨어진 경우 앞말에 붙임.
  //   ⚠ 오탐 차단: 조사 뒤가 '문장부호 또는 줄끝'인 경우만 처리한다.
  //     "업로드 후 이 줄 삭제" → '이'는 관형사(뒤에 명사) → 처리 안 됨(뒤가 공백+글자).
  //     "경우에 는 기한을"    → '는' 뒤가 공백이지만 조사 단독 파편 → 아래 2단계에서 처리.
  // 1단계: 조사 + (문장부호|줄끝)
  t = t.replace(/([가-힣])\s+(는|은|이|가|을|를|의|에|에서|으로|로|와|과|도|만|까지|부터|보다|께|에게|한테)(?=[.,)\]}\n]|$)/g,
    (m, a, j) => `${a}${j}`);
  // 2단계: 조사 파편이 문장 중간에 뜬 경우 — 앞말이 조사로 끝나 있으면 오히려 정상어절.
  //   "경우에 는" 처럼 [조사로 끝난 말] + [조사 단독] 패턴만 병합한다(관형사 '이/그/저' 미해당).
  t = t.replace(/([가-힣](?:에|에서|으로|로|와|과|의|을|를))\s+(는|은|도|만|까지|부터|보다)\s/g,
    (m, a, j) => `${a}${j} `);
  // 마침표·쉼표 앞 공백
  t = t.replace(/\s+([.,])/g, "$1");
  return t.replace(/[ \t]{2,}/g, " ");
}

// ── [세션43][DOC-SPLIT] documents — '자주 빠뜨리는 서류' 설명문 리스트 밖 분리 ──
//   ★ 실측(상속포기): 마지막 설명문이 "- 상속개시를 안 날을…" 형태로 목록에 흡수.
//   목록 항목("- 서류명 — 발급처 / 이유")은 반드시 ' — ' 를 포함한다.
//   ' — ' 없이 서술로 끝나는 "- " 라인은 항목이 아니라 설명문 → 불릿 제거 + 목록 뒤 단락으로 이동.
function splitDocNote(text) {
  const lines = String(text).split("\n");
  const kept = [];
  const notes = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*[-·•]\s*(.+)$/);
    if (m) {
      const item = m[1].trim();
      const isItem = /—|--|–/.test(item);   // 발급처 구분자 유무 = 항목 판정
      if (!isItem) { notes.push(item.replace(/\s*$/, "")); continue; }
      kept.push(ln);
      continue;
    }
    kept.push(ln);
  }
  if (!notes.length) return text;
  let out = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const note = notes.join(" ").trim();
  return out + "\n\n" + (/자주|누락|빠뜨/.test(note) ? note : `자주 빠뜨리는 서류는 ${note}`);
}

// ── [세션43][DOC-SOT] 재료 밖 자료 라인 드롭 ─────────────
//   ★ legal 실측 계승: 재료에 없는 서류를 GPT가 자작(법인설립 → "사업자등록증 사본").
//     tax도 동형 리스크: "신고 완료 후에야 생기는 서류"를 준비자료로 넣는 회귀.
//     data(TAX_DOCUMENTS)에 없는 후행 서류를 목록에서 제거한다.
//   ⚠ tax_registration(사업자등록)만 예외 — 이 업무는 '사업자등록증' 자체가 결과물이므로
//     목록에 나오면 오류. 그러나 tax_income 등 다른 업무에서는 사업자등록증이
//     정상 준비자료가 될 수 있다 → 업무별 화이트리스트가 아니라 '결과물 매칭'으로 판정한다.
const POST_PROCESS_DOCS_BY_ID = {
  // 각 업무에서 '그 절차가 끝나야 생기는' 산출물 = 준비자료가 될 수 없다
  tax_registration:      ["사업자등록증", "사업자등록번호"],
  tax_income:            ["납부확인서", "신고서 접수증", "종합소득세 납부확인서"],
  tax_income_refund:     ["환급 통지서", "환급금 지급 통지", "국세환급금 통지서"],
  tax_vat:               ["부가가치세 납부확인서", "신고서 접수증"],
  tax_inheritance:       ["상속세 납부확인서", "결정 통지서"],
  tax_gift:              ["증여세 납부확인서", "결정 통지서"],
  tax_capitalgains:      ["양도소득세 납부확인서", "신고서 접수증"],
  tax_audit:             ["세무조사 결과 통지서", "과세 예고 통지서"],
};
function stripPostProcessDocs(text, treatmentId) {
  const banned = POST_PROCESS_DOCS_BY_ID[String(treatmentId || "")];
  if (!banned || !banned.length) return text;
  return text
    .split("\n")
    .filter((ln) => {
      if (!/^\s*[-·•]/.test(ln)) return true;
      return !banned.some((d) => ln.includes(d));
    })
    .join("\n");
}

// ── [세션43][SAVINGS-CAP] ★ tax 신설 — 절세·환급 '결과 약속' 문장 드롭 ──────
//   ★ tax 고유 최대 리스크. legal은 '결과 보장'(반드시 승인)이 리스크였으나,
//     tax는 '절세·환급 단정'이 세무사법 정면 리스크다.
//     savings 섹션이 정확히 그 지뢰밭 — GPT는 "줄일 수 있습니다"로 반드시 회귀한다.
//   ★ 실측 대비(legal 세션42 교훈): 금칙 표현은 '어미만 바꿔' 회귀한다.
//     "줄일 수 있습니다" 차단 → "줄어듭니다" / "절감됩니다" / "혜택을 받습니다" 로 우회.
//     → 어미 열거가 아니라 '어간 + 결과 술어' 조합으로 넓게 잡는다.
//   대응: MONEY-CAP과 동일한 '문장 단위 드롭'. 구절 제거는 문장을 파손한다.
const SAVINGS_PROMISE_RE = new RegExp(
  [
    // 세액이 줄어든다는 결과 서술
    "(세금|세액|부담|납부액|추징|가산세)[^.!?\\n]{0,20}(줄(일|어|이|여)|절감|경감|낮(출|아|춰)|아낄|아끼|덜 (내|낼))",
    // 환급을 약속하는 서술
    "(환급|돌려)[^.!?\\n]{0,15}(받(을|으실|습니다|게 됩니다)|가능합니다|드립니다|해 드립니다)",
    // 절세 자체를 결과로 서술
    "(절세|세테크)[^.!?\\n]{0,15}(가능|효과|할 수 있|됩니다|입니다)",
    // 혜택·공제를 확정적으로 약속
    "(공제|감면|혜택)[^.!?\\n]{0,15}(받을 수 있습니다|받으실 수 있습니다|보장|무조건)",
  ].join("|")
);
function stripSavingsPromise(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    // 목록 블록: 줄 단위 드롭 (목록 구조 보존)
    if (/(^|\n)\s*[-·]/.test(block)) {
      const lines = block.split("\n").filter((l) => !SAVINGS_PROMISE_RE.test(l));
      return lines.join("\n").trim();
    }
    const head = _headOf(block);
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    // ★ [DROP-FIX] 전량삭제 방지 로직(kept.length ? kept : sents)을 쓰지 않는다.
    //   단일 문장 블록에서 필터가 무력화되는 버그(세션42 실측). 빈 블록은 그대로 비운다.
    const kept = sents.filter((s) => s.trim() && !SAVINGS_PROMISE_RE.test(s));
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;   // 소제목은 항상 보존
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── 사진 placeholder (1줄 간소화 — 발행자 인지용) ────────
const TAX_PHOTO_POOL_V2 = {
  "상담 안내": "사무소 입구 / 간판 사진",
  "기준 안내": "상담실 내부 / 세무사 프로필 사진",
  "기한 안내": "달력 / 신고 일정 안내 사진",
  "자료 안내": "준비 자료 예시 / 증빙 서류 사진",
  "사무소 안내": "사무소 외관 / 약도 사진",
};
function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => {
    const _k = String(alt).trim();
    // [세션47][PRO-VISIT] 공통 6슬롯(사무소 외관/건물 입구/상담실/대표실/주차장/약도) fallback.
    const photo = TAX_PHOTO_POOL_V2[_k] || (PRO_PHOTO_POOL[_k] && PRO_PHOTO_POOL[_k].photos[0]) || TAX_PHOTO_POOL_V2["사무소 안내"];
    return `\n📷 사진: ${photo} (업로드 후 이 줄 삭제)\n`;
  });
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── 마무리 해시태그 (정보형 고정) ─────────────────
// ── 마무리 해시태그 (정보형 고정) ─────────────────
//   ★ [세션43-2][TAG-DUP] 실측 결함: "#상속세신고신고".
//     tax의 dir.keyword는 이미 "…신고"로 끝나는 업무가 있다(상속세 신고 / 증여세 신고 / 종합소득세 신고 / 부가세 신고).
//     여기에 `#${k}신고`를 다시 붙이면 '신고신고'가 된다.
//     legal은 `#${k}절차`였기에 이 결함이 드러나지 않았다 — 복사베이스 이식 시 접미사 충돌을 확인할 것.
//   대응: 접미사가 이미 키워드 끝에 있으면 붙이지 않는다(범용 헬퍼).
function _suffix(k, suf) {
  return k.endsWith(suf) ? `#${k}` : `#${k}${suf}`;
}
function buildHashtags(region, kw, axis) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  // ★ [세션43-2] 관리형(기장)에는 "신고" 태그를 붙이지 않는다 — "#세무기장신고"는 존재하지 않는 말.
  const third = axis === "managing" ? _suffix(k, "대리") : _suffix(k, "신고");
  const tags = [
    `#${rg}${k}세무사`, _suffix(k, "세무사"), `#${rg}세무사`,
    third, _suffix(k, "준비자료"), `#${rg}세무사사무소`,
  ];
  // 동일 태그 중복 제거(키워드에 따라 위 두 항목이 겹칠 수 있음)
  return "\n\n" + [...new Set(tags)].join(" ");
}




// ── 중복 문단 제거 (앞 40자 시그니처) ────────────────
function removeDupParagraphs(text) {
  const paras = text.split(/\n{2,}/);
  const seen = new Set();
  const out = [];
  for (const p of paras) {
    const norm = p.replace(/\s+/g, "").replace(/[0-9.]/g, "").slice(0, 40);
    if (norm.length > 10 && seen.has(norm)) continue;
    if (norm.length > 10) seen.add(norm);
    out.push(p);
  }
  return out.join("\n\n");
}

// ── 문장·블록 근접중복 압축 (세션41 이식) ──────────────
const _STOPWORDS = new Set([
  "이것","그것","저것","경우","상황","내용","부분","문제","사건","관련","가능","확인",
  "필요","중요","진행","준비","때문","이때","다음","다른","여러","모든","각각","통해",
  "대한","위해","등의","등을","등이","하는","하기","있는","있습니다","됩니다","입니다",
]);
function _nounSig(sent) {
  const toks = (sent.match(/[가-힣]{2,}/g) || [])
    .map((w) => w.replace(/(습니다|입니다|됩니다|하세요|해요|이다|하다|에서|으로|에게|께서|까지|부터|보다)$/, ""))
    .filter((w) => w.length >= 2 && !_STOPWORDS.has(w));
  return new Set(toks);
}
function _overlap(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}
function compressDupSentencesV2(text) {
  const blocks = text.split(/\n{2,}/);
  const seenBlocks = [];
  const seenSentSig = new Set();
  const outBlocks = [];
  for (const block of blocks) {
    const isList = /(^|\n)\s*[-·]/.test(block);
    // [세션41 계승] 소제목(## ) 블록은 근접중복 판정 제외 — 통째 드롭 시 섹션 소실.
    const isHead = /^##\s/.test(block);
    if (!isList && !isHead) {
      const bsig = _nounSig(block);
      if (bsig.size >= 5) {
        const dup = seenBlocks.some((prev) => {
          const ov = _overlap(bsig, prev);
          return ov >= 5 && ov / bsig.size >= 0.45;
        });
        if (dup) continue;
        seenBlocks.push(bsig);
      }
    }
    if (isList) { outBlocks.push(block); continue; }
    const sents = block.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = [];
    for (const s of sents) {
      const sig = s.replace(/\s+/g, "").replace(/[0-9.,"']/g, "").slice(0, 24);
      if (sig.length > 12 && seenSentSig.has(sig)) continue;
      if (sig.length > 12) seenSentSig.add(sig);
      kept.push(s);
    }
    const joined = kept.join(" ").trim();
    if (joined) outBlocks.push(joined);
  }
  return outBlocks.join("\n\n");
}

// ── 사무소 정보 마무리 (발행코치 주입 시만) ─────────────
//   [세션41][NOGREET] 인사말 도입은 제거.
//
//   ★ [세션44][STORE-IN-BODY] 상호 라인 제거 — 실측 결함 수정.
//     (구) `\n다율법무사` 를 본문 끝에 append하고 있었다.
//     PHILOSOPHY 원칙1(매장명 본문 직접 노출 금지) 위반이며,
//     UI 라벨("제목에만 · 본문 비노출")과도 정반대로 동작했다.
//     원인: legal 복사베이스에서 buildOfficeClosing은 이식됐으나
//           제목 접미사 배선(titleSuffixOn)이 누락 → 상호가 갈 곳을 잃고 본문으로 샜다.
//
//   역할 분리 (전문서비스군 표준):
//     · 상호        → 제목 접미사 (resolveTitleSuffix / titleSuffixOn)
//     · 전화·상담정보 → 본문 마무리 (이 함수) ← 유지
//     · 주소·주차·교통 → locationBlock (📍 찾아오시는 길)
//   ⚠ 향후 locationBlock에 전화를 통합한다면 그 시점에 이 함수 전체를 제거한다.
function buildOfficeClosing(storeName, phone, consultInfo) {
  // ★ storeName 인자는 시그니처 호환을 위해 유지하되 본문에 쓰지 않는다.
  const lines = [];
  if ((phone || "").trim()) lines.push(`상담 전화 ${phone.trim()}`);
  if ((consultInfo || "").trim()) lines.push(consultInfo.trim());
  if (!lines.length) return "";
  return "\n" + lines.join("\n");
}

// ── [세션44][TITLE-SUFFIX] 제목 끝 상호 표시 ─────────────
//   ★ 실측 결함: 프론트(index.js 8577)는 titleSuffixOn을 보내는데
//     tax 핸들러가 req.body에서 받지도, buildTitle에 넘기지도 않았다.
//     → 토글이 서버에 도달하지 못해 제목에 상호가 붙지 않았다.
//   계약: ON + 상호 존재 → "제목 | 상호" / OFF 또는 빈값 → 원 제목 그대로.
//   ⚠ resolveTitleSuffix는 코드베이스에 존재하지 않았다(index.js 주석에만 언급).
//     legal 복사베이스 계열 전체에 동일 누락 가능성 — 확산 점검 필요.
function resolveTitleSuffix(title, storeName, titleSuffixOn) {
  const t = (title || "").trim();
  if (!titleSuffixOn) return t;
  let office = (storeName || "").trim();
  if (!office) return t;
  office = office.split(/\s*[|/·,]\s*/)[0].trim();
  if (!office) return t;
  if (t.includes(office)) return t;   // 이미 포함 → 중복 부착 방지(멱등)
  return `${t} | ${office}`;
}

// ── 제목 생성 ───────────────────────────────────
function buildTitle(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name} 세무사`;
  let title = pick.replace(/\{region\}/g, region);
  title = title.replace(/(세무사).*(세무사)/, "$1");
  // 후기형·의료형 제목 차단 → 정보형 강제
  if (/후기|체험|회복|붓기|통증|시술/.test(title)) {
    title = `${region} ${treatment.name} 신고 기한과 준비자료`;
  }
  // ★ 절세·환급 단정형 제목 차단 (세무사법)
  if (/절세|환급 보장|세금 0원|무조건/.test(title)) {
    title = `${region} ${treatment.name} 신고 전 확인할 것`;
  }
  return title.trim();
}

export default async function handleTax(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName, phone: bodyPhone, consultInfo: bodyConsultInfo,
      titleSuffixOn: bodyTitleSuffixOn,   // ★ [세션44][TITLE-SUFFIX] 제목 끝 상호 토글
      // [v-loc] 위치 5필드 (PATCH-07)
      address, map_guide, transit, building_desc, parking_info,
      visit_info: bodyVisitInfo, // [세션47][PRO-VISIT] 방문상담 SoT
    } = req.body;

    const region = (userRegion || regionFallback || program?.region || "").trim();
    const storeName   = (bodyStoreName || "").trim();
    const phone       = (bodyPhone || "").trim();
    const consultInfo = (bodyConsultInfo || "").trim();
    const titleSuffixOn = !!bodyTitleSuffixOn;   // ★ [세션44][TITLE-SUFFIX]
    const _locStore = { address, map_guide, transit, building_desc, parking_info };
    // [세션47][PRO-VISIT] 방문상담 SoT — store_profiles.visit_info (JSONB). index.js 세션37 배선으로 이미 전달 중.
    //   신규 스키마 0. 빈 객체면 🗓 방문상담 안내 블록 미생성(부작용 0).
    const _visitInfo = (bodyVisitInfo && typeof bodyVisitInfo === "object") ? bodyVisitInfo : {};

    // 업무 매칭
    const treatment =
      TAX_TREATMENTS.find((t) => t.id === program?.id) ||
      TAX_TREATMENTS.find((t) => t.name === program?.name);
    if (!treatment) {
      return res.status(400).json({ error: `세무사 업무 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    // ★ tax는 DIRECTION이 treatment 내부 필드 (legal은 별도 맵 — 구조 차이).
    const dir = treatment?.DIRECTION || {};
    const dirKw = dir.keyword || kw;
    // ★ [세션43-2][TAX-AXIS] 업무 성격 축 — deadline·process 분기(프롬프트) + 해시태그 분기(여기).
    const axis = TAX_AXIS[treatment.id] || TAX_AXIS._default;
    const systemPrompt = buildSystemPromptV2(region, treatment);

    // ── 섹션 순차 생성 (7섹션 / 사진 5슬롯) ──
    const writtenSections = new Set();
    const sections = [];

    for (const sec of TAX_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      const userPrompt = buildUserPromptV2(region, treatment, sec.key);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      });
      let body = completion.choices[0]?.message?.content || "";

      body = stripMidHashtags(body);
      body = body.replace(/!?\[[^\]]*\]/g, "").trim();                     // GPT 마크다운 이미지 제거
      body = body.replace(SPEAKER_POLLUTION_RE, "\n").trim();               // 화자 오염 라인 제거
      // [세션41 계승] GPT 자작 소제목 제거 — 헤더는 코드가 부여
      body = body.replace(/(^|\n)\s*#{1,3}\s*.+/g, "$1").trim();
      body = body.replace(/(^|\n)\s*[\[【][^\]】]{0,30}[\]】]\s*/g, "$1").trim();

      // [NO-1P] 개인 1인칭 회귀 차단 (기관 화자 유지 · 전 섹션 적용)
      //   세무사는 기관 화자가 원칙 → 변호사(consult 한정)보다 범위 확대.
      body = body.replace(/(^|[\s.,])(저는|제가|저희는|저희가)\s*/g, "$1");

      // closing 재요약 차단 — 앞 1단락만
      if (sec.key === "closing") {
        if (/\n\s*1\.\s/.test(body) || /(준비서류|진행 절차|기한을 놓치면)/.test(body.slice(150))) {
          body = body.split(/\n{2,}/).slice(0, 1).join("\n\n").trim();
        }
      }
      // 서수·번호 나열 산문화 (documents는 목록 유지)
      if (sec.key === "firstMove" || sec.key === "deadline" || sec.key === "savings" || sec.key === "process") {
        body = deListForV2(body);
      }
      // ── [세션43] documents 전용 — 재료 밖 서류 드롭 → 설명문 리스트 밖 분리 (순서 고정) ──
      if (sec.key === "documents") {
        body = stripPostProcessDocs(body, treatment.id);   // [DOC-SOT]
        body = splitDocNote(body);                          // [DOC-SPLIT]
      }
      // ── [세션43][SAVINGS-CAP] savings 전용 — 절세·환급 결과 약속 문장 드롭 ──
      //   ★ tax 최대 리스크 지점. 프롬프트 금지만으로는 GPT가 반드시 회귀한다(legal 실측).
      if (sec.key === "savings") {
        body = stripSavingsPromise(body);
      }
      // ── [세션43][GEO-GATE] 결합 키워드 섹션 게이트 ─────────
      //   ★ 실측(1차 생성): firstMove에 "잠실 송리단길 상속등기 세무사 사무소에서는…" 삽입.
      //     GEO-CAP(전문 3회 상한)은 '몇 번'만 통제할 뿐 '어느 섹션'인지는 통제하지 못한다.
      //     결합 키워드가 본문 중간 섹션에 박히면 그 섹션의 역할(판단기준·기한·서류)이 흐려지고
      //     사무소 홍보 문장이 끼어든다 → 역할 배타화 위반.
      //   대응: 결합 키워드는 closing에만 허용. 그 외 섹션은 생성 직후 업무명 단독으로 치환.
      //         (전문 상한 GEO-CAP은 조립 후 별도로 유지 — 이중 차단)
      if (sec.key !== "closing") {
        const escS = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const geoRe = new RegExp(`${escS(region)}\\s*${escS(dirKw)}\\s*세무사(\\s*사무소)?`, "g");
        body = body.replace(geoRe, dirKw);
        // 지역+세무사 결합(업무명 없이)도 중간 섹션에선 제거
        const geoRe2 = new RegExp(`${escS(region)}\\s*세무사(\\s*사무소)?(에서는|에서|는|가|이|의)?\\s*`, "g");
        body = body.replace(geoRe2, "");
        // ★ 결합만 지워도 "사무소가 정보를 제공합니다"류 홍보 절이 남는다(실측).
        //   → 자기지시·홍보 술어를 가진 '문장' 자체를 드롭. 이것이 역할 위반의 본질.
        body = stripSelfPromo(body);
      }
      // [SPINE7] 소제목 부여 — title "" 이면 미부여 (concern · closing)
      if (sec.title) body = `## ${sec.title}\n\n` + body;
      // [PHOTO5] 사진 슬롯 — photo null 섹션은 미삽입 (savings · process)
      if (sec.photo) body += "\n\n[이미지: " + sec.photo + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = stripCliche(content);            // [세션43] AI 상투어 문장 드롭
    content = capEvalSentences(content);       // [세션43] 평가문 2회 상한
    content = stripMoneyClaims(content);       // [세션43] 금액·요율 단정 드롭
    content = stripSavingsPromise(content);    // [세션43][SAVINGS-CAP] 절세·환급 약속 드롭 (전역 2차)
    content = removeDupParagraphs(content);
    content = compressDupSentencesV2(content);
    content = fixKoSpacing(content);           // [세션43][SPACE-FIX] 조사 오공백 정규화
    content = applyPhotoBoxes(content);
    content = content.replace(SPEAKER_POLLUTION_RE, "\n").trim();

    // 사무소 정보 마무리 (발행코치 주입 시만)
    //   ★ [세션44][STORE-IN-BODY] 상호는 더 이상 본문에 붙지 않는다. 전화·상담정보만.
    // [세션47][PRO-VISIT] buildOfficeClosing 호출 제거 — 상담정보 SoT를 proVisitBlock으로 일원화.
    //   ⚠ 실측: index.js 페이로드에 phone/consultInfo 키가 존재하지 않는다 → 이 블록은 항상 빈값(미출력)이었다.
    //     즉 기능 제거가 아니라 사문화 코드 정리. 출력 변화 0. buildOfficeClosing 정의는 롤백 대비 보존(미호출).

    // ── [세션43][GEO-CAP] 지역+업무+세무사 결합 3회 상한 ─────
    //   PHILOSOPHY 원칙3. ⚠ 해시태그 append '이전'에 실행.
    {
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fullKwRe = new RegExp(`${esc(region)}\\s*${esc(dirKw)}\\s*세무사`, "g");
      let seen = 0;
      content = content.replace(fullKwRe, (m) => (++seen <= 3 ? m : `${dirKw} 세무사`));
    }

    // 마무리 해시태그
    content += buildHashtags(region, dirKw, axis);

    // [v-loc] LocationBlock 후단 주입 (PATCH-07) — 해시태그 직전 삽입.
    // [세션47][PRO-VISIT] 방문정보 공통 삽입 — [📷외관 → 📍찾아오시는 길 → 📷입구 → 🗓방문상담 → 📷상담실·대표실·주차장·약도]
    //   ⚠ locationBlock은 insertProVisitInfo 내부에서 호출된다(2회 삽입 방지 · 위치 SoT 단일).
    content = insertProVisitInfo(content, _locStore, _visitInfo);
    // [세션47] 신규 삽입된 [이미지: …] 6슬롯을 placeholder로 변환. 이미 변환된 박스는 패턴 불일치로 무영향(멱등).
    content = applyPhotoBoxes(content);

    // [세션41 계승] 소제목 MD 해제 — 근접중복 판정이 끝난 뒤에 수행.
    content = content.replace(/(^|\n)##\s*/g, "$1");

    // ── [세션43-3][SPEAKER-CLEAN 최종단] ────────────────────
    //   ★ 실측(2차 생성): 패치 후에도 본문 끝 "관리자" 단독 라인 잔존 관측.
    //     조립 직후(408행) 필터는 통과했으나, 해시태그·locationBlock 삽입과
    //     MD 해제를 거치며 줄 경계가 재구성될 여지가 있다.
    //     → 모든 조립·삽입이 끝난 최종 반환 직전에 한 번 더 실행한다(멱등·무해).
    //   ⚠ 사무소명(buildOfficeClosing)은 목록에 없으므로 보존된다.
    content = content.replace(SPEAKER_POLLUTION_RE, "\n");
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    // ★ [세션44][TITLE-SUFFIX] 토글 ON + 상호 존재 시에만 "제목 | 상호"
    const title = resolveTitleSuffix(buildTitle(region, treatment), storeName, titleSuffixOn);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(dirKw, "g")) || []).length;
    const fullKw = `${region} ${dirKw} 세무사`;
    const fullCount = (content.match(new RegExp(fullKw, "g")) || []).length;
    const moneyResidual = MONEY_RE.test(content) ? 1 : 0;
    console.log(`[QC][tax] 키워드(${dirKw}): ${kwCount}`);
    console.log(`[QC][tax] 복합키워드(${fullKw}): ${fullCount}`);
    console.log(`[QC][tax] 축: ${axis}`);
    console.log(`[QC][tax] 글자수: ${content.length}`);
    console.log(`[QC][tax] 금액표기 잔존: ${moneyResidual}`);

    return res.status(200).json({
      title,
      // [정합] 프론트는 data.text 1순위. text/textMarkdown/content 3종 동시 반환.
      text:         content,
      textMarkdown: content,
      content,
      industry: "tax",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      region,
      seoScore: null,   // 정보형: 점수 집착 UI 비연결 (PHILOSOPHY 정합)
      qc: { fullKeyword: fullKw, fullKeywordCount: fullCount, kwCount, moneyResidual },
    });
  } catch (err) {
    console.error("[tax] 오류:", err);
    return res.status(500).json({ error: err.message || "세무사 글 생성 오류" });
  }
}
