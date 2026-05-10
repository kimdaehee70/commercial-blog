// ============================================================
// lib/pain-prompts.js — 통증의학과 프롬프트 빌더 v3 (mode 분기)
// personal: 과정 기록형 (1인칭 금지, 광고 어휘 제거)
// commercial: 3인칭 정보형 (의료광고법 안전)
// ============================================================

// ============================================================
// 치료별 방향 맵 — 고민·효과·키워드를 치료에 맞게 고정
// ============================================================
const PAIN_DIRECTION = {
  // ── 척추·디스크 ──
  lumbar_nerve_block:     { concern: "허리에서 다리로 내려가는 저림과 통증이 약물로도 잘 안 가라앉아서", effect: "신경 염증 변화, 다리 저림 변화, 통증 강도 변화", hook: "오래 서 있으면 다리까지 저리는 상황", keyword: "허리디스크 신경차단술" },
  cervical_nerve_block:   { concern: "목에서 팔로 내려가는 저림과 통증이 반복되어서", effect: "경추 신경 자극 변화, 팔 저림 변화, 통증 강도 변화", hook: "스마트폰을 오래 본 뒤 손까지 저린 상황", keyword: "목디스크 신경차단술" },
  spinal_stenosis_pain:   { concern: "조금만 걸어도 다리가 저리고 쉬어야 다시 걸을 수 있어서", effect: "신경관 압박 변화, 보행 거리 변화, 다리 저림 변화", hook: "장 보러 갔다가 중간중간 쉬어야 하는 상황", keyword: "척추관협착증" },
  nerve_plasty:           { concern: "신경차단술 반복으로도 통증이 지속되어서", effect: "신경 유착 박리, 만성 통증 강도 변화", hook: "수술 전 비수술 단계에서 다른 접근이 필요한 상황", keyword: "신경성형술" },
  chronic_pain:           { concern: "약물·물리치료로도 만성 통증이 6개월 이상 지속되어서", effect: "통증 강도 변화, 일상 부담 변화", hook: "여러 곳을 다녀봐도 통증이 가라앉지 않는 상황", keyword: "만성통증 클리닉" },
  sciatica:               { concern: "엉덩이에서 다리로 내려가는 저림과 당김이 반복되어서", effect: "이상근·좌골신경 변화, 다리 저림·당김 변화", hook: "오래 앉아 있으면 엉덩이부터 다리까지 저린 상황", keyword: "좌골신경통" },

  // ── 관절·인대 ──
  prolotherapy_pain:      { concern: "인대·건이 약해져 만성 통증이 반복되어서", effect: "조직 자극·재생, 인대 안정성 변화, 통증 강도 변화", hook: "같은 부위가 자주 다시 아픈 상황", keyword: "프롤로 주사" },
  prp_pain:               { concern: "만성 건염·연골 손상이 약물로 잘 안 낫아서", effect: "성장인자 자극, 조직 회복, 통증 강도 변화", hook: "여러 치료를 반복해도 통증이 잘 안 가라앉는 상황", keyword: "PRP 주사" },
  knee_injection:         { concern: "무릎 연골이 닳고 계단·보행 시 통증이 지속되어서", effect: "관절 윤활·통증 변화, 보행 변화", hook: "걸을 때마다 무릎이 시큰거리는 상황", keyword: "무릎 관절 주사" },
  shoulder_injection:     { concern: "어깨를 들 때 찌르는 통증이 반복되어서", effect: "견봉하 염증 변화, 가동범위 변화, 통증 강도 변화", hook: "옷을 입을 때 팔이 잘 안 올라가는 상황", keyword: "어깨 주사" },
  frozen_shoulder:        { concern: "어깨가 굳어서 가동 자체가 제한되어서", effect: "관절낭 유착 변화, 가동범위 변화, 야간통 변화", hook: "밤에 자다가 통증으로 깨는 상황", keyword: "오십견 수압팽창술" },
  stem_cell_knee:         { concern: "무릎 연골 손상이 진행되고 약·주사로 한계가 와서", effect: "줄기세포·연골 재생 자극, 통증·보행 변화", hook: "무릎 수술을 미루며 다른 접근을 찾는 상황", keyword: "무릎 줄기세포" },
  tmd:                    { concern: "턱이 딱딱거리고 입을 크게 벌리기 어려워서", effect: "턱관절·근육 긴장 변화, 개구 범위 변화, 통증 변화", hook: "음식을 먹을 때 턱이 걸리는 상황", keyword: "턱관절 통증치료" },

  // ── 재활·물리 ──
  manual_therapy_pain:    { concern: "자세 불균형과 만성 통증이 함께 있어서", effect: "근막 긴장 변화, 자세 정렬 변화, 통증 강도 변화", hook: "약을 먹어도 며칠 지나면 다시 아픈 상황", keyword: "도수치료" },
  shockwave_pain:         { concern: "만성 염증성 통증이 약물로는 잘 안 가라앉아서", effect: "조직 자극·재생, 염증 변화, 통증 강도 변화", hook: "발바닥·팔꿈치 같은 부위가 오래 낫지 않는 상황", keyword: "체외충격파" },
  ims_trigger:            { concern: "어깨·등의 깊은 결림이 마사지로도 안 풀려서", effect: "트리거포인트 자극, 결림 변화, 피로도 변화", hook: "한 곳을 만지면 다른 곳까지 통증이 퍼지는 상황", keyword: "IMS 치료" },
  radiofrequency_ablation:{ concern: "신경차단술 반복으로도 만성 통증이 잘 안 가라앉아서", effect: "신경 열응고, 통증 강도 변화", hook: "여러 비수술 치료에도 통증이 지속되는 상황", keyword: "고주파 열응고술" },
  fibromyalgia:           { concern: "전신에 통증이 퍼지고 일상 피로가 심해서", effect: "근막·전신 통증 변화, 수면·피로 변화", hook: "여러 곳이 아파 어디부터 치료해야 할지 모르는 상황", keyword: "섬유근육통" },

  // ── 두통·신경 ──
  headache_nerve_block:   { concern: "긴장성·후두신경통이 약물로 잘 안 가라앉아서", effect: "후두신경 차단, 두통 빈도·강도 변화", hook: "주말에 쉬어도 두통이 가라앉지 않는 상황", keyword: "두통 신경차단" },
  postherpetic_neuralgia: { concern: "대상포진 회복 후에도 통증이 만성으로 남아서", effect: "신경 회복 자극, 통증 강도 변화", hook: "피부는 나았는데 통증이 계속 남아 있는 상황", keyword: "대상포진 후 신경통" },
  neuropathic_pain:       { concern: "찌르는·타는 듯한 신경병증성 통증이 반복되어서", effect: "신경 염증 변화, 통증 양상 변화", hook: "약을 먹어도 통증 양상이 잘 안 바뀌는 상황", keyword: "신경병증성 통증" },
  cancer_pain:            { concern: "암 치료 중·후 통증이 약물로 잘 조절되지 않아서", effect: "통증 강도 변화, 일상·수면 부담 변화", hook: "약 용량을 늘려도 통증이 잘 안 가라앉는 상황", keyword: "암성 통증 관리" },
  cervicogenic_pain:      { concern: "목에서 시작된 통증이 어깨·머리까지 이어져서", effect: "경추·근막 긴장 변화, 통증 범위 변화", hook: "목을 쓰면 어깨·뒷머리까지 무거워지는 상황", keyword: "경추성 통증" },

  // ── 족부·하지 ──
  plantar_fasciitis_pain: { concern: "아침에 첫 발을 디딜 때 발바닥에 찌르는 통증이 있어서", effect: "족저근막 염증 변화, 통증 강도 변화, 보행 변화", hook: "아침마다 첫 걸음이 부담스러운 상황", keyword: "족저근막염" },
  ankle_pain:             { concern: "발목을 자주 삐고 만성 불안정이 남아서", effect: "인대 안정성 변화, 통증 강도 변화, 보행 안정 변화", hook: "평지에서도 가끔 발목이 꺾이는 상황", keyword: "발목 인대 손상" },
  wrist_elbow_pain:       { concern: "손목·팔꿈치 사용이 잦아 만성 통증이 반복되어서", effect: "건염·신경 변화, 통증·악력 변화", hook: "타이핑·물건 들기 시 통증이 도지는 상황", keyword: "손목·팔꿈치 통증" },
  coccyx_pelvic_pain:     { concern: "꼬리뼈·골반에 만성 통증이 있어 앉기가 어려워서", effect: "미골·골반 부담 변화, 통증 강도 변화", hook: "오래 앉아 있기가 부담스러운 상황", keyword: "꼬리뼈·골반 통증" },
};

