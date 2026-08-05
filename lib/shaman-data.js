// lib/shaman-data.js
// AI-POST 무속 상담 엔진 V1 — 전문분야(신뢰축) × 상황(검색축) 2단 구조
//
//   SPECIALTIES  = "이곳은 무엇을 잘 보는 곳인가"   → 기억·입소문·신뢰
//        ↓
//   SITUATIONS   = "내가 지금 겪는 문제"            → 검색 유입
//        ↓
//   공감 → 상담 필요성 → 안내
//
// 원칙: 검색 의도는 막지 않는다 / 공포·강권 표현은 엔진에서 차단한다 / 사례는 실입력 없으면 생성하지 않는다

/* ─────────────────────────────────────────────
   1. SPECIALTIES — 1차 축 (전문 분야 · 사용자 노출)
   기존 SHAMAN_CATS를 대체. 상담소가 "잘 보는 분야"로 정의한다.
   ───────────────────────────────────────────── */
export const SHAMAN_SPECIALTIES = [
  {
    id: "biz",
    photoCount: 4,
    emoji: "💼",
    label: "사업번창",
    memory: "사업은 잘 본대",
    intro: "일이 풀리지 않는 시기의 흐름을 함께 살핍니다.",
    commonQuestions: [
      "지금 버티는 게 맞을까요, 정리하는 게 맞을까요?",
      "언제쯤 흐름이 돌아설까요?",
      "자리를 옮기는 게 나을까요?",
      "이 일을 계속 이어가도 될까요?",
    ],
  },
  {
    id: "doc",
    photoCount: 4,
    emoji: "📄",
    label: "문서매매",
    memory: "문서는 잘 본대",
    intro: "계약과 매매의 시기를 두고 판단이 서지 않을 때 함께 짚습니다.",
    guard: "FINANCE_NOTICE",
    commonQuestions: [
      "이 계약을 진행해도 될까요?",
      "지금이 파는 시기일까요, 더 두는 게 나을까요?",
      "날짜를 언제로 잡는 게 좋을까요?",
      "이 사람과 진행해도 괜찮을까요?",
    ],
  },
  {
    id: "study",
    photoCount: 4,
    emoji: "📚",
    label: "자손학업 성취",
    memory: "자식 문제는 잘 본대",
    intro: "아이의 시기와 방향을 두고 오래 고민해온 분들이 찾습니다.",
    commonQuestions: [
      "아이가 언제쯤 자리를 잡을까요?",
      "지금 방향을 바꾸는 게 나을까요?",
      "제가 어디까지 개입해야 할까요?",
      "올해 시험은 어떻게 볼까요?",
    ],
  },
  {
    id: "spirit",
    photoCount: 3,
    emoji: "🕯️",
    label: "병굿·신굿",
    memory: "몸이 안 좋을 때 본대",
    intro: "설명되지 않는 불편이 이어질 때 상황을 정리합니다.",
    guard: "HEALTH_NOTICE",
    ritual: true,
    commonQuestions: [
      "왜 이런 상태가 계속되는 걸까요?",
      "언제쯤 나아질까요?",
      "제가 지금 뭘 하면 좋을까요?",
      "이런 상담을 받아도 되는 상황일까요?",
    ],
  },
  {
    id: "ancestor",
    photoCount: 3,
    emoji: "🪔",
    label: "조상천도",
    memory: "집안 일을 본대",
    intro: "집안에 같은 일이 반복된다고 느낄 때 찾아오십니다.",
    guard: "ANCESTOR_NOTICE",
    ritual: true,
    commonQuestions: [
      "집안에 왜 같은 일이 반복될까요?",
      "지금이라도 정리해야 할 일이 있을까요?",
      "가족들과 어떻게 이야기하면 좋을까요?",
      "어떤 절차가 있는 건가요?",
    ],
  },
  {
    id: "marriage",
    photoCount: 3,
    emoji: "💍",
    label: "혼인·인연성불",
    memory: "인연은 잘 본대",
    intro: "인연의 시기와 방향을 두고 마음이 정리되지 않을 때 함께 봅니다.",
    commonQuestions: [
      "인연이 언제쯤 올까요?",
      "이 사람과 가도 될까요?",
      "지금 정리하는 게 맞을까요?",
      "관계를 어떻게 풀어가면 좋을까요?",
    ],
  },
];

// index.js activeCats 배선용 — 라벨 문자열 배열 (플랫폼 관례)
//   ※ 실측(2026-08-05): TreatmentSelectBoard는 cats prop을 소비하지 않으며,
//     그룹 순서는 TREATMENTS의 cat 문자열에서 산출된다(index.js _catOrder).
//     따라서 이 배열은 관례 유지·순서 SoT 표기 목적. 렌더 의존 없음.
export const SHAMAN_CATS = [...SHAMAN_SPECIALTIES.map((s) => s.label), "전문분야 소개"];

/* ─────────────────────────────────────────────
   2. SITUATIONS — 2차 축 (실제 검색 문장 · 글 1편 단위)
   spec / name / reason / emotion / anxiety / trigger / scenes
   ───────────────────────────────────────────── */
