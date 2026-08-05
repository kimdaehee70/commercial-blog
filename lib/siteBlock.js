// ============================================================
// lib/siteBlock.js — 공사군 공통 「현장정보」 모듈 (세션61 신설)
//
// 목적: 공사군(도배·줄눈·탄성코트·필름·샷시·인테리어·시스템에어컨 …)은
//       지역보다 "현장(아파트 단지)"이 검색 진입점이다.
//       실측(2026-07-28, 네이버 블로그 용인/동백동 도배 약 60건):
//         제목 다수가 [지역]+[단지명]+[평형]+[자재]+[시공범위] 구조.
//         동일 단지가 여러 업체 글에 반복 등장(신동백롯데캐슬에코 7건).
//
// 책임 범위 (확정):
//   ✅ siteName(현장명·단지명) / siteSize(평형)  ← 공사군 공통 2필드만
//   ❌ 자재·제품명(벽지·줄눈재·필름 브랜드 등)은 업종마다 의미가 달라
//      공통 인프라가 아니다. 각 업종 *-data.js / serviceInfo 에서 처리한다.
//
// 성격: locationBlock.js 와 동형 — narrative·prompt·QC 무관.
//       응답 직전 문자열 삽입 + 제목 접두 조립 전용. SCENE_SPINE 무영향.
//
// 저장 계층: A안(글 단위). DB 미저장, req.body 수신 → 생성 시 1회 사용.
//   향후 B안(site_profiles 재사용) 승격 시 저장 계층만 얹으면 되고
//   프론트 입력부·핸들러 수신부는 무수정으로 유지된다.
// ============================================================

// ── 정규화 ──────────────────────────────────────────────
//   공백 정리만 한다. 사용자 입력값을 임의로 가공하지 않는다(브랜드·단지명 원형 보존).
function norm(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}

// 평형 표기 보정 — 숫자만 입력해도 "34평"으로 통일.
//   "34" → "34평" / "34평" → "34평" / "84㎡" → "84㎡"(원형 유지) / "" → ""
function normSize(v) {
  const s = norm(v);
  if (!s) return "";
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}평`;
  return s;
}

// ── 입력 파싱 ───────────────────────────────────────────
//   핸들러는 req.body 를 그대로 넘긴다. 키 부재/빈값 = 미사용(부작용 0).
export function parseSite(body) {
  const b = body || {};
  return {
    siteName: norm(b.siteName),
    siteSize: normSize(b.siteSize),
  };
}

// 현장정보 보유 여부 — 단지명이 없으면 평형만으로는 축이 서지 않는다.
export function hasSite(site) {
  return !!(site && site.siteName);
}

// ── 제목 접두 조립 ──────────────────────────────────────
//   ★ titleEngine 은 건드리지 않는다. 핸들러 buildTitle 전단에서만 분기한다.
//     siteName 있음 → [지역] [단지명] [평형] [메뉴]
//     siteName 없음 → null 반환 → 기존 titleEngine / legacy 경로 그대로.
//
//   제목 길이 상한은 titleEngine 과 동일 기준(40자)을 쓴다.
//   초과 시 평형을 먼저 떨어뜨리고, 그래도 넘치면 null(기존 경로 축퇴).
const MAX_TITLE_LEN = 40;

export function buildSiteTitleOrNull(region, treatment, site) {
  try {
    const s = site || {};
    if (!s.siteName) return null;
    const rg = norm(region);
    const kw = norm(treatment && treatment.name);
    if (!kw) return null;

    // 단지명에 지역이 이미 포함된 경우 지역 중복 제거
    //   예) region="용인" + siteName="용인동백두산위브더제니스" → 지역 생략
    const rgPart = rg && !s.siteName.includes(rg) ? `${rg} ` : "";

    const full = `${rgPart}${s.siteName} ${s.siteSize} ${kw}`.replace(/\s{2,}/g, " ").trim();
    if (full.length <= MAX_TITLE_LEN) return full;

    // 1차 축퇴: 평형 제거
    const noSize = `${rgPart}${s.siteName} ${kw}`.replace(/\s{2,}/g, " ").trim();
    if (noSize.length <= MAX_TITLE_LEN) return noSize;

    // 2차: 그래도 초과 → 기존 경로에 맡긴다
    return null;
  } catch (_e) {
    return null;
  }
}

// ── 본문 현장정보 블록 ──────────────────────────────────
//   정보박스 1개. 자재·시공범위는 업종별 데이터가 소유하므로 여기서 만들지 않는다.
export function buildSiteBlock(site) {
  const s = site || {};
  if (!s.siteName) return "";
  const lines = ["[ 현장 정보 ]", `· 현장명: ${s.siteName}`];
  if (s.siteSize) lines.push(`· 평형: ${s.siteSize}`);
  return "\n" + lines.join("\n") + "\n";
}

// ── 후단 삽입 (locationBlock 과 동형) ───────────────────
//   맨 끝 줄이 해시태그(#)인 핸들러용. 해시태그를 떼어 [본문+현장블록+해시태그] 재조립.
//   현장정보 미입력 → 원문 그대로 반환(부작용 0, 일반글쓰기 무영향).
export function insertSiteBeforeHashtags(text, site) {
  const block = buildSiteBlock(site);
  if (!block) return text;

  const src = String(text || "");
  const lines = src.split("\n");

  // 뒤에서부터 해시태그 줄 탐색 (공백 줄은 건너뜀)
  let idx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith("#")) { idx = i; break; }
    break;
  }

  if (idx === -1) {
    // 해시태그 없음 → 맨 끝에 붙인다
    return (src.trimEnd() + "\n" + block).replace(/\n{3,}/g, "\n\n").trim();
  }

  const head = lines.slice(0, idx).join("\n").trimEnd();
  const tail = lines.slice(idx).join("\n").trim();
  return `${head}\n${block}\n${tail}`.replace(/\n{3,}/g, "\n\n").trim();
}

// 해시태그를 별도 인자로 넘기는 핸들러용 (appendLocationBlock 과 동형)
export function appendSiteBlock(body, site, hashtags) {
  const block = buildSiteBlock(site);
  const parts = [String(body || "").trimEnd()];
  if (block) parts.push(block.trim());
  if (hashtags) parts.push(String(hashtags).trim());
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default {
  parseSite, hasSite, buildSiteTitleOrNull, buildSiteBlock,
  insertSiteBeforeHashtags, appendSiteBlock,
};
