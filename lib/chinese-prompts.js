// =============================================
// lib/chinese-prompts.js
// 중식(중화요리) 프롬프트 빌더 v1.0 — Chinese Engine 독립
//
// 기반: restaurant-prompts.js 구조 동형 (Restaurant 계열 엔진)
//   · 함수명 chinese화, import = ./chinese-data.js
//   · commercial(메뉴 정보형) 기본. personal 빌더는 보존(restaurant 동형)
//   · 한식 전용 예시(들깨·새우젓·머릿고기·해장)는 중식 톤으로 중립화
//   · 효능·관용 표현 금지 (PHILOSOPHY 정합)
//
// 핵심 차이점 (cafe → restaurant 계열)
//   1. DIRECTION = data.js의 buildDirection() 동적 생성 (정적 맵 X)
//   2. 섹션 키 6개: visit·arrive·order·taste·scene·revisit
//   3. taste(맛 핵심) + scene(장면 핵심) 2섹션 분리
//   4. 광고/홍보 표현 차단 강화 (Phase 9.5 핵심 — "지역 검색 결과 장악")
//   5. 지역 반복 제한 ("구리" 과밀 차단)
//   6. 사진 유도 문장 자연화 (상차림·국물 클로즈업·창가 등)
//   7. scene 강화: 동행 반응·옆자리·창밖 등 "장면" 묘사
// =============================================

import { buildDirection } from './chinese-data.js';

// ============================================================
// 0. DIRECTION 헬퍼 — 데이터 조합으로 동적 생성
// ============================================================
export function getChineseDirection(treatment, situation, purpose) {
  if (!treatment) {
    return buildDirection({ menu: '', situation, purpose });
  }
  const menu = treatment.menu || treatment.menuRef || '';
  return buildDirection({ menu, situation, purpose });
}

// ============================================================
// 0-1. AI 냄새 + 광고 표현 차단 (Phase 9.5 핵심)
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지 — 절대 사용 금지]
"드디어 발견한" / "결국 찾은 곳" / "마침내" / "비로소"
"따뜻한 분위기" / "차분하고 따뜻한" / "안정감 있는 분위기"
"힐링되는" / "마음이 편안해지는" / "위로받는 느낌"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지

[맛집 광고/홍보 패턴 금지 — 절대 사용 금지 ★★ Phase 9.5 핵심]
"유명한 맛집" / "이름난 곳" / "유명세" / "맛집 인증"
"찐맛집" / "진짜 맛집" / "인생 맛집" / "내 인생 메뉴"
"꼭 가봐야" / "꼭 가보세요" / "후회 안 함" / "안 가면 손해"
"강추" / "강력 추천" / "추천드려요" / "무조건 추천"
"인정" / "맛 인정" / "원조" / "정통" / "최고의"
"미친 맛" / "미친 비주얼" / "역대급" / "레전드"
"숨은 맛집" / "보물 같은 곳" / "숨겨진 명소" / "현지인만 아는"
"분위기 맛집" / "사진 맛집" / "감성 맛집" / "감성 가득"

[설명형 문장 금지 — 절대 사용 금지 ★ GPT 냄새 제거]
"~라는 점이 마음에 들었어요" / "~라는 점이 좋았어요"
"~라는 생각이 들었어요" / "~생각이 들었답니다"
"마음에 들었어요" / "마음에 들었답니다"
→ 대체: 행동·결정으로 보여주기 ("국물 한 술 더 떴어요", "공깃밥 추가했어요")

[독자 조언형 문장 금지 — 절대 사용 금지]
"~분들께는 ~이 중요하다" / "~고민하시는 분들께"
"~하시는 분들이라면 추천" / "데이트 코스로 고민이신 분들"
→ 후기는 본인 경험만, 독자에게 조언·권유 금지

[브랜드/매장 특정 표현 자제 ★ Phase 9.5 인계메모 PART 6-1]
"이 매장은" / "이 식당은 유명" / "사장님이 알려져서"
→ 매장 자체 홍보 톤 금지. 지역·동선·골목·일대 같은 공간 맥락으로 자연 치환
→ 치환 어휘는 글 안에서 다양하게 분산. 같은 어휘 반복 금지

→ 대체 방향: 구체적 시간·웨이팅 분 단위·가격·반찬 가짓수·1인석/4인석·동행 반응`;
}

// ============================================================
// 0-2. 키워드 밀도 + 지역 반복 제한 (★ "구리" 과밀 차단)
// ============================================================
function getKwDensityGuide(genericName, region, menu) {
  return `
[키워드 밀도] "${genericName}" 표기는 섹션당 최대 2~3회.
나머지는 "이 가게", "여기", "이 집"으로 대체. 5회 이상 반복 금지.

