// ============================================================
// lib/tax-playConfig.js — 세무사 섹션 구조
// ⚠️ legal / lawyer / funeral playConfig 절대 참조 금지 (업종 narrative 독립)
//
// [세션43][SPINE7-TAX] V2 = TAX_FLOW (7섹션 전문직 Spine)
//   concern / firstMove / deadline / documents / savings / process / closing
//
//   설계 근거(실측):
//     · tax V1은 funeral 복사베이스 + 단일 GPT 호출형이었다.
//       TAX_PLAY_CONFIG(5섹션)는 파일에 있었으나 핸들러가 참조하지 않는 DEAD CODE였다.
//       → legal V1의 병리('섹션 키와 역할의 불일치')보다 앞단계.
//         tax는 애초에 섹션 역할이라는 것이 존재하지 않았다. GPT가 자유 서술했고,
//         정보블럭은 본문 끝에 덤프, 사진은 문단 인덱스 홀수마다 기계 삽입되었다.
//     · 세무사 검색의도 3축 = 언제까지(deadline) / 무슨 자료(documents) / 무엇에 따라 달라지나(savings).
//     · ★ cost → savings 교체 = legal 대비 유일한 축 변경.
//       법무사는 "비용이 얼마나 드나", 세무사는 "세금을 얼마나 줄이나"가 검색의도다.
//       수임료·기장료는 별도 섹션 불요 — closing에서 '자료 준비 정도에 따라' 수준만.
//     · mistake(변호사 전용) 미이식 · consult(대화체) 미이식 — legal과 동일 판단.
//
//   ⚠️ TAX_PLAY_CONFIG(V1 5섹션)는 DEAD CODE로 보존한다.
//      이유: 롤백 대비 + 타 참조 잔존 시 즉시 파손 방지. 신규 코드는 참조 금지.
// ============================================================

/**
 * [V2 · 현행] 세무사 7섹션 Spine
 *   title: "" 이면 소제목 미부여 (concern · closing)
 *   photo: 사진 슬롯 alt. null이면 사진 미삽입 (기본 5장 정책)
 */
export const TAX_FLOW = [
  {
    key: 'concern',
    title: '',                       // 소제목 없음 — 상황문으로 즉시 시작
    order: 1,
    role: '지금 상황. 사실 1 + 미정 1. 2문장. 제도·기한·자료·세액·절차 금지',
    minLength: 90,
    maxLength: 170,
    photo: '상담 안내',
  },
  {
    key: 'firstMove',
    title: '먼저 확인할 것',
    order: 2,
    role: '입장 분기 + 무엇부터 확정하나. 판단 결론만(설명 금지). 기한숫자·자료목록·세액·절차·홍보 금지',
    minLength: 180,
    maxLength: 280,
    photo: '기준 안내',
  },
  {
    key: 'deadline',
    title: '기한을 놓치면',           // 검색의도 1축
    order: 3,
    // ★ [세션43-2][TAX-AXIS] 축 분기 섹션.
    //   filing   = 기산점 + 신고기한 + 놓치면(가산세)
    //   managing = ★ 신고기한 없음. 시작 시점 · 정리 주기 · 보관 의무로 재정의.
    //     실측: "세무기장의 신고 기한은 사업 개시일을 기산점으로 합니다" — 없는 기한을 생성했다.
    role: '[filing] 기산점 + 신고기한 + 놓치면 / [managing] 시작 시점 + 주기 + 보관 + 안 하면. 자료·세액·절차 금지. ★ 3~4문장 상한',
    minLength: 260,
    maxLength: 380,   // [세션43] legal 실측(deadline 과길이) 선반영 — 420 → 380
    photo: '기한 안내',
  },
  {
    key: 'documents',
    title: '준비해야 할 자료',        // 검색의도 2축
    order: 4,
    role: '목록만. 발급처 + 왜 필요한지. 자주 빠뜨리는 자료 1개 이상(★ 목록 밖 설명문). 기한·세액·절차 금지',
    minLength: 250,
    maxLength: 380,
    photo: '자료 안내',
  },
  {
    key: 'savings',
    title: '세금을 좌우하는 것',      // ★ 검색의도 3축 (legal cost 대체)
    order: 5,
    role: '요건·판단기준만. ⚠️ 절세·환급 결과 단정 금지 / 금액·세율·공제한도 수치 금지',
    minLength: 170,
    maxLength: 260,
    photo: null,                     // 사진 미삽입 (기본 5장 정책)
  },
  {
    key: 'process',
    title: '이후 진행 흐름',
    order: 6,
    // ★ [세션43-2][TAX-AXIS] 축 분기 섹션 + 재정의.
    //   실측 결함: V1 잔존으로 '세무서 행정 처리 흐름'(접수→검토→보정→납부고지)이 생성됐다.
    //     그것은 관청의 일이지 신고를 준비하는 쪽의 흐름이 아니다.
    //   filing   = 자료 확인 → 공제 검토 → 신고서 제출 → 납부 → 보관
    //   managing = 증빙 수집 → 장부 작성 → 월별 정리 → 결산 → 신고 연계
    role: '[filing] 실제 신고 준비 흐름 / [managing] 장부 관리 흐름. ★ 세무서 행정처리 나열 금지. 합니다체 통일. 상담안내 금지(closing 소관)',
    minLength: 150,
    maxLength: 280,
    photo: null,                     // 사진 미삽입
  },
  {
    key: 'closing',
    title: '',                       // 소제목 없음
    order: 7,
    role: '주제별 마무리 1문장 + 상담 안내 1문장. 총 2문장. 재요약·자기지시 종결·절세 약속 금지',
    minLength: 60,
    maxLength: 120,
    photo: '사무소 안내',
  },
];

