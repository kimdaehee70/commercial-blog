// lib/adminUI.js
// 세션76 v0.2 — 다크 재배선
//   Box / renderAliveBadge 의 라이트 팔레트(#e8f5e9 등)가 다크 페이지에서 그대로 떠 있었다.
//   색값을 lib/adminTheme.js 의 T 로 위임. 라벨 매핑·시그니처·날짜 헬퍼는 전부 무변경.
//   Box 는 KPI 규격을 theme 의 Stat 과 맞춘다(숫자 위 · 라벨 아래, 균등분배).
//   ※ 이 파일은 호환 유지용. 신규 페이지는 adminTheme 의 Stat / Badge 를 직접 쓸 것.

// 중복D 추출 (운영 UI Tier2 / 2026-05-24):
// dashboard.js · observations.js에 byte-identical로 중복되던 공통 UI 5종을 단일 출처로 추출.
//   - Box (관측/계정 요약 박스, palette 4종)
//   - renderAliveBadge (alive/fossil/기타 상태 뱃지)
//   - fmtDate / fmtDateTime / pad (날짜 표시 헬퍼)
//
// 설계 원칙 (방향 A — 페이지 S 불변):
//   추출 함수가 참조하던 스타일 5종(box/boxLabel/boxValue/muted/badge)을
//   이 파일 내부 지역 상수 U로 내장 → 컴포넌트 자기완결.
//   각 페이지의 S 객체는 손대지 않는다 (해당 key는 다른 렌더 함수도 사용 → 死코드 아님).
//   값은 dashboard·observations의 S와 byte-identical 검증 완료(2026-05-24).
//
// 사용: import { Box, renderAliveBadge, fmtDate, fmtDateTime, pad } from '../../lib/adminUI';

import { T } from './adminTheme';

// 세션76: 값은 T 위임. 카드 규격은 theme 의 Stat 과 동일하게 맞춘다.
const U = {
  box: {
    flex: `1 1 ${T.kpiMin}px`, minWidth: T.kpiMin, padding: '12px 18px',
    borderRadius: T.radiusCard, border: `1px solid ${T.border}`, background: T.surface,
  },
  boxValue: { fontSize: 22, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' },
  boxLabel: { fontSize: 11.5, color: T.textMuted, marginTop: 3 },
  muted:    { color: T.textFaint },
  badge:    { display: 'inline-block', padding: '2px 8px', borderRadius: T.radius, fontSize: 11, fontWeight: 700 },
};

export function Box({ label, value, tone }) {
  const fg = { ok: T.ok, warn: T.warn, info: T.info, muted: T.textMuted }[tone] || T.textStrong;
  return (
    <div style={U.box}>
      <div style={{ ...U.boxValue, color: fg }}>{value}</div>
      <div style={U.boxLabel}>{label}</div>
    </div>
  );
}

// 운영자 표시 문구 매핑 (표시 전용 — DB/API 저장값은 alive/unknown/fossil 그대로 유지).
//   alive → 생존 / unknown(기타) → 관찰중 / fossil → 보합
// fossil = "장기 관측됐으나 특별 반응 없음" 의미라 '화석'보다 '보합'이 직관적.
export const ALIVE_STATUS_LABEL = {
  alive: '생존',
  unknown: '관찰중',
  fossil: '보합',
};
// 저장값 → 운영자 문구. 매핑에 없는 값은 원문 그대로(안전).
export function aliveStatusLabel(status) {
  if (!status) return '';
  return ALIVE_STATUS_LABEL[status] || status;
}

export function renderAliveBadge(status) {
  if (!status) return <span style={U.muted}>—</span>;
  const isAlive = status === 'alive';
  const isFossil = status === 'fossil';
  const bg = isAlive ? T.okBg : isFossil ? T.warnBg : T.mutedBg;
  const fg = isAlive ? T.ok : isFossil ? T.warn : T.textMuted;
  return <span style={{ ...U.badge, background: bg, color: fg }}>{aliveStatusLabel(status)}</span>;
}

export function fmtDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch { return s; }
}

export function fmtDateTime(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return s; }
}

export function pad(n) { return String(n).padStart(2, '0'); }
