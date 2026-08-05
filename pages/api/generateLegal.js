// ============================================================
// pages/api/generateLegal.js — 법무사(legal) 엔진 핸들러 V2
// ============================================================
// [세션42][SPINE7-LEGAL] 6섹션 → 7섹션 전문직 Spine (B안).
//   concern / firstMove / deadline / documents / cost / process / closing
//
//   엔진 축(변호사 V2 세션41 공통 재사용):
//     · Spine 조립 · 소제목 코드부여 · 사진 5슬롯
//     · stripCliche / capEvalSentences / removeDupParagraphs / compressDupSentencesV2
//     · GEO-CAP (지역+업무+법무사 결합 3회 상한) · NOGREET(인사말 도입 제거)
//   콘텐츠 축(법무사 전용):
//     · deadline / cost 섹션 · legal-v2-prompts · legal-v2-data
//     · mistake 미이식(변호사 전용) · consult 제거
//
//   실측(세션41): 프롬프트 금지만으로는 GPT가 반드시 회귀 → 후처리 이중 차단 필수.
//   실측(세션41): 소제목(## ) 블록은 근접중복 판정 제외(isHead). MD 해제는 판정 이후.
//
// engineBootstrap에서 register("legal", handleLegal). generate.js 무수정.
// ⚠️ 작업DB vuuqtrzcfjbywlxqskoi — 본 세션 DB 변경 0.
// ============================================================

import OpenAI from "openai";
import { LEGAL_TREATMENTS } from "../../lib/legal-data";
import { LEGAL_DIRECTION, LEGAL_FORBIDDEN } from "../../lib/legal-prompts";
import { LEGAL_FLOW } from "../../lib/legal-playConfig";
import { buildSystemPromptV2, buildUserPromptV2, AI_CLICHE, LEGAL_GUARANTEE_BAN } from "../../lib/legal-v2-prompts";
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
  for (const w of LEGAL_FORBIDDEN) t = t.split(w).join("");
  for (const w of LEGAL_GUARANTEE_BAN) t = t.split(w).join("");
  // AI 논문형 연결어 (줄머리)
  ["따라서", "결론적으로", "정리하면", "살펴보겠습니다"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  return t;
}

// ── [세션42][CLICHE] AI 상투어 문장 제거 ────────────────
//   프롬프트 금지만으론 GPT가 회귀 → 후처리 이중 차단.
//   상투어 포함 '문장'을 통째로 드롭(구절만 지우면 문장이 깨짐).
//   ⚠ 목록 줄(- ·) 보존. 소제목(## ) 블록 보호.
//
//   ★ [세션42][DROP-FIX] 전량삭제 방지 로직 수정 (실측 버그).
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

// ── [세션42][EVAL-CAP] 평가 종결 문장 상한 ──────────────
//   "중요합니다 / 필요합니다 / 주의가 필요합니다" 반복 = 같은 말 반복 체감의 실체.
//   전문(全文) 기준 2회 초과분 문장 드롭. 목록 줄 보존.
const EVAL_TAIL = /(중요합니다|필요합니다|영향을 미칩니다|주의가 필요합니다|고려해야 합니다|인지해야 합니다|유의해야 합니다)\s*[.]?\s*$/;
const EVAL_CAP = 2;
//   ★ [세션42][DROP-FIX] stripCliche와 동일 수정. 단일 문장 블록도 정상 드롭.
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

// ── [세션42][MONEY-CAP] 금액·요율 수치 단정 차단 ─────────
//   법무사 최대 리스크: 비용 단정. cost 섹션에서 GPT가 "약 50만원" 회귀 관측 대비.
//   금액/요율 표기 문장을 드롭(구절 제거 시 문장 파손). 목록 줄 보존.
const MONEY_RE = /(\d[\d,]*\s*(만원|원|천원|억)|\d+(\.\d+)?\s*%)/;
//   ★ [세션42][DROP-FIX] 동일 수정. 목록 줄에도 금액이 섞이므로 목록 줄 단위로도 검사.
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

// ── [세션42][SPEAKER-CLEAN] 화자 오염 단독 라인 차단 ────────
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

// ── [세션42-2][SELF-PROMO] 사무소 자기지시·홍보 문장 드롭 ────
//   ★ 실측(1차 생성) firstMove 말미:
//     "잠실 송리단길 상속등기 법무사 사무소에서는 이 과정에서 필요한 모든 정보를 제공하며,
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

