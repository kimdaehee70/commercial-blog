// ============================================================
// ortho-prompts.js — 정형외과 프롬프트 빌더 (완전 독립)
// ⚠️ clinic / dental / ent / urology / oriental 절대 참조 금지
// v2.0: mode 분기 추가 — "personal" | "commercial"
//   - personal: 1인칭 후기 톤 (개인 사용자용) — 기존 v1.1 그대로
//   - commercial: 3인칭 정보형 (광고법 안전, SaaS·광고대행용)
// ============================================================

// ============================================================
// 0. ORTHO_DIRECTION — 시술별 글 방향성 (commercial 모드에서 사용)
// ============================================================
const ORTHO_DIRECTION = {
  lumbar_disc: {
    concern: "허리 통증이 다리까지 내려와 일상에 지장이 커서",
    effect:  "통증 완화, 신경 자극 감소, 비수술적 회복",
    hook:    "오래 앉아 있으면 다리까지 저릴 때",
    keyword: "허리디스크",
  },
  cervical_disc: {
    concern: "목 뻐근함과 팔 저림이 반복돼서",
    effect:  "신경 압박 완화, 팔 저림 개선, 수면 질 회복",
    hook:    "베개를 바꿔도 아침마다 목이 뻐근할 때",
    keyword: "목디스크",
  },
  spinal_stenosis: {
    concern: "조금만 걸어도 다리가 저려 자주 쉬어야 해서",
    effect:  "보행 거리 회복, 신경 압박 완화, 일상 활동 회복",
    hook:    "마트만 다녀와도 다리가 무거울 때",
    keyword: "척추관협착증",
  },
  knee_arthritis: {
    concern: "무릎 통증으로 계단 오르내리기가 부담돼서",
    effect:  "통증 감소, 보행 회복, 연골 보호",
    hook:    "계단 내려갈 때 무릎이 시큰할 때",
    keyword: "무릎관절염",
  },
  meniscus: {
    concern: "무릎이 시큰하고 뻑뻑해 운동이 어려워서",
    effect:  "관절 안정성 회복, 통증 감소, 활동 복귀",
    hook:    "쪼그려 앉다가 무릎이 욱신거릴 때",
    keyword: "반월상연골",
  },
  shoulder: {
    concern: "어깨 통증으로 팔을 들기 힘들어서",
    effect:  "관절 가동범위 회복, 야간 통증 감소, 일상 복귀",
    hook:    "옷을 입을 때마다 어깨가 결릴 때",
    keyword: "어깨통증",
  },
  manual_therapy_ortho: {
    concern: "약물·주사 외에 비수술적 치료를 찾아서",
    effect:  "근골격 균형 회복, 통증 완화, 자세 교정",
    hook:    "오래 앉아 있다 일어나면 허리가 안 펴질 때",
    keyword: "도수치료",
  },
  shockwave_ortho: {
    concern: "만성 힘줄 통증이 약물에도 잘 안 잡혀서",
    effect:  "조직 재생 자극, 만성 통증 완화, 비수술적 접근",
    hook:    "발뒤꿈치·팔꿈치 통증이 몇 달째 안 가실 때",
    keyword: "체외충격파",
  },
  prolotherapy: {
    concern: "인대·힘줄이 약해져 반복적으로 다쳐서",
    effect:  "인대 강화, 관절 안정화, 재발 빈도 감소",
    hook:    "같은 부위를 자꾸 삐끗할 때",
    keyword: "프롤로주사",
  },
  acl: {
    concern: "운동 중 무릎이 휘청이며 다친 후 회복이 더뎌서",
    effect:  "인대 안정성 회복, 운동 복귀, 재발 위험 감소",
    hook:    "축구·등산 후 무릎에 힘이 빠질 때",
    keyword: "전방십자인대",
  },
  plantar_fasciitis: {
    concern: "아침 첫 발을 디딜 때 발바닥이 찢어지듯 아파서",
    effect:  "족저근막 회복, 아침 통증 완화, 보행 회복",
    hook:    "잠자리에서 일어날 때마다 발바닥이 욱신할 때",
    keyword: "족저근막염",
  },
  ankle_sprain: {
    concern: "삔 발목이 자꾸 약해져 반복적으로 다쳐서",
    effect:  "인대 강화, 관절 안정성 회복, 재발 방지",
    hook:    "계단·턱에서 자꾸 발목이 꺾일 때",
    keyword: "발목인대",
  },
  elbow: {
    concern: "팔꿈치 통증으로 무거운 물건을 들기 어려워서",
    effect:  "힘줄 회복, 통증 감소, 일상 동작 회복",
    hook:    "마우스나 가방을 들 때 팔꿈치가 찌릿할 때",
    keyword: "팔꿈치통증",
  },
  carpal_tunnel: {
    concern: "손가락 저림과 야간 통증으로 잠을 설쳐서",
    effect:  "정중신경 압박 완화, 저림 감소, 수면 질 개선",
    hook:    "새벽에 손이 저려 잠이 깰 때",
    keyword: "손목터널증후군",
  },
  fracture_rehab: {
    concern: "골절 후 회복이 더디고 일상 복귀가 어려워서",
    effect:  "근력·관절 가동범위 회복, 통증 관리, 점진적 복귀",
    hook:    "깁스 풀고 나서도 움직임이 어색할 때",
    keyword: "골절재활",
  },
  scoliosis: {
    concern: "허리·등 통증과 자세 변형이 신경 쓰여서",
    effect:  "척추 균형 회복, 통증 완화, 자세 교정",
    hook:    "사진 찍을 때 어깨 높이가 다른 게 보일 때",
    keyword: "척추측만증",
  },
  regenerten: {
    concern: "수술 전 마지막으로 비수술 옵션을 시도해보고 싶어서",
    effect:  "콜라겐 재생 자극, 인대·힘줄 회복, 통증 감소",
    hook:    "수술 권유받았는데 한 번 더 보존치료 고민할 때",
    keyword: "리제네텐",
  },
  rotator_cuff: {
    concern: "어깨 통증으로 팔을 들거나 옷 입기가 힘들어서",
    effect:  "회전근개 회복, 야간 통증 감소, 가동범위 복원",
    hook:    "팔을 등 뒤로 돌릴 때 통증이 심할 때",
    keyword: "회전근개",
  },
  frozen_shoulder: {
    concern: "어깨가 굳어 일상 동작이 점점 제한돼서",
    effect:  "관절낭 유연성 회복, 가동범위 확장, 야간 통증 감소",
    hook:    "옷 입을 때 팔이 안 올라갈 때",
    keyword: "오십견",
  },
  hip: {
    concern: "고관절 통증으로 걷기·앉기가 불편해서",
    effect:  "관절 가동성 회복, 보행 패턴 정상화, 통증 감소",
    hook:    "오래 걷고 나면 사타구니가 욱신할 때",
    keyword: "고관절",
  },
  cervical_stenosis: {
    concern: "목·어깨 통증과 손 저림이 반복돼서",
    effect:  "신경 압박 완화, 저림 감소, 일상 활동 회복",
    hook:    "키보드 칠 때 손가락이 저릴 때",
    keyword: "경추협착증",
  },
  cartilage_injection: {
    concern: "연골이 닳아 무릎 통증이 만성화돼서",
    effect:  "연골 보호, 통증 완화, 윤활 작용 회복",
    hook:    "무릎 굽힐 때마다 뻑뻑한 느낌이 들 때",
    keyword: "연골주사",
  },
  bunion: {
    concern: "엄지발가락이 휘어 신발 신기가 불편해서",
    effect:  "발가락 정렬 개선, 보행 통증 감소, 신발 적응",
    hook:    "구두 신을 때마다 엄지발가락이 닿아 아플 때",
    keyword: "무지외반증",
  },
  compression_fracture: {
    concern: "허리 압박골절 후 일상 자세 유지가 어려워서",
    effect:  "척추 안정성 회복, 통증 관리, 점진적 활동 복귀",
    hook:    "허리를 펴고 앉기조차 힘들 때",
    keyword: "압박골절",
  },
};

