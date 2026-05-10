// =============================================
// lib/ent-prompts.js
// 이비인후과 프롬프트 빌더 v2.0
// =============================================

// ============================================================
// 0. DIRECTION 맵
// ============================================================
const ENT_DIRECTION = {
  snoring: {
    concern: "코골이가 심해 가족·배우자 수면을 방해하고 본인도 피곤해서",
    effect:  "코골이 강도 감소, 수면 질 개선, 일상 피로 완화",
    hook:    "아침마다 잠을 자도 피곤하다는 말을 들었을 때",
    keyword: "코골이수면치료",
  },
  septum: {
    concern: "비중격이 휘어 코로 숨쉬기 힘들고 코막힘이 만성화돼서",
    effect:  "비강 통기 회복, 코호흡 개선, 수면 질 개선",
    hook:    "한쪽 코로 숨쉬기 어렵다는 걸 자각했을 때",
    keyword: "비중격만곡증수술",
  },
  sinusitis: {
    concern: "축농증으로 누런 콧물·두통이 반복되고 일상이 불편해서",
    effect:  "부비동 염증 완화, 코막힘 해소, 두통 감소",
    hook:    "감기 후 콧물·두통이 한 달 넘게 이어졌을 때",
    keyword: "축농증치료",
  },
  rhinitis: {
    concern: "알레르기 비염으로 재채기·콧물이 매일 반복돼서",
    effect:  "비염 증상 완화, 일상 불편 감소, 면역 안정",
    hook:    "환절기마다 비염으로 일상이 멈출 때",
    keyword: "비염치료",
  },
  tonsil: {
    concern: "편도가 자주 부어 고열·통증이 반복되고 항생제 의존이 심해서",
    effect:  "편도 염증 재발 방지, 면역 안정, 입냄새 개선",
    hook:    "1년에 4번 이상 편도염으로 고생했을 때",
    keyword: "편도선수술",
  },
  otitis: {
    concern: "중이염이 반복돼 청력이 떨어지는 느낌이 들어서",
    effect:  "중이 염증 제거, 청력 보호, 재발 방지",
    hook:    "귀가 먹먹하고 소리가 잘 안 들리기 시작했을 때",
    keyword: "중이염치료",
  },
  tinnitus: {
    concern: "이명이 점점 커져 잠을 못 자고 일상에 지장이 생겨서",
    effect:  "이명 인식 감소, 수면 개선, 스트레스 완화",
    hook:    "조용한 밤에 귀에서 소리가 점점 커진다고 느꼈을 때",
    keyword: "이명치료",
  },
  sudden_hearing: {
    concern: "갑자기 한쪽 귀가 안 들리기 시작해 응급 진료가 필요해서",
    effect:  "72시간 내 치료로 청력 보존, 회복 가능성 향상",
    hook:    "어느 날 아침 한쪽 귀가 갑자기 먹먹해졌을 때",
    keyword: "돌발성난청치료",
  },
  voice: {
    concern: "목소리가 자주 쉬고 발성에 문제가 생겨서",
    effect:  "성대 회복, 발성 안정, 직업적 음성 보호",
    hook:    "강의·회의 후 목소리가 자주 잠기기 시작했을 때",
    keyword: "목소리이상치료",
  },
  dizziness: {
    concern: "어지럼증이 반복돼 일상 활동이 힘들어서",
    effect:  "전정기능 회복, 어지럼 빈도 감소, 일상 회복",
    hook:    "갑자기 빙글빙글 도는 느낌이 시작됐을 때",
    keyword: "어지럼증치료",
  },
  laryngoscopy: {
    concern: "쉰 목소리·이물감이 지속돼 정밀 검사가 필요해서",
    effect:  "성대·후두 정밀 진단, 조기 치료, 안심",
    hook:    "목에 뭔가 걸린 느낌이 한 달 넘게 지속됐을 때",
    keyword: "후두내시경검사",
  },
  hearing: {
    concern: "청력이 점점 떨어지고 일상 대화가 어려워서",
    effect:  "청력 정밀 진단, 보청기 적합 여부 확인, 청력 보호",
    hook:    "TV 볼륨이 자꾸 커진다는 가족 말을 들었을 때",
    keyword: "청력검사보청기",
  },
  epistaxis: {
    concern: "코피가 자주 나고 멈추지 않아 불안해서",
    effect:  "출혈 부위 진단·지혈, 재발 방지",
    hook:    "이유 없이 코피가 자주 흐르기 시작했을 때",
    keyword: "코피비출혈치료",
  },
  cpap: {
    concern: "수면무호흡으로 일상 피로·심혈관 위험이 걱정돼서",
    effect:  "야간 산소 안정화, 수면 질 개선, 심혈관 부담 감소",
    hook:    "수면검사에서 무호흡 진단을 받았을 때",
    keyword: "양압기치료",
  },
  immunotherapy: {
    concern: "비염 약물에 의존이 심해 근본적 치료가 필요해서",
    effect:  "원인 알레르겐 면역 형성, 약물 의존 감소, 장기 개선",
    hook:    "약 없이는 일상이 불가능하다고 느꼈을 때",
    keyword: "알레르기면역치료",
  },
  adenoid: {
    concern: "아이가 입 벌리고 자고 코골이·중이염이 반복돼서",
    effect:  "아데노이드 비대 해소, 비강·이관 통기 회복",
    hook:    "아이가 자면서 입으로 숨쉬는 게 자주 보였을 때",
    keyword: "아데노이드수술",
  },
};

