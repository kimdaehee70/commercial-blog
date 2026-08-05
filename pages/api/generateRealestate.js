// ============================================================
// pages/api/generateRealestate.js — 부동산(realestate) 엔진 핸들러
// 분석 리포트형(공인중개사 1인칭). 후기형 금지. 가격예측·투자권유 금지.
// engineBootstrap에서 register("realestate", handleRealestate)로 편입.
// 복제 베이스: generateLawyer.js (섹션루프형). 기존 업종 무수정.
// ============================================================

import OpenAI from "openai";
import {
  REALESTATE_TREATMENTS,
  REALESTATE_INFO_BLOCKS,
  APT_DATA,
} from "../../lib/realestate-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/realestate-prompts";
import { REALESTATE_FLOW } from "../../lib/realestate-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 후처리: 공백·조사 정리 ─────────────────────
function cleanText(text) {
  let t = text;
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/([가-힣])  +/g, "$1 ");
  return t.trim();
}

// ── 금칙어 제거(과장·가격단정·투자권유) ───────────
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

// ── 최신 교통개발 고유명 제거 (가장 빨리 낡음) ──────
//   GTX/광운대역개발 등 노선·역명 단정 → 문장 통째 제거(노후화 차단).
function stripTransitNews(text) {
  const paras = text.split(/\n/);
  const RX = /(GTX|지티엑스|광운대역\s*개발|정비사업\s*(최신|현재)\s*단계)/;
  // 해당 키워드 포함 "문장"만 제거 (단락 통째 삭제 아님)
  return paras.map((line) => {
    if (!RX.test(line)) return line;
    return line
      .split(/(?<=[.!?。])\s+/)
      .filter((s) => !RX.test(s))
      .join(" ");
  }).join("\n");
}

// ── 재건축/재개발 단계 단정 완화 ───────────────
//   "현재 초기 단계/안전진단 단계" 등 특정 단계 단정 → 일반 안내로.
function softenRedevStage(text) {
  let t = text;
  t = t.replace(/현재\s*(이\s*단지는\s*)?(초기\s*단계|안전진단\s*단계|[^\n.]*?단계)(에\s*있으며|를\s*밟고\s*있|입니다)/g,
    "재건축 진행 단계는 단지별로 다르며, 현재 단계는 별도 확인이 필요합니다");
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
    ap ? `#${rg}${ap}` : `#${rg}${k}`,
    `#${rg}부동산`, `#${rg}공인중개사`,
    `#${k}`, ap ? `#${ap}` : `#${rg}아파트`, `#${rg}부동산상담`,
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
  // 한글 음절: 0xAC00~0xD7A3. (코드-0xAC00)%28 === 0 → 받침 없음
  const hasJong = last >= 0xAC00 && last <= 0xD7A3 && (last - 0xAC00) % 28 !== 0;
  return { full: n + (hasJong ? "을" : "를"), josa: hasJong ? "을" : "를" };
}

// ── 화자 도입 (공인중개사 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, aptName) {
  if (aptName) {
    return `안녕하세요. ${region} 공인중개사입니다.\n오늘은 ${formatObjectName(aptName).full} 살펴보겠습니다.`;
  }
  return `안녕하세요. ${region} 공인중개사입니다.\n오늘은 ${region} 부동산 시장을 살펴보겠습니다.`;
}

// ── 정보블럭 선택 (cat/treatment 기준) ──────────
function pickInfoBlock(treatment) {
  const cat = treatment.cat;
  if (cat === "재건축") return REALESTATE_INFO_BLOCKS.rebuild;
  if (cat === "재개발") return REALESTATE_INFO_BLOCKS.redevelop;
  if (cat === "전세") return REALESTATE_INFO_BLOCKS.jeonse;
  if (cat === "월세") return REALESTATE_INFO_BLOCKS.wolse;
  if (cat === "아파트분석" || treatment.useApt) return REALESTATE_INFO_BLOCKS.apt;
  return null;
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
//   program.aptName 명시 우선 → 없으면 지역 풀 랜덤 → 없으면 "" (지역 분석으로 fallback)
//   반환: { aptName, meta } — meta = {district, station, livingArea} 또는 null
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
function buildTitle(region, treatment, aptName) {
  const patterns = treatment.titlePatterns || [];
  const pick = patterns[Math.floor(Math.random() * patterns.length)] || `{region} ${treatment.name}`;
  let title = pick
    .replace(/\{region\}/g, region)
    .replace(/\{aptName\}/g, aptName || "");
  // aptName 빈값으로 인한 이중 공백 정리
  title = title.replace(/\s{2,}/g, " ").trim();
  return title;
}

export default async function handleRealestate(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      aptName: bodyAptName,
      // 위치 5필드 (PATCH-07)
      address, map_guide, transit, building_desc, parking_info,
    } = req.body;
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      REALESTATE_TREATMENTS.find((t) => t.id === program?.id) ||
      REALESTATE_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `부동산 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const { aptName, meta: aptMeta } = resolveAptName(treatment, region, bodyAptName);
    // 단지 district가 있으면 region을 단지 소재 동으로 정밀화 (예: 공릉동 → 상계동)
    //   userRegion이 시/구 단위면 동 단위로 보정. 단지 메타 우선.
    const baseRegionKey = resolveRegionKey(region);
    const regionDistrict = (aptMeta && aptMeta.district)
      ? `${(APT_DATA[baseRegionKey]?.region) || region} ${aptMeta.district}`.trim()
      : region;
    const effRegion = aptName ? regionDistrict : region;
    const systemPrompt = buildSystemPrompt(effRegion, treatment, aptName);

    const PHOTO_ALT = {
      intro: "단지 전경 안내", axis1: "입지·교통 안내", axis2: "생활권·학군 안내",
      axis3: "실거주 안내", axis4: "투자 관점 안내", closing: "부동산 상담 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of REALESTATE_FLOW) {
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
      // closing 섹션이 화자 인사("안녕하세요 …공인중개사입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*공인중개사입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*분석을\s*해보겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "부동산 상담 안내") + "]";
      sections.push(body);
    }

    // ── 조립 + 후처리 ──
    let content = sections.join("\n\n");
    content = cleanText(content);
    content = stripForbidden(content);
    content = stripTransitNews(content);   // GTX 등 최신 교통개발 단정 제거
    content = softenRedevStage(content);   // 재건축 단계 단정 완화
    content = removeDupParagraphs(content);
    content = buildAgentIntro(effRegion, aptName) + "\n\n" + content;
    content = applyPhotoBoxes(content);
    content = content.replace(/(^|\n)\s*운영자\s*(\n|$)/g, "\n").trim();
    // 마무리 해시태그
    content += buildHashtags(effRegion, kw, aptName);
    content = content.replace(/\n{3,}/g, "\n\n").trim();
    // 위치블록 후단 1줄 (PATCH-07) — 해시태그 직전 삽입
    content = insertLocationBeforeHashtags(content, _locStore);

    const title = buildTitle(effRegion, treatment, aptName);
    const imageAlts = getImageAlts(effRegion, treatment, aptName);

    // ── QC 로그 ──
    const kwCount = (content.match(new RegExp(kw, "g")) || []).length;
    const subj = aptName ? `${effRegion} ${aptName}` : effRegion;
    console.log(`[QC][realestate] 메뉴(${kw}) aptName(${aptName || "-"}): kw ${kwCount}`);
    console.log(`[QC][realestate] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "realestate",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      aptName: aptName || null,
      seoScore: null,
    });
  } catch (err) {
    console.error("[realestate] 오류:", err);
    return res.status(500).json({ error: err.message || "부동산 글 생성 오류" });
  }
}
