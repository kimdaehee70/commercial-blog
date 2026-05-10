// =============================================
// lib/patternDB.js
// 병원 블로그 전환형 문장 패턴 DB v1.0
//
// 반장의 patternDB.js와 동일 구조
// 섹션별 오프닝 · 연결 · 클로징 문장 패턴
// 어조 변형 · 금지 표현 · 자연도 규칙 포함
// generate.js가 프롬프트 생성 시 참조
// =============================================

// ============================================================
// 1. 섹션별 오프닝 패턴
//    — SECTION 시작 첫 1~2문장. 공감형 도입부.
// ============================================================

export const OPENING_PATTERNS = {

  concern: [
    // 감각형 (감정·신체 반응으로 시작)
    "{고민}이 계속 신경 쓰였다.",
    "거울을 볼 때마다 {고민} 때문에 눈이 갔다.",
    "{고민}이라는 생각이 어느 순간부터 자꾸 들었다.",
    "사진 찍을 때마다 {고민} 때문에 찍고 나서 지웠다.",

    // 시간형 (기간·반복으로 시작)
    "{기간}을 고민만 하다가 결국 찾아봤다.",
    "생각은 오래됐는데 실행이 안 됐다.",
    "마음속으로는 계속 알아봐야겠다고 했는데 미뤘다.",

    // 비교형 (다른 사람 기준으로 시작)
    "주변에서 {시술명}을 받았다는 말을 듣고 나서야 찾아봤다.",
    "친구 결과를 보고 나서 나도 한번 알아봐야겠다고 생각했다.",

    // 행동형 (검색·탐색으로 시작)
    "처음엔 그냥 검색만 했다.",
    "뭘 해야 할지 몰라서 후기부터 읽었다.",
    "검색창에 {시술명}을 치고 한참 읽었는데 결론을 못 냈다.",
  ],

  situation: [
    // 계기형 (구체적 사건)
    "{계기}가 계기였다.",
    "{장면} 순간에 결심했다.",
    "별거 아닌 것 같았는데 그게 계기가 됐다.",

    // 탐색형 (정보 수집 과정)
    "후기를 읽다 보니 비슷한 고민을 가진 사람이 많았다.",
    "{시술명} 후기를 몇 개 읽고 나서 상담을 예약했다.",
    "검색하다가 {병원 특징}이라는 말에 눈이 갔다.",

    // 비교형 (망설임에서 결심으로)
    "여러 군데를 비교하다가 일단 상담만 받아보자고 했다.",
    "어딜 가야 할지 몰라서 리뷰 좋은 곳으로 예약했다.",
  ],

  consult: [
    // 도착형 (상담 장소 도착)
    "상담실에 들어갔을 때 {첫인상}이었다.",
    "예약하고 갔는데 생각보다 {분위기}였다.",

    // 질문형 (첫 질문으로 시작)
    "상담을 시작하자마자 {질문}라고 물었다.",
    "제일 먼저 {고민}이 걱정이라고 말했다.",
    "솔직하게 {걱정}이 제일 크다고 했다.",

    // 진단형 (검사·분석으로 시작)
    "상담 전에 먼저 {진단 과정}을 했다.",
    "{기기}로 먼저 확인하고 나서 이야기를 시작했다.",
  ],

  reason: [
    // 비교 결과형
    "{비교대상}이랑 비교하다가 {시술명}으로 결정했다.",
    "{비교대상}은 {단점}이라는 말에 {시술명}으로 바꿨다.",

    // 결정 순간형
    "{의사 말}이라는 말에 결정이 됐다.",
    "그 말 한마디에 결정했다.",
    "설명을 듣고 나니 선택이 자연스러웠다.",

    // 근거형
    "{이유1}이고 {이유2}이니까 {시술명}이 맞다는 생각이 들었다.",
    "나한테 맞는 게 {시술명}이라는 걸 알고 나서 망설임이 없어졌다.",
  ],

  result: [
    // 시간 경과형
    "{기간}이 지나니까 {변화}이었다.",
    "처음엔 {초기 반응}이었는데 {기간} 후엔 달라졌다.",

    // 비교 확인형
    "전 사진이랑 지금을 비교하면 확실히 다르다.",
    "{기간} 전이랑 지금 사진을 나란히 놓으니까 {변화}이 보였다.",

    // 타인 반응형
    "주변에서 {반응}이라는 말을 들었을 때 기분이 좋았다.",
    "친한 친구도 한동안 몰랐다.",
    "{지인}이 {반응}이라고 물어봤는데 속으로 웃었다.",

    // 감정 체감형
    "{상황}을 할 때 {고민}이 신경 안 쓰인다.",
    "예전이랑 달라진 게 일상에서 느껴진다.",
  ],

  closing: [
    // 회고형
    "{고민}을 {기간} 했는데, 지금은 {감정}만 든다.",
    "망설이던 시간이 아깝다는 생각도 든다.",
    "그냥 진작 할걸 싶다.",

    // 권유형 (직접 권유 금지 — 경험 공유 형태로)
    "같은 고민을 하고 있다면 상담이라도 받아보는 걸 추천한다.",
    "검색만 하다 시간 보내는 것보다 한 번 가보는 게 낫다고 생각한다.",
    "나는 상담이라도 받아봤던 게 결정에 도움이 됐다.",

    // 키워드 자연 삽입형
    "{지역} {시술명}을 고민하고 있다면, 내 후기가 조금이라도 도움이 됐으면 좋겠다.",
    "이 글이 {고민}하는 누군가에게 도움이 됐으면 좋겠다.",
  ],
};

