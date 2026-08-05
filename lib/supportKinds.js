// lib/supportKinds.js
// 세션96 — 접수 게시판 kind SoT (서버·클라이언트 공용)
//
// 게시판은 하나만 운영한다. 서비스별 테이블·페이지를 만들지 않고 kind 로만 구분한다.
// kind = 코드(불변). title = 표시 문구(가변).
//   제목 문자열을 필터 기준으로 쓰면 문구를 다듬는 순간 과거 글이 필터에서 사라진다.
//   그래서 DB check 제약과 이 파일이 같은 목록을 들고, 화면 문구는 title 로만 바꾼다.
//
// title 은 전부 '동작'으로 끝난다(신청/접수/제안). 폼 상단 제목으로 그대로 쓰이기 때문에
// 명사만 있으면 '블로그 타이틀 제작' 처럼 무엇을 하라는 화면인지 읽히지 않는다.
//
// 신규 접수 종류 추가 시 두 곳을 같이 고칠 것:
//   ① 이 파일   ② support_requests.kind CHECK 제약

export const SUPPORT_KINDS = {
  industry: { title: '내 업종 신청',     label: '내 업종',   color: '#60a5fa' },
  agency:   { title: '운영 대행 신청',   label: '운영대행',  color: '#a78bfa' },
  title:    { title: '블로그 타이틀 제작 신청', label: '타이틀', color: '#34d399' },
  issue:    { title: '불편사항 문의',     label: '불편사항',  color: '#f87171' },
  feature:  { title: '기능 개선 제안',    label: '기능제안',  color: '#fbbf24' },
};

export const SUPPORT_KIND_LIST = Object.keys(SUPPORT_KINDS);

// 사용자는 제목을 입력하지 않는다 — 버튼이 곧 제목이다.
// 클라이언트가 title 을 보내도 서버는 이 표를 쓴다(제목 위조·오타 유입 차단).
export const kindTitle = (k) => SUPPORT_KINDS[k]?.title || '기타 접수';
export const kindLabel = (k) => SUPPORT_KINDS[k]?.label || k || '—';
export const kindColor = (k) => SUPPORT_KINDS[k]?.color || '#9aa0aa';

export const SUPPORT_STATUS = {
  pending:   { label: '답변대기', color: '#fbbf24' },
  answered:  { label: '답변완료', color: '#60a5fa' },
  completed: { label: '처리완료', color: '#34d399' },
  archived:  { label: '보관',     color: '#94a3b8' },
};
export const SUPPORT_STATUS_LIST = Object.keys(SUPPORT_STATUS);

// 보관은 '기본 목록에서 빠지는' 상태다. 기본 조회·요약의 기준선이 되므로 별도 상수로 고정한다.
//   이 구분을 화면마다 하드코딩하면 어느 화면은 보관이 섞이고 어느 화면은 빠진다.
export const SUPPORT_STATUS_ACTIVE = ['pending', 'answered', 'completed'];
export const SUPPORT_STATUS_ARCHIVED = 'archived';
export const statusLabel = (s) => SUPPORT_STATUS[s]?.label || s || '—';
export const statusColor = (s) => SUPPORT_STATUS[s]?.color || '#9aa0aa';

export const SUPPORT_CONTACT_NOTE =
  '※ 업체정보에 연락처가 없다면 연락 가능한 전화번호를 함께 적어주세요.';
