// ============================================================
// dental-v2-playConfig.js — 치과 정보형 V2 FLOW 구조
// ------------------------------------------------------------
// ⚠️ v1(dental-playConfig.js) 무손상. 본 파일은 신규 Major Version.
// ⚠️ clinic 계열 절대 참조 금지 / 타 업종 섹션 공유 금지.
// ------------------------------------------------------------
// [Spine 정합 — 병원군 Reference = ortho-v2]
//   Purpose 7섹션:
//     ① concern           — 지금 이런 상황인가요? (공감·검색 계기)
//     ② visitTrigger      — 이럴 때 진료를 고려 (방문 판단)
//     ③ examination       — 진료에서 무엇을 확인 (판단 기준 → 검사는 수단)
//     ④ treatmentDecision — 치료는 어떤 기준으로 결정 (핵심 축)
//     ⑤ checkPoint        — 치과 선택 시 확인할 점 (사용자 판단 기준)
//     ⑥ sceneVisit        — 진료실·상담실 장면 (불안 완화)
//     ⑦ closing           — 마무리 (일반 안내)
//
//   복사한 것: 구조(Spine) · 제약 · 흐름 · DIRECTION 소비 방식
//   복사하지 않은 것: 치과 판단 내용 · 치과 용어 · 치과 Direction
// ------------------------------------------------------------
// [v2 폐기 항목]
//   · recoveryTimeline (d1/d7/m1/m3) — 전 치료 공용 시간축. 미백·교정 등에 억지 적용됨.
//     ortho-v2 원칙(개인 타임라인 금지)과 충돌 → 완전 제거. 관리 축은 DIRECTION이 소유.
//   · 5섹션(purpose_intro/hospital_explain/exam_judge/treatment_way/care_target) — 7섹션으로 대체.
// ------------------------------------------------------------
// 의료법 정합: 병원 화자·정보형 유지. 후기(personal) 부활 아님.
// ============================================================

