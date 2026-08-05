// ============================================================
// generateDentalV2.js — 치과 Purpose Engine v2 핸들러
// ------------------------------------------------------------
// ⚠️ v1(generateDental.js) 무손상. 신규 Major Version.
// ⚠️ [v2.1 Spine 정합] 병원군 Reference Engine(ortho-v2)과 동일 7섹션.
//    concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//    (구 5섹션 purpose_intro/hospital_explain/exam_judge/treatment_way/care_target 폐기)
// ------------------------------------------------------------
// mode: validMode='purpose' (목적축 병원형). v1 commercial과 A/B 병행 관측 대상.
//   후기(personal) 부활 아님 — 정보형 안에서 검색자 목적축 재배열.
// ------------------------------------------------------------
// [v2.1 변경점]
//   · 5섹션 → 7섹션 (ortho-v2 Spine 정합)
//   · recoveryTimeline 소비 제거 (개인 타임라인 금지 원칙)
//   · 제목: '결정 전 기준' 고정형 → prompts.buildDentalV2Title 위임 (번역투 제거)
//   · 정보블록 앵커: treatment_way → checkPoint (판단 기준 요약표)
//   · closingNote 하드코딩 제거 — 섹션 ⑦(closing)이 담당 (유보 문장 중복 차단)
// ============================================================

import { DENTAL_V2_PURPOSE_FLOW, DENTAL_V2_TREATMENT_OVERRIDES } from "../../lib/dental-v2-playConfig";
import {
  buildDentalV2SystemPrompt,
  buildDentalV2Prompt,
  getDentalV2Direction,
  renderDentalV2InfoBlock,
  getDentalV2ImageAlts,
  buildDentalV2Title,
  DENTAL_V2_FORBIDDEN,
} from "../../lib/dental-v2-prompts";
import { DENTAL_TREATMENTS } from "../../lib/dental-data";  // 데이터는 v1 재활용(무변경)

// ── 공통 lib (v1 실측 경로 동일 — 기능 공유, 철학 미공유) ──
import {
  calcCharCount, removeDuplicateSentences, stripInlineImages,
  generateSection, autoSave,
} from "./generateUtils";
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
import { insertVisitBeforeHashtags } from "../../lib/visitBlock.js";   // VISIT-01
import { stripMarkdownForNaver } from "../../lib/commonPhotoBox";

// ── 치과 전용 유틸 (calcCount 안전 래퍼만 자립) ──
function calcCount(t) {
  try { return calcCharCount(t); } catch { return (t || "").replace(/\s/g, "").length; }
}

// ── 목적축 clean — 후기/광고 잔존 제거 (병원형 유지) ──
function cleanDentalV2Text(text, name, region) {
  let out = text || "";
  DENTAL_V2_FORBIDDEN.forEach(w => {
    out = out.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  });
  out = out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/gm, "");
  return out.trim();
}

