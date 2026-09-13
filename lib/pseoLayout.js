// lib/pseoLayout.js
// ─────────────────────────────────────────────────────────────
// [PSEO-ADMIN-USABILITY-01] pSEO 관리영역 전용 레이아웃 v1.0
//
// 확정 구조: 상단 = 업무 영역 / 좌측 = 해당 업무의 세부 기능.
//   상단 관리자 바에 pSEO 세부 기능을 계속 추가하지 않는다. 상단은 'pSEO' 하나만
//   두고, 향후 페이지·검색노출·유입/성과가 생기면 PSEO_SUBNAV 에 1줄씩 붙인다.
//   상단 메뉴 증식을 막는 것이 이 파일의 존재 이유다.
//
// ★ AdminLayout 무수정. current="/admin/pseo" 를 여기서 하드코딩한다.
//   AdminNav 의 활성 판정은 item.href === current 문자열 완전일치다.
//   하위 라우트(/admin/pseo/pages 등)가 생겨도 이 wrapper 를 거치는 한
//   상단 'pSEO' 밑줄이 유지된다. → AdminNav 에 prefix matching 을 넣지 않는다.
//     prefix 매칭은 전역 비교 규칙을 바꾸는 것이라 다른 8개 메뉴까지 영향이 간다.
//     여기서 상수 하나로 끝나는 일에 전역 규칙을 손대지 않는다.
//
// ★ 좌측 레일은 AdminLayout children 내부에 있다.
//   AdminLayout 규약: 본문 패딩은 레이아웃이 소유, 페이지 최상위 padding 금지.
//   레일이 content 의 24px/32px 패딩을 뚫고 나가면 그 규약이 깨진다.
//
// ★ 항목이 1개('관제')여도 레일을 렌더한다.
//   빈 메뉴가 아니라 현재 실제 존재하는 기능이다. pSEO 가 독립 관리영역이라는
//   사실이 화면에 보여야 한다. 미구현 기능의 빈 메뉴는 만들지 않는다.
//
// ★ 모바일: 이 콘솔은 inline style 전용이라 media query 가 없다.
//   flexWrap 으로 좁은 폭에서 레일이 본문 위로 접히게 한다. CSS 파일·breakpoint 도입 0.
//
// 색은 adminNav.js 콘솔 팔레트를 그대로 쓴다. 새 hex 를 만들지 않는다.
// 표시 전용 — 인증·데이터 로직 없음(가드는 각 페이지 useAdminGuard 유지).
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { AdminLayout } from './adminLayout';

// 상단 바에서 이 관리영역을 대표하는 라우트. 활성 유지의 근거값.
export const PSEO_ROOT = '/admin/pseo';

// 좌측 레일 단일 truth.
//   신규 pSEO 세부 기능이 실제 구현되면 여기 1줄만 추가한다.
//   장기 확장 예상(방향만 확정, 선제 생성 금지):
//     관제 → 페이지 → 검색노출 → 유입/성과
export const PSEO_SUBNAV = [
  { href: '/admin/pseo', label: '관제' },
  // [PSEO-SEARCH-INDEX-BOARD-01] 검색엔진에 내보낼 pSEO 검색자산 목록의 정본 화면.
  { href: '/admin/pseo/search', label: '검색노출' },
];

export function PseoAdminLayout({ current, children }) {
  return (
    <AdminLayout current={PSEO_ROOT} theme="dark">
      <div style={P.row}>
        <nav style={P.rail}>
          <div style={P.railTitle}>pSEO</div>
          {PSEO_SUBNAV.map((it) => {
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
            10열 표가 레일을 밀어내고 가로 overflow 가 난다. */}
        <div style={P.main}>{children}</div>
      </div>
    </AdminLayout>
  );
}

// adminNav.js 콘솔 팔레트.
const C = {
  surface: '#171a21',
  border: '#2a2f3a',
  line: '#232730',
  text: '#f2f4f7',
  body: '#c8ccd2',
  dim: '#9aa1ab',
  faint: '#6a6f78',
  accent: '#3b82f6',
};

const P = {
  row: { display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' },

  rail: {
    // 130px — 선장 판정. 좌측 항목명은 짧고(관제·페이지·검색노출·유입/성과)
    //   길어질 계획이 없다. 남는 폭은 본문 10열 표에 준다.
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
  // 활성 표시는 좌측 세로 바. 상단 바(하단 밑줄)와 형태를 다르게 해서
  //   "상단=영역 / 좌측=기능" 두 축이 시각적으로 섞이지 않게 한다.
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

export default PseoAdminLayout;
