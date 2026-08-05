// ============================================================
// pages/api/generateLabor.js — 노무사(labor) 엔진 핸들러 V2
// ============================================================
// [세션45][SPINE7-LABOR] 단일호출 → 7섹션 전문직 Spine.
//   concern / firstMove / deadline / documents / criteria / process / closing
//
//   엔진 축(세무사 V2 세션43/44 공통 재사용):
//     · Spine 조립 · 소제목 코드부여 · 사진 5슬롯
//     · stripCliche / capEvalSentences / removeDupParagraphs / compressDupSentencesV2
//     · GEO-GATE / GEO-CAP / SELF-PROMO / SPEAKER-CLEAN / DROP-FIX
//     · DOC-SOT / DOC-SPLIT / SPACE-FIX
//     · ★ [세션44] TITLE-SUFFIX / STORE-IN-BODY — 처음부터 정상 배선 (누락 재발 방지)
//   콘텐츠 축(노무사 전용):
//     · ★ savings → criteria 교체 (유일한 축 변경)
//       세무사 검색자 = "세금을 얼마나 줄이나" / 노무사 검색자 = "내가 이 요건에 해당하나"
//     · labor-v2-prompts · labor-v2-data
//
//   ★ [세션45][3AXIS] 축이 3개 — tax(2축)와 다르다.
//     filing(신고·신청) / advisory(분쟁·구제) / managing(지속 관리)
//     labor_payroll(급여관리)을 filing에 넣으면 tax_bookkeeping과 동일하게
//     "급여관리 신고 기한" 이라는 존재하지 않는 기한이 생성된다 → 처음부터 분리.
//
//   ★ V1 실측 병리 — tax V1과 동형:
//     labor V1 = tax V1 복사베이스 + GPT 1회 단일호출. 섹션 개념 부재.
//     LABOR_PLAY_CONFIG는 참조되나 섹션 루프 없이 소비되었고,
//     정보블럭(renderInfoBlocks)은 본문 끝 덤프, 사진은 문단 인덱스 기계 삽입.
//     -> 역할 배타화가 성립할 구조가 없었다. Spine 도입 = 구조 신설.
//     ⚠ V1의 renderInfoBlocks / buildPrompt / LABOR_DISCLAIMER 는 V2에서 미사용.
//        deadline·documents·criteria 3섹션이 각자의 자리에서 그 내용을 서술한다.
//        (labor-prompts.js 파일 자체는 FORBIDDEN SoT로 유지 — 무수정)
//
//   ★ labor 고유 최대 리스크 = '인정·구제·승소 단정'(노무사법).
//     tax MONEY-CAP(금액·요율 드롭)에 더해 [CRITERIA-CAP] 신설:
//     "인정됩니다 / 구제받을 수 있습니다" 같은 결과 약속 문장을 통째로 드롭.
//     criteria 섹션이 정확히 그 지뢰밭이다.
//
//   ★ 무변경 파일: lib/labor-data.js (메뉴 SoT 20업무) · lib/labor-prompts.js (FORBIDDEN SoT)
//     lib/labor-playConfig.js (DEAD 보존) · lib/engineBootstrap.js
//     pages/index.js · lib/industryBlocks.js — 이미 배선됨.
//
// engineBootstrap에서 register("labor", handleLabor) — 이미 등록됨. 무수정.
// (주의) 작업DB vuuqtrzcfjbywlxqskoi — 본 세션 DB 변경 0.
// ============================================================

