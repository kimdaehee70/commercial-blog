// ============================================================
// pediatrics-prompts.js — 소아청소년과 업종 프롬프트 빌더 v2.0
// ⚠️ clinic/dental 등 타 업종 prompts 절대 참조 금지
//
// v2.0 SEO 진단 기반 개선:
//   1. 세부 키워드 자연 분산 — 진단명·증상명·처방명 문장 내 삽입
//   2. 진단 과정 강화 — X-ray·청진·산소포화도·수치 묘사 필수화
//   3. 정보 블럭 추가 — 증상 비교·위험 신호·소아과 타이밍 (체류시간↑)
//   4. 반복 키워드 오류 방지 — 진료명 직접 연결 금지 지시 강화
// ============================================================

// ── 진료별 정보 블럭 데이터 ──────────────────────────────
const INFO_BLOCKS = {
  '소아 폐렴·기관지염': {
    compareTitle: '폐렴 vs 기관지염, 어떻게 다른가요?',
    compareItems: [
      '기관지염: 기도 염증 중심, 쌕쌕거림·기침, 바이러스성이 대부분',
      '폐렴: 폐 실질 감염, 고열·호흡 곤란 동반, 세균성이면 항생제 필요',
    ],
    warningTitle: '이 증상이면 바로 소아과로',
    warnings: [
      '숨 쉴 때 갈비뼈 사이가 쑥 들어가는 함몰 호흡',
      '입술이나 손톱 끝이 파랗게 변함 (청색증)',
      '산소포화도 95% 미만',
      '38.5도 이상 고열이 3일 이상 지속',
    ],
    examItems: ['청진(폐 잡음 확인)', '흉부 X-ray', '산소포화도 측정', '혈액검사(CRP·WBC)'],
  },
  '고열·열성경련': {
    compareTitle: '열이 나면 바로 응급실? 기준이 뭔가요?',
    compareItems: [
      '소아과 방문: 38.5도 이상 + 24시간 이상 / 해열제 효과 없음',
      '응급실: 경련 5분 이상 / 생후 3개월 미만 38도 이상 / 의식 저하',
    ],
    warningTitle: '놓치면 안 되는 위험 신호',
    warnings: [
      '경련이 5분 이상 멈추지 않는 경우',
      '생후 3개월 미만 아이의 38도 이상 발열',
      '발열과 함께 목이 뻣뻣해지는 경우',
    ],
    examItems: ['체온 측정', '혈액검사', '소변검사', '필요 시 요추천자'],
  },
  '소아 장염': {
    compareTitle: '장염 종류에 따라 대처가 달라요',
    compareItems: [
      '바이러스성(노로·로타): 항생제 불필요, 수분 보충이 핵심',
      '세균성: 혈변·고열 동반, 항생제 처방 필요할 수 있음',
    ],
    warningTitle: '탈수 위험 신호 즉시 소아과',
    warnings: [
      '8시간 이상 소변 없음',
      '울어도 눈물 안 남',
      '입술 마르고 피부 탄력 없음',
      '축 처지거나 반응이 느린 경우',
    ],
    examItems: ['탈수 정도 평가', '필요 시 수액 주사', '전해질 검사'],
  },
  '소아 중이염': {
    compareTitle: '중이염, 항생제 꼭 먹여야 하나요?',
    compareItems: [
      '급성 중이염: 세균성 확인 시 항생제 5~10일',
      '삼출성 중이염: 물만 찬 상태 → 경과 관찰 3개월',
    ],
    warningTitle: '중이염 놓치기 쉬운 신호',
    warnings: [
      '귀를 자꾸 잡아당기거나 긁는 행동',
      '부를 때 잘 못 듣거나 TV 볼륨 자꾸 높임',
      '감기 후 열이 다시 오름',
    ],
    examItems: ['이경 검사(고막 상태)', '고막 운동성 검사', '청력 검사(필요 시)'],
  },
  '소아 아토피': {
    compareTitle: '스테로이드 연고, 얼마나 써야 할까요?',
    compareItems: [
      '약한 스테로이드: 얼굴·접힌 부위 적용',
      '보습제 하루 2회 이상이 기본 — 스테로이드는 증상 있을 때만 단기',
    ],
    warningTitle: '아토피 악화 신호',
    warnings: [
      '밤새 긁어서 상처·진물이 생긴 경우',
      '스테로이드 연고 2주 이상 써도 효과 없는 경우',
    ],
    examItems: ['피부 상태 평가', '알레르기 혈액검사(6개월 이후)', '식품 알레르기 검사'],
  },
  '영유아 건강검진': {
    compareTitle: '영유아 건강검진, 어떤 항목을 보나요?',
    compareItems: [
      '신체 계측: 키·몸무게·머리 둘레 → 성장 곡선 대조',
      '발달 평가: 대근육·소근육·언어·사회성 4개 영역',
    ],
    warningTitle: '발달 지연 체크 포인트',
    warnings: [
      '18개월: 단어 5개 이상 말 못 함',
      '24개월: 두 단어 조합 안 됨',
      '36개월: 또래와 놀이를 하지 않으려 함',
    ],
    examItems: ['신체 계측', '발달 선별 검사(K-DST)', '청각·시각 선별', '구강 검진'],
  },
  '수족구·수두': {
    compareTitle: '수족구 vs 수두, 어떻게 구별하나요?',
    compareItems: [
      '수족구: 손·발·입 안에 수포, 어린이집 집단 유행',
      '수두: 온몸에 수포·딱지 혼재, 더 가려움, 예방접종 미접종 시 발생',
    ],
    warningTitle: '즉시 소아과 방문',
    warnings: [
      '40도 이상 고열이 이틀 이상 지속',
      '아이가 먹지도 마시지도 않을 때',
    ],
    examItems: ['육안 진단(수포 분포·형태)', '필요 시 바이러스 검사'],
  },
  '소아 천식·알레르기': {
    compareTitle: '소아 천식 vs 단순 기침, 어떻게 달라요?',
    compareItems: [
      '단순 기침: 감기 후 1~2주, 열 동반, 쉬면 호전',
      '천식: 운동·새벽·찬 공기에 악화, 쌕쌕거림 반복',
    ],
    warningTitle: '천식 응급 신호',
    warnings: [
      '흡입기 써도 30분 이내 안 좋아짐',
      '말하기 힘들 정도로 숨 차는 경우',
      '입술·손발이 파랗게 변하는 경우',
    ],
    examItems: ['폐기능 검사(만 5세 이상)', '알레르기 혈액검사', '흉부 X-ray', '산소포화도'],
  },
  '소아 ADHD·발달장애': {
    compareTitle: 'ADHD vs 단순 산만함, 어떻게 구별하나요?',
    compareItems: [
      'ADHD: 6개월 이상, 가정+학교 두 곳에서 동일 증상, 일상 기능 저하',
      '단순 산만: 특정 상황에서만, 흥미 있는 것엔 집중 가능',
    ],
    warningTitle: 'ADHD 조기 발견 체크',
    warnings: [
      '착석 상황에서 자리를 이탈하거나 손발을 계속 움직임',
      '차례를 기다리지 못하고 자주 끼어듦',
      '지시를 끝까지 못 따름',
    ],
    examItems: ['행동 평가 척도(K-ARS)', '발달 검사(K-CBCL)', '전문의 면담'],
  },
  '신생아·영아 진료': {
    compareTitle: '황달 수치, 어느 정도면 치료가 필요한가요?',
    compareItems: [
      '생리적 황달: 생후 2~3일 발생, 2주 내 자연 소실',
      '병적 황달: 생후 24시간 이내 발생 or 수치 15 이상 → 광선치료',
    ],
    warningTitle: '신생아 즉시 소아과 신호',
    warnings: [
      '황달이 생후 24시간 이내 또는 3주 이상 지속',
      '귀 교정은 생후 6주 이후 효과 급감',
    ],
    examItems: ['경피적 빌리루빈 측정', '혈청 빌리루빈 검사', '신체 진찰'],
  },
  '성조숙증': {
    compareTitle: '성조숙증, 소아과 vs 한의원 어디로 가야 하나요?',
    compareItems: [
      '소아과: 골연령 X-ray + 호르몬 검사로 정확한 진단, 억제제 처방 가능',
      '한의원: 진단 검사 불가, 생활 관리 보조만 가능',
    ],
    warningTitle: '성조숙증 조기 발견 포인트',
    warnings: [
      '여아 만 8세 이전 가슴 멍울 발생',
      '남아 만 9세 이전 고환 크기 증가',
      '연간 키 성장이 6cm 이상으로 매우 빠름',
    ],
    examItems: ['골연령 X-ray(손목)', '성호르몬 혈액검사', 'LH-RH 자극 검사'],
  },
  '소아 변비': {
    compareTitle: '변비, 유산균만으로 안 되는 이유',
    compareItems: [
      '기능성 변비: 식이·수분 부족 → 유산균·식이섬유 먼저',
      '기질성 변비: 원인 질환 → 처방 변완화제 + 원인 치료',
    ],
    warningTitle: '소아과 방문 필요한 변비 신호',
    warnings: [
      '주 2회 이하, 딱딱한 변으로 출혈 동반',
      '배변 공포증으로 2~3일 이상 참는 경우',
      '항문 주위 균열이 생긴 경우',
    ],
    examItems: ['복부 촉진', '복부 X-ray', '필요 시 갑상선·항문 검사'],
  },
  '소아 빈혈': {
    compareTitle: '소아 빈혈, 어떤 검사로 확인하나요?',
    compareItems: [
      '혈액검사(CBC): 헤모글로빈·적혈구 크기 → 철 결핍 선별',
      '혈청 페리틴: 철 저장량 직접 확인',
    ],
    warningTitle: '소아 빈혈 의심 증상',
    warnings: [
      '얼굴·결막·손발바닥이 창백한 경우',
      '또래보다 유독 쉽게 지치는 경우',
      '집중력 저하·짜증 증가',
    ],
    examItems: ['혈액검사(CBC)', '혈청 페리틴', '철분·TIBC 검사'],
  },
  '영유아 예방접종': {
    compareTitle: 'BCG 피내용 vs 경피용, 뭐가 다른가요?',
    compareItems: [
      '피내용: 소아청소년과·결핵협회, 흉터 1개, 면역 효과 높음',
      '경피용: 일부 병원, 9개 흉터, 보험 미적용',
    ],
    warningTitle: '접종 후 즉시 병원으로',
    warnings: [
      '접종 후 15분 이내 두드러기·호흡 곤란',
      '38.5도 이상 고열이 48시간 이상 지속',
    ],
    examItems: ['접종 전 건강 확인', '접종 후 15~30분 대기', '접종 기록 업데이트'],
  },
  '독감예방접종': {
    compareTitle: '독감 예방접종, 맞아도 독감 걸릴 수 있나요?',
    compareItems: [
      '예방 목적: 중증화·합병증 예방이 핵심 (완벽 차단 아님)',
      '초접종 시 2회(4주 간격): 만 9세 미만 첫 접종',
    ],
    warningTitle: '접종 후 주의할 증상',
    warnings: [
      '38.5도 이상 고열 48시간 이상 지속',
      '접종 부위 붓기 3일 이상',
    ],
    examItems: ['접종 전 건강 확인', '접종 후 15~20분 대기', '초접종 2회 확인'],
  },
};

