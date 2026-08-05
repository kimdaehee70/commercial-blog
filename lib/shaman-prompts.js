// lib/shaman-prompts.js
// AI-POST 무속 상담 엔진 V1 — 프롬프트 계층
// 파이프라인: buildShamanPrompt → 생성 → checkForbidden(재생성) → applyNotices(후단 삽입)

import {
  SHAMAN_SPECIALTIES,
  SHAMAN_SITUATIONS,
  SHAMAN_MENUS,
  SHAMAN_META,
  SHAMAN_TITLE_PATTERNS,
  situationTitlePatterns,
  SHAMAN_FORBIDDEN,
  SHAMAN_NOTICES,
  SHAMAN_BASE_NOTICE,
  SHAMAN_RITUAL_RULE,
  getSpecialty,
  getSituation,
  situationsBySpecialty,
  getNoticesFor,
  isRitualSpecialty,
  getPhotoCount,
  getConsultLines,
  requiresCaseInput,
} from "./shaman-data";

// COMMON_RENDER — 상담 계열 공통 렌더(사진 마커·위치·문의·고지)
import {
  renderConsultPost,
  normalizeVisitInfo,
  CONSULT_RENDER_PROMPT_RULE,
} from "./spine/consultRender";

/* ═════════════════════════════════════════════
   1. SYSTEM PROMPT
   ═════════════════════════════════════════════ */
export const SHAMAN_SYSTEM_PROMPT = `당신은 무속 상담소의 블로그 글을 대신 쓰는 사람이다. 광고 문안 작성자가 아니다.

[이 글의 목적]
검색해서 들어온 사람이 "이 사람은 내 상황을 알고 있다"고 느끼게 하는 것.
설득하지 않는다. 겁주지 않는다. 상황을 정확히 되짚어주면 사람은 스스로 판단한다.

[화자 — 이 글에서 절대 흔들리지 않는 축]
이 글을 쓰는 사람은 무속 상담소의 상담자다.
심리상담사·라이프코치·자기계발 강사·경영 컨설턴트가 아니다.
독자는 "왜 이런 일이 계속 반복될까"라는 마음으로 검색해서 들어온 사람이다.
그 마음에 답하되, 원인을 단정하지 않고 흐름을 함께 살펴보는 자리로 안내한다.

[문체 이탈 금지 — 자주 발생하는 실패]
아래 어휘·문형은 다른 업종의 글이 되어버리므로 쓰지 않는다.
· 내면의 소리를 듣는다 / 자신을 발견한다 / 자아를 탐구한다 / 진정으로 원하는 것을 찾는다
· 감정을 정리한다 / 생각을 정리한다 / 안전한 공간 / 객관적인 시각 / 스스로를 돌아본다
· 구조적으로 분석한다 / 요인을 검토한다 / 계절적 요인·경쟁자·마케팅·경제 상황 같은 경영 진단 열거
· 심리적 요인 / 주변 환경 요인 / 스트레스 때문일 수 있다 같은 상담심리식 원인 추정
독자는 그것을 몰라서 온 것이 아니다. 원인 분석 나열은 상담 글을 컨설팅 글로 만든다.
대신 이렇게 쓴다 — "하나로 설명하기 어려운 경우가 많습니다", "흐름이 바뀌는 시기일 수도 있습니다",
"혼자 오래 붙잡고 있을수록 답답해지는 경우가 많습니다".

[반복 억제 — 채점에서 가장 많이 깎이는 지점]
· 같은 뜻을 어휘만 바꿔 반복하지 않는다. ("혼자 생각 → 혼자 고민 → 혼자 판단 → 혼자 답")
  "혼자"라는 표현은 글 전체에서 3회를 넘기지 않는다.
· 첫 문단은 4문장 이내로 압축한다. 장면을 늘어놓지 말고 가장 선명한 것 두 개만 남긴다.
· 감정 묘사를 길게 끌지 않는다. 공감이 끝나면 상담 쪽으로 이동한다.

[문체]
· 담담한 존댓말. 감탄사·과장·극적 전개 금지.
· 단정하지 않는다. "~인 경우가 많습니다", "~하신 분들이 계십니다" 형태로 쓴다.
· 상담자를 높이는 표현을 쓰지 않는다. 능력·적중률·경력 과시 금지.
· 독자를 낮추거나 걱정을 키우는 표현을 쓰지 않는다.

[절대 금지]
1) 공포 유발 — 나쁜 일이 생긴다, 더 심해진다, 지금 아니면 늦는다 류의 암시 일체.
2) 의례 권유 — 굿·천도재·부적을 해야 한다는 서술. 비용·효과·기간 언급.
3) 결과 보장 — 해결된다, 이루어진다, 낫는다, 합격한다, 다시 만난다.
4) 원인 단정 — 조상 탓, 터 탓, 살 때문이라는 식의 인과 확정.
5) 광고 표현 — 용하다, 잘 맞힌다, 최고, 1위, 원조, 적중률.
6) 업체명·상호를 본문에 쓰지 않는다.
7) 지어낸 후기·지어낸 사례·지어낸 인물 등장 금지.

[상담의 위치]
상담은 판단을 대신하지 않는다. 의료·법률·재무 문제는 해당 전문가가 먼저다.
글은 "정리해보는 자리가 있다"는 것까지만 알린다.

[마지막 문단]
"상담은 하나의 도구가 될 수 있습니다" 같은 관찰자 문장으로 끝내지 않는다. 힘이 없다.
독자를 향해 담담히 건네는 문장으로 닫는다.
예: "혼자 답을 찾기 어려운 순간이라면, 지금 상황을 차분히 이야기해 보시는 것도 하나의 방법입니다."
재촉·기한·조급함을 만드는 표현은 넣지 않는다.

[분량]
공백 포함 ${SHAMAN_META.charTarget[0]}~${SHAMAN_META.charTarget[1]}자.`;

