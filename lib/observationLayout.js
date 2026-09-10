// lib/observationLayout.js
// ─────────────────────────────────────────────────────────────
// [OBS-LEGACY-OBSERVATIONS-RETIRE-01] 관측 업무영역 레이아웃 v1.0 (DEC-022)
//
// 확정 구조: 상단 = 업무 영역 / 좌측 = 해당 업무의 세부 기능. (pSEO 와 동일 원칙)
//   상단 '관측' 하나가 관측 업무영역을 대표한다.
//   좌측: ① 자동관측 → /admin/auto-observe(기본 화면) · ② 수동관측(발행) → /admin/publish
//   (2026-09-10 정정: 주 관측 = 자동관측, 수동 = 보완·운영용. OBS_ROOT · 순서 교체)
//   /admin/observations 는 퇴역(플래그, DEC-007). 좌측에 두지 않는다.
//   향후 관측결과/분석 · 엔진 제안/승인은 실제 구현 시에만 OBS_SUBNAV 에 1줄 추가(빈 메뉴 금지).
//
// ★ 관측 전용 파일. 범용 section layout 으로 일반화하지 않는다(pSEO 무접촉).
// ★ AdminLayout 무수정. current 는 OBS_ROOT 로 하드코딩한다.
//   AdminNav 활성 판정 = item.href === current 문자열 완전일치 → prefix matching 도입 안 함.
// ★ 두 모드
//   · 비-fluid (auto-observe): 문서 스크롤 페이지. 레일은 AdminLayout 본문 패딩 안(24px 32px).
//   · fluid    (publish)     : 100vh 2단 패널 페이지. 본문 패딩이 없으므로 레일 컬럼이
//     padding-left 32 / top 24 를 스스로 가진다 → 두 모드에서 레일 글자·경계선 위치가 같다.
//     main 은 flex column + minHeight 0 — publish 의 wrap(flex:1 1 auto) 이 남은 높이를 그대로 채운다.
//     fluid 에서는 flexWrap 을 쓰지 않는다(100vh 구조 보호).
// ★ media query 없음. 색은 adminNav.js 콘솔 팔레트(pseoLayout.js 와 동일값).
// 표시 전용 — 인증·데이터 로직 없음(가드는 각 페이지 useAdminGuard 유지).
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { AdminLayout } from './adminLayout';

// 상단 바 '관측' href 와 같아야 한다(활성 판정 근거값).
export const OBS_ROOT = '/admin/auto-observe';

// 좌측 레일 단일 truth.
export const OBS_SUBNAV = [
  { href: '/admin/auto-observe', label: '자동관측' },
  { href: '/admin/publish',      label: '수동관측(발행)' },
];

function Rail({ current }) {
  return (
    <nav style={P.rail}>
      <div style={P.railTitle}>관측</div>
      {OBS_SUBNAV.map((it) => {
        const active = it.href === current;
        return (
          <a
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            style={active ? P.railLinkActive : P.railLink}
          >
            {it.label}
          </a>
        );
      })}
    </nav>
  );
}

export function ObservationAdminLayout({ current, children, fluid = false }) {
  if (fluid) {
    return (
      <AdminLayout current={OBS_ROOT} theme="dark" fluid>
        <div style={P.rowFluid}>
          <div style={P.railColFluid}><Rail current={current} /></div>
          <div style={P.mainFluid}>{children}</div>
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout current={OBS_ROOT} theme="dark">
      <div style={P.row}>
        <Rail current={current} />
        {/* minWidth:0 필수 — 없으면 넓은 표가 레일을 밀어내고 가로 overflow 가 난다. */}
        <div style={P.main}>{children}</div>
      </div>
    </AdminLayout>
  );
}

// adminNav.js 콘솔 팔레트.
const C = {
  surface: '#171a21',
  line: '#232730',
  text: '#f2f4f7',
  dim: '#9aa1ab',
  faint: '#6a6f78',
  accent: '#3b82f6',
};

const RAIL_W = 130;

const P = {
  // 비-fluid
  row: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },
  main: { flex: '1 1 560px', minWidth: 0, boxSizing: 'border-box' },

  // fluid — 레일 컬럼 = padding-left 32 + 레일 130 = 162px (비-fluid 의 본문 패딩 위치와 일치)
  rowFluid: { display: 'flex', flex: '1 1 auto', minHeight: 0 },
  railColFluid: { flex: `0 0 ${32 + RAIL_W}px`, boxSizing: 'border-box', padding: '24px 0 0 32px' },
  mainFluid: { flex: '1 1 auto', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' },

  rail: {
    flex: `0 0 ${RAIL_W}px`,
    width: RAIL_W,
    minWidth: RAIL_W,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingRight: 16,
    borderRight: `1px solid ${C.line}`,
  },
  railTitle: {
    fontSize: 10.5, color: C.faint, fontWeight: 700,
    letterSpacing: '0.08em', padding: '2px 10px 9px',
  },
  railLink: {
    display: 'block', fontSize: 12.5, color: C.dim,
    textDecoration: 'none', padding: '7px 10px',
    borderLeft: '2px solid transparent', borderRadius: 3,
    whiteSpace: 'nowrap',
  },
  railLinkActive: {
    display: 'block', fontSize: 12.5, color: C.text, fontWeight: 700,
    textDecoration: 'none', padding: '7px 10px',
    borderLeft: `2px solid ${C.accent}`, borderRadius: 3,
    background: C.surface,
    whiteSpace: 'nowrap',
  },
};

export default ObservationAdminLayout;