export const DENTAL_V2_PURPOSE_FLOW = {
  industry: 'dental',
  engineVersion: 'v2-purpose',

  // ── Purpose 7섹션 (ortho-v2 동일 골격) ──
  sections: [
    {
      key: 'concern',
      label: '지금 이런 상황인가요',
      order: 1,
      axis: '공감·검색 계기',
      description: '검색자가 왜 이 글을 찾았는가. 불편 장면에서 출발. 원인 나열 금지(교과서식 설명 금지). 치료명 아직 주인공 아님.',
      required: true,
      weightPct: 8,
      minLength: 120,
      maxLength: 180,
      rule: '원인 설명으로 시작 금지. 지금 겪는 불편에서 출발.',
    },
    {
      key: 'visitTrigger',
      label: '이럴 때 진료를 고려',
      order: 2,
      axis: '방문 판단',
      description: '어떤 신호·지속 기간일 때 진료를 고려하는가. 자가 관리로 볼 선과 진료를 볼 선의 구분.',
      required: true,
      weightPct: 12,
      minLength: 180,
      maxLength: 250,
      rule: '판단만. 검사·치료 설명 금지. CTA·강요 금지.',
    },
    {
      key: 'examination',
      label: '진료에서 무엇을 확인하나요',
      order: 3,
      axis: '판단 기준 → 검사는 수단',
      dataSource: 'DIRECTION.diagnosisFocus',
      description: '판단축을 먼저 세우고 검사를 뒤에 종속. 공통 템플릿 문장 금지.',
      required: true,
      weightPct: 16,
      minLength: 200,
      maxLength: 300,
      rule: '검사 종류 최대 2개. 검사 원리 해설 금지. 확정 진단 아님 명시.',
    },
    {
      key: 'treatmentDecision',
      label: '치료는 어떤 기준으로 결정되나요',
      order: 4,
      axis: '핵심 축 — 의사결정',
      dataSource: 'DIRECTION.treatmentDecision',
      description: '치료 방향이 갈리는 지점. 치료법 나열·작동 해설 금지. 5~6문장 하드 제약.',
      required: true,
      weightPct: 20,
      minLength: 180,
      maxLength: 260,
      rule: '치료 작동 설명 금지. 같은 기준 반복 금지. 유보 문장 1회만.',
    },
    {
      key: 'checkPoint',
      label: '치과 선택 시 확인할 점',
      order: 5,
      axis: '사용자 판단 기준',
      dataSource: 'DIRECTION.hospitalPoint',
      description: '이 치료 특유의 확인 포인트가 중심. 일반론(전문의·장비·접근성)은 최대 1개.',
      required: true,
      weightPct: 16,
      minLength: 200,
      maxLength: 300,
      rule: '특정 병원 추천 금지. 일반론 억제.',
    },
    {
      key: 'sceneVisit',
      label: '진료실·상담실 장면',
      order: 6,
      axis: '불안 완화',
      description: '방문 흐름을 담담히 안내. 장면 1개 짧게. 설명형 아님.',
      required: true,
      weightPct: 16,
      minLength: 150,
      maxLength: 250,
      rule: '개인 타임라인·발화 인용·비용·치과명 금지.',
    },
    {
      key: 'closing',
      label: '마무리',
      order: 7,
      axis: '일반 안내',
      description: '짧게 정리. 유보 문장은 여기서 1회만.',
      required: true,
      weightPct: 12,
      minLength: 100,
      maxLength: 150,
      rule: '예약·추천·비용 표현 금지.',
    },
  ],

  // ── 정보블록 삽입 앵커 (섹션 ⑤ 뒤 — 판단 기준 요약표) ──
  infoBlockAnchor: 'checkPoint',

  // ── v1에서 승계 (오염 차단 — 무변경) ──
  blockKeywords: [
    '처진', '리프팅', '주름', '필러', '보톡스', '레이저토닝', '울쎄라',
    '성형', '피부과', '지방흡입',
    '교실', '선생님', '어린이집', '원생',
    '낚싯대', '포인트', '조과',
    '한방', '한의원', '침', '뜸',
  ],
  requiredKeywords: [
    '치과', '치아', '임플란트', '교정', '스케일링', '신경치료',
    '라미네이트', '충치', '잇몸', '크라운',
  ],

  // ⚠️ recoveryTimeline 폐기 — v2는 개인 타임라인(D+1/1주/1개월/3개월) 전면 금지.
  //    관리·유지 축은 DENTAL_DIRECTION(치료별 판단 데이터)이 소유한다.

  // SEO 합격 기준 — purpose는 survival로 판단(commercial 채점기 낮게 잡힘, 정상)
  seoPassScore: 70,
  minTotalLength: 1800,
};

// ── 치료별 섹션 커스터마이징 (목적축 기준 — 분량 조정만, 흐름 변경 아님) ──
export const DENTAL_V2_TREATMENT_OVERRIDES = {
  // 임플란트: 치료 결정(뼈 양·이식 여부)이 복잡 → ④ 강화
  implant: {
    treatmentDecision: { minLength: 220, maxLength: 300 },
  },
  // 임플란트 재수술: 판단 기준 복잡 → ③④ 강화
  implant_redo: {
    examination:       { minLength: 240, maxLength: 320 },
    treatmentDecision: { minLength: 220, maxLength: 300 },
  },
  // 스케일링: 단순 → ④ 축소, ⑤(관리 주기) 유지
  scaling: {
    treatmentDecision: { minLength: 140, maxLength: 200 },
  },
  // 치아미백: 원인 구분(표면/내부)·기존 보철물이 핵심 → ③ 강화
  whitening: {
    examination: { minLength: 240, maxLength: 320 },
  },
  // 교정 3종: 진단(공간·교합)이 핵심 → ③ 강화
  braces:         { examination: { minLength: 240, maxLength: 320 } },
  metal_braces:   { examination: { minLength: 240, maxLength: 320 } },
  lingual_braces: { examination: { minLength: 240, maxLength: 320 } },
};
