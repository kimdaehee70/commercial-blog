// =============================================
// lib/clinic-prompts.js
// 성형외과/피부과 프롬프트 빌더 v2.0
//
// 변경사항 (v2.0):
//   1. DIRECTION 맵 추가 — 시술별 concern·effect·hook·keyword 고정
//   2. mode 분기 추가 — "personal" | "commercial"
//      - personal:   1인칭 후기 (현재 구조, 상단 노출용)
//      - commercial: 3인칭 정보형 (광고법 안전, SaaS·광고대행용)
//   3. AI 냄새 제거 가이드 강화 (oriental·ortho 수준)
// =============================================

import { getTreatmentById }              from "./clinic-data.js";
import { buildClinicSectionInstruction,
         buildClinicFlowBlock,
         getSectionMeta }                from "./clinic-playConfig.js";
import { buildPatternContext,
         checkForbiddenPatterns,
         NATURALNESS_RULES,
         FORBIDDEN_PATTERNS }            from "./patternDB.js";

// ============================================================
// 0. DIRECTION 맵 — 시술별 방향 고정 (매뉴얼 PART 3-1 핵심)
// ============================================================
const CLINIC_DIRECTION = {
  natural_double: {
    concern: "쌍꺼풀이 없거나 짝눈이 신경 쓰이고 인상이 또렷하지 않아서",
    effect:  "자연스러운 쌍꺼풀 라인, 또렷한 인상, 짧은 회복 기간",
    hook:    "사진 속 내 눈이 마음에 안 들었던 순간",
    keyword: "자연유착 쌍꺼풀",
  },
  eye_fat: {
    concern: "눈밑 지방이 도드라지고 다크서클이 짙어 피곤해 보여서",
    effect:  "눈밑 라인 정돈, 다크서클 완화, 인상 개선",
    hook:    "거울 속 피곤해 보이는 눈가가 마음에 걸렸을 때",
    keyword: "눈밑지방재배치",
  },
  epicanthoplasty: {
    concern: "눈매가 답답해 보이고 눈 길이가 짧아서",
    effect:  "눈 길이 확장, 눈매 시원해짐, 답답함 완화",
    hook:    "사진에서 눈이 작게 나오는 게 신경 쓰였을 때",
    keyword: "앞트임·뒤트임",
  },
  ptosis: {
    concern: "눈이 잘 안 떠지고 졸려 보이는 인상이라서",
    effect:  "눈매 교정, 또렷한 인상, 시야 개선",
    hook:    "졸려 보인다는 말을 자꾸 들었을 때",
    keyword: "눈매교정",
  },
  rhinoplasty: {
    concern: "콧대가 낮거나 코끝이 둥글어 인상이 흐리게 보여서",
    effect:  "콧대 라인 개선, 코끝 정돈, 옆모습 개선",
    hook:    "옆모습 사진을 보고 변화가 필요하다고 느꼈을 때",
    keyword: "코성형",
  },
  facial_contour: {
    concern: "사각턱·광대가 도드라져 얼굴이 커 보이고 인상이 거칠어서",
    effect:  "얼굴 라인 정돈, 부드러운 인상, V라인 형성",
    hook:    "정면 사진에서 얼굴이 넓게 보였을 때",
    keyword: "안면윤곽",
  },
  forehead: {
    concern: "이마가 평평하거나 꺼져 입체감이 부족해서",
    effect:  "이마 볼륨, 입체감 개선, 옆모습 자연스러워짐",
    hook:    "옆머리 라인이 마음에 들지 않았을 때",
    keyword: "이마성형",
  },
  sili_lifting: {
    concern: "수술 없이 처진 볼·턱선을 정리하고 싶어서",
    effect:  "볼·턱선 리프팅, 짧은 다운타임, 자연스러운 변화",
    hook:    "마스크 벗고 사진 찍을 때 처짐이 느껴졌을 때",
    keyword: "실리프팅",
  },
  ulthera: {
    concern: "근막층 처짐이 심해 윤곽선이 흐려져서",
    effect:  "SMAS 근막층 리프팅, 윤곽 개선, 탄력 회복",
    hook:    "사진에서 얼굴이 퍼져 보인다고 느꼈을 때",
    keyword: "울쎄라",
  },
  rf_lifting: {
    concern: "피부 탄력이 떨어지고 잔주름이 늘어났어서",
    effect:  "RF 콜라겐 재생, 탄력·결 개선, 잔주름 완화",
    hook:    "거울 속 피부가 예전 같지 않다고 느꼈을 때",
    keyword: "인모드·써마지",
  },
  botox: {
    concern: "사각턱·이마·눈가 주름이 신경 쓰이고 인상이 험해 보여서",
    effect:  "표정 주름 완화, 얼굴 라인 부드러워짐, 인상 개선",
    hook:    "찡그리지 않아도 인상이 굳어 보였을 때",
    keyword: "보톡스",
  },
  filler: {
    concern: "팔자주름이 깊어지고 볼륨이 꺼져 나이 들어 보여서",
    effect:  "팔자주름 채움, 볼륨 복원, 윤곽 개선",
    hook:    "사진에서 실제보다 나이 들어 보였을 때",
    keyword: "필러",
  },
  fat_graft: {
    concern: "얼굴 볼륨이 꺼져 푸석해 보이고 인상이 어두워서",
    effect:  "자가지방 볼륨 복원, 자연스러운 입체감, 영구적 개선",
    hook:    "볼이 꺼지면서 나이 들어 보였을 때",
    keyword: "지방이식",
  },
  liposuction: {
    concern: "다이어트로 안 빠지는 부위 때문에 옷 라인이 신경 쓰여서",
    effect:  "특정 부위 지방 감소, 라인 개선, 영구적 변화",
    hook:    "운동·식단으로도 변하지 않는 부위를 보고 결심했을 때",
    keyword: "지방흡입",
  },
  pico_laser: {
    concern: "기미·잡티가 짙어지고 피부톤이 칙칙해져서",
    effect:  "색소 분해, 톤 균일화, 잡티 완화",
    hook:    "단체사진에서 내 얼굴만 칙칙해 보였을 때",
    keyword: "피코레이저",
  },
  laser_toning: {
    concern: "기미·색소침착이 신경 쓰이지만 점진적 개선을 원해서",
    effect:  "색소 점진 완화, 피부톤 균일, 자극 적은 케어",
    hook:    "강한 시술이 부담스러워 다른 방법을 찾던 중",
    keyword: "레이저토닝",
  },
  hair_transplant: {
    concern: "모발이 가늘어지고 정수리·이마라인이 비어 보여서",
    effect:  "모발 밀도 회복, 헤어라인 개선, 자신감 회복",
    hook:    "사진에서 두피가 비쳐 보이기 시작했을 때",
    keyword: "모발이식",
  },
};