// 사진 슬롯 = 5장 (concern · firstMove · deadline · documents · closing)
// savings · process = null. 정책 확정: 기본 5장 (legal 동형).

// ============================================================
// 금지/필수 키워드 (핸들러 QC에서 사용)
// ============================================================
export const TAX_BLOCK_KEYWORDS = [
  // 의료 업종 침투 방지
  '임플란트', '교정', '스케일링', '신경치료', '충치', '잇몸',
  '리프팅', '주름', '필러', '보톡스', '성형', '피부과',
  '시술', '회복기간', '붓기', '통증', '마취',
  // 후기/체험형 차단 (정보형 유지)
  '후기', '체험담', '덕분에', '만족했', '추천합니다', '강추', '믿음이 갔',
  // ★ 절세·환급 단정 (세무사법)
  '세금 폭탄', '무조건 절세', '100% 환급', '전액 환급', '환급 보장', '세금 0원',
];

export const TAX_REQUIRED_KEYWORDS = [
  '세무사', '신고', '세금', '기한', '자료', '증빙',
  '종합소득세', '부가가치세', '기장', '상속', '증여', '양도', '사업자등록', '세무조사',
];

// ============================================================
// ⚠️ DEAD CODE — V1 5섹션 (롤백 대비 보존 / 신규 참조 금지)
//    [세션43] TAX_FLOW(7섹션)로 대체됨. 핸들러는 TAX_FLOW만 참조한다.
//    ★ V1 시점에도 이미 핸들러 미참조(DEAD)였다. 이중으로 죽은 코드.
// ============================================================
export const TAX_PLAY_CONFIG = {
  industry: "tax",
  _deprecated: '[세션43] V2 TAX_FLOW로 대체. 롤백 전용 보존.',
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    { key: "intro",     title: "검색자 고민 도입",   role: "막막함 공감",             minLength: 280, maxLength: 420 },
    { key: "procedure", title: "세목·신고 절차 안내", role: "신고 대상·기한·절차",     minLength: 380, maxLength: 560 },
    { key: "structure", title: "세액·공제 구조",     role: "계산 구조·공제 항목",     minLength: 360, maxLength: 540 },
    { key: "choice",    title: "판단·선택 기준",     role: "과세유형·기장 방식 선택", minLength: 320, maxLength: 480 },
    { key: "closing",   title: "상담 안내 마무리",   role: "짧게 마무리",             minLength: 280, maxLength: 420 },
  ],
};

export default TAX_PLAY_CONFIG;
