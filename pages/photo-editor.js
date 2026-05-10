// 📁 pages/photo-editor.js
// 사진 편집기 — 단독 툴 (블로그 연동 없음)
// 테마1/테마2 입력 → 파일명·ALT 자동생성 + 1200px 압축 + 워터마크 + 저장

import React, { useState, useRef, useCallback, useEffect } from "react";
import Head from "next/head";
// ★ [PATCH v2.0] lib/watermark.js 사용 — 15종 워터마크 + 6카테고리
import {
  WM_PRESETS,
  WM_POSITIONS,
  WM_CATEGORIES,
  drawWatermarkOnCanvas,
} from "../lib/watermark";

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

const WM_TEXT_DEFAULT = "내 가게 이름\n010-0000-0000";
export default function PhotoEditor() {
  const [step,      setStep]      = useState("photos");
  const [theme1,    setTheme1]    = useState("");
  const [theme2,    setTheme2]    = useState("");
  const [photoData, setPhotoData] = useState([]);
  const [captionSuffix, setCaptionSuffix] = useState([]);
  const [copiedIdx,  setCopiedIdx]  = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveMsg,    setSaveMsg]    = useState("");
  const [wmEnabled,  setWmEnabled]  = useState(true);
  const [wmStyle,    setWmStyle]    = useState("friendly-blue");
  const [wmPosition, setWmPosition] = useState("bottom-right");
  const [wmText,     setWmText]     = useState(WM_TEXT_DEFAULT);
  // ★ [PATCH v3.5] 로고 업로드
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [logoImg,     setLogoImg]     = useState(null);
  const logoInputRef = useRef();

  // ★ [PATCH v3.6] localStorage에서 로고 복원 (마운트 시 1회)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("photoEditor.logoDataUrl");
      if (saved) {
        setLogoDataUrl(saved);
        loadImage(saved).then(img => setLogoImg(img)).catch(() => {});
      }
    } catch (e) { /* localStorage 접근 실패 무시 */ }
  }, []);

  const fileInputRef     = useRef();
  const previewCanvasRef = useRef();
  const rootRef          = useRef();
  const [previewIdx, setPreviewIdx] = useState(0);
  // ★ [PATCH v2.9] 임베드/단독 모두 대응: root의 실제 top 위치 기준으로 viewport에 딱 맞게 높이 계산
  const [rootHeight, setRootHeight] = useState("calc(100vh - 140px)");
  useEffect(() => {
    const calc = () => {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      const h = window.innerHeight - rect.top - 8; // 8px 하단 여유
      setRootHeight(`${Math.max(500, h)}px`);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const t1 = () => theme1.replace(/[·\s\/\\:*?"<>|]/g, "") || "사진";
  const t2 = () => theme2.replace(/[·\s\/\\:*?"<>|]/g, "");

  const buildAlt      = (idx) => `${theme1 || "사진"}${theme2 ? ` ${theme2}` : ""} 사진${idx !== undefined ? `_${String(idx + 1).padStart(2, "0")}` : ""}`;
  const buildFilename = (origName, idx) => {
    const ext = origName.split(".").pop().toLowerCase() || "jpg";
    const num = String(idx + 1).padStart(2, "0");
    return `${t1()}${t2() ? `_${t2()}` : ""}_${num}.${ext}`;
  };
  const buildCaptionPrefix = () => `${theme1 || "사진"}${theme2 ? `, ${theme2}` : ""},`;

  const MAX_PHOTOS = 30;

  const handleFiles = useCallback(async (rawFiles) => {
    const arr = Array.from(rawFiles).filter(f => f.type.startsWith("image/"));
    setPhotoData(prev => {
      const remaining = MAX_PHOTOS - prev.length;
      if (remaining <= 0) {
        alert(`최대 ${MAX_PHOTOS}장까지만 업로드 가능합니다. (현재 ${prev.length}장)`);
        return prev;
      }
      if (arr.length > remaining) {
        alert(`${arr.length}장 중 ${remaining}장만 추가됩니다. (최대 ${MAX_PHOTOS}장)`);
      }
      return prev;
    });
    // 한도 내 슬라이스
    const slot = Math.max(0, MAX_PHOTOS - photoData.length);
    if (slot === 0) return;
    const trimmed = arr.slice(0, slot);
    const items = await Promise.all(trimmed.map(async (file, i) => ({
      id: Date.now()+i, file, name: file.name,
      preview: await fileToDataUrl(file), alt: "", resultDataUrl: null,
    })));
    setPhotoData(prev => [...prev, ...items].slice(0, MAX_PHOTOS));
  }, [photoData.length]);

  const generateMetadata = () => {
    const updated = photoData.map((p, i) => ({ ...p, alt: buildAlt(i), name: buildFilename(p.file.name, i) }));
    setCaptionSuffix(photoData.map(() => ""));
    setPhotoData(updated);
    setPreviewIdx(0);
    setStep("review");
  };

  const drawWm = useCallback((ctx, cw, ch) => {
    if (!wmEnabled) return;
    drawWatermarkOnCanvas(ctx, cw, ch, {
      wmStyle,
      wmText: wmText || WM_TEXT_DEFAULT,
      wmPosition,
      logoImg,
    });
  }, [wmEnabled, wmStyle, wmPosition, wmText, logoImg]);

  // ★ [PATCH v3.5] 로고 업로드 → Image 객체 생성
  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 업로드 가능합니다."); return; }
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    setLogoDataUrl(dataUrl);
    setLogoImg(img);
    // ★ [PATCH v3.6] localStorage에 저장 (다음 방문 시 자동 복원)
    try {
      localStorage.setItem("photoEditor.logoDataUrl", dataUrl);
    } catch (e) {
      // 5MB 초과 등 저장 실패 시 안내
      alert("로고 파일이 너무 큽니다. 더 작은 파일을 사용해주세요. (브라우저에 저장되지 않음)");
    }
  };
  const removeLogo = () => {
    setLogoDataUrl(null);
    setLogoImg(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    try { localStorage.removeItem("photoEditor.logoDataUrl"); } catch (e) {}
  };

  const renderPreview = useCallback(async (idx) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !photoData[idx]) return;
    const img = await loadImage(photoData[idx].preview);
    // ★ [PATCH v2.5] 부모 컨테이너 크기 기준으로 동적 확장 — 미리보기 크게
    const parent = canvas.parentElement;
    const maxW = Math.max(400, (parent?.clientWidth  || 800) - 12);
    const maxH = Math.max(300, (parent?.clientHeight || 600) - 12);
    let w = img.width, h = img.height;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * ratio); h = Math.round(h * ratio);
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    drawWm(ctx, w, h);
  }, [photoData, drawWm]);

  useEffect(() => { if (photoData.length > 0) renderPreview(previewIdx); }, [previewIdx, photoData, wmEnabled, wmStyle, wmPosition, wmText, logoImg]);

  // ★ [PATCH v3.4] 자동 메타 생성 — 사진만 업로드돼도 review 모드 진입 (워터마크 미리보기 즉시 가능)
  useEffect(() => {
    if (photoData.length > 0 && step === "photos") {
      const updated = photoData.map((p, i) => ({
        ...p,
        alt: p.alt || buildAlt(i),
        name: p.name && p.name !== p.file.name ? p.name : buildFilename(p.file.name, i)
      }));
      setCaptionSuffix(prev => prev.length === photoData.length ? prev : photoData.map(() => ""));
      setPhotoData(updated);
      setStep("review");
    }
  }, [photoData.length]);

  // ★ 테마 변경 시 파일명/ALT 재생성 (사용자가 손댄 게 없는 경우만)
  useEffect(() => {
    if (step === "review" && theme1.trim() && photoData.length > 0) {
      setPhotoData(prev => prev.map((p, i) => ({
        ...p,
        name: buildFilename(p.file.name, i),
        alt: buildAlt(i),
      })));
    }
  }, [theme1, theme2]);

  const processAndSave = async () => {
    if (!photoData.length) return;
    setProcessing(true); setSaveStatus("saving"); setSaveMsg("처리 중...");
    // 5장씩 배치 처리 — 메모리 과부하 방지
    const updated = [];
    const BATCH = 5;
    for (let b = 0; b < photoData.length; b += BATCH) {
      const batch = photoData.slice(b, b + BATCH);
      setSaveMsg(`처리 중... (${Math.min(b + BATCH, photoData.length)} / ${photoData.length})`);
      const results = await Promise.all(batch.map(async (f) => {
        const img = await loadImage(f.preview);
        const maxW = 1200;
        let outW = img.width, outH = img.height;
        if (outW > maxW) { outH = Math.round(outH*maxW/outW); outW = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = outW; canvas.height = outH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, outW, outH);
        drawWm(ctx, outW, outH);
        return { ...f, resultDataUrl: canvas.toDataURL("image/jpeg", 0.88) };
      }));
      updated.push(...results);
    }
    setPhotoData(updated);
    try {
      const today = new Date();
      const hms = `${String(today.getHours()).padStart(2,"0")}${String(today.getMinutes()).padStart(2,"0")}${String(today.getSeconds()).padStart(2,"0")}`;
      const ymd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
      let folderName = `${ymd}-${hms}-${t1()}${t2() ? `-${t2()}` : ""}`;
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite", startIn: "pictures" });
      // 폴더 중복 방지 — 이미 존재하면 _2, _3 ... 으로 새 폴더 생성
      let uniqueName = folderName;
      let suffix = 2;
      while (true) {
        try {
          await dirHandle.getDirectoryHandle(uniqueName, { create: false });
          // 존재하면 숫자 증가
          uniqueName = `${folderName}_${suffix++}`;
        } catch {
          break; // 없으면 사용 가능
        }
      }
      const editDir = await dirHandle.getDirectoryHandle(uniqueName, { create: true });
      // 실제 사용된 폴더명으로 교체
      folderName = uniqueName;
      for (let i = 0; i < updated.length; i++) {
        const f    = updated[i];
        const blob = await fetch(f.resultDataUrl).then(r => r.blob());
        const fh   = await editDir.getFileHandle(f.name, { create: true });
        const wr   = await fh.createWritable();
        await wr.write(blob); await wr.close();
        setSaveMsg(`저장 중... (${i+1} / ${updated.length})`);
      }
      const folderName2 = folderName;
      setSaveStatus("done"); setSaveMsg(`✅ ${updated.length}장 저장 완료! → ${folderName2}`);
      setProcessing(false);
      // 2초 후 자동 리셋 → 바로 새 작업 가능
      setTimeout(() => {
        setStep("photos");
        setPhotoData([]);
        setCaptionSuffix([]);
        setTheme1("");
        setTheme2("");
        setSaveStatus("");
        setSaveMsg("");
        setPreviewIdx(0);
      }, 2000);
    } catch (err) {
      if (err.name !== "AbortError") { setSaveStatus("error"); setSaveMsg("❌ 저장 오류: " + err.message); }
      else { setSaveStatus(""); setSaveMsg(""); }
      setProcessing(false);
    }
  };

  const buildFullCaption = (idx) => {
    const prefix = buildCaptionPrefix();
    const suffix = captionSuffix[idx] || "";
    return suffix ? `${prefix} ${suffix}` : prefix;
  };
  const copyCaption  = (idx) => { navigator.clipboard.writeText(buildFullCaption(idx)); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); };
  const updateSuffix = (idx, val) => setCaptionSuffix(prev => { const n=[...prev]; n[idx]=val; return n; });
  const updateField  = (idx, field, val) => setPhotoData(prev => prev.map((p,i) => i===idx ? {...p,[field]:val} : p));

  return (
    <>
      <Head>
        <title>📸 사진 편집기 — 반장닷컴</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes blink-border {
            0%,100%{border-color:#ff6d00;box-shadow:0 0 0 2px rgba(255,109,0,.25);}
            50%{border-color:#ffcc02;box-shadow:0 0 0 4px rgba(255,204,2,.35);}
          }
          .caption-blink{animation:blink-border 1.1s ease-in-out infinite;border:2px solid #ff6d00!important;}
          .caption-done{border:2px solid #66bb6a!important;box-shadow:0 0 0 2px rgba(102,187,106,.2)!important;}
        `}</style>
      </Head>
      <div ref={rootRef} style={{ ...S.root, height: rootHeight, maxHeight: rootHeight }}>
        {/* HEADER */}
        <div style={S.hdr}>
          <div style={S.hdrLeft}>
            <div style={S.hdrLogo}>📸</div>
            <div>
              <div style={S.hdrTitle}>사진 편집기</div>
              <div style={S.hdrSub}>파일명 · 캡션 · 워터마크 · 1200px 압축</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* 상태 표시 */}
            <span style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,.15)", color: "#fff" }}>
              {photoData.length === 0 ? "📥 사진을 업로드하세요" : !theme1.trim() ? `✏️ 테마1 입력 필요 (미리보기는 가능)` : `✅ ${photoData.length}장 작업 중`}
            </span>
            {/* ★ [PATCH v2.8] 저장 버튼 — 헤더에 상시 노출 (스크롤 불필요) */}
            <button
              onClick={processAndSave}
              disabled={processing || !photoData.length}
              style={{
                padding: "8px 18px", borderRadius: 22, border: "none",
                fontFamily: "'Noto Sans KR',sans-serif",
                fontSize: 13, fontWeight: 900, letterSpacing: ".02em",
                background: !processing && photoData.length ? "linear-gradient(135deg,#fff176,#ffd54f)" : "rgba(255,255,255,.1)",
                color: !processing && photoData.length ? "#1a237e" : "rgba(255,255,255,.4)",
                boxShadow: !processing && photoData.length ? "0 2px 8px rgba(0,0,0,.2)" : "none",
                cursor: !processing && photoData.length ? "pointer" : "default",
                transition: "all .2s",
                whiteSpace: "nowrap",
              }}>
              {processing ? `⏳ 처리 중` : `💾 압축 + 저장${photoData.length ? ` (${photoData.length}장)` : ""}`}
            </button>
          </div>
        </div>

        <div style={S.body}>

          {/* ★ 통합 좌우 분할 레이아웃 — 한 화면에서 모든 작업 */}
          <div style={{ display: "flex", gap: 16, padding: "12px 20px", maxWidth: 1800, margin: "0 auto", alignItems: "stretch", height: "100%", boxSizing: "border-box", minHeight: 0 }}>

            {/* ===== 좌측 50% — 테마·업로드·메타 (캡션만 자체 스크롤) ===== */}
            <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, height: "100%", overflow: "hidden", paddingRight: 4 }}>

              {/* ① ② 가로 배치 — 사진 먼저, 테마 다음 (자연스러운 작업 순서) */}
              <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexShrink: 0 }}>

                {/* ① 사진 업로드 */}
                <div style={{ ...S.stepCard, padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={S.stepTitle}>① 사진 업로드 <span style={{ fontSize: 11, fontWeight: 600, color: photoData.length >= MAX_PHOTOS ? "#c62828" : "#78909c" }}>— {photoData.length}/{MAX_PHOTOS}</span></div>
                  <label style={{ ...S.dropZone, padding: "20px 12px", marginTop: 8, marginBottom: 0, opacity: photoData.length >= MAX_PHOTOS ? 0.5 : 1, pointerEvents: photoData.length >= MAX_PHOTOS ? "none" : "auto" }} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()}>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e=>handleFiles(e.target.files)} disabled={photoData.length >= MAX_PHOTOS} />
                    <div style={{ fontSize: 26, marginBottom: 2 }}>🖼️</div>
                    <div style={{ fontWeight: 700, color: "#37474f", fontSize: 12 }}>{photoData.length >= MAX_PHOTOS ? "30장 도달" : "드래그 / 클릭"}</div>
                    <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 2 }}>최대 30장 · JPG·PNG·WEBP</div>
                  </label>
                  {photoData.length > 0 && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 11, color: "#78909c", fontWeight: 600 }}>📎 {photoData.length}장</div>
                        <button onClick={()=>{setPhotoData([]);setCaptionSuffix([]);setStep("photos");}} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, border: "1.5px solid #ffcdd2", background: "#fff3f3", color: "#c62828", cursor: "pointer" }}>🗑️ 전체</button>
                      </div>
                      <div style={{ ...S.thumbGrid, maxHeight: 130, overflowY: "auto", padding: 4, background: "#fafbfc", borderRadius: 8, border: "1px solid #eef0f3" }}>
                        {photoData.map((f,i) => (
                          <div key={f.id} style={{ ...S.thumbItem, cursor: "pointer", outline: previewIdx===i ? "2.5px solid #1a237e" : "none", outlineOffset: 1, borderRadius: 6 }} onClick={()=>setPreviewIdx(i)}>
                            <img src={f.preview} alt="" style={S.thumbImg} />
                            <div style={{ ...S.thumbName, color: previewIdx===i ? "#1a237e" : "#78909c", fontWeight: previewIdx===i ? 800 : 400 }}>{i+1}</div>
                            <button style={S.thumbDel} onClick={(e)=>{e.stopPropagation();setPhotoData(prev=>prev.filter(x=>x.id!==f.id));}}>✕</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ② 테마 입력 */}
                <div style={{ ...S.stepCard, padding: 16, flex: 1 }}>
                  <div style={S.stepTitle}>② 파일명 테마 <span style={{ fontSize: 11, fontWeight: 600, color: "#78909c" }}>— 자동 생성</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    <div>
                      <div style={S.label}>테마1 <span style={S.labelSub}>— 큰 카테고리</span></div>
                      <input style={S.input} type="text" placeholder="예: 강남 눈성형" value={theme1} onChange={e => setTheme1(e.target.value)} />
                    </div>
                    <div>
                      <div style={S.label}>테마2 <span style={S.labelSub}>— 세부 (선택)</span></div>
                      <input style={{ ...S.input, borderColor: "#ce93d8" }} type="text" placeholder="예: 상담실, 시술 전후" value={theme2} onChange={e => setTheme2(e.target.value)} />
                    </div>
                    {theme1 && (
                      <div style={{ background: "#f3e5f5", borderRadius: 8, padding: "10px 12px", border: "1.5px solid #ce93d8", fontSize: 11 }}>
                        <div style={{ fontWeight: 800, color: "#6a1b9a", marginBottom: 6, fontSize: 12 }}>📋 자동 생성될 파일명·폴더명·ALT</div>
                        <div style={{ color: "#37474f", lineHeight: 1.8 }}>
                          <div>📂 <strong>저장 폴더:</strong> <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, color: "#6a1b9a", fontWeight: 700, fontSize: 11 }}>날짜-시간-{t1()}{t2() ? `-${t2()}` : ""}</code></div>
                          <div>📁 <strong>파일명:</strong> <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, color: "#6a1b9a", fontWeight: 700, fontSize: 11 }}>{t1()}{t2() ? `_${t2()}` : ""}_01.jpg</code> {photoData.length > 1 && <span style={{ color: "#9c27b0" }}>~ _{String(photoData.length).padStart(2,"0")}.jpg</span>}</div>
                          <div>🏷️ <strong>이미지 ALT:</strong> <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, color: "#6a1b9a", fontWeight: 700, fontSize: 11 }}>{buildAlt(0)}</code> {photoData.length > 1 && <span style={{ color: "#9c27b0" }}>~ _{String(photoData.length).padStart(2,"0")}</span>} <span style={{ color: "#78909c", fontSize: 10 }}>(SEO용)</span></div>
                          {photoData.length > 0 && <div style={{ marginTop: 4, color: "#558b2f", fontWeight: 700 }}>✓ 총 {photoData.length}장 일괄 적용</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ★ [PATCH v3.3] ③ 폴더 정리법 — 좌우 2열 (구조 + 활용흐름) */}
              <div style={{ ...S.stepCard, padding: 16, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={S.stepTitle}>📁 폴더 정리법 <span style={{ fontSize: 11, fontWeight: 600, color: "#78909c" }}>— 미리 이렇게 정리해두세요</span></div>

                {/* 좌우 2열 grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10, flex: 1, minHeight: 0 }}>

                  {/* === 좌측: 폴더 구조 예시 === */}
                  <div style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#fff",
                    border: "2px solid #90caf9",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    overflow: "hidden",
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#1565c0", marginBottom: 8, flexShrink: 0 }}>
                      💡 시술·상황별로 폴더 분류
                    </div>
                    <div style={{
                      background: "#fafbfc",
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontFamily: "'Consolas','Malgun Gothic',monospace",
                      fontSize: 12,
                      lineHeight: 1.85,
                      color: "#37474f",
                      border: "1px solid #e0e0e0",
                      flex: 1,
                      overflowY: "auto",
                      minHeight: 0,
                    }}>
                      <div style={{ color: "#1565c0", fontWeight: 700 }}>📁 강남눈성형/</div>
                      <div style={{ paddingLeft: 16 }}>📁 상담실</div>
                      <div style={{ paddingLeft: 16 }}>📁 수술전후</div>
                      <div style={{ paddingLeft: 16 }}>📁 회복실</div>
                      <div style={{ paddingLeft: 16 }}>📁 후기인터뷰</div>
                      <div style={{ paddingLeft: 16 }}>📁 의료진</div>
                      <div style={{ paddingLeft: 16 }}>📁 시설내부</div>
                      <div style={{ paddingLeft: 16, color: "#9e9e9e" }}>📁 ...</div>
                    </div>
                  </div>

                  {/* === 우측: 활용 흐름 === */}
                  <div style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#fff8e1,#fffde7)",
                    border: "2px solid #ffd54f",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#e65100", marginBottom: 10, lineHeight: 1.4, flexShrink: 0 }}>
                      ⚡ 미리 정리해두면<br/>글 발행이 5분 안에 끝!
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, justifyContent: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a237e", color: "#fff", fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>1</div>
                        <div style={{ fontSize: 13, color: "#37474f", fontWeight: 700 }}>글 생성</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a237e", color: "#fff", fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>2</div>
                        <div style={{ fontSize: 13, color: "#37474f", fontWeight: 700 }}>복사</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a237e", color: "#fff", fontWeight: 900, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>3</div>
                        <div style={{ fontSize: 13, color: "#37474f", fontWeight: 700 }}>해당 폴더에서 사진 첨부</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#43a047", color: "#fff", fontWeight: 900, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</div>
                        <div style={{ fontSize: 13, color: "#2e7d32", fontWeight: 800 }}>발행 완료</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ===== 우측 50% — 워터마크 + 미리보기 + 저장 (한 화면 고정) ===== */}
            <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column", gap: 10, minHeight: 0, height: "100%", overflow: "hidden" }}>

              {/* ★ [PATCH v2.2] 워터마크 설정 — 가로 1줄 컴팩트 */}
              <div style={{ ...S.stepCard, padding: 10, flexShrink: 0 }}>
                {/* 1줄: 체크박스 + 위치 select + 텍스트 + 로고 업로드 */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: wmEnabled ? 8 : 0 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, color: "#3949ab", cursor: "pointer", whiteSpace: "nowrap", paddingTop: 8 }}>
                    💧 <input type="checkbox" checked={wmEnabled} onChange={e=>setWmEnabled(e.target.checked)} /> 워터마크
                  </label>
                  {wmEnabled && (
                    <>
                      <select style={{ padding: "6px 8px", borderRadius: 6, border: "1.5px solid #e0e0e0", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", outline: "none", height: 36, alignSelf: "flex-start" }} value={wmPosition} onChange={e=>setWmPosition(e.target.value)}>
                        {WM_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                      <textarea style={{ flex: 1, border: "1.5px solid #c5cae9", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "'Noto Sans KR',sans-serif", outline: "none", resize: "none", boxSizing: "border-box", height: 52, lineHeight: 1.4, color: "#37474f", minWidth: 0 }} rows={2} value={wmText} onChange={e=>setWmText(e.target.value)} placeholder="상호 / 연락처 등 (Enter로 줄바꿈)" />
                      {/* ★ [PATCH v3.5] 로고 업로드 영역 */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e=>handleLogoUpload(e.target.files[0])} />
                        {logoDataUrl ? (
                          <div style={{ position: "relative" }}>
                            <img src={logoDataUrl} alt="로고" style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid #3949ab", objectFit: "cover", cursor: "pointer" }} onClick={()=>logoInputRef.current?.click()} title="클릭해서 변경" />
                            <button onClick={removeLogo} title="로고 제거" style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#ef5350", color: "#fff", border: "none", fontSize: 10, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={()=>logoInputRef.current?.click()} title="로고 업로드 (친근형·명함형에 표시)" style={{ width: 52, height: 52, borderRadius: "50%", border: "2px dashed #b0bec5", background: "#fafbfc", fontSize: 18, color: "#78909c", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            🖼️
                          </button>
                        )}
                        <span style={{ fontSize: 9, color: "#90a4ae", fontWeight: 600 }}>{logoDataUrl ? "로고" : "로고추가"}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 2줄: 15종 워터마크 가로 펼침 (카테고리별 구분) */}
                {wmEnabled && (
                  <div style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    padding: "6px 8px",
                    background: "#fafbfc",
                    borderRadius: 6,
                    border: "1px solid #eef0f4",
                  }}>
                    {WM_CATEGORIES.map((cat, ci) => {
                      const catPresets = WM_PRESETS.filter(p => p.category === cat.id);
                      if (catPresets.length === 0) return null;
                      return (
                        <React.Fragment key={cat.id}>
                          {ci > 0 && <span style={{ width: 1, height: 18, background: "#cfd8dc" }} />}
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#546e7a", whiteSpace: "nowrap" }}>
                            {cat.label.split(" ")[0]}
                          </span>
                          {catPresets.map(p => (
                            <button key={p.id}
                              title={p.label}
                              style={{
                                width: 26, height: 26,
                                borderRadius: 5,
                                border: `1.5px solid ${wmStyle===p.id?"#3949ab":"#e0e0e0"}`,
                                background: wmStyle===p.id?"#e8eaf6":"#fff",
                                fontSize: 13,
                                cursor: "pointer",
                                padding: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: wmStyle===p.id ? "0 0 0 2px rgba(57,73,171,0.15)" : "none",
                                flexShrink: 0,
                              }}
                              onClick={()=>setWmStyle(p.id)}>
                              {p.shortLabel}
                            </button>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 미리보기 — 크게 (남는 공간 전부 차지) */}
              <div style={{ ...S.stepCard, padding: 8, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ ...S.stepTitle, marginBottom: 6, flexShrink: 0 }}>👁️ 미리보기 {photoData.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#78909c" }}>— {previewIdx+1} / {photoData.length}</span>}</div>
                <div style={{ flex: 1, textAlign: "center", background: "#f0f4f8", borderRadius: 12, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, overflow: "hidden" }}>
                  {photoData.length > 0 ? (
                    <canvas ref={previewCanvasRef} style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", borderRadius: 10, border: "1px solid #e0e0e0", boxShadow: "0 2px 12px rgba(0,0,0,.08)" }} />
                  ) : (
                    <div style={{ color: "#90a4ae", fontSize: 14 }}>👈 좌측에 사진을 업로드하세요</div>
                  )}
                </div>
                {/* 사진 페이지 네비게이션 */}
                {photoData.length > 1 && (
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6, flexWrap: "wrap", flexShrink: 0 }}>
                    {photoData.map((_, i) => (
                      <button key={i}
                        style={{
                          width: 26, height: 26,
                          borderRadius: 6,
                          border: "none",
                          background: previewIdx===i ? "#3949ab" : "#e8eaf6",
                          color: previewIdx===i ? "#fff" : "#3949ab",
                          fontSize: 11, fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "'Noto Sans KR',sans-serif",
                        }}
                        onClick={()=>setPreviewIdx(i)}>
                        {i+1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ★ [PATCH v2.8] 저장 버튼은 헤더로 이동 — 여기서는 처리 메시지만 표시 */}
              {saveMsg && (
                <div style={{ padding: "8px 14px", borderRadius: 10, background: saveStatus==="done"?"#e8f5e9":saveStatus==="error"?"#ffebee":"#f3f8ff", border: `1.5px solid ${saveStatus==="done"?"#81c784":saveStatus==="error"?"#ef9a9a":"#90caf9"}`, fontSize: 12, color: saveStatus==="done"?"#2e7d32":saveStatus==="error"?"#c62828":"#1565c0", fontWeight: 700, textAlign: "center", flexShrink: 0 }}>
                  {saveMsg}{saveStatus==="done" && " 잠시 후 초기화됩니다..."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  // ★ [PATCH v2.9] 동적 높이는 useEffect에서 제어. 기본은 100vh - 140px (외부 탭바·페이지 헤더 차감)
  root:     { display: "flex", flexDirection: "column", background: "#f0f4f8", fontFamily: "'Noto Sans KR',sans-serif", overflow: "hidden" },
  hdr:      { background: "#1a237e", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  hdrLeft:  { display: "flex", alignItems: "center", gap: 12 },
  hdrLogo:  { width: 36, height: 36, background: "rgba(255,255,255,.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  hdrTitle: { fontSize: 15, fontWeight: 700, color: "#fff" },
  hdrSub:   { fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 1 },
  body:     { flex: 1, overflow: "hidden" },
  stepWrap: { maxWidth: 1600, margin: "0 auto", padding: "24px 32px" },
  stepCard: { background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,.07)" },
  stepTitle:{ fontSize: 16, fontWeight: 900, color: "#1a237e", marginBottom: 8 },
  stepDesc: { fontSize: 13, color: "#78909c", marginBottom: 16, lineHeight: 1.6 },
  label:    { fontSize: 12, color: "#78909c", fontWeight: 700, marginBottom: 5 },
  labelSub: { color: "#b0bec5", fontWeight: 500 },
  input:    { width: "100%", border: "1.5px solid #c5cae9", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Noto Sans KR',sans-serif", outline: "none", color: "#37474f", boxSizing: "border-box" },
  dropZone: { display: "block", border: "2.5px dashed #90caf9", borderRadius: 16, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: "#f3f8ff", marginBottom: 16 },
  thumbGrid:{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 },
  thumbItem:{ position: "relative", width: 60 },
  thumbImg: { width: 60, height: 50, objectFit: "cover", borderRadius: 6, border: "1px solid #e0e0e0", display: "block" },
  thumbName:{ fontSize: 9, color: "#78909c", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" },
  thumbDel: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ffcdd2", border: "none", cursor: "pointer", fontSize: 10, color: "#c62828", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  captionGuide: { background: "#fff8e1", border: "1.5px solid #ffe082", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#5d4037", marginBottom: 16, lineHeight: 1.6 },
  photoRow:     { display: "flex", gap: 12, padding: "14px 16px", border: "1.5px solid #e8eaf6", borderRadius: 12, background: "#fafafa" },
  photoRowThumb:{ width: 72, height: 58, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid #e0e0e0" },
  metaLabel:    { fontSize: 10, fontWeight: 700, color: "#90a4ae", letterSpacing: ".06em", marginBottom: 3 },
  metaInput:    { width: "100%", padding: "6px 10px", border: "1.5px solid #e8eaf6", borderRadius: 8, fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", color: "#37474f", outline: "none", boxSizing: "border-box" },
  captionPrefix:{ fontSize: 12, color: "#546e7a", background: "#f0f4f8", borderRadius: "8px 0 0 8px", padding: "6px 10px", border: "1.5px solid #cfd8dc", borderRight: "none", whiteSpace: "nowrap", flexShrink: 0, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", fontFamily: "'Noto Sans KR',sans-serif" },
  captionSuffixInput: { flex: 1, padding: "6px 10px", borderRadius: "0 8px 8px 0", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", color: "#37474f", outline: "none", boxSizing: "border-box", minWidth: 0 },
  captionPreview: { marginTop: 5, fontSize: 11, color: "#546e7a", background: "#f5f5f5", borderRadius: 6, padding: "4px 8px", lineHeight: 1.5 },
  captionRow:   { display: "flex", gap: 14, padding: "14px 16px", border: "1.5px solid #e0e0e0", borderRadius: 12, alignItems: "flex-start" },
  captionThumb: { width: 72, height: 58, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid #e0e0e0" },
  copyBtn:      { padding: "8px 16px", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif", flexShrink: 0 },
  primaryBtn:   { padding: "12px 28px", background: "linear-gradient(135deg,#1a237e,#1565c0)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" },
  ghostBtn:     { padding: "12px 20px", background: "#fff", border: "1.5px solid #e0e0e0", borderRadius: 12, color: "#546e7a", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" },
};