/** 시술 방향 가져오기 (없으면 기본값) */
export function getClinicDirection(treatmentId) {
  return CLINIC_DIRECTION[treatmentId] || {
    concern: "외모 고민이 깊어졌어서",
    effect:  "외모 변화 개선",
    hook:    "거울을 보다 변화가 필요하다고 느꼈을 때",
    keyword: "성형외과 시술",
  };
}

// ============================================================
// 0-1. AI 냄새 제거 가이드 (전 섹션 공통)
//      네이버 AI 필터링 강화 대응 — oriental·ortho 수준
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지 — 절대 사용 금지]
"드디어 결심하고" / "결국 선택하게 되었어요" / "마침내" / "비로소"
"마음이 편안해졌어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "차분하고 따뜻한" / "안정감 있는 분위기"
"미소를 되찾았어요" / "자신감을 찾았어요" / "새로운 삶" / "삶의 질이"
"기준으로 살펴본" / "관리 방법과 생활 속" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면" / "앞서 언급한"
"특히", "또한", "무엇보다" 연속 나열 금지
→ 대체: 구체적 날짜·횟수·통증 수치·원장 직접 인용·실제 행동 묘사`;
}

// ============================================================
// 0-2. 키워드 밀도 + 조사 오류 가이드
// ============================================================
function getKwDensityGuide(treatmentName) {
  return `
