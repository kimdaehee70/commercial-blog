// middleware.js  (프로젝트 루트 — D:\commercial-blog\middleware.js)
// ─────────────────────────────────────────────────────────────
// [GENERATE-AUTH-FAILCLOSED-01] 생성 API 인증 초크포인트.
//
// 배경 (S198 실측):
//   pages/api/generate*.js 는 94개 파일 전부 `export default handler` 를 가진
//   Next.js 독립 라우트다. 즉 /api/generateClinic 등 93개가 외부에서 직접
//   HTTP POST 가능하며, /api/generate.js 에 넣은 quota 게이트를 통째로 건너뛴다.
//   → GENERATE-ALT-ENDPOINT-QUOTA-BYPASS-01
//
//   동시에 /api/generate 자체도 Authorization 헤더가 없으면
//   getStoreRuntime → {account:null} → quota 게이트 if문 false → 통과였다.
//   → GENERATE-ANONYMOUS-UNLIMITED-01
//
// 설계 근거 (실측 확인 완료):
//   ① generate.js 는 resolve(industry) → handle(req,res) 서버 내부 함수 호출.
//      HTTP 재호출이 아니다 → 엔진 경로를 막아도 /api/generate 정상 동작.
//   ② 프론트 생성 호출은 2곳뿐이며 둘 다 "/api/generate" 단일.
//        lib/AIGenerate.js:33 / pages/publish.js:432
//      engineBootstrap.js 의 93개 참조는 전부 import(서버 모듈) — HTTP 아님.
//   ③ 따라서 엔진 경로 외부 차단은 UI 회귀를 만들지 않는다.
//
// 책임 2개 (그 외 금지):
//   · /api/generate  → Authorization: Bearer 없으면 401
//   · /api/generate* (그 외 전부) → 404 (endpoint 존재 자체를 노출하지 않음)
//
//   ⚠ 여기서 토큰 서명을 검증하지 않는다. 형식 존재 여부만 본다.
//     신원 해석은 requireAccount(guards.js, FREEZE) 가 계속 단독 담당한다.
//     산식·인증 로직 복제 0 — 이 파일은 경로 게이트일 뿐이다.
//
//   ⚠ 가짜 헤더(Bearer abc)는 여기를 통과한다. 그래서 generate.js 에
//     account===null → 401 이중방어가 함께 들어간다. 한쪽만 있으면 뚫린다.
//
//   ★ 이번 축 무접촉: /api/analyze · /api/diagnose · /api/supplement · /api/image
//     호출부 미실측이므로 건드리지 않는다(One Axis). 별건으로 등록됨.
//   ★ 엔진 94개 파일 무수정 — FREEZE 보존.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

// 통과 대상 단 하나. 이 경로만 라우터(quota 게이트 보유)를 거친다.
const ALLOWED_GENERATE_PATH = "/api/generate";

export function middleware(req) {
  const pathname = req.nextUrl.pathname;

  // 생성 계열이 아니면 무개입 (matcher 가 /api/* 전체를 잡으므로 여기서 즉시 반환)
  if (!pathname.startsWith("/api/generate")) {
    return NextResponse.next();
  }

  // ── 엔진 직접 endpoint (93개) → 외부 접근 폐쇄 ──────────────
  //   401 이 아니라 404 로 응답한다. 401 은 "여기 뭔가 있다"를 알려준다.
  //   내부 import 경로는 HTTP 를 타지 않으므로 영향 없음(generateUtils 포함).
  if (pathname !== ALLOWED_GENERATE_PATH) {
    return new NextResponse(
      JSON.stringify({ error: "Not found", code: "NOT_FOUND" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── /api/generate → Bearer 토큰 필수 ───────────────────────
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+.+/i.test(auth)) {
    return new NextResponse(
      JSON.stringify({
        error: "로그인이 필요합니다.",
        code: "AUTH_REQUIRED",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return NextResponse.next();
}

// matcher 는 /api/* 전체를 잡고 실제 판정은 위 코드가 한다.
//   path-to-regexp 로는 "generate 로 시작하는 파일명" 을 세그먼트 단위로
//   표현할 수 없다(/api/generateClinic 은 /api/generate 의 하위 경로가 아님).
//   → 넓게 잡고 첫 줄에서 즉시 반환하는 편이 누락보다 안전하다.
export const config = {
  matcher: ["/api/:path*"],
};
