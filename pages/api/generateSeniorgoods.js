// pages/api/generateSeniorgoods.js
// 노인용품 전문점 생성 핸들러. 복사 베이스: generateWelfarecare.js (단일호출형)
// 기능 모듈(cleanText/removeDuplicates/insertInfoBlock/QC)은 업종 공통 — 복사 사용.
// ★ storeName placeholder 본문 노출 2단 방어 내장:
//    A) 폴백 = "저희 전문점" (placeholder 문자열 아님)
//    B) cleanText에 {storeName} → "저희 전문점" 치환 (GPT가 새도 100% 제거)
import OpenAI from "openai";
// [A-7 / PATCH-07] 위치/주차 공통 후단 블록 — 전 업종 공유 기능 모듈(narrative 아님).
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용
import { SENIORGOODS_PLAY_CONFIG } from "../../lib/seniorgoods-playConfig.js";
import {
  SENIORGOODS_TREATMENTS,
  SENIORGOODS_PHOTO_POOL, // ⚠️ DEAD CODE (핸들러 미참조 — getImageAlts가 내부 사용): export 보존
} from "../../lib/seniorgoods-data.js";
import {
  SYSTEM_PROMPT,
  FORBIDDEN,
  buildPrompt,
  buildOfficeIntro, // ⚠️ DEAD CODE (단일호출은 buildPrompt가 도입 내장 가정): 섹션화 시 복원
  stripOwnerSignature,
  getImageAlts,
  renderInfoBlocks,
} from "../../lib/seniorgoods-prompts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// ───────── 기능 모듈 (업종 공통) ─────────

// 조사오류 + 키워드 반복 차단 + ★storeName placeholder 방어(B)
function cleanText(text, fullKeyword) {
  let t = text;
  // ★ [방어 B] flower 결함 대응 — GPT가 {storeName} placeholder를 본문에 남기면 100% 제거
  t = t.replace(/\{storeName\}/g, "저희 전문점");
  // ★ [방어 D] 화자 이중출현·조사오류 안전망 (storeName 도입부 누수 회귀 차단)
  //   "노원구 묵동 저희 전문점 노인용품 전문점입니다" → "노원구 묵동 노인용품 전문점입니다"
  t = t.replace(/저희\s*전문점\s*노인용품\s*전문점/g, "노인용품 전문점");
  //   "○○ 노인용품 전문점 노인용품 전문점" 류 전문점 중복 1회로
  t = t.replace(/노인용품\s*전문점\s*노인용품\s*전문점/g, "노인용품 전문점");
  //   "전문점으로"는 정상(받침 ㅁ+으로) → 별도 보정 없음
  // 조사 오류 대표 패턴 (공통 14패턴 중 일부 — 실제 운영본 복사 사용)
  t = t.replace(/을를/g, "를").replace(/이가/g, "가").replace(/은는/g, "는");
  // 지역+업종 결합 4회 이상 → 이후 자연 치환
  if (fullKeyword) {
    let count = 0;
    const re = new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    t = t.replace(re, (m) => {
      count += 1;
      return count > 3 ? "저희 전문점" : m;
    });
  }
  return t;
}

// 섹션·문단·문장 3단계 중복 제거
function removeDuplicates(text) {
  const lines = text.split("\n");
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const norm = line.trim();
    if (norm.length > 12 && seen.has(norm)) continue;
    if (norm.length > 12) seen.add(norm);
    out.push(line);
  }
  return out.join("\n");
}

// 정보블럭 위치 고정 (내용은 prompts.renderInfoBlocks)
function insertInfoBlock(text) {
  const block = renderInfoBlocks();
  if (text.includes("[INFO_BLOCK]")) {
    return text.replace("[INFO_BLOCK]", block);
  }
  return `${text}\n\n${block}`;
}

// ★ 비의료 → 수치 강제 삽입 생략/대체
function injectExamValue(text) {
  // 노인용품은 의료 수치 없음. 제도 수치(등급/한도/부담률)는 정보블럭이 담당.
  return text; // no-op (대체)
}

// closing 재요약 코드 절단
function truncateClosingResummary(text) {
  return text.replace(/(지금까지|앞서 말씀드린|요약하(자면|면))[^\n]*\n?/g, "");
}

// 본문에서 GPT 마커 의존 없이 이미지 슬롯 강제 삽입 후 박스 변환
function injectImageSlots(text, region) {
  const alts = getImageAlts({ region });
  const blocks = text.split("\n\n");
  const out = [];
  let ai = 0;
  blocks.forEach((b, i) => {
    out.push(b);
    if (ai < alts.length && i % 2 === 1) {
      out.push(`[이미지: ${alts[ai]}]`);
      ai += 1;
    }
  });
  while (ai < alts.length) {
    out.push(`[이미지: ${alts[ai]}]`);
    ai += 1;
  }
  return out.join("\n\n");
}