/** 치료 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return PAIN_DIRECTION[treatmentId] || {
    concern: "통증이 만성으로 이어져서",
    effect:  "통증·기능 변화",
    hook:    "일상 동작 중 통증을 인식하는 상황",
    keyword: "통증 치료",
  };
}

// ============================================================
// 헬퍼 — AI 냄새 제거 가이드
// ============================================================
function getAiSmellGuide() {
  return (
    "[AI 냄새 제거 — 절대 금지 표현]\n" +
    "❌ \"드디어 결심하고\" / \"결국 선택하게 되었어요\"\n" +
    "❌ \"마음이 편안해졌어요\" / \"믿음이 갔어요\" / \"친절하고 전문적이셔서\"\n" +
    "❌ \"새로운 삶\" / \"삶의 질이 크게\" / \"일상이 완전히 달라\"\n" +
    "❌ \"특히\", \"또한\", \"무엇보다\" 연속 나열\n" +
    "❌ \"어느 날 갑자기\" / \"문득 느꼈습니다\" / \"새삼 깨달았다\"\n" +
    "❌ \"~할 수밖에 없었습니다\" / \"~지 않을 수 없었습니다\"\n"
  );
}

function getKwDensityGuide(activeKeyword) {
  return (
    "[키워드 밀도]\n" +
    "- 핵심 치료명(" + activeKeyword + ") 이 글에 5회 이상 자연스럽게 분산\n" +
    "- 같은 단어 두 번 이어 쓰지 말 것 (예: \"무릎 무릎 통증\" 금지)\n" +
    "- 키워드 억지 반복 금지 — 문맥에 맞게 분산\n"
  );
}

function getCommercialFlowGuide(sectionKey) {
  const flowMap = {
    concern:  "해당 치료를 찾는 일반적인 배경·증상을 사실 기술로 정리",
    search:   "관련 정보를 찾는 일반적 경로(검색·블로그·지인 문의)를 객관적으로 안내",
    consult:  "상담에서 일반적으로 다뤄지는 항목(횟수·간격·통증·비용)을 정보형으로 정리",
    decision: "선택 시 일반적으로 고려하는 요소(다운타임·회복기간·예산·기대 변화)를 정리",
    reason:   "비교 대상 대비 해당 치료가 일반적으로 선택되는 이유를 사실 기술",
    result:   "시간 흐름(1일/1주/2주/1개월) 별 일반적 경과를 관찰형으로 정리",
    closing:  "정보 종합 정리 + 상담 권유는 평이한 안내 수준으로",
  };
  return flowMap[sectionKey] || "객관적 정보 기술";
}

/** 섹션별 이미지 ALT 텍스트 생성 — mode 분기 */
export function getPainImageAlts(treatment, region, activeKeyword, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  const name      = treatment.name;
  const dir       = getDirection(treatment.id);
  const ak        = activeKeyword || name;
  const akClean   = ak.replace(/\s/g, "");
  const fullKw    = region + " " + ak;

  if (validMode === "commercial") {
    return {
      concern:  "[이미지: " + region + " 통증의학과 " + ak + " 일반 정보 | " + ak + " 진료 안내]",
      search:   "[이미지: " + region + " 통증의학과 " + ak + " 정보 검색 | " + fullKw + " 안내 화면]",
      consult:  "[이미지: " + region + " 통증의학과 " + ak + " 상담 안내 | " + fullKw + " 상담 절차]",
      result1:  "[이미지: " + ak + " 1주 경과 안내 | " + dir.effect.split(",")[0].trim() + " 일반 경과]",
      result2:  "[이미지: " + fullKw + " 2주 경과 | " + (dir.effect.split(",")[1] || dir.effect.split(",")[0]).trim() + " 일반 경과]",
      result3:  "[이미지: " + fullKw + " 1개월 경과 안내 | " + region + " 통증의학과 " + akClean + " 일반 경과]",
      closing:  "[이미지: " + fullKw + " 진료 정보 | " + ak + " 안내]",
    };
  }

  // personal — 톤 다운 (광고 어휘 제거, 관찰형 표현)
  return {
    concern:  "[이미지: " + fullKw + " 진행 사례 | " + ak + " 시작 전 상태 기록]",
    search:   "[이미지: " + region + " 통증의학과 " + ak + " 정보 비교 | " + fullKw + " 비교 화면]",
    consult:  "[이미지: " + region + " 통증의학과 " + ak + " 상담 과정 | " + fullKw + " 상담 장면]",
    result1:  "[이미지: " + ak + " 1주 경과 | " + dir.effect.split(",")[0].trim() + " 초기 경과]",
    result2:  "[이미지: " + fullKw + " 2주 경과 | " + (dir.effect.split(",")[1] || dir.effect.split(",")[0]).trim() + " 중간 경과]",
    result3:  "[이미지: " + fullKw + " 1개월 경과 | " + region + " 통증의학과 " + akClean + " 최종 경과]",
    closing:  "[이미지: " + fullKw + " 진행 종합 | 치료 후 변화 기록]",
  };
}