[키워드 밀도] "${treatmentName}"는 이 섹션에서 최대 2~3회만 직접 표기.
나머지는 "이 시술", "시술", "그 시술"로 대체. 절대 5회 이상 반복 금지.

[조사 오류 금지 — 최중요]
시술명("${treatmentName}") 뒤에 조사 직접 연결 시 띄어쓰기 또는 자연스러운 문장으로:
  ❌ "${treatmentName}을" → ✅ "이 시술을"
  ❌ "${treatmentName}이 시술" → ✅ "이 시술은"
  ❌ "${treatmentName}는" → ✅ "이 시술은"
이중 공백 금지 ("그래서  받기로" → "그래서 이 시술을 받기로")`;
}

// ============================================================
// 0-3. 동선 흐름 가이드 — 상단 유지력 핵심 ★
//      "정보 나열" → "실제 하루 경험" 으로 전환
// ============================================================
function getFlowTimelineGuide(sectionKey, mode = "personal") {
  if (mode === "commercial") {
    // commercial: 단계 안내 형식 (3인칭)
    if (sectionKey === "situation") {
      return `
[동선 흐름 — 진료 검토 단계 안내]
탐색 단계를 시간 순서로 정리:
  1단계: 증상·고민 자각 → 정보 검색 시작
  2단계: 후기·전문의 자격·접근성 비교
  3단계: 상담 가능 시간 확인 → 예약
- "처음 검색을 시작할 때는 ~", "다음 단계로는 ~", "최종적으로 ~" 같은 단계 연결어 사용
- 탐색 과정이 한 흐름으로 이어지게 작성`;
    }
    if (sectionKey === "consult") {
      return `
[동선 흐름 — 진료 단계 안내]
진료 진행을 시간 순서로 정리:
  1단계: 접수·대기 → 진료실 입장
  2단계: 문진·검사 (시진·촉진·필요 시 영상)
  3단계: 검사 결과 설명 → 시술 안내
  4단계: 질문 응대 → 시술 결정 권장
- "처음에는 ~ 이후 ~ 마지막으로 ~" 단계 연결어 사용`;
    }
    return "";
  }

  // personal: 1인칭 시간 흐름 (실제 경험담 느낌)
  if (sectionKey === "situation") {
    return `
[동선 흐름 — 시간 순서로 자연스럽게 ★ 상단 유지 핵심]
검색·예약·도착까지 한 흐름으로 이어지게:
  ① 정보 검색·후기 비교 ("처음에는 그냥 검색만 했어요")
  ② 2~3곳 추려서 비교 ("그래서 후보를 좁혀봤는데")
  ③ 예약 결정 ("예약 잡고 가기로 했어요")

다음 표현 중 1~2개 자연스럽게 사용:
- "처음에는 그냥 정보만 찾아봤어요"
- "후기 몇 개 읽어보다가"
- "결국 두 곳으로 좁혀졌어요"
- "예약하고 갔는데 생각보다 빨리 들어갔어요"
→ 정보 나열 ❌ / 시간 흐름 ✅`;
  }
  if (sectionKey === "consult") {
    return `
[동선 흐름 — 진료 당일 시간 순서 ★ 상단 유지 핵심]
도착 → 접수 → 대기 → 검사 → 상담 → 결정 흐름으로:
  ① 도착·접수 ("도착해서 접수하고 잠깐 기다렸어요")
  ② 진료실 입장 ("이름 부르길래 안으로 들어갔어요")
  ③ 검사 진행 ("먼저 ~ 검사부터 했어요")
  ④ 결과 설명 ("검사 끝나고 결과 보면서 설명해 주셨어요")
  ⑤ 질문·답변 ("궁금했던 거 물어봤더니")
  ⑥ 결정 ("설명 듣고 나서 받기로 했어요")

다음 흐름 표현 중 2~3개 자연스럽게 사용:
- "예약하고 갔는데 생각보다 빨리 들어갔어요"
- "검사 먼저 진행하고 상담이 이어졌어요"
- "설명 듣고 나서 선택하게 됐어요"
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
// 1. 시스템 프롬프트 — mode 분기
// ============================================================
export function buildSystemPrompt(params) {
  const { mode = "personal" } = params;
  if (mode === "commercial") return buildCommercialSystemPrompt(params);
  return buildPersonalSystemPrompt(params);
}

