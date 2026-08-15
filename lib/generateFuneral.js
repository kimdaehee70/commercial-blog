// pages/api/generateFuneral.js
// 상조 생성 핸들러. 복사 베이스: generateDaycare.js
// 기능 모듈(cleanText/removeDuplicates/insertInfoBlock/QC)은 업종 공통 — 복사 사용.
// 비의료 → injectExamValue(수치 강제) 생략/대체.
import OpenAI from "openai";
// [A-7] 위치/주차 공통 후단 블록 — 전 업종 공유 기능 모듈(narrative 아님).
//   address 등 위치 5필드가 req.body로 오면 해시태그 직전에 "찾아오시는 길" 삽입.
//   필드 비면(일반글쓰기) buildLocationBlock="" → 미삽입(옵션① 자동 분기).
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// [T-1] 제목 브랜드 접미사 — 「제목 ｜ 상호」. 전문서비스 화이트리스트 업종만 부착.
//   제목 조립 완료 문자열만 받는 후처리. Prompt·Spine·Data 무관.
import { appendBrandSuffix } from "../../lib/spine/titleBrandSuffix.js";
// ⚠️ DEAD CODE (현 단일호출 미사용 — 삭제 금지): 향후 섹션 FLOW 분기 복원 시 사용
import { FUNERAL_PLAY_CONFIG } from "../../lib/funeral-playConfig.js";
import {
  FUNERAL_TREATMENTS,
  FUNERAL_PHOTO_POOL, // ⚠️ DEAD CODE (핸들러 미참조 — getImageAlts가 내부 사용): export 보존
} from "../../lib/funeral-data.js";
import {
  SYSTEM_PROMPT,
  FORBIDDEN,
  buildPrompt,
  buildOfficeIntro, // ⚠️ DEAD CODE (단일호출은 buildPrompt가 도입 내장 가정): 섹션화 시 복원
  stripOwnerSignature,
  getImageAlts,
  renderInfoBlocks,
  resolveFuneralPreset,   // [세션58] 유형별 하단 블록 프리셋 결정 (id 우선 + text 폴백)
} from "../../lib/funeral-prompts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// ───────── [C-1] region / hallName 분리 (2026-07 실측 대응) ─────────
// 문제: 업체정보 region에 "중랑구 서울의료원장례식장"처럼 지역+시설명이 한 문자열로 저장됨.
//   → 화자 오염("중랑구 서울의료원장례식장 장례지도사"), 해시태그 붕괴(#중랑구 서울의료원장례식장상조),
//     fullKeyword 오염(cleanText가 엉뚱한 문자열을 "저희"로 치환)까지 연쇄 발생.
// 방침: 행정구역 접미(구/군/시/동/읍/면/리)까지를 region으로 확정. 잔여 문자열은 hallName 후보.
//   bodyHallName이 별도로 오면 그쪽이 우선(정상 입력 경로 보호).
const _ADMIN_SUFFIX = /^(.*?[가-힣]+(?:특별시|광역시|자치시|자치도|[시군구읍면동리]))\s*(.*)$/;

function splitRegionHall(raw) {
  const s = String(raw || "").trim().replace(/\s+/g, " ");
  if (!s) return { region: "", hall: "" };
  const m = s.match(_ADMIN_SUFFIX);
  if (!m) return { region: s, hall: "" };
  const region = (m[1] || "").trim();
  const rest = (m[2] || "").trim();
  // 잔여가 장례식장 계열 명칭일 때만 hall로 승격(일반 지역 2단 표기 "서울 중랑구" 오분리 방지)
  if (rest && /(장례식장|장례문화원|추모관|병원|의료원|센터)/.test(rest)) {
    return { region, hall: rest };
  }
  return { region: s, hall: "" };
}

// 장례식장명 정규화 — "을지대병원장례식장" → "을지대병원 장례식장" (해시태그·본문 가독)
//   이미 띄어져 있으면 그대로. "장례식장장례식장" 중복 제거.
function normalizeHallName(raw) {
  let h = String(raw || "").trim().replace(/\s+/g, " ");
  if (!h) return "";
  h = h.replace(/(장례식장)\s*\1+/g, "$1");
  if (!/\s장례식장$/.test(h)) h = h.replace(/([^\s])장례식장$/, "$1 장례식장");
  return h.trim();
}

