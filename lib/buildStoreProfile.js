// lib/buildStoreProfile.js
// ─────────────────────────────────────────────────────────────
// D-4 STORE_PROFILE Builder — 흩어진 입력 3소스를 STORE_PROFILE(SoT) 하나로 조립.
//
// 계약 (D-4-1 / D-4-2 확정):
//   책임 5개 : ①3소스 수집 ②소스 우선순위 ③visit_info Flatten ④slots 조립 ⑤meta.source 기록
//   금지     : consumableBy / View 생성 / Consumer 호출 / 정렬 / Prompt / 표현 / 임의 slot 생성
//
//   불변식(대칭 원칙): Builder는 소비 정책(consumableBy)을 모른다. 입력 형태만 알고 View는 모름.
//                     consumeStoreProfile(Adapter)이 SoT를 아는 유일한 소비 지점.
//
//   충돌 우선순위 3축:
//     · 소스 간        : req.body > Supabase(store) > autoCollect   (D-4-1)
//     · Supabase 내부  : 최상위 컬럼 > visit_info(jsonb)             (D-4-2)
//     · 중복 vs 보완   : phone/business_hours/closed_days = 중복(정규화)
//                        parking_info(parking) ≠ parkingOps(parking_ops) = 보완(별도 slot)
//
//   empty 판정 = null / undefined / "" / 공백만. 0·false는 유효값.
//   모든 소스 empty인 slot → 미생성(애초에 안 만듦).
// ─────────────────────────────────────────────────────────────

// TODO(D-2): D-2 SLOT_SCHEMA 확정 시 import로 교체.
//   import { SLOT_SCHEMA } from "./storeProfileSchema.js";
//   현재는 임시 내부 상수. 교체 시 아래 로직은 무수정.
//   label/type = slot 고정 속성(스키마 소유). source는 Builder가 런타임 기록.
const SLOT_SCHEMA = {
  name:            { label: "상호",        type: "string" },
  address:         { label: "주소",        type: "string" },
  region:          { label: "지역",        type: "string" },
  sub_region:      { label: "세부지역",    type: "string" },
  phone:           { label: "문의",        type: "string" },
  parking:         { label: "주차",        type: "string" },  // 위치·공간
  parking_ops:     { label: "주차 안내",   type: "string" },  // 운영(무료시간·등록·주차권)
  business_hours:  { label: "운영시간",    type: "string" },
  lunch_hours:     { label: "점심시간",    type: "string" },
  closed_days:     { label: "휴무일",      type: "string" },
  map_guide:       { label: "지도 안내",   type: "string" },
  transit:         { label: "대중교통",    type: "string" },
  building_desc:   { label: "건물 위치",   type: "string" },
  reservation:     { label: "예약",        type: "string" },
  reception:       { label: "접수",        type: "string" },
  same_day:        { label: "당일 접수",   type: "string" },
  walk_in:         { label: "예약 없이 방문", type: "string" },
  first_visit:     { label: "초진 준비",   type: "string" },
  exam_prep:       { label: "검사 전 준비", type: "string" },
  guardian:        { label: "보호자 동행", type: "string" },
  specialty:       { label: "전문",        type: "string" },
  departments:     { label: "진료과",      type: "array"  },
  title_suffix_on: { label: "제목 상호표시", type: "boolean" },
  etc:             { label: "기타 안내",   type: "string" },
};

// ── 매핑표 (D-4-2) ─────────────────────────────────────────────

// req.body 필드명 → slot. "매핑 안 함"(program/hallName)은 여기 없음 → 핸들러 직접 소비.
const REQBODY_MAP = {
  storeName:     "name",
  address:       "address",
  userRegion:    "region",
  region:        "region",
  map_guide:     "map_guide",
  transit:       "transit",
  building_desc: "building_desc",
  parking_info:  "parking",
};

// store_profiles 최상위 컬럼 → slot. (naver_*_url = 참고링크, 본문 미노출 → slot 제외)
const STORE_TOP_MAP = {
  store_name:      "name",
  address:         "address",
  region:          "region",
  sub_region:      "sub_region",
  phone:           "phone",
  parking_info:    "parking",
  business_hours:  "business_hours",
  closed_days:     "closed_days",
  map_guide:       "map_guide",
  transit:         "transit",
  building_desc:   "building_desc",
  specialty:       "specialty",
  departments:     "departments",
  title_suffix_on: "title_suffix_on",
};

