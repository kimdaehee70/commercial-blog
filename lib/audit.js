// lib/audit.js
// audit spine 1차 — 운영 변경 이력 기록 헬퍼
//
// 설계 원칙:
//   1) best-effort — 기록 실패해도 본 작업(role 변경 등)은 절대 막지 않음
//      (deactivate.js 의 admin.signOut best-effort 패턴 답습)
//   2) 범용 — action 문자열로 종류 구분. 새 액션 추가 시 이 파일/테이블 수정 불필요.
//   3) snapshot — actor_email/role 을 기록 시점 값으로 박제 (조인 불필요, 사후 변경 무관)
//   4) service_role 전용 — supabaseAdmin 사용 (RLS 우회)
//
// 사용법:
//   import { writeAudit } from '../../../lib/audit';
//   await writeAudit({
//     actor: user,                       // requireOwner 가 반환한 supabase user
//     actor_role: 'owner',
//     action: 'account.set_role',
//     target_type: 'account',
//     target_id: target_id,
//     before: { role: target.role },
//     after:  { role: newRole },
//   });
//
// FREEZE 무관 — 신규 파일, 기존 코드 호출부에 1줄 추가만.

import { supabaseAdmin } from './supabaseAdmin';

/**
 * 감사 로그 1건 기록 (best-effort).
 * 절대 throw 하지 않음 — 호출부 try/catch 불필요.
 *
 * @param {object}  p
 * @param {object}  [p.actor]        - supabase user 객체 ({ id, email })
 * @param {string}  [p.actor_id]     - actor 직접 지정 (actor 없을 때)
 * @param {string}  [p.actor_email]  - actor 직접 지정
 * @param {string}  [p.actor_role]   - 'owner' | 'admin' | 'user'
 * @param {string}   p.action        - 필수. 예: 'account.set_role'
 * @param {string}  [p.target_type]  - 예: 'account'
 * @param {string|number} [p.target_id]
 * @param {object}  [p.before]
 * @param {object}  [p.after]
 * @param {object}  [p.detail]
 * @param {string}  [p.status]       - 'ok' | 'fail' (기본 'ok')
 * @param {string}  [p.error_message]
 * @returns {Promise<{ ok: boolean, id?: number, error?: string }>}
 */
export async function writeAudit(p = {}) {
  try {
    if (!p.action || typeof p.action !== 'string') {
      console.warn('[audit] skipped — action required');
      return { ok: false, error: 'ACTION_REQUIRED' };
    }

    const row = {
      actor_id:     p.actor?.id || p.actor_id || null,
      actor_email:  p.actor?.email || p.actor_email || null,
      actor_role:   p.actor_role || null,
      action:       p.action,
      target_type:  p.target_type || null,
      target_id:    p.target_id != null ? String(p.target_id) : null,
      before:       p.before ?? null,
      after:        p.after ?? null,
      detail:       p.detail ?? {},
      status:       p.status || 'ok',
      error_message: p.error_message || null,
    };

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      // 기록 실패 — 경고만, 본 작업은 이미 성공한 상태이므로 영향 없음
      console.warn('[audit] insert failed (non-blocking):', error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true, id: data.id };
  } catch (e) {
    console.warn('[audit] exception (non-blocking):', String(e?.message || e));
    return { ok: false, error: String(e?.message || e) };
  }
}
