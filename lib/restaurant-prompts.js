// =============================================
// lib/restaurant-prompts.js
// 맛집 프롬프트 빌더 v1.0 (Phase 9.5 — 1단계 검증)
//
// cafe-prompts.js v1.0 구조 기반 — Phase 9.5 인계메모 v2.0 반영
//
// 핵심 차이점 (cafe → restaurant)
//   1. DIRECTION = data.js의 buildDirection() 동적 생성 (정적 맵 X)
//   2. 섹션 키 6개: visit·arrive·order·taste·scene·revisit
//   3. taste(맛 핵심) + scene(장면 핵심) 2섹션 분리
//   4. 광고/홍보 표현 차단 강화 (Phase 9.5 핵심 — "지역 검색 결과 장악")
//   5. 지역 반복 제한 ("구리" 과밀 차단)
//   6. 사진 유도 문장 자연화 (상차림·국물 클로즈업·창가 등)
//   7. scene 강화: 동행 반응·옆자리·창밖 등 "장면" 묘사
// =============================================

import { buildDirection, MENU_BASE_DIRECTION } from './restaurant-data.js';   // [FIX-B §2] base tasteCore 직접 참조(data 무수정)
// [세션41] Visit Pilot 가이드 공통 Spine 승격 — 로컬 정의 제거, 공통 모듈 import로 전환.
//   로직 100% 무변경(모듈로 이동만). commercial 합성부 호출 시그니처 동일.
import { buildVisitGuide } from './spine/visitGuide.js';

