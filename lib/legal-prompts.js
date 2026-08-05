// ============================================================
// legal-prompts.js — 법무사 프롬프트 (완전 독립 / 최소 동작 버전 v1)
// ⚠️ dental-prompts.js / clinic-prompts.js 절대 참조 금지
//
// 설계 목표 (v1 = 첫 생성본 출력용 최소 버전):
//   · 기관 화자(○○법무사사무소) 고정
//   · 정보형 — 제도/절차/서류/기한/주의사항/FAQ
//   · 후기형·성공사례·체험담·"덕분에 해결"·"만족" 전면 금지
//   · 의료 감정연출(망설임·무서움·회복) 전면 제거
//   · family/scene/gravity 등 치과 고급 로직 미이식 (v2 이후)
//
// ⚠️ export 시그니처는 dental과 동일하게 유지 (generateLegal 복제 안전):
//   · getLegalDirection(treatmentId) → {concern, effect, hook, keyword}
//   · buildLegalPrompt(section, treatment, region, options)
//   · LEGAL_DIRECTION
// ============================================================

// ============================================================
// 0. 화자 / 금지 / 공통 가이드
// ============================================================
const LEGAL_SPEAKER = '○○법무사사무소';

// 정보형 유지 — 절대 금지 표현
const LEGAL_FORBIDDEN = [
  // 후기/체험 (기관 화자가 의뢰인 후기 흉내 금지)
  '후기', '체험담', '덕분에', '덕분에 해결', '만족했', '만족스러', '추천합니다',
  '추천드립니다', '강추', '믿음이 갔', '친절하고', '해결됐습니다', '해결되었어요',
  // 광고형
  '최고의', '완벽한', '확실한 해결', '100% 해결', '걱정 끝', '믿고 맡기',
  // 의료 감정연출 잔재
  '무서웠', '떨리더', '망설였', '두려웠', '회복', '붓기', '통증',
  // AI 논문투
  '결론적으로', '따라서', '정리하면', '살펴보겠습니다', '체계적인 접근',
];

// 단정적 법률자문 위험 표현 (일반 정보 톤 유지 — 결과 보장 금지)
const LEGAL_RESULT_GUARANTEE_BAN = [
  '반드시 승인', '100% 면책', '무조건 가능', '확실히 해결', '반드시 면책',
  '보장합니다', '틀림없이',
];

function getLegalCommonGuide() {
  return `
[화자 규칙 ★ 최우선]
- 글쓴이는 법무사사무소(기관)다. 의뢰인 1인칭 후기 절대 금지.
- "${LEGAL_SPEAKER}입니다" / "안내드립니다" 톤. 정보 제공자 시점.
- "제가 받아봤더니" "저는 만족" 같은 개인 체험 서술 금지.

[정보형 규칙]
- 제도·절차·준비서류·기한·주의사항·FAQ 중심으로 서술.
- 성공사례·해결사례·의뢰인 체험담 일절 등장 금지.
- 비용은 '영향 요소'만 설명. 단정 금액·결과 보장 금지.

[톤]
- 과장·광고 표현 금지(최고/완벽/100%/걱정 끝).
- 일반적인 안내 수준으로. 단정적 법률 판단 대신 "일반적으로/경우에 따라" 사용.
- 기한 관련은 명확히 환기하되, 개별 사안은 확인이 필요하다는 여지 유지.`;
}

