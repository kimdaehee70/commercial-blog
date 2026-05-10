// pages/index.js — commercial-blog v3.2
// 좌측: 대화창 | 우측: 단계별 설명보드 → 생성 완료 시 결과물

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { CLINIC_TARGETS, ALL_TREATMENTS as CLINIC_TREATMENTS, CLINIC_BLOG_TYPES } from "../lib/clinic-data";
import { DENTAL_TREATMENTS, DENTAL_META } from "../lib/dental-data";
import { ENT_TREATMENTS, ENT_META }             from "../lib/ent-data";
import { UROLOGY_TREATMENTS, UROLOGY_META }     from "../lib/urology-data";
import { ORIENTAL_TREATMENTS, ORIENTAL_META }   from "../lib/oriental-data";
import { ORTHO_TREATMENTS, ORTHO_META }         from "../lib/ortho-data";
import { PEDIATRICS_TREATMENTS, PEDIATRICS_META } from "../lib/pediatrics-data";  // ← 소아청소년과
import { GASTRO_TREATMENTS, GASTRO_META }         from "../lib/gastro-data";         // ← 소화기내과
import { GENERAL_TREATMENTS, GENERAL_META }       from "../lib/general-data";        // ← 내과·가정의학과
import { OBGYN_TREATMENTS, OBGYN_META }           from "../lib/obgyn-data";          // ← 산부인과
import { DERMA_TREATMENTS, DERMA_META }           from "../lib/derma-data";          // ← 피부과
import { PAIN_TREATMENTS, PAIN_META }             from "../lib/pain-data";            // ← 통증의학과
import { NEURO_TREATMENTS, NEURO_META }           from "../lib/neuro-data";           // ← 신경외과
import { PSY_TREATMENTS, PSY_META }               from "../lib/psy-data";             // ← 정신건강의학과
import { EYE_TREATMENTS, EYE_META }               from "../lib/eye-data";             // ← 안과
import { FAMILY_TREATMENTS, FAMILY_META }         from "../lib/family-data";          // ← 가정의학과

// 업종별 카테고리 탭 (컴포넌트보다 먼저 선언)
const CLINIC_CATS = ["전체", "눈성형", "코성형", "윤곽", "리프팅", "보톡스·필러", "피부", "지방·체형", "모발"];
const DENTAL_CATS  = ["전체", "보철", "심미", "교정", "보존", "예방", "구강외과", "턱관절", "소아"];
const ENT_CATS     = ["전체", "코", "귀", "목", "수면"];
const UROLOGY_CATS = ["전체", "전립선", "남성수술", "신장·요관", "방광", "성기능", "감염"];
const ORIENTAL_CATS = ["전체", "교통사고", "피부", "근골격", "다이어트", "여성", "통증", "내과", "신경"];
const ORTHO_CATS    = ["전체", "척추·디스크", "무릎·관절", "어깨", "발목·족부", "비수술치료", "수술·재활"];
const PEDIATRICS_CATS = ["전체", "예방접종", "소화기", "응급·발열", "호흡기", "이비인후", "피부·알레르기", "성장·발달", "감염병", "호흡기·알레르기", "신생아", "발달·행동", "혈액·영양"];
const GASTRO_CATS   = ["전체", "내시경", "식도", "위", "대장", "간", "담낭·담도", "췌장", "검진"];
const GENERAL_CATS  = ["전체", "만성질환", "내분비", "검진", "감염·면역", "컨디션 관리", "영양·대사", "혈액·영양", "생활습관", "신경·정신"];
const OBGYN_CATS    = ["전체", "자궁", "난소", "임신·난임", "임신·출산", "월경", "감염", "갱년기", "피임", "검진·예방", "유방", "외음부"];
const DERMA_CATS    = ["전체", "여드름·모공", "색소·미백", "안티에이징", "레이저", "보톡스·필러", "탈모", "아토피·습진", "제모", "검진·상담"];
const PAIN_CATS     = ["전체", "척추·디스크", "관절·인대", "재활·물리", "두통·신경", "족부·하지"];
const NEURO_CATS    = ["전체", "척추·디스크", "두통·신경통", "신경차단·통증", "말초신경·손저림", "어지럼·뇌신경"];
const PSY_CATS      = ["전체", "우울·불안", "수면·집중", "관계·트라우마", "비약물치료", "연령별 특화"];
const EYE_CATS      = ["전체", "시력교정", "백내장·노안", "망막·녹내장", "안구건조·결막", "사시·소아안과", "검진·상담"];
const FAMILY_CATS   = ["전체", "만성질환", "검진·예방", "감기·소화기", "다이어트", "수액·영양", "생활습관"];

// ============================================================
// 업종 설정 — URL 쿼리 ?industry=dental 로 결정
// 로그인 기능 추가 시 user.industry 로 덮어쓰기
// ============================================================
// CURRENT_INDUSTRY는 컴포넌트 내부에서 useRouter로 읽음 (아래 Home 참고)
// 빌드 타임 기본값 (SSR fallback)
const DEFAULT_INDUSTRY = process.env.NEXT_PUBLIC_INDUSTRY || "clinic";

// 업종별 시술 목록
const INDUSTRY_TREATMENTS = {
  clinic:   CLINIC_TREATMENTS,
  dental:   DENTAL_TREATMENTS,
  ent:      ENT_TREATMENTS,
  urology:  UROLOGY_TREATMENTS,
  oriental: ORIENTAL_TREATMENTS,
  ortho:    ORTHO_TREATMENTS,
  pediatrics: PEDIATRICS_TREATMENTS,  // ← 소아청소년과
  gastro:     GASTRO_TREATMENTS,       // ← 소화기내과
  general:    GENERAL_TREATMENTS,      // ← 내과·가정의학과
  obgyn:      OBGYN_TREATMENTS,        // ← 산부인과
  derma:      DERMA_TREATMENTS,        // ← 피부과
  pain:       PAIN_TREATMENTS,         // ← 통증의학과
  neuro:      NEURO_TREATMENTS,        // ← 신경외과
  psy:        PSY_TREATMENTS,          // ← 정신건강의학과
  eye:        EYE_TREATMENTS,          // ← 안과
  family:     FAMILY_TREATMENTS,       // ← 가정의학과
};

// 업종별 인사말 + 예시문장
const INDUSTRY_CONFIG = {
  clinic: {
    label: "성형외과/피부과",
    greeting: "안녕하세요! 블로그 생성기입니다.",
    examples: [
      "강남 자연유착 쌍꺼풀 후기 써줘",
      "실리프팅 vs 울쎄라 비교하다 결정한 이유",
      "압구정 피코레이저 처음 상담 받아봤어요",
      "30대 강남 실리프팅 3개월 결과 솔직하게",
      "쌍꺼풀 고민하다 강남에서 상담받은 이야기",
    ],
    badge: "clinic v1.0",
  },
  dental: {
    label: "치과",
    greeting: "안녕하세요! 치과 블로그 생성기입니다.",
    examples: [
      "강남 임플란트 후기 써줘",
      "분당 투명교정 vs 일반교정 비교하다 결정한 이유",
      "수원 사랑니 발치 무서웠는데 받아봤어요",
      "강남 스케일링 연 1회 보험 적용 후기",
      "신경치료 두려워서 미루다가 결국 받은 이야기",
    ],
    badge: "dental v1.0",
  },
  ent: {
    label: "이비인후과",
    greeting: "안녕하세요! 이비인후과 블로그 생성기입니다.",
    examples: [
      "강남 비염 치료 후기 써줘",
      "분당 코골이 치료 vs 양압기 비교하다 결정한 이유",
      "수원 편도선 수술 두려웠는데 받아봤어요",
      "강남 축농증 내시경 수술 상담부터 회복까지",
      "돌발성 난청 갑자기 생겨서 응급으로 간 이야기",
    ],
    badge: "ent v1.0",
  },
  oriental: {
    label: "한의원",
    greeting: "안녕하세요! 한의원 블로그 생성기입니다.",
    examples: [
      "강남 교통사고 한방치료 자동차보험으로 받은 후기",
      "분당 아토피 한방치료 스테로이드 없이 해결한 이야기",
      "수원 갱년기한약 증상 완화 처방받고 달라진 것",
      "강남 공진단 면역력 증진을 위한 선택",
      "부천 담적 증상 소화불량 한의원에서 해결한 이야기",
    ],
    badge: "oriental v1.2",
  },
  ortho: {
    label: "정형외과",
    greeting: "안녕하세요! 정형외과 블로그 생성기입니다.",
    examples: [
      "강남 허리디스크 수술 안 하고 나은 이야기",
      "분당 무릎관절염 연골주사 맞고 나서 솔직 후기",
      "수원 도수치료 효과 언제부터 느꼈나요",
      "강남 족저근막염 체외충격파 치료 후기",
      "분당 어깨 회전근개 파열 정형외과 치료 기록",
    ],
    badge: "ortho v1.0",
  },
  urology: {
    label: "비뇨기과",
    greeting: "안녕하세요! 비뇨기과 블로그 생성기입니다.",
    examples: [
      "강남 전립선비대증 치료 후기 써줘",
      "분당 포경수술 성인 두려웠는데 받아봤어요",
      "수원 요로결석 체외충격파 당일 시술 후기",
      "강남 방광염 재발 반복되다가 해결한 이야기",
      "발기부전 혼자 고민하다가 결국 비뇨기과 간 이야기",
    ],
    badge: "urology v1.0",
  },
  pediatrics: {
    label: "소아청소년과",
    greeting: "안녕하세요! 소아청소년과 블로그 생성기입니다.",
    examples: [
      "강남 소아과 독감예방접종 후기 써줘",
      "분당 아이 장염으로 소아과 달려간 이야기",
      "수원 소아 아토피 치료 3개월 기록",
      "강남 영유아 건강검진 18개월 후기",
      "아이 수족구 걸렸을 때 소아청소년과에서 들은 이야기",
    ],
    badge: "pediatrics v1.0",
  },
  gastro: {
    label: "소화기내과",
    greeting: "안녕하세요! 소화기내과 블로그 생성기입니다.",
    examples: [
      "강남 위내시경 수면으로 처음 받아봤어요",
      "분당 대장내시경 용종 발견하고 제거한 이야기",
      "수원 역류성 식도염 치료 후기 써줘",
      "강남 헬리코박터 제균치료 1차 성공 후기",
      "지방간 2단계 진단 받고 소화기내과에서 들은 것들",
    ],
    badge: "gastro v1.0",
  },
  general: {
    label: "내과·가정의학과",
    greeting: "안녕하세요! 내과·가정의학과 블로그 생성기입니다.",
    examples: [
      "강남 내과 고혈압 처음 약 처방받은 후기",
      "분당 당뇨 HbA1c 낮추는 3개월 기록",
      "수원 건강검진 이상 소견 받고 나서 한 것들",
      "강남 대상포진 조기 진단 후기 써줘",
      "만성피로 원인 찾으러 가정의학과 간 이야기",
    ],
    badge: "general v1.0",
  },
  obgyn: {
    label: "산부인과",
    greeting: "안녕하세요! 산부인과 블로그 생성기입니다.",
    examples: [
      "강남 산부인과 자궁근종 발견 후기 써줘",
      "분당 난소낭종 수술 vs 경과관찰 고민한 이야기",
      "수원 산부인과 생리불순 원인 찾은 과정",
      "강남 HPV 백신 성인 접종 후기",
      "자궁내막증 진단받고 나서 한 것들",
    ],
    badge: "obgyn v1.0",
  },
  derma: {
    label: "피부과",
    greeting: "안녕하세요! 피부과 블로그 생성기입니다.",
    examples: [
      "강남 피부과 여드름 치료 후기 써줘",
      "분당 피코레이저 기미 제거 3회 받은 이야기",
      "수원 피부과 보톡스 처음 맞아봤어요",
      "강남 탈모 치료 모발이식 고민한 이야기",
      "아토피 피부염 스테로이드 없이 치료한 기록",
    ],
    badge: "derma v1.0",
  },
  pain: {
    label: "통증의학과",
    greeting: "안녕하세요! 통증의학과 블로그 생성기입니다.",
    examples: [
      "강남 통증의학과 허리디스크 신경차단술 후기 써줘",
      "분당 무릎 프롤로 주사 vs PRP 비교하다 결정한 이유",
      "수원 체외충격파 족저근막염 5회 받은 이야기",
      "강남 오십견 수압팽창술 받고 팔이 올라간 후기",
      "도수치료 실비 적용 받고 10회 솔직 후기",
    ],
    badge: "pain v1.0",
  },
  neuro: {
    label: "신경외과",
    greeting: "안녕하세요! 신경외과 블로그 생성기입니다.",
    examples: [
      "강남 허리디스크 신경외과 후기 써줘",
      "분당 신경차단술 vs 신경성형술 고민한 이야기",
      "수원 만성두통 신경외과 검진 후기",
      "강남 수근관증후군 손저림 치료 후기",
      "삼차신경통 약 끊고 시술 받은 이야기",
    ],
    badge: "neuro v1.0",
  },
  psy: {
    label: "정신건강의학과",
    greeting: "안녕하세요! 정신건강의학과 블로그 생성기입니다.",
    examples: [
      "강남 우울증 진료 후기 써줘",
      "분당 공황장애 정신건강의학과 솔직 후기",
      "수원 성인 ADHD 진료 후기",
      "강남 불면증 진료 4주 일지",
      "산후우울 정신건강의학과 후기",
    ],
    badge: "psy v1.0",
  },
  eye: {
    label: "안과",
    greeting: "안녕하세요! 안과 블로그 생성기입니다.",
    examples: [
      "강남 라식 후기 써줘",
      "분당 라식 vs 라섹 비교하다 결정한 이유",
      "수원 백내장 다초점렌즈 수술 후기",
      "강남 안구건조증 IPL 치료 받아봤어요",
      "고도근시 ICL 안내렌즈삽입술 솔직 후기",
    ],
    badge: "eye v1.0",
  },
  family: {
    label: "가정의학과",
    greeting: "안녕하세요! 가정의학과 블로그 생성기입니다.",
    examples: [
      "강남 가정의학과 고혈압 약 처방 후기",
      "분당 당뇨 HbA1c 낮춘 3개월 기록",
      "수원 가정의학과 종합건강검진 받아본 이야기",
      "강남 삭센다 vs 위고비 비교 끝에 결정한 이유",
      "만성피로 원인 찾고 관리한 솔직 후기",
    ],
    badge: "family v1.0",
  },
};

// ACTIVE_CONFIG, ALL_TREATMENTS는 컴포넌트 내부에서 CURRENT_INDUSTRY 기반으로 동적 계산
const ACTIVE_CONFIG    = INDUSTRY_CONFIG["clinic"]; // fallback only
const ALL_TREATMENTS   = CLINIC_TREATMENTS; // fallback only
import WatermarkTab    from "../components/WatermarkTab";
import PhotoEditorTab  from "../components/PhotoEditorTab";
import DiagnosePage  from "../components/DiagnosePage";
import GuideAccordion  from "../components/GuideAccordion";
import ToolsAccordion  from "../components/ToolsAccordion";

// ============================================================
// 유틸
// ============================================================
function calcValidCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "").length;
}

function scoreToPercentInline(score) {
  if (score >= 95) return 97; if (score >= 90) return 93;
  if (score >= 85) return 87; if (score >= 80) return 80;
  if (score >= 75) return 72; if (score >= 70) return 63;
  if (score >= 65) return 53; if (score >= 60) return 43;
  if (score >= 50) return 32; return 20;
}