// ── personal: 1인칭 환자 후기 (상단 노출용) ──
function buildPersonalSystemPrompt(params) {
  const { treatmentName, region, tone } = params;

  return `
당신은 ${region}에서 ${treatmentName}을(를) 받아본 일반인입니다.
실제 경험을 정리하는 블로그 글을 작성합니다.

[ 역할 ]
- 글쓴이: ${treatmentName} 시술을 받아본 경험자 본인 또는 가족·지인 동행자
- 독자: ${region} ${treatmentName} 시술을 고민 중인 잠재 고객
- 어조: ${tone || "솔직하고 담담하게. 친구에게 카카오톡 보내는 느낌."}

[ 핵심 규칙 ]
1. 실제 사람이 쓴 것처럼. AI 글투 절대 금지.
2. 짧은 문장 위주(10~45자). 단문과 중문 7:3.
3. 감정은 행동·상황 뒤에 자연스럽게. 감정 나열 금지.
4. 상담 섹션에 대화(따옴표) 최소 1개 포함.
5. 광고·홍보 느낌 금지. 병원명·직접 가격 명시 금지.
6. 의학적 효과 단정 금지. ("반드시", "100%", "확실히", "보장" 금지)
7. SEO 키워드는 문장 안에 자연스럽게.
8. 지역명은 반드시 ${region}으로 통일.
9. 각 섹션은 지정된 최소 글자 수를 충족.

${getAiSmellGuide()}

[ 출력 형식 ]
- 마크다운 헤딩(##) 사용
- 이미지 위치는 [이미지: ALT텍스트] 형식
- 코드블록·표·불릿 리스트 금지
`.trim();
}

// ── commercial: 3인칭 정보형 (광고법 안전) ──
function buildCommercialSystemPrompt(params) {
  const { treatmentName, region } = params;

  return `
당신은 ${region} 지역 ${treatmentName} 진료 정보를 정리하는 의료 정보 블로그 작가입니다.
환자 후기가 아닙니다. 정보 안내 글입니다.

[ 작성 시점 — 절대 규칙 ]
- 시점: 3인칭 정보 안내 (절대 1인칭 금지)
- 글의 형태: 후기 ❌ / 정보 안내 ✅
- 글의 흐름: 고민→방문→결과→만족 (❌) / 정보 안내→설명→일반 경과→판단 기준 (✅)

[ 절대 금지 표현 — 위반 시 글 실패 ]
1. 1인칭 시점:
   ❌ "저는", "제가", "내가", "나는", "받아봤어요", "느꼈어요", "결정했어요", "고민했어요"
2. 후기 구조:
   ❌ "고민하다가", "결국 받기로", "받고 나서 만족", "결과가 마음에 들었어요"
3. 효과 단정:
   ❌ "좋아졌다", "또렷해졌다", "만족했다", "확실히", "잘 됐다", "완치", "100%"
4. 추천·유도:
   ❌ "추천합니다", "상담 받아보세요", "꼭 받으세요", "도움이 됩니다"
5. 가격·환자유인:
   ❌ "OO만원", "회당 N만원", "비용은 N만원", "실비 적용", "할인", "이벤트"
6. 의료진·병원 직접 평가:
   ❌ "원장님이 친절", "이 병원 추천", "여기서 받으세요"
7. 비교광고:
   ❌ "다른 병원보다", "타원에서는"

[ 권장 표현 — 정보형 안내 톤 ]
- 시점·문장:
  ✅ "이런 경우 ${treatmentName} 진료를 고려하는 경우가 많습니다"
  ✅ "일반적으로 ~ 안내됩니다"
  ✅ "병원에 따라 차이가 있습니다"
  ✅ "개인차가 있을 수 있습니다"
- 상담 안내:
  ✅ "상담 시 일반적으로 다음과 같은 설명이 안내됩니다"
  ✅ "검사 결과를 바탕으로 시술 방향을 안내받게 됩니다"
- 회복·결과 안내:
  ✅ "일반적으로 회복은 ~ 경과를 보입니다"
  ✅ "개인차에 따라 차이가 있을 수 있습니다"
- 마무리:
  ✅ "비슷한 고민이 있다면 진료를 고려해볼 수 있습니다"
  ✅ "개인 상태에 따라 상담을 통해 결정하는 것이 권장됩니다"

[ 글 구조 — 강제 ]
1. 고민 상황 안내 (3인칭): 어떤 상황에서 진료를 고려하는지
2. 정보 탐색 단계 안내: 검토 시 일반적으로 확인하는 항목
3. 상담 과정 설명: 일반적으로 어떤 검사·설명이 진행되는지
4. 시술 특징·일반 정보: 시술 종류·차이점·일반 사항
5. 회복 과정 안내: 일반적 경과 (수치 또는 "개인차 있음")
6. 판단 기준 안내: 진료 결정 시 고려 항목 + 상담 권장

[ 자연스러움 ]
- 정보형이지만 딱딱하지 않게. 안내문 톤이지만 딱딱한 보고서 ❌
- 정보 흐름이 자연스럽게 이어져야 함
- AI 느낌·반복 어휘 금지 ("특히", "또한", "무엇보다" 연속 금지)

${getAiSmellGuide()}

[ 출력 형식 ]
- 마크다운 헤딩(##) 사용
- 섹션 제목: "OO 진료 안내", "OO 회복 과정", "상담 시 안내 항목" 형식
- 표·불릿 리스트 적극 활용 (정보 정리용)
- 이미지 위치는 [이미지: ALT텍스트] 형식

[ 최종 검증 — 출력 전 자체 점검 ]
글을 다 쓴 뒤 다음을 확인:
✔ 1인칭 (저/제가/내가) 0건
✔ 가격 (OO만원) 0건
✔ 효과 단정 (좋아졌다/만족) 0건
✔ 추천/유도 (추천합니다/상담받으세요) 0건
✔ 후기 흐름 (고민→방문→만족) 0건
하나라도 발견되면 그 문장을 정보형으로 다시 작성.
`.trim();
}

