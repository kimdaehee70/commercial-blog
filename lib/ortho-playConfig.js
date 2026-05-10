// ============================================================
// ortho-playConfig.js — 정형외과 FLOW_ENGINE (완전 독립)
// ⚠️ clinic / dental / ent / urology / oriental 절대 참조 금지
// v1.1: 강남 정형외과 실검 분석 반영 (2026.04)
//   - 비수술 강조 / 증상형 제목 / 후기형 공백 공략
//   - 치료별 타임라인 override 확장
// ============================================================

export const ORTHO_FLOW_ENGINE = {
  industry: 'ortho',

  sections: [
    {
      key: 'concern', label: '고민', order: 1, required: true,
      minLength: 200, maxLength: 300,
      description: [
        '직장·운동·일상 맥락 + 통증 방치 이유',
        '치료명 최대 2회 / AI 나열 구조 금지',
        '수술 두려움 또는 비수술 탐색 심리 포함',
        '예: "앉아 있을수록 허리가" / "운동하다 무릎이" / "계단이 제일 무서웠는데"',
      ].join(' / '),
    },
    {
      key: 'situation', label: '탐색', order: 2, required: true,
      minLength: 200, maxLength: 300,
      description: [
        '검색·지인 추천 등 탐색 과정',
        '가격·실비 검색어 1개 필수',
        '2~3곳 비교 기준(실비 적용 여부·전문의·대기) 언급',
        '정형외과 vs 신경외과 고민 언급 가능',
      ].join(' / '),
    },
    {
      key: 'consult', label: '상담', order: 3, required: true,
      minLength: 250, maxLength: 350,
      description: [
        '비용·횟수·실비·회복 기간 질문 1개',
        '원장님 말 직접 인용 1회 필수 ("원장님이 \'~\' 라고 하시더라고요")',
        '수술 vs 비수술 설명 또는 compareWith 비교 포함',
        '상담 분위기 묘사 금지 → 설명 내용으로 납득',
      ].join(' / '),
    },
    {
      key: 'reason', label: '선택', order: 4, required: true,
      minLength: 200, maxLength: 300,
      description: [
        'compareWith 비교 후 선택 이유',
        '비수술 선택 이유 or 수술 결심 계기 구체적으로',
        '실비 적용·전문의·접근성 중 1개 이상',
        '"수술만이 답일까요?" 고민 담을 것',
      ].join(' / '),
    },
    {
      key: 'result', label: '결과', order: 5, required: true,
      minLength: 300, maxLength: 400,
      description: [
        '치료별 타임라인 (1회·1주·1개월·3개월 or 수술별)',
        '수치 필수: 회차·비용·통증 변화(10→5→2점)',
        '실생활 증상 변화: "계단 통증 절반" / "팔 수평까지" / "아침 첫발 사라짐"',
        '"많이 나아졌어요" 막연 표현 금지 → 동작·수치로 대체',
        '비용 1회 자연 삽입 필수 (OO만원 형태)',
      ].join(' / '),
    },
    {
      key: 'closing', label: '마무리', order: 6, required: true,
      minLength: 200, maxLength: 250,
      description: [
        '담담한 전후 변화 요약 (드라마틱 표현 금지)',
        '추천 대상 2개 자연스럽게 언급',
        '지역 + 치료명 키워드 포함 (치료명 생략 금지)',
        'CTA 상담 유도로 마무리',
      ].join(' / '),
    },
  ],

  // 생성 시 차단 키워드
  blockKeywords: [
    // 성형외과/피부과
    '쌍꺼풀', '눈매교정', '리프팅', '울쎄라', '써마지', '필러', '피코레이저', '성형외과',
    // 치과
    '임플란트', '치아', '잇몸', '충치', '크라운',
    // 이비인후과
    '비염', '편도', '축농증', '이명', '난청',
    // 비뇨기과
    '전립선', '포경', '요로결석', '발기', '정관',
    // 한의원 한방 표현
    '기혈', '체질 개선', '한약', '경혈', '어혈', '뜸', '부항',
    // AI 정보글 포화 패턴 (최신순 차단)
    '기준으로 살펴본', '관리 방법과 생활 속', '일상 속 적용 가이드',
    '체계적인 접근과', '알아두면 좋은 관리법', '케어 방법과 예방 전략',
    '베개 선택 가이드', '예방 체크리스트', '통증 발생 원인부터',
    '증상 개선이 필요하다면', '일상생활 불편 줄이는 전략에 대해',
  ],

  // SEO 필수 키워드
  requiredKeywords: [
    '정형외과', '통증', '디스크', '관절', '척추', '무릎', '어깨',
    '도수치료', '물리치료', '수술', '재활', '주사', '비수술',
  ],

  // 치료별 회복 타임라인 기준
  recoveryTimeline: {
    // 비수술 계열
    nonSurgery: {
      visit1: '치료 직후 — 진단·치료 계획·즉각 느낌',
      w1:     '1주일차 — 증상 변화 수치 (통증 10→7점 등)',
      m1:     '1개월차 — 일상 동작 회복 (계단·보행·팔 올리기)',
      m3:     '3개월차 — 최종 결과·활동 복귀',
    },
    // 수술 계열
    surgery: {
      day0:   '수술 당일 — 마취·수술 시간·통증 조절',
      w1:     '1주일차 — 퇴원·보조기·재활 시작',
      m1:     '1개월차 — 관절 가동 범위 회복',
      m3:     '3개월차 — 근력 회복·일상 복귀',
      m6:     '6개월차 — 스포츠 복귀 여부',
    },
    // 주사·충격파 계열
    procedure: {
      visit1: '1회 직후 — 당일 느낌 (압통·뻐근함·즉각 효과)',
      visit3: '3회차 — 통증 변화 수치',
      visit5: '5회 완료 — 최종 결과',
      m3:     '3개월차 — 재발 여부·유지 효과',
    },
  },

  seoPassScore: 85,
  minTotalLength: 2000,
};

