// ============================================================
// generateDental.js — 치과 블로그 생성기 v3.6.7
//
// 변경사항 (v3.6.7) — semi-migration (commonPhotoBox 최소 위임):
//   ① stripMarkdownForNaver만 공통 모듈(_stripMarkdownForNaver)로 위임
//   ② buildPhotoPlaceholder는 dental 전용 유지 (2단 구조 / UI identity 보존)
//   ③ calcContentCharCount / qcPhotoBoxes 미적용 (관찰 데이터 연속성 보호)
//   ④ DENTAL_PHOTO_POOL 무변경 / ABSORB·whitelist·cleanDental 무변경
//   ⚠️ 박스 형식 변경 ❌ / 시각 regression ❌ / 발행 데이터 연속성 유지
//
// 변경사항 (v3.6.6) — placeholder 2단 구조:
//   ① "추천 사진" (뭘 올릴지) + "사진 설명 예시" (어떻게 적을지) 분리
//   ② DENTAL_PHOTO_POOL: alt 카테고리별 {photos, captions} 객체로 확장
//   ⚠️ 사용자가 "사진 종류"와 "캡션"을 명확히 구분해서 인식하도록
//
// 변경사항 (v3.6.5) — 따옴표 + 키워드 중첩 비문 fix:
//   ① AB-1d 신규: `"임플란트 비용"임플란트도` → `"임플란트 비용"도`
//      GPT가 따옴표 닫은 직후 키워드를 또 붙여 출력하는 패턴 자동 정정
//   ⚠️ 비문만 수정 — 감성/CTA softness는 일절 안 건드림 (인간미 보존)
//
// 변경사항 (v3.6.4) — 네이버 복붙 UX 개선:
//   ① stripMarkdownForNaver: [이미지: ...] → 점선 박스형 placeholder
//      "📷 사진 첨부 위치 / (업로드 후 이 안내문 삭제) / 추천 캡션 예시 3개"
//   ② DENTAL_CAPTION_POOL: alt 카테고리별 후기체 캡션 (5종 × 3개)
//      - "사진 설명" ❌ / "후기 캡션" ⭕
//   ③ 변경 범위 최소화 — 생성 구조·UI·내부 [이미지:] 메타 일절 안 건드림
//   ⚠️ 평문 변환 시에만 placeholder 박스 생성 (textMarkdown 원본은 그대로)
//   ⚠️ index.js calcValidCharCount는 별도 패치 필요 (placeholder 박스 제외)
//
// 변경사항 (v3.6.3) — 사랑니 케이스 미세 보강:
//   ① 감성 ending 4종 추가 (문장 단위 제거):
//      "확신이 들었죠" / "받기를 잘했다는 생각" / "훨씬 편해졌답니다" / "큰 도움을 받을 수 있을 거예요"
//   ② 문장 절단 패턴 제거 — "치료를 받고 나니 정말." 류
//   ③ QC 잔존 카운트 동기화
//   ⚠️ blacklist + 비문 보정만 — 구조/scene/density 동결
//   ⚠️ "지하철역에서 걸어서 몇 분" / "야간진료" 같은 현실 판단 표현 보존
//
// 변경사항 (v3.6.2) — 두 번째 실발행 케이스 미세 보강 (강남 임플란트 2):
//   ① 정리형 감정 마무리 3패턴 추가 — 문장 단위 제거
//      "좋은 선택이었죠" / "모든 게 해결된 기분" / "더 이상 불편함을 느끼지 않아요"
//   ② QC 잔존 카운트 동기화
//   ⚠️ blacklist만 미세 보강 — 구조/scene/density 모두 동결
//   ⚠️ "좋았어요"·"한결 수월" 류 약한 표현은 보존 (인간미 유지)
//
// 변경사항 (v3.6.1) — 실발행 첫 케이스 hotfix (강남 임플란트 1):
//   ① 조사 깨짐 잔존 fix — "임플란트가 때문이죠" → "임플란트 때문이죠"
//      (치료명 + 가 + 때문/덕분/이유/필요 비문 자동 교정)
//   ② 감성 ending blacklist 확장 — "생활의 질이 높아진 기분", "믿음이 갔", "옳았다는 생각"
//   ③ QC 잔존 카운트 패턴 동기화
//   ⚠️ 구조·scene·density 동결 — 실발행 관찰 단계 진입
//
// 변경사항 (v3.6) — light scene engine 이식 (eye v2 패턴 + 옵션 A):
//   ① photoContext req.body 추출 + PHOTO_BLOCK 분기
//   ② SCENE_POOL_DENTAL (5카테고리 × 4 후보) — 시선·설명보조 위주
//   ③ SECTION_SCENE_MAP_DENTAL — search/consult/result 3섹션 hard 주입
//      - decision: 판단 중심 → scene 최소화 (주입 안함)
//      - closing/reason/progress/concern: 설명 톤 유지 → scene 금지
//   ④ systemPrompt(personal)에 scene 허용 + narrative 20~30% + 공포연출 금지 + 감성ending 금지
//   ⑤ finalDentalClean 신규 — Z/AB-1(감성)/AB-1b(공포·기구)/AB-1c(AA합성)/~였어요/AA/AB-2/closing soft
//   ⑥ QC 로그: scene engine mode + 감성ending 잔존 + 공포연출 잔존
//   ⑦ dental 특화 금지: 드릴/마취바늘/날카로운기구/끔찍한통증 자동 차단
//   ⚠️ 단일호출 변환 ❌ — dental 루프 구조 유지 (설명 안정성 + timeline + reason 연결 보존)
//
// 변경사항 (v3.5) — 실전 진단 3개 보정 (수원 임플란트 케이스):
//   ① [T] "통해" 반복 분산 — 시술명/치료/시술/상담/이 치료 5계열 회전
//      → "임플란트를 통해" 반복 → "임플란트 후" / "임플란트받고 나서" 등
//   ② injectKeywordDensity — fullKeyword(region+subKw) 본문 중간/후반 자연 삽입
//      → 결정 섹션 끝 + 변화 섹션 끝 2지점, 3회 미만일 때만 작동
//   ③ DENTAL_DECISION_CRITERIA — 마무리 결론 강화
//      "추천합니다" 감정 → "위치/상담/경험/사후관리" 4가지 객관 판단 기준
//   ④ 시스템 프롬프트 v3.5 가이드 추가 (통해 자제 + fullKeyword 분산)
//   ⑤ runQC: tongheCount + fullKwCount 신설 → 4회 초과/2회 미만 경고
//
// 변경사항 (v3.4) — clinic v3.4 후처리 로직 완전 이식:
//   ① cleanText 통합 (mode 분기 + 헤더 정규화 + 가격 치환 + 동사 변환)
//   ② [V/W/X/X-Min/V2/Y/Y2/B2/B/B3/Z] 모든 보정 단계 이식
//   ③ INFO_BLOCKS / EXAM_VALUES / runQC 정리
//   ④ 회복 타임라인 / 추천 대상 / 광고법 위반 자동 제거
//   ⑤ 이전 버그 수정:
//      - buildDentalHashtags 안에 cleanText 코드 잘못 들어가 있던 문제 해결
//      - runQC certaintyCount/recommendCount/reviewFlowCount 미정의 버그 해결
// ============================================================
import { DENTAL_TREATMENTS }                  from "../../lib/dental-data";
import { buildDentalPrompt, getDentalDirection } from "../../lib/dental-prompts";
import { DENTAL_FLOW_ENGINE }                 from "../../lib/dental-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";
// 🛡️ 과별 침투 차단 (v1.0) — 16개 업종 정체성 토큰 자동 차단
import { getCrossBlocks } from "../../lib/industryBlocks";
// [v-loc] 위치/주차 공통 후단 블록 — 전 업종 공유. 응답 직전 해시태그 위 삽입.
import { insertLocationBeforeHashtags } from "../../lib/locationBlock";
// 🛡️ 안전 제거 + 공백/조사 normalize (v1.0) — 강제 삽입 사고 방지
import { safeRemoveWords, fixThisTreatmentParticles, fixParticles, normalizeWhitespace } from "../../lib/safeRemove";

// ★ v3.6.7 — light scene 공통 모듈 (semi-migration: strip만 위임)
//   DENTAL_PHOTO_POOL / buildPhotoPlaceholder는 dental 전용 유지 (2단 구조 UI identity)
//   stripMarkdownForNaver 동작만 공통화 — 헤더 변환 로직 통일
import {
  stripMarkdownForNaver as _stripMarkdownForNaver,
} from "../../lib/commonPhotoBox";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN)
// ============================================================
const DENTAL_FORBIDDEN_BASE = [
  // 광고성
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "인생 시술", "후회 제로", "강력 추천", "베스트",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 시술", "이 방법",
  // ⚠️ "이 치료가/를/은"은 빈 문자열로 제거하면 조사 깨짐 발생 (예: "이 치료를 통해" → " 통해")
  //    → 헤더 정규화(아래)에서 치료명으로 치환 처리하므로 여기 목록에서 제외
  "기준으로 살펴본", "관리 방법과 생활 속", "예방 전략",
  "체계적인 접근", "알아두면 좋은",
  // 성형외과·피부과 침투 차단
  "쌍꺼풀", "눈매교정", "눈밑지방", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "붓기 회복 일지", "멍 빠지는", "티 안 나게",
  // 한의원 침투 차단
  "추나", "한약", "뜸", "부항",
];

const DENTAL_FORBIDDEN_AI = [
  "드디어 결심하고", "결국 선택하게 되었어요", "마침내", "비로소",
  "마음이 편안해졌어요", "믿음이 갔어요", "친절하고 전문적이셔서",
  "따뜻한 분위기", "차분하고 따뜻한", "안정감 있는 분위기",
  "미소를 되찾았어요", "자신감을 찾았어요", "새로운 삶",
];

const DENTAL_FORBIDDEN_COMMERCIAL = [
  // ── 1인칭 시점 ──
  "저는 ", "제가 ", "내가 ", "나는 ", "저도 ",
  "받아봤어요", "받았어요", "받고 나서", "받았더니",
  "느꼈어요", "느꼈다", "느껴졌다",
  "결심했어요", "결정했어요", "고민했어요", "고민하다",
  "맞아봤어요", "맞았어요",
  // ── 효과 단정 ──
  "좋아졌어요", "좋아졌다", "또렷해졌어요", "또렷해졌다",
  "만족합니다", "만족했어요", "만족했다", "마음에 들었어요",
  "잘 됐어요", "잘됐다", "결과가 좋", "결과가 마음에",
  "확실히 좋", "확실히 효과", "확실히 잘", "분명히 좋",
  "완치", "100%", "반드시 효과", "효과 보장",
  // ── 추천·유도 ──
  "추천합니다", "추천해요", "추천드립니다", "추천드려요",
  "꼭 받으세요", "꼭 한 번", "꼭 받아보세요",
  "상담 받아보세요", "상담받아보세요", "상담 받아 보세요",
  "받아보시길", "받아보시는 걸",
  "도움이 됩니다", "도움 됩니다", "도움이 될 거",
  // ── 환자 유인 ──
  "실비 적용", "실비로 거의", "실손 보험", "본인부담 없음",
  "할인 이벤트", "프로모션", "특가",
  // ── 병원·의료진 직접 평가 ──
  "이 병원 추천", "여기서 받으세요", "이곳 추천",
  "원장님이 친절", "친절하셨어요", "친절하셨고",
  "설명이 좋", "설명도 좋", "잘 설명해 주",
];

// ============================================================
// 0-2. 🛡️ 과별 침투 차단 (lib/industryBlocks.js)
//   - 16개 업종 정체성 키워드 자동 차단
//   - dental 자기 키워드 + EXEMPTIONS는 자동 면제
//   ⚠️ 새 업종 추가 시 lib/industryBlocks.js 만 수정
// ============================================================
const DENTAL_CROSS_BLOCK = getCrossBlocks("dental");

// ============================================================
// 1. INFO_BLOCKS — 결정 섹션 아래 자동 삽입
// ============================================================
const INFO_BLOCKS = {
  implant: {
    title: "임플란트 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 기간", "보통 3~6개월 (뼈 이식 시 추가)"],
      ["식립 시간", "1개당 30~60분"],
      ["회복 기간", "골유착 2~4개월"],
      ["재료", "타이타늄 픽스처 + 세라믹/지르코니아 보철"],
      ["주의 사항", "뼈 양·잇몸 상태 따라 적용 차이"],
    ],
  },
  braces: {
    title: "교정 방법별 일반 비교",
    rows: [
      ["항목", "투명교정", "일반교정", "설측교정"],
      ["외관", "거의 안 보임", "보임", "안 보임"],
      ["기간", "1~2년", "1.5~3년", "1.5~3년"],
      ["관리", "탈착 가능", "고정", "고정 안쪽"],
      ["적합 케이스", "경증·중등도", "전 케이스", "외관 부담 큰 분"],
    ],
  },
  rootcanal: {
    title: "신경치료 일반 정보",
    rows: [
      ["항목", "내용"],
      ["치료 횟수", "보통 2~4회"],
      ["1회 시간", "30~60분"],
      ["보철 필요", "치료 후 크라운 권장"],
      ["성공률", "치아 보존이 일반적이나 개인차 있음"],
    ],
  },
  scaling: {
    title: "스케일링 일반 정보",
    rows: [
      ["항목", "내용"],
      ["권장 주기", "6개월~1년"],
      ["소요 시간", "30~60분"],
      ["보험 적용", "연 1회 건강보험 적용"],
      ["효과", "치석 제거, 잇몸 출혈 완화"],
    ],
  },
  default: {
    title: "치과 진료 검토 시 일반 안내",
    rows: [
      ["확인 항목", "내용"],
      ["전문의 자격", "치과 전문의 여부 확인"],
      ["상담 충실도", "충분한 상담 시간 제공 여부"],
      ["사후 관리", "치료 후 정기 점검 여부"],
      ["회복 기간", "치료별 일반 회복 기간 안내 받기"],
      ["주의 사항", "개인 구강 상태 따라 차이 있음"],
    ],
  },
};

function getInfoBlock(treatmentId) {
  return INFO_BLOCKS[treatmentId] || INFO_BLOCKS.default;
}

function renderInfoBlock(block) {
  const lines = [`\n\n**${block.title}**\n`];
  block.rows.forEach((row, i) => {
    lines.push(`| ${row.join(" | ")} |`);
    if (i === 0) lines.push(`|${row.map(() => "---").join("|")}|`);
  });
  return lines.join("\n") + "\n";
}

