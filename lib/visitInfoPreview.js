// Visit Info 미리보기 블록 생성기 (독립 유틸 · DB/store/엔진/프롬프트 무접촉)
// 규칙: 빈 항목 미출력 · 마크다운/이모지 정제 · 가격은 사용자 입력값만 통과(AI 추측 금지)
// 정제는 "표시 정리"만. 의미 축약/요약은 하지 않음(정보 손실 방지 → 긴문장은 입력단 안내로 처리).

const VISIT_INFO_SCHEMA = [
  { group: "시간", key: "businessHours", label: "영업시간" },
  { group: "시간", key: "breakTime",     label: "브레이크타임" },
  { group: "시간", key: "lastOrder",     label: "라스트오더" },
  { group: "시간", key: "closedDays",    label: "휴무일" },
  { group: "선택", key: "reservation",   label: "예약" },
  { group: "선택", key: "waiting",       label: "웨이팅" },
  { group: "선택", key: "seats",         label: "좌석 정보" },
  { group: "선택", key: "groupSeats",    label: "단체석" },
  { group: "선택", key: "pet",           label: "반려동물" },
  { group: "선택", key: "repMenu",       label: "대표메뉴" },
  { group: "선택", key: "price",         label: "가격" },
  { group: "선택", key: "etc",           label: "기타 안내" },
];

const isEmpty = (v) => v == null || String(v).trim() === "";

// 이모지 제거 (기호/픽토그램/이모지 계열 유니코드 블록)
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu;

function sanitizeValue(raw) {
  let s = String(raw);
  s = s.replace(EMOJI_RE, "");           // 이모지 제거
  s = s.replace(/\*+/g, "");             // ** *** 마크다운 강조 제거
  s = s.replace(/_{2,}/g, "");           // __ 강조 제거
  s = s.replace(/`+/g, "");              // 코드백틱 제거
  s = s.replace(/[ \t]{2,}/g, " ");      // 다중 공백 정리
  s = s.replace(/\s*([·,/])\s*/g, "$1"); // 구분자 주변 공백 정리
  s = s.replace(/,+/g, ",");             // 중복 콤마
  s = s.trim().replace(/[·,\/\s]+$/,""); // 끝 구분자 잔여 제거
  return s;
}

function buildVisitInfoBlock(visitInfo = {}) {
  const groups = { "시간": [], "선택": [] };
  for (const f of VISIT_INFO_SCHEMA) {
    if (isEmpty(visitInfo[f.key])) continue;      // 빈 항목 미출력
    const val = sanitizeValue(visitInfo[f.key]);  // 정제
    if (val === "") continue;                      // 정제 후 빈값도 미출력
    groups[f.group].push(`${f.label}: ${val}`);
  }
  const timeLines = groups["시간"], optLines = groups["선택"];
  if (!timeLines.length && !optLines.length) return "";

  const parts = ["📍 방문정보", ""];
  if (timeLines.length) parts.push(...timeLines);
  if (timeLines.length && optLines.length) parts.push("");
  if (optLines.length)  parts.push(...optLines);
  return parts.join("\n");
}

module.exports = { buildVisitInfoBlock, sanitizeValue, VISIT_INFO_SCHEMA };
