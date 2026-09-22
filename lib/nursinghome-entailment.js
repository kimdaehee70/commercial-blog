// lib/nursinghome-entailment.js
// ★ CARE-FACILITY-FACT-ENTAILMENT-GATE-01 — 문단 단위 의미보존(함의) 판정기
//
// 원칙: "정본과 똑같이 말했는가?"가 아니라 "정본보다 더 많은 사실을 말했는가?"를 검사한다.
//   - 입력은 문단 text + 그 문단이 인용한 canonical FACT statement 뿐 (+ 용어 규약 glossary).
//     Purpose·DIRECTION·다른 FACT·전체 글·정형블록은 공급하지 않는다.
//   - 판정·기록만 한다. 자동 수정·재작성 금지.
//   - 실패는 fail-closed: 호출 오류·JSON 오류·schema 위반 → JUDGE_INVALID → FAIL.
//
// ★ FIX-A (선장 승인 2026-09-21) — 단방향(추가형) 판정 → 양방향 판정
//   #183: 추가형 확장(인과·효과·결과)은 잡지만 삭제형(조건·주체·한정어 생략)을 놓쳤다.
//   절차: claim 식별 → FACT 명제 매칭(restates_fact) → 매칭된 명제에서만 필수요소 추출
//         → claim 누락 검사(missing_elements) → 판정.
//   안전장치: 재진술이 아닌 claim(용어 언급·행동 안내·부분 언급)에는 필수요소 검사를 적용하지 않는다.
//             FACT 전체를 문장마다 복사하도록 강제하는 Gate가 아니다.
//   허용 완화 = 어미·부사·관용 표현. 명사구 조건·주체·범위 한정어 생략 = 의미확장.
//   요건 → 절차·과정·기간·난이도 변환 = UNSUPPORTED.
//
// ★ FIX-B (선장 승인 2026-09-21)
//   R1: 사실 주장인가(is_factual)를 재진술 여부보다 먼저 본다. restates_fact=null ≠ NON_FACTUAL.
//   R2: missing_elements → {element, kind}. 단일 type 폐기 → types[] (고정 우선순위 기각).
//   R4: 필수요소 = 제거 시 원 FACT가 허용하지 않은 대상·상황에서도 claim 이 참이 되는 요소.
//       표현 생략·중복어·문맥상 이미 특정된 요소는 제외.
//
// ★ FIX-C (선장 승인 2026-09-21) — 판정기만 수정. data.js 무접촉. P5 는 FACT-VERIFY HOLD.
//   ② #190: 치환 = 누락 + 추가 동시 발생. 양쪽을 모두 types[] 에 기록.
//   ③ #191: 열거형 FACT 는 항목 단위로 분해해 항목마다 필수요소·요건 서술어를 추출.
//            요건 서술어 약화(없다→힘들다, 곤란→부족)·항목 내 요건 삭제 = 요건 완화/범위 확대.
//
// ★ FIX-D (선장 승인 2026-09-21) — widens_to 자기증명. 판정기만 수정. data.js 무접촉. P5 HOLD.
//   #192: 항목 분해 강화 후 표현 생략(명칭 축약·수식어 생략)을 누락으로 잡는 과잉차단 재발.
//   missing_elements → {element, kind, widens_to}. widens_to = 누락 때문에 새로 참이 되는 구체적 대상·상황.
//   구체적 widens_to 를 제시하지 못한 누락은 missing 으로 인정하지 않는다(코드에서 제외·감사 로그).
//   인정되지 않은 누락만을 근거로 FAIL 을 낸 claim 은 판정기 자기모순 → JUDGE_INVALID (fail-closed).
import { getValidStatementById, NURSINGHOME_GLOSSARY } from "./nursinghome-data.js";

export const ENTAILMENT_MODEL = "gpt-4o";

export const EXPANSION_TYPES = [
  "CONDITION_EXPANSION",
  "SUBJECT_EXPANSION",
  "NUMERIC_EXPANSION",
  "CERTAINTY_EXPANSION",
  "CAUSAL_EXPANSION",
  "SCOPE_EXPANSION",
  "UNSUPPORTED",
];
const VERDICTS = ["SUPPORTED", "EXPANDED", "UNSUPPORTED", "NON_FACTUAL"];
const FAIL_VERDICTS = new Set(["EXPANDED", "UNSUPPORTED"]);