export function getEntDirection(treatmentId) {
  return ENT_DIRECTION[treatmentId] || {
    concern: "귀·코·목 증상이 반복돼서",
    effect:  "이비인후과 진료를 통한 증상 개선",
    hook:    "증상이 일상을 불편하게 하기 시작했을 때",
    keyword: "이비인후과 진료",
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
"미소를 되찾았어요" / "새로운 삶"
"기준으로 살펴본" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지
→ 대체: 구체적 날짜·증상 변화·원장 인용`;
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
- "처음에는 그냥 약국에서 약만 사 먹었어요"
- "증상이 안 가시길래 병원을 알아봤어요"
- "예약하고 갔는데 대기가 짧았어요"
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
- "도착해서 접수하고 잠깐 기다렸어요"
- "먼저 내시경 검사부터 했어요"
- "검사 결과 보여주시면서 설명해 주셨어요"
- "궁금했던 거 물어봤더니 자세히 답해 주셨어요"
- "설명 듣고 나서 치료 방향을 정했어요"
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


// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildEntPrompt(section, treatment, region, options = {}) {
  const { mode = "personal" } = options;
  if (mode === "commercial") return buildCommercialEntPrompt(section, treatment, region, options);
  return buildPersonalEntPrompt(section, treatment, region, options);
}

function buildPersonalEntPrompt(section, treatment, region, options = {}) {
  const { name, pains = [], recommend = [], operationNotes = "", compareWith = "" } = treatment;
  const direction = getEntDirection(treatment.id);

  const directionGuide = `
[시술 방향 고정]
- 고민: ${direction.concern}
- 변화: ${direction.effect}
- 후킹: ${direction.hook}`;

  const common = `${directionGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}`;

  switch (section) {
    case 'concern':   return _personalConcern(name, region, pains, common);
    case 'situation': return _personalSituation(name, region, common);
    case 'consult':   return _personalConsult(name, region, compareWith, common);
    case 'reason':    return _personalReason(name, region, compareWith, common);
    case 'result':    return _personalResult(name, region, operationNotes, common);
    case 'closing':   return _personalClosing(name, region, recommend, common);
    default: throw new Error(`[ent-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalConcern(name, region, pains, common) {
  return `
당신은 ${region} 거주 일반인입니다. 이비인후과 진료를 받아본 1인칭 블로그 후기를 작성합니다.
첫 번째 섹션을 작성하세요.

${common}

[주제] ${name} 치료 전 고민과 불편함
[조건]
- 일상에서 겪는 구체적인 불편함을 1인칭 구어체로 작성
- 아래 고민 중 1~2개를 자연스럽게:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 귀·코·목·수면 관련 묘사만 사용 (성형/피부/치과 표현 금지)
- 분량: 200~300자
- 말투: ~했어요, ~더라고요
`.trim();
}

function _personalSituation(name, region, common) {
  return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getFlowTimelineGuide('situation', 'personal')}

[주제] ${name} 이비인후과 탐색 계기와 검색 과정
[조건]
- 검색어 예시 포함: "${region} ${name} 잘하는 곳"
- 지인 추천 or 네이버 검색 등 실제적 탐색 경로
- ${region} 지역명 반드시 포함
- 2~3곳 비교 탐색 과정
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
}

function _personalConsult(name, region, compareWith, common) {
  return `
블로그 후기의 세 번째 섹션입니다.
${common}
${getFlowTimelineGuide('consult', 'personal')}

[주제] ${region} 이비인후과 상담·진료 경험
[조건]
- 실제 환자 질문 1~2개 대화체로 포함
  예: "원장님, ${name} 하면 얼마나 걸려요?" / "수술하면 많이 아픈가요?"
- 원장님 답변 직접 인용 1회: "원장님이 '~' 라고 하시더라고요"
- ${compareWith} 관련 질문 or 설명 포함
- 분량: 250~350자
- 말투: 블로그 구어체
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
- ${region} 이비인후과 선택 이유 1가지 이상
- 분량: 200~300자
- 말투: 블로그 구어체
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
- 통증·불편감·일상 변화 구체적 묘사
- 귀·코·목·수면 관련 회복 표현만 사용
- 분량: 300~400자
- 말투: 블로그 구어체
`.trim();
}

function _personalClosing(name, region, recommend, common) {
  return `
블로그 후기의 마지막 섹션입니다.
${common}

[주제] 마무리 및 추천 대상
[조건]
- 치료 전후 변화를 한 문장으로 담담하게 요약
- 추천 대상 중 2개 자연스럽게 언급:
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
- ${region} + ${name} 키워드 자연스럽게 포함
- 드라마틱 마무리 금지
- 분량: 200~250자
- 말투: 블로그 구어체
`.trim();
}

// ============================================================
// 2. commercial 모드
// ============================================================
function buildCommercialEntPrompt(section, treatment, region, options = {}) {
  const { name, compareWith = "", operationNotes = "" } = treatment;
  const direction = getEntDirection(treatment.id);

  const adLawGuide = `
[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 시점 금지 (저는/제가/받아봤어요)
- ❌ 치료경험담 금지 (효과가 좋았어요)
- ❌ 가격 직접 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지 (확실히/100%/완치)
- ❌ 환자 유인 금지 (실비/할인)
- ❌ 병원 직접 추천 금지`;

  const common = `${adLawGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}`;

  const sectionGuides = {
    concern: `
[섹션 주제] ${name} 진료를 고려하게 되는 일반적 상황
[조건]
- 3인칭 정보형: "이런 분들이 진료를 고민하시곤 합니다"
- 방향: ${direction.concern}
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 이비인후과 검토 시 일반 안내
[조건]
- 진료 검토 시 일반적으로 확인하는 항목 정리
- "다음 항목을 확인해보시는 것이 권장됩니다"
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
- ❌ "좋아졌어요" 단정 금지
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

export { ENT_DIRECTION };
