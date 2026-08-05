// =============================================
// lib/chicken-prompts.js
// 치킨 프롬프트 빌더 v1.0 — Chicken Engine 독립 (Japanese 복사 베이스)
//
// 기반: restaurant-prompts.js 구조 동형 (Restaurant 계열 엔진)
//   · 함수명 chicken화, import = ./chicken-data.js
//   · commercial(메뉴 정보형) 기본. personal 빌더는 보존(restaurant 동형)
//   · 면·국물 전용 예시는 치킨 톤(튀김옷·소스·조각)으로 중립화
//   · cat 4계열(fried·seasoned·oven·special) — 계열 무관 공통 빌더 (계열별 결은 data.tasteCore 주입)
//   · 효능·관용 표현 금지 (PHILOSOPHY 정합)
//
// 핵심 차이점 (cafe → restaurant 계열)
//   1. DIRECTION = data.js의 buildDirection() 동적 생성 (정적 맵 X)
//   2. 섹션 키 6개: visit·arrive·order·taste·scene·revisit
//   3. taste(맛 핵심) + scene(장면 핵심) 2섹션 분리
//   4. 광고/홍보 표현 차단 강화 (Phase 9.5 핵심 — "지역 검색 결과 장악")
//   5. 지역 반복 제한 ("구리" 과밀 차단)
//   6. 사진 유도 문장 자연화 (상차림·치킨 클로즈업·창가 등)
//   7. scene 강화: 동행 반응·옆자리·창밖 등 "장면" 묘사
// =============================================

import { buildDirection } from './chicken-data.js';

