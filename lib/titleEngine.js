// lib/titleEngine.js
// 공통 제목 엔진 — v1 (2026-07)
// 목적: 설명형 제목("○○ 안내 / 범위 안내 / 준비사항 / 체크포인트 / 확인사항")을
//       검색의도(Intent) 축 제목으로 교체한다. 원인·증상·판단·비용·시기·순서·비교·관리.
//
// ★ 적용 원칙 (지시서 확정)
//   - Runtime / Data / Prompt / Handler 로직 무수정. 핸들러는 buildTitle() 한정 교체.
//   - *-data.js 의 titlePatterns 는 **폴백 전용**. 본 엔진 생성 실패 시에만 사용.
//   - 지역 키워드 유지: {region} 1회 + 메뉴명(kw) 1회 = SEO 축 그대로.
//   - 금지 어휘 미보유: 안내 / 범위 안내 / 준비사항 / 체크포인트 / 체크리스트 / 확인사항 / 알아보기 / 소개
//   - Intent 회전: (업종+메뉴+날짜) 해시로 회전 → 동일 업종 내 메뉴별·일자별 제목 분산.
//
// 사용법 (핸들러 buildTitle 내부 1줄)
//   import { buildIntentTitle } from "../../lib/titleEngine.js";
//   function buildTitle(region, treatment) {
//     return buildIntentTitle(region, treatment, "sinkrepair");
//   }

// ── 금지 토큰 (생성 결과 자기검증용) ─────────────────────────
const BANNED_TITLE_TOKENS = [
  '안내', '범위 안내', '준비사항', '체크포인트', '체크리스트', '확인사항', '알아보기', '소개',
];

