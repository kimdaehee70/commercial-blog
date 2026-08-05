// lib/restaurant-data.js
// 반장닷컴 · commercial-blog · 맛집 업종 데이터 (Phase 9.5 — 1단계 검증)
// 작업 기준: Phase9_완료_Phase9_5_인계메모_v2_0 / 카페업종_인계메모 v1.4
//
// ★ 1단계 목표: "구리 순대국" 단일 케이스로 새 철학 검증
//   - 매장/브랜드 없음 (placeholder genericName만)
//   - DIRECTION = 하이브리드 (BASE_MENU + SITUATION_OVR + PURPOSE_OVR → merge)
//   - 검색의도 키워드: 지역 + 메뉴 + 상황 + 목적
//   - 검증 통과 후 메뉴·지역 확장 (국밥·삼겹살·갈비탕 등)
//
// 구조 원칙 (cafe-data.js와 차별점)
//   1. CAFE_TREATMENTS = 매장 카드 8개  →  RESTAURANT_TREATMENTS = 조합 카드 (지역×메뉴)
//   2. titlePatterns = {region} {menu} {situation}｜{purpose} ... 형태 동적
//   3. direction 정적맵 X → buildDirection(menu,sit,pur) 함수형
//   4. name 필드 = placeholder (예: "이 순대국집")
//   5. 카테고리 = 메뉴 카테고리 (한식·중식·일식·...)

// ─────────────────────────────────────────────────────────
// 카테고리 (index.js의 RESTAURANT_CATS와 일치)
// ─────────────────────────────────────────────────────────
export const RESTAURANT_CATS = [
  '전체',
  '한식',
  '분식',   // ← 맵고분식 (공릉동·태릉입구역) — 떡볶이·김밥·튀김·순대·어묵·라면
  // ★ 전문점 단위 전환 (2026-07-05~) — cat = 전문점. RESTAURANT_SPECIALTY와 1:1 정합.
  //   기존 한식/분식 삭제 없음. 새 전문점은 SPECIALTY에 데이터만 추가 → 여기에 name 추가.
  '순대국',   // ← 순대국 전문점 (SPECIALTY: sundaeguk, 검증 대상)
  '국밥',     // ← 국밥 전문점 (SPECIALTY: gukbap)
  '족발',     // ← 족발 전문점 (SPECIALTY: jokbal)
  '감자탕',   // ← 감자탕 전문점 (SPECIALTY: gamjatang)
  '해장국',   // ← 해장국 전문점 (SPECIALTY: haejangguk)
  '삼계탕',   // ← 삼계탕 전문점 (SPECIALTY: samgyetang)
  '국수',     // ← 국수 전문점 (SPECIALTY: guksu)
  '쌀국수',   // ← 쌀국수 전문점 (SPECIALTY: ricenoodle · 아시안)
  '양꼬치',   // ← 양꼬치 전문점 (SPECIALTY: yangkkochi · 아시안)
  '냉면',     // ← 냉면 전문점 (SPECIALTY: naengmyeon)
  '돈까스',   // ← 돈까스 전문점 (SPECIALTY: donkatsu · 일식)
  '칼국수',   // ← 칼국수 전문점 (SPECIALTY: kalguksu)
  '샤브샤브', // ← 샤브샤브 전문점 (SPECIALTY: shabu)
  '오리',     // ← 오리 전문점 (SPECIALTY: duck)
  '장어',     // ← 장어 전문점 (SPECIALTY: eel)
  '곱창·막창', // ← 곱창·막창 전문점 (SPECIALTY: gopchang, makchang 흡수)
  '초밥',     // ← 초밥 전문점 (SPECIALTY: sushi · 일식)
  '대게·킹크랩', // ← 대게·킹크랩 전문점 (SPECIALTY: crab · 해산물)
  '횟집',     // ← 횟집 전문점 (SPECIALTY: hoe · 해산물)
  '아구찜',   // ← 아구찜 전문점 (SPECIALTY: agujjim · 해산물/찜)
  '찜닭',     // ← 찜닭 전문점 (SPECIALTY: jjimdak · 찜류)
  '닭갈비',   // ← 닭갈비 전문점 (SPECIALTY: dakgalbi · 육류/닭)
  '갈비',     // ← 갈비 전문점 (SPECIALTY: galbi · 육류)
  '소고기',   // ← 소고기 전문점 (SPECIALTY: beef · 육류)
  '양고기',   // ← 양고기 전문점 (SPECIALTY: lamb · 육류)
  '생선구이', // ← 생선구이 전문점 (SPECIALTY: grilledfish · 해산물/구이)
  '해물탕',   // ← 해물탕 전문점 (SPECIALTY: seafoodtang · 해산물/탕찜)
  '대구탕',   // ← 대구탕 전문점 (SPECIALTY: daegutang · 해산물/탕)
  '복집',     // ← 복집 전문점 (SPECIALTY: bokjip · 해산물/탕, 구 bokeo 흡수)
  '조개구이', // ← 조개구이 전문점 (SPECIALTY: shellfish · 해산물/구이)
  '코다리',   // ← 코다리 전문점 (SPECIALTY: codari · 해산물/조림)
  '쭈꾸미',   // ← 쭈꾸미 전문점 (SPECIALTY: jjukkumi · 해산물/볶음)
  '낙지',     // ← 낙지 전문점 (SPECIALTY: nakji · 해산물/볶음)
  '물회',     // ← 물회 전문점 (SPECIALTY: mulhoe · 해산물/회)
  '문어',     // ← 문어 전문점 (SPECIALTY: muneo · 해산물/숙회)
  '게장',     // ← 게장 전문점 (SPECIALTY: gejang · 해산물/장류)
  '전',       // ← 전 전문점 (SPECIALTY: jeon · 한식/전)
  '닭한마리', // ← 닭한마리 전문점 (SPECIALTY: dakhanmari · 한식/탕)
  '백숙',     // ← 백숙 전문점 (SPECIALTY: baeksuk · 한식/탕)
  '보리밥',   // ← 보리밥 전문점 (SPECIALTY: boribap · 한식/백반)
  '청국장',   // ← 청국장 전문점 (SPECIALTY: cheonggukjang · 한식/백반)
  '두부',     // ← 두부 전문점 (SPECIALTY: dubu · 한식/백반)
  '콩나물국밥', // ← 콩나물국밥 전문점 (SPECIALTY: kongnamulgukbap · 한식/국밥)
  '육개장',   // ← 육개장 전문점 (SPECIALTY: yukgaejang · 한식/탕)
  '동태탕',   // ← 동태탕 전문점 (SPECIALTY: dongtaetang · 해산물/탕, 알탕=서브)
  '아귀탕',   // ← 아귀탕 전문점 (SPECIALTY: agutang · 해산물/탕)
  '매운탕',   // ← 매운탕 전문점 (SPECIALTY: maeuntang · 민물/생선 매운탕)
  '닭볶음탕', // ← 닭볶음탕 전문점 (SPECIALTY: dakbokkeumtang · 한식/닭)
  '추어탕',   // ← 추어탕 전문점 (SPECIALTY: chueotang · 한식/탕)
  '중식',     // ← 중식당 (SPECIALTY: chinese · 짜장면·짬뽕·탕수육·군만두)
  '닭발',   // ← 닭발 전문점 (SPECIALTY: dakbal · 한식/안주 · 조합 경험)
];

// ─────────────────────────────────────────────────────────
// REGIONS (1단계: 구리만)
// ─────────────────────────────────────────────────────────
export const RESTAURANT_REGIONS = [
  '구리',
  '공릉동',   // ← 맵고분식 (태릉입구역 인근)
  // 1단계 검증 후 확장:
  // '남양주', '하남', '광주', '강남', '홍대', '성수', '잠실',
  // '마포', '이태원', '압구정', '건대', '신촌', ...
];

// ─────────────────────────────────────────────────────────
// MENUS — 카테고리별 메뉴 (1단계: 한식 × 순대국만)
// 메뉴별 기본 감성(BASE_DIRECTION) 정의 — 하이브리드 핵심
// ─────────────────────────────────────────────────────────
export const RESTAURANT_MENUS = {
  한식: [
    // 대표 메뉴 계열
    '순대국', '해장국', '칼국수', '김치찌개', '기사식당', '냉면',
    // 사이드 메뉴 계열 (매장 부메뉴 SEO 카드용)
    '수육', '술국', '머릿고기',
  ],
  분식: [
    // 맵고분식 — 실매장 8종 (표시명 = menu키, A안)
    '매콤한 떡볶이', '매콤 로제 떡볶이', '참치마요 꼬마김밥', '매운어묵 꼬마김밥', '수제 모둠튀김',
    // 사이드 계열
    '찰순대', '오뎅꼬치', '라면',
  ],
  // ★ 순대국 전문점 표준 메뉴셋 (SPECIALTY.sundaeguk 정합 · 프론트 호환)
  //   공기밥·주류·음료 제외 / 전국 공통 메뉴만
  순대국: [
    // 국물 대표 계열
    '순대국', '얼큰순대국', '내장순대국', '머리고기순대국', '순대만국', '내장만국', '술국',
    // 안주·포장 계열
    '순대', '모둠순대', '머리고기', '내장모둠', '수육', '편육',
  ],
  // ★ 국밥 전문점 표준 메뉴셋 (SPECIALTY.gukbap 정합)
  국밥: [
    // 대표 계열
    '돼지국밥', '순대국밥', '내장국밥', '섞어국밥', '수육국밥',
    '소머리국밥', '얼큰국밥', '콩나물국밥', '선지국밥', '황태국밥',
    // 함께 판매 계열
    '수육', '모둠수육', '편육', '술국', '머리고기', '내장모둠',
  ],
  // ★ 족발 전문점 표준 메뉴셋 (SPECIALTY.jokbal 정합)
  족발: [
    '족발', '앞다리족발', '뒷다리족발', '반반족발', '냉채족발',
    '불족발', '직화불족발', '마늘족발', '보쌈', '족발보쌈세트',
  ],
  // ★ 곱창·막창 전문점 표준 메뉴셋 (SPECIALTY.gopchang/makchang 정합 · 구이 중심)
  // ★ 게장 전문점 표준 메뉴셋 (SPECIALTY.gejang 정합 · 장류 중심)
  // ★ 감자탕 전문점 표준 메뉴셋 (SPECIALTY.gamjatang 정합 · 뼈·탕 중심)
  '감자탕': [
    '감자탕', '뼈해장국', '우거지감자탕', '묵은지감자탕', '등뼈찜',
    '등뼈전골', '감자탕(소)', '감자탕(중)', '감자탕(대)', '볶음밥',
  ],
  // ★ 해장국 전문점 표준 메뉴셋 (SPECIALTY.haejangguk 정합 · 탕·해장 중심)
  '해장국': [
    '뼈다귀해장국', '소해장국', '황태해장국', '콩나물해장국', '선지해장국',
    '내장탕', '해장국(소)', '해장국(대)', '수육', '공깃밥',
  ],
  // ★ 생선구이 전문점 표준 메뉴셋 (SPECIALTY.grilledfish 정합 · 구이 정식 중심)
  '생선구이': [
    '고등어구이', '삼치구이', '임연수구이', '굴비구이', '갈치구이',
    '모둠생선구이', '간고등어정식', '생선구이백반', '계란찜', '공깃밥',
  ],
  // ★ 닭갈비 전문점 표준 메뉴셋 (SPECIALTY.dakgalbi 정합 · 볶음 중심)
  '닭갈비': [
    '닭갈비', '치즈닭갈비', '뼈있는닭갈비', '막국수', '볶음밥',
    '우동사리', '주먹밥', '계란찜', '닭갈비(1인)', '닭갈비(2인)',
  ],
  // ★ 오리 전문점 표준 메뉴셋 (SPECIALTY.duck 정합 · 오리요리 중심)
  '오리': [
    '훈제오리', '오리주물럭', '오리로스', '오리백숙', '오리불고기',
    '오리탕', '들깨오리탕', '오리껍질', '볶음밥', '공깃밥',
  ],
  // ★ 쭈꾸미 전문점 표준 메뉴셋 (SPECIALTY.jjukkumi 정합 · 매콤 볶음 중심)
  '쭈꾸미': [
    '쭈꾸미볶음', '직화쭈꾸미', '철판쭈꾸미', '쭈삼(쭈꾸미삼겹살)', '쭈차(쭈꾸미차돌박이)',
    '쭈꾸미정식', '쭈꾸미전골', '계란찜', '볶음밥', '공깃밥',
  ],
  // ★ 조개구이 전문점 표준 메뉴셋 (SPECIALTY.shellfish 정합 · 구이+찜 통합)
  '조개구이': [
    '조개구이', '모둠조개구이', '키조개구이', '가리비구이', '조개찜',
    '모둠조개찜', '조개탕', '조개구이세트', '라면사리', '공깃밥',
  ],
  // ★ 장어 전문점 표준 메뉴셋 (SPECIALTY.eel 정합 · 구이 보양 중심)
  '장어': [
    '민물장어구이', '바다장어구이', '장어소금구이', '장어양념구이', '장어덮밥',
    '장어탕', '장어정식', '장어세트', '복분자', '공깃밥',
  ],
  // ★ 아구찜 전문점 표준 메뉴셋 (SPECIALTY.agujjim 정합 · 매콤 찜 중심)
  '아구찜': [
    '아구찜', '해물아구찜', '순살아구찜', '매운아구찜', '아구탕',
    '아귀수육', '아귀찜정식', '아귀전골', '볶음밥', '공깃밥',
  ],
  // ★ 갈비 전문점 표준 메뉴셋 (SPECIALTY.galbi 정합 · 숯불구이 중심)
  '갈비': [
    '양념갈비', '생갈비', '돼지갈비', '소갈비', '갈비살',
    '갈비탕', '냉면', '된장찌개', '공기밥', '갈비정식',
  ],
  // ★ 소고기 전문점 표준 메뉴셋 (SPECIALTY.beef 정합 · 한우 구이 중심)
  '소고기': [
    '등심', '안심', '채끝', '꽃등심', '살치살',
    '모둠한우', '차돌박이', '육회', '소고기국밥', '냉면',
  ],
  // ★ 쌀국수 전문점 표준 메뉴셋 (SPECIALTY.ricenoodle 정합 · 베트남 국물국수 중심)
  '쌀국수': [
    '소고기쌀국수', '양지쌀국수', '차돌쌀국수', '매운쌀국수', '해물쌀국수',
    '닭쌀국수', '왕갈비쌀국수', '볶음쌀국수', '분짜', '월남쌈',
  ],
  // ★ 양꼬치 전문점 표준 메뉴셋 (SPECIALTY.yangkkochi 정합 · 양고기 꼬치 중심)
  '양꼬치': [
    '양꼬치', '양갈비', '양등심꼬치', '양갈비살', '양념양꼬치',
    '매운양꼬치', '양꼬치세트', '양갈비구이', '꿔바로우', '온면',
  ],
  // ★ 삼계탕 전문점 표준 메뉴셋 (SPECIALTY.samgyetang 정합 · 보양 탕 중심)
  '삼계탕': [
    '삼계탕', '한방삼계탕', '토종삼계탕', '능이삼계탕', '전복삼계탕',
    '들깨삼계탕', '옻삼계탕', '흑마늘삼계탕', '녹두삼계탕', '반계탕',
  ],
  // ★ 칼국수 전문점 표준 메뉴셋 (SPECIALTY.kalguksu 정합 · 손칼국수 중심)
  '칼국수': [
    '바지락칼국수', '해물칼국수', '손칼국수', '들깨칼국수', '얼큰칼국수',
    '닭칼국수', '팥칼국수', '장칼국수', '칼제비', '만두',
  ],
  // ★ 국수 전문점 표준 메뉴셋 (SPECIALTY.guksu 정합 · 잔치·비빔국수 중심)
  '국수': [
    '잔치국수', '비빔국수', '열무국수', '김치국수', '멸치국수',
    '칼국수', '콩국수', '들기름국수', '육수국수', '냉국수',
  ],
  // ★ 샤브샤브 전문점 표준 메뉴셋 (SPECIALTY.shabu 정합 · 육수 샤브 중심)
  '샤브샤브': [
    '소고기샤브샤브', '버섯샤브샤브', '한우샤브샤브', '해물샤브샤브', '스페셜샤브샤브',
    '월남쌈샤브', '편백찜샤브', '얼큰샤브샤브', '스키야키', '샤브정식',
  ],
  // ★ 초밥 전문점 표준 메뉴셋 (SPECIALTY.sushi 정합 · 스시·오마카세 중심)
  '초밥': [
    '모둠초밥', '특초밥', '생연어초밥', '광어초밥', '참치초밥',
    '새우초밥', '장어초밥', '소고기초밥', '유부초밥', '회덮밥',
  ],
  // ★ 대게·킹크랩 전문점 표준 메뉴셋 (SPECIALTY.crab 정합 · 게 찜·코스 중심)
  '대게·킹크랩': [
    '대게', '킹크랩', '랍스터', '홍게', '박달대게',
    '대게코스', '킹크랩코스', '대게세트', '킹크랩세트', '게딱지볶음밥',
  ],
  // ★ 횟집 전문점 표준 메뉴셋 (SPECIALTY.hoe 정합 · 활어회 중심)
  '횟집': [
    '모둠회', '광어회', '우럭회', '참돔회', '농어회',
    '방어회', '연어회', '도미회', '물회', '회덮밥',
  ],
  // ★ 찜닭 전문점 표준 메뉴셋 (SPECIALTY.jjimdak 정합 · 안동찜닭 중심)
  '찜닭': [
    '안동찜닭', '간장찜닭', '매운찜닭', '순살찜닭', '치즈찜닭',
    '국물찜닭', '마라찜닭', '찜닭볶음밥', '닭발', '콩나물무침',
  ],
  // ★ 양고기 전문점 표준 메뉴셋 (SPECIALTY.lamb 정합 · 양갈비 구이 중심)
  '양고기': [
    '양갈비', '프렌치랙', '양등심', '양어깨살', '양꼬치',
    '양갈비살', '양갈비정식', '양전골', '양수육', '모둠양고기',
  ],
  // ★ 해물탕 전문점 표준 메뉴셋 (SPECIALTY.seafoodtang 정합 · 탕·찜 중심)
  '해물탕': [
    '해물탕', '해물찜', '아귀해물찜', '해물전골', '해신탕',
    '꽃게탕', '낙지해물탕', '조개해물탕', '문어해물탕', '섞어찜',
  ],
};

// ─────────────────────────────────────────────────────────
// MENU_BASE_DIRECTION — 메뉴별 기본 감성
// buildDirection()의 기반. 메뉴 결이 여기서 잡힘.
// ⚠ 광고 표현 금지: "최고", "찐맛집", "강추" 등 절대 사용 X
// ─────────────────────────────────────────────────────────
export const MENU_BASE_DIRECTION = {
  // ═══ 중식 SPECIALTY (chinese) — full 축 주입 · 폴백 탈출 ═══
  //   순대국 스키마 동형(22필드). Scene=손님 행동, decisionPoint=판단 재료(단정 금지)
  '짜장면': {
    genericName: '중식당',
    altGenericNames: ['중국집', '식당', '가게'],
    motive: '빠르게 한 끼 해결하고 싶어서',
    tasteCore: '춘장을 볶아낸 고소하고 짭조름한 맛, 쫄깃한 면발, 큼직하게 씹히는 채소와 고기',
    sceneCore: '점심시간 짧게 들러 후루룩 비우고 나가는 손님들, 단무지 그릇 먼저 놓이는 풍경',
    hook: '비벼서 한 젓가락 올리자마자 김이 확 올라왔어요',
    keyword: '짜장면',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 끼 하기 좋은',
    tableware: '면 그릇, 단무지, 양파, 춘장',
    sidedishes: ['단무지', '양파', '춘장', '군만두'],
    timeOfDay: ['점심', '저녁'],
    // ★ v3 메뉴 고유 방문축
    recommendSituation: '점심시간이 짧을 때·혼자 빠르게 한 끼·아이와 부담 없이 먹을 때처럼 간편하게 끼니를 해결하고 싶을 때',
    titlePurpose: '간편하게 먹기 좋은',
    // ★ v3 만족 판단축 (단정 금지 — 독자가 만족을 가늠할 재료)
    portionFeel: '한 그릇으로 한 끼가 되는 편, 양이 많으면 곱빼기로 조절하는 사람이 많음',
    sharingFeel: '각자 한 그릇씩 시키는 구성 — 나눠 먹기보다 개인 메뉴',
    usageType: '끼니 식사용',
    paceFeel: '빠르게 비우고 일어나는 편 — 오래 앉기보다 회전 빠른 메뉴',
    visitTiming: '점심 피크·바쁜 끼니 때가 많고, 포장으로도 자주 나감',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '혼자 간편하게 한 끼면 짜장면이 무난, 국물이 당기면 짬뽕, 여럿이면 탕수육을 곁들이는 편',
  },

  '짬뽕': {
    genericName: '중식당',
    altGenericNames: ['중국집', '식당', '가게'],
    motive: '얼큰한 국물에 면 한 그릇 하고 싶어서',
    tasteCore: '불 맛 도는 얼큰한 국물, 오징어·홍합·채소가 어우러진 해물 감칠맛, 쫄깃한 면발',
    sceneCore: '국물부터 한 술 떠보고 매운맛을 가늠하는 손님, 그릇에 김 서리는 점심 풍경',
    hook: '국물 한 술 떠 넣자 얼큰한 김이 확 올라왔어요',
    keyword: '짬뽕',
    servingUnit: '한 그릇',
    priceFeel: '얼큰하게 한 그릇 하기 좋은',
    tableware: '면 그릇, 단무지, 양파, 국물 렌게',
    sidedishes: ['단무지', '양파', '춘장', '군만두'],
    timeOfDay: ['점심', '저녁'],
    recommendSituation: '얼큰한 국물이 당길 때·해장 겸 한 끼·매운 게 먹고 싶을 때처럼 국물 있는 면을 찾을 때',
    titlePurpose: '얼큰하게 먹기 좋은',
    portionFeel: '국물까지 있어 든든한 한 그릇, 매운 정도는 매장마다 차이가 있는 편',
    sharingFeel: '각자 한 그릇씩 — 개인 메뉴 중심',
    usageType: '끼니·해장용',
    paceFeel: '국물부터 천천히 — 면과 해물을 번갈아 먹는 편',
    visitTiming: '점심·저녁 끼니 때, 술 다음 날 해장으로도 자주 찾음',
    bestCompanion: '혼자·가족·직장 동료',
    decisionPoint: '얼큰한 국물이 당기면 짬뽕이 무난, 담백하게 먹고 싶으면 짜장면, 매운 게 부담이면 간짜장 쪽이 나을 수 있음',
  },

  '탕수육': {
    genericName: '중식당',
    altGenericNames: ['중국집', '식당', '가게'],
    motive: '여럿이 나눠 먹을 요리 하나 시키러',
    tasteCore: '바삭하게 튀긴 겉면과 부드러운 고기, 새콤달콤한 소스, 갓 튀겨 나온 뜨거운 김',
    sceneCore: '가운데 접시 두고 젓가락이 오가는 자리, 소스를 부을지 찍을지 이야기 나누는 풍경',
    hook: '접시 나오자마자 바삭한 소리부터 확인하려고 한 점 집었어요',
    keyword: '탕수육',
    servingUnit: '한 접시',
    priceFeel: '여럿이 나눠 먹기 좋은',
    tableware: '요리 접시, 소스 그릇, 앞접시',
    sidedishes: ['단무지', '양파', '춘장'],
    timeOfDay: ['점심', '저녁'],
    recommendSituation: '여럿이 나눠 먹을 때·식사에 요리 하나 곁들일 때·아이와 함께 먹을 때처럼 함께 즐길 메뉴를 찾을 때',
    titlePurpose: '나눠 먹기 좋은',
    portionFeel: '소·중·대로 인원 맞춰 고르는 편, 2~3인이면 소~중이 무난',
    sharingFeel: '가운데 두고 나눠 먹는 요리 — 식사 메뉴와 함께 시키는 경우가 많음',
    usageType: '요리·곁들임용',
    paceFeel: '식사와 함께 천천히 — 소스가 눅기 전에 먼저 먹는 편',
    visitTiming: '가족 외식·모임 자리에서 식사와 함께, 저녁 시간대에 자주 나감',
    bestCompanion: '가족·친구·모임 일행',
    decisionPoint: '여럿이 곁들일 요리면 탕수육이 무난, 매콤한 게 좋으면 깐풍기, 담백하게는 유린기 쪽을 고르는 편. 소스는 부먹·찍먹 취향대로',
  },

  '군만두': {
    genericName: '중식당',
    altGenericNames: ['중국집', '식당', '가게'],
    motive: '식사에 간단히 곁들일 걸 하나 더 시키러',
    tasteCore: '노릇하게 구운 바삭한 만두피, 육즙 도는 속, 갓 구워 나온 고소한 냄새',
    sceneCore: '면 나오기 전에 먼저 집어 먹는 손님, 간장 종지에 식초 떨어뜨리는 풍경',
    hook: '노릇한 겉면을 한 입 베자 속에서 김이 올라왔어요',
    keyword: '군만두',
    servingUnit: '한 접시',
    priceFeel: '가볍게 곁들이기 좋은',
    tableware: '만두 접시, 간장 종지, 식초',
    sidedishes: ['간장', '식초', '단무지'],
    timeOfDay: ['점심', '저녁'],
    recommendSituation: '식사에 간단히 곁들일 때·면 나오기 전 요기할 때·아이 간식으로 먹을 때처럼 가볍게 하나 더 시킬 때',
    titlePurpose: '곁들이기 좋은',
    portionFeel: '한 접시를 여럿이 나눠 집어 먹는 편, 요기용으로 가벼운 양',
    sharingFeel: '나눠 먹기 좋은 곁들임 — 단품보다 식사와 함께',
    usageType: '곁들임·요기용',
    paceFeel: '먼저 나오면 바로 집어 먹는 편 — 식사 전 워밍업',
    visitTiming: '식사 곁들임으로 아무 때나, 포장에 함께 담기는 경우도 많음',
    bestCompanion: '혼자·가족·아이 동반',
    decisionPoint: '식사에 가볍게 곁들이면 군만두가 무난, 국물째 먹고 싶으면 물만두 쪽을 고르는 편',
  },

  '순대국': {
    genericName: '순대국집',           // placeholder — 본문에서 "이 순대국집", "여기" 등으로 변형
    altGenericNames: ['국밥집', '식당', '가게'],  // 다양성 확보용
    motive: '국물 뜨끈한 거 한 그릇 하고 싶어서',
    tasteCore: '뽀얗고 진한 국물, 부드럽게 익은 머릿고기, 쫄깃한 순대',
    sceneCore: '아침부터 줄 서는 동네 노포 분위기, 식탁마다 김 올라오는 풍경',
    hook: '뚝배기 뚜껑 열자마자 김이 확 올라왔어요',
    keyword: '순대국',
    servingUnit: '한 그릇',
    priceFeel: '뜨끈하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],  // 24시간형 메뉴
    // ★ v3 메뉴 고유 방문축
    recommendSituation: '혼밥·해장·아침 끼니·바쁜 한 끼처럼 혼자 뜨끈하게 속을 채우고 싶을 때',
    titlePurpose: '혼밥하기 좋은',  // ★ 제목 선두 폴백 (purpose 미선택 시)
    // ★ v3 만족 판단축 (단정 금지 — 독자가 만족을 가늠할 재료. prompts decision/recommend가 소비)
    portionFeel: '공깃밥 포함 1인분 기준, 혼자 한 끼로 든든한 편',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편한 구성',
    usageType: '끼니 식사용',
    paceFeel: '빠르게 한 그릇 비우는 편 — 오래 앉기보다 회전 빠른 메뉴',
    visitTiming: '이른 아침부터 늦은 새벽까지, 시간대 폭이 넓어 끼니 때를 비껴가도 무난',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '혼자 빠르게 든든한 한 끼면 순대국이 무난, 여럿이 안주 곁들일 자리면 수육·머릿고기를 추가하는 편',
  },

  '해장국': {
    genericName: '해장국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '속이 영 안 좋아서 뜨끈한 국물 한 그릇 하러',
    tasteCore: '얼큰하면서도 시원한 국물, 콩나물·우거지·선지의 식감 대비',
    sceneCore: '카운터 자리에 혼자 앉아 국물부터 떠먹는 손님들, 조용한 아침 풍경',
    hook: '한 술 떠 넣고 잠깐 멈췄어요, 속이 천천히 풀리는 게 느껴져서',
    keyword: '해장국',
    servingUnit: '한 그릇',
    priceFeel: '속 풀러 한 그릇 하기 좋은',
    tableware: '뚝배기, 다진 양념, 후추, 새우젓',
    sidedishes: ['깍두기', '배추김치', '콩나물무침'],
    timeOfDay: ['아침', '새벽', '점심'],
    // ★ v3 메뉴 고유 방문축
    recommendSituation: '전날 술자리 다음 날 해장·이른 아침 속풀이·혼자 조용히 끼니 채울 때',
    titlePurpose: '해장하기 좋은',
    portionFeel: '국물 위주라 속 풀기 좋은 1인분, 가볍게도 든든하게도 조절 가능',
    sharingFeel: '1인 단품 중심 — 혼자 조용히 먹기 편함',
    usageType: '끼니·해장용',
    paceFeel: '국물부터 천천히 — 혼자 여유 있게 먹는 편',
    visitTiming: '이른 아침·해장이 필요한 오전, 점심 전 한가한 시간이 편함',
    bestCompanion: '혼자·해장 일행',
    decisionPoint: '속 풀러 얼큰하게 한 그릇이면 해장국이 무난, 담백한 끼니를 찾으면 맑은 국물 계열이 나을 수 있음',
  },

  '칼국수': {
    genericName: '칼국수집',
    altGenericNames: ['면집', '식당', '가게'],
    motive: '뜨끈한 면 한 그릇 후루룩 하고 싶어서',
    tasteCore: '진한 멸치·해물 육수, 쫄깃한 면, 김 모락모락 올라오는 첫 그릇',
    sceneCore: '냄비 한가운데 두고 앞접시에 덜어 먹는 풍경, 김 서린 안경',
    hook: '뚜껑 열자 김이 확 올라와서 잠깐 안경부터 닦았어요',
    keyword: '칼국수',
    servingUnit: '한 그릇',
    priceFeel: '면 한 그릇 후루룩 하기 좋은',
    tableware: '냄비 또는 큰 그릇, 앞접시, 국자',
    sidedishes: ['배추김치', '겉절이', '단무지', '깍두기'],
    timeOfDay: ['점심', '저녁'],
  },

  '김치찌개': {
    genericName: '김치찌개집',
    altGenericNames: ['백반집', '식당', '가게'],
    motive: '익숙한 집밥 같은 한 끼 먹으러',
    tasteCore: '푹 익은 김치의 깊은 신맛, 부드러운 두부, 기름진 돼지고기',
    sceneCore: '4인 테이블에 찌개 가운데 두고 공깃밥 나눠 먹는 풍경',
    hook: '찌개가 자글자글 끓는 소리부터 듣고 자리에 앉았어요',
    keyword: '김치찌개',
    servingUnit: '한 그릇',
    priceFeel: '집밥처럼 한 끼 먹기 좋은',
    tableware: '뚝배기 또는 양은냄비, 공깃밥, 국자',
    sidedishes: ['계란말이', '콩나물', '멸치볶음', '김', '시금치무침'],
    timeOfDay: ['점심', '저녁'],
  },

  '기사식당': {
    genericName: '기사식당',
    altGenericNames: ['백반집', '식당', '가게'],
    motive: '근처에서 한 끼 빠르게 해결하러',
    tasteCore: '갓 지은 밥, 푸짐한 기본 반찬, 그날의 찌개나 국',
    sceneCore: '벽에 걸린 TV 뉴스, 작업복·운전기사 손님들, 짧은 식사 후 자리 비는 회전',
    hook: '들어가서 자리 잡자마자 밥과 반찬이 깔리기 시작했어요',
    keyword: '기사식당',
    servingUnit: '한 상',
    priceFeel: '한 끼 든든하게 해결하기 좋은',
    tableware: '공깃밥, 국그릇, 반찬 접시 여러 개',
    sidedishes: ['김치', '나물 2~3종', '계란후라이', '멸치볶음', '조림', '국'],
    timeOfDay: ['아침', '점심', '저녁'],
  },

  '냉면': {
    genericName: '냉면집',
    altGenericNames: ['면집', '식당', '가게'],
    motive: '더위에 시원한 거 한 그릇 빠르게',
    tasteCore: '얼음 살얼음 낀 차가운 육수, 쫄깃한 면, 식초·겨자로 맛 조절',
    sceneCore: '회전 빠른 점심시간, 옆 테이블도 가위 들고 면 자르는 풍경',
    hook: '가위로 면 자르고 한 젓가락 빠르게 들어 올렸어요',
    keyword: '냉면',
    servingUnit: '한 그릇',
    priceFeel: '시원하게 한 그릇 하기 좋은',
    tableware: '대접, 가위, 식초·겨자',
    sidedishes: ['깍두기', '배추김치', '삶은 계란'],
    timeOfDay: ['점심', '저녁'],
  },

  // ─── 사이드 메뉴 계열 (대표 메뉴 X, 매장 부메뉴 SEO 카드용) ───
  // ⚠ 행동 리듬 강제 X — fossil 자연 발생 관찰용
  // ⚠ "감성 차이"는 적게, "메뉴 자체의 객관 정보" 위주로만 정의

  '수육': {
    genericName: '국밥집',
    altGenericNames: ['고기집', '식당', '가게'],
    motive: '국물에 곁들일 고기 한 접시 추가하러',
    tasteCore: '삶은 고기 결, 새우젓·쌈장 조합',
    sceneCore: '접시 하나 가운데 두고 젓가락 오가는 풍경',
    hook: '접시 위 고기 한 점부터 새우젓에 찍었어요',
    keyword: '수육',
    servingUnit: '한 접시',
    priceFeel: '국물에 곁들이기 좋은',
    tableware: '접시, 새우젓, 쌈장, 마늘, 풋고추',
    sidedishes: ['깍두기', '배추김치', '겉절이'],
    timeOfDay: ['점심', '저녁', '늦은 밤'],
    // ★ v3 메뉴 고유 방문축
    recommendSituation: '술자리 안주·국물에 곁들이는 추가 메뉴·여럿이 고기 한 점씩 나눌 때',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나눠 집는 양 — 끼니보다 곁들임·안주 기준',
    sharingFeel: '여럿이 나눠 먹는 구성 — 일행 있는 자리에 맞음',
    usageType: '술안주·곁들임용',
    paceFeel: '천천히 집어 먹으며 자리 오래 가져가는 편',
    visitTiming: '저녁부터 늦은 밤, 술자리나 식사에 곁들이는 시간대',
    bestCompanion: '술자리 일행·2~4인 모임',
    decisionPoint: '여럿이 안주로 나눠 먹거나 국물에 곁들일 자리면 무난, 혼자 가벼운 끼니면 단품이 나을 수 있음',
  },

  '술국': {
    genericName: '국밥집',
    altGenericNames: ['술집', '식당', '가게'],
    motive: '한 잔 곁들일 안주 겸 국물',
    tasteCore: '얼큰한 국물, 큼직한 건더기',
    sceneCore: '잔과 국 그릇이 같이 놓인 자리',
    hook: '잔 옆에 국 한 그릇 놓고 한 술 떠봤어요',
    keyword: '술국',
    servingUnit: '한 냄비',
    priceFeel: '한 잔 곁들이기 좋은',
    tableware: '뚝배기, 잔, 다진 양념',
    sidedishes: ['깍두기', '배추김치', '풋고추'],
    timeOfDay: ['저녁', '늦은 밤', '새벽'],
    // ★ v3 메뉴 고유 방문축 (purpose 미선택 시 base 폴백으로 소비 — buildDirection 무수정)
    recommendSituation: '술자리 안주·2차·늦은 저녁처럼 여럿이 한 잔 곁들이는 자리',
    titlePurpose: '술자리에 좋은',
    portionFeel: '냄비 단위로 2~4인이 나눠 먹는 양 — 1인 끼니보다 여럿 안주 기준',
    sharingFeel: '여럿이 나눠 먹는 구성 — 혼자보다 일행 있는 자리',
    usageType: '술안주용',
    paceFeel: '한 잔 곁들이며 오래 앉아 먹는 편',
    visitTiming: '늦은 저녁부터 밤 사이, 술자리가 길어지는 시간대',
    bestCompanion: '술자리 일행·2~4인 모임',
    decisionPoint: '여럿이 안주 삼아 나눠 먹을 자리면 술국이 무난, 혼자 끼니만 빠르게면 단품 국밥이 나을 수 있음',
  },

  '머릿고기': {
    genericName: '국밥집',
    altGenericNames: ['고기집', '식당', '가게'],
    motive: '부위별 식감 한 접시 추가하러',
    tasteCore: '부위마다 다른 식감, 새우젓 곁들임',
    sceneCore: '접시 위 부위 골라 집어먹는 풍경',
    hook: '접시에 부위 모양 다른 고기가 나란히 놓여 있었어요',
    keyword: '머릿고기',
    servingUnit: '한 접시',
    priceFeel: '부위별로 맛보기 좋은',
    tableware: '접시, 새우젓, 쌈장, 마늘',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['저녁', '늦은 밤', '새벽'],
    // ★ v3 메뉴 고유 방문축
    recommendSituation: '술자리 안주·부위별 식감 맛보기·여럿이 한 접시 나눌 때',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나눠 집는 양 — 끼니보다 곁들임·안주 기준',
    sharingFeel: '여럿이 나눠 먹는 구성 — 일행 있는 자리에 맞음',
    usageType: '술안주·곁들임용',
    paceFeel: '천천히 집어 먹으며 자리 오래 가져가는 편',
    visitTiming: '저녁부터 늦은 밤, 한 잔 곁들이는 시간대',
    bestCompanion: '술자리 일행·2~4인 모임',
    decisionPoint: '여럿이 안주 삼아 부위별로 맛볼 자리면 무난, 깔끔한 한 끼를 찾으면 국물 단품이 나을 수 있음',
  },

  // ═══════════════════════════════════════════════════════
  // ★ 순대국 전문점 표준 메뉴셋 감성 (SPECIALTY: sundaeguk · 2026-07-05)
  //   기존 '순대국'/'술국'/'수육'은 위에 존재 → 재사용. 아래는 신규 메뉴만.
  //   ⚠ 국물 계열 = 끼니·해장·혼밥 결 / 안주 계열 = 나눔·한잔 결. 광고 표현 금지.
  // ═══════════════════════════════════════════════════════
  '얼큰순대국': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '얼큰하게 땀 빼며 속 풀고 싶어서',
    tasteCore: '칼칼하게 끓여낸 붉은 국물, 매콤함 뒤에 남는 진한 육수 맛',
    sceneCore: '땀 훔치며 국물 떠먹는 손님들, 얼큰한 김이 올라오는 풍경',
    hook: '한 술 뜨자마자 얼큰한 기운이 확 올라왔어요',
    keyword: '얼큰순대국',
    servingUnit: '한 그릇',
    priceFeel: '얼큰하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '해장·얼큰한 국물 당길 때·혼자 뜨끈하게 속 채울 때',
    titlePurpose: '해장하기 좋은',
    portionFeel: '공깃밥 포함 1인분 기준, 얼큰하게 한 끼로 든든한 편',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편한 구성',
    usageType: '끼니·해장용',
    paceFeel: '빠르게 한 그릇 비우는 편',
    visitTiming: '이른 아침부터 늦은 새벽까지 폭넓음',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '얼큰하게 속 풀 자리면 무난, 맑고 담백한 걸 찾으면 기본 순대국이 나을 수 있음',
  },

  '내장순대국': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '내장 씹는 맛으로 든든하게 한 그릇 하러',
    tasteCore: '진한 국물에 푸짐한 내장, 부위별로 다른 쫄깃한 식감',
    sceneCore: '내장 골라 건져 먹는 손님들, 뚝배기마다 김 올라오는 풍경',
    hook: '숟가락으로 건지니 내장이 큼직하게 올라왔어요',
    keyword: '내장순대국',
    servingUnit: '한 그릇',
    priceFeel: '푸짐하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '내장 좋아할 때·든든한 한 끼·혼밥·해장',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '내장이 푸짐해 1인분으로도 든든한 편',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편함',
    usageType: '끼니 식사용',
    paceFeel: '천천히 건져 먹으며 비우는 편',
    visitTiming: '끼니 때 폭넓게, 시간 구애 적음',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '내장 위주로 즐길 자리면 무난, 부담 적게면 순대만국이 나을 수 있음',
  },

  '머리고기순대국': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '고기 씹는 맛 든든하게 한 그릇 하러',
    tasteCore: '진한 국물에 부드러운 머리고기, 씹을수록 고소한 결',
    sceneCore: '고기 건져 새우젓에 찍어 먹는 손님들, 김 올라오는 풍경',
    hook: '국물 아래에서 머리고기가 큼직하게 올라왔어요',
    keyword: '머리고기순대국',
    servingUnit: '한 그릇',
    priceFeel: '고기 든든하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '고기 든든하게·혼밥·해장·한 끼 제대로',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '고기가 넉넉해 한 끼로 든든한 1인분',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편함',
    usageType: '끼니 식사용',
    paceFeel: '고기 건져가며 천천히 비우는 편',
    visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '고기 위주면 무난, 내장 식감 원하면 내장순대국이 나을 수 있음',
  },

  '순대만국': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '내장 없이 순대만 담백하게 한 그릇 하러',
    tasteCore: '깔끔한 국물에 순대만 푸짐하게, 부담 없는 담백함',
    sceneCore: '순대 건져 먹는 손님들, 담백한 김 올라오는 풍경',
    hook: '내장 없이 순대만 가득해서 담백하게 먹기 좋았어요',
    keyword: '순대만국',
    servingUnit: '한 그릇',
    priceFeel: '담백하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '내장 부담될 때·담백하게·혼밥·아이 동반',
    titlePurpose: '담백하게 먹기 좋은',
    portionFeel: '순대 위주 1인분, 담백하게 한 끼',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편함',
    usageType: '끼니 식사용',
    paceFeel: '빠르게 한 그릇 비우는 편',
    visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행·아이 동반',
    decisionPoint: '내장 부담되면 순대만국이 무난, 씹는 맛 원하면 내장순대국이 나을 수 있음',
  },

  '내장만국': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '순대 없이 내장만 진하게 한 그릇 하러',
    tasteCore: '진한 국물에 내장만 푸짐하게, 부위별 쫄깃한 식감',
    sceneCore: '내장 골라 건져 먹는 손님들, 진한 김 올라오는 풍경',
    hook: '순대 없이 내장만 가득해서 씹는 맛이 좋았어요',
    keyword: '내장만국',
    servingUnit: '한 그릇',
    priceFeel: '진하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '내장 좋아할 때·진한 국물·혼밥·해장',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '내장 위주 1인분, 진하게 한 끼',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편함',
    usageType: '끼니 식사용',
    paceFeel: '천천히 건져 먹으며 비우는 편',
    visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '내장만 즐길 자리면 무난, 순대 식감 원하면 순대만국이 나을 수 있음',
  },

  '순대': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '순대 한 접시 곁들여 나눠 먹으러',
    tasteCore: '쫄깃한 순대, 새우젓·소금에 찍어 먹는 담백한 결',
    sceneCore: '접시 가운데 두고 나눠 집어먹는 풍경',
    hook: '접시에 김 오르는 순대가 푸짐하게 담겨 나왔어요',
    keyword: '순대',
    servingUnit: '한 접시',
    priceFeel: '곁들여 나눠 먹기 좋은',
    tableware: '접시, 새우젓, 소금, 쌈장',
    sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['점심', '저녁', '늦은 밤'],
    recommendSituation: '곁들임·포장·나눠 먹을 때',
    titlePurpose: '나눠 먹기 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양',
    sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '곁들임·포장용',
    paceFeel: '집어 먹으며 천천히',
    visitTiming: '끼니·야식 시간대',
    bestCompanion: '2~4인·포장 손님',
    decisionPoint: '순대만 곁들이면 무난, 부위 다양하게면 모둠순대가 나을 수 있음',
  },

  '모둠순대': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '순대·내장 부위별로 골고루 맛보러',
    tasteCore: '순대와 내장이 한 접시에, 부위마다 다른 식감 대비',
    sceneCore: '부위 골라 집어먹으며 나누는 풍경',
    hook: '한 접시에 순대랑 부위별 내장이 나란히 담겨 나왔어요',
    keyword: '모둠순대',
    servingUnit: '한 접시',
    priceFeel: '부위별로 맛보며 나누기 좋은',
    tableware: '접시, 새우젓, 소금, 쌈장',
    sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['저녁', '늦은 밤'],
    recommendSituation: '술안주·여럿이 나눔·부위별 맛보기',
    titlePurpose: '나눠 먹기 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양',
    sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '집어 먹으며 자리 오래 가져가는 편',
    visitTiming: '저녁·늦은 밤 한 잔 곁들이는 시간대',
    bestCompanion: '술자리 일행·2~4인',
    decisionPoint: '부위 다양하게 즐길 자리면 무난, 순대만이면 순대 단품이 나을 수 있음',
  },

  '머리고기': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '고기집', '식당', '가게'],
    motive: '부드러운 머리고기 한 접시 안주로 하러',
    tasteCore: '부위마다 다른 식감, 새우젓 곁들여 담백하게',
    sceneCore: '접시 위 고기 골라 집어먹는 풍경',
    hook: '접시에 부위 모양 다른 고기가 나란히 놓여 있었어요',
    keyword: '머리고기',
    servingUnit: '한 접시',
    priceFeel: '부위별로 맛보기 좋은',
    tableware: '접시, 새우젓, 쌈장, 마늘',
    sidedishes: ['깍두기', '배추김치', '풋고추', '양파'],
    timeOfDay: ['저녁', '늦은 밤', '새벽'],
    recommendSituation: '술자리 안주·부위별 식감·여럿이 나눔',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양',
    sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '천천히 집어 먹으며 자리 오래',
    visitTiming: '저녁~늦은 밤, 한 잔 곁들이는 시간대',
    bestCompanion: '술자리 일행·2~4인',
    decisionPoint: '고기 위주 안주면 무난, 순대·내장까지면 모둠순대가 나을 수 있음',
  },

  '내장모둠': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    motive: '내장 부위별로 골라 안주로 하러',
    tasteCore: '부위마다 다른 쫄깃한 식감, 새우젓·소금 곁들임',
    sceneCore: '내장 골라 집어먹으며 나누는 풍경',
    hook: '접시에 부위별 내장이 푸짐하게 담겨 나왔어요',
    keyword: '내장모둠',
    servingUnit: '한 접시',
    priceFeel: '부위별로 맛보며 나누기 좋은',
    tableware: '접시, 새우젓, 소금, 쌈장',
    sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['저녁', '늦은 밤'],
    recommendSituation: '술안주·내장 좋아할 때·여럿이 나눔',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양',
    sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '집어 먹으며 자리 오래 가져가는 편',
    visitTiming: '저녁~늦은 밤',
    bestCompanion: '술자리 일행·2~4인',
    decisionPoint: '내장 위주 안주면 무난, 고기 원하면 머리고기가 나을 수 있음',
  },

  '편육': {
    genericName: '순대국집',
    altGenericNames: ['국밥집', '고기집', '식당', '가게'],
    motive: '얇게 썬 편육 한 접시 담백하게 하러',
    tasteCore: '얇게 썰어 부드러운 편육, 새우젓·초장에 담백하게',
    sceneCore: '접시 위 편육을 새우젓에 찍어 나누는 풍경',
    hook: '얇게 썬 편육이 접시에 가지런히 담겨 나왔어요',
    keyword: '편육',
    servingUnit: '한 접시',
    priceFeel: '담백하게 나눠 먹기 좋은',
    tableware: '접시, 새우젓, 초장, 마늘',
    sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['저녁', '늦은 밤'],
    recommendSituation: '술안주·담백한 고기·여럿이 나눔',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양',
    sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '천천히 집어 먹으며 자리 오래',
    visitTiming: '저녁~늦은 밤',
    bestCompanion: '술자리 일행·2~4인',
    decisionPoint: '담백한 고기 안주면 편육이 무난, 부위 다양하게면 머리고기가 나을 수 있음',
  },

  // ═══════════════════════════════════════════════════════
  // ★ 국밥 전문점 표준 메뉴셋 감성 (SPECIALTY: gukbap · 2026-07-05)
  //   side(수육·모둠수육 일부·편육·술국·머리고기·내장모둠)는 순대국서 재사용.
  //   아래는 국밥 대표 계열 신규 메뉴 + 모둠수육.
  // ═══════════════════════════════════════════════════════
  '돼지국밥': {
    genericName: '국밥집', altGenericNames: ['돼지국밥집', '식당', '가게'],
    motive: '뜨끈한 돼지국밥 한 그릇 하러',
    tasteCore: '맑거나 진한 육수에 부드러운 돼지고기, 부추·새우젓으로 간 맞추는 결',
    sceneCore: '토렴한 국밥에 부추 올려 먹는 손님들, 김 올라오는 풍경',
    hook: '뚝배기에 부추 한 줌 올리니 국물 색이 확 살아났어요',
    keyword: '돼지국밥', servingUnit: '한 그릇', priceFeel: '뜨끈하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 부추, 다진 양념', sidedishes: ['깍두기', '배추김치', '양파', '고추'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '혼밥·해장·아침 끼니·든든한 한 끼',
    titlePurpose: '혼밥하기 좋은',
    portionFeel: '공깃밥 포함 1인분, 혼자 한 끼로 든든한 편',
    sharingFeel: '1인 단품 중심 — 혼자 먹기 편함', usageType: '끼니 식사용',
    paceFeel: '빠르게 한 그릇 비우는 편', visitTiming: '이른 아침부터 늦은 새벽까지 폭넓음',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '혼자 든든한 한 끼면 돼지국밥이 무난, 부위 골라 먹으려면 섞어국밥이 나을 수 있음',
  },
  '순대국밥': {
    genericName: '국밥집', altGenericNames: ['순대국밥집', '식당', '가게'],
    motive: '순대 든 국밥 한 그릇 든든하게 하러',
    tasteCore: '진한 국물에 순대와 밥, 쫄깃한 순대 식감이 어우러진 결',
    sceneCore: '순대 건져 새우젓에 찍어 먹는 손님들, 김 올라오는 풍경',
    hook: '숟가락으로 뜨니 순대가 밥과 함께 올라왔어요',
    keyword: '순대국밥', servingUnit: '한 그릇', priceFeel: '든든하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '혼밥·해장·순대 좋아할 때·든든한 한 끼',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '공깃밥 포함 1인분, 든든한 편', sharingFeel: '1인 단품 중심',
    usageType: '끼니 식사용', paceFeel: '빠르게 비우는 편', visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '순대 든 한 끼면 무난, 내장 위주면 내장국밥이 나을 수 있음',
  },
  '내장국밥': {
    genericName: '국밥집', altGenericNames: ['식당', '가게'],
    motive: '내장 든 국밥 든든하게 하러',
    tasteCore: '진한 국물에 푸짐한 내장, 부위별 쫄깃한 식감',
    sceneCore: '내장 건져 먹는 손님들, 진한 김 올라오는 풍경',
    hook: '국물 아래에서 내장이 큼직하게 올라왔어요',
    keyword: '내장국밥', servingUnit: '한 그릇', priceFeel: '푸짐하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '내장 좋아할 때·해장·든든한 한 끼',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '내장 푸짐한 1인분', sharingFeel: '1인 단품 중심',
    usageType: '끼니 식사용', paceFeel: '천천히 건져 먹으며 비우는 편', visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '내장 위주면 무난, 순대까지면 순대국밥이 나을 수 있음',
  },
  '섞어국밥': {
    genericName: '국밥집', altGenericNames: ['식당', '가게'],
    motive: '순대·내장·고기 골고루 든 국밥 하러',
    tasteCore: '진한 국물에 순대·내장·고기가 두루, 한 그릇에 여러 식감',
    sceneCore: '건더기 골라 먹으며 든든하게 비우는 풍경',
    hook: '한 그릇에 순대며 내장이며 골고루 들어 있었어요',
    keyword: '섞어국밥', servingUnit: '한 그릇', priceFeel: '푸짐하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '골고루 든든하게·해장·혼밥',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '건더기 푸짐한 1인분', sharingFeel: '1인 단품 중심',
    usageType: '끼니 식사용', paceFeel: '천천히 골라 먹으며 비우는 편', visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '골고루 즐기면 섞어국밥이 무난, 한 가지 위주면 단품 국밥이 나을 수 있음',
  },
  '소머리국밥': {
    genericName: '국밥집', altGenericNames: ['소머리국밥집', '식당', '가게'],
    motive: '깊게 우린 소머리국밥 한 그릇 하러',
    tasteCore: '오래 우린 맑고 깊은 사골 국물, 부드러운 소머리고기',
    sceneCore: '뽀얀 국물에 밥 말아 먹는 손님들, 김 올라오는 풍경',
    hook: '국물이 뽀얗게 우러나 첫 술부터 깊었어요',
    keyword: '소머리국밥', servingUnit: '한 그릇', priceFeel: '깊게 한 그릇 하기 좋은',
    tableware: '뚝배기, 소금, 후추, 다진 파', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁'],
    recommendSituation: '깔끔한 국물·해장·아침 끼니·혼밥',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '국물 든든한 1인분', sharingFeel: '1인 단품 중심',
    usageType: '끼니·해장용', paceFeel: '천천히 국물부터 비우는 편', visitTiming: '아침·점심 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '맑고 깊은 국물이면 소머리국밥이 무난, 얼큰한 걸 찾으면 얼큰국밥이 나을 수 있음',
  },
  '얼큰국밥': {
    genericName: '국밥집', altGenericNames: ['식당', '가게'],
    motive: '얼큰하게 속 풀 국밥 하러',
    tasteCore: '칼칼하게 끓여낸 붉은 국물, 매콤함 뒤에 남는 진한 맛',
    sceneCore: '땀 훔치며 국물 떠먹는 손님들, 얼큰한 김 올라오는 풍경',
    hook: '한 술 뜨자마자 얼큰한 기운이 확 올라왔어요',
    keyword: '얼큰국밥', servingUnit: '한 그릇', priceFeel: '얼큰하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 다진 양념, 후추, 새우젓', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '해장·얼큰한 국물 당길 때·혼밥',
    titlePurpose: '해장하기 좋은',
    portionFeel: '공깃밥 포함 1인분, 얼큰하게 든든', sharingFeel: '1인 단품 중심',
    usageType: '끼니·해장용', paceFeel: '빠르게 비우는 편', visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '얼큰하게 속 풀면 무난, 맑은 국물 찾으면 소머리국밥이 나을 수 있음',
  },
  '수육국밥': {
    genericName: '국밥집', altGenericNames: ['식당', '가게'],
    motive: '수육 넉넉히 든 국밥 든든하게 하러',
    tasteCore: '진한 국물에 넉넉한 수육, 부드러운 고기와 밥의 조화',
    sceneCore: '수육 건져 새우젓에 찍어 먹는 손님들, 김 올라오는 풍경',
    hook: '국밥인데 수육이 이 정도로 들어 있어서 든든했어요',
    keyword: '수육국밥', servingUnit: '한 그릇', priceFeel: '든든하게 한 그릇 하기 좋은',
    tableware: '뚝배기, 새우젓, 다진 양념, 들깨가루', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['아침', '점심', '저녁', '새벽'],
    recommendSituation: '고기 든든하게·해장·혼밥·제대로 된 한 끼',
    titlePurpose: '든든하게 먹기 좋은',
    portionFeel: '수육 넉넉한 1인분, 든든한 편', sharingFeel: '1인 단품 중심',
    usageType: '끼니 식사용', paceFeel: '고기 건져가며 천천히 비우는 편', visitTiming: '끼니 때 폭넓게',
    bestCompanion: '혼자·가벼운 일행',
    decisionPoint: '고기 넉넉하게면 수육국밥이 무난, 순대까지면 섞어국밥이 나을 수 있음',
  },
  '콩나물국밥': {
    genericName: '국밥집', altGenericNames: ['콩나물국밥집', '식당', '가게'],
    motive: '시원하게 속 풀 콩나물국밥 하러',
    tasteCore: '콩나물 아삭하게 씹히고 국물은 맑고 시원하게 넘어가는',
    sceneCore: '뚝배기에 콩나물 소복하게 올라온 국밥, 계란 풀어 먹는 손님들',
    hookCore: '전날 과음한 속을 콩나물 국물로 달래러 들어갔어요',
    keyword: '콩나물국밥', servingUnit: '한 그릇', priceFeel: '시원하게 한 그릇 하기 좋은',
    tasteExtra: '아삭한 콩나물이 국물에 시원함을 더하는',
    sceneExtra: '해장하러 온 손님들이 국물부터 떠먹는 풍경',
    hookExtra: '들어서니 콩나물 삶는 향이 은근하게 돌았어요',
    decisionPoint: '맑고 시원한 국물이면 콩나물국밥이 무난, 얼큰한 걸 찾으면 얼큰국밥이 나을 수 있음',
  },
  '선지국밥': {
    genericName: '국밥집', altGenericNames: ['선지국밥집', '식당', '가게'],
    motive: '선지 든 얼큰한 국밥 하러',
    tasteCore: '선지가 부드럽게 풀리고 국물은 진하고 얼큰하게 배어드는',
    sceneCore: '우거지와 선지 넉넉하게 든 뚝배기, 김 올라오는 풍경',
    hookCore: '든든하고 진한 국물이 생각나 선지국밥 하러 들어갔어요',
    keyword: '선지국밥', servingUnit: '한 그릇', priceFeel: '진하게 한 그릇 하기 좋은',
    tasteExtra: '부드러운 선지가 얼큰한 국물과 어우러지는',
    sceneExtra: '뚝배기 바닥까지 긁어 먹는 손님들 모습',
    hookExtra: '진하고 얼큰한 국물 향이 자리까지 퍼졌어요',
    decisionPoint: '진하고 얼큰하면 선지국밥이 무난, 맑은 국물 찾으면 소머리국밥이 나을 수 있음',
  },
  '황태국밥': {
    genericName: '국밥집', altGenericNames: ['황태국밥집', '식당', '가게'],
    motive: '맑게 속 풀 황태국밥 하러',
    tasteCore: '황태 결이 부드럽게 풀리고 국물은 뽀얗고 담백하게 넘어가는',
    sceneCore: '황태 넉넉히 든 뽀얀 국물 뚝배기, 계란 지단 올라간 풍경',
    hookCore: '속이 편한 국물이 당겨 황태국밥 하러 들어갔어요',
    keyword: '황태국밥', servingUnit: '한 그릇', priceFeel: '담백하게 한 그릇 하기 좋은',
    tasteExtra: '뽀얀 국물이 부담 없이 속을 풀어주는',
    sceneExtra: '아침부터 해장하러 온 손님들이 국물을 떠먹는 모습',
    hookExtra: '뽀얀 황태 국물 향이 은은하게 돌았어요',
    decisionPoint: '맑고 담백하면 황태국밥이 무난, 아삭한 걸 찾으면 콩나물국밥이 나을 수 있음',
  },
  '모둠수육': {
    genericName: '국밥집', altGenericNames: ['고기집', '식당', '가게'],
    motive: '여러 부위 수육 한 접시 나눠 먹으러',
    tasteCore: '부위별로 다른 수육, 새우젓·쌈장 곁들여 부드럽게',
    sceneCore: '접시 위 부위 골라 집어먹으며 나누는 풍경',
    hook: '접시에 부위 다른 수육이 푸짐하게 담겨 나왔어요',
    keyword: '모둠수육', servingUnit: '한 접시', priceFeel: '부위별로 나눠 먹기 좋은',
    tableware: '접시, 새우젓, 쌈장, 마늘', sidedishes: ['깍두기', '배추김치', '양파'],
    timeOfDay: ['저녁', '늦은 밤'],
    recommendSituation: '술안주·여럿이 나눔·부위별 맛보기',
    titlePurpose: '술자리 안주로 좋은',
    portionFeel: '접시 단위로 여럿이 나누는 양', sharingFeel: '여럿이 나눠 먹는 구성',
    usageType: '술안주·곁들임용', paceFeel: '집어 먹으며 자리 오래 가져가는 편', visitTiming: '저녁~늦은 밤',
    bestCompanion: '술자리 일행·2~4인',
    decisionPoint: '부위 다양하게 나누면 모둠수육이 무난, 담백한 걸 찾으면 편육이 나을 수 있음',
  },

  // ★ 족발 전문점 표준 메뉴셋 감성 (SPECIALTY: jokbal · 2026-07-05)
  '족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '쫀득한 족발 한 접시 나눠 먹으러',
    tasteCore: '쫀득하게 씹히고 잡내 없이 부드럽게 넘어가는',
    sceneCore: '김 오른 족발 접시 가운데 두고 둘러앉아 나눠 먹는 손님들',
    hookCore: '저녁에 뭐 나눠 먹을까 하다 족발 하러 들어갔어요',
    keyword: '족발', servingUnit: '한 접시', priceFeel: '푸짐하게 한 접시 하기 좋은',
    tasteExtra: '쫀득한 껍질과 부드러운 살이 같이 씹히는',
    sceneExtra: '한 접시 시켜 여럿이 나눠 먹는 풍경',
    hookExtra: '들어서니 족발 삶는 향이 은근하게 돌았어요',
    decisionPoint: '기본 결 즐기면 족발이 무난, 매콤한 걸 찾으면 불족발이 나을 수 있음',
  },
  '앞다리족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '살코기 넉넉한 앞다리족발 하러',
    tasteCore: '살코기 비중 높고 담백하게 씹히는',
    sceneCore: '살코기 위주 접시 놓고 담백하게 즐기는 손님들',
    hookCore: '기름진 것보다 살코기 위주가 당겨 앞다리로 골랐어요',
    keyword: '앞다리족발', servingUnit: '한 접시', priceFeel: '담백하게 한 접시 하기 좋은',
    tasteExtra: '살코기 위주라 부담 없이 먹기 좋은',
    sceneExtra: '담백한 걸 좋아하는 손님이 자주 찾는 풍경',
    hookExtra: '살코기 결이 도톰하게 씹혔어요',
    decisionPoint: '담백한 살코기면 앞다리가 무난, 쫀득한 껍질 위주면 뒷다리가 나을 수 있음',
  },
  '뒷다리족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '쫀득한 뒷다리족발 하러',
    tasteCore: '껍질 쫀득하고 콜라겐 결이 진하게 씹히는',
    sceneCore: '쫀득한 껍질 부위 골라 먹는 손님들',
    hookCore: '쫀득한 껍질이 당겨 뒷다리로 골랐어요',
    keyword: '뒷다리족발', servingUnit: '한 접시', priceFeel: '쫀득하게 한 접시 하기 좋은',
    tasteExtra: '쫀득한 껍질 비중이 높아 식감 살아 있는',
    sceneExtra: '껍질 좋아하는 손님이 자주 찾는 풍경',
    hookExtra: '껍질이 쫀득하게 입에 감겼어요',
    decisionPoint: '쫀득한 껍질이면 뒷다리가 무난, 살코기 위주면 앞다리가 나을 수 있음',
  },
  '반반족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '앞뒤 골고루 반반족발 하러',
    tasteCore: '살코기와 껍질을 한 접시에서 골고루 씹는',
    sceneCore: '앞다리·뒷다리 반반 담긴 접시 나눠 먹는 손님들',
    hookCore: '취향 갈릴 때 반반이 낫겠다 싶어 반반족발로 골랐어요',
    keyword: '반반족발', servingUnit: '한 접시', priceFeel: '골고루 한 접시 하기 좋은',
    tasteExtra: '담백함과 쫀득함을 한 번에 즐기는',
    sceneExtra: '취향 다른 일행이 같이 먹기 좋은 풍경',
    hookExtra: '한 접시에 두 부위가 같이 담겨 나왔어요',
    decisionPoint: '골고루면 반반이 무난, 한쪽 위주면 앞다리·뒷다리가 나을 수 있음',
  },
  '냉채족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '새콤하게 냉채족발 하러',
    tasteCore: '겨자 소스 새콤하게 감돌고 채소 아삭하게 씹히는',
    sceneCore: '채소와 족발 위에 겨자 소스 얹은 접시, 여름에 자주 나가는 풍경',
    hookCore: '더운 날 새콤한 게 당겨 냉채족발로 골랐어요',
    keyword: '냉채족발', servingUnit: '한 접시', priceFeel: '새콤하게 한 접시 하기 좋은',
    tasteExtra: '겨자 소스와 아삭한 채소가 족발과 어우러지는',
    sceneExtra: '더운 계절 손님이 자주 찾는 풍경',
    hookExtra: '겨자 향이 상큼하게 코끝을 스쳤어요',
    decisionPoint: '새콤 상큼하면 냉채가 무난, 뜨끈한 걸 찾으면 불족발이 나을 수 있음',
  },
  '불족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '매콤한 불족발 하러',
    tasteCore: '매콤한 양념 배어들고 쫀득하게 씹히는',
    sceneCore: '벌겋게 양념 밴 족발 접시, 매운맛에 물 들이켜는 손님들',
    hookCore: '매콤한 게 당겨 불족발 하러 들어갔어요',
    keyword: '불족발', servingUnit: '한 접시', priceFeel: '매콤하게 한 접시 하기 좋은',
    tasteExtra: '매콤달콤한 양념이 껍질에 배어드는',
    sceneExtra: '매운맛 좋아하는 손님이 자주 찾는 풍경',
    hookExtra: '매콤한 양념 향이 자리까지 퍼졌어요',
    decisionPoint: '매콤한 결이면 불족발이 무난, 불맛까지면 직화불족발이 나을 수 있음',
  },
  '직화불족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '불맛 나는 직화불족발 하러',
    tasteCore: '직화로 불맛 입히고 매콤하게 배어드는',
    sceneCore: '불에 그을린 자국 남은 족발 접시, 불향 도는 풍경',
    hookCore: '불맛 나는 매운 족발이 당겨 직화불족발로 골랐어요',
    keyword: '직화불족발', servingUnit: '한 접시', priceFeel: '불맛 나게 한 접시 하기 좋은',
    tasteExtra: '직화 불향과 매콤한 양념이 겹치는',
    sceneExtra: '불향 좋아하는 손님이 자주 찾는 풍경',
    hookExtra: '불향이 은근하게 감도는 접시가 나왔어요',
    decisionPoint: '불맛까지면 직화불족발이 무난, 매콤함만이면 불족발이 나을 수 있음',
  },
  '마늘족발': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '마늘 향 진한 마늘족발 하러',
    tasteCore: '마늘 향 진하게 배고 고소하게 씹히는',
    sceneCore: '구운 마늘 곁들인 족발 접시, 마늘 향 도는 풍경',
    hookCore: '마늘 향 진한 게 당겨 마늘족발로 골랐어요',
    keyword: '마늘족발', servingUnit: '한 접시', priceFeel: '고소하게 한 접시 하기 좋은',
    tasteExtra: '구운 마늘과 족발이 고소하게 어우러지는',
    sceneExtra: '마늘 향 좋아하는 손님이 자주 찾는 풍경',
    hookExtra: '고소한 마늘 향이 접시에서 올라왔어요',
    decisionPoint: '마늘 향이면 마늘족발이 무난, 기본 결이면 족발이 나을 수 있음',
  },
  '보쌈': {
    genericName: '족발집', altGenericNames: ['보쌈집', '식당', '가게'],
    motive: '삶은 수육에 쌈 싸 먹으러',
    tasteCore: '부드럽게 삶은 고기와 김치·쌈이 어우러지는',
    sceneCore: '보쌈김치와 쌈채소 곁들여 한 쌈씩 싸 먹는 손님들',
    hookCore: '족발집 왔다가 보쌈도 같이 시켜 봤어요',
    keyword: '보쌈', servingUnit: '한 접시', priceFeel: '푸짐하게 한 접시 하기 좋은',
    tasteExtra: '삶은 고기에 보쌈김치 얹어 쌈 싸 먹는',
    sceneExtra: '쌈채소 곁들여 나눠 먹는 풍경',
    hookExtra: '삶은 고기 김이 접시에서 올라왔어요',
    decisionPoint: '쌈으로 먹으면 보쌈이 무난, 족발까지면 족발보쌈세트가 나을 수 있음',
  },
  '족발보쌈세트': {
    genericName: '족발집', altGenericNames: ['식당', '가게'],
    motive: '족발과 보쌈 둘 다 맛보러',
    tasteCore: '쫀득한 족발과 부드러운 보쌈을 한 상에서 즐기는',
    sceneCore: '족발과 보쌈 나란히 놓인 한 상, 여럿이 둘러앉은 풍경',
    hookCore: '고를 게 많아 족발보쌈세트로 둘 다 시켰어요',
    keyword: '족발보쌈세트', servingUnit: '한 상', priceFeel: '푸짐하게 한 상 하기 좋은',
    tasteExtra: '족발과 보쌈을 한 번에 비교하며 먹는',
    sceneExtra: '여럿이 나눠 먹기 좋은 풍성한 상차림',
    hookExtra: '한 상 가득 족발과 보쌈이 같이 나왔어요',
    decisionPoint: '둘 다 맛보면 세트가 무난, 한쪽 위주면 족발·보쌈 단품이 나을 수 있음',
  },

  // ═══════════════════════════════════════════════════════
  // 분식 — 맵고분식 (공릉동·태릉입구역) ★ v1.2 실매장 8종
  // ⚠ 국물요리 ritual 전이 금지 — 분식은 "간식·끼니·포장" 결
  // ⚠ 광고 표현 금지 / "메뉴를 먹는 상황" 중심
  // ⚠ 가격 필드 제거 (pricePattern X) → priceFeel(부담 없는 결)만
  // ⚠ A안: menu키 = 표시명(실매장명). keyword = SEO 단순형(검색량 확보)
  // ═══════════════════════════════════════════════════════
  '매콤한 떡볶이': {
    genericName: '분식집',
    altGenericNames: ['떡볶이집', '가게', '여기'],
    motive: '매콤한 떡볶이 한 그릇 생각나서',
    tasteCore: '걸쭉한 고추장 양념, 쫄깃한 떡, 칼칼하게 올라오는 매운맛',
    sceneCore: '포장 손님과 매장 손님이 번갈아 드나드는 동네 분식집 풍경',
    hook: '뚜껑 열자 매콤한 양념 냄새부터 확 올라왔어요',
    keyword: '떡볶이',
    priceFeel: '부담 없이 한 그릇 먹기 좋은',
    tableware: '접시 또는 포장 용기, 종이컵, 단무지',
    sidedishes: ['단무지', '어묵국물'],
    timeOfDay: ['점심', '오후', '저녁'],
  },

  '매콤 로제 떡볶이': {
    genericName: '분식집',
    altGenericNames: ['떡볶이집', '가게', '여기'],
    motive: '매운 거 부담될 때 부드러운 떡볶이 먹으러',
    tasteCore: '크림과 고추장이 섞인 로제 소스, 부드러우면서 살짝 매콤한 맛',
    sceneCore: '젊은 손님·학생 손님이 자주 찾는 분식집 분위기',
    hook: '한 입 먹으니 매운맛보다 크림 고소함이 먼저 올라왔어요',
    keyword: '로제떡볶이',
    priceFeel: '가볍게 한 끼 해결하기 좋은',
    tableware: '접시 또는 포장 용기, 종이컵',
    sidedishes: ['단무지', '어묵국물'],
    timeOfDay: ['점심', '오후', '저녁'],
  },

  '참치마요 꼬마김밥': {
    genericName: '분식집',
    altGenericNames: ['김밥집', '가게', '여기'],
    motive: '간단하게 한 끼 또는 곁들일 거 포장하러',
    tasteCore: '한입 크기로 말린 작은 김밥, 고소한 참치마요가 밥과 어우러지는 맛',
    sceneCore: '포장 줄 서는 점심시간, 한 줄씩 말아내는 풍경',
    hook: '한입 크기라 손에 들고 먹기 편했어요',
    keyword: '꼬마김밥',
    priceFeel: '간단하게 먹기 좋은',
    tableware: '접시 또는 포장 용기, 단무지',
    sidedishes: ['단무지', '어묵국물'],
    timeOfDay: ['아침', '점심', '오후'],
  },

  '매운어묵 꼬마김밥': {
    genericName: '분식집',
    altGenericNames: ['김밥집', '가게', '여기'],
    motive: '간단하게 한 끼 또는 곁들일 거 포장하러',
    tasteCore: '한입 크기 김밥에 칼칼한 매운어묵이 들어가 살짝 매콤한 맛',
    sceneCore: '포장 줄 서는 점심시간, 한 줄씩 말아내는 풍경',
    hook: '한 입 베어 무니 매콤한 어묵 맛이 은근하게 올라왔어요',
    keyword: '꼬마김밥',
    priceFeel: '간단하게 먹기 좋은',
    tableware: '접시 또는 포장 용기, 단무지',
    sidedishes: ['단무지', '어묵국물'],
    timeOfDay: ['아침', '점심', '오후'],
  },

  '수제 모둠튀김': {
    genericName: '분식집',
    altGenericNames: ['튀김집', '가게', '여기'],
    motive: '바삭한 튀김 곁들여 먹으려고',
    tasteCore: '갓 튀겨 바삭한 튀김옷, 야채·김말이·오징어 등 여러 종류',
    sceneCore: '튀김 진열대 앞에서 골라 담는 풍경',
    hook: '갓 튀긴 거라 베어 물자 바삭 소리부터 났어요',
    keyword: '튀김',
    priceFeel: '여러 개 골라 담기 좋은',
    tableware: '접시 또는 포장 용기, 떡볶이 국물',
    sidedishes: ['떡볶이 양념', '단무지'],
    timeOfDay: ['점심', '오후', '저녁'],
  },

  // ─── 사이드 메뉴 계열 ───
  '찰순대': {
    genericName: '분식집',
    altGenericNames: ['김밥집', '가게', '여기'],
    motive: '떡볶이에 곁들일 순대 한 접시 추가하러',
    tasteCore: '쫄깃한 찰순대, 소금 또는 떡볶이 양념에 찍어 먹는 조합',
    sceneCore: '떡볶이 옆에 순대 접시 같이 놓인 풍경',
    hook: '순대를 떡볶이 양념에 찍어 한 점 먹어봤어요',
    keyword: '순대',
    priceFeel: '곁들이기 좋은',
    tableware: '접시 또는 포장 용기, 소금, 떡볶이 양념',
    sidedishes: ['단무지'],
    timeOfDay: ['점심', '오후', '저녁'],
  },

  '오뎅꼬치': {
    genericName: '분식집',
    altGenericNames: ['가게', '여기'],
    motive: '따뜻한 국물에 오뎅꼬치 하나 집어 먹으러',
    tasteCore: '뜨끈한 어묵 국물, 부드러운 어묵의 담백함',
    sceneCore: '어묵 냄비 앞에서 국물부터 한 컵 마시는 풍경',
    hook: '종이컵에 국물부터 받아서 한 모금 마셨어요',
    keyword: '어묵',
    priceFeel: '출출할 때 하나씩 집어 먹기 좋은',
    tableware: '꼬치, 종이컵, 간장',
    sidedishes: ['어묵국물'],
    timeOfDay: ['오후', '저녁'],
  },

  '라면': {
    genericName: '분식집',
    altGenericNames: ['가게', '여기'],
    motive: '간단하고 든든하게 라면 한 그릇',
    tasteCore: '얼큰한 라면 국물, 꼬들꼬들한 면, 계란·떡 추가 조합',
    sceneCore: '냄비째 나온 라면을 앞접시에 덜어 먹는 풍경',
    hook: '냄비 뚜껑 열자 김이 확 올라왔어요',
    keyword: '라면',
    servingUnit: '한 그릇',
    priceFeel: '가볍게 한 끼 해결하기 좋은',
    tableware: '양은냄비 또는 그릇, 앞접시, 단무지',
    sidedishes: ['단무지', '김치'],
    timeOfDay: ['점심', '오후', '저녁', '야식'],
  },

  // 2차 확장 (관계·감성형 — fossil 검증 후):
  // '삼겹살': { genericName: '고깃집', motive: '회식 자리 잡을 곳 찾다가', ... },
  // '파스타': { genericName: '파스타집', motive: '데이트 분위기 있는 식사하러', ... },
  // ═══════════════════════════════════════════════════════
  // ★ 닭발 전문점 표준 메뉴셋 감성 (SPECIALTY: dakbal · 2026-07-16)
  //   조합 경험 업종 — decisionPoint = '무엇을 먹을까'가 아니라 '어떻게 조합할까'.
  //   메인→사이드→사리→마무리(볶음밥)로 이어지는 주문 흐름을 Data에 심는다.
  //   ⚠ 매운맛 결 / 나눔 결 / 마무리 결 구분. 광고 표현 금지, 단정 금지.
  // ═══════════════════════════════════════════════════════

  // ─── CATEGORY 1: 직화 ───
  '통뼈닭발': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '매운 안주에 한잔 곁들이며 뜯는 재미를 보고 싶어서',
    tasteCore: '숯불에 직화로 구워낸 매콤한 양념, 쫀득하게 붙은 살과 뼈째 뜯는 식감, 불향 도는 매운맛',
    sceneCore: '뼈 발라가며 천천히 뜯는 손님들, 물수건과 비닐장갑 먼저 놓이는 자리',
    hook: '장갑 끼고 한 점 뜯자마자 불향이 확 올라왔어요',
    keyword: '통뼈닭발',
    servingUnit: '한 접시',
    priceFeel: '한잔 곁들이며 오래 앉기 좋은',
    tableware: '접시, 비닐장갑, 물수건, 무절임, 계란찜',
    sidedishes: ['무절임', '계란찜', '콩나물국', '양배추'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '퇴근 후 한잔·매운 안주가 당길 때·천천히 뜯으며 이야기할 때처럼 시간 들여 즐길 안주를 찾을 때',
    titlePurpose: '한잔하기 좋은',
    portionFeel: '뼈째라 양은 넉넉해 보여도 뜯다 보면 둘이 한 접시가 무난, 매운맛 단계는 매장마다 차이가 있는 편',
    sharingFeel: '가운데 두고 나눠 뜯는 안주 — 개인 접시보다 함께 집는 구성',
    usageType: '술안주용',
    paceFeel: '천천히 뜯으며 오래 앉는 편 — 계란찜·주먹밥을 곁들여 매운맛 사이를 채움',
    visitTiming: '저녁부터 밤까지, 퇴근 후 한잔 자리로 자주 나감',
    bestCompanion: '친구·동료·연인',
    decisionPoint: '뜯는 재미와 불향을 즐기려면 통뼈가 무난, 대화하며 편하게 먹고 싶으면 무뼈, 매운맛에 지치면 계란찜을 먼저 곁들이고 남은 양념은 볶음밥으로 마무리하는 흐름이 많음',
  },
  '무뼈닭발': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '손 덜 쓰고 편하게 매운 안주를 즐기고 싶어서',
    tasteCore: '뼈를 발라낸 살만 매콤하게 볶아낸 양념, 부드럽게 씹히는 식감, 젓가락으로 바로 집는 편함',
    sceneCore: '장갑 없이 젓가락으로 집으며 대화 이어가는 자리, 계란찜 그릇이 곁에 놓인 풍경',
    hook: '젓가락으로 바로 집어 한 입 넣자 매콤함이 확 퍼졌어요',
    keyword: '무뼈닭발',
    servingUnit: '한 접시',
    priceFeel: '편하게 나눠 먹기 좋은',
    tableware: '접시, 젓가락, 물수건, 계란찜, 무절임',
    sidedishes: ['계란찜', '무절임', '주먹밥', '콩나물국'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '대화하며 편하게 먹을 때·손에 양념 묻히기 싫을 때·처음 닭발 먹어볼 때처럼 부담 없이 즐길 안주를 찾을 때',
    titlePurpose: '편하게 먹기 좋은',
    portionFeel: '살만 있어 먹기 편하고 둘이 한 접시가 무난, 매운맛 단계 조절이 가능한 편',
    sharingFeel: '나눠 집기 편한 안주 — 대화하며 계속 집게 되는 구성',
    usageType: '술안주용',
    paceFeel: '손 덜 쓰고 대화하며 천천히 — 주먹밥·계란찜을 번갈아 곁들이는 편',
    visitTiming: '저녁 한잔 자리, 손에 양념 묻히기 싫은 모임에서 자주 나감',
    bestCompanion: '친구·연인·직장 동료',
    decisionPoint: '대화하며 편하게 집으려면 무뼈가 무난, 뜯는 재미를 원하면 통뼈, 매운맛이 부담이면 계란찜을 함께 시키고 주먹밥으로 양을 보완하다 볶음밥으로 마무리하는 조합이 흔함',
  },

  // ─── CATEGORY 2: 국물 ───
  '국물닭발': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '얼큰한 국물에 사리까지 넣어 든든하게 즐기고 싶어서',
    tasteCore: '자작하게 끓인 얼큰한 양념 국물, 쫀득한 닭발과 배어든 매운맛, 사리가 국물을 머금는 식감',
    sceneCore: '냄비째 끓이며 국물 졸아드는 걸 지켜보는 자리, 사리 추가를 이야기하는 풍경',
    hook: '국물이 자작하게 졸자 사리부터 넣자는 말이 나왔어요',
    keyword: '국물닭발',
    servingUnit: '한 냄비',
    priceFeel: '사리 넣어 든든하게 먹기 좋은',
    tableware: '냄비, 앞접시, 국자, 사리, 공깃밥',
    sidedishes: ['우동사리', '당면사리', '공깃밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '얼큰한 국물이 당길 때·사리 넣어 든든하게 먹을 때·추운 날 뜨끈하게 즐길 때처럼 국물째 오래 먹을 자리를 찾을 때',
    titlePurpose: '얼큰하게 먹기 좋은',
    portionFeel: '국물과 사리까지 있어 든든한 편, 매운맛은 국물이 졸수록 진해지는 편',
    sharingFeel: '가운데 냄비 두고 덜어 먹는 구성 — 사리 추가로 양을 늘려가는 편',
    usageType: '술안주·끼니 겸용',
    paceFeel: '국물 졸이며 천천히 — 사리 넣고 마지막엔 밥 말아 먹는 흐름',
    visitTiming: '저녁·밤 한잔 자리, 추운 계절에 특히 자주 나감',
    bestCompanion: '친구·동료·가족',
    decisionPoint: '국물째 든든하게 먹으려면 국물닭발이 무난, 국물이 졸면 우동사리나 당면사리를 넣고 마지막엔 공깃밥을 말아 마무리하는 흐름이 많음. 뼈가 부담이면 무뼈국물 쪽이 나을 수 있음',
  },
  '무뼈국물닭발': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '국물은 즐기되 뼈 없이 편하게 사리까지 먹고 싶어서',
    tasteCore: '뼈 없는 살이 얼큰한 국물에 배어든 맛, 부드러운 식감에 사리가 어우러지는 국물 요리',
    sceneCore: '뼈 신경 안 쓰고 국물과 사리를 떠먹는 자리, 앞접시에 덜어 나누는 풍경',
    hook: '뼈 없이 국물째 한 술 떠먹자 매콤함이 부드럽게 퍼졌어요',
    keyword: '무뼈국물닭발',
    servingUnit: '한 냄비',
    priceFeel: '편하게 국물까지 먹기 좋은',
    tableware: '냄비, 앞접시, 국자, 사리, 공깃밥',
    sidedishes: ['우동사리', '치즈사리', '공깃밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '국물은 즐기되 뼈가 부담일 때·사리 넣어 편하게 먹을 때·아이 있는 자리처럼 손 덜 쓰고 국물째 먹을 자리를 찾을 때',
    titlePurpose: '편하게 먹기 좋은',
    portionFeel: '뼈가 없어 먹기 편하고 사리까지 넣으면 든든한 편, 매운맛 조절이 되는 편',
    sharingFeel: '냄비째 나눠 덜어 먹는 구성 — 사리로 양을 늘려 함께 먹는 편',
    usageType: '술안주·끼니 겸용',
    paceFeel: '뼈 신경 없이 천천히 — 사리 넣고 밥까지 이어 먹는 흐름',
    visitTiming: '저녁·밤 자리, 뼈 부담 없이 국물 먹고 싶을 때 자주 나감',
    bestCompanion: '가족·연인·친구',
    decisionPoint: '뼈 없이 국물까지 편하게 먹으려면 무뼈국물이 무난, 뜯는 재미를 원하면 국물닭발, 국물이 졸면 우동·치즈사리를 넣고 밥으로 마무리하는 조합이 흔함',
  },

  // ─── CATEGORY 3: 별미 ───
  '오돌뼈': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '오독오독 씹는 식감으로 안주 하나 더 곁들이고 싶어서',
    tasteCore: '오독오독 씹히는 연골 식감, 매콤달콤하게 볶아낸 양념, 불향 도는 마무리',
    sceneCore: '식감 이야기 나누며 젓가락 가는 자리, 볶음밥으로 이어갈지 상의하는 풍경',
    hook: '한 점 씹자 오독 소리부터 났어요',
    keyword: '오돌뼈',
    servingUnit: '한 접시',
    priceFeel: '식감 즐기며 곁들이기 좋은',
    tableware: '접시, 젓가락, 물수건, 무절임',
    sidedishes: ['무절임', '계란찜', '볶음밥', '콩나물국'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '씹는 식감이 당길 때·닭발과 다른 안주를 곁들일 때·볶음밥으로 이어가고 싶을 때처럼 식감 별미를 하나 더 찾을 때',
    titlePurpose: '곁들이기 좋은',
    portionFeel: '곁들임으로 한 접시가 무난, 양념이 진해 밥과 잘 어울리는 편',
    sharingFeel: '나눠 집는 별미 안주 — 메인과 함께 시키는 경우가 많음',
    usageType: '술안주·곁들임용',
    paceFeel: '씹으며 천천히 — 남은 양념은 볶음밥으로 이어가는 편',
    visitTiming: '저녁 한잔 자리, 닭발에 식감 하나 더할 때 자주 나감',
    bestCompanion: '친구·동료·연인',
    decisionPoint: '씹는 식감을 원하면 오돌뼈가 무난, 매운 안주 뒤 입가심엔 닭똥집, 남은 양념은 볶음밥으로 이어가는 흐름이 많음',
  },
  '닭똥집': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '쫄깃한 식감에 부담 없는 안주를 곁들이고 싶어서',
    tasteCore: '쫄깃하게 씹히는 식감, 마늘·소금 간의 고소함 또는 매콤 양념, 담백한 마무리',
    sceneCore: '매운 안주 사이 젓가락 옮겨 가는 자리, 소금장에 찍어 먹는 풍경',
    hook: '쫄깃한 한 점을 소금장에 찍어 넣자 고소함이 돌았어요',
    keyword: '닭똥집',
    servingUnit: '한 접시',
    priceFeel: '가볍게 곁들이기 좋은',
    tableware: '접시, 소금장, 젓가락, 무절임',
    sidedishes: ['소금장', '무절임', '양배추', '콩나물국'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '매운맛 사이 입가심이 필요할 때·담백한 안주를 곁들일 때·부담 없이 하나 더 시킬 때처럼 가벼운 별미를 찾을 때',
    titlePurpose: '가볍게 곁들이기 좋은',
    portionFeel: '한 접시를 여럿이 나눠 집는 곁들임 양, 담백해 매운 메인과 균형이 맞는 편',
    sharingFeel: '나눠 집기 좋은 곁들임 — 매운 메뉴와 번갈아 먹는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '매운 안주 사이 천천히 — 입가심으로 번갈아 집는 편',
    visitTiming: '저녁 한잔 자리, 매운 메인에 담백함을 더할 때 자주 나감',
    bestCompanion: '친구·동료·연인',
    decisionPoint: '매운맛 사이 담백한 입가심이면 닭똥집이 무난, 식감을 원하면 오돌뼈, 살코기가 당기면 닭날개나 닭목살을 곁들이는 편',
  },
  '닭날개': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '살코기 안주로 든든하게 곁들이고 싶어서',
    tasteCore: '겉은 바삭 속은 촉촉한 살, 매콤 양념 또는 소금 간, 뼈 사이 살 발라 먹는 재미',
    sceneCore: '살 발라가며 천천히 뜯는 자리, 물수건 옆에 두고 먹는 풍경',
    hook: '바삭한 겉면을 한 입 베자 속살에서 육즙이 돌았어요',
    keyword: '닭날개',
    servingUnit: '한 접시',
    priceFeel: '살코기로 든든하게 곁들이기 좋은',
    tableware: '접시, 물수건, 무절임, 소금',
    sidedishes: ['무절임', '양배추', '콩나물국', '계란찜'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '살코기 안주가 당길 때·매운 것 사이 든든함을 더할 때·아이와 나눠 먹을 때처럼 살 있는 별미를 찾을 때',
    titlePurpose: '든든하게 곁들이기 좋은',
    portionFeel: '살이 있어 곁들임치고 든든한 편, 매운 메인과 함께 시키면 균형이 맞는 편',
    sharingFeel: '나눠 뜯는 살코기 안주 — 매운 메뉴와 함께 시키는 경우가 많음',
    usageType: '술안주·곁들임용',
    paceFeel: '살 발라가며 천천히 — 매운 메인과 번갈아 먹는 편',
    visitTiming: '저녁 한잔 자리, 살코기 안주가 필요할 때 자주 나감',
    bestCompanion: '친구·가족·동료',
    decisionPoint: '살코기로 든든하게 곁들이려면 닭날개가 무난, 부드러운 살이 좋으면 닭목살, 씹는 식감엔 오돌뼈를 고르는 편',
  },
  '닭목살': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '쫄깃하고 부드러운 살코기 안주를 곁들이고 싶어서',
    tasteCore: '쫄깃하면서 부드러운 목살 식감, 기름기 도는 고소함, 매콤 양념 또는 소금 간',
    sceneCore: '한 점씩 집어 씹으며 대화 이어가는 자리, 소금장 곁에 둔 풍경',
    hook: '한 점 씹자 쫄깃함 뒤에 고소한 기름기가 돌았어요',
    keyword: '닭목살',
    servingUnit: '한 접시',
    priceFeel: '부드럽게 곁들이기 좋은',
    tableware: '접시, 소금장, 젓가락, 무절임',
    sidedishes: ['소금장', '무절임', '양배추', '계란찜'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '부드러운 살코기가 당길 때·매운 것 사이 고소함을 더할 때·씹는 맛을 즐길 때처럼 부드러운 별미를 찾을 때',
    titlePurpose: '부드럽게 곁들이기 좋은',
    portionFeel: '한 접시를 나눠 집는 곁들임 양, 부드러워 매운 메인과 번갈아 먹기 좋은 편',
    sharingFeel: '나눠 집는 살코기 안주 — 메인과 함께 시키는 구성',
    usageType: '술안주·곁들임용',
    paceFeel: '한 점씩 천천히 — 매운 메인과 번갈아 씹는 편',
    visitTiming: '저녁 한잔 자리, 부드러운 살코기를 더할 때 자주 나감',
    bestCompanion: '친구·연인·동료',
    decisionPoint: '부드러운 살코기면 닭목살이 무난, 바삭한 식감엔 닭날개, 오독한 식감엔 오돌뼈를 곁들이는 편',
  },

  // ─── CATEGORY 4: 사이드 ───
  '계란찜': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '매운맛을 눅여줄 부드러운 사이드를 곁들이고 싶어서',
    tasteCore: '뚝배기에 봉긋하게 부풀어 오른 부드러운 계란, 순한 간, 매운맛을 달래는 포근함',
    sceneCore: '매운 안주 옆에 봉긋한 뚝배기가 놓이는 자리, 한 술씩 떠 나누는 풍경',
    hook: '봉긋하게 부풀어 나온 계란찜을 한 술 뜨자 김이 폭 올라왔어요',
    keyword: '계란찜',
    servingUnit: '한 뚝배기',
    priceFeel: '매운맛 달래며 곁들이기 좋은',
    tableware: '뚝배기, 앞접시, 숟가락',
    sidedishes: ['닭발', '주먹밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '매운맛이 부담될 때·아이와 함께 먹을 때·부드러운 사이드가 필요할 때처럼 매운 안주를 달랠 곁들임을 찾을 때',
    titlePurpose: '곁들이기 좋은',
    portionFeel: '뚝배기 하나를 여럿이 나눠 뜨는 양, 매운 메인과 거의 함께 시키는 편',
    sharingFeel: '가운데 두고 나눠 뜨는 사이드 — 매운 메뉴와 짝으로 시키는 구성',
    usageType: '곁들임·완화용',
    paceFeel: '매운맛 사이사이 한 술씩 — 부드럽게 달래며 먹는 편',
    visitTiming: '닭발 시킬 때 거의 함께, 저녁·밤 자리에서 기본처럼 나감',
    bestCompanion: '친구·가족·연인',
    decisionPoint: '매운맛을 달래려면 계란찜을 먼저 곁들이는 편, 든든함을 더하려면 주먹밥, 마무리는 볶음밥으로 이어가는 흐름이 많음',
  },
  '주먹밥': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '안주 사이 든든함을 더하고 양을 보완하고 싶어서',
    tasteCore: '김가루와 참기름 향이 도는 고소한 밥, 한입 크기로 뭉친 든든함, 양념에 찍어 먹는 재미',
    sceneCore: '매운 안주 곁에 놓인 주먹밥을 하나씩 집는 자리, 남은 양념에 굴려 먹는 풍경',
    hook: '한입 주먹밥을 남은 양념에 굴려 넣자 고소함이 돌았어요',
    keyword: '주먹밥',
    servingUnit: '한 접시',
    priceFeel: '든든함 더하기 좋은',
    tableware: '접시, 젓가락, 앞접시',
    sidedishes: ['닭발', '계란찜', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '안주만으론 허전할 때·든든함을 더할 때·매운 양념에 밥을 곁들일 때처럼 양을 보완할 사이드를 찾을 때',
    titlePurpose: '든든하게 곁들이기 좋은',
    portionFeel: '한 접시를 나눠 집는 양, 안주 사이 허기를 채우기 좋은 편',
    sharingFeel: '나눠 집는 사이드 — 매운 메뉴 사이 든든함을 더하는 구성',
    usageType: '곁들임·양보완용',
    paceFeel: '안주 사이사이 하나씩 — 매운맛 사이 든든하게 채우는 편',
    visitTiming: '닭발과 함께, 안주만으로 허전할 때 자주 나감',
    bestCompanion: '친구·동료·가족',
    decisionPoint: '안주 사이 든든함을 더하려면 주먹밥이 무난, 매운맛을 달래려면 계란찜을 먼저, 마지막 남은 양념은 볶음밥으로 마무리하는 흐름이 많음',
  },
  '볶음밥': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '남은 양념에 밥을 볶아 마무리로 든든하게 먹고 싶어서',
    tasteCore: '남은 매운 양념에 김가루·참기름 넣어 볶아낸 밥, 눌어붙은 누룽지 향, 마무리다운 든든함',
    sceneCore: '접시 남은 양념을 모아 밥을 볶아 달라 하는 자리, 철판에 눌어붙는 소리 나는 풍경',
    hook: '남은 양념에 밥을 볶아내자 고소한 냄새가 확 퍼졌어요',
    keyword: '볶음밥',
    servingUnit: '한 공기',
    priceFeel: '마무리로 든든하게 먹기 좋은',
    tableware: '철판 또는 접시, 앞접시, 숟가락',
    sidedishes: ['남은 양념', '김가루', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '안주 다 먹고 마무리할 때·남은 양념이 아까울 때·밥으로 배를 채울 때처럼 자리를 든든하게 마칠 때',
    titlePurpose: '마무리로 먹기 좋은',
    portionFeel: '남은 양념 양에 따라 다르지만 여럿이 나눠 마무리하기 좋은 편',
    sharingFeel: '가운데 두고 나눠 뜨는 마무리 — 자리 끝에 함께 먹는 구성',
    usageType: '마무리·식사용',
    paceFeel: '자리 끝에 천천히 — 남은 양념을 모아 마지막을 채우는 편',
    visitTiming: '안주를 다 먹은 자리 끝, 저녁·밤 마무리로 자주 나감',
    bestCompanion: '친구·동료·연인',
    decisionPoint: '남은 양념으로 마무리하려면 볶음밥이 무난, 국물 계열이면 공깃밥을 말아 먹는 편. 마무리 전 든든함은 주먹밥으로 미리 보완하는 흐름이 많음',
  },
  '오뎅탕': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '얼큰한 안주 사이 시원한 국물을 곁들이고 싶어서',
    tasteCore: '멸치·다시마로 우린 시원한 국물, 부드러운 어묵, 매운맛을 씻어주는 개운함',
    sceneCore: '매운 안주 옆에 김 오르는 국물 냄비가 놓이는 자리, 국물부터 떠 나누는 풍경',
    hook: '시원한 국물을 한 술 떠먹자 매운 기운이 가라앉았어요',
    keyword: '오뎅탕',
    servingUnit: '한 냄비',
    priceFeel: '국물 곁들이기 좋은',
    tableware: '냄비, 앞접시, 국자',
    sidedishes: ['닭발', '무절임', '공깃밥'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '매운맛을 씻어줄 국물이 필요할 때·시원한 안주를 곁들일 때·술자리 국물이 당길 때처럼 개운한 곁들임을 찾을 때',
    titlePurpose: '곁들이기 좋은',
    portionFeel: '냄비 하나를 여럿이 나눠 뜨는 양, 매운 메인과 짝으로 시키는 편',
    sharingFeel: '가운데 두고 나눠 뜨는 국물 — 매운 메뉴와 함께 시키는 구성',
    usageType: '곁들임·완화용',
    paceFeel: '매운 안주 사이사이 국물 한 술 — 개운하게 씻으며 먹는 편',
    visitTiming: '저녁·밤 한잔 자리, 매운 안주에 국물을 더할 때 자주 나감',
    bestCompanion: '친구·동료·가족',
    decisionPoint: '매운맛을 국물로 씻으려면 오뎅탕이 무난, 부드럽게 달래려면 계란찜, 조갯국물이 당기면 조개탕을 고르는 편',
  },
  '조개탕': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '시원하고 개운한 조갯국물로 매운맛을 씻고 싶어서',
    tasteCore: '조개에서 우러난 시원한 국물, 담백한 감칠맛, 매운 안주를 개운하게 씻어주는 맑은맛',
    sceneCore: '조개 껍데기 쌓이는 앞접시, 매운 안주 사이 국물을 떠 나누는 풍경',
    hook: '맑은 국물을 한 술 떠먹자 조개 향이 개운하게 돌았어요',
    keyword: '조개탕',
    servingUnit: '한 냄비',
    priceFeel: '개운하게 곁들이기 좋은',
    tableware: '냄비, 앞접시, 국자',
    sidedishes: ['닭발', '무절임', '공깃밥'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '개운한 국물이 당길 때·매운맛을 맑게 씻을 때·조개 안주를 곁들일 때처럼 시원한 곁들임을 찾을 때',
    titlePurpose: '개운하게 곁들이기 좋은',
    portionFeel: '냄비 하나를 여럿이 나눠 뜨는 양, 매운 메인과 함께 시키면 균형이 맞는 편',
    sharingFeel: '가운데 두고 나눠 뜨는 국물 — 매운 메뉴와 짝으로 시키는 구성',
    usageType: '곁들임·완화용',
    paceFeel: '매운 안주 사이 국물 한 술 — 맑게 씻으며 천천히 먹는 편',
    visitTiming: '저녁·밤 한잔 자리, 개운한 국물이 필요할 때 자주 나감',
    bestCompanion: '친구·연인·동료',
    decisionPoint: '맑고 개운한 국물이면 조개탕이 무난, 어묵 국물이 당기면 오뎅탕, 부드럽게 달래려면 계란찜을 곁들이는 편',
  },

  // ─── CATEGORY 5: 사리 ───
  '당면사리': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '국물에 사리를 넣어 양을 늘리고 든든하게 먹고 싶어서',
    tasteCore: '국물을 머금어 쫄깃해진 당면, 양념이 배어든 매콤함, 후루룩 넘어가는 식감',
    sceneCore: '국물 졸아들 때 당면부터 넣자는 자리, 사리가 양념을 빨아들이는 풍경',
    hook: '국물에 넣은 당면이 양념을 머금자 후루룩 넘어갔어요',
    keyword: '당면사리',
    servingUnit: '일 인분',
    priceFeel: '양 늘려 든든하게 먹기 좋은',
    tableware: '냄비, 앞접시, 젓가락',
    sidedishes: ['국물닭발', '공깃밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '국물에 양을 더할 때·사리로 든든함을 채울 때·매운 양념을 사리에 묻혀 먹을 때처럼 국물 메뉴를 보완할 때',
    titlePurpose: '든든하게 채우기 좋은',
    portionFeel: '국물 메뉴에 넣어 양을 늘리는 사리, 여럿이 나눠 먹기 좋은 편',
    sharingFeel: '냄비에 넣어 함께 덜어 먹는 사리 — 국물 메뉴와 짝으로 시키는 구성',
    usageType: '사리·양보완용',
    paceFeel: '국물 졸 때 넣어 천천히 — 양념 머금은 사리를 건져 먹는 편',
    visitTiming: '국물닭발 시킬 때 함께, 저녁·밤 자리에서 자주 나감',
    bestCompanion: '친구·동료·가족',
    decisionPoint: '국물에 사리를 넣어 든든하게 먹으려면 당면사리가 무난, 면발이 굵은 게 좋으면 우동사리, 국물을 부드럽게는 치즈사리, 쫄깃함엔 떡사리를 고르는 편',
  },
  '우동사리': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '굵은 면발로 국물을 든든하게 채우고 싶어서',
    tasteCore: '탱탱하게 씹히는 굵은 우동면, 양념 국물을 머금은 쫄깃함, 후루룩 넘어가는 든든함',
    sceneCore: '국물에 우동 넣고 면이 퍼지기 전에 건지는 자리, 후루룩 나눠 먹는 풍경',
    hook: '국물에 넣은 우동을 건져 올리자 양념이 주르륵 묻어났어요',
    keyword: '우동사리',
    servingUnit: '일 인분',
    priceFeel: '든든하게 채우기 좋은',
    tableware: '냄비, 앞접시, 젓가락',
    sidedishes: ['국물닭발', '공깃밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '굵은 면으로 든든하게 채울 때·국물에 면을 넣어 먹을 때·후루룩 넘길 사리가 당길 때처럼 국물 메뉴를 보완할 때',
    titlePurpose: '든든하게 채우기 좋은',
    portionFeel: '굵은 면이라 사리 중 든든한 편, 여럿이 나눠 먹기 좋은 양',
    sharingFeel: '냄비에 넣어 함께 건져 먹는 사리 — 국물 메뉴와 짝으로 시키는 구성',
    usageType: '사리·양보완용',
    paceFeel: '퍼지기 전에 건져 후루룩 — 국물 든든할 때 넣어 먹는 편',
    visitTiming: '국물닭발 시킬 때 함께, 저녁·밤 자리에서 자주 나감',
    bestCompanion: '친구·동료·가족',
    decisionPoint: '굵은 면으로 든든하게면 우동사리가 무난, 가볍게 후루룩이면 당면사리, 국물을 부드럽게는 치즈사리, 쫄깃한 식감엔 떡사리를 고르는 편',
  },
  '치즈사리': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '매운맛을 부드럽게 감싸줄 치즈를 더하고 싶어서',
    tasteCore: '녹아 늘어나는 고소한 치즈, 매운 양념을 감싸는 부드러움, 매운맛 뒤 남는 고소함',
    sceneCore: '치즈가 쭉 늘어나는 걸 두고 젓가락 가는 자리, 매운맛 감싸 먹자는 풍경',
    hook: '치즈에 양념을 묻혀 들어 올리자 쭉 늘어났어요',
    keyword: '치즈사리',
    servingUnit: '일 인분',
    priceFeel: '매운맛 부드럽게 즐기기 좋은',
    tableware: '냄비 또는 철판, 앞접시, 젓가락',
    sidedishes: ['닭발', '국물닭발', '주먹밥'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '매운맛을 부드럽게 감쌀 때·치즈를 곁들이고 싶을 때·아이와 나눠 먹을 때처럼 매운 메뉴를 순하게 즐길 때',
    titlePurpose: '부드럽게 즐기기 좋은',
    portionFeel: '매운 메뉴에 곁들이는 사리, 여럿이 조금씩 묻혀 먹기 좋은 편',
    sharingFeel: '가운데 두고 함께 묻혀 먹는 사리 — 매운 메뉴와 짝으로 시키는 구성',
    usageType: '사리·완화용',
    paceFeel: '매운 안주 사이 치즈에 묻혀 — 부드럽게 감싸며 먹는 편',
    visitTiming: '매운 메뉴 시킬 때 함께, 저녁·밤 자리에서 자주 나감',
    bestCompanion: '친구·연인·가족',
    decisionPoint: '매운맛을 부드럽게 감싸려면 치즈사리가 무난, 국물을 든든하게는 우동·당면사리, 쫄깃한 식감엔 떡사리를 고르는 편',
  },
  '떡사리': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '쫄깃한 떡으로 양념을 묻혀 든든함을 더하고 싶어서',
    tasteCore: '쫄깃하게 씹히는 떡, 매운 양념이 겉에 배어든 맛, 국물이나 양념에 묻혀 먹는 든든함',
    sceneCore: '양념에 떡을 굴려 묻히는 자리, 쫄깃한 걸 나눠 집는 풍경',
    hook: '양념에 굴린 떡을 한 입 물자 쫄깃하게 늘어났어요',
    keyword: '떡사리',
    servingUnit: '일 인분',
    priceFeel: '쫄깃하게 곁들이기 좋은',
    tableware: '냄비 또는 철판, 앞접시, 젓가락',
    sidedishes: ['닭발', '국물닭발', '치즈사리'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '쫄깃한 식감을 더할 때·양념에 떡을 묻혀 먹을 때·든든함을 채울 때처럼 매운 메뉴를 보완할 때',
    titlePurpose: '쫄깃하게 곁들이기 좋은',
    portionFeel: '양념·국물에 곁들이는 사리, 여럿이 나눠 집기 좋은 양',
    sharingFeel: '함께 굴려 묻혀 먹는 사리 — 매운 메뉴와 짝으로 시키는 구성',
    usageType: '사리·양보완용',
    paceFeel: '양념에 굴려 천천히 — 쫄깃함을 즐기며 나눠 집는 편',
    visitTiming: '매운·국물 메뉴 시킬 때 함께, 저녁·밤 자리에서 자주 나감',
    bestCompanion: '친구·연인·가족',
    decisionPoint: '쫄깃한 식감을 더하려면 떡사리가 무난, 국물을 든든하게는 우동·당면사리, 매운맛을 부드럽게는 치즈사리를 고르는 편',
  },

  // ─── CATEGORY 6: 세트 ───
  '2인세트': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '둘이 와서 메인에 사이드까지 한 번에 시키고 싶어서',
    tasteCore: '메인 닭발에 계란찜·주먹밥 같은 사이드가 묶인 구성, 둘이 나눠 먹기 맞춘 양',
    sceneCore: '메뉴판에서 세트부터 짚으며 뭘 뺄지 상의하는 자리, 한 상 차려지는 풍경',
    hook: '세트가 한 상 차려지자 뭐부터 먹을지 손이 바빠졌어요',
    keyword: '2인세트',
    servingUnit: '한 상',
    priceFeel: '둘이 골고루 먹기 좋은',
    tableware: '접시, 뚝배기, 앞접시, 비닐장갑',
    sidedishes: ['계란찜', '주먹밥', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '둘이 와서 골고루 시킬 때·메인에 사이드를 묶어 편하게 주문할 때·가성비를 볼 때처럼 한 번에 구성하고 싶을 때',
    titlePurpose: '둘이 먹기 좋은',
    portionFeel: '둘이 메인과 사이드를 나눠 먹기 맞춘 양, 사리를 추가해 늘리는 편',
    sharingFeel: '한 상 차려 함께 나눠 먹는 구성 — 메인·사이드가 묶인 세트',
    usageType: '술안주·식사 겸용',
    paceFeel: '한 상 두고 천천히 — 사이드부터 곁들이다 볶음밥으로 마무리하는 편',
    visitTiming: '둘이 오는 저녁·밤 자리에서 자주 나감',
    bestCompanion: '연인·친구·동료',
    decisionPoint: '둘이 골고루 시키려면 2인세트가 무난, 인원이 늘면 3~4인세트, 양이 부족하면 사리를 추가하고 마무리는 볶음밥으로 이어가는 흐름이 많음',
  },
  '3~4인세트': {
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    motive: '여럿이 모여 메인부터 사이드까지 넉넉하게 시키고 싶어서',
    tasteCore: '메인 닭발에 여러 사이드·사리가 묶인 넉넉한 구성, 여럿이 골고루 나눠 먹는 양',
    sceneCore: '세트를 펼쳐 놓고 각자 앞접시에 덜어 가는 자리, 사리 추가를 상의하는 풍경',
    hook: '세트가 펼쳐지자 각자 앞접시에 덜기 바빴어요',
    keyword: '3~4인세트',
    servingUnit: '한 상',
    priceFeel: '여럿이 넉넉하게 먹기 좋은',
    tableware: '접시, 뚝배기, 냄비, 앞접시, 비닐장갑',
    sidedishes: ['계란찜', '주먹밥', '사리', '무절임'],
    timeOfDay: ['저녁', '밤'],
    recommendSituation: '여럿이 모일 때·메인과 사이드를 넉넉히 시킬 때·모임 자리 가성비를 볼 때처럼 한 번에 푸짐하게 구성하고 싶을 때',
    titlePurpose: '여럿이 먹기 좋은',
    portionFeel: '3~4인이 골고루 나눠 먹기 맞춘 양, 부족하면 사리·사이드를 추가하는 편',
    sharingFeel: '한 상 펼쳐 각자 덜어 먹는 구성 — 메인·사이드·사리가 묶인 세트',
    usageType: '술안주·모임용',
    paceFeel: '한 상 두고 오래 — 사이드 곁들이다 사리 넣고 볶음밥으로 마무리하는 편',
    visitTiming: '여럿이 모이는 저녁·밤 모임 자리에서 자주 나감',
    bestCompanion: '친구·동료·모임 일행',
    decisionPoint: '여럿이 넉넉하게면 3~4인세트가 무난, 둘이면 2인세트, 양이 부족하면 사리를 추가하고 국물 메뉴엔 사리, 마무리는 볶음밥으로 이어가는 흐름이 많음',
  },
};

// ─────────────────────────────────────────────────────────
// SITUATIONS — 상황 (왜 지금 이걸 먹는가)
// ─────────────────────────────────────────────────────────
export const RESTAURANT_SITUATIONS = [
  '해장',
  '혼밥',
  '비 오는 날',
  '야식',
  // 분식 결
  '간식',
  '포장',
  '학교 앞',
  // 1단계 검증 후 확장:
  // '주말 점심', '회식', '야근 후', '데이트', '가족 외식', '친구 모임',
  // '출근 전', '점심시간', '술자리 마무리',
];

// ─────────────────────────────────────────────────────────
// SITUATION_OVERRIDES — 상황별 톤 보정
// BASE_DIRECTION 위에 덮어씌움. 모든 필드 선택적.
// ─────────────────────────────────────────────────────────
export const SITUATION_OVERRIDES = {
  '해장': {
    motiveExtra: '전날 술 때문에 속이 너무 더부룩해서',
    tasteExtra: '뜨끈한 국물 한 숟갈 들어가니까 속이 풀리는 느낌',
    sceneExtra: '비슷한 처지로 보이는 손님들이 말없이 국물부터 떠먹고 있던 풍경',
    hookExtra: '한 숟갈 떠 넣자마자 속이 확 풀렸어요',
    flowBias: 'taste',  // taste 섹션 비중 강화
  },
  '혼밥': {
    motiveExtra: '혼자 빠르게 한 끼 해결하러',
    tasteExtra: '혼자라서 천천히 국물 맛에만 집중할 수 있었어요',
    sceneExtra: '카운터 자리에 혼자 앉은 손님들 몇 명, 어색하지 않은 분위기',
    hookExtra: '혼자 들어갔는데 1인용 자리가 따로 있어서 편했어요',
    flowBias: 'arrive',  // 1인석 유무·동선 강화
  },
  '비 오는 날': {
    motiveExtra: '비 와서 뜨끈한 국물 생각이 간절해서',
    tasteExtra: '빗소리 들으면서 뜨끈한 국물 한 술 하는데 그 조합이',
    sceneExtra: '창밖에 비 떨어지는 풍경 보이는 자리, 김 서린 유리창',
    hookExtra: '문 열고 들어가니 김 서린 유리창부터 눈에 들어왔어요',
    flowBias: 'scene',
  },
  '야식': {
    motiveExtra: '늦은 시간 출출해서 든든하게 한 그릇',
    tasteExtra: '늦은 시간인데도 국물이 갓 끓인 것처럼 진했어요',
    sceneExtra: '늦은 시간인데도 손님이 꽤 있던 분위기',
    hookExtra: '밤 11시 넘었는데 자리가 절반 정도 차 있더라고요',
    flowBias: 'arrive',
  },
  // ─── 분식 결 ───
  '간식': {
    motiveExtra: '오후에 간단하게 출출함 달래러',
    tasteExtra: '한 끼까진 아니어도 출출할 때 딱 좋은 양',
    sceneExtra: '오후 시간 가볍게 들러 먹고 가는 손님들 분위기',
    hookExtra: '많이는 아니고 출출할 때 딱 먹기 좋은 양이었어요',
    flowBias: 'taste',
  },
  '포장': {
    motiveExtra: '집에서 먹으려고 포장하러',
    tasteExtra: '포장이라 양념이 식을까 했는데 집에서도 괜찮았어요',
    sceneExtra: '포장 손님이 줄 서서 기다리는 카운터 앞 풍경',
    hookExtra: '포장 주문하고 잠깐 기다리니 따끈하게 담아주셨어요',
    flowBias: 'order',
  },
  '학교 앞': {
    motiveExtra: '학교 근처에서 친구랑 간단하게',
    tasteExtra: '예전 학교 앞에서 먹던 그 분식 느낌',
    sceneExtra: '학생 손님이 자주 보이는 분식집 특유의 분위기',
    hookExtra: '들어가니 학교 앞 분식집 특유의 익숙한 느낌이 났어요',
    flowBias: 'scene',
  },
};

// ─────────────────────────────────────────────────────────
// PURPOSES — 목적 (누구와 / 어떤 자리)
// ─────────────────────────────────────────────────────────
export const RESTAURANT_PURPOSES = [
  // ★ v3 방문목적 17종 (메뉴 검색 → 방문목적 검색 전환)
  '혼밥',
  '데이트',
  '회식',
  '가족 외식',
  '부모님 식사',
  '아이와 함께',
  '친구 모임',
  '손님 접대',
  '비 오는 날',
  '든든한 한 끼',
  '늦은 저녁',
  '점심 식사',
  '주차 편한 곳',
  '조용한 식당',
  '가성비 식사',
  '직장인 점심',
  '퇴근 후 식사',
  // ★ [철학 v2 / 2026-06-29] 방문목적(주축) 확장
  '저녁 식사',
  '주말 외식',
  '야식',
  '모임',
  // 분식 결 호환 유지 (기존 카드 keyword 참조 호환)
  '친구',
  '간단히',
  '가족모임',
];

// ★ v3 제목용 방문목적 표현 (PURPOSES 키 → 제목 선두 토큰)
//   titlePatterns의 {purpose} 자리에 들어가는 자연스러운 수식형
export const PURPOSE_TITLE_LABEL = {
  '혼밥': '혼밥하기 좋은',
  '데이트': '데이트하기 좋은',
  '회식': '회식하기 좋은',
  '가족 외식': '가족과 가기 좋은',
  '부모님 식사': '부모님 모시기 좋은',
  '아이와 함께': '아이와 함께 가기 좋은',
  '친구 모임': '친구들과 모임하기 좋은',
  '손님 접대': '중요한 손님 모실',
  '비 오는 날': '비 오는 날 가기 좋은',
  '든든한 한 끼': '든든하게 먹기 좋은',
  '늦은 저녁': '늦은 저녁 먹기 좋은',
  '점심 식사': '점심 먹기 좋은',
  '주차 편한 곳': '주차 편한',
  '조용한 식당': '조용한',
  '가성비 식사': '가볍게 먹기 좋은',
  '직장인 점심': '직장인 점심으로 좋은',
  '퇴근 후 식사': '퇴근 후 가기 좋은',
  // ★ [철학 v2 / 2026-06-29] 방문목적(주축) 확장 — 시간대·끼니 목적
  '저녁 식사': '저녁 먹기 좋은',
  '주말 외식': '주말에 가기 좋은',
  '야식': '야식 먹기 좋은',
  '모임': '모임하기 좋은',
  // 분식/기존 호환
  '친구': '친구랑 가기 좋은',
  '간단히': '간단히 먹기 좋은',
  '가족모임': '가족과 가기 좋은',
};

// ─────────────────────────────────────────────────────────
// PURPOSE_OVERRIDES — 목적별 톤 보정
// ★ v3 목적우선 필드(선택적): purposeMotive·decisionPoint·recommendSituation·visitTiming·bestCompanion
//   - 있으면 buildDirection이 목적 우선으로 합성. 없으면 MENU_BASE_DIRECTION 값으로 폴백.
//   - 핵심 목적부터 채움. 나머지는 base 폴백으로 안전 동작.
// ─────────────────────────────────────────────────────────
export const PURPOSE_OVERRIDES = {
  '혼밥': {
    sceneExtra: '혼자 와서 부담 없이 먹을 수 있는 분위기',
    tableExtra: '1인석 또는 바 자리 / 좁은 2인석',
    paceExtra: '식사 시간 30~40분 정도, 빠르게 먹고 나옴',
    purposeMotive: '혼자 편하게 한 끼 해결하고 싶은 상황',
    decisionPoint: '빠르게 혼자 먹기 좋은 단품·국물류가 잘 맞고, 여럿이 나눠 먹는 구성은 덜 맞는 편',
    recommendSituation: '혼밥·해장·바쁜 점심처럼 혼자 빠르게 먹고 싶을 때',
    visitTiming: '점심 피크를 살짝 비낀 시간이 자리 잡기 편함',
    bestCompanion: '혼자',
  },
  '데이트': {
    sceneExtra: '마주 앉아 천천히 이야기하기 좋은 자리',
    tableExtra: '2인 테이블, 옆자리와 간격 있는 편이 편함',
    paceExtra: '식사 시간 1시간 안팎, 여유 있게',
    purposeMotive: '둘이 여유 있게 식사하며 이야기 나누고 싶은 상황',
    decisionPoint: '대화하기 좋은 차분한 자리·적당한 소음이 중요. 회전 빠른 노포형은 덜 맞을 수 있음',
    recommendSituation: '데이트·기념일처럼 둘이 천천히 식사하고 싶을 때',
    visitTiming: '붐비는 시간을 피한 이른 저녁이 여유롭',
    bestCompanion: '연인',
  },
  '회식': {
    sceneExtra: '여러 명이 둘러앉아 나눠 먹기 좋은 분위기',
    tableExtra: '단체석·룸 유무, 4인 이상 합석 가능 여부',
    paceExtra: '식사 시간 1~2시간, 메뉴 여러 개 나눠 먹음',
    extraDetail: '여러 명이 함께 즐길 수 있는 구성인지 1줄 언급',
    purposeMotive: '여럿이 모여 든든하게 먹고 한 잔 곁들이기 좋은 상황',
    decisionPoint: '여럿이 나눠 먹기 좋은 고기류·푸짐한 구성이 잘 맞고, 1인 단품 위주는 덜 맞음',
    recommendSituation: '회식·모임처럼 여러 명이 함께 먹는 자리',
    visitTiming: '저녁 시간대, 단체 예약 가능 여부 확인',
    bestCompanion: '동료·단체',
  },
  '가족 외식': {
    sceneExtra: '4인 이상 모이기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블, 룸은 없는 경우 많음',
    paceExtra: '식사 시간 1시간 안팎, 천천히 대화하며',
    extraDetail: '가족이 함께 먹기 편한 정도인지(간·온도·양) 1줄 언급',
    purposeMotive: '온 가족이 부담 없이 둘러앉아 식사하고 싶은 상황',
    decisionPoint: '연령대가 다양해도 무난한 메뉴가 잘 맞고, 호불호 강한 자극적 메뉴는 덜 맞음',
    recommendSituation: '주말 가족 외식·모임처럼 여러 세대가 함께할 때',
    visitTiming: '주말 점심·이른 저녁이 자리 잡기 좋음',
    bestCompanion: '가족',
  },
  '부모님 식사': {
    sceneExtra: '부모님이 편하게 드시기 좋은 차분한 자리',
    tableExtra: '4인 테이블, 좌식보다 입식이 편한 경우 확인',
    paceExtra: '식사 시간 1시간 안팎, 천천히',
    extraDetail: '부모님이 드시기 편한 정도인지(간·온도·식감) 1줄 언급',
    purposeMotive: '부모님 모시고 편하게 식사하고 싶은 상황',
    decisionPoint: '간이 자극적이지 않고 부드러운 구성이 잘 맞고, 너무 맵거나 질긴 메뉴는 덜 맞음',
    recommendSituation: '부모님 식사·어른 모임처럼 편한 한 끼가 필요할 때',
    visitTiming: '한가한 점심·이른 저녁이 편함',
    bestCompanion: '부모님',
  },
  '아이와 함께': {
    sceneExtra: '아이와 같이 앉기 편한 자리, 자극적이지 않은 구성',
    tableExtra: '아이 의자 유무, 4인 이상 자리',
    paceExtra: '식사 시간 40분~1시간, 아이 페이스에 맞춰',
    extraDetail: '아이가 먹을 수 있는 자극 적은 메뉴가 있는지 1줄',
    purposeMotive: '아이와 함께 부담 없이 식사할 곳을 찾는 상황',
    decisionPoint: '자극적이지 않은 메뉴가 함께 있는지가 중요. 매운 단일 메뉴 위주면 덜 맞음',
    recommendSituation: '아이 동반 가족 식사처럼 순한 메뉴가 필요할 때',
    visitTiming: '붐비지 않는 이른 시간이 편함',
    bestCompanion: '아이·가족',
  },
  '친구 모임': {
    sceneExtra: '친구들과 둘러앉아 여러 메뉴 나눠 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블, 메뉴 여러 개 올려놓기 좋은 크기',
    paceExtra: '식사 시간 40분~1시간, 이것저것 시켜 나눔',
  },
  '손님 접대': {
    sceneExtra: '정갈한 상차림으로 손님 모시기 좋은 단정한 자리',
    tableExtra: '룸 또는 조용한 자리, 격식 있는 좌석',
    paceExtra: '식사 시간 1시간 안팎, 격식 있게',
    extraDetail: '손님 모시기에 단정한 상차림인지 1줄 언급',
  },
  '비 오는 날': {
    sceneExtra: '창밖 비 풍경 보며 뜨끈하게 먹기 좋은 자리',
    tableExtra: '창가 자리 또는 아늑한 안쪽',
    paceExtra: '식사 시간 40분~1시간, 느긋하게',
  },
  '든든한 한 끼': {
    sceneExtra: '부담 없이 든든하게 한 끼 채우기 좋은 분위기',
    tableExtra: '1~4인 자리, 회전 빠른 편',
    paceExtra: '식사 시간 30~40분, 든든하게 먹고 나옴',
    extraDetail: '양이 든든한 편인지 1줄 언급',
  },
  '늦은 저녁': {
    sceneExtra: '늦은 시간에도 자리 잡고 먹기 좋은 분위기',
    tableExtra: '1~4인 자리',
    paceExtra: '식사 시간 30~40분, 늦은 시간 가볍게',
    extraDetail: '영업시간·라스트오더 확인 권장 1줄',
  },
  '점심 식사': {
    sceneExtra: '점심시간 빠르게 한 끼 해결하기 좋은 분위기',
    tableExtra: '1~4인 자리, 점심 회전 빠름',
    paceExtra: '식사 시간 20~30분, 빠르게',
  },
  '주차 편한 곳': {
    sceneExtra: '차 가지고 와서 편하게 들르기 좋은 곳',
    tableExtra: '주차 후 바로 이용 가능한 좌석',
    paceExtra: '식사 시간 30~40분',
    extraDetail: '주차 가능 여부·인근 주차장 확인 1줄 언급',
  },
  '조용한 식당': {
    sceneExtra: '소음 적고 차분하게 식사하기 좋은 분위기',
    tableExtra: '테이블 간격 있는 편, 조용한 자리',
    paceExtra: '식사 시간 40분~1시간, 차분하게',
  },
  '가성비 식사': {
    sceneExtra: '부담 없이 가볍게 한 끼 해결하기 좋은 분위기',
    tableExtra: '1~2인 자리 또는 회전 빠른 좌석',
    paceExtra: '식사 시간 20~30분, 가볍게',
  },
  '직장인 점심': {
    sceneExtra: '점심시간 직장인들이 빠르게 한 끼 하는 분위기',
    tableExtra: '1~4인 자리, 회전 빠름',
    paceExtra: '식사 시간 20~30분, 빠르게',
    purposeMotive: '점심시간에 빠르게 한 끼 해결하고 싶은 상황',
    decisionPoint: '빠르게 나오고 든든한 메뉴가 잘 맞고, 오래 걸리는 코스형은 덜 맞음',
    recommendSituation: '직장인 점심·바쁜 한 끼처럼 시간이 빠듯할 때',
    visitTiming: '점심 피크(12시 전후)는 대기 가능, 11시대·1시 이후가 여유',
    bestCompanion: '동료·혼자',
  },
  '퇴근 후 식사': {
    sceneExtra: '퇴근 후 가볍게 한 끼 또는 한 잔 곁들이기 좋은 분위기',
    tableExtra: '2~4인 자리',
    paceExtra: '식사 시간 40분~1시간, 저녁 시간대',
  },
  // ─── 기존/분식 호환 (기존 카드 keyword 참조 보존) ───
  '가족모임': {
    sceneExtra: '4인 이상 모이기 좋은 자리, 아이 의자 유무 확인',
    tableExtra: '4~6인용 테이블, 룸은 없는 경우 많음',
    paceExtra: '식사 시간 1시간 안팎, 천천히 대화하며',
    extraDetail: '부모님이 드시기 편한 정도인지 (간·온도·식감) 1줄 언급',
  },
  '친구': {
    sceneExtra: '친구랑 마주 앉아 여러 메뉴 나눠 먹기 좋은 분위기',
    tableExtra: '2~4인 테이블, 메뉴 여러 개 올려놓기 좋은 크기',
    paceExtra: '식사 시간 30~40분, 이것저것 시켜 나눠 먹음',
  },
  '간단히': {
    sceneExtra: '오래 머물기보다 가볍게 먹고 가는 분위기',
    tableExtra: '1~2인 자리 또는 포장 위주',
    paceExtra: '식사 시간 20~30분, 간단히 먹거나 포장',
  },
};

// ─────────────────────────────────────────────────────────
// STORE_PROFILES — 매장 1개에 메뉴 여러 개 연결
// ⚠ 매장명·브랜드명 필드 없음 (PHILOSOPHY 3번)
// ⚠ storeId는 운영 식별자일 뿐 본문에 절대 노출 X
// ⚠ representativeMenu = 간판 메뉴 (제일 자주 검색됨)
//
// ★ v3 역할 분리 (검수 반영 2026-06-26):
//   menus          = 매장이 보유한 전체 메뉴 (데이터 — 메뉴판 노출용)
//   promotionMenus = 블로그에서 집중 홍보할 대표 메뉴 (운영 — treatment 생성 대상)
//   → "이 화면은 메뉴판 등록이 아니라, 블로그 집중 홍보 메뉴를 선택하는 화면"
//   → 엔진/노출은 promotionMenus만 사용. menus 전체를 생성하면 SEO 분산.
//   → promotionMenus 누락(미정의) 시 헬퍼가 menus로 폴백 (하위호환)
//   권장 promotionMenus ≤ 4~5개 (집중도 유지)
// ─────────────────────────────────────────────────────────
export const STORE_PROFILES = [
  {
    storeId: 'store_guri_sundae_01',  // 운영 식별자 (본문 노출 금지)
    region: '구리',
    cat: '한식',
    representativeMenu: '순대국',     // 간판 메뉴
    menus: ['순대국', '수육', '술국', '머릿고기'],          // 전체 보유 메뉴 (메뉴판)
    promotionMenus: ['순대국', '수육'],                      // ★ 블로그 집중 홍보 (생성 대상)
    // ⚠ name·brandName 필드 없음 — 본문에서 genericName(placeholder)만 사용
  },
  {
    storeId: 'store_gongleung_boonsik_01',  // 맵고분식 (본문 노출 금지)
    region: '공릉동',
    cat: '분식',
    representativeMenu: '매콤한 떡볶이',   // 간판 메뉴
    menus: ['매콤한 떡볶이', '매콤 로제 떡볶이', '참치마요 꼬마김밥', '매운어묵 꼬마김밥', '수제 모둠튀김', '찰순대', '오뎅꼬치', '라면'],
    promotionMenus: ['매콤한 떡볶이', '매콤 로제 떡볶이', '참치마요 꼬마김밥'],  // ★ 집중 홍보 3종
  },
  {
    storeId: 'store_songpa_gopchang_01',  // 곱창·막창 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '곱창·막창',
    representativeMenu: '모둠구이',
    menus: ['모둠구이', '막창', '소곱창', '대창', '염통', '특양', '곱창전골', '볶음밥', '된장찌개', '냉면'],
    promotionMenus: ['모둠구이', '막창', '소곱창', '곱창전골'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_gejang_01',  // 게장 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '게장',
    representativeMenu: '간장게장',
    menus: ['간장게장', '양념게장', '암꽃게장', '숫꽃게장', '새우장', '전복장', '간장새우', '꽃게탕', '게딱지비빔밥', '공깃밥'],
    promotionMenus: ['간장게장', '양념게장', '암꽃게장', '새우장'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_gamjatang_01',  // 감자탕 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '감자탕',
    representativeMenu: '감자탕',
    menus: ['감자탕', '뼈해장국', '우거지감자탕', '묵은지감자탕', '등뼈찜', '등뼈전골', '감자탕(소)', '감자탕(중)', '감자탕(대)', '볶음밥'],
    promotionMenus: ['감자탕', '뼈해장국', '등뼈찜', '묵은지감자탕'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_haejangguk_01',  // 해장국 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '해장국',
    representativeMenu: '뼈다귀해장국',
    menus: ['뼈다귀해장국', '소해장국', '황태해장국', '콩나물해장국', '선지해장국', '내장탕', '해장국(소)', '해장국(대)', '수육', '공깃밥'],
    promotionMenus: ['뼈다귀해장국', '소해장국', '황태해장국', '선지해장국'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_grilledfish_01',  // 생선구이 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '생선구이',
    representativeMenu: '고등어구이',
    menus: ['고등어구이', '삼치구이', '임연수구이', '굴비구이', '갈치구이', '모둠생선구이', '간고등어정식', '생선구이백반', '계란찜', '공깃밥'],
    promotionMenus: ['고등어구이', '갈치구이', '모둠생선구이', '생선구이백반'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_dakgalbi_01',  // 닭갈비 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '닭갈비',
    representativeMenu: '닭갈비',
    menus: ['닭갈비', '치즈닭갈비', '뼈있는닭갈비', '막국수', '볶음밥', '우동사리', '주먹밥', '계란찜', '닭갈비(1인)', '닭갈비(2인)'],
    promotionMenus: ['닭갈비', '치즈닭갈비', '뼈있는닭갈비', '막국수'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_duck_01',  // 오리 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '오리',
    representativeMenu: '훈제오리',
    menus: ['훈제오리', '오리주물럭', '오리로스', '오리백숙', '오리불고기', '오리탕', '들깨오리탕', '오리껍질', '볶음밥', '공깃밥'],
    promotionMenus: ['훈제오리', '오리주물럭', '오리로스', '오리백숙'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_jjukkumi_01',  // 쭈꾸미 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '쭈꾸미',
    representativeMenu: '쭈꾸미볶음',
    menus: ['쭈꾸미볶음', '직화쭈꾸미', '철판쭈꾸미', '쭈삼(쭈꾸미삼겹살)', '쭈차(쭈꾸미차돌박이)', '쭈꾸미정식', '쭈꾸미전골', '계란찜', '볶음밥', '공깃밥'],
    promotionMenus: ['쭈꾸미볶음', '직화쭈꾸미', '쭈삼(쭈꾸미삼겹살)', '쭈꾸미정식'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_shellfish_01',  // 조개구이 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '조개구이',
    representativeMenu: '조개구이',
    menus: ['조개구이', '모둠조개구이', '키조개구이', '가리비구이', '조개찜', '모둠조개찜', '조개탕', '조개구이세트', '라면사리', '공깃밥'],
    promotionMenus: ['조개구이', '모둠조개구이', '조개찜', '조개구이세트'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_eel_01',  // 장어 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '장어',
    representativeMenu: '민물장어구이',
    menus: ['민물장어구이', '바다장어구이', '장어소금구이', '장어양념구이', '장어덮밥', '장어탕', '장어정식', '장어세트', '복분자', '공깃밥'],
    promotionMenus: ['민물장어구이', '장어소금구이', '장어양념구이', '장어정식'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_agujjim_01',  // 아구찜 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '아구찜',
    representativeMenu: '아구찜',
    menus: ['아구찜', '해물아구찜', '순살아구찜', '매운아구찜', '아구탕', '아귀수육', '아귀찜정식', '아귀전골', '볶음밥', '공깃밥'],
    promotionMenus: ['아구찜', '해물아구찜', '순살아구찜', '아구탕'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_galbi_01',  // 갈비 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '갈비',
    representativeMenu: '양념갈비',
    menus: ['양념갈비', '생갈비', '돼지갈비', '소갈비', '갈비살', '갈비탕', '냉면', '된장찌개', '공기밥', '갈비정식'],
    promotionMenus: ['양념갈비', '생갈비', '돼지갈비', '갈비탕'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_beef_01',  // 소고기 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '소고기',
    representativeMenu: '등심',
    menus: ['등심', '안심', '채끝', '꽃등심', '살치살', '모둠한우', '차돌박이', '육회', '소고기국밥', '냉면'],
    promotionMenus: ['등심', '꽃등심', '모둠한우', '육회'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_ricenoodle_01',  // 쌀국수 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '쌀국수',
    representativeMenu: '소고기쌀국수',
    menus: ['소고기쌀국수', '양지쌀국수', '차돌쌀국수', '매운쌀국수', '해물쌀국수', '닭쌀국수', '왕갈비쌀국수', '볶음쌀국수', '분짜', '월남쌈'],
    promotionMenus: ['소고기쌀국수', '양지쌀국수', '차돌쌀국수', '분짜'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_yangkkochi_01',  // 양꼬치 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '양꼬치',
    representativeMenu: '양꼬치',
    menus: ['양꼬치', '양갈비', '양등심꼬치', '양갈비살', '양념양꼬치', '매운양꼬치', '양꼬치세트', '양갈비구이', '꿔바로우', '온면'],
    promotionMenus: ['양꼬치', '양갈비', '꿔바로우', '양꼬치세트'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_samgyetang_01',  // 삼계탕 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '삼계탕',
    representativeMenu: '삼계탕',
    menus: ['삼계탕', '한방삼계탕', '토종삼계탕', '능이삼계탕', '전복삼계탕', '들깨삼계탕', '옻삼계탕', '흑마늘삼계탕', '녹두삼계탕', '반계탕'],
    promotionMenus: ['삼계탕', '한방삼계탕', '전복삼계탕', '능이삼계탕'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_kalguksu_01',  // 칼국수 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '칼국수',
    representativeMenu: '바지락칼국수',
    menus: ['바지락칼국수', '해물칼국수', '손칼국수', '들깨칼국수', '얼큰칼국수', '닭칼국수', '팥칼국수', '장칼국수', '칼제비', '만두'],
    promotionMenus: ['바지락칼국수', '해물칼국수', '손칼국수', '들깨칼국수'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_guksu_01',  // 국수 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '국수',
    representativeMenu: '잔치국수',
    menus: ['잔치국수', '비빔국수', '열무국수', '김치국수', '멸치국수', '칼국수', '콩국수', '들기름국수', '육수국수', '냉국수'],
    promotionMenus: ['잔치국수', '비빔국수', '멸치국수', '콩국수'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_shabu_01',  // 샤브샤브 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '샤브샤브',
    representativeMenu: '소고기샤브샤브',
    menus: ['소고기샤브샤브', '버섯샤브샤브', '한우샤브샤브', '해물샤브샤브', '스페셜샤브샤브', '월남쌈샤브', '편백찜샤브', '얼큰샤브샤브', '스키야키', '샤브정식'],
    promotionMenus: ['소고기샤브샤브', '버섯샤브샤브', '해물샤브샤브', '스페셜샤브샤브'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_sushi_01',  // 초밥 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '초밥',
    representativeMenu: '모둠초밥',
    menus: ['모둠초밥', '특초밥', '생연어초밥', '광어초밥', '참치초밥', '새우초밥', '장어초밥', '소고기초밥', '유부초밥', '회덮밥'],
    promotionMenus: ['모둠초밥', '특초밥', '생연어초밥', '참치초밥'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_crab_01',  // 대게·킹크랩 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '대게·킹크랩',
    representativeMenu: '대게찜',
    menus: ['대게', '킹크랩', '랍스터', '홍게', '박달대게', '대게코스', '킹크랩코스', '대게세트', '킹크랩세트', '게딱지볶음밥'],
    promotionMenus: ['대게', '킹크랩', '대게세트', '킹크랩코스'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_hoe_01',  // 횟집 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '횟집',
    representativeMenu: '모둠회',
    menus: ['모둠회', '광어회', '우럭회', '참돔회', '농어회', '방어회', '연어회', '도미회', '물회', '회덮밥'],
    promotionMenus: ['모둠회', '광어회', '방어회', '물회'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_jjimdak_01',  // 찜닭 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '찜닭',
    representativeMenu: '안동찜닭',
    menus: ['안동찜닭', '간장찜닭', '매운찜닭', '순살찜닭', '치즈찜닭', '국물찜닭', '마라찜닭', '찜닭볶음밥', '닭발', '콩나물무침'],
    promotionMenus: ['안동찜닭', '간장찜닭', '매운찜닭', '순살찜닭'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_lamb_01',  // 양고기 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '양고기',
    representativeMenu: '양갈비',
    menus: ['양갈비', '프렌치랙', '양등심', '양어깨살', '양꼬치', '양갈비살', '양갈비정식', '양전골', '양수육', '모둠양고기'],
    promotionMenus: ['양갈비', '프렌치랙', '모둠양고기', '양등심'],  // ★ 집중 홍보 4종
  },
  {
    storeId: 'store_songpa_seafoodtang_01',  // 해물탕 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '해물탕',
    representativeMenu: '해물탕',
    menus: ['해물탕', '해물찜', '아귀해물찜', '해물전골', '해신탕', '꽃게탕', '낙지해물탕', '조개해물탕', '문어해물탕', '섞어찜'],
    promotionMenus: ['해물탕', '해물찜', '해물전골', '꽃게탕'],  // ★ 집중 홍보 4종
  },
  // 검증 통과 후 확장:
  // { storeId: 'store_guri_kalguksu_01', region: '구리', cat: '한식',
  //   representativeMenu: '칼국수', menus: ['칼국수', '만두', '콩국수'],
  //   promotionMenus: ['칼국수'] },
  {
    storeId: 'store_songpa_dakbal_01',  // 닭발 전문점 (본문 노출 금지)
    region: '송파구',
    cat: '닭발',
    representativeMenu: '통뼈닭발',
    menus: ['통뼈닭발', '무뼈닭발', '국물닭발', '무뼈국물닭발', '오돌뼈', '닭똥집', '계란찜', '주먹밥', '볶음밥', '3~4인세트'],
    promotionMenus: ['통뼈닭발', '무뼈닭발', '국물닭발', '3~4인세트'],  // ★ 집중 홍보 4종
  },
];

// ★ 홍보 메뉴 권장 상한 (UI 경고 기준 — STEP 3 UI에서 사용)
export const PROMOTION_MENU_MAX = 5;

// ─────────────────────────────────────────────────────────
// getStoreMenusByRegion — 지역별 매장 메뉴 풀 조회
// generateRestaurant.js / index.js에서 사용
// ─────────────────────────────────────────────────────────
export function getStoresByRegion(region) {
  return STORE_PROFILES.filter(s => s.region === region);
}

export function getStoreById(storeId) {
  return STORE_PROFILES.find(s => s.storeId === storeId) || null;
}

// ─────────────────────────────────────────────────────────
// ★ v3 홍보메뉴 필터 헬퍼 (검수 반영 2026-06-26)
//   역할 분리: TREATMENTS·menus = 데이터(전체) / promotionMenus = 운영(생성 대상)
//   generate·index.js는 아래 헬퍼로 "생성/노출 대상"을 거른다. TREATMENTS는 무변경 유지.
//   promotionMenus 미정의 매장 → menus로 폴백(하위호환).
// ─────────────────────────────────────────────────────────

// 매장의 홍보 메뉴 목록 (없으면 menus 폴백)
export function getPromotionMenus(store) {
  if (!store) return [];
  if (Array.isArray(store.promotionMenus) && store.promotionMenus.length > 0) {
    return store.promotionMenus;
  }
  return store.menus || [];
}

// storeId로 홍보 메뉴 조회
export function getPromotionMenusByStoreId(storeId) {
  return getPromotionMenus(getStoreById(storeId));
}

// 특정 메뉴가 해당 매장의 홍보 대상인지 (대표메뉴 아니어도 promotionMenus면 true)
export function isPromotionMenu(store, menu) {
  return getPromotionMenus(store).includes(menu);
}

// ★ treatment 배열을 홍보메뉴 기준으로 필터링 (index.js/generate 생성 대상 산출)
//   각 treatment의 storeId로 매장을 찾아 promotionMenus에 포함된 menu만 통과.
//   storeId 없거나 매장 미발견 시 보수적으로 제외(생성 대상 아님).
export function filterTreatmentsByPromotion(treatments) {
  return (treatments || []).filter(t => {
    const store = getStoreById(t.storeId);
    if (!store) return false;
    const menu = t.menu || t.menuRef || '';
    return isPromotionMenu(store, menu);
  });
}

// ★ 지역의 홍보 대상 treatment만 (index.js 메뉴 노출용)
export function getPromotionTreatmentsByRegion(treatments, region) {
  return filterTreatmentsByPromotion(treatments).filter(t => t.region === region);
}

// ─────────────────────────────────────────────────────────
// buildDirection — 하이브리드 merge
// BASE_MENU + SITUATION + PURPOSE를 합쳐 최종 DIRECTION 생성
// generate{Restaurant}.js / restaurant-prompts.js에서 호출
//
// store 인자는 선택적 — 있을 경우 representativeMenu와 비교만 (본문 영향 X)
// ─────────────────────────────────────────────────────────
export function buildDirection({ menu, situation, purpose, store }) {
  const base = MENU_BASE_DIRECTION[menu];
  if (!base) {
    // fallback (메뉴 미정 시)
    return {
      genericName: '식당',
      motive: '근처에서 한 끼 해결하러',
      tasteCore: '평범한 가정식 느낌',
      sceneCore: '동네 식당 분위기',
      hook: '문 열고 들어가니 익숙한 식당 풍경이었어요',
      keyword: '맛집',
      priceFeel: '부담 없이 한 끼 하기 좋은',
      servingUnit: '한 그릇',
      situation: situation || '',
      purpose: purpose || '',
      flowBias: '',
      // ★ v3 신규 필드 (fallback 기본값)
      purposeLabel: (purpose && PURPOSE_TITLE_LABEL[purpose]) || '',
      purposeFrame: purpose ? `${purpose} 자리를 찾는 상황` : '',
      decisionPoint: '',
      recommendSituation: '',
      visitTiming: '',
      bestCompanion: '',
      portionFeel: '',
      sharingFeel: '',
      usageType: '',
      paceFeel: '',
      isSideMenu: false,
      representativeMenu: '',
    };
  }

  const sitOvr = (situation && SITUATION_OVERRIDES[situation]) || {};
  const purOvr = (purpose && PURPOSE_OVERRIDES[purpose]) || {};

  // motive·hook은 상황 우선, taste·scene은 상황+목적 합성
  const motive = sitOvr.motiveExtra
    ? `${base.motive}. ${sitOvr.motiveExtra}`
    : base.motive;

  const hook = sitOvr.hookExtra || base.hook;

  const tasteCore = sitOvr.tasteExtra
    ? `${base.tasteCore} — ${sitOvr.tasteExtra}`
    : base.tasteCore;

  // scene: 상황·목적 둘 다 있으면 합성
  let sceneCore = base.sceneCore;
  if (sitOvr.sceneExtra) sceneCore += `. ${sitOvr.sceneExtra}`;
  if (purOvr.sceneExtra) sceneCore += `. ${purOvr.sceneExtra}`;

  // ══════════════════════════════════════════════════════════
  // ★ v3 방문목적 우선 합성 (PURPOSE → SITUATION → MENU)
  //   ⚠ 위 기존 필드(motive·tasteCore·sceneCore)는 무수정 → personal 출력 불변(롤백 안전판 보존)
  //   ⚠ 아래 신규 필드는 commercial(v3)만 우선 소비. 시그니처·반환계약 유지(필드 추가만)
  //   합성 순서: 방문목적(왜 이 상황에 나왔나) → 상황(지금 결) → 메뉴(그래서 이걸 고름)
  // ══════════════════════════════════════════════════════════
  const purLabel = (purpose && PURPOSE_TITLE_LABEL[purpose]) || base.titlePurpose || '';

  // purposeFrame: "방문목적 → 상황 → 메뉴" 순서의 방문 서사 (commercial menuIntro/scene용)
  // 메뉴는 마지막에 등장 (검수 STEP2: 상황 먼저, 메뉴 두 번째)
  const purposeFrameParts = [];
  if (purOvr.purposeMotive) purposeFrameParts.push(purOvr.purposeMotive);
  else if (purpose) purposeFrameParts.push(`${purpose} 자리를 찾는 상황`);
  if (sitOvr.motiveExtra) purposeFrameParts.push(sitOvr.motiveExtra);
  const purposeFrame = purposeFrameParts.join(' / ');

  // 목적 우선 합성 필드 — base(메뉴) 값을 폴백으로, 목적 보정이 있으면 앞세움
  const decisionPoint = purOvr.decisionPoint || base.decisionPoint || '';
  const recommendSituation = purOvr.recommendSituation || base.recommendSituation || '';
  const visitTiming = purOvr.visitTiming || base.visitTiming || (base.timeOfDay ? base.timeOfDay.join('·') : '');
  const bestCompanion = purOvr.bestCompanion || base.bestCompanion || '';

  // ★ v3 만족 판단축 (단정 금지 — 독자가 만족을 가늠할 재료. base 폴백)
  const portionFeel = base.portionFeel || '';
  const sharingFeel = base.sharingFeel || '';
  const usageType = base.usageType || '';
  const paceFeel = base.paceFeel || '';


  // 매장 메타 (본문 강제 X — 플래그만 노출, prompts 측에서 가벼운 톤 보정만 활용)
  const isSideMenu = !!(store && store.representativeMenu && store.representativeMenu !== menu);
  const representativeMenu = (store && store.representativeMenu) || '';

  return {
    genericName: base.genericName,
    altGenericNames: base.altGenericNames || [],
    motive,
    tasteCore,
    sceneCore,
    hook,
    keyword: base.keyword,
    priceFeel: base.priceFeel || '',
    servingUnit: base.servingUnit || '한 그릇',
    tableware: base.tableware,
    sidedishes: base.sidedishes,
    timeOfDay: base.timeOfDay,
    situation: situation || '',
    purpose: purpose || '',
    tableExtra: purOvr.tableExtra || '',
    paceExtra: purOvr.paceExtra || '',
    extraDetail: purOvr.extraDetail || '',
    flowBias: sitOvr.flowBias || '',  // 섹션 비중 보정 (generate에서 활용)
    // ★ v3 방문목적 우선 필드 (commercial 전용 소비 — personal은 미참조라 무영향)
    purposeLabel: purLabel,           // 제목 선두 수식형 ("혼밥하기 좋은")
    purposeFrame,                     // 방문목적→상황 서사 (메뉴는 뒤에 등장)
    decisionPoint,                    // 선택 기준 (이 목적이면 이 메뉴/다른 선택)
    recommendSituation,               // 추천 방문 상황·목적
    visitTiming,                      // 방문 추천 시간대
    bestCompanion,                    // 함께 가기 좋은 동행
    // ★ v3 만족 판단축 (commercial decision/recommend 소비 — 단정 아닌 판단 재료)
    portionFeel,                      // 양 가늠 (적은 편/든든한 한 끼)
    sharingFeel,                      // 혼자/나눠먹기
    usageType,                        // 식사용/술안주용
    paceFeel,                         // 간단히/오래 앉아
    // 매장 메타 (생성기에서 선택적으로 활용 — 본문 강제 X)
    isSideMenu,
    representativeMenu,
  };
}

// ─────────────────────────────────────────────────────────
// SITE_KEYWORDS (제목에서 메뉴·상황 키워드 감지)
// generateRestaurant.js detectedSite 로직에 사용
// ─────────────────────────────────────────────────────────
export const RESTAURANT_SITE_KEYWORDS = [
  // 검증 단계 활성 메뉴 (이순대국집 4종)
  '순대국', '수육', '술국', '머릿고기',
  // 검증 통과 후 활성화 예정 (사이드 풀)
  '국밥', '해장국', '칼국수', '김치찌개', '기사식당', '냉면',
  // 분식 (맵고분식 8종 — 표시명 + SEO 단순형 둘 다 감지)
  '매콤한 떡볶이', '매콤 로제 떡볶이', '맵고떡볶이', '로제떡볶이', '떡볶이',
  '참치마요 꼬마김밥', '매운어묵 꼬마김밥', '꼬마김밥', '김밥',
  '수제 모둠튀김', '모둠튀김', '튀김', '찰순대', '순대', '오뎅꼬치', '어묵', '라면',
  // 상황·목적
  '해장', '혼밥', '비 오는 날', '야식', '가족모임', '회식',
  '간식', '포장', '학교 앞', '친구', '간단히',
];

// ─────────────────────────────────────────────────────────
// RESTAURANT_TREATMENTS — "조합 카드" (매장 카드 X)
// index.js INDUSTRY_TREATMENTS / allT / treatmentData 검색배열에 추가됨
//
// ★ 검증 단계: 이순대국집 1개 매장 × 4 메뉴 (순대국·수육·술국·머릿고기)
//   - 같은 storeId(store_guri_sundae_01)에 4개 카드가 묶임
//   - 검증 목표: 메뉴 선택만으로 글 리듬 차이가 실제 발생하는가?
//   - 다른 매장(해장국·칼국수·김치찌개·기사식당·냉면)은 주석 처리 (별도 storeId 필요)
//
// ⚠ titlePatterns에 매장명 절대 금지
// ⚠ keywords는 검색의도 기반 (지역+메뉴+상황 조합)
// ⚠ name은 placeholder만 — 본문에 매장명 노출 X
// ─────────────────────────────────────────────────────────
export const RESTAURANT_TREATMENTS = [
  // ─── 매장: 이순대국집 (storeId: store_guri_sundae_01) ───
  // 같은 매장에서 4개 메뉴를 별개 SEO 카드로 노출
  {
    id: 'rest_korean_sundae_guri_01',
    storeId: 'store_guri_sundae_01',
    industry: 'restaurant',
    region: '구리',
    menu: '순대국',
    cat: '순대국',
    // ★ name = placeholder (매장명 X) — 본문에서 "이 순대국집"·"여기"·"가게" 등으로 변형
    name: '이 순대국집',
    emoji: '🍲',
    // ★ titlePatterns — 매장명 0건. {region} {menu} {situation}｜{purpose} 형태
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    // ★ keywords = 검색의도 (지역+메뉴 조합 우선)
    keywords: [
      '구리 순대국',
      '구리 순대국 맛집',
      '구리 해장',
      '구리 국밥',
      '구리 혼밥',
      '구리 순대국 혼밥',
      '구리 순대국 해장',
    ],
    // 비교 대상: 일반 표현 (브랜드 X)
    compareWith: '동일 지역 다른 한식집',
    nearbyHint: '구리역 근처 한식 식당가',
    // direction은 정적으로 두지 않음 → buildDirection({menu,situation,purpose,store}) 호출
    menuRef: '순대국',
    catRef: '순대국',
    isRepresentative: true,  // 매장 간판 메뉴
  },

  {
    id: 'rest_korean_suyuk_guri_01',
    storeId: 'store_guri_sundae_01',
    industry: 'restaurant',
    region: '구리',
    menu: '수육',
    cat: '순대국',
    name: '이 국밥집',  // placeholder — 수육은 국밥집 사이드 메뉴
    emoji: '🥩',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 수육',
      '구리 수육 맛집',
      '구리 국밥집 수육',
      '구리 술안주',
      '구리 혼술',
    ],
    compareWith: '동일 지역 다른 국밥집 수육',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '수육',
    catRef: '순대국',
    isRepresentative: false,  // 사이드 메뉴
  },

  {
    id: 'rest_korean_sulguk_guri_01',
    storeId: 'store_guri_sundae_01',
    industry: 'restaurant',
    region: '구리',
    menu: '술국',
    cat: '순대국',
    name: '이 국밥집',
    emoji: '🍶',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 술국',
      '구리 술국 맛집',
      '구리 혼술',
      '구리 야식',
      '구리 늦은밤 국물',
    ],
    compareWith: '동일 지역 다른 국밥집 술국',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '술국',
    catRef: '순대국',
    isRepresentative: false,
  },

  {
    id: 'rest_korean_meorigogi_guri_01',
    storeId: 'store_guri_sundae_01',
    industry: 'restaurant',
    region: '구리',
    menu: '머리고기',
    cat: '순대국',
    name: '이 국밥집',
    emoji: '🥩',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 머리고기',
      '구리 머리고기 맛집',
      '구리 국밥집 머리고기',
      '구리 술안주',
      '구리 혼술',
    ],
    compareWith: '동일 지역 다른 국밥집 머리고기',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '머리고기',
    catRef: '순대국',
    isRepresentative: false,
  },

  // ─── ★ 순대국 전문점 표준셋 신규 카드 9종 (SPECIALTY: sundaeguk · 2026-07-05) ───
  //   같은 매장(store_guri_sundae_01) 메뉴판 확장. cat='순대국' 전 카드 통일.
  //   국물 계열 = 대표(isRepresentative 판단), 안주 계열 = 사이드.
  {
    id: 'rest_sundaeguk_eolkeun_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '얼큰순대국', cat: '순대국', name: '이 순대국집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 얼큰순대국', '구리 순대국 맛집', '구리 해장', '구리 얼큰국밥', '구리 순대국 해장'],
    compareWith: '동일 지역 다른 순대국집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '얼큰순대국', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_naejang_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '내장순대국', cat: '순대국', name: '이 순대국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 내장순대국', '구리 순대국 맛집', '구리 국밥', '구리 내장국밥', '구리 순대국 혼밥'],
    compareWith: '동일 지역 다른 순대국집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '내장순대국', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_meorigogi_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '머리고기순대국', cat: '순대국', name: '이 순대국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 머리고기순대국', '구리 순대국 맛집', '구리 국밥', '구리 고기국밥', '구리 순대국 혼밥'],
    compareWith: '동일 지역 다른 순대국집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '머리고기순대국', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_sundaeman_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '순대만국', cat: '순대국', name: '이 순대국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 순대만국', '구리 순대국 맛집', '구리 국밥', '구리 순대국 혼밥', '구리 담백한 국밥'],
    compareWith: '동일 지역 다른 순대국집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '순대만국', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_naejangman_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '내장만국', cat: '순대국', name: '이 순대국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 내장만국', '구리 순대국 맛집', '구리 국밥', '구리 내장국밥', '구리 순대국 해장'],
    compareWith: '동일 지역 다른 순대국집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '내장만국', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_sundae_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '순대', cat: '순대국', name: '이 순대국집', emoji: '🥟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 순대', '구리 순대 맛집', '구리 순대국집 순대', '구리 순대 포장', '구리 술안주'],
    compareWith: '동일 지역 다른 순대국집 순대', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '순대', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_modumsundae_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '모둠순대', cat: '순대국', name: '이 순대국집', emoji: '🥟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 모둠순대', '구리 모둠순대 맛집', '구리 순대국집 모둠', '구리 술안주', '구리 혼술'],
    compareWith: '동일 지역 다른 순대국집 모둠순대', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '모둠순대', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_naejangmodum_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '내장모둠', cat: '순대국', name: '이 순대국집', emoji: '🍢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 내장모둠', '구리 내장 맛집', '구리 순대국집 내장', '구리 술안주', '구리 혼술'],
    compareWith: '동일 지역 다른 순대국집 내장모둠', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '내장모둠', catRef: '순대국', isRepresentative: false,
  },
  {
    id: 'rest_sundaeguk_pyeonyuk_guri_01',
    storeId: 'store_guri_sundae_01', industry: 'restaurant', region: '구리',
    menu: '편육', cat: '순대국', name: '이 순대국집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 편육', '구리 편육 맛집', '구리 순대국집 편육', '구리 술안주', '구리 혼술'],
    compareWith: '동일 지역 다른 순대국집 편육', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '편육', catRef: '순대국', isRepresentative: false,
  },

  // ─── ★ 국밥 전문점 카드 (SPECIALTY: gukbap · store_gukbap_guri_01 · 2026-07-05) ───
  //   side 공용(수육·편육·술국·머리고기·내장모둠)은 순대국 카드로 커버 — 여기선 국밥 전용 + 모둠수육만.
  {
    id: 'rest_gukbap_dwaeji_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '돼지국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 돼지국밥', '구리 돼지국밥 맛집', '구리 국밥', '구리 혼밥', '구리 국밥 해장'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '돼지국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_sundae_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '순대국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 순대국밥', '구리 순대국밥 맛집', '구리 국밥', '구리 순대국밥 혼밥', '구리 국밥 해장'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '순대국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_naejang_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '내장국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 내장국밥', '구리 내장국밥 맛집', '구리 국밥', '구리 내장국밥 혼밥', '구리 국밥 해장'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '내장국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_seokkeo_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '섞어국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 섞어국밥', '구리 섞어국밥 맛집', '구리 국밥', '구리 섞어국밥 혼밥', '구리 모둠국밥'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '섞어국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_someori_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '소머리국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 소머리국밥', '구리 소머리국밥 맛집', '구리 국밥', '구리 소머리국밥 혼밥', '구리 국밥 해장'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '소머리국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_eolkeun_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '얼큰국밥', cat: '국밥', name: '이 국밥집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 얼큰국밥', '구리 얼큰국밥 맛집', '구리 국밥', '구리 얼큰국밥 해장', '구리 국밥 혼밥'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '얼큰국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_kongnamul_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '콩나물국밥', cat: '국밥', name: '이 국밥집', emoji: '🌱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 콩나물국밥', '구리 콩나물국밥 맛집', '구리 국밥', '구리 콩나물국밥 해장', '구리 국밥 혼밥'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '콩나물국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_seonji_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '선지국밥', cat: '국밥', name: '이 국밥집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 선지국밥', '구리 선지국밥 맛집', '구리 국밥', '구리 선지국밥 해장', '구리 얼큰국밥'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '선지국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_hwangtae_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '황태국밥', cat: '국밥', name: '이 국밥집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 황태국밥', '구리 황태국밥 맛집', '구리 국밥', '구리 황태국밥 해장', '구리 국밥 혼밥'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '황태국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_suyuk_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '수육국밥', cat: '국밥', name: '이 국밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 수육국밥', '구리 수육국밥 맛집', '구리 국밥', '구리 수육국밥 혼밥', '구리 국밥 해장'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '수육국밥', catRef: '국밥', isRepresentative: true,
  },
  {
    id: 'rest_gukbap_modumsuyuk_guri_01',
    storeId: 'store_gukbap_guri_01', industry: 'restaurant', region: '구리',
    menu: '모둠수육', cat: '국밥', name: '이 국밥집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 모둠수육', '구리 모둠수육 맛집', '구리 국밥집 수육', '구리 술안주', '구리 혼술'],
    compareWith: '동일 지역 다른 국밥집', nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '모둠수육', catRef: '국밥', isRepresentative: false,
  },

  // ─── ★ 족발 전문점 카드 (SPECIALTY: jokbal · store_jokbal_guri_01 · 2026-07-05) ───
  {
    id: 'rest_jokbal_basic_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '족발', cat: '족발', name: '이 족발집', emoji: '🐷',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 족발', '구리 족발 맛집', '구리 족발 포장', '구리 족발 배달', '구리 야식'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '족발', catRef: '족발', isRepresentative: true,
  },
  {
    id: 'rest_jokbal_apda_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '앞다리족발', cat: '족발', name: '이 족발집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 앞다리족발', '구리 앞다리족발 맛집', '구리 족발', '구리 살코기족발', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '앞다리족발', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_dwitda_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '뒷다리족발', cat: '족발', name: '이 족발집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 뒷다리족발', '구리 뒷다리족발 맛집', '구리 족발', '구리 쫀득족발', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '뒷다리족발', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_banban_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '반반족발', cat: '족발', name: '이 족발집', emoji: '🐷',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 반반족발', '구리 반반족발 맛집', '구리 족발', '구리 족발 추천', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '반반족발', catRef: '족발', isRepresentative: true,
  },
  {
    id: 'rest_jokbal_naengchae_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '냉채족발', cat: '족발', name: '이 족발집', emoji: '🥗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 냉채족발', '구리 냉채족발 맛집', '구리 족발', '구리 여름족발', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '냉채족발', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_bul_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '불족발', cat: '족발', name: '이 족발집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 불족발', '구리 불족발 맛집', '구리 매운족발', '구리 족발', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '불족발', catRef: '족발', isRepresentative: true,
  },
  {
    id: 'rest_jokbal_jikhwa_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '직화불족발', cat: '족발', name: '이 족발집', emoji: '🔥',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 직화불족발', '구리 직화족발 맛집', '구리 매운족발', '구리 불족발', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '직화불족발', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_maneul_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '마늘족발', cat: '족발', name: '이 족발집', emoji: '🧄',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 마늘족발', '구리 마늘족발 맛집', '구리 족발', '구리 족발 추천', '구리 족발 포장'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '마늘족발', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_bossam_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '보쌈', cat: '족발', name: '이 족발집', emoji: '🥬',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 보쌈', '구리 보쌈 맛집', '구리 족발보쌈', '구리 보쌈 포장', '구리 야식'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '보쌈', catRef: '족발', isRepresentative: false,
  },
  {
    id: 'rest_jokbal_set_guri_01',
    storeId: 'store_jokbal_guri_01', industry: 'restaurant', region: '구리',
    menu: '족발보쌈세트', cat: '족발', name: '이 족발집', emoji: '🍽️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['구리 족발보쌈세트', '구리 족발보쌈', '구리 족발 세트', '구리 족발 포장', '구리 모임 음식'],
    compareWith: '동일 지역 다른 족발집', nearbyHint: '구리역 근처 족발·보쌈 식당가',
    menuRef: '족발보쌈세트', catRef: '족발', isRepresentative: false,
  },

  // ─── 매장: 곱창·막창 전문점 (storeId: store_songpa_gopchang_01) ───
  //   cat='곱창·막창' 통일. 구이 계열 = 대표, 탕/식사 계열 = 사이드.
  {
    id: 'rest_gopchang_modeum_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '모둠구이', cat: '곱창·막창', name: '이 곱창집', emoji: '🔥',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 곱창 모둠구이', '송파구 곱창 맛집', '송파구 곱창구이', '송파구 곱창 모둠', '송파구 곱창 회식'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '모둠구이', catRef: '곱창·막창', isRepresentative: true,
  },
  {
    id: 'rest_gopchang_makchang_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '막창', cat: '곱창·막창', name: '이 곱창집', emoji: '🔥',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 막창', '송파구 막창 맛집', '송파구 돼지막창', '송파구 막창구이', '송파구 막창 회식'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '막창', catRef: '곱창·막창', isRepresentative: true,
  },
  {
    id: 'rest_gopchang_sogopchang_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '소곱창', cat: '곱창·막창', name: '이 곱창집', emoji: '🔥',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소곱창', '송파구 소곱창 맛집', '송파구 곱창구이', '송파구 소곱창 회식', '송파구 곱창 술집'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '소곱창', catRef: '곱창·막창', isRepresentative: true,
  },
  {
    id: 'rest_gopchang_daechang_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '대창', cat: '곱창·막창', name: '이 곱창집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 대창', '송파구 대창구이', '송파구 곱창 맛집', '송파구 대창 회식', '송파구 곱창 대창'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '대창', catRef: '곱창·막창', isRepresentative: false,
  },
  {
    id: 'rest_gopchang_yeomtong_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '염통', cat: '곱창·막창', name: '이 곱창집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 염통', '송파구 염통구이', '송파구 곱창 맛집', '송파구 곱창 안주', '송파구 곱창 술집'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '염통', catRef: '곱창·막창', isRepresentative: false,
  },
  {
    id: 'rest_gopchang_teukyang_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '특양', cat: '곱창·막창', name: '이 곱창집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 특양', '송파구 특양구이', '송파구 곱창 맛집', '송파구 양구이', '송파구 곱창 안주'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '특양', catRef: '곱창·막창', isRepresentative: false,
  },
  {
    id: 'rest_gopchang_jeongol_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '곱창전골', cat: '곱창·막창', name: '이 곱창집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 곱창전골', '송파구 곱창전골 맛집', '송파구 곱창 전골', '송파구 곱창 국물', '송파구 곱창전골 얼큰'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '곱창전골', catRef: '곱창·막창', isRepresentative: true,
  },
  {
    id: 'rest_gopchang_bokkeumbap_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '곱창·막창', name: '이 곱창집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 곱창 볶음밥', '송파구 곱창집 볶음밥', '송파구 곱창 마무리', '송파구 곱창 식사', '송파구 곱창 볶음밥 맛집'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '볶음밥', catRef: '곱창·막창', isRepresentative: false,
  },
  {
    id: 'rest_gopchang_doenjang_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '된장찌개', cat: '곱창·막창', name: '이 곱창집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 곱창집 된장찌개', '송파구 곱창 식사', '송파구 된장찌개', '송파구 곱창 마무리', '송파구 곱창집 백반'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '된장찌개', catRef: '곱창·막창', isRepresentative: false,
  },
  {
    id: 'rest_gopchang_naengmyeon_songpa_01',
    storeId: 'store_songpa_gopchang_01', industry: 'restaurant', region: '송파구',
    menu: '냉면', cat: '곱창·막창', name: '이 곱창집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 곱창집 냉면', '송파구 곱창 냉면', '송파구 곱창 식사', '송파구 곱창 마무리 냉면', '송파구 곱창집 물냉면'],
    compareWith: '동일 지역 다른 곱창집', nearbyHint: '송파구 곱창·막창 식당가',
    menuRef: '냉면', catRef: '곱창·막창', isRepresentative: false,
  },

  // ─── 매장: 게장 전문점 (storeId: store_songpa_gejang_01) ───
  //   cat='게장' 통일. 장류 계열 = 대표, 탕/식사 계열 = 사이드.
  {
    id: 'rest_gejang_ganjang_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '간장게장', cat: '게장', name: '이 게장집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 간장게장', '송파구 간장게장 맛집', '송파구 게장 맛집', '송파구 밥도둑', '송파구 간장게장 정식'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '간장게장', catRef: '게장', isRepresentative: true,
  },
  {
    id: 'rest_gejang_yangnyeom_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '양념게장', cat: '게장', name: '이 게장집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양념게장', '송파구 양념게장 맛집', '송파구 게장 맛집', '송파구 매콤 게장', '송파구 양념게장 정식'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '양념게장', catRef: '게장', isRepresentative: true,
  },
  {
    id: 'rest_gejang_amkkotge_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '암꽃게장', cat: '게장', name: '이 게장집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 암꽃게장', '송파구 알게장', '송파구 게장 맛집', '송파구 밥도둑', '송파구 꽃게장'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '암꽃게장', catRef: '게장', isRepresentative: true,
  },
  {
    id: 'rest_gejang_sutkkotge_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '숫꽃게장', cat: '게장', name: '이 게장집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 숫꽃게장', '송파구 수게장', '송파구 게장 맛집', '송파구 꽃게장', '송파구 게장 정식'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '숫꽃게장', catRef: '게장', isRepresentative: false,
  },
  {
    id: 'rest_gejang_saeujang_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '새우장', cat: '게장', name: '이 게장집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 새우장', '송파구 간장새우장', '송파구 게장 맛집', '송파구 밥도둑', '송파구 새우장 맛집'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '새우장', catRef: '게장', isRepresentative: true,
  },
  {
    id: 'rest_gejang_jeonbokjang_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '전복장', cat: '게장', name: '이 게장집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 전복장', '송파구 간장전복장', '송파구 게장 맛집', '송파구 밥도둑', '송파구 전복장 맛집'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '전복장', catRef: '게장', isRepresentative: false,
  },
  {
    id: 'rest_gejang_ganjangsaeu_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '간장새우', cat: '게장', name: '이 게장집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 간장새우', '송파구 간장새우장', '송파구 게장 맛집', '송파구 밥도둑', '송파구 새우 정식'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '간장새우', catRef: '게장', isRepresentative: false,
  },
  {
    id: 'rest_gejang_kkotgetang_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '꽃게탕', cat: '게장', name: '이 게장집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 꽃게탕', '송파구 꽃게탕 맛집', '송파구 게장집 탕', '송파구 해물탕', '송파구 꽃게 요리'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '꽃게탕', catRef: '게장', isRepresentative: false,
  },
  {
    id: 'rest_gejang_gettakji_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '게딱지비빔밥', cat: '게장', name: '이 게장집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 게딱지비빔밥', '송파구 게장 비빔밥', '송파구 게장집 식사', '송파구 게딱지밥', '송파구 게장 마무리'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '게딱지비빔밥', catRef: '게장', isRepresentative: false,
  },
  {
    id: 'rest_gejang_gonggibap_songpa_01',
    storeId: 'store_songpa_gejang_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '게장', name: '이 게장집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 게장집 공깃밥', '송파구 게장 정식', '송파구 게장 식사', '송파구 밥도둑 정식', '송파구 게장 백반'],
    compareWith: '동일 지역 다른 게장집', nearbyHint: '송파구 게장·해산물 식당가',
    menuRef: '공깃밥', catRef: '게장', isRepresentative: false,
  },

  // ─── 매장: 감자탕 전문점 (storeId: store_songpa_gamjatang_01) ───
  //   cat='감자탕' 통일. 탕·뼈 계열 = 대표, 식사 계열 = 사이드.
  {
    id: 'rest_gamjatang_gamjatang_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '감자탕', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 감자탕', '송파구 감자탕 맛집', '송파구 뼈해장국', '송파구 감자탕 노포', '송파구 감자탕 회식'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '감자탕', catRef: '감자탕', isRepresentative: true,
  },
  {
    id: 'rest_gamjatang_ppyeohaejang_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '뼈해장국', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 뼈해장국', '송파구 뼈해장국 맛집', '송파구 해장', '송파구 감자탕 해장', '송파구 뼈다귀해장국'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '뼈해장국', catRef: '감자탕', isRepresentative: true,
  },
  {
    id: 'rest_gamjatang_ugeoji_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '우거지감자탕', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 우거지감자탕', '송파구 우거지탕', '송파구 감자탕 맛집', '송파구 감자탕', '송파구 우거지 감자탕'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '우거지감자탕', catRef: '감자탕', isRepresentative: false,
  },
  {
    id: 'rest_gamjatang_mukeunji_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '묵은지감자탕', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 묵은지감자탕', '송파구 묵은지 감자탕', '송파구 감자탕 맛집', '송파구 감자탕', '송파구 묵은지 뼈해장국'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '묵은지감자탕', catRef: '감자탕', isRepresentative: true,
  },
  {
    id: 'rest_gamjatang_deungppyeojjim_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '등뼈찜', cat: '감자탕', name: '이 감자탕집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 등뼈찜', '송파구 등뼈찜 맛집', '송파구 뼈찜', '송파구 감자탕 등뼈찜', '송파구 등뼈찜 회식'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '등뼈찜', catRef: '감자탕', isRepresentative: true,
  },
  {
    id: 'rest_gamjatang_deungppyeojeongol_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '등뼈전골', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 등뼈전골', '송파구 등뼈전골 맛집', '송파구 뼈전골', '송파구 감자탕 전골', '송파구 등뼈전골 회식'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '등뼈전골', catRef: '감자탕', isRepresentative: false,
  },
  {
    id: 'rest_gamjatang_so_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '감자탕(소)', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 감자탕 소', '송파구 감자탕 2인', '송파구 감자탕 맛집', '송파구 감자탕', '송파구 소자 감자탕'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '감자탕(소)', catRef: '감자탕', isRepresentative: false,
  },
  {
    id: 'rest_gamjatang_jung_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '감자탕(중)', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 감자탕 중', '송파구 감자탕 3인', '송파구 감자탕 맛집', '송파구 감자탕', '송파구 중자 감자탕'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '감자탕(중)', catRef: '감자탕', isRepresentative: false,
  },
  {
    id: 'rest_gamjatang_dae_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '감자탕(대)', cat: '감자탕', name: '이 감자탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 감자탕 대', '송파구 감자탕 4인', '송파구 감자탕 맛집', '송파구 감자탕 회식', '송파구 대자 감자탕'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '감자탕(대)', catRef: '감자탕', isRepresentative: false,
  },
  {
    id: 'rest_gamjatang_bokkeumbap_songpa_01',
    storeId: 'store_songpa_gamjatang_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '감자탕', name: '이 감자탕집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 감자탕 볶음밥', '송파구 감자탕집 볶음밥', '송파구 감자탕 마무리', '송파구 감자탕 식사', '송파구 볶음밥 맛집'],
    compareWith: '동일 지역 다른 감자탕집', nearbyHint: '송파구 감자탕·뼈해장국 식당가',
    menuRef: '볶음밥', catRef: '감자탕', isRepresentative: false,
  },

  // ─── 매장: 해장국 전문점 (storeId: store_songpa_haejangguk_01) ───
  //   cat='해장국' 통일. 탕·해장 계열 = 대표, 수육·공깃밥 = 사이드.
  {
    id: 'rest_haejangguk_ppyeohaejang_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '뼈다귀해장국', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 뼈다귀해장국', '송파구 뼈해장국 맛집', '송파구 해장국', '송파구 해장', '송파구 뼈해장국 노포'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '뼈다귀해장국', catRef: '해장국', isRepresentative: true,
  },
  {
    id: 'rest_haejangguk_sohaejang_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '소해장국', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소해장국', '송파구 소해장국 맛집', '송파구 해장국', '송파구 우거지 소해장국', '송파구 소해장국 노포'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '소해장국', catRef: '해장국', isRepresentative: true,
  },
  {
    id: 'rest_haejangguk_hwangtae_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '황태해장국', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 황태해장국', '송파구 황태해장국 맛집', '송파구 해장국', '송파구 황태국', '송파구 술해장'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '황태해장국', catRef: '해장국', isRepresentative: true,
  },
  {
    id: 'rest_haejangguk_kongnamul_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '콩나물해장국', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 콩나물해장국', '송파구 콩나물국밥', '송파구 해장국', '송파구 콩나물 해장', '송파구 시원한 해장국'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '콩나물해장국', catRef: '해장국', isRepresentative: false,
  },
  {
    id: 'rest_haejangguk_seonji_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '선지해장국', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 선지해장국', '송파구 선지국', '송파구 해장국', '송파구 선지 해장', '송파구 얼큰한 해장국'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '선지해장국', catRef: '해장국', isRepresentative: true,
  },
  {
    id: 'rest_haejangguk_naejang_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '내장탕', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 내장탕', '송파구 내장탕 맛집', '송파구 해장국', '송파구 소내장탕', '송파구 내장탕 노포'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '내장탕', catRef: '해장국', isRepresentative: false,
  },
  {
    id: 'rest_haejangguk_so_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '해장국(소)', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해장국', '송파구 해장국 맛집', '송파구 혼밥 해장국', '송파구 해장', '송파구 아침 해장국'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '해장국(소)', catRef: '해장국', isRepresentative: false,
  },
  {
    id: 'rest_haejangguk_dae_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '해장국(대)', cat: '해장국', name: '이 해장국집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해장국', '송파구 해장국 맛집', '송파구 해장국 회식', '송파구 해장', '송파구 넉넉한 해장국'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '해장국(대)', catRef: '해장국', isRepresentative: false,
  },
  {
    id: 'rest_haejangguk_suyuk_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '수육', cat: '해장국', name: '이 해장국집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 수육', '송파구 해장국집 수육', '송파구 수육 안주', '송파구 해장국 수육', '송파구 수육 맛집'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '수육', catRef: '해장국', isRepresentative: false,
  },
  {
    id: 'rest_haejangguk_gonggibap_songpa_01',
    storeId: 'store_songpa_haejangguk_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '해장국', name: '이 해장국집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해장국 공깃밥', '송파구 해장국집 밥', '송파구 해장국 식사', '송파구 해장 식사', '송파구 해장국 든든한'],
    compareWith: '동일 지역 다른 해장국집', nearbyHint: '송파구 해장국·뼈해장국 식당가',
    menuRef: '공깃밥', catRef: '해장국', isRepresentative: false,
  },

  // ─── 매장: 생선구이 전문점 (storeId: store_songpa_grilledfish_01) ───
  //   cat='생선구이' 통일. 구이·정식 계열 = 대표, 계란찜·공깃밥 = 사이드.
  {
    id: 'rest_grilledfish_godeungeo_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '고등어구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 고등어구이', '송파구 고등어구이 맛집', '송파구 생선구이', '송파구 간고등어', '송파구 고등어정식'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '고등어구이', catRef: '생선구이', isRepresentative: true,
  },
  {
    id: 'rest_grilledfish_samchi_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '삼치구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 삼치구이', '송파구 삼치구이 맛집', '송파구 생선구이', '송파구 삼치정식', '송파구 삼치 백반'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '삼치구이', catRef: '생선구이', isRepresentative: true,
  },
  {
    id: 'rest_grilledfish_imyeonsu_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '임연수구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 임연수구이', '송파구 임연수 맛집', '송파구 생선구이', '송파구 임연수 정식', '송파구 생선구이 백반'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '임연수구이', catRef: '생선구이', isRepresentative: false,
  },
  {
    id: 'rest_grilledfish_gulbi_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '굴비구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 굴비구이', '송파구 굴비정식', '송파구 생선구이', '송파구 보리굴비', '송파구 굴비 맛집'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '굴비구이', catRef: '생선구이', isRepresentative: true,
  },
  {
    id: 'rest_grilledfish_galchi_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '갈치구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 갈치구이', '송파구 갈치구이 맛집', '송파구 생선구이', '송파구 갈치정식', '송파구 은갈치구이'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '갈치구이', catRef: '생선구이', isRepresentative: true,
  },
  {
    id: 'rest_grilledfish_modeum_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '모둠생선구이', cat: '생선구이', name: '이 생선구이집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠생선구이', '송파구 생선구이 모둠', '송파구 생선구이', '송파구 생선구이 회식', '송파구 모둠구이 정식'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '모둠생선구이', catRef: '생선구이', isRepresentative: true,
  },
  {
    id: 'rest_grilledfish_gangodeungeo_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '간고등어정식', cat: '생선구이', name: '이 생선구이집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 간고등어정식', '송파구 간고등어', '송파구 생선구이 정식', '송파구 고등어정식', '송파구 생선구이 백반'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '간고등어정식', catRef: '생선구이', isRepresentative: false,
  },
  {
    id: 'rest_grilledfish_baekban_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '생선구이백반', cat: '생선구이', name: '이 생선구이집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 생선구이백반', '송파구 생선구이 백반', '송파구 생선구이', '송파구 생선정식', '송파구 백반 맛집'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '생선구이백반', catRef: '생선구이', isRepresentative: false,
  },
  {
    id: 'rest_grilledfish_gyeranjjim_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '계란찜', cat: '생선구이', name: '이 생선구이집', emoji: '🍳',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 계란찜', '송파구 생선구이집 계란찜', '송파구 생선구이 사이드', '송파구 계란찜 맛집', '송파구 백반 계란찜'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '계란찜', catRef: '생선구이', isRepresentative: false,
  },
  {
    id: 'rest_grilledfish_gonggibap_songpa_01',
    storeId: 'store_songpa_grilledfish_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '생선구이', name: '이 생선구이집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 생선구이 공깃밥', '송파구 생선구이집 밥', '송파구 생선구이 식사', '송파구 백반 식사', '송파구 생선구이 든든한'],
    compareWith: '동일 지역 다른 생선구이집', nearbyHint: '송파구 생선구이·백반 식당가',
    menuRef: '공깃밥', catRef: '생선구이', isRepresentative: false,
  },

  // ─── 매장: 닭갈비 전문점 (storeId: store_songpa_dakgalbi_01) ───
  //   cat='닭갈비' 통일. 닭갈비·볶음 계열 = 대표, 사리·밥 = 사이드.
  {
    id: 'rest_dakgalbi_dakgalbi_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '닭갈비', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비', '송파구 닭갈비 맛집', '송파구 춘천닭갈비', '송파구 닭갈비 회식', '송파구 닭갈비 노포'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '닭갈비', catRef: '닭갈비', isRepresentative: true,
  },
  {
    id: 'rest_dakgalbi_cheese_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '치즈닭갈비', cat: '닭갈비', name: '이 닭갈비집', emoji: '🧀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 치즈닭갈비', '송파구 치즈닭갈비 맛집', '송파구 닭갈비', '송파구 치즈 닭갈비', '송파구 데이트 닭갈비'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '치즈닭갈비', catRef: '닭갈비', isRepresentative: true,
  },
  {
    id: 'rest_dakgalbi_ppyeo_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '뼈있는닭갈비', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 뼈있는닭갈비', '송파구 뼈닭갈비', '송파구 닭갈비', '송파구 숯불닭갈비', '송파구 뼈닭갈비 맛집'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '뼈있는닭갈비', catRef: '닭갈비', isRepresentative: true,
  },
  {
    id: 'rest_dakgalbi_makguksu_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '막국수', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 막국수', '송파구 닭갈비 막국수', '송파구 막국수 맛집', '송파구 물막국수', '송파구 비빔막국수'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '막국수', catRef: '닭갈비', isRepresentative: true,
  },
  {
    id: 'rest_dakgalbi_bokkeumbap_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비 볶음밥', '송파구 볶음밥', '송파구 닭갈비 마무리', '송파구 닭갈비 볶음', '송파구 볶음밥 맛집'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '볶음밥', catRef: '닭갈비', isRepresentative: false,
  },
  {
    id: 'rest_dakgalbi_udong_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '우동사리', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비 우동사리', '송파구 우동사리', '송파구 닭갈비 사리', '송파구 닭갈비 추가', '송파구 우동 사리'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '우동사리', catRef: '닭갈비', isRepresentative: false,
  },
  {
    id: 'rest_dakgalbi_jumeokbap_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '주먹밥', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비 주먹밥', '송파구 주먹밥', '송파구 닭갈비 밥', '송파구 주먹밥 맛집', '송파구 닭갈비 사이드'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '주먹밥', catRef: '닭갈비', isRepresentative: false,
  },
  {
    id: 'rest_dakgalbi_gyeranjjim_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '계란찜', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍳',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 계란찜', '송파구 닭갈비집 계란찜', '송파구 닭갈비 사이드', '송파구 계란찜 맛집', '송파구 뚝배기 계란찜'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '계란찜', catRef: '닭갈비', isRepresentative: false,
  },
  {
    id: 'rest_dakgalbi_1in_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '닭갈비(1인)', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비 1인', '송파구 혼밥 닭갈비', '송파구 닭갈비 1인분', '송파구 닭갈비', '송파구 혼자 닭갈비'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '닭갈비(1인)', catRef: '닭갈비', isRepresentative: false,
  },
  {
    id: 'rest_dakgalbi_2in_songpa_01',
    storeId: 'store_songpa_dakgalbi_01', industry: 'restaurant', region: '송파구',
    menu: '닭갈비(2인)', cat: '닭갈비', name: '이 닭갈비집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭갈비 2인', '송파구 닭갈비 커플', '송파구 닭갈비 2인분', '송파구 닭갈비 데이트', '송파구 닭갈비'],
    compareWith: '동일 지역 다른 닭갈비집', nearbyHint: '송파구 닭갈비·막국수 식당가',
    menuRef: '닭갈비(2인)', catRef: '닭갈비', isRepresentative: false,
  },

  // ─── 매장: 오리 전문점 (storeId: store_songpa_duck_01) ───
  //   cat='오리' 통일. 오리 요리 계열 = 대표, 볶음밥·공깃밥 = 사이드.
  {
    id: 'rest_duck_hunje_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '훈제오리', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 훈제오리', '송파구 훈제오리 맛집', '송파구 오리', '송파구 훈제오리 회식', '송파구 오리 전문점'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '훈제오리', catRef: '오리', isRepresentative: true,
  },
  {
    id: 'rest_duck_jumulleok_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리주물럭', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리주물럭', '송파구 오리주물럭 맛집', '송파구 오리', '송파구 주물럭', '송파구 오리 볶음'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리주물럭', catRef: '오리', isRepresentative: true,
  },
  {
    id: 'rest_duck_ros_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리로스', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리로스', '송파구 오리로스 맛집', '송파구 오리', '송파구 생오리', '송파구 오리 구이'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리로스', catRef: '오리', isRepresentative: true,
  },
  {
    id: 'rest_duck_baeksuk_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리백숙', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리백숙', '송파구 오리백숙 맛집', '송파구 오리', '송파구 오리 몸보신', '송파구 오리백숙 노포'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리백숙', catRef: '오리', isRepresentative: true,
  },
  {
    id: 'rest_duck_bulgogi_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리불고기', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리불고기', '송파구 오리불고기 맛집', '송파구 오리', '송파구 오리 불고기', '송파구 오리 요리'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리불고기', catRef: '오리', isRepresentative: false,
  },
  {
    id: 'rest_duck_tang_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리탕', cat: '오리', name: '이 오리집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리탕', '송파구 오리탕 맛집', '송파구 오리', '송파구 오리 보양', '송파구 오리탕 노포'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리탕', catRef: '오리', isRepresentative: false,
  },
  {
    id: 'rest_duck_deulkkae_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '들깨오리탕', cat: '오리', name: '이 오리집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 들깨오리탕', '송파구 들깨 오리탕', '송파구 오리탕', '송파구 오리', '송파구 들깨탕'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '들깨오리탕', catRef: '오리', isRepresentative: false,
  },
  {
    id: 'rest_duck_kkeopjil_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '오리껍질', cat: '오리', name: '이 오리집', emoji: '🦆',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리껍질', '송파구 오리껍질 맛집', '송파구 오리', '송파구 오리 껍데기', '송파구 오리껍질 안주'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '오리껍질', catRef: '오리', isRepresentative: false,
  },
  {
    id: 'rest_duck_bokkeumbap_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '오리', name: '이 오리집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리집 볶음밥', '송파구 볶음밥', '송파구 오리 마무리', '송파구 오리 볶음밥', '송파구 볶음밥 맛집'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '볶음밥', catRef: '오리', isRepresentative: false,
  },
  {
    id: 'rest_duck_gonggibap_songpa_01',
    storeId: 'store_songpa_duck_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '오리', name: '이 오리집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오리 공깃밥', '송파구 오리집 밥', '송파구 오리 식사', '송파구 오리 식사', '송파구 오리 든든한'],
    compareWith: '동일 지역 다른 오리집', nearbyHint: '송파구 오리·백숙 식당가',
    menuRef: '공깃밥', catRef: '오리', isRepresentative: false,
  },

  // ─── 매장: 쭈꾸미 전문점 (storeId: store_songpa_jjukkumi_01) ───
  //   cat='쭈꾸미' 통일. 볶음·직화·세트 계열 = 대표, 계란찜·밥 = 사이드.
  {
    id: 'rest_jjukkumi_bokkeum_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '쭈꾸미볶음', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈꾸미볶음', '송파구 쭈꾸미 맛집', '송파구 주꾸미', '송파구 매운 쭈꾸미', '송파구 쭈꾸미 회식'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '쭈꾸미볶음', catRef: '쭈꾸미', isRepresentative: true,
  },
  {
    id: 'rest_jjukkumi_jikhwa_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '직화쭈꾸미', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 직화쭈꾸미', '송파구 직화 쭈꾸미', '송파구 쭈꾸미', '송파구 불맛 쭈꾸미', '송파구 숯불 쭈꾸미'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '직화쭈꾸미', catRef: '쭈꾸미', isRepresentative: true,
  },
  {
    id: 'rest_jjukkumi_cheolpan_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '철판쭈꾸미', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 철판쭈꾸미', '송파구 철판 쭈꾸미', '송파구 쭈꾸미', '송파구 쭈꾸미 철판', '송파구 매콤 쭈꾸미'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '철판쭈꾸미', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_jjusam_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '쭈삼(쭈꾸미삼겹살)', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈삼', '송파구 쭈꾸미 삼겹살', '송파구 쭈꾸미', '송파구 쭈삼 맛집', '송파구 쭈꾸미 세트'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '쭈삼(쭈꾸미삼겹살)', catRef: '쭈꾸미', isRepresentative: true,
  },
  {
    id: 'rest_jjukkumi_jjucha_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '쭈차(쭈꾸미차돌박이)', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈차', '송파구 쭈꾸미 차돌박이', '송파구 쭈꾸미', '송파구 쭈차 맛집', '송파구 쭈꾸미 차돌'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '쭈차(쭈꾸미차돌박이)', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_jeongsik_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '쭈꾸미정식', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈꾸미정식', '송파구 쭈꾸미 정식', '송파구 쭈꾸미', '송파구 쭈꾸미 백반', '송파구 쭈꾸미 점심'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '쭈꾸미정식', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_jeongol_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '쭈꾸미전골', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈꾸미전골', '송파구 쭈꾸미 전골', '송파구 쭈꾸미', '송파구 쭈꾸미 탕', '송파구 쭈꾸미 회식'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '쭈꾸미전골', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_gyeranjjim_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '계란찜', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🍳',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 계란찜', '송파구 쭈꾸미집 계란찜', '송파구 쭈꾸미 사이드', '송파구 계란찜 맛집', '송파구 뚝배기 계란찜'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '계란찜', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_bokkeumbap_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈꾸미 볶음밥', '송파구 볶음밥', '송파구 쭈꾸미 마무리', '송파구 쭈꾸미 볶음밥', '송파구 볶음밥 맛집'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '볶음밥', catRef: '쭈꾸미', isRepresentative: false,
  },
  {
    id: 'rest_jjukkumi_gonggibap_songpa_01',
    storeId: 'store_songpa_jjukkumi_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '쭈꾸미', name: '이 쭈꾸미집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 쭈꾸미 공깃밥', '송파구 쭈꾸미집 밥', '송파구 쭈꾸미 식사', '송파구 쭈꾸미 밥', '송파구 쭈꾸미 든든한'],
    compareWith: '동일 지역 다른 쭈꾸미집', nearbyHint: '송파구 쭈꾸미·낙지 식당가',
    menuRef: '공깃밥', catRef: '쭈꾸미', isRepresentative: false,
  },

  // ─── 매장: 조개구이 전문점 (storeId: store_songpa_shellfish_01) ───
  //   cat='조개구이' 통일. 구이·찜·탕 계열 = 대표, 사리·밥 = 사이드.
  {
    id: 'rest_shellfish_gui_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '조개구이', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개구이', '송파구 조개구이 맛집', '송파구 조개', '송파구 조개구이 회식', '송파구 해산물 구이'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '조개구이', catRef: '조개구이', isRepresentative: true,
  },
  {
    id: 'rest_shellfish_modeum_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '모둠조개구이', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠조개구이', '송파구 조개구이 모둠', '송파구 조개구이', '송파구 조개 모둠', '송파구 조개구이 세트'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '모둠조개구이', catRef: '조개구이', isRepresentative: true,
  },
  {
    id: 'rest_shellfish_kijogae_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '키조개구이', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 키조개구이', '송파구 키조개', '송파구 조개구이', '송파구 키조개 관자', '송파구 키조개 맛집'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '키조개구이', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_garibi_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '가리비구이', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 가리비구이', '송파구 가리비', '송파구 조개구이', '송파구 가리비 치즈', '송파구 가리비 맛집'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '가리비구이', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_jjim_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '조개찜', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개찜', '송파구 조개찜 맛집', '송파구 조개', '송파구 조개 찜', '송파구 해물찜'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '조개찜', catRef: '조개구이', isRepresentative: true,
  },
  {
    id: 'rest_shellfish_modeumjjim_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '모둠조개찜', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠조개찜', '송파구 조개찜 모둠', '송파구 조개찜', '송파구 조개 모둠찜', '송파구 해물 조개찜'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '모둠조개찜', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_tang_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '조개탕', cat: '조개구이', name: '이 조개구이집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개탕', '송파구 조개탕 맛집', '송파구 조개', '송파구 조개 국물', '송파구 시원한 조개탕'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '조개탕', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_set_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '조개구이세트', cat: '조개구이', name: '이 조개구이집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개구이세트', '송파구 조개구이 세트', '송파구 조개구이', '송파구 조개 세트', '송파구 조개구이 코스'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '조개구이세트', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_ramyeon_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '라면사리', cat: '조개구이', name: '이 조개구이집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개탕 라면', '송파구 라면사리', '송파구 조개구이 마무리', '송파구 조개 라면', '송파구 라면사리 추가'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '라면사리', catRef: '조개구이', isRepresentative: false,
  },
  {
    id: 'rest_shellfish_gonggibap_songpa_01',
    storeId: 'store_songpa_shellfish_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '조개구이', name: '이 조개구이집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개구이 공깃밥', '송파구 조개구이집 밥', '송파구 조개구이 식사', '송파구 조개 밥', '송파구 조개구이 든든한'],
    compareWith: '동일 지역 다른 조개구이집', nearbyHint: '송파구 조개구이·해산물 식당가',
    menuRef: '공깃밥', catRef: '조개구이', isRepresentative: false,
  },

  // ─── 매장: 장어 전문점 (storeId: store_songpa_eel_01) ───
  //   cat='장어' 통일. 구이·탕·정식 계열 = 대표, 복분자·밥 = 사이드.
  {
    id: 'rest_eel_minmul_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '민물장어구이', cat: '장어', name: '이 장어집', emoji: '🐍',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 민물장어', '송파구 민물장어 맛집', '송파구 장어', '송파구 풍천장어', '송파구 장어구이'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '민물장어구이', catRef: '장어', isRepresentative: true,
  },
  {
    id: 'rest_eel_bada_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '바다장어구이', cat: '장어', name: '이 장어집', emoji: '🐍',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 바다장어', '송파구 바다장어 맛집', '송파구 장어', '송파구 아나고', '송파구 붕장어'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '바다장어구이', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_sogeum_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어소금구이', cat: '장어', name: '이 장어집', emoji: '🐍',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어소금구이', '송파구 장어 소금구이', '송파구 장어', '송파구 장어구이', '송파구 소금구이 장어'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어소금구이', catRef: '장어', isRepresentative: true,
  },
  {
    id: 'rest_eel_yangnyeom_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어양념구이', cat: '장어', name: '이 장어집', emoji: '🐍',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어양념구이', '송파구 양념장어', '송파구 장어', '송파구 장어 양념구이', '송파구 고추장 장어'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어양념구이', catRef: '장어', isRepresentative: true,
  },
  {
    id: 'rest_eel_deopbap_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어덮밥', cat: '장어', name: '이 장어집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어덮밥', '송파구 장어덮밥 맛집', '송파구 장어', '송파구 히츠마부시', '송파구 장어 점심'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어덮밥', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_tang_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어탕', cat: '장어', name: '이 장어집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어탕', '송파구 장어탕 맛집', '송파구 장어', '송파구 장어 보양', '송파구 추어탕 장어탕'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어탕', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_jeongsik_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어정식', cat: '장어', name: '이 장어집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어정식', '송파구 장어 정식', '송파구 장어', '송파구 장어 코스', '송파구 장어 세트'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어정식', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_set_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '장어세트', cat: '장어', name: '이 장어집', emoji: '🐍',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어세트', '송파구 장어 세트', '송파구 장어', '송파구 장어 모둠', '송파구 장어 회식'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '장어세트', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_bokbunja_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '복분자', cat: '장어', name: '이 장어집', emoji: '🍷',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어 복분자', '송파구 복분자', '송파구 장어집 복분자', '송파구 장어 반주', '송파구 복분자주'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '복분자', catRef: '장어', isRepresentative: false,
  },
  {
    id: 'rest_eel_gonggibap_songpa_01',
    storeId: 'store_songpa_eel_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '장어', name: '이 장어집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어 공깃밥', '송파구 장어집 밥', '송파구 장어 식사', '송파구 장어 밥', '송파구 장어 든든한'],
    compareWith: '동일 지역 다른 장어집', nearbyHint: '송파구 장어·보양 식당가',
    menuRef: '공깃밥', catRef: '장어', isRepresentative: false,
  },

  // ─── 매장: 아구찜 전문점 (storeId: store_songpa_agujjim_01) ───
  //   cat='아구찜' 통일. 찜·탕·정식 계열 = 대표, 볶음밥·밥 = 사이드.
  {
    id: 'rest_agujjim_agujjim_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '아구찜', cat: '아구찜', name: '이 아구찜집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아구찜', '송파구 아구찜 맛집', '송파구 아귀찜', '송파구 아구찜 회식', '송파구 해물찜'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '아구찜', catRef: '아구찜', isRepresentative: true,
  },
  {
    id: 'rest_agujjim_haemul_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '해물아구찜', cat: '아구찜', name: '이 아구찜집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물아구찜', '송파구 해물 아구찜', '송파구 아구찜', '송파구 해물찜', '송파구 아귀찜 해물'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '해물아구찜', catRef: '아구찜', isRepresentative: true,
  },
  {
    id: 'rest_agujjim_sunsal_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '순살아구찜', cat: '아구찜', name: '이 아구찜집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 순살아구찜', '송파구 순살 아구찜', '송파구 아구찜', '송파구 뼈없는 아구찜', '송파구 순살 아귀찜'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '순살아구찜', catRef: '아구찜', isRepresentative: true,
  },
  {
    id: 'rest_agujjim_maeun_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '매운아구찜', cat: '아구찜', name: '이 아구찜집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 매운아구찜', '송파구 매운 아구찜', '송파구 아구찜', '송파구 얼큰한 아구찜', '송파구 매운 아귀찜'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '매운아구찜', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_tang_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '아구탕', cat: '아구찜', name: '이 아구찜집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아구탕', '송파구 아구탕 맛집', '송파구 아귀탕', '송파구 아구 지리', '송파구 시원한 아구탕'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '아구탕', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_suyuk_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '아귀수육', cat: '아구찜', name: '이 아구찜집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아귀수육', '송파구 아구수육', '송파구 아구찜', '송파구 아귀 수육', '송파구 담백한 아귀'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '아귀수육', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_jeongsik_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '아귀찜정식', cat: '아구찜', name: '이 아구찜집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아귀찜정식', '송파구 아구찜 정식', '송파구 아구찜', '송파구 아귀찜 점심', '송파구 아구찜 백반'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '아귀찜정식', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_jeongol_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '아귀전골', cat: '아구찜', name: '이 아구찜집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아귀전골', '송파구 아구전골', '송파구 아구찜', '송파구 아귀 전골', '송파구 아구찜 회식'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '아귀전골', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_bokkeumbap_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '아구찜', name: '이 아구찜집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아구찜 볶음밥', '송파구 볶음밥', '송파구 아구찜 마무리', '송파구 아구찜 볶음밥', '송파구 볶음밥 맛집'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '볶음밥', catRef: '아구찜', isRepresentative: false,
  },
  {
    id: 'rest_agujjim_gonggibap_songpa_01',
    storeId: 'store_songpa_agujjim_01', industry: 'restaurant', region: '송파구',
    menu: '공깃밥', cat: '아구찜', name: '이 아구찜집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아구찜 공깃밥', '송파구 아구찜집 밥', '송파구 아구찜 식사', '송파구 아구찜 밥', '송파구 아구찜 든든한'],
    compareWith: '동일 지역 다른 아구찜집', nearbyHint: '송파구 아구찜·해물찜 식당가',
    menuRef: '공깃밥', catRef: '아구찜', isRepresentative: false,
  },

  // ─── 매장: 갈비 전문점 (storeId: store_songpa_galbi_01) ───
  //   cat='갈비' 통일. 갈비·구이 계열 = 대표, 냉면·찌개·밥 = 사이드.
  {
    id: 'rest_galbi_yangnyeom_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '양념갈비', cat: '갈비', name: '이 갈비집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양념갈비', '송파구 양념갈비 맛집', '송파구 갈비', '송파구 숯불갈비', '송파구 갈비 회식'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '양념갈비', catRef: '갈비', isRepresentative: true,
  },
  {
    id: 'rest_galbi_saeng_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '생갈비', cat: '갈비', name: '이 갈비집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 생갈비', '송파구 생갈비 맛집', '송파구 갈비', '송파구 소생갈비', '송파구 갈비 노포'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '생갈비', catRef: '갈비', isRepresentative: true,
  },
  {
    id: 'rest_galbi_dwaeji_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '돼지갈비', cat: '갈비', name: '이 갈비집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 돼지갈비', '송파구 돼지갈비 맛집', '송파구 갈비', '송파구 숯불 돼지갈비', '송파구 돼지갈비 회식'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '돼지갈비', catRef: '갈비', isRepresentative: true,
  },
  {
    id: 'rest_galbi_so_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '소갈비', cat: '갈비', name: '이 갈비집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소갈비', '송파구 소갈비 맛집', '송파구 갈비', '송파구 한우갈비', '송파구 소갈비 회식'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '소갈비', catRef: '갈비', isRepresentative: true,
  },
  {
    id: 'rest_galbi_salt_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '갈비살', cat: '갈비', name: '이 갈비집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 갈비살', '송파구 갈비살 맛집', '송파구 갈비', '송파구 소갈비살', '송파구 갈비살 구이'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '갈비살', catRef: '갈비', isRepresentative: false,
  },
  {
    id: 'rest_galbi_tang_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '갈비탕', cat: '갈비', name: '이 갈비집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 갈비탕', '송파구 갈비탕 맛집', '송파구 갈비', '송파구 왕갈비탕', '송파구 갈비탕 점심'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '갈비탕', catRef: '갈비', isRepresentative: false,
  },
  {
    id: 'rest_galbi_naengmyeon_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '냉면', cat: '갈비', name: '이 갈비집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 냉면', '송파구 갈비집 냉면', '송파구 물냉면', '송파구 갈비 후식냉면', '송파구 냉면 맛집'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '냉면', catRef: '갈비', isRepresentative: false,
  },
  {
    id: 'rest_galbi_doenjang_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '된장찌개', cat: '갈비', name: '이 갈비집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 된장찌개', '송파구 갈비집 된장', '송파구 된장찌개 맛집', '송파구 갈비 식사', '송파구 된장 식사'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '된장찌개', catRef: '갈비', isRepresentative: false,
  },
  {
    id: 'rest_galbi_gongibap_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '공기밥', cat: '갈비', name: '이 갈비집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 갈비 공기밥', '송파구 갈비집 밥', '송파구 갈비 식사', '송파구 갈비 밥', '송파구 갈비 든든한'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '공기밥', catRef: '갈비', isRepresentative: false,
  },
  {
    id: 'rest_galbi_jeongsik_songpa_01',
    storeId: 'store_songpa_galbi_01', industry: 'restaurant', region: '송파구',
    menu: '갈비정식', cat: '갈비', name: '이 갈비집', emoji: '🍱',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 갈비정식', '송파구 갈비 정식', '송파구 갈비', '송파구 갈비 점심', '송파구 갈비 코스'],
    compareWith: '동일 지역 다른 갈비집', nearbyHint: '송파구 갈비·고기 식당가',
    menuRef: '갈비정식', catRef: '갈비', isRepresentative: false,
  },

  // ─── 매장: 소고기 전문점 (storeId: store_songpa_beef_01) ───
  //   cat='소고기' 통일. 한우 구이 부위 = 대표, 국밥·냉면 = 사이드.
  {
    id: 'rest_beef_deungsim_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '등심', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 등심', '송파구 한우 등심', '송파구 소고기', '송파구 한우', '송파구 등심 회식'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '등심', catRef: '소고기', isRepresentative: true,
  },
  {
    id: 'rest_beef_ansim_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '안심', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 안심', '송파구 한우 안심', '송파구 소고기', '송파구 한우', '송파구 안심 스테이크'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '안심', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_chaekkeut_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '채끝', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 채끝', '송파구 한우 채끝', '송파구 소고기', '송파구 채끝 등심', '송파구 한우'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '채끝', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_kkotdeungsim_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '꽃등심', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 꽃등심', '송파구 한우 꽃등심', '송파구 소고기', '송파구 꽃등심 맛집', '송파구 한우 회식'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '꽃등심', catRef: '소고기', isRepresentative: true,
  },
  {
    id: 'rest_beef_salchisal_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '살치살', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 살치살', '송파구 한우 살치살', '송파구 소고기', '송파구 살치살 맛집', '송파구 한우 특수부위'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '살치살', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_modeum_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '모둠한우', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠한우', '송파구 한우 모둠', '송파구 소고기', '송파구 한우 모듬', '송파구 한우 회식'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '모둠한우', catRef: '소고기', isRepresentative: true,
  },
  {
    id: 'rest_beef_chadol_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '차돌박이', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 차돌박이', '송파구 차돌박이 맛집', '송파구 소고기', '송파구 차돌', '송파구 한우 차돌박이'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '차돌박이', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_yukhoe_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '육회', cat: '소고기', name: '이 소고기집', emoji: '🥩',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 육회', '송파구 육회 맛집', '송파구 소고기', '송파구 한우육회', '송파구 육회 안주'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '육회', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_gukbap_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '소고기국밥', cat: '소고기', name: '이 소고기집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소고기국밥', '송파구 소고기 국밥', '송파구 소고기', '송파구 소국밥', '송파구 국밥 맛집'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '소고기국밥', catRef: '소고기', isRepresentative: false,
  },
  {
    id: 'rest_beef_naengmyeon_songpa_01',
    storeId: 'store_songpa_beef_01', industry: 'restaurant', region: '송파구',
    menu: '냉면', cat: '소고기', name: '이 소고기집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 냉면', '송파구 소고기집 냉면', '송파구 물냉면', '송파구 고기 후식냉면', '송파구 냉면 맛집'],
    compareWith: '동일 지역 다른 소고기집', nearbyHint: '송파구 한우·고기 식당가',
    menuRef: '냉면', catRef: '소고기', isRepresentative: false,
  },

  // ─── 매장: 쌀국수 전문점 (storeId: store_songpa_ricenoodle_01) ───
  //   cat='쌀국수' 통일. 국물 쌀국수 = 대표, 볶음·분짜·월남쌈 = 사이드.
  {
    id: 'rest_ricenoodle_sogogi_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '소고기쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소고기쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 쌀국수 혼밥', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '소고기쌀국수', catRef: '쌀국수', isRepresentative: true,
  },
  {
    id: 'rest_ricenoodle_yangji_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '양지쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양지쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 양지 쌀국수', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '양지쌀국수', catRef: '쌀국수', isRepresentative: true,
  },
  {
    id: 'rest_ricenoodle_chadol_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '차돌쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 차돌쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 차돌 쌀국수', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '차돌쌀국수', catRef: '쌀국수', isRepresentative: true,
  },
  {
    id: 'rest_ricenoodle_maeun_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '매운쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 매운쌀국수', '송파구 쌀국수', '송파구 얼큰한 쌀국수', '송파구 베트남음식', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '매운쌀국수', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_haemul_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '해물쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 해물 쌀국수', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '해물쌀국수', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_dak_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '닭쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 닭고기 쌀국수', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '닭쌀국수', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_wanggalbi_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '왕갈비쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 왕갈비쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 갈비 쌀국수', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '왕갈비쌀국수', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_bokkeum_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '볶음쌀국수', cat: '쌀국수', name: '이 쌀국수집', emoji: '🍳',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 볶음쌀국수', '송파구 쌀국수', '송파구 베트남음식', '송파구 팟타이', '송파구 쌀국수 맛집'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '볶음쌀국수', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_buncha_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '분짜', cat: '쌀국수', name: '이 쌀국수집', emoji: '🥢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 분짜', '송파구 베트남음식', '송파구 쌀국수집 분짜', '송파구 분짜 맛집', '송파구 하노이 분짜'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '분짜', catRef: '쌀국수', isRepresentative: false,
  },
  {
    id: 'rest_ricenoodle_wolnamssam_songpa_01',
    storeId: 'store_songpa_ricenoodle_01', industry: 'restaurant', region: '송파구',
    menu: '월남쌈', cat: '쌀국수', name: '이 쌀국수집', emoji: '🥬',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 월남쌈', '송파구 베트남음식', '송파구 쌀국수집 월남쌈', '송파구 월남쌈 맛집', '송파구 라이스페이퍼'],
    compareWith: '동일 지역 다른 쌀국수집', nearbyHint: '송파구 베트남·아시안 식당가',
    menuRef: '월남쌈', catRef: '쌀국수', isRepresentative: false,
  },

  // ─── 매장: 양꼬치 전문점 (storeId: store_songpa_yangkkochi_01) ───
  {
    id: 'rest_yangkkochi_01_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양꼬치', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양꼬치', '송파구 양꼬치 맛집', '송파구 양갈비', '송파구 양꼬치 회식', '송파구 중국음식'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양꼬치', catRef: '양꼬치', isRepresentative: true,
  },
  {
    id: 'rest_yangkkochi_02_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비', '송파구 양꼬치집 양갈비', '송파구 양고기', '송파구 양갈비 맛집', '송파구 램'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양갈비', catRef: '양꼬치', isRepresentative: true,
  },
  {
    id: 'rest_yangkkochi_03_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양등심꼬치', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양등심꼬치', '송파구 양꼬치', '송파구 양고기 꼬치', '송파구 양꼬치 맛집', '송파구 중국음식'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양등심꼬치', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_04_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비살', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비살', '송파구 양꼬치집 양갈비살', '송파구 양고기', '송파구 양갈비 맛집', '송파구 램'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양갈비살', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_05_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양념양꼬치', cat: '양꼬치', name: '이 양꼬치집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양념양꼬치', '송파구 양꼬치', '송파구 매운 양꼬치', '송파구 양꼬치 맛집', '송파구 중국음식'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양념양꼬치', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_06_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '매운양꼬치', cat: '양꼬치', name: '이 양꼬치집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 매운양꼬치', '송파구 양꼬치', '송파구 얼큰한 양꼬치', '송파구 양꼬치 맛집', '송파구 중국음식'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '매운양꼬치', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_07_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양꼬치세트', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양꼬치세트', '송파구 양꼬치', '송파구 양꼬치 모둠', '송파구 양꼬치 회식', '송파구 양꼬치 맛집'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양꼬치세트', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_08_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비구이', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍖',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비구이', '송파구 양갈비', '송파구 양고기 구이', '송파구 양갈비 맛집', '송파구 램'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '양갈비구이', catRef: '양꼬치', isRepresentative: false,
  },
  {
    id: 'rest_yangkkochi_09_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '꿔바로우', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 꿔바로우', '송파구 양꼬치집 꿔바로우', '송파구 탕수육', '송파구 중국음식', '송파구 꿔바로우 맛집'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '꿔바로우', catRef: '양꼬치', isRepresentative: true,
  },
  {
    id: 'rest_yangkkochi_10_songpa_01',
    storeId: 'store_songpa_yangkkochi_01', industry: 'restaurant', region: '송파구',
    menu: '온면', cat: '양꼬치', name: '이 양꼬치집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 온면', '송파구 양꼬치집 온면', '송파구 중국음식', '송파구 마무리 식사', '송파구 면 요리'],
    compareWith: '동일 지역 다른 양꼬치집', nearbyHint: '송파구 중식·양꼬치 식당가',
    menuRef: '온면', catRef: '양꼬치', isRepresentative: false,
  },

  // ─── 매장: 삼계탕 전문점 (storeId: store_songpa_samgyetang_01) ───
  {
    id: 'rest_samgyetang_01_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 삼계탕', '송파구 삼계탕 맛집', '송파구 보양식', '송파구 삼계탕 혼밥', '송파구 복날'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '삼계탕', catRef: '삼계탕', isRepresentative: true,
  },
  {
    id: 'rest_samgyetang_02_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '한방삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 한방삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 한방 보양식', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '한방삼계탕', catRef: '삼계탕', isRepresentative: true,
  },
  {
    id: 'rest_samgyetang_03_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '전복삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 전복삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 전복 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '전복삼계탕', catRef: '삼계탕', isRepresentative: true,
  },
  {
    id: 'rest_samgyetang_04_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '토종삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 토종삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 토종닭 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '토종삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_05_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '능이삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍄',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 능이삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 능이 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '능이삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_06_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '들깨삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 들깨삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 들깨 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '들깨삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_07_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '옻삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 옻삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 옻닭', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '옻삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_08_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '흑마늘삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🧄',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 흑마늘삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 흑마늘 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '흑마늘삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_09_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '녹두삼계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 녹두삼계탕', '송파구 삼계탕', '송파구 보양식', '송파구 녹두 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '녹두삼계탕', catRef: '삼계탕', isRepresentative: false,
  },
  {
    id: 'rest_samgyetang_10_songpa_01',
    storeId: 'store_songpa_samgyetang_01', industry: 'restaurant', region: '송파구',
    menu: '반계탕', cat: '삼계탕', name: '이 삼계탕집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 반계탕', '송파구 삼계탕', '송파구 보양식', '송파구 반마리 삼계탕', '송파구 삼계탕 맛집'],
    compareWith: '동일 지역 다른 삼계탕집', nearbyHint: '송파구 보양식·한식 식당가',
    menuRef: '반계탕', catRef: '삼계탕', isRepresentative: false,
  },

  // ─── 매장: 칼국수 전문점 (storeId: store_songpa_kalguksu_01) ───
  {
    id: 'rest_kalguksu_01_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '바지락칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 바지락칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 바지락 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '바지락칼국수', catRef: '칼국수', isRepresentative: true,
  },
  {
    id: 'rest_kalguksu_02_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '해물칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 해물 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '해물칼국수', catRef: '칼국수', isRepresentative: true,
  },
  {
    id: 'rest_kalguksu_03_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '손칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 손칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 수제 칼국수', '송파구 노포 칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '손칼국수', catRef: '칼국수', isRepresentative: true,
  },
  {
    id: 'rest_kalguksu_04_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '들깨칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 들깨칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 들깨 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '들깨칼국수', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_05_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '얼큰칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 얼큰칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 얼큰한 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '얼큰칼국수', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_06_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '닭칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 닭 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '닭칼국수', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_07_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '팥칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 팥칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 팥 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '팥칼국수', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_08_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '장칼국수', cat: '칼국수', name: '이 칼국수집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장칼국수', '송파구 칼국수', '송파구 칼국수 맛집', '송파구 장 칼국수', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '장칼국수', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_09_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '칼제비', cat: '칼국수', name: '이 칼국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 칼제비', '송파구 칼국수집 칼제비', '송파구 수제비', '송파구 칼국수 맛집', '송파구 손칼국수'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '칼제비', catRef: '칼국수', isRepresentative: false,
  },
  {
    id: 'rest_kalguksu_10_songpa_01',
    storeId: 'store_songpa_kalguksu_01', industry: 'restaurant', region: '송파구',
    menu: '만두', cat: '칼국수', name: '이 칼국수집', emoji: '🥟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 만두', '송파구 칼국수집 만두', '송파구 손만두', '송파구 왕만두', '송파구 칼국수 맛집'],
    compareWith: '동일 지역 다른 칼국수집', nearbyHint: '송파구 칼국수·손칼국수 식당가',
    menuRef: '만두', catRef: '칼국수', isRepresentative: false,
  },

  // ─── 매장: 국수 전문점 (storeId: store_songpa_guksu_01) ───
  {
    id: 'rest_guksu_01_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '잔치국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 잔치국수', '송파구 국수', '송파구 국수 맛집', '송파구 잔치국수 혼밥', '송파구 멸치국수'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '잔치국수', catRef: '국수', isRepresentative: true,
  },
  {
    id: 'rest_guksu_02_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '비빔국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 비빔국수', '송파구 국수', '송파구 국수 맛집', '송파구 매콤 비빔국수', '송파구 분식'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '비빔국수', catRef: '국수', isRepresentative: true,
  },
  {
    id: 'rest_guksu_03_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '멸치국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 멸치국수', '송파구 국수', '송파구 국수 맛집', '송파구 멸치 육수 국수', '송파구 잔치국수'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '멸치국수', catRef: '국수', isRepresentative: true,
  },
  {
    id: 'rest_guksu_04_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '열무국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 열무국수', '송파구 국수', '송파구 국수 맛집', '송파구 열무 비빔국수', '송파구 여름 국수'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '열무국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_05_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '김치국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 김치국수', '송파구 국수', '송파구 국수 맛집', '송파구 김치말이국수', '송파구 분식'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '김치국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_06_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '칼국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 칼국수', '송파구 국수집 칼국수', '송파구 손칼국수', '송파구 국수 맛집', '송파구 면 요리'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '칼국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_07_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '콩국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 콩국수', '송파구 국수', '송파구 국수 맛집', '송파구 여름 콩국수', '송파구 콩국수 맛집'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '콩국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_08_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '들기름국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 들기름국수', '송파구 국수', '송파구 국수 맛집', '송파구 들기름 막국수', '송파구 분식'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '들기름국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_09_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '육수국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 육수국수', '송파구 국수', '송파구 국수 맛집', '송파구 뜨끈한 국수', '송파구 잔치국수'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '육수국수', catRef: '국수', isRepresentative: false,
  },
  {
    id: 'rest_guksu_10_songpa_01',
    storeId: 'store_songpa_guksu_01', industry: 'restaurant', region: '송파구',
    menu: '냉국수', cat: '국수', name: '이 국수집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 냉국수', '송파구 국수', '송파구 국수 맛집', '송파구 시원한 냉국수', '송파구 여름 국수'],
    compareWith: '동일 지역 다른 국수집', nearbyHint: '송파구 국수·분식 식당가',
    menuRef: '냉국수', catRef: '국수', isRepresentative: false,
  },

  // ─── 매장: 샤브샤브 전문점 (storeId: store_songpa_shabu_01) ───
  {
    id: 'rest_shabu_01_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '소고기샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소고기샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 소고기 샤브', '송파구 가족모임'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '소고기샤브샤브', catRef: '샤브샤브', isRepresentative: true,
  },
  {
    id: 'rest_shabu_02_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '버섯샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍄',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 버섯샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 버섯 샤브', '송파구 건강식'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '버섯샤브샤브', catRef: '샤브샤브', isRepresentative: true,
  },
  {
    id: 'rest_shabu_03_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '해물샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 해물 샤브', '송파구 가족모임'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '해물샤브샤브', catRef: '샤브샤브', isRepresentative: true,
  },
  {
    id: 'rest_shabu_04_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '한우샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 한우샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 한우 샤브', '송파구 회식'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '한우샤브샤브', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_05_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '스페셜샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 스페셜샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 모둠 샤브', '송파구 가족모임'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '스페셜샤브샤브', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_06_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '월남쌈샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🥬',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 월남쌈샤브', '송파구 샤브샤브', '송파구 월남쌈', '송파구 샤브샤브 맛집', '송파구 여자모임'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '월남쌈샤브', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_07_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '편백찜샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 편백찜샤브', '송파구 샤브샤브', '송파구 편백찜', '송파구 샤브샤브 맛집', '송파구 건강식'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '편백찜샤브', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_08_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '얼큰샤브샤브', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 얼큰샤브샤브', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 얼큰한 샤브', '송파구 회식'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '얼큰샤브샤브', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_09_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '스키야키', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 스키야키', '송파구 샤브샤브집 스키야키', '송파구 일본식 전골', '송파구 스키야키 맛집', '송파구 데이트'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '스키야키', catRef: '샤브샤브', isRepresentative: false,
  },
  {
    id: 'rest_shabu_10_songpa_01',
    storeId: 'store_songpa_shabu_01', industry: 'restaurant', region: '송파구',
    menu: '샤브정식', cat: '샤브샤브', name: '이 샤브샤브집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 샤브정식', '송파구 샤브샤브', '송파구 샤브샤브 맛집', '송파구 점심 샤브', '송파구 직장인 점심'],
    compareWith: '동일 지역 다른 샤브샤브집', nearbyHint: '송파구 샤브샤브·전골 식당가',
    menuRef: '샤브정식', catRef: '샤브샤브', isRepresentative: false,
  },

  // ─── 매장: 초밥 전문점 (storeId: store_songpa_sushi_01) ───
  {
    id: 'rest_sushi_01_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '모둠초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 스시', '송파구 초밥 오마카세'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '모둠초밥', catRef: '초밥', isRepresentative: true,
  },
  {
    id: 'rest_sushi_02_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '특초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 특초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 스페셜 초밥', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '특초밥', catRef: '초밥', isRepresentative: true,
  },
  {
    id: 'rest_sushi_03_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '생연어초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 생연어초밥', '송파구 초밥', '송파구 연어초밥', '송파구 초밥 맛집', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '생연어초밥', catRef: '초밥', isRepresentative: true,
  },
  {
    id: 'rest_sushi_04_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '광어초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 광어초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 흰살생선 초밥', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '광어초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_05_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '참치초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 참치초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 참치 스시', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '참치초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_06_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '새우초밥', cat: '초밥', name: '이 초밥집', emoji: '🍤',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 새우초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 새우 스시', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '새우초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_07_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '장어초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 장어초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 장어 스시', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '장어초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_08_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '소고기초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 소고기초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 규스시', '송파구 스시'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '소고기초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_09_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '유부초밥', cat: '초밥', name: '이 초밥집', emoji: '🍣',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 유부초밥', '송파구 초밥', '송파구 초밥 맛집', '송파구 유부 스시', '송파구 포장 초밥'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '유부초밥', catRef: '초밥', isRepresentative: false,
  },
  {
    id: 'rest_sushi_10_songpa_01',
    storeId: 'store_songpa_sushi_01', industry: 'restaurant', region: '송파구',
    menu: '회덮밥', cat: '초밥', name: '이 초밥집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 회덮밥', '송파구 초밥집 회덮밥', '송파구 초밥 맛집', '송파구 점심 회덮밥', '송파구 직장인 점심'],
    compareWith: '동일 지역 다른 초밥집', nearbyHint: '송파구 초밥·스시 식당가',
    menuRef: '회덮밥', catRef: '초밥', isRepresentative: false,
  },

  // ─── 매장: 대게·킹크랩 전문점 (storeId: store_songpa_crab_01) ───
  {
    id: 'rest_crab_01_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '대게', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 대게', '송파구 대게 맛집', '송파구 대게집', '송파구 대게 가족모임', '송파구 수산'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '대게', catRef: '대게·킹크랩', isRepresentative: true,
  },
  {
    id: 'rest_crab_02_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '킹크랩', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 킹크랩', '송파구 킹크랩 맛집', '송파구 대게집 킹크랩', '송파구 킹크랩 기념일', '송파구 수산'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '킹크랩', catRef: '대게·킹크랩', isRepresentative: true,
  },
  {
    id: 'rest_crab_03_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '대게세트', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 대게세트', '송파구 대게', '송파구 대게 맛집', '송파구 대게 코스', '송파구 가족모임'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '대게세트', catRef: '대게·킹크랩', isRepresentative: true,
  },
  {
    id: 'rest_crab_04_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '랍스터', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦞',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 랍스터', '송파구 대게집 랍스터', '송파구 랍스터 맛집', '송파구 기념일', '송파구 수산'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '랍스터', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_05_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '홍게', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 홍게', '송파구 대게집 홍게', '송파구 홍게 맛집', '송파구 가성비 게', '송파구 수산'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '홍게', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_06_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '박달대게', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 박달대게', '송파구 대게', '송파구 대게 맛집', '송파구 박달 대게', '송파구 수산'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '박달대게', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_07_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '대게코스', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 대게코스', '송파구 대게', '송파구 대게 맛집', '송파구 대게 풀코스', '송파구 가족모임'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '대게코스', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_08_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '킹크랩코스', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 킹크랩코스', '송파구 킹크랩', '송파구 킹크랩 맛집', '송파구 킹크랩 풀코스', '송파구 기념일'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '킹크랩코스', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_09_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '킹크랩세트', cat: '대게·킹크랩', name: '이 대게집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 킹크랩세트', '송파구 킹크랩', '송파구 킹크랩 맛집', '송파구 킹크랩 코스', '송파구 가족모임'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '킹크랩세트', catRef: '대게·킹크랩', isRepresentative: false,
  },
  {
    id: 'rest_crab_10_songpa_01',
    storeId: 'store_songpa_crab_01', industry: 'restaurant', region: '송파구',
    menu: '게딱지볶음밥', cat: '대게·킹크랩', name: '이 대게집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 게딱지볶음밥', '송파구 대게집 볶음밥', '송파구 대게 볶음밥', '송파구 마무리 볶음밥', '송파구 대게 맛집'],
    compareWith: '동일 지역 다른 대게·킹크랩집', nearbyHint: '송파구 대게·수산 식당가',
    menuRef: '게딱지볶음밥', catRef: '대게·킹크랩', isRepresentative: false,
  },

  // ─── 매장: 횟집 전문점 (storeId: store_songpa_hoe_01) ───
  {
    id: 'rest_hoe_01_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '모둠회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠회', '송파구 횟집', '송파구 회 맛집', '송파구 활어회', '송파구 회식'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '모둠회', catRef: '횟집', isRepresentative: true,
  },
  {
    id: 'rest_hoe_02_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '광어회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 광어회', '송파구 횟집', '송파구 회 맛집', '송파구 광어', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '광어회', catRef: '횟집', isRepresentative: true,
  },
  {
    id: 'rest_hoe_03_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '방어회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 방어회', '송파구 횟집', '송파구 회 맛집', '송파구 겨울 방어', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '방어회', catRef: '횟집', isRepresentative: true,
  },
  {
    id: 'rest_hoe_04_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '우럭회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 우럭회', '송파구 횟집', '송파구 회 맛집', '송파구 우럭', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '우럭회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_05_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '참돔회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 참돔회', '송파구 횟집', '송파구 회 맛집', '송파구 참돔', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '참돔회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_06_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '농어회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 농어회', '송파구 횟집', '송파구 회 맛집', '송파구 농어', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '농어회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_07_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '연어회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 연어회', '송파구 횟집', '송파구 회 맛집', '송파구 연어', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '연어회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_08_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '도미회', cat: '횟집', name: '이 횟집', emoji: '🐟',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 도미회', '송파구 횟집', '송파구 회 맛집', '송파구 도미', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '도미회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_09_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '물회', cat: '횟집', name: '이 횟집', emoji: '🍜',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 물회', '송파구 횟집 물회', '송파구 물회 맛집', '송파구 여름 물회', '송파구 활어회'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '물회', catRef: '횟집', isRepresentative: false,
  },
  {
    id: 'rest_hoe_10_songpa_01',
    storeId: 'store_songpa_hoe_01', industry: 'restaurant', region: '송파구',
    menu: '회덮밥', cat: '횟집', name: '이 횟집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 회덮밥', '송파구 횟집 회덮밥', '송파구 회덮밥 맛집', '송파구 점심 회덮밥', '송파구 직장인 점심'],
    compareWith: '동일 지역 다른 횟집집', nearbyHint: '송파구 횟집·수산 식당가',
    menuRef: '회덮밥', catRef: '횟집', isRepresentative: false,
  },

  // ─── 매장: 찜닭 전문점 (storeId: store_songpa_jjimdak_01) ───
  {
    id: 'rest_jjimdak_01_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '안동찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 안동찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 안동찜닭 배달', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '안동찜닭', catRef: '찜닭', isRepresentative: true,
  },
  {
    id: 'rest_jjimdak_02_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '간장찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 간장찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 간장 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '간장찜닭', catRef: '찜닭', isRepresentative: true,
  },
  {
    id: 'rest_jjimdak_03_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '매운찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 매운찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 매운 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '매운찜닭', catRef: '찜닭', isRepresentative: true,
  },
  {
    id: 'rest_jjimdak_04_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '순살찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 순살찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 순살 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '순살찜닭', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_05_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '치즈찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🧀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 치즈찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 치즈 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '치즈찜닭', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_06_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '국물찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 국물찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 국물 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '국물찜닭', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_07_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '마라찜닭', cat: '찜닭', name: '이 찜닭집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 마라찜닭', '송파구 찜닭', '송파구 찜닭 맛집', '송파구 마라 찜닭', '송파구 닭요리'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '마라찜닭', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_08_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '찜닭볶음밥', cat: '찜닭', name: '이 찜닭집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 찜닭볶음밥', '송파구 찜닭집 볶음밥', '송파구 찜닭 볶음밥', '송파구 마무리 볶음밥', '송파구 찜닭 맛집'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '찜닭볶음밥', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_09_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '닭발', cat: '찜닭', name: '이 찜닭집', emoji: '🌶️',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발', '송파구 찜닭집 닭발', '송파구 매운 닭발', '송파구 닭발 맛집', '송파구 술안주'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '닭발', catRef: '찜닭', isRepresentative: false,
  },
  {
    id: 'rest_jjimdak_10_songpa_01',
    storeId: 'store_songpa_jjimdak_01', industry: 'restaurant', region: '송파구',
    menu: '콩나물무침', cat: '찜닭', name: '이 찜닭집', emoji: '🥬',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 콩나물무침', '송파구 찜닭집 콩나물', '송파구 밑반찬', '송파구 콩나물', '송파구 찜닭 맛집'],
    compareWith: '동일 지역 다른 찜닭집', nearbyHint: '송파구 찜닭·닭요리 식당가',
    menuRef: '콩나물무침', catRef: '찜닭', isRepresentative: false,
  },

  // ─── 매장: 양고기 전문점 (storeId: store_songpa_lamb_01) ───
  {
    id: 'rest_lamb_01_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비', '송파구 양고기', '송파구 양갈비 맛집', '송파구 램', '송파구 양고기 회식'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양갈비', catRef: '양고기', isRepresentative: true,
  },
  {
    id: 'rest_lamb_02_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '프렌치랙', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 프렌치랙', '송파구 양고기', '송파구 양갈비 맛집', '송파구 램랙', '송파구 양고기'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '프렌치랙', catRef: '양고기', isRepresentative: true,
  },
  {
    id: 'rest_lamb_03_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '모둠양고기', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 모둠양고기', '송파구 양고기', '송파구 양갈비 맛집', '송파구 양고기 모둠', '송파구 양고기 회식'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '모둠양고기', catRef: '양고기', isRepresentative: true,
  },
  {
    id: 'rest_lamb_04_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양등심', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양등심', '송파구 양고기', '송파구 양갈비 맛집', '송파구 양 등심', '송파구 램'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양등심', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_05_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양어깨살', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양어깨살', '송파구 양고기', '송파구 양갈비 맛집', '송파구 양 어깨살', '송파구 램'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양어깨살', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_06_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양꼬치', cat: '양고기', name: '이 양고기집', emoji: '🍢',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양꼬치', '송파구 양고기집 양꼬치', '송파구 양꼬치 맛집', '송파구 양고기', '송파구 램'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양꼬치', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_07_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비살', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비살', '송파구 양고기', '송파구 양갈비 맛집', '송파구 양 갈비살', '송파구 램'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양갈비살', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_08_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양갈비정식', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양갈비정식', '송파구 양고기', '송파구 양갈비 맛집', '송파구 양갈비 점심', '송파구 직장인 점심'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양갈비정식', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_09_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양전골', cat: '양고기', name: '이 양고기집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양전골', '송파구 양고기집 전골', '송파구 양고기 전골', '송파구 양전골 맛집', '송파구 양고기'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양전골', catRef: '양고기', isRepresentative: false,
  },
  {
    id: 'rest_lamb_10_songpa_01',
    storeId: 'store_songpa_lamb_01', industry: 'restaurant', region: '송파구',
    menu: '양수육', cat: '양고기', name: '이 양고기집', emoji: '🐑',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 양수육', '송파구 양고기집 수육', '송파구 양 수육', '송파구 양수육 맛집', '송파구 양고기'],
    compareWith: '동일 지역 다른 양고기집', nearbyHint: '송파구 양고기·양갈비 식당가',
    menuRef: '양수육', catRef: '양고기', isRepresentative: false,
  },

  // ─── 매장: 해물탕 전문점 (storeId: store_songpa_seafoodtang_01) ───
  {
    id: 'rest_seafoodtang_01_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '해물탕', cat: '해물탕', name: '이 해물탕집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물탕', '송파구 해물탕 맛집', '송파구 해물탕집', '송파구 해물탕 회식', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '해물탕', catRef: '해물탕', isRepresentative: true,
  },
  {
    id: 'rest_seafoodtang_02_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '해물찜', cat: '해물탕', name: '이 해물탕집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물찜', '송파구 해물탕', '송파구 해물찜 맛집', '송파구 매운 해물찜', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '해물찜', catRef: '해물탕', isRepresentative: true,
  },
  {
    id: 'rest_seafoodtang_03_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '해물전골', cat: '해물탕', name: '이 해물탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해물전골', '송파구 해물탕', '송파구 해물전골 맛집', '송파구 해물 전골', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '해물전골', catRef: '해물탕', isRepresentative: true,
  },
  {
    id: 'rest_seafoodtang_04_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '아귀해물찜', cat: '해물탕', name: '이 해물탕집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 아귀해물찜', '송파구 해물찜', '송파구 아귀찜', '송파구 해물찜 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '아귀해물찜', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_05_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '해신탕', cat: '해물탕', name: '이 해물탕집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 해신탕', '송파구 해물탕', '송파구 보양 해신탕', '송파구 해신탕 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '해신탕', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_06_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '꽃게탕', cat: '해물탕', name: '이 해물탕집', emoji: '🦀',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 꽃게탕', '송파구 해물탕집 꽃게탕', '송파구 꽃게', '송파구 꽃게탕 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '꽃게탕', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_07_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '낙지해물탕', cat: '해물탕', name: '이 해물탕집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 낙지해물탕', '송파구 해물탕', '송파구 낙지탕', '송파구 해물탕 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '낙지해물탕', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_08_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '조개해물탕', cat: '해물탕', name: '이 해물탕집', emoji: '🦪',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 조개해물탕', '송파구 해물탕', '송파구 조개탕', '송파구 해물탕 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '조개해물탕', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_09_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '문어해물탕', cat: '해물탕', name: '이 해물탕집', emoji: '🐙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 문어해물탕', '송파구 해물탕', '송파구 문어탕', '송파구 해물탕 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '문어해물탕', catRef: '해물탕', isRepresentative: false,
  },
  {
    id: 'rest_seafoodtang_10_songpa_01',
    storeId: 'store_songpa_seafoodtang_01', industry: 'restaurant', region: '송파구',
    menu: '섞어찜', cat: '해물탕', name: '이 해물탕집', emoji: '🦐',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 섞어찜', '송파구 해물찜', '송파구 모둠 해물찜', '송파구 섞어찜 맛집', '송파구 해산물'],
    compareWith: '동일 지역 다른 해물탕집', nearbyHint: '송파구 해물탕·해산물 식당가',
    menuRef: '섞어찜', catRef: '해물탕', isRepresentative: false,
  },

  // ═══════════════════════════════════════════════════════
  // 분식 — 맵고분식 (store_gongleung_boonsik_01 · 공릉동·태릉입구역) ★ v1.2 실매장 8종
  // 한 매장 8개 메뉴를 개별 SEO 카드로 노출
  // titlePatterns: 매장명 0건 / 표시명(menu) 100% 포함 / "메뉴 소개·정리" 제거 → 상황·목적 중심
  // keywords: SEO 단순형(떡볶이·꼬마김밥·튀김·순대·어묵) — 검색량 확보 (A안)
  // ⚠ 가격 X / 메뉴 소개글 X → "먹는 상황" 중심
  // ═══════════════════════════════════════════════════════
  {
    id: 'rest_boonsik_tteokbokki_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '매콤한 떡볶이',
    cat: '분식',
    name: '이 분식집',
    emoji: '🌶️',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 떡볶이', '공릉동 떡볶이 맛집', '공릉동 분식집',
      '공릉동 떡볶이 포장', '태릉입구역 떡볶이', '태릉입구역 분식',
      '공릉동 매콤한 떡볶이',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '매콤한 떡볶이', catRef: '분식', isRepresentative: true,
  },

  {
    id: 'rest_boonsik_rose_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '매콤 로제 떡볶이',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍝',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 로제떡볶이', '공릉동 떡볶이 맛집', '공릉동 분식집',
      '공릉동 로제떡볶이 포장', '태릉입구역 로제떡볶이', '태릉입구역 분식',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '매콤 로제 떡볶이', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_chamchikimbap_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '참치마요 꼬마김밥',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍙',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 김밥', '공릉동 김밥 포장', '공릉동 분식집',
      '공릉동 꼬마김밥', '태릉입구역 김밥', '태릉입구역 분식',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '참치마요 꼬마김밥', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_maeunkimbap_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '매운어묵 꼬마김밥',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍙',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 김밥', '공릉동 김밥 포장', '공릉동 분식집',
      '공릉동 꼬마김밥', '태릉입구역 김밥', '태릉입구역 분식',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '매운어묵 꼬마김밥', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_twigim_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '수제 모둠튀김',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍤',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 튀김', '공릉동 튀김 추천', '공릉동 분식집',
      '공릉동 모둠튀김', '태릉입구역 튀김', '태릉입구역 분식',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '수제 모둠튀김', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_chalsundae_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '찰순대',
    cat: '분식',
    name: '이 분식집',
    emoji: '🥟',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 순대', '공릉동 순대 포장', '공릉동 분식집',
      '공릉동 분식 순대', '태릉입구역 순대', '태릉입구역 분식',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '찰순대', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_odeng_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '오뎅꼬치',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍢',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 어묵', '공릉동 분식집', '공릉동 분식 어묵',
      '태릉입구역 어묵', '태릉입구역 분식', '공릉동 오뎅',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '오뎅꼬치', catRef: '분식', isRepresentative: false,
  },

  {
    id: 'rest_boonsik_ramen_gongleung_01',
    storeId: 'store_gongleung_boonsik_01',
    industry: 'restaurant',
    region: '공릉동',
    menu: '라면',
    cat: '분식',
    name: '이 분식집',
    emoji: '🍜',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '공릉동 라면', '공릉동 분식집', '공릉동 분식 라면',
      '태릉입구역 라면', '태릉입구역 분식', '공릉동 라면 맛집',
    ],
    compareWith: '동일 지역 다른 분식집',
    nearbyHint: '태릉입구역 근처 분식 상권',
    menuRef: '라면', catRef: '분식', isRepresentative: false,
  },

  // ─── 검증 통과 후 활성화 (다른 매장 카드) ───
  // 아래 메뉴들은 별도 매장 storeId로 추후 활성화
  // 지금 활성화하면 검증 변수가 늘어나 fossil 관찰이 흐려짐
  /*
  {
    id: 'rest_korean_haejang_guri_01',
    storeId: 'store_guri_haejang_01',
    industry: 'restaurant',
    region: '구리',
    menu: '해장국',
    cat: '한식',
    name: '이 해장국집',
    emoji: '🥣',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 해장국', '구리 해장국 맛집', '구리 해장',
      '구리 아침 해장', '구리 혼밥', '구리 해장국 혼밥',
    ],
    compareWith: '동일 지역 다른 한식집',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '해장국',
    catRef: '한식',
    isRepresentative: true,
  },
  {
    id: 'rest_korean_kalguksu_guri_01',
    storeId: 'store_guri_kalguksu_01',
    industry: 'restaurant',
    region: '구리', menu: '칼국수', cat: '한식',
    name: '이 칼국수집',
    emoji: '🍜',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 칼국수', '구리 칼국수 맛집', '구리 손칼국수',
      '구리 면요리', '구리 혼밥', '구리 칼국수 혼밥',
    ],
    compareWith: '동일 지역 다른 면집',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '칼국수', catRef: '한식', isRepresentative: true,
  },
  {
    id: 'rest_korean_kimchijjigae_guri_01',
    storeId: 'store_guri_kimchijjigae_01',
    industry: 'restaurant',
    region: '구리', menu: '김치찌개', cat: '한식',
    name: '이 김치찌개집',
    emoji: '🍲',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 김치찌개', '구리 김치찌개 맛집', '구리 백반',
      '구리 집밥', '구리 혼밥', '구리 김치찌개 혼밥',
    ],
    compareWith: '동일 지역 다른 백반집',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '김치찌개', catRef: '한식', isRepresentative: true,
  },
  {
    id: 'rest_korean_gisa_guri_01',
    storeId: 'store_guri_gisa_01',
    industry: 'restaurant',
    region: '구리', menu: '기사식당', cat: '한식',
    name: '이 기사식당',
    emoji: '🍱',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 기사식당', '구리 백반', '구리 한식 백반',
      '구리 점심', '구리 혼밥', '구리 기사식당 혼밥',
    ],
    compareWith: '동일 지역 다른 백반집',
    nearbyHint: '구리 시외 도로변 식당가',
    menuRef: '기사식당', catRef: '한식', isRepresentative: true,
  },
  {
    id: 'rest_korean_naengmyeon_guri_01',
    storeId: 'store_guri_naengmyeon_01',
    industry: 'restaurant',
    region: '구리', menu: '냉면', cat: '한식',
    name: '이 냉면집',
    emoji: '🥶',
    titlePatterns: [
      // ★ v3 방문목적 선두 75% : 일반 메뉴형 25% (RESTAURANT_TITLE_PATTERNS_STD 정합)
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: [
      '구리 냉면', '구리 냉면 맛집', '구리 평양냉면',
      '구리 물냉면', '구리 혼밥', '구리 냉면 혼밥',
    ],
    compareWith: '동일 지역 다른 면집',
    nearbyHint: '구리역 근처 한식 식당가',
    menuRef: '냉면', catRef: '한식', isRepresentative: true,
  },
  */
  // ─── 매장: 닭발 전문점 (storeId: store_songpa_dakbal_01) ───
  //   cat='닭발' 통일. 직화·국물 = 대표, 별미·사이드·세트 = 사이드. 조합 경험 SPECIALTY.
  {
    id: 'rest_dakbal_tongppyeo_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '통뼈닭발', cat: '닭발', name: '이 닭발집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발', '송파구 닭발 맛집', '송파구 통뼈닭발', '송파구 닭발 포차', '송파구 닭발 술집'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '통뼈닭발', catRef: '닭발', isRepresentative: true,
  },
  {
    id: 'rest_dakbal_muppyeo_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '무뼈닭발', cat: '닭발', name: '이 닭발집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 무뼈닭발', '송파구 무뼈닭발 맛집', '송파구 닭발', '송파구 닭발 술안주', '송파구 닭발 데이트'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '무뼈닭발', catRef: '닭발', isRepresentative: true,
  },
  {
    id: 'rest_dakbal_gukmul_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '국물닭발', cat: '닭발', name: '이 닭발집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 국물닭발', '송파구 국물닭발 맛집', '송파구 닭발', '송파구 닭발 사리', '송파구 닭발 안주'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '국물닭발', catRef: '닭발', isRepresentative: true,
  },
  {
    id: 'rest_dakbal_muppyeogukmul_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '무뼈국물닭발', cat: '닭발', name: '이 닭발집', emoji: '🍲',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 무뼈국물닭발', '송파구 국물닭발', '송파구 닭발', '송파구 닭발 사리', '송파구 닭발 편하게'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '무뼈국물닭발', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_odolppyeo_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '오돌뼈', cat: '닭발', name: '이 닭발집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 오돌뼈', '송파구 오돌뼈 맛집', '송파구 닭발 오돌뼈', '송파구 닭발 안주', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '오돌뼈', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_ttongjib_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '닭똥집', cat: '닭발', name: '이 닭발집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭똥집', '송파구 닭똥집 맛집', '송파구 닭발 닭똥집', '송파구 닭발 안주', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '닭똥집', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_gyeranjjim_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '계란찜', cat: '닭발', name: '이 닭발집', emoji: '🍳',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발 계란찜', '송파구 닭발 맛집', '송파구 닭발 사이드', '송파구 닭발 세트', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '계란찜', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_jumeokbap_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '주먹밥', cat: '닭발', name: '이 닭발집', emoji: '🍙',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발 주먹밥', '송파구 닭발 맛집', '송파구 닭발 사이드', '송파구 닭발 세트', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '주먹밥', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_bokkeumbap_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '볶음밥', cat: '닭발', name: '이 닭발집', emoji: '🍚',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발 볶음밥', '송파구 닭발 맛집', '송파구 닭발 마무리', '송파구 닭발 세트', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '볶음밥', catRef: '닭발', isRepresentative: false,
  },
  {
    id: 'rest_dakbal_set34_songpa_01',
    storeId: 'store_songpa_dakbal_01', industry: 'restaurant', region: '송파구',
    menu: '3~4인세트', cat: '닭발', name: '이 닭발집', emoji: '🍗',
    titlePatterns: [
      '{purpose} {region} {menu} {searchword}',
      '{purpose} {region} {menu} {searchword}',
      '{region} {purpose} {menu} {searchword}',
      '{region} {menu} {searchword}',
    ],
    keywords: ['송파구 닭발 세트', '송파구 닭발 맛집', '송파구 닭발 모임', '송파구 닭발 회식', '송파구 포차'],
    compareWith: '동일 지역 다른 닭발집', nearbyHint: '송파구 닭발·포차 골목',
    menuRef: '3~4인세트', catRef: '닭발', isRepresentative: true,
  },
];

// ─────────────────────────────────────────────────────────
// RESTAURANT_META — 업종 메타 (index.js INDUSTRY_CONFIG에서 사용)
// ─────────────────────────────────────────────────────────
export const RESTAURANT_META = {
  industry: 'restaurant',
  label: '맛집·식당',
  greeting: '어디서 어떤 메뉴를 안내할까요? 지역·메뉴·상황·목적을 선택하세요.',
  examples: [
    '혼밥하기 좋은 구리 순대국 맛집',
    '주차 편한 구리 수육 식당',
    '친구들과 가기 좋은 공릉동 떡볶이 분식집',
    '간단히 먹기 좋은 공릉동 로제떡볶이',
    '점심 먹기 좋은 공릉동 꼬마김밥',
  ],
  badge: '🍲',
};

// ─────────────────────────────────────────────────────────
// LONGTAIL_SUFFIXES — index.js LONGTAIL_SUFFIXES에서 restaurant 분기로 사용
// 카테고리·상황별 분기 (인계메모 PART 6-2 — 업종 분기 누락 주의)
// ⚠ 의료 suffix / 카페 suffix와 절대 혼용 금지
// ─────────────────────────────────────────────────────────
export const RESTAURANT_LONGTAIL_SUFFIXES = {
  // 한식 국물요리 (순대국·국밥·갈비탕 등) — v3 방문목적/정보형
  korean_soup: [
    '혼밥하기 좋은 자리',
    '주차 편한 곳',
    '든든한 한 끼 메뉴',
    '조용하게 먹기 좋은',
  ],
  // 분식 (떡볶이·김밥·튀김·순대·어묵·라면)
  boonsik: [
    '메뉴 안내',
    '포장 정보',
    '주문 메뉴 소개',
    '방문 정보',
    '매장 정보 안내',
    '위치 안내',
    '간단한 한 끼 메뉴',
    '친구들과 가기 좋은',
    '대표 메뉴 소개',
    '인기 메뉴 안내',
  ],
  // 1단계 검증 후 확장:
  // korean_meat: ['회식하기 좋은', '단체 모임 자리', ...],
  // chinese: ['가족 외식하기 좋은', ...],
  // japanese: ['데이트하기 좋은', ...],

  // 기본 (카테고리 미감지 시)
  default: [
    '방문 정보 안내',
    '메뉴 안내',
    '운영 정보 안내',
  ],
};

// ─────────────────────────────────────────────────────────
// BLOCK_MAP — restaurant ↔ clinic·cafe·dental 차단
// generateRestaurant.js에서 사용
// ─────────────────────────────────────────────────────────
export const RESTAURANT_BLOCK_MAP = {
  // 의료 어휘 차단
  medical: [
    '시술', '수술', '치료', '진료', '회복', '통증', '부작용',
    '상담실', '진료실', '원장님', '의사', '간호사', '병원',
    '회차', '경과', '붓기', '멍', '처방',
  ],
  // 카페 어휘 차단 (Phase 9에서 만든 cafe와 분리)
  cafe: [
    '카공', '작업카페', '스터디카페', '디저트카페', '브런치 카페',
    '루프탑 카페', '콘센트 자리', '노트북 거치',
    '라떼아트', '드립커피', '에스프레소 머신',
  ],
  // 학습 어휘 (혹시 야식·혼밥 톤이 학습 톤으로 빠지는 거 차단)
  study: [
    '독서실', '공부하기 좋은', '집중하기 좋은', '학습', '인강',
  ],
  // 광고 표현 (브랜드 홍보 톤으로 빠지는 거 차단 — Phase 9.5 핵심)
  ad: [
    '찐맛집', '강추', '강력 추천', '인생 맛집', '꼭 가보세요',
    '미친 맛', '미친 비주얼', '역대급', '새로운 발견',
    '숨은 맛집', '숨겨진 명소', '맛집 인증',
  ],
};

// ============================================================
// ★ 제목 다양성 풀 (v2.9-stepF FREEZE 확장 — commercial 제목 조립용)
//   소유: data.js (PHILOSOPHY 원칙1 — titlePatterns 계열은 data 소유, generator는 소비만)
//   조립: `{region} {menu} {MIDDLE|SCENE}｜{SUFFIX}`  (region+menu 선두 고정)
//   금지: 광고형 SUFFIX/MIDDLE (RESTAURANT_TITLE_FORBIDDEN 정합 — 찐맛집/강추 등 불포함)
// ============================================================

// ★ v3 검색어 풀 (제목 끝 검색 키워드 — cat 기준 분기)
//   한식: 앞쪽 우선 / 분식: 뒤쪽 우선
export const RESTAURANT_TITLE_SEARCHWORD = {
  '한식': ['맛집', '식당', '한식집', '국밥집', '집밥', '노포'],
  '분식': ['분식집', '분식', '떡볶이집', '맛집'],
  '순대국': ['맛집', '순대국집', '국밥집', '식당', '노포'],  // ★ 전문점 (SPECIALTY.titleSearchword 정합)
  '국밥': ['맛집', '국밥집', '식당', '노포', '집밥'],       // ★ 전문점 (SPECIALTY: gukbap)
  '족발': ['맛집', '족발집', '식당', '노포', '포장'],       // ★ 전문점 (SPECIALTY: jokbal)
  '감자탕': ['맛집', '감자탕집', '뼈해장국집', '식당', '노포'],  // ★ 전문점 (SPECIALTY: gamjatang)
  '해장국': ['맛집', '해장국집', '식당', '노포', '집밥'],  // ★ 전문점 (SPECIALTY: haejangguk)
  '삼계탕': ['맛집', '삼계탕집', '식당', '노포', '보양식'],  // ★ 전문점 (SPECIALTY: samgyetang)
  '국수': ['맛집', '국수집', '분식', '식당', '노포'],  // ★ 전문점 (SPECIALTY: guksu)
  '쌀국수': ['맛집', '쌀국수집', '베트남음식', '식당', '노포'],  // ★ 전문점 (SPECIALTY: ricenoodle)
  '양꼬치': ['맛집', '양꼬치집', '양갈비', '식당', '노포'],  // ★ 전문점 (SPECIALTY: yangkkochi)
  '냉면': ['맛집', '냉면집', '평양냉면', '식당', '노포'],  // ★ 전문점 (SPECIALTY: naengmyeon)
  '돈까스': ['맛집', '돈까스집', '경양식', '식당', '노포'],  // ★ 전문점 (SPECIALTY: donkatsu)
  '칼국수': ['맛집', '칼국수집', '손칼국수', '식당', '노포'],  // ★ 전문점 (SPECIALTY: kalguksu)
  '샤브샤브': ['맛집', '샤브샤브집', '샤브샤브', '식당', '노포'],  // ★ 전문점 (SPECIALTY: shabu)
  '오리': ['맛집', '오리집', '오리전문점', '오리요리', '식당'],  // ★ 전문점 (SPECIALTY: duck)
  '장어': ['맛집', '장어집', '풍천장어', '식당', '노포'],  // ★ 전문점 (SPECIALTY: eel)
  '곱창·막창': ['맛집', '곱창집', '막창집', '곱창구이', '식당', '노포'],  // ★ 전문점 (SPECIALTY: gopchang)
  '초밥': ['맛집', '초밥집', '스시집', '오마카세', '식당'],  // ★ 전문점 (SPECIALTY: sushi)
  '대게·킹크랩': ['맛집', '대게집', '킹크랩', '수산', '식당'],  // ★ 전문점 (SPECIALTY: crab)
  '횟집': ['맛집', '횟집', '회', '수산', '식당'],  // ★ 전문점 (SPECIALTY: hoe)
  '아구찜': ['맛집', '아구찜집', '아귀찜', '해물찜', '식당'],  // ★ 전문점 (SPECIALTY: agujjim)
  '찜닭': ['맛집', '찜닭집', '안동찜닭', '닭요리', '식당'],  // ★ 전문점 (SPECIALTY: jjimdak)
  '닭갈비': ['맛집', '닭갈비집', '춘천닭갈비', '닭요리', '식당'],  // ★ 전문점 (SPECIALTY: dakgalbi)
  '갈비': ['맛집', '갈비집', '숯불갈비', '고깃집', '식당'],  // ★ 전문점 (SPECIALTY: galbi)
  '소고기': ['맛집', '소고기집', '한우', '고깃집', '식당'],  // ★ 전문점 (SPECIALTY: beef)
  '양고기': ['맛집', '양고기집', '양갈비', '램', '식당'],  // ★ 전문점 (SPECIALTY: lamb)
  '생선구이': ['맛집', '생선구이집', '생선구이백반', '한식', '식당'],  // ★ 전문점 (SPECIALTY: grilledfish)
  '해물탕': ['맛집', '해물탕집', '해물찜', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: seafoodtang)
  '대구탕': ['맛집', '대구탕집', '대구지리', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: daegutang)
  '복집': ['맛집', '복집', '복국', '복요리', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: bokjip)
  '조개구이': ['맛집', '조개구이집', '조개찜', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: shellfish)
  '코다리': ['맛집', '코다리집', '코다리조림', '한식', '식당'],  // ★ 전문점 (SPECIALTY: codari)
  '쭈꾸미': ['맛집', '쭈꾸미집', '쭈꾸미볶음', '주꾸미', '식당'],  // ★ 전문점 (SPECIALTY: jjukkumi)
  '낙지': ['맛집', '낙지집', '낙지볶음', '낙지요리', '식당'],  // ★ 전문점 (SPECIALTY: nakji)
  '물회': ['맛집', '물회집', '물회', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: mulhoe)
  '문어': ['맛집', '문어집', '문어숙회', '해산물', '식당'],  // ★ 전문점 (SPECIALTY: muneo)
  '게장': ['맛집', '게장집', '간장게장', '밥도둑', '식당'],  // ★ 전문점 (SPECIALTY: gejang)
  '전': ['맛집', '전집', '전', '모둠전', '식당'],  // ★ 전문점 (SPECIALTY: jeon)
  '닭한마리': ['맛집', '닭한마리', '닭한마리집', '닭요리', '식당'],  // ★ 전문점 (SPECIALTY: dakhanmari)
  '백숙': ['맛집', '백숙', '백숙집', '토종닭', '식당'],  // ★ 전문점 (SPECIALTY: baeksuk)
  '보리밥': ['맛집', '보리밥', '보리밥집', '산채', '식당'],  // ★ 전문점 (SPECIALTY: boribap)
  '청국장': ['맛집', '청국장', '청국장집', '된장', '식당'],  // ★ 전문점 (SPECIALTY: cheonggukjang)
  '두부': ['맛집', '두부', '두부집', '순두부', '식당'],  // ★ 전문점 (SPECIALTY: dubu)
  '콩나물국밥': ['맛집', '콩나물국밥', '전주콩나물국밥', '해장국', '식당'],  // ★ 전문점 (SPECIALTY: kongnamulgukbap)
  '육개장': ['맛집', '육개장', '육개장집', '한식', '식당'],  // ★ 전문점 (SPECIALTY: yukgaejang)
  default: ['맛집', '식당'],
};

// ★ v3 제목 패턴 풀 (방문목적 선두 70~80% : 일반 메뉴형 20~30%)
//   placeholder: {purpose}=방문목적표현 / {region} / {menu} / {searchword}
//   generator는 카드 titlePatterns를 소비 → 카드 titlePatterns를 아래 비율로 구성
//   ⚠ 매장명 0건. 광고형 0건.
export const RESTAURANT_TITLE_PATTERNS_V3 = {
  // 방문목적 선두형 (주력 — 약 75%)
  purposeLead: [
    '{purpose} {region} {menu} {searchword}',
    '{purpose} {region} {menu} {searchword}',
    '{region} {purpose} {menu} {searchword}',
  ],
  // 일반 메뉴형 (보조 — 약 25%, 순수 메뉴 검색 커버)
  menuLead: [
    '{region} {menu} {searchword}',
  ],
};

// ★ v3 카드 titlePatterns 표준 구성 (purposeLead 3 : menuLead 1 = 75:25)
//   모든 카드 titlePatterns를 이 배열로 통일 → 랜덤 샘플링이 비율을 생성
export const RESTAURANT_TITLE_PATTERNS_STD = [
  '{purpose} {region} {menu} {searchword}',
  '{purpose} {region} {menu} {searchword}',
  '{region} {purpose} {menu} {searchword}',
  '{region} {menu} {searchword}',
];


// 중간 토큰 (메뉴 직후, ｜앞) — 15종
// ★ [철학 v2 / 2026-06-29] MIDDLE = 보조축 '왜 선택하는가'(선택 이유, 범용).
//   주축 {purpose}(왜 가는가)는 PURPOSE_TITLE_LABEL 소유. 역할 분리 — 중복 금지.
//   ⚠ 범용 토큰만. 메뉴 한정 토큰(구워주는·숯불향 등)은 SCENE[메뉴]에서만 — 순대국에 '숯불향' 오염 방지.
//   ⚠ PHILOSOPHY 정합: 광고 단정('최고·강추·찐맛집') 금지. '~좋은/~편한' 정보형 수식만.
export const RESTAURANT_TITLE_MIDDLE = [
  '편하게 먹기 좋은', '부담 없이 가기 좋은', '가볍게 들르기 좋은',
  '한 끼 든든한', '깔끔한', '여유 있게 먹기 좋은', '주차 편한',
];

// 접미 토큰 (｜뒤) — 15종
export const RESTAURANT_TITLE_SUFFIX = [
  '다녀온 곳', '다녀왔어요', '가본 곳', '들렀어요', '찾은 곳',
  '한 끼', '점심으로', '저녁으로', '편하게 한 끼', '오늘은 여기',
  '괜찮았던 곳', '자주 가는 곳', '근처에서', '가볍게', '잘 먹은 곳',
];

// 메뉴 성격별 SCENE 풀 — ★ [철학 v2] 보조축 '왜 선택하는가'의 메뉴 한정 버전.
//   MIDDLE(범용 선택이유) 대신 40% 확률로 치환. 메뉴 결에 맞는 선택이유만.
//   키: 정확한 메뉴명. 미매칭 시 RESTAURANT_TITLE_SCENE_BY_CATEGORY[cat] 폴백.
//   ⚠ 메뉴 결 정합: 순대국에 '숯불향' 같은 무관 토큰 금지. 광고 단정 금지.
export const RESTAURANT_TITLE_SCENE = {
  // ★ 국밥 전문점 (SPECIALTY: gukbap)
  '돼지국밥':   ['뜨끈한 국물 좋은', '혼밥하기 좋은', '해장하기 좋은'],
  '순대국밥':   ['든든하게 먹기 좋은', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
  '내장국밥':   ['든든하게 먹기 좋은', '내장 좋아하면 가기 좋은', '뜨끈한 국물 좋은'],
  '섞어국밥':   ['골고루 든든한', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
  '소머리국밥': ['깊은 국물 좋은', '깔끔하게 먹기 좋은', '혼밥하기 좋은'],
  '얼큰국밥':   ['속 풀기 좋은', '얼큰하게 먹기 좋은', '해장하기 좋은'],
  '수육국밥':   ['고기 든든한', '든든하게 먹기 좋은', '혼밥하기 좋은'],
  '콩나물국밥': ['시원하게 먹기 좋은', '해장하기 좋은', '혼밥하기 좋은'],
  '선지국밥':   ['진한 국물 좋은', '얼큰하게 먹기 좋은', '해장하기 좋은'],
  '황태국밥':   ['맑은 국물 좋은', '담백하게 먹기 좋은', '해장하기 좋은'],
  '모둠수육':   ['부위별로 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  // ★ 족발 전문점 (SPECIALTY: jokbal)
  '족발':       ['나눠 먹기 좋은', '포장하기 좋은', '한잔하기 좋은'],
  '앞다리족발':   ['살코기 좋아하면 가기 좋은', '담백하게 먹기 좋은', '나눠 먹기 좋은'],
  '뒷다리족발':   ['쫀득한 껍질 좋은', '식감 좋아하면 가기 좋은', '나눠 먹기 좋은'],
  '반반족발':     ['골고루 즐기는', '나눠 먹기 좋은', '취향 갈릴 때 좋은'],
  '냉채족발':     ['새콤하게 먹기 좋은', '여름에 먹기 좋은', '나눠 먹기 좋은'],
  '불족발':       ['매콤하게 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
  '직화불족발':   ['불맛 좋은', '매콤하게 먹기 좋은', '한잔하기 좋은'],
  '마늘족발':     ['마늘 향 좋은', '고소하게 먹기 좋은', '나눠 먹기 좋은'],
  '보쌈':         ['쌈 싸 먹기 좋은', '나눠 먹기 좋은', '푸짐하게 먹기 좋은'],
  '족발보쌈세트': ['푸짐하게 먹기 좋은', '여럿이 먹기 좋은', '나눠 먹기 좋은'],
  // ★ 순대국 전문점 (SPECIALTY: sundaeguk) — 국물 계열
  '얼큰순대국':     ['속 풀기 좋은', '얼큰하게 먹기 좋은', '해장하기 좋은'],
  '내장순대국':     ['든든하게 먹기 좋은', '내장 좋아하면 가기 좋은', '뜨끈한 국물 좋은'],
  '머리고기순대국': ['고기 든든한', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
  '순대만국':       ['담백하게 먹기 좋은', '부담 없이 먹기 좋은', '혼밥하기 좋은'],
  '내장만국':       ['진하게 먹기 좋은', '내장 좋아하면 가기 좋은', '뜨끈한 국물 좋은'],
  // 순대국 전문점 — 안주·포장 계열
  '순대':           ['쫄깃하게 즐기는', '나눠 먹기 좋은', '포장하기 좋은'],
  '모둠순대':       ['부위별로 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '머리고기':       ['쫄깃하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '내장모둠':       ['부위별로 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '편육':           ['담백하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  // 국물 한식 — 따뜻함·속풀이 결
  '순대국':       ['속 든든한', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
  '해장국':       ['속 풀기 좋은', '뜨끈한 국물 좋은', '아침에 가기 좋은'],
  '칼국수':       ['뜨끈하게 먹기 좋은', '면 좋아하면 가기 좋은', '비 오는 날 가기 좋은'],
  '김치찌개':     ['집밥 같은', '든든하게 먹기 좋은', '혼밥하기 좋은'],
  '냉면':         ['시원하게 먹기 좋은', '여름에 가기 좋은', '빠르게 먹기 좋은'],
  '술국':         ['속 풀기 좋은', '뜨끈한 국물 좋은', '가볍게 한잔하기 좋은'],
  '라면':         ['간단히 먹기 좋은', '혼밥하기 좋은', '야식으로 좋은'],
  // 고기 한식 — 든든·안주 결
  '수육':         ['부드럽게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '머릿고기':     ['쫄깃하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  // 백반
  '기사식당':     ['든든하게 먹기 좋은', '빠르게 먹기 좋은', '집밥 같은'],
  // 분식
  '매콤한 떡볶이':     ['매콤하게 즐기는', '간단히 먹기 좋은', '간식으로 좋은'],
  '매콤 로제 떡볶이':  ['부드럽게 즐기는', '간단히 먹기 좋은', '간식으로 좋은'],
  '참치마요 꼬마김밥': ['간편하게 먹기 좋은', '간식으로 좋은', '포장하기 좋은'],
  '매운어묵 꼬마김밥': ['매콤하게 즐기는', '간식으로 좋은', '포장하기 좋은'],
  '수제 모둠튀김':     ['바삭하게 즐기는', '나눠 먹기 좋은', '간식으로 좋은'],
  '찰순대':           ['쫄깃하게 즐기는', '나눠 먹기 좋은', '간식으로 좋은'],
  '오뎅꼬치':         ['따뜻하게 즐기는', '간단히 먹기 좋은', '간식으로 좋은'],
  // ★ 초밥 전문점 (SPECIALTY: sushi)
  '모둠초밥':   ['골고루 즐기는', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
  '특초밥':     ['특별하게 즐기는', '깔끔하게 먹기 좋은', '기념일에 가기 좋은'],
  '생연어초밥': ['부드럽게 즐기는', '연어 좋아하면 가기 좋은', '깔끔하게 먹기 좋은'],
  '광어초밥':   ['담백하게 즐기는', '쫄깃한 식감 좋은', '깔끔하게 먹기 좋은'],
  '참치초밥':   ['진하게 즐기는', '참치 좋아하면 가기 좋은', '깔끔하게 먹기 좋은'],
  '새우초밥':   ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '장어초밥':   ['고소하게 즐기는', '든든하게 먹기 좋은', '기력 보충하기 좋은'],
  '소고기초밥': ['부드럽게 즐기는', '색다르게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '유부초밥':   ['간편하게 먹기 좋은', '가볍게 먹기 좋은', '포장하기 좋은'],
  '회덮밥':     ['든든하게 먹기 좋은', '깔끔하게 먹기 좋은', '혼밥하기 좋은'],
  // ★ 대게·킹크랩 전문점 (SPECIALTY: crab)
  '대게':         ['푸짐하게 즐기는', '쪄서 먹기 좋은', '가족모임 하기 좋은'],
  '킹크랩':       ['푸짐하게 즐기는', '특별하게 먹기 좋은', '기념일에 가기 좋은'],
  '랍스터':       ['특별하게 먹기 좋은', '기념일에 가기 좋은', '푸짐하게 즐기는'],
  '홍게':         ['부담 없이 즐기는', '나눠 먹기 좋은', '가볍게 먹기 좋은'],
  '박달대게':     ['살이 꽉 찬', '특별하게 먹기 좋은', '푸짐하게 즐기는'],
  '대게코스':     ['골고루 즐기는', '한 상 푸짐한', '여럿이 먹기 좋은'],
  '킹크랩코스':   ['골고루 즐기는', '특별하게 먹기 좋은', '여럿이 먹기 좋은'],
  '대게세트':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  '킹크랩세트':   ['푸짐하게 먹기 좋은', '특별하게 먹기 좋은', '여럿이 먹기 좋은'],
  '모둠세트':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '대게찜':       ['쪄서 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '킹크랩찜':     ['푸짐하게 즐기는', '특별하게 먹기 좋은', '기념일에 가기 좋은'],
  '게딱지볶음밥': ['든든하게 먹기 좋은', '마무리로 좋은', '나눠 먹기 좋은'],
  '게라면':       ['얼큰하게 먹기 좋은', '마무리로 좋은', '간단히 먹기 좋은'],
  '대게탕':       ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  // ★ 횟집 전문점 (SPECIALTY: hoe)
  '모둠회':   ['골고루 즐기는', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '광어회':   ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '우럭회':   ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '참치회':   ['진하게 즐기는', '참치 좋아하면 가기 좋은', '특별하게 먹기 좋은'],
  '연어회':   ['부드럽게 즐기는', '연어 좋아하면 가기 좋은', '깔끔하게 먹기 좋은'],
  '도미회':   ['담백하게 즐기는', '깔끔하게 먹기 좋은', '나눠 먹기 좋은'],
  '농어회':   ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '여름에 먹기 좋은'],
  '방어회':   ['기름지게 즐기는', '겨울에 먹기 좋은', '나눠 먹기 좋은'],
  '참돔회':   ['담백하게 먹기 좋은', '쫄깃하게 즐기는', '깔끔하게 먹기 좋은'],
  '참가자미회': ['쫄깃하게 즐기는', '고소하게 먹기 좋은', '한잔하기 좋은'],
  '회코스':   ['특별하게 즐기는', '골고루 즐기는', '기념일에 가기 좋은'],
  '물회':     ['시원하게 먹기 좋은', '새콤하게 즐기는', '여름에 먹기 좋은'],
  '회덮밥':   ['든든하게 먹기 좋은', '깔끔하게 먹기 좋은', '혼밥하기 좋은'],
  // ★ 아구찜 전문점 (SPECIALTY: agujjim)
  '아구찜':     ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '해물아구찜': ['푸짐하게 즐기는', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '순살아구찜': ['편하게 먹기 좋은', '매콤하게 즐기는', '나눠 먹기 좋은'],
  '매운아구찜': ['얼얼하게 즐기는', '매콤하게 먹기 좋은', '한잔하기 좋은'],
  '아구탕':     ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '아귀수육':   ['담백하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '아귀불고기': ['매콤하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '아귀찜정식': ['든든하게 먹기 좋은', '한 상 푸짐한', '깔끔하게 먹기 좋은'],
  '아귀전골':   ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '해물찜':     ['푸짐하게 즐기는', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  // ★ 찜닭 전문점 (SPECIALTY: jjimdak)
  '안동찜닭':   ['달짝지근하게 즐기는', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '간장찜닭':   ['달짝지근하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '매운찜닭':   ['얼얼하게 즐기는', '매콤하게 먹기 좋은', '한잔하기 좋은'],
  '순살찜닭':   ['편하게 먹기 좋은', '아이와 먹기 좋은', '나눠 먹기 좋은'],
  '치즈찜닭':   ['부드럽게 즐기는', '아이와 먹기 좋은', '나눠 먹기 좋은'],
  '국물찜닭':   ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '마라찜닭':   ['얼얼하게 즐기는', '색다르게 먹기 좋은', '한잔하기 좋은'],
  '찜닭볶음밥': ['마무리로 좋은', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '닭발':       ['얼얼하게 즐기는', '한잔하기 좋은', '야식으로 좋은'],
  '콩나물무침': ['곁들이기 좋은', '아삭하게 즐기는', '가볍게 먹기 좋은'],
  // ★ 닭갈비 전문점 (SPECIALTY: dakgalbi)
  '철판닭갈비': ['볶아 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '숯불닭갈비': ['불맛 좋은', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '양념닭갈비': ['달짝지근하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '매운닭갈비': ['얼얼하게 즐기는', '매콤하게 먹기 좋은', '한잔하기 좋은'],
  '치즈닭갈비': ['부드럽게 즐기는', '아이와 먹기 좋은', '나눠 먹기 좋은'],
  '간장닭갈비': ['담백하게 즐기는', '아이와 먹기 좋은', '나눠 먹기 좋은'],
  '닭목살구이': ['쫄깃하게 즐기는', '구워 먹기 좋은', '한잔하기 좋은'],
  '닭내장볶음': ['쫄깃하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
  '닭갈비정식': ['든든하게 먹기 좋은', '한 상 푸짐한', '나눠 먹기 좋은'],
  '닭갈비세트': ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  // ★ 갈비 전문점 (SPECIALTY: galbi)
  '생갈비':   ['구워 먹기 좋은', '고기 좋아하면 가기 좋은', '나눠 먹기 좋은'],
  '양념갈비': ['달짝지근하게 즐기는', '구워 먹기 좋은', '가족모임 하기 좋은'],
  '돼지갈비': ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '소갈비':   ['특별하게 즐기는', '구워 먹기 좋은', '가족모임 하기 좋은'],
  'LA갈비':   ['달짝지근하게 즐기는', '구워 먹기 좋은', '가족모임 하기 좋은'],
  '왕갈비':   ['푸짐하게 즐기는', '구워 먹기 좋은', '여럿이 먹기 좋은'],
  '이동갈비': ['푸짐하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '갈비정식': ['든든하게 먹기 좋은', '한 상 푸짐한', '가족모임 하기 좋은'],
  '매운갈비찜': ['얼얼하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '갈비탕':   ['뜨끈한 국물 좋은', '든든하게 먹기 좋은', '혼밥하기 좋은'],
  // ★ 소고기 전문점 (SPECIALTY: beef)
  '꽃등심':   ['구워 먹기 좋은', '특별하게 즐기는', '가족모임 하기 좋은'],
  '등심':     ['구워 먹기 좋은', '담백하게 즐기는', '나눠 먹기 좋은'],
  '안심':     ['부드럽게 즐기는', '구워 먹기 좋은', '특별하게 먹기 좋은'],
  '갈비살':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '살치살':   ['고소하게 즐기는', '구워 먹기 좋은', '특별하게 먹기 좋은'],
  '안창살':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '한잔하기 좋은'],
  '토시살':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '한잔하기 좋은'],
  '부채살':   ['부드럽게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '차돌박이': ['얇게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '육회':     ['신선하게 즐기는', '색다르게 먹기 좋은', '한잔하기 좋은'],
  // ★ 양고기 전문점 (SPECIALTY: lamb)
  '양갈비':     ['구워 먹기 좋은', '특별하게 즐기는', '나눠 먹기 좋은'],
  '프렌치랙':   ['특별하게 즐기는', '구워 먹기 좋은', '기념일에 가기 좋은'],
  '양등심':     ['부드럽게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '양어깨살':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '양꼬치':     ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
  '양갈비살':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '한잔하기 좋은'],
  '양갈비정식': ['든든하게 먹기 좋은', '한 상 푸짐한', '가족모임 하기 좋은'],
  '양전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '양수육':     ['담백하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '모둠양고기': ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  // ★ 생선구이 전문점 (SPECIALTY: grilledfish)
  '고등어구이':   ['든든하게 먹기 좋은', '집밥처럼 먹기 좋은', '혼밥하기 좋은'],
  '삼치구이':     ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '혼밥하기 좋은'],
  '임연수구이':   ['고소하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '갈치구이':     ['살 발라 먹기 좋은', '든든하게 먹기 좋은', '가족모임 하기 좋은'],
  '꽁치구이':     ['고소하게 먹기 좋은', '집밥처럼 먹기 좋은', '혼밥하기 좋은'],
  '조기구이':     ['담백하게 먹기 좋은', '집밥처럼 먹기 좋은', '가족모임 하기 좋은'],
  '가자미구이':   ['바삭하게 먹기 좋은', '담백하게 먹기 좋은', '혼밥하기 좋은'],
  '열기구이':     ['살 발라 먹기 좋은', '담백하게 먹기 좋은', '혼밥하기 좋은'],
  '코다리구이':   ['쫄깃하게 먹기 좋은', '든든하게 먹기 좋은', '한잔하기 좋은'],
  '장어구이':     ['몸보신하기 좋은', '구워 먹기 좋은', '기력 보충하기 좋은'],
  '모둠생선구이': ['골고루 즐기는', '푸짐하게 먹기 좋은', '가족모임 하기 좋은'],
  '생선구이정식': ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  // ★ 해물탕 전문점 (SPECIALTY: seafoodtang)
  '해물탕':     ['얼큰하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '해물찜':     ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '아귀해물찜': ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '해물전골':   ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '해신탕':     ['몸보신하기 좋은', '푸짐하게 먹기 좋은', '가족모임 하기 좋은'],
  '꽃게탕':     ['시원하게 먹기 좋은', '얼큰하게 먹기 좋은', '나눠 먹기 좋은'],
  '낙지해물탕': ['얼큰하게 먹기 좋은', '쫄깃하게 즐기는', '나눠 먹기 좋은'],
  '조개해물탕': ['시원하게 먹기 좋은', '깔끔하게 먹기 좋은', '나눠 먹기 좋은'],
  '문어해물탕': ['쫄깃하게 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '섞어찜':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '해물스페셜': ['푸짐하게 먹기 좋은', '골고루 즐기는', '가족모임 하기 좋은'],
  '해물탕정식': ['한 상 푸짐한', '든든하게 먹기 좋은', '가족모임 하기 좋은'],
  // ★ 대구탕 전문점 (SPECIALTY: daegutang)
  '대구탕':     ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '맑은대구탕': ['깔끔하게 먹기 좋은', '시원하게 먹기 좋은', '담백하게 먹기 좋은'],
  '얼큰대구탕': ['얼큰하게 먹기 좋은', '속 풀기 좋은', '해장하기 좋은'],
  '대구지리':   ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '대구전골':   ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '대구찜':     ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '대구뽈찜':   ['쫄깃하게 즐기는', '매콤하게 즐기는', '한잔하기 좋은'],
  '대구뽈탕':   ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '대구튀김':   ['바삭하게 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '대구불고기': ['매콤하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '대구정식':   ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '대구스페셜': ['푸짐하게 먹기 좋은', '골고루 즐기는', '가족모임 하기 좋은'],
  // ★ 복집 전문점 (SPECIALTY: bokjip)
  '복국':       ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '복지리':     ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '복매운탕':   ['얼큰하게 먹기 좋은', '속 풀기 좋은', '해장하기 좋은'],
  '복불고기':   ['매콤하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '복찜':       ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '복수육':     ['담백하게 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '복튀김':     ['바삭하게 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '복샤브샤브': ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
  '복전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '복정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '참복지리':   ['깔끔하게 먹기 좋은', '담백하게 먹기 좋은', '특별하게 즐기는'],
  '은복지리':   ['깔끔하게 먹기 좋은', '담백하게 먹기 좋은', '시원하게 먹기 좋은'],
  '복코스':     ['특별하게 즐기는', '골고루 즐기는', '기념일에 가기 좋은'],
  // ★ 장어 전문점 (SPECIALTY: eel)
  '민물장어구이': ['몸보신하기 좋은', '구워 먹기 좋은', '기력 보충하기 좋은'],
  '바다장어구이': ['고소하게 먹기 좋은', '구워 먹기 좋은', '한잔하기 좋은'],
  '소금구이':     ['담백하게 먹기 좋은', '구워 먹기 좋은', '기력 보충하기 좋은'],
  '양념구이':     ['달짝지근하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '간장구이':     ['짭짤하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '장어덮밥':     ['든든하게 먹기 좋은', '혼밥하기 좋은', '간단하게 먹기 좋은'],
  '장어탕':       ['몸보신하기 좋은', '뜨끈한 국물 좋은', '기력 보충하기 좋은'],
  '장어정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '가족모임 하기 좋은'],
  '장어코스':     ['특별하게 즐기는', '골고루 즐기는', '기념일에 가기 좋은'],
  '장어구이 한판': ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '장어스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  '장어샤브샤브': ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '몸보신하기 좋은'],
  // ★ 조개구이 전문점 (SPECIALTY: shellfish · 구이+찜 통합)
  '조개구이':     ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '모둠조개구이': ['골고루 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '키조개구이':   ['쫄깃하게 즐기는', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '가리비구이':   ['고소하게 먹기 좋은', '구워 먹기 좋은', '나눠 먹기 좋은'],
  '전복구이':     ['특별하게 즐기는', '몸보신하기 좋은', '구워 먹기 좋은'],
  '조개찜':       ['시원하게 먹기 좋은', '담백하게 먹기 좋은', '나눠 먹기 좋은'],
  '모둠조개찜':   ['골고루 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '조개전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '조개탕':       ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '해물조개구이': ['푸짐하게 먹기 좋은', '골고루 즐기는', '나눠 먹기 좋은'],
  '조개구이세트': ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '조개스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  // ★ 코다리 전문점 (SPECIALTY: codari) — '코다리구이'는 생선구이 계열에 기존 존재(공용)
  '코다리조림':     ['매콤하게 즐기는', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '시래기코다리조림': ['구수하게 즐기는', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '매운코다리조림': ['얼얼하게 즐기는', '든든하게 먹기 좋은', '한잔하기 좋은'],
  '코다리정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '코다리찜':       ['매콤하게 즐기는', '나눠 먹기 좋은', '든든하게 먹기 좋은'],
  '코다리전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '코다리냉면':     ['시원하게 먹기 좋은', '쫄깃하게 즐기는', '여름에 먹기 좋은'],
  '코다리물냉면':   ['시원하게 먹기 좋은', '깔끔하게 먹기 좋은', '여름에 먹기 좋은'],
  '코다리비빔냉면': ['매콤하게 즐기는', '쫄깃하게 즐기는', '여름에 먹기 좋은'],
  '코다리세트':     ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '골고루 즐기는'],
  '코다리스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  // ★ 쭈꾸미 전문점 (SPECIALTY: jjukkumi)
  '쭈꾸미볶음':     ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
  '직화쭈꾸미':     ['불맛 좋은', '매콤하게 즐기는', '한잔하기 좋은'],
  '철판쭈꾸미':     ['볶아 먹기 좋은', '매콤하게 즐기는', '나눠 먹기 좋은'],
  '쭈삼(쭈꾸미삼겹살)': ['골고루 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '쭈차(쭈꾸미차돌박이)': ['골고루 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '쭈새(쭈꾸미새우)': ['골고루 즐기는', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '쭈꾸미정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '쭈꾸미세트':     ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '골고루 즐기는'],
  '쭈꾸미전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '쭈꾸미샤브샤브': ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
  '산쭈꾸미':       ['쫄깃하게 즐기는', '신선하게 즐기는', '한잔하기 좋은'],
  '쭈꾸미스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  // ★ 낙지 전문점 (SPECIALTY: nakji)
  '낙지볶음':     ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
  '직화낙지볶음': ['불맛 좋은', '매콤하게 즐기는', '한잔하기 좋은'],
  '철판낙지볶음': ['볶아 먹기 좋은', '매콤하게 즐기는', '나눠 먹기 좋은'],
  '산낙지':       ['쫄깃하게 즐기는', '신선하게 즐기는', '한잔하기 좋은'],
  '연포탕':       ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '몸보신하기 좋은'],
  '낙지전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '낙지탕탕이':   ['쫄깃하게 즐기는', '신선하게 즐기는', '한잔하기 좋은'],
  '낙곱새':       ['골고루 즐기는', '매콤하게 즐기는', '한잔하기 좋은'],
  '낙삼(낙지삼겹살)': ['골고루 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '낙지정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '낙지세트':     ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '골고루 즐기는'],
  '낙지스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  // ★ 물회 전문점 (SPECIALTY: mulhoe) — '물회'·'회덮밥'은 hoe 계열에 기존 존재(공용)
  '특물회':       ['푸짐하게 먹기 좋은', '시원하게 먹기 좋은', '골고루 즐기는'],
  '참가자미물회': ['쫄깃하게 즐기는', '시원하게 먹기 좋은', '새콤하게 먹기 좋은'],
  '광어물회':     ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],
  '오징어물회':   ['쫄깃하게 즐기는', '시원하게 먹기 좋은', '새콤하게 먹기 좋은'],
  '전복물회':     ['특별하게 즐기는', '시원하게 먹기 좋은', '몸보신하기 좋은'],
  '해삼물회':     ['쫄깃하게 즐기는', '시원하게 먹기 좋은', '특별하게 즐기는'],
  '멍게물회':     ['향긋하게 즐기는', '시원하게 먹기 좋은', '새콤하게 먹기 좋은'],
  '물회정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '시원하게 먹기 좋은'],
  '물회세트':     ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '골고루 즐기는'],
  '물회스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],
  // ★ 문어 전문점 (SPECIALTY: muneo)
  '문어숙회':     ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '한잔하기 좋은'],
  '문어삼합':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '돌문어숙회':   ['쫄깃하게 즐기는', '특별하게 즐기는', '한잔하기 좋은'],
  '문어볶음':     ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
  '문어전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '문어샤브샤브': ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
  '문어연포탕':   ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '몸보신하기 좋은'],
  '문어물회':     ['쫄깃하게 즐기는', '시원하게 먹기 좋은', '새콤하게 먹기 좋은'],
  '문어초회':     ['새콤하게 먹기 좋은', '쫄깃하게 즐기는', '한잔하기 좋은'],
  '문어정식':     ['한 상 푸짐한', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '문어세트':     ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '골고루 즐기는'],
  '문어스페셜':   ['푸짐하게 먹기 좋은', '골고루 즐기는', '특별하게 즐기는'],

  // ★ 게장 전문점 (SPECIALTY: gejang)
  //   '꽃게탕'은 기존 SCENE 값 재사용 — 중복 삽입 금지(기존값 유지)
  '간장게장':     ['밥도둑으로 좋은', '짭짤하게 즐기는', '든든하게 먹기 좋은'],
  '양념게장':     ['매콤하게 즐기는', '밥도둑으로 좋은', '든든하게 먹기 좋은'],
  '꽃게장':       ['밥도둑으로 좋은', '짭짤하게 즐기는', '든든하게 먹기 좋은'],
  '암꽃게장':     ['알이 꽉 찬', '밥도둑으로 좋은', '특별하게 즐기는'],
  '숫꽃게장':     ['살이 실한', '밥도둑으로 좋은', '든든하게 먹기 좋은'],
  '간장새우장':   ['밥도둑으로 좋은', '짭짤하게 즐기는', '한 점씩 즐기는'],
  '양념새우장':   ['매콤하게 즐기는', '밥도둑으로 좋은', '한 점씩 즐기는'],
  '전복장':       ['쫄깃하게 즐기는', '귀하게 먹기 좋은', '밥도둑으로 좋은'],
  '모둠장':       ['골고루 즐기는', '밥도둑으로 좋은', '푸짐하게 먹기 좋은'],
  '게장정식':     ['한 상 푸짐한', '밥도둑으로 좋은', '든든하게 먹기 좋은'],
  '간장게장정식': ['한 상 푸짐한', '밥도둑으로 좋은', '집밥처럼 먹기 좋은'],
  '양념게장정식': ['한 상 푸짐한', '매콤하게 즐기는', '든든하게 먹기 좋은'],
  '반반게장정식': ['골고루 즐기는', '밥도둑으로 좋은', '한 상 푸짐한'],

  // ★ 전 전문점 (SPECIALTY: jeon)
  '모둠전':       ['골고루 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
  '해물파전':     ['바삭하게 즐기는', '비 오는 날 좋은', '한잔하기 좋은'],
  '김치전':       ['바삭하게 즐기는', '얼큰하게 먹기 좋은', '한잔하기 좋은'],
  '감자전':       ['쫄깃하게 즐기는', '고소하게 먹기 좋은', '간식으로 좋은'],
  '녹두전':       ['바삭하게 즐기는', '든든하게 먹기 좋은', '한잔하기 좋은'],
  '육전':         ['부드럽게 즐기는', '고소하게 먹기 좋은', '한잔하기 좋은'],
  '동태전':       ['담백하게 먹기 좋은', '부드럽게 즐기는', '한잔하기 좋은'],
  '굴전':         ['담백하게 먹기 좋은', '고소하게 먹기 좋은', '제철에 좋은'],
  '버섯전':       ['담백하게 먹기 좋은', '가볍게 먹기 좋은', '한잔하기 좋은'],
  '호박전':       ['담백하게 먹기 좋은', '가볍게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '깻잎전':       ['향긋하게 즐기는', '가볍게 먹기 좋은', '한잔하기 좋은'],
  '꼬치전':       ['골고루 즐기는', '한 점씩 즐기는', '한잔하기 좋은'],
  '배추전':       ['담백하게 먹기 좋은', '고소하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '고추전':       ['알싸하게 즐기는', '가볍게 먹기 좋은', '한잔하기 좋은'],

  // ★ 닭한마리 전문점 (SPECIALTY: dakhanmari)
  '닭한마리':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '몸보신하기 좋은'],
  '얼큰닭한마리': ['얼큰하게 먹기 좋은', '뜨끈하게 먹기 좋은', '해장하기 좋은'],
  '한방닭한마리': ['든든하게 먹기 좋은', '몸보신하기 좋은', '뜨끈하게 먹기 좋은'],
  '능이버섯닭한마리': ['향긋하게 즐기는', '몸보신하기 좋은', '귀하게 먹기 좋은'],
  '묵은지닭한마리': ['깊은 맛 나는', '뜨끈하게 먹기 좋은', '든든하게 먹기 좋은'],
  '해물닭한마리': ['시원하게 먹기 좋은', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '닭볶음탕':     ['매콤하게 즐기는', '푸짐하게 먹기 좋은', '가족모임 하기 좋은'],
  '닭도리탕':     ['매콤하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '닭매운탕':     ['얼큰하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '닭칼국수':     ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '마무리로 좋은'],
  '닭죽':         ['든든하게 먹기 좋은', '속 편하게 먹기 좋은', '마무리로 좋은'],
  '닭한마리세트': ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  '칼국수사리':   ['든든하게 먹기 좋은', '마무리로 좋은', '나눠 먹기 좋은'],
  '떡사리':       ['쫄깃하게 즐기는', '든든하게 먹기 좋은', '나눠 먹기 좋은'],
  '버섯사리':     ['향긋하게 즐기는', '가볍게 먹기 좋은', '나눠 먹기 좋은'],
  '죽':           ['속 편하게 먹기 좋은', '마무리로 좋은', '든든하게 먹기 좋은'],

  // ★ 백숙 전문점 (SPECIALTY: baeksuk)
  //   '닭볶음탕'·'죽'·'칼국수사리'는 기존 SCENE 값 재사용 — 중복 삽입 금지(기존값 유지)
  '토종닭백숙':   ['뜨끈하게 먹기 좋은', '몸보신하기 좋은', '든든하게 먹기 좋은'],
  '한방백숙':     ['몸보신하기 좋은', '든든하게 먹기 좋은', '뜨끈하게 먹기 좋은'],
  '능이버섯백숙': ['향긋하게 즐기는', '귀하게 먹기 좋은', '몸보신하기 좋은'],
  '누룽지백숙':   ['든든하게 먹기 좋은', '구수하게 먹기 좋은', '몸보신하기 좋은'],
  '옻백숙':       ['몸보신하기 좋은', '귀하게 먹기 좋은', '든든하게 먹기 좋은'],
  '오리백숙':     ['담백하게 먹기 좋은', '몸보신하기 좋은', '든든하게 먹기 좋은'],
  '한방오리백숙': ['몸보신하기 좋은', '담백하게 먹기 좋은', '든든하게 먹기 좋은'],
  '능이버섯오리백숙': ['향긋하게 즐기는', '귀하게 먹기 좋은', '몸보신하기 좋은'],
  '오리누룽지백숙': ['든든하게 먹기 좋은', '구수하게 먹기 좋은', '담백하게 먹기 좋은'],
  '오리주물럭':   ['매콤하게 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '백숙세트':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  '누룽지':       ['구수하게 먹기 좋은', '마무리로 좋은', '속 편하게 먹기 좋은'],

  // ★ 오리 전문점 (SPECIALTY: duck)
  //   '오리주물럭'·'오리백숙'·'한방오리백숙'·'능이버섯오리백숙'·'죽'·'칼국수사리'는 기존 SCENE 재사용 — 중복 삽입 금지
  '오리로스':     ['담백하게 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '생오리로스':   ['담백하게 먹기 좋은', '신선하게 즐기는', '나눠 먹기 좋은'],
  '훈제오리':     ['담백하게 먹기 좋은', '가볍게 먹기 좋은', '한잔하기 좋은'],
  '오리불고기':   ['달큰하게 즐기는', '푸짐하게 먹기 좋은', '가족모임 하기 좋은'],
  '오리양념구이': ['매콤하게 즐기는', '푸짐하게 먹기 좋은', '한잔하기 좋은'],
  '오리소금구이': ['담백하게 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
  '오리탕':       ['얼큰하게 먹기 좋은', '뜨끈한 국물 좋은', '몸보신하기 좋은'],
  '오리세트':     ['골고루 즐기는', '푸짐하게 먹기 좋은', '여럿이 먹기 좋은'],
  '볶음밥':       ['든든하게 먹기 좋은', '마무리로 좋은', '나눠 먹기 좋은'],

  // ★ 보리밥 전문점 (SPECIALTY: boribap)
  //   '고등어구이'·'누룽지'는 기존 SCENE 재사용 — 중복 삽입 금지
  '보리밥':       ['건강하게 먹기 좋은', '집밥처럼 먹기 좋은', '속 편하게 먹기 좋은'],
  '보리비빔밥':   ['건강하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '산채보리밥':   ['건강하게 먹기 좋은', '향긋하게 즐기는', '집밥처럼 먹기 좋은'],
  '열무보리밥':   ['시원하게 먹기 좋은', '건강하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '강된장보리밥': ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '돌솥보리밥':   ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '건강하게 먹기 좋은'],
  '보리밥정식':   ['한 상 푸짐한', '건강하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '산채정식':     ['한 상 푸짐한', '향긋하게 즐기는', '건강하게 먹기 좋은'],
  '강된장':       ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '청국장':       ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '속 편하게 먹기 좋은'],
  '된장찌개':     ['구수하게 먹기 좋은', '집밥처럼 먹기 좋은', '든든하게 먹기 좋은'],
  '제육볶음':     ['매콤하게 즐기는', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '황태구이':     ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '해장하기 좋은'],
  '솥밥':         ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],

  // ★ 청국장 전문점 (SPECIALTY: cheonggukjang)
  //   '청국장'·'강된장'·'된장찌개'·'제육볶음'·'고등어구이'·'보리밥'·'누룽지'는 기존 SCENE 재사용 — 중복 삽입 금지
  '우렁청국장':   ['구수하게 먹기 좋은', '쫄깃하게 즐기는', '든든하게 먹기 좋은'],
  '소고기청국장': ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '진하게 먹기 좋은'],
  '해물청국장':   ['시원하게 먹기 좋은', '구수하게 먹기 좋은', '든든하게 먹기 좋은'],
  '버섯청국장':   ['향긋하게 즐기는', '구수하게 먹기 좋은', '담백하게 먹기 좋은'],
  '차돌청국장':   ['진하게 먹기 좋은', '구수하게 먹기 좋은', '든든하게 먹기 좋은'],
  '청국장정식':   ['한 상 푸짐한', '구수하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '청국장보리밥': ['건강하게 먹기 좋은', '구수하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '돌솥밥':       ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],

  // ★ 두부 전문점 (SPECIALTY: dubu)
  //   '청국장'·'된장찌개'는 기존 SCENE 재사용 — 중복 삽입 금지
  '순두부':       ['뜨끈하게 먹기 좋은', '얼큰하게 먹기 좋은', '속 편하게 먹기 좋은'],
  '모두부':       ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '두부전골':     ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
  '두부김치':     ['따뜻하게 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
  '두부보쌈':     ['담백하게 먹기 좋은', '푸짐하게 먹기 좋은', '나눠 먹기 좋은'],
  '두부버섯전골': ['향긋하게 즐기는', '뜨끈하게 먹기 좋은', '나눠 먹기 좋은'],
  '콩비지':       ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '속 편하게 먹기 좋은'],
  '비지찌개':     ['구수하게 먹기 좋은', '뜨끈하게 먹기 좋은', '든든하게 먹기 좋은'],
  '두부정식':     ['한 상 푸짐한', '담백하게 먹기 좋은', '집밥처럼 먹기 좋은'],
  '순두부정식':   ['한 상 푸짐한', '뜨끈하게 먹기 좋은', '집밥처럼 먹기 좋은'],

  // ★ 콩나물국밥 전문점 (SPECIALTY: kongnamulgukbap)
  //   '콩나물국밥'은 기존 SCENE 재사용 — 중복 삽입 금지
  '전주콩나물국밥': ['시원하게 먹기 좋은', '해장하기 좋은', '뜨끈하게 먹기 좋은'],
  '황태콩나물국밥': ['시원하게 먹기 좋은', '해장하기 좋은', '담백하게 먹기 좋은'],
  '얼큰콩나물국밥': ['얼큰하게 먹기 좋은', '해장하기 좋은', '뜨끈한 국물 좋은'],
  '김치콩나물국밥': ['얼큰하게 먹기 좋은', '시원하게 먹기 좋은', '해장하기 좋은'],
  '오징어콩나물국밥': ['시원하게 먹기 좋은', '쫄깃하게 즐기는', '해장하기 좋은'],
  '황태해장국':   ['담백하게 먹기 좋은', '해장하기 좋은', '뜨끈한 국물 좋은'],
  '선지해장국':   ['얼큰하게 먹기 좋은', '해장하기 좋은', '든든하게 먹기 좋은'],
  '콩나물해장국': ['시원하게 먹기 좋은', '해장하기 좋은', '뜨끈하게 먹기 좋은'],
  '콩나물정식':   ['한 상 푸짐한', '시원하게 먹기 좋은', '집밥처럼 먹기 좋은'],

  // ★ 육개장 전문점 (SPECIALTY: yukgaejang)
  '육개장':       ['얼큰하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
  '전통육개장':   ['얼큰하게 먹기 좋은', '진하게 먹기 좋은', '든든하게 먹기 좋은'],
  '얼큰육개장':   ['얼큰하게 먹기 좋은', '땀 빼기 좋은', '해장하기 좋은'],
  '특육개장':     ['푸짐하게 먹기 좋은', '진하게 먹기 좋은', '든든하게 먹기 좋은'],
  '한우육개장':   ['진하게 먹기 좋은', '든든하게 먹기 좋은', '깊은 국물 좋은'],
  '육칼국수':     ['얼큰하게 먹기 좋은', '뜨끈하게 먹기 좋은', '든든하게 먹기 좋은'],
  '육개장칼국수': ['얼큰하게 먹기 좋은', '뜨끈하게 먹기 좋은', '든든하게 먹기 좋은'],
  '육개장만두국': ['얼큰하게 먹기 좋은', '뜨끈하게 먹기 좋은', '나눠 먹기 좋은'],
  '사골육개장':   ['진하게 먹기 좋은', '깊은 국물 좋은', '든든하게 먹기 좋은'],
  '육개전골':     ['얼큰하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
};

// 카테고리 폴백 (TITLE_SCENE[menu] 미매칭 시) — cat 값 기준. ★ [철학 v2] 선택이유형.
export const RESTAURANT_TITLE_SCENE_BY_CATEGORY = {
  '분식': ['간단히 먹기 좋은', '간식으로 좋은', '나눠 먹기 좋은'],
  '한식': ['든든하게 먹기 좋은', '편하게 먹기 좋은', '한 끼 하기 좋은'],
  '순대국': ['속 든든한', '뜨끈한 국물 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY.titleSceneByCat 정합)
  '국밥': ['든든하게 먹기 좋은', '뜨끈한 국물 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY: gukbap)
  '족발': ['나눠 먹기 좋은', '포장하기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: jokbal)
  '감자탕': ['뼈째 우려낸', '뜨끈한 국물 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: gamjatang)
  '해장국': ['속 풀리는', '뜨끈한 국물 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY: haejangguk)
  '삼계탕': ['든든한 보양', '뜨끈한 국물 좋은', '몸보신하기 좋은'],  // ★ 전문점 (SPECIALTY: samgyetang)
  '국수': ['후루룩 넘기기 좋은', '간단하게 먹기 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY: guksu)
  '쌀국수': ['따뜻하게 먹기 좋은', '깔끔하게 먹기 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY: ricenoodle)
  '양꼬치': ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: yangkkochi)
  '냉면': ['시원하게 먹기 좋은', '깔끔하게 먹기 좋은', '여름에 먹기 좋은'],  // ★ 전문점 (SPECIALTY: naengmyeon)
  '돈까스': ['바삭하게 먹기 좋은', '든든하게 먹기 좋은', '혼밥하기 좋은'],  // ★ 전문점 (SPECIALTY: donkatsu)
  '칼국수': ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '비 오는 날 좋은'],  // ★ 전문점 (SPECIALTY: kalguksu)
  '샤브샤브': ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: shabu)
  '오리': ['담백하게 먹기 좋은', '몸보신하기 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: duck)
  '장어': ['몸보신하기 좋은', '구워 먹기 좋은', '기력 보충하기 좋은'],  // ★ 전문점 (SPECIALTY: eel)
  '곱창·막창': ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: gopchang)
  '초밥': ['깔끔하게 먹기 좋은', '신선하게 즐기는', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: sushi)
  '대게·킹크랩': ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],  // ★ 전문점 (SPECIALTY: crab)
  '횟집': ['신선하게 즐기는', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: hoe)
  '아구찜': ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: agujjim)
  '찜닭': ['나눠 먹기 좋은', '든든하게 먹기 좋은', '가족모임 하기 좋은'],  // ★ 전문점 (SPECIALTY: jjimdak)
  '닭갈비': ['볶아 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: dakgalbi)
  '갈비': ['구워 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],  // ★ 전문점 (SPECIALTY: galbi)
  '소고기': ['구워 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],  // ★ 전문점 (SPECIALTY: beef)
  '양고기': ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: lamb)
  '생선구이': ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],  // ★ 전문점 (SPECIALTY: grilledfish)
  '해물탕': ['얼큰하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],  // ★ 전문점 (SPECIALTY: seafoodtang)
  '대구탕': ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],  // ★ 전문점 (SPECIALTY: daegutang)
  '복집': ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: bokjip)
  '조개구이': ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: shellfish)
  '코다리': ['매콤하게 즐기는', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],  // ★ 전문점 (SPECIALTY: codari)
  '쭈꾸미': ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: jjukkumi)
  '낙지': ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],  // ★ 전문점 (SPECIALTY: nakji)
  '물회': ['시원하게 먹기 좋은', '새콤하게 먹기 좋은', '여름에 먹기 좋은'],  // ★ 전문점 (SPECIALTY: mulhoe)
  '문어': ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: muneo)
  '게장': ['밥도둑으로 좋은', '짭짤하게 즐기는', '든든하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: gejang)
  '전': ['바삭하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],  // ★ 전문점 (SPECIALTY: jeon)
  '닭한마리': ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '몸보신하기 좋은'],  // ★ 전문점 (SPECIALTY: dakhanmari)
  '백숙': ['뜨끈하게 먹기 좋은', '몸보신하기 좋은', '든든하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: baeksuk)
  '보리밥': ['건강하게 먹기 좋은', '집밥처럼 먹기 좋은', '속 편하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: boribap)
  '청국장': ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],  // ★ 전문점 (SPECIALTY: cheonggukjang)
  '두부': ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],  // ★ 전문점 (SPECIALTY: dubu)
  '콩나물국밥': ['시원하게 먹기 좋은', '해장하기 좋은', '뜨끈하게 먹기 좋은'],  // ★ 전문점 (SPECIALTY: kongnamulgukbap)
  '육개장': ['얼큰하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],  // ★ 전문점 (SPECIALTY: yukgaejang)
};


// ════════════════════════════════════════════════════════════════════
// ★ SPECIALTY 레지스트리 (전문점 단위 전환 · 2026-07-05~)
// ────────────────────────────────────────────────────────────────────
// 목적: 음식점을 "한식/양식" 대분류가 아니라 전문점(순대국·국밥·족발…) 단위로 구성.
//   사용자는 "나는 순대국집"을 선택 → category = 전문점.
//
// 설계 원칙 (사용자 확정):
//   1. Restaurant 엔진은 하나만 유지. 전문점은 SPECIALTY 데이터만 추가.
//   2. 새 전문점 추가 = 코드 수정 없이 이 레지스트리에 객체 1개 push.
//   3. 모든 전문점이 동일 구조(스키마)를 공유 → category만 바뀜.
//   4. 기존 한식/분식 카드(RESTAURANT_TREATMENTS)는 삭제하지 않음(하위호환).
//   5. 검증(순대국) 통과 후 lib/restaurantSpine.js로 분리 → FREEZE.
//
// ★★ 확정 스키마 (SCHEMA-LOCK · 이 필드 구조는 앞으로 변경하지 않음) ★★
//   추가되는 모든 전문점은 반드시 아래 12필드 구조를 그대로 사용한다.
//   id              : 전문점 식별자 (영문 슬러그)
//   name            : 전문점 표시명 (= category, 본문/UI 노출명)
//   category        : 전문점 카테고리 (RESTAURANT_CATS와 1:1 정합, = name)
//   menus           : 표준 메뉴셋 { representative:[], side:[] }
//                     (공기밥·주류·음료 제외 / 전국 공통 메뉴만 / 반복 발견 시 즉시 보강)
//   representative  : 대표 메뉴(간판) 배열 — menus.representative의 요약 참조
//   directions      : 방향/감성 참조. 'MENU_BASE_DIRECTION' = 메뉴별 감성맵 재사용.
//   titleSearchword : 제목 끝 검색어 풀 (RESTAURANT_TITLE_SEARCHWORD[category] 역할)
//   titleScene      : 카테고리 폴백 SCENE (RESTAURANT_TITLE_SCENE_BY_CATEGORY[category] 역할)
//   photoPolicyRef  : photoPolicyRegistry 슬롯 참조 키 ('RESTAURANT' 공통 5슬롯)
//   prompts         : prompts 참조. 'restaurant' = restaurant-prompts 공통 사용.
//   information      : 정보블럭 참조. 'restaurant' = 공통 renderInfoBlocks 사용.
//   enabled         : catalog 노출 (관측 전 false — SOP PATCH-05/08)
//   status          : 'dev'(관측 전) | 'observing' | 'freeze'
//   genericName/altGenericNames/emoji : placeholder·표시 보조(본문 매장명 대체)
// ════════════════════════════════════════════════════════════════════
export const RESTAURANT_SPECIALTY = [
  // ─── 전문점: 중식 (중식당 · 짜장면·짬뽕·탕수육·군만두 검증 대상) ───
  //   감자탕 동형 · 대표메뉴는 MENU_BASE_DIRECTION full축 보유(폴백 탈출)
  //   볶음밥은 공용 side 키충돌 회피 위해 이번 범위 제외(별도 축)
  {
    id: 'chinese',
    name: '중식',
    category: '중식',              // = name (RESTAURANT_CATS 정합)
    genericName: '중식당',
    altGenericNames: ['중국집', '식당', '가게'],
    emoji: '🥢',
    menus: {
      representative: [
        '짜장면', '짬뽕', '간짜장', '삼선짜장', '삼선짬뽕',
        '탕수육', '깐풍기', '유린기', '군만두', '볶음밥',
      ],
      side: [
        '군만두', '물만두', '공기밥', '꽃빵',
      ],
    },
    representative: ['짜장면', '짬뽕', '탕수육'],  // 간판 메뉴 요약
    directions: 'MENU_BASE_DIRECTION',        // 메뉴별 감성맵 재사용
    titleSearchword: ['맛집', '중식당', '중국집', '식당', '노포'],
    titleScene: ['한 끼 든든한', '나눠 먹기 좋은', '간편하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',             // 공통 5슬롯 (photoPolicyRegistry SoT)
    prompts: 'restaurant',                    // restaurant-prompts 공통
    information: 'restaurant',                // 공통 renderInfoBlocks
    enabled: false,
    status: 'dev',
  },

  // ─── 전문점 #1: 순대국 (첫 등록 · 검증 대상) ───
  {
    id: 'sundaeguk',
    name: '순대국',
    category: '순대국',              // = name (RESTAURANT_CATS 정합)
    genericName: '순대국집',
    altGenericNames: ['국밥집', '식당', '가게'],
    emoji: '🍲',
    // 표준 메뉴셋 — 전국 공통 (공기밥·주류·음료 제외)
    menus: {
      representative: [
        '순대국', '얼큰순대국', '내장순대국', '머리고기순대국',
        '순대만국', '내장만국', '술국',
      ],
      side: [
        '순대', '모둠순대', '머리고기', '내장모둠', '수육', '편육',
      ],
    },
    representative: ['순대국', '얼큰순대국', '내장순대국'],  // 간판 메뉴 요약
    directions: 'MENU_BASE_DIRECTION',        // 메뉴별 감성맵 재사용
    titleSearchword: ['맛집', '순대국집', '국밥집', '식당', '노포'],
    titleScene: ['속 든든한', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',             // 공통 5슬롯 (photoPolicyRegistry SoT)
    prompts: 'restaurant',                    // restaurant-prompts 공통
    information: 'restaurant',                // 공통 renderInfoBlocks
    enabled: false,
    status: 'dev',
  },

  // ─── 확장 대기열 (동일 스키마로 데이터만 추가) ───
  // { id:'gukbap', name:'국밥', category:'국밥', ... },
  {
    id: 'gukbap',
    name: '국밥',
    category: '국밥',
    genericName: '국밥집',
    altGenericNames: ['식당', '가게'],
    emoji: '🍚',
    menus: {
      representative: [
        '돼지국밥', '순대국밥', '내장국밥', '섞어국밥', '수육국밥',
        '소머리국밥', '얼큰국밥', '콩나물국밥', '선지국밥', '황태국밥',
      ],
      side: [
        '수육', '모둠수육', '편육', '술국', '머리고기', '내장모둠',
      ],
    },
    representative: ['돼지국밥', '순대국밥', '섞어국밥'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '국밥집', '식당', '노포', '집밥'],
    titleScene: ['든든하게 먹기 좋은', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'jokbal',
    name: '족발',
    category: '족발',
    genericName: '족발집',
    altGenericNames: ['식당', '가게'],
    emoji: '🐷',
    menus: {
      representative: [
        '족발', '앞다리족발', '뒷다리족발', '반반족발', '냉채족발',
        '불족발', '직화불족발', '마늘족발', '보쌈', '족발보쌈세트',
      ],
      side: [],
    },
    representative: ['족발', '반반족발', '불족발'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '족발집', '식당', '노포', '포장'],
    titleScene: ['나눠 먹기 좋은', '포장하기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  // { id:'jokbal', name:'족발', category:'족발', ... },
  {
    id: 'gamjatang',
    name: '감자탕',
    category: '감자탕',
    genericName: '감자탕집',
    altGenericNames: ['뼈해장국집', '식당', '가게'],
    emoji: '🥘',
    menus: {
      representative: [
        '감자탕', '뼈해장국', '묵은지감자탕', '우거지감자탕', '등뼈찜',
        '매운등뼈찜', '등뼈전골', '감자탕정식', '뼈구이', '해물감자탕',
      ],
      side: [],
    },
    representative: ['감자탕', '뼈해장국', '등뼈찜'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '감자탕집', '뼈해장국집', '식당', '노포'],
    titleScene: ['뼈째 우려낸', '뜨끈한 국물 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'haejangguk',
    name: '해장국',
    category: '해장국',
    genericName: '해장국집',
    altGenericNames: ['식당', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '선지해장국', '소고기해장국', '콩나물해장국', '황태해장국', '우거지해장국',
        '뼈해장국', '내장해장국', '양선지해장국', '얼큰해장국', '해장국정식',
      ],
      side: [],
    },
    representative: ['선지해장국', '소고기해장국', '콩나물해장국'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '해장국집', '식당', '노포', '집밥'],
    titleScene: ['속 풀리는', '뜨끈한 국물 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'samgyetang',
    name: '삼계탕',
    category: '삼계탕',
    genericName: '삼계탕집',
    altGenericNames: ['보양식당', '식당', '가게'],
    emoji: '🍗',
    menus: {
      representative: [
        '삼계탕', '한방삼계탕', '토종삼계탕', '능이삼계탕', '전복삼계탕',
        '들깨삼계탕', '옻삼계탕', '흑마늘삼계탕', '녹두삼계탕', '반계탕', '닭백숙',
      ],
      side: [],
    },
    representative: ['삼계탕', '한방삼계탕', '전복삼계탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '삼계탕집', '식당', '노포', '보양식'],
    titleScene: ['든든한 보양', '뜨끈한 국물 좋은', '몸보신하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'guksu',
    name: '국수',
    category: '국수',
    genericName: '국수집',
    altGenericNames: ['분식집', '식당', '가게'],
    emoji: '🍜',
    menus: {
      representative: [
        '잔치국수', '비빔국수', '열무국수', '김치국수', '멸치국수',
        '칼국수', '콩국수', '들기름국수', '육수국수', '냉국수',
      ],
      side: [],
    },
    representative: ['잔치국수', '비빔국수', '멸치국수'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '국수집', '분식', '식당', '노포'],
    titleScene: ['후루룩 넘기기 좋은', '간단하게 먹기 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'ricenoodle',
    name: '쌀국수',
    category: '쌀국수',
    genericName: '쌀국수집',
    altGenericNames: ['베트남음식점', '식당', '가게'],
    emoji: '🍜',
    menus: {
      representative: [
        '소고기쌀국수', '양지쌀국수', '차돌쌀국수', '매운쌀국수', '해물쌀국수',
        '닭쌀국수', '왕갈비쌀국수', '볶음쌀국수', '분짜', '월남쌈',
      ],
      side: [],
    },
    representative: ['소고기쌀국수', '양지쌀국수', '차돌쌀국수'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '쌀국수집', '베트남음식', '식당', '노포'],
    titleScene: ['따뜻하게 먹기 좋은', '깔끔하게 먹기 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'yangkkochi',
    name: '양꼬치',
    category: '양꼬치',
    genericName: '양꼬치집',
    altGenericNames: ['양갈비집', '식당', '가게'],
    emoji: '🍢',
    menus: {
      representative: [
        '양꼬치', '양갈비', '양등심꼬치', '양갈비살', '양념양꼬치',
        '매운양꼬치', '양꼬치세트', '양갈비구이', '꿔바로우', '온면',
      ],
      side: [],
    },
    representative: ['양꼬치', '양갈비', '꿔바로우'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '양꼬치집', '양갈비', '식당', '노포'],
    titleScene: ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'naengmyeon',
    name: '냉면',
    category: '냉면',
    genericName: '냉면집',
    altGenericNames: ['식당', '가게'],
    emoji: '🍜',
    menus: {
      representative: [
        '물냉면', '비빔냉면', '회냉면', '명태회냉면', '함흥냉면',
        '평양냉면', '열무냉면', '갈비냉면', '만두', '수육',
      ],
      side: [],
    },
    representative: ['물냉면', '비빔냉면', '평양냉면'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '냉면집', '평양냉면', '식당', '노포'],
    titleScene: ['시원하게 먹기 좋은', '깔끔하게 먹기 좋은', '여름에 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'donkatsu',
    name: '돈까스',
    category: '돈까스',
    genericName: '돈까스집',
    altGenericNames: ['경양식집', '식당', '가게'],
    emoji: '🍤',
    menus: {
      representative: [
        '등심돈까스', '안심돈까스', '치즈돈까스', '왕돈까스', '생선까스',
        '치킨까스', '고구마치즈돈까스', '매운돈까스', '카레돈까스', '냉모밀',
      ],
      side: [],
    },
    representative: ['등심돈까스', '안심돈까스', '치즈돈까스'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '돈까스집', '경양식', '식당', '노포'],
    titleScene: ['바삭하게 먹기 좋은', '든든하게 먹기 좋은', '혼밥하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'kalguksu',
    name: '칼국수',
    category: '칼국수',
    genericName: '칼국수집',
    altGenericNames: ['식당', '가게'],
    emoji: '🍜',
    menus: {
      representative: [
        '바지락칼국수', '해물칼국수', '손칼국수', '들깨칼국수', '얼큰칼국수',
        '닭칼국수', '팥칼국수', '장칼국수', '칼제비', '만두',
      ],
      side: [],
    },
    representative: ['바지락칼국수', '해물칼국수', '손칼국수'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '칼국수집', '손칼국수', '식당', '노포'],
    titleScene: ['뜨끈하게 먹기 좋은', '든든하게 먹기 좋은', '비 오는 날 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'shabu',
    name: '샤브샤브',
    category: '샤브샤브',
    genericName: '샤브샤브집',
    altGenericNames: ['식당', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '소고기샤브샤브', '버섯샤브샤브', '한우샤브샤브', '해물샤브샤브', '스페셜샤브샤브',
        '월남쌈샤브', '편백찜샤브', '얼큰샤브샤브', '스키야키', '샤브정식',
      ],
      side: [],
    },
    representative: ['소고기샤브샤브', '버섯샤브샤브', '해물샤브샤브'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '샤브샤브집', '샤브샤브', '식당', '노포'],
    titleScene: ['따뜻하게 먹기 좋은', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'duck',
    name: '오리',
    category: '오리',
    genericName: '오리전문점',
    altGenericNames: ['식당', '가게'],
    emoji: '🦆',
    menus: {
      representative: [
        '오리로스', '생오리로스', '훈제오리', '오리주물럭', '오리불고기',
        '오리양념구이', '오리소금구이', '오리백숙', '한방오리백숙', '능이버섯오리백숙',
        '오리탕', '오리세트',
      ],
      side: ['볶음밥', '죽', '칼국수사리'],
    },
    representative: ['오리로스', '훈제오리', '오리주물럭'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '오리집', '오리전문점', '오리요리', '식당'],
    titleScene: ['담백하게 먹기 좋은', '몸보신하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'eel',
    name: '장어',
    category: '장어',
    genericName: '장어집',
    altGenericNames: ['장어전문점', '식당', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '민물장어구이', '바다장어구이', '소금구이', '양념구이', '간장구이',
        '장어덮밥', '장어탕', '장어정식', '장어코스', '장어구이 한판',
        '장어스페셜', '장어샤브샤브',
      ],
      side: [],
    },
    representative: ['민물장어구이', '바다장어구이', '소금구이'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '장어집', '풍천장어', '식당', '노포'],
    titleScene: ['몸보신하기 좋은', '구워 먹기 좋은', '기력 보충하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'gopchang',
    name: '곱창·막창',
    category: '곱창·막창',
    genericName: '곱창막창집',
    altGenericNames: ['곱창전문점', '막창전문점', '식당', '가게'],
    emoji: '🍢',
    menus: {
      representative: [
        '소곱창', '한우곱창', '대창', '막창', '돼지막창',
        '소막창', '염통', '특양', '모둠구이', '곱창전골',
      ],
      side: [],
    },
    representative: ['소곱창', '모둠곱창', '대창'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '곱창집', '곱창구이', '식당', '노포'],
    titleScene: ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'makchang',
    name: '막창',
    category: '막창',
    genericName: '막창집',
    altGenericNames: ['막창전문점', '식당', '가게'],
    emoji: '🍢',
    menus: {
      representative: [
        '소곱창', '한우곱창', '대창', '막창', '돼지막창',
        '소막창', '염통', '특양', '모둠구이', '곱창전골',
      ],
      side: [],
    },
    representative: ['돼지막창', '소막창', '모둠막창'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '막창집', '막창구이', '식당', '노포'],
    titleScene: ['구워 먹기 좋은', '한잔하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'sushi',
    name: '초밥',
    category: '초밥',
    genericName: '초밥집',
    altGenericNames: ['스시집', '일식집', '가게'],
    emoji: '🍣',
    menus: {
      representative: [
        '모둠초밥', '특초밥', '생연어초밥', '광어초밥', '참치초밥',
        '새우초밥', '장어초밥', '소고기초밥', '유부초밥', '회덮밥',
      ],
      side: [],
    },
    representative: ['모둠초밥', '특초밥', '생연어초밥'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '초밥집', '스시집', '오마카세', '식당'],
    titleScene: ['깔끔하게 먹기 좋은', '신선하게 즐기는', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'crab',
    name: '대게·킹크랩',
    category: '대게·킹크랩',
    genericName: '대게집',
    altGenericNames: ['킹크랩집', '수산', '가게'],
    emoji: '🦀',
    menus: {
      representative: [
        '대게', '킹크랩', '랍스터', '홍게', '박달대게',
        '대게코스', '킹크랩코스', '대게세트', '킹크랩세트', '모둠세트',
        '대게찜', '킹크랩찜', '게딱지볶음밥', '게라면',
      ],
      side: [],
    },
    representative: ['대게찜', '킹크랩찜', '대게세트'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '대게집', '킹크랩', '수산', '식당'],
    titleScene: ['푸짐하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'hoe',
    name: '횟집',
    category: '횟집',
    genericName: '횟집',
    altGenericNames: ['수산', '활어횟집', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '모둠회', '광어회', '우럭회', '참돔회', '농어회',
        '방어회', '연어회', '도미회', '참가자미회', '회덮밥',
        '물회', '회코스',
      ],
      side: [],
    },
    representative: ['모둠회', '광어회', '방어회'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '횟집', '회', '수산', '식당'],
    titleScene: ['신선하게 즐기는', '나눠 먹기 좋은', '깔끔하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'agujjim',
    name: '아구찜',
    category: '아구찜',
    genericName: '아구찜집',
    altGenericNames: ['아귀찜전문점', '해물찜집', '가게'],
    emoji: '🌶️',
    menus: {
      representative: [
        '아구찜', '해물아구찜', '순살아구찜', '매운아구찜', '아구탕',
        '아귀수육', '아귀불고기', '아귀찜정식', '아귀전골', '해물찜',
      ],
      side: [],
    },
    representative: ['아구찜', '해물아구찜', '순살아구찜'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '아구찜집', '아귀찜', '해물찜', '식당'],
    titleScene: ['매콤하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'jjimdak',
    name: '찜닭',
    category: '찜닭',
    genericName: '찜닭집',
    altGenericNames: ['안동찜닭전문점', '닭요리집', '가게'],
    emoji: '🍗',
    menus: {
      representative: [
        '안동찜닭', '간장찜닭', '매운찜닭', '순살찜닭', '치즈찜닭',
        '국물찜닭', '마라찜닭', '찜닭볶음밥', '닭발', '콩나물무침',
      ],
      side: [],
    },
    representative: ['안동찜닭', '간장찜닭', '매운찜닭'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '찜닭집', '안동찜닭', '닭요리', '식당'],
    titleScene: ['나눠 먹기 좋은', '든든하게 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'dakgalbi',
    name: '닭갈비',
    category: '닭갈비',
    genericName: '닭갈비집',
    altGenericNames: ['춘천닭갈비전문점', '닭요리집', '가게'],
    emoji: '🍗',
    menus: {
      representative: [
        '철판닭갈비', '숯불닭갈비', '양념닭갈비', '매운닭갈비', '치즈닭갈비',
        '간장닭갈비', '닭목살구이', '닭내장볶음', '닭갈비정식', '닭갈비세트',
      ],
      side: ['볶음밥', '치즈볶음밥', '막국수', '비빔막국수', '물막국수'],
    },
    representative: ['철판닭갈비', '숯불닭갈비', '치즈닭갈비'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '닭갈비집', '춘천닭갈비', '닭요리', '식당'],
    titleScene: ['볶아 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'galbi',
    name: '갈비',
    category: '갈비',
    genericName: '갈비집',
    altGenericNames: ['숯불갈비전문점', '고깃집', '가게'],
    emoji: '🍖',
    menus: {
      representative: [
        '생갈비', '양념갈비', '돼지갈비', '소갈비', 'LA갈비',
        '왕갈비', '이동갈비', '갈비정식', '매운갈비찜', '갈비탕',
      ],
      side: [],
    },
    representative: ['생갈비', '양념갈비', '소갈비'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '갈비집', '숯불갈비', '고깃집', '식당'],
    titleScene: ['구워 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'beef',
    name: '소고기',
    category: '소고기',
    genericName: '소고기집',
    altGenericNames: ['한우전문점', '고깃집', '가게'],
    emoji: '🥩',
    menus: {
      representative: [
        '꽃등심', '등심', '안심', '갈비살', '살치살',
        '안창살', '토시살', '부채살', '차돌박이', '육회',
      ],
      side: [],
    },
    representative: ['꽃등심', '살치살', '차돌박이'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '소고기집', '한우', '고깃집', '식당'],
    titleScene: ['구워 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'lamb',
    name: '양고기',
    category: '양고기',
    genericName: '양고기집',
    altGenericNames: ['양갈비전문점', '고깃집', '가게'],
    emoji: '🐑',
    menus: {
      representative: [
        '양갈비', '프렌치랙', '양등심', '양어깨살', '양꼬치',
        '양갈비살', '양갈비정식', '양전골', '양수육', '모둠양고기',
      ],
      side: [],
    },
    representative: ['양갈비', '프렌치랙', '모둠양고기'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '양고기집', '양갈비', '램', '식당'],
    titleScene: ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'grilledfish',
    name: '생선구이',
    category: '생선구이',
    genericName: '생선구이집',
    altGenericNames: ['생선구이백반집', '한식집', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '고등어구이', '삼치구이', '임연수구이', '갈치구이', '꽁치구이',
        '조기구이', '가자미구이', '열기구이', '코다리구이', '장어구이',
        '모둠생선구이', '생선구이정식',
      ],
      side: [],
    },
    representative: ['고등어구이', '갈치구이', '모둠생선구이'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '생선구이집', '생선구이백반', '한식', '식당'],
    titleScene: ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'seafoodtang',
    name: '해물탕',
    category: '해물탕',
    genericName: '해물탕집',
    altGenericNames: ['해물찜전문점', '해산물집', '가게'],
    emoji: '🦐',
    menus: {
      representative: [
        '해물탕', '해물찜', '아귀해물찜', '해물전골', '해신탕',
        '꽃게탕', '낙지해물탕', '조개해물탕', '문어해물탕', '섞어찜',
        '해물스페셜', '해물탕정식',
      ],
      side: [],
    },
    representative: ['해물탕', '해물찜', '해물전골'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '해물탕집', '해물찜', '해산물', '식당'],
    titleScene: ['얼큰하게 먹기 좋은', '나눠 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'daegutang',
    name: '대구탕',
    category: '대구탕',
    genericName: '대구탕집',
    altGenericNames: ['대구지리전문점', '해산물집', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '대구탕', '맑은대구탕', '얼큰대구탕', '대구지리', '대구전골',
        '대구찜', '대구뽈찜', '대구뽈탕', '대구튀김', '대구불고기',
        '대구정식', '대구스페셜',
      ],
      side: [],
    },
    representative: ['대구탕', '맑은대구탕', '얼큰대구탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '대구탕집', '대구지리', '해산물', '식당'],
    titleScene: ['시원하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'bokjip',
    name: '복집',
    category: '복집',
    genericName: '복집',
    altGenericNames: ['복요리전문점', '복어요리', '해산물집', '가게'],
    emoji: '🐡',
    menus: {
      representative: [
        '복국', '은복국', '밀복국', '참복국', '복매운탕',
        '복수육', '복찜', '복튀김', '복불고기', '복지리',
      ],
      side: [],
    },
    representative: ['복국', '복매운탕', '복찜'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '복집', '복국', '복요리', '해산물', '식당'],
    titleScene: ['담백하게 먹기 좋은', '시원하게 먹기 좋은', '깔끔하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'shellfish',
    name: '조개구이',
    category: '조개구이',
    genericName: '조개구이집',
    altGenericNames: ['조개찜전문점', '해산물집', '가게'],
    emoji: '🦪',
    menus: {
      representative: [
        '조개구이', '모둠조개구이', '키조개구이', '가리비구이', '전복구이',
        '조개찜', '모둠조개찜', '조개전골', '조개탕', '해물조개구이',
        '조개구이세트', '조개스페셜',
      ],
      side: [],
    },
    representative: ['조개구이', '모둠조개구이', '조개찜'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '조개구이집', '조개찜', '해산물', '식당'],
    titleScene: ['구워 먹기 좋은', '나눠 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'codari',
    name: '코다리',
    category: '코다리',
    genericName: '코다리집',
    altGenericNames: ['코다리조림전문점', '한식집', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '코다리조림', '시래기코다리조림', '매운코다리조림', '코다리정식', '코다리구이',
        '코다리찜', '코다리전골', '코다리냉면', '코다리물냉면', '코다리비빔냉면',
        '코다리세트', '코다리스페셜',
      ],
      side: [],
    },
    representative: ['코다리조림', '매운코다리조림', '코다리정식'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '코다리집', '코다리조림', '한식', '식당'],
    titleScene: ['매콤하게 즐기는', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'jjukkumi',
    name: '쭈꾸미',
    category: '쭈꾸미',
    genericName: '쭈꾸미집',
    altGenericNames: ['쭈꾸미볶음전문점', '주꾸미집', '가게'],
    emoji: '🐙',
    menus: {
      representative: [
        '쭈꾸미볶음', '직화쭈꾸미', '철판쭈꾸미', '쭈삼(쭈꾸미삼겹살)', '쭈차(쭈꾸미차돌박이)',
        '쭈새(쭈꾸미새우)', '쭈꾸미정식', '쭈꾸미세트', '쭈꾸미전골', '쭈꾸미샤브샤브',
        '산쭈꾸미', '쭈꾸미스페셜',
      ],
      side: [],
    },
    representative: ['쭈꾸미볶음', '직화쭈꾸미', '쭈삼(쭈꾸미삼겹살)'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '쭈꾸미집', '쭈꾸미볶음', '주꾸미', '식당'],
    titleScene: ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'nakji',
    name: '낙지',
    category: '낙지',
    genericName: '낙지집',
    altGenericNames: ['낙지볶음전문점', '낙지요리집', '가게'],
    emoji: '🐙',
    menus: {
      representative: [
        '낙지볶음', '직화낙지볶음', '철판낙지볶음', '산낙지', '연포탕',
        '낙지전골', '낙지탕탕이', '낙곱새', '낙삼(낙지삼겹살)', '낙지정식',
        '낙지세트', '낙지스페셜',
      ],
      side: [],
    },
    representative: ['낙지볶음', '연포탕', '낙곱새'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '낙지집', '낙지볶음', '낙지요리', '식당'],
    titleScene: ['매콤하게 즐기는', '한잔하기 좋은', '나눠 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'mulhoe',
    name: '물회',
    category: '물회',
    genericName: '물회집',
    altGenericNames: ['물회전문점', '해산물집', '가게'],
    emoji: '🐟',
    menus: {
      representative: [
        '물회', '특물회', '참가자미물회', '광어물회', '오징어물회',
        '전복물회', '해삼물회', '멍게물회', '회덮밥', '물회정식',
        '물회세트', '물회스페셜',
      ],
      side: [],
    },
    representative: ['물회', '특물회', '광어물회'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '물회집', '물회', '해산물', '식당'],
    titleScene: ['시원하게 먹기 좋은', '새콤하게 먹기 좋은', '여름에 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'muneo',
    name: '문어',
    category: '문어',
    genericName: '문어집',
    altGenericNames: ['문어전문점', '해산물집', '가게'],
    emoji: '🐙',
    menus: {
      representative: [
        '문어숙회', '문어삼합', '돌문어숙회', '문어볶음', '문어전골',
        '문어샤브샤브', '문어연포탕', '문어물회', '문어초회', '문어정식',
        '문어세트', '문어스페셜',
      ],
      side: [],
    },
    representative: ['문어숙회', '문어삼합', '돌문어숙회'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '문어집', '문어숙회', '해산물', '식당'],
    titleScene: ['쫄깃하게 즐기는', '담백하게 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'gejang',
    name: '게장',
    category: '게장',
    genericName: '게장집',
    altGenericNames: ['게장전문점', '간장게장집', '가게'],
    emoji: '🦀',
    menus: {
      representative: [
        '간장게장', '양념게장', '꽃게장', '암꽃게장', '숫꽃게장',
        '간장새우장', '양념새우장', '전복장', '모둠장', '게장정식',
        '간장게장정식', '양념게장정식', '반반게장정식', '꽃게탕',
      ],
      side: [],
    },
    representative: ['간장게장', '양념게장', '게장정식'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '게장집', '간장게장', '밥도둑', '식당'],
    titleScene: ['밥도둑으로 좋은', '짭짤하게 즐기는', '든든하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'jeon',
    name: '전',
    category: '전',
    genericName: '전집',
    altGenericNames: ['전전문점', '모둠전집', '가게'],
    emoji: '🥘',
    menus: {
      representative: [
        '모둠전', '해물파전', '김치전', '감자전', '녹두전',
        '육전', '동태전', '굴전', '버섯전', '호박전',
        '깻잎전', '꼬치전', '배추전', '고추전',
      ],
      side: [],
    },
    representative: ['모둠전', '해물파전', '녹두전'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '전집', '전', '모둠전', '식당'],
    titleScene: ['바삭하게 즐기는', '나눠 먹기 좋은', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'dakhanmari',
    name: '닭한마리',
    category: '닭한마리',
    genericName: '닭한마리집',
    altGenericNames: ['닭한마리전문점', '닭요리집', '가게'],
    emoji: '🐔',
    menus: {
      representative: [
        '닭한마리', '얼큰닭한마리', '한방닭한마리', '능이버섯닭한마리', '묵은지닭한마리',
        '해물닭한마리', '닭볶음탕', '닭도리탕', '닭매운탕', '닭칼국수',
        '닭죽', '닭한마리세트',
      ],
      side: ['칼국수사리', '떡사리', '버섯사리', '죽'],
    },
    representative: ['닭한마리', '얼큰닭한마리', '한방닭한마리'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '닭한마리', '닭한마리집', '닭요리', '식당'],
    titleScene: ['뜨끈하게 먹기 좋은', '나눠 먹기 좋은', '몸보신하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'baeksuk',
    name: '백숙',
    category: '백숙',
    genericName: '백숙집',
    altGenericNames: ['백숙전문점', '토종닭집', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '토종닭백숙', '한방백숙', '능이버섯백숙', '누룽지백숙', '옻백숙',
        '오리백숙', '한방오리백숙', '능이버섯오리백숙', '오리누룽지백숙', '닭볶음탕',
        '오리주물럭', '백숙세트',
      ],
      side: ['죽', '누룽지', '칼국수사리'],
    },
    representative: ['토종닭백숙', '한방백숙', '능이버섯백숙'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '백숙', '백숙집', '토종닭', '식당'],
    titleScene: ['뜨끈하게 먹기 좋은', '몸보신하기 좋은', '든든하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'boribap',
    name: '보리밥',
    category: '보리밥',
    genericName: '보리밥집',
    altGenericNames: ['보리밥전문점', '산채정식집', '가게'],
    emoji: '🍚',
    menus: {
      representative: [
        '보리밥', '보리비빔밥', '산채보리밥', '열무보리밥', '강된장보리밥',
        '돌솥보리밥', '보리밥정식', '산채정식', '강된장', '청국장',
        '된장찌개', '제육볶음', '고등어구이', '황태구이',
      ],
      side: ['누룽지', '솥밥'],
    },
    representative: ['보리밥', '산채보리밥', '강된장'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '보리밥', '보리밥집', '산채', '식당'],
    titleScene: ['건강하게 먹기 좋은', '집밥처럼 먹기 좋은', '속 편하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'cheonggukjang',
    name: '청국장',
    category: '청국장',
    genericName: '청국장집',
    altGenericNames: ['청국장전문점', '된장집', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '청국장', '우렁청국장', '소고기청국장', '해물청국장', '버섯청국장',
        '차돌청국장', '청국장정식', '청국장보리밥', '강된장', '된장찌개',
        '제육볶음', '고등어구이',
      ],
      side: ['보리밥', '돌솥밥', '누룽지'],
    },
    representative: ['청국장', '우렁청국장', '청국장정식'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '청국장', '청국장집', '된장', '식당'],
    titleScene: ['구수하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'dubu',
    name: '두부',
    category: '두부',
    genericName: '두부집',
    altGenericNames: ['두부전문점', '순두부집', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '순두부', '모두부', '두부전골', '두부김치', '두부보쌈',
        '두부버섯전골', '청국장', '된장찌개', '콩비지', '비지찌개',
        '두부정식', '순두부정식',
      ],
      side: [],
    },
    representative: ['순두부', '두부전골', '두부김치'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '두부', '두부집', '순두부', '식당'],
    titleScene: ['담백하게 먹기 좋은', '든든하게 먹기 좋은', '집밥처럼 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },
  {
    id: 'kongnamulgukbap',
    name: '콩나물국밥',
    category: '콩나물국밥',
    genericName: '콩나물국밥집',
    altGenericNames: ['콩나물국밥전문점', '해장국집', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '콩나물국밥', '전주콩나물국밥', '황태콩나물국밥', '얼큰콩나물국밥', '김치콩나물국밥',
        '오징어콩나물국밥', '황태해장국', '선지해장국', '콩나물해장국', '콩나물정식',
      ],
      side: [],
    },
    representative: ['콩나물국밥', '전주콩나물국밥', '황태콩나물국밥'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '콩나물국밥', '전주콩나물국밥', '해장국', '식당'],
    titleScene: ['시원하게 먹기 좋은', '해장하기 좋은', '뜨끈하게 먹기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  // ─── 전문점: 닭발 (조합 경험 업종 · decisionPoint Data 심는 첫 확장 · 2026-07-16) ───
  //   메인(직화/국물)→별미→사이드→사리→세트 전 메뉴 full 축. 조합 흐름을 Data가 소유.
  {
    id: 'dakbal',
    name: '닭발',
    category: '닭발',
    genericName: '닭발집',
    altGenericNames: ['닭발전문점', '포차', '가게'],
    emoji: '🍗',
    menus: {
      representative: [
        '통뼈닭발', '무뼈닭발', '국물닭발', '무뼈국물닭발',
        '오돌뼈', '닭똥집', '닭날개', '닭목살',
        '2인세트', '3~4인세트',
      ],
      side: [
        '계란찜', '주먹밥', '볶음밥', '오뎅탕', '조개탕',
        '당면사리', '우동사리', '치즈사리', '떡사리',
      ],
    },
    representative: ['통뼈닭발', '무뼈닭발', '국물닭발'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '닭발집', '닭발전문점', '포차', '노포'],
    titleScene: ['불향 도는', '얼큰하게 즐기는', '한잔하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  // ─── 전문점: 육개장 (한식/탕 · 겸업 메뉴 제외) ───
  {
    id: 'yukgaejang',
    name: '육개장',
    category: '육개장',
    genericName: '육개장집',
    altGenericNames: ['육개장전문점', '한식집', '식당'],
    emoji: '🍲',
    // 표준 메뉴셋 — 반복 출현 기준. 공기밥·만두추가·칼국수사리·주류·음료·세트·계절·보쌈/수육(겸업) 제외
    menus: {
      representative: [
        '육개장', '전통육개장', '얼큰육개장', '특육개장', '한우육개장',
        '육칼국수', '육개장칼국수', '육개장만두국', '사골육개장', '육개전골',
      ],
      side: [],
    },
    representative: ['육개장', '전통육개장', '얼큰육개장'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '육개장', '육개장집', '한식', '식당'],
    titleScene: ['얼큰하게 먹기 좋은', '뜨끈한 국물 좋은', '해장하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  // ─── 신규: 국물·탕·해장 계열 (2026-07-06) ───
  {
    id: 'dongtaetang',
    name: '동태탕',
    category: '동태탕',
    genericName: '동태탕집',
    altGenericNames: ['생태탕집', '식당', '가게'],
    emoji: '🍲',
    // 알탕은 독립 전문점 대신 동태탕 대표 서브메뉴로 흡수
    menus: {
      representative: [
        '동태탕', '동태전골', '알탕', '알내장탕',
        '동태내장탕', '코다리조림', '동태찜',
      ],
      side: [],
    },
    representative: ['동태탕', '동태전골', '알탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '동태탕집', '생태탕', '식당', '노포'],
    titleScene: ['시원하게 먹기 좋은', '얼큰하게 먹기 좋은', '해장하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'agutang',
    name: '아귀탕',
    category: '아귀탕',
    genericName: '아귀탕집',
    altGenericNames: ['아귀요리전문점', '식당', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '아귀탕', '아귀매운탕', '아귀맑은탕', '아귀알탕', '아귀곤이탕',
        '아귀수육', '아귀찜', '아귀불고기', '아귀전골', '아귀탕정식',
      ],
      side: [],
    },
    representative: ['아귀탕', '아귀매운탕', '아귀맑은탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '아귀탕집', '아귀요리', '식당', '노포'],
    titleScene: ['얼큰하게 먹기 좋은', '시원하게 먹기 좋은', '해장하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'maeuntang',
    name: '매운탕',
    category: '매운탕',
    genericName: '매운탕집',
    altGenericNames: ['민물매운탕집', '민물고기전문점', '식당'],
    emoji: '🍲',
    // 해물탕(seafoodtang)과 분리 — 민물·생선 매운탕 검색의도
    menus: {
      representative: [
        '민물매운탕', '메기매운탕', '빠가매운탕', '쏘가리매운탕', '잡고기매운탕',
        '동자개매운탕', '참게매운탕', '붕어매운탕', '어탕', '매운탕정식',
      ],
      side: ['어죽', '튀김', '새우튀김'],
    },
    representative: ['민물매운탕', '메기매운탕', '쏘가리매운탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '매운탕집', '민물매운탕', '식당', '노포'],
    titleScene: ['얼큰하게 먹기 좋은', '시원하게 먹기 좋은', '해장하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'dakbokkeumtang',
    name: '닭볶음탕',
    category: '닭볶음탕',
    genericName: '닭볶음탕집',
    altGenericNames: ['닭요리전문점', '식당', '가게'],
    emoji: '🍗',
    menus: {
      representative: [
        '닭볶음탕', '닭도리탕', '국물닭볶음탕', '묵은지닭볶음탕', '옛날닭볶음탕',
        '매운닭볶음탕', '순한닭볶음탕', '닭매운탕', '닭한마리볶음탕', '닭볶음탕정식',
      ],
      side: ['볶음밥', '칼국수사리', '당면사리'],
    },
    representative: ['닭볶음탕', '닭도리탕', '묵은지닭볶음탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '닭볶음탕집', '닭요리', '식당', '노포'],
    titleScene: ['매콤하게 즐기는', '푸짐하게 먹기 좋은', '가족모임 하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  {
    id: 'chueotang',
    name: '추어탕',
    category: '추어탕',
    genericName: '추어탕집',
    altGenericNames: ['남원추어탕집', '식당', '가게'],
    emoji: '🍲',
    menus: {
      representative: [
        '추어탕', '남원추어탕', '통추어탕', '우렁추어탕', '갈아만든추어탕',
        '얼큰추어탕', '추어숙회', '추어튀김', '추어전골', '추어만두',
        '추어물만두', '추어탕정식',
      ],
      side: ['추어튀김', '미꾸라지튀김', '숙회'],
    },
    representative: ['추어탕', '남원추어탕', '통추어탕'],
    directions: 'MENU_BASE_DIRECTION',
    titleSearchword: ['맛집', '추어탕집', '남원추어탕', '식당', '노포'],
    titleScene: ['든든한 보양', '뜨끈한 국물 좋은', '몸보신하기 좋은'],
    photoPolicyRef: 'RESTAURANT',
    prompts: 'restaurant',
    information: 'restaurant',
    enabled: false,
    status: 'dev',
  },

  // { id:'bossam', name:'보쌈', category:'보쌈', ... },
  // { id:'gamjatang', name:'감자탕', category:'감자탕', ... },
  // { id:'haejangguk', name:'해장국', category:'해장국', ... },
  // { id:'samgyetang', name:'삼계탕', category:'삼계탕', ... },
  // { id:'guksu', name:'국수', category:'국수', ... },
  // { id:'ssalguksu', name:'쌀국수', category:'쌀국수', ... },
  // { id:'yangkkochi', name:'양꼬치', category:'양꼬치', ... },
];

// SPECIALTY 조회 헬퍼 (엔진/프론트 공통 소비) — 구조 수정 없이 데이터만 늘어남
export const RESTAURANT_SPECIALTY_MAP = Object.fromEntries(
  RESTAURANT_SPECIALTY.map((s) => [s.name, s])
);
export function getSpecialty(name) {
  return RESTAURANT_SPECIALTY_MAP[name] || null;
}
export function getSpecialtyMenus(name) {
  const s = RESTAURANT_SPECIALTY_MAP[name];
  if (!s) return [];
  return [...(s.menus?.representative || []), ...(s.menus?.side || [])];
}
