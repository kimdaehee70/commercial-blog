// ============================================================
// pain-v2-playConfig.js — 통증의학과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / ortho / neuro 절대 참조 금지
// [V2 Purpose 설계 · 2026-07-12] pain v1(후기형 concern/search/consult/decision/result/closing)
//   → Purpose 7섹션. 검사·치료 나열을 '사용자 의사결정을 돕는 흐름'으로 종속.
//   기준 엔진: neuro-v2 (= ortho-v2 정식 승격본 계열) One Axis 이식. 통증의학과 데이터만 치환.
//   Purpose 7섹션: concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//   개인 체험·회복일지·타임라인·비용/CTA 삭제(정보형 원칙 유지).
//
// [Pilot] pain v1(후기형) 무손상 A/B 보존. 이 파일은 v2 전용.
//   engineBootstrap pain 래퍼가 mode==='purpose'일 때만 v2 위임.
//
// [화이트리스트 없음] pain-data 전 시술(28종) 사용 — 전부 통증의학과 자산.
//   타과 침투는 blockKeywords로만 차단.
//
// [통증의학과 축] 수술 vs 비수술이 아니라 "보존적 관리 → 중재적 시술" 흐름이 판단축.
// ============================================================

export const PAIN_FLOW_ENGINE_V2 = {
  industry: 'pain',
  version: 'v2',

  sections: [
    { key: 'concern',           label: '지금 이런 상황인가요?',              order: 1, description: '검색 계기가 된 통증·저림·움직임 제한 상황에 공감. 텍스트는 짧게(공감 증상 사진이 관심 유도 역할). 개인 후기 아님·질환명 최대 2회·조사 오류 금지', required: true, minLength: 120, maxLength: 180 },
    { key: 'visitTrigger',      label: '이럴 때 진료를 고려해볼 수 있습니다', order: 2, description: '어떤 신호·지속 기간·악화 양상일 때 통증의학과 진료를 고려하면 좋은지 방문 판단 기준을 안내. 겁주기·단정 금지', required: true, minLength: 180, maxLength: 250 },
    { key: 'examination',       label: '진료에서는 무엇을 확인하나요?',       order: 3, description: '검사는 목적이 아니라 원인을 확인하는 수단. 판단 기준 먼저 → 문진·이학적 검사(압통·가동범위·유발동작) 중심, 영상은 필요 시 1개만 종속. 검사 종류 최대 2개. 확정 진단 아님', required: true, minLength: 200, maxLength: 300 },
    { key: 'treatmentDecision', label: '치료는 어떤 기준으로 결정되나요?',    order: 4, description: '치료 나열이 아니라 치료가 어떤 기준으로 선택되는지 의사결정 흐름(핵심 축). 판단 기준 먼저 → 보존적 관리 우선 검토 / 조절되지 않으면 중재적 시술 함께 판단, 2~3문장 골격. 치료 작동 방식 설명·나열 금지. 수술 설명 금지. 효과·비용·회차 단정 금지', required: true, minLength: 180, maxLength: 260 },
    { key: 'checkPoint',        label: '병원 선택 시 확인할 점',            order: 5, description: '사용자가 병원을 판단할 때 확인하면 좋은 기준(통증의학과 전문의·진료 분야 적합성·검사 장비·단계별 치료 기준 안내 여부) 정리', required: true, minLength: 200, maxLength: 300 },
    { key: 'sceneVisit',        label: '진료실과 치료실에서 확인하는 과정',   order: 6, description: '진료실·치료실 실제 장면 묘사와 방문 안내를 함께 — 사진과 함께 신뢰 형성. 불안완화형("처음 방문하면 이런 순서로 진행됩니다"). 개인 타임라인·회복일지 아님', required: true, minLength: 150, maxLength: 250 },
    { key: 'closing',           label: '마무리',                         order: 7, description: '일반 안내 수준의 마무리. 개인 변화·예약 예정·후기·추천·비용 표현 금지. 3문장 고정', required: true, minLength: 100, maxLength: 150 },
  ],

  blockKeywords: [
    // 한의원 침투 방지
    '추나요법', '추나', '한약', '침치료', '뜸', '부항', '체질', '경혈', '어혈', '기혈',
    // 정형외과 수술 영역 침투 방지 (통증의학과는 비수술·중재 중심)
    '인공관절', '관절경', '절골술', '반월상연골절제', '전방십자인대재건', '수술적 봉합',
    // 신경외과 수술 영역 침투 방지
    '척추유합술', '디스크제거술', '미세현미경', '개두술', '감압술',
    // 성형외과 침투 방지
    '쌍꺼풀', '코성형', '리프팅', '지방흡입', '안면윤곽', '모발이식', '울쎄라', '써마지',
    // 피부과 침투 방지
    '여드름', '기미', '색소', '모공', '피코레이저', '레이저토닝', '보톡스', '필러',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '치아교정',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생', '소아과',
    // AI 정보글 포화 패턴 (정보형 오염 차단 — ortho-v2/neuro-v2 동형)
    '기준으로 살펴본', '관리 방법과 생활 속', '일상 속 적용 가이드',
    '체계적인 접근과', '알아두면 좋은 관리법', '케어 방법과 예방 전략',
    '예방 체크리스트', '통증 발생 원인부터', '증상 개선이 필요하다면',
  ],

  requiredKeywords: [
    '통증의학과', '검사', '진료', '상담', '치료',
  ],

  seoPassScore: 85,
  minTotalLength: 1800,
};

