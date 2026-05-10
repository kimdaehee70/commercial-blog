// 📁 저장 위치: D:\clinic-blog\clinic-blog\components\WatermarkTab.jsx

import { useState, useRef, useEffect, useCallback } from "react";
import {
  WM_PRESETS,
  WM_POSITIONS,
  WM_TEXT_DEFAULT,
  drawWatermarkOnCanvas,
} from "../lib/watermark";

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload  = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function todayStamp() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  const ss = String(d.getSeconds()).padStart(2,"0");
  return `${yy}${mm}${dd}-${hh}${mi}${ss}`;
}

// ── localStorage 헬퍼 (컴포넌트 밖 — SSR 안전) ──────────────
function getLS(key, def) {
  try { if (typeof window === "undefined") return def; return window.localStorage.getItem(key) || def; }
  catch(e) { return def; }
}
function setLS(key, val) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(key, String(val)); } catch(e) {}
}
function delLS(key) {
  try { if (typeof window !== "undefined") window.localStorage.removeItem(key); } catch(e) {}
}

export default function WatermarkTab() {

  const [photos,        setPhotos]        = useState([]);
  const [previewIdx,    setPreviewIdx]    = useState(0);
  const [processing,    setProcessing]    = useState(false);
  const [saveMsg,       setSaveMsg]       = useState("");
  const [saveStatus,    setSaveStatus]    = useState("");
  const [progress,      setProgress]      = useState(0);

  const [wmStyle,       setWmStyle]       = useState("dark");
  const [wmPosition,    setWmPosition]    = useState("bottom-center");
  const [wmText,        setWmText]        = useState("전체내용은\nclinic.blog");
  const [wmTextEditing, setWmTextEditing] = useState(false);
  const [wmOpacity,     setWmOpacity]     = useState(55);
  const [logoSrc,       setLogoSrc]       = useState(null);
  const [logoImg,       setLogoImg]       = useState(null);

  // ── 마운트 시 localStorage에서 모든 설정 복원 ──
  useEffect(() => {
    setWmStyle(getLS("wm_style", "dark"));
    setWmPosition(getLS("wm_position", "bottom-center"));
    const savedText = getLS("wm_text", "전체내용은\nclinic.blog");
    setWmText(savedText.replace(/\\n/g, "\n"));
    setWmOpacity(Number(getLS("wm_opacity", "55")) || 55);
    const savedLogo = getLS("wm_logo", null);
    if (savedLogo) {
      setLogoSrc(savedLogo);
      const img = new Image();
      img.onload = () => setLogoImg(img);
      img.src = savedLogo;
    }
  }, []); // 마운트 1회만

  // ── logoSrc 변경 시 Image 객체 복원 + 저장 ──
  const logoInitRef = useRef(true);
  useEffect(() => {
    if (logoInitRef.current) { logoInitRef.current = false; return; }
    if (!logoSrc) { setLogoImg(null); delLS("wm_logo"); return; }
    const img = new Image();
    img.onload = () => setLogoImg(img);
    img.onerror = () => { setLogoSrc(null); setLogoImg(null); };
    img.src = logoSrc;
    setLS("wm_logo", logoSrc);
  }, [logoSrc]);

  // ── 기타 설정 자동 저장 ──
  useEffect(() => { setLS("wm_style",    wmStyle);         }, [wmStyle]);
  useEffect(() => { setLS("wm_position", wmPosition);      }, [wmPosition]);
  useEffect(() => { setLS("wm_text",     wmText);          }, [wmText]);
  useEffect(() => { setLS("wm_opacity",  String(wmOpacity)); }, [wmOpacity]);

  const [folderName,    setFolderName]    = useState(`${todayStamp()}`);
  const [folderEditing, setFolderEditing] = useState(false);
  const [infoOpen,  setInfoOpen]  = useState(false);

  const fileInputRef = useRef();
  const canvasRef    = useRef();

  const handleFiles = useCallback(async (rawFiles) => {
    const arr = Array.from(rawFiles).filter(f => f.type.startsWith("image/"));
    const items = await Promise.all(arr.map(async (file, i) => ({
      id: Date.now() + i, file, name: file.name,
      preview: await fileToDataUrl(file), resultDataUrl: null, originalPreview: null,
    })));
    // input value 리셋 (같은 파일 재선택 가능)
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhotos(prev => [...prev, ...items]);
    setSaveMsg(""); setSaveStatus(""); setProgress(0);
  }, []);

  const renderPreview = useCallback(async (idx) => {
    const canvas = canvasRef.current;
    if (!canvas || !photos[idx]) return;
    const img  = await loadImage(photos[idx].preview);
    const maxW = canvas.parentElement?.clientWidth - 32 || 560;
    const maxH = Math.round(maxW * 0.6);
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    ctx.save(); ctx.globalAlpha = wmOpacity / 100;
    drawWatermarkOnCanvas(ctx, w, h, { wmStyle, wmText, wmPosition, logoImg });
    ctx.restore();
  }, [photos, wmStyle, wmText, wmPosition, wmOpacity, logoImg]);

  useEffect(() => {
    if (photos.length > 0) renderPreview(previewIdx);
  }, [previewIdx, wmStyle, wmText, wmPosition, wmOpacity, photos, logoImg]);

  const processAndSave = async () => {
    if (!photos.length) return;

    // ① 클릭 직후 즉시 폴더 선택 — 브라우저 user gesture 요건
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite", startIn: "pictures" });
    } catch (err) {
      if (err.name !== "AbortError") { setSaveStatus("error"); setSaveMsg("❌ 폴더 선택 오류: " + err.message); }
      return;
    }

    // ② 폴더 선택 후 이미지 처리 (5장 배치)
    setProcessing(true); setSaveMsg("처리 중..."); setSaveStatus(""); setProgress(0);
    const updated = [];
    const BATCH = 5;
    for (let b = 0; b < photos.length; b += BATCH) {
      const batch = photos.slice(b, b + BATCH);
      setSaveMsg(`처리 중... (${Math.min(b + BATCH, photos.length)} / ${photos.length})`);
      const results = await Promise.all(batch.map(async (f) => {
        const src = f.originalPreview || f.preview;
        const img = await loadImage(src);
        const maxW = 1200;
        let outW = img.width, outH = img.height;
        if (outW > maxW) { outH = Math.round(outH * maxW / outW); outW = maxW; }
        const c = document.createElement("canvas");
        c.width = outW; c.height = outH;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, outW, outH);
        ctx.save(); ctx.globalAlpha = wmOpacity / 100;
        drawWatermarkOnCanvas(ctx, outW, outH, { wmStyle, wmText, wmPosition, logoImg });
        ctx.restore();
        return { ...f, resultDataUrl: c.toDataURL("image/jpeg", 0.88), originalPreview: f.originalPreview || f.preview };
      }));
      updated.push(...results);
    }
    setPhotos(updated);

    // ③ 저장
    try {
      const finalFolder = folderName.trim() || `${todayStamp()}`;
      // 폴더 중복 방지 — 존재하면 _2, _3 ... 으로 새 폴더 생성
      let uniqueFolder = finalFolder;
      let sfx = 2;
      while (true) {
        try { await dirHandle.getDirectoryHandle(uniqueFolder, { create: false }); uniqueFolder = `${finalFolder}_${sfx++}`; }
        catch { break; }
      }
      const subDir = await dirHandle.getDirectoryHandle(uniqueFolder, { create: true });
      for (let i = 0; i < updated.length; i++) {
        const f = updated[i];
        const blob = await fetch(f.resultDataUrl).then(r => r.blob());
        const fh = await subDir.getFileHandle(f.name, { create: true });
        const wr = await fh.createWritable();
        await wr.write(blob); await wr.close();
        const pct = Math.round(((i+1)/updated.length)*100);
        setProgress(pct);
        setSaveMsg(`저장 중... (${i+1} / ${updated.length})`);
      }
      setSaveStatus("done");
      setSaveMsg(`✅ ${updated.length}장 저장 완료! → 📁 ${uniqueFolder}`);
      // 2초 후 완전 리셋 → 바로 새 작업 가능 (로고는 유지)
      setTimeout(() => {
        setPhotos([]); setSaveMsg(""); setSaveStatus(""); setProgress(0);
        setPreviewIdx(0); setFolderName(todayStamp());
        setProcessing(false);
        // logoSrc / logoImg 는 초기화 안 함 — 다음 작업에도 계속 유지
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 2000);
    } catch (err) {
      setSaveStatus("error"); setSaveMsg("❌ 저장 오류: " + err.message);
    } finally { setProcessing(false); }
  };

  return (
    <div style={{ fontFamily:"'Noto Sans KR',sans-serif" }}>

      {/* ── 헤더 ── */}
      <div style={S.header}>
        <div>
          <div style={{ fontSize:17, fontWeight:800 }}>💧 워터마크</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", marginTop:2 }}>
            사진 업로드 → 스타일·위치·텍스트 설정 → 저장
          </div>
        </div>
        {photos.length > 0 && (
          <div style={{ fontSize:12, color:"rgba(255,255,255,.9)", fontWeight:700, background:"rgba(255,255,255,.15)", borderRadius:20, padding:"4px 14px" }}>
            📎 {photos.length}장
          </div>
        )}
      </div>

      {/* ── 2열 본문 ── */}
      <div style={S.body}>

        {/* ════ 왼쪽: 사진 업로드 + 폴더명 + 저장 ════ */}
        <div style={S.left}>

          {/* 사진 업로드 */}
          <div style={S.card}>
            <div style={{...S.cardTitle, marginBottom:12}}>📷 사진 업로드 <span style={S.greenBadge}>최대 30장</span></div>
            <label style={S.dropZone}
              onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
              onDragOver={e=>e.preventDefault()}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
              <div style={{fontSize:22,marginBottom:3}}>🖼️</div>
              <div style={{fontSize:12,fontWeight:700,color:"#37474f"}}>드래그 또는 클릭해서 추가</div>
              <div style={{fontSize:10,color:"#90a4ae",marginTop:2}}>JPG · PNG · WEBP</div>
            </label>

            {photos.length > 0 && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:11,color:"#78909c",fontWeight:600}}>{photos.length}장 선택됨</span>
                  <button onClick={()=>{setPhotos([]);setSaveMsg("");setProgress(0);}} style={S.delBtn}>🗑️ 전체 삭제</button>
                </div>
                <div style={S.thumbGrid}>
                  {photos.map((f,i)=>(
                    <div key={f.id} style={S.thumbItem}>
                      <img src={f.preview} alt="" onClick={()=>setPreviewIdx(i)}
                        style={{...S.thumbImg, border: previewIdx===i?"2.5px solid #1a237e":"1.5px solid #e0e0e0"}} />
                      {f.resultDataUrl && <div style={S.savedBadge}>✓</div>}
                      <button style={S.thumbDel} onClick={()=>setPhotos(p=>p.filter(x=>x.id!==f.id))}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 저장 폴더명 */}
          <div style={S.card}>
            <div style={S.cardTitle}>📁 저장 폴더명</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              {folderEditing
                ? <input value={folderName} onChange={e=>setFolderName(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&setFolderEditing(false)}
                    style={{flex:1,padding:"7px 10px",border:"1.5px solid #1a237e",borderRadius:8,fontSize:12,
                      fontFamily:"'Noto Sans KR',sans-serif",outline:"none",color:"#37474f"}} />
                : <div style={{flex:1,padding:"7px 10px",background:"#f5f5f5",borderRadius:8,fontSize:12,
                    color:"#37474f",border:"1.5px solid #e0e0e0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {folderName}
                  </div>
              }
              <button onClick={()=>setFolderEditing(v=>!v)} style={{...S.smallBtn,padding:"6px 10px"}}>
                {folderEditing?"✓ 확인":"✏️ 수정"}
              </button>
              <button onClick={()=>{setFolderName(`${todayStamp()}`);setFolderEditing(false);}}
                style={{...S.smallBtn,padding:"6px 10px"}}>↩</button>
            </div>
            <div style={{fontSize:10,color:"#90a4ae"}}>💡 저장 시 선택한 위치에 이 폴더가 자동 생성됩니다</div>
          </div>

          {/* 저장 버튼 — 하단 고정 파란색 */}
          <div style={{position:"sticky",bottom:0,left:0,right:0,padding:"14px 0 4px",background:"linear-gradient(to top,#fff 80%,transparent)",marginTop:16,zIndex:10}}>
            <button
              style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:photos.length&&!processing?"pointer":"default",fontFamily:"'Noto Sans KR',sans-serif",fontSize:15,fontWeight:900,letterSpacing:".03em",
                background:photos.length&&!processing?"linear-gradient(135deg,#1a237e,#1565c0)":"#e0e0e0",
                color:photos.length&&!processing?"#fff":"#9e9e9e",
                boxShadow:photos.length&&!processing?"0 4px 18px rgba(26,35,126,.35)":"none",
                transition:"all .2s"}}
              onClick={processAndSave} disabled={!photos.length||processing}>
              {processing?`⏳ ${saveMsg}`:`💾 저장하기 (${photos.length}장)`}
            </button>
          </div>

          {/* 진행률 바 */}
          {processing && (
            <div style={{marginTop:8}}>
              <div style={{height:6,background:"#e0e0e0",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#1a237e,#1565c0)",
                  borderRadius:3,transition:"width .2s"}} />
              </div>
              <div style={{fontSize:10,color:"#78909c",marginTop:2,textAlign:"right"}}>{progress}%</div>
            </div>
          )}

          {saveMsg && !processing && (
            <div style={{fontSize:12,fontWeight:700,marginTop:8,padding:"10px 14px",borderRadius:10,textAlign:"center",
              background:saveStatus==="done"?"#e8f5e9":saveStatus==="error"?"#ffebee":"#f3f8ff",
              border:`1.5px solid ${saveStatus==="done"?"#81c784":saveStatus==="error"?"#ef9a9a":"#90caf9"}`,
              color:saveStatus==="done"?"#2e7d32":saveStatus==="error"?"#c62828":"#1565c0"}}>
              {saveMsg}{saveStatus==="done" && " 잠시 후 초기화됩니다..."}
            </div>
          )}

        </div>

        {/* ════ 오른쪽: 워터마크 설정 위 + 미리보기 아래 ════ */}
        <div style={S.right}>

          {/* ── 워터마크 설정 + 꼬리표 (상단) ── */}
          <div style={{...S.card, marginBottom:10}}>

            {/* 꼬리표 버튼 */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",marginBottom:infoOpen?0:8}}>
              <button onClick={()=>setInfoOpen(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:4,padding:"4px 12px",border:"1.5px solid #c5cae9",borderRadius:infoOpen?"8px 8px 0 0":"8px",background:infoOpen?"#e8eaf6":"#f8f9ff",color:"#3949ab",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif",transition:"all .15s"}}>
                {infoOpen ? "▲ 닫기" : "❓ 워터마크가 왜 필요한가요?"}
              </button>
            </div>

            {/* 꼬리표 안내 패널 */}
            {infoOpen && (
              <div style={{marginBottom:14,border:"1.5px solid #c5cae9",borderRadius:"0 8px 8px 8px",background:"#f8f9ff",padding:"14px 16px",fontSize:12,lineHeight:1.8,color:"#37474f"}}>
                <div style={{fontWeight:800,color:"#1a237e",marginBottom:8,fontSize:13}}>📌 워터마크가 필요한 이유</div>
                <div style={{marginBottom:10}}>
                  <div style={{fontWeight:700,color:"#3949ab",marginBottom:4}}>💧 저작권 보호</div>
                  <div style={{color:"#546e7a"}}>블로그에 올린 사진은 누구나 다운로드할 수 있습니다. 워터마크가 없으면 내 사진이 무단으로 사용되어도 알 수 없습니다.</div>
                  <div style={{color:"#546e7a",marginTop:4}}>워터마크를 넣으면 <span style={{fontWeight:700,color:"#1a237e"}}>출처가 명확해지고 무단 사용을 억제</span>하는 효과가 있습니다.</div>
                </div>
                <div style={{borderTop:"1px solid #e0e0e0",paddingTop:10,marginBottom:10}}>
                  <div style={{fontWeight:700,color:"#3949ab",marginBottom:4}}>📣 브랜딩 효과</div>
                  <div style={{color:"#546e7a"}}>사진이 공유되거나 퍼져나갈 때 워터마크가 자연스럽게 홍보 역할을 합니다.</div>
                  <div style={{color:"#546e7a",marginTop:4}}><span style={{background:"#e8f5e9",color:"#2e7d32",borderRadius:4,padding:"1px 6px",fontWeight:700}}>clinic.blog</span> 처럼 URL을 넣으면 사진을 본 사람이 직접 찾아올 수 있습니다.</div>
                </div>
                <div style={{borderTop:"1px solid #e0e0e0",paddingTop:10}}>
                  <div style={{fontWeight:700,color:"#3949ab",marginBottom:4}}>🔍 네이버 블로그 SEO</div>
                  <div style={{color:"#546e7a"}}>워터마크 텍스트에 키워드나 URL이 포함되면 이미지가 검색될 때 브랜드 인지도가 함께 올라갑니다.</div>
                </div>
                <div style={{marginTop:10,background:"#e8eaf6",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#3949ab",fontWeight:700}}>
                  💡 스타일·위치·투명도를 조절해서 사진을 방해하지 않는 자연스러운 워터마크를 만들어보세요.
                </div>
              </div>
            )}

            {/* 워터마크 설정 — 고정/수정 방식 */}
            <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,alignItems:"start",marginBottom:14}}>

                  {/* 열1: 스타일 */}
                  <div>
                    <div style={S.optLabel}>🎨 배경 테마</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                      {WM_PRESETS.map(p=>{
                        const colors={dark:"#1a1a2e",blue:"#0d47a1",white:"#e8eaf6",gold:"#3e2800",red:"#b71c1c",green:"#1b5e20"};
                        const textColors={dark:"#FFD54F",blue:"#fff",white:"#1a237e",gold:"#FFD54F",red:"#fff",green:"#fff"};
                        const sel=wmStyle===p.id;
                        return(
                          <label key={p.id} style={{display:"flex",alignItems:"center",gap:6,
                            padding:"6px 8px",borderRadius:9,cursor:"pointer",
                            border:`2px solid ${sel?"#1a237e":"#e0e0e0"}`,
                            background:sel?colors[p.id]||"#e8eaf6":colors[p.id]||"#fafafa",
                            opacity:sel?1:0.7}}>
                            <input type="radio" name="wmStyle" value={p.id} checked={sel}
                              onChange={()=>setWmStyle(p.id)} style={{accentColor:"#fff",flexShrink:0}} />
                            <div style={{fontWeight:800,fontSize:11,color:sel?textColors[p.id]||"#fff":"#555"}}>{p.label}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 열2: 위치 + 불투명도 */}
                  <div>
                    <div style={S.optLabel}>📍 위치</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,marginBottom:12}}>
                      {WM_POSITIONS.map(pos=>(
                        <button key={pos.id} onClick={()=>setWmPosition(pos.id)} style={{
                          padding:"4px 2px",fontSize:10,fontWeight:700,borderRadius:7,cursor:"pointer",border:"1.5px solid",
                          borderColor:wmPosition===pos.id?"#1a237e":"#e0e0e0",
                          background:wmPosition===pos.id?"#e8eaf6":"#fafafa",
                          color:wmPosition===pos.id?"#1a237e":"#78909c"}}>
                          {pos.label}
                        </button>
                      ))}
                    </div>
                    <div style={S.optLabel}>🌫️ 불투명도 <span style={{color:"#1a237e",fontWeight:800}}>{wmOpacity}%</span> <span style={{color:"#43a047",fontSize:9,fontWeight:600}}>✅ 네이버 권장 40~65%</span></div>
                    <input type="range" min={20} max={80} step={5} value={wmOpacity}
                      onChange={e=>setWmOpacity(Number(e.target.value))}
                      style={{width:"100%",accentColor:"#1a237e"}} />
                  </div>

                  {/* 열3: 로고 + 텍스트 */}
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{marginBottom:6}}>
                      <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
                        border:`2px solid ${logoSrc?"#43a047":"#1a237e"}`,borderRadius:10,
                        background:logoSrc?"#f1f8e9":"#e8eaf6",cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif",
                        boxShadow:logoSrc?"0 2px 8px rgba(67,160,71,.2)":"0 2px 8px rgba(26,35,126,.15)"}}>
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                          const file=e.target.files?.[0];
                          e.target.value = ""; // ← 같은 파일 재선택 가능하도록 리셋
                          if(!file) return;
                          // 로고를 200x200으로 축소 후 저장 (localStorage 용량 초과 방지)
                          const reader=new FileReader();
                          reader.onload=ev=>{
                            const raw=ev.target.result;
                            const tmpImg=new Image();
                            tmpImg.onload=()=>{
                              const c=document.createElement("canvas");
                              const MAX=200;
                              let w=tmpImg.width, h=tmpImg.height;
                              if(w>MAX||h>MAX){ const r=Math.min(MAX/w,MAX/h); w=Math.round(w*r); h=Math.round(h*r); }
                              c.width=w; c.height=h;
                              c.getContext("2d").drawImage(tmpImg,0,0,w,h);
                              const compressed=c.toDataURL("image/png",0.85);
                              setLogoSrc(compressed);
                              const img=new Image();
                              img.onload=()=>setLogoImg(img);
                              img.src=compressed;
                            };
                            tmpImg.src=raw;
                          };
                          reader.readAsDataURL(file);
                        }} />
                        {logoSrc
                          ? <><img src={logoSrc} style={{width:36,height:36,borderRadius:6,objectFit:"contain",flexShrink:0}} alt="logo"/>
                              <div>
                                <div style={{fontSize:12,fontWeight:800,color:"#2e7d32"}}>✅ 나의 로고 적용됨</div>
                                <div style={{fontSize:10,color:"#66bb6a"}}>클릭하여 다른 로고로 변경</div>
                              </div></>
                          : <><span style={{fontSize:28,flexShrink:0}}>🖼️</span>
                              <div>
                                <div style={{fontSize:13,fontWeight:800,color:"#1a237e"}}>나의 로고 사용하기</div>
                                <div style={{fontSize:10,color:"#5c6bc0"}}>PNG · JPG · SVG — 클릭하여 첨부</div>
                              </div></>
                        }
                      </label>
                      {logoSrc && <button onClick={()=>{setLogoSrc(null);setLogoImg(null);}}
                        style={{marginTop:4,fontSize:10,color:"#c62828",background:"none",border:"none",cursor:"pointer",fontWeight:700}}>✕ 로고 제거 (기본 🎪 사용)</button>}
                    </div>
                    <div style={S.optLabel}>✏️ 워터마크 내용</div>
                    <textarea value={wmText} onChange={e=>setWmText(e.target.value)}
                      style={{...S.textArea,minHeight:60}} />
                    <div style={{marginTop:4,padding:"5px 8px",background:"#fff8e1",borderRadius:6,
                      border:"1px solid #ffe082",fontSize:10,color:"#795548",lineHeight:1.6}}>
                      💡 <strong>줄바꿈(Enter)</strong>으로 2줄 입력 · <strong>스페이스바</strong>로 글자 간격 조정
                    </div>
                  </div>

                </div>


              </div>
          </div>

          {/* ── 미리보기 (하단) ── */}
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={S.cardTitle}>🔍 실시간 미리보기</div>
              {photos.length > 0 && (
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>setPreviewIdx(i=>Math.max(0,i-1))}
                    style={{...S.ghostBtn,padding:"4px 12px",fontSize:11}} disabled={previewIdx===0}>← 이전</button>
                  <span style={{fontSize:11,color:"#78909c",fontWeight:600,minWidth:60,textAlign:"center"}}>
                    {previewIdx+1} / {photos.length}
                  </span>
                  <button onClick={()=>setPreviewIdx(i=>Math.min(photos.length-1,i+1))}
                    style={{...S.ghostBtn,padding:"4px 12px",fontSize:11}} disabled={previewIdx===photos.length-1}>다음 →</button>
                </div>
              )}
            </div>

            {photos.length === 0 ? (
              <div style={S.emptyPreview}>
                <div style={{fontSize:48}}>🖼️</div>
                <div style={{fontWeight:700,color:"#78909c",marginTop:10}}>사진을 업로드하면 미리보기가 표시됩니다</div>

              </div>
            ) : (
              <>
                {/* 파일명 */}
                <div style={{fontSize:11,color:"#78909c",marginBottom:8,fontWeight:600}}>
                  {photos[previewIdx]?.name}
                  {photos[previewIdx]?.resultDataUrl && <span style={{color:"#2e7d32",marginLeft:8}}>✓ 저장됨</span>}
                </div>
                {/* 캔버스 */}
                <canvas ref={canvasRef}
                  style={{width:"100%",borderRadius:10,border:"1px solid #e0e0e0",display:"block",marginBottom:10}} />
                {/* 썸네일 */}
                <div style={{display:"flex",gap:5,flexWrap:"wrap",maxHeight:72,overflowY:"auto"}}>
                  {photos.map((f,i)=>(
                    <img key={f.id} src={f.preview} alt="" onClick={()=>setPreviewIdx(i)}
                      style={{width:46,height:36,objectFit:"cover",borderRadius:6,cursor:"pointer",
                        border:previewIdx===i?"2.5px solid #1a237e":"2px solid #e0e0e0",
                        opacity:f.resultDataUrl?1:0.75}} />
                  ))}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const S = {
  header:{background:"linear-gradient(135deg,#1a237e,#1565c0)",borderRadius:14,padding:"11px 18px",color:"#fff",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"},
  body:{display:"grid",gridTemplateColumns:"220px 1fr",gap:12},
  left:{display:"flex",flexDirection:"column",gap:10},
  right:{display:"flex",flexDirection:"column",gap:0},
  card:{background:"#fff",borderRadius:14,padding:14,boxShadow:"0 1px 8px rgba(0,0,0,.06)"},
  cardTitle:{fontSize:12,fontWeight:800,color:"#1a237e",marginBottom:10},
  greenBadge:{background:"#e8f5e9",color:"#2e7d32",borderRadius:6,padding:"1px 7px",fontSize:10,marginLeft:5,fontWeight:700},
  infoBadge:{background:"#e8eaf6",color:"#3949ab",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600},
  dropZone:{display:"block",border:"2px dashed #90caf9",borderRadius:12,padding:"12px 10px",textAlign:"center",cursor:"pointer",background:"#f3f8ff",marginBottom:8},
  thumbGrid:{display:"flex",flexWrap:"wrap",gap:6},
  thumbItem:{position:"relative",width:58},
  thumbImg:{width:58,height:46,objectFit:"cover",borderRadius:7,display:"block",cursor:"pointer"},
  savedBadge:{position:"absolute",top:2,left:2,fontSize:9,background:"#2e7d32",color:"#fff",borderRadius:3,padding:"1px 3px",fontWeight:700},
  thumbDel:{position:"absolute",top:-5,right:-5,width:15,height:15,borderRadius:"50%",background:"#ffcdd2",border:"none",cursor:"pointer",fontSize:9,color:"#c62828",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"},
  delBtn:{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,border:"1.5px solid #ffcdd2",background:"#fff3f3",color:"#c62828",cursor:"pointer"},
  optLabel:{fontSize:10,fontWeight:700,color:"#90a4ae",letterSpacing:".06em",marginBottom:5},
  smallBtn:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:6,border:"1px solid #e0e0e0",background:"#fafafa",color:"#78909c",cursor:"pointer"},
  textArea:{width:"100%",padding:"7px 9px",border:"1.5px solid #1a237e",borderRadius:8,fontSize:11,fontFamily:"'Noto Sans KR',sans-serif",color:"#37474f",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6},
  textPreview:{padding:"7px 9px",background:"#f5f5f5",borderRadius:8,fontSize:11,color:"#37474f",lineHeight:1.7,whiteSpace:"pre-line",border:"1.5px solid #e0e0e0"},
  primaryBtn:{width:"100%",padding:"12px 0",background:"linear-gradient(135deg,#1a237e,#1565c0)",border:"none",borderRadius:11,color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif",boxShadow:"0 3px 12px rgba(26,35,126,.25)"},
  ghostBtn:{padding:"8px 14px",background:"#fff",border:"1.5px solid #e0e0e0",borderRadius:9,color:"#546e7a",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Sans KR',sans-serif"},
  emptyPreview:{minHeight:160,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#b0bec5"},
};
