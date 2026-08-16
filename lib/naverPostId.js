// lib/naverPostId.js
// BLOG-ACCOUNT-AUTO-LINK-01 · STEP 2 기반 순수함수
//
// 목적: 네이버 블로그 글 URL에서 { blogId, postId, canonical } 을 결정론적으로 추출한다.
//
// 원칙 (선장 확정):
//   · SoT = publish_history.naver_post_url. 이 함수의 반환값은 전부 파생값이며 DB에 저장하지 않는다.
//     (예외: blogId 는 accounts.blog_account 자동연결에만 쓰인다 — 기존 컬럼, 신규 0)
//   · postId 숫자 강제 금지. 실측에 blog.naver.com/test/verify_61cha 존재 → \d+ 로 잡으면 정상 URL을 버린다.
//   · postId 없어도 blogId 확정되면 반환한다 (postId: null). 계정 연결 가능성을 살린다.
//   · canonical = `${blogId}/${postId}` — 향후 ORBIT 검색결과 URL 자동대조가 소비.
//     postId 없으면 canonical 도 null (대조 불가 → 대조축이 판단).
//   · 네이버 HTML/DOM/fetch 의존 0. URL 문자열 파싱만 한다.
//   · 추정 금지. 확정 불가 시 null 반환. 부분 추측값을 만들지 않는다.
//
// 프론트(index.js:8654)와 서버(publish-secure.js)가 이 함수를 공유해 규칙을 단일화한다.

// 경로 세그먼트가 아닌 예약어 — blogId 로 오인하면 안 되는 값들
const _RESERVED = new Set([
  "postview.naver",
  "postlist.naver",
  "prologue",
  "guestbook",
  "postlist",
  "postview",
  "gadget",
  "widget",
  "api",
]);

// 네이버 블로그 호스트 (m. / blog. / 확장 없음)
const _HOST = /^(?:m\.)?blog\.naver\.com$/i;

/**
 * 네이버 블로그 글 URL → { blogId, postId, canonical }
 * 확정 불가 시 null.
 *
 * @param {string} url
 * @returns {{ blogId: string, postId: string|null, canonical: string|null } | null}
 */
export function extractNaverPost(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return null;

  let u;
  try {
    // 스킴 없는 입력(blog.naver.com/abc/123) 허용 — 사용자 붙여넣기 실측 대응
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!_HOST.test(u.hostname)) return null;

  let blogId = null;
  let postId = null;

  // ── 패턴 A: 쿼리형 — /PostView.naver?blogId=xxx&logNo=123
  const qBlogId = u.searchParams.get("blogId");
  const qLogNo = u.searchParams.get("logNo");
  if (qBlogId) {
    blogId = qBlogId.trim();
    if (qLogNo) postId = qLogNo.trim();
  }

  // ── 패턴 B: 경로형 — /{blogId}/{postId}  (실측 정본 형태)
  if (!blogId) {
    const seg = u.pathname.split("/").filter(Boolean);
    if (seg.length === 0) return null;

    const first = decodeURIComponent(seg[0]).trim();
    if (!first || _RESERVED.has(first.toLowerCase())) return null;
    blogId = first;

    if (seg.length >= 2) {
      const second = decodeURIComponent(seg[1]).trim();
      // 숫자 강제 없음. 비어있지 않고 예약어가 아니면 postId 로 인정.
      if (second && !_RESERVED.has(second.toLowerCase())) postId = second;
    }
  }

  if (!blogId) return null;

  return {
    blogId,
    postId: postId || null,
    canonical: postId ? `${blogId}/${postId}` : null,
  };
}

export default extractNaverPost;