// ============================================================
// 2. 섹션별 프롬프트 (mode 분기)
// ============================================================
export function buildSectionPrompt(params) {
  const { mode = "personal" } = params;
  if (mode === "commercial") return buildCommercialSectionPrompt(params);
  return buildPersonalSectionPrompt(params);
}

// ── personal 섹션 ──
function buildPersonalSectionPrompt(params) {
  const {
    sectionKey, treatmentName, region, targetId, blogTypeId,
    prevSections = [], extraContext = "", treatmentId = "",
  } = params;

  const treatment = getTreatmentById(
    treatmentName === "자연유착 쌍꺼풀" ? "natural_double"
    : treatmentName === "실리프팅"       ? "sili_lifting"
    : treatmentName === "피코레이저"     ? "pico_laser"
    : treatmentId || treatmentName
  );

  if (!treatment) {
    return `[오류] 시술 데이터를 찾을 수 없습니다: ${treatmentName}`;
  }

  const seoData     = treatment.seoData || {};
  const direction   = getClinicDirection(treatment.id);
  const sectionInst = buildClinicSectionInstruction(sectionKey, treatmentName, region);
  const meta        = getSectionMeta(sectionKey);

  const prevContext = prevSections.length > 0
    ? `[ 이전 섹션 — 같은 표현·문장 절대 반복 금지 ]\n${prevSections.slice(-2).map((s, i) =>
        `${i + 1}. ${s.label}: ${s.content.slice(0, 80)}...`
      ).join("\n")}`
    : "";

  const directionGuide = `
[시술 방향 고정 — 흔들리지 말 것]
- 고민 방향: ${direction.concern}
- 변화 방향: ${direction.effect}
- 첫 후킹: ${direction.hook}
- 핵심 키워드: ${direction.keyword}`;

  return `
${region} ${treatmentName} 블로그 (1인칭 경험담) — [${meta?.label || sectionKey}] 섹션만 작성.

${directionGuide}
${getAiSmellGuide()}
${getKwDensityGuide(treatmentName)}
${getFlowTimelineGuide(sectionKey, "personal")}

${sectionInst}

[ SEO 키워드 (자연 삽입 1~2개) ]
${(seoData.keywords || []).slice(0, 5).join(", ")}

[ 섹션 소재 힌트 ]
${getSectionHint(sectionKey, seoData)}

${prevContext}
${extraContext ? `[ 추가 지시 ]\n${extraContext}` : ""}

---
이 섹션만 작성. 소제목 포함. 최소 ${meta?.minChars || 200}자 이상.
`.trim();
}

