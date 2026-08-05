// ============================================================
// generateClinic.js — 성형외과/피부과 블로그 생성기 v3.5 (네이버 평문 패치)
//
// ★ v3.5 (v2 패치) 변경사항 — 2026.05 (pain v3.6 동기화)
//   ① stripMarkdownForNaver() 추가
//      → #/##/### 마크다운 헤더를 네이버 복사용 평문으로 변환
//      → ###(변화 1일/1주) → ▶ 마커로 치환
//   ② 응답에 text(평문) + textMarkdown(원본) dual 필드
//   ※ region escape 패치는 spreadXxxRegionKw 함수 없어 불필요
//
// 변경사항 (v3.4) — 마지막 다듬기 (수원 v3.3 → 95점):
//   ① [X] 대체어 임계 5→3회 — '이 시술' 노출률 감소
//   ② [V2]⑥ 화이트리스트 확장 — 부분/두 가지/덕분/때문 추가
//      "{시술명}이 + 명사/덕분/때문" 직접 패턴 신설
//   ③ "이 시술은 + 매몰법은" 주격 중복 차단
//   ④ [Y2] 어미 다양화 임계 4→3
//
// 변경사항 (v3.3) — 마지막 1개:
//   ① 대체어 풀에서 '그 방법'/'이 방법' 제거
//   ② 헤더 정규화 신설
//   ③ [Y2] 어미 다양화 신설
//
// 변경사항 (v3.2) — "자르지 말고 고쳐라":
//   ① v3.1 패턴 '삭제' → '재작성' 전환
//   ② [Y] 어근 제한 완전 제거
//   ③ [B3] 잔해 청소 신설
//   ④ [B] 문장 종결 검증 관대화
//
// 변경사항 (v3.0~v3.1):
//   ① [X] 치환 총량 제한 / [X-Min] 시술명 최소 5회 보장
//   ② "눈이 진 느낌" / "유지된다고" 비문 차단
//   ③ "고려해보세요" CTA 차단
//
// 변경사항 (v2.5~v2.9):
//   ① "이 시술 시술" 비문 차단 / 빈자리 복구 / CTA 제거
//   ② [B] 문장 종결 검증 / [B2] 애매 문장 검출
//   ③ 자연스러움 복구 (시술명 노출률 증가)
//
// 이전 변경사항 (v2.0~v2.4):
//   • mode 분기 / INFO_BLOCKS / EXAM_VALUES / QC 로그
// ============================================================
import { ALL_TREATMENTS as CLINIC_TREATMENTS, CLINIC_TARGETS, CLINIC_BLOG_TYPES } from "../../lib/clinic-data";
import { buildSystemPrompt  as clinicSystem,
         buildSectionPrompt as clinicSection,
         getClinicDirection }                    from "../../lib/clinic-prompts";
import { buildClinicFlowBlock, CLINIC_SECTIONS } from "../../lib/clinic-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  autoSave,
} from "./generateUtils";
// 🛡️ 과별 침투 차단 (v1.0) — 16개 업종 정체성 토큰 자동 차단
import { getCrossBlocks } from "../../lib/industryBlocks";

// ============================================================
// 0. 금지 키워드 (FORBIDDEN) — AI 냄새 + 광고성 + 타 진료과
// ============================================================
const CLINIC_FORBIDDEN_BASE = [
  // 광고성
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "완전 대박", "인생 시술", "후회 제로", "강력 추천", "베스트",
  // AI 투
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "해당 시술", "이 방법",
  // ⚠️ "이 시술이/을/은"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 시술을 통해" → " 통해" / "이 시술의 필요" → 문장 와해
  //    → 헤더 정규화(아래)에서 시술명으로 치환 + 본문 정규화 블록에서 안전 보정 처리
  "기준으로 살펴본", "관리 방법과 생활 속", "예방 전략",
  "체계적인 접근", "알아두면 좋은",
  // 지역 하드코딩 방지
  "강남자연유착", "눈성형강남", "강남리프팅", "강남피코레이저",
  "강남 못지않게", "강남쪽도", "강남 유명",
  // 치과·한의원 침투 차단
  "임플란트", "스케일링", "신경치료", "사랑니", "크라운", "치석", "잇몸치료", "치주",
  "추나", "한약", "뜸", "부항",
];

// AI 냄새 — personal·commercial 양쪽 모두 제거
const CLINIC_FORBIDDEN_AI = [
  "드디어 결심하고", "결국 선택하게 되었어요", "마침내", "비로소",
  "마음이 편안해졌어요", "믿음이 갔어요", "친절하고 전문적이셔서",
  "따뜻한 분위기", "차분하고 따뜻한", "안정감 있는 분위기",
  "미소를 되찾았어요", "자신감을 찾았어요", "새로운 삶",
];

