// =============================================
// lib/dental-prompts.js
// 치과 프롬프트 빌더 v2.0
//
// 변경사항 (v2.0):
//   1. DIRECTION 맵 추가 — 시술별 concern·effect·hook·keyword 고정
//   2. mode 분기 — "personal" | "commercial"
//   3. AI 냄새 제거 가이드 강화
// =============================================

// ============================================================
// 0. DIRECTION 맵 — 치과 시술별 방향 고정
// ============================================================
const DENTAL_DIRECTION = {
  implant: {
    concern: "치아가 빠져 씹기 불편하고 옆 치아까지 영향이 갈까 걱정되어서",
    effect:  "자연치아 기능 회복, 씹는 힘 복원, 옆 치아 보호",
    hook:    "음식 씹을 때마다 한쪽으로만 씹게 됐을 때",
    keyword: "임플란트",
  },
  laminate: {
    concern: "앞니 변색·모양이 신경 쓰여 사진·웃을 때 자신감이 없어서",
    effect:  "앞니 모양·색 개선, 자연스러운 미소, 짧은 치료 기간",
    hook:    "사진에서 앞니가 도드라져 보였을 때",
    keyword: "라미네이트",
  },
  braces: {
    concern: "치아 배열이 고르지 않은데 일반 교정은 외관·기간이 부담돼서",
    effect:  "투명한 교정 장치, 외관 부담 적음, 점진적 교정",
    hook:    "성인 교정인데 철 교정이 부담스러웠을 때",
    keyword: "투명교정",
  },
  rootcanal: {
    concern: "충치가 깊어 신경까지 침범했고 통증이 심해서",
    effect:  "치아 보존, 통증 제거, 자연치아 유지",
    hook:    "찬물·뜨거운 거 닿을 때마다 심한 통증이 왔을 때",
    keyword: "신경치료",
  },
  scaling: {
    concern: "잇몸 출혈·구취가 신경 쓰이고 정기 관리가 필요해서",
    effect:  "치석·플라크 제거, 잇몸 건강 회복, 구강 청결",
    hook:    "양치할 때마다 피가 나기 시작했을 때",
    keyword: "스케일링",
  },
  wisdom: {
    concern: "사랑니 때문에 잇몸이 자주 붓고 통증이 반복돼서",
    effect:  "사랑니 발치, 잇몸 통증 해소, 치아 정렬 보호",
    hook:    "사랑니 부위가 자꾸 붓고 음식이 끼었을 때",
    keyword: "사랑니발치",
  },
  zirconia: {
    concern: "신경치료 후 깨질 위험이 있어 단단한 보철이 필요해서",
    effect:  "치아 보호, 자연치아 색상, 내구성 강함",
    hook:    "신경치료 후 보철 종류를 고민하던 중",
    keyword: "지르코니아크라운",
  },
  whitening: {
    concern: "커피·차·흡연으로 치아 착색이 심해 누렇게 보여서",
    effect:  "치아 미백, 톤 개선, 자신감 있는 미소",
    hook:    "사진에서 치아가 누렇게 나왔을 때",
    keyword: "치아미백",
  },
  tmj: {
    concern: "턱에서 소리가 나거나 통증이 있어 일상이 불편해서",
    effect:  "턱관절 안정화, 통증 완화, 이갈이 개선",
    hook:    "입 벌릴 때마다 턱에서 소리가 나기 시작했을 때",
    keyword: "턱관절치료",
  },
  resin: {
    concern: "작은 충치가 생겨 빠르게 치료하고 싶어서",
    effect:  "충치 부위 제거, 자연치아 색 복원, 1회 치료",
    hook:    "정기 검진에서 작은 충치가 발견됐을 때",
    keyword: "레진치료",
  },
  inlay: {
    concern: "충치가 깊은데 크라운까지는 부담스러워서",
    effect:  "충치 제거 후 정밀 충전, 자연치아 보존, 내구성",
    hook:    "충치 치료 옵션을 비교하던 중",
    keyword: "인레이·온레이",
  },
  ceramic_crown: {
    concern: "앞니 보철이 필요한데 자연스러운 색상이 중요해서",
    effect:  "자연치아 색·모양, 심미성, 알레르기 적음",
    hook:    "앞니 크라운인데 티 나지 않게 하고 싶었을 때",
    keyword: "올세라믹크라운",
  },
  metal_braces: {
    concern: "치아 배열이 심하게 틀어져 본격적 교정이 필요해서",
    effect:  "확실한 교정 효과, 다양한 부정교합 대응",
    hook:    "투명교정으로는 어렵다는 진단을 받았을 때",
    keyword: "일반교정",
  },
  lingual_braces: {
    concern: "교정은 필요하지만 장치가 보이는 게 신경 쓰여서",
    effect:  "안쪽 부착, 외관 거의 안 보임, 효과적 교정",
    hook:    "직장인이라 외관 부담이 컸을 때",
    keyword: "설측교정",
  },
  periodontal: {
    concern: "잇몸이 자주 붓고 시리며 흔들리는 느낌이 있어서",
    effect:  "잇몸 염증 제거, 잇몸뼈 보호, 치아 보존",
    hook:    "정기검진에서 잇몸 상태가 안 좋다고 들었을 때",
    keyword: "잇몸치료",
  },
};

