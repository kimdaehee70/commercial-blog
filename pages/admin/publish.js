// pages/admin/publish.js
// v0.6 (세션85) — 상세패널 결손분 보강: 재발행 · 수정 · 삭제(Soft Delete).
//   재발행 = URL 재연결 + 발행 상태 갱신까지. 글 재생성은 재발행이 아니다(= 새 글 생성). 엔진 무접촉.
//   수정   = 제목만. 본문·키워드는 API 화이트리스트에서 차단 — 관측은 '발행 당시 콘텐츠' 기준으로
//            쌓이므로 같은 publish_id 의 본문이 바뀌면 ORBIT 상관분석의 전제가 깨진다.
//   삭제   = deleted_at 축(Soft). publish_metrics · post_ranks · Timeline 은 전부 보존된다.
//   경로: publish-republish.js / publish-update.js / publish-delete.js (전부 신규)
//   ⚠ publish-status.js 는 존재하지 않는 컬럼 4종(status/first_seen_at/latest_alive_at/
//     survival_hours)을 참조하는 잠복 버그 상태다(세션85 실측). SHOW_ALIVE_SELECT=false 라 미발현.
// v0.5 (세션84) — 발행 관리 단순화. 관측 기능 전부 제거 (A안 2단계)
//   Publish 를 열면 '이 글이 정상 발행됐는가' 하나만 답한다. 성과 판단은 관측 화면이 한다.
//   동선: 목록 선택 → 행 🔍 로 검색 → 관측 결과 입력 → 저장. 우측 패널 하나에서 끝낸다.
//   관측 결과 3분기 — 메인창 노출(체크) / 블로그 관련도 순위(숫자) / 미노출(체크).
//     관리자는 '관측'만 한다. 생존·변화·연속 미노출·패턴 상관은 전부 시스템이 계산한다.
//     미노출은 실패 기록이 아니라 ORBIT 이 쓸 학습 데이터다 — 반드시 남긴다.
//         관리자는 하루 수십 건을 넣는다. 클릭 수가 가장 적은 구조가 가장 좋은 구조다.
//   제거: 노출 체크 4버튼 · 24h 주기 select · 6축 변화카드 · systemVerdict · Timeline 노출점(V/R/N/T)
//   유지: 검색 3층 · 순위 입력 3칸 · memo · 저장(Ctrl+Enter)
//   축소: Timeline → 최근 3건. 현재 상태 → 대표 순위(크게). 좌:우 = 65:35.
//   유지: 목록/검색/필터/페이저 · 발행정보(URL 등록·수정) · 수동 등록 · CSV · 딥링크.
//   ⚠ 선행 조건 충족: 관측 입력은 observations.js v0.7 에 먼저 신설·검증됐다.
//      대체 경로를 만든 뒤 걷어낸다 — 관리자가 하루도 관측을 못 하는 상태를 만들지 않는다.
//   스키마·API 무변경. rank_detail 6키와 기존 기록은 그대로 남는다(삭제 아님, 책임 이동).
// 세션83 [DEC-017] 조회 범위 제한 폐기 — 발행 관리 시스템으로 재정의
//   - 배경: 목록이 id 1371에서 끊겼다. 버그가 아니라 API 의 limit(400)→slice(200) 설계 결과.
//     그 정책("Publish = 최근 200건")은 관측목록이 없던 시절의 임시 운영 방식이었다.
//   - DEC-017: Publish 와 Observation 은 조회 범위가 아니라 책임으로 구분한다.
//       · Publish     = 운영 관리 (URL 등록·발행 상태·재발행·삭제·이력)
//       · Observation = 성과 관리 (순위·관련도·생존·Timeline)
//     두 화면 모두 전체 데이터에 접근한다. 역할은 겹치지 않는다.
//   - 화면 변경: 좌측 헤더 아래 필터바(검색·업종·발행여부·정렬) + 목록 하단 페이저.
//     전량 렌더 금지 — 조회는 전체(API), 표시는 페이지 단위. 검색·필터·정렬 전부 서버 기준.
//   - 딥링크 보정: ?id= 가 현재 페이지에 없으면 그 id 로 자동 검색해 데려온다
//     (관측목록 「상세」 버튼이 과거 글을 가리켜도 빈 화면이 되지 않게).
//   - 무접촉: 우측 상세패널 · 관측 입력/저장 · 순위 컬럼 · 수동등록 · CSV · 네이버 검색.
// 세션81 [2단계] Timeline 통합 표시 — 관리자 관측 + 사용자 순위등록
//   - 배경: 상세 Timeline 이 'no observations'인데 사용자는 순위를 등록해 둔 상태였다.
//     원인 = 저장 대상 행이 다름(관리자→published / 사용자→baseline). API v0.5 에서 그룹 조회로 해결.
//   - 이번 화면 변경은 '이력을 한 줄로 세우는 것'까지. 데이터는 합치지 않는다(DEC-006).
//     · timeline(관리자) / userRanks(사용자) state 는 끝까지 분리 유지
//     · mergeTimeline() 은 표시 전용. 정렬 + 출처 배지만 붙인다
//   - 무접촉: snapshot · 변화카드 · 저장(POST) · 대표값 판정. 전부 관리자 관측만 본다(다음 축).
//   - trend(상승·하락)는 관리자 행끼리만 계산. 사용자 행은 비교 대상에서 제외.
//     이유: 두 축은 관측 시각·기준이 달라 섞으면 없는 변화가 생긴다.
//   - 자동수집(AUTO)이 붙어도 srcBadge 1종 추가로 끝난다(Input Adapter 구조 · 문서 05).
// 세션79 [정리 2건] 검색 최신축 숨김 + alive 셀렉트 숨김 (플래그 1줄 복원)
//   - SHOW_RECENT_SEARCH=false : 상단 검색 버튼 6개 → 관련도 3개. 동시열기도 3종으로 축소
//     (링크 생성 로직·links 객체·recent 키 전부 무변경 — 화면 노출만 차단)
//   - SHOW_ALIVE_SELECT=false : 우측 상단 pending/alive/fading/dead 셀렉트 숨김
//     (관측 시작 전이라 전 행 pending. changeStatus·STATUS_OPTIONS·API 무변경)
//   - 관측 개시 시 두 상수 true 로 되돌리면 원상 복구. 삭제 아님
// 세션78 [2·3단계] 관측 입력 축소 + 리스트 status 파생화
//   - 관측 입력 6칸 → 관련도 3칸. 최신 3칸은 SHOW_RECENT_AXIS=false 로 화면에서만 숨김
//     (rank_detail 6키 스키마·기존 기록·저장 경로 전부 무변경. 되살릴 때 한 줄)
//   - 리스트 status 컬럼: 전 행 'pending' 이라 정보량 0 이었다 → URL 유무 파생으로 교체
//     (발행완료 / 생성만). 우측 상세의 alive_status 셀렉트는 관측 상태이므로 그대로 둔다.
// 세션78 [1단계] URL 상태 축 추가 (DB/스키마/API 무변경 — 화면 파생 표시만)
//   - 운영 흐름이 '관측 입력' → 'URL 넣었는가' 중심으로 바뀐 것을 UI에 반영
//   - 리스트: id 다음에 URL 점 컬럼(⚪ 미입력 / 🟢 입력완료)
//   - 상세: 「발행정보」 카드로 승격 — 상태 뱃지 + URL 링크/입력 + 첫 발행
//   - 입력 즉시 색 변경: correctUrl 이 rows 를 갱신 → selectedRow 파생 → 재렌더 (별도 저장 없음)
//   - 관측 입력(6칸)·status(pending 등)은 이번 단계 무변경 → 2·3단계에서 처리
// 91차: 수동 발행 등록 추가 (이미 네이버에 발행된 글 사후 연결)
//   - 보드 = '실발행 관측판' purity 유지 / 생성 자동등록 X
//   - 좌측 헤더 [＋ 수동 등록] → URL·제목·키워드·업종·본문 입력
//   - 경로: publish-secure.js → publish.js (백엔드 무수정, FREEZE 준수)
//   - qc_score:0 / model:'manual' / generated_version:'manual-register'
//   - owner는 quota skip / account_id 미전송(서버 주입)
// 94차 v0.3: CSV export Bearer 전파 ([C] 보류 해소)
// - <a href> 다운로드 → fetch + Blob 방식으로 교체 (Authorization 헤더 전파)
// - 90차 accounts.js 패턴 답습 (Blob + BOM + 동적 <a> + 1초 지연 revoke)
// - 401/403 분기 일관 처리
// - UI / 좌우 패널 / 검색 / Snapshot / Quick Insert / Timeline 무변경
//
// 55차 v0.2: owner 가드 + Bearer 전파(4곳) + 401/403 분기
// - useEffect 진입 시 session/OWNER_UID 검증 → non-owner /login redirect
// - fetchList / fetchDetail / saveObservation / changeStatus 전부 Authorization 전파
//
// (이전 base: 좌측 리스트 + 우측 상세 + 네이버 3종 검색 + Ctrl+Enter 저장)

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import { renderAliveBadge } from '../../lib/adminUI';
import { T, Btn, inputStyle, selectStyle } from '../../lib/adminTheme';
import { getCatalogItem, INDUSTRY_CATEGORY_ORDER, INDUSTRY_CATALOG } from '../../lib/industry-catalog';

// [v0.8] 업종 표시 한글화 — 화면은 업종명, API/DB는 코드 그대로.
//   SoT = lib/industry-catalog.js (name). 업종이 늘어도 여기 수정 불필요.
//   카탈로그에 없는 코드(테스트/구코드)만 아래 보정표에서 처리한다.
const INDUSTRY_LABEL_EXTRA = {
  demo: '데모(테스트)',
};
// 대분류 → 업종코드 전체(카탈로그 기준). 목록에 아직 발행이 없는 업종도 포함해야
//   "병원 전체" 조회가 데이터 유무에 따라 흔들리지 않는다.
const CODES_BY_CATEGORY = (() => {
  const m = {};
  for (const it of INDUSTRY_CATALOG) {
    const c = it.category || '기타';
    (m[c] = m[c] || []).push(it.id);
  }
  return m;
})();
function industryCategory(code) {
  const item = getCatalogItem(String(code || '').trim());
  return (item && item.category) || '기타';
}
function industryLabel(code) {
  const id = String(code || '').trim();
  if (!id) return '-';
  const item = getCatalogItem(id);
  if (item && item.name) return item.name;
  return INDUSTRY_LABEL_EXTRA[id] || id;
}

// 세션76: 행 배경. 라이트 파스텔(#d1fae5 등)은 다크에서 눈이 아프다 → 저채도 오버레이로 교체.
//   의미(상태별 구분)는 유지, 명도만 낮춘다.
const STATUS_COLORS = {
  pending: 'transparent',
  alive: 'rgba(52,211,153,.10)',
  fading: 'rgba(251,191,36,.10)',
  dead: 'rgba(248,113,113,.10)',
};

