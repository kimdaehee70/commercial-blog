// ============================================================
// pages/api/generateLawyer.js — 변호사(lawyer) 엔진 핸들러
// 정보형(institutional 1인칭). 후기형 최소. 결과보장 금지.
// engineBootstrap에서 register("lawyer", handleLawyer)로 편입.
// 기존 업종 무수정. lawyer 자립.
// ============================================================

import OpenAI from "openai";
import { LAWYER_TREATMENTS } from "../../lib/lawyer-data";
import {
  getImageAlts,
  FORBIDDEN,
} from "../../lib/lawyer-prompts";
import { LAWYER_FLOW } from "../../lib/lawyer-playConfig";
// [Legal V2 기본화 · 세션48] Pilot 승격 확정 → V2(검색자 고민 우선)만 사용. V1 프롬프트 경로 제거.
import { buildSystemPromptV2, buildUserPromptV2, AI_CLICHE } from "../../lib/lawyer-v2-prompts";
import { LAWYER_KEYPOINTS } from "../../lib/lawyer-v2-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 조사오류·공백·키워드 반복 정리 ──────────
function cleanText(text, kw) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  t = t.replace(/받고나면/g, "받고 나면");
  // [버그수정] 사건명 치환 제거. '명예훼손 사건'→'해당 사건 사건' 문장 파손 원인.
  //   변호사는 kw가 사건명이라 generic 치환 시 문장이 깨짐. 치환 자체 비활성.
  return t.trim();
}

// ── 금칙어 제거(결과보장·과장) ──────────────────
function stripForbidden(text) {
  let t = text;
  for (const w of FORBIDDEN) {
    t = t.split(w).join("");
  }
  // AI 논문형 연결어
  ["따라서", "결론적으로", "정리하면"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  return t;
}

// ── [세션41][CLICHE] AI 상투어 문장 제거 ────────────────
//   프롬프트 금지만으로는 GPT가 회귀 → 후처리 이중 차단.
//   상투어가 포함된 '문장'을 통째로 드롭(구절만 지우면 문장이 깨짐).
//   ⚠ 목록 줄(- ·)은 보존.
function stripCliche(text) {
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;           // 목록 보존
    const sents = block.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => !AI_CLICHE.some((c) => s.includes(c)));
    return (kept.length ? kept : sents).join(" ").trim();     // 전량 삭제 방지
  });
  return out.filter(Boolean).join("\n\n");
}

// ── [세션41-3][EVAL-CAP] 평가 종결 문장 상한 ────────────────
//   관측: "중요합니다 / 필요합니다 / 영향을 미칩니다"로 끝나는 문장이 섹션마다 반복 →
//         읽는 사람이 "같은 말을 계속 한다"고 느끼는 실체. 프롬프트만으론 GPT가 회귀.
//   대응: 전문(全文) 기준 2회 초과분은 해당 문장을 드롭.
//         (구절만 지우면 문장이 깨지므로 문장 단위. 목록 줄은 보존.)
const EVAL_TAIL = /(중요합니다|필요합니다|영향을 미칩니다|주의가 필요합니다|고려해야 합니다|인지해야 합니다)\s*[.]?\s*$/;
const EVAL_CAP = 2;
function capEvalSentences(text) {
  let hit = 0;
  const blocks = text.split(/\n{2,}/);
  const out = blocks.map((block) => {
    if (/(^|\n)\s*[-·]/.test(block)) return block;       // 목록 보존
    const sents = block.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    const kept = sents.filter((s) => {
      if (!EVAL_TAIL.test(s.trim())) return true;
      hit += 1;
      return hit <= EVAL_CAP;                            // 상한 초과 문장만 드롭
    });
    return (kept.length ? kept : sents).join(" ").trim(); // 전량 삭제 방지
  });
  return out.filter(Boolean).join("\n\n");
}

