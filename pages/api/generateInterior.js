// pages/api/generateInterior.js
// 인테리어(interior) 생성 핸들러 — v1
// 복제 베이스: generateMoving.js (정보형 섹션 순차 생성 + INFO_BLOCK 삽입 + locationBlock 후단)
// 시그니처: handle(req, res) — ctx 주입식 아님. req.body 입력. text/textMarkdown/content 3종 반환.
// ★ engineBootstrap에서 register('interior', handleInterior) — generate.js 무수정.

import OpenAI from "openai";
import {
  INTERIOR_META,
  INTERIOR_TREATMENTS,
  INTERIOR_INFO_BLOCKS,
  getAptPool,
  getAptMeta,
} from "../../lib/interior-data.js";
import { INTERIOR_FLOW } from "../../lib/interior-playConfig.js";
import {
  buildSystemPrompt,
  buildUserPrompt,
  getImageAlts,
} from "../../lib/interior-prompts.js";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
import { buildIntentTitleOrNull } from "../../lib/titleEngine.js";
// ── [INTERIOR-INTENT-WIRING-01 · S146] INTENT 배선 (FREEZE 부분해제 범위) ──
//   범위 = INTENT 선택 + user 프롬프트 말미 1줄 append. 그 외 로직 무접촉.
//   · INTERIOR_FLOW 루프 / renderInfoBlock / pickInfoBlockKey / pickTitle / prompts 무수정.
//   · INTENTS[cat] 미정의면 intent=null → 기존 동작과 완전 동일(데이터가 게이트).
//   ★ interior 엔진 화자 = 「범위를 수주하는 종합업체」. 전문 시공기술 축은
//     독립 업종 엔진(bathroom·dobae·flooring·tile) 소관이므로 INTENT 는
//     수주 범위·공정 조합·진행 조건만 다룬다. (INTERIOR-DUP-BATH-01 결론)
import { INTENTS as INTERIOR_INTENTS } from "../../lib/spine/intents/interior.js";

// INTENT 를 주입할 섹션. axis1·axis3 는 Scene Spine 동선 강제 구간,
// axis2·infoblock 은 analysisAxis 선점 구간이므로 제외한다.
const INTENT_SECTIONS = new Set(["intro", "axis4", "closing"]);