export const SHAMAN_SITUATIONS = [
  /* ══ 사업번창 (8) ══ */
  {
    id: "biz_slow", spec: "biz",
    menu: "장사가 계속 안될 때",
    cat: "사업번창",
    emoji: "💼",
    name: "장사가 계속 안될 때",
    reason: "매출이 회복 기미 없이 내려앉음",
    emotion: "조바심",
    anxiety: "버티는 게 맞는지 접는 게 맞는지",
    trigger: "월세 날짜를 계산하기 시작할 때",
    scenes: ["불 켜둔 빈 홀", "마감 후 정산기 숫자", "지나가는 사람을 세는 습관"],
  },
  {
    id: "biz_lostGuest", spec: "biz",
    menu: "손님이 갑자기 끊겼을 때",
    cat: "사업번창",
    emoji: "💼",
    name: "손님이 갑자기 끊겼을 때",
    reason: "특정 시점 이후 발길이 줄어듦",
    emotion: "억울함",
    anxiety: "내가 모르는 소문이 도는 건 아닐까",
    trigger: "바꾼 게 없는데 결과만 달라졌을 때",
    scenes: ["예약 없는 주말 장부", "그대로 남은 재료", "문 앞을 스쳐 지나가는 사람들"],
  },
  {
    id: "biz_contract", spec: "biz",
    menu: "계약이 계속 깨질 때",
    cat: "사업번창",
    emoji: "💼",
    name: "계약이 계속 깨질 때",
    reason: "다 된 일이 마지막에 엎어지는 일이 반복",
    emotion: "허탈",
    anxiety: "우연이라기엔 너무 똑같다",
    trigger: "세 번째 같은 방식으로 무산됐을 때",
    scenes: ["도장 직전에 멈춘 서류", "취소 통보 문자", "비워둔 일정표"],
  },
  {
    id: "biz_partner", spec: "biz",
    menu: "동업자와 계속 어긋날 때",
    cat: "사업번창",
    emoji: "💼",
    name: "동업자와 계속 어긋날 때",
    reason: "같은 일을 두고 판단이 매번 갈림",
    emotion: "피로",
    anxiety: "이 사람과 계속 갈 수 있을까",
    trigger: "말을 꺼내기 전에 이미 지칠 때",
    scenes: ["따로 앉은 사무실", "답이 없는 업무 대화방", "혼자 남아 정리하는 저녁"],
  },
  {
    id: "biz_start", spec: "biz",
    menu: "새로 시작해도 될지 모를 때",
    cat: "사업번창",
    emoji: "💼",
    name: "새로 시작해도 될지 모를 때",
    reason: "결정을 미룬 채 시간이 흐름",
    emotion: "망설임",
    anxiety: "지금이 때인지 아닌지",
    trigger: "주변 의견이 반반으로 갈릴 때",
    scenes: ["계약서 앞에서 멈춘 커서", "가계약금 이체창", "밤새 켜둔 상권 지도"],
  },
  {
    id: "biz_tangled", spec: "biz",
    menu: "하는 일마다 꼬일 때",
    cat: "사업번창",
    emoji: "💼",
    name: "하는 일마다 꼬일 때",
    reason: "작은 사고가 겹쳐서 일어남",
    emotion: "체념 직전",
    anxiety: "왜 나만 이런가",
    trigger: "같은 달에 세 번 일이 틀어졌을 때",
    scenes: ["수리비 영수증", "미뤄진 일정 메모", "다시 잡은 약속이 또 밀린 알림"],
  },
  {
    id: "biz_leak", spec: "biz",
    menu: "돈이 계속 새어나갈 때",
    cat: "사업번창",
    emoji: "💼",
    name: "돈이 계속 새어나갈 때",
    reason: "수입은 있는데 남는 게 없음",
    emotion: "불안",
    anxiety: "구조 자체가 잘못된 건 아닐까",
    trigger: "예상 못 한 지출이 연달아 생길 때",
    scenes: ["가계부 잔액", "갑자기 온 청구서", "미룬 저축 이체"],
  },
  {
    id: "biz_debt", spec: "biz",
    menu: "빚이 줄지 않을 때",
    cat: "사업번창",
    emoji: "💼",
    name: "빚이 줄지 않을 때",
    reason: "갚아도 원금이 그대로임",
    emotion: "압박",
    anxiety: "끝이 보이지 않는다",
    trigger: "상환일 계산을 매달 다시 할 때",
    scenes: ["알림이 뜨는 상환일", "숫자만 보는 새벽", "미뤄둔 통화"],
    guard: "FINANCE_NOTICE",
  },

  /* ══ 문서매매 (5) ══ */
  {
    id: "doc_home", spec: "doc",
    menu: "집을 계약해도 될지 고민될 때",
    cat: "문서매매",
    emoji: "📄",
    name: "집을 계약해도 될지 고민될 때",
    reason: "조건은 맞는데 마음이 놓이지 않음",
    emotion: "주저",
    anxiety: "놓치면 후회할까, 잡으면 후회할까",
    trigger: "가계약 날짜가 정해질 때",
    scenes: ["다시 열어보는 서류", "밤늦게 켜둔 지도", "보류해둔 이체창"],
    guard: "FINANCE_NOTICE",
  },
  {
    id: "doc_store", spec: "doc",
    menu: "상가 계약을 앞두고 있을 때",
    cat: "문서매매",
    emoji: "📄",
    name: "상가 계약을 앞두고 있을 때",
    reason: "자리와 시기 판단이 서지 않음",
    emotion: "긴장",
    anxiety: "이 값이 맞는 값인지",
    trigger: "계약일이 잡힌 뒤 잠이 줄어들 때",
    scenes: ["빈 점포 유리문", "유동인구를 세는 오후", "접어둔 도면"],
    guard: "FINANCE_NOTICE",
  },
  {
    id: "doc_sell", spec: "doc",
    menu: "부동산 매매 시기를 정하기 어려울 때",
    cat: "문서매매",
    emoji: "📄",
    name: "부동산 매매 시기를 정하기 어려울 때",
    reason: "지금 팔지 더 둘지 결정이 안 됨",
    emotion: "초조",
    anxiety: "판단을 잘못하면 되돌릴 수 없다",
    trigger: "매수 문의가 실제로 들어올 때",
    scenes: ["시세 알림", "미룬 통화", "달력에만 표시해둔 날짜"],
    guard: "FINANCE_NOTICE",
  },
  {
    id: "doc_deadline", spec: "doc",
    menu: "중요한 계약 날짜를 앞두고 있을 때",
    cat: "문서매매",
    emoji: "📄",
    name: "중요한 계약 날짜를 앞두고 있을 때",
    reason: "기한이 정해지자 불안이 커짐",
    emotion: "불안",
    anxiety: "이 사람과 이 조건이 맞는지",
    trigger: "서명 전날",
    scenes: ["출력해둔 계약서", "몇 번을 다시 읽는 특약", "펜을 든 채 멈춘 손"],
    guard: "FINANCE_NOTICE",
  },
  {
    id: "doc_invest", spec: "doc",
    menu: "투자 판단이 서지 않을 때",
    cat: "문서매매",
    emoji: "📄",
    name: "투자 판단이 서지 않을 때",
    reason: "권유는 들어오는데 확신이 없음",
    emotion: "망설임",
    anxiety: "믿어도 되는 이야기인가",
    trigger: "마감 기한을 통보받을 때",
    scenes: ["열어둔 자료 화면", "반복해 여는 계산기", "답을 미룬 메시지"],
    guard: "FINANCE_NOTICE",
  },

  /* ══ 자손학업 성취 (8) ══ */
  {
    id: "study_defiant", spec: "study",
    menu: "아이가 말을 안 들을 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이가 말을 안 들을 때",
    reason: "훈육이 통하지 않고 대화가 끊긴 지 오래됨",
    emotion: "무력감",
    anxiety: "내가 부모로서 뭘 잘못한 걸까",
    trigger: "혼내는 나 자신이 낯설어질 때",
    scenes: ["닫힌 방문 앞에서 노크하다 만 손", "식탁에 남은 밥그릇", "휴대폰만 보는 뒷모습"],
  },
  {
    id: "study_changed", spec: "study",
    menu: "아이가 갑자기 변했을 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이가 갑자기 변했을 때",
    reason: "며칠 사이 표정과 말투가 완전히 달라짐",
    emotion: "당혹",
    anxiety: "무슨 일이 있었는데 나만 모르는 것 아닐까",
    trigger: "물어봐도 아무 말도 하지 않을 때",
    scenes: ["교복을 벗어 던진 자리", "예전 사진 속 웃는 얼굴", "늦은 밤 켜져 있는 방 불빛"],
  },
  {
    id: "study_refuse", spec: "study",
    menu: "아이가 학교를 거부할 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이가 학교를 거부할 때",
    reason: "아침마다 실랑이가 반복됨",
    emotion: "초조",
    anxiety: "이대로 1년을 잃는 건 아닐까",
    trigger: "담임 전화를 받는 횟수가 늘 때",
    scenes: ["현관에서 멈춘 신발", "이불 속에서 나오지 않는 아침", "가방이 그대로인 책상"],
  },
  {
    id: "study_noStudy", spec: "study",
    menu: "아이가 공부를 안 할 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이가 공부를 안 할 때",
    reason: "책상 앞에 앉는 시간 자체가 사라짐",
    emotion: "답답함",
    anxiety: "지금 잡지 않으면 늦는 건 아닐까",
    trigger: "성적표가 나온 저녁",
    scenes: ["펼쳐만 둔 문제집", "학원 결석 알림", "말없이 지나가는 저녁 식사"],
  },
  {
    id: "study_exam", spec: "study",
    menu: "시험만 보면 떨어질 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "시험만 보면 떨어질 때",
    reason: "실력에 비해 결과가 계속 어긋남",
    emotion: "허탈",
    anxiety: "노력 문제가 아니라면 무엇이 문제인가",
    trigger: "같은 패턴이 세 번째 반복될 때",
    scenes: ["책상 위 쌓인 기출문제집", "발표일 아침의 침묵", "합격자 명단을 새로고침하는 손"],
  },
  {
    id: "study_career", spec: "study",
    menu: "아이 진로가 걱정될 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이 진로가 걱정될 때",
    reason: "방향을 정하지 못한 채 시간이 감",
    emotion: "조바심",
    anxiety: "내가 정해주는 게 맞는 걸까",
    trigger: "원서 접수 기간이 다가올 때",
    scenes: ["비어 있는 지망 칸", "상담 신청서", "말을 아끼는 저녁 대화"],
  },
  {
    id: "study_job", spec: "study",
    menu: "취업이 계속 안 될 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "취업이 계속 안 될 때",
    reason: "지원해도 결과가 오지 않음",
    emotion: "소진",
    anxiety: "언제까지 이 상태여야 하나",
    trigger: "면접까지 갔다가 떨어지는 일이 반복될 때",
    scenes: ["불합격 메일함", "늦게 일어나는 아침", "닫아둔 방문"],
  },
  {
    id: "study_leftHome", spec: "study",
    menu: "아이가 집을 나갔을 때",
    cat: "자손학업 성취",
    emoji: "📚",
    name: "아이가 집을 나갔을 때",
    reason: "연락이 닿지 않는 시간이 길어짐",
    emotion: "공포에 가까운 불안",
    anxiety: "지금 어디서 누구와 있는지",
    trigger: "주변에 다 물어보고 나서",
    scenes: ["읽지 않음으로 남은 메시지", "비어 있는 방", "현관 센서등을 기다리는 밤"],
    guard: "SAFETY_NOTICE",
  },

  /* ══ 병굿·신굿 (5) ══ */
  {
    id: "spirit_tired", spec: "spirit",
    menu: "계속 몸이 안 좋을 때",
    cat: "병굿·신굿",
    emoji: "🕯️",
    name: "계속 몸이 안 좋을 때",
    reason: "특정 원인 없이 컨디션이 내려앉음",
    emotion: "무기력",
    anxiety: "나아질 기미가 보이지 않는다",
    trigger: "일상 유지가 어려워질 때",
    scenes: ["오후에 눕는 시간", "미룬 약속", "손에서 놓친 물건"],
    guard: "HEALTH_NOTICE",
  },
  {
    id: "spirit_anxious", spec: "spirit",
    menu: "이유 없이 불안할 때",
    cat: "병굿·신굿",
    emoji: "🕯️",
    name: "이유 없이 불안할 때",
    reason: "특별한 일이 없는데 마음이 가라앉지 않음",
    emotion: "불안",
    anxiety: "설명할 수 없는 게 더 두렵다",
    trigger: "일상 집중이 어려워질 때",
    scenes: ["새벽에 뜬 눈", "이유 없이 확인하는 휴대폰", "숨을 고르는 순간"],
    guard: "HEALTH_NOTICE",
  },
  {
    id: "spirit_dream", spec: "spirit",
    menu: "같은 꿈이 반복될 때",
    cat: "병굿·신굿",
    emoji: "🕯️",
    name: "같은 꿈이 반복될 때",
    reason: "같은 장면이 여러 번 되풀이됨",
    emotion: "찜찜함",
    anxiety: "무언가 알려주는 것 같다",
    trigger: "낮 시간까지 남을 때",
    scenes: ["깨어난 직후의 방", "적어둔 꿈 메모", "같은 시각에 깨는 습관"],
  },
  {
    id: "spirit_child", spec: "spirit",
    menu: "아이가 자꾸 아플 때",
    cat: "병굿·신굿",
    emoji: "🕯️",
    name: "아이가 자꾸 아플 때",
    reason: "잔병치레가 끊이지 않음",
    emotion: "지침",
    anxiety: "내가 놓친 게 있는 건 아닐까",
    trigger: "병원을 옮겨 다녀도 같은 말을 들을 때",
    scenes: ["약봉지가 늘어나는 서랍", "새벽 체온계", "결석계를 다시 쓰는 손"],
    guard: "HEALTH_NOTICE",
  },
  {
    id: "spirit_sign", spec: "spirit",
    menu: "검사에서는 이상이 없다는데 계속 불편할 때",
    cat: "병굿·신굿",
    emoji: "🕯️",
    name: "검사에서는 이상이 없다는데 계속 불편할 때",
    reason: "설명되지 않는 상태가 이어짐",
    emotion: "혼란",
    anxiety: "어디에 물어봐야 할지 모르겠다",
    trigger: "주변에서 한 번 보라는 말을 들었을 때",
    scenes: ["검사 결과지", "설명을 반복하는 진료실", "혼자 검색하는 밤"],
    guard: "HEALTH_NOTICE",
  },

  /* ══ 조상천도 (4) ══ */
  {
    id: "anc_repeat", spec: "ancestor",
    menu: "집안에 안 좋은 일이 반복될 때",
    cat: "조상천도",
    emoji: "🪔",
    name: "집안에 안 좋은 일이 반복될 때",
    reason: "가족에게 비슷한 일이 연달아 생김",
    emotion: "무거움",
    anxiety: "우연이 아닌 것 같다",
    trigger: "같은 해에 세 번째 일이 생겼을 때",
    scenes: ["연달아 걸려온 전화", "다시 모인 가족", "말을 아끼는 자리"],
    guard: "ANCESTOR_NOTICE",
  },
  {
    id: "anc_family", spec: "ancestor",
    menu: "가족 중 한 사람이 계속 아플 때",
    cat: "조상천도",
    emoji: "🪔",
    name: "가족 중 한 사람이 계속 아플 때",
    reason: "간병이 길어지며 온 집이 지침",
    emotion: "소진",
    anxiety: "언제까지 이 상태일까",
    trigger: "돌보는 사람이 먼저 무너질 것 같을 때",
    scenes: ["병원 대기 의자", "약 정리함", "교대로 비는 자리"],
    guard: "HEALTH_NOTICE",
  },
  {
    id: "anc_move", spec: "ancestor",
    menu: "이사를 가도 일이 안 풀릴 때",
    cat: "조상천도",
    emoji: "🪔",
    name: "이사를 가도 일이 안 풀릴 때",
    reason: "환경을 바꿔도 상황이 같음",
    emotion: "실망",
    anxiety: "장소 문제가 아니었나",
    trigger: "새 집에서도 같은 일이 반복될 때",
    scenes: ["아직 안 푼 상자", "낯선 창밖", "같은 시간에 드는 생각"],
    guard: "ANCESTOR_NOTICE",
  },
  {
    id: "anc_rite", spec: "ancestor",
    menu: "조상 관련해 마음에 걸리는 일이 있을 때",
    cat: "조상천도",
    emoji: "🪔",
    name: "조상 관련해 마음에 걸리는 일이 있을 때",
    reason: "묘·제사·기일 문제로 오래 미뤄둔 일이 있음",
    emotion: "부담",
    anxiety: "지금이라도 해야 하는 건 아닐까",
    trigger: "가족 사이에 이야기가 나왔을 때",
    scenes: ["오랜만에 꺼낸 사진", "미뤄둔 성묘", "형제간 통화"],
    guard: "ANCESTOR_NOTICE",
  },

  /* ══ 혼인·인연성불 (5) ══ */
  {
    id: "mar_late", spec: "marriage",
    menu: "결혼이 늦어질 때",
    cat: "혼인·인연성불",
    emoji: "💍",
    name: "결혼이 늦어질 때",
    reason: "때가 오지 않는 것 같아 조급해짐",
    emotion: "조급함",
    anxiety: "나에게 문제가 있는 건 아닐까",
    trigger: "주변 소식이 연달아 들려올 때",
    scenes: ["다녀온 결혼식장", "부모님과의 짧은 통화", "미룬 주선 답장"],
  },
  {
    id: "mar_alone", spec: "marriage",
    menu: "인연이 계속 안 이어질 때",
    cat: "혼인·인연성불",
    emoji: "💍",
    name: "인연이 계속 안 이어질 때",
    reason: "만남이 짧게 끝나는 일이 반복",
    emotion: "자책",
    anxiety: "같은 이유로 끝나는 것 같다",
    trigger: "세 번째 같은 방식으로 끝났을 때",
    scenes: ["정리된 대화방 목록", "혼자 보내는 기념일", "미뤄둔 약속"],
  },
  {
    id: "mar_decide", spec: "marriage",
    menu: "결혼을 결정하기 어려울 때",
    cat: "혼인·인연성불",
    emoji: "💍",
    name: "결혼을 결정하기 어려울 때",
    reason: "확신이 서지 않은 채 날짜가 다가옴",
    emotion: "불안",
    anxiety: "이 사람이 맞는지 지금이 맞는지",
    trigger: "양가 일정이 잡히기 시작할 때",
    scenes: ["보류해둔 청첩장 시안", "말을 아끼는 통화", "표시만 해둔 날짜"],
  },
  {
    id: "mar_spouse", spec: "marriage",
    menu: "배우자 문제로 힘들 때",
    cat: "혼인·인연성불",
    emoji: "💍",
    name: "배우자 문제로 힘들 때",
    reason: "말수와 귀가 시간이 달라짐",
    emotion: "서운함",
    anxiety: "물어보면 관계가 더 나빠질까",
    trigger: "혼자 넘겨온 시간이 한계에 닿을 때",
    scenes: ["식은 국", "돌아누운 등", "현관 소리를 기다리는 밤"],
  },
  {
    id: "mar_back", spec: "marriage",
    menu: "헤어진 뒤 정리가 안 될 때",
    cat: "혼인·인연성불",
    emoji: "💍",
    name: "헤어진 뒤 정리가 안 될 때",
    reason: "일상으로 돌아가지 못함",
    emotion: "미련",
    anxiety: "붙잡는 게 맞는지 놓는 게 맞는지",
    trigger: "같은 질문을 혼자 반복하다 지칠 때",
    scenes: ["지우지 못한 사진첩", "그 이름이 뜨는 알림", "돌아오는 길의 같은 정류장"],
    guard: "RELATION_NOTICE",
  },
];