import OpenAI from "openai";
import { LABOR_TREATMENTS } from "../../lib/labor-data";
import { FORBIDDEN as LABOR_FORBIDDEN } from "../../lib/labor-prompts";
import {
  LABOR_AXIS,          // ★ [세션45][3AXIS] filing | advisory | managing
  LABOR_FLOW,          // ★ V2 7섹션 Spine (playConfig 무수정 — FLOW는 v2-data 소유)
} from "../../lib/labor-v2-data";
import {
  buildSystemPromptV2,
  buildUserPromptV2,
  AI_CLICHE,
  LABOR_GUARANTEE_BAN,
} from "../../lib/labor-v2-prompts";
// [v-loc] 위치/주차 공통 후단 블록 — 전 업종 공유(PATCH-07). 응답 직전 본문 끝 삽입.
// [세션47][PRO-VISIT] 전문직 방문정보 공통 모듈. locationBlock 재사용(내부 호출) — 위치블록 직접 호출 제거.
import { insertProVisitInfo, PRO_PHOTO_POOL } from "../../lib/proVisitBlock.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 공백·조사 정리 ────────────────────────
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
  for (const w of LABOR_FORBIDDEN) t = t.split(w).join("");
  for (const w of LABOR_GUARANTEE_BAN) t = t.split(w).join("");
  ["따라서", "결론적으로", "정리하면", "살펴보겠습니다"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  return t;
}

// ── [CLICHE] AI 상투어 문장 제거 ────────────────
//   ★ [DROP-FIX] 전량삭제 방지 로직(kept.length ? kept : sents) 미사용.
//     단일 문장 블록에서 필터가 무력화되는 버그(세션42 실측). 빈 블록은 그대로 비운다.
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
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head; // 헤더는 항상 보존
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [EVAL-CAP] 평가 종결 문장 상한 ──────────────
const EVAL_TAIL = /(중요합니다|필요합니다|영향을 미칩니다|주의가 필요합니다|고려해야 합니다|인지해야 합니다|유의해야 합니다)\s*[.]?\s*$/;
const EVAL_CAP = 2;
function capEvalSentences(text) {
  let hit = 0;
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;
    const head = _headOf(block);
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => {
      if (!s.trim()) return false;
      if (!EVAL_TAIL.test(s.trim())) return true;
      hit += 1;
      return hit <= EVAL_CAP;
    });
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [MONEY-CAP] 금액·비율 수치 단정 차단 ─────────
//   ⚠ deadline의 기간 숫자(3개월·14일·3년)는 잡지 않는다 — MONEY_RE는 금액/%만 매칭.
const MONEY_RE = /(\d[\d,]*\s*(만원|원|천원|억)|\d+(\.\d+)?\s*%)/;
function stripMoneyClaims(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
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

// ── [SPEAKER-CLEAN] 화자 오염 단독 라인 차단 ────────
const SPEAKER_POLLUTION = [
  "운영자", "관리자", "작성자", "편집자", "블로그지기", "블로그 관리자",
  "담당자", "글쓴이", "에디터", "admin", "Admin",
];
const SPEAKER_POLLUTION_RE = new RegExp(
  `(^|\\n)\\s*(?:${SPEAKER_POLLUTION.join("|")})\\s*(?=\\n|$)`, "g"
);

// ── [SELF-PROMO] 사무소 자기지시·홍보 문장 드롭 ────
//   중간 섹션의 역할은 '설명'이지 '사무소 소개'가 아니다.
//   ⚠ closing에는 미적용(상담 안내는 closing의 정상 역할).
//   ★ tax 실측 교훈: GPT는 금칙 표현의 '어미만 바꿔' 회귀한다 → 어간 기준으로 넓힌다.
//   ★ labor 추가: "권리를 지켜드립니다" "근로자 편에서" — 편들기형 홍보 절.
const SELF_PROMO_RE = /(정보를 제공|조언을 통해|절차를 지원|지원합니다|제공하며|제공합니다|도움을 (드리|주|줍니다|드립니다)|도움이 되도록|안내해 드립니다|맞춤형|함께 진행|상담을 통해 확인|문의 주시면|연락 주시면|준비에 도움|진행을 돕|절차를 돕|권리를 (지켜|찾아)|편에 서서|편에서)/;
function stripSelfPromo(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;
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

// ── [SPACE-FIX] 조사·의존명사 앞 오공백 정규화 ─────────
function fixKoSpacing(text) {
  let t = text;
  t = t.replace(/([가-힣])\s+(는|은|이|가|을|를|의|에|에서|으로|로|와|과|도|만|까지|부터|보다|께|에게|한테)(?=[.,)\]}\n]|$)/g,
    (m, a, j) => `${a}${j}`);
  t = t.replace(/([가-힣](?:에|에서|으로|로|와|과|의|을|를))\s+(는|은|도|만|까지|부터|보다)\s/g,
    (m, a, j) => `${a}${j} `);
  t = t.replace(/\s+([.,])/g, "$1");
  return t.replace(/[ \t]{2,}/g, " ");
}