export function getOrthoDirection(treatmentId) {
  return ORTHO_DIRECTION[treatmentId] || {
    concern: "근골격 통증이 일상에 지장을 줘서",
    effect:  "통증 완화, 일상 회복, 비수술적 접근",
    hook:    "통증으로 일상이 불편해질 때",
    keyword: "정형외과 진료",
  };
}

// ============================================================
// 0-1. AI 냄새 제거 가이드 (commercial 공용)
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지 — 절대 사용 금지]
"드디어 결심하고" / "결국 선택하게 되었어요" / "마침내" / "비로소"
"마음이 편안해졌어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "차분하고 따뜻한" / "안정감 있는 분위기"
"새로운 삶" / "삶의 질이 크게" / "기준으로 살펴본"
"관리 방법과 생활 속" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지
→ 대체: 구체적 회차·기간·통증 수치·일반적 회복 단계 안내`;
}

// ============================================================
// 0-2. 키워드 밀도 + 조사 오류 가이드 (commercial 공용)
// ============================================================
function getKwDensityGuide(name) {
  return `
[키워드 밀도] "${name}"는 이 섹션에서 최대 2~3회만 직접 표기.
나머지는 "이 치료", "치료", "해당 시술"로 대체. 5회 이상 반복 금지.

[조사 오류 금지]
"${name}" 뒤에 조사 직접 연결 시:
  ❌ "${name}을" → ✅ "이 치료를"
  ❌ "${name}는" → ✅ "이 치료는"
