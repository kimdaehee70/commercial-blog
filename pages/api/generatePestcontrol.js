// ============================================================
// pages/api/generatePestcontrol.js — 방역(pestcontrol) 엔진 핸들러
// 정보형 + 서비스범위 설명형({region} 방역 업체 1인칭).
// 후기형·내돈내산·고객사례·추천·보장·박멸 보장 금지.
// engineBootstrap에서 register("pestcontrol", handlePestcontrol)로 편입.
// 복제 베이스: generateCleaning.js (섹션루프형). 기존 업종 무수정.
// 출장·현장방문 업종 → useApt 미사용(APT 분기 제거), 위치블록 빈값 미삽입.
// ============================================================

import OpenAI from "openai";
import {
  PESTCONTROL_TREATMENTS,
  PESTCONTROL_INFO_BLOCKS,
} from "../../lib/pestcontrol-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/pestcontrol-prompts";
import { PESTCONTROL_FLOW } from "../../lib/pestcontrol-playConfig";
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
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|방역해보니)[,\s]*/g, "");
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
    `#${rg}방역`, `#${rg}방역업체`,
    `#${k}`, `#${rg}해충방역`, `#${rg}방역상담`,
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

// ── [DEAD CODE · V3] 화자 도입 — 고정 인사 제거로 미호출. 참조용 보존.
function buildAgentIntro(region) {
  return `안녕하세요. ${region} 방역 업체입니다.\n오늘은 ${region} 방역을 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (id/cat 기준) ──────────
function pickInfoBlock(treatment) {
  const id = treatment.id;
  if (id === "pc_roach") return PESTCONTROL_INFO_BLOCKS.roach;
  if (id === "pc_ant") return PESTCONTROL_INFO_BLOCKS.ant;
  if (id === "pc_insect") return PESTCONTROL_INFO_BLOCKS.prevent;
  if (id === "pc_manage") return PESTCONTROL_INFO_BLOCKS.prevent;
  // 공간방역(가정/원룸/상가/음식점) → 예방 체크리스트
  return PESTCONTROL_INFO_BLOCKS.prevent;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   {region} 치환. useApt 미사용 업종 → aptName/livingArea 패턴은 region fallback.
function buildTitleLegacy(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  // aptName/livingArea 토큰 쓰는 패턴은 제외(빈 제목 방지) — 방역은 APT 미사용
  const usable = patterns.filter((p) => {
    if (/\{aptName\}/.test(p)) return false;
    if (/\{livingArea\}/.test(p)) return false;
    return true;
  });
  const pool = usable.length ? usable : patterns;
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick
    .replace(/\{region\}/g, region)
    .replace(/\{aptName\}/g, "")
    .replace(/\{livingArea\}/g, region);
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

// ── 제목 엔진 v1 (titleEngine) — Intent 축 제목. 실패 시 기존 로직 폴백.
//   ★ buildTitle() 한정 교체. Runtime/Data/Prompt/SCENE_SPINE 무변경.
function buildTitle(region, treatment) {
  const _t = buildIntentTitleOrNull(region, treatment, "pestcontrol");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handlePestcontrol(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
    } = req.body;
    // 방역 = 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      PESTCONTROL_TREATMENTS.find((t) => t.id === program?.id) ||
      PESTCONTROL_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `방역 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const effRegion = region;
    const systemPrompt = buildSystemPrompt(effRegion, treatment);

    const PHOTO_ALT = {
      intro: "방역 서비스 범위 안내", axis1: "방역 범위 안내", axis2: "주요 해충 종류 안내",
      axis3: "방역 진행 순서 안내", axis4: "방역 관리방법 안내", closing: "방역 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of PESTCONTROL_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim() + "\n\n[이미지: 관리방법 안내]");
        continue;
      }

      const userPrompt = buildUserPrompt(effRegion, treatment, sec.key);
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
      // closing 섹션이 화자 인사("안녕하세요 …방역 업체입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*방역\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "방역 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);   // 후기·체험 톤 완화
    content = removeDupParagraphs(content);
    // V3 Opening: intro 섹션(GPT 상황형)이 도입 담당. 고정 buildAgentIntro 제거.
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(effRegion, kw);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 해시태그 직전 삽입(빈값이면 미삽입)
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(effRegion, treatment);
    const imageAlts = getImageAlts(effRegion, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    console.log(`[QC][pestcontrol] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][pestcontrol] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "pestcontrol",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[pestcontrol] 오류:", err);
    return res.status(500).json({ error: err.message || "방역 글 생성 오류" });
  }
}