// ============================================================
// 시스템 프롬프트는 generatePain.js 에서 mode별로 직접 생성
// (PAIN_SYSTEM_PROMPT export 유지 — 호환성)
// ============================================================
export const PAIN_SYSTEM_PROMPT =
  "당신은 통증의학과 치료 진행 사례를 \"과정 기록\" 톤으로 작성하는 전문 작성자입니다.\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[톤 — 과정 기록형 (가장 중요)]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "- 1인칭 시점 절대 금지: \"저는/제가/내가/저도/저희/제 케이스\" 사용 금지\n" +
  "- 어미는 중립 기록형: ~됨 / ~된다 / ~되는 경우 / ~확인됨 / ~나타남 / ~로 진행됨\n" +
  "- 후기 어미 금지: \"~했어요 / ~더라고요 / ~거든요\"\n" +
  "- 광고 어휘 금지: \"솔직 / 추천 / 꼭 / 만족 / 후회 없음 / 다행\"\n" +
  "- CTA 금지: \"상담 받아보세요 / 방문해보세요 / 권해드려요\"\n" +
  "- 검색 의도 매칭 위해 \"후기\" 단어는 글 전체에서 1~2회까지만 사용 가능\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[절대 규칙]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "- 병원 이름·특정 브랜드명 언급 금지\n" +
  "- 효과 단정 금지: \"확실히/완벽히/100%/사라짐/완치\" → \"통증 변화가 관찰됨/체감 변화가 있음\"\n" +
  "- 가격 직접 언급 금지: \"비용은 상담 시 안내됨\"으로 표기\n" +
  "- 전체 글자수 최소 2000자 이상\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[글 구조 — 순서 절대 유지]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "## 고민 (최소 220자)\n" +
  "## 탐색 (최소 200자)\n" +
  "## 상담 (최소 250자)\n" +
  "## 결정 (최소 200자)\n" +
  "## 치료 후 변화 (최소 280자) — ### 1일 / ### 1주 / ### 2주 / ### 1개월\n" +
  "## 마무리 (최소 180자)\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "이 조건을 모두 만족하는 통증의학과 진행 사례 기록을 작성하세요.";