export function getDentalDirection(treatmentId) {
  return DENTAL_DIRECTION[treatmentId] || {
    concern: "치아 고민이 깊어졌어서",
    effect:  "치아·구강 건강 개선",
    hook:    "거울 보다가 치아 상태가 신경 쓰였을 때",
    keyword: "치과 진료",
  };
}

// ============================================================
// 0-1. AI 냄새 제거 가이드
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지 — 절대 사용 금지]
"드디어 결심하고" / "결국 선택하게 되었어요" / "마침내" / "비로소"
"마음이 편안해졌어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "차분하고 따뜻한" / "안정감 있는 분위기"
"미소를 되찾았어요" / "자신감을 찾았어요" / "새로운 삶"
"기준으로 살펴본" / "관리 방법과 생활 속" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지
→ 대체: 구체적 날짜·횟수·통증 수치·원장 직접 인용·실제 행동 묘사`;
}

// ============================================================
// 0-2. 키워드 밀도 + 조사 오류 가이드
// ============================================================
function getKwDensityGuide(name) {
  return `
[키워드 밀도] "${name}"는 이 섹션에서 최대 2~3회만 직접 표기.
나머지는 "이 치료", "치료", "그 시술"로 대체. 5회 이상 반복 금지.

[조사 오류 금지]
"${name}" 뒤에 조사 직접 연결 시:
  ❌ "${name}을" → ✅ "이 치료를"
  ❌ "${name}는" → ✅ "이 치료는"
이중 공백 금지 ("그래서  받기로" → "그래서 이 치료를 받기로")`;
}

// ============================================================
// 동선 흐름 가이드 (FLOW_TIMELINE) — 상단 유지력 핵심 ★
//   "정보 나열" → "실제 하루 경험" 으로 전환
// ============================================================
function getFlowTimelineGuide(sectionKey, mode = "personal") {
  if (mode === "commercial") {
    if (sectionKey === "situation") {
      return `
[동선 흐름 — 치료 검토 단계 안내]
탐색 단계를 시간 순서로 정리:
  1단계: 증상·고민 자각 → 정보 검색 시작
  2단계: 후기·전문의 자격·접근성 비교
  3단계: 상담 가능 시간 확인 → 예약
- "처음 검색을 시작할 때는 ~", "다음 단계로는 ~", "최종적으로 ~" 같은 단계 연결어 사용`;
    }
    if (sectionKey === "consult") {
      return `