이중 공백 금지`;
}

// ============================================================
// 0-3. 동선 흐름 가이드 (commercial 모드 전용)
// ============================================================
function getCommercialFlowGuide(sectionKey) {
  if (sectionKey === "situation") {
    return `
[동선 흐름 — 치료 검토 단계 안내]
탐색 단계를 시간 순서로 정리:
  1단계: 증상 자각 → 정보 검색
  2단계: 전문의 자격·시설·접근성 비교
  3단계: 상담 가능 시간 확인 → 예약
- "처음 검색을 시작할 때는 ~", "다음 단계로는 ~", "최종적으로 ~" 단계 연결어 사용`;
  }
  if (sectionKey === "consult") {
    return `
[동선 흐름 — 진료 단계 안내]
진료 진행을 시간 순서로 정리:
  1단계: 접수·대기 → 진료실 입장
  2단계: 문진·검사 (X-ray·MRI 등)
  3단계: 검사 결과 설명 → 치료 방향 안내
  4단계: 질문 응대 → 치료 결정
- "처음에는 ~ 이후 ~ 마지막으로 ~" 단계 연결어 사용`;
  }
  return "";
}

// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildOrthoPrompt(section, treatment, region, options = {}) {
  const { mode = "personal" } = options;
  if (mode === "commercial") {
    return buildCommercialOrthoPrompt(section, treatment, region, options);
  }
  return buildPersonalOrthoPrompt(section, treatment, region, options);
}

// ============================================================
// 2. PERSONAL 모드 (기존 v1.1 — 1인칭 후기톤)
// ============================================================
function buildPersonalOrthoPrompt(section, treatment, region, options = {}) {
  const { name, pains, recommend, operationNotes, compareWith } = treatment;

  // ── 치료 유형 분류 ────────────────────────────────────────
  const isSurgery   = /수술|재건|재활|골절/.test(name);
  const isDisc      = /디스크|협착|측만/.test(name);
  const isKnee      = /무릎|연골|십자인대|반월/.test(name);
  const isShoulder  = /어깨|오십견|회전근/.test(name);
  const isFoot      = /족저|발목|족부/.test(name);
  const isProcedure = /충격파|프롤로|리제네텐|주사/.test(name);
  const isManual    = /도수치료/.test(name);
  const isInsured   = /도수치료|체외충격파|주사/.test(name);

  // ── 공통 가이드 ───────────────────────────────────────────
  const surgeryGuide = isSurgery
    ? `\n[수술 안내] 수술 결정 과정·입원 기간·재활 기간 구체적 서술. "회복 얼마나 걸리나요?" 질문 포함.`
    : `\n[비수술 안내] 수술 없이 치료받으려는 탐색 과정과 선택 이유를 중심으로 서술.`;

  const insuranceGuide = isInsured
    ? `\n[실비 안내] 실비보험 적용 여부를 자연스럽게 언급. "실비로 얼마나 나왔나요?" 질문 가능.`
    : "";

  // AI 냄새 제거 — 전 섹션 공통
  const aiSmellGuide = `\n[AI 표현 금지] 다음 표현 절대 사용 금지:
