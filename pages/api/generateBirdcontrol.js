// ============================================================
// pages/api/generateBirdcontrol.js — 비둘기퇴치(birdcontrol) 엔진 핸들러
// 정보형 + 차단·예방 안내형({region} 비둘기퇴치 업체 1인칭).
// 후기형·시공일지·내돈내산·고객사례·추천·보장·박멸·비용유도 금지.
// 포획·독극물·살처분·천적·민원·행정처분 전면 제외.
// engineBootstrap에서 register("birdcontrol", handleBirdcontrol)로 편입.
// 복제 베이스: generateBuildingclean.js (섹션루프형). 출장업종 → APT 미사용(useApt=false 전메뉴).
//   위치블록 _locStore={} 빈값 → 미삽입(PATCH-07).
// ============================================================

import OpenAI from "openai";
import {
  BIRDCONTROL_TREATMENTS,
  BIRDCONTROL_INFO_BLOCKS,
} from "../../lib/birdcontrol-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/birdcontrol-prompts";
import { BIRDCONTROL_FLOW } from "../../lib/birdcontrol-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
import { buildIntentTitle } from "../../lib/titleEngine.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 공백·조사 정리 ─────────────────────
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  return t.trim();
}

// ── 금칙어 제거(과장·보장·추천·후기·제외항목) ───────────
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
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|설치해보니)[,\s]*/g, "");
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
    `#${rg}비둘기퇴치`, `#${rg}조류퇴치`,
    `#${k}`, `#${rg}비둘기차단`, `#${rg}비둘기퇴치망`,
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

// ── 화자 도입 (비둘기퇴치 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region) {
  return `안녕하세요. ${region} 비둘기퇴치 업체입니다.\n오늘은 ${region} 비둘기퇴치를 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
//   ★ [v-menu 2026-07-27] id 하드코딩 + 데드 cat 분기 → 데이터 조회 전환(승인 범위: 이 함수만).
//     기존 cat 분기는 그룹명("차단시설"·"건물퇴치"·"공간별퇴치"·"관리방법")과 비교했으나
//     실제 CATS는 메뉴명이라 영구 불일치 → dropping·hygiene·recurrence·checklist 4블록 데드였다.
//     조회 순서: treatment.infoKey → treatment.cat → 기본(cause). infoKey 부여로 8블록 전부 가동.
function pickInfoBlock(treatment) {
  return (
    BIRDCONTROL_INFO_BLOCKS[treatment.infoKey] ||
    BIRDCONTROL_INFO_BLOCKS[treatment.cat] ||
    BIRDCONTROL_INFO_BLOCKS.cause
  );
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   {region} 치환. (useApt=false → aptName/livingArea 미사용)
function buildTitle(region, treatment) {
  // titleEngine v1 — Intent 축 제목. 실패 시 data.js titlePatterns 폴백(엔진 내부 처리).
  return buildIntentTitle(region, treatment, "birdcontrol");
}

export default async function handleBirdcontrol(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
    } = req.body;
    // 비둘기퇴치 = 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      BIRDCONTROL_TREATMENTS.find((t) => t.id === program?.id) ||
      BIRDCONTROL_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `비둘기퇴치 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPrompt(region, treatment);

    const PHOTO_ALT = {
      intro: "비둘기퇴치 차단 범위 안내", axis1: "차단 범위 안내", axis2: "발생 원인 안내",
      axis3: "작업 진행 안내", axis4: "작업 후 확인 안내", closing: "비둘기퇴치 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of BIRDCONTROL_FLOW) {
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
      // closing 섹션이 화자 인사를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*비둘기퇴치\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "비둘기퇴치 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);   // 후기·체험 톤 완화
    content = removeDupParagraphs(content);
    content = buildAgentIntro(region) + "\n\n" + content;
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
    console.log(`[QC][birdcontrol] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][birdcontrol] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "birdcontrol",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[birdcontrol] 오류:", err);
    return res.status(500).json({ error: err.message || "비둘기퇴치 글 생성 오류" });
  }
}