[동선 흐름 — 치료 단계 안내]
치료 진행을 시간 순서로 정리:
  1단계: 접수·대기 → 진료실 입장
  2단계: 문진·검사
  3단계: 검사 결과 설명 → 치료 방향 안내
  4단계: 질문 응대 → 치료 결정
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
- "처음에는 그냥 검색만 했어요"
- "후기 몇 개 읽어보다가 후보를 좁혀봤어요"
- "예약하고 갔는데 생각보다 빨리 들어갔어요"
→ 정보 나열 ❌ / 시간 흐름 ✅`;
  }
  if (sectionKey === "consult") {
    return `
[동선 흐름 — 치료 당일 시간 순서 ★ 상단 유지 핵심]
도착 → 접수 → 대기 → 검사 → 상담 → 결정 흐름으로:
  ① 도착·접수
  ② 진료실 입장
  ③ 검사 진행
  ④ 결과 설명
  ⑤ 질문·답변
  ⑥ 결정

다음 흐름 표현 중 2~3개 자연스럽게 사용:
- "도착해서 접수하고 잠깐 기다렸어요"
- "먼저 X-ray부터 찍었어요"
- "검사 끝나고 결과 보면서 설명해 주셨어요"
- "설명 듣고 나서 받기로 했어요"
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
export function buildDentalPrompt(section, treatment, region, options = {}) {
  const { mode = "personal" } = options;
  if (mode === "commercial") {
    return buildCommercialDentalPrompt(section, treatment, region, options);
  }
  return buildPersonalDentalPrompt(section, treatment, region, options);
}

