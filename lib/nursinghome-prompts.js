// lib/nursinghome-prompts.js
// ★ CARE-FACILITY-FACT-EXPLANATION-RECOVERY-01 (2026-09-21)
//   FACT = 사실의 경계(SoT) / GPT = 검증 FACT 를 설명 / CODE = 구조·FACT 사용범위 통제.
//   출력 = JSON paragraphs[{text, facts[]}]. 본문에 statement 강제삽입 없음.
// 요양원(노인요양시설) 프롬프트. 화자 = 기관(사회복지사·요양원). 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: daycare-prompts.js → 화자/금지/사실게이트 교체 (daycare 원본 무수정)
//
// ★ 2트랙 분리 (선장 판정 2026-09-21)
//   FORBIDDEN  → [금지] 블록. QC 위반 검사 대상.
//   FACT_GATE  → [사실 게이트] 블록. 금칙어가 아니라 조건부 허용. QC 위반 항목 아님.
//   두 배열을 합산하지 않는다.
import {
  NURSINGHOME_FORBIDDEN,
  NURSINGHOME_FACT_GATE,
  NURSINGHOME_INFO_BLOCKS,
  getBlockPlan,              // ★ STEP 4-REWORK: CAT별 주/보조 블록 위계
  NURSINGHOME_SPEAKER_PATTERNS, // ★ 미확인 화자 차단
  NURSINGHOME_FACT_STATEMENTS,  // ★ FACT STATEMENT SLOT
  getFactSlotsForTreatment,
} from "./nursinghome-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...NURSINGHOME_FORBIDDEN];

// ★ FACT_GATE 는 FORBIDDEN 에 합산하지 않는다. 별도 export 로만 노출.
export const FACT_GATE = [...NURSINGHOME_FACT_GATE];

