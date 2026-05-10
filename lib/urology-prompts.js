// =============================================
// lib/urology-prompts.js
// 비뇨기과 프롬프트 빌더 v2.0
// 민감 시술(발기부전·조루·음경확대·성병) 완화 표현 강제
// =============================================

// ============================================================
// 0. DIRECTION 맵
// ============================================================
const UROLOGY_DIRECTION = {
  prostate: {
    concern: "전립선 비대로 소변 줄기 약해지고 야간뇨가 잦아져서",
    effect:  "배뇨 기능 개선, 야간뇨 감소, 일상 회복",
    hook:    "밤마다 화장실 가느라 잠을 못 자기 시작했을 때",
    keyword: "전립선비대증치료",
  },
  circumcision: {
    concern: "위생·기능적 이유로 포경수술이 필요해서",
    effect:  "위생 개선, 기능 정상화, 회복 후 일상",
    hook:    "위생 관리가 어렵다고 느꼈을 때",
    keyword: "포경수술",
  },
  kidney_stone: {
    concern: "옆구리 통증이 심하고 혈뇨가 보여서",
    effect:  "결석 분쇄·배출, 통증 해소, 재발 방지 관리",
    hook:    "갑자기 옆구리가 끊어질 듯 아팠을 때",
    keyword: "요로결석치료",
  },
  bladder: {
    concern: "방광염이 자주 재발해 일상에 지장이 있어서",
    effect:  "방광 염증 제거, 재발 방지, 배뇨 안정화",
    hook:    "소변볼 때 따끔한 통증이 반복됐을 때",
    keyword: "방광염치료",
  },
  ed: {
    concern: "발기 기능에 변화가 생겨 자신감이 떨어져서",
    effect:  "남성 기능 개선, 자신감 회복, 부부 관계 개선",
    hook:    "기능 변화를 처음 자각하기 시작했을 때",
    keyword: "발기부전치료",
  },
  vasectomy: {
    concern: "가족 계획상 정관수술이 필요해서",
    effect:  "안정적인 가족 계획, 빠른 회복, 일상 복귀",
    hook:    "가족 계획을 정리하기로 결정했을 때",
    keyword: "정관수술",
  },
  incontinence: {
    concern: "기침·운동 시 소변이 새어 외출이 부담돼서",
    effect:  "요실금 빈도 감소, 일상 회복, 자신감",
    hook:    "기침할 때 소변이 새는 걸 자각했을 때",
    keyword: "요실금치료",
  },
  varicocele: {
    concern: "정계정맥류로 통증·임신 시도에 영향이 있어서",
    effect:  "정맥류 개선, 임신 시도 환경 개선, 통증 완화",
    hook:    "임신 시도 중 검사에서 발견됐을 때",
    keyword: "정계정맥류치료",
  },
  sti: {
    concern: "성병 의심 증상이 있어 정확한 검사가 필요해서",
    effect:  "정확한 진단, 적절한 치료, 재발 방지",
    hook:    "증상이 나타난 후 검사를 결심했을 때",
    keyword: "성병검사치료",
  },
  overactive_bladder: {
    concern: "갑자기 강한 요의가 자주 들어 일상이 불편해서",
    effect:  "방광 활동 안정화, 빈뇨·절박뇨 감소",
    hook:    "외출 중 화장실을 자주 찾기 시작했을 때",
    keyword: "과민성방광치료",
  },
  hematuria: {
    concern: "혈뇨가 보여 원인 진단이 필요해서",
    effect:  "정확한 원인 진단, 적절한 후속 치료",
    hook:    "소변에서 피가 보이기 시작했을 때",
    keyword: "혈뇨검사치료",
  },
  prostate_cancer: {
    concern: "PSA 수치가 높아 정밀 검진이 필요해서",
    effect:  "조기 발견, 정확한 진단, 치료 방향 결정",
    hook:    "건강검진에서 PSA 수치가 높다는 결과를 받았을 때",
    keyword: "전립선암검진",
  },
  pe: {
    concern: "조루 증상으로 일상·관계에 부담이 생겨서",
    effect:  "남성 기능 안정화, 자신감 회복",
    hook:    "증상이 반복돼 진료를 결심했을 때",
    keyword: "조루증치료",
  },
  male_menopause: {
    concern: "피로·기력 저하·기능 변화가 동시에 와서",
    effect:  "호르몬 균형 회복, 기력·기능 개선",
    hook:    "이유 없이 피곤하고 의욕이 떨어졌을 때",
    keyword: "남성갱년기치료",
  },
  penile_enlargement: {
    concern: "남성 자신감과 관련된 고민이 있어서",
    effect:  "남성 자신감 회복",
    hook:    "오래 고민하다 진료를 결심했을 때",
    keyword: "음경확대수술",
  },
  prostatitis: {
    concern: "회음부·골반 통증이 반복돼서",
    effect:  "전립선 염증 완화, 통증 감소, 배뇨 안정화",
    hook:    "골반 부위 불편감이 만성화됐을 때",
    keyword: "전립선염치료",
  },
};