/* ═════════════════════════════════════════════
   2. 공통 블록
   ═════════════════════════════════════════════ */
function ritualBlock(specId) {
  if (!isRitualSpecialty(specId)) return "";
  return `\n[의례 서술 규칙 — 이 분야는 반드시 적용]\n${SHAMAN_RITUAL_RULE.map((r) => "· " + r).join("\n")}\n`;
}

function forbiddenBlock() {
  return `\n[사용 금지 표현 — 한 번이라도 쓰면 글 전체 폐기]\n${SHAMAN_FORBIDDEN.join(" / ")}\n`;
}

function photoBlock(specId) {
  const n = getPhotoCount(specId);
  // 본문에 들어가는 마커는 (n-1)개. 마지막 1장(건물 입구)은 후단 CTA 구간에 자동 부착된다.
  const inBody = Math.max(1, n - 1);
  return `\n[사진 자리]\n본문 흐름이 바뀌는 지점에 [사진] 표기 ${inBody}개를 넣는다.\n· "[사진]" 이라고만 쓴다. 뒤에 설명·캡션을 붙이지 않는다. 설명은 자동으로 부여된다.\n· 감정이 이어지는 문단 한가운데는 피한다. 흐름이 바뀌는 지점에만 넣는다.\n· 사진 개수를 본문에서 언급하지 않는다.\n`;
}

function regionBlock(region) {
  // 주소·문의·고지는 후단 블록에서 자동 부착된다(consultRender).
  // 모델이 본문에 주소를 쓰면 중복되고, 도입부에 들어가면 글 전체가 광고로 읽힌다.
  return `\n[주소·문의·고지 — 본문에 쓰지 않는다]\n· 주소, 전화, 예약 안내, 고지 문구를 본문에 넣지 않는다. 글 뒤에 자동으로 붙는다.\n· 지역명을 장면의 배경으로 쓰지 않는다. ("○○구의 한 카페에서" 같은 서술 금지)\n· 첫 문단에 지역명을 넣지 않는다.\n${region ? `· 지역명이 꼭 필요하면 마지막 안내 구간에서 1회까지만 쓴다.\n` : ""}`;
}