[지역명+메뉴 결합 ★★ Phase 9.5 이슈 #2 — 처음부터 자연 치환 권장]
"${region}" 단독 표기는 섹션당 최대 1~2회.
"${region} ${menu}" 결합 표현은 글 전체 1~2회로 자연스럽게 등장하면 충분.
  · 도입부에 검색 의도 충족용 1회면 충분. 이후는 자연스러운 공간 지칭으로 치환.
  · 치환은 한 어휘에 고정하지 말고 글 안에서 다양하게 분산. 같은 어휘 3회 이상 금지.
  · 결합 3회 이상은 자동 차단됨 — 1~2회 안에서 끝내는 것이 자연스러움

[메뉴명 반복 제한 ★ Phase 9.5 v4]
"${menu}" 직접 표기 섹션당 최대 3회.
나머지는 "이 한 그릇", "이거", "그것"으로 대체.
★ "이 메뉴", "${menu} 메뉴", "${menu}+조사+메뉴" 형태 절대 금지
   ❌ "${menu}이 메뉴를", "${menu} 메뉴가", "${menu}이 메뉴의"
   → 메뉴명 뒤에 "메뉴"라는 단어를 절대 붙이지 않을 것
   → "메뉴"는 "메뉴판"에서만 사용 (메뉴판 보면서, 메뉴판 한 장 찍음)

[조사 오류 금지 ★★ Phase 9.5 이슈 #1]
"${genericName}" 뒤 조사 직접 연결 시:
  ❌ "${genericName}을" → ✅ "이 가게를"
  ❌ "${genericName}는" → ✅ "여기는"

메뉴명("${menu}") + 조사 사용 시 문장이 끊기지 않게 자연스럽게:
  ✅ "${menu}을/를 먹으러", "${menu} 한 그릇", "${menu}이 유명한"
  ❌ 메뉴명 뒤에 장소명사(동네/일대/집/골목/상권 등) 직결 금지 — 문장 끊김
  → 장소를 지칭할 때는 메뉴명을 빼고 공간 지시어로 자연스럽게
이중 공백 금지`;
}

// ============================================================
// 0-3. 망설임·기대 흔들림 강제 (실제 후기 느낌 핵심)
// ============================================================
function getEmotionWaverGuide() {
  return `
[감정 흔들림 필수 ★ 모범답안 차단]
실제 후기는 망설임·기대·약간의 의심이 섞여 있어야 함.
아래 중 1개 이상 자연스럽게 포함:
- "기대보다 별로면 어쩌나 싶었어요"
- "줄 길다는 말 듣고 망설였어요"
- "솔직히 사진보다 별로일까 걱정됐어요"
- "괜히 멀리까지 왔나 싶었는데"
- "처음엔 그냥 지나칠 뻔했어요"
- "가격대 보고 한 번 고민했어요"
- "동네 식당이라 큰 기대는 안 했어요"
→ "완벽했어요" / "최고였어요" 단정 패턴은 광고 냄새`;
}

// ============================================================
// 0-4. 현실 행동 디테일 강제 (상단 유지력 핵심)
// ============================================================
function getActionDetailGuide(sectionKey) {
  if (sectionKey === 'arrive') {
    return `
[현실 행동 디테일 필수 ★ 사람 글 느낌]
도착·입장 단계의 실제 행동 중 2개 이상 포함:
- 지도 보면서 골목 헤맴 / 간판 못 찾음
- 입구에서 영업시간·브레이크타임 확인
- 웨이팅 명단에 이름 적음 / 대기 번호 받음
- 바깥에서 메뉴 가격 미리 확인
- 카운터 앞에서 자리 어디 앉을지 둘러봄
- 사장님이 안내해주심 / 셀프 안내
- 신발 벗는 곳인지 좌식인지 확인`;
  }
  if (sectionKey === 'order') {
    return `
[주문 행동 디테일 필수 ★ 사람 글 느낌]
주문 단계의 실제 행동 중 2개 이상 포함:
- 메뉴판 보면서 한참 고민
- 사장님께 뭐가 잘 나가는지 물어봄
- 동행이랑 다른 거 하나씩 시켜 나눔
- 공깃밥 추가할지 고민
- 가격대 비교하면서 골랐음
- 반찬 미리 깔리는 거 보면서 기다림
- 키오스크인지 직원 주문인지 확인`;
  }
  if (sectionKey === 'taste') {
    return `
[맛 묘사 행동 디테일 필수 ★★ 사람 글 느낌 핵심]
맛 표현은 "정보"가 아니라 "한 입의 체감". 아래 행동 중 3개 이상:
- 국물부터 한 술 떠봄 / 면을 들어 올려봄
- 첫 입에서 얼굴 표정 / 뜨거워서 후후 불기
- 동행이랑 동시에 한 입 떠보고 눈빛 교환
- 새우젓·양념장·식초 첨가해서 다시 한 술
- 반찬이랑 같이 먹어봄 / 공깃밥에 국물 비벼봄
- 두 번째 술에서 본격적인 맛 평가
- 그릇 비워가면서 마지막 한 술 아껴 먹음
→ "맛있었어요" 평면 ❌ / 한 술 한 술의 행동·체감 ✅`;
  }
  if (sectionKey === 'scene') {
    return `
[장면 묘사 행동 디테일 필수 ★★ 맛집 scene 핵심]
"같이 간 상황"이 체류시간을 만든다. 아래 중 3개 이상:
- 동행(가족·친구·혼자)의 반응·표정·말 한마디
- 옆 테이블 손님 구성 (직장인 4명 / 노부부 / 가족 등)
- 옆자리 소음·대화·식기 소리 체감
- 창밖 풍경 / 비 오는 날이면 빗소리·김 서린 유리
- 시간대 변화 (점심 피크 → 손님 빠짐 등)
- 사장님이 반찬 더 갖다 주심 / 물 채워주심
- 테이블 간격·자리 좁기·아이 의자 유무
→ 분위기 추상화 ❌ / 그 자리의 구체적 장면 ✅`;
  }
  return '';
}

// ============================================================
// 0-5. 사진 유도 문장 자연화
// ============================================================
// ★ v1.2 마무리 다양화 — revisit 마무리 패턴 20개 풀에서 매 생성 랜덤 샘플
const REVISIT_CLOSING_POOL = [
  '비워진 그릇 사진을 마지막에 한 장 남겼어요',
  '나오는 길에 가게 입구를 한 번 더 돌아봤어요',
  '다 먹고 일어서면서 테이블을 한 컷 담았어요',
  '계산하면서 다음엔 뭘 먹을까 잠깐 생각했어요',
  '문 밖으로 나오니 골목 공기가 선선했어요',
  '남은 국물 자국까지 보이는 그릇을 마지막에 찍었어요',
  '자리에서 일어나며 가볍게 기지개를 켰어요',
  '포장 손님이 또 들어오는 걸 보며 나왔어요',
  '영수증 받으면서 영업시간을 슬쩍 확인했어요',
  '나가는 길에 메뉴판을 다시 한 번 훑어봤어요',
  '문을 나서며 다음에 같이 올 사람을 떠올렸어요',
  '빈 그릇을 정리해 두고 자리에서 일어났어요',
  '계산대 앞에서 잘 먹었다고 인사하고 나왔어요',
  '가게를 나와 잠깐 동네 골목을 둘러봤어요',
  '돌아오는 길에 아까 먹은 맛이 다시 생각났어요',
  '자리 정리하면서 다음 메뉴를 마음속으로 골랐어요',
  '나오면서 다음엔 포장도 해볼까 싶었어요',
  '문 닫고 나오니 어느새 출출함이 가셨더라고요',
  '식사 마치고 천천히 걸어 나왔어요',
  '가게 앞에서 잠깐 서서 다음 방문을 생각했어요',
];

// 풀에서 n개 무작위 추출 (중복 없이)
function pickRevisitClosings(n = 3) {
  const pool = [...REVISIT_CLOSING_POOL];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function getPhotoHintGuide(sectionKey) {
  const hints = {
    arrive: `
[사진 유도 — 외관·입구 자연스럽게]
다음 표현 중 1~2개 자연스럽게:
- "간판이 눈에 들어와서 한 장 찍었어요"
- "문 앞에서 잠깐 외관 보고 들어갔어요"
- "골목 분위기랑 같이 한 컷"`,
    order: `
[사진 유도 — 메뉴판·상차림]
다음 표현 중 1~2개 자연스럽게:
- "메뉴판부터 한 장 찍었어요"
- "반찬 깔리는 거 보면서 한 컷"
- "상이 다 차려졌을 때 위에서 한 장"`,
    taste: `
[사진 유도 — 음식 클로즈업]
다음 표현 중 1~2개 자연스럽게:
- "김 올라오는 순간 클로즈업으로 한 장"
- "가까이서 한 컷"
- "양념·국물 색이 잘 보이는 각도로 찍었어요"
- "한 입 베어 문 단면 보이게 사진부터"`,
    scene: `
[사진 유도 — 테이블·자리 분위기]
다음 표현 중 1~2개 자연스럽게:
- "창가 자리 쪽 분위기를 한 컷"
- "테이블 위에 놓인 그릇들을 같이 담았어요"
- "동행 손이 살짝 보이는 구도로"`,
    // ★ v1.2: 매 생성마다 풀에서 랜덤 3개 제시 → "간판 한 번 더" 단조 해소
    revisit: `
[사진 유도 — 마무리 컷 ★ 매번 다르게]
다음 마무리 표현 중 가장 자연스러운 1개를 골라 마지막 문장에 녹이세요. 같은 문장 반복 금지:
- "${pickRevisitClosings(3).join('"\n- "')}"
★ "계산하고 나오면서 간판 한 번 더" 표현은 사용 금지 (과다 반복됨).`,
  };
  return hints[sectionKey] || '';
}

// ============================================================
// 0-6. 운영 디테일 강제 주입 (cafe의 VISIT_VALUES → MEAL_VALUES)
// ============================================================
function getMealValueGuide() {
  return `
[운영 디테일 — 자연스러운 등장 ★ Phase 9.5 A안 — 강제 박스 제거]
운영 정보는 정보 박스가 아니라 행동·장면 안에서 자연스럽게 드러나야 합니다.
예시 방향:
  · 시간·웨이팅: "10시 반쯤 갔는데 웨이팅 없이 바로" / "평일인데도 20분 정도 기다렸어요"
  · 부담감(가격 X): "부담 없이 한 그릇" / "가볍게 한 끼" (숫자 가격 절대 금지)
  · 좌석·반찬: "옆 4인 테이블이 비어서" / "반찬 한 번 더 가져다 주셔서"
나열·박스·요약 형식 금지. 한 문장 안에 자연스럽게 1~2개씩 녹여낼 것.
★ 숫자 가격(○천원·○만원) 절대 출력 금지 — 부담 없는 결만 표현.

→ 정보 SEO ❌ / 행동·장면 SEO ⭕`;
}

// ============================================================
// 0-7. 문단 길이 가이드
// ============================================================
function getParagraphLengthGuide() {
  return `
[문단 길이 ★ 네이버 맛집판 상단 구조]
- 한 문단은 2~4줄로 유지 (5줄 이상 ❌)
- 긴 문장을 두 문장으로 끊기
- 문단 사이 줄바꿈 자연스럽게
- 정보 나열은 짧게 끊어서 (한 줄에 하나씩)`;
}

// ============================================================
// 0-8. 시간 흐름 가이드 (sceneTimeline 자연화)
// ============================================================
function getFlowTimelineGuide(sectionKey) {
  if (sectionKey === 'arrive') {
    return `
[동선 흐름 — 도착·입장 시간 순서 ★ 상단 유지 핵심]
지하철·차 → 골목 진입 → 외관 확인 → 입장 → 자리 확인 흐름:
  ① 지하철역 출구·도보 시간 또는 주차 상황
  ② 골목·외관 첫인상·간판
  ③ 문 열고 들어선 순간
  ④ 카운터·자리 둘러봄
다음 표현 중 2~3개 자연스럽게:
- "역에서 도보 N분 정도 걸렸어요"
- "골목 안쪽에 있어서 처음엔 헤맸어요"
- "문 열고 들어가니 ~"
- "안으로 들어가서 자리부터 둘러봤어요"
→ 정보 나열 ❌ / 시간 흐름 ✅`;
  }

  if (sectionKey === 'order') {
    return `
[동선 흐름 — 주문 시간 순서 ★ 상단 유지 핵심]
메뉴판 → 고민 → 추천 확인 → 주문 → 반찬·상차림 흐름:
  ① 메뉴판 둘러보기
  ② 뭐가 잘 나가는지 확인
  ③ 동행이랑 의논
  ④ 주문 결정
  ⑤ 반찬·상차림 깔리는 시간
다음 흐름 표현 중 2~3개 자연스럽게:
- "메뉴판 보다가 한참 고민했어요"
- "사장님께 뭐가 잘 나가는지 물어봤어요"
- "동행이랑 다른 거 시켜서 나눠 먹기로"
- "주문하고 얼마 안 돼서 반찬부터 깔렸어요"
- "사장님이 '~' 라고 하시더라고요" (직접 인용 1회 권장)
→ 음식 나열 ❌ / 주문 흐름 ✅`;
  }

  if (sectionKey === 'taste') {
    return `
[시간 흐름 — 식사 진행 단계 ★ 맛 묘사 핵심]
- "첫 술 떴을 때는 ~"
- "두세 번 떠먹다 보니 ~"
- "반찬이랑 같이 먹어보니까 ~"
- "그릇 절반쯤 비웠을 때 ~"
- "마지막 한 술까지 ~"
→ "맛있다"의 1단계 표현 ❌ / 한 술 한 술의 변화 ✅`;
  }

  if (sectionKey === 'scene') {
    return `
[시간 흐름 — 식사 중 장면 변화 ★ scene 핵심]
- "처음 자리 잡았을 때는 ~"
- "음식 나오고 한 술 떠먹으니까 ~"
- "20~30분쯤 지나니까 옆자리도 ~"
- "그릇 비워갈 즈음에는 ~"
- "마무리할 무렵에는 ~"
→ "분위기가 좋았어요"의 1단계 ❌ / 시간 따라 바뀌는 장면 ✅`;
  }

  return '';
}

// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildChinesePrompt(section, treatment, region, options = {}) {
  const { mode = 'personal', situation = '', purpose = '' } = options;
  if (mode === 'commercial') {
    return buildCommercialChinesePrompt(section, treatment, region, options);
  }
  return buildPersonalChinesePrompt(section, treatment, region, options);
}

// ── personal 모드 ──
function buildPersonalChinesePrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const {
    name,
    cat = '한식',
    menu = treatment.menuRef || '',
    compareWith = '',
    nearbyHint = '',
  } = treatment;

  // 하이브리드 DIRECTION (BASE_MENU + SITUATION + PURPOSE merge)
  const direction = getChineseDirection(treatment, situation, purpose);
  const genericName = direction.genericName || name || '이 식당';

  const directionGuide = `
[맛집 방향 고정 — DIRECTION 하이브리드 merge]
- 방문 동기: ${direction.motive}
- 후킹 문장: ${direction.hook}
- 맛 핵심: ${direction.tasteCore}
- 장면 핵심: ${direction.sceneCore}
- 핵심 키워드: ${direction.keyword}
- 부담 결(가격 X): ${direction.priceFeel || '부담 없이 한 끼 하기 좋은'} (숫자 가격 절대 출력 금지)
- 상차림: ${direction.tableware || ''}
- 기본 반찬: ${(direction.sidedishes || []).join(', ')}
- 상황: ${situation || '(미지정)'} / 목적: ${purpose || '(미지정)'}
${direction.tableExtra ? `- 테이블 환경: ${direction.tableExtra}` : ''}
${direction.paceExtra ? `- 식사 페이스: ${direction.paceExtra}` : ''}
${direction.extraDetail ? `- 추가 디테일: ${direction.extraDetail}` : ''}`;

  const common = [
    directionGuide,
    getAiSmellGuide(),
    getKwDensityGuide(genericName, region, menu),
    getParagraphLengthGuide(),
  ].join('\n');

  switch (section) {
    case 'visit':   return _personalVisit(genericName, region, menu, situation, purpose, common);
    case 'arrive':  return _personalArrive(genericName, region, menu, common);
    case 'order':   return _personalOrder(genericName, region, menu, common);
    case 'taste':   return _personalTaste(genericName, region, menu, common);
    case 'scene':   return _personalScene(genericName, region, menu, situation, purpose, common);
    case 'revisit': return _personalRevisit(genericName, region, menu, situation, purpose, compareWith, common);
    default: throw new Error(`[chinese-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalVisit(genericName, region, menu, situation, purpose, common) {
  return `
당신은 ${region} 일대를 자주 다니는 일반인입니다. ${region}에서 ${menu} 한 그릇 먹은 경험을 1인칭 블로그 후기로 작성합니다.
첫 번째 섹션(방문 계기)을 작성하세요.

${common}
${getEmotionWaverGuide()}

[주제] ${region} ${menu} ${situation ? '· ' + situation : ''}${purpose ? ' · ' + purpose : ''} 방문 계기
[조건]
- 왜 지금 ${menu}가 먹고 싶었는지 1인칭 구어체로 작성
- ${situation ? `상황(${situation})이 자연스럽게 녹아 있어야 함` : ''}
- ${purpose ? `목적(${purpose}) — 누구와 / 어떤 자리인지 1줄 명시` : ''}
- 의료 표현·카페 표현 절대 금지 (시술·치료·카공·콘센트 등)
- ★ 망설임·기대 1회 포함 권장
- 분량: 200~300자 (문단 2~4줄)
- 말투: ~했어요, ~더라고요 (블로그 구어체)
`.trim();
}

function _personalArrive(genericName, region, menu, common) {
  return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getFlowTimelineGuide('arrive')}
${getActionDetailGuide('arrive')}
${getPhotoHintGuide('arrive')}
${getMealValueGuide()}

[주제] ${region} ${menu} 가게 도착·입장·웨이팅
[조건]
- ${region} 일대 어느 동선에서 접근했는지 (지하철역 도보 / 차·주차)
- 외관·간판·골목 분위기 묘사
- 입장 첫인상 + 웨이팅 분 단위 명시 (평일/주말 구분)
- ${region} 지역명 자연스럽게 1~2회 (단, "${region} ${menu}" 결합은 1회 이하)
- ★ 시간·웨이팅·동선·외관 같은 디테일은 행동 안에서 자연스럽게 (정보 나열 금지)
- "유명한" / "이름난" / "이 동네에서 알아주는" 같은 홍보 표현 절대 금지
- 분량: 250~350자 (문단 2~4줄)
- 말투: 블로그 구어체
`.trim();
}

function _personalOrder(genericName, region, menu, common) {
  return `
블로그 후기의 세 번째 섹션입니다.
${common}
${getFlowTimelineGuide('order')}
${getActionDetailGuide('order')}
${getPhotoHintGuide('order')}

[주제] ${menu} 주문·상차림
[조건]
- 메뉴판 보고 고민한 과정 + 뭐가 잘 나가는지 확인
- 실제 주문한 거 1~2개 (메뉴 소개·나열 ❌ → 고른 행동 ⭕)
- ★ 숫자 가격(○천원·○만원) 절대 출력 금지 → "부담 없이" / "가볍게" 정도의 결만
- 곁들임(단무지·어묵국물 등) / 양 가늠 / 포장 여부 짧게
- 상차림 세팅 순서 짧게 묘사
- ★ "메뉴가 다양해서 좋았어요" / "${menu} 메뉴" / "${menu}+조사+메뉴" 절대 금지
- ★ 메뉴 특징·원산지·가격 비교 설명 금지 → "그걸 고르게 된 상황" 중심
- 분량: 250~350자 (문단 2~4줄)
- 말투: 블로그 구어체
`.trim();
}

function _personalTaste(genericName, region, menu, common) {
  return `
블로그 후기의 네 번째 섹션입니다. ★ 맛 자체에 집중하는 핵심 섹션.
${common}
${getFlowTimelineGuide('taste')}
${getActionDetailGuide('taste')}
${getPhotoHintGuide('taste')}

[주제] ${menu} 맛·식감·온도
[조건]
- 첫 입 → 두세 술 → 마지막 술 시간 흐름으로 맛 변화 묘사
- 국물·면·고기·반찬 등 핵심 요소 구체 묘사 (온도·향·식감·간)
- "맛있다"의 1단계 표현 ❌ → 한 술의 체감으로 ✅
- 양념·새우젓·식초 첨가 같은 본인의 행동 1~2회 포함
- "정통" / "원조" / "인정" 같은 권위 표현 절대 금지
- ${region}·${menu} 키워드 이 섹션에서 과도하게 반복 금지 (메뉴명 3~4회 이하)
- 분량: 300~400자 (또는 flowBias=taste 시 380~480자) (문단 2~4줄)
- 말투: 블로그 구어체
`.trim();
}

function _personalScene(genericName, region, menu, situation, purpose, common) {
  return `
블로그 후기의 다섯 번째 섹션입니다. ★ 그 자리의 "장면"을 그리는 섹션.
${common}
${getFlowTimelineGuide('scene')}
${getActionDetailGuide('scene')}
${getPhotoHintGuide('scene')}

[주제] 식사 중 장면·분위기·동행 반응
[조건]
- 자리 잡음 → 음식 나옴 → 식사 중 → 마무리 시간 흐름
- 동행(${purpose || '동행'})의 반응·말 한마디 1~2회 포함
- 옆 테이블 구성·소음 수준 묘사 (1줄)
- ${situation ? `상황(${situation})에 맞는 장면 요소 1개 (예: 비 오는 날이면 창밖 빗소리, 야식이면 늦은 시간 손님 밀도)` : ''}
- 실제 체류 시간 명시 ("40분쯤 있다가 나왔어요")
- ★ 깔끔하기만 한 묘사 ❌ → 작은 불편 1개 포함 권장 (옆자리 소음·자리 좁음 등)
- ★★ 예측 못한 micro-action 1개 반드시 포함 (v4.2):
   다음 세 카테고리 중 하나에서 본인 상황에 맞춰 자유롭게 1개 작성.
   카테고리 A: 내 손이 닿는 작은 일 (예시 어휘 복제 금지, 본인이 직접 떠올린 행동)
   카테고리 B: 다른 손님의 짧은 움직임 (장면 한 컷)
   카테고리 C: 감각의 작은 사고 (뜨거움·삐끗·튐 등)
   → 매끈하지 않은 한 줄. 글 전체 흐름과 무관해도 됨.
   → "사장님이 친절", "분위기 좋음" 같은 평면 묘사는 카운트 안 됨.
- "분위기 맛집" / "감성 가득" / "사진 맛집" 절대 금지
- 분량: 300~400자 (또는 flowBias=scene 시 380~480자) (문단 2~4줄)
- 말투: 블로그 구어체
`.trim();
}

function _personalRevisit(genericName, region, menu, situation, purpose, compareWith, common) {
  return `
블로그 후기의 마지막 섹션입니다.
${common}
${getPhotoHintGuide('revisit')}

[주제] 재방문 의사 및 추천 상황
[조건]
- 또 갈 의향과 그 이유를 담담하게
- 어떤 상황·목적에 다시 오겠다는지 구체적으로 1~2개 (${situation || '해장'}/${purpose || '혼밥'}/가족모임 등)
- ${compareWith ? `${compareWith} 대비 이 가게만의 특징 1가지 자연스럽게` : ''}
- ${region} 지역명 자연스럽게 1회 (결합 표현 "${region} ${menu}"은 1회만)
- "또 가고 싶은" / "강추" / "찐맛집" / "꼭 가보세요" 절대 금지
- "~분들께는" / "~하시는 분들이라면" 독자 조언형 문장 금지
- ★ 추천 대상은 본인 경험 기준으로만 ("저처럼 ${situation || '혼자'} 먹을 거면" 정도까지만 허용)
- 분량: 200~250자 (문단 2~4줄)
- 말투: 블로그 구어체
`.trim();
}

// ============================================================
// 2. commercial 모드 (협찬·정보형 — 표시광고법)
// ============================================================
// ── commercial 모드 [B축 / 2026-07-15] 방문 상황 중심(Scene) 8섹션 ──
//   ⚠ personal 빌더(_personal*)는 무수정 보존. 본 함수만 재작성.
//   ★ B축 재설계(restaurant V2 동형): 주인공 = '검색자의 상황·목적'(메뉴 아님)
//     · 짜장면 백과사전 회귀 원인 = 구(舊) "메뉴 주인공" 설계 → 손님 주인공으로 전환
//     · key 8개(menuIntro~storeFeature) 유지 — generate 호환. 역할만 재정의.
//     · ③menuComposition = orderDecision 판단축 / ④tasteFeature = 판단의 결과(조합)
//   화법: 3인칭 정보형. 1인칭(저는·제가·갔다·먹어봤) 0. 허위체험 0. 광고단정 0.
//   섹션 key(8): menuIntro·menuScene·menuComposition·tasteFeature
//                ·pairing·decision·recommendSituation·storeFeature
function buildCommercialChinesePrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const { name, cat = '중식', menu = treatment.menuRef || '', compareWith = '' } = treatment;
  const direction = getChineseDirection(treatment, situation, purpose);
  const genericName = direction.genericName || name || '이 식당';
  const unit = direction.servingUnit || '한 그릇';        // ★ 메뉴별 단위 (탕수육=한 접시, 짜장면=한 그릇 등)
  const tasteRef = direction.tasteCore || '';              // ★ 메뉴 실제 맛 결 주입
  const compRef = direction.tableware || '';               // 구성 참고
  // ★ v3 방문목적 우선 필드 (B축 commercial 소비 — restaurant 동형)
  const purposeFrame = direction.purposeFrame || '';
  const decisionPoint = direction.decisionPoint || '';
  const recommendSit = direction.recommendSituation || '';
  // ★ v3 만족 판단축 (단정 금지 — 독자가 만족을 가늠할 재료)
  const portionFeel = direction.portionFeel || '';
  const sharingFeel = direction.sharingFeel || '';
  const usageType = direction.usageType || '';
  const paceFeel = direction.paceFeel || '';
  const visitTiming = direction.visitTiming || '';
  const bestCompanion = direction.bestCompanion || '';

  // ★★ [B-2 2026-07-15] Scene 라이브러리 분산 — recommendSituation 5종을 섹션별로 나눠 씀
  //   실측: direction.recommendSituation = "·"로 구분된 실제 상황 5종 보유(예 짜장면: 짧은점심·처음온집·고르기귀찮·비오는날·야근전).
  //   문제: 이 5종을 ⑦ 한 곳에만 통째로 주고 나머지 섹션은 GPT 상식("혼자/여럿")으로 채움 → Scene 반복.
  //   해결: 5종을 파싱해 섹션별로 다른 상황을 배정 → 섹션마다 다른 Scene에서 출발.
  const _sitPool = (recommendSit || '').split(/[·・]/).map(s => s.trim()).filter(Boolean);
  // 섹션별 우선 배정(부족하면 순환). 각 섹션은 배정된 상황을 '출발 장면'으로만 사용.
  const sceneFor = (idx) => _sitPool.length ? _sitPool[idx % _sitPool.length] : '';
  const sceneHint = {
    menuIntro:       sceneFor(0),
    menuScene:       sceneFor(1),
    menuComposition: sceneFor(2),
    tasteFeature:    sceneFor(3),
    pairing:         sceneFor(4),
    decision:        sceneFor(2),   // 판단 재배치(2번째 상황 재활용, 대비용)
  };
  const sceneHintOf = (k) => sceneHint[k]
    ? `\n- ★ [이 섹션 출발 상황 — data 기반, 임의 상황 지어내기 금지] "${sceneHint[k]}" 상황에서 연다. 다른 섹션이 쓴 상황과 겹치지 말 것.`
    : '';


  // ★★ [B축 2026-07-15] usageType 기반 Scene 분기 (혼밥 강제 억제)
  //   실측: '끼니' 포함 → 한그릇류(혼밥/점심 허용) / '요리'·'곁들임' 포함 → 요리·모임류(혼밥 억제, 공유 중심)
  //   원인: 혼밥 예시가 전 섹션 하드코딩 → 요리 메뉴도 "혼자 한 접시" 회귀. usageType은 추출만 되고 미사용이었음.
  const isDishType = /요리|곁들임/.test(usageType);   // 탕수육·유산슬·칠리새우 등 요리·곁들임 = true
  const isMealType = !isDishType;                       // 짜장면·짬뽕·볶음밥 등 끼니 = true
  // 섹션 예시에 쓸 대표 Scene 세트 (메뉴 성격에 맞게 — GPT가 따라 쓰는 예시 자체를 분기)
  const sceneOpenExamples = isMealType
    ? '"점심시간에 빠르게 한 끼 하려고 하시나요?" · "오늘은 혼자 편하게 중식 한 그릇 하고 싶으신가요?" · "여럿이 모여 나눠 먹을 자리를 찾고 계신가요?"'
    : '"여럿이 모여 나눠 먹을 자리를 찾고 계신가요?" · "가족들과 함께 식사 자리를 마련하려고 하시나요?" · "면 요리에 곁들일 요리 하나를 고민 중이신가요?"';
  const sceneCompanionRule = isMealType
    ? '혼자·둘·여럿 상황을 고루 다루되, 한 그릇으로 끝나는 끼니 성격을 살린다'
    : '★ 이 메뉴는 여럿이 나눠 먹는 요리·곁들임이다. "혼자 한 접시로 한 끼" 장면은 쓰지 말 것 — 가족·모임·공유 자리, 또는 면 요리에 곁들이는 상황이 중심. 혼밥 단독 끼니로 그리면 사실성 오류.';
  const orderJudgeExample = isMealType
    ? '"혼자 든든히 한 끼면 양과 간편함을 먼저 보고, 여럿이 나눌 자리면 나눠 먹기 좋은지를 먼저 따지게 된다"'
    : '"여럿이 나눌 자리면 몇 명이 먹을지·다른 메뉴와 어떻게 맞출지를 먼저 따지고, 면 요리에 곁들일 거면 어떤 요리를 하나 더할지를 고민하게 된다"';
  const combineExample = isMealType
    ? '"' + menu + '는 각자 한 ' + (direction.servingUnit || '그릇') + '씩 시키는 게 기본이고, 여럿이어도 각자 시킨 뒤 요리 하나를 곁들이는 정도다 — 이 메뉴 자체를 여러 그릇 덜어 먹는 공유식으로 그리지 말 것"'
    : '"여럿이 앉으면 각자 하나씩보다 ' + menu + '를 가운데 두고 덜어 먹고, 면·밥 메뉴와 함께 시켜 상을 채우는 조합이 흔하다"';
  const decisionExample = isMealType
    ? '"혼자 간편한 한 끼면 ' + menu + '가 무난하고, 국물이 당기면 다른 선택이 나을 수 있다"'
    : '"여럿이 나눠 먹을 요리를 찾으면 ' + menu + '가 무난하고, 혼자 간단한 끼니가 목적이면 면·밥 메뉴가 더 맞을 수 있다"';

  // ★★ [B-1 2026-07-15] 섹션별 Scene 앵글 고정 — 반복 회귀 차단 핵심
  //   문제: ②~⑥ 섹션이 purposeOpenRule 공유 → 전부 "상황→메뉴→공유" 동일 프레임 → 표현만 바뀌고 내용 안 나감.
  //   해결: 섹션마다 '다른 각도'를 강제. 각 섹션은 자기 앵글만 다루고, 다른 섹션 주제는 침범 금지.
  //   실측(2026-07-15): 양장피 8섹션 전부 "여럿이 모임→주문→대화" 반복 → Scene 사실상 1개.
  //   ★ [V3 2026-07-15] 앵글 재정의 — '주문 판단 프로세스' → '메뉴를 보는 소개 리듬'.
  //     섹션키는 그대로 유지(generate가 key로 순회). 각 섹션의 '시점'만 판단→소개로 전환.
  const sceneAngles = isMealType
    ? {
        menuIntro:       '이 집에서 ' + menu + '를 대표로 많이 찾는다는 소개 — 처음 방문하면 무엇을 찾는지, 왜 대표 메뉴인지 자연스럽게 연다. 상 위 모습을 살짝 예고.',
        menuScene:       '주문하면 상에 어떻게 오르는가 — 그릇·상차림·첫인상 장면 전담(tableware 활용). 눈앞에 놓인 모습을 그려 보인다. 세부 맛은 taste 섹션 몫.',
        menuComposition: '한 그릇/한 접시가 어떻게 구성되어 나오는가 — 무엇이 함께 담겨 나오는지 소개(data 구성 기준). 양·인원 가늠은 자연스럽게 곁들임.',
        tasteFeature:    '★핵심 섹션★ 맛·식감·온도를 눈앞에 보여주듯 소개 — tasteCore 전면 활용. "따뜻할 때 ~한 식감", "국물이 ~하게" 등 식욕이 느껴지게. 이 섹션에서 "맛있겠다"가 나와야 함.',
        pairing:         '함께 곁들이면 좋은 것 소개 — 허용 곁들임 목록 안에서만. 상을 어떻게 채우는지 자연스럽게. 없으면 이 한 그릇으로 마무리되는 결.',
        decision:        '어떤 메뉴를 고를지 안내 — 진한 소스/얼큰 국물 등 입맛에 따라 무엇이 어울리는지. 단정 아닌 소개로 "이런 날은 이 메뉴" 식.',
      }
    : {
        menuIntro:       '이 집에서 ' + menu + '를 대표 요리로 소개 — 어떤 자리에 자주 오르는 요리인지, 왜 많이 찾는지 자연스럽게 연다. 상 위 모습을 살짝 예고.',
        menuScene:       '주문하면 한상으로 어떻게 준비되는가 — 접시·상차림·첫인상 장면 전담(tableware 활용). 테이블에 오른 모습을 그려 보인다. 세부 맛은 taste 섹션 몫.',
        menuComposition: '한 접시가 어떻게 구성되어 나오는가 — 무엇이 함께 담겨 나오는지 소개(data 구성 기준). 몇 명이 나눠 먹기 좋은지 자연스럽게 곁들임.',
        tasteFeature:    '★핵심 섹션★ 맛·식감·온도를 눈앞에 보여주듯 소개 — tasteCore 전면 활용. "따뜻할 때 ~한 식감", "소스가 ~하게" 등 식욕이 느껴지게. 이 섹션에서 "맛있겠다"가 나와야 함.',
        pairing:         '함께 곁들이면 좋은 면·밥·다른 요리 소개 — 허용 목록 안에서만. 상을 어떻게 채우는지 자연스럽게.',
        decision:        '어떤 자리·입맛에 이 요리가 어울리는지 안내 — 단정 아닌 소개로 "이런 자리엔 이 요리" 식(따뜻한 요리 원하면 팔보채 등, data 허용 범위).',
      };
  const angleOf = (k) => sceneAngles[k]
    ? `\n- \u2605\u2605 [\uc774 \uc139\uc158 \uc804\uc6a9 \uac01\ub3c4 \u2014 \ub2e4\ub978 \uc139\uc158\uacfc \uacb9\uce58\uba74 \uc2e4\ud328] ${sceneAngles[k]}\n  \uc774 \uac01\ub3c4 \ubc16\uc758 \ub0b4\uc6a9(\ub2e4\ub978 \uc139\uc158\uc774 \ub9e1\uc740 \uc0c1\ud669\u00b7\ud310\ub2e8)\uc740 \uc5ec\uae30\uc11c \ub2e4\ub8e8\uc9c0 \ub9d0 \uac83. \uac19\uc740 "\uc5ec\ub7ff\uc774 \ubaa8\uc5ec \uc8fc\ubb38\u00b7\ub300\ud654" \uc11c\uc220 \ubc18\ubcf5 = \ud68c\uadc0\ub85c \uac04\uc8fc.`
    : '';

  // ★★★ [C축 Scene 컷 분리 · 2026-07-15] 실측: 8섹션이 전부 "주문→나온다→김→먹는다→쫄깃" 풀코스 반복.
  //   원인: 각 섹션이 '메뉴 전체를 처음부터 끝까지' 다시 소개 → GPT가 매번 같은 컷을 재촬영.
  //   해결: 카메라를 섹션마다 '한 컷'에 고정. 각 섹션은 배정된 컷만 찍고, 앞뒤 컷은 침범 금지.
  //   방식: data 무변경. sceneCore/tasteCore의 '메뉴 고유 행동'을 taste 컷에만 배치, 나머지 섹션은 그 행동 금지.
  //   메뉴 고유 행동(eatAction)은 sceneCore에서 추출(없으면 일반 문구). 예) 간짜장=비빈다 / 짬뽕=국물부터 / 동파육=꽃빵에 싼다.
  const _sceneCore = direction.sceneCore || '';
  const eatAction = _sceneCore || '이 메뉴 특유의 먹는 방식';
  // 섹션별 '카메라 컷' — 이 컷 하나만. 앞/뒤 컷은 명시적으로 금지.
  const cutMap = {
    menuIntro:       { cut: '이 집에 들어와 이 메뉴를 처음 떠올리는 순간', ban: '상차림·맛·비비기·먹는 행동·곁들임(뒤 컷)' },
    menuScene:       { cut: '주문한 것이 상에 올라오는 순간의 겉모습(그릇·김·색·담김새)', ban: '먹는 행동·맛 묘사·비비기·씹는 식감(뒤 컷) / 방문 동기(앞 컷)' },
    menuComposition: { cut: '상에 놓인 ' + unit + '의 구성을 훑는 컷(무엇이 함께 담겼나·양감)', ban: '먹는 행동·첫입 맛(뒤 컷) / 겉모습 첫인상 재서술(앞 컷 중복)' },
    tasteFeature:    { cut: '먹는 과정 컷 — 대표 행동(' + eatAction + ')을 단계로 나눠 따라감: 집는다→올린다/비빈다→첫입→식감', ban: '상차림 겉모습 재서술(앞 컷) / 곁들임·선택안내(뒤 컷)' },
    pairing:         { cut: '메인을 먹다가 곁들임을 더하는 컷(허용 목록 내)', ban: '메인 먹는 행동 재서술(앞 컷) / 맛 총평(뒤 컷)' },
    decision:        { cut: '메뉴를 고를지 말지 갈리는 지점 컷(입맛·자리 갈림)', ban: '먹는 장면·상차림 재서술(앞 컷 전부)' },
    recommendSituation: { cut: '이 메뉴가 어울리는 끼니·자리를 떠올리는 컷', ban: '먹는 행동·상차림·맛 재서술(앞 컷 전부)' },
    storeFeature:    { cut: '식사를 마치고 정리하는 여운 컷', ban: '먹는 행동·상차림·맛 재서술(앞 컷 전부) / 시설·서비스 창작' },
  };
  const cutOf = (k) => cutMap[k]
    ? `\n- 🎥 [카메라 컷 — 이 컷 하나만 ★ 반복 차단 핵심] 이 섹션은 "${cutMap[k].cut}"만 찍는다.\n  ❌ 금지 컷(다른 섹션 몫): ${cutMap[k].ban}. 이 컷들을 여기서 다시 서술하면 = 반복 회귀로 실패.\n  ★ '주문→나온다→김→먹는다→쫄깃' 풀코스를 매번 반복하지 말 것. 배정된 한 컷만 깊게.`
    : '';

  // ★ 먹는 과정 컷 전용 — 대표 행동을 '단계'로 쪼개는 지시 (tasteFeature에서만 사용)
  const eatStepsGuide = `
- 🎥 이 섹션은 '${menu}'의 대표 먹는 행동("${eatAction}")을 한 문장으로 뭉치지 말고 단계로 나눠 따라간다.
  예) 동파육: "꽃빵에 싸 먹는다" (X, 한 문장) → "꽃빵을 반으로 연다 → 고기를 올린다 → 소스를 살짝 묻힌다 → 한입에 넣는다" (O, 컷 분할)
  예) 간짜장: "비벼 먹는다" (X) → "소스 그릇을 면 위에 붓는다 → 춘장색이 면 전체로 퍼진다 → 면이 불기 전 재빨리 섞는다 → 첫 젓가락을 든다" (O)
- 맛·식감·온도는 이 '행동의 각 단계'에 얹어서 보여준다(정적 나열 X, 행동에 실어 동적으로 O).
- ★ "국물이 끓으며 김이 올라옵니다"(밋밋) 보다 "그릇 가장자리까지 김이 올라와 잠깐 서릴 정도입니다"(구체 장면)처럼, 눈에 그려지는 한 컷으로.`;


  // ★★★ [V3 파일럿 2026-07-15] 화법 재정의 — 검색자 상황해결형 → 업주 대표메뉴 소개형 (C축 톤 전환)
  //   전환 근거(실측): 상단글 100건에서 추천·가족·혼밥·분위기·점심·웨이팅·가성비 표현 빈번.
  //     점수의 원인은 표현 차단이 아니라 '설명서처럼 읽히는 목적·리듬'이라는 실측 판정.
  //   변경: 주인공을 '검색자 상황'에서 '메뉴 자체'로. tasteCore·sceneCore·tableware를 전면 활용.
  //   목표: 읽은 사람이 "이해했다"가 아니라 "맛있겠다 / 오늘 이거 먹을까"를 느끼게 (식욕 유도).
  //   유지(하한선): 1인칭·허위체험·광고단정·매장명노출·가격숫자·data없는사실창작 금지는 그대로.
  const infoFrameGuide = `
[화법 — 최상위 규칙 ★★ 위반 시 전면 실패]
- ★★★ 이 글은 '업주가 손님에게 대표메뉴를 자연스럽게 소개하는' 톤이다. 주인공은 '${menu}'(메뉴)다.
  → 사진과 메뉴를 연결하는 문장이 중심. 상 위에 오른 ${menu}를 눈앞에 보여주듯 소개한다.
  → 예) "처음 방문하면 많이 찾는 메뉴입니다" / "주문하면 한상으로 준비됩니다"
      "테이블에 올라오면 가장 먼저 눈에 들어오는 메뉴입니다" / "따뜻할 때 먹으면 식감이 잘 살아납니다"
  → 정보는 줄이지 않는다. 다만 '설명(정의·나열)'이 아니라 '소개(눈앞에 보여주기)'로 쓴다.
