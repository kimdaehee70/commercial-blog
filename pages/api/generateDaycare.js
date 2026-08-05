// pages/api/generateDaycare.js
// 데이케어센터 생성 핸들러. 복사 베이스: generateLawyer.js
// 기능 모듈(cleanText/removeDuplicates/insertInfoBlock/QC)은 업종 공통 — 복사 사용.
// 비의료 → injectExamValue(수치 강제) 생략/대체.
import OpenAI from "openai";
// [A-7] 위치/주차 공통 후단 블록 — 전 업종 공유 기능 모듈(narrative 아님).
//   address 등 위치 5필드가 req.body로 오면 해시태그 직전에 "찾아오시는 길" 삽입.
//   필드 비면(일반글쓰기) buildLocationBlock="" → 미삽입(옵션① 자동 분기).
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용
import { DAYCARE_PLAY_CONFIG } from "../../lib/daycare-playConfig.js";
import {
  DAYCARE_TREATMENTS,
  DAYCARE_PHOTO_POOL, // ⚠️ DEAD CODE (핸들러 미참조 — getImageAlts가 내부 사용): export 보존
} from "../../lib/daycare-data.js";
import {
  SYSTEM_PROMPT,
  FORBIDDEN,
  buildPrompt,
  buildOfficeIntro, // ⚠️ DEAD CODE (단일호출은 buildPrompt가 도입 내장 가정): 섹션화 시 복원
  stripOwnerSignature,
  getImageAlts,
  renderInfoBlocks,
} from "../../lib/daycare-prompts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// ───────── 기능 모듈 (업종 공통) ─────────

