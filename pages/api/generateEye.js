// ============================================================
// pages/api/generateEye.js — 안과 전용 핸들러 v3.0
// 🚀 단일 호출 구조 (GPT 1번 호출 → 섹션 분리 후처리)
// 🆕 v3.0 — VS 위치 보정 마커 정밀화 + 약한 마무리 추가 차단
//    1) "선택한 이유는" / "고른 이유는" 등 약한 패턴까지 매칭 (12개 마커)
//    2) "이 후기가 ~ 고민하는 분들에게 참고가 됐으면" 통째 제거
// 🆕 v2.9 — repositionVsBlock 마커 9종 + 이미지 ALT 직후 회피
// 🆕 v2.8 — VS 블록 위치 강제 보정 (1차)
// 🆕 v2.7 — VS 블록 위치 최적화 (결정 헤더 직전 우선)
// 🆕 v2.6 — 헤더 없는 평문 fallback + 광고 톤 강력 차단
// 🆕 v2.5 — 톤 다양화 + 광고 톤 제거 1차
// 🆕 v2.4 — VS_BLOCKS / HOSPITAL_PICK_BLOCK
// 🆕 v2.3 — 사진 ALT 장면 구체화
// 🆕 v2.2 — 후기 → 판단 글 전환
// 🆕 v2.1 — 산부인과 v1.5c 패치 이식
// ============================================================
import OpenAI from "openai";
import {
  EYE_SYSTEM_PROMPT,
  buildEyeFullPrompt,
  getEyeImageAlts,
} from "../../lib/eye-prompts";
import { EYE_TREATMENTS } from "../../lib/eye-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================
// 정보 비교 블럭 (결정 섹션 아래 자동 삽입)
// ============================================================
const INFO_BLOCKS = {
  lasik: `
| 비교 항목 | 라식 | 라섹 | 스마일라식 | ICL |
|----------|------|------|-----------|-----|
| 회복 기간 | 2~3일 | 1~2주 | 2~3일 | 1주 |
| 통증 | 낮음 | 중간 | 매우 낮음 | 낮음 |
| 각막 절개 | 큼 | 없음(레이저) | 최소 | 없음(렌즈 삽입) |
| 가역성 | 불가 | 불가 | 불가 | 가능(렌즈 제거) |
`,
  lasek: `
| 비교 항목 | 라섹 | 라식 | 스마일라식 |
|----------|------|------|-----------|
| 회복 기간 | 1~2주 | 2~3일 | 2~3일 |
| 각막 보존 | 높음 | 낮음 | 중간 |
| 충격 안정성 | 우수 | 보통 | 우수 |
| 통증 | 중간 | 낮음 | 매우 낮음 |
`,
  smile_lasik: `
| 비교 항목 | 스마일라식 | 라식 | 라섹 |
|----------|-----------|------|------|
| 절개 크기 | 최소 | 큼 | 없음 |
| 회복 기간 | 2~3일 | 2~3일 | 1~2주 |
| 안구건조 부담 | 낮음 | 중간 | 낮음 |
| 통증 | 매우 낮음 | 낮음 | 중간 |
`,
  icl: `
| 비교 항목 | ICL | 라식 | 라섹 |
|----------|------|------|------|
| 가역성 | 가능 | 불가 | 불가 |
| 고도근시 | 가능 | 제한 | 제한 |
| 각막 보존 | 높음 | 낮음 | 중간 |
| 비용 | 높음 | 중간 | 낮음 |
`,
  cataract: `
| 비교 항목 | 단초점렌즈 | 다초점렌즈 |
|----------|----------|----------|
| 가까운 시야 | 돋보기 필요 | 자연스럽게 보임 |
| 야간 빛번짐 | 적음 | 있을 수 있음 |
| 비용 | 보험 적용 | 비급여 추가 |
`,
  presbyopia: `
| 비교 항목 | 노안 교정 | 돋보기 | 다초점 안경 |
|----------|----------|--------|------------|
| 일상 편의 | 우수 | 번거로움 | 보통 |
| 시야 자연스러움 | 자연스러움 | 분리됨 | 적응 필요 |
| 비용 | 일회성 | 저렴 | 중간 |
`,
  dry_eye: `
| 비교 항목 | 인공눈물 | IPL 치료 | 마이봄샘 관리 |
|----------|---------|---------|------------|
| 즉각 효과 | 있음 | 1~2주 후 | 1~2주 후 |
| 근본 개선 | 어려움 | 좋음 | 좋음 |
| 횟수 | 매일 | 4~5회 | 정기 |
`,
  glaucoma: `
| 비교 항목 | 약물치료 | 레이저 시술 | 수술 |
|----------|---------|-----------|------|
| 목적 | 안압 낮춤 | 방수 배출 개선 | 근본적 안압 조절 |
| 회복 | 없음 (지속 관리) | 1~2일 | 1~2주 |
| 비용 | 월 3~10만원 | 30~80만원 | 200~500만원 |
| 적용 시점 | 초기·중기 | 약물 효과 부족 시 | 진행성·말기 |
`,
  macular: `
| 비교 항목 | 항VEGF 주사 | 광역학 치료 | 경과 관찰 |
|----------|------------|-----------|---------|
| 목적 | 신생혈관 억제 | 비정상 혈관 파괴 | 진행 모니터링 |
| 주기 | 4~8주 간격 | 필요 시 | 3~6개월 |
| 비용 | 회당 50~150만원 | 회당 100~200만원 | 검사비만 |
| 진행 억제 | 강함 | 중간 | 없음 |
`,
  diabetic_retina: `
| 비교 항목 | 정기 검진 | 레이저 광응고술 | 항VEGF 주사 |
|----------|---------|-------------|------------|
| 목적 | 진행 모니터링 | 신생혈관 억제 | 황반부종 감소 |
| 주기 | 3~6개월 | 필요 시 | 4~8주 |
| 비용 | 10~30만원 | 30~80만원 | 회당 50~150만원 |
| 적용 시점 | 비증식성 | 증식성 진행 | 황반부종 동반 |
`,
  retina: `
| 비교 항목 | 정기 검진 | 안저 레이저 | 망막 수술 |
|----------|---------|-----------|---------|
| 목적 | 진행 확인 | 부분 치료 | 박리·열공 봉합 |
| 회복 | 없음 | 1~2일 | 1~2주 |
| 비용 | 10~30만원 | 50~150만원 | 200~500만원 |
| 적용 시점 | 초기 증상 | 망막열공·약한 출혈 | 망막박리 |
`,
  floaters: `
| 비교 항목 | 경과 관찰 | 레이저 시술 (YAG) | 유리체 절제술 |
|----------|---------|----------------|-------------|
| 목적 | 진행 모니터링 | 떠다니는 점 분쇄 | 유리체 자체 제거 |
| 회복 | 없음 | 1~2일 | 1~2주 |
| 비용 | 검사 5~20만원 | 30~80만원 | 200~400만원 |
| 적용 시점 | 양성 비문증 | 시야 방해 심함 | 망막박리 동반 |
`,
  dream_lens: `
| 비교 항목 | 드림렌즈 | 아트로핀 안약 | 일반 안경 |
|----------|---------|-------------|---------|
| 착용 시간 | 야간(취침 중) | 매일 점안 | 종일 |
| 낮 시간 시력 | 나안 확보 | 안경 필요 | 안경 필수 |
| 근시 진행 억제 | 강함 | 중간~강함 | 없음 |
| 비용 | 처방 80~150만원 | 월 1~3만원 | 안경값만 |
`,
};

// ============================================================
// 진료별 수치 데이터
// ============================================================
const EXAM_VALUES = {
  lasik:           { exam: "시력·안압·각막두께·각막지형도", recovery: "2~3일", pain: 2, cost: "150~250" },
  lasek:           { exam: "시력·안압·각막두께",           recovery: "1~2주", pain: 4, cost: "100~180" },
  smile_lasik:     { exam: "시력·안압·각막두께·각막지형도", recovery: "2~3일", pain: 1, cost: "250~350" },
  icl:             { exam: "시력·안압·전방깊이·각막내피세포", recovery: "3~7일", pain: 2, cost: "400~600" },
  cataract:        { exam: "시력·안압·안저·생체계측",      recovery: "1~2주", pain: 2, cost: "30~400" },
  presbyopia:      { exam: "시력·안압·각막지형도",         recovery: "1~2주", pain: 3, cost: "250~500" },
  retina:          { exam: "안저·OCT·시야검사",           recovery: "지속 관리 필요",  pain: 1, cost: "검사 5~20, 주사 50~150" },
  floaters:        { exam: "안저·세극등·OCT·산동검사",     recovery: "지속 관리 필요",  pain: 0, cost: "검사 5~20, 레이저 30~80" },
  glaucoma:        { exam: "안압·시야·OCT·시신경",        recovery: "지속 관리 필요",  pain: 1, cost: "약물 월 3~10, 검사 5~20" },
  macular:         { exam: "안저·OCT·형광안저혈관조영",   recovery: "지속 관리 필요",  pain: 3, cost: "주사 50~150 (회당)" },
  diabetic_retina: { exam: "안저·OCT·형광안저혈관조영",   recovery: "지속 관리 필요",  pain: 1, cost: "검사 10~30, 치료 50~150" },
  dry_eye:         { exam: "눈물막·마이봄샘·쉬르머검사",  recovery: "1~2주", pain: 2, cost: "10~50" },
  conjunctivitis:  { exam: "결막·각막 정밀검사",          recovery: "3~7일", pain: 2, cost: "5~10" },
  stye:            { exam: "눈꺼풀 정밀검사",             recovery: "3~5일", pain: 3, cost: "5~10" },
  strabismus:      { exam: "사시각·양안시·시력",          recovery: "1~2주", pain: 3, cost: "30~80" },
  myopia_control:  { exam: "시력·안축장·각막곡률",        recovery: "정기 관리",       pain: 1, cost: "월 5~15" },
  dream_lens:      { exam: "시력·각막곡률·각막지형도·눈물막", recovery: "정기 관리",     pain: 1, cost: "처방 80~150, 정기검진 5~10" },
  amblyopia:       { exam: "시력·굴절·시기능",            recovery: "정기 관리",       pain: 0, cost: "5~20" },
  eye_checkup:     { exam: "시력·안압·안저·OCT",          recovery: "당일",            pain: 0, cost: "5~15" },
};