/* ─────────────────────────────────────────────
   2-B. INTROS — 전문분야 소개글 진입 항목 (Engine B)
   전용 UI를 만들지 않고 메뉴 목록에 합류시킨다.
   플랫폼 흐름(Treatment 1개 선택 → 생성)을 그대로 유지하기 위함.
   ───────────────────────────────────────────── */
export const INTRO_CAT_LABEL = "전문분야 소개";

export const SHAMAN_INTROS = SHAMAN_SPECIALTIES.map((sp) => ({
  id: `intro_${sp.id}`,
  spec: sp.id,
  menu: `${sp.label} 상담`,
  cat: INTRO_CAT_LABEL,
  emoji: sp.emoji,
  name: `${sp.label} 상담`,
  engine: "B",
}));

// SOP 배선 별칭 — 상황 35 + 전문분야 소개 6 = 41
export const SHAMAN_TREATMENTS = [...SHAMAN_SITUATIONS, ...SHAMAN_INTROS];

/* 선택된 메뉴 id → 엔진 라우팅 해석 */
export function resolveEntry(id) {
  const intro = SHAMAN_INTROS.find((x) => x.id === id);
  if (intro) return { menu: "specialty", specialtyId: intro.spec, situationId: null };
  const sit = SHAMAN_SITUATIONS.find((x) => x.id === id);
  if (sit) return { menu: "situation", situationId: sit.id, specialtyId: null };
  // 플랫폼이 id 대신 메뉴명을 넘기는 경로 대비
  const byName = SHAMAN_TREATMENTS.find((x) => x.menu === id);
  if (byName) return resolveEntry(byName.id);
  return null;
}