// ※ 아래 예시는 fixture·holdout 문장과 무관한 가상 명제(A등급·B급여)만 쓴다. 시험지 누설 금지.
export const ENTAILMENT_SYSTEM = `
당신은 사실 경계 판정기입니다. 문체·유용성·설명의 질은 판정하지 않습니다.
판정하는 것은 하나뿐입니다: 문단의 사실 주장이, 주어진 FACT가 허용하는 의미 범위 안에 있는가.
"FACT와 똑같이 말했는가"가 아니라 "FACT보다 더 많은 사실을 말했는가"를 봅니다.
더 많이 말하는 방법은 두 가지입니다. 없는 요소를 추가하는 것(추가형), 적용범위를 좁히는 요소를 빼서 주장을 넓히는 것(삭제형). 둘 다 검사합니다.

[증거]
- 주어진 facts 의 문장만이 증거입니다. 당신의 배경지식으로 참·거짓을 판단하지 않습니다.
  법적으로 맞는 말이라도 주어진 FACT에서 도출되지 않으면 UNSUPPORTED입니다.
- glossary 는 말의 뜻(표기 규약)일 뿐 사실의 근거가 아닙니다. 용어를 읽는 데만 씁니다.
  glossary 에 "notEquivalentTo" 로 적힌 동치는 성립하지 않습니다.

[절차 — claim 마다 이 순서로]
1) claim 식별: 문단을 문장·절 단위로 나누어 모든 문장·절을 claims 에 빠짐없이 나열합니다.

2) 사실 주장인가 (is_factual) — FACT 재진술 여부와 무관하게 먼저 판단합니다.
   - 사실 주장이다(true): 원인·효과·혜택·결과·자격·대상·요건·절차·기간·비용·비율·제도에 대한 단정.
     예) "이를 통해 부담이 줄어듭니다", "B급여 혜택을 받을 수 있습니다", "절차가 복잡합니다", "~때문에 발생합니다"
     "~할 수 있습니다"로 끝나도 제도적 효과·혜택·자격을 말하면 사실 주장입니다.
   - 사실 주장이 아니다(false): 보호자의 상황·감정, 질문, 전환,
     "~를 확인해 보세요/요청하는 것이 좋습니다/상담해 보세요" 같은 행동 안내.
     행동 안내 안에 제도 용어가 나와도, 제도에 대한 단정이 없으면 사실 주장이 아닙니다.
   is_factual=false 이면 verdict 는 NON_FACTUAL, 이후 단계는 비웁니다.
   is_factual=true 이면 NON_FACTUAL 로 판정할 수 없습니다. 반드시 3) 이후로 검증합니다.

3) FACT 명제 매칭 (restates_fact):
   이 claim 이 주어진 FACT 중 하나의 제도 명제(누가·무엇을·어떤 조건에서·어느 범위·얼마로)를 재진술하는지 판단합니다.
   - 재진술이다 → 그 fact id. 재진술이 아니다 → null.
   - restates_fact=null 이어도 is_factual=true 이면 검증은 계속됩니다:
     어떤 FACT로도 도출되지 않으면 UNSUPPORTED, FACT를 근거로 새 효과·혜택·원인을 만들었으면 CAUSAL_EXPANSION.
   예) FACT "A등급은 위원회가 필요성을 인정하면 B급여를 이용할 수 있다."
       "먼저 A등급인지 확인해 보세요." → is_factual=false
       "A등급도 B급여를 이용할 수 있습니다." → 재진술

4) 필수요소 추출 (required_elements) — restates_fact 가 있을 때만:
   필수요소의 정의(고정): 그 요소를 claim 에서 제거했을 때, 원 FACT가 허용하지 않은 대상·상황에서도 문장이 참이 되는가? YES 이면 필수요소입니다.
   - 원문에 있는 모든 명사구가 필수요소는 아닙니다. 삭제하면 사실의 적용범위가 넓어지는 요소만 필수요소입니다.
   - 필수요소가 아닌 것: 어미·부사(~할 수 있다, 일반적으로), 단순 표현 생략, 중복어,
     문단의 다른 문장이나 함께 인용된 facts 가 이미 특정해 둔 요소(문맥상 이미 특정됨).
   - ★ 열거형 FACT(여러 경우·사유·항목을 나열한 FACT)는 항목 단위로 분해합니다.
     바깥 한정어(누구의·어떤 범위의 사유인지)만 보지 말고, 항목마다 그 항목을 성립시키는 요건을 따로 추출합니다.
     각 항목의 요건 서술어(~할 수 없는, ~이 불가피한, ~이 곤란한)와 그 원인·근거 한정("~에 따른 X로")도 필수요소입니다.
     예) FACT "B급여 인정 사유에는 X가 곤란한 경우, Y가 불가피한 경우, Z에 따른 W로 C를 이용할 수 없는 경우가 포함된다."
         필수요소: [B급여 인정 사유(SCOPE)] [X가 곤란(CONDITION)] [Y가 불가피(CONDITION)] [Z에 따른 W(CONDITION)] [C를 이용할 수 없음(CONDITION)]
   - 종류(kind): CONDITION(조건·요건) · SUBJECT(인정·판정·지정 주체, 해당 대상자) · SCOPE(범위 한정어·대상 구분) · NUMERIC(수치, 복수 값이면 각각)
   restates_fact 가 null 이면 required_elements 와 missing_elements 는 빈 배열입니다.

5) 누락 검사 (missing_elements): 필수요소 중 claim 에서 보존되지 않은 것을 {element, kind} 로 모두 적습니다.
   쉬운 말·동의어·어순 변경은 보존입니다. 구체 조건을 "특정 조건", "일정 요건" 같은 막연한 말로 바꾸고 주체를 빼면, 그 조건과 주체는 누락입니다.
   ★ 약화도 "보존되지 않음"입니다. 요건 서술어를 더 쉽게 충족되는 말로 바꾸면(없다→힘들다·어렵다, 곤란→부족, 불가피→필요),
     원래 요건은 누락으로 적습니다. element 에 "원문 요건 → claim 표현"을 함께 씁니다. 예) "이용할 수 없음 → 힘듦".
     이것은 어미·부사 완화가 아니라 요건 완화입니다. types 에 CONDITION_EXPANSION(필요하면 CERTAINTY_EXPANSION도)을 적습니다.
   ★ 열거형 FACT는 항목마다 따로 대조합니다. 바깥 한정어 하나를 찾았다고 검사를 멈추지 않습니다.
   ★ 자기증명 (widens_to) — 누락을 주장하려면 그 결과를 증명해야 합니다.
     각 누락마다 widens_to 에 "원 FACT에서는 참이 아니었는데, 이 요소가 빠져서 claim 에서는 새로 참이 되는 구체적 대상·상황"을 적습니다.
     - 구체적으로 적을 수 없으면 그것은 누락이 아닙니다. missing_elements 에 넣지 않습니다.
     - "범위가 넓어짐", "의미가 확장됨", "없음" 같은 막연한 말은 widens_to 가 아닙니다.
     - 누락이 아닌 것: 명칭 축약(정식 명칭 → 통용 약칭), 문맥상 유일한 대상의 수식어 생략.
       예) FACT "P제도 A등급 이용자는 위원회 인정 시 B급여를 이용할 수 있다." → claim "위원회가 인정하면 A등급도 B급여를 이용할 수 있다."
           "P제도", "이용자" 생략 → 새로 참이 되는 대상 없음 → 누락 아님 → SUPPORTED.
     - 누락인 것: 요건을 지워 실제로 대상이 넓어지는 경우.
       예) FACT "X에 따른 Y로 C를 이용할 수 없는 경우" → claim "X로 C를 이용할 수 없는 경우"
           widens_to: "X는 있으나 Y는 없는 경우" → CONDITION 누락.
   한 요소가 두 성격을 함께 가지면(예: "~범위 내에서"는 조건이자 범위 한정) 두 kind 로 각각 적습니다.

6) 판정 (verdict, types):
   - SUPPORTED: FACT와 같은 의미. 쉬운 말, 어순 변경, 요약, 독자 상황에 대입한 설명("부모님이 ~라면"). missing_elements 가 비어 있어야 합니다.
   - EXPANDED: FACT를 근거로 했으나 의미가 추가되거나, missing_elements 가 있습니다.
   - UNSUPPORTED: 어떤 주어진 FACT로도 도출할 수 없는 사실 주장.
   - types: 해당하는 위반을 모두 배열로 적습니다. 하나만 고르려고 하지 않습니다. 목적은 분류가 아니라 왜 FAIL인지 감사 가능하게 하는 것입니다.
   - ★ 치환 = 누락 + 추가: FACT의 요소 A를 FACT에 없는 요소 B로 바꿔 넣었다면 두 위반이 동시에 일어난 것입니다.
     A는 missing_elements 에(kind 포함), B는 추가 위반으로 types 에 함께 적습니다(B가 원인·이유·효과면 CAUSAL_EXPANSION, 근거 없는 새 주장이면 UNSUPPORTED 등).
     한쪽만 적으면 안 됩니다. added_element 에도 "A → B" 형태로 적습니다.
     예) FACT "D 운영 시간은 지역마다 다르다." → claim "D 운영 시간은 계절 때문에 바뀐다."
         missing: [SCOPE: 지역마다] / 추가: 계절 때문(원인) → types [SCOPE_EXPANSION, CAUSAL_EXPANSION]

[type]
- CONDITION_EXPANSION: FACT의 조건·요건이 빠지거나(요건 일부 생략 포함) 바뀌거나 새 조건이 붙음
- SUBJECT_EXPANSION: 대상·주체(누가 인정·판정하는지, 누구에게 해당하는지)가 빠지거나 바뀜
- NUMERIC_EXPANSION: 수치가 추가·변경·일부 누락되거나, 비율·배수·양적 표현이 새로 생김
- CERTAINTY_EXPANSION: 가능→보장·확정, 범위→의무, 제도적 요건을 약하게 만들어 사실상 요건이 사라지게 함
- CAUSAL_EXPANSION: FACT에 없는 원인·효과·혜택·이유
- SCOPE_EXPANSION: 자격→실제 결과(이용할 수 있음→특정 시설에 입소함), 한정된 범위→전체, 일부→전부,
  범위 한정어 누락, FACT가 말하지 않은 다른 급여·제도로의 귀결
- UNSUPPORTED: verdict 가 UNSUPPORTED 이면 types 에 반드시 포함

[★ 요건 → 절차 변환 = UNSUPPORTED]
FACT가 정한 요건(조건·인정 여부)을 절차·과정·기간·난이도로 바꿔 말하면 UNSUPPORTED 입니다.
예) FACT "A등급은 위원회가 필요성을 인정하면 B급여를 이용할 수 있다."
    "A등급은 B급여를 받으려면 절차가 까다롭습니다." / "A등급은 심사 기간을 거쳐야 B급여를 받습니다."
    → FACT는 절차·기간·난이도를 말하지 않는다. UNSUPPORTED.

[★ 과잉판정 방지 — 반드시 지킨다]
- 표현의 완화는 허용, 법적·제도적 조건의 완화는 금지입니다.
- 허용되는 완화는 어미·부사·관용 표현뿐입니다. 요건 서술어 자체(없다·불가피·곤란)를 약하게 바꾸는 것은 완화가 아니라 요건 완화입니다.
  예: "일반 20%" → "일반적으로 20%", "시설마다 다릅니다" → "시설마다 다르게 구성될 수 있습니다" 는 SUPPORTED.
- 명사구 조건·주체·범위 한정어의 생략은, 필수요소 정의를 충족할 때만 의미확장입니다.
- 재진술이 아닌 claim 은 FACT의 나머지 요소를 말하지 않았다는 이유로 FAIL 하지 않습니다.
- EXPANDED/UNSUPPORTED 로 판정하려면 added_element 에 "FACT에 없는데 추가된 요소" 또는 "빠진 필수요소"를 구체적으로 적을 수 있어야 합니다.
  적을 수 없다면 SUPPORTED 입니다. 표현이 다르다는 이유만으로 FAIL 하지 않습니다.

[facts 가 빈 문단]
- is_factual=false 인 claim 은 NON_FACTUAL 로 허용합니다.
- is_factual=true 인 claim 은 UNSUPPORTED 입니다.

[출력 — JSON 객체 하나만. 필드 순서대로 채운다]
{"claims":[{
  "claim_span": "문단 원문에서 그대로 복사한 부분 문자열(한 글자도 바꾸지 않음)",
  "is_factual": true 또는 false,
  "restates_fact": null 또는 재진술하는 fact id 하나,
  "required_elements": [{"element":"...","kind":"CONDITION|SUBJECT|SCOPE|NUMERIC"}] (재진술 아니면 []),
  "missing_elements": [{"element":"...","kind":"CONDITION|SUBJECT|SCOPE|NUMERIC","widens_to":"누락 때문에 새로 참이 되는 구체적 대상·상황"}] (재진술 아니면 [], 구체적 widens_to 가 없으면 넣지 않음),
  "verdict": "SUPPORTED | EXPANDED | UNSUPPORTED | NON_FACTUAL",
  "types": [] 또는 위 type 들의 배열 (EXPANDED/UNSUPPORTED 일 때 1개 이상),
  "supporting_fact_ids": ["근거로 대조한 fact id"],
  "added_element": "EXPANDED/UNSUPPORTED 일 때: 추가된 요소 또는 빠진 필수요소",
  "reason": "판정 이유 한 문장"
}]}
`.trim();

