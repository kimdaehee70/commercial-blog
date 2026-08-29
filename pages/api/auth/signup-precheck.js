// pages/api/auth/signup-precheck.js
// [SIGNUP-AFTER-DEACTIVATE-SILENT-FAIL-01] 회원가입 정책 Gate
//
// 목적:
//   Supabase auth.signUp 은 이미 존재하는 이메일에 대해 error 없이 성공을 반환한다.
//   (data.user 는 오지만 identities 가 빈 배열 / 확인메일은 발송되지 않음)
//   그 결과 사용자는 오지 않을 메일을 무한 대기한다.
//   이 엔드포인트는 signUp 호출 "전"에 accounts 를 조회해 정책 판정을 내린다.
//
// 역할 분리:
//   - precheck(여기)      = 우리 정책 Gate. 탈퇴 30일 제한 / 기존회원 안내.
//   - identities 검사(클라)= Supabase 가짜 성공에 대한 최종 방어. 별도 유지.
//   둘 중 하나를 이유로 다른 하나를 제거하지 않는다.
//
// 판정 규칙:
//   1) accounts row 없음                → allowed:true  (정상 신규가입)
//   2) status='deactivated' AND meta.deactivated_at 존재 AND 경과 < 30일
//                                       → allowed:false / deactivated_cooldown
//                                         (관리자가 active 로 복구하면 이 조건은 성립하지 않는다)
//   3) status='deactivated' AND 30일 경과 → allowed:false / deactivated_expired (고객센터 안내)
//   4) status='deactivated' 인데 meta.deactivated_at 없음
//                                       → allowed:false / deactivated_no_timestamp
//                                         ★ updated_at 을 탈퇴시각으로 대용하지 않는다(Silent Fallback 금지).
//                                           배포 이전 탈퇴분만 해당하며 배포시점 0건 확인됨.
//   5) 그 외 status (active/suspended 등) → allowed:false / already_registered
//
// 보안 주석:
//   이메일 존재 여부가 노출되나, 기존 로그인/가입 에러("이미 가입된 이메일입니다")로
//   이미 동일 수준이 노출되고 있어 새로 생기는 노출면은 없다. Rate limit 은 별도 축.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const COOLDOWN_DAYS = 30;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// KST 기준 YYYY-MM-DD
function kstDateStr(d) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'invalid_email' });
  }

  const sb = admin();

  const { data: acc, error: accErr } = await sb
    .from('accounts')
    .select('id, email, status, meta')
    .ilike('email', email)
    .maybeSingle();

  if (accErr) {
    // 조회 실패 시 가입을 막지 않는다. 정책 Gate 장애가 신규가입 전면 차단이 되면 안 된다.
    // identities 최종 방어가 뒤에 남아 있으므로 가짜 성공은 여전히 걸러진다.
    console.warn('[signup-precheck] accounts select failed:', accErr.message);
    return res.status(200).json({ ok: true, allowed: true, reason: 'precheck_unavailable' });
  }

  // 1) 신규
  if (!acc) {
    return res.status(200).json({ ok: true, allowed: true, reason: 'new' });
  }

  // 2~4) 탈퇴 계정
  if (acc.status === 'deactivated') {
    const raw = acc.meta?.deactivated_at || null;

    if (!raw) {
      return res.status(200).json({
        ok: true,
        allowed: false,
        reason: 'deactivated_no_timestamp',
        message: '탈퇴 처리된 계정입니다. 재가입은 고객센터로 문의해 주세요.',
      });
    }

    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) {
      return res.status(200).json({
        ok: true,
        allowed: false,
        reason: 'deactivated_no_timestamp',
        message: '탈퇴 처리된 계정입니다. 재가입은 고객센터로 문의해 주세요.',
      });
    }

    const availableAt = new Date(at.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
    const passed = Date.now() >= availableAt.getTime();

    if (!passed) {
      const dateStr = kstDateStr(availableAt);
      return res.status(200).json({
        ok: true,
        allowed: false,
        reason: 'deactivated_cooldown',
        rejoin_available_date: dateStr,
        message:
          `탈퇴한 계정입니다. 회원탈퇴 후 ${COOLDOWN_DAYS}일 동안 동일한 이메일로 재가입할 수 없습니다. ` +
          `재가입 가능일: ${dateStr}`,
      });
    }

    return res.status(200).json({
      ok: true,
      allowed: false,
      reason: 'deactivated_expired',
      message: '재가입 가능 기간이 되었습니다. 기존 탈퇴 계정의 재가입은 고객센터로 문의해 주세요.',
    });
  }

  // 5) active / suspended 등 기존 회원
  return res.status(200).json({
    ok: true,
    allowed: false,
    reason: 'already_registered',
    message: '이미 가입된 이메일입니다. 로그인해 주세요.',
  });
}