// ── [DOC-SPLIT] documents — '자주 빠뜨리는 자료' 설명문 리스트 밖 분리 ──
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
  return out + "\n\n" + (/자주|누락|빠뜨/.test(note) ? note : `자주 빠뜨리는 자료는 ${note}`);
}

// ── [DOC-SOT] 재료 밖 자료 라인 드롭 ─────────────
//   ★ tax 실측 계승: "그 절차가 끝나야 생기는 산출물"은 준비자료가 될 수 없다.
//     labor는 결정·판정 문서가 그 자리에 온다(구제명령서·승인 통지서·판정서).
const POST_PROCESS_DOCS_BY_ID = {
  labor_dismissal:         ["구제명령서", "판정서", "구제 명령"],
  labor_labor_committee:   ["판정서", "구제명령서", "재심 판정서"],
  labor_assignment:        ["구제명령서", "판정서"],
  labor_unfair_transfer:   ["구제명령서", "판정서"],
  labor_disciplinary:      ["구제명령서", "판정서"],
  labor_injury:            ["산재 승인 통지서", "요양 승인 결정 통지", "승인 통지서"],
  labor_occupational:      ["산재 승인 통지서", "업무상질병판정서", "승인 통지서"],
  labor_commute_injury:    ["산재 승인 통지서", "승인 통지서"],
  labor_substitute_pay:    ["대지급금 지급 결정 통지", "지급 결정 통지서"],
  labor_unpaid:            ["시정지시서"],
  labor_unpaid_complaint:  ["시정지시서", "출석요구서"],
  labor_rules:             ["취업규칙 신고 수리 통보"],
  labor_insurance:         ["4대보험 가입증명서", "자격취득확인서"],
  labor_harassment:        ["조사 결과 통보서"],
  labor_sexual_harassment: ["조사 결과 통보서"],
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

// ── [세션45][CRITERIA-CAP] ★ labor 신설 — 인정·구제 '결과 약속' 문장 드롭 ──────
//   ★ labor 고유 최대 리스크. tax는 '절세·환급 단정'이 리스크였으나,
//     labor는 '인정·구제·승소 단정'이 노무사법 정면 리스크다.
//     criteria 섹션이 정확히 그 지뢰밭 — GPT는 "인정됩니다"로 반드시 회귀한다.
//   ★ tax 세션42~44 교훈: 금칙 표현은 '어미만 바꿔' 회귀한다.
//     "인정됩니다" 차단 → "인정될 것입니다" / "구제가 가능합니다" / "다툴 수 있습니다" 로 우회.
//     → 어미 열거가 아니라 '어간 + 결과 술어' 조합으로 넓게 잡는다.
//   ⚠ 재료(LABOR_CRITERIA)의 정상 항목은 "~인지 / ~하는지" 판단 기준형이므로 매칭되지 않는다.
const CRITERIA_PROMISE_RE = new RegExp(
  [
    // 인정을 결과로 약속
    "(산재|부당해고|부당전직|직장내괴롭힘|성희롱|업무상 재해|업무상 질병|출퇴근재해)[^.!?\\n]{0,15}(으로 인정됩니다|로 인정됩니다|으로 인정될 수 있습니다|로 인정될 수 있습니다|인정받을 수 있습니다|인정됩니다)",
    // 구제·복직을 약속
    "(구제|복직|원직복직)[^.!?\\n]{0,15}(받을 수 있습니다|받으실 수 있습니다|가능합니다|됩니다|명령이 내려집니다)",
    // 승소·승인 전망
    "(승소|승인|인용)[^.!?\\n]{0,15}(할 수 있습니다|받을 수 있습니다|가능합니다|됩니다)",
    // 전망·가능성 표현 (노무사법: 결과 예측 금지)
    "(충분히|얼마든지|무리 없이)[^.!?\\n]{0,15}(다툴 수 있|인정|가능)",
    "(가능성이|승산이)[^.!?\\n]{0,10}(높습니다|큽니다|충분합니다)",
    // 지급·보상을 약속
    "(체불임금|퇴직금|보상금|위로금|대지급금|휴업급여)[^.!?\\n]{0,15}(받을 수 있습니다|받으실 수 있습니다|지급됩니다|보장)",
    // ★ [세션45][FACT-FIX] 자격 상실 단정 (실측: "자진퇴사로 처리되면 실업급여 수급 자격이 상실됩니다")
    //   자격은 신고된 사유·사실관계에 따라 판정된다. 결과를 단정하면 사실 오류가 된다.
    //   ⚠ "~에 따라 달라집니다" 형태의 재료 문장은 매칭되지 않는다(술어가 '상실'이 아님).
    //   ⚠ '청구권'은 대상에서 제외 — "시효가 지나면 청구권이 사라집니다"는 소멸시효의 정상 서술이다.
    //     (스모크 실측 오탐 1건. 자격 판정과 시효 소멸은 다른 문제다.)
    "(실업급여|수급 자격|구제 자격)[^.!?\\n]{0,15}(상실됩니다|상실될 수 있습니다|박탈됩니다)",
  ].join("|")
);
function stripCriteriaPromise(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    // 목록 블록: 줄 단위 드롭 (목록 구조 보존)
    if (/(^|\n)\s*[-·]/.test(block)) {
      const lines = block.split("\n").filter((l) => !CRITERIA_PROMISE_RE.test(l));
      return lines.join("\n").trim();
    }
    const head = _headOf(block);
    const body = head ? block.slice(head.length).trim() : block;
    const sents = body.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    // ★ [DROP-FIX] 전량삭제 방지 로직 미사용. 빈 블록은 그대로 비운다.
    const kept = sents.filter((s) => s.trim() && !CRITERIA_PROMISE_RE.test(s));
    const joined = kept.join(" ").trim();
    if (head) return joined ? `${head}\n\n${joined}` : head;   // 소제목은 항상 보존
    return joined;
  });
  return out.filter(Boolean).join("\n\n");
}