// 해시태그 생성 — 공백 제거(네이버 해시태그는 공백에서 끊김) + 중복 차단
function buildHashtags(region, hallName) {
  const nospace = (s) => String(s || "").replace(/\s+/g, "");
  const tags = [];
  const r = nospace(region);
  const h = nospace(hallName);
  // [HASHTAG-01] region×hallName 결합 제거 — region은 검색 생활권, hallName은 실제 시설.
  //   두 축을 붙이면 "#먹골역경희의료원장례식장"처럼 시설 소재지를 오표기한다.
  if (h) tags.push(h);
  // [HALL-REGION-01] 실명 시설이 있는 글에서는 "{생활권}장례식장" 태그를 만들지 않는다.
  //   region=상조 서비스 생활권 / hallName=실제 시설 소재지 — 두 지역의 의미가 다르다.
  //   "#중화동장례식장"은 경희의료원이 중화동에 있다는 사실 오표기가 된다.
  //   ★ "{생활권}상조"는 유지 — 상조업체의 활동 지역이지 시설 소재지 주장이 아니다.
  if (r) {
    tags.push(`${r}상조`);
    if (!h) tags.push(`${r}장례식장`);
  }
  tags.push("장례절차", "가족장", "장례비용");
  return Array.from(new Set(tags.filter(Boolean))).map((t) => `#${t}`).join(" ");
}

// ───────── [C-3-2] 장례식장 시설 데이터 매칭 (STORE_PROFILE SoT) ─────────
// 출처: req.storeRuntime.store.visit_info.funeralHalls[] (C-2 입력 구조).
// 규칙: hallName ↔ hall.name 정규화 후 완전 일치 1건만 소비.
//   ★ 미일치 = 미소비(null). funeralHalls[0] 폴백 금지 —
//     시설 정보(주차·빈소·식당·안치실)는 시설별 고유값이라, 다른 장례식장 값을 노출하면
//     품질 문제가 아니라 오정보 제공이 된다(장례 업종 신뢰 붕괴).
function _hallKey(s) {
  return String(s || "")
    .replace(/\s+/g, "")      // 공백 무시 ("을지대병원 장례식장" = "을지대병원장례식장")
    .replace(/[·ㆍ,()]/g, "") // 구분자 무시
    .toLowerCase();
}

function matchFuneralHall(req, hallName) {
  const key = _hallKey(hallName);
  if (!key) return null;
  const halls = req?.storeRuntime?.store?.visit_info?.funeralHalls;
  if (!Array.isArray(halls) || !halls.length) return null;
  const hit = halls.find((h) => h && _hallKey(h.name) === key);
  return hit || null;   // 미일치 → null (폴백 없음)
}

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
      return count > 3 ? "저희" : m;
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
// [세션58] preset 전달 — 유형별 블록 선별. preset 미지정 시 전량(하위호환).
function insertInfoBlock(text, preset, hallFacts) {
  const block = renderInfoBlocks(preset, hallFacts);
  // 마커 없으면 본문 끝 직전
  if (text.includes("[INFO_BLOCK]")) {
    return text.replace("[INFO_BLOCK]", block);
  }
  return `${text}\n\n${block}`;
}

// ★ 비의료 → 수치 강제 삽입 생략/대체
function injectExamValue(text) {
  // 상조는 의료 수치 없음. 제도/비용 구조는 정보블럭이 담당.
  return text; // no-op (대체)
}

// closing 재요약 코드 절단
function truncateClosingResummary(text) {
  // closing 단계에서 GPT가 전체 재요약하는 경향 차단
  return text.replace(/(지금까지|앞서 말씀드린|요약하(자면|면))[^\n]*\n?/g, "");
}

