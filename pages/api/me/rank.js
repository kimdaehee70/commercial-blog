// pages/api/me/rank.js
// 순위 관측 — 쓰기(저장) + 읽기(글별 최신·직전). RLS로 본인 격리.
// commercial-blog · 2026-06-05 · post_ranks 테이블 승인 후 사용.
// DB: vuuqtrzcfjbywlxqskoi. 신 키(sb_publishable_/sb_secret_)만.

import { createClient } from "@supabase/supabase-js";

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // sb_publishable_...

export default async function handler(req, res) {
  // 사용자 Bearer 토큰 → 그 토큰으로 클라이언트 생성 → RLS가 본인만 허용
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: "no_token" });

  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: u, error: uErr } = await sb.auth.getUser();
  if (uErr || !u?.user) return res.status(401).json({ ok: false, error: "invalid_token" });
  const uid = u.user.id;

  // ── POST: 오늘 순위 저장 (같은 글·같은 기준·같은 날 upsert) ──
  //   [v0.2] not_found 축 추가 — "검색했는데 못 찾음"을 기록한다.
  //     · 사용자가 확실히 말할 수 있는 것은 「못 찾았다」뿐이다. 색인 지연·10페이지 밖·관련도 부족을
  //       구분하는 것은 사용자 몫이 아니다. 그래서 이름도 미노출이 아니라 미발견이다.
  //     · 저장은 rank=null. NOT NULL 제약이면 0 으로 재시도한다(ALTER 0 — 스키마를 건드리지 않는다).
  //       읽기 쪽에서 null/0 을 동일하게 미발견으로 해석하므로 두 경우 모두 안전하다.
  if (req.method === "POST") {
    const { post_id, rank, keyword, basis, not_found } = req.body || {};
    const isNF = not_found === true || not_found === "true";
    const n = parseInt(rank, 10);
    const b = basis === "review" ? "review" : "rel"; // 기본=관련도
    if (!post_id) return res.status(400).json({ ok: false, error: "no_post_id" });
    if (!isNF && (!Number.isInteger(n) || n < 1 || n > 999))
      return res.status(400).json({ ok: false, error: "bad_rank" });

    const base = { post_id: String(post_id), auth_user_id: uid, keyword: keyword || null, basis: b };
    const save = async (rankValue) => sb
      .from("post_ranks")
      .upsert({ ...base, rank: rankValue }, { onConflict: "post_id,basis,checked_at" })
      .select("post_id, rank, checked_at, basis")
      .single();

    let { data, error } = await save(isNF ? null : n);
    // NOT NULL(23502) 또는 CHECK(23514) 제약이면 0 으로 한 번만 재시도.
    if (isNF && error && (error.code === "23502" || error.code === "23514")) {
      ({ data, error } = await save(0));
    }

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({
      ok: true,
      saved: { ...data, not_found: isNF, rank: isNF ? null : data.rank },
    });
  }

  // ── GET: 글별·기준별 최신·직전 순위 맵 반환 ─────────────────
  // 응답: { ok, ranks: { [post_id]: { rel:{current,prev,delta,checked_at}, review:{...} } } }
  if (req.method === "GET") {
    const { data, error } = await sb
      .from("post_ranks")
      .select("post_id, rank, checked_at, basis")
      .order("checked_at", { ascending: false });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    // post_id → basis → [rows desc]
    const grouped = {};
    for (const row of data || []) {
      const b = row.basis || "rel";
      ((grouped[row.post_id] ||= {})[b] ||= []).push(row);
    }
    const ranks = {};
    for (const [pid, byBasis] of Object.entries(grouped)) {
      const out = {};
      for (const [b, list] of Object.entries(byBasis)) {
        const cur = list[0];
        const prev = list[1] || null;
        // [v0.2] 미발견 정규화 — 저장값이 null 이든 0 이든 화면에서는 같은 뜻이다.
        //   순위 축(current)에는 넣지 않는다. 미발견을 0위로 읽으면 평균순위가 오염된다.
        const norm = (r) => (r == null || r === 0 ? null : r);
        const curR = norm(cur.rank), prevR = prev ? norm(prev.rank) : null;
        out[b] = {
          current: curR,
          prev: prevR,
          delta: (curR != null && prevR != null) ? prevR - curR : null, // +상승 / -하락
          checked_at: cur.checked_at,
          not_found: curR == null,
        };
      }
      ranks[pid] = out;
    }
    return res.status(200).json({ ok: true, ranks });
  }

  return res.status(405).json({ ok: false, error: "method_not_allowed" });
}