// ============================================================
// 2. 연결 문장 패턴 (BRIDGE PATTERNS)
//    — 섹션 내 단락 전환 시 자연스럽게 이어주는 문장
// ============================================================

export const BRIDGE_PATTERNS = {

  // 시간 흐름 연결
  timeFlow: [
    "그러다가 {계기}가 생겼다.",
    "{기간}이 지난 뒤에야 실행으로 옮겼다.",
    "결국엔 {행동}을 하게 됐다.",
    "그게 {결과}의 시작이었다.",
  ],

  // 감정 전환 연결
  emotionShift: [
    "근데 {이유} 듣고 나서는 생각이 바뀌었다.",
    "처음엔 {감정1}이었는데 {계기} 후엔 {감정2}이 됐다.",
    "그 말을 듣기 전까지는 {감정}이었다.",
    "생각보다 {사실}이라는 걸 그때 알았다.",
  ],

  // 정보 전달 연결
  infoTransition: [
    "상담에서 가장 기억에 남는 건 {내용}이었다.",
    "그때 처음 알게 된 게 {내용}이다.",
    "{내용}이라는 설명을 듣고 나서 {반응}이었다.",
    "의사 선생님이 {내용}이라고 했는데 그게 결정에 도움이 됐다.",
  ],

  // 비교 연결
  comparison: [
    "{A}는 {단점A}이고, {B}는 {단점B}이라는 걸 알게 됐다.",
    "두 가지를 비교했을 때 나한테는 {선택}이 맞겠다고 생각했다.",
    "{A} 대신 {B}를 선택한 이유는 {이유}였다.",
  ],

  // 결과 연결
  resultTransition: [
    "처음엔 {초기 반응}이었는데 {기간}이 지나니까 달라졌다.",
    "{기간} 후 사진과 지금을 비교하면 {변화}이 보인다.",
    "기대했던 것보다 {정도} 만족스럽다.",
  ],
};

// ============================================================
// 3. 시술별 자연 삽입 키워드 패턴
//    — 네이버 SEO 키워드를 자연스럽게 문장에 녹이는 형태
// ============================================================