// 본문에서 GPT 마커 의존 없이 이미지 슬롯 강제 삽입 후 박스 변환
function injectImageSlots(text, region, hallName) {
  const alts = getImageAlts({ region, hallName });
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
  const hasInfo = /장례 진행 순서|장례비용 구성|장례 형태|상조 이용/.test(text);
  const kwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;
  const fullKwCount = (text.match(/상조|장례/g) || []).length;
  const forbiddenHit = FORBIDDEN.filter((w) => text.includes(w));
  console.log("[QC] 정보블럭:", hasInfo);
  console.log("[QC] 키워드반복:", kwCount, "(5 이하 기준)");
  console.log("[QC] 완전체키워드:", fullKwCount, "(3회 이상 기준)");
  console.log("[QC] 금칙어 위반:", forbiddenHit.length ? forbiddenHit.join(",") : "없음");
  return { hasInfo, kwCount, fullKwCount, forbiddenHit };
}

// ───────── 핸들러 ─────────
export default async function handleFuneral(req, res) {
  try {
    // [배선] 입력은 req.body (라우터 handle(req,res) 경로 — daycare 동형)
    const {
      program, userRegion, region: regionFallback,
      storeName: bodyStoreName,
      // [장례식장명] 빈소/비용 글에서 {hallName} placeholder 치환용(선택, 빈값 OK)
      hallName: bodyHallName,
      // [A-7] 위치 5필드 — 발행코치=값 존재 / 일반글쓰기=빈값. locationBlock이 빈값 시 ""(미삽입).
      address, map_guide, transit, building_desc, parking_info,
    } = req.body;
    const regionRaw = userRegion || regionFallback || program?.region;
    // [C-1] region 오염 분리 — 업체정보에 region="중랑구 서울의료원장례식장"처럼
    //   지역+장례식장명이 한 문자열로 저장된 사례 실측(2026-07). 해시태그 붕괴·화자 오염의 원인.
    //   행정구역 토큰(구/군/시/동/읍/면)까지만 region으로 인정하고, 뒤에 붙은 시설명은 hallName으로 승격.
    const _split = splitRegionHall(regionRaw);
    const region = (_split.region || "지역").trim();
    const storeName = (bodyStoreName || "{storeName}").trim();
    const hallName = normalizeHallName(bodyHallName || _split.hall || "");
    // [방문형 전환] 상조=파견(출장) 업종 → 고정 사업장 「찾아오시는 길」 미노출.
    //   cleaning 등 24종 방문형과 동형: _locStore={} 로 위치 데이터 원천 차단.
    //   (hasPhysicalStore:false 게이트 + 이 빈 객체 = 라우터 strip·게이트 무관하게 블록 미생성)
    //   ⚠ address 등 5필드는 위 구조분해로 받되 _locStore에 넣지 않는다(회사주소 노출 방지).
    const _locStore = {};

    // 서비스 매칭 (daycare 동형: program.id → name)
    const treatment =
      FUNERAL_TREATMENTS.find((t) => t.id === program?.id) ||
      FUNERAL_TREATMENTS.find((t) => t.name === program?.name) ||
      FUNERAL_TREATMENTS[0];

    // [세션58] 하단 블록 프리셋 결정 — treatment.id 우선, 미매칭 시 주제명 text 폴백.
    const _preset = resolveFuneralPreset({
      treatmentId: treatment?.id,
      text: `${treatment?.name || ""} ${program?.name || ""}`,
    });

    const fullKeyword = `${region} 상조`;
    const systemPrompt = SYSTEM_PROMPT
      .replace(/\{region\}/g, region)
      // [WIRING-01B-α] 화자축 분리 — hallName을 화자에 주입하지 않는다.
      //   「{hallName} 장례지도사」는 한국어에서 해당 시설 소속으로 읽힌다(소속 오인).
      //   장례식장은 '정보 대상'이지 화자의 소속이 아니다. 화자는 항상 중립 고정.
      //   ⚠ 정보축(제목·본문 실명·hallRule·alt·태그)은 무접촉 — hallName 그대로 유지.
      .replace(/\{hallSpeaker\}/g, "");
    // [C-3-2] 시설 데이터 매칭 — 완전 일치 1건만. 미일치 시 null(일반 안내로 생성).
    const hallFacts = matchFuneralHall(req, hallName);
    console.log("[C-3-2] hallFacts:", hallFacts ? `matched(${hallFacts.name})` : "none");

    // ───────── [MISMATCH-GUARD-01] 실명 시설 요청의 fail-open 차단 ─────────
    // 문제: hallFacts=null이면 _flowHall 무Facts 지시 / 범용 판단자산 재주입 /
    //   service_hall 정적 FAQ(미검증 화장예약·이송비용) 부활 — 잠금 3개가 동시에 풀린다.
    //   그런데 hallRule·pickTitle·buildHashtags는 hallName 조건이라 실명은 그대로 살아남는다.
    //   결과 = 실명이 붙은 미검증 글. 무명 일반글보다 나쁘다. → GPT 호출 전 차단.
    // 게이트 3조건(㉯만 정확히 차단):
    //   ① bodyHallName — 사용자가 명시 입력한 값만. _split.hall 자동 승격(㉰)은 대상 아님
    //      (사용자가 입력한 적 없는 값으로 차단하면 원인을 설명할 수 없다).
    //   ② funeralHalls.length > 0 — 시설 미등록 계정(㉮)은 차단 대상 아님.
    //      등록이 0건이면 애초에 매칭 대상이 없다. 차단하면 funeral_hall 메뉴가 전면 불능이 된다.
    //   ③ hallFacts === null — 등록은 돼 있는데 이름이 어긋난 경우.
    // ★ 422 코드를 보존하는 이유: 미매칭 발생 자체가 aliases[] 설계의 실측 근거다.
    //   어떤 이름이 얼마나 어긋나는지 모르면 별칭에 무엇을 넣을지 결정할 수 없다.
    const _guardHalls = req?.storeRuntime?.store?.visit_info?.funeralHalls;
    if (
      String(bodyHallName || "").trim() &&
      Array.isArray(_guardHalls) && _guardHalls.length > 0 &&
      hallFacts === null
    ) {
      console.warn("[MISMATCH-GUARD-01] blocked:", {
        input: hallName,
        registered: _guardHalls.map((h) => h && h.name).filter(Boolean),
      });
      return res.status(422).json({
        error: "HALL_FACTS_NOT_FOUND",
        message:
          `등록된 장례식장 정보와 입력하신 「${hallName}」이(가) 일치하지 않습니다.\n` +
          `등록된 이름: ${_guardHalls.map((h) => h && h.name).filter(Boolean).join(" / ")}\n` +
          `업체정보에 등록한 이름과 똑같이 입력해 주세요.`,
      });
    }

    // [INTENT-FACTS-GATE-01] 상류 단일 게이트 — treatment·hallFacts 확정 직후 1회.
    //   ★ _preset(위에서 이미 원본 id로 결정)과 응답 treatment.id 는 건드리지 않는다.
    //     사용자가 고른 메뉴는 그대로 두고, 약속 층위만 내린다.
    const _gate = applyIntentGate(treatment, hallFacts);
    if (_gate.safeMode) console.log("[INTENT-FACTS-GATE-01] SAFE:", _gate.reason);
    const _gTreatment = _gate.treatment;

    const userPrompt = buildPrompt({ treatment: _gTreatment, region, storeName, hallName, hallFacts });

    // ── GPT 호출 (단일 호출 — funeral-prompts 설계 그대로. 섹션 루프 미이식) ──
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
    });
    let raw = completion.choices[0]?.message?.content || "";

    // [장례식장명] {hallName} placeholder 치환 (값 있으면 실명, 없으면 일반 표현)
    if (hallName) {
      raw = raw.replace(/\{hallName\}/g, hallName);
    } else {
      raw = raw.replace(/\{hallName\}/g, "장례식장");
    }

    // [storeName] 본문 상호 노출 차단 (PHILOSOPHY 원칙1 — 매장명 본문 직접 노출 금지).
    //   GPT가 도입/마무리에 끼워넣은 {storeName} 토큰 + 실제 상호명 모두 본문에서 제거.
    //   위치/주차는 locationBlock(지형지물만)이 담당 — 본문엔 상호 미주입. hallName 로직과 대칭.
    raw = raw.replace(/\{storeName\}\s*/g, "");
    if (storeName && storeName !== "{storeName}") {
      raw = raw.replace(
        new RegExp(storeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "g"),
        ""
      );
    }
    // 토큰 제거로 생긴 이중 공백 정리("{region}  장례지도사" → "{region} 장례지도사")
    raw = raw.replace(/[ \t]{2,}/g, " ");

    // ── 후처리 순서 (기능, 절대 유지) ──
    // ①cleanText ②중간 해시태그 제거 ③insertInfoBlock ④injectExamValue
    // ⑤truncate ⑥removeDuplicates ⑦서명제거 ⑧이미지 ⑨해시태그
    let out = cleanText(raw, fullKeyword);
    out = out.replace(/#[^\s#]+/g, (m, off) => (off < out.length - 200 ? "" : m)); // 중간 해시태그 제거
    out = insertInfoBlock(out, _preset, hallFacts);   // [C-3-2] 매칭 시 hallFacility → 실데이터 블록
    out = injectExamValue(out);
    out = truncateClosingResummary(out);
    out = removeDuplicates(out);
    out = stripOwnerSignature(out);   // 이미지 슬롯 삽입 전 서명 제거 ($ 앵커 매칭 보존)
    out = injectImageSlots(out, region, hallName);
    // 마무리 해시태그
    out += `\n\n${buildHashtags(region, hallName)}`;

    // [A-7] 위치블록 후단 삽입 — 해시태그 줄을 떼어 [본문 + 찾아오시는길 + 해시태그] 재조립.
    //   _locStore 위치필드 전부 빈값(일반글쓰기)이면 buildLocationBlock=""→원문 그대로(부작용 0).
    out = insertLocationBeforeHashtags(out, _locStore);

    const qc = runQC(out, fullKeyword);

    return res.status(200).json({
      industry: "funeral",
      region,
      treatment: treatment.id,
      // [T-1] 제목 뒤 「｜상호」 부착. 상호 없음·길이 초과 시 원문 유지(제목 절단 없음).
      title: appendBrandSuffix(pickTitle(_gTreatment, region, hallName, hallFacts), storeName, "funeral"),
      // [정합] 프론트(index.js)는 data.text / data.textMarkdown 을 본문으로 읽는다.
      //   content만 반환 시 결과화면·복사·저장 0자 (lawyer v143 동일 버그 방지).
      text:         out,
      textMarkdown: out,
      content:      out,
      qc,
    });
  } catch (e) {
    console.error("[generateFuneral] error:", e);
    return res.status(500).json({ error: "funeral_generation_failed", detail: String(e) });
  }
}

