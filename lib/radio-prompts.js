// ╔══════════════════════════════════════════════════════════╗
// ║ radio-prompts.js — 영상의학과 프롬프트 빌더 v1 (검사형)    ║
// ║ 축: 검색자 목적(증상) → 어떤 검사가 필요한가 → 판독 안내   ║
// ║ 톤: 정보형·비1인칭·의료광고법 안전 (pain 톤 계승)          ║
// ║ ⚠ 관측 전. FREEZE 아님. STEP1 엔진 생성분.                 ║
// ║ 검사형 핵심: '치료/시술'이 아니라 '검사 목적·대상·판독'.   ║
// ╚══════════════════════════════════════════════════════════╝

// ============================================================
// 검사별 방향 맵 — 목적(어떤 증상에서)·확인대상·키워드 고정
// concern = 검색 직전 증상 상황 / target = 검사로 확인하는 대상
// ============================================================
const RADIO_DIRECTION = {
  // ── 머리·어지럼 ──
  brain_mri_headache: { concern: "두통·어지럼이 반복되는데 원인이 뚜렷하지 않아 확인이 필요해서", target: "뇌 실질·혈관·미세 병변 확인", hook: "약을 먹어도 두통이 자주 반복되는 상황", keyword: "뇌 MRI" },
  brain_ct_screening: { concern: "갑작스러운 두통이나 머리 외상 후 빠른 확인이 필요해서", target: "출혈·골절·급성 병변 확인", hook: "머리를 부딪친 뒤 상태 확인이 필요한 상황", keyword: "뇌 CT" },
  carotid_ultrasound: { concern: "어지럼이 잦고 혈관 상태를 확인하고 싶어서", target: "경동맥 협착·혈류 상태 확인", hook: "가족력이 있어 혈관 건강이 신경 쓰이는 상황", keyword: "경동맥 초음파" },

  // ── 허리·목·관절 ──
  spine_mri: { concern: "다리 저림을 동반한 허리 통증이 지속되어 원인 확인이 필요해서", target: "디스크·신경 압박·척추 상태 확인", hook: "오래 앉아 있으면 다리까지 저린 상황", keyword: "척추 MRI" },
  joint_mri: { concern: "무릎이나 어깨 통증이 오래가 정확한 원인을 알고 싶어서", target: "연골·인대·힘줄 손상 확인", hook: "특정 동작에서 관절이 계속 아픈 상황", keyword: "관절 MRI" },
  bone_densitometry: { concern: "뼈가 약해지는 골다공증 위험을 확인하고 싶어서", target: "뼈 밀도(골밀도 수치) 확인", hook: "폐경 이후 뼈 건강이 신경 쓰이는 상황", keyword: "골밀도 검사" },

  // ── 가슴·호흡 ──
  chest_ct: { concern: "기침이 오래가거나 흡연력이 있어 폐 상태 확인이 필요해서", target: "폐 결절·초기 병변 확인", hook: "건강검진에서 추가 확인을 권유받은 상황", keyword: "폐 CT" },
  chest_xray: { concern: "기본적인 폐와 심장 상태를 확인하고 싶어서", target: "폐·심장 음영 기본 확인", hook: "건강검진 기본 항목으로 확인이 필요한 상황", keyword: "흉부 엑스레이" },

  // ── 배·소화기 ──
  abdominal_ultrasound: { concern: "속이 자주 불편하거나 간 수치가 높게 나와 확인이 필요해서", target: "간·담낭·췌장·신장 상태 확인", hook: "검진에서 간 수치 이상을 안내받은 상황", keyword: "복부 초음파" },
  abdominal_ct: { concern: "복통이 지속되어 초음파보다 정밀한 확인이 필요해서", target: "복강 내 장기·병변 정밀 확인", hook: "원인이 명확하지 않은 복통이 이어지는 상황", keyword: "복부 CT" },

  // ── 종합검진 ──
  health_screening: { concern: "특별한 증상은 없지만 정기적으로 몸 상태를 확인하고 싶어서", target: "주요 장기 영상 종합 확인", hook: "나이가 들며 정기 검진 필요를 느끼는 상황", keyword: "영상 종합검진" },
  thyroid_ultrasound: { concern: "목에 결절이 만져지거나 갑상선 확인이 필요해서", target: "갑상선 결절·크기·성상 확인", hook: "검진에서 갑상선 결절을 안내받은 상황", keyword: "갑상선 초음파" },
  breast_ultrasound: { concern: "멍울이 만져지거나 정기 유방 검진이 필요해서", target: "유방 종괴·조직 밀도 확인", hook: "정기적으로 유방 검진을 챙기려는 상황", keyword: "유방 초음파" },
};

