// ============================================================
// pages/api/generateTile.js — 타일시공(tile) 엔진 핸들러
// 정보형 + 출장 시공 안내형({region} 타일 시공 업체 1인칭).
// 후기형·내돈내산·고객사례·추천·보장·최저가·비용유도·수명약속 금지.
// engineBootstrap에서 register("tile", handleTile)로 편입.
//
// 복제 베이스: generatePaint.js (섹션루프형). Runtime/FLOW/Handler 구조 무변경.
// waterproof 대비 변경 1점:
//   ① 해시태그 어휘 — 타일 검색축(타일/시공/보수)으로 교체. dedup 는 동형 Set 유지.
//   판단 축(symptom=발견 / part=원인군)은 동일 계약.
//
// 출장 시공 업종 → 고정 사업장 「찾아오시는 길」 미노출.
//   SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
// ============================================================

import OpenAI from "openai";
import {
  TILE_TREATMENTS,
  TILE_INFO_BLOCKS,
  getInfoBlocks,
  formatSymptom,
  getPartNote,
} from "../../lib/tile-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  getSectionAlt,
  FORBIDDEN,
} from "../../lib/tile-prompts";
import { TILE_FLOW, TILE_SECTION_PHOTO } from "../../lib/tile-playConfig";
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
//     ("보장" → 보장하다 / "완벽" / "최고" / "1위" / "반영구"(영구 부분일치 방지)
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
//   ★ 메뉴명이 "시공/보수"로 끝나 `#{rg}{k}` 와 `#{rg}타일시공` 이 겹칠 수 있다 → Set 일괄 정리.
//   ★ [인수계 §4] 존재하지 않는 조합을 만들지 않는다 — 지역은 1축(작업지)만 결합한다.
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}`,
    `#${rg}타일시공`, `#${rg}타일공사`,
    `#${k}`, `#${rg}타일업체`, `#${rg}타일보수`,
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
//   → 메뉴 확장은 tile-data.js 단독 작업. 핸들러를 다시 열지 않는다.
function pickInfoBlock(t) {
  const B = (typeof getInfoBlocks === "function" ? getInfoBlocks(t.cat) : null)
    || TILE_INFO_BLOCKS;
  return B[t.infoKey] || B[t.cat] || TILE_INFO_BLOCKS.prebook;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   2단: ① titleEngine(Intent) → ② legacy titlePatterns
//   ★ tile 는 siteBlock 미사용(useSite:false) → 단지명 분기 없음.
//   ★ titleEngine 은 무수정. 분기는 buildTitle 전단에서만 한다.
function buildTitleLegacy(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pool = patterns.length ? patterns : [`{region} ${treatment.name}`];
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  return title.replace(/\s{2,}/g, " ").trim();
}

function buildTitle(region, treatment) {
  const _t = buildIntentTitleOrNull(region, treatment, "tile");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handleTile(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      symptom,                                   // 접수된 발견(들뜸·빈소리 등) — 미입력 시 무영향
      part,                                      // 원인군(bond·base·water·joint·height·large)
    } = req.body;

    // 타일시공 = 출장 시공 업종 → 고정 사업장 위치블록 미노출(PATCH-07)
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      TILE_TREATMENTS.find((t) => t.id === program?.id) ||
      TILE_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `타일시공 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const sym = formatSymptom(symptom);
    const pt = getPartNote(part);
    const ctx = { symptom: sym, part: part || "" };
    const systemPrompt = buildSystemPrompt(region, treatment, ctx);

    const writtenSections = new Set();
    const sections = [];

    for (const sec of TILE_FLOW) {
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
        body = body.replace(/^안녕하세요[^.\n]*타일\s*시공\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }

      const slot = TILE_SECTION_PHOTO[sec.key];
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
    console.log(`[QC][tile] 메뉴(${kw}): kw ${kwCount} / 지역+kw 결합 ${rgKwCount} (3 이하 정상)`);
    console.log(`[QC][tile] 글자수: ${content.length}`);
    console.log(`[QC][tile] 발견: ${sym || "미입력"} / 원인군: ${pt ? pt.label : "미입력"}`);
    console.log(`[QC][tile] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "tile",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[tile] 오류:", err);
    return res.status(500).json({ error: err.message || "타일시공 글 생성 오류" });
  }
}
