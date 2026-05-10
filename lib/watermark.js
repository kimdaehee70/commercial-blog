// 📁 저장 위치: D:\banjang-blog\banjang-blog\lib\watermark.js
// v2.0 — 15종 워터마크 (5카테고리) + 9위치 + 로고 지원
//   ① 친근형 (반장닷컴·유치원·체험)        — 3종
//   ② 신뢰형 (병원·기관·전문직)             — 3종
//   ③ 럭셔리형 (성형·피부·한의원·고급카페)  — 3종
//   ④ 미니멀형 (사진 강조)                  — 2종
//   ⑤ 워시형 (인스타 스타일)                — 1종
//   ⑥ 명함형 (지역 영업·병원·학원·부동산)   — 3종

export const WM_TEXT_DEFAULT = "내 가게 이름\n010-0000-0000";

// ── 위치 계산 헬퍼 ────────────────────────────────────────────
export function getWmOrigin(position, cw, ch, boxW, boxH, mg) {
  switch (position) {
    case "top-left":      return { x: mg,            y: mg };
    case "top-center":    return { x: cw/2 - boxW/2, y: mg };
    case "top-right":     return { x: cw - boxW - mg,y: mg };
    case "middle-left":   return { x: mg,            y: ch/2 - boxH/2 };
    case "center":        return { x: cw/2 - boxW/2, y: ch/2 - boxH/2 };
    case "middle-right":  return { x: cw - boxW - mg,y: ch/2 - boxH/2 };
    case "bottom-left":   return { x: mg,            y: ch - boxH - mg };
    case "bottom-center": return { x: cw/2 - boxW/2, y: ch - boxH - mg };
    case "bottom-right":  return { x: cw - boxW - mg,y: ch - boxH - mg };
    default:              return { x: cw/2 - boxW/2, y: ch - boxH - mg };
  }
}

// ── 위치 목록 (UI용) ──────────────────────────────────────────
export const WM_POSITIONS = [
  { id: "top-left",     label: "↖ 좌상" },
  { id: "top-center",   label: "↑ 중상" },
  { id: "top-right",    label: "↗ 우상" },
  { id: "middle-left",  label: "← 중좌" },
  { id: "center",       label: "⊙ 중앙" },
  { id: "middle-right", label: "→ 중우" },
  { id: "bottom-left",  label: "↙ 좌하" },
  { id: "bottom-center",label: "↓ 중하" },
  { id: "bottom-right", label: "↘ 우하" },
];

// ── 카테고리 정의 (UI 그룹핑용) ──────────────────────────────
export const WM_CATEGORIES = [
  { id: "friendly",  label: "🎈 친근형",   desc: "체험·유치원" },
  { id: "trust",     label: "🏥 신뢰형",   desc: "병원·기관" },
  { id: "luxury",    label: "💎 럭셔리형", desc: "성형·피부" },
  { id: "minimal",   label: "📝 미니멀형", desc: "사진 강조" },
  { id: "wash",      label: "🎨 워시형",   desc: "인스타" },
  { id: "card",      label: "📞 명함형",   desc: "영업 강조" },
];

// 공통 — 둥근 박스 path
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function splitLines(text) {
  const lines = (text || "").split("\n");
  return {
    main: lines.length > 1 ? lines[1] : lines[0],
    sub:  lines.length > 1 ? lines[0] : "",
    all:  lines,
  };
}

