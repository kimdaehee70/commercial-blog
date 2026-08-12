// pages/api/funeral-halls-search.js
// FUNERAL-PUBLIC-DATA-INGEST-01E
//   장례식장 공공데이터(funeral_halls_public) 검색 — 자동완성 후보 제공 전용.
//   ★ 읽기 전용. 이 API는 stores / visit_info 를 건드리지 않는다.
//   ★ 반환값은 "제안"일 뿐. 적용 여부는 프론트에서 사용자가 선택한다.
//
// GET /api/funeral-halls-search?q=경희&ctpv=서울특별시
//   q    필수. 2자 이상.
//   ctpv 선택. 시도 완전일치 필터.
//
// 검색 순서 (01E 확정): prefix(name LIKE 'q%') → 부족분만 contains(%q%) 보강
//   → 3중키 기준 중복 제거 → prefix 결과가 항상 앞 → 최종 8건 상한.

import { createClient } from '@supabase/supabase-js';

const LIMIT = 8;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const q = String(req.query.q || '').trim();
  const ctpv = String(req.query.ctpv || '').trim();

  // 2자 미만은 후보가 무의미하게 넓다 — 조회하지 않고 빈 배열.
  if (q.length < 2) return res.status(200).json({ ok: true, items: [] });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_ENV_MISSING' });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const COLS = 'ctpv, sigungu, name, address, parking, halls, mortuary';
  // LIKE 메타문자 이스케이프 — '%' 입력 시 전건 매칭 방지
  const esc = q.replace(/[%_\\]/g, (m) => '\\' + m);

  const run = async (pattern) => {
    let sel = supabase
      .from('funeral_halls_public')
      .select(COLS)
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(LIMIT);
    if (ctpv) sel = sel.eq('ctpv', ctpv);
    return sel;
  };

  try {
    // 1) prefix 우선
    const { data: pre, error: e1 } = await run(`${esc}%`);
    if (e1) throw e1;

    const items = [];
    const seen = new Set();
    const push = (r) => {
      const k = `${r.ctpv}|${r.sigungu}|${r.name}`;
      if (seen.has(k)) return;
      seen.add(k);
      items.push(r);
    };
    (pre || []).forEach(push);

    // 2) 부족할 때만 contains 보강. prefix 결과 순서는 유지된다.
    if (items.length < LIMIT) {
      const { data: con, error: e2 } = await run(`%${esc}%`);
      if (e2) throw e2;
      for (const r of con || []) {
        if (items.length >= LIMIT) break;
        push(r);
      }
    }

    return res.status(200).json({ ok: true, items: items.slice(0, LIMIT) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