// 세션78 [1단계] — URL 상태 축. truth 는 naver_post_url 존재 여부 하나뿐.
//   publish_status 는 참조하지 않는다(보정 경로에 따라 값이 늦게 붙는 경우가 있어 표시 신뢰가 깎임).
const hasUrl = (r) => !!String(r?.naver_post_url || '').trim();
const URL_STATE = {
  on:  { color: T.ok,        label: 'URL 입력완료' },
  off: { color: T.textFaint, label: 'URL 미입력' },
};

const STATUS_OPTIONS = ['pending', 'alive', 'fading', 'dead'];

const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
};

const extractSearchKeyword = (row) => {
  if (!row) return '';
  if (row.region && row.treatment_name) {
    return `${row.region} ${row.treatment_name}`;
  }
  const title = row.title || '';
  const cut = title.split(/[｜|]/)[0].trim();
  return cut || title.slice(0, 20);
};

const naverUrl = (q, recent) =>
  `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}${recent ? '&sort=ent_date' : ''}`;

const buildNaverLinks = (row) => {
  const core = extractSearchKeyword(row);   // region+treatment_name (없으면 title 앞부분)
  if (!core) return null;
  const review = core + ' 후기';
  const full = (row.title || '').replace(/[｜|].*$/, '').trim() || core; // 제목 검색(구분자 앞)
  return {
    keyword: core,            // 대표 검색어(저장용)
    core,
    review,
    full,
    // query_type × axis 6링크
    core_related:   naverUrl(core, false),
    core_recent:    naverUrl(core, true),
    review_related: naverUrl(review, false),
    review_recent:  naverUrl(review, true),
    full_related:   naverUrl(full, false),
    full_recent:    naverUrl(full, true),
    // 하위호환(기존 코드 참조)
    related: naverUrl(core, false),
    recent:  naverUrl(core, true),
  };
};

const openAll = (links) => {
  if (!links) return;
  // 리스트 행 빠른검색: 대표 3종(관련도/최신/후기)
  window.open(links.core_related, '_blank');
  window.open(links.core_recent, '_blank');
  window.open(links.review_related, '_blank');
};

// [세션79] 검색 최신축 노출 플래그 — false 면 관련도 3종만 노출/동시열기
//   관측 개시 후 최신축이 필요해지면 true 한 줄로 복구. 링크 생성부는 무변경.
const SHOW_RECENT_SEARCH = false;

// [세션79] alive_status 셀렉트 노출 플래그 — 관측 시작 전에는 전 행 pending 이라 의미 없음
const SHOW_ALIVE_SELECT = false;

const openSearchSet = (links) => {
  if (!links) return;
  const urls = SHOW_RECENT_SEARCH
    ? [
        links.core_related, links.core_recent,
        links.review_related, links.review_recent,
        links.full_related, links.full_recent,
      ]
    : [links.core_related, links.review_related, links.full_related];
  urls.forEach((u) => window.open(u, '_blank'));
};

// [세션84] 관측 입력은 3분기(메인창 노출 / 관련도 순위 / 미노출)로 단순화됐다.
//   rank_detail 6키 스키마와 기존 기록은 그대로 남는다 — 화면이 core_related 하나만 쓰는 것뿐.
// 관측 입력 = 노출 상태 3분기. 관리자는 결과만 넣고 해석은 시스템이 한다.
//   ① 메인창 노출 — 체크만(순위 없음)  ② 블로그 관련도 순위 — 숫자 1칸  ③ 미노출 — 메인·관련도 모두 없음
// 스키마 무변경 매핑(ALTER 0):
//   메인창 노출 → view_ok · 관련도 순위 → rank_detail.core_related · 미노출 → alive_status='fossil'
//   메인창·관련도는 독립 체크(둘 다 노출이면 둘 다 켠다). 미노출만 배타 — 켜면 나머지를 끈다.
//   순위는 관련도에서만 측정한다. 메인창은 '첫 화면에 살아있는가'만 본다.
// [세션86] Queue 사유 — 입력 주체가 사람이든 자동수집기든 같은 축이다.
// 생존시간은 저장값이 아니라 발행일에서 나오는 파생값이다(세션86).
const survivalText = (snap) => {
  const base = snap?.published_at || snap?.created_at;
  if (!base) return '-';
  const d = Math.floor((Date.now() - new Date(base).getTime()) / 864e5);
  return d < 1 ? '1일 미만' : `${d}일`;
};

const QUEUE_REASON = { NEW: '신규 첫 관측', SCHEDULE: '정기 관측', OVERDUE: '지연', RECHECK: '순위 급변 재확인' };
const QUEUE_MARK = { NEW: '신규', SCHEDULE: '●', RECHECK: '급변' };

const defaultForm = () => ({ main: false, related: false, core_rank: '', not_exposed: false, memo: '' });

const RANK_SHORT = {
  core_related: '기본관', core_recent: '기본최',
  review_related: '후기관', review_recent: '후기최',
  full_related: '제목관', full_recent: '제목최',
};

const rankDetailSummary = (rd) => {
  if (!rd || typeof rd !== 'object') return '';
  const parts = [];
  for (const k of Object.keys(RANK_SHORT)) {
    if (typeof rd[k] === 'number' && rd[k] > 0) {
      parts.push(`${RANK_SHORT[k]} ${rd[k]}`);
    }
  }
  return parts.join(' · ');
};

// ── [세션81] Timeline 표시 병합 ──────────────────────────────────────────
// 관리자 관측(publish_metrics)과 사용자 순위등록(post_ranks)은 각자 SoT 로 남는다(DEC-006).
// 여기서 하는 일은 '화면에 한 줄로 세우는 것'뿐이다. 데이터는 합치지 않는다.
//
// 이번 단계에서 하지 않는 것(다음 축):
//   · 대표값 결정(관리자 우선) — snapshot / 변화카드는 지금도 관리자 관측만 본다. 무접촉.
//   · trend(상승·하락) 판정 — 관리자 행끼리만 계산한다. 사용자 행은 비교 대상에 넣지 않는다.
//     이유: 두 축은 관측 시각·기준이 다르다. 섞어서 비교하면 없는 변화가 생긴다.
const mergeTimeline = (adminRows, userRows) => {
  const admin = adminRows || [];
  const user = userRows || [];

  // 관리자 행끼리의 직전값 — 병합 전 순서(최신순)에서 계산해 둔다.
  const prevRankById = new Map();
  admin.forEach((t, i) => {
    const prev = admin[i + 1];
    prevRankById.set(t.id, prev ? prev.observed_rank : undefined);
  });

  const merged = [
    ...admin.map((t) => ({ ...t, _prevRank: prevRankById.get(t.id) })),
    ...user.map((u) => ({ ...u, _prevRank: undefined })),
  ];

  // 최신순(desc). recorded_at 없으면 뒤로.
  merged.sort((a, b) => {
    const ta = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
    const tb = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
    return tb - ta;
  });
  return merged;
};

// ── [세션82 · 3단계] 목록 대표순위 ────────────────────────────────────────
// 정책: 관리자 관측이 있으면 그 값이 대표값. 없을 때만 사용자 등록값으로 대신한다.
//   두 축을 평균내거나 섞지 않는다. 관측 시각·기준이 달라 섞으면 없는 값이 생긴다(DEC-006).
// 표시 규칙:
//   숫자      → 대표순위 (검정=관리자 출처 / 파랑=사용자 출처)
//   밖        → 관측은 했으나 순위권 밖 (관리자 관측 존재 + observed_rank null)
//   -         → 미관측
// 여기서 하지 않는 것: snapshot · 변화카드 · 저장 경로 — 전부 무접촉. 목록 표시 축만 바꾼다.
// [v1.1] 대표값 = 최신 입력 우선. 서버가 계산한 rep_src 를 그대로 따른다(화면이 규칙을 다시 만들지 않는다).
//   저장 축은 그대로 분리(DEC-006) — 여기서 정하는 것은 「지금 무엇을 보여줄 것인가」뿐이다.
//   rep_src 가 없는 옛 응답에서는 기존 규칙(관리자 우선)으로 되돌아간다.
const pickRepRank = (r) => {
  const adminSeen = (r?.observation_count || 0) > 0;
  const userSeen = (r?.user_rank_count || 0) > 0;
  const src = r?.rep_src || (adminSeen ? 'admin' : (userSeen ? 'user' : null));
  if (src === 'admin') {
    return {
      value: r?.observed_rank ?? null, src: 'admin', seen: true,
      main: r?.view_ok === true, notFound: !!r?.admin_not_found,
    };
  }
  if (src === 'user') {
    return {
      value: r?.user_latest_rank ?? null, src: 'user', seen: true,
      main: false, notFound: !!r?.user_not_found,
    };
  }
  return { value: null, src: null, seen: false, main: false, notFound: false };
};

// [세션84] 「밖」은 관련도 순위에만 쓰는 말이다. 메인창에 있는데 「밖」이라 적으면 읽는 사람이 모순을 본다.
//   숫자 = 관련도 순위 · 메인 = 메인창 노출(관련도 순위 없음) · 미노출 = 어디에도 없음 · - = 미관측
const RankCell = ({ r }) => {
  const { value, src, seen, main, notFound } = pickRepRank(r);
  if (!seen) return <span style={{ color: T.textFaint }}>-</span>;
  // 출처 표식 — 운영자 전용. 대표값이 어디서 왔는지 한 글자로만 남긴다.
  const tag = <span style={{ color: T.textFaint, fontSize: 10, marginLeft: 3 }}>({src === 'user' ? 'U' : 'A'})</span>;
  if (value == null) {
    if (main) return <span style={{ color: T.ok, fontWeight: 700 }}>메인{tag}</span>;
    if (notFound) {
      return (
        <span style={{ color: T.warn || T.textMuted, fontWeight: 700 }}
          title={src === 'admin' ? '관리자 관측 — 순위·메인 모두 없음' : '사용자 확인 — 검색했으나 찾지 못함'}>
          미발견{tag}
        </span>
      );
    }
    return <span style={{ color: T.textMuted }}>미노출{tag}</span>;
  }
  return (
    <strong style={{ color: src === 'user' ? T.accent : T.text, fontWeight: 700 }}>
      {value}{main && <span style={{ color: T.ok }}>·메인</span>}{tag}
    </strong>
  );
};

const rankTitle = (r) => {
  const { value, src, seen, main } = pickRepRank(r);
  const head = !seen
    ? '미관측'
    : value == null
      ? (r?.view_ok ? '메인창 노출 (순위 미측정)' : `순위 밖 (${src === 'user' ? '사용자' : '관리자'})`)
      : `관련도 ${value}위${main ? ' · 메인창 노출' : ''} (${src === 'user' ? '사용자 등록' : '관리자 관측'})`;
  return (
    `${head}\n` +
    `관측 관리자 ${r?.observation_count || 0} · 사용자 ${r?.user_rank_count || 0}`
  );
};

// 대표순위 방향 판정 — cur=이번 시점, prev=직전 시점의 observed_rank (null=순위밖)
// 숫자 작을수록 상위. timeline은 최신순(desc)이므로 prev = 다음 인덱스.
const TREND = {
  up:    { icon: '↑', label: '상승중', color: T.ok },
  flat:  { icon: '→', label: '보합',   color: T.textMuted },
  down:  { icon: '↓', label: '하락중', color: T.danger },
  enter: { icon: '✨', label: '신규진입', color: T.accent },
  exit:  { icon: '✗', label: '이탈',   color: T.textFaint },
};