// ── [세션43][DOC-SOT] 재료 밖 서류 라인 드롭 ─────────────
//   ★ 실측(법인설립): "사업자등록증 사본 — 국세청 / 법인세 신고를 위한 필수서류".
//     법인 설립 '전' 준비서류에 설립 후 서류가 섞임 = 사실 오류.
//     data(LEGAL_DOCUMENTS)에 없는 후행 서류를 목록에서 제거한다.
const POST_PROCESS_DOCS = [
  "사업자등록증", "사업자등록", "법인인감카드", "법인인감증명서 발급",
  "등기필증(교부)", "법인등기부등본 발급",
];
function stripPostProcessDocs(text, treatmentId) {
  // 설립·개시 전(前) 단계 업무에만 적용 — 이미 법인이 존재하는 변경등기류는 제외
  const PRE = /(corporation_establish|inheritance_registration|inheritance_renounce|limited_acceptance)/;
  if (!PRE.test(String(treatmentId || ""))) return text;
  return text
    .split("\n")
    .filter((ln) => {
      if (!/^\s*[-·•]/.test(ln)) return true;
      return !POST_PROCESS_DOCS.some((d) => ln.includes(d));
    })
    .join("\n");
}

// ── 사진 placeholder (1줄 간소화 — 발행자 인지용) ────────
const LEGAL_PHOTO_POOL = {
  "상담 안내": "사무소 입구 / 간판 사진",
  "기준 안내": "상담실 내부 / 법무사 프로필 사진",
  "기한 안내": "달력 / 접수 안내 게시물 사진",
  "자료 안내": "준비 서류 예시 / 체크리스트 사진",
  "사무소 안내": "사무소 외관 / 약도 사진",
};
function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => {
    const _k = String(alt).trim();
    // [세션47][PRO-VISIT] 공통 6슬롯(사무소 외관/건물 입구/상담실/대표실/주차장/약도) fallback.
    const photo = LEGAL_PHOTO_POOL[_k] || (PRO_PHOTO_POOL[_k] && PRO_PHOTO_POOL[_k].photos[0]) || LEGAL_PHOTO_POOL["사무소 안내"];
    return `\n📷 사진: ${photo} (업로드 후 이 줄 삭제)\n`;
  });
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── 마무리 해시태그 (정보형 고정) ─────────────────
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}법무사`, `#${k}법무사`, `#${rg}법무사`,
    `#${k}절차`, `#${k}준비서류`, `#${rg}법무사사무소`,
  ];
  return "\n\n" + tags.join(" ");
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
//   [세션41][NOGREET] 인사말 도입은 제거. 화자는 마무리 사무소 정보로 유지.
function buildOfficeClosing(storeName, phone, consultInfo) {
  let office = (storeName || "").trim();
  if (!office) return "";
  office = office.split(/\s*[|/·,]\s*/)[0].trim();
  const lines = [`\n${office}`];
  if ((phone || "").trim()) lines.push(`상담 전화 ${phone.trim()}`);
  if ((consultInfo || "").trim()) lines.push(consultInfo.trim());
  return lines.join("\n");
}

