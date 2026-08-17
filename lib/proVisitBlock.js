// ============================================================
// lib/proVisitBlock.js — 전문직 방문정보 공통 후단 블록
//   대상: 변호사(lawyer) · 법무사(legal) · 행정사(administrative) · 노무사(labor) · 세무사(tax)
//   확장 예정: 회계사 / 관세사 / 변리사 — 엔진 추가 시 후단 1줄 연결만 (모듈 무수정)
// ------------------------------------------------------------
// [세션47][PRO-VISIT] 전문직 방문정보 공통화. 병원 locationBlock 재사용 · 업종 분기 0.
//
// 역할: 생성 완료 본문의 "해시태그 직전"에 방문정보 전체를 1회 삽입.
//   · narrative 아님 — 순수 기능 모듈. Naver §6 "기능은 공유, 철학·narrative는 업종 독립" 정합.
//   · 엔진(prompt/section/scene/density/QC) 무관 — 응답 직전 문자열 삽입 전용.
//   · 업종별 prompt 수정 0. 공통 블록 자동 출력.
//
// ★ locationBlock 재사용: 「📍 찾아오시는 길」은 buildLocationBlock(store)를 그대로 호출.
//   병원과 동일 출력. 위치 문자열을 이 모듈이 다시 만들지 않는다(SoT 이중화 금지).
//
// 데이터 출처 (신규 스키마 추가 0):
//   · 위치     → store_profiles 위치 5필드 (address / map_guide / transit / building_desc / parking_info)
//   · 방문상담 → store_profiles.visit_info (JSONB · 세션34 승인·배포 완료)
//   index.js가 hubStore에서 둘 다 페이로드로 실어 보냄(v-loc + 세션37 배선). 프론트 수정 불필요.
//
// ★ SoT 일원화: 전화상담 · 방문상담 · 예약안내 = 이 모듈만이 정본.
//   기존 buildOfficeClosing(phone/consultInfo)은 index.js 페이로드에 phone/consultInfo가
//   존재하지 않아 실제로는 항상 빈값(미출력)이었다 — 사문화 코드. 중복 발생 0.
//
// 출력 순서(고정 · 전문직 전체 동일):
//   본문
//   ─────────────────────────────
//   📷 사무소 외관
//   📍 찾아오시는 길   ← 주소 / 지도안내·건물층 / 대중교통 / 주차  (buildLocationBlock · 병원 동일)
//   📷 건물 입구
//   🗓 방문상담 안내   ← 상담시간·점심·휴무·상담예약·전화상담·방문상담·야간주말·초회준비·주차·문의·기타
//   #해시태그
//   [세션60] 방문 사진 2장(외관·입구)로 축소. 상담실·대표실·주차장·약도 슬롯 제거
//           (방문정보 목적=위치/방문법. 정보축 1개에 사진 다장 = 반복).
//
// 설계 원칙(PHILOSOPHY 정합):
//   1) 매장명/브랜드명 본문 직접 노출 금지 → store_name 미사용. (상호 = 제목 접미사 TITLE-SUFFIX 소관)
//   2) 광고어 0. 사실 안내만.
//   3) 값 없으면 그 줄 생략. 전부 비면 해당 블록 미생성 → 빈 박제 방지.
//   4) 사진 = placeholder 방식(병원 동일 정책). [이미지: alt] 메타 → 핸들러 applyPhotoBoxes가 변환.
//      실제 이미지 업로드/삽입 기능 없음.
//   5) 지도 = [이미지: 약도(지도)] placeholder 만. Static Map / 네이버·카카오 API 연동은 별도 축(범위 외).
//      사유: API Key 관리 · 과금 · 실패 처리 · 캐싱 = 모두 별도 축.
//   6) 주소 없으면 위치블록 미생성 — 그래도 방문상담·사진은 출력(부분 입력 매장 대응).
// ============================================================

import { buildLocationBlock } from "./locationBlock.js"; // ★ 병원 위치블록 재사용 (SoT 단일)

// ── 방문상담 필드 → 출력 라벨 (Store.js VISIT_INFO_FIELDS_PRO 와 1:1) ──
const PRO_VISIT_LINES = [
  { key: "businessHours", label: "상담시간" },
  { key: "lunchHours",    label: "점심시간" },
  { key: "closedDays",    label: "휴무일" },
  { key: "reservation",   label: "상담예약" },
  { key: "phoneConsult",  label: "전화상담" },
  { key: "visitConsult",  label: "방문상담" },
  { key: "nightWeekend",  label: "야간·주말" },
  { key: "firstConsult",  label: "초회상담 준비" },
  { key: "parkingOps",    label: "주차 안내" },
  { key: "phone",         label: "문의" },
  { key: "etc",           label: "기타 안내" },
];

