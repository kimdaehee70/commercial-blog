// lib/spine/consultRender.js
// 상담 계열 엔진 공통 렌더 계층 (COMMON_RENDER)
//
// 목적: 무속·사주·타로·철학관·작명·궁합 등 상담 계열 전 엔진이
//       동일한 사진 마커 / 위치 / 문의 / 고지 형식을 쓰도록 고정한다.
//
// 원칙
//  · 이 파일은 업종 지식을 갖지 않는다. 문자열 조립만 한다.
//  · 본문(GPT 생성)은 손대지 않는다. 마커 치환 + 후단 블록 부착만 수행한다.
//  · 주소·문의·고지는 모델이 쓰지 않는다. 여기서만 붙인다.
//    → "보이는 정보 = 실제 적용 정보" 보장. 모델이 주소를 창작할 수 없다.
//
// 호출 순서(고정): FORBIDDEN 검사 통과 → renderPhotoMarkers → appendTail
//   고지문을 먼저 붙이면 고지문이 금지어 검사 대상이 된다.

/* ═════════════════════════════════════════════
   1. 이모지 — 이 4개만 사용한다
   ═════════════════════════════════════════════ */
export const CONSULT_ICONS = {
  photo: "📷",
  location: "📍",
  contact: "📞",
  hours: "🕒",
  parking: "🚗",
  transit: "🚇",
  notice: "ℹ️",
};

// 사진 역할 기본 순서. 엔진에서 photoRoles로 덮어쓸 수 있다.
export const DEFAULT_PHOTO_ROLES = ["상담 공간", "상담 준비", "상담소 외관", "건물 입구"];

// 마지막 사진(건물 입구)은 CTA 구간에 붙는다 — 본문에서 소비하지 않는다.
const TAIL_PHOTO_INDEX = -1;

/* ═════════════════════════════════════════════
   2. 사진 마커 치환
   모델은 [사진] 만 출력한다. 캡션은 여기서 부여한다.
   → 41개 메뉴 전건 동일 형식 보장 (모델 캡션 편차 제거)
   ═════════════════════════════════════════════ */
const MARKER_RE = /\[\s*사진\s*\][^\n]*/g;

export function renderPhotoMarkers(text = "", roles = DEFAULT_PHOTO_ROLES) {
  const list = Array.isArray(roles) && roles.length ? roles : DEFAULT_PHOTO_ROLES;
  // 마지막 역할은 후단(CTA) 전용 → 본문 치환 대상에서 제외
  const bodyRoles = list.slice(0, Math.max(1, list.length - 1));

  let i = 0;
  const out = String(text).replace(MARKER_RE, () => {
    const role = bodyRoles[i] || bodyRoles[bodyRoles.length - 1];
    i += 1;
    return `${CONSULT_ICONS.photo} ${role}`;
  });

  return { text: out, used: i, bodyRoles, tailRole: list[list.length - 1] };
}

/* ═════════════════════════════════════════════
   3. 후단 블록
   ═════════════════════════════════════════════ */
export function buildLocationBlock(region, { reservation = true } = {}) {
  if (!region) return "";
  return `${CONSULT_ICONS.location} 상담소 위치\n${region}`;
}

/* ── 방문정보 정규화 ────────────────────────────
   업체정보 소스의 키 이름이 경로마다 달라 후보키를 순회한다.
   값이 없는 항목은 블록에서 통째로 빠진다(빈 라벨 노출 금지).
   ※ "보이는 정보 = 실제 적용 정보" — 없는 정보를 만들지 않는다.
   ──────────────────────────────────────────── */
const VISIT_KEYS = {
  address:     ["address", "addr", "road_address", "store_address"],
  phone:       ["phone", "tel", "phone_number", "contact", "store_phone"],
  reservation: ["reservation", "reserve_info", "booking", "reservation_info"],
  hours:       ["business_hours", "hours", "open_hours", "operating_hours", "consult_hours", "time"],
  holiday:     ["holiday", "closed_days", "day_off", "dayoff", "rest_day", "closed"],
  parking:     ["parking_info", "parking", "parking_desc"],
  transit:     ["transit", "subway", "transportation", "public_transit"],
};

