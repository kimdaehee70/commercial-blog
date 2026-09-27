// lib/setupStatus.js
// [ONBOARDING-GATE-01] 업체 기본정보(POSTING 개방 필수 FACT) 완성 판정 — 단일 SoT.
//   ★ 순수 판정만 한다. OWNER bypass·로딩 대기·이동은 호출부 책임.
//     (관리자가 OWNER 업체정보 완성 상태를 진단할 수 있도록 여기서 권한을 보지 않는다.)
//   ★ 필수 5 FACT = 업종·업체명·주소·생활권·전화번호 (선장 판정 2026-09-27). 발행비율은 제외.
//   ★ section = 마이페이지 실제 anchor id (lib/Store.js) 와 1:1.
//   ★ 1차 = 프런트 Gate 전용. 서버(generate.js 409 SETUP_INCOMPLETE)는 2차 축.
//     서버도 이 파일을 import 해 같은 판정을 써야 한다(산식 복제 금지).

export const SETUP_FACTS = [
  { key: "industry",   label: "업종",     section: "store-sec-ident" },
  { key: "store_name", label: "업체명",   section: "store-sec-ident" },
  { key: "address",    label: "주소",     section: "store-sec-ident" },
  { key: "phone",      label: "전화번호", section: "store-sec-ident" },
  { key: "sub_region", label: "생활권",   section: "store-sec-region" },
];

const _filled = (v) => String(v == null ? "" : v).trim().length > 0;

// store = store_profiles 행(hubStore). null/undefined = 업체 없음(전부 누락).
// → { ok, missing: [{key,label,section}], firstSection }
export function getSetupStatus(store) {
  const s = store || {};
  const missing = SETUP_FACTS.filter((f) => !_filled(s[f.key]));
  return {
    ok: missing.length === 0,
    missing,
    firstSection: missing.length ? missing[0].section : null,
  };
}
