// ============================================================
// clinic-v2-playConfig.js — 성형외과 FLOW_ENGINE 구조 (완전 독립)
// ⚠️ derma / dental / ent / oriental / ortho 절대 참조 금지
// [V2 전환] 후기형 → 정보형. concern/situation/consult/reason/result/closing(후기 6섹션) 폐지.
//   피부과·치과·정형외과·한의원 정보형 V2 동형. 개인 체험·회복일지 시간축 삭제.
//   7섹션: concern / examination / diagnosis / treatment / visitInfo / checkPoint / closing
//
// [Pilot] clinic v1(후기형) 무손상 A/B 보존. 이 파일은 v2 전용.
//   engineBootstrap clinic 래퍼가 mode==='purpose'일 때만 v2 위임.
//
// [화이트리스트] 성형 시술만 참조(피부과=derma 소관 pico_laser/laser_toning 배제).
//   clinic-data.js 무손상 — 참조 시 CLINIC_V2_ALLOWED로 필터.
// ============================================================

// 성형 시술 화이트리스트 (cat:"피부" 2종 제외 = pico_laser/laser_toning)
export const CLINIC_V2_ALLOWED = [
  "natural_double", "eye_fat", "epicanthoplasty", "ptosis",   // 눈성형
  "rhinoplasty",                                              // 코성형
  "sili_lifting", "ulthera", "rf_lifting",                    // 리프팅
  "botox", "filler",                                          // 보톡스·필러
  "facial_contour", "forehead",                              // 윤곽
  "liposuction", "fat_graft",                                // 지방·체형
  "hair_transplant",                                         // 모발
];

export const CLINIC_FLOW_ENGINE_V2 = {
  industry: 'clinic',
  version: 'v2',

  sections: [
    { key: 'concern',     label: '증상·상황',        order: 1, description: '해당 시술이 고려되는 외형·상황의 일반적 양상 — 개인 후기 아님. 시술명 최대 2회·조사 오류 금지', required: true, minLength: 200, maxLength: 300 },
    { key: 'examination', label: '시술 전 확인사항',   order: 2, description: '시술을 고려할 때 확인하면 좋은 사항(건강 상태·복용약·기존 시술 이력 등) 일반 안내', required: true, minLength: 200, maxLength: 300 },
    { key: 'diagnosis',   label: '성형외과적 판단 요소', order: 3, description: '얼굴·부위별 구조·비대칭·피부 상태 등 성형외과에서 살피는 판단 요소 설명(단정 아님)', required: true, minLength: 250, maxLength: 350 },
    { key: 'treatment',   label: '시술 방법 안내',      order: 4, description: '절개·비절개·주사·이식 등 시술 방법의 일반적 안내 — 효과 단정·비용·회복기간 단정 금지', required: true, minLength: 250, maxLength: 350 },
    { key: 'visitInfo',   label: '진료 안내',          order: 5, description: '진료 흐름·상담 시 확인할 사항 등 일반 안내(개인 타임라인·회복일지 아님)', required: true, minLength: 200, maxLength: 300 },
    { key: 'checkPoint',  label: '확인 포인트',        order: 6, description: '성형외과 시술 검토 시 확인 항목(전문의·시술경험·수술방법·마취·주의사항) 정보 정리', required: true, minLength: 200, maxLength: 300 },
    { key: 'closing',     label: '마무리',            order: 7, description: '일반 안내 수준의 마무리. 개인 변화·예약 예정·후기·추천 표현 금지', required: true, minLength: 150, maxLength: 220 },
  ],

  blockKeywords: [
    // 피부과 침투 방지 (derma 소관 — 성형 글에 유입 차단)
    '여드름', '기미', '색소', '모공', '피코레이저', '레이저토닝', '아토피', '건선', '탈모약',
    // 한의원 침투 방지
    '한약', '침치료', '추나', '뜸', '부항', '체질', '경혈', '어혈',
    // 치과 침투 방지
    '임플란트', '치아', '잇몸', '충치', '크라운', '치아교정',
    // 이비인후과 침투 방지
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과 침투 방지
    '전립선', '포경', '요로결석', '발기', '정관',
    // 유치원 차단
    '교실', '선생님', '어린이집', '원생', '소아과',
  ],

  requiredKeywords: [
    '성형외과', '시술', '수술', '상담', '진료',
  ],

  seoPassScore: 85,
  minTotalLength: 2000,
};

// 시술별 섹션 오버라이드 (정보형 — 개인 타임라인 아님)
export const CLINIC_TREATMENT_OVERRIDES_V2 = {
  // 신경계·의료광고법 민감군: 판단 요소 강화(효과 단정 금지)
  botox: {
    diagnosis: { description: '보톡스 고려 시 살피는 근육·표정·주름 유형 등 판단 요소 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
  filler: {
    diagnosis: { description: '필러 고려 시 살피는 볼륨·비대칭·피부 두께 등 판단 요소 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
  // 수술군: 시술 전 확인사항 강화(전신마취·회복 관련)
  rhinoplasty: {
    examination: { description: '코성형 고려 시 확인사항 — 코 구조·기존 수술 이력·전신 건강 상태 등 일반 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
  facial_contour: {
    examination: { description: '안면윤곽 고려 시 확인사항 — 골격 상태·기존 수술 이력·전신 건강 상태 등 일반 안내', minLength: 250, maxLength: 350 },
  },
  liposuction: {
    examination: { description: '지방흡입 고려 시 확인사항 — 체형·피부 탄력·기저질환 등 일반 안내(효과 단정 금지)', minLength: 250, maxLength: 350 },
  },
};