// ============================================================
// 1. DIRECTION 맵 — 업무별 방향 정의 (정보형 재해석)
// ------------------------------------------------------------
//   concern : 이 업무가 필요해지는 상황 (의뢰인 고통 아님 — 객관 상황)
//   effect  : 이 절차로 정리되는 것 (결과 보장 아님 — 절차의 목적)
//   hook    : 첫 문장 정보형 도입 (후기형 금지)
//   keyword : 대표 SEO 키워드
//   ⚠️ id는 legal-data.js / legal-playConfig override와 일치
// ============================================================
const LEGAL_DIRECTION = {
  inheritance_registration: {
    concern: "부모님 명의 부동산을 상속인 앞으로 이전해야 하고 취득세 기한도 챙겨야 해서",
    effect:  "상속 부동산 명의 이전, 기한 내 취득세 신고 정리, 상속인 협의 정리",
    hook:    "상속등기는 언제까지, 어떤 서류로 진행해야 하는지부터 정리가 필요합니다",
    keyword: "상속등기",
  },
  gift_registration: {
    concern: "생전에 자녀에게 부동산을 이전하면서 증여세 신고 시점도 맞춰야 해서",
    effect:  "부동산 증여 명의 이전, 증여세 신고와 등기 순서 정리",
    hook:    "증여등기는 어떤 서류가 필요하고 증여세 신고와 어떻게 연결되는지부터 봅니다",
    keyword: "증여등기",
  },
  corporation_establish: {
    concern: "개인사업에서 법인 전환을 검토하며 정관·자본금·임원 구성을 정리해야 해서",
    effect:  "법인 설립등기, 정관·자본금·임원 구성 정리, 사업자등록 연계",
    hook:    "법인설립은 상호·목적 확정부터 설립등기까지 순서대로 짚어볼 필요가 있습니다",
    keyword: "법인설립",
  },
  corporation_change: {
    concern: "임원 임기 만료·교체로 변경등기 기한이 임박해서",
    effect:  "임원 변경등기, 등기 기한 준수, 과태료 예방",
    hook:    "임원변경등기는 기한이 정해져 있어, 발생 시점부터 일정 관리가 중요합니다",
    keyword: "임원변경등기",
  },
  realestate_registration: {
    concern: "부동산 매매·대출에 따라 소유권 이전·근저당 설정 등기가 필요해서",
    effect:  "소유권 이전·권리 설정 등기, 잔금일 동시이행 정리",
    hook:    "부동산등기는 잔금일에 맞춰 서류를 정확히 갖추는 것이 핵심입니다",
    keyword: "부동산등기",
  },
  inheritance_renounce: {
    concern: "상속재산보다 채무가 많아 상속 자체를 포기해야 하고 기한도 임박해서",
    effect:  "상속포기 신고, 채무 승계 차단, 기한 내 절차 정리",
    hook:    "상속포기는 기한이 정해져 있어, 상속을 안 날부터의 일정 확인이 먼저입니다",
    keyword: "상속포기",
  },
  limited_acceptance: {
    concern: "상속재산과 채무 규모가 불분명해 한도 내에서만 변제하려고 해서",
    effect:  "한정승인 신고, 상속재산목록 정리, 한도 내 청산절차 안내",
    hook:    "한정승인은 재산목록 작성과 기한이 핵심이라, 절차부터 정리해보겠습니다",
    keyword: "한정승인",
  },
  rehab: {
    concern: "소득은 있으나 채무 상환이 어려워 변제 후 채무 조정을 검토해서",
    effect:  "개인회생 신청, 변제계획 수립, 단계별 절차 안내",
    hook:    "개인회생은 신청 자격과 절차 단계부터 확인이 필요한 제도입니다",
    keyword: "개인회생",
  },
  bankruptcy: {
    concern: "변제 능력이 없어 파산선고와 면책을 함께 검토해야 해서",
    effect:  "파산·면책 신청, 절차 단계 안내, 면책 불허 사유 사전 점검",
    hook:    "파산면책은 신청 요건과 절차 단계부터 차근히 살펴볼 필요가 있습니다",
    keyword: "파산면책",
  },
  corporate_register: {
    concern: "본점이전·목적변경·자본금변경 등 법인 변동으로 변경등기가 필요해서",
    effect:  "법인 변경등기, 등기 기한 준수, 의사록·정관변경 정리",
    hook:    "법인등기 변경은 사안별 필요 서류와 기한부터 정리하는 것이 좋습니다",
    keyword: "법인등기",
  },
};

export function getLegalDirection(treatmentId) {
  return LEGAL_DIRECTION[treatmentId] || {
    concern: "관련 등기·신청 절차를 정확히 진행해야 해서",
    effect:  "절차·서류·기한 정리",
    hook:    "이 절차가 무엇이고 어떤 서류·기한이 필요한지부터 정리합니다",
    keyword: "법무사",
  };
}

