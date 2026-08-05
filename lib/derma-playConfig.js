// ============================================================
// derma-playConfig.js — 피부과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ clinic / dental / ent / oriental / ortho 절대 참조 금지
// [V2 전환] 후기형 → 정보형. concern/search/consult/decision/result(1일·1주·2주·1개월)/closing 제거.
//   치과·정형외과·한의원 정보형 V2 동형. 개인 체험·회복일지 시간축 삭제.
//   7섹션: concern / examination / diagnosis / treatment / visitInfo / checkPoint / closing
// ============================================================

export const DERMA_FLOW_ENGINE = {
  industry: 'derma',

  sections: [
    { key: 'concern',     label: '증상·상황',      order: 1, description: '해당 시술이 고려되는 피부 증상·상황의 일반적 양상 — 개인 후기 아님. 시술명 최대 2회·조사 오류 금지', required: true, minLength: 200, maxLength: 300 },
    { key: 'examination', label: '시술 전 확인사항', order: 2, description: '시술을 고려할 때 확인하면 좋은 사항(피부 타입·복용약·기존 시술 이력 등) 일반 안내', required: true, minLength: 200, maxLength: 300 },
    { key: 'diagnosis',   label: '피부과적 판단 요소', order: 3, description: '피부 타입·색소·탄력·염증 등 피부과에서 살피는 판단 요소 설명(단정 아님)', required: true, minLength: 250, maxLength: 350 },
    { key: 'treatment',   label: '시술 방법 안내',   order: 4, description: '레이저·주사·관리 등 시술 방법의 일반적 안내 — 효과 단정·비용·횟수 단정 금지', required: true, minLength: 250, maxLength: 350 },
    { key: 'visitInfo',   label: '진료 안내',       order: 5, description: '진료 흐름·상담 시 확인할 사항 등 일반 안내(개인 타임라인·회복일지 아님)', required: true, minLength: 200, maxLength: 300 },
    { key: 'checkPoint',  label: '확인 포인트',      order: 6, description: '피부과 시술 검토 시 확인 항목(전문의·시술장비·다운타임·주의사항) 정보 정리', required: true, minLength: 200, maxLength: 300 },
    { key: 'closing',     label: '마무리',          order: 7, description: '일반 안내 수준의 마무리. 개인 변화·예약 예정·후기·추천 표현 금지', required: true, minLength: 150, maxLength: 220 },
  ],

  blockKeywords: [
    // 한의원 침투 방지
    '한약', '침치료', '추나', '뜸', '부항', '체질', '경혈', '어혈',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '교정',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생', '소아과',
  ],

  requiredKeywords: [
    '피부과', '레이저', '시술', '피부', '색소', '탄력', '모공', '진료',
  ],

  seoPassScore: 85,
  minTotalLength: 2000,
};

// 시술별 섹션 오버라이드 (정보형 — 개인 타임라인 아님)
export const DERMA_TREATMENT_OVERRIDES = {
  // 신경계·의료광고법 민감군: 판단 요소 강화(효과 단정 금지)
  botox_derma: {
    diagnosis: { description: '보톡스 고려 시 살피는 근육·표정·주름 유형 등 판단 요소 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
  // 중증 여드름: 시술 전 확인사항 강화
  pdt: {
    examination: { description: 'PDT 고려 시 확인사항 — 기존 약물 치료 이력·광과민 여부 등 일반 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
  // 흉터: 판단 요소 강화(흉터 종류별)
  acne_scar: {
    diagnosis: { description: '여드름 흉터 관련 살피는 흉터 종류(위축·비후 등)·깊이 등 판단 요소 안내', minLength: 250, maxLength: 350 },
  },
};