function pickIntent(treatment, wantId) {
  const list = INTERIOR_INTENTS?.[treatment?.cat];
  if (!Array.isArray(list) || !list.length) return null;
  if (wantId) return list.find((v) => v.id === wantId) || null;
  return list[Math.floor(Math.random() * list.length)];
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// 섹션키 → INFO_BLOCKS 키 매핑 (메뉴 cat별 분기)
function pickInfoBlockKey(treatment) {
  const cat = treatment.cat;
  if (cat === "구축아파트") return "oldapt";
  if (cat === "욕실리모델링" || cat === "주방리모델링") return "space";
  if (cat === "도배장판") return "finish";
  if (cat === "체크리스트") return "check";
  if (cat === "아파트리모델링" || cat === "부분인테리어") return "remodel";
  return "cost";
}

function renderInfoBlock(treatment) {
  const key = pickInfoBlockKey(treatment);
  const block = INTERIOR_INFO_BLOCKS[key];
  if (!block) return "";
  const lines = block.items.map((it) => `• ${it}`).join("\n");
  return `\n\n【${block.title}】\n${lines}\n`;
}

// 제목 선택 (data.js titlePatterns 소비 — 생성기는 소비만)
function pickTitleLegacy(treatment, region, aptName, livingArea) {
  const pats = treatment.titlePatterns || [];
  if (!pats.length) return `${region} ${treatment.name}`;
  let raw = pats[Math.floor(Math.random() * pats.length)];
  // aptName 없으면 "{region} {aptName}" → "{region} {region}" 중복 방지: 토큰(+선행공백) 제거
  if (!aptName) raw = raw.replace(/\s*\{aptName\}/g, "");
  if (!livingArea) raw = raw.replace(/\s*\{livingArea\}/g, "");
  return raw
    .replace(/\{region\}/g, region || "")
    .replace(/\{aptName\}/g, aptName || "")
    .replace(/\{livingArea\}/g, livingArea || "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── [INTERIOR-TITLE-INTENT-SYNC-01 · S185] INTENT 제목 동기화
//   (generateFilm.js WIRING-02 이식 — 검증된 참조 구현)
//   판정: INTENT > titleEngine. 질문축이 제목부터 본문까지 유지되어야 한다.
//   titleHint 부재 시 null 반환 → 기존 titleEngine/legacy 경로 그대로. 기능 제거 아님.
function buildIntentTitleFromIntent(region, treatment, intent) {
  if (!intent) return null;
  const hint = String(intent.titleHint || "").trim();
  if (!hint) return null;
  const rg = String(region || "").trim();
  const kw = String((treatment && treatment.name) || "").trim();
  return [rg, kw, hint].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();
}

// ── 제목 엔진 v1 (titleEngine) — Intent 축 제목. 실패 시 기존 로직 폴백.
//   ★ buildTitle() 한정 교체. Runtime/Data/Prompt/SCENE_SPINE 무변경.
//   폴백 3단: intent.titleHint → titleEngine → legacy titlePatterns
function pickTitle(treatment, region, aptName, livingArea, intent) {
  const _i = buildIntentTitleFromIntent(region, treatment, intent);
  if (_i) return _i;
  const _t = buildIntentTitleOrNull(region, treatment, "interior");
  if (_t) return _t;
  return pickTitleLegacy(treatment, region, aptName, livingArea);
}

async function callGPT(system, user) {
  const r = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return (r.choices?.[0]?.message?.content || "").trim();
}

export default async function handleInterior(req, res) {
  try {
    const {
      treatmentId, program,
      region, userRegion, regionKey,
      aptName: bodyAptName,
      // 위치 5필드 (locationBlock 후단 연결 — PATCH-07)
      address, map_guide, transit, building_desc, parking_info,
    } = req.body || {};

    const reg = region || userRegion || "";
    // [INTERIOR-TREATMENT-RESOLVE-01 · S146] program 은 객체({name,industry,...})라
    //   문자열 t.id/t.name 과 비교하면 항상 false → 전 cat 이 TREATMENTS[0](아파트 리모델링)로
    //   폴백되던 결함. id·name 을 꺼내 흡수한다. treatmentId 우선순위는 기존 그대로.
    const tId = treatmentId || program?.id || program?.name || program;
    const treatment =
      INTERIOR_TREATMENTS.find((t) => t.id === tId || t.name === tId) ||
      INTERIOR_TREATMENTS[0];

    // 단지명 결정: useApt면 풀에서 선택(또는 body 지정), 아니면 미사용
    let aptName = null;
    let aptMeta = null;
    if (treatment.useApt) {
      const pool = getAptPool(regionKey);
      aptName = bodyAptName || (pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
      if (aptName) aptMeta = getAptMeta(regionKey, aptName);
    }
    const livingArea = aptMeta?.livingArea || "";

    // 섹션 순차 생성 (단일 누적 — 변화 헤더 없음)
    const system = buildSystemPrompt(reg, treatment, aptName, aptMeta);

    // ★ [OneClick] 이미지 마커 삽입 — 복제 베이스(generateMoving.js) 동형.
    //   기존 결함: getImageAlts() 결과를 imageAlts(JSON)로만 반환하고 본문에 마커 미부착.
    //   → One Click Publishing 3단계(마커 위치에 사진 삽입)가 무력화됨.
    //   섹션키 고정 alt 맵 사용(FLOW 7키). prompts·문체·SEO 무영향, 출력 형식만 통일.
    const PHOTO_ALT = {
      intro: "인테리어 공사 범위 안내", axis1: "시공 범위 안내", axis2: "견적 영향 요소 안내",
      axis3: "진행 순서 안내", axis4: "시공 전 확인 안내", closing: "인테리어 견적 상담 안내",
    };

    // [INTERIOR-INTENT-WIRING-01] INTENT 선택 — 미정의 cat 이면 null(기존 동작 유지).
    const intent = pickIntent(treatment, req.body?.intentId);
    if (intent) console.log(`[QC][interior] INTENT: ${intent.id} (${intent.label}) / titleHint: ${intent.titleHint || "-"}`);

    const parts = [];
    for (const sec of INTERIOR_FLOW) {
      let user = buildUserPrompt(reg, treatment, sec.key, aptName);
      // [INTERIOR-INTENT-WIRING-01] 지정 3축에만 말미 1줄 append. 기존 프롬프트 무수정.
      const _ax = intent && INTENT_SECTIONS.has(sec.key) ? intent.axes?.[sec.key] : null;
      if (_ax) user += `\n\n[이번 글의 주제 축]\n${_ax}`;
      const text = await callGPT(system, user);
      if (sec.key === "infoblock") {
        parts.push(text + renderInfoBlock(treatment) + "\n\n[이미지: 체크포인트 안내]");
      } else {
        parts.push(text + "\n\n[이미지: " + (PHOTO_ALT[sec.key] || "인테리어 견적 상담 안내") + "]");
      }
    }

    // 제목 + 본문 조립
    const title = pickTitle(treatment, reg, aptName, livingArea, intent);
    const alts = getImageAlts(reg, treatment, aptName);
    let body = parts.filter(Boolean).join("\n\n");

    // 마무리 해시태그
    //   ★ [세션60] 기존: [지역, 메뉴명, 단지] 3개 → 실제 2개만 생성되어 노출 신호 부족.
    //     지역+메뉴 결합형 / 업종 일반형 / 상담형까지 6개 축으로 확장. 중복은 Set으로 제거.
    const rg = String(reg || "").replace(/\s+/g, "");
    const kwTag = String(treatment.name || "").replace(/\s+/g, "");
    const apTag = aptName ? String(aptName).replace(/\s+/g, "") : "";
    const rawTags = [
      apTag ? `#${rg}${apTag}${kwTag}` : `#${rg}${kwTag}`,
      `#${rg}인테리어`,
      `#${rg}리모델링`,
      `#${kwTag}`,
      apTag ? `#${apTag}` : `#인테리어견적`,
      `#${rg}인테리어업체`,
    ];
    const tags = [...new Set(rawTags.filter((t) => t && t.length > 1))];
    let out = `${title}\n\n${body}\n\n${tags.join(" ")}`;

    // 위치블록 후단 1줄 (발행코치=삽입 / 일반글쓰기 빈값=원문 그대로)
    const _locStore = { address, map_guide, transit, building_desc, parking_info };
    out = insertLocationBeforeHashtags(out, _locStore);

    // 3종 반환 (content 단독 아님 — PATCH-09 #5)
    const textMarkdown = out;
    return res.status(200).json({
      ok: true,
      industry: "interior",
      treatment: treatment.name,
      title,
      aptName: aptName || null,
      imageAlts: alts,
      text: out,
      textMarkdown,
      content: out,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}

export { handleInterior };
