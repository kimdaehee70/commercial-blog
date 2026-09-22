// pages/api/generateNursinghome.js
// 요양원(노인요양시설) 생성 핸들러. 복사 베이스: generateDaycare.js (단일호출형)
// 기능 모듈(cleanText/removeDuplicates/insertInfoBlock/QC)은 업종 공통 — 복사 사용.
// 비의료 → injectExamValue(수치 강제) 생략/대체.
// ★ daycare 원본 무수정. homecare·FREEZE 엔진 무접촉.
import OpenAI from "openai";
import crypto from "crypto"; // ★ RECOVERY-01: statement 불변 대조(MD5)
// [A-7 / PATCH-07] 위치/주차 공통 후단 블록 — 전 업종 공유 기능 모듈(narrative 아님).
//   address 등 위치 5필드가 req.body로 오면 해시태그 직전에 "찾아오시는 길" 삽입.
//   필드 비면(일반글쓰기) buildLocationBlock="" → 미삽입(옵션① 자동 분기).
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용
import { NURSINGHOME_PLAY_CONFIG } from "../../lib/nursinghome-playConfig.js";
import {
  NURSINGHOME_TREATMENTS,
  NURSINGHOME_FACT_PATTERNS, // ★ FACT_GATE 본문 검출 (PATCH-09 Gate)
  NURSINGHOME_PHOTO_POOL, // ⚠️ DEAD CODE (핸들러 미참조 — getImageAlts가 내부 사용): export 보존
  getBlockSignature, // ★ STEP 4-REWORK: PURPOSE ISOLATION 비교재료
  NURSINGHOME_FACT_STATEMENTS, // ★ SEGMENT-01: fact 세그먼트 조립
  getFactSlotsForTreatment,
} from "../../lib/nursinghome-data.js";
import {
  SYSTEM_PROMPT,
  FORBIDDEN,
  buildPrompt,
  buildOfficeIntro, // ⚠️ DEAD CODE (단일호출은 buildPrompt가 도입 내장 가정): 섹션화 시 복원
  stripOwnerSignature,
  getImageAlts,
  renderInfoBlocks,
  buildInfoBlocks,          // ★ READABILITY-A: 본문 인용 FACT 중복 생략 렌더
  getRenderedBlockTitles,   // ★ 실제 정보블록 출력 순서
  detectSpeakerViolation,   // ★ 미확인 화자 검출
  resolveFactSlots,         // ⚠️ DEAD CODE (SEGMENT-01 이후 미사용 — 인라인 마커 경로): 삭제 금지
} from "../../lib/nursinghome-prompts.js";
// ★ ENTAILMENT GENERATION WIRING (선장 승인 2026-09-22) — FREEZE 판정기 호출만. 판정기 무수정.
import { judgeParagraph } from "../../lib/nursinghome-entailment.js";

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
      return count > 3 ? "저희 요양원" : m;
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
function insertInfoBlock(text, treatment, block = renderInfoBlocks(treatment)) {
  // ★ STEP 4-REWORK: 4개 공통 블록 일괄 부착 → CAT별 [주 1 + 보조 2~3] 위계 렌더.
  //   Smoke FAIL 단일 원인이 이 후단 일괄 부착이었다.
  // ★ READABILITY-A: block 은 핸들러가 buildInfoBlocks(used) 로 넘긴다. 전부 생략되면 원문 그대로.
  if (!block) return text;
  // cost 섹션 부근에 삽입 — 마커 없으면 본문 끝 직전
  if (text.includes("[INFO_BLOCK]")) {
    return text.replace("[INFO_BLOCK]", block);
  }
  return `${text}\n\n${block}`;
}

