// pages/api/support/create.js
// 세션96 v0.1 — 접수 등록 (회원 전용)
//
// 각 페이지의 신청 버튼이 kind 만 보낸다. 제목은 서버가 SUPPORT_KINDS 에서 붙인다 —
// 클라이언트가 title 을 만들면 화면 문구를 고칠 때마다 DB에 서로 다른 제목이 섞인다.
//
// 요청:  POST { kind, content }
// 응답:  { ok, request: {...} }

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAccount } from '../../../lib/guards';
import { SUPPORT_KIND_LIST, kindTitle } from '../../../lib/supportKinds';

const MAX_CONTENT = 4000;
const COOLDOWN_SEC = 20;   // 같은 종류 연타 방지(더블클릭·새로고침 중복 접수)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return;
  const { account } = ctx;

  try {
    const { kind, content } = req.body || {};

    if (!SUPPORT_KIND_LIST.includes(kind)) {
      return res.status(400).json({ ok: false, error: 'INVALID_KIND', allowed: SUPPORT_KIND_LIST });
    }

    const body = String(content || '').trim();
    if (!body) {
      return res.status(400).json({ ok: false, error: 'CONTENT_REQUIRED', message: '내용을 입력해 주세요.' });
    }
    if (body.length > MAX_CONTENT) {
      return res.status(400).json({
        ok: false, error: 'CONTENT_TOO_LONG',
        message: `내용은 ${MAX_CONTENT}자 이내로 입력해 주세요.`,
      });
    }

    // 중복 접수 차단 — 같은 계정·같은 kind 로 COOLDOWN_SEC 안에 들어온 건은 거절.
    const since = new Date(Date.now() - COOLDOWN_SEC * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from('support_requests')
      .select('id')
      .eq('account_id', account.id)
      .eq('kind', kind)
      .gte('created_at', since)
      .limit(1);

    if (recent && recent.length > 0) {
      return res.status(429).json({
        ok: false, error: 'TOO_SOON',
        message: '방금 접수되었습니다. 잠시 후 다시 시도해 주세요.',
      });
    }

    const { data: created, error } = await supabaseAdmin
      .from('support_requests')
      .insert({
        account_id: account.id,
        kind,
        title: kindTitle(kind),   // 제목은 서버가 소유
        content: body,
        status: 'pending',
      })
      .select('id, kind, title, content, status, created_at')
      .single();

    if (error) throw error;

    console.log(`[support/create] ✓ id=${created.id} kind=${kind} account=${account.id}`);
    return res.status(200).json({ ok: true, request: created });
  } catch (e) {
    console.error('[support/create] error:', e);
    return res.status(500).json({ ok: false, error: 'CREATE_FAILED', detail: e.message });
  }
}