// ── [fix-intro 2026-07-14] 섹션 인사말 중복 제거 ──────────────────────────
//   증상: GPT가 섹션마다 "안녕하세요. OO OO 의료진입니다." 를 재출력 → 7회 반복.
//   조치: 섹션 텍스트 단계에서 인사말 문장 전체 제거(조립 시 헤더 1회만 삽입).
//   범위: '안녕하세요'로 시작하고 '입니다.'로 끝나는 첫 문장 계열만. 본문 손실 0.
//   ★ removeDuplicateSentences로는 못 잡음 — 섹션별 독립 문자열이라 조립 후 중복 판정 전에 ALT가 끼어듦.
function stripSpeakerIntro(text) {
  let out = text || "";
  // 문장 단위: 안녕하세요 ... 입니다. / 안녕하세요 ... 인사드립니다.
  out = out.replace(/안녕하세요[.,]?\s*[^\n.]{0,60}?(?:의료진|대표원장|원장)[^\n.]{0,20}?입니다[.]?\s*/g, "");
  out = out.replace(/^\s*안녕하세요[^\n]*\n?/gm, (m) => (/입니다/.test(m) ? "" : m));
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// ── [fix-typo 2026-07-14] GPT 조사·어미 누락 오타 보정 (최소 화이트리스트) ──
//   ⚠ 정규식 조사 정규화(normalizeJosa)는 전면 금지 — 어미·활용형 오탐으로 비문 대량 생산.
//   여기서는 실측 확인된 결손 표현만 1:1 치환한다. 신규 항목은 실 GPT 발현 시에만 추가.
const DENTAL_TYPO_FIX = [
  [/발음에 문 생기는/g, "발음에 문제가 생기는"],
  [/상담 통해/g, "상담을 통해"],
];
function fixDentalTypo(text) {
  let out = text || "";
  DENTAL_TYPO_FIX.forEach(([re, to]) => { out = out.replace(re, to); });
  return out;
}

// ── [fix-effect 2026-07-14] 효과 단정 중립화 (축 A — 의료광고법 경계) ─────
//   증상(실 GPT): "지르코니아크라운은 이러한 불편함을 완화하는 데 도움을 줄 수 있습니다."
//     → 시술의 치료 효과를 직접 단정. 의료광고 표현 리스크.
//   조치: 문장 삭제(마무리 붕괴) 대신 '검토 대상' 프레임으로 문장 단위 중립 치환.
//   ★ 대상은 [시술명 + 효과동사] 결합만. 일반 서술("검사는 ~ 도움을 줍니다")은 건드리지 않는다.
//     → 주어가 subKw(치료명)일 때만 발동. 오탐 0.
const _EFFECT_VERBS = "(?:완화|개선|해결|교정|회복|치료)";
// 주격 조사 — 치환문 자체의 주어에만 적용(종성 판정). 본문 조사 정규화 아님(normalizeJosa 금지 원칙 유지).
function _subjJosa(w) {
  const last = (w || "").trim().slice(-1);
  const code = last.charCodeAt(0);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return "은";
  return ((code - 0xac00) % 28) > 0 ? "은" : "는";
}
function neutralizeEffectClaim(text, subKw) {
  if (!subKw) return text || "";
  const kw = subKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const J = _subjJosa(subKw);
  let out = text || "";
  // ① "OO는 ~ 완화/개선하는 데 도움을 줄 수 있습니다." → 검토 프레임
  out = out.replace(
    new RegExp(`${kw}(?:은|는|이|가)\\s*[^.\\n]{0,40}?${_EFFECT_VERBS}(?:하|시키)[^.\\n]{0,20}?도움[^.\\n]{0,20}?\\.`, "g"),
    `${subKw}${J} 진료에서 함께 검토되는 방향 중 하나입니다.`
  );
  // ② "OO로 ~ 완화됩니다 / 개선할 수 있습니다." → 검토 프레임
  out = out.replace(
    new RegExp(`${kw}(?:으로|로)\\s*[^.\\n]{0,40}?${_EFFECT_VERBS}(?:할 수 있습니다|됩니다|합니다)\\.`, "g"),
    `${subKw}${J} 상태에 따라 진료에서 검토됩니다.`
  );
  return out;
}

// ── 해시태그 (목적축) ──
// [v2.1 BUGFIX] region/name 내부 공백 제거 후 조립.
//   기존: region="동대문구 제기동역" → "#동대문구 제기동역치아미백" (공백에서 태그 절단 → SEO 무효)
//   수정: 공백 전면 제거 → "#동대문구제기동역치아미백"
function stripSpace(s) {
  return String(s || "").replace(/\s+/g, "");
}
function buildDentalV2Hashtags(name, region) {
  const n = stripSpace(name);
  const r = stripSpace(region);
  const tags = [`#${r}${n}`, `#${n}정보`, `#${n}안내`, `#${n}`, `#${r}치과`, `#치과정보`];
  return tags.filter(t => t.length > 1).join(" ");
}

// ── 간이 QC (병원형 위반 카운트 + v2.1 유보문장 반복 카운트) ──
function runDentalV2QC(text, name, region) {
  const firstPerson = (text.match(/저는|제가|받아봤|받았어요|고민했어요/g) || []).length;
  const ad = (text.match(/최고|1위|강추|완벽|보장|무조건/g) || []).length;
  const fullKw = (text.match(new RegExp(`${region}\\s*${name}`, "g")) || []).length;
  // [v2.1] 유보 문장 반복 — V1 최대 결함. 전체 2회 초과 시 경고
  const hedge = (text.match(/상담받고 나서|상담 자리에서|정확한 사항은|상담 시 확인|상담을 통해 확인/g) || []).length;
  // [v2.1] 개인 타임라인 잔존 — recoveryTimeline 폐기 검증
  const timeline = (text.match(/D\+\d|\d+일차|\d+개월 후|일주일 후/g) || []).length;
  // [fix-intro] 인사말 반복 — 정상 = 1 (헤더 1회). 2 이상이면 섹션 잔존.
  const intro = (text.match(/안녕하세요[^\n]*입니다[.]/g) || []).length;
  // [fix-effect] 효과 단정 잔존 — 시술명 + 효과동사 결합. 정상 = 0.
  const effect = (text.match(new RegExp(`${String(name||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?:은|는|이|가|으로|로)[^.\n]{0,40}?(?:완화|개선|해결|회복)(?:하|시키|됩|할)`,"g")) || []).length;
  const charCount = calcCount(text);
  return { firstPerson, ad, fullKw, hedge, timeline, intro, effect, charCount };
}

export default async function handleDentalV2(req, res) {
  const {
    target, program, blogType,
    userRegion, userMemo, overrideTitle,
    storeId,
    storeName: bodyStoreName, repRegion: bodyRepRegion,
    directorName: bodyDirectorName, specialty: bodySpecialty,
    photoContext,
  } = req.body;

  // [v-loc] 위치 5필드 (SOP v4.2 PATCH-07) — index.js hubStore 출처
  const locStore = {
    address:       req.body?.address,
    map_guide:     req.body?.map_guide,
    transit:       req.body?.transit,
    building_desc: req.body?.building_desc,
    parking_info:  req.body?.parking_info,
  };
  // ── VISIT-01: 방문정보 (store_profiles.visit_info JSONB) ──
  const _visitStore = (req.body?.visit_info && typeof req.body.visit_info === "object") ? req.body.visit_info : null;

  const subKw   = program?.name || "";
  const region  = (userRegion || "강남").trim();
  const industry = "dental";

  // ── 의료기관 화자 정보 (req.body 주입, DB 직접조회 안 함) ──
  const storeName    = (bodyStoreName || "").trim();
  const repRegion    = (bodyRepRegion || region).trim();
  const directorName = (bodyDirectorName || "").trim();
  const specialty    = (bodySpecialty || "").trim();
  const hospital     = storeName || "{병원명}";
  const speakerIntro = directorName
    ? `안녕하세요. ${repRegion} ${hospital} 대표원장 ${directorName}입니다.`
    : `안녕하세요. ${repRegion} ${hospital} 의료진입니다.`;

  const validMode = "purpose";
  console.log(`[dental-v2] mode: ${validMode} (Purpose 7섹션 / ortho-v2 Spine) / 화자: ${speakerIntro}`);

  // ── 치료 검증 (19종) ──
  const DENTAL_IDS = ["implant","laminate","braces","rootcanal","scaling","wisdom","zirconia","whitening","tmj",
                      "resin","inlay","ceramic_crown","metal_braces","lingual_braces","periodontal","gum_contour","pedo_caries","implant_redo","denture"];
  const treatmentData = DENTAL_TREATMENTS.find(t => t.id === program?.id || t.name === program?.name) || DENTAL_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  if (!DENTAL_IDS.includes(treatmentId)) {
    console.error(`[dental-v2] 잘못된 치료 진입 차단: ${subKw}`);
    return res.status(400).json({ error: `치과 v2 생성기에 잘못된 치료가 전달되었습니다: ${subKw}` });
  }
  console.log(`[dental-v2] 치료 검증 통과: ${subKw} (${treatmentId})`);

  // ── 시스템 프롬프트 (병원 화자 · 목적축) ──
  const systemPrompt = buildDentalV2SystemPrompt({ region: repRegion, hospital, subKw, speakerIntro });

  // ── 섹션 루프 (Purpose 7섹션) ──
  const SECTIONS = DENTAL_V2_PURPOSE_FLOW.sections;
  const overrides = DENTAL_V2_TREATMENT_OVERRIDES[treatmentId] || {};
  const sectionTexts = {};
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    // [D-4-5b] STORE_PROFILE promptBody View 전달 — 라우터(generate.js) 주입값.
    //   미주입·빈 배열이면 prompts에서 "" 반환 → 기존 동작 100% 보존.
    const _storeFacts = (req.storeProfileView && req.storeProfileView.promptBody) || [];
    const richPrompt = buildDentalV2Prompt(sec.key, treatmentData, region, { mode: validMode, storeFacts: _storeFacts });
    const ov = overrides[sec.key] || {};
    const minLen = ov.minLength || sec.minLength;
    const prevBlock = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현·문장 반복 금지. 특히 "상담 시 확인" 계열 유보 문장을 다시 쓰지 말 것]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    const userPrompt = `업종: dental | 치료: ${subKw} | 지역: ${region} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key}) · 축: ${sec.axis}]
⚠️ 이 섹션만 작성. 성형외과·피부과·한방 표현 금지. ${minLen}자 이상.
⚠️ 병원 화자. 환자 1인칭·후기·광고 금지.
${richPrompt}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanDentalV2Text(secText, subKw, region);
    secText = stripSpeakerIntro(secText);   // [fix-intro] 섹션 인사말 제거
    secText = stripInlineImages(secText);

    if (calcCount(secText) < 80) {
      console.log(`[dental-v2] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 ${minLen}자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanDentalV2Text(retry, subKw, region);
      retry = stripSpeakerIntro(retry);     // [fix-intro]
      retry = stripInlineImages(retry);
      if (calcCount(retry) > calcCount(secText)) secText = retry;
    }

    // [세션40][NOHDR-01] concern(첫 섹션) = 소제목 미출력. GPT가 붙인 헤더 제거.
    if (sec.key === "concern") {
      secText = secText.trim().replace(/^\s*#{1,3}\s*[^\n]*\n?/, "").trim();
    }

    console.log(`[dental-v2] ${sec.label}: ${calcCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT (purpose 7키, 섹션 순서 정합) ──
  const altList = getDentalV2ImageAlts(treatmentData, region);

  // ── 제목 (prompts 위임 — '결정 전 기준' 번역투 폐기) ──
  let title = overrideTitle || buildDentalV2Title(subKw, region, treatmentId);
  if (!title.includes(subKw)) title = buildDentalV2Title(subKw, region, treatmentId);

  // ── 조립 (화자 첫 문장 → 섹션 순차 + ALT 인터리브) ──
  let assembled = `# ${title}\n\n${speakerIntro}\n\n`;
  SECTIONS.forEach((sec, i) => {
    const secContent = sectionTexts[sec.key] || "";
    if (calcCount(secContent) < 40) return;
    assembled += secContent + "\n\n";
    // 정보블록: 섹션 ⑤(checkPoint) 뒤 삽입
    if (sec.key === DENTAL_V2_PURPOSE_FLOW.infoBlockAnchor) {
      assembled += renderDentalV2InfoBlock(treatmentData, region) + "\n\n";
    }
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + "\n\n";
  });
  assembled = assembled.replace(/\n{3,}/g, "\n\n").trim();
  assembled = removeDuplicateSentences(assembled);

  // ⚠️ [v2.1] closingNote 하드코딩 제거 — 섹션 ⑦(closing)이 마무리 담당.
  //    (v2.0의 하드코딩 유보 문장이 closing과 중복돼 hedge 카운트 증가시켰음)

  // ── 해시태그 ──
  assembled += "\n\n" + buildDentalV2Hashtags(subKw, region);

  // ── 최종 clean ──
  assembled = cleanDentalV2Text(assembled, subKw, region);
  assembled = fixDentalTypo(assembled);   // [fix-typo] 결손 표현 보정
  assembled = neutralizeEffectClaim(assembled, subKw);   // [fix-effect] 효과 단정 중립화
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ── QC ──
  const qc = runDentalV2QC(assembled, subKw, region);
  console.log(`[dental-v2] 완료: ${qc.charCount}자 / mode=${validMode} / hedge=${qc.hedge} / timeline=${qc.timeline}`);
  if (qc.firstPerson > 0) console.warn(`[dental-v2] ⚠️ 환자 1인칭 ${qc.firstPerson}건 잔존 (병원형 위반)`);
  if (qc.ad > 0)          console.warn(`[dental-v2] ⚠️ 광고 표현 ${qc.ad}건 잔존`);
  if (qc.hedge > 2)       console.warn(`[dental-v2] ⚠️ 유보 문장 ${qc.hedge}건 (기준 2회 초과 — V1 결함 재발)`);
  if (qc.timeline > 0)    console.warn(`[dental-v2] ⚠️ 개인 타임라인 ${qc.timeline}건 잔존 (recoveryTimeline 폐기 위반)`);
  if (qc.intro > 1)       console.warn(`[dental-v2] ⚠️ 인사말 ${qc.intro}회 (정상 1회 — stripSpeakerIntro 누락)`);
  if (qc.effect > 0)      console.warn(`[dental-v2] ⚠️ 효과 단정 ${qc.effect}건 잔존 (의료광고 경계 — neutralizeEffectClaim 미포착)`);

  // ── 저장 ──
  const diagResult = { qc, treatmentId, mode: validMode, engineVersion: "v2-purpose" };
  try {
    await autoSave({ assembled, charCount: qc.charCount, subKw, region, seoScore: DENTAL_V2_PURPOSE_FLOW.seoPassScore, industry, storeId, diagResult });
  } catch (e) { console.warn(`[dental-v2] autoSave skip: ${e?.message}`); }

  // ── 이미지 메타 ──
  const images = [];
  let m; const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

  // ── VISIT-01: visitBlock 후단 1줄 (locationBlock 앞 → 🏥 → 📍 → #) ──
  assembled = insertVisitBeforeHashtags(assembled, _visitStore);
  // [v-loc] LocationBlock 후단 주입 (SOP v4.2 PATCH-07) — clean 후, 해시태그 위
  assembled = insertLocationBeforeHashtags(assembled, locStore);

  // ── 네이버 복사용 평문 ──
  const assembledMarkdown = assembled;
  const assembledPlain    = stripMarkdownForNaver(assembled);
  const charCountPlain    = calcCount(assembledPlain);

  return res.status(200).json({
    success: true,
    text: assembledPlain,
    textMarkdown: assembledMarkdown,
    content: assembledPlain,           // SOP v4.2 검수 #5: 3종 반환
    hashtags: hashtagsArr,
    images, charCount: charCountPlain,
    seoScore: DENTAL_V2_PURPOSE_FLOW.seoPassScore,
    mode: validMode,
    engineVersion: "v2-purpose",
    qc: { firstPersonCount: qc.firstPerson, adCount: qc.ad, fullKwCount: qc.fullKw, hedgeCount: qc.hedge, timelineCount: qc.timeline },
    validation: { passed: charCountPlain >= DENTAL_V2_PURPOSE_FLOW.minTotalLength, charCount: charCountPlain },
    publishGate: (() => {
      const ok = !!storeName && !/^(○+치과|\{병원명\})$/.test(storeName);
      return { storeNameOk: ok, storeName, reason: ok ? null : "store_name 실값 필요(주체 불명 발행 차단 §56①)" };
    })(),
  });
}