- ★ 업주 소개 톤이되 '후기체'도 '광고체'도 '설명서체'도 아니다.
  · 후기체 아님: "제가 가봤더니" 류 방문 경험 금지 (1인칭 금지)
  · 광고체 아님: "최고·강추·꼭 드세요" 류 단정 금지
  · 설명서체 아님: "${menu}는 ~로 만든 음식으로 ~가 특징" 사전식 정의 금지
- ❌ 1인칭 절대 금지: "저는/제가/우리는", "갔다/다녀왔다/먹어봤다/주문했다"
- ❌ 허위 체험 금지: "오늘 갔더니", "줄 서서 기다렸다", "사장님이 추천", "40분 웨이팅"
- ❌ 광고 단정 금지: "최고", "원조", "찐맛집", "꼭 드세요", "인생 메뉴", "강추"
- ❌ 어색한 결합 금지: "${menu} 음식"(→"${menu}"·"${menu} ${unit}"), "${menu} 지역"(→"${menu} 전문점")
- ❌ 지역명(${region}) 반복 금지: 글 전체 3회 이하. 매 문단 첫머리에 지역명 반복하지 말 것 — "이 동네/인근/근처"로 자연 치환
- ★ '${menu}'의 단위는 "${unit}". "${menu} ${unit}"로 표기. 다른 단위 임의 사용 금지.
- ★ '${menu}'의 실제 구성·맛 결: ${tasteRef || '(기본)'}. ★ 이 결을 적극 활용해 식욕이 느껴지게 쓰되, 이 결을 벗어난 재료 임의 추가는 금지.
- ✅ 소개 안내체: "~한 메뉴입니다", "~로 준비됩니다", "따뜻할 때 ~한 식감입니다", "처음이면 ~를 많이 찾습니다"
- ⚠ 과도한 일반화 단정 완화: "간이 잘 맞춰져 있어" 류 전 매장 단정은 피하고 "이 메뉴 특성상 ~한 편입니다" 정도로.
- ★ 문체: 생활형 소개 안내체. 교과서식·논문식·백과사전식 금지. 짧고 읽기 쉬운, 눈에 그려지는 문장.
- ★ 글의 중심은 '${menu}를 먹고 싶게 소개'. 메뉴가 주인공, 상황은 그 메뉴가 어울리는 장면으로 곁들인다.
- ★ 읽고 난 독자에게 "${menu}가 뭔지 알았다"가 아니라 "맛있겠다, 오늘 한 ${unit} 하러 갈까"가 남도록 쓴다.`;

  const sidedishes = (direction.sidedishes || []).join(', ');

  // ★★★ [B-3 축소 · V3 2026-07-15] Scene→식욕 연결은 허용, data 없는 '사실 창작'만 차단 (삭제 아님)
  //   변경: 기존 B-3는 맛묘사·식욕유도까지 함께 눌러 '설명서'가 됐다. V3에선 맛·식감·온도 소개(식욕 유도)는 허용.
  //   유지(하한선): data에 없는 곁들임·재료·조리법·매장 서비스(주차/웨이팅/회전율/좌석)를 '생성'하는 것만 차단.
  //   핵심 구분: '맛있게 소개하기'(허용) ≠ '없는 사실 지어내기'(차단).
  const inferenceBlockGuide = `
