// pages/api/account/signup.js
// v0.5 — SIGNUP-FAKE-EMAIL-BLOCK-01 : 엔드포인트 폐쇄 (410 Gone)
//
// 폐쇄 사유:
//   - 인증 가드 / rate limit 없는 공개 POST 통로였다.
//   - service_role + admin.createUser({ email_confirm: true }) 조합이라
//     Supabase 대시보드의 Confirm email 설정까지 무시하고 계정을 즉시 active 로 만들었다.
//   - 즉 본문 3개(email/password/display_name)만 보내면 실존하지 않는 이메일로
//     무제한 활성 계정 생성이 가능했고, 각 계정은 FREE 3건을 그대로 받았다.
//
// 실측 근거:
//   grep "account/signup" → pages/api/account/signup.js 자기 자신 1건. 호출처 0 (사문).
//   따라서 폐쇄에 따른 회귀 없음.
//
// 파일을 삭제하지 않고 stub 으로 남기는 이유:
//   삭제하면 폐쇄 사실과 사유가 코드에서 사라져 훗날 동일 형태로 재구현될 수 있다.
//
// 정본 가입 경로 (유일):
//   pages/signup.js → supabase.auth.signUp (Confirm email 적용)
//     → 인증메일 확인 → 로그인 → /api/account/ensure → accounts INSERT
//   카카오: pages/login.js → OAuth → pages/auth/callback.js → /api/account/ensure
//
// 재개방 금지. 필요 시 신규 축을 열고 본인확인(CI) 게이트를 선결한 뒤 설계한다.
// FREEZE 준수: engine / publish.js / ensure.js / callback.js / login.js 무영향

export default function handler(req, res) {
  return res.status(410).json({
    ok: false,
    error: "ENDPOINT_RETIRED",
    detail: "이 가입 경로는 폐쇄되었습니다. /signup 페이지를 이용하세요.",
  });
}