// ============================================================
// 빌더 진입점 — mode 분기
// ============================================================
export function buildPainPrompt(section, treatment, region, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  if (validMode === "commercial") {
    return buildCommercialPainPrompt(section, treatment, region);
  }
  return buildPersonalPainPrompt(section, treatment, region);
}

// ============================================================
// PERSONAL 빌더 — 과정 기록형 (1인칭 금지, 광고 어휘 제거)
// ============================================================
function buildPersonalPainPrompt(section, treatment, region) {
  switch (section) {
    case "concern":   return _personalConcern(treatment, region);
    case "search":    return _personalSearch(treatment, region);
    case "consult":   return _personalConsult(treatment, region);
    case "decision":
    case "reason":    return _personalReason(treatment, region);
    case "result":    return _personalResult(treatment, region);
    case "closing":   return _personalClosing(treatment, region);
    default:          return "";
  }
}

function _personalConcern(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 고민 | 최소 220자]\n" +
    "치료명: " + name + " | 지역: " + region + "\n" +
    "🔒 이 치료의 고민 방향: " + dir.concern + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지 (\"저는/제가\" 등 사용 금지)\n" +
    "- 어미: ~됨 / ~된다 / ~확인됨 / ~나타남\n" +
    "- 광고 어휘 금지 (\"솔직/추천/꼭/만족/다행\")\n\n" +
    "[작성 방향]\n" +
    "- 사례에서 관찰된 증상을 사실 기술로 정리\n" +
    "- \"" + dir.hook + "\"과 같은 일반적 상황을 객관적으로 묘사\n" +
    "- 일상 동작(걷기·앉기·계단·수면 등)에서 통증이 인식되는 경위 1~2개 포함\n" +
    "- 감정 단어 사용 시 강도 낮게 (\"불편이 있었음\", \"부담이 쌓였음\" 정도)\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션의 마지막 문장은 다음 중 하나의 패턴으로 정확히 끝낼 것:\n" +
    "  ① \"통증이 반복되다 보니 일상 유지 자체가 부담스럽게 느껴지는 상태였음.\"\n" +
    "  ② \"같은 패턴이 이어지면서 평소 생활 흐름에 부담이 쌓이는 상태였음.\"\n" +
    "  ③ \"증상이 반복되면서 일상 동작에 대한 부담이 점점 커지는 상황이었음.\"\n" +
    "  ④ \"같은 상황이 이어지면서 일상에 부담이 누적되는 상태였음.\"\n" +
    "  → 위 4개 중 1개 또는 그 변형으로 마지막 줄 작성. 절대 다른 톤으로 끝내지 말 것.\n" +
    "  → \"필요하다고 판단되었다\" / \"전문적인 접근이 필요\" 같은 일반론 금지.\n"
  );
}

