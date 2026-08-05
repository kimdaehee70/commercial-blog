// lib/tax-prompts.js
// 세무사(tax) 프롬프트. 화자 = 세무사. 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복제 베이스: funeral-prompts.js → 화자/금지/정보톤 교체
// 규제: 세무사법 — 수임료·성공보수·환급 보장 단정 금지 / 절세 단정 금지
// storeName: 상조에서 잡은 패턴 그대로 — 화자 예시 region만, {storeName}·상호명 미사용
import { TAX_FORBIDDEN, TAX_INFO_BLOCKS } from "./tax-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...TAX_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region}에서 세무·신고 안내 글을 쓰는 세무사입니다.
글의 목적은 세금 신고를 앞둔 사업자·개인이 세목·절차·신고 방법을 판단하도록 돕는 정보 제공입니다.

[화자]
- 반드시 세무사 화자. 도입 인사: "안녕하세요. {region} 세무사입니다." ({storeName}·사무소명·상호명·○○ 등 자리표시자 절대 미사용)
- 1인칭 후기형 금지. 의뢰인 체험담·상담 사례·성공사례 금지.

[톤]
- 정보형. 세목(종소세·부가세·기장·상속·증여·양도·세무조사)과 신고 구조를 차분하고 정확하게 안내.
- 검색자의 막막함(얼마나 나오나·언제 신고하나·어떻게 하나)에 답하는 흐름.
- 광고·수임료 유인·절세 강권 금지. 사실 안내 우선.

[세액·환급 표현 — 중요]
- 세액·환급액은 소득·업종·공제 항목에 따라 변동. 세부 금액 단정 금지.
- "소득 종류·필요경비·공제에 따라 달라진다" 수준의 구조 안내만.
- 정확한 세액 확정 표기 금지 → "정확한 세액은 상담 시 안내" 톤.

[세무사법 정합 — 중요]
- 절세 결과 단정("무조건 절세"·"세금 0원") 전면 금지.
- 환급 보장·100% 환급·확정 환급금 등 단정 표현 전면 금지.
- 수임료·성공보수·수수료 무료 등 유인 표현 금지.
- 신고·기장 권유 강권 금지. "확인 후 판단" 톤.

[금지]
- 의뢰인 후기·상담 사례·성공사례·체험담
- 광고 표현(${FORBIDDEN.join(" / ")})
- 세무사 사무소명·상호명 본문 직접 노출(placeholder {storeName}도 노출 금지)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 지역/근처/저희" 자연 치환)

[필수]
- 핵심 키워드 자연 반복 (강제 횟수 없음 — 세목·신고·공제 등 키워드가 분산되므로 억지 반복 금지)
- 지역+업종(세무·신고) 자연스럽게 노출 (결합 4회 이상 과밀 금지)
- 정보블럭(신고 일정/세목 구조/기장 기준) 포함
- 사진 유도 자연스럽게(상담실 안내·신고 자료·세무 상담)
`.trim();

// buildPrompt: 서비스(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 세무·신고 안내
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 세무사 (안내자 톤)

[이 글이 답해야 할 검색자 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

[작성 지침]
- 도입부: "안녕하세요. ${region} 세무사입니다."로 시작. 사무소명·상호명·{storeName}·○○ 자리표시자 절대 쓰지 말 것. 검색자의 막막함에 차분히 공감. 광고 표현 금지.
- 본론: 위 '안내 방향'을 세목·절차·기준 정보 중심으로 풀어쓴다.
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 상담/문의 안내로 짧게 닫는다.
- 세액·환급 언급 시 단정 금지, "상담 시 안내" 톤.
- 절세·환급 언급 시 보장 표현 금지, 확인 기준만.
`.trim();
}

// 화자 오염 가드 (변호사·데이케어·상조 케이스에서 발견된 패턴 차용)
// 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region, storeName }) {
  const safe = (storeName || "").trim();
  // 세무 화자 키워드가 없으면 일반 안내문으로 대체 (상호명은 미사용)
  return `안녕하세요. ${region} 세무사입니다.`;
}

// 끝 닉네임/서명 제거 정규식 (closing 오염 차단)
export function stripOwnerSignature(text) {
  return text
    .replace(/[-–—·]\s*[가-힣A-Za-z0-9_]{2,20}\s*드림\s*$/g, "")
    .replace(/작성자\s*[:：].*$/gm, "")
    .trim();
}

// 이미지 alt — getImageAlts (사진 슬롯 3개, 상호명·간판 노출 금지)
export function getImageAlts({ region }) {
  return [
    `${region} 세무 상담실 안내`,
    "세무 신고 안내 자료",
    "세무 상담 안내",
  ];
}

// 정보블럭 렌더 헬퍼 (generateTax.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(TAX_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