[★★★ 사실 창작 차단 — 위반 시 실패 (모든 섹션 공통) · 맛 소개는 허용]
- ✅ 허용(식욕 유도): '${menu}'의 맛·식감·온도·상차림을 눈앞에 보여주듯 소개하는 것은 자유.
    예) "따뜻할 때 먹으면 식감이 잘 살아납니다", "국물이 얼큰하게 올라오는 편입니다" (data 맛결 범위 내)
- ✅ 허용(Scene 연결): 상황·날씨·시간대·자리를 ${menu}가 어울리는 장면으로 곁들이는 것은 자유.
    예) "쌀쌀한 날 뜨끈한 국물이 당길 때 잘 어울리는 메뉴입니다" (여기서 자연스럽게 이어도 됨)
- ❌ 차단(없는 사실 창작): 아래는 data에 없으므로 '지어내기' 금지 (있다/없다/추천 모두 — 언급 자체 금지):
  · 곁들임/사이드/추가 주문 중 허용목록 밖의 것: 허용 = ${sidedishes || '(없음 — 곁들임 언급 자체 금지)'}
    (공깃밥·탕수육·군만두·볶음밥·짬뽕국물 등 목록 밖 항목을 조합/추가로 만들지 말 것)
  · 곱빼기·곱빼기 선택 여부 (data.portionFeel에 명시 없으면 생성 금지)
  · 매장 서비스: 제공 속도("금방 나온다"), 회전율, 웨이팅, 혼밥 좌석, 단체석, 주차, 포장
    → 이 항목들은 매장마다 다르고 data에 없다. 「📍 찾아오시는 길」 블록이 따로 처리하므로 본문 생성 금지.