"드디어 결심하고" / "결국 선택하게 되었어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "마음이 편안해졌어요" / "자연 치유의 힘"
"기준으로 살펴본" / "관리 방법과 생활 속" / "예방 전략"
"특히", "또한", "무엇보다" 연속 나열
→ 구체적 날짜·횟수·통증 수치·원장 직접 인용으로 대체`;

  // 치료 유형별 대체 표현 — 주사만 "재생주사/인대 강화" 허용
  const isInjectionType = /프롤로|PRP|리제네텐|주사/.test(name);
  const altExpr = isInjectionType
    ? `"재생주사", "인대 강화 주사", "이 치료"`
    : `"이 치료", "치료"`;
  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션에서 최대 2회. 나머지는 ${altExpr}로 대체.`;
  const grammarGuide   = `\n[조사 오류 금지 — 최중요 / 반드시 지킬 것]
치료명("${name}") 뒤에 조사를 직접 붙이는 것 절대 금지:
  "${name}이 치료" → ❌  반드시 "이 치료는" 으로
  "${name}이 시술" → ❌  반드시 "이 시술은" 으로
  "${name}이 주사" → ❌  반드시 "이 주사는" 으로
  "${name}을"     → ❌  반드시 "이 치료를" 으로
  "${name}이 치료를" → ❌  반드시 "이 치료를" 으로
  "${name}이 치료가" → ❌  반드시 "이 치료가" 으로

⚠️ 특히 "${name}" 처럼 긴 치료명일수록 이 오류가 자주 발생함.
   치료명을 쓴 다음 문장에서 바로 "이 치료", "이 주사", "이 시술"로 이어갈 것.
   예시: "${name}을 받기로 했어요" → ❌
        "이 치료를 받기로 했어요" → ✅
이중 공백 금지 ("그래서  받기로" → "그래서 이 치료를 받기로")`;

  // 치료별 비수술 강조 (실검 핵심 패턴)
  const nonSurgeryEmphasis = isDisc
    ? `\n[비수술 강조] 디스크·협착증은 "수술만이 답일까요?" 탐색 심리를 자연스럽게 반영.`
    : isKnee
    ? `\n[비수술 강조] 무릎은 "수술 전 마지막으로 시도해본 것"으로 포지셔닝.`
    : isShoulder
    ? `\n[야간통증 강조] 어깨는 "밤에 잠을 못 잘 정도" 야간 통증 묘사 포함.`
    : isFoot
    ? `\n[아침통증 강조] 족저는 "아침 첫 발을 딛는 순간" 통증 묘사 필수.`
    : "";

  switch (section) {
    case 'concern':
      return _personalConcern(name, region, pains, surgeryGuide, nonSurgeryEmphasis, aiSmellGuide, kwDensityGuide, grammarGuide);
    case 'situation':
      return _personalSituation(name, region, insuranceGuide, aiSmellGuide, kwDensityGuide, grammarGuide);
    case 'consult':
      return _personalConsult(name, region, compareWith, surgeryGuide, insuranceGuide, aiSmellGuide, grammarGuide);
    case 'reason':
      return _personalReason(name, region, compareWith, isDisc, isSurgery, aiSmellGuide, kwDensityGuide, grammarGuide);
    case 'result':
      return _personalResult(name, region, operationNotes, isSurgery, isProcedure, isManual, isShoulder, isFoot, isKnee, aiSmellGuide, kwDensityGuide, grammarGuide);
    case 'closing':
      return _personalClosing(name, region, recommend, aiSmellGuide, grammarGuide);
    default:
      throw new Error(`[ortho-prompts] 알 수 없는 섹션: ${section}`);
  }
}

