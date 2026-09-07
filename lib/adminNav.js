// lib/adminNav.js
// v0.9 — ADMIN_NAV 에 '자동관측'(/admin/auto-observe) 1줄 추가. 그 외 무변경.
//
// v0.8 (세션81) — 우측 끝 「홈페이지 ↗」 버튼 추가
// - 관리자 콘솔에서 사용자 화면을 바로 확인할 경로가 없었다(주소창 수동 입력).
// - target="_blank" — 새 창. 관리자 세션·작업 상태를 유지한 채 확인만 한다.
// - links(flex:1)가 밀어내므로 항상 바 우측 끝. 네비 링크 목록(ADMIN_NAV)에는 넣지 않는다.
//   이유: ADMIN_NAV는 admin 라우트의 SoT다. 외부 링크가 섞이면 current 비교·순회가 오염된다.
//
// v0.7 (세션77) — 상단 「사용량」 제거 → 「전체 메뉴 · 데이터」로 이동
// - 사용량(accounts-usage)의 표시 항목(이번달·사용률·최근발행·Quota 상태)이 회원관리 v0.7 로 흡수됐다.
//   같은 회원을 두 메뉴에서 관리하지 않게 상단에서 뺀다. 상단 고정은 매일 쓰는 것만 남긴다.
// - 라우트·페이지는 삭제하지 않는다(세션76 §5 — 페이지는 지우지 않고 진입점만 재배치, 고아 라우트 방지).
//   기존 북마크·직접 링크·members 의 /api/admin/accounts-usage 호출 전부 그대로 동작한다.
// - '사용량 원장'(/admin/usage)과 라벨이 겹치므로 '계정 사용량'으로 구분한다.
//
// v0.6 (세션76) — 바 존재감 강화 + 상단 고정
// - 높이 고정 52px(alignItems:center). 페이지마다 링크 padding으로 높이가 결정되던 것을 바가 소유.
// - 표면을 페이지보다 더 어둡게(#0a0c11) + 하단 경계선 강화 → "떠 있는 바"가 아니라 "콘솔 헤더"로 읽히게.
// - position:sticky top:0 — 표 스크롤 시에도 항상 보인다(관리자 콘솔 기본 동작).
// - 활성 표시: 파란 밑줄을 바 하단에 붙이고 텍스트 흰색. 비활성 대비도 한 단계 올림.
// - 라우트 목록·시그니처 무변경.
//
// v0.5 (세션76) — 레이아웃 소유권 분리
// - bar 의 marginBottom:24 제거. 바깥 여백은 AdminLayout(content padding)이 소유한다.
//   이유: 페이지마다 바를 자기 패딩 안에 넣어 폭·들여쓰기가 달라지던 문제의 후속 정리.
//   AdminNav 는 이제 "full-bleed 한 줄"만 책임진다. 폭/여백을 스스로 만들지 않는다.
// - width:100% + boxSizing:border-box 명시(부모가 flex column 이어도 폭 고정).
// - 라우트 목록·시그니처 무변경 → 미마이그레이션 페이지도 그대로 동작(하단 24px 여백만 사라짐).
//
// v0.4 (세션75) — /admin = 대시보드 통합에 맞춘 네비 확장
// - 대시보드 href를 '/admin/dashboard' → '/admin' 으로 교체(허브 카드 화면 폐기).
//   ※ /admin/dashboard 라우트는 리다이렉트 스텁으로 남겨 기존 북마크를 깨지 않는다.
// - 허브에만 있던 페이지(요금제·구독·결제·스토어·Quota·감사 등)는 「전체 메뉴」 드롭다운으로 이관.
//   상단 고정 7개는 매일 쓰는 것만. 나머지는 접근 가능하되 눈에 띄지 않게.
// - current 비교는 그대로 href 문자열 일치. 각 페이지 호출부 무수정.
//
// v0.3 (세션75) — 알약 버튼 나열 → 콘솔형 상단 바
// 변경 이유: 파란 알약 버튼 7개가 '관리 시스템'이 아니라 '버튼 모음'으로 보였다.
//   실제 콘솔(AWS/Supabase/Stripe)의 공통점은 ① 좌측 제품명 고정 ② 링크는 텍스트 ③ 활성은 밑줄 ④ 직선·회색.
//   그 4가지만 적용. 라우트 목록·컴포넌트 시그니처는 무변경이라 7개 페이지 모두 무수정으로 반영된다.
// - 바는 페이지 테마와 무관하게 항상 다크 표면을 가진다(다크/라이트 페이지 혼재 상태에서 톤 통일).
// - 좌측 제품명 클릭 = /admin 허브 복귀(기존엔 허브로 돌아갈 경로가 네비에 없었음).
//
// v0.2 (108차) — members(회원관리) 1줄 추가
// v0.1 (신규) — admin 콘솔 공통 네비
// - read-only. 인증/데이터 로직 없음. 순수 표시.
// - 각 페이지 상단에 <AdminNav current="..." /> 1줄 삽입.

