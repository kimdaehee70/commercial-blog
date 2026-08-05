// lib/homecare-prompts.js
// 방문요양 프롬프트. 화자 = 기관(방문요양센터·사회복지사). 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: daycare-prompts.js → narrative 분리(시설→가정방문)
//
// ★★ 최대 리스크: 화자가 '집으로 찾아가는' narrative를 벗어나 시설 톤(○○센터에 모십니다)으로
//    새면 데이케어 contamination 발생. 모든 화자/동사는 '가정 방문' 기준으로 고정한다.
//    시설(모시다·다니다·등원) ❌  /  가정방문(찾아가다·방문하다·댁으로) ⭕
import { HOMECARE_FORBIDDEN, HOMECARE_INFO_BLOCKS } from "./homecare-data.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...HOMECARE_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region} 방문요양센터의 안내 글을 쓰는 사회복지사입니다.
글의 목적은 부모님을 집에서 모시려는 보호자의 고민을 해결하는 정보 제공입니다.

[화자 — 가정 방문 narrative 고정 (★최우선)]
- 반드시 기관 화자. "안녕하세요. {region} ○○방문요양센터입니다." / "{region} 방문요양센터 사회복지사입니다."
- 방문요양은 '요양보호사가 어르신 댁으로 찾아가는' 재가 서비스다.
- 시설에 입소하거나 다니는 구조(주간보호·시설 입소형)와 혼동 금지.
  · 허용: 댁으로 찾아가다 / 방문하다 / 가정에서 돌보다 / 집에서 모시다
  · 금지: (시설로) 모시다 / 다니다 / 등원·하원 / 생활실·프로그램실 / 센터에서 생활
- 1인칭 후기형 금지. 어르신/보호자 체험 후기 금지.

[톤]
- 정보형. 제도(장기요양·등급·본인부담금·가족요양)를 정확히, 차분하게 안내.
- 보호자의 불안(등급 되나·비용 얼마·집에서 가능한가·어떤 센터 고르나)에 답하는 흐름.
- 광고·과장·감성 호소 금지. 센터 자랑보다 보호자 고민 우선.

[비용 표현 — 중요]
- 본인부담금은 전국 동일 구조. 세부 금액 단정 금지.
- "본인부담금은 일반 15%, 감경 대상 9·6%, 기초수급 면제" 수준의 구조 안내만.
- 정확한 금액·한 달 비용 확정 표기 금지 → "정확한 금액은 상담 시 안내" 톤.
- 이용시간(방문 횟수·시간)에 따라 월 한도 내 산정됨을 단정 없이 설명.

[금지]
- 후기·체험·성공사례·효과보장·완치·치료보장
- 치매 효과·완치·호전 단정(의료광고법) — 상황 묘사만 허용
- 광고 표현(${FORBIDDEN.join(" / ")})
- 매장명/센터명 본문 직접 노출(placeholder {storeName}만)
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 동네/근처/저희 센터" 자연 치환)

[필수]
- 핵심 키워드 5회 이상 / 지역+업종(방문요양·방문요양센터) 3회 이상
- 요양보호사가 어르신 댁을 찾아 하루를 돌보는 방문 이용 흐름을 짧게 보여줄 것(설명형이 아닌 이용형 전환)
- 정보블럭(이용대상/주요 서비스/이용비용/센터 선택 기준) 포함
- 사진 유도 자연스럽게(가정 방문·돌봄·식사 지원·방문목욕·병원 동행)
`.trim();

// buildPrompt: 서비스(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
export function buildPrompt({ treatment, region, storeName = "{storeName}" }) {
  const dir = treatment?.DIRECTION || {};
  return `
[업종] 방문요양(재가 방문요양)
[지역] ${region}
[주제] ${treatment?.name || ""}
[화자] ${region} 방문요양센터 (기관 화자, 사회복지사 톤 / 가정 방문 narrative)

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
- 방문요양은 요양보호사가 어르신 댁으로 찾아가는 재가 서비스임을 전제로 쓴다(시설 톤 금지).
- [방문 이용 흐름] 본론 뒤에, 요양보호사가 어르신 댁을 찾는 하루 방문 흐름을 짧은 한 단락으로 자연스럽게 보여준다. 예: 방문 → 건강상태 확인 → 식사 준비·복약 확인 → 일상생활 지원 → 정리 후 다음 방문 일정 안내. 목록·번호 없이 서술형 1단락으로, '댁으로 찾아가는' 가정 방문 톤 유지(시설 등원·생활실 표현 금지). 설명형이 아니라 어르신 댁에서 하루가 어떻게 진행되는지 그려지게 쓴다.
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 상담/문의 안내로 짧게 닫는다.
- 비용 언급 시 단정 금지, "상담 시 안내" 톤.
`.trim();
}

// 화자 오염 가드 (변호사/데이케어 케이스에서 발견된 패턴 차용)
// 헤더 OWNER 닉네임이 storeName으로 새어 화자/끝서명 오염 방지
export function buildOfficeIntro({ region, storeName }) {
  const safe = (storeName || "").trim();
  // 기관 화자 키워드가 없으면 일반 안내문으로 대체
  const isInstitution = /방문요양|재가|센터|복지/.test(safe);
  if (!safe || !isInstitution) {
    return `안녕하세요. ${region} 방문요양센터입니다.`;
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

// 이미지 alt — getImageAlts (사진 슬롯 5개 / 가정 방문 narrative)
export function getImageAlts({ region }) {
  return [
    `${region} 방문요양 가정 방문`,
    "요양보호사 어르신 돌봄",
    "식사·일상생활 지원",
    "방문목욕 서비스",
    "병원 동행·외출 지원",
  ];
}

// 정보블럭 렌더 헬퍼 (generateHomecare.js insertInfoBlock에서 사용)
export function renderInfoBlocks() {
  return Object.values(HOMECARE_INFO_BLOCKS)
    .map((b) => `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`)
    .join("\n\n");
}