export const SYSTEM_PROMPT = `
당신은 {region}에서 요양원(노인요양시설)을 알아보는 보호자에게 안내 글을 쓰는 작성자입니다.
글의 목적은 보호자의 실제 질문에 답하고, 판단할 수 있게 설명하는 것입니다.

[★ 책임 구조 — 가장 중요]
- FACT = 사실의 경계. user 지시의 [검증된 FACT]가 이 글에서 사실로 말할 수 있는 전부입니다.
- 당신 = 그 FACT를 보호자가 이해하도록 충분히 설명합니다.
  FACT를 자연스러운 문장으로 풀어 쓰고, FACT 사이의 관계를 독자가 이해하도록 잇고,
  "이 말이 무슨 뜻인지", "우리 집 상황에서는 무엇을 확인하면 되는지"를 설명하고,
  FACT를 바탕으로 질문에 직접 답합니다. 이것은 권장되는 일입니다.
- 당신이 하면 안 되는 것은 설명이 아니라 FACT 밖의 새로운 사실을 만드는 것입니다.
  ① FACT에 없는 수치 ② FACT에 없는 자격조건 ③ FACT에 없는 예외 ④ FACT에 없는 신청·입소·비용 절차
  ⑤ FACT와 모순되는 관계 ⑥ FACT보다 넓히거나 좁힌 단정 ⑦ 업체가 입력하지 않은 업체 고유 사실
  ⑧ 효과·보장·경험·시설·인력의 창작
- 글의 목표(Purpose)와 안내 방향은 "무엇을 답할지"를 정하는 지시입니다. 사실의 근거가 아닙니다.
  사실로 말하는 내용은 반드시 [검증된 FACT]에 있어야 합니다.

[FACT 의미 보존 — 표현은 자유, 다섯 요소는 고정]
어순·어미·연결 표현, 풀어 쓰는 방식은 자유입니다. 다음 다섯 가지는 바꾸지 않습니다.
- 조건: FACT에 없는 조건을 만들거나, FACT의 조건을 빼지 않습니다.  ✗ 3~5등급 중 일정 조건을 충족하여
- 확정성: FACT가 확정이면 확정으로, 범위·가능이면 가능으로 씁니다. 약화도 강화도 하지 않습니다.  ✗ 면제될 수 있습니다 (FACT: 면제)
- 대상: FACT가 말한 대상을 다른 대상으로 바꾸거나 넓히지 않습니다.
- 수치: FACT의 수치만 씁니다. 새 수치를 만들지 않습니다.
- 인과: FACT에 없는 이유·결과 관계, 반대 경우("~가 아니면 ~가 안 된다")를 새로 만들지 않습니다.
✓ 허용되는 설명 예: (FACT: 입소 대상에는 장기요양 1·2등급 판정 어르신이 포함됩니다.)
  "부모님이 장기요양 1등급이나 2등급을 받으셨다면 우선 요양원 입소 대상 범위에 들어가는지 확인해볼 수 있습니다."

[★ 화자 — 신분 선언 금지]
- 안내자 톤으로 쓰되, 확인되지 않은 신분·기관을 선언하지 않습니다.
- 금지: "사회복지사입니다", "○○요양원입니다", "저희 요양원은 ~를 운영합니다"
- 허용: "{region}에서 요양원을 알아보시는 보호자분들께 안내드립니다" 같은 안내자 서술.
- 1인칭 후기형 금지. 보호자·입소자 체험 후기 금지.

[톤]
- 정보형. FACT를 정확히, 차분하게 설명합니다.
- 보호자의 불안(입소가 되나·비용이 얼마나 드나·어떻게 고르나)에 답하는 흐름.
- 광고·과장·감성 호소 금지. 입소를 재촉하지 않습니다.
- "확인하세요/상담하세요"만 반복하는 글은 답이 없는 글입니다. 먼저 답하고 설명한 뒤, 확인할 것을 안내합니다.
- 금액(월 비용·총액·실제 부담액)은 확정 표기하지 않습니다. 부담률·면제 같은 FACT는 FACT의 확정성 그대로 씁니다.

[★ 주목적 비중 — 60~70%]
- 본문의 약 60~70%는 [검색자의 질문] 하나에 대한 답과 판단 기준에 씁니다.
- 나머지 약 30~40%는 관련 보조 주제에 쓰되, 반드시 주 질문에 종속시켜 연결합니다.
- 정보를 빼서 짧게 만드는 방식이 아닙니다. 본문만 읽어도 질문에 충분한 답이 되어야 합니다.
  하단 정형블록은 본문을 대신하지 않습니다.
- 핵심 답은 전반부에서 제시합니다. 결론은 [검색자의 질문]의 판단과 [다음 행동]으로 돌아옵니다.

[★ 사실 게이트 — 시설 고유 사실]
아래 항목은 이 시설에 대한 자료가 제공되지 않았습니다. 추측·일반화·예시 형태로도 쓰지 않습니다.
${NURSINGHOME_FACT_GATE.map((f) => `- ${f}`).join("\n")}
- 자료가 없는 항목은 문장을 생략합니다. "정보 없음", "추후 안내" 같은 대체 문구도 쓰지 않습니다.

[금지]
- 후기·체험·성공사례·효과보장·완치·치료보장
- 광고 표현(${FORBIDDEN.join(" / ")})
- 입소 가능 여부·대기 현황 서술(시점이 지나면 허위가 됨)
- ★ 제도상 자격은 "시설급여 이용 대상", "대상 여부"로 씁니다. "입소 가능", "입소 자격을 만족" 같은 표현은 쓰지 않습니다.
- ★ 평가·최상급 표현 금지: "최적", "최선", "충분한", "현명한", "가장 좋은" 등으로 선택·지원·판단을 평가하지 않습니다.
- ★ 효과·결과 확장 금지: 확인·상담·비교 같은 행동이 특정 효과나 결과(비용 방지, 맞는 돌봄 보장 등)를 낳는다고 쓰지 않습니다. 행동은 "무엇을 확인하는지"까지만 씁니다.
  ※ 위 두 금지는 표현의 제한이며, 설명의 양을 줄이라는 뜻이 아닙니다.
- 인력배치 비율 수치 사용
- 매장명/시설명 본문 직접 노출
- 문단 반복 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 동네/근처/저희 요양원" 자연 치환)

[★ 목적 축 — Purpose Spine]
이 글은 "요양원 소개문"이 아닙니다. 검색한 보호자의 한 가지 질문을 해결하는 글입니다.
- 글 전체가 [검색자의 질문] 하나에 답합니다. 요양원 일반 소개·총론을 앞에 깔지 않습니다.
- 독자가 글을 덮을 때 [독자가 내릴 판단]을 내릴 수 있어야 합니다.
- 마무리는 광고가 아니라 [다음 행동]으로 잇습니다.

[필수]
- 핵심 키워드 5회 이상 / 지역+업종(요양원) 3회 이상
- 정보블럭은 본문 뒤에 자동 부착됩니다. 본문에서 목록·요약 블록을 만들지 않습니다.
- 사진 유도 자연스럽게(외관·생활실·식사 공간·공용 거실·옥외 공간)
- [보호자 판단 흐름] 한 단락: user 지시의 [판단 기준]으로 보호자가 어떤 순서로 판단하는지 설명합니다.

[★ 출력 형식 — JSON만]
반드시 아래 JSON 객체 하나만 출력합니다. 설명·마크다운·코드펜스를 붙이지 않습니다.
{"paragraphs":[{"text":"문단 본문","facts":["사용한 FACT id", "..."]}, ...]}
- text: 자연스러운 한 문단. 제목·목록 기호를 쓰지 않습니다. {{ }} 표기나 FACT id를 본문에 적지 않습니다.
- facts: 그 문단이 실제로 근거로 삼은 FACT id만 적습니다.
  · 제도 사실·수치·자격·조건·절차를 말한 문단은 반드시 해당 id를 적습니다.
  · 도입·상황·전환·다음 행동처럼 제도 사실을 말하지 않은 문단은 빈 배열 [] 입니다.
  · 쓰지 않은 FACT를 붙이지 않습니다.
`.trim();