function md2html(text) {
  return text
    .replace(/^# (.+)$/gm,     "<h1 style='font-size:20px;font-weight:800;margin:18px 0 10px;color:#1a1a2e'>$1</h1>")
    .replace(/^## (.+)$/gm,    "<h2 style='font-size:16px;font-weight:600;margin:14px 0 6px;color:#37474f'>$1</h2>")
    .replace(/^### (.+)$/gm,   "<h3 style='font-size:16px;font-weight:600;margin:10px 0 4px;color:#37474f'>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<span>$1</span>")
    .replace(/\*(.+?)\*/g,     "<span>$1</span>");
}

// ============================================================
// 전략별 제목 자동 생성 — 우회 키워드 패턴 (비용 0원)
// ============================================================
function generateTitleSuggestions(treatmentName, region, strategyType) {
  const kw = treatmentName;
  const r  = region || "";

  // 우회 패턴: "후기→회복과정", "효과→기간/변화", "병원→경험/비교"
  const isDental = DEFAULT_INDUSTRY === "dental";
  const templates = {
    롱테일: isDental ? [
      `${r} ${kw} 후기｜치료 과정 솔직하게 기록`,
      `${kw} 처음 받는 분들이 제일 많이 묻는 것`,
      `${r} ${kw} 받기 전 몰랐던 것들`,
      `${kw} 두려워서 미루다가 결국 받은 이야기`,
      `${r} ${kw} 비용·기간 정리｜상담 3곳 비교`,
    ] : [
      `${kw} 받고 붓기 언제 빠지나 — 직접 기록`,
      `${r} ${kw} 회복 과정 3일차 솔직 후기`,
      `${kw} 후 일상 복귀까지 며칠 걸렸나`,
      `${r} ${kw} 멍·붓기 기간 정리`,
      `${kw} 처음 받는 분들이 제일 많이 묻는 것`,
    ],
    후기형: isDental ? [
      `${r} ${kw} — 치료 끝나고 드는 생각`,
      `${kw} 받기로 결심한 이유가 있었다`,
      `${r} ${kw} 상담 다녀온 날 정리`,
      `${kw} 처음 받아봤는데 솔직히 말하면`,
      `${r} 치과 가기 무서웠는데 ${kw} 받은 이야기`,
    ] : [
      `${r} ${kw} — 3개월 지나고 드는 생각`,
      `${kw} 받기로 결심한 이유가 있었다`,
      `${r} ${kw} 상담 다녀온 날 정리`,
      `${kw} 처음 받아봤는데 솔직히 말하면`,
      `거울 보다가 ${kw} 예약한 이야기`,
    ],
    비교형: isDental ? [
      `${kw} 할까 말까 — 다른 방법이랑 비교해봤어요`,
      `${r} ${kw} 선택한 이유 한 가지`,
      `${kw} vs 다른 치료 — 상담에서 들은 차이`,
      `${r} 치과 3곳 비교 후 ${kw} 선택한 이유`,
    ] : [
      `${kw} 할까 말까 — 다른 방법이랑 비교해봤어요`,
      `${r} ${kw} 선택한 이유 한 가지`,
      `비수술 리프팅 비교 — 내가 ${kw}로 간 이유`,
      `${kw} vs 다른 방법 — 상담에서 들은 차이`,
    ],
    원본: [
      `${r} ${kw} — 솔직한 경험담`,
      `${kw} 고민하는 분들께 드리는 이야기`,
      `${r} ${kw} 받고 나서 달라진 것`,
    ],
  };

  const list = templates[strategyType] || templates["후기형"];
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(t => t.replace(/\s+/g, " ").trim());
}


function parseNaturalInput(text) {
  // 🔧 v2: 사용자 입력 region 중복 토큰 정리 ("인천 인천" → "인천")
  // 한글 토큰 경계가 \b로 잡히지 않으므로 공백/문장경계 기반으로 처리
  text = String(text || '').replace(/(^|\s)([가-힣]{2,5})\s+\2(?=\s|$)/g, '$1$2');

  // ── v3: 동사 어미 / 형용사 어미 region 오인 차단 ──────────
  // "끊으면", "다녀왔다면", "좋네요", "있거든요", "했더니" 같은 어미가 행정구역 "면"·"동"·"구"와 충돌
  // 행정구역 매칭 시 앞 글자가 어미 패턴이면 제외
  const VERB_ENDING_BLOCKS = [
    // ~으면 / ~다면 / ~라면 (조건형 어미) — "면" 충돌
    /[으다라]면$/,
    // ~네요 / ~군요 / ~데요 (감탄형) — 끝 글자 충돌 가능성 낮으나 보수적 차단
    /[네군데]요$/,
    // ~거든요 / ~인데요 (설명형)
    /거든요?$/,
    /인데요?$/,
    // ~했더니 / ~다더니 (회상형)
    /더니$/,
    // ~니까 / ~으니 (이유형)
    /니까$/,
    /[으아어]니$/,
    // ~ㅂ니다 / ~습니다 종결
    /[습ㅂ]니다$/,
  ];
  function looksLikeVerbEnding(candidate) {
    return VERB_ENDING_BLOCKS.some(re => re.test(candidate));
  }

  // ── 시/군/구/읍/면/동 단위 자동 추출 (지방 포함) ──────────
  const UNIT_PATTERN = /([가-힣]{2,5})(시|군|구|읍|면|동)(?=\s|$|[^가-힣])/g;
  let unitMatch, extractedRegion = "";
  while ((unitMatch = UNIT_PATTERN.exec(text)) !== null) {
    const candidate = unitMatch[1] + unitMatch[2]; // "끊으면" / "중랑구"
    // ★ 동사 어미 차단: "끊으면", "다녀왔다면", "있거든요" 등 region 후보에서 제외
    if (looksLikeVerbEnding(candidate)) {
      console.log(`[parseNaturalInput] 동사 어미 차단: "${candidate}"`);
      continue;
    }
    // ★ 첫 글자가 너무 짧거나 일반 동사 어근이면 차단
    //   "면 단위" 매칭 시 앞부분이 1글자 + "면"이면 부적절 (예: "가면", "오면")
    if (unitMatch[2] === "면" && unitMatch[1].length < 2) {
      continue;
    }
    extractedRegion = candidate;
  }

  const regions = [
    "강남","서초","송파","강동","강서",
    "중랑","노원","도봉","강북","성북","동대문","광진",
    "은평","서대문","마포","종로","중구","용산",
    "양천","구로","금천","영등포","동작","관악",
    "압구정","청담","신사","잠실","목동","홍대","신촌","이태원","혜화","건대",
    "분당","판교","수원","성남","용인","고양","일산","의정부","남양주","하남",
    "광명","안양","안산","별내","다산","위례","미사","광교","동탄","수지",
    "기흥","평택","화성","시흥","부천","김포","오산",
    "인천","대구","부산","광주","대전","울산","세종","제주",
    "전주","청주","창원","포항","김해","천안","아산","순천","여수","원주",
  ];

  let region = "", treatmentId = null, treatmentName = "";

  if (extractedRegion) {
    region = extractedRegion; // "중랑구" 원본 그대로
  } else {
    const sorted = [...regions].sort((a, b) => b.length - a.length);
    for (const r of sorted) {
      if (text.includes(r)) { region = r; break; }
    }
  }

  // ★ v3: region 최종 검증 — 동사 어미가 통과했거나 화이트리스트 매칭 실패 시 기본값
  if (region && looksLikeVerbEnding(region)) {
    console.log(`[parseNaturalInput] region 최종 검증 실패 (동사 어미): "${region}" → 기본값 사용`);
    region = "";
  }
  // ★ v3: region 미입력 시 기본값 fallback
  if (!region || region.length < 2) {
    region = "강남";
    console.log(`[parseNaturalInput] region 기본값 fallback: "강남" (입력: "${text.slice(0, 60)}")`);
  } else {
    console.log(`[parseNaturalInput] region: "${region}" (입력: "${text.slice(0, 60)}")`);
  }

  const allT = [...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS, ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS, ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...GENERAL_TREATMENTS, ...OBGYN_TREATMENTS, ...PAIN_TREATMENTS, ...NEURO_TREATMENTS, ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS];
  for (const t of allT) { if (text.includes(t.name)) { treatmentId = t.id; treatmentName = t.name; break; } }
  if (!treatmentId) {
    if      (text.includes("쌍꺼풀") || text.includes("눈매"))                                  { treatmentId = "natural_double"; treatmentName = "자연유착 쌍꺼풀"; }
    else if (text.includes("눈밑") || text.includes("다크서클") || text.includes("애교살"))      { treatmentId = "eye_fat";        treatmentName = "눈밑지방재배치"; }
    else if (text.includes("코성형") || text.includes("콧대") || text.includes("매부리"))        { treatmentId = "rhinoplasty";    treatmentName = "코성형"; }
    else if (text.includes("실리프팅") || text.includes("실리"))                                 { treatmentId = "sili_lifting";   treatmentName = "실리프팅"; }
    else if (text.includes("울쎄라"))                                                            { treatmentId = "ulthera";        treatmentName = "울쎄라"; }
    else if (text.includes("리프팅"))                                                            { treatmentId = "sili_lifting";   treatmentName = "실리프팅"; }
    else if (text.includes("보톡스") || text.includes("사각턱"))                                 { treatmentId = "botox";          treatmentName = "보톡스"; }
    else if (text.includes("필러") || text.includes("팔자"))                                     { treatmentId = "filler";         treatmentName = "필러"; }
    else if (text.includes("지방흡입") || text.includes("지흡"))                                 { treatmentId = "liposuction";    treatmentName = "지방흡입"; }
    else if (text.includes("토닝") || text.includes("기미"))                                     { treatmentId = "laser_toning";   treatmentName = "레이저토닝"; }
    else if (text.includes("피코레이저") || text.includes("피코") || text.includes("잡티"))      { treatmentId = "pico_laser";     treatmentName = "피코레이저"; }
    else if (text.includes("레이저"))                                                            { treatmentId = "pico_laser";     treatmentName = "피코레이저"; }
    // dental 시술 인식
    else if (text.includes("임플란트"))                                                          { treatmentId = "implant";        treatmentName = "임플란트"; }
    else if (text.includes("라미네이트"))                                                        { treatmentId = "laminate";       treatmentName = "라미네이트"; }
    else if (text.includes("투명교정") || text.includes("교정"))                                 { treatmentId = "braces";         treatmentName = "투명교정"; }
    else if (text.includes("신경치료") && !text.includes("고주파") && !text.includes("신경외과")) { treatmentId = "rootcanal";      treatmentName = "신경치료"; }
    else if (text.includes("스케일링"))                                                          { treatmentId = "scaling";        treatmentName = "스케일링"; }
    else if (text.includes("사랑니"))                                                            { treatmentId = "wisdom";         treatmentName = "사랑니발치"; }
    else if (text.includes("지르코니아") || text.includes("크라운"))                             { treatmentId = "zirconia";       treatmentName = "지르코니아크라운"; }
    else if (text.includes("미백"))                                                              { treatmentId = "whitening";      treatmentName = "치아미백"; }
    else if (text.includes("턱관절"))                                                            { treatmentId = "tmj";            treatmentName = "턱관절치료"; }
    // ent 치료 인식
    else if (text.includes("코골이") || text.includes("수면무호흡"))                             { treatmentId = "snoring";         treatmentName = "코골이수면치료"; }
    else if (text.includes("비중격") || (text.includes("코막힘") && text.includes("수술")))      { treatmentId = "septum";          treatmentName = "비중격만곡증수술"; }
    else if (text.includes("축농증") || text.includes("부비동"))                                 { treatmentId = "sinusitis";       treatmentName = "축농증치료"; }
    else if (text.includes("비염"))                                                              { treatmentId = "rhinitis";        treatmentName = "비염치료"; }
    else if (text.includes("편도"))                                                              { treatmentId = "tonsil";          treatmentName = "편도선수술"; }
    else if (text.includes("중이염"))                                                            { treatmentId = "otitis";          treatmentName = "중이염치료"; }
    else if (text.includes("이명"))                                                              { treatmentId = "tinnitus";        treatmentName = "이명치료"; }
    else if (text.includes("돌발성난청") || text.includes("돌발 난청") || text.includes("갑자기") && text.includes("난청")) { treatmentId = "sudden_hearing"; treatmentName = "돌발성난청치료"; }
    else if (text.includes("성대") || text.includes("목소리") || text.includes("쉰목"))         { treatmentId = "voice";           treatmentName = "목소리이상치료"; }
    else if (text.includes("이석증") || text.includes("메니에르") || (text.includes("어지럼") && !text.includes("신경"))) { treatmentId = "dizziness"; treatmentName = "어지럼증치료"; }
    else if (text.includes("후두") || text.includes("인후두") || text.includes("목이물감"))                             { treatmentId = "laryngoscopy"; treatmentName = "후두내시경검사"; }
    else if (text.includes("청력") || text.includes("보청기") || text.includes("난청"))                                 { treatmentId = "hearing";       treatmentName = "청력검사보청기"; }
    else if (text.includes("코피") || text.includes("비출혈"))                                                          { treatmentId = "epistaxis";     treatmentName = "코피비출혈치료"; }
    // urology 치료 인식
    else if (text.includes("전립선비대") || text.includes("야간빈뇨") || text.includes("잔뇨"))                         { treatmentId = "prostate";          treatmentName = "전립선비대증치료"; }
    else if (text.includes("포경"))                                                                                     { treatmentId = "circumcision";      treatmentName = "포경수술"; }
    else if (text.includes("요로결석") || text.includes("신장결석") || text.includes("옆구리통증"))                     { treatmentId = "kidney_stone";      treatmentName = "요로결석치료"; }
    else if (text.includes("방광염"))                                                                                   { treatmentId = "bladder";           treatmentName = "방광염치료"; }
    else if (text.includes("발기부전") || text.includes("발기"))                                                        { treatmentId = "ed";                treatmentName = "발기부전치료"; }
    else if (text.includes("정관수술") || text.includes("정관"))                                                        { treatmentId = "vasectomy";         treatmentName = "정관수술"; }
    else if (text.includes("요실금"))                                                                                   { treatmentId = "incontinence";      treatmentName = "요실금치료"; }
    else if (text.includes("정계정맥류"))                                                                               { treatmentId = "varicocele";        treatmentName = "정계정맥류치료"; }
    else if (text.includes("성병"))                                                                                     { treatmentId = "sti";               treatmentName = "성병검사치료"; }
    else if (text.includes("과민성방광") || text.includes("빈뇨"))                                                     { treatmentId = "overactive_bladder"; treatmentName = "과민성방광치료"; }
    else if (text.includes("혈뇨"))                                                                                     { treatmentId = "hematuria";         treatmentName = "혈뇨검사치료"; }
    else if (text.includes("전립선암") || text.includes("PSA"))                                                        { treatmentId = "prostate_cancer";    treatmentName = "전립선암검진"; }
    else if (text.includes("조루"))                                                                                     { treatmentId = "pe";                 treatmentName = "조루증치료"; }
    else if (text.includes("유로리프트") || text.includes("결찰술"))                                                    { treatmentId = "urolift";            treatmentName = "전립선결찰술"; }
    else if (text.includes("갱년기") || text.includes("테스토스테론"))                                                  { treatmentId = "male_menopause";     treatmentName = "남성갱년기치료"; }
    else if (text.includes("배뇨장애") || text.includes("소변줄기"))                                                    { treatmentId = "voiding";            treatmentName = "배뇨장애치료"; }
    else if (text.includes("불임") || text.includes("정자검사") || text.includes("정액검사"))                           { treatmentId = "male_infertility";   treatmentName = "남성불임검사"; }
    else if (text.includes("음경확대") || text.includes("귀두확대"))                                                    { treatmentId = "penile_enlargement"; treatmentName = "음경확대수술"; }
    // ortho 치료 인식
    else if (text.includes("허리디스크") || (text.includes("허리") && text.includes("디스크")))  { treatmentId = "lumbar_disc";         treatmentName = "허리디스크치료"; }
    else if (text.includes("목디스크") || (text.includes("목") && text.includes("디스크")))      { treatmentId = "cervical_disc";       treatmentName = "목디스크치료"; }
    else if (text.includes("협착증") || text.includes("척추관협착"))                              { treatmentId = "spinal_stenosis";     treatmentName = "척추관협착증치료"; }
    // ortho v1.1 신규 — 경추협착·거북목 (목디스크 분리, 척추협착증 위에 우선 배치는 부적절하므로 별도 키워드만)
    else if (text.includes("경추협착") || text.includes("거북목") || text.includes("일자목"))    { treatmentId = "cervical_stenosis";   treatmentName = "경추협착증치료"; }
    // ortho v1.1 신규 — 연골주사 (무릎관절염 위에 배치: DN·콘쥬란·히알루론산 키워드 우선)
    else if (text.includes("DN주사") || text.includes("콘쥬란") || text.includes("히알루론산") || (text.includes("연골주사") && !text.includes("무릎"))) { treatmentId = "cartilage_injection"; treatmentName = "연골주사치료"; }
    else if ((text.includes("무릎") && (text.includes("관절염") || text.includes("연골주사"))))   { treatmentId = "knee_arthritis";      treatmentName = "무릎관절염치료"; }
    else if (text.includes("반월상") || text.includes("반월"))                                    { treatmentId = "meniscus";            treatmentName = "반월상연골치료"; }
    // ortho v1.1 신규 — 회전근개·오십견 분리 (기존 통합 키워드보다 먼저)
    else if (text.includes("회전근개"))                                                            { treatmentId = "rotator_cuff";        treatmentName = "회전근개파열치료"; }
    else if (text.includes("오십견") || text.includes("유착성관절낭염"))                          { treatmentId = "frozen_shoulder";     treatmentName = "오십견치료"; }
    else if (text.includes("어깨") && (text.includes("통증") || text.includes("정형외과")))       { treatmentId = "shoulder";            treatmentName = "어깨통증치료"; }
    else if (text.includes("프롤로") || text.includes("PRP주사"))                                 { treatmentId = "prolotherapy";        treatmentName = "프롤로주사치료"; }
    else if (text.includes("전방십자인대") || text.includes("십자인대"))                          { treatmentId = "acl";                 treatmentName = "전방십자인대치료"; }
    // ortho v1.1 신규 — 고관절
    else if (text.includes("고관절") || text.includes("대퇴골두") || (text.includes("사타구니") && text.includes("통증"))) { treatmentId = "hip"; treatmentName = "고관절치료"; }
    else if (text.includes("족저근막"))                                                            { treatmentId = "plantar_fasciitis";   treatmentName = "족저근막염치료"; }
    else if (text.includes("발목인대"))                                                            { treatmentId = "ankle_sprain";        treatmentName = "발목인대손상치료"; }
    // ortho v1.1 신규 — 무지외반증
    else if (text.includes("무지외반증") || text.includes("무지외반") || text.includes("엄지발가락변형")) { treatmentId = "bunion"; treatmentName = "무지외반증치료"; }
    else if (text.includes("테니스엘보") || text.includes("골프엘보"))                            { treatmentId = "elbow";               treatmentName = "팔꿈치통증치료"; }
    else if (text.includes("손목터널") || text.includes("수근관"))                                { treatmentId = "carpal_tunnel";       treatmentName = "손목터널증후군치료"; }
    // ortho v1.1 신규 — 압박골절 (척추압박골절은 신경외과에도 있으므로 정형외과 명시 시만)
    else if ((text.includes("압박골절") || text.includes("척추성형술") || text.includes("풍선척추성형")) && !text.includes("신경외과")) { treatmentId = "compression_fracture"; treatmentName = "허리압박골절치료"; }
    else if (text.includes("골절") && text.includes("재활"))                                      { treatmentId = "fracture_rehab";      treatmentName = "골절재활치료"; }
    else if (text.includes("측만증"))                                                              { treatmentId = "scoliosis";           treatmentName = "척추측만증치료"; }
    else if (text.includes("리제네텐"))                                                               { treatmentId = "regenerten";          treatmentName = "리제네텐주사치료"; }
    // pediatrics 진료 인식
    else if (text.includes("독감예방접종") || text.includes("독감접종") || (text.includes("독감") && text.includes("예방접종")))              { treatmentId = "flu";             treatmentName = "독감예방접종"; }
    else if ((text.includes("예방접종") || text.includes("접종")) && (text.includes("아이") || text.includes("소아") || text.includes("아기"))) { treatmentId = "flu";             treatmentName = "독감예방접종"; }
    else if ((text.includes("장염") || text.includes("구토") || text.includes("설사")) && (text.includes("아이") || text.includes("소아") || text.includes("아기"))) { treatmentId = "gastroenteritis"; treatmentName = "소아 장염"; }
    else if ((text.includes("고열") || text.includes("열성경련")) && (text.includes("아이") || text.includes("소아") || text.includes("아기"))) { treatmentId = "fever";           treatmentName = "고열·열성경련"; }
    else if ((text.includes("폐렴") || text.includes("기관지염")) && (text.includes("아이") || text.includes("소아") || text.includes("아기"))) { treatmentId = "pneumonia";       treatmentName = "소아 폐렴·기관지염"; }
    else if (text.includes("중이염") && (text.includes("아이") || text.includes("소아") || text.includes("아기") || text.includes("소아과")))  { treatmentId = "otitis";          treatmentName = "소아 중이염"; }
    else if ((text.includes("아토피") || text.includes("습진")) && (text.includes("아이") || text.includes("소아") || text.includes("아기") || text.includes("소아과"))) { treatmentId = "atopy"; treatmentName = "소아 아토피"; }
    else if (text.includes("영유아건강검진") || text.includes("영유아 건강검진") || (text.includes("건강검진") && (text.includes("개월") || text.includes("소아") || text.includes("아이")))) { treatmentId = "growth"; treatmentName = "영유아 건강검진"; }
    else if (text.includes("수족구") || text.includes("수두"))                                                                                    { treatmentId = "infectious";      treatmentName = "수족구·수두"; }
    else if ((text.includes("천식") || text.includes("알레르기비염")) && (text.includes("아이") || text.includes("소아") || text.includes("아기"))) { treatmentId = "asthma";         treatmentName = "소아 천식·알레르기"; }
    // gastro 진료 인식
    // gastro v1.1 신규 — 수면내시경·암검진은 일반 내시경 키워드보다 우선 매칭
    else if (text.includes("수면내시경") || text.includes("무통내시경") || (text.includes("수면") && text.includes("내시경")) || text.includes("프로포폴내시경")) { treatmentId = "sedation_endoscopy"; treatmentName = "수면내시경"; }
    else if (text.includes("위암검진") || text.includes("위암 검진") || (text.includes("위암") && (text.includes("조기진단") || text.includes("가족력") || text.includes("정밀")))) { treatmentId = "gastric_cancer"; treatmentName = "위암 검진"; }
    else if (text.includes("대장암검진") || text.includes("대장암 검진") || (text.includes("대장암") && (text.includes("조기진단") || text.includes("가족력") || text.includes("분변잠혈"))) || text.includes("분변잠혈")) { treatmentId = "colorectal_cancer"; treatmentName = "대장암 검진"; }
    else if (text.includes("위내시경") || (text.includes("내시경") && text.includes("위")))                                              { treatmentId = "gastroscopy";     treatmentName = "위내시경"; }
    else if (text.includes("대장내시경") || (text.includes("내시경") && text.includes("대장")))                                          { treatmentId = "colonoscopy";     treatmentName = "대장내시경"; }
    else if (text.includes("역류성식도염") || text.includes("역류성 식도염") || (text.includes("역류") && text.includes("식도")))         { treatmentId = "gerd";            treatmentName = "역류성 식도염"; }
    else if (text.includes("헬리코박터"))                                                                                                  { treatmentId = "helicobacter";    treatmentName = "헬리코박터 제균치료"; }
    else if (text.includes("위궤양") || text.includes("십이지장궤양") || text.includes("위 궤양"))                                        { treatmentId = "peptic_ulcer";    treatmentName = "위궤양·십이지장궤양"; }
    // gastro v1.1 신규 — 장상피화생 (위 카테고리, 위궤양 다음)
    else if (text.includes("장상피화생") || text.includes("위암전구"))                                                                    { treatmentId = "intestinal_metaplasia"; treatmentName = "장상피화생"; }
    else if (text.includes("과민성대장") || text.includes("IBS") || (text.includes("과민성") && text.includes("장")))                    { treatmentId = "ibs";             treatmentName = "과민성대장증후군"; }
    else if (text.includes("크론병") || text.includes("궤양성대장염") || text.includes("궤양성 대장염") || text.includes("IBD"))          { treatmentId = "ibd";             treatmentName = "염증성 장질환(크론병·궤양성 대장염)"; }
    // gastro v1.1 신규 — 치질·만성변비
    else if (text.includes("치질") || text.includes("치핵") || text.includes("내치핵") || text.includes("외치핵") || (text.includes("항문") && (text.includes("출혈") || text.includes("통증")))) { treatmentId = "hemorrhoid"; treatmentName = "치질·치핵치료"; }
    else if ((text.includes("만성변비") || (text.includes("변비") && (text.includes("락툴로오즈") || text.includes("자극성") || text.includes("기능성") || text.includes("바이오피드백")))) && !text.includes("소아") && !text.includes("아이") && !text.includes("아기") && !text.includes("한의원")) { treatmentId = "chronic_constipation"; treatmentName = "만성변비치료"; }
    else if (text.includes("지방간"))                                                                                                      { treatmentId = "fatty_liver";     treatmentName = "지방간"; }
    else if (text.includes("B형간염") || text.includes("C형간염") || text.includes("B형 간염") || text.includes("C형 간염"))              { treatmentId = "hepatitis";       treatmentName = "바이러스 간염(B형·C형)"; }
    else if (text.includes("간경변") || text.includes("간경화"))                                                                          { treatmentId = "cirrhosis";       treatmentName = "간경변"; }
    // gastro v1.1 신규 — 위·식도 정맥류
    else if (text.includes("식도정맥류") || text.includes("위정맥류") || (text.includes("정맥류") && (text.includes("결찰") || text.includes("간경변") || text.includes("토혈")))) { treatmentId = "esophageal_varices"; treatmentName = "위·식도 정맥류"; }
    else if (text.includes("담석") || text.includes("담낭염"))                                                                            { treatmentId = "gallstone";       treatmentName = "담석·담낭염"; }
    else if (text.includes("췌장염"))                                                                                                      { treatmentId = "pancreatitis";    treatmentName = "췌장염"; }
    else if (text.includes("소화불량") && !text.includes("한") && !text.includes("담적"))                                                 { treatmentId = "dyspepsia";       treatmentName = "기능성 소화불량"; }
    else if (text.includes("대장용종") || text.includes("대장 용종") || (text.includes("용종") && text.includes("대장")))                 { treatmentId = "colon_polyp";     treatmentName = "대장 용종"; }
    else if (text.includes("복부초음파") || text.includes("복부 초음파"))                                                                  { treatmentId = "abdominal_us";    treatmentName = "복부 초음파"; }
    else if (text.includes("ADHD") || text.includes("주의력결핍") || (text.includes("발달장애") && (text.includes("아이") || text.includes("소아"))))                               { treatmentId = "adhd";             treatmentName = "소아 ADHD·발달장애"; }
    else if (text.includes("황달") || text.includes("귀교정") || (text.includes("탈구") && (text.includes("아기") || text.includes("영아"))) || (text.includes("신생아") && !text.includes("접종"))) { treatmentId = "newborn"; treatmentName = "신생아·영아 진료"; }
    else if (text.includes("성조숙증") || text.includes("조기성징"))                                                                                                                { treatmentId = "precocious_puberty"; treatmentName = "성조숙증"; }
    else if ((text.includes("변비") || text.includes("변을 못 봐")) && (text.includes("아이") || text.includes("소아") || text.includes("아기")))                                  { treatmentId = "constipation";    treatmentName = "소아 변비"; }
    else if ((text.includes("빈혈") || text.includes("철분")) && (text.includes("아이") || text.includes("소아") || text.includes("아기")))                                        { treatmentId = "anemia";          treatmentName = "소아 빈혈"; }
    // pediatrics v1.1 신규 추가 — 비염·구내염·야뇨증·키성장·RSV·결막염·소아비만
    else if ((text.includes("비염") || text.includes("축농증") || text.includes("부비동염") || text.includes("코막힘")) && (text.includes("아이") || text.includes("소아") || text.includes("아기") || text.includes("소아과"))) { treatmentId = "rhinitis"; treatmentName = "소아 비염·축농증"; }
    else if (text.includes("헤르판지나") || (text.includes("구내염") && (text.includes("아이") || text.includes("소아") || text.includes("아기") || text.includes("소아과")))) { treatmentId = "stomatitis"; treatmentName = "구내염·헤르판지나"; }
    else if (text.includes("야뇨증") || (text.includes("야뇨") && (text.includes("아이") || text.includes("소아") || text.includes("아기")))) { treatmentId = "enuresis"; treatmentName = "소아 야뇨증"; }
    else if (text.includes("키성장") || text.includes("성장호르몬") || text.includes("저신장") || (text.includes("성장판") && (text.includes("아이") || text.includes("소아")))) { treatmentId = "growth_hormone"; treatmentName = "소아 키성장클리닉"; }
    else if (text.includes("RSV") || text.includes("모세기관지염") || (text.includes("쌕쌕") && (text.includes("아이") || text.includes("아기") || text.includes("영아")))) { treatmentId = "bronchiolitis"; treatmentName = "모세기관지염·RSV"; }
    else if ((text.includes("결막염") || text.includes("다래끼") || text.includes("눈곱")) && (text.includes("아이") || text.includes("소아") || text.includes("아기") || text.includes("소아과"))) { treatmentId = "conjunctivitis"; treatmentName = "소아 결막염·다래끼"; }
    else if ((text.includes("소아비만") || text.includes("어린이비만") || (text.includes("비만") && (text.includes("아이") || text.includes("소아") || text.includes("아기")))) && !text.includes("한의원")) { treatmentId = "obesity"; treatmentName = "소아 비만관리"; }
    // general 진료 인식
    else if (text.includes("고혈압") && !text.includes("소아"))                                                                           { treatmentId = "hypertension";       treatmentName = "고혈압"; }
    else if ((text.includes("당뇨") || text.includes("HbA1c") || text.includes("혈당")) && !text.includes("소아"))                        { treatmentId = "diabetes";           treatmentName = "당뇨"; }
    // general v1.1 신규 — 통풍 (고지혈증보다 위 배치)
    else if (text.includes("통풍") || text.includes("요산") || text.includes("알로퓨리놀") || text.includes("페북소스타트"))               { treatmentId = "gout";               treatmentName = "요산·통풍치료"; }
    // general v1.1 신규 — 심혈관 정밀 관리 (고지혈증보다 위 배치)
    else if (text.includes("심혈관") || text.includes("이상지질혈증") || text.includes("경동맥초음파") || text.includes("관상동맥CT") || (text.includes("LDL") && (text.includes("정밀") || text.includes("강화") || text.includes("위험")))) { treatmentId = "cardiovascular"; treatmentName = "이상지질혈증·심혈관 관리"; }
    else if (text.includes("고지혈증") || text.includes("콜레스테롤") || text.includes("LDL"))                                            { treatmentId = "dyslipidemia";       treatmentName = "고지혈증"; }
    // general v1.1 신규 — 남성갱년기 호르몬 (내과 한정, 비뇨기과와 분리)
    else if ((text.includes("남성갱년기") || text.includes("테스토스테론") || text.includes("남성호르몬")) && (text.includes("내과") || text.includes("가정의학") || text.includes("호르몬") || text.includes("만성피로"))) { treatmentId = "male_menopause"; treatmentName = "남성갱년기·호르몬 관리"; }
    else if (text.includes("갑상선") && (text.includes("기능") || text.includes("TSH") || text.includes("저하") || text.includes("항진"))) { treatmentId = "thyroid";            treatmentName = "갑상선 기능이상"; }
    // general v1.1 신규 — 정밀검진 (기존 건강검진보다 우선)
    else if (text.includes("정밀검진") || text.includes("프리미엄검진") || (text.includes("종합검진") && (text.includes("패키지") || text.includes("정밀") || text.includes("CT") || text.includes("MRI")))) { treatmentId = "comprehensive_checkup"; treatmentName = "종합검진·정밀검진"; }
    else if ((text.includes("건강검진") || text.includes("종합검진")) && !text.includes("소아") && !text.includes("영유아"))               { treatmentId = "checkup";            treatmentName = "건강검진"; }
    // general v1.1 신규 — 대상포진 예방접종 (기존 대상포진 진료보다 우선)
    else if (text.includes("싱그릭스") || text.includes("조스타박스") || (text.includes("대상포진") && (text.includes("예방접종") || text.includes("백신") || text.includes("접종")))) { treatmentId = "shingles_vaccine"; treatmentName = "대상포진 예방접종"; }
    else if (text.includes("대상포진"))                                                                                                    { treatmentId = "shingles";           treatmentName = "대상포진"; }
    // general v1.1 신규 — 코로나 후유증 (만성피로보다 우선)
    else if (text.includes("롱코비드") || text.includes("코로나후유증") || text.includes("코로나 후유증") || text.includes("브레인포그") || (text.includes("코로나") && (text.includes("후유증") || text.includes("만성") || text.includes("피로")))) { treatmentId = "long_covid"; treatmentName = "코로나 후유증·롱코비드"; }
    else if (text.includes("수액") || text.includes("영양주사") || text.includes("마이어스") || text.includes("백옥주사"))                 { treatmentId = "iv_therapy";         treatmentName = "수액·영양주사"; }
    else if ((text.includes("만성피로") || text.includes("번아웃")) && !text.includes("소아") && !text.includes("코로나"))                 { treatmentId = "fatigue";            treatmentName = "만성피로"; }
    else if ((text.includes("독감") || text.includes("타미플루")) && !text.includes("소아") && !text.includes("아이") && !text.includes("예방접종")) { treatmentId = "flu_adult"; treatmentName = "독감·감기(성인)"; }
    // general v1.1 신규 — 알레르기 검사
    else if ((text.includes("알레르기검사") || text.includes("MAST검사") || text.includes("피부반응검사") || text.includes("알레르기면역치료") || (text.includes("알레르기") && (text.includes("원인") || text.includes("정밀") || text.includes("검사")))) && !text.includes("소아") && !text.includes("아이")) { treatmentId = "allergy"; treatmentName = "알레르기 검사·관리"; }
    else if (text.includes("비타민D") || text.includes("비타민 D"))                                                                       { treatmentId = "vitamin_d";          treatmentName = "비타민D 결핍"; }
    else if ((text.includes("빈혈")) && !text.includes("소아") && !text.includes("아이"))                                                  { treatmentId = "anemia_adult";       treatmentName = "빈혈(성인)"; }
    else if (text.includes("금연") || text.includes("챔픽스"))                                                                            { treatmentId = "smoking_cessation";  treatmentName = "금연 클리닉"; }
    else if ((text.includes("마운자로") || text.includes("위고비") || text.includes("삭센다") || text.includes("비만")) && !text.includes("한의원")) { treatmentId = "weight_loss"; treatmentName = "비만·다이어트 치료"; }
    else if (text.includes("불면증") || text.includes("수면장애") || text.includes("수면제"))                                              { treatmentId = "insomnia";           treatmentName = "수면 장애"; }
    else if (text.includes("생활습관병") || (text.includes("고혈압") && text.includes("당뇨")))                                           { treatmentId = "lifestyle_disease";  treatmentName = "생활습관병 관리"; }
    // obgyn 진료 인식
    else if (text.includes("자궁근종"))                                                                                                    { treatmentId = "uterine_fibroid";    treatmentName = "자궁근종"; }
    else if (text.includes("난소낭종") || text.includes("난소물혹"))                                                                      { treatmentId = "ovarian_cyst";       treatmentName = "난소낭종"; }
    // obgyn v1.1 신규 — 여성암 종합검진 (자궁경부암보다 우선 매칭)
    else if (text.includes("여성암검진") || text.includes("여성암 검진") || (text.includes("여성암") && (text.includes("종합") || text.includes("정밀"))) || text.includes("CA-125") || text.includes("난소암표지자")) { treatmentId = "female_cancer_screening"; treatmentName = "여성암 종합검진"; }
    else if (text.includes("자궁경부암") || (text.includes("HPV") && !text.includes("백신") && text.includes("검진")))                   { treatmentId = "cervical_cancer";    treatmentName = "자궁경부암 검진·HPV"; }
    // obgyn v1.1 신규 — 생리통·자궁선근증 (생리불순보다 우선)
    else if (text.includes("자궁선근증") || (text.includes("생리통") && (text.includes("심한") || text.includes("진통제") || text.includes("산부인과") || text.includes("치료")))) { treatmentId = "dysmenorrhea"; treatmentName = "생리통·자궁선근증"; }
    else if (text.includes("생리불순") || text.includes("무월경") || (text.includes("생리") && text.includes("불규칙")))                  { treatmentId = "menstrual_disorder"; treatmentName = "생리불순·무월경"; }
    // obgyn v1.1 신규 — 조기난소부전 (난임·갱년기보다 우선)
    else if (text.includes("조기난소부전") || text.includes("이른폐경") || text.includes("이른 폐경") || (text.includes("폐경") && (text.includes("30대") || text.includes("40대초") || text.includes("조기"))) || (text.includes("난소") && text.includes("나이"))) { treatmentId = "premature_menopause"; treatmentName = "이른 폐경·조기난소부전"; }
    else if (text.includes("난임") || text.includes("가임력") || text.includes("AMH"))                                                    { treatmentId = "fertility";          treatmentName = "난임·가임력 검사"; }
    // obgyn v1.1 신규 — 임신 중기·후기 (임신초기보다 우선)
    else if (text.includes("임신중기") || text.includes("임신 중기") || text.includes("임신후기") || text.includes("임신 후기") || text.includes("정밀초음파") || text.includes("기형아검사") || text.includes("임신성당뇨") || text.includes("NST검사") || text.includes("입체초음파") || (text.includes("임신") && (text.includes("24주") || text.includes("28주") || text.includes("36주")))) { treatmentId = "prenatal_late"; treatmentName = "임신 중기·후기 검진"; }
    else if (text.includes("임신초기") || text.includes("임신 초기") || text.includes("NT초음파") || (text.includes("임신") && text.includes("검진"))) { treatmentId = "prenatal"; treatmentName = "임신 초기 검진"; }
    // obgyn v1.1 신규 — 출산·분만
    else if (text.includes("자연분만") || text.includes("제왕절개") || text.includes("무통분만") || text.includes("출산후기") || (text.includes("분만") && !text.includes("진통의학"))) { treatmentId = "delivery"; treatmentName = "출산·분만"; }
    else if (text.includes("질염"))                                                                                                        { treatmentId = "vaginitis";          treatmentName = "질염"; }
    else if (text.includes("갱년기") && (text.includes("산부인과") || text.includes("폐경") || text.includes("HRT")))                    { treatmentId = "menopause";          treatmentName = "갱년기·폐경"; }
    else if (text.includes("미레나") || text.includes("루프") || (text.includes("피임") && !text.includes("한의원")))                    { treatmentId = "contraception";      treatmentName = "피임·루프 시술"; }
    else if (text.includes("자궁내막증") || text.includes("초콜릿낭종") || text.includes("초콜릿 낭종"))                                  { treatmentId = "endometriosis";      treatmentName = "자궁내막증"; }
    else if ((text.includes("HPV") && text.includes("백신")) || text.includes("가다실") || text.includes("서바릭스"))                    { treatmentId = "hpv_vaccine";        treatmentName = "HPV 백신"; }
    else if (text.includes("유방초음파") || text.includes("유방 초음파") || text.includes("유방멍울") || text.includes("유방 멍울"))      { treatmentId = "breast_us";          treatmentName = "유방 초음파·멍울"; }
    else if (text.includes("다낭성난소") || text.includes("다낭성 난소") || text.includes("PCOS"))                                        { treatmentId = "pcos";               treatmentName = "다낭성 난소 증후군"; }
    // obgyn v1.1 신규 — 요실금·골반저 (비뇨기과 요실금과 분리)
    else if ((text.includes("요실금") && (text.includes("산부인과") || text.includes("출산후") || text.includes("출산 후") || text.includes("골반저") || text.includes("케겔") || text.includes("여성"))) || text.includes("골반장기탈출") || text.includes("골반저치료") || text.includes("TOT수술") || text.includes("TVT수술")) { treatmentId = "urinary_incontinence"; treatmentName = "요실금·골반저 치료"; }
    // obgyn v1.1 신규 — 부인과 정기 초음파 검진
    else if (text.includes("부인과초음파") || text.includes("부인과 초음파") || text.includes("자궁초음파") || text.includes("질초음파") || (text.includes("부인과") && text.includes("정기검진"))) { treatmentId = "pelvic_us"; treatmentName = "부인과 초음파 정기검진"; }
    else if (text.includes("소음순") || text.includes("콘딜로마") || text.includes("외음부"))                                             { treatmentId = "vulvar";             treatmentName = "외음부 질환·소음순"; }
    else if (text.includes("자궁경부이형성증") || text.includes("자궁경부 이형성증") || text.includes("CIN") || text.includes("LEEP"))    { treatmentId = "cervical_dysplasia"; treatmentName = "자궁경부 이형성증"; }
    else if (text.includes("BCG") || text.includes("DTaP") || text.includes("MMR") || (text.includes("예방접종") && (text.includes("개월") || text.includes("신생아") || text.includes("스케줄")))) { treatmentId = "vaccination"; treatmentName = "영유아 예방접종"; }
    // pain 치료 인식
    else if ((text.includes("허리디스크") || text.includes("허리") && text.includes("신경차단")) && text.includes("통증의학과")) { treatmentId = "lumbar_nerve_block";      treatmentName = "허리디스크 신경차단술"; }
    else if ((text.includes("목디스크") || text.includes("목") && text.includes("신경차단")) && text.includes("통증의학과"))   { treatmentId = "cervical_nerve_block";   treatmentName = "목디스크 신경차단술"; }
    else if (text.includes("척추관협착증") && text.includes("통증의학과"))                                                    { treatmentId = "spinal_stenosis_pain";   treatmentName = "척추관협착증 시술"; }
    else if (text.includes("프롤로") && text.includes("통증의학과"))                                                           { treatmentId = "prolotherapy_pain";      treatmentName = "프롤로 주사"; }
    else if (text.includes("PRP") && text.includes("통증의학과"))                                                             { treatmentId = "prp_pain";               treatmentName = "PRP 주사"; }
    else if (text.includes("도수치료") && text.includes("통증의학과"))                                                         { treatmentId = "manual_therapy_pain";    treatmentName = "도수치료"; }
    else if (text.includes("체외충격파") && text.includes("통증의학과"))                                                       { treatmentId = "shockwave_pain";         treatmentName = "체외충격파"; }
    else if ((text.includes("무릎") && text.includes("관절주사")) || (text.includes("무릎") && text.includes("히알루론산")))   { treatmentId = "knee_injection";         treatmentName = "무릎 관절 주사"; }
    else if ((text.includes("어깨") && text.includes("주사")) && text.includes("통증의학과"))                                  { treatmentId = "shoulder_injection";     treatmentName = "어깨 주사 치료"; }
    else if (text.includes("오십견") && text.includes("수압팽창"))                                                             { treatmentId = "frozen_shoulder";        treatmentName = "오십견 수압팽창술"; }
    else if (text.includes("고주파") && (text.includes("열응고") || text.includes("통증의학과")))                              { treatmentId = "radiofrequency_ablation"; treatmentName = "고주파 열응고술"; }
    else if (text.includes("두통") && text.includes("신경차단"))                                                               { treatmentId = "headache_nerve_block";   treatmentName = "두통 신경차단"; }
    else if (text.includes("대상포진") && text.includes("신경통"))                                                             { treatmentId = "postherpetic_neuralgia"; treatmentName = "대상포진 후 신경통"; }
    else if (text.includes("족저근막") && text.includes("통증의학과"))                                                         { treatmentId = "plantar_fasciitis_pain"; treatmentName = "족저근막염 치료"; }
    else if (text.includes("IMS") || text.includes("트리거포인트"))                                                            { treatmentId = "ims_trigger";            treatmentName = "근막통증 IMS 치료"; }
    else if (text.includes("꼬리뼈") || text.includes("미골"))                                                                 { treatmentId = "coccyx_pelvic_pain";     treatmentName = "꼬리뼈·골반 통증 치료"; }
    else if ((text.includes("테니스엘보") || text.includes("손목건초염")) && text.includes("통증의학과"))                      { treatmentId = "wrist_elbow_pain";       treatmentName = "손목·팔꿈치 통증 치료"; }
    else if (text.includes("경추성") && text.includes("통증의학과"))                                                           { treatmentId = "cervicogenic_pain";      treatmentName = "경추성 어깨·목 통증"; }
    else if (text.includes("발목인대") && text.includes("통증의학과"))                                                         { treatmentId = "ankle_pain";             treatmentName = "발목 인대 손상 치료"; }
    else if (text.includes("신경병증") || text.includes("신경통") && text.includes("통증의학과"))                              { treatmentId = "neuropathic_pain";       treatmentName = "신경병증성 통증"; }
    else if (text.includes("암성통증") || text.includes("암성 통증"))                                                          { treatmentId = "cancer_pain";            treatmentName = "암성 통증 관리"; }
    // pain v1.1 신규 — 신경성형술·만성통증·TMD·섬유근육통·좌골신경통·줄기세포
    else if ((text.includes("신경성형술") || text.includes("PEN시술") || text.includes("PEN 시술") || text.includes("신경유착박리")) && (text.includes("통증의학과") || text.includes("디스크"))) { treatmentId = "nerve_plasty"; treatmentName = "신경성형술(PEN)"; }
    else if ((text.includes("만성요통") || text.includes("만성통증") || text.includes("난치성통증") || text.includes("통증클리닉")) && !text.includes("한의원") && !text.includes("정신")) { treatmentId = "chronic_pain"; treatmentName = "만성요통·만성통증 클리닉"; }
    else if (text.includes("턱관절") || text.includes("TMD") || (text.includes("턱") && (text.includes("딱딱거림") || text.includes("개구장애") || text.includes("통증")))) { treatmentId = "tmd"; treatmentName = "턱관절 통증치료(TMD)"; }
    else if (text.includes("섬유근육통") || text.includes("전신통증") || (text.includes("만성") && text.includes("전신통증"))) { treatmentId = "fibromyalgia"; treatmentName = "섬유근육통"; }
    else if (text.includes("좌골신경통") || text.includes("이상근증후군") || (text.includes("엉덩이") && (text.includes("저림") || text.includes("당김")))) { treatmentId = "sciatica"; treatmentName = "좌골신경통 치료"; }
    else if ((text.includes("무릎줄기세포") || text.includes("연골재생") || text.includes("자가줄기세포") || text.includes("카티스템")) && !text.includes("정형외과")) { treatmentId = "stem_cell_knee"; treatmentName = "무릎 줄기세포·연골재생"; }
    // oriental 치료 인식
    else if (text.includes("도수치료"))                                                                                     { treatmentId = text.includes("실비") || text.includes("정형") ? "manual_therapy_ortho" : "manual_therapy"; treatmentName = "도수치료"; }
    else if (text.includes("추나"))                                                                                         { treatmentId = "chuna";               treatmentName = "추나요법"; }
    else if (text.includes("한방다이어트") || text.includes("한방 다이어트") || text.includes("마운자로") && text.includes("한")) { treatmentId = "oriental_diet";    treatmentName = "한방다이어트"; }
    else if (text.includes("출산후다이어트") || text.includes("출산 후 다이어트"))                                          { treatmentId = "oriental_diet";       treatmentName = "한방다이어트"; }
    else if (text.includes("침치료") || (text.includes("침") && text.includes("한의원")))                                  { treatmentId = "acupuncture";         treatmentName = "침치료"; }
    else if (text.includes("한약") && !text.includes("다이어트") && !text.includes("산후") && !text.includes("갱년기"))    { treatmentId = "herbal_medicine";     treatmentName = "한약처방"; }
    else if (text.includes("공진단"))                                                                                       { treatmentId = "gongjindan";          treatmentName = "공진단처방"; }
    else if (text.includes("부항"))                                                                                         { treatmentId = "cupping";             treatmentName = "부항치료"; }
    else if (text.includes("뜸"))                                                                                           { treatmentId = "moxibustion";         treatmentName = "뜸치료"; }
    else if (text.includes("산후") && text.includes("한"))                                                                  { treatmentId = "postpartum";          treatmentName = "산후한방치료"; }
    else if (text.includes("아토피") || (text.includes("피부") && text.includes("한의원") && !text.includes("성형")))      { treatmentId = "skin_disease";        treatmentName = "한방피부질환치료"; }
    else if ((text.includes("기미") || text.includes("흑자")) && text.includes("한의원"))                                  { treatmentId = "skin_disease";        treatmentName = "한방피부질환치료"; }
    else if (text.includes("갱년기"))                                                                                       { treatmentId = "menopause";           treatmentName = "갱년기한약치료"; }
    else if (text.includes("담적") || text.includes("소화불량") && text.includes("한") || text.includes("역류성식도염") && text.includes("한")) { treatmentId = "digestive"; treatmentName = "소화기한방치료"; }
    else if ((text.includes("면역") || text.includes("감기") || text.includes("비염")) && text.includes("한의원"))         { treatmentId = "immunity";            treatmentName = "면역한방치료"; }
    else if (text.includes("구안와사") || text.includes("안면마비"))                                                        { treatmentId = "facial_palsy";        treatmentName = "구안와사치료"; }
    else if (text.includes("중풍") || text.includes("뇌졸중"))                                                             { treatmentId = "stroke_rehab";        treatmentName = "중풍재활치료"; }
    else if (text.includes("교통사고") && (text.includes("한") || text.includes("한의원")))                                { treatmentId = "traffic_accident";    treatmentName = "교통사고한방치료"; }
    else if ((text.includes("무릎") || text.includes("관절") || text.includes("퇴행")) && text.includes("한"))             { treatmentId = "joint";               treatmentName = "관절한방치료"; }
    else if (text.includes("체외충격파") && !text.includes("비뇨"))                                                        { treatmentId = "shockwave_oriental";  treatmentName = "체외충격파치료"; }
    // oriental v1.3 신규 추가 — 이명·불면·생리·난임·두통·소아
    else if (text.includes("이명") || text.includes("난청") || text.includes("귀울림"))                                    { treatmentId = "tinnitus";            treatmentName = "이명난청치료"; }
    else if (text.includes("불면") && (text.includes("한") || text.includes("한의원") || text.includes("한방")))           { treatmentId = "insomnia";            treatmentName = "불면증한방치료"; }
    else if ((text.includes("수면장애") || text.includes("잠") && text.includes("못")) && text.includes("한"))             { treatmentId = "insomnia";            treatmentName = "불면증한방치료"; }
    else if ((text.includes("생리통") || text.includes("생리불순") || text.includes("PMS") || text.includes("생리전증후군")) && !text.includes("산부인과")) { treatmentId = "menstrual"; treatmentName = "생리통한방치료"; }
    else if ((text.includes("난임") || text.includes("임신준비") || text.includes("시험관") && text.includes("한")) && !text.includes("산부인과")) { treatmentId = "fertility"; treatmentName = "난임한방치료"; }
    else if ((text.includes("편두통") || text.includes("두통")) && (text.includes("한의원") || text.includes("한방")) && !text.includes("신경외과")) { treatmentId = "headache"; treatmentName = "두통한방치료"; }
    else if ((text.includes("틱") || text.includes("ADHD") || text.includes("키크는") || text.includes("성장한약") || text.includes("소아") && text.includes("한")) && !text.includes("정신건강")) { treatmentId = "pediatric"; treatmentName = "소아한방치료"; }
    // derma 시술 인식
    // derma v1.1 신규 — 여드름 흉터·PDT (여드름·모공·흉터보다 우선)
    else if (text.includes("여드름흉터") || text.includes("여드름 흉터") || text.includes("서브시전") || (text.includes("흉터") && (text.includes("치료") || text.includes("피부과")))) { treatmentId = "acne_scar"; treatmentName = "여드름 흉터 치료"; }
    else if (text.includes("PDT") || text.includes("광역동") || (text.includes("여드름") && text.includes("PDT")))                                                                       { treatmentId = "pdt"; treatmentName = "PDT 광역동 치료"; }
    // derma v1.1 신규 — 포텐자 (모공·흉터보다 우선)
    else if (text.includes("포텐자") || text.includes("마이크로니들RF") || text.includes("마이크로니들 RF"))                                                                            { treatmentId = "potenza"; treatmentName = "포텐자"; }
    else if (text.includes("여드름") && (text.includes("피부과") || text.includes("치료") || text.includes("압출") || text.includes("레이저"))) { treatmentId = "acne";           treatmentName = "여드름 치료"; }
    else if (text.includes("레이저토닝") || (text.includes("토닝") && text.includes("레이저")))                                              { treatmentId = "toning";         treatmentName = "레이저토닝"; }
    else if (text.includes("피코레이저") || text.includes("피코") && text.includes("레이저"))                                               { treatmentId = "pico";           treatmentName = "피코레이저"; }
    else if (text.includes("기미") && (text.includes("피부과") || text.includes("레이저") || text.includes("치료")))                         { treatmentId = "melasma";        treatmentName = "기미 치료"; }
    else if (text.includes("색소") && text.includes("레이저"))                                                                               { treatmentId = "pigment";        treatmentName = "색소 레이저"; }
    // derma v1.1 신규 — 다한증 보톡스 (일반 보톡스보다 우선)
    else if (text.includes("다한증") || (text.includes("보톡스") && (text.includes("겨드랑이") || text.includes("땀") || text.includes("다한증"))))                                  { treatmentId = "botox_hyperhidrosis"; treatmentName = "다한증 보톡스"; }
    else if (text.includes("보톡스") && (text.includes("피부과") || text.includes("주름") || text.includes("사각턱") || text.includes("팔자"))) { treatmentId = "botox_derma";   treatmentName = "보톡스"; }
    else if (text.includes("필러") && (text.includes("피부과") || text.includes("볼륨") || text.includes("코") || text.includes("입술")))    { treatmentId = "filler_derma";   treatmentName = "필러"; }
    // derma v1.1 신규 — 인모드 (리프팅 매칭보다 우선)
    else if (text.includes("인모드") || text.includes("인모드FX") || (text.includes("RF리프팅") && !text.includes("울쎄라")))                                                          { treatmentId = "inmode"; treatmentName = "인모드"; }
    else if (text.includes("리프팅") && (text.includes("피부과") || text.includes("울쎄라") || text.includes("슈링크") || text.includes("HIFU"))) { treatmentId = "lifting_derma"; treatmentName = "피부 리프팅"; }
    else if (text.includes("모발이식") || text.includes("탈모") && (text.includes("피부과") || text.includes("치료") || text.includes("주사"))) { treatmentId = "hair";          treatmentName = "탈모 치료"; }
    // derma v1.1 신규 — 건선 (아토피보다 우선)
    else if (text.includes("건선") && !text.includes("한의원"))                                                                                                                          { treatmentId = "psoriasis"; treatmentName = "건선 치료"; }
    else if (text.includes("아토피") && (text.includes("피부과") || text.includes("피부")) && !text.includes("한의원"))                     { treatmentId = "atopy_derma";    treatmentName = "아토피 피부염"; }
    else if ((text.includes("모공") || text.includes("흉터")) && text.includes("레이저"))                                                   { treatmentId = "pore";           treatmentName = "모공·흉터 레이저"; }
    else if (text.includes("IPL") || text.includes("광치료"))                                                                                { treatmentId = "ipl";            treatmentName = "IPL 광치료"; }
    else if (text.includes("스킨부스터") || text.includes("물광주사") || text.includes("쥬베룩") || text.includes("리쥬란"))                  { treatmentId = "skin_booster";   treatmentName = "스킨부스터"; }
    else if (text.includes("피부과") && (text.includes("후기") || text.includes("상담") || text.includes("치료")))                          { treatmentId = "acne";           treatmentName = "피부과 시술"; }
    // 추가 derma 시술 인식
    else if (text.includes("울쎄라"))                                                                                                         { treatmentId = "ulthera";        treatmentName = "울쎄라"; }
    else if (text.includes("써마지"))                                                                                                         { treatmentId = "thermage";       treatmentName = "써마지"; }
    else if (text.includes("슈링크"))                                                                                                         { treatmentId = "shurink";        treatmentName = "슈링크"; }
    else if (text.includes("실리프팅"))                                                                                                       { treatmentId = "silhouette_lift"; treatmentName = "실리프팅"; }
    else if (text.includes("콜소닉") || text.includes("울리지오"))                                                                           { treatmentId = "kolsonik";       treatmentName = "콜소닉·울리지오"; }
    else if (text.includes("쥬베룩") || (text.includes("리쥬란") && text.includes("힐러")))                                                  { treatmentId = "juvelook";       treatmentName = "쥬베룩·리쥬란"; }
    else if (text.includes("레이저제모") || text.includes("제모") && text.includes("레이저") || text.includes("영구제모"))                   { treatmentId = "laser_hair_removal"; treatmentName = "레이저 제모"; }
    else if (text.includes("점빼기") || text.includes("점 빼기") || (text.includes("검버섯") && text.includes("레이저")))                    { treatmentId = "mole_removal";   treatmentName = "점 빼기·검버섯"; }
    else if (text.includes("블랙헤드") && text.includes("피부과"))                                                                           { treatmentId = "bb_glow";        treatmentName = "블랙헤드·각질 관리"; }
    else if (text.includes("뽀띠성형") || text.includes("윤곽주사"))                                                                         { treatmentId = "bbtopping";      treatmentName = "뽀띠성형·윤곽주사"; }
    else if ((text.includes("PRP") || text.includes("자가혈")) && text.includes("피부"))                                                     { treatmentId = "prp";            treatmentName = "PRP·자가혈 시술"; }
    // neuro 진료 인식 — 신경외과 명시 키워드와 함께 들어왔을 때만 잡아 정형/통증/한의원과 충돌 방지
    else if (text.includes("허리디스크") && text.includes("신경외과"))                                                                       { treatmentId = "neuro_disc";       treatmentName = "허리디스크"; }
    else if ((text.includes("척추관협착증") || text.includes("협착증")) && text.includes("신경외과"))                                         { treatmentId = "neuro_stenosis";   treatmentName = "척추관협착증"; }
    else if ((text.includes("목디스크") || text.includes("경추디스크")) && text.includes("신경외과"))                                         { treatmentId = "neuro_neckdisc";   treatmentName = "목디스크"; }
    else if (text.includes("척추압박골절") || text.includes("압박골절"))                                                                       { treatmentId = "neuro_compfx";     treatmentName = "척추압박골절"; }
    else if (text.includes("만성두통") && text.includes("신경외과"))                                                                          { treatmentId = "neuro_headache";   treatmentName = "만성두통"; }
    else if (text.includes("편두통") && text.includes("신경외과"))                                                                            { treatmentId = "neuro_migraine";   treatmentName = "편두통"; }
    else if (text.includes("삼차신경통"))                                                                                                      { treatmentId = "neuro_trigeminal"; treatmentName = "삼차신경통"; }
    else if (text.includes("후두신경통"))                                                                                                      { treatmentId = "neuro_occipital";  treatmentName = "후두신경통"; }
    else if (text.includes("군발성두통") || text.includes("군발두통"))                                                                          { treatmentId = "neuro_cluster";    treatmentName = "군발성두통"; }
    else if (text.includes("신경차단술") && text.includes("신경외과") && !text.includes("통증의학과"))                                          { treatmentId = "neuro_block";      treatmentName = "신경차단술"; }
    else if (text.includes("신경성형술") || text.includes("경막외신경성형"))                                                                  { treatmentId = "neuro_neuroplasty"; treatmentName = "경막외신경성형술"; }
    else if (text.includes("고주파신경치료") || (text.includes("고주파") && text.includes("신경외과")))                                        { treatmentId = "neuro_rfa";        treatmentName = "고주파신경치료"; }
    else if (text.includes("FIMS시술") || (text.includes("FIMS") && text.includes("신경외과")))                                                { treatmentId = "neuro_fims";       treatmentName = "FIMS시술"; }
    else if (text.includes("체외충격파") && text.includes("신경외과"))                                                                         { treatmentId = "neuro_eswt";       treatmentName = "체외충격파(신경통증)"; }
    else if (text.includes("수근관증후군") && text.includes("신경외과"))                                                                       { treatmentId = "neuro_carpal";     treatmentName = "수근관증후군"; }
    else if (text.includes("척골신경") || (text.includes("팔꿈치터널") && text.includes("신경외과")))                                          { treatmentId = "neuro_ulnar";      treatmentName = "척골신경포착증후군"; }
    else if (text.includes("말초신경병증") || (text.includes("당뇨신경병증") && text.includes("신경외과")))                                    { treatmentId = "neuro_peripheral"; treatmentName = "말초신경병증"; }
    else if ((text.includes("어지럼") || text.includes("현훈")) && text.includes("신경외과"))                                                  { treatmentId = "neuro_dizzy";      treatmentName = "어지럼증"; }
    else if (text.includes("뇌MRI") || text.includes("뇌검진") || text.includes("뇌혈관검사"))                                                 { treatmentId = "neuro_brainmri";   treatmentName = "뇌MRI검진"; }
    else if (text.includes("안면경련") || (text.includes("얼굴떨림") && text.includes("신경외과")))                                            { treatmentId = "neuro_facialspasm"; treatmentName = "안면경련"; }
    else if ((text.includes("이명") || text.includes("귀울림")) && text.includes("신경외과"))                                                   { treatmentId = "neuro_tinnitus";   treatmentName = "이명·신경성귀울림"; }
    else if ((text.includes("기억력") || text.includes("건망증") || text.includes("인지기능")) && text.includes("신경외과"))                    { treatmentId = "neuro_memory";     treatmentName = "기억력저하·인지검사"; }
    else if (text.includes("척추수술후") || text.includes("FBSS") || (text.includes("수술후통증") && text.includes("신경외과")))                 { treatmentId = "neuro_fbss";       treatmentName = "척추수술후증후군"; }
    else if (text.includes("좌골신경통") || (text.includes("엉덩이통증") && text.includes("신경외과")))                                          { treatmentId = "neuro_sciatica";   treatmentName = "좌골신경통"; }
    // psy 진료 인식 — 충돌 가능 키워드는 정신과/심리/상담 단어 동반 시에만
    // 더 긴 키워드를 먼저, 짧은 키워드를 나중에 (인수인계 PART 3-3 패턴)
    else if (text.includes("산후우울"))                                                                                                          { treatmentId = "psy_postpartum";   treatmentName = "산후 정신건강 진료"; }
    else if ((text.includes("중년") || text.includes("갱년기")) && text.includes("우울"))                                                       { treatmentId = "psy_midlife";      treatmentName = "중년 정신건강 진료"; }
    else if (text.includes("노인") && (text.includes("우울") || text.includes("정신") || text.includes("인지저하")))                            { treatmentId = "psy_senior";       treatmentName = "노인 정신건강 진료"; }
    else if (text.includes("뉴로피드백"))                                                                                                        { treatmentId = "psy_neurofeedback"; treatmentName = "뉴로피드백"; }
    else if (text.includes("rTMS") || text.includes("경두개자기자극"))                                                                           { treatmentId = "psy_rtms";         treatmentName = "rTMS 자기자극치료"; }
    else if (text.includes("MBCT") || text.includes("마음챙김") || text.includes("명상치료"))                                                    { treatmentId = "psy_mbct";         treatmentName = "마음챙김(MBCT)"; }
    else if (text.includes("EMDR") && !text.includes("트라우마"))                                                                                { treatmentId = "psy_emdr";         treatmentName = "EMDR 안구운동치료"; }
    else if (text.includes("CBT") || text.includes("인지행동치료"))                                                                              { treatmentId = "psy_cbt";          treatmentName = "CBT 인지행동치료"; }
    else if (text.includes("트라우마") || text.includes("PTSD") || text.includes("EMDR"))                                                       { treatmentId = "psy_trauma";       treatmentName = "트라우마 상담"; }
    else if (text.includes("애도") || text.includes("사별") || (text.includes("상실") && text.includes("상담")))                                { treatmentId = "psy_grief";        treatmentName = "애도 상담"; }
    else if (text.includes("분노조절") || text.includes("충동조절") || text.includes("간헐적 폭발"))                                             { treatmentId = "psy_anger";        treatmentName = "분노조절 상담"; }
    else if (text.includes("아동 ADHD") || text.includes("아동ADHD") || (text.includes("ADHD") && (text.includes("아동") || text.includes("초등") || text.includes("어린이")))) { treatmentId = "psy_child_adhd"; treatmentName = "아동 ADHD 진료"; }
    else if (text.includes("성인 ADHD") || text.includes("성인ADHD") || (text.includes("ADHD") && (text.includes("정신") || text.includes("성인")))) { treatmentId = "psy_adhd";        treatmentName = "성인 ADHD 진료"; }
    else if (text.includes("강박장애") || text.includes("강박증") || text.includes("OCD"))                                                       { treatmentId = "psy_ocd";          treatmentName = "강박장애 진료"; }
    else if (text.includes("사회불안") || text.includes("사회공포") || text.includes("발표불안") || text.includes("대인기피"))                  { treatmentId = "psy_social";       treatmentName = "사회불안장애 진료"; }
    else if (text.includes("공황장애") || (text.includes("공황") && (text.includes("정신") || text.includes("진료") || text.includes("발작")))) { treatmentId = "psy_panic";        treatmentName = "공황장애 진료"; }
    else if (text.includes("불안장애") || (text.includes("불안") && (text.includes("정신") || text.includes("진료"))))                          { treatmentId = "psy_anxiety";      treatmentName = "불안장애 진료"; }
    else if (text.includes("우울증") || (text.includes("우울") && (text.includes("정신") || text.includes("진료"))))                            { treatmentId = "psy_depression";   treatmentName = "우울증 진료"; }
    else if (text.includes("번아웃") || text.includes("소진증후군"))                                                                             { treatmentId = "psy_burnout";      treatmentName = "번아웃 진료"; }
    else if (text.includes("청소년") && (text.includes("정신") || text.includes("우울") || text.includes("상담")))                              { treatmentId = "psy_teen";         treatmentName = "청소년 정신건강 진료"; }
    else if ((text.includes("부부") || text.includes("관계")) && text.includes("상담") && !text.includes("한의원"))                             { treatmentId = "psy_relation";     treatmentName = "관계 상담"; }
    else if (text.includes("불면증") && !text.includes("한의원") && !text.includes("한방"))                                                     { treatmentId = "psy_insomnia";     treatmentName = "불면증 진료"; }
    // eye 진료 인식 — 안과/안과수술/시력 명시 키워드와 함께 들어왔을 때만 잡아 다른 업종과 충돌 방지
    else if (text.includes("스마일라식") || (text.includes("스마일") && text.includes("라식")))                                                  { treatmentId = "smile_lasik";     treatmentName = "스마일라식"; }
    else if (text.includes("렌즈교환술") || text.includes("RLE") || (text.includes("다초점") && text.includes("인공수정체")))                    { treatmentId = "rle";             treatmentName = "렌즈교환술(RLE)"; }
    else if (text.includes("라식"))                                                                                                                { treatmentId = "lasik";           treatmentName = "라식"; }
    else if (text.includes("라섹"))                                                                                                                { treatmentId = "lasek";           treatmentName = "라섹"; }
    else if (text.includes("ICL") || text.includes("안내렌즈삽입") || text.includes("안내렌즈 삽입") || (text.includes("고도근시") && text.includes("수술"))) { treatmentId = "icl";             treatmentName = "안내렌즈삽입술"; }
    else if (text.includes("백내장"))                                                                                                              { treatmentId = "cataract";        treatmentName = "백내장 수술"; }
    else if (text.includes("노안") && (text.includes("교정") || text.includes("수술") || text.includes("다초점") || text.includes("안과")))      { treatmentId = "presbyopia";      treatmentName = "노안 교정"; }
    else if (text.includes("황반변성"))                                                                                                            { treatmentId = "macular";         treatmentName = "황반변성"; }
    else if (text.includes("당뇨망막") || (text.includes("당뇨") && text.includes("망막")))                                                       { treatmentId = "diabetic_retina"; treatmentName = "당뇨망막병증"; }
    else if (text.includes("녹내장") || (text.includes("안압") && text.includes("안과")))                                                         { treatmentId = "glaucoma";        treatmentName = "녹내장"; }
    else if (text.includes("비문증") || text.includes("날파리증") || (text.includes("눈") && text.includes("점") && text.includes("떠다")))    { treatmentId = "floaters";       treatmentName = "비문증"; }
    else if (text.includes("드림렌즈") || text.includes("OK렌즈") || text.includes("각막굴절교정렌즈"))                                          { treatmentId = "dream_lens";     treatmentName = "드림렌즈"; }
    else if (text.includes("망막") && (text.includes("안과") || text.includes("검진") || text.includes("비문증")))                                { treatmentId = "retina";          treatmentName = "망막 질환"; }
    else if (text.includes("안구건조") || (text.includes("건조") && text.includes("눈")) || (text.includes("IPL") && text.includes("안과")))      { treatmentId = "dry_eye";         treatmentName = "안구건조증"; }
    else if (text.includes("익상편") || text.includes("군날개"))                                                                                   { treatmentId = "pterygium";       treatmentName = "익상편 수술"; }
    else if (text.includes("결막염") || text.includes("알레르기성결막염") || text.includes("유행성결막염"))                                       { treatmentId = "conjunctivitis";  treatmentName = "결막염"; }
    else if (text.includes("다래끼") || (text.includes("눈꺼풀") && text.includes("염")))                                                          { treatmentId = "stye";            treatmentName = "다래끼·눈꺼풀염"; }
    else if (text.includes("사시") && (text.includes("안과") || text.includes("교정") || text.includes("수술") || text.includes("아이")))         { treatmentId = "strabismus";      treatmentName = "사시 교정"; }
    else if (text.includes("드림렌즈") || text.includes("아트로핀") || (text.includes("근시") && text.includes("억제")))                          { treatmentId = "myopia_control";  treatmentName = "근시 진행 억제"; }
    else if (text.includes("약시") || text.includes("가림치료"))                                                                                   { treatmentId = "amblyopia";       treatmentName = "약시 치료"; }
    else if (text.includes("콘택트렌즈") || text.includes("하드렌즈") || (text.includes("소프트렌즈") && text.includes("안과")) || (text.includes("렌즈") && text.includes("처방"))) { treatmentId = "contact_lens";    treatmentName = "콘택트렌즈 처방"; }
    else if (text.includes("안저검사") || (text.includes("안과") && text.includes("정밀검진")) || (text.includes("안과") && text.includes("검진"))) { treatmentId = "eye_checkup";     treatmentName = "안과 정밀검진"; }
    // family 진료 인식 — 가정의학과 명시 키워드와 함께일 때만 (general·한의원·gastro 충돌 방지)
    else if (text.includes("가정의학과") && (text.includes("고혈압") || text.includes("혈압약")))                                              { treatmentId = "hypertension";       treatmentName = "고혈압 관리"; }
    else if (text.includes("가정의학과") && (text.includes("당뇨") || text.includes("혈당") || text.includes("HbA1c")))                          { treatmentId = "diabetes";           treatmentName = "당뇨 관리"; }
    else if (text.includes("가정의학과") && (text.includes("고지혈증") || text.includes("콜레스테롤") || text.includes("LDL") || text.includes("스타틴"))) { treatmentId = "dyslipidemia";    treatmentName = "고지혈증 관리"; }
    else if (text.includes("가정의학과") && (text.includes("종합검진") || text.includes("건강검진") || text.includes("정밀검진")))               { treatmentId = "checkup";            treatmentName = "종합건강검진"; }
    else if (text.includes("가정의학과") && (text.includes("예방접종") || text.includes("백신") || text.includes("대상포진백신") || text.includes("독감백신") || text.includes("싱그릭스"))) { treatmentId = "vaccination";  treatmentName = "예방접종"; }
    else if (text.includes("가정의학과") && (text.includes("감기") || text.includes("몸살") || text.includes("환절기")))                         { treatmentId = "cold";               treatmentName = "감기·몸살"; }
    else if (text.includes("가정의학과") && (text.includes("역류성식도염") || text.includes("위산역류") || text.includes("PPI") || text.includes("속쓰림"))) { treatmentId = "reflux";        treatmentName = "역류성식도염"; }
    else if (text.includes("가정의학과") && (text.includes("과민성대장") || text.includes("IBS") || text.includes("장트러블")))                  { treatmentId = "ibs";                treatmentName = "과민성대장증후군"; }
    else if ((text.includes("가정의학과") || text.includes("내과")) && (text.includes("삭센다") || text.includes("위고비") || text.includes("비만치료") || text.includes("비만 치료"))) { treatmentId = "weight_loss";  treatmentName = "비만치료(삭센다·위고비)"; }
    else if (text.includes("가정의학과") && (text.includes("수액") || text.includes("마늘주사") || text.includes("신데렐라주사") || text.includes("영양수액"))) { treatmentId = "iv_therapy";  treatmentName = "수액치료"; }
    else if (text.includes("가정의학과") && (text.includes("영양주사") || text.includes("비타민주사") || text.includes("면역주사") || text.includes("비타민D 주사"))) { treatmentId = "nutrition_shot"; treatmentName = "영양주사"; }
    else if (text.includes("가정의학과") && (text.includes("금연") || text.includes("챔픽스") || text.includes("금연약")))                       { treatmentId = "smoking_cessation";  treatmentName = "금연클리닉"; }
    else if (text.includes("가정의학과") && (text.includes("만성피로") || text.includes("번아웃") || text.includes("피로관리") || text.includes("피로 관리"))) { treatmentId = "fatigue";       treatmentName = "만성피로 관리"; }
  }
  return { region: region || "", treatmentId, treatmentName }; // 강남 기본값 제거
}

// ============================================================
// 키워드 경쟁 분석 유틸
// ============================================================
const COMPETITION_LABEL = {
  "높음": { emoji: "🔴", text: "경쟁 높음",  desc: "상단 진입 어려움" },
  "중간": { emoji: "🟡", text: "경쟁 중간",  desc: "전략적 접근 필요" },
  "낮음": { emoji: "🟢", text: "경쟁 낮음",  desc: "상단 진입 유리" },
};
const TYPE_LABEL = {
  "롱테일": "📌 롱테일",
  "비교형": "⚖️ 비교형",
  "후기형": "📖 후기형",
  "정보형": "💡 정보형",
  "원본":   "🔤 원본 그대로",
};


// ============================================================
// 키워드 분석 결과 보드 (우측 패널)
// ============================================================
const COMP_COLOR = { 높음: "#E53935", 중간: "#F9A825", 낮음: "#43A047" };
const COMP_BG    = { 높음: "#FFF5F5", 중간: "#FFFDE7", 낮음: "#F1F8E9" };
const COMP_SCORE = { 높음: 5,         중간: 3,          낮음: 1 };

function AnalysisBoard({ analysis, onSelect, selectedIdx, onSelectIdx }) {
  const setSelectedIdx = onSelectIdx; // 외부 state 연결
  const [regionInput, setRegionInput] = useState("");
  if (!analysis) return null;

  // 지역 입력 필요 단계
  if (analysis.needRegion && analysis.pendingSelection) {
    const s = analysis.pendingSelection;
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", background: "#f7f7fb" }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "2px solid #9C27B0",
          padding: "20px 18px", boxShadow: "0 2px 12px rgba(123,31,162,.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9C27B0", marginBottom: 10 }}>
            📍 지역을 입력해주세요
          </div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>
            선택한 방향: <strong>{s.keyword}</strong><br/>
            지역을 입력하면 글에 정확히 반영됩니다.
          </div>
          {/* 자주 쓰는 지역 버튼 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {["강남","압구정","청담","서초","홍대","분당","수원","별내","동탄","인천","부산"].map(r => (
              <button key={r} onClick={() => setRegionInput(r)}
                style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 700,
                  border: regionInput === r ? "2px solid #9C27B0" : "1.5px solid #e0d0f0",
                  background: regionInput === r ? "#F3E5F5" : "#fff",
                  color: regionInput === r ? "#7B1FA2" : "#555",
                  cursor: "pointer", fontFamily: "inherit" }}>
                {r}
              </button>
            ))}
          </div>
          {/* 직접 입력 */}
          <input
            value={regionInput}
            onChange={e => setRegionInput(e.target.value)}
            placeholder="직접 입력 (예: 중랑구, 수원시, 해운대구)"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid #e0d0f0", fontFamily: "inherit",
              fontSize: 13, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { if (regionInput.trim()) onSelect(s, regionInput.trim()); }}
              disabled={!regionInput.trim()}
              style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: regionInput.trim()
                  ? "linear-gradient(135deg,#7B1FA2,#CE93D8)" : "#e8e8ed",
                color: regionInput.trim() ? "#fff" : "#aaa",
                fontSize: 13, fontWeight: 800, cursor: regionInput.trim() ? "pointer" : "default",
                fontFamily: "inherit" }}>
              {regionInput.trim() ? `${regionInput} 으로 작성` : "지역을 선택하세요"}
            </button>
            <button onClick={() => onSelect(s, null)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid #e0d0f0", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              이전으로
            </button>
          </div>
        </div>
      </div>
    );
  }
  const { keyword, competition, suggestions } = analysis;
  const color = COMP_COLOR[competition] || "#888";
  const bg    = COMP_BG[competition]    || "#fafafa";
  const score = COMP_SCORE[competition] || 3;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#f7f7fb", animation: "fadeIn .25s ease" }}>
    {/* 스크롤 영역 */}
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>

      {/* ── 입력 키워드 분석 카드 ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: `2px solid ${color}`,
        padding: "18px 20px", marginBottom: 16,
        boxShadow: `0 3px 14px ${color}22` }}>

        <div style={{ fontSize: 17, fontWeight: 900, color: "#1a1a2e", marginBottom: 12, lineHeight: 1.4 }}>
          {keyword}
        </div>
        {/* 경쟁도 게이지 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: color }}>
              경쟁도 {competition}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#999" }}>{score}/5</span>
          </div>
          <div style={{ height: 10, background: "#f0ecf8", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(score/5)*100}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius: 6, transition: "width .4s ease" }} />
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8,
          background: bg, borderRadius: 9, padding: "12px 14px",
          border: `1px solid ${color}33` }}>
          {competition === "높음" && <>
            <strong style={{color}}>⚠️ 이 키워드는 경쟁이 매우 높습니다.</strong><br/>
            지금 그대로 작성하면 상단 노출이 어렵습니다.<br/>
            <span style={{color:"#7B1FA2",fontWeight:800}}>👇 아래 추천 전략으로 작성하면 노출 확률이 크게 올라갑니다.</span>
          </>}
          {competition === "중간" && <>
            <strong style={{color:"#F9A825"}}>💡 경쟁이 있는 키워드입니다.</strong><br/>
            롱테일 전략으로 보완하면 더 효과적입니다.<br/>
            <span style={{color:"#7B1FA2",fontWeight:800}}>👇 추천 전략을 선택하면 노출 가능성이 높아집니다.</span>
          </>}
          {competition === "낮음" && <>
            <strong style={{color:"#43A047"}}>✅ 이미 좋은 롱테일 키워드입니다.</strong><br/>
            <span style={{color:"#555"}}>지금 바로 작성하셔도 상단 노출에 유리합니다.</span>
          </>}
        </div>
      </div>

      {/* ── 전략 선택 ── */}
      <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", marginBottom: 4 }}>
        🎯 노출 전략을 선택하세요
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        선택한 전략으로 제목·구조·키워드가 자동 최적화됩니다
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {suggestions.map((s, i) => {
          const sc  = COMP_COLOR[s.competition] || "#888";
          const sb  = COMP_BG[s.competition]    || "#fafafa";
          const ss  = COMP_SCORE[s.competition] || 3;
          const sel = selectedIdx === i;
          return (
            <button key={i} onClick={() => setSelectedIdx(sel ? null : i)}
              style={{ textAlign: "left",
                background: sel ? "#F0E6FF" : s.recommended ? "#FAF5FF" : "#fff",
                border: `2px solid ${sel ? "#7B1FA2" : s.recommended ? "#CE93D8" : "#e8e2f5"}`,
                borderRadius: 13, padding: "16px 18px", cursor: "pointer",
                fontFamily: "inherit", transition: "all .15s",
                boxShadow: sel ? "0 3px 14px rgba(123,31,162,.15)" : "none" }}>
              {/* 상단: 타입 뱃지 + 경쟁도 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.recommended && (
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#fff",
                      background: "linear-gradient(135deg,#7B1FA2,#CE93D8)",
                      borderRadius: 6, padding: "3px 9px" }}>★ 추천</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#7B1FA2",
                    background: "#F3E5F5", borderRadius: 6, padding: "3px 10px" }}>
                    {s.type}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: sc,
                  background: sb, border: `1.5px solid ${sc}`,
                  borderRadius: 20, padding: "3px 11px" }}>
                  경쟁 {s.competition}
                </span>
              </div>
              {/* 키워드 */}
              <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1a2e", marginBottom: 6, lineHeight: 1.4 }}>
                {s.keyword}
              </div>
              {/* 전략 설명 */}
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ color: "#7B1FA2", fontWeight: 700 }}>
                  {s.competition === "낮음" ? "✅ 상단 노출 유리 · " : s.competition === "중간" ? "💡 노출 가능 · " : "⚠️ 경쟁 높음 · "}
                </span>
                <span style={{ color: "#666" }}>{s.reason}</span>
              </div>
            </button>
          );
        })}
      </div>

    </div>{/* 스크롤 영역 끝 */}

    {/* 하단 고정 — 전략 선택 + 추천 제목 */}
    {selectedIdx !== null && (() => {
      const s = analysis.suggestions[selectedIdx];
      return (
        <div style={{ flexShrink: 0, background: "#F0E6FF",
          borderTop: "2px solid #9C27B0", padding: "14px 16px",
          animation: "fadeIn .2s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", marginBottom: 6 }}>
            ✅ 선택된 전략
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", marginBottom: 12, lineHeight: 1.4 }}>
            {s.keyword}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onSelect(s, null)}
              style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#4A148C,#9C27B0)", color: "#fff",
                fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 3px 10px rgba(74,20,140,.25)" }}>
              이 전략으로 작성 →
            </button>
            <button onClick={() => setSelectedIdx(null)}
              style={{ flex: "0 0 70px", padding: "13px 0", borderRadius: 10,
                border: "1.5px solid #ccc", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              취소
            </button>
          </div>
        </div>
      );
    })()}
    </div>
  );
}

