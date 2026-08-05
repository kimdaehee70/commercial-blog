// lib/adminLayout.js
// v1.1 (세션76) — theme prop 추가
//   페이지마다 최상위 div가 background/color 를 직접 들고 있어(members=다크, accounts-usage=라이트)
//   그 div의 padding 이 곧 네비 들여쓰기가 되고 있었다. 배경·글자색도 레이아웃이 소유한다.
//   theme="dark" | "light"(기본). 톤 완전 통일(전 페이지 다크)은 별도 축 — 지금은 페이지가 선언만 한다.
//
// v1.0 (세션76) — 관리자 콘솔 공통 레이아웃 단일 SoT
//
// 문제: 페이지마다 AdminNav를 "자기 패딩 안"에 넣고 있었다.
//   - publish.js      → <div style={{padding:'0 14px'}}>  → 바가 좌우 14px 들여쓰기
//   - status-board.js → S.page(padding:'24px 32px') 안    → 바가 좌우 32px 들여쓰기
//   결과: 같은 컴포넌트인데 페이지마다 바 폭·정렬이 달라 보임.
//   추가: status-board의 Shell(로딩/에러)에는 네비가 아예 없어 화면이 통째로 바뀜.
//
// 원칙:
//   · 상단 바는 항상 full-bleed. 페이지는 바에 절대 패딩을 주지 않는다.
//   · 본문 패딩은 레이아웃이 소유한다. 페이지 최상위 padding 금지.
//   · 로딩/에러/빈 상태에서도 바는 동일하게 보인다(레이아웃 안에서 렌더).
//   · 메뉴 순서·폭·높이 고정. 페이지가 바꾸는 것은 active 하나뿐.
//
// 사용:
//   <AdminLayout current="/admin/status-board"> ...본문... </AdminLayout>
//   <AdminLayout current="/admin/publish" fluid> ...본문... </AdminLayout>
//
// fluid: 100vh 채우는 2단 패널형 페이지(publish 등). 본문 패딩 0 + 잔여 높이 전부 배분.
// 이 파일은 표시 전용. 인증·데이터 로직 없음(가드는 각 페이지 useAdminGuard 유지).

import React from 'react';
import { AdminNav } from './adminNav';

export function AdminLayout({ current, children, fluid = false, theme = 'light' }) {
  const t = theme === 'dark' ? THEME.dark : THEME.light;
  return (
    <div style={{ ...(fluid ? L.shellFluid : L.shell), ...t.shell }}>
      {/* full-bleed 슬롯 — 여기에 padding/maxWidth 를 추가하지 말 것 */}
      <div style={L.navSlot}>
        <AdminNav current={current} />
      </div>
      <div style={{ ...(fluid ? L.contentFluid : L.content), ...t.content }}>{children}</div>
    </div>
  );
}

const FONT = 'system-ui, -apple-system, sans-serif';

// members.js 팔레트 기준(#0f1115 / #171a21 / #232730) — 세션75 §4-1 에서 확정된 콘솔 기준색.
const THEME = {
  dark:  { shell: { background: '#0f1115' }, content: { color: '#e6e6e6' } },
  light: { shell: {},                        content: { color: '#222' } },
};

const L = {
  shell: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: FONT,
  },
  shellFluid: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: FONT,
  },
  navSlot: { flex: '0 0 auto' },
  content: { flex: '1 1 auto', padding: '24px 32px' },
  contentFluid: { flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' },
};

export default AdminLayout;
