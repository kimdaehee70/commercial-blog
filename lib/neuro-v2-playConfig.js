// ============================================================
// neuro-v2-playConfig.js — 신경외과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / ortho / pain 절대 참조 금지
// [V2 Purpose 재설계 · 2026-07-12] 구 정보형(concern/examination/diagnosis/treatment/visitInfo/checkPoint/closing)
//   → Purpose 7섹션. 검사·치료 나열을 '사용자 의사결정을 돕는 흐름'으로 종속.
//   기준 엔진: ortho-v2(정식 승격본) One Axis 이식. 신경외과 데이터만 치환.
//   Purpose 7섹션: concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//   개인 체험·회복일지·타임라인·비용/CTA 삭제(정보형 원칙 유지).
//
// [Pilot] neuro v1(후기형) 무손상 A/B 보존. 이 파일은 v2 전용.
//   engineBootstrap neuro 래퍼가 mode==='purpose'일 때만 v2 위임.
//
// [화이트리스트 없음] neuro-data 전 시술(24종) 사용 — 전부 신경외과 자산.
//   타과 침투는 blockKeywords로만 차단.
// ============================================================

export const NEURO_FLOW_ENGINE_V2 = {
  industry: 'neuro',
  version: 'v2',

  sections: [
    { key: 'concern',           label: '지금 이런 상황인가요?',              order: 1, description: '검색 계기가 된 저림·통증·어지럼 등 신경학적 상황에 공감. 텍스트는 짧게(공감 증상 사진이 관심 유도 역할). 개인 후기 아님·질환명 최대 2회·조사 오류 금지', required: true, minLength: 120, maxLength: 180 },
    { key: 'visitTrigger',      label: '이럴 때 진료를 고려해볼 수 있습니다', order: 2, description: '어떤 신호·상황일 때 신경외과 진료를 고려하면 좋은지 방문 판단 기준을 안내. 겁주기·단정 금지, 판단을 돕는 정보', required: true, minLength: 180, maxLength: 250 },
    { key: 'examination',       label: '진료에서는 무엇을 확인하나요?',       order: 3, description: '검사·진단은 목적이 아니라 원인을 확인하는 수단. 무엇을 살피기 위한 과정인지 판단 기준 먼저 → 검사(MRI·CT·신경전도 등)는 1줄로 종속. 검사 종류 최대 2개. 확정 진단 아님', required: true, minLength: 200, maxLength: 300 },
    { key: 'treatmentDecision', label: '치료는 어떤 기준으로 결정되나요?',    order: 4, description: '치료 나열이 아니라 치료가 어떤 기준으로 선택되는지 의사결정 흐름(핵심 축). 판단 기준 먼저 → 비수술 우선 검토 / 신경학적 악화 신호 시 수술 함께 판단, 2~3문장 골격. 치료 작동 방식 설명·나열 금지. 효과·비용·회복기간 단정 금지', required: true, minLength: 180, maxLength: 260 },
    { key: 'checkPoint',        label: '병원 선택 시 확인할 점',            order: 5, description: '사용자가 병원을 판단할 때 확인하면 좋은 기준(신경외과 전문의·진료 분야 적합성·검사 장비·비수술/수술 방법·주의사항) 정리', required: true, minLength: 200, maxLength: 300 },
    { key: 'sceneVisit',        label: '진료실과 검사실에서 확인하는 과정',   order: 6, description: '진료실·검사실 실제 장면 묘사와 방문 안내를 함께 — 사진과 함께 신뢰 형성. 불안완화형("처음 방문하면 이런 순서로 진행됩니다"). 개인 타임라인·회복일지 아님', required: true, minLength: 150, maxLength: 250 },
    { key: 'closing',           label: '마무리',                         order: 7, description: '일반 안내 수준의 마무리. 개인 변화·예약 예정·후기·추천·비용 표현 금지', required: true, minLength: 100, maxLength: 150 },
  ],

  blockKeywords: [
    // 통증의학과·정형외과·한의원 침투 방지 (neuro v1 blockKeywords 계승)
    '도수치료', '프롤로', 'PRP', '추나요법', '추나', '한약', '침치료', '뜸', '부항',
    '체질', '경혈', '어혈', '기혈',
    // 정형외과 침투 방지 (경계 질환 — 신경외과 관점 유지)
    '반월상연골', '전방십자인대', '회전근개', '오십견', '무지외반증', '족저근막염', '연골주사',
    // 성형외과 침투 방지 (clinic 소관)
    '쌍꺼풀', '코성형', '리프팅', '지방흡입', '안면윤곽', '모발이식', '울쎄라', '써마지',
    // 피부과 침투 방지
    '여드름', '기미', '색소', '모공', '피코레이저', '레이저토닝', '보톡스', '필러',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '치아교정',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생', '소아과',
    // AI 정보글 포화 패턴 (정보형 오염 차단 — ortho-v2 동형)
    '기준으로 살펴본', '관리 방법과 생활 속', '일상 속 적용 가이드',
    '체계적인 접근과', '알아두면 좋은 관리법', '케어 방법과 예방 전략',
    '예방 체크리스트', '통증 발생 원인부터', '증상 개선이 필요하다면',
  ],

  requiredKeywords: [
    '신경외과', '검사', '진료', '상담', '치료',
  ],

  seoPassScore: 85,
  minTotalLength: 1800,
};