function _personalSearch(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 탐색 | 최소 200자]\n" +
    "치료명: " + name + " | 지역: " + region + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~됨 / ~검토됨 / ~확인됨\n\n" +
    "[작성 방향]\n" +
    "- \"" + region + " " + dir.keyword + "\" 키워드 검색 과정을 객관적으로 기술\n" +
    "- 네이버·블로그 정보 비교 과정\n" +
    "- 병원 2~3곳 정보 검토\n" +
    "- \"" + region + " 통증의학과\" 표현 3회 이상 자연스럽게 포함\n" +
    "- \"꼭/반드시/추천받아\" 같은 강조 어휘 금지\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션에는 반드시 \"3축 비교 문장\" 1개를 포함할 것:\n" +
    "  ① \"특히 치료 횟수, 통증 수준, 회복 기간을 기준으로 비교 검토가 진행됨.\"\n" +
    "  ② \"비교 시 치료 횟수·통증 정도·회복 기간 3가지가 핵심 판단 기준으로 작용함.\"\n" +
    "  ③ \"각 진료처의 치료 횟수, 통증 정도, 회복 기간이 비교 기준으로 검토됨.\"\n" +
    "  → 위 3개 중 1개 또는 그 변형으로 탐색 중반에 반드시 포함.\n\n" +
    "그리고 이 섹션의 마지막 문장은 \"왜 그 곳을 선택했는지\" 구체적 트리거 1개를 명시할 것:\n" +
    "  ① \"여러 곳 상담을 받아본 결과, 증상별로 치료 방법을 구분해서 설명한 점이 선택에 영향을 줌.\"\n" +
    "  ② \"여러 진료처 비교 결과, 단계별 변화 시점을 구체적으로 안내한 점이 선택 기준으로 작용함.\"\n" +
    "  ③ \"비교 진료처 대비 동일 케이스 진행 흐름을 직접 보여주며 설명한 점이 영향을 줌.\"\n" +
    "  ④ \"여러 곳 검토 결과, 상담 시 회복 기간·관리법을 단계별로 안내한 점이 결정 요인으로 작용함.\"\n" +
    "  → 위 4개 중 1개 또는 그 변형으로 마지막 줄 작성. 절대 다른 톤으로 끝내지 말 것.\n" +
    "  → \"종합적으로 검토함\" / \"다양한 정보를 얻을 수 있음\" 같은 일반론 금지.\n" +
    "  → \"개별 상담이 중요\" 같은 결론도 금지.\n"
  );
}

function _personalConsult(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 치료";
  const dir     = getDirection(treatment.id);
  return (
    "[섹션: 상담 | 최소 250자]\n" +
    "치료명: " + name + " | 비교 치료: " + compare + " | 지역: " + region + "\n" +
    "🔒 이 치료 효과 방향: " + dir.effect + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~안내됨 / ~확인됨 / ~검토됨\n" +
    "- 의사 발언 인용 시 단정형 금지 (\"확실히/완벽히/100%\" 사용 안 됨)\n\n" +
    "[필수 포함]\n" +
    "✔ 치료 횟수 (예: 3~5회)\n" +
    "✔ 치료 간격 (예: 1~2주 간격)\n" +
    "✔ 통증 수준 (10점 기준 수치)\n" +
    "✔ 비용은 \"상담 시 안내됨\"으로 표기 (직접 가격 금지)\n" +
    "✔ " + name + " vs " + compare + " 비교 — 사실 기술 형식\n" +
    "- 의사 안내 1회 이상 인용 (단정형 금지, \"~할 수 있다고 안내됨\" 형식)\n" +
    getAiSmellGuide()
  );
}

