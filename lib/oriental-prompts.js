// ============================================================
// oriental-prompts.js — 한의원 정보형 V2 (완전 독립)
// ⚠️ clinic / dental / ent / urology 절대 참조 금지
// [V2 전환] 후기형/생활일지 → 정보형. personal 제거, commercial 단일.
//   치과·정형외과 정보형 V2 동형. 7섹션:
//   concern / examination / diagnosis / treatment / visitInfo / checkPoint / closing
//   개인 후기·1인칭·타임라인·비용/횟수 단정·효과 단정 전면 제거.
// ============================================================

export const ORIENTAL_SYSTEM_PROMPT = `당신은 한의원 진료 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 진료 정보 안내"입니다.
- 1인칭 체험(저는/제가/다녀봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(줄었다/좋아졌다/개선되었다). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·치료 횟수 단정 금지. "개인 상태에 따라 다르며 진료 시 안내" 수준.
- 개인 타임라인(1회/1주/1개월/3개월) 금지.
- 병원·원장 평가·추천·CTA 금지. 매장명 본문 노출 금지.
- 의료광고법 준수: 효능·효과 보장 표현 금지.`;

export function buildOrientalPrompt(section, treatment, region, options = {}) {
  const { name } = treatment;

  const isNeuro = /중풍|뇌졸중|구안와사|안면\s*마비|교통사고/.test(name);
  const neuroGuide = isNeuro
    ? `\n[신경계 — 의료광고법 민감 ⚠️] "회복/개선/효과/좋아졌" 등 효과 단정 절대 금지. 발음·마비·후유증 변화 단정 금지. "경과 관찰 대상" 수준의 일반 정보로만 서술. 회복 속도·시기 단정 금지(개인차·발병시점에 따라 다름).`
    : "";

  // ⚠️ [축B] 보험 반복 제거 — 보험 안내는 checkPoint(섹션6) 1곳에서만 다룬다.
  //   기존: examination/treatment/checkPoint 3곳 + INFO_BLOCK 표 → 본문에 4~5회 등장.
  // ⚠️ [축B] insuranceGuide 미사용 — 보험은 INFO_BLOCK 표 1곳에서만 다룬다(본문 0회).
  //   checkPoint가 상담준비 축으로 전환되면서 본문 보험 언급 지점이 사라짐. 정의는 보존(향후 복원용).
  const isInsured = /추나|교통사고|침치료/.test(name);
  const insuranceGuide = isInsured
    ? `\n[보험 안내] 건강보험 또는 자동차보험 적용 가능 여부는 진료 시 확인 대상임을 일반 안내(단정·유인 표현 금지).`
    : "";
  // 보험을 다루지 않는 섹션에 주입 — 중복 차단용
  const insuranceMute = isInsured
    ? `\n[중복 금지] 보험(건강보험·자동차보험·실비) 언급 금지. 보험은 별도 섹션에서 한 번만 다룬다.`
    : "";

  const isSensitive = /다이어트|산후/.test(name);
  const sensitiveGuide = isSensitive
    ? `\n[주의] 체중 감량·효과 단정 금지. 개인 체질·생활습관에 따라 다름을 안내.`
    : "";

  // 공통 금지 표현
  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/다녀봤어요/느꼈어요/좋아졌어요/줄었어요/개선되었어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한"
"1회 직후/1주일차/1개월차/3개월차" 등 개인 타임라인
- 이 글은 후기가 아니라 일반 진료 정보 안내다. 객관적·설명형으로 서술.`;

  // [v3.9.4] 접미어=치료 키워드(체외충격파치료 등) 대체어에서 "치료"류 제외.
  //   기존 "이 치료/해당 치료"는 접두부 소실(체외충격파치료→치료) 유도원 →
  //   완전표기 가드와 충돌. name이 "…치료"면 "이 요법/해당 진료"로 대체.
  const _altPhrase = (/치료$/.test(name) && name !== "치료")
    ? `"이 요법/해당 진료/진료"`
    : `"이 치료/해당 치료/진료"`;
  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 ${_altPhrase} 등으로 대체. 3회 이상 금지.`;
  // [축A2-4] 금지 예시 나열 제거 — 예시 패턴을 GPT가 오히려 모방("${name}보다") 하는 문제.
  //   방향 안내만 남기고, 실제 예외 처리는 핸들러 후처리 방어선이 담당.
  const grammarGuide = `\n[표기 규칙] "${name}"는 하나의 명사구로 자연스럽게 사용한다. 앞뒤를 띄우고 문장 안에서 자연스럽게 연결할 것.`;

  // ⚠️ [축B-2] 반복 억제 — "의료진과 상담을 통해 결정하는 것이 권장됩니다" 계열 마무리 문장이
  //   섹션마다 붙어 본문 4~5회 반복. CTA성 마무리를 각 섹션에서 금지하고 closing 1곳에만 허용.
  const repeatMute = `\n[반복 금지] 문단 끝에 "의료진과의 상담을 통해 결정하는 것이 권장됩니다" / "충분한 상담이 필요합니다" 류의 마무리 권유 문장을 붙이지 말 것. 이 문장은 마지막 섹션에서만 사용한다. 해당 섹션의 내용만 서술하고 끝낼 것.
- "개인의 상태에 따라 다를 수 있습니다" 표현도 글 전체 1~2회로 제한. 이 섹션에서 이미 앞 섹션이 썼다면 생략.`;

  const G = { name, region, insuranceGuide, insuranceMute, sensitiveGuide, neuroGuide, aiSmellGuide, kwDensityGuide, grammarGuide, repeatMute };

  switch (section) {
    case 'concern':     return buildConcernPrompt(G);
    case 'examination': return buildExaminationPrompt(G);
    case 'diagnosis':   return buildDiagnosisPrompt(G);
    case 'treatment':   return buildTreatmentPrompt(G);
    case 'visitInfo':   return buildVisitInfoPrompt(G);
    case 'checkPoint':  return buildCheckPointPrompt(G);
    case 'closing':     return buildClosingPrompt(G);
    default: throw new Error(`[oriental-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function buildConcernPrompt({ name, region, repeatMute, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 1 — 증상·상황] ${region} 지역 독자 대상, ${name} 관련 증상·불편함의 일반적 양상을 정보형으로 설명.
- 특정 개인 경험이 아니라 "이런 증상은 일반적으로 ~한 양상을 보입니다" 형식.
- 증상이 일상에 미칠 수 있는 영향을 객관적으로 서술(단정 금지).
- ⚠️ [축B-3 도입 압축] 대표 증상 2~3개만 나열. 4개 이상 열거 금지.
- ⚠️ 이 섹션에서 치료 방법·원리·접근법(자연 치유력·균형 조절·체질 맞춤 등)을 설명하지 말 것. 그건 뒤 섹션 몫이다.
- ⚠️ 증상별 파급효과(집중력·수면·대인관계·업무)를 하나씩 풀어 쓰지 말 것. 한 문장으로 묶을 것.
- 150자 이상 200자 이하. 짧게.${neuroGuide}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, repeatMute, insuranceMute, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 2 — 진료 전 확인사항] ${name} 진료를 고려할 때 내원 전 확인하면 좋은 사항을 일반 안내.
- 증상 지속 기간, 현재 복용 중인 약, 기존 질환·병력, 과거 치료 이력 등.
- 항목식으로 정리 가능. 비용·횟수 질문은 다루지 않음.
- 180자 이상 250자 이하.${insuranceMute}${neuroGuide}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildDiagnosisPrompt({ name, region, repeatMute, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 3 — 한의학적 판단 요소] ${name} 진료에서 무엇을 확인하는지 짧게 안내.
- ⚠️ [축B 설명량 압축] 체질·기혈·경혈·어혈의 정의·해설 금지. 용어를 풀어 설명하지 말 것.
- 한의학 용어는 최대 1가지만, 한 문장 안에서 스치듯 언급(예: "체질과 증상 경과를 함께 살핍니다").
- 본문 대부분은 "실제로 확인하는 것"(증상 부위·지속 기간·생활 요인)에 배분.
- 진단 단정 금지. 개인차 명시.
- 140자 이상 190자 이하. 짧게.${sensitiveGuide}${neuroGuide}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentPrompt({ name, region, repeatMute, insuranceMute, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 4 — 치료 방법 안내] ${name}에 활용될 수 있는 방법을 짧게 안내.
- ⚠️ [축B 설명량 압축] 중심 방법 2가지만 언급하고, 각 방법의 원리·작용 설명은 한 문장 이내로 제한.
- 뜸·부항·추나는 개별 설명 금지. "상태에 따라 함께 고려될 수 있습니다" 한 문장으로만 처리.
- 원리 설명(경혈 자극·기혈 순환·균형 조절 등)을 길게 풀지 말 것.
- 본문 절반 이상은 "어떤 기준으로 방법이 정해지는지"(증상 부위·경과·개인 상태)에 배분.
- 효과 단정 금지. 비용·횟수 단정 금지.
- 130자 이상 175자 이하. 짧게.${insuranceMute}${sensitiveGuide}${neuroGuide}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitInfoPrompt({ name, region, repeatMute, insuranceMute, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 5 — 진료 안내] ${name} 진료의 일반적 흐름과 상담 시 확인할 사항을 안내.
- 초진 상담 → 상태 확인 → 치료 계획 안내. 이 흐름만 서술하고 끝낼 것.
- 상담 시 증상 기간·생활습관·복용약 등을 확인한다는 정보.
- ⚠️ [축B-3 중복 제거] 치료 방법(한약·침·뜸·부항·추나)을 여기서 다시 언급하지 말 것. 앞 섹션에서 이미 다뤘다.
- ⚠️ "병원마다 다를 수 있다" 류의 부연 마무리 금지.
- 개인 타임라인·후기 금지. 한의학 이론(체질·기혈·경혈·어혈) 재설명 금지.
- 120자 이상 170자 이하. 짧게.${insuranceMute}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, repeatMute, insuranceMute, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 6 — 상담 준비 안내] 진료 상담을 앞두고 미리 정리해 두면 좋은 것을 안내.
- ⚠️ [축B 중복 제거] 이 섹션 바로 앞에 「한의사 면허 / 진료 분야 / 치료 종류 / 보험 적용 / 개인 체질 차이」 표가 이미 배치된다.
  → 위 5개 항목은 본문에서 다시 언급 금지. 반복하면 중복이다.
- ⚠️ [축B] 한의원을 "고르는 기준"이 아니라, 상담 자리에서 무엇을 전달할지에 초점.
- 다룰 내용(택 3~4): 증상 변화의 흐름을 언제부터 어떻게 바뀌었는지 정리 / 복용 중인 약·건강기능식품 목록 / 이전에 받은 치료와 그때의 반응 / 궁금한 점을 미리 적어 가기 / 생활 패턴(수면·식사·업무 자세) 메모.
- 정보 정리 형식(항목식 가능). 앞 섹션에서 이미 말한 내용 재서술 금지.
- 140자 이상 190자 이하. 짧게.${insuranceMute}${repeatMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, insuranceMute, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 마무리.
- 개인 변화·예약 예정·후기·추천 표현 전면 금지.
- ⚠️ 본문에서 이미 다룬 내용(한의학 이론·치료법 목록·보험) 재요약 금지. 새로 정보를 나열하지 말 것.
- "증상이 지속되면 의료진과 상담을 통해 적절한 진료 계획을 세우는 것이 좋습니다" 수준의 일반 안내 1~2문장으로 끝낼 것.
- ⚠️ [축B-2] 이 섹션 뒤에 고정 안내문("개인의 증상·체질에 따라 적용이 달라질 수 있습니다…")이 자동으로 붙는다.
  → 같은 취지의 문장(개인차·상담 후 결정·일반 정보 안내)을 여기서 다시 쓰지 말 것. 마무리는 한 번만.
- ${region} + ${name} 키워드 자연스럽게 1회 이내 포함 가능.
- 90자 이상 140자 이하. 짧게.${insuranceMute}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}
