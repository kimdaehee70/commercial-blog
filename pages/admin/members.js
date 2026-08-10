// pages/admin/members.js  v0.9 (세션77 — 상단 2단: 좌 KPI / 우 이번 달 정산)
//   · KPI 6칸이 전폭을 쓰면서 카드 하나가 300px 넘게 늘어져 있었다. 대시보드와 같은 규칙으로 좌측 절반만 쓴다.
//   · 우측 절반에는 이번 달 정산. 회원 화면에서 가장 자주 따라오는 질문이 "이 사람들로 이번 달 얼마인가"인데,
//     지금은 그 답이 어디에도 없다. B-4 이후 결제 데이터가 들어올 자리를 지금 잡아 둔다.
//   · 금액은 표시하지 않는다. 정가는 lib/billing/plans(서버측 SoT)에 있고 이 화면은 API 응답만 받는데,
//     응답에 가격 필드가 없다. 클라이언트에 요금표를 하드코딩하면 요금제가 바뀔 때 조용히 틀린 금액이 남는다.
//     → 지금은 과금 대상(유료 계정·플랜별 건수)만 보여주고, 금액은 B-4 결제 이력으로 채운다.
//
// v0.8 (세션77 — 흡수 후 정리)
//   · 컬럼 순서: 블로그계정을 최근발행 뒤로. 읽기값(상태·플랜·사용량)이 왼쪽에 붙고 편집 항목이 오른쪽에 모인다.
//     입력칸이 중간에 끼어 있으면 시선이 한 번 끊긴다.
//   · 사용률 3색: 0~79 초록 / 80~99 노랑 / 100+ 빨강. 숫자만으로는 임계 판단에 한 박자가 더 걸린다.
//     경계는 필터의 임박 기준(NEAR_RATIO 0.8)과 같은 값 하나를 쓴다 — 색과 필터가 어긋나면 신뢰가 깨진다.
//   · 필터 3그룹(상태 / 플랜 / Quota) 사이 간격 확대 + 구분선. 버튼이 11개 나열되면 그룹이 안 보인다.
//     상태 그룹만 md(32px)라 뒤 두 그룹(sm 26px)과 높이가 어긋나 있었다 → 전부 sm 으로 통일.
//   · 이번달 'N / 한도' 표기는 유지. KPI 순서도 무변경.
//
// v0.7 (세션77 — 사용량 흡수)
//   배경: /admin/accounts-usage 와 이 화면은 둘 다 accounts 를 중심으로 돈다. 같은 회원을 두 번 보는 구조라
//        운영자가 화면을 오가며 대조하게 됐다. 사용량을 여기로 흡수하고 상단 메뉴에서 뺀다(라우트는 유지).
//   · 컬럼 추가: 사용률(quota_ratio) · 최근발행(latest_at). 소스는 이미 병행 호출 중인 accounts-usage —
//     usageMap 에 2필드를 더 담을 뿐이라 API·스키마 무변경, 추가 호출 0.
//   · 필터 추가: 요금제(무료/유료) · Quota(정상/임박/초과). 임박 = ratio ≥ 0.8 && !over.
//     0.8 은 표시 임계일 뿐 차단과 무관 — 차단 truth 는 check-quota(publish < quota) 하나뿐이다.
//   · 사용률/최근발행/Quota필터는 usage 로드 실패 시 전부 '—' 이며 회원목록·변경 기능에는 영향이 없다
//     (기존 독립 try 구조 유지). 이때 Quota 필터는 아무 행도 거르지 않게 둔다 — 빈 화면 오해 방지.
//   · 판정·집계·API·모달 로직 무변경. 표시 계층 + 클라이언트 필터만.
//
// v0.6 (세션77 — KPI 컴팩트 + 유료/무료 추가)
//   · 상단 KPI 4칸이 전폭이라 카드 하나가 400px 넘게 늘어져 있었다. 숫자 2자리를 보여주는 데 그 폭은 과하다.
//     → adminTheme v2.2 의 Stat size="sm" 으로 6칸 1줄. 대시보드와 같은 디자인 언어가 된다.
//   · 유료/무료 2칸 추가. accounts-list 의 summary 는 status 집계뿐이라 rows.plan 에서 파생한다
//     (API 무변경). 유료 판정 = plan !== 'free' — PLAN_LABEL whitelist 밖 값도 유료로 잡힌다.
//     rows 는 rpc p_limit 100 상한이므로, 100명 초과 시 이 2칸은 상위 100명 기준임에 유의.
//   · 「기타」 칸은 상시 노출로 바꾸지 않는다(0이면 숨김 유지) — 6칸 고정 폭을 흔들지 않기 위해서다.
//   · 표·필터·모달·API·판정 로직 전부 무변경. 표시 계층만.
//
// v0.4  (103차 — blog_account 매핑 이식 / accounts.js 91차 흡수)
// 운영 spine 신규: owner 전용 accounts 관리. 분리 페이지(spine 격리 유지).
//
// [표시 한글화] 운영 UI 1순위 — 표시 라벨만 한글화 (DB/API/option value/onChange 인자 전부 무변경)
//   · 매핑: role(운영자/관리자/사용자) status(활성/대기/정지) plan(무료/베이직/프로)
//   · ROLE/STATUS/PLAN_LABEL + roleLabel/statusLabel/planLabel 헬퍼. 매핑 없는 값은 원문 출력(안전장치).
//   · Select에 labelFn prop 추가 — option label만 한글, value는 영문 유지.
//   · KPI카드·필터버튼·owner뱃지·whitelist밖 태그·확인모달 diff 표시 전부 한글. 판정/집계/필터 로직 무변경.
//
// v0.4 변경 (103차):
//   - blog_account 매핑 컬럼 이식 (accounts.js 91차 v0.6 로직 그대로 흡수).
//     · 입력칸(draft) + "저장" 버튼 (자유입력이라 onChange 즉시저장 X, 버튼/Enter 시에만 호출).
//     · dirty 강조(테두리), owner row 잠금(🔒 — SQL 직접, 자해방지 패턴 유지).
//     · 빈값 저장 = 매핑 해제(null). 클라 1차 검증(영문/숫자/_/-) + 서버 동일 검증.
//     · 409(BLOG_ACCOUNT_TAKEN)/400(INVALID_BLOG_ACCOUNT) 에러 분기.
//   - select(role/status/plan)는 기존 확인모달 유지. blog_account만 직접 저장(자유입력 특성).
//   - 검색 대상에 blog_account 추가 (accounts.js 90차 동등).
//   - API 무수정: update-account가 blog_account 이미 수신(91차). 테이블/가드 무변경.
//   - ★ 이 이식 완료로 accounts.js(91차)는 deprecate 후보. members가 기능 완전 상위집합.
//
// v0.3 변경 (122차):
//   - "이번달" 컬럼 1개 추가 (읽기전용 "monthly_posts / monthly_quota", over면 강조).
//   - 소스 = /api/admin/accounts-usage 병행호출 → id 기준 머지 (members 무계산).
//     ※ §1 표시통일 정합: accounts-usage = check-quota 정본식(KST월초·published·[start,end)lt).
//       members가 직접 집계하지 않고 검증된 출력만 빌려 표시 → 정본 단일화 불변.
//   - usage 로드 실패해도 회원목록/변경 기능 무영향 (독립 try, 실패 시 quota칸만 '—').
//   - 역할분리 원칙 유지: members=관리(+quota 1칸 참고) / accounts-usage=상세 모니터링.
//   - API 무수정. set-role/update-account/모달/owner readonly 로직 전부 무변경.
//
// v0.2 변경 (110차):
//   - AdminNav 추가 (accounts-usage와 동일 패턴 — 네비 단일화)
//
// 세션76 v0.5 — 디자인 SoT 편입 (①-b)
//   members 를 관리자 콘솔의 기준 디자인으로 삼기로 확정 → 기준 페이지 자신이 공통 컴포넌트를 쓰도록 편입.
//   · 로컬 S 의 색·패딩·radius 값을 lib/adminTheme.js 로 승격하고, 페이지는 T 토큰만 참조.
//   · 로컬 Stat / th / td / 버튼 / 입력 → adminTheme 의 Stat / Th / Td / Btn / inputStyle 로 교체.
//   · 로컬 Select 는 options+labelFn 시그니처가 고유해 EnumSelect 로 존치(스타일만 selectStyle 참조).
//   · 로직·API·정렬·페이지네이션·감사로그 전부 무변경. 표시 계층만.
//   - 검색: 이메일/이름 클라 필터 (입력창 1)
//   - 정렬: 헤더 클릭 토글 (가입일/권한/상태/플랜/이메일)
//   - 페이지네이션: 클라 분할 (PER_PAGE=25, 필터+검색+정렬 후 적용)
//   - usage 결합 = 의도적 제외. 역할분리 유지(members=관리 / accounts-usage=모니터링).
//   - 인증/모달/변경(set-role·update-account) 로직 = 무변경. 기존 API 무수정.
//
// 인증/톤: audit.js v0.2 답습 — supabase.auth.getSession + OWNER_UID 클라가드, 다크.
// 데이터:  GET  /api/admin/accounts-list  (Bearer) → {ok, rows[], count, summary}
// 변경:    POST /api/admin/set-role        body{target_id, role}   role∈[admin,user]
//          POST /api/admin/update-account  body{target_id, plan?, status?}
//                                          plan∈[free,basic,pro] / status∈[active,suspended]
//   ※ 두 API 모두 requireOwner + owner자해방지 + writeAudit 内蔵 (89/86차).
//      → 이 UI는 호출만. audit_logs 기록은 서버가 자동 (account.set_role / account.update).
//
// 정책(108차 합의):
//   - owner = readonly 표시 (변경 컨트롤 비활성)
//   - role = user ↔ admin 만 변경 (whitelist 일치)
//   - status = active ⇄ suspended (pending은 표시만, set 불가)
//   - status 그 외(deactivated 등 whitelist-밖) = readonly 태그 + "active 복구"만 (단방향)
//   - plan = free/basic/pro (basic 비활성 플랜이나 set whitelist엔 존재)
//   - 모든 변경 = 확인 모달 1단계 후 실행 (오조작/자해 방지)
//
// 미확정(LIVE 교정 대상):
//   - rpc get_accounts_admin row 필드명 = accounts 컬럼 가정
//     (id,email,display_name,role,status,plan,created_at). 빈칸 나오면 1:1 교정.

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { OWNER_UID } from '../../lib/constants';
import { useAdminGuard } from '../../lib/useAdminGuard';
import { AdminLayout } from '../../lib/adminLayout';
import {
  T, PageHead, StatRow, Stat, Table, Th, Td, Btn, Badge, ErrBox,
  inputStyle, selectStyle, noteStyle,
} from '../../lib/adminTheme';