// ── concern (personal) ──────────────────────────────────────────
function _personalConcern(name, region, pains, surgeryGuide, nonSurgeryEmphasis, aiSmellGuide, kwDensityGuide, grammarGuide) {
  return `
${region} 정형외과 ${name} 진료 과정의 첫 번째 섹션입니다. 환자 1인의 진료 흐름을 3인칭 관찰자 시점으로 기록합니다.
${surgeryGuide}${nonSurgeryEmphasis}${aiSmellGuide}${kwDensityGuide}${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지: "저는/제가/내가/저도" 사용 금지
- 감정 토로 금지: "걱정됐어요/불안했어요/고민이 깊어졌어요" 금지
- 어미는 중립형: "~됨 / ~되는 경우 / ~확인됨 / ~나타남 / ~로 진행됨"
- 광고 표현 금지: "솔직/후기 시작/추천"

[주제] ${name} 진료 전 일상에서 관찰된 증상·불편
[조건]
- 상황 묘사로 시작 (장면형 도입 OK, 단 1인칭 금지):
  ❌ "퇴근하고 집에 오다가 무릎이 욱신거리는 거예요"
  ✅ "퇴근 무렵 계단을 오를 때 무릎 통증이 반복됨"
  ✅ "출근 중 허리 통증이 반복적으로 나타남"
- 직장·운동·일상 맥락 1개를 객관적으로 묘사
- 아래 증상·불편 중 1~2개를 관찰형으로 녹여낼 것:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 방치 이유·치료 탐색 시작 배경은 사실 위주로 (수술 부담 / 비수술 우선 검토 등)
- 정형외과 영역만 다룸 (성형·치과·한방·비뇨기과 표현 금지)
- 분량: 200~300자
- 말투: ~됨 / ~된다 / ~되었음 / ~나타남 / ~확인됨 (담담한 기록형)
`.trim();
}

// ── situation (personal) ─────────────────────────────────────────
function _personalSituation(name, region, insuranceGuide, aiSmellGuide, kwDensityGuide, grammarGuide = "") {
  const shortName = name.replace(/치료|수술|재활|증후군/g, '');
  return `
${region} 정형외과 ${name} 탐색 과정 기록 — 두 번째 섹션입니다.
${insuranceGuide}${aiSmellGuide}${kwDensityGuide}

${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지 ("저는/제가" 등 금지)
- 어미: ~됨 / ~로 진행됨 / ~확인됨 / ~나타남
- "솔직/추천/꼭" 등 광고 어휘 금지
- "후기" 단어는 검색 의도 매칭 위해 1회까지만 자연스럽게 (예: "후기를 비교 검토한 결과")

[주제] ${name} 진료처 탐색 과정
[조건]
- 다음 검색어가 자연스럽게 본문에 등장 (사실 기술형):
  "${region} 정형외과 ${shortName}" / "${region} ${name}" / "${name} 비용"
  예: "${region} 정형외과 ${shortName}을 검색하여 후보 병원을 비교 검토함"
- 검색어 문자열 뒤에 치료명 직접 붙이는 패턴 금지: "잘하는 곳"${name}과 → ❌
- 비용·기간 등 일반 정보 검토 과정을 객관적으로 1회 언급
- 주사 계열은 "주사 후 경과", "효과 발현 시점" 검토 과정 포함 가능
- 정형외과 vs 신경외과 진료 영역 차이 검토 가능
- 2~3곳 후보 비교 검토 과정 (비교 기준: 전문의 자격·시설·진료 영역)
- ${region} 지역명 반드시 포함
- 분량: 200~300자
- 말투: ~됨 / ~확인됨 / ~검토됨 (담담한 기록형)
`.trim();
}