function _personalReason(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 치료";
  const dir     = getDirection(treatment.id);
  return (
    "[섹션: 결정 | 최소 200자]\n" +
    "치료명: " + name + " | 비교 치료: " + compare + "\n" +
    "🔒 이 치료 효과 방향: " + dir.effect + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~로 결정됨 / ~확인됨 / ~검토됨\n" +
    "- \"결심/만족/후회 없음/다행\" 같은 어휘 금지\n\n" +
    "[작성 방향]\n" +
    "- 회복 기간·일상 복귀·예산·기대 변화 중 본 케이스의 우선순위 1~2개\n" +
    "- 비교 포인트는 간결히 (감정 묘사 최소화)\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션의 마지막 문장은 다음 \"비교 → 결정\" 흐름으로 정확히 끝낼 것:\n" +
    "  ① \"" + compare + "만으로는 한계가 있다고 판단되어, " + name + "을(를) 병행해보기로 결정됨.\"\n" +
    "  ② \"" + compare + " 대신 " + name + "을(를) 우선 진행해보는 방향으로 정리됨.\"\n" +
    "  ③ \"" + compare + "을(를) 바로 진행하기보다는 " + name + "을(를) 먼저 진행해보기로 결정됨.\"\n" +
    "  ④ \"" + compare + " 단독으로는 변화가 더디다고 판단되어, " + name + "을(를) 병행하는 방향으로 결정됨.\"\n" +
    "  → 위 4개 중 1개 또는 그 변형으로 마지막 줄 작성.\n" +
    "  → 절대 금지: \"최적의 선택으로 판단됨\" / \"종합적으로 고려하여\" / \"긍정적으로 작용함\".\n"
  );
}

function _personalResult(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 치료 후 변화 | 최소 280자]\n" +
    "치료명: " + name + "\n" +
    "🔒 변화 방향: " + dir.effect + "\n" +
    "🔒 절대 금지: 위 방향과 다른 효과 서술 (예: 무릎 치료인데 허리 호전 언급 금지)\n\n" +
    "[톤 — 관찰형 기록]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~됨 / ~확인됨 / ~나타남 / ~관찰됨\n" +
    "- 효과 단정 금지: \"사라짐/완전히 없어짐/100%\" → \"통증 변화가 관찰됨/체감 변화가 있었음\"\n\n" +
    "[필수 구조 — ### 헤더 포함]\n" +
    "### 1일\n" +
    "- 치료 직후 일반 반응 (시술 부위 통증·뻐근함·약간의 멍 등) 객관 기술\n" +
    "- ★ 큰 변화는 아직 없음을 명시\n" +
    "### 1주\n" +
    "- 초기 변화 (염증·자극이 먼저 가라앉는 흐름 — 관찰형, 통증 강도 단정 금지)\n" +
    "### 2주\n" +
    "- 중간 변화 (" + (dir.effect.split(",")[1] || dir.effect.split(",")[0]) + " — 관찰형)\n" +
    "### 1개월\n" +
    "- 최종 변화 (전체 체감 변화 — 단정 금지)\n" +
    "- 불편 사항도 사실 기술로 포함\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "### 1일 섹션은 다음 패턴으로 시작할 것:\n" +
    "  · \"치료 직후에는 큰 변화가 관찰되지 않음. [시술 부위 뻐근함·약한 멍 등 일반 반응 1개]만 나타남.\"\n" +
    "  · 또는 \"직후에는 별다른 변화는 나타나지 않음. [일반 반응 1개]가 잠시 관찰됨.\"\n" +
    "  → 절대 금지: \"1일차에 통증 사라짐\" / \"즉각적 효과\" / \"바로 좋아짐\"\n\n" +
    "### 1주 섹션은 다음 패턴 중 1개로 작성:\n" +
    "  · \"즉각적인 큰 변화보다는, 시술 부위 염증이 먼저 가라앉는 흐름이 체감된 상태였음.\"\n" +
    "  · \"일주일 정도 지나면서 [통증 양상]이 조금씩 달라지는 흐름이 나타남.\"\n" +
    "  · \"큰 변화보다는 [핵심 효과]가 우선 체감되는 단계로 정리됨.\"\n" +
    "  → 절대 금지: \"1주차에 통증 사라짐\" / \"빠르게 회복\" / \"눈에 띄게 좋아짐\"\n"
  );
}

