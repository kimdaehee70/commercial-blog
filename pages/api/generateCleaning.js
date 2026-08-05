// ============================================================
// pages/api/generateCleaning.js — 입주청소(cleaning) 엔진 핸들러
// 정보형 + 업체선택 가이드형({region} 입주청소 업체 1인칭).
// 후기형·내돈내산·추천·보장·최저가 금지.
// engineBootstrap에서 register("cleaning", handleCleaning)로 편입.
// 복제 베이스: generateRealestate.js (섹션루프형). 기존 업종 무수정.
// ============================================================

import OpenAI from "openai";
import {
  CLEANING_TREATMENTS,
  CLEANING_INFO_BLOCKS,
  APT_DATA,
} from "../../lib/cleaning-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/cleaning-prompts";
import { CLEANING_FLOW } from "../../lib/cleaning-playConfig";
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

// ── 금칙어 제거(과장·보장·추천·후기) ───────────
//   ★ [세션60] FORBIDDEN = HARD 계층만. 서술 어휘(SOFT_BANNED)는 여기서 절대 삭제하지 않는다.
//     서술 어휘를 부분 문자열로 지우면 "반출되었는지 확인합니다" → "반출되었는지 ." 로 문장이 잘린다.
//   ★ 삭제 후 생기는 이중 공백 / 공백+마침표 잔재를 정리한다.
function stripForbidden(text) {
  let t = text;
  for (const w of FORBIDDEN) {
    t = t.split(w).join("");
  }
  ["따라서", "결론적으로", "정리하면"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  // 삭제 잔재 정리
  t = t.replace(/[ \t]{2,}/g, " ");
  t = t.replace(/\s+([.,!?])/g, "$1");
  t = t.replace(/([.,])\1+/g, "$1");
  return t;
}

// ── 문장 잘림 감지 (삭제 잔재 회귀 감시용 로그) ──
function countBrokenSentences(text) {
  return (text.match(/[가-힣]\s+[.]/g) || []).length;
}

// ── 후기·체험담 단정 완화 ───────────────────────
//   "직접 청소해보니/제가 해보니" 류 1인칭 체험 → 정보 안내 톤으로.
function softenReviewTone(text) {
  let t = text;
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|청소해보니)[,\s]*/g, "");
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
function buildHashtags(region, kw, aptName) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const ap = (aptName || "").replace(/\s+/g, "");
  const tags = [
    ap ? `#${rg}${ap}${k}` : `#${rg}${k}`,
    `#${rg}입주청소`, `#${rg}청소업체`,
    `#${k}`, ap ? `#${ap}` : `#${rg}이사청소`, `#${rg}입주청소상담`,
  ];
  // ★ [세션60] 중복 제거 — kw가 "이사청소"일 때 `#${rg}${k}` 와 `#${rg}이사청소` 가 동일해진다.
  const uniq = [...new Set(tags.filter(Boolean))];
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

// ── 목적격 조사 처리 (받침 유무) ──────────────
function formatObjectName(name) {
  const n = (name || "").trim();
  if (!n) return { full: "", josa: "" };
  const last = n.charCodeAt(n.length - 1);
  const hasJong = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return { full: n + (hasJong ? "을" : "를"), josa: hasJong ? "을" : "를" };
}

