// ============================================================
// lib/derma-prompts.js — 피부과 프롬프트 빌더 v3 (mode 분기)
// personal: 과정 기록형 (1인칭 금지, 광고 어휘 제거)
// commercial: 3인칭 정보형 (의료광고법 안전)
// ============================================================

// ============================================================
// 시술별 방향 맵 — 고민·효과·키워드를 시술에 맞게 고정
// ============================================================
const DERMA_DIRECTION = {
  // ── 여드름·모공 ──
  acne:           { concern: "여드름과 트러블이 반복되고 모공이 넓어 보여서", effect: "여드름 개수 변화, 염증 가라앉음, 모공 변화", hook: "턱 라인에 다시 트러블이 올라오는 상황", keyword: "여드름 치료" },
  pore:           { concern: "여드름 흉터와 모공이 신경 쓰여서", effect: "흉터 면적 변화, 모공 변화, 피부결 변화", hook: "화장이 들뜨고 흉터가 도드라지는 상황", keyword: "모공·흉터 레이저" },
  bb_glow:        { concern: "블랙헤드가 코 주변을 덮고 각질이 심해서", effect: "블랙헤드 변화, 각질 정리, 피지 조절", hook: "클렌징해도 코 블랙헤드가 그대로인 상황", keyword: "블랙헤드 관리" },
  potenza:        { concern: "기존 레이저로 모공·흉터 변화가 더디어서", effect: "마이크로니들RF 자극, 흉터 변화, 모공 변화", hook: "프락셀로도 흉터가 잘 안 바뀌던 상황", keyword: "포텐자" },
  acne_scar:      { concern: "여드름 흉터가 깊고 다양해서 한 가지 시술로는 해결이 어려워서", effect: "흉터 종류별 맞춤 접근, 단계별 변화 관찰", hook: "여드름은 잡혔는데 흉터가 계속 남는 상황", keyword: "여드름 흉터 치료" },
  pdt:            { concern: "약물 치료를 오래 했는데도 중증 여드름이 계속 재발해서", effect: "광역동 작용, 피지선 억제, 염증 변화", hook: "이소트레티노인 한계 후 다른 접근이 필요한 상황", keyword: "PDT 광역동 치료" },

  // ── 색소·미백 ──
  toning:         { concern: "기미와 잡티가 퍼지면서 피부톤이 칙칙해 보여서", effect: "기미 변화, 피부톤 변화, 잡티 변화", hook: "단체사진에서 얼굴이 어둡게 보이는 상황", keyword: "레이저토닝" },
  pico:           { concern: "오래된 기미와 깊은 잡티가 변화가 더디어서", effect: "기미 분해, 색소 분해, 톤 변화", hook: "레이저토닝으로도 기미 변화가 더딘 상황", keyword: "피코레이저" },
  melasma:        { concern: "광대 주변 기미가 점점 번져서", effect: "기미 범위 변화, 재발 관리, 멜라닌 관리", hook: "자외선 차단을 해도 기미가 짙어지는 상황", keyword: "기미 치료" },
  pigment:        { concern: "얼굴 곳곳의 잡티와 검버섯이 많아져서", effect: "잡티·검버섯 변화, 피부 정돈", hook: "검버섯 때문에 인상이 달라진 상황", keyword: "색소 레이저" },
  ipl:            { concern: "홍조와 모세혈관이 두드러지고 잡티까지 있어서", effect: "홍조 변화, 혈관 변화, 색소 변화", hook: "마스크 벗은 후 홍조가 두드러진 상황", keyword: "IPL 광치료" },

  // ── 안티에이징 ──
  lifting_derma:  { concern: "볼살이 처지고 얼굴 라인이 흐려져서", effect: "얼굴 윤곽 변화, 라인 변화, 탄력 변화", hook: "마스크 쓰다 벗으니 얼굴이 처져 보이는 상황", keyword: "피부 리프팅" },
  ulthera:        { concern: "SMAS 근막이 처지면서 얼굴 윤곽이 무너져서", effect: "근막층 자극, 턱선 변화, 볼 변화", hook: "사진 찍을 때마다 얼굴이 퍼져 보이는 상황", keyword: "울쎄라" },
  thermage:       { concern: "피부 탄력이 떨어지고 잔주름이 늘어나서", effect: "진피 콜라겐 자극, 피부 결 변화, 탄력 변화", hook: "나이보다 피부가 늙어 보인다는 말을 듣는 상황", keyword: "써마지" },
  shurink:        { concern: "볼살과 팔자 라인이 처지면서 인상이 달라져서", effect: "HIFU 자극, 볼 변화, 턱선 변화", hook: "옆모습 사진에서 처진 볼이 눈에 띄는 상황", keyword: "슈링크" },
  silhouette_lift:{ concern: "즉각적인 볼륨 교정과 리프팅이 동시에 필요해서", effect: "즉각 볼륨·리프팅 변화, 흡수사 작용", hook: "결혼식·행사 전에 빠른 변화가 필요한 상황", keyword: "실리프팅" },
  kolsonik:       { concern: "초음파 리프팅을 원하지만 통증이 걱정되어서", effect: "HIFU 멀티뎁스 자극, 통증 수준 낮음", hook: "울쎄라 통증이 부담되어 대안을 찾는 상황", keyword: "콜소닉·울리지오" },
  juvelook:       { concern: "피부 재생과 수분이 동시에 필요해서", effect: "PDRN 작용, 수분 변화, 탄력 변화", hook: "건조하고 칙칙하게 가라앉은 피부 상황", keyword: "쥬베룩·리쥬란" },
  skin_booster:   { concern: "피부가 건조하고 탄력이 부족해 보여서", effect: "수분 변화, 피부 변화, 탄력 변화", hook: "수분크림을 발라도 메마른 느낌이 지속되는 상황", keyword: "스킨부스터" },
  inmode:         { concern: "다운타임 부담이 있어 가벼운 RF 리프팅이 필요해서", effect: "RF 자극, 피부 변화, 다운타임 짧음", hook: "울쎄라 통증·회복 부담을 줄이고 싶은 상황", keyword: "인모드" },

  // ── 레이저 ──
  co2_laser:      { concern: "점과 검버섯이 많아지고 피부가 정돈되지 않아서", effect: "점·검버섯 제거, 피부 정돈", hook: "사진마다 점이 도드라져 보이는 상황", keyword: "CO₂ 레이저" },
  vbeam:          { concern: "홍조와 실핏줄이 두드러지고 얼굴이 빨개 보여서", effect: "혈관 변화, 홍조 변화, 실핏줄 변화", hook: "조금만 온도 변화에도 얼굴이 빨개지는 상황", keyword: "혈관 레이저" },
  laser_hair_removal: { concern: "면도와 왁싱을 반복하는 게 번거로워서", effect: "모발 변화, 피부 자극 감소, 관리 편의", hook: "여름마다 제모에 지쳐 다른 방법을 찾는 상황", keyword: "레이저 제모" },
  mole_removal:   { concern: "얼굴 점이 신경 쓰이고 더 커지는 것 같아서", effect: "점·검버섯 제거, 재발률 낮음", hook: "작은 점인데 사진마다 눈에 걸리는 상황", keyword: "점 빼기·검버섯" },

  // ── 보톡스·필러 ──
  botox_derma:    { concern: "이마 주름과 눈가 주름이 깊어지고 표정이 험해 보여서", effect: "표정 주름 변화, 사각턱 변화, 인상 변화", hook: "웃지 않아도 인상이 험해 보인다는 말을 듣는 상황", keyword: "보톡스" },
  filler_derma:   { concern: "팔자주름이 깊어지고 볼륨이 꺼져서 인상이 달라 보여서", effect: "팔자주름 변화, 볼륨 변화, 꺼진 부위 보정", hook: "팔자주름 때문에 나이 들어 보이는 상황", keyword: "필러" },
  bbtopping:      { concern: "얼굴 살이 부분적으로 처지고 윤곽이 흐려져서", effect: "지방 분해, 윤곽 변화, 부분 변화", hook: "볼 쪽만 살이 처져서 얼굴이 커 보이는 상황", keyword: "뽀띠성형·윤곽주사" },
  prp:            { concern: "피부 재생력이 떨어지고 탄력과 윤기가 부족해서", effect: "자가혈 성장인자 작용, 탄력·윤기 변화", hook: "여러 시술을 해도 변화 체감이 더딘 상황", keyword: "PRP·자가혈 시술" },
  botox_hyperhidrosis: { concern: "겨드랑이 다한증으로 옷·일상이 불편해서", effect: "땀 분비 변화, 일상 불편 감소", hook: "여름마다 다한증이 부담되는 상황", keyword: "다한증 보톡스" },

  // ── 탈모 ──
  hair:           { concern: "모발이 가늘어지고 정수리가 비어 보이기 시작해서", effect: "모낭 영양 공급, 탈모 진행 관리, 발모 자극", hook: "샴푸할 때 빠지는 머리카락 양이 늘어난 상황", keyword: "탈모 치료" },

  // ── 아토피·습진 ──
  atopy_derma:    { concern: "아토피가 재발하고 가려움과 건조함이 심해져서", effect: "염증 변화, 피부 장벽 관리, 가려움 변화", hook: "스테로이드 외 다른 접근을 찾는 상황", keyword: "아토피 피부염" },
  psoriasis:      { concern: "건선이 반복되고 일반 보습으로는 변화가 없어서", effect: "광선치료 작용, 염증 변화, 비늘 변화", hook: "두피·팔꿈치 건선이 계속 재발하는 상황", keyword: "건선 치료" },

  // ── 검진·상담 ──
  skin_checkup:   { concern: "피부 타입을 정확히 모르고 관리 방향이 분명하지 않아서", effect: "피부 타입 파악, 맞춤 관리 방향 설정", hook: "여러 화장품을 써도 변화가 더딘 상황", keyword: "피부 검진·상담" },
};

