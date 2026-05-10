// lib/psy-data.js
// 정신건강의학과(psy) 진료 데이터
// ⚠️ 정신건강복지법 + 의료광고법 + 자살예방법 동시 적용 업종
//   - 약물명·진단코드 본문 등장 금지 (generatePsy.js safetyGuard에서 차단)
//   - 자살·자해 표현 검출 시 글 생성 자체 차단
//   - "완치/완전 해결" 류 효과 보장 표현 전면 금지
//
// 균형 구성 (매뉴얼 PART 1 기준 12~15개, 본 파일 14개):
//   - 약물치료 7: 우울·불안·공황·불면·ADHD·청소년·번아웃 (약물 명시 X, "약물치료" 일반어로만)
//   - 비약물·상담 7: CBT·rTMS·뉴로피드백·트라우마·관계·중년·산후

export const PSY_META = {
  industry: 'psy',
  label: '정신건강의학과',
  // 안전 가드레일 메타 — generatePsy.js에서 사용
  safetyMode: 'strict',
  // 의료광고법상 정신과 광고는 더 엄격한 표준 적용
  legalContext: '정신건강복지법, 의료광고법, 자살예방법',
};

export const PSY_CATS = [
  '전체',
  '우울·불안',
  '수면·집중',
  '관계·트라우마',
  '비약물치료',
  '연령별 특화',
];

