// lib/nursinghome-data.js
// 요양원(노인요양시설) 업종 데이터셋
// ★ 제목 패턴은 data.js가 소유. 생성기는 titlePatterns를 소비만 한다.
// 화자 = 기관(요양원·사회복지사). 정보형. 의료·치료·광고 금지.
// 복사 베이스: daycare-data.js ← 데이터 교체 (daycare 원본 무수정)
//
// ★ 2트랙 통제 (선장 판정 2026-09-21)
//   FORBIDDEN  = 입력 유무와 무관하게 절대 금지 (법적·시점성·미검증)
//   FACT_GATE  = 검증된 입력이 있을 때만 사용 가능. 미입력 시 해당 문장 생략
//   두 축을 합산하지 않는다. QC 위반 판정 대상은 FORBIDDEN 뿐이다.
//
// ★ Purpose Spine (선장 보정 2026-09-21)
//   10 CAT 은 주제 분류가 아니다. CAT 마다 독립된
//     PURPOSE.question  검색자의 질문
//     PURPOSE.solve     이 글이 해결하는 것
//     PURPOSE.decide    독자가 내리게 되는 판단
//     PURPOSE.nextStep  판단 후 이어질 다음 행동
//   이 있어야 한다. 동일 소개문에서 키워드만 바꾼 생성은 FAIL.
//   purposeAnchors = 그 목적이 본문에 실제로 구현됐는지 검사할 판단축 (QC purposeHit).

export const NURSINGHOME_META = {
  industry: "nursinghome",
  label: "요양원",
  fullLabel: "요양원(노인요양시설)",
  greeting: "안녕하세요. {region} 요양원입니다. 어르신 입소와 돌봄 안내를 도와드립니다.",
  voice: "기관(요양원·사회복지사)",
  badge: "신규",
  // 결정주기: 가족의사결정
  decisionCycle: "family",
  // ★ 비용 단정 금지 — 시설급여 본인부담은 전국 동일 구조. 금액은 "상담 시 안내"
  costTone: "consult",
};

// ─────────────────────────────────────────────────────────────
// 트랙 1. FORBIDDEN — 절대 금지 (입력 유무 무관)
//   → prompts.js FORBIDDEN 으로 직결. runQC 위반 검사 대상.
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_FORBIDDEN = [
  // 의료행위·효과 단정
  "치료", "완치", "호전", "회복 보장", "건강 회복 보장",
  // 근거 없는 서열·단정
  "최고", "1위", "전국 최고", "지역 1위", "무조건", "유일",
  // 안전·사고 보장
  "안전 보장", "사고 없음", "사고 제로", "낙상 없음",
  // 비용 임의 조정
  "본인부담 할인", "비용 할인", "입소비 할인", "특별가",
  // ★ 시점성 — 작성 시점과 독자 열람 시점이 달라 허위가 된다
  "입소 가능", "즉시 입소", "대기 없음", "대기자 없음", "바로 입소",
  // ★ 미검증 수치 (인력배치 기준 오인 유발)
  "2.1:1",
];

// ─────────────────────────────────────────────────────────────
// 트랙 2. FACT_GATE — 검증 입력이 있을 때만 사용 가능한 시설 고유 사실
//   → prompts.js SYSTEM_PROMPT [사실 게이트] 블록으로 주입.
//   ※ FORBIDDEN 과 합산 금지. 금칙어가 아니라 "조건부 허용" 축이다.
//   ※ 이번 버전은 전용 입력 UI/DB 가 없으므로 사실상 전량 미입력 → 전부 생략 대상.
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_FACT_GATE = [
  "공단 평가등급", "정원", "현원", "인력 배치",
  "프로그램", "식사", "식단", "간식",
  "의료기관 연계", "촉탁의", "협력병원",
  "치매전담실", "치매전담형",
  "시설 공간", "생활실", "공용공간", "옥외공간",
  "면회 규정", "외출·외박 규정",
  "비용 실액", "월 비용",
];

// FACT_GATE 본문 검출 패턴 (PATCH-09 Gate — 미입력 시설사실 0건 검사용)
//   generateNursinghome.js runQC 에서 소비. 적중 시 해당 생성본은 Gate FAIL.
export const NURSINGHOME_FACT_PATTERNS = [
  { key: "정원", re: /정원\s*[0-9]+\s*(명|인)/ },
  { key: "현원", re: /현원\s*[0-9]+\s*(명|인)/ },
  { key: "평가등급", re: /(공단\s*)?평가\s*(결과\s*)?[ABCDE]\s*등급/ },
  { key: "인력배치", re: /[0-9]+\s*(\.[0-9]+)?\s*:\s*[0-9]+/ },
  { key: "비용실액", re: /[0-9][0-9,]*\s*만?\s*원/ },
  { key: "의료연계", re: /(촉탁의|협력\s*병원|연계\s*병원)\s*(가|는|를|와|과)?\s*(있|운영|배치|계약)/ },
  { key: "치매전담", re: /치매전담(실|형)\s*(을|를|이|가)?\s*(운영|갖추|보유|운영중)/ },
  { key: "식사제공", re: /(조식|중식|석식|식단표|간식)\s*(을|를|이|가)?\s*(제공|운영|구성)/ },
  { key: "프로그램운영", re: /프로그램\s*(을|를)?\s*(운영|진행|제공)(하고|합니다|중)/ },
  { key: "입소가능", re: /(입소\s*가능|대기\s*(자\s*)?없|즉시\s*입소)/ },
];

// ─────────────────────────────────────────────────────────────
// 카테고리 축 — RESEARCH-01 10 CAT (SoT. 임의 축소 금지)
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_CATS = [
  "장기요양등급",
  "입소자격",
  "입소절차",
  "비용구조",
  "비급여",
  "요양원vs요양병원",
  "치매",
  "시설",
  "면회/외박",
  "선택기준",
];