/* ─────────────────────────────────────────────
   3. MENUS — Engine A / B / C
   ───────────────────────────────────────────── */
export const SHAMAN_MENUS = [
  {
    id: "situation",
    label: "상황 공감글",
    engine: "A",
    core: true,
    axis: "situation",
    flow: ["상황 재현", "감정 공감", "해석", "가능성", "상담이 필요한 지점", "안내"],
    note: "핵심 엔진. 상황 1건 = 글 1편. 검색 유입 담당.",
  },
  {
    id: "specialty",
    label: "전문 분야 소개글",
    engine: "B",
    core: true,
    axis: "specialty",
    flow: ["이 분야를 보는 이유", "상담 방식", "상담 시간 구성", "원칙", "이후 안내"],
    note: "전문분야 1건 = 글 1편. 기억·신뢰 담당. 능력 과시·적중률 표현 금지.",
  },
  {
    id: "case",
    label: "상담 사례 정리",
    engine: "C",
    core: false,
    axis: "situation",
    hidden: true,                      // ★ V1 미노출 — 입력 폼 UI 준비 후 V2에서 개방
    requiresInput: true,               // ★ 실입력 없으면 생성 차단
    inputFields: ["caseSituation", "caseProcess", "caseResult"],
    flow: ["의뢰 상황", "상담에서 나눈 이야기", "정리된 방향", "이후 경과"],
    note: "후기 창작 엔진 아님. 사업주 입력 사례 정리 전용.",
  },
];

