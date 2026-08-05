// ============================================================
// commonPhotoBox.js — light scene 업종 공통 PHOTO_POOL 처리 모듈
// 표준 채택: ortho v3.7.5 박스형 (분리배열 / strip 마지막 위치)
// ★ 적용 대상: dental / ent / ortho / gastro / general (light scene 5개)
// ★ 적용 금지: pain (density 체계 다름 / narrative weight 다름)
// ★ 적용 금지: derma / eye (narrative 전환 적용군)
//
// 설계 원칙:
//   1. 업종별 PHOTO_POOL은 각 generateXXX.js에 유지 (정체성 분리)
//   2. 공통 모듈은 "동작"만 제공 — ABSORB_RULES / whitelist / PATCH 미포함
//   3. PHILOSOPHY: scene·체류 강화 / 광고 SEO 방향 ❌
//   4. 기존 freeze (ortho v3.7.5 / gastro v3.0.2) 회귀 0 보장
//
// PHOTO_POOL 표준 형식 (분리배열):
//   {
//     "검사 사진": {
//       photos:   ["X-ray", "MRI 영상", "초음파 화면"],
//       captions: ["검사받던 날", "결과 같이 본 자리", "측정 끝나고"],
//     },
//     "상담 사진": { photos: [...], captions: [...] },
//     "시술 사진": { photos: [...], captions: [...] },
//     "재활 사진" or "치료 사진": { photos: [...], captions: [...] },
//     "일상 사진": { photos: [...], captions: [...] },
//   }
// ============================================================

// ── 박스 매칭 정규식 (재사용 가능 / 빈도 카운트 / 박스 제거) ──
export const BOX_HEAD_REGEX  = /┌─+┐/g;
export const BOX_BLOCK_REGEX = /\n┌─+┐[\s\S]*?└─+┘\n/g;

// ── 박스 placeholder 생성 (ortho v3.7.5 형식 표준) ──
// alt 카테고리가 풀에 없으면 [이미지: alt] 그대로 반환 (fallback)
export function buildPhotoPlaceholder(altRaw, photoPool) {
  const alt = String(altRaw || "").trim();
  if (!photoPool || !photoPool[alt]) return `[이미지: ${alt}]`;
  const pool = photoPool[alt];
  const photos   = Array.isArray(pool.photos)   ? pool.photos   : [];
  const captions = Array.isArray(pool.captions) ? pool.captions : [];
  if (photos.length === 0 || captions.length === 0) return `[이미지: ${alt}]`;
  const photo   = photos[Math.floor(Math.random() * photos.length)];
  const caption = captions[Math.floor(Math.random() * captions.length)];
  return `\n┌─────────────────────────────┐\n│ 📷 ${alt}\n│   ${photo}\n│   ${caption}\n└─────────────────────────────┘\n`;
}

// ── stripMarkdownForNaver — 네이버 평문 변환 + PHOTO_POOL 박스 변환 ──
// 표준 위치: 박스 변환은 ⑤ 마지막 (헤더 변환 후) — ortho v3.7.5 기준
// photoPool 미주입 시 박스 변환 skip → [이미지: alt] 그대로 유지
export function stripMarkdownForNaver(text, photoPool) {
  let t = text;

  // ① 줄 시작 헤더 변환 (제목·섹션·하위섹션)
  t = t.replace(/^#\s+(.+)$/gm,  "$1");          // # 제목 → 평문
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");      // ## 섹션 → 빈줄+텍스트+빈줄
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");        // ### 변화(1일/1주) → ▶ 마커

  // ② 인라인에 끼어있는 헤더 (줄바꿈 없이 본문 중간에 박힌 경우)
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1");   // " ## 제목" → 줄바꿈
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1");   // " ### 1일" → 줄바꿈+마커

  // ③ 굵게/이탤릭 마크다운 제거 (혹시 GPT가 출력했을 경우)
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");        // **굵게** → 평문
  t = t.replace(/\*([^*]+)\*/g, "$1");            // *이탤릭* → 평문

  // ④ 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  // ⑤ [이미지: XX 사진] → 박스 placeholder 변환 (풀 주입 시에만)
  if (photoPool) {
    t = t.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, alt) => buildPhotoPlaceholder(alt, photoPool));
  }

  return t;
}

// ── 박스 제외 본문 글자수 계산 ──
// stripMarkdownForNaver 처리 후의 평문에서 박스 블록만 제거하고 글자수 산출
// ※ calcCharCount는 generateUtils의 표준 함수 사용 (DI 주입)
export function calcContentCharCount(plainText, calcCharCountFn) {
  if (!plainText) return 0;
  const withoutBoxes = plainText.replace(BOX_BLOCK_REGEX, "\n");
  return calcCharCountFn(withoutBoxes);
}

// ── PHOTO_POOL QC 통합 ──
// 입력: 평문(strip 후), alt 검증 카테고리 (예: ["검사","상담","시술","치료","일상"])
// 반환: { altTotal, altOk, altBad, boxCount }
// 측정 위치는 stripMarkdownForNaver 처리 후의 평문 — gastro v3.0.2 측정 버그(strip 전 측정 = 0) 해소
export function qcPhotoBoxes(plainText, validAltCategories = []) {
  const altAll = plainText.match(/\[이미지:[^\]]+\]/g) || [];
  const altRegex = validAltCategories.length > 0
    ? new RegExp(`\\[이미지:\\s*(${validAltCategories.join("|")})\\s*사진\\]`)
    : null;
  const altOk = altRegex ? altAll.filter(a => altRegex.test(a)) : [];
  const boxCount = (plainText.match(BOX_HEAD_REGEX) || []).length;
  return {
    altTotal: altAll.length,           // 박스 변환 안 된 alt (= 풀 미매칭)
    altOk:    altOk.length,            // 정상 카테고리 alt
    altBad:   altAll.length - altOk.length,
    boxCount,                           // 박스 변환 성공 카운트
  };
}

// ── alt 정규화 (선택적 헬퍼) ──
// GPT가 본문에 만든 [이미지: ...] 를 5종 카테고리로 강제 통일
// 업종별 키워드 맵으로 알 수 없는 alt를 가장 가까운 카테고리로 매핑
// 사용 예:
//   const ALT_KEYWORD_MAP = {
//     "검사 사진": /검사|혈액|영상|진단|소견|x.?ray|초음파|내시경/i,
//     "상담 사진": /상담|설명|차트|문진|원장|의사|병원/,
//     ...
//   };
//   text = normalizeAltCategories(text, ALT_KEYWORD_MAP, "상담 사진");
export function normalizeAltCategories(text, altKeywordMap, fallback = "상담 사진") {
  return text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner).trim();
    // 이미 정상 카테고리면 그대로
    const validCats = Object.keys(altKeywordMap);
    const exact = validCats.find(c => c === s || new RegExp(`^${c.replace(/\s/g, "\\s*")}$`).test(s));
    if (exact) return `[이미지: ${exact}]`;
    // 키워드 매핑
    for (const cat of validCats) {
      if (altKeywordMap[cat].test(s)) return `[이미지: ${cat}]`;
    }
    return `[이미지: ${fallback}]`;
  });
}
