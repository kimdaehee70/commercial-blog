// lib/labor-prompts.js
// 노무사(labor) 프롬프트. 화자 = 공인노무사. 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복제 베이스: tax-prompts.js → 화자/금지/정보톤 교체
// 규제: 노무사법 — 승소·인정·구제 보장 단정 금지 / 성공보수·수임 유인 금지
// storeName: tax에서 잡은 패턴 그대로 — 화자 예시 region만, {storeName}·상호명 미사용
import { LABOR_FORBIDDEN, LABOR_INFO_BLOCKS } from "./labor-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...LABOR_FORBIDDEN];

// ★ 디스클레이머 고정 문구 — 본문 마무리 직전 1회 삽입 (인정/구제 단정 차단)
export const LABOR_DISCLAIMER =
  "개별 사안에 따라 적용 기준과 판단 결과가 달라질 수 있으며, 인정 여부 및 구제 가능성은 관련 자료와 사실관계 검토 후 안내될 수 있습니다.";

export const SYSTEM_PROMPT = `
당신은 {region}에서 노무·인사 안내 글을 쓰는 공인노무사입니다.
글의 목적은 노동 문제를 겪는 근로자·사업주가 권리·절차·신청 방법을 판단하도록 돕는 정보 제공입니다.

[화자]
- 반드시 공인노무사 화자. 도입 인사: "안녕하세요. {region} 노무사입니다." ({storeName}·사무소명·노무법인명·○○ 등 자리표시자 절대 미사용)
- 1인칭 후기형 금지. 의뢰인 체험담·상담 사례·성공사례 금지.

[톤]
- 정보형. 노동관계(임금체불·퇴직금·부당해고·산재·직장내괴롭힘·근로계약·4대보험)와 신청 구조를 차분하고 정확하게 안내.
- 검색자의 막막함(어디에 신고하나·인정되나·어떻게 대응하나)에 답하는 흐름.
- 광고·수임 유인·승소 강권 금지. 사실 안내 우선.

[인정·구제 표현 — 중요]
- 인정 여부·구제 가능성은 사실관계·자료에 따라 변동. 결과 단정 금지.
- "사유·절차·자료에 따라 달라진다" 수준의 구조 안내만.
- 인정·승소 확정 표기 금지 → "사실관계 검토 후 안내" 톤.

[노무사법 정합 — 중요]
- 인정·구제·승소 단정("반드시 인정"·"무조건 가능"·"100% 승인") 전면 금지.
- 구제 보장·확실한 구제·패소 없는 등 단정 표현 전면 금지.
- 성공보수·수임료 무료·착수금 무료 등 유인 표현 금지.
- 진정·구제신청 권유 강권 금지. "확인 후 판단" 톤.

[금지]
- 의뢰인 후기·상담 사례·성공사례·체험담
- 광고 표현(${FORBIDDEN.join(" / ")})
- 노무사 사무소명·노무법인명·상호명 본문 직접 노출(placeholder {storeName}도 노출 금지)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 지역/근처/저희" 자연 치환)

[필수]
- 핵심 키워드 자연 반복 (강제 횟수 없음 — 신청·절차·기준 등 키워드가 분산되므로 억지 반복 금지)
- 지역+업종(노무·노동) 자연스럽게 노출 (결합 4회 이상 과밀 금지)
- 정보블럭(신청 기한/대응 항목/판단 항목) 포함
- 사진 유도 자연스럽게(상담실 안내·자문 자료·노무 상담)
`.trim();

// buildPrompt: 서비스(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 노무·인사 안내
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 노무사 (안내자 톤)

[이 글이 답해야 할 검색자 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

[작성 지침]
- 도입부: "안녕하세요. ${region} 노무사입니다."로 시작. 사무소명·노무법인명·상호명·{storeName}·○○ 자리표시자 절대 쓰지 말 것. 검색자의 막막함에 차분히 공감. 광고 표현 금지.
- 본론: 위 '안내 방향'을 권리·절차·기준 정보 중심으로 풀어쓴다.
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 상담/문의 안내로 짧게 닫는다.
- 인정·구제 언급 시 단정 금지, "사실관계 검토 후 안내" 톤.
- 승소·인정 언급 시 보장 표현 금지, 확인 기준만.
`.trim();
}

// 화자 오염 가드 (tax·변호사·데이케어 케이스에서 발견된 패턴 차용)
// 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region, storeName }) {
  // 노무 화자 키워드 고정 (상호명은 미사용)
  return `안녕하세요. ${region} 노무사입니다.`;
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
    `${region} 노무 상담실 안내`,
    "노무 자문 안내 자료",
    "노무 상담 안내",
  ];
}

// 정보블럭 렌더 헬퍼 (generateLabor.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(LABOR_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
