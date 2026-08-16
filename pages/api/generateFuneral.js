// pages/api/generateFuneral.js
// 상조 생성 핸들러. 복사 베이스: generateDaycare.js
// 기능 모듈(cleanText/removeDuplicates/insertInfoBlock/QC)은 업종 공통 — 복사 사용.
// 비의료 → injectExamValue(수치 강제) 생략/대체.
import OpenAI from "openai";
// [A-7] 위치/주차 공통 후단 블록 — 전 업종 공유 기능 모듈(narrative 아님).
//   address 등 위치 5필드가 req.body로 오면 해시태그 직전에 "찾아오시는 길" 삽입.
//   필드 비면(일반글쓰기) buildLocationBlock="" → 미삽입(옵션① 자동 분기).
import { insertLocationBeforeHashtags } from "../../lib/locationBlock.js";
// [SAFE-DROP-01] 생성 후 안전삭제 Gate — 금지형 3종(주소→행동/정보→도움/닫는 인사)만 문장 삭제.
//   Facts 값 exact substring 포함 시 SKIP · 삭제로 이미지 캡션 종결이 되면 SKIP · 시설값→효과 무접촉.
import { applySafeDropGate } from "../../lib/funeral-postgen-gate.js";
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
// [HALLNAME-PREFIX-01] 광역단체 접두어. 공백 뒤 매칭만 — "서울특별시립승화원"류 무영향.
//   ★ 표시명에서는 제거하고, _hallKey 에서도 동일하게 제거해 매칭을 접두어 무관으로 만든다.
//     한쪽만 고치면 DB h.name 과 불일치 → matchFuneralHall 폴백 없음 → 생성 차단된다.
const _HALL_PREFIX = /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|충청북도|충청남도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)\s+/;

function normalizeHallName(raw) {
  let h = String(raw || "").trim().replace(/\s+/g, " ");
  if (!h) return "";
  h = h.replace(_HALL_PREFIX, "");
  h = h.replace(/(장례식장)\s*\1+/g, "$1");
  if (!/\s장례식장$/.test(h)) h = h.replace(/([^\s])장례식장$/, "$1 장례식장");
  return h.trim();
}

// [S4-DET-01] 실용 안내(S4) 원문 결정론 삽입.
//   ★ 계약: 이 문자열은 LLM 을 거치지 않는다. 가공·재정렬·어미 수정 0.
//     프롬프트 명문화로는 4회 시도 끝 PASS 후에도 재회귀했다(확인합니다 → 확인하는 것이 중요합니다).
//     따라서 프롬프트에서 재료를 회수하고 후처리에서 원문 그대로 넣는다.
//   ★ 호출 위치는 SafeDrop 이후 · 해시태그 이전. 삽입 뒤 어떤 후처리도 통과하지 않는다.
//   앵커: 정보블럭(■) 시작 줄 직전. 없으면 본문 끝.
function insertPracticalVerbatim(text, sentences) {
  const list = Array.isArray(sentences) ? sentences.filter(Boolean) : [];
  if (!list.length) return text;
  const para = list.join(" ");
  const lines = String(text).split("\n");
  const idx = lines.findIndex((l) => l.trimStart().startsWith("■"));
  if (idx < 0) return `${text.trimEnd()}\n\n${para}`;
  lines.splice(idx, 0, para, "");
  return lines.join("\n");
}