function narratorBlock(lines) {
  const rules = lines && lines.narratorRules;
  if (!rules || !rules.length) return "";
  return `\n[화자 — 글 전체에서 한 번도 바뀌지 않는다]\n${rules.map((r) => "· " + r).join("\n")}\n· 도입·본문·마지막 안내까지 같은 사람이 말한다. 중간에 시점이 바뀌면 이 글은 폐기 대상이다.\n`;
}

function titleBlock(kind, vars, patsOverride) {
  // patsOverride = Engine A 축 분리(ask/cause). 없으면 기존 풀 사용.
  const pats = patsOverride || SHAMAN_TITLE_PATTERNS[kind] || [];
  const filled = pats.map((p) =>
    p.replace("{situation}", vars.situation || "")
      .replace("{specialty}", vars.specialty || "")
      .replace("{region}", vars.region || "")
      .trim()
  );
  return `\n[제목 — 가장 먼저 쓴다]\n· 첫 줄에 제목만 쓴다. 제목 위에 아무 문장도 쓰지 않는다.\n· 아래 후보 중 하나를 그대로 쓴다. 문장으로 고쳐 쓰지 않는다.\n${filled.map((t) => "· " + t).join("\n")}\n· 어미를 "~습니다 / ~입니다 / ~쉽지 않습니다" 형태로 바꾸지 않는다. 그건 본문 문장이지 제목이 아니다.\n· 제목을 마침표로 끝내지 않는다. 물음표·느낌표 남용 금지.\n· 제목에는 위 후보에 들어있는 상황 키워드가 반드시 남아 있어야 한다.\n· 제목으로 쓴 문장을 본문 첫 문장에 다시 쓰지 않는다.\n· 둘째 줄은 비우고, 셋째 줄부터 본문을 시작한다.\n`;
}

/* ═════════════════════════════════════════════
   3. Engine A — 상황 공감글
   ═════════════════════════════════════════════ */