export const KEYWORD_EMBED_PATTERNS = {

  자연유착쌍꺼풀: [
    // 제목·첫 단락에 삽입
    "강남 자연유착 쌍꺼풀 상담을 받아봤다.",
    "자연유착 쌍꺼풀 후기를 찾아보다가",
    "강남 눈성형 중에서 자연유착을 선택한 이유가 있다.",
    // 본문 중간 삽입
    "자연유착 쌍꺼풀 붓기는 {기간}이 제일 심했다.",
    "강남 자연유착 상담에서 매몰이랑 차이를 설명들었다.",
    // 클로징 삽입
    "강남 자연유착 쌍꺼풀을 고민하고 있다면 이 글이 도움이 됐으면 한다.",
  ],

  실리프팅: [
    "강남 실리프팅 상담을 처음 받아봤다.",
    "실리프팅 후기를 검색하다가 비수술이라는 말에 눈이 갔다.",
    "강남 리프팅 시술 중에서 실리프팅을 선택하게 됐다.",
    "실리프팅 붓기가 얼마나 가는지가 제일 걱정이었다.",
    "실리프팅 효과가 실제로 있는지 상담에서 직접 물어봤다.",
    "강남 실리프팅을 고민하고 있다면 상담 먼저 받아보는 걸 권한다.",
  ],

  피코레이저: [
    "강남 피코레이저 상담을 받게 된 계기는 잡티였다.",
    "피코레이저 후기를 여러 개 읽고 나서 예약했다.",
    "강남 피부과에서 피코레이저 추천을 받았다.",
    "피코레이저 통증이 걱정이었는데 생각보다 괜찮았다.",
    "피코레이저 횟수가 얼마나 필요한지 상담에서 확인했다.",
    "강남 피코레이저를 고민하고 있다면 이 글을 참고해도 좋다.",
  ],
};

// ============================================================
// 4. 어조 변형 규칙 (TONE VARIANTS)
//    — 같은 내용을 다른 어조로 변형하는 규칙
// ============================================================

export const TONE_VARIANTS = {

  // 20대 여성 — 구어체, 짧은 문장, 감탄사 포함
  "20대여성": {
    sentence_end: ["다.", "어.", "었다.", "나?", "더라.", "같다."],
    filler: ["솔직히", "진짜", "처음엔", "근데", "그냥", "생각보다"],
    reaction: ["생각보다 괜찮았다", "이거 진짜인가 싶었다", "속으로 웃었다"],
    avoid: ["사실", "실제로는", "결론적으로", "따라서", "본 결과"],
  },

  // 30대 여성 — 차분, 경험 중심, 비교형
  "30대여성": {
    sentence_end: ["다.", "었다.", "것 같다.", "느껴졌다.", "알 수 있었다."],
    filler: ["처음에는", "막상 해보니", "생각했던 것과 달리", "돌이켜보면"],
    reaction: ["예상보다 만족스러웠다", "잘 선택한 것 같다", "후회는 없다"],
    avoid: ["진짜", "완전", "대박", "쩔어"],
  },

  // 40대 여성 — 담담, 현실적, 효과 중심
  "40대여성": {
    sentence_end: ["다.", "었다.", "는 편이다.", "는 것 같다."],
    filler: ["솔직히 말하면", "직접 해보니까", "경험해보니"],
    reaction: ["기대를 했는데 그 이상이었다", "결과에 만족한다", "잘 한 것 같다"],
    avoid: ["진짜", "완전", "너무 좋다", "꼭 해봐"],
  },
};

// ============================================================
// 5. 금지 표현 목록 (FORBIDDEN PATTERNS)
//    — AI 특유의 광고 냄새, 과장, 부자연스러운 표현
// ============================================================

export const FORBIDDEN_PATTERNS = {

  // 광고성 금지 표현
  adLike: [
    "최고의 병원",
    "검증된 의료진",
    "압도적인 실력",
    "믿을 수 있는",
    "최첨단 장비",
    "업계 최고",
    "강력 추천",
    "놀라운 효과",
    "기적 같은 변화",
    "지금 바로 예약",
    "한정 이벤트",
    "할인 중",
  ],

  // AI 특유의 설명형 금지
  aiLike: [
    "결론적으로",
    "따라서",
    "이와 같이",
    "본 후기에서는",
    "위에서 설명한 바와 같이",
    "요약하자면",
    "정리하면",
    "앞서 언급한",
    "전반적으로 살펴보면",
  ],

  // 과장·과도한 긍정 금지
  overPositive: [
    "완전 대박",
    "인생 시술",
    "세상이 달라졌다",
    "후회 제로",
    "100점 만점",
    "안 할 이유가 없다",
    "무조건 해야 한다",
    "강력히 권장",
  ],

  // 의학적 단정 금지
  medicalAbsolute: [
    "효과가 확실합니다",
    "부작용 없습니다",
    "반드시 좋아집니다",
    "100% 안전합니다",
    "보장됩니다",
    "무조건 효과 있습니다",
  ],

  // 부자연스러운 경어 전환 금지
  awkwardPolite: [
    "알려드리겠습니다",
    "설명드리겠습니다",
    "참고하시기 바랍니다",
    "문의 주시면",
    "방문해 주세요",
    "상담 받아보세요",    // closing 제외
  ],
};

