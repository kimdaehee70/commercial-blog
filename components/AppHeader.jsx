// components/AppHeader.jsx
// v0.1 — 66차 (공용 헤더 최소 버전)
// 표시: 로고/제품명 / /account / 로그아웃
// 사용: pages/index.js, pages/account.js
// 비로그인 시: 로그아웃 자리에 "로그인" 링크

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AppHeader() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (aborted) return;
      setEmail(data?.session?.user?.email || null);
      setLoaded(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email || null);
    });
    return () => {
      aborted = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link href="/" style={{ textDecoration: "none", color: "#111" }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>commercial-blog</span>
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
        {loaded && email ? (
          <>
            <Link
              href="/account"
              style={{
                color: router.pathname === "/account" ? "#111" : "#555",
                textDecoration: "none",
                fontWeight: router.pathname === "/account" ? 600 : 400,
              }}
            >
              내 계정
            </Link>
            <span style={{ color: "#999", fontSize: 12 }}>{email}</span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                color: "#555",
              }}
            >
              로그아웃
            </button>
          </>
        ) : loaded ? (
          <Link
            href="/login"
            style={{ color: "#555", textDecoration: "none" }}
          >
            로그인
          </Link>
        ) : null}
      </nav>
    </header>
  );
}