function _personalClosing(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 마무리 | 최소 180자]\n" +
    "치료명: " + name + " | 지역: " + region + "\n" +
    "🔒 핵심 변화 요약 방향: " + dir.effect + "\n\n" +
    "[톤 — 사실 종합]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~됨 / ~정리됨 / ~확인됨\n" +
    "- CTA 금지: \"상담 받아보세요/방문해보세요/권해드려요\" 일체 금지\n" +
    "- \"추천/적극/꼭/무조건\" 어휘 금지\n\n" +
    "[작성 방향]\n" +
    "- 변화 한 줄 요약 (단정 금지, \"체감 변화가 있었음\" 수준)\n" +
    "- 일반적으로 도움이 될 수 있는 케이스 유형 1~2개 안내 (사실 기술)\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션의 마지막 문장은 \"단기 효과 < 지속 관리\" 흐름으로 정확히 끝낼 것:\n" +
    "  ① \"결과적으로 단기간 효과보다는, 지속적인 관리가 통증 회복에 더 중요한 요소로 작용함을 확인하게 됨.\"\n" +
    "  ② \"결과적으로 변화는 단계적으로 나타났으며, 초기 판단보다 꾸준한 관리가 더 비중 있게 작용한다는 점이 확인됨.\"\n" +
    "  ③ \"변화는 한 번에 나타나기보다 단계적으로 정리되며, 꾸준한 진행이 결과 차이를 만들어내는 점이 관찰됨.\"\n" +
    "  ④ \"단기 변화보다 단계별 진행 흐름이 결과에 더 큰 영향을 주는 것으로 정리됨.\"\n" +
    "  → 위 4개 중 1개 또는 그 변형으로 마지막 줄 작성.\n" +
    "  → 절대 금지: \"긍정적 영향\" / \"개선을 기대\" / \"전반적 효과\" / \"경과 관찰 중요\".\n"
  );
}

