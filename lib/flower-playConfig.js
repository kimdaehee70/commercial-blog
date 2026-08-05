// lib/flower-playConfig.js
// 꽃배달 섹션 FLOW. 정보형 narrative (고객상황도입→상품안내→배송/시간→가격/선택기준→마무리)
// ⚠️ 단일호출형(generateFlower.js) — 현재 미사용 DEAD CODE. 향후 섹션 FLOW 분기 복원 시 사용.
// 복사 베이스: daycare-playConfig.js → 섹션/길이 교체

export const FLOWER_PLAY_CONFIG = {
  industry: "flower",
  totalMinLength: 1800,
  totalMaxLength: 2600,
  flow: [
    {
      key: "intro",
      title: "고객 상황 도입",
      role: "부고·개업·생일 등 검색 직전 상황에 꽃집 화자로 공감 시작",
      minLength: 260,
      maxLength: 400,
    },
    {
      key: "product",
      title: "상품 종류 안내",
      role: "주제 상품(화환·화분·꽃다발 등) 종류와 차이를 정보로 안내",
      minLength: 360,
      maxLength: 540,
    },
    {
      key: "delivery",
      title: "배송·시간 안내",
      role: "당일배송 가능 조건·도착 시간(근조화환은 발인 전) 안내",
      minLength: 340,
      maxLength: 500,
    },
    {
      key: "choice",
      title: "가격 구조·선택 기준",
      role: "가격대 구조·선택 기준을 단정 없이 안내 (주문 시 안내 톤)",
      minLength: 320,
      maxLength: 480,
    },
    {
      key: "closing",
      title: "주문 안내 마무리",
      role: "주문/문의 안내로 짧게 마무리. ★ 전체 재요약 금지(코드 절단)",
      minLength: 240,
      maxLength: 380,
    },
  ],
};

export default FLOWER_PLAY_CONFIG;