function getDirection(id) {
  return RADIO_DIRECTION[id] || {
    concern: "관련 증상이 반복되어 정확한 확인이 필요해서",
    target: "해당 부위 상태 확인",
    hook: "증상이 지속되어 검사를 알아보게 되는 상황",
    keyword: "영상 검사",
  };
}

// ============================================================
// 섹션별 이미지 ALT — 검사형 (판독·검사 장비 중심)
// ============================================================
export function getRadioImageAlts(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const dir     = getDirection(treatment.id);
  const ak      = activeKeyword || name;
  const akClean = ak.replace(/\s/g, "");
  const fullKw  = region + " " + ak;

  return {
    concern: "[이미지: " + fullKw + " 검사 안내 | " + ak + " 대상 증상 정보]",
    search:  "[이미지: " + region + " 영상의학과 " + ak + " 정보 비교 | " + fullKw + " 검사 항목 안내]",
    consult: "[이미지: " + region + " 영상의학과 " + ak + " 진행 방식 | " + fullKw + " 검사 절차]",
    result1: "[이미지: " + ak + " 검사 진행 안내 | " + dir.target.split("·")[0].trim() + " 확인 과정]",
    result2: "[이미지: " + fullKw + " 판독 안내 | 검사 결과 확인 절차]",
    result3: "[이미지: " + fullKw + " 결과 안내 | " + region + " 영상의학과 " + akClean + " 정보]",
    closing: "[이미지: " + fullKw + " 검사 정보 | " + ak + " 안내]",
  };
}

// ============================================================
// SYSTEM PROMPT — 검사형·정보형·의료광고법 안전
// ============================================================
export const RADIO_SYSTEM_PROMPT =
  "당신은 영상의학과 검사 정보를 \"정보 안내\" 톤으로 작성하는 전문 작성자입니다.\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[톤 — 정보 안내형 (가장 중요)]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "- 1인칭 시점 절대 금지: \"저는/제가/내가/저도/저희/제 케이스\" 사용 금지\n" +
  "- 어미는 중립 안내형: ~됩니다 / ~하는 검사입니다 / ~확인합니다 / ~권장됩니다\n" +
  "- 후기 어미 금지: \"~했어요 / ~더라고요 / ~거든요\"\n" +
  "- 광고 어휘 금지: \"최고 / 정확도 100% / 완벽 / 꼭 / 강력 추천 / 후회 없음\"\n" +
  "- 검사는 '진단'을 대신하지 않음 — 결과 해석·진단 단정 금지 (\"~로 진단됩니다\" 금지)\n" +
  "- CTA 금지: \"예약하세요 / 방문해보세요 / 지금 검사받으세요\"\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[절대 규칙]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "- 병원 이름·특정 브랜드명·장비 상표명 언급 금지\n" +
  "- 결과 단정 금지: \"이상 없음/정상/암입니다\" → \"영상에서 확인하는 항목입니다\"\n" +
  "- 방사선·조영제 등은 일반 정보로만 안내, 안전성 과장·공포 유발 모두 금지\n" +
  "- 가격 직접 언급 금지: \"비용은 검사 항목에 따라 안내됩니다\"로 표기\n" +
  "- 전체 글자수 최소 2000자 이상\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[글 구조 — 순서 절대 유지]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "## 이런 증상일 때 (최소 220자) — 어떤 증상·상황에서 이 검사가 고려되는지\n" +
  "## 검사 알아보기 (최소 200자) — 이 검사가 무엇을 확인하는지, 유사 검사와 차이\n" +
  "## 검사 진행 방식 (최소 250자) — 준비·소요시간·진행 방식 일반 안내\n" +
  "## 함께 검토되는 검사 (최소 200자) — 비교 검사와의 선택 기준\n" +
  "## 검사와 판독 과정 (최소 280자) — 촬영 후 판독·결과 확인 흐름 (진단 단정 금지)\n" +
  "## 마무리 (최소 180자)\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "이 조건을 모두 만족하는 영상의학과 검사 안내 글을 작성하세요.";