/* ─────────────────────────────────────────────
   4. META
   ───────────────────────────────────────────── */
export const SHAMAN_META = {
  industry: "shaman",
  label: "상담·역학",
  group: "professional",
  photoCount: 4,                        // 기본값. SPECIALTIES[].photoCount가 있으면 그쪽이 우선
  photoRoles: ["상담 공간", "상담 준비", "상담소 외관", "건물 입구"],
  charTarget: [1500, 2000],
  axis: { primary: "specialty", secondary: "situation" },
  storeNameInBody: false,               // PHILOSOPHY 원칙1
  regionRepeatMax: 3,
};

/* ─────────────────────────────────────────────
   5. titlePatterns
   {situation} = 상황문 / {specialty} = 분야 / {region} = 지역
   ───────────────────────────────────────────── */
export const SHAMAN_TITLE_PATTERNS = {
  // Engine A(상황형) — 기본축. 검색 문장 + 공감구.
  //   "혼자 답이 안 나올 때"가 본문 흐름(혼자 버틴 시간 → 상담)과 가장 잘 이어진다.
  //   ※ 지역 삽입형은 제거. 제목의 지역명은 광고로 읽히고, 주소 후단 노출 원칙과도 어긋난다.
  situation: [
    "{situation} — 혼자 답이 안 나올 때",
    "{situation}, 어디서부터 봐야 할까",
    "{situation}, 무엇을 물어봐야 하나",
    "{situation}이 반복될 때 확인하는 것들",
  ],
  // Engine B(소개형) — 상황형 어투를 섞지 않는다. 축이 다르다.
  specialty: [
    "{specialty} 상담은 어떤 이야기를 나누나",
    "{specialty}, 상담에서 실제로 다루는 것",
    "{specialty} 상담에서 자주 받는 질문",
    "{specialty} 상담이 필요한 순간",
  ],
};

/* 제목 유형 판정 — 본문에서 제목을 회수하기 위한 축
   질문형 제목이면 본문에 실제 상담 질문이 있어야 제목과 본문이 연결된다. */
export function titleNeedsQuestions(title = "") {
  return /무엇을 물어|어디서부터|자주 받는 질문|확인하는 것들/.test(String(title));
}

/* 5-B. 제목 축 분리 (세션95)
   ★ 한 풀에서 랜덤 선택하면 제목과 본문 흐름이 어긋난다.
     - ask   : 상담이 질문으로 진행되는 주제 → "무엇을 물어봐야 하나"
     - cause : 반복되는 흐름의 원인을 함께 보는 주제 → "어디서부터 봐야 할까"
   판정은 situation 단위. spec 단위로 묶으면 doc/marriage에서 다시 어긋난다. */
export const TITLE_AXIS_BY_SPEC = {
  biz: "ask", doc: "decide", study: "ask", spirit: "ask", ancestor: "cause", marriage: "ask",
};

export const TITLE_AXIS_BY_SITUATION = {
  biz_tangled: "cause",
  biz_leak: "cause",
  mar_alone: "cause",
  anc_move: "cause",
};

export const SHAMAN_TITLE_POOLS = {
  ask: [
    "{situation}, 무엇을 물어봐야 하나",
    "{situation} — 혼자 답이 안 나올 때",
  ],
  cause: [
    "{situation}, 어디서부터 봐야 할까",
    "{situation} — 원인을 찾기 어려울 때",
  ],
  // decide = 계약·매매처럼 반복이 아니라 '결정'이 축인 주제.
  //   cause 문형("같은 일이 반복된다면")을 쓰면 상황과 어긋난다.
  decide: [
    "{situation}, 어디서부터 봐야 할까",
    "{situation} — 결정이 서지 않을 때",
  ],
};

export function getTitleAxis(specId, situationId) {
  if (situationId && TITLE_AXIS_BY_SITUATION[situationId]) return TITLE_AXIS_BY_SITUATION[situationId];
  const s = situationId ? SHAMAN_SITUATIONS.find((x) => x.id === situationId) : null;
  const spec = (s && s.spec) || specId;
  return TITLE_AXIS_BY_SPEC[spec] || "ask";
}

/* Engine A 제목 후보 — 축에 맞는 패턴만 반환 */
export function situationTitlePatterns(specId, situationId) {
  return SHAMAN_TITLE_POOLS[getTitleAxis(specId, situationId)];
}

/* ─────────────────────────────────────────────
   5-C. 제목 확정 경로 (세션102)
   ★ 프롬프트는 '지시'일 뿐 '보장'이 아니다.
     모델이 패턴을 서술문으로 고쳐 쓰거나 제목 줄을 아예 빼면
     splitTitle이 본문 첫 문장을 제목으로 삼는다.
     → 코드가 마지막에 검증하고, 실패하면 패턴에서 직접 만든다.
   본문 생성 로직·풀 내용은 건드리지 않는다. 제목 경로만.
   ───────────────────────────────────────────── */

export const SHAMAN_TITLE_MAXLEN = 45;
export const SHAMAN_TITLE_MINLEN = 10;

// 서술문 종결 — 제목이 아니라 본문 문장이라는 신호
const TITLE_SENTENCE_TAIL =
  /(습니다|입니다|합니다|됩니다|칩니다|십니다|겠지요|더군요|있지요|아닙니다|않습니다|어렵습니다|쉽지 않)[.。]?\s*$/;