// ============================================================
// 0. DIRECTION 헬퍼 — 데이터 조합으로 동적 생성
// ============================================================
export function getRestaurantDirection(treatment, situation, purpose) {
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

[★ s73 축B — 문단·문장 '해설 종결' 금지 (관측 실측: 남은 최상위 병목)]
문단이나 문장을 아래 '평가·논평'으로 닫지 말 것. 실제 후기는 해설로 끝맺지 않고 '행동'으로 끝난다.
❌ 금지 종결(평가·논평·완성 선언):
  "좋은 선택이 될 수 있습니다" / "좋은 선택입니다" / "무난한 선택이 될 것입니다"
  "적합한 장소입니다" / "적합합니다" / "어울리는 자리입니다" / "제격입니다"
  "즐길 수 있습니다" / "만족스러운 한 끼가 됩니다" / "풍성한 한 끼가 완성됩니다"
  "좋은 마무리 방법입니다" / "더욱 빛을 발합니다" / "가치를 더해줍니다"
  "대화가 활기를 띠게 될 것입니다" / "시간이 더 여유로워집니다" / "즐거운 시간을 완성합니다"
  → 공통 특징: 상황을 겪지 않고 '이건 ~이다'라고 논평·요약·완성 선언하는 문장.
⭕ 대체 — 같은 자리를 '눈에 보이는 행동' 한 컷으로 닫는다:
  "잔부터 다시 채운다" / "물 한 컵 먼저 마신다" / "앞접시에 뼈가 금방 쌓인다"
  "휴지 한 장 더 꺼낸다" / "콩나물부터 집어 먹는다" / "남은 양념을 긁어 볶음밥을 비빈다"
  → 문장 끝을 '~좋다/~적합하다/~완성된다'가 아니라 '누군가 지금 하는 동작'으로 맺는다.

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
// 0-1b. [STEP6-FIX-B §1·§3] commercial 전용 — 사실 경계 + 문체 가이드
//   FACT_BOUNDARY: 최상위 원칙. 열거형 금지 목록(D1)이 아닌 일반 원칙형.
//     G(generateRestaurant) systemPrompt에서도 import해 사용(중복 정의 금지).
//   getCommercialStyleGuide: getAiSmellGuide에서 AI 표현·광고 패턴 금지만 이관.
//     personal 후기 전제 블록(1인칭 대체 예시·행동 종결 강제·본인 경험·공간 치환·구체 수치화)은 제외.
// ============================================================
// [FIX-C 보충 R3] 주차 정보가 실제 제공된 경우(providedChecks에 '주차')에만 '주차 방문 전 확인' 권고 제거.
//   인자 없음/빈 배열 = 기존 FACT_BOUNDARY 텍스트와 동일. FACT_BOUNDARY const export는 호환용으로 유지.
export function getFactBoundary(providedChecks = []) {
  const _parking = Array.isArray(providedChecks) && providedChecks.includes('주차');
  return `
[★★★ 사실 경계 — 최상위 규칙 · 모든 규칙보다 우선 · 위반 시 전면 실패]
- 이 글이 아는 것은 두 가지뿐이다: ① 메뉴의 일반적인 특성(참고 값) ② 검색자의 상황.
- 특정 매장에 대해서는 아무것도 모른다. (주소·교통·주차 안내는 시스템이 글 끝에 따로 붙인다)
- 그러므로 특정 매장(매장·이곳·이 집·여기·이 동네 가게)을 주어나 출처로 삼는 서술을 하지 않는다.
  무엇이 있다·없다·나온다·제공된다·준비돼 있다·많이 찾는다·대표 메뉴다·분위기가 어떻다·어디에 자리한다 — 모두 해당.
- 일어난 일을 서술하지 않는다. 누가 먹었다·평가했다·다시 오고 싶었다는 유형의 문장을 쓰지 않는다.
  현재형 일반형은 두 가지에만 쓴다: 먹는 방식("보통 ~해서 먹습니다") / 판단 문장("~라면 ~를 따져 보게 됩니다").
- [FIX-C] 아래 네 유형은 문장의 주어가 무엇이든(메뉴·사람·매장·생략) 매장의 사실로 본다. 일반형으로 바꿔 써도 금지:
  ⓐ 함께 나오는 것·포함된 것 (곁들임·구성 요소가 기본으로·함께·포함돼 나온다 — 품목명을 들지 않는다)
  ⓑ 언제·얼마나 오는지 (몇 시부터·늦게까지 먹을 수 있다·붐빈다·찾는 사람이 많다·줄을 선다)
  ⓒ 먹고 난 뒤 (빠르게 비운다·다 먹고 일어선다·든든히 채웠다)
  ⓓ 자리 (좌석 형태·자리 여유·회전)
- [FIX-C] 참고 값이 주어지지 않은 항목(양·식사 성격·시간대·동행)은 모르는 것이다. 추정해 채우지 않는다 — 맞다/안 맞다·있다/없다 모두 쓰지 않는다.
- 참고 값은 메뉴의 일반 특성이다. 매장의 사실로 옮기지 않는다.
  ❌ 제공 사실형(매장이 무엇을 준다·함께 나온다) · ❌ 조리 행위형(매장이 어떻게 조리한다) → ⭕ 메뉴 일반 속성 서술형
- 지역과 빈도·인기를 묶지 않는다. ❌ 지역-빈도 결합형(특정 지역에서 많이 찾는다)
${_parking
  ? `- 매장마다 다를 수 있는 것(좌석·포장·예약·웨이팅·영업시간·가격·반찬 구성)은 "방문 전 확인"으로만 쓴다.
- 주차는 글 끝 운영정보 안내에 따로 붙는다. 주차 여부를 정하지도, 방문 전 확인을 권하지도 않는다.`
  : `- 매장마다 다를 수 있는 것(좌석·주차·포장·예약·웨이팅·영업시간·가격·반찬 구성)은 "방문 전 확인"으로만 쓴다.`}
- 판별 질문: "이 문장이 다른 동네의 다른 가게에도 그대로 참인가?" → 아니면 쓰지 않는다.`;
}
export const FACT_BOUNDARY = getFactBoundary();

function getCommercialStyleGuide() {
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

[평가·완성 선언 종결 금지 ★ FIX-B]
→ 평가 단정형·완성 선언형·감상 종결형으로 문장을 맺지 않는다(평가 종결 계열 전부 해당).
→ 문장은 검색자가 판단할 수 있는 정보(조건·기준·확인할 것)로 맺는다. 가상의 손님 동작·감상으로 맺지 않는다.`;
}

// ============================================================
// 0-2. 키워드 밀도 + 지역 반복 제한 (★ "구리" 과밀 차단)
// ============================================================
// [STEP6-FIX-B §1] mode 인자 추가 (기본값 personal → personal 출력 불변).
//   commercial: 매장 지칭 대체어(이 가게/여기/이 집)·"여기 대표 메뉴"·"유명한" 예시 제외, 공간 지칭 치환 지시 제거.
function getKwDensityGuide(genericName, region, menu, mode = 'personal') {
  const C = mode === 'commercial';
  return `
${C
  ? `[매장 지칭 금지 ★ FIX-B] "${genericName}"·"이 가게"·"여기"·"이 집"·"이곳" 같은 매장 지칭어를 쓰지 않는다 — 이 글은 특정 매장을 모른다.`
  : `[키워드 밀도] "${genericName}" 표기는 섹션당 최대 2~3회.
나머지는 "이 가게", "여기", "이 집"으로 대체. 5회 이상 반복 금지.`}

[지역명+메뉴 결합 ★★ Phase 9.5 이슈 #2 — 처음부터 자연 치환 권장]
"${region}" 단독 표기는 섹션당 최대 1~2회.
"${region} ${menu}" 결합 표현은 글 전체 1~2회로 자연스럽게 등장하면 ${C ? '된다' : '충분'}.
${C
  ? `  · 도입부에 검색 의도 1회면 된다. 이후는 지역명을 빼고 쓴다(골목·일대·동네 묘사로 채우지 말 것).`
  : `  · 도입부에 검색 의도 충족용 1회면 충분. 이후는 자연스러운 공간 지칭으로 치환.
  · 치환은 한 어휘에 고정하지 말고 글 안에서 다양하게 분산. 같은 어휘 3회 이상 금지.`}
  · 결합 3회 이상은 자동 차단됨 — 1~2회 안에서 끝내는 것이 자연스러움

[메뉴명 반복 제한 ★ Phase 9.5 v4]
"${menu}" 직접 표기 섹션당 최대 3회.
${C
  ? `나머지는 문장 구조를 바꿔 생략한다 — 다른 명사구로 바꿔 쓰지 않는다. ("대표 메뉴" 등 매장 메뉴 구성을 암시하는 표현 금지)`
  : `나머지는 "이 한 그릇", "국밥 한 그릇", "여기 대표 메뉴" 같은 자연스러운 명사구로 대체.`}
★ "이 메뉴", "${menu} 메뉴", "${menu}+조사+메뉴" 형태 절대 금지
   ❌ "${menu}이 메뉴를", "${menu} 메뉴가", "${menu}이 메뉴의"
   → 메뉴명 뒤에 "메뉴"라는 단어를 절대 붙이지 않을 것
   → "메뉴"는 "메뉴판"에서만 사용 (메뉴판 보면서, 메뉴판 한 장 찍음)
★★ [조사 결합 버그 금지 — 최우선] "이 메뉴는/이 메뉴" 뒤에 조사를 붙이지 말 것.
   ❌ "이 메뉴는으로", "이 메뉴으로", "${menu}은으로", "이 메뉴이면" (이중조사·비문)
   → 대체어를 쓸 땐 조사까지 자연스럽게: ${C ? `대체어를 만들지 않는다 — 조사가 어색하면 "${menu}"를 그대로 쓴다.` : `"이 한 그릇으로", "한 그릇이면", "여기서" 처럼 완결된 형태로만.`}
   → 대체어가 조사와 어색하면 차라리 "${menu}"를 그대로 쓴다(3회 제한보다 조사 정합이 우선).
${C ? '' : `
[조사 오류 금지 ★★ Phase 9.5 이슈 #1]
"${genericName}" 뒤 조사 직접 연결 시:
  ❌ "${genericName}을" → ✅ "이 가게를"
  ❌ "${genericName}는" → ✅ "여기는"
`}
메뉴명("${menu}") + 조사 사용 시 문장이 끊기지 않게 자연스럽게:
  ✅ ${C ? `"${menu}을/를 먹으러"` : `"${menu}을/를 먹으러", "${menu} 한 그릇", "${menu}이 유명한"`}
  ❌ 메뉴명 뒤에 장소명사(동네/일대/집/골목/상권 등) 직결 금지 — 문장 끊김
  → ${C ? '장소를 지칭하지 않는다 — 메뉴명만 쓴다' : '장소를 지칭할 때는 메뉴명을 빼고 공간 지시어로 자연스럽게'}
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
// 0-9. [VISIT PILOT] 방문정보 활용 가이드 빌더
//   ★ [세션41] 이 함수는 lib/spine/visitGuide.js 로 승격 이동됨 (전 외식업 공통 Spine).
//     restaurant-prompts.js는 상단에서 import { buildVisitGuide } 로 사용. 로직·시그니처 무변경.
//     승격 사유: 실사용 엔진(korean/western/...)이 generateRestaurant를 타지 않음(restaurant=레거시)을
//               세션41 실측 확인 → 엔진별 재구현 대신 공통화. A~D 원칙 정의는 spine 모듈 주석 참조.
// ============================================================

// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildRestaurantPrompt(section, treatment, region, options = {}) {
  const { mode = 'personal', situation = '', purpose = '' } = options;
  if (mode === 'commercial') {
    return buildCommercialRestaurantPrompt(section, treatment, region, options);
  }
  return buildPersonalRestaurantPrompt(section, treatment, region, options);
}

// ── personal 모드 ──
function buildPersonalRestaurantPrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const {
    name,
    cat = '한식',
    menu = treatment.menuRef || '',
    compareWith = '',
    nearbyHint = '',
  } = treatment;

  // 하이브리드 DIRECTION (BASE_MENU + SITUATION + PURPOSE merge)
  const direction = getRestaurantDirection(treatment, situation, purpose);
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
    default: throw new Error(`[restaurant-prompts] 알 수 없는 섹션: ${section}`);
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
- 어떤 상황·목적에 다시 오겠다는지 구체적으로 1~2개 (${situation || '해장'}/${purpose || '모임'}/가족모임 등)
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
// 1-b. [STEP6-FIX-C 축1·축2] DATA → FACT projection (C1-b) — commercial 전용
//   · 원문 미주입. 허용 의미 범주의 라벨만 주입. 범주 밖/결손 = UNKNOWN('') → 해당 줄 생략.
//   · 분류기 = 범주 판정기(금지 목록 아님). 입력 = MENU_BASE_DIRECTION 원값만.
//     [J1·J2] PURPOSE_OVERRIDES의 bestCompanion·visitTiming은 FACT를 덮어쓰지 못함(목적 = 상황 프레이밍).
//     [J3] sharingFeel·usageType·sidedishes = commercial FACT 입력 제외. [J4] 수동 예외값 없음.
//   · soloFit ∈ {yes, no, unknown}. unknown(bestCompanion 결손) ≠ no.
//   · data 무수정. personal 경로 미참조.
// ============================================================
const _isFilledVal = (v) => v != null && String(v).trim() !== '' && !['-', '없음', '미정'].includes(String(v).trim());

// [STEP6-FIX-F B] 결론문형 라벨 폐기 → '축명: 값'. 문장이 아니므로 본문에 그대로 옮기면 비문이 된다(이식 차단).
//   [FIX-F B-2] 시간대 라벨에서 '해장' 제거 — 해장은 시간 정보가 아니라 효능이며 의미 확장의 출발점이 된다.
const FACT_PORTION = { solo: '양: 1인', shared: '양: 다인' };
const FACT_PACE    = { quick: '식사 성격: 빠름', slow: '식사 성격: 느림', long: '식사 성격: 체류 김' };
const FACT_TIMING  = { meal: '시간대: 끼니 전반', morning: '시간대: 아침', evening: '시간대: 저녁' };
// [STEP6-FIX-E C-1] 동행 = 원문 미주입. projection 라벨만 주입한다(soloFit 판정은 원값 기준 — 무변경).
const FACT_COMPANION = { solo: '동행: 1인', pair: '동행: 2인 이상', group: '동행: 다인' };
// [STEP6-FIX-E LOCAL-FIX-01 B] tasteCore 원문 미주입 — 맛·식감 축의 허용 범주 라벨만 주입.
//   범주 판정기(금지 목록 아님). 출력은 아래 상수뿐이므로 곁들임 품목·제공 사실·조리 품질 단정은 통과할 수 없다.
const FACT_TASTE = {
  brothRich: '맛: 진한국물', brothClear: '맛: 맑은국물', spicy: '맛: 매콤', mild: '맛: 담백',
  chewy: '식감: 쫄깃', tender: '식감: 부드러움', crisp: '식감: 바삭', savory: '맛: 고소',
};
// [STEP6-FIX-D A3] C1-b 라벨 문형 제한 — 라벨은 판단 근거로만. 조리·제공·방문량 사실 서술로 전환 금지.
const FACT_LABEL_FORM = `  ⚠ 위는 축의 값이다. 문장으로 옮길 때 값에 없는 것을 덧붙이지 않는다.
    ❌ 조리·제공·방문량 사실로 바꿔 쓰지 않는다("~로 나온다 / 준비된다 / 제공된다 / 대기 없이 / 많이 찾는다" 유형).`;
// [STEP6-FIX-D B3-2] commercial 문체 단일 규칙 — P commercial common · G commercial systemPrompt 공유(단일 정의).
export const COMMERCIAL_TONE = `
[문체 — 단일 규칙 ★★ 위반 시 실패]
- 모든 서술 문장은 정보·판단형 합니다체로 끝낸다: "~입니다" / "~합니다" / "~됩니다" / "~습니다".
- ❌ 한다체("~다.")·해요체("~요.")를 섞지 않는다. 한 섹션 안에서도, 섹션 사이에서도 같다.
- 질문형은 글을 여는 첫 문단(menuIntro)에서만 "~신가요?" 형태로 허용한다.
- 아래 지시문 안의 예시가 다른 종결로 보이더라도 출력은 합니다체로 맞춘다.`;

function _projectPortion(s) {
  if (!_isFilledVal(s)) return '';
  if (/접시 단위|냄비|여럿이|나눠|인원 맞춰|둘이 한 접시|2~4인|3~4인/.test(s)) return FACT_PORTION.shared;
  if (/1인분|한 그릇|한 끼/.test(s)) return FACT_PORTION.solo;
  return '';
}
function _projectPace(raw) {
  if (!_isFilledVal(raw)) return '';
  // [STEP6-FIX-F D] 부정·비교절 오판 차단 — data의 paceFeel은 '주절 — 부연·비교절' 구조이고
  //   부정·비교는 전부 구분자 뒤에 있다("… — 오래 앉기보다 회전 빠른 메뉴"). 선행절만 판정한다.
  //   교정 대상 2건(순대국·짜장면) 외 69메뉴 라벨 불변.
  const s = String(raw).split(/[\u2014\u2013-]/)[0];
  if (/자리 오래|오래 앉|오래 가져|두고 오래/.test(s)) return FACT_PACE.long;
  if (/빠르게|후루룩|회전 빠른/.test(s)) return FACT_PACE.quick;
  if (/천천히/.test(s)) return FACT_PACE.slow;
  return '';
}
function _projectTiming(visitTiming, timeOfDay) {
  if (_isFilledVal(visitTiming)) {
    const t = String(visitTiming);
    const lead = t.split(',')[0];
    if (/아침.*부터.*까지|폭넓|시간 구애/.test(t)) return FACT_TIMING.meal;
    if (/아침|해장|오전/.test(lead)) return FACT_TIMING.morning;
    if (/늦은 밤|밤|한잔|한 잔|술자리|야식|안주/.test(t)) return FACT_TIMING.evening;
    if (/끼니|점심|저녁|식사/.test(t)) return FACT_TIMING.meal;
    if (/아침|해장/.test(t)) return FACT_TIMING.morning;
    return '';
  }
  const a = Array.isArray(timeOfDay) ? timeOfDay : [];
  if (!a.length) return '';
  const has = (x) => a.includes(x);
  if (!has('점심') && !has('아침') && a.some((x) => /밤|야식/.test(x))) return FACT_TIMING.evening;
  if (has('아침') && !has('점심') && !has('저녁')) return FACT_TIMING.morning;
  return FACT_TIMING.meal;
}
// [STEP6-FIX-E C-1] 동행 원값 → 라벨 3값. 분류 불가 = '' (UNKNOWN → 주입 생략).
function _projectCompanion(s) {
  if (!_isFilledVal(s)) return '';
  if (/혼자|1인|혼밥/.test(s)) return FACT_COMPANION.solo;
  if (/2~4인|2~3인|둘/.test(s)) return FACT_COMPANION.pair;
  if (/여럿|여러|단체|모임|회식|3~4인|3인|4인|가족/.test(s)) return FACT_COMPANION.group;
  if (/연인|친구|일행|동료/.test(s)) return FACT_COMPANION.pair;
  return '';
}

// [STEP6-FIX-E U-1·U-2] 자료 축 계약 — commercial 전용. UNKNOWN 축은 판정뿐 아니라 생성 자체를 막는다.
function getAxisContract(F, opts = {}) {
  const known = [], unknown = [];
  (F.portion ? known : unknown).push('양');
  (F.pace ? known : unknown).push('식사 성격');
  (F.timing ? known : unknown).push('시간대');
  (F.companionLabel ? known : unknown).push('동행');
  (opts.taste ? known : unknown).push('맛·식감');
  // commercial FACT 입력 제외(J3) + [FIX-F C-2] 먹는 방식·조리는 data 근거가 없다 → 상시 UNKNOWN
  unknown.push('곁들임·소스·사이드·추가 구성', '좌석·시설', '먹는 방식', '조리');
  return `
[★★★ 자료 축 계약 — 사실 경계와 같은 최상위 · 위반 시 전면 실패]
- 자료 있는 축: ${known.join(' · ') || '(없음)'}
- 자료 없는 축: ${unknown.join(' · ')}

■ 자료 없는 축 — 있다고도, 없다고도 말하지 않는다
  ① 품목명 ② 수량·인분·가짓수 ③ 제공·구성 사실 ④ 고객의 행동 ⑤ 먹는 방식
  ⑥ 그 축을 전제한 조건절 ⑦ 그 축의 부재 단정(없다·필요 없다·않아도 된다·따로 ~하지 않는다)
  - 완곡어·일반론·"보통 ~합니다"로 돌려 쓰는 것도 같은 위반이다. 판단 흐름에서 아예 뺀다.

■ 자료 있는 축 — 주어진 값만 말한다
  ⑧ 인과 금지 — 축 값을 원인·이유·결과로 잇지 않는다(덕분에·때문에·므로 유형)
  ⑨ 효능·신체 작용 금지 — 몸·속·피로·기분에 미치는 작용을 말하지 않는다
  ⑩ 감정 금지 — 먹는 사람의 기분·심리 상태를 말하지 않는다
  ⑪ 행동 제안 금지 — 어떻게·어디서·언제 먹으라고 말하지 않는다
  ⑫ 충족 결론 금지 — 배를 채웠는지·해결됐는지를 판정하지 않는다
  ⑬ 추가 주문 판단 금지 — 더 시켜야 한다/그럴 것 없다 어느 쪽도 말하지 않는다
  ⑭ 축 결합 금지 — 두 축을 묶어 제3의 판단을 만들지 않는다. 각 축은 따로 쓴다.
  - 값은 '축: 값' 형태로 주어진다. 문장으로 옮길 때 값에 없는 것을 덧붙이지 않는다.`;
}

// [STEP6-FIX-F E] 제목 토큰 축 검증 — data 무수정, 소비측 게이트.
//   토큰을 기존 축 판정기에 통과시켜 '어느 축의 어떤 값'인지 태깅하고, 그 메뉴의 축 상태와 대조한다.
//   ★ 축으로 해석되지 않는 토큰은 안전을 증명할 수 없으므로 사용하지 않는다(미매칭 = 통과가 아니다).
const _TITLE_FACILITY = /포장|주차|좌석|단체|예약/;      // 시설 축 = commercial 상시 UNKNOWN
const _TITLE_EFFICACY = /해장|속풀이|보양|원기|기력/;    // 효능 축 = 축 목록에 없음(상시 UNKNOWN)
//   토큰에서 축 판정에 쓰인 부분을 지우고 남는 어절이 전부 기능어여야 한다.
//   축 값 외의 의미(충족·평가·상태)가 붙어 있으면 그 의미는 증명할 수 없으므로 배제한다.
const _AXIS_KEYS = /(혼자|1인분|1인|혼밥|2~4인|2~3인|여럿|여러|단체|모임|회식|3~4인|3인|4인|가족|연인|친구|일행|동료|접시 단위|냄비|나눠|인원 맞춰|한 그릇|한 끼|자리 오래|오래 앉|오래 가져|두고 오래|빠르게|후루룩|회전 빠른|천천히|아침|오전|늦은 밤|밤|한잔|한 잔|술자리|야식|안주|끼니|점심|저녁|식사|진한 국물|진한 육수|깊은 국물|맑은 국물|시원한 국물|얼큰|매콤|칼칼|매운맛|담백|쫄깃|쫀득|부드럽|부드러운|야들|바삭|고소|둘)/g;
const _TITLE_FUNC = /^(하기|먹기|먹는|가기|오기|즐기기|좋은|편한|한|인|의|에|로|용|자리|때|하는|있는)$/;
function _titleResidualOk(t) {
  const rest = String(t).replace(_AXIS_KEYS, ' ').replace(/[·,]/g, ' ').split(/\s+/).filter(Boolean);
  return rest.every((w) => _TITLE_FUNC.test(w));
}
export function verifyTitleToken(token, menu) {
  if (!_isFilledVal(token)) return false;
  const t = String(token);
  if (_TITLE_FACILITY.test(t) || _TITLE_EFFICACY.test(t)) return false;
  if (!_titleResidualOk(t)) return false;                 // 축 값 외 의미 잔존 → 증명 불가 → 미사용
  const F = _commercialFacts(menu);
  const pairs = [
    [_projectCompanion(t), F.companionLabel],
    [_projectPortion(t),   F.portion],
    [_projectPace(t),      F.pace],
    [_projectTiming(t, null), F.timing],
    [_projectTaste(t),     F.taste],
  ];
  let matched = false;
  for (const [tokenVal, factVal] of pairs) {
    if (!tokenVal) continue;
    matched = true;
    if (!factVal) return false;                           // 축이 UNKNOWN → 배제
    const ok = String(tokenVal).split(' · ').every((v) => String(factVal).includes(v));
    if (!ok) return false;                                // 축 모순 → 배제
  }
  return matched;                                         // 축 미매칭 → 사용하지 않음
}

// [LOCAL-FIX-01 B] 최대 2개 라벨. 미매칭 = '' (UNKNOWN → 맛 결 축 미주입).
function _projectTaste(s) {
  if (!_isFilledVal(s)) return '';
  const out = [];
  const add = (k) => { if (out.length < 2 && !out.includes(FACT_TASTE[k])) out.push(FACT_TASTE[k]); };
  if (/진한 국물|진한 육수|깊은 국물|육수가 진|국물이 진/.test(s)) add('brothRich');
  if (/맑은 국물|맑고|시원한 국물/.test(s)) add('brothClear');
  if (/얼큰|매콤|칼칼|매운맛/.test(s)) add('spicy');
  if (/담백/.test(s)) add('mild');
  if (/쫄깃|쫀득/.test(s)) add('chewy');
  if (/부드럽|부드러운|야들/.test(s)) add('tender');
  if (/바삭/.test(s)) add('crisp');
  if (/고소/.test(s)) add('savory');
  return out.join(' · ');
}

function _commercialFacts(menu, direction = {}) {
  const b = MENU_BASE_DIRECTION[menu] || {};
  const companion = _isFilledVal(b.bestCompanion) ? String(b.bestCompanion).trim() : '';
  const pc = _isFilledVal(direction.bestCompanion) ? String(direction.bestCompanion).trim() : '';
  return {
    portion: _projectPortion(b.portionFeel),
    taste: _projectTaste(b.tasteCore),                    // [FIX-F E] 제목 축 검증에서도 사용
    pace: _projectPace(b.paceFeel),
    timing: _projectTiming(b.visitTiming, b.timeOfDay),
    companion,
    companionLabel: _projectCompanion(b.bestCompanion),   // [FIX-E C-1] 주입용 라벨
    soloFit: !companion ? 'unknown' : (/혼자|1인|혼밥/.test(companion) ? 'yes' : 'no'),   // [FIX-E C-3] 판정 로직 무변경
    purposeCompanion: pc && pc !== companion ? pc : '',   // [J1] 목적의 동행 = 프레이밍 전용
  };
}

// [FIX-B §4] 독자 판단 흐름 — 섹션별 '판단 단계' 고정
// [STEP6-FIX-D B1] 값의 예) 인용문 제거 — 첫 문장 템플릿 복사(엔진 fingerprint) 차단. 역할만 전달.  ([FIX-C] getOpeningRule 공유를 위해 모듈 상수로 이동 · 값 무변경)
const COMMERCIAL_OPEN_SECTIONS = ['menuIntro'];   // 글을 여는 섹션(여기만 검색자 상황을 새로 도입)
const READER_FLOW = {
  menuIntro:          '검색자 상황 공감',
  menuScene:          '상황–메뉴 정합 근거',
  menuComposition:    '주문 판단 축',
  tasteFeature:       '주문 방식',
  pairing:            '주문 범위 판단',
  decision:           '맞는 경우·다른 선택 구분',
  recommendSituation: '이용 판단(시간대·식사 성격)',
  storeFeature:       '방문 전 확인 항목',
};
function _readerFlow(section, F) {
  // [FIX-C 축2] 시간대·페이스 모두 UNKNOWN이면 ⑦의 '언제·어떤 페이스' 단계를 전제하지 않는다
  if (section === 'recommendSituation' && !F.timing && !F.pace) {
    return '이용 판단(시간대·식사 성격 전제 없음)';
  }
  return READER_FLOW[section] || '이어받는 다음 판단';
}

// [FIX-C 축3] 첫 문장 규칙(openingLock) 추출 — buildCommercialRestaurantPrompt와 G 재생성 보강문이 공유.
export function getOpeningRule(section, treatment, options = {}) {
  const { situation = '', purpose = '' } = options;
  if (!treatment) return '';
  const { menu = treatment.menuRef || '' } = treatment;
  const direction = getRestaurantDirection(treatment, situation, purpose);
  const unit = direction.servingUnit || '한 그릇';
  const purposeFrame = direction.purposeFrame || '';
  const F = _commercialFacts(menu, direction);
  const isOpenSection = COMMERCIAL_OPEN_SECTIONS.includes(section);
  const _flow = _readerFlow(section, F);
  // [STEP6-FIX-E X-1·C-1] 완성 예문 제거 — 동행 축의 허용 범위만 라벨로 전달
  const companionOpeners = F.companionLabel ? `동행 축 허용 범위: 「${F.companionLabel}」` : '';
  const timingRule = F.timing ? `
- ★★ 시간대(끼니·때)를 언급해 열 경우, 반드시 이 메뉴를 떠올리는 때의 성격 안에서만 연다:
  → 이 메뉴를 떠올리는 때의 성격(일반론 — 매장 영업시간 아님): 「${F.timing}」
  · ❌ 위 시간대와 어긋나는 시간 표현으로 시작 금지 — 특히 저녁·밤·심야 메뉴에 "점심시간에는 …" / "아침에 …" 금지.
  · 시간대를 콕 집기 애매하면 시간 표현을 빼고 동행·목적으로 연다(억지 시간대 삽입 금지).` : `
- ★★ 이 메뉴의 시간대 자료가 없다 → 첫 문장을 시간대(아침·점심·저녁·밤·끼니 때)로 열지 않는다. ${companionOpeners ? '동행·목적' : '목적'}으로만 연다.`;

  return isOpenSection ? `
[★★★ 첫 문장 강제 — 최우선·위반 시 실패]
- 이 섹션의 첫 문장은 반드시 '사람의 상황'으로 시작한다. 아래 유형 중 하나로 연다:
  · 구조: [검색자의 조건·상황] + [그 상황에서 무엇을 정하려 하는지]. 완성 예문은 주지 않는다 — 이 구조로 직접 만든다.
${companionOpeners ? `  · ${companionOpeners} — 이 범위 밖의 동행으로 열지 않는다.\n` : `  · 동행 자료 없음 — 동행을 전제한 조건절로 열지 않는다.\n`}  · 목적 축: 검색자가 고른 목적 안에서만.${timingRule}
- ❌ 절대 금지 시작(유형): 메뉴명 주어 · 재료명 주어 · 매장 주어 · 메뉴 계열 정의형
- 재료·조리·맛·곁들임은 문장 뒤쪽에서 '그 상황을 왜 푸는지'의 근거로만.` : `
[★★★ 첫 문장 — 앞 섹션의 판단을 이어받기 · 위반 시 실패]
- 이 섹션은 새 글을 시작하지 않는다. 앞 섹션까지 정리된 검색자의 상황(${purposeFrame || '검색자의 상황'})을 전제로, 이 섹션의 판단만 쓴다. 앞 내용 요약·다음 내용 예고를 하지 않는다.
- ★ 이 섹션이 다룰 판단: ${_flow} — 이 문구를 첫 문장으로 옮기지 않는다.  [FIX-D B1]
- 동행·상황을 매 섹션 다시 소개하지 않는다("혼자라면 …"으로 다시 열기 금지).
- ❌ 가상의 방문 장면(착석·메뉴판·주문·식사 경과·마무리)으로 열기 금지.
- ❌ 메뉴명·재료명·매장 주어로 시작 금지.
- ❌ 다른 섹션과 같은 여는 표현 재사용 금지.
- 아래 [조건]의 예) 문장은 본문 중간 참고용이다. 첫 문장으로 쓰지 않는다.  [FIX-D B1]`;
}

// ============================================================
// 2. commercial 모드 (협찬·정보형 — 표시광고법)
// ============================================================
// ── commercial 모드 [STEP6-FIX-B B-2 / 2026-09-15] 독자 판단 흐름 8섹션 ──
//   최상위 원칙(FACT_BOUNDARY): 업체가 입력하지 않은 정보는 특정 매장의 사실·경험으로 서술하지 않는다.
//   구조 변경: '한 손님의 가상 방문 장면(입장→주문→식사→마무리)' → '검색자의 판단 흐름'.
//     - 섹션 key 8개·순서 무변경 (playConfig·ALT·isDictionaryOpening 정합 유지)
//     - 제거: EMOTION_SLOT(봉우리·감탄) / _TASTE_MOMENTS(지각 순간) / _OUTCOME_EVENTS(서비스 전제 결과)
//             / ACTION_SLOT(손님 동작 연출) / 비오픈 섹션 '같은 손님 방문 이어가기'
//     - 유지: 사람 주어·재료 나열 금지·동행 결(companionLock)·visitTiming 게이트·D2
//     - _EAT_ACTIONS는 '먹는 방식(메뉴 일반·현재형)' 참고로만 사용
//   personal 모드(buildPersonalRestaurantPrompt)는 무변경.
//   섹션 key(8): menuIntro(상황공감)·menuScene(맞는 이유)·menuComposition(판단 기준)·tasteFeature(주문 방식)
//                ·pairing(곁들임 판단)·decision(맞는 경우★)·recommendSituation(이용 팁)·storeFeature(확인 항목)
function buildCommercialRestaurantPrompt(section, treatment, region, options = {}) {
  const { situation = '', purpose = '' } = options;
  const { name, cat = '한식', menu = treatment.menuRef || '' } = treatment;
  const direction = getRestaurantDirection(treatment, situation, purpose);
  const genericName = direction.genericName || name || '이 식당';
  const unit = direction.servingUnit || '한 그릇';        // ★ 메뉴별 단위 (수육=한 접시 등)
  // [FIX-B §2] 맛 결은 메뉴 base 값만 사용 — 상황 보정(tasteExtra: 1인칭 체험문) 합성분 배제.
  //   data 무수정. buildDirection 합성 결과 대신 MENU_BASE_DIRECTION 원값을 직접 참조.
  const _baseDir = MENU_BASE_DIRECTION[menu] || {};
  const tasteRef = _projectTaste(_baseDir.tasteCore);   // [LOCAL-FIX-01 B] 원문 미주입 — projection 라벨만
  // ★ v3 방문목적 우선 필드 (PURPOSE→SITUATION→MENU 합성 결과)
  const purposeFrame = direction.purposeFrame || '';
  // [FIX-C 보충 R1] PURPOSE는 상황 프레이밍(purposeFrame) 전용.
  // [STEP6-FIX-D A1] base decisionPoint·recommendSituation 원문도 commercial 미주입(C1-b 라벨만).
  //   restaurant-data 원문의 commercial 재주입 금지 — 보강이 필요하면 projection 라벨로.
  // ★ [FIX-C 축1·J1·J2·J3] 판단 재료 = MENU_BASE_DIRECTION 원값의 projection 라벨만 (원문·PURPOSE 덮어쓰기 미주입)
  //   sharingFeel·usageType·sidedishes: commercial FACT 입력 제외. '' = UNKNOWN → 해당 줄 생략(J5).
  const _F = _commercialFacts(menu, direction);
  const portionFeel = _F.portion;
  const paceFeel = _F.pace;
  const visitTiming = _F.timing;
  const bestCompanion = _F.companionLabel;     // [FIX-E C-1] 원문 미주입 — projection 라벨만
  const _soloFit = _F.soloFit;                 // 'yes' | 'no' | 'unknown'
  const _sf = (y, n, u) => (_soloFit === 'yes' ? y : _soloFit === 'no' ? n : u);
  // [FIX-C 축5 A안] 하단 운영정보 블록에 실제 값이 있는 항목명(G 계산). 값은 받지 않는다.
  const _provided = Array.isArray(options.providedChecks) ? options.providedChecks.filter(Boolean) : [];
  const _parkingProvided = _provided.includes('주차');

  // 정보형 화법 규칙 (모든 commercial 섹션 공통) — 사실 경계는 FACT_BOUNDARY가 최상위
  const infoFrameGuide = `
[화법 — 최상위 규칙 ★★ 위반 시 전면 실패]
- ★★★ 주인공은 '${menu}'(메뉴)가 아니라 '검색자의 상황·목적'이다.
  사람은 재료가 궁금해서가 아니라 자기 상황(끼니·자리·목적)을 해결하려고 검색한다.
  → 모든 문단을 '${menu}는 ~다'(메뉴 주어)가 아니라 '~한 상황이면 ~를 해결한다'(사람 주어)로 연다.
  → 메뉴 설명(재료·국물·식감)은 "이 상황에 왜 맞는가"의 근거로만 등장. 설명 자체가 목적이 되면 실패.
  → 사전식 정의("${menu}는 ~로 만든 음식으로 ~가 특징") 절대 금지. 사람의 하루·끼니에서 출발.
- 매장 방문기·후기 아님(3인칭 정보형). 가상의 방문 장면(자리에 앉는다·음식이 나온다·다 먹고 일어선다)을 만들지 않는다.
- ❌ 1인칭 절대 금지: "저는/제가/우리는", "갔다/다녀왔다/먹어봤다/주문했다"
- ❌ 허위 체험 금지: "오늘 갔더니", "줄 서서 기다렸다", "사장님이 추천", "40분 웨이팅"
- ❌ 광고 단정 금지: "최고", "원조", "찐맛집", "꼭 드세요", "인생 메뉴"
- ❌ 맛 평가 단정형 금지
- ❌ [v3] 결론 단정형 금지: 양 축 결론 · 가격 평가 · 신체 상태 결론 · 재방문 유도 · 추천
  → 대신 판단 재료로: ${portionFeel ? `${portionFeel} — 이 값만` : '양 자료 없음 — 양 축 서술 금지(수량·인분·분배 표현 포함)'}${bestCompanion ? ` / ${bestCompanion} — 이 값만` : ' / 동행 자료 없음 — 동행 전제 금지'}
  → 결론·재방문·추천은 AI가 단정하지 말고, 독자가 스스로 결론 내리도록 정보만 제공
- ❌ 어색한 결합 금지: "${menu} 음식"(→"${menu}"·"${menu} ${unit}"), "${menu} 지역"(→"${menu} 전문점")
- ❌ 지역명(${region}) 반복 금지: 글 전체 3회 이하. 매 문단 첫머리에 지역명 반복하지 말 것
- ★ '${menu}'의 단위는 "${unit}". "${menu} ${unit}"로 표기. 다른 단위(없는 그릇/접시) 임의 사용 금지.
- ★ [FIX-D B5] 메뉴 일반 맛 결은 해당 섹션에서만 참고값으로 주어진다. 주어지지 않은 섹션에서는 재료·양념을 새로 꺼내지 않는다.
  ⚠ 참고 값에 조리 품질 단정·결점 부재 단정 유형이 섞여 있어도 그대로 옮기지 말 것
    → 단정 부분은 버리고, 검색자의 판단 문장("~라면 ~가 맞는지 따져 보게 됩니다")의 근거로만 쓴다.
- ✅ 3인칭 정보 안내체(합니다체): "~한 메뉴입니다", "~인 경우 ~가 잘 맞습니다", "~라면 ~를 먼저 따져 보게 됩니다"
- ✅ 독자가 '이 메뉴가 나에게 맞는지' 판단할 재료를 제공
- ★ [FIX-A D1 → FIX-B 보조] 사실 경계 위반의 대표 유형(전체는 [사실 경계] 원칙 적용):
  ❌ 시설 보유형 · ❌ 동반 제공형 · ❌ 매장 대표 메뉴형 → ⭕ 방문 전 확인 관점으로만
  → 이용 시간대는 '이 메뉴를 찾는 일반적인 때'일 뿐 이 매장의 영업시간이 아니다.
- ⚠ AI투 지시어 금지: "이거/이것을/그것을" 대신 메뉴명('${menu}') 사용
- ★ [v4] 문체: 생활형 정보 안내체. 교과서식·논문식·백과사전식·엄숙한 표현 금지. 짧고 읽기 쉬운 문장.
- ★ [FIX-B] 글의 중심은 '검색자의 판단'. 메뉴 설명은 근거(30% 이하). 매 섹션을 '사람의 상황'으로 열고, 메뉴는 그 상황을 푸는 수단으로만 잇는다.
- ★ [v4] 읽고 난 독자에게 "${menu}가 뭔지 알았다"가 아니라 "오늘 같은 날 ${unit} 하러 갈까"가 남도록 쓴다.
- ★★ [재료 3연속 나열 절대 금지 — 실측 회귀 패턴] 재료·식감 형용사를 셋 이상 잇는 서술은 백과사전 회귀다.
  매 섹션 이 패턴이 반복되면 전면 실패.
  → 재료는 '그 상황을 왜 푸는지'의 근거로 1개만, 그것도 사람의 판단에 붙여서만 등장시킨다.
  → ❌ 요소별 맛 나열형 / ⭕ 상황 1개 + 근거 1개 구조`;

  // [VISIT PILOT] 게이트 ON + 실제 방문정보 존재 시에만 가이드 합성. OFF면 '' → 무변경.
  const visitGuide = options.visitPilot
    ? buildVisitGuide(options.visitInfo, situation, purpose)
    : '';

  // [FIX-B §1·§3] 사실 경계(최상위) + commercial 전용 문체 가이드. personal 후기 가이드(getAiSmellGuide) 미합성.
  const common = [getFactBoundary(_provided), COMMERCIAL_TONE, infoFrameGuide, getCommercialStyleGuide(), getKwDensityGuide(genericName, region, menu, 'commercial'), visitGuide]
    .filter(Boolean).join('\n');

  const isOpenSection = COMMERCIAL_OPEN_SECTIONS.includes(section);   // [FIX-C] 모듈 상수 이동(값 무변경)

  // [STEP6-FIX-F C-2] 먹는 방식 축 제거 — 메뉴명 정규식으로 만든 의사-KNOWN이었다(data 근거 없음).
  //   축 계약에서 상시 UNKNOWN으로 내리고, 행동 문장 주입을 없앤다.
  // [STEP6-FIX-E U-1] 자료 축 계약 — 섹션 조립 전 최상위로 주입
  const axisContract = getAxisContract(_F, { taste: !!tasteRef });

  // 첫 문장 규칙 — 오픈 섹션: 검색자 상황 도입 / 비오픈: 앞 섹션 판단 이어받기
  // [FIX-C 축3] 첫 문장 규칙 = getOpeningRule 단일 정의 (G 재생성 보강문과 공유)
  const openingLock = getOpeningRule(section, treatment, options);

  // ★ [s68] 동행(Scene) 게이트 — [FIX-C 축2·J1] base bestCompanion 기반 3상태(yes/no/unknown). 목적이 뒤집지 못함.
  const _pcNote = _F.purposeCompanion ? `
- 검색자가 고른 방문 목적의 동행(「${_F.purposeCompanion}」)은 글의 상황 설정이다. 메뉴의 일반 성격(양·동행 결)을 이 목적에 맞춰 바꾸지 않는다.
  둘이 어긋나도 과장하지 말고 조건 문장으로만 잇는다.` : '';
  const companionLock = (_soloFit === 'unknown' || !bestCompanion) ? `
[★★ 동행 제약 — 위반 시 실패]
- 이 메뉴의 동행 결 자료가 없다. 혼밥에 맞다/맞지 않다, 여럿이 가기 좋다/나쁘다를 정하지 않는다.
- 동행(혼자·둘·여럿·가족)을 대표 상황으로 내세우지 말고, 검색자의 목적 기준으로만 쓴다.${_pcNote}` : `
[★★ 동행 제약 — 위반 시 실패]
- 자료: ${bestCompanion}. 본문 전체의 동행 서술은 이 값만 쓴다.
  값보다 구체적인 인원·자리 성격(몇 인·무슨 모임)을 만들지 않는다.
${_sf(
    `- 이 메뉴는 혼자 오는 자리가 자연스럽다 — 라벨 범위 안에서만 쓴다.`,
    `- ❌ 이 메뉴는 1인 자리가 아니다. 1인 프레이밍 유형 전면 금지. 동행은 위 라벨로만 연다.`,
    '')}
- ❌ 혼자/친구/연인/여럿을 매 섹션 '골고루' 나열하는 균등 전개 금지 — 이 메뉴의 대표 동행에 집중한다.${_pcNote}`;

  const purposeOpenRule = isOpenSection ? `
- ★★ 섹션 전체 주어 규칙(필수): '${menu}'를 주어로 한 설명을 나열하지 말 것.
  섹션 처음부터 끝까지 '사람의 상황'이 주어다. 메뉴 정보는 그 상황에 왜 맞는지의 근거로만 등장.
  · 시작: '검색자의 상황'으로 연다 — ${bestCompanion ? `${bestCompanion} 값 안의 상황으로.` : '검색자의 목적에 맞는 상황으로(동행 전제 없이).'} ${companionLock}
  · 본론: 구성·맛·곁들임도 "이 상황의 사람에게 이래서 편합니다/맞습니다"로 환원. 재료 나열 금지.
  · 끝: [상황 → 이 메뉴가 선택지에 오른다]로 상황↔메뉴를 다시 묶는다. (빈도·인기 주장 금지)
  ❌ 금지 시작(유형): 메뉴명 주어 · 메뉴 특징 나열 · 곁들임 동반형
  ❌ 금지 전개: 한 문단 안에서 재료·조리·식감만 2문장 이상 연속(상황 언급 없이)` : `
- ★★ 섹션 전체 주어 규칙(필수): '${menu}'를 주어로 한 설명을 나열하지 말 것.
  주어는 '검색자(사람)'이며, 문장은 현재형 가정·일반형으로 쓴다("~라면 ~를 따져 보게 됩니다", "보통 ~합니다").
  · 시작: 이 섹션의 판단으로 바로 들어간다(새 상황·새 동행 도입 금지).  [FIX-D B2]
  · 본론: 구성·맛·곁들임을 설명할 때도 "이 판단에서 이래서 맞습니다/걸립니다"로 환원. 재료 나열 금지.
  · 끝: 이 섹션의 판단으로 끝낸다.  [FIX-D B2]
  ❌ 예고·전환 문장 금지: "다음으로는 …" / "이어서 …" / "다음 단계에선 …" / "~를 살펴보게 됩니다"
  ❌ 금지: 특정 손님이 겪는 장면·동작·결과 서술(앉는다·나온다·비운다·일어선다), 결말 감상.
  ❌ 금지 전개: 한 문단 안에서 재료·조리·식감만 2문장 이상 연속(상황 언급 없이)
${companionLock}`;

  const sectionGuides = {
    // ① 검색자 상황 공감 (메뉴 설명 아님) — key(menuIntro) 유지
    menuIntro: `
[섹션 주제] 검색자의 상황 (메뉴 설명 아님)
[조건]
- ❌ 메뉴 정체성·계열 설명으로 시작 금지. 검색자의 끼니·자리 상황으로 연다.
  ${_sf(
    `· 구조: [동행 라벨 범위의 상황] + [무엇을 정하려는지] 질문 1문장. 완성 예문 없음.`,
    `· 구조: [동행 라벨 범위의 상황] + [무엇을 정하려는지] 질문 1문장. 1인 프레이밍 금지. 완성 예문 없음.`,
    `· 구조: [검색자의 목적] + [무엇을 정하려는지] 질문 1문장. 동행·끼니 때를 특정하지 않는다. 완성 예문 없음.`)}
- ★ 방문 상황 서사를 도입 출발점으로: ${purposeFrame || '(목적 미지정 — 일반 상황)'}
- 흐름: 상황 질문 → 공감 한 줄 → [그 상황에서 이 메뉴가 떠오른다]는 다리 1줄 (빈도·인기 주장 금지)
  ★ 메뉴(${menu})는 문단의 두 번째 등장 — 상황이 먼저, 메뉴가 뒤
- 상황(${situation || '일반'}) / 목적(${purpose || '일반'})을 자연스럽게 반영
- 3인칭 정보형 유지(1인칭 체험·허위방문 금지). 독자에게 말 거는 질문체는 허용
- ❌ 지역·골목·매장 위치·매장 분위기 묘사 금지
${companionLock}
- 분량: 250~350자`,

    // ② 이 상황에 이 메뉴가 맞는 이유 — key(menuScene) 유지
    menuScene: `
[섹션 주제] 이 상황에 ${menu}가 맞는 이유 (검색자 판단 ★ FIX-B)
[조건]${purposeOpenRule}
- 앞 섹션의 상황을 이어받아, 그 상황에 ${menu}가 왜 맞는지를 메뉴 일반 특성 1~2개로 짚는다.
  ${_sf(
    `· 구조: [상황 조건] + [메뉴 일반 특성 1개가 그 조건에 걸리는 지점]. 완성 예문 없음.`,
    `· 구조: [상황 조건(1인 프레이밍 금지)] + [메뉴 일반 특성 1개가 그 조건에 걸리는 지점]. 완성 예문 없음.`,
    `· 동행 자료 없음 — 동행을 전제하지 않고 검색자의 목적에서 맞는 이유를 짚는다. 완성 예문 없음.`)}
${tasteRef
  ? `- 자료(메뉴 일반 · 매장마다 다름): ${tasteRef} — 근거로만 1문장 이내. 값 밖의 맛·재료·구성을 덧붙이지 않는다.`
  : `- 맛·식감 자료 없음 — 맛·식감·재료를 서술하지 않는다.`}
- ★ 방문 상황 결 참고: ${purposeFrame || '(일반)'}${bestCompanion ? ` / ${bestCompanion}(이 값까지만)` : ' / 동행 자료 없음 — 동행 전제 금지'}
- 이 섹션은 '왜 맞는가'까지만 다룬다. 주문 기준·주문 방식은 여기서 쓰지 않는다.  [FIX-D B2]
- ❌ 가상의 방문 장면("자리에 앉아 메뉴판을 펼치면") 금지 / ❌ 메뉴 정체성·재료 나열 금지
- 상황: ${situation || '(일반)'} / 목적: ${purpose || '(일반)'}
- 분량: 240~320자`,

    // ③ 주문 판단 기준 — key(menuComposition) 유지
    menuComposition: `
[섹션 주제] 무엇을 기준으로 주문을 정하는가 — 주문 판단 기준 (★ V2 decisionAxis)
[조건]${purposeOpenRule}
- ★★★ [이 섹션 최우선 게이트] 이 섹션은 '판단 과정'이 8할, '음식 정보'는 2할 이하다.
  · 재료·국물·고기 같은 음식 묘사를 여기서 하지 말 것. 음식이 주어가 되면 실패.
  · 검색자가 '어떤 조건에서 → 무엇과 무엇을 저울질하고 → 왜 걸리고 → 어디로 기우는지'만 쓴다.
  · 음식은 오직 "저울질의 대상"으로만 — 저울질의 양쪽은 자료 있는 축에서만 꺼낸다. 맛 종류·구성 선택지를 새로 만들지 않는다.
- ★★ 주문을 정할 때 종합하는 축(자료 있는 것만 쓴다): ${[portionFeel && '① 양', tasteRef && '② 맛·식감(주어진 값 안)', '③ 식사 목적(검색자가 정한 목적)', bestCompanion && '④ 동행'].filter(Boolean).join(' · ')}
  ${bestCompanion
    ? `★ ④ 동행은 ${bestCompanion} 값으로만 잡는다 — 인원 균등 나열 금지.`
    : `★ ④ 동행: 자료 없음 → 이 축으로 판단 문장을 만들지 않는다.`}
  ${_sf(
    `· 구조: [조건] + [무엇과 무엇을 저울질] + [어디로 기우는지]. 완성 예문 없음.`,
    `· 구조: [조건(1인 프레이밍 금지)] + [무엇과 무엇을 저울질] + [어디로 기우는지]. 완성 예문 없음.`,
    '')}
- ★ 판단 재료(메뉴 일반 성격 — 근거로만, 나열 금지. 없는 항목은 추정하지 않는다):
${(portionFeel || bestCompanion)
  ? [portionFeel && `  · ${portionFeel}`, bestCompanion && `  · ${bestCompanion}`].filter(Boolean).join('\n')
  : '  · (양·동행 자료 없음 — 이 두 축으로 판단 문장을 만들지 않는다)'}
  ⚠ 위 값은 메뉴의 일반적인 성격이다. "매장에서는 ~가 중심이다"처럼 매장 메뉴 구성으로 옮기지 말 것.
${portionFeel ? FACT_LABEL_FORM + '\n' : ''}- ★★ [계기-메뉴 정합] 위 판단 재료와 검색자의 목적 안에서 축 하나를 중심에 둔다. 메뉴가 제공하는 선택지(부위·맛 종류·구성)를 전제하지 않는다.
- ★★ [이유 조합] 축 하나에 '왜 그렇게 따지는가'의 이유를 1개 붙인다.
  · 이유 축(택1): ${[portionFeel, paceFeel].filter(Boolean).join(' · ') || '검색자의 목적'}.   [FIX-F C-1] 예산 축 제외 — priceFeel은 가격 정보가 아니라 평가문이다.
- ★★ [판단 흐름 — 한 줄로 뭉개지 말 것] 아래 4비트를 문장으로 펼친다:
  ① 어떤 조건인가 ② 무엇과 무엇을 저울질하나 ③ 왜 걸리나 ④ 그래서 어느 쪽으로 기우나('기웁니다'까지만)
  · 완성 예문은 주지 않는다. 4비트를 검색자의 목적과 자료 있는 축으로만 채운다.
- ❌ 매장 안 계기(옆 테이블·벽 메뉴·직원에게 묻기·메뉴판 훑기) 금지 — 가상의 방문 장면이다.
- ❌ "${menu}는 ~로 구성된다 / ~가 들어간다" 구성·재료 나열 금지 / ❌ 결과 단정("그래서 A를 시킵니다")은 이 섹션에서 쓰지 않는다  [FIX-D B2]
- 분량: 280~380자`,

    // ④ 보통의 주문 방식 — key(tasteFeature) 유지
    tasteFeature: `
[섹션 주제] 보통 어떻게 주문하는가 — 인원·목적별 주문 방식 (★ V2 판단의 결과)
[조건]${purposeOpenRule}
- ★★ 앞 섹션 판단 기준의 '결과'. 그 상황이면 보통 어떻게 주문하는지 검색자 기준으로.
  ${_sf(
    `· 동행 라벨 범위 안에서 '무엇을 기준으로 정하는지'만. 추가 주문 품목·가짓수를 전제하지 않는다.`,
    `· 동행 라벨 범위 안에서 '무엇을 기준으로 정하는지'만(1인 프레이밍 금지). 추가 주문 품목·가짓수를 전제하지 않는다.`,
    `· 동행 자료 없음 — 인원별 주문 방식을 전제하지 말고 검색자의 목적 기준으로만.`)}
- ❌ 빈도·판매량 주장 금지("가장 많이 나간다", "대부분 시킨다").
- ★ 먹는 방식 자료 없음 — 먹는 동작·순서·구성을 서술하지 않는다.
- ❌ 특정 손님의 동작·반응 서술 금지.
${tasteRef
  ? `- ★ 자료 ${tasteRef} 는 "왜 그 주문 방식이 맞는지" 근거 1문장으로만. 값 밖의 맛·재료·구성 금지.`
  : `- ★ 맛·식감 자료 없음 — 맛·식감·재료를 서술하지 않는다.`}
  ⭕ 맛 결 1개를 주문 방식의 근거로 붙이는 구조 / ❌ 요소별 맛 나열형 / ❌ 체험 지각 서술형
- ${unit} 단위로 표기("${menu} ${unit}"). ❌ 가격 숫자 금지 → "방문 시 매장 기준 확인"
- 분량: 200~280자`,

    // ⑤ 주문 범위 판단 — key(pairing) 유지  [STEP6-FIX-E F-1] 곁들임 축 = commercial 상시 UNKNOWN
    pairing: `
[섹션 주제] 주문 범위를 어디까지 정할지 — 판단 기준만 (★ FIX-E)
[조건]${purposeOpenRule}
- ★★★ 이 글은 반찬·소스·곁들임·추가 구성을 모른다(자료 축 계약). 품목명·구성·제공 여부·가짓수를 쓰지 않는다.
  → 추가 주문 품목은 종류를 불문하고 쓰지 않는다. "무엇을 더할지"를 정하거나 예로 드는 문장 전면 금지.
- 쓸 수 있는 것은 두 가지뿐이다:
  ① 추가 주문 구성은 매장마다 달라 메뉴판에서 확인하게 된다는 판단
  ② 자료 있는 축${portionFeel ? `(${portionFeel})` : '(양 자료 없음 — 양으로 판단 문장을 만들지 않는다)'}과 검색자의 목적
- ❌ 인원(혼자·둘·여럿)을 전제한 조건절 금지 · ❌ 곁들임 맛 설명 금지 · ❌ 광고 종결 금지 · ❌ 가격 숫자 금지
- 분량: 180~240자`,

    // ⑥ 어떤 사람에게 맞나 — key(decision) 유지
    decision: `
[섹션 주제] 어떤 사람·상황에게 이 선택이 맞나 (★ V2 선택 보조)
[조건]${purposeOpenRule}
- "어떤 상황·목적이면 ${menu}가 잘 맞고, 어떤 경우엔 다른 선택이 나은지" 검색자 기준으로 안내
  ${_sf(
    `· 구조: [맞는 조건] / [다른 선택이 나은 조건] 2갈래. 동행 라벨 범위 안에서만. 완성 예문 없음.`,
    `· 구조: [맞는 조건] / [다른 선택이 나은 조건] 2갈래. 동행 라벨 범위 안에서만(1인 프레이밍 금지). 완성 예문 없음.`,
    `· 동행 자료 없음 — 1인·모임 여부를 정하지 않는다. 목적·입맛 기준으로만 2갈래를 나눈다.`)}
- ★★ 판단 재료(단정 금지 — 독자가 스스로 가늠하게):
${(portionFeel || paceFeel)
  ? [portionFeel && `  · ${portionFeel}`, paceFeel && `  · ${paceFeel}`].filter(Boolean).join('\n')
  : '  · (양·식사 성격 자료 없음 — 이 두 축으로 판단 문장을 만들지 않는다)'}
${(portionFeel || paceFeel) ? FACT_LABEL_FORM + '\n' : ''}  → 양·가격 평가 단정이 아니라, ${bestCompanion ? `${bestCompanion}에 맞춰 ` : ''}"이 자리에 맞는지" 판단 정보로${_sf('', ' (1인 프레이밍 금지)', ' (동행 자료 없음 — 1인 여부를 정하지 않음)')}
- 입맛 호불호 기준 1~2줄 (진한 선호 / 담백 선호 등)
- ★★ [선택지 — A/B/C] 검색자가 고를 수 있는 선택을 '대부분 유지, 일부만 변경'의 결로.
  · A(그대로): ${menu} ${unit}으로 간다 — 기본.
  · B(범위 조정): 유지하되 목적에 따라 주문 범위를 넓힐지 정한다 — 무엇을 더할지는 쓰지 않는다(품목·가짓수 언급 금지).
  · C(변경): 상황이 안 맞으면 다른 선택을 고려한다 (양·자리·목적이 어긋날 때).
  · A를 중심에 두고 B 또는 C 하나를 '조건부'로만. 세 개를 매번 다 늘어놓지 말 것.
- ★ 마무리는 방문 동기(${purposeFrame || '검색자의 상황'})와 이어지는 '판단'으로 끝맺는다.
- ❌ 회고 감상형(선택 결과 단정·재방문) 금지 — 아직 아무도 방문하지 않았다.
- 분량: 300~400자`,

    // ⑦ 이용 팁 — key(recommendSituation) 유지 (D2 유지)
    recommendSituation: `
[섹션 주제] 언제·어떤 페이스로 찾는 메뉴인가 (★ V2 이용 팁)
[조건]${purposeOpenRule}
- 검색자가 알아두면 좋을 이용 팁을 3인칭 정보형으로 (${(visitTiming || paceFeel) ? '끼니 흐름·식사 성격 등 메뉴 일반 수준' : '검색자의 목적 기준'} — 붐빔·대기·방문자 수는 쓰지 않는다)
${visitTiming
  ? `- ★ 자료(일반론 — ★이 매장의 영업시간 아님): ${visitTiming}`
  : `- ★ 이 메뉴의 시간대 자료가 없다 → 이용 시간대(아침·점심·저녁·밤·끼니 때)를 정하거나 추정하는 문장을 쓰지 않는다.`}
${paceFeel
  ? `- ★ 자료(메뉴 일반): ${paceFeel} — 식사 경과·완료 장면(비운다·일어선다)으로 바꿔 쓰지 않는다.`
  : `- ★ 이 메뉴의 식사 페이스 자료가 없다 → 빠르다/오래 앉는다를 정하지 않는다.`}
${(visitTiming || paceFeel) ? FACT_LABEL_FORM + '\n' : ''}  → ❌ 영업시간 단정형 · 지역 빈도형 · 방문량형으로 바꿔 쓰기 금지
- ★ 포장·웨이팅·예약은 매장 사실을 단정하지 않는다 — 필요하면 "방문 전 확인" 수준으로만
- ★ 방문 상황: ${bestCompanion ? `${bestCompanion} 값 안에서만 — ` : ''}${_sf('값 안의 자리', '값 안의 자리 — 1인 프레이밍 지양', '검색자의 목적 기준으로만 — 동행·시간대 전제 금지')}
- ❌ 가상의 식사 마무리 장면(추가 주문·비움·정리) 금지
- ❌ "꼭 가보세요" 류 광고 종결 금지 — "~한 자리에 무난한 선택" 톤
- 상황: ${situation || '(일반)'} / 목적: ${purpose || '(일반)'}
- 분량: 240~320자`,

    // ⑧ 확인 항목 — key(storeFeature) 유지
    storeFeature: `
[섹션 주제] 방문 전에 확인해 두면 좋은 항목 (보조) — ★ FIX-A D1 · FIX-B
[★★★ 사실성 절대 규칙 — 위반 시 실패]
- 이 매장의 ${_parkingProvided ? '좌석·포장·예약·웨이팅·영업시간·반찬 구성' : '좌석·주차·포장·예약·웨이팅·영업시간·반찬 구성'} 정보는 제공되지 않았다. 있다/없다/가능하다를 정하지 않는다.
${_provided.length ? `- [FIX-C A안] 글 끝 운영정보 블록에 ${_provided.join('·')} 안내가 따로 붙는다. 이 항목은 "확인해 두라"고 쓰지 않는다.
  필요하면 "아래 안내 참고" 수준으로 한 번만. 주소·주차 방식 등 값은 본문에 옮기지 않는다.
` : ''}- ❌ 시설·서비스 보유형 서술 전면 금지 — 주차·포장·예약·좌석 형태 모두 해당(있다/준비돼 있다/가능하다 전부).
- ⭕ 확인 권고형(방문 전에 물어보라는 판단)으로만
[조건]
- 방문 목적에 따라 '무엇을 먼저 확인하면 좋은지'만 안내 — ${_parkingProvided ? '차량이면 아래 주차 안내 참고' : '차량이면 주차'}, 포장 여부 (모두 확인 관점)
- ★ 좌석 형태는 자료가 없다(자료 축 계약) → 확인 항목으로 들지 않는다. 인원·자리 구성을 전제한 문장도 쓰지 않는다.
- ❌ 매장명·매장 위치·골목·매장 분위기 서술 금지 (위치 안내는 시스템이 글 끝에 따로 붙인다)
- ❌ 식사 중·식사 후 장면으로 연결하지 말 것 — 방문 전 체크리스트 관점만
- 분량: 200~280자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] '${menu}' 메뉴 정보 안내\n- 3인칭 정보형. 1인칭·광고 단정 금지.\n- 분량: 200~300자`;

  return `
${region} ${menu} ${cat} — "${menu} 먹으러 갈까?" 검색자의 판단을 돕는 글의 [${section}] 섹션만 작성.
${axisContract}
${openingLock}

${guide}
${common}

---
이 섹션만 작성. 글의 주어는 '메뉴'가 아니라 '검색자의 상황·판단'. 메뉴 설명은 근거로만(뒤쪽·최소).
특정 매장의 사실·가상의 방문 경험 서술 금지([사실 경계]). 1인칭 서사·광고 단정·사전식 정의 절대 금지.
딱딱한 논문체도 금지 — 읽기 쉬운 생활 안내체. 문단은 2~4줄로 유지.
`.trim();
}

// ============================================================
// 3. 이미지 ALT 생성 (getImageAlts)
//    맛집 사진 alt — 외관·메뉴판·상차림·음식·장면·마무리
// ============================================================
export function getRestaurantImageAlts(treatment, region, options = {}) {
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