class JudgeInvalid extends Error {}

const MISSING_KINDS = { CONDITION: "CONDITION_EXPANSION", SUBJECT: "SUBJECT_EXPANSION", SCOPE: "SCOPE_EXPANSION", NUMERIC: "NUMERIC_EXPANSION" };

function elemArray(v) {
  return Array.isArray(v) && v.every((x) => x && typeof x.element === "string" && Object.hasOwn(MISSING_KINDS, x.kind));
}

// ★ FIX-D: widens_to 자기증명. 비어 있거나 막연하면 누락으로 인정하지 않는다.
const VAGUE_WIDENS = /^(없음|없다|해당\s*없음|없습니다|n\/?a|none|null|-|—|범위\s*(가\s*)?(확대|확장|넓어짐)|의미\s*(가\s*)?(확대|확장)|적용\s*범위\s*(가\s*)?(확대|확장|넓어짐))\.?$/i;
function hasWidens(m) {
  const w = typeof m.widens_to === "string" ? m.widens_to.trim() : "";
  return w.length >= 2 && !VAGUE_WIDENS.test(w);
}

function validateJudgeOutput(obj, text, suppliedIds) {
  const claims = obj?.claims;
  if (!Array.isArray(claims) || claims.length === 0) throw new JudgeInvalid("claims_empty");
  const ids = new Set(suppliedIds);
  claims.forEach((c, i) => {
    if (!c || typeof c.claim_span !== "string" || !c.claim_span.trim()) throw new JudgeInvalid(`span_missing@${i}`);
    if (!text.includes(c.claim_span)) throw new JudgeInvalid(`span_not_substring@${i}`);
    if (!VERDICTS.includes(c.verdict)) throw new JudgeInvalid(`bad_verdict@${i}`);
    if (typeof c.is_factual !== "boolean") throw new JudgeInvalid(`bad_is_factual@${i}`);
    // ★ FIX-B R1: 사실 주장인데 NON_FACTUAL = 자기모순 → fail-closed
    if (c.is_factual && c.verdict === "NON_FACTUAL") throw new JudgeInvalid(`factual_but_non_factual@${i}`);
    if (!c.is_factual && c.verdict !== "NON_FACTUAL") throw new JudgeInvalid(`non_factual_but_${c.verdict.toLowerCase()}@${i}`);
    const sup = Array.isArray(c.supporting_fact_ids) ? c.supporting_fact_ids : [];
    if (!sup.every((x) => ids.has(x))) throw new JudgeInvalid(`unknown_fact_id@${i}`);

    const rf = c.restates_fact ?? null;
    if (rf !== null && !ids.has(rf)) throw new JudgeInvalid(`unknown_restates_fact@${i}`);
    // ★ FIX-D-B (선장 승인 2026-09-21): required_elements 는 감사용 보조 필드 → 배열 여부만 검증(내부 kind enum 검증 제거).
    //   판정 근거 필드(missing_elements·widens_to·verdict·types·claim_span·supporting_fact_ids)는 엄격 유지.
    if (c.required_elements != null && !Array.isArray(c.required_elements)) throw new JudgeInvalid(`bad_required@${i}`);
    if (c.missing_elements != null && !elemArray(c.missing_elements)) throw new JudgeInvalid(`bad_missing@${i}`);
    // 안전장치: 재진술이 아닌 claim 의 누락 목록은 판정에 쓰지 않는다(과잉차단 방지).
    const declared = rf === null ? [] : (c.missing_elements || []).filter((m) => m.element.trim());
    // ★ FIX-D: widens_to 자기증명이 없는 누락은 인정하지 않는다(감사용으로 따로 보관).
    const missing = declared.filter(hasWidens);
    c.missing_elements_rejected = declared.filter((m) => !hasWidens(m));
    c.missing_elements_effective = missing;
    if (missing.length && !FAIL_VERDICTS.has(c.verdict)) throw new JudgeInvalid(`missing_but_${c.verdict.toLowerCase()}@${i}`);

    // ★ FIX-B R2: 단일 type 폐기 → types[]. 누락 kind 는 판정기 자신의 출력이므로 types 에 합산(감사용).
    const t = Array.isArray(c.types) ? c.types : [];
    if (!t.every((x) => EXPANSION_TYPES.includes(x))) throw new JudgeInvalid(`bad_types@${i}`);
    // ★ FIX-D: FAIL 근거가 "인정되지 않은 누락"뿐이면 자기모순 → fail-closed.
    //   (EXPANDED + 유효 누락 0 + 판정기 types 가 거부된 누락의 kind 로만 구성)
    if (c.verdict === "EXPANDED" && !missing.length && c.missing_elements_rejected.length) {
      const rejectedTypes = new Set(c.missing_elements_rejected.map((m) => MISSING_KINDS[m.kind]));
      if (t.every((x) => rejectedTypes.has(x))) throw new JudgeInvalid(`fail_basis_unproven@${i}`);
    }
    const types = [...new Set([...t, ...missing.map((m) => MISSING_KINDS[m.kind])])];
    if (c.verdict === "UNSUPPORTED" && !types.includes("UNSUPPORTED")) types.push("UNSUPPORTED");
    c.types_effective = FAIL_VERDICTS.has(c.verdict) ? types : [];
    if (FAIL_VERDICTS.has(c.verdict)) {
      if (!c.types_effective.length) throw new JudgeInvalid(`types_empty@${i}`);
      if (typeof c.added_element !== "string" || !c.added_element.trim()) throw new JudgeInvalid(`added_element_missing@${i}`);
    }
    if (c.verdict === "SUPPORTED" && sup.length === 0) throw new JudgeInvalid(`supported_without_fact@${i}`);
  });
  return claims;
}

