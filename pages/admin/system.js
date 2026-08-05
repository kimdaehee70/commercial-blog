// pages/admin/system.js
// 세션76 v0.3 — 다크 전환 (축 ②-⑤)
//   라이트 표(#f3f4f6 헤더)를 콘솔 다크로. 표는 공통 Table/Th/Td 로 교체.
//   read-only · 4 truth 계층 · API 무접촉.
//
// 세션76 v0.2 — AdminLayout 이관 (표시 계층만. 데이터·가드·API 무접촉)
//   최상위 div의 padding:16 이 곧 상단 네비 들여쓰기였다 → 레이아웃이 소유.
//   loading/error 상태에도 동일 바 표시.
//
// 83차 v0.1 — STUB 복구 (bak_46cha 기준)
// - 변경 1건: OWNER_UID 로컬 상수 → lib/constants import (admin 컨벤션 통일)
// - 나머지 로직 / UI / API 호출 무변경
//
// 38차 — 운영 truth dashboard (read-only)
// DB 실존 테이블/뷰의 count + last created_at 가시화
// 수정 ❌ / 자동 보정 ❌ / 가시화 only
//
// 4 truth 계층:
//   1. 코드 truth — .from('xxx') 사용 여부
//   2. DB truth   — information_schema.tables 실존
//   3. row truth  — count > 0
//   4. runtime truth — 실제 응답 정상

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { useAdminGuard } from "../../lib/useAdminGuard";
import { AdminLayout } from "../../lib/adminLayout";
import { T, PageHead, Table, Th, Td, Btn, Badge, ErrBox, sectionTitleStyle } from "../../lib/adminTheme";

export default function SystemPage() {
  const router = useRouter();
  // 공통 가드 — B방식: 판정만 위임, /login 리다이렉트는 effect로 보존
  const { authState, session, loading: authLoading } = useAdminGuard();
  const authed = authState === 'owner';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  // B방식: unauth/non-owner → 기존처럼 /login 리다이렉트
  useEffect(() => {
    if (authState === 'unauth' || authState === 'non-owner') {
      router.replace("/login");
    }
  }, [authState, router]);

  // owner 확정 시에만 최초 로드 (기존 가드 effect의 load(token) 호출 대체)
  useEffect(() => {
    if (authState !== 'owner' || !session?.access_token) return;
    load(session.access_token);
  }, [authState, session]);

  async function load(token) {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/system-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "load_failed");
      setData(j);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await load(session.access_token);
  }

  if (authState === 'unauth' || authState === 'non-owner') return null;
  if (!authed) return null;
  if (loading) return <AdminLayout current="/admin/system" theme="dark"><span style={{ color: T.textMuted }}>loading…</span></AdminLayout>;
  if (err) return <AdminLayout current="/admin/system" theme="dark"><ErrBox>error: {err}</ErrBox></AdminLayout>;
  if (!data) return null;

  const tables = data.tables || [];
  const views = data.views || [];
  const checkedAt = data.checked_at || "";

  return (
    <AdminLayout current="/admin/system" theme="dark">
      <PageHead
        title="시스템"
        version="truth dashboard"
        sub={`DB 실존 테이블·뷰 가시화 (read-only · 자동조치 없음) · checked ${checkedAt || '—'}`}
        right={<Btn onClick={refresh}>↻ 새로고침</Btn>}
      />

      {/* 테이블 */}
      <section>
        <h2 style={secTitle}>Tables ({tables.length})</h2>
        <Table minWidth={780}>
          <thead>
            <tr>
              <Th>name</Th>
              <Th width={110}>exists</Th>
              <Th align="right" width={90}>count</Th>
              <Th>last created_at</Th>
              <Th>note</Th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.name}>
                <Td mono>{t.name}</Td>
                <Td>{renderExists(t.exists)}</Td>
                <Td align="right" mono>
                  {t.exists ? (t.count == null ? "—" : t.count) : "—"}
                </Td>
                <Td mono style={{ color: T.textMuted }}>{t.last_created_at || "—"}</Td>
                <Td style={tdNote}>{t.note || ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      {/* 뷰 */}
      <section>
        <h2 style={secTitle}>Views ({views.length})</h2>
        <Table minWidth={640}>
          <thead>
            <tr>
              <Th>name</Th>
              <Th width={110}>exists</Th>
              <Th align="right" width={90}>count</Th>
              <Th>note</Th>
            </tr>
          </thead>
          <tbody>
            {views.map((v) => (
              <tr key={v.name}>
                <Td mono>{v.name}</Td>
                <Td>{renderExists(v.exists)}</Td>
                <Td align="right" mono>
                  {v.exists ? (v.count == null ? "—" : v.count) : "—"}
                </Td>
                <Td style={tdNote}>{v.note || ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </AdminLayout>
  );
}

// 세션76: ✓/✗ 문자 → 공통 Badge. 콘솔 전체의 상태 표시 규칙과 일치시킨다.
function renderExists(v) {
  if (v === true) return <Badge tone="ok">정상</Badge>;
  if (v === false) return <Badge tone="danger">없음</Badge>;
  return <Badge>확인불가</Badge>;
}

// 세션76: 표 스타일은 adminTheme 의 Table/Th/Td 소유. 여기 남은 것은 섹션 제목·note 셀뿐.
const secTitle = sectionTitleStyle;
const tdNote = { color: T.textMuted, fontSize: 11.5 };
