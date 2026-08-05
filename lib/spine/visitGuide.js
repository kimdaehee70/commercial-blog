// =============================================
// lib/spine/visitGuide.js
// [Visit Pilot] 방문정보 활용 가이드 — 전 외식업 공통 Spine 모듈
//
// 성격: 업종별 narrative 아님. 방문정보(시간/예약/웨이팅/좌석/가격) 출력 기능.
//       → Naver 지침 §6(기능 공유 가능·철학 업종별 독립) 정합. locationBlock과 동일 계층 성격.
// 계층: 프롬프트 계층(GPT 지시문 생성). locationBlock(응답 후단 문자열 삽입)과는 다른 계층.
//       visitGuide = buildXxxPrompt 조립 시 common에 조건부 합성. 후처리 아님.
//
// 이력:
//   - 세션40: buildVisitGuide를 lib/restaurant-prompts.js에 최초 구현(A~D 원칙 인코딩).
//   - 세션41: 실사용 엔진(korean/western/chinese/japanese/snack/chicken/meat)은
//             generateRestaurant를 타지 않음(restaurant=레거시 검증 엔진)을 실측 확인 →
//             각 엔진 재구현 대신 공통 Spine 승격. 로직 100% 무변경 이동.
//             연결은 Pilot Gate로 단계적(korean 관측 → PASS → 순차 확장). 본 모듈은 미연결 검증만.
//
// 게이트: window.__XXX_VISIT_PILOT (프론트) → req.body.visitPilot → options.visitPilot
// 근거: 인수인계 세션39 — 방문정보 PHILOSOPHY 확정 (A~D 원칙)
// 원칙:
//   A. 목적 종속 : 방문 목적·scene이 정보 선택을 결정. 불필요하면 생략.
//   B. 나열 금지 : 영업시간·주차·예약 매번 전량 출력 ❌ (광고 SEO 회피, QC 대상)
//   C. scene 삽입: 행동 문맥 속에 녹여 사용. (예: 브레이크타임 → "2시 전에")
//   D. locationBlock 예외: 찾아오시는 길(주소/주차/교통)은 SOP PATCH-07 후단 처리.
//      본 가이드는 '나머지 방문정보'(시간/예약/웨이팅/좌석/가격 등)에만 적용.
// 가격: 별도 규칙 아님. A~D에 종속되는 하나의 방문정보 필드로 취급.
//       AI 가격 '생성·추정'은 여전히 금지. 사용자 입력 실제값만 조건부 활용.
// 원칙: OFF(빈 visitInfo)이면 '' 반환 → 부작용 0 (기존 FREEZE 경로 무변경).
// =============================================

export function buildVisitGuide(visitInfo, situation, purpose) {
  if (!visitInfo || typeof visitInfo !== 'object') return '';

  // 실제 입력된 필드만 수집 (빈값·placeholder 제외). 시간/운영 필드.
  const F = {
    businessHours: '영업시간',
    breakTime:     '브레이크타임',
    lastOrder:     '라스트오더',
    closedDays:    '휴무일',
    reservation:   '예약',
    waiting:       '웨이팅/대기',
    seats:         '좌석(단체석·룸 등)',
    pet:           '반려동물 동반',
    price:         '대표 가격(사용자 입력 실제값)',
  };
  const filled = [];
  for (const key of Object.keys(F)) {
    const v = visitInfo[key];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s || s === '-' || s === '없음' || s === '미정') continue;
    filled.push({ label: F[key], value: s, isPrice: key === 'price' });
  }
  if (!filled.length) return '';

  const lines = filled.map(f => `  · ${f.label}: ${f.value}`).join('\n');
  const priceOn = filled.some(f => f.isPrice);

  return `
[방문정보 활용 — ★ 세션39 PHILOSOPHY (A~D 원칙 절대 준수)]
아래는 사용자가 입력한 실제 매장 방문정보다. '모두 보여주는 정보'가 아니라,
검색자가 방문을 결정하는 순간에 필요한 것만 자연스럽게 활용한다.
${lines}

[활용 규칙]
- A. 목적 종속: 이번 글의 상황(${situation || '일반'})·목적(${purpose || '일반'})과 관련된 항목만 고른다.
     관련돼도 scene 흐름상 불필요하면 과감히 생략한다. 입력됐다고 다 쓰지 않는다.
- B. 나열 금지: 영업시간·브레이크타임·예약·좌석 등을 목록·표·"운영 정보 안내" 블록으로 나열 ❌.
     한 글에서 방문정보는 1~2개 항목만, 문장 속에 스며들게. (전량 출력 = 광고 SEO 회귀 = QC 위반)
- C. scene 삽입: 정보를 '고지'하지 말고 행동 문맥에 녹인다.
     예) 브레이크타임 15시 → "점심을 늦게 먹으면 브레이크타임에 걸리니 2시 전에 들르는 편이 낫다"
         예약 필수 → "자리가 금방 차는 편이라 미리 연락하고 가면 기다림이 줄어든다"
     ❌ "영업시간은 11시~21시이며 브레이크타임은 15시~17시입니다" (기계적 고지 = 금지)
- D. 위치·주차·교통은 여기서 다루지 않는다 (별도 후단 블록에서 처리). 언급 금지.
${priceOn ? `- 가격: 사용자 입력 실제값만 사용. 이 상황·목적에 가격이 판단 근거가 될 때에만(예: 점심 한 끼·가성비 확인) 자연스럽게 1회. 기념일·데이트 맥락이면 생략. 가격표·메뉴판식 나열 ❌. AI 추정·생성 가격 ❌.` : `- 가격 항목 없음 → 가격 숫자 생성·추정 절대 금지 (기존 규칙 유지).`}
- 이 가이드로 인해 글이 '정보 안내문'이 되면 실패. 주인공은 여전히 방문 목적·행동 흐름이다.`;
}
