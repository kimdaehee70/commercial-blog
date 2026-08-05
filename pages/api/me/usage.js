// pages/api/me/usage.js
// 세션73 B-3 v155: quota 기간 기준 전환 (구독 우선 / 캘린더 폴백)
//   · check-quota.js v0.6과 동일 축. 두 파일은 항상 같은 기간·같은 집계를 써야 한다.
//     (표시와 차단이 갈라지면 세션72에서 겪은 불일치가 재발한다)
//   · 구독행 있음 → current_period_start/end / 없음 → KST 캘린더 월 (기존 사용자 무영향)
//   · 기간 산정은 lib/billing/subscription.resolveBillingPeriod 단일 진입점으로 이관.
//     인라인 월경계 계산 제거 — 정본이 두 벌 존재하던 상태 해소.
//   · plan은 이번 축 밖 — 여전히 accounts.plan(getPlan)을 쓴다.
//   · 응답에 period_end / period_basis 추가. 기존 키(month_start 등) 전부 유지.
//
// 사용자 본인 quota/usage — SELECT only. DB 쓰기 0.
// 인증: requireAccount(Bearer 토큰) → user.id = auth_user_id scope.
// 경계: over = monthly_publish >= quota (단일출처식만. 재계산 금지).
// Naver §2: 사실표시만(N/M). qc_score 미노출.
//
// [v154] 집계 기준 = check-quota.js 정본과 1:1 (countGeneratedInPeriod / baseline + created_at).
//   quota 차단 기준이 '발행'→'생성'으로 전환됐으므로 표시도 생성 기준.
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";
import { getPlan } from "../../../lib/billing/plans";
import { countGeneratedInPeriod } from "../../../lib/billing/usage";
import { resolveBillingPeriod } from "../../../lib/billing/subscription";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  try {
    // [B-3] 기간 산정 — 구독 우선, 없으면 KST 캘린더 월.
    const now = new Date();
    const period = await resolveBillingPeriod(account.id, now);
    const monthStartUtc = period.start;
    const monthEndUtc = period.end;

    let used;
    try {
      used = await countGeneratedInPeriod(account.id, monthStartUtc, monthEndUtc);
    } catch (helperErr) {
      return res.status(500).json({ ok: false, error: "COUNT_FAILED", detail: helperErr.message });
    }

    // plan → quota: lib/billing/plans.js 단일출처 (check-quota.js와 동일 기준).
    // getPlan은 미지 plan이면 free 폴백 → monthly_quota 항상 숫자.
    const quota = getPlan(account.plan).monthly_quota;

    const over = quota != null ? used >= quota : false; // 단일출처식

    return res.status(200).json({
      ok: true,
      plan: account.plan,
      status: account.status,
      email: account.email,
      monthly_publish: used,
      quota,
      over,
      month_start: monthStartUtc,   // 표시 일관성 위해 노출 (check-quota와 동일 키)
      period_end: monthEndUtc,      // B-3 신규
      period_basis: period.basis,   // 'subscription' | 'calendar'
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