- ★ 판단 기준: 맛·식감·온도·상차림·어울리는 상황 = data 맛결에서 나온 소개인가? → 허용.
  곁들임·매장 서비스·없는 재료를 새로 지어낸 것인가? → 삭제.`;

  const common = [infoFrameGuide, getAiSmellGuide(), getKwDensityGuide(genericName, region, menu), inferenceBlockGuide].join('\n');

  // ★ [V3] 섹션 전체 화법 규칙 — 메뉴 소개 톤 (사람주어 강제 해제, 메뉴 주어 허용)
  const purposeOpenRule = `
- ★★ 섹션 전체 화법(필수): '${menu}'를 눈앞에 보여주듯 소개한다. 메뉴가 주어가 되어도 좋다.
  단, 사전식 정의·재료 나열의 '설명서'가 아니라, 상 위에 오른 모습을 그려 보이는 '소개'로.
  · 시작: 이 메뉴/이 자리를 눈앞에 그리며 연다 — 예) ${isMealType ? '"처음 방문하면 많이 찾는 메뉴입니다", "주문하면 이렇게 한 그릇으로 나옵니다", "따뜻할 때 먹으면 …"' : '"주문하면 한상으로 준비됩니다", "여럿이 둘러앉는 자리에 자주 오르는 메뉴입니다", "테이블 가운데 놓고 나눠 먹기 좋게 …"'}
  · 본론: 맛·식감·온도·상차림(data 맛결 기준)을 구체적으로 그려 식욕이 느껴지게. 어울리는 상황을 곁들여도 좋다.
  · 끝: "이런 자리라면 잘 어울리는 메뉴입니다" 식으로 자연스럽게 닫는다.
  ${sceneCompanionRule}
  ❌ 금지 시작: "${menu}는 ~로 만든 음식으로 ~가 특징입니다"(사전식 정의 시작)
  ❌ 금지 전개: 재료·조리 과정만 백과사전처럼 나열 — 눈에 그려지지 않는 정의 나열은 '설명서 회귀'로 간주`;

  const sectionGuides = {
    // ① [V3 소개] 대표메뉴 소개 — 이 집에서 많이 찾는 메뉴로 연다
    //    ⚠ 섹션 key(menuIntro) 유지 — generate가 key로 돌므로 이름 변경 금지
    menuIntro: `