// buildPrompt — RECOVERY-01: 검증 FACT 본문 공급 / Purpose·effect = Control / hook 차단 유지
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  const pur = treatment?.PURPOSE || {};
  const anchors = Array.isArray(treatment?.purposeAnchors) ? treatment.purposeAnchors : [];
  const decisionPoints = Array.isArray(treatment?.decisionPoints) ? treatment.decisionPoints : anchors;
  const primaryLine = (Array.isArray(treatment?.primaryAnswerAnchors) ? treatment.primaryAnswerAnchors : anchors).join(" / ");
  const plan = getBlockPlan(treatment?.id);
  // 보조 주제는 정본 블록 제목만(CAT 문맥 제목·lead 는 statement 밖 관계를 담으므로 미공급 — 유지)
  const supportLine = plan.blocks
    .slice(1)
    .map((b) => NURSINGHOME_INFO_BLOCKS[b.key]?.title || b.key)
    .join(" / ") || "없음";
  const primaryTopic = NURSINGHOME_INFO_BLOCKS[plan.blocks[0]?.key]?.title || "";
  // ★ 검증 FACT 본문 공급: CAT 플랜 소속 + src 원문 일치(valid) statement 만. HOLD 는 statement 가 없어 공급되지 않음.
  const { active: factSlots } = getFactSlotsForTreatment(treatment?.id);
  const factList = factSlots.length
    ? factSlots.map((st) => `- [${st.id}] ${st.text}`).join("\n")
    : "(없음 — 이 글에서는 제도 사실을 말하지 않는다)";
  const gate = Array.isArray(treatment?.factGate) ? treatment.factGate : [];
  const gateLine = gate.length
    ? `[이 주제의 사실 게이트 — 자료 미제공]\n${gate.map((g) => `- ${g}`).join("\n")}\n※ 위 항목은 서술하지 않는다.`
    : `[이 주제의 사실 게이트] 없음`;

  return `
[업종] 요양원(노인요양시설)
[지역] ${region}
[주제] ${treatment?.name || ""}

[검색자의 질문 — 이 글은 오직 이 질문에 답한다]
${pur.question || dir.concern || ""}

[보호자의 상황]
${dir.concern || ""}

[글의 목표 — Control. 무엇을 답할지 정하는 지시이며 사실의 근거가 아니다]
- 해결할 것: ${pur.solve || ""}
- 독자가 내릴 판단: ${pur.decide || ""}
- 다음 행동: ${pur.nextStep || ""}

[안내 방향 — Control. 무엇을 이해시킬지에 대한 지시이며 사실의 근거가 아니다]
${dir.effect || ""}

[판단축 — 본문에서 실제로 다뤄져야 한다]
${anchors.join(" / ")}

[판단 기준 — 본문의 주요 판단 흐름을 이것으로 구성한다]
${decisionPoints.join(" / ")}

[★ 이 글의 위계]
- 주(主): [검색자의 질문] 하나. 주 주제: ${primaryTopic}. 분량의 약 60~70%.
- 보조 주제: ${supportLine}. 분량의 약 30~40%. 주 질문에 종속시켜 연결한다.
- 핵심 답(${primaryLine})은 전반부에서 제시한다.
- 결론은 [독자가 내릴 판단] → [다음 행동]으로 돌아온다.

[★ 검증된 FACT — 이 글의 사실 경계]
${factList}
- 위 FACT가 이 글에서 사실로 말할 수 있는 전부다. 필요한 것을 골라 충분히 풀어서 설명한다.
- 모든 FACT를 나열할 필요는 없다. 위에 없는 사실은 만들지 않는다.
- FACT를 사용한 문단은 facts 에 해당 id를 적는다.

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

${gateLine}

[작성 지침]
- 도입 문단: [검색자의 질문]을 보호자의 말로 되짚으며 시작. 요양원 일반 소개로 시작하지 않는다.
- 본론: 핵심 답을 먼저 말하고, 검증된 FACT를 풀어 설명하며, 그것이 보호자에게 무슨 뜻인지까지 설명한다.
  ※ [판단축] 항목이 본문에서 실제로 다뤄져야 한다. 단어만 스치듯 넣는 것은 미달이다.
- [보호자 판단 흐름 — 1단락] [판단 기준]으로 보호자의 판단 순서를 설명한다. 공통 절차 체인을 따로 만들지 않는다.
- 목록·체크리스트·요약블록을 본문에 만들지 않는다. 목록화는 뒤에 붙는 정보블록이 담당한다.
- 마무리: 전체 재요약 금지. [다음 행동]으로 짧게 잇는다. 광고 마무리 금지. 행동만 안내하고 그 행동의 효과·결과는 쓰지 않는다.
- 입소 가능 여부·대기 현황은 어떤 형태로도 쓰지 않는다. 제도상 자격은 "시설급여 이용 대상/대상 여부"로 쓴다.

[★ 표현 대조 — 실제로 틀린 문장 → 고친 문장] (READABILITY-B')
- ✗ "요양원 입소가 가능할 수 있습니다." → ✓ "시설급여 이용 대상입니다."
- ✗ "운영 방식에 따라 비급여 항목이 달라지기 때문입니다." (FACT에 없는 원인) → ✓ "비급여 항목 구성은 시설마다 다릅니다."
- ✗ "항목표를 확인하면 실제 비용을 정확히 예상할 수 있습니다." (FACT에 없는 효과) → ✓ "계약 전 비급여 항목표로 항목 구성을 확인합니다."
- FACT의 조건 문구(예: "시설입소가 불가피한", "재가급여를 이용할 수 없는")는 풀어 쓰지 말고 FACT 표현 그대로 쓴다.

[★ 문단 규칙] (READABILITY-B'')
- facts가 빈 문단([])에는 보호자의 확인·문의·비교 같은 행동 안내만 쓴다. 등급·급여·시설에 관한 사실(가능·불가능, 시설 간 차이, 등급 재요약)을 다시 설명하지 않는다.
- 한 문단이 인용하는 FACT는 3개 이하로 한다. 4개 이상이 필요하면 내용을 줄이지 말고 다음 문단으로 나눈다.
- 급여·비급여는 FACT 문장의 범위로만 설명한다. "선택사항", "선택에 따라", "운영 방식 때문" 같은 해석을 붙이지 않는다.
- 출력은 SYSTEM의 JSON 형식 하나만.
`.trim();
}

