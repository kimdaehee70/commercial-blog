// lib/AIGenerate.js
// ─────────────────────────────────────────────────────────────
// AI Generate Spine — 순수 네트워크 계층 (Publish Spine 동형)
//   makeAIGenerateApi(): checkGenerateQuota / postGenerate / saveGenerated
//   원칙: 순수 fetch 위임만. setter 미주입.
//     - payload 조립(storeName/loc5/visit/pilot 게이트) = 호출부(index.js) 유지
//     - 응답 분기(not_found/inactive/quota_exceeded/allowed, res.ok, 422) = 호출부 판정
//     - setResult/setQuotaModal/genProgressBus/addMsg/coach = 호출부 유지
//   2026-07-06 · Generate 경계 분리(마지막 핵심 Spine)
// ─────────────────────────────────────────────────────────────

export function makeAIGenerateApi() {
  // ── 1) 생성 quota 확인 (POST /api/publish/check-quota) ──
  //   순수 fetch만. 4분기 판정(ACCOUNT_NOT_FOUND/INACTIVE/QUOTA_EXCEEDED/allowed)은 호출부.
  //   반환: { status, json } — 호출부가 status·json 보고 직접 분기.
  async function checkGenerateQuota(authUserId) {
    const res = await fetch("/api/publish/check-quota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth_user_id: authUserId }),
    });
    const json = await res.json();
    return { status: res.status, json };
  }

  // ── 2) 본문 생성 (POST /api/generate) ──
  //   payload는 호출부에서 완성해 넘김(pilot 게이트·loc5·visit 포함). 여기선 전송만.
  //   반환: { ok, status, data } — 호출부가 res.ok·data.error(422 MENU_MAPPING_FAILED 등) 판정.
  //   [D-4-4] token(Bearer) 추가 — 서버 getStoreRuntime 신원 해석용. saveGenerated와 동일 방식.
  //     · token 없으면 헤더 미부착 → 서버는 익명({store:null}) 처리(부작용0 정합).
  //     · payload에 토큰 전달 금지(헤더 전용). Content-Type은 항상 유지.
  async function postGenerate(token, payload) {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  // ── 3) 생성이력 저장 (POST /api/save-generated) ──
  //   fire-and-forget(호출부에서 비차단 래핑). token/body는 호출부 조립.
  //   반환: { ok, status } — 호출부는 성공 시 fetchHub 등 후처리.
  async function saveGenerated(token, body) {
    const res = await fetch("/api/save-generated", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  }

  return { checkGenerateQuota, postGenerate, saveGenerated };
}