[섹션 주제] 이 집 대표메뉴 소개 (★ V3 소개 도입)
[조건]${cutOf('menuIntro')}${angleOf('menuIntro')}${sceneHintOf('menuIntro')}
- ★ "처음 방문하면 많이 찾는 메뉴입니다" 식으로, 이 집에서 ${menu}를 왜 대표로 찾는지 자연스럽게 연다.
- 상 위에 오른 모습을 한 줄 예고해 다음 섹션으로 잇는다 (상세 맛은 taste 섹션에서).
- 어울리는 끼니·자리 상황을 곁들여도 좋다: ${recommendSit || '(메뉴 기본 결)'}
- 3인칭 소개 안내체(1인칭 체험·허위방문 금지). 독자에게 말 거는 질문체는 허용.
- 분량: 250~350자`,

    // ② [V3 소개] 상에 오르는 모습 — tableware·첫인상
    menuScene: `
[섹션 주제] 주문하면 상에 오르는 모습 (★ tableware·첫인상 소개)
[조건]${cutOf('menuScene')}${purposeOpenRule}${angleOf('menuScene')}${sceneHintOf('menuScene')}
- ★ "주문하면 이렇게 준비됩니다" 식으로, 상에 오른 ${menu}의 첫인상을 눈앞에 그려 보인다.
- 상차림 참고(data 기준): ${compRef || '(기본 상차림)'} / 단위: "${menu} ${unit}"
- 그릇·담김새·김·색감 등 눈에 보이는 요소 중심. 세부 맛·식감은 taste 섹션 몫이니 예고만.
- ❌ 1인칭 서사 금지 / ❌ data에 없는 상차림 요소 지어내기 금지
- 분량: 240~320자`,

    // ③ [V3 소개] 구성 — 무엇이 함께 담겨 나오는가
    menuComposition: `
