// pages/plans.js
// user-facing 요금제 안내 (read-only). admin/plans.js 복사 → 변경4점.
// - 가드: 로그인만 (OWNER 제거). 세션 없으면 /login.
// - active 플랜만 노출. debug/운영필드 제거.
// - 결제 버튼 = 준비중(비활성). 실과금 0 (FREEZE).
// - 현재 플랜 = /api/me/usage.plan과 비교해 뱃지.

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { listPlans } from "../lib/billing/plans";

export default function PlansPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [plans, setPlans] = useState([]);
  const [myPlan, setMyPlan] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      setAuthed(true);
      // active 플랜만 노출
      setPlans(listPlans().filter((p) => p.is_active));
      // 현재 플랜 표시용 (실패해도 무시 — read-only)
      try {
        const r = await fetch("/api/me/usage", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = await r.json();
        if (j.ok) setMyPlan(j.plan);
      } catch (_) {}
    })();
  }, []);

  if (!authed) return null;

  return (
    <div style={S.wrap}>
      <h1 style={S.h1}>요금제 안내</h1>
      <div style={S.sub}>플랜별 월 발행 한도입니다. 결제는 준비 중입니다.</div>

      <div style={S.cards}>
        {plans.map((p) => {
          const mine = myPlan && p.id === myPlan;
          return (
            <div key={p.id} style={{ ...S.card, ...(mine ? S.cardMine : {}) }}>
              <div style={S.cardHead}>
                <span style={S.label}>{p.label}</span>
                {mine && <span style={S.mineBadge}>현재 플랜</span>}
              </div>
              <div style={S.price}>
                {fmtKrw(p.price_krw)}
                <span style={S.priceUnit}>원 / 월</span>
              </div>
              <div style={S.quota}>월 {p.monthly_quota}건 발행</div>
              {p.description && <div style={S.desc}>{p.description}</div>}
              <button style={S.btn} disabled>
                준비 중
              </button>
            </div>
          );
        })}
      </div>

      <div style={S.foot}>문의는 운영자에게 연락해 주세요.</div>
    </div>
  );
}

function fmtKrw(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("ko-KR");
}

const S = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "32px 16px", fontFamily: "system-ui, -apple-system, sans-serif", color: "#3a352c" },
  h1: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  sub: { fontSize: 13, color: "#8a8170", marginBottom: 24 },
  cards: { display: "flex", gap: 12, flexWrap: "wrap" },
  card: { flex: "1 1 200px", minWidth: 200, border: "1px solid #e0dacb", borderRadius: 8, padding: 20, background: "#fffdf8" },
  cardMine: { border: "2px solid #3f7d5e", background: "#f4faf6" },
  cardHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: 600 },
  mineBadge: { fontSize: 10, color: "#fff", background: "#3f7d5e", borderRadius: 3, padding: "2px 6px" },
  price: { fontSize: 26, fontWeight: 700 },
  priceUnit: { fontSize: 13, fontWeight: 400, color: "#a39a86", marginLeft: 4 },
  quota: { fontSize: 13, color: "#6b6353", marginTop: 8 },
  desc: { fontSize: 12, color: "#8a8170", marginTop: 6, minHeight: 16 },
  btn: { marginTop: 16, width: "100%", padding: "8px 0", fontSize: 13, border: "1px solid #d8d2c4", borderRadius: 4, background: "#f0ece2", color: "#a39a86", cursor: "not-allowed" },
  foot: { marginTop: 24, fontSize: 12, color: "#a39a86" },
};
