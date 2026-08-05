// pages/api/publish-secure.js
// 세션74: URL 등록 시점 quota 차단 제거 (차감·차단은 생성 시점 단일화)
// 53차 신규 — publish.js 보안 미들웨어
//
// 목적: publish.js의 토큰 미검증 / account_id 위조 leak 차단
// 정책: publish.js FREEZE 유지 (직접 수정 없음) → fetch self call로 위임
//
// 흐름:
//   1) Bearer access_token 추출 + 검증 (supabase.auth.getUser)
//   2) accounts SELECT (auth_user_id 기준) → verifiedAccountId 확정
//   3) status !== 'active' 차단
//   4) body.account_id 있으면 verifiedAccountId와 일치 검증 (위조 차단)
//   5) owner 아니면 quota 확인 (check-quota 호출)
//   6) 검증된 account_id 강제 주입 후 publish.js로 fetch self call
//   7) publish.js 응답 그대로 반환
//
// v2 (60차): self call 시 x-internal-secret 헤더 동봉
//   - publish.js v2의 직접 호출 차단과 한 쌍
//   - PUBLISH_INTERNAL_SECRET env 미설정 시 500

import { createClient } from "@supabase/supabase-js";
import { OWNER_UID } from "../../lib/constants";

const ok = (res, body) => res.status(200).json({ ok: true, ...body });
const fail = (res, code, msg, extra = {}) =>
  res.status(code).json({ ok: false, error: msg, ...extra });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "METHOD_NOT_ALLOWED");

  try {
    // ─── 1. env / admin client ───
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail(res, 500, "SUPABASE_ENV_MISSING");
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // internal secret 사전 검증 (60차) — self call 전에 fail-fast
    const INTERNAL_SECRET = process.env.PUBLISH_INTERNAL_SECRET;
    if (!INTERNAL_SECRET) {
      console.error("[publish-secure] 🚨 PUBLISH_INTERNAL_SECRET not configured");
      return fail(res, 500, "SERVER_MISCONFIG");
    }

    // ─── 2. Bearer token 추출 + 검증 ───
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
    if (!token) return fail(res, 401, "MISSING_ACCESS_TOKEN");

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return fail(res, 401, "INVALID_TOKEN", {
        detail: userErr?.message || null,
      });
    }
    const authUserId = userData.user.id;

    // ─── 3. 본인 accounts row 조회 (서버 측 정답) ───
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("id, email, role, plan, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (accErr) {
      console.error("[publish-secure] account select error:", accErr);
      return fail(res, 500, "ACCOUNT_SELECT_FAILED", { detail: accErr.message });
    }

    if (!account) {
      return fail(res, 404, "ACCOUNT_NOT_FOUND", {
        hint: "call /api/account/ensure first",
      });
    }

    // ─── 4. status 차단 ───
    if (account.status && account.status !== "active") {
      return res.status(403).json({
        ok: false,
        error: "ACCOUNT_INACTIVE",
        status: account.status,
      });
    }

    const verifiedAccountId = account.id;
    const isOwner = account.role === "owner" || authUserId === OWNER_UID;

    // ─── 5. body.account_id 위조 차단 ───
    // 클라이언트가 account_id를 보내면 반드시 서버 검증값과 일치해야 함
    const bodyAccountId = req.body?.account_id;
    if (bodyAccountId != null && Number(bodyAccountId) !== Number(verifiedAccountId)) {
      console.warn(
        `[publish-secure] 🚨 account_id 위조 시도: authUserId=${authUserId} (verified=${verifiedAccountId}) → 요청=${bodyAccountId}`
      );
      return res.status(403).json({
        ok: false,
        error: "ACCOUNT_ID_MISMATCH",
        detail: "body.account_id does not match authenticated user",
      });
    }

    // ─── 6. quota 확인 — [세션74] 제거 ───
    // 정책(v138 확정): quota는 '생성' 시점에 차감·차단한다(baseline + created_at).
    //   이 엔드포인트는 '이미 생성된 글'의 네이버 URL을 등록하는 경로다.
    //   여기서 다시 차단하면 = 이미 차감한 건에 2차 관문을 세우는 것 → 한도 소진 후
    //   발행은 했는데 URL을 못 넣어 관측(순위·생존) 데이터가 통째로 유실된다.
    //   실측: BASIC 39/30 계정이 발행 완료 후 URL 등록에서 QUOTA_EXCEEDED로 막힘.
    //   생성 차단은 check-quota가 index.js 생성 경로에서 이미 수행(9851 / 11593).
    //   중복 URL 차단(6.5)은 그대로 유지 — 중복 published row 방지가 목적이라 별개 축.
    void isOwner; // 아래 응답 verified.is_owner에서 계속 사용

    // ─── 6.5 본인 계정 내 URL 중복 차단 (중복 quota 차감 방지) ───
    // 정책(나): account_id=verifiedAccountId AND naver_post_url=입력URL 존재 시 409.
    //   - 같은 글을 두 번 등록하면 publish_history에 published 행이 2개 INSERT → quota 2 차감.
    //   - publish.js는 FREEZE(순수 insert) → 차단은 여기서. DB 무변경.
    //   - 전역 중복(다른 계정)은 정책 범위 확대라 보류. 본인 계정 내 중복만 검사.
    //   - SELECT only. naver_post_url 없으면 publish.js 필수검증이 처리하므로 여기선 skip.
    const dupUrl = req.body?.naver_post_url;
    if (dupUrl) {
      const { data: dupRow, error: dupErr } = await supabase
        .from("publish_history")
        .select("id")
        .eq("account_id", verifiedAccountId)
        .eq("naver_post_url", dupUrl)
        .limit(1)
        .maybeSingle();

      if (dupErr) {
        console.error("[publish-secure] dup-check error:", dupErr);
        return fail(res, 500, "DUP_CHECK_FAILED", { detail: dupErr.message });
      }
      if (dupRow) {
        console.warn(
          `[publish-secure] 중복 URL 등록 차단: account_id=${verifiedAccountId} url=${dupUrl} (existing id=${dupRow.id})`
        );
        return res.status(409).json({
          ok: false,
          error: "DUPLICATE_URL",
          detail: "이미 등록된 URL입니다 (본인 계정).",
          existing_id: dupRow.id,
        });
      }
    }

    // ─── 6.7 [qc-fix] qc_score 보강 (서버 주입) ───
    // 배경: 단건 API(me/post/[id])와 목록(me/posts)은 §2 정책상 qc_score 미노출(점수화 방지).
    //   → 프론트가 qc_score를 가질 수 없어 URL 등록 시 publish.js 필수검증(qc_score)에서 누락 에러.
    // 해결: 프론트가 보낸 source_post_id(baseline row id)로 서버가 직접 qc_score를 SELECT해 주입.
    //   - 본인 계정 scope(account_id=verifiedAccountId) 재확인 → IDOR 차단.
    //   - publish.js FREEZE 유지(필수검증 그대로 통과). 단건 API/§2 정책 무손상.
    //   - DB 무변경(SELECT only).
    let qcScore = req.body?.qc_score;
    if (qcScore == null && req.body?.source_post_id != null) {
      const srcId = parseInt(req.body.source_post_id, 10);
      if (Number.isFinite(srcId)) {
        const { data: srcRow, error: srcErr } = await supabase
          .from("publish_history")
          .select("qc_score")
          .eq("account_id", verifiedAccountId)
          .eq("id", srcId)
          .limit(1)
          .maybeSingle();
        if (srcErr) {
          console.error("[publish-secure] qc-fix select error:", srcErr);
        } else if (srcRow && srcRow.qc_score != null) {
          qcScore = srcRow.qc_score;
        }
      }
    }
    // 그래도 없으면 0 (미채점 baseline — 등록 자체는 허용. 막힘 방지).
    if (qcScore == null) qcScore = 0;

    // ─── 7. publish.js로 fetch self call (FREEZE 준수) ───
    // 검증된 account_id 강제 주입 (위조 불가)
    // 60차: x-internal-secret 헤더 동봉 (publish.js v2 가드 통과)
    const sanitizedBody = {
      ...req.body,
      account_id: verifiedAccountId, // 서버 확정값으로 덮어씀
      qc_score: qcScore,             // [qc-fix] 서버 보강값 주입
    };
    delete sanitizedBody.source_post_id; // [qc-fix] publish.js 미사용 필드 — 전달 제거

    const origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
    const pubRes = await fetch(`${origin}/api/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET, // 60차 추가
      },
      body: JSON.stringify(sanitizedBody),
    });
    const pubJson = await pubRes.json();

    // ─── 7.3 [merge-A안] published row에 source_post_id 저장 (병합 식별자) ───
    //   배경: 최근발행 목록이 baseline+published 2행을 제목으로 병합 → 제목 정규화/suffix
    //     변경 시 키 불일치로 URL 미병합(등록완료인데 입력창 잔존). 근본해결=id 병합.
    //   publish.js FREEZE 유지 → 저장은 여기서 UPDATE(무손상). DB에 source_post_id 컬럼 필요.
    //   본인 계정 scope(account_id=verifiedAccountId) 재확인 → IDOR 차단. 실패해도 발행영향 0.
    if (pubRes.ok && pubJson?.ok && pubJson?.id && req.body?.source_post_id != null) {
      const _srcId = parseInt(req.body.source_post_id, 10);
      if (Number.isFinite(_srcId)) {
        const { error: _updErr } = await supabase
          .from("publish_history")
          .update({ source_post_id: _srcId })
          .eq("id", pubJson.id)
          .eq("account_id", verifiedAccountId);
        if (_updErr) console.error("[publish-secure] source_post_id update error:", _updErr);
      }
    }

    // ─── 7.5 [Observer] 발행 성공 시 경쟁환경 수집 enqueue ───
    //   fire-and-forget. enqueue 실패해도 발행 성공 응답 유지(발행영향 0).
    //   publish.js / enqueue.js 무수정. publish_id만 전달.
    if (pubRes.ok && pubJson?.ok && pubJson?.id) {
      const origin2 =
        `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
      fetch(`${origin2}/api/observer/enqueue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publish_id: pubJson.id,
        }),
      }).catch(() => {});
    }

    // publish.js 응답 그대로 + 검증 정보 부가
    return res.status(pubRes.status).json({
      ...pubJson,
      verified: {
        auth_user_id: authUserId,
        account_id: verifiedAccountId,
        is_owner: isOwner,
      },
    });
  } catch (e) {
    console.error("[publish-secure] 예외:", e);
    return fail(res, 500, "INTERNAL_ERROR", { detail: String(e?.message || e) });
  }
}