// 해시태그 생성 — 공백 제거(네이버 해시태그는 공백에서 끊김) + 중복 차단
function buildHashtags(region, hallName, body = "", treatment = null) {
  const nospace = (s) => String(s || "").replace(/\s+/g, "");
  const tags = [];
  const r = nospace(region);
  const h = nospace(hallName);
  // [HASHTAG-01] region×hallName 결합 제거 — region은 검색 생활권, hallName은 실제 시설.
  //   두 축을 붙이면 "#먹골역경희의료원장례식장"처럼 시설 소재지를 오표기한다.
  if (h) tags.push(h);
  // [HALL-REGION-02] HALL-REGION-01 개정 — 실명 시설이 있는 글에서는 생활권 지역태그를 만들지 않는다.
  //   region=상조 서비스 생활권 / hallName=실제 시설 소재지 — 두 지역의 의미가 다르다.
  //   01 은 "{생활권}상조"를 유지했다("활동 지역이지 시설 소재지 주장이 아니다").
  //   실측: 완성글에 서비스 지역을 서술하는 문장이 0건이라 그 의미가 독자에게 전달되지 않는다.
  //   시설 Fact "중랑구" + 태그 "#강북구상조" = 독자 기준 지역 모순. 따라서 h 존재 시 r 계통 전면 억제.
  if (r && !h) {
    tags.push(`${r}상조`);
    tags.push(`${r}장례식장`);
  }
  // [TAG-COST-01] "장례비용" 제거 — 본문은 비용 언급이 영구 금지(361~362행: 검증된 장례비용 필드 0개)인데
  //   태그만 비용을 노출해 왔다. 3편 연속 재현. 조건부로 살릴 근거가 없어 항목 자체를 뺀다.
  // [TAG-FAMILY-01] "가족장"은 삭제가 아니라 내용 연동 — funeralForm(P6) 자산에 실재하므로
  //   가족장 주제 글에서는 유효 태그다. 본문에 없는 편에서만 억제한다. 완성 BODY 문자열 검사(deterministic).
  tags.push("장례절차");
  // [TAG-MENU-01] funeral_procedure 한정 — treatment.keywords 를 태그로 승격.
  //   근거: Core 는 메뉴별 검색시장으로 분리됐는데(FUNERAL-OTHER-MENU-EXPOSURE-02)
  //         태그축은 「{지역}+상조」 골격에 남아 3개까지 떨어졌다.
  //   ★ 하드코딩 신규 태그 0 — data.js 의 기존 keywords 자산만 재사용한다.
  //   ★ id 완전일치 게이트. TARGET 외 treatment 는 진입하지 않는다(One Axis).
  //   ★ 중복은 아래 Set 이 흡수한다("장례절차"는 위 상수와 중복).
  //   ※ HOLD FUNERAL-TAG-CONSTANT-01 — 위 "장례절차" 무조건 부착은 별도 축에서 정리.
  if (treatment && treatment.id === "funeral_procedure") {
    for (const k of (treatment.keywords || [])) tags.push(nospace(k));
  }
  if (String(body || "").includes("가족장")) tags.push("가족장");
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
    .replace(_HALL_PREFIX, "")  // [HALLNAME-PREFIX-01] 접두어 유무 무관 매칭
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

    // [S4-DET-01] 요청 로컬 수집 객체 — 모듈/전역 상태 금지(serverless 요청 간 오염 방지).
    const _collect = { practical: [] };
    const userPrompt = buildPrompt({ treatment, region, storeName, hallName, hallFacts, _collect });

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
    out = applySafeDropGate(out, hallFacts).text;   // [SAFE-DROP-01] 해시태그 부착 전 BODY 에만 적용
    // [S4-DET-01] SafeDrop 이후 · 해시태그 이전. 원문 그대로 삽입, 이후 후처리 무통과.
    out = insertPracticalVerbatim(out, _collect.practical);
    // 마무리 해시태그
    out += `\n\n${buildHashtags(region, hallName, out, treatment)}`;

    // [A-7] 위치블록 후단 삽입 — 해시태그 줄을 떼어 [본문 + 찾아오시는길 + 해시태그] 재조립.
    //   _locStore 위치필드 전부 빈값(일반글쓰기)이면 buildLocationBlock=""→원문 그대로(부작용 0).
    out = insertLocationBeforeHashtags(out, _locStore);

    const qc = runQC(out, fullKeyword);

    return res.status(200).json({
      industry: "funeral",
      region,
      treatment: treatment.id,
      // [T-1] 제목 뒤 「｜상호」 부착. 상호 없음·길이 초과 시 원문 유지(제목 절단 없음).
      title: appendBrandSuffix(pickTitle(treatment, region, hallName, hallFacts), storeName, "funeral"),
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
  const t = pats[Math.floor(Math.random() * pats.length)] || "{region} 상조 장례 안내";
  return t
    .replace(/\{region\}/g, region)
    .replace(/\{hallName\}/g, hallName || "장례식장");
}