// ════════════════════════════════════════════════════════════════════
// [INTENT-FACTS-GATE-01] 답할 수 없는 질문을 제목·프롬프트가 약속하지 않게 한다.
//
//   실측 실패: 제목 "조문객 규모별 빈소 선택 안내" + Facts는 빈소 개수(9실)뿐.
//     _LEAD_Q.funeral_hallbooking = "빈소를 무엇을 기준으로 정하는가?" 가
//     "★ 최우선 — 본문의 가장 큰 비중을 이 질문의 답에 쓴다"로 주입되는데,
//     Facts-only 잠금은 "선택 기준·조문객 규모 도출 금지"다.
//     한 프롬프트 안에서 두 지시가 모순 → 모델은 최우선을 따르려 기준을 창작했다.
//   ★ 원인은 모델 일탈이 아니라 재료 없이 답을 요구한 프롬프트다.
//     BODY 잠금으로는 막을 수 없다 — 약속하는 시점에서 막는다.
//
//   ★ 안전모드(SAFE)는 사용자에게 보이는 새 메뉴가 아니다. 내부 생성 모드다.
//     사용자가 고른 메뉴명(treatment.name)·업종 범위는 그대로 유지하고,
//     "판단·기준·비교"를 약속하는 층위만 "확인된 사실 전달"로 내린다.
//
//   ★ _LEAD_Q 에 없는 id 를 쓰면 _axisOverride 가 이미 `if (!leadQ) return ""` 이므로
//     지배 질문이 자동으로 사라진다. funeral-prompts.js 무수정.
// ════════════════════════════════════════════════════════════════════

