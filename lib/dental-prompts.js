// =============================================
// lib/dental-prompts.js
// 치과 프롬프트 빌더 v2.2
//
// 변경사항 (v2.2) — Phase A-4 (2026-05-28):
//   - buildFamilyBlock() 추가 — family 3-layer를 섹션별 프롬프트에 실제 주입
//     concern→start_anchor, situation/result→middle gravity, closing→closing grammar
//   - resolveDentalFamily 결과를 common에 연결 (family=null이면 기존 동작)
//   - implant + personal + 유효 familyId 일 때만 본문 분기. 그 외 전부 fallback.
//
// 변경사항 (v2.1) — Phase A-1:
//   - DENTAL_FAMILY_SPEC 상수 추가 (implant 전용, 정의만 / 미사용)
//   - 3-layer 분리: start_anchor / middle gravity / closing grammar
//   - title_layer 추가 (4번째 보호막): anchor/grammar/residue/must_include/forbidden
//   - _common_forbidden_title 공통화 (제목 merge·SEO 회귀 차단)
//   - 빌더·라우팅 변경 없음 — 다음 phase(A-2~A-4)에서 연결
//
// 변경사항 (v2.0):
//   1. DIRECTION 맵 추가 — 시술별 concern·effect·hook·keyword 고정
//   2. mode 분기 — "personal" | "commercial"
//   3. AI 냄새 제거 가이드 강화
// =============================================

// ============================================================
// 0-FAMILY. DENTAL_FAMILY_SPEC — 3-layer family 분리 명세 (v0.2)
// ------------------------------------------------------------
// scope: implant 한 시술만. 다른 시술 확산 보류.
// 3-layer 보호 구조:
//   입구  = start_anchor       (검색 직전 행동/상황 진입점)
//   본진  = middle_gravity     (cognition 흐름 / 심층 내러티브 중력)
//   보호막 = closing_grammar   (merge 방지용 마무리 문법)
// ------------------------------------------------------------
// 사용처: 아직 없음. Phase A-2부터 titlePattern 매핑 → A-3 빌더 분기.
// 변경 시 영향 범위: 0 (참조 코드 없음).
// ============================================================

// ── 공통 closing 차단 (모든 family closing에서 금지) ──
const FAMILY_CLOSING_FORBIDDEN_COMMON = [
  '교훈 선언형: "~한 사람한테 해주고 싶은 말은"',
  '결론 요약형: "결국 가장 중요한 건" / "정리하면"',
  '광고 회귀형: "이 병원 추천드려요" / "잘했다 싶어요"',
  '보편 진리형: "건강이 최고예요" / "치아는 소중해요"',
  '권유 전환형: "고민하지 마시고 받으세요"',
  'family 외 anchor 등장 (예: 1c closing에 부부 카톡)',
];

// ── 공통 금지 제목 패턴 (모든 family 제목에서 금지) ──
// 제목 merge·SEO 회귀 차단. family별 title_layer.forbidden 위에 항상 적용.
const FAMILY_FORBIDDEN_TITLE_COMMON = [
  '광고형 제목: "{region} 임플란트 잘하는곳" / "추천 BEST" / "1위"',
  '정보 나열형: "임플란트 비용 총정리" / "완벽 가이드" / "A to Z"',
  '후기 2회 이상: "후기 ... 후기" (자동 제거 대상)',
  '공통 SEO 회귀형: "임플란트 후기" 단독 (anchor 없는 무색 제목)',
  '느낌표·과장: "대박" / "최고" / "역대급" / "!!!"',
  'family 외 anchor 혼입 (1a 제목에 견적 엑셀 등)',
];