// ── 사진 슬롯 (전문직 공통 6종 · 업종 분기 0) ──────────────
export const PRO_PHOTO_SLOTS = {
  OFFICE:   "사무소 외관",
  ENTRANCE: "건물 입구",
  CONSULT:  "상담실",
  DIRECTOR: "대표실",
  PARKING:  "주차장",
  MAP:      "약도(지도)",
};

// 캡션 SoT — 각 핸들러 PHOTO_POOL에 없는 alt를 이 POOL이 커버(업종 분기 0).
export const PRO_PHOTO_POOL = {
  "사무소 외관": { photos: ["사무소 외관 / 간판 사진"],      captions: ["사무소 외관"] },
  "건물 입구":   { photos: ["건물 입구 / 층 안내 사진"],     captions: ["건물 입구 안내"] },
  "상담실":      { photos: ["상담실 내부 사진"],             captions: ["상담실 안내"] },
  "대표실":      { photos: ["대표 집무실 / 프로필 사진"],    captions: ["대표 안내"] },
  "주차장":      { photos: ["주차장 입구 / 주차 공간 사진"],  captions: ["주차 안내"] },
  "약도(지도)":  { photos: ["약도 · 지도 캡처 이미지"],       captions: ["찾아오시는 길"] },
};

const _img = (alt) => `[이미지: ${alt}]`;

/**
 * buildProVisitBlock(visitInfo)
 * @param {object} visitInfo  store_profiles.visit_info (JSONB)
 * @returns {string}  「🗓 방문상담 안내」 블록. 데이터 전무면 "".
 */
export function buildProVisitBlock(visitInfo) {
  const v = (visitInfo && typeof visitInfo === "object") ? visitInfo : {};

  const rows = [];
  for (const f of PRO_VISIT_LINES) {
    const val = String(v[f.key] || "").trim();
    if (!val) continue;                         // 원칙3 — 빈 줄 생략
    rows.push(`${f.label}: ${val}`);
  }
  if (!rows.length) return "";                  // 전부 비면 블록 미생성

  return ["🗓 방문상담 안내", "", ...rows].join("\n").trim();
}

/**
 * insertProVisitInfo(text, store, visitInfo)
 * 완성 본문의 해시태그 직전에 [사진 + 위치 + 방문상담 + 약도] 전체를 1회 삽입.
 *
 *   ⚠ 이 함수를 태우는 핸들러는 insertLocationBeforeHashtags 를 별도 호출하지 않는다.
 *      위치블록이 이 함수에 포함되어 있다 — 2회 삽입 방지.
 *
 *   · 맨 끝 줄이 해시태그(#)면 그 위에 삽입. 해시태그 없으면 본문 끝에 append.
 *   · 위치·방문상담 데이터가 전무해도 사진 placeholder는 출력(전문직 공통 방문 유도 정책).
 *
 * @param {string} text       완성 본문(해시태그 포함 가능)
 * @param {object} store      위치 5필드 (+ industry — hasPhysicalStore 게이트용)
 * @param {object} visitInfo  store_profiles.visit_info
 * @returns {string}
 */
export function insertProVisitInfo(text, store, visitInfo) {
  const src      = String(text || "");
  const locBlock = buildLocationBlock(store);        // ★ 병원 위치블록 재사용
  const visBlock = buildProVisitBlock(visitInfo);

  const trimmed  = src.trimEnd();
  const lines    = trimmed.split("\n");
  const lastLine = (lines[lines.length - 1] || "").trim();
  const hasHash  = lastLine.startsWith("#");

  const hashLine = hasHash ? lines.pop() : "";
  const bodyOnly = lines.join("\n").trimEnd();

  const parts = [bodyOnly];

  if (locBlock) {
    parts.push(locBlock);                           // ② 📍 찾아오시는 길
  }
  if (visBlock) parts.push(visBlock);               // ④ 🗓 방문상담 안내
  // [세션60] 방문 사진 2장 축소 — 외관·입구만. 목적=위치/방문법 안내에 정합.
  //   제거: 상담실·대표실·주차장·약도. 정보축 1개(방문)에 사진 4장은 반복.
  //   주차/약도 정보는 텍스트(locBlock 주차 라인 · 네이버 지도 자동)로 이미 커버.
  //   PRO_PHOTO_SLOTS/POOL 정의는 보존(핸들러 PHOTO_POOL fallback 참조 안전).

  let out = parts.filter(Boolean).join("\n\n");
  if (hasHash) out += "\n\n" + hashLine;
  return out.trim() + "\n";
}

export default buildProVisitBlock;
