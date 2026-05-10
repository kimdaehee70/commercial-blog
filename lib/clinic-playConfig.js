// =============================================
// lib/clinic-playConfig.js
// 병원 블로그 전환형 FLOW ENGINE v1.0
//
// 반장의 playConfig.js와 동일 구조
// 각 섹션을 "행동 → 대사 → 감정" 단위로 분해
// generate.js가 섹션별 프롬프트 생성 시 참고
// =============================================

// ============================================================
// FLOW ENGINE — 시술별 섹션 흐름 분해
// ============================================================

export const CLINIC_FLOW_ENGINE = {

  // ── 자연유착 쌍꺼풀 ───────────────────────────────────────
  자연유착쌍꺼풀: [
    {
      section:  "concern",       // SECTION 1: 고민
      label:    "티 날까 봐 망설임",
      actions:  ["거울 앞에서 눈 살펴보기", "SNS 후기 검색", "지인에게 물어보기"],
      dialogue: '"티 나면 어쩌지"라는 생각에 검색만 몇 달째 했다.',
      emotion:  "불안 → 망설임 → 결심",
    },
    {
      section:  "situation",     // SECTION 2: 상황
      label:    "고민의 계기",
      actions:  ["사진 찍다가 눈이 마음에 안 듦", "친구 수술 결과 보고 자극받음", "상담 예약 누름"],
      dialogue: '사진 속 내 눈이 너무 달라 보여서 결국 예약 버튼을 눌렀다.',
      emotion:  "막연한 불만 → 구체적 계기 → 행동",
    },
    {
      section:  "consult",       // SECTION 3: 상담 흐름 ★
      label:    "상담실에서",
      actions:  ["거울 보며 라인 상담", "자연유착 설명 듣기", "전후 사진 비교", "매몰과 차이 질문"],
      dialogue: '"자연스럽게 될 수 있어요?" 라고 물었더니 사진을 보여주면서 설명해줬다.',
      emotion:  "긴장 → 질문 → 설명에 안도 → 결정",
    },
    {
      section:  "reason",        // SECTION 4: 선택 이유 ★
      label:    "자연유착으로 결정한 이유",
      actions:  ["매몰 vs 자연유착 비교", "회복 기간 확인", "가격 비교", "결정 순간"],
      dialogue: '매몰은 풀릴 수 있다는 말에 자연유착으로 바꿨다.',
      emotion:  "비교 → 불안 해소 → 확신 → 결정",
    },
    {
      section:  "result",        // SECTION 5: 결과 체감
      label:    "수술 후 회복",
      actions:  ["3일 붓기 최고조", "선글라스 쓰고 출근", "1주일 후 실밥 제거", "한 달 후 거울"],
      dialogue: '한 달이 지나니까 친한 친구도 한동안 몰랐다.',
      emotion:  "걱정 → 예상보다 빠른 회복 → 만족 → 잘 했다는 확신",
    },
    {
      section:  "closing",       // SECTION 6: 정리
      label:    "마무리",
      actions:  ["결과 사진 비교", "결정 돌아보기"],
      dialogue: '티 날까 봐 3개월을 고민했는데, 지금은 그냥 하길 잘했다는 생각만 든다.',
      emotion:  "뿌듯함 → 자연스러운 선택 유도",
    },
  ],

  // ── 실리프팅 ─────────────────────────────────────────────
  실리프팅: [
    {
      section:  "concern",
      label:    "탄력 저하 인식",
      actions:  ["거울 보다가 낯선 내 얼굴", "사진 찍다가 달라진 느낌", "비수술 방법 검색"],
      dialogue: '거울을 보다가 예전이랑 뭔가 다르다는 걸 느꼈다.',
      emotion:  "무기력 → 인식 → 검색 시작",
    },
    {
      section:  "situation",
      label:    "탐색의 계기",
      actions:  ["주변에서 받았다는 말 들음", "SNS에서 전후 사진 봄", "상담 예약 결심"],
      dialogue: '주변 언니가 받았다는 말을 듣고 나서야 진지하게 알아보기 시작했다.',
      emotion:  "막연함 → 구체적 탐색 → 결심",
    },
    {
      section:  "consult",
      label:    "상담실에서",
      actions:  ["얼굴 상태 확인", "실 종류·개수 설명 듣기", "울쎄라와 비교 질문", "예상 결과 시뮬레이션"],
      dialogue: '"효과가 실제로 있나요?" 라고 직접 물었다.',
      emotion:  "의심 → 구체적 설명에 신뢰 → 결정",
    },
    {
      section:  "reason",
      label:    "실리프팅으로 결정한 이유",
      actions:  ["울쎄라 통증·비용 부담", "실리프팅 즉각 변화 확인", "회복 기간 짧은 점", "결정 순간"],
      dialogue: '울쎄라는 아프다는 말에 실리프팅으로 결정했다.',
      emotion:  "비교 → 부담 해소 → 확신",
    },
    {
      section:  "result",
      label:    "시술 후 경과",
      actions:  ["당일 즉각적인 변화", "2~3일 멍·붓기", "1주일 후 자연스러워짐", "3개월 후 사진 비교"],
      dialogue: '친구가 피부 좋아졌냐고 물어봤을 때 속으로 웃었다.',
      emotion:  "즉각 변화 → 서서히 정착 → 만족",
    },
    {
      section:  "closing",
      label:    "마무리",
      actions:  ["전후 비교", "결정 돌아보기"],
      dialogue: '수술 없이 이 정도 변화면 충분하다는 생각이 든다.',
      emotion:  "만족 → 자연스러운 권유",
    },
  ],

  // ── 피코레이저 ───────────────────────────────────────────
  피코레이저: [
    {
      section:  "concern",
      label:    "잡티·모공 불만족",
      actions:  ["선크림 발라도 잡티 신경 쓰임", "화장이 잘 안 먹는 느낌", "피부과 가봐야겠다는 생각"],
      dialogue: '선크림을 아무리 발라도 잡티가 계속 신경 쓰였다.',
      emotion:  "불만족 → 탐색 결심",
    },
    {
      section:  "situation",
      label:    "피부과 가게 된 계기",
      actions:  ["피코레이저 정보 검색", "후기 읽기", "상담 예약"],
      dialogue: '뭘 해야 할지 몰라서 일단 상담만 받아보자는 마음으로 예약했다.',
      emotion:  "막막함 → 일단 해보자",
    },
    {
      section:  "consult",
      label:    "피부 진단 상담",
      actions:  ["기기로 피부 진단", "잡티·모공·색소 분석", "시술 종류 설명", "횟수 안내"],
      dialogue: '"제 피부에 맞는 시술이 뭔가요?" 라고 물었더니 기기로 먼저 봤다.',
      emotion:  "막막함 → 진단에 신뢰 → 구체적 계획에 결정",
    },
    {
      section:  "reason",
      label:    "피코레이저로 결정한 이유",
      actions:  ["토닝과 비교", "복합 개선 가능한 점", "당일 일상복귀 확인", "결정"],
      dialogue: '"잡티랑 모공 같이 잡으려면 피코가 낫습니다"라는 말에 결정이 됐다.',
      emotion:  "비교 → 명확한 근거 → 확신",
    },
    {
      section:  "result",
      label:    "시술 후 경과",
      actions:  ["첫 시술 후 발적 2시간", "잡티 딱지 1주일", "2~3회 후 변화 확인", "전후 사진 비교"],
      dialogue: '3회 후 사진을 비교했는데 확실히 달랐다.',
      emotion:  "기다림 → 서서히 변화 → 만족",
    },
    {
      section:  "closing",
      label:    "마무리",
      actions:  ["전후 비교", "유지 관리 방법"],
      dialogue: '피부과 가는 게 이렇게 달라질 줄 몰랐다.',
      emotion:  "만족 → 자연스러운 권유",
    },
  ],

  // ── 눈밑지방재배치 ──────────────────────────────────────────
  눈밑지방재배치: [
    { section: "concern",   label: "다크서클·피곤한 인상",
      actions:  ["아침 거울에서 눈 밑 확인", "화장으로 가리려다 한계 느낌", "검색 시작"],
      dialogue: '"왜 이렇게 피곤해 보이냐"는 말이 제일 듣기 싫었다.',
      emotion:  "속상함 → 해결책 탐색" },
    { section: "situation", label: "탐색의 계기",
      actions:  ["다크서클 개선법 검색", "SNS 전후 사진 봄", "상담 예약"],
      dialogue: '수술 없이 이걸 고칠 수 있다는 걸 처음 알았다.',
      emotion:  "반신반의 → 기대" },
    { section: "consult",   label: "상담실에서",
      actions:  ["눈 밑 상태 진단", "재배치 vs 제거 차이 설명", "회복 기간 질문"],
      dialogue: '"흉터는 어떻게 돼요?" 라고 물었더니 눈꺼풀 안쪽이라 거의 안 보인다고 했다.',
      emotion:  "불안 → 구체적 설명에 신뢰" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["필러와 비교", "반영구 효과 확인", "결정"],
      dialogue: '필러는 계속 맞아야 한다는 말에 재배치로 마음을 굳혔다.',
      emotion:  "비교 → 확신" },
    { section: "result",    label: "시술 후 경과",
      actions:  ["당일: 부기·멍", "3~5일: 멍 옅어짐", "2주: 자연스러워짐", "1개월: 완전 정착"],
      dialogue: '한 달 후 친구가 "요즘 피곤해 보이지 않네"라고 했을 때 속으로 웃었다.',
      emotion:  "회복 기다림 → 변화 확인 → 만족" },
    { section: "closing",   label: "마무리",
      actions:  ["전후 사진 비교", "일상 변화 정리"],
      dialogue: '피곤해 보인다는 말, 이제 안 듣는다.',
      emotion:  "만족 → 자연스러운 권유" },
  ],

  // ── 코성형 ───────────────────────────────────────────────────
  코성형: [
    { section: "concern",   label: "옆모습 콤플렉스",
      actions:  ["옆모습 사진 찍다가 신경 쓰임", "SNS 검색", "상담 예약 고민"],
      dialogue: '옆에서 찍은 사진은 항상 지웠다.',
      emotion:  "콤플렉스 → 탐색" },
    { section: "situation", label: "탐색의 계기",
      actions:  ["코성형 후기 검색", "전후 사진 비교", "상담 결심"],
      dialogue: '자연스러운 결과 사진을 보고 나서야 진지하게 알아보기 시작했다.',
      emotion:  "막연함 → 구체적 탐색" },
    { section: "consult",   label: "상담실에서",
      actions:  ["정면·측면 사진 분석", "보형물 종류 설명", "시뮬레이션"],
      dialogue: '"보형물 말고 자연스럽게 할 수 있나요?" 라고 물었다.',
      emotion:  "긴장 → 신뢰 → 결정 의향" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["필러코와 비교", "반영구 효과 확인", "결정"],
      dialogue: '필러는 유지 비용이 계속 들어서 코성형으로 결정했다.',
      emotion:  "비교 → 확신" },
    { section: "result",    label: "회복 과정",
      actions:  ["당일: 붓기", "1주: 실밥 제거", "1개월: 자연스러움", "3개월: 완전 정착"],
      dialogue: '3개월 후 사진을 보니 전혀 다른 사람이었다.',
      emotion:  "기다림 → 만족" },
    { section: "closing",   label: "마무리",
      actions:  ["전후 비교", "자신감 변화"],
      dialogue: '옆모습 사진, 이제 지우지 않는다.',
      emotion:  "만족 → 자연스러운 권유" },
  ],

  // ── 보톡스 ───────────────────────────────────────────────────
  보톡스: [
    { section: "concern",   label: "사각턱·주름 고민",
      actions:  ["거울 보다가 사각턱 신경 쓰임", "보톡스 정보 검색"],
      dialogue: '얼굴이 커 보인다는 말을 들을 때마다 속상했다.',
      emotion:  "콤플렉스 → 탐색" },
    { section: "situation", label: "결심의 계기",
      actions:  ["주변 후기 들음", "시술 방법 검색", "상담 예약"],
      dialogue: '주사 하나로 이렇게 달라질 수 있다는 게 믿기지 않았다.',
      emotion:  "반신반의 → 기대" },
    { section: "consult",   label: "상담실에서",
      actions:  ["부위 확인", "용량 상담", "효과·기간 설명"],
      dialogue: '"많이 아픈가요?" 라고 물었더니 모기 물린 정도라고 했다.',
      emotion:  "불안 → 안도" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["필러와 비교", "회복 기간 없음 확인", "결정"],
      dialogue: '당일 일상 복귀 가능하다는 말에 바로 결정했다.',
      emotion:  "간편함에 확신" },
    { section: "result",    label: "시술 후 경과",
      actions:  ["당일: 약간 붓기", "3~7일: 효과 시작", "2~3주: 최대 효과"],
      dialogue: '2주 후 거울을 보니 얼굴 윤곽이 달라졌다.',
      emotion:  "기대 → 만족" },
    { section: "closing",   label: "마무리",
      actions:  ["효과 유지 기간", "재시술 계획"],
      dialogue: '3~6개월마다 맞으면 된다니, 부담 없다.',
      emotion:  "만족 → 꾸준한 관리" },
  ],

  // ── 필러 ─────────────────────────────────────────────────────
  필러: [
    { section: "concern",   label: "팔자주름·볼륨 고민",
      actions:  ["팔자주름 신경 쓰임", "나이 들어 보인다는 말", "필러 검색"],
      dialogue: '사진 찍을 때마다 팔자주름이 제일 먼저 눈에 들어왔다.',
      emotion:  "불만족 → 탐색" },
    { section: "situation", label: "결심의 계기",
      actions:  ["필러 후기 검색", "전후 사진 비교", "상담 예약"],
      dialogue: '즉각적인 변화가 가능하다는 말에 솔깃했다.',
      emotion:  "기대 → 결심" },
    { section: "consult",   label: "상담실에서",
      actions:  ["부위별 확인", "용량 결정", "주의사항 설명"],
      dialogue: '"녹는 필러인가요?" 라고 물었고, 필요하면 녹일 수 있다고 했다.',
      emotion:  "불안 → 안도" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["보톡스와 비교", "즉각 효과 확인", "결정"],
      dialogue: '당일 바로 변화가 보인다는 점이 결정적이었다.',
      emotion:  "확신" },
    { section: "result",    label: "시술 후 경과",
      actions:  ["당일: 약간 붓기", "3일: 자연스러워짐", "이후: 유지"],
      dialogue: '3일 후 거울을 보니 팔자주름이 훨씬 얕아졌다.',
      emotion:  "만족" },
    { section: "closing",   label: "마무리",
      actions:  ["효과 기간 정리", "재시술 계획"],
      dialogue: '6개월~1년 유지된다니 생각보다 경제적이다.',
      emotion:  "만족 → 꾸준한 관리" },
  ],

  // ── 울쎄라 ───────────────────────────────────────────────────
  울쎄라: [
    { section: "concern",   label: "탄력 저하·처짐",
      actions:  ["얼굴 처짐 느낌", "비수술 방법 탐색"],
      dialogue: '수술은 싫은데 처진 건 어떻게 해야 하나 고민이 많았다.',
      emotion:  "무기력 → 탐색" },
    { section: "situation", label: "탐색의 계기",
      actions:  ["울쎄라 정보 검색", "실리프팅과 비교", "상담 예약"],
      dialogue: '초음파로 피부 깊은 층을 자극한다는 설명이 흥미로웠다.',
      emotion:  "호기심 → 결심" },
    { section: "consult",   label: "상담실에서",
      actions:  ["피부 상태 진단", "실리프팅과 차이 설명", "통증 안내"],
      dialogue: '"많이 아프다는데 사실인가요?" 라고 물으니 솔직하게 답해줬다.',
      emotion:  "불안 → 현실적 기대" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["실리프팅 통증과 비교", "효과 지속 기간 확인", "결정"],
      dialogue: '효과가 6~12개월 지속된다는 점이 마음에 들었다.',
      emotion:  "비교 → 확신" },
    { section: "result",    label: "시술 후 경과",
      actions:  ["당일: 약간 붓기", "1~2주: 효과 서서히 나타남", "3개월: 최대 효과"],
      dialogue: '3개월이 지나자 친구가 "살 뺐어?" 라고 물어봤다.',
      emotion:  "기다림 → 뿌듯함" },
    { section: "closing",   label: "마무리",
      actions:  ["효과 기간", "재시술 계획"],
      dialogue: '수술 없이 이 정도 변화면 충분하다.',
      emotion:  "만족 → 꾸준한 관리" },
  ],

  // ── 지방흡입 ─────────────────────────────────────────────────
  지방흡입: [
    { section: "concern",   label: "국소 지방 고민",
      actions:  ["운동해도 안 빠지는 부위", "옷 입을 때 신경 쓰임", "검색 시작"],
      dialogue: '다이어트를 해도 복부만 유독 안 빠졌다.',
      emotion:  "답답함 → 탐색" },
    { section: "situation", label: "탐색의 계기",
      actions:  ["지방흡입 후기 검색", "전후 사진 비교", "상담 예약"],
      dialogue: '운동으로는 한계가 있다는 걸 인정하고 나서야 알아보기 시작했다.',
      emotion:  "인정 → 결심" },
    { section: "consult",   label: "상담실에서",
      actions:  ["부위 측정", "흡입량 상담", "회복 기간 설명"],
      dialogue: '"압박복을 얼마나 입어야 하나요?" 라고 물었더니 4~8주라고 했다.',
      emotion:  "긴장 → 현실적 이해" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["지방분해주사와 비교", "확실한 효과 확인", "결정"],
      dialogue: '지방분해주사는 조금씩, 지방흡입은 한 번에 확실히 된다는 말에 결정했다.',
      emotion:  "비교 → 확신" },
    { section: "result",    label: "회복 과정",
      actions:  ["당일~3일: 붓기 심함", "1주: 일상 복귀", "1개월: 윤곽 드러남", "3개월: 완전 정착"],
      dialogue: '3개월 후 청바지를 꺼내 입었는데 잘 들어갔다.',
      emotion:  "고통스러운 회복 → 결과에 만족" },
    { section: "closing",   label: "마무리",
      actions:  ["전후 비교", "유지 관리 방법"],
      dialogue: '지방세포가 사라진 거라 요요가 없다는 게 제일 좋다.',
      emotion:  "만족 → 자연스러운 권유" },
  ],

  // ── 레이저토닝 ───────────────────────────────────────────────
  레이저토닝: [
    { section: "concern",   label: "기미·피부 톤 고민",
      actions:  ["피부 톤 불균형", "화장이 잘 안 먹음", "검색 시작"],
      dialogue: '아무리 비싼 화장품을 써도 기미는 그대로였다.',
      emotion:  "불만족 → 탐색" },
    { section: "situation", label: "탐색의 계기",
      actions:  ["레이저토닝 정보 검색", "피코레이저와 비교", "상담 예약"],
      dialogue: '피코레이저보다 순하다는 말에 처음 받는 사람한테 맞겠다 싶었다.',
      emotion:  "기대 → 결심" },
    { section: "consult",   label: "상담실에서",
      actions:  ["피부 진단기 분석", "시술 횟수 안내", "주의사항 설명"],
      dialogue: '"몇 회 받아야 효과 나요?" 라고 물으니 보통 4~6회라고 했다.',
      emotion:  "막막함 → 계획 수립" },
    { section: "reason",    label: "결정한 이유",
      actions:  ["피코레이저와 비교", "통증 적음 확인", "결정"],
      dialogue: '통증이 거의 없다는 말에 부담 없이 시작하기로 했다.',
      emotion:  "가벼운 결심" },
    { section: "result",    label: "시술 후 경과",
      actions:  ["당일: 약간 붉음", "3~4회: 피부 톤 변화", "6회: 기미 옅어짐"],
      dialogue: '4회차 후 지인이 "피부 좋아졌냐"고 물어봤다.',
      emotion:  "서서히 변화 확인 → 만족" },
    { section: "closing",   label: "마무리",
      actions:  ["유지 관리", "자외선 차단 강조"],
      dialogue: '자외선 차단만 잘 하면 효과가 오래 간다.',
      emotion:  "만족 → 꾸준한 관리 권유" },
  ],
};