const ROLE_OPTIONS   = ['user', 'admin'];          // set-role whitelist (owner 제외)
const STATUS_OPTIONS = ['active', 'suspended'];    // update-account whitelist
const PLAN_OPTIONS   = ['free', 'basic', 'standard', 'pro', 'enterprise'];   // ALLOWED_PLANS (S127 5-tier · enterprise=관리자 수동 부여, 판매 미노출)
const BLOG_ACCOUNT_RE = /^[a-zA-Z0-9_-]+$/;        // 103차: 클라 1차 검증 (서버도 동일 검증)

// ── 표시 라벨 한글화 (표시 전용 — DB/API/option value/onChange 인자 전부 무변경) ──
//   매핑에 없는 값은 원문 그대로 출력(안전장치). label만 바꾸고 value는 항상 영문 유지.
const ROLE_LABEL   = { owner: '운영자', admin: '관리자', user: '사용자' };
const STATUS_LABEL = { active: '활성', pending: '대기', suspended: '정지' };
const PLAN_LABEL   = { free: '무료', basic: '베이직', standard: '스탠다드', pro: '프로', enterprise: '엔터프라이즈' };
const roleLabel   = (v) => ROLE_LABEL[v]   || v || '—';
const statusLabel = (v) => STATUS_LABEL[v] || v || '—';
const planLabel   = (v) => PLAN_LABEL[v]   || v || '—';