[섹션 주제] ${unit}이 어떻게 구성되어 나오는가 (★ 구성 소개)
[조건]${cutOf('menuComposition')}${purposeOpenRule}${angleOf('menuComposition')}${sceneHintOf('menuComposition')}
- ★ ${menu} ${unit}이 어떤 구성으로 나오는지 소개(data 구성·맛결 기준: ${tasteRef || '(기본)'}).
- 양·인원 가늠을 자연스럽게 곁들임: 양 ${portionFeel || '(매장 기준)'} / 나눔 ${sharingFeel || '(상황에 따라)'}
- ❌ 사전식 정의("${menu}는 ~로 만든 음식") 금지. 상에 놓인 구성을 눈에 보이듯 소개.
- ❌ data 맛결 범위 밖 재료 임의 추가 금지.
- 분량: 280~380자`,

    // ④ [V3 핵심★] 맛·식감·온도 — tasteCore 전면. "맛있겠다"가 나와야 하는 섹션
    tasteFeature: `
[섹션 주제] ${menu}의 맛·식감·온도 (★★ V3 핵심 섹션 — 식욕 유도)
[조건]${cutOf('tasteFeature')}${eatStepsGuide}${purposeOpenRule}${angleOf('tasteFeature')}${sceneHintOf('tasteFeature')}
- ★★ 이 섹션이 V3의 핵심이다. ${menu}를 눈앞에서 먹는 것처럼, 맛·식감·온도를 그려 식욕이 느껴지게.
  맛 결(data): ${direction.tasteCore || '기본'} / 장면 결(data): ${direction.sceneCore || ''}
  예) "따뜻할 때 먹으면 식감이 잘 살아납니다", "국물이 얼큰하게 올라와 뜨끈하게 넘어갑니다"