export function getUrologyDirection(treatmentId) {
  return UROLOGY_DIRECTION[treatmentId] || {
    concern: "비뇨기 증상이 신경 쓰여서",
    effect:  "비뇨기 진료를 통한 증상 개선",
    hook:    "증상이 일상에 영향을 주기 시작했을 때",
    keyword: "비뇨기과 진료",
  };
}

// ============================================================
// 0-1. AI 냄새 가이드
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지]
"드디어 결심하고" / "결국 선택하게 되었어요" / "마침내" / "비로소"
"마음이 편안해졌어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "차분하고 따뜻한"
"미소를 되찾았어요" / "새로운 삶" / "삶이 달라졌어요"
"기준으로 살펴본" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지`;
}

function getKwDensityGuide(name) {
  return `
[키워드 밀도] "${name}"는 최대 2~3회. 나머지는 "이 치료", "치료"로 대체.
[조사 오류 금지] "${name}을" → "이 치료를" / "${name}는" → "이 치료는"`;
}

// ============================================================
// 동선 흐름 가이드 (FLOW_TIMELINE) — 상단 유지력 핵심 ★
//   "정보 나열" → "실제 하루 경험" 으로 전환
// ============================================================
function getFlowTimelineGuide(sectionKey, mode = "personal") {
  if (mode === "commercial") {
    if (sectionKey === "situation") {
      return `
[동선 흐름 — 진료 검토 단계 안내]
탐색 단계를 시간 순서로 정리:
  1단계: 증상·고민 자각 → 정보 검색 시작
  2단계: 후기·전문의 자격·접근성 비교
  3단계: 상담 가능 시간 확인 → 예약
- "처음 검색을 시작할 때는 ~", "다음 단계로는 ~", "최종적으로 ~" 같은 단계 연결어 사용`;
    }
    if (sectionKey === "consult") {
      return `
[동선 흐름 — 진료 단계 안내]
진료 진행을 시간 순서로 정리:
  1단계: 접수·대기 → 진료실 입장
  2단계: 문진·검사
  3단계: 검사 결과 설명 → 진료 방향 안내
  4단계: 질문 응대 → 진료 결정
- "처음에는 ~ 이후 ~ 마지막으로 ~" 단계 연결어 사용`;
    }
    return "";
  }

  // personal: 1인칭 시간 흐름 (실제 경험담 느낌)
  if (sectionKey === "situation") {
    return `
[동선 흐름 — 시간 순서로 자연스럽게 ★ 상단 유지 핵심]
검색·예약·도착까지 한 흐름으로 이어지게:
  ① 정보 검색·후기 비교
  ② 2~3곳 추려서 비교
  ③ 예약 결정

다음 표현 중 1~2개 자연스럽게 사용:
- "처음엔 혼자 검색만 하다가"
- "가까운 곳보다 후기 보고 결정하기로 했어요"
- "용기 내서 예약 잡았어요"
→ 정보 나열 ❌ / 시간 흐름 ✅`;
  }
  if (sectionKey === "consult") {
    return `
[동선 흐름 — 진료 당일 시간 순서 ★ 상단 유지 핵심]
도착 → 접수 → 대기 → 검사 → 상담 → 결정 흐름으로:
  ① 도착·접수
  ② 진료실 입장
  ③ 검사 진행
  ④ 결과 설명
  ⑤ 질문·답변
  ⑥ 결정