// ─────────────────────────────────────────────────────────────
// ① 친근형 — 컬러 박스 + 둥근 모서리 (네이버 노출 기준)
// ─────────────────────────────────────────────────────────────
function drawFriendly(ctx, cw, ch, text, scale, pos, logoImg, theme, opts) {
  const { main, sub } = splitLines(text);
  const fsMain = 28 * scale;
  const fsSub  = 20 * scale;
  const noIcon = opts && opts.noIcon;
  // noIcon 모드(외부 로고): 다른 워터마크 박스와 비슷한 비례 갖도록 padding 확장
  const padX   = (noIcon ? 26 : 22) * scale;
  const padY   = (noIcon ? 22 : 18) * scale;
  const r      = 16 * scale;
  const mg     = 28 * scale;

  ctx.save();
  ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
  const mainW = ctx.measureText(main).width;
  ctx.font = `700 ${fsSub}px 'Noto Sans KR', sans-serif`;
  const subW  = sub ? ctx.measureText(sub).width : 0;
  const textW = Math.max(mainW, subW);

  const boxH = (sub ? fsSub * 1.55 + fsMain * 1.3 : fsMain * 1.3) + padY * 2;
  const logoBoxSz = boxH - padY * 0.6;
  const gap = 14 * scale;
  const hasLogo = !!logoImg;
  const emojiSz = 46 * scale;
  // noIcon 모드: 좌측 영역 없이 텍스트만
  const leftSlot = noIcon ? 0 : (hasLogo ? logoBoxSz : emojiSz);
  const leftGap = noIcon ? 0 : gap;
  const boxW = leftSlot + leftGap + textW + padX * 2;

  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, boxW, boxH, mg);

  const grad = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
  grad.addColorStop(0, theme.bg[0]);
  grad.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 16 * scale;
  roundRect(ctx, bx, by, boxW, boxH, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // 로고/이모지 (noIcon 모드일 땐 둘 다 안 그림)
  if (!noIcon) {
    if (hasLogo) {
      const lx = bx + padX;
      const ly = by + boxH/2 - logoBoxSz/2;
      const iw = logoImg.width || logoBoxSz;
      const ih = logoImg.height || logoBoxSz;
      const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
      const dw = iw * ratio;
      const dh = ih * ratio;
      ctx.drawImage(logoImg, lx + (logoBoxSz - dw) / 2, ly + (logoBoxSz - dh) / 2, dw, dh);
    } else {
      const ix = bx + padX + emojiSz / 2;
      const iy = by + boxH / 2;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.arc(ix, iy, emojiSz/2, 0, Math.PI*2); ctx.fill();
      ctx.font = `${emojiSz * 0.65}px serif`;
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(theme.emoji || "🎪", ix, iy);
    }
  }

  const tx = bx + padX + leftSlot + leftGap;
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 4*scale;
  ctx.textAlign = "left";
  if (sub) {
    ctx.font = `700 ${fsSub}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.subColor;
    ctx.textBaseline = "top";
    ctx.fillText(sub, tx, by + padY);
    ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.mainColor;
    ctx.shadowBlur = 6*scale;
    ctx.fillText(main, tx, by + padY + fsSub * 1.55);
  } else {
    ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.mainColor;
    ctx.textBaseline = "middle";
    ctx.fillText(main, tx, by + boxH / 2);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ② 신뢰형 — 단정한 박스 + 로고 (네이버 노출 기준)
// ─────────────────────────────────────────────────────────────
function drawTrust(ctx, cw, ch, text, scale, pos, logoImg, theme) {
  const { main, sub } = splitLines(text);
  const fsMain = 28 * scale;
  const fsSub  = 20 * scale;
  const padX   = 20 * scale;
  const padY   = 14 * scale;
  const r      = 6 * scale;
  const mg     = 26 * scale;

  ctx.save();
  ctx.font = `800 ${fsMain}px 'Noto Sans KR', sans-serif`;
  const mainW = ctx.measureText(main).width;
  ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
  const subW  = sub ? ctx.measureText(sub).width : 0;
  const textW = Math.max(mainW, subW);

  const boxH = (sub ? fsSub * 1.5 + fsMain * 1.25 : fsMain * 1.25) + padY * 2;
  const logoBoxSz = boxH - padY * 0.8;
  const gap = 12 * scale;
  const hasLogo = !!logoImg;
  const boxW = (hasLogo ? logoBoxSz + gap : 0) + textW + padX * 2;
  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, boxW, boxH, mg);

  ctx.fillStyle = theme.bg;
  ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 14 * scale;
  roundRect(ctx, bx, by, boxW, boxH, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  let textX = bx + padX;
  if (hasLogo) {
    const lx = bx + padX;
    const ly = by + boxH/2 - logoBoxSz/2;
    const iw = logoImg.width || logoBoxSz;
    const ih = logoImg.height || logoBoxSz;
    const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(logoImg, lx + (logoBoxSz-dw)/2, ly + (logoBoxSz-dh)/2, dw, dh);
    textX = bx + padX + logoBoxSz + gap;
  } else {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(bx, by, 5 * scale, boxH);
  }

  ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = 4*scale;
  ctx.textAlign = "left";
  if (sub) {
    ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.subColor;
    ctx.textBaseline = "top";
    ctx.fillText(sub, textX, by + padY);
    ctx.font = `800 ${fsMain}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.mainColor;
    ctx.fillText(main, textX, by + padY + fsSub * 1.5);
  } else {
    ctx.font = `800 ${fsMain}px 'Noto Sans KR', sans-serif`;
    ctx.fillStyle = theme.mainColor;
    ctx.textBaseline = "middle";
    ctx.fillText(main, textX, by + boxH / 2);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ③ 럭셔리형 — 박스 없음, 위아래 라인 + 로고
// ─────────────────────────────────────────────────────────────
function drawLuxury(ctx, cw, ch, text, scale, pos, logoImg, theme) {
  const { main, sub } = splitLines(text);
  const fsMain = 30 * scale;
  const fsSub  = 20 * scale;
  const padX   = 24 * scale;
  const padY   = 14 * scale;
  const mg     = 36 * scale;
  const lineW  = 2 * scale;

  ctx.save();
  const luxFontMain = `500 ${fsMain}px "Nanum Myeongjo", "Noto Serif KR", "Noto Sans KR", serif`;
  const luxFontSub  = `400 ${fsSub}px "Nanum Myeongjo", "Noto Serif KR", "Noto Sans KR", serif`;

  ctx.font = luxFontMain;
  const mainW = ctx.measureText(main).width;
  ctx.font = luxFontSub;
  const subW = sub ? ctx.measureText(sub).width : 0;
  const textW = Math.max(mainW, subW);

  const blockH = (sub ? fsSub * 1.6 + fsMain * 1.3 : fsMain * 1.3) + padY * 2;
  const logoBoxSz = blockH - padY;
  const gap = 14 * scale;
  const hasLogo = !!logoImg;
  const blockW = (hasLogo ? logoBoxSz + gap : 0) + textW + padX * 2;

  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, blockW, blockH, mg);

  ctx.strokeStyle = theme.line;
  ctx.lineWidth = lineW;
  ctx.beginPath();
  ctx.moveTo(bx, by);                ctx.lineTo(bx + blockW, by);
  ctx.moveTo(bx, by + blockH);       ctx.lineTo(bx + blockW, by + blockH);
  ctx.stroke();

  let textX = bx + padX;
  if (hasLogo) {
    const lx = bx + padX;
    const ly = by + blockH/2 - logoBoxSz/2;
    const iw = logoImg.width || logoBoxSz;
    const ih = logoImg.height || logoBoxSz;
    const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(logoImg, lx + (logoBoxSz-dw)/2, ly + (logoBoxSz-dh)/2, dw, dh);
    textX = bx + padX + logoBoxSz + gap;
  }

  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8*scale;
  ctx.textAlign = "left";

  if (sub) {
    ctx.font = luxFontSub;
    ctx.fillStyle = theme.subColor;
    ctx.textBaseline = "top";
    ctx.fillText(sub, textX, by + padY);
    ctx.font = luxFontMain;
    ctx.fillStyle = theme.mainColor;
    ctx.fillText(main, textX, by + padY + fsSub * 1.55);
  } else {
    ctx.font = luxFontMain;
    ctx.fillStyle = theme.mainColor;
    ctx.textBaseline = "middle";
    ctx.fillText(main, textX, by + blockH / 2);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ④ 미니멀형 — 텍스트만 + 로고 (네이버 노출 기준)
// ─────────────────────────────────────────────────────────────
function drawMinimal(ctx, cw, ch, text, scale, pos, logoImg, theme) {
  const { all } = splitLines(text);
  const fs = 26 * scale;
  const lh = fs * 1.5;
  const mg = 26 * scale;

  ctx.save();
  ctx.font = `700 ${fs}px 'Noto Sans KR', sans-serif`;
  const widths = all.map(l => ctx.measureText(l).width);
  const maxW = Math.max(...widths);
  const blockH = all.length * lh;
  const logoBoxSz = blockH;
  const gap = 12 * scale;
  const hasLogo = !!logoImg;
  const blockW = (hasLogo ? logoBoxSz + gap : 0) + maxW;

  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, blockW, blockH, mg);

  let textX = bx;
  if (hasLogo) {
    const lx = bx;
    const ly = by;
    const iw = logoImg.width || logoBoxSz;
    const ih = logoImg.height || logoBoxSz;
    const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(logoImg, lx + (logoBoxSz-dw)/2, ly + (logoBoxSz-dh)/2, dw, dh);
    textX = bx + logoBoxSz + gap;
  }

  ctx.shadowColor = theme.shadow;
  ctx.shadowBlur = 8 * scale;
  ctx.fillStyle = theme.color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  all.forEach((line, i) => {
    ctx.fillText(line, textX, by + i * lh);
  });
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ⑤ 워시형 — 반투명 흰색 텍스트 + 로고
// ─────────────────────────────────────────────────────────────
function drawWash(ctx, cw, ch, text, scale, pos, logoImg) {
  const { all } = splitLines(text);
  const fs = 24 * scale;
  const lh = fs * 1.55;
  const mg = 22 * scale;

  ctx.save();
  ctx.font = `600 ${fs}px 'Noto Sans KR', sans-serif`;
  const widths = all.map(l => ctx.measureText(l).width);
  const maxW = Math.max(...widths);
  const blockH = all.length * lh;
  const logoBoxSz = blockH;
  const gap = 12 * scale;
  const hasLogo = !!logoImg;
  const blockW = (hasLogo ? logoBoxSz + gap : 0) + maxW;

  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, blockW, blockH, mg);

  let textX = bx;
  if (hasLogo) {
    const lx = bx;
    const ly = by;
    const iw = logoImg.width || logoBoxSz;
    const ih = logoImg.height || logoBoxSz;
    const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(logoImg, lx + (logoBoxSz-dw)/2, ly + (logoBoxSz-dh)/2, dw, dh);
    textX = bx + logoBoxSz + gap;
  }

  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 10 * scale;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  all.forEach((line, i) => {
    ctx.fillText(line, textX, by + i * lh);
  });
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// ⑥ 명함형 — 박스 + 로고 (네이버 노출 기준)
// ─────────────────────────────────────────────────────────────
function drawCard(ctx, cw, ch, text, scale, pos, logoImg, theme) {
  const { all } = splitLines(text);
  const fsMain = 28 * scale;
  const fsSub  = 20 * scale;
  const padX   = 22 * scale;
  const padY   = 16 * scale;
  const r      = 10 * scale;
  const mg     = 28 * scale;
  const lh     = fsSub * 1.45;

  ctx.save();
  ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
  const mainLine = all[0] || "";
  const subLines = all.slice(1);

  const mainW = ctx.measureText(mainLine).width;
  ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
  const subWMax = subLines.length > 0
    ? Math.max(...subLines.map(l => ctx.measureText(l).width))
    : 0;
  const textW = Math.max(mainW, subWMax);

  const blockH = fsMain * 1.3 + (subLines.length > 0 ? subLines.length * lh + 8*scale : 0);
  const boxH = blockH + padY * 2;
  const logoBoxSz = boxH - padY * 0.8;
  const gap = 12 * scale;
  const hasLogo = !!logoImg;
  const boxW = (hasLogo ? logoBoxSz + gap : 0) + textW + padX * 2;

  const { x: bx, y: by } = getWmOrigin(pos, cw, ch, boxW, boxH, mg);

  const grad = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
  grad.addColorStop(0, theme.bg[0]);
  grad.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 16 * scale;
  roundRect(ctx, bx, by, boxW, boxH, r);
  ctx.fill();
  ctx.shadowBlur = 0;

  let textX = bx + padX;
  if (hasLogo) {
    const lx = bx + padX;
    const ly = by + boxH/2 - logoBoxSz/2;
    const iw = logoImg.width || logoBoxSz;
    const ih = logoImg.height || logoBoxSz;
    const ratio = Math.min(logoBoxSz / iw, logoBoxSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(logoImg, lx + (logoBoxSz-dw)/2, ly + (logoBoxSz-dh)/2, dw, dh);
    textX = bx + padX + logoBoxSz + gap;
  } else {
    ctx.fillStyle = theme.accent;
    ctx.fillRect(bx, by, 6 * scale, boxH);
  }

  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 4*scale;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = theme.mainColor;
  ctx.fillText(mainLine, textX, by + padY);

  ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
  ctx.fillStyle = theme.subColor;
  let cy = by + padY + fsMain * 1.3 + 6*scale;
  for (const line of subLines) {
    ctx.fillText(line, textX, cy);
    cy += lh;
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// 프리셋 정의 — 15종
// ─────────────────────────────────────────────────────────────
export const WM_PRESETS = [
  // ① 친근형 (3종)
  { id: "friendly-blue",  category: "friendly", label: "🎈 친근 블루",  shortLabel: "🔵",
    draw: (ctx,cw,ch,text,sc,pos,logo,opts) => drawFriendly(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(13,71,161,0.92)","rgba(33,150,243,0.92)"],
      border: "rgba(255,255,255,0.45)",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.85)",
      emoji: "🎪",
    }, opts)},
  { id: "friendly-green", category: "friendly", label: "🎈 친근 그린", shortLabel: "🟢",
    draw: (ctx,cw,ch,text,sc,pos,logo,opts) => drawFriendly(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(27,94,32,0.92)","rgba(76,175,80,0.92)"],
      border: "rgba(255,255,255,0.45)",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.85)",
      emoji: "🌱",
    }, opts)},
  { id: "friendly-orange", category: "friendly", label: "🎈 친근 오렌지", shortLabel: "🟠",
    draw: (ctx,cw,ch,text,sc,pos,logo,opts) => drawFriendly(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(230,81,0,0.92)","rgba(255,152,0,0.92)"],
      border: "rgba(255,255,255,0.45)",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.85)",
      emoji: "🎈",
    }, opts)},

  // ② 신뢰형 (3종)
  { id: "trust-navy", category: "trust", label: "🏥 신뢰 네이비", shortLabel: "🔷",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawTrust(ctx,cw,ch,text,sc,pos,logo, {
      bg: "rgba(13,27,62,0.92)",
      accent: "#42a5f5",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.78)",
    })},
  { id: "trust-gray", category: "trust", label: "🏥 신뢰 그레이", shortLabel: "⬛",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawTrust(ctx,cw,ch,text,sc,pos,logo, {
      bg: "rgba(38,50,56,0.92)",
      accent: "#90a4ae",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.75)",
    })},
  { id: "trust-white", category: "trust", label: "🏥 신뢰 화이트", shortLabel: "⬜",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawTrust(ctx,cw,ch,text,sc,pos,logo, {
      bg: "rgba(255,255,255,0.95)",
      accent: "#1565c0",
      mainColor: "#0d47a1", subColor: "#546e7a",
    })},

  // ③ 럭셔리형 (3종) — 박스 없음
  { id: "luxury-gold", category: "luxury", label: "💎 럭셔리 골드", shortLabel: "🟡",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawLuxury(ctx,cw,ch,text,sc,pos,logo, {
      line: "rgba(212,175,55,0.85)",
      mainColor: "#FFE082", subColor: "rgba(255,224,130,0.7)",
    })},
  { id: "luxury-black", category: "luxury", label: "💎 럭셔리 블랙", shortLabel: "⚫",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawLuxury(ctx,cw,ch,text,sc,pos,logo, {
      line: "rgba(255,255,255,0.7)",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.65)",
    })},
  { id: "luxury-white", category: "luxury", label: "💎 럭셔리 화이트", shortLabel: "⚪",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawLuxury(ctx,cw,ch,text,sc,pos,logo, {
      line: "rgba(0,0,0,0.65)",
      mainColor: "#000", subColor: "rgba(0,0,0,0.8)",
    })},

  // ④ 미니멀형 (2종)
  { id: "minimal-white", category: "minimal", label: "📝 미니멀 화이트", shortLabel: "⚪",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawMinimal(ctx,cw,ch,text,sc,pos,logo, {
      color: "rgba(255,255,255,0.95)",
      shadow: "rgba(0,0,0,0.7)",
    })},
  { id: "minimal-dark", category: "minimal", label: "📝 미니멀 다크", shortLabel: "⚫",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawMinimal(ctx,cw,ch,text,sc,pos,logo, {
      color: "#000",
      shadow: "rgba(255,255,255,0.85)",
    })},

  // ⑤ 워시형 (1종)
  { id: "wash-soft", category: "wash", label: "🎨 워시 소프트", shortLabel: "✨",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawWash(ctx,cw,ch,text,sc,pos,logo)},

  // ⑥ 명함형 (3종)
  { id: "card-navy", category: "card", label: "📞 명함 네이비", shortLabel: "🔷",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawCard(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(13,27,62,0.94)","rgba(26,42,80,0.94)"],
      accent: "#42a5f5",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.82)",
    })},
  { id: "card-dark", category: "card", label: "📞 명함 다크", shortLabel: "⚫",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawCard(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(15,15,15,0.94)","rgba(35,35,35,0.94)"],
      accent: "#FFD54F",
      mainColor: "#fff", subColor: "rgba(255,255,255,0.78)",
    })},
  { id: "card-white", category: "card", label: "📞 명함 화이트", shortLabel: "⚪",
    draw: (ctx,cw,ch,text,sc,pos,logo) => drawCard(ctx,cw,ch,text,sc,pos,logo, {
      bg: ["rgba(255,255,255,0.96)","rgba(245,247,250,0.96)"],
      accent: "#1565c0",
      mainColor: "#0d47a1", subColor: "#546e7a",
    })},
];