- ✅ 맛·식감·온도의 구체 묘사는 이 섹션에서 적극 허용(식욕 유도가 목표). 단 data 맛결 범위 내에서.
- ❌ "최고·원조·찐맛집" 광고 단정 금지 / ❌ 1인칭 체험 금지 / ❌ 가격 숫자 금지
- ❌ data에 없는 재료·조리법 창작 금지 (맛 결 벗어난 임의 추가 금지).
- 분량: 300~400자 (또는 flowBias=taste 시 더 길게) — 이 섹션은 넉넉히 써서 식욕을 살린다`,

    // ⑤ [V3 소개] 곁들이면 좋은 것 — 허용 목록 내
    pairing: `
[섹션 주제] 함께 곁들이면 좋은 것 (★ 곁들임 소개 · 허용 목록 내)
[조건]${cutOf('pairing')}${purposeOpenRule}${angleOf('pairing')}${sceneHintOf('pairing')}
- ★★★ [곁들임 게이트 유지 — 위반 시 실패] 곁들임으로 언급 가능한 것은 아래 목록뿐이다.
  허용 곁들임: ${sidedishes || '(데이터 없음 — 곁들임 언급 자체 금지)'}
  ❌ 목록에 없는 메뉴를 곁들임/사이드로 지어내기 절대 금지 (공깃밥·탕수육·군만두 등 data에 없으면 생성 금지).
  ${sidedishes ? '→ 위 허용 목록 안에서만 "같이 곁들이면 좋습니다" 톤으로 소개.' : '→ 허용 목록이 비었으면 "이 한 ' + unit + '으로 든든하게 마무리되는 편입니다" 식으로 곁들임 없이.'}
- ✅ 곁들임이 ${menu}와 어떻게 어울리는지 짧은 소개는 허용 (단 목록 내 항목만).
- ❌ "강추" 류 광고 금지 · ❌ 가격 숫자 금지.
- 분량: 180~240자`,

    // ⑥ [V3 소개] 어떤 메뉴를 고를지 — 입맛에 따른 소개
    decision: `
[섹션 주제] 어떤 메뉴를 고르면 좋은가 (★ 선택 안내 · 소개 톤)
[조건]${cutOf('decision')}${purposeOpenRule}${angleOf('decision')}${sceneHintOf('decision')}
- ★ "이런 입맛·자리에는 이 메뉴" 식으로 자연스럽게 안내. 강한 단정보다 소개 톤으로.
  예) ${decisionExample}
- ★ 선택 기준 참고: ${decisionPoint || '(메뉴 기본 결로 판단)'}
- 입맛 갈림 1~2줄(진한 소스 선호 / 얼큰 국물 선호 등). 다른 메뉴 비교는 data 허용 범위 내.
- ❌ "꼭 드세요·강추" 광고 단정 금지 — "~한 분들이 많이 찾습니다" 소개 톤.
- 분량: 300~400자`,

    // ⑦ [V3 소개] 어떤 자리에 어울리는가 — 상황 정리
    recommendSituation: `
[섹션 주제] 어떤 끼니·자리에 어울리는 메뉴인가 (★ 어울리는 상황 소개)
[조건]${cutOf('recommendSituation')}${purposeOpenRule}${sceneHintOf('menuScene')}
- 앞에서 소개한 ${menu}가 어떤 끼니·자리에 잘 어울리는지 정리한다: ${recommendSit || '(메뉴 기본 결)'}
- ★★★ [사실성 가드 유지 — 위반 시 실패] 아래는 매장 데이터가 없어 문장 생성 자체 금지(있다/없다/확인 모두 금지):
  제공 속도("금방 나온다"), 회전율, 웨이팅 유무, 포장 가능 여부, 좌석 종류, 주차.
  → 매장마다 다르고 data에 없다. 「📍 찾아오시는 길」 블록이 따로 처리. 본문 생성 금지.
- ★ 다뤄도 되는 것: 메뉴 성격상 어울리는 끼니·자리 상황과 페이스(${paceFeel || '상황에 따라'}) — 메뉴 결까지만.
- ❌ "꼭 가보세요" 류 광고 종결 금지 — "~한 자리에 잘 어울리는 메뉴입니다" 톤.
- 분량: 240~320자`,

    // ⑧ 마무리(보조) — 메뉴 중심으로 닫기
    storeFeature: `
[섹션 주제] ${menu}를 중심으로 한 마무리 정리 (보조)
[조건]${cutOf('storeFeature')}
- ⚠ 매장이 주인공이 되면 후기형 회귀 — ${menu}·어울리는 자리 중심으로 마무리한다.
- ❌ 매장명 본문 직접 노출 금지 (지역·골목·일대 등 공간 맥락으로).
- ★★★ [사실성 가드 유지 — 위반 시 실패] 아래는 매장 데이터가 없어 문장 생성 자체 금지.
  '있다/없다/확인하라/마련되어 있다/다를 수 있다' 어떤 형태로도 금지 — 아예 다루지 말 것:
  혼밥 좌석, 단체석, 좌석 종류, 주차, 포장, 제공 속도, 회전율, 웨이팅.
  → 주소·주차 안내는 글 하단 「📍 찾아오시는 길」 블록이 처리. 본문 중복 생성 금지.
- ★ 다룰 것: 앞서 소개한 ${menu}가 어울리는 자리를 한 번 더 짧게 묶어 "이런 자리라면 잘 어울리는 메뉴입니다"로 닫는다. 새 정보(시설·서비스) 창작 금지.
- 분량: 180~240자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] '${menu}' 메뉴 정보 안내\n- 3인칭 정보형. 1인칭·광고 단정 금지.\n- 분량: 200~300자`;

  return `
${region} ${menu} ${cat} — 업주가 대표메뉴를 소개하는 글의 [${section}] 섹션만 작성.

${guide}
${common}

---
이 섹션만 작성. ★ 주인공은 '${menu}'(메뉴)다. ${menu}를 눈앞에 보여주듯 소개해 "맛있겠다"가 남게 쓴다.
사전식 정의("${menu}는 ~로 만든 음식")는 금지 — 정의 나열이 아니라 상 위에 놓인 모습을 그려 보이는 소개로.
1인칭 서사·허위 체험·광고 단정(최고·원조·강추)·매장명 노출·가격 숫자·data 없는 사실 창작은 절대 금지.
딱딱한 논문체·백과사전체 금지 — 읽기 쉬운 생활형 소개 안내체. 문단은 2~4줄로 유지.
`.trim();
}

// ============================================================
// 3. 이미지 ALT 생성 (getImageAlts)
//    맛집 사진 alt — 외관·메뉴판·상차림·음식·장면·마무리
// ============================================================
export function getChineseImageAlts(treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const menu = treatment.menu || treatment.menuRef || '';
  const cat = treatment.cat || '한식';
  const r = region || '';

  return [
    `${r} ${menu} 가게 외관 사진`,
    `${r} ${menu} 입구·간판`,
    `${r} ${menu} 메뉴판 사진`,
    `${r} ${menu} 상차림 세팅`,
    `${r} ${menu} 반찬 구성`,
    `${r} ${menu} 한 그릇 클로즈업`,
    `${r} ${menu} 국물·식감 디테일`,
    `${r} ${menu} 테이블 분위기${situation ? ' (' + situation + ')' : ''}`,
    `${r} ${menu} 식사 중 장면${purpose ? ' · ' + purpose : ''}`,
    `${r} ${menu} 마무리 컷`,
  ].filter(s => s.trim());
}

// ============================================================
// 4. export
// ============================================================
export { getEmotionWaverGuide, getActionDetailGuide, getMealValueGuide, getPhotoHintGuide };