// store_profiles.visit_info(jsonb) 13키 → slot. Builder가 Flatten.
const VISIT_INFO_MAP = {
  businessHours: "business_hours", // 중복 → 최상위 우선(폴백)
  lunchHours:    "lunch_hours",
  closedDays:    "closed_days",    // 중복 → 최상위 우선(폴백)
  reservation:   "reservation",
  reception:     "reception",
  sameDay:       "same_day",
  walkIn:        "walk_in",
  firstVisit:    "first_visit",
  examPrep:      "exam_prep",
  guardian:      "guardian",
  parkingOps:    "parking_ops",    // 보완 → parking과 별도 slot
  phone:         "phone",          // 중복 → 최상위 우선(폴백)
  etc:           "etc",
};

// ── empty 판정 ─────────────────────────────────────────────────
function _isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false; // 0 / false / 비배열 객체 = 유효
}
function _norm(v) {
  return (typeof v === "string") ? v.trim() : v;
}

// ── 후보 수집 ──────────────────────────────────────────────────
// 각 slot에 대해 소스 우선순위 순서로 후보를 push. 먼저 오는 non-empty가 승자.
// 순서 = D-4-1(소스 간) × D-4-2(Supabase 내부). 즉:
//   1) req.body        (source="body")
//   2) store 최상위     (source="supabase")
//   3) store.visit_info (source="supabase")   ← 같은 supabase지만 최상위 뒤
//   4) autoCollect      (source="auto")
function _collect(reqBody, store, autoCollect) {
  const candidates = {}; // slot -> [{ value, source }]  (우선순위 순 push)
  const push = (slot, value, source) => {
    if (_isEmpty(value)) return;
    (candidates[slot] || (candidates[slot] = [])).push({ value: _norm(value), source });
  };

  // 1) req.body
  for (const [field, slot] of Object.entries(REQBODY_MAP)) {
    push(slot, reqBody?.[field], "body");
  }
  // 2) store 최상위
  for (const [col, slot] of Object.entries(STORE_TOP_MAP)) {
    push(slot, store?.[col], "supabase");
  }
  // 3) store.visit_info (Flatten)
  const vi = store?.visit_info;
  if (vi && typeof vi === "object" && !Array.isArray(vi)) {
    for (const [key, slot] of Object.entries(VISIT_INFO_MAP)) {
      push(slot, vi[key], "supabase");
    }
  }
  // 4) autoCollect (slot 키 직접 — 결측 보완용)
  if (autoCollect && typeof autoCollect === "object") {
    for (const [slot, value] of Object.entries(autoCollect)) {
      if (SLOT_SCHEMA[slot]) push(slot, value, "auto");
    }
  }
  return candidates;
}

/**
 * STORE_PROFILE Builder.
 * @param {object}  opts
 * @param {string}  opts.industry     - 업종 키 (funeral 등)
 * @param {object}  opts.reqBody      - 핸들러 req.body (평면 필드)
 * @param {object}  opts.store        - store_profiles 1행 (me/store.js GET store{...})
 * @param {object}  [opts.autoCollect] - 자동수집(결측 보완). slot 키 직접.
 * @returns {{ industry: string, slots: object }}
 */
export function buildStoreProfile({ industry, reqBody, store, autoCollect } = {}) {
  const candidates = _collect(reqBody || {}, store || {}, autoCollect || {});

  const slots = {};
  for (const [slot, list] of Object.entries(candidates)) {
    if (!SLOT_SCHEMA[slot]) continue;          // 누락 정책: 매핑 밖 slot 무시(임의 생성 차단)
    const winner = list[0];                    // 우선순위 순 push → 첫 non-empty가 승자
    if (!winner) continue;
    const sch = SLOT_SCHEMA[slot];
    slots[slot] = {
      value: winner.value,
      meta: { label: sch.label, type: sch.type, source: winner.source },
    };
  }

  return { industry: industry || store?.industry || null, slots };
}

export default { buildStoreProfile };
