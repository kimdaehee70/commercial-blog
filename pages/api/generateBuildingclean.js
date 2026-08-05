// ============================================================
// pages/api/generateBuildingclean.js — 건물청소(buildingclean) 엔진 핸들러
// 정보형 + 건물 유지관리 안내형({region} 건물청소 업체 1인칭).
// 후기형·내돈내산·고객사례·추천·보장·최저가·비용유도 금지.
// engineBootstrap에서 register("buildingclean", handleBuildingclean)로 편입.
// 복제 베이스: generateCleaning.js (섹션루프형). 출장업종 → APT 미사용(useApt=false 전메뉴).
//   위치블록 _locStore={} 빈값 → 미삽입(PATCH-07).
// ============================================================

import OpenAI from "openai";
import {
  BUILDINGCLEAN_TREATMENTS,
  BUILDINGCLEAN_INFO_BLOCKS,
  getInfoBlocks,
} from "../../lib/buildingclean-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/buildingclean-prompts";
import { BUILDINGCLEAN_FLOW } from "../../lib/buildingclean-playConfig";
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
// ── strip 제외 어휘 (부분 문자열 삭제 시 정상 문장을 파괴) ──
//   ★ [세션60] stripForbidden 은 단어 경계 없이 부분 문자열을 삭제한다.
//     아래 어휘는 정상 단어의 일부로 등장하므로 삭제 대상에서 뺀다.
//       "순위"  → "처리 우선순위를 정합니다" → "처리 우선를 정합니다" (파괴)
//       "최고"  → "최고령/최고점" 등 (파괴). 단 "업계 최고"는 HARD 유지.
//       "완벽"  → 문장 중간 삭제 시 어색한 잔재.
//   프롬프트 [금지] 목록에는 그대로 남아 있어 억제력은 유지된다.
const STRIP_SKIP = new Set(["순위", "최고", "완벽", "1위"]);

function stripForbidden(text) {
  let t = text;
  for (const w of FORBIDDEN) {
    if (STRIP_SKIP.has(w)) continue;   // 부분 문자열 파괴 방지
    t = t.split(w).join("");
  }
  ["따라서", "결론적으로", "정리하면"].forEach((w) => {
    t = t.replace(new RegExp(`(^|\\n)\\s*${w}[,\\s]*`, "g"), "$1");
  });
  // 삭제 잔재 정리 (이중 공백 / 공백+구두점 / 중복 구두점)
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
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}`,
    `#${rg}건물청소`, `#${rg}청소업체`,
    `#${k}`, `#${rg}정기청소`, `#${rg}건물관리`,
  ];
  // ★ [세션60] 중복 제거 — kw가 "건물청소"면 `#${rg}${k}` 와 `#${rg}건물청소` 가 동일해진다.
  //   실발행 확인: '#상봉동건물청소' 2회 노출.
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

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
// [V4 배선 2026-07-27] cat 전용 블록 세트 경유.
//   기존: BUILDINGCLEAN_INFO_BLOCKS 직접 참조 → 외벽청소 글에 실내 공용부(로비·복도·
//         화장실·엘리베이터) 블록이 삽입되어 업종 전문성이 깨졌다(실측 확인).
//   변경: getInfoBlocks(cat)로 cat 전용 세트를 받고, 키 미정의 시 공통 세트로 축퇴.
//         cat 미정의 업종(건물청소·사무실청소 등)은 공통 세트 그대로 → 회귀 0.
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  const B = (typeof getInfoBlocks === "function" ? getInfoBlocks(cat) : null)
    || BUILDINGCLEAN_INFO_BLOCKS;
  const at = (key) => B[key] || BUILDINGCLEAN_INFO_BLOCKS[key];
  // cat 실측 매칭 (세션55 평면 전환 후 8 cat = 8 메뉴)
  if (cat === "건물청소") return at("scope");
  if (cat === "사무실청소") return at("bytype");
  if (cat === "상가청소") return at("bytype");
  if (cat === "계단청소") return at("scope");
  if (cat === "정기청소") return at("periodic");
  if (cat === "준공청소") return at("process");
  if (cat === "외벽청소") return at("scope");   // 외벽 전용 scope(오염유형·공법) 삽입
  if (cat === "건물관리 체크리스트") return at("checkend");
  return at("prebook");
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   {region} 치환. (useApt=false → aptName/livingArea 미사용)
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
  const _t = buildIntentTitleOrNull(region, treatment, "buildingclean");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handleBuildingclean(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
    } = req.body;
    // 건물청소 = 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    // SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
    const _locStore = {};

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      BUILDINGCLEAN_TREATMENTS.find((t) => t.id === program?.id) ||
      BUILDINGCLEAN_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `건물청소 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPrompt(region, treatment);

    // [V4 2026-07-27] 사진 라벨 cat 분기 — 외벽 글에 "건물청소 범위 안내" 라벨이
    //   붙던 문제(실측). 그 외 cat은 기존 공통 라벨 유지(회귀 0).
    const PHOTO_ALT_COMMON = {
      intro: "건물청소 범위 안내", axis1: "청소 범위 안내", axis2: "작업 절차 안내",
      axis3: "정기관리 안내", axis4: "건물 유형별 관리 안내", closing: "건물청소 상담 안내",
    };
    const PHOTO_ALT_WALL = {
      intro: "외벽 오염 상태 확인", axis1: "외벽 마감재 확인", axis2: "고압세척 작업 절차",
      axis3: "외벽 작업 안전 통제", axis4: "건물 유형별 외벽 공법", closing: "외벽청소 상담 안내",
    };
    const PHOTO_ALT = treatment.cat === "외벽청소" ? PHOTO_ALT_WALL : PHOTO_ALT_COMMON;

    const writtenSections = new Set();
    const sections = [];

    for (const sec of BUILDINGCLEAN_FLOW) {
      if (writtenSections.has(sec.key)) continue;
      writtenSections.add(sec.key);

      // infoblock 섹션은 GPT 호출 없이 INFO_BLOCKS 삽입
      if (sec.key === "infoblock") {
        const block = renderInfoBlock(pickInfoBlock(treatment));
        if (block) sections.push(block.trim());   // 정보박스 자체가 시각 구분 → 사진 미부착
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
        body = body.replace(/^안녕하세요[^.\n]*건물청소\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "건물청소 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = softenReviewTone(content);   // 후기·체험 톤 완화
    content = removeDupParagraphs(content);
    // V3 Opening: intro 섹션(GPT 질문형)이 도입 담당. 고정 buildAgentIntro 제거.
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
    console.log(`[QC][buildingclean] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][buildingclean] 글자수: ${content.length}`);
    console.log(`[QC][buildingclean] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "buildingclean",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[buildingclean] 오류:", err);
    return res.status(500).json({ error: err.message || "건물청소 글 생성 오류" });
  }
}
