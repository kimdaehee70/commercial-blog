// components/PhotoEditorTab.jsx
// 사진 편집기 컴포넌트 — index.js 탭에 임베드용

import React, { useState, useRef, useCallback, useEffect } from "react";
// ★ [PATCH v2.0] lib/watermark.js 사용 — 15종 워터마크 + 6카테고리
import {
  WM_PRESETS,
  WM_POSITIONS,
  WM_CATEGORIES,
  WM_TEXT_DEFAULT,
  drawWatermarkOnCanvas,
} from "../lib/watermark";
// ★ [PATCH v3.7] 새로고침 시 가게이름·워터마크 설정 유지
import { usePersistentState, SK, storageGet } from "../lib/storage";

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
export default function PhotoEditorTab() {
  const [step,      setStep]      = useState("photos");
  // ★ [PATCH v3.7] 가게이름·테마·워터마크 설정은 새로고침 후에도 유지
  const [theme1,    setTheme1]    = usePersistentState(SK.PE_THEME1, "");
  const [theme2,    setTheme2]    = usePersistentState(SK.PE_THEME2, "");
  const [photoData, setPhotoData] = useState([]);
  const [captionSuffix, setCaptionSuffix] = useState([]);
  const [copiedIdx,  setCopiedIdx]  = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveMsg,    setSaveMsg]    = useState("");
  const [wmEnabled,  setWmEnabled]  = usePersistentState(SK.PE_WM_ENABLED,  true);
  const [wmStyle,    setWmStyle]    = usePersistentState(SK.PE_WM_STYLE,    "friendly-blue");
  const [wmPosition, setWmPosition] = usePersistentState(SK.PE_WM_POSITION, "bottom-right");
  const [wmText,     setWmText]     = usePersistentState(SK.PE_WM_TEXT,     WM_TEXT_DEFAULT);

  const fileInputRef     = useRef();
  const previewCanvasRef = useRef();
  const [previewIdx, setPreviewIdx] = useState(0);

  const t1 = () => theme1.replace(/[·\s\/\\:*?"<>|]/g, "") || "체험";
  const t2 = () => theme2.replace(/[·\s\/\\:*?"<>|]/g, "");

  const buildAlt      = () => `${theme1 || "체험"}${theme2 ? ` ${theme2}` : ""} 활동 장면`;
  const buildFilename = (origName, idx) => {
    const ext = origName.split(".").pop().toLowerCase() || "jpg";
    const num = String(idx + 1).padStart(2, "0");
    return `${t1()}${t2() ? `_${t2()}` : ""}_${num}.${ext}`;
  };
  const buildCaptionPrefix = () => `${theme1 || "체험"}${theme2 ? `, ${theme2}` : ""} 체험,`;

  const handleFiles = useCallback(async (rawFiles) => {
    const arr = Array.from(rawFiles).filter(f => f.type.startsWith("image/"));
    const items = await Promise.all(arr.map(async (file, i) => ({
      id: `${Date.now()}_${i}_${Math.random().toString(36).slice(2,7)}`, file, name: file.name,
      preview: await fileToDataUrl(file), alt: "", resultDataUrl: null,
    })));
    setPhotoData(prev => [...prev, ...items]);
  }, []);

  const generateMetadata = () => {
    const updated = photoData.map((p, i) => ({ ...p, alt: buildAlt(), name: buildFilename(p.file.name, i) }));
    setCaptionSuffix(photoData.map(() => ""));
    setPhotoData(updated);
    setPreviewIdx(0);
    setStep("review");
  };

  const drawWm = useCallback((ctx, cw, ch) => {
    if (!wmEnabled) return;
    // ★ [PATCH v2.0] lib/watermark의 통합 함수 호출
    drawWatermarkOnCanvas(ctx, cw, ch, {
      wmStyle,
      wmText: wmText || WM_TEXT_DEFAULT,
      wmPosition,
      logoImg: null, // 로고 업로드는 추후 구현
    });
  }, [wmEnabled, wmStyle, wmPosition, wmText]);

  const renderPreview = useCallback(async (idx) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !photoData[idx]) return;
    const img = await loadImage(photoData[idx].preview);
    const maxW = 500, maxH = 320;
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h*maxW/w); w = maxW; }
    if (h > maxH) { w = Math.round(w*maxH/h); h = maxH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    drawWm(ctx, w, h);
  }, [photoData, drawWm]);

  useEffect(() => { if (step === "review") renderPreview(previewIdx); }, [previewIdx, step, photoData, wmEnabled, wmStyle, wmPosition, wmText]);

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
      <div style={S.root}>
        {/* HEADER */}
        <div style={S.hdr}>
          <div style={S.hdrLeft}>
            <div style={S.hdrLogo}>📸</div>
            <div>
              <div style={S.hdrTitle}>사진 편집기</div>
              <div style={S.hdrSub}>파일명 · ALT · 캡션 · 워터마크 · 1200px 압축</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{id:"photos",label:"① 테마·업로드"},{id:"review",label:"② 확인·저장"}].map((s,i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <div style={{ width: 16, height: 1, background: "rgba(255,255,255,.3)" }} />}
                <div style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: step===s.id?"#fff":"rgba(255,255,255,.15)", color: step===s.id?"#1a237e":"rgba(255,255,255,.7)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.body}>

          {/* STEP 1 */}
          {step === "photos" && (
            <div style={S.stepWrap}>
              <div style={S.stepCard}>
                <div style={S.stepTitle}>① 테마 입력</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  <div>
                    <div style={S.label}>테마1 <span style={S.labelSub}>— 큰 카테고리 (파일명·ALT 앞부분)</span></div>
                    <input style={S.input} type="text" placeholder="예: 시장놀이, 반죽놀이, 병원놀이" value={theme1} onChange={e => setTheme1(e.target.value)} />
                  </div>
                  <div>
                    <div style={S.label}>테마2 <span style={S.labelSub}>— 세부 장면 (파일명·ALT 뒷부분 · 선택)</span></div>
                    <input style={{ ...S.input, borderColor: "#ce93d8" }} type="text" placeholder="예: 현수막, 놀이장면, 솜사탕, 배경막, 아이반응" value={theme2} onChange={e => setTheme2(e.target.value)} />
                  </div>
                  {theme1 && (
                    <div style={{ background: "#f3e5f5", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #ce93d8" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#6a1b9a", marginBottom: 6 }}>📋 자동 생성 미리보기</div>
                      <div style={{ fontSize: 12, color: "#37474f", marginBottom: 3 }}>📁 파일명: <strong>{t1()}{t2() ? `_${t2()}` : ""}_01.jpg</strong></div>
                      <div style={{ fontSize: 12, color: "#37474f", marginBottom: 3 }}>🏷️ ALT: <strong>{buildAlt()}</strong></div>
                      <div style={{ fontSize: 12, color: "#37474f" }}>💬 캡션 앞부분: <strong>{buildCaptionPrefix()}</strong></div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[["📁 파일명 자동생성","#e8eaf6","#3949ab"],["🏷️ ALT 자동생성","#e8eaf6","#3949ab"],["📐 가로 1200px 압축","#e8f5e9","#2e7d32"],["💧 워터마크 적용","#fff3e0","#e65100"]].map(([label,bg,color],i) => (
                      <span key={i} style={{ fontSize: 11, background: bg, color, borderRadius: 20, padding: "4px 10px", fontWeight: 700 }}>{label}</span>
                    ))}
                  </div>
                </div>

                <div style={S.stepTitle}>② 사진 업로드</div>
                <div style={S.stepDesc}>장수 제한 없이 업로드 가능합니다. (5장씩 배치 처리)</div>
                <label style={S.dropZone} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()}>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e=>{ handleFiles(e.target.files); e.target.value=""; }} />
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
                  <div style={{ fontWeight: 700, color: "#37474f", marginBottom: 4 }}>사진을 드래그하거나 클릭해서 선택</div>
                  <div style={{ fontSize: 12, color: "#90a4ae" }}>JPG · PNG · WEBP · 장수 제한 없음</div>
                </label>
                {photoData.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, color: "#78909c", fontWeight: 600 }}>📎 {photoData.length}장 선택됨</div>
                      <button onClick={()=>setPhotoData([])} style={{ fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 8, border: "1.5px solid #ffcdd2", background: "#fff3f3", color: "#c62828", cursor: "pointer" }}>🗑️ 전체 삭제</button>
                    </div>
                    <div style={S.thumbGrid}>
                      {photoData.map((f,i) => (
                        <div key={f.id} style={S.thumbItem}>
                          <img src={f.preview} alt="" style={S.thumbImg} />
                          <div style={S.thumbName}>{i+1}. {f.file.name}</div>
                          <button style={S.thumbDel} onClick={()=>setPhotoData(prev=>prev.filter(x=>x.id!==f.id))}>✕</button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button style={{ ...S.primaryBtn, opacity: photoData.length ? 1 : 0.5 }} onClick={generateMetadata} disabled={!photoData.length}>
                    다음 → 자동 생성
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === "review" && (
            <div style={S.stepWrap}>
              <div style={S.stepCard}>
                <div style={S.stepTitle}>② 파일명 · ALT · 캡션 확인</div>
                <div style={S.captionGuide}>✏️ 캡션 뒷부분(주황색)을 <strong>사진 보고 짧게 입력</strong>하세요.</div>

                {/* 워터마크 설정 */}
                <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #e8eaf6", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#3949ab", marginBottom: 10 }}>💧 워터마크 설정</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      <input type="checkbox" checked={wmEnabled} onChange={e=>setWmEnabled(e.target.checked)} /> 워터마크 적용
                    </label>
                    {wmEnabled && (
                      <select style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", outline: "none" }} value={wmPosition} onChange={e=>setWmPosition(e.target.value)}>
                        {WM_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    )}
                  </div>

                  {/* ★ [PATCH v2.1] 6×3 그리드 — 카테고리 라벨 + 이모지 버튼 */}
                  {wmEnabled && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "4px 10px",
                      alignItems: "center",
                      marginBottom: 8,
                      padding: 8,
                      background: "#fafbfc",
                      borderRadius: 8,
                      border: "1px solid #eef0f4",
                    }}>
                      {WM_CATEGORIES.map(cat => {
                        const catPresets = WM_PRESETS.filter(p => p.category === cat.id);
                        if (catPresets.length === 0) return null;
                        return (
                          <React.Fragment key={cat.id}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#546e7a", whiteSpace: "nowrap" }}>
                              {cat.label}
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              {catPresets.map(p => (
                                <button key={p.id}
                                  title={p.label}
                                  style={{
                                    width: 28, height: 28,
                                    borderRadius: 6,
                                    border: `1.5px solid ${wmStyle===p.id?"#3949ab":"#e0e0e0"}`,
                                    background: wmStyle===p.id?"#e8eaf6":"#fff",
                                    fontSize: 14,
                                    cursor: "pointer",
                                    padding: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    boxShadow: wmStyle===p.id ? "0 0 0 2px rgba(57,73,171,0.15)" : "none",
                                  }}
                                  onClick={()=>setWmStyle(p.id)}>
                                  {p.shortLabel}
                                </button>
                              ))}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                  {wmEnabled && (
                    <textarea style={{ width: "100%", border: "1.5px solid #e0e0e0", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontFamily: "'Noto Sans KR',sans-serif", outline: "none", resize: "vertical", boxSizing: "border-box" }} rows={2} value={wmText} onChange={e=>setWmText(e.target.value)} />
                  )}
                </div>

                {/* 미리보기 */}
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  <canvas ref={previewCanvasRef} style={{ maxWidth: "100%", borderRadius: 10, border: "1px solid #e0e0e0" }} />
                  {photoData.length > 1 && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
                      {photoData.map((_,i) => (
                        <button key={i} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: previewIdx===i?"#3949ab":"#e8eaf6", color: previewIdx===i?"#fff":"#3949ab", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans KR',sans-serif" }} onClick={()=>setPreviewIdx(i)}>{i+1}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 파일별 메타 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                  {photoData.map((f,i) => {
                    const suffix = captionSuffix[i] || "";
                    const isDone = suffix.trim().length > 0;
                    const prefix = buildCaptionPrefix();
                    return (
                      <div key={f.id} style={S.photoRow}>
                        <img src={f.preview} alt="" style={S.photoRowThumb} />
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div><div style={S.metaLabel}>📁 파일명</div><input style={S.metaInput} value={f.name} onChange={e=>updateField(i,"name",e.target.value)} /></div>
                          <div><div style={S.metaLabel}>🏷️ ALT</div><input style={S.metaInput} value={f.alt} onChange={e=>updateField(i,"alt",e.target.value)} /></div>
                          <div>
                            <div style={{ ...S.metaLabel, color: isDone?"#2e7d32":"#e65100" }}>💬 캡션 {isDone?"✅ 입력 완료":"⚠️ 사진 보고 뒷부분 입력"}</div>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <div style={S.captionPrefix}>{prefix}</div>
                              <input className={isDone?"caption-done":"caption-blink"} style={S.captionSuffixInput} value={suffix} onChange={e=>updateSuffix(i,e.target.value)} placeholder="사진 보고 짧게 입력..." />
                            </div>
                            {suffix && <div style={S.captionPreview}>미리보기: {prefix} {suffix}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 저장 메시지 */}
                {saveMsg && (
                  <div style={{ marginBottom: 8, padding: "12px 16px", borderRadius: 10, background: saveStatus==="done"?"#e8f5e9":saveStatus==="error"?"#ffebee":"#f3f8ff", border: `1.5px solid ${saveStatus==="done"?"#81c784":saveStatus==="error"?"#ef9a9a":"#90caf9"}`, fontSize: 13, color: saveStatus==="done"?"#2e7d32":saveStatus==="error"?"#c62828":"#1565c0", fontWeight: 700, textAlign: "center" }}>
                    {saveMsg}{saveStatus==="done" && " 잠시 후 초기화됩니다..."}
                  </div>
                )}
              </div>

              {/* 저장 버튼 — 하단 고정 */}
              <div style={{position:"sticky",bottom:0,padding:"12px 0 4px",background:"linear-gradient(to top,#f0f4f8 80%,transparent)",zIndex:10}}>
                <div style={{display:"flex",gap:10,maxWidth:720,margin:"0 auto",padding:"0 24px"}}>
                  <button style={{...S.ghostBtn,flexShrink:0}} onClick={()=>setStep("photos")}>← 이전</button>
                  <button
                    style={{flex:1,padding:"16px",borderRadius:14,border:"none",fontFamily:"'Noto Sans KR',sans-serif",fontSize:15,fontWeight:900,letterSpacing:".03em",
                      background:!processing?"linear-gradient(135deg,#1a237e,#1565c0)":"#e0e0e0",
                      color:!processing?"#fff":"#9e9e9e",
                      boxShadow:!processing?"0 4px 18px rgba(26,35,126,.35)":"none",
                      cursor:!processing?"pointer":"default",transition:"all .2s"}}
                    onClick={processAndSave} disabled={processing}>
                    {processing ? `⏳ ${saveMsg}` : `💾 1200px 압축 + 워터마크 + 저장 (${photoData.length}장)`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 (done) 제거 — 저장 완료 후 자동 리셋 */}

        </div>
      </div>
    </>
  );
}

const S = {
  root:     { display: "flex", flexDirection: "column", height: "100vh", background: "#f0f4f8", fontFamily: "'Noto Sans KR',sans-serif", overflow: "hidden" },
  hdr:      { background: "#1a237e", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  hdrLeft:  { display: "flex", alignItems: "center", gap: 12 },
  hdrLogo:  { width: 36, height: 36, background: "rgba(255,255,255,.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  hdrTitle: { fontSize: 15, fontWeight: 700, color: "#fff" },
  hdrSub:   { fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 1 },
  body:     { flex: 1, overflow: "auto" },
  stepWrap: { maxWidth: 720, margin: "0 auto", padding: 24 },
  stepCard: { background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 2px 16px rgba(0,0,0,.07)" },
  stepTitle:{ fontSize: 16, fontWeight: 900, color: "#1a237e", marginBottom: 8 },
  stepDesc: { fontSize: 13, color: "#78909c", marginBottom: 16, lineHeight: 1.6 },
  label:    { fontSize: 12, color: "#78909c", fontWeight: 700, marginBottom: 5 },
  labelSub: { color: "#b0bec5", fontWeight: 500 },
  input:    { width: "100%", border: "1.5px solid #c5cae9", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontFamily: "'Noto Sans KR',sans-serif", outline: "none", color: "#37474f", boxSizing: "border-box" },
  dropZone: { display: "block", border: "2.5px dashed #90caf9", borderRadius: 16, padding: "36px 20px", textAlign: "center", cursor: "pointer", background: "#f3f8ff", marginBottom: 16 },
  thumbGrid:{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 },
  thumbItem:{ position: "relative", width: 100 },
  thumbImg: { width: 100, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #e0e0e0", display: "block" },
  thumbName:{ fontSize: 9, color: "#78909c", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