/** 시술 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return DERMA_DIRECTION[treatmentId] || {
    concern: "피부 고민이 깊어져서",
    effect:  "피부 상태 변화",
    hook:    "거울을 보다가 변화가 필요하다고 느끼는 상황",
    keyword: "피부과 시술",
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
    "❌ \"미소를 되찾았어요\" / \"새로운 삶\" / \"삶의 질이 크게\"\n" +
    "❌ \"특히\", \"또한\", \"무엇보다\" 연속 나열\n" +
    "❌ \"어느 날 갑자기\" / \"문득 느꼈습니다\" / \"새삼 깨달았다\"\n" +
    "❌ \"~할 수밖에 없었습니다\" / \"~지 않을 수 없었습니다\"\n"
  );
}

function getKwDensityGuide(activeKeyword) {
  return (
    "[키워드 밀도]\n" +
    "- 핵심 시술명(" + activeKeyword + ") 이 글에 5회 이상 자연스럽게 분산\n" +
    "- 같은 단어 두 번 이어 쓰지 말 것 (예: \"여드름 여드름 치료\" 금지)\n" +
    "- 키워드 억지 반복 금지 — 문맥에 맞게 분산\n"
  );
}

function getCommercialFlowGuide(sectionKey) {
  const flowMap = {
    concern:  "해당 시술을 찾는 일반적인 배경·증상을 사실 기술로 정리",
    search:   "관련 정보를 찾는 일반적 경로(검색·블로그·지인 문의)를 객관적으로 안내",
    consult:  "상담에서 일반적으로 다뤄지는 항목(횟수·간격·통증·비용)을 정보형으로 정리",
    decision: "선택 시 일반적으로 고려하는 요소(다운타임·회복기간·예산·기대 변화)를 정리",
    reason:   "비교 대상 대비 해당 시술이 일반적으로 선택되는 이유를 사실 기술",
    result:   "시간 흐름(1일/1주/2주/1개월) 별 일반적 경과를 관찰형으로 정리",
    closing:  "정보 종합 정리 + 상담 권유는 평이한 안내 수준으로",
  };
  return flowMap[sectionKey] || "객관적 정보 기술";
}

/** 섹션별 이미지 ALT 텍스트 생성 — mode 분기 */
export function getDermaImageAlts(treatment, region, activeKeyword, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  const name      = treatment.name;
  const dir       = getDirection(treatment.id);
  const ak        = activeKeyword || name;
  const akClean   = ak.replace(/\s/g, "");
  const fullKw    = region + " " + ak;

  if (validMode === "commercial") {
    return {
      concern:  "[이미지: " + region + " 피부과 " + ak + " 일반 정보 | " + ak + " 진료 안내]",
      search:   "[이미지: " + region + " 피부과 " + ak + " 정보 검색 | " + fullKw + " 안내 화면]",
      consult:  "[이미지: " + region + " 피부과 " + ak + " 상담 안내 | " + fullKw + " 상담 절차]",
      result1:  "[이미지: " + ak + " 1주 경과 안내 | " + dir.effect.split(",")[0].trim() + " 일반 경과]",
      result2:  "[이미지: " + fullKw + " 2주 경과 | " + (dir.effect.split(",")[1] || dir.effect.split(",")[0]).trim() + " 일반 경과]",
      result3:  "[이미지: " + fullKw + " 1개월 경과 안내 | " + region + " 피부과 " + akClean + " 일반 경과]",
      closing:  "[이미지: " + fullKw + " 진료 정보 | " + ak + " 안내]",
    };
  }

  // personal — 톤 다운 (광고 어휘 제거, 관찰형 표현)
  return {
    concern:  "[이미지: " + fullKw + " 진행 사례 | " + ak + " 시작 전 상태 기록]",
    search:   "[이미지: " + region + " 피부과 " + ak + " 정보 비교 | " + fullKw + " 비교 화면]",
    consult:  "[이미지: " + region + " 피부과 " + ak + " 상담 과정 | " + fullKw + " 상담 장면]",
    result1:  "[이미지: " + ak + " 1주 경과 | " + dir.effect.split(",")[0].trim() + " 초기 경과]",
    result2:  "[이미지: " + fullKw + " 2주 경과 | " + (dir.effect.split(",")[1] || dir.effect.split(",")[0]).trim() + " 중간 경과]",
    result3:  "[이미지: " + fullKw + " 1개월 경과 | " + region + " 피부과 " + akClean + " 최종 경과]",
    closing:  "[이미지: " + fullKw + " 진행 종합 | 시술 후 변화 기록]",
  };
}

