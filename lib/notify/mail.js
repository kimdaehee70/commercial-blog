// lib/notify/mail.js
// [OPS-SUPPORT-EMAIL-NOTIFY-01] v0.1 — 운영자 알림 메일 (Resend)
//
// 설계 원칙 — 이 모듈은 어떤 경우에도 throw 하지 않는다.
//   호출부(접수 API)의 성공 응답이 메일 때문에 실패로 바뀌는 것을 막기 위함이다.
//   내부 오류·네트워크 실패·타임아웃·env 미설정 전부 { ok:false } 반환으로 흡수한다.
//
// env (3개. 미설정 시 조용히 no-op):
//   RESEND_API_KEY    발송 인증 키
//   MAIL_FROM         발신자.  예) AI-POST <noreply@ai-post.ai>
//   OPS_NOTIFY_EMAIL  운영자 수신 주소. 하드코딩 금지 — 이 env 로만 결정된다.
//
// 의존성 0 — Resend REST API 를 fetch 로 직접 호출한다.
//   npm 패키지(resend)를 top-level import 하면 설치 전 빌드가 깨지므로 채택하지 않았다.
//   서비스·요금·도메인 인증은 Resend 그대로다.
//
// 타임아웃 8초 — 응답 지연이 사용자 접수 응답을 붙잡지 않게 한다.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

/**
 * 알림 메일 발송에 필요한 env 가 모두 있는지.
 * 호출부에서 미리 확인할 필요는 없다 — sendOpsMail 이 알아서 no-op 한다.
 */
export function isMailEnabled() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.MAIL_FROM &&
    process.env.OPS_NOTIFY_EMAIL
  );
}

/**
 * 운영자에게 알림 메일 1통 발송.
 *
 * @param {object}  params
 * @param {string}  params.subject  메일 제목
 * @param {string}  params.text     본문(plain text)
 * @returns {Promise<{ok:boolean, skipped?:boolean, reason?:string, id?:string}>}
 *          절대 reject 되지 않는다.
 */
export async function sendOpsMail({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.MAIL_FROM;
  const to     = process.env.OPS_NOTIFY_EMAIL;

  if (!apiKey || !from || !to) {
    // env 미설정 = 기능 미활성. 오류가 아니므로 warn 이 아닌 log.
    console.log('[notify/mail] skipped — env not configured');
    return { ok: false, skipped: true, reason: 'ENV_NOT_CONFIGURED' };
  }

  if (!subject || !text) {
    console.warn('[notify/mail] skipped — empty subject or text');
    return { ok: false, skipped: true, reason: 'EMPTY_PAYLOAD' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error(`[notify/mail] send failed: ${r.status} ${detail.slice(0, 300)}`);
      return { ok: false, reason: `HTTP_${r.status}` };
    }

    const data = await r.json().catch(() => ({}));
    console.log(`[notify/mail] ✓ sent id=${data?.id || '-'} subject=${subject}`);
    return { ok: true, id: data?.id };
  } catch (e) {
    // AbortError(타임아웃) 포함 — 전부 여기서 흡수한다.
    console.error('[notify/mail] send error:', e?.name || '', e?.message || e);
    return { ok: false, reason: e?.name === 'AbortError' ? 'TIMEOUT' : 'EXCEPTION' };
  } finally {
    clearTimeout(timer);
  }
}
