// ============================================================
// clinic-v2-prompts.js — 성형외과 정보형 V2 (완전 독립)
// ⚠️ derma / dental / ent / oriental / ortho 절대 참조 금지
// [V2 전환] 후기형/회복일지 → 정보형. personal 제거, commercial(정보형) 단일.
//   피부과·치과·정형외과 정보형 V2 동형. 7섹션:
//   concern / examination / diagnosis / treatment / visitInfo / checkPoint / closing
//   개인 후기·1인칭·시간축(1일/1주/2주/1개월)·비용/횟수 단정·효과 단정 전면 제거.
//   CLINIC_DIRECTION(시술 방향 데이터)은 성형외과 자산 — 문맥 힌트로만 사용.
// [화이트리스트] 성형 시술만(피부과 pico/toning 배제). clinic-v2-playConfig CLINIC_V2_ALLOWED와 정합.
// ============================================================

const CLINIC_DIRECTION = {
  // ── 눈성형 ──
  natural_double:  { concern: "쌍꺼풀 라인이 또렷하지 않아 인상이 흐릿해 보여서", effect: "라인 형성 방식, 자연스러움 정도, 지속성 관점", hook: "사진에서 눈매가 또렷하지 않아 보이는 상황", keyword: "자연유착 쌍꺼풀", compare: "매몰법" },
  eye_fat:         { concern: "눈밑 지방과 다크서클로 피곤한 인상이 굳어져서", effect: "눈밑 볼륨 재배치, 그늘 변화, 인상 변화 관점", hook: "충분히 자도 피곤해 보인다는 말을 듣는 상황", keyword: "눈밑지방재배치", compare: "필러" },
  epicanthoplasty: { concern: "눈 앞뒤 여백으로 눈이 답답하거나 짧아 보여서", effect: "가로 폭 변화, 몽고주름 관점, 눈매 인상 관점", hook: "눈 사이가 멀거나 눈이 짧아 보이는 상황", keyword: "앞트임·뒤트임", compare: "쌍꺼풀 수술" },
  ptosis:          { concern: "눈꺼풀 처짐으로 졸려 보이고 눈이 작아 보여서", effect: "눈뜨는 힘 관점, 눈매 인상 관점, 좌우 균형 관점", hook: "눈이 반쯤 감긴 듯 졸려 보이는 상황", keyword: "눈매교정", compare: "쌍꺼풀 수술" },

  // ── 코성형 ──
  rhinoplasty:     { concern: "코 라인이 낮거나 휘어 옆모습이 신경 쓰여서", effect: "콧대·코끝 구조 관점, 옆선 관점, 균형 관점", hook: "옆모습 사진에서 코 라인이 신경 쓰이는 상황", keyword: "코성형", compare: "필러 콧대" },

  // ── 리프팅 ──
  sili_lifting:    { concern: "볼살과 라인이 처지면서 얼굴 윤곽이 흐려져서", effect: "리프팅 방향 관점, 라인 변화 관점, 지속성 관점", hook: "옆모습에서 처진 볼이 눈에 띄는 상황", keyword: "실리프팅", compare: "울쎄라" },
  ulthera:         { concern: "SMAS 근막이 처지면서 얼굴 윤곽이 무너져서", effect: "근막층 자극 관점, 턱선 관점, 볼 관점", hook: "사진 찍을 때마다 얼굴이 퍼져 보이는 상황", keyword: "울쎄라", compare: "실리프팅" },
  rf_lifting:      { concern: "탄력 저하와 잔주름으로 피부가 늘어져 보여서", effect: "RF 자극 관점, 피부 결 관점, 탄력 관점", hook: "나이보다 피부가 처져 보인다는 말을 듣는 상황", keyword: "인모드·써마지", compare: "울쎄라" },

  // ── 보톡스·필러 ──
  botox:           { concern: "사각턱·표정 주름으로 인상이 강하거나 나이 들어 보여서", effect: "근육·표정 관점, 라인 관점, 인상 관점", hook: "웃지 않아도 인상이 험해 보인다는 상황", keyword: "보톡스", compare: "필러" },
  filler:          { concern: "팔자주름과 꺼진 볼륨으로 인상이 달라 보여서", effect: "볼륨 보정 관점, 팔자 라인 관점, 비대칭 관점", hook: "팔자주름 때문에 나이 들어 보이는 상황", keyword: "필러", compare: "보톡스" },

  // ── 윤곽 ──
  facial_contour:  { concern: "사각턱·광대로 얼굴이 커 보이고 각져 보여서", effect: "골격 구조 관점, 라인 관점, 균형 관점", hook: "정면 사진에서 얼굴이 각져 보이는 상황", keyword: "안면윤곽", compare: "윤곽주사" },
  forehead:        { concern: "이마가 편평하거나 굴곡이 있어 인상이 밋밋해 보여서", effect: "이마 곡선 관점, 옆선 관점, 인상 관점", hook: "옆모습에서 이마 라인이 신경 쓰이는 상황", keyword: "이마성형", compare: "필러 이마" },

  // ── 지방·체형 ──
  liposuction:     { concern: "부분 지방이 운동·식이로 잘 빠지지 않아서", effect: "부위별 지방 관점, 체형 라인 관점, 피부 탄력 관점", hook: "특정 부위 살이 유독 안 빠지는 상황", keyword: "지방흡입", compare: "지방분해주사" },
  fat_graft:       { concern: "볼·이마 등 꺼진 부위로 얼굴이 야위어 보여서", effect: "자가지방 보충 관점, 생착 관점, 볼륨 관점", hook: "볼이 꺼져 나이 들거나 아파 보이는 상황", keyword: "지방이식", compare: "필러" },

  // ── 모발 ──
  hair_transplant: { concern: "헤어라인이 넓어지고 정수리가 비어 보여서", effect: "모낭 이식 관점, 라인 디자인 관점, 밀도 관점", hook: "이마가 넓어지고 머리숱이 준 것 같은 상황", keyword: "모발이식", compare: "탈모 치료" },
};