// ============================================================
// 시스템 프롬프트는 generateDerma.js 에서 mode별로 직접 생성
// (DERMA_SYSTEM_PROMPT export 유지 — 호환성)
// ============================================================
export const DERMA_SYSTEM_PROMPT =
  "당신은 피부과 시술 진행 사례를 \"과정 기록\" 톤으로 작성하는 전문 작성자입니다.\n" +
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
  "- 효과 단정 금지: \"확실히/완벽히/100%/사라짐/완치\" → \"변화가 관찰됨/체감 변화가 있음\"\n" +
  "- 가격 직접 언급 금지: \"비용은 상담 시 안내됨\"으로 표기\n" +
  "- 전체 글자수 최소 2000자 이상\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "[글 구조 — 순서 절대 유지]\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "## 고민 (최소 220자)\n" +
  "## 탐색 (최소 200자)\n" +
  "## 상담 (최소 250자)\n" +
  "## 결정 (최소 200자)\n" +
  "## 시술 후 변화 (최소 280자) — ### 1일 / ### 1주 / ### 2주 / ### 1개월\n" +
  "## 마무리 (최소 180자)\n" +
  "━━━━━━━━━━━━━━━━━━━━━━━\n" +
  "이 조건을 모두 만족하는 피부과 진행 사례 기록을 작성하세요.";