// ============================================================
// AI 냄새 제거 가이드 (공통)
// ============================================================
function getAiSmellGuide() {
  return (
    "\n[AI 티 제거]\n" +
    "- '정리하면/결론적으로/따라서/체계적인/살펴보겠습니다' 금지\n" +
    "- 같은 문장 구조 3회 연속 반복 금지\n" +
    "- 지역+검사명 결합은 글 전체 3회 이하, 이후 '이 검사/해당 검사/여기서'로 자연 치환\n"
  );
}

// ============================================================
// 빌더 진입점 — 섹션별 (검사형)
// ============================================================
export function buildRadioPrompt(section, treatment, region, mode) {
  switch (section) {
    case "concern":  return _concern(treatment, region);
    case "search":   return _search(treatment, region);
    case "consult":  return _process(treatment, region);
    case "decision":
    case "reason":   return _compare(treatment, region);
    case "result":   return _reading(treatment, region);
    case "closing":  return _closing(treatment, region);
    default:         return "";
  }
}

function _concern(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 이런 증상일 때 | 최소 220자]\n" +
    "검사명: " + name + " | 지역: " + region + "\n" +
    "🔒 이 검사가 고려되는 배경: " + dir.concern + "\n\n" +
    "[성격 — 정보형 (개인 사연 아님)]\n" +
    "- 특정 인물 이야기가 아니라, 이 검사가 어떤 증상·상황에서 고려되는지 일반 정보로 설명.\n" +
    "- '한 사람은/환자는 ~했다' 식 이야기 시작 금지.\n\n" +
    "[작성 방향]\n" +
    "- 이 검사가 일반적으로 고려되는 증상을 사실 기술로 정리\n" +
    "- \"" + dir.hook + "\" 같은 상황에서 이 검사를 알아보게 된다는 식으로 일반화\n" +
    "- 어미 다양화 (동일 어미 3회 연속 금지), 1인칭 금지, 감정 표현 최소화\n" +
    getAiSmellGuide() +
    "\n[마지막 문장]\n" +
    "- '이런 증상이 반복될 때 " + name + " 검사가 고려됩니다' 정도의 정보형 문장으로 마무리.\n"
  );
}

function _search(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 검사 알아보기 | 최소 200자]\n" +
    "검사명: " + name + " | 지역: " + region + "\n" +
    "🔒 이 검사로 확인하는 대상: " + dir.target + "\n\n" +
    "[성격 — 정보형 (검색 여정 서사 아님)]\n" +
    "- '검색했다/여러 병원을 비교했다' 식 개인 행동 서술 금지.\n" +
    "- 이 검사(" + dir.keyword + ")가 무엇을 확인하는지, 어떤 원리인지 설명.\n\n" +
    "[작성 방향]\n" +
    "- 이 검사가 확인하는 대상(" + dir.target + ")을 사실 기술\n" +
    "- 유사 검사와의 차이(예: 방사선 유무, 연부조직/뼈 구분)를 간단히 정보형으로\n" +
    "- 지역명은 필요 시 1회 정도만\n" +
    getAiSmellGuide()
  );
}

