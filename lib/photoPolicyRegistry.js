// lib/photoPolicyRegistry.js
// 사진 정책 SoT (운영 정책 — 엔진 4파일 무관 / narrative 아님 / 표시 전용)
// 근거: 세션47 — 사진 슬롯은 Restaurant 공통 운영정책. 한식·중식·양식·분식·치킨 일괄 적용.
//   generate/data/prompts/playConfig 무관. index.js 발행 전 체크리스트가 조회만 한다.
// 원칙(PHILOSOPHY 정합): 매장명 미노출 / scene 강화 축과 별개(본문 반영 사진은 엔진 소유).
//   이 파일은 "발행 시 어떤 사진을 몇 장 준비하라"는 사용자 안내용 SoT일 뿐이다.

// Restaurant 계열 공통 5슬롯 (기본 5장 · 권장 6~7장)
//   대표메뉴는 복수 허용 → 권장 상한 6~7장.
export const RESTAURANT_PHOTO_SLOTS = {
  baseCount: 5,
  recommendMax: 7,
  slots: [
    { key: "exterior",  label: "외관",        desc: "간판·입구·건물 전경" },
    { key: "interior",  label: "실내/좌석",   desc: "홀·좌석 배치·테이블" },
    { key: "repMenu",   label: "대표 메뉴",   desc: "간판 메뉴 클로즈업(1~2컷 권장)" },
    { key: "menuBoard", label: "메뉴판",      desc: "메뉴·가격 확인용" },
    { key: "mood",      label: "분위기/디테일", desc: "조명·플레이팅·창가 등 디테일" },
  ],
};

// 병원(V2 정보형) 공통 사진 정책 — HOSPITAL-PHOTO-POLICY-01 · V1
//   근거: 4표본 실측(비뇨기과 방광내시경 / 정형외과 목디스크 / 안과 안압검사 / 치과 임플란트).
//   7슬롯 전건 판정 결과, 사진 가치가 있는 지점은 "찍을 실물이 존재하는 곳" 2~3축뿐이었다.
//   제외 확정: visitTrigger / treatmentDecision / checkPoint / closing
//     → 전부 판단·설명 문단이라 촬영 대상 자체가 없다. 슬롯을 두면 억지 사진을 요구하게 된다.
//
//   ★ 이 registry 는 "사진을 넣을 위치와 개수"만 소유한다.
//     "무슨 사진인지"(ALT·문구)는 각 진료과 *-v2-prompts.js 소유 — 업종 정체성 분리.
//
//   ★ maxCount 는 자리 제공 상한이지 사용자 업로드 의무가 아니다.
//     슬롯이 노출돼도 사용자는 2장만 넣어도 정상이며, 미입력이 생성·발행을 막지 않는다.
//
//   ※ care(치료·시술 장면) 슬롯 HOLD — 해제 조건: 치료/검사를 안정적으로 구분하는
//     구조적 데이터 축이 신설될 때만 재검토. *-v2-data.js 의 cat 은 부위·질환 분류축이라
//     (검사 / 망막·녹내장 / 자궁 / 전립선 …) 치료·검사 판별 SoT 로 쓸 수 없음 — 실측 기각.
export const CLINIC_PHOTO_SLOTS = {
  maxCount: 3,
  slots: [
    { key: "topic", section: "concern",     label: "주제 대표",   role: "대표", desc: "질환·검사·치료 주제를 한눈에 보여주는 이미지" },
    { key: "exam",  section: "examination", label: "검사·확인",   role: "설명", desc: "검사장비·검사영상·실제 확인 과정" },
    { key: "place", section: "sceneVisit",  label: "진료실·검사실", role: "신뢰", desc: "실제 진료·검사 공간 또는 진료 과정" },
  ],
};

// 사진 슬롯 허용 섹션 집합 — 미등재 섹션은 사진 미부착.
//   호출부(generate*V2.js)는 이 집합을 통과한 섹션에만 ALT 를 조회한다.
//   ※ 폴백 금지: 문구가 없으면 슬롯을 만들지 않는다. 다른 슬롯 ALT 로 대신 채우지 말 것.
export function getClinicPhotoSections() {
  return new Set(CLINIC_PHOTO_SLOTS.slots.map(s => s.section));
}

