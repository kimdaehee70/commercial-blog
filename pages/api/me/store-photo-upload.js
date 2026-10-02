// pages/api/me/store-photo-upload.js
// [PHOTO-UPLOAD-API-01] 업체사진 signed upload 발급 전용 — 발급까지만.
// 인증: requireAccount(Bearer) → account.id → store_profiles.account_id 로 내 store.id 를 서버가 결정.
//   (/api/me/store 와 같은 인증·귀속 방식)
// ★ 클라이언트 입력은 받지 않는다 — store id / path / bucket 을 요청 본문에서 읽지 않는다.
// ★ 경로 = store-photos/{내 store.id}/{서버 생성 uuid}.jpg. token 은 이 경로에만 유효.
// ★ photo_pool 은 읽기만(6장 상한 판정). 기록은 이번 축 범위 밖.
// ★ JPEG·5MB 제한은 bucket 설정이 강제한다.
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";

const BUCKET = "store-photos";
const MAX_PHOTOS = 6; // 대표 1 + 추가 5

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return; // res 이미 전송됨 (401/403/404)
  const { account } = ctx;

  const { data: store, error: stErr } = await supabaseAdmin
    .from("store_profiles")
    .select("id, photo_pool")
    .eq("account_id", account.id)
    .maybeSingle();

  if (stErr) {
    return res.status(500).json({ ok: false, error: "STORE_QUERY_FAILED", detail: stErr.message });
  }
  if (!store) {
    return res.status(404).json({ ok: false, error: "STORE_NOT_FOUND" });
  }

  const count = Array.isArray(store.photo_pool) ? store.photo_pool.length : 0;
  if (count >= MAX_PHOTOS) {
    return res.status(409).json({ ok: false, error: "PHOTO_LIMIT", max: MAX_PHOTOS });
  }

  const path = `${store.id}/${randomUUID()}.jpg`;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return res.status(500).json({ ok: false, error: "SIGN_FAILED", detail: error?.message });
  }

  return res.status(200).json({ ok: true, path: data.path, token: data.token, signedUrl: data.signedUrl });
}
