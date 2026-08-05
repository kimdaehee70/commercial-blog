// pages/api/admin/support-list.js
// 세션96 v0.1 — 접수 목록 (owner 전용)
//
// 대시보드 카드(최근 5~10건)와 접수관리 페이지(전체)가 같은 API 를 쓴다.
// 화면마다 목록 API 를 따로 두면 상태 라벨·정렬이 조용히 어긋난다.
//
// 요청:  GET ?kind=all|industry|... &status=all|pending|... &limit=N
// 응답:  { ok, rows: [...], summary: {total,pending,answered,completed} }
//        rows[].account = { id, email, display_name, plan, blog_account } — 조인 대신 2차 조회로 붙인다.
//        (support_requests → accounts 는 FK 가 있으나 PostgREST 임베드 별칭이 스키마 캐시에
//         의존해 배포 직후 실패하는 경우가 있어, 목록에서는 명시 조회로 고정한다.)

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireOwner } from '../../../lib/guards';
import { SUPPORT_KIND_LIST, SUPPORT_STATUS_LIST, SUPPORT_STATUS_ARCHIVED } from '../../../lib/supportKinds';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const { kind, status } = req.query || {};
    let limit = Number(req.query?.limit) || DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    let q = supabaseAdmin
      .from('support_requests')
      .select('id, account_id, kind, title, content, status, admin_reply, created_at, answered_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kind && kind !== 'all' && SUPPORT_KIND_LIST.includes(kind)) q = q.eq('kind', kind);

    // 상태 필터. status=all 은 '보관 제외 전체' 를 뜻한다 —
    //   보관은 운영자가 목록에서 내리려고 붙인 상태이므로 기본 목록에 다시 섞이면 보관의 의미가 없다.
    //   보관만 보려면 status=archived 로 명시한다.
    if (status && status !== 'all' && SUPPORT_STATUS_LIST.includes(status)) {
      q = q.eq('status', status);
    } else {
      q = q.neq('status', SUPPORT_STATUS_ARCHIVED);
    }

    const { data: rows, error } = await q;
    if (error) throw error;

    // 회원정보 붙이기 — 필요한 id 만 모아 1회 조회
    const ids = [...new Set((rows || []).map((r) => r.account_id).filter(Boolean))];
    let accMap = {};
    if (ids.length > 0) {
      const { data: accs } = await supabaseAdmin
        .from('accounts')
        .select('id, email, display_name, plan, blog_account')
        .in('id', ids);
      for (const a of accs || []) accMap[a.id] = a;
    }

    const merged = (rows || []).map((r) => ({ ...r, account: accMap[r.account_id] || null }));

    // 요약 — 필터와 무관한 전체 기준. 필터 적용값을 쓰면 KPI 가 필터마다 바뀌어 신뢰를 잃는다.
    //   total 은 '보관 제외' 기준이다. 보관까지 합치면 처리해야 할 양이 실제보다 부풀어 보인다.
    const summary = { total: 0, pending: 0, answered: 0, completed: 0, archived: 0 };
    const { data: allStat } = await supabaseAdmin
      .from('support_requests')
      .select('status')
      .limit(2000);
    for (const s of allStat || []) {
      if (summary[s.status] !== undefined) summary[s.status] += 1;
      if (s.status !== SUPPORT_STATUS_ARCHIVED) summary.total += 1;
    }

    return res.status(200).json({ ok: true, rows: merged, summary });
  } catch (e) {
    console.error('[support-list] error:', e);
    return res.status(500).json({ ok: false, error: 'LOAD_FAILED', detail: e.message, rows: [], summary: null });
  }
}