// ── 화자 도입 (입주청소 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, aptName) {
  if (aptName) {
    return `안녕하세요. ${region} 입주청소 업체입니다.\n오늘은 ${aptName} 입주청소를 안내해 드리겠습니다.`;
  }
  return `안녕하세요. ${region} 입주청소 업체입니다.\n오늘은 ${region} 입주청소를 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "신축청소") return CLEANING_INFO_BLOCKS.newbuild;
  if (cat === "구축청소") return CLEANING_INFO_BLOCKS.oldbuild;
  if (cat === "비용") return CLEANING_INFO_BLOCKS.cost;
  if (cat === "체크리스트") return CLEANING_INFO_BLOCKS.check;
  if (cat === "입주청소" || cat === "이사청소" || treatment.useApt) return CLEANING_INFO_BLOCKS.movein;
  return CLEANING_INFO_BLOCKS.check;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 지역키 추론 (region 문자열 → APT_DATA 키) ──
function resolveRegionKey(region) {
  const r = (region || "").replace(/\s+/g, "");
  for (const [key, e] of Object.entries(APT_DATA)) {
    if (r.includes(e.label) || r.includes(e.region.replace(/\s+/g, ""))) return key;
  }
  return null;
}

// ── aptName 선택 (useApt 메뉴 + 지역 풀 존재 시 랜덤) ──
function resolveAptName(treatment, region, bodyAptName) {
  if (!treatment.useApt) return { aptName: "", meta: null };
  const key = resolveRegionKey(region);
  const pool = key && APT_DATA[key] ? APT_DATA[key].apts : [];
  const names = pool.map((a) => (typeof a === "string" ? a : a.name));
  let pick = (bodyAptName || "").trim();
  if (!pick) {
    if (!names.length) return { aptName: "", meta: null };
    pick = names[Math.floor(Math.random() * names.length)];
  }
  const meta = pool.find((a) => (typeof a === "string" ? a : a.name) === pick) || null;
  return { aptName: pick, meta: (meta && typeof meta === "object") ? meta : null };
}

// ── 제목 생성 ───────────────────────────────────
//   {region}/{aptName}/{livingArea} 치환. livingArea 빈값 패턴은 region fallback.
function buildTitleLegacy(region, treatment, aptName, aptMeta) {
  const patterns = treatment.titlePatterns || [];
  const livingArea = (aptMeta && aptMeta.livingArea) || "";
  // aptName/livingArea 없는데 해당 토큰 쓰는 패턴은 제외(빈 제목 방지)
  const usable = patterns.filter((p) => {
    if (/\{aptName\}/.test(p) && !aptName) return false;
    if (/\{livingArea\}/.test(p) && !livingArea) return false;
    return true;
  });
  const pool = usable.length ? usable : patterns;
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick
    .replace(/\{region\}/g, region)
    .replace(/\{aptName\}/g, aptName || "")
    .replace(/\{livingArea\}/g, livingArea || region);
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

// ── 제목 엔진 v1 (titleEngine) — Intent 축 제목. 실패 시 기존 로직 폴백.
//   ★ buildTitle() 한정 교체. Runtime/Data/Prompt/SCENE_SPINE 무변경.
function buildTitle(region, treatment, aptName, aptMeta) {
  const _t = buildIntentTitleOrNull(region, treatment, "cleaning");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment, aptName, aptMeta);
}

export default async function handleCleaning(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      aptName: bodyAptName,
    } = req.body;
    // 청소업 = 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      CLEANING_TREATMENTS.find((t) => t.id === program?.id) ||
      CLEANING_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `입주청소 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const { aptName, meta: aptMeta } = resolveAptName(treatment, region, bodyAptName);
    // 단지 district가 있으면 region을 단지 소재 동으로 정밀화
    const baseRegionKey = resolveRegionKey(region);
    const regionDistrict = (aptMeta && aptMeta.district)
      ? `${(APT_DATA[baseRegionKey]?.region) || region} ${aptMeta.district}`.trim()
      : region;
    const effRegion = aptName ? regionDistrict : region;
    const systemPrompt = buildSystemPrompt(effRegion, treatment, aptName, aptMeta);

    const PHOTO_ALT = {
      intro: "입주청소 범위 안내", axis1: "청소 범위 안내", axis2: "비용 영향 요소 안내",
      axis3: "진행 순서 안내", axis4: "예약 전 확인 안내", closing: "입주청소 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of CLEANING_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim() + "\n\n[이미지: 체크포인트 안내]");
        continue;
      }

      const userPrompt = buildUserPrompt(effRegion, treatment, sec.key, aptName);
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
      // closing 섹션이 화자 인사("안녕하세요 …입주청소 업체입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*입주청소\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "입주청소 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);   // 후기·체험 톤 완화
    content = removeDupParagraphs(content);
    content = buildAgentIntro(effRegion, aptName) + "\n\n" + content;
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(effRegion, kw, aptName);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 해시태그 직전 삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(effRegion, treatment, aptName, aptMeta);
    const imageAlts = getImageAlts(effRegion, treatment, aptName);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    console.log(`[QC][cleaning] 메뉴(${kw}) aptName(${aptName || "-"}): kw ${kwCount}`);
    console.log(`[QC][cleaning] 글자수: ${content.length}`);
    console.log(`[QC][cleaning] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "cleaning",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      aptName: aptName || null,
      seoScore: null,
    });
  } catch (err) {
    console.error("[cleaning] 오류:", err);
    return res.status(500).json({ error: err.message || "입주청소 글 생성 오류" });
  }
}