// 조사오류 + 키워드 반복 차단
function cleanText(text, fullKeyword) {
  let t = text;
  // 조사 오류 대표 패턴 (공통 14패턴 중 일부 — 실제 운영본 복사 사용)
  t = t.replace(/을를/g, "를").replace(/이가/g, "가").replace(/은는/g, "는");
  // 지역+업종 결합 4회 이상 → 이후 자연 치환
  if (fullKeyword) {
    let count = 0;
    const re = new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    t = t.replace(re, (m) => {
      count += 1;
      return count > 3 ? "저희 센터" : m;
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
  // cost 섹션 부근에 삽입 — 마커 없으면 본문 끝 직전
  if (text.includes("[INFO_BLOCK]")) {
    return text.replace("[INFO_BLOCK]", block);
  }
  return `${text}\n\n${block}`;
}

// ★ 비의료 → 수치 강제 삽입 생략/대체
function injectExamValue(text) {
  // 데이케어는 의료 수치 없음. 제도 수치(등급/부담률)는 정보블럭이 담당.
  return text; // no-op (대체)
}

// closing 재요약 코드 절단
function truncateClosingResummary(text) {
  // sec.key==='closing' 단계에서 GPT가 전체 재요약하는 경향 차단
  return text.replace(/(지금까지|앞서 말씀드린|요약하(자면|면))[^\n]*\n?/g, "");
}

// 본문에서 GPT 마커 의존 없이 이미지 슬롯 강제 삽입 후 박스 변환
function injectImageSlots(text, region) {
  const alts = getImageAlts({ region });
  // 섹션 사이에 [이미지:alt] 강제 삽입 (![] 마크다운 의존 금지)
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
  // 남은 슬롯(마무리 이미지) 보충
  while (ai < alts.length) {
    out.push(`[이미지: ${alts[ai]}]`);
    ai += 1;
  }
  return out.join("\n\n");
}

// ───────── QC 로그 ─────────
function runQC(text, fullKeyword) {
  const hasInfo = /이용대상|본인부담금|선택 기준|송영/.test(text);
  const kwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
  const fullKwCount = (text.match(/데이케어센터|주간보호센터/g) || []).length;
  const forbiddenHit = FORBIDDEN.filter((w) => text.includes(w));
  console.log("[QC] 정보블럭:", hasInfo);
  console.log("[QC] 키워드반복:", kwCount, "(5 이하 기준)");
  console.log("[QC] 완전체키워드:", fullKwCount, "(3회 이상 기준)");
  console.log("[QC] 금칙어 위반:", forbiddenHit.length ? forbiddenHit.join(",") : "없음");
  return { hasInfo, kwCount, fullKwCount, forbiddenHit };
}

// ───────── 핸들러 ─────────
export default async function handleDaycare(req, res) {
  try {
    // [배선] 입력은 req.body (라우터 handle(req,res) 경로 — lawyer 동형)
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName,
      // [A-7] 위치 5필드 — 발행코치=값 존재 / 일반글쓰기=빈값. locationBlock이 빈값 시 ""(미삽입).
      address, map_guide, transit, building_desc, parking_info,
    } = req.body;
    const regionRaw = userRegion || regionFallback || program?.region;
    const region = (regionRaw || "지역").trim();
    const storeName = (bodyStoreName || "{storeName}").trim();
    // [A-7] locationBlock 입력용 store 객체(위치 5필드만). 전부 빈값이면 후단에서 블록 미생성.
    const _locStore = { address, map_guide, transit, building_desc, parking_info };

    // 서비스 매칭 (lawyer 동형: program.id → name)
    const treatment =
      DAYCARE_TREATMENTS.find((t) => t.id === program?.id) ||
      DAYCARE_TREATMENTS.find((t) => t.name === program?.name) ||
      DAYCARE_TREATMENTS[0];

    const fullKeyword = `${region} 데이케어센터`;
    const systemPrompt = SYSTEM_PROMPT.replace(/\{region\}/g, region);
    const userPrompt = buildPrompt({ treatment, region, storeName });

    // ── GPT 호출 (단일 호출 — daycare-prompts 설계 그대로. 섹션 루프 미이식) ──
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
    // ①cleanText ②중간 해시태그 제거 ③insertInfoBlock ④injectExamValue
    // ⑤removeDuplicates ⑥fullKeyword 3회 ⑦마무리 이미지 ⑧해시태그
    let out = cleanText(raw, fullKeyword);
    out = out.replace(/#[^\s#]+/g, (m, off) => (off < out.length - 200 ? "" : m)); // 중간 해시태그 제거
    out = insertInfoBlock(out);
    out = injectExamValue(out);
    out = truncateClosingResummary(out);
    out = removeDuplicates(out);
    out = stripOwnerSignature(out);   // [fix] 이미지 슬롯 삽입 전 서명 제거 ($ 앵커 매칭 보존)
    out = injectImageSlots(out, region);
    // 마무리 해시태그
    out += `\n\n#${region}데이케어센터 #${region}주간보호센터 #장기요양 #치매돌봄 #송영서비스`;

    // [A-7] 위치블록 후단 삽입 — 해시태그 줄을 떼어 [본문 + 찾아오시는길 + 해시태그] 재조립.
    //   _locStore 위치필드 전부 빈값(일반글쓰기)이면 buildLocationBlock=""→원문 그대로(부작용 0).
    //   QC/글자수 카운트는 이 줄 이후 runQC에서 산출(주소 1회 노출은 키워드 반복 무관).
    out = insertLocationBeforeHashtags(out, _locStore);

    const qc = runQC(out, fullKeyword);

    return res.status(200).json({
      industry: "daycare",
      region,
      treatment: treatment.id,
      title: pickTitle(treatment, region),
      // [정합] 프론트(index.js)는 data.text / data.textMarkdown 을 본문으로 읽는다.
      //   content만 반환 시 결과화면·복사·저장 0자 (lawyer v143 동일 버그 방지).
      text:         out,
      textMarkdown: out,
      content:      out,
      qc,
    });
  } catch (e) {
    console.error("[generateDaycare] error:", e);
    return res.status(500).json({ error: "daycare_generation_failed", detail: String(e) });
  }
}

function pickTitle(treatment, region) {
  const pats = treatment.titlePatterns || [];
  const t = pats[Math.floor(Math.random() * pats.length)] || "{region} 데이케어센터 안내";
  return t.replace(/\{region\}/g, region);
}