// ============================================================
// 진행 상태 보드 (우측)
// ============================================================
const DRAFT_KEY = "clinic_blog_draft";

function stageToIndex(stage) {
  if (stage === "welcome" || stage === "treatment") return 0;
  if (stage === "target")     return 1;
  if (stage === "blogtype")   return 2;
  if (stage === "generating") return 3;
  return 4;
}

function StatusBoard({ stage, onResume, onNewStart }) {
  const [draft,    setDraft]    = useState(null);
  

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft(JSON.parse(saved));
    } catch (_) {}
  }, []);

  const activeIdx    = stageToIndex(stage);
  const isGenerating = stage === "generating";
  const stepLabels   = ["시술·지역", "타겟", "글 유형", "생성"];

  const stageGuide = {
    welcome: {
      title: "이렇게 입력하세요",
      items: [
        { q: "어떻게 입력하나요?",         a: "\"강남 쌍꺼풀 후기 써줘\" 처럼 시술명 + 지역으로 입력하세요. 유형은 자동 감지됩니다." },
        { q: "어떤 유형의 글이 만들어지나요?", a: "후기형 · 상담형 · 비교형 3가지를 자동 감지합니다. 생성 후 변경 버튼으로 바꿀 수 있습니다." },
        { q: "생성까지 얼마나 걸리나요?",   a: "약 30~60초 소요됩니다. 6개 섹션을 순서대로 작성합니다." },
        { q: "글 길이는 얼마나 되나요?",    a: "SEO 최적화 기준 2,000자 이상으로 작성됩니다." },
      ],
    },
    treatment: {
      title: "시술 + 지역을 입력하세요",
      items: [
        { q: "지원하는 시술은?",       a: "눈성형 · 코성형 · 리프팅 · 보톡스·필러 · 피부레이저 · 지방·체형" },
        { q: "지역은 꼭 넣어야 하나요?", a: "넣으면 SEO에 유리합니다. 강남·압구정·청담·서초·홍대·분당 등." },
        { q: "입력 예시",              a: "\"강남 자연유착 쌍꺼풀 후기\" / \"압구정 실리프팅 vs 울쎄라\" / \"강남 피코레이저 처음 받았어요\"" },
      ],
    },
    target: {
      title: "타겟이 자동 선택됩니다",
      items: [
        { q: "상담 고민형이란?", a: "수술 전 고민 중인 독자 대상. 전환율이 가장 높습니다. 기본값으로 추천." },
        { q: "시술 후기형이란?", a: "이미 시술을 받은 독자 대상. 결과·회복 중심으로 작성됩니다." },
        { q: "비교 탐색형이란?", a: "여러 선택지를 비교 중인 독자 대상. 비교·결정 과정 중심." },
      ],
    },
    blogtype: {
      title: "글 유형이 자동 선택됩니다",
      items: [
        { q: "후기형이란?",   a: "고민→상담→결과 전 과정을 담는 형태. 가장 보편적." },
        { q: "상담기형이란?", a: "상담 장면 비중이 높은 형태. 신뢰감 형성에 효과적." },
        { q: "비교형이란?",   a: "두 시술을 비교하다 선택하는 과정 중심. \"실리프팅 vs 울쎄라\" 입력 시 자동 적용." },
      ],
    },
    generating: {
      title: "AI가 작성 중입니다 (30~60초)",
      items: [], // GeneratingProgress 컴포넌트가 렌더링 — 이 items는 미사용
    },
  };

  const guide = stageGuide[stage] || stageGuide.welcome;

  return (
    <div key={stage} style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "#f7f7fb", overflowY: "auto",
      animation: "fadeIn .25s ease",
    }}>

      {/* ── 가로 STEP 진행바 ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #ede8f8", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {stepLabels.map((label, i) => {
            const isDone    = i < activeIdx;
            const isActive  = i === activeIdx;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", position: "relative" }}>
                {i < stepLabels.length - 1 && (
                  <div style={{ position: "absolute", top: 15, left: "50%", width: "100%", height: 2,
                    background: isDone ? "#9C27B0" : "#e0d8f0", zIndex: 0, transition: "background .3s" }} />
                )}
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", zIndex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isDone ? 13 : 11, fontWeight: 900,
                  background: isDone ? "linear-gradient(135deg,#7B1FA2,#CE93D8)"
                    : isActive ? "#fff" : "#f0ecf8",
                  border: isActive ? "2.5px solid #9C27B0" : "2px solid transparent",
                  color: isDone ? "#fff" : isActive ? "#7B1FA2" : "#ccc",
                  boxShadow: isActive ? "0 0 0 4px rgba(156,39,176,.12)" : "none",
                  transition: "all .3s",
                  ...(isActive && isGenerating ? { animation: "pulse 1.5s infinite" } : {}),
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: isActive ? 800 : 600,
                  color: isDone || isActive ? "#4A148C" : "#bbb", whiteSpace: "nowrap" }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 이어쓰기 — 생성 완료 후에만 표시 ── */}
      {draft && stage !== "generating" && (
        <div style={{ margin: "12px 14px 0", background: "#fff", borderRadius: 12,
          border: "1.5px solid #CE93D8", padding: "13px 15px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9C27B0", marginBottom: 6 }}>이어쓰기 가능</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e",
            background: "#f9f5ff", borderRadius: 8, padding: "7px 11px", marginBottom: 10 }}>
            {draft.region} {draft.treatmentName}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onResume(draft)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
                fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              이어쓰기
            </button>
            <button onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraft(null); onNewStart(); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9,
                border: "1.5px solid #e0d0f0", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              새로 시작
            </button>
          </div>
        </div>
      )}

      {/* ── 단계별 안내 — 카드 표시 ── */}
      <div style={{ padding: "14px 14px 24px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0",
          marginBottom: 12, letterSpacing: 0.5 }}>
          💬 {guide.title}
        </div>

        {isGenerating ? (
          <GeneratingProgress />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {guide.items.map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12,
                border: "1.5px solid #ede8f8", padding: "14px 16px",
                boxShadow: "0 2px 8px rgba(100,50,180,.04)" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C",
                  marginBottom: 6 }}>
                  {item.q}
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>
                  {item.a}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// AI 진행감 컴포넌트 (대기 화면용)
// 7단계 순차 진행 — 응답이 도착하면 남은 단계를 빠르게 통과 후 onComplete
// ────────────────────────────────────────────────────────────
const GENERATING_STEPS = [
  { icon: "🔍", title: "키워드 경쟁도 분석",      sub: "지역+시술 조합 검색량 확인 중…",                            doneLabel: "분석 완료" },
  { icon: "🛡️", title: "의료광고법 안전 검수",    sub: "치료보장·100%·최고 등 위반 표현 차단 규칙 적용 중…",      doneLabel: "검수 통과" },
  { icon: "🤖", title: "AI 패턴 회피 처리",        sub: "결심·편안·새로운삶 등 AI 표시 표현 제거 중…",              doneLabel: "자연스러운 톤" },
  { icon: "✏️", title: "제목 클릭률 최적화",       sub: "지역+시술+후킹 패턴 조합 생성 중…",                        doneLabel: "최적화 완료" },
  { icon: "📝", title: "본문 6섹션 흐름 분석",     sub: "고민→상담→결정→비교→변화→마무리 자연스럽게 연결 중…",   doneLabel: "흐름 자연" },
  { icon: "📊", title: "SEO QC 5항목 검증",        sub: "글자수·키워드·복합키워드·정보블럭·수치 자동 점검 중…",   doneLabel: "QC 통과" },
  { icon: "📤", title: "네이버 발행 포맷 변환",    sub: "해시태그·이미지 ALT·문단 구분 최종 정리 중…",              doneLabel: "발행 준비 완료" },
];
const STEP_INTERVAL_MS = 4500;   // 통상 진행 속도
const FINISH_INTERVAL_MS = 220;  // 응답 도착 후 남은 단계 빠르게 통과
const FINAL_HOLD_MS = 700;       // 마지막 단계 완료 후 결과 전환까지 대기

// 모듈 스코프 이벤트 버스 — generate 함수가 응답 도착 시 finish 신호를 보냄
const genProgressBus = {
  pendingFinish: null,    // { onComplete } | null  — emitter 측 보관
  finishHandler: null,    // (onComplete) => void   — 컴포넌트가 등록
  // 외부(generate 함수)에서 호출
  signalDone(onComplete) {
    if (typeof this.finishHandler === "function") {
      this.finishHandler(onComplete);
    } else {
      // 진행감 컴포넌트가 없으면 즉시 콜백 (fail-safe)
      try { onComplete && onComplete(); } catch (_) {}
    }
  },
  // 컴포넌트 mount/unmount 시 등록/해제
  setHandler(fn) { this.finishHandler = fn; },
};

function GeneratingProgress() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [allDone, setAllDone]     = useState(false);
  const finishingRef              = useRef(false);
  const onCompleteRef             = useRef(null);

  // 통상 진행: 단계 간격마다 다음 단계로 (마지막 단계 도달하면 정지 — 응답 대기)
  useEffect(() => {
    if (finishingRef.current) return;            // 빠른 마무리 진행 중이면 통상 진행 중지
    if (activeIdx >= GENERATING_STEPS.length - 1) return;
    const t = setTimeout(() => setActiveIdx(i => i + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [activeIdx]);

  // 빠른 마무리 — 외부에서 signalDone 호출 시 시작
  const runFinish = useCallback((onComplete) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    onCompleteRef.current = onComplete;

    const total = GENERATING_STEPS.length;
    const stepFromNow = (idx) => {
      if (idx >= total - 1) {
        // 마지막 단계 활성 → 잠깐 보여준 뒤 모두 완료 처리
        setActiveIdx(total - 1);
        setTimeout(() => {
          setActiveIdx(total);   // 모든 카드 ✓ 표시
          setAllDone(true);
          // 최종 안심 메시지 잠깐 보여주고 결과로 전환
          setTimeout(() => {
            try { onCompleteRef.current && onCompleteRef.current(); } catch (_) {}
          }, FINAL_HOLD_MS);
        }, FINISH_INTERVAL_MS);
        return;
      }
      setActiveIdx(idx);
      setTimeout(() => stepFromNow(idx + 1), FINISH_INTERVAL_MS);
    };
    // 현재 idx부터 빠르게 진행
    setActiveIdx(prev => {
      stepFromNow(prev + 1);
      return prev;
    });
  }, []);

  // 모듈 버스에 핸들러 등록 — mount 시 등록, unmount 시 해제
  useEffect(() => {
    genProgressBus.setHandler(runFinish);
    return () => {
      genProgressBus.setHandler(null);
      finishingRef.current = false;
      onCompleteRef.current = null;
    };
  }, [runFinish]);

  const total    = GENERATING_STEPS.length;
  // 진행 게이지: allDone이면 100%, 아니면 (현재+1)/total
  const progress = allDone
    ? 100
    : Math.min(((activeIdx + 1) / total) * 100, 100);

  return (
    <div>
      {/* 상단 진행 게이지 */}
      <div style={{
        height: 6, background: "#f0e8f8", borderRadius: 4, overflow: "hidden",
        marginBottom: 14, position: "relative",
      }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: allDone
            ? "linear-gradient(90deg,#4CAF50,#81C784)"
            : "linear-gradient(90deg,#7B1FA2,#CE93D8)",
          borderRadius: 4, transition: "width .5s ease, background .3s",
          boxShadow: allDone ? "0 0 10px rgba(76,175,80,.5)" : "0 0 8px rgba(123,31,162,.4)",
        }} />
      </div>
      <div style={{ fontSize: 11, color: allDone ? "#2E7D32" : "#888", marginBottom: 12, textAlign: "right", fontWeight: allDone ? 700 : 400 }}>
        {allDone ? "✅ 모든 검수 완료" : `${Math.min(activeIdx + 1, total)} / ${total} 단계 진행 중`}
      </div>

      {/* 단계 카드 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {GENERATING_STEPS.map((step, i) => {
          const isDone    = allDone || i < activeIdx;
          const isActive  = !allDone && i === activeIdx;
          const isWaiting = !allDone && i > activeIdx;

          return (
            <div key={i} style={{
              background: isActive ? "#fff" : isDone ? "#fafafa" : "#f7f5fa",
              borderRadius: 10,
              border: isActive
                ? "1.5px solid #9C27B0"
                : isDone
                  ? "1.5px solid #c8e6c9"
                  : "1.5px solid #ede8f8",
              padding: "11px 13px",
              display: "flex", alignItems: "center", gap: 11,
              opacity: isWaiting ? 0.55 : 1,
              transition: "all .35s ease",
              boxShadow: isActive ? "0 2px 12px rgba(123,31,162,.13)" : "none",
              animation: isActive ? "pulse 1.8s infinite" : "none",
            }}>
              {/* 좌측 상태 인디케이터 */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isDone
                  ? "#4CAF50"
                  : isActive
                    ? "linear-gradient(135deg,#7B1FA2,#CE93D8)"
                    : "#e0d8f0",
                color: "#fff", fontSize: 13, fontWeight: 900,
                position: "relative",
              }}>
                {isDone ? "✓" : isActive ? (
                  <span style={{
                    display: "inline-block", width: 12, height: 12,
                    border: "2px solid rgba(255,255,255,.35)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin .8s linear infinite",
                  }} />
                ) : (
                  <span style={{ fontSize: 11, color: "#aaa" }}>{i + 1}</span>
                )}
              </div>

              {/* 본문 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 800,
                  color: isActive ? "#4A148C" : isDone ? "#2E7D32" : "#999",
                  marginBottom: isActive ? 3 : 0,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>{step.icon}</span>
                  <span>{step.title}</span>
                  {isDone && (
                    <span style={{
                      fontSize: 10, color: "#2E7D32", fontWeight: 700,
                      marginLeft: "auto",
                    }}>{step.doneLabel || "완료"}</span>
                  )}
                </div>
                {isActive && (
                  <div style={{
                    fontSize: 11, color: "#7B1FA2", lineHeight: 1.5,
                    overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                  }}>
                    {step.sub}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: allDone ? "#E8F5E9" : "#f9f5ff",
        borderRadius: 8,
        fontSize: 11.5,
        color: allDone ? "#1B5E20" : "#7B1FA2",
        lineHeight: 1.6,
        border: allDone ? "1px solid #A5D6A7" : "1px dashed #d0b8e8",
        fontWeight: allDone ? 700 : 500,
        textAlign: "center",
        transition: "all .3s",
      }}>
        {allDone
          ? "🎉 안전 검수 통과 · 네이버 발행 준비 완료"
          : "💡 광고법·SEO·AI패턴 자동 검수 중입니다. 발행해도 안전한 글이 곧 도착합니다."}
      </div>
    </div>
  );
}


// ── 아래는 더 이상 쓰지 않는 STAGE_INFO (삭제용 더미) ──
const STAGE_INFO = {
  welcome: {
    icon: "✦", color: "#7B1FA2",
    title: "블로그 생성기 사용법",
    subtitle: "아래 순서대로 진행하세요",
    content: [
      { step: "01", icon: "✏️", title: "시술 + 지역을 입력하세요",
        desc: "\"강남 쌍꺼풀 후기 써줘\" 처럼 자유롭게 입력하거나, 버튼을 눌러 시술을 선택할 수 있습니다." },
      { step: "02", icon: "🎯", title: "타겟 독자를 선택하세요",
        desc: "상담 고민 중인 고객 / 시술 후 후기 작성자 / 병원 비교 중인 고객 중 하나를 고릅니다." },
      { step: "03", icon: "📝", title: "블로그 유형을 선택하세요",
        desc: "상담 후기형 / 시술 결과형 / 비교형 등 목적에 맞는 유형을 선택합니다." },
      { step: "04", icon: "⚡", title: "AI가 블로그를 작성합니다",
        desc: "강제 6섹션 전환형 구조로 약 30~60초 내 완성됩니다. 결과는 이 패널에 표시됩니다." },
    ],
    tip: "💡 네이버 SEO 최적화된 2,000자 이상의 블로그가 자동 생성됩니다.",
  },

  treatment: {
    icon: "💉", color: "#6A1B9A",
    title: "시술 선택 중",
    subtitle: "원하는 시술을 선택하거나 직접 입력하세요",
    content: [
      { step: "👁️", icon: "👁️", title: "눈성형",      desc: "자연유착 쌍꺼풀 · 눈매교정 · 눈밑지방재배치 · 상안검" },
      { step: "👃", icon: "👃", title: "코성형",      desc: "콧대 · 코끝 · 매부리코 · 재수술" },
      { step: "🔺", icon: "🔺", title: "리프팅",      desc: "실리프팅 · 울쎄라 · 써마지 · 인모드" },
      { step: "💉", icon: "💉", title: "보톡스·필러", desc: "이마 · 팔자 · 광대축소 · 턱끝" },
      { step: "✨", icon: "✨", title: "피부레이저",  desc: "피코레이저 · 레이저토닝 · 여드름흉터 · 모공" },
      { step: "🌀", icon: "🌀", title: "지방·체형",   desc: "지방흡입 · 복부 · 허벅지 · 팔뚝" },
    ],
    tip: "💡 시술명 + 지역을 함께 입력하면 더 빠르게 진행됩니다.\n예) \"강남 실리프팅 후기 써줘\"",
  },

  target: {
    icon: "🎯", color: "#4A148C",
    title: "타겟 독자 선택 중",
    subtitle: "독자 유형에 따라 글의 톤과 전략이 달라집니다",
    content: [
      { step: "😟", icon: "😟", title: "상담 고민 고객 — 전환율 최고",
        desc: "시술을 고민 중인 독자 대상. '나도 그 고민 했어요' 공감형으로 시작해 상담 예약을 자연스럽게 유도합니다." },
      { step: "😊", icon: "😊", title: "시술 후기 작성자 — 신뢰 구축",
        desc: "이미 시술을 받은 독자 대상. 결과 체감 · 회복 과정을 중심으로 작성되어 신뢰감을 높입니다." },
      { step: "🔍", icon: "🔍", title: "병원 비교 고객 — 선택 유도",
        desc: "여러 병원을 비교 중인 독자 대상. 선택 기준과 비교 포인트를 명확하게 서술해 결정을 돕습니다." },
    ],
    tip: "💡 처음 시작하는 경우 '상담 고민 고객' 타겟이 전환율이 가장 높습니다.",
  },

  blogtype: {
    icon: "📝", color: "#4A148C",
    title: "블로그 유형 선택 중",
    subtitle: "어떤 형태의 글을 작성할까요?",
    content: [
      { step: "📖", icon: "📖", title: "상담 후기형",
        desc: "상담 과정을 중심으로 서술. 의사와의 대화, 질문·답변 흐름이 자연스럽게 담깁니다. 신뢰감 형성에 탁월." },
      { step: "✅", icon: "✅", title: "시술 결과형",
        desc: "시술 전후 변화를 중심으로 서술. 결과 체감과 감정 흐름 중심. 비포·애프터가 궁금한 독자에게 효과적." },
      { step: "⚖️", icon: "⚖️", title: "병원 비교형",
        desc: "여러 병원을 비교한 경험을 서술. 선택 이유와 비교 포인트 포함. 결정을 못하는 독자에게 설득력 높음." },
    ],
    tip: "💡 어떤 유형이든 강제 6섹션 전환형 구조가 자동 적용됩니다.",
  },

  generating: {
    icon: "⚡", color: "#7B1FA2",
    title: "블로그 생성 중...",
    subtitle: "강제 6섹션 구조로 작성되고 있습니다",
    isGenerating: true,
    content: [
      { step: "01", icon: "😔", title: "SECTION 1 — 고민",      desc: "독자가 공감할 수 있는 시작 문장. '저도 그 고민 했어요' 형태로 작성됩니다." },
      { step: "02", icon: "📖", title: "SECTION 2 — 상황",      desc: "왜 고민하게 됐는지 구체적인 상황을 묘사합니다." },
      { step: "03", icon: "🏥", title: "SECTION 3 — 상담 흐름", desc: "상담 장면과 의사 질문을 1개 이상 포함합니다. (강제 적용)" },
      { step: "04", icon: "💡", title: "SECTION 4 — 선택 이유", desc: "비교 대상을 포함해 왜 이 시술·병원을 선택했는지 서술합니다. (강제 적용)" },
      { step: "05", icon: "🌟", title: "SECTION 5 — 결과 체감", desc: "변화된 느낌과 감정 표현을 담습니다." },
      { step: "06", icon: "📌", title: "SECTION 6 — 정리",      desc: "광고가 아닌 경험형 선택 유도 문장으로 마무리합니다." },
    ],
    tip: "⏱ 약 30~60초 소요됩니다. 잠시 기다려주세요.",
  },
};

// ============================================================
// 우측 설명 보드
// ============================================================
function InfoBoard({ stage }) {
  const info = STAGE_INFO[stage] || STAGE_INFO.welcome;

  return (
    <div key={stage} style={{
      flex: 1, overflowY: "auto",
      background: "linear-gradient(160deg,#faf8ff 0%,#f0eaff 100%)",
      display: "flex", flexDirection: "column",
      animation: "fadeIn .3s ease",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "22px 24px 16px",
        borderBottom: "1px solid #ede8f8",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg,${info.color},#CE93D8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 4px 14px ${info.color}35`,
            ...(info.isGenerating ? { animation: "pulse 1.6s ease-in-out infinite" } : {}),
          }}>{info.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.3px" }}>
              {info.title}
            </div>
            <div style={{ fontSize: 11, color: info.color, fontWeight: 600, marginTop: 2 }}>
              {info.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* 카드 목록 */}
      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 9 }}>
        {info.content.map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            background: "#fff", borderRadius: 14, padding: "13px 15px",
            border: "1px solid #ede8f8",
            boxShadow: "0 2px 8px rgba(100,50,180,.04)",
            animation: `fadeIn .3s ease ${i * 0.06}s both`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#F3E5F5,#E1BEE7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17,
            }}>{item.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", marginBottom: 4,
                display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 9, fontWeight: 900, color: "#fff",
                  background: info.color, borderRadius: 5,
                  padding: "2px 6px", letterSpacing: "0.3px", flexShrink: 0,
                }}>{item.step}</span>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: "#777", lineHeight: 1.75 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 팁 */}
      {info.tip && (
        <div style={{
          margin: "14px 20px 24px",
          background: `${info.color}0d`,
          border: `1px solid ${info.color}22`,
          borderRadius: 12, padding: "12px 16px",
          fontSize: 12, color: "#5e2e7a", lineHeight: 1.75,
          fontWeight: 500, whiteSpace: "pre-line",
        }}>
          {info.tip}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 이미지 플레이스홀더 / BlogContent
// ============================================================
function ImgPlaceholder({ alt, index, uploadedSrc, onUpload }) {
  const inputRef = useRef();
  return (
    <div onClick={!uploadedSrc ? () => inputRef.current?.click() : undefined}
      style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden",
        border: uploadedSrc ? "2px solid #66BB6A" : "2px dashed #CE93D8",
        background: uploadedSrc ? "#F1F8E9" : "#FCF4FF",
        cursor: uploadedSrc ? "default" : "pointer" }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(index, URL.createObjectURL(f)); }} />
      {uploadedSrc
        ? <img src={uploadedSrc} alt={alt} style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
        : <div style={{ minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 10 }}>
            <span style={{ fontSize: 16 }}>🖼️</span>
            <span style={{ fontSize: 11, color: "#9C27B0", fontWeight: 700 }}>{alt}</span>
          </div>}
      <div style={{ background: "#F3E5F5", padding: "3px 10px", fontSize: 9, color: "#7B1FA2" }}>ALT: {alt}</div>
    </div>
  );
}

