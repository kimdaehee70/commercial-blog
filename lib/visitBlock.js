// lib/visitBlock.js
// ─────────────────────────────────────────────────────────────
// 방문정보 공통 후단 블록 — 전 업종 공유 기능 모듈 (narrative 아님).
//
// [D-3-6-1] Consumer 계약 전환:
//   · 입력이 STORE_PROFILE(평면 JSONB)이 아니라 view.visitBlock = [{slot,value,meta}].
//   · buildVisitBlock은 STORE_PROFILE을 모른다 (D-3-2 불변식).
//   · label은 meta.label에서 온다. 순서(정렬)만 Consumer(=여기)가 소유 (D-3-3).
//   · value 유무·소비처 필터링은 Adapter가 이미 처리 → 여기선 '있는 것만' 받음.
//
// 설계 원칙 (locationBlock.js 동형):
//   · GPT 생성 영역이 아님. 사업장이 입력한 값만 그대로 출력.
//   · 프롬프트 주입 없음. 응답 직전 문자열 삽입 전용.
//   · 전건 빈 배열 → "" 반환(부작용 0).
//
// 공개 API 2종:
//   buildVisitBlock(visitView)              → 블록 문자열 (빈값이면 "")
//   insertVisitBeforeHashtags(text, visitView) → 해시태그 직전 삽입
//
// 삽입 순서 (핸들러 후단):
//   insertVisitBeforeHashtags(...)      ← 먼저
//   insertLocationBeforeHashtags(...)   ← 나중
//   결과: 🏥 방문 안내 → 📍 찾아오시는 길 → #해시태그
// ─────────────────────────────────────────────────────────────

// slot 정렬 우선순위 (사용자 확인 흐름: 운영시간 → 예약/접수 → 준비 → 부가).
// 순서만 소유. label은 meta.label에서 온다. FIELD_ORDER에 없는 slot은 뒤에 입력순 유지.
const FIELD_ORDER = [
  // medical 계열 [v127] 진료시간 세분화 · 예약/접수/준비 계열 폐기(입력폼 삭제)
  "businessHours", "lunchHours", "satHours", "nightHours", "holidayHours",
  "closedDays", "parkingOps", "transit",
  // 폐기(호환 유지용 — 기존 저장 데이터 있으면 뒤에 출력)
  "reservation", "reception", "sameDay", "walkIn",
  "firstVisit", "examPrep", "guardian", "phone", "etc",
  // funeral 계열 (D-3-4 v2 물리 slot)
  "open24", "counsel_hours",   // transit은 medical 계열에서 이미 선언(중복 제거)
  "parking", "parking_count", "barrier_free",
  "tel", "facility",
];

// slot명 fallback 라벨 (meta.label 부재 시에만 사용)
const FALLBACK_LABEL = {
  businessHours: "평일 진료시간", lunchHours: "점심시간",
  satHours: "토요일 진료", nightHours: "야간진료", holidayHours: "일요일·공휴일",
  closedDays: "휴진일",
  reservation: "예약", reception: "접수", sameDay: "당일 접수", walkIn: "예약 없이 방문",
  firstVisit: "초진 준비", examPrep: "검사 전 준비", guardian: "보호자 동행",
  parkingOps: "🚗 주차안내", transit: "🚇 대중교통", phone: "문의", etc: "기타 안내",
  open24: "24시간 운영", counsel_hours: "상담 시간",
  parking: "주차", parking_count: "주차 대수", barrier_free: "배리어프리",
  tel: "문의", facility: "시설",
};

const VISIT_TITLE = "🏥 방문 안내";

function _clean(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "가능" : "";   // boolean slot(주차 등): true만 노출
  if (typeof v === "number") return String(v).trim();
  if (Array.isArray(v)) return v.map(_clean).filter(Boolean).join(", ");
  if (typeof v !== "string") return "";
  return v.replace(/\s+/g, " ").trim();
}

function _orderIndex(slot) {
  const i = FIELD_ORDER.indexOf(slot);
  return i === -1 ? FIELD_ORDER.length : i;   // 미정의 slot은 뒤로
}

/**
 * 방문 블록 생성.
 * @param {Array<{slot:string,value:*,meta?:{label?:string}}>} visitView
 *        Adapter가 준 visitBlock View. 값 유무·소비 필터링은 이미 완료된 상태.
 * @returns {string} 블록 문자열. 유효 항목 0개면 "" (부작용 0)
 */
export function buildVisitBlock(visitView) {
  if (!Array.isArray(visitView) || visitView.length === 0) return "";

  // 정렬(Consumer 책임): FIELD_ORDER 우선순위 → 동순위는 원래 입력 순서 유지
  const sorted = visitView
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const d = _orderIndex(a.e.slot) - _orderIndex(b.e.slot);
      return d !== 0 ? d : a.i - b.i;
    })
    .map((x) => x.e);

  const lines = [];
  for (const { slot, value, meta } of sorted) {
    const val = _clean(value);
    if (!val) continue;                       // 빈/false 항목 미출력
    const label = (meta && meta.label) || FALLBACK_LABEL[slot] || slot;
    lines.push(label + ": " + val);
  }
  if (lines.length === 0) return "";          // 전건 빈값 → 블록 미생성

  return VISIT_TITLE + "\n\n" + lines.join("\n");
}

/**
 * 본문 맨 끝 해시태그 줄 직전에 방문 블록 삽입.
 * locationBlock.insertLocationBeforeHashtags 와 동일 계약.
 * @param {string} text
 * @param {Array} visitView   view.visitBlock
 * @returns {string}
 */
export function insertVisitBeforeHashtags(text, visitView) {
  const src = String(text || "");
  const block = buildVisitBlock(visitView);
  if (!block) return src;                     // 빈값 → 원문 그대로

  const lines = src.split("\n");

  // 뒤에서부터 해시태그 줄 탐색 (#으로 시작하는 마지막 라인)
  let hashIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith("#")) { hashIdx = i; break; }
    break;                                    // 비어있지 않은 마지막 줄이 해시태그가 아니면 중단
  }

  if (hashIdx === -1) {
    return src.replace(/\s+$/, "") + "\n\n" + block + "\n";
  }

  const body    = lines.slice(0, hashIdx).join("\n").replace(/\s+$/, "");
  const hashtag = lines.slice(hashIdx).join("\n").trim();

  return body + "\n\n" + block + "\n\n" + hashtag + "\n";
}

export default { buildVisitBlock, insertVisitBeforeHashtags };