// ============================================================
// 2. 섹션별 프롬프트 빌더
// ------------------------------------------------------------
//   buildLegalPrompt(section, treatment, region, options)
//   · section: playConfig key (concern/situation/consult/reason/result/closing)
//   · 각 섹션을 정보형으로 서술하도록 지시
// ============================================================

// 섹션 key → 정보형 역할 매핑 (playConfig label과 정합)
const SECTION_ROLE = {
  concern:   '【상황】이 업무가 필요해지는 일반적 상황을 객관적으로 설명. 의뢰인 후기 아님.',
  situation: '【제도】해당 절차가 법적으로 무엇인지, 왜 필요한지 제도 차원에서 설명.',
  consult:   '【준비서류】필요 서류 목록·발급처·자주 누락하는 서류를 안내. 체크리스트 형태 권장.',
  reason:    '【비용·판단요소】비용에 영향을 주는 요소와 직접 진행/위임 판단 시 고려사항. 금액 단정 금지.',
  result:    '【진행절차】접수→심사→보정→완료 등 절차 순서와 단계별 소요 기간 안내. 의료 회복 개념 절대 금지.',
  closing:   '【마무리】기한 환기 + 사무소 안내(기관 화자) + 문의 유도. "추천/만족" 금지.',
};

// 섹션 분량 fallback (playConfig 미전달 시 사용)
const LEGAL_SECTION_LENGTH_FALLBACK = {
  concern:   { min: 200, max: 300 },
  situation: { min: 200, max: 300 },
  consult:   { min: 250, max: 350 },
  reason:    { min: 200, max: 300 },
  result:    { min: 300, max: 400 },
  closing:   { min: 200, max: 250 },
};

export function buildLegalPrompt(section, treatment, region, options = {}) {
  const dir = getLegalDirection(treatment.id);
  const role = SECTION_ROLE[section] || '【본문】정보형으로 해당 업무를 설명.';
  const sectionMeta = (LEGAL_SECTION_LENGTH_FALLBACK[section] || { min: 200, max: 350 });

  // 업무별 보조 정보 (data.js에서 전달)
  const notes      = treatment.operationNotes || '';
  const flow       = treatment.emotionFlow || '';     // 법무사에선 '절차 흐름'
  const compareKey = treatment.compareWith || '';
  const recommend  = Array.isArray(treatment.recommend) ? treatment.recommend.join(' / ') : '';
  const situations = Array.isArray(treatment.pains) ? treatment.pains.join(' / ') : '';

  const fullKeyword = `${region} ${dir.keyword}`;

  return `${getLegalCommonGuide()}

[이번 섹션 역할]
${role}

[업무 정보]
- 업무명: ${treatment.name}
- 대표 키워드: ${dir.keyword}
- 복합 키워드(지역+업무): "${fullKeyword}" — 본문에 1~2회 자연스럽게 포함
- 이 업무가 필요한 상황: ${situations}
- 해당되는 경우: ${recommend}
- 절차/기한 메모: ${notes}
- 절차 흐름: ${flow}
- 비교 대상(참고): ${compareKey}

[서술 방향]
- concern(상황)에 해당하면: ${dir.concern} — 이런 상황을 객관적으로 설명.
- 첫 문장 도입(필요 시): ${dir.hook}
- 이 절차로 정리되는 것: ${dir.effect}

[분량]
- ${sectionMeta.min}~${sectionMeta.max}자.

[금지]
- 후기/체험담/성공사례/의뢰인 1인칭 금지.
- 결과·면책·승인 보장 표현 금지(${LEGAL_RESULT_GUARANTEE_BAN.slice(0, 4).join(' / ')} 등).
- 의료 회복(회복/붓기/통증) 개념 금지.
- 광고 표현(${LEGAL_FORBIDDEN.slice(0, 6).join(' / ')} 등) 금지.

위 규칙을 지켜 "${treatment.name}" 글의 [${section}] 섹션 본문만 작성하세요.
머리말·제목·해시태그 없이 본문 문단만 출력합니다.`;
}

// ============================================================
// 3. export
// ============================================================
export { LEGAL_DIRECTION, LEGAL_SPEAKER, LEGAL_FORBIDDEN };