// ── 진료별 세부 키워드 맵 (문장 내 자연 분산용) ─────────────
const DETAIL_KEYWORDS = {
  '소아 폐렴·기관지염': ['폐렴 증상', '기관지염 기침', '소아과 항생제 기간', '흉부 X-ray', 'RSV 폐렴'],
  '고열·열성경련':      ['열성경련 대처', '해열제 교차 복용', '아이 고열 기준', '소아 응급'],
  '소아 장염':          ['노로바이러스', '소아 탈수 증상', '장염 수액', '아이 구토 설사'],
  '소아 중이염':        ['중이염 항생제', '삼출성 중이염', '귀 통증', '중이염 재발'],
  '소아 아토피':        ['영아 습진', '아토피 스테로이드', '아이 보습제', '알레르기 검사'],
  '영유아 건강검진':    ['18개월 검진', '발달 지연', '성장 곡선', '언어 발달'],
  '수족구·수두':        ['수족구 격리 기간', '어린이집 등원', '수두 예방접종', '수포 증상'],
  '소아 천식·알레르기': ['천식 흡입기', '알레르기 비염', '폐기능 검사', '알레르기 원인'],
  '소아 ADHD·발달장애': ['ADHD 검사', '소아 발달', '아이 집중력', '행동치료'],
  '신생아·영아 진료':   ['신생아 황달', '귀교정 시기', '팔꿈치 탈구', '빌리루빈'],
  '성조숙증':           ['성조숙증 검사', '골연령', '성호르몬 검사', '성조숙증 치료'],
  '소아 변비':          ['아이 변비 치료', '변완화제', '배변 훈련', '소아 변비 식이'],
  '소아 빈혈':          ['소아 철분 결핍', '헤모글로빈', '아이 창백', '철분제'],
  '영유아 예방접종':    ['BCG 피내용', '2개월 예방접종', '접종 후 발열', '예방접종 스케줄'],
  '독감예방접종':       ['독감 예방주사', '접종 후 열', '독감 접종 시기', '인플루엔자'],
};