// 세션76: 값은 adminTheme T 참조. admin 보라만 여기 고유(T 에 없는 축).
const ROLE_COLOR = {
  owner: T.warn,
  admin: '#a78bfa',
  user:  T.info,
};
const STATUS_COLOR = {
  active:    T.ok,
  suspended: T.danger,
  pending:   T.warn,
};

export default function MembersPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존. OWNER_UID는 owner행 판정에 별도 사용(유지).
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState(null);
  // A안(122차): accounts-usage 재사용 quota Map. id → {monthly_posts, monthly_quota, over_quota}
  //   ※ members 자체계산 금지. 정본식(accounts-usage = check-quota 정합)만 빌려 표시.
  const [usageMap, setUsageMap] = useState({});

  // 세션107: 상호(store_profiles.store_name) 표시용 Map. accounts-usage와 동일 병행로드 패턴.
  //   ※ RPC(get_stores_admin) 무수정 · 신규 API 0. 연결키는 서버 반환 필드에 따라 2중 폴백:
  //     1순위 account_id/user_id/owner_id/id ↔ accounts.id, 2순위 blog_account 일치.
  const [storeMap, setStoreMap] = useState({ byId: {}, byBlog: {} });

  // 103차: blog_account 매핑 (accounts.js 91차 흡수)
  //   draftBlog: { [row.id]: 입력중인 값 } — 자유입력이라 즉시저장 X, 저장버튼/Enter 시에만 API.
  const [draftBlog, setDraftBlog] = useState({});
  const [savingBlogId, setSavingBlogId] = useState(null); // blog_account 저장중인 row id

  // 필터
  const [fStatus, setFStatus] = useState('all');
  // v0.7: 요금제·Quota 필터 (클라이언트 전용. 서버 쿼리 무변경)
  const [fPlan, setFPlan] = useState('all');   // all | free | paid
  const [fQuota, setFQuota] = useState('all'); // all | ok | near | over

  // v0.2: 검색 / 정렬 / 페이지
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('created_at'); // created_at|store|email|role|status|plan
  const [sortDir, setSortDir] = useState('desc');       // asc|desc
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  // 확인 모달: { target, field, from, to } | null
  const [pending, setPending] = useState(null);
  const [applying, setApplying] = useState(false);

  // 세션96: 다중 선택 삭제
  //   selected 는 현재 필터/페이지와 무관하게 누적된다. 필터를 바꿔 가며 테스트 계정을
  //   골라 담는 게 실제 운영 동선이라, 페이지 이동 시 선택이 날아가면 도구가 아니라 함정이 된다.
  const [selected, setSelected] = useState([]);   // accounts.id[]
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delResult, setDelResult] = useState(null); // {deleted:[], failed:[]} | null

  // ── 목록 로드 ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const r = await fetch('/api/admin/accounts-list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const j = await r.json();

      if (r.status === 401) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      if (r.status === 403) throw new Error('관리자 권한이 필요합니다.');

      // accounts-list는 ok:false여도 rows:[] 보장 + diag에 사유
      if (!j.ok) {
        setRows([]);
        setSummary(j.summary || null);
        setErr(j.diag?.error_message || j.diag?.exception || 'load_failed');
        return;
      }

      setRows(Array.isArray(j.rows) ? j.rows : []);
      setSummary(j.summary || null);

      // 103차: blog_account draft 초기화 (서버값 기준으로 입력칸 리셋)
      const drafts = {};
      (Array.isArray(j.rows) ? j.rows : []).forEach((row) => {
        drafts[row.id] = row.blog_account || '';
      });
      setDraftBlog(drafts);

      // A안(122차): quota 표시용 accounts-usage 병행 로드 (정본식 재사용·members 무계산)
      //   독립 try — usage 실패해도 회원목록/변경 기능은 정상 동작. quota 컬럼만 '—' 표시.
      try {
        const ru = await fetch('/api/admin/accounts-usage', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const ju = await ru.json();
        if (ju.ok && Array.isArray(ju.rows)) {
          const map = {};
          for (const u of ju.rows) {
            map[u.id] = {
              monthly_posts: u.monthly_posts,
              monthly_quota: u.monthly_quota,
              over_quota: u.over_quota,
              quota_ratio: u.quota_ratio,   // v0.7: 사용률 컬럼·임박 필터
              latest_at: u.latest_at,       // v0.7: 최근발행(실발행 기준)
            };
          }
          setUsageMap(map);
        } else {
          setUsageMap({});
        }
      } catch {
        setUsageMap({}); // usage 로드 실패 = quota 컬럼만 비움. 본기능 영향 없음.
      }

      // 세션107: 상호 병행 로드 (독립 try — 실패해도 회원목록/변경 기능 정상, 상호칸만 미등록 표시)
      try {
        const rs = await fetch('/api/admin/stores-list', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const js = await rs.json();
        if (js.ok && Array.isArray(js.rows)) {
          const byId = {};
          const byBlog = {};
          for (const st of js.rows) {
            const nm = (st.store_name || '').trim();
            if (!nm) continue;
            const key = st.account_id ?? st.user_id ?? st.owner_id ?? st.id;
            if (key != null && byId[key] == null) byId[key] = nm;
            const ba = (st.blog_account || '').trim().toLowerCase();
            if (ba && byBlog[ba] == null) byBlog[ba] = nm;
          }
          setStoreMap({ byId, byBlog });
        } else {
          setStoreMap({ byId: {}, byBlog: {} });
        }
      } catch {
        setStoreMap({ byId: {}, byBlog: {} });
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace('/login');
    }
  }, [authState, router]);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  // ── 변경 요청 → 모달 오픈 ───────────────────────────────────
  function requestChange(target, field, to) {
    const from = target[field];
    if (from === to) return;                 // 변경 없음
    if (isOwnerRow(target)) return;          // owner readonly
    setPending({ target, field, from, to });
  }

  // ── 모달 확인 → API 호출 ────────────────────────────────────
  async function applyChange() {
    if (!pending) return;
    const { target, field, to } = pending;
    setApplying(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const endpoint = field === 'role'
        ? '/api/admin/set-role'
        : '/api/admin/update-account';

      const body = field === 'role'
        ? { target_id: target.id, role: to }
        : { target_id: target.id, [field]: to };   // status | plan

      const r = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const j = await r.json();

      if (!j.ok) {
        // OWNER_ACCOUNT_READONLY / INVALID_* / TARGET_NOT_FOUND 등
        throw new Error(j.message || j.error || 'update_failed');
      }

      setPending(null);
      await load();   // 성공 → 재조회 (서버가 audit_logs 기록 완료)
    } catch (e) {
      setErr(e.message);
    } finally {
      setApplying(false);
    }
  }

  // ── 세션96: 선택 삭제 ───────────────────────────────────────
  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // 전체선택 = "현재 화면에 보이는 행"만 대상. 필터로 걸러 놓고 헤더를 눌렀는데
  // 안 보이는 행까지 담기면 확인창의 숫자와 눈에 보이는 것이 어긋난다.
  function toggleAllVisible(selectableIds, allOn) {
    setSelected((prev) => (allOn
      ? prev.filter((x) => !selectableIds.includes(x))
      : [...new Set([...prev, ...selectableIds])]));
  }

  async function deleteSelected() {
    if (selected.length === 0) return;
    setDeleting(true);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const r = await fetch('/api/admin/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ target_ids: selected }),
      });
      const j = await r.json();

      if (r.status === 401) throw new Error('인증이 만료되었습니다. 다시 로그인해 주세요.');
      if (r.status === 403) throw new Error('관리자 권한이 필요합니다.');
      if (j.error && !Array.isArray(j.deleted)) throw new Error(j.message || j.error);

      const okIds = (j.deleted || []).map((d) => d.id);
      setSelected((prev) => prev.filter((x) => !okIds.includes(x)));   // 성공분만 선택 해제
      setDelResult({ deleted: j.deleted || [], failed: j.failed || [] });
      setDelOpen(false);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setDeleting(false);
    }
  }

  // ── 103차: blog_account 저장 (저장 버튼/Enter 시에만 호출) — accounts.js 91차 흡수 ──
  async function saveBlogAccount(m) {
    if (isOwnerRow(m)) {
      setErr('owner 계정의 블로그 계정은 변경할 수 없습니다.');
      return;
    }

    const raw = (draftBlog[m.id] ?? '').trim();
    const current = m.blog_account || '';
    if (raw === current) return; // 변경 없음

    // 클라 1차 검증 (빈값 = 매핑 해제 허용)
    if (raw && !BLOG_ACCOUNT_RE.test(raw)) {
      setErr('블로그 계정은 영문/숫자/_/- 만 가능합니다.');
      return;
    }

    setSavingBlogId(m.id);
    setErr(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const r = await fetch('/api/admin/update-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          target_id: m.id,
          blog_account: raw === '' ? null : raw,
        }),
      });
      const j = await r.json();

      if (r.status === 401) throw new Error('인증 만료 — 다시 로그인하세요');
      if (r.status === 403) throw new Error('owner 계정은 변경할 수 없습니다.');
      if (r.status === 409 && j.error === 'BLOG_ACCOUNT_TAKEN') {
        throw new Error('이미 다른 회원에 연결된 블로그 계정입니다.');
      }
      if (r.status === 400 && j.error === 'INVALID_BLOG_ACCOUNT') {
        throw new Error('블로그 계정은 영문/숫자/_/- 만 가능합니다.');
      }
      if (!j.ok && !r.ok) throw new Error(j.message || j.error || j.detail || 'update_failed');

      await load();   // 성공 → 재조회 (서버가 audit_logs 기록 완료)
    } catch (e) {
      setErr('블로그 계정 저장 실패: ' + e.message);
    } finally {
      setSavingBlogId(null);
    }
  }

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;

  // v0.2 파이프라인: 검색 → status필터 → 정렬 → 페이지
  const ROLE_RANK = { owner: 0, admin: 1, user: 2 };
  const qLower = q.trim().toLowerCase();

  // 요금제 파생 — API summary 에 없는 값이라 rows 에서 센다(추가 호출 없음).
  const paidCount = rows.filter(r => r.plan && r.plan !== 'free').length;
  const paidByPlan = (() => {
    const c = {};
    for (const r of rows) if (r.plan && r.plan !== 'free') c[r.plan] = (c[r.plan] || 0) + 1;
    return c; // { pro: 1, basic: 0, ... }
  })();
  const planMix = (() => {
    const parts = Object.entries(paidByPlan).map(([k, v]) => `${planLabel(k)} ${v}`);
    return parts.length ? parts.join(' · ') : '—';
  })();

  // v0.7: 사용률 임계 — 표시 전용. 차단 기준(check-quota)과는 무관하다.
  const NEAR_RATIO = 0.8;
  const usageAvailable = Object.keys(usageMap).length > 0;

  // 세션107: 상호 조회 — id 매칭 → blog_account 매칭 순. 없으면 빈 문자열.
  const storeNameOf = (m) => {
    if (!m) return '';
    const byId = storeMap.byId[m.id];
    if (byId) return byId;
    const ba = (m.blog_account || '').trim().toLowerCase();
    if (ba && storeMap.byBlog[ba]) return storeMap.byBlog[ba];
    return '';
  };

  const filtered = rows.filter((r) => {
    if (fStatus !== 'all' && r.status !== fStatus) return false;
    if (fPlan === 'free' && r.plan !== 'free') return false;
    if (fPlan === 'paid' && (!r.plan || r.plan === 'free')) return false;
    // usage 미로드 시에는 Quota 필터를 통과시킨다 — 데이터가 없어서 빈 화면이 되는 것을 막는다.
    if (fQuota !== 'all' && usageAvailable) {
      const u = usageMap[r.id];
      const ratio = u && typeof u.quota_ratio === 'number' ? u.quota_ratio : null;
      const over = !!(u && u.over_quota);
      if (fQuota === 'over' && !over) return false;
      if (fQuota === 'near' && !(!over && ratio != null && ratio >= NEAR_RATIO)) return false;
      if (fQuota === 'ok' && !(!over && (ratio == null || ratio < NEAR_RATIO))) return false;
    }
    if (qLower) {
      const hay = `${storeNameOf(r)} ${r.email || ''} ${r.blog_account || ''}`.toLowerCase();
      if (!hay.includes(qLower)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortKey === 'role') {
      av = ROLE_RANK[a.role] ?? 9; bv = ROLE_RANK[b.role] ?? 9;
    } else if (sortKey === 'created_at') {
      av = a.created_at || ''; bv = b.created_at || '';
    } else if (sortKey === 'store') {
      // 세션107: 상호 정렬. 미등록은 항상 뒤로(방향 무관).
      const as = storeNameOf(a), bs = storeNameOf(b);
      if (!as && !bs) return 0;
      if (!as) return 1;
      if (!bs) return -1;
      av = as.toLowerCase(); bv = bs.toLowerCase();
    } else {
      av = (a[sortKey] || '').toString().toLowerCase();
      bv = (b[sortKey] || '').toString().toLowerCase();
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PER_PAGE;
  const visibleRows = sorted.slice(pageStart, pageStart + PER_PAGE);

  // 세션96: 현재 화면에서 선택 가능한 행(owner 제외) — 헤더 체크박스 판정 기준
  const selectableIds = visibleRows.filter((m) => !isOwnerRow(m)).map((m) => m.id);
  const allVisibleOn = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));
  const selectedRows = rows.filter((m) => selected.includes(m.id));

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'created_at' ? 'desc' : 'asc');
    }
    setPage(1);
  }

  return (
    <AdminLayout current="/admin/members" theme="dark">
      <PageHead
        title="회원 관리"
        version="v0.9"
        sub="accounts 운영 — 권한 / 상태 / 플랜. owner 전용. 변경 시 감사 로그 자동 기록."
        right={<Btn onClick={load}>↻ 새로고침</Btn>}
      />

      {/* 상단 2단 — 좌: 회원 요약 KPI / 우: 이번 달 정산(B-4 전에는 추정치) */}
      {summary && (
        <div style={S.topRow}>
          <div style={S.topLeft}>
            <StatRow size="sm">
              <Stat size="sm" label="전체" value={summary.total ?? 0} />
              <Stat size="sm" label="활성" value={summary.active ?? 0} tone="ok" />
              <Stat size="sm" label="대기" value={summary.pending ?? 0} tone="warn" />
              <Stat size="sm" label="정지" value={summary.suspended ?? 0} tone="danger" />
              <Stat size="sm" label="유료" value={paidCount} tone={paidCount > 0 ? 'ok' : undefined}
                sub={planMix} />
              <Stat size="sm" label="무료" value={rows.length - paidCount} />
              {summary.other > 0 && <Stat size="sm" label="기타" value={summary.other} />}
            </StatRow>
          </div>

          <div style={S.topRight}>
            <BillingBox paidByPlan={paidByPlan} paidCount={paidCount} planLabelFn={planLabel} />
          </div>
        </div>
      )}

      {/* 검색 + 상태 필터 */}
      <div style={S.filterRow}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="상호 / 이메일 / 블로그계정 검색"
          style={{ ...inputStyle, width: 220, marginRight: 6 }}
        />
        {['all', 'active', 'pending', 'suspended'].map((s) => (
          <Btn key={s} size="sm" active={fStatus === s} onClick={() => { setFStatus(s); setPage(1); }}>
            {s === 'all' ? '전체' : statusLabel(s)}
          </Btn>
        ))}
        <span style={S.filterSep} />
        {[['all', '전체 플랜'], ['free', '무료'], ['paid', '유료']].map(([v, l]) => (
          <Btn key={v} size="sm" active={fPlan === v} onClick={() => { setFPlan(v); setPage(1); }}>{l}</Btn>
        ))}
        <span style={S.filterSep} />
        {[['all', 'Quota 전체'], ['ok', '정상'], ['near', '임박'], ['over', '초과']].map(([v, l]) => (
          <Btn key={v} size="sm" active={fQuota === v} onClick={() => { setFQuota(v); setPage(1); }}>{l}</Btn>
        ))}
        <span style={S.resultCount}>{sorted.length}명</span>
      </div>

      {/* 세션96: 선택 액션 바 — 선택이 있을 때만 나타난다. 상시 노출하면 삭제 버튼이 늘 떠 있게 된다. */}
      {selected.length > 0 && (
        <div style={S.selBar}>
          <span style={S.selCount}>{selected.length}명 선택됨</span>
          <Btn size="sm" onClick={() => setSelected([])}>선택 해제</Btn>
          <Btn size="sm" onClick={() => setDelOpen(true)} style={S.delBtn}>삭제</Btn>
        </div>
      )}

      {delResult && (
        <div style={S.delResult}>
          {delResult.deleted.length > 0 && (
            <div style={{ color: T.ok }}>✅ {delResult.deleted.length}명의 회원이 삭제되었습니다.</div>
          )}
          {delResult.failed.length > 0 && (
            <div style={{ color: T.danger, marginTop: 4 }}>
              ⚠ 실패 {delResult.failed.length}건 — {delResult.failed.map((f) => `${f.email || f.id}(${f.error})`).join(', ')}
            </div>
          )}
          <Btn size="sm" onClick={() => setDelResult(null)} style={{ marginTop: 6 }}>닫기</Btn>
        </div>
      )}

      {err && <ErrBox>오류: {err}</ErrBox>}

      <Table minWidth={1260}>
          <thead>
            <tr>
              <Th width={34} align="center">
                <input
                  type="checkbox"
                  checked={allVisibleOn}
                  disabled={selectableIds.length === 0}
                  onChange={() => toggleAllVisible(selectableIds, allVisibleOn)}
                  style={S.chk}
                />
              </Th>
              <SortTh label="상호"   sortKey="store"      active={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortTh label="이메일" sortKey="email"      active={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortTh label="권한"   sortKey="role"       active={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortTh label="상태"   sortKey="status"     active={sortKey} dir={sortDir} onSort={toggleSort} />
              <SortTh label="플랜"   sortKey="plan"        active={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th>이번달</Th>
              <Th align="right" width={80}>사용률</Th>
              <Th width={110}>최근발행</Th>
              <Th>블로그계정</Th>
              <SortTh label="가입일" sortKey="created_at"  active={sortKey} dir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={S.empty} colSpan={11}>불러오는 중…</td></tr>
            ) : visibleRows.length === 0 ? (
              <tr><td style={S.empty} colSpan={11}>회원 없음</td></tr>
            ) : (
              visibleRows.map((m) => {
                const ownerRow = isOwnerRow(m);
                return (
                  <tr key={m.id} style={selected.includes(m.id) ? S.rowSel : undefined}>
                    <Td align="center">
                      {ownerRow ? (
                        <span style={S.chkLock}>🔒</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selected.includes(m.id)}
                          onChange={() => toggleOne(m.id)}
                          style={S.chk}
                        />
                      )}
                    </Td>
                    <Td>
                      {(() => {
                        const sn = storeNameOf(m);
                        return sn
                          ? <span style={S.storeName}>{sn}</span>
                          : <span style={S.storeNone}>(상호 미등록)</span>;
                      })()}
                    </Td>
                    <Td>
                      <div>{m.email || '—'}</div>
                      {ownerRow && <div style={S.ownerTag}>운영자 · 읽기전용</div>}
                    </Td>

                    {/* 권한 */}
                    <Td>
                      {ownerRow ? (
                        <span style={{ ...S.roleTag, color: ROLE_COLOR.owner }}>{roleLabel('owner')}</span>
                      ) : (
                        <EnumSelect
                          value={m.role}
                          options={ROLE_OPTIONS}
                          color={ROLE_COLOR[m.role]}
                          onChange={(v) => requestChange(m, 'role', v)}
                          labelFn={roleLabel}
                        />
                      )}
                    </Td>

                    {/* 상태 */}
                    <Td>
                      {ownerRow ? (
                        <span style={{ ...S.roleTag, color: STATUS_COLOR[m.status] || T.textSoft }}>
                          {statusLabel(m.status)}
                        </span>
                      ) : STATUS_OPTIONS.includes(m.status) ? (
                        // 운영 status (active/suspended) → 정상 변경 select
                        <EnumSelect
                          value={m.status}
                          options={STATUS_OPTIONS}
                          color={STATUS_COLOR[m.status]}
                          onChange={(v) => requestChange(m, 'status', v)}
                          labelFn={statusLabel}
                        />
                      ) : (
                        // whitelist-밖 (pending / deactivated 등) → readonly 태그 + active 복구만
                        // ※ 단방향: 복구 후에야 select로 변경 가능 (소프트삭제/대기 상태 보호)
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ ...S.roleTag, color: STATUS_COLOR[m.status] || T.textMuted }}>
                            {statusLabel(m.status)}
                          </span>
                          <Btn size="sm" variant="ok" onClick={() => requestChange(m, 'status', 'active')}>
                            {m.status === 'pending' ? '승인→활성' : '활성 복구'}
                          </Btn>
                        </div>
                      )}
                    </Td>

                    {/* 플랜 */}
                    <Td>
                      {ownerRow ? (
                        <span style={S.planTag}>{planLabel(m.plan)}</span>
                      ) : (
                        <EnumSelect
                          value={m.plan}
                          options={PLAN_OPTIONS}
                          onChange={(v) => requestChange(m, 'plan', v)}
                          labelFn={planLabel}
                        />
                      )}
                    </Td>

                    {/* 이번달 발행 / 한도 — 읽기전용 (accounts-usage 정본 재사용) */}
                    <Td mono style={{ color: T.textMuted }}>
                      {(() => {
                        const u = usageMap[m.id];
                        if (!u || u.monthly_quota == null) return <span style={{ opacity: 0.4 }}>—</span>;
                        return (
                          <span style={u.over_quota ? S.quotaOver : undefined}>
                            {u.monthly_posts} / {u.monthly_quota}
                          </span>
                        );
                      })()}
                    </Td>

                    {/* 사용률 — accounts-usage 의 quota_ratio(생성 기준). 임박/초과만 색을 준다. */}
                    <Td align="right" mono>
                      {(() => {
                        const u = usageMap[m.id];
                        if (!u || typeof u.quota_ratio !== 'number') return <span style={{ opacity: 0.4 }}>—</span>;
                        const pct = Math.round(u.quota_ratio * 100);
                        // 0~79 초록 / 80~99 노랑 / 100+ 빨강. over_quota(한도 소진)도 빨강으로 본다.
                        const st = (u.over_quota || u.quota_ratio >= 1) ? S.quotaOver
                          : u.quota_ratio >= NEAR_RATIO ? S.quotaNear : S.quotaOk;
                        return <span style={st}>{pct}%</span>;
                      })()}
                    </Td>

                    {/* 최근발행 — 실발행(published) 기준 시각. 생성만 하고 발행 안 한 계정은 '—'. */}
                    <Td mono style={{ color: T.textMuted }}>
                      {(() => {
                        const u = usageMap[m.id];
                        if (!u || !u.latest_at) return <span style={{ opacity: 0.4 }}>—</span>;
                        return fmtDate(u.latest_at);
                      })()}
                    </Td>

                    {/* 블로그계정 — 103차: 입력칸 + 저장 버튼 (accounts.js 91차 흡수) */}
                    <Td>
                      {(() => {
                        if (ownerRow) {
                          return (
                            <span style={S.blogLock}>🔒 {m.blog_account || '—'}</span>
                          );
                        }
                        const draft = draftBlog[m.id] ?? '';
                        const dirty = draft.trim() !== (m.blog_account || '');
                        const isSaving = savingBlogId === m.id;
                        return (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="text"
                              value={draft}
                              disabled={isSaving}
                              placeholder="(미연결)"
                              onChange={(e) =>
                                setDraftBlog((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              onKeyDown={(e) => { if (e.key === 'Enter') saveBlogAccount(m); }}
                              style={{ ...S.blogInput, borderColor: dirty ? T.warn : T.borderStrong }}
                            />
                            <Btn
                              size="sm"
                              variant="primary"
                              onClick={() => saveBlogAccount(m)}
                              disabled={isSaving || !dirty}
                            >저장</Btn>
                          </div>
                        );
                      })()}
                    </Td>

                    <Td mono style={{ color: T.textMuted }}>{fmtDate(m.created_at)}</Td>
                  </tr>
                );
              })
            )}
          </tbody>
      </Table>

      {/* 페이지네이션 */}
      {!loading && sorted.length > PER_PAGE && (
        <div style={S.pager}>
          <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>‹ 이전</Btn>
          <span style={S.pageInfo}>
            {safePage} / {totalPages}
            <span style={S.pageSub}> · {pageStart + 1}–{Math.min(pageStart + PER_PAGE, sorted.length)} / {sorted.length}</span>
          </span>
          <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>다음 ›</Btn>
        </div>
      )}

      {/* 세션96: 삭제 확인 모달 */}
      {delOpen && (
        <DeleteModal
          targets={selectedRows}
          deleting={deleting}
          onCancel={() => setDelOpen(false)}
          onConfirm={deleteSelected}
        />
      )}

      {/* 확인 모달 */}
      {pending && (
        <ConfirmModal
          pending={pending}
          applying={applying}
          onCancel={() => setPending(null)}
          onConfirm={applyChange}
        />
      )}
    </AdminLayout>
  );
}

// owner 판정: role==='owner' 또는 auth_user_id===OWNER_UID (서버 자해방지와 동일 기준)
function isOwnerRow(m) {
  return m.role === 'owner' || m.auth_user_id === OWNER_UID;
}

// 정렬 헤더 — 셀 스타일은 공통 Th 가 소유. 여기는 화살표 표시만.
function SortTh({ label, sortKey, active, dir, onSort }) {
  const isActive = active === sortKey;
  return (
    <Th onClick={() => onSort(sortKey)} style={{ userSelect: 'none' }}>
      {label}
      <span style={{ marginLeft: 4, color: isActive ? T.info : '#3a3f48', fontSize: 10 }}>
        {isActive ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </Th>
  );
}

// 세션76: 로컬 Stat 삭제 → adminTheme 의 Stat 사용(KPI 규격 SoT).

// 시그니처(options+labelFn+현재값 보존)가 고유해 존치. 스타일만 selectStyle 참조.
function EnumSelect({ value, options, color, onChange, labelFn }) {
  const toLabel = labelFn || ((x) => x);
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...selectStyle, color: color || T.textSoft }}
    >
      {/* 현재값이 옵션에 없을 수 있음(미지값) → 보존 표시 */}
      {value && !options.includes(value) && (
        <option value={value}>{toLabel(value)} (현재)</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>{toLabel(o)}</option>
      ))}
    </select>
  );
}