// ── consult (personal) ───────────────────────────────────────────
function _personalConsult(name, region, compareWith, surgeryGuide, insuranceGuide, aiSmellGuide, grammarGuide = "") {
  return `
${region} 정형외과 ${name} 상담 과정 기록 — 세 번째 섹션입니다.
${surgeryGuide}${insuranceGuide}${aiSmellGuide}

${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지 ("저는/제가" 등 금지)
- 어미: ~됨 / ~확인됨 / ~안내됨 / ~설명됨
- "솔직/추천/꼭" 등 광고 어휘 금지
- 의사 직접 인용은 허용 (사실 기록), 단 단정 표현 금지

[주제] ${region} 정형외과 ${name} 상담 단계 기록
[조건]
- 환자 질문 1개를 대화체로 기록 (비용·횟수·회복 기간 중 하나)
  예: "환자: '${name}은 몇 회 정도 진행되나요?'" 형태
  ❌ "원장님, 실비 적용되나요?" (실비 직접 언급 지양)
- 의사 답변 간접 인용 1회 (단정 표현 금지):
  ✅ "의료진은 일반적으로 10회 전후 진행되며 경과는 개인차가 있다고 안내함"
  ❌ "원장님이 '확실히 달라져요' 라고 하시더라고요" (단정 금지)
- ${compareWith} 비교 설명을 객관적으로 1회 포함 (수술 vs 비수술 등)
- 상담 분위기 묘사 금지 — 설명된 내용 자체만 기록
- 검사(X-ray·MRI·초음파·이학적 검사) 1~2개 사실 명시
- 분량: 250~350자
- 말투: ~됨 / ~안내됨 / ~확인됨 (담담한 기록형)
`.trim();
}

// ── reason (personal) ────────────────────────────────────────────
function _personalReason(name, region, compareWith, isDisc, isSurgery, aiSmellGuide, kwDensityGuide, grammarGuide = "") {
  const discNote = isDisc
    ? `\n- 수술 결정 전 비수술 옵션 검토 단계를 객관적으로 기록`
    : "";
  const surgNote = isSurgery
    ? `\n- 수술 결정에 이르는 검토 단계를 사실 위주로 기록`
    : `\n- 비수술 진료 선택 배경을 사실 위주로 기록 (회복 기간·부담 등 중립 표현)`;

  return `
${region} 정형외과 ${name} 진료 선택 단계 기록 — 네 번째 섹션입니다.
${aiSmellGuide}${kwDensityGuide}${discNote}${surgNote}

${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지 ("저는/제가" 등 금지)
- 어미: ~됨 / ~검토됨 / ~결정됨 / ~확인됨
- 광고 어휘 금지: "솔직/추천/꼭"
- 가격 직접 명시 금지: "실비 적용/OO만원" 금지

[주제] ${name} 진료 선택 단계 기록
[조건]
- ${compareWith}와의 비교 검토 과정을 객관적으로 기록
- ${region} 진료처 선택 기준 1가지를 사실 위주로 (전문의 자격·시설·진료 영역·접근성 중)
- 효과·만족 단정 표현 금지 — "변화의 가능성을 검토" 수준
- 분량: 200~300자
- 말투: ~됨 / ~검토됨 / ~결정됨 (담담한 기록형)
`.trim();
}