// ── 사진 placeholder (1줄 간소화 — 발행자 인지용) ────────
const LABOR_PHOTO_POOL_V2 = {
  "상담 안내": "사무소 입구 / 간판 사진",
  "기준 안내": "상담실 내부 / 노무사 프로필 사진",
  "기한 안내": "달력 / 신청 기간 안내 사진",
  "자료 안내": "준비 자료 예시 / 관련 서류 사진",
  "사무소 안내": "사무소 외관 / 약도 사진",
};
function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => {
    const _k = String(alt).trim();
    // [세션47][PRO-VISIT] 공통 6슬롯(사무소 외관/건물 입구/상담실/대표실/주차장/약도) fallback.
    const photo = LABOR_PHOTO_POOL_V2[_k] || (PRO_PHOTO_POOL[_k] && PRO_PHOTO_POOL[_k].photos[0]) || LABOR_PHOTO_POOL_V2["사무소 안내"];
    return `\n📷 사진: ${photo} (업로드 후 이 줄 삭제)\n`;
  });
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── 마무리 해시태그 (정보형 고정) ─────────────────
//   ★ [세션43-2][TAG-DUP] tax 실측 교훈: 접미사가 이미 키워드 끝에 있으면 붙이지 않는다.
//     labor는 "노동청 진정" "산재신청" 처럼 이미 '신청'으로 끝나는 업무가 있다.
//     `#${k}신청`을 다시 붙이면 "#산재신청신청"이 된다.
function _suffix(k, suf) {
  return k.endsWith(suf) ? `#${k}` : `#${k}${suf}`;
}
function buildHashtags(region, kw, axis) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  // ★ [세션45][3AXIS] 축별 3번째 태그 분기.
  //   filing = 신청 / advisory = 대응 / managing = 관리
  //   ⚠ advisory에 "신청" 태그를 붙이면 "#임금체불신청"이라는 존재하지 않는 말이 된다.
  const third =
    axis === "managing" ? _suffix(k, "관리")
    : axis === "advisory" ? _suffix(k, "대응")
    : _suffix(k, "신청");
  const tags = [
    `#${rg}${k}노무사`, _suffix(k, "노무사"), `#${rg}노무사`,
    third, _suffix(k, "준비자료"), `#${rg}노무사사무소`,
  ];
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