/**
 * 섹션별 프롬프트 빌더
 * @param {string} section   - 섹션 키
 * @param {object} treatment - pediatrics-data.js의 진료 객체
 * @param {string} region    - 지역명
 */
export function buildPediatricsPrompt(section, treatment, region, options = {}) {
  const { name, pains, recommend, operationNotes, compareWith } = treatment;
  const infoBlock = INFO_BLOCKS[name]     || null;
  const detailKws = DETAIL_KEYWORDS[name] || [];

  switch (section) {
    case 'concern':
      return buildConcernPrompt(name, region, pains, detailKws);
    case 'situation':
      return buildSituationPrompt(name, region, detailKws);
    case 'consult':
      return buildConsultPrompt(name, region, compareWith, infoBlock);
    case 'reason':
      return buildReasonPrompt(name, region, compareWith, infoBlock);
    case 'result':
      return buildResultPrompt(name, region, operationNotes, detailKws);
    case 'closing':
      return buildClosingPrompt(name, region, recommend);
    default:
      throw new Error(`[pediatrics-prompts] 알 수 없는 섹션: ${section}`);
  }
}

// ── 섹션 1: 걱정 ──────────────────────────────────────────
function buildConcernPrompt(name, region, pains, detailKws) {
  const kwHint = detailKws.length
    ? `\n- 세부 키워드 1~2개를 문장 안에 자연스럽게 녹일 것 (나열 금지):\n  ${detailKws.slice(0, 3).join(' / ')}`
    : '';
  return `
당신은 ${region}에 사는 아이를 둔 실제 부모입니다. 블로그 후기 첫 번째 섹션을 작성하세요.

[주제] 아이의 ${name} 증상 발견 시 보호자 걱정과 불안
[조건]
- 아이 증상을 1인칭 구어체로 구체적으로 묘사
- 아래 고민 1~2개를 자연스럽게 녹여낼 것:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}${kwHint}
- 진료명("${name}")을 문장에 직접 연결 금지 → 증상 묘사로 대신할 것
  ❌ "${name}이 시작됐어요" → ✅ "기침이 점점 심해지더니 열도 올랐어요"
- 성인 질환 표현 절대 금지
- 분량: 200~300자 | 말투: 블로그 구어체 (~했어요, ~더라고요)
- '아이', '저희 아이', '우리 아이' 지칭 필수
`.trim();
}

