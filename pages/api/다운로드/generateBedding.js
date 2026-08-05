// pages/api/generateBedding.js
// 이브자리 용인점 — 정보형 생성기 (generateEnt 구조 참고, 완전 독립)
// 핵심: 매장 화자 + 정보형 7섹션 + 후기 표현 후처리 차단 + QC 로그 3종
// FREEZE 무관(신규 파일). 기존 generate*.js 무수정.

import {
  BEDDING_TREATMENTS,
  BEDDING_REGION_DEFAULT,
} from "../../lib/bedding-data.js";
import {
  buildBeddingSystemPrompt,
  buildBeddingPrompt,

  getBeddingImageAlts,
  BEDDING_FORBIDDEN,
  BEDDING_STORE_DEFAULT,
} from "../../lib/bedding-prompts.js";
import {
  BEDDING_FLOW,
  BEDDING_CAT_FORM,
  BEDDING_MIN_TOTAL,
  BEDDING_TARGET_MIN,
  BEDDING_TARGET_MAX,
} from "../../lib/bedding-playConfig.js";
// [fix] 공통 GPT 호출부 — 다른 엔진(generateEnt 등)과 동일 방식. callGPT 미연결 throw 제거.
//   diagnosePost: 응답 seoScore 산출(클라 result 헤더 SEO 표시용).
import { generateSection, diagnosePost } from "./generateUtils";
// [v-loc] 위치/주차 공통 후단 블록 — 전 업종 공유 모듈. 본문 맨 끝(해시태그 위) 삽입.
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
// [세션54] 제목 꼬리(가게명 Suffix) 공통 정책 SoT — 토글 ON + 실제 업체명일 때만 부착.
//   bedding은 titleEngine 미사용(자체 buildTitle) → 완성 제목 후단에 1회 적용.
import { resolveTitleSuffix } from "../../lib/spine/titleSuffixRegistry.js";

// ── 제목 생성 (bedding-data.js titlePatterns 기반 / 제목은 대표지역 고정) ──
// [v19 D] titleRegion = 대표지역("용인")만 사용. 본문 region(생활권: 처인구 역북동 등)과 분리.
//   배경: 클라(index.js)가 userRegion="처인구 역북동"을 보내 제목까지 세분화됨
//        → "처인구 역북동 여름이불"(검색량 0) 생성.
//   결정(반장 2026-06-19): 1매장·1계정·1대표지역 단계 → 제목은 전부 "용인"으로 클러스터 집중.
//        생활권(처인구/역북동/김량장동)은 본문에서만 사용. 처인구 제목 확장은 관측 후 판단.
function buildTitle({ titleRegion, treatmentName, treatmentId }) {
  // [fix] 하드코딩 ABC 풀 제거 → bedding-data.js의 titlePatterns 사용.
  //   기존 버그: B/C 패턴에 {region}이 없어 33% 확률로만 지역 제목 생성.
  //   data.js titlePatterns는 전부 "{region} …" 형식이라 항상 지역 포함됨.
  const t = BEDDING_TREATMENTS.find((x) => x.id === treatmentId);
  const patterns =
    t && Array.isArray(t.titlePatterns) && t.titlePatterns.length
      ? t.titlePatterns
      : [`{region} ${treatmentName} 선택 시 확인할 기준`]; // fallback도 region 포함형

  // 패턴 랜덤 선택 → {region}을 대표지역(titleRegion)으로 치환 (생활권 미주입)
  let title = patterns[Math.floor(Math.random() * patterns.length)].replace(
    /\{region\}/g,
    titleRegion
  );

  // 제목 중복 방지: 같은 키워드 2회 등장 시 1회로 축약
  title = title.replace(new RegExp(`(${treatmentName}).*(${treatmentName})`), "$1");
  // 안전장치: 후기/추천이 어쩌다 끼면 제거
  title = title.replace(/후기|추천|체험|만족/g, "").replace(/\s{2,}/g, " ").trim();
  return title;
}