// ── commercial 섹션 (광고법 안전) ──
function buildCommercialSectionPrompt(params) {
  const {
    sectionKey, treatmentName, region,
    prevSections = [], extraContext = "", treatmentId = "",
  } = params;

  const treatment = getTreatmentById(treatmentId || treatmentName);
  const direction = getClinicDirection(treatment?.id || "");
  const meta      = getSectionMeta(sectionKey);

  const sectionGuides = {
    concern: `
[섹션 주제] ${treatmentName} 진료를 고려하게 되는 일반적 상황 안내
[작성 규칙 — 절대 준수]
- ❌ 1인칭 금지: "저는", "제가", "내가", "고민했어요"
- ❌ 후기 흐름 금지: "고민하다 결심"
- ✅ 3인칭 정보 안내: "이런 경우 진료를 고려하는 경우가 많습니다"
- ✅ 일반 사례 안내: "다음과 같은 상황에서 ${treatmentName} 진료를 검토하시는 분들이 많습니다"
- 방향: ${direction.concern}
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 ${treatmentName} 진료 검토 시 일반 안내
[작성 규칙 — 절대 준수]
- ❌ 1인칭 금지: "저는 검색했다", "후기를 봤다"
- ❌ 후기 흐름 금지: "여러 곳을 알아보다가"
- ✅ 안내형: "진료를 검토할 때 일반적으로 확인하는 항목은 다음과 같습니다"
- ✅ 항목 정리: 전문의 자격·시설·진료 분야 등을 정보 형식으로
- ❌ 특정 병원 추천 금지
- 분량: 200~300자`,

    consult: `
[섹션 주제] ${treatmentName} 상담 시 일반적으로 안내되는 항목
[작성 규칙 — 절대 준수]
- ❌ 1인칭 금지: "원장님이 친절했어요", "설명이 좋았어요"
- ❌ 가격 명시 금지: "OO만원" → "병원별 상이, 상담 시 확인"
- ✅ 안내형: "상담 시 일반적으로 다음과 같은 설명이 안내됩니다"
- ✅ 검사 흐름 안내: "검사 결과를 바탕으로 시술 방향을 안내받게 됩니다"
- ✅ 일반 정보 정리: 검사 → 설명 → 판단 흐름을 3인칭으로
- 분량: 250~350자`,

    reason: `
[섹션 주제] ${treatmentName} 선택 시 일반 고려 기준
[작성 규칙 — 절대 준수]
- ❌ 1인칭 금지: "저는 이걸로 결정", "고민하다 선택"
- ❌ 단정 금지: "이게 더 좋다"
- ✅ 비교 안내: "각각 다음과 같은 특징이 있습니다"
- ✅ 판단 안내: "개인 상태에 따라 적합한 시술이 달라질 수 있습니다"
- 변화 방향: ${direction.effect}
- 분량: 200~300자`,

    result: `
[섹션 주제] ${treatmentName} 일반적 회복·변화 경과 안내
[작성 규칙 — 절대 준수]
- ❌ 효과 단정 금지: "좋아졌다", "또렷해졌다", "만족", "확실히"
- ❌ 1인칭 금지: "받고 나서", "느껴졌다"
- ✅ 일반 경과 안내: "일반적으로 회복은 ~ 경과를 보입니다"
- ✅ 개인차 강조: "개인차에 따라 차이가 있을 수 있습니다"
- ✅ 시점별 일반 정보: "1주차에는 일반적으로 ~", "1개월차에는 ~"
- 분량: 300~400자`,

    closing: `
[섹션 주제] 진료 결정 시 권장 안내
[작성 규칙 — 절대 준수]
- ❌ 추천·유도 금지: "추천합니다", "꼭 받으세요", "상담 받아보세요"
- ❌ 1인칭 금지: "저도 받았어요"
- ✅ 권장 안내: "비슷한 고민이 있다면 ${region} ${treatmentName} 진료를 고려해볼 수 있습니다"
- ✅ 결정 안내: "개인 상태에 따라 상담을 통해 결정하는 것이 권장됩니다"
- 분량: 200~250자`,
  };

  const guide = sectionGuides[sectionKey] || `[섹션 주제] ${treatmentName} 안내`;

  const prevContext = prevSections.length > 0
    ? `[ 이전 섹션 — 표현 반복 금지 ]\n${prevSections.slice(-2).map((s, i) =>
        `${i + 1}. ${s.label}: ${s.content.slice(0, 80)}...`
      ).join("\n")}`
    : "";

  return `
${region} ${treatmentName} 진료 안내 (정보형) — [${meta?.label || sectionKey}] 섹션만 작성.

${guide}

[ 의료광고법 준수 — 절대 규칙 ]
- 1인칭 시점 금지 (저는/제가/받았어요)
- 가격 직접 명시 금지 → "병원 안내 참고"
- 효과 단정 금지 (확실히/100%/완치)
- 환자 유인 금지 (실비/할인/이벤트)
- 의료진·병원 직접 추천 금지

${getAiSmellGuide()}
${getKwDensityGuide(treatmentName)}
${getFlowTimelineGuide(sectionKey, "commercial")}

${prevContext}
${extraContext ? `[ 추가 지시 ]\n${extraContext}` : ""}

---
이 섹션만 작성. 소제목 포함. 최소 ${meta?.minChars || 200}자 이상.
정보형이지만 딱딱하지 않게. 자연스러운 안내 톤.
`.trim();
}

