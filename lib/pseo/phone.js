// lib/pseo/phone.js
// ─────────────────────────────────────────────────────────────
// [PSEO-HUB-PHONE-FALLBACK-02] pSEO 전화번호 해석 공용 모듈.
//
// 이 파일의 3함수는 pages/p/[storeId]/[intentSlug].js 에 있던 지역 정의를
// 로직 변경 없이 그대로 옮긴 것이다. Intent 페이지의 기존 렌더 결과가
// 바뀌면 안 되므로 정규식·경계값·반환 형태를 손대지 않는다.
//
// eligibility.js 에 합치지 않는다 — 그쪽은 공개 자격 판정 책임만 진다.
// 번호 추출·포맷·fallback 은 자격 판정과 다른 책임이다.
//
// 실측(PSEO-PHONE-FALLBACK-01): visit_info.phone 은 번호 필드가 아니라
// 자유 텍스트다.
//   "1522-9939"(번호) / "직통 : 010-4277-2345"(접두어+번호)
//   "전화문의 후 ,내원" / "상담문의는 전화로만 가능합니다"(문구) / ""(빈값)
// → 원문을 그대로 tel: 이나 화면에 쓰지 않는다. 유효 번호만 추출해 쓴다.
// ─────────────────────────────────────────────────────────────

// 숫자 8자리 이상일 때만 번호로 인정. 문구형은 여기서 전부 탈락한다.
export function extractTel(raw) {
  const d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.length < 8 || d.length > 12) return '';
  return d;
}

// 표시용 하이픈. 접두어·안내문구는 이미 제거된 숫자만 들어온다.
export function formatTel(d) {
  const s = String(d || '');
  if (/^02\d{7,8}$/.test(s)) return `02-${s.slice(2, -4)}-${s.slice(-4)}`;
  if (/^1[5678]\d{6}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4)}`;
  if (/^0\d{9,10}$/.test(s)) return `${s.slice(0, 3)}-${s.slice(3, -4)}-${s.slice(-4)}`;
  return s;
}

// 전화와 문자를 분리해서 해석한다.
//   전화 : store_profiles.phone 우선 → 없으면 visit_info.phone 에서 유효 번호 추출
//   문자 : store_profiles.phone 전용. 대표번호(1522 등)는 SMS 수신이 불가하므로
//          fallback 경로에서는 문자 CTA 를 만들지 않는다.
export function resolvePhone(colPhone, visitPhoneRaw) {
  const col = extractTel(colPhone);
  if (col) {
    return {
      tel: col,
      smsTel: col,
      display: String(colPhone || '').trim() || formatTel(col),
    };
  }
  const fb = extractTel(visitPhoneRaw);
  if (fb) return { tel: fb, smsTel: '', display: formatTel(fb) };
  return { tel: '', smsTel: '', display: '' };
}