function BlogContent({ text, uploadedImgs, onUpload }) {
  const safeText = text || "";
  const parts = safeText.split(/\[이미지:\s*(.*?)\]/g);
  let imgIdx = 0;
  return (
    <div style={{ fontSize: 16, lineHeight: 1.8, color: "#37474f", wordBreak: "break-word", fontWeight: 400 }}>
      {parts.map((part, i) => {
        if (i % 2 === 1) { const idx = imgIdx++; return <ImgPlaceholder key={i} index={idx} alt={part.trim()} uploadedSrc={(uploadedImgs && uploadedImgs[idx])||null} onUpload={onUpload} />; }
        if (!part.trim()) return null;
        return <div key={i} style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: md2html(part) }} />;
      })}
    </div>
  );
}

// ============================================================
// 메시지 컴포넌트
// ============================================================
function ChatMessage({ msg }) {
  if (msg.role === "user") return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
      <div style={{ maxWidth: "65%", background: "#F0EBF8", color: "#1a1a2e",
        borderRadius: "18px 18px 4px 18px", padding: "10px 16px", fontSize: 14, lineHeight: 1.6 }}>
        {msg.text}
      </div>
    </div>
  );

  if (msg.role === "assistant") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#4A148C,#9C27B0)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900 }}>B</div>
      <div style={{ maxWidth: "78%" }}>
        <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px",
          padding: "12px 16px", fontSize: 14, lineHeight: 1.8, color: "#1a1a2e",
          boxShadow: "0 1px 3px rgba(0,0,0,.06)", whiteSpace: "pre-line" }}>
          {msg.text}
        </div>

      </div>
    </div>
  );

  if (msg.role === "loading") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#4A148C,#9C27B0)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900 }}>B</div>
      <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px",
        padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.06)",
        display: "flex", alignItems: "center", gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#CE93D8",
            animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />
        ))}
        <span style={{ fontSize: 12, color: "#9C27B0", marginLeft: 4 }}>{msg.text}</span>
      </div>
    </div>
  );
  return null;
}