// ============================================================
// 빌더 진입점 — mode 분기
// ============================================================
export function buildDermaPrompt(section, treatment, region, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  if (validMode === "commercial") {
    return buildCommercialDermaPrompt(section, treatment, region);
  }
  return buildPersonalDermaPrompt(section, treatment, region);
}

// ============================================================
// PERSONAL 빌더 — 과정 기록형 (1인칭 금지, 광고 어휘 제거)
// ============================================================
function buildPersonalDermaPrompt(section, treatment, region) {
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
    "시술명: " + name + " | 지역: " + region + "\n" +
    "🔒 이 시술의 고민 방향: " + dir.concern + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지 (\"저는/제가\" 등 사용 금지)\n" +
    "- 어미: ~됨 / ~된다 / ~확인됨 / ~나타남\n" +
    "- 광고 어휘 금지 (\"솔직/추천/꼭/만족/다행\")\n\n" +
    "[작성 방향]\n" +
    "- 사례에서 관찰된 증상을 사실 기술로 정리\n" +
    "- \"" + dir.hook + "\"과 같은 일반적 상황을 객관적으로 묘사\n" +
    "- 거울·사진 등 일상 맥락에서 증상이 인식되는 경위 1~2개 포함\n" +
    "- 감정 단어 사용 시 강도 낮게 (\"신경이 쓰임\", \"불편이 있었음\" 정도)\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션의 마지막 문장은 다음 중 하나의 패턴으로 정확히 끝낼 것:\n" +
    "  ① \"증상이 반복되다 보니 일상 유지 자체가 부담스럽게 느껴지는 상태였음.\"\n" +
    "  ② \"같은 패턴이 이어지면서 평소 생활 흐름에 부담이 쌓이는 상태였음.\"\n" +
    "  ③ \"증상이 반복되면서 피부 상태에 대한 스트레스가 점점 커지는 상황이었음.\"\n" +
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
    "시술명: " + name + " | 지역: " + region + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~됨 / ~검토됨 / ~확인됨\n\n" +
    "[작성 방향]\n" +
    "- \"" + region + " " + dir.keyword + "\" 키워드 검색 과정을 객관적으로 기술\n" +
    "- 네이버·블로그 정보 비교 과정\n" +
    "- 병원 2~3곳 정보 검토\n" +
    "- \"" + region + " 피부과\" 표현 3회 이상 자연스럽게 포함\n" +
    "- \"꼭/반드시/추천받아\" 같은 강조 어휘 금지\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "이 섹션에는 반드시 \"3축 비교 문장\" 1개를 포함할 것:\n" +
    "  ① \"특히 시술 횟수, 통증 수준, 회복 기간을 기준으로 비교 검토가 진행됨.\"\n" +
    "  ② \"비교 시 시술 횟수·통증 정도·다운타임 3가지가 핵심 판단 기준으로 작용함.\"\n" +
    "  ③ \"각 진료처의 시술 횟수, 통증 정도, 회복 기간이 비교 기준으로 검토됨.\"\n" +
    "  → 위 3개 중 1개 또는 그 변형으로 탐색 중반에 반드시 포함.\n\n" +
    "그리고 이 섹션의 마지막 문장은 \"왜 그 곳을 선택했는지\" 구체적 트리거 1개를 명시할 것:\n" +
    "  ① \"여러 곳 상담을 받아본 결과, 시술 유형별로 치료 방법을 구분해서 설명한 점이 선택에 영향을 줌.\"\n" +
    "  ② \"여러 진료처 비교 결과, 단계별 변화 시점을 구체적으로 안내한 점이 선택 기준으로 작용함.\"\n" +
    "  ③ \"비교 진료처 대비 케이스 사진을 직접 보여주며 진행 흐름을 설명한 점이 영향을 줌.\"\n" +
    "  ④ \"여러 곳 검토 결과, 상담 시 다운타임·관리법을 단계별로 안내한 점이 결정 요인으로 작용함.\"\n" +
    "  → 위 4개 중 1개 또는 그 변형으로 마지막 줄 작성. 절대 다른 톤으로 끝내지 말 것.\n" +
    "  → \"종합적으로 검토함\" / \"다양한 정보를 얻을 수 있음\" 같은 일반론 금지.\n" +
    "  → \"개별 상담이 중요\" 같은 결론도 금지.\n"
  );
}