// ── 제목 생성 ───────────────────────────────────
function buildTitle(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name} 법무사`;
  let title = pick.replace(/\{region\}/g, region);
  title = title.replace(/(법무사).*(법무사)/, "$1");
  // 후기형·의료형 제목 차단 → 정보형 강제
  if (/후기|체험|회복|붓기|통증|시술/.test(title)) {
    title = `${region} ${treatment.name} 절차와 준비서류`;
  }
  return title.trim();
}

export default async function handleLegal(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName, phone: bodyPhone, consultInfo: bodyConsultInfo,
      // [v-loc] 위치 5필드 (PATCH-07)
      address, map_guide, transit, building_desc, parking_info,
      visit_info: bodyVisitInfo, // [세션47][PRO-VISIT] 방문상담 SoT
    } = req.body;

    const region = (userRegion || regionFallback || program?.region || "").trim();
    const storeName   = (bodyStoreName || "").trim();
    const phone       = (bodyPhone || "").trim();
    const consultInfo = (bodyConsultInfo || "").trim();
    const _locStore = { address, map_guide, transit, building_desc, parking_info };
    // [세션47][PRO-VISIT] 방문상담 SoT — store_profiles.visit_info (JSONB). index.js 세션37 배선으로 이미 전달 중.
    //   신규 스키마 0. 빈 객체면 🗓 방문상담 안내 블록 미생성(부작용 0).
    const _visitInfo = (bodyVisitInfo && typeof bodyVisitInfo === "object") ? bodyVisitInfo : {};

    // 업무 매칭
    const treatment =
      LEGAL_TREATMENTS.find((t) => t.id === program?.id) ||
      LEGAL_TREATMENTS.find((t) => t.name === program?.name);
    if (!treatment) {
      return res.status(400).json({ error: `법무사 업무 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const dir = LEGAL_DIRECTION[treatment.id] || {};
    const dirKw = dir.keyword || kw;
    const systemPrompt = buildSystemPromptV2(region, treatment);

    // ── 섹션 순차 생성 (7섹션 / 사진 5슬롯) ──
    const writtenSections = new Set();
    const sections = [];

    for (const sec of LEGAL_FLOW) {
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
      //   법무사는 기관 화자가 원칙 → 변호사(consult 한정)보다 범위 확대.
      body = body.replace(/(^|[\s.,])(저는|제가|저희는|저희가)\s*/g, "$1");

      // closing 재요약 차단 — 앞 1단락만
      if (sec.key === "closing") {
        if (/\n\s*1\.\s/.test(body) || /(준비서류|진행 절차|기한을 놓치면)/.test(body.slice(150))) {
          body = body.split(/\n{2,}/).slice(0, 1).join("\n\n").trim();
        }
      }
      // 서수·번호 나열 산문화 (documents는 목록 유지)
      if (sec.key === "firstMove" || sec.key === "deadline" || sec.key === "cost" || sec.key === "process") {
        body = deListForV2(body);
      }
      // ── [세션43] documents 전용 — 재료 밖 서류 드롭 → 설명문 리스트 밖 분리 (순서 고정) ──
      if (sec.key === "documents") {
        body = stripPostProcessDocs(body, treatment.id);   // [DOC-SOT]
        body = splitDocNote(body);                          // [DOC-SPLIT]
      }
      // ── [세션42][GEO-GATE] 결합 키워드 섹션 게이트 ─────────
      //   ★ 실측(1차 생성): firstMove에 "잠실 송리단길 상속등기 법무사 사무소에서는…" 삽입.
      //     GEO-CAP(전문 3회 상한)은 '몇 번'만 통제할 뿐 '어느 섹션'인지는 통제하지 못한다.
      //     결합 키워드가 본문 중간 섹션에 박히면 그 섹션의 역할(판단기준·기한·서류)이 흐려지고
      //     사무소 홍보 문장이 끼어든다 → 역할 배타화 위반.
      //   대응: 결합 키워드는 closing에만 허용. 그 외 섹션은 생성 직후 업무명 단독으로 치환.
      //         (전문 상한 GEO-CAP은 조립 후 별도로 유지 — 이중 차단)
      if (sec.key !== "closing") {
        const escS = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const geoRe = new RegExp(`${escS(region)}\\s*${escS(dirKw)}\\s*법무사(\\s*사무소)?`, "g");
        body = body.replace(geoRe, dirKw);
        // 지역+법무사 결합(업무명 없이)도 중간 섹션에선 제거
        const geoRe2 = new RegExp(`${escS(region)}\\s*법무사(\\s*사무소)?(에서는|에서|는|가|이|의)?\\s*`, "g");
        body = body.replace(geoRe2, "");
        // ★ 결합만 지워도 "사무소가 정보를 제공합니다"류 홍보 절이 남는다(실측).
        //   → 자기지시·홍보 술어를 가진 '문장' 자체를 드롭. 이것이 역할 위반의 본질.
        body = stripSelfPromo(body);
      }
      // [SPINE7] 소제목 부여 — title "" 이면 미부여 (concern · closing)
      if (sec.title) body = `## ${sec.title}\n\n` + body;
      // [PHOTO5] 사진 슬롯 — photo null 섹션은 미삽입 (cost · process)
      if (sec.photo) body += "\n\n[이미지: " + sec.photo + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = stripCliche(content);            // [세션42] AI 상투어 문장 드롭
    content = capEvalSentences(content);       // [세션42] 평가문 2회 상한
    content = stripMoneyClaims(content);       // [세션42] 금액·요율 단정 드롭
    content = removeDupParagraphs(content);
    content = compressDupSentencesV2(content);
    content = fixKoSpacing(content);           // [세션43][SPACE-FIX] 조사 오공백 정규화
    content = applyPhotoBoxes(content);
    content = content.replace(SPEAKER_POLLUTION_RE, "\n").trim();

    // 사무소 정보 마무리 (발행코치 주입 시만)
    // [세션47][PRO-VISIT] buildOfficeClosing 호출 제거 — 상담정보 SoT를 proVisitBlock으로 일원화.
    //   ⚠ 실측: index.js 페이로드에 phone/consultInfo 키가 존재하지 않는다 → 이 블록은 항상 빈값(미출력)이었다.
    //     즉 기능 제거가 아니라 사문화 코드 정리. 출력 변화 0. buildOfficeClosing 정의는 롤백 대비 보존(미호출).

    // ── [세션42][GEO-CAP] 지역+업무+법무사 결합 3회 상한 ─────
    //   PHILOSOPHY 원칙3. ⚠ 해시태그 append '이전'에 실행.
    {
      const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fullKwRe = new RegExp(`${esc(region)}\\s*${esc(dirKw)}\\s*법무사`, "g");
      let seen = 0;
      content = content.replace(fullKwRe, (m) => (++seen <= 3 ? m : `${dirKw} 법무사`));
    }

    // 마무리 해시태그
    content += buildHashtags(region, dirKw);

    // [v-loc] LocationBlock 후단 주입 (PATCH-07) — 해시태그 직전 삽입.
    // [세션47][PRO-VISIT] 방문정보 공통 삽입 — [📷외관 → 📍찾아오시는 길 → 📷입구 → 🗓방문상담 → 📷상담실·대표실·주차장·약도]
    //   ⚠ locationBlock은 insertProVisitInfo 내부에서 호출된다(2회 삽입 방지 · 위치 SoT 단일).
    content = insertProVisitInfo(content, _locStore, _visitInfo);
    // [세션47] 신규 삽입된 [이미지: …] 6슬롯을 placeholder로 변환. 이미 변환된 박스는 패턴 불일치로 무영향(멱등).
    content = applyPhotoBoxes(content);

    // [세션41 계승] 소제목 MD 해제 — 근접중복 판정이 끝난 뒤에 수행.
    content = content.replace(/(^|\n)##\s*/g, "$1");

    // ── [세션42-3][SPEAKER-CLEAN 최종단] ────────────────────
    //   ★ 실측(2차 생성): 패치 후에도 본문 끝 "관리자" 단독 라인 잔존 관측.
    //     조립 직후(408행) 필터는 통과했으나, 해시태그·locationBlock 삽입과
    //     MD 해제를 거치며 줄 경계가 재구성될 여지가 있다.
    //     → 모든 조립·삽입이 끝난 최종 반환 직전에 한 번 더 실행한다(멱등·무해).
    //   ⚠ 사무소명(buildOfficeClosing)은 목록에 없으므로 보존된다.
    content = content.replace(SPEAKER_POLLUTION_RE, "\n");
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    const title = buildTitle(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(dirKw, "g")) || []).length;
    const fullKw = `${region} ${dirKw} 법무사`;
    const fullCount = (content.match(new RegExp(fullKw, "g")) || []).length;
    const moneyResidual = MONEY_RE.test(content) ? 1 : 0;
    console.log(`[QC][legal] 키워드(${dirKw}): ${kwCount}`);
    console.log(`[QC][legal] 복합키워드(${fullKw}): ${fullCount}`);
    console.log(`[QC][legal] 글자수: ${content.length}`);
    console.log(`[QC][legal] 금액표기 잔존: ${moneyResidual}`);

    return res.status(200).json({
      title,
      // [정합] 프론트는 data.text 1순위. text/textMarkdown/content 3종 동시 반환.
      text:         content,
      textMarkdown: content,
      content,
      industry: "legal",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      region,
      seoScore: null,   // 정보형: 점수 집착 UI 비연결 (PHILOSOPHY 정합)
      qc: { fullKeyword: fullKw, fullKeywordCount: fullCount, kwCount, moneyResidual },
    });
  } catch (err) {
    console.error("[legal] 오류:", err);
    return res.status(500).json({ error: err.message || "법무사 글 생성 오류" });
  }
}