// ============================================================
// 3. 전체 블로그 생성 프롬프트 (단일 호출 — 거의 미사용)
// ============================================================
export function buildFullBlogPrompt(params) {
  const {
    treatmentName, region = "",
    targetId = "consult", blogTypeId = "review",
    extraContext = "", mode = "personal",
  } = params;

  const treatment = getTreatmentById(
    treatmentName === "자연유착 쌍꺼풀" ? "natural_double"
    : treatmentName === "실리프팅"       ? "sili_lifting"
    : treatmentName === "피코레이저"     ? "pico_laser"
    : treatmentName
  );

  if (!treatment) return `[오류] 시술 데이터를 찾을 수 없습니다: ${treatmentName}`;

  const seoData      = treatment.seoData || {};
  const direction    = getClinicDirection(treatment.id);
  const titleSample  = seoData.titlePatterns?.[0] || "";
  const flowBlock    = buildClinicFlowBlock(treatmentName);
  const keywords     = (seoData.keywords || []).slice(0, 8).join(", ");

  const modeNote = mode === "commercial"
    ? "\n[모드: 정보형 commercial] 1인칭 후기 금지. 의료광고법 준수 필수."
    : "\n[모드: 경험담 personal] 1인칭 솔직 후기 톤.";

  return `
다음 조건으로 ${region} ${treatmentName} 블로그 글을 작성해 주세요.${modeNote}

[ 기본 정보 ]
- 시술명: ${treatmentName}
- 지역: ${region}
- 시술 방향: ${direction.concern} → ${direction.effect}

[ 제목 방향 ]
${titleSample}

[ 섹션 흐름 ]
${flowBlock}

[ SEO 키워드 ]
${keywords}

${getAiSmellGuide()}

${extraContext ? `[ 추가 지시 ]\n${extraContext}` : ""}

---
6개 섹션으로 작성. 전체 2000자 이상.
`.trim();
}