// ============================================================
// 메인
// ============================================================
export default function Home() {
  const router = useRouter();
  const [CURRENT_INDUSTRY, setCURRENT_INDUSTRY] = useState(DEFAULT_INDUSTRY);

  // URL 쿼리가 준비되면 업종 업데이트
  useEffect(() => {
    if (router.isReady && router.query.industry) {
      setCURRENT_INDUSTRY(router.query.industry);
    }
  }, [router.isReady, router.query.industry]);

  // 업종별 동적 계산
  const activeConfig   = INDUSTRY_CONFIG[CURRENT_INDUSTRY] || INDUSTRY_CONFIG.clinic;
  const activeTreatments = INDUSTRY_TREATMENTS[CURRENT_INDUSTRY] || CLINIC_TREATMENTS;
  const activeCats     = CURRENT_INDUSTRY === "dental"  ? DENTAL_CATS
                       : CURRENT_INDUSTRY === "ent"     ? ENT_CATS
                       : CURRENT_INDUSTRY === "urology"  ? UROLOGY_CATS
                       : CURRENT_INDUSTRY === "oriental" ? ORIENTAL_CATS
                       : CURRENT_INDUSTRY === "ortho"    ? ORTHO_CATS
                       : CURRENT_INDUSTRY === "pediatrics" ? PEDIATRICS_CATS
                       : CURRENT_INDUSTRY === "gastro"      ? GASTRO_CATS
                       : CURRENT_INDUSTRY === "general"     ? GENERAL_CATS
                       : CURRENT_INDUSTRY === "obgyn"       ? OBGYN_CATS
                       : CURRENT_INDUSTRY === "derma"       ? DERMA_CATS
                       : CURRENT_INDUSTRY === "pain"        ? PAIN_CATS
                       : CURRENT_INDUSTRY === "neuro"       ? NEURO_CATS
                       : CURRENT_INDUSTRY === "psy"         ? PSY_CATS
                       : CURRENT_INDUSTRY === "eye"         ? EYE_CATS
                       : CURRENT_INDUSTRY === "family"      ? FAMILY_CATS
                       : CLINIC_CATS;

  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [stage,        setStage]        = useState("welcome");
  const [result,       setResult]       = useState(null);
  const [copied,       setCopied]       = useState(false);
  const [resultTab,    setResultTab]    = useState("blog"); // 결과화면 탭: blog | tools | guide
  const [uploadedImgs, setUploadedImgs] = useState({});
  const [diagResult,   setDiagResult]   = useState(null);
  const [diagLoading,  setDiagLoading]  = useState(false);
  const [rightTab,     setRightTab]     = useState("blog");
  const [mountedTabs,  setMountedTabs]  = useState({ blog: true, watermark: false, photoedit: false });
  const [analysisData, setAnalysisData]       = useState(null); // 키워드 분석 결과
  const [pendingTreatment, setPendingTreatment]         = useState(null); // 시술 선택 후 지역 대기
  const [showTreatmentSelect, setShowTreatmentSelect]   = useState(false); // 우측 시술 선택 패널
  const [selectedStrategyIdx, setSelectedStrategyIdx] = useState(null); // 전략 선택 상태

  const switchTab = (tab) => {
    setRightTab(tab);
    setMountedTabs(prev => ({ ...prev, [tab]: true }));
  };

  const messagesEndRef = useRef(null);
  const isGenerating   = useRef(false);

  useEffect(() => {
    const config = INDUSTRY_CONFIG[CURRENT_INDUSTRY] || INDUSTRY_CONFIG.clinic;
    const examples = config.examples.map(e => `• ${e}`).join("\n");
    setMessages([{
      role: "assistant",
      text: `${config.greeting}\n\n원하시는 내용을 자유롭게 입력하세요.\n\n예시:\n${examples}`,
    }]);
  }, [CURRENT_INDUSTRY]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg        = (msg) => setMessages(prev => [...prev, msg]);
  const removeLoading = ()    => setMessages(prev => prev.filter(m => m.role !== "loading"));

  const handleBlogImgUpload = useCallback((index, url) => {
    setUploadedImgs(prev => ({ ...prev, [index]: url }));
  }, []);

  const runDiagnose = async (text, keyword) => {
    setDiagLoading(true); setDiagResult(null);
    try {
      const res  = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogText: text, keyword: keyword || "" }) });
      const data = await res.json();
      if (data?.result) setDiagResult(data.result);
    } catch (_) {} finally { setDiagLoading(false); }
  };

  const generate = async (treatmentId, region, blogType = "review", targetId = "consult", overrideTitle = null, treatmentName = "") => {
    if (isGenerating.current) return;
    isGenerating.current = true;
    setLoading(true);
    setStage("generating");

    // draft 저장 (이어쓰기용)
    try {
      const treatment_ = activeTreatments.find(t => t.id === treatmentId);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        treatmentId, treatmentName: treatment_?.name || "",
        region, blogType, targetId,
        savedAt: new Date().toISOString(),
      }));
    } catch (_) {}

    // treatmentId로 못 찾으면 treatmentName으로 재검색 (id 불일치 방어)
    let treatment   = activeTreatments.find(t => t.id === treatmentId)
                   || activeTreatments.find(t => t.name === treatmentName);

    // 활성 업종에서도 못 찾으면 전체 업종에서 재검색 (업종 자동 전환 케이스 대응)
    if (!treatment) {
      const ALL_TREATMENTS_FLAT = [
        ...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS,
        ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS,
        ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...GENERAL_TREATMENTS,
        ...OBGYN_TREATMENTS, ...PAIN_TREATMENTS, ...NEURO_TREATMENTS,
        ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS,
      ];
      treatment = ALL_TREATMENTS_FLAT.find(t => t.id === treatmentId)
               || ALL_TREATMENTS_FLAT.find(t => t.name === treatmentName);
    }

    // 최종 방어: 그래도 없으면 최소 program 객체 만들기
    if (!treatment && (treatmentId || treatmentName)) {
      treatment = {
        id: treatmentId || "unknown",
        name: treatmentName || treatmentId || "안과 진료",
        cat: "기타",
        industry: CURRENT_INDUSTRY,
        titlePatterns: ["{region} {name} 후기"],
        keywords: [treatmentName || treatmentId],
        compareWith: "",
      };
    }
    const target      = CLINIC_TARGETS.find(t => t.id === targetId);
    const blogTypeObj = CLINIC_BLOG_TYPES.find(b => b.id === blogType);

    addMsg({ role: "loading", text: `${region} ${treatment?.name} 블로그 작성 중... (약 30~60초)` });

    try {
      const res  = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target, program: treatment, blogType: blogTypeObj,
          userRegion: region, userMemo: "", overrideTitle,
          // treatment.industry 없으면 DENTAL_TREATMENTS 포함 여부로 판단
          industry: CURRENT_INDUSTRY,
        }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 응답 도착 — 진행감 컴포넌트가 빠르게 마무리되도록 신호.
      // 마무리 콜백 안에서 실제 결과 전환을 수행 → "AI가 끝까지 검수한 느낌"
      genProgressBus.signalDone(() => {
        removeLoading();
        setResult({ ...data, treatment, region });
        setUploadedImgs({});
        setDiagResult(null);
        setStage("result");
        switchTab("blog");
        try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}

        const cc = calcValidCharCount(data.text);
        addMsg({
          role: "assistant",
          text: `✅ ${region} ${treatment?.name} 블로그 생성 완료!\n\n📝 ${cc.toLocaleString()}자 · 6섹션\n오른쪽 패널에서 확인하세요.`,
          options: [
            { label: "📋 전체 복사", action: () => {
              const plain = (data.text || "")
                .replace(/([^\n])\s*(#{1,6})\s+/g, "$1\n\n$2 ")
                .replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
              navigator.clipboard.writeText(plain); setCopied(true); setTimeout(() => setCopied(false), 2000);
            }},
            { label: "🔄 재생성",    action: () => generate(treatmentId, region, blogType, targetId) },
            { label: "🆕 새 블로그", action: () => { setResult(null); setStage("welcome"); }},
          ],
        });
        runDiagnose(data.text, treatment?.name);

        // 진행감 마무리 + 결과 표시 끝났으니 잠금 해제
        setLoading(false);
        isGenerating.current = false;
      });

    } catch (e) {
      removeLoading();
      setStage("welcome");
      addMsg({ role: "assistant", text: `❌ 오류: ${e.message}\n\n다시 시도해주세요.` });
      setLoading(false);
      isGenerating.current = false;
    }
  };

// 자연어에서 타겟·유형 자동 감지
function parseTargetFromText(text) {
  if (/비교|vs|차이|어디가|어느|몇 군데|여러/.test(text)) return "compare";
  if (/결과|효과|변화|후기|받았|했어|이후|달|주차|경과/.test(text)) return "result";
  return "consult";
}

function parseBlogTypeFromText(text) {
  if (/비교|vs|차이|어디가|어느/.test(text)) return "compare";
  if (/상담|병원에서|원장님|물어봤|질문/.test(text)) return "consult";
  return "review";
}

const BLOGTYPE_LABEL = { review: "후기형", consult: "상담형", compare: "비교형" };
const BLOGTYPE_DESC  = { review: "결과 중심 글", consult: "고민 중심 글", compare: "선택 과정 글" };
const TARGET_LABEL   = { consult: "상담 고민형", result: "시술 후기형", compare: "비교 탐색형" };

// ============================================================
// 시술 선택 보드 (우측 패널) — 카테고리별 그리드
// ============================================================
// CATS는 컴포넌트 상단에서 동적 계산 (선언은 파일 상단으로 이동됨)

