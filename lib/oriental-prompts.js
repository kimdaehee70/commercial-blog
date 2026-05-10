// ============================================================
// oriental-prompts.js — 한의원 업종 프롬프트 빌더 (완전 독립) v1.3
// ⚠️ clinic / dental / ent / urology 절대 참조 금지
//
// 변경사항 (v1.3) — 신경계 카테고리 별도 가드:
//   ⭐ neuroGuide 신규 변수 — 중풍/안면마비/교통사고 후유증 전용
//      · 효과 단정 표현 강력 차단 ("회복" / "개선" / "마비가 풀렸" 등)
//      · 일반 직장인 만성통증 디테일 차단 (어깨 뻐근/무릎 시큰/회의 자세)
//      · 신경계 재활 디테일 유도 (보행/손 사용/발음/일상 동작 보조)
//      · "재활 일지 / 적응 기록" 톤 강제
//      · 회복 속도 단정 금지 ("발병 시점·개인차 큼" 톤)
//   ⭐ sensitiveGuide에서 "구안와사·중풍" 제거 → neuroGuide로 분리
//   ⭐ 5개 섹션(concern/consult/reason/result/closing) 빌더에 neuroGuide 전달
//
// 변경사항 (v1.2.1) — consult 빌더 강화:
//   ① 원장 인용 안에 "변화를 느끼실 수 있을" / "효과를 보실 수 있을" 권유형 차단
//      → "보통 N회 정도 다닌다고 해요" 사실형 가이드
//   ② 치료 원리·효과 설명 직접 차단:
//      "혈액 순환을 도와" / "특정 부위 자극" / "몸을 따뜻하게" / "기능 회복" 명시 금지
//   ③ ${name} 자체 설명 불필요 — 본인 일정·횟수 정보만 정리하도록
//   ④ ${compareWith} 비교 자체 생략 권장
//
// 변경사항 (v1.2) — "후기 → 생활 기록/일지" 톤 대전환:
//   ⭐ 글 전체를 "후기"가 아닌 "생활 기록 / 관리 일지"로 재정의
//   ① aiSmellGuide v1.2 — 신규 변형 14종 추가 차단:
//      "변화를 느끼실 수 있을" / "도움이 될 수 있어요" / "피부 상태를 개선"
//      / "체감 변화" / "안정되길 기대" / "합리적" / "경제적으로 도움"
//      / "저처럼 ~ 분이라면" / "비슷한 상황이라면 참고" 등
//   ② noQuoteGuide 신규 — 원장 인용을 글 전체에서 1회(consult)만 허용
//      consult 외 5개 섹션은 본인 관찰·기록만으로 서술
//   ③ concern 빌더 — "고민" 대신 "증상이 일상에 미친 영향" 생활 장면 위주
//      "결심" / "마음먹고" 후기형 결의 표현 금지
//   ④ situation 빌더 — "병원 탐색"이 아니라 "비치료적 시도 → 한의원 검토" 흐름
//      검색어 1개로 축소, 추천 의존 표현 차단
//   ⑤ consult 빌더 — 정보 노트 형식 권장. 회차/간격/보험 항목식 정리 가능
//      "기대" / "기대됩니다" 표현 금지
//   ⑥ reason 빌더 — "병원 선택 이유" → "시작 결정 시점 본인 상황"
//      위치/시간/보험/비용 4축 나열 폐기 (= 광고 포맷이 됨)
//      compareWith 비교 우위 표현 금지
//   ⑦ result 빌더 — 회차마다 "생활 장면 1개 필수" 강제
//      동료/타인 칭찬 멘트 금지, "체감 변화" / "권유형 효과" 표현 금지
//   ⑧ closing 빌더 — 추천 대상 직접 언급 완전 폐지
//      현재 상태 + 다음 회차 일정만, 1인칭 본인 종결 강제
//
// 변경사항 (v1.1) — 광고형 유도 패턴 prompt 레벨 차단:
//   ① aiSmellGuide 강화 — "자연스럽게 회복" / "장기적인 회복" 등 16종
//   ② concern 빌더 ${aiSmellGuide} 중복 표기 1회로 정리
//   ③ situation/consult 빌더에 aiSmellGuide 적용
//   ④ reason 빌더 — "감성적 이유" → "현실적 판단 기준" (위치/시간/보험/비용)
//   ⑤ closing 빌더 — 추천형 → 참고형
// ============================================================