// commercial 전용 추가 금지 — 광고법 위반 직격
const CLINIC_FORBIDDEN_COMMERCIAL = [
  // ── 1인칭 시점 (전 종류) ──
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
//   - clinic 자기 키워드 + EXEMPTIONS는 자동 면제
//   ⚠️ 새 업종 추가 시 lib/industryBlocks.js 만 수정
// ============================================================
const CLINIC_CROSS_BLOCK = getCrossBlocks("clinic");

// ============================================================
// 1. INFO_BLOCKS — 결정 섹션 아래 자동 삽입 (체류시간↑)
//    매뉴얼 PART 2-1 핵심
// ============================================================
const INFO_BLOCKS = {
  // ── 눈성형 ──
  natural_double: {
    title: "쌍꺼풀 수술 방법별 일반 비교",
    rows: [
      ["항목", "매몰법", "자연유착", "절개법"],
      ["흉터", "거의 없음", "최소", "약간"],
      ["회복 기간", "3~5일", "5~7일", "1~2주"],
      ["라인 지속", "단기~중기", "중기~장기", "영구적"],
      ["적합 케이스", "라인 변화 적은 분", "자연스러움 원하는 분", "확실한 변화 원하는 분"],
    ],
  },
  sili_lifting: {
    title: "리프팅 시술 일반 비교",
    rows: [
      ["항목", "실리프팅", "울쎄라", "써마지"],
      ["방식", "실 삽입", "초음파", "고주파"],
      ["효과 시점", "즉각", "2~3개월 후", "3~6개월 후"],
      ["다운타임", "3~7일", "거의 없음", "거의 없음"],
      ["유지 기간", "1~2년", "1년", "1~2년"],
    ],
  },
  pico_laser: {
    title: "색소 레이저 일반 비교",
    rows: [
      ["항목", "피코레이저", "레이저토닝", "IPL"],
      ["타겟", "기미·잡티·문신", "기미·전반적 톤", "홍조·잡티"],
      ["회차", "3~5회", "5~10회", "3~5회"],
      ["다운타임", "거의 없음", "없음", "거의 없음"],
      ["적합 케이스", "확실한 변화", "점진적 개선", "복합 고민"],
    ],
  },
  ulthera: {
    title: "안티에이징 시술 일반 비교",
    rows: [
      ["항목", "울쎄라", "슈링크", "써마지"],
      ["층", "SMAS 근막", "SMAS·진피", "진피"],
      ["효과", "리프팅 강함", "리프팅 중간", "탄력 개선"],
      ["통증", "있음", "보통", "약함"],
      ["적합 케이스", "확실한 리프팅", "비용 효율", "탄력·결 개선"],
    ],
  },
  filler: {
    title: "필러·보톡스 일반 비교",
    rows: [
      ["항목", "필러", "보톡스"],
      ["효과", "볼륨·라인 채움", "근육 이완·주름 완화"],
      ["부위", "팔자·이마·코·턱", "사각턱·이마·눈가"],
      ["유지 기간", "6~18개월", "3~6개월"],
      ["적합 케이스", "꺼진 부위 보충", "표정 주름 완화"],
    ],
  },
  // 기본 (모든 시술 공통 폴백)
  default: {
    title: "성형외과 시술 검토 시 일반 안내",
    rows: [
      ["확인 항목", "내용"],
      ["전문의 자격", "성형외과·피부과 전문의 여부 확인"],
      ["상담 충실도", "충분한 상담 시간 제공 여부"],
      ["사후 관리", "회복 기간 중 케어 프로그램 여부"],
      ["회복 기간", "시술별 일반 회복 기간 안내 받기"],
      ["주의 사항", "개인 컨디션·체질 따라 차이 있음"],
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
// 2. EXAM_VALUES — 수치 강제 삽입 (personal 전용)
// ============================================================
const EXAM_VALUES = {
  natural_double: {
    duration:  "보통 30~60분",
    recovery:  "3~7일 후 일상 복귀, 2주 후 자연스러워짐",
    pain:      "마취 후 통증 거의 없음, 통증점수 1~2점",
  },
  sili_lifting: {
    duration:  "30분 내외",
    recovery:  "다운타임 3~7일",
    pain:      "통증점수 2~3점, 멍·붓기 1~2주",
  },
  pico_laser: {
    duration:  "15~30분",
    recovery:  "당일 일상 복귀 가능",
    pain:      "통증점수 2~3점, 일시적 붉음증",
  },
  ulthera: {
    duration:  "30~60분",
    recovery:  "다운타임 거의 없음",
    pain:      "통증점수 4~5점, 효과 2~3개월 후 체감",
  },
  default: {
    duration:  "시술별 상이, 보통 30분~2시간",
    recovery:  "회복 기간은 시술·개인차 따라 다름",
    pain:      "통증은 마취·시술 방식에 따라 차이 있음",
  },
};

function getExamValues(treatmentId) {
  return EXAM_VALUES[treatmentId] || EXAM_VALUES.default;
}

// ============================================================
// 3. 제목 생성 (mode 분기)
// ============================================================
function buildClinicTitle(treatmentName, region, seoData, blogTypeId, mode) {
  // commercial: 정보형 제목
  if (mode === "commercial") {
    const direction = getClinicDirection(seoData?.id || "");
    const defaults = [
      `${region} ${treatmentName} 진료 안내｜시술 종류와 일반 정보 정리`,
      `${region} ${treatmentName} 정보 가이드｜시술 검토 시 확인할 항목`,
      `${region} ${treatmentName} 진료 정보｜${direction.keyword} 일반 안내`,
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  // personal: 기존 후기 톤
  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    return raw.replace(/\{region\}/g, region);
  }
  if (blogTypeId === "compare") {
    const cw = seoData?.compareWith?.[0]?.method || "다른 시술";
    return [
      `${region} ${treatmentName} vs ${cw} 비교｜직접 상담 후 선택한 이유`,
      `${region} ${treatmentName}｜${cw} 고민하다 결정한 이유`,
    ][Math.floor(Math.random() * 2)];
  }
  if (blogTypeId === "consult") {
    return `${region} ${treatmentName} 상담 후기｜처음 받으러 가기 전에 알았으면 좋았을 것들`;
  }
  const defaults = [
    `${region} ${treatmentName} 후기｜상담부터 결과까지 솔직하게 정리했습니다`,
    `${treatmentName} 고민 3개월｜${region}에서 받고 나서 드는 생각`,
    `${region} ${treatmentName}｜티 안 나게 하고 싶었던 이유`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================================
// 4. 해시태그 (mode 분기)
// ============================================================
function buildClinicHashtags(treatmentName, region, mode) {
  const kw = treatmentName.replace(/\s/g, "");
  if (mode === "commercial") {
    return [
      `#${region}${kw}`, `#${kw}정보`, `#${kw}안내`,
      `#${kw}`, `#${region}성형외과`, `#${region}피부과`,
      `#성형외과정보`, `#${region}진료안내`,
    ].slice(0, 8).join(" ");
  }
  return [
    `#${region}${kw}`, `#${kw}후기`, `#${kw}상담`,
    `#${kw}`, `#${region}성형외과`, `#성형외과후기`,
    `#${region}후기`, `#피부과후기`,
  ].slice(0, 10).join(" ");
}

// ============================================================
// 5. 본문 정제 (mode 분기 — commercial은 광고법 자동 제거 + 정보형 변환)
// ============================================================
function cleanClinicText(text, treatmentName, region, mode = "personal") {
  let result = text;

  // 공통: 기본 + AI 냄새 금지어
  const removeList = [...CLINIC_FORBIDDEN_BASE, ...CLINIC_FORBIDDEN_AI, ...CLINIC_CROSS_BLOCK];

  // commercial: 광고법 위반 표현 추가 제거
  if (mode === "commercial") {
    removeList.push(...CLINIC_FORBIDDEN_COMMERCIAL);
  }

  removeList.forEach(w => {
    result = result.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  });

  // 조사 오류 교정 (시술명 + 잘못된 조사)
  result = result
    .replace(/쌍꺼풀는/g, "쌍꺼풀은")
    .replace(/레이저토닝를/g, "레이저토닝을")
    .replace(/실리프팅를/g, "실리프팅을")
    .replace(/리프팅를/g, "리프팅을")
    .replace(/토닝를/g, "토닝을")
    .replace(/흡입를/g, "흡입을");

  // ─────────────────────────────────────────────────────
  // [헤더 정규화 v3.3 신설] 헤더 안 '그 방법'/'이 방법' → 시술명
  //   원인: GPT가 "## 인천에서 그 방법 상담 흐름" 같이 헤더에 어색한 지시어 사용
  //   처리: H1~H6 헤더에서 '그 방법'/'이 방법'/'이 시술'을 시술명으로 강제
  //         → SEO 키워드 노출 증가 + 헤더 자연스러움
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    if (/^#{1,6}\s/.test(line)) {
      return line
        .replace(/그\s*방법을/g, `${treatmentName}을`)
        .replace(/그\s*방법이/g, `${treatmentName}이`)
        .replace(/그\s*방법은/g, `${treatmentName}은`)
        .replace(/그\s*방법에/g, `${treatmentName}에`)
        .replace(/그\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*방법을/g, `${treatmentName}을`)
        .replace(/이\s*방법이/g, `${treatmentName}이`)
        .replace(/이\s*방법은/g, `${treatmentName}은`)
        .replace(/이\s*방법에/g, `${treatmentName}에`)
        .replace(/이\s*방법\s+/g, `${treatmentName} `)
        .replace(/이\s*시술을/g, `${treatmentName}을`)
        .replace(/이\s*시술이/g, `${treatmentName}이`)
        .replace(/이\s*시술은/g, `${treatmentName}은`)
        .replace(/이\s*시술의/g, `${treatmentName}의`)
        .replace(/이\s*시술에/g, `${treatmentName}에`)
        .replace(/이\s*시술과/g, `${treatmentName}과`)
        .replace(/이\s*시술\s+/g, `${treatmentName} `);
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [본문 정규화] FORBIDDEN 목록에서 제거된 "이 시술이/을/은" 보정
  //   - 본문에 GPT가 직접 출력한 "이 시술을 통해" 같은 표현은 자연스럽게 둠
  //   - 단, 조사 깨짐 패턴(아래 참조)만 안전하게 보정
  //   ⚠️ 이 블록 제거 금지 — FORBIDDEN_BASE에서 조사어 빠진 이유와 짝
  // ─────────────────────────────────────────────────────
  {
    const tnEscEarly = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      // "이 시술은" 잘못된 조사 → "이 시술은" (그대로 유지, 별도 케이스만 보정)
      // 단독 " 통해" (앞에 공백, 문장 시작) — "이 시술을" 또는 비슷한 주어가 사라진 경우 복구
      .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 시술을 통해 ")
      // "이 시술의 필요" / "이 시술의 진행" / "이 시술의 결정" — 잘못된 조사
      .replace(/이\s*시술의\s+(필요|진행|시작|결정|중요)합니다/g, "이 시술이 $1합니다")
      .replace(/이\s*시술의\s+(필요|진행|시작|결정|중요)해요/g,   "이 시술이 $1해요")
      // "{시술명}이 과정/단계/시간/결과" → "{시술명}의 ~"
      .replace(new RegExp(`${tnEscEarly}이\\s+(과정|단계|시간|결과|이후|이전)`, "g"), `${treatmentName}의 $1`)
      // 이중 "통해 통해"
      .replace(/통해\s+통해/g, "통해")
      // ── 톤 약화 (병원 안전 표현으로) ──
      .replace(/추천드리고 싶어요/g,  "고려해볼 수 있어요")
      .replace(/추천드립니다/g,        "고려해볼 수 있어요")
      .replace(/적극 추천/g,           "괜찮은 선택")
      .replace(/강력 추천/g,           "괜찮은 선택")
      .replace(/적절하게 짧아서/g,     "짧아서")
      .replace(/적절하게 길어서/g,     "여유 있게")
      // 두 문장 합쳐진 어색한 패턴
      .replace(/고려해보는 것도\s+덕분에/g, "고려해볼 수 있어요. 덕분에")
      .replace(/고려하는 것도\s+덕분에/g,   "고려해볼 수 있어요. 덕분에");
  }

  // ─────────────────────────────────────────────────────
  // commercial 모드: 강제 정보형 변환 ★
  // ─────────────────────────────────────────────────────
  if (mode === "commercial") {
    // [1] 가격 패턴 자동 치환
    result = result.replace(/회당\s*\d+\s*만원[^\s.,!?]*/g, "회당 비용은 병원 안내 참고");
    result = result.replace(/약\s*\d+\s*만원[^\s.,!?]*/g, "비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*정도/g, "비용은 병원 안내 참고");
    result = result.replace(/한 달에\s*약\s*\d+\s*만원/g, "월 비용은 병원 안내 참고");
    result = result.replace(/총\s*\d+\s*만원/g, "총 비용은 병원 안내 참고");
    result = result.replace(/\d+\s*만원\s*대?/g, "비용은 병원 안내 참고");

    // [2] 1인칭 잔존 정리 (단어 단위)
    result = result.replace(/(?:^|[\s,.])저는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])제가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])내가\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])나는\s+/g, " ");
    result = result.replace(/(?:^|[\s,.])저도\s+/g, " ");

    // [3] 후기형 동사 → 정보형 동사로 자동 변환
    const verbConversion = [
      // 효과 단정
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
      // 단정 부사
      [/확실히\s+/g,    "일반적으로 "],
      [/분명히\s+/g,    "일반적으로 "],
      [/100%\s*/g,      "일반적으로 "],
      [/완치(되었|됐|돼)/g, "회복되었"],
      [/반드시\s+/g,    "일반적으로 "],
      // 추천·유도
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
      // 의료진 평가
      [/원장님이 친절하/g,   "상담 시 일반적으로 안내가 진행되"],
      [/친절하셨어요/g,      "안내가 진행되었습니다"],
      [/친절하셨고/g,        "안내가 진행되었고"],
      [/설명이 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/설명도 좋았어요/g,   "일반적인 설명이 안내되었습니다"],
      [/잘 설명해 주셨어요/g, "상세히 안내가 진행되었습니다"],
      // 1인칭 동사 후행
      [/받아봤어요/g,        "진료가 진행됩니다"],
      [/받았어요/g,          "진료가 진행됩니다"],
      [/받았더니/g,          "진료 후"],
      [/맞아봤어요/g,        "시술이 진행됩니다"],
      [/맞았어요/g,          "시술이 진행됩니다"],
      [/느꼈어요/g,          "안내됩니다"],
      [/느꼈다/g,            "안내됩니다"],
      [/느껴졌다/g,          "안내됩니다"],
      [/결심했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/결정했어요/g,        "진료를 검토하는 경우가 많습니다"],
      [/고민했어요/g,        "고민하는 경우가 많습니다"],
      [/고민하다가/g,        "고민하는 경우"],
    ];
    verbConversion.forEach(([from, to]) => {
      result = result.replace(from, to);
    });

    // [4] 후기형 어미 → 안내형 어미 (보수적 변환)
    result = result.replace(/받았다\b/g, "진행된다");
    result = result.replace(/받았습니다\b/g, "진행됩니다");
  }

  // ─────────────────────────────────────────────────────
  // [공통 보정 v2.5] — personal·commercial 모두 적용
  // ─────────────────────────────────────────────────────

  const tnEsc = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // [V] 시술명 빈자리 복구 — GPT 누락으로 생긴 이중공백 자리에 "이 시술" 보충
  //     v2.5: 패턴 확장 (만들어 줄 / 알아보던 등)
  result = result.replace(/에서\s{2,}받/g, "에서 이 시술을 받");
  result = result.replace(/에서\s{2,}선택/g, "에서 이 시술을 선택");
  result = result.replace(/에서\s{2,}결정/g, "에서 이 시술을 결정");
  result = result.replace(/에서\s{2,}고려/g, "에서 이 시술을 고려");
  result = result.replace(/에서\s{2,}매몰/g, "에서 이 시술은 매몰");
  result = result.replace(/에서\s{2,}알아보/g, "에서 이 시술을 알아보");
  result = result.replace(/에서\s{2,}찾/g, "에서 이 시술을 찾");
  // 문장 시작 직후의 빈자리
  result = result.replace(/([.!?])\s{2,}(받기로|받고|받는|받았)/g, "$1 이 시술을 $2");
  result = result.replace(/([.!?])\s{2,}(매몰법|절개법)/g, "$1 이 시술은 $2");
  // v2.5 신설: "만들어 줄 방법", "고려해 줄" 등 키워드 누락 패턴
  result = result.replace(/(^|[\s.!?,])(을|를)\s+(만들어|찾던|알아보던|고려하던)/g, "$1 이 시술을 $3");
  // 줄 시작 깨진 조사 제거 — 단, "이 시술/이 병원/이 방법" 등 지시어는 보호
  result = result.replace(/^\s*(을|를|가|은|는|에서|으로|로)\s+/gm, "");
  result = result.replace(/^\s*이\s+(?!시술|병원|방법|치료|진료|곳|집|쪽|분야|업종)/gm, "");

  // [W] 조사 깨짐 보정 — "쌍꺼풀이 시술로/시술에/시술은/시술을"
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술로`, "g"), `${treatmentName} 시술로`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술에`, "g"), `${treatmentName} 시술에`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술은`, "g"), `${treatmentName} 시술은`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술을`, "g"), `${treatmentName} 시술을`);

  // [W2 신설 v2.6] 시술명 + "이 시술 시술" / "이 시술 [동사]" 비문 처리
  //   원인: GPT가 "자연유착 쌍꺼풀이 시술 시술", "자연유착 쌍꺼풀이 시술에 대해" 등 생성
  //         → tnEsc("자연유착 쌍꺼풀") 다음에 "이 시술"이 붙어 비문 발생
  // 처리: "{tn}이 시술 시술" → "{tn} 시술" (이중 시술 제거)
  //       "{tn}이 시술" + 동사 → "{tn}" + 동사
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술\\s+시술`, "g"), `${treatmentName} 시술`);
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술([을를이가은는의과와도만]|으로|로)\\s`, "g"), `${treatmentName}$1 `);
  // {tn}이 시술 + 한글(동사·명사 추정) → {tn}이
  result = result.replace(new RegExp(`${tnEsc}이\\s+시술\\s+(?=[가-힣])`, "g"), `${treatmentName}이 `);

  // [X] 키워드 + 치환 총량 제어 v3.4 — 대체어 임계 축소 5→3
  //   v3.3: 대체어('이 시술') 최대 5회 → 본문에 "이 시술" 빈출
  //   v3.4: 대체어 임계 3회 → '이 시술' 노출 절감, 시술명 회귀 비율 증가
  //         결과: SEO 키워드 카운트 더 안정 + 자연스러움 향상
  {
    const kwRegex = new RegExp(tnEsc, "g");
    const MAX_REPLACEMENTS = 3;  // v3.4: 5→3
    let count = 0;
    let replaced = 0;
    result = result.replace(kwRegex, (m) => {
      count++;
      if (count <= 6) return m;
      if (replaced >= MAX_REPLACEMENTS) return m;
      replaced++;
      return "이 시술";
    });
  }

  // [X-Min v3.3] 시술명 노출 최소 보장 — 5회 미만이면 "이 시술" 일부 → 시술명 역치환
  {
    const tnCount = (result.match(new RegExp(tnEsc, "g")) || []).length;
    if (tnCount < 5) {
      const need = 5 - tnCount;
      let restored = 0;
      // v3.3: "이 시술"만 후보 (그 방법/이 방법 풀에서 제거됨)
      const candEsc = "이\\s*시술";
      const re = new RegExp(`([.!?]\\s+|^|\\n)${candEsc}(\\s+[가-힣])`, "g");
      result = result.replace(re, (m, p1, p2) => {
        if (restored >= need) return m;
        restored++;
        return `${p1}${treatmentName}${p2}`;
      });
    }
  }

  // ─────────────────────────────────────────────────────
  // [V2 강화 v2.6] 치환 후 보정 — "이 시술 시술" / "이 시술이 [명사]" 비문 차단
  //   원인 1: [X]에서 시술명을 "이 시술"로 치환한 뒤,
  //          원본에 "시술명 시술"·"시술명이 시술" 형태가 있던 경우
  //          → "이 시술 시술" / "이 시술이 시술" 패턴 발생
  //   원인 2: "이 시술이 고민들" / "이 시술이 장면" 같은 비문
  //          → "이 시술" 뒤 "이"는 주격조사로 와야 하는데 명사가 옴
  //
  //   ※ 순서 중요: 조사 붙은 패턴(이 시술 시술을/시술이) 먼저 처리
  //                → 그다음 일반 패턴(이 시술 시술) 처리
  //                → 마지막에 "이 시술이 + 명사" 비문 처리
  // ─────────────────────────────────────────────────────
  result = result
    // ① 직접 치환 패턴 — 화이트리스트보다 먼저 (수원1 fix)
    .replace(/이\s*시술이\s+말에/g, "그 말에")
    .replace(/이\s*시술이\s+이야기에/g, "그 이야기에")
    // ② 조사 붙은 패턴 — "이 시술 시술 + 조사" (수원2 fix: 에/의 추가)
    .replace(/이\s*시술\s+시술([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 시술$1")
    .replace(/이\s*시술이\s+시술([을를이가은는의과와도만에]|으로|로|까지|부터|에서)/g, "이 시술$1")
    // ③ "이 시술 후기" / "이 시술이 후기" → "그 후기" (지시어 변환)
    .replace(/이\s*시술이?\s+후기/g, "그 후기")
    // ④ "이 시술 시술" (한글 비조사 뒤) → "이 시술"
    .replace(/이\s*시술\s+시술(?![가-힣])/g, "이 시술")
    // ⑤ "이 시술이 시술" (한글 비조사 뒤) → "이 시술"
    .replace(/이\s*시술이\s+시술(?![가-힣])/g, "이 시술")
    // ⑥ "이 시술이 [명사]" 비문 처리 — v3.4 화이트리스트 확장
    //   v2.7: 고민들/장면/모습/결과 등
    //   v3.4: 부분/두 가지/덕분/때문 등 추가 (수원 글에서 발견)
    .replace(/이\s*시술이\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|시간|기간|상황|경험|선택|순간|중요|필요|기대|걱정|불안|이야기|설명|안내|결정|판단|이해|기억|느낌|생각|부분|두\s*가지|세\s*가지|덕분|때문)/g, "이 시술의 $1")
    // ⑦ "이 시술이 + 형용사" 비문 — "이 시술이 만족" / "적절" / "좋" 등
    .replace(/이\s*시술이\s+(만족|적절|중요|필요|좋[으았은])/g, "이 시술은 $1")
    // v3.4 ⑥-2 신설: "{시술명}이 + 명사/덕분/때문" 비문 직접 처리
    //   원인: "수원에서 받은 자연유착 쌍꺼풀이 덕분에" 같은 비문 (이 → 의가 맞음)
    .replace(new RegExp(`${tnEsc}이\\s+(부분|두\\s*가지|세\\s*가지|덕분|때문)`, "g"), `${treatmentName} $1`)
    .replace(new RegExp(`${tnEsc}이\\s+(고민들?|장면|모습|결과|문제|이유|효과|방법|상황|경험|선택|순간|이야기|설명|안내|결정|느낌|생각)`, "g"), `${treatmentName}의 $1`)
    // ⑧ 연속 "이 시술 X 이 시술" 2회 이상 → 1회로 (단일 "이 시술"은 보존)
    .replace(/(이\s*시술[을를이가은는의로]?\s+){2,}/g, "이 시술 ")
    // v3.4 ⑨ 신설: "이 시술 + 매몰법은/절개법은" 같은 주격 중복 (수원 글)
    //   원인: "이 시술은 매몰법은 회복이 빠르지만" 같은 중복 주격
    //   처리: 첫 "이 시술은" 제거 (뒤 문장이 매몰/절개에 대한 설명일 때)
    .replace(/이\s*시술은\s+(매몰법은|절개법은|매몰\s*방법은)/g, "$1");

  // ─────────────────────────────────────────────────────
  // [V3 신설 v2.7] 시술명 + 시술 이중 표현 차단
  //   원인: GPT가 "이 시술 시술" / "{tn} 시술" 형태 생성
  //         (예: "자연유착쌍꺼풀 시술 후" → 어법 OK, 단 "자연유착 쌍꺼풀 시술" 문맥 어색)
  //   처리: "{tn} 시술" 패턴은 보존(자연스러움), 단 "이 시술 시술"만 차단
  // ─────────────────────────────────────────────────────
  // (이미 [V2]③④에서 처리됨 — 추가 처리 불필요)

  // [Y] AI 부사 반복 정리 — v3.2 어근 제한 완전 제거
  //   v3.1까지: "또렷*" / "자연스럽/러*" 4회+ 제거 → 핵심 단어 손실
  //   v3.2: "자연스러움" / "또렷"은 병원 글 핵심 용어이므로 제한 제거
  //         단, "정말/특히/무엇보다" 같은 단정 부사는 그대로 3회+ 차단
  ["정말", "특히 ", "무엇보다"].forEach(adv => {
    const re = new RegExp(adv, "g");
    let cnt = 0;
    result = result.replace(re, (m) => {
      cnt++;
      return cnt <= 2 ? m : "";
    });
  });
  // v3.2: 어근 카운터 제거됨 (자연스러움·또렷 자유 사용)

  // ─────────────────────────────────────────────────────
  // [Y2 v3.4] 문장 끝 어미 다양화 — 임계 4→3 조정
  //   v3.3: 4회 연속 시 4번째만 변형
  //   v3.4: 3회 연속 시 3번째만 변형 → AI 냄새 추가 감소
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
        // v3.4: 3회째만 변형
        return cnt === 3 ? alt : m;
      });
    });
  }

  // ─────────────────────────────────────────────────────
  // [B2 v2.9 강화] 애매 문장 + 비문 직접 차단 + 상담 관용구 정화
  //   v2.8: "기대할 수 있는 [동사누락]" 비문 처리
  //   v2.9: 대구 글에서 발견된 추가 비문 패턴
  //         (b) "눈이 졌다" / "보이는 장점" / "에서도" 줄 시작 비문
  //         (c) "보이도록 설계되어 있습니다" 같은 어색한 상담 관용구
  //   ※ [Z] 앞에서 처리 — [Z]가 패턴 먼저 제거하면 [B2] 매치 대상 사라짐
  // ─────────────────────────────────────────────────────
  result = result
    // v2.8 기존
    .replace(/기대할\s*수\s*있는\s+(고민해|추천|좋을|괜찮)[^.!?\n]*[.!?]/g, "기대할 수 있어요.")
    .replace(/원할\s*때\s+(고민해|추천)[^.!?\n]*[.!?]/g, "원할 수 있어요.")
    .replace(/선택이\s*될\s*수\s*있는\s+(고민|추천|좋)[^.!?\n]*[.!?]/g, "선택이 될 수 있어요.")
    .replace(/이\s*시술과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 방법과 비교해봤어요.")
    .replace(/이\s*방법과\s+비교도\s+해봤[어습]+요?\.?/g, "다른 방법과 비교해봤어요.")
    // v2.9 (b) 비문 직접 차단 — 대구 글에서 발견
    // ① "눈이 졌습니다/졌다는/졌어요" 의미 붕괴 (졌다는 시야 잃음 의미)
    .replace(/눈이\s*졌습니다\.?/g, "눈이 또렷해졌습니다.")
    .replace(/눈이\s*졌어요\.?/g, "눈이 또렷해졌어요.")
    .replace(/눈이\s*졌다는\s*거예요\.?/g, "눈이 또렷해졌다는 거예요.")
    .replace(/눈이\s*졌다\.?/g, "눈이 또렷해졌다.")
    // ② "보이는 장점" 비문 (목적어 누락) — "잘 보이는 장점" / "더욱 보이는 장점"
    .replace(/더욱\s*보이는\s*장점/g, "더 자연스러운 장점")
    .replace(/잘\s*보이는\s*장점/g, "자연스러운 장점")
    .replace(/은\s*더욱\s*보이는/g, "은 더 자연스럽게 보이는")
    // ③ "보이도록 설계되어 있습니다" 어색한 상담 관용구 (인공물 같은 느낌)
    .replace(/보이도록\s*설계되어\s*있습니다\.?/g, "자연스러운 라인으로 만들어집니다.")
    .replace(/보이도록\s*설계되어\s*있어요\.?/g, "자연스러운 라인으로 만들어져요.")
    // ④ "에서도 이런" 줄 시작 — 지역명 누락 ("대구에서도"가 정상)
    //    줄 시작에 "에서도"는 항상 비문이므로 줄 자체 제거
    .replace(/^\s*에서도\s+[^.!?\n]*[.!?]?\s*$/gm, "")
    // ⑤ "더욱 보이는" 같은 뜬금없는 부사 + 형용사 패턴
    .replace(/이\s*시술은\s*더욱\s*보이는\s+/g, "이 시술은 더 자연스러운 ")
    // ⑥ "대구 그 후기를" 같은 어색한 지시어 + 한자어 병치
    .replace(/([가-힣]+)\s+그\s+후기를/g, "$1 후기를")
    .replace(/([가-힣]+)\s+그\s+후기/g, "$1 후기")
    // v3.0 ⑦ "눈이 진 느낌" / "진 느낌" — "졌다" 의미 붕괴 변형
    .replace(/눈이\s*진\s*느낌이?\s*들[더었]?라?고?요?[죠다습니다.]*\.?/g, "눈이 또렷해진 느낌이 들었어요.")
    .replace(/눈이\s*진\s*느낌/g, "눈이 또렷해진 느낌")
    .replace(/인상이?\s*진\s*느낌/g, "인상이 또렷해진 느낌")
    // v3.0 ⑧ "유지된다고 하셨어요" (주어 누락) — 매몰법과 차이 답변 누락
    .replace(/매몰법과의\s*차이도\s*궁금했는데,\s*유지된다고\s*하셨어요\.?/g,
             "매몰법과의 차이도 여쭤봤더니, 자연유착은 풀릴 가능성이 적고 유지력도 안정적이라고 설명해 주셨어요.")
    .replace(/(차이[가는]?\s+(?:궁금했|있었)[는을][는데지요다습니다.]*)\s*유지된다고\s*하셨어요\.?/g, "$1, 자연유착은 풀릴 가능성이 적고 유지력도 안정적이라고 설명해 주셨어요.")
    // v3.0 ⑨ "선택에 후회는 없었습니다" / "결정하게 되었어요" 약한 마무리 정화
    //    (의미는 통하나 광고 마무리 느낌 → 그대로 유지하되 CTA로 분류)
    // v3.0 ⑩ "고려해보세요" CTA — [Z]에서 추가 처리됨
    // ─────────────────────────────────────────────────────
    // v3.2 [B2] 변경 원칙: "자르지 말고 고쳐라"
    //   v3.1: 단어/구 단위 삭제 → 잔해 발생 ("정말 니다", "되고 요")
    //   v3.2: 의미 있는 표현으로 재작성 (잔해 없음, 글 흐름 보존)
    // ─────────────────────────────────────────────────────
    // v3.2 ⑪ 자기 비교 → 다른 도시 비교로 전환 (삭제 대신 재작성)
    //   "자연유착 쌍꺼풀과 비교해도" → "다른 시술과 비교해도"
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교해도`, "g"), "다른 시술과 비교해도")
    .replace(new RegExp(`${tnEsc}(과|와)\\s+비교했을\\s*때`, "g"), "다른 시술과 비교했을 때")
    // v3.2 ⑫ 당연 문장 → 의미 있는 표현으로 재작성
    //   "눈을 뜨고 감을 수 있었어요" → "눈 깜빡임이 자연스러워졌어요"
    .replace(/눈을\s*뜨고\s*감을\s*수\s*있었어요\.?/g, "눈 깜빡임이 자연스러워졌어요.")
    .replace(/눈을\s*뜨고\s*감을\s*수\s*있었습니다\.?/g, "눈 깜빡임이 자연스러워졌습니다.")
    .replace(/눈을\s*깜빡일\s*수\s*있었어요\.?/g, "눈 깜빡임이 편해졌어요.")
    .replace(/눈을\s*깜빡일\s*수\s*있었습니다\.?/g, "눈 깜빡임이 편해졌습니다.")
    // v3.2 ⑬ 약한 CTA → 정보형 마무리로 재작성
    //   "시도해볼 만한 방법이라 생각합니다" → "참고하시면 좋습니다"
    .replace(/시도해볼\s*만한\s*방법이라\s*생각합니다\.?/g, "")
    .replace(/시도해볼\s*만한\s*방법이에요\.?/g, "")
    .replace(/시도해볼\s*만해요\.?/g, "")
    .replace(/시도해보시는\s*것도[^.!?\n]*[.!?]?/g, "")
    // v3.2 ⑭ "손색이 없다" → 부드러운 마무리로 재작성
    //   "손색이 없다" → "비슷한 만족감을 줍니다"
    .replace(/손색이\s*없다는\s*생각이?\s*들었어요\.?/g, "비슷한 만족감을 느꼈어요.")
    .replace(/손색이\s*없다는\s*생각이?\s*들었습니다\.?/g, "비슷한 만족감을 느꼈습니다.")
    .replace(/손색이\s*없어요\.?/g, "충분했어요.")
    .replace(/손색이\s*없습니다\.?/g, "충분했습니다.")
    // v3.2 ⑮ "도 부럽지 않네요" 자기 비교 → 일반 표현으로
    .replace(/[가-힣]+도?\s*부럽지\s*않네요\.?/g, "만족스러워요.")
    .replace(/[가-힣]+도?\s*부럽지\s*않습니다\.?/g, "만족스럽습니다.");

  // ─────────────────────────────────────────────────────
  // [Z] CTA 완전 제거 v2.8 — personal·commercial 양쪽 강화
  //   v2.7까지: "고민해 보세요", "추천해요" 등 차단
  //   v2.8: 변형 표현 추가 — "고민해보셔도 좋을 것 같아요" / "괜찮겠다는 생각"
  // ─────────────────────────────────────────────────────
  const ctaPatterns = [
    // "한 번 X 보세요" 계열
    /한\s*번\s+고민해\s*보세요\.?/g,
    /한\s*번\s+생각해\s*보세요\.?/g,
    /한\s*번\s+상담\s*받아보세요\.?/g,
    /한\s*번\s+방문해\s*보세요\.?/g,
    /한\s*번쯤\s+고민해\s*보세요\.?/g,
    // "X 보는 것도 ~ 될 수 있습니다" 계열
    /상담\s*한\s*번\s+받아보는\s*것도[^.!?\n]*[.!?]?/g,
    /고민\s*한\s*번\s+해보는\s*것도[^.!?\n]*[.!?]?/g,
    /방문해\s*보는\s*것도[^.!?\n]*[.!?]?/g,
    // 잔존 CTA 문장 단위
    /비슷한\s*고민이라면[^.!?\n]*[.!?]?/g,
    /참고\s*하시면\s*좋[을습]\s*[것니]?[다까요]?\.?/g,
    /참고가\s*되었으면\s*합니다\.?/g,
    /참고가\s*될\s*수\s*있을\s*거[예에]요\.?/g,
    // v2.8 신설: "고민해보셔도 좋을 것 같아요" 계열 (광주 글)
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /고민해보셔도\s*좋[으을]\s*[것거]\s*같습니다\.?/g,
    /고민해\s*보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    /생각해보셔도\s*좋[으을]\s*[것거]\s*같아요\.?/g,
    // "좋을 것 같아요" 단독 — 추천성 문구의 변형
    /좋[으을]\s*선택이\s*될\s*[수것]\s*있[어습]+\.?/g,
    /좋[으을]\s*[것거]\s*같[아습]+요\.?/g,
    // "괜찮겠다는 생각" / "내게 꼭 맞는 선택" — 광고성 마무리
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
    // v3.0: "고려해보세요" CTA 추가 차단
    result = result.replace(/고려해보세요\.?/g, "");
    result = result.replace(/고려해\s*보세요\.?/g, "");
    result = result.replace(/고려해보시면\s*좋[을습][것니다까요]+\.?/g, "");
    result = result.replace(/도움이 되길 바랍니다\.?/g, "");
    result = result.replace(/도움이 됩니다\.?/g, "");
    result = result.replace(/정말 만족스럽습니다/g, "체감 변화가 있었습니다");
    result = result.replace(/정말 만족했습니다/g, "체감 변화가 있었습니다");
    // v2.6: 결과/효과 단정 표현 약화
    result = result.replace(/결과가\s*만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/결과가\s*만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/결과가\s*만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스러웠어요\.?/g, "체감 변화가 있었어요.");
    result = result.replace(/만족스러웠습니다\.?/g, "체감 변화가 있었습니다.");
    result = result.replace(/만족스러웠다\.?/g, "체감 변화가 있었다.");
    result = result.replace(/만족스럽습니다\.?/g, "체감 변화가 있었습니다.");
    // "확실히" 단정 부사 제거
    result = result.replace(/확실히\s+/g, "");
    // v2.7: 문장 도중 끊긴 의미불명 패턴 — "제 인상은 졌습니다" 같은 비문
    result = result.replace(/인상은\s*졌습니다\.?/g, "인상이 또렷해졌습니다.");
    result = result.replace(/인상이\s*졌습니다\.?/g, "인상이 또렷해졌습니다.");
  }

  // ─────────────────────────────────────────────────────
  // [B3 신설 v3.2] 잔해 청소 필터 — "자르지 말고 고쳐라"
  //   원인: 이전 정규식들이 단어/구를 삭제하면서 문장 잔해 발생
  //         "되고 요" / "정말 니다" / "눈이." / "7일차:" 같은 프래그먼트
  //   처리: 잔해 패턴을 자연스러운 종결로 복구 (삭제 대신 재작성)
  // ─────────────────────────────────────────────────────
  result = result
    // ① "되고 요" / "되었고 요" — 어절 사이 공백 후 "요" 잔해
    .replace(/되고\s+요\.?/g, "되었어요.")
    .replace(/되었고\s+요\.?/g, "되었어요.")
    .replace(/없어지고\s+요\.?/g, "없어졌어요.")
    .replace(/들고\s+요\.?/g, "들었어요.")
    .replace(/하고\s+요\.?/g, "했어요.")
    // ② "정말 니다" / "정말 까요" — 동사 잘림 + 어미 잔해
    .replace(/정말\s+니다\.?/g, "정말 좋아졌습니다.")
    .replace(/정말\s+습니다\.?/g, "정말 좋았습니다.")
    .replace(/정말\s+어요\.?/g, "정말 좋았어요.")
    // ③ "라인이 정말 니다" → "라인이 정말 자리 잡혔습니다"
    .replace(/라인이\s*정말\s*니다\.?/g, "라인이 정말 자리 잡혔습니다.")
    .replace(/라인이\s*정말\s*습니다\.?/g, "라인이 정말 자리 잡혔습니다.")
    // ④ "눈이." / "눈이 ." 단독 미완성 → 자연 종결로 복구
    .replace(/(거울\s*속\s*내\s*눈이)\s*\./g, "$1 또렷해졌어요.")
    .replace(/(눈매가)\s*\./g, "$1 또렷해졌어요.")
    .replace(/(인상이)\s*\./g, "$1 또렷해졌어요.")
    // ⑤ "7일차:" / "5일차:" 단독 (회복 요약 마지막 항목 누락)
    .replace(/^(\s*-?\s*\d+일차):\s*$/gm, "$1: 자연스러워짐")
    .replace(/^(\s*-?\s*\d+~\d+일차):\s*$/gm, "$1: 자연스러워짐")
    // ⑥ "표 셀 길이 1" — "원하는 분" 같은 누락 셀 (불완전 행은 그대로 통과 — 표 손상 위험)
    // ⑦ 단독 부사 잔해 — 줄 끝 "정말" / "특히" 단독
    .replace(/^\s*(정말|특히|무엇보다)\s*$/gm, "");

  // ─────────────────────────────────────────────────────
  // [B 신설 v2.7 → v3.2 관대화] 문장 종결 검증 — 잘린 문장 재작성
  //   v2.7~v3.1: 미완성 문장 → 통째 삭제 (내용 손실)
  //   v3.2: 미완성 문장 → 자연스러운 종결로 복구 시도
  //         복구 불가능한 경우만 삭제 (조사 단독 끝 등)
  // ─────────────────────────────────────────────────────
  result = result.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (/^(#{1,6}\s|[|*\-]\s|\[이미지|#[가-힣a-zA-Z]|>\s)/.test(trimmed)) return line;
    if (/^\*\*/.test(trimmed)) return line;
    if (/[.?!"”’」』)\]》〉]$/.test(trimmed)) return line;
    // v3.2: 조사로 끝난 미완성 — 복구 시도 후 삭제
    //   "거울 속 내 눈이" → "거울 속 내 눈이 또렷해졌어요."
    //   복구 키워드: 눈이/인상이/얼굴이 같은 주어 끝 → 서술어 추가
    if (/(눈이|인상이|얼굴이|쌍꺼풀이|라인이|결과가|모습이)\s*$/.test(trimmed)) {
      console.log(`[v3.2 잔해복구] 미완성 → 종결 추가: "${trimmed}"`);
      return line + " 또렷해졌어요.";
    }
    // 그 외 미완성 표지 조사로 끝나는 줄은 삭제 유지
    if (/(을|를|이|가|의|에서|에게|으로)\s*$/.test(trimmed)) {
      console.log(`[v3.2 문장종결] 미완성 문장 제거: "${trimmed}"`);
      return "";
    }
    // 동사 연결어미로 끝나는 문장 — 마침표 추가로 복구
    if (/(고|며|면서|지만|는데|아서|어서|니까)\s*$/.test(trimmed)) {
      console.log(`[v3.2 잔해복구] 연결어미 → 종결: "${trimmed}"`);
      return line + " 변화가 있었습니다.";
    }
    return line;
  }).join("\n");

  // ─────────────────────────────────────────────────────
  // [최종 정리 v2.8] 이중공백·따옴표 빈자리·고아 마침표 제거
  // ─────────────────────────────────────────────────────
  result = result
    // 마침표/쉼표 앞 공백
    .replace(/\s+([.,!?])/g, "$1")
    // 줄 시작 공백
    .replace(/^[ \t]+/gm, "")
    // 줄 끝 공백
    .replace(/[ \t]+$/gm, "")
    // 3개 이상 연속 공백 → 1개
    .replace(/[ \t]{3,}/g, " ")
    // 2개 연속 공백 → 1개
    .replace(/[ \t]{2,}/g, " ")
    // 빈 괄호 / 빈 따옴표 제거
    .replace(/\(\s*\)/g, "")
    .replace(/['"]\s*['"]/g, "")
    .replace(/['"]\s+할\s+수/g, "할 수")  // ' 할 수 있을까요' 잔존
    .replace(/['"]\s+될\s+수/g, "될 수")
    // v2.8: 따옴표 직후 빈자리 — `" 쌍꺼풀` / `" 피부` 같은 GPT 누락
    .replace(/(["“])\s+([가-힣])/g, "$1$2")
    // 줄바꿈 정리
    .replace(/\n{3,}/g, "\n\n")
    // 문장 시작 깨진 부호
    .replace(/^[\s.,]+/, "")
    // 빈 문장 ("." 단독, "..") 제거
    .replace(/(^|\n)\s*\.\s*(\n|$)/g, "$1$2")
    .replace(/(^|\n)\s*\.\.\s*(\n|$)/g, "$1$2")
    .trim();

  return result;
}

// ============================================================
// 6. 회복 타임라인 자동 삽입 (personal 전용)
// ============================================================
function insertClinicTimeline(text, treatmentName, mode) {
  if (mode === "commercial") return text;  // commercial은 단정 표현 위험
  const hasTimeline = /일차|일째|주일|개월/.test(text);
  if (!hasTimeline) return text;
  const isEye  = /쌍꺼풀|눈밑|눈매/.test(treatmentName);
  const isSkin = /레이저|피코|토닝/.test(treatmentName);
  const isLift = /울쎄라|써마지|리프팅/.test(treatmentName);
  const isFat  = /지방흡입|지흡/.test(treatmentName);
  const day3Note = isEye ? "눈꺼풀 가벼워짐" : isSkin ? "붉음증 완화" : isLift ? "얼굴 당김 완화" : isFat ? "압박감 줄어듦" : "회복 진행 중";
  const timeline = `\n\n**회복 요약**\n- 1~2일차: 붓기·멍 가장 심함\n- 3일차: ${day3Note}\n- 5일차: 외출 가능\n- 7일차: 자연스러워짐`;
  return text.trimEnd() + timeline;
}

// ============================================================
// 7. 추천 대상 (personal 전용)
// ============================================================
const CLINIC_REC_MAP = {
  "필러":              ["팔자주름이 도드라지는 경우", "볼륨이 꺼져 보이는 경우", "빠른 변화를 원하는 경우"],
  "보톡스":            ["사각턱 콤플렉스가 있는 경우", "이마·눈가 주름이 신경 쓰이는 경우", "간단한 시술을 원하는 경우"],
  "실리프팅":          ["수술 없이 리프팅 원하는 경우", "탄력 저하가 느껴지는 경우", "회복 기간이 짧아야 하는 경우"],
  "울쎄라":            ["수술 없이 탄력 개선 원하는 경우", "자연스러운 리프팅 원하는 경우"],
  "피코레이저":        ["잡티·모공이 고민인 경우", "레이저 경험이 없는 경우"],
  "레이저토닝":        ["피부 톤이 고르지 않은 경우", "기미·잡티를 서서히 개선하고 싶은 경우"],
  "자연유착 쌍꺼풀":   ["티 안 나게 하고 싶은 경우", "직장인·학생으로 빠른 회복이 필요한 경우"],
  "코성형":            ["자연스러운 변화를 원하는 경우", "콧대·코끝 콤플렉스가 있는 경우"],
  "지방흡입":          ["다이어트로 안 빠지는 부위가 있는 경우", "체형 라인을 교정하고 싶은 경우"],
  "눈밑지방재배치":    ["다크서클·피곤한 인상이 고민인 경우", "자연스러운 개선을 원하는 경우"],
};

// ============================================================
// ★ v2 패치: stripMarkdownForNaver — 네이버 블로그 복사용 평문 변환
// 목적: 사용자가 글 복사 후 #/##/### 마크다운 기호를 수동 제거하지 않도록
// 네이버는 마크다운 렌더링 안 함 → 평문으로 변환 필요
// 위치: 모든 후처리 끝난 뒤 마지막 단계 (응답 직전)
// ============================================================
function stripMarkdownForNaver(text) {
  let t = text;

  // ① 줄 시작 헤더 변환 (제목·섹션·하위섹션)
  t = t.replace(/^#\s+(.+)$/gm, "$1");                    // # 제목 → 평문
  t = t.replace(/^##\s+(.+)$/gm, "\n$1\n");              // ## 섹션 → 빈줄+텍스트+빈줄
  t = t.replace(/^###\s+(.+)$/gm, "▶ $1");                // ### 변화(1일/1주) → ▶ 마커

  // ② 인라인에 끼어있는 헤더 (줄바꿈 없이 본문 중간에 박힌 경우)
  t = t.replace(/\s+##\s+([가-힣A-Za-z0-9])/g, "\n\n$1"); // " ## 제목" → 줄바꿈
  t = t.replace(/\s+###\s+([가-힣A-Za-z0-9])/g, "\n▶ $1"); // " ### 1일" → 줄바꿈+마커

  // ③ 굵게/이탤릭 마크다운 제거 (혹시 GPT가 출력했을 경우)
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");                 // **굵게** → 평문
  t = t.replace(/\*([^*]+)\*/g, "$1");                     // *이탤릭* → 평문

  // ④ 연속 빈 줄 압축 (3줄 이상 → 2줄)
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

// ============================================================
// 8. QC 체크 (매뉴얼 PART 7)
// ============================================================
function runQC(text, treatmentName, mode) {
  const charCount = calcCharCount(text);

  // ① 정보블럭 포함 여부
  const hasInfoBlock = /\|\s*항목\s*\||\|\s*확인 항목\s*\||\|\s*[가-힣]+\s*\|/.test(text);

  // ② 수치 포함 여부 (personal만)
  const hasExamValue = /\d+\s*(분|일|주|개월|회|점|만원)/.test(text);

  // ③ 키워드 반복 횟수
  const kwCount = (text.match(new RegExp(treatmentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;

  // ④ 1인칭 표현 (commercial 모드 위반 검사) — 패턴 확장
  const firstPersonCount = (text.match(/저는\s|제가\s|내가\s|나는\s|저도\s|받아봤|받았더|느꼈어|느꼈다|결심했어|결정했어|고민했어/g) || []).length;

  // ⑤ 가격 표현 (commercial 모드 위반 검사)
  const priceCount = (text.match(/\d+\s*만원/g) || []).length;

  // ⑥ 효과 단정 표현 (commercial 위반)
  const certaintyCount = (text.match(/좋아졌|또렷해졌|만족합|만족했|마음에 들었|확실히 좋|확실히 효과|분명히 좋|완치|100%|결과가 좋/g) || []).length;

  // ⑦ 추천·유도 표현 (commercial 위반)
  const recommendCount = (text.match(/추천합|추천해요|추천드립|꼭 받|상담\s*받아보|받아보시|도움이 됩|도움이 될/g) || []).length;

  // ⑧ 후기 흐름 표현 (commercial 위반)
  const reviewFlowCount = (text.match(/고민하다가|결국 받|결심하고|결정했다|받기로 했|받고 나서/g) || []).length;

  console.log(`[clinic][QC] 정보블럭: ${hasInfoBlock}`);
  console.log(`[clinic][QC] 수치: ${hasExamValue}`);
  console.log(`[clinic][QC] 키워드반복: ${kwCount}`);
  if (mode === "commercial") {
    console.log(`[clinic][QC] 1인칭(commercial 위반): ${firstPersonCount}건`);
    console.log(`[clinic][QC] 가격(commercial 위반): ${priceCount}건`);
    console.log(`[clinic][QC] 효과단정(commercial 위반): ${certaintyCount}건`);
    console.log(`[clinic][QC] 추천유도(commercial 위반): ${recommendCount}건`);
    console.log(`[clinic][QC] 후기흐름(commercial 위반): ${reviewFlowCount}건`);
  }

  return {
    hasInfoBlock, hasExamValue, kwCount,
    firstPersonCount, priceCount,
    certaintyCount, recommendCount, reviewFlowCount,
    charCount,
  };
}

// ============================================================
// 메인 핸들러
// ============================================================
export default async function handleClinic(req, res) {
  const {
    target, program, blogType,
    userRegion, userMemo, overrideTitle,
    mode = "personal",   // ✅ 신규: personal | commercial (기본 personal)
    storeId,
  } = req.body;

  const subKw      = program.name || "";
  const region     = (userRegion || "강남").trim();
  const memo       = (userMemo || "").trim();
  const targetId   = target?.id   || "consult";
  const blogTypeId = blogType?.id || "review";
  const industry   = "clinic";

  // mode 검증
  const validMode = (mode === "commercial") ? "commercial" : "personal";
  console.log(`[clinic] mode: ${validMode}`);

  // ── clinic 시술 검증 (치과 시술 차단) ─────────────────
  const DENTAL_NAMES = ["임플란트","라미네이트","투명교정","신경치료","스케일링","사랑니발치","지르코니아크라운","치아미백","턱관절치료"];
  if (DENTAL_NAMES.includes(subKw)) {
    console.error(`[clinic] 치과 시술 진입 차단: ${subKw}`);
    return res.status(400).json({ error: `성형외과 생성기에 치과 시술이 전달되었습니다: ${subKw}` });
  }
  console.log(`[clinic] 시술 검증 통과: ${subKw}`);

  // ── 시술 데이터 로드 ─────────────────────────────────
  const treatmentData = CLINIC_TREATMENTS.find(t => t.id === program.id || t.name === program.name)
    || CLINIC_TREATMENTS[0];
  const treatmentId = treatmentData?.id || "";
  const seoData = treatmentData?.seoData ? { ...treatmentData.seoData, id: treatmentId } : { id: treatmentId };
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(k => k.replace(/\{region\}/g, region));
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(t => t.replace(/\{region\}/g, region));

  // ── 시스템 프롬프트 (mode 분기) ────────────────────
  const systemPrompt = clinicSystem({
    treatmentName: subKw, region, targetId, blogTypeId,
    tone: target?.tone || "",
    mode: validMode,
  });
  const flowBlock    = buildClinicFlowBlock(subKw);

  const compareExtra = blogTypeId === "compare"
    ? `\n\n[비교형 필수 규칙]\n① 효과/통증/회복/유지 4가지 기준 비교\n② "이런 분께 A, 이런 분께 B" 형태로 제시`
    : "";

  const modeContext = validMode === "commercial"
    ? `\n[모드: commercial 정보형] 1인칭·가격·실비·효과보장 절대 금지`
    : `\n[모드: personal 경험담] 1인칭 솔직 톤. 광고성 표현 금지.`;

  const commonContext = `업종: clinic
키워드: ${subKw}
지역: ${region}
타겟: ${targetId}
유형: ${blogTypeId}
${modeContext}
메모: ${memo || "없음"}
${flowBlock ? `\n[섹션 흐름]\n${flowBlock}` : ""}

[어법 절대 규칙 — v2.7 핵심]
※ 시술명 "${subKw}"는 다음 패턴 외 사용 금지:
  ✅ "${subKw}" (그대로) / "${subKw}을" / "${subKw}를" / "${subKw}은" / "${subKw}는" / "${subKw}이" (주격) / "${subKw}로" / "${subKw}에"
  ✅ 대체어: "이 시술" / "이 방법" (조사 자연스럽게 붙여서)
  ❌ "${subKw} 시술" 금지 (이중 표현)
  ❌ "${subKw}이 시술" 금지 (어순 붕괴)
  ❌ "이 시술이 시술" 금지
  ❌ "이 시술이 [명사]" 금지 — "이 시술의 [명사]" 또는 "이 시술은 [형용사]"로 사용
  ❌ "이 시술이 말에" / "이 시술이 고민" 같은 비문 금지

[문장 종결 절대 규칙]
- 모든 문장은 "다." / "요." / "죠." / "어요." / "습니다." 중 하나로 종결
- "제 경험이" / "인상은 졌습니다" 같은 미완성·비문 절대 금지
- 문장 도중에 끊어지면 안 됨

[품질 규칙]
- ❌ "해당 시술" "이 방법" 단독 사용 시 어색 → "이 시술" 권장
- ❌ 지역 혼용 금지: "${region}" 외 지역명 사용 금지
- ❌ 치과·한의원 표현 절대 금지
- ❌ "추천해요" / "추천하고 싶다" / "추천드립니다" CTA 금지
- ❌ "확실히 [동사]" / "분명히 [동사]" 단정 부사 금지
${compareExtra}`.trim();

  // ── 섹션별 순차 생성 ─────────────────────────────────
  const SECTIONS = CLINIC_SECTIONS;
  const sectionTexts = {};
  const prevSections = [];
  let prevTextRaw = "";

  for (const sec of SECTIONS) {
    const richPrompt = clinicSection({
      sectionKey: sec.key,
      treatmentName: subKw, region, targetId, blogTypeId,
      prevSections, extraContext: memo,
      mode: validMode,
      treatmentId,
    });
    const prevBlock  = prevTextRaw ? `\n[지금까지 작성된 내용 — 표현·문장 반복 금지]\n${prevTextRaw.slice(0, 1500)}\n[끝]\n` : "";
    const userPrompt = `${commonContext}\n${prevBlock}\n---\n[현재 섹션: ${sec.label}]\n⚠️ 이 섹션만 작성. 200자 이상.\n\n${richPrompt}`;

    const secRes = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 800, temperature: 0.68,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    });

    let secText = (secRes.choices[0].message.content || "").trim();
    secText = cleanClinicText(secText, subKw, region, validMode);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      console.log(`[clinic] ${sec.label}: 빈 섹션 → 재생성`);
      const retry = await openai.chat.completions.create({
        model: "gpt-4o", max_tokens: 800, temperature: 0.72,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `${commonContext}\n\n${richPrompt}\n\n[중요] 반드시 200자 이상 작성.` }],
      });
      let retryText = (retry.choices[0].message.content || "").trim();
      retryText = cleanClinicText(retryText, subKw, region, validMode);
      retryText = stripInlineImages(retryText);
      retryText = restoreKeyword(retryText, subKw);
      if (calcCharCount(retryText) > calcCharCount(secText)) secText = retryText;
    }

    console.log(`[clinic] ${sec.label}: ${calcCharCount(secText)}자`);
    sectionTexts[sec.key] = secText;
    prevTextRaw += "\n" + secText;
    prevSections.push({ key: sec.key, label: sec.label, content: secText });
  }

  // ── 이미지 ALT ─────────────────────────────────────
  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 상담 / 시술전 / 시술중 / 경과 / 일상
  const CLINIC_ALT_POOL = ["상담 사진", "시술전 사진", "시술중 사진", "경과 사진", "일상 사진"];
  const _CLINIC_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "상담 사진",
    decision: "시술전 사진",
    reason:   "상담 사진",
    progress: "시술중 사진",
    result:   "경과 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(sec => {
    const label = _CLINIC_ALT_BY_KEY[sec.key] || "상담 사진";
    return `[이미지: ${label}]`;
  });

  // ── 제목 생성 (mode 분기) ─────────────────────────
  let title = overrideTitle || buildClinicTitle(subKw, region, seoData, blogTypeId, validMode);

  // 제목 오염 검증
  const CLINIC_TITLE_BLOCK = /임플란트|치아|잇몸|스케일링|신경치료|사랑니|크라운|치과/;
  if (CLINIC_TITLE_BLOCK.test(title)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜시술 종류와 일반 정보`
      : `${region} ${subKw} 후기｜상담부터 결과까지 솔직하게 정리했습니다`;
  }
  if (!title.includes(subKw) && !title.includes(region)) {
    title = validMode === "commercial"
      ? `${region} ${subKw} 진료 안내｜시술 종류와 일반 정보`
      : `${region} ${subKw} 후기｜상담부터 결과까지 솔직하게 정리했습니다`;
  }

  const secKeys = SECTIONS.map(s => s.key);

  // ── INFO_BLOCKS 삽입 (결정 섹션 아래) ─────────────
  const infoBlock = getInfoBlock(treatmentId);
  const infoBlockText = renderInfoBlock(infoBlock);
  // reason 섹션이 있으면 그 뒤에, 없으면 result 앞에
  if (sectionTexts["reason"]) {
    sectionTexts["reason"] = sectionTexts["reason"].trimEnd() + infoBlockText;
  } else if (sectionTexts["result"]) {
    sectionTexts["result"] = infoBlockText + "\n\n" + sectionTexts["result"];
  }

  // ── 회복 타임라인 (personal만) ────────────────────
  if (sectionTexts["result"]) {
    sectionTexts["result"] = insertClinicTimeline(sectionTexts["result"], subKw, validMode);
  }

  // ── 마무리 섹션 추천 대상 (mode 분기) ─────────────
  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    if (validMode === "commercial") {
      // commercial CTA — 광고법 안전 + 반복 패턴 회피 (3가지 톤 랜덤)
      const commercialCTAs = [
        `\n\n${subKw}에 대한 정보는 일반적인 안내일 뿐, 개인의 상태에 따라 적용은 달라질 수 있습니다. 정확한 진단과 치료 방향은 의료진과의 직접 상담을 통해 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${subKw} 진료에 대한 일반 정보 안내입니다. 시술 적합 여부·회복 경과는 개인차가 있으므로, ${region} 내 의료기관에서 충분한 상담 후 결정하시는 것이 좋습니다.`,
        `\n\n${subKw} 관련 일반 정보를 정리한 내용입니다. 본인 상태에 맞는 시술 방법은 전문의 진료 후 안내받는 것이 권장되며, 궁금한 부분은 상담 시 직접 문의해보시기 바랍니다.`,
      ];
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
        + commercialCTAs[Math.floor(Math.random() * commercialCTAs.length)];
    } else {
      // personal: 추천 대상 + 상담 권유
      const recList = CLINIC_REC_MAP[subKw] || [];
      const recBlock = recList.length > 0 ? `\n\n**이런 분들께 추천**\n${recList.map(r => `- ${r}`).join("\n")}` : "";
      sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd() + recBlock + "\n\n비슷한 고민이라면 상담 한 번 받아보는 것도 도움이 됩니다.";
    }
  }

  // ── 조립 ─────────────────────────────────────────
  let assembled = `# ${title}\n\n`;
  secKeys.forEach((key, i) => {
    const secContent = sectionTexts[key] || "";
    if (calcCharCount(secContent) < 50) return;
    assembled += secContent + "\n\n";
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + "\n\n";
  });
  assembled = assembled.replace(/\n{3,}/g, "\n\n").trim();
  assembled = removeDuplicateSentences(assembled);
  assembled += "\n\n" + buildClinicHashtags(subKw, region, validMode);

  // ── 최종 클리닝 (조립 후 누수 방지) ──────
  assembled = cleanClinicText(assembled, subKw, region, validMode);
  // commercial 모드는 2회 통과 — 1차에서 변환된 표현이 다른 패턴 만들 수 있음
  if (validMode === "commercial") {
    assembled = cleanClinicText(assembled, subKw, region, validMode);
  }

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 상담 / 시술전 / 시술중 / 경과 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(상담|시술전|시술중|경과|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/시술중|시술\s*과정|진행|레이저|주사|시술\s*중/.test(s)) return "[이미지: 시술중 사진]";
    if (/시술전|수술전|전후|before|상담실|문진/i.test(s))    return "[이미지: 시술전 사진]";
    if (/경과|회복|after|결과|변화|붓기|딱지/.test(s))         return "[이미지: 경과 사진]";
    if (/상담|진료|설명|차트|원장|의사|병원/.test(s))         return "[이미지: 상담 사진]";
    if (/일상|복귀|평소|생활|마무리/.test(s))                 return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(상담|시술전|시술중|경과|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  // ── QC 체크 ──────────────────────────────────────
  const qc = runQC(assembled, subKw, validMode);
  const charCount = qc.charCount;
  const seoScore  = diagnosePost(assembled, subKw);
  console.log(`[clinic] 완료: ${charCount}자 / SEO ${seoScore}점 / mode=${validMode}`);

  // commercial 모드 광고법 위반 경고
  if (validMode === "commercial") {
    if (qc.firstPersonCount > 0) console.warn(`[clinic] ⚠️ commercial 모드에서 1인칭 ${qc.firstPersonCount}건 잔존`);
    if (qc.priceCount > 0)       console.warn(`[clinic] ⚠️ commercial 모드에서 가격 ${qc.priceCount}건 잔존`);
  }

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry, storeId });

  // ── 이미지 메타 ─────────────────────────────────
  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: "" });

  const lastLine    = assembled.trimEnd().split("\n").pop() || "";
  const hashtagsArr = lastLine.startsWith("#") ? lastLine.split(/\s+/).filter(t => t.startsWith("#")) : [];

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 (마크다운 헤더 제거) ★★★
  const assembledMarkdown = assembled;                      // 마크다운 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled); // 네이버 복사용 평문

  return res.status(200).json({
    success: true,
    text: assembledPlain,
    textMarkdown: assembledMarkdown,
    hashtags: hashtagsArr,
    images, charCount, seoScore,
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
    },
    validation: { passed: charCount >= 2000, charCount },
  });
}
