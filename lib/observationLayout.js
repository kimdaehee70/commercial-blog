// lib/observationLayout.js
// ─────────────────────────────────────────────────────────────
// [OBS-ADMIN-USABILITY-01] 관측 관리영역 전용 레이아웃 v1.0
//
// 확정 구조: 상단 = 업무 영역 / 좌측 = 해당 업무의 세부 기능. (pSEO 와 동일 원칙)
//   상단에 따로 있던 '관측'(수동) / '자동관측' 두 메뉴를 '관측' 하나로 통합한다.
//   세부 기능은 OBS_SUBNAV 가 소유한다. 상단 메뉴 증식을 막는 것이 이 파일의 존재 이유다.
//
// ★ 관측 전용 파일이다(선장 판정 (a)).
//   lib/pseoLayout.js 와 구조가 같지만 범용 section layout 으로 일반화하지 않는다.
//   일반화는 관리자 전체 구조를 건드리는 일이고, pSEO 는 이번 축 무접촉이다.
//
// ★ AdminLayout 무수정. current 는 OBS_ROOT 로 하드코딩한다.
//   AdminNav 활성 판정 = item.href === current 문자열 완전일치.
//   /admin/auto-observe 도 이 wrapper 를 거치므로 상단 '관측' 밑줄이 유지된다.
//   → AdminNav 에 prefix matching 을 넣지 않는다(전역 비교 규칙 변경 금지).
//
// ★ URL/API 는 합치지 않는다. /admin/observations · /admin/auto-observe 라우트 그대로.
//   navigation 만 하나의 관측 영역으로 묶는다.
//
// ★ 좌측 레일은 AdminLayout children 내부(본문 패딩은 레이아웃 소유 규약).
// ★ media query 없음 — flexWrap 으로 좁은 폭에서 레일이 본문 위로 접힌다.
//
// 색은 adminNav.js 콘솔 팔레트(pseoLayout.js 와 동일값). 새 hex 를 만들지 않는다.
// 표시 전용 — 인증·데이터 로직 없음(가드는 각 페이지 useAdminGuard 유지).
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { AdminLayout } from './adminLayout';

// 상단 바에서 이 관리영역을 대표하는 라우트. ADMIN_NAV '관측' href 와 같아야 한다.
export const OBS_ROOT = '/admin/observations';

// 좌측 레일 단일 truth. 신규 관측 세부 기능이 실제 구현되면 여기 1줄만 추가한다.
export const OBS_SUBNAV = [
  { href: '/admin/observations', label: '기존관측' },
  { href: '/admin/auto-observe', label: '자동관측' },
];

export function ObservationAdminLayout({ current, children }) {
  return (
    <AdminLayout current={OBS_ROOT} theme="dark">
      <div style={P.row}>
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

        {/* minWidth:0 필수 — flex 자식 기본 min-width:auto 라서 없으면
            넓은 표가 레일을 밀어내고 가로 overflow 가 난다. */}
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

const P = {
  row: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },

  // 130px — pSEO 레일과 동일 폭. 항목명(기존관측·자동관측)이 짧다.
  rail: {
    flex: '0 0 130px',
    minWidth: 130,
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

  main: { flex: '1 1 560px', minWidth: 0, boxSizing: 'border-box' },
};

export default ObservationAdminLayout;