// ── 해시태그 생성 [v19 B] (매뉴얼 PART2 후처리 8단계 — 본문 말미 텍스트 삽입) ──
// 방식 B-1: 네이버는 본문 끝 #태그를 자동 태그로 인식 → 별도 tags 컬럼/스키마 변경 0.
// 구성: (시·구)+상품, (시·구)+이불, 상품명, data.js keywords, 매장명.
//   - 시·구 둘 다 포함(검색 유입 양쪽). 9개 이내(PHILOSOPHY 과밀 회피 — 태그란은 본문 3회 제한과 별개 영역).
//   - 공백 제거(네이버 해시태그는 공백 불가). 중복 제거 후 9개 컷.
// [세션54][HOTFIX] BEDDING_HASHTAG_REGIONS = ["용인","처인구"] 하드코딩 제거.
//   증상: 노원구 매장 글에 #용인기능성베개 태그가 붙어 본문·주소와 지역 충돌(검색 노이즈).
//   원인: 1매장 고정 전제의 상수. 전국 이브자리 공통 엔진 목표와 충돌.
//   범위: 해시태그 지역 산출 1개소만. 프롬프트·FLOW·본문 구조·V2 철학 무변경.
//   산출: 대표지역(repRegion) + 행정구(구/시/군 토큰). 둘 다 없으면 지역 태그 생략(빈 지역 태그 방지).
function deriveHashtagRegions(repRegion, region) {
  // 대표지역: "서울 노원구" → "노원구" / "경기 용인시 처인구" → "용인시"·"처인구" 후보
  const src = [String(repRegion || ""), String(region || "")].join(" ");
  const toks = src.split(/\s+/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const t of toks) {
    // 행정구역 접미(구/시/군)만 채택. 광역시·도(서울/경기 등)와 동(洞)은 태그 대상 아님.
    if (!/(구|시|군)$/.test(t) || t.length < 2) continue;
    // "용인시" → "용인" (검색 관용 표기). "노원구"·"처인구"는 그대로.
    const tag = /시$/.test(t) ? t.replace(/시$/, "") : t;
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, 2); // 최대 2개 (기존 구성 폭 유지: 시 + 구)
}
function buildBeddingHashtags({ treatmentName, treatmentId, store, repRegion, region }) {
  const t = BEDDING_TREATMENTS.find((x) => x.id === treatmentId);
  const nm = String(treatmentName || "").replace(/\s/g, "");
  const kw = (t?.keywords || []).map((k) => String(k).replace(/\s/g, ""));
  const storeTag = ("이브자리" + String(store || "").replace(/\s/g, "")).replace(/\s/g, "");

  // [세션54] 지역 태그 = 실제 매장 지역에서 파생. 지역 미확보 시 지역 태그 자체를 생략.
  const RG = deriveHashtagRegions(repRegion, region);
  const regionTags = [];
  for (const r of RG) { regionTags.push(r + nm); regionTags.push(r + "이불"); }

  const raw = [
    ...regionTags,                      // 노원구기능성베개 / 노원구이불 …
    nm,                                 // 기능성베개
    ...kw,                              // data.js keywords (냉감이불 등)
    storeTag,                           // 이브자리용인처인구청점
  ];
  // 중복 제거 → 9개 컷 → # 부착
  const tags = [...new Set(raw.filter(Boolean))].slice(0, 9);
  return tags.map((x) => "#" + x).join(" ");
}

