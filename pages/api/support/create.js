// pages/api/support/create.js
// 세션96 v0.1 — 접수 등록 (회원 전용)
//
// 각 페이지의 신청 버튼이 kind 만 보낸다. 제목은 서버가 SUPPORT_KINDS 에서 붙인다 —
// 클라이언트가 title 을 만들면 화면 문구를 고칠 때마다 DB에 서로 다른 제목이 섞인다.
//
// 요청:  POST { kind, content }
// 응답:  { ok, request: {...} }
//
// v0.2 · [OPS-SUPPORT-EMAIL-NOTIFY-01] 운영자 메일 알림 추가
//   · 대상은 issue + agency 2종뿐이다. industry/title/feature 는 보드에서 확인한다.
//   · INSERT 커밋 이후에만 호출한다. 메일은 DB를 되돌릴 수 없다.
//   · ★ 독립 try/catch 필수 — 바깥 catch 로 새어나가면 "접수는 됐는데 500" 이 된다.
//   · 응답 스키마 무변경. DDL 0. 추가 DB 조회 0(account.email/plan 은 가드가 이미 로드).

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireAccount } from '../../../lib/guards';
import { SUPPORT_KIND_LIST, kindTitle } from '../../../lib/supportKinds';
import { sendOpsMail } from '../../../lib/notify/mail';

const MAX_CONTENT = 4000;
const COOLDOWN_SEC = 20;   // 같은 종류 연타 방지(더블클릭·새로고침 중복 접수)

// [OPS-SUPPORT-EMAIL-NOTIFY-01] 메일 발송 대상 kind.
//   대상을 늘리려면 이 배열만 고친다 — 메일 문안·호출부는 건드리지 않는다.
const NOTIFY_KINDS = ['issue', 'agency'];

// 관리자 보드 고정 경로. DB·라우터 조회 없음.
const ADMIN_SUPPORT_URL = 'https://ai-post.ai/admin/support';

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

    // ── [OPS-SUPPORT-EMAIL-NOTIFY-01] 운영자 알림 ─────────────────────────
    //   INSERT 는 이미 커밋됐다. 아래 블록의 어떤 실패도 위 결과를 바꾸지 않는다.
    //   ★ 이 try/catch 를 제거하면 메일 오류가 바깥 catch 로 가서 CREATE_FAILED(500)
    //     이 응답된다 — 접수는 저장됐는데 사용자에게는 실패로 보이는 상태가 된다.
    if (NOTIFY_KINDS.includes(kind)) {
      try {
        await sendOpsMail({
          subject: `[AI-POST] ${created.title} — ${account.email || `account#${account.id}`}`,
          text: [
            `${created.title}이(가) 접수되었습니다.`,
            ``,
            `회원 이메일 : ${account.email || '(미등록)'}`,
            `플랜        : ${account.plan || '(없음)'}`,
            `접수 종류   : ${created.title} (${created.kind})`,
            `접수 시각   : ${created.created_at}`,
            ``,
            `내용`,
            `────────────────────────────`,
            created.content,
            `────────────────────────────`,
            ``,
            `관리자 보드 : ${ADMIN_SUPPORT_URL}`,
          ].join('\n'),
        });
      } catch (mailErr) {
        // sendOpsMail 은 throw 하지 않도록 설계됐으나, 방어적으로 한 겹 더 막는다.
        console.error('[support/create] notify failed (ignored):', mailErr?.message || mailErr);
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    return res.status(200).json({ ok: true, request: created });
  } catch (e) {
    console.error('[support/create] error:', e);
    return res.status(500).json({ ok: false, error: 'CREATE_FAILED', detail: e.message });
  }
}
