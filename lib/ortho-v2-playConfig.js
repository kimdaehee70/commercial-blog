// ============================================================
// ortho-v2-playConfig.js — 정형외과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / neuro / pain 절대 참조 금지
// [V2 전환] 후기형 → 정보형 → [Purpose 재설계] 검사·치료 나열을 '사용자 의사결정을 돕는 흐름'으로 종속.
//   개인 체험·회복일지·타임라인·비용/CTA 삭제(정보형 원칙 유지).
//   Purpose 7섹션: concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//
// [Pilot] ortho v1(후기형) 무손상 A/B 보존. 이 파일은 v2 전용.
//   engineBootstrap ortho 래퍼가 mode==='purpose'일 때만 v2 위임.
//
// [화이트리스트 없음] 정형외과 전 치료(24종) 사용 — 전부 정형외과 자산.
//   (neuro-v2 방침 동일. clinic-v2처럼 타과 시술 배제 필요 없음.)
//   타과 침투는 blockKeywords로만 차단.
// ============================================================

export const ORTHO_FLOW_ENGINE_V2 = {
  industry: 'ortho',
  version: 'v2',

  sections: [
    { key: 'concern',           label: '지금 이런 상황인가요?',           order: 1, description: '검색 계기가 된 통증·기능 제한 상황에 공감. 텍스트는 짧게(공감 증상 사진이 관심 유도 역할). 개인 후기 아님·치료명 최대 2회·조사 오류 금지', required: true, minLength: 120, maxLength: 180 },
    { key: 'visitTrigger',      label: '이럴 때 진료를 고려해볼 수 있습니다', order: 2, description: '어떤 신호·상황일 때 진료를 고려하면 좋은지 방문 판단 기준을 안내. 겁주기·단정 금지, 판단을 돕는 정보', required: true, minLength: 180, maxLength: 250 },
    { key: 'examination',       label: '진료에서는 무엇을 확인하나요?',      order: 3, description: '검사·진단은 목적이 아니라 원인을 확인하는 수단. 무엇을 살피기 위한 과정인지 판단 기준 먼저 → 검사는 1줄로 종속. 검사 종류 최대 2개. 확정 진단 아님', required: true, minLength: 200, maxLength: 300 },
    { key: 'treatmentDecision', label: '치료는 어떤 기준으로 결정되나요?',    order: 4, description: '치료 나열이 아니라 치료가 어떤 기준으로 선택되는지 의사결정 흐름(핵심 축). 판단 기준 먼저 → 비수술 우선 검토 / 악화 신호 시 수술 함께 판단, 2~3문장 골격. 치료 작동 방식 설명·나열 금지. 효과·비용·회복기간 단정 금지', required: true, minLength: 180, maxLength: 260 },
    { key: 'checkPoint',        label: '병원 선택 시 확인할 점',           order: 5, description: '사용자가 병원을 판단할 때 확인하면 좋은 기준(전문의·치료 분야 적합성·비수술/수술 방법·재활·주의사항) 정리', required: true, minLength: 200, maxLength: 300 },
    { key: 'sceneVisit',        label: '진료실과 검사실에서 확인하는 과정',   order: 6, description: '진료실·검사실 실제 장면 묘사와 방문 안내를 함께 — 사진과 함께 신뢰 형성. 불안완화형("처음 방문하면 이런 순서로 진행됩니다"). 개인 타임라인·회복일지 아님', required: true, minLength: 150, maxLength: 250 },
    { key: 'closing',           label: '마무리',                        order: 7, description: '일반 안내 수준의 마무리. 개인 변화·예약 예정·후기·추천·비용 표현 금지', required: true, minLength: 100, maxLength: 150 },
  ],

  blockKeywords: [
    // 성형외과·피부과 침투 방지
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러', '보톡스',
    '피코레이저', '성형외과', '지방흡입', '레이저토닝', '여드름', '기미', '색소', '모공',
    // 신경외과 침투 방지 (경계 질환 — 정형외과 관점 유지)
    '뇌MRI', '뇌혈관', '삼차신경통', '안면경련', '개두술',
    // 한의원 침투 방지
    '한약', '침치료', '추나', '뜸', '부항', '체질', '경혈', '어혈', '기혈',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '치아교정',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생', '소아과',
    // AI 정보글 포화 패턴 (정보형 오염 차단)
    '기준으로 살펴본', '관리 방법과 생활 속', '일상 속 적용 가이드',
    '체계적인 접근과', '알아두면 좋은 관리법', '케어 방법과 예방 전략',
    '예방 체크리스트', '통증 발생 원인부터', '증상 개선이 필요하다면',
  ],

  requiredKeywords: [
    '정형외과', '통증', '치료', '진료', '검사',
  ],

  seoPassScore: 85,
  minTotalLength: 1800,
};

// 치료별 섹션 오버라이드 (정보형 — 개인 타임라인 아님)
//   [Purpose 재매핑] examination=검사(구 examination/diagnosis 통합 관점), treatmentDecision=치료 의사결정(구 treatment)
export const ORTHO_TREATMENT_OVERRIDES_V2 = {
  // 척추·디스크군: 검사 확인 과정 강화(MRI 비중)
  lumbar_disc: {
    examination:       { description: '허리디스크에서 진료 시 무엇을 확인하는가 — X-ray·MRI·이학적 검사(하지직거상 등)로 신경 압박·방사통 원인을 살피는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  spinal_stenosis: {
    concern:           { description: '보행 시 다리 저림·간헐적 파행 등 척추관협착증 검색 계기가 되는 상황에 공감(개인 후기 아님)', minLength: 150, maxLength: 250 },
  },
  cervical_disc: {
    examination:       { description: '목디스크에서 진료 시 확인하는 과정 — 목·어깨·팔 방사통, 손 저림 원인을 살피기 위한 검사 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // 수술·재활군: 검사 확인 과정 강화
  acl: {
    examination:       { description: '전방십자인대에서 진료 시 확인하는 과정 — 이학적 검사(전방전위 등)·MRI로 손상 정도를 살피는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  fracture_rehab: {
    examination:       { description: '골절 후 재활에서 진료 시 확인하는 과정 — 영상 확인·가동범위 평가로 회복 상태를 살피는 수단', minLength: 220, maxLength: 300 },
  },
  compression_fracture: {
    examination:       { description: '허리압박골절에서 진료 시 확인하는 과정 — X-ray·MRI로 골절 부위·정도를 살피는 수단(확정 진단 아님)', minLength: 220, maxLength: 300 },
  },
  // 주사·비수술군: 치료 의사결정 흐름 강화(효과 단정 금지)
  shockwave_ortho: {
    treatmentDecision: { description: '체외충격파가 어떤 기준으로 선택되는지 — 적용 부위·원리와 다른 방법 대비 어떤 상황에 고려되는지. 효과·회차 단정 금지', minLength: 250, maxLength: 350 },
  },
  prolotherapy: {
    treatmentDecision: { description: '프롤로·인대증식이 어떤 기준으로 선택되는지 — 원리와 적용 대상 관점. 효과·회차·비용 단정 금지', minLength: 250, maxLength: 350 },
  },
  manual_therapy_ortho: {
    treatmentDecision: { description: '도수치료가 어떤 기준으로 선택되는지 — 접근 방식과 적용 대상 관점. 효과·회차·비용 단정 금지', minLength: 250, maxLength: 350 },
  },
};