function buildSituationPrompt({ situationId, region }) {
  const s = getSituation(situationId);
  if (!s) throw new Error(`[shaman] unknown situation: ${situationId}`);
  const sp = getSpecialty(s.spec);
  const lines = getConsultLines(s.spec, s.id);

  const user = `[이번 글의 상황]
검색 문장 : ${s.name}
검색 계기 : ${s.reason}
그때의 감정 : ${s.emotion}
말하지 못하는 속마음 : ${s.anxiety}
상담을 떠올리는 지점 : ${s.trigger}
쓸 수 있는 장면 : ${s.scenes.join(" / ")}
소속 분야 : ${sp ? sp.label : ""}

[글의 흐름 — 이 순서를 지킨다]
1) 상황 재현 — 위 장면 중 두 개 이상을 써서 그 사람의 하루를 먼저 그린다. 설명하지 말고 보여준다.
2) 감정 공감 — "말하지 못하는 속마음"을 대신 말해준다. 위로하지 말고 정확히 짚는다.
3) 혼자 보낸 시간 — 아래 소재로 쓴다. 이 분야의 사람이 실제로 혼자 버티는 방식이다.
   소재 : ${lines.soloPhase}
   ※ "검색해봤지만 정보가 많아 더 혼란스러웠다"는 전개는 이 소재에 해당할 때만 쓴다.
     모든 글이 검색-혼란으로 흐르면 41편이 같은 글로 읽힌다.
4) 정리 — 이런 상황에서 놓치기 쉬운 지점, 혼자 판단하기 어려운 이유를 담담히 쓴다.
5) 가능성 — 단정하지 않고 방향만 언급한다. "이런 경우도 있고, 이런 경우도 있습니다" 수준.
   ※ 원인 후보를 항목처럼 나열하지 않는다. 경영 진단·환경 분석으로 흐르면 이 글은 실패한다.
   ※ 단정하지 말고 열어두되, 사람이 마주 앉아 말하는 어투로 쓴다. 예를 들면 이런 결이다.
     · 같은 고민이라도 시작된 계기는 사람마다 다릅니다.
     · 비슷해 보여도 안을 들여다보면 사정이 조금씩 다릅니다.
     · 어디서부터라고 딱 잘라 말하기는 어렵습니다.
   ※ 위 예시를 그대로 옮겨 쓰지 않는다. 이 글의 상황에 맞는 말로 다시 쓴다.
     "~한 경우가 많습니다", "~때문입니다" 같은 보고서 문투로 굳으면 상담 글이 아니라 설명문이 된다.
6) 상담이 필요한 지점 — 왜 정리하는 자리가 필요한지. 권유가 아니라 설명이다.
   ※ 무엇을 묻고 무엇부터 살펴보는지를 쓴다. 그래야 무속 상담 자리로 읽힌다.
   ※ 이 구간에 아래 질문 중 3개를 골라 배치한다. 나열하지 말고 문장 사이에 자연스럽게 섞는다.
     제목이 질문형("무엇을 물어봐야 하나" 등)이면 반드시 3개 이상 넣는다.
     제목에서 던진 질문을 본문이 회수하지 않으면 제목과 본문이 따로 논다.
${(lines.questions || [lines.question]).map((q) => `     · ${q}`).join("\n")}
7) 안내 — 상담이 어떻게 진행되는지 짧게. 연락을 재촉하지 않는다.

[특히 주의]
· 1)~3)에 전체 분량의 절반 이상을 쓴다. 이 글의 핵심은 공감이다.
· 글 전체에서 보고서 문투를 쓰지 않는다. "~한 경우가 많습니다", "~기 때문입니다",
  "~것이 중요합니다" 로 문단을 맺으면 상담 글이 아니라 분석 보고서가 된다.
  마주 앉아 이야기하듯 쓴다.
· 독자의 불안을 키워서 상담으로 몰지 않는다. 이미 충분히 힘든 사람이 읽는 글이다.
· 결과를 약속하지 않는다.
· 다 읽었을 때 "여기는 무속 상담을 하는 곳이구나"가 자연스럽게 남아야 한다.
  심리상담·코칭 글로 읽히면 이 글은 목적을 잃는다. 반대로 겁을 주면 선을 넘는다.
  단정하지 않으면서 흐름을 함께 살펴보는 자리 — 그 사이를 지킨다.
${narratorBlock(lines)}${ritualBlock(s.spec)}${titleBlock("situation", { situation: s.name, region }, situationTitlePatterns(s.spec, s.id))}${regionBlock(region)}${photoBlock(s.spec)}\n${CONSULT_RENDER_PROMPT_RULE}\n${forbiddenBlock()}`;

  return { system: SHAMAN_SYSTEM_PROMPT, user, meta: { axis: "situation", situationId, specId: s.spec, narrator: lines.narrator } };
}

/* ═════════════════════════════════════════════
   4. Engine B — 전문 분야 소개글
   ═════════════════════════════════════════════ */
function buildSpecialtyPrompt({ specialtyId, region }) {
  const sp = getSpecialty(specialtyId);
  if (!sp) throw new Error(`[shaman] unknown specialty: ${specialtyId}`);
  const sits = situationsBySpecialty(specialtyId);

  const user = `[이번 글의 분야]
분야 : ${sp.label}
이 분야의 성격 : ${sp.intro}
이 분야로 찾아오는 상황들 : ${sits.map((s) => s.name).join(" / ")}
상담에서 자주 나오는 질문 :
${(sp.commonQuestions || []).map((q) => "· " + q).join("\n")}

[글의 흐름 — 이 순서를 지킨다]
1) 이 분야를 찾는 사람들 — 어떤 상황에서 오는지 두세 가지를 담담히 든다.
2) 자주 나오는 질문 — 위 질문들을 그대로 인용하고, 그 질문 뒤에 있는 마음을 짚는다.
3) 상담에서 실제로 다루는 것 — 무엇을 묻고 무엇을 정리하는지. 능력이 아니라 과정을 쓴다.
4) 상담 시간 구성 — 어떻게 진행되는지 사실만.
5) 지키는 원칙 — 단정하지 않는다 / 강요하지 않는다 / 결정은 본인이 한다.
6) 이후 안내 — 준비해 오면 좋은 것 정도.
   ※ 아래 질문 중 2~3개를 본문에 자연스럽게 배치한다.
${(getConsultLines(specialtyId).questions || []).map((q) => `     · ${q}`).join("\n")}

[특히 주의]
· 이 글은 "무엇을 잘 보는 곳인가"를 알리는 글이다. 그러나 '잘 본다'고 쓰지 않는다.
  다루는 내용을 구체적으로 쓰면 그것이 곧 신뢰가 된다.
· 경력·이력·적중 사례로 신뢰를 만들려 하지 않는다.
· 자랑 문장 대신 "이런 질문을 자주 받습니다"로 대체한다.
${ritualBlock(specialtyId)}${titleBlock("specialty", { specialty: sp.label, region })}${regionBlock(region)}${photoBlock(specialtyId)}\n${CONSULT_RENDER_PROMPT_RULE}\n${forbiddenBlock()}`;

  return { system: SHAMAN_SYSTEM_PROMPT, user, meta: { axis: "specialty", specId: specialtyId } };
}