// ── 후처리: cleanBeddingText (매뉴얼 PART2 cleanText 역할) ─────────
function cleanBeddingText(text, { region, treatmentName }) {
  let t = text;

  // 1) 후기/구매자 화자 표현 → 정보형으로 치환 (방어선)
  const swaps = [
    [/써\s?봤[어다습니다요]*/g, "확인해보면"],
    [/써보니/g, "보면"],
    [/사용해보니/g, "살펴보면"],
    [/구매(했|해)[어다습니다요]*/g, "준비할 때"],
    [/구입(했|해)[어다습니다요]*/g, "준비할 때"],
    [/바꿔봤[어다습니다요]*/g, "교체할 때"],
    [/만족(스러웠|했|도)[어다습니다요]*/g, "확인하면 좋습니다"],
    [/강력?추천(합니다|해요|드립니다)?/g, "확인해보시면 좋습니다"],
    [/추천(합니다|해요|드립니다)/g, "확인해보시면 좋습니다"],
    [/내돈내산/g, ""],
    [/리얼\s?후기/g, "정보"],
    [/솔직\s?후기/g, "정리"],
  ];
  for (const [re, to] of swaps) t = t.replace(re, to);

  // 2) AI 논문형 제거
  t = t.replace(/결론적으로|정리하면,?|따라서,?/g, "").replace(/살펴보겠습니다/g, "정리해보겠습니다");

  // 3) 키워드 과밀: "region treatmentName" 4회째부터 자연 치환
  const full = `${region} ${treatmentName}`;
  let cnt = 0;
  t = t.replace(new RegExp(full, "g"), () => (++cnt <= 3 ? full : "이 침구"));

  // 4) 조사/공백 오류 간이 교정
  t = t.replace(/를\s{2,}/g, "를 ").replace(/받고나면/g, "받고 나면").replace(/\s{2,}/g, " ");

  // 5) 본문 중간 해시태그 제거
  t = t.replace(/(^|\n).*#\S+.*(?=\n|$)/g, (m) => (m.split("#").length > 2 ? "" : m));

  return t.trim();
}

// ── 중복 제거 (섹션 간 문장·문단 반복 차단) [fix v16-B] ──────────
//   4000자 비대화의 두 축: (1)인사말 7회 (2)섹션 간 중복. (2)를 여기서 처리.
//   - 문장 단위: 동일 문장(20자↑)이 재등장하면 2회째부터 삭제.
//   - 문단 단위: 인접 동일 문단 제거.
//   - 사진 슬롯 [이미지:…] 토큰은 카운트/삭제 대상에서 제외(보존).
function removeBeddingDuplicates(text) {
  const PHOTO = /^\[이미지:\s*[^\]]+\]$/;

  // 1) 문장 단위 dedup
  const seen = new Set();
  const norm = (s) => s.replace(/\s+/g, "").replace(/[.,!?·…]/g, "");
  const dedupSentences = (para) => {
    // 슬롯 토큰 문단은 그대로 통과
    if (PHOTO.test(para.trim())) return para;
    const sentences = para.split(/(?<=[.!?])\s+/);
    const kept = [];
    for (const s of sentences) {
      const key = norm(s);
      if (key.length >= 20 && seen.has(key)) continue; // 20자↑ 중복 문장만 제거
      if (key.length >= 20) seen.add(key);
      kept.push(s);
    }
    return kept.join(" ").trim();
  };

  const paras = text.split(/\n{2,}/).map((p) => p.trimEnd());
  const out = [];
  let prevNorm = "";
  for (const p of paras) {
    const cleaned = dedupSentences(p);
    if (!cleaned) continue;
    const pn = norm(cleaned);
    // 2) 인접 동일 문단 제거(슬롯 제외)
    if (!PHOTO.test(cleaned.trim()) && pn && pn === prevNorm) continue;
    prevNorm = PHOTO.test(cleaned.trim()) ? prevNorm : pn;
    out.push(cleaned);
  }
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}


function runQC(body, { region, treatmentName, store }) {
  const forbiddenHits = BEDDING_FORBIDDEN.filter((w) => body.includes(w));
  const speakerOK = body.includes(`이브자리 ${store}`);
  const full = `${region} ${treatmentName}`;
  const fullCount = (body.match(new RegExp(full, "g")) || []).length;
  const charLen = body.replace(/\s/g, "").length;

  const qc = {
    화자고정: speakerOK,                       // true 여야 A
    금지어: forbiddenHits.length,              // 0 이어야 A
    금지어목록: forbiddenHits,
    복합키워드: fullCount,                      // 3 이하 권장
    글자수: charLen,                            // 1800+ 권장
    판정: speakerOK && forbiddenHits.length === 0 ? "A(정보형)" : "B(후기/혼합 의심)",
  };
  console.log("[QC] 화자고정:", qc.화자고정);
  console.log("[QC] 금지어:", qc.금지어, qc.금지어목록);
  console.log("[QC] 복합키워드:", qc.복합키워드, "/ 글자수:", qc.글자수);
  return qc;
}