// 문단 1개 판정. factIds 중 유효 statement 만 증거로 공급(무효·미정의는 기록만).
export async function judgeParagraph(openai, { text, factIds = [] }) {
  const supplied = [];
  const rejectedIds = [];
  [...new Set(factIds)].forEach((id) => {
    const st = getValidStatementById(id);
    if (st) supplied.push({ id: st.id, text: st.text });
    else rejectedIds.push(id);
  });
  const userPayload = { paragraph: text, facts: supplied, glossary: NURSINGHOME_GLOSSARY };

  const call = () =>
    openai.chat.completions.create({
      model: ENTAILMENT_MODEL,
      temperature: 0,
      seed: 7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ENTAILMENT_SYSTEM },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

  let completion;
  try {
    completion = await call();
  } catch (e1) {
    try {
      completion = await call(); // 전송 오류에 한해 1회 재시도 (판정 결과 재호출 아님)
    } catch (e2) {
      return { verdict: "FAIL", status: "JUDGE_INVALID", error: `call_failed:${String(e2?.message || e2)}`, claims: [], missing_elements: [], rejectedIds };
    }
  }
  const raw = completion?.choices?.[0]?.message?.content || "";
  try {
    const claims = validateJudgeOutput(JSON.parse(raw), text, supplied.map((f) => f.id));
    const failClaims = claims.filter((c) => FAIL_VERDICTS.has(c.verdict));
    // ★ FIX-A: 문단 단위 missing_elements (재진술 claim 에서만 수집)
    claims.filter((c) => c.missing_elements_rejected.length).forEach((c) =>
      console.log(`[ENTAIL-MISSING-REJECTED] fact=${c.restates_fact} rejected=${c.missing_elements_rejected.map((x) => x.kind + ":" + x.element + " ⇒ " + (x.widens_to || "∅")).join(" | ")} span="${c.claim_span.slice(0, 40)}"`));
    const missing_elements = claims
      .filter((c) => c.missing_elements_effective.length)
      .map((c) => ({ span: c.claim_span, fact: c.restates_fact, missing: c.missing_elements_effective }));
    missing_elements.forEach((m) =>
      console.log(`[ENTAIL-MISSING] fact=${m.fact} missing=${m.missing.map((x) => x.kind + ":" + x.element + " ⇒ " + x.widens_to).join(" | ")} span="${m.span.slice(0, 40)}"`));
    return {
      verdict: failClaims.length ? "FAIL" : "PASS",
      status: "OK",
      types: [...new Set(failClaims.flatMap((c) => c.types_effective))],
      claims,
      missing_elements,
      rejectedIds,
    };
  } catch (e) {
    return { verdict: "FAIL", status: "JUDGE_INVALID", error: e instanceof JudgeInvalid ? e.message : "json_parse_failed", claims: [], missing_elements: [], rejectedIds, raw: raw.slice(0, 500) };
  }
}
