// ============================================================
// pages/api/generateSewer.js — 하수구막힘(sewer) 엔진 핸들러
// 정보형 + 원인·점검·작업절차·예방 안내 가이드형({region} 하수구막힘 업체 1인칭).
// 후기형·체험형·감사합니다 고객님·추천·즉시해결·당일해결·확실히해결·완벽해결·최저가·1등업체 금지.
// engineBootstrap에서 register("sewer", handleSewer)로 편입.
// 복제 베이스: generateLeakdetect.js (섹션루프형). 기존 업종 무수정.
// ★ APT_DATA 미사용 — 아파트명 강제 없음. region 문자열만 사용.
// ★ 출장/현장출동 업종 → 고정 사업장 「찾아오시는 길」 미노출(PATCH-07 _locStore={}).
// ============================================================

import OpenAI from "openai";
import {
  SEWER_TREATMENTS,
  SEWER_INFO_BLOCKS,
} from "../../lib/sewer-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/sewer-prompts";
import { SEWER_FLOW } from "../../lib/sewer-playConfig";
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

// ── 금칙어 제거(과장·보장·추천·후기·즉시당일) ───────────
function stripForbidden(text) {
  let t = text;
  for (const w of FORBIDDEN) {
    t = t.split(w).join("");
  }
  ["따라서", "결론적으로", "정리하면"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  return t;
}

// ── 후기·체험담 단정 완화 ───────────────────────
function softenReviewTone(text) {
  let t = text;
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|작업해보니)[,\s]*/g, "");
  t = t.replace(/(저희가\s*)?직접\s*(해봤더니|해보니)[,\s]*/g, "");
  return t;
}

// ── 중간 해시태그 제거 ──────────────────────────
function stripMidHashtags(text) {
  return text.replace(/(^|\s)#[^\s#]+/g, "$1").trim();
}

// ── 사진 placeholder 박스 (1줄 간소화) ──────────
function applyPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) =>
    `\n📷 사진: ${String(alt || "").trim()} (업로드 후 이 줄 삭제)\n`
  );
  return t.replace(/\n{3,}/g, "\n\n");
}

// ── 마무리 해시태그 ─────────────────────────────
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}`,
    `#${rg}하수구막힘`, `#${rg}하수구`,
    `#${k}`, `#${rg}배관막힘`, `#${rg}하수구막힘상담`,
  ];
  return "\n\n" + tags.filter(Boolean).join(" ");
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

// ── 화자 도입 (하수구막힘 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, kw) {
  return `안녕하세요. ${region} 하수구막힘 업체입니다.\n오늘은 ${region} ${kw}를 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
//   data cat 10종: 하수구막힘/싱크대막힘/변기막힘/세면대막힘/배수구막힘/
//                  하수구역류/하수구악취/하수구고압세척/배관내시경/횡주관청소
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "하수구악취") return SEWER_INFO_BLOCKS.odor;
  if (cat === "하수구고압세척" || cat === "횡주관청소") return SEWER_INFO_BLOCKS.scope;
  if (cat === "배관내시경") return SEWER_INFO_BLOCKS.equipment;
  if (cat === "하수구역류") return SEWER_INFO_BLOCKS.check;
  if (cat === "싱크대막힘" || cat === "변기막힘" || cat === "세면대막힘" || cat === "배수구막힘")
    return SEWER_INFO_BLOCKS.cause;
  if (cat === "하수구막힘") return SEWER_INFO_BLOCKS.process;
  return SEWER_INFO_BLOCKS.check;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 (APT 미사용 — region 치환만) ──────
function buildTitleLegacy(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pool = patterns.length ? patterns : [`{region} ${treatment.name}`];
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

// ── 제목 엔진 v1 (titleEngine) — Intent 축 제목. 실패 시 기존 로직 폴백.
//   ★ buildTitle() 한정 교체. Runtime/Data/Prompt/SCENE_SPINE 무변경.
function buildTitle(region, treatment) {
  const _t = buildIntentTitleOrNull(region, treatment, "sewer");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handleSewer(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
    } = req.body;
    // 하수구막힘 = 출장/현장출동 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      SEWER_TREATMENTS.find((t) => t.id === program?.id) ||
      SEWER_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `하수구막힘 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPrompt(region, treatment);

    const PHOTO_ALT = {
      intro: "하수구막힘 작업 범위 안내", axis1: "막힘 발생 원인 안내", axis2: "작업 절차 안내",
      axis3: "작업 장비 안내", axis4: "작업 후 확인 안내", closing: "하수구막힘 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of SEWER_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim() + "\n\n[이미지: 점검 항목 안내]");
        continue;
      }

      const userPrompt = buildUserPrompt(region, treatment, sec.key);
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
      // closing 섹션이 화자 인사 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*하수구막힘\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "하수구막힘 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);
    content = removeDupParagraphs(content);
    content = buildAgentIntro(region, kw) + "\n\n" + content;
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(region, kw);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 출장업종 빈값 → 미삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(region, treatment);
    const imageAlts = getImageAlts(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    console.log(`[QC][sewer] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][sewer] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "sewer",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[sewer] 오류:", err);
    return res.status(500).json({ error: err.message || "하수구막힘 글 생성 오류" });
  }
}
