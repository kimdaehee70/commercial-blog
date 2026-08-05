// ============================================================
// pages/api/generateElectricrepair.js — 전기수리(electricrepair) 엔진 핸들러
// 정보형 + 생활전기 점검·교체 안내 가이드형({region} 전기수리 업체 1인칭).
// 후기형·작업일지형(다녀왔습니다·고쳐드렸습니다·출동했습니다·당일출동)·만족도·추천·보장·최저가·할인·순위·출장·24시 금지.
// engineBootstrap에서 register("electricrepair", handleElectricrepair)로 편입.
// 복제 베이스: generateHomefix.js 80% (섹션루프·출장업종 구조 동형) + plumbing 20%(안전 확인 톤). 기존 업종 무수정.
//   ★ 출장업종 → APT_DATA 전면 미사용(useApt 전부 false). region 문자열만. _locStore 빈값 분기(PATCH-07).
//   ★ 제목 region 중복 방어: 출장업종 → 단지 토큰 없음. {region} 1회만.
//   ★ closing 화자 재시작 방어: prompts closing 1줄 + 핸들러 인사 제거 2중.
//   ★ cat 8종 = INFO_BLOCK 8종 1:1. UNDEFINED 0 / 박제 0. (homefix STEP4 교훈)
//   ★ josa: buildAgentIntro 받침 판별 적용.
// ============================================================

import OpenAI from "openai";
import {
  ELECTRICREPAIR_TREATMENTS,
  ELECTRICREPAIR_INFO_BLOCKS,
} from "../../lib/electricrepair-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/electricrepair-prompts";
import { ELECTRICREPAIR_FLOW } from "../../lib/electricrepair-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 한글 받침 판별 조사 선택 (을/를) ───────────
function josa(word, withBatchim, withoutBatchim) {
  if (!word) return withoutBatchim;
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return withoutBatchim; // 한글 음절 아님
  return (c - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

// ── 후처리: 공백·조사 정리 ─────────────────────
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  return t.trim();
}

// ── 금칙어 제거(과장·보장·추천·후기·작업일지·할인유도) ───────────
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

// ── 후기·작업일지 단정 완화 ───────────────────────
function softenReviewTone(text) {
  let t = text;
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|교체해보니)[,\s]*/g, "");
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
    `#${rg}전기수리`,
    `#${rg}전기수리업체`, `#${k}`,
    `#${rg}누전점검`, `#${rg}생활전기`,
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

// ── 화자 도입 (전기수리 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, menu) {
  const j = josa(menu, "을", "를");
  return `안녕하세요. ${region} 전기수리 업체입니다.\n오늘은 ${menu}${j} 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat 기준, 8종 1:1) ──────────
//   ★ cat명 = ELECTRICREPAIR_CATS 8종과 정확히 일치해야 UNDEFINED 0. (homefix STEP4: cat 오타가 UNDEFINED 원인)
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "누전점검") return ELECTRICREPAIR_INFO_BLOCKS.leak;
  if (cat === "차단기점검") return ELECTRICREPAIR_INFO_BLOCKS.breaker_check;
  if (cat === "차단기교체") return ELECTRICREPAIR_INFO_BLOCKS.breaker_swap;
  if (cat === "콘센트교체") return ELECTRICREPAIR_INFO_BLOCKS.outlet;
  if (cat === "스위치교체") return ELECTRICREPAIR_INFO_BLOCKS.switch;
  if (cat === "LED교체") return ELECTRICREPAIR_INFO_BLOCKS.led;
  if (cat === "센서등교체") return ELECTRICREPAIR_INFO_BLOCKS.sensor;
  if (cat === "전등안들어옴") return ELECTRICREPAIR_INFO_BLOCKS.nolight;
  return ELECTRICREPAIR_INFO_BLOCKS.leak;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   ★ 출장업종: 단지 토큰 없음. {region} 1회 치환만. region 중복 차단.
function buildTitle(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

export default async function handleElectricrepair(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      address, map_guide, transit, building_desc, parking_info, // 위치 5필드(PATCH-07)
    } = req.body;
    // 전기수리 = 출장/현장방문 업종. 발행코치에서 위치 5필드 채워 보내면 「찾아오시는 길」 삽입,
    // 일반글쓰기(빈값)면 미삽입(부작용 0). SOP PATCH-07.
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      ELECTRICREPAIR_TREATMENTS.find((t) => t.id === program?.id) ||
      ELECTRICREPAIR_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `전기수리 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPrompt(region, treatment);

    const PHOTO_ALT = {
      intro: "전기수리 점검 항목 안내", cause: "발생 원인 안내", area: "점검 위치·확인 안내",
      process: "진행 절차 안내", manage: "관리 방법 안내", closing: "전기수리 관리·안전 확인 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of ELECTRICREPAIR_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim() + "\n\n[이미지: 체크포인트 안내]");
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
      // closing 섹션이 화자 인사("안녕하세요 …전기수리 업체입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*전기수리\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "전기수리 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);   // 후기·작업일지 톤 완화
    content = removeDupParagraphs(content);
    content = buildAgentIntro(region, kw) + "\n\n" + content;
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(region, kw);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 해시태그 직전 삽입. 출장업종: 빈값이면 미삽입.
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(region, treatment);
    const imageAlts = getImageAlts(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    console.log(`[QC][electricrepair] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][electricrepair] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "electricrepair",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[electricrepair] 오류:", err);
    return res.status(500).json({ error: err.message || "전기수리 글 생성 오류" });
  }
}
