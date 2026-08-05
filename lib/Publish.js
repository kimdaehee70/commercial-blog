// lib/Publish.js
// [Publish Spine 1차 경계 2026-07-06] 발행 실행 API 경계 분리 모듈.
//   발행 실행 2곳([A] NavPanel registerUrl / [B] 발행결과 화면 onClick)의
//   /api/publish-secure POST · /api/publish/check-quota GET 호출을 순수 헬퍼로 위임한다.
//   ── 원칙: 동작 100% 유지. UI·state·coach·payload 조립 방식 무변경. ──
//   호출부는 payload 조립과 setter 처리(상태·메시지)를 그대로 유지하고,
//   네트워크 호출(fetch+파싱)만 이 모듈에 위임한다. 경계만 만들고 로직은 무이동.
//   publish.js(서버 FREEZE) 무관 — 클라이언트 fetch 래퍼 전용.

import { supabase } from "./supabase";

/**
 * 발행 API 팩토리.
 * setter를 받지 않는다(순수 네트워크 계층). 상태 반영은 호출부가 응답을 보고 직접 수행.
 * @returns { getToken, publishSecure, checkQuota }
 */
export function makePublishApi() {
  // ── 현재 세션 access_token 획득 (호출부 중복 로직 공통화) ──
  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  // ── /api/publish-secure POST (토큰 검증 + account_id 위조 차단은 서버 미들웨어) ──
  //   payload 조립은 호출부 책임([A]=post객체 / [B]=result객체 형태 유지).
  //   반환: { ok, status, json } — 응답 분기(성공/DUPLICATE/QUOTA/기타)는 호출부가 판정.
  async function publishSecure(payload, token) {
    const res = await fetch("/api/publish-secure", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  }

  // ── /api/publish/check-quota GET (발행 성공 후 헤더 quota 재조회) ──
  //   반환: quota json 또는 null. setQuotaInfo 반영은 호출부.
  async function checkQuota(authUserId) {
    const rq = await fetch(`/api/publish/check-quota?auth_user_id=${encodeURIComponent(authUserId)}`);
    const jq = await rq.json().catch(() => null);
    return jq;
  }

  return { getToken, publishSecure, checkQuota };
}