다음 흐름 표현 중 2~3개 자연스럽게 사용:
- "접수 후 잠깐 기다리는데 생각보다 분위기가 편안했어요"
- "먼저 문진하고 검사로 이어졌어요"
- "검사 결과 설명을 차분히 해 주셨어요"
- "궁금한 거 물어봤더니 솔직하게 답해 주셨어요"
- "설명 듣고 치료 방향을 정했어요"
- "원장님이 '~' 라고 하시더라고요" (직접 인용 1회 필수)
→ 검사·상담을 따로따로 ❌ / 한 흐름으로 연결 ✅`;
  }
  if (sectionKey === "result") {
    return `
[시간 흐름 연결어 — 회복 단계 자연스럽게 이어가기]
- "그날 저녁에는 ~"
- "다음날 아침이 되니까 ~"
- "일주일쯤 지나고 보니 ~"
- "한 달이 다 되어갈 때쯤 ~"
→ "D+1" 같은 단순 라벨보다 자연스러운 시간 표현`;
  }
  return "";
}


function isSensitive(name) {
  return /음경|발기|조루|성병|귀두|정관|남성갱년기/.test(name);
}

function getSensitiveGuide(name) {
  if (!isSensitive(name)) return "";
  return `
[민감 시술 표현 가이드]
- 직접적·노골적 신체 표현 반복 금지
- "남성 자신감", "남성 고민", "기능 개선" 등 완화 표현 사용
- 부부·관계 맥락에서의 변화로 묘사
- 의료적 정보 전달에 충실. 자극적 묘사 금지.`;
}

// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildUrologyPrompt(section, treatment, region, options = {}) {
  const { mode = "personal" } = options;
  if (mode === "commercial") return buildCommercialUrologyPrompt(section, treatment, region, options);
  return buildPersonalUrologyPrompt(section, treatment, region, options);
}

function buildPersonalUrologyPrompt(section, treatment, region, options = {}) {
  const { name, pains = [], recommend = [], operationNotes = "", compareWith = "" } = treatment;
  const direction = getUrologyDirection(treatment.id);

  const directionGuide = `