const calcTrend = (cur, prev) => {
  const c = typeof cur === 'number' && cur > 0 ? cur : null;
  const p = typeof prev === 'number' && prev > 0 ? prev : null;
  if (c == null && p == null) return null;     // 둘 다 순위 밖 → 표시 안 함
  if (c != null && p == null) return TREND.enter; // 없다가 생김
  if (c == null && p != null) return TREND.exit;  // 있다 사라짐
  if (c < p) return TREND.up;    // 5→2 = 상승
  if (c > p) return TREND.down;  // 2→8 = 하락
  return TREND.flat;             // 동일
};

// [세션84] 노출체크·주기·6축 변화·systemVerdict 는 이 화면에서 뺐다(관측 화면 담당).
//   순위 입력은 여기 남긴다 — 발행 확인과 순위 입력은 같은 동선이라 나누면 클릭만 늘어난다.
//   rank_detail 6키 스키마·기존 기록·저장 API 무변경.
// [v0.9] KPI 셀 — 라벨 작게, 숫자 크게. 숫자가 먼저 읽혀야 한다.
function Kpi({ label, v, big }) {
  return (
    <span style={KPI.cell}>
      <span style={KPI.label}>{label}</span>
      <b style={{ ...KPI.value, ...(big ? KPI.valueBig : null) }}>{v == null ? '-' : v}</b>
    </span>
  );
}
const KPI = {
  cell: { display: 'inline-flex', alignItems: 'baseline', gap: 5 },
  label: { fontSize: 11, color: '#8b93a1' },
  value: { fontSize: 14, fontWeight: 700 },
  valueBig: { fontSize: 17 },
};