// ── 박스 크기 계산용 measure 헬퍼 ───────────────────────────
// 각 카테고리별 대략적 박스 크기 추정 (텍스트 기반)
function measureWmBox(ctx, category, text, scale) {
  const { main, sub, all } = splitLines(text);
  ctx.save();
  let boxW = 0, boxH = 0;
  if (category === "friendly") {
    // noIcon 모드용 padding (drawFriendly의 noIcon=true와 동일)
    const fsMain = 28*scale, fsSub = 20*scale, padX = 26*scale, padY = 22*scale;
    ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
    const mw = ctx.measureText(main).width;
    ctx.font = `700 ${fsSub}px 'Noto Sans KR', sans-serif`;
    const sw = sub ? ctx.measureText(sub).width : 0;
    const tw = Math.max(mw, sw);
    boxH = (sub ? fsSub*1.55 + fsMain*1.3 : fsMain*1.3) + padY*2;
    // 로고 외부 분리 모드: 이모지 영역 없이 텍스트 박스만
    boxW = tw + padX*2;
  } else if (category === "trust") {
    const fsMain = 28*scale, fsSub = 20*scale, padX = 20*scale, padY = 14*scale;
    ctx.font = `800 ${fsMain}px 'Noto Sans KR', sans-serif`;
    const mw = ctx.measureText(main).width;
    ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
    const sw = sub ? ctx.measureText(sub).width : 0;
    const tw = Math.max(mw, sw);
    boxH = (sub ? fsSub*1.5 + fsMain*1.25 : fsMain*1.25) + padY*2;
    boxW = tw + padX*2;
  } else if (category === "luxury") {
    const fsMain = 30*scale, fsSub = 20*scale, padX = 24*scale, padY = 14*scale;
    ctx.font = `500 ${fsMain}px "Nanum Myeongjo", "Noto Serif KR", "Noto Sans KR", serif`;
    const mw = ctx.measureText(main).width;
    ctx.font = `400 ${fsSub}px "Nanum Myeongjo", "Noto Serif KR", "Noto Sans KR", serif`;
    const sw = sub ? ctx.measureText(sub).width : 0;
    const tw = Math.max(mw, sw);
    boxH = (sub ? fsSub*1.6 + fsMain*1.3 : fsMain*1.3) + padY*2;
    boxW = tw + padX*2;
  } else if (category === "minimal") {
    const fs = 26*scale, lh = fs*1.5;
    ctx.font = `700 ${fs}px 'Noto Sans KR', sans-serif`;
    const widths = all.map(l => ctx.measureText(l).width);
    boxW = Math.max(...widths);
    boxH = all.length * lh;
  } else if (category === "wash") {
    const fs = 24*scale, lh = fs*1.55;
    ctx.font = `600 ${fs}px 'Noto Sans KR', sans-serif`;
    const widths = all.map(l => ctx.measureText(l).width);
    boxW = Math.max(...widths);
    boxH = all.length * lh;
  } else if (category === "card") {
    const fsMain = 28*scale, fsSub = 20*scale, padX = 22*scale, padY = 16*scale, lh = fsSub*1.45;
    const mainLine = all[0] || "";
    const subLines = all.slice(1);
    ctx.font = `900 ${fsMain}px 'Noto Sans KR', sans-serif`;
    const mw = ctx.measureText(mainLine).width;
    ctx.font = `600 ${fsSub}px 'Noto Sans KR', sans-serif`;
    const sw = subLines.length > 0 ? Math.max(...subLines.map(l => ctx.measureText(l).width)) : 0;
    const tw = Math.max(mw, sw);
    const blockH = fsMain*1.3 + (subLines.length > 0 ? subLines.length*lh + 8*scale : 0);
    boxH = blockH + padY*2;
    boxW = tw + padX*2;
  }
  ctx.restore();
  return { boxW, boxH };
}