function fillTitlePattern(p, vars) {
  return String(p || "")
    .replace(/\{situation\}/g, vars.situation || "")
    .replace(/\{specialty\}/g, vars.specialty || "")
    .replace(/\{region\}/g, vars.region || "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* 제목 후보 풀 — axis(situation/specialty)에 따라 채워진 완성형 배열 반환 */
export function shamanTitleCandidates({ axis, situationId, specialtyId, specId } = {}) {
  if (axis === "specialty") {
    const sp = getSpecialty(specialtyId || specId);
    if (!sp) return [];
    return SHAMAN_TITLE_PATTERNS.specialty.map((p) =>
      fillTitlePattern(p, { specialty: sp.label })
    );
  }
  const s = getSituation(situationId);
  if (!s) return [];
  const pool = situationTitlePatterns(s.spec || specId, situationId) || [];
  return pool.map((p) => fillTitlePattern(p, { situation: s.name }));
}

/* 제목 핵심 키워드 — 상황문/분야명에서 뽑는다.
   제목에 이 중 하나도 없으면 검색 의도가 빠진 제목이다. */
function titleAnchors({ axis, situationId, specialtyId, specId } = {}) {
  if (axis === "specialty") {
    const sp = getSpecialty(specialtyId || specId);
    return sp ? [sp.label] : [];
  }
  const s = getSituation(situationId);
  if (!s) return [];
  // 상황문 전체 + 조사·어미를 뺀 앞머리 토큰(2자 이상)
  const words = String(s.name).split(/[\s,·—-]+/).filter((w) => w.length >= 2);
  return [s.name, ...words];
}

/* 제목 검증 — 실패 사유를 반환(빈 배열이면 통과) */
export function checkShamanTitle(title, ctx = {}) {
  const t = String(title || "").trim();
  const fails = [];

  if (!t) return ["EMPTY"];
  if (t.length < SHAMAN_TITLE_MINLEN) fails.push("TOO_SHORT");
  if (t.length > SHAMAN_TITLE_MAXLEN) fails.push("TOO_LONG");
  // 서술문 종결 = 본문 문장을 제목으로 쓴 것
  if (TITLE_SENTENCE_TAIL.test(t)) fails.push("SENTENCE_FORM");
  // 마침표로 끝나는 제목은 쓰지 않는다
  if (/[.。]\s*$/.test(t)) fails.push("TRAILING_PERIOD");
  // 본문 마커·블록 라벨이 섞여 들어온 경우
  if (/📷|📍|^\[|^제목\s*[:：]?\s*$/.test(t)) fails.push("MARKER");
  // 본문 첫 문장 복사 금지
  if (ctx.bodyFirst) {
    const b = String(ctx.bodyFirst).trim();
    if (b && (b === t || b.startsWith(t) || t.startsWith(b))) fails.push("BODY_COPY");
  }
  // 검색 의도 앵커 누락
  const anchors = titleAnchors(ctx);
  if (anchors.length && !anchors.some((a) => t.includes(a))) fails.push("NO_ANCHOR");

  return fails;
}

/* 제목 확정 — 모델 제목이 통과하면 그대로, 아니면 패턴에서 만든다.
   @return { title, source: "model"|"pattern"|"fallback", fails: [] } */
export function resolveShamanTitle(modelTitle, ctx = {}) {
  const fails = checkShamanTitle(modelTitle, ctx);
  if (!fails.length) {
    return { title: String(modelTitle).trim(), source: "model", fails: [] };
  }

  const cands = shamanTitleCandidates(ctx).filter(
    (c) => !checkShamanTitle(c, { ...ctx, bodyFirst: null }).length
  );
  if (cands.length) {
    const pickIdx = Math.floor(Math.random() * cands.length);
    return { title: cands[pickIdx], source: "pattern", fails };
  }

  // 풀까지 비면 상황문 자체를 제목으로 쓴다(검색어는 최소한 살린다)
  const anchor = titleAnchors(ctx)[0] || "";
  return { title: anchor, source: "fallback", fails };
}

/* ─────────────────────────────────────────────
   6. 안전장치 — FORBIDDEN / NOTICE / 의례 규칙
   prompts.js · QC 양쪽에서 참조
   ───────────────────────────────────────────── */

// 생성 자체를 차단하는 표현 (감지 시 재생성)
export const SHAMAN_FORBIDDEN = [
  // 공포 유발
  "큰일", "액운", "살이 끼", "조상이 노", "동티", "재앙", "화를 입", "탈이 나",
  "안 하면 더", "지금 안 하면", "늦으면", "막지 않으면", "그대로 두면", "더 심해",
  // 의례 강권
  "반드시 굿", "굿을 해야", "부적을 써야", "천도재를 해야", "풀어야만", "해야만 합니다",
  // 결과 보장
  "100%", "확실히 해결", "반드시 이루", "재회시켜", "합격시켜", "성사시켜",
  "낫게 해", "완치", "치료해", "병이 사라", "운을 바꿔드",
  // 단정·권위
  "틀림없이", "무조건", "제가 다 아", "신이 알려준 대로", "시키는 대로 하면",
  // 광고형 (PHILOSOPHY 공통)
  "용하다", "용한", "잘 맞히기로", "적중률", "최고", "1위", "원조", "강추", "소름",
];

// 축별 강제 삽입 안내문 (본문 말미 1회)
export const SHAMAN_NOTICES = {
  HEALTH_NOTICE:
    "건강에 이상이 느껴진다면 의료기관의 진료와 검사를 먼저 받아보시길 권합니다. 상담은 그 과정을 대신하지 않습니다.",
  SAFETY_NOTICE:
    "가족의 소재를 알 수 없는 상황이라면 경찰(112) 신고와 공적 절차를 먼저 진행하시길 권합니다.",
  RELATION_NOTICE:
    "상담은 마음을 정리하는 과정입니다. 상대의 의사와 무관한 접근이나 연락은 권하지 않습니다.",
  FINANCE_NOTICE:
    "계약·매매·투자에 관한 판단은 전문가 확인과 본인의 결정을 우선하시길 권합니다.",
  ANCESTOR_NOTICE:
    "상담은 일의 원인을 단정하지 않습니다. 상황을 정리하고 방향을 함께 살피는 자리입니다.",
};

// 모든 글 공통 하단 고지 (1회)
export const SHAMAN_BASE_NOTICE =
  "상담 내용은 개인의 선택을 돕기 위한 참고이며, 의료·법률·재무상의 판단을 대신하지 않습니다.";

/* ─────────────────────────────────────────────
   4-B. 분야별 상담 문형 (COMMON_RENDER 연동)
   question  = 본문 중반에 한 줄 배치. 상담이 시작되는 분위기를 만든다.
   cta       = 후단 📞 블록 첫 줄. 분야마다 달라야 41편이 같아 보이지 않는다.
   soloPhase = "혼자 보낸 시간" 단계의 소재.
               ★ 전 분야가 '검색 → 정보 과다 → 혼란'으로 수렴하는 문제를 막는 축.
                 분야마다 혼자 버티는 방식이 다르다.
   ───────────────────────────────────────────── */
export const SHAMAN_CONSULT = {
  biz: {
    question: "요즘 가장 마음에 걸리는 일은 무엇인가요?",
    questions: [
      "언제부터 흐름이 달라졌다고 느끼셨나요?",
      "그 전후로 달라진 일이 있었나요?",
      "지금 가장 마음에 걸리는 일은 무엇인가요?",
      "같은 일이 반복된다고 느끼시나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "사업의 흐름이 답답하게 느껴진다면",
    soloPhase: "검색과 주변 조언을 반복해 듣지만 저마다 말이 달라 정리가 되지 않는 시간",
  },
  doc: {
    question: "계약을 앞두고 가장 망설여지는 부분은 무엇인가요?",
    questions: [
      "언제부터 이 결정을 미루게 되셨나요?",
      "가장 망설여지는 부분은 무엇인가요?",
      "전에도 비슷한 일로 마음이 걸린 적이 있었나요?",
      "날짜를 두고 마음이 바뀐 적이 있나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "계약을 앞두고 결정이 서지 않는다면",
    soloPhase: "결정을 미루다 날짜만 넘기고, 확인할수록 확신이 줄어드는 시간",
  },
  study: {
    question: "언제부터 걱정이 가장 커졌나요?",
    questions: [
      "언제부터 걱정이 가장 커졌나요?",
      "그 무렵 달라진 일이 있었나요?",
      "아이에게 직접 말하지 못한 부분이 있나요?",
      "같은 상황이 반복된다고 느끼시나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "아이 문제로 오래 고민하고 있다면",
    soloPhase: "아이에게는 내색하지 못한 채 혼자 삼키고, 같은 걱정을 밤마다 되짚는 시간",
  },
  spirit: {
    question: "언제부터 그런 상태가 이어졌나요?",
    questions: [
      "언제부터 그런 상태가 이어졌나요?",
      "그 시기에 달라진 일이 있었나요?",
      "진료와 검사에서는 어떤 이야기를 들으셨나요?",
      "비슷한 일이 전에도 있었나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "걱정이 오래 이어지고 있다면",
    soloPhase: "진료와 검사를 받아도 뚜렷한 설명을 듣지 못한 채 상태만 이어지는 시간",
  },
  ancestor: {
    question: "집안에서 반복된다고 느끼는 일은 무엇인가요?",
    questions: [
      "집안에서 반복된다고 느끼는 일은 무엇인가요?",
      "언제부터 그렇게 느끼셨나요?",
      "집안 어른들은 어떤 이야기를 하시나요?",
      "비슷한 일이 다른 가족에게도 있었나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "집안일이 반복되어 답답하다면",
    soloPhase: "집안 어른들 말이 갈리고, 누구에게 물어야 할지도 모른 채 지나가는 시간",
  },
  marriage: {
    question: "무엇이 가장 답답하게 느껴지시나요?",
    questions: [
      "언제부터 늦어진다고 느끼셨나요?",
      "마음에 남는 인연이 있었나요?",
      "소개를 받아도 잘 이어지지 않았나요?",
      "같은 상황이 반복된다고 느끼시나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "인연 문제로 고민이 깊어졌다면",
    soloPhase: "주변에는 말하지 못하고 지난 일을 혼자 되짚기만 하는 시간",
  },
};

export const SHAMAN_CONSULT_FALLBACK = {
  question: "지금 가장 마음에 걸리는 일은 무엇인가요?",
  questions: [
    "언제부터 그렇게 느끼셨나요?",
    "그 무렵 달라진 일이 있었나요?",
    "같은 일이 반복된다고 느끼시나요?",
    "지금 가장 궁금하신 것은 무엇인가요?",
  ],
  cta: "혼자 답이 나지 않는 상황이라면",
  soloPhase: "혼자 답을 찾아보려 애쓰지만 무엇부터 봐야 할지 모르는 시간",
};

/* ─────────────────────────────────────────────
   4-C. NARRATOR — 화자 고정 축 (세션95)
   ★ 실측 문제: SHAMAN_CONSULT는 spec 단위다. study spec의 cta/soloPhase는
     부모 화자로 쓰여 있는데, study_exam·study_job의 scenes는 본인 시점이다.
     한 글 안에서 시점이 갈리던 원인은 엔진이 아니라 이 데이터 층위였다.
   원칙: 화자는 situation 단위로 확정한다. spec은 기본값일 뿐이다.
   ───────────────────────────────────────────── */

export const SHAMAN_NARRATORS = ["self", "parent", "family"];

// spec 기본 화자
export const SPEC_NARRATOR = {
  biz: "self",
  doc: "self",
  study: "parent",
  spirit: "self",
  ancestor: "family",
  marriage: "self",
};

// situation 예외 — spec 기본값과 다른 것만 등재
export const SITUATION_NARRATOR = {
  study_exam: "self",   // scenes = 본인 응시 장면
  study_job: "self",    // scenes = 본인 구직 장면
  spirit_child: "parent",
  anc_family: "family",
};

export function getNarrator(specId, situationId) {
  if (situationId && SITUATION_NARRATOR[situationId]) return SITUATION_NARRATOR[situationId];
  const s = situationId ? SHAMAN_SITUATIONS.find((x) => x.id === situationId) : null;
  const spec = (s && s.spec) || specId;
  return SPEC_NARRATOR[spec] || "self";
}

/* 프롬프트 주입용 화자 규칙.
   금지어 목록이 아니라 '누가 말하는가'를 고정하는 문장으로 준다.
   FORBIDDEN에 넣지 않는다 — 폐기 대상이 아니라 유도 대상이다. */
export const SHAMAN_NARRATOR_RULES = {
  self: [
    "화자는 문제를 직접 겪고 있는 본인이다.",
    "'아이', '자녀', '우리 아이', '부모로서' 같은 보호자 시점 표현을 쓰지 않는다.",
    "고민의 주어는 글을 읽는 본인이다. 제3자를 대신 걱정하는 문장을 넣지 않는다.",
  ],
  parent: [
    "화자는 아이를 지켜보는 보호자다.",
    "본인이 직접 겪는 것처럼 서술하지 않는다. 관찰과 걱정의 위치를 유지한다.",
    "아이를 평가하거나 원인으로 지목하는 문장을 쓰지 않는다.",
  ],
  family: [
    "화자는 집안의 일을 대표해 정리하려는 가족 구성원이다.",
    "특정 개인을 원인으로 지목하지 않는다. 집안 전체의 흐름으로 서술한다.",
    "조상·집안 관련 서술은 단정하지 않고 '함께 살펴본다'는 위치를 유지한다.",
  ],
};

/* situation 단위 상담 문형 오버라이드
   spec 문형의 화자와 어긋나는 건만 등재한다. 나머지는 spec 값을 그대로 쓴다. */
export const SITUATION_CONSULT = {
  study_exam: {
    question: "언제부터 시험 결과가 실력과 달라졌다고 느끼셨나요?",
    questions: [
      "언제부터 시험만 보면 결과가 달라졌나요?",
      "평소 실력과 시험 결과의 차이가 큰 편인가요?",
      "중요한 시험마다 비슷한 일이 반복되나요?",
      "시험을 앞두고 가장 걱정되는 것은 무엇인가요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "시험 결과가 계속 어긋난다면",
    soloPhase: "결과를 확인한 날 아무에게도 말하지 못하고, 다음 시험까지 혼자 버티는 시간",
  },
  study_job: {
    question: "언제부터 결과가 오지 않는다고 느끼셨나요?",
    questions: [
      "언제부터 지원 결과가 달라졌나요?",
      "면접까지는 이어지는 편인가요?",
      "같은 단계에서 반복해 멈춘다고 느끼시나요?",
      "그 무렵 달라진 일이 있었나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "지원 결과가 계속 오지 않는다면",
    soloPhase: "주변에는 준비 중이라고만 말해두고, 메일함을 혼자 확인하는 시간",
  },
  spirit_child: {
    question: "아이가 언제부터 그런 상태였나요?",
    questions: [
      "언제부터 그런 상태가 이어졌나요?",
      "진료와 검사에서는 어떤 이야기를 들으셨나요?",
      "그 무렵 아이 주변에 달라진 일이 있었나요?",
      "비슷한 일이 전에도 있었나요?",
      "지금 가장 궁금하신 것은 무엇인가요?",
    ],
    cta: "아이 상태가 오래 이어지고 있다면",
    soloPhase: "병원을 오가면서도 뚜렷한 설명을 듣지 못한 채 밤을 지새우는 시간",
  },

  /* ── CTA situation 분리 (세션102) ──
     ★ 실측 문제: cta가 spec 단위여서 재물 글(biz_leak)에 사업 CTA가 붙었다.
       biz 하나에 사업·계약·동업·재물·부채가 섞여 있어 spec 단위로는 구분이 불가능하다.
       화자(SITUATION_NARRATOR)·제목축(TITLE_AXIS_BY_SITUATION)에서 이미 겪은 것과 같은 층위 문제다.
     원칙: CTA도 situation 단위로 확정한다. spec은 기본값일 뿐이다.
     등재 기준: spec CTA가 그 상황의 주제와 어긋나는 것만. 맞는 것은 등재하지 않는다.
     cta만 쓴다 — question/questions/soloPhase는 spec 기본값을 그대로 상속한다. */

  // biz — 사업·계약·동업·재물·부채가 한 spec에 섞여 있다
  biz_lostGuest: { cta: "손님이 줄어 걱정이 이어지고 있다면" },
  biz_contract:  { cta: "계약이 자꾸 어긋난다고 느끼신다면" },
  biz_partner:   { cta: "함께 일하는 사람과 계속 어긋난다면" },
  biz_start:     { cta: "새로 시작하는 일을 두고 망설이고 계신다면" },
  biz_leak:      { cta: "돈이 자꾸 빠져나가는 것 같아 답답하시다면" },
  biz_debt:      { cta: "빚이 좀처럼 줄지 않아 답답하시다면" },

  // doc — 계약 외 매매·투자
  doc_sell:      { cta: "매매 시기를 두고 결정이 서지 않는다면" },
  doc_invest:    { cta: "투자 판단이 서지 않아 망설이고 계신다면" },

  // spirit — 몸·꿈·검사로 주제가 갈린다
  spirit_tired:  { cta: "몸 상태가 오래 이어지고 있다면" },
  spirit_dream:  { cta: "같은 꿈이 반복되어 마음에 걸린다면" },
  spirit_sign:   { cta: "검사에서는 이상이 없다는데 불편함이 이어진다면" },

  // ancestor — 가족·이사·조상 의례
  anc_family:    { cta: "가족 중 한 사람의 일이 오래 이어지고 있다면" },
  anc_move:      { cta: "이사 뒤에도 일이 풀리지 않는다고 느끼신다면" },
  anc_rite:      { cta: "조상 일로 마음에 걸리는 것이 있다면" },

  // marriage — 시기·결정·배우자·이별
  mar_late:      { cta: "결혼 시기가 늦어져 마음이 무거우시다면" },
  mar_decide:    { cta: "결혼을 두고 결정이 서지 않는다면" },
  mar_spouse:    { cta: "배우자와의 일로 마음이 무거우시다면" },
  mar_back:      { cta: "헤어진 뒤 마음 정리가 어렵다면" },
};

/* 상담 문형 조회 — situation 우선, spec 폴백.
   ★ 호출 계약 변경: getConsultLines(specId, situationId)
     situationId 하나만 넘겨도 spec을 역산한다(단일 인자 호환). */
export function getConsultLines(specId, situationId) {
  let sid = situationId;
  let cid = specId;
  if (!sid && specId && !SHAMAN_CONSULT[specId]) {
    const s = SHAMAN_SITUATIONS.find((x) => x.id === specId);
    if (s) { sid = s.id; cid = s.spec; }
  }
  if (!cid && sid) {
    const s = SHAMAN_SITUATIONS.find((x) => x.id === sid);
    if (s) cid = s.spec;
  }
  const base = SHAMAN_CONSULT[cid] || SHAMAN_CONSULT_FALLBACK;
  const over = (sid && SITUATION_CONSULT[sid]) || null;
  const narrator = getNarrator(cid, sid);
  return { ...base, ...(over || {}), narrator, narratorRules: SHAMAN_NARRATOR_RULES[narrator] };
}

// 의례(굿·천도재·부적) 서술 규칙 — prompts.js에 그대로 주입
export const SHAMAN_RITUAL_RULE = [
  "의례는 '이런 절차가 있다'는 설명까지만 서술한다.",
  "권유·설득·필요성 단정 금지. 비용·효과·기간 언급 금지.",
  "의례를 하지 않을 경우의 결과를 암시하지 않는다.",
  "결정은 상담 후 본인이 한다는 문장을 유지한다.",
];

/* ─────────────────────────────────────────────
   7. 헬퍼
   ───────────────────────────────────────────── */
export function getSpecialty(id) {
  return SHAMAN_SPECIALTIES.find((s) => s.id === id) || null;
}

export function getSituation(id) {
  return SHAMAN_SITUATIONS.find((s) => s.id === id) || null;
}

export function situationsBySpecialty(specId) {
  return SHAMAN_SITUATIONS.filter((s) => s.spec === specId);
}

export function getNoticesFor(situationId) {
  const s = getSituation(situationId);
  const keys = [];
  if (s) {
    if (s.guard) keys.push(s.guard);
    const sp = getSpecialty(s.spec);
    if (sp && sp.guard && !keys.includes(sp.guard)) keys.push(sp.guard);
  }
  return [...keys.map((k) => SHAMAN_NOTICES[k]).filter(Boolean), SHAMAN_BASE_NOTICE];
}

export function getPhotoCount(specId) {
  const sp = getSpecialty(specId);
  return (sp && sp.photoCount) || SHAMAN_META.photoCount;
}

export function isRitualSpecialty(specId) {
  const sp = getSpecialty(specId);
  return !!(sp && sp.ritual);
}

export function requiresCaseInput(menuId) {
  const m = SHAMAN_MENUS.find((x) => x.id === menuId);
  return !!(m && m.requiresInput);
}