// ── 이번 달 정산 (v0.9) ──────────────────────────────
// B-4 이전이라 결제 이력이 없다. 금액을 추정해서 보여주지 않는다 — 요금표는 서버(lib/billing/plans)가
// SoT 이고 이 화면 응답에는 가격이 없다. 여기서는 '무엇이 과금 대상인가'까지만 확정해 둔다.
// B-4 이후: 청구액 · 수납 · 실패 · 환불 · 다음 결제일이 이 패널을 그대로 대체한다.
function BillingBox({ paidByPlan, paidCount, planLabelFn }) {
  const lines = Object.entries(paidByPlan).filter(([, c]) => c > 0);
  return (
    <div style={S.billBox}>
      <div style={S.billHead}>
        <span style={S.billTitle}>이번 달 정산</span>
        <span style={S.billNote}>결제 연동(B-4) 대기 · 과금 대상만 표시</span>
      </div>
      {lines.length === 0 ? (
        <div style={S.billEmpty}>유료 계정이 없습니다.</div>
      ) : (
        <div style={S.billBody}>
          <div style={S.billAmount}>유료 {paidCount}건</div>
          <div style={S.billLines}>
            {lines.map(([planId, cnt]) => (
              <span key={planId} style={S.billLine}>{planLabelFn(planId)} × {cnt}</span>
            ))}
          </div>
          <div style={S.billFoot}>청구액 · 수납 · 실패 · 환불 · 다음 결제일은 B-4 연동 후 표시됩니다.</div>
        </div>
      )}
    </div>
  );
}