const DENTAL_FAMILY_SPEC = {
  // ──────────────────────────────────────────────
  // 1a. 본인자각 — 식사 중 행동 정지
  // ──────────────────────────────────────────────
  '1a': {
    id: '1a',
    label: '본인자각',
    scope: 'implant',
    start_anchor: {
      type: '식사 중 행동 정지',
      hint: '씹다가 멈춤, 음식 한쪽으로 옮김, 젓가락 내려놓음 등 식사 중 미세 정지 동작',
    },
    middle_gravity: {
      flow: '무자각 → 자각 누적 → 인정',
      gist: '평소엔 의식 못하다 같은 동작 반복 누적 → 어느 순간 본인이 인정하는 흐름',
    },
    closing_grammar: {
      type: '정지·인정형',
      must_include: ['신체 동작', '시간 부사', 'start_anchor 회귀'],
      forbidden: ['감정 선언', '결정 선언'],
    },
    title_layer: {
      anchor: '식사 중 멈춤 순간',
      grammar: '본인 시점 자각형 — 짧은 행동 단서로 끊기',
      residue: '씹다 멈춘 한 장면',
      must_include: ['{region}', '식사/씹기 행동 단서'],
      forbidden: ['외부 인물 등장', '통증 점수', '견적·비용 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 1b. 외부지적 — 누군가의 말·지적
  // ──────────────────────────────────────────────
  '1b': {
    id: '1b',
    label: '외부지적',
    scope: 'implant',
    start_anchor: {
      type: '누군가의 말·지적',
      hint: '가족·동료·친구의 직접 발화 인용으로 시작. 본인 자각이 아닌 외부 트리거.',
    },
    middle_gravity: {
      flow: '부정 → 자기검증 → 외부 합의',
      gist: '처음엔 부인 → 본인이 거울/사진으로 확인 → 2인 이상 다른 사람도 같은 말',
    },
    closing_grammar: {
      type: '외부 시선형',
      must_include: ['직접 인용', '외부 다층(2인 이상)', '짧은 본인 해석'],
      forbidden: ['본인 결심 선언'],
    },
    title_layer: {
      anchor: '누군가의 한마디',
      grammar: '외부 발화 인용형 — 따옴표 또는 지적 단서로 시작',
      residue: '들었던 말 한 줄',
      must_include: ['{region}', '외부 인물·발화 단서'],
      forbidden: ['본인 자각 단서', '통증 점수', '견적·비용 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 1c. 누적통증 — 특정 통증 사건
  // ──────────────────────────────────────────────
  '1c': {
    id: '1c',
    label: '누적통증',
    scope: 'implant',
    start_anchor: {
      type: '특정 통증 사건',
      hint: '날짜·상황 명시된 통증 단일 사건. 막연한 불편 아님.',
    },
    middle_gravity: {
      flow: '회피 → 재발 → 간격 단축 → 강제',
      gist: '진통제로 버티다 → 재발 → 발생 주기 짧아짐 → 더는 못 미룸',
    },
    closing_grammar: {
      type: '점수 잔존형',
      must_include: ['통증 점수 추이', '시간 단위', '물리 잔존물(약/팩 등)'],
      forbidden: ['통증 종결 선언'],
    },
    title_layer: {
      anchor: '특정 통증 사건',
      grammar: '통증 사건 시점형 — 시간·강도 단서로 끊기',
      residue: '그날의 통증',
      must_include: ['{region}', '통증·시점 단서'],
      forbidden: ['외부 인물 등장', '견적·비용 단서', '부부·가족 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 2. 후기탐독 — 새벽 캡처 폴더
  // ──────────────────────────────────────────────
  '2': {
    id: '2',
    label: '후기탐독',
    scope: 'implant',
    start_anchor: {
      type: '새벽 캡처 폴더',
      hint: '심야 시간대 + 디지털 흔적(캡처/북마크/메모)이 시작점',
    },
    middle_gravity: {
      flow: '정보 과부하 → 압축 → 결정',
      gist: '수십 개 후기 → 본인 기준으로 압축 → 마지막 결정',
    },
    closing_grammar: {
      type: '폴더·메모 잔존형',
      must_include: ['캡처/메모/북마크 구체 숫자', '디지털 도구', '야간 흔적'],
      forbidden: ['정보 평가'],
    },
    title_layer: {
      anchor: '새벽 검색·캡처',
      grammar: '탐독 흔적형 — 시간대·디지털 단서로 시작',
      residue: '캡처 폴더',
      must_include: ['{region}', '검색·캡처·야간 단서'],
      forbidden: ['통증 점수', '외부 인물 등장', '비교 견적 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 3a. 보호자관찰 — 명절 식사 관찰
  // ──────────────────────────────────────────────
  '3a': {
    id: '3a',
    label: '보호자관찰',
    scope: 'implant',
    start_anchor: {
      type: '명절·가족 식사 관찰',
      hint: '본인이 아닌 부모/보호 대상자의 식사 장면 관찰',
    },
    middle_gravity: {
      flow: '관찰누적 → 부모부정 → 자식검색 → 동행 → 자력',
      gist: '관찰 → 부모는 괜찮다 부정 → 자식이 대신 검색 → 동행 → 결국 본인 자력 회복',
    },
    closing_grammar: {
      type: '관찰 회상형',
      must_include: ['보호 대상자 행동·말 인용', '자력성 회복 신호'],
      forbidden: ['자기평가'],
    },
    title_layer: {
      anchor: '부모님 식사 관찰',
      grammar: '보호자 관찰형 — 대상자·관찰 단서로 시작',
      residue: '명절 밥상 장면',
      must_include: ['{region}', '부모/보호 대상자 단서'],
      forbidden: ['본인 통증 단서', '견적·비용 단서', '부부 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 3b. 본인설득 — 가족 카톡·링크
  // ──────────────────────────────────────────────
  '3b': {
    id: '3b',
    label: '본인설득',
    scope: 'implant',
    start_anchor: {
      type: '가족 카톡·링크',
      hint: '가족이 보낸 카톡/링크가 진입점. 권유받는 입장.',
    },
    middle_gravity: {
      flow: '권유 → 미루기 → 증상악화 → 인정',
      gist: '가족 권유 → 미룸 → 증상 악화 → 결국 인정',
    },
    closing_grammar: {
      type: '자기대화 미완형',
      must_include: ['카톡', '현재진행형', '미래 불확실성'],
      forbidden: ['후회 정리'],
    },
    title_layer: {
      anchor: '가족이 보낸 링크',
      grammar: '권유 수신형 — 카톡·링크 단서로 시작, 미완 어조',
      residue: '읽씹한 카톡',
      must_include: ['{region}', '가족 권유·카톡·링크 단서'],
      forbidden: ['본인 자각 단독', '통증 점수', '견적 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 3c. 부부생활 — 일요일 저녁 부부대화
  // ──────────────────────────────────────────────
  '3c': {
    id: '3c',
    label: '부부생활',
    scope: 'implant',
    start_anchor: {
      type: '일요일 저녁 부부대화',
      hint: '주말 저녁 부부간 일상 대화 장면. 의논 톤.',
    },
    middle_gravity: {
      flow: '부부의논 → 가계영향 → 일정조율',
      gist: '부부가 같이 의논 → 가계/일정에 미치는 영향 검토 → 일정 조율',
    },
    closing_grammar: {
      type: '일상 운영형',
      must_include: ['부부 공동 도구(가계부/캘린더 등)', '다음 일정', '자녀 등장 허용'],
      forbidden: ['자기평가'],
    },
    title_layer: {
      anchor: '주말 저녁 부부대화',
      grammar: '부부 운영형 — 의논·일정 단서로 시작',
      residue: '같이 본 캘린더',
      must_include: ['{region}', '부부·의논·일정 단서'],
      forbidden: ['본인 단독 자각', '통증 점수', '외부 지적 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 4. 비용비교 — 견적 엑셀
  // ──────────────────────────────────────────────
  '4': {
    id: '4',
    label: '비용비교',
    scope: 'implant',
    start_anchor: {
      type: '견적 엑셀·표',
      hint: '비용 항목 정리/표/스프레드시트가 진입점',
    },
    middle_gravity: {
      flow: '항목분해 → 시나리오 → 합리화',
      gist: '비용 항목별 분해 → 여러 시나리오 비교 → 본인 기준 합리화',
    },
    closing_grammar: {
      type: '숫자 잔존형',
      must_include: ['견적 수치', '분할/잔액', '시나리오 흔적'],
      forbidden: ['비용 안도 선언'],
    },
    title_layer: {
      anchor: '견적 비교표',
      grammar: '비용 분석형 — 숫자·비교 단서로 시작',
      residue: '엑셀 견적표',
      must_include: ['{region}', '비용·견적·비교 단서'],
      forbidden: ['통증 점수', '외부 인물 등장', '부부·가족 감성 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 5. 직장인시간 — 점심시간 1시간
  // ──────────────────────────────────────────────
  '5': {
    id: '5',
    label: '직장인시간',
    scope: 'implant',
    start_anchor: {
      type: '점심시간 1시간',
      hint: '시간 제약 명시(점심/연차/반차)가 진입점',
    },
    middle_gravity: {
      flow: '시간제약 → 동선최적화 → 실행',
      gist: '제한된 시간 → 동선·교통 최적화 → 실행',
    },
    closing_grammar: {
      type: '다음 일정형',
      must_include: ['구체 시각', '동선', '다음 회차 예약'],
      forbidden: ['시간 평가'],
    },
    title_layer: {
      anchor: '점심시간 짬',
      grammar: '시간제약형 — 시각·동선 단서로 시작',
      residue: '다음 회차 예약',
      must_include: ['{region}', '시간 제약·직장·동선 단서'],
      forbidden: ['통증 점수', '외부 인물 등장', '견적 단서'],
    },
  },

  // ──────────────────────────────────────────────
  // 6. 회복일기 — D+30 회상
  // ──────────────────────────────────────────────
  '6': {
    id: '6',
    label: '회복일기',
    scope: 'implant',
    start_anchor: {
      type: 'D+N 회상 시점',
      hint: '시술 후 N일/주/개월 시점에서 회상 형식으로 진입',
    },
    middle_gravity: {
      flow: '결과 → 회상 → 재구성',
      gist: '현재 결과 → 과정 회상 → 의미 재구성',
    },
    closing_grammar: {
      type: 'D+N 노트형',
      must_include: ['D+N 표기', '일지 물리적 등장', '회상형 시제'],
      forbidden: ['회복 완료 선언'],
    },
    title_layer: {
      anchor: 'D+N 회상 시점',
      grammar: '회상 일기형 — D+N 시점 표기로 시작',
      residue: '회복 일지',
      must_include: ['{region}', 'D+N·회상·일지 단서'],
      forbidden: ['통증 점수 단독', '외부 인물 등장', '견적 단서'],
    },
  },

  // ── 공통 차단 (모든 family closing에서 금지) ──
  _common_closing_forbidden: FAMILY_CLOSING_FORBIDDEN_COMMON,

  // ── 공통 차단 (모든 family 제목에서 금지) ──
  _common_forbidden_title: FAMILY_FORBIDDEN_TITLE_COMMON,
};

export { DENTAL_FAMILY_SPEC };
// ============================================================
// /0-FAMILY
// ============================================================

// ============================================================
// 0. DIRECTION 맵 — 치과 시술별 방향 고정
// ============================================================
const DENTAL_DIRECTION = {
  implant: {
    concern: "치아가 빠져 씹기 불편하고 옆 치아까지 영향이 갈까 걱정되어서",
    effect:  "자연치아 기능 회복, 씹는 힘 복원, 옆 치아 보호",
    hook:    "음식 씹을 때마다 한쪽으로만 씹게 됐을 때",
    keyword: "임플란트",
  },
  laminate: {
    concern: "앞니 변색·모양이 신경 쓰여 사진·웃을 때 자신감이 없어서",
    effect:  "앞니 모양·색 개선, 자연스러운 미소, 짧은 치료 기간",
    hook:    "사진에서 앞니가 도드라져 보였을 때",
    keyword: "라미네이트",
  },
  braces: {
    concern: "치아 배열이 고르지 않은데 일반 교정은 외관·기간이 부담돼서",
    effect:  "투명한 교정 장치, 외관 부담 적음, 점진적 교정",
    hook:    "성인 교정인데 철 교정이 부담스러웠을 때",
    keyword: "투명교정",
  },
  rootcanal: {
    concern: "충치가 깊어 신경까지 침범했고 통증이 심해서",
    effect:  "치아 보존, 통증 제거, 자연치아 유지",
    hook:    "찬물·뜨거운 거 닿을 때마다 심한 통증이 왔을 때",
    keyword: "신경치료",
  },
  scaling: {
    concern: "잇몸 출혈·구취가 신경 쓰이고 정기 관리가 필요해서",
    effect:  "치석·플라크 제거, 잇몸 건강 회복, 구강 청결",
    hook:    "양치할 때마다 피가 나기 시작했을 때",
    keyword: "스케일링",
  },
  wisdom: {
    concern: "사랑니 때문에 잇몸이 자주 붓고 통증이 반복돼서",
    effect:  "사랑니 발치, 잇몸 통증 해소, 치아 정렬 보호",
    hook:    "사랑니 부위가 자꾸 붓고 음식이 끼었을 때",
    keyword: "사랑니발치",
  },
  zirconia: {
    concern: "신경치료 후 깨질 위험이 있어 단단한 보철이 필요해서",
    effect:  "치아 보호, 자연치아 색상, 내구성 강함",
    hook:    "신경치료 후 보철 종류를 고민하던 중",
    keyword: "지르코니아크라운",
  },
  whitening: {
    concern: "커피·차·흡연으로 치아 착색이 심해 누렇게 보여서",
    effect:  "치아 미백, 톤 개선, 자신감 있는 미소",
    hook:    "사진에서 치아가 누렇게 나왔을 때",
    keyword: "치아미백",
  },
  tmj: {
    concern: "턱에서 소리가 나거나 통증이 있어 일상이 불편해서",
    effect:  "턱관절 안정화, 통증 완화, 이갈이 개선",
    hook:    "입 벌릴 때마다 턱에서 소리가 나기 시작했을 때",
    keyword: "턱관절치료",
  },
  resin: {
    concern: "작은 충치가 생겨 빠르게 치료하고 싶어서",
    effect:  "충치 부위 제거, 자연치아 색 복원, 1회 치료",
    hook:    "정기 검진에서 작은 충치가 발견됐을 때",
    keyword: "레진치료",
  },
  inlay: {
    concern: "충치가 깊은데 크라운까지는 부담스러워서",
    effect:  "충치 제거 후 정밀 충전, 자연치아 보존, 내구성",
    hook:    "충치 치료 옵션을 비교하던 중",
    keyword: "인레이·온레이",
  },
  ceramic_crown: {
    concern: "앞니 보철이 필요한데 자연스러운 색상이 중요해서",
    effect:  "자연치아 색·모양, 심미성, 알레르기 적음",
    hook:    "앞니 크라운인데 티 나지 않게 하고 싶었을 때",
    keyword: "올세라믹크라운",
  },
  metal_braces: {
    concern: "치아 배열이 심하게 틀어져 본격적 교정이 필요해서",
    effect:  "확실한 교정 효과, 다양한 부정교합 대응",
    hook:    "투명교정으로는 어렵다는 진단을 받았을 때",
    keyword: "일반교정",
  },
  lingual_braces: {
    concern: "교정은 필요하지만 장치가 보이는 게 신경 쓰여서",
    effect:  "안쪽 부착, 외관 거의 안 보임, 효과적 교정",
    hook:    "직장인이라 외관 부담이 컸을 때",
    keyword: "설측교정",
  },
  periodontal: {
    concern: "잇몸이 자주 붓고 시리며 흔들리는 느낌이 있어서",
    effect:  "잇몸 염증 제거, 잇몸뼈 보호, 치아 보존",
    hook:    "정기검진에서 잇몸 상태가 안 좋다고 들었을 때",
    keyword: "잇몸치료",
  },
  denture: {
    concern: "치아가 여러 개 빠져 식사가 불편한데 임플란트는 부담돼서",
    effect:  "저작 기능 회복, 발음 개선, 임플란트 대비 합리적 비용",
    hook:    "기존 틀니가 헐거워져 자꾸 빠지기 시작했을 때",
    keyword: "틀니",
  },
};

export function getDentalDirection(treatmentId) {
  return DENTAL_DIRECTION[treatmentId] || {
    concern: "치아 고민이 깊어졌어서",
    effect:  "치아·구강 건강 개선",
    hook:    "거울 보다가 치아 상태가 신경 쓰였을 때",
    keyword: "치과 진료",
  };
}

// ============================================================
// 0-3. 감정 흔들림 강제 (실제 후기 느낌 핵심)
// ============================================================
function getEmotionWaverGuide() {
  return `
[감정 흔들림 필수 ★ 모범답안 차단]
실제 후기는 망설임·부담·무서움이 섞여 있어야 함.
아래 중 1개 이상 자연스럽게 포함:
- "비용 보고 한 번 망설였어요"
- "솔직히 좀 무서웠어요"
- "괜히 미루다가" / "차일피일 미뤘는데"
- "고민됐지만 일단 해보기로 했어요"
- "막상 받으려니 떨리더라고요"
- "결과가 어떨지 걱정됐어요"
→ "확신 생겼어요" / "마음에 들었어요" 같은 안정적 패턴만 쓰면 광고 냄새`;
}

// ============================================================
// 0-4. 현실 행동 디테일 강제 (상단 유지력 핵심)
// ============================================================
function getActionDetailGuide(sectionKey) {
  if (sectionKey === 'situation') {
    return `
[현실 행동 디테일 필수 ★ 사람 글 느낌]
탐색 단계의 실제 행동 중 2개 이상 포함:
- 후기 캡처 / 후기 저장
- 가격 비교 메모
- 지도에서 거리 확인
- 야간진료·주말진료 여부 검색
- 지인에게 카톡으로 물어봄
- 후보 2~3곳 추려서 비교표 만듦`;
  }
  if (sectionKey === 'result') {
    return `
[회복 행동 디테일 필수 ★ 사람 글 느낌 핵심]
회복 과정의 실제 행동 중 3개 이상 포함:
- 죽·미음 먹음 / 부드러운 음식 위주
- 얼음찜질 / 냉찜질
- 반대편으로만 씹음
- 양치 조심스럽게 / 가글로 대체
- 빨대 사용 안 함 (혈전 빠질까봐)
- 진통제 먹음 / 처방약 챙겨 먹음
- 약속·운동 미룸
- 피맛 / 침에 피 섞임
→ 정리된 회복 묘사 ❌ / 구체적 행동·불편 ✅`;
  }
  return "";
}

// ============================================================
// 0-5. 병원 선택 이유 현실화
// ============================================================
function getRealReasonGuide() {
  return `
[병원 선택 이유 현실화 ★ 광고문구 차단]
"전문의", "꼼꼼", "세심", "신뢰" 같은 광고 표현 금지.
아래 현실적 이유 중 1~2개 사용:
- 집·회사에서 가까움 / 지하철역 근처
- 예약 잡기 편함 / 야간진료 있음 / 주말 진료
- 후기 수가 많음 / 최근 후기 있음
- 상담만 받아도 부담 없음
- 가격이 다른 데보다 합리적
- 주차 가능
→ 추상적 신뢰 표현 ❌ / 구체적 편의 ✅`;
}

// ============================================================
// 0-1. AI 냄새 제거 가이드
// ============================================================
function getAiSmellGuide() {
  return `
[AI 표현 금지 — 절대 사용 금지]
"드디어 결심하고" / "결국 선택하게 되었어요" / "마침내" / "비로소"
"마음이 편안해졌어요" / "믿음이 갔어요" / "친절하고 전문적이셔서"
"따뜻한 분위기" / "차분하고 따뜻한" / "안정감 있는 분위기"
"미소를 되찾았어요" / "자신감을 찾았어요" / "새로운 삶"
"기준으로 살펴본" / "관리 방법과 생활 속" / "예방 전략" / "체계적인 접근"
"결론적으로" / "따라서" / "이와 같이" / "정리하면"
"특히", "또한", "무엇보다" 연속 나열 금지

[병원 광고 패턴 금지 — 절대 사용 금지 ★ 상단 유지 핵심]
"확신이 생겼어요" / "확신했어요" / "신뢰감" / "세심함" / "꼼꼼" / "꼼꼼하게"
"좋은 선택" / "좋은 선택이 될 거예요" / "큰 매력" / "매력으로 다가왔"
"추천드려요" / "추천합니다" / "도움이 되었어요" / "만족스러웠어요"

[설명형 문장 금지 — 절대 사용 금지 ★ GPT 냄새 제거]
"~라는 점이 마음에 들었어요" / "~라는 점이 좋았어요"
"설명해 주셨어요" / "설명을 들으니" / "설명을 듣고 나니"
"~라는 생각이 들었어요" / "~생각이 들었답니다"
"마음에 들었어요" / "마음에 들었답니다"
→ 대체: 행동·결정 자체로 보여주기 ("그 자리에서 예약했어요", "다음날 다시 갔어요")

[독자 조언형 문장 금지 — 절대 사용 금지 ★ 의료광고 패턴]
"~분들께는 ~이 중요하다는 걸 느꼈답니다"
"~고민하시는 분들께"
"~하시는 분들이라면"
"정보 수집이 중요하다" / "신중하게 선택하셔야"
→ 후기는 본인 경험만, 독자에게 조언·권유 금지

→ 대체: 구체적 날짜·횟수·통증 수치·원장 직접 인용·실제 행동 묘사`;
}

// ============================================================
// 0-2. 키워드 밀도 + 조사 오류 가이드
// ============================================================
function getKwDensityGuide(name) {
  return `
[키워드 밀도] "${name}"는 이 섹션에서 최대 2~3회만 직접 표기.
나머지는 "이 치료", "치료", "그 시술"로 대체. 5회 이상 반복 금지.

[지역+시술명 결합 키워드 제한 ★ 광고 패턴 차단]
"강남 ${name}" / "{region} ${name}" 같은 결합 표현은 섹션당 최대 1회.
글 전체 기준 결합 표현 3회 이하 유지.
이미 한 번 썼다면 "이 치과", "여기", "근처 병원" 등으로 대체.

[조사 오류 금지]
"${name}" 뒤에 조사 직접 연결 시:
  ❌ "${name}을" → ✅ "이 치료를"
  ❌ "${name}는" → ✅ "이 치료는"
이중 공백 금지 ("그래서  받기로" → "그래서 이 치료를 받기로")`;
}

// ============================================================
// 동선 흐름 가이드 (FLOW_TIMELINE) — 상단 유지력 핵심 ★
//   "정보 나열" → "실제 하루 경험" 으로 전환
// ============================================================
function getFlowTimelineGuide(sectionKey, mode = "personal") {
  if (mode === "commercial") {
    if (sectionKey === "situation") {
      return `
[동선 흐름 — 치료 검토 단계 안내]
탐색 단계를 시간 순서로 정리:
  1단계: 증상·고민 자각 → 정보 검색 시작
  2단계: 후기·전문의 자격·접근성 비교
  3단계: 상담 가능 시간 확인 → 예약
- "처음 검색을 시작할 때는 ~", "다음 단계로는 ~", "최종적으로 ~" 같은 단계 연결어 사용`;
    }
    if (sectionKey === "consult") {
      return `
[동선 흐름 — 치료 단계 안내]
치료 진행을 시간 순서로 정리:
  1단계: 접수·대기 → 진료실 입장
  2단계: 문진·검사
  3단계: 검사 결과 설명 → 치료 방향 안내
  4단계: 질문 응대 → 치료 결정
- "처음에는 ~ 이후 ~ 마지막으로 ~" 단계 연결어 사용`;
    }
    return "";
  }

  // personal: 1인칭 시간 흐름 (실제 경험담 느낌)
  if (sectionKey === "situation") {
    return `
[동선 흐름 — 시간 순서로 자연스럽게 ★ 상단 유지 핵심]
검색·예약·도착까지 한 흐름으로 이어지게:
  ① 정보 검색·후기 비교
  ② 2~3곳 추려서 비교
  ③ 예약 결정

다음 표현 중 1~2개 자연스럽게 사용:
- "처음에는 그냥 검색만 했어요"
- "후기 몇 개 읽어보다가 후보를 좁혀봤어요"
- "예약하고 갔는데 생각보다 빨리 들어갔어요"
→ 정보 나열 ❌ / 시간 흐름 ✅`;
  }
  if (sectionKey === "consult") {
    return `
[동선 흐름 — 치료 당일 시간 순서 ★ 상단 유지 핵심]
도착 → 접수 → 대기 → 검사 → 상담 → 결정 흐름으로:
  ① 도착·접수
  ② 진료실 입장
  ③ 검사 진행
  ④ 결과 설명
  ⑤ 질문·답변
  ⑥ 결정

다음 흐름 표현 중 2~3개 자연스럽게 사용:
- "도착해서 접수하고 잠깐 기다렸어요"
- "먼저 X-ray부터 찍었어요"
- "검사 끝나고 결과 보면서 설명해 주셨어요"
- "설명 듣고 나서 받기로 했어요"
- "원장님이 '~' 라고 하시더라고요" (직접 인용 1회 필수)
→ 검사·상담을 따로따로 ❌ / 한 흐름으로 연결 ✅`;
  }
  if (sectionKey === "result") {
    return `
[시간 흐름 연결어 — 회복 단계 자연스럽게 이어가기]
- "그날 저녁에는 ~"
- "다음날 아침이 되니까 ~"
- "일주일쯤 지나고 보니 ~"
- "한 달이 다 되어갈 때쯤 ~"
→ "D+1" 같은 단순 라벨보다 자연스러운 시간 표현`;
  }
  return "";
}


// ============================================================
// 1. 메인 빌더 (mode 분기)
// ============================================================
export function buildDentalPrompt(section, treatment, region, options = {}) {
  const { mode = "personal" } = options;
  if (mode === "commercial") {
    return buildCommercialDentalPrompt(section, treatment, region, options);
  }
  return buildPersonalDentalPrompt(section, treatment, region, options);
}

// ============================================================
// A-3. family resolve helper (fallback 안전)
// ------------------------------------------------------------
// options.familyId → SPEC 조회. 다음 경우 모두 null 반환(=기존 동작):
//   - familyId 미전달
//   - implant 외 시술 (scope 제한)
//   - SPEC에 없는 id
// A-3 시점: 빌더가 받을 수만 있게 통로 확보. 실제 프롬프트 주입은 A-4.
// ============================================================
function resolveDentalFamily(treatment, options = {}) {
  const familyId = options.familyId;
  if (!familyId) return null;                         // 미전달 → fallback
  if (!treatment || treatment.id !== 'implant') return null; // implant만 (scope)
  const spec = DENTAL_FAMILY_SPEC[familyId];
  if (!spec || spec.scope !== 'implant') return null; // SPEC 없음 → fallback
  return spec;
}

// ============================================================
// A-4. family → 섹션별 프롬프트 블록 (3-layer 주입)
// ------------------------------------------------------------
//   섹션별로 필요한 layer만 주입:
//     concern   → start_anchor (입구) + middle gravity 도입
//     situation → middle gravity (본진 흐름)
//     result    → middle gravity 종반
//     closing   → closing_grammar (보호막)
//   family=null이면 빈 문자열 반환 → 기존 동작 100% 보존.
// ============================================================
// 안1: situation 섹션에서 family별 탐색 중력 강제 (문구만, regex 아님).
// 공통 situation 정의(family 무관)가 family를 덮어쓰지 못하게 막는 용도.
// '4'(비용비교) 키 없음 → 검색·비교가 본령이므로 미주입(기존 동작 유지).
const SITUATION_GRAVITY = {
  '1a': '【situation 본진】본인 자각의 연장선에서 직접 알아본 흐름으로. 검색 경유는 OK이나 비용 비교표로 흐르지 말 것.',
  '1b': '【situation 본진】지적받은 그 말이 찾아보게 만든 동기로 이어지게. 무색한 검색 나열 금지.',
  '3a': '【situation 본진·강제】탐색의 주체는 본인이 아니라 가족이다. "내가 검색했다/알아봤다"로 쓰지 말 것. "아버지가 알아보자고 하셔서" "가족이 같이 찾아보다가" "딸이 대신 검색해서"처럼 가족이 탐색을 끌고 가는 문장으로 전개. 검색어 직접 인용("○○ 잘하는 곳") 금지. 후보 2~3곳·비교표·화면 캡처·후기 저장 일절 등장 금지. 비용 망설임 묘사 금지.',
  '5':  '【situation 본진】시간 제약(점심 한 시간·퇴근 후·근처·야간진료)이 탐색 방식 자체를 규정하게. 빨리·근처 위주의 짧은 탐색으로. 여유로운 후기 정독·여러 곳 비교표 금지.',
  '6':  '【situation 본진·강제】지금 시점은 회복을 마친 뒤의 회상이다. 당시 탐색은 한두 문장 회고로만("그때 급하게 찾아봤었죠" 수준). 실시간 검색 장면·검색어 인용·비용 비교·후보 비교표 재현 금지. 탐색보다 당시 심경 회고에 비중.',
};

function buildFamilyBlock(family, sectionKey) {
  if (!family) return "";  // fallback: 주입 없음

  const sa = family.start_anchor || {};
  const mg = family.middle_gravity || {};
  const cg = family.closing_grammar || {};
  const commonForbidden = (DENTAL_FAMILY_SPEC._common_closing_forbidden || []);

  if (sectionKey === 'concern') {
    return `
[★ family 고정 — 입구(start_anchor) | family ${family.id} ${family.label}]
- 이 글의 시작 진입점: ${sa.type}
  (${sa.hint})
- 첫 문단은 반드시 위 진입점 장면에서 출발. 다른 family 진입점 혼용 절대 금지.
- 감정 중력 도입: ${mg.flow}
  → ${mg.gist}`;
  }

  if (sectionKey === 'situation') {
    // 안1: 해당 family 키가 있으면 situation 중력 지시문을 블록 '맨 앞'에 배치.
    // mg.flow(공통 흐름)가 비교·검색을 유도해도 family gravity가 먼저 읽히도록 우선순위 부여.
    // 키 없으면(4 등) gravity 빈 문자열 → 기존 동작 그대로.
    const gravity = SITUATION_GRAVITY[family.id] || "";
    return `
[★ family 고정 — 본진(middle gravity) | family ${family.id}]${gravity ? `\n- ${gravity}` : ""}
- 이 글의 인지 흐름: ${mg.flow}
  → ${mg.gist}
- 위 흐름의 중간 단계를 자연스럽게 전개. 흐름 순서 유지. 단, 위 family 지시와 충돌하면 family 지시를 우선한다.`;
  }

  if (sectionKey === 'result') {
    return `
[★ family 고정 — 본진 종반 | family ${family.id}]
- 인지 흐름의 후반부로 자연스럽게 수렴: ${mg.flow}
- 회복·결과 서술도 이 family 정서축(${family.label})을 유지.`;
  }

  if (sectionKey === 'closing') {
    return `
[★ family 고정 — 보호막(closing grammar) | family ${family.id} ${cg.type}]
- 마무리 필수 요소: ${(cg.must_include || []).join(' / ')}
- 마무리 금지: ${(cg.forbidden || []).join(' / ')}
- 공통 금지(모든 family): ${commonForbidden.join(' / ')}
- ⚠️ closing에 다른 family의 진입점·소재 등장 절대 금지 (merge 차단).`;
  }

  return "";  // consult / reason: family 블록 미주입 (기존 가이드 유지)
}

// ── personal 모드 ──
function buildPersonalDentalPrompt(section, treatment, region, options = {}) {
  const { name, pains = [], recommend = [], operationNotes = "", compareWith = "" } = treatment;
  const direction = getDentalDirection(treatment.id);

  // A-4: family 해석 → 섹션별 블록 주입 (family=null이면 빈 문자열, 기존 동작)
  const family = resolveDentalFamily(treatment, options);
  const familyBlock = buildFamilyBlock(family, section);

  const directionGuide = `
[시술 방향 고정]
- 고민: ${direction.concern}
- 변화: ${direction.effect}
- 후킹: ${direction.hook}`;

  const common = `${directionGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}${familyBlock}`;

  switch (section) {
    case 'concern':   return _personalConcern(name, region, pains, common);
    case 'situation': return _personalSituation(name, region, common, family);
    case 'consult':   return _personalConsult(name, region, compareWith, common);
    case 'reason':    return _personalReason(name, region, compareWith, common);
    case 'result':    return _personalResult(name, region, operationNotes, common);
    case 'closing':   return _personalClosing(name, region, recommend, common);
    default: throw new Error(`[dental-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function _personalConcern(name, region, pains, common) {
  return `
당신은 ${region} 거주 일반인입니다. ${name} 진료를 받아본 경험을 1인칭 블로그 후기로 작성합니다.
첫 번째 섹션을 작성하세요.

${common}
${getEmotionWaverGuide()}

[주제] ${name} 치료 전 고민과 불편함
[조건]
- 일상에서 겪는 구체적인 불편함을 1인칭 구어체로 작성
- 아래 고민 중 1~2개를 자연스럽게 녹여낼 것:
  ${pains.map((p, i) => `${i + 1}. ${p}`).join('\n  ')}
- 치아·구강과 관련된 묘사만 사용 (성형/피부 표현 금지)
- ★ "미루다가" / "차일피일" / "괜찮겠지 했는데" 같은 미룸 표현 1회 포함 권장
- 분량: 200~300자
- 말투: ~했어요, ~더라고요 (블로그 구어체)
`.trim();
}

function _personalSituation(name, region, common, family = null) {
  // C안(dental·personal 한정): family가 3a/6일 때만 비용비교형 고정 템플릿 3겹을 skip.
  //   - getFlowTimelineGuide/getActionDetailGuide의 situation 분기 = family4 흐름 강제 → 검색최소 family 오염원
  //   - family.id ∈ {3a, 6} → 비교 강제 제거 + family-적합 탐색 지시로 치환
  //   - 그 외(4·1a·1b·5·null 등) → 기존 동작 100% 보존(아래 else 경로)
  // regex 신규 ❌ / playConfig 무변경 / family4 무변경. 롤백 = 이 분기 제거 + caller 인자 제거.
  const fid = family && family.id;
  const isSearchMinimal = (fid === '3a' || fid === '6');

  if (isSearchMinimal) {
    const minimalGuide = (fid === '3a')
      ? `[탐색 묘사 — family 3a 보호자관찰형 ★ 이 family는 비교쇼핑이 아님]
- 탐색 주체는 본인이 아니라 가족. "내가 검색했다/비교했다"로 쓰지 말 것.
- "가족이 같이 알아보자고 해서" "딸이 대신 찾아봐 주고"처럼 가족이 탐색을 끌고 가는 흐름.
- 금지: 검색어 직접 인용("${region} ${name} 잘하는 곳"·"비용") / 후보 2~3곳 비교표 / 후기 캡처·저장 / 가격 비교 메모 / 비용 망설임 나열.`
      : `[탐색 묘사 — family 6 회복일기형 ★ 회상 시점, 실시간 검색 재현 금지]
- 지금은 회복을 마친 뒤 돌아보는 회상. 당시 탐색은 한두 문장 회고로만("그때 급하게 찾아봤었죠" 수준).
- 탐색보다 당시 심경 회고에 비중. 시간은 과거 회상 어조.
- 금지: 실시간 검색 장면 재현 / 검색어 직접 인용("${region} ${name} 잘하는 곳"·"비용") / 후보 2~3곳 비교표 / 가격 비교 / 후기 캡처·저장 나열.`;

    return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getEmotionWaverGuide()}
${minimalGuide}

[주제] ${name} 탐색 계기 (위 family 흐름을 우선)
[조건]
- ${region} 지역명 반드시 포함 (단, 결합 키워드 "${region} ${name}"은 섹션당 1회 이하)
- 위 family 지시와 충돌하는 검색·비교 묘사는 넣지 말 것
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
  }

  // 그 외 family(4·1a·1b·5·null) — 기존 동작 100% 보존
  return `
블로그 후기의 두 번째 섹션입니다.
${common}
${getFlowTimelineGuide('situation', 'personal')}
${getActionDetailGuide('situation')}
${getEmotionWaverGuide()}

[주제] ${name} 치과 탐색 계기와 검색 과정
[조건]
- 검색어 예시 포함: "${region} ${name} 잘하는 곳", "${name} 비용"
- 지인 추천 or 네이버 블로그 검색 등 실제적 탐색 경로 묘사
- ${region} 지역명 반드시 포함 (단, 결합 키워드 "${region} ${name}"은 섹션당 1회 이하)
- 2~3곳 비교 탐색 과정 언급
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
}

function _personalConsult(name, region, compareWith, common) {
  return `
블로그 후기의 세 번째 섹션입니다.
${common}
${getFlowTimelineGuide('consult', 'personal')}

[주제] ${region} 치과 상담 경험
[조건]
- 실제 환자 질문 1~2개를 대화체로 반드시 포함
  예: "원장님, ${name} 하면 얼마나 걸려요?" / "아프지 않나요?"
- 원장님 답변 직접 인용 1회: "원장님이 '~' 라고 하시더라고요"
- ${compareWith} 관련 질문 or 설명 포함
- 상담 분위기 묘사 금지 → 설명 내용 자체가 납득됐다는 식으로
- ★ 원장님 설명 인용은 1~2회만 (3회 이상 ❌)
- ★ "설명해 주셨어요" 반복 금지 → "그렇게 한다고 하시더라고요" 같은 변형 사용
- ★ 상담 후 결정 표현: "확신 생겼어요" ❌ / "그날 일정 잡았어요" "다음 주로 예약했어요" ✅
- 분량: 250~350자
- 말투: 블로그 구어체
`.trim();
}

function _personalReason(name, region, compareWith, common) {
  return `
블로그 후기의 네 번째 섹션입니다.
${common}
${getRealReasonGuide()}

[주제] ${name} 선택 이유
[조건]
- ${compareWith} 비교 후 최종 결정 과정 서술
- 단순 가격 비교가 아닌 '왜 이 치과, 이 시술인가' 구체적 이유
- ${region} 치과를 선택한 구체적 이유 1가지 이상 (집·회사 근처, 야간진료, 후기 많음 등 현실적 이유 우선)
- ★ "전문의가 직접" / "꼼꼼하게" / "세심함" / "신뢰" 표현 금지
- ★ "마음에 들었어요" / "확신했어요" 금지 → 결정 자체로 보여주기
- 분량: 200~300자
- 말투: 블로그 구어체
`.trim();
}

function _personalResult(name, region, operationNotes, common) {
  return `
블로그 후기의 다섯 번째 섹션입니다.
${common}
${getFlowTimelineGuide('result', 'personal')}
${getActionDetailGuide('result')}

[주제] ${name} 시술 후 회복·변화 타임라인
[조건]
- D+1 / D+7 / 1개월 / 3개월 형식으로 단계별 변화 서술
- 참고 정보: ${operationNotes}
- 통증·붓기·식사 제한 등 구체적 일상 변화 묘사
- 치아·구강 관련 회복 표현만 사용
- ★ 회복 행동 디테일 3개 이상 필수 (죽 / 얼음찜질 / 반대편 씹기 / 양치 조심 / 빨대 안 씀 / 약속 미룸 등)
- ★ 너무 깔끔한 회복 ❌ → 작은 불편(피맛·잠 설침·반대편 턱 뻐근함 등) 1개 이상 포함
- 분량: 300~400자
- 말투: 블로그 구어체
`.trim();
}

function _personalClosing(name, region, recommend, common) {
  return `
블로그 후기의 마지막 섹션입니다.
${common}

[주제] 마무리 및 추천 대상
[조건]
- 시술 전후 변화를 한 문장으로 담담하게 요약
- 아래 추천 대상 중 2개를 자연스럽게 언급:
  ${recommend.map((r, i) => `${i + 1}. ${r}`).join('\n  ')}
- ${region} + ${name} 키워드 자연스럽게 포함 (단, "${region} ${name}" 결합 표현은 1회만)
- "미소를 되찾았어요" / "새로운 삶" 드라마틱 마무리 금지
- ★ "좋은 선택이 될 거예요" / "추천드려요" / "도움이 될 거예요" / "만족하실 거예요" 금지
- ★ "~분들께는" / "~하시는 분들이라면" 같은 독자 조언형 문장 금지
- ★ 추천 대상은 본인 경험 기준으로만 ("저처럼 ~한 경우라면" 정도까지만 허용)
- 분량: 200~250자
- 말투: 블로그 구어체
`.trim();
}

// ============================================================
// 2. commercial 모드 (광고법 안전)
// ============================================================
// ============================================================
// [D-4-5b] storeFacts → 프롬프트 사실 블록
// ------------------------------------------------------------
//   입력 = consumeStoreProfile View의 promptBody 배열 [{slot,value,meta}].
//   역할 = 본문 '판단 보조 사실'. 하단 proVisitBlock(방문정보 출력)과 표현 차등 —
//          본문은 항목 나열이 아니라 "확인해볼 수 있는 기준"으로 소화하도록 지시.
//   빈 배열/미전달 → "" 반환 → 기존 프롬프트 100% 보존(부작용 0).
// ============================================================
const _SF_LABEL = { business_hours: "진료시간", transit: "대중교통 접근", parking_ops: "주차 운영" };
function buildStoreFactsBlock(storeFacts) {
  const list = Array.isArray(storeFacts) ? storeFacts : [];
  const lines = list
    .filter(it => it && it.slot && _SF_LABEL[it.slot] && String(it.value || "").trim())
    .map(it => `- ${_SF_LABEL[it.slot]}: ${String(it.value).trim()}`);
  if (lines.length === 0) return "";
  return `
[실제 운영 사실 — 아래 값만 사용. 없는 정보 생성 금지]
${lines.join("\n")}
[사용 규칙]
- 항목을 그대로 나열하지 말 것. 문장 흐름 안에서 '확인해볼 수 있는 기준'으로 자연 서술.
- 글 하단에 별도 안내 블록이 붙으므로 본문에서 같은 값을 반복 강조하지 말 것(1회만).
- 위 값에 없는 시간·주차·교통 정보를 추정해 쓰지 말 것.`;
}

function buildCommercialDentalPrompt(section, treatment, region, options = {}) {
  const { name, compareWith = "", operationNotes = "" } = treatment;
  // [D-4-5b] storeFacts 소비 — situation/consult 2섹션만. 그 외 섹션은 미주입(기존 동작).
  const storeFactsBlock = (section === "situation" || section === "consult")
    ? buildStoreFactsBlock(options.storeFacts)
    : "";
  const direction = getDentalDirection(treatment.id);

  const adLawGuide = `
[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 시점 금지: "저는", "제가", "받아봤어요"
- ❌ 치료경험담 금지: "효과가 좋았어요", "만족합니다"
- ❌ 가격 직접 명시 금지: "OO만원" → "병원별 상이, 상담 시 확인"
- ❌ 효과 단정 금지: "확실히", "100%", "완치"
- ❌ 환자 유인 금지: "할인", "이벤트"
- ❌ 병원 직접 추천 금지`;

  const common = `${adLawGuide}\n${getAiSmellGuide()}\n${getKwDensityGuide(name)}`;

  const sectionGuides = {
    concern: `
[섹션 주제] ${name} 진료를 고려하게 되는 일반적 상황 안내
[조건]
- 3인칭 정보형: "이런 분들이 진료를 고민하시곤 합니다"
- 일반 고민 2~3개 정리
- 방향: ${direction.concern}
- 분량: 200~300자`,

    situation: `
[섹션 주제] ${region} 지역 ${name} 치과 검토 시 일반 안내
[조건]
- 진료 검토 시 일반적으로 확인하는 항목 정리
- "다음 항목을 확인해보시는 것이 권장됩니다" 형식
- 전문의 자격·시설·진료 분야 등 일반 기준
- 분량: 200~300자`,

    consult: `
[섹션 주제] ${name} 상담 시 확인할 일반 항목
[조건]
- "상담 시 의료진은 보통 다음을 안내합니다" 형식
- ❌ 가격·"OO만원" 명시 금지 → "병원별 상이, 상담 시 확인"
- ❌ 1인칭 후기 금지
- 분량: 250~350자`,

    reason: `
[섹션 주제] ${name} 선택 시 일반 고려 기준
[조건]
- "${compareWith}와 비교 시 각각 다음 특징이 있습니다" 형식
- 변화 방향: ${direction.effect}
- ❌ "이게 더 좋다" 단정 금지
- 분량: 200~300자`,

    result: `
[섹션 주제] ${name} 일반적 회복·변화 경과 안내
[조건]
- 일반적 회복 단계 시점별 정리 (D+1·D+7·1개월·3개월)
- "개인차가 있으나 일반적으로 ~" 표현
- 참고: ${operationNotes}
- ❌ "좋아졌어요" 단정 금지
- 분량: 300~400자`,

    closing: `
[섹션 주제] 진료 권장 안내
[조건]
- "비슷한 고민이라면 ${region} ${name} 진료를 고려해볼 수 있습니다" 톤
- 진료 결정은 의료진 상담 후 권장
- ❌ "이 치과 추천" 금지
- 분량: 200~250자`,
  };

  const guide = sectionGuides[section] || `[섹션 주제] ${name} 안내`;

  return `
${region} ${name} 진료 안내 (정보형) — [${section}] 섹션만 작성.

${guide}
${storeFactsBlock}
${common}
${getFlowTimelineGuide(section, 'commercial')}

---
이 섹션만 작성. 정보형이지만 딱딱하지 않게. 자연스러운 안내 톤.
`.trim();
}

// ============================================================
// 3. export
// ============================================================
export { DENTAL_DIRECTION };