import React, { useState } from 'react';

// 단일 truth — admin 페이지 목록 (라우트 ↔ 라벨)
// 신규 admin 페이지 추가 시 여기 1줄만 추가하면 전 페이지 네비 자동 반영.
// 121차 §2-2: '/admin/accounts'(계정) 1줄 제거 → 회원관리(members) 단일화.
//   보존: 사용량(/admin/accounts-usage) · 회원관리(/admin/members). 라우트 자체는 무삭제(네비에서만 제외).
export const ADMIN_NAV = [
  { href: '/admin',                 label: '대시보드' },
  { href: '/admin/members',         label: '회원관리' },
  // 세션96: 접수 게시판 통합. 답변 대기가 쌓이면 즉시 보여야 하는 축이라 상단 고정.
  { href: '/admin/support',         label: '접수관리' },
  { href: '/admin/publish',         label: '발행' },
  { href: '/admin/observations',    label: '관측' },
  // OBSERVATION-AUTO-DASHBOARD-01: 자동관측(survival_log) 전용. 위 '관측'(수동/publish_metrics)과 별개 축.
  { href: '/admin/auto-observe',    label: '자동관측' },
  { href: '/admin/status-board',    label: '상태판' },
  { href: '/admin/system',          label: '시스템' },
];

// 상단 고정에서 뺀 나머지 — 「전체 메뉴」 드롭다운.
//   매일 보지 않지만 경로는 살아 있어야 하는 페이지들(구 /admin 허브 카드의 이전지).
export const ADMIN_MORE = [
  { group: '결제 · 구독', items: [
    { href: '/admin/plans',         label: '요금제' },
    { href: '/admin/subscriptions', label: '구독 현황' },
    { href: '/admin/payments',      label: '결제 이력' },
    { href: '/admin/billing',       label: '청구 시뮬레이터' },
  ]},
  { group: '데이터', items: [
    { href: '/admin/stores',        label: '업체관리' },
    { href: '/admin/accounts-usage', label: '계정 사용량' }, // v0.7: 상단에서 이동(회원관리로 흡수)
    { href: '/admin/quota',         label: 'Quota 보드' },
    { href: '/admin/usage',         label: '사용량 원장' },
    { href: '/admin/trend',         label: '트렌드' },
  ]},
  { group: '점검', items: [
    { href: '/admin/audit',         label: '감사 로그' },
    { href: '/admin/mismatch',      label: '불일치 점검' },
    { href: '/admin/ops',           label: '운영 도구' },
  ]},
];