// ── 사진 슬롯 (generateEnt ENT_PHOTO_POOL 패턴 이식 / 침구 매장 맥락 6종) ──
//   목적: 본문에 [이미지: …] 슬롯 삽입 → 네이버 붙여넣기 시 사진 위치 안내.
//   key별 정밀 매핑 아님 — 섹션 '순서' 기준 배분(BEDDING_ALT_SEQ). 정밀도는 v16 보류.
const BEDDING_PHOTO_POOL = {
  "매장 외관 사진": {
    photos: ["매장 정면 외관", "간판·입구 전경", "주차 안내 위치"],
    captions: ["매장 찾아오던 길", "입구에서 한 컷", "들어가기 전 외관"],
  },
  "매장 내부 사진": {
    photos: ["매장 내부 전경", "진열 코너 통로", "상담 공간"],
    captions: ["둘러보던 매장 안쪽", "제품 진열된 통로", "편하게 살펴보던 공간"],
  },
  "제품 진열 사진": {
    photos: ["제품 라인업 진열대", "소재별 코너", "베개·침구 진열"],
    captions: ["나란히 비교해보던 제품", "소재별로 정리된 코너", "직접 만져보던 진열대"],
  },
  "제품 상세 사진": {
    photos: ["소재 단면·태그", "충전재·커버 디테일", "제품 라벨·사양"],
    captions: ["소재 확인하던 순간", "충전재 직접 본 디테일", "사양표 살펴보던 컷"],
  },
  "상담 사진": {
    photos: ["상담 데스크", "체형·사용환경 상담", "옵션 비교 안내"],
    captions: ["상담받던 자리", "사용환경 설명 듣던 순간", "옵션 비교해보던 시간"],
  },
  "안내 사진": {
    photos: ["관리·세탁 안내", "보증·교환 안내", "마무리 포장"],
    captions: ["관리법 안내받던 순간", "보증 내용 확인하던 컷", "구매 마치고 나오던 길"],
  },
};

function buildBeddingPhotoPlaceholder(altRaw) {
  const alt = String(altRaw || "").trim();
  const pool = BEDDING_PHOTO_POOL[alt];
  if (!pool) return `[이미지: ${alt || "상담 사진"}]`;
  const photo   = pool.photos[Math.floor(Math.random() * pool.photos.length)];
  const caption = pool.captions[Math.floor(Math.random() * pool.captions.length)];
  // 네이버 편집용 포맷: 박스 앞뒤 빈 줄 + 박스 내부 여백(사진 자리 한눈에).
  //   앞에 \n\n, 박스 내부 빈 줄, 뒤에 \n\n → 다음 문단과 충분히 떨어짐.
  return `\n\n━━━━━━━━━━━━━━━━━━━━\n\n📷 ${alt}\n\n추천 : ${photo}\n캡션 : ${caption}\n\n━━━━━━━━━━━━━━━━━━━━\n\n`;
}

// 섹션 순서 기준 alt 배분 (key 무의존). 섹션 7개 → 사이사이 최대 6개 슬롯.
const BEDDING_ALT_SEQ = [
  "매장 외관 사진",
  "매장 내부 사진",
  "제품 진열 사진",
  "제품 상세 사진",
  "상담 사진",
  "안내 사진",
];

// [이미지: X] → ━박스 변환 (응답 직전 1회). ent stripMarkdownForNaver의 박스 변환부와 동일 역할.
function convertBeddingPhotoBoxes(text) {
  let t = text.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => buildBeddingPhotoPlaceholder(inner));
  // 박스 앞뒤 여백 보존: 4줄 이상만 3줄로 정리(슬롯이 문단과 붙어 보이는 것 방지).
  t = t.replace(/\n{4,}/g, "\n\n\n");
  return t.trim() + "\n";
}

