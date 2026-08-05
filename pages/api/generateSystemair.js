// ============================================================
// pages/api/generateCoating.js — 시스템에어컨(systemair) 엔진 핸들러
// 정보형 + 시공선택 가이드형({region} 시스템에어컨 업체 1인칭).
// 후기형·내돈내산·만족도·추천·보장·효과단정·최저가·순위·브랜드 강추 금지.
// engineBootstrap에서 register("systemair", handleCoating)로 편입.
// 복제 베이스: generateGrout.js (섹션루프형). 기존 업종 무수정.
//   ★ 제목 region 중복 방어: aptName 없을 때 {aptName} 토큰 삭제(region 폴백 금지) — grout v1.0 동형.
//   ★ closing 화자 재시작 방어: prompts closing 1줄 + 핸들러 인사 제거 2중.
// ============================================================

import OpenAI from "openai";
import {
  SYSTEMAIR_TREATMENTS,
  SYSTEMAIR_INFO_BLOCKS,
  APT_DATA,
} from "../../lib/systemair-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/systemair-prompts";
import { SYSTEMAIR_FLOW } from "../../lib/systemair-playConfig";
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

// ── 금칙어 제거(과장·보장·추천·후기·효과단정) ───────────
// ── strip 제외 어휘 (부분 문자열 삭제 시 정상 문장을 파괴) ──
//   ★ [세션60] stripForbidden 은 단어 경계 없이 부분 문자열을 삭제한다.
//     아래 어휘는 정상 단어의 일부로 등장하므로 삭제 대상에서 뺀다.
//       "세척"·"살균"은 청소업종 오염 차단용이나 일반 명사이기도 하다("접합부를 세척합니다" 파괴).
//       → strip 제외, 프롬프트 [청소 주제 금지] 지시로만 억제한다.
//   프롬프트 [금지] 목록에는 그대로 남아 있어 억제력은 유지된다.
const STRIP_SKIP = new Set(["순위", "최고", "완벽", "1위", "반드시", "세척", "살균"]);

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
  t = t.replace(/제가\s*직접\s*[^\n.]*?(해보니|해본\s*결과|시공해보니)[,\s]*/g, "");
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
    `#${rg}${k}`,
    ap ? `#${ap}` : `#${rg}시스템에어컨`,
    `#${rg}시스템에어컨`, `#${k}`,
    `#${rg}시스템에어컨업체`, `#${rg}시스템에어컨상담`,
  ];
  // ★ [세션60] 실발행 확인: '#공릉동시스템에어컨' 2회 노출. 중복 제거 + 지역+메뉴 결합 태그 추가.
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

// ── 화자 도입 (시스템에어컨 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, aptName) {
  if (aptName) {
    return `안녕하세요. ${region} 시스템에어컨 업체입니다.\n오늘은 ${aptName} 시스템에어컨 설치를 안내해 드리겠습니다.`;
  }
  return `안녕하세요. ${region} 시스템에어컨 업체입니다.\n오늘은 ${region} 시스템에어컨 설치를 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "설치") return SYSTEMAIR_INFO_BLOCKS.install;
  if (cat === "아파트설치") return SYSTEMAIR_INFO_BLOCKS.apt;
  if (cat === "구축아파트") return SYSTEMAIR_INFO_BLOCKS.oldapt;
  if (cat === "교체") return SYSTEMAIR_INFO_BLOCKS.replace;
  if (cat === "견적") return SYSTEMAIR_INFO_BLOCKS.quote;
  if (cat === "추가설치") return SYSTEMAIR_INFO_BLOCKS.add;
  if (cat === "배관") return SYSTEMAIR_INFO_BLOCKS.pipe;
  if (cat === "실외기실") return SYSTEMAIR_INFO_BLOCKS.outunit;
  return SYSTEMAIR_INFO_BLOCKS.install;
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
//   ★ grout v1.0 동형: aptName/livingArea 없을 때 토큰을 (선행공백 포함) 삭제.
//      region 폴백 치환 금지 → region 중복 차단.
function buildTitleLegacy(region, treatment, aptName, aptMeta) {
  const patterns = treatment.titlePatterns || [];
  const livingArea = (aptMeta && aptMeta.livingArea) || "";
  // aptName/livingArea 없는데 해당 토큰 쓰는 패턴은 우선 제외(단지 풀 매칭 케이스 우대)
  const usable = patterns.filter((p) => {
    if (/\{aptName\}/.test(p) && !aptName) return false;
    if (/\{livingArea\}/.test(p) && !livingArea) return false;
    return true;
  });
  const pool = usable.length ? usable : patterns;
  const pick = pool[Math.floor(Math.random() * pool.length)] || `{region} ${treatment.name}`;
  let title = pick.replace(/\{region\}/g, region);
  // 남은 토큰: 값 있으면 치환, 없으면 선행공백째 삭제(폴백 region 치환 금지)
  title = aptName ? title.replace(/\{aptName\}/g, aptName) : title.replace(/\s*\{aptName\}/g, "");
  title = livingArea ? title.replace(/\{livingArea\}/g, livingArea) : title.replace(/\s*\{livingArea\}/g, "");
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

// ── 제목 엔진 v1 (titleEngine) — Intent 축 제목. 실패 시 기존 로직 폴백.
//   ★ buildTitle() 한정 교체. Runtime/Data/Prompt/SCENE_SPINE 무변경.
function buildTitle(region, treatment, aptName, aptMeta) {
  const _t = buildIntentTitleOrNull(region, treatment, "systemair");
  if (_t) return _t;
  return buildTitleLegacy(region, treatment, aptName, aptMeta);
}

export default async function handleCoating(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      aptName: bodyAptName,
      address, map_guide, transit, building_desc, parking_info, // 위치 5필드(PATCH-07)
    } = req.body;
    // 시스템에어컨 = 출장/현장방문 업종. 발행코치에서 위치 5필드 채워 보내면 「찾아오시는 길」 삽입,
    // 일반글쓰기(빈값)면 미삽입(부작용 0). SOP PATCH-07.
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      SYSTEMAIR_TREATMENTS.find((t) => t.id === program?.id) ||
      SYSTEMAIR_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `시스템에어컨 메뉴 매칭 실패: ${program?.name}` });
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
      intro: "시스템에어컨 설치 안내", axis1: "설치 위치 안내", axis2: "배관·전기 안내",
      axis3: "진행 순서 안내", axis4: "설치 전 확인 안내", closing: "시스템에어컨 설치 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of SYSTEMAIR_FLOW) {
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
      // closing 섹션이 화자 인사("안녕하세요 …시스템에어컨 업체입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*시스템에어컨\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "시스템에어컨 설치 상담 안내") + "]";
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
    console.log(`[QC][systemair] 메뉴(${kw}) aptName(${aptName || "-"}): kw ${kwCount}`);
    console.log(`[QC][systemair] 글자수: ${content.length}`);
    console.log(`[QC][systemair] 문장잘림 의심: ${countBrokenSentences(content)}건 (0이어야 정상)`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "systemair",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      aptName: aptName || null,
      seoScore: null,
    });
  } catch (err) {
    console.error("[systemair] 오류:", err);
    return res.status(500).json({ error: err.message || "시스템에어컨 글 생성 오류" });
  }
}