// ★ 비의료 → 수치 강제 삽입 생략/대체
function injectExamValue(text) {
  // 요양원은 의료 수치 없음. 제도 수치(등급/부담률)는 정보블럭이 담당.
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
// ★ 3트랙 분리
//   forbiddenHit = 금칙어 위반(FAIL)
//   factGateHit  = 미입력 시설사실 창작(FAIL)
//   purposeMiss  = 이 CAT의 판단축이 본문에 구현되지 않음(FAIL) ← Purpose Spine 검증
//   FACT_GATE 용어 목록 자체를 금칙어로 취급하지 않는다. 단정 패턴만 검출한다.
function runQC(text, fullKeyword, treatment, infoBlocks = null) {
  const hasInfo = /^■ /m.test(text); // ★ 블록 제목이 CAT별로 달라지므로 부착 자체를 검사
  const kwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
  const fullKwCount = (text.match(/요양원|노인요양시설/g) || []).length;
  const forbiddenHit = FORBIDDEN.filter((w) => text.includes(w));

  // ★ FACT_GATE — 시설 고유 사실이 미입력인데 본문에 단정으로 등장하면 위반
  const factGateHit = NURSINGHOME_FACT_PATTERNS
    .filter((p) => p.re.test(text))
    .map((p) => p.key);

  // ★ Purpose Spine — 이 CAT 고유의 판단축이 본문에 실제로 다뤄졌는가.
  //   동일 소개문에서 키워드만 교체한 생성은 여기서 걸린다.
  const anchors = Array.isArray(treatment?.purposeAnchors) ? treatment.purposeAnchors : [];
  const purposeMiss = anchors.filter((a) => !text.includes(a));
  const purposeHit = anchors.length - purposeMiss.length;

  console.log("[QC] 정보블럭:", hasInfo);
  console.log("[QC] 키워드반복:", kwCount, "(5 이상 기준)");
  console.log("[QC] 완전체키워드:", fullKwCount, "(3회 이상 기준)");
  console.log("[QC] 금칙어 위반:", forbiddenHit.length ? forbiddenHit.join(",") : "없음");
  console.log("[QC] 사실게이트 위반:", factGateHit.length ? factGateHit.join(",") : "없음");
  // ★★ QC 재정의 2지표 (선장 지시 2026-09-21 — 이전 안 폐기)
  //   #175: 목적축 4/4 PASS 여도 콘텐츠는 FAIL 일 수 있다.
  //   "다뤘나"가 아니라 "주축인가"를 본다.
  const primaryRatio = evalPrimaryRatio(text, treatment, infoBlocks);
  const blockSignature = evalBlockSignature(text, treatment);

  // ★ 미확인 화자 검출 (선장 승인 ⑥)
  const speakerHit = detectSpeakerViolation(text);

  console.log("[QC] 목적축:", `${purposeHit}/${anchors.length}`, purposeMiss.length ? `(미구현: ${purposeMiss.join(",")})` : "");
  console.log("[QC] primaryRatio:", primaryRatio.score, JSON.stringify(primaryRatio.checks));
  console.log("[QC] blockSignature:", blockSignature.order, "| lead:", blockSignature.leadSig, "| ISOLATION 후보:", blockSignature.isolationCandidate);
  console.log("[QC] 정보블록 출력순서:", blockSignature.titles.join(" > "));
  console.log("[QC] 미확인 화자:", speakerHit.length ? speakerHit.join(",") : "0건");
  return {
    hasInfo, kwCount, fullKwCount, forbiddenHit, factGateHit,
    cat: treatment?.cat || "", purpose: treatment?.PURPOSE?.question || "",
    purposeHit, purposeTotal: anchors.length, purposeMiss,
    primaryRatio, blockSignature, speakerHit,
  };
}

// ───────── QC 재정의 ① primaryRatio ─────────
// ❌ 단어 빈도·키워드 위치 비율로 판정하지 않는다(키워드 반복 유도 방지).
// ✅ 구조 4항목 검사:
//    1) 선택 CAT의 핵심 답이 전반부에서 제시되는가
//    2) decision_points 가 본문의 주요 판단 흐름을 이루는가
//    3) 보조정보가 주 질문에 종속되는가(주 블록 선두 + 연결문맥 실제 출력)
//    4) 결론이 선택 CAT의 판단/next_action 으로 돌아오는가
function splitBody(text) {
  const i = text.indexOf("■ ");
  return i > 0 ? text.slice(0, i) : text;
}

function evalPrimaryRatio(text, treatment, infoBlocks = null) {
  const body = splitBody(text);
  const head = body.slice(0, Math.max(1, Math.floor(body.length * 0.4)));
  const tail = body.slice(Math.floor(body.length * 0.75));

  const primaryA = Array.isArray(treatment?.primaryAnswerAnchors) ? treatment.primaryAnswerAnchors : [];
  const decisionP = Array.isArray(treatment?.decisionPoints) ? treatment.decisionPoints : [];
  const closingA = Array.isArray(treatment?.closingAnchors) ? treatment.closingAnchors : [];
  const titles = getRenderedBlockTitles(treatment);

  // 1) 핵심 답 선(先)제시
  const leadAnswer = primaryA.length ? primaryA.some((a) => head.includes(a)) : false;
  // 2) 판단 흐름 구성 — decision_points 과반 이상이 본문에 실재
  const dpHit = decisionP.filter((d) => body.includes(d)).length;
  const decisionFlow = decisionP.length ? dpHit >= Math.ceil(decisionP.length / 2) : false;
  // 3) 보조정보 종속 — 주 블록이 첫 블록으로 출력 + 보조 블록 연결문맥 실제 출력
  const firstTitle = titles[0] || "";
  // ★ READABILITY-A: 주 블록이 본문 전량 인용으로 생략된 경우 = 주 내용이 본문에 있음 → 충족
  const primaryOmitted = !!firstTitle && !!infoBlocks?.omitted?.includes(firstTitle);
  const primaryFirst = firstTitle ? (primaryOmitted || text.indexOf(`■ ${firstTitle}`) >= 0) : false;
  const plan = getBlockSignature(treatment?.id);
  const supportSubordinate = primaryFirst && !plan.generic;
  // 4) 결론 회귀
  const closingReturn = closingA.length ? closingA.some((a) => tail.includes(a)) : false;

  const checks = { leadAnswer, decisionFlow, supportSubordinate, closingReturn };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    detail: { dpHit, dpTotal: decisionP.length, firstBlock: firstTitle },
    score: `${passed}/4`,
    pass: passed === 4,
  };
}