// ── GPT 호출 래퍼 ────────────────────────────────────────────────
// [fix] 공통 generateSection 위임 — generateEnt.js와 동일 openai 경로.
//   기존 __beddingGPT 미연결 throw(500 BEDDING_GENERATE_FAILED 원인) 제거.
async function callGPT({ system, user }) {
  return generateSection({ systemPrompt: system, userPrompt: user });
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
export default async function handleBedding(req, res) {
  try {
    // [fix] 계약 정렬 — 클라이언트(index.js)/다른 엔진(ent)과 동일하게 program 객체·userRegion에서 읽는다.
    //   기존: top-level treatmentId·region 직접 분해 → 항상 undefined → find 실패 → 400 BEDDING_TREATMENT_NOT_FOUND.
    //   클라 페이로드: { program: treatment(객체), userRegion, storeName, overrideTitle, ... }
    const {
      program,
      userRegion,
      storeName,
      overrideTitle,
      repRegion,     // [세션54] 대표지역 — 해시태그 지역 산출용(index.js가 hubStore.region에서 전송)
      titleSuffixOn, // [세션54] 제목 끝 업체명 표시 토글(store_profiles.title_suffix_on)
    } = req.body || {};

    // [v-loc] 위치 공통화 — req.body 위치 필드 수신(LocationBlock 후단 주입용).
    //   index.js가 hubStore에서 실어 보냄. store 객체와 별개(아래 store는 지점명 문자열로 덮임).
    const locStore = {
      address:       req.body?.address,
      map_guide:     req.body?.map_guide,
      transit:       req.body?.transit,
      building_desc: req.body?.building_desc,
      parking_info:  req.body?.parking_info,
    };

    // [v19 D] region 이원화:
    //   · region(본문용) = userRegion 원본(생활권: "처인구 역북동" 등) → 본문·QC·키워드카운트에 사용.
    //   · titleRegion(제목용) = 대표지역 "용인" 고정 → 제목에만 사용. 클러스터 집중("용인 여름이불").
    //   생활권을 제목에 넣지 않아 검색량 0 롱테일("처인구 역북동 여름이불") 생성 차단.
    const region = (userRegion || BEDDING_REGION_DEFAULT).trim();
    const titleRegion = BEDDING_REGION_DEFAULT; // "용인" (bedding-data.js)
    // [세션54][HOTFIX] 지점명 정규화 — 브랜드 토큰 위치 무관 제거.
    //   기존: /^이브자리\s*/ (접두사만) → "노원 이브자리" 입력 시 뒤쪽 토큰이 남아
    //         프롬프트 접두사와 겹쳐 "이브자리 노원 이브자리" 중복 출력.
    //   원칙: 업체명은 엔진이 만들지 않는다. 사용자가 등록한 값에서 브랜드 토큰만 걷어내고 그대로 쓴다.
    //   예) "이브자리 처인구청점"→"처인구청점" / "노원 이브자리"→"노원" / "이브자리 관리자"→"관리자"
    //       "이브자리"(단독)→"" → 기본값. 프롬프트의 "이브자리 ${store}" 구조는 무변경(FREEZE).
    //   ※ 붙여쓴 입력("노원이브자리점")은 토큰 제거 후 남는 조각을 다시 붙여 "노원점"으로 복원.
    const store  = ((storeName || "")
                     .replace(/\s*이브자리\s*/g, "\u0000")   // 브랜드 토큰 자리를 마커로
                     .split("\u0000").filter(Boolean)
                     .join(" ").replace(/\s{2,}/g, " ").trim()
                     .replace(/\s+점$/, "점"))                // "노원 점" → "노원점"
                 || BEDDING_STORE_DEFAULT;

    // ent 패턴 동일: id 또는 name 매칭, 못 찾으면 [0] fallback(400 미발생).
    const t = BEDDING_TREATMENTS.find((x) => x.id === program?.id || x.name === program?.name)
      || BEDDING_TREATMENTS[0];
    const treatmentId   = t.id;
    const treatmentName = t.name;
    const contentForm = BEDDING_CAT_FORM[treatmentId] || "선택기준형";

    // [세션54][FIX] 제목 끝 업체명 표시 — 토글이 전송되고 있었으나 이 핸들러가 읽지 않아 미반영이던 배선을 연결.
    //   제목 패턴·생성 로직 무변경. 완성된 제목 후단에 " | {업체명}" 1회만 부착.
    //   업체명 = 사용자 입력 원본(storeName). 지점명 정규화(store)와 별개 — 등록값 그대로 노출.
    //   overrideTitle(사용자가 직접 쓴 제목)에도 동일 정책 적용(토글 의도 존중, 중복 시 미부착).
    const _titleSfx = resolveTitleSuffix({ enabled: !!titleSuffixOn, storeName: (storeName || "").trim() });
    let title = overrideTitle || buildTitle({ titleRegion, treatmentName, treatmentId });
    if (_titleSfx.enabled && !title.includes(_titleSfx.storeName)) {
      title = title.trim() + _titleSfx.separator + _titleSfx.storeName;
    }
    const system = buildBeddingSystemPrompt({ store, region, treatmentName });

    // 7섹션 순차 생성 (prevSummary 미사용 — 반복 방지)
    const written = new Set();
    const parts = [];
    for (const sec of BEDDING_FLOW) {
      if (written.has(sec.key)) continue;
      written.add(sec.key);
      const user = buildBeddingPrompt({ section: sec.key, treatmentId, treatmentName, region, store });
      const chunk = await callGPT({ system, user });
      parts.push(chunk);
    }

    // [fix v16-B] 인사말 7→1: intro(parts[0]) 외 섹션 첫머리 "안녕하세요…" 문장 제거.
    //   시스템 프롬프트가 전 섹션 공통 주입돼 GPT가 매 섹션 인사말을 만드는 문제 → 조립 전 strip.
    //   parts[0]은 정식 첫 인사말이므로 보존. 1번 이후만 선두 인사말 1문장 제거.
    const dedupParts = parts.map((chunk, i) => {
      if (i === 0) return chunk;
      return chunk.replace(/^\s*안녕하세요[.,]?\s*이브자리[^.!?\n]*[.!?]\s*/, "").trimStart();
    });

    // [fix] 사진 슬롯 교차 삽입 (generateEnt 조립부 패턴 / 순서 기준 배분).
    //   섹션 사이마다 [이미지: X] 1개. 마지막 섹션 뒤에는 안 붙임(끝 슬롯 방지).
    //   key 무의존 — BEDDING_ALT_SEQ를 순서대로 순환. 정밀 매핑은 v16.
    const assembledParts = [];
    dedupParts.forEach((chunk, i) => {
      assembledParts.push(chunk);
      if (i < dedupParts.length - 1) {
        const alt = BEDDING_ALT_SEQ[i % BEDDING_ALT_SEQ.length];
        assembledParts.push(`[이미지: ${alt}]`);
      }
    });

    let body = assembledParts.join("\n\n");
    body = cleanBeddingText(body, { region, treatmentName });
    body = removeBeddingDuplicates(body);  // [fix v16-B] 섹션 간 문장·문단 중복 제거

    // 첫 문장 화자 보정 (누락 시 강제 삽입)
    if (!body.startsWith("안녕하세요. 이브자리")) {
      body = `안녕하세요. 이브자리 ${store}입니다.\n\n` + body;
    }

    // [fix] 슬롯 직후 인사말 재등장 금지 — GPT가 섹션 본문 첫 문장에 만든 "안녕하세요…" 가
    //   사진 슬롯 바로 뒤에 오면 어색(맨 앞 정식 화자 인사말만 남겨야 함).
    //   슬롯 토큰 직후의 안녕하세요~문장부호 1개만 제거. 본문 맨 앞 인사말은 패턴 불일치로 보존.
    body = body.replace(/(\[이미지:\s*[^\]]+\]\s*)안녕하세요[^.!?\n]*[.!?]\s*/g, "$1");

    // [fix] QC·글자수는 사진 슬롯 토큰을 제외한 평문 기준으로 계산(슬롯이 금지어/키워드 카운트 오염 방지).
    const bodyPlain = body.replace(/\[이미지:\s*[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim();

    // 글자수 미달 시 표시(강제 생성 반복 금지 — 과최적화 회피)
    const charLen = bodyPlain.replace(/\s/g, "").length;
    const lenWarn =
      charLen < BEDDING_TARGET_MIN ? `(주의: ${charLen}자, 권장 ${BEDDING_TARGET_MIN}~${BEDDING_TARGET_MAX})` :
      charLen > BEDDING_TARGET_MAX ? `(주의: ${charLen}자 — 권장 ${BEDDING_TARGET_MAX} 초과, 중복 점검)` : "";

    const alts = getBeddingImageAlts({ region, treatmentName });
    const qc = runQC(bodyPlain, { region, treatmentName, store });

    // [fix] 사진 슬롯 → ━박스 placeholder 변환 (응답 직전 1회). 변환 후 본문에 박스 노출.
    let bodyOut = convertBeddingPhotoBoxes(body);
    const _slotCount = (body.match(/\[이미지:\s*[^\]]+\]/g) || []).length;
    const _boxCount  = (bodyOut.match(/━{5,}[\s\S]*?━{5,}/g) || []).length;
    console.log("[QC] 사진 슬롯:", _slotCount, "개 / 박스 변환:", _boxCount, "개");

    // [v19 B] 해시태그 본문 말미 삽입 (방식 B-1 — 네이버 자동 태그 인식, 스키마 변경 0).
    //   bodyOut(=text/textMarkdown/body 공통 소스)에 붙여 복사·저장 시 함께 따라가게 함.
    //   QC/글자수는 위에서 bodyPlain(태그 제외) 기준으로 이미 산출됨 — 태그가 카운트 오염 안 함.
    const hashtags = buildBeddingHashtags({ treatmentName, treatmentId, store, repRegion, region });
    bodyOut = bodyOut.trimEnd() + "\n\n" + hashtags + "\n";
    console.log("[QC] 해시태그:", hashtags);

    // [v-loc] LocationBlock 후단 주입 — 본문 끝(해시태그 위)에 "찾아오시는 길" 삽입.
    //   주소 없으면 원문 그대로(블록 미생성). 위치블록 → 해시태그 순으로 재배치.
    bodyOut = insertLocationBeforeHashtags(bodyOut, locStore);

    // [fix] 클라이언트(index.js) 계약 정렬 — index.js는 data.text / data.textMarkdown 을 읽는다.
    //   기존 응답은 body 필드만 → data.text=undefined → 화면 0자 / 전체복사 빈값 / save content 빈값.
    //   다른 엔진(generateEnt)과 동일하게 text(평문)·textMarkdown·seoScore 제공. body는 호환 위해 유지.
    const seoScore = diagnosePost(bodyPlain, `${region} ${treatmentName}`);

    return res.status(200).json({
      success: true,
      industry: "bedding",
      store,
      region,
      treatmentId,
      treatmentName,
      contentForm,
      title,
      // 클라 계약 필드
      text: bodyOut,         // 화면 글자수·전체복사·save-generated content (사진 박스 포함)
      textMarkdown: bodyOut, // 순수 본문. 제목은 응답 title 필드를 클라가 직접 사용(우회 헤더 제거).
      seoScore,
      charCount: charLen,    // 슬롯/박스 제외 평문 글자수
      // 하위 호환(기존 body 참조 보존)
      body: bodyOut,
      imageAlts: alts,
      qc,
      lenWarn,
    });
  } catch (err) {
    console.error("[generateBedding] error:", err);
    return res.status(500).json({ error: "BEDDING_GENERATE_FAILED", detail: String(err.message || err) });
  }
}