function pick(src, keys) {
  for (const k of keys) {
    const v = src && src[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function normalizeVisitInfo(...sources) {
  const merged = {};
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    for (const [field, keys] of Object.entries(VISIT_KEYS)) {
      if (!merged[field]) merged[field] = pick(src, keys);
    }
  }
  return merged;
}

/* ── 방문정보 블록 ──────────────────────────────
   상담 계열 공통 형식. 값 있는 항목만 순서대로 출력.
   ──────────────────────────────────────────── */
export function buildVisitBlock(visit = {}, { reservationLabel = "상담 예약" } = {}) {
  const v = visit || {};
  const out = [];

  if (v.address) out.push(`${CONSULT_ICONS.location} 상담소 위치\n${v.address}`);

  const reserve = v.reservation || (v.phone ? "전화 예약 가능" : "");
  if (reserve) {
    out.push(`${CONSULT_ICONS.contact} ${reservationLabel}\n${v.phone ? `${v.phone} · ${reserve}` : reserve}`);
  }

  const time = [v.hours, v.holiday && `휴무 ${v.holiday}`].filter(Boolean).join(" · ");
  if (time) out.push(`${CONSULT_ICONS.hours} 상담 시간\n${time}`);

  if (v.parking) out.push(`${CONSULT_ICONS.parking} 주차\n${v.parking}`);
  if (v.transit) out.push(`${CONSULT_ICONS.transit} 대중교통\n${v.transit}`);

  return out.join("\n\n");
}


export function buildCtaBlock(ctaLine) {
  const line = String(ctaLine || "혼자 답이 나지 않는 상황이라면").trim();
  // 아이콘 없음 — 방문정보 블록의 "📞 상담 예약"과 중복되면 광고처럼 보인다.
  return `${line}\n편안한 마음으로 문의해 보시기 바랍니다.`;
}

export function buildPhotoLine(role) {
  if (!role) return "";
  return `${CONSULT_ICONS.photo} ${role}`;
}

export function buildNoticeBlock(notices = []) {
  const list = (Array.isArray(notices) ? notices : [notices]).filter(Boolean);
  if (!list.length) return "";
  return list.map((n) => `${CONSULT_ICONS.notice} ${String(n).trim()}`).join("\n\n");
}

/* ═════════════════════════════════════════════
   4. 후단 조립 — 순서 고정
   [본문] → 📞문의 문장 → 방문정보(📍🕒🚗🚇) → 📷건물 입구 → ℹ️고지
   ═════════════════════════════════════════════ */
export function appendTail(body = "", { region, ctaLine, notices = [], tailPhotoRole, visit } = {}) {
  const visitBlock = buildVisitBlock(visit || {});
  const blocks = [
    buildCtaBlock(ctaLine),
    // 방문정보가 있으면 그것이 위치 블록을 대신한다(주소 중복 방지).
    visitBlock || buildLocationBlock(region),
    buildPhotoLine(tailPhotoRole),
    buildNoticeBlock(notices),
  ].filter(Boolean);

  const base = String(body).trimEnd();
  if (!blocks.length) return base;
  return `${base}\n\n${blocks.join("\n\n")}`;
}

/* ═════════════════════════════════════════════
   5. 원샷 — 엔진에서 이것만 부르면 된다
   ═════════════════════════════════════════════ */
export function renderConsultPost(body = "", opts = {}) {
  const { photoRoles, region, ctaLine, notices, visit } = opts;
  const p = renderPhotoMarkers(body, photoRoles);
  const text = appendTail(p.text, {
    region,
    ctaLine,
    notices,
    visit,
    tailPhotoRole: p.tailRole,
  });
  return { text, photoUsed: p.used, photoRoles: p.bodyRoles, tailPhotoRole: p.tailRole };
}

/* 모델 프롬프트에 주입할 공통 지시 — 형식을 모델이 흉내내지 못하게 막는다 */
export const CONSULT_RENDER_PROMPT_RULE = `[형식 — 반드시 지킨다]
· 사진 자리는 [사진] 이라고만 쓴다. 뒤에 설명을 붙이지 않는다.
· 주소·전화·영업시간·휴무·주차·교통·고지 문구를 본문에 쓰지 않는다. 글 뒤에 자동으로 붙는다.
· 이모지를 쓰지 않는다.
· 마지막 문단을 안내문으로 끝내지 않는다. 독자에게 건네는 문장으로 닫는다.`;