// 안전모드에서 쓰는 내부 id — _LEAD_Q / _AXIS_HALL 어디에도 등록하지 않는다.
const SAFE_INTENT_ID = "funeral_hall_info";

// INTENT별 개방 조건. fn(hallFacts) => boolean. 없으면 무조건 OPEN.
//   ★ 여기 등록되지 않은 필드명을 임의로 만들지 않는다.
//     Expanded Facts(hallArea 등)는 아직 미구축 → 해당 게이트는 사실상 상시 CLOSE.
const _INTENT_GATE = {
  // 빈소를 무엇을 기준으로 정하는가 → 빈소별 면적·수용 값이 있어야 답이 된다.
  funeral_hallbooking: (f) => _hasAny(f, ["hallArea", "hallCapacity"]),
  // 어디를 선택해야 하는가 → 비교 대상 복수 시설이 있어야 한다. 주입은 1건뿐.
  funeral_hall:        () => false,
  // 무엇 때문에 비용이 달라지는가 → 비용 화제 자체가 X등급(개방하지 않음).
  funeral_cost:        () => false,
  funeral_familycost:  () => false,
  // 어떤 형태를 선택하는가 / 지금 무엇부터 / 화장 예약 시점 / 무엇을 선택
  //   → 판단요소 자산 미보유. General Asset V2 확보 후 재판정.
  funeral_type:        () => false,
  funeral_afterdeath:  () => false,
  funeral_cremation:   () => false,
  funeral_compare:     () => false,
  funeral_postpaid:    () => false,
  // funeral_procedure — 절차 자산(A08/A09/A11) 보유. 미등록 = OPEN.
};