// ── 중간 해시태그 제거 ──────────────────────────
function stripMidHashtags(text) {
  return text.replace(/(^|\s)#[^\s#]+/g, "$1").trim();
}

// ── [Pilot V2 전용] 절차 나열 산문화 ─────────────────
//   GPT가 습관적으로 "1. 2. 3." "첫째/둘째/셋째"로 회귀 → 프롬프트만으론 부족.
//   후처리에서 번호/서수 나열을 문단 흐름으로 흡수(V2=검색자 고민형 톤 정합).
//   ⚠ checklist 섹션은 목록 유지가 자연스러우므로 손대지 않음 → 이 함수는
//     '조립 후 전체'가 아니라 procedure/criteria 섹션 텍스트에만 적용한다.
function deListForV2(text) {
  let t = text;
  // "첫째,/둘째,/셋째," 등 서수 접속어 제거(문장은 유지)
  t = t.replace(/(^|\n|\s)(첫째|둘째|셋째|넷째|다섯째)[,.]?\s*/g, "$1");
  // 줄머리 "1. " "2) " 같은 번호 마커 제거(내용 유지, 문단 연결)
  t = t.replace(/(^|\n)\s*\d+\s*[.)]\s*/g, "$1");
  // 번호 제거로 생긴 짧은 줄들을 문단으로 재연결(빈줄 2개는 보존)
  t = t.replace(/\n(?!\n)/g, " ").replace(/\s{2,}/g, " ");
  return t.trim();
}

// ── [v144] 사진 placeholder 박스 (치과 2단 구조 동형) ──────
//   [이미지: alt] → 네이버 복붙용 안내 박스. 발행자가 위치 인지 + 캡션 예시.
const LAWYER_PHOTO_POOL = {
  "상담 안내": { photos: ["사무소 입구 / 간판 사진", "상담실 내부 사진", "접수 데스크 사진"], captions: ["상담실 안내", "사무소 위치 안내", "예약 / 접수 안내"] },
  "절차 안내": { photos: ["상담 자료 / 서류 사진", "사건 절차 안내 자료", "사무소 내부 풍경"], captions: ["절차 안내 자료", "사건 진행 단계 안내", "상담 진행 안내"] },
  "기준 안내": { photos: ["변호사 프로필 / 약력 사진", "상담 진행 사진", "사무소 회의실 사진"], captions: ["선임 기준 안내", "상담 진행 안내", "사무소 안내"] },
  "자료 안내": { photos: ["준비 서류 예시 사진", "체크리스트 자료 사진", "상담 준비 안내 사진"], captions: ["준비 자료 안내", "체크리스트 안내", "상담 준비 안내"] },
  "사무소 안내": { photos: ["사무소 외관 사진", "사무소 입구 / 약도 사진", "상담 예약 안내 사진"], captions: ["사무소 위치 안내", "상담 예약 안내", "찾아오시는 길 안내"] },
};

function buildPhotoPlaceholder(altRaw) {
  const alt = String(altRaw || "").trim();
  const entry = LAWYER_PHOTO_POOL[alt] || LAWYER_PHOTO_POOL["사무소 안내"];
  const photo = entry.photos[0];
  // [v146] 1줄 간소화 (발행자가 안 읽는 8줄 박스 제거)
  return `\n📷 사진: ${photo} (업로드 후 이 줄 삭제)\n`;
}

function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => buildPhotoPlaceholder(alt));
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── [v144] 마무리 해시태그 (치과 mode 분기 동형, 변호사는 정보형 고정) ──
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}변호사`, `#${k}변호사`, `#${rg}변호사`,
    `#${k}상담`, `#${k}절차`, `#${rg}법률사무소`,
  ];
  return "\n\n" + tags.join(" ");
}

// ── [v145] 중복 문단 제거 (GPT 섹션 내 재요약 반복 차단) ──
function removeDupParagraphs(text) {
  const paras = text.split(/\n{2,}/);
  const seen = new Set();
  const out = [];
  for (const p of paras) {
    const norm = p.replace(/\s+/g, "").replace(/[0-9.]/g, "").slice(0, 40);
    if (norm.length > 10 && seen.has(norm)) continue; // 앞부분 40자 동일 = 중복
    if (norm.length > 10) seen.add(norm);
    out.push(p);
  }
  return out.join("\n\n");
}