[시술 방향 고정]
- 고민: ${direction.concern}
- 변화: ${direction.effect}
- 후킹: ${direction.hook}`;

  const common = `${directionGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}\n${getSensitiveGuide(name)}`;

  switch (section) {
    case 'concern':   return _personalConcern(name, region, pains, common);
    case 'situation': return _personalSituation(name, region, common);
    case 'consult':   return _personalConsult(name, region, compareWith, common);
    case 'reason':    return _personalReason(name, region, compareWith, common);
    case 'result':    return _personalResult(name, region, operationNotes, common);
    case 'closing':   return _personalClosing(name, region, recommend, common);
    default: throw new Error(`[urology-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalConcern(name, region, pains, common) {
  return `
당신은 ${region} 거주 일반인입니다. ${name} 진료를 받아본 1인칭 블로그 후기를 작성합니다.
첫 번째 섹션을 작성하세요.

${common}

[주제] ${name} 치료 전 고민과 불편함
[조건]
- 일상에서 겪는 구체적 불편함을 1인칭 구어체로
- 아래 고민 중 1~2개를 자연스럽게:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 비뇨기·배뇨·남성건강 관련 묘사만 사용
- 창피함·망설임·두려움 등 심리적 장벽 자연스럽게 표현
- 분량: 200~300자
- 말투: ~했어요, ~더라고요
`.trim();
}

function _personalSituation(name, region, common) {
  return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getFlowTimelineGuide('situation', 'personal')}

[주제] ${name} 비뇨기과 탐색 계기와 검색 과정
[조건]
- 검색어 예시 포함: "${region} ${name} 잘하는 곳"
- 지인 추천이 어려운 분야 — 인터넷·후기 의존 묘사
- ${region} 지역명 반드시 포함
- 2~3곳 비교 탐색 과정
- 분량: 200~300자
`.trim();
}

function _personalConsult(name, region, compareWith, common) {
  return `
블로그 후기의 세 번째 섹션입니다.
${common}
${getFlowTimelineGuide('consult', 'personal')}

[주제] ${region} 비뇨기과 상담 경험
[조건]
- 실제 환자 질문 1~2개 대화체 포함
  예: "원장님, ${name} 하면 얼마나 걸려요?" / "수술 많이 아픈가요?"
- 원장님 답변 직접 인용 1회: "원장님이 '~' 라고 하시더라고요"
- ${compareWith} 관련 질문 or 설명 포함
- 분량: 250~350자
`.trim();
}

function _personalReason(name, region, compareWith, common) {
  return `
블로그 후기의 네 번째 섹션입니다.
${common}

[주제] ${name} 선택 이유
[조건]
- ${compareWith} 비교 후 결정 과정
- '왜 이 병원, 이 치료인가' 구체적 이유
- ${region} 비뇨기과 선택 이유 1가지 이상
- 분량: 200~300자
`.trim();
}

function _personalResult(name, region, operationNotes, common) {
  return `
블로그 후기의 다섯 번째 섹션입니다.
${common}
${getFlowTimelineGuide('result', 'personal')}

[주제] ${name} 치료 후 회복·변화 타임라인
[조건]
- D+1 / D+7 / 1개월 / 3개월 단계별 변화
- 참고: ${operationNotes}
- 증상 완화·일상 회복·삶의 질 변화 구체적 묘사
- 비뇨기·배뇨·남성건강 관련 회복 표현만 사용
- 분량: 300~400자
`.trim();
}

function _personalClosing(name, region, recommend, common) {
  return `
블로그 후기의 마지막 섹션입니다.
${common}

[주제] 마무리 및 추천 대상
[조건]
- 치료 전후 변화를 한 문장으로 담담하게 요약
- 추천 대상 2개 자연스럽게 언급:
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
- ${region} + ${name} 키워드 자연스럽게 포함
- 드라마틱 마무리 금지
- 분량: 200~250자
`.trim();
}

// ============================================================
// 2. commercial 모드
// ============================================================
function buildCommercialUrologyPrompt(section, treatment, region, options = {}) {
  const { name, compareWith = "", operationNotes = "" } = treatment;
  const direction = getUrologyDirection(treatment.id);

  const adLawGuide = `
[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 시점 금지 (저는/제가/받아봤어요)
- ❌ 치료경험담 금지 (효과가 좋았어요)
- ❌ 가격 직접 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지 (확실히/100%/완치)
- ❌ 환자 유인 금지 (실비/할인)
- ❌ 병원 직접 추천 금지`;

  const common = `${adLawGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}\n${getSensitiveGuide(name)}`;

  const sectionGuides = {
    concern: `
[섹션 주제] ${name} 진료를 고려하게 되는 일반적 상황
[조건]
- 3인칭 정보형: "이런 분들이 진료를 고민하시곤 합니다"
- 방향: ${direction.concern}
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 비뇨기과 검토 시 일반 안내
[조건]
- 진료 검토 시 일반적으로 확인하는 항목 정리
- 분량: 200~300자`,

    consult: `
[섹션 주제] ${name} 상담 시 확인할 일반 항목
[조건]
- "상담 시 의료진은 보통 다음을 안내합니다"
- ❌ 가격 명시 금지 → "병원별 상이"
- 분량: 250~350자`,

    reason: `
[섹션 주제] ${name} 선택 시 일반 고려 기준
[조건]
- ${compareWith} 비교 시 각각의 특징 정리
- 변화 방향: ${direction.effect}
- 분량: 200~300자`,

    result: `
[섹션 주제] ${name} 일반적 회복·변화 경과 안내
[조건]
- D+1·D+7·1개월·3개월 일반 회복 단계
- "개인차가 있으나 일반적으로" 표현
- 참고: ${operationNotes}
- 분량: 300~400자`,

    closing: `
[섹션 주제] 진료 권장 안내
[조건]
- "비슷한 증상이라면 ${region} ${name} 진료를 고려해볼 수 있습니다"
- 의료진 상담 후 결정 권장
- 분량: 200~250자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] ${name} 안내`;

  return `
${region} ${name} 진료 안내 (정보형) — [${section}] 섹션만 작성.

${guide}
${common}
${getFlowTimelineGuide(section, 'commercial')}

---
정보형이지만 딱딱하지 않게. 자연스러운 안내 톤.
`.trim();
}

export { UROLOGY_DIRECTION };