// ── result (personal) ────────────────────────────────────────────
function _personalResult(name, region, operationNotes, isSurgery, isProcedure, isManual, isShoulder, isFoot, isKnee, aiSmellGuide, kwDensityGuide, grammarGuide = "") {
  // 치료 유형별 타임라인 형식
  let timelineFormat;
  let specificNote = "";

  if (isSurgery) {
    timelineFormat = "수술 당일 / 1주일차 / 1개월차 / 3개월차 / 6개월차";
    specificNote   = "\n- 일상 복귀 시점은 일반적 경과로 기술 (단정 금지)";
  } else if (isProcedure) {
    timelineFormat = "1회 직후 / 3회차 / 5회 완료 후 / 3개월차";
    specificNote   = "\n- 회차별 변화는 관찰형으로 (예: \"통증 변화가 단계별로 관찰됨\")";
  } else if (isManual) {
    timelineFormat = "3회차 / 7회차 / 10회차 / 20회 완료";
    specificNote   = "\n- 회차별 자세·통증 변화는 관찰형으로 기록 (가격 직접 명시 금지)";
  } else {
    timelineFormat = "1회 직후 / 1주일차 / 1개월차 / 3개월차";
  }

  // isProcedure 대체 표현
  const procedureAlt = isProcedure
    ? `\n- 치료명 대체 표현 사용: "재생주사", "인대 강화 주사", "이 치료" 중 택일하여 자연스럽게 섞을 것`
    : "";

  // 증상별 실생활 변화 — 관찰형으로 톤 다운
  const symptomExamples = isShoulder
    ? `"팔의 거상 가동범위가 점차 회복됨" / "야간 통증이 점진적으로 감소"`
    : isFoot
    ? `"아침 첫 보행 시 통증이 점차 감소됨" / "장시간 보행 부담이 감소"`
    : isKnee
    ? `"계단 보행 시 통증이 점차 감소됨" / "무릎 안정성이 점진적으로 회복"`
    : `"계단 보행 시 통증이 점차 감소됨" / "허리 자세 유지가 점진적으로 회복"`;

  return `
${region} 정형외과 ${name} 회복 단계 기록 — 다섯 번째 섹션입니다.
${aiSmellGuide}${kwDensityGuide}${procedureAlt}

${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지 ("저는/제가" 등 금지)
- 어미: ~됨 / ~관찰됨 / ~확인됨 / ~점차 ~됨 / ~로 진행됨
- 효과 단정 절대 금지 ("통증 10→5 줄어듦" 같은 단정 수치 금지)
  → 대신 "통증 변화가 관찰됨", "점진적 회복 단계로 진행됨" 정도
- 가격 직접 명시 금지 ("OO만원" 금지) → "비용은 진료 시 안내"
- "확실히/완치/100%/만족" 단정 표현 금지
- "도움이 된다/효과를 볼 수 있다" 설명형 금지

[주제] ${name} 진료 후 회복 단계 기록
[조건]
- ${timelineFormat} 형식으로 단계별 변화 관찰 기록${specificNote}
- 참고 정보: ${operationNotes}
- 변화 표현은 관찰형:
  ${symptomExamples}
- 검사·진료 단계는 사실만 기록:
  ✅ "이학적 검사에서 가동범위 회복이 단계별로 확인됨"
  ✅ "회복 경과는 개인차가 있으며 일반적으로 ~로 진행됨"
  ❌ "팔이 자연스럽게 올라가요" / "잠을 푹 자게 됐어요" (1인칭 체험 금지)
- 분량: 300~400자
- 말투: ~됨 / ~관찰됨 / ~확인됨 (담담한 기록형)
`.trim();
}

// ── closing (personal) ───────────────────────────────────────────
function _personalClosing(name, region, recommend, aiSmellGuide, grammarGuide = "") {
  return `
블로그 마지막 섹션 — 진료 과정 마무리 기록입니다.
${aiSmellGuide}

${grammarGuide}

[톤 — 과정 기록형]
- 1인칭 시점 절대 금지 ("저는/제가" 등 금지)
- 어미: ~됨 / ~확인됨 / ~로 마무리됨
- CTA·추천·유도 절대 금지: "추천합니다 / 상담 받아보세요 / 방문해보세요 / 권해드려요" 전부 금지
- "삶이 달라졌어요 / 효과가 좋다 / 다행이에요" 광고형 표현 금지
- 후기 마무리 어휘 자제: "솔직 / 만족 / 후회 없음" 등 금지

[주제] 진료 과정 종합 기록
[조건]
- 진료 전후 변화는 관찰형으로 한 문장만 사실 기술
  ✅ "비수술 진료 단계로 진행되어 정기 경과 관찰이 진행됨"
  ❌ "비수술로 해결해서 다행이에요"
- 아래 적용 대상자 유형 중 2가지를 객관적 기술로 언급 (추천 어휘 금지):
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
  → 표현 예: "다음과 같은 경우 진료가 검토되는 사례로 알려져 있음"
- ${region} + ${name} 키워드 자연스럽게 포함 (검색 의도 매칭)
- 치료명 생략 금지: "${region}에서 검토되는" → ❌ / "${region} ${name}이(가) 검토되는" → ✅
- CTA 문장은 작성하지 않음 (마지막은 사실 기술로 마무리)
- 분량: 200~250자
- 말투: ~됨 / ~확인됨 / ~알려져 있음 (담담한 기록형)
`.trim();
}