// ============================================================
// COMMERCIAL 빌더 — 3인칭 정보형 (의료광고법 안전)
// ============================================================
function buildCommercialPainPrompt(section, treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 치료";
  const dir     = getDirection(treatment.id);
  const flowGuide = getCommercialFlowGuide(section);

  const base =
    "[섹션 정보 — 3인칭 정보형 글]\n" +
    "치료명: " + name + " | 지역: " + region + " | 비교 치료: " + compare + "\n" +
    "🔒 이 치료 방향: " + dir.concern + "\n" +
    "🔒 효과 방향: " + dir.effect + "\n\n" +
    "[톤 — 정보형 안내]\n" +
    "- 3인칭 시점 (\"환자\", \"방문자\", \"내원자\" 또는 일반 주어)\n" +
    "- 1인칭 절대 금지 (\"저는/제가/우리/제 케이스\")\n" +
    "- 후기 어투 금지 (\"~했어요/~더라고요/~거든요\")\n" +
    "- 어미: ~됩니다 / ~로 안내됩니다 / ~경우가 있습니다 / ~로 진행됩니다\n" +
    "- 효과 단정 금지: \"확실히/100%/완치/사라짐\" → \"변화가 관찰될 수 있습니다\"\n" +
    "- 추천·CTA 금지: \"추천합니다/방문해보세요/꼭 받으세요\" 일체 금지\n" +
    "- 가격 직접 표기 금지: \"비용은 상담 시 안내됩니다\"\n" +
    "- 병원·의료진 평가 금지: \"친절/전문/최고/믿음직\" 어휘 사용 금지\n\n" +
    "[이 섹션 흐름]\n" +
    "- " + flowGuide + "\n\n";

  switch (section) {
    case "concern":
      return base +
        "[섹션: 고민·증상 안내 | 최소 220자]\n" +
        "- 해당 치료가 일반적으로 고려되는 배경·증상을 객관 정리\n" +
        "- 일상 맥락에서 통증·기능 제한이 인식되는 사례를 일반 기술 형식으로\n" +
        "- 강한 감정·과장 표현 금지\n" +
        getAiSmellGuide();

    case "search":
      return base +
        "[섹션: 정보 탐색 안내 | 최소 200자]\n" +
        "- \"" + region + " " + dir.keyword + "\" 관련 정보를 찾는 일반적 경로 안내\n" +
        "- 네이버·블로그 정보 비교 절차\n" +
        "- \"" + region + " 통증의학과\" 표현 3회 이상 자연스럽게 포함\n" +
        getAiSmellGuide();

    case "consult":
      return base +
        "[섹션: 상담 안내 | 최소 250자]\n" +
        "✔ 치료 횟수 (예: 3~5회)\n" +
        "✔ 치료 간격 (예: 1~2주)\n" +
        "✔ 통증 수준 (10점 기준)\n" +
        "✔ 비용은 \"상담 시 안내됩니다\"\n" +
        "✔ " + name + " vs " + compare + " 일반 비교\n" +
        "- 의사 발언 인용 금지 (정보형 안내문으로만 기술)\n" +
        getAiSmellGuide();

    case "decision":
    case "reason":
      return base +
        "[섹션: 선택 시 일반 고려사항 | 최소 200자]\n" +
        "- " + name + "이(가) " + compare + " 대비 일반적으로 선택되는 이유를 정보형으로 정리\n" +
        "- 회복 기간·일상 복귀·예산·기대 변화 일반 안내\n" +
        getAiSmellGuide();

    case "result":
      return base +
        "[섹션: 시간 흐름별 일반 경과 | 최소 280자]\n" +
        "🔒 변화 방향: " + dir.effect + "\n" +
        "🔒 절대 금지: 효과 단정 (\"사라짐/완전 회복/100%\")\n\n" +
        "[필수 구조 — ### 헤더 포함]\n" +
        "### 1일\n" +
        "- 일반적 직후 반응 (시술 부위 뻐근함·약한 멍 등) 객관 안내\n" +
        "### 1주\n" +
        "- 초기 변화 일반 안내 (시술 부위 염증·자극이 먼저 가라앉는 흐름)\n" +
        "### 2주\n" +
        "- 중간 변화 일반 안내 (" + (dir.effect.split(",")[1] || dir.effect.split(",")[0]) + ")\n" +
        "### 1개월\n" +
        "- 최종 변화 일반 안내 (개인차 명시)\n" +
        "- 일반적 불편 사항도 객관 기술\n" +
        getAiSmellGuide();

    case "closing":
      return base +
        "[섹션: 종합 안내 | 최소 180자]\n" +
        "- 정보 종합 정리 (CTA·권유 금지)\n" +
        "- 일반적으로 고려할 수 있는 케이스 유형 1~2개 객관 안내\n" +
        "- 마지막 줄은 정보 종합으로 마무리 (\"~참고가 됩니다\" 수준)\n" +
        getAiSmellGuide();

    default:
      return base;
  }
}

// ============================================================
// 전체 글 단일 생성용 프롬프트 (호환성 유지 — mode 분기)
// ============================================================
export function buildPainFullPrompt(treatment, region, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 치료";
  const dir     = getDirection(treatment.id);

  const titlePattern =
    treatment.titlePatterns?.[
      Math.floor(Math.random() * (treatment.titlePatterns?.length || 1))
    ] || "{region} {name} 후기";

  const title = titlePattern
    .replace("{region}", region)
    .replace("{name}", name);

  const modeLine = (validMode === "commercial")
    ? "🔒 모드: 상업용 정보글 (3인칭, 의료광고법 안전)\n"
    : "🔒 모드: 진행 사례 기록 (1인칭 금지, 과정 기록형)\n";

  return (
    "제목: " + title + "\n" +
    modeLine +
    "치료명: " + name + " | 비교치료: " + compare + " | 지역: " + region + "\n\n" +
    "🔒 고민 방향: " + dir.concern + "\n" +
    "🔒 효과 방향: " + dir.effect + "\n\n" +
    "[필수 수치]\n" +
    "- 치료 횟수 / 간격 / 통증(10점 기준) / 비용은 상담 시 안내\n" +
    "- 변화: 1일·1주·2주·1개월\n\n" +
    "[비교 필수]\n" +
    name + " vs " + compare + " + 2개 추가 치료 비교\n\n" +
    "위 조건으로 완성된 글을 작성하세요."
  );
}