// ── 섹션 2: 탐색 ─────────────────────────────────────────
function buildSituationPrompt(name, region, detailKws) {
  const searchKw = detailKws[0] || `${name} 증상`;
  return `
블로그 후기 두 번째 섹션입니다.

[주제] ${name} 때문에 소아과를 탐색한 과정
[조건]
- 맘카페·지인 추천·네이버 검색 등 실제 탐색 경로 묘사
- 검색어 자연스럽게 포함: "${region} 소아과", "${searchKw}", "${region} 소아청소년과 후기"
- ${region} 지역명 반드시 포함
- 2~3곳 비교 과정 언급
- 병원 선택 기준 구체화:
  단순 "추천 많아서" 금지 → 다른 부모 후기 내용·예약 편의·의사 전문성 등 구체적으로
- 분량: 200~300자 | 말투: 블로그 구어체 (보호자 시점)
`.trim();
}

// ── 섹션 3: 진료 (검사 과정·수치·대화체) ──────────────────
function buildConsultPrompt(name, region, compareWith, infoBlock) {
  const examList = infoBlock?.examItems?.join(' → ') || '청진·시진';
  const warnEx   = infoBlock?.warnings?.[0]          || '증상 악화 시 응급실';
  return `
블로그 후기 세 번째 섹션입니다.

[주제] ${region} 소아청소년과 실제 진료·검사 과정
[조건]
- 검사 순서를 구체적으로 서술: ${examList}
- 검사 결과(수치 or 소견) 최소 1개 구체적으로:
  예) 산소포화도 97% / X-ray에서 폐에 음영 / 고막 빨갛게 충혈됨 / 헤모글로빈 10.2g/dL
- 보호자 질문 1~2개 대화체 포함:
  예) "선생님, 이게 ${compareWith}은 아닌 건가요?" / "항생제 꼭 먹여야 하나요?"
- 의사 말 간접 인용 1회 필수:
  예) "선생님이 '~' 라고 하시더라고요"
- 위험 신호 자연 삽입: "${warnEx}" 류 정보 1개
- 분량: 300~400자 | 말투: 블로그 구어체 (보호자 시점)
`.trim();
}