// ── 문장·블록 근접중복 압축 ──────────────
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
    const isHead = /^##\s/.test(block);   // 소제목 블록은 근접중복 판정 제외
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
//   ★ [세션44][STORE-IN-BODY] 교훈 선반영 — 상호는 본문에 붙지 않는다. 전화·상담정보만.
//   역할 분리 (전문서비스군 표준):
//     · 상호        → 제목 접미사 (resolveTitleSuffix / titleSuffixOn)
//     · 전화·상담정보 → 본문 마무리 (이 함수)
//     · 주소·주차·교통 → locationBlock (📍 찾아오시는 길)
function buildOfficeClosing(storeName, phone, consultInfo) {
  // ★ storeName 인자는 시그니처 호환을 위해 유지하되 본문에 쓰지 않는다.
  const lines = [];
  if ((phone || "").trim()) lines.push(`상담 전화 ${phone.trim()}`);
  if ((consultInfo || "").trim()) lines.push(consultInfo.trim());
  if (!lines.length) return "";
  return "\n" + lines.join("\n");
}

// ── [세션44][TITLE-SUFFIX] 제목 끝 상호 표시 ─────────────
//   ★ 세션44 실측: index.js는 titleSuffixOn을 보내는데 핸들러가 받지 않아
//     토글이 서버에 도달하지 못했다(legal 복사베이스 계열 공통 누락).
//     labor는 처음부터 정상 배선한다.
//   계약: ON + 상호 존재 → "제목 | 상호" / OFF 또는 빈값 → 원 제목 그대로.
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
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name} 노무사`;
  let title = pick.replace(/\{region\}/g, region);
  title = title.replace(/(노무사).*(노무사)/, "$1");
  // 후기형·의료형 제목 차단 → 정보형 강제
  if (/후기|체험|회복|붓기|통증|시술/.test(title)) {
    title = `${region} ${treatment.name} 기간과 준비자료`;
  }
  // ★ 인정·구제 단정형 제목 차단 (노무사법)
  if (/승소|반드시|무조건|100%|보장/.test(title)) {
    title = `${region} ${treatment.name} 대응 전 확인할 것`;
  }
  return title.trim();
}

export default async function handleLabor(req, res) {
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
    const titleSuffixOn = !!bodyTitleSuffixOn;
    const _locStore = { address, map_guide, transit, building_desc, parking_info };
    // [세션47][PRO-VISIT] 방문상담 SoT — store_profiles.visit_info (JSONB). index.js 세션37 배선으로 이미 전달 중.
    //   신규 스키마 0. 빈 객체면 🗓 방문상담 안내 블록 미생성(부작용 0).
    const _visitInfo = (bodyVisitInfo && typeof bodyVisitInfo === "object") ? bodyVisitInfo : {};

    // 업무 매칭
    const treatment =
      LABOR_TREATMENTS.find((t) => t.id === program?.id) ||
      LABOR_TREATMENTS.find((t) => t.name === program?.name);
    if (!treatment) {
      return res.status(400).json({ error: `노무사 업무 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const dir = treatment?.DIRECTION || {};
    const dirKw = dir.keyword || kw;
    // ★ [세션45][3AXIS] 업무 성격 축 — deadline·process·criteria 분기(프롬프트) + 해시태그 분기(여기).
    const axis = LABOR_AXIS[treatment.id] || LABOR_AXIS._default;
    const systemPrompt = buildSystemPromptV2(region, treatment);

    // ── 섹션 순차 생성 (7섹션 / 사진 5슬롯) ──
    const writtenSections = new Set();
    const sections = [];

    for (const sec of LABOR_FLOW) {
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
      // GPT 자작 소제목 제거 — 헤더는 코드가 부여
      body = body.replace(/(^|\n)\s*#{1,3}\s*.+/g, "$1").trim();
      body = body.replace(/(^|\n)\s*[\[【][^\]】]{0,30}[\]】]\s*/g, "$1").trim();

      // [NO-1P] 개인 1인칭 회귀 차단 (기관 화자 유지 · 전 섹션 적용)
      body = body.replace(/(^|[\s.,])(저는|제가|저희는|저희가)\s*/g, "$1");

      // closing 재요약 차단 — 앞 1단락만
      if (sec.key === "closing") {
        if (/\n\s*1\.\s/.test(body) || /(준비자료|진행 흐름|기간을 놓치면)/.test(body.slice(150))) {
          body = body.split(/\n{2,}/).slice(0, 1).join("\n\n").trim();
        }
      }
      // 서수·번호 나열 산문화 (documents는 목록 유지)
      if (sec.key === "firstMove" || sec.key === "deadline" || sec.key === "criteria" || sec.key === "process") {
        body = deListForV2(body);
      }
      // ── documents 전용 — 재료 밖 서류 드롭 → 설명문 리스트 밖 분리 (순서 고정) ──
      if (sec.key === "documents") {
        body = stripPostProcessDocs(body, treatment.id);   // [DOC-SOT]
        body = splitDocNote(body);                          // [DOC-SPLIT]
      }
      // ── [세션45][CRITERIA-CAP] criteria 전용 — 인정·구제 결과 약속 문장 드롭 ──
      //   ★ labor 최대 리스크 지점. 프롬프트 금지만으로는 GPT가 반드시 회귀한다.
      if (sec.key === "criteria") {
        body = stripCriteriaPromise(body);
      }
      // ── [GEO-GATE] 결합 키워드 섹션 게이트 ─────────
      //   결합 키워드는 closing에만 허용. 그 외 섹션은 생성 직후 업무명 단독으로 치환.
      if (sec.key !== "closing") {
        const escS = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const geoRe = new RegExp(`${escS(region)}\\s*${escS(dirKw)}\\s*노무사(\\s*사무소)?`, "g");
        body = body.replace(geoRe, dirKw);
        // 지역+노무사 결합(업무명 없이)도 중간 섹션에선 제거
        const geoRe2 = new RegExp(`${escS(region)}\\s*노무사(\\s*사무소)?(에서는|에서|는|가|이|의)?\\s*`, "g");
        body = body.replace(geoRe2, "");
        // ★ 결합만 지워도 "사무소가 정보를 제공합니다"류 홍보 절이 남는다(tax 실측).
        body = stripSelfPromo(body);
      }
      // [SPINE7] 소제목 부여 — title "" 이면 미부여 (concern · closing)
      if (sec.title) body = `## ${sec.title}\n\n` + body;
      // [PHOTO5] 사진 슬롯 — photo null 섹션은 미삽입 (criteria · process)
      if (sec.photo) body += "\n\n[이미지: " + sec.photo + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = stripCliche(content);            // AI 상투어 문장 드롭
    content = capEvalSentences(content);       // 평가문 2회 상한
    content = stripMoneyClaims(content);       // 금액·비율 단정 드롭
    content = stripCriteriaPromise(content);   // ★ [CRITERIA-CAP] 인정·구제 약속 드롭 (전역 2차)
    content = removeDupParagraphs(content);
    content = compressDupSentencesV2(content);
    content = fixKoSpacing(content);           // [SPACE-FIX] 조사 오공백 정규화
    content = applyPhotoBoxes(content);
    content = content.replace(SPEAKER_POLLUTION_RE, "\n").trim();

    // 사무소 정보 마무리 (발행코치 주입 시만)
    //   ★ [STORE-IN-BODY] 상호는 본문에 붙지 않는다. 전화·상담정보만.
    // [세션47][PRO-VISIT] buildOfficeClosing 호출 제거 — 상담정보 SoT를 proVisitBlock으로 일원화.
    //   ⚠ 실측: index.js 페이로드에 phone/consultInfo 키가 존재하지 않는다 → 이 블록은 항상 빈값(미출력)이었다.
    //     즉 기능 제거가 아니라 사문화 코드 정리. 출력 변화 0. buildOfficeClosing 정의는 롤백 대비 보존(미호출).

    // ── [GEO-CAP] 지역+업무+노무사 결합 3회 상한 ─────
    //   PHILOSOPHY 원칙3. ⚠ 해시태그 append '이전'에 실행.
    {
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fullKwRe = new RegExp(`${esc(region)}\\s*${esc(dirKw)}\\s*노무사`, "g");
      let seen = 0;
      content = content.replace(fullKwRe, (m) => (++seen <= 3 ? m : `${dirKw} 노무사`));
    }

    // 마무리 해시태그
    content += buildHashtags(region, dirKw, axis);

    // [v-loc] LocationBlock 후단 주입 (PATCH-07) — 해시태그 직전 삽입.
    // [세션47][PRO-VISIT] 방문정보 공통 삽입 — [📷외관 → 📍찾아오시는 길 → 📷입구 → 🗓방문상담 → 📷상담실·대표실·주차장·약도]
    //   ⚠ locationBlock은 insertProVisitInfo 내부에서 호출된다(2회 삽입 방지 · 위치 SoT 단일).
    content = insertProVisitInfo(content, _locStore, _visitInfo);
    // [세션47] 신규 삽입된 [이미지: …] 6슬롯을 placeholder로 변환. 이미 변환된 박스는 패턴 불일치로 무영향(멱등).
    content = applyPhotoBoxes(content);

    // 소제목 MD 해제 — 근접중복 판정이 끝난 뒤에 수행.
    content = content.replace(/(^|\n)##\s*/g, "$1");

    // ── [SPEAKER-CLEAN 최종단] ────────────────────
    //   해시태그·locationBlock 삽입과 MD 해제를 거치며 줄 경계가 재구성될 여지가 있다.
    //   → 모든 조립·삽입이 끝난 최종 반환 직전에 한 번 더 실행(멱등·무해).
    content = content.replace(SPEAKER_POLLUTION_RE, "\n");
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    // ★ [TITLE-SUFFIX] 토글 ON + 상호 존재 시에만 "제목 | 상호"
    const title = resolveTitleSuffix(buildTitle(region, treatment), storeName, titleSuffixOn);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(dirKw, "g")) || []).length;
    const fullKw = `${region} ${dirKw} 노무사`;
    const fullCount = (content.match(new RegExp(fullKw, "g")) || []).length;
    const moneyResidual = MONEY_RE.test(content) ? 1 : 0;
    const promiseResidual = CRITERIA_PROMISE_RE.test(content) ? 1 : 0;
    console.log(`[QC][labor] 키워드(${dirKw}): ${kwCount}`);
    console.log(`[QC][labor] 복합키워드(${fullKw}): ${fullCount}`);
    console.log(`[QC][labor] 축: ${axis}`);
    console.log(`[QC][labor] 글자수: ${content.length}`);
    console.log(`[QC][labor] 금액표기 잔존: ${moneyResidual}`);
    console.log(`[QC][labor] 인정단정 잔존: ${promiseResidual}`);

    return res.status(200).json({
      title,
      // [정합] 프론트는 data.text 1순위. text/textMarkdown/content 3종 동시 반환.
      text:         content,
      textMarkdown: content,
      content,
      industry: "labor",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      region,
      seoScore: null,   // 정보형: 점수 집착 UI 비연결 (PHILOSOPHY 정합)
      qc: { fullKeyword: fullKw, fullKeywordCount: fullCount, kwCount, moneyResidual, promiseResidual },
    });
  } catch (err) {
    console.error("[labor] 오류:", err);
    return res.status(500).json({ error: err.message || "노무사 글 생성 오류" });
  }
}
