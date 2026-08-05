// ============================================================
// oriental-playConfig.js — 한의원 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / dental / ent / urology 절대 참조 금지
// [V2 전환] 후기형 → 정보형. recoveryTimeline/result(1회·1주·1개월·3개월) 제거.
//   치과·정형외과 정보형 V2 동형. 개인 체험·후기 구조 삭제.
// ============================================================

export const ORIENTAL_FLOW_ENGINE = {
  industry: 'oriental',

  sections: [
    { key: 'concern',     label: '증상·상황', order: 1, description: '해당 증상·불편함의 일반적 양상과 배경 설명 — 개인 후기 아님. 치료명 최대 2회·조사 오류 금지', required: true, minLength: 180, maxLength: 260 },
    { key: 'examination', label: '진료 전 확인사항', order: 2, description: '내원 전 확인하면 좋은 사항(증상 기간·복용약·기존 질환 등) 일반 안내. 보험 언급 금지(섹션6에서 1회만)', required: true, minLength: 180, maxLength: 250 },
    { key: 'diagnosis',   label: '한의학적 판단 요소', order: 3, description: '[축B] 체질·기혈·경혈·어혈 중 관련 2가지만. 용어 개별 해설 금지. 2~3문장 압축', required: true, minLength: 180, maxLength: 250 },
    { key: 'treatment',   label: '치료 방법 안내', order: 4, description: '[축B] 중심 방법 2~3가지만. 침·한약·추나·뜸·부항 개별 나열 금지. 효과·비용·횟수 단정 금지', required: true, minLength: 180, maxLength: 250 },
    { key: 'visitInfo',   label: '진료 안내', order: 5, description: '진료 흐름·상담 시 확인할 사항. 한의학 이론 재설명 금지', required: true, minLength: 160, maxLength: 220 },
    { key: 'checkPoint',  label: '확인 포인트', order: 6, description: '한의원 진료 검토 시 확인 항목(면허·진료분야·치료종류·보험·주의사항). 보험은 여기서만 1회', required: true, minLength: 180, maxLength: 260 },
    { key: 'closing',     label: '마무리', order: 7, description: '일반 안내 수준의 마무리. 본문 내용 재요약 금지', required: true, minLength: 120, maxLength: 180 },
  ],

  blockKeywords: [
    // 성형외과/피부과 침투 방지
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러',
    '피코레이저', '레이저토닝', '지방흡입', '성형외과',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생',
  ],

  requiredKeywords: [
    '한의원', '한방', '한약', '침', '추나', '도수', '뜸', '부항',
    '체질', '기혈', '경혈', '어혈',
  ],

  seoPassScore: 85,
  // [축B] 섹션 분량 축소(합계 min 1180 / max 1670) 반영 — 기존 2000은 미달 판정 유발.
  minTotalLength: 1500,
};

export const ORIENTAL_TREATMENT_OVERRIDES = {
  // 교통사고: 보험 처리 관련 확인사항 강화(정보형 — 개인 통원 타임라인 아님)
  traffic_accident: {
    checkPoint: { description: '교통사고 한방치료 시 확인 항목 — 자동차보험 적용·진단서·통원 절차 등 일반 안내', minLength: 200, maxLength: 280 },
  },
  // 구안와사: 초기 진료 관련 확인사항 강화
  facial_palsy: {
    examination: { description: '구안와사 의심 시 내원 전 확인사항 — 발병 시점·동반 증상 등 일반 안내(회복 단정 금지)', minLength: 200, maxLength: 280 },
  },
  // 산후 한방: 산후 진료 관련 확인사항
  postpartum: {
    examination: { description: '산후 한방 진료 전 확인사항 — 출산 방식·수유 여부·복용약 등 일반 안내', minLength: 190, maxLength: 260 },
  },
  // 한방 다이어트: 상담 관련 확인사항(체중 변화 타임라인 아님)
  oriental_diet: {
    diagnosis: { description: '한방 다이어트 상담 시 살피는 체질·생활습관 등 판단 요소 안내(체중 감량 단정 금지)', minLength: 180, maxLength: 250 },
  },
};
