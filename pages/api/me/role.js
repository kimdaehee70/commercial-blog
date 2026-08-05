// pages/api/me/role.js
// 본인 role 반환 — dashboard scope 자동판정용. SELECT only.
// requireRole(USER) = 인증만 통과시키고 resolveRoleFromAccount 로 실제 role 산출.
//   (USER 이상이면 통과 → 모든 로그인 사용자 OK. owner/admin/user 그대로 반환)
import { requireRole } from "../../../lib/guards";
import { ROLES } from "../../../lib/constants";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireRole(req, res, ROLES.USER);
  if (!ctx) return; // res 이미 전송됨

  return res.status(200).json({ ok: true, role: ctx.role });
}