// ============================================================
// 2. EXAM_VALUES (personal 전용)
// ============================================================
const EXAM_VALUES = {
  implant: {
    duration: "치료 기간 보통 3~6개월",
    recovery: "골유착 2~4개월, 보철 후 일상 회복",
    pain:     "마취 후 통증 거의 없음, 통증점수 1~2점",
  },
  rootcanal: {
    duration: "1회 30~60분, 총 2~4회 방문",
    recovery: "치료 후 1~2일 시린 느낌",
    pain:     "통증점수 2~3점",
  },
  scaling: {
    duration: "30~60분 1회",
    recovery: "당일 일상 회복, 1~2일 잇몸 시린 느낌",
    pain:     "통증점수 1~2점",
  },
  wisdom: {
    duration: "발치 30~60분",
    recovery: "붓기 3~5일, 1주일 후 일상 회복",
    pain:     "통증점수 3~5점, 진통제로 조절",
  },
  default: {
    duration: "치료별 상이",
    recovery: "회복 기간은 치료·개인차 따라 다름",
    pain:     "통증은 시술 방식에 따라 차이 있음",
  },
};

function getExamValues(treatmentId) {
  return EXAM_VALUES[treatmentId] || EXAM_VALUES.default;
}

// ============================================================
// 3. 제목 생성 (mode 분기)
// ============================================================
function buildDentalTitle(treatmentName, region, seoData, blogTypeId, mode, fixedIdx = -1) {
  if (mode === "commercial") {
    const t = treatmentName, rg = region;
    const judge = [
      `${rg} ${t}, 바로 해야 할까? 고려하는 경우와 상담 전 확인할 5가지`,
      `${rg} ${t} 상담 전 꼭 확인해야 할 5가지`,
      `${t}, 이런 경우 고려합니다 — ${rg} 치과 전문 정보`,
      `${rg} ${t} 결정 전 알아두면 좋은 기준`,
      `${t} 상담 시 확인하는 항목 정리｜${rg}`,
    ];
    return judge[Math.floor(Math.random() * judge.length)];
  }

  if (seoData?.titlePatterns?.length) {
    // [A-4] fixedIdx 지정 시 해당 family 제목 고정 (본문과 동기화), 아니면 기존 random
    const idx = (fixedIdx >= 0 && fixedIdx < seoData.titlePatterns.length)
      ? fixedIdx
      : Math.floor(Math.random() * seoData.titlePatterns.length);
    const raw = seoData.titlePatterns[idx];
    return raw.replace(/\{region\}/g, region);
  }
  if (blogTypeId === "compare") {
    const cw = seoData?.compareWith || "다른 치료";
    return [
      `${region} ${treatmentName} vs ${cw} 비교｜직접 상담 후 선택한 이유`,
      `${region} ${treatmentName}｜${cw} 고민하다 결정한 이유`,
    ][Math.floor(Math.random() * 2)];
  }
  if (blogTypeId === "consult") {
    return `${region} ${treatmentName} 상담 후기｜처음 가기 전에 알았으면 좋았을 것들`;
  }
  const defaults = [
    `${region} ${treatmentName} 후기｜상담부터 치료까지 솔직하게 정리했습니다`,
    `${treatmentName} 고민 3개월｜${region} 치과에서 받고 나서 드는 생각`,
    `${region} ${treatmentName}｜두려워서 미루다가 결국 결정한 이야기`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기)
// ============================================================
function buildDentalHashtags(treatmentName, region, mode) {
  const kw = (treatmentName || "").replace(/\s/g, "");
  const rg = (region || "").replace(/\s/g, "");
  // 각 태그 내부 공백 제거 가드: "#분당 정자역임플란트" → "#분당정자역임플란트"
  // (rg/kw가 미리 정리돼도, 결합 입력 경로에서 남는 공백을 출력 직전 차단)
  const finalize = (arr, n) =>
    arr.slice(0, n)
       .map(t => t.replace(/\s+/g, ""))
       .join(" ");
  if (mode === "commercial") {
    return finalize([
      `#${rg}${kw}`, `#${kw}정보`, `#${kw}안내`,
      `#${kw}`, `#${rg}치과`, `#치과정보`,
      `#${rg}진료안내`, `#치과진료`,
    ], 8);
  }
  return finalize([
    `#${rg}${kw}`, `#${kw}후기`, `#${kw}상담`,
    `#${kw}`, `#${rg}치과`, `#치과후기`,
    `#${rg}후기`, `#치아건강`, `#${rg}치과추천`,
  ], 10);
}

// ============================================================
// 5. 본문 정제 (mode 분기) — clinic v3.4 후처리 로직 완전 이식
// ============================================================
function cleanDentalText(text, treatmentName, region, mode = "personal") {
  let result = text;

  // [v103] 받침 판별 헬퍼 — 치료명 끝글자 받침에 따라 조사 자동 선택.
  //   '라미네이트과'(❌)→'라미네이트와'(⭕), '라미네이트을'→'라미네이트를' 등.
  const _lastCharHasJong = (w) => {
    const s = String(w || "").trim();
    if (!s) return false;
    const c = s.charCodeAt(s.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return false; // 한글 음절 아니면 받침 판정 보류
    return (c - 0xAC00) % 28 !== 0;
  };
  const _tnHasJong = _lastCharHasJong(treatmentName);
  const _josaGwa = _tnHasJong ? "과" : "와";   // 와/과
  const _josaI   = _tnHasJong ? "이" : "가";   // 이/가
  const _josaEul = _tnHasJong ? "을" : "를";   // 을/를
  const _josaEun = _tnHasJong ? "은" : "는";   // 은/는

  // 공통: 기본 + AI 냄새 금지어
  const removeList = [...DENTAL_FORBIDDEN_BASE, ...DENTAL_FORBIDDEN_AI, ...DENTAL_CROSS_BLOCK];
  if (mode === "commercial") removeList.push(...DENTAL_FORBIDDEN_COMMERCIAL);

  // 🛡️ v1.0 — 단순 forEach replace 대신 safeRemoveWords 사용
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전에는 forEach로 빈 문자열 치환 → "시술하는" → " 하는" 사고 발생
  result = safeRemoveWords(result, removeList);

  // 조사 오류 교정 (치료명 + 잘못된 조사)
  result = result
    .replace(/임플란트는(?=\s)/g, "임플란트는")
    .replace(/스케일링를/g, "스케일링을")
    .replace(/교정를/g, "교정을")
    .replace(/신경치료를(?=\s)/g, "신경치료를")
    .replace(/사랑니를(?=\s)/g, "사랑니를");

  // ─────────────────────────────────────────────────────
  // [헤더 정규화] 헤더 안 '그 방법'/'이 방법' → 치료명
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    if (/^#{1,6}\s/.test(line)) {
      return line
        .replace(/그\s*방법을/g, `${treatmentName}${_josaEul}`)
        .replace(/그\s*방법이/g, `${treatmentName}${_josaI}`)
        .replace(/그\s*방법은/g, `${treatmentName}${_josaEun}`)
        .replace(/그\s*방법에/g, `${treatmentName}에`)
        .replace(/그\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*방법을/g, `${treatmentName}${_josaEul}`)
        .replace(/이\s*방법이/g, `${treatmentName}${_josaI}`)
        .replace(/이\s*방법은/g, `${treatmentName}${_josaEun}`)
        .replace(/이\s*방법에/g, `${treatmentName}에`)
        .replace(/이\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*치료를/g, `${treatmentName}${_josaEul}`)
        .replace(/이\s*치료가/g, `${treatmentName}${_josaI}`)
        .replace(/이\s*치료는/g, `${treatmentName}${_josaEun}`)
        .replace(/이\s*치료의/g, `${treatmentName}의`)
        .replace(/이\s*치료에/g, `${treatmentName}에`)
        .replace(/이\s*치료과/g, `${treatmentName}${_josaGwa}`)
        .replace(/이\s*치료\s+/g, `${treatmentName} `);
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [본문 정규화 v2.0] safeRemove 모듈로 위임 (강제 삽입 사고 방지)
  //   - "이 치료은 → 이 치료는" / "이 치료의 필요 → 이 치료가 필요" 보정
  //   - 톤 약화 (추천드리고 싶어요 → 고려해볼 수 있어요)
  //   - {치료명} 받침 자동 보정
  //   ⚠️ v1.0의 "통해 강제 삽입" 패턴 제거 — 따옴표 직후 등에서 사고 발생
  //      예: "검색해보니" 통해 → 잘못 매칭되어 "이 치료를 통해" 삽입
  // ─────────────────────────────────────────────────────
  result = fixThisTreatmentParticles(result);
  result = fixParticles(result, treatmentName);

  // [v103] {치료명}+이/가 + 과정/단계/시점 보정 (치료명 의존 — 모듈에선 처리 못함)
  //   받침없는 치료명은 '가'로 출력되므로 이/가 둘 다 잡는다. '시점' 추가.
  {
    const tnEscEarly = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      .replace(new RegExp(`${tnEscEarly}(?:이|가)\\s+(과정|단계|시간|시점|결과|이후|이전)`, "g"), `${treatmentName}의 $1`);
  }


  // ─────────────────────────────────────────────────────
  // commercial 모드: 강제 정보형 변환
  // ─────────────────────────────────────────────────────
  if (mode === "commercial") {
    // [1] 가격 패턴 자동 치환
    result = result.replace(/회당\s*\d+\s*만원[^\s.,!?]*/g, "회당 비용은 병원 안내 참고");
    result = result.replace(/약\s*\d+\s*만원[^\s.,!?]*/g, "비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*정도/g, "비용은 병원 안내 참고");
    result = result.replace(/한 달에\s*약\s*\d+\s*만원/g, "월 비용은 병원 안내 참고");
    result = result.replace(/총\s*\d+\s*만원/g, "총 비용은 병원 안내 참고");
    result = result.replace(/한 개당\s*약\s*\d+\s*만원/g, "비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*대?/g, "비용은 병원 안내 참고");

    // [2] 1인칭 잔존 정리
    result = result.replace(/(?:^|[\s,.])저는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])제가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])내가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])나는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])저도\s+/g, " ");

    // [3] 후기형 동사 → 정보형 동사 자동 변환
    const verbConversion = [
      [/좋아졌습니다/g, "일반적인 경과를 보입니다"],
      [/좋아졌어요/g,   "일반적인 경과를 보입니다"],
      [/좋아졌다/g,     "일반적인 경과를 보입니다"],
      [/또렷해졌어요/g, "일반적인 변화가 안내됩니다"],
      [/또렷해졌습니다/g, "일반적인 변화가 안내됩니다"],
      [/또렷해졌다/g,   "일반적인 변화가 안내됩니다"],
      [/만족합니다/g,   "일반적인 경과로 안내됩니다"],
      [/만족했어요/g,   "일반적인 경과로 안내됩니다"],
      [/만족했다/g,     "일반적인 경과로 안내됩니다"],
      [/마음에 들었어요/g, "일반적인 경과로 안내됩니다"],
      [/잘 됐어요/g,    "일반적인 경과로 안내됩니다"],
      [/잘됐어요/g,     "일반적인 경과로 안내됩니다"],
      [/잘됐다/g,       "일반적인 경과로 안내됩니다"],
      [/결과가 좋아요/g, "일반적인 경과를 보입니다"],
      [/결과가 좋았어요/g, "일반적인 경과를 보입니다"],
      [/확실히\s+/g,    "일반적으로 "],
      [/분명히\s+/g,    "일반적으로 "],
      [/100%\s*/g,      "일반적으로 "],
      [/완치(되었|됐|돼)/g, "회복되었"],
      [/반드시\s+/g,    "일반적으로 "],
      [/추천합니다/g,        "고려해볼 수 있습니다"],
      [/추천해요/g,          "고려해볼 수 있습니다"],
      [/추천드립니다/g,      "고려해볼 수 있습니다"],
      [/추천드려요/g,        "고려해볼 수 있습니다"],
      [/꼭 받으세요/g,       "고려해볼 수 있습니다"],
      [/꼭 받아보세요/g,     "고려해볼 수 있습니다"],
      [/상담\s*받아보세요/g, "상담을 통해 결정하는 것이 권장됩니다"],
      [/받아보시는 걸/g,     "고려해보시는 것을"],
      [/받아보시길/g,        "고려해보시길"],
      [/도움이 됩니다/g,     "참고가 될 수 있습니다"],
      [/도움 됩니다/g,       "참고가 될 수 있습니다"],
      [/도움이 될\s*거/g,   "참고가 될 수 있을 거"],
      [/원장님이 친절하/g,   "상담 시 일반적으로 안내가 진행되"],
      [/친절하셨어요/g,      "안내가 진행되었습니다"],
      [/친절하셨고/g,        "안내가 진행되었고"],
      [/설명이 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/설명도 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/잘 설명해 주셨어요/g, "상세히 안내가 진행되었습니다"],
      [/받아봤어요/g,        "진료가 진행됩니다"],
      [/받았어요/g,          "진료가 진행됩니다"],
      [/받았더니/g,          "진료 후"],
      [/맞아봤어요/g,        "치료가 진행됩니다"],
      [/맞았어요/g,          "치료가 진행됩니다"],
      [/느꼈어요/g,          "안내됩니다"],
      [/느꼈다/g,            "안내됩니다"],
      [/느껴졌다/g,          "안내됩니다"],
      [/결심했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/결정했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/고민했어요/g,        "고민하는 경우가 많습니다"],
      [/고민하다가/g,        "고민하는 경우"],
      // ── v2 보강: 결과 단정 / 우월성·추천 유도 ──
      [/한꺼번에\s*해결(되었|됐|돼)?/g, "개선을 고려할 수 있습니다"],
      [/문제가\s*(말끔히|깔끔히|한번에)?\s*해결(되었|됐|돼)\S*/g, "상태에 따라 경과가 다를 수 있습니다"],
      [/(많은\s*분들이|후기\s*수가\s*많아서?|많은\s*사람들이)\s*\S{0,4}(추천|선택)\S*/g, "개인 상태에 따라 결정하는 것이 권장됩니다"],
    ];
    verbConversion.forEach(([from, to]) => {
      result = result.replace(from, to);
    });

    // [4] 후기형 어미 → 안내형 어미
    result = result.replace(/받았다\b/g, "진행된다");
    result = result.replace(/받았습니다\b/g, "진행됩니다");
  }

  // ─────────────────────────────────────────────────────
  // [공통 보정] — personal·commercial 모두 적용
  // ─────────────────────────────────────────────────────
  const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // ─────────────────────────────────────────────────────
  // [V v2.0] 치료명 빈자리 복구 — 🚫 비활성화 (사고 원인)
  //   원래 의도: FORBIDDEN 제거 후 "에서   받" 같은 빈자리에 "이 치료를" 강제 삽입
  //   문제: safeRemoveWords가 normalize 처리하므로 이중 공백 자체가 안 생김
  //         + 다른 합법 문맥("따옴표"+공백+동사) 까지 잘못 매칭되어 사고 발생
  //   ⚠️ 다시 활성화하지 말 것 — 같은 사고 재발
  /*
  result = result.replace(/에서\s{2,}받/g, "에서 이 치료를 받");
  result = result.replace(/에서\s{2,}선택/g, "에서 이 치료를 선택");
  result = result.replace(/에서\s{2,}결정/g, "에서 이 치료를 결정");
  result = result.replace(/에서\s{2,}고려/g, "에서 이 치료를 고려");
  result = result.replace(/에서\s{2,}알아보/g, "에서 이 치료를 알아보");
  result = result.replace(/에서\s{2,}찾/g, "에서 이 치료를 찾");
  result = result.replace(/([.!?])\s{2,}(받기로|받고|받는|받았)/g, "$1 이 치료를 $2");
  result = result.replace(/(^|[\s.!?,])(을|를)\s+(만들어|찾던|알아보던|고려하던)/g, "$1 이 치료를 $3");
  */
  // 줄 시작 깨진 조사 제거 — 이건 안전한 정리이므로 유지
  result = result.replace(/^\s*(을|를|가|은|는|에서|으로|로)\s+/gm, "");
  result = result.replace(/^\s*이\s+(?!치료|병원|방법|진료|곳|집|쪽|분야|업종)/gm, "");

  // ─────────────────────────────────────────────────────
  // 🚫 [W] [W2] [X] [X-Min] [V2] 5중 후처리 체인 비활성화 (v2.0)
  //   원래 의도:
  //     [W]/[W2] — "{치료명}이 치료" 비문 처리
  //     [X]      — 치료명 6회+ → "이 치료"로 분산
  //     [X-Min]  — 치료명 5회- → "이 치료" 일부 역치환
  //     [V2]     — 위 결과의 잔해 비문 정리
  //   문제 (실증):
  //     5개가 순차 실행되면 상호 충돌 → "임플란트가 치료" / "임플란트가 치과"
  //     같은 비문이 5회+ 누적 발생 (강남 임플란트 글에서 확인)
  //   v2.0 결정:
  //     - safeRemove + fixParticles + fixThisTreatmentParticles 조합으로 충분
  //     - 키워드 횟수 강제 제어 X (GPT 자연 출력 신뢰)
  //   ⚠️ 다시 활성화하지 말 것 — 같은 사고 재발
  /*
  // [W] 조사 깨짐 보정
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료로`, "g"), `${treatmentName} 치료로`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료에`, "g"), `${treatmentName} 치료에`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료은`, "g"), `${treatmentName} 치료은`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료을`, "g"), `${treatmentName} 치료을`);

  // [W2] 치료명 + "이 치료 치료" / "이 치료 [동사]" 비문 처리
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+치료`, "g"), `${treatmentName} 치료`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료([을를이가은는의과와도만]|으로|로)\\s`, "g"), `${treatmentName}$1 `);
  result = result.replace(new RegExp(`${tnEsc}이\\s+치료\\s+(?=[가-힣])`, "g"), `${treatmentName}이 `);

  // [X] 키워드 + 치환 총량 제어 — 대체어 임계 3회
  {
    const kwRegex = new RegExp(tnEsc, "g");
    const MAX_REPLACEMENTS = 3;
    let count = 0;
    let replaced = 0;
    result = result.replace(kwRegex, (m) => {
      count++;
      if (count <= 6) return m;
      if (replaced >= MAX_REPLACEMENTS) return m;
      replaced++;
      return "이 치료";
    });
  }

  // [X-Min] 치료명 노출 최소 보장 — 5회 미만이면 "이 치료" 일부 → 치료명 역치환
  {
    const tnCount = (result.match(new RegExp(tnEsc, "g")) || []).length;
    if (tnCount < 5) {
      const need = 5 - tnCount;
      let restored = 0;
      const candEsc = "이\\s*치료";
      const re = new RegExp(`([.!?]\\s+|^|\\n)${candEsc}(\\s+[가-힣])`, "g");
      result = result.replace(re, (m, p1, p2) => {
        if (restored >= need) return m;
        restored++;
        return `${p1}${treatmentName}${p2}`;
      });
    }
  }

  // [V2] 치환 후 보정 — 위 [X]/[X-Min] 잔해 정리용 (현재 불필요)
  result = result
    .replace(/이\s*치료가\s+말에/g, "그 말에")
    .replace(/이\s*치료가\s+이야기에/g, "그 이야기에")
    .replace(/이\s*치료\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    .replace(/이\s*치료가\s+치료([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 치료$1")
    .replace(/이\s*치료가?\s+후기/g, "그 후기")
    .replace(/이\s*치료\s+치료(?![가-힣])/g, "이 치료")
    .replace(/이\s*치료가\s+치료(?![가-힣])/g, "이 치료")
    .replace(/이\s*치료가\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|시간|기간|상황|경험|선택|순간|중요|필요|기대|걱정|불안|이야기|설명|안내|결정|판단|이해|기억|느낌|생각|부분|두\s*가지|세\s*가지|덕분|때문)/g, "이 치료의 $1")
    .replace(/이\s*치료가\s+(만족|적절|중요|필요|좋[으았은])/g, "이 치료는 $1")
    .replace(new RegExp(`${tnEsc}이\\s+(부분|두\\s*가지|세\\s*가지|덕분|때문)`, "g"), `${treatmentName} $1`)
    .replace(new RegExp(`${tnEsc}이\\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|상황|경험|선택|순간|이야기|설명|안내|결정|느낌|생각)`, "g"), `${treatmentName}의 $1`)
    .replace(/(이\s*치료[을를이가은는의로]?\s+){2,}/g, "이 치료 ");
  */

  // 최소 안전 보정만 유지 (V2의 ① ③ 만 잔존)
  result = result
    .replace(/이\s*치료가\s+말에/g, "그 말에")
    .replace(/이\s*치료가?\s+후기/g, "그 후기");

  // [Y] AI 부사 반복 정리
  ["정말", "특히 ", "무엇보다"].forEach(adv => {
    const re = new RegExp(adv, "g");
    let cnt = 0;
    result = result.replace(re, (m) => {
      cnt++;
      return cnt <= 2 ? m : "";
    });
  });

  // ─────────────────────────────────────────────────────
  // [Y2] 문장 끝 어미 다양화 — 3회 연속 시 3번째만 변형
  // ─────────────────────────────────────────────────────
  {
    const endings = [
      { match: /했어요\.\s/g, alt: "했답니다. " },
      { match: /했죠\.\s/g, alt: "했답니다. " },
      { match: /됐어요\.\s/g, alt: "됐답니다. " },
      { match: /있었어요\.\s/g, alt: "있었답니다. " },
    ];
    endings.forEach(({ match, alt }) => {
      let cnt = 0;
      result = result.replace(match, (m) => {
        cnt++;
        return cnt === 3 ? alt : m;
      });
    });
  }

  // ─────────────────────────────────────────────────────
  // [B2] 애매 문장 + 비문 직접 차단
  // ─────────────────────────────────────────────────────
  result = result
    .replace(/기대할\s*수\s*있는\s+(고민해|추천|좋을|괜찮)[^.!?\n]*[.!?]/g, "기대할 수 있어요.")
    .replace(/원할\s*때\s+(고민해|추천)[^.!?\n]*[.!?]/g, "원할 수 있어요.")
    .replace(/선택이\s*될\s*수\s*있는\s+(고민|추천|좋)[^.!?\n]*[.!?]/g, "선택이 될 수 있어요.")
    .replace(/이\s*치료과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 치료와 비교해봤어요.")
    .replace(/이\s*방법과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 방법과 비교해봤어요.")
    // 줄 시작에 "에서도"는 항상 비문 → 줄 자체 제거
    .replace(/^\s*에서도\s+[^.!?\n]*[.!?]?\s*$/gm, "")
    // 어색한 지시어 + 한자어 병치
    .replace(/([가-힣]+)\s+그\s+후기를/g, "$1 후기를")
    .replace(/([가-힣]+)\s+그\s+후기/g, "$1 후기")
    // 자기 비교 → 다른 치료 비교로 전환
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교해도`, "g"), "다른 치료와 비교해도")
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교했을\\s*때`, "g"), "다른 치료와 비교했을 때")
    // 약한 CTA → 정보형 마무리로 재작성
    .replace(/시도해볼\s*만한\s*방법이라\s*생각합니다\.?/g, "")
    .replace(/시도해볼\s*만한\s*방법이에요\.?/g, "")
    .replace(/시도해볼\s*만해요\.?/g, "")
    .replace(/시도해보시는\s*것도[^.!?\n]*[.!?]?/g, "")
    .replace(/손색이\s*없다는\s*생각이?\s*들었어요\.?/g, "비슷한 만족감을 느꼈어요.")
    .replace(/손색이\s*없다는\s*생각이?\s*들었습니다\.?/g, "비슷한 만족감을 느꼈습니다.")
    .replace(/손색이\s*없어요\.?/g, "충분했어요.")
    .replace(/손색이\s*없습니다\.?/g, "충분했습니다.")
    .replace(/[가-힣]+도?\s*부럽지\s*않네요\.?/g, "만족스러워요.")
    .replace(/[가-힣]+도?\s*부럽지\s*않습니다\.?/g, "만족스럽습니다.");

  // ─────────────────────────────────────────────────────
  // [Z] CTA 완전 제거
  // ─────────────────────────────────────────────────────
  const ctaPatterns = [
    /한\s*번\s+고민해\s*보세요\.?/g,
    /한\s*번\s+생각해\s*보세요\.?/g,
    /한\s*번\s+상담\s*받아보세요\.?/g,
    /한\s*번\s+방문해\s*보세요\.?/g,
    /한\s*번쯤\s+고민해\s*보세요\.?/g,
    /상담\s*한\s*번\s+받아보는\s*것도[^.!?\n]*[.!?]?/g,
    /고민\s*한\s*번\s+해보는\s*것도[^.!?\n]*[.!?]?/g,
    /방문해\s*보는\s*것도[^.!?\n]*[.!?]?/g,
    /비슷한\s*고민이라면[^.!?\n]*[.!?]?/g,
    /참고\s*하시면\s*좋[을습]\s*[것니]?[다까요]?\.?/g,
    /참고가\s*되었으면\s*합니다\.?/g,
    /참고가\s*될\s*수\s*있을\s*거[예에]요\.?/g,
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같습니다\.?/g,
    /고민해\s*보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /생각해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /좋[으을]\s*선택이\s*될\s*[수것]\s*있[어습]+\.?/g,
    /좋[으을]\s*[것거]\s*같[아습]+요\.?/g,
    /괜찮겠다는\s*생각이?\s*들[더었]?라?고요?\.?/g,
    /내게\s*꼭\s*맞는\s*선택이라\s*느꼈[어습]+\.?/g,
  ];
  ctaPatterns.forEach(re => { result = result.replace(re, ""); });

  if (mode === "personal") {
    result = result.replace(/추천하고\s*싶습니다\.?/g, "");
    result = result.replace(/추천하고\s*싶다\.?/g, "");
    result = result.replace(/추천하고\s*싶어요\.?/g, "");
    result = result.replace(/추천드립니다\.?/g, "");
    result = result.replace(/추천해요\.?/g, "");
    result = result.replace(/추천합니다\.?/g, "");
    result = result.replace(/고민해보세요\.?/g, "");
    result = result.replace(/고민해\s*보세요\.?/g, "");
    result = result.replace(/고민해보셔도\.?/g, "");
    result = result.replace(/고민해\s*보셔도\.?/g, "");
    result = result.replace(/고려해보세요\.?/g, "");
    result = result.replace(/고려해\s*보세요\.?/g, "");
    result = result.replace(/고려해보시면\s*좋[을습][것니다까요]+\.?/g, "");
    result = result.replace(/도움이 되길 바랍니다\.?/g, "");
    result = result.replace(/도움이 됩니다\.?/g, "");
    result = result.replace(/정말 만족스럽습니다/g, "체감 변화가 있었습니다");
    result = result.replace(/정말 만족했습니다/g, "체감 변화가 있었습니다");
    result = result.replace(/결과가\s*만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/결과가\s*만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/결과가\s*만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스럽습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/확실히\s+/g, "");
  }

  // ─────────────────────────────────────────────────────
  // [T 신설 v3.5] "통해" 반복 분산 — AI 패턴 + SEO 점수 깎임
  //   원인: GPT가 "임플란트를 통해", "치료를 통해", "상담을 통해" 반복
  //   처리: 3회째부터 다른 표현으로 회전 분산 (의미 보존)
  //         "치료를 통해" → "치료 후" / "치료받고" / "시술 이후"
  // ─────────────────────────────────────────────────────
  {
    const tnEsc2 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ① 시술명+조사+통해 패턴
    const tongheVariants1 = ["을 받고 나서", "을 진행한 뒤", "을 마친 후"];
    let cnt1 = 0;
    result = result.replace(new RegExp(`${tnEsc2}을\\s+통해`, "g"), (m) => {
      cnt1++;
      if (cnt1 <= 1) return m;
      return `${treatmentName}${tongheVariants1[(cnt1 - 2) % tongheVariants1.length]}`;
    });
    let cnt1b = 0;
    result = result.replace(new RegExp(`${tnEsc2}를\\s+통해`, "g"), (m) => {
      cnt1b++;
      if (cnt1b <= 1) return m;
      return `${treatmentName}${tongheVariants1[(cnt1b - 2) % tongheVariants1.length]}`;
    });

    // ② "치료를 통해" / "치료 통해" 일반 패턴
    const tongheVariants2 = ["치료 이후", "치료받고 나니", "치료 후"];
    let cnt2 = 0;
    result = result.replace(/치료를?\s+통해/g, (m) => {
      cnt2++;
      if (cnt2 <= 1) return m;
      return tongheVariants2[(cnt2 - 2) % tongheVariants2.length];
    });

    // ③ "시술을 통해" / "시술 통해"
    const tongheVariants3 = ["시술 이후", "시술받고 나니", "시술 후"];
    let cnt3 = 0;
    result = result.replace(/시술을?\s+통해/g, (m) => {
      cnt3++;
      if (cnt3 <= 1) return m;
      return tongheVariants3[(cnt3 - 2) % tongheVariants3.length];
    });

    // ④ "상담을 통해" — 1회는 자연스러우므로 보존, 2회+만 회전
    const tongheVariants4 = ["상담받고 나서", "상담 자리에서", "상담 자리에서 직접"];
    let cnt4 = 0;
    result = result.replace(/상담을?\s+통해/g, (m) => {
      cnt4++;
      if (cnt4 <= 1) return m;
      return tongheVariants4[(cnt4 - 2) % tongheVariants4.length];
    });

    // ⑤ "이 치료를 통해" / "이 치료 통해"
    const tongheVariants5 = ["이 치료 후", "이 치료받고 나니", "이 치료 이후"];
    let cnt5 = 0;
    result = result.replace(/이\s*치료를?\s+통해/g, (m) => {
      cnt5++;
      if (cnt5 <= 1) return m;
      return tongheVariants5[(cnt5 - 2) % tongheVariants5.length];
    });
  }

  // ─────────────────────────────────────────────────────
  // [B3] 잔해 청소 필터
  // ─────────────────────────────────────────────────────
  result = result
    .replace(/되고\s+요\.?/g, "되었어요.")
    .replace(/되었고\s+요\.?/g, "되었어요.")
    .replace(/없어지고\s+요\.?/g, "없어졌어요.")
    .replace(/들고\s+요\.?/g, "들었어요.")
    .replace(/하고\s+요\.?/g, "했어요.")
    .replace(/정말\s+니다\.?/g, "정말 좋아졌습니다.")
    .replace(/정말\s+습니다\.?/g, "정말 좋았습니다.")
    .replace(/정말\s+어요\.?/g, "정말 좋았어요.")
    .replace(/^(\s*-?\s*\d+일차):\s*$/gm, "$1: 자연스러워짐")
    .replace(/^(\s*-?\s*\d+~\d+일차):\s*$/gm, "$1: 자연스러워짐")
    .replace(/^\s*(정말|특히|무엇보다)\s*$/gm, "");

  // ─────────────────────────────────────────────────────
  // [B] 문장 종결 검증 — 잘린 문장 재작성
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (/^(#{1,6}\s|[|*\-]\s|\[이미지|#[가-힣a-zA-Z]|>\s)/.test(trimmed)) return line;
    if (/^\*\*/.test(trimmed)) return line;
    if (/[.?!"”’」』)\]》〉]$/.test(trimmed)) return line;
    if (/(잇몸이|치아가|구강이|입안이|결과가|모습이)\s*$/.test(trimmed)) {
      console.log(`[v3.4 잔해복구] 미완성 → 종결 추가: "${trimmed}"`);
      return line + " 회복되었어요.";
    }
    if (/(을|를|이|가|의|에서|에게|으로)\s*$/.test(trimmed)) {
      // [v103] 절단 완화 — 무조건 삭제 금지(과수정·문장 통삭제 사고 원인).
      //   짧은 잔해(부사+조사 등 12자 미만)만 제거. 긴 정상 문장은 자연 종결을 붙여 보존.
      const bare = trimmed.replace(/[^가-힣a-zA-Z0-9]/g, "");
      if (bare.length < 8) {
        console.log(`[v103 잔해제거] 짧은 조사잔해 제거: "${trimmed}"`);
        return "";
      }
      console.log(`[v103 문장보존] 조사종결 긴문장 → 종결 보강: "${trimmed}"`);
      // 의존명사+주격(것이/점이/부분이 등)은 '중요합니다'류, 그 외는 조사 제거 후 종결.
      if (/(것|점|부분|면|경우)이\s*$/.test(trimmed)) {
        return line.replace(/이\s*$/, "이 중요합니다.");
      }
      return line.replace(/(을|를|이|가|의|에서|에게|으로)\s*$/, ".");
    }
    if (/(고|며|면서|지만|는데|아서|어서|니까)\s*$/.test(trimmed)) {
      console.log(`[v3.4 잔해복구] 연결어미 → 종결: "${trimmed}"`);
      return line + " 변화가 있었습니다.";
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [최종 정리]
  // ─────────────────────────────────────────────────────
  // [v103] 치료명 직결 조사 전역 교정 — activeKeyword 강제주입이 조사 무시한 잔존 정리.
  //   받침없는 치료명(라미네이트 등)에 '과/은/을/이'가 붙은 비문 → '와/는/를/가'.
  {
    const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (treatmentName && !_tnHasJong) {
      result = result
        .replace(new RegExp(`${tnEsc}과(?=[\\s,.])`, "g"), `${treatmentName}와`)
        .replace(new RegExp(`${tnEsc}은(?=[\\s,.])`, "g"), `${treatmentName}는`)
        .replace(new RegExp(`${tnEsc}을(?=[\\s,.])`, "g"), `${treatmentName}를`)
        .replace(new RegExp(`${tnEsc}이(?=\\s)`, "g"), `${treatmentName}가`);
    } else if (treatmentName && _tnHasJong) {
      result = result
        .replace(new RegExp(`${tnEsc}와(?=[\\s,.])`, "g"), `${treatmentName}과`)
        .replace(new RegExp(`${tnEsc}를(?=[\\s,.])`, "g"), `${treatmentName}을`);
    }
  }

  // ─────────────────────────────────────────────────────
  // [v104-1] 비문 종결 보정 — '~것이.' / '~것을.' 류
  //   [B]는 마침표 없는 줄 끝 절단만 본다. GPT가 '확인하는 것이.'처럼
  //   마침표를 붙여 끝맺은 비문은 [B] 미도달 + 한 문단(한 줄) 안에
  //   여러 문장이 이어져 '것이.'가 줄 끝($)이 아닌 문단 중간에 위치 →
  //   v104 최초 줄단위 매핑으로는 누락. 문장 단위 전역 치환으로 교정.
  //   '용언(는/하시는/보는/찾는…) + 것이' + 문장경계(. ! ? 줄끝)
  //   → '것이 중요합니다.' 보강. (뒤에 서술어가 오는 '것이 권장됩니다'는
  //    문장경계가 아니므로 매칭 안 됨 = 정상 표현 보존)
  // ─────────────────────────────────────────────────────
  result = result
    // '것이.' 또는 '것이' 뒤 문장경계(마침표+공백/줄끝/문단끝) → 보강
    //   [v106] 앞을 '용언 어간 + 관형형 어미(는/은/을/ㄴ)'로 잡아 '세우는'처럼
    //   2음절 이상 어간도 포착(기존 단일글자 캡처가 '세우는' 누락하던 버그 동반 수정).
    //   [v109] {1,4}→{0,4} — 앞 글자 0개 허용. '하는 것이'처럼 어미가 단독으로
    //   문장을 열 때 {1,4}가 어미 첫글자('하')를 먼저 소비해 매칭 실패하던 버그 수정.
    .replace(/([가-힣]{0,4}(?:하시는|해보시는|아보는|어보는|보는|찾는|받는|세우는|두는|하는|되는|있는|없는|우는|기는|이는|리는))\s*것이\s*\.(\s|$)/g,
      "$1 것이 중요합니다.$2")
    .replace(/([가-힣]{0,4}(?:하시는|해보시는|아보는|어보는|보는|찾는|받는|세우는|두는|하는|되는|있는|없는|우는|기는|이는|리는))\s*것이(\s*\n|\s*$)/g,
      "$1 것이 중요합니다.$2")
    // [v106] '것도.' / '것도' 종결 비문 → '것도 좋습니다.' (업로드글 '살펴보는 것도.')
    .replace(/([가-힣]{0,4}(?:하시는|해보시는|아보는|어보는|보는|찾는|받는|세우는|두는|하는|되는|있는|없는|우는|기는|이는|리는))\s*것도\s*\.(\s|$)/g,
      "$1 것도 좋습니다.$2")
    .replace(/([가-힣]{0,4}(?:하시는|해보시는|아보는|어보는|보는|찾는|받는|세우는|두는|하는|되는|있는|없는|우는|기는|이는|리는))\s*것도(\s*\n|\s*$)/g,
      "$1 것도 좋습니다.$2")
    // [v106] 명사+'확인이' 종결 비문 → '확인이 이루어집니다.' (업로드글 '경과 확인이.')
    //   '확인이 중요한 이유' 등 뒤에 서술어 오는 정상표현은 문장경계 아니라 안 걸림.
    .replace(/(경과|상태|진행|결과)\s*확인이\s*\.(\s|$)/g, "$1 확인이 이루어집니다.$2")
    .replace(/(경과|상태|진행|결과)\s*확인이(\s*\n|\s*$)/g, "$1 확인이 이루어집니다.$2")
    // [v109] 명사+'방문이' 종결 비문 → '방문이 권장됩니다.' (업로드글 '정기적인 치과 방문이.')
    .replace(/(방문|점검|관리|내원)이\s*\.(\s|$)/g, "$1이 권장됩니다.$2")
    .replace(/(방문|점검|관리|내원)이(\s*\n|\s*$)/g, "$1이 권장됩니다.$2")
    // '것을.' 종결(드묾) → '것을 권장합니다.'
    .replace(/([가-힣]{0,4}(?:하시는|해보시는|아보는|어보는|보는|찾는|받는|세우는|하는|우는))\s*것을\s*\.(\s|$)/g,
      "$1 것을 권장합니다.$2");

  // [v109] '~은/는' 술어 완전 누락 절단 — 주어부만 남고 문장이 끊긴 케이스.
  //   업로드글 '이러한 과정은' (상담 섹션 끝). 줄/문단 끝에 '관형어+명사+은/는'만
  //   덜렁 남으면 통째 제거(짧은 잔해라 살리기보다 제거가 안전).
  //   ⚠️ 정상 본문은 '~은/는' 뒤에 반드시 서술이 이어지므로 줄끝 매칭 안 됨.
  //   지시관형어(이러한/이런/그런/이/그)로 시작하는 짧은 절단만 한정 → 오제거 방지.
  result = result
    .replace(/(^|\n)\s*(?:이러한|이런|그런|이|그|위와\s*같은)\s*[가-힣]{1,6}[은는]\s*(?=\n|$)/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

  // ─────────────────────────────────────────────────────
  // [v104-2] 명사+오결합 조사 정리 — activeKeyword 강제삽입 잔해
  //   치료명 뒤에 주격(이/가)·목적격(을/를)이 붙었는데
  //   후행어가 '명사'(시기/시점/단계/종류/선택…)이거나 '피동/형용'이라
  //   조사가 의미상 틀린 케이스. 받침 직결 교정([v103])이 못 잡는
  //   '명사 사이 오결합'을 문맥 패턴으로 교정.
  //   예) 스케일링이 시점 → 스케일링 시점 / 스케일링을 개선될 → 스케일링으로 개선될
  // ─────────────────────────────────────────────────────
  {
    const tnEsc3 = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const NOUN_AFTER = "(시기|시점|단계|종류|과정|방법|방식|효과|결과|선택|비용|기간|주기|상태|부위|영역|분야)";
    result = result
      // 치료명 + 이/가(주격 오결합) + 명사 → 치료명 + 공백 + 명사
      //   ('의'는 정상 관형격이므로 제외 — '스케일링의 효과' 보존)
      .replace(new RegExp(`${tnEsc3}(?:이|가)\\s+${NOUN_AFTER}`, "g"), `${treatmentName} $1`)
      // 치료명 + 이/가 + 시간 의존명사(때/시/경우) → 치료명 + 공백
      //   예) '신경치료가 때,' → '신경치료 때,' (GPT가 '받을 때' 의도를 오생성)
      .replace(new RegExp(`${tnEsc3}(?:이|가)\\s+(때|시|경우)([,\\s])`, "g"), `${treatmentName} $1$2`)
      // 치료명 + 을/를 + (개선|회복|예방|완화|호전|진행)될/되 → 치료명 + 으로/로 + …
      .replace(new RegExp(`${tnEsc3}(?:을|를)\\s+(개선|회복|예방|완화|호전|진행|관리)(될|되|할|한)`, "g"),
        (m, p1, p2) => `${treatmentName}${_tnHasJong ? "으로" : "로"} ${p1}${p2}`)
      // 치료명 + 이/가 + '두 가지/여러 …의 선택은' 의미붕괴 → 치료명+와/과 비교 재구성
      .replace(new RegExp(`${tnEsc3}(?:이|가)\\s+(두\\s*가지|여러|각각의|각|다양한)\\s*([^.\\n]{0,12}?)선택은`, "g"),
        `${treatmentName} 관련 선택은`)
      // [v104] 치료명 + 이/가 + '두 가지 방법' → 치료명 + 쉼표 (주격 오결합 제거)
      //   '신경치료가 두 가지 방법은' → '신경치료, 두 가지 방법은'
      .replace(new RegExp(`${tnEsc3}(?:이|가)\\s+(두\\s*가지\\s*방법)`, "g"), `${treatmentName}, $1`)
      // [v104] 치료명 + 이/가 + '모든' → 치료명 + '의 모든' (관형격 복원)
      .replace(new RegExp(`${tnEsc3}(?:이|가)\\s+(모든)`, "g"), `${treatmentName}의 $1`);
    // [v104] 치료명 치료 이중표현 → 치료명 ('신경치료 치료'→'신경치료')
    //   치료명이 '치료'로 끝나는 경우만 적용 (임플란트 치료 등 정상표현 보호).
    if (/치료$/.test(treatmentName)) {
      result = result.replace(
        new RegExp(`${tnEsc3}\\s+치료(?=[을를은는이가의과와도\\s.,]|$)`, "g"),
        `${treatmentName}`);
    }
  }

  result = result
    .replace(/\s+([.,!?])/g, "$1")
    // [v104] 마침표+쉼표 중복 정리 — GPT 산출 '있습니다., 정확한' → '있습니다. 정확한'
    .replace(/\.\s*,/g, ". ")
    .replace(/,\s*\./g, ".")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]{3,}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .replace(/['"]\s*['"]/g, "")
    .replace(/['"]\s+할\s+수/g, "할 수")
    .replace(/['"]\s+될\s+수/g, "될 수")
    .replace(/(["“])\s+([가-힣])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[\s.,]+/, "")
    .replace(/(^|\n)\s*\.\s*(\n|$)/g, "$1$2")
    .replace(/(^|\n)\s*\.\.\s*(\n|$)/g, "$1$2")
    .trim();

  return result;
}

// ============================================================
// 5-FINAL. finalDentalClean — v3.6 light scene engine 후처리
//   eye v2 패턴 이식 + dental 특화 blacklist
//   순서: Z → AB-1 → AB-1b → AB-1c → ~였어요 → AA → AB-2 → closing soft
// ============================================================
function finalDentalClean(text, treatmentName, region) {
  let r = text;
  let qcEndingResidual = 0;

  // ── Z: photoContext 메타 표현 잔존 정리 ─────────────────
  r = r
    .replace(/사진을\s*(보면|보니|확인하면|살펴보면)[,.\s]*/g, "")
    .replace(/이미지(에서|를\s*보면|를\s*확인하면)[,.\s]*/g, "")
    .replace(/위\s*사진(을|에서|에)\s*/g, "")
    .replace(/첨부(된|한)?\s*사진(을|에서|에)\s*/g, "");

  // ── AB-1: 감성 ending 1차 차단 (dental 특화) ─────────
  //   v3.6.1 안전 정책: 치환 후 뒤따르는 조사·어미와 충돌하지 않도록
  //                    "문장 단위 통째 교체" 또는 "빈 문자열 제거" 사용
  //                    (단순 단어 치환은 부조사 조사 깨짐 유발)

  // (1) 문장 단위 통째 교체 — 감성 ending이 들어간 종결 문장은 통째로 정리 표현으로
  const sentimentSentencePatterns = [
    /[^.!?\n]*환한\s*미소를?\s*(되찾|찾)[^.!?\n]*[.!?]/g,
    /[^.!?\n]*자신감\s*있게\s*웃[^.!?\n]*[.!?]/g,
    /[^.!?\n]*자신감을?\s*(되찾|찾)[^.!?\n]*[.!?]/g,
    /[^.!?\n]*활짝\s*웃[^.!?\n]*있[^.!?\n]*[.!?]/g,
    /[^.!?\n]*새로운\s*(일상|삶|시작)[^.!?\n]*[.!?]/g,
    /[^.!?\n]*삶의\s*질이[^.!?\n]*[.!?]/g,
    /[^.!?\n]*생활(의|이)?\s*질이?\s*(높아|좋아)[^.!?\n]*[.!?]/g,
    /[^.!?\n]*믿음이?\s*갔[^.!?\n]*[.!?]/g,
    /[^.!?\n]*옳았다는?\s*생각[^.!?\n]*[.!?]/g,
    // [v3.6.2] 정리형 감정 마무리 차단 — 효과 단정 회색지대
    /[^.!?\n]*좋은\s*선택이었죠[^.!?\n]*[.!?]/g,
    /[^.!?\n]*좋은\s*선택이었어요[^.!?\n]*[.!?]/g,
    /[^.!?\n]*모든\s*게\s*해결[^.!?\n]*[.!?]/g,
    /[^.!?\n]*모든\s*것이?\s*해결[^.!?\n]*[.!?]/g,
    /[^.!?\n]*더\s*이상\s*불편함을?\s*(느끼지|받지)\s*않[^.!?\n]*[.!?]/g,
    /[^.!?\n]*더는\s*불편함을?\s*(느끼지|받지)\s*않[^.!?\n]*[.!?]/g,
    // [v3.6.3] 사랑니 케이스 미세 보강
    /[^.!?\n]*확신이\s*들었죠[^.!?\n]*[.!?]/g,
    /[^.!?\n]*확신이\s*생겼어요[^.!?\n]*[.!?]/g,
    /[^.!?\n]*받기를\s*잘했다는?\s*생각[^.!?\n]*[.!?]/g,
    /[^.!?\n]*잘했다는?\s*생각이?\s*들었[^.!?\n]*[.!?]/g,
    /[^.!?\n]*훨씬\s*편해졌답니다[^.!?\n]*[.!?]/g,
    /[^.!?\n]*훨씬\s*편해졌어요[^.!?\n]*[.!?]/g,
    /[^.!?\n]*큰\s*도움을?\s*받을\s*수\s*있(을|는)\s*거(예|에)요[^.!?\n]*[.!?]/g,
    /[^.!?\n]*큰\s*도움이?\s*될\s*거(예|에)요[^.!?\n]*[.!?]/g,
  ];
  sentimentSentencePatterns.forEach(rx => {
    const before = r.length;
    r = r.replace(rx, "");
    if (r.length !== before) qcEndingResidual++;
  });

  // ── AB-1a: 조사 깨짐 잔존 정리 (v3.6.1) ─────────────
  // GPT 또는 safeRemove 후처리 단계에서 발생하는 비문 패턴
  // 예: "임플란트가 때문이죠" → "임플란트 때문이죠"
  {
    const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    r = r
      // 치료명이 + 때문/덕분 → 치료명 때문/덕분 (조사 제거)
      .replace(new RegExp(`${tnEsc}가\\s+(때문|덕분)`, "g"), `${treatmentName} $1`)
      // 치료명이 + 이유/필요 → 치료명의 이유/필요
      .replace(new RegExp(`${tnEsc}가\\s+(이유|필요|문제|효과)`, "g"), `${treatmentName}의 $1`)
      // 더 일반적인 "X가 때문이죠" 패턴 (치료명 외)
      .replace(/([가-힣]{2,5})가\s+때문이(죠|에요|네요|었어요)/g, "$1 때문이$2")
      .replace(/([가-힣]{2,5})가\s+덕분이(죠|에요|네요)/g, "$1 덕분이$2");
  }

  // ── AB-1b: dental 핵심 blacklist 확장 ────────────────
  // 공포 연출 / 통증 강조 / 의료기구 fetish 차단
  r = r
    // 공포 anticipation
    .replace(/끔찍한\s*통증/g, "불편한 느낌")
    .replace(/참기\s*힘들\w*\s*통증/g, "불편함")
    .replace(/너무\s*아\w*\s*소리\w*/g, "잠깐 불편했고")
    .replace(/기구가?\s*다가\w*\s*때/g, "검사 자세를 잡을 때")
    .replace(/소리만\s*들어도\s*무서\w*/g, "처음엔 어색했")
    .replace(/입을?\s*벌\w*\s*있\w*\s*것\w*\s*힘들/g, "자세 유지는 익숙해지면 괜찮")
    // 드릴/바늘 직접 묘사
    .replace(/드릴(이|을|로)?\s*[^\s,.]+/g, "치료를")
    .replace(/마취\s*바늘\w*/g, "마취 단계")
    // 의료기구 fetish
    .replace(/날카로운\s*기구\w*/g, "치료 기구")
    // 효과 단정형
    .replace(/명확해지기\s*시작\w*/g, "조금씩 안정되기 시작했어요")
    .replace(/선명해지기\s*시작\w*/g, "조금씩 안정되기 시작했어요");

  // ── AB-1c: AA 합성 깨짐 자동 복구 (명사 어간 + 라고) ─
  // eye v2에서 발견된 패턴 — 명사 + ~라고 합성 시 문법 깨짐
  r = r
    .replace(/판단라고\s*(느꼈|했|봤)/g, "판단했")
    .replace(/시작라고\s*(느꼈|했|봤)/g, "시작했")
    .replace(/결정라고\s*(느꼈|했|봤)/g, "결정했")
    .replace(/치료라고\s*(느꼈|했|봤)/g, "치료라는 결론을 내렸")
    .replace(/선택라고\s*(느꼈|했|봤)/g, "선택했");

  // ── AB-1d: 따옴표 + 키워드 중첩 비문 fix (v3.6.5) ─────
  //   예: "임플란트 비용"임플란트도 검색 → "임플란트 비용"도 검색
  //   GPT가 따옴표 닫은 직후 키워드를 또 붙여 출력하는 패턴
  {
    const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 패턴 1: "...키워드..."키워드 + 조사 → 두 번째 키워드 제거
    r = r.replace(new RegExp(`(["“][^"”\\n]*${tnEsc}[^"”\\n]*["”])${tnEsc}(도|는|을|를|이|가|에|로|과|와|만|까지|부터|에서)`, "g"), "$1$2");
    // 패턴 2: 그냥 "...키워드"키워드 (조사 없이) 형태도 (드물지만 안전망)
    r = r.replace(new RegExp(`(["“][^"”\\n]*${tnEsc}[^"”\\n]*["”])${tnEsc}(?![가-힣])`, "g"), "$1");
  }

  // ── ~였어요 오타 복구: 받침 있는 글자 + 였어요 → 이었어요 ─
  r = r.replace(/([가-힣])였어요/g, (m, ch) => {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return m;
    const jong = code % 28;
    if (jong !== 0) return `${ch}이었어요`;
    return m;
  });
  r = r.replace(/([가-힣])였습니다/g, (m, ch) => {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return m;
    const jong = code % 28;
    if (jong !== 0) return `${ch}이었습니다`;
    return m;
  });

  // ── AA: ~했어요 4연속만 1개 ~했습니다 격조 전환 (보수적) ──
  {
    const matches = [...r.matchAll(/했어요\./g)];
    if (matches.length >= 4) {
      let cnt = 0;
      r = r.replace(/했어요\./g, (m) => {
        cnt++;
        return cnt === 4 ? "했습니다." : m;
      });
    }
  }

  // ── AB-2: timeline 어미 다양화 ───────────────────
  r = r
    .replace(/(1일|첫째 날|1일차)[^\n]*보였어요/g, m => m.replace("보였어요", "확인됐어요"))
    .replace(/(1주|일주일|1주차)[^\n]*보였어요/g, m => m.replace("보였어요", "느껴졌어요"));

  // ── closing soft: 1개만 보존 ─────────────────────
  const closingSoftPatterns = [
    /도움이\s*되었으면\s*\w*/g,
    /기준이\s*되었으면\s*\w*/g,
    /참고\s*되었으면\s*\w*/g,
  ];
  closingSoftPatterns.forEach(rx => {
    const arr = [...r.matchAll(rx)];
    if (arr.length > 1) {
      let kept = false;
      r = r.replace(rx, (m) => {
        if (!kept) { kept = true; return m; }
        return "";
      });
    }
  });

  // ── [v3.6.3] 문장 절단 패턴 제거 ─────────────────────
  // GPT가 문장을 미완성으로 끊는 케이스: "치료를 받고 나니 정말." 류
  // 패턴: 부사·접속사 + 종결부호 (의미 불완전)
  r = r
    .replace(/[^.!?\n]*(정말|진짜|너무|매우|아주|꽤|좀)\s*\.\s*/g, (m) => {
      // "정말 좋아요." 같이 뒤에 다른 단어가 오면 보존, 부사 직후 마침표만 절단으로 간주
      return /(정말|진짜|너무|매우|아주|꽤|좀)\s*\.\s*$/.test(m.trim()) ? "" : m;
    })
    // 더 일반화: "~나니 정말." / "~받고 정말." 같은 종결 직전 절단
    .replace(/([가-힣]{2,})\s+(정말|진짜|너무|매우)\s*\.\s*\n/g, "$1.\n")
    .replace(/([가-힣]{2,})\s+(정말|진짜|너무|매우)\s*\.\s*$/g, "$1.");

  // 공백 정리
  r = r.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  finalDentalClean._lastEndingResidual = qcEndingResidual;
  return r;
}

// ============================================================
// 6. 회복 타임라인 (personal 전용)
// ============================================================
function insertDentalTimeline(text, treatmentName, mode) {
  if (mode === "commercial") return text;
  const hasTimeline = /일차|일째|주일|개월/.test(text);
  if (!hasTimeline) return text;
  const isImplant = /임플란트/.test(treatmentName);
  const isWisdom  = /사랑니/.test(treatmentName);
  const isScaling = /스케일링/.test(treatmentName);
  const day7Note  = isImplant ? "식립 부위 안정화, 부드러운 식사 가능"
                  : isWisdom  ? "붓기 대부분 빠짐, 일반 식사 가능"
                  : isScaling ? "잇몸 민감도 정상화"
                  : "회복 진행 중";
  const timeline = `\n\n**회복 요약**\n- 1~2일차: 통증·붓기 가장 심함\n- 3~5일차: 부드러운 식단 유지\n- 7일차: ${day7Note}\n- 1개월: 일상 식사 완전 회복`;
  return text.trimEnd() + timeline;
}

// ============================================================
// 7. 추천 대상 (personal 전용)
// ============================================================
const DENTAL_REC_MAP = {
  "임플란트":         ["치아가 1개 이상 빠진 경우", "틀니 불편함을 해소하고 싶은 경우", "자연치아에 가까운 기능을 원하는 경우"],
  "라미네이트":       ["앞니 착색·변색이 심한 경우", "치아 모양을 빠르게 개선하고 싶은 경우"],
  "투명교정":         ["직장인·성인으로 심미적 교정을 원하는 경우", "철 교정이 부담스러운 경우"],
  "신경치료":         ["충치가 신경까지 진행된 경우", "치아를 최대한 살리고 싶은 경우"],
  "스케일링":         ["1년에 1회 정기 구강 관리가 필요한 경우", "잇몸 출혈·구취가 있는 경우"],
  "사랑니발치":       ["사랑니로 잇몸이 자주 붓는 경우", "발치 두려움 때문에 미루고 있는 경우"],
  "지르코니아크라운": ["신경치료 후 크라운이 필요한 경우", "심미성과 내구성을 함께 원하는 경우"],
  "치아미백":         ["커피·차·흡연으로 착색이 심한 경우", "빠른 효과를 원하는 경우"],
  "턱관절치료":       ["턱에서 소리가 나거나 통증이 있는 경우", "이갈이·이 악물기 습관이 있는 경우"],
};

// ============================================================
// 7-2. 판단 기준 (v3.5 신설) — 결론 강화용
//   원인: 마무리가 "추천합니다" / "좋겠어요" 감정 반복 → 상단 유지력↓
//   처리: 치료별 객관적 판단 기준 4가지 제시 (정보형 결론)
// ============================================================
const DENTAL_DECISION_CRITERIA = {
  "임플란트": [
    "위치: 통원 부담을 줄여 사후 관리까지 꾸준히 받을 수 있는 거리인지",
    "상담: 상태 진단·치료 계획·예상 비용을 충분히 설명받을 수 있는지",
    "경험: 임플란트 케이스 누적이 충분한지, 보철 단계까지 일관되게 진행되는지",
    "사후 관리: 정기 검진·보철 교체까지 장기적으로 관리받을 수 있는 체계가 있는지",
  ],
  "라미네이트": [
    "위치: 디자인 시안 확인·재방문이 편한 거리인지",
    "상담: 치아 삭제량·자연치 보존 방식을 명확히 설명받는지",
    "경험: 케이스별 시안과 결과가 충분한지",
    "사후 관리: 색·접착 상태 점검을 정기적으로 받을 수 있는지",
  ],
  "투명교정": [
    "위치: 2~4주 간격 점검을 부담 없이 받을 수 있는 거리인지",
    "상담: 교정 기간·예상 단계 수·중도 변경 가능성을 안내받는지",
    "경험: 동일 시스템(인비절라인 등) 케이스 누적이 충분한지",
    "사후 관리: 유지장치 단계까지 책임지는지",
  ],
  "신경치료": [
    "위치: 치료 후 통증·재내원 시 빠르게 방문할 수 있는 거리인지",
    "상담: 신경 상태·재신경치료 가능성·크라운 단계까지 일관되게 안내받는지",
    "경험: 마이크로스코프·러버댐 등 정밀 장비를 사용하는지",
    "사후 관리: 크라운 후 정기 점검 체계가 있는지",
  ],
  "스케일링": [
    "위치: 1년 1~2회 정기 방문에 부담 없는 거리인지",
    "상담: 잇몸 상태 진단을 함께 안내받는지",
    "경험: 잇몸 출혈·민감도가 큰 경우에도 부드럽게 진행되는지",
    "사후 관리: 잇몸치료가 필요할 경우 단계별 안내가 있는지",
  ],
  "사랑니발치": [
    "위치: 발치 후 통증·붓기 발생 시 빠르게 방문할 수 있는 거리인지",
    "상담: CT·파노라마로 신경 위치를 정확히 확인하는지",
    "경험: 매복·수평 사랑니 발치 케이스 누적이 충분한지",
    "사후 관리: 봉합 제거·합병증 발생 시 후속 진료가 가능한지",
  ],
  "지르코니아크라운": [
    "위치: 보철 시안 확인·재방문이 편한 거리인지",
    "상담: 자연치 색조 매칭·교합 조정을 충분히 진행하는지",
    "경험: 보철 케이스 누적이 충분한지",
    "사후 관리: 교합·접착 상태 점검을 정기적으로 받을 수 있는지",
  ],
  "치아미백": [
    "위치: 추가 시술 시 재방문 부담이 적은 거리인지",
    "상담: 시린이 발생 가능성·미백 한계를 명확히 안내받는지",
    "경험: 전문가·홈블리칭 병행 케이스 누적이 충분한지",
    "사후 관리: 색 유지 관리·재시술 가능 여부 안내가 있는지",
  ],
  "턱관절치료": [
    "위치: 장기 진료가 필요하므로 통원 부담이 적은 거리인지",
    "상담: 영상·근육·교합까지 다각도로 진단받는지",
    "경험: 스플린트·물리치료 등 단계별 접근이 가능한지",
    "사후 관리: 증상 변화에 따른 장기 추적이 가능한지",
  ],
};
function getDecisionCriteria(treatmentName) {
  return DENTAL_DECISION_CRITERIA[treatmentName] || [
    `위치: ${treatmentName} 진료 후 재방문에 부담이 없는 거리인지`,
    `상담: 치료 계획·예상 기간·비용을 충분히 안내받을 수 있는지`,
    `경험: ${treatmentName} 케이스 누적이 충분한지`,
    `사후 관리: 정기 점검까지 장기적으로 진행되는지`,
  ];
}

// ============================================================
// 7-3. 키워드 밀도 보정 (v3.5 신설)
//   원인: "OO 임플란트 잘하는 곳" 등 fullKeyword가 초반에만 노출
//   처리: 본문 중간/후반에 자연스러운 문장 2회 자연 삽입
//        - 결정 섹션 직후 1회 (fullKeyword)
//        - 변화 섹션 직후 1회 (fullKeyword)
// ============================================================
function injectKeywordDensity(text, fullKeyword, treatmentName, region) {
  // 이미 충분히 분포된 경우 스킵 (3회 이상)
  const fkEsc = fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fkCount = (text.match(new RegExp(fkEsc, "g")) || []).length;
  if (fkCount >= 3) return text;

  const insertA = `\n\n${fullKeyword}을(를) 찾을 때 가장 먼저 봤던 건 거리·상담 분위기였어요. 멀면 아무리 좋아도 사후 관리가 어렵거든요.\n`;
  const insertB = `\n\n${region}에서 ${treatmentName} 고민이라면, 처음부터 한 곳만 보지 말고 2~3곳 비교 상담해보는 걸 권합니다.\n`;

  let result = text;
  let inserted = 0;

  // 1순위: 결정 섹션 끝 (다음 ## 헤더 직전)
  const decisionIdx = result.indexOf("## 결정");
  if (decisionIdx !== -1 && inserted < 1) {
    const nextHeader = result.indexOf("\n##", decisionIdx + 5);
    if (nextHeader !== -1) {
      result = result.slice(0, nextHeader) + insertA + result.slice(nextHeader);
      inserted++;
    }
  }

  // 2순위: 변화/결과 섹션 끝
  const resultIdx = result.lastIndexOf("## 변화");
  if (resultIdx !== -1 && inserted < 2) {
    const nextHeader = result.indexOf("\n##", resultIdx + 5);
    if (nextHeader !== -1) {
      result = result.slice(0, nextHeader) + insertB + result.slice(nextHeader);
      inserted++;
    } else {
      // 변화가 마지막 섹션
      result = result + insertB;
      inserted++;
    }
  }
  // 폴백: 시술 후/치료 후 변화
  if (inserted === 0) {
    const fbIdx = result.indexOf("## 시술 후") !== -1
      ? result.indexOf("## 시술 후")
      : result.indexOf("## 치료 후");
    if (fbIdx !== -1) {
      const nextHeader = result.indexOf("\n##", fbIdx + 5);
      if (nextHeader !== -1) {
        result = result.slice(0, nextHeader) + insertA + result.slice(nextHeader);
      } else {
        result = result + insertA;
      }
    }
  }

  console.log(`[dental][v3.5] 키워드 밀도 보정: ${inserted}회 삽입 (기존 ${fkCount}회)`);
  return result;
}


// ============================================================
// 8. QC 체크
// ============================================================
function runQC(text, treatmentName, mode, fullKeyword) {
  const charCount = calcCharCount(text);

  const hasInfoBlock = /\|\s*항목\s*\||\|\s*확인 항목\s*\||\|\s*[가-힣]+\s*\|/.test(text);
  const hasExamValue = /\d+\s*(분|일|주|개월|회|점|만원)/.test(text);
  const kwCount = (text.match(new RegExp(treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
  const firstPersonCount = (text.match(/저는\s|제가\s|내가\s|나는\s|저도\s|받아봤|받았더|느꼈어|느꼈다|결심했어|결정했어|고민했어/g) || []).length;
  const priceCount = (text.match(/\d+\s*만원/g) || []).length;
  const certaintyCount = (text.match(/좋아졌|또렷해졌|만족합|만족했|마음에 들었|확실히 좋|확실히 효과|분명히 좋|완치|100%|결과가 좋/g) || []).length;
  const recommendCount = (text.match(/추천합|추천해요|추천드립|꼭 받|상담\s*받아보|받아보시|도움이 됩|도움이 될/g) || []).length;
  const reviewFlowCount = (text.match(/고민하다가|결국 받|결심하고|결정했다|받기로 했|받고 나서/g) || []).length;

  // v3.5 신설
  const tongheCount = (text.match(/통해/g) || []).length;
  const fullKwCount = fullKeyword
    ? (text.match(new RegExp(fullKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
    : 0;

  console.log(`[dental][QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[dental][QC] 수치: ${hasExamValue}`);
  console.log(`[dental][QC] 키워드반복: ${kwCount}`);
  console.log(`[dental][QC] 통해(2회 이하 권장): ${tongheCount}`);
  if (fullKeyword) console.log(`[dental][QC] 완전체키워드(${fullKeyword}): ${fullKwCount}`);
  if (mode === "commercial") {
    console.log(`[dental][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[dental][QC] 가격(commercial 위반): ${priceCount}건`);
    console.log(`[dental][QC] 효과단정(commercial 위반): ${certaintyCount}건`);
    console.log(`[dental][QC] 추천유도(commercial 위반): ${recommendCount}건`);
    console.log(`[dental][QC] 후기흐름(commercial 위반): ${reviewFlowCount}건`);
  }

  return {
    hasInfoBlock, hasExamValue, kwCount,
    firstPersonCount, priceCount,
    certaintyCount, recommendCount, reviewFlowCount,
    tongheCount, fullKwCount,
    charCount,
  };
}

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
// ============================================================
// [v3.6.6] 네이버 복붙용 사진 placeholder — 2단 구조
//   - 추천 사진 (뭘 올릴지) + 사진 설명 예시 (어떻게 적을지) 분리
//   - alt 카테고리별 3개씩 회전
//   - "사진 설명" 아닌 "후기 캡션" 톤
// ============================================================
const DENTAL_PHOTO_POOL = {
  "검사 사진": {
    photos: [
      "X-ray 결과 화면",
      "파노라마 모니터 사진",
      "검사실 안내 사진",
    ],
    // [v104] 정보형 중립 캡션 — 체험형 1인칭 시점 제거(정보형 화자 충돌 방지)
    captions: [
      "검사 장비 안내",
      "결과 판독 화면 예시",
      "X-ray 촬영실 안내",
    ],
  },
  "상담 사진": {
    photos: [
      "상담실 내부 사진",
      "치과 입구 / 대기실 사진",
      "진료 데스크 풍경",
    ],
    // [v104] 정보형 중립 캡션
    captions: [
      "상담실 안내",
      "진료 상담 공간",
      "예약 / 접수 데스크 안내",
    ],
  },
  "치료 사진": {
    photos: [
      "치료실 입장 전 사진",
      "치료 직전 대기실 사진",
      "치과 입구에서 찍은 사진",
    ],
    // [v104] 정보형 중립 캡션
    captions: [
      "진료실 안내",
      "치료 공간 안내",
      "원내 입구 안내",
    ],
  },
  "보철 사진": {
    photos: [
      "회복 중 식사 사진",
      "양치 / 가글 도구 사진",
      "거울 셀카 (입 다문 모습)",
    ],
    // [v104] 정보형 중립 캡션
    captions: [
      "구강 위생 관리 안내",
      "관리 도구 안내",
      "관리 단계 안내",
    ],
  },
  "일상 사진": {
    photos: [
      "외출 셀카",
      "카페 / 일상 사진",
      "평소 식사 사진",
    ],
    // [v104] 정보형 중립 캡션
    captions: [
      "원내 시설 안내",
      "진료 안내 자료",
      "병원 전경 안내",
    ],
  },
};

function buildPhotoPlaceholder(altRaw) {
  const alt = String(altRaw || "").trim();
  const entry = DENTAL_PHOTO_POOL[alt] || DENTAL_PHOTO_POOL["일상 사진"];
  const photos   = entry.photos.slice(0, 3);
  const captions = entry.captions.slice(0, 3);

  return [
    "",
    "━━━━━━━━━━━━━━━━━━━",
    "📷 사진 첨부 위치",
    "(업로드 후 이 안내문 삭제)",
    "",
    "추천 사진",
    `• ${photos[0]}`,
    `• ${photos[1]}`,
    `• ${photos[2]}`,
    "",
    "사진 설명 예시",
    `• ${captions[0]}`,
    `• ${captions[1]}`,
    `• ${captions[2]}`,
    "━━━━━━━━━━━━━━━━━━━",
    "",
  ].join("\n");
}

// ★ v3.6.7 — stripMarkdownForNaver semi-migration
//   ① 헤더/마크다운 변환은 공통 모듈(_stripMarkdownForNaver)로 위임
//      → photoPool 인자 미주입 (null) → 박스 변환 skip → [이미지: XX] 그대로 보존
//   ② 박스 변환은 dental 전용 buildPhotoPlaceholder로 별도 수행 (2단 구조 UI 보존)
//   ⚠️ 박스 형식 완전 동일 / 회귀 0 / 발행 데이터 연속성 유지
function stripMarkdownForNaver(text) {
  // ① 공통 모듈 위임 (photoPool 미주입 → 박스 변환 skip)
  let t = _stripMarkdownForNaver(text, null);

  // ★ [OneClick] 이미지 마커 통일 — [이미지: alt] 표준 유지. 박스 변환 비활성.
  //    QC의 boxCount=0 / plainNoBox==plain 은 정상(로그 전용, 차단 아님).
  // (구) dental 전용 2단 ━ 박스 변환 — 비활성. buildPhotoPlaceholder는 롤백용 보존.

  // ③ 박스 변환 후 연속 빈 줄 재압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleDental(req, res) {
  const {
    target, program, blogType,
    userRegion, userMemo, overrideTitle,
    mode = "personal", storeId,
    storeName: bodyStoreName, repRegion: bodyRepRegion,
    directorName: bodyDirectorName, specialty: bodySpecialty,
    photoContext,
  } = req.body;

  // [v-loc] 위치 공통화 — LocationBlock 후단 주입용 위치 필드 수신(index.js hubStore 출처).
  const locStore = {
    address:       req.body?.address,
    map_guide:     req.body?.map_guide,
    transit:       req.body?.transit,
    building_desc: req.body?.building_desc,
    parking_info:  req.body?.parking_info,
  };

  const photoCtx = (photoContext || "").trim();
  if (photoCtx) console.log(`[dental] photoContext 주입: ${photoCtx.length}자`);

  const subKw      = program.name || "";
  const region     = (userRegion || "강남").trim();
  const memo       = (userMemo || "").trim();
  const targetId   = target?.id   || "consult";
  const blogTypeId = blogType?.id || "review";
  const industry   = "dental";
  // ── 의료기관 화자용: req.body 주입(hubStore.store_name). DB 직접조회 안 함 ──
  const storeName    = (bodyStoreName || "").trim();
  const repRegion    = (bodyRepRegion || region).trim();
  const directorName = (bodyDirectorName || "").trim();   // 원장명(선택)
  const specialty    = (bodySpecialty || "").trim();      // 전문의 자격(선택, 예: "치주과 전문의")
  const hospital     = storeName || "{병원명}";
  // ── 화자 도입 문장: 신뢰 축. 원장명/전문의 있으면 주입, 없으면 병원명만 (graceful fallback) ──
  //    상단 독식 패턴 = "○○치과 [전문의] 대표원장 ○○○입니다" 구조 반영
  const speakerIntro = directorName
    ? `안녕하세요. ${repRegion} ${hospital} 대표원장 ${directorName}입니다.${specialty ? ` ${specialty}로서 정확한 정보를 전해드리겠습니다.` : ""}`
    : `안녕하세요. ${repRegion} ${hospital} 의료진입니다.`;
  // ── 치과 = 의료법상 후기형 발행 STOP → 정보형(commercial) 고정 ──
  //    personal 분기 코드는 보존하되 도달 불가. 롤백 시 아래 한 줄 원복.
  const validMode  = "commercial";
  console.log(`[dental] mode: ${validMode} (dental 정보형 고정) / 화자: ${speakerIntro}`);

  // ── dental 시술 검증 ─────────────────────────────────
  const DENTAL_IDS = ["implant","laminate","braces","rootcanal","scaling","wisdom","zirconia","whitening","tmj",
                      "resin","inlay","ceramic_crown","metal_braces","lingual_braces","periodontal","gum_contour","pedo_caries","implant_redo","denture"];
  const DENTAL_NAMES = ["임플란트","라미네이트","투명교정","신경치료","스케일링","사랑니발치","지르코니아크라운","치아미백","턱관절치료",
                        "레진치료","인레이·온레이","올세라믹크라운","일반교정","설측교정","잇몸치료","잇몸성형","소아충치치료","임플란트재수술","틀니"];
  const isDental = DENTAL_IDS.includes(program.id) || DENTAL_NAMES.includes(subKw);
  if (!isDental) {
    console.error(`[dental] 잘못된 치료 진입 차단: ${subKw}`);
    return res.status(400).json({ error: `치과 생성기에 잘못된 치료가 전달되었습니다: ${subKw}` });
  }
  console.log(`[dental] 치료 검증 통과: ${subKw}`);

  // ── 시술 데이터 로드 ─────────────────────────────────
  const treatmentData = DENTAL_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || DENTAL_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  const seoData = { ...treatmentData };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 (mode 분기) ────────────────────
  const systemPrompt = validMode === "commercial"
    ? `당신은 ${repRegion} ${hospital} 치과의 공식 블로그를 작성하는 의료기관 화자입니다.
이 글은 환자 후기가 아니라, 치과가 직접 제공하는 전문 정보입니다.
업종: 치과 | 치료: ${subKw} | 지역: ${repRegion}

[화자 규칙 — 의료법 §56① 광고 주체 요건 / 상단 독식 패턴]
- 도입 첫 문장 고정(글자 그대로 사용): "${speakerIntro}"
- 1인칭은 '의료기관/대표원장'으로만 사용. 환자 1인칭(저는/제가/받아봤어요/고민했어요) 전면 금지.
- 의료기관이 기준·정보를 제시하는 톤. 본인 치료경험담 절대 아님.
- 화자 신뢰 축(병원명·원장명·전문의 자격)을 글 전체의 근거로 유지.

[의료광고법 준수 — 절대 규칙]
- ❌ 1인칭 환자 시점 / 치료경험담 / 효과·결과 단정(좋아졌어요/해결되었어요/만족)
- ❌ 만족도·추천·내원 유도 / 우월성("후기 많은") 표현
- ❌ 가격 직접 명시 금지 → "병원별 상이, 상담 시 확인"
- ✅ "이런 경우 고려합니다" 일반론. 결과 단정 없음.

[구조 — 전문의 정보형 / N가지 기준]
도입 질문 → 고려하는 경우 → 관찰하는 경우 → 상담 전 확인 N가지 → 주의사항 → Q&A → 병원정보
소제목은 판단기준형으로: "이런 경우 고려합니다 / 바로 하지 않고 관찰하는 경우는? / 상담 전 확인할 N가지 / (검사) 확인이 중요한 이유 / 발치 후 주의사항"

[필수 전제 표현 — 글 내 1회 이상]
- "개인 구강 상태에 따라 다를 수 있습니다"
- "진단·치료를 대체하지 않습니다 / 정확한 사항은 치과 상담을 통해 확인"

표·불릿 사용 가능. 정보형이지만 딱딱하지 않게.

[어법 절대 규칙 — v3.4 핵심]
※ 치료명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ "${subKw}" (그대로) / "${subKw}을" / "${subKw}를" / "${subKw}은" / "${subKw}는" / "${subKw}이" (주격) / "${subKw}로" / "${subKw}에"
  ✅ 대체어: "이 치료" / "해당 치료"
  ❌ "${subKw} 치료" 금지 (이중 표현)
  ❌ "${subKw}이 치료" 금지 (어순 붕괴)
  ❌ "이 치료가 치료" 금지
  ❌ "이 치료가 [명사]" 금지`
    : `당신은 ${region} 거주 일반인입니다. ${subKw} 진료를 받아본 1인칭 블로그 후기를 작성합니다.
업종: 치과 | 치료: ${subKw} | 지역: ${region}
[절대 금지] 성형외과·피부과 관련 표현 일절 사용 금지
[절대 금지] "첫째/둘째/셋째" 나열, "중요합니다", "살펴보겠습니다"
[필수] ~했어요, ~더라고요 블로그 구어체 | 1인칭 "저는/제가" 포함

[v3.6 light scene 규칙 — 치과 특화]
- 설명 70~80% · scene(공간·시선·자세 묘사) 20~30% 비율 유지
- scene은 "손 움직임"보다 "시선 이동/설명 보조" 위주
  ✅ 권장: 조명 이동, 차트 확인, 엑스레이 화면, 거울 설명, 체어 각도, 턱 위치 안내
  ❌ 금지: 드릴 묘사, 마취 바늘, 입안 세부 묘사, 의료기구 자체에 집중
- 공포 연출 금지: "끔찍한 통증" / "참기 힘들" / "기구가 다가왔다" 류 일절 금지
- 감성 회복 ending 금지: "환한 미소", "자신감 있게 웃을", "새로운 일상" 류 일절 금지

[v3.5 표현 다양성 규칙]
- "${subKw}을(를) 통해" / "치료를 통해" / "시술을 통해" 표현은 글 전체 1회 이내로만 사용
  → 대체: "${subKw} 후" / "${subKw} 받고 나서" / "치료 이후" / "시술 이후" / "받고 나니"
- "좋을 것 같아요" / "좋겠어요" 같은 추정형 마무리 자제 → 객관적 정보·근거 제시
- "${region} ${subKw}" 복합 키워드를 본문 중간·후반에도 자연스럽게 2~3회 등장시킬 것
  → 단, 같은 문장 안 반복 금지

[어법 절대 규칙 — v3.4 핵심]
※ 치료명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ "${subKw}" (그대로) / "${subKw}을" / "${subKw}를" / "${subKw}은" / "${subKw}는" / "${subKw}이" (주격) / "${subKw}로" / "${subKw}에"
  ✅ 대체어: "이 치료" (조사 자연스럽게)
  ❌ "${subKw} 치료" 금지 (이중 표현)
  ❌ "이 치료가 [명사]" 금지 — "이 치료의 [명사]" 또는 "이 치료는 [형용사]"

[문장 종결 절대 규칙]
- 모든 문장은 "다." / "요." / "죠." / "어요." / "습니다." 중 하나로 종결
- 미완성 문장·비문 금지`;

  // ── 섹션별 순차 생성 ─────────────────────────────────
  const SECTIONS = DENTAL_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = "";

  // ============================================================
  // [A-4] family 1회 확정 (제목↔본문↔closing 동기화)
  //   - implant + personal 일 때만 활성
  //   - titleFamilyMap에서 random index 선택 → familyId 확정
  //   - 확정된 index로 제목·본문 모두 같은 family 사용 (drift 제거)
  //   - 그 외(다른 시술/commercial/overrideTitle): chosenFamilyId=null → fallback
  // ============================================================
  let chosenFamilyId = null;
  let chosenTitleIdx = -1;
  if (validMode === "personal" && treatmentId === "implant"
      && Array.isArray(treatmentData.titleFamilyMap)
      && treatmentData.titleFamilyMap.length
      && !overrideTitle) {
    chosenTitleIdx = Math.floor(Math.random() * treatmentData.titleFamilyMap.length);
    chosenFamilyId = treatmentData.titleFamilyMap[chosenTitleIdx] || null;
    console.log(`[dental][A-4] family 확정: ${chosenFamilyId} (titleIdx=${chosenTitleIdx})`);
  } else {
    console.log(`[dental][A-4] family 미적용 (fallback): mode=${validMode} id=${treatmentId}`);
  }

  // ============================================================
  // [v3.6] LIGHT SCENE ENGINE — dental 특화 (eye v2 패턴 + 옵션 A)
  //   - 단일호출 ❌ / 섹션 루프 안 hard scene 1개 주입 ⭕
  //   - hard 섹션: search / consult / result (3개)
  //   - decision/closing/reason/progress/concern: scene 금지 (설명 톤 유지)
  //   - 손 움직임 ❌ → 시선·설명 보조 ⭕
  //   - 공포 anticipation / 의료기구 fetish 금지
  // ============================================================
  const SCENE_POOL_DENTAL = {
    "이동·자세": [
      "체어에 등을 기대고",
      "유닛체어가 천천히 뒤로 기울고",
      "조명이 입가 쪽으로 살짝 옮겨졌고",
      "턱 위치를 살짝 조정해달라고 안내받았고",
    ],
    "시선·설명보조": [
      "거울로 치아 상태를 같이 보면서",
      "차트 화면을 함께 보면서",
      "엑스레이 사진을 가리키며 설명을 듣고",
      "구강 모형으로 위치를 짚어주셨고",
    ],
    "검사·진단": [
      "파노라마 영상이 모니터에 떴고",
      "엑스레이 화면이 띄워졌고",
      "구강 사진이 화면에 같이 보였고",
      "측정 수치가 차트에 정리되어 있었고",
    ],
    "상담·결정": [
      "치료 옵션을 화면으로 비교해주셨고",
      "예상 일정을 달력에 표시해주셨고",
      "회복 기간을 차트에 적어주셨고",
      "치료 계획서를 출력해서 같이 보면서",
    ],
    "적응·일상": [
      "구강세정제로 헹구고 나서",
      "식사하면서 씹는 느낌을 살펴보고",
      "거울로 잇몸 상태를 확인하면서",
      "양치질 방법을 다시 점검해보고",
    ],
  };

  const SECTION_SCENE_MAP_DENTAL = {
    search:  ["이동·자세", "상담·결정"],
    consult: ["검사·진단", "시선·설명보조"],
    result:  ["적응·일상"],
    // decision: 판단 중심 → scene 최소화 (주입 안함)
    // closing/reason/progress/concern: 설명 톤 유지 → scene 금지
  };

  function _pickDental(cat) {
    const pool = SCENE_POOL_DENTAL[cat] || [];
    if (!pool.length) return "";
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function buildDentalSceneBlock(secKey) {
    const cats = SECTION_SCENE_MAP_DENTAL[secKey];
    if (!cats || !cats.length) return "";
    const scenes = cats.map(c => _pickDental(c)).filter(Boolean);
    if (!scenes.length) return "";
    return `
[scene 자연 삽입 — 이 섹션 1~2회만, 그대로 복붙 금지]
${scenes.map(s => `· ${s}`).join("\n")}
⚠️ 손 움직임/드릴/통증/공포 묘사 금지. 시선·설명·자세 위주.
`;
  }

  function buildDentalPhotoBlock(secKey, ctx) {
    if (!ctx) return "";
    return `
[사용자 사진 컨텍스트 — 자연스러운 묘사 보조]
${ctx.slice(0, 400)}
⚠️ "사진을 보면", "이미지에서" 같은 메타 표현 금지. 본문에 자연 흡수.
`;
  }

  // 콘솔 로그 (어떤 모드로 진입했는지 1회)
  if (photoCtx) {
    console.log(`[dental] LIGHT SCENE engine: PHOTO_BLOCK + scene fallback (3섹션 hard)`);
  } else {
    console.log(`[dental] LIGHT SCENE engine: SCENE_POOL fallback only (3섹션 hard: search/consult/result)`);
  }

  for (const sec of SECTIONS) {
    // [D-4-5b] STORE_PROFILE promptBody View 전달 — 라우터(generate.js)가 주입한 req.storeProfileView.
    //   미주입·빈 배열이면 prompts에서 "" 반환 → 기존 동작 100% 보존.
    const _storeFacts = (req.storeProfileView && req.storeProfileView.promptBody) || [];
    const richPrompt = buildDentalPrompt(sec.key, treatmentData, region, { mode: validMode, familyId: chosenFamilyId, storeFacts: _storeFacts });
    const prevBlock  = prevTextRaw
      ? `\n[지금까지 작성된 내용 — 표현 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n`
      : "";

    // [v3.6] scene 주입 — personal 모드 + hard 섹션만
    const sceneInject = (validMode === "personal" && SECTION_SCENE_MAP_DENTAL[sec.key])
      ? (photoCtx ? buildDentalPhotoBlock(sec.key, photoCtx) : "") + buildDentalSceneBlock(sec.key)
      : "";

    const userPrompt = `업종: dental | 키워드: ${subKw} | 지역: ${region} | 모드: ${validMode}
${prevBlock}
---
[현재 섹션: ${sec.label} (${sec.key})]
⚠️ 이 섹션만 작성. 성형외과·피부과 표현 금지. 200자 이상.
${richPrompt}
${sceneInject}`;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanDentalText(secText, subKw, region, validMode);
    secText = stripInlineImages(secText);
    // [v104] restoreKeyword 호출 제거 — 공통 모듈의 조사단독(이/가/은/는/보다…) 앞
    //   치료명 무조건 삽입 로직이 받침·문맥·조사적합성 무판단으로 비문 양산
    //   ('신경치료가 두 가지 방법은' / '신경치료보다 명확한 정보' 등 근원).
    //   dental은 프롬프트 치료명 5회+ 강제 + injectKeywordDensity(문장단위)로
    //   키워드 충분 → restoreKeyword 불필요. 모듈 무수정, dental 호출만 차단.
    // secText = restoreKeyword(secText, subKw);  ← 의도적 비활성 (v104)

    if (calcCharCount(secText) < 100) {
      console.log(`[dental] ${sec.label}: 빈 섹션 → 재생성`);
      let retry = await generateSection({
        systemPrompt,
        userPrompt: `${userPrompt}\n\n[중요] 반드시 200자 이상 실제 내용으로 작성.`,
        temperature: 0.72,
      });
      retry = cleanDentalText(retry, subKw, region, validMode);
      retry = stripInlineImages(retry);
      // [v104] restoreKeyword 호출 제거 (위 1차와 동일 사유)
      // retry = restoreKeyword(retry, subKw);  ← 의도적 비활성 (v104)
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }

    console.log(`[dental] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
  }

  // ── 이미지 ALT ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 치료 / 보철 / 일상
  const DENTAL_ALT_POOL = ["검사 사진", "상담 사진", "치료 사진", "보철 사진", "일상 사진"];
  const _DENTAL_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "검사 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "치료 사진",
    result:   "보철 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _DENTAL_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (mode 분기) ─────────────────────────
  let title = overrideTitle || buildDentalTitle(subKw, region, seoData, blogTypeId, validMode, chosenTitleIdx);
  const DENTAL_TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|써마지|필러|보톡스|피코레이저|성형외과/;
  if (DENTAL_TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 상담 전 꼭 확인해야 할 5가지`
      : `${region} ${subKw} 후기｜두려워서 미루다가 결국 결정한 이야기`;
  }
  if (!title.includes(subKw)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 상담 전 꼭 확인해야 할 5가지`
      : `${region} ${subKw} 후기｜상담부터 치료까지 솔직하게 정리했습니다`;
  }

  // ── 조립 ────────────────────────────────────────────
  const secKeys = SECTIONS.map(s => s.key);

  // ── INFO_BLOCKS 삽입 (결정 섹션 아래) ─────────────
  const infoBlock = getInfoBlock(treatmentId);
  const infoBlockText = renderInfoBlock(infoBlock);
  if (sectionTexts["reason"]) {
    sectionTexts["reason"] = sectionTexts["reason"].trimEnd() + infoBlockText;
  } else if (sectionTexts["result"]) {
    sectionTexts["result"] = infoBlockText + "\n\n" + sectionTexts["result"];
  }

  // ── 회복 타임라인 (personal만) ────────────────────
  if (sectionTexts["result"]) {
    sectionTexts["result"] = insertDentalTimeline(sectionTexts["result"], subKw, validMode);
  }

  // ── 마무리 섹션 (mode 분기) ─────────────────────
  //   v3.5: 결론 강화 — "추천합니다" 감정 → "판단 기준" 정보형
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    if (validMode === "commercial") {
      const commercialCTAs = [
        `\n\n${subKw}에 대한 정보는 일반적인 안내일 뿐, 개인의 구강 상태에 따라 적용은 달라질 수 있습니다. 정확한 진단과 치료 방향은 의료진과 직접 상담하여 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${subKw} 진료에 대한 일반 정보 안내입니다. 적합 여부·회복 경과는 개인차가 있으므로, ${region} 내 치과에서 충분한 상담 후 결정하시는 것이 좋습니다.`,
        `\n\n${subKw} 관련 일반 정보를 정리한 내용입니다. 본인 상태에 맞는 치료 방법은 치과 진료 후 안내받는 것이 권장되며, 궁금한 부분은 상담 시 직접 문의해보시기 바랍니다.`,
      ];
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
    } else {
      // personal v3.5: 추천 대상 + 판단 기준(객관적) + 짧은 정보형 마무리
      const recList = DENTAL_REC_MAP[subKw] || [];
      const recBlock = recList.length > 0
        ? `\n\n**이런 경우에 고려해볼 만해요**\n${recList.map(r => `- ${r}`).join("\n")}`
        : "";

      const decisionList = getDecisionCriteria(subKw);
      const decisionBlock = `\n\n**${region}에서 ${subKw} 병원 고를 때 본 판단 기준**\n${decisionList.map(d => `- ${d}`).join("\n")}`;

      const closing = `\n\n${region} ${subKw} 자체보다 위 4가지를 더 비중 있게 봤어요. 같은 ${subKw}이라도 어느 곳에서 받느냐로 사후 관리 만족도가 갈리더라고요.`;

      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + recBlock
        + decisionBlock
        + closing;
    }
  }

  let assembled = `# ${title}\n\n`;
  secKeys.forEach((key, i) => {
    const secContent = sectionTexts[key] || "";
    if (calcCharCount(secContent) < 50) return;
    assembled += secContent + "\n\n";
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + "\n\n";
  });
  assembled = assembled.replace(/\n{3,}/g, "\n\n").trim();
  assembled = removeDuplicateSentences(assembled);

  // [v104] speakerIntro(인사말) 중복 제거 — GPT가 섹션마다 '도입 첫 문장 고정'
  //   지시를 따라 매 섹션 앞에 인사말을 반복 삽입(5회+). 병원 블로그도
  //   글당 1회면 충분. 첫 등장만 남기고 이후 전부 제거.
  {
    const introEsc = speakerIntro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let introSeen = 0;
    assembled = assembled.replace(new RegExp(introEsc, "g"), (m) => {
      introSeen++;
      return introSeen === 1 ? m : "";
    });
    // 인사말이 제거되며 남은 줄 앞 공백·빈줄 정리
    assembled = assembled.replace(/\n{3,}/g, "\n\n").replace(/^[ \t]+/gm, "");
  }

  // [v106] 면책문구(개인 구강 상태…) 반복 제거 — speakerIntro와 동일 패턴.
  //   GPT가 섹션마다 "개인 (의) 구강 상태에 따라 다를/달라질 수 있습니다"를
  //   5~8회 반복 삽입 → AI 흔적의 최대 원인. 첫 등장 1문장만 남기고 이후 제거.
  //   변형(다를/달라질, 개인/개인의)을 단일 정규식으로 포착.
  //   [v107] '따라'와 '다를' 사이 삽입어구 허용 — "따라 치료의 필요성과 방법은 다를",
  //          "따라 적용은 달라질" 등. [^.!?\n]{0,24}? 로 같은 문장 내 삽입만 비탐욕 포착.
  //   ⚠️ 마무리 면책 문구(closing)는 'subKw에 대한 정보는…' 형태로 표현이 달라
  //      이 패턴에 안 걸림 → closing 면책은 보존됨(의도).
  {
    let disclaimerSeen = 0;
    assembled = assembled.replace(
      /\s*(?:하지만,?\s*)?개인(?:의)?\s*구강\s*상태에?\s*따라\s*[^.!?\n]{0,24}?(?:다를|달라질)\s*수\s*있(?:으며|으므로|습니다)[^.!?\n]*[.!?]/g,
      (m) => {
        disclaimerSeen++;
        return disclaimerSeen === 1 ? m : "";
      }
    );
    // 면책문구 제거 후 남은 공백·빈줄 정리
    assembled = assembled.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/gm, "");
  }

  // [v107] '이 정보는' 등 문장 미완결 절단 제거 — 섹션 끝 GPT 토큰 잘림.
  //   '이 정보는'에서 끝나면 술어 없는 미완결 → 줄/문단 끝이면 통째 제거.
  //   (closing 면책 문장은 '…정리한 내용입니다.'로 완결되므로 안 걸림)
  {
    assembled = assembled
      // 줄 끝/문단 끝에 '이 정보는'(+공백)만 덜렁 남은 절단 → 제거
      .replace(/(^|\n)\s*이\s*정보는\s*(?=\n|$)/g, "$1")
      // 마침표 뒤 '이 정보는'으로 문장 시작했다 끊긴 경우(같은 줄 끝)
      .replace(/([.!?])\s*이\s*정보는\s*$/gm, "$1")
      .replace(/\n{3,}/g, "\n\n");
  }

  // [v108] 문장 충돌 — '…은/는 이 정보는 [진단/치료/일반]…' 접합 분리.
  //   GPT가 앞 문장(미완결 주어 '~시간은')을 술어 없이 끊고 뒤 면책문장을
  //   접합해버린 케이스. 앞 미완결 주어부를 닫고 '이 정보는…'을 정상 문장으로 분리.
  //   예) "회복 과정과 시간은 이 정보는 진단 및 치료를 대체하지 않으며…"
  //     → "회복 과정과 시간은 개인차가 있습니다. 정확한 사항은 …" (뒤 면책 보존)
  assembled = assembled
    .replace(
      /([가-힣]{1,12}[은는])\s*이\s*정보는\s*(진단|치료|일반)[^.!?\n]*?(?:대체하지\s*않으며|대체하지\s*않습니다)[,\s]*/g,
      "$1 개인차가 있습니다. "
    )
    // 위에서 안 걸린 잔여 '~은/는 이 정보는' 접합(뒤 표현 변형) → 앞 주어부 닫고 분리
    .replace(
      /([가-힣]{1,12}[은는])\s*이\s*정보는\s+/g,
      "$1 개인차가 있습니다. 이 정보는 "
    );

  // [v108] '데 큰.' / '데 큰' 종결 절단 → '데 큰 도움이 됩니다.' 보강.
  //   '높이는 데 큰.'처럼 관형어 '큰' 뒤 명사+술어 누락. (정상 '데 큰 도움이' 보존)
  assembled = assembled
    .replace(/(높이는|주는|되는|있는|하는)\s*데\s*큰\s*\.(\s|$)/g, "$1 데 큰 도움이 됩니다.$2")
    .replace(/(높이는|주는|되는|있는|하는)\s*데\s*큰(\s*\n|\s*$)/g, "$1 데 큰 도움이 됩니다.$2");

  // ── v3.5: 키워드 밀도 보정 (해시태그 추가 전, cleanText 전) ──
  if (validMode === "personal") {
    const fullKeyword = `${region} ${subKw}`;
    assembled = injectKeywordDensity(assembled, fullKeyword, subKw, region);
  }

  assembled += "\n\n" + buildDentalHashtags(subKw, region, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  assembled = cleanDentalText(assembled, subKw, region, validMode);
  // commercial 모드는 2회 통과
  if (validMode === "commercial") {
    assembled = cleanDentalText(assembled, subKw, region, validMode);
  }

  // ── [v3.6] light scene engine 후처리 (personal만) ──
  if (validMode === "personal") {
    assembled = finalDentalClean(assembled, subKw, region);
  }

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 치료 / 보철 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|치료|보철|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|엑스레이|X.?ray|CT|파노라마|영상|진단/i.test(s)) return "[이미지: 검사 사진]";
    if (/보철|크라운|임플란트\s*보철|틀니|라미네이트|세라믹/.test(s)) return "[이미지: 보철 사진]";
    if (/치료|시술|발치|신경치료|충치|스케일링|교정|식립/.test(s)) return "[이미지: 치료 사진]";
    if (/상담|진료|설명|차트|원장|의사|치과/.test(s))         return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|치료|보철|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC ──────────────────────────────────────────
  const fullKeywordForQC = `${region} ${subKw}`;
  const qc = runQC(assembled, subKw, validMode, fullKeywordForQC);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, subKw);
  console.log(`[dental] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  // [v3.6] light scene engine QC ────────────────────
  if (validMode === "personal") {
    const sceneEngineMode = photoCtx ? "PHOTO_BLOCK + SCENE_POOL" : "SCENE_POOL fallback";
    console.log(`[QC] scene engine: ${sceneEngineMode}`);

    // 감성 ending 잔존 카운트 (finalDentalClean 통과 후)
    const sentimentResidualPatterns = [
      /환한\s*미소/g, /자신감\s*있게\s*웃/g, /새로운\s*(일상|삶|시작)/g,
      /삶의\s*질이/g, /활짝\s*웃\w*\s*있/g,
      /생활(의|이)?\s*질이?\s*(높아|좋아)/g,
      /믿음이?\s*갔/g, /옳았다는?\s*생각/g,
      // v3.6.2
      /좋은\s*선택이었/g, /모든\s*게\s*해결/g, /모든\s*것이?\s*해결/g,
      /더\s*이상\s*불편함을?\s*(느끼지|받지)\s*않/g,
      // v3.6.3
      /확신이\s*들었죠/g, /확신이\s*생겼/g,
      /받기를\s*잘했다는?\s*생각/g, /잘했다는?\s*생각이?\s*들었/g,
      /훨씬\s*편해졌/g,
      /큰\s*도움을?\s*받을\s*수\s*있(을|는)\s*거(예|에)요/g,
      /큰\s*도움이?\s*될\s*거(예|에)요/g,
    ];
    let sentimentResidual = 0;
    sentimentResidualPatterns.forEach(rx => {
      const m = assembled.match(rx);
      if (m) sentimentResidual += m.length;
    });
    console.log(`[QC] 감성ending 잔존: ${sentimentResidual}`);
    if (sentimentResidual > 0) console.warn(`[dental] ⚠️ 감성ending ${sentimentResidual}건 잔존 — blacklist 보강 필요`);

    // 공포 연출 잔존 카운트
    const fearPatterns = [
      /끔찍한\s*통증/g, /참기\s*힘들\w*\s*통증/g, /드릴/g, /마취\s*바늘/g,
      /소리만\s*들어도\s*무서/g, /기구가?\s*다가\w*\s*때/g,
    ];
    let fearResidual = 0;
    fearPatterns.forEach(rx => {
      const m = assembled.match(rx);
      if (m) fearResidual += m.length;
    });
    console.log(`[QC] 공포연출 잔존: ${fearResidual}`);
    if (fearResidual > 0) console.warn(`[dental] ⚠️ 공포연출 ${fearResidual}건 잔존 — 즉시 점검 필요`);
  }

  // v3.5 경고
  if (qc.tongheCount > 4) console.warn(`[dental] ⚠️ "통해" ${qc.tongheCount}회 — AI 패턴 위험`);
  if (validMode === "personal" && qc.fullKwCount < 2) console.warn(`[dental] ⚠️ "${fullKeywordForQC}" 노출 ${qc.fullKwCount}회 — 키워드 밀도 부족`);

  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[dental] ⚠️ commercial 모드 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[dental] ⚠️ commercial 모드 가격 ${qc.priceCount}건 잔존`);
  }

  // [meta-relay] family/진단 메타를 저장 파이프라인에 흘려보냄 (narrative 무수정 — 측정 기반 확보용)
  //   - familyId: 제목↔본문 동기화에 쓰인 family. 사후 분포·회귀율 조사용.
  //   - diagResult: qc 세부 + family 메타. savePost가 qc_detail JSON에 보존(스키마 변경 없음).
  const diagResult = {
    seoScore,
    qc,
    familyId:    chosenFamilyId,
    titleIdx:    chosenTitleIdx,
    treatmentId,
    mode:        validMode,
  };
  await autoSave({ assembled, charCount, subKw, region, seoScore, industry, storeId, familyId: chosenFamilyId, diagResult });

  // ── 이미지 메타 ─────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

  // [v-loc] LocationBlock 후단 주입 — clean 완료 후라 주소 변형 0. 해시태그 위에 배치.
  //   주소 없으면 원문 그대로. assembledMarkdown/Plain 둘 다 위치블록 포함.
  assembled = insertLocationBeforeHashtags(assembled, locStore);

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const assembledMarkdown = assembled;                         // 마크다운 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled);  // 네이버 복사용 평문
  const charCountPlain    = calcCharCount(assembledPlain);

  return res.status(200).json({
    success: true,
    text: assembledPlain,
    textMarkdown: assembledMarkdown,
    hashtags: hashtagsArr,
    images, charCount: charCountPlain, seoScore,
    mode: validMode,
    qc: {
      hasInfoBlock: qc.hasInfoBlock,
      hasExamValue: qc.hasExamValue,
      kwCount: qc.kwCount,
      firstPersonCount: qc.firstPersonCount,
      priceCount: qc.priceCount,
      certaintyCount: qc.certaintyCount,
      recommendCount: qc.recommendCount,
      reviewFlowCount: qc.reviewFlowCount,
      tongheCount: qc.tongheCount,
      fullKwCount: qc.fullKwCount,
    },
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
    publishGate: (() => {
      // 주체 불명 발행 차단(§56①). 생성은 {병원명} placeholder 허용, 발행은 publish/발행코치가 차단.
      const ok = !!storeName && !/^(○+치과|\{병원명\})$/.test(storeName);
      return { storeNameOk: ok, storeName, reason: ok ? null : "store_name 실값 필요(주체 불명 발행 차단)" };
    })(),
  });
}
