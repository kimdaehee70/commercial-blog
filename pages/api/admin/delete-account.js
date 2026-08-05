// pages/api/admin/delete-account.js
// 세션96 v0.1 — 회원 완전삭제 (owner 전용, 다중 선택)
//
// [왜 순차 삭제인가 — FK 실측 결과]
//   accounts 를 참조하는 8개 자식 테이블의 delete_rule 이 3종으로 갈린다.
//     NO ACTION : billing_events / industry_change_logs / payment_history / payment_orders
//                 → 행이 하나라도 있으면 accounts DELETE 자체가 23503 으로 막힌다.
//                   테스트 계정도 업종 변경 한 번이면 industry_change_logs 가 쌓이므로
//                   "그냥 지우면 되겠지"가 통하지 않는다.
//     SET NULL  : publish_history / store_profiles
//                 → 지워지지 않고 account_id 만 NULL 이 된 고아 행으로 남는다.
//                   통계·관리자 화면이 조용히 오염되는 경로라 명시 삭제한다.
//     CASCADE   : billing_keys / subscriptions  → 자동. 그래도 순서상 먼저 지운다(무해).
//   → 스키마를 CASCADE 로 바꾸는 대신 서버에서 순서를 소유한다(ALTER 0 원칙).
//
// [정책] 삭제 = 완전 삭제. 통계 보존이 필요해지면 그때 별도 '익명화' 기능으로 분리한다.
//        auth.users 도 함께 제거 — 남겨 두면 같은 이메일로 재로그인해 유령 세션이 생긴다.
//
// [가드] owner 행 / 본인 계정은 서버에서 거부. UI 체크박스 차단은 보조 수단일 뿐이다.
//
// 요청:  POST { target_ids: [uuid, ...] }   (1~50건)
// 응답:  { ok, deleted:[{id,email}], failed:[{id,email,error}] }
//        일부 실패해도 200. 성공분은 이미 커밋되었으므로 실패만 골라 돌려준다.

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { OWNER_UID } from '../../../lib/constants';
import { requireOwner } from '../../../lib/guards';
import { writeAudit } from '../../../lib/audit';

const MAX_BATCH = 50;

// 삭제 순서 = FK 의존 역순. 이 배열의 순서가 곧 계약이다.
const CHILD_TABLES = [
  'billing_events',
  'billing_keys',
  'industry_change_logs',
  'payment_history',
  'payment_orders',
  'publish_history',
  'store_profiles',
  'subscriptions',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const user = await requireOwner(req, res);
  if (!user) return;

  try {
    const { target_ids } = req.body || {};

    if (!Array.isArray(target_ids) || target_ids.length === 0) {
      return res.status(400).json({ ok: false, error: 'TARGET_IDS_REQUIRED' });
    }
    if (target_ids.length > MAX_BATCH) {
      return res.status(400).json({
        ok: false,
        error: 'TOO_MANY_TARGETS',
        message: `한 번에 최대 ${MAX_BATCH}명까지 삭제할 수 있습니다.`,
      });
    }

    // 중복 제거 — 같은 id 가 두 번 오면 두 번째는 TARGET_NOT_FOUND 로 실패 표시되어 혼란만 준다.
    const ids = [...new Set(target_ids.map(String))];

    const deleted = [];
    const failed = [];

    for (const id of ids) {
      try {
        // ── 타겟 조회 ─────────────────────────────────────────
        const { data: target, error: tErr } = await supabaseAdmin
          .from('accounts')
          .select('id, email, display_name, role, plan, status, auth_user_id, blog_account')
          .eq('id', id)
          .maybeSingle();

        if (tErr) throw tErr;
        if (!target) {
          failed.push({ id, email: null, error: 'TARGET_NOT_FOUND' });
          continue;
        }

        // ── 자해 방지 ─────────────────────────────────────────
        if (target.role === 'owner' || target.auth_user_id === OWNER_UID) {
          failed.push({ id, email: target.email, error: 'OWNER_ACCOUNT_READONLY' });
          continue;
        }
        if (target.auth_user_id && target.auth_user_id === user.id) {
          failed.push({ id, email: target.email, error: 'CANNOT_DELETE_SELF' });
          continue;
        }

        // ── 자식 행 순차 삭제 ─────────────────────────────────
        //   개별 실패는 던진다 — 절반만 지워진 상태로 accounts 를 남기면
        //   다음 시도에서 원인을 못 찾는다. 실패 테이블명을 그대로 올린다.
        const childCounts = {};
        for (const t of CHILD_TABLES) {
          const { data, error } = await supabaseAdmin
            .from(t)
            .delete()
            .eq('account_id', id)
            .select('id');
          if (error) {
            // 테이블 자체가 없거나(42P01) 컬럼이 없는 경우는 건너뛴다 — 환경 차이 흡수.
            if (error.code === '42P01' || error.code === '42703') {
              childCounts[t] = 'skipped';
              continue;
            }
            throw new Error(`${t}: ${error.message}`);
          }
          childCounts[t] = Array.isArray(data) ? data.length : 0;
        }

        // ── accounts 삭제 ─────────────────────────────────────
        const { error: aErr } = await supabaseAdmin
          .from('accounts')
          .delete()
          .eq('id', id);
        if (aErr) throw new Error(`accounts: ${aErr.message}`);

        // ── auth.users 삭제 (best-effort) ─────────────────────
        //   accounts 는 이미 지워졌다. 여기서 실패해도 롤백하지 않고 경고만 남긴다 —
        //   되돌리면 방금 지운 자식 행들이 복구되지 않아 더 나쁜 상태가 된다.
        let authDeleted = null;
        if (target.auth_user_id) {
          try {
            const { error: auErr } = await supabaseAdmin.auth.admin.deleteUser(target.auth_user_id);
            authDeleted = auErr ? `failed: ${auErr.message}` : true;
            if (auErr) console.warn(`[delete-account] auth user 삭제 실패 uid=${target.auth_user_id}`, auErr.message);
          } catch (ae) {
            authDeleted = `failed: ${ae.message}`;
          }
        }

        console.log(`[delete-account] ✓ id=${id} email=${target.email} children=${JSON.stringify(childCounts)} auth=${authDeleted} by=${user.id}`);

        await writeAudit({
          actor: user,
          actor_role: 'owner',
          action: 'account.delete',
          target_type: 'account',
          target_id: id,
          before: {
            email: target.email,
            display_name: target.display_name,
            role: target.role,
            plan: target.plan,
            status: target.status,
            blog_account: target.blog_account,
          },
          after: null,
          detail: { child_counts: childCounts, auth_user_deleted: authDeleted },
        });

        deleted.push({ id, email: target.email });
      } catch (e) {
        console.error(`[delete-account] ✗ id=${id}`, e);
        failed.push({ id, email: null, error: e.message || 'DELETE_FAILED' });
      }
    }

    return res.status(200).json({
      ok: failed.length === 0,
      deleted,
      failed,
      verified: { auth_user_id: user.id, is_owner: true },
    });
  } catch (e) {
    console.error('[delete-account] error:', e);
    return res.status(500).json({ ok: false, error: 'DELETE_FAILED', detail: e.message });
  }
}
