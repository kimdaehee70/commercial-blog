// lib/shaman-search-intent-data.js
// 무속 Title Engine V2 · Search Intent DB
// 키 = SHAMAN_SITUATIONS.id (shaman-data.js). 이 파일은 데이터 전용.
//
// 흐름:  Search Intent → Title(head) → 기존 Situation → 기존 Body
// 본문·프롬프트·Situation·Photo·CTA·지역/서비스 처리 무접촉.
//
// 원칙: 사람은 "…할 때"를 검색하지 않는다. 지금 머릿속에서 하는 말을 검색한다.
//   ※ SITUATION.name("…할 때")은 그대로 둔다. 제목의 머리만 교체한다.

export const SCHEMA_VERSION = 1;
export const DB_VERSION = 4;   // V4 — 꼬리 5형(현실 · 운 + 궁금증). 세션104

/* 예약 필드 — 값 미사용. ORBIT 관측 누적 후 채운다.
   confidence / searchVolume / competition
   승격 시 phrase 문자열 → { p, confidence, searchVolume, competition } */

export const INTENT_AXES = ['reality', 'solution', 'fortune', 'cause', 'consult'];

/* ═══════════════════════════════════════════════
   검색 퍼널 — 현실 → 운 → 상담  (세션104 V3)
   무속 사용자는 문제를 입력한 뒤 반드시 '운'으로 이동한다.
     소개팅만 하고 끝나요 → 결혼운 → 결혼운 상담
   따라서 제목의 기본형은 2단이다.
     결혼운 · 소개팅만 하고 끝나요 — 혼자 답이 안 나올 때
     └운(업종 의도)  └현실(검색어)   └꼬리(shaman-data.js 소유)
   compound 를 최다 배분한다. 단독 축은 검색 폭을 넓히는 보조.
   ═══════════════════════════════════════════════ */
export const HEAD_MODES = ['reality', 'cause', 'solution'];

export const MODE_WEIGHT = {
  reality: 60,
  cause: 22,
  solution: 18,
};

/* 꼬리 5형 — 현실 → 운 → 궁금증 을 한 문장으로 잇는다.
   ★ 제목은 Reality → Fortune 까지만 책임진다.
     '상담 / 신점 / 사주 보는 곳' 유도는 본문·CTA가 맡는다.
   ★ 운을 명사로 끝내지 않는다. 그러면 태그처럼 읽힌다.
       ✗ 이사운 · 이사 오고 일이 안 풀려요
       ✓ 이사 오고 일이 안 풀려요 · 이사운 때문일까?
   A becauseQ   소개팅만 하고 끝나요 · 결혼운 때문일까?
   B examineQ   공무원 시험 계속 떨어짐 · 시험운을 봐야 할까?
   C relateQ    돈이 안 모여요 · 재물운과 관련이 있을까?
   D blockedQ   손님이 없어요 · 사업운이 막힌 걸까?      (…운 에만 적용)
   E wonderTail 결혼이 늦어져요 · 결혼운이 궁금해질 때 */
export const TAIL_FORMS = ['becauseQ', 'examineQ', 'relateQ', 'blockedQ', 'wonderTail'];

export const TAIL_WEIGHT = {
  becauseQ: 48,
  blockedQ: 20,
  examineQ: 14,
  relateQ: 12,
  wonderTail: 6,
};

// 축 단독 선택용(하위호환). ORBIT 관측 붙으면 이 표만 교체한다.
export const AXIS_WEIGHT = {
  reality: 40,
  solution: 25,
  cause: 22,
  fortune: 13,
};

export const COMPOUND_SEP = ' · ';
// 꼬리 포함 전체 제목이 45자를 넘지 않도록 한다.
export const TITLE_MAXLEN = 44;
// 너무 짧은 제목은 검증(TOO_SHORT)에서 탈락한다. 조립 단계에서 미리 막는다.
export const TITLE_MINLEN = 12;