// ============================================================
// 3. COMMERCIAL 모드 (3인칭 정보형, 의료광고법 안전)
//    - 1인칭 후기 금지 / 가격 명시 금지 / 효과 단정 금지
//    - 환자 유인(실비/할인) 금지 / 병원 직접 추천 금지
// ============================================================
function buildCommercialOrthoPrompt(section, treatment, region, options = {}) {
  const { name, compareWith = "", operationNotes = "" } = treatment;
  const direction = getOrthoDirection(treatment.id);

  const adLawGuide = `
[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 시점 금지: "저는", "제가", "받아봤어요"
- ❌ 치료경험담 금지: "효과가 좋았어요", "통증이 사라졌어요"
- ❌ 가격 직접 명시 금지: "OO만원" → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지: "확실히", "100%", "완치", "수술 없이 완치"
- ❌ 환자 유인 금지: "실비 적용", "할인", "이벤트"
- ❌ 병원 직접 추천 금지: "여기서 받으세요"
- ❌ 비교 우위 단정 금지: "수술보다 좋다"`;

  const common = `${adLawGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}`;

  const sectionGuides = {
    concern: `
[섹션 주제] ${name} 진료를 고려하게 되는 일반적 상황
[조건]
- 3인칭 정보형: "이런 분들이 진료를 고민하시곤 합니다"
- 일반적 증상·고민 2~3개 정리
- 방향: ${direction.concern}
- ❌ 1인칭 후기 금지
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 정형외과 검토 시 일반 안내
[조건]
- 진료 검토 시 일반적으로 확인하는 항목 정리
- "다음 항목을 확인해보시는 것이 권장됩니다" 형식
- 전문의 자격·시설(MRI/X-ray)·진료 분야 등 일반 기준
- ❌ 특정 병원 추천 금지
- 분량: 200~300자`,

    consult: `
[섹션 주제] ${name} 상담 시 확인할 일반 항목
[조건]
- "상담 시 의료진은 보통 다음을 안내합니다" 형식
- 일반적 검사(X-ray·MRI·초음파)와 진단 흐름 안내
- ❌ 가격 명시 금지: "OO만원" → "병원별 상이, 상담 시 확인"
- ❌ 실비 직접 언급 금지: "실비 적용 여부는 보험사·병원 상담 필요"
- ❌ 1인칭 후기 금지
- 분량: 250~350자`,

    reason: `
[섹션 주제] ${name} 선택 시 일반 고려 기준
[조건]
- "${compareWith}와 비교 시 각각의 특징이 있습니다" 형식
- 변화 방향: ${direction.effect}
- 수술/비수술 선택은 의료진 진단 기반임을 명시
- ❌ "이게 더 좋다" 단정 금지
- ❌ "수술 없이 해결" 단정 금지
- 분량: 200~300자`,

    result: `
[섹션 주제] ${name} 일반적 회복·변화 경과 안내
[조건]
- 일반적 회복 단계 시점별 정리 (1주·1개월·3개월·6개월 등)
- "개인차가 있으나 일반적으로 ~" 표현 필수
- 참고: ${operationNotes}
- ❌ "통증이 사라졌어요", "좋아졌어요" 단정 금지
- ❌ 구체적 회차별 통증 수치 단정 금지 ("VAS 8→2" 등)
- 회복은 환자 상태·재활 충실도에 따라 달라진다는 고지 포함
- 분량: 300~400자`,

    closing: `
[섹션 주제] 진료 권장 안내
[조건]
- "비슷한 증상이라면 ${region} ${name} 진료를 고려해볼 수 있습니다" 톤
- 진단·치료 결정은 의료진 상담 후 권장
- ❌ "이 병원 추천", "여기서 받으세요" 금지
- ❌ "꼭 받으세요", "상담 받아보세요" 직접 유도 금지
- 분량: 200~250자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] ${name} 안내`;

  return `
${region} ${name} 진료 안내 (정보형) — [${section}] 섹션만 작성.

${guide}
${common}
${getCommercialFlowGuide(section)}

---
이 섹션만 작성. 정보형이지만 딱딱하지 않게. 자연스러운 안내 톤.
`.trim();
}

// ============================================================
// 4. export
// ============================================================
export { ORTHO_DIRECTION };
