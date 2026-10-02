// pages/api/me/store-photo.js
// [PHOTO-POOL-API-01 / ⑦-C] 업체사진 photo_pool 조회·조작 전용.
// SoT = store_profiles.photo_pool (jsonb 배열). 원소 = { path: "{store.id}/{uuid}.jpg" }. [0] = 대표사진.
// 인증: requireAccount(Bearer) → account.id → store_profiles.account_id 로 내 store 를 서버가 결정.
//   (/api/me/store · /api/me/store-photo-upload 와 같은 인증·귀속 방식)
// ★ 요청 본문의 storeId 는 읽지 않는다. 클라이언트 path 는 "{내 store.id}/{uuid}.jpg" 형식만 통과.
// ★ DB 에는 path 만 저장. URL 은 응답 시 서버가 path 로 만든다(getPublicUrl — 네트워크 호출 없음).
// ★ 서버가 현재 DB 값 기준으로 새 배열을 계산. photo_pool 외 컬럼은 update 하지 않는다.
// ★ replace/delete = DB 반영 후 Storage remove. remove 실패해도 DB 결과는 되돌리지 않는다(storage_cleanup:false).
// ★ 이미지 바이너리는 다루지 않는다(업로드는 signed upload 로 클라이언트 → Storage 직접).
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";

const BUCKET = "store-photos";
const MAX_PHOTOS = 6; // 대표 1 + 추가 5 — store-photo-upload.js MAX_PHOTOS 와 동기화
const UUID_JPG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const OPS = new Set(["add", "set_main", "move", "replace", "delete"]);

// 내 store 소속 + 업로드 API 가 발급하는 형식인지.
function isOwnPath(path, storeId) {
  if (typeof path !== "string") return false;
  const prefix = `${storeId}/`;
  return path.startsWith(prefix) && UUID_JPG.test(path.slice(prefix.length));
}

const pathOf = (el) => (el && typeof el === "object" && typeof el.path === "string" ? el.path : null);

// 응답용 — path 가 있는 원소만, 순서 유지.
function toPhotos(pool) {
  const storage = supabaseAdmin.storage.from(BUCKET);
  return pool
    .map(pathOf)
    .filter(Boolean)
    .map((path) => ({ path, url: storage.getPublicUrl(path).data.publicUrl }));
}

async function objectExists(path) {
  try {
    const { data } = await supabaseAdmin.storage.from(BUCKET).exists(path);
    return data === true;
  } catch {
    return null; // 확인 불가
  }
}

// 실패해도 throw 하지 않는다. 성공 여부만 반환.
async function removeObject(path) {
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    return !error;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
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

  const pool = Array.isArray(store.photo_pool) ? store.photo_pool : [];

  // ── GET: 현재 photo_pool ──
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, photos: toPhotos(pool) });
  }

  // ── POST: 조작 ──
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const op = body.op;
  if (!OPS.has(op)) {
    return res.status(400).json({ ok: false, error: "INVALID_OP" });
  }

  const idxOf = (p) => pool.findIndex((el) => pathOf(el) === p);
  let next = null;
  let removePath = null; // DB 반영 후 지울 기존 객체

  if (op === "add") {
    const path = body.path;
    if (!isOwnPath(path, store.id)) {
      return res.status(400).json({ ok: false, error: "INVALID_PATH" });
    }
    if (idxOf(path) !== -1) {
      return res.status(409).json({ ok: false, error: "DUPLICATE" });
    }
    const ex = await objectExists(path);
    if (ex === null) return res.status(502).json({ ok: false, error: "STORAGE_CHECK_FAILED" });
    if (!ex) return res.status(400).json({ ok: false, error: "OBJECT_NOT_FOUND" });
    if (pool.length >= MAX_PHOTOS) {
      // 검증된 신규 객체(내 store 경로 · 실재 · pool 미포함)만 cleanup 시도.
      const cleaned = await removeObject(path);
      return res.status(409).json({ ok: false, error: "PHOTO_LIMIT", max: MAX_PHOTOS, storage_cleanup: cleaned });
    }
    next = [...pool, { path }];
  } else if (op === "set_main" || op === "move" || op === "delete") {
    const i = idxOf(body.path);
    if (typeof body.path !== "string" || i === -1) {
      return res.status(404).json({ ok: false, error: "PHOTO_NOT_FOUND" });
    }
    if (op === "delete") {
      next = pool.filter((_, k) => k !== i);
      removePath = body.path;
    } else {
      const to = op === "set_main" ? 0 : body.to;
      if (!Number.isInteger(to) || to < 0 || to >= pool.length) {
        return res.status(400).json({ ok: false, error: "INVALID_INDEX" });
      }
      next = [...pool];
      const [moved] = next.splice(i, 1);
      next.splice(to, 0, moved);
    }
  } else if (op === "replace") {
    const i = idxOf(body.oldPath);
    if (typeof body.oldPath !== "string" || i === -1) {
      return res.status(404).json({ ok: false, error: "PHOTO_NOT_FOUND" });
    }
    const path = body.path;
    if (!isOwnPath(path, store.id)) {
      return res.status(400).json({ ok: false, error: "INVALID_PATH" });
    }
    if (idxOf(path) !== -1) {
      return res.status(409).json({ ok: false, error: "DUPLICATE" });
    }
    const ex = await objectExists(path);
    if (ex === null) return res.status(502).json({ ok: false, error: "STORAGE_CHECK_FAILED" });
    if (!ex) return res.status(400).json({ ok: false, error: "OBJECT_NOT_FOUND" });
    next = [...pool];
    next[i] = { path };
    removePath = body.oldPath;
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("store_profiles")
    .update({ photo_pool: next })
    .eq("id", store.id)
    .select("photo_pool")
    .single();

  if (updErr || !updated) {
    return res.status(500).json({ ok: false, error: "UPDATE_FAILED", detail: updErr?.message });
  }

  const out = { ok: true, photos: toPhotos(Array.isArray(updated.photo_pool) ? updated.photo_pool : []) };
  // 기존 객체 삭제는 DB 반영 이후. pool 에 있던 path 만(= 내 store 소속으로 저장된 값).
  if (removePath) {
    out.storage_cleanup = isOwnPath(removePath, store.id) ? await removeObject(removePath) : false;
  }
  return res.status(200).json(out);
}