/* ═══════════════════════════════════════════════
   Search Intent DB — key = situationId
   ═══════════════════════════════════════════════ */
export const SHAMAN_SEARCH_INTENT = {
  /* ── biz · 사업/재물 ─────────────────────── */
  biz_slow: {
    name: '장사가 계속 안될 때',
    version: 2,
    reality: ['손님이 없어요', '장사가 안돼요', '매출이 계속 떨어져요', '손님이 왜 없지', '옆집만 잘돼요'],
    solution: ['손님이 다시 늘까', '장사 풀리는 시기', '가게 흐름이 바뀔까'],
    fortune: ['사업운', '사업운 보는곳', '장사 잘되는 시기', '사업 사주'],
    consult: ['사업운 상담', '신점 상담', '사주 상담'],
    cause: ['장사가 왜 안 풀리지', '가게 터가 안 좋은가', '우리 가게만 왜'],
  },
  biz_lostGuest: {
    name: '손님이 갑자기 끊겼을 때',
    version: 2,
    reality: ['손님이 뚝 끊겼어요', '단골이 안 와요', '예약이 안 들어와요', '갑자기 손님이 없어요'],
    solution: ['손님 다시 올까', '끊긴 단골 돌아올까'],
    fortune: ['사업운', '장사운 보는곳', '매출 회복 시기'],
    consult: ['사업운 상담', '신점 상담', '사주 상담'],
    cause: ['손님이 왜 갑자기 끊겼지', '뭐가 달라진 걸까'],
  },
  biz_contract: {
    name: '계약이 계속 깨질 때',
    version: 2,
    reality: ['계약이 자꾸 깨져요', '다 됐다가 엎어져요', '마지막에 틀어져요'],
    solution: ['이번 계약은 될까', '계약 성사 시기'],
    fortune: ['계약운', '사업운 보는곳', '문서운'],
    consult: ['계약운 상담', '신점 상담', '사주 상담'],
    cause: ['계약이 왜 자꾸 깨지지', '계약운이 없나'],
  },
  biz_partner: {
    name: '동업자와 계속 어긋날 때',
    version: 2,
    reality: ['동업자가 이상해요', '동업자랑 안 맞아요', '믿었던 사람한테 당했어요'],
    solution: ['동업 정리해야 할까', '동업 계속해도 될까'],
    fortune: ['대인운', '인복 보는곳', '동업 사주'],
    consult: ['대인운 상담', '신점 상담', '사주 상담'],
    cause: ['사람복이 없나', '왜 사람마다 이럴까'],
  },
  biz_start: {
    name: '새로 시작해도 될지 모를 때',
    version: 2,
    reality: ['창업해도 될까', '여기서 장사하면 될까', '이 자리 괜찮을까'],
    solution: ['개업 날짜 언제가 좋을까', '개업 자리로 괜찮을까', '개업 택일'],
    fortune: ['창업운', '사업운 보는곳', '개업 좋은 날'],
    consult: ['창업운 상담', '신점 상담', '사주 상담'],
    cause: ['장사 체질인가', '사업하면 안 되는 사주'],
  },
  biz_tangled: {
    name: '하는 일마다 꼬일 때',
    version: 2,
    reality: ['되는 일이 없어요', '하는 일마다 꼬여요', '왜 이렇게 안 풀리지'],
    solution: ['흐름이 바뀔 수 있을까', '언제쯤 풀릴까'],
    fortune: ['올해 운세', '신년운세', '토정비결', '운세 보는곳'],
    consult: ['올해 운세 상담', '신점 상담', '사주 상담'],
    cause: ['삼재인가', '왜 되는 일이 없지', '사주 때문인가'],
  },
  biz_leak: {
    name: '돈이 계속 새어나갈 때',
    version: 2,
    reality: ['돈이 안 모여요', '돈이 자꾸 나가요', '왜 돈이 안 모이지', '남는 게 없어요'],
    solution: ['돈 언제쯤 모을 수 있을까', '새는 돈을 막을 수 있을까'],
    fortune: ['재물운', '재물운 보는곳', '돈 들어오는 시기', '재물 사주'],
    consult: ['재물운 상담', '신점 상담', '사주 상담'],
    cause: ['돈이 왜 안 붙지', '재물복이 없나', '돈복 없는 사주'],
  },
  biz_debt: {
    name: '빚이 줄지 않을 때',
    version: 2,
    reality: ['빚이 안 줄어요', '이자만 내고 있어요', '갚아도 그대로예요', '돌려막기 중이에요'],
    solution: ['빚에서 언제쯤 벗어날까', '빌려준 돈 받을 수 있을까'],
    fortune: ['금전운', '재물운 보는곳', '돈 풀리는 시기'],
    consult: ['금전운 상담', '신점 상담', '사주 상담'],
    cause: ['돈 문제가 왜 계속되지', '빚이 왜 안 끊기지'],
  },

  /* ── doc · 계약/부동산 ───────────────────── */
  doc_home: {
    name: '집을 계약해도 될지 고민될 때',
    version: 2,
    reality: ['이 집 계약해도 될까', '전세 들어가도 될까', '이사 가도 될까'],
    solution: ['이 집으로 정해도 될까', '이사 날짜 언제가 좋을까', '집 기운을 봐야 할까'],
    fortune: ['이사운', '이사 좋은 날', '손 없는 날', '이사 택일'],
    consult: ['이사운 상담', '신점 상담', '사주 상담'],
    cause: ['집터가 안 좋은가', '이 집이랑 안 맞나'],
  },
  doc_store: {
    name: '상가 계약을 앞두고 있을 때',
    version: 2,
    reality: ['이 상가 계약해도 될까', '이 건물 사도 될까', '권리금 줘도 될까'],
    solution: ['이 자리에서 장사해도 될까', '계약 날짜 언제가 좋을까'],
    fortune: ['사업운', '계약 좋은 날', '재물운 보는곳'],
    consult: ['사업운 상담', '신점 상담', '사주 상담'],
    cause: ['이 자리가 안 좋은가', '전 주인이 왜 나갔지'],
  },
  doc_sell: {
    name: '부동산 매매 시기를 정하기 어려울 때',
    version: 2,
    reality: ['지금 팔아도 될까', '집이 안 나가요', '더 기다려야 하나'],
    solution: ['집이 언제쯤 나갈까', '언제 파는 게 좋을까'],
    fortune: ['매매운', '재물운 보는곳', '집 파는 시기'],
    consult: ['매매운 상담', '신점 상담', '사주 상담'],
    cause: ['왜 이렇게 안 나갈까', '부동산운이 없나'],
  },
  doc_deadline: {
    name: '중요한 계약 날짜를 앞두고 있을 때',
    version: 2,
    reality: ['날짜를 못 정하겠어요', '언제 하는 게 좋을까'],
    solution: ['날짜를 언제로 잡아야 할까', '계약 날짜 언제가 좋을까', '이사 날짜 언제가 좋을까'],
    fortune: ['택일', '손 없는 날', '좋은 날 보는곳', '길일'],
    consult: ['택일 상담', '신점 상담', '사주 상담'],
    cause: ['날짜 따라 달라지나', '아무 날에나 하면 안 되나'],
  },
  doc_invest: {
    name: '투자 판단이 서지 않을 때',
    version: 2,
    reality: ['투자해도 될까', '지금 들어가도 될까', '손해 볼까 겁나요'],
    solution: ['언제 들어가는 게 좋을까', '지금 계약해도 될까'],
    fortune: ['투자운', '재물운 보는곳', '돈 굴리는 시기'],
    consult: ['투자운 상담', '신점 상담', '사주 상담'],
    cause: ['왜 손대는 것마다 손해지', '투자운이 없나'],
  },

  /* ── study · 자녀/학업/취업 ──────────────── */
  study_defiant: {
    name: '아이가 말을 안 들을 때',
    version: 2,
    reality: ['아이가 말을 안 들어요', '아이랑 대화가 안 돼요', '사춘기 아들 때문에 힘들어요'],
    solution: ['아이 마음이 돌아올까', '아이를 어떻게 대해야 할까'],
    fortune: ['자녀운', '자녀운 보는곳', '아이 사주'],
    consult: ['자녀운 상담', '신점 상담', '사주 상담'],
    cause: ['아이가 왜 이럴까', '아이랑 안 맞나'],
  },
  study_changed: {
    name: '아이가 갑자기 변했을 때',
    version: 2,
    reality: ['아이가 갑자기 변했어요', '아이가 방에서 안 나와요', '예전엔 안 그랬어요'],
    solution: ['아이 마음을 알 수 있을까', '아이가 예전으로 돌아올까'],
    fortune: ['자녀운', '아이 사주', '자녀운 보는곳'],
    consult: ['자녀운 상담', '신점 상담', '사주 상담'],
    cause: ['아이한테 무슨 일이 있었나', '누구 영향인가'],
  },
  study_refuse: {
    name: '아이가 학교를 거부할 때',
    version: 2,
    reality: ['아이가 학교를 안 가요', '등교 거부', '아침마다 안 일어나요'],
    solution: ['아이가 학교에 다시 갈까', '아이가 마음을 열까'],
    fortune: ['자녀운', '학업운', '자녀운 보는곳'],
    consult: ['자녀운 상담', '신점 상담', '사주 상담'],
    cause: ['학교를 왜 싫어할까', '아이가 뭘 겁내나'],
  },
  study_noStudy: {
    name: '아이가 공부를 안 할 때',
    version: 2,
    reality: ['아이가 공부를 안 해요', '성적이 안 올라요', '앉아 있질 못해요'],
    solution: ['아이가 언제쯤 집중할까', '아이 맞는 공부법'],
    fortune: ['학업운', '학업운 보는곳', '성적 오르는 시기'],
    consult: ['학업운 상담', '신점 상담', '사주 상담'],
    cause: ['공부 체질이 아닌가', '왜 집중을 못 할까'],
  },
  study_exam: {
    name: '시험만 보면 떨어질 때',
    version: 2,
    reality: ['시험 계속 떨어져요', '공무원 시험 계속 떨어짐', '공부는 했는데 안 붙어요', '또 떨어졌어요'],
    solution: ['시험 언제쯤 붙을까', '이번 시험은 붙을까', '시험 잘 보는 시기'],
    fortune: ['시험운', '합격운', '시험운 보는곳', '시험 사주'],
    consult: ['시험운 상담', '신점 상담', '사주 상담'],
    cause: ['시험운이 없나', '왜 마지막에 미끄러지지'],
  },
  study_career: {
    name: '아이 진로가 걱정될 때',
    version: 2,
    reality: ['아이 진로가 걱정돼요', '하고 싶은 게 없대요', '재수시켜야 하나'],
    solution: ['아이 적성을 봐야 할까', '진로를 정해줘도 될까'],
    fortune: ['진로운', '자녀운 보는곳', '아이 적성 사주'],
    consult: ['진로운 상담', '신점 상담', '사주 상담'],
    cause: ['우리 아이는 뭐가 맞을까', '이 길이 맞나'],
  },
  study_job: {
    name: '취업이 계속 안 될 때',
    version: 2,
    reality: ['취업이 안돼요', '서류 계속 탈락', '면접 계속 떨어짐', '취업 왜 안되지'],
    solution: ['언제쯤 취업될까', '면접은 붙을까', '취업 잘되는 시기'],
    fortune: ['취업운', '취업운 보는곳', '취업 사주', '직장운'],
    consult: ['취업운 상담', '신점 상담', '사주 상담'],
    cause: ['취업이 왜 안 되지', '취업운이 없나', '삼재라서 그런가'],
  },
  study_leftHome: {
    name: '아이가 집을 나갔을 때',
    version: 2,
    reality: ['아이가 가출했어요', '아이 연락이 안 돼요', '밤에 안 들어와요'],
    solution: ['아이를 찾을 수 있을까', '아이가 돌아올까'],
    fortune: ['자녀운', '가정운', '자녀운 보는곳'],
    consult: ['자녀운 상담', '신점 상담', '사주 상담'],
    cause: ['왜 집을 나갔을까', '누구 때문일까'],
  },

  /* ── spirit · 몸/마음 ────────────────────── */
  spirit_tired: {
    name: '계속 몸이 안 좋을 때',
    version: 2,
    reality: ['계속 몸이 안 좋아요', '기운이 없어요', '자고 일어나도 피곤해요'],
    solution: ['몸이 언제쯤 나아질까', '몸이 편해질까'],
    fortune: ['건강운', '건강운 보는곳', '건강 사주'],
    consult: ['건강운 상담', '신점 상담', '사주 상담'],
    cause: ['기운이 눌린 건가', '집 때문인가 사람 때문인가'],
  },
  spirit_anxious: {
    name: '이유 없이 불안할 때',
    version: 2,
    reality: ['이유 없이 불안해요', '가슴이 답답해요', '잠을 못 자요', '나쁜 생각이 자꾸 들어요'],
    solution: ['불안이 가라앉을까', '마음이 진정될까'],
    fortune: ['올해 운세', '건강운 보는곳'],
    consult: ['올해 운세 상담', '신점 상담', '사주 상담'],
    cause: ['왜 이렇게 불안하지', '뭔가 붙은 건가'],
  },
  spirit_dream: {
    name: '같은 꿈이 반복될 때',
    version: 2,
    reality: ['같은 꿈을 계속 꿔요', '가위에 자주 눌려요', '돌아가신 분 꿈', '악몽을 계속 꿔요'],
    solution: ['악몽이 멈출까', '꿈 계속 꿀 때'],
    fortune: ['꿈 해몽 보는곳', '조상꿈 해몽', '돌아가신 분 꿈 의미'],
    consult: ['꿈 해몽 상담', '신점 상담', '사주 상담'],
    cause: ['같은 꿈을 왜 계속 꾸지', '조상이 뭘 알리나'],
  },
  spirit_child: {
    name: '아이가 자꾸 아플 때',
    version: 2,
    reality: ['아이가 자꾸 아파요', '아이가 밤에 자꾸 울어요', '병원에선 괜찮대요'],
    solution: ['아이 기운이 돌아올까', '아이가 편해질까'],
    fortune: ['자녀운', '아이 건강운', '아이 사주'],
    consult: ['자녀운 상담', '신점 상담', '사주 상담'],
    cause: ['우리 아이만 왜', '뭘 보고 놀랐나'],
  },
  spirit_sign: {
    name: '검사에서는 이상이 없다는데 계속 불편할 때',
    version: 2,
    reality: ['병원에서 이상 없대요', '검사해도 원인이 없어요', '약을 먹어도 안 나아요'],
    solution: ['신기가 있는지 봐야 할까', '원인 못 찾을 때'],
    fortune: ['신기 사주', '건강운 보는곳'],
    consult: ['신기 사주 상담', '신점 상담', '사주 상담'],
    cause: ['신기가 있나', '신병인가', '왜 원인이 안 나오지'],
  },

  /* ── ancestor · 집안 ─────────────────────── */
  anc_repeat: {
    name: '집안에 안 좋은 일이 반복될 때',
    version: 2,
    reality: ['집안일이 자꾸 생겨요', '집안에 안 좋은 일이 반복돼요', '집안일이 한꺼번에 겹쳐요'],
    solution: ['집안을 정리해야 할까', '집안 흐름이 바뀔까'],
    fortune: ['집안운', '가정운 보는곳', '올해 운세'],
    consult: ['집안운 상담', '신점 상담', '사주 상담'],
    cause: ['조상 때문인가', '집안 내력인가', '왜 대대로 이럴까'],
  },
  anc_family: {
    name: '가족 중 한 사람이 계속 아플 때',
    version: 2,
    reality: ['가족이 계속 아파요', '한 사람만 계속 아파요', '병원을 옮겨도 그대로예요'],
    solution: ['가족 기운이 돌아올까', '집안을 살펴봐야 할까'],
    fortune: ['가정운', '건강운 보는곳'],
    consult: ['가정운 상담', '신점 상담', '사주 상담'],
    cause: ['왜 그 사람만 아플까', '집안에 뭐가 있나'],
  },
  anc_move: {
    name: '이사를 가도 일이 안 풀릴 때',
    version: 2,
    reality: ['이사 오고 일이 안 풀려요', '이사 오고 계속 아파요', '집에 있으면 답답해요'],
    solution: ['집 기운이 바뀔까', '이사 후에 뭘 해야 할까'],
    fortune: ['이사운', '집터 보는곳', '올해 운세'],
    consult: ['이사운 상담', '신점 상담', '사주 상담'],
    cause: ['집터가 안 좋은가', '이사 오고 왜 이럴까'],
  },
  anc_rite: {
    name: '조상 관련해 마음에 걸리는 일이 있을 때',
    version: 2,
    reality: ['제사를 못 지내고 있어요', '묘를 옮기라는 말을 들었어요', '마음에 계속 걸려요'],
    solution: ['제사를 지내야 할까', '집안일을 정리해야 할까'],
    fortune: ['집안운', '조상 사주', '가정운 보는곳'],
    consult: ['집안운 상담', '신점 상담', '사주 상담'],
    cause: ['조상 때문인가', '제사 안 지내서 그런가'],
  },

  /* ── marriage · 인연 ─────────────────────── */
  mar_late: {
    name: '결혼이 늦어질 때',
    version: 2,
    reality: ['소개팅만 하고 끝나요', '남자가 안 생겨요', '좋은 사람이 안 생겨요', '썸만 타다 끝나요', '결혼이 늦어져요'],
    solution: ['좋은 인연 만날 수 있을까', '언제쯤 결혼할까', '결혼 시기 언제가 좋을까'],
    fortune: ['결혼운', '인연운', '배우자운', '결혼운 보는곳', '결혼 사주'],
    consult: ['결혼운 상담', '신점 상담', '사주 상담'],
    cause: ['결혼이 왜 늦어지지', '결혼운이 없나', '인연복이 없나'],
  },
  mar_alone: {
    name: '인연이 계속 안 이어질 때',
    version: 2,
    reality: ['만나도 오래 못 가요', '항상 흐지부지돼요', '제 마음만 큰 것 같아요'],
    solution: ['오래 갈 사람일까', '좋은 사람 만날까'],
    fortune: ['인연운', '애정운', '인연운 보는곳', '궁합'],
    consult: ['인연운 상담', '신점 상담', '사주 상담'],
    cause: ['왜 이런 사람만 만나지', '인연이 짧은 사주'],
  },
  mar_decide: {
    name: '결혼을 결정하기 어려울 때',
    version: 2,
    reality: ['이 사람이랑 결혼해도 될까', '확신이 안 서요', '결혼 고민돼요'],
    solution: ['두 사람 잘 맞을까', '결혼 날짜 언제가 좋을까'],
    fortune: ['궁합', '궁합 보는곳', '결혼운', '결혼 택일'],
    consult: ['궁합 상담', '신점 상담', '사주 상담'],
    cause: ['이 사람이랑 맞나', '왜 이렇게 망설여지지'],
  },
  mar_spouse: {
    name: '배우자 문제로 힘들 때',
    version: 2,
    reality: ['남편 바람', '남편이 이상해요', '아내가 달라졌어요', '이혼해야 하나'],
    solution: ['그 사람 마음이 돌아올까', '가정을 지킬 수 있을까'],
    fortune: ['부부운', '궁합', '부부운 보는곳', '애정운'],
    consult: ['부부운 상담', '신점 상담', '사주 상담'],
    cause: ['궁합이 안 맞나', '왜 이런 일이 반복되지'],
  },
  mar_back: {
    name: '헤어진 뒤 정리가 안 될 때',
    version: 2,
    reality: ['헤어졌는데 잊히지가 않아요', '연락이 올까', '다시 만날 수 있을까'],
    solution: ['다시 이어질까', '마음을 정리해야 할까'],
    fortune: ['재회운', '인연운', '애정운 보는곳'],
    consult: ['재회운 상담', '신점 상담', '사주 상담'],
    cause: ['이 인연이 여기까지인가', '왜 못 놓지'],
  },
};

