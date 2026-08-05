// ============================================================
// pages/api/generateDoor.js — 도어수리(door) 엔진 핸들러
// 정보형 + 출장 수리 안내형({region} 도어 수리 업체 1인칭).
// 후기형·내돈내산·고객사례·추천·보장·최저가·비용유도 금지.
// engineBootstrap에서 register("door", handleDoor)로 편입.
//
// 복제 베이스: generateFilm.js (섹션루프형). Runtime/FLOW/Handler 구조 무변경.
// 필름 대비 변경 2점:
//   ① siteBlock 미사용 — door 는 useSite:false. 수리는 '어느 단지'가 아니라
//      '어느 문·어느 부품'이 축이다. 제목 분기도 2단(titleEngine → legacy).
//   ② 판단 축 교체 — surface/baseGrade → symptom(증상) + part(부품군).
//      두 값 모두 미입력 시 무영향(기존 흐름 유지).
//
// 출장 수리 업종 → 고정 사업장 「찾아오시는 길」 미노출.
//   SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
// ============================================================

import OpenAI from "openai";
import {
  DOOR_TREATMENTS,
  DOOR_INFO_BLOCKS,
  getInfoBlocks,
  formatSymptom,
  getPartNote,
} from "../../lib/door-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  getSectionAlt,
  FORBIDDEN,
} from "../../lib/door-prompts";
import { DOOR_FLOW, DOOR_SECTION_PHOTO } from "../../lib/door-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
import { buildIntentTitleOrNull } from "../../lib/titleEngine.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 공백·조사 정리 ─────────────────────
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  return t.trim();
}

// ── 금칙어 제거 ────────────────────────────────
//   ★ [세션60] stripForbidden 은 단어 경계 없이 부분 문자열을 삭제한다.
//     정상 단어의 일부로 등장하는 어휘는 삭제 대상에서 뺀다.
//   프롬프트에는 금칙어를 나열하지 않는다(출력 복사 방지). 제거는 여기서만.
const STRIP_SKIP = new Set(["최고", "완벽", "1위", "보장"]);

function stripForbidden(text) {
  let t = text;
  for (const w of FORBIDDEN) {
    if (STRIP_SKIP.has(w)) continue;
    t = t.split(w).join("");
  }
  ["따라서", "결론적으로", "정리하면"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\s+([.,!?])/g, "$1");
  t = t.replace(/([.,])\1+/g, "$1");
  return t;
}

// ── 문장 잘림 감지 (회귀 감시용 QC 로그) ──
function countBrokenSentences(text) {
  return (text.match(/[가-힣]\s+[.]/g) || []).length;
}

// ── 후기·체험담 단정 완화 ───────────────────────
function softenReviewTone(text) {
  let t = text;
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|시공해보니)[,\s]*/g, "");
  t = t.replace(/(저희가\s*)?직접\s*(해봤더니|해보니)[,\s]*/g, "");
  return t;
}

// ── 중간 해시태그 제거 ──────────────────────────
function stripMidHashtags(text) {
  return text.replace(/(^|\s)#[^\s#]+/g, "$1").trim();
}

// ── 사진 placeholder 박스 ───────────────────────
function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) =>
    `\n📷 사진: ${String(alt || "").trim()} (업로드 후 이 줄 삭제)\n`
  );
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── 마무리 해시태그 ─────────────────────────────
//   ★ 메뉴명이 "수리/교체"로 끝나 `#{rg}{k}` 와 `#{rg}문수리` 가 겹칠 수 있다 → Set 일괄 정리.
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}`,
    `#${rg}도어수리`, `#${rg}문수리`,
    `#${k}`, `#${rg}출장수리`, `#${rg}문고장`,
  ];
  const uniq = [...new Set(tags.filter((t) => t && t.length > 1))];
  return "\n\n" + uniq.join(" ");
}

// ── 중복 문단 제거 ──────────────────────────────
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

// ── 정보블럭 선택 ───────────────────────────────
//   [세션60 표준] 데이터 조회 방식. cat 하드코딩 if 체인 없음.
//   → 메뉴 확장은 door-data.js 단독 작업. 핸들러를 다시 열지 않는다.
function pickInfoBlock(t) {
  const B = (typeof getInfoBlocks === "function" ? getInfoBlocks(t.cat) : null)
    || DOOR_INFO_BLOCKS;
  return B[t.infoKey] || B[t.cat] || DOOR_INFO_BLOCKS.prebook;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   2단: ① titleEngine(Intent) → ② legacy titlePatterns
//   ★ door 는 siteBlock 미사용(useSite:false) → 단지명 분기 없음.
//   ★ titleEngine 은 무수정. 분기는 buildTitle 전단에서만 한다.
function buildTitleLegacy(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pool = patterns.length ? patterns : [`{region} ${treatment.name}`];
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  return title.replace(/\s{2,}/g, " ").trim();
}

function buildTitle(region, treatment) {
  const _t = buildIntentTitleOrNull(region, treatment, "door");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handleDoor(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      symptom,                                   // ② 접수 증상 — 미입력 시 무영향
      part,                                      //    부품군(auto·hinge·roller·lock·closer·spring) — door 판단 축
    } = req.body;

    // 도어수리 = 출장 업종 → 고정 사업장 위치블록 미노출(PATCH-07)
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      DOOR_TREATMENTS.find((t) => t.id === program?.id) ||
      DOOR_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `도어수리 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const sym = formatSymptom(symptom);
    const pt = getPartNote(part);
    const ctx = { symptom: sym, part: part || "" };
    const systemPrompt = buildSystemPrompt(region, treatment, ctx);

    const writtenSections = new Set();
    const sections = [];

    for (const sec of DOOR_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim());   // 정보박스 자체가 시각 구분 → 사진 미부착
        continue;
      }

      const userPrompt = buildUserPrompt(region, treatment, sec.key, ctx);
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
      body = body.replace(/!?\[[^\]]*\]/g, "").trim();
      body = body.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
      // closing 섹션이 화자 인사를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*도어\s*수리\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }

      const slot = DOOR_SECTION_PHOTO[sec.key];
      if (slot) body += "\n\n[이미지: " + getSectionAlt(region, treatment, slot) + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);
    content = removeDupParagraphs(content);
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(region, kw);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 출장업종 빈값 → 미삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    // 제목 2단 분기
    const title = buildTitle(region, treatment);
    const imageAlts = getImageAlts(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    const rgKwCount = region
      ? (content.match(new RegExp(`${region}\\s*${kw}`, "g")) || []).length
      : 0;
    console.log(`[QC][door] 메뉴(${kw}): kw ${kwCount} / 지역+kw 결합 ${rgKwCount} (3 이하 정상)`);
    console.log(`[QC][door] 글자수: ${content.length}`);
    console.log(`[QC][door] 증상: ${sym || "미입력"} / 부품군: ${pt ? pt.label : "미입력"}`);
    console.log(`[QC][door] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "door",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[door] 오류:", err);
    return res.status(500).json({ error: err.message || "도어수리 글 생성 오류" });
  }
}