// ───────── QC 재정의 ② blockSignature ─────────
// ❌ 동일 signature 단독 FAIL 금지 (CAT이 달라도 보조정보는 겹칠 수 있다).
// ✅ 블록 순서 + 연결문맥 + 결론 흐름이 실질적으로 동일할 때 PURPOSE ISOLATION FAIL "후보".
//    → 단일 생성 내에서는 교차 비교가 불가하므로 비교재료를 산출하고,
//      CAT 문맥화가 0건(=일괄 부착 회귀)일 때만 후보로 표시한다. 최종 판정은 CAT 간 비교.
function evalBlockSignature(text, treatment) {
  const sig = getBlockSignature(treatment?.id);
  const titles = getRenderedBlockTitles(treatment);
  const renderedOrder = titles.filter((t) => text.includes(`■ ${t}`));
  return {
    order: sig.order,
    leadSig: sig.leadSig,
    titles,
    renderedOrder,
    contextualized: sig.contextualized,
    isolationCandidate: sig.generic, // true = 연결문맥 미적용(일괄 부착 회귀)
    note: "단독 FAIL 금지. 타 CAT과 order+leadSig+결론흐름이 실질 동일할 때만 FAIL 후보.",
  };
}

// ───────── ★ CARE-FACILITY-FACT-EXPLANATION-RECOVERY-01 — 문단 조립·FACT Gate ─────────
// FACT = 사실의 경계 / GPT = 설명 / CODE = 구조·사용범위 통제.
//   - 출력 = {"paragraphs":[{"text", "facts":[]}]}. 본문에 statement 를 삽입하지 않는다(접착·기계적 반복 원천 차단).
//   - 구조 이상 → throw → 500. 원문 폴백 금지.
//   - 아래는 청소하지 않고 기록 + Gate FAIL:
//       citeInvalid   HOLD·미정의·플랜 밖·src 불일치 id 인용
//       numericSrc    문단 수치 토큰이 그 문단이 선언한 FACT statement 에 없음
//       misplaced     본문 text 안 {{ }} / FACT: 표기 / fact id 문자열
//       noCitation    전 문단 facts 가 비어 있음(제도 답 부재)
//   - 의미(조건·대상·확정성·인과) 확대/축소는 사람 검수. 코드 PASS ≠ 의미 PASS.
class SegmentStructureError extends Error {}

