// ============================================================
// pages/api/generateFilm.js — 인테리어필름(film) 엔진 핸들러
// 정보형 + 시공 안내형({region} 인테리어필름 시공 업체 1인칭).
// 후기형·내돈내산·고객사례·추천·보장·최저가·비용유도 금지.
// engineBootstrap에서 register("film", handleFilm)로 편입.
//
// 복제 베이스: generateFlooring.js (섹션루프형). Runtime/FLOW/Handler 구조 무변경.
// 장판 대비 변경 1점:
//   ③ 판단 축 교체 — thickness(두께) → surface(표면) + baseGrade(하지 상태)
//      필름은 결과를 가르는 것이 원단이 아니라 붙이기 전 면 상태다.
//      두 값 모두 미입력 시 무영향(기존 흐름 유지).
//   ①② siteBlock·제목 3단 분기는 flooring과 동일.
//
// 출장/현장방문 업종 → 고정 사업장 「찾아오시는 길」 미노출.
//   SOP PATCH-07: 위치 5필드 빈값이면 locationBlock 미삽입(부작용 0).
// ============================================================

import OpenAI from "openai";
import {
  FILM_TREATMENTS,
  FILM_INFO_BLOCKS,
  getInfoBlocks,
  formatMaterial,
} from "../../lib/film-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  getSectionAlt,
  hasFacts,
  FORBIDDEN,
} from "../../lib/film-prompts";
import { FILM_FLOW, FILM_SECTION_PHOTO } from "../../lib/film-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
import { parseSite, buildSiteTitleOrNull, insertSiteBeforeHashtags } from "../../lib/siteBlock.js";
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
//   단지명은 태그에 쓰지 않는다(현장 식별 노출 최소화 — PHILOSOPHY 원칙1 정합).
//   ★ 메뉴명이 "필름"으로 끝나 `#{rg}{k}` 와 `#{rg}필름` 이 겹칠 수 있다 → Set 일괄 정리.
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}${k}`,
    `#${rg}인테리어필름`, `#${rg}필름시공`,
    `#${k}`, `#${rg}필름`, `#${rg}가구리폼`,
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
//   → 메뉴 확장은 film-data.js 단독 작업. 핸들러를 다시 열지 않는다.
function pickInfoBlock(t) {
  const B = (typeof getInfoBlocks === "function" ? getInfoBlocks(t.cat) : null)
    || FILM_INFO_BLOCKS;
  return B[t.infoKey] || B[t.cat] || FILM_INFO_BLOCKS.prebook;
}

function renderInfoBlock(block) {
  if (!block) return "";
  const lines = [`\n[ ${block.title} ]`];
  for (const it of block.items) lines.push(`· ${it}`);
  return lines.join("\n") + "\n";
}

// ── 제목 생성 ───────────────────────────────────
//   3단: ① siteBlock(단지명 보유) → ② titleEngine(Intent) → ③ legacy titlePatterns
//   ★ titleEngine 은 무수정. 분기는 buildTitle 전단에서만 한다.
function buildTitleLegacy(region, treatment) {
  const patterns = treatment.titlePatterns || [];
  const pool = patterns.length ? patterns : [`{region} ${treatment.name}`];
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  return title.replace(/\s{2,}/g, " ").trim();
}

function buildTitle(region, treatment, site) {
  const _s = buildSiteTitleOrNull(region, treatment, site);
  if (_s) return _s;
  const _t = buildIntentTitleOrNull(region, treatment, "film");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment);
}

export default async function handleFilm(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      material,                                  // ③ 자재(브랜드·원단) — 업종 소유 입력값
      surface,                                   //    표면(무광·유광·우드…) — 미입력 시 무영향
      baseGrade,                                 //    하지 상태(양호·흠집·재시공·부적합) — 필름 판단 축
      // [세션136 · SINK-FILM-RECOVERY-01/C] 실제 사례형에 필요한 최소 2축.
      //   미입력이면 프롬프트에 아무것도 붙지 않고 정보형·조건형으로 생성된다(부작용 0).
      workScope,                                 //    실제 시공범위 (예: 상부장 8짝·하부장 6짝·서랍 3)
      existingCondition,                         //    실제 기존상태 (예: 하이그로시 황변, 하부 도어 부풀음)
    } = req.body;

    // 필름 = 출장/현장방문 업종 → 고정 사업장 위치블록 미노출(PATCH-07)
    const _locStore = {};

    // ① 현장정보 수신 — 단지명·평형. 미입력이면 전 경로 무영향.
    const site = parseSite(req.body);

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      FILM_TREATMENTS.find((t) => t.id === program?.id) ||
      FILM_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `인테리어필름 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const mat = formatMaterial(material);
    const ctx = {
      site, material: mat, surface: surface || "", baseGrade: baseGrade || "",
      // [세션136/C] 신규 2축. 빈 문자열이면 hasFacts 판정에 잡히지 않는다.
      workScope: String(workScope || "").replace(/\s+/g, " ").trim(),
      existingCondition: String(existingCondition || "").replace(/\s+/g, " ").trim(),
    };
    // ★ [세션136 재수술/②] 제목을 섹션 루프 '앞'에서 확정한다.
    //   QA FAIL 원인: 제목이 루프 뒤에 생성돼 프롬프트가 제목을 몰랐고, 제목 INTENT 가 본문을 지배하지 못했다.
    //   buildTitle 자체는 무수정(titleEngine.js 무접촉). 생성 시점만 앞당긴다.
    const title = buildTitle(region, treatment, site);
    ctx.title = title;

    const systemPrompt = buildSystemPrompt(region, treatment, ctx);

    const writtenSections = new Set();
    const sections = [];

    for (const sec of FILM_FLOW) {
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
        body = body.replace(/^안녕하세요[^.\n]*인테리어필름\s*시공\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }

      const slot = FILM_SECTION_PHOTO[sec.key];
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
    // ① 현장정보 블록 후단 1줄 — 미입력 시 원문 그대로
    content = insertSiteBeforeHashtags(content, site);
    // 위치블록 후단 1줄 (PATCH-07) — 출장업종 빈값 → 미삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    // ② 제목 3단 분기 — 위 루프 전에서 이미 확정됨(재수술/②)
    const imageAlts = getImageAlts(region, treatment);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    const rgKwCount = region
      ? (content.match(new RegExp(`${region}\\s*${kw}`, "g")) || []).length
      : 0;
    console.log(`[QC][film] 메뉴(${kw}): kw ${kwCount} / 지역+kw 결합 ${rgKwCount} (3 이하 정상)`);
    console.log(`[QC][film] 글자수: ${content.length}`);
    console.log(`[QC][film] 현장정보: ${site.siteName ? `${site.siteName} ${site.siteSize}` : "미입력"} / 자재: ${mat || "미입력"} / 표면: ${surface || "미입력"} / 하지: ${baseGrade || "미입력"}`);
    // [세션136/A] Facts 모드 — QA 판정 기준. facts=false 인데 본문에 목격 서술이 있으면 회귀다.
    console.log(`[QC][film] 범위: ${ctx.workScope || "미입력"} / 기존상태: ${ctx.existingCondition || "미입력"}`);
    console.log(`[QC][film] Facts 모드: ${hasFacts(ctx) ? "사례형(FACTS)" : "정보형(NO-FACTS)"}`);
    console.log(`[QC][film] 제목 선확정: ${title}`);
    console.log(`[QC][film] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "film",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[film] 오류:", err);
    return res.status(500).json({ error: err.message || "인테리어필름 글 생성 오류" });
  }
}