/* ═══════════════════════════════════════════════
   조회 헬퍼 — shaman-data.js 에서만 호출
   ═══════════════════════════════════════════════ */

function phraseOf(item) {
  return typeof item === 'string' ? item : (item && item.p) || '';
}

export function hasIntent(situationId) {
  return !!SHAMAN_SEARCH_INTENT[situationId];
}

/* 축 1개 가중 선택 — 하위호환 유지. 시그니처 불변. */
export function pickAxis(exclude = []) {
  const base = ['reality', 'solution', 'fortune', 'cause'];
  const cand = base.filter((a) => !exclude.includes(a));
  const pool = cand.length ? cand : base;
  const total = pool.reduce((s, a) => s + AXIS_WEIGHT[a], 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= AXIS_WEIGHT[a];
    if (r <= 0) return a;
  }
  return pool[pool.length - 1];
}

/* 가중 선택 공통 */
function weighted(list, table, exclude = []) {
  const cand = list.filter((x) => !exclude.includes(x));
  const pool = cand.length ? cand : list;
  const total = pool.reduce((s, x) => s + table[x], 0);
  let r = Math.random() * total;
  for (const x of pool) {
    r -= table[x];
    if (r <= 0) return x;
  }
  return pool[pool.length - 1];
}

export function pickMode(exclude = []) {
  return weighted(HEAD_MODES, MODE_WEIGHT, exclude);
}