export default function AdminPublish() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const [rows, setRows] = useState([]);
  // [세션83] 서버 조회 메타 — 전체 건수·페이지·업종 목록. 목록 자체는 페이지 단위로만 받는다.
  const [meta, setMeta] = useState({ summary: null, page: null, industries: [], industryStats: [], industryTotal: null });
  // 조회 조건(서버 전달). 값이 바뀌면 fetchList 가 재실행된다.
  const [fStatus, setFStatus] = useState('all');
  const [fSort, setFSort] = useState('recent');
  const [fIndustry, setFIndustry] = useState('');
  const [fCat, setFCat] = useState('');   // 대분류 — 업종 미선택 시 하위 코드 전체를 industries 로 전송
  const [fWin, setFWin] = useState(0);    // 기간창(일). 0=전체 · 30 · 7 — API from 파라미터(생성일 기준)
  const [fQ, setFQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [fPage, setFPage] = useState(1);
  const [fSize, setFSize] = useState(100);
  const [selectedId, setSelectedId] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [timeline, setTimeline] = useState([]);
  // [세션81] 사용자 순위등록(post_ranks). 관리자 관측(timeline)과 별개 SoT — 합치지 않고 나란히 둔다.
  const [userRanks, setUserRanks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlSaving, setUrlSaving] = useState(false);
  // [세션85] 상세패널 액션 — 재발행 · 수정 · 삭제
  const [actBusy, setActBusy] = useState('');        // '' | 'republish' | 'update' | 'delete'
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [reOpen, setReOpen] = useState(false);
  const [reUrl, setReUrl] = useState('');
  const [reReset, setReReset] = useState(false);
  // 수동 발행 등록 (사후 연결) — 91차
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manual, setManual] = useState({
    naver_post_url: '',
    title: '',
    keyword: '',
    industry: 'dental',
    content: '',
  });

  // [v0.8] 기간창 → from(YYYY-MM-DD). 축은 created_at(생성일) — API from/to 와 동일 기준.
  //   "최근 엔진이 좋아졌는가"는 생성 시점으로 끊어야 답이 나온다. 관측일로 끊으면 옛 글이 섞인다.
  const winFrom = fWin > 0
    ? new Date(Date.now() - (fWin - 1) * 864e5).toISOString().slice(0, 10)
    : '';

  // [v0.9] KPI 표기 — 지금 화면이 무엇을 세고 있는지 한 줄로 밝힌다.
  const winLabel = fWin > 0 ? `최근 ${fWin}일` : '전체 기간';
  const scopeLabel = fIndustry ? ` · ${industryLabel(fIndustry)}` : (fCat ? ` · ${fCat}` : '');

  // 대분류 하위 업종코드 — 카탈로그 기준(고정). fetch 의존성으로 안전하게 쓰기 위해 목록 데이터와 분리한다.
  const catCodes = fCat ? (CODES_BY_CATEGORY[fCat] || []) : [];
  const catCodesKey = catCodes.join(',');

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const qs = new URLSearchParams({
        status: fStatus, sort: fSort, page: String(fPage), size: String(fSize),
      });
      if (fIndustry) qs.set('industry', fIndustry);
      // [v0.8] 대분류만 선택 → 하위 업종코드 전체를 industries 로 전달(서버 OR 조회).
      else if (catCodesKey) qs.set('industries', catCodesKey);
      if (fQ) qs.set('q', fQ);
      if (winFrom) qs.set('from', winFrom);

      const r = await fetch(`/api/admin/publish-list?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) {
        alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        alert('관리자 권한이 필요합니다.');
        return;
      }
      const j = await r.json();
      if (j.ok) {
        setRows(j.rows || []);
        setMeta({
          summary: j.summary || null, page: j.page || null, industries: j.industries || [],
          industryStats: j.industry_stats || [], industryTotal: j.industry_total || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, router, fStatus, fSort, fIndustry, catCodesKey, fQ, fPage, fSize, winFrom]);

  // 조건이 바뀌면 항상 1페이지로. 마지막 페이지에서 필터를 바꿔 빈 화면이 나오는 것을 막는다.
  const applyFilter = useCallback((fn) => { fn(); setFPage(1); }, []);

  // [v0.8] 대분류 → 업종 묶음. 카탈로그 category 기준(SoT), 미등재 코드는 '기타'.
  const industriesByCat = {};
  for (const code of (meta.industries || [])) {
    const c = industryCategory(code);
    (industriesByCat[c] = industriesByCat[c] || []).push(code);
  }
  for (const c of Object.keys(industriesByCat)) {
    industriesByCat[c].sort((a, b) => industryLabel(a).localeCompare(industryLabel(b), 'ko'));
  }
  // 전체 평균순위 — 업종별 평균의 단순평균이 아니라 순위 보유 건수 가중평균.
  //   서버가 업종 단위까지만 주므로 여기서 합산한다(표시 전용, 저장 없음).
  const avgRankAll = (() => {
    const list = meta.industryStats || [];
    let sum = 0, cnt = 0;
    for (const st of list) {
      if (st.avg_rank == null) continue;
      const w = st.observed - st.rank_out;   // 순위가 잡힌 글 수(가중치)
      if (w > 0) { sum += st.avg_rank * w; cnt += w; }
    }
    return cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : null;
  })();

  const catOptions = Object.keys(industriesByCat)
    .sort((a, b) => {
      const ia = INDUSTRY_CATEGORY_ORDER.indexOf(a), ib = INDUSTRY_CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  const resetFilter = useCallback(() => {
    setFStatus('all'); setFSort('recent'); setFIndustry(''); setFCat(''); setFWin(0); setFQ(''); setQInput(''); setFPage(1);
  }, []);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const r = await fetch(`/api/admin/observations?publish_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401 || r.status === 403) {
      // 알림은 한 번만 — fetchList에서 이미 안내될 수 있으므로 silent fallthrough
      return;
    }
    const j = await r.json();
    if (j.ok) {
      setSnapshot(j.snapshot || null);
      setTimeline(j.timeline || []);
      setUserRanks(j.user_ranks || []); // [세션81]
    }
  }, [getToken, router]);

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState, router]);

  // owner 확정 시에만 최초 로드 (기존 가드 effect의 fetchList() 호출 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    fetchList();
  }, [authState, session, fetchList]);

  // ?id= query param → 자동선택
  // [세션83] 페이지네이션 도입으로 딥링크 대상이 현재 페이지에 없을 수 있다(관측목록 「상세」 등).
  //   그 경우 해당 id 로 서버 검색을 한 번 걸어 데려온다. 재시도는 1회(deepLinkTried)로 제한 —
  //   찾지 못했을 때 무한 재조회를 막는다.
  const deepLinkTried = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedId !== null) return;
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('id');
    if (!qid) return;
    const idNum = Number(qid);
    if (Number.isNaN(idNum)) return;
    if (rows.find((r) => r.id === idNum)) {
      setSelectedId(idNum);
      return;
    }
    if (rows.length === 0) return;         // 최초 로딩 중
    if (deepLinkTried.current) return;
    deepLinkTried.current = true;
    setFStatus('all'); setFIndustry(''); setFSort('recent'); setFPage(1);
    setQInput(String(idNum)); setFQ(String(idNum));
  }, [rows, selectedId]);

  useEffect(() => {
    fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const selectedRow = rows.find((r) => r.id === selectedId);
  const links = buildNaverLinks(selectedRow);

  // 화면 입력 → 저장 스키마 변환. 관리자에게 내부 필드명을 노출하지 않는다.
  const buildObsBody = (publishId, f, lk) => {
    const out = !!f.not_exposed;
    const rank = !out && f.related ? parseInt(String(f.core_rank).trim(), 10) : null;
    const hasRank = Number.isFinite(rank) && rank > 0;
    return {
      publish_id: publishId,
      alive_status: out ? 'fossil' : 'alive',
      view_ok: !out && !!f.main,
      related_ok: !out && !!f.related,
      rank_detail: hasRank ? { core_related: rank } : {},
      memo: f.memo || null,
      observed_keyword: lk?.keyword ?? null,
    };
  };

  // [세션84] 관측 저장 — 경로 무변경(POST /api/admin/observations).
  //   관리자는 하루 수십 건을 넣는다. 선택 → 검색 → 입력 → 저장까지 이 패널에서 끝낸다.
  const saveObservation = async () => {
    if (!selectedId || saving) return;
    if (!form.main && !form.related && !form.not_exposed) { alert('관측 결과를 선택해 주세요 (메인창 / 관련도 / 미노출).'); return; }
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) { router.replace('/login'); return; }
      const r = await fetch('/api/admin/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildObsBody(selectedId, form, links)),
      });
      if (r.status === 401) { alert('인증이 만료되었습니다. 다시 로그인해 주세요.'); router.replace('/login'); return; }
      if (r.status === 403) { alert('관리자 권한이 필요합니다.'); return; }
      const j = await r.json();
      if (!j.ok) { alert(`저장 실패: ${j.error || ''}`); return; }
      setForm(defaultForm());
      await fetchDetail(selectedId);
      setRows((rs) => rs.map((row) => (row.id === selectedId && j.snapshot
        ? {
            ...row,
            ...j.snapshot,
            observation_count: (row.observation_count || 0) + 1,
            obs_total: (row.obs_total ?? row.observation_count ?? 0) + 1,
          }
        : row)));
    } catch (e) {
      alert(`네트워크 에러: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveObservation(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, form, saving]);

  const changeStatus = async (newStatus) => {
    if (!selectedId) return;
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const r = await fetch('/api/admin/publish-status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publish_id: selectedId, status: newStatus }),
    });

    if (r.status === 401) {
      alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
      router.replace('/login');
      return;
    }
    if (r.status === 403) {
      alert('관리자 권한이 필요합니다.');
      return;
    }

    const j = await r.json();
    if (j.ok) {
      setRows((rs) =>
        rs.map((row) =>
          row.id === selectedId ? { ...row, status: newStatus } : row
        )
      );
      setSnapshot((s) => (s ? { ...s, status: newStatus } : s));
    }
  };

  // 보정 길A — naver_post_url 사후 주입 (별도 경로 publish-correct-url.js)
  const correctUrl = async () => {
    if (!selectedId) return;
    const url = urlInput.trim();
    if (!url) {
      alert('네이버 글 URL을 입력해 주세요.');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setUrlSaving(true);
    try {
      const r = await fetch('/api/admin/publish-correct-url', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publish_id: selectedId, naver_post_url: url }),
      });

      if (r.status === 401) {
        alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        alert('관리자 권한이 필요합니다.');
        return;
      }

      const j = await r.json();
      if (j.ok) {
        const saved = j.corrected || {};
        setRows((rs) =>
          rs.map((row) =>
            row.id === selectedId
              ? {
                  ...row,
                  naver_post_url: saved.naver_post_url || url,
                  publish_status: saved.publish_status || 'published',
                }
              : row
          )
        );
        setUrlInput('');
        alert('URL 보정 완료 — published 전환됨.');
      } else if (j.error === 'url_already_set') {
        alert('이미 URL이 등록된 글입니다: ' + (j.current || ''));
      } else if (j.error === 'invalid_naver_post_url') {
        alert('네이버 블로그 URL 형식이 아닙니다. (naver.com 도메인만 허용)');
      } else if (j.error === 'not_found') {
        alert('해당 글을 찾을 수 없습니다.');
      } else {
        alert('보정 실패: ' + (j.error || ''));
      }
    } catch (e) {
      alert('보정 오류: ' + e.message);
    } finally {
      setUrlSaving(false);
    }
  };

  // 수동 발행 등록 — 이미 네이버에 발행된 글을 publish_history에 사후 연결
  // 경로: publish-secure.js (Bearer 검증 + account_id 주입 + secret 동봉) → publish.js
  // 백엔드 무수정. owner는 quota skip. qc_score:0 (수동이라 QC 없음)
  const registerManual = async () => {
    const url = manual.naver_post_url.trim();
    const title = manual.title.trim();
    const keyword = manual.keyword.trim();
    const industry = manual.industry.trim();
    const content = manual.content.trim();

    if (!url || !title || !keyword || !industry || !content) {
      alert('URL · 제목 · 키워드 · 업종 · 본문을 모두 입력해 주세요.');
      return;
    }
    if (!/^https?:\/\//.test(url)) {
      alert('URL은 http(s)://로 시작해야 합니다.');
      return;
    }
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setManualSaving(true);
    try {
      const r = await fetch('/api/publish-secure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // publish.js 필수 필드
          blog_account: 'manual',
          naver_post_url: url,
          industry,
          keyword,
          title,
          content,
          qc_score: 0, // 수동 등록 — QC 미실행
          // 식별 메타
          model: 'manual',
          generated_version: 'manual-register',
          is_personal_post: true,
          // account_id는 보내지 않음 → publish-secure가 검증값 주입
        }),
      });

      if (r.status === 401) {
        alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        const j = await r.json().catch(() => ({}));
        alert('권한/쿼터 차단: ' + (j.error || r.status));
        return;
      }

      const j = await r.json();
      if (j.ok) {
        alert(`수동 등록 완료 — id=${j.id}`);
        setManual({
          naver_post_url: '',
          title: '',
          keyword: '',
          industry,
          content: '',
        });
        setManualOpen(false);
        await fetchList();
        if (j.id) setSelectedId(j.id);
      } else {
        alert('등록 실패: ' + (j.error || '알 수 없는 오류'));
      }
    } catch (e) {
      alert('등록 오류: ' + e.message);
    } finally {
      setManualSaving(false);
    }
  };

  // ── [세션85] 상세패널 액션 ──────────────────────────────────────────────
  const callAction = async (path, body) => {
    const token = await getToken();
    if (!token) { router.replace('/login'); return null; }
    const r = await fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (r.status === 401) { alert('인증이 만료되었습니다. 다시 로그인해 주세요.'); router.replace('/login'); return null; }
    if (r.status === 403) { alert('관리자 권한이 필요합니다.'); return null; }
    return r.json();
  };

  // 재발행 = URL 재연결 + 발행 상태 갱신. 글 재생성 아님(엔진 무접촉).
  const doRepublish = async () => {
    if (!selectedId) return;
    const url = reUrl.trim();
    if (!url) { alert('새 네이버 글 URL을 입력해 주세요.'); return; }
    if (reReset && !confirm('관측 기록을 삭제합니다. 되돌릴 수 없습니다. 진행할까요?')) return;
    setActBusy('republish');
    try {
      const j = await callAction('/api/admin/publish-republish', {
        publish_id: selectedId, naver_post_url: url, reset_observation: reReset,
      });
      if (!j) return;
      if (j.ok) {
        const saved = j.republished || {};
        setRows((rs) => rs.map((row) => (row.id === selectedId
          ? { ...row, naver_post_url: saved.naver_post_url, publish_status: 'published' } : row)));
        setReOpen(false); setReUrl(''); setReReset(false);
        fetchDetail(selectedId);
        alert(`재발행 완료${j.observation_removed ? ` · 관측 ${j.observation_removed}건 삭제` : ''}`);
      } else if (j.error === 'same_url') alert('현재 URL과 동일합니다.');
      else if (j.error === 'invalid_naver_post_url') alert('네이버 블로그 URL 형식이 아닙니다.');
      else if (j.error === 'row_deleted') alert('삭제된 글입니다. 먼저 복원해 주세요.');
      else alert('재발행 실패: ' + (j.error || ''));
    } finally { setActBusy(''); }
  };

  // 수정 = 제목만. 본문·키워드는 API 화이트리스트에서 차단된다.
  const doUpdate = async () => {
    if (!selectedId) return;
    const t = editTitle.trim();
    if (!t) { alert('제목을 입력해 주세요.'); return; }
    setActBusy('update');
    try {
      const j = await callAction('/api/admin/publish-update', { publish_id: selectedId, title: t });
      if (!j) return;
      if (j.ok) {
        setRows((rs) => rs.map((row) => (row.id === selectedId ? { ...row, title: t } : row)));
        setSnapshot((s) => (s ? { ...s, title: t } : s));
        setEditOpen(false);
      } else alert('수정 실패: ' + (j.error || ''));
    } finally { setActBusy(''); }
  };

  // 삭제 = 숨김. 관측(publish_metrics·post_ranks)은 보존된다.
  const doDelete = async () => {
    if (!selectedId) return;
    if (!confirm('목록에서 숨깁니다. 관측 기록은 보존되며 복원할 수 있습니다. 진행할까요?')) return;
    setActBusy('delete');
    try {
      const j = await callAction('/api/admin/publish-delete', { publish_id: selectedId });
      if (!j) return;
      if (j.ok) {
        setRows((rs) => rs.filter((row) => row.id !== selectedId));
        setSelectedId(null); setSnapshot(null); setTimeline([]); setUserRanks([]);
        alert(`삭제 완료 · 관측 ${j.observation_preserved}건 보존됨`);
      } else if (j.error === 'already_deleted') alert('이미 삭제된 글입니다.');
      else alert('삭제 실패: ' + (j.error || ''));
    } finally { setActBusy(''); }
  };

  // 94차 — CSV export (Bearer 전파)
  // 90차 accounts.js 패턴 답습: Blob + BOM + 동적 <a> + 1초 지연 revoke
  const exportCSV = async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      // [세션86] 화면과 파일이 같아야 백업본을 신뢰할 수 있다 — 현재 필터를 그대로 넘긴다.
      const eqs = new URLSearchParams({ status: fStatus, sort: fSort });
      if (fIndustry) eqs.set('industry', fIndustry);
      else if (catCodesKey) eqs.set('industries', catCodesKey);
      if (fQ) eqs.set('q', fQ);
      if (winFrom) eqs.set('from', winFrom);
      const r = await fetch(`/api/admin/observations-export?${eqs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) {
        alert('인증이 만료되었습니다. 다시 로그인해 주세요.');
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        alert('관리자 권한이 필요합니다.');
        return;
      }
      if (!r.ok) {
        alert('CSV 다운로드 실패');
        return;
      }
      const blob = await r.blob();
      // BOM 처리: 서버가 이미 BOM 포함이면 중복되지 않게 그대로 사용
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `observations_${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      alert('CSV 다운로드 오류: ' + e.message);
    }
  };

  // 세션76: 인증 대기 화면에도 동일 상단 바. 상태 전환 시 네비가 사라지지 않는다.
  if (authState === 'checking' || authLoading) {
    return <AdminLayout current="/admin/publish" theme="dark"><div style={S.gate}>인증 확인 중…</div></AdminLayout>;
  }
  if (authState === 'unauth' || authState === 'non-owner') {
    return <AdminLayout current="/admin/publish" theme="dark"><div style={S.gate}>로그인 페이지로 이동 중…</div></AdminLayout>;
  }

  return (
    <AdminLayout current="/admin/publish" fluid theme="dark">
      <div style={{ ...S.wrap, height: 'auto', flex: '1 1 auto', minHeight: 0 }}>
      {/* 좌측 리스트 */}
      <div style={S.left}>
        <div style={S.leftHeader}>
          {/* 세션76: members·usage 와 동일한 「제목 + 한 줄 설명」 형식으로 통일. */}
          <div style={{ minWidth: 0 }}>
            <div style={S.leftTitleLine}>
              <h2 style={S.leftTitle}>발행 관리</h2>
              <span style={S.leftCount}>
                {meta.page ? meta.page.total : rows.length}
                {meta.summary && meta.page && meta.page.total !== meta.summary.total
                  ? <span style={S.leftCountSub}> / {meta.summary.total}</span>
                  : null}
              </span>
              <span style={S.leftVer}>v0.7</span>
              {/* [세션86] 관측 Queue — 화면 신설 없음. 「오늘 무엇을 관측하지」를 사람이 기억하지 않게 한다. */}
              {meta.summary?.queue?.today > 0 && (
                <button
                  onClick={() => applyFilter(() => { setFStatus(fStatus === 'due' ? 'all' : 'due'); setFSort(fStatus === 'due' ? 'recent' : 'queue'); })}
                  style={{ ...S.queueBadge, ...(fStatus === 'due' ? S.queueBadgeOn : null) }}
                  title={`오늘 관측 ${meta.summary.queue.today}건 (신규 ${meta.summary.queue.fresh} · 지연 ${meta.summary.queue.overdue})`
                    + `\n익일 이월 ${meta.summary.queue.deferred}건 · 운영 창 ${meta.summary.queue.window_days}일 밖 ${meta.summary.queue.archived}건`}
                >
                  관측 요청 {meta.summary.queue.today}
                  {meta.summary.queue.overdue > 0 && <span style={S.queueOver}> · 지연 {meta.summary.queue.overdue}</span>}
                  {meta.summary.queue.deferred > 0 && <span style={S.queueOver}> · 이월 {meta.summary.queue.deferred}</span>}
                </button>
              )}
            </div>
            {/* 화면 문구에 결정 번호를 노출하지 않는다. 근거는 Decision Log(DEC-017)에만 남긴다. */}
            <div style={S.leftSub}>전체 발행 이력을 검색하고 관리합니다.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
            <button
              onClick={() => setManualOpen((v) => !v)}
              style={{ ...S.btnSm, ...(manualOpen ? { background: T.accent, color: '#fff', borderColor: T.accent } : null) }}
              title="이미 네이버에 발행된 글을 수동으로 등록 (사후 연결)"
            >
              ＋ 수동 등록
            </button>
            <button
              onClick={exportCSV}
              style={S.btnSm}
              title="publish_observations 전체 CSV 다운로드 (UTF-8 BOM)"
            >
              📥 CSV
            </button>
            <button onClick={fetchList} disabled={loading} style={S.btnSm}>
              {loading ? '...' : '↻'}
            </button>
          </div>
        </div>
        {/* 수동 발행 등록 폼 — 91차 (이미 발행된 글 사후 연결) */}
        {manualOpen && (
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${T.border}`,
              background: T.surfaceAlt,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="네이버 글 URL (https://blog.naver.com/...)"
                value={manual.naver_post_url}
                onChange={(e) => setManual((m) => ({ ...m, naver_post_url: e.target.value }))}
                style={S.manualInput}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="제목"
                value={manual.title}
                onChange={(e) => setManual((m) => ({ ...m, title: e.target.value }))}
                style={{ ...S.manualInput, flex: 2 }}
              />
              <input
                type="text"
                placeholder="핵심 키워드"
                value={manual.keyword}
                onChange={(e) => setManual((m) => ({ ...m, keyword: e.target.value }))}
                style={{ ...S.manualInput, flex: 1 }}
              />
              <input
                type="text"
                placeholder="업종코드"
                title="API 저장값 — 코드로 입력 (예: dental, interior)"
                value={manual.industry}
                onChange={(e) => setManual((m) => ({ ...m, industry: e.target.value }))}
                style={{ ...S.manualInput, width: 70, flex: 'none' }}
              />
            </div>
            <textarea
              placeholder="본문 전체 붙여넣기 (관측·분석용 저장)"
              value={manual.content}
              onChange={(e) => setManual((m) => ({ ...m, content: e.target.value }))}
              rows={4}
              style={{
                ...S.manualInput,
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={() => setManualOpen(false)} style={S.btnSm}>
                취소
              </button>
              <button
                onClick={registerManual}
                disabled={manualSaving}
                style={{ ...S.btnSm, background: T.accent, color: '#fff', borderColor: T.accent }}
              >
                {manualSaving ? '등록 중...' : '발행 기록 등록'}
              </button>
            </div>
          </div>
        )}
        {/* [세션83] 필터바 — 운영자는 스크롤로 찾지 않는다. 검색·필터가 먼저다. */}
        <div style={S.filterBar}>
          <div style={S.filterRow}>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilter(() => setFQ(qInput)); }}
              placeholder="제목 · 업종 · 지역 · id 검색"
              style={{ ...S.filterInput, flex: 1, minWidth: 260 }}
            />
            <button onClick={() => applyFilter(() => setFQ(qInput))} style={S.btnXs}>조회</button>
            {(fQ || fIndustry || fCat || fWin || fStatus !== 'all' || fSort !== 'recent') && (
              <button onClick={resetFilter} style={S.btnXs} title="필터 초기화">✕</button>
            )}
          </div>
          <div style={S.filterRow}>
            {/* [v0.9] 기간창을 필터 맨 앞으로 — 운영자가 가장 자주 바꾸는 축이다. 생성일 기준. */}
            <div style={S.winGroup}>
              {[{ v: 0, l: '전체' }, { v: 30, l: '30일' }, { v: 7, l: '7일' }].map((w) => (
                <button
                  key={w.v}
                  onClick={() => applyFilter(() => setFWin(w.v))}
                  style={{ ...S.winBtn, ...(fWin === w.v ? S.winBtnOn : null) }}
                  title="생성일 기준"
                >
                  {w.l}
                </button>
              ))}
            </div>
            <select value={fStatus} onChange={(e) => applyFilter(() => setFStatus(e.target.value))} style={S.filterSelect}>
              <option value="all">전체</option>
              <option value="published">발행완료(URL)</option>
              <option value="draft">생성만</option>
              <option value="observed">관측됨</option>
              <option value="unobserved">미관측</option>
              <option value="due">오늘 관측{meta.summary?.queue ? ` (${meta.summary.queue.today})` : ''}</option>
              {/* [v1.0] 봤는데 없었던 글 — 사용자 「찾지 못했어요」 + 관리자 관측 미노출. 엔진 검증 1순위. */}
              <option value="user_notfound">미발견(사용자·관리자)</option>
            </select>
            {/* [v0.8] 2단 선택 — 대분류(화면 전용, 서버 미전송) → 업종(코드, 서버 전송).
                 업종이 200개가 되어도 목록이 무너지지 않는다. API 파라미터는 industry 하나 그대로. */}
            <select
              value={fCat}
              onChange={(e) => applyFilter(() => { setFCat(e.target.value); setFIndustry(''); })}
              style={S.filterSelect}
            >
              <option value="">전체 대분류</option>
              {/* 대분류는 업종과 구분되게 표식을 준다(옵션 폰트는 브라우저 제약이라 기호로 처리). */}
              {catOptions.map((c) => <option key={c} value={c}>▶ {c}</option>)}
            </select>
            <select value={fIndustry} onChange={(e) => applyFilter(() => setFIndustry(e.target.value))} style={S.filterSelect}>
              <option value="">{fCat ? `${fCat} 전체` : '전체 업종'}</option>
              {/* 표시=한글명 / value=코드(API 파라미터 불변). 대분류 미선택 시 그룹 머리글로 묶어 보여준다. */}
              {fCat
                ? industriesByCat[fCat].map((i) => <option key={i} value={i}>{industryLabel(i)}</option>)
                : catOptions.map((c) => (
                    <optgroup key={c} label={c}>
                      {industriesByCat[c].map((i) => <option key={i} value={i}>{industryLabel(i)}</option>)}
                    </optgroup>
                  ))}
            </select>
            <select value={fSort} onChange={(e) => applyFilter(() => setFSort(e.target.value))} style={S.filterSelect}>
              <option value="recent">최신순</option>
              <option value="oldest">오래된순</option>
              <option value="published_recent">발행일순</option>
              <option value="obs_recent">최근관측순</option>
              <option value="queue">관측순서</option>
              <option value="rank_desc">순위 하락순</option>
              <option value="rank_asc">순위 상위순</option>
            </select>
            <select value={fSize} onChange={(e) => applyFilter(() => setFSize(Number(e.target.value)))} style={S.filterSelect}>
              {[50, 100, 200].map((n) => <option key={n} value={n}>{n}건</option>)}
            </select>

          </div>
        </div>

        {/* [v0.9] KPI 한 줄 — 운영자는 표보다 숫자를 먼저 본다. 항상 노출, 현재 필터 기준. */}
        {meta.industryTotal && (
          <div style={S.kpiBar}>
            <span style={S.kpiScope}>{winLabel}{scopeLabel}</span>
            <Kpi label="발행" v={meta.industryTotal.published} />
            <Kpi label="관측" v={meta.industryTotal.observed} />
            <Kpi label="1위" v={meta.industryTotal.top1} />
            <Kpi label="1페이지" v={meta.industryTotal.page1} />
            <Kpi label="미노출" v={meta.industryTotal.rank_out} />
            <Kpi label="미발견" v={meta.industryTotal.not_found} />
            <Kpi label="노출률" v={meta.industryTotal.exposure_rate == null ? '-' : `${meta.industryTotal.exposure_rate}%`} big />
            <Kpi label="평균순위" v={avgRankAll == null ? '-' : avgRankAll} big />
          </div>
        )}

        {/* [v0.8] 업종별 건강도 — 대분류로 좁혔을 때 "어느 업종이 문제인가"를 먼저 답한다.
             수치는 현재 필터 결과 기준(서버 계산). 노출률 분모 = 관측된 글. */}
        {fCat && meta.industryStats && meta.industryStats.length > 0 && (
          <div style={S.statBox}>
            <div style={S.statHead}>
              <b>{fCat}</b>
              <span style={S.statHeadSub}>
                {fWin > 0 ? `최근 ${fWin}일 · ` : '전체 · '}
                발행 {meta.industryTotal?.published ?? 0}건 · 1위 {meta.industryTotal?.top1 ?? 0} ·
                1페이지 {meta.industryTotal?.page1 ?? 0} · 미노출 {meta.industryTotal?.rank_out ?? 0}
                {meta.industryTotal?.exposure_rate != null && ` · 노출률 ${meta.industryTotal.exposure_rate}%`}
              </span>
            </div>
            <table style={S.table}>
              <thead>
                <tr style={S.th}>
                  <td style={S.td}>업종</td>
                  <td style={S.td}>발행</td>
                  <td style={S.td}>관측</td>
                  <td style={S.td}>1위</td>
                  <td style={S.td}>1페이지</td>
                  <td style={S.td}>미노출</td>
                  <td style={S.td}>미발견</td>
                  <td style={S.td}>평균순위</td>
                  <td style={S.td}>노출률</td>
                </tr>
              </thead>
              <tbody>
                {meta.industryStats.map((st) => (
                  <tr
                    key={st.industry}
                    onClick={() => applyFilter(() => setFIndustry(st.industry))}
                    style={{ ...S.tr, background: st.industry === fIndustry ? 'rgba(59,130,246,.16)' : 'transparent' }}
                    title="클릭: 이 업종만 조회"
                  >
                    <td style={S.td}>{industryLabel(st.industry)}</td>
                    <td style={S.td}>{st.published}</td>
                    <td style={S.td}>{st.observed}</td>
                    <td style={S.td}>{st.top1 || '-'}</td>
                    <td style={S.td}>{st.page1 || '-'}</td>
                    <td style={{ ...S.td, color: st.rank_out > 0 ? T.textFaint : undefined }}>{st.rank_out || '-'}</td>
                    <td style={S.td}>{st.not_found || '-'}</td>
                    <td style={S.td}>{st.avg_rank == null ? '-' : st.avg_rank}</td>
                    <td style={S.td}>{st.exposure_rate == null ? '-' : `${st.exposure_rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={S.listScroll}>
          <table style={S.table}>
            <thead>
              <tr style={S.th}>
                <td style={S.td}>id</td>
                <td style={{ ...S.td, ...S.urlCell }}>URL</td>
                <td style={S.td}>title</td>
                <td style={S.td}>업종</td>
                <td style={S.td}>created</td>
                <td style={S.td}>생존</td>
                <td style={S.td}>발행</td>
                <td style={S.td}>순위</td>
                <td style={S.td}>🔍</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowLinks = buildNaverLinks(r);
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    style={{
                      ...S.tr,
                      // [세션84] 행 배경에서 상태색 제거 — 관측이 쌓이면 목록 전체가 초록이 된다.
                      //   상태는 순위 컬럼(메인/숫자/미노출)이 이미 말한다. 배경은 선택 표시에만 쓴다.
                      background: r.id === selectedId ? 'rgba(59,130,246,.16)' : 'transparent',
                      fontWeight: r.id === selectedId ? 600 : 400,
                    }}
                  >
                    <td style={S.td}>
                      {r.id}
                      {(r.queue_state === 'due' || r.queue_state === 'overdue') && (
                        <span
                          style={r.queue_state === 'overdue' ? S.qChipOver : S.qChipDue}
                          title={`${QUEUE_REASON[r.queue_reason] || '관측 대상'} · 권장 관측일 ${r.next_due_at}${r.overdue_days ? ` · ${r.overdue_days}일 경과` : ''}`}
                        >
                          {r.queue_state === 'overdue' ? `+${r.overdue_days}` : (QUEUE_MARK[r.queue_reason] || '●')}
                        </span>
                      )}
                    </td>
                    <td style={{ ...S.td, ...S.urlCell }}>
                      <UrlDot on={hasUrl(r)} />
                    </td>
                    <td style={{ ...S.td, ...S.titleCell }}>
                      {r.title || '-'}
                    </td>
                    <td style={S.td} title={r.industry || ''}>{industryLabel(r.industry)}</td>
                    <td style={S.td}>{fmtDate(r.created_at)}</td>
                    <td style={S.td}>{r.survival_days == null ? '-' : `${r.survival_days}d`}</td>
                    <td style={{ ...S.td, color: hasUrl(r) ? T.ok : T.textFaint }}>
                      {hasUrl(r) ? '발행완료' : '생성만'}
                    </td>
                    {/* [세션82 · 3단계] 목록은 「지금 몇 위인가」를 본다. 관측 횟수는 상세 Timeline 담당.
                        obs(건수) 컬럼은 폐기 — 관리자가 순위로 오독하는 문제가 실제로 발생했다.
                        건수는 hover 로만 남긴다. */}
                    <td style={S.td} title={rankTitle(r)}>
                      <RankCell r={r} />
                    </td>
                    <td style={S.td}>
                      {rowLinks && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAll(rowLinks);
                          }}
                          style={S.searchBtnSm}
                          title={`"${rowLinks.keyword}" 3종 검색`}
                        >
                          🔍
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* [세션83] 페이저 — 조회 범위가 아니라 표시 단위다. 전체 이력은 항상 접근 가능하다. */}
        {meta.page && (
          <div style={S.pager}>
            <button onClick={() => setFPage(1)} disabled={meta.page.page <= 1 || loading} style={S.pagerBtn}>«</button>
            <button onClick={() => setFPage(meta.page.page - 1)} disabled={meta.page.page <= 1 || loading} style={S.pagerBtn}>‹</button>
            <span style={S.pagerNow}>{meta.page.page} / {meta.page.total_pages}</span>
            <button onClick={() => setFPage(meta.page.page + 1)} disabled={meta.page.page >= meta.page.total_pages || loading} style={S.pagerBtn}>›</button>
            <button onClick={() => setFPage(meta.page.total_pages)} disabled={meta.page.page >= meta.page.total_pages || loading} style={S.pagerBtn}>»</button>
            <span style={S.pagerHint}>{meta.page.total}건</span>
          </div>
        )}
      </div>

      {/* 우측 디테일 */}
      <div style={S.right}>
        {!selectedId ? (
          // [v0.9] 미선택 상태 = 빈 화면이 아니라 요약. 운영자가 화면을 열자마자 상태를 읽는다.
          <div style={S.panel}>
            <div style={S.panelHead}>
              <div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{winLabel}{scopeLabel}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>현재 조회 요약</div>
              </div>
            </div>
            {meta.industryTotal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 2px' }}>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <Kpi label="발행" v={meta.industryTotal.published} big />
                  <Kpi label="관측" v={meta.industryTotal.observed} big />
                  <Kpi label="노출률" v={meta.industryTotal.exposure_rate == null ? '-' : `${meta.industryTotal.exposure_rate}%`} big />
                  <Kpi label="평균순위" v={avgRankAll == null ? '-' : avgRankAll} big />
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <Kpi label="1위" v={meta.industryTotal.top1} />
                  <Kpi label="1페이지" v={meta.industryTotal.page1} />
                  <Kpi label="미노출" v={meta.industryTotal.rank_out} />
            <Kpi label="미발견" v={meta.industryTotal.not_found} />
                </div>
                {/* 발행량 상위 업종 — 지금 어디에 힘이 들어가 있는지. 클릭하면 그 업종만 조회. */}
                {(meta.industryStats || []).length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 11.5, color: T.textFaint, marginBottom: 5 }}>발행 상위 업종</div>
                    <table style={S.table}>
                      <tbody>
                        {meta.industryStats.slice(0, 6).map((st) => (
                          <tr
                            key={st.industry}
                            onClick={() => applyFilter(() => setFIndustry(st.industry))}
                            style={S.tr}
                            title="클릭: 이 업종만 조회"
                          >
                            <td style={S.td}>{industryLabel(st.industry)}</td>
                            <td style={S.td}>{st.total}건</td>
                            <td style={S.td}>{st.exposure_rate == null ? '-' : `${st.exposure_rate}%`}</td>
                            <td style={S.td}>{st.avg_rank == null ? '-' : st.avg_rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2 }}>
                  좌측 목록에서 글을 선택하면 관측 입력 화면으로 바뀝니다.
                </div>
              </div>
            ) : (
              <div style={S.empty}>
                <div style={S.emptyIcon}>▤</div>
                <div>불러오는 중…</div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Snapshot */}
            <div style={S.panel}>
              <div style={S.panelHead}>
                <div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    #{selectedId} · {industryLabel(selectedRow?.industry)}
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}
                  >
                    {selectedRow?.title || '-'}
                  </div>
                </div>
                {/* [세션85] 액션 — 재발행 · 수정 · 삭제. 글 재생성은 여기 없다. */}
                <div style={S.actRow}>
                  <button
                    onClick={() => { setEditOpen((v) => !v); setEditTitle(selectedRow?.title || ''); setReOpen(false); }}
                    style={S.actBtn}
                  >수정</button>
                  <button
                    onClick={() => { setReOpen((v) => !v); setReUrl(''); setReReset(false); setEditOpen(false); }}
                    style={S.actBtn}
                  >재발행</button>
                  <button onClick={doDelete} disabled={actBusy === 'delete'} style={S.actBtnDanger}>
                    {actBusy === 'delete' ? '...' : '삭제'}
                  </button>
                </div>
                {SHOW_ALIVE_SELECT && (
                  <select
                    value={
                      snapshot?.status || selectedRow?.status || 'pending'
                    }
                    onChange={(e) => changeStatus(e.target.value)}
                    style={{
                      ...S.statusSel,
                      background:
                        STATUS_COLORS[
                          snapshot?.status ||
                            selectedRow?.status ||
                            'pending'
                        ],
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {editOpen && (
                <div style={S.actPane}>
                  <div style={S.actPaneHead}>제목 수정 <span style={S.actPaneHint}>오탈자 수준만. 본문·키워드는 수정 불가</span></div>
                  <div style={S.urlInputRow}>
                    <input
                      type="text" value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={S.urlInput}
                    />
                    <button onClick={doUpdate} disabled={actBusy === 'update'} style={{ ...S.btnSm, flex: '0 0 auto' }}>
                      {actBusy === 'update' ? '...' : '저장'}
                    </button>
                  </div>
                </div>
              )}
              {reOpen && (
                <div style={S.actPane}>
                  <div style={S.actPaneHead}>재발행 <span style={S.actPaneHint}>URL 재연결만. 글은 다시 생성되지 않음</span></div>
                  <div style={S.urlInputRow}>
                    <input
                      type="text" value={reUrl}
                      onChange={(e) => setReUrl(e.target.value)}
                      placeholder="https://blog.naver.com/..."
                      style={S.urlInput}
                    />
                    <button onClick={doRepublish} disabled={actBusy === 'republish'} style={{ ...S.btnSm, flex: '0 0 auto' }}>
                      {actBusy === 'republish' ? '...' : '연결'}
                    </button>
                  </div>
                  <label style={S.actChk}>
                    <input type="checkbox" checked={reReset} onChange={(e) => setReReset(e.target.checked)} />
                    <span>기존 관측 기록 삭제 (다른 글로 교체하는 경우에만)</span>
                  </label>
                </div>
              )}
              <div style={S.snapGrid}>
                <Field
                  label="publish"
                  value={fmtDate(
                    snapshot?.published_at ||
                      snapshot?.created_at ||
                      selectedRow?.created_at
                  )}
                />
                {/* [세션86] first_seen_at / latest_alive_at / survival_hours 는 실재하지 않는 컬럼이었다.
                    관측 축의 실값(최초·최근 관측일)과 발행일 기준 파생값으로 교체한다. */}
                <Field
                  label="first_obs"
                  value={fmtDate(snapshot?.first_observed_at)}
                />
                <Field
                  label="latest_obs"
                  value={fmtDate(snapshot?.latest_observed_at)}
                />
                <Field
                  label="survival"
                  value={survivalText(snapshot)}
                />
              </div>
              {/* 세션78 [1단계] 발행정보 — URL 상태 축. 보정 길A(publish-correct-url) 경로 무변경 */}
              {(() => {
                const curUrl =
                  (selectedRow?.naver_post_url || snapshot?.naver_post_url || '').trim();
                const st = curUrl ? URL_STATE.on : URL_STATE.off;
                return (
                  <div style={S.urlBox}>
                    <div style={S.urlHead}>
                      <span style={S.urlHeadTitle}>발행정보</span>
                      <span style={{ ...S.urlBadge, color: st.color, borderColor: st.color }}>
                        <UrlDot on={!!curUrl} /> {st.label}
                      </span>
                    </div>
                    {curUrl ? (
                      <a
                        href={curUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={S.urlLink}
                      >
                        {curUrl}
                      </a>
                    ) : (
                      <div style={S.urlInputRow}>
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://blog.naver.com/..."
                          style={S.urlInput}
                        />
                        <button
                          onClick={correctUrl}
                          disabled={urlSaving}
                          style={{ ...S.btnSm, flex: '0 0 auto' }}
                        >
                          {urlSaving ? '...' : 'URL 등록'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* [세션84] 대표 순위 — 읽기 전용 한 줄. 순위 입력·6축 분석은 관측 화면이 담당한다.
                  Publish 는 '이 글이 정상 발행됐는가'만 답한다(DEC-017 연장). */}
              {(() => {
                const c = (timeline && timeline[0]) || null;
                const u = (userRanks && userRanks[0]) || null;
                const src = c ? 'admin' : (u ? 'user' : null);
                const rank = c ? c.observed_rank : (u ? u.observed_rank : null);
                const mainOn = c ? c.view_ok === true : false;
                return (
                  <div style={S.repRow}>
                    <div style={S.repMain}>
                      <span style={S.repLabel}>대표 상태</span>
                      {src == null ? (
                        <span style={S.repNone}>미관측</span>
                      ) : rank != null ? (
                        <span style={{ ...S.repNum, color: src === 'user' ? T.accent : T.text }}>
                          관련도 {rank}<span style={S.repUnit}>위</span>
                        </span>
                      ) : mainOn ? (
                        <span style={{ ...S.repState, color: T.ok }}>메인창 노출</span>
                      ) : (
                        <span style={{ ...S.repState, color: T.textMuted }}>미노출</span>
                      )}
                      {rank != null && mainOn && <span style={S.repSub}>메인창에도 노출</span>}
                      {rank == null && mainOn && <span style={S.repSub}>관련도 순위 없음</span>}
                    </div>
                    <div style={S.repSide}>
                      <div style={S.repMeta}>
                        최근 관측 {c ? fmtDate(c.recorded_at) : (u ? fmtDate(u.recorded_at) : '—')}
                      </div>
                      <div style={S.repMeta}>
                        관리자 {timeline?.length || 0} · 사용자 {userRanks?.length || 0}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* [세션84] 검색 → 순위 입력 → 저장. 이 순서가 실제 관측 동선이다. */}
            {links && (
              <div style={S.panel}>
                <div style={S.obsKw}>
                  <span style={{ color: T.textMuted, fontSize: 11 }}>검색어</span>{' '}
                  <strong>{links.core}</strong>
                </div>
                <div style={S.rankGridLabel}>관측 결과</div>

                {/* 메인창·관련도는 중복 선택 가능. 미노출만 배타. */}
                <button
                  onClick={() => setForm((f) => ({ ...f, main: !f.main, not_exposed: false }))}
                  style={form.main ? S.chkOn : S.chkOff}
                >
                  {form.main ? '☑' : '☐'} 메인창 노출
                </button>

                <div style={S.obsLine}>
                  <button
                    onClick={() => setForm((f) => ({
                      ...f, related: !f.related, not_exposed: false,
                      core_rank: f.related ? '' : f.core_rank,
                    }))}
                    style={form.related ? S.chkOnInline : S.chkOffInline}
                  >
                    {form.related ? '☑' : '☐'} 관련도 노출
                  </button>
                  <input
                    type="number" min="1" inputMode="numeric" placeholder="—"
                    value={form.core_rank}
                    disabled={!form.related}
                    onChange={(e) => setForm((f) => ({ ...f, core_rank: e.target.value }))}
                    style={{ ...S.rankInput, width: 64, flex: '0 0 auto', opacity: form.related ? 1 : 0.45 }}
                  />
                  <span style={{ ...S.obsRankUnit, opacity: form.related ? 1 : 0.45 }}>위</span>
                </div>

                <button
                  onClick={() => setForm((f) => (f.not_exposed
                    ? { ...f, not_exposed: false }
                    : { ...f, not_exposed: true, main: false, related: false, core_rank: '' }))}
                  style={form.not_exposed ? S.chkOut : S.chkOff}
                >
                  {form.not_exposed ? '☑' : '☐'} 미노출 (메인·관련도 모두 없음)
                </button>

                <input
                  type="text" placeholder="memo (선택)" value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                  style={S.input}
                />

                <button onClick={saveObservation} disabled={saving} style={S.saveBtn}>
                  {saving ? '저장중...' : '저장 (Ctrl+Enter)'}
                </button>
              </div>
            )}

            {/* Timeline — [세션81] 관리자 관측 + 사용자 순위등록 통합 표시(출처 배지) */}
            <div style={S.panel}>
              <div
                style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}
              >
                Timeline ({timeline.length + userRanks.length})
                <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                  관리자 {timeline.length} · 사용자 {userRanks.length}
                </span>
              </div>
              <div style={S.timeline}>
                {(() => {
                  // [세션84] Publish 는 이력 확인용 3건만. 전체 이력은 관측 화면.
                  const merged = mergeTimeline(timeline, userRanks).slice(0, 3);
                  if (merged.length === 0) {
                    return (
                      <div style={{ color: T.textFaint, fontSize: 13, padding: 12 }}>
                        no observations
                      </div>
                    );
                  }
                  return merged.map((t) => {
                    const isUser = t.source === 'user';
                    // trend 는 관리자 행에서만. 사용자 행은 비교 대상이 아니다(_prevRank=undefined).
                    const trend = isUser
                      ? null
                      : calcTrend(t.observed_rank, t._prevRank);
                    return (
                    <div key={t.id} style={S.tlRow}>
                      <div style={S.tlMeta}>
                        <span style={isUser ? S.srcBadgeUser : S.srcBadgeAdmin}>
                          {isUser ? '👤 사용자' : '🛡 관리자'}
                        </span>
                        {!isUser && t.check_cycle && (
                          <span style={S.cycleBadge}>{t.check_cycle}</span>
                        )}
                        <span style={{ color: T.textMuted, fontSize: 12 }}>
                          {fmtDate(t.recorded_at)}
                        </span>
                      </div>
                      {(t.observed_rank != null || t.rank_detail) && (
                        <div style={S.tlNote}>
                          {t.observed_rank != null && (
                            <strong>
                              {isUser ? '관련도 ' : '대표 '}{t.observed_rank}위
                            </strong>
                          )}
                          {trend && (
                            <span style={{ ...S.trendBadge, color: trend.color }}>
                              {trend.icon} {trend.label}
                            </span>
                          )}
                          {t.rank_detail && (
                            <span style={{ color: T.textMuted, marginLeft: 6 }}>
                              {rankDetailSummary(t.rank_detail)}
                            </span>
                          )}
                        </div>
                      )}
                      {isUser && t.observed_keyword && (
                        <div style={S.tlMemo}>키워드 {t.observed_keyword}</div>
                      )}
                      {t.latest_rank_note && (
                        <div style={S.tlNote}>{t.latest_rank_note}</div>
                      )}
                      {t.memo && <div style={S.tlMemo}>{t.memo}</div>}
                    </div>
                    );
                  });
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}

const Field = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: T.textMuted }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
  </div>
);


// 세션78 [1단계] — URL 유무 점. 리스트·상세 뱃지 공용(색 상수 1곳 공유).
const UrlDot = ({ on }) => (
  <span
    style={{
      display: 'inline-block',
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: on ? URL_STATE.on.color : 'transparent',
      border: `1.5px solid ${on ? URL_STATE.on.color : URL_STATE.off.color}`,
      verticalAlign: 'middle',
    }}
  />
);

const Dot = ({ on, label }) => (
  <span
    style={{
      display: 'inline-block',
      width: 22,
      height: 22,
      lineHeight: '22px',
      textAlign: 'center',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: on ? T.ok : T.surfaceAlt,
      color: on ? '#0b1f17' : T.textFaint,
    }}
  >
    {label}
  </span>
);

const S = {
  // 세션76 v0.4 — 다크 전환. 색·radius·행높이는 lib/adminTheme.js 의 T 토큰만 참조.
  //   2패널(좌 리스트 / 우 Preview) 레이아웃과 기능은 무변경. 표시 계층만 교체.
  gate: { padding: '32px 0', color: T.textMuted },
  wrap: { display: 'flex', height: '100vh', fontFamily: T.font, fontSize: 13, color: T.text },

  left: {
    flex: '0 0 65%',   // [세션84] 목록 우선 — 우측은 읽기 전용 요약이면 충분하다
    // 세션76: 좌우 경계를 borderStrong 으로 올림(1px 로는 두 패널이 붙어 보였다).
    borderRight: `1px solid ${T.borderStrong}`,
    background: T.bg,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  leftHeader: {
    padding: '10px 14px',
    borderBottom: `1px solid ${T.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: T.surface,
  },
  listScroll: { flex: 1, overflowY: 'auto' },
  // [v0.8] 업종별 건강도 박스 — 목록 위 고정. 스크롤과 분리해야 비교하며 볼 수 있다.
  statBox: { borderBottom: `1px solid ${T.border}`, padding: "8px 10px 10px", maxHeight: 260, overflowY: 'auto' },
  statHead: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, fontSize: 13 },
  statHeadSub: { fontSize: 11.5, color: T.textFaint },
  kpiBar: {
    display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap',
    padding: '9px 12px', borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt,
  },
  kpiScope: { fontSize: 11.5, color: T.textFaint, marginRight: 4 },
  winGroup: { display: 'flex', gap: 2 },
  winBtn: {
    padding: '4px 9px', fontSize: 11.5, borderRadius: 6, cursor: 'pointer',
    border: `1px solid ${T.border}`, background: 'transparent', color: T.textFaint,
  },
  winBtnOn: { background: 'rgba(59,130,246,.18)', color: T.text, borderColor: 'rgba(59,130,246,.5)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  // 리스트는 밀도가 생명 → 공통 Table 대신 축약 셀. 색만 토큰 공유.
  th: {
    background: T.surfaceAlt, color: '#9aa0ab', fontSize: 11, textAlign: 'left',
    padding: '8px', borderBottom: `1px solid ${T.border}`, fontWeight: 600,
    position: 'sticky', top: 0, zIndex: 1,
  },
  td: { padding: '7px 8px', color: T.textSoft },
  tr: { cursor: 'pointer', borderBottom: `1px solid ${T.borderRow}` },
  trOn: { cursor: 'pointer', borderBottom: `1px solid ${T.borderRow}`, background: 'rgba(59,130,246,.12)' },
  titleCell: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  // 세션78 [1단계] URL 축
  urlCell: { width: 34, textAlign: 'center', padding: '7px 4px' },
  // [세션84] 대표 순위 한 줄
  repRow: {
    display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', marginTop: 8,
    background: '#0f1115', border: `1px solid ${T.border || '#232730'}`,
    borderRadius: T.radiusCard,
  },
  // 숫자가 먼저 눈에 들어와야 한다 — 라벨은 작게, 값은 크게.
  repMain: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  repLabel: { fontSize: 11, color: T.textMuted },
  repNum: { fontSize: 30, fontWeight: 800, lineHeight: 1.05 },
  repUnit: { fontSize: 14, fontWeight: 600, marginLeft: 2, color: T.textMuted },
  repNone: { fontSize: 18, fontWeight: 700, color: T.textFaint },
  repState: { fontSize: 22, fontWeight: 800, lineHeight: 1.1 },
  repSub: { fontSize: 11, color: T.textFaint },
  repOut: { fontSize: 18, fontWeight: 700, color: T.textMuted },
  repSide: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  repMeta: { fontSize: 11, color: T.textFaint },
  obsKw: { fontSize: 12.5, color: T.text, marginBottom: 8 },
  chkOff: {
    ...inputStyle, width: '100%', padding: '9px 12px', fontSize: 13, textAlign: 'left',
    cursor: 'pointer', marginBottom: 6, color: T.textMuted, boxSizing: 'border-box',
  },
  chkOn: {
    ...inputStyle, width: '100%', padding: '9px 12px', fontSize: 13, textAlign: 'left',
    cursor: 'pointer', marginBottom: 6, boxSizing: 'border-box',
    color: T.ok, borderColor: T.ok, background: T.okBg, fontWeight: 700,
  },
  chkOut: {
    ...inputStyle, width: '100%', padding: '9px 12px', fontSize: 13, textAlign: 'left',
    cursor: 'pointer', marginBottom: 6, boxSizing: 'border-box',
    color: T.danger, borderColor: T.danger, background: T.dangerBg, fontWeight: 700,
  },
  obsLine: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  chkOffInline: {
    ...inputStyle, flex: '1 1 auto', padding: '9px 12px', fontSize: 13, textAlign: 'left',
    cursor: 'pointer', color: T.textMuted, boxSizing: 'border-box',
  },
  chkOnInline: {
    ...inputStyle, flex: '1 1 auto', padding: '9px 12px', fontSize: 13, textAlign: 'left',
    cursor: 'pointer', boxSizing: 'border-box',
    color: T.ok, borderColor: T.ok, background: T.okBg, fontWeight: 700,
  },
  obsRankRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  obsRankLabel: { fontSize: 12.5, color: T.text, flex: '1 1 auto' },
  obsRankUnit: { fontSize: 12, color: T.textMuted },
  urlBox: {
    marginTop: 10,
    padding: '10px 12px',
    background: T.surfaceAlt,
    border: `1px solid ${T.borderRow}`,
    borderRadius: T.radius,
  },
  urlHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  urlHeadTitle: { fontSize: 12, fontWeight: 600, color: T.textMuted },
  urlBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  urlLink: { fontSize: 12, color: T.accent, wordBreak: 'break-all' },
  urlInputRow: { display: 'flex', gap: 6, alignItems: 'center' },
  urlInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    padding: '5px 8px',
    background: T.bg,
    color: T.text,
    border: `1px solid ${T.borderStrong}`,
    borderRadius: T.radius,
    fontFamily: 'inherit',
  },

  // 우측 Preview — 좌측보다 한 단계 어둡게 두어 패널 구분이 색으로도 읽히게 한다.
  right: { flex: 1, overflowY: 'auto', padding: 14, background: '#0b0d12', minWidth: 0 },
  empty: { color: T.textFaint, textAlign: 'center', marginTop: 80, fontSize: 13 },
  emptyIcon: { fontSize: 34, color: T.border, marginBottom: 10, lineHeight: 1 },

  leftTitleLine: { display: 'flex', alignItems: 'baseline', gap: 8 },
  leftTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: T.textStrong },
  leftCount: { fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' },
  leftCountSub: { color: T.textFaint },

  // [세션83] 필터바 · 페이저
  filterBar: {
    padding: '8px 12px',
    borderBottom: `1px solid ${T.border}`,
    background: T.surfaceAlt,
    display: 'flex', flexDirection: 'column', gap: 6, flex: '0 0 auto',
  },
  filterRow: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  filterInput: {
    flex: 1, minWidth: 0, fontSize: 12, padding: '4px 8px',
    background: T.bg, color: T.text,
    border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontFamily: 'inherit',
  },
  filterSelect: {
    fontSize: 12, padding: '4px 6px',
    background: T.bg, color: T.text,
    border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontFamily: 'inherit',
  },
  pager: {
    display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center',
    padding: '8px 10px', borderTop: `1px solid ${T.border}`,
    background: T.surfaceAlt, flex: '0 0 auto',
  },
  pagerBtn: {
    fontSize: 12, padding: '3px 9px', cursor: 'pointer',
    background: T.surface, color: T.text,
    border: `1px solid ${T.borderStrong}`, borderRadius: T.radius, fontFamily: 'inherit',
  },
  pagerNow: { fontSize: 12, color: T.textMuted, margin: '0 8px', fontVariantNumeric: 'tabular-nums' },
  pagerHint: { fontSize: 11, color: T.textFaint, marginLeft: 8 },
  leftVer: { fontSize: 10, color: T.textFaint, fontWeight: 400 },
  // [세션86] 관측 Queue
  queueBadge: {
    marginLeft: 8, padding: '3px 9px', borderRadius: 999, cursor: 'pointer',
    fontSize: 11, fontWeight: 700, lineHeight: 1.2,
    background: 'rgba(59,130,246,.14)', color: T.accent,
    border: `1px solid ${T.accent}`,
  },
  queueBadgeOn: { background: T.accent, color: '#fff' },
  queueOver: { fontWeight: 600, opacity: .85 },
  qChipDue: {
    marginLeft: 5, padding: '1px 4px', borderRadius: 4,
    fontSize: 9, fontWeight: 700, color: T.accent,
    background: 'rgba(59,130,246,.14)', verticalAlign: 'middle',
  },
  qChipOver: {
    marginLeft: 5, padding: '1px 4px', borderRadius: 4,
    fontSize: 9, fontWeight: 700, color: '#fff', background: T.warn || '#d97706',
  },
  leftSub: { fontSize: 11.5, color: T.textMuted, marginTop: 3 },

  panel: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard,
    padding: 12,
    marginBottom: 12,
  },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  statusSel: { ...selectStyle, padding: '4px 8px', fontSize: 12 },

  snapGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  formRow: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  select: { ...selectStyle, padding: '6px 10px', fontSize: 12 },
  input: { ...inputStyle, width: '100%', padding: '6px 10px', fontSize: 12, marginBottom: 6, boxSizing: 'border-box' },

  rankGridLabel: { fontSize: 12, fontWeight: 700, margin: '4px 0 6px', color: T.text },
  toggleSubLabel: { fontSize: 11, color: T.textFaint, margin: '2px 0 6px' },
  rankGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 },
  rankCol: { border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 8, background: T.surfaceAlt },
  rankColHead: { fontSize: 12, fontWeight: 700, textAlign: 'center', color: T.textMuted, marginBottom: 6 },
  rankRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  rankAxis: { fontSize: 11, color: T.textMuted, width: 28, flexShrink: 0 },
  rankInput: {
    ...inputStyle, flex: 1, width: '100%', padding: '6px 8px',
    fontSize: 13, textAlign: 'center', boxSizing: 'border-box',
  },

  // [세션85] 상세패널 액션
  actRow: { display: 'flex', gap: 6, flex: '0 0 auto' },
  actBtn: {
    padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
    background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`,
  },
  actBtnDanger: {
    padding: '5px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
    background: 'transparent', color: T.danger || '#e5484d', border: '1px solid rgba(229,72,77,.4)',
  },
  actPane: {
    marginBottom: 10, padding: 10, borderRadius: 8,
    border: `1px solid ${T.border}`, background: 'rgba(255,255,255,.02)',
  },
  actPaneHead: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  actPaneHint: { fontSize: 11, fontWeight: 400, color: T.textMuted, marginLeft: 6 },
  actChk: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11, color: T.textMuted, cursor: 'pointer' },
  saveBtn: {
    width: '100%', padding: '10px', background: T.accent, color: '#fff',
    border: `1px solid ${T.accent}`, borderRadius: T.radius,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit',
  },
  btnSm: {
    padding: '4px 10px', border: `1px solid ${T.borderStrong}`, borderRadius: T.radius,
    background: T.surfaceAlt, color: '#9aa0ab', cursor: 'pointer',
    fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  // [v0.9] 검색은 넓게, 버튼은 작게 — 하루 종일 쓰는 입력이 화면 폭을 가져간다.
  btnXs: {
    padding: '3px 8px', border: `1px solid ${T.borderStrong}`, borderRadius: T.radius,
    background: T.surfaceAlt, color: '#9aa0ab', cursor: 'pointer',
    fontSize: 11, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
  },
  manualInput: { ...inputStyle, flex: 1, fontSize: 12, padding: '5px 8px', width: '100%', boxSizing: 'border-box' },
  searchBtnSm: { ...inputStyle, padding: '2px 7px', cursor: 'pointer', fontSize: 12 },

  // 검색 패널은 강조 대상 → 초록 테두리 유지(다크 대비로 조정)
  searchPanel: {
    background: T.surface, border: `1px solid ${T.ok}`,
    borderRadius: T.radiusCard, padding: 12, marginBottom: 12,
  },
  searchKw: { fontSize: 13, marginBottom: 8, color: T.text },
  searchBtns: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  searchBtn: {
    padding: '8px 14px', border: 'none', borderRadius: T.radius, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  searchLink: {
    padding: '6px 10px', border: `1px solid ${T.borderStrong}`, borderRadius: T.radius,
    background: T.surfaceAlt, fontSize: 12, color: T.textMuted, textDecoration: 'none',
  },

  timeline: { display: 'flex', flexDirection: 'column', gap: 6 },
  tlRow: { padding: 8, background: T.surfaceAlt, borderRadius: T.radius, fontSize: 12 },
  tlMeta: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 },
  cycleBadge: {
    padding: '1px 6px', background: T.mutedBg, color: T.textMuted,
    borderRadius: 3, fontSize: 10, fontWeight: 700,
  },
  // [세션81] 출처 배지 — 관리자/사용자를 한눈에 구분. 자동수집(AUTO)이 붙으면 여기 1종만 추가된다.
  srcBadgeAdmin: {
    padding: '1px 6px', background: T.mutedBg, color: T.textSoft,
    borderRadius: 3, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
  },
  srcBadgeUser: {
    padding: '1px 6px', background: 'rgba(59,130,246,.16)', color: T.accent,
    borderRadius: 3, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
  },
  tlIcons: { display: 'flex', gap: 4, marginBottom: 4 },
  tlNote: { color: T.textSoft, fontSize: 12 },

  trendBadge: { marginLeft: 8, fontSize: 12, fontWeight: 700 },
  currentTrend: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.borderRow}`,
  },
  trendBadgeLg: { fontSize: 14, fontWeight: 700 },
  csHead: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, flexBasis: '100%' },
  csMeta: { marginLeft: 'auto', fontSize: 11, color: T.textFaint },
  deltaCell: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.textStrong },
  deltaArrow: { marginLeft: 6, fontSize: 13, fontWeight: 700 },
  noPrev: { marginLeft: 4, fontSize: 10, color: T.textFaint, fontWeight: 400 },
  verdictRow: {
    display: 'flex', alignItems: 'center', gap: 10, flexBasis: '100%',
    marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.borderRow}`,
  },
  verdictLabel: { fontSize: 11, color: T.textMuted },
  verdictText: { fontSize: 14, fontWeight: 700 },
  verdictSub: { fontSize: 12, color: T.textMuted, padding: '2px 8px', background: T.mutedBg, borderRadius: 10 },
  tlMemo: { color: T.textMuted, fontSize: 11, marginTop: 2 },
};