// ============================================================
// 텍스트 후처리
// ============================================================
function cleanText(text, keyword, region) {
  let t = text;

  // ── v2.1 어미 정리 (산부인과 v1.5c 이식) ──
  // 어색한 종결 어미 → 자연스러운 구어체로
  t = t.replace(/자고예요/g, "더라고요");
  t = t.replace(/라고예요/g, "라더라고요");
  t = t.replace(/했었어요/g, "했어요");
  t = t.replace(/했었거든요/g, "했거든요");
  t = t.replace(/했었습니다/g, "했습니다");
  t = t.replace(/되었어요/g, "됐어요");
  t = t.replace(/되었거든요/g, "됐거든요");
  t = t.replace(/되었습니다/g, "됐습니다");
  t = t.replace(/하였어요/g, "했어요");
  t = t.replace(/하였습니다/g, "했습니다");
  t = t.replace(/이었어요/g, "였어요");
  t = t.replace(/이었습니다/g, "였습니다");
  // 글에서 자주 보이는 어색한 ~았/었었 패턴
  t = t.replace(/봤었어요/g, "봤어요");
  t = t.replace(/갔었어요/g, "갔어요");
  t = t.replace(/왔었어요/g, "왔어요");
  t = t.replace(/받았었어요/g, "받았어요");

  // ── v2.1 문두 쉼표 정리 ──
  // 문장 시작 직후 어색한 쉼표 (", ~"로 시작하는 패턴)
  t = t.replace(/(\n)\s*,\s*/g, "$1");
  t = t.replace(/^\s*,\s*/g, "");
  // 헤더 직후 쉼표
  t = t.replace(/(##\s*[^\n]+\n+)\s*,\s*/g, "$1");
  // 문단 시작이 "그래서, " "그런데, " 같은 단어+쉼표 형태일 때 쉼표 제거 (자연스러움 ↑)
  t = t.replace(/(그래서|그런데|그리고|그러나|하지만|또한|그러면서|그러다|그러니까)\s*,\s+/g, "$1 ");

  // 조사 오류
  t = t.replace(/안과를을/g, "안과를");
  t = t.replace(/안과을를/g, "안과를");
  t = t.replace(/을을/g, "을");
  t = t.replace(/를를/g, "를");
  t = t.replace(/이이/g, "이");
  t = t.replace(/가가/g, "가");
  t = t.replace(/은은/g, "은");
  t = t.replace(/는는/g, "는");
  t = t.replace(/와와/g, "와");
  t = t.replace(/과과/g, "과");

  // 마침표 오타
  t = t.replace(/(\S)\.\s*라는/g, "$1이라는");

  // 공백 오류
  t = t.replace(/를\s+\s+/g, "를 ");
  t = t.replace(/받고나면/g, "받고 나면");
  t = t.replace(/받고나서/g, "받고 나서");

  // ── v2.2 키워드 반복 — 대명사 교체 비활성화 ──
  // "해당 진료" 같은 어색한 치환은 신뢰도를 깨뜨림 (병원글 치명적)
  // 키워드 노출은 SEO에 유리하므로 그대로 유지하되,
  // GPT가 이미 만든 "해당 진료/이 진료/이 치료/이 시술"은 진료명으로 복원
  if (keyword) {
    t = t.replace(/해당\s*진료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|진단|치료|관리|시작|선택|받|하|시|할|진행|결정)/g, keyword);
  }

  // GPT가 멋대로 "이 진료/이 치료/이 시술" 같은 대명사로 바꾼 경우 → 진료명으로 복원
  if (keyword) {
    t = t.replace(/이\s*진료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|진단|치료|관리|시작|선택|받|하|시|할|진행|결정)/g, keyword);
    t = t.replace(/이\s*치료(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|시작|선택|받|하|시|할|진행|결정)/g, keyword);
    t = t.replace(/이\s*시술(?=\s|를|을|이|가|은|는|에|와|과|로|의|입|입니다|예요|이에요|에서|시작|선택|받|하|시|할|진행|결정)/g, keyword);
  }

  // 단어 중복 자동 정리 ("노안 노안 교정", "라식 라식" 같은 패턴)
  // 한글 2~5자 단어가 공백으로 연속 반복되는 경우 1개로 축약
  t = t.replace(/([가-힣]{2,5})\s+\1(\s|을|를|이|가|은|는|에|와|과|로|의|$)/g, "$1$2");
  t = t.replace(/([가-힣]{2,5})\1(을|를|이|가|은|는|에|와|과|로|의)/g, "$1$2");

  // 어색한 톤 정리
  t = t.replace(/그래서 나는/g, "그래서");
  t = t.replace(/그러나 나는/g, "그러나");
  t = t.replace(/하지만 나는/g, "하지만");

  // 신뢰도 깨는 문장 제거 (눈 진료인데 다른 감각 언급 등)
  t = t.replace(/[^.!?\n]*(?:소리도 잘 들|청각|미각|후각이 좋아|냄새를 잘)[^.!?\n]*[.!?]\s*/g, "");
  // 모호한 자연치유 문장 제거
  t = t.replace(/[^.!?\n]*(?:자연 치유의 힘|체질적으로도 변화|기혈 순환에 도움)[^.!?\n]*[.!?]\s*/g, "");

  // ── v2.1 FORBIDDEN 표현 차단 (인수인계 PART 4-2) ──
  // AI 냄새 강한 클리셰 문장 통째로 제거
  const FORBIDDEN_SENTENCE_PATTERNS = [
    /[^.!?\n]*드디어 결심하고[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*결국 선택하게 되었[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*마음이 편안해졌[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*믿음이 갔[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*친절하고 전문적이[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*따뜻한 차 한 잔[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*차분하고 따뜻한 느낌[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*미소를 되찾[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*새로운 삶[^.!?\n]*[.!?]\s*/g,
    /[^.!?\n]*삶의 질이 크게[^.!?\n]*[.!?]\s*/g,
  ];
  for (const re of FORBIDDEN_SENTENCE_PATTERNS) {
    t = t.replace(re, "");
  }

  // ── v2.5 추천 톤 차단 (광고 느낌 제거) ──
  // "추천드리고 싶어요", "강력 추천드려요" → 판단형 표현으로 대체
  t = t.replace(/추천드리고 싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/추천드립니다/g, "참고하시면 좋겠습니다");
  t = t.replace(/강력(히|하게)?\s*추천(해요|합니다|드려요|드립니다)/g, "참고하시면 좋겠어요");
  t = t.replace(/꼭\s*추천(해요|합니다|드려요|드립니다)/g, "참고가 되었으면 합니다");
  // 광고형 종결 차단
  t = t.replace(/적극\s*추천(해요|합니다|드려요|드립니다)/g, "참고할 만하다고 봐요");
  // "~분들에게는 강력히 추천하고 싶어요" 같은 확장형도 정리
  t = t.replace(/([가-힣]+분들?에게는?)\s*강력히\s*추천하고\s*싶어요/g, "$1 참고가 됐으면 좋겠어요");
  t = t.replace(/([가-힣]+분들?에게는?)\s*추천하고\s*싶어요/g, "$1 참고가 됐으면 좋겠어요");

  // ── v2.6 추천 톤 추가 차단 ──
  // "추천할 수 있을 것 같아요" → 판단형
  t = t.replace(/추천할\s*수\s*있을\s*것\s*같아요/g, "참고가 될 수 있다고 봐요");
  t = t.replace(/추천할\s*만하다고\s*생각해요/g, "참고할 만하다고 봐요");
  t = t.replace(/추천하고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  // "권해드리고 싶어요" / "권해드립니다"
  t = t.replace(/권해드리고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  t = t.replace(/권해드립니다/g, "참고하시면 좋겠습니다");
  t = t.replace(/권하고\s*싶어요/g, "참고가 됐으면 좋겠어요");
  // "고려해보는 것을 권해드리고 싶어요" → 자연스럽게
  t = t.replace(/고려해보는\s*것을?\s*권해(드리고\s*싶어요|드립니다|요)/g, "고려해볼 만한 부분이라고 봐요");
  // "한 번쯤 고려해보는 것을" 같은 광고 어조
  t = t.replace(/한\s*번쯤\s*고려해보는\s*것을?/g, "검사 결과에 따라 고려해볼 만한 부분이라고");
  // "재방문 의사도 있고" / "재방문 의사도 충분히 있고" → 광고형
  t = t.replace(/재방문\s*의사도?\s*(충분히\s*)?있고[,.]?\s*/g, "");
  t = t.replace(/주변에\s*적극적으로\s*추천할\s*수\s*있을\s*것\s*같아요\s*\.?/g, "");

  // ── v2.9 약한 마무리 클리셰 차단 ──
  // "이 후기가 조금이나마 도움이 되었으면 좋겠어요" 같은 진부한 마무리 한 줄 통째로 제거
  // (어차피 시스템이 판단형 마무리 한 줄을 별도로 추가함 → 중복 제거)
  t = t.replace(/(이\s*후기가\s*)?조금이나마\s*도움이\s*되(었으면|면)\s*(좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");
  t = t.replace(/이\s*후기가\s*도움이\s*되(었으면|면)\s*(좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");
  // "라식이 좋은 기준이 될 수 있을 것 같아요" — 밋밋한 광고형
  t = t.replace(/([가-힣A-Za-z]+이\s*)?좋은\s*기준이\s*될\s*수\s*있을\s*것\s*같아요\.?\s*/g, "");

  // ── v3.0 약한 마무리 추가 차단 ──
  // "이 후기가 [무엇을] 고민하는 분들에게 참고가 됐으면 좋겠어요" 통째 제거
  // (시스템이 별도로 강한 판단형 마무리를 추가하므로 중복)
  t = t.replace(/이\s*후기가\s*[^.\n]*고민하(시|는)는?\s*분들?에게\s*참고가\s*(됐|되)으?면\s*좋(겠|겠어요|겠습니다)\.?\s*/g, "");
  t = t.replace(/[^.\n]*고민하시는?\s*분들?(께|에게)\s*참고가\s*(됐|되)으?면\s*좋(겠|겠어요|겠습니다)\.?\s*/g, "");
  // "이 후기가 ~ 분들께 참고가 되었으면" 변형
  t = t.replace(/이\s*후기가\s*[^.\n]{0,40}참고가\s*(됐|되)으?면\s*(합니다|좋겠|좋겠어요|좋겠습니다)\.?\s*/g, "");

  // 연속 나열 부사 정리 ("특히, 또한, 무엇보다" 연속 사용 → AI 티)
  // 같은 문단 안에서 2회 이상 등장하면 2번째부터 빈 문자열로
  t = t.replace(/(특히,?\s+)(.*?)(특히,?\s+)/g, "$1$2");
  t = t.replace(/(또한,?\s+)(.*?)(또한,?\s+)/g, "$1$2");
  t = t.replace(/(무엇보다,?\s+)(.*?)(무엇보다,?\s+)/g, "$1$2");

  // ── v2.4 AI 종결 어미 반복 다양화 (강화) ──
  // "~더라고요" 2회 이상 연속 → 일부를 판단형으로 변환
  const vary1 = ["라고 판단했어요", "이 기준이 됐어요", "쪽으로 결정하게 됐어요", "이 결정 요인이었어요"];
  let vary1Idx = 0;
  t = t.replace(/([^.!?\n]+)더라고요\.([^.!?\n]+)더라고요\./g, (m, a, b) => {
    const replacement = vary1[vary1Idx % vary1.length];
    vary1Idx++;
    return a + "더라고요." + b + replacement + ".";
  });

  // "~했어요" 4회 이상 연속 → 마지막 2개를 변주
  t = t.replace(/(했어요\.[^.!?\n]+){3,}/g, (m) => {
    const sentences = m.split(/(?<=했어요\.)/);
    if (sentences.length >= 4) {
      sentences[sentences.length - 2] = sentences[sentences.length - 2].replace(/했어요\.$/, "했습니다.");
      if (sentences.length >= 5) {
        sentences[sentences.length - 3] = sentences[sentences.length - 3].replace(/했어요\.$/, "한 셈이에요.");
      }
    }
    return sentences.join("");
  });


  // 중간 해시태그 제거 (강화)
  // - 줄 끝에 붙은 해시태그: "...편안하게 사용했어요. #강남안과노안교정"
  // - 줄 단독 해시태그: "\n#XXX\n"
  // 마무리 섹션 안의 본문 중간 해시태그도 모두 제거 (마지막 해시태그 묶음은 따로 추가됨)
  t = t.replace(/\s+#[가-힣A-Za-z0-9]+(?=\s|$|[.,!?])/g, "");
  t = t.replace(/\n#[^\n]+(?=\n)/g, "\n");

  return t;
}

// ============================================================
// 헤더 누락 자동 복원 — GPT가 ## 헤더 없이 평문으로만 출력했을 때
// 문단 길이/위치 기반으로 6섹션 헤더 강제 삽입
// ============================================================
function restoreHeadersIfMissing(text) {
  // 핵심 헤더 카운트
  const requiredHeaders = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 마무리"];
  const present = requiredHeaders.filter((h) => text.includes(h)).length;

  // 3개 이상 정상이면 그대로 반환
  if (present >= 3) return text;

  // 헤더가 거의 없으면 → 평문으로 작성된 케이스
  // 제목 부분 분리
  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const title = titleMatch ? titleMatch[1] : "";
  const body = titleMatch ? text.slice(titleMatch[0].length) : text;

  // 본문을 빈 줄 기준으로 문단 분할 (이미지·표 제외하고)
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0);

  if (paragraphs.length < 5) return text; // 너무 짧으면 복원 포기

  // 6섹션 분배 — 문단 비율로
  const sectionLabels = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 진료 후 변화", "## 마무리"];
  const total = paragraphs.length;
  const out = [title.trim()];

  // 분배: 고민(15%) 탐색(15%) 상담(25%) 결정(15%) 변화(20%) 마무리(10%)
  const ratios = [0.15, 0.15, 0.25, 0.15, 0.20, 0.10];
  let idx = 0;
  for (let s = 0; s < sectionLabels.length; s++) {
    const count = s === sectionLabels.length - 1
      ? total - idx
      : Math.max(1, Math.round(total * ratios[s]));
    if (idx >= total) break;

    out.push("");
    out.push(sectionLabels[s]);
    out.push("");

    const sectionParas = paragraphs.slice(idx, idx + count);

    // 변화 섹션은 ### 시간 헤더 추가
    if (sectionLabels[s] === "## 진료 후 변화" && sectionParas.length >= 4) {
      const timeLabels = ["### 1일", "### 1주", "### 2주", "### 1개월"];
      sectionParas.forEach((p, i) => {
        if (i < 4) out.push(timeLabels[i]);
        out.push(p);
        out.push("");
      });
    } else {
      sectionParas.forEach((p) => {
        out.push(p);
        out.push("");
      });
    }

    idx += count;
  }

  return out.join("\n");
}

// ============================================================
// v2.1 후킹 패턴 강화 — 첫 문장이 약한 클리셰면 보정
// "어느 날 거울을 보는데..." / "화면 속 셀카를..." 같은 약한 시작 차단
// ============================================================
function strengthenOpening(text) {
  // 고민 섹션의 첫 문단을 추출
  const concernIdx = text.indexOf("## 고민");
  if (concernIdx === -1) return text;

  const afterHeader = text.indexOf("\n", concernIdx);
  if (afterHeader === -1) return text;

  // 첫 문단 시작 위치 (헤더 다음 빈 줄 건너뛰기)
  let firstParaStart = afterHeader + 1;
  while (firstParaStart < text.length && /\s/.test(text[firstParaStart])) {
    firstParaStart++;
  }

  // 첫 문단의 첫 문장만 검사 (약 40자)
  const firstSentence = text.slice(firstParaStart, firstParaStart + 50);

  // 약한 패턴 감지
  const WEAK_PATTERNS = [
    /^어느 날 거울/,
    /^거울을 보는데/,
    /^화면 속 셀카/,
    /^어느 날 문득/,
    /^어느 순간부터/,
    /^언젠가부터/,
  ];

  const isWeak = WEAK_PATTERNS.some((re) => re.test(firstSentence));
  if (!isWeak) return text;

  // 약한 문장 1개를 통째로 제거 (다음 문장이 hook 역할)
  // 첫 마침표/물음표/느낌표까지 잘라냄
  const endMatch = text.slice(firstParaStart).match(/^[^.!?\n]+[.!?]\s*/);
  if (!endMatch) return text;

  return text.slice(0, firstParaStart) + text.slice(firstParaStart + endMatch[0].length);
}

// ============================================================
// 오타 수정
// ============================================================
function fixCommonTypos(text) {
  let t = text;
  t = t.replace(/돋보리/g, "돋보기");
  t = t.replace(/돋보가/g, "돋보기");
  t = t.replace(/안경테이/g, "안경테가");
  t = t.replace(/시야이/g, "시야가");
  t = t.replace(/렌즈을/g, "렌즈를");
  t = t.replace(/안과를을/g, "안과를");
  t = t.replace(/안과을를/g, "안과를");
  return t;
}

// ============================================================
// 헤더 정규화 — "## 상담을 받으러..." 같이 헤더와 본문이 붙은 경우
// "## 상담\n\n을 받으러..." 형태로 강제 분리
// ============================================================
function normalizeHeaders(text) {
  const SECTION_LABELS = ["고민", "탐색", "상담", "결정", "변화", "진료 후 변화", "마무리"];
  let t = text;

  for (const label of SECTION_LABELS) {
    // ## 라벨[붙은 글자] → ## 라벨\n\n[붙은 글자]
    // 단, ## 라벨 다음에 줄바꿈/공백/끝이 아닌 한글이 바로 붙은 경우만
    const re = new RegExp("(##\\s*" + label + ")(?!\\s*\\n)(?!\\s*$)([가-힣을를이가은는에과와로의])", "g");
    t = t.replace(re, "$1\n\n$2");
  }

  // ### 1일/1주/2주/1개월 헤더도 동일 처리
  t = t.replace(/(###\s*\d+(?:일|주|개월))(?!\s*\n)(?!\s*$)([가-힣을를이가은는에과와로의])/g, "$1\n\n$2");

  return t;
}

// ============================================================
// GPT가 만든 표 제거 (헤더 없는 경우 포함)
// 결정 섹션 직전·직후의 표를 INFO_BLOCK과 중복되면 제거
// ============================================================
function removeOrphanTable(text, treatmentId) {
  if (!INFO_BLOCKS[treatmentId]) return text;

  // 표 패턴: | ... | ... | 형태가 3줄 이상 연속
  // 결정 섹션 앞쪽(상담~결정 사이)에 있는 표는 제거
  const consultIdx = text.indexOf("## 상담");
  const decisionIdx = text.indexOf("## 결정");
  if (consultIdx === -1 || decisionIdx === -1) return text;

  // 상담~결정 사이 영역
  const before = text.slice(0, consultIdx);
  const middle = text.slice(consultIdx, decisionIdx);
  const after  = text.slice(decisionIdx);

  // 표 블록 감지 후 제거 (| 시작하는 줄 3줄 이상 연속)
  const cleaned = middle.replace(/\n\|[^\n]+\|\n\|[^\n]*[-:]+[^\n]*\|\n(?:\|[^\n]+\|\n?)+/g, "\n");

  return before + cleaned + after;
}

// ============================================================
// 정보 블럭 결정 섹션 아래 삽입
// ============================================================
function insertInfoBlock(text, treatmentId) {
  const block = INFO_BLOCKS[treatmentId];
  if (!block) return text;

  const firstLine = block.trim().split("\n")[0];
  if (text.includes(firstLine)) return text;

  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx === -1) return text + "\n\n" + block;

  const nextSection = text.indexOf("\n## ", decisionIdx + 1);
  if (nextSection === -1) return text + "\n\n" + block;

  return text.slice(0, nextSection) + "\n\n" + block + "\n" + text.slice(nextSection);
}

// ============================================================
// v2.2 결정 섹션 판단 근거 강제 삽입
// "후기" → "판단 글" 전환의 핵심
// 각 진료별로 "왜 다른 옵션이 아니라 이걸 선택했는가" 명확화
// ============================================================
const DECISION_REASONS = {
  lasik: {
    reject: "라섹",
    why: "각막 두께가 510μm 이상으로 충분했고, 직업이 야외 활동이 적은 사무직이라 충격 위험이 낮았어요. 라섹은 회복이 1~2주 걸린다고 해서 업무 복귀 일정과 맞지 않았고요.",
    criteria: "각막 두께·직업 환경·회복 일정",
  },
  lasek: {
    reject: "라식",
    why: "각막 두께가 480μm로 라식 기준에 못 미쳤고, 격렬한 운동을 자주 해서 충격 안정성이 더 중요했어요. 라식은 외상 시 각막 절편이 밀릴 위험이 있다고 들어서 보류했어요.",
    criteria: "각막 두께·운동 강도·충격 안정성",
  },
  smile_lasik: {
    reject: "라식",
    why: "안구건조증 경향이 있어서 절개 부담이 적은 쪽이 필요했어요. 라식은 각막 절편을 들어올리면서 신경 손상이 더 크다고 해서 회복 후 건조감이 우려됐어요.",
    criteria: "안구건조 부담·절개 크기·신경 보존",
  },
  icl: {
    reject: "라식·라섹",
    why: "근시가 -8디옵터 이상 고도근시여서 각막 깎는 방식은 한계가 있었어요. 각막 두께도 제한적이라 ICL이 가역적이고 각막 보존이 가능하다는 점에서 적합하다고 판단했어요.",
    criteria: "근시 정도·각막 두께·가역성",
  },
  cataract: {
    reject: "단초점 렌즈",
    why: "독서·운전·스마트폰 사용이 모두 잦아서 단초점은 결국 돋보기가 필요해진다는 점이 걸렸어요. 다초점은 적응 기간이 있지만 일상 편의가 훨씬 낫다고 해서 결정했어요.",
    criteria: "생활 패턴·근거리 사용 빈도·돋보기 의존도",
  },
  presbyopia: {
    reject: "다초점 안경",
    why: "안경 적응 기간이 길고 계단 내려갈 때 어지럽다는 후기가 많아서 보류했어요. 노안 교정 수술은 일회성이고 일상 편의가 즉각 좋다는 점이 결정 요인이었어요.",
    criteria: "안경 적응 부담·일상 편의·일회성 비용",
  },
  glaucoma: {
    reject: "수술 우선",
    why: "초기 단계라 안압이 약물로 충분히 조절되는 상태였어요. 수술은 비가역적이라 약물·레이저로 단계적 관리하는 게 더 안전하다고 판단했어요.",
    criteria: "진행 단계·약물 반응성·가역성",
  },
  macular: {
    reject: "경과 관찰",
    why: "습성 황반변성 진단을 받아서 단순 관찰만으로는 진행 위험이 컸어요. 항VEGF 주사가 신생혈관 억제 효과가 강하다고 해서 적극 치료를 선택했어요.",
    criteria: "건성·습성 구분·신생혈관 유무·진행 속도",
  },
  retina: {
    reject: "단순 검진",
    why: "비문증과 광시증이 같이 있어서 망막열공 가능성이 있다고 했어요. 단순 검진만으로는 안 되고 안저 레이저로 예방 치료가 필요하다고 판단했어요.",
    criteria: "동반 증상·망막열공 위험·예방 치료 필요성",
  },
  floaters: {
    reject: "유리체 절제술",
    why: "양성 비문증으로 확인됐고 시야 방해가 견딜 만한 수준이었어요. 절제술은 회복이 길고 합병증 위험이 있어서 YAG 레이저로 떠다니는 점만 분쇄하는 쪽을 골랐어요.",
    criteria: "비문증 종류·시야 방해 정도·합병증 위험",
  },
  diabetic_retina: {
    reject: "정기 관찰",
    why: "이미 증식성 단계로 진행됐고 황반부종까지 동반된 상태였어요. 관찰만으로는 시력 저하가 빨라질 수 있어서 항VEGF 주사 병행을 결정했어요.",
    criteria: "당뇨 진행 단계·황반부종 유무·시력 변화 속도",
  },
  dry_eye: {
    reject: "인공눈물만",
    why: "마이봄샘 기능 검사에서 분비 기능이 많이 떨어진 상태였어요. 인공눈물은 즉각 효과뿐이라 근본 개선을 위해 IPL 치료를 4회 코스로 결정했어요.",
    criteria: "마이봄샘 기능·근본 개선 필요성·치료 회차",
  },
  dream_lens: {
    reject: "일반 안경",
    why: "아이가 1년에 -0.75디옵터씩 근시가 빠르게 진행되고 있어서 진행 억제가 필수였어요. 일반 안경은 진행 억제 효과가 없어서 드림렌즈를 선택했어요.",
    criteria: "근시 진행 속도·연령·진행 억제 효과",
  },
  myopia_control: {
    reject: "관찰만",
    why: "축성 근시가 빠르게 진행 중이라 관찰만으론 부족했어요. 드림렌즈·아트로핀·DIMS 안경 중 아이 연령과 적응 가능성 따져서 가장 적합한 방식을 골랐어요.",
    criteria: "축성 근시 진행·연령·적응 가능성",
  },
  strabismus: {
    reject: "안경 처방",
    why: "사시각이 25프리즘디옵터 이상이라 안경만으로는 교정이 어려웠어요. 양안시 발달 시기를 놓치지 않기 위해 수술 시기를 결정해야 한다고 안내받았어요.",
    criteria: "사시각·양안시 발달·수술 시기",
  },
  amblyopia: {
    reject: "지켜보기",
    why: "약시는 시력 발달 시기를 놓치면 회복이 어려워요. 6세 이전이라 가림치료 효과가 가장 큰 시기라고 해서 즉시 시작하기로 했어요.",
    criteria: "발견 시기·시력 발달 단계·가림치료 효과",
  },
  conjunctivitis: {
    reject: "자가 회복",
    why: "세균성·바이러스성·알레르기성 결막염은 치료 약이 다 다르다고 해요. 자가 판단으로 잘못된 약을 쓰면 더 악화될 수 있어서 정확한 진단부터 받았어요.",
    criteria: "결막염 종류 구분·치료 약 차이·악화 위험",
  },
  stye: {
    reject: "온찜질만",
    why: "초기엔 온찜질로 호전되기도 하지만 4~5일 지나도 안 가라앉으면 농양이 잡힌 거라고 했어요. 절개 배농이 더 빠른 회복 방법이라 결정했어요.",
    criteria: "다래끼 진행 단계·농양 형성 여부·회복 속도",
  },
  eye_checkup: {
    reject: "안 받기",
    why: "안압·안저까지 종합으로 보는 정밀검진은 1~2년에 한 번이 권장이에요. 녹내장·당뇨망막병증은 초기에 자각 증상이 거의 없어서 주기적으로 받기로 했어요.",
    criteria: "정기 검진 주기·자각 증상 부재·조기 발견 효과",
  },
};

function injectDecisionReason(text, treatmentId, region, name) {
  const reason = DECISION_REASONS[treatmentId];
  if (!reason) return text;

  // 이미 비슷한 판단 근거가 들어있으면 패스
  const firstCriterion = reason.criteria.split("·")[0];
  if (text.includes(firstCriterion) && text.includes(reason.reject)) return text;

  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx === -1) return text;

  const nextSection = text.indexOf("\n## ", decisionIdx + 1);
  const insertAt = nextSection === -1 ? text.length : nextSection;

  const inject =
    "\n\n" +
    reason.reject + "이 아니라 " + name + "을(를) 고른 이유는 명확했어요. " +
    reason.why +
    " 결국 " + reason.criteria + " 이 세 가지가 판단의 기준이 됐어요.\n";

  return text.slice(0, insertAt) + inject + text.slice(insertAt);
}

// ============================================================
// v2.2 탐색 섹션 — 병원 비교 4축 강제 삽입
// 검사·상담·비용·장비 차이를 구체화
// ============================================================
function injectSearchComparison(text, region, name) {
  // 이미 4축 중 3개 이상 들어있으면 패스
  const hasExam = /(검사 항목|정밀 검사|기본 검사)/.test(text);
  const hasConsult = /(상담 시간|상담 스타일|설명 방식|진료 시간)/.test(text);
  const hasCost = /(비용 범위|가격대|금액 차이|비급여)/.test(text);
  const hasEquip = /(장비|기기 차이|최신 장비|레이저 종류)/.test(text);
  const presentCount = [hasExam, hasConsult, hasCost, hasEquip].filter(Boolean).length;
  if (presentCount >= 3) return text;

  const searchIdx = text.indexOf("## 탐색");
  if (searchIdx === -1) return text;

  const nextSection = text.indexOf("\n## ", searchIdx + 1);
  const insertAt = nextSection === -1 ? text.length : nextSection;

  const inject =
    "\n\n" + region + "에서 안과 3곳을 비교했을 때 차이가 분명했어요. " +
    "검사 측면에서는 기본 검사만 하는 곳과 각막지형도·내피세포·눈물막까지 종합으로 보는 곳이 갈렸고, " +
    "상담은 5분 안에 끝나는 곳과 30분 이상 충분히 설명해주는 곳이 달랐어요. " +
    "비용은 같은 " + name + "이라도 100만원 가까이 차이가 나는 경우가 있었고, " +
    "장비는 최신 레이저 도입 여부와 관리 상태에서 격차가 컸어요. " +
    "결국 검사 항목·상담 시간·비용 범위·장비 수준 이 네 가지를 비교 기준으로 잡았어요.\n";

  return text.slice(0, insertAt) + inject + text.slice(insertAt);
}

// ============================================================
// 진료별 전문성 한 줄 — 상담 섹션 끝에 자동 삽입
// (SEO 키워드 + 전문성 동시 강화)
// ============================================================
const EXPERT_LINES = {
  presbyopia:   "{region} 안과 노안 교정 기준으로 개인 눈 상태에 따라 다초점 렌즈 방식과 레이저 방식이 나뉜다고 안내받았어요.",
  cataract:     "{region} 안과 백내장 수술 기준으로 단초점·다초점·연속초점 렌즈 중 생활 패턴에 맞는 걸 고른다고 설명해주셨어요.",
  lasik:        "{region} 안과 라식 기준으로 각막 두께와 직업 환경까지 함께 고려해서 결정하는 경우가 많다고 설명해주셨어요.",
  lasek:        "{region} 안과 라섹 기준으로 각막 두께가 얇거나 충격 위험이 있는 직업이면 더 적합하다고 안내받았어요.",
  smile_lasik:  "{region} 안과 스마일라식 기준으로 절개 부담이 적어 회복이 빠르고 안구건조 부담도 낮다고 설명해주셨어요.",
  icl:          "{region} 안과 ICL 기준으로 각막을 보존하면서도 고도근시 교정이 가능하고 필요 시 제거도 된다고 안내받았어요.",
  glaucoma:     "{region} 안과 녹내장 기준으로 안압 정도와 진행 단계에 따라 약물·레이저·수술이 단계적으로 결정된다고 설명해주셨어요.",
  macular:      "{region} 안과 황반변성 기준으로 건성·습성에 따라 관리 방향이 다르고 습성은 항VEGF 주사가 핵심이라고 안내받았어요.",
  retina:       "{region} 안과 망막 검진 기준으로 안저·OCT·시야검사를 함께 봐서 망막박리·열공 여부까지 확인한다고 설명해주셨어요.",
  floaters:     "{region} 안과 비문증 기준으로 양성 비문증인지 망막박리·열공 동반인지 산동검사로 구분한다고 안내받았어요.",
  diabetic_retina: "{region} 안과 당뇨망막병증 기준으로 비증식성·증식성 단계에 따라 관찰·레이저·주사 치료가 나뉜다고 설명해주셨어요.",
  dry_eye:      "{region} 안과 안구건조증 기준으로 마이봄샘 기능 검사 결과에 따라 IPL·LipiFlow·인공눈물 방식이 나뉜다고 안내받았어요.",
  dream_lens:   "{region} 안과 드림렌즈 기준으로 각막 곡률과 도수에 따라 처방이 달라지고 정기 검진이 필수라고 설명해주셨어요.",
  myopia_control: "{region} 안과 근시 진행 억제 기준으로 드림렌즈·아트로핀·DIMS 안경 중 아이 상태에 맞춰 결정한다고 안내받았어요.",
  strabismus:   "{region} 안과 사시 교정 기준으로 사시각·연령·양안시 발달 정도에 따라 수술과 안경 처방이 나뉜다고 설명해주셨어요.",
  amblyopia:    "{region} 안과 약시 치료 기준으로 발견 시기가 빠를수록 가림치료 효과가 크다고 안내받았어요.",
};

function injectExpertLine(text, treatmentId, region) {
  const tpl = EXPERT_LINES[treatmentId];
  if (!tpl) return text;

  const line = "\n\n" + tpl.replace(/{region}/g, region) + "\n";

  // 이미 비슷한 문장 있으면 패스
  if (text.includes(tpl.replace(/{region}/g, region).slice(0, 25))) return text;

  // 상담 섹션 끝(다음 ## 헤더 직전)에 삽입
  const consultIdx = text.indexOf("## 상담");
  if (consultIdx === -1) return text + line;

  const nextSection = text.indexOf("\n## ", consultIdx + 1);
  if (nextSection === -1) return text + line;

  return text.slice(0, nextSection) + line + text.slice(nextSection);
}

// ============================================================
// 수치 강제 삽입
// ============================================================
function injectExamValue(text, treatmentId) {
  const v = EXAM_VALUES[treatmentId];
  if (!v) return text;

  const hasNumber = /\d/.test(text);
  const hasCost = /(만원|비용|가격)/.test(text);
  if (hasNumber && hasCost) return text;

  const CHRONIC_IDS = ["glaucoma", "macular", "diabetic_retina", "retina", "floaters", "myopia_control", "dream_lens", "amblyopia"];
  const isChronic = CHRONIC_IDS.includes(treatmentId);

  const inject = isChronic
    ? "\n\n실제 검사 항목은 " + v.exam + " 중심으로 진행됐고, " +
      "이 질환은 " + v.recovery + "로 꾸준한 관리가 핵심이라고 해요. " +
      "검사·약물 비용은 " + v.cost + "만원 선이라고 안내받았어요.\n"
    : "\n\n실제 검사 항목은 " + v.exam + " 중심으로 진행됐고, " +
      "회복 기간은 " + v.recovery + " 정도, 통증은 10점 기준 " + v.pain + "점 정도, " +
      "비용은 " + v.cost + "만원 선이라고 안내받았어요.\n";

  const consultIdx = text.indexOf("## 상담");
  if (consultIdx === -1) return text + inject;

  const nextSection = text.indexOf("\n## ", consultIdx + 1);
  if (nextSection === -1) return text + inject;

  return text.slice(0, nextSection) + inject + text.slice(nextSection);
}

// ============================================================
// 중복 제거 3단계
// ============================================================
function removeDuplicates(text) {
  // 섹션 중복
  const sections = text.split(/\n(?=## )/);
  const seenHeaders = new Set();
  const uniqueSections = sections.filter((s) => {
    const header = s.match(/^## (.+)/)?.[1]?.trim();
    if (!header) return true;
    if (seenHeaders.has(header)) return false;
    seenHeaders.add(header);
    return true;
  });
  let t = uniqueSections.join("\n");

  // 문단 중복
  const paragraphs = t.split(/\n\n+/);
  const seen = new Set();
  const unique = paragraphs.filter((p) => {
    const key = p.trim().slice(0, 60);
    if (key.length < 20) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  t = unique.join("\n\n");

  // 문장 중복
  t = t.replace(/([^.!?\n]{15,}[.!?])\s*\1/g, "$1");

  return t;
}

// ============================================================
// 비교 섹션 중복 제거 — INFO_BLOCK이 이미 있으므로
// "## XX vs 다른 진료 비교" 같은 GPT 생성 비교 섹션은 제거
// ============================================================
function removeRedundantCompareSection(text) {
  // ## XXX vs YYY ... 또는 ## ... 비교 형태의 섹션 제거
  // 단, "## 결정" 다음에 INFO_BLOCK 표가 이미 있으므로
  const lines = text.split("\n");
  const out = [];
  let skip = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 비교 섹션 헤더 감지
    if (/^##\s+.*(vs|비교|비교표).*$/i.test(line) && !line.includes("결정")) {
      skip = true;
      continue;
    }
    // 다음 ## 헤더 만나면 skip 해제
    if (skip && /^##\s+/.test(line)) {
      skip = false;
    }
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

// ============================================================
// 이미지 ALT 섹션별 삽입 (강화판)
// - 모든 섹션(고민/탐색/상담/결정/변화/마무리) 자동 삽입
// - 헤더 누락 시 본문 비율 위치에 fallback 삽입
// ============================================================
function insertImageAlts(text, imageAlts) {
  if (!imageAlts) return text;
  let t = text;

  const tryInsert = (regex, alt) => {
    if (!alt) return;
    if (t.includes(alt)) return;
    if (regex.test(t)) {
      t = t.replace(regex, (m) => m + "\n" + alt + "\n\n");
    }
  };

  // ── 섹션 헤더 직후 삽입 ─────────────────────────
  tryInsert(/(## 고민[^\n]*\n)/, imageAlts.concern);
  tryInsert(/(## 탐색[^\n]*\n)/, imageAlts.search);
  tryInsert(/(## 상담[^\n]*\n)/, imageAlts.consult);
  tryInsert(/(## 결정[^\n]*\n)/, imageAlts.decision);
  tryInsert(/(### 1일[^\n]*\n)/, imageAlts.result0);
  tryInsert(/(### 1주[^\n]*\n)/, imageAlts.result1);
  tryInsert(/(### 2주[^\n]*\n)/, imageAlts.result2);
  tryInsert(/(### 1개월[^\n]*\n)/, imageAlts.result3);
  tryInsert(/(## 마무리[^\n]*\n)/, imageAlts.summary);

  // ── 변화 섹션 fallback (### 헤더가 없을 때) ──
  // result1/result2/result3 중 아직 들어가지 않은 게 있으면
  // ## 변화 또는 ## 진료 후 변화 섹션 헤더 직후에 한꺼번에 삽입
  const changeMatch = t.match(/(##\s*(?:진료\s*후\s*)?변화[^\n]*\n)/);
  if (changeMatch) {
    const inserts = [];
    if (imageAlts.result1 && !t.includes(imageAlts.result1)) inserts.push(imageAlts.result1);
    if (imageAlts.result2 && !t.includes(imageAlts.result2)) inserts.push(imageAlts.result2);
    if (imageAlts.result3 && !t.includes(imageAlts.result3)) inserts.push(imageAlts.result3);
    if (inserts.length > 0) {
      t = t.replace(changeMatch[1], changeMatch[1] + "\n" + inserts.join("\n") + "\n\n");
    }
  }

  // ── 최종 fallback — 헤더가 전혀 없는 평문 출력 케이스 ──
  // 누락된 ALT를 본문 비율 위치(20·40·60·80%)에 강제 분배
  const allAlts = [
    imageAlts.concern,
    imageAlts.search,
    imageAlts.consult,
    imageAlts.decision,
    imageAlts.result1,
    imageAlts.result2,
    imageAlts.result3,
    imageAlts.summary,
  ].filter(Boolean);

  const missing = allAlts.filter((a) => !t.includes(a));
  if (missing.length > 0) {
    // 본문 영역(제목 제외) 추출
    const titleMatch = t.match(/^(#\s+[^\n]+\n+)/);
    const head = titleMatch ? titleMatch[1] : "";
    let body = titleMatch ? t.slice(titleMatch[0].length) : t;

    // 마지막 해시태그 라인은 분배 대상에서 제외
    let tail = "";
    const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
    if (tagMatch) {
      tail = tagMatch[1];
      body = body.slice(0, body.length - tail.length);
    }

    // 문단 분할
    const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
    if (paras.length >= 4) {
      const positions = [];
      const n = missing.length;
      for (let i = 0; i < n; i++) {
        const pos = Math.floor(((i + 1) * paras.length) / (n + 1));
        positions.push(Math.min(Math.max(pos, 1), paras.length - 1));
      }

      // 뒤에서부터 삽입(인덱스 밀림 방지)
      const sortedPairs = positions
        .map((p, i) => ({ pos: p, alt: missing[i] }))
        .sort((a, b) => b.pos - a.pos);

      for (const { pos, alt } of sortedPairs) {
        paras.splice(pos, 0, alt);
      }

      t = head + paras.join("\n\n") + tail;
    }
  }

  return t;
}

// ============================================================
// v2.3 사진 ALT 장면 구체화 (미니 B안)
// 라이브러리 수정 없이 핸들러에서 ALT를 진료별·섹션별 구체 장면으로 덮어씀
// 기존: "강남 라식 결정 | 강남 안과 라식 선택 이유" (장면 불명)
// 개선: "강남 라식 후기 | 수술 전 마지막 정밀 검사 장면" (장면 명확)
// ============================================================
const SCENE_ALTS = {
  // 시력교정 계열 (수술 → 회복 흐름)
  lasik:        { concern: "안경테 흘러내려 운동 못 하는 일상 모습", search: "안과 3곳 검사 항목 비교 메모", consult: "각막지형도 검사받는 장면", decision: "수술 전 마지막 정밀 검사 장면", result0: "수술 직후 보호 안경 쓴 모습", result1: "수술 1주차 외래 검진 장면", result2: "수술 2주차 야간 운전 시야 확인", result3: "수술 1개월차 시력 검사 결과지", summary: "안경 없이 출근하는 평일 아침 모습", closing: "안경 정리해 서랍에 넣는 장면" },
  lasek:        { concern: "땀에 자꾸 흘러내리는 안경에 답답해하는 운동 장면", search: "라식·라섹 차이 비교 정리한 노트", consult: "각막 두께 측정 결과 보는 장면", decision: "각막 표면 보호 처치 직전 모습", result0: "수술 당일 통증 정도 메모", result1: "1주차 보호 렌즈 빼기 전 검진", result2: "2주차 시야 점차 선명해진 일상", result3: "1개월차 시력표 검사 장면", summary: "헬스장에서 안경 없이 운동하는 모습", closing: "운동 가방에서 빠진 렌즈 통" },
  smile_lasik:  { concern: "건조한 눈 비비는 사무실 책상 모습", search: "스마일라식·라식 절개 차이 자료 화면", consult: "각막 절개 시뮬레이션 영상 보는 장면", decision: "수술 직전 가운 입은 대기실", result0: "당일 회복실에서 눈 감고 쉬는 모습", result1: "1주차 모니터 작업 복귀한 책상", result2: "2주차 안구건조감 거의 없는 일상", result3: "1개월차 검진에서 들은 안정 결과", summary: "퇴근길 야간 운전 중 선명한 시야", closing: "인공눈물 안 쓰고 자는 침대 옆" },
  icl:          { concern: "두꺼운 안경 렌즈에 답답해하는 셀카", search: "고도근시 ICL·라식 비교 검색 화면", consult: "전방 깊이·내피세포 검사 장면", decision: "렌즈 도수 결정하는 상담실", result0: "수술 당일 회복실 누운 모습", result1: "1주차 처음 안경 없이 출근하는 길", result2: "2주차 멀리 표지판까지 보이는 운전", result3: "1개월차 야간 운전 빛번짐 체크", summary: "안경 없이 카페에서 책 읽는 오후", closing: "안경 케이스 정리해 둔 책상 위" },

  // 백내장·노안 계열
  cataract:     { concern: "흐릿한 시야로 신문 못 읽는 거실 장면", search: "단초점·다초점 렌즈 비교 자료 화면", consult: "안저·생체계측 검사받는 장면", decision: "렌즈 종류 결정 상담실 모습", result0: "수술 당일 보호 안대 한 채 회복", result1: "1주차 시야 맑아진 첫 외출", result2: "2주차 돋보기 없이 휴대폰 보는 일상", result3: "1개월차 야간 빛번짐 체크 결과", summary: "신문 작은 글씨까지 또렷한 아침", closing: "돋보기 서랍에 넣고 닫는 장면" },
  presbyopia:   { concern: "메뉴판 글씨 안 보여 멀리 보는 손동작", search: "노안 교정·다초점 안경 비교 검색", consult: "각막지형도·시력 정밀 검사 장면", decision: "시술 방식 결정 상담실 모습", result0: "수술 당일 회복실 누운 모습", result1: "1주차 휴대폰 글씨 또렷한 일상", result2: "2주차 거리 변화 적응한 운전 장면", result3: "1개월차 검진 결과 안내받는 모습", summary: "스마트폰·노트북 둘 다 편한 책상", closing: "돋보기 정리해 서랍에 넣는 손" },

  // 만성 관리형
  glaucoma:     { concern: "눈 시야 일부 흐려진 시야 검사 결과지", search: "녹내장 약물·레이저 비교 자료 화면", consult: "안압·OCT 시신경 검사 장면", decision: "약물 처방받는 상담실 모습", result0: "안약 점안 시작한 첫날 모습", result1: "1주차 안압 측정 외래 장면", result2: "2주차 시야 변화 없는 일상", result3: "1개월차 OCT 재검 결과 확인", summary: "정기 검진 일정 다이어리 적는 손", closing: "안약 보관함 정리한 책상 위" },
  macular:      { concern: "중심 시야 일그러져 보이는 암슬러 격자 검사", search: "건성·습성 황반변성 비교 자료", consult: "OCT·형광안저혈관조영 검사 장면", decision: "항VEGF 주사 결정 상담실", result0: "첫 주사 시술 직후 회복 장면", result1: "1주차 외래 안저 재검 모습", result2: "2주차 시야 일그러짐 줄어든 격자 검사", result3: "1개월차 안저 사진 비교 결과", summary: "정기 주사 일정 캘린더 정리", closing: "다음 검진 예약 카드 보관함" },
  retina:       { concern: "갑자기 늘어난 비문·광시증에 놀란 눈", search: "안저 레이저·검진 차이 자료 화면", consult: "산동검사·OCT 망막 정밀 검사 장면", decision: "예방 레이저 결정 상담실 모습", result0: "당일 안저 레이저 직후 회복 장면", result1: "1주차 안저 재검 외래 장면", result2: "2주차 시야 안정 확인한 일상", result3: "1개월차 망막 정기 검진 결과지", summary: "정기 안저 검진 일정 정리 메모", closing: "검진 결과 파일 정리해 둔 서랍" },
  floaters:     { concern: "시야에 떠다니는 점들 보고 답답한 일상", search: "양성 비문·망막박리 구분 자료 화면", consult: "산동검사·세극등 정밀 검사 장면", decision: "YAG 레이저 결정 상담실 모습", result0: "당일 레이저 직후 회복실 장면", result1: "1주차 시야 부유물 줄어든 일상", result2: "2주차 야외 활동 편해진 모습", result3: "1개월차 검진 결과 안내", summary: "정기 안저 점검 일정 메모", closing: "검사 결과지 정리해 둔 책상" },
  diabetic_retina: { concern: "당뇨로 흐릿해진 시야 검사 결과지", search: "당뇨망막병증 단계별 치료 자료", consult: "안저·OCT 황반부종 검사 장면", decision: "항VEGF 주사 결정 상담실", result0: "첫 주사 시술 직후 회복 모습", result1: "1주차 안저 재검 외래 장면", result2: "2주차 황반부종 줄어든 OCT 결과", result3: "1개월차 시력 안정 확인 검진", summary: "혈당 수첩과 검진 일정 함께 정리", closing: "다음 주사 예약 카드 보관" },
  dry_eye:      { concern: "건조해서 자꾸 비비는 눈에 빨개진 모습", search: "인공눈물·IPL·LipiFlow 비교 자료", consult: "마이봄샘·쉬르머검사 받는 장면", decision: "IPL 코스 결정한 상담실", result0: "1회차 IPL 시술 직후 회복 장면", result1: "1주차 건조감 줄어든 일상", result2: "2회차 IPL 후 눈 컨디션 변화", result3: "4회차 코스 마친 후 검진 결과", summary: "인공눈물 사용 횟수 줄어든 책상", closing: "마이봄샘 관리 도구 정리한 거울 앞" },
  dream_lens:   { concern: "아이 근시 빠르게 진행한 시력표 결과", search: "드림렌즈·아트로핀·DIMS 비교 자료", consult: "각막곡률·각막지형도 측정 장면", decision: "처방 렌즈 결정 상담실 모습", result0: "첫 착용 연습한 거울 앞 장면", result1: "1주차 야간 착용 적응한 침실 모습", result2: "2주차 낮 시간 나안 시력 확인", result3: "1개월차 정기 검진 결과지", summary: "아침에 렌즈 빼고 나안으로 등교", closing: "렌즈 보관함 정리한 책상 위" },
  myopia_control: { concern: "근시 1년 사이 빠르게 진행한 처방전", search: "근시 진행 억제 방법 비교 자료", consult: "안축장·각막곡률 측정 장면", decision: "관리 방식 결정 상담실 모습", result0: "관리 시작 첫날 처방받은 장면", result1: "1주차 적응 진행 일상", result2: "2주차 진행 속도 점검 외래", result3: "1개월차 안축장 변화 확인 검사", summary: "정기 관리 일정 표시한 캘린더", closing: "다음 검사 예약 메모해 둔 책상" },
  strabismus:   { concern: "거울 앞 한쪽 눈 돌아간 사시 모습", search: "사시 수술·안경 처방 비교 자료", consult: "사시각·양안시 측정 장면", decision: "수술 결정 상담실 모습", result0: "수술 당일 가운 입은 대기실", result1: "1주차 외래 검진 사시각 측정", result2: "2주차 양안시 회복 확인 검사", result3: "1개월차 사시각 안정 확인", summary: "거울 앞 정렬된 시선 확인", closing: "검진 결과지 정리한 책상" },
  amblyopia:    { concern: "가림치료 안대 처음 받은 아이 모습", search: "약시 가림치료·약물 비교 자료", consult: "시력·굴절 정밀 검사 장면", decision: "치료 방식 결정 상담실 모습", result0: "가림치료 첫날 거울 앞 장면", result1: "1주차 적응 진행한 일상", result2: "2주차 시력 변화 점검 외래", result3: "1개월차 시력 향상 확인 검사", summary: "가림치료 시간 표시한 캘린더", closing: "다음 검진 예약 메모지" },

  // 일반 진료
  conjunctivitis: { concern: "충혈된 눈에 안약 찾는 일상 모습", search: "결막염 종류별 약 비교 자료 화면", consult: "결막·각막 정밀 검사 장면", decision: "처방 결정 상담실 모습", result0: "첫 안약 점안한 첫날 장면", result1: "1주차 충혈 줄어든 일상", result2: "2주차 외래 재검 장면", result3: "1개월차 회복 확인 검진", summary: "안약 보관함 정리한 책상", closing: "다음 검진 예약 카드" },
  stye:         { concern: "부어오른 눈꺼풀에 거울 보는 모습", search: "온찜질·절개 배농 비교 자료", consult: "눈꺼풀 정밀 검사 장면", decision: "절개 배농 결정 상담실", result0: "당일 시술 직후 회복실 장면", result1: "1주차 부기 빠진 일상", result2: "2주차 외래 재검 장면", result3: "1개월차 회복 확인 검진", summary: "온찜질 도구 정리한 거울 앞", closing: "검진 결과지 정리한 책상" },
  eye_checkup:  { concern: "오래 미룬 안과 검진 예약 화면", search: "정밀 검진 항목 비교 자료", consult: "안압·안저·OCT 검사 장면", decision: "검진 결과 안내 상담실", result0: "검진 당일 결과지 받은 장면", result1: "1주차 결과 정리한 메모", result2: "2주차 추적 검사 일정 확인", result3: "1개월차 정기 점검 일정", summary: "정기 검진 일정 적은 다이어리", closing: "검진 결과 파일 정리한 서랍" },
};

function buildSceneAlts(treatmentId, region, name) {
  const scene = SCENE_ALTS[treatmentId];
  if (!scene) return null;

  // "강남 라식 후기 | 수술 전 마지막 정밀 검사 장면" 형태로 조합
  const prefix = region + " " + name + " 후기";
  return {
    concern:  "[이미지: " + prefix + " | " + scene.concern + "]",
    search:   "[이미지: " + prefix + " | " + scene.search + "]",
    consult:  "[이미지: " + prefix + " | " + scene.consult + "]",
    decision: "[이미지: " + prefix + " | " + scene.decision + "]",
    result0:  "[이미지: " + prefix + " | " + scene.result0 + "]",
    result1:  "[이미지: " + prefix + " | " + scene.result1 + "]",
    result2:  "[이미지: " + prefix + " | " + scene.result2 + "]",
    result3:  "[이미지: " + prefix + " | " + scene.result3 + "]",
    summary:  "[이미지: " + prefix + " | " + scene.summary + "]",
    closing:  "[이미지: " + prefix + " | " + scene.closing + "]",
  };
}

// ============================================================
// v2.4 "A vs B 실제 고민" 블록 — 상담 섹션 뒤 자동 삽입
// 단순 비교가 아닌 "왜 고민했는지 + 어떻게 풀었는지" 흐름
// ============================================================
const VS_BLOCKS = {
  lasik: {
    rival: "라섹",
    body: [
      "검사를 받고 나서 가장 고민됐던 부분은 라식과 라섹 중 어떤 방법이 더 맞는지였어요. 단순히 회복 속도만 볼 문제가 아니라, 각막 두께와 생활 패턴이 더 중요한 기준이 된다는 설명을 들었어요.",
      "라섹은 각막을 보존하는 방식이라 안정성이 높지만, 회복 기간 동안 통증과 불편함이 있다는 점이 부담이 됐어요. 반대로 라식은 절개가 들어가지만 회복이 빠르고 일상 복귀가 빠른 편이라 제 생활 패턴에는 더 맞는 선택이었어요.",
      "특히 운동을 자주 하고 야외 활동이 많은 편이라, 회복 기간 동안 눈을 많이 쓰지 못하는 상황이 부담이었기 때문에 라식이라는 판단이 들었어요.",
    ],
  },
  lasek: {
    rival: "라식",
    body: [
      "검사 후 가장 오래 고민했던 부분은 라섹과 라식 중 어떤 방식이 제 눈에 더 적합한지였어요. 회복 기간만 비교하면 라식이 빠르지만, 각막 두께와 활동 패턴까지 보면 결정 기준이 달라진다는 설명을 들었어요.",
      "라식은 회복이 빠른 대신 외부 충격에 약한 부분이 남는다는 점이 마음에 걸렸어요. 반대로 라섹은 회복 기간이 1~2주 정도 길지만 각막을 그대로 보존하기 때문에 충격에 안정적이고 장기적인 안정성이 더 높다는 점이 기준이 됐어요.",
      "운동을 자주 하고 충격이 가해질 가능성이 있는 환경이라 결국 회복 기간을 감수하더라도 라섹 쪽으로 결정하게 됐어요.",
    ],
  },
  smile_lasik: {
    rival: "라식",
    body: [
      "검사 후 가장 고민됐던 부분은 스마일라식과 라식 중 어떤 방법이 더 적합한지였어요. 두 방식 모두 회복이 빠른 편이지만, 절개 크기와 안구건조 부담에서 차이가 분명하다는 설명을 들었어요.",
      "라식은 비교적 큰 절편을 들어올리는 방식이라 신경 손상이 더 크고, 회복 후 안구건조감이 오래 가는 경우가 있다고 했어요. 반대로 스마일라식은 절개가 작아 신경 보존에 유리하고 안구건조 부담이 적은 점이 기준이 됐어요.",
      "평소에도 눈이 자주 건조한 편이라 회복 후 컨디션까지 고려하면 스마일라식 쪽으로 결정하게 됐어요.",
    ],
  },
  icl: {
    rival: "라식·라섹",
    body: [
      "검사 결과 고도근시 진단을 받으면서 가장 오래 고민했던 부분은 ICL과 각막을 깎는 방식 중 어떤 게 더 안정적인지였어요. 도수가 높을수록 각막 절삭량이 많아져 한계가 있다는 설명을 들었어요.",
      "라식·라섹은 각막을 영구적으로 깎는 방식이라 한 번 시술하면 되돌릴 수 없고, 각막 두께가 충분치 않으면 권하기 어렵다고 했어요. 반대로 ICL은 각막을 그대로 보존하면서 렌즈를 삽입하는 방식이라 가역적이고, 고도근시에도 적용 가능한 점이 기준이 됐어요.",
      "각막 두께가 빠듯한 데다 향후 변화 가능성까지 고려해보니 ICL 쪽으로 결정하게 됐어요.",
    ],
  },
  cataract: {
    rival: "단초점 렌즈",
    body: [
      "수술을 결정하면서 가장 고민했던 부분은 단초점과 다초점 렌즈 중 어떤 걸 삽입할지였어요. 회복 기간이나 수술 방식은 같지만, 시술 후 일상 시야가 완전히 달라진다는 설명을 들었어요.",
      "단초점은 보험 적용이 되고 비용 부담이 적지만 결국 돋보기를 써야 한다는 점이 부담이었어요. 반대로 다초점은 비급여라 비용이 더 들지만 돋보기 없이 일상 시야가 자연스럽다는 점이 기준이 됐어요.",
      "독서·운전·휴대폰 사용이 모두 잦은 일상 패턴을 보면 다초점 쪽으로 결정하게 됐어요.",
    ],
  },
  presbyopia: {
    rival: "다초점 안경",
    body: [
      "노안이 시작되면서 가장 고민됐던 건 안경으로 버틸지, 교정 시술을 받을지였어요. 비용 차이만 보면 안경이 부담 적지만, 일상 편의성과 적응 부담까지 보면 결정 기준이 달라진다는 설명을 들었어요.",
      "다초점 안경은 가격이 저렴한 대신 적응 기간이 길고 계단을 내려갈 때 어지럽다는 후기가 많았어요. 반대로 노안 교정은 일회성 비용이 들지만 적응 부담이 없고 일상 편의가 즉각 좋아진다는 점이 기준이 됐어요.",
      "안경 적응에 자신이 없고 일상에서 빠른 시야 전환이 필요한 편이라 노안 교정 쪽으로 결정하게 됐어요.",
    ],
  },
  glaucoma: {
    rival: "수술 우선",
    body: [
      "녹내장 진단을 받으면서 가장 고민했던 건 약물·레이저로 단계적으로 갈지, 바로 수술까지 고려할지였어요. 진행 단계와 안압 반응성에 따라 결정 기준이 달라진다는 설명을 들었어요.",
      "수술은 안압 조절 효과가 강하지만 비가역적이라 한 번 받으면 되돌릴 수 없다는 점이 부담이었어요. 반대로 약물·레이저는 효과가 점진적이지만 단계별로 조절이 가능하고 부작용이 적다는 점이 기준이 됐어요.",
      "초기 단계라 약물 반응성이 좋다는 평가를 받아 우선 약물 관리 쪽으로 결정하게 됐어요.",
    ],
  },
  macular: {
    rival: "경과 관찰",
    body: [
      "황반변성 진단을 받으면서 가장 고민됐던 건 적극 치료로 갈지, 우선 경과만 볼지였어요. 건성·습성 구분과 신생혈관 유무에 따라 결정 기준이 완전히 달라진다는 설명을 들었어요.",
      "경과 관찰은 부담이 적지만 습성으로 진행 중일 경우 시력 저하 속도가 빨라진다는 점이 위험 요소였어요. 반대로 항VEGF 주사는 회당 비용이 들지만 신생혈관 억제 효과가 강하고 진행 억제력이 분명하다는 점이 기준이 됐어요.",
      "이미 습성으로 진단된 상태였기 때문에 진행 속도를 늦추는 쪽이 우선이라 항VEGF 주사 쪽으로 결정하게 됐어요.",
    ],
  },
  retina: {
    rival: "단순 검진",
    body: [
      "비문증과 광시증이 같이 나타나면서 가장 고민됐던 건 단순 검진으로 끝낼지, 예방 레이저까지 받을지였어요. 망막열공 위험 정도에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "단순 검진은 부담이 적지만 망막열공이 진행되면 박리로 이어질 위험이 있다고 했어요. 반대로 안저 레이저는 부분 치료에 그치지만 열공 부위를 미리 봉합해 박리를 예방할 수 있다는 점이 기준이 됐어요.",
      "산동검사 결과 열공 가능성이 확인된 상태라 예방 레이저가 더 현실적인 선택이었어요.",
    ],
  },
  floaters: {
    rival: "유리체 절제술",
    body: [
      "비문증이 심해지면서 가장 고민됐던 건 YAG 레이저로 갈지, 유리체 절제술까지 갈지였어요. 비문증 종류와 시야 방해 정도에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "유리체 절제술은 근본적이지만 회복이 길고 합병증 위험이 있다는 점이 부담이었어요. 반대로 YAG 레이저는 떠다니는 점만 분쇄하는 방식이라 회복이 빠르고 합병증 위험도 낮다는 점이 기준이 됐어요.",
      "양성 비문증으로 확인됐고 시야 방해도 견딜 만한 수준이라 YAG 레이저 쪽으로 결정하게 됐어요.",
    ],
  },
  diabetic_retina: {
    rival: "정기 관찰",
    body: [
      "당뇨망막병증 진단을 받으면서 가장 고민됐던 건 정기 관찰로만 갈지, 적극 치료까지 병행할지였어요. 진행 단계와 황반부종 유무에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "정기 관찰만으로는 진행 속도가 빨라진 상태에서 시력 저하를 막기 어렵다는 점이 부담이었어요. 반대로 항VEGF 주사는 회당 비용이 들지만 황반부종을 줄이고 진행 억제 효과가 분명하다는 점이 기준이 됐어요.",
      "이미 증식성 단계로 진행된 데다 황반부종까지 동반된 상태라 항VEGF 주사 쪽으로 결정하게 됐어요.",
    ],
  },
  dry_eye: {
    rival: "인공눈물만",
    body: [
      "안구건조증이 길어지면서 가장 고민됐던 건 인공눈물만으로 버틸지, IPL까지 받을지였어요. 마이봄샘 기능 검사 결과에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "인공눈물은 즉각 효과뿐이라 근본 개선이 어렵고 사용 횟수가 점점 늘어난다는 점이 부담이었어요. 반대로 IPL은 4~5회 코스로 진행하지만 마이봄샘 기능을 회복시켜 근본적으로 건조감을 줄일 수 있다는 점이 기준이 됐어요.",
      "마이봄샘 분비 기능이 많이 떨어진 상태로 확인돼서 IPL 코스가 결정의 마지막 기준이 됐어요.",
    ],
  },
  dream_lens: {
    rival: "일반 안경",
    body: [
      "아이 근시 진행이 빨라지면서 가장 고민됐던 건 일반 안경만 쓸지, 드림렌즈까지 갈지였어요. 근시 진행 속도와 연령에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "일반 안경은 비용 부담이 적지만 근시 진행 억제 효과가 없다는 점이 부담이었어요. 반대로 드림렌즈는 처방 비용이 있지만 야간 착용으로 진행 억제 효과가 분명하고 낮 시간 나안 시력을 확보할 수 있다는 점이 기준이 됐어요.",
      "1년 사이 근시가 빠르게 진행된 상태라 드림렌즈라는 판단이 들었어요.",
    ],
  },
  myopia_control: {
    rival: "관찰만",
    body: [
      "아이 근시 진행이 확인되면서 가장 고민됐던 건 관찰만 할지, 진행 억제 관리까지 시작할지였어요. 축성 근시 진행 속도와 연령에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "관찰만 하는 방식은 부담이 적지만 진행 속도가 빠른 시기를 놓치면 회복이 어려워진다는 점이 부담이었어요. 반대로 적극 관리는 비용이 들지만 진행 억제 효과가 분명하고 안축장 변화를 늦출 수 있다는 점이 기준이 됐어요.",
      "축성 근시가 빠르게 진행 중인 상태라 적극 관리 쪽으로 결정하게 됐어요.",
    ],
  },
  strabismus: {
    rival: "안경 처방",
    body: [
      "사시 진단을 받으면서 가장 고민됐던 건 안경 처방으로 충분할지, 수술까지 갈지였어요. 사시각 정도와 양안시 발달 시기에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "안경 처방은 부담이 적지만 사시각이 큰 경우엔 교정 한계가 있고 양안시 발달 시기를 놓치면 회복이 어렵다는 점이 부담이었어요. 반대로 수술은 회복 기간이 있지만 사시각을 직접 교정하고 양안시 발달을 살릴 수 있다는 점이 기준이 됐어요.",
      "사시각이 25프리즘디옵터 이상으로 확인된 상태라 결국 수술 쪽으로 결정하게 됐어요.",
    ],
  },
  amblyopia: {
    rival: "지켜보기",
    body: [
      "약시 진단을 받으면서 가장 고민됐던 건 좀 더 지켜볼지, 가림치료를 바로 시작할지였어요. 시력 발달 단계와 발견 시기에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "지켜보기만 하다가는 시력 발달 시기를 놓쳐 영구적인 약시로 굳어질 위험이 있다는 점이 부담이었어요. 반대로 가림치료는 일상에 불편함이 있지만 발견 시기가 빠를수록 회복 효과가 크다는 점이 기준이 됐어요.",
      "6세 이전이라 가림치료 효과가 가장 큰 시기라 즉시 시작이 더 현실적인 선택이었어요.",
    ],
  },
  conjunctivitis: {
    rival: "자가 회복",
    body: [
      "결막염 증상이 시작되면서 가장 고민됐던 건 자가 회복으로 둘지, 진료를 받을지였어요. 결막염 종류에 따라 처방이 달라진다는 설명을 들었어요.",
      "자가 회복은 부담이 적지만 종류 구분 없이 잘못된 약을 쓰면 오히려 악화될 위험이 있다는 점이 부담이었어요. 반대로 진료를 받으면 종류를 정확히 구분해 맞는 처방을 받을 수 있다는 점이 기준이 됐어요.",
      "증상이 점점 심해지는 상태라 정확한 진단이 결정의 마지막 기준이 됐어요.",
    ],
  },
  stye: {
    rival: "온찜질만",
    body: [
      "다래끼가 잡히면서 가장 고민됐던 건 온찜질로 버틸지, 절개 배농까지 받을지였어요. 진행 단계와 농양 형성 여부에 따라 판단 기준이 달라진다는 설명을 들었어요.",
      "온찜질은 초기엔 효과가 있지만 4~5일 지나도 가라앉지 않으면 농양이 잡힌 상태라 호전이 어렵다는 점이 부담이었어요. 반대로 절개 배농은 시술 부담이 있지만 회복이 빠르고 재발 위험이 낮다는 점이 기준이 됐어요.",
      "이미 며칠이 지나도 가라앉지 않은 상태라 절개 배농이라는 판단이 들었어요.",
    ],
  },
  eye_checkup: {
    rival: "안 받기",
    body: [
      "정기 검진을 두고 가장 고민됐던 건 시간 비용을 들여 받을지, 자각 증상이 없으니 미룰지였어요. 녹내장·당뇨망막병증 같은 질환은 자각 증상이 없는 시기가 길다는 설명을 들었어요.",
      "검진을 미루는 방식은 당장의 부담이 적지만 조기 발견 기회를 놓치면 회복이 어려운 단계까지 갈 수 있다는 점이 부담이었어요. 반대로 정기 검진은 시간이 들지만 안압·안저·OCT까지 종합으로 보면서 조기 발견이 가능하다는 점이 기준이 됐어요.",
      "결국 1~2년에 한 번 정도는 정밀 검진을 받는 쪽으로 결정하게 됐어요.",
    ],
  },
};

function injectVsBlock(text, treatmentId, name) {
  const vs = VS_BLOCKS[treatmentId];
  if (!vs) return text;

  // 이미 같은 vs블록이 들어있으면 패스
  if (text.includes(vs.body[0].slice(0, 30))) return text;

  const block = "\n\n" + vs.body.join("\n\n") + "\n\n";

  // 1순위: ## 결정 헤더 직전 (가장 자연스러운 위치 — 고민→비교→결정 흐름)
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx !== -1) {
    return text.slice(0, decisionIdx) + block + text.slice(decisionIdx);
  }

  // 2순위: ## 상담 섹션 끝 (결정 헤더가 없는 케이스)
  const consultIdx = text.indexOf("## 상담");
  if (consultIdx !== -1) {
    const nextSection = text.indexOf("\n## ", consultIdx + 1);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    return text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  // 3순위 (헤더 없는 평문 케이스): 본문 30% 위치에 강제 삽입 (상담 직후 위치)
  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const head = titleMatch ? titleMatch[1] : "";
  let body = titleMatch ? text.slice(titleMatch[0].length) : text;
  let tail = "";
  const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
  if (tagMatch) {
    tail = tagMatch[1];
    body = body.slice(0, body.length - tail.length);
  }
  const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paras.length >= 4) {
    // 상단 글 흐름 = 고민(20%) → 탐색(20%) → 상담(20%) → [VS 비교] → 결정(15%) → 변화(15%) → 마무리(10%)
    // VS 블록은 상담 끝 ~ 결정 직전 = 약 60% 지점
    const insertIdx = Math.floor(paras.length * 0.6);
    paras.splice(insertIdx, 0, vs.body.join("\n\n"));
    return head + paras.join("\n\n") + tail;
  }

  return text + block;
}

// ============================================================
// v2.4 "병원 선택 기준" 블록 — 결정 섹션 뒤 자동 삽입
// 장비·검사 항목·상담 방식 차이를 구체화
// ============================================================
const HOSPITAL_PICK_BLOCK = [
  "여러 병원을 비교하면서 느낀 건, 단순히 비용이나 후기만으로 결정하기에는 차이가 분명히 있다는 점이었어요. 검사 장비의 종류나 검사 항목 수, 그리고 상담에서 설명해주는 방식까지 실제로 차이가 있었어요.",
  "어떤 병원은 기본 검사 위주로 빠르게 진행되는 반면, 어떤 곳은 눈 상태나 시술 가능 범위까지 세밀하게 설명해주면서 선택 기준을 명확하게 잡아주는 느낌이었어요.",
  "결국 검사 과정에서 제 눈 상태를 구체적으로 설명해주고, 시술이 가능한 이유와 주의할 점까지 함께 안내해준 병원을 기준으로 결정하게 됐어요.",
];

function injectHospitalPickBlock(text) {
  // 이미 비슷한 문구가 들어있으면 패스
  if (text.includes("단순히 비용이나 후기만으로")) return text;

  const block = "\n\n" + HOSPITAL_PICK_BLOCK.join("\n\n") + "\n";

  // 1순위: ## 결정 섹션 끝 (다음 ## 헤더 직전)
  const decisionIdx = text.indexOf("## 결정");
  if (decisionIdx !== -1) {
    const nextSection = text.indexOf("\n## ", decisionIdx + 1);
    const insertAt = nextSection === -1 ? text.length : nextSection;
    return text.slice(0, insertAt) + block + text.slice(insertAt);
  }

  // 2순위 (헤더 없는 케이스): 본문 60% 위치에 강제 삽입
  const titleMatch = text.match(/^(#\s+[^\n]+\n+)/);
  const head = titleMatch ? titleMatch[1] : "";
  let body = titleMatch ? text.slice(titleMatch[0].length) : text;
  let tail = "";
  const tagMatch = body.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
  if (tagMatch) {
    tail = tagMatch[1];
    body = body.slice(0, body.length - tail.length);
  }
  const paras = body.split(/\n\n+/).filter((p) => p.trim().length > 0);
  if (paras.length >= 5) {
    const insertIdx = Math.floor(paras.length * 0.6);
    paras.splice(insertIdx, 0, HOSPITAL_PICK_BLOCK.join("\n\n"));
    return head + paras.join("\n\n") + tail;
  }

  return text + block;
}

// ============================================================
// v2.9 VS 블록 위치 강제 보정 (다중 마커 패턴)
// 결정 시작 문장을 다양한 패턴으로 감지해서 그 *앞*으로 VS 블록 이동
// ============================================================
function repositionVsBlock(text, treatmentId) {
  const vs = VS_BLOCKS[treatmentId];
  if (!vs) return text;

  const vsFirstLine = vs.body[0];
  const vsBlockText = vs.body.join("\n\n");

  // 본문에서 VS 블록의 실제 위치 찾기
  const vsStart = text.indexOf(vsFirstLine);
  if (vsStart === -1) return text;

  const vsLastLine = vs.body[vs.body.length - 1];
  const vsLastLineStart = text.indexOf(vsLastLine, vsStart);
  if (vsLastLineStart === -1) return text;
  const vsEnd = vsLastLineStart + vsLastLine.length;

  // ── 결정 시작 마커 후보 (우선순위 순) ──
  // GPT가 결정 섹션 첫 문장으로 자주 쓰는 패턴들
  const decisionMarkers = [
    // 가장 강한 시그널 (구체)
    /([가-힣A-Za-z]+\s*수술을\s*결정하게\s*된\s*[^.\n]*이유[^.\n]*[.\n])/,    // "라식 수술을 결정하게 된 가장 큰 이유"
    /([가-힣A-Za-z]+\s*(?:수술|시술|치료|진료|시술법)?을?를?\s*결정한\s*[^.\n]*이유[^.\n]*[.\n])/,
    /(결국[^.\n]{0,40}(선택|결정)[^.\n]{0,30}[.\n])/,                          // "결국 라식을 선택"
    /([가-힣A-Za-z]+을?를?\s*선택하게\s*된\s*[^.\n]*[.\n])/,                  // "라식을 선택하게 된"
    // v3.0 추가 — "선택한 이유" / "선택한 가장 큰 이유" / "고른 이유"
    /([가-힣A-Za-z]+을?를?\s*선택한\s*(?:가장\s*큰\s*)?이유[^.\n]*[.\n])/,    // "라식을 선택한 이유"  ← 이번 케이스
    /([가-힣A-Za-z]+을?를?\s*고른\s*(?:가장\s*큰\s*)?이유[^.\n]*[.\n])/,
    /([가-힣A-Za-z]+이?가?\s*아니라\s*[가-힣A-Za-z]+을?를?\s*고른\s*이유[^.\n]*[.\n])/, // injectDecisionReason 결과
    // 일반화된 약한 패턴
    /(결정하게\s*된\s*가장\s*큰\s*이유[^.\n]*[.\n])/,
    /(가장\s*큰\s*이유는[^.\n]*[.\n])/,
    /(선택한\s*가장\s*큰\s*이유[^.\n]*[.\n])/,
    /(선택한\s*이유는[^.\n]*[.\n])/,                                          // v3.0 — 매우 흔한 패턴
    /(고른\s*이유는[^.\n]*[.\n])/,                                            // v3.0
  ];

  let decisionMarkerText = null;
  for (const re of decisionMarkers) {
    const m = text.match(re);
    if (m) {
      decisionMarkerText = m[1];
      break;
    }
  }

  if (!decisionMarkerText) return text;

  const decisionMarkerIdx = text.indexOf(decisionMarkerText);

  // 이미 VS 블록이 결정 마커 *앞*에 있으면 위치 OK
  if (vsEnd <= decisionMarkerIdx) return text;

  // VS 블록을 빼내서 결정 마커 직전 문단 시작점으로 이동
  let beforeVs = text.slice(0, vsStart);
  let afterVs = text.slice(vsEnd);
  beforeVs = beforeVs.replace(/\n{3,}$/, "\n\n");
  afterVs = afterVs.replace(/^\n{2,}/, "\n\n");
  const cleaned = beforeVs + afterVs;

  // 정리된 본문에서 결정 마커 다시 찾기
  let newDecisionIdx = -1;
  for (const re of decisionMarkers) {
    const m = cleaned.match(re);
    if (m) {
      newDecisionIdx = cleaned.indexOf(m[1]);
      break;
    }
  }
  if (newDecisionIdx === -1) return text;

  // 결정 마커가 포함된 문단의 시작점 찾기
  let paraStart = cleaned.lastIndexOf("\n\n", newDecisionIdx);
  if (paraStart === -1) paraStart = 0;
  else paraStart += 2;

  // 직전 문단이 이미지 ALT거나 다른 후처리 블록이면 그 위로 한 단계 더
  // (이미지 직후로 들어가지 않도록 — 자연스러운 흐름)
  const prevText = cleaned.slice(0, paraStart).trimEnd();
  if (prevText.endsWith("]")) {
    // 이미지 ALT 직후 → 그 이미지 *앞*으로 한 번 더 올림
    const imgStart = prevText.lastIndexOf("[이미지:");
    if (imgStart !== -1) {
      // 이미지 시작 바로 앞 문단 경계
      let imgPara = cleaned.lastIndexOf("\n\n", imgStart);
      if (imgPara === -1) imgPara = 0;
      else imgPara += 2;
      paraStart = imgPara;
    }
  }

  const insertion = vsBlockText + "\n\n";
  return cleaned.slice(0, paraStart) + insertion + cleaned.slice(paraStart);
}

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;

  // ① 줄 시작 헤더 변환 (제목·섹션·하위섹션)
  t = t.replace(/^#\s+(.+)$/gm, "$1");                    // # 제목 → 평문
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");              // ## 섹션 → 빈줄+텍스트+빈줄
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");                // ### 변화(1일/1주) → ▶ 마커

  // ② 인라인에 끼어있는 헤더 (줄바꿈 없이 본문 중간에 박힌 경우)
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1"); // " ## 제목" → 줄바꿈
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1"); // " ### 1일" → 줄바꿈+마커

  // ③ 굵게/이탤릭 마크다운 제거 (혹시 GPT가 출력했을 경우)
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");                 // **굵게** → 평문
  t = t.replace(/\*([^*]+)\*/g, "$1");                     // *이탤릭* → 평문

  // ④ 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 메인 핸들러 — 단일 호출 구조
// ============================================================
export default async function handleEye(req, res) {
  const startTime = Date.now();
  const { program, region: regionInput, keyword: keywordInput } = req.body;
  const region = regionInput || "강남";

  // 진료 매칭
  const treatment =
    EYE_TREATMENTS.find((t) => t.id === program.id) ||
    EYE_TREATMENTS.find((t) => t.name === program.name) ||
    program;

  // 부위 키워드 감지 — 단, 진료명에 이미 포함된 부위는 제외 (중복 방지)
  const SITE_KEYWORDS = ["야간", "고도근시", "다초점", "안구건조", "사시", "약시"];
  const titleRaw = (keywordInput || "") + " " + (treatment.name || "");
  const detectedSite = SITE_KEYWORDS.find(
    (s) => titleRaw.includes(s) && !(treatment.name || "").includes(s)
  ) || "";
  const activeKeyword = detectedSite ? detectedSite + " " + treatment.name : treatment.name;
  const fullKeyword = region + " " + activeKeyword;

  // 제목 생성
  const titlePattern =
    treatment.titlePatterns?.[
      Math.floor(Math.random() * (treatment.titlePatterns?.length || 1))
    ] || "{region} {name} 후기";

  let finalTitle = titlePattern
    .replace("{region}", region)
    .replace("{name}", treatment.name);

  // 후기 중복 제거
  finalTitle = finalTitle.replace(/(후기)([^후]*)(후기)/, "$1$2");
  // 진료명 중복 제거
  if (treatment.name && treatment.name.length >= 2) {
    const nameRe = new RegExp("(" + treatment.name + ")([^" + treatment.name.charAt(0) + "]+)\\1", "g");
    finalTitle = finalTitle.replace(nameRe, "$1$2");
  }

  console.log(`[eye] 제목: ${finalTitle} | 집중 키워드: ${activeKeyword}`);

  // 만성 관리형 질환 — 회복기간 개념 없음
  const CHRONIC_IDS = ["glaucoma", "macular", "diabetic_retina", "retina", "floaters", "myopia_control", "dream_lens", "amblyopia"];
  const isChronic = CHRONIC_IDS.includes(treatment.id);

  // ── 단일 호출 (GPT 1번) ──────────────────────────
  const headerForceTop =
    "🚨 응답 첫 글자는 반드시 \"## 고민\" 입니다. 그 외 어떤 텍스트(인사말·제목·설명)도 앞에 쓰지 마세요.\n" +
    "🚨 응답에는 ## 헤더가 정확히 6개 필요: ## 고민 / ## 탐색 / ## 상담 / ## 결정 / ## 진료 후 변화 / ## 마무리\n" +
    "🚨 ## 진료 후 변화 안에는 ### 헤더 4개: ### 1일 / ### 1주 / ### 2주 / ### 1개월\n" +
    "🚨 헤더와 본문 사이 빈 줄 1개. 헤더 줄에 본문 붙이기 절대 금지.\n" +
    "🚨 위 헤더 구조 누락 시 응답 무효 처리됩니다.\n\n";

  const fullPrompt =
    headerForceTop +
    buildEyeFullPrompt(treatment, region) +
    "\n\n🔒 집중 키워드: \"" + activeKeyword + "\" 으로만 서술. 다른 부위·증상 혼용 금지." +
    "\n🔒 본문에 반드시 포함:" +
    "\n   - \"" + region + " 안과 " + activeKeyword + "\" → 4회 이상 (고민·상담·변화·마무리 각 1회씩 자연스럽게)" +
    "\n   - \"" + region + " " + activeKeyword + "\" → 3회 이상" +
    "\n   - \"" + activeKeyword + "\" → 5회 이상" +
    "\n🔒 진료명을 절대 \"이 진료\", \"이 치료\", \"이 시술\" 같은 대명사로 바꾸지 말 것. 매번 \"" + activeKeyword + "\" 그대로 쓸 것." +
    "\n🔒 제목은 절대 출력하지 마세요. ## 고민 부터 시작하세요." +
    "\n🔒 모든 섹션(고민·탐색·상담·결정·변화·마무리) 빠짐없이 ## 헤더로 작성." +
    "\n🔒 변화 섹션은 ### 1일 / ### 1주 / ### 2주 / ### 1개월 순서 고정." +
    "\n🔒 별도의 \"## ○○ vs 다른 진료 비교\" 섹션 만들지 말 것 (비교표는 결정 섹션에 자동 삽입됨)." +
    "\n🔒 본문에 표(|---|---|) 직접 만들지 말 것. 비교표는 시스템이 자동 삽입함." +
    "\n🔒 ## 헤더 형식 엄수: \"## 상담\\n\\n실제 상담을 받았어요\" 형태로 헤더와 본문 사이 빈 줄 1개 필수." +
    "\n🔒 절대 금지: \"## 상담을 받으러 간 날\", \"## 결정을 내리고\" 처럼 헤더에 본문 붙여 쓰지 말 것." +
    "\n🔒 본문 중간에 #해시태그 절대 쓰지 말 것 (마지막 해시태그는 시스템이 자동 추가함)." +
    "\n🔒 신뢰도 깨는 문장 금지: 눈 진료인데 '소리·청각·미각·후각' 언급 금지. '자연 치유의 힘', '체질적 변화' 같은 모호한 표현 금지." +
    "\n🔒 어미 자연스럽게: '~자고예요', '~라고예요', '~했었어요', '~되었어요' 사용 금지. '~더라고요', '~했어요', '~됐어요'로 작성." +
    "\n🔒 어미 다양화 필수: 같은 종결 어미('~더라고요' 또는 '~했어요')를 한 문단에서 3회 이상 연속 사용 금지. '~라고 판단했어요', '~이 기준이 됐어요', '~한 셈이에요' 같은 판단형도 섞을 것." +
    "\n🔒 후기 아닌 판단 글로 쓸 것: '왜 이걸 골랐는가'를 구체 근거로 설명. 감정만 나열 금지. 각 결정에는 반드시 '수치·조건·기준' 중 하나를 포함." +
    "\n🔒 탐색 섹션은 병원 비교 4축으로 작성: ①검사 항목 차이 ②상담 시간·스타일 ③비용 범위 ④장비·기술 수준. 단순히 '후기 좋았다/추천 받았다'로 끝내지 말 것." +
    "\n🔒 결정 섹션에는 '왜 다른 옵션이 아니었는가'를 명확히: '라식이 아닌 라섹', '단초점이 아닌 다초점' 식으로 거부한 옵션을 명시하고 그 이유를 댈 것." +
    "\n🔒 첫 문장은 짧고 강하게: '어느 날 거울을 보는데...', '화면 속 셀카...', '언젠가부터...' 같은 약한 시작 절대 금지. 구체 상황 1줄로 시작." +
    "\n🔒 AI 클리셰 금지: '드디어 결심하고', '결국 선택하게 되었어요', '마음이 편안해졌어요', '믿음이 갔어요', '친절하고 전문적이셔서', '미소를 되찾았어요' 등 사용 금지." +
    "\n🔒 광고 톤 금지: '추천드리고 싶어요', '강력 추천', '권해드리고 싶어요', '한 번쯤 고려해보는 것을 권해', '적극 추천', '재방문 의사', '주변에 적극적으로 추천' 등 사용 금지. 마무리는 '참고가 됐으면 좋겠어요', '판단의 기준이 됐어요' 같은 판단형으로." +
    "\n🔒 부사 연속 나열 금지: '특히', '또한', '무엇보다'를 한 문단에 2회 이상 쓰지 말 것." +
    (isChronic
      ? "\n🔒 이 질환은 만성 관리형 — '회복 기간', '완치', '나았다' 같은 표현 절대 금지. 대신 '안정', '진행 억제', '관리', '경과 안정화' 사용." +
        "\n🔒 비용 표현은 '월 약물비', '회당 주사비', '정기 검진비' 형태로 — 일회성 총비용 금지."
      : "");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: EYE_SYSTEM_PROMPT },
      { role: "user", content: fullPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3500,
  });

  let body = completion.choices[0].message.content || "";

  // ── 헤더 누락 검증 → 1회 재생성 ─────────────────
  const requiredHeaders = ["## 고민", "## 탐색", "## 상담", "## 결정", "## 마무리"];
  const presentCount = requiredHeaders.filter((h) => body.includes(h)).length;

  if (presentCount < 3) {
    console.log(`[eye] 헤더 누락 감지 (${presentCount}/5) — 재생성 시도`);
    const retryPrompt =
      "🚨🚨🚨 직전 응답이 헤더 구조를 무시했습니다. 무효 처리.\n" +
      "🚨 이번에는 반드시 \"## 고민\" 으로 시작해서 ## 헤더 6개·### 헤더 4개를 정확히 출력하세요.\n" +
      "🚨 평문 출력 절대 금지. 모든 섹션은 ## 으로 시작하는 헤더가 줄 맨 앞에 있어야 합니다.\n\n" +
      fullPrompt;

    const retry = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: EYE_SYSTEM_PROMPT },
        { role: "user", content: retryPrompt },
      ],
      temperature: 0.5,
      max_tokens: 3500,
    });

    const retryBody = retry.choices[0].message.content || "";
    const retryCount = requiredHeaders.filter((h) => retryBody.includes(h)).length;

    if (retryCount > presentCount) {
      console.log(`[eye] 재생성 성공 (${retryCount}/5)`);
      body = retryBody;
    } else {
      console.log(`[eye] 재생성 실패 (${retryCount}/5) — fallback 후처리로 복원`);
    }
  }

  // 모델이 제목을 출력했을 경우 제거
  body = body.replace(/^#\s+[^\n]*\n+/, "");
  // ★ 본문 인라인 볼드 제거 — 헤더(#)는 보존, 본문 내 **텍스트** 만 제거
  body = body.replace(/\*\*([^*\n]+?)\*\*/g, "$1");
  body = body.trim();

  // 최종 조립
  let result = "# " + finalTitle + "\n\n" + body;

  // ── 후처리 ────────────────────────────────────
  result = restoreHeadersIfMissing(result);                // ⓪ 헤더 누락 시 자동 복원 (가장 먼저)
  result = normalizeHeaders(result);                       // ① 헤더 흡수 분리 (## 상담을... → ## 상담\n\n을...)
  result = fixCommonTypos(result);                         // ② 오타 수정 (돋보리 → 돋보기 등)
  result = strengthenOpening(result);                      // ②-2 v2.1 약한 첫 문장 제거
  result = cleanText(result, activeKeyword, region);
  // ★ 제목 보호 패치 — 본문 중간 끼어든 # 라인 제거 정규식이 제목 삭제하지 않도록
  // 시작에 빈 줄(\n)이 있으면 첫 줄 제목이 \n# 로 매칭돼서 통째로 사라지는 버그 방지
  result = result.replace(/^\n+/, "");
  result = result.replace(/\n#[^\n#]+(?=\n)/g, "\n");
  result = removeRedundantCompareSection(result);          // ③ 헤더 있는 비교 섹션 제거
  result = removeOrphanTable(result, treatment.id);        // ④ 헤더 없는 GPT 표 제거
  result = insertInfoBlock(result, treatment.id);          // ⑤ 정확한 비교표(INFO_BLOCK) 결정 아래 삽입
  result = injectExamValue(result, treatment.id);
  result = injectExpertLine(result, treatment.id, region); // 전문성 + SEO 한 줄
  result = injectVsBlock(result, treatment.id, treatment.name);                // v2.4 A vs B 고민
  result = injectDecisionReason(result, treatment.id, region, treatment.name); // v2.2 판단 근거
  result = injectHospitalPickBlock(result);                                    // v2.4 병원 선택 기준
  result = injectSearchComparison(result, region, treatment.name);             // v2.2 병원 비교
  result = removeDuplicates(result);
  result = repositionVsBlock(result, treatment.id);                            // v2.8 VS 블록 위치 보정 (결정 첫 문단 직전으로)

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 시술 / 경과 / 일상
  // ─────────────────────────────────────────────
  const _baseAlts = getEyeImageAlts(treatment, region, activeKeyword);
  const _sceneAlts = buildSceneAlts(treatment.id, region, treatment.name);
  const _rawImageAlts = _sceneAlts ? { ..._baseAlts, ..._sceneAlts } : _baseAlts;
  const _alt = (label) => `[이미지: ${label}]`;
  // ★ 이미지 5장 표준 — 과다 삽입 방지 (search/decision/result0/result2 비활성화)
  const imageAlts = {
    concern:  _alt("일상 사진"),
    search:   "",
    consult:  _alt("검사 사진"),
    decision: _alt("상담 사진"),
    result0:  "",
    result1:  _alt("시술 사진"),
    result2:  "",
    result3:  _alt("경과 사진"),
    summary:  _alt("일상 사진"),
  };
  result = insertImageAlts(result, imageAlts);

  // 핵심 키워드 4회 자동 보강 — 지역+안과+진료명
  const fullCount = (result.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const regionPlusName = region + " 안과 " + activeKeyword;
  const regionPlusNameRe = new RegExp(regionPlusName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const regionPlusNameCount = (result.match(regionPlusNameRe) || []).length;

  // 고민 섹션에 키워드 없으면 자동 삽입 (균형 분포)
  const concernIdx = result.indexOf("## 고민");
  if (concernIdx !== -1) {
    const nextHeaderIdx = result.indexOf("\n## ", concernIdx + 1);
    const concernSection = result.slice(concernIdx, nextHeaderIdx === -1 ? result.length : nextHeaderIdx);
    if (!concernSection.includes(regionPlusName)) {
      // 고민 섹션 마지막에 자연 문장 추가
      const insertAt = nextHeaderIdx === -1 ? result.length : nextHeaderIdx;
      const concernInject = "\n그래서 " + regionPlusName + "을(를) 알아보기 시작했어요.\n";
      result = result.slice(0, insertAt) + concernInject + result.slice(insertAt);
    }
  }

  // 다시 카운트
  const recount = (result.match(regionPlusNameRe) || []).length;
  if (recount < 4) {
    // 마무리 섹션 앞에 자연스러운 문장 추가
    const closingIdx = result.lastIndexOf("## 마무리");
    const inject =
      "\n\n" + regionPlusName + " 기준으로 본인 상태와 환경을 함께 고려해서 결정하는 게 가장 중요하다고 느꼈어요. " +
      regionPlusName + "을(를) 고민하시는 분들께 도움이 됐으면 해서 솔직하게 정리해봤습니다.\n\n";
    if (closingIdx !== -1) {
      result = result.slice(0, closingIdx) + inject + result.slice(closingIdx);
    } else {
      result += inject;
    }
  }

  // "강남 안과 + 진료명" 후기 키워드 추가 보강 (2회 이상)
  const reviewKeyword = region + " " + activeKeyword + " 후기";
  const reviewCount = (result.match(new RegExp(reviewKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  if (reviewCount < 2) {
    const closingIdx = result.lastIndexOf("## 마무리");
    const inject2 = "\n\n" + reviewKeyword + "를 찾고 계셨다면 제 경험이 작은 참고가 됐으면 좋겠어요.\n";
    if (closingIdx !== -1) {
      const nextSection = result.indexOf("\n## ", closingIdx + 1);
      if (nextSection !== -1) {
        result = result.slice(0, nextSection) + inject2 + result.slice(nextSection);
      } else {
        result += inject2;
      }
    } else {
      result += inject2;
    }
  }

  // ── v2.6 마무리 판단형 톤 보강 ──
  // 마무리에 광고형 종결 흔적 정리 후 판단형 한 줄 추가
  // (cleanText가 1차로 정리하지만, 새로 생긴 케이스 대비 + 글의 명시적 마지막 한 줄)
  const judgmentClosing =
    "\n시력 교정을 고민하고 있다면 단순한 후기보다는 검사 결과와 생활 패턴을 기준으로 선택 방향을 잡는 것이 도움이 됐어요. " +
    "개인적으로는 회복 속도와 일상 복귀 시점을 기준으로 결정했고, 그 기준이 결과적으로 맞는 선택이었다고 판단하게 됐어요.\n";

  // 이미 비슷한 문장이 있으면 패스
  if (!result.includes("단순한 후기보다는")) {
    // 마지막 ## 마무리 섹션 끝 (다음 ## 헤더 전 또는 본문 끝)
    const closingIdx = result.lastIndexOf("## 마무리");
    if (closingIdx !== -1) {
      const nextSection = result.indexOf("\n## ", closingIdx + 1);
      const insertAt = nextSection === -1 ? result.length : nextSection;
      result = result.slice(0, insertAt) + judgmentClosing + result.slice(insertAt);
    } else {
      // 헤더 없는 케이스 — 본문 끝(해시태그 직전)에
      const tagMatch = result.match(/(\n+#[^\n]+(?:\s+#[^\n]+)*\s*)$/);
      if (tagMatch) {
        const cut = result.length - tagMatch[1].length;
        result = result.slice(0, cut) + judgmentClosing + result.slice(cut);
      } else {
        result += judgmentClosing;
      }
    }
  }

  // 마무리 이미지
  if (imageAlts.closing && !result.includes(imageAlts.closing)) {
    result += "\n\n" + imageAlts.closing + "\n";
  }

  // 최종 해시태그 묶음 추가 직전 — 본문 마지막에 떠있는 인라인 해시태그 마지막 정리
  result = result.replace(/(\s|^)#[가-힣A-Za-z0-9]+(?=\s|$)/g, (m, p1) => p1);
  result = result.replace(/\n#[^\n]+\n+(?=\[이미지)/g, "\n");
  result = result.replace(/\n+$/, "");

  // 해시태그
  const tags = [
    "#" + region + "안과",
    "#" + region + "안과" + activeKeyword.replace(/\s/g, ""),
    "#" + activeKeyword.replace(/\s/g, ""),
    "#" + treatment.name.replace(/\s/g, "") + "후기",
    "#" + region + treatment.name.replace(/\s/g, ""),
    "#안과후기",
    "#" + activeKeyword.replace(/\s/g, "") + "후기",
  ];
  result += "\n\n" + tags.join(" ");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 시술 / 경과 / 일상
  // ─────────────────────────────────────────────
  result = result.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|시술|경과|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|시력|안압|안저|영상|진단|소견|장비/i.test(s)) return "[이미지: 검사 사진]";
    if (/시술|수술|레이저|라식|라섹|스마일|렌즈/.test(s))   return "[이미지: 시술 사진]";
    if (/경과|회복|after|결과|변화|관리/.test(s))            return "[이미지: 경과 사진]";
    if (/상담|진료|설명|차트|문진|원장|의사|병원/.test(s))   return "[이미지: 상담 사진]";
    if (/일상|복귀|평소|생활|마무리/.test(s))               return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = result.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|시술|경과|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC 로그 ────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const hasInfoBlock = !INFO_BLOCKS[treatment.id] || result.includes(INFO_BLOCKS[treatment.id].trim().split("\n")[0]);
  const hasExamValue = /\d/.test(result) && /(만원|비용|회복|통증|관리)/.test(result);
  const kwClean = activeKeyword.replace(/\s/g, "");
  const kwCount = (result.match(new RegExp(kwClean, "g")) || []).length;
  const finalRegionPlusNameCount = (result.match(new RegExp(regionPlusName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const charCount = calcEyeCharCount(result);

  console.log(`[QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[QC] 수치: ${hasExamValue}`);
  console.log(`[QC] 키워드반복: ${kwCount}`);
  console.log(`[QC] 지역+안과+진료명: ${finalRegionPlusNameCount}회 (목표 4회+)`);
  console.log(`[QC] 완전체키워드(지역+진료): ${fullCount}`);
  console.log(`[QC] 글자수: ${charCount}`);
  console.log(`[QC] 소요시간: ${elapsed}초 (단일 호출)`);

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const resultMarkdown = result;                          // 마크다운 원본 보존
  result = stripMarkdownForNaver(result);                 // 네이버 복사용 평문
  const charCountPlain = calcEyeCharCount(result);

  return res.status(200).json({
    success: true,
    text: result,
    textMarkdown: resultMarkdown,
    charCount: charCountPlain,
    qc: { hasInfoBlock, hasExamValue, kwCount, regionPlusNameCount: finalRegionPlusNameCount },
  });
}

// ============================================================
// 글자수 계산 (이미지·해시태그·헤더·공백 제외)
// ============================================================
function calcEyeCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "").length;
}