function _hasAny(f, keys) {
  if (!f || typeof f !== "object") return false;
  return keys.some((k) => String(f[k] || "").trim() !== "");
}

// 제목 어휘 게이트 — 약속 층위별 차단 패턴.
//   ★ 기존 FUNERAL-TITLE-FACT-GATE-01(필드 언급 여부)과 층위가 다르다. 병존한다.
const _TITLE_PROMISE_PATTERNS = [
  /규모별|인원별|평수|몇\s*평/,          // 면적·수용 값 필요
  /선택\s*기준|고르는|기준/,             // 선택 기준 자산 필요
  /비교|추천|어디가|어느\s*곳/,          // 복수 시설 필요
  /비용|가격|얼마|요금/,                 // 영구 CLOSE
  /예약\s*전|언제/,                      // 시점 기준 자산 필요
  /확인할\s*점/,                         // 확인 항목 = 판단 약속
];

// 안전모드 제목 — 확인된 사실 전달만 약속한다.
const _SAFE_TITLE_PATTERNS = [
  "{hallName} 이용 안내",
  "{hallName} 시설 안내",
  "{hallName} 장례 진행 시 알아둘 점",
];

// 안전모드 DIRECTION — 원본 DIRECTION 은 판단·기준을 요구한다(창작 원본).
//   예: funeral_hallbooking.effect = "예상 조문 인원·기간·식당 운영 기준으로 …"
//   실측 출력 "조문객의 예상 인원과 기간 등을 고려한 판단이 필요합니다" 의 출처다.
const _SAFE_DIRECTION = {
  concern: "이 장례식장에 무엇이 확인되어 있는지 알고 싶은 상황",
  effect:  "확인된 시설 정보를 값 그대로 전달한다. 선택 기준·비교·비용·규모 판단은 다루지 않는다.",
  hook:    "",
  keyword: "장례식장 안내",
};

// treatment 확정 + hallFacts 확정 직후 1회 호출. 상류 단일 지점.
//   반환 treatment 는 buildPrompt / pickTitle 에만 전달한다.
//   ★ _preset(하단 블록)·응답 treatment.id 는 원본 유지 — 사용자가 고른 메뉴 그대로.
function applyIntentGate(treatment, hallFacts) {
  const id = treatment?.id || "";
  const gate = _INTENT_GATE[id];
  const open = typeof gate === "function" ? !!gate(hallFacts) : true;
  if (open) return { treatment, safeMode: false, reason: "" };

  return {
    treatment: {
      ...treatment,
      id: SAFE_INTENT_ID,          // _LEAD_Q 미등록 → 지배 질문 소거
      DIRECTION: _SAFE_DIRECTION,  // 판단 요구 제거
      titlePatterns: _SAFE_TITLE_PATTERNS,
      _origId: id,
      _safeMode: true,
    },
    safeMode: true,
    reason: `${id}: 답에 필요한 Facts 미보유`,
  };
}

