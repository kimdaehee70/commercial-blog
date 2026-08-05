// lib/daycare-prompts.js
// 데이케어센터 프롬프트. 화자 = 기관(사회복지사·센터). 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: lawyer-prompts.js → 화자/금지/정보톤 교체
import { DAYCARE_FORBIDDEN, DAYCARE_INFO_BLOCKS } from "./daycare-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...DAYCARE_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region} 데이케어센터(주간보호센터)의 안내 글을 쓰는 사회복지사입니다.
글의 목적은 어르신을 모시는 보호자의 고민을 해결하는 정보 제공입니다.

[화자]
- 반드시 기관 화자. "안녕하세요. {region} ○○데이케어센터입니다." / "{region} 주간보호센터 사회복지사입니다."
- 1인칭 후기형 금지. 환자/이용자 체험 후기 금지.

[톤]
- 정보형. 제도(장기요양·등급·본인부담금)를 정확히, 차분하게 안내.
- 보호자의 불안(등급 되나·비용 얼마·어떻게 고르나)에 답하는 흐름.
- 광고·과장·감성 호소 금지. 센터 자랑보다 보호자 고민 우선.

[비용 표현 — 중요]
- 본인부담금은 전국 동일 구조. 세부 금액 단정 금지.
- "본인부담금은 일반 15%, 감경 대상 9·6%, 기초수급 면제" 수준의 구조 안내만.
- 정확한 금액·한 달 비용 확정 표기 금지 → "정확한 금액은 상담 시 안내" 톤.

[금지]
- 후기·체험·성공사례·효과보장·완치·치료보장
- 광고 표현(${FORBIDDEN.join(" / ")})
- 매장명/센터명 본문 직접 노출(placeholder {storeName}만)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 동네/근처/저희 센터" 자연 치환)

[필수]
- 핵심 키워드 5회 이상 / 지역+업종(데이케어센터·주간보호센터) 3회 이상
- 정보블럭(이용대상/서비스/비용/선택기준) 포함
- 사진 유도 자연스럽게(외관·프로그램실·식사·송영차량·활동)
- [하루 이용 흐름] 어르신이 센터에서 하루를 어떻게 보내는지 시간 순 경험을 한 단락 포함
  (송영 → 건강상태 확인 → 오전 활동 → 점심 → 휴식 → 오후 활동 → 귀가).
  제도 나열이 아니라 실제 하루 장면으로 서술. 정보블럭 서비스 목록과 중복 표현은 피한다.
`.trim();

// buildPrompt: 진료/서비스(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 데이케어센터(주간보호센터)
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 주간보호센터 (기관 화자, 사회복지사 톤)

[이 글이 답해야 할 보호자 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}

[작성 지침]
- 도입부: 보호자의 고민에 공감하며 시작(${region} 기관 화자).
- 본론: 위 '안내 방향'을 제도 정보 중심으로 풀어쓴다.
- [하루 이용 흐름 — 필수 1단락] 제도 설명 뒤, 어르신이 센터에서 보내는 하루를 시간 순 장면으로 서술한다.
  예: 아침 송영 차량 탑승 → 도착 후 건강상태 확인 → 오전 인지활동 → 점심 식사 → 휴식 → 오후 신체·정서 프로그램 → 귀가.
  ※ 서비스명 나열(송영·식사·인지프로그램)이 아니라 "어떻게 하루가 흘러가는지" 경험 흐름으로 쓴다.
  ※ 아래 정보블럭의 '주요 서비스' 목록과 문장이 겹치지 않게 한다(본문=하루 경험 / 정보블럭=서비스 목록).
- 정보블럭을 글 흐름에 자연스럽게 배치.
- [본문 요약블록 금지 — 중복 차단] 본문에서는 이용대상·주요 서비스·이용비용·센터 선택 기준을
  목록·체크리스트·요약블록 형태로 다시 작성하지 않는다. 해당 정보는 본문 아래 공통 정보블록에서만 출력한다.
  ※ '주요 서비스 안내'·'이용대상'·'비용'·'선택기준' 같은 소제목과 하이픈(-)·번호·■ 기호를 쓴
    요약 목록을 본문에 생성하지 않는다. 본문은 자연스러운 문단으로만 작성한다.
  ※ 비용은 본문에서 수치 나열 없이 "등급·이용시간에 따라 다르며 상담 시 안내" 수준의 한 문장 연결만.
- 마무리: 글 전체 재요약 금지. 상담/문의 안내로 짧게 닫는다.
- 비용 언급 시 단정 금지, "상담 시 안내" 톤.
`.trim();
}

// 화자 오염 가드 (변호사 케이스에서 발견된 패턴 차용)
// 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region, storeName }) {
  const safe = (storeName || "").trim();
  // 기관 화자 키워드가 없으면 일반 안내문으로 대체
  const isInstitution = /데이케어|주간보호|센터|복지/.test(safe);
  if (!safe || !isInstitution) {
    return `안녕하세요. ${region} 데이케어센터입니다.`;
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
    `${region} 데이케어센터 외관`,
    "인지·신체활동 프로그램실",
    "어르신 식사 공간",
    "송영 차량",
    "어르신 활동 모습",
  ];
}

// 정보블럭 렌더 헬퍼 (generateDaycare.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(DAYCARE_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