// 시술별 섹션 오버라이드 (Purpose — 개인 타임라인 아님)
//   examination = 진료 확인 과정 / treatmentDecision = 치료 의사결정
export const PAIN_TREATMENT_OVERRIDES_V2 = {
  // ── 척추·디스크군: 저림 경로·보행 확인 강화 ──
  lumbar_nerve_block: {
    examination:       { description: '허리디스크에서 진료 시 무엇을 확인하는가 — 다리로 뻗치는 저림 경로·근력 저하를 살피기 위해 이학적 검사와 필요 시 MRI를 활용하는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  spinal_stenosis_pain: {
    concern:           { description: '걷다가 다리 저림으로 멈춰 서는 등 척추관협착증 검색 계기가 되는 상황에 공감(개인 후기 아님)', minLength: 150, maxLength: 250 },
    examination:       { description: '척추관협착증에서 진료 시 확인하는 과정 — 연속 보행 거리와 허리를 숙일 때의 변화를 살피는 이학적 검사 중심(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  cervical_nerve_block: {
    examination:       { description: '목디스크에서 진료 시 확인하는 과정 — 팔·손 저림 범위와 손 근력 변화를 살피기 위한 이학적 검사와 필요 시 경추 영상(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  sciatica: {
    examination:       { description: '좌골신경통에서 진료 시 확인하는 과정 — 저림이 뻗치는 경로와 자세에 따른 변화를 살피는 이학적 검사 중심(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // ── 중재 시술군: 치료 의사결정 흐름 강화(효과·회차 단정 금지) ──
  nerve_plasty: {
    treatmentDecision: { description: '중재적 시술이 어떤 기준으로 선택되는지 — 이전 치료 반응·재발 간격·유착 의심 여부를 보고 어느 단계에서 고려되는지. 시술 고유명 노출 금지. 효과·회차·비용 단정 금지', minLength: 200, maxLength: 280 },
  },
  radiofrequency_ablation: {
    treatmentDecision: { description: '중재적 시술이 어떤 기준으로 선택되는지 — 통증 반복 기간·이전 치료 반응을 보고 어느 단계에서 고려되는지. 시술 고유명 노출 금지. 효과·회차·비용 단정 금지', minLength: 200, maxLength: 280 },
  },
  prolotherapy_pain: {
    treatmentDecision: { description: '주사 치료가 어떤 기준으로 선택되는지 — 압통 부위의 뚜렷함·통증 지속 기간·기존 재활 반응을 보고 어느 단계에서 고려되는지. 효과·회차·비용 단정 금지', minLength: 200, maxLength: 280 },
  },
  prp_pain: {
    treatmentDecision: { description: '주사 치료가 어떤 기준으로 선택되는지 — 만성 반복 여부·손상 부위·기존 치료 반응을 보고 어느 단계에서 고려되는지. 효과·회차·비용 단정 금지', minLength: 200, maxLength: 280 },
  },
  stem_cell_knee: {
    treatmentDecision: { description: '재생 치료가 어떤 기준으로 선택되는지 — 연골 손상 범위·관절염 단계·활동량을 보고 적용 대상인지 먼저 평가. 효과·재생 단정 절대 금지', minLength: 200, maxLength: 280 },
  },
  // ── 말초신경군: 신경전도검사 허용(유일 구간) ──
  neuropathic_pain: {
    examination:       { description: '신경병증성 통증에서 진료 시 확인하는 과정 — 통증 성질(화끈거림·찌릿함)과 감각 이상 분포를 살피며, 필요 시 신경전도검사를 활용하는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  postherpetic_neuralgia: {
    examination:       { description: '대상포진 후 신경통에서 진료 시 확인하는 과정 — 발진이 있던 부위와 통증 분포가 일치하는지, 감각 과민이 있는지를 살피는 이학적 검사 중심(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // ── 만성·전신군: 감별 관점 강화(단정 금지) ──
  fibromyalgia: {
    examination:       { description: '섬유근육통에서 진료 시 확인하는 과정 — 전신 통증 분포와 수면·피로 동반 여부를 살피며 다른 원인 질환을 감별하는 과정(단정 금지, 타과 협진 가능성 명시)', minLength: 220, maxLength: 300 },
  },
  chronic_pain: {
    treatmentDecision: { description: '만성통증에서 치료 방향이 어떤 기준으로 결정되는지 — 통증 지속 기간·약물 반응·수면과 활동 제한을 보고 보존적 관리와 중재적 시술이 갈리는 지점. 완치 표현 금지', minLength: 200, maxLength: 280 },
  },
  cancer_pain: {
    treatmentDecision: { description: '암성 통증에서 치료 방향이 어떤 기준으로 결정되는지 — 약물 조절 정도·돌발 통증 빈도·부작용을 보고 단계적으로 판단. 원 치료 과 협진 관점 유지. 효과 단정 금지', minLength: 200, maxLength: 280 },
  },
};
