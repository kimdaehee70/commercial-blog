// lib/pseo/access.js
// [PSEO-MINIHOME-UI-01] P방 입장 판정 — 조회 전용 / DDL 0 / 결제 무접촉.
//   관리방 입장 = isPseoEligible().ok (공개 게이트와 동일 기준 재사용, 원본 무수정)
//   검색노출 = 입장 가능 && 발행 URL >= MIN_HUB_POSTS (허브 공개 규칙과 동일)
//   OWNER / LG allowlist = 예외 입장. 사유(reason)는 클라이언트로 내리지 않는다.
//   fail-closed: 조회 실패 시 can_enter=false.
import { supabaseAdmin } from '../supabaseAdmin';
import { OWNER_UID } from '../constants';
import { canManagePseoFact } from '../pseoTestStores';
import { isPseoEligible, countPublishedPosts, MIN_HUB_POSTS } from './eligibility';

/**
 * @returns {Promise<{state:'owner'|'allowlist'|'paid'|'none', can_enter:boolean,
 *   live:boolean|null, published_count:number|null}>}
 */
export async function getPseoAccess({ account, storeId }) {
  const none = { state: 'none', can_enter: false, live: null, published_count: null };
  if (!account || !account.id) return none;

  let state = 'none';
  try {
    let isOwnerAcct = account.auth_user_id === OWNER_UID;
    if (!isOwnerAcct) {
      const { data } = await supabaseAdmin
        .from('accounts').select('role').eq('id', account.id).maybeSingle();
      isOwnerAcct = data?.role === 'owner';
    }
    if (isOwnerAcct) state = 'owner';
    else if (canManagePseoFact(storeId, false)) state = 'allowlist';
    else {
      const el = await isPseoEligible(account.id);
      state = el && el.ok ? 'paid' : 'none';
    }
  } catch (e) {
    return none;
  }
  if (state === 'none') return none;

  let count = null;
  try {
    count = await countPublishedPosts(supabaseAdmin, account.id);
  } catch (e) {
    // 집계 실패: 입장은 허용, 노출 상태는 판단 불가(null)
    return { state, can_enter: true, live: null, published_count: null };
  }
  return { state, can_enter: true, live: count >= MIN_HUB_POSTS, published_count: count };
}