function parseParagraphs(raw) {
  let obj;
  try {
    obj = JSON.parse(String(raw).trim());
  } catch (e) {
    throw new SegmentStructureError("json_parse_failed");
  }
  const paras = obj?.paragraphs;
  if (!Array.isArray(paras) || paras.length === 0) throw new SegmentStructureError("paragraphs_not_array");
  paras.forEach((p, i) => {
    if (!p || typeof p.text !== "string" || !p.text.trim()) throw new SegmentStructureError(`bad_text@${i}`);
    if (!Array.isArray(p.facts) || !p.facts.every((f) => typeof f === "string")) throw new SegmentStructureError(`bad_facts@${i}`);
  });
  return paras;
}

// 수치 토큰(연속 숫자) 추출 — 특정 문구 목록이 아닌 구조 신호
function numTokens(str) {
  return String(str).match(/[0-9]+(?:\.[0-9]+)?/g) || [];
}

function assembleParagraphs(paras, treatment) {
  const { active } = getFactSlotsForTreatment(treatment?.id);
  const activeMap = new Map(active.map((st) => [st.id, st.text]));
  const allIds = NURSINGHOME_FACT_STATEMENTS.map((st) => st.id);

  const perPara = [];
  const citeInvalid = [];
  const numericSrc = [];
  const misplaced = [];
  const usedSet = new Set();

  paras.forEach((p, i) => {
    const text = p.text.trim();
    const facts = [...new Set(p.facts.map((f) => f.trim()).filter(Boolean))];
    const bad = facts.filter((f) => !activeMap.has(f));
    if (bad.length) citeInvalid.push({ para: i, ids: bad });
    facts.filter((f) => activeMap.has(f)).forEach((f) => usedSet.add(f));

    // numeric-source: 문단 수치 ⊂ 선언 FACT statement 수치
    const allowed = new Set(facts.filter((f) => activeMap.has(f)).flatMap((f) => numTokens(activeMap.get(f))));
    const nums = [...new Set(numTokens(text))];
    const unsourced = nums.filter((n) => !allowed.has(n));
    if (unsourced.length) numericSrc.push({ para: i, nums: unsourced, facts });

    const idHit = allIds.filter((id) => text.includes(id));
    if (/\{\{|\}\}|FACT\s*:/i.test(text) || idHit.length) misplaced.push({ para: i, ids: idHit });

    perPara.push({ i, facts, nums, chars: text.length });
  });

  const body = paras.map((p) => p.text.trim()).join("\n\n");
  return {
    text: body,
    perPara, citeInvalid, numericSrc, misplaced,
    used: [...usedSet],
    noCitation: usedSet.size === 0,
    bodyChars: body.replace(/\s/g, "").length,
    activeIds: active.map((st) => st.id),
  };
}

// statement 14건 불변 대조
function statementsDigest() {
  const payload = JSON.stringify(
    NURSINGHOME_FACT_STATEMENTS.map((st) => [st.id, st.text, st.src, st.srcText])
  );
  return crypto.createHash("md5").update(payload, "utf8").digest("hex");
}

