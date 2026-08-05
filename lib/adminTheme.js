// lib/adminTheme.js
// v2.2 (세션77) — Stat 에 size 옵션 추가 (lg 기본 / sm 컴팩트)
//   배경: 대시보드가 반폭에 6칸을 넣으면서 페이지 안에 별도 KPI 컴포넌트를 만들었다.
//         같은 것이 두 벌 생기면 색·굵기가 서서히 갈라진다 → 컴포넌트를 늘리지 않고 옵션으로 흡수한다.
//   기존 Stat 의 실최소폭은 kpiMin(120) + 좌우 패딩 18×2 = 158px 이라 한 줄에 5칸이 한계였다.
//   sm 은 flex '1 1 0' + minWidth 0 이라 칸 수와 무관하게 컨테이너를 정확히 나눠 갖는다(접힘 없음).
//   size 기본값은 lg — 기존 5개 페이지는 호출부 무수정으로 동작이 동일하다.
//   구분: lg = 전폭 4~5칸(members/usage 류) / sm = 6칸 이상 또는 반폭.
//
// v2.1 (세션76) — 간격·폭 토큰화 (①-b 검수 반영)
//   · KPI 카드 폭이 페이지마다 달랐다(members 넓음 / usage 좁음). flex 를 균등분배로 고정하고
//     최소폭을 kpiMin 토큰 하나로 묶는다 → 어느 페이지든 같은 줄에서 같은 폭.
//   · 제목↔KPI 여백이 3~5px씩 어긋났다. sectionGap / headGap 토큰으로 단일화.
//     PageHead 와 StatRow 가 같은 토큰을 참조하므로 페이지가 marginBottom 을 따로 주지 않는다.
//
// v2.0 (세션76) — members 실측값으로 규격 확정 + 컴포넌트 확장
//   members.js 를 디자인 기준(Reference)으로 삼기로 했으므로, 그 S 객체의 실측값을 여기로 승격했다.
//   기준과 구현이 분리되지 않도록 members 자신도 이 파일을 쓰도록 편입한다(①-b).
//   확정 규격:
//     · 경계 #232730(기본) / #2a2e37(강조·입력)   ← members 실측. 이전 v1.0 의 #2a2f3a 는 오차였다.
//     · 표면 #171a21(카드·표) / #1c2029(표 헤더·입력·보조버튼)
//     · radius 6(버튼·입력·뱃지) / 8(KPI 카드) / 10(표 패널)
//     · 표 th·td padding '12px 16px' — 행 높이의 기준. 페이지가 바꾸지 않는다.
//     · KPI = 숫자 위 · 라벨 아래(members 형). 카드 분리형(가로 gap 10).
//
// v1.0 (세션76) — 관리자 콘솔 색상 SoT + 공통 프리미티브
//
// 배경: 세션75 §4-1 에서 "관리자가 구려 보인 원인은 디자인이 아니라 테마 불일치"로 판정됐고,
//       세션76 에서 레이아웃(AdminLayout)을 단일화했다. 남은 축이 색·간격·컴포넌트다.
//       members.js 팔레트(#0f1115 / #171a21 / #232730)를 기준으로 고정한다.
//
// 원칙:
//   · 색상값은 여기 T 하나. 페이지에서 hex 를 직접 쓰지 않는다.
//   · Card / Table / Btn / Input / Badge 는 여기 것을 쓴다. 페이지마다 CSS 를 만들지 않는다.
//   · 표시 전용. 데이터·인증 로직 없음.
//
// 이관 순서(축 ②): 사용량(기준) → 발행 → 관측 → 상태판 → 시스템.
//   adminUI.js(Box/renderAliveBadge)는 아직 라이트 팔레트다. 관측 이관 시점에 여기로 흡수한다.

import React from 'react';