export function buildOrientalPrompt(section, treatment, region, options = {}) {
  const { name, pains, recommend, operationNotes, compareWith } = treatment;

  // 보험 적용 치료 여부 (추나·교통사고·침)
  const isInsured = /추나|교통사고|침치료/.test(name);
  const insuranceGuide = isInsured
    ? `\n[보험 안내] 건강보험 또는 자동차보험 적용 여부를 자연스럽게 언급할 것. 비용 부담 해소 포인트로 활용.`
    : "";

  // 민감 치료 여부 (다이어트·산후 등)
  const isSensitive = /다이어트|산후/.test(name);
  const sensitiveGuide = isSensitive
    ? `\n[주의] 과장된 효과 표현 금지. "체질 개선", "단계적 회복" 등 현실적 표현 사용.`
    : "";

  // [v1.3] 신경계 카테고리 전용 가드 — 중풍/안면마비/교통사고 후유증
  //   사유: 의료광고법상 신경계 효과 단정은 일반 한방보다 더 위험
  //   처리: 디테일 자체를 "재활/적응/관리" 톤으로 강제
  const isNeuro = /중풍|뇌졸중|구안와사|안면\s*마비|교통사고/.test(name);
  const neuroGuide = isNeuro
    ? `\n[신경계 카테고리 — 의료광고법 민감 영역 ⚠️ 매우 중요]
- ⚠️ "회복" / "개선" / "효과" / "좋아졌어요" / "또렷해졌어요" / "마비가 풀렸" 등 효과 단정 표현 절대 금지
- ⚠️ 발음 / 마비 / 언어장애 / 후유증 변화에 단정형 묘사 금지
  → 대신: "경과를 관찰하고 있어요" / "변화는 천천히 지켜보고 있어요" / "기록 중이에요"
- ⚠️ 일반 직장인 만성통증 디테일 금지: 어깨 뻐근 / 무릎 시큰 / 회의 자세 / 계단
  → 대신 신경계 재활 디테일: 보행 연습 / 손 사용 / 발음 연습 / 일상 동작 보조
- ⚠️ "직장 복귀" / "업무 집중" 등 회복 단정형 일상 표현 금지
- ⚠️ 회복 속도·시기 단정 금지 ("3개월차에는~ 좋아져요" 등)
  → "회복 속도는 발병 시점·개인차가 크다고 들었어요" 톤
- 톤: 후기보다 "재활 일지 / 적응 기록"에 가깝게 작성
- 개인차 / 보호자 도움 / 양방 병행 / 장기 관리 같은 키워드 자연스럽게
- 효과 묘사보다 "본인이 시도한 것" / "치료 일정 관리" 위주로 서술`
    : "";

  // AI 냄새 + 광고형 표현 제거 — 전 섹션 공통 금지 표현 (v1.2)
  const aiSmellGuide = `\n[AI·광고 표현 금지] 다음 표현 절대 사용 금지:
"드디어 결심하고" / "결국 선택하게 되었어요" / "마음이 편안해졌어요" / "믿음이 갔어요"
"친절하고 전문적" / "따뜻한 차 한 잔" / "차분하고 따뜻한" / "자연 치유의 힘"
"체질적으로도 변화가" / "기혈 순환에 도움" / "특히", "또한", "무엇보다" 연속 사용
"자연스럽게 회복" / "장기적인 회복" / "관절 기능 회복" / "효과를 보시기 시작"
"긍정적인 경험담" / "신뢰가 갔어요" / "좋은 방법" / "도움이 되길 바라요"
"활기찬 생활" / "새로운 삶" / "삶의 질" / "건강을 되찾" / "마음에 들어서"
"진지하게 들어주시는" / "맞춤형 치료" / "꼼꼼한 진료"
"세심한 접근" / "세심한 상담" / "진심 어린"
"변화를 느끼실 수 있을" / "효과를 보실 수 있을" / "도움이 될 수 있어요"
"피부 상태를 개선" / "근본적으로" / "체감 변화" / "확실히 달라"
"부담 없이" / "안정되길 기대" / "기대됩니다" / "기대가 됩니다"
"합리적" / "합리적인" / "경제적으로 도움" / "비용 부담이 적"
"저처럼 알아보셔도" / "저처럼 ~ 분이라면" / "비슷한 상황이라면 참고"
[톤 원칙]
- 이 글은 "후기"가 아니라 "생활 기록 / 관리 일지" 톤이다.
- 병원·원장 평가 금지. 효능·효과 단정 금지. 추천·권유 금지.
- 생활 장면(출근길/잠/식사/회식/계단/회의 등) 중심으로 변화 묘사.
- 본인 일정·기록 위주로 서술. 다른 사람을 향한 메시지(추천·CTA) 금지.`;

  // 키워드 밀도 제어 — 치료명 과다 반복 방지
  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션에서 최대 2회만 직접 표기. 나머지는 "이 치료", "치료", "시술" 등으로 대체. 절대 3회 이상 반복 금지.`;

  // 조사 오류 방지 — 치료명 + 조사 패턴 명시
  const grammarGuide = `\n[조사 오류 금지] "${name}을", "${name}이", "${name}를", "${name}가" 등 치료명+조사 직접 연결 금지. 반드시 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  // [v1.2] 원장 인용 차단 — consult 섹션 외 모든 섹션에서 사용 (전체 글에서 1회만)
  const noQuoteGuide = `\n[원장 인용 금지] 이 섹션에서는 "원장님이 '~' 라고 하시더라고요" 패턴 절대 사용 금지. 원장 인용은 상담 섹션에서만 1회. 다른 섹션은 본인 관찰·기록만으로 서술.`;

  switch (section) {
    case 'concern':   return buildConcernPrompt(name, region, pains, insuranceGuide, sensitiveGuide, kwDensityGuide, grammarGuide, aiSmellGuide, noQuoteGuide, neuroGuide);
    case 'situation': return buildSituationPrompt(name, region, insuranceGuide, kwDensityGuide, grammarGuide, aiSmellGuide, noQuoteGuide);
    case 'consult':   return buildConsultPrompt(name, region, compareWith, insuranceGuide, kwDensityGuide, grammarGuide, aiSmellGuide, neuroGuide);
    case 'reason':    return buildReasonPrompt(name, region, compareWith, insuranceGuide, kwDensityGuide, grammarGuide, aiSmellGuide, noQuoteGuide, neuroGuide);
    case 'result':    return buildResultPrompt(name, region, operationNotes, sensitiveGuide, kwDensityGuide, grammarGuide, aiSmellGuide, noQuoteGuide, neuroGuide);
    case 'closing':   return buildClosingPrompt(name, region, recommend, sensitiveGuide, kwDensityGuide, grammarGuide, aiSmellGuide, noQuoteGuide, neuroGuide);
    default: throw new Error(`[oriental-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function buildConcernPrompt(name, region, pains, insuranceGuide = "", sensitiveGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", noQuoteGuide = "", neuroGuide = "") {
  return `
당신은 ${region} 거주 실제 한의원 환자입니다. 생활 기록 형식의 첫 번째 섹션을 작성하세요.
${insuranceGuide}${sensitiveGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${noQuoteGuide}${neuroGuide}
[주제] 증상이 일상에 미친 영향 — 생활 장면 위주
[조건]
- ⚠️ "후기" 톤이 아니라 "생활 기록 / 일지" 톤으로 작성
- 일상 장면 2~3개로 증상이 어떻게 영향 줬는지 구체 묘사
  예: 출근길 / 회의 / 점심시간 / 퇴근 후 / 잠자리 / 주말 일과
- 아래 고민 중 1~2개를 자연스럽게 녹여낼 것:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 한방·한의원 관련 묘사만 사용 (성형/치과/이비인후과/비뇨기과 표현 금지)
- 방치한 이유는 단순히 1줄로만 (직장 바빠서 / 그냥 둬도 되겠지 정도)
- ⚠️ "결심" / "기대" / "마음먹고" / "다짐" 등 후기형 결의 표현 금지
- ⚠️ 마지막에 한의원 검토 멘트 금지 (다음 섹션이 그 부분)
- 치료명 뒤에 마침표(.) 삽입 절대 금지
- 분량: 200~300자
- 말투: ~했어요, ~더라고요, ~하더니 (담담한 일상 기록 톤)
`.trim();
}

function buildSituationPrompt(name, region, insuranceGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", noQuoteGuide = "") {
  return `
생활 기록의 두 번째 섹션입니다.
${insuranceGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${noQuoteGuide}
[주제] 비치료적 시도 → 한의원 검토로 넘어간 과정
[조건]
- 한의원 가기 전 본인이 시도한 자기 관리 1~2가지 짧게 언급 (스트레칭 / 식단 / 영양제 / 휴식 등)
- 그게 한계가 있어서 한의원도 알아보기 시작했다는 흐름
- 검색어 예시 1개 정도만 자연스럽게 (예: "${region} ${name.replace(/치료|처방/g,'')} 잘하는 곳")
- 검색어 안에 치료명 전체를 그대로 쓰지 말 것
- 2~3곳을 비교했다는 정도까지만, 어디를 어떻게 비교했는지는 짧게
- ⚠️ 병원 분위기·인테리어 묘사 금지 ("아늑한", "깔끔한", "편안한 분위기", "신뢰가 가는")
- ⚠️ 한의원 평가형 표현 금지 ("좋은 곳", "잘하는 곳이라는 평이 많아서")
- ⚠️ "지인 추천" / "후기가 많아서" 같은 추천 의존 표현 비중 낮출 것
- 분량: 180~260자
- 말투: 담담한 일상 기록 톤
`.trim();
}

function buildConsultPrompt(name, region, compareWith, insuranceGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", neuroGuide = "") {
  return `
생활 기록의 세 번째 섹션입니다. — 진료 시 받은 정보 정리
${insuranceGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${neuroGuide}
[주제] 진료에서 들은 내용 정리 (정보 노트 톤)
[조건]
- 본인 질문 1개를 짧게 (비용 또는 횟수)
- ⚠️ 원장 인용은 이 글 전체에서 이 섹션에서 1회만. 짧게.
  형식: 원장님이 '~' 라고 하시더라고요 (1회만, 5~7회면 변화 / 보통 N회 정도 같은 회차 안내 위주)
- ⚠️ 원장 인용 안에 "변화를 느끼실 수 있을" / "효과를 보실 수 있을" 권유형 표현 금지
  대신: "보통 5~7회 정도 다닌다고 해요" / "주 1~2회로 잡으면 된다고 하시더라고요" 사실형
- ⚠️ 상담 분위기·원장 평가 묘사 절대 금지: "친절", "전문적", "믿음", "신뢰", "진지하게 들어주시는", "세심한 상담", "납득"
- ⚠️ 치료 원리·효과 설명 금지: "혈액 순환을 도와", "특정 부위 자극", "몸을 따뜻하게", "근본 치료", "기능 회복"
  → ${name}이 무엇인지 설명할 필요 없음. 본인이 받게 될 일정·횟수 정보만 정리.
- 정보 노트 형식 권장 (회차/간격/보험만 짧게)
  예) 회차: 보통 5~7회 / 간격: 주 1~2회 / 보험: 적용 가능 (본인부담 ○○) 같은 정보 노트 형식 권장
- ⚠️ 효과 단정 금지: "확실히 효과", "장기적인 회복", "근본 치료" 등 의료광고형 표현 금지
- ⚠️ "기대" / "기대됩니다" / "기대감" 표현 금지
- ⚠️ ${compareWith} 비교 우위 표현 금지 — 비교 자체 생략 권장
- 분량: 200~280자
- 말투: 정보 노트 + 짧은 코멘트
`.trim();
}

function buildReasonPrompt(name, region, compareWith, insuranceGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", noQuoteGuide = "", neuroGuide = "") {
  return `
생활 기록의 네 번째 섹션입니다. — 시작 결정 시점
${insuranceGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${noQuoteGuide}${neuroGuide}
[주제] 시작하기로 정한 시점의 본인 상황 — 병원 비교가 아니라 본인의 결정 시점 묘사
[조건]
- ⚠️ "선택한 이유" / "왜 이 한의원" 식의 병원 비교 글이 절대 아님
- ⚠️ 병원 평가 표현 절대 금지: "맞춤 상담", "꼼꼼한 진료", "세심한", "진지하게 들어주시는", "한 명 한 명에게"
- ⚠️ 인테리어/분위기 평가 금지
- ⚠️ "긍정적인 경험담" / "다른 환자들의 후기" 같은 추천성 표현 금지
- ⚠️ "합리적" / "경제적으로 도움" / "부담 없이" 같은 광고형 형용사 금지
- ⚠️ ${compareWith} 비교 우위 표현 금지 ("스테로이드보다 부담 적다" 등 비교 우위형 절대 금지)
- 대신 아래 톤으로 1문단 작성:
  · 그 시점에 본인 상황이 어땠는지 (증상이 어떤 단계였는지 / 일상에 어떻게 영향 줬는지)
  · 그래서 일단 시작해보기로 했다는 흐름
  · 한의원 위치·시간이 본인 일정과 맞아서 "그래서 다닐 수는 있겠다 싶었어요" 정도만 짧게
- "결정했어요" / "선택했어요"보다 "시작해보기로 했어요" 톤
- 마지막 문장은 본인 상태 묘사로 종결 (병원 평가 금지)
- 분량: 180~260자
- 말투: 담담한 일상 기록 톤
`.trim();
}

function buildResultPrompt(name, region, operationNotes, sensitiveGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", noQuoteGuide = "", neuroGuide = "") {
  return `
생활 기록의 다섯 번째 섹션입니다. — 회차별 생활 변화 일지
${sensitiveGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${noQuoteGuide}${neuroGuide}
[주제] 치료 시작 후 생활 장면 변화 일지
[조건]
- 1회 직후 / 1주일차 / 1개월차 / 3개월차 형식으로 단계별 작성
- 각 단계마다 ⚠️ 생활 장면 1개 이상 필수 (출근길 / 회의 / 점심 / 퇴근 / 잠자리 / 주말 / 계단 / 운전 / 식사 / 회식 / 집안일)
  예) "1주일차: 아침에 일어날 때 어깨가 전보다 덜 뻐근해서 침대에서 바로 일어나졌어요"
- 구안와사·안면마비 계열: 72시간·초기·회복 기간 키워드 타임라인 안에 포함
- 교통사고 계열: 보험처리·후유증·입원/통원 키워드 포함
- 다이어트 계열: 체중 변화 수치(kg) 또는 식사 변화 구체적 서술
- 근골격(추나·도수·체외충격파) 계열: "효과 언제부터", "멍·붓기 기간" 키워드 자연스럽게 포함
- 각 타임라인 항목에서 치료명 직접 반복 금지 — "치료", "이 치료", "교정" 등으로 대체
- 참고 정보: ${operationNotes}
- ⚠️ 효과 단정·과장 금지: "확실히 좋아", "관절 기능 회복", "장기적인 회복", "70%는 좋아진", "거의 다 나았", "완치"
- ⚠️ "더 활기찬 생활" / "건강을 되찾" / "삶의 질" / "체감 변화" / "안정되길 기대" 절대 금지
- ⚠️ "변화를 느끼실 수 있을" / "효과를 보실 수 있을" 권유형 표현 금지 (본인 기록만)
- ⚠️ 회차 안에 동료/타인의 칭찬 멘트 금지 ("동료들이 ~ 말해주더라고요" 같은 패턴)
- ⚠️ "체질적으로 변화", "자연 치유의 힘", "기혈 순환" 막연한 한방 표현 금지
- 수치 필수: 치료 회차(3회, 5회차 등), 경과 일수(2주 후, 한 달 되니까)
- 비용 1회 자연 삽입 필수: '한 달에 약 OO만원', '회당 OO만원 정도' 형태로 타임라인 중간에 포함
- 마지막 문장은 본인 현재 생활 상태 묘사로 종결 (치료 효과 강조 금지)
- 분량: 320~420자
- 말투: 담담한 일상 기록 톤
`.trim();
}

function buildClosingPrompt(name, region, recommend, sensitiveGuide = "", kwDensityGuide = "", grammarGuide = "", aiSmellGuide = "", noQuoteGuide = "", neuroGuide = "") {
  return `
생활 기록의 마지막 섹션입니다. — 현재 상태 + 앞으로의 계획
${sensitiveGuide}${kwDensityGuide}${grammarGuide}${aiSmellGuide}${noQuoteGuide}${neuroGuide}
[주제] 본인 현재 상태 정리 + 다음 일정
[조건]
- ⚠️ 추천·권유 표현 절대 금지: "추천드려요", "도움이 될 거예요", "도움이 될 수 있어요", "도움이 되길 바라요", "한 번 받아보세요", "참고가 될 수 있어요", "저처럼 ~ 분이라면"
- ⚠️ "좋은 방법" / "괜찮은 선택" / "비슷한 상황이라면" / "고려해 보시는 것도" 권유형 표현 금지
- ⚠️ "활기찬 생활" / "건강을 되찾" / "새로운 삶" / "미소를 되찾았어요" 드라마틱 마무리 금지
- ⚠️ "기대" / "안정되길 기대" / "회복되길 바라요" 표현 금지
- ⚠️ 추천 대상을 직접 나열·언급하지 말 것 (이전 버전의 "이런 분들께 추천" 형식 절대 금지)
- 작성할 내용 (3~4문장 정도):
  1. 현재 본인 증상 상태 한 줄 (구체적인 생활 장면 1개 묘사)
  2. 다음 회차 일정 또는 앞으로의 관리 계획 짧게
  3. ${region} + ${name} 키워드 자연스럽게 1회 포함 (예: "${region}에서 ${name} 받으면서 기록하고 있어요" 정도)
  4. 마지막 한 문장은 본인 현재 상태나 다음 회차에 대한 기대 정도로 마무리 (다른 사람에게 메시지 금지)
- 마지막 문장은 반드시 1인칭 본인 상태로 종결할 것
- 분량: 150~200자
- 말투: 담담한 일상 기록 톤
`.trim();
}