// 섹션명 alias — handler 단위 스코프 (HOSPITAL-PHOTO-POLICY-01 · S179)
//   ★ 전역 의미변환기가 아니다. 여기 등재된 handler 범위에서만 alias 가 작동한다.
//     "exam === examination" 이 모든 병원에서 참이라는 계약이 아니며, 그렇게 확대하면
//     clinic 사고(섹션명은 같은데 실제 의미가 다름)가 재발한다.
//
//   등재 조건 = playConfig description 실측으로 3역할이 모두 성립할 것.
//     general : exam(기본검사 목적) / process(접수→문진→기본검사→결과 확인)
//     family  : checkItems(진료에서 무엇을 확인) / process(진료실과 검사실에서 확인하는 과정)
//
//   ※ clinic 미등재 — 의도적. examination 은 '시술 전 확인사항'(촬영 실물 없음),
//     visitInfo 는 '진료 흐름·상담 시 확인사항'으로 sceneVisit 이 아니다. 실측 HOLD.
//   ※ 미등재 handler 는 기본 계약(concern/examination/sceneVisit)만 통과한다.
const CLINIC_PHOTO_SECTION_ALIASES = {
  general: { concern: "concern", examination: "exam",       sceneVisit: "process" },
  family:  { concern: "concern", examination: "checkItems", sceneVisit: "process" },
};

// 단건 판정 헬퍼 — 섹션 루프에서 사용.
//   handlerKey 미지정 시 기존 동작 유지(기본 계약). 등재 handler 는 alias 집합만 통과.
export function isClinicPhotoSection(sectionKey, handlerKey) {
  if (!sectionKey) return false;
  const alias = handlerKey ? CLINIC_PHOTO_SECTION_ALIASES[handlerKey] : null;
  if (alias) return Object.values(alias).includes(sectionKey);
  return CLINIC_PHOTO_SLOTS.slots.some(s => s.section === sectionKey);
}

// 슬롯 section→key 맵 (진단·QC 용)
export function getClinicPhotoSlotMap() {
  const m = {};
  for (const s of CLINIC_PHOTO_SLOTS.slots) m[s.section] = s.key;
  return m;
}

// Restaurant 계열 업종 키 (index.js NONMEDICAL_INDUSTRIES 중 음식점 계열과 정합)
const RESTAURANT_INDUSTRIES = new Set([
  "restaurant", "korean", "chinese", "japanese", "western", "snack", "chicken", "meat", "cafe",
]);

// 조회 진입점 — industry(hubStore.industry SoT) 받아 사진 정책 반환.
//   미지정/미매핑 → null 반환(호출부에서 기존 하드코딩 폴백).
export function getPhotoPolicy(industry) {
  if (!industry) return null;
  if (RESTAURANT_INDUSTRIES.has(industry)) return RESTAURANT_PHOTO_SLOTS;
  return null; // 병원 등은 호출부 기존값 유지(스코프 최소화)
}

// 체크리스트 표시용 요약 문자열 — "외관·실내/좌석·대표 메뉴·메뉴판·분위기/디테일"
export function photoDescLine(policy) {
  if (!policy || !policy.slots) return "";
  return policy.slots.map(s => s.label).join("·");
}

// ── 엔진 상속용 (본문 이미지 마커 SoT) ──────────────────────────
// Restaurant 계열 엔진이 import 해서 사용. 슬롯 정의는 여기 단일 SoT.
// 엔진 역할: 삽입 위치 + ALT/캡션만 담당. 슬롯 순서·라벨은 registry가 소유.

// 본문 마커 라벨 배열 — ["외관","실내/좌석","대표 메뉴","메뉴판","분위기/디테일"]
export function getRestaurantPhotoLabels() {
  return RESTAURANT_PHOTO_SLOTS.slots.map(s => s.label);
}

// 본문 마커 문자열 배열 — ["[이미지: 외관]", ...]
export function getRestaurantPhotoMarkers() {
  return RESTAURANT_PHOTO_SLOTS.slots.map(s => `[이미지: ${s.label}]`);
}

// 슬롯 key→label 맵 (정규화·ALT 매핑용)
export function getRestaurantPhotoSlotMap() {
  const m = {};
  for (const s of RESTAURANT_PHOTO_SLOTS.slots) m[s.key] = s.label;
  return m;
}