// ============================================================
// 4. 제목 생성 프롬프트 (mode 분기)
// ============================================================
export function buildTitlePrompt(params) {
  const {
    treatmentName, region = "",
    blogTypeId = "review", count = 5, mode = "personal",
  } = params;

  const treatment = getTreatmentById(
    treatmentName === "자연유착 쌍꺼풀" ? "natural_double"
    : treatmentName === "실리프팅"       ? "sili_lifting"
    : treatmentName === "피코레이저"     ? "pico_laser"
    : treatmentName
  );

  const titlePatterns = treatment?.seoData?.titlePatterns || [];
  const keywords      = treatment?.seoData?.keywords?.slice(0, 6).join(", ") || "";

  const toneInstruction = mode === "commercial"
    ? `- 정보형 톤: "안내", "정보", "가이드", "진료" 키워드 사용
- "후기" 단어 사용 금지
- 광고·홍보 느낌 금지
- 예: "${region} ${treatmentName} 진료 안내｜시술 종류와 일반 정보"`
    : `- 경험담 톤: "후기", "기록", "경험" 키워드 가능
- 실제 경험자가 쓴 듯한 자연스러운 제목
- 광고·홍보 느낌 금지`;

  return `
${region} ${treatmentName} 블로그 제목 ${count}개 생성.

[ 조건 ]
${toneInstruction}
- 지역 키워드 포함: ${region}
- SEO 키워드 활용: ${keywords}
- 제목 길이: 25~40자

[ 참고 패턴 ]
${titlePatterns.slice(0, 3).join("\n")}

---
${count}개 제목을 번호 없이 한 줄씩 출력.
`.trim();
}

// ============================================================
// 5. 재생성 프롬프트
// ============================================================
export function buildRegeneratePrompt(params) {
  const {
    sectionKey, treatmentName, region = "",
    prevContent = "", feedback = "", mode = "personal",
  } = params;

  const meta = getSectionMeta(sectionKey);
  const sectionInst = buildClinicSectionInstruction(sectionKey, treatmentName, region);
  const forbidden = checkForbiddenPatterns(prevContent);
  const feedbackNote = forbidden.length > 0
    ? `이전 버전에서 발견된 금지 표현: ${forbidden.join(", ")}`
    : "";

  const modeNote = mode === "commercial"
    ? "[모드: 정보형] 의료광고법 준수. 1인칭·가격·효과보장 금지."
    : "[모드: 경험담] 1인칭 솔직 톤.";

  return `
[${meta?.label || sectionKey}] 섹션을 다시 작성해 주세요.

${modeNote}
${getAiSmellGuide()}

[ 이전 버전 ]
${prevContent}

[ 문제점 ]
${feedback || "더 자연스럽게 다시 작성"}
${feedbackNote}

[ 섹션 지시 ]
${sectionInst}

---
이전 버전과 다른 소재·구조로 작성.
같은 표현·문장 구조 반복 금지.
최소 ${meta?.minChars || 200}자 이상.
`.trim();
}

// ============================================================
// 6. 내부 유틸 — 섹션별 소재 힌트
// ============================================================
function getSectionHint(sectionKey, seoData) {
  switch (sectionKey) {
    case "concern":
      return `고민 소재: ${seoData.pains?.join(" / ") || ""}`;
    case "situation":
      return `도입부 힌트: ${seoData.intro?.join(" / ") || ""}`;
    case "consult":
      return `상담 질문 소재: ${seoData.consultQuestions?.join(" / ") || ""}`;
    case "reason":
      return `선택 기준: ${seoData.criteria?.join(" / ") || ""}\n비교 대상: ${
        seoData.compareWith?.map(c => `${c.method}(${c.diff})`).join(" / ") || ""
      }`;
    case "result":
      return `현장 장면: ${seoData.scenes?.map(s => s.title).join(" / ") || ""}`;
    case "closing":
      return `추천 대상: ${seoData.recommend?.join(" / ") || ""}`;
    default:
      return "";
  }
}

// ============================================================
// 7. 외부 export
// ============================================================
export { CLINIC_DIRECTION };

export const PROMPT_BUILDERS = {
  system:      buildSystemPrompt,
  fullBlog:    buildFullBlogPrompt,
  section:     buildSectionPrompt,
  title:       buildTitlePrompt,
  regenerate:  buildRegeneratePrompt,
};