// ───────── 핸들러 ─────────
export default async function handleNursinghome(req, res) {
  try {
    // [배선 / PATCH-02·03] 입력은 req.body (라우터 handle(req,res) 경로 — daycare 동형)
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

    // 메뉴 매칭 (daycare 동형: program.id → name)
    const treatment =
      NURSINGHOME_TREATMENTS.find((t) => t.id === program?.id) ||
      NURSINGHOME_TREATMENTS.find((t) => t.name === program?.name) ||
      NURSINGHOME_TREATMENTS[0];

    const fullKeyword = `${region} 요양원`;
    const systemPrompt = SYSTEM_PROMPT.replace(/\{region\}/g, region);
    const userPrompt = buildPrompt({ treatment, region, storeName });

    // ── GPT 호출 (단일 호출) — ★ SEGMENT-01: JSON segments 강제 ──
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content || "";

    // ★ 문단 파싱·조립 (구조 이상 → SegmentStructureError → 500, 원문 폴백 금지)
    const paras = parseParagraphs(raw);
    const _pg = assembleParagraphs(paras, treatment);

    // ★ Entailment Gate — 문단별 병렬 판정. 기록 전용(본문 변경·재생성·HTTP 차단 없음).
    //   judgeParagraph 는 내부에서 예외를 흡수(JUDGE_INVALID)하나, Promise.all reject 경로 차단용 catch 추가.
    const _ent = await Promise.all(
      paras.map((p) =>
        judgeParagraph(openai, { text: p.text.trim(), factIds: p.facts }).catch((e) => ({
          verdict: "FAIL", status: "JUDGE_INVALID", error: `wiring_catch:${String(e?.message || e)}`,
          types: [], claims: [], missing_elements: [], rejectedIds: [],
        }))
      )
    );

    // ── 후처리 순서 (기능, 절대 유지) ──
    // ⓪문단 조립 ①cleanText ②중간 해시태그 제거 ③insertInfoBlock ④injectExamValue
    // ⑤removeDuplicates ⑥서명 제거 ⑦이미지 슬롯 ⑧해시태그 ⑨위치블록
    let out = cleanText(_pg.text, fullKeyword);
    // ★ READABILITY-②-b: 논문체 접속어만 제거(문장·문단 보존). 판정은 이미 원문으로 끝남.
    out = out.replace(/(결론적으로|이러한 정보를 바탕으로)\s*,?\s*/g, "");
    out = out.replace(/#[^\s#]+/g, (m, off) => (off < out.length - 200 ? "" : m)); // 중간 해시태그 제거
    // ★ READABILITY-A' (선장 승인 2026-09-22): 하단 생략 기준 = Entailment PASS 문단이 인용한 FACT 만.
    //   _pg.used(인용 선언)는 올바른 전달을 보장하지 않는다 → FAIL 문단 인용 FACT 는 하단 원문 유지.
    const _activeSet = new Set(_pg.activeIds);
    const _passUsed = [...new Set(paras.flatMap((p, i) =>
      _ent[i]?.verdict === "PASS" ? p.facts.map((f) => f.trim()).filter((f) => _activeSet.has(f)) : []))];
    const _ib = buildInfoBlocks(treatment, _passUsed);
    out = insertInfoBlock(out, treatment, _ib.text);
    out = injectExamValue(out);
    out = truncateClosingResummary(out);
    out = removeDuplicates(out);
    out = stripOwnerSignature(out);   // [fix] 이미지 슬롯 삽입 전 서명 제거 ($ 앵커 매칭 보존)
    out = injectImageSlots(out, region);
    // 마무리 해시태그 — ★ 입소가능·대기없음 류 시점성 태그 금지
    out += `\n\n#${region}요양원 #노인요양시설 #장기요양등급 #요양원입소상담 #치매돌봄`;

    // [A-7 / PATCH-07] 위치블록 후단 삽입 — 해시태그 줄을 떼어 [본문 + 찾아오시는길 + 해시태그] 재조립.
    //   _locStore 위치필드 전부 빈값(일반글쓰기)이면 buildLocationBlock=""→원문 그대로(부작용 0).
    //   QC/글자수 카운트는 이 줄 이후 runQC에서 산출(주소 1회 노출은 키워드 반복 무관).
    out = insertLocationBeforeHashtags(out, _locStore);

    const qc = runQC(out, fullKeyword, treatment, _ib);
    qc.infoBlocks = { basis: _passUsed, rendered: _ib.titles, omitted: _ib.omitted, omittedItems: _ib.omittedItems };
    console.log("[QC] 하단생략 기준(PASS 문단 인용):", _passUsed.join(",") || "없음");
    console.log("[QC] 하단블록 중복생략: item", _ib.omittedItems, "| 블록째 생략:", _ib.omitted.join(",") || "없음");
    // ★ RECOVERY-01 FACT Gate — 구조·출처 판정 (의미 정확성 PASS 아님. 의미 검수는 사람)
    const reasons = [];
    if (_pg.citeInvalid.length) reasons.push("cite_invalid");
    if (_pg.numericSrc.length) reasons.push("numeric_unsourced");
    if (_pg.misplaced.length) reasons.push("misplaced");
    if (_pg.noCitation) reasons.push("no_citation");
    const digest = statementsDigest();
    qc.factGate = {
      paragraphs: _pg.perPara, used: _pg.used,
      citeInvalid: _pg.citeInvalid, numericSrc: _pg.numericSrc, misplaced: _pg.misplaced,
      bodyChars: _pg.bodyChars, statementsMd5: digest, active: _pg.activeIds,
      gate: reasons.length ? "FAIL" : "PASS", reasons,
    };
    _pg.perPara.forEach((p) =>
      console.log(`[QC] para#${p.i} facts:`, p.facts.length ? p.facts.join(",") : "[]",
        "| nums:", p.nums.join(",") || "-", "| chars:", p.chars));
    console.log("[QC] numeric-source:", _pg.numericSrc.length ? JSON.stringify(_pg.numericSrc) : "PASS");
    console.log("[QC] invalid/HOLD 인용:", _pg.citeInvalid.length ? JSON.stringify(_pg.citeInvalid) : "0",
      "| misplaced:", _pg.misplaced.length);
    console.log("[QC] 블록 제외 본문 글자수(공백제외):", _pg.bodyChars);
    console.log("[QC] statements MD5:", digest);
    console.log("[QC] FACT Gate:", qc.factGate.gate, reasons.join(",") || "");

    // ★ Entailment Gate 기록 — FAIL / JUDGE_INVALID 하나라도 있으면 FAIL
    const _ENT_FAIL_V = new Set(["EXPANDED", "UNSUPPORTED"]);
    const entFails = _ent.map((r, i) => ({ i, ...r })).filter((r) => r.verdict !== "PASS");
    qc.entailGate = {
      gate: entFails.length ? "FAIL" : "PASS",
      judged: _ent.length,
      fails: entFails.map((r) => ({
        para: r.i, status: r.status, types: r.types || [], error: r.error || null,
        rejectedIds: r.rejectedIds || [],
        claims: (r.claims || []).filter((c) => _ENT_FAIL_V.has(c.verdict)).map((c) => ({
          span: c.claim_span, verdict: c.verdict, fact: c.restates_fact, types: c.types_effective,
        })),
      })),
    };
    _ent.forEach((r, i) =>
      console.log(`[ENTAIL-GEN] para#${i} ${r.verdict} ${r.status}`, (r.types || []).join("+") || "-",
        r.rejectedIds?.length ? `rejected=${r.rejectedIds.join(",")}` : ""));
    console.log("[QC] Entailment Gate:", qc.entailGate.gate, entFails.map((r) => r.i).join(",") || "");

    return res.status(200).json({
      industry: "nursinghome",
      region,
      treatment: treatment.id,
      title: pickTitle(treatment, region),
      // [정합 / PATCH-09 #5] 프론트(index.js)는 data.text / data.textMarkdown 을 본문으로 읽는다.
      //   content만 반환 시 결과화면·복사·저장 0자 (lawyer v143 동일 버그 방지).
      text:         out,
      textMarkdown: out,
      content:      out,
      qc,
    });
  } catch (e) {
    if (e instanceof SegmentStructureError) {
      console.error("[QC] FACT Gate: FAIL structure", e.message);
      return res.status(500).json({ error: "nursinghome_segment_structure_invalid", detail: e.message });
    }
    console.error("[generateNursinghome] error:", e);
    return res.status(500).json({ error: "nursinghome_generation_failed", detail: String(e) });
  }
}

function pickTitle(treatment, region) {
  const pats = treatment.titlePatterns || [];
  const t = pats[Math.floor(Math.random() * pats.length)] || "{region} 요양원 안내";
  return t.replace(/\{region\}/g, region);
}
