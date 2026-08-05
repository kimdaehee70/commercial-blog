// ============================================================
// pages/api/generateBathroom.js — 욕실리모델링(bathroom) 엔진 핸들러
// 정보형 + 욕실 리모델링·교체·보수 안내 가이드형({region} 욕실리모델링 업체 1인칭).
// 후기형·작업일지형(다녀왔습니다·시공했습니다·출동했습니다·당일출동)·만족도·추천·보장·최저가·할인·순위 금지.
// engineBootstrap에서 register("bathroom", handleBathroom)로 편입.
// 복제 베이스: generateHomefix.js (단일호출 섹션루프형). 기존 업종 무수정.
//   ★ 출장업종 → APT_DATA 전면 미사용(useApt 전부 false). region 문자열만. _locStore 빈값 분기.
//   ★ 제목 region 중복 방어: 출장업종 → 단지 토큰 없음. {region} 1회만.
//   ★ closing 화자 재시작 방어: prompts closing 1줄 + 핸들러 인사 제거 2중.
//   ★ cat 12종 = INFO_BLOCK 12종 1:1. UNDEFINED 0 / 박제 0.
//   ★ josa: buildAgentIntro 받침 판별 적용.
//   ★ PATCH-07: 위치블록 후단 1줄(insertLocationBeforeHashtags). 빈값이면 미삽입.
// ============================================================

import OpenAI from "openai";
import {
  BATHROOM_TREATMENTS,
  BATHROOM_INFO_BLOCKS,
} from "../../lib/bathroom-data";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
  FORBIDDEN,
} from "../../lib/bathroom-prompts";
import { BATHROOM_FLOW } from "../../lib/bathroom-playConfig";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
import { buildIntentTitle } from "../../lib/titleEngine.js";

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
//   ★ 검색량 낮은 조합어(욕실교체 등) 제외. 핵심 키워드만.
function buildHashtags(region, kw) {
  const rg = (region || "").replace(/\s+/g, "");
  const k = (kw || "").replace(/\s+/g, "");
  const tags = [
    `#${rg}욕실리모델링`,
    `#${rg}화장실리모델링`, `#${k}`,
    `#${rg}욕실수리`,
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

// ── 화자 도입 (욕실리모델링 업체 1인칭. 업체명 본문 미노출) ──
function buildAgentIntro(region, menu) {
  const j = josa(menu, "을", "를");
  return `안녕하세요. ${region} 욕실리모델링 업체입니다.\n오늘은 ${menu}${j} 안내해 드리겠습니다.`;
}

// ── 정보블럭 선택 (cat 기준, 12종 1:1) ──────────
//   ★ [v-menu 2026-07-27] 하드코딩 if 체인 → 데이터 조회 전환(승인 범위: 이 함수만).
//     조회 순서: treatment.infoKey → treatment.cat → 기본(remodel).
//     기존 12메뉴는 data.js infoKey 부여로 매핑 100% 동일.
function pickInfoBlock(treatment) {
  return (
    BATHROOM_INFO_BLOCKS[treatment.infoKey] ||
    BATHROOM_INFO_BLOCKS[treatment.cat] ||
    BATHROOM_INFO_BLOCKS.remodel
  );
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
  // titleEngine v1 — Intent 축 제목. 실패 시 data.js titlePatterns 폴백(엔진 내부 처리).
  return buildIntentTitle(region, treatment, "bathroom");
}

export default async function handleBathroom(req, res) {
  try {
    const {
      program, userRegion, region: regionFallback,
      address, map_guide, transit, building_desc, parking_info, // 위치 5필드(PATCH-07)
    } = req.body;
    // 욕실리모델링 = 출장/현장방문 업종. 발행코치에서 위치 5필드 채워 보내면 「찾아오시는 길」 삽입,
    // 일반글쓰기(빈값)면 미삽입(부작용 0). SOP PATCH-07.
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    const regionRaw = userRegion || regionFallback;
    const region = (regionRaw || program?.region || "").trim();

    const treatment =
      BATHROOM_TREATMENTS.find((t) => t.id === program?.id) ||
      BATHROOM_TREATMENTS.find((t) => t.name === program?.name);

    if (!treatment) {
      return res.status(400).json({ error: `욕실리모델링 메뉴 매칭 실패: ${program?.name}` });
    }

    const kw = treatment.name;
    const systemPrompt = buildSystemPrompt(region, treatment);

    const PHOTO_ALT = {
      intro: "욕실 작업 전 상태 안내", scope: "욕실 시공 범위 안내", cause: "욕실 작업 부위·원인 안내",
      process: "작업 진행 안내", manage: "작업 후 확인 안내", closing: "욕실 마감 상태 안내",
    };

    const writtenSections = new Set();
    const sections = [];

    for (const sec of BATHROOM_FLOW) {
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
      // closing 섹션이 화자 인사("안녕하세요 …욕실리모델링 업체입니다")를 재등장시키는 패턴 제거(intro 중복)
      if (sec.key === "closing") {
        body = body.replace(/^안녕하세요[^.\n]*욕실리모델링\s*업체입니다[.,]?\s*/g, "").trim();
        body = body.replace(/오늘은[^.\n]*안내해?\s*드리겠습니다[.,]?\s*/g, "").trim();
      }
      body += "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "욕실리모델링 안내") + "]";
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
    console.log(`[QC][bathroom] 메뉴(${kw}): kw ${kwCount}`);
    console.log(`[QC][bathroom] 글자수: ${content.length}`);

    return res.status(200).json({
      title,
      text:         content,
      textMarkdown: content,
      content,
      imageAlts,
      industry: "bathroom",
      treatmentId: treatment.id,
      treatmentName: treatment.name,
      seoScore: null,
    });
  } catch (err) {
    console.error("[bathroom] 오류:", err);
    return res.status(500).json({ error: err.message || "욕실리모델링 글 생성 오류" });
  }
}
