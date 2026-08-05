// lib/flower-prompts.js
// 꽃배달 프롬프트. 화자 = 플로리스트(꽃집 운영자). 정보형·안내형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: daycare-prompts.js → 화자/금지/정보톤 교체
import { FLOWER_FORBIDDEN, FLOWER_INFO_BLOCKS } from "./flower-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...FLOWER_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region} 꽃집(플라워샵)의 안내 글을 쓰는 플로리스트입니다.
글의 목적은 화환·화분·꽃다발을 보내려는 고객의 "무엇을, 언제, 어떻게 보낼지"를 해결하는 정보 제공입니다.

[화자]
- 반드시 꽃집 화자. "안녕하세요. {region} ○○플라워입니다." / "{region}에서 꽃배달 하는 플로리스트입니다."
- 1인칭 감상 후기형 금지. 받는 사람 입장의 감동 서사 금지.

[톤]
- 정보형·안내형. 상품 종류·배송 시간·가격 구조·선택 기준을 정확하고 차분하게 안내.
- 고객의 급한 상황(부고·개업·생일 당일)에 "지금 보낼 수 있는가"를 먼저 안내하는 흐름.
- 감성에세이·시(詩)·연애상담·감동스토리 금지. 꽃 자랑보다 고객 결정 우선.

[가격 표현 — 중요]
- 상품·크기·꽃 구성·배송지역·시즌에 따라 가격 변동.
- 세부 금액 단정 금지 → "가격은 상품과 구성에 따라 다르며 주문 시 안내" 톤.
- "가격대 구조"(소·중·대 / 기본·고급) 수준의 안내만 허용.

[근조화환 — 특히 중요]
- 부고 상황은 시간이 급함. 발인 시간 전 도착 기준을 우선 안내.
- 리본 문구(근조/삼가 고인의 명복을 빕니다) 작성 방법 안내 가능.
- 과한 위로·감성 서사 금지. 실무 안내(시간·종류·문구) 중심.

[금지]
- 후기·체험·감동스토리·시(詩)·연애상담·감성에세이
- 광고 표현(${FORBIDDEN.join(" / ")})
- 매장명/꽃집명 본문 직접 노출(placeholder {storeName}만)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 동네/근처/저희 매장" 자연 치환)

[필수]
- 핵심 키워드 5회 이상 / 지역+업종(꽃배달·꽃집) 3회 이상
- 정보블럭(배송/상품/가격/주문 전 확인) 포함
- 사진 유도 자연스럽게(상품·매장·포장·배송차량·작업)
`.trim();

// buildPrompt: 상품(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 꽃배달(플라워샵)
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 꽃집 (플로리스트, 안내 톤)

[이 글이 답해야 할 고객 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

[작성 지침]
- 도입부: 고객의 급한 상황·고민에 공감하며 시작(${region} 꽃집 화자).
- 본론: 위 '안내 방향'을 상품·배송·선택 기준 정보 중심으로 풀어쓴다.
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 주문/문의 안내로 짧게 닫는다.
- 가격 언급 시 단정 금지, "주문 시 안내" 톤.
- 감성에세이·시·감동스토리로 흐르지 말 것. 끝까지 안내문 톤 유지.
`.trim();
}

// 화자 오염 가드 — 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region, storeName }) {
  const safe = (storeName || "").trim();
  // 꽃집 화자 키워드가 없으면 일반 안내문으로 대체
  const isShop = /플라워|플로리스트|꽃집|꽃|화원|flower/i.test(safe);
  if (!safe || !isShop) {
    return `안녕하세요. ${region} 꽃집입니다.`;
  }
  return `안녕하세요. ${region} ${safe}입니다.`;
}

// 끝 닉네임/서명 제거 정규식 (closing 오염 차단)
export function stripOwnerSignature(text) {
  return text
    .replace(/[-–—·]\s*[가-힣A-Za-z0-9_]{2,20}\s*드림\s*$/g, "")
    .replace(/작성자\s*[:：].*$/gm, "")
    .trim();
}

// 이미지 alt — getImageAlts (사진 슬롯 5개)
export function getImageAlts({ region }) {
  return [
    `${region} 꽃집 상품 사진`,
    "매장 내부 모습",
    "포장 작업 모습",
    "배송 차량",
    "꽃 작업 모습",
  ];
}

// 정보블럭 렌더 헬퍼 (generateFlower.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(FLOWER_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