export function AdminNav({ current }) {
  const [moreOpen, setMoreOpen] = useState(false);
  return (
    <nav style={navS.bar}>
      {/* 제품명 = 허브 복귀. 콘솔에서 '지금 어느 시스템에 있는가'를 항상 고정 표시. */}
      <a href="/admin" style={navS.brand}>
        <span style={navS.brandMain}>AI-POST</span>
        <span style={navS.brandSub}>운영 콘솔</span>
      </a>

      <div style={navS.links}>
        {ADMIN_NAV.map((item) => {
          const active = item.href === current;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              style={active ? navS.linkActive : navS.link}
            >
              {item.label}
            </a>
          );
        })}

        {/* 전체 메뉴 — 구 /admin 허브가 담당하던 진입점. 기본 닫힘. */}
        <div style={navS.moreWrap}>
          <button onClick={() => setMoreOpen((v) => !v)} style={navS.moreBtn}>
            전체 메뉴 {moreOpen ? '▴' : '▾'}
          </button>
          {moreOpen && (
            <div style={navS.panel} onMouseLeave={() => setMoreOpen(false)}>
              {ADMIN_MORE.map((g) => (
                <div key={g.group} style={navS.panelGroup}>
                  <div style={navS.panelTitle}>{g.group}</div>
                  {g.items.map((it) => (
                    <a key={it.href} href={it.href} style={navS.panelLink}>{it.label}</a>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우측 끝 고정 — 사용자가 실제로 보는 화면 확인용. 새창(관리자 세션 유지). */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        style={navS.siteBtn}
        title="사용자 홈페이지를 새 창으로 엽니다"
      >
        홈페이지 <span style={navS.siteBtnIcon}>↗</span>
      </a>
    </nav>
  );
}

// 바 높이는 바가 소유한다. 링크 padding 으로 높이가 결정되면 페이지마다 미세하게 달라진다.
export const BAR_H = 52;

const navS = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    height: BAR_H,
    gap: 0,
    background: '#0a0c11',
    borderBottom: '1px solid #2a2f3a',
    boxShadow: '0 1px 0 rgba(0,0,0,.5)',
    padding: '0 20px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 8, height: '100%',
    textDecoration: 'none',
    paddingRight: 20, marginRight: 20,
    borderRight: '1px solid #2a2f3a',
    flex: '0 0 auto',
  },
  brandMain: {
    fontSize: 13.5, fontWeight: 800, color: '#f2f4f7',
    letterSpacing: '0.08em',
  },
  brandSub: { fontSize: 11.5, color: '#7c828c', letterSpacing: '0.02em' },

  links: { display: 'flex', alignItems: 'center', height: '100%', gap: 2, flex: '1 1 auto' },
  // 링크는 배경 없는 텍스트. 활성만 밑줄 2px — 직선·회색 기조 유지.
  link: {
    display: 'flex', alignItems: 'center', height: '100%',
    boxSizing: 'border-box',
    fontSize: 13,
    color: '#9aa1ab',
    textDecoration: 'none',
    padding: '0 14px',
    borderBottom: '2px solid transparent',
    whiteSpace: 'nowrap',
  },
  moreWrap: { position: 'relative', display: 'flex', alignItems: 'center', height: '100%', marginLeft: 4 },
  moreBtn: {
    display: 'flex', alignItems: 'center', height: '100%',
    fontSize: 13, color: '#9aa1ab', background: 'transparent',
    border: 'none', padding: '0 14px', cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  panel: {
    position: 'absolute', top: '100%', right: 0, zIndex: 60,
    background: '#171a21', border: '1px solid #232730', borderRadius: 4,
    padding: '10px 0', minWidth: 400, display: 'flex', gap: 0,
    boxShadow: '0 10px 30px rgba(0,0,0,.45)',
  },
  panelGroup: { flex: 1, padding: '0 14px', borderRight: '1px solid #1c2029' },
  panelTitle: { fontSize: 10.5, color: '#6a6f78', fontWeight: 700, letterSpacing: '0.06em', margin: '2px 0 7px' },
  panelLink: {
    display: 'block', fontSize: 12.5, color: '#c8ccd2',
    textDecoration: 'none', padding: '5px 0', whiteSpace: 'nowrap',
  },

  linkActive: {
    display: 'flex', alignItems: 'center', height: '100%',
    boxSizing: 'border-box',
    fontSize: 13,
    color: '#ffffff',
    fontWeight: 700,
    textDecoration: 'none',
    padding: '0 14px',
    borderBottom: '2px solid #3b82f6',
    whiteSpace: 'nowrap',
  },

  // 우측 끝 외부 링크. 네비 링크(텍스트+밑줄)와 구분되게 옅은 테두리 박스로 처리한다.
  //   콘솔 내부 이동이 아니라 '밖으로 나간다'는 신호를 형태로 준다.
  siteBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    flex: '0 0 auto',
    marginLeft: 16,
    height: 30,
    boxSizing: 'border-box',
    fontSize: 12.5,
    color: '#c8ccd2',
    textDecoration: 'none',
    padding: '0 12px',
    border: '1px solid #2a2f3a',
    borderRadius: 4,
    background: '#141821',
    whiteSpace: 'nowrap',
  },
  siteBtnIcon: { fontSize: 11, color: '#7c828c' },
};

export default AdminNav;
