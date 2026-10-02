// lib/pseo/StorePhotoCard.js
// [P-PAGE-ONE-SCREEN-01 / ⑦-D] P페이지 기본 설정 좌측 「📷 업체 사진」 카드.
// SoT = store_profiles.photo_pool — 조회·조작은 /api/me/store-photo(⑦-C), 업로드 발급은 /api/me/store-photo-upload(⑦-B).
// ★ 사진 state 는 hubStore 와 분리(이 카드 안에서만). /api/me/store 응답에는 photo_pool 이 없어
//   saveStore → setHubStore(j.store) 전체 교체 시 사진이 지워지기 때문.
// ★ 이미지 바이너리는 브라우저 → Supabase Storage(signedUrl) 직접 PUT. 앱 서버 미경유.
// ★ 입력 = JPG·PNG. 모두 브라우저 canvas 로 JPEG 재인코딩(긴 변 1600px · 품질 0.82) 후 업로드.
//   EXIF/GPS 제거 · 대용량 원본 해소. HEIC/HEIF/WebP/GIF 는 이번 축 제외(거절).
// ★ lib/commonPhotoBox.js 의 photoPool 과 무관(H-005).
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

const MAX_PHOTOS = 6;               // 대표 1 + 추가 5 — 서버(store-photo*.js)가 최종 판정
const MAX_BYTES = 5 * 1024 * 1024;  // bucket store-photos 제한과 동일 — 변환 결과에 적용
const SRC_MAX_BYTES = 30 * 1024 * 1024; // 원본 상한(브라우저 디코딩 부담 차단)
const MAX_PIXELS = 50000000;       // 원본 5,000만 화소 상한
const LONG_EDGE = 1600;            // 결과 긴 변 최대(작으면 확대 안 함)
const QUALITY = 0.82;
const QUALITY_RETRY = 0.70;        // 결과 5MB 초과 시 1회 재처리
const INPUT_TYPES = new Set(["image/jpeg", "image/png"]);

const ERR_TEXT = {
  PHOTO_LIMIT: "사진은 최대 6장까지 등록할 수 있습니다.",
  NO_SESSION: "로그인이 필요합니다. 다시 로그인해 주세요.",
  UNAUTHORIZED: "로그인이 필요합니다. 다시 로그인해 주세요.",
  PHOTO_NOT_FOUND: "사진 목록이 바뀌었습니다. 새로 불러왔습니다.",
};
const errText = (code, fallback) => ERR_TEXT[code] || fallback;

