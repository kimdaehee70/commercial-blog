// ╔══════════════════════════════════════════════════════════╗
// ║ gastro-v2-playConfig.js — 소화기내과 V2 Purpose 7섹션 FLOW ║
// ║ ★ 4섹션(treatmentDecision) = decisionAxis 분기 지점        ║
// ║   exam(6종)    : 검사 선택 기준                            ║
// ║   disease(16종): 원인확인→검사→약물→시술→(수술은 위임)     ║
// ║ ⚠ 관측 전. FREEZE 아님. v1 playConfig 무수정(A/B 보존).   ║
// ╚══════════════════════════════════════════════════════════╝

export const GASTRO_V2_FLOW_ENGINE = {
  industry: 'gastro',
  version: 'v2-purpose',

  sections: [
    { key: 'concern',           label: '지금 이런 상황인가요?',                minLength: 120, maxLength: 180 },
    { key: 'visitTrigger',      label: '이럴 때 진료를 고려해볼 수 있습니다',   minLength: 180, maxLength: 250 },
    { key: 'examination',       label: '진료에서는 무엇을 확인하나요?',         minLength: 200, maxLength: 300 },
    { key: 'treatmentDecision', label: '검사·치료는 어떤 기준으로 결정되나요?', minLength: 180, maxLength: 260 }, // ★ 핵심 축
    { key: 'checkPoint',        label: '병원 선택 시 확인할 점',               minLength: 200, maxLength: 300 },
    { key: 'sceneVisit',        label: '진료실과 검사실에서 확인하는 과정',     minLength: 150, maxLength: 250 },
    { key: 'closing',           label: '마무리',                              minLength: 100, maxLength: 150 },
  ],

  // ── 오염 차단 토큰 ──
  blockKeywords: [
    // 타 업종
    '한방', '한의원', '침 치료', '추나', '약침', '한약',
    '임플란트', '교정', '스케일링',
    '여드름', '기미', '보톡스', '필러', '리프팅', '쌍꺼풀',
    '포경', '전립선',
    '소아과', '어린이집',
    // 수술 상세 이식 차단 (소화기내과 = 내과. 외과 수술은 위임 수준만)
    '절개', '전신마취', '개복', '봉합', '수술 방법', '수술 과정', '입원 기간',
    // 후기형 잔재 차단 (v1 = 1인칭 후기형 → V2는 정보형)
    // ⚠ 1인칭 대명사("제가/저는/저도")는 여기 등록 금지 — "절제가/배제가/완하제가" 등
    //    정상 어절과 substring 충돌. 1인칭 검출은 핸들러의 정규식 QC(FIRST_PERSON_RE)가 담당.
    '했어요', '더라고요', '거든요', '원장님이', '저희',
    // 광고·단정
    '최신 장비', '최고 사양', '잘하는 곳', '무통', '완치됩니다', '재발하지 않습니다',
    '강력 추천', '꼭 받으세요', '정상입니다', '이상 없습니다', '암입니다', '진단됩니다',
    // AI 포화
    '정리하면', '결론적으로', '따라서', '체계적인', '살펴보겠습니다',
  ],

  minTotalLength: 1800,
};

export default GASTRO_V2_FLOW_ENGINE;