// ── [Pilot V2 전용] 문장 단위 중복 압축 (v2: 의미 근접중복까지) ──────
//   V2는 keyPoints(진술·합의·증거·2차피해)를 섹션마다 반복 서술 → 과다생성.
//   기존: 앞 24자 완전일치만 제거 → "증거를 준비하세요"/"자료를 정리하세요"처럼
//         표현만 다른 의미중복은 통과 → 관측상 중복 30%가 여기서 샘.
//   개선: 문장에서 핵심명사 집합을 뽑아, 이미 나온 문장과 명사 3개+ 겹치면 중복 컷.
//         (완전일치 24자 시그니처는 백업으로 유지)
//   ⚠ checklist의 "- 항목" 목록 줄은 보존(목록 특성 유지). 근접중복 판정도 목록엔 미적용.
const _STOPWORDS = new Set([
  "이것","그것","저것","경우","상황","내용","부분","문제","사건","관련","가능","확인",
  "필요","중요","진행","준비","때문","이때","다음","다른","여러","모든","각각","통해",
  "대한","위해","등의","등을","등이","하는","하기","있는","있습니다","됩니다","입니다",
]);
function _nounSig(sent) {
  // 2자+ 한글 토큰 추출 → 불용어 제거 → 집합. (형태소기 없이 경량 근사)
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
//   [핵심] 문장이 아니라 '문단(블록) 주제'가 반복되는 게 관측된 중복의 실체다.
//   ("상담에서 함께 확인" 블록이 criteria와 closing 앞에 2번, "지금 판단" 블록이
//    intro와 procedure에 반복). → 블록별 주제 명사집합을 만들어, 이미 나온 블록과
//    겹침 비율이 높으면 뒤 블록을 통째로 드롭한다. 첫 등장은 항상 보존.
function _blockNounSig(block) {
  const nouns = _nounSig(block);
  return nouns;
}
function compressDupSentencesV2(text) {
  const blocks = text.split(/\n{2,}/);
  const seenBlocks = [];   // { sig:Set } 채택된 블록 이력
  const seenSentSig = new Set();
  const outBlocks = [];
  for (const block of blocks) {
    const isList = /(^|\n)\s*[-·]/.test(block);
    // [세션41] 소제목(## )이 붙은 블록은 역할이 다른 섹션의 첫 블록 → 근접중복 판정 제외.
    //   (섹션 역할 배타화로 중복은 프롬프트 단에서 이미 차단. 여기서 통째 드롭되면 섹션 소실.)
    const isHead = /^##\s/.test(block);
    // ── 블록 주제 근접중복 판정(목록·소제목 블록은 제외) ──
    if (!isList && !isHead) {
      const bsig = _blockNounSig(block);
      if (bsig.size >= 5) {
        // 기존 채택 블록 중 하나와 명사 5개+ 겹치고, 겹침이 현재 블록의 45%+ 면 주제중복
        const dup = seenBlocks.some((prev) => {
          const ov = _overlap(bsig, prev);
          return ov >= 5 && ov / bsig.size >= 0.45;
        });
        if (dup) continue;   // 뒤에 온 반복 블록 통째 드롭
        seenBlocks.push(bsig);
      }
    }
    // ── 블록 내 문장 완전일치 중복만 추가 정리(목록 보존) ──
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

// ── [Pilot V2] closing이 앞 keyPoint를 재나열하면 축약 ─────
//   마무리 블록에 사건 판단 포인트가 3개 이상 재등장 → 마무리답게 2문장으로 컷.
function trimClosingRestateV2(text, keyPoints) {
  if (!Array.isArray(keyPoints) || !keyPoints.length) return text;
  const blocks = text.split(/\n{2,}/);
  if (blocks.length < 2) return text;
  const last = blocks[blocks.length - 1];
  const hits = keyPoints.filter((kp) => last.includes(kp.replace(/\s.*/, ""))).length;
  if (hits >= 3) {
    const sents = last.replace(/([.?!])\s+/g, "$1\u0001").split("\u0001");
    blocks[blocks.length - 1] = sents.slice(-2).join(" ").trim(); // 끝 2문장(상담 안내)만
  }
  return blocks.join("\n\n");
}

// ── [v144] 사무소 정보 주입 (발행코치 business). 미주입 시 placeholder ──
function buildOfficeIntro(region, storeName) {
  let office = (storeName || "").trim();
  // [v150] Head(화자) 단일화: "기관 | 개인" 혼합 입력 시 기관명만 화자로.
  //   개인명(대표변호사 등)이 화자에 섞이면 "법인+사람에서 안내드립니다" 화자 혼선 → 구분자 앞만 사용.
  //   구분자: | / · , (뒤쪽 대표변호사·이름은 하단 프로필/소개 블록 소관).
  office = office.split(/\s*[|/·,]\s*/)[0].trim();
  // [v149] 가드 완화: 법률/법무/로펌/변호사/법인 계열이면 그대로. 닉네임만 차단.
  if (!office || !/(법률|법무|로펌|변호사|법인)/.test(office)) {
    office = "{법률사무소명}";
  }
  // [v150] 기관 화자 종결 통일: "○○입니다." (에서 안내드립니다 → 화자 혼선/번역투 제거)
  return `안녕하세요. ${office}입니다.`;
}

function buildOfficeClosing(storeName, phone, consultInfo) {
  const office = (storeName || "").trim();
  if (!office) return "";
  const lines = [`\n${office}`];
  if ((phone || "").trim()) lines.push(`상담 전화 ${phone.trim()}`);
  if ((consultInfo || "").trim()) lines.push(consultInfo.trim());
  return lines.join("\n");
}

// ── 제목 생성 ───────────────────────────────────
function buildTitle(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name} 변호사`;
  let title = pick.replace(/\{region\}/g, region);
  // 중복 방지: 같은 단어 2회 반복 축약
  title = title.replace(/(변호사).*(변호사)/, "$1");
  return title.trim();
}

export default async function handleLawyer(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName, phone: bodyPhone, consultInfo: bodyConsultInfo,
    } = req.body;
    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();
    // [v144] 사무소 정보(발행코치 business 주입). 미주입 시 placeholder/생략 graceful.
    const storeName   = (bodyStoreName || "").trim();
    const phone       = (bodyPhone || "").trim();
    const consultInfo = (bodyConsultInfo || "").trim();

    // 사건 데이터 매칭
    const treatment =
      LAWYER_TREATMENTS.find((t) => t.id === program?.id) ||
      LAWYER_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `변호사 사건 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPromptV2(region, treatment);

    // [v145] 섹션별 사진 alt 매핑 (코드 강제 삽입. GPT 마커 의존 제거)
    // V2=슬롯 의미 이동(지금할것/상담확인)이라 라벨만 정합.
    //   사진 alt는 캡션 예시일 뿐(발행 무영향). LAWYER_PHOTO_POOL 키 존재하는 값만 사용.
    // [세션41][SPINE7] 7섹션 / 사진 5슬롯 고정.
    //   사진 정책: 기본 5장(확정). 섹션 7개지만 consult·process는 사진 없음(피로도·업로드 부담).
    //   null = 사진 미삽입.
    const PHOTO_ALT = {
      concern:   "상담 안내",     // 1
      firstMove: "기준 안내",     // 2
      mistake:   "절차 안내",     // 3
      consult:   null,
      documents: "자료 안내",     // 4
      process:   null,
      closing:   "사무소 안내",   // 5
    };

    // ── 섹션 순차 생성 (prevSummary 사용 금지) ──
    const writtenSections = new Set();
    const sections = [];

    for (const sec of LAWYER_FLOW) {
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
      // [v145] GPT가 섞은 마크다운 이미지/잔존 마커 제거 (박스는 코드가 심음)
      body = body.replace(/!?\[[^\]]*\]/g, "").trim();
      // [v145] GPT가 마무리에 넣는 '운영자' 단독 라인 제거 (화자 오염)
      body = body.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
      // [세션41] GPT가 스스로 붙인 소제목(## / [①...] / 【】) 제거 — 헤더는 코드가 부여
      body = body.replace(/(^|\n)\s*#{1,3}\s*.+/g, "$1").trim();
      body = body.replace(/(^|\n)\s*[\[【][^\]】]{0,30}[\]】]\s*/g, "$1").trim();
      // [v146][v148] closing 섹션 재요약 차단
      //   GPT가 마무리에 글 전체를 다시 쓰는 패턴(헤더형/산문형 모두) → 앞 1단락만 유지
      if (sec.key === "closing") {
        // ① 헤더형 재요약: 절차/기준/체크 헤더 등장 시 그 앞까지
        const cutH = body.search(/(^|\n)\s*(상황\s*환기|절차\s*안내|판단[·\s]*선임\s*기준|체크리스트|준비\s*자료|먼저[,]?\s*.{0,10}절차)\s*(\n|:|를)/);
        if (cutH > 60) body = body.slice(0, cutH).trim();
        // ② 산문형 재요약: "1. ~" 번호목록·"선임할 때 고려" 재등장 → 첫 2문단만
        if (/\n\s*1\.\s/.test(body) || /(선임할 때|고려할 기준|체크리스트)/.test(body.slice(200))) {
          const paras = body.split(/\n{2,}/);
          body = paras.slice(0, 1).join("\n\n").trim();
        }
      }
      // [V2] 절차·서수 나열 산문화 (documents는 목록 유지)
      if (sec.key === "firstMove" || sec.key === "consult" || sec.key === "process") {
        body = deListForV2(body);
      }
      // [세션41][SPINE7] 소제목 부여 — sec.title 빈 문자열이면 미부여(concern·closing).
      if (sec.title) body = `## ${sec.title}\n\n` + body;
      // [세션41] 사진 5슬롯 — PHOTO_ALT null 섹션은 미삽입
      if (PHOTO_ALT[sec.key]) body += "\n\n[이미지: " + PHOTO_ALT[sec.key] + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content, kw);
    content = stripForbidden(content);
    content = stripCliche(content);         // [세션41] AI 상투어 문장 제거
    content = capEvalSentences(content);    // [세션41-3] "중요합니다" 계열 2회 상한
    content = removeDupParagraphs(content); // [v145] 반복 단락 제거
    content = compressDupSentencesV2(content); // [V2] 문장 반복 압축
    content = trimClosingRestateV2(content, LAWYER_KEYPOINTS[treatment.id]); // 마무리 재나열 컷
    // [세션41][NOGREET] 인사말 도입 제거.
    //   실측: "안녕하세요. ○○입니다." + concern 공감 문단 → 첫 500자를 서론이 점유.
    //   검색자는 상황문을 먼저 봐야 한다(병원 V2 NOHDR-01 정합). 화자는 마무리 사무소 정보로 유지.
    //   buildOfficeIntro는 롤백 대비 보존(호출만 제거).
    // [v144] 사진 placeholder 박스 변환 ([이미지: alt] → 안내 박스)
    content = applyPhotoBoxes(content);
    // [v146] 최종 본문 끝 '운영자' 잔존 라인 제거
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // [v147] 끝 서명 닉네임 라인 제거: 태그 앞 1~6자 단독 라인(마침표·조사 없는 호칭 잔재)
    content = content.replace(/\n\s*([가-힣A-Za-z]{1,6})\s*$/g, (m, w) =>
      /(법률사무소|법무법인|로펌|드림|올림)/.test(w) ? m : "\n").trimEnd();
    // [v144] 사무소 정보 마무리 (상호/전화/상담안내) — 발행코치 주입 시만
    const officeClosing = buildOfficeClosing(storeName, phone, consultInfo);
    if (officeClosing) content += "\n" + officeClosing;
    // [v144] 마무리 해시태그
    content += buildHashtags(region, kw);
    // [세션41] 소제목 마크다운 해제 — 네이버 본문은 마크다운 미지원. "## X" → "X" 단독 라인.
    //   (근접중복 판정이 끝난 뒤 해제해야 isHead 보호가 유효.)
    content = content.replace(/(^|\n)##\s*/g, "$1");
    content = content.replace(/\n{3,}/g, "\n\n").trim();

    const title = buildTitle(region, treatment);
    const imageAlts = getImageAlts(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    const fullKw = `${region} ${kw} 변호사`;
    const fullCount = (content.match(new RegExp(fullKw, "g")) || []).length;
    console.log(`[QC][lawyer] 키워드(${kw}): ${kwCount}`);
    console.log(`[QC][lawyer] 복합키워드(${fullKw}): ${fullCount}`);
    console.log(`[QC][lawyer] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      // [v143] 프론트(index.js)는 data.text / data.textMarkdown 을 본문으로 읽는다.
      //   lawyer가 content만 반환 → data.text=undefined → 결과화면·복사·저장 0자.
      //   타 업종과 반환 필드 정합: text/textMarkdown 추가. content는 호환 보존.
      text:           content,
      textMarkdown:   content,
      content,
      imageAlts,
      industry: "lawyer",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null, // 정보형: 점수 집착 UI 비연결 (PHILOSOPHY 정합)
    });
  } catch (err) {
    console.error("[lawyer] 오류:", err);
    return res.status(500).json({ error: err.message || "변호사 글 생성 오류" });
  }
}