// ============================================================
// 6. 자연도 규칙 (NATURALNESS RULES)
//    — 문장 길이 · 반복 · 리듬에 관한 규칙
// ============================================================

export const NATURALNESS_RULES = {

  // 문장 길이 규칙
  sentenceLength: {
    min: 10,           // 너무 짧은 단문 지양
    max: 60,           // 너무 긴 단문 지양
    avgTarget: 25,     // 권장 평균 문자 수
    rule: "짧은 문장(10~20자)과 중간 문장(25~45자)을 7:3 비율로 섞기",
  },

  // 반복 금지
  repetition: {
    sameWordGap: 3,    // 같은 핵심 명사는 3문장 안에 반복 금지
    synonymSuggest: true, // 반복 시 동의어/대명사 교체 제안
    rule: "같은 시술명을 연속 3문장 이상 반복 금지. '이 시술', '그것', '여기서' 등으로 교체.",
  },

  // 단락 구성 규칙
  paragraph: {
    minSentences: 3,   // 단락 최소 문장 수
    maxSentences: 7,   // 단락 최대 문장 수
    rule: "한 단락에 하나의 장면/감정만. 내용이 바뀌면 단락도 바꾸기.",
  },

  // 감정 밀도 규칙
  emotionDensity: {
    minPerSection: 1,  // 섹션 당 최소 감정 표현 수
    maxPerSection: 3,  // 섹션 당 최대 감정 표현 수 (과잉 금지)
    rule: "감정 표현은 행동/사실 설명 뒤에 자연스럽게. 감정 나열 금지.",
  },

  // 대화 활용 규칙
  dialogue: {
    minPerBlog: 1,     // 블로그 당 최소 인용 대화 수
    maxPerBlog: 3,     // 블로그 당 최대 인용 대화 수
    rule: "상담 섹션에 최소 1개 이상. 따옴표로 표시. 의사 말 OR 본인 말.",
  },
};

// ============================================================
// 7. 이미지 ALT 패턴
//    — 섹션별 이미지 대체 텍스트 삽입 규칙
// ============================================================

export const IMAGE_ALT_PATTERNS = {

  concern:   (region, name) => `${region} ${name} 고민하는 사람`,
  situation: (region, name) => `${region} ${name} 상담 전`,
  consult:   (region, name) => `${region} ${name} 병원 상담`,
  reason:    (region, name) => `${region} ${name} 선택 이유`,
  result:    (region, name) => `${region} ${name} 시술 후 결과`,
  closing:   (region, name) => `${region} ${name} 후기 마무리`,

  // 이미지 삽입 규칙
  rule: "각 섹션 시작 또는 끝에 1개. 과도한 이미지 삽입 금지. [이미지: ALT텍스트] 형식.",
};

// ============================================================
// 8. 타겟별 패턴 가중치
//    — 타겟 유형에 따라 어떤 섹션 패턴을 강조할지
// ============================================================

export const TARGET_WEIGHTS = {

  consult: {
    // 상담 고민형 — consult · reason 섹션 비중 높임
    sectionEmphasis: { concern: 1, situation: 1, consult: 2, reason: 2, result: 1, closing: 1 },
    openingStyle:    "concern",   // 고민 공감으로 시작
    keyPattern:      "질문형",    // 상담에서 질문하는 장면 강조
    closingStyle:    "경험 공유형",
  },

  result: {
    // 시술 후기형 — result 섹션 비중 높임
    sectionEmphasis: { concern: 1, situation: 1, consult: 1, reason: 1, result: 3, closing: 1 },
    openingStyle:    "concern",
    keyPattern:      "타인 반응형",
    closingStyle:    "회고형",
  },

  compare: {
    // 비교 탐색형 — reason 섹션 비중 높임
    sectionEmphasis: { concern: 1, situation: 1, consult: 1, reason: 3, result: 1, closing: 1 },
    openingStyle:    "situation",
    keyPattern:      "비교 결과형",
    closingStyle:    "경험 공유형",
  },
};

// ============================================================
// 9. 블로그 유형별 패턴 조합
// ============================================================