function TreatmentSelectBoard({ treatments, cats, onSelect }) {
  const [activeCat, setActiveCat] = useState("전체");
  const filtered = activeCat === "전체" ? treatments : treatments.filter(t => t.cat === activeCat);
  const isMany = treatments.length > 18; // 피부과처럼 시술 많은 경우

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#f7f7fb", animation: "fadeIn .25s ease" }}>

      {/* 카테고리 탭 */}
      <div style={{ display: "flex", gap: 5, padding: "8px 12px 7px", flexWrap: "wrap",
        borderBottom: "1px solid #ede8f8", background: "#fff", flexShrink: 0 }}>
        {(cats || CLINIC_CATS).map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              border: activeCat === cat ? "none" : "1.5px solid #e0d0f0",
              background: activeCat === cat ? "linear-gradient(135deg,#7B1FA2,#CE93D8)" : "#fff",
              color: activeCat === cat ? "#fff" : "#555",
              cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 시술 카드 그리드 — 많으면 4열·초소형, 적으면 3열·기본 */}
      <div style={{ flex: 1, overflowY: activeCat === "전체" && isMany ? "hidden" : "auto",
        padding: isMany ? "7px 8px 8px" : "10px 10px 16px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMany ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr",
          gap: isMany ? 5 : 7,
        }}>
          {filtered.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              style={{ textAlign: "left", background: "#fff", borderRadius: 8,
                border: "1.5px solid #ede8f8",
                padding: isMany ? "7px 8px" : "10px 11px",
                cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
                boxShadow: "0 2px 8px rgba(100,50,180,.04)" }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#CE93D8"; e.currentTarget.style.background = "#F9F0FF"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(123,31,162,.1)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#ede8f8"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(100,50,180,.04)"; }}>
              <div style={{ fontSize: isMany ? 14 : 18, marginBottom: 2 }}>{t.emoji}</div>
              <div style={{ fontSize: isMany ? 11 : 12, fontWeight: 900, color: "#1a1a2e",
                marginBottom: 2, lineHeight: 1.3 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 9, color: "#9C27B0", fontWeight: 700,
                background: "#F3E5F5", borderRadius: 4, padding: "1px 5px",
                display: "inline-block" }}>
                {t.cat}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// 키워드 경쟁도 분석 — 완전 내부 로직 (API/GPT 비용 없음)
// ============================================================
const COMPETITION_LABEL = {
  높음:  { emoji: "🔴", text: "경쟁 높음" },
  중간:  { emoji: "🟡", text: "경쟁 중간" },
  낮음:  { emoji: "🟢", text: "경쟁 낮음" },
};
const TYPE_LABEL = { 롱테일: "롱테일", 비교형: "비교형", 후기형: "후기형", 원본: "원본 그대로" };

function analyzeKeywordLocal(keyword, treatmentName, region) {
  const words = keyword.trim().split(/\s+/);
  const wordCount = words.length;

  // 경쟁도 판정 — 단어 수 + 특수 단어 기반
  const isLongTail   = wordCount >= 4;
  const hasSpec      = /붓기|멍|회복|일지|기간|통증|후기|상담|비교|차이|vs|처음|솔직|결과|3개월|1개월|비용|가격|재수술|처음|30대|40대/.test(keyword);
  const hasRegion    = !!region;
  const hasCompare   = /vs|비교|차이|어디/.test(keyword);

  let competition;
  if (isLongTail && hasSpec)          competition = "낮음";
  else if (isLongTail || hasSpec)     competition = "중간";
  else                                competition = "높음";

  // 롱테일 키워드 추천 — 업종별 완전 분리
  // treatmentData를 먼저 선언해야 detectedIndustry에서 사용 가능
  const treatmentData    = [...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS, ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS, ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...GENERAL_TREATMENTS, ...OBGYN_TREATMENTS, ...PAIN_TREATMENTS, ...NEURO_TREATMENTS, ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS].find(t => t.name === treatmentName || t.id === treatmentName);
  const detectedIndustry = treatmentData?.industry || "clinic";
  const LONGTAIL_SUFFIXES = detectedIndustry === "pain" ? (() => {
    const nm = treatmentData?.name || "";
    if (/디스크|협착|척추|경추성/.test(nm)) return [
      { suffix: "수술 없이 나은 이야기",              type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "주사 몇 회 맞았나요 솔직 후기",      type: "롱테일", reason: "시술 횟수 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "비용 보험 적용 정리",                type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    if (/무릎|어깨|관절|오십견/.test(nm)) return [
      { suffix: "주사 맞고 달라진 것",                type: "롱테일", reason: "주사 결과 탐색층 · 공감 높음" },
      { suffix: "수술 전 마지막으로 시도한 것",       type: "롱테일", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "효과 언제부터 느꼈나요",             type: "롱테일", reason: "치료 전 탐색 키워드" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    if (/도수치료|체외충격파|프롤로|PRP/.test(nm)) return [
      { suffix: "vs 다른 치료 비교｜직접 받아보고",   type: "비교형", reason: "비교 탐색층 · 실검 패턴" },
      { suffix: "실비 적용 비용 정리",                type: "롱테일", reason: "보험 탐색층 · 체류시간 높음" },
      { suffix: "효과 언제부터 느꼈나요",             type: "롱테일", reason: "치료 전 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 받은 솔직 후기",                type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
    ];
    if (/두통|신경통|대상포진|신경병증/.test(nm)) return [
      { suffix: "진통제 끊고 해결한 이야기",          type: "롱테일", reason: "약물 의존 탈출층 · 전환율 높음" },
      { suffix: "원인 찾고 달라진 것",                type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    if (/족저|발목|꼬리뼈|손목|팔꿈치/.test(nm)) return [
      { suffix: "아침 통증 사라진 이야기",            type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "치료 기간 얼마나 걸리나",            type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 신경성형술 (PEN)
    if (/신경성형/.test(nm)) return [
      { suffix: "수술 전 마지막 시도 솔직 후기",      type: "후기형", reason: "수술 보류층 · 전환율 높음" },
      { suffix: "신경차단술과 다른 점 정리",          type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
      { suffix: "시술 비용·실비 적용 정리",           type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 일지",                type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
    ];
    // 만성요통·만성통증 클리닉
    if (/만성요통|만성통증|난치성/.test(nm)) return [
      { suffix: "진통제 의존 끊은 3개월 후기",        type: "후기형", reason: "약물 의존 탈출층 · 전환율 높음" },
      { suffix: "다학제 통합 관리 솔직 정리",         type: "롱테일", reason: "통합 치료 탐색층 · 체류시간 높음" },
      { suffix: "여러 병원 다녀도 못 찾은 원인",      type: "후기형", reason: "난치성 공감층 · 공감 높음" },
    ];
    // 턱관절 (TMD)
    if (/턱관절|TMD/.test(nm)) return [
      { suffix: "두통까지 함께 사라진 이야기",        type: "후기형", reason: "동반 증상 공감층 · 전환율 높음" },
      { suffix: "치과 vs 통증의학과 비교",            type: "비교형", reason: "병원 비교 탐색층 · 경쟁 낮음" },
      { suffix: "보톡스·신경차단 솔직 후기",          type: "후기형", reason: "치료 비교층 · 체류시간 높음" },
    ];
    // 섬유근육통
    if (/섬유근육통|전신통증/.test(nm)) return [
      { suffix: "원인 모를 통증 진단받은 이야기",     type: "후기형", reason: "진단 지연 공감층 · 전환율 높음" },
      { suffix: "약물·운동 6개월 변화 일지",          type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "류마티스 검사 정상인데 통증 있을 때", type: "정보형", reason: "감별 탐색 · 경쟁 낮음" },
    ];
    // 좌골신경통
    if (/좌골신경통|이상근/.test(nm)) return [
      { suffix: "디스크인 줄 알았는데 다른 원인",     type: "후기형", reason: "감별 진단 공감층 · 전환율 높음" },
      { suffix: "엉덩이부터 다리까지 저림 후기",      type: "후기형", reason: "증상 공감층 · 공감 높음" },
      { suffix: "신경차단·신경성형 비교 정리",        type: "비교형", reason: "치료 비교 탐색층 · 체류시간 높음" },
    ];
    // 무릎 줄기세포·연골재생
    if (/줄기세포|연골재생|카티스템/.test(nm)) return [
      { suffix: "인공관절 전 마지막 시도 후기",       type: "후기형", reason: "수술 보류층 · 전환율 높음" },
      { suffix: "비용·효과·회복 솔직 정리",           type: "롱테일", reason: "비용 탐색층 · 체류시간 높음" },
      { suffix: "줄기세포 vs 인공관절 비교",          type: "비교형", reason: "치료 비교 탐색층 · 경쟁 낮음" },
      { suffix: "6개월 효과 변화 일지",               type: "롱테일", reason: "장기 결과 탐색 · 공감 높음" },
    ];
    return [
      { suffix: "비수술 치료 후기 솔직하게",          type: "후기형", reason: "비수술 탐색 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "비용 횟수 솔직 정리",                type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
  })() : detectedIndustry === "dental" ? [    { suffix: "치료 후 회복 일지",        type: "롱테일", reason: "치과 회복 정보 검색 多 · 경쟁 낮음" },
    { suffix: "통증 붓기 기간 정리",      type: "롱테일", reason: "시술 전 불안 검색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "두려워서 미루다 받은 후기", type: "후기형", reason: "치과 공포증 타겟 · 공감 높음" },
    { suffix: "비용 기간 솔직 정리",      type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
  ] : detectedIndustry === "ent" ? [
    { suffix: "치료 후 회복 일지",        type: "롱테일", reason: "이비인후과 회복 정보 검색 多 · 경쟁 낮음" },
    { suffix: "증상 기간 솔직 정리",      type: "롱테일", reason: "치료 전 불안 검색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "두려워서 미루다 받은 후기", type: "후기형", reason: "병원 공포층 타겟 · 공감 높음" },
    { suffix: "비용 기간 솔직 정리",      type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
  ] : detectedIndustry === "urology" ? [
    { suffix: "치료 후기 솔직 정리",      type: "롱테일", reason: "비뇨기과 후기 공백 · 경쟁 낮음" },
    { suffix: "비용 회복 기간 정리",      type: "롱테일", reason: "시술 전 정보 탐색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "혼자 고민하다 받은 후기",  type: "후기형", reason: "비뇨기과 심리 장벽 공략 · 공감 높음" },
    { suffix: "원인 찾고 해결한 이야기",  type: "롱테일", reason: "근본 치료 탐색층 · 경쟁 낮음" },
  ] : detectedIndustry === "ortho" ? (() => {
    const nm = treatmentData?.name || "";
    if (/디스크|협착|측만/.test(nm)) return [
      { suffix: "꼭 수술만이 답일까요｜비수술로 해결한 이야기",   type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "앉아 있을수록 아프다면｜치료 기록",             type: "롱테일", reason: "증상 탐색 · 실검 패턴" },
      { suffix: "치료 방법 체크｜3개월 기록",                    type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "수술 없이 나은 이야기",                         type: "후기형", reason: "비수술 공감층 · 전환율 높음" },
    ];
    if (/무릎|연골|십자인대|반월/.test(nm)) return [
      { suffix: "밤마다 찾아오는 통증｜치료받고 달라진 것",      type: "롱테일", reason: "야간통증 탐색 · 실검 패턴" },
      { suffix: "수술 전 마지막으로 시도한 것",                  type: "롱테일", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "주사 맞고 나서 솔직 후기",                      type: "후기형", reason: "주사 탐색층 · 공감 높음" },
      { suffix: "효과 언제부터 느꼈나요",                        type: "롱테일", reason: "치료 전 탐색 키워드" },
    ];
    if (/고관절|대퇴골두/.test(nm)) return [
      { suffix: "사타구니 통증으로 시작한 진단 후기",            type: "롱테일", reason: "증상형 실검 패턴 · 경쟁 낮음" },
      { suffix: "MRI 찍고 나서야 알게 된 이야기",                type: "롱테일", reason: "검사 탐색층 · 체류시간 높음" },
      { suffix: "인공관절 수술 전 마지막 시도",                  type: "후기형", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "허리디스크인 줄 알았는데｜정확한 진단 후기",    type: "롱테일", reason: "진단 혼동층 · 공감 높음" },
    ];
    if (/어깨|오십견|회전근/.test(nm)) return [
      { suffix: "통증이 계속된다면｜원인 찾고 달라진 것",        type: "롱테일", reason: "증상형 실검 패턴 · 경쟁 낮음" },
      { suffix: "밤에 더 심하다면｜치료받고 나서 후기",          type: "후기형", reason: "야간통증 탐색층 · 공감 높음" },
      { suffix: "속에 돌이 생긴다?｜석회성건염 치료 후기",       type: "롱테일", reason: "질환명 탐색층 · 경쟁 낮음" },
      { suffix: "수술 없이 치료 후기",                           type: "후기형", reason: "비수술 탐색층 · 전환율 높음" },
    ];
    if (/도수치료|체외충격파|프롤로|주사/.test(nm)) return [
      { suffix: "vs 물리치료 차이점｜직접 받아보고 선택",        type: "비교형", reason: "비교 탐색층 · 실검 패턴" },
      { suffix: "추천｜비용·효과·실비 정리",                     type: "롱테일", reason: "보험 탐색층 · 체류시간 높음" },
      { suffix: "효과 언제부터 느꼈나요",                        type: "롱테일", reason: "치료 전 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 받은 솔직 후기",                           type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
    ];
    if (/족저|발목|족부/.test(nm)) return [
      { suffix: "아침 통증 사라진 이야기",                       type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "원인 치료방법｜솔직 후기",                      type: "롱테일", reason: "실검 패턴 반영 · 경쟁 낮음" },
      { suffix: "치료 기간 얼마나 걸리나",                       type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
    ];
    if (/수술|재활|골절|십자인대/.test(nm)) return [
      { suffix: "수술 후 재활 기록",                             type: "롱테일", reason: "수술 후 탐색층 · 체류시간 높음" },
      { suffix: "복귀까지 솔직 일지",                            type: "롱테일", reason: "회복 기간 탐색층 · 경쟁 낮음" },
      { suffix: "수술 결정하기까지 과정",                        type: "후기형", reason: "수술 고민층 타겟 · 전환율 높음" },
    ];
    return [
      { suffix: "치료 후기 솔직 정리",   type: "롱테일", reason: "정형외과 후기 공백 · 경쟁 낮음" },
      { suffix: "비용 기간 솔직 정리",   type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",        type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    ];
  })() : detectedIndustry === "obgyn" ? (() => {
    const nm = treatmentData?.name || "";
    if (/자궁근종|자궁내막증|난소낭종/.test(nm)) return [
      { suffix: "수술 vs 경과 관찰 고민한 이야기",  type: "비교형", reason: "수술 결정 탐색 · 공감 높음" },
      { suffix: "크기 수치 변화 솔직 기록",         type: "롱테일", reason: "경과 탐색층 · 체류시간 높음" },
      { suffix: "처음 진단받은 날",                 type: "후기형", reason: "진단 후 공감층 · 전환율 높음" },
    ];
    if (/검진|HPV|백신|이형성증/.test(nm)) return [
      { suffix: "처음 받아보는 분들을 위해",        type: "정보형", reason: "초보 탐색층 · 경쟁 낮음" },
      { suffix: "양성 판정 후 한 것들",             type: "후기형", reason: "판정 후 탐색층 · 전환율 높음" },
      { suffix: "추적 검사 결과",                   type: "롱테일", reason: "추적 탐색층 · 체류시간 높음" },
    ];
    if (/난임|임신|가임력/.test(nm)) return [
      { suffix: "검사 항목 미리 알고 가기",         type: "정보형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "결과 상담에서 들은 이야기",        type: "후기형", reason: "결과 탐색층 · 공감 높음" },
      { suffix: "수치 정상화까지 기록",             type: "롱테일", reason: "경과 탐색층 · 체류시간 높음" },
    ];
    if (/갱년기|폐경/.test(nm)) return [
      { suffix: "호르몬 치료 6개월 결과",           type: "롱테일", reason: "경과 탐색층 · 체류시간 높음" },
      { suffix: "한의원 vs 산부인과 비교",          type: "비교형", reason: "비교 탐색층 · 전환율 높음" },
      { suffix: "증상 개선까지 솔직하게",           type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
    ];
    // 임신 중기·후기 / 출산·분만
    if (/임신 중기|임신 후기|중기·후기|분만|출산/.test(nm)) return [
      { suffix: "주차별 검사 항목 정리",            type: "정보형", reason: "검사 일정 탐색 · 경쟁 낮음" },
      { suffix: "정밀초음파 후기 솔직하게",         type: "후기형", reason: "검사 경험층 · 공감 높음" },
      { suffix: "자연분만 vs 제왕절개 결정 과정",   type: "비교형", reason: "분만 비교 탐색층 · 체류시간 높음" },
      { suffix: "출산 준비물·일정 정리",            type: "롱테일", reason: "출산 준비 탐색층 · 전환율 높음" },
    ];
    // 생리통·자궁선근증
    if (/생리통|자궁선근증/.test(nm)) return [
      { suffix: "진통제 안 듣는 생리통 진단 후기",  type: "후기형", reason: "진통제 한계 공감층 · 전환율 높음" },
      { suffix: "미레나·호르몬·수술 비교 정리",     type: "비교형", reason: "치료 비교 탐색층 · 체류시간 높음" },
      { suffix: "MRI까지 받아본 정밀 진단",         type: "롱테일", reason: "정밀 검사 탐색층 · 경쟁 낮음" },
    ];
    // 요실금·골반저
    if (/요실금|골반저|골반장기탈출/.test(nm)) return [
      { suffix: "출산 후 시작된 증상 진료 후기",    type: "후기형", reason: "출산 후 공감층 · 전환율 높음" },
      { suffix: "케겔·바이오피드백 3개월 일지",     type: "롱테일", reason: "보존 치료 탐색층 · 체류시간 높음" },
      { suffix: "수술 vs 비수술 비교 정리",         type: "비교형", reason: "치료 비교 탐색층 · 경쟁 낮음" },
      { suffix: "비뇨기과 vs 산부인과 어디가 나을까", type: "비교형", reason: "병원 비교 탐색층 · 공감 높음" },
    ];
    // 여성암 종합검진 / 부인과 초음파 정기검진
    if (/여성암|부인과 초음파|정기검진/.test(nm)) return [
      { suffix: "30대 처음 받은 솔직 후기",         type: "후기형", reason: "첫 검진 공감층 · 전환율 높음" },
      { suffix: "패키지·항목 비교 정리",            type: "롱테일", reason: "비교 탐색층 · 체류시간 높음" },
      { suffix: "복부 vs 질초음파 차이 정리",       type: "비교형", reason: "검사 비교 탐색 · 경쟁 낮음" },
      { suffix: "가족력 있을 때 시작 시기",         type: "정보형", reason: "가족력 탐색층 · 공감 높음" },
    ];
    // 조기 폐경·조기난소부전
    if (/조기난소부전|이른 폐경|조기 폐경/.test(nm)) return [
      { suffix: "30대에 받은 충격 진단 후기",       type: "후기형", reason: "조기 진단 공감층 · 전환율 높음" },
      { suffix: "AMH·FSH 검사 솔직 정리",          type: "롱테일", reason: "검사 탐색층 · 체류시간 높음" },
      { suffix: "임신 가능성 상담 후기",            type: "후기형", reason: "가임력 공감층 · 공감 높음" },
      { suffix: "호르몬 치료 시작 일지",            type: "롱테일", reason: "치료 결과 탐색 · 경쟁 낮음" },
    ];
    return [
      { suffix: "산부인과 후기 솔직하게",           type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                   type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "원인 찾고 달라진 것들",            type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "general" ? (() => {
    const nm = treatmentData?.name || "";
    if (/고혈압|당뇨|고지혈증|생활습관/.test(nm)) return [
      { suffix: "처음 약 처방받은 날",              type: "후기형", reason: "만성질환 첫 처방 탐색 · 공감 높음" },
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
      { suffix: "평생 먹어야 하나요",               type: "정보형", reason: "약 의존 불안 탐색 · 경쟁 낮음" },
    ];
    if (/갑상선|빈혈|비타민D|만성피로/.test(nm)) return [
      { suffix: "원인 찾은 이야기",                 type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "혈액검사 후기 솔직하게",           type: "후기형", reason: "검사 탐색층 · 공감 높음" },
      { suffix: "수치 정상화까지 기록",             type: "롱테일", reason: "경과 탐색층 · 체류시간 높음" },
    ];
    if (/건강검진/.test(nm)) return [
      { suffix: "이상 소견 받고 나서 한 것들",      type: "롱테일", reason: "검진 후 탐색층 · 전환율 높음" },
      { suffix: "항목 미리 알고 가기",              type: "정보형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "국가검진 vs 종합검진 비교",        type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
    ];
    if (/독감|대상포진/.test(nm)) return [
      { suffix: "조기 치료 후기",                   type: "후기형", reason: "조기 탐색층 · 전환율 높음" },
      { suffix: "언제 병원 가야 하나요",            type: "정보형", reason: "방문 기준 탐색 · 경쟁 낮음" },
      { suffix: "타미플루 효과 솔직 후기",          type: "후기형", reason: "처방 탐색층 · 공감 높음" },
    ];
    // 통풍·요산
    if (/통풍|요산/.test(nm)) return [
      { suffix: "첫 발작 후 시작한 약물 관리",      type: "후기형", reason: "발작 경험층 · 공감 높음" },
      { suffix: "약 평생 먹어야 하나요",            type: "정보형", reason: "약 의존 탐색 · 경쟁 낮음" },
      { suffix: "요산 수치 낮추는 식이·약물 정리",  type: "롱테일", reason: "수치 관리 탐색층 · 체류시간 높음" },
    ];
    // 종합검진·정밀검진
    if (/종합검진|정밀검진/.test(nm)) return [
      { suffix: "국가검진과 다른 점 비교",          type: "비교형", reason: "검진 비교 탐색층 · 체류시간 높음" },
      { suffix: "40대 처음 받은 솔직 후기",         type: "후기형", reason: "첫 정밀검진 공감층 · 전환율 높음" },
      { suffix: "패키지·비용 정리",                 type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
      { suffix: "이상 소견 받고 추가 검사 후기",    type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
    ];
    // 코로나 후유증·롱코비드
    if (/롱코비드|코로나/.test(nm)) return [
      { suffix: "회복까지 솔직 일지",               type: "롱테일", reason: "회복 경과 탐색층 · 체류시간 높음" },
      { suffix: "브레인포그·집중력 저하 진료 후기", type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "정밀 검사 항목 정리",              type: "정보형", reason: "검사 탐색층 · 경쟁 낮음" },
    ];
    // 대상포진 예방접종
    if (/싱그릭스|예방접종|백신/.test(nm)) return [
      { suffix: "싱그릭스 vs 조스타박스 비교",      type: "비교형", reason: "백신 비교 탐색층 · 체류시간 높음" },
      { suffix: "50대 첫 접종 솔직 후기",           type: "후기형", reason: "첫 접종 공감층 · 전환율 높음" },
      { suffix: "비용·일정·부작용 정리",            type: "롱테일", reason: "예약 정보 탐색층 · 경쟁 낮음" },
    ];
    // 심혈관·이상지질혈증
    if (/심혈관|이상지질혈증/.test(nm)) return [
      { suffix: "가족력 있을 때 정밀 평가",         type: "정보형", reason: "가족력 탐색 · 경쟁 낮음" },
      { suffix: "경동맥 초음파 후기 솔직하게",      type: "후기형", reason: "검사 경험층 · 전환율 높음" },
      { suffix: "LDL 강화 관리 3개월 기록",         type: "롱테일", reason: "관리 결과 탐색층 · 체류시간 높음" },
    ];
    // 남성갱년기·호르몬
    if (/남성갱년기|호르몬|테스토스테론/.test(nm)) return [
      { suffix: "만성피로로 시작한 호르몬 검사",    type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "보충 요법 3개월 변화 일지",        type: "롱테일", reason: "치료 결과 탐색층 · 체류시간 높음" },
      { suffix: "비뇨기과 vs 내과 어디가 나을까",   type: "비교형", reason: "병원 비교 탐색층 · 경쟁 낮음" },
    ];
    // 알레르기
    if (/알레르기/.test(nm)) return [
      { suffix: "원인 찾고 달라진 3개월",           type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "MAST 검사 솔직 후기",              type: "후기형", reason: "검사 탐색층 · 공감 높음" },
      { suffix: "면역치료 효과 정리",               type: "정보형", reason: "치료법 탐색 · 경쟁 낮음" },
    ];
    return [
      { suffix: "내과 후기 솔직하게",               type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                   type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "gastro" ? (() => {
    const nm = treatmentData?.name || "";
    if (/내시경/.test(nm)) return [
      { suffix: "처음 받는 분들 준비 가이드",      type: "정보형", reason: "첫 내시경 탐색 · 경쟁 낮음" },
      { suffix: "수면 vs 비수면 직접 비교",        type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
      { suffix: "전날 준비부터 결과까지 솔직 후기", type: "후기형", reason: "후기 탐색층 · 전환율 높음" },
    ];
    if (/역류|식도|소화불량/.test(nm)) return [
      { suffix: "약 끊으면 재발하는 이유",         type: "정보형", reason: "재발 탐색 · 경쟁 낮음" },
      { suffix: "치료 후 달라진 식습관",           type: "롱테일", reason: "관리법 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                  type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    ];
    if (/간|지방간|간경변|간염/.test(nm)) return [
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
      { suffix: "3개월 관리 솔직 후기",            type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "건강검진 소견 받고 나서 한 것들", type: "롱테일", reason: "건강검진 후 탐색층 · 전환율 높음" },
    ];
    if (/담석|담낭|췌장/.test(nm)) return [
      { suffix: "수술 꼭 해야 하나요",             type: "정보형", reason: "수술 고민 탐색 · 경쟁 낮음" },
      { suffix: "처음 진단받고 한 것들",           type: "후기형", reason: "진단 후 탐색층 · 공감 높음" },
      { suffix: "증상 원인 찾은 이야기",           type: "롱테일", reason: "증상 탐색층 · 체류시간 높음" },
    ];
    // 위암·대장암 검진
    if (/위암|대장암/.test(nm)) return [
      { suffix: "가족력 있을 때 시작 시기",         type: "정보형", reason: "검진 시기 탐색 · 경쟁 낮음" },
      { suffix: "국가검진과 다른 점 정리",          type: "비교형", reason: "검진 비교 탐색층 · 체류시간 높음" },
      { suffix: "조기 발견된 이야기 솔직 후기",     type: "후기형", reason: "조기진단 공감층 · 전환율 높음" },
      { suffix: "검진 비용·주기 정리",              type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
    ];
    // 치질·치핵
    if (/치질|치핵/.test(nm)) return [
      { suffix: "혼자 고민하다 받은 진료 후기",     type: "후기형", reason: "심리 장벽 공감층 · 전환율 높음" },
      { suffix: "수술 vs 비수술 단계별 정리",       type: "비교형", reason: "치료 비교 탐색층 · 체류시간 높음" },
      { suffix: "좌욕·연고로 안 될 때 다음 단계",   type: "롱테일", reason: "보존 한계층 · 경쟁 낮음" },
      { suffix: "혈변으로 시작한 진단 과정",        type: "후기형", reason: "증상 공감층 · 전환율 높음" },
    ];
    // 만성변비
    if (/변비/.test(nm)) return [
      { suffix: "변비약 의존 끊고 시작한 후기",     type: "후기형", reason: "약물 의존 탈출층 · 공감 높음" },
      { suffix: "식이요법만으로 안 될 때",          type: "롱테일", reason: "보존 한계층 · 경쟁 낮음" },
      { suffix: "락툴로오즈 효과 솔직 정리",        type: "롱테일", reason: "약물 탐색층 · 체류시간 높음" },
      { suffix: "원인 찾은 정밀 검진 후기",         type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
    ];
    // 장상피화생
    if (/장상피화생/.test(nm)) return [
      { suffix: "내시경 결과 통보받고 한 것들",     type: "후기형", reason: "결과 통보 공감층 · 전환율 높음" },
      { suffix: "추적 검사 주기 정리",              type: "정보형", reason: "추적 탐색 · 경쟁 낮음" },
      { suffix: "헬리코박터 제균 함께 받은 후기",   type: "롱테일", reason: "병행 치료 탐색층 · 체류시간 높음" },
      { suffix: "위암 전구 단계 관리 솔직 후기",    type: "롱테일", reason: "고위험군 공감층 · 전환율 높음" },
    ];
    // 정맥류
    if (/정맥류/.test(nm)) return [
      { suffix: "결찰술 치료 솔직 후기",            type: "후기형", reason: "시술 경험층 · 공감 높음" },
      { suffix: "간경변 진단 후 추적 시작",         type: "롱테일", reason: "합병증 탐색층 · 체류시간 높음" },
      { suffix: "재출혈 예방 관리 정리",            type: "정보형", reason: "예방 탐색층 · 경쟁 낮음" },
    ];
    return [
      { suffix: "소화기내과 후기 솔직하게",         type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                  type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "증상 원인 찾고 달라진 것들",       type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "pediatrics" ? (() => {
    const nm = treatmentData?.name || "";
    if (/예방접종|BCG|DTaP|MMR/.test(nm)) return [
      { suffix: "맞고 나서 아이 반응 솔직 정리",  type: "후기형", reason: "접종 후 반응 탐색 · 공감 높음" },
      { suffix: "처음 맞히는 부모라면",            type: "롱테일", reason: "첫 접종 탐색층 · 전환율 높음" },
      { suffix: "언제 맞히는 게 좋나요",           type: "정보형", reason: "접종 시기 탐색 · 경쟁 낮음" },
    ];
    if (/고열|열성경련/.test(nm)) return [
      { suffix: "응급실 가야 할까요 기준 정리",    type: "정보형", reason: "응급 판단 탐색 · 경쟁 낮음" },
      { suffix: "해열제 교차 복용 후기",           type: "롱테일", reason: "실검 패턴 반영 · 체류시간 높음" },
      { suffix: "밤에 열 오를 때 대처 후기",       type: "후기형", reason: "야간 불안층 타겟 · 공감 높음" },
    ];
    if (/수족구|수두|감염/.test(nm)) return [
      { suffix: "격리 기간 얼마나 해야 하나요",    type: "정보형", reason: "격리 탐색 키워드 · 경쟁 낮음" },
      { suffix: "어린이집 언제 보낼 수 있나요",    type: "롱테일", reason: "등원 탐색층 · 체류시간 높음" },
      { suffix: "증상 진행 과정 솔직 후기",        type: "후기형", reason: "증상 탐색층 · 공감 높음" },
    ];
    if (/아토피|습진/.test(nm)) return [
      { suffix: "스테로이드 없이 관리한 이야기",   type: "롱테일", reason: "스테로이드 거부층 · 전환율 높음" },
      { suffix: "보습 루틴 정착 후기",             type: "롱테일", reason: "관리법 탐색층 · 체류시간 높음" },
      { suffix: "소아과 vs 피부과 어디가 나을까",  type: "비교형", reason: "병원 선택 탐색층 · 공감 높음" },
    ];
    if (/ADHD|발달장애|주의력/.test(nm)) return [
      { suffix: "어떻게 알 수 있나요 검사 후기",    type: "정보형", reason: "ADHD 판별 탐색 · 경쟁 낮음" },
      { suffix: "진단 전 부모가 알아야 할 것들",    type: "롱테일", reason: "정보 탐색층 · 체류시간 높음" },
      { suffix: "ADHD vs 단순 산만함 어떻게 달라요", type: "비교형", reason: "비교 탐색 · 공감 높음" },
    ];
    if (/황달|귀교정|탈구|신생아/.test(nm)) return [
      { suffix: "처음 겪는 부모 긴장 후기",         type: "후기형", reason: "초보 부모 타겟 · 공감 높음" },
      { suffix: "응급실 vs 소아과 어디로 가야 하나", type: "비교형", reason: "응급 판단 탐색 · 경쟁 낮음" },
      { suffix: "소아과에서 해결된 과정",           type: "롱테일", reason: "처치 탐색층 · 전환율 높음" },
    ];
    if (/성조숙증/.test(nm)) return [
      { suffix: "한의원 vs 소아과 어디가 나을까",    type: "비교형", reason: "병원 비교 탐색 · 공감 높음" },
      { suffix: "검사 후기 솔직하게",               type: "후기형", reason: "소아과 후기 공백 · 경쟁 낮음" },
      { suffix: "진단받고 나서 달라진 것들",        type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
    ];
    if (/변비/.test(nm)) return [
      { suffix: "3일째 못 봤을 때 소아과 간 이야기", type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "처방받고 달라진 것들",             type: "롱테일", reason: "처방 탐색층 · 체류시간 높음" },
      { suffix: "식이요법만으로 안 될 때",           type: "롱테일", reason: "실패 공감층 · 경쟁 낮음" },
    ];
    if (/빈혈/.test(nm)) return [
      { suffix: "혈액검사 후기 솔직하게",            type: "후기형", reason: "검사 탐색층 · 전환율 높음" },
      { suffix: "철분제 먹이고 나서 달라진 점",      type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
      { suffix: "증상 원인 찾은 이야기",            type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
    ];
    if (/건강검진|발달/.test(nm)) return [
      { suffix: "검진 항목 미리 알고 가기",        type: "정보형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "발달 지연 걱정 상담 후기",        type: "후기형", reason: "발달 불안층 타겟 · 공감 높음" },
      { suffix: "결과 상담에서 들은 이야기",       type: "후기형", reason: "결과 탐색층 · 전환율 높음" },
    ];
    // 비염·축농증
    if (/비염|축농증|부비동/.test(nm)) return [
      { suffix: "콧물 3주 넘게 지속될 때 후기",     type: "롱테일", reason: "장기화 탐색층 · 경쟁 낮음" },
      { suffix: "감기와 다른 점 진단 과정",         type: "정보형", reason: "감별 탐색 · 체류시간 높음" },
      { suffix: "환절기마다 재발하는 이야기",       type: "후기형", reason: "재발 공감층 · 전환율 높음" },
    ];
    // 구내염·헤르판지나
    if (/구내염|헤르판지나/.test(nm)) return [
      { suffix: "갑자기 못 먹기 시작했을 때 후기",  type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "수족구와 다른 점 정리",            type: "정보형", reason: "감별 탐색 · 경쟁 낮음" },
      { suffix: "어린이집 등원 기준 정리",          type: "롱테일", reason: "등원 탐색층 · 체류시간 높음" },
    ];
    // 야뇨증
    if (/야뇨/.test(nm)) return [
      { suffix: "혼낼까 고민하다 진료받은 후기",    type: "후기형", reason: "부모 죄책감 공감층 · 전환율 높음" },
      { suffix: "검사 후 원인 찾은 이야기",         type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "약물치료 효과 솔직 정리",          type: "롱테일", reason: "치료 결과 탐색 · 경쟁 낮음" },
    ];
    // 키성장클리닉
    if (/키성장|성장호르몬|저신장/.test(nm)) return [
      { suffix: "성장판 닫히기 전 시작한 이야기",   type: "롱테일", reason: "시기 탐색층 · 전환율 높음" },
      { suffix: "검사 비용·기간 솔직 정리",         type: "롱테일", reason: "비용 탐색층 · 체류시간 높음" },
      { suffix: "한의원 vs 소아과 어디가 나을까",   type: "비교형", reason: "병원 비교 탐색 · 공감 높음" },
      { suffix: "또래보다 작아서 시작한 후기",      type: "후기형", reason: "비교 공감층 · 전환율 높음" },
    ];
    // RSV·모세기관지염
    if (/RSV|모세기관지염/.test(nm)) return [
      { suffix: "쌕쌕거림으로 시작한 입원 후기",    type: "후기형", reason: "입원 경험층 · 공감 높음" },
      { suffix: "단순 감기와 다른 점 정리",         type: "정보형", reason: "감별 탐색 · 경쟁 낮음" },
      { suffix: "예방·관찰 핵심 솔직 정리",         type: "롱테일", reason: "예방 탐색층 · 체류시간 높음" },
    ];
    // 결막염·다래끼
    if (/결막염|다래끼/.test(nm)) return [
      { suffix: "어린이집에서 옮아온 후기",         type: "후기형", reason: "집단 감염 공감층 · 전환율 높음" },
      { suffix: "안과 vs 소아과 어디가 나을까",     type: "비교형", reason: "병원 비교 탐색 · 경쟁 낮음" },
      { suffix: "격리·등원 기준 정리",              type: "정보형", reason: "등원 탐색층 · 체류시간 높음" },
    ];
    // 소아비만
    if (/비만/.test(nm)) return [
      { suffix: "체중 급증 걱정으로 시작한 후기",   type: "후기형", reason: "체중 변화 공감층 · 전환율 높음" },
      { suffix: "성조숙증 걱정으로 검사한 이야기",  type: "롱테일", reason: "합병증 탐색층 · 체류시간 높음" },
      { suffix: "식이·운동 처방 솔직 정리",         type: "롱테일", reason: "관리법 탐색층 · 경쟁 낮음" },
    ];
    return [
      { suffix: "소아과 다녀온 후기 솔직하게",     type: "후기형", reason: "소아과 후기 공백 · 경쟁 낮음" },
      { suffix: "언제 소아과 가야 할까요",         type: "정보형", reason: "방문 기준 탐색 · 경쟁 낮음" },
      { suffix: "처방받고 나서 며칠 만에 나았나",  type: "롱테일", reason: "회복 기간 탐색층 · 체류시간 높음" },
      { suffix: "집에서 버티다 결국 간 이야기",    type: "후기형", reason: "공감형 탐색층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "oriental" ? (() => {
    // 한의원은 치료 카테고리별로 완전히 다른 suffix 사용
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 교통사고
    if (/교통사고/.test(nm)) return [
      { suffix: "후유증 관리 솔직 후기",        type: "롱테일", reason: "교통사고 후유증 공백 · 경쟁 낮음" },
      { suffix: "보험 처리 치료 후기",          type: "롱테일", reason: "보험 탐색층 · 전환율 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "사고 후 통증 있다면",          type: "롱테일", reason: "증상 탐색 키워드 · 경쟁 낮음" },
    ];
    // 근골격 (추나·도수·체외충격파·관절)
    if (/추나|도수|체외충격파|관절/.test(nm)) return [
      { suffix: "효과 언제부터 느꼈나요",       type: "롱테일", reason: "치료 전 탐색 검색어 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 정리",          type: "롱테일", reason: "치료 후 정보 탐색 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 보험 적용 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 내과·한약·공진단·소화기·면역
    if (/한약|공진단|소화기|면역|뜸/.test(nm)) return [
      { suffix: "효과 있나요 솔직 후기",        type: "후기형", reason: "효능 의심층 타겟 · 공감 높음" },
      { suffix: "처음 복용 후기",               type: "후기형", reason: "처음 경험층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "체질 개선 경험담",             type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
    // 여성·산후·갱년기·생리·난임
    if (/산후|갱년기/.test(nm)) return [
      { suffix: "후기 솔직하게 정리했습니다",   type: "후기형", reason: "여성 공감층 타겟 · 전환율 높음" },
      { suffix: "효과 언제부터 체감했나요",     type: "롱테일", reason: "증상 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 생리통·생리불순
    if (/생리통|생리불순/.test(nm)) return [
      { suffix: "진통제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "진통제 탈출층 · 공감 높음" },
      { suffix: "체질별 맞춤 치료 솔직 정리",     type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
      { suffix: "처음 한방 진단받고 달라진 것",   type: "후기형", reason: "초진 고민층 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",            type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 난임·임신준비
    if (/난임|임신준비/.test(nm)) return [
      { suffix: "시험관 전 체질 개선 후기",     type: "롱테일", reason: "시험관 보조 탐색 · 경쟁 낮음" },
      { suffix: "6개월 관리 솔직 일지",         type: "롱테일", reason: "장기 치료 탐색층 · 체류시간 높음" },
      { suffix: "처음 난임 한방 상담 후기",     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "자궁 환경 개선 솔직 정리",     type: "롱테일", reason: "원인 탐색층 · 공감 높음" },
    ];
    // 피부·다이어트
    if (/피부|다이어트/.test(nm)) return [
      { suffix: "전후 변화 솔직 후기",          type: "후기형", reason: "결과 탐색층 타겟 · 전환율 높음" },
      { suffix: "효과 있나요 체질별 비교",      type: "롱테일", reason: "체질 비교 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 신경(구안와사·중풍)
    if (/구안와사|중풍/.test(nm)) return [
      { suffix: "72시간 내 치료 시작 후기",     type: "롱테일", reason: "초기 치료 탐색 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 정리",          type: "롱테일", reason: "회복 정보 탐색 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "후유증 없이 나은 이야기",      type: "후기형", reason: "결과 탐색층 · 공감 높음" },
    ];
    // 이명·난청
    if (/이명|난청/.test(nm)) return [
      { suffix: "양방 후 한방 병행 후기",       type: "롱테일", reason: "양방 한계 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 달라진 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "한약·침치료 병행 솔직 후기",   type: "후기형", reason: "병행 치료 탐색층 · 공감 높음" },
      { suffix: "처음 한방 진단 후기",          type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 불면증·수면장애
    if (/불면|수면/.test(nm)) return [
      { suffix: "수면제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "수면제 탈출층 · 공감 높음" },
      { suffix: "3개월 변화 솔직 일지",           type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "스트레스성 불면 회복 후기",      type: "후기형", reason: "원인 공감층 · 전환율 높음" },
      { suffix: "체질 진단 솔직 정리",            type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
    // 소아한방(틱·ADHD·성장)
    if (/소아한방|틱|성장한약/.test(nm)) return [
      { suffix: "아이 변화 6개월 솔직 일지",    type: "롱테일", reason: "장기 관리 부모층 · 체류시간 높음" },
      { suffix: "약물 부담 없이 시작한 후기",   type: "후기형", reason: "약물 회피층 · 공감 높음" },
      { suffix: "처음 소아 한방 상담 후기",     type: "후기형", reason: "초진 부모층 · 전환율 높음" },
      { suffix: "체질·성장·면역 한 번에 본 후기", type: "롱테일", reason: "통합 관리 탐색층 · 경쟁 낮음" },
    ];
    // 두통·편두통 한방
    if (/두통|편두통/.test(nm)) return [
      { suffix: "진통제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "진통제 의존 탈출층 · 공감 높음" },
      { suffix: "원인별 맞춤 치료 솔직 정리",     type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "3개월 변화 솔직 일지",           type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "처음 한방 진단 후기",            type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 기본 (침·부항 등)
    return [
      { suffix: "처음 받아봤는데 솔직 후기",    type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
      { suffix: "효과 있나요 상담 후기",        type: "후기형", reason: "효능 의심층 타겟 · 전환율 높음" },
      { suffix: "비용 횟수 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "체질 원인 찾고 달라진 것",     type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
  })() : detectedIndustry === "neuro" ? (() => {
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 척추수술후증후군 — 별도 분기 (디스크보다 우선)
    if (/척추수술후|FBSS|수술후증후군/.test(nm)) return [
      { suffix: "수술 후 통증 재발 후기",       type: "후기형", reason: "수술 후 통증 공감층 · 전환율 매우 높음" },
      { suffix: "재시술 없이 회복한 일지",      type: "롱테일", reason: "재수술 회피층 · 경쟁 낮음" },
      { suffix: "신경성형술 솔직 후기",         type: "롱테일", reason: "비수술 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 공감 높음" },
    ];
    // 척추·디스크
    if (/디스크|협착|압박골절/.test(nm) || cat === "척추·디스크") return [
      { suffix: "비수술 치료 후기 솔직 정리",   type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "수술 없이 치료한 이야기",      type: "후기형", reason: "비수술 공감층 · 전환율 높음" },
      { suffix: "재활 회복 일지",               type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 두통·신경통
    if (/두통|편두통|삼차신경통|후두신경통|군발/.test(nm) || cat === "두통·신경통") return [
      { suffix: "약 끊고 시술 받은 후기",       type: "롱테일", reason: "약 의존 탈출층 · 전환율 높음" },
      { suffix: "원인 찾고 달라진 이야기",      type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "신경외과 검진 후기",           type: "후기형", reason: "검진 고민층 · 공감 높음" },
      { suffix: "뇌MRI까지 받아본 솔직 후기",   type: "롱테일", reason: "검사 탐색층 · 체류시간 높음" },
    ];
    // 신경차단·통증
    if (/신경차단|신경성형|고주파|FIMS|체외충격파/.test(nm) || cat === "신경차단·통증") return [
      { suffix: "시술 후 통증 변화 솔직 정리",  type: "롱테일", reason: "시술 결과 탐색층 · 전환율 높음" },
      { suffix: "비수술 치료 후기",             type: "후기형", reason: "비수술 공감층 · 경쟁 낮음" },
      { suffix: "만성통증 치료 일지",           type: "롱테일", reason: "만성통증 탐색층 · 체류시간 높음" },
      { suffix: "처음 시술 솔직 후기",          type: "후기형", reason: "첫 경험층 · 공감 높음" },
    ];
    // 좌골신경통 — 별도 분기 (말초신경 카테고리 안에서 우선 매칭)
    if (/좌골신경통/.test(nm)) return [
      { suffix: "엉덩이 다리 저림 호전 일지",   type: "후기형", reason: "특정 증상 공감 · 전환율 높음" },
      { suffix: "비수술 치료 솔직 후기",        type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 해결한 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 말초신경·손저림
    if (/수근관|척골신경|말초신경/.test(nm) || cat === "말초신경·손저림") return [
      { suffix: "손저림 호전 일지",             type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "수술 없이 치료한 후기",        type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 해결한 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 이명 — 별도 분기 (어지럼 카테고리 안에서 우선 매칭)
    if (/이명|귀울림/.test(nm)) return [
      { suffix: "이명 원인 찾은 솔직 후기",     type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "만성이명 검진 일지",           type: "롱테일", reason: "만성 탐색층 · 체류시간 높음" },
      { suffix: "수면 회복 후기",               type: "롱테일", reason: "수면 영향 공감층 · 경쟁 낮음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 기억력저하·인지검사 — 별도 분기
    if (/기억력|인지기능|건망증/.test(nm)) return [
      { suffix: "인지기능검사 솔직 후기",       type: "롱테일", reason: "검사 탐색층 · 경쟁 낮음" },
      { suffix: "건망증 원인 찾은 후기",        type: "후기형", reason: "원인 고민층 · 전환율 높음" },
      { suffix: "치매 조기 검진 후기",          type: "롱테일", reason: "예방 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 어지럼·뇌신경
    if (/어지럼|뇌MRI|안면경련/.test(nm) || cat === "어지럼·뇌신경") return [
      { suffix: "원인 찾은 솔직 후기",          type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "뇌MRI 검진 후기",              type: "롱테일", reason: "검진 탐색층 · 경쟁 낮음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 신경외과 기본값
    return [
      { suffix: "신경외과 후기 솔직하게",       type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "비수술 치료 후기",             type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "psy" ? (() => {
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 강박장애 — 별도 분기 (우울·불안 카테고리 안에서 우선 매칭)
    if (/강박/.test(nm)) return [
      { suffix: "확인행동 줄어든 일지",         type: "롱테일", reason: "강박 행동 변화 탐색층 · 체류시간 높음" },
      { suffix: "노출치료 솔직 후기",           type: "롱테일", reason: "ERP 탐색층 · 경쟁 낮음" },
      { suffix: "혼자 고민하다 받은 후기",      type: "후기형", reason: "낙인 우려층 · 공감 높음" },
      { suffix: "처음 정신건강의학과 후기",     type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 사회불안장애 — 별도 분기
    if (/사회불안|사회공포/.test(nm)) return [
      { suffix: "발표불안 호전 일지",           type: "롱테일", reason: "발표 상황 탐색층 · 경쟁 낮음" },
      { suffix: "회피 줄어든 솔직 후기",        type: "후기형", reason: "회피층 공감 · 전환율 높음" },
      { suffix: "약 없이 관리한 4주 일지",      type: "롱테일", reason: "비약물 탐색층 · 체류시간 높음" },
      { suffix: "처음 정신건강의학과 후기",     type: "후기형", reason: "초진 고민층 · 공감 높음" },
    ];
    // 우울·불안 (우울증·불안장애·공황·번아웃)
    if (/우울증|불안장애|공황|번아웃/.test(nm) || cat === "우울·불안") return [
      { suffix: "솔직 후기 4주 일지",           type: "롱테일", reason: "변화 시점 탐색층 · 경쟁 낮음" },
      { suffix: "혼자 고민하다 받은 후기",      type: "후기형", reason: "낙인 우려층 · 공감 높음" },
      { suffix: "약 끊을지 고민한 이야기",      type: "롱테일", reason: "복약 고민층 · 체류시간 높음" },
      { suffix: "처음 정신건강의학과 후기",     type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 아동 ADHD — 별도 분기 (수면·집중 카테고리 안에서 우선 매칭)
    if (/아동 ADHD|아동ADHD/.test(nm)) return [
      { suffix: "초등학생 검사 솔직 후기",      type: "후기형", reason: "학부모 검색 多 · 전환율 높음" },
      { suffix: "약물 없이 관리한 일지",        type: "롱테일", reason: "비약물 우선층 · 경쟁 낮음" },
      { suffix: "학교 적응 회복 후기",          type: "롱테일", reason: "학교 부적응 공감층 · 체류시간 높음" },
      { suffix: "처음 정신건강의학과 후기",     type: "후기형", reason: "초진 고민층 · 공감 높음" },
    ];
    // 수면·집중
    if (/불면|ADHD|집중/.test(nm) || cat === "수면·집중") return [
      { suffix: "약물 없이 관리한 일지",        type: "롱테일", reason: "비약물 우선층 · 경쟁 낮음" },
      { suffix: "수면 패턴 회복 후기",          type: "후기형", reason: "수면 탐색층 · 공감 높음" },
      { suffix: "성인이 받은 솔직 후기",        type: "롱테일", reason: "성인 ADHD 검색 多" },
      { suffix: "검사부터 진료까지 후기",       type: "후기형", reason: "검사 고민층 · 전환율 높음" },
    ];
    // 애도 상담 — 별도 분기
    if (/애도|사별/.test(nm)) return [
      { suffix: "사별 후 회복 일지",            type: "롱테일", reason: "애도 회복 탐색층 · 체류시간 높음" },
      { suffix: "오래 미루다 받은 상담 후기",   type: "후기형", reason: "회피층 · 공감 높음" },
      { suffix: "혼자 견디다 받은 후기",        type: "후기형", reason: "고립층 공감 · 전환율 높음" },
      { suffix: "처음 상담 솔직 후기",          type: "후기형", reason: "초진 고민층 · 공감 높음" },
    ];
    // 분노조절 — 별도 분기
    if (/분노조절|충동조절/.test(nm)) return [
      { suffix: "감정 폭발 줄어든 일지",        type: "롱테일", reason: "변화 탐색층 · 체류시간 높음" },
      { suffix: "가족과 함께 받은 상담 후기",   type: "후기형", reason: "가족 동행층 · 공감 높음" },
      { suffix: "약 없이 관리한 4주 후기",      type: "롱테일", reason: "비약물 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 솔직 후기",          type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 관계·트라우마
    if (/트라우마|관계|PTSD/.test(nm) || cat === "관계·트라우마") return [
      { suffix: "오래 미루다 받은 상담 후기",   type: "후기형", reason: "회피층 · 공감 높음" },
      { suffix: "관계 갈등 패턴 정리 후기",     type: "롱테일", reason: "패턴 인식층 · 경쟁 낮음" },
      { suffix: "EMDR 회기 솔직 일지",          type: "롱테일", reason: "EMDR 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 솔직 후기",          type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // EMDR — 별도 분기
    if (/EMDR/.test(nm)) return [
      { suffix: "회기별 변화 솔직 일지",        type: "롱테일", reason: "회기 변화 탐색층 · 체류시간 높음" },
      { suffix: "약 외 다른 길 알아본 후기",    type: "롱테일", reason: "비약물 탐색층 · 경쟁 낮음" },
      { suffix: "트라우마 재처리 솔직 후기",    type: "후기형", reason: "트라우마 회복 공감층 · 전환율 높음" },
      { suffix: "처음 받아본 후기",             type: "후기형", reason: "첫 경험층 · 전환율 높음" },
    ];
    // 마음챙김 (MBCT) — 별도 분기
    if (/마음챙김|MBCT|명상치료/.test(nm)) return [
      { suffix: "재발 방지 4주 일지",           type: "롱테일", reason: "재발 우려층 · 체류시간 높음" },
      { suffix: "약 외 다른 길 알아본 후기",    type: "롱테일", reason: "비약물 탐색층 · 경쟁 낮음" },
      { suffix: "처음 받아본 솔직 후기",        type: "후기형", reason: "첫 경험층 · 공감 높음" },
      { suffix: "병행한 솔직 후기",             type: "후기형", reason: "병행 고민층 · 전환율 높음" },
    ];
    // 비약물치료 (CBT·rTMS·뉴로피드백)
    if (/CBT|rTMS|뉴로피드백|인지행동/.test(nm) || cat === "비약물치료") return [
      { suffix: "약 외 다른 길 알아본 후기",    type: "롱테일", reason: "비약물 탐색층 · 경쟁 낮음" },
      { suffix: "회기별 변화 솔직 일지",        type: "롱테일", reason: "회기 변화층 · 체류시간 높음" },
      { suffix: "병행한 솔직 후기",             type: "후기형", reason: "병행 고민층 · 공감 높음" },
      { suffix: "처음 받아본 후기",             type: "후기형", reason: "첫 경험층 · 전환율 높음" },
    ];
    // 노인 정신건강 — 별도 분기 (연령별 특화 안에서 우선 매칭)
    if (/노인/.test(nm)) return [
      { suffix: "어르신 우울 진료 솔직 후기",   type: "후기형", reason: "자녀 검색 多 · 전환율 높음" },
      { suffix: "인지검사 함께 받은 후기",      type: "롱테일", reason: "치매 감별 탐색층 · 체류시간 높음" },
      { suffix: "가족이 함께 본 후기",          type: "후기형", reason: "가족 동행층 · 공감 높음" },
      { suffix: "처음 정신건강의학과 후기",     type: "후기형", reason: "초진 고민층 · 공감 높음" },
    ];
    // 연령별 특화 (청소년·중년·산후)
    if (/청소년|중년|산후/.test(nm) || cat === "연령별 특화") return [
      { suffix: "가족이 함께 본 후기",          type: "후기형", reason: "가족 동행층 · 공감 높음" },
      { suffix: "혼자 끙끙대다 받은 후기",      type: "후기형", reason: "회피층 · 전환율 높음" },
      { suffix: "회복 일지 솔직 정리",          type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "처음 진료 후기",               type: "후기형", reason: "초진 고민층 · 공감 높음" },
    ];
    // 정신과 기본값
    return [
      { suffix: "정신건강의학과 후기 솔직하게", type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 진료 솔직 후기",          type: "후기형", reason: "초진 고민층 · 전환율 높음" },
      { suffix: "회복 일지 정리",               type: "롱테일", reason: "변화 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "eye" ? (() => {
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 렌즈교환술(RLE) — 별도 분기 (시력교정 카테고리 안에서 우선 매칭)
    if (/렌즈교환|RLE/.test(nm)) return [
      { suffix: "노안·고도근시 동시 교정 일지",  type: "롱테일", reason: "복합 교정 탐색층 · 경쟁 낮음" },
      { suffix: "vs 라식 비교 솔직 후기",        type: "비교형", reason: "비교 탐색층 · 결정 직전 독자" },
      { suffix: "다초점 인공수정체 선택 이유",   type: "롱테일", reason: "렌즈 선택 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 시력교정 (라식·라섹·스마일라식·ICL)
    if (/라식|라섹|스마일|ICL|안내렌즈/.test(nm) || cat === "시력교정") return [
      { suffix: "수술 전후 시력 변화 일지",     type: "롱테일", reason: "시력 변화 탐색층 · 체류시간 높음" },
      { suffix: "회복 기간 솔직 후기",          type: "롱테일", reason: "회복 탐색층 · 경쟁 낮음" },
      { suffix: "vs 다른 시력교정 비교 후기",   type: "비교형", reason: "비교 탐색층 · 결정 직전 독자" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 백내장·노안
    if (/백내장|노안|다초점/.test(nm) || cat === "백내장·노안") return [
      { suffix: "다초점 vs 단초점 고민한 이야기", type: "비교형", reason: "렌즈 선택 탐색층 · 전환율 높음" },
      { suffix: "수술 후 시야 변화 일지",         type: "롱테일", reason: "변화 탐색층 · 체류시간 높음" },
      { suffix: "비용 보험 적용 정리",            type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "처음 진단받고 한 것들",          type: "후기형", reason: "진단 후 공감층 · 전환율 높음" },
    ];
    // 망막·녹내장
    if (/망막|녹내장|황반|당뇨망막/.test(nm) || cat === "망막·녹내장") return [
      { suffix: "처음 진단받고 한 것들",        type: "후기형", reason: "진단 후 공감층 · 전환율 높음" },
      { suffix: "안압 관리 6개월 일지",         type: "롱테일", reason: "관리 탐색층 · 체류시간 높음" },
      { suffix: "주사 치료 솔직 후기",          type: "롱테일", reason: "치료 탐색층 · 경쟁 낮음" },
      { suffix: "정기 검진 후기",               type: "후기형", reason: "검진 탐색층 · 공감 높음" },
    ];
    // 익상편 — 별도 분기 (안구건조·결막 카테고리 안에서 우선 매칭)
    if (/익상편|군날개/.test(nm)) return [
      { suffix: "수술 후 회복 1개월 일지",      type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "vs 경과 관찰 고민한 이야기",   type: "비교형", reason: "수술 결정 탐색층 · 경쟁 낮음" },
      { suffix: "재발 관리 솔직 후기",          type: "롱테일", reason: "재발 우려층 · 공감 높음" },
      { suffix: "처음 진단받고 한 것들",        type: "후기형", reason: "진단 후 공감층 · 전환율 높음" },
    ];
    // 안구건조·결막
    if (/안구건조|결막염|다래끼|눈꺼풀/.test(nm) || cat === "안구건조·결막") return [
      { suffix: "원인 찾고 달라진 이야기",      type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "IPL 치료 솔직 후기",           type: "롱테일", reason: "IPL 탐색층 · 체류시간 높음" },
      { suffix: "인공눈물 끊고 해결한 후기",    type: "후기형", reason: "약물 의존 탈출층 · 전환율 높음" },
      { suffix: "처음 안과 상담 후기",          type: "후기형", reason: "상담 고민층 · 공감 높음" },
    ];
    // 사시·소아안과
    if (/사시|약시|근시|드림렌즈|아트로핀/.test(nm) || cat === "사시·소아안과") return [
      { suffix: "아이 시력 진행 1년 일지",      type: "롱테일", reason: "진행 탐색층 · 체류시간 높음" },
      { suffix: "드림렌즈 vs 아트로핀 비교",    type: "비교형", reason: "관리법 비교 탐색층 · 전환율 높음" },
      { suffix: "처음 진단받은 부모 후기",      type: "후기형", reason: "초보 부모 타겟 · 공감 높음" },
      { suffix: "치료 기간 얼마나 걸리나요",    type: "롱테일", reason: "기간 탐색층 · 경쟁 낮음" },
    ];
    // 콘택트렌즈 처방 — 별도 분기 (검진·상담 카테고리 안에서 우선 매칭)
    if (/콘택트렌즈|하드렌즈|소프트렌즈/.test(nm)) return [
      { suffix: "처음 착용 솔직 후기",          type: "후기형", reason: "첫 경험층 · 공감 높음" },
      { suffix: "하드 vs 소프트 비교 후기",     type: "비교형", reason: "렌즈 선택 탐색층 · 전환율 높음" },
      { suffix: "안과 처방 vs 안경원 차이",     type: "비교형", reason: "구매처 탐색층 · 경쟁 낮음" },
      { suffix: "각막 안전성 검사 후기",        type: "롱테일", reason: "안전성 탐색층 · 체류시간 높음" },
    ];
    // 검진·상담
    if (/검진|상담/.test(nm) || cat === "검진·상담") return [
      { suffix: "검진 항목 미리 알고 가기",     type: "정보형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "처음 받아보는 분들을 위해",    type: "롱테일", reason: "초보 탐색층 · 체류시간 높음" },
      { suffix: "결과 상담에서 들은 이야기",    type: "후기형", reason: "결과 탐색층 · 공감 높음" },
    ];
    // 안과 기본값
    return [
      { suffix: "안과 후기 솔직하게",           type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "회복 기간 솔직 정리",          type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "family" ? (() => {
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 만성질환 (고혈압·당뇨·고지혈증)
    if (/고혈압|당뇨|고지혈|콜레스테롤/.test(nm) || cat === "만성질환") return [
      { suffix: "약 처방 받고 3개월 일지",       type: "롱테일", reason: "약물 시작 탐색층 · 체류시간 높음" },
      { suffix: "vs 생활습관만 고민한 이야기",   type: "비교형", reason: "약물 결정 탐색층 · 경쟁 낮음" },
      { suffix: "수치 변화 솔직 정리",          type: "롱테일", reason: "수치 추적 탐색층 · 공감 높음" },
      { suffix: "처음 진단받고 한 것들",         type: "후기형", reason: "진단 직후 공감층 · 전환율 높음" },
    ];
    // 검진·예방
    if (/검진|예방접종|백신|싱그릭스/.test(nm) || cat === "검진·예방") return [
      { suffix: "이상 소견 받고 한 것들",        type: "후기형", reason: "검진 후 불안층 · 공감 높음" },
      { suffix: "검진 항목 비교 정리",          type: "비교형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "처음 받아보는 분들에게",        type: "롱테일", reason: "초보 탐색층 · 체류시간 높음" },
    ];
    // 감기·소화기
    if (/감기|몸살|역류|위산|과민성대장|IBS/.test(nm) || cat === "감기·소화기") return [
      { suffix: "약 처방 1주차 회복 기록",       type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "약국 약 vs 진료 고민한 이야기", type: "비교형", reason: "진료 결정 탐색층 · 경쟁 낮음" },
      { suffix: "오래 가는 증상 솔직 후기",      type: "후기형", reason: "장기 증상층 · 공감 높음" },
      { suffix: "처음 진료 받고 한 것들",        type: "후기형", reason: "진료 직후 공감층 · 전환율 높음" },
    ];
    // 다이어트
    if (/삭센다|위고비|비만|다이어트/.test(nm) || cat === "다이어트") return [
      { suffix: "3개월 체중 감량 솔직 기록",     type: "롱테일", reason: "감량 추적 탐색층 · 체류시간 높음" },
      { suffix: "삭센다 vs 위고비 비교 후기",   type: "비교형", reason: "약물 선택 탐색층 · 전환율 높음" },
      { suffix: "부작용 솔직 정리",             type: "롱테일", reason: "부작용 우려층 · 경쟁 낮음" },
      { suffix: "처음 처방 받아본 후기",         type: "후기형", reason: "첫 경험층 · 공감 높음" },
    ];
    // 수액·영양
    if (/수액|영양주사|마늘주사|신데렐라|비타민|면역/.test(nm) || cat === "수액·영양") return [
      { suffix: "피로 회복 솔직 후기",          type: "롱테일", reason: "회복 효과 탐색층 · 공감 높음" },
      { suffix: "종류별 비교 정리",             type: "비교형", reason: "수액 선택 탐색층 · 경쟁 낮음" },
      { suffix: "vs 경구 영양제 고민한 이야기", type: "비교형", reason: "비교 탐색층 · 전환율 높음" },
      { suffix: "처음 맞아본 후기",             type: "후기형", reason: "첫 경험층 · 공감 높음" },
    ];
    // 생활습관 (금연·만성피로)
    if (/금연|챔픽스|만성피로|번아웃|피로/.test(nm) || cat === "생활습관") return [
      { suffix: "처방 3개월 솔직 기록",         type: "롱테일", reason: "장기 관리 탐색층 · 체류시간 높음" },
      { suffix: "vs 의지로만 고민한 이야기",     type: "비교형", reason: "약물 결정 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 달라진 이야기",      type: "후기형", reason: "원인 탐색층 · 공감 높음" },
      { suffix: "처음 진료 받아본 후기",         type: "후기형", reason: "첫 경험층 · 공감 높음" },
    ];
    // 가정의학과 기본값
    return [
      { suffix: "가정의학과 후기 솔직하게",      type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 진료 받아본 후기",         type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "관리 3개월 솔직 정리",          type: "롱테일", reason: "관리 탐색층 · 체류시간 높음" },
    ];
  })() : [
    { suffix: "붓기 회복 일지",           type: "롱테일", reason: "성형 회복 정보 검색 多 · 경쟁 낮음" },
    { suffix: "붓기 멍 기간",             type: "롱테일", reason: "시술 전 불안 검색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "솔직 후기",               type: "후기형", reason: "신뢰형 검색어 · 광고글 회피층" },
    { suffix: "30대 경험담",             type: "롱테일", reason: "연령대 타겟 · 경쟁 낮음" },
  ];

  // compareWith — 업종별 기본값
  const compareWithText  = treatmentData?.compareWith
    || (detectedIndustry === "dental"  ? "틀니"
      : detectedIndustry === "ent"     ? "약물치료"
      : detectedIndustry === "urology"  ? "약물치료"
      : detectedIndustry === "oriental" ? "양방치료"
      : detectedIndustry === "ortho"    ? "수술치료"
      : detectedIndustry === "pediatrics" ? "응급실"
      : detectedIndustry === "gastro"      ? "경과 관찰"
      : detectedIndustry === "general"     ? "생활습관 교정만"
      : detectedIndustry === "obgyn"       ? "경과 관찰"
      : detectedIndustry === "pain"        ? "수술치료"
      : detectedIndustry === "neuro"       ? "신경차단술"
      : detectedIndustry === "psy"         ? "심리상담"
      : detectedIndustry === "eye"         ? "라섹"
      : detectedIndustry === "family"      ? "생활습관 교정만"
      : "울쎄라");
  const compareWithText2 = detectedIndustry === "dental"   ? "브릿지"
                         : detectedIndustry === "ent"      ? "수술치료"
                         : detectedIndustry === "urology"  ? "수술치료"
                         : detectedIndustry === "oriental" ? "정형외과치료"
                         : detectedIndustry === "pediatrics" ? "자연치유"
                         : detectedIndustry === "gastro"      ? "CT 검사"
                         : detectedIndustry === "general"     ? "건강기능식품"
                         : detectedIndustry === "obgyn"       ? "수술"
                         : detectedIndustry === "pain"        ? "물리치료"
                         : detectedIndustry === "neuro"       ? "경막외신경성형술"
                         : detectedIndustry === "psy"         ? "약물치료"
                         : detectedIndustry === "eye"         ? "스마일라식"
                         : detectedIndustry === "family"      ? "건강기능식품"
                         : "써마지";
  const COMPARE_SUFFIXES = [
    { suffix: `vs ${compareWithText} 비교`,  type: "비교형", reason: "비교 탐색층 · 결정 직전 독자" },
    { suffix: `vs ${compareWithText2} 차이`, type: "비교형", reason: "비교 검색 많음 · 체류시간 길음" },
  ];

  // keyword 자체가 "서초 임플란트"처럼 region 포함한 경우 중복 방지
  const base = keyword.includes(treatmentName) ? keyword : (region ? `${region} ${treatmentName}` : treatmentName);

  let suggestions = [];

  if (competition === "높음") {
    // 경쟁 높음 → 롱테일 강력 추천
    suggestions = [
      ...LONGTAIL_SUFFIXES.slice(0, 2).map((s, i) => ({
        keyword:     `${base} ${s.suffix}`,
        type:        s.type,
        competition: "낮음",
        reason:      s.reason,
        recommended: i === 0,
      })),
      hasCompare ? null : {
        keyword:     `${base} ${COMPARE_SUFFIXES[0].suffix}`,
        type:        "비교형",
        competition: "중간",
        reason:      COMPARE_SUFFIXES[0].reason,
        recommended: false,
      },
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "원본 키워드 그대로 (경쟁 높음)",
        recommended: false,
      },
    ].filter(Boolean);
  } else if (competition === "중간") {
    suggestions = [
      {
        keyword:     `${base} ${LONGTAIL_SUFFIXES[0].suffix}`,
        type:        "롱테일",
        competition: "낮음",
        reason:      LONGTAIL_SUFFIXES[0].reason,
        recommended: true,
      },
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "현재 키워드 (경쟁 중간)",
        recommended: false,
      },
      {
        keyword:     `${base} ${COMPARE_SUFFIXES[0].suffix}`,
        type:        "비교형",
        competition: "중간",
        reason:      COMPARE_SUFFIXES[0].reason,
        recommended: false,
      },
    ];
  } else {
    // 이미 낮음 → 원본 추천 + 추가 변형 1개
    suggestions = [
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "이미 좋은 롱테일 키워드 ✅",
        recommended: true,
      },
      {
        keyword:     `${base} ${LONGTAIL_SUFFIXES[2].suffix}`,
        type:        "후기형",
        competition: "낮음",
        reason:      LONGTAIL_SUFFIXES[2].reason,
        recommended: false,
      },
    ];
  }

  return { competition, suggestions, keyword };
}

  // 키워드 경쟁 분석 → 우측 패널 분석 카드 표시 (완전 내부 로직 — API/GPT 비용 없음)
  const analyzeKeyword = (parsed, text) => {
    const keyword = `${parsed.region} ${parsed.treatmentName}`.trim();
    const analysis = analyzeKeywordLocal(keyword, parsed.treatmentName, parsed.region);
    const cl = COMPETITION_LABEL[analysis.competition] || COMPETITION_LABEL["중간"];

    // 우측 패널에 분석 카드 표시
    setAnalysisData({ ...analysis, parsed, text });
    setStage("analysis"); // 분석 단계 스테이지

    // 좌측 대화창 — 간단히 안내만
    addMsg({
      role: "assistant",
      text: `${cl.emoji} "${keyword}" 분석 완료
오른쪽에서 글 방향을 선택해주세요.`,
    });
  };

  // 분석 결과에서 전략 선택 → 생성
  const handleAnalysisSelect = (s, analysisCtx, regionOverride) => {
    const { parsed, text } = analysisCtx;
    const newParsed      = parseNaturalInput(s.keyword);
    const finalRegion    = regionOverride || newParsed.region || parsed.region;
    const finalTreatment = newParsed.treatmentId  || parsed.treatmentId;
    const finalName      = newParsed.treatmentName || parsed.treatmentName;
    const autoBlogType   = s.type === "비교형" ? "compare"
                         : s.type === "후기형" ? "review"
                         : parseBlogTypeFromText(text);
    const autoTarget     = parseTargetFromText(s.keyword + " " + text);
    const overrideTitle  = s.overrideTitle || null; // 추천 제목 클릭 시 전달

    // 지역 없으면 → AnalysisBoard에 지역 입력 요청 (생성 중단)
    if (!finalRegion) {
      setAnalysisData(prev => ({ ...prev, needRegion: true, pendingSelection: s }));
      return;
    }

    setAnalysisData(null);
    setSelectedStrategyIdx(null);
    const displayTitle = overrideTitle || `${finalRegion} ${finalName}`;
    // s.keyword 가 이미 region 을 포함하는 경우 중복 prefix 방지
    const userMsgText = overrideTitle
      || (s.keyword.startsWith(finalRegion) ? s.keyword : `${finalRegion} ${s.keyword}`);
    addMsg({ role: "user", text: userMsgText });
    addMsg({ role: "assistant", text: `${displayTitle}\n${BLOGTYPE_LABEL[autoBlogType]} 글로 작성합니다.` });
    setStage("generating");
    generate(finalTreatment, finalRegion, autoBlogType, autoTarget, overrideTitle, finalName);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;

    // 가이드/사진편집기 탭에서 입력 시 본문 탭으로 자동 전환
    if (resultTab !== "blog") setResultTab("blog");

    setInput("");
    addMsg({ role: "user", text });

    const parsed = parseNaturalInput(text);

    if (parsed.treatmentId) {
      // 지역 없으면 먼저 지역 선택
      if (!parsed.region) {
        // 지역 없음 → 우측 패널에서 지역 선택 (대화창 질문 없음)
        setPendingTreatment({ id: parsed.treatmentId, name: parsed.treatmentName });
        setStage("treatment");
        addMsg({ role: "assistant", text: `${parsed.treatmentName} 블로그를 작성합니다.\n오른쪽에서 지역을 선택해주세요.` });
        return;
      }
      // 키워드 경쟁 분석 → 전략 제안
      setStage("treatment");
      analyzeKeyword(parsed, text);

    } else {
      setStage("treatment");
      setShowTreatmentSelect(true); // 우측 패널에 시술 선택 표시
      addMsg({
        role: "assistant",
        text: "어떤 시술 블로그를 작성할까요?\n오른쪽에서 시술을 선택해주세요.",
      });
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const charCount = result ? calcValidCharCount(result.text) : 0;

  return (
    <>
      <Head>
        <title>블로그 생성기</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans KR', sans-serif; background: #f7f7f8; }
          @keyframes bounce  { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
          @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(123,31,162,.35)} 50%{box-shadow:0 0 0 9px rgba(123,31,162,0)} }
          @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
          textarea { outline: none; }
          button { transition: all .15s; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #d0b8e8; border-radius: 4px; }
        `}</style>
      </Head>

      <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: "#f7f7f8" }}>

        {/* ── 좌측 사이드바 ── */}
        <div style={{ width: 60, flexShrink: 0, background: "#1a1a2e",
          display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#9C27B0,#CE93D8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, marginBottom: 8, cursor: "pointer" }}>✦</div>
          {[{ icon: "💬", label: "대화" }, { icon: "📄", label: "글 목록" }, { icon: "📊", label: "분석" }, { icon: "⚙️", label: "설정" }]
            .map((item, i) => (
              <div key={i} title={item.label}
                style={{ width: 40, height: 40, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, cursor: "pointer",
                  color: i === 0 ? "#CE93D8" : "#4a4a6a",
                  background: i === 0 ? "rgba(156,39,176,.15)" : "transparent" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(156,39,176,.1)"}
                onMouseOut={e => e.currentTarget.style.background = i === 0 ? "rgba(156,39,176,.15)" : "transparent"}>
                {item.icon}
              </div>
            ))}
        </div>

        {/* ── 메인 영역 ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── 좌측: 대화창 50% — 도구 탭일 때 숨김 ── */}
          {resultTab !== "tools" && (
          <div style={{ width: "50%", flexShrink: 0, display: "flex", flexDirection: "column",
            borderRight: "1px solid #e8e8ed", background: "#f7f7f8" }}>
            <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid #e8e8ed",
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>블로그 생성기</div>
              {/* 업종 전환 드롭다운 */}
              <div style={{ position: "relative" }}>
                <select
                  value={CURRENT_INDUSTRY}
                  onChange={e => router.push(`/?industry=${e.target.value}`)}
                  style={{
                    fontSize: 11, color: "#9C27B0", fontWeight: 700,
                    background: "#F3E5F5", borderRadius: 16, padding: "3px 10px 3px 10px",
                    border: "1.5px solid #CE93D8", cursor: "pointer",
                    fontFamily: "inherit", outline: "none", appearance: "none",
                    paddingRight: 24,
                  }}
                >
                  <option value="clinic">💉 성형외과</option>
                  <option value="dental">🦷 치과</option>
                  <option value="ent">👂 이비인후과</option>
                  <option value="urology">🩺 비뇨기과</option>
                  <option value="oriental">🌿 한의원</option>
                  <option value="ortho">🦴 정형외과</option>
                  <option value="pediatrics">👶 소아청소년과</option>
                  <option value="gastro">🏥 소화기내과</option>
                  <option value="general">💊 내과</option>
                  <option value="obgyn">🌸 산부인과</option>
                  <option value="derma">✨ 피부과</option>
                  <option value="pain">💉 통증의학과</option>
                  <option value="neuro">🧠 신경외과</option>
                  <option value="psy">🌱 정신건강의학과</option>
                  <option value="eye">👁️ 안과</option>
                  <option value="family">👨‍⚕️ 가정의학과</option>
                </select>
                <span style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  fontSize: 8, color: "#9C27B0", pointerEvents: "none",
                }}>▼</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
              <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>
                {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div style={{ padding: "16px 20px 20px", background: "#fff", borderTop: "1px solid #e8e8ed" }}>
              <div style={{ maxWidth: 600, margin: "0 auto" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end",
                  background: "#fff", borderRadius: 16, padding: "10px 14px",
                  border: "1.5px solid #e0d0f0", boxShadow: "0 2px 12px rgba(156,39,176,.08)" }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="원하시는 블로그를 말씀해주세요..." rows={1}
                    style={{ flex: 1, border: "none", background: "transparent",
                      fontFamily: "inherit", fontSize: 14, resize: "none",
                      lineHeight: 1.6, color: "#1a1a2e", maxHeight: 100, overflowY: "auto" }} />
                  <button onClick={handleSend} disabled={loading || !input.trim()}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none",
                      cursor: loading || !input.trim() ? "default" : "pointer",
                      background: loading || !input.trim() ? "#e8e8ed" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                      color: loading || !input.trim() ? "#aaa" : "#fff",
                      fontSize: 16, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(74,20,140,.3)" }}>↑</button>
                </div>
                <div style={{ fontSize: 10, color: "#b0b0c0", textAlign: "center", marginTop: 6 }}>
                  Enter 전송 · Shift+Enter 줄바꿈
                </div>
              </div>
            </div>
          </div>
          )}

          {/* ── 우측: 결과 패널 — 도구 탭이면 100%, 아니면 50% ── */}
          <div style={{ width: resultTab === "tools" ? "100%" : "50%",
            display: "flex", flexDirection: "column",
            background: "#fff", overflow: "hidden",
            transition: "width .25s ease" }}>

            {/* ── 상단 헤더 — 좌측 헤더와 동일 높이 ── */}
            <div style={{ padding: "0 16px", borderBottom: "1px solid #e8e8ed",
              background: "#fff", flexShrink: 0,
              display: "flex", alignItems: "center", height: 53, gap: 10 }}>
              <span style={{ fontSize: 18 }}>
                {resultTab === "tools" ? "🖼️" : resultTab === "guide" ? "📚" : "📝"}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#4A148C" }}>
                {resultTab === "tools" ? "사진편집기" : resultTab === "guide" ? "발행 가이드" : "블로그 글 작업 화면"}
              </span>
              {result && resultTab === "blog" && (
                <span style={{ marginLeft: 4, fontSize: 10, background: "#F3E5F5",
                  color: "#7B1FA2", borderRadius: 8, padding: "1px 8px", fontWeight: 700 }}>
                  완료
                </span>
              )}

              {/* 우측 버튼 그룹 — 항상 노출 */}
              {(
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  {[
                    { id: "blog",  icon: "📝", label: "본문" },
                    { id: "tools", icon: "🖼️", label: "사진편집기" },
                    { id: "guide", icon: "📚", label: "가이드" },
                  ].map(b => {
                    const active = resultTab === b.id;
                    return (
                      <button key={b.id} onClick={() => setResultTab(b.id)}
                        style={{ padding: "10px 20px", borderRadius: 10,
                          border: active ? "2px solid #7B1FA2" : "1.5px solid #e0d0f0",
                          background: active ? "#F3E5F5" : "#fff",
                          color: active ? "#4A148C" : "#666",
                          fontSize: 14, fontWeight: active ? 800 : 700,
                          cursor: "pointer", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 7,
                          transition: "all .15s",
                          boxShadow: active ? "0 2px 8px rgba(123,31,162,.18)" : "none" }}
                        onMouseOver={e => { if (!active) e.currentTarget.style.background = "#faf8ff"; }}
                        onMouseOut={e => { if (!active) e.currentTarget.style.background = "#fff"; }}>
                        <span style={{ fontSize: 16 }}>{b.icon}</span>
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 단계 표시줄 ── */}
            {stage !== "result" && (() => {
              const selectedKw = selectedStrategyIdx !== null && analysisData?.suggestions?.[selectedStrategyIdx]?.keyword;
              const step =
                stage === "generating"   ? { icon: "✍️", text: "글 작성 중...",     sub: "약 30~60초 소요됩니다",     color: "#7B1FA2", bg: "#F3E5F5" }
              : selectedKw               ? { icon: "✅", text: "전략 선택됨",        sub: selectedKw,                  color: "#4A148C", bg: "#EDE7F6" }
              : stage === "analysis"     ? { icon: "🎯", text: "노출 전략 선택",    sub: "아래 전략을 선택하세요",     color: "#1565C0", bg: "#E3F2FD" }
              : pendingTreatment         ? { icon: "📍", text: "지역 선택",         sub: `${pendingTreatment.name}`,   color: "#E65100", bg: "#FFF3E0" }
              : showTreatmentSelect      ? { icon: "💉", text: "시술 선택",         sub: "카테고리에서 고르세요",       color: "#6A1B9A", bg: "#F3E5F5" }
              : null;
              if (!step) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderBottom: "1px solid #e8e8ed",
                  background: step.bg, flexShrink: 0, transition: "background .3s" }}>
                  <span style={{ fontSize: 15 }}>{step.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: step.color }}>{step.text}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{step.sub}</div>
                  </div>
                </div>
              );
            })()}

            {/* 메인 콘텐츠 영역 */}
            <div style={{ display: "flex",
              flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* ★ 탭 우선 — 사진편집기/가이드는 글 생성 전에도 작동 */}
              {resultTab === "tools" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
                  <ToolsAccordion defaultOpenId="watermark" />
                </div>
              ) : resultTab === "guide" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
                  <GuideAccordion defaultOpenId="first" />
                  <div style={{ height: 40 }} />
                </div>
              ) : showTreatmentSelect && !pendingTreatment && stage === "treatment" ? (
                <TreatmentSelectBoard
                  treatments={activeTreatments}
                  cats={activeCats}
                  onSelect={(t) => {
                    setShowTreatmentSelect(false);
                    addMsg({ role: "user", text: t.name });
                    setPendingTreatment({ id: t.id, name: t.name });
                    setStage("treatment");
                  }}
                />
              ) : stage === "analysis" && analysisData ? (
                <AnalysisBoard
                  analysis={analysisData}
                  onSelect={(s, regionOverride) => handleAnalysisSelect(s, analysisData, regionOverride)}
                  selectedIdx={selectedStrategyIdx}
                  onSelectIdx={setSelectedStrategyIdx}
                />
              ) : pendingTreatment && stage === "treatment" ? (
                /* 시술 선택 후 지역 선택 — 우측 패널 */
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", background: "#f7f7fb",
                  animation: "fadeIn .25s ease" }}>
                  <div style={{ background: "#fff", borderRadius: 14,
                    border: "2px solid #9C27B0", padding: "20px 18px",
                    boxShadow: "0 3px 14px rgba(123,31,162,.1)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0", marginBottom: 6 }}>
                      💉 {pendingTreatment.name} 선택됨
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1a2e", marginBottom: 16 }}>
                      📍 지역을 선택하세요
                    </div>
                    {/* 자주 쓰는 지역 버튼 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                      {["강남","압구정","청담","서초","홍대","분당","수원","별내","동탄","인천","부산","대구","광주","대전"].map(r => (
                        <button key={r}
                          onClick={() => {
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }}
                          style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                            border: "1.5px solid #e0d0f0", background: "#fff", color: "#4A148C",
                            cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#F3E5F5"; e.currentTarget.style.borderColor = "#CE93D8"; }}
                          onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0d0f0"; }}>
                          {r}
                        </button>
                      ))}
                    </div>
                    {/* 직접 입력 */}
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>직접 입력 (중랑구, 수원시, 해운대구 등)</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        id="region-direct-input"
                        placeholder="예: 중랑구"
                        style={{ flex: 1, padding: "10px 14px", borderRadius: 10,
                          border: "1.5px solid #e0d0f0", fontFamily: "inherit",
                          fontSize: 13, outline: "none" }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && e.target.value.trim()) {
                            const r = e.target.value.trim();
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById("region-direct-input");
                          const r = el?.value?.trim();
                          if (r) {
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }
                        }}
                        style={{ padding: "10px 18px", borderRadius: 10, border: "none",
                          background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
                          fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                        확인
                      </button>
                    </div>
                  </div>
                </div>
              ) : stage !== "result" ? (
                <StatusBoard
                  stage={stage}
                  onResume={(draft) => {
                    addMsg({ role: "user", text: `${draft.region} ${draft.treatmentName} 이어쓰기` });
                    generate(draft.treatmentId, draft.region, draft.blogType || "review", draft.targetId || "consult", null, draft.treatmentName || "");
                  }}
                  onNewStart={() => {
                    setStage("welcome");
                    addMsg({ role: "assistant", text: "새로 시작합니다!\n어떤 시술 블로그를 작성할까요?" });
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "fadeIn .3s ease" }}>

                  {/* 헤더 — 본문 탭일 때만 표시 */}
                  {resultTab === "blog" && (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e8ed", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>✔ 글 생성 완료</span>
                        <span style={{ background: charCount >= 2000 ? "#e8f5e9" : "#fff3e0",
                          borderRadius: 12, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                          color: charCount >= 2000 ? "#2e7d32" : "#e65100" }}>
                          {charCount.toLocaleString()}자
                        </span>
                        {diagResult && !diagLoading && (
                          <span style={{ background: diagResult.totalScore >= 90 ? "#e8f5e9" : "#fff3e0",
                            borderRadius: 12, padding: "2px 9px", fontSize: 11, fontWeight: 700,
                            color: diagResult.totalScore >= 90 ? "#2e7d32" : "#e65100" }}>
                            SEO {diagResult.totalScore}점
                          </span>
                        )}
                        {diagLoading && <span style={{ fontSize: 11, color: "#CE93D8" }}>● 분석 중</span>}
                      </div>
                      <button onClick={() => { setResult(null); setStage("welcome"); }}
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e8e8ed",
                          cursor: "pointer", background: "#fff", color: "#999", fontSize: 13,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>

                    {/* 전체 복사 버튼 */}
                    <button
                      onClick={() => {
                        const plain = (result.text || "")
                          // 인라인 헤더 앞에 줄바꿈 강제 (예: "결정됨. ### 1일" → "결정됨.\n### 1일")
                          .replace(/([^\n])\s*(#{1,6})\s+/g, "$1\n\n$2 ")
                          .replace(/^#{1,6}\s+/gm, "")     // # 제목 → 제목
                          .replace(/\*\*(.+?)\*\*/g, "$1") // **굵게** → 굵게
                          .replace(/\*(.+?)\*/g, "$1");    // *기울임* → 기울임
                        navigator.clipboard.writeText(plain); setCopied(true); setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                        background: copied ? "#e8f5e9" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                        color: copied ? "#2e7d32" : "#fff",
                        boxShadow: copied ? "none" : "0 2px 8px rgba(74,20,140,.2)" }}>
                      {copied ? "✅ 복사됨 — 네이버 블로그에 붙여넣기" : "📋 전체 복사"}
                    </button>
                  </div>
                  )}

                  {/* ── 탭 콘텐츠 ── */}
                  <div style={{ flex: 1, overflowY: "auto" }}>

                    {/* 탭 1: 본문 */}
                    {resultTab === "blog" && (
                      <div style={{ padding: "18px 22px" }}>
                        <BlogContent text={result.text} uploadedImgs={uploadedImgs} onUpload={handleBlogImgUpload} />

                        {/* 발행 전 체크리스트 */}
                        <div style={{ marginTop: 24, background: "#faf8ff", borderRadius: 12,
                          border: "1px solid #ede8f8", padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#7B1FA2", marginBottom: 10 }}>📋 발행 전 체크리스트</div>
                          {[
                            { label: "제목 수정",  desc: "지역+시술+상황 포함 여부 확인" },
                            { label: "이미지 5장", desc: "고민·상담·시술전·시술후·결과" },
                            { label: "사진 자리",  desc: "[📷 사진N] 위치에 본인 사진 끼우기" },
                            { label: "첫 문단",    desc: "2줄 이내로 짧게 시작하는지 확인" },
                            { label: "마지막 줄",  desc: "전환 문장 자동 추가됨 ✅" },
                          ].map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                              padding: "5px 0", borderBottom: i < 4 ? "1px solid #f0ebff" : "none" }}>
                              <span style={{ fontSize: 14 }}>{i === 4 ? "✅" : "☐"}</span>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{item.label}</span>
                                <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>{item.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ height: 40 }} />
                      </div>
                    )}

                    {/* 탭 2: 사진편집기 */}
                    {resultTab === "tools" && (
                      <div style={{ padding: 0 }}>
                        <ToolsAccordion defaultOpenId="watermark" />
                      </div>
                    )}

                    {/* 탭 3: 가이드 */}
                    {resultTab === "guide" && (
                      <div style={{ padding: "18px 22px" }}>
                        <GuideAccordion defaultOpenId="first" />
                        <div style={{ height: 40 }} />
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>



          </div>

        </div>
      </div>
    </>
  );
}
