// ============================================================
// legal-playConfig.js — 법무사 섹션 구조
// ⚠️ dental / clinic / lawyer playConfig 절대 참조 금지 (업종 narrative 독립)
//
// [세션42][SPINE7-LEGAL] V2 = LEGAL_FLOW (7섹션 전문직 Spine · B안)
//   concern / firstMove / deadline / documents / cost / process / closing
//
//   설계 근거(실측):
//     · V1 6섹션은 dental 키(concern/situation/consult/reason/result/closing)를 재활용하면서
//       consult를 '준비서류'로, result를 '진행절차'로 재해석해 썼다.
//       → 키 이름과 실제 역할이 어긋난 상태 = 섹션 역할 미분리의 흔적.
//       변호사 세션41 실측: 저품질의 원인은 프롬프트 문구가 아니라 섹션 역할 미분리였다.
//     · 법무사 검색의도 3축 = 언제까지(deadline) / 무슨 서류(documents) / 얼마(cost).
//     · mistake(변호사 전용) 미이식 — 법무사는 분쟁 당사자가 아니라 절차 수행자.
//     · consult 제거 — 기관 화자 + 절차업무에서 '상담 대화체'는 부자연.
//
//   ⚠️ LEGAL_FLOW_ENGINE(V1 6섹션)은 DEAD CODE로 보존한다.
//      이유: 롤백 대비 + 타 참조 잔존 시 즉시 파손 방지. 신규 코드는 참조 금지.
// ============================================================

/**
 * [V2 · 현행] 법무사 7섹션 Spine
 *   title: "" 이면 소제목 미부여 (concern · closing)
 *   photo: 사진 슬롯 alt. null이면 사진 미삽입 (기본 5장 정책)
 */
export const LEGAL_FLOW = [
  {
    key: 'concern',
    title: '',                       // 소제목 없음 — 상황문으로 즉시 시작
    order: 1,
    role: '지금 상황. 사실 1 + 미정 1. 2문장. 제도·기한·서류·비용·절차 금지',
    minLength: 90,
    maxLength: 170,   // [세션42-2] 압축 — 사례 나열로 시작이 늘어지던 실측 대응
    photo: '상담 안내',
  },
  {
    key: 'firstMove',
    title: '먼저 확인할 것',
    order: 2,
    role: '입장 분기 + 무엇부터 확정하나. 판단 결론만(설명 금지). 기한숫자·서류목록·비용·절차·홍보 금지',
    minLength: 180,
    maxLength: 280,   // [세션42-3] 압축 — 설명 3겹 장문화 실측 대응
    photo: '기준 안내',
  },
  {
    key: 'deadline',
    title: '기한을 놓치면',           // ★ 법무사 신설 (검색의도 1축)
    order: 3,
    role: '기산점 + 기한 + 놓쳤을 때 벌어지는 일. 서류·비용·절차 금지',
    minLength: 280,
    maxLength: 420,
    photo: '기한 안내',
  },
  {
    key: 'documents',
    title: '준비해야 할 서류',        // 검색의도 2축
    order: 4,
    role: '목록만. 발급처 + 왜 필요한지. 자주 빠뜨리는 서류 1개 이상. 기한·비용·절차 금지',
    minLength: 250,
    maxLength: 380,
    photo: '자료 안내',
  },
  {
    key: 'cost',
    title: '비용을 좌우하는 것',      // ★ 법무사 신설 (검색의도 3축)
    order: 5,
    role: '공과금 vs 사무소 보수 구분 + 영향요소만. ⚠️ 금액·요율 수치 단정 금지',
    minLength: 170,
    maxLength: 260,   // [세션42-2] 압축 — 설명체 장문화 실측 대응
    photo: null,                     // 사진 미삽입 (기본 5장 정책)
  },
  {
    key: 'process',
    title: '이후 진행 흐름',
    order: 6,
    role: '3~4문장. 접수→검토→보정→완료. 완료 시 무엇을 받는지까지. 상담안내 금지(closing 소관)',
    minLength: 150,
    maxLength: 280,   // [세션42-2] 보강 — process가 짧아 closing과 붙어 보이던 실측 대응
    photo: null,                     // 사진 미삽입
  },
  {
    key: 'closing',
    title: '',                       // 소제목 없음
    order: 7,
    role: '업무별 마무리 1문장 + 상담 안내 1문장. 총 2문장. 재요약·자기지시 종결 금지',
    minLength: 60,
    maxLength: 120,   // [세션42-4] 압축 — 3절 나열로 여운이 흐려지던 실측 대응
    photo: null,
  },
];

// 사진 슬롯 = 5장 (concern · firstMove · deadline · documents · closing)
// cost · process = null. 정책 확정: 기본 5장.

// ============================================================
// 금지/필수 키워드 (V1 계승 — 핸들러 QC에서 사용)
// ============================================================
export const LEGAL_BLOCK_KEYWORDS = [
  // 의료 업종 침투 방지
  '임플란트', '교정', '스케일링', '신경치료', '충치', '잇몸', '크라운', '라미네이트',
  '리프팅', '주름', '필러', '보톡스', '울쎄라', '성형', '피부과', '지방흡입',
  '시술', '회복기간', '붓기', '통증', '마취',
  // 후기/체험형 차단 (정보형 유지)
  '후기', '체험담', '덕분에', '만족했', '추천합니다', '강추', '믿음이 갔',
  // 유치원·낚시 차단
  '교실', '선생님', '원생', '낚싯대', '포인트', '조과',
];

export const LEGAL_REQUIRED_KEYWORDS = [
  '법무사', '등기', '신청', '상속', '증여', '법인', '회생', '파산',
  '한정승인', '상속포기', '임원변경', '서류',
];

// ============================================================
// ⚠️ DEAD CODE — V1 6섹션 (롤백 대비 보존 / 신규 참조 금지)
//    [세션42] LEGAL_FLOW(7섹션)로 대체됨. 핸들러는 LEGAL_FLOW만 참조한다.
// ============================================================
export const LEGAL_FLOW_ENGINE = {
  industry: 'legal',
  _deprecated: '[세션42] V2 LEGAL_FLOW로 대체. 롤백 전용 보존.',
  sections: [
    { key: 'concern',   label: '상황',          order: 1, required: true, minLength: 200, maxLength: 300 },
    { key: 'situation', label: '제도',          order: 2, required: true, minLength: 200, maxLength: 300 },
    { key: 'consult',   label: '준비서류',      order: 3, required: true, minLength: 250, maxLength: 350 },
    { key: 'reason',    label: '비용·판단요소', order: 4, required: true, minLength: 200, maxLength: 300 },
    { key: 'result',    label: '진행절차',      order: 5, required: true, minLength: 300, maxLength: 400 },
    { key: 'closing',   label: '마무리',        order: 6, required: true, minLength: 200, maxLength: 250 },
  ],
  blockKeywords: LEGAL_BLOCK_KEYWORDS,
  requiredKeywords: LEGAL_REQUIRED_KEYWORDS,
  seoPassScore: 85,
  minTotalLength: 2000,
};

// ⚠️ DEAD CODE — V1 override (LEGAL_FLOW는 업무별 override 미사용)
export const LEGAL_TREATMENT_OVERRIDES = {
  _deprecated: '[세션42] V2 미사용. 업무별 차이는 legal-v2-data.js 재료로 흡수.',
};