// ============================================================
// 섹션 메타 정보 — generate.js에서 프롬프트 생성 시 참고
// ============================================================

export const CLINIC_SECTIONS = [
  {
    key:      "concern",
    label:    "고민",
    minChars: 150,
    rule:     "공감 상황으로 시작. 실제 사람 생각처럼. 설명 금지.",
    imgAlt:   (region, name) => `${region} ${name} 고민하는 장면`,
  },
  {
    key:      "situation",
    label:    "상황",
    minChars: 200,
    rule:     "고민하게 된 구체적 계기. 현실 장면 포함. 행동 전환점.",
    imgAlt:   (region, name) => `${region} ${name} 상담 전 모습`,
  },
  {
    key:      "consult",
    label:    "상담 흐름",
    minChars: 300,
    rule:     "상담 장면 필수. 질문 1개 이상. 비교 상황 포함.",
    imgAlt:   (region, name) => `${region} ${name} 병원 상담 장면`,
  },
  {
    key:      "reason",
    label:    "선택 이유",
    minChars: 250,
    rule:     "왜 선택했는지 명확히. 비교 대상 포함. 결정 순간 감정.",
    imgAlt:   (region, name) => `${region} ${name} 선택 결정 장면`,
  },
  {
    key:      "result",
    label:    "결과 체감",
    minChars: 250,
    rule:     "변화 느낌 (과장 금지). 감정 변화. 회복 과정 솔직하게.",
    imgAlt:   (region, name) => `${region} ${name} 시술 결과`,
  },
  {
    key:      "closing",
    label:    "정리",
    minChars: 100,
    rule:     "자연스럽게 마무리. 광고 느낌 금지. 키워드 자연 포함.",
    imgAlt:   (region, name) => `${region} ${name} 후기`,
  },
];

