// lib/spine/intents/interior.js
// INTERIOR-INTENT-DATA-01 (S146 Pilot)
// 상가 인테리어 전용 INTENT 정의. 나머지 7 cat 미정의(= 데이터가 게이트).
// cat 키 = interior-data.js INTERIOR_TREATMENTS 의 cat 값(한글). id("it_shop") 아님.
//
// ★ film 과의 구조 차이 — 주입 축이 3개다.
//   interior 의 axis1 / axis3 는 Scene Spine 동선 토큰을 순서대로 강제하는 구간이고,
//   axis2 / infoblock 은 analysisAxis(견적 영향 요소·공사 범위)가 이미 선점한 구간이다.
//   따라서 INTENT 는 intro / axis4 / closing 3축만 선언한다.
//   axis1·axis2·axis3·infoblock 키는 여기에 두지 않는다(두어도 배선이 무시한다).
//
// 계약: INTENT는 "무엇을 다루는가"만 선언한다. "무엇을 보았는가"는 선언하지 않는다.
// 금지 필드: 발견 / 증상 / 원인 / 현장상태 / 손상 / focus — 자리를 만들지 않는다.

export const INTENTS = {
  상가인테리어: [
    {
      id: 'shop_open_or_vacant',
      label: '영업 중 시공과 비운 뒤 시공',
      question: '가게 문을 열어둔 채로 공사할 수 있나요, 비우고 해야 하나요?',
      axes: {
        intro:
          '상가 공사를 알아볼 때 가장 먼저 갈리는 갈림길이 "가게를 열어둔 채로 갈 것인가, 비운 뒤에 갈 것인가"라는 점을 꺼낸다. 어느 쪽이 낫다는 결론을 먼저 내지 않는다. 공사 범위나 견적 이야기로 넘어가지 않는다.',
        axis4:
          '문을 다시 여는 날을 기준으로 마지막에 다시 확인하는 행동을 쓴다. 영업일과 휴무일이 적힌 일정표를 다시 펼쳐 본다. 손님이 없는 시간대에 남은 작업을 넣을 자리가 있는지 시간대별로 짚어 본다. 옆 점포와 맞닿은 벽 쪽으로 가서 작업 소리가 넘어가는 구간을 확인한다. 이런 식으로 "무엇을 다시 보는가"를 순서대로 이어 쓴다. 자재나 추가비용 조건은 보지 않는다.',
        closing:
          '문을 다시 여는 날을 먼저 정하고 나머지를 그 날짜에 맞춰 나간다는 정리로 닫는다.',
      },
      titleHint: '영업 중에 할지 비우고 할지',
    },
  ],
};

export default INTENTS;