function _personalConsult(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 시술";
  const dir     = getDirection(treatment.id);
  return (
    "[섹션: 상담 | 최소 250자]\n" +
    "시술명: " + name + " | 비교 시술: " + compare + " | 지역: " + region + "\n" +
    "🔒 이 시술 효과 방향: " + dir.effect + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~안내됨 / ~확인됨 / ~검토됨\n" +
    "- 의사 발언 인용 시 단정형 금지 (\"확실히/완벽히/100%\" 사용 안 됨)\n\n" +
    "[필수 포함]\n" +
    "✔ 시술 횟수 (예: 3~5회)\n" +
    "✔ 시술 간격 (예: 2~4주 간격)\n" +
    "✔ 통증 수준 (10점 기준 수치)\n" +
    "✔ 비용은 \"상담 시 안내됨\"으로 표기 (직접 가격 금지)\n" +
    "✔ " + name + " vs " + compare + " 비교 — 사실 기술 형식\n" +
    "- 의사 안내 1회 이상 인용 (단정형 금지, \"~할 수 있다고 안내됨\" 형식)\n" +
    getAiSmellGuide()
  );
}

function _personalReason(treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 시술";
  const dir     = getDirection(treatment.id);
  return (
    "[섹션: 결정 | 최소 200자]\n" +
    "시술명: " + name + " | 비교 시술: " + compare + "\n" +
    "🔒 이 시술 효과 방향: " + dir.effect + "\n\n" +
    "[톤 — 과정 기록형]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~로 결정됨 / ~확인됨 / ~검토됨\n" +
    "- \"결심/만족/후회 없음/다행\" 같은 어휘 금지\n\n" +
    "[작성 방향]\n" +
    "- 다운타임·회복기간·예산·기대 변화 중 본 케이스의 우선순위 1~2개\n" +
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
    "[섹션: 시술 후 변화 | 최소 280자]\n" +
    "시술명: " + name + "\n" +
    "🔒 변화 방향: " + dir.effect + "\n" +
    "🔒 절대 금지: 위 방향과 다른 효과 서술 (예: 필러인데 기미 언급 금지)\n\n" +
    "[톤 — 관찰형 기록]\n" +
    "- 1인칭 절대 금지\n" +
    "- 어미: ~됨 / ~확인됨 / ~나타남 / ~관찰됨\n" +
    "- 효과 단정 금지: \"사라짐/완전히 없어짐/100%\" → \"변화가 관찰됨/체감 변화가 있었음\"\n\n" +
    "[필수 구조 — ### 헤더 포함]\n" +
    "### 1일\n" +
    "- 시술 직후 일반 반응 (붓기·홍조·따가움 등) 객관 기술\n" +
    "- ★ 큰 변화는 아직 없음을 명시\n" +
    "### 1주\n" +
    "- 초기 변화 (" + dir.effect.split(",")[0] + " 시작 — 관찰형)\n" +
    "### 2주\n" +
    "- 중간 변화 (" + (dir.effect.split(",")[1] || dir.effect.split(",")[0]) + " — 관찰형)\n" +
    "### 1개월\n" +
    "- 최종 변화 (전체 체감 변화 — 단정 금지)\n" +
    "- 불편 사항도 사실 기술로 포함\n\n" +
    getAiSmellGuide() +
    "\n[🚨🚨🚨 가장 중요한 지시 — 반드시 지킬 것]\n" +
    "### 1일 섹션은 다음 패턴으로 시작할 것:\n" +
    "  · \"치료 직후에는 큰 변화가 관찰되지 않음. [붓기·홍조·따가움 등 일반 반응 1개]만 나타남.\"\n" +
    "  · 또는 \"직후에는 별다른 변화는 나타나지 않음. [일반 반응 1개]가 잠시 관찰됨.\"\n" +
    "  → 절대 금지: \"1일차에 변화 관찰\" / \"즉각적 효과\" / \"바로 좋아짐\"\n\n" +
    "### 1주 섹션은 다음 패턴 중 1개로 작성:\n" +
    "  · \"즉각적인 큰 변화보다는, [핵심 효과 1개]가 먼저 체감된 상태였음.\"\n" +
    "  · \"일주일 정도 지나면서 [상태] 양상이 조금씩 달라지는 흐름이 나타남.\"\n" +
    "  · \"큰 변화보다는 [핵심 효과]가 우선 체감되는 단계로 정리됨.\"\n" +
    "  → 절대 금지: \"1주차에 효과 확인\" / \"빠르게 변화\" / \"눈에 띄게 개선\"\n"
  );
}

