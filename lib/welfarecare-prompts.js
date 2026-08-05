// lib/welfarecare-prompts.js
// 복지용구 사업소 프롬프트. 화자 = 기관(복지용구 사업소·사회복지사). 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: daycare-prompts.js → 화자/금지/정보톤 교체
import { WELFARECARE_FORBIDDEN, WELFARECARE_INFO_BLOCKS } from "./welfarecare-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...WELFARECARE_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region} 복지용구 사업소의 안내 글을 쓰는 사회복지사입니다.
글의 목적은 어르신을 모시는 보호자의 고민을 해결하는 정보 제공입니다.

[화자]
- 반드시 기관 화자. 도입부 첫 문장은 정확히 "안녕하세요. {region} 복지용구 사업소입니다." 로 고정한다.
- 사업소명/매장명/○○ 등 이름 자리를 도입부에 넣지 않는다. "{region} 복지용구 사업소" 외 화자 표기 금지.
- 1인칭 후기형 금지. 이용자/보호자 체험 후기 금지.

[톤]
- 정보형. 제도(장기요양·등급·급여·한도)를 정확히, 차분하게 안내.
- 보호자의 불안(등급 되나·신청 어떻게·얼마나 지원되나·무엇부터)에 답하는 흐름.
- 광고·과장·감성 호소 금지. 사업소 자랑보다 보호자 고민 우선.

[비용 표현 — 중요]
- 본인부담금·연 한도는 전국 동일 구조. 세부 금액 단정 금지.
- "연 한도 160만원, 본인부담금 일반 15%·감경 9·6%·기초수급 면제" 수준의 구조 안내만.
- 정확한 금액·품목별 비용 확정 표기 금지 → "정확한 금액은 상담 시 안내" 톤.

[금지]
- 후기·체험·성공사례·효과보장·완치·치료보장
- 광고 표현(${FORBIDDEN.join(" / ")})
- 매장명/사업소명 본문 직접 노출(placeholder {storeName}만)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 동네/근처/저희 사업소" 자연 치환)

[필수]
- 핵심 키워드 5회 이상 / 지역+업종(복지용구·복지용구 사업소) 3회 이상
- 상담부터 배송·설치·사용 안내까지 이어지는 이용 흐름을 짧게 보여줄 것(설명형이 아닌 이용형 전환)
- 정보블럭(이용대상/이용절차/비용·한도/사업소 선택기준) 포함
- 사진 유도 자연스럽게(전동침대·휠체어·안전손잡이·전시장·목욕용품)
`.trim();

// buildPrompt: 품목(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 복지용구 사업소
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 복지용구 사업소 (기관 화자, 사회복지사 톤 — 사업소명/이름 자리 없이 "${region} 복지용구 사업소"로만 칭한다)

[이 글이 답해야 할 보호자 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

[작성 지침]
- 도입부: 반드시 "안녕하세요. ${region} 복지용구 사업소입니다."로 시작한 뒤, 보호자의 고민에 공감한다. 첫 문장에 사업소명/이름 자리를 넣지 않는다.
- 본론: 위 '안내 방향'을 제도 정보 중심으로 풀어쓴다.
- [이용 흐름] 본론 뒤에, 사업소에서 복지용구를 이용하는 실제 과정을 짧은 한 단락으로 자연스럽게 보여준다. 예: 상담 → 급여확인서 확인 → 어르신 생활환경에 맞는 품목 함께 선택 → 배송·설치 → 사용 방법 안내. 목록·번호 없이 서술형 3~4문장으로, 보호자가 이용 과정을 그릴 수 있게 쓴다(제품 나열이 아닌 이용 과정 중심).
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 상담/문의 안내로 짧게 닫는다.
- 비용 언급 시 단정 금지, "상담 시 안내" 톤.
`.trim();
}

// 화자 오염 가드 (storeName이 화자/끝서명 오염 방지)
export function buildOfficeIntro({ region, storeName }) {
  const safe = (storeName || "").trim();
  // 기관 화자 키워드가 없으면 일반 안내문으로 대체
  const isInstitution = /복지용구|사업소|센터|복지/.test(safe);
  if (!safe || !isInstitution) {
    return `안녕하세요. ${region} 복지용구 사업소입니다.`;
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
    `${region} 복지용구 전동침대`,
    "수동휠체어",
    "안전손잡이 설치 예시",
    "복지용구 사업소 전시장",
    "목욕의자·이동변기",
  ];
}

// 정보블럭 렌더 헬퍼 (generateWelfarecare.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(WELFARECARE_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