// ── personal 모드 ──
function buildPersonalDentalPrompt(section, treatment, region, options = {}) {
  const { name, pains = [], recommend = [], operationNotes = "", compareWith = "" } = treatment;
  const direction = getDentalDirection(treatment.id);

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
    default: throw new Error(`[dental-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalConcern(name, region, pains, common) {
  return `
당신은 ${region} 거주 일반인입니다. ${name} 진료를 받아본 경험을 1인칭 블로그 후기로 작성합니다.
첫 번째 섹션을 작성하세요.

${common}

[주제] ${name} 치료 전 고민과 불편함
[조건]
- 일상에서 겪는 구체적인 불편함을 1인칭 구어체로 작성
- 아래 고민 중 1~2개를 자연스럽게 녹여낼 것:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 치아·구강과 관련된 묘사만 사용 (성형/피부 표현 금지)
- 분량: 200~300자
- 말투: ~했어요, ~더라고요 (블로그 구어체)
`.trim();
}

function _personalSituation(name, region, common) {
  return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getFlowTimelineGuide('situation', 'personal')}

[주제] ${name} 치과 탐색 계기와 검색 과정
[조건]
- 검색어 예시 포함: "${region} ${name} 잘하는 곳", "${name} 비용"
- 지인 추천 or 네이버 블로그 검색 등 실제적 탐색 경로 묘사
- ${region} 지역명 반드시 포함
- 2~3곳 비교 탐색 과정 언급
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
}

function _personalConsult(name, region, compareWith, common) {
  return `
블로그 후기의 세 번째 섹션입니다.
${common}
${getFlowTimelineGuide('consult', 'personal')}

[주제] ${region} 치과 상담 경험
[조건]
- 실제 환자 질문 1~2개를 대화체로 반드시 포함
  예: "원장님, ${name} 하면 얼마나 걸려요?" / "아프지 않나요?"
- 원장님 답변 직접 인용 1회: "원장님이 '~' 라고 하시더라고요"
- ${compareWith} 관련 질문 or 설명 포함
- 상담 분위기 묘사 금지 → 설명 내용 자체가 납득됐다는 식으로
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
- ${compareWith} 비교 후 최종 결정 과정 서술
- 단순 가격 비교가 아닌 '왜 이 치과, 이 시술인가' 구체적 이유
- ${region} 치과를 선택한 구체적 이유 1가지 이상
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
}

function _personalResult(name, region, operationNotes, common) {
  return `
블로그 후기의 다섯 번째 섹션입니다.
${common}
${getFlowTimelineGuide('result', 'personal')}

[주제] ${name} 시술 후 회복·변화 타임라인
[조건]
- D+1 / D+7 / 1개월 / 3개월 형식으로 단계별 변화 서술
- 참고 정보: ${operationNotes}
- 통증·붓기·식사 제한 등 구체적 일상 변화 묘사
- 치아·구강 관련 회복 표현만 사용
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
- 시술 전후 변화를 한 문장으로 담담하게 요약
- 아래 추천 대상 중 2개를 자연스럽게 언급:
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
- ${region} + ${name} 키워드 자연스럽게 포함
- "미소를 되찾았어요" / "새로운 삶" 드라마틱 마무리 금지
- 분량: 200~250자
- 말투: 블로그 구어체
`.trim();
}

// ============================================================
// 2. commercial 모드 (광고법 안전)
// ============================================================
function buildCommercialDentalPrompt(section, treatment, region, options = {}) {
  const { name, compareWith = "", operationNotes = "" } = treatment;
  const direction = getDentalDirection(treatment.id);

  const adLawGuide = `
[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 시점 금지: "저는", "제가", "받아봤어요"
- ❌ 치료경험담 금지: "효과가 좋았어요", "만족합니다"
- ❌ 가격 직접 명시 금지: "OO만원" → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지: "확실히", "100%", "완치"
- ❌ 환자 유인 금지: "할인", "이벤트"
- ❌ 병원 직접 추천 금지`;

  const common = `${adLawGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}`;

  const sectionGuides = {
    concern: `
[섹션 주제] ${name} 진료를 고려하게 되는 일반적 상황 안내
[조건]
- 3인칭 정보형: "이런 분들이 진료를 고민하시곤 합니다"
- 일반 고민 2~3개 정리
- 방향: ${direction.concern}
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 ${name} 치과 검토 시 일반 안내
[조건]
- 진료 검토 시 일반적으로 확인하는 항목 정리
- "다음 항목을 확인해보시는 것이 권장됩니다" 형식
- 전문의 자격·시설·진료 분야 등 일반 기준
- 분량: 200~300자`,

    consult: `
[섹션 주제] ${name} 상담 시 확인할 일반 항목
[조건]
- "상담 시 의료진은 보통 다음을 안내합니다" 형식
- ❌ 가격·"OO만원" 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 1인칭 후기 금지
- 분량: 250~350자`,

    reason: `
[섹션 주제] ${name} 선택 시 일반 고려 기준
[조건]
- "${compareWith}와 비교 시 각각 다음 특징이 있습니다" 형식
- 변화 방향: ${direction.effect}
- ❌ "이게 더 좋다" 단정 금지
- 분량: 200~300자`,

    result: `
[섹션 주제] ${name} 일반적 회복·변화 경과 안내
[조건]
- 일반적 회복 단계 시점별 정리 (D+1·D+7·1개월·3개월)
- "개인차가 있으나 일반적으로 ~" 표현
- 참고: ${operationNotes}
- ❌ "좋아졌어요" 단정 금지
- 분량: 300~400자`,

    closing: `
[섹션 주제] 진료 권장 안내
[조건]
- "비슷한 고민이라면 ${region} ${name} 진료를 고려해볼 수 있습니다" 톤
- 진료 결정은 의료진 상담 후 권장
- ❌ "이 치과 추천" 금지
- 분량: 200~250자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] ${name} 안내`;

  return `
${region} ${name} 진료 안내 (정보형) — [${section}] 섹션만 작성.

${guide}
${common}
${getFlowTimelineGuide(section, 'commercial')}

---
이 섹션만 작성. 정보형이지만 딱딱하지 않게. 자연스러운 안내 톤.
`.trim();
}

// ============================================================
// 3. export
// ============================================================
export { DENTAL_DIRECTION };