// ── 업종군 Intent 풀 ─────────────────────────────────────────
//   군별로 어울리는 판단축만 배치. (수리 / 시공 / 청소·관리 / 차단·방제)
//   kw = 메뉴명, rg = 지역. 설명형 어휘 미보유.
const POOL_REPAIR = [
  { id: 'cause',   t: (rg, kw) => `${rg} ${kw} 원인과 해결 방법` },
  { id: 'decide',  t: (rg, kw) => `${rg} ${kw} 수리와 교체 판단 기준` },
  { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
  { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
  { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
  { id: 'trouble', t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
  { id: 'inspect', t: (rg, kw) => `${rg} ${kw} 점검해야 하는 곳` },
  { id: 'manage',  t: (rg, kw) => `${rg} ${kw} 이후 관리 방법` },
];

const POOL_BUILD = [
  { id: 'scope',   t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
  { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
  { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
  { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
  { id: 'compare', t: (rg, kw) => `${rg} ${kw} 부분 시공과 전체 시공 차이` },
  { id: 'timing',  t: (rg, kw) => `${rg} ${kw} 언제 하는 것이 좋을까` },
  { id: 'manage',  t: (rg, kw) => `${rg} ${kw} 이후 관리 방법` },
  { id: 'trouble', t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
];

const POOL_CLEAN = [
  { id: 'timing',  t: (rg, kw) => `${rg} ${kw} 언제 하는 것이 좋을까` },
  { id: 'cycle',   t: (rg, kw) => `${rg} ${kw} 주기를 정하는 기준` },
  { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
  { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
  { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
  { id: 'scope',   t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
  { id: 'manage',  t: (rg, kw) => `${rg} ${kw} 이후 관리 방법` },
  { id: 'trouble', t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
];

const POOL_BLOCK = [
  { id: 'cause',   t: (rg, kw) => `${rg} ${kw} 원인과 차단 방법` },
  { id: 'repeat',  t: (rg, kw) => `${rg} ${kw} 반복되는 이유` },
  { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
  { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 곳` },
  { id: 'scope',   t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
  { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
  { id: 'manage',  t: (rg, kw) => `${rg} ${kw} 이후 관리 방법` },
  { id: 'inspect', t: (rg, kw) => `${rg} ${kw} 점검해야 하는 곳` },
];

const POOL_MOVE = [
  { id: 'timing',  t: (rg, kw) => `${rg} ${kw} 날짜를 정하는 기준` },
  { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
  { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
  { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
  { id: 'scope',   t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
  { id: 'compare', t: (rg, kw) => `${rg} ${kw} 서비스 종류 차이` },
  { id: 'prep',    t: (rg, kw) => `${rg} ${kw} 미리 준비할 것` },
  { id: 'trouble', t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
];

// ── 업종 전용 풀 오버라이드 ─────────────────────────────────
//   ★ [세션62] 군 풀(POOL_BUILD)은 공유 자산이라 손대면 bathroom/interior/grout/coating/systemair
//     제목이 함께 흔들린다. 축이 맞지 않는 업종만 여기서 전용 풀로 덮는다.
//   dobae: 본문 비중이 [준비·현장판단·시공]에 실려 있는데 'manage(이후 관리 방법)'가 뽑히면
//     제목과 본문 중심이 어긋난다 → 사후관리 축 제거, 준비·판단 축으로 재구성.
const INDUSTRY_POOL_OVERRIDE = {
  dobae: [
    { id: 'scope',    t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
    { id: 'order',    t: (rg, kw) => `${rg} ${kw} 진행 순서` },
    { id: 'pre',      t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
    { id: 'compare',  t: (rg, kw) => `${rg} ${kw} 부분 시공과 전체 시공 차이` },
    { id: 'material', t: (rg, kw) => `${rg} ${kw} 자재를 고르는 기준` },
    { id: 'cost',     t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
    { id: 'timing',   t: (rg, kw) => `${rg} ${kw} 언제 하는 것이 좋을까` },
    { id: 'trouble',  t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
  ],
  // flooring: 본문 축이 [현장판단 · 작업 · 두께선택]이라 사후관리 축은 제외.
  //   장판은 '두께(T)'가 검색 판단의 제1축 → 전용 항목으로 편성.
  flooring: [
    { id: 'thick',   t: (rg, kw) => `${rg} ${kw} 두께를 정하는 기준` },
    { id: 'scope',   t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
    { id: 'order',   t: (rg, kw) => `${rg} ${kw} 진행 순서` },
    { id: 'pre',     t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
    { id: 'demo',    t: (rg, kw) => `${rg} ${kw} 철거와 덧방 판단 기준` },
    { id: 'seam',    t: (rg, kw) => `${rg} ${kw} 이음매가 생기는 자리` },
    { id: 'cost',    t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
    { id: 'trouble', t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
  ],
  // [세션63] film: 본문 축이 [현장판단 · 하지작업 · 원단선택]이라 사후관리 축은 제외.
  //   필름은 '붙이기 전 면 상태(하지)'가 검색 판단의 제1축 → 전용 항목으로 편성.
  film: [
    { id: 'base',     t: (rg, kw) => `${rg} ${kw} 하지 작업이 갈리는 지점` },
    { id: 'scope',    t: (rg, kw) => `${rg} ${kw} 범위를 정하는 기준` },
    { id: 'order',    t: (rg, kw) => `${rg} ${kw} 진행 순서` },
    { id: 'pre',      t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
    { id: 'compare',  t: (rg, kw) => `${rg} ${kw} 부분 시공과 전체 시공 차이` },
    { id: 'material', t: (rg, kw) => `${rg} ${kw} 원단을 고르는 기준` },
    { id: 'cost',     t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
    { id: 'trouble',  t: (rg, kw) => `${rg} ${kw} 자주 생기는 문제` },
  ],
  // [S219 WINDOW-INTENT-REGISTRATION-01] window: 본문 축이 [실측 · 현장판단 · 시공] →
  //   사후관리 축(manage) 제외. dobae/flooring/film 판단과 동일.
  //   ★ 메뉴 고유 어휘(「새는 자리」·「방충망」)를 여기 넣지 않는다. 창호는 교체·누수·단열
  //     3축이 이질적이라 업종 단위 배열에 섞으면 「방범창설치 새는 자리를 찾는 순서」가 나온다.
  //     메뉴 고유 축은 SYMPTOM_LEX.window(k 토큰 분기)가 회수한다.
  window: [
    { id: 'scope',     t: (rg, kw) => `${rg} ${kw} 부분보수와 전체교체 판단 기준` },
    { id: 'order',     t: (rg, kw) => `${rg} ${kw} 진행 순서` },
    { id: 'measure',   t: (rg, kw) => `${rg} ${kw} 실측에서 갈리는 지점` },
    { id: 'pre',       t: (rg, kw) => `${rg} ${kw} 전 확인할 부분` },
    { id: 'cost',      t: (rg, kw) => `${rg} ${kw} 비용이 달라지는 이유` },
    { id: 'inspect',   t: (rg, kw) => `${rg} ${kw} 점검해야 하는 곳` },
    { id: 'reinforce', t: (rg, kw) => `${rg} ${kw} 보강 범위를 정하는 기준` },
    { id: 'residual',  t: (rg, kw) => `${rg} ${kw} 창을 갈아도 남는 문제` },
  ],
};

// 업종 → 군 매핑. 미등록 업종은 REPAIR 기본(무장애).
const INDUSTRY_GROUP = {
  sinkrepair: 'repair', homefix: 'repair', electricrepair: 'repair', boiler: 'repair',
  door: 'repair',     // [세션63] 도어수리 — 수리군. POOL_REPAIR(원인·판단·비용·순서·점검·문제)가 축과 일치해 OVERRIDE 불필요.
  plumbing: 'repair', sewer: 'repair', leakdetect: 'repair', screen: 'repair',
  bathroom: 'build', interior: 'build', grout: 'build', coating: 'build', systemair: 'build',
  dobae: 'build',
  film: 'build',      // [세션63] 인테리어필름 — 시공군. 미등록 시 REPAIR 기본으로 떨어진다.
  furniture: 'build',  // [세션69] 맞춤가구 — 시공군. 미등록 시 REPAIR 축퇴 → door(수리축) 제목과 혼동.
  lighting: 'build',  // [세션69] 조명 — 시공군. 미등록 시 REPAIR 기본으로 떨어져 electricrepair(증상축) 제목과 혼동된다.
  flooring: 'build',  // [세션62] 장판 — 시공군. 미등록 시 REPAIR 기본으로 떨어진다.   // [세션61] 도배 — 시공군. 미등록 시 REPAIR 기본으로 떨어져 "수리와 교체 판단 기준" 제목이 나온다.
  window: 'build',    // [S219] 창호 — 시공군. 미등록 시 기본값 'repair'로 축퇴해 「수리와 교체 판단 기준」이 나간다.
  cleaning: 'clean', airclean: 'clean', buildingclean: 'clean', tankclean: 'clean',
  moving: 'move',
  pestcontrol: 'block', birdcontrol: 'block',
};

const GROUP_POOL = {
  repair: POOL_REPAIR, build: POOL_BUILD, clean: POOL_CLEAN, block: POOL_BLOCK, move: POOL_MOVE,
};

// ── 업종별 증상 어절 (LEX) ───────────────────────────────────
//   { k: [메뉴명 매칭 토큰] | null, s: 증상 어절 }
//   k 가 메뉴명에 포함될 때만 사용. k:null = 업종 범용.
//   매칭 후보가 없으면 증상형 skip → 군 Intent 풀 사용(무장애).
//   ★ 신규 파일 내부 데이터. 기존 *-data.js 무수정.
const SYMPTOM_LEX = {
  sinkrepair: [
    { k: null, s: '물이 자꾸 고인다면' },
    { k: ['문', '경첩'], s: '닫을 때 걸린다면' },
    { k: ['문', '경첩'], s: '문이 처졌을 때' },
    { k: ['레일', '서랍'], s: '서랍이 뻑뻑할 때' },
    { k: ['싱크볼', '상판', '수리'], s: '물이 새는 자국이 보일 때' },
    { k: ['하부장', '수납장'], s: '아래쪽이 부풀었을 때' },
    { k: null, s: '소리가 나기 시작할 때' },
  ],
  bathroom: [
    { k: null, s: '냄새가 자꾸 올라온다면' },
    { k: ['타일', '리모델링'], s: '바닥이 미끄럽다면' },
    { k: ['타일', '리모델링'], s: '타일이 들뜰 때' },
    { k: ['실리콘', '배수구'], s: '곰팡이가 반복될 때' },
    { k: ['변기', '세면대', '수전'], s: '물이 계속 흐를 때' },
    { k: null, s: '물이 잘 안 빠질 때' },
  ],
  homefix: [
    { k: null, s: '흔들리기 시작했다면' },
    { k: ['문', '손잡이'], s: '문이 잘 안 닫힐 때' },
    { k: ['창', '샷시'], s: '바람이 들어올 때' },
    { k: null, s: '틈이 벌어지기 시작할 때' },
  ],
  // [세션69] furniture — 자리 제약 축. door(수리 축)·film(표면 축)과 어절을 공유하지 않는다.
  //   k 토큰에 '붙박이장'을 쓰지 않는다 — film 3엔트리 + door 3엔트리가 이미 선점(실측).
  furniture: [
    { k: null, s: '넣을 자리가 모자랄 때' },
    { k: ['붙박이장제작', '거실수납장'], s: '벽과 사이가 뜰 때' },
    { k: ['드레스룸', '신발장'], s: '문이 끝까지 안 열릴 때' },
    { k: ['팬트리', '주방수납장'], s: '안쪽까지 손이 안 닿을 때' },
    { k: ['맞춤책상', '세탁실'], s: '자리에 맞는 게 없을 때' },
    { k: null, s: '구석이 죽어 있을 때' },
  ],
  // [세션69] lighting — 배치 축. electricrepair(증상 축)와 어절을 공유하지 않는다.
  //   '안 켜진다/깜빡인다' 계열은 electricrepair 소유 → 여기서는 쓰지 않는다.
  lighting: [
    { k: null, s: '구석만 어두울 때' },
    { k: ['간접', '라인'], s: '빛줄기가 그대로 보일 때' },
    { k: ['간접', '라인'], s: '벽이 얼룩져 보일 때' },
    { k: ['매립', '마그네틱'], s: '천장 속 여유가 얕을 때' },
    { k: ['레일', '펜던트'], s: '기구가 처져 보일 때' },
    { k: null, s: '밝기가 한쪽으로 몰릴 때' },
  ],
  electricrepair: [
    { k: null, s: '자꾸 꺼진다면' },
    { k: ['차단기', '누전'], s: '차단기가 자꾸 내려갈 때' },
    { k: ['콘센트', '스위치'], s: '열이 나거나 냄새가 날 때' },
    { k: ['조명', '등'], s: '조명이 깜빡일 때' },
    { k: null, s: '전기가 자꾸 끊길 때' },
  ],
  boiler: [
    { k: null, s: '에러 표시가 뜬다면' },
    { k: ['수리', '점검', '고장'], s: '온수가 미지근할 때' },
    { k: ['배관', '난방'], s: '한쪽만 따뜻할 때' },
    { k: null, s: '소리가 커졌을 때' },
  ],
  plumbing: [
    { k: null, s: '물소리가 계속 난다면' },
    { k: ['수전', '누수'], s: '물이 새는 자국이 보일 때' },
    { k: null, s: '수압이 약해졌을 때' },
  ],
  sewer: [
    { k: null, s: '자꾸 다시 막힌다면' },
    { k: ['악취', '냄새'], s: '냄새가 올라올 때' },
    { k: null, s: '물이 천천히 내려갈 때' },
  ],
  leakdetect: [
    { k: null, s: '벽지가 젖어 있다면' },
    { k: ['누수', '탐지'], s: '천장에 물자국이 생겼을 때' },
    { k: null, s: '수도요금이 갑자기 늘었을 때' },
  ],
  tankclean: [
    { k: null, s: '물에서 냄새가 날 때' },
    { k: null, s: '물이 탁해졌다면' },
    { k: null, s: '청소 주기가 지났다면' },
  ],
  interior: [
    { k: null, s: '마감이 벌어질 때' },
    { k: null, s: '예산부터 잡아야 한다면' },
    { k: null, s: '공간이 답답하게 느껴진다면' },
  ],
  grout: [
    { k: null, s: '줄눈이 검게 변했을 때' },
    { k: null, s: '물때가 반복된다면' },
    { k: null, s: '틈이 벌어졌다면' },
  ],
  coating: [
    { k: null, s: '표면이 벗겨질 때' },
    { k: null, s: '곰팡이가 다시 생긴다면' },
    { k: null, s: '결로가 반복된다면' },
  ],
  screen: [
    { k: null, s: '벌레가 계속 들어온다면' },
    { k: ['교체', '수리'], s: '방충망이 찢어졌을 때' },
    { k: null, s: '틀이 헐거워졌을 때' },
  ],
  cleaning: [
    { k: null, s: '묵은 때가 남아 있을 때' },
    { k: null, s: '냄새가 빠지지 않는다면' },
    { k: null, s: '입주 전 정리가 필요하다면' },
  ],
  airclean: [
    { k: null, s: '에어컨에서 냄새가 날 때' },
    { k: null, s: '바람이 약해졌다면' },
    { k: null, s: '곰팡이가 보인다면' },
  ],
  // ★ [세션61] buildingclean — 메뉴별 LEX 확장(데이터 전용. 엔진 로직 무수정).
  //   기존 3개(전부 k:null) → 메뉴 8종 × 10어절. 증상형 당첨 시 메뉴별 롱테일 분산.
  //   작성 규칙: ①메뉴명과 어휘 미중복(overlapsKw 통과) ②금지토큰 미보유
  //             ③어절 14자 이하(MAX_TITLE_LEN 40 축퇴 방지)
  buildingclean: [
    // ── 외벽청소 ──
    { k: ['외벽'], s: '빗물 자국이 남았다면' },
    { k: ['외벽'], s: '이끼가 번져 보일 때' },
    { k: ['외벽'], s: '매연 자국이 짙어질 때' },
    { k: ['외벽'], s: '줄눈이 검게 변했다면' },
    { k: ['외벽'], s: '유리면 물때가 굳었다면' },
    { k: ['외벽'], s: '고압세척을 고민한다면' },
    { k: ['외벽'], s: '도장면이 벗겨질 때' },
    { k: ['외벽'], s: '높은 층 오염이 남을 때' },
    { k: ['외벽'], s: '건물 외관이 낡아 보일 때' },
    { k: ['외벽'], s: '얼룩이 비 온 뒤 드러날 때' },
    // ── 계단청소 ──
    { k: ['계단'], s: '난간에 손자국이 남을 때' },
    { k: ['계단'], s: '발판이 미끄러울 때' },
    { k: ['계단'], s: '층별로 얼룩이 남을 때' },
    { k: ['계단'], s: '입주민 민원이 반복될 때' },
    { k: ['계단'], s: '먼지가 구석에 쌓일 때' },
    { k: ['계단'], s: '바닥 광택이 사라졌을 때' },
    { k: ['계단'], s: '공용부 냄새가 남을 때' },
    { k: ['계단'], s: '층수가 많아 부담될 때' },
    { k: ['계단'], s: '난간 도장이 벗겨질 때' },
    { k: ['계단'], s: '비 온 뒤 자국이 남을 때' },
    // ── 사무실청소 ──
    { k: ['사무실'], s: '출근 전에 끝내야 할 때' },
    { k: ['사무실'], s: '회의실 바닥이 눌렸다면' },
    { k: ['사무실'], s: '카펫 얼룩이 남았다면' },
    { k: ['사무실'], s: '탕비실 냄새가 날 때' },
    { k: ['사무실'], s: '유리 파티션이 뿌옇다면' },
    { k: ['사무실'], s: '먼지가 자꾸 앉을 때' },
    { k: ['사무실'], s: '주말에만 작업해야 한다면' },
    { k: ['사무실'], s: '이전 업체가 빠졌을 때' },
    { k: ['사무실'], s: '입주 첫 주라면' },
    { k: ['사무실'], s: '층 전체를 맡겨야 할 때' },
    // ── 상가청소 ──
    { k: ['상가'], s: '영업 전 시간이 짧을 때' },
    { k: ['상가'], s: '입구 유리가 뿌옇다면' },
    { k: ['상가'], s: '기름때가 바닥에 남을 때' },
    { k: ['상가'], s: '간판 주변이 지저분할 때' },
    { k: ['상가'], s: '점포마다 상태가 다를 때' },
    { k: ['상가'], s: '주말 손님이 많다면' },
    { k: ['상가'], s: '공용 화장실이 문제라면' },
    { k: ['상가'], s: '냄새가 손님에게 느껴질 때' },
    { k: ['상가'], s: '야간에만 가능하다면' },
    { k: ['상가'], s: '임대 전 정리가 필요할 때' },
    // ── 준공청소 ──
    { k: ['준공'], s: '분진이 남아 있을 때' },
    { k: ['준공'], s: '입주일이 촉박하다면' },
    { k: ['준공'], s: '스티커 자국이 남았다면' },
    { k: ['준공'], s: '창틀에 잔재가 낄 때' },
    { k: ['준공'], s: '페인트 방울이 굳었다면' },
    { k: ['준공'], s: '검수 전에 마무리해야 할 때' },
    { k: ['준공'], s: '층별로 상태가 다를 때' },
    { k: ['준공'], s: '마감재 손상이 걱정될 때' },
    { k: ['준공'], s: '입주 직전이라면' },
    { k: ['준공'], s: '자재 부스러기가 남을 때' },
    // ── 정기청소 ──
    { k: ['정기'], s: '주기를 정하기 어려울 때' },
    { k: ['정기'], s: '매번 상태가 달라질 때' },
    { k: ['정기'], s: '담당자가 자주 바뀔 때' },
    { k: ['정기'], s: '비용이 매달 달라질 때' },
    { k: ['정기'], s: '민원이 반복될 때' },
    { k: ['정기'], s: '주 몇 회가 맞을지 모를 때' },
    { k: ['정기'], s: '계약을 갱신할 시점이라면' },
    { k: ['정기'], s: '작업 내역이 불투명할 때' },
    { k: ['정기'], s: '규모가 커졌다면' },
    { k: ['정기'], s: '겨울철이 걱정될 때' },
    // ── 건물청소(대표) ──
    { k: ['건물청소'], s: '공용부 오염이 눈에 띌 때' },
    { k: ['건물청소'], s: '입주사 민원이 늘었다면' },
    { k: ['건물청소'], s: '로비 바닥이 흐려졌을 때' },
    { k: ['건물청소'], s: '엘리베이터 안이 지저분할 때' },
    { k: ['건물청소'], s: '화장실 냄새가 남을 때' },
    { k: ['건물청소'], s: '인력이 부족할 때' },
    { k: ['건물청소'], s: '외부 손님이 자주 온다면' },
    { k: ['건물청소'], s: '연식이 오래된 곳이라면' },
    { k: ['건물청소'], s: '월 단위로 맡기고 싶다면' },
    { k: ['건물청소'], s: '층마다 용도가 다를 때' },
    // ── 건물관리 체크리스트 ──
    { k: ['체크리스트'], s: '무엇부터 볼지 모를 때' },
    { k: ['체크리스트'], s: '담당자가 바뀌었다면' },
    { k: ['체크리스트'], s: '연간 계획을 세운다면' },
    { k: ['체크리스트'], s: '항목이 빠지는 것 같을 때' },
    { k: ['체크리스트'], s: '민원이 반복될 때' },
    { k: ['체크리스트'], s: '설비 점검 시기가 겹칠 때' },
    { k: ['체크리스트'], s: '계절마다 달라져야 할 때' },
    { k: ['체크리스트'], s: '기록이 남지 않을 때' },
    { k: ['체크리스트'], s: '입주사 요청이 늘었다면' },
    { k: ['체크리스트'], s: '비용을 예측하고 싶을 때' },
    // ── 범용(메뉴 매칭 실패 시) ──
    { k: null, s: '공용부 오염이 눈에 띌 때' },
    { k: null, s: '정기 관리를 시작한다면' },
    { k: null, s: '민원이 반복될 때' },
  ],
  // ★ [세션61] dobae — 메뉴별 LEX. 작성 규칙은 buildingclean과 동일
  //   (①메뉴명 어휘 미중복 ②금지토큰 미보유 ③어절 14자 이하)
  //   ※ NO_SYMPTOM_TOKENS('시공') 미포함 메뉴명이어야 증상형이 작동한다.
  dobae: [
    // 전체도배
    { k: ['전체'], s: '집 전체가 어두워 보일 때' },
    { k: ['전체'], s: '이사를 앞두고 있다면', m: 'sit' },
    { k: ['전체'], s: '천장까지 누렇게 변했다면' },
    { k: ['전체'], s: '방마다 색이 다를 때' },
    // 부분도배
    { k: ['부분'], s: '한쪽 면만 상했을 때' },
    { k: ['부분'], s: '기존 벽지가 단종됐다면', m: 'sit' },
    { k: ['부분'], s: '가구 자국이 남았을 때' },
    { k: ['부분'], s: '이음매가 신경 쓰일 때' },
    // 실크도배
    { k: ['실크'], s: '오염을 닦아내고 싶다면' },
    { k: ['실크'], s: '조명에 이음매가 비칠 때' },
    { k: ['실크'], s: '아이 방을 바꾸려 한다면', m: 'sit' },
    { k: ['실크'], s: '벽면이 울퉁불퉁할 때' },
    // 합지도배
    { k: ['합지'], s: '세를 놓기 전이라면', m: 'sit' },
    { k: ['합지'], s: '겹친 자국이 보일 때' },
    { k: ['합지'], s: '예산을 맞춰야 할 때', m: 'sit' },
    { k: ['합지'], s: '창고나 다용도실이라면', m: 'sit' },
    // 거주중도배
    { k: ['거주중'], s: '짐을 뺄 수 없을 때', m: 'sit' },
    { k: ['거주중'], s: '붙박이장이 놓여 있다면', m: 'sit' },
    { k: ['거주중'], s: '하루 만에 끝내야 할 때', m: 'sit' },
    { k: ['거주중'], s: '아이가 어린 집이라면', m: 'sit' },
    // 입주도배
    { k: ['입주'], s: '전출 당일이 촉박할 때', m: 'sit' },
    { k: ['입주'], s: '다른 공사와 겹칠 때', m: 'sit' },
    { k: ['입주'], s: '빈집 상태로 맡길 때', m: 'sit' },
    { k: ['입주'], s: '풀이 마를 시간이 부족할 때', m: 'sit' },
    // 곰팡이·결로
    { k: ['곰팡이', '결로'], s: '방 모서리가 검게 변할 때' },
    { k: ['곰팡이', '결로'], s: '겨울마다 반복된다면' },
    { k: ['곰팡이', '결로'], s: '외벽과 맞닿은 방이라면' },
    { k: ['곰팡이', '결로'], s: '닦아도 다시 올라올 때' },
    // 누수
    { k: ['누수'], s: '천장에 자국이 번졌다면' },
    { k: ['누수'], s: '벽을 타고 흘러내린 흔적' },
    { k: ['누수'], s: '아랫집 피해가 있을 때' },
    { k: ['누수'], s: '마른 뒤에도 자국이 남을 때' },
    // 도배장판
    { k: ['장판'], s: '바닥까지 함께 바꿀 때', m: 'sit' },
    { k: ['장판'], s: '걸레받이 마감이 고민될 때', m: 'sit' },
    { k: ['장판'], s: '일정을 하루로 잡았다면', m: 'sit' },
    { k: ['장판'], s: '기존 바닥이 들떴을 때' },
    // 범용
    { k: null, s: '어디부터 손봐야 할지 모를 때', m: 'sit' },
    { k: null, s: '오래된 집이라면', m: 'sit' },
  ],
  // ★ [세션62] flooring — 메뉴별 LEX. 작성 규칙은 dobae와 동일
  //   (①메뉴명 어휘 미중복 ②금지토큰 미보유 ③어절 14자 이하)
  //   ※ k 토큰 주의: '방'은 '주방장판'에도 걸린다 → '방장판'으로 좁힌다.
  //   ※ m:'sit' = 상황 어절(원인 계열 템플릿 금지). 미표기 = 증상형.
  flooring: [
    // 전체장판
    { k: ['전체'], s: '집 전체가 눌려 있을 때' },
    { k: ['전체'], s: '이사 날짜가 잡혔다면', m: 'sit' },
    { k: ['전체'], s: '구간마다 색이 다를 때' },
    // 거실장판
    { k: ['거실'], s: '가구 자국이 남았을 때' },
    { k: ['거실'], s: '창가만 누렇게 변했다면' },
    { k: ['거실'], s: '이음매가 벌어졌을 때' },
    // 방장판
    { k: ['방장판'], x: ['주방'], s: '침대 자리가 패였을 때' },
    { k: ['방장판'], x: ['주방'], s: '문턱 앞이 꺼졌다면' },
    { k: ['방장판'], x: ['주방'], s: '붙박이장 밑이 들떴을 때' },
    // 주방장판
    { k: ['주방'], s: '싱크대 앞이 들떴을 때' },
    { k: ['주방'], s: '밑면이 눅눅하다면' },
    { k: ['주방'], s: '기름때가 배어들었을 때' },
    // 베란다장판
    { k: ['베란다'], s: '겨울마다 물자국이 남을 때' },
    { k: ['베란다'], s: '배수구 주변이 삭았다면' },
    { k: ['베란다'], s: '새시 밑으로 물이 들 때' },
    // 현관장판
    { k: ['현관'], s: '중문 레일 옆이 찢어졌을 때' },
    { k: ['현관'], s: '단차 경계가 들뜰 때' },
    // 상가장판
    { k: ['상가'], s: '영업을 멈추기 어렵다면', m: 'sit' },
    { k: ['상가'], s: '출입구만 닳았을 때' },
    { k: ['상가'], s: '진열대 밑이 눌렸을 때' },
    // 사무실장판
    { k: ['사무실'], s: '집기를 옮기기 어렵다면', m: 'sit' },
    { k: ['사무실'], s: '의자 바퀴 자국이 남을 때' },
    { k: ['사무실'], s: '배선 위가 불룩할 때' },
    // 학원장판
    { k: ['학원'], s: '수업 사이에 끝내야 한다면', m: 'sit' },
    { k: ['학원'], s: '아래층 소음이 올라올 때' },
    { k: ['학원'], s: '책걸상 자국이 깊을 때' },
    // 병원장판
    { k: ['병원'], s: '진료를 멈추기 어렵다면', m: 'sit' },
    { k: ['병원'], s: '틈으로 물이 스밀 때' },
    { k: ['병원'], s: '침대 바퀴에 찍혔을 때' },
    // 마루시공 [세션71] — 자재축. k:'마루'는 마루시공에만 걸린다(공간축 10 CAT 미저촉)
    { k: ['마루'], s: '바닥이 한쪽으로 꺼졌을 때' },
    { k: ['마루'], s: '걸을 때 소리가 날 때' },
    { k: ['마루'], s: '이음 사이가 벌어졌을 때' },
    { k: ['마루'], s: '강마루와 강화마루가 헷갈린다면', m: 'sit' },
    // 범용
    { k: null, s: '어디부터 손봐야 할지 모를 때', m: 'sit' },
    { k: null, s: '한 자리만 계속 들뜰 때' },
  ],
  // ★ [세션63] film — 메뉴별 LEX. 작성 규칙은 dobae/flooring과 동일
  //   (①메뉴명 어휘 미중복 ②금지토큰 미보유 ③어절 14자 이하)
  //   ※ 메뉴명이 모두 '…필름'으로 끝난다 → 어절에 '필름'을 쓰지 않는다(overlapsKw 전량 탈락 방지).
  //   ※ m:'sit' = 상황 어절(원인 계열 템플릿 금지). 미표기 = 증상형.
  film: [
    // 전체필름
    { k: ['전체'], s: '집 안이 제각각일 때' },
    { k: ['전체'], s: '이사 날짜가 잡혔다면', m: 'sit' },
    { k: ['전체'], s: '색이 서로 안 맞을 때' },
    // 싱크대필름
    { k: ['싱크대'], s: '아래쪽이 부풀었을 때' },
    { k: ['싱크대'], s: '모서리가 일어났다면' },
    { k: ['싱크대'], s: '기름때가 눌어붙었을 때' },
    // 현관문필름
    { k: ['현관문'], s: '바깥쪽만 색이 바랬을 때' },
    { k: ['현관문'], s: '손잡이 옆이 눌렸다면' },
    { k: ['현관문'], s: '철판에 녹이 올라올 때' },
    // 방문필름
    { k: ['방문'], s: '아래가 긁혀 있을 때' },
    { k: ['방문'], s: '표면이 까져 벗겨졌다면' },
    { k: ['방문'], s: '개수가 많아 고민될 때', m: 'sit' },
    // 몰딩필름
    { k: ['몰딩'], s: '이은 자리가 벌어졌을 때' },
    { k: ['몰딩'], s: '코너가 깨졌다면' },
    { k: ['몰딩'], s: '벽만 새로 했을 때', m: 'sit' },
    // 붙박이장필름
    { k: ['붙박이장'], s: '여닫을 때 걸린다면' },
    { k: ['붙박이장'], s: '겉면이 뜨고 있을 때' },
    { k: ['붙박이장'], s: '떼지 못하는 구조라면', m: 'sit' },
    // 샷시필름
    { k: ['샷시'], s: '틀 아래가 눅눅할 때' },
    { k: ['샷시'], s: '실링이 갈라졌다면' },
    { k: ['샷시'], s: '겨울마다 물이 맺힐 때' },
    // 상가필름
    { k: ['상가'], s: '영업을 멈추기 어렵다면', m: 'sit' },
    { k: ['상가'], s: '냄새가 걱정될 때', m: 'sit' },
    { k: ['상가'], s: '손 닿는 자리만 닳았을 때' },
    // 사무실필름
    { k: ['사무실'], s: '근무 중에 해야 한다면', m: 'sit' },
    { k: ['사무실'], s: '칸막이만 낡아 보일 때' },
    { k: ['사무실'], s: '층마다 색이 다를 때' },
    // 엘리베이터필름
    { k: ['엘리베이터'], s: '멈출 수 있는 시간이 짧다면', m: 'sit' },
    { k: ['엘리베이터'], s: '안쪽 벽이 긁혔을 때' },
    { k: ['엘리베이터'], s: '버튼 주변이 지저분할 때' },
    // 범용
    { k: null, s: '어디부터 손봐야 할지 모를 때', m: 'sit' },
    { k: null, s: '같은 자리가 계속 뜰 때' },
  ],
  // ★ [세션63] door — 메뉴별 LEX. 작성 규칙은 dobae/flooring/film과 동일
  //   (①메뉴명 어휘 미중복 ②금지토큰 미보유 ③어절 14자 이하)
  //   ※ 메뉴명이 '…수리/…교체'로 끝나고 '문·도어'를 포함한다 →
  //     어절에 '문 / 도어 / 수리 / 교체'를 쓰지 않는다(overlapsKw 전량 탈락 방지).
  //   ※ k 토큰 주의: '슬라이딩'은 '붙박이장도어수리'에 없고, '붙박이장도어수리'는
  //     '슬라이딩도어수리'의 부분문자열이 아니다(개명으로 해소) → x 토큰 불필요.
  //     단 '힌지'는 '힌지교체'에만, '롤러'는 '롤러레일교체'에만 걸리도록 좁힌다.
  //   ※ m:'sit' = 상황 어절(원인 계열 템플릿 금지). 미표기 = 증상형.
  door: [
    // 슬라이딩도어수리
    { k: ['슬라이딩'], s: '밀 때 무거워졌다면' },
    { k: ['슬라이딩'], s: '중간에서 걸릴 때' },
    { k: ['슬라이딩'], s: '아래 틈이 벌어졌을 때' },
    // 포켓도어수리
    { k: ['포켓'], s: '벽 속으로 안 들어갈 때' },
    { k: ['포켓'], s: '손가락 폭만큼 남는다면' },
    { k: ['포켓'], s: '안쪽에서 소리가 날 때' },
    // 터닝도어수리
    { k: ['터닝'], s: '회전이 뻑뻑해졌다면' },
    { k: ['터닝'], s: '멈추는 자리가 달라질 때' },
    { k: ['터닝'], s: '축이 놀고 있을 때' },
    // 붙박이장도어수리
    { k: ['붙박이장'], s: '겹치는 순서가 어긋날 때' },
    { k: ['붙박이장'], s: '위쪽이 빠졌다면' },
    { k: ['붙박이장'], s: '한쪽만 기울었을 때' },
    // 중문수리
    { k: ['중문'], s: '연동이 따라오지 않을 때' },
    { k: ['중문'], s: '호차가 닳았다면' },
    { k: ['중문'], s: '아래가 덜컹거릴 때' },
    // 현관문수리
    { k: ['현관'], s: '올려야 잠기는 상태라면' },
    { k: ['현관'], s: '틈으로 바람이 들 때' },
    { k: ['현관'], s: '걸쇠가 안 걸릴 때' },
    // 방문수리
    { k: ['방문'], s: '틀에 걸려 안 닫힐 때' },
    { k: ['방문'], s: '아래가 바닥을 쓸 때' },
    { k: ['방문'], s: '틀이 뒤틀렸다면' },
    // 문손잡이수리
    { k: ['손잡이'], s: '잡아도 헛돌 때' },
    { k: ['손잡이'], s: '누르면 덜컥거린다면' },
    { k: ['손잡이'], s: '치수를 모를 때', m: 'sit' },
    // 도어클로저교체
    { k: ['클로저'], s: '쾅 소리가 날 때' },
    { k: ['클로저'], s: '기름이 배어 나온다면' },
    { k: ['클로저'], s: '끝까지 안 닫힐 때' },
    // 힌지교체
    { k: ['힌지'], s: '나사가 헛돌 때' },
    { k: ['힌지'], s: '한쪽으로 내려앉았다면' },
    { k: ['힌지'], s: '개수를 늘려야 할 때', m: 'sit' },
    // 롤러레일교체
    { k: ['롤러'], s: '같은 자리에서 끌릴 때' },
    { k: ['롤러'], s: '바닥 홈이 눌렸다면' },
    { k: ['롤러'], s: '바퀴가 깨졌을 때' },
    // 범용
    { k: null, s: '어디가 원인인지 모를 때', m: 'sit' },
    { k: null, s: '같은 증상이 반복될 때' },
  ],
  pestcontrol: [
    { k: null, s: '한 번 해도 다시 생길 때' },
    { k: null, s: '계속 다시 보인다면' },
    { k: null, s: '옆집까지 번졌다면' },
  ],
  birdcontrol: [
    { k: ['실외기'], s: '둥지를 튼다면' },
    { k: ['실외기'], s: '뒤편에 계속 모여든다면' },
    { k: ['베란다', '난간'], s: '배설물이 반복된다면' },
    { k: ['베란다', '난간'], s: '계속 들어온다면' },
    { k: ['망', '스파이크'], s: '같은 자리에 계속 앉는다면' },
    { k: ['망', '스파이크'], s: '막아도 다시 앉는다면' },
    { k: null, s: '계속 찾아온다면' },
    { k: null, s: '반복해서 돌아온다면' },
    { k: null, s: '소리와 냄새가 심해졌다면' },
  ],
  moving: [
    { k: null, s: '짐이 예상보다 많을 때' },
    { k: null, s: '날짜가 촉박하다면' },
    { k: null, s: '보관이 필요하다면' },
  ],
  // ★ [S219] window — 메뉴별 LEX. 작성 규칙은 dobae/flooring과 동일
  //   (①메뉴명 어휘 미중복 ②금지토큰 미보유 ③어절 12자 이하)
  //   ※ NO_SYMPTOM_TOKENS 보유 메뉴(창문단열시공·방범창설치)는 pickSymptom이 null을 내므로
  //     엔트리를 두지 않는다. 두 메뉴는 window 전용 풀(reinforce·residual)이 담당한다.
  window: [
    // 샷시교체
    { k: ['샷시'], s: '외풍이 심해졌을 때' },
    { k: ['샷시'], s: '여닫기가 뻑뻑할 때' },
    { k: ['샷시'], s: '이사를 앞두고 있다면', m: 'sit' },
    { k: ['샷시'], s: '결로가 반복될 때' },
    // 복층유리교체
    { k: ['복층', '유리'], s: '안쪽에 김이 서릴 때' },
    { k: ['복층', '유리'], s: '두 장 사이가 뿌옇다면' },
    { k: ['복층', '유리'], s: '겨울마다 물방울이 맺힐 때' },
    { k: ['복층', '유리'], s: '햇빛이 그대로 들어올 때' },
    // 창문누수수리
    { k: ['누수'], s: '비 온 뒤 자국이 번졌다면' },
    { k: ['누수'], s: '벽지가 젖어 있을 때' },
    { k: ['누수'], s: '아랫집 피해가 있을 때' },
    { k: ['누수'], s: '마른 뒤에도 얼룩이 남을 때' },
    // 창틀실리콘교체
    { k: ['실리콘'], s: '검은 곰팡이가 번질 때' },
    { k: ['실리콘'], s: '이음면이 갈라졌다면' },
    { k: ['실리콘'], s: '덧발라도 다시 올라올 때' },
    { k: ['실리콘'], s: '틈으로 바람이 들어올 때' },
    // 범용
    { k: null, s: '어디까지 손봐야 할지 모를 때', m: 'sit' },
    { k: null, s: '오래된 집이라면', m: 'sit' },
  ],
};

// 증상형 부적합 메뉴 — 신규 설치·제작류는 증상 축을 쓰지 않는다.
const NO_SYMPTOM_TOKENS = ['설치', '시공', '신설', '증설'];

// ── 증상형 Intent 템플릿 (LEX 매칭 시에만) ──────────────────
const SYMPTOM_INTENTS = [
  { id: 'sym_check', t: (rg, kw, s) => `${rg} ${kw}, ${s} 확인할 부분` },
  { id: 'sym_cause', t: (rg, kw, s) => `${rg} ${kw}, ${s} 원인 점검` },
  { id: 'sym_order', t: (rg, kw, s) => `${rg} ${kw}, ${s} 점검 순서` },
];

// ── 상황형 Intent 템플릿 (LEX 엔트리 m:'sit' 전용) ──────────
//   ★ [세션62] 증상형과 분리한 이유:
//     LEX 어절에는 '증상'(천장에 자국이 번졌다면)과 '상황'(이사를 앞두고 있다면)이 섞인다.
//     상황 어절에 '원인 점검'을 붙이면 "이사를 앞두고 있다면 원인 점검"처럼 의미가 어긋난다.
//     → m:'sit' 엔트리는 원인 계열 템플릿을 쓰지 않는다. m 미표기 = 'sym'(기존 동작 불변).
const SITUATION_INTENTS = [
  { id: 'sit_check', t: (rg, kw, s) => `${rg} ${kw}, ${s} 확인할 부분` },
  { id: 'sit_order', t: (rg, kw, s) => `${rg} ${kw}, ${s} 준비 순서` },
  { id: 'sit_std',   t: (rg, kw, s) => `${rg} ${kw}, ${s} 정하는 기준` },
];

// 제목 최대 길이(자). 초과 시 증상형 → 군 Intent 풀로 축퇴.
const MAX_TITLE_LEN = 40;

// 증상 어절이 메뉴명과 어휘를 반복하는지 검사.
//   예) kw="실외기실 비둘기퇴치" + s="실외기 뒤에 자리 잡았을 때" → '실외기' 중복 → 제외.
function overlapsKw(kw, s) {
  const toks = String(s).split(/[\s·,]+/).filter((t) => t.length >= 2);
  return toks.some((t) => {
    const stem = t.slice(0, 3).replace(/[가-힣]$/, (c) => c); // 어절 앞 3자 기준
    return kw.includes(t) || (stem.length >= 2 && kw.includes(stem));
  });
}

// 메뉴명에 맞는 증상 후보만 추린다. (k 매칭 우선, 없으면 범용 k:null)
function pickSymptom(industry, kw, seed) {
  const lex = SYMPTOM_LEX[industry];
  if (!lex || !lex.length) return null;
  if (NO_SYMPTOM_TOKENS.some((t) => kw.includes(t))) return null;
  // [세션62] x = 제외 토큰. 메뉴명이 서로 부분문자열인 경우를 가른다.
  //   예) '방장판'은 '주방장판'의 부분문자열 → 방장판 엔트리가 주방장판에 새는 것을 막는다.
  const matched = lex.filter((e) =>
    e.k && e.k.some((t) => kw.includes(t))
    && !(e.x && e.x.some((t) => kw.includes(t))));
  let pool = matched.length ? matched : lex.filter((e) => !e.k);
  // 메뉴명과 어휘가 겹치는 증상은 제외(제목 내 단어 반복 차단)
  const clean = pool.filter((e) => !overlapsKw(kw, e.s));
  pool = clean.length ? clean : lex.filter((e) => !e.k && !overlapsKw(kw, e.s));
  if (!pool.length) return null;
  // [세션62] 문자열 대신 엔트리 반환 — 호출부에서 m(sym/sit)으로 템플릿 풀을 고른다.
  const e = pool[(seed >>> 7) % pool.length];
  return { s: e.s, m: e.m === 'sit' ? 'sit' : 'sym' };
}

// ── 회전 해시 (업종+메뉴+일자) ───────────────────────────────
function rotSeed(industry, treatment) {
  const d = new Date();
  const day = `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`;
  const key = `${industry}|${treatment?.id || treatment?.name || ''}|${day}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

// ── 정리: 공백·중복 어절·지역 중복 방지 ─────────────────────
function normalizeTitle(title, region) {
  let t = String(title || '').replace(/\s{2,}/g, ' ').trim();
  if (region) {
    // 지역 2회 이상 등장 시 첫 번째만 유지
    const parts = t.split(region);
    if (parts.length > 2) t = parts[0] + region + parts.slice(1).join('').replace(/^\s+/, ' ');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

// 금지어 검사 — 메뉴명(kw) 자체에 포함된 어휘는 제외한다.
//   예) 메뉴명 "조류퇴치 체크리스트"는 data 소유 값이므로 금지 대상이 아니다.
function hasBanned(title, kw) {
  const rest = kw ? title.split(kw).join(' ') : title;
  return BANNED_TITLE_TOKENS.some((w) => rest.includes(w));
}

// ── 본 함수 ─────────────────────────────────────────────────
//   생성 실패(빈 결과·금지어 포함 등) 시 treatment.titlePatterns 폴백.
export function buildIntentTitle(region, treatment, industry) {
  try {
    const rg = String(region || '').trim();
    const kw = String(treatment?.name || '').trim();
    if (!kw) return fallbackTitle(region, treatment);

    const seed = rotSeed(industry, treatment);

    // 증상형 1/3 비중 — 메뉴명 매칭 성공 시에만. 실패하면 군 Intent 풀.
    const sym = seed % 3 === 0 ? pickSymptom(industry, kw, seed) : null;

    const groupPool = INDUSTRY_POOL_OVERRIDE[industry]
      || GROUP_POOL[INDUSTRY_GROUP[industry] || 'repair'];
    let title = '';
    if (sym) {
      const pool = sym.m === 'sit' ? SITUATION_INTENTS : SYMPTOM_INTENTS;
      const tpl = pool[(seed >>> 3) % pool.length];
      title = tpl.t(rg, kw, sym.s);
    }
    // 증상형 미사용 또는 길이 초과 → 군 Intent 풀로 축퇴
    if (!title || title.length > MAX_TITLE_LEN) {
      title = groupPool[seed % groupPool.length].t(rg, kw);
    }

    title = normalizeTitle(title, rg);
    if (!title || hasBanned(title, kw) || title.length < 6) return fallbackTitle(region, treatment);
    return title;
  } catch (_e) {
    return fallbackTitle(region, treatment);
  }
}

// ── null 반환판 — 핸들러가 자체 레거시 제목 로직을 폴백으로 쓸 때 사용.
//   (단지명/거주면적 토큰을 쓰는 업종은 핸들러 레거시 경로가 더 정확하다.)
// [S217 DOBAE-INTENT-BODY-ALIGNMENT-01] Intent decision SoT.
// pool/seed/template/title rules unchanged. Extracted from buildIntentTitleOrNull.
function _resolveIntentTpl(region, treatment, industry) {
  const rg = String(region || '').trim();
  const kw = String(treatment?.name || '').trim();
  if (!kw) return null;
  const seed = rotSeed(industry, treatment);
  const sym = seed % 3 === 0 ? pickSymptom(industry, kw, seed) : null;
  const groupPool = INDUSTRY_POOL_OVERRIDE[industry]
    || GROUP_POOL[INDUSTRY_GROUP[industry] || 'repair'];
  let tpl = null;
  let title = '';
  if (sym) {
    const pool = sym.m === 'sit' ? SITUATION_INTENTS : SYMPTOM_INTENTS;
    tpl = pool[(seed >>> 3) % pool.length];
    title = tpl.t(rg, kw, sym.s);
  }
  if (!title || title.length > MAX_TITLE_LEN) {
    tpl = groupPool[seed % groupPool.length];
    title = tpl.t(rg, kw);
  }
  return { tpl, title, rg, kw };
}

// [S217] Intent value only. Never returns the title string.
export function resolveIntentOrNull(region, treatment, industry) {
  try {
    const r = _resolveIntentTpl(region, treatment, industry);
    return r && r.tpl && r.tpl.id ? { id: r.tpl.id } : null;
  } catch (_e) {
    return null;
  }
}
export function buildIntentTitleOrNull(region, treatment, industry) {
  try {
    const r = _resolveIntentTpl(region, treatment, industry);
    if (!r) return null;
    const title = normalizeTitle(r.title, r.rg);
    if (!title || hasBanned(title, r.kw) || title.length < 6) return null;
    return title;
  } catch (_e) {
    return null;
  }
}

// ── 폴백: 기존 data.js titlePatterns (무수정 소비) ───────────
export function fallbackTitle(region, treatment) {
  const patterns = treatment?.titlePatterns || [];
  const pick = patterns.length
    ? patterns[Math.floor(Math.random() * patterns.length)]
    : `{region} ${treatment?.name || ''}`;
  return normalizeTitle(String(pick).replace(/\{region\}/g, region || ''), region);
}

export { GROUP_POOL, INDUSTRY_GROUP, SYMPTOM_LEX, BANNED_TITLE_TOKENS };
export default buildIntentTitle;