export function pickTailForm(exclude = []) {
  return weighted(TAIL_FORMS, TAIL_WEIGHT, exclude);
}

function one(list) {
  const a = (list || []).map(phraseOf).filter(Boolean);
  return a.length ? a[Math.floor(Math.random() * a.length)] : null;
}

/* 조사 — 받침 판정 */
function hasJong(w = '') {
  const s = String(w);
  const c = s.charCodeAt(s.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}
const josaI = (w) => (hasJong(w) ? '이' : '가');   // 결혼운이 / 사주가
const josaEul = (w) => (hasJong(w) ? '을' : '를'); // 결혼운을 / 사주를
const josaGwa = (w) => (hasJong(w) ? '과' : '와'); // 결혼운과 / 사주와

/* 운 라벨 — 업종 의도가 분명한 형태만 꼬리에 쓴다 */
const FORTUNE_LABEL = /(운|사주|궁합)$/;

/* ★ 운(Fortune) 라벨 예외 — 세션105
   '조상운 / 신기운 / 집터운'은 실제 검색어가 아니다. 사람들은 '조상 때문인가'로 검색한다.
   또 biz_tangled·doc_deadline·spirit_dream 은 /(운|사주|궁합)$/ 라벨이 아예 없어
   fortune 풀 전체로 fallback 되어 '토정비결과 관련이 있을까?' 같은 제목이 나왔다.
   → situationId 별로 꼬리에 붙일 라벨을 직접 지정한다. 지정되면 이 목록만 쓴다. */
export const FORTUNE_LABEL_OVERRIDE = {
  biz_tangled:  ['올해 운세', '신년운세', '삼재'],
  biz_partner:  ['대인운', '인복', '동업 사주'],
  doc_deadline: ['날짜', '택일'],
  spirit_dream: ['조상', '꿈'],
  spirit_sign:  ['신기', '신병'],
  anc_repeat:   ['조상', '집안운', '가정운'],
  anc_rite:     ['조상', '집안운'],
  anc_move:     ['이사운', '집터'],
};

function fortuneLabel(row, situationId) {
  const ov = FORTUNE_LABEL_OVERRIDE[situationId];
  if (ov && ov.length) return one(ov);
  const all = (row.fortune || []).map(phraseOf).map((p) => p.replace(' 보는곳', ''));
  const labels = all.filter((p) => FORTUNE_LABEL.test(p));
  return one(labels.length ? labels : all);
}

/* 제목 1개 조립 — 현실(또는 원인·해결) → 운
   ★ 꼬리를 shaman-data.js 풀에서 가져오지 않고 여기서 완성한다.
     '무엇을 물어봐야 하나' 류는 검색되지 않고 업종 의도를 흐린다.
     또 그 문형이 titleNeedsQuestions()를 켜서 본문이 질문 나열로 흘렀다. */
function buildTitle(row, situationId) {
  const head = one(row[pickMode()]);
  const f = fortuneLabel(row, situationId);
  if (!head || !f) return null;
  // head에 이미 운 표현이 있으면 꼬리와 겹친다 — '시험운이 없나 · 시험운 때문일까?'
  if (/운|사주|궁합/.test(head)) return null;
  // ★ 세션105 — 라벨 자체가 head에 있어도 겹친다. '돌아가신 분 꿈 · 꿈 때문일까?'
  if (head.includes(f.replace(/\s+/g, '')) || head.includes(f)) return null;

  // '막힌 걸까'는 흐름을 가진 …운 에만 붙는다. 사주·궁합에는 쓰지 않는다.
  const isWoon = /운$/.test(f);
  let form = pickTailForm();
  if (form === 'blockedQ' && !isWoon) form = 'becauseQ';

  const tail =
    form === 'examineQ' ? `${f}${josaEul(f)} 봐야 할까?` :
    form === 'relateQ' ? `${f}${josaGwa(f)} 관련이 있을까?` :
    form === 'blockedQ' ? `${f}${josaI(f)} 막힌 걸까?` :
    form === 'wonderTail' ? `${f}${josaI(f)} 궁금해질 때` :
    `${f} 때문일까?`;

  let t = head + COMPOUND_SEP + tail;
  if (t.length > TITLE_MAXLEN) t = head + COMPOUND_SEP + f + ' 때문일까?';
  if (t.length > TITLE_MAXLEN || t.length < TITLE_MINLEN) return null;
  return t;
}

/* 완성 제목 n개 — shaman-data.js situationTitlePatterns 가 그대로 사용 */
export function intentTitlesFor(situationId, n = 2) {
  const row = SHAMAN_SEARCH_INTENT[situationId];
  if (!row) return [];
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 60) {
    const t = buildTitle(row, situationId);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/* 하위호환 — head 문자열만 필요할 때 */
export function intentPhrasesFor(situationId, n = 2) {
  const row = SHAMAN_SEARCH_INTENT[situationId];
  if (!row) return [];
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 40) {
    const h = one(row[pickMode()]);
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}

export function allIntentPhrases(situationId) {
  const row = SHAMAN_SEARCH_INTENT[situationId];
  if (!row) return [];
  const out = [];
  for (const axis of INTENT_AXES) {
    for (const item of row[axis] || []) {
      const p = phraseOf(item);
      if (p) out.push(p);
    }
  }
  return out;
}

export const SHAMAN_INTENT_KEYS = Object.keys(SHAMAN_SEARCH_INTENT);