// 화자 오염 가드 — 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region }) {
  // ★ 미확인 화자 차단(선장 승인 ⑥): 신분·기관 선언형("○○요양원입니다") 금지.
  //   storeName 은 화자 서술에 쓰지 않는다(헤더 닉네임 오염 + 창작 위험).
  return `${region}에서 요양원을 알아보시는 보호자분들께 안내드립니다.`;
}

// ★ 미확인 화자 검출 — 생성본 점검용(핸들러 QC에서 소비)
export function detectSpeakerViolation(text) {
  return NURSINGHOME_SPEAKER_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.key);
}

// 끝 닉네임/서명 제거 정규식 (closing 오염 차단)
export function stripOwnerSignature(text) {
  return text
    .replace(/[-–—·]\s*[가-힣A-Za-z0-9_]{2,20}\s*드림\s*$/g, "")
    .replace(/작성자\s*[:：].*$/gm, "")
    .trim();
}

// 이미지 alt — getImageAlts (사진 슬롯 5개)
export function getImageAlts({ region }) {
  return [
    `${region} 요양원 외관`,
    "어르신 생활실",
    "식사 공간",
    "공용 거실",
    "옥외 산책 공간",
  ];
}

// ⚠️ DEAD CODE (SEGMENT-01 이후 미사용 — 인라인 마커 경로. 삭제 금지): 세그먼트 조립은 generateNursinghome.js assembleSegments
//   active   → 정본 문장으로 치환 (used)
//   invalid  → 원문 불일치 statement. 마커 제거 (invalid)
//   그 외     → 미정의·보류·플랜 밖 id / 형식 깨진 마커. 마커 제거 (unresolved)
//   ※ factSlots 정상 = 배선 정상일 뿐, FACT 의미 PASS 가 아니다(의미 검수는 사람).
export function resolveFactSlots(text, treatment) {
  const { active, invalid } = getFactSlotsForTreatment(treatment?.id);
  const activeMap = new Map(active.map((st) => [st.id, st.text]));
  const invalidSet = new Set(invalid);
  const used = new Set();
  const inv = new Set();
  const unresolved = new Set();
  let out = text.replace(/\{\{\s*FACT\s*:\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, id) => {
    if (activeMap.has(id)) { used.add(id); return activeMap.get(id); }
    if (invalidSet.has(id)) { inv.add(id); return ""; }
    unresolved.add(id);
    return "";
  });
  // 형식이 깨진 잔여 마커 제거
  out = out.replace(/\{\{\s*FACT\s*:?\s*[A-Za-z0-9_]*\s*\}{0,2}/g, (m) => { unresolved.add(m.trim()); return ""; });
  out = out.replace(/\{\{|\}\}/g, (m) => { unresolved.add(m); return ""; });
  // 마커 제거로 생긴 공백 정리
  out = out.replace(/[ \t]{2,}/g, " ").replace(/ +([.,])/g, "$1");
  return {
    text: out,
    used: [...used],
    invalid: [...inv],
    unresolved: [...unresolved],
    activeIds: active.map((st) => st.id),
    invalidIds: invalid, // 플랜 내 원문 불일치로 공급 차단된 statement
  };
}

// ★ READABILITY-A (선장 승인 2026-09-22): 본문이 인용한 FACT(usedIds)의 item 은 하단 블록에서 생략.
//   - item 의 모든 statement 가 인용된 경우에만 생략(일부만 인용된 item 은 유지). statement 없는 item 은 항상 유지.
//   - FACT 삭제 아님: 중복 표시만 생략. 본문 미인용 FACT 는 하단에 남는다.
//   - item 이 모두 생략된 블록은 블록째 생략하고 omitted 에 기록(QC 참조).
export function buildInfoBlocks(treatment, usedIds = []) {
  const used = new Set(usedIds);
  const { active } = getFactSlotsForTreatment(treatment?.id);
  const plan = getBlockPlan(treatment?.id);
  const parts = [];
  const titles = [];
  const omitted = [];
  let omittedItems = 0;
  plan.blocks.forEach((b) => {
    const src = NURSINGHOME_INFO_BLOCKS[b.key];
    if (!src) return;
    const title = b.title || src.title;
    const byIdx = new Map();
    active
      .filter((st) => st.src.block === b.key)
      .forEach((st) => st.src.idx.forEach((i) => byIdx.set(i, [...(byIdx.get(i) || []), st.id])));
    const items = src.items.filter((_, i) => {
      const ids = byIdx.get(i);
      const skip = !!ids && ids.every((id) => used.has(id));
      if (skip) omittedItems += 1;
      return !skip;
    });
    if (!items.length) { omitted.push(title); return; }
    const lead = b.lead ? `${b.lead}\n` : "";
    parts.push(`■ ${title}\n${lead}${items.map((i) => `· ${i}`).join("\n")}`);
    titles.push(title);
  });
  return { text: parts.join("\n\n"), titles, omitted, omittedItems };
}

// 정보블럭 렌더 헬퍼 — 전체 렌더(usedIds 미지정 시 기존과 동일 출력)
export function renderInfoBlocks(treatment, usedIds = []) {
  if (usedIds.length) return buildInfoBlocks(treatment, usedIds).text;
  // ★ STEP 4-REWORK: 전 CAT 일괄 4블록 부착 → CAT별 [주 1 + 보조 2~3] 위계 렌더로 교체.
  //   - 블록 개수는 기존과 같거나 많다(정보 삭제 0).
  //   - 동일 블록도 CAT 목적에 맞춰 제목·순서·연결문맥이 바뀐다.
  const plan = getBlockPlan(treatment?.id);
  return plan.blocks
    .map((b) => {
      const src = NURSINGHOME_INFO_BLOCKS[b.key];
      if (!src) return "";
      const title = b.title || src.title;
      const lead = b.lead ? `${b.lead}\n` : "";
      return `■ ${title}\n${lead}${src.items.map((i) => `· ${i}`).join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

// 렌더된 블록 제목 순서(핸들러 제출양식 "실제 정보블록 출력 순서"용)
export function getRenderedBlockTitles(treatment) {
  const plan = getBlockPlan(treatment?.id);
  return plan.blocks.map((b) => b.title || NURSINGHOME_INFO_BLOCKS[b.key]?.title || b.key);
}
