// lib/lawyer-playConfig.js
// 변호사(lawyer) FLOW_ENGINE
// [세션41][SPINE7] 5섹션 → 7섹션 전문직 Spine 전환.
//   기존 5섹션: intro / procedure / criteria / checklist / closing
//     문제: 실질 역할이 3개(공감·판단·자료)뿐 → 자료·증거 설명이 3개 섹션에 중복 유입.
//           procedure 슬롯에 '지금 무엇부터'를 억지로 태워 이름·의미 불일치 → GPT가 절차로 회귀.
//   신규 7섹션: concern / firstMove / mistake / consult / documents / process / closing
//     역할 배타화 = 중복 원천 차단. mistake = 병원 V2에 없는 전문직 차별 섹션.
// 병원 V2 정합: 첫 섹션(concern) 소제목 미부여 — 본문으로 바로 시작.

export const LAWYER_FLOW = [
  {
    key: 'concern',
    title: '',                       // 소제목 없음 (병원 V2 NOHDR-01 정합)
    minLength: 180,
    maxLength: 300,
    role: '검색자가 지금 처한 상황을 상황문으로 바로 제시. 인사말·일반론 금지.',
  },
  {
    key: 'firstMove',
    title: '먼저 확인할 것',
    minLength: 350,
    maxLength: 520,
    role: '입장 분기(고소/방어 등) + 지금 판단해야 할 핵심 기준. 자료 목록·절차 나열 금지.',
  },
  {
    key: 'mistake',
    title: '지금 하면 안 되는 것',
    minLength: 250,
    maxLength: 420,
    role: '초기 흔한 실수(임의 해명·증거 삭제·감정적 연락·SNS 게시·무분별 합의). 전문직 차별 섹션.',
  },
  {
    key: 'consult',
    title: '상담에서 확인하는 것',
    minLength: 150,
    maxLength: 260,   // [세션41-3] 사무적 설명체 방지 — 길면 업무절차 나열로 흐름
    role: '사무소와 함께 정리·판단해 나가는 진행 관점만. 판단 기준 재설명·자료 목록 금지.',
  },
  {
    key: 'documents',
    title: '미리 준비하면 좋은 자료',
    minLength: 200,
    maxLength: 320,
    role: '자료 목록만. 왜 필요한지 한 줄씩. 판단·상담·절차 재설명 금지.',
  },
  {
    key: 'process',
    title: '이후 진행 흐름',
    minLength: 110,
    maxLength: 200,   // [세션41-3] 교과서식 절차 설명 방지 — 3문장 이내
    role: '절차 흐름을 참고 수준으로 압축. 단계 나열 1문단 이내.',
  },
  {
    key: 'closing',
    title: '',                       // 소제목 없음 (마무리는 담담히)
    minLength: 120,
    maxLength: 220,
    role: '초기 상담 안내 2~3문장. 앞 내용 재요약 금지. 결과 약속 금지.',
  },
];

export const LAWYER_PLAY_CONFIG = {
  industry: 'lawyer',
  flow: LAWYER_FLOW,
  minTotalLength: 1700,
  maxTotalLength: 2300,
  useChangeHeaders: false,
  useInfoBlock: true,
  forceExamValue: false,
};

export default LAWYER_PLAY_CONFIG;