export const BLOG_TYPE_PATTERNS = {

  review: {
    // 후기형 — 전 과정 균형 있게
    structure:    ["concern", "situation", "consult", "reason", "result", "closing"],
    toneKey:      "경험담",
    openingHint:  "고민에서 시작. 검색하게 된 계기 포함.",
    closingHint:  "회고 + 자연스러운 권유. 광고 금지.",
  },

  consult: {
    // 상담기형 — consult 비중 최대
    structure:    ["concern", "consult", "reason", "result", "closing"],
    toneKey:      "상담 과정 중심",
    openingHint:  "고민 짧게. 상담 이야기로 빠르게 전환.",
    closingHint:  "상담에서 얻은 정보 + 선택 결과 정리.",
  },

  compare: {
    // 비교형 — reason · 비교 부분 강화
    structure:    ["concern", "situation", "reason", "result", "closing"],
    toneKey:      "비교 과정 중심",
    openingHint:  "어떤 시술을 고를지 비교하던 상황으로 시작.",
    closingHint:  "선택한 이유 요약 + 결과.",
  },
};

// ============================================================
// 10. 유틸 함수
// ============================================================

// 랜덤 오프닝 패턴 반환
export function getOpeningPattern(sectionKey, variables = {}) {
  const patterns = OPENING_PATTERNS[sectionKey] || [];
  if (!patterns.length) return "";
  const template = patterns[Math.floor(Math.random() * patterns.length)];
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
}

// 랜덤 브릿지 패턴 반환
export function getBridgePattern(type, variables = {}) {
  const patterns = BRIDGE_PATTERNS[type] || [];
  if (!patterns.length) return "";
  const template = patterns[Math.floor(Math.random() * patterns.length)];
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || `{${key}}`);
}

// 키워드 임베드 패턴 반환 (시술명 기준)
export function getKeywordEmbedPatterns(treatmentName) {
  return KEYWORD_EMBED_PATTERNS[treatmentName] || [];
}

// 금지 표현 체크 (텍스트에 금지 표현 포함 여부 확인)
export function checkForbiddenPatterns(text) {
  const all = Object.values(FORBIDDEN_PATTERNS).flat();
  return all.filter(pattern => text.includes(pattern));
}

// 타겟별 섹션 강조 가중치 반환
export function getSectionWeight(targetId, sectionKey) {
  const weights = TARGET_WEIGHTS[targetId]?.sectionEmphasis || {};
  return weights[sectionKey] || 1;
}

// generate.js용 — 전체 패턴 컨텍스트 블록 빌드
export function buildPatternContext(treatmentName, targetId, blogTypeId) {
  const keywordPatterns = getKeywordEmbedPatterns(treatmentName);
  const blogType        = BLOG_TYPE_PATTERNS[blogTypeId] || BLOG_TYPE_PATTERNS.review;
  const targetWeight    = TARGET_WEIGHTS[targetId]       || TARGET_WEIGHTS.consult;

  return [
    `[ 문장 패턴 규칙 ]`,
    `블로그 유형: ${blogTypeId} — ${blogType.toneKey}`,
    `도입부 힌트: ${blogType.openingHint}`,
    `클로징 힌트: ${blogType.closingHint}`,
    ``,
    `[ 키워드 자연 삽입 — ${treatmentName} ]`,
    keywordPatterns.slice(0, 3).join("\n"),
    ``,
    `[ 자연도 규칙 ]`,
    `• ${NATURALNESS_RULES.sentenceLength.rule}`,
    `• ${NATURALNESS_RULES.repetition.rule}`,
    `• ${NATURALNESS_RULES.paragraph.rule}`,
    `• ${NATURALNESS_RULES.dialogue.rule}`,
    ``,
    `[ 금지 표현 ]`,
    `광고성: ${FORBIDDEN_PATTERNS.adLike.slice(0, 5).join(" / ")} 등`,
    `AI투: ${FORBIDDEN_PATTERNS.aiLike.slice(0, 4).join(" / ")} 등`,
    `과장: ${FORBIDDEN_PATTERNS.overPositive.slice(0, 4).join(" / ")} 등`,
    ``,
    `[ 타겟 패턴 강조 — ${targetId} ]`,
    `핵심 패턴: ${targetWeight.keyPattern}`,
    `클로징 스타일: ${targetWeight.closingStyle}`,
  ].join("\n");
}