// ── 섹션 4: 선택 이유 + 정보 블럭 ───────────────────────────
function buildReasonPrompt(name, region, compareWith, infoBlock) {
  const infoTitle = infoBlock?.compareTitle || `${name} vs ${compareWith}`;
  const infoItems = infoBlock?.compareItems || [];
  const infoBlock_prompt = infoItems.length
    ? `\n- 아래 비교 정보를 블로그 글에 자연스럽게 녹여 "정보 블럭" 역할을 할 것:\n  ▸ ${infoTitle}\n  ${infoItems.map((it, i) => `${i + 1}. ${it}`).join('\n  ')}\n  → 독자가 정보 때문에 더 오래 읽게 되는 효과 (체류시간 증가)`
    : '';
  return `
블로그 후기 네 번째 섹션입니다.

[주제] 이 소아과·이 치료를 선택한 이유 + 유용한 비교 정보
[조건]
- ${compareWith} 비교 후 결정 과정 서술
- "추천 많아서" 금지 → 검사 결과·의사 설명을 바탕으로 한 이유 서술${infoBlock_prompt}
- ${region} 소아과 선택 구체적 이유 1개 이상
- 분량: 250~350자 | 말투: 블로그 구어체 (보호자 시점)
`.trim();
}

// ── 섹션 5: 경과 (타임라인 + 수치 + 세부 키워드) ─────────────
function buildResultPrompt(name, region, operationNotes, detailKws) {
  const kwHint = detailKws.length
    ? `\n- 세부 키워드 1~2개를 회복 묘사 문장에 자연스럽게 삽입:\n  ${detailKws.slice(2, 5).join(' / ')}`
    : '';
  return `
블로그 후기 다섯 번째 섹션입니다.

[주제] 치료 후 아이 회복 타임라인
[조건]
- D+1 / D+3 / 1주일 / 2주일 형식으로 단계별 변화 서술
- 참고 정보: ${operationNotes}
- 수치 or 구체적 변화 필수:
  예) 체온 37.2도로 내려옴 / 기침 횟수 반 이상 줄었어요 / 밥 두 숟갈 먹기 시작
- 처방약 복용 반응 서술 (항생제·해열제·흡입기 종류 구체적으로)${kwHint}
- 진료명("${name}") 문장 직접 연결 금지:
  ❌ "${name}이 나았어요" → ✅ "기침이 거의 안 나오고 밥도 잘 먹기 시작했어요"
- 분량: 300~400자 | 말투: 블로그 구어체 (보호자 시점)
`.trim();
}

// ── 섹션 6: 마무리 ───────────────────────────────────────
function buildClosingPrompt(name, region, recommend) {
  return `
블로그 후기 마지막 섹션입니다.

[주제] 비슷한 상황의 부모에게 전하는 말
[조건]
- 치료 전후 변화를 한 문장으로 감성적 요약 (수치 포함 권장)
- 추천 대상 2개 자연스럽게 언급:
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
- "부모가 판단하기 어려운 경우엔 소아과 상담 먼저" 메시지 포함
- ${region} + 소아과 + 관련 표현 자연스럽게 포함 (진료명 직접 반복 금지)
- CTA: "비슷한 상황이라면 혼자 검색만 하지 말고 소아청소년과 한 번 가보시길 권해요" 류
- 분량: 200~250자 | 말투: 블로그 구어체 (보호자 시점)
`.trim();
}