// 시술별 섹션 오버라이드 (Purpose — 개인 타임라인 아님)
//   [Purpose 재매핑] examination=검사(구 examination/diagnosis 통합 관점), treatmentDecision=치료 의사결정(구 treatment)
export const NEURO_TREATMENT_OVERRIDES_V2 = {
  // 척추·디스크군: 검사 확인 과정 강화(MRI 비중)
  neuro_disc: {
    examination:       { description: '허리디스크에서 진료 시 무엇을 확인하는가 — 신경 압박 정도·다리 방사통·근력 저하를 살피기 위해 MRI·이학적 검사를 활용하는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  neuro_stenosis: {
    concern:           { description: '걷다가 다리 저림으로 멈춰 서는 등 척추관협착증 검색 계기가 되는 상황에 공감(개인 후기 아님)', minLength: 150, maxLength: 250 },
  },
  neuro_neckdisc: {
    examination:       { description: '목디스크에서 진료 시 확인하는 과정 — 팔·손 저림과 손 근력 변화 원인을 살피기 위한 경추 MRI·신경학적 검사 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  neuro_compfx: {
    examination:       { description: '척추압박골절에서 진료 시 확인하는 과정 — X-ray·MRI로 골절 부위·눌린 정도와 골밀도를 살피는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // 말초신경군: 신경전도검사 중심
  neuro_carpal: {
    examination:       { description: '수근관증후군에서 진료 시 확인하는 과정 — 야간 손저림 범위와 손 근력을 살피기 위해 신경전도검사(NCS)를 활용하는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  neuro_peripheral: {
    examination:       { description: '말초신경병증에서 진료 시 확인하는 과정 — 손발 감각 저하 원인을 살피기 위해 신경전도검사·혈액검사를 활용하는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // 뇌신경군: 뇌영상 중심(감별 목적 명시, 진단 단정 금지)
  neuro_brainmri: {
    examination:       { description: '뇌MRI에서 진료 시 확인하는 과정 — 두통·어지럼·가족력에서 뇌혈관·구조를 살피는 감별 목적의 수단(진단 단정 금지)', minLength: 220, maxLength: 300 },
  },
  neuro_dizzy: {
    examination:       { description: '어지럼증에서 진료 시 확인하는 과정 — 중추성/말초성 감별 관점에서 무엇을 살피는지(단정 금지, 타과 협진 가능성 명시)', minLength: 220, maxLength: 300 },
  },
  // 비수술 시술군: 치료 의사결정 흐름 강화(효과 단정 금지)
  neuro_block: {
    treatmentDecision: { description: '신경차단술이 어떤 기준으로 선택되는지 — 약물 반응·통증 지속·신경학적 소견을 보고 어느 단계에서 고려되는지. 효과·회차 단정 금지', minLength: 250, maxLength: 350 },
  },
  neuro_neuroplasty: {
    treatmentDecision: { description: '경막외신경성형술이 어떤 기준으로 선택되는지 — 신경차단 반응·재발 간격·유착 의심 여부를 보고 어느 단계에서 고려되는지. 효과·회차·비용 단정 금지', minLength: 250, maxLength: 350 },
  },
  neuro_rfa: {
    treatmentDecision: { description: '고주파신경치료가 어떤 기준으로 선택되는지 — 통증 지속 기간·반복 진료 여부를 보고 어느 단계에서 고려되는지. 효과·회차·비용 단정 금지', minLength: 250, maxLength: 350 },
  },
};