// ── 워터마크 그리기 (외부 호출용) ─────────────────────────────
export function drawWatermarkOnCanvas(ctx, cw, ch, { wmStyle, wmText, wmPosition, logoImg }) {
  const preset = WM_PRESETS.find(p => p.id === wmStyle) || WM_PRESETS[0];
  const scale  = cw / 1200;
  const text   = wmText || WM_TEXT_DEFAULT;
  const pos    = wmPosition || "bottom-right";

  // 로고가 있으면 박스 옆에 별도 배치
  if (logoImg) {
    // 1. 워터마크 박스 크기 추정
    const { boxW, boxH } = measureWmBox(ctx, preset.category, text, scale);
    // 2. 로고 영역 크기 (박스 높이에 맞춤)
    const logoSz = boxH;
    const logoGap = 12 * scale;
    // 3. 카테고리별 마진 (각 draw 함수 내부 mg와 동일)
    const mgMap = {
      friendly: 28, trust: 26, luxury: 36, minimal: 26, wash: 22, card: 28
    };
    const mg = (mgMap[preset.category] || 28) * scale;
    // 4. 전체(로고+gap+박스) 위치 계산
    const totalW = logoSz + logoGap + boxW;
    const { x: tx, y: ty } = getWmOrigin(pos, cw, ch, totalW, boxH, mg);

    // 5. 로고 그리기 (좌측, 원본 비율 contain)
    const iw = logoImg.width || logoSz;
    const ih = logoImg.height || logoSz;
    const ratio = Math.min(logoSz / iw, logoSz / ih);
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 10 * scale;
    ctx.drawImage(logoImg, tx + (logoSz - dw)/2, ty + (logoSz - dh)/2, dw, dh);
    ctx.restore();

    // 6. 박스를 로고 우측에 그리기 위해 위치 조정
    // — 각 draw 함수는 자체 getWmOrigin 호출하므로, 임시로 pos를 override 할 수 없음
    // — 대신 캔버스를 translate 하여 박스 시작점이 (tx + logoSz + logoGap)이 되도록
    // — 박스의 원래 시작점은 getWmOrigin(pos, cw, ch, boxW, boxH, mg).x
    const origBox = getWmOrigin(pos, cw, ch, boxW, boxH, mg);
    const targetBoxX = tx + logoSz + logoGap;
    const dx = targetBoxX - origBox.x;
    const dy = ty - origBox.y;

    ctx.save();
    ctx.translate(dx, dy);
    preset.draw(ctx, cw, ch, text, scale, pos, null, { noIcon: true });
    ctx.restore();
    return;
  }

  // 로고 없을 때는 기존대로
  preset.draw(ctx, cw, ch, text, scale, pos, null);
}