async function authHeader() {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

// /api/me/* 호출 — 네트워크 실패도 { ok:false } 로 정규화.
async function callApi(url, method, body) {
  try {
    const auth = await authHeader();
    if (!auth) return { ok: false, error: "NO_SESSION" };
    const res = await fetch(url, {
      method,
      headers: { ...auth, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json().catch(() => null);
    return j && typeof j === "object" ? { ...j, status: res.status } : { ok: false, error: "BAD_RESPONSE", status: res.status };
  } catch (e) {
    return { ok: false, error: "NETWORK" };
  }
}

// 변환 전 형식 검사 — 통과 못 하면 이유 문자열.
function rejectReason(file) {
  if (!INPUT_TYPES.has(file.type)) return "JPG·PNG 사진만 올릴 수 있습니다";
  if (file.size > SRC_MAX_BYTES) return "30MB 이하 사진만 올릴 수 있습니다";
  return null;
}

// 브라우저 안에서 JPEG 재인코딩. 앱 서버 미경유.
//   흰 배경(PNG 투명영역) · 긴 변 LONG_EDGE 축소(확대 없음) · canvas 출력이라 EXIF/GPS 없음.
//   성공 { ok, blob, width, height } / 실패 { ok:false, reason }. objectURL·canvas 는 항상 정리.
async function toJpeg(file) {
  let url = null;
  let canvas = null;
  try {
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (e) { return { ok: false, reason: "사진을 읽을 수 없습니다" }; }
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) return { ok: false, reason: "사진을 읽을 수 없습니다" };
    if (w0 * h0 > MAX_PIXELS) return { ok: false, reason: "해상도가 너무 큰 사진입니다(5,000만 화소 초과)" };

    const scale = Math.min(1, LONG_EDGE / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    img.src = "";

    const encode = (q) => new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
    let blob = await encode(QUALITY);
    if (blob && blob.size > MAX_BYTES) blob = await encode(QUALITY_RETRY);
    if (!blob) return { ok: false, reason: "사진 변환에 실패했습니다" };
    if (blob.size > MAX_BYTES) return { ok: false, reason: "변환 후에도 5MB를 넘는 사진입니다" };
    return { ok: true, blob, width: w, height: h };
  } catch (e) {
    return { ok: false, reason: "사진 변환에 실패했습니다" };
  } finally {
    if (url) URL.revokeObjectURL(url);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

// 발급 → Storage 직접 PUT. 성공 시 { ok, path }.
async function uploadToStorage(file) {
  const g = await callApi("/api/me/store-photo-upload", "POST");
  if (!g.ok) return { ok: false, error: g.error || "SIGN_FAILED" };
  try {
    const r = await fetch(g.signedUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: file });
    if (!r.ok) return { ok: false, error: "UPLOAD_FAILED" };
  } catch (e) {
    return { ok: false, error: "UPLOAD_FAILED" };
  }
  return { ok: true, path: g.path };
}

// photo_pool 반영(add/replace) — 서버 오류·네트워크 실패면 같은 path 로 1회 재시도.
async function commitPhoto(body) {
  let r = await callApi("/api/me/store-photo", "POST", body);
  if (!r.ok && (r.error === "NETWORK" || (r.status || 0) >= 500)) {
    r = await callApi("/api/me/store-photo", "POST", body);
  }
  return r;
}

export default function StorePhotoCard({ storeId }) {
  const [photos, setPhotos] = useState([]);      // [{ path, url }] — [0] = 대표
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");          // 조작 중 표시 문구. 비어 있으면 대기.
  const [msg, setMsg] = useState(null);          // { ok:boolean, text }
  const addInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const aliveRef = useRef(true);
  const busyRef = useRef(false);

  const load = async () => {
    const r = await callApi("/api/me/store-photo", "GET");
    if (!aliveRef.current) return;
    if (r.ok) setPhotos(Array.isArray(r.photos) ? r.photos : []);
    else setMsg({ ok: false, text: errText(r.error, "사진 목록을 불러오지 못했습니다. 새로고침해 주세요.") });
    setLoaded(true);
  };

  // 업체가 바뀌면 다시 불러온다(계정 전환 시 이전 업체 사진 잔존 방지).
  useEffect(() => {
    aliveRef.current = true;
    setPhotos([]); setLoaded(false); setMsg(null); setBusy(""); busyRef.current = false;
    if (storeId) load();
    return () => { aliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  // 조작 공통 — 실행 중 중복 차단 · 결과 photos 반영 · 실패 메시지.
  //   busyRef = 렌더 전 연타까지 막는 즉시 잠금. busy = 화면 표시용.
  const run = async (label, fn) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(label); setMsg(null);
    try {
      await fn();
    } finally {
      busyRef.current = false;
      if (aliveRef.current) setBusy("");
    }
  };

  const applyResult = (r, okText, failText) => {
    if (!aliveRef.current) return false;
    if (r.ok) {
      if (Array.isArray(r.photos)) setPhotos(r.photos);
      if (okText) setMsg({ ok: true, text: okText });
      return true;
    }
    setMsg({ ok: false, text: errText(r.error, failText) });
    if (r.error === "PHOTO_NOT_FOUND") load();
    return false;
  };

  const onPickAdd = (fileList) => run("올리는 중", async () => {
    const files = Array.from(fileList || []);
    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) { setMsg({ ok: false, text: ERR_TEXT.PHOTO_LIMIT }); return; }

    const rejected = [];
    const valid = [];
    for (const f of files) {
      const why = rejectReason(f);
      if (why) rejected.push(`${f.name}: ${why}`);
      else valid.push(f);
    }
    const take = valid.slice(0, slots);
    const skipped = valid.length - take.length;

    let done = 0;
    let failText = "";
    // 한 장씩 순차 처리(동시 디코딩 없음).
    for (let i = 0; i < take.length; i++) {
      if (!aliveRef.current) return;
      setBusy(`사진 처리 중 ${i + 1}/${take.length}`);
      const cv = await toJpeg(take[i]);
      if (!aliveRef.current) return;
      if (!cv.ok) { rejected.push(`${take[i].name}: ${cv.reason}`); continue; }
      const up = await uploadToStorage(cv.blob);
      if (!up.ok) { failText = errText(up.error, `${take[i].name}: 업로드에 실패했습니다. 다시 시도해 주세요.`); break; }
      const r = await commitPhoto({ op: "add", path: up.path });
      if (!aliveRef.current) return;
      if (!r.ok) { failText = errText(r.error, `${take[i].name}: 등록에 실패했습니다. 다시 시도해 주세요.`); break; }
      if (Array.isArray(r.photos)) setPhotos(r.photos);
      done++;
    }

    const parts = [];
    if (done) parts.push(`${done}장 등록했습니다.`);
    if (failText) parts.push(failText);
    if (skipped > 0) parts.push(`최대 6장이라 ${skipped}장은 올리지 않았습니다.`);
    if (rejected.length) parts.push(rejected.join(" / "));
    if (parts.length) setMsg({ ok: !failText && !rejected.length && skipped === 0, text: parts.join(" ") });
  });

  const onPickReplace = (file) => {
    const oldPath = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || !oldPath) return;
    run("교체하는 중", async () => {
      const why = rejectReason(file);
      if (why) { setMsg({ ok: false, text: `${file.name}: ${why}` }); return; }
      setBusy("사진 처리 중 1/1");
      const cv = await toJpeg(file);
      if (!cv.ok) { setMsg({ ok: false, text: `${file.name}: ${cv.reason}` }); return; }
      const up = await uploadToStorage(cv.blob);
      if (!up.ok) { setMsg({ ok: false, text: errText(up.error, "업로드에 실패했습니다. 다시 시도해 주세요.") }); return; }
      const r = await commitPhoto({ op: "replace", oldPath, path: up.path });
      applyResult(r, "사진을 교체했습니다.", "교체에 실패했습니다. 다시 시도해 주세요.");
    });
  };

  const onSetMain = (path) => run("변경하는 중", async () => {
    const r = await callApi("/api/me/store-photo", "POST", { op: "set_main", path });
    applyResult(r, "대표사진을 바꿨습니다.", "대표사진 변경에 실패했습니다.");
  });

  const onMove = (path, to) => run("변경하는 중", async () => {
    const r = await callApi("/api/me/store-photo", "POST", { op: "move", path, to });
    applyResult(r, "", "순서 변경에 실패했습니다.");
  });

  const onDelete = (path, idx) => {
    if (busyRef.current) return;
    if (!window.confirm(idx === 0 ? "대표사진을 삭제할까요? 다음 사진이 대표가 됩니다." : "이 사진을 삭제할까요?")) return;
    run("삭제하는 중", async () => {
      const r = await callApi("/api/me/store-photo", "POST", { op: "delete", path });
      applyResult(r, "사진을 삭제했습니다.", "삭제에 실패했습니다. 다시 시도해 주세요.");
    });
  };

  const card = { background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "16px 18px", marginTop: 4, scrollMarginTop: 16 };
  const head = { fontSize: 13.5, fontWeight: 900, color: "#4A148C" };
  const smallBtn = (disabled) => ({
    padding: "3px 7px", borderRadius: 6, border: "1px solid #e1d5ee", background: "#fff",
    color: disabled ? "#ccc" : "#6a1b9a", fontSize: 11, fontWeight: 800, fontFamily: "inherit",
    cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap",
  });
  const locked = !!busy || !loaded;
  const canAdd = loaded && photos.length < MAX_PHOTOS;

  return (
    <div id="pseo-sec-photo" style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={head}>📷 업체 사진 <span style={{ fontSize: 11.5, color: "#9a8aab", fontWeight: 700 }}>{photos.length}/{MAX_PHOTOS}</span></div>
        {busy && <div style={{ fontSize: 12, color: "#6a1b9a", fontWeight: 800 }}>{busy}…</div>}
      </div>
      <div style={{ fontSize: 12, color: "#7a6a8a", marginTop: 8, lineHeight: 1.6 }}>
        첫 번째 사진이 대표사진입니다. JPG·PNG 사진, 최대 6장
      </div>
      <div style={{ fontSize: 11.5, color: "#b26a00", marginTop: 4, fontWeight: 700 }}>사진 공개 페이지 반영은 준비 중입니다.</div>

      <input ref={addInputRef} type="file" accept="image/jpeg,image/png" multiple style={{ display: "none" }}
        onChange={(e) => { const fl = e.target.files; onPickAdd(fl); e.target.value = ""; }} />
      <input ref={replaceInputRef} type="file" accept="image/jpeg,image/png" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; onPickReplace(f); e.target.value = ""; }} />

      {!loaded ? (
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 12 }}>사진 불러오는 중…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 12 }}>
          {photos.map((p, i) => (
            <div key={p.path} style={{ border: i === 0 ? "2px solid #7B1FA2" : "1.5px solid #e8e8ed", borderRadius: 10, overflow: "hidden", background: "#faf8fc" }}>
              <div style={{ position: "relative", paddingTop: "75%", background: "#f0edf4" }}>
                <img src={p.url} alt={i === 0 ? "대표사진" : `업체사진 ${i + 1}`} loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {i === 0 && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "#7B1FA2", color: "#fff", fontSize: 10.5, fontWeight: 900, padding: "2px 7px", borderRadius: 6 }}>대표</span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: 6 }}>
                {i !== 0 && (
                  <button type="button" disabled={locked} onClick={() => onSetMain(p.path)} style={smallBtn(locked)}>대표로</button>
                )}
                <button type="button" disabled={locked || i === 0} onClick={() => onMove(p.path, i - 1)} style={smallBtn(locked || i === 0)} aria-label="앞으로">◀</button>
                <button type="button" disabled={locked || i === photos.length - 1} onClick={() => onMove(p.path, i + 1)} style={smallBtn(locked || i === photos.length - 1)} aria-label="뒤로">▶</button>
                <button type="button" disabled={locked} onClick={() => { replaceTargetRef.current = p.path; replaceInputRef.current && replaceInputRef.current.click(); }} style={smallBtn(locked)}>교체</button>
                <button type="button" disabled={locked} onClick={() => onDelete(p.path, i)} style={{ ...smallBtn(locked), color: locked ? "#ccc" : "#c62828" }}>삭제</button>
              </div>
            </div>
          ))}
          {canAdd && (
            <button type="button" disabled={locked} onClick={() => addInputRef.current && addInputRef.current.click()}
              style={{ minHeight: 120, borderRadius: 10, border: "2px dashed #CE93D8", background: "#FCF4FF", color: locked ? "#bbb" : "#7B1FA2",
                fontSize: 13, fontWeight: 900, cursor: locked ? "default" : "pointer", fontFamily: "inherit" }}>
              + 사진 추가
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, color: "#9a8aab" }}>{photos.length === 0 ? "첫 사진 = 대표사진" : `${MAX_PHOTOS - photos.length}장 더 가능`}</div>
            </button>
          )}
        </div>
      )}

      {msg && (
        <div style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6, fontWeight: 700, color: msg.ok ? "#2e7d32" : "#c62828" }}>{msg.text}</div>
      )}
    </div>
  );
}