// ============================================================
// 유틸 함수
// ============================================================

// 시술명으로 FLOW 가져오기
export function getClinicFlow(treatmentName) {
  return CLINIC_FLOW_ENGINE[treatmentName] || null;
}

// 섹션 키로 메타 정보 가져오기
export function getSectionMeta(sectionKey) {
  return CLINIC_SECTIONS.find(s => s.key === sectionKey) || null;
}

// 섹션별 프롬프트 지시문 빌드 (generate.js에서 호출)
export function buildClinicSectionInstruction(sectionKey, treatmentName, region) {
  const meta = getSectionMeta(sectionKey);
  const flow = getClinicFlow(treatmentName);
  const step = flow?.find(f => f.section === sectionKey);

  if (!meta) return "";

  const lines = [
    `[ ${meta.label} — 최소 ${meta.minChars}자 이상 ]`,
    `규칙: ${meta.rule}`,
  ];

  if (step) {
    lines.push(`라벨: ${step.label}`);
    lines.push(`행동 소재: ${step.actions.join(" → ")}`);
    lines.push(`대사 힌트: ${step.dialogue}`);
    lines.push(`감정 흐름: ${step.emotion}`);
  }

  lines.push(`이미지 ALT: [이미지: ${meta.imgAlt(region, treatmentName)}]`);
  lines.push(`단문 스타일. 감정 포함. 경험처럼. 설명형 금지.`);

  return lines.join("\n");
}

// 전체 섹션 흐름 블록 빌드 (generate.js 단일 생성 모드에서 참고용)
export function buildClinicFlowBlock(treatmentName) {
  const flow = getClinicFlow(treatmentName);
  if (!flow) return "";

  return flow.map(step => {
    const meta = getSectionMeta(step.section);
    return [
      `▶ ${meta?.label || step.section} (${step.label})`,
      `  행동: ${step.actions.join(" → ")}`,
      `  대사: ${step.dialogue}`,
      `  감정: ${step.emotion}`,
    ].join("\n");
  }).join("\n\n");
}