// ── 치료별 섹션 override ────────────────────────────────────
export const ORTHO_TREATMENT_OVERRIDES = {

  // 수술 케이스 — 타임라인 확장
  acl: {
    result: {
      description: '수술 당일·1주·1개월·3개월·6개월 재활 타임라인 + 스포츠 복귀 시점 명시',
      minLength: 380, maxLength: 480,
    },
  },
  fracture_rehab: {
    result: {
      description: '깁스 제거 직후→1주→1개월→3개월 가동 범위·근력 회복 타임라인',
      minLength: 350, maxLength: 450,
    },
  },
  meniscus: {
    result: {
      description: '수술 여부 분기: 보존치료면 1주·1개월·3개월 / 관절경 수술이면 수술 당일·1주·1개월·6개월',
      minLength: 320, maxLength: 420,
    },
  },

  // 주사·충격파 — 회차별 효과 타임라인
  shockwave_ortho: {
    result: {
      description: '충격파 1회·3회·5회 완료 후 통증 변화 (10→7→3점 등) + 비용 1회 포함',
      minLength: 280, maxLength: 380,
    },
  },
  prolotherapy: {
    result: {
      description: '프롤로·PRP 1회·3회·6회 후 인대 강화·통증 변화 타임라인 + 비용',
      minLength: 280, maxLength: 380,
    },
  },
  regenerten: {
    result: {
      description: '리제네텐 1회·3회 후 어깨 통증·운동 범위 변화 타임라인 + 비용',
      minLength: 280, maxLength: 360,
    },
  },

  // 도수치료 — 회차별 자세·통증 변화
  manual_therapy_ortho: {
    result: {
      description: '도수치료 3회·7회·10회·20회 완료 후 자세·통증·ROM 변화 + 실비 적용 비용',
      minLength: 300, maxLength: 400,
    },
  },

  // 척추·디스크 — 비수술 강조
  lumbar_disc: {
    concern: {
      description: '"앉아 있을수록 아파요" / 수술 두려움 / 비수술 탐색 심리 필수 포함',
    },
    reason: {
      description: '"수술만이 답일까요?" 고민 + 비수술 선택 이유 구체적으로',
    },
  },
  spinal_stenosis: {
    concern: {
      description: '"걷다가 쉬어야 해서" / 보행 장애 일상 묘사 + 수술 두려움',
    },
  },

  // 어깨 — 야간 통증 강조
  shoulder: {
    concern: {
      description: '야간 통증으로 잠 못 자는 상황 묘사 + 팔 올리기 제한 일상 묘사',
    },
    result: {
      description: '야간 통증 소실 시점 + 팔 운동 범위 개선 수치 (0→45→90도 등)',
      minLength: 300, maxLength: 400,
    },
  },

  // 족저근막염 — 아침 첫발 키워드 강조
  plantar_fasciitis: {
    concern: {
      description: '"아침 첫 발이 너무 아파서" 묘사 필수 + 출퇴근·보행 불편 일상 맥락',
    },
    result: {
      description: '아침 첫발 통증 감소 시점 + 충격파 회차별 변화 + 비용',
    },
  },
};