export const T = {
  // 표면 — 3단계만. 더 늘리면 페이지마다 미묘하게 달라진다.
  bg:        '#0f1115',  // 페이지 바닥
  surface:   '#171a21',  // 카드 · 표 헤더 · 입력
  surfaceAlt:'#1c2029',  // 행 hover · 보조 표면
  border:    '#232730',  // 기본 경계 (표 구분선 · 카드 테두리)
  borderStrong: '#2a2e37',  // 입력 · 보조버튼 테두리
  borderRow: '#1c2029',  // 표 행 구분선(본문) — 헤더보다 약하게

  // 글자 — 4단계.
  text:      '#e6e6e6',
  textStrong:'#ffffff',
  textSoft:  '#d4d4d4',  // 표 본문 — 제목보다 한 단계 낮게
  textMuted: '#8a8f98',
  textFaint: '#6a6f78',

  // 의미색 — 다크 배경에서 읽히는 채도로 조정(라이트용 #2e7d32 계열은 다크에서 탁하다).
  accent:    '#3b82f6',
  ok:        '#34d399',
  warn:      '#fbbf24',
  danger:    '#f87171',
  info:      '#60a5fa',

  // 의미색 배경 — 텍스트색의 저채도 배경.
  okBg:      'rgba(52,211,153,.12)',
  warnBg:    'rgba(251,191,36,.12)',
  dangerBg:  'rgba(248,113,113,.12)',
  infoBg:    'rgba(96,165,250,.12)',
  mutedBg:   'rgba(255,255,255,.05)',

  // radius 3단. 늘리면 페이지마다 달라진다.
  radius: 6,       // 버튼 · 입력 · 뱃지
  radiusCard: 8,   // KPI 카드 · 알림 박스
  radiusPanel: 10, // 표 패널 · 모달

  // 표 셀 패딩 = 행 높이의 기준. 여기 하나만 고치면 전 페이지 행 높이가 같이 바뀐다.
  cellPad: '12px 16px',

  // 간격 — 페이지가 marginBottom 을 직접 쓰지 않는다. 여기 3개만.
  headGap: 18,     // 제목 블록 ↓ 다음 요소
  sectionGap: 16,  // 섹션 사이 (KPI ↓ 필터 ↓ 표)
  kpiGap: 10,      // KPI 카드 사이

  // KPI 카드 최소폭. 균등분배(flex 1 1 0)와 함께 페이지 간 폭을 고정한다.
  kpiMin: 120,

  font: 'system-ui, -apple-system, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

/* ── 헤더 ───────────────────────────────────────────────
   페이지 제목 줄. 제목 / 버전 / 부제 / 우측 액션의 배치를 고정한다.
   페이지마다 headerRow 를 다시 만들면 간격이 어긋난다. */
export function PageHead({ title, version, sub, right }) {
  return (
    <div style={H.row}>
      <div style={H.left}>
        <div style={H.titleLine}>
          <h1 style={H.title}>{title}</h1>
          {version && <span style={H.ver}>{version}</span>}
        </div>
        {sub && <div style={H.sub}>{sub}</div>}
      </div>
      {right && <div style={H.right}>{right}</div>}
    </div>
  );
}

const H = {
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: T.headGap },
  left: { minWidth: 0 },
  titleLine: { display: 'flex', alignItems: 'baseline', gap: 8 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: T.textStrong, letterSpacing: '-0.01em' },
  ver: { fontSize: 11, color: T.textFaint, fontWeight: 400 },
  sub: { marginTop: 6, fontSize: 12, color: T.textMuted, lineHeight: 1.6 },
  right: { display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' },
};

/* ── 카드 / 지표 ─────────────────────────────────────────
   members 형: 카드 분리형 · 숫자 위 · 라벨 아래.
   페이지가 grid 나 자체 박스를 다시 만들지 않는다. */
export function Card({ children, style }) {
  return <div style={{ ...C.card, ...style }}>{children}</div>;
}

// 지표 1칸. tone 은 숫자 색만 바꾼다. 배경까지 바꾸면 카드 줄이 알록달록해진다.
// tone 사용 규칙(세션76 확정): 기본=흰색 / ok=초록 / warn=노랑 / danger=빨강 4색만.
//   info 는 '값 자체가 파란 의미'일 때만. 단순 구분 목적으로 tone 을 흩뿌리면 읽기 어려워진다.
// size: lg(기본·전폭 4~5칸) | sm(6칸 이상·반폭). 색/굵기 계층은 두 판이 동일하다.
export function Stat({ label, value, sub, tone, size = 'lg' }) {
  const fg = { ok: T.ok, warn: T.warn, danger: T.danger, info: T.info }[tone] || T.textStrong;
  const sm = size === 'sm';
  return (
    <div style={sm ? C.statSm : C.stat}>
      <div style={{ ...(sm ? C.statValueSm : C.statValue), color: fg }}>{value}</div>
      <div style={sm ? C.statLabelSm : C.statLabel}>{label}</div>
      {sub != null && <div style={sm ? C.statSubSm : C.statSub}>{sub}</div>}
    </div>
  );
}

// size 는 Stat 과 같은 값을 넘긴다(칸 사이 간격만 달라진다).
export function StatRow({ children, size = 'lg' }) {
  return <div style={size === 'sm' ? C.statRowSm : C.statRow}>{children}</div>;
}

const C = {
  card: {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard, padding: '14px 16px',
  },
  statRow: { display: 'flex', gap: T.kpiGap, marginBottom: T.sectionGap, flexWrap: 'wrap' },
  stat: {
    // 균등분배 — 카드 개수가 달라도 줄 전체를 채우고, 페이지 간 폭이 일치한다.
    flex: `1 1 ${T.kpiMin}px`, minWidth: T.kpiMin,
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard, padding: '12px 18px',
  },
  statValue: { fontSize: 22, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' },
  // 세션76 검수: 숫자만 도드라지고 라벨이 묻혔다 → 한 단계 밝게 + 굵기.
  statLabel: { fontSize: 12, fontWeight: 500, color: '#9aa0ab', marginTop: 4 },
  statSub: { marginTop: 5, fontSize: 11, color: T.textFaint },

  // ── sm ──
  statRowSm: { display: 'flex', gap: 8, marginBottom: T.sectionGap },
  statSm: {
    // flexBasis 0 + minWidth 0 — 칸 수가 늘어도 접히지 않고 컨테이너를 균등 분할한다.
    flex: '1 1 0', minWidth: 0,
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard, padding: '11px 10px',
  },
  statValueSm: { fontSize: 20, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' },
  // 좁은 칸에서 라벨이 두 줄로 접히면 카드 높이가 제각각이 된다 → 말줄임 고정.
  statLabelSm: {
    fontSize: 11.5, fontWeight: 500, color: '#9aa0ab', marginTop: 4,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  statSubSm: {
    marginTop: 4, fontSize: 10.5, color: T.textFaint,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
};

/* ── 표 ────────────────────────────────────────────────
   Table 은 껍데기(테두리·스크롤)만 소유. th/td 스타일은 Th/Td 가 갖는다. */
export function Table({ children, minWidth }) {
  return (
    <div style={B.wrap}>
      <div style={B.scroll}>
        <table style={{ ...B.table, minWidth: minWidth || undefined }}>{children}</table>
      </div>
    </div>
  );
}
export function Th({ children, align = 'left', width, onClick, style }) {
  return (
    <th
      onClick={onClick}
      style={{ ...B.th, textAlign: align, width, cursor: onClick ? 'pointer' : undefined, ...style }}
    >
      {children}
    </th>
  );
}
export function Td({ children, align = 'left', mono, title, style }) {
  return (
    <td
      title={title}
      style={{
        ...B.td, textAlign: align,
        ...(mono ? { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' } : null),
        ...style,
      }}
    >
      {children}
    </td>
  );
}
export function TdEmpty({ colSpan, children }) {
  return <tr><td colSpan={colSpan} style={B.empty}>{children}</td></tr>;
}

const B = {
  wrap: { border: `1px solid ${T.border}`, borderRadius: T.radiusPanel, background: T.surface, overflow: 'hidden' },
  scroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: T.cellPad, background: T.surfaceAlt, color: '#9aa0ab',
    borderBottom: `1px solid ${T.border}`, fontWeight: 600, whiteSpace: 'nowrap',
  },
  td: { padding: T.cellPad, borderBottom: `1px solid ${T.borderRow}`, color: T.textSoft, verticalAlign: 'middle' },
  empty: { padding: '40px 16px', textAlign: 'center', color: T.textFaint },
};

/* ── 버튼 / 입력 / 뱃지 ──────────────────────────────────
   높이와 radius 는 여기서만 정한다. 페이지가 padding 을 다시 주면 줄이 어긋난다. */
// variant: default(회색) / primary(파랑) / ok / warn / danger / ghost(테두리만)
// size: sm(표 안) | md(헤더·필터)
export function Btn({ children, variant = 'default', size = 'md', active, disabled, onClick, title, style, type }) {
  const v = BTN[variant] || BTN.default;
  const z = size === 'sm' ? BTN.sizeSm : BTN.sizeMd;
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...BTN.base, ...z, ...v,
        ...(active ? BTN.activeOn : null),
        ...(disabled ? { opacity: 0.45, cursor: 'not-allowed' } : null),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const BTN = {
  base: {
    borderRadius: T.radius, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap', lineHeight: 1.4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  // 높이 통일: sm 26px / md 32px (padding + lineHeight 합산 기준)
  sizeSm: { padding: '4px 10px', fontSize: 11.5 },
  sizeMd: { padding: '6px 14px', fontSize: 12.5 },

  default: { background: T.surfaceAlt, color: '#9aa0ab', border: `1px solid ${T.borderStrong}` },
  primary: { background: T.accent, color: '#fff', border: `1px solid ${T.accent}` },
  ghost:   { background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}` },
  ok:      { background: 'rgba(52,211,153,.13)',  color: T.ok,     border: '1px solid rgba(52,211,153,.38)' },
  warn:    { background: 'rgba(251,191,36,.13)',  color: T.warn,   border: '1px solid rgba(251,191,36,.38)' },
  danger:  { background: 'rgba(248,113,113,.13)', color: T.danger, border: '1px solid rgba(248,113,113,.38)' },

  // 필터 토글 선택 상태 (members 「전체/활성/대기/정지」)
  activeOn: { background: T.accent, color: '#fff', borderColor: T.accent },
};

export const inputStyle = {
  background: T.surfaceAlt, color: T.text,
  border: `1px solid ${T.borderStrong}`, borderRadius: T.radius,
  padding: '6px 12px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
};

// select 는 다크에서 OS 기본 위젯이 흰색으로 남는다 → colorScheme 로 강제.
export const selectStyle = {
  ...inputStyle, padding: '5px 8px', fontWeight: 600, cursor: 'pointer', colorScheme: 'dark',
};

export function Input(props) {
  const { style, ...rest } = props;
  return <input {...rest} style={{ ...inputStyle, ...style }} />;
}
export function Select({ children, style, ...rest }) {
  return <select {...rest} style={{ ...selectStyle, ...style }}>{children}</select>;
}

// tone: ok / warn / danger / info / muted / accent
export function Badge({ children, tone = 'muted', style }) {
  const map = {
    ok:     { bg: T.okBg,     fg: T.ok },
    warn:   { bg: T.warnBg,   fg: T.warn },
    danger: { bg: T.dangerBg, fg: T.danger },
    info:   { bg: T.infoBg,   fg: T.info },
    accent: { bg: 'rgba(59,130,246,.14)', fg: T.accent },
    muted:  { bg: T.mutedBg,  fg: T.textMuted },
  };
  const p = map[tone] || map.muted;
  return <span style={{ ...BDG, background: p.bg, color: p.fg, ...style }}>{children}</span>;
}

const BDG = {
  display: 'inline-block', padding: '2px 8px', borderRadius: T.radius,
  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
};

// 상태값 → 뱃지 톤. 활성/정지/대기 같은 표시는 페이지마다 색을 정하지 않는다.
export const STATUS_TONE = { active: 'ok', pending: 'warn', suspended: 'danger', inactive: 'muted' };

// 값 없음 표시 통일.
export function Dash() {
  return <span style={{ color: T.textFaint }}>—</span>;
}

// 에러 알림 박스 (members errBox 승격)
export function ErrBox({ children }) {
  return (
    <div style={{
      background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.35)',
      color: '#fca5a5', borderRadius: T.radiusCard, padding: '10px 14px',
      fontSize: 13, marginBottom: 16,
    }}>{children}</div>
  );
}

export const noteStyle = { fontSize: 12.5, color: T.textMuted, lineHeight: 1.7, margin: '0 0 16px' };

// 페이지 안 섹션 제목(Tables / Views 등). 제목 계층이 본문에 묻히지 않도록 여백을 여기서 고정.
export const sectionTitleStyle = {
  fontSize: 15, fontWeight: 700, color: T.text,
  margin: '24px 0 10px', letterSpacing: '-0.01em',
};
export const footNoteStyle = { fontSize: 11.5, color: T.textFaint, lineHeight: 1.7, marginTop: 14 };