function _personalClosing(treatment, region) {
  const name = treatment.name;
  const dir  = getDirection(treatment.id);
  return (
    "[섹션: 마무리 | 최소 180자]\n" +
    "시술명: " + name + " | 지역: " + region + "\n" +
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
    "  ① \"결과적으로 단기간 효과보다는, 지속적인 관리가 피부 상태 변화에 더 중요한 요소로 작용함을 확인하게 됨.\"\n" +
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
function buildCommercialDermaPrompt(section, treatment, region) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 시술";
  const dir     = getDirection(treatment.id);
  const flowGuide = getCommercialFlowGuide(section);

  const base =
    "[섹션 정보 — 3인칭 정보형 글]\n" +
    "시술명: " + name + " | 지역: " + region + " | 비교 시술: " + compare + "\n" +
    "🔒 이 시술 방향: " + dir.concern + "\n" +
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
        "- 해당 시술이 일반적으로 고려되는 배경·증상을 객관 정리\n" +
        "- 일상 맥락에서 증상이 인식되는 사례를 일반 기술 형식으로\n" +
        "- 강한 감정·과장 표현 금지\n" +
        getAiSmellGuide();

    case "search":
      return base +
        "[섹션: 정보 탐색 안내 | 최소 200자]\n" +
        "- \"" + region + " " + dir.keyword + "\" 관련 정보를 찾는 일반적 경로 안내\n" +
        "- 네이버·블로그 정보 비교 절차\n" +
        "- \"" + region + " 피부과\" 표현 3회 이상 자연스럽게 포함\n" +
        getAiSmellGuide();

    case "consult":
      return base +
        "[섹션: 상담 안내 | 최소 250자]\n" +
        "✔ 시술 횟수 (예: 3~5회)\n" +
        "✔ 시술 간격 (예: 2~4주)\n" +
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
        "- 다운타임·회복기간·예산·기대 변화 일반 안내\n" +
        getAiSmellGuide();

    case "result":
      return base +
        "[섹션: 시간 흐름별 일반 경과 | 최소 280자]\n" +
        "🔒 변화 방향: " + dir.effect + "\n" +
        "🔒 절대 금지: 효과 단정 (\"사라짐/완전 회복/100%\")\n\n" +
        "[필수 구조 — ### 헤더 포함]\n" +
        "### 1일\n" +
        "- 일반적 직후 반응 (붓기·홍조 등) 객관 안내\n" +
        "### 1주\n" +
        "- 초기 변화 일반 안내 (" + dir.effect.split(",")[0] + ")\n" +
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
export function buildDermaFullPrompt(treatment, region, mode) {
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 시술";
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
    "시술명: " + name + " | 비교시술: " + compare + " | 지역: " + region + "\n\n" +
    "🔒 고민 방향: " + dir.concern + "\n" +
    "🔒 효과 방향: " + dir.effect + "\n\n" +
    "[필수 수치]\n" +
    "- 시술 횟수 / 간격 / 통증(10점 기준) / 비용은 상담 시 안내\n" +
    "- 변화: 1일·1주·2주·1개월\n\n" +
    "[비교 필수]\n" +
    name + " vs " + compare + " + 2개 추가 시술 비교\n\n" +
    "위 조건으로 완성된 글을 작성하세요."
  );
}