/* ═════════════════════════════════════════════
   5. Engine C — 상담 사례 정리 (실입력 게이트)
   ═════════════════════════════════════════════ */
export const CASE_GATE_MESSAGE =
  "상담 사례 글은 실제 상담 내용을 입력하셔야 생성됩니다. 지어낸 후기는 만들지 않습니다.\n· 어떤 상황으로 오셨는지\n· 상담에서 어떤 이야기를 나눴는지\n· 이후 어떻게 되었는지\n세 가지를 짧게라도 적어주세요.";

export function validateCaseInput(input = {}) {
  const need = ["caseSituation", "caseProcess", "caseResult"];
  const missing = need.filter((k) => !String(input[k] || "").trim());
  const tooShort = need.filter(
    (k) => String(input[k] || "").trim() && String(input[k]).trim().length < 15
  );
  return {
    ok: missing.length === 0 && tooShort.length === 0,
    missing,
    tooShort,
    message: CASE_GATE_MESSAGE,
  };
}

function buildCasePrompt({ situationId, region, caseInput }) {
  const v = validateCaseInput(caseInput);
  if (!v.ok) {
    const err = new Error("CASE_INPUT_REQUIRED");
    err.code = "CASE_INPUT_REQUIRED";
    err.detail = v;
    throw err;
  }
  const s = getSituation(situationId);
  const sp = s ? getSpecialty(s.spec) : null;

  const user = `[사업주가 입력한 실제 상담 사례 — 이 내용 밖으로 나가지 않는다]
상황 : ${caseInput.caseSituation}
상담 과정 : ${caseInput.caseProcess}
이후 경과 : ${caseInput.caseResult}
${s ? `연결 상황 : ${s.name}` : ""}
${sp ? `분야 : ${sp.label}` : ""}

[글의 흐름]
1) 의뢰 상황 — 입력된 상황을 3인칭으로 다시 쓴다.
2) 상담에서 나눈 이야기 — 입력된 과정만 쓴다.
3) 정리된 방향 — 무엇을 결정했는지가 아니라, 무엇을 정리했는지를 쓴다.
4) 이후 경과 — 입력된 내용 그대로. 부풀리지 않는다.
5) 마무리 — 같은 상황이 모두 같게 흘러가지는 않는다는 문장을 넣는다.

[절대 규칙 — 위반 시 글 전체 폐기]
· 입력에 없는 사실을 만들지 않는다. 숫자·날짜·기간·대사 창작 금지.
· 의뢰인을 특정할 수 있는 정보(나이·직업·지역·가족관계 조합)를 쓰지 않는다. "한 분", "어느 분"으로 쓴다.
· 후기 문체를 쓰지 않는다. 놀랐다 / 소름 / 딱 맞췄다 / 신기하다 류 금지.
· 이 사례가 다른 사람에게도 같게 적용된다는 암시 금지.
· 감정을 고조시키는 전개(반전·클라이맥스) 금지. 기록에 가깝게 쓴다.
${s ? ritualBlock(s.spec) : ""}${regionBlock(region)}${photoBlock(s ? s.spec : null)}\n${CONSULT_RENDER_PROMPT_RULE}\n${forbiddenBlock()}`;

  return { system: SHAMAN_SYSTEM_PROMPT, user, meta: { axis: "case", situationId, specId: s ? s.spec : null } };
}