/** 시술 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return CLINIC_DIRECTION[treatmentId] || {
    concern: "외형 고민이 깊어져서",
    effect:  "부위 상태·구조 관점",
    hook:    "거울을 보다가 변화가 필요하다고 느끼는 상황",
    keyword: "성형외과 시술",
    compare: "다른 시술",
  };
}

export const CLINIC_SYSTEM_PROMPT_V2 = `당신은 성형외과 시술 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 시술 정보 안내"입니다.
- 1인칭 체험(저는/제가/받아봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(또렷해졌다/자연스러워졌다/완치). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·회복 기간·수술 횟수 단정 금지. "개인 상태에 따라 다르며 상담 시 안내" 수준.
- 개인 타임라인(1일/1주/2주/1개월 경과·회복일지) 금지.
- 병원·원장 평가·추천·CTA 금지. 매장명(지점명) 본문 노출 금지.
- 원장·의사 발화 인용("~라고 하셨어요") 금지.
- 의료광고법 준수: 효능·효과 보장 표현 금지.`;

export function buildClinicPromptV2(section, treatment, region, mode) {
  const name    = treatment.name;
  const dir     = getDirection(treatment.id);
  const compare = dir.compare || treatment.compareWith || "다른 시술";

  const isNeuro = /보톡스|필러/.test(name);
  const neuroGuide = isNeuro
    ? `\n[의료광고법 민감 ⚠️] "개선/효과/사라짐/완치" 등 효과 단정 절대 금지. 변화 단정 금지. "개인차가 있으며 상담 시 안내" 수준의 일반 정보로만 서술.`
    : "";

  const isSurgery = /수술|절개|이식|윤곽|흡입|코성형|쌍꺼풀|눈매|앞트임|뒤트임/.test(name);
  const surgeryGuide = isSurgery
    ? `\n[수술 주의] 마취·회복·부작용 가능성은 일반 정보로만 안내. 안전·성공 단정 금지. 개인 상태·경과에 따라 다름을 명시.`
    : "";

  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/받아봤어요/느꼈어요/좋아졌어요/또렷해졌어요/자연스러워졌어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한/경험 많은"
"원장님이 ~라고 하셨/설명해 주셨"(발화 인용) 금지
"1일차/1주일차/2주차/1개월차/시술 후 첫날/다음날 아침" 등 개인 타임라인
[V2 정보형 추가 금지 — 주관·광고성 표현]
"체감되는 부분이었다/체감된다"(주관) → "일반적으로 살피는 요소입니다"
"변화가 관찰될 수 있는/변화를 기대할 수 있는"(효과 암시) → "상태에 따라 진료 시 안내됩니다"
"최적의/최선의/맞춤형 접근"(광고성) → "개인 상태에 따른 접근"
"자연스러움을 만들어준다/또렷하게 해준다"(효과 단정) → "~에 대해 살피는 진료입니다"
- 이 글은 후기가 아니라 일반 시술 정보 안내다. 객관적·설명형으로 서술.`;

  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 "이 시술/해당 시술/진료" 등으로 대체. 3회 이상 금지.`;
  const grammarGuide = `\n[조사 오류 금지] "${name}을/이/를/가" 직접 연결 금지. 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  const G = { name, region, compare, dir, neuroGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide };

  switch (section) {
    case 'concern':     return buildConcernPrompt(G);
    case 'examination': return buildExaminationPrompt(G);
    case 'diagnosis':   return buildDiagnosisPrompt(G);
    case 'treatment':   return buildTreatmentPrompt(G);
    case 'visitInfo':   return buildVisitInfoPrompt(G);
    case 'checkPoint':  return buildCheckPointPrompt(G);
    case 'closing':     return buildClosingPrompt(G);
    default: throw new Error(`[clinic-v2-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function buildConcernPrompt({ name, region, dir, neuroGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 1 — 증상·상황] ⚠ 소제목(##) 출력 금지. 본문부터 바로 시작. [세션40][NOHDR-01] ${region} 지역 독자 대상, ${name} 정보를 찾는 사람이 어떤 상황에서 검색하는지를 정보형으로 설명.
- 시작은 "검색 의도" 중심: 어떤 신체적 양상·불편·기능적 상황 때문에 이 정보를 찾게 되는가를 먼저 제시.
- "이런 고민은 일반적으로 ~한 양상을 보입니다" 형식. 특정 개인 경험 아님.
- 참고 맥락: ${dir.concern} (단정 아님, 일반 배경으로만).
- 추상적 감정 서술("자신감/인상/이미지" 위주 나열)은 최소화. 관찰 가능한 신체적·기능적 양상 위주로.
- 광고성·효과 암시 없이, 정보를 찾는 상황 자체를 객관적으로 서술.
- 200자 이상.${neuroGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 2 — 시술 전 확인사항] ${name} 시술을 고려할 때 확인하면 좋은 사항을 일반 안내.
- 전신 건강 상태, 현재 복용 중인 약, 기존 수술·시술 이력, 마취 관련 확인 등.
- 항목식으로 정리 가능. 비용·회복 기간 질문은 다루지 않음.
- 200자 이상.${surgeryGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildDiagnosisPrompt({ name, region, dir, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 3 — 성형외과적 판단 요소] ${name} 관련해 성형외과에서 살피는 판단 요소를 정보형으로 설명.
- 얼굴·부위별 구조, 비대칭 여부, 피부·조직 상태, 골격, 기존 시술 이력 등을 "이러한 요소를 살핍니다" 수준으로 안내.
- 참고 방향: ${dir.effect} (효과 단정 아님, 살피는 관점으로만).
- 진단을 단정하지 않음. 개인마다 다를 수 있음을 명시.
- 250자 이상.${surgeryGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentPrompt({ name, region, compare, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, neuroGuide }) {
  return `[섹션 4 — 시술 방법 안내] ${name}에 활용될 수 있는 성형외과 시술 방법을 일반 안내.
- 절개·비절개·주사·이식 등 방법별 개요를 객관적으로 설명.
- ${name} vs ${compare} 일반 비교 가능(우열 단정 금지).
- 효과 단정 금지("자연스러워진다/또렷해진다" 금지). 비용·회복 기간 단정 금지("보통 일주일" 금지).
- "개인 상태에 따라 상담 시 안내됩니다" 수준.
- 250자 이상.${surgeryGuide}${neuroGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitInfoPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 5 — 진료 안내] ${name} 진료의 일반적 흐름과 상담 시 확인할 사항을 안내.
- 초진 상담 → 상태 확인 → 시술 계획 안내 등 일반 흐름.
- 상담 시 건강 상태·복용약·기존 시술 이력 등을 확인한다는 정보.
- 개인 타임라인·회복일지·후기·원장 발화 인용 금지.
- 200자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 6 — 확인 포인트] 성형외과 시술 검토 시 확인하면 좋은 항목을 정리.
- 성형외과 전문의 여부, 시술 분야가 본인 고민과 맞는지, 수술 방법·마취 방식, 회복·주의사항, 개인 상태에 따른 차이.
- 정보 정리 형식(항목식 가능).
- 200자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 마무리.
- 개인 변화·예약 예정·후기·추천 표현 전면 금지.
- "외형 고민이 지속되면 성형외과 전문의와 상담을 통해 적절한 시술 계획을 세우는 것이 좋습니다" 수준의 일반 안내.
- ${region} + ${name} 키워드 자연스럽게 1회 이내 포함 가능.
- 150자 이상.${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

/** 섹션별 이미지 ALT — 정보형 7섹션 */
export function getClinicImageAltsV2(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const ak      = activeKeyword || name;
  const fullKw  = region + " " + ak;
  return {
    concern:     "[이미지: " + region + " 성형외과 " + ak + " 일반 정보 | " + ak + " 시술 안내]",
    examination: "[이미지: " + region + " 성형외과 " + ak + " 시술 전 확인사항 | " + fullKw + " 안내]",
    diagnosis:   "[이미지: " + region + " 성형외과 " + ak + " 판단 요소 | " + fullKw + " 상담 절차]",
    treatment:   "[이미지: " + fullKw + " 시술 방법 안내 | " + ak + " 종류 정보]",
    visitInfo:   "[이미지: " + region + " 성형외과 " + ak + " 진료 안내 | " + fullKw + " 상담 흐름]",
    checkPoint:  "[이미지: " + fullKw + " 확인 포인트 | " + ak + " 시술 검토 항목]",
    closing:     "[이미지: " + fullKw + " 시술 정보 | " + ak + " 안내]",
  };
}

export { CLINIC_DIRECTION };