function _process(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 검사";
  return (
    "[섹션: 검사 진행 방식 | 최소 250자]\n" +
    "검사명: " + name + " | 비교 검사: " + compare + " | 지역: " + region + "\n\n" +
    "[성격 — 정보형 (진료 장면 서술 아님)]\n" +
    "- '상담에서는 ~한다 / 의사는 ~했다' 식 장면 서술 금지. 검사 진행 방식 자체를 설명.\n\n" +
    "[필수 포함 — 항목 설명 형식]\n" +
    "✔ 검사 전 준비사항 (금식·복장·금속 제거 등 해당 시)\n" +
    "✔ 소요 시간·진행 방식은 일반 안내만. 구체 분/횟수 단정 대신 '대체로 ~정도'로 위임.\n" +
    "✔ 조영제·방사선 관련은 일반 정보로만, 과장·공포 유발 금지\n" +
    "✔ 비용은 \"검사 항목에 따라 안내됩니다\"로 표기 (직접 가격 금지)\n" +
    "- '맞춤 검사' 표현 대신 '상태에 따라 검사 범위가 달라질 수 있다' 정도로.\n" +
    getAiSmellGuide()
  );
}

function _compare(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 검사";
  return (
    "[섹션: 함께 검토되는 검사 | 최소 200자]\n" +
    "검사명: " + name + " | 비교 검사: " + compare + "\n\n" +
    "[성격 — 정보형 (개인 결정 서사 아님)]\n" +
    "- '~하기로 결정됨' 식 개인 결정 서사 금지.\n" +
    "- " + name + "과(와) " + compare + "이(가) 함께 검토되는 기준 자체를 설명.\n\n" +
    "[작성 방향]\n" +
    "- 두 검사의 확인 목적·적용 상황 차이를 사실 기술 (우열 단정 금지)\n" +
    "- 어떤 상황에서 어떤 검사가 먼저 고려되는지 일반 기준으로 안내\n" +
    "- 방사선 유무·연부조직 대비도 등 방식 차이만 서술\n" +
    getAiSmellGuide()
  );
}

function _reading(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 검사와 판독 과정 | 최소 280자]\n" +
    "검사명: " + name + " | 지역: " + region + "\n" +
    "🔒 확인 대상: " + dir.target + "\n\n" +
    "[성격 — 정보형 (결과 단정·진단 금지)]\n" +
    "- 촬영 후 영상 판독이 이뤄지는 일반 흐름을 설명.\n" +
    "- '정상입니다/이상 없습니다/암입니다' 같은 결과 단정 절대 금지 — 판독은 전문의 확인 사항으로 위임.\n\n" +
    "[작성 방향]\n" +
    "- 촬영 → 영상 확인 → 판독 → 결과 안내로 이어지는 일반 흐름 정보형 서술\n" +
    "- 판독에서 확인하는 항목(" + dir.target + ")을 일반 정보로 안내\n" +
    "- 추가 검사가 필요할 수 있다는 점을 일반 안내로 (구체 진단명 금지)\n" +
    "- 시간표(1일/1주) 나열 금지 — 흐름 위주로\n" +
    getAiSmellGuide()
  );
}

function _closing(treatment, region) {
  const name = treatment.name;
  return (
    "[섹션: 마무리 | 최소 180자]\n" +
    "검사명: " + name + " | 지역: " + region + "\n\n" +
    "[작성 방향]\n" +
    "- 이 검사가 어떤 증상·상황에서 확인 수단으로 고려되는지 정보형으로 요약\n" +
    "- 정확한 검사 필요 여부·범위는 진료 상담에서 안내된다는 중립 문장으로 마무리\n" +
    "- CTA(예약/방문 유도) 금지, 광고 어휘 금지, 1인칭 금지\n" +
    getAiSmellGuide()
  );
}

// 호환용 풀 프롬프트 (단일호출 fallback)
export function buildRadioFullPrompt(treatment, region, mode) {
  return RADIO_SYSTEM_PROMPT;
}
