// ============================================================
// derma-prompts.js — 피부과 정보형 V2 (완전 독립)
// ⚠️ clinic / dental / ent / oriental / ortho 절대 참조 금지
// [V2 전환] 후기형/회복일지 → 정보형. personal 제거, commercial 단일.
//   한의원·치과·정형외과 정보형 V2 동형. 7섹션:
//   concern / examination / diagnosis / treatment / visitInfo / checkPoint / closing
//   개인 후기·1인칭·시간축(1일/1주/2주/1개월)·비용/횟수 단정·효과 단정 전면 제거.
//   DERMA_DIRECTION(시술 방향 데이터)은 피부과 자산으로 유지 — 문맥 힌트로만 사용.
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

export const DERMA_SYSTEM_PROMPT = `당신은 피부과 시술 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 시술 정보 안내"입니다.
- 1인칭 체험(저는/제가/받아봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(사라졌다/좋아졌다/완치). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·시술 횟수 단정 금지. "개인 상태에 따라 다르며 상담 시 안내" 수준.
- 개인 타임라인(1일/1주/2주/1개월 경과) 금지.
- 병원·원장 평가·추천·CTA 금지. 매장명 본문 노출 금지.
- 의료광고법 준수: 효능·효과 보장 표현 금지.`;

export function buildDermaPrompt(section, treatment, region, mode) {
  const name    = treatment.name;
  const compare = treatment.compareWith || "다른 시술";
  const dir     = getDirection(treatment.id);

  const isNeuro = /보톡스|필러|다한증/.test(name);
  const neuroGuide = isNeuro
    ? `\n[의료광고법 민감 ⚠️] "개선/효과/사라짐/완치" 등 효과 단정 절대 금지. 변화 단정 금지. "개인차가 있으며 상담 시 안내" 수준의 일반 정보로만 서술.`
    : "";

  const isSensitive = /탈모|아토피|건선|중증|PDT/.test(name);
  const sensitiveGuide = isSensitive
    ? `\n[주의] 치료 효과·완치 단정 금지. 개인 피부 상태·경과에 따라 다름을 안내.`
    : "";

  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/받아봤어요/느꼈어요/좋아졌어요/사라졌어요/개선되었어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한"
"1일차/1주일차/2주차/1개월차" 등 개인 타임라인
[V2 정보형 추가 금지 — 주관·광고성 표현]
"체감되는 부분이었다/체감된다"(주관) → "일반적으로 살피는 요소입니다"
"변화가 관찰될 수 있는/변화를 기대할 수 있는"(효과 암시) → "상태에 따라 진료 시 안내됩니다"
"최적의/최선의/맞춤형 접근"(광고성) → "개인 상태에 따른 접근"
"매끄러움을 개선하려는 시도/개선하려는 목적"(효과 단정) → "~에 대해 살피는 진료입니다"
- 이 글은 후기가 아니라 일반 시술 정보 안내다. 객관적·설명형으로 서술.`;

  const _altPhrase = (/치료$/.test(name) && name !== "치료")
    ? `"이 시술/해당 시술/진료"`
    : `"이 시술/해당 시술/진료"`;
  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 ${_altPhrase} 등으로 대체. 3회 이상 금지.`;
  const grammarGuide = `\n[조사 오류 금지] "${name}을/이/를/가" 직접 연결 금지. 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  const G = { name, region, compare, dir, neuroGuide, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide };

  switch (section) {
    case 'concern':     return buildConcernPrompt(G);
    case 'examination': return buildExaminationPrompt(G);
    case 'diagnosis':   return buildDiagnosisPrompt(G);
    case 'treatment':   return buildTreatmentPrompt(G);
    case 'visitInfo':   return buildVisitInfoPrompt(G);
    case 'checkPoint':  return buildCheckPointPrompt(G);
    case 'closing':     return buildClosingPrompt(G);
    default: throw new Error(`[derma-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function buildConcernPrompt({ name, region, dir, neuroGuide, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 1 — 증상·상황] ${region} 지역 독자 대상, ${name} 관련 피부 증상·상황의 일반적 양상을 정보형으로 설명.
- 특정 개인 경험이 아니라 "이런 증상은 일반적으로 ~한 양상을 보입니다" 형식.
- 참고 맥락: ${dir.concern} (단정 아님, 일반 배경으로만).
- 증상이 일상에 미칠 수 있는 영향을 객관적으로 서술(단정 금지).
- 200자 이상.${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 2 — 시술 전 확인사항] ${name} 시술을 고려할 때 확인하면 좋은 사항을 일반 안내.
- 피부 타입, 현재 복용 중인 약, 기존 피부 질환·시술 이력, 광과민 여부 등.
- 항목식으로 정리 가능. 비용·횟수 질문은 다루지 않음.
- 200자 이상.${sensitiveGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildDiagnosisPrompt({ name, region, dir, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 3 — 피부과적 판단 요소] ${name} 관련해 피부과에서 살피는 판단 요소를 정보형으로 설명.
- 피부 타입, 색소 정도, 탄력, 염증 상태, 모공·흉터 상태 등을 "이러한 요소를 살핍니다" 수준으로 안내.
- 참고 방향: ${dir.effect} (효과 단정 아님, 살피는 관점으로만).
- 진단을 단정하지 않음. 개인마다 다를 수 있음을 명시.
- 250자 이상.${sensitiveGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentPrompt({ name, region, compare, sensitiveGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 4 — 시술 방법 안내] ${name}에 활용될 수 있는 피부과 시술 방법을 일반 안내.
- 레이저, 주사, 관리 등 방법별 개요를 객관적으로 설명.
- ${name} vs ${compare} 일반 비교 가능(우열 단정 금지).
- 효과 단정 금지("사라진다/없어진다" 금지). 비용·횟수 단정 금지("보통 3~5회" 금지).
- "개인 상태에 따라 상담 시 안내됩니다" 수준.
- 250자 이상.${sensitiveGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitInfoPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 5 — 진료 안내] ${name} 진료의 일반적 흐름과 상담 시 확인할 사항을 안내.
- 초진 상담 → 피부 상태 확인 → 시술 계획 안내 등 일반 흐름.
- 상담 시 피부 타입·생활습관·복용약 등을 확인한다는 정보.
- 개인 타임라인·회복일지·후기 금지.
- 200자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 6 — 확인 포인트] 피부과 시술 검토 시 확인하면 좋은 항목을 정리.
- 피부과 전문의 여부, 시술 분야가 본인 피부 고민과 맞는지, 보유 장비·시술 종류, 다운타임·주의사항, 개인 피부 타입에 따른 차이.
- 정보 정리 형식(항목식 가능).
- 200자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 마무리.
- 개인 변화·예약 예정·후기·추천 표현 전면 금지.
- "피부 고민이 지속되면 피부과 전문의와 상담을 통해 적절한 시술 계획을 세우는 것이 좋습니다" 수준의 일반 안내.
- ${region} + ${name} 키워드 자연스럽게 1회 이내 포함 가능.
- 150자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

/** 섹션별 이미지 ALT — 정보형 7섹션 */
export function getDermaImageAlts(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const ak      = activeKeyword || name;
  const fullKw  = region + " " + ak;
  return {
    concern:     "[이미지: " + region + " 피부과 " + ak + " 일반 정보 | " + ak + " 시술 안내]",
    examination: "[이미지: " + region + " 피부과 " + ak + " 시술 전 확인사항 | " + fullKw + " 안내]",
    diagnosis:   "[이미지: " + region + " 피부과 " + ak + " 판단 요소 | " + fullKw + " 상담 절차]",
    treatment:   "[이미지: " + fullKw + " 시술 방법 안내 | " + ak + " 종류 정보]",
    visitInfo:   "[이미지: " + region + " 피부과 " + ak + " 진료 안내 | " + fullKw + " 상담 흐름]",
    checkPoint:  "[이미지: " + fullKw + " 확인 포인트 | " + ak + " 시술 검토 항목]",
    closing:     "[이미지: " + fullKw + " 시술 정보 | " + ak + " 안내]",
  };
}