// ★ 메뉴 1개당: id / industry / name / cat / emoji / titlePatterns / keywords / compareWith
//   + DIRECTION 4필드(concern·effect·hook·keyword)
//   + factGate: 이 메뉴가 의존하는 시설 고유 사실(없으면 [] = 제도·일반정보만으로 성립)
//   + PURPOSE 4필드(question·solve·decide·nextStep) ★ CAT마다 달라야 한다
//   + purposeAnchors: 목적 구현 여부를 본문에서 검사할 판단축 (QC purposeHit)
export const NURSINGHOME_TREATMENTS = [
  {
    id: "nursinghome_grade",
    industry: "nursinghome",
    name: "장기요양등급 신청·판정",
    cat: "장기요양등급",
    emoji: "📄",
    titlePatterns: [
      "{region} 요양원 입소 전 장기요양등급부터 확인하세요",
      "{region} 요양원, 장기요양등급에 따라 시설급여 대상이 어떻게 나뉘나요",
      "{region} 요양원 알아보는 중이라면 장기요양등급 신청은 어디서 하나요",
      "부모님 장기요양등급 신청, {region}에서 어떤 순서로 진행되나요",
      "{region} 요양원 상담 전 장기요양등급이 없다면 먼저 할 일",
      "장기요양등급 판정은 누가 하나요 — {region} 요양원 보호자 안내",
      "{region} 요양원과 장기요양등급, 방문조사부터 결과 통보까지",
      "{region} 요양원 이용 전 장기요양인정서는 어떻게 받나요",
      "장기요양등급 결과가 나오기까지, {region} 요양원 보호자 체크 순서",
      "장기요양등급 신청 서류, {region} 요양원 알아보기 전에 챙길 것",
    ],
    keywords: ["장기요양등급 신청", "요양원 등급", "등급판정 절차", "노인장기요양보험"],
    compareWith: "요양병원",
    factGate: [],
    PURPOSE: {
      question: "부모님이 장기요양등급을 받을 수 있는지, 몇 등급부터 요양원이 되는지",
      solve: "등급이 없는 상태에서 무엇부터 신청해야 하는지 경로를 잡아준다",
      decide: "지금 등급 신청 단계인지, 이미 받은 등급으로 시설을 알아볼 단계인지",
      nextStep: "인정서·이용계획서를 확인한 뒤 지역 내 시설 유형을 비교하는 단계",
    },
    purposeAnchors: ["신청", "판정", "등급", "확인"],
    primaryAnswerAnchors: ["등급", "신청"],
    decisionPoints: ["방문조사", "등급판정", "인정서"],
    closingAnchors: ["인정서", "이용계획서", "비교"],
    DIRECTION: {
      concern: "요양원에 모시려면 등급이 먼저 필요한데 어떻게 받는지 모름",
      effect: "신청처·방문조사·등급판정위원회까지 제도 절차를 순서대로 안내",
      hook: "요양원 알아보기 전에 장기요양등급부터 확인하셔야 하는데요",
      keyword: "장기요양등급 신청",
    },
  },
  {
    id: "nursinghome_eligibility",
    industry: "nursinghome",
    name: "입소자격(입소 대상)",
    cat: "입소자격",
    emoji: "📋",
    titlePatterns: [
      "{region} 요양원 입소 대상은 어떻게 되나요?",
      "{region} 요양원, 어떤 어르신이 입소할 수 있을까요",
      "등급은 받았는데 {region} 요양원 입소가 되는지 궁금하시다면",
      "{region} 요양원 시설급여 대상, 1·2등급과 3~5등급은 어떻게 다른가요",
      "3~5등급 부모님, {region} 요양원 시설급여 대상이 되려면",
      "{region} 요양원 알아보기 전 시설급여 대상 여부부터 확인하는 법",
      "인지지원등급이라면 {region} 요양원 시설급여 대상일까요",
      "우리 부모님은 {region} 요양원 대상일까 — 등급별 구분",
      "{region} 요양원 입소 대상, 등급판정위원회 인정이 필요한 경우",
      "{region} 요양원 대상인지 헷갈릴 때 보는 등급별 기준",
    ],
    keywords: ["요양원 입소자격", "요양원 입소 대상", "시설급여 대상", "등급별 이용"],
    compareWith: "주간보호센터",
    factGate: [],
    PURPOSE: {
      question: "우리 부모님이 요양원에 들어갈 수 있는가",
      solve: "등급 보유와 시설급여 대상은 다르다는 점을 구분해준다",
      decide: "시설급여 대상인지, 재가급여 쪽이 맞는지",
      nextStep: "대상이 확인되면 지역 요양원 상담 목록을 만드는 단계",
    },
    purposeAnchors: ["대상", "시설급여", "재가", "구분"],
    primaryAnswerAnchors: ["시설급여", "대상"],
    decisionPoints: ["등급", "시설급여", "재가"],
    closingAnchors: ["상담", "확인", "목록"],
    DIRECTION: {
      concern: "등급은 있는데 시설 입소 대상에 해당하는지 판단이 안 됨",
      effect: "시설급여 대상 등급과 등급외 판정 시 선택지를 구분해 안내",
      hook: "등급을 받으셨더라도 시설급여 대상인지는 따로 확인이 필요합니다",
      keyword: "요양원 입소자격",
    },
  },
  {
    id: "nursinghome_process",
    industry: "nursinghome",
    name: "입소 절차",
    cat: "입소절차",
    emoji: "🧭",
    titlePatterns: [
      "{region} 요양원 입소 절차, 무엇부터 준비해야 할까요",
      "{region} 요양원 입소 상담부터 계약까지 순서 정리",
      "{region} 요양원 입소 서류, 미리 알아두면 좋은 것들",
      "{region} 요양원 첫 상담 전에 준비할 서류",
      "{region} 요양원 입소까지 4단계, 상담부터 계약 준비까지",
      "장기요양인정서 받은 뒤 {region} 요양원 입소는 어떻게 진행되나요",
      "{region} 요양원 사전 방문 상담에서는 무엇을 하나요",
      "{region} 요양원 계약 전에 확인해야 할 입소 절차",
      "처음 요양원을 알아보는 {region} 보호자를 위한 입소 순서",
      "{region} 요양원 입소 준비, 장기요양인정서와 이용계획서 확인 단계",
    ],
    keywords: ["요양원 입소절차", "요양원 상담", "입소 서류", "장기요양인정서"],
    compareWith: "요양병원",
    factGate: [],
    PURPOSE: {
      question: "요양원에 모시려면 무엇부터 어떻게 해야 하는가",
      solve: "상담부터 계약까지의 순서와 준비물을 앞당겨 보여준다",
      decide: "지금 어느 단계에 서 있는지",
      nextStep: "서류를 갖춘 뒤 사전 방문을 잡는 단계",
    },
    purposeAnchors: ["상담", "서류", "사전 방문", "계약"],
    primaryAnswerAnchors: ["절차", "상담"],
    decisionPoints: ["서류", "사전 방문", "계약"],
    closingAnchors: ["방문", "준비"],
    DIRECTION: {
      concern: "어디에 먼저 연락하고 무엇을 준비해야 하는지 순서를 모름",
      effect: "상담 → 서류 준비 → 사전 방문 → 계약까지 일반 절차를 순서대로 안내",
      hook: "요양원 입소는 절차를 알고 계시면 훨씬 수월하게 진행됩니다",
      keyword: "요양원 입소절차",
    },
  },
  {
    id: "nursinghome_cost",
    industry: "nursinghome",
    name: "입소비용 구조(본인부담금)",
    cat: "비용구조",
    emoji: "💳",
    titlePatterns: [
      "{region} 요양원 비용은 어떤 구조로 나뉘나요",
      "{region} 요양원 본인부담금, 제도부터 이해하기",
      "{region} 요양원 비용 상담 전에 알아두실 점",
      "{region} 요양원 본인부담률, 일반·감경·기초수급은 어떻게 다른가요",
      "{region} 요양원 비용, 급여와 비급여를 나눠 보는 방법",
      "{region} 요양원 비용, 시설마다 달라지는 부분은 어디인가요",
      "감경 대상이라면 {region} 요양원 본인부담은 어떻게 되나요",
      "{region} 요양원 견적을 받기 전 보호자가 알아둘 비용 구조",
      "기초생활수급자 부모님, {region} 요양원 급여 본인부담은",
      "{region} 요양원 비용 비교, 총액보다 구조를 먼저 보는 이유",
    ],
    keywords: ["요양원 비용", "요양원 본인부담금", "시설급여 부담률", "요양원 비용 구조"],
    compareWith: "요양병원",
    factGate: ["비용 실액", "월 비용"],
    PURPOSE: {
      question: "대체 무엇을 얼마나 부담하는 구조인가",
      solve: "총액이 아니라 급여·비급여로 나뉘는 부담 구조를 이해시킨다",
      decide: "우리 집이 감경 대상인지, 어느 항목을 더 확인해야 하는지",
      nextStep: "상담에서 급여·비급여를 나눈 견적을 요청하는 단계",
    },
    purposeAnchors: ["급여", "비급여", "본인부담", "감경"],
    primaryAnswerAnchors: ["본인부담", "급여"],
    decisionPoints: ["비급여", "감경", "본인부담"],
    closingAnchors: ["상담", "견적", "확인"],
    DIRECTION: {
      concern: "한 달에 얼마가 드는지 감이 안 잡혀 상담 자체가 부담스러움",
      effect: "급여항목 본인부담률과 비급여가 나뉘는 구조를 설명. 금액 단정은 하지 않음",
      hook: "요양원 비용은 금액을 먼저 묻기보다 구조를 아시면 이해가 빠릅니다",
      keyword: "요양원 본인부담금",
    },
  },
  {
    id: "nursinghome_nonbenefit",
    industry: "nursinghome",
    name: "비급여 항목",
    cat: "비급여",
    emoji: "🧾",
    titlePatterns: [
      "{region} 요양원 비급여 항목은 무엇이 있나요",
      "{region} 요양원 급여·비급여 구분하기",
      "{region} 요양원 상담 시 비급여를 꼭 확인하셔야 하는 이유",
      "{region} 요양원 안내 비용 외에 따로 드는 항목",
      "{region} 요양원 식사재료비·상급침실료·이미용비는 무엇인가요",
      "{region} 요양원 계약 전 비급여 항목표 확인하기",
      "{region} 요양원 비급여, 시설마다 구성이 다를 수 있는 항목",
      "{region} 요양원 상급침실 이용 시 추가비용, 무엇을 확인할까요",
      "비급여 항목표를 받았다면 {region} 요양원 보호자가 볼 부분",
      "{region} 요양원 비용 상담에서 비급여를 물어보는 법",
    ],
    keywords: ["요양원 비급여", "식사재료비", "상급침실료", "이미용비"],
    compareWith: "주간보호센터",
    factGate: ["비용 실액"],
    PURPOSE: {
      question: "안내받은 비용 말고 추가로 나가는 것이 있는가",
      solve: "비급여가 왜 시설마다 다른지, 무엇을 물어야 하는지 알려준다",
      decide: "비교 대상 시설들의 비급여 구성을 직접 확인할지",
      nextStep: "계약 전 비급여 항목표를 요청하는 단계",
    },
    purposeAnchors: ["비급여", "항목", "시설마다", "확인"],
    primaryAnswerAnchors: ["비급여", "항목"],
    decisionPoints: ["식사재료비", "상급침실료", "항목표"],
    closingAnchors: ["확인", "계약"],
    DIRECTION: {
      concern: "안내받은 비용 외에 추가로 나가는 항목이 있는지 불안함",
      effect: "식사재료비·이미용비·상급침실료 등 비급여 항목의 성격을 설명",
      hook: "요양원 비용에서 가장 많이 놓치시는 부분이 비급여 항목입니다",
      keyword: "요양원 비급여",
    },
  },
  {
    id: "nursinghome_vs_hospital",
    industry: "nursinghome",
    name: "요양원 vs 요양병원",
    cat: "요양원vs요양병원",
    emoji: "⚖️",
    titlePatterns: [
      "{region} 요양원과 요양병원, 무엇이 다른가요",
      "요양원이 맞을까요 요양병원이 맞을까요 — {region} 기준 정리",
      "{region} 요양원 알아보기 전에 요양병원과 비교해보세요",
      "{region} 부모님 요양원일까 요양병원일까, 의료 필요도로 나누기",
      "{region} 요양원과 요양병원, 적용 제도는 어떻게 다른가요",
      "장기요양등급과 건강보험, {region} 요양원·요양병원 구분 기준",
      "{region} 요양병원 대신 요양원을 알아볼 때 확인할 점",
      "{region} 요양원·요양병원 고민될 때 의사 소견과 공단 판정 확인하기",
      "생활 돌봄인지 의료 처치인지, {region} 요양원·요양병원 선택 전에",
      "{region} 요양원과 요양병원 비용 산정 방식의 차이",
    ],
    keywords: ["요양원 요양병원 차이", "요양원 비교", "장기요양 시설급여", "의료 필요도"],
    compareWith: "요양병원",
    factGate: [],
    PURPOSE: {
      question: "요양원으로 모셔야 하는가 요양병원으로 모셔야 하는가",
      solve: "의료 필요도라는 하나의 기준으로 갈림길을 정리한다",
      decide: "지금 어르신 상태가 어느 쪽 제도에 해당하는지",
      nextStep: "해당하는 유형의 기관만 추려서 알아보는 단계",
    },
    purposeAnchors: ["의료", "돌봄", "기준", "판단"],
    primaryAnswerAnchors: ["의료", "차이"],
    decisionPoints: ["의료 필요도", "돌봄", "제도"],
    closingAnchors: ["확인", "판단"],
    DIRECTION: {
      concern: "의료적 처치가 필요한지 생활 돌봄이 필요한지 판단이 안 됨",
      effect: "근거 법·재원·인력 구성이 다르다는 제도 차이를 중심으로 구분 안내",
      hook: "요양원과 요양병원은 이름은 비슷하지만 제도부터 다릅니다",
      keyword: "요양원 요양병원 차이",
    },
  },
  {
    id: "nursinghome_dementia",
    industry: "nursinghome",
    name: "치매 어르신 돌봄",
    cat: "치매",
    emoji: "🧠",
    titlePatterns: [
      "치매 어르신, {region} 요양원 입소를 고민하고 계신다면",
      "{region} 요양원에서 치매 돌봄은 어떻게 이루어지나요",
      "{region} 요양원 치매 관련 제도, 보호자가 알아두실 점",
      "치매 진단받은 부모님, {region} 요양원 시설급여 대상 확인하기",
      "{region} 요양원 치매전담 지정 여부는 어떻게 확인하나요",
      "{region} 요양원 방문 시 치매 어르신 보호자가 볼 부분",
      "치매 어르신 3~5등급, {region} 요양원 시설급여 인정 사유 확인하기",
      "{region} 요양원 치매 돌봄, 인지지원등급과 장기요양등급의 차이",
      "치매 부모님 {region} 요양원 후보 좁히는 기준",
      "{region} 요양원 상담 전 치매 어르신 상태를 정리하는 법",
    ],
    keywords: ["요양원 치매", "치매전담형 장기요양기관", "치매 돌봄", "인지지원"],
    compareWith: "주간보호센터",
    factGate: ["치매전담실", "프로그램"],
    PURPOSE: {
      question: "치매가 있는데 요양원이 맞는지, 어떤 곳을 봐야 하는지",
      solve: "치매전담형 지정이라는 제도 축을 알려 비교 기준을 만든다",
      decide: "일반 시설로 충분한지, 치매전담 지정 기관을 찾아야 하는지",
      nextStep: "후보 시설의 치매전담형 지정 여부를 확인하는 단계",
    },
    purposeAnchors: ["치매", "전담", "지정", "확인"],
    primaryAnswerAnchors: ["치매", "전담"],
    decisionPoints: ["지정", "인지", "돌봄"],
    closingAnchors: ["확인", "상담"],
    DIRECTION: {
      concern: "치매가 진행되어 가정 돌봄이 한계에 다다랐다는 판단",
      effect: "치매전담형 지정 제도와 일반 시설의 차이를 제도 정보로 설명",
      hook: "치매 어르신 돌봄은 가족만의 힘으로 버티기 어려운 시점이 옵니다",
      keyword: "요양원 치매 돌봄",
    },
  },
  {
    id: "nursinghome_facility",
    industry: "nursinghome",
    name: "시설 환경 확인 기준",
    cat: "시설",
    emoji: "🏠",
    titlePatterns: [
      "{region} 요양원 방문 시 시설에서 확인하실 점",
      "{region} 요양원 생활 환경, 무엇을 보아야 할까요",
      "{region} 요양원 사전 방문 체크 포인트",
      "{region} 요양원 방문할 때 동선과 단차 보는 법",
      "{region} 요양원 채광·환기·위생, 직접 가서 확인할 것",
      "사진만으로 판단하기 어려운 {region} 요양원 생활 공간",
      "{region} 요양원 공용 공간과 욕실, 방문 때 확인할 부분",
      "{region} 요양원 어르신과 직원의 대화 방식, 방문에서 보는 법",
      "{region} 요양원 여러 곳 방문 후 비교하는 관점",
      "{region} 요양원 생활실에서 화장실·식당까지 거리 확인하기",
    ],
    keywords: ["요양원 시설", "요양원 방문 확인", "요양원 생활실", "요양원 환경"],
    compareWith: "요양병원",
    factGate: ["시설 공간", "생활실", "공용공간", "옥외공간", "정원"],
    PURPOSE: {
      question: "요양원을 볼 때 무엇을 확인해야 하는가",
      solve: "사진으로 알 수 없는 것과 직접 봐야 아는 것을 나눠준다",
      decide: "방문 때 무엇을 보고 무엇을 물을지",
      nextStep: "체크 관점을 들고 사전 방문을 가는 단계",
    },
    purposeAnchors: ["방문", "확인", "관점", "질문"],
    primaryAnswerAnchors: ["확인", "방문"],
    decisionPoints: ["동선", "위생", "분위기"],
    closingAnchors: ["방문", "확인"],
    DIRECTION: {
      concern: "어떤 시설이 좋은 시설인지 기준을 모른 채 방문하게 됨",
      effect: "보호자가 직접 확인해야 할 관점(동선·채광·위생·소음 등)을 기준으로 안내",
      hook: "요양원은 사진보다 직접 보셔야 알 수 있는 부분이 많습니다",
      keyword: "요양원 시설 확인",
    },
  },
  {
    id: "nursinghome_visit",
    industry: "nursinghome",
    name: "면회·외출·외박",
    cat: "면회/외박",
    emoji: "🤝",
    titlePatterns: [
      "{region} 요양원 면회는 어떻게 진행되나요",
      "{region} 요양원 외출·외박, 보호자가 알아두실 점",
      "{region} 요양원 입소 후 가족 면회, 계약 전에 물어볼 것",
      "{region} 요양원 외출·외박은 어떤 절차로 진행되나요",
      "{region} 요양원 면회 시간과 예약 방식, 시설마다 다른 부분",
      "감염병 상황에서 {region} 요양원 면회는 어떻게 되나요",
      "{region} 요양원 외출·외박 사전 협의, 무엇을 확인할까요",
      "입소 후에도 부모님을 자주 뵐 수 있을까 — {region} 요양원 면회 확인",
      "{region} 요양원 상담 때 면회·외박 운영 방식 확인하기",
      "{region} 요양원 가족 면회 방식, 기관마다 어떻게 다른가요",
    ],
    keywords: ["요양원 면회", "요양원 외박", "요양원 외출", "입소 후 가족"],
    compareWith: "주간보호센터",
    factGate: ["면회 규정", "외출·외박 규정"],
    PURPOSE: {
      question: "입소하고 나면 가족과 어떻게 만날 수 있는가",
      solve: "면회·외출·외박이 제도적으로 닫힌 것이 아님을 설명한다",
      decide: "가족의 돌봄 참여를 어떤 형태로 이어갈지",
      nextStep: "계약 전 면회·외박 운영 방식을 확인하는 단계",
    },
    purposeAnchors: ["면회", "외출", "외박", "가족"],
    primaryAnswerAnchors: ["면회", "가족"],
    decisionPoints: ["외출", "외박", "협의"],
    closingAnchors: ["확인", "계약"],
    DIRECTION: {
      concern: "입소하면 자주 못 뵙게 되는 것 아닌지 걱정",
      effect: "면회·외출·외박이 제도적으로 가능하다는 점과 확인 방법을 안내",
      hook: "입소는 헤어짐이 아니라 돌봄 방식이 바뀌는 일입니다",
      keyword: "요양원 면회",
    },
  },
  {
    id: "nursinghome_choice",
    industry: "nursinghome",
    name: "요양원 선택기준",
    cat: "선택기준",
    emoji: "✅",
    titlePatterns: [
      "{region} 요양원 선택할 때 기준 4가지",
      "{region} 요양원 어떻게 고르면 좋을까요",
      "{region} 요양원 상담 전 정리해두면 좋은 기준",
      "{region} 요양원 여러 곳을 봤다면, 거리부터 비교하기",
      "{region} 요양원 고를 때 돌봄 필요도와 비용 구조 함께 보기",
      "{region} 요양원 후보들을 같은 기준으로 비교하는 법",
      "{region} 요양원 선택, 비용 구조의 투명성 확인하기",
      "{region} 요양원 보호자와의 소통 방식은 어떻게 보나요",
      "{region} 요양원 결정 전 가족이 함께 정할 네 가지",
      "{region} 요양원 방문 뒤 후보를 좁히는 순서",
    ],
    keywords: ["요양원 선택기준", "요양원 고르는 법", "요양원 상담", "요양원 비교"],
    compareWith: "요양병원",
    factGate: [],
    PURPOSE: {
      question: "여러 곳을 봤는데 그래서 어떻게 고르는가",
      solve: "흩어진 비교 항목을 네 개 축으로 줄여 결론을 내게 한다",
      decide: "후보 중 어디를 먼저 상담할지",
      nextStep: "후보 두세 곳을 같은 기준으로 비교 상담하는 단계",
    },
    purposeAnchors: ["거리", "돌봄 필요도", "비용", "소통"],
    primaryAnswerAnchors: ["기준", "선택"],
    decisionPoints: ["거리", "돌봄 필요도", "비용", "소통"],
    closingAnchors: ["비교", "상담"],
    DIRECTION: {
      concern: "여러 곳을 봐도 무엇을 기준으로 정해야 할지 결론이 안 남",
      effect: "거리·돌봄 필요도·비용 구조·소통 방식 네 축으로 기준을 정리",
      hook: "요양원은 좋은 곳보다 어르신께 맞는 곳을 찾는 일에 가깝습니다",
      keyword: "요양원 선택기준",
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 정보블럭 데이터 — 4 → 10 확장 (선장 승인 2026-09-21, STEP 4-REWORK)
//   ★ 대원칙: 정보 삭제 금지. 목적형 = 짧은 글이 아니다.
//     수정 목표는 정보 제거가 아니라 "목적의 위계화"다.
//   ※ 시설 고유 사실(프로그램·식사·시설공간 실측)은 FACT_GATE 이므로 블록에 넣지 않는다.
//     블록은 제도 정보 + "확인 관점" 으로만 구성한다.
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_INFO_BLOCKS = {
  gradeApply: {
    title: "장기요양등급 신청 경로",
    items: [
      "신청처: 국민건강보험공단 지사 또는 노인장기요양보험 누리집",
      "제출: 장기요양인정 신청서, 공단이 안내하는 대상자는 의사소견서",
      "절차: 신청 → 공단 직원 방문조사 → 등급판정위원회 심의 → 인정 결과 통보",
      "결과물: 장기요양인정서, 표준장기요양이용계획서",
    ],
  },
  // ★ FACT-VERIFY-NURSINGHOME-ELIG-01 확정 (선장 원문 대조 2026-09-21)
  //   출처: 국가법령정보센터 「장기요양급여 제공기준 및 급여비용 산정방법 등에 관한 고시」 제2조②·③
  //   폐기: 구 elig_diff(전 등급 포괄 일반화 오류) / 구 elig_home(사유 1종만·주체 누락) / 구 elig_home_care(급여 예시 과잉)
  //   ※ 이 items 는 NURSINGHOME_FACT_STATEMENTS 의 srcText 와 1:1 동기화. 한 글자라도 바꾸면 해당 슬롯 차단.
  eligibility: {
    title: "입소 대상",
    items: [
      "장기요양 1·2등급 수급자는 재가급여 또는 시설급여를 이용할 수 있습니다.",
      "장기요양 3~5등급 수급자는 원칙적으로 재가급여를 이용하며, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받은 경우 시설급여를 이용할 수 있습니다.",
      "3~5등급은 등급 판정만으로 시설급여를 이용하는 것이 아니라, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받아야 합니다.",
      "3~5등급의 시설급여 인정 사유에는 주수발 가족으로부터 수발이 곤란한 경우, 주거환경이 열악하여 시설입소가 불가피한 경우, 치매 등에 따른 문제행동으로 재가급여를 이용할 수 없는 경우가 포함됩니다.",
      "인지지원등급 수급자는 시설급여 이용 대상에 포함되지 않으며, 고시에서 정한 재가급여 범위 내에서 이용합니다.",
      "3~5등급에서 시설급여 필요성을 인정받지 않은 경우에는 재가급여 이용 범위에서 서비스를 확인합니다.",
    ],
  },
  process: {
    title: "입소 절차",
    items: [
      "① 전화·방문 상담",
      "② 장기요양인정서·표준장기요양이용계획서 확인",
      "③ 사전 방문 및 어르신 상태 상담",
      "④ 계약 및 입소 준비",
    ],
  },
  cost: {
    title: "비용 구조 안내",
    items: [
      "급여항목 본인부담: 일반 20% / 감경 대상 12%·8% / 기초생활수급 면제",
      "비급여: 식사재료비, 상급침실료, 이·미용비 등(별도)",
      "※ 등급·이용기간·비급여 구성에 따라 달라지므로 정확한 금액은 상담 시 안내",
    ],
  },
  nonbenefit: {
    title: "비급여 항목",
    items: [
      "식사재료비 — 급여에 포함되지 않는 재료 부담분",
      "상급침실료 — 기준 외 침실(1·2인실 등) 이용 시",
      "이·미용비 — 개인 위생·이미용 서비스",
      "식사재료비, 상급침실 이용에 따른 추가비용, 이·미용비는 장기요양급여 범위에서 제외되는 비급여대상입니다.",
      "보건복지부장관이 고시한 그 밖의 일상생활 관련 비용도 비급여대상에 포함됩니다.",
      "※ 항목 구성은 시설마다 다릅니다. 계약 전 비급여 항목표로 확인",
    ],
  },
  vsHospital: {
    title: "요양원과 요양병원의 제도 차이",
    items: [
      "요양원(노인요양시설): 노인장기요양보험법 기준 · 장기요양등급과 시설급여로 이용 · 생활 돌봄 중심",
      "요양병원: 의료법 기준 · 건강보험 적용 · 의료적 처치와 입원 관찰이 필요한 경우",
      "갈림 기준은 등급 유무가 아니라 의료 필요도입니다",
      "※ 어느 쪽에 해당하는지는 의사 소견과 공단 판정 자료로 확인",
    ],
  },
  dementia: {
    title: "치매 관련 제도 구분",
    items: [
      "치매전담형 장기요양기관 — 인력·공간 기준이 별도로 적용되는 지정 유형",
      "인지지원등급 — 인지 중심으로 판정되는 등급으로 이용 가능한 급여 범위가 다릅니다",
      "일반 시설과 치매전담 지정 기관은 적용 기준 자체가 다릅니다",
      "※ 후보 시설의 치매전담형 지정 여부는 공단 자료·상담으로 확인",
    ],
  },
  visitCheck: {
    title: "방문 시 확인 관점",
    items: [
      "동선 — 어르신이 생활하는 공간에서 화장실·식당까지의 거리와 단차",
      "채광·환기 — 낮 시간 실내 밝기와 공기 상태",
      "위생 — 공용 공간과 욕실 관리 상태",
      "분위기 — 어르신과 직원이 대화하는 방식, 호칭",
      "※ 사진으로 판단하지 마시고 직접 보시고 확인",
    ],
  },
  meetPolicy: {
    title: "면회·외출·외박 확인 관점",
    items: [
      "면회 — 제도적으로 닫혀 있지 않으며, 운영 방식이 기관마다 다릅니다",
      "외출·외박 — 장기요양급여 제공 기준에 따라 사전 협의로 진행",
      "감염병 상황 — 방역 지침에 따라 일시 조정될 수 있습니다",
      "※ 면회 시간·예약 방식·외박 절차는 계약 전 확인",
    ],
  },
  choice: {
    title: "요양원 선택 기준",
    items: [
      "가족이 방문 가능한 거리",
      "어르신의 돌봄 필요도",
      "비용 구조의 투명성(급여·비급여를 나눠 제시하는지)",
      "보호자와의 소통 방식",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// ★ CAT별 블록 위계 (주 1 + 보조 2~3) — 선장 승인 7항목 ②③④
//   blocks[0] = 주 블록. 나머지 = 보조.
//   title = 해당 CAT 문맥으로 바꾼 제목(동일 블록이라도 CAT마다 다르다)
//   lead  = 주 질문에 종속시키는 연결문맥 한 줄
//   ※ 블록 개수는 기존(4)과 같거나 많다. 정보 삭제 없음.
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_BLOCK_PLAN = {
  nursinghome_grade: {
    blocks: [
      { key: "gradeApply", title: "등급 신청 경로(제도 기준)" },
      { key: "eligibility", title: "등급이 나온 뒤 — 시설급여 대상 구분", lead: "판정 결과를 받으신 다음에 확인하시게 되는 부분입니다." },
      { key: "process", title: "대상이 확인된 뒤 — 입소 절차", lead: "대상에 해당하실 때 이어지는 순서입니다." },
    ],
  },
  nursinghome_eligibility: {
    blocks: [
      { key: "eligibility", title: "입소 대상 — 등급 보유와 시설급여 대상의 구분" },
      { key: "gradeApply", title: "아직 등급이 없으시다면 — 신청 경로", lead: "등급 자체가 없는 단계라면 여기부터가 먼저입니다." },
      { key: "process", title: "대상이 확인된 뒤 볼 것 — 입소 절차", lead: "시설급여 대상으로 확인되신 경우에 이어지는 단계입니다." },
      { key: "cost", title: "대상이 확인된 뒤 볼 것 — 비용 구조", lead: "대상 여부가 정리된 다음에 보시면 되는 부분입니다." },
    ],
  },
  nursinghome_process: {
    blocks: [
      { key: "process", title: "입소 절차(제도 기준)" },
      { key: "eligibility", title: "① 상담 전에 확인되는 것 — 입소 대상", lead: "첫 상담 전에 먼저 정리되는 부분입니다." },
      { key: "visitCheck", title: "③ 사전 방문에서 보실 것", lead: "사전 방문 단계에서 실제로 확인하시는 관점입니다." },
      { key: "cost", title: "④ 계약 전에 정리할 것 — 비용 구조", lead: "계약 단계로 가기 전에 정리해두시면 됩니다." },
    ],
  },
  nursinghome_cost: {
    blocks: [
      { key: "cost", title: "비용 구조(제도 기준)" },
      { key: "nonbenefit", title: "부담률로 계산되지 않는 쪽 — 비급여 항목", lead: "본인부담률을 적용해도 남는 부분이 여기에 있습니다." },
      { key: "eligibility", title: "이 구조가 적용되기 위한 전제 — 시설급여 대상 여부", lead: "위 부담 구조는 시설급여가 인정된 경우를 전제로 합니다." },
      { key: "choice", title: "비용을 견주실 때의 기준", lead: "금액만 나란히 놓지 마시고 이 기준과 함께 보십시오." },
    ],
  },
  nursinghome_nonbenefit: {
    blocks: [
      { key: "nonbenefit", title: "비급여 항목 — 시설마다 달라지는 부분" },
      { key: "cost", title: "비급여가 놓이는 자리 — 전체 비용 구조", lead: "비급여는 아래 구조에서 급여 바깥에 놓입니다." },
      { key: "choice", title: "항목표를 받으신 뒤의 비교 기준", lead: "항목표를 받으신 다음 이 기준으로 견주시면 됩니다." },
    ],
  },
  nursinghome_vs_hospital: {
    blocks: [
      { key: "vsHospital", title: "요양원과 요양병원 — 제도 차이" },
      { key: "eligibility", title: "요양원 쪽으로 판단되실 때 — 입소 대상", lead: "돌봄 중심으로 정리되셨다면 이 기준을 보시게 됩니다." },
      { key: "cost", title: "요양원 쪽 비용 구조", lead: "제도가 다르면 비용이 산정되는 방식도 달라집니다." },
    ],
  },
  nursinghome_dementia: {
    blocks: [
      { key: "dementia", title: "치매 관련 제도 구분" },
      { key: "eligibility", title: "치매가 있으실 때의 시설급여 대상 판단", lead: "치매가 진행되셨더라도 대상 판단은 아래 기준을 따릅니다." },
      { key: "visitCheck", title: "지정 여부를 확인한 뒤 — 방문에서 보실 것", lead: "제도 확인이 끝난 다음 방문에서 보시는 관점입니다." },
      { key: "choice", title: "후보를 좁히실 때의 기준", lead: "치매전담 지정 여부를 포함해 비교하시면 됩니다." },
    ],
  },
  nursinghome_facility: {
    blocks: [
      { key: "visitCheck", title: "방문 시 확인 관점" },
      { key: "meetPolicy", title: "방문 때 함께 물어보실 것 — 면회·외박", lead: "같은 방문에서 함께 확인하시면 두 번 가지 않으셔도 됩니다." },
      { key: "process", title: "방문은 절차의 어디에 있나", lead: "사전 방문은 아래 절차의 ③단계에 해당합니다." },
      { key: "choice", title: "보고 오신 뒤 정리하실 기준", lead: "방문 결과를 이 네 가지로 정리하시면 비교가 됩니다." },
    ],
  },
  nursinghome_visit: {
    blocks: [
      { key: "meetPolicy", title: "면회·외출·외박 확인 관점" },
      { key: "visitCheck", title: "계약 전 방문에서 함께 볼 것", lead: "면회 운영 방식은 방문 때 같이 확인됩니다." },
      { key: "choice", title: "가족 소통 방식까지 포함한 선택 기준", lead: "면회 방식은 아래 '보호자와의 소통 방식' 항목과 이어집니다." },
    ],
  },
  nursinghome_choice: {
    blocks: [
      { key: "choice", title: "선택 기준 네 가지" },
      { key: "cost", title: "기준 — 비용은 구조로 견주기", lead: "비용은 총액이 아니라 구조로 견주는 편이 정확합니다." },
      { key: "visitCheck", title: "기준 — 돌봄 환경은 방문으로 확인", lead: "직접 보셔야 판단되는 부분입니다." },
      { key: "meetPolicy", title: "기준 — 소통은 면회·외박 운영 방식에서 드러남", lead: "가족의 참여 방식이 여기에서 갈립니다." },
    ],
  },
};

// 플랜 미정의 CAT 폴백 (기존 4블록 동형 — 하위호환)
export const NURSINGHOME_BLOCK_PLAN_DEFAULT = {
  blocks: [
    { key: "eligibility" },
    { key: "process" },
    { key: "cost" },
    { key: "choice" },
  ],
};

export function getBlockPlan(treatmentId) {
  return NURSINGHOME_BLOCK_PLAN[treatmentId] || NURSINGHOME_BLOCK_PLAN_DEFAULT;
}

// ★ blockSignature — PURPOSE ISOLATION 판정 보조 (선장 재정의 2026-09-21)
//   동일 signature 단독 FAIL 금지. CAT이 달라도 보조정보는 겹칠 수 있다.
//   "블록 순서 + 연결문맥 + 결론 흐름이 실질적으로 동일"할 때만 FAIL 후보.
//   → 여기서는 비교 재료(order·leadSig·contextualized)만 산출한다. 판정은 선장/교차비교.
export function getBlockSignature(treatmentId) {
  const plan = getBlockPlan(treatmentId);
  const order = plan.blocks.map((b) => b.key);
  const leadSig = plan.blocks.map((b) => (b.lead || "-").slice(0, 14)).join("|");
  const contextualized = plan.blocks.filter(
    (b) => b.title && NURSINGHOME_INFO_BLOCKS[b.key] && b.title !== NURSINGHOME_INFO_BLOCKS[b.key].title
  ).length;
  return {
    order: order.join(">"),
    leadSig,
    contextualized,                 // CAT 문맥으로 제목이 바뀐 블록 수
    generic: contextualized === 0,  // 0이면 연결문맥 미적용 = ISOLATION FAIL 후보
  };
}

// ★ 미확인 화자 차단 — 선장 승인 7항목 ⑥
//   업체 입력으로 확인되지 않은 신분·기관 선언을 생성·검출 양쪽에서 막는다.
export const NURSINGHOME_SPEAKER_PATTERNS = [
  { key: "신분선언", re: /(사회복지사|요양보호사|간호사|원장|센터장|시설장)\s*입니다/ },
  { key: "기관선언", re: /요양(원|시설|센터)\s*입니다/ },
  { key: "기관소개", re: /저희\s*(요양원|시설)(은|는)\s*[^\n]{0,30}(운영|제공|갖추|보유)/ },
];


// 사진 슬롯 — 정보형, 캡션 선택
export const NURSINGHOME_PHOTO_POOL = [
  { slot: "exterior", alt: "{region} 요양원 외관" },
  { slot: "living", alt: "어르신 생활실" },
  { slot: "dining", alt: "식사 공간" },
  { slot: "common", alt: "공용 거실" },
  { slot: "outdoor", alt: "옥외 산책 공간" },
];

// 비교 텍스트 (index.js compareWith / compareWithText2 연결용)
export const NURSINGHOME_COMPARE = {
  compareWith: "요양병원",
  compareWithText2: "주간보호센터",
};

// ─────────────────────────────────────────────────────────────
// ★ FACT STATEMENT SLOT — 19건 (1차 14 + ELIG-01 4 + 정의 FACT term_facility 1, 선장 승인 2026-09-21)
//   구조: A 파생층. items = 원천 FACT / statements = 승인된 문장 표현층.
//   - src.block·src.idx 로 원문 item 을 추적한다.
//   - srcText 는 승인 시점의 원문. 런타임에 실제 item 과 완전일치해야 활성.
//     불일치 = invalid → 프롬프트 공급 금지 + 본문 마커 제거 + QC 기록.
//   - GPT 는 이 문장을 재서술하지 않는다. {{FACT:id}} 마커만 배치 → 후처리 치환.
//   ★ SEGMENT-01: GPT 에는 id + topic 만 공급. topic 은 주제 이름일 뿐 수치·조건·관계·판단을 담지 않는다.
//   ※ 이 배열에 없는 item 은 자유본문 FACT 로 공급되지 않는다(정형블록에서는 유지).
//   보류(자유본문 제외, 정형블록 유지): grade_docs / grade_result / cost_nb
//   ★ FACT-VERIFY-NURSINGHOME-ELIG-01 확정으로 eligibility 6건 전부 활성(elig_diff·elig_home·elig_home_care 교체, elig_cognitive 신규)
//   ✗ 채택 금지 유지: 급여종류내용변경 신청 절차(민간자료 출처 — 공식 원문 확보 후 별도 FACT)
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ★ 정의 FACT 원천 — FACT-VERIFY-NURSINGHOME-TERM-FACILITY-01 CLOSE (선장 원문 대조 2026-09-21)
//   정형블록으로 렌더하지 않는 FACT 원천(A 파생층의 src). statements 의 srcText 와 1:1.
//   출처: 노인장기요양보험법 제31조 / 같은 법 시행령 제10조 / 장기요양급여 제공기준 고시(2026 현행) 시설급여기관 규정
//   ✗ 보류: "입소비용 전부 수납" 노인요양시설 FACT (Purpose 불요 — 예외축 추가 금지)
// ─────────────────────────────────────────────────────────────
export const NURSINGHOME_DEFINITION_SOURCES = {
  termFacility: {
    title: "용어 정의 — 시설급여 제공기관",
    source: "노인장기요양보험법 제31조, 같은 법 시행령 제10조, 장기요양급여 제공기준 고시",
    items: [
      "노인요양시설과 노인요양공동생활가정은 장기요양기관으로 지정받은 경우 시설급여를 제공할 수 있습니다.",
    ],
  },
};

// ★ GLOSSARY / CONTROL — FACT 아님. 말의 뜻(표기 규약)만 정의한다.
//   ※ "요양원 = 시설급여기관" 이라는 뜻이 아니다. 법정 시설명은 노인요양시설이며
//     노인요양공동생활가정이 별도로 존재한다(노인복지법 제34조①1·2호).
export const NURSINGHOME_GLOSSARY = [
  {
    term: "요양원",
    meaning: "콘텐츠에서 노인요양시설을 가리키는 일상 표현",
    notEquivalentTo: ["시설급여", "시설급여기관", "노인요양공동생활가정"],
  },
];

const ELIG_SOURCE = "국가법령정보센터 장기요양급여 제공기준 및 급여비용 산정방법 등에 관한 고시 제2조②·③";
const _COST0 = "급여항목 본인부담: 일반 20% / 감경 대상 12%·8% / 기초생활수급 면제";
export const NURSINGHOME_FACT_STATEMENTS = [
  { id: "elig_12", topic: "입소 대상 범위 ①", src: { block: "eligibility", idx: [0] },
    source: ELIG_SOURCE,
    srcText: ["장기요양 1·2등급 수급자는 재가급여 또는 시설급여를 이용할 수 있습니다."],
    text: "장기요양 1·2등급 수급자는 재가급여 또는 시설급여를 이용할 수 있습니다." },
  { id: "elig_35", topic: "입소 대상 범위 ②", src: { block: "eligibility", idx: [1] },
    source: ELIG_SOURCE,
    srcText: ["장기요양 3~5등급 수급자는 원칙적으로 재가급여를 이용하며, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받은 경우 시설급여를 이용할 수 있습니다."],
    text: "장기요양 3~5등급 수급자는 원칙적으로 재가급여를 이용하며, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받은 경우 시설급여를 이용할 수 있습니다." },
  { id: "elig_diff", topic: "3~5등급 시설급여 인정 요건", src: { block: "eligibility", idx: [2] },
    source: ELIG_SOURCE,
    srcText: ["3~5등급은 등급 판정만으로 시설급여를 이용하는 것이 아니라, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받아야 합니다."],
    text: "3~5등급은 등급 판정만으로 시설급여를 이용하는 것이 아니라, 등급판정위원회로부터 시설급여가 필요한 것으로 인정받아야 합니다." },
  { id: "elig_home", topic: "3~5등급 시설급여 인정 사유", src: { block: "eligibility", idx: [3] },
    source: ELIG_SOURCE,
    srcText: ["3~5등급의 시설급여 인정 사유에는 주수발 가족으로부터 수발이 곤란한 경우, 주거환경이 열악하여 시설입소가 불가피한 경우, 치매 등에 따른 문제행동으로 재가급여를 이용할 수 없는 경우가 포함됩니다."],
    text: "3~5등급의 시설급여 인정 사유에는 주수발 가족으로부터 수발이 곤란한 경우, 주거환경이 열악하여 시설입소가 불가피한 경우, 치매 등에 따른 문제행동으로 재가급여를 이용할 수 없는 경우가 포함됩니다." },
  { id: "elig_cognitive", topic: "인지지원등급의 급여 범위", src: { block: "eligibility", idx: [4] },
    source: ELIG_SOURCE,
    srcText: ["인지지원등급 수급자는 시설급여 이용 대상에 포함되지 않으며, 고시에서 정한 재가급여 범위 내에서 이용합니다."],
    text: "인지지원등급 수급자는 시설급여 이용 대상에 포함되지 않으며, 고시에서 정한 재가급여 범위 내에서 이용합니다." },
  { id: "elig_home_care", topic: "시설급여 미인정 시 이용 범위", src: { block: "eligibility", idx: [5] },
    source: ELIG_SOURCE,
    srcText: ["3~5등급에서 시설급여 필요성을 인정받지 않은 경우에는 재가급여 이용 범위에서 서비스를 확인합니다."],
    text: "3~5등급에서 시설급여 필요성을 인정받지 않은 경우에는 재가급여 이용 범위에서 서비스를 확인합니다." },
  { id: "grade_where", topic: "등급 신청처", src: { block: "gradeApply", idx: [0] },
    srcText: ["신청처: 국민건강보험공단 지사 또는 노인장기요양보험 누리집"],
    text: "장기요양등급 신청처는 국민건강보험공단 지사 또는 노인장기요양보험 누리집입니다." },
  { id: "grade_flow", topic: "등급 판정 절차 순서", src: { block: "gradeApply", idx: [2] },
    srcText: ["절차: 신청 → 공단 직원 방문조사 → 등급판정위원회 심의 → 인정 결과 통보"],
    text: "등급 판정 절차는 신청, 공단 직원 방문조사, 등급판정위원회 심의, 인정 결과 통보 순서입니다." },
  { id: "proc_seq", topic: "입소 절차 순서", src: { block: "process", idx: [0, 1, 2, 3] },
    srcText: [
      "① 전화·방문 상담",
      "② 장기요양인정서·표준장기요양이용계획서 확인",
      "③ 사전 방문 및 어르신 상태 상담",
      "④ 계약 및 입소 준비",
    ],
    text: "입소 절차는 전화·방문 상담, 장기요양인정서·표준장기요양이용계획서 확인, 사전 방문 및 어르신 상태 상담, 계약 및 입소 준비 순서입니다." },
  { id: "cost_20", topic: "급여 본인부담률 — 일반", src: { block: "cost", idx: [0] }, srcText: [_COST0],
    text: "급여항목 본인부담은 일반 20%입니다." },
  { id: "cost_12_8", topic: "급여 본인부담률 — 감경 대상", src: { block: "cost", idx: [0] }, srcText: [_COST0],
    text: "감경 대상의 급여항목 본인부담은 12%·8%입니다." },
  { id: "cost_exempt", topic: "급여 본인부담 — 기초생활수급자", src: { block: "cost", idx: [0] }, srcText: [_COST0],
    text: "기초생활수급자의 급여항목 본인부담은 면제입니다." },
  { id: "cost_consult", topic: "정확한 금액 안내 방식", src: { block: "cost", idx: [2] },
    srcText: ["※ 등급·이용기간·비급여 구성에 따라 달라지므로 정확한 금액은 상담 시 안내"],
    text: "금액은 등급·이용기간·비급여 구성에 따라 달라지므로 정확한 금액은 상담 시 안내됩니다." },
  { id: "nb_meal", topic: "식사재료비 설명", src: { block: "nonbenefit", idx: [0] },
    srcText: ["식사재료비 — 급여에 포함되지 않는 재료 부담분"],
    text: "식사재료비는 급여에 포함되지 않는 재료 부담분입니다." },
  { id: "nb_room", topic: "상급침실료 설명", src: { block: "nonbenefit", idx: [1] },
    srcText: ["상급침실료 — 기준 외 침실(1·2인실 등) 이용 시"],
    text: "상급침실료는 기준 외 침실(1·2인실 등) 이용 시의 비용입니다." },
  { id: "nb_beauty", topic: "이·미용비 설명", src: { block: "nonbenefit", idx: [2] },
    srcText: ["이·미용비 — 개인 위생·이미용 서비스"],
    text: "이·미용비는 개인 위생·이미용 서비스에 대한 비용입니다." },
  { id: "nb_class", topic: "비급여대상 법정 분류 — 고정 항목", src: { block: "nonbenefit", idx: [3] },
    source: "노인장기요양보험법 시행규칙 제14조제1항",
    srcText: ["식사재료비, 상급침실 이용에 따른 추가비용, 이·미용비는 장기요양급여 범위에서 제외되는 비급여대상입니다."],
    text: "식사재료비, 상급침실 이용에 따른 추가비용, 이·미용비는 장기요양급여 범위에서 제외되는 비급여대상입니다." },
  { id: "nb_class_etc", topic: "비급여대상 법정 분류 — 포괄 항목", src: { block: "nonbenefit", idx: [4] },
    source: "노인장기요양보험법 시행규칙 제14조제1항",
    srcText: ["보건복지부장관이 고시한 그 밖의 일상생활 관련 비용도 비급여대상에 포함됩니다."],
    text: "보건복지부장관이 고시한 그 밖의 일상생활 관련 비용도 비급여대상에 포함됩니다." },
  { id: "nb_varies", topic: "비급여 항목 구성 확인", src: { block: "nonbenefit", idx: [5] },
    srcText: ["※ 항목 구성은 시설마다 다릅니다. 계약 전 비급여 항목표로 확인"],
    text: "비급여 항목 구성은 시설마다 다르며, 계약 전 비급여 항목표로 확인합니다." },
  // 정의 FACT — CAT 플랜 블록에 속하지 않으므로 getFactSlotsForTreatment 로는 공급되지 않는다.
  //   생성기 연결은 Entailment fixture Gate PASS 후 별도 승인.
  { id: "term_facility", topic: "시설급여 제공기관", src: { block: "termFacility", idx: [0] },
    source: NURSINGHOME_DEFINITION_SOURCES.termFacility.source,
    srcText: ["노인요양시설과 노인요양공동생활가정은 장기요양기관으로 지정받은 경우 시설급여를 제공할 수 있습니다."],
    text: "노인요양시설과 노인요양공동생활가정은 장기요양기관으로 지정받은 경우 시설급여를 제공할 수 있습니다." },
];

// srcText ↔ 실제 item 완전일치 검증. idx 전부 일치해야 valid.
export function isFactStatementValid(st) {
  const blk = NURSINGHOME_INFO_BLOCKS[st?.src?.block] || NURSINGHOME_DEFINITION_SOURCES[st?.src?.block];
  if (!blk || !Array.isArray(st.src.idx) || !Array.isArray(st.srcText)) return false;
  if (st.src.idx.length !== st.srcText.length) return false;
  return st.src.idx.every((i, k) => blk.items[i] === st.srcText[k]);
}

// CAT 플랜(주+보조) 블록에 속한 statement 를 active / invalid 로 분리
export function getFactSlotsForTreatment(treatmentId) {
  const keys = new Set(getBlockPlan(treatmentId).blocks.map((b) => b.key));
  const inPlan = NURSINGHOME_FACT_STATEMENTS.filter((st) => keys.has(st.src.block));
  return {
    active: inPlan.filter(isFactStatementValid),
    invalid: inPlan.filter((st) => !isFactStatementValid(st)).map((st) => st.id),
  };
}

// 판정기(entailment)용: id → 유효 statement (src 불일치·미정의는 null)
export function getValidStatementById(id) {
  const st = NURSINGHOME_FACT_STATEMENTS.find((x) => x.id === id);
  return st && isFactStatementValid(st) ? st : null;
}
