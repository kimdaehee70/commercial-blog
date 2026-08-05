// lib/spine/consumeStoreProfile.js
// D-3-5 Consumer Adapter v1
// 책임: consumableBy 확인 → 빈 value 제외 → { slot, value, meta } 분배. 그 외 금지.
// STORE_PROFILE을 아는 유일한 지점. 소비자는 자기 View만 받는다.

// D-4-3a Slot Contract 통합 — Builder(STORE_PROFILE) slot = SoT. Adapter는 Builder 계약만 소비.
// 변경: tel→phone / counsel_hours→business_hours 흡수. 폐기 6종(Builder·store_profiles·visit_info 대응 없음):
//        open24 · facility · service · parking_count · barrier_free · homepage(slot). parking_ops 미추가(이번 축 제외).
// 원칙: alias 없음 / Consumer 무수정 / Builder에 없는 slot 참조 금지.
const CONSUMABLE_BY = {
  funeral: {
    name:           { promptBody: false, visitBlock: true,  homepage: true,  aiConsult: true  },
    industry:       { promptBody: true,  visitBlock: false, homepage: true,  aiConsult: true  },
    phone:          { promptBody: false, visitBlock: true,  homepage: true,  aiConsult: true  },  // was: tel
    address:        { promptBody: false, visitBlock: true,  homepage: true,  aiConsult: true  },
    transit:        { promptBody: true,  visitBlock: true,  homepage: true,  aiConsult: true  },
    business_hours: { promptBody: true,  visitBlock: true,  homepage: true,  aiConsult: true  },  // was: counsel_hours (흡수)
    parking:        { promptBody: false, visitBlock: true,  homepage: true,  aiConsult: true  },
    // 폐기(Builder 미대응): open24 / facility / service / parking_count / barrier_free / homepage(slot)
    // 제외(유지): 지도(locationBlock 소관) / 대표지역(생성컨텍스트) / 사진·ALT(photo 계열)
  },

  // ── D-4-5b: dental promptBody 소비 정책 ────────────────────────────────
  //   목적 = 본문 '판단 보조 사실'만. 하단 proVisitBlock(방문정보 출력)과 역할 분리.
  //   promptBody:true 3종만(business_hours/transit/parking_ops) — 본문은 "확인 항목" 톤으로 소화.
  //   visitBlock/homepage/aiConsult 는 이번 축 미배선(Consumer 없음) → false 고정. 추정 배선 금지.
  dental: {
    business_hours: { promptBody: true,  visitBlock: false, homepage: false, aiConsult: false },
    transit:        { promptBody: true,  visitBlock: false, homepage: false, aiConsult: false },
    parking_ops:    { promptBody: true,  visitBlock: false, homepage: false, aiConsult: false },
    // 제외: name/address/phone(광고 주체 노출 · PHILOSOPHY 원칙1) / parking·map_guide·building_desc(locationBlock 소관)
    //       reservation·reception 등 방문정보 계열(proVisitBlock 소관 · 본문 중복 방지)
  },
};

const VIEWS = ["promptBody", "visitBlock", "homepage", "aiConsult"];

// value 존재 판정 — 빈 문자열/null/undefined/빈배열/빈객체 = 없음
function hasValue(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

/**
 * @param {object} storeProfile  SoT. { industry, slots: { [slot]: { value, meta } } } 형태 가정
 * @returns {{promptBody:[], visitBlock:[], homepage:[], aiConsult:[]}}
 */
function consumeStoreProfile(storeProfile) {
  const view = { promptBody: [], visitBlock: [], homepage: [], aiConsult: [] };
  if (!storeProfile || !storeProfile.slots) return view;

  const industry = storeProfile.industry;
  const policy = CONSUMABLE_BY[industry];
  if (!policy) return view; // 미정의 업종 = 전 View 빈 배열 (역참조·추정 금지)

  for (const [slot, entry] of Object.entries(storeProfile.slots)) {
    const rule = policy[slot];
    if (!rule) continue;                 // 정책 미선언 slot = 어느 View에도 안 감
    const value = entry ? entry.value : undefined;
    if (!hasValue(value)) continue;      // 빈 value = 제외 (소비자는 '있는 것만' 받음)
    const meta = entry ? entry.meta : undefined; // 참조 전달 (복사 아님)

    for (const v of VIEWS) {
      if (rule[v]) view[v].push({ slot, value, meta });
    }
  }
  return view;
}

module.exports = { consumeStoreProfile, CONSUMABLE_BY };