const FIELD_LABEL = { role: '권한', status: '상태', plan: '플랜' };

function ConfirmModal({ pending, applying, onCancel, onConfirm }) {
  const { target, field, from, to } = pending;
  // 표시 전용 라벨 변환 (API 호출은 applyChange가 pending.to를 직접 사용 → 영향 없음)
  const fieldLabelFn = field === 'role' ? roleLabel : field === 'status' ? statusLabel : field === 'plan' ? planLabel : (x) => x;
  return (
    <div style={S.modalBg} onClick={applying ? undefined : onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={S.modalTitle}>{FIELD_LABEL[field] || field} 변경</h3>
        <div style={S.modalBody}>
          <div style={S.modalTarget}>{target.email || target.id}</div>
          <div style={S.modalDiff}>
            <span style={S.diffBefore}>{from ? fieldLabelFn(from) : '∅'}</span>
            <span style={{ color: T.textFaint }}> → </span>
            <span style={S.diffAfter}>{fieldLabelFn(to)}</span>
          </div>
        </div>
        <div style={S.modalActions}>
          <Btn onClick={onCancel} disabled={applying} style={{ padding: '8px 18px', fontSize: 13 }}>취소</Btn>
          <Btn variant="primary" onClick={onConfirm} disabled={applying} style={{ padding: '8px 18px', fontSize: 13 }}>
            {applying ? '적용 중…' : '변경'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// 세션96: 삭제 확인 모달.
//   "DELETE 입력" 같은 2차 관문은 두지 않았다. owner 전용 화면이고, 실수의 대부분은
//   '잘못된 사람을 골랐다'이지 '삭제를 눌렀다'가 아니다 → 대상 목록을 크게 보여주는 쪽이 실효 방어다.
function DeleteModal({ targets, deleting, onCancel, onConfirm }) {
  return (
    <div style={S.modalBg} onClick={deleting ? undefined : onCancel}>
      <div style={{ ...S.modal, width: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ ...S.modalTitle, color: T.danger }}>회원 삭제</h3>
        <div style={S.modalBody}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>
            선택한 회원 <b>{targets.length}명</b>을 삭제하시겠습니까?
          </div>
          <div style={S.delList}>
            {targets.map((t) => (
              <div key={t.id} style={S.delItem}>
                <span style={{ fontFamily: T.mono }}>{t.email || t.id}</span>
                <span style={{ color: T.textFaint, fontSize: 11 }}>
                  {planLabel(t.plan)} · {statusLabel(t.status)}
                </span>
              </div>
            ))}
          </div>
          <div style={S.delWarn}>
            계정 · 업체정보 · 발행이력 · 구독 · 결제이력이 모두 삭제됩니다.<br />
            삭제 후에는 복구할 수 없습니다.
          </div>
        </div>
        <div style={S.modalActions}>
          <Btn onClick={onCancel} disabled={deleting} style={{ padding: '8px 18px', fontSize: 13 }}>취소</Btn>
          <Btn onClick={onConfirm} disabled={deleting}
            style={{ padding: '8px 18px', fontSize: 13, background: T.danger, borderColor: T.danger, color: '#fff' }}>
            {deleting ? '삭제 중…' : '삭제'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function fmtDate(s) {
  if (!s) return '—';
  return s.slice(0, 10);
}

const S = {
  // 세션76 v0.5: 공통화된 키(head/h1/badge/refreshBtn/note/summaryRow/stat*/filterBtn/search/
  //   pageBtn/errBox/card/table/th/td/tdMono/select/miniBtn/blogSaveBtn/cancelBtn/confirmBtn) 삭제.
  //   → lib/adminTheme.js 로 승격됨. 여기 남은 것은 members 고유 배치·모달뿐.
  //   색은 전부 T 참조. 이 파일에 hex 를 새로 쓰지 말 것.
  // 상단 2단 — 좌우 균등. 좁은 화면에서는 접혀 세로로 쌓인다.
  topRow: { display: 'flex', gap: T.kpiGap, alignItems: 'stretch', flexWrap: 'wrap' },
  topLeft: { flex: '1 1 560px', minWidth: 0 },
  topRight: { flex: '1 1 400px', minWidth: 0, marginBottom: T.sectionGap },

  billBox: {
    height: '100%', boxSizing: 'border-box',
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: T.radiusCard, padding: '11px 14px',
  },
  billHead: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  billTitle: { fontSize: 12.5, fontWeight: 700, color: T.text },
  billNote: { fontSize: 10.5, color: T.textFaint },
  billBody: { display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  billAmount: { fontSize: 20, fontWeight: 700, color: T.textStrong, fontVariantNumeric: 'tabular-nums' },
  billLines: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  billLine: { fontSize: 11.5, color: T.textMuted },
  billFoot: { flexBasis: '100%', marginTop: 4, fontSize: 10.5, color: T.textFaint },
  billEmpty: { fontSize: 12, color: T.textFaint, paddingTop: 6 },

  filterRow: { display: 'flex', gap: 4, marginBottom: T.sectionGap, flexWrap: 'wrap', alignItems: 'center' },
  resultCount: { marginLeft: 'auto', fontSize: 12, color: T.textMuted },

  empty: { padding: '40px 16px', textAlign: 'center', color: T.textFaint },

  pager: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 16 },
  pageInfo: { fontSize: 13, color: T.textSoft, fontFamily: T.mono },
  pageSub: { color: T.textFaint, fontSize: 12 },

  ownerTag: { fontSize: 11, color: T.warn, marginTop: 2 },
  roleTag:  { fontWeight: 600, fontSize: 13 },
  planTag:  { fontSize: 12, color: T.textMuted, fontFamily: T.mono },
  quotaOver: { color: T.danger, fontWeight: 700 },
  quotaNear: { color: T.warn, fontWeight: 700 },
  quotaOk:   { color: T.ok },
  filterSep: { width: 1, height: 18, background: T.border, margin: '0 10px' },

  // 블로그계정 인라인 편집 (103차)
  blogInput: {
    background: T.surfaceAlt, border: `1px solid ${T.borderStrong}`, borderRadius: 5,
    padding: '3px 8px', fontSize: 12, color: T.text, width: 120, outline: 'none', fontFamily: T.mono,
  },
  storeName: { fontWeight: 600 },
  storeNone: { color: T.textMuted, opacity: 0.6 },
  blogLock: { opacity: 0.6, fontFamily: T.mono, fontSize: 12, color: T.textMuted },

  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 },
  modal: { background: T.surface, border: `1px solid ${T.borderStrong}`, borderRadius: 12, padding: 24, width: 360, maxWidth: '90vw', color: T.text },
  modalTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 16px' },
  modalBody: { marginBottom: 20 },
  modalTarget: { fontSize: 13, color: T.textMuted, marginBottom: 8, fontFamily: T.mono },
  modalDiff: { fontSize: 18, fontWeight: 700 },
  diffBefore: { color: T.danger, fontFamily: T.mono },
  diffAfter: { color: T.ok, fontFamily: T.mono },
  modalActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },

  // 세션96: 선택·삭제
  chk: { width: 14, height: 14, cursor: 'pointer', accentColor: T.info },
  chkLock: { fontSize: 11, opacity: 0.5 },
  rowSel: { background: 'rgba(96,165,250,0.07)' },
  selBar: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    background: T.surfaceAlt, border: `1px solid ${T.borderStrong}`, borderRadius: T.radiusCard,
    padding: '8px 12px', marginBottom: 10,
  },
  selCount: { fontSize: 13, fontWeight: 700, color: T.textStrong, marginRight: 4 },
  delBtn: { borderColor: T.danger, color: T.danger },
  delResult: {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusCard,
    padding: '10px 12px', marginBottom: 10, fontSize: 12.5,
  },
  delList: {
    maxHeight: 180, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 8,
    padding: 8, background: T.surfaceAlt, marginBottom: 12,
  },
  delItem: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '3px 2px' },
  delWarn: { fontSize: 12, color: T.danger, lineHeight: 1.6 },
};