// ───────── QC 로그 ─────────
function runQC(text, fullKeyword) {
  const hasInfo = /필요한 상황|이용대상|사용 대상|확인사항|관리방법|선택 기준/.test(text);
  const kwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
  const fullKwCount = (text.match(/노인용품 전문점|노인용품/g) || []).length;
  const forbiddenHit = FORBIDDEN.filter((w) => text.includes(w));
  // ★ storeName placeholder 잔존 검사 (flower 결함 회귀 감시)
  const storeNameLeak = (text.match(/\{storeName\}/g) || []).length;
  // ★ [방어 C 보강] 폴백값 화자 이중출현 누수 (도입부 "저희 전문점 노인용품 전문점")
  const speakerLeak =
    (text.match(/저희\s*전문점\s*노인용품\s*전문점/g) || []).length +
    (text.match(/노인용품\s*전문점\s*노인용품\s*전문점/g) || []).length;
  console.log("[QC] 정보블럭:", hasInfo);
  console.log("[QC] 키워드반복:", kwCount, "(5 이하 기준)");
  console.log("[QC] 완전체키워드:", fullKwCount, "(3회 이상 기준)");
  console.log("[QC] 금칙어 위반:", forbiddenHit.length ? forbiddenHit.join(",") : "없음");
  console.log("[QC] storeName 누수:", storeNameLeak, "(0 기준)");
  console.log("[QC] 화자이중출현 누수:", speakerLeak, "(0 기준)");
  return { hasInfo, kwCount, fullKwCount, forbiddenHit, storeNameLeak, speakerLeak };
}

// ───────── 핸들러 ─────────
export default async function handleSeniorgoods(req, res) {
  try {
    // [배선] 입력은 req.body (라우터 handle(req,res) 경로 — daycare/welfare 동형)
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName,
      // [A-7 / PATCH-07] 위치 5필드 — 발행코치=값 존재 / 일반글쓰기=빈값.
      address, map_guide, transit, building_desc, parking_info,
    } = req.body;
    const regionRaw = userRegion || regionFallback || program?.region;
    const region = (regionRaw || "지역").trim();
    // ★ [방어 A] flower 결함 대응 — 폴백을 placeholder가 아닌 실제 문자열로.
    const storeName = (bodyStoreName || "저희 전문점").trim();
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    // 품목 매칭 (welfare 동형: program.id → name)
    const treatment =
      SENIORGOODS_TREATMENTS.find((t) => t.id === program?.id) ||
      SENIORGOODS_TREATMENTS.find((t) => t.name === program?.name) ||
      SENIORGOODS_TREATMENTS[0];

    const fullKeyword = `${region} 노인용품`;
    const systemPrompt = SYSTEM_PROMPT.replace(/\{region\}/g, region);
    const userPrompt = buildPrompt({ treatment, region, storeName });

    // ── GPT 호출 (단일 호출 — seniorgoods-prompts 설계 그대로) ──
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    });
    const raw = completion.choices[0]?.message?.content || "";

    // ── 후처리 순서 (기능, 절대 유지) ──
    let out = cleanText(raw, fullKeyword); // ★방어B: {storeName} 치환 포함
    out = out.replace(/#[^\s#]+/g, (m, off) => (off < out.length - 200 ? "" : m)); // 중간 해시태그 제거
    out = insertInfoBlock(out);
    out = injectExamValue(out);
    out = truncateClosingResummary(out);
    out = removeDuplicates(out);
    out = stripOwnerSignature(out);
    out = injectImageSlots(out, region);
    // 마무리 해시태그
    out += `\n\n#${region}노인용품 #노인용품전문점 #복지용구 #장기요양복지용구 #어르신용품`;

    // [A-7 / PATCH-07] 위치블록 후단 삽입 — 해시태그 줄을 떼어 [본문 + 찾아오시는길 + 해시태그] 재조립.
    out = insertLocationBeforeHashtags(out, _locStore);

    const qc = runQC(out, fullKeyword);

    return res.status(200).json({
      industry: "seniorgoods",
      region,
      treatment: treatment.id,
      title: pickTitle(treatment, region),
      // [정합] 프론트는 data.text / data.textMarkdown 을 본문으로 읽는다. 3종 동시 반환.
      text:         out,
      textMarkdown: out,
      content:      out,
      qc,
    });
  } catch (e) {
    console.error("[generateSeniorgoods] error:", e);
    return res.status(500).json({ error: "seniorgoods_generation_failed", detail: String(e) });
  }
}

function pickTitle(treatment, region) {
  const pats = treatment.titlePatterns || [];
  const t = pats[Math.floor(Math.random() * pats.length)] || "{region} 노인용품 전문점 안내";
  return t.replace(/\{region\}/g, region);
}