// [TITLE-01A] 비용형 제목 자격 — funeral_hall 한정.
//   ★ parkingFee는 주차 요금이지 장례비용 Facts가 아니다. 자격 없음.
//   ★ 현행 hallFacts 스키마에 검증된 장례비용 필드가 0개 → 사실상 비활성.
//     미래 필드명을 임의로 만들지 않는다. 정식 비용 필드가 추가될 때 아래 배열에만 등록한다.
const _COST_FACT_FIELDS = [];   // 비어 있음 = 비용형 제목 미발급

function _costTitleEligible(hallFacts) {
  if (!hallFacts || typeof hallFacts !== "object") return false;
  return _COST_FACT_FIELDS.some((f) => String(hallFacts[f] || "").trim());
}

function pickTitle(treatment, region, hallName, hallFacts = null) {
  let pats = treatment.titlePatterns || [];
  // [HALL-REGION-01] 실명 시설이 있는 글에서는 "{생활권} 장례식장 …" 제목을 만들지 않는다.
  //   region=상조 서비스 생활권 / hallName=실제 시설 소재지 — 의미가 다르다.
  //   실측: hallName="경희의료원 장례식장"(동대문구)인 글에 "하계동 장례식장 빈소 이용 안내" 발생.
  //   ★ titlePatterns 원본 무수정 — 소비 시점 필터. 무hallName 글은 {region} 패턴 그대로 사용.
  if (hallName) {
    const _noRegion = pats.filter((t) => !/\{region\}/.test(t));
    if (_noRegion.length) pats = _noRegion;   // 전멸 시 원본 유지(제목 없음 방지)
  }
  // [TITLE-01A] funeral_hall만 조건화. 타 메뉴 무접촉.
  if (treatment?.id === "funeral_hall" && !_costTitleEligible(hallFacts)) {
    const filtered = pats.filter((t) => !/비용/.test(t));
    if (filtered.length) pats = filtered;   // 전멸 시에는 원본 유지(제목 없음 방지)
  }
  // [FUNERAL-TITLE-FACT-GATE-01] 시설 Facts 없는 항목을 제목에서 주장하지 않는다.
  //   실측 근거: parking=null 인 서울의료원 표본에 「… 주차 및 장례 절차 안내」 제목 발생.
  //     hallName 필터 후 후보 3개 중 1개가 주차 패턴이라 1/3 확률로 재현된다.
  //   ★ 제목은 검색 결과에 그대로 노출된다 — 값이 없는 시설 속성을 제목이 약속하면
  //     본문이 그 약속을 채우려고 없는 정보를 만들어낸다(_flowHall Facts-only 규칙과 같은 이유).
  //   ★ hallFacts === null(공공데이터 미수록·미일치) = parking/halls 모두 없음으로 취급.
  //   ★ titlePatterns 원본 무수정 — TITLE-01A 와 동일한 소비 시점 필터.
  //   ★ funeral_hall 한정. funeral_hallbooking 은 주차·빈소 어휘 패턴이 없어 무접촉.
  if (treatment?.id === "funeral_hall") {
    const _has = (k) => String(hallFacts?.[k] || "").trim() !== "";
    if (!_has("parking")) {
      const f = pats.filter((t) => !/주차/.test(t));
      if (f.length) pats = f;               // 전멸 시 원본 유지(제목 없음 방지)
    }
    if (!_has("halls")) {
      const f = pats.filter((t) => !/빈소/.test(t));
      if (f.length) pats = f;
    }
  }
  // [INTENT-FACTS-GATE-01] 약속 어휘 차단 — 답할 재료가 없는 질문을 제목이 걸지 않는다.
  //   ★ 안전모드가 아니어도 적용한다. OPEN 판정은 "그 INTENT를 열어도 된다"는 뜻이지
  //     모든 제목 패턴이 안전하다는 뜻이 아니다(패턴은 INTENT 단위가 아니라 문장 단위).
  {
    const f = pats.filter((t) => !_TITLE_PROMISE_PATTERNS.some((re) => re.test(t)));
    if (f.length) pats = f;      // 전멸 시 원본 유지(제목 없음 방지)
  }
  const t = pats[Math.floor(Math.random() * pats.length)] || "{hallName} 이용 안내";
  return t
    .replace(/\{region\}/g, region)
    .replace(/\{hallName\}/g, hallName || "장례식장");
}