export const PSY_TREATMENTS = [
  // ─────────────────────────────────────────
  // [약물치료 라인 7개] — 약물명 절대 명시 X, '약물치료' 일반어만
  // ─────────────────────────────────────────
  {
    id: 'psy_depression',
    industry: 'psy',
    name: '우울증 진료',
    cat: '우울·불안',
    emoji: '🌧️',
    titlePatterns: [
      '{region} 우울증 진료 후기',
      '{region} 정신건강의학과 우울증 상담',
      '{region} 우울증 약물치료 후기',
    ],
    keywords: ['우울증', '우울증 진료', '우울증 약물치료', '정신건강의학과', '우울감'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_anxiety',
    industry: 'psy',
    name: '불안장애 진료',
    cat: '우울·불안',
    emoji: '💭',
    titlePatterns: [
      '{region} 불안장애 진료 후기',
      '{region} 정신건강의학과 불안 진료',
      '{region} 불안장애 약물치료 후기',
    ],
    keywords: ['불안장애', '범불안장애', '불안 진료', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_panic',
    industry: 'psy',
    name: '공황장애 진료',
    cat: '우울·불안',
    emoji: '🫧',
    titlePatterns: [
      '{region} 공황장애 진료 후기',
      '{region} 정신건강의학과 공황 상담',
      '{region} 공황장애 치료 솔직 후기',
    ],
    keywords: ['공황장애', '공황발작', '정신건강의학과', '공황 진료'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_insomnia',
    industry: 'psy',
    name: '불면증 진료',
    cat: '수면·집중',
    emoji: '🌙',
    titlePatterns: [
      '{region} 불면증 진료 후기',
      '{region} 정신건강의학과 불면 상담',
      '{region} 불면증 약물치료 후기',
    ],
    keywords: ['불면증', '수면장애', '정신건강의학과', '불면 진료'],
    compareWith: '수면 인지행동치료',
  },
  {
    id: 'psy_adhd',
    industry: 'psy',
    name: '성인 ADHD 진료',
    cat: '수면·집중',
    emoji: '🎯',
    titlePatterns: [
      '{region} 성인 ADHD 진료 후기',
      '{region} 정신건강의학과 ADHD 상담',
      '{region} 성인 ADHD 검사 후기',
    ],
    keywords: ['성인 ADHD', 'ADHD 진료', '집중력 저하', '정신건강의학과'],
    compareWith: '뉴로피드백',
  },
  {
    id: 'psy_child_adhd',
    industry: 'psy',
    name: '아동 ADHD 진료',
    cat: '수면·집중',
    emoji: '🧒',
    titlePatterns: [
      '{region} 아동 ADHD 진료 후기',
      '{region} 정신건강의학과 아동 ADHD',
      '{region} 초등학생 ADHD 검사 후기',
    ],
    keywords: ['아동 ADHD', '초등 ADHD', '주의력결핍', '학습부진', '정신건강의학과'],
    compareWith: '뉴로피드백',
  },
  {
    id: 'psy_burnout',
    industry: 'psy',
    name: '번아웃 진료',
    cat: '우울·불안',
    emoji: '🔥',
    titlePatterns: [
      '{region} 번아웃 진료 후기',
      '{region} 정신건강의학과 번아웃 상담',
      '{region} 직장인 번아웃 진료 후기',
    ],
    keywords: ['번아웃', '직장인 우울', '소진증후군', '정신건강의학과'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_social',
    industry: 'psy',
    name: '사회불안장애 진료',
    cat: '우울·불안',
    emoji: '😶',
    titlePatterns: [
      '{region} 사회불안장애 진료 후기',
      '{region} 정신건강의학과 발표불안 상담',
      '{region} 사회공포증 솔직 후기',
    ],
    keywords: ['사회불안장애', '사회공포증', '발표불안', '대인기피', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_ocd',
    industry: 'psy',
    name: '강박장애 진료',
    cat: '우울·불안',
    emoji: '🔁',
    titlePatterns: [
      '{region} 강박장애 진료 후기',
      '{region} 정신건강의학과 강박 상담',
      '{region} 강박증 솔직 후기',
    ],
    keywords: ['강박장애', '강박증', 'OCD', '확인행동', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_teen',
    industry: 'psy',
    name: '청소년 정신건강 진료',
    cat: '연령별 특화',
    emoji: '🌱',
    titlePatterns: [
      '{region} 청소년 정신과 후기',
      '{region} 청소년 우울 진료',
      '{region} 청소년 정신건강 상담',
    ],
    keywords: ['청소년 정신과', '청소년 우울', '학교 부적응', '정신건강의학과'],
    compareWith: '청소년 심리상담',
  },

  // ─────────────────────────────────────────
  // [비약물·상담 라인 7개]
  // ─────────────────────────────────────────
  {
    id: 'psy_cbt',
    industry: 'psy',
    name: 'CBT 인지행동치료',
    cat: '비약물치료',
    emoji: '🧩',
    titlePatterns: [
      '{region} CBT 인지행동치료 후기',
      '{region} 정신건강의학과 CBT 상담',
      '{region} 인지행동치료 솔직 후기',
    ],
    keywords: ['CBT', '인지행동치료', '비약물치료', '정신건강의학과'],
    compareWith: '약물치료',
  },
  {
    id: 'psy_rtms',
    industry: 'psy',
    name: 'rTMS 자기자극치료',
    cat: '비약물치료',
    emoji: '🧲',
    titlePatterns: [
      '{region} rTMS 치료 후기',
      '{region} 정신건강의학과 rTMS 상담',
      '{region} 우울증 rTMS 치료 후기',
    ],
    keywords: ['rTMS', '경두개자기자극', '비약물 우울증', '정신건강의학과'],
    compareWith: '약물치료',
  },
  {
    id: 'psy_neurofeedback',
    industry: 'psy',
    name: '뉴로피드백',
    cat: '비약물치료',
    emoji: '🌊',
    titlePatterns: [
      '{region} 뉴로피드백 후기',
      '{region} 정신건강의학과 뉴로피드백',
      '{region} 뉴로피드백 솔직 후기',
    ],
    keywords: ['뉴로피드백', 'neurofeedback', '집중력 훈련', '정신건강의학과'],
    compareWith: '약물치료',
  },
  {
    id: 'psy_emdr',
    industry: 'psy',
    name: 'EMDR 안구운동치료',
    cat: '비약물치료',
    emoji: '👁️',
    titlePatterns: [
      '{region} EMDR 치료 후기',
      '{region} 정신건강의학과 EMDR 상담',
      '{region} EMDR 트라우마 회기 후기',
    ],
    keywords: ['EMDR', '안구운동민감소실재처리', '트라우마치료', '비약물치료', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_mbct',
    industry: 'psy',
    name: '마음챙김(MBCT)',
    cat: '비약물치료',
    emoji: '🧘',
    titlePatterns: [
      '{region} 마음챙김 치료 후기',
      '{region} 정신건강의학과 MBCT 상담',
      '{region} 마음챙김 인지치료 솔직 후기',
    ],
    keywords: ['마음챙김', 'MBCT', '명상치료', '재발방지', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_trauma',
    industry: 'psy',
    name: '트라우마 상담',
    cat: '관계·트라우마',
    emoji: '🕊️',
    titlePatterns: [
      '{region} 트라우마 상담 후기',
      '{region} 정신건강의학과 트라우마',
      '{region} PTSD 상담 후기',
    ],
    keywords: ['트라우마 상담', 'PTSD', 'EMDR', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_relation',
    industry: 'psy',
    name: '관계 상담',
    cat: '관계·트라우마',
    emoji: '🫂',
    titlePatterns: [
      '{region} 관계 상담 후기',
      '{region} 정신건강의학과 관계 갈등',
      '{region} 부부 관계 상담 후기',
    ],
    keywords: ['관계 상담', '부부 상담', '대인관계', '정신건강의학과'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_grief',
    industry: 'psy',
    name: '애도 상담',
    cat: '관계·트라우마',
    emoji: '🕯️',
    titlePatterns: [
      '{region} 애도 상담 후기',
      '{region} 정신건강의학과 사별 상담',
      '{region} 상실 후 상담 솔직 후기',
    ],
    keywords: ['애도 상담', '사별 상담', '상실', '복합비애', '정신건강의학과'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_anger',
    industry: 'psy',
    name: '분노조절 상담',
    cat: '관계·트라우마',
    emoji: '💢',
    titlePatterns: [
      '{region} 분노조절 상담 후기',
      '{region} 정신건강의학과 분노조절장애',
      '{region} 충동조절 진료 솔직 후기',
    ],
    keywords: ['분노조절', '분노조절장애', '충동조절', '간헐적 폭발', '정신건강의학과'],
    compareWith: 'CBT 인지행동치료',
  },
  {
    id: 'psy_midlife',
    industry: 'psy',
    name: '중년 정신건강 진료',
    cat: '연령별 특화',
    emoji: '🌾',
    titlePatterns: [
      '{region} 중년 우울 진료 후기',
      '{region} 정신건강의학과 갱년기 우울',
      '{region} 중년 번아웃 진료 후기',
    ],
    keywords: ['중년 우울', '갱년기 우울', '중년 정신건강', '정신건강의학과'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_postpartum',
    industry: 'psy',
    name: '산후 정신건강 진료',
    cat: '연령별 특화',
    emoji: '🤍',
    titlePatterns: [
      '{region} 산후우울 진료 후기',
      '{region} 정신건강의학과 산후 상담',
      '{region} 산후우울증 솔직 후기',
    ],
    keywords: ['산후우울', '산후 정신건강', '육아 우울', '정신건강의학과'],
    compareWith: '심리상담',
  },
  {
    id: 'psy_senior',
    industry: 'psy',
    name: '노인 정신건강 진료',
    cat: '연령별 특화',
    emoji: '🌻',
    titlePatterns: [
      '{region} 노인 우울 진료 후기',
      '{region} 정신건강의학과 노년기 상담',
      '{region} 어르신 우울 진료 후기',
    ],
    keywords: ['노인 우울', '노년기 우울', '노인 정신건강', '인지저하', '정신건강의학과'],
    compareWith: '심리상담',
  },
];

// ─────────────────────────────────────────
// DIRECTION 맵 — 매뉴얼 PART 3-1 핵심
// 각 진료별 concern/effect/hook/keyword 4필드 필수
// ⚠️ 정신과 특화: hook은 "느낄 수 있을 때" 같은 가능성 표현 사용
//    "확실히 ~다" 같은 단정 표현 금지 (의료광고법)
// ─────────────────────────────────────────
export const DIRECTION = {
  psy_depression: {
    concern: '아침에 일어나는 게 힘들고 무기력감이 길게 이어져서',
    effect:  '기분 변화 추적, 일상 회복, 수면·식욕 안정',
    hook:    '평소 좋아하던 일도 시들해진 채로 몇 주를 보내고 있을 때',
    keyword: '우울증',
  },
  psy_anxiety: {
    concern: '걱정이 멈추지 않고 신체 증상까지 겹쳐서',
    effect:  '불안 신호 인식, 신체 반응 안정, 일상 기능 회복',
    hook:    '아무 일 없는데도 가슴이 두근거리고 손이 떨릴 때',
    keyword: '불안장애',
  },
  psy_panic: {
    concern: '갑작스러운 발작 경험 이후 외출이 두려워져서',
    effect:  '발작 빈도 감소, 회피 행동 완화, 예기불안 관리',
    hook:    '버스 안에서 갑자기 숨이 막혀 내렸던 그날 이후',
    keyword: '공황장애',
  },
  psy_insomnia: {
    concern: '잠들기까지 두 시간이 걸리고 자주 깨서',
    effect:  '입면 시간 단축, 수면 유지 개선, 낮 시간 컨디션 회복',
    hook:    '침대에 누워서 천장만 바라본 지 한 달이 넘었을 때',
    keyword: '불면증',
  },
  psy_adhd: {
    concern: '회의 내용이 흩어지고 마감이 자꾸 밀려서',
    effect:  '주의 지속 시간 확장, 마감 관리, 충동 조절 연습',
    hook:    '메일 한 통 답장에 한 시간이 걸리던 어느 평일',
    keyword: '성인 ADHD',
  },
  psy_burnout: {
    concern: '일에 흥미가 사라지고 출근 자체가 무거워져서',
    effect:  '회복 리듬 설계, 직무 스트레스 관리, 동기 회복',
    hook:    '주말을 다 쉬어도 월요일이 그대로 지치게 시작될 때',
    keyword: '번아웃',
  },
  psy_teen: {
    concern: '학교 가기를 미루고 방에서 나오지 않으려고 해서',
    effect:  '등교 스트레스 관리, 또래 관계 회복, 정서 안정',
    hook:    '아이가 며칠째 말수가 줄고 식탁에도 잘 안 나올 때',
    keyword: '청소년 정신과',
  },
  psy_cbt: {
    concern: '같은 생각이 반복되고 행동이 굳어 있어서',
    effect:  '자동사고 인식, 대안 행동 연습, 생활 패턴 재구성',
    hook:    '내 생각이 어디서부터 꼬였는지 정리하고 싶을 때',
    keyword: 'CBT 인지행동치료',
  },
  psy_rtms: {
    concern: '약물치료에 반응이 충분치 않거나 부담이 커서',
    effect:  '비약물 옵션 확인, 회기별 변화 추적, 일상 영향 최소화',
    hook:    '약 외에 다른 길이 있을지 알아보고 싶었을 때',
    keyword: 'rTMS 자기자극치료',
  },
  psy_neurofeedback: {
    concern: '집중력이 흩어지고 긴장 이완이 잘 안 돼서',
    effect:  '뇌파 패턴 모니터링, 자기 조절 훈련, 일상 적용',
    hook:    '명상이 잘 안 잡히는 사람도 가능한지 궁금했을 때',
    keyword: '뉴로피드백',
  },
  psy_trauma: {
    concern: '특정 장면이 반복해 떠오르고 신체가 굳어서',
    effect:  '안전감 회복, 침습 기억 재처리, 회피 행동 완화',
    hook:    '잊었다고 생각했는데 어느 순간 다시 떠오르던 그 장면',
    keyword: '트라우마 상담',
  },
  psy_relation: {
    concern: '가까운 사람과 매번 같은 갈등이 반복돼서',
    effect:  '갈등 패턴 인식, 의사소통 연습, 거리 조절',
    hook:    '같은 다툼이 5년째 그대로 반복된다는 걸 깨달았을 때',
    keyword: '관계 상담',
  },
  psy_midlife: {
    concern: '몸과 마음의 변화가 동시에 와서 정리가 어렵고',
    effect:  '호르몬·수면 변화 감별, 생활 리듬 조정, 동기 회복',
    hook:    '갑자기 의욕이 빠져나간 50대의 어느 가을',
    keyword: '중년 우울',
  },
  psy_postpartum: {
    concern: '아기를 낳고 기분이 깊게 가라앉아서',
    effect:  '산모 컨디션 회복, 가족 지원 점검, 양육 스트레스 관리',
    hook:    '아기를 안고도 눈물이 멈추지 않던 새벽',
    keyword: '산후우울',
  },
  psy_social: {
    concern: '발표·회식·낯선 자리에서 떨림과 회피가 반복돼서',
    effect:  '회피 행동 단계적 노출, 발표 상황 적응 훈련, 신체 반응 관리',
    hook:    '발표 전날 잠을 설치는 일이 한 달 이상 반복됐을 때',
    keyword: '사회불안장애',
  },
  psy_ocd: {
    concern: '같은 확인 행동을 하루 수십 번 반복하게 돼서',
    effect:  '강박 사고 인식, 노출·반응방지 연습, 일상 시간 회복',
    hook:    '문 잠금을 다섯 번 확인해도 다시 돌아가게 됐을 때',
    keyword: '강박장애',
  },
  psy_child_adhd: {
    concern: '수업 집중이 어렵고 숙제 마무리가 자꾸 미뤄져서',
    effect:  '주의력 평가, 학습 환경 조정, 또래 관계 점검',
    hook:    '담임선생님 상담에서 같은 말이 반복해서 나왔을 때',
    keyword: '아동 ADHD',
  },
  psy_grief: {
    concern: '가까운 사람과의 이별 이후 일상 복귀가 어려워서',
    effect:  '슬픔 정상화, 의미 재구성, 일상 리듬 회복',
    hook:    '장례 후 몇 달이 지나도 같은 자리에 멈춰 있던 시점',
    keyword: '애도 상담',
  },
  psy_anger: {
    concern: '작은 일에 폭발하고 후회가 반복돼서',
    effect:  '분노 신호 인식, 일시정지 기술 연습, 표현 방식 재구성',
    hook:    '가족에게 쏟아낸 말이 잠들 때마다 떠오르던 시점',
    keyword: '분노조절',
  },
  psy_emdr: {
    concern: '특정 장면이 떠올라 신체 반응이 따라오는 상태가 길어져서',
    effect:  '기억 재처리, 신체 긴장 완화, 회피 행동 감소',
    hook:    '말로 정리하기 어려운 장면이 자꾸 떠올랐을 때',
    keyword: 'EMDR',
  },
  psy_mbct: {
    concern: '재발이 반복되고 약물 외 일상 연습이 필요해서',
    effect:  '주의 조절 훈련, 재발 신호 자각, 생활 적용',
    hook:    '같은 우울감이 계절마다 돌아온다는 걸 알아챘을 때',
    keyword: '마음챙김',
  },
  psy_senior: {
    concern: '잠·식욕·의욕 변화가 동시에 오고 인지 변화도 의심돼서',
    effect:  '우울·인지 감별, 약물 상호작용 점검, 생활 리듬 조정',
    hook:    '부모님이 좋아하시던 일에 흥미를 잃은 지 한 달이 넘었을 때',
    keyword: '노인 우울',
  },
};