/* ═════════════════════════════════════════════
   6. 라우터
   ═════════════════════════════════════════════ */
export function buildShamanPrompt(opts = {}) {
  const { menu = "situation" } = opts;
  if (menu === "situation") return buildSituationPrompt(opts);
  if (menu === "specialty") return buildSpecialtyPrompt(opts);
  if (menu === "case") return buildCasePrompt(opts);
  throw new Error(`[shaman] unknown menu: ${menu}`);
}

/* ═════════════════════════════════════════════
   7. 생성 후 검사 — FORBIDDEN
   ═════════════════════════════════════════════ */
export function checkForbidden(text = "") {
  const body = String(text);
  const hits = SHAMAN_FORBIDDEN.filter((w) => body.includes(w));
  return { pass: hits.length === 0, hits };
}

// 재생성 시 프롬프트 말미에 덧붙일 지시
export function forbiddenRetryHint(hits = []) {
  return `\n[재작성 지시]\n직전 결과에 금지 표현이 포함되었다: ${hits.join(" / ")}\n해당 표현과 그 표현이 담긴 문장을 통째로 다시 쓴다. 같은 의미를 우회해서 표현하는 것도 금지다.`;
}

/* ═════════════════════════════════════════════
   8. 생성 후 삽입 — NOTICE
   ═════════════════════════════════════════════ */
export function noticesFor({ situationId, specialtyId } = {}) {
  if (situationId) return getNoticesFor(situationId);
  const sp = getSpecialty(specialtyId);
  return [
    ...(sp && sp.guard && SHAMAN_NOTICES[sp.guard] ? [SHAMAN_NOTICES[sp.guard]] : []),
    SHAMAN_BASE_NOTICE,
  ].filter(Boolean);
}

// 하위호환 — 구 호출부 대비. 신규 경로는 finalizeShamanPost 사용.
export function applyNotices(text = "", opts = {}) {
  const body = String(text).trimEnd();
  const add = noticesFor(opts).filter((n) => n && !body.includes(n));
  return add.length ? `${body}\n\n${add.join("\n")}` : body;
}

/* ═════════════════════════════════════════════
   9. 원샷 헬퍼 (핸들러에서 사용)
   순서 고정: FORBIDDEN 검사 → 사진 마커 치환 → 후단(위치·문의·사진·고지) 부착
   ※ 후단을 먼저 붙이면 고지문이 금지어 검사 대상이 된다.
   ═════════════════════════════════════════════ */
export function finalizeShamanPost(raw, opts = {}) {
  const chk = checkForbidden(raw);
  if (!chk.pass) {
    return { ok: false, reason: "FORBIDDEN", hits: chk.hits, retryHint: forbiddenRetryHint(chk.hits) };
  }

  const specId = opts.specialtyId || (opts.situationId ? (getSituation(opts.situationId) || {}).spec : null);
  const lines = getConsultLines(specId, opts.situationId);

  // 방문정보: visit_info 객체 → req.body 평면 필드 순으로 병합. 없는 항목은 출력에서 빠진다.
  const visit = normalizeVisitInfo(opts.visitInfo, opts.storeFields, {
    address: opts.region || "",
  });

  const r = renderConsultPost(raw, {
    photoRoles: SHAMAN_META.photoRoles.slice(0, getPhotoCount(specId)),
    region: opts.region || "",
    ctaLine: lines.cta,
    notices: noticesFor(opts),
    visit,
  });

  return {
    ok: true,
    text: r.text,
    photoUsed: r.photoUsed,
    tailPhotoRole: r.tailPhotoRole,
    visitFields: Object.keys(visit).filter((k) => visit[k]),
  };
}

export { SHAMAN_MENUS, SHAMAN_SPECIALTIES, SHAMAN_SITUATIONS, requiresCaseInput };