// ============================================================
// 0. DIRECTION 헬퍼 — 데이터 조합으로 동적 생성
// ============================================================
export function getChickenDirection(treatment, situation, purpose) {
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
→ 대체: 행동·결정으로 보여주기 ("한 조각 더 집었어요", "사이드 추가했어요")

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
나머지는 "이 치킨", "이거", "그것"으로 대체.
★ "이 메뉴", "${menu} 메뉴", "${menu}+조사+메뉴" 형태 절대 금지
   ❌ "${menu}이 메뉴를", "${menu} 메뉴가", "${menu}이 메뉴의"
   → 메뉴명 뒤에 "메뉴"라는 단어를 절대 붙이지 않을 것
   → "메뉴"는 "메뉴판"에서만 사용 (메뉴판 보면서, 메뉴판 한 장 찍음)
★ 메뉴명 뒤에 "치킨"을 다시 붙이지 말 것 — "${menu}"는 이미 완성된 이름임
   ❌ "${menu} 치킨", "${menu} 치킨은", "${menu} 치킨이"
   → "${menu}"는 그 자체로 메뉴명. 뒤에 "치킨"을 덧붙이면 중복("후라이드치킨 치킨")
   → 카테고리를 지칭할 땐 메뉴명을 빼고 "이 치킨", "치킨" 단독으로만

[조사 오류 금지 ★★ Phase 9.5 이슈 #1]
"${genericName}" 뒤 조사 직접 연결 시:
  ❌ "${genericName}을" → ✅ "이 가게를"
  ❌ "${genericName}는" → ✅ "여기는"

메뉴명("${menu}") + 조사 사용 시 문장이 끊기지 않게 자연스럽게:
  ✅ "${menu}을/를 먹으러", "${menu} 한 마리", "${menu}이 유명한"
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
- 사이드 추가할지 고민
- 가격대 비교하면서 골랐음
- 반찬 미리 깔리는 거 보면서 기다림
- 키오스크인지 직원 주문인지 확인`;
  }
  if (sectionKey === 'taste') {
    return `
[맛 묘사 행동 디테일 필수 ★★ 사람 글 느낌 핵심]
맛 표현은 "정보"가 아니라 "한 입의 체감". 아래 행동 중 3개 이상:
- 한 조각 집어 베어 묾 / 튀김옷 부서지는 소리
- 첫 입에서 얼굴 표정 / 뜨거워서 후후 불기
- 동행이랑 동시에 한 입 떠보고 눈빛 교환
- 소금·소스 찍어서 다시 한 입
- 반찬이랑 같이 먹어봄 / 사이드랑 같이 집어 먹어봄
- 두 번째 조각에서 본격적인 맛 평가
- 접시 비워가면서 마지막 조각 아껴 먹음
→ "맛있었어요" 평면 ❌ / 한 조각 한 조각의 행동·체감 ✅`;
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
  '다 먹고 남은 뼈가 쌓인 접시를 마지막에 찍었어요',
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
- "양념·소스 색이 잘 보이는 각도로 찍었어요"
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
  · 부담감(가격 X): "부담 없이 한 마리" / "가볍게 한 끼" (숫자 가격 절대 금지)
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
- "마지막 한 조각까지 ~"
→ "맛있다"의 1단계 표현 ❌ / 한 조각 한 조각의 변화 ✅`;
  }

  if (sectionKey === 'scene') {
    return `
[시간 흐름 — 식사 중 장면 변화 ★ scene 핵심]
- "처음 자리 잡았을 때는 ~"
- "치킨 나오고 한 조각 베어 무니까 ~"
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
export function buildChickenPrompt(section, treatment, region, options = {}) {
  const { mode = 'personal', situation = '', purpose = '' } = options;
  if (mode === 'commercial') {
    return buildCommercialChickenPrompt(section, treatment, region, options);
  }
  return buildPersonalChickenPrompt(section, treatment, region, options);
}

// ── personal 모드 ──
function buildPersonalChickenPrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const {
    name,
    cat = 'fried',
    menu = treatment.menuRef || '',
    compareWith = '',
    nearbyHint = '',
  } = treatment;

  // 하이브리드 DIRECTION (BASE_MENU + SITUATION + PURPOSE merge)
  const direction = getChickenDirection(treatment, situation, purpose);
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
    default: throw new Error(`[chicken-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalVisit(genericName, region, menu, situation, purpose, common) {
  return `
당신은 ${region} 일대를 자주 다니는 일반인입니다. ${region}에서 ${menu} 한 마리 먹은 경험을 1인칭 블로그 후기로 작성합니다.
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
- 곁들임(치킨무·콜라 등) / 양 가늠 / 포장 여부 짧게
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
- 첫 입 → 두세 조각 → 마지막 조각 시간 흐름으로 맛 변화 묘사
- 튀김옷·속살·소스 등 핵심 요소 구체 묘사 (온도·향·식감·간)
- "맛있다"의 1단계 표현 ❌ → 한 조각의 체감으로 ✅
- 무·소스 곁들임 같은 본인의 행동 1~2회 포함
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
- 어떤 상황·목적에 다시 오겠다는지 구체적으로 1~2개 (${situation || '점심'}/${purpose || '혼밥'}/가족모임 등)
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
// ── commercial 모드 [v2 / 2026-06-25] 메뉴 중심 정보형 8섹션 ──
//   ⚠ personal 빌더(_personal*)는 무수정 보존. 본 함수만 재작성.
//   최상위 원칙: 주인공 = '메뉴'. 사용자 질문 = "이 메뉴가 나에게 맞는가?"
//   화법: 3인칭 정보형. 1인칭(저는·제가·갔다·먹어봤) 0. 허위체험 0. 광고단정 0.
//   섹션 key(8): menuIntro·menuScene·menuComposition·tasteFeature
//                ·pairing·decision·recommendSituation·storeFeature
function buildCommercialChickenPrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const { name, cat = 'fried', menu = treatment.menuRef || '', compareWith = '' } = treatment;
  const direction = getChickenDirection(treatment, situation, purpose);
  const genericName = direction.genericName || name || '이 식당';
  const unit = direction.servingUnit || '한 마리';        // ★ 메뉴별 단위 (치킨=한 마리, 닭강정=한 컵, 윙봉세트=한 세트 등)
  const tasteRef = direction.tasteCore || '';              // ★ 메뉴 실제 맛 결 주입
  const compRef = direction.tableware || '';               // 구성 참고

  // 정보형 최상위 화법 규칙 (모든 commercial 섹션 공통)
  const infoFrameGuide = `
[메뉴 정보형 화법 — 최상위 규칙 ★★ 위반 시 전면 실패]
- 주인공은 '${menu}'라는 메뉴 자체. 매장 방문기·후기 아님.
- ❌ 1인칭 절대 금지: "저는/제가/우리는", "갔다/다녀왔다/먹어봤다/주문했다"
- ❌ 허위 체험 금지: "오늘 갔더니", "줄 서서 기다렸다", "사장님이 추천", "40분 웨이팅"
- ❌ 광고 단정 금지: "최고", "원조", "찐맛집", "꼭 드세요", "인생 메뉴"
- ❌ '맛있다/맛있어요' 단정 금지
- ❌ 어색한 결합 금지: "${menu} 음식"(→"${menu}"·"${menu} ${unit}"), "${menu} 지역"(→"${menu} 전문점")
- ❌ 지역명(${region}) 반복 금지: 글 전체 3회 이하. 매 문단 첫머리에 지역명 반복하지 말 것 — "이 동네/인근/근처"로 자연 치환
- ★ '${menu}'의 단위는 "${unit}". "${menu} ${unit}"로 표기. 다른 단위(없는 그릇/접시) 임의 사용 금지.
- ★ '${menu}'의 실제 구성·맛 결: ${tasteRef || '(기본)'}. 이 결을 벗어난 재료(이 메뉴에 없는 해물·고기 등) 임의 추가 금지.
- ✅ 관찰 가능한 특징으로 기술 (해당 메뉴 실제 결 기준)
- ✅ 3인칭 정보 안내체: "~한 메뉴다", "~로 구성된다", "~인 경우 ~가 잘 맞는다"
- ✅ 독자가 '이 메뉴가 나에게 맞는지' 판단할 재료를 제공
- ⚠ 과도한 일반화 단정 금지: "간이 잘 맞춰져 있어/잡내가 적어/별도 양념 없이도" 류는 모든 매장 사실이 아님 → "매장에 따라 다를 수 있다/일반적으로 이런 구성이 많다/취향에 따라 다르게 느껴질 수 있다"로 완화
- ⚠ AI투 지시어 금지: "이거/이것을/그것을" 대신 메뉴명('${menu}') 사용`;

  const common = [infoFrameGuide, getAiSmellGuide(), getKwDensityGuide(genericName, region, menu)].join('\n');

  const sidedishes = (direction.sidedishes || []).join(', ');

  const sectionGuides = {
    // ① 메뉴소개 — 메뉴 정체성
    menuIntro: `
[섹션 주제] '${menu}'가 어떤 음식인지 소개 (메뉴 자체)
[조건]
- ${menu}의 계열·정체성을 정보형으로 소개 (예: 어떤 재료 기반, 어떤 조리 계열인지)
- 방문 서사 아님. 메뉴가 어떤 음식인지에만 집중
- 어떤 사람들이 주로 찾는 메뉴인지 1~2줄 (3인칭)
- 방향 참고: ${direction.motive}
- 분량: 250~350자`,

    // ② 메뉴장면(소비상황)
    menuScene: `
[섹션 주제] '${menu}'가 어울리는 소비 상황
[조건]
- 이 메뉴를 찾게 되는 상황을 메뉴 기준으로 (예: "출출한 밤 치킨 한 마리 당길 때 찾기 좋은 메뉴")
- ❌ "내가 갔다" 1인칭 서사 금지 — 메뉴와 상황의 일반적 결합만
- 상황: ${situation || '(일반)'} / 목적: ${purpose || '(일반)'}
- 분량: 180~260자`,

    // ③ 메뉴구성
    menuComposition: `
[섹션 주제] '${menu}' ${unit} 의 구성
[조건]
- '${menu}'에 실제로 들어가는 재료·구성 요소·비율·양 가늠을 관찰 사실 위주로
- 이 메뉴 실제 결 참고: ${tasteRef || '(기본 구성)'} / 상차림 참고: ${compRef || ''}
- ❌ 이 메뉴에 없는 재료 임의 추가 금지 (예: 치킨에 없는 국물·탕류를 끼워넣지 말 것)
- 예시 표현: "기본 반찬은 ${sidedishes || '깍두기·김치 계열'}"
- ❌ 가격 숫자 금지 → 필요 시 "방문 시 매장 기준 확인"
- 분량: 280~380자`,

    // ④ 맛특징(관찰형)
    tasteFeature: `
[섹션 주제] '${menu}'의 관찰 가능한 맛 특징
[조건]
- '맛있다' 금지. 선택에 도움되는 특징으로 기술
- 예: "육수가 진한 편", "튀김옷이 두꺼워 호불호 갈리는 편", "생선 결이 또렷해 식감이 살아있는 편"
- 호불호 갈리는 지점을 솔직하게 (과장·단정 금지)
- 맛 핵심 참고: ${direction.tasteCore}
- 분량: 300~400자`,

    // ⑤ 곁들임
    pairing: `
[섹션 주제] '${menu}'와 함께 먹기 좋은 구성
[조건]
- 곁들임·추가 메뉴·조합을 정보형으로 (예: 치킨무·콜라, 소금이나 소스에 찍기, 사이드 메뉴 조합 ${sidedishes || ''})
- ❌ "강추" 류 광고 표현 금지 — "~와 함께 먹는 경우가 많다" 톤
- 분량: 180~260자`,

    // ⑥ 선택포인트(Decision ★신설)
    decision: `
[섹션 주제] '${menu}' 선택 가이드 (이 메뉴가 맞는 사람 / 다른 선택이 나은 경우)
[조건 ★ 이 섹션이 v2 핵심]
- "이런 입맛·상황이면 ${menu}가 잘 맞고, 이런 경우엔 다른 메뉴가 나을 수 있다"는 판단 기준 제시
- 호불호 기준을 구체적으로 (예: "진한 양념을 선호하면 잘 맞고, 담백한 걸 찾으면 후라이드나 오븐")
- ❌ 단정적 추천 아님 — 독자가 스스로 판단하도록 재료 제공
- 분량: 250~350자`,

    // ⑦ 추천상황
    recommendSituation: `
[섹션 주제] '${menu}'가 맞는 상황·목적
[조건]
- 어떤 상황에 이 메뉴가 적합한지 3인칭 정보형 (점심/혼밥/가족 외식/포장 등)
- ❌ "꼭 가보세요" 류 광고 종결 금지 — "~한 자리에 무난한 선택" 톤
- 상황: ${situation || '(일반)'} / 목적: ${purpose || '(일반)'}
- 분량: 180~260자`,

    // ⑧ 매장특징(보조한정)
    storeFeature: `
[섹션 주제] 메뉴 선택을 돕는 매장 정보 (보조)
[조건]
- 위치·좌석·혼밥 가능·단체석·포장 여부 등 '메뉴를 먹으러 갈 때 필요한 정보'까지만
- ⚠ 매장이 주인공이 되면 후기형 회귀 — 어디까지나 메뉴 선택 보조 정보로 한정
- ❌ 매장명 본문 직접 노출 금지 (지역·골목·일대 등 공간 맥락으로)
- 분량: 200~280자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] '${menu}' 메뉴 정보 안내\n- 3인칭 정보형. 1인칭·광고 단정 금지.\n- 분량: 200~300자`;

  return `
${region} ${menu} — 메뉴 정보형 글의 [${section}] 섹션만 작성.

${guide}
${common}

---
이 섹션만 작성. 메뉴 중심 정보형. 1인칭 서사·허위 체험·광고 단정 절대 금지.
딱딱한 논문체도 금지 — 읽기 쉬운 정보 안내체. 문단은 2~4줄로 유지.
`.trim();
}

// ============================================================
// 3. 이미지 ALT 생성 (getImageAlts)
//    맛집 사진 alt — 외관·메뉴판·상차림·음식·장면·마무리
// ============================================================
export function getChickenImageAlts(treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const menu = treatment.menu || treatment.menuRef || '';
  const cat = treatment.cat || 'fried';
  const r = region || '';

  return [
    `${r} ${menu} 가게 외관 사진`,
    `${r} ${menu} 입구·간판`,
    `${r} ${menu} 메뉴판 사진`,
    `${r} ${menu} 상차림 세팅`,
    `${r} ${menu} 반찬 구성`,
    `${r} ${menu} 한 마리 클로즈업`,
    `${r} ${menu} 소스·식감 디테일`,
    `${r} ${menu} 테이블 분위기${situation ? ' (' + situation + ')' : ''}`,
    `${r} ${menu} 식사 중 장면${purpose ? ' · ' + purpose : ''}`,
    `${r} ${menu} 마무리 컷`,
  ].filter(s => s.trim());
}

// ============================================================
// 4. export
// ============================================================
export { getEmotionWaverGuide, getActionDetailGuide, getMealValueGuide, getPhotoHintGuide };
