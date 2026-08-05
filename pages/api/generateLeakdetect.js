// ============================================================
// pages/api/generateLeakdetect.js — 누수탐지(leakdetect) 엔진 핸들러
// 정보형 + 원인·절차·장비 안내 가이드형({region} 누수탐지 업체 1인칭).
// 후기형·내돈내산·시공후기·만족도·추천·보장·최저가·100%해결 금지.
// engineBootstrap에서 register("leakdetect", handleLeakdetect)로 편입.
// 복제 베이스: generateTankclean.js (섹션루프형). 기존 업종 무수정.
// ★ 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출(PATCH-07 _locStore={}).
// ============================================================

import OpenAI from "openai";
import {
  LEAKDETECT_TREATMENTS,
  LEAKDETECT_INFO_BLOCKS,
  APT_DATA,
} from "../../lib/leakdetect-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/leakdetect-prompts";
import { LEAKDETECT_FLOW } from "../../lib/leakdetect-playConfig";
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
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|탐지해보니)[,\s]*/g, "");
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
    `#${rg}누수탐지`, `#${rg}누수`,
    `#${k}`, ap ? `#${ap}` : `#${rg}배관누수`, `#${rg}누수탐지상담`,
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

// ── 목적격 조사 처리 (받침 유무) ──────────────
function formatObjectName(name) {
  const n = (name || "").trim();
  if (!n) return { full: "", josa: "" };
  const last = n.charCodeAt(n.length - 1);
  const hasJong = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return { full: n + (hasJong ? "을" : "를"), josa: hasJong ? "을" : "를" };
}

// ── 화자 도입 (누수탐지 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, aptName) {
  if (aptName) {
    return `안녕하세요. ${region} 누수탐지 업체입니다.\n오늘은 ${aptName} 누수탐지를 안내해 드리겠습니다.`;
  }
  return `안녕하세요. ${region} 누수탐지 업체입니다.\n오늘은 ${region} 누수탐지를 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
//   data cat 8종: 누수탐지/아파트누수/화장실누수/천장누수/수도배관누수/누수탐지비용/누수보험처리/아래층누수
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "누수보험처리") return LEAKDETECT_INFO_BLOCKS.insurance;
  if (cat === "누수탐지비용") return LEAKDETECT_INFO_BLOCKS.scope;
  if (cat === "수도배관누수") return LEAKDETECT_INFO_BLOCKS.equipment;
  if (cat === "아래층누수") return LEAKDETECT_INFO_BLOCKS.check;
  if (cat === "화장실누수" || cat === "천장누수") return LEAKDETECT_INFO_BLOCKS.cause;
  if (cat === "아파트누수") return LEAKDETECT_INFO_BLOCKS.process;
  if (cat === "누수탐지" || treatment.useApt) return LEAKDETECT_INFO_BLOCKS.process;
  return LEAKDETECT_INFO_BLOCKS.check;
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
function buildTitleLegacy(region, treatment, aptName, aptMeta) {
  const patterns = treatment.titlePatterns || [];
  const livingArea = (aptMeta && aptMeta.livingArea) || "";
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
  const _t = buildIntentTitleOrNull(region, treatment, "leakdetect");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment, aptName, aptMeta);
}

export default async function handleLeakdetect(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      aptName: bodyAptName,
    } = req.body;
    // 누수탐지 = 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      LEAKDETECT_TREATMENTS.find((t) => t.id === program?.id) ||
      LEAKDETECT_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `누수탐지 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const { aptName, meta: aptMeta } = resolveAptName(treatment, region, bodyAptName);
    const baseRegionKey = resolveRegionKey(region);
    const regionDistrict = (aptMeta && aptMeta.district)
      ? `${(APT_DATA[baseRegionKey]?.region) || region} ${aptMeta.district}`.trim()
      : region;
    const effRegion = aptName ? regionDistrict : region;
    const systemPrompt = buildSystemPrompt(effRegion, treatment, aptName, aptMeta);

    const PHOTO_ALT = {
      intro: "누수탐지 범위 안내", axis1: "누수 원인·범위 안내", axis2: "탐지 절차 안내",
      axis3: "탐지 장비 안내", axis4: "탐지 후 확인 안내", closing: "누수탐지 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of LEAKDETECT_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim() + "\n\n[이미지: 점검 항목 안내]");
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
      // closing 섹션이 화자 인사 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*누수탐지\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "누수탐지 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);
    content = removeDupParagraphs(content);
    content = buildAgentIntro(effRegion, aptName) + "\n\n" + content;
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(effRegion, kw, aptName);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 출장업종 빈값 → 미삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(effRegion, treatment, aptName, aptMeta);
    const imageAlts = getImageAlts(effRegion, treatment, aptName);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    console.log(`[QC][leakdetect] 메뉴(${kw}) aptName(${aptName || "-"}): kw ${kwCount}`);
    console.log(`[QC][leakdetect] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "leakdetect",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      aptName: aptName || null,
      seoScore: null,
    });
  } catch (err) {
    console.error("[leakdetect] 오류:", err);
    return res.status(500).json({ error: err.message || "누수탐지 글 생성 오류" });
  }
}
