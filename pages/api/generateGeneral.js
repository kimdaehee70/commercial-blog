// ============================================================
// generateGeneral.js — 내과·가정의학과 전용 블로그 생성기 v1.0
// ⚠️ clinic/dental/pediatrics/gastro 등 절대 참조 금지
//
// SEO 품질 보증 (소아과 92~95점 구조):
//   1. INFO_BLOCKS 강제 삽입 (reason 섹션)
//   2. EXAM_VALUES 수치 강제 삽입 (consult 섹션)
//   3. 진료명 조사 연결 14개 패턴 교정
//   4. 키워드 3회↑ 반복 자동 차단
//   5. QC 로그
// ============================================================
import { GENERAL_TREATMENTS }   from "../../lib/general-data";
import { buildGeneralPrompt }   from "../../lib/general-prompts";
import { GENERAL_FLOW_ENGINE }  from "../../lib/general-playConfig";
import {
  openai, calcCharCount, removeDuplicateSentences,
  stripInlineImages, restoreKeyword, diagnosePost,
  generateSection, autoSave,
} from "./generateUtils";

// ★ v2.0 — 과별 침투 차단 + 안전 단어 제거 모듈
import { getCrossBlocks } from "../../lib/industryBlocks";
import { safeRemoveWords } from "../../lib/safeRemove";

// ★ v2.0 — 과별 침투 차단 (lib/industryBlocks.js)
//   다른 과 정체성 키워드 자동 차단 (한 곳 수정 = 16개 파일 동시 적용)
const GENERAL_CROSS_BLOCK = getCrossBlocks("general");

// ── 금지 키워드 ──────────────────────────────────────────
const GENERAL_FORBIDDEN = [
  "쌍꺼풀", "눈매교정", "실리프팅", "울쎄라", "써마지",
  "피코레이저", "레이저토닝", "지방흡입", "코성형", "성형외과",
  "임플란트", "라미네이트", "스케일링", "투명교정",
  "전립선", "포경수술", "비뇨기",
  "소아과", "어린이집",
  "결론적으로", "따라서", "이와 같이", "정리하면", "앞서 언급한",
  "이 방법",
  // ⚠️ "이 치료가/를/는"은 빈 문자열로 제거하면 조사 깨짐 발생
  //    예: "이 치료를 통해" → " 통해" / "이 치료의 필요" → 문장 와해
  //    → 본문 정규화 블록(forEach 직후)에서 안전 보정 처리
  "중요합니다", "확인하세요", "추천드립니다", "최고의", "검증된 의료진",
  "드디어 결심하고", "결국 선택하게 되었어요", "마음이 편안해졌어요",
];

// ── 정보 블럭 (강제 삽입) ────────────────────────────────
const GENERAL_INFO_BLOCKS = {
  '고혈압': {
    title: '고혈압, 약을 꼭 먹어야 하나요?',
    items: [
      '1기 고혈압(140~159/90~99): 생활습관 교정 3개월 후 재평가 가능',
      '2기 이상(160/100↑) or 위험인자 동반: 바로 약물 시작 권장',
    ],
    warning: '수축기 180 이상 or 두통·시야 이상 동반 시 즉시 응급실',
  },
  '당뇨': {
    title: '당뇨 전단계 vs 당뇨, 어떻게 다른가요?',
    items: [
      '당뇨 전단계: 공복혈당 100~125 or HbA1c 5.7~6.4% — 생활습관 교정으로 역전 가능',
      '당뇨 확진: 공복혈당 126↑ or HbA1c 6.5↑ — 약물 치료 시작',
    ],
    warning: '혈당 300 이상 or 의식 저하 시 즉시 응급실 (당뇨 응급)',
  },
  '고지혈증': {
    title: '콜레스테롤 약, 근육 부작용 얼마나 위험한가요?',
    items: [
      '스타틴 근육통 발생률: 약 5~10%, 대부분 약 줄이거나 교체로 해결',
      'LDL 목표: 심혈관 질환 없으면 130 미만 / 있으면 70 미만',
    ],
    warning: '스타틴 복용 중 심한 근육통·소변 색 변화 시 즉시 내과 방문',
  },
  '갑상선 기능이상': {
    title: '갑상선 기능저하 vs 항진, 증상이 반대예요',
    items: [
      '기능저하: 피로·체중 증가·변비·추위 많이 탐 → TSH 높음',
      '기능항진: 체중 감소·두근거림·더위·설사 → TSH 낮음',
    ],
    warning: '심한 두근거림·숨 가쁨·고열이 동반되면 갑상선 위기 — 즉시 응급실',
  },
  '건강검진': {
    title: '국가건강검진 vs 종합검진, 뭐가 다른가요?',
    items: [
      '국가검진: 무료·기본 항목(혈액·소변·X-ray) / 짝수 or 홀수 연도 대상자',
      '종합검진: 유료·추가 항목(내시경·CT·암표지자 등) / 원하는 시기 가능',
    ],
    warning: '검진 결과 이상 소견은 반드시 내과 추적 상담 필요 — 방치 금지',
  },
  '대상포진': {
    title: '대상포진, 72시간 안에 병원 가야 하는 이유',
    items: [
      '항바이러스제: 발진 시작 72시간 내 복용 시 신경통 위험 60% 감소',
      '대상포진 후 신경통: 약 10~15%에서 3개월 이상 지속 — 조기 치료가 핵심',
    ],
    warning: '눈 주위 발진이면 안과 동시 방문 필수 — 시력 손상 위험',
  },
  '수액·영양주사': {
    title: '영양주사 종류별 차이, 뭘 맞아야 할까요?',
    items: [
      '마이어스칵테일: 비타민C+B복합+마그네슘 — 피로회복·면역 종합',
      '백옥주사(글루타치온): 항산화·피부 미백 효과 — 20~30분',
    ],
    warning: '주사 후 두드러기·호흡 곤란 시 아나필락시스 가능 — 즉시 신고',
  },
  '만성피로': {
    title: '만성피로, 어떤 검사부터 받아야 하나요?',
    items: [
      '1차 감별: CBC(빈혈)·갑상선(TSH)·혈당·비타민D·간기능 — 내과 기본 세트',
      '이상 없으면: 부신피로·수면장애·우울 등 기능적 원인 탐색',
    ],
    warning: '체중 감소·야간 발열·림프절 비대 동반 시 악성 질환 감별 필수',
  },
  '독감·감기(성인)': {
    title: '독감 vs 감기, 어떻게 구별하나요?',
    items: [
      '감기: 서서히 시작, 콧물·기침 중심, 열 낮거나 없음',
      '독감: 갑작스러운 38.5도↑ 고열 + 심한 근육통·두통 — 타미플루 48시간 내',
    ],
    warning: '65세 이상·임산부·만성질환자는 독감 합병증 위험 — 반드시 내과 방문',
  },
  '비타민D 결핍': {
    title: '비타민D 수치, 어느 정도면 주사를 맞아야 하나요?',
    items: [
      '정상: 30ng/mL 이상 / 부족: 20~29 / 결핍: 20 미만',
      '결핍(<20): 고용량 주사 or 경구 2000~4000IU / 경미한 부족: 1000~2000IU 경구',
    ],
    warning: '비타민D 과잉(150 이상)도 독성 위험 — 임의 고용량 복용 금지',
  },
  '빈혈(성인)': {
    title: '빈혈, 철분제만 먹으면 되나요?',
    items: [
      '철 결핍성 빈혈: 가장 흔함 — 원인 파악 후 철분제 3개월',
      '거대적혈구 빈혈(B12·엽산 결핍): 철분제 효과 없음 — 원인 다름',
    ],
    warning: '흑색변·혈변 동반 빈혈은 위장관 출혈 의심 — 즉시 내과 방문',
  },
  '금연 클리닉': {
    title: '챔픽스 vs 니코틴 패치, 어떤 게 더 효과적인가요?',
    items: [
      '챔픽스(바레니클린): 금연 성공률 약 44% — 가장 높음, 처방 필요',
      '니코틴 패치: 성공률 약 24% — 처방 불필요, 부작용 적음',
    ],
    warning: '챔픽스 복용 중 우울감·자살충동 변화 시 즉시 의사 상담',
  },
  '비만·다이어트 치료': {
    title: '마운자로 vs 위고비 vs 삭센다, 어떻게 다른가요?',
    items: [
      '삭센다(리라글루티드): 매일 주사 / 마운자로·위고비: 주 1회 주사',
      '마운자로(티르제파티드): GLP-1+GIP 이중작용 — 최신·체중 감량 효과 가장 큼',
    ],
    warning: '구역·구토·췌장염 부작용 가능 — 반드시 처방 하에 사용',
  },
  '수면 장애': {
    title: '수면제 의존성, 실제로 얼마나 위험한가요?',
    items: [
      '단기 처방(2~4주): 의존성 위험 낮음 — 원인 치료와 병행이 핵심',
      '장기 복용: 의존·내성 위험 — 반드시 전문의 지도하에 감량',
    ],
    warning: '수면제 복용 중 음주 절대 금지 — 호흡 억제 위험',
  },
  '생활습관병 관리': {
    title: '고혈압·당뇨·고지혈증 다 있으면 어디서 관리해야 하나요?',
    items: [
      '가정의학과: 복합 만성질환 통합 관리에 최적화 — 약 조합 최소화',
      '각 과 분리 방문: 약 중복·상호작용 위험 증가',
    ],
    warning: '심혈관 위험도 높은 경우 아스피린·스타틴 통합 처방 중요',
  },
};

// ── 검사 수치 기본값 ─────────────────────────────────────
const GENERAL_EXAM_VALUES = {
  '고혈압':             ['수축기 혈압 152mmHg / 이완기 94mmHg', '심전도 정상 소견', 'ARB 계열 처방'],
  '당뇨':               ['HbA1c 7.2%', '공복혈당 142mg/dL', '메트포민 500mg 처방'],
  '고지혈증':           ['LDL 콜레스테롤 178mg/dL', '중성지방 245mg/dL', '로수바스타틴 10mg 처방'],
  '갑상선 기능이상':    ['TSH 0.08 mIU/L(정상하한 이하)', 'Free T4 2.1ng/dL 상승', '항갑상선제 처방'],
  '건강검진':           ['공복혈당 108mg/dL(경계)', 'LDL 162mg/dL', '흉부 X-ray 정상'],
  '대상포진':           ['우측 흉부 T6 피부분절 수포 확인', '발진 발생 52시간 경과', '발라사이클로버 5일 처방'],
  '수액·영양주사':      ['마이어스칵테일 30분 투여', '비타민C 10g + B복합 + 마그네슘', '주 2회 권장'],
  '만성피로':           ['비타민D 11ng/mL(결핍)', '혈청 페리틴 9ng/mL(저하)', 'TSH 정상 범위'],
  '독감·감기(성인)':    ['신속항원검사 인플루엔자 A 양성', '체온 38.9도', '타미플루 75mg 5일 처방'],
  '비타민D 결핍':       ['25(OH)D3 8ng/mL(심각한 결핍)', '콜레칼시페롤 300,000IU 주사', '3개월 후 재검'],
  '빈혈(성인)':         ['헤모글로빈 9.8g/dL', '혈청 페리틴 6ng/mL', 'MCV 69fL(소구성)'],
  '금연 클리닉':        ['FTND 니코틴 의존도 7점(높음)', '챔픽스 0.5mg 시작 → 1mg 증량', '12주 처방'],
  '비만·다이어트 치료': ['BMI 28.4', '체지방률 34%', '마운자로 2.5mg 주 1회 시작'],
  '수면 장애':          ['피츠버그 수면질지수(PSQI) 14점(심각)', '수면 잠복기 90분', '졸피뎀 5mg 2주 처방'],
  '생활습관병 관리':    ['Framingham 10년 심혈관 위험도 18%', '수축기 혈압 148 / HbA1c 6.8% / LDL 165', '3제 통합 처방'],
};

// ── 정보 블럭 강제 삽입 ──────────────────────────────────
function insertGeneralInfoBlock(text, treatmentName) {
  const block = GENERAL_INFO_BLOCKS[treatmentName];
  if (!block) return text;
  if (text.includes(block.title) || /vs|어떻게 다른|어떻게 구별|어떻게 달라/.test(text)) return text;
  const blockText = "\n\n**" + block.title + "**\n"
    + block.items.map(i => "- " + i).join("\n")
    + "\n\n> ⚠️ " + block.warning;
  return text.trimEnd() + blockText;
}

// ── 검사 수치 강제 삽입 ──────────────────────────────────
function injectGeneralExamValue(text, treatmentName) {
  const values = GENERAL_EXAM_VALUES[treatmentName];
  if (!values) return text;
  if (/\d+(\.\d+)?\s*(mmHg|mg\/dL|%|ng\/mL|mIU\/L|점|kg|IU|g\/dL)/.test(text)) return text;
  const examNote = "\n\n(검사 결과: " + values[0] + ", " + (values[1] || "") + ")";
  if (text.includes("[이미지:")) return text.replace(/(\[이미지:[^\]]+\])/, examNote + "\n\n$1");
  return text + examNote;
}

// ── 제목 생성 ────────────────────────────────────────────
function buildGeneralTitle(treatmentName, region, seoData, blogTypeId) {
  if (seoData?.titlePatterns?.length) {
    const raw = seoData.titlePatterns[Math.floor(Math.random() * seoData.titlePatterns.length)];
    return raw.replace(/\{region\}/g, region);
  }
  if (blogTypeId === 'compare') {
    const cw = seoData?.compareWith || '다른 방법';
    return region + " " + treatmentName + " vs " + cw + " 비교｜내과 상담 후 선택한 이유";
  }
  const defaults = [
    region + " 내과 " + treatmentName + " 후기｜수치부터 관리까지 솔직하게",
    treatmentName + " 걱정했는데｜" + region + " 가정의학과에서 들은 이야기",
    region + " " + treatmentName + "｜미루다 결국 내과 간 이야기",
    treatmentName + " 처음 진단받은 날｜" + region + " 내과 실제 후기",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── 해시태그 ─────────────────────────────────────────────
function buildGeneralHashtags(treatmentName, region) {
  const kw = treatmentName.replace(/[\s·()]/g, '');
  return [
    "#" + region + "내과", "#" + kw + "후기", "#가정의학과",
    "#" + kw, "#" + region + kw, "#건강관리",
    "#만성질환", "#내과후기", "#" + region + "가정의학과",
  ].slice(0, 10).join(' ');
}

// ── 본문 정제 ────────────────────────────────────────────
function cleanGeneralText(text, treatmentName) {
  let result = text;

  // 금지 키워드 제거 — 🛡️ v2.0 safeRemoveWords + CROSS_BLOCK
  //   - 부분 매칭 방지 (한글 단어 경계 검증)
  //   - 조사 포함 패턴 함께 제거
  //   - 제거 직후 공백 자동 normalize
  //   ⚠️ 이전 forEach replace는 "시술하는" → " 하는" 사고 유발
  const removeList = [...GENERAL_FORBIDDEN, ...GENERAL_CROSS_BLOCK];
  result = safeRemoveWords(result, removeList);

  // ─────────────────────────────────────────────────────
  // [본문 정규화] FORBIDDEN 목록에서 제거된 "이 치료가/를/는" 보정
  //   - 본문에 GPT가 직접 출력한 "이 치료를 통해" 같은 표현은 자연스럽게 둠
  //   - 단, 조사 깨짐 패턴(아래 참조)만 안전하게 보정
  //   ⚠️ 이 블록 제거 금지 — FORBIDDEN_BASE에서 조사어 빠진 이유와 짝
  // ─────────────────────────────────────────────────────
  result = result
    // "이 치료은" (잘못된 조사) → "이 치료는"
    .replace(/이\s*치료은/g, "이 치료는")
    // 단독 " 통해" (앞에 공백, 문장 시작) — "이 치료를" 또는 비슷한 주어가 사라진 경우 복구
    .replace(/(^|[.!?]\s+)통해\s+/gm, "$1이 치료를 통해 ")
    // "이 치료의 필요/진행/시작/결정/중요" — 잘못된 조사
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)합니다/g, "이 치료가 $1합니다")
    .replace(/이\s*치료의\s+(필요|진행|시작|결정|중요)해요/g,   "이 치료가 $1해요")
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

  if (treatmentName) {
    const tn = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const joinPatterns = [
      [tn + "이\\s+내과",   "내과"],
      [tn + "이\\s+진단",   "진단"],
      [tn + "이\\s+나",     "증상이 나"],
      [tn + "이\\s+있",     "증상이 있"],
      [tn + "이\\s+생",     "증상이 생"],
      [tn + "이\\s+심",     "증상이 심"],
      [tn + "을\\s+치료",   "치료를"],
      [tn + "을\\s+받",     "치료를 받"],
      [tn + "으로\\s+진단", "으로 진단"],
      [tn + "가\\s+나",     "증상이 나"],
      [tn + "가\\s+내",     "내"],
      [tn + "에\\s+걸",     "에 걸"],
      [tn + "\\s*\\.\\s*라는", "이라는"],
      [tn + "이\\s+걱",     "걱"],
      [tn + "이\\s+수치",    "수치"],
      [tn + "이\\s+치료에",  "이 치료에"],
      [tn + "이\\s+검사",    "검사"],
      [tn + "이\\s+약",      "약이"],
      [tn + "이\\s+처방",    "처방이"],
    ];
    joinPatterns.forEach(function(item) {
      try { result = result.replace(new RegExp(item[0], 'g'), item[1]); } catch(e) {}
    });
  }

  if (treatmentName && treatmentName.length > 1) {
    const tnRaw = treatmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = result.match(new RegExp(tnRaw, 'g')) || [];
    if (matches.length > 3) {
      let count = 0;
      result = result.replace(new RegExp(tnRaw, 'g'), function(m) {
        count++;
        return count > 3 ? '이 증상' : m;
      });
    }
  }

  // 문장 끊김 패턴 교정 (버그 #2)
  result = result
    .replace(/\u201c|\u201d|\u2018|\u2019/g, '"')
    .replace(/([\uAC00-\uD7A3])\s*"\s*\n/g, '$1 이라고 하셨어요\n')
    .replace(/([\uAC00-\uD7A3])\s*"\s*$/gm, '$1 이라고 하셨어요')
    .replace(/하는 것이\s*"\s*$/gm, '하는 것이 중요하다고 하셨어요');

  result = result
    .replace(/드디어 결심하고/g, '결국')
    .replace(/결국 선택하게 되었어요/g, '선택했어요')
    .replace(/마음이 편안해졌어요/g, '안심이 됐어요')
    .replace(/친절하고 전문적이셔서/g, '꼼꼼하게 봐주셔서')
    .replace(/를  /g, '를 ')
    .replace(/을  /g, '을 ')
    .replace(/받고나면/g, '받고 나면');

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ── 회복 타임라인 삽입 ───────────────────────────────────
function insertGeneralTimeline(text, treatmentName) {
  const hasTimeline = /일차|일째|주일|개월|D\+/.test(text);
  if (!hasTimeline) return text;
  const isChronic  = /고혈압|당뇨|고지혈증|갑상선|생활습관/.test(treatmentName);
  const isAcute    = /독감|대상포진|수액|빈혈/.test(treatmentName);
  const m1Note = isChronic ? '수치 재검사, 약 용량 조정 여부 확인'
               : isAcute   ? '증상 완전 소실, 일상 복귀'
               : '컨디션 변화 체감, 생활습관 정착';
  const timeline = "\n\n**경과 요약**\n"
    + "- 처방 후 1~2주: 부작용 여부 확인, 증상 변화 관찰\n"
    + "- 1개월차: " + m1Note + "\n"
    + "- 3개월차: 수치 목표 달성 여부 재검사";
  return text.trimEnd() + timeline;
}

// ── 추천 대상 맵 ─────────────────────────────────────────
const GENERAL_REC_MAP = {
  '고혈압':             ['혈압 140/90 이상이 반복 측정되는 경우', '두통·어지럼증이 혈압과 연관된 것 같은 경우'],
  '당뇨':               ['공복혈당 126 이상 or HbA1c 6.5% 이상인 경우', '당뇨 전단계로 관리가 필요한 경우'],
  '고지혈증':           ['LDL 160 이상 or 심혈관 위험인자가 있는 경우', '건강검진에서 콜레스테롤 이상 소견을 받은 경우'],
  '갑상선 기능이상':    ['원인 모를 피로·체중 변화·체온 조절 이상이 있는 경우', 'TSH 이상 소견을 받은 경우'],
  '건강검진':           ['40세 이상 국가건강검진 대상자', '건강검진 이상 소견으로 추가 상담이 필요한 경우'],
  '대상포진':           ['한쪽 몸에 띠 모양 수포가 생긴 경우', '50세 이상 면역력 저하가 의심되는 경우'],
  '수액·영양주사':      ['만성 피로로 컨디션 회복이 필요한 경우', '경구 영양제 효과가 없어 주사를 고려하는 경우'],
  '만성피로':           ['6개월 이상 원인 모를 피로가 지속되는 경우', '빈혈·갑상선 등 기질적 원인 감별이 필요한 경우'],
  '독감·감기(성인)':    ['갑작스러운 38.5도 이상 고열 + 근육통이 동반되는 경우', '독감 의심 증상 48시간 이내인 경우'],
  '비타민D 결핍':       ['혈중 비타민D 20ng/mL 미만 진단을 받은 경우', '만성 피로·근육통·면역력 저하가 동반된 경우'],
  '빈혈(성인)':         ['헤모글로빈 여성 12g/dL 미만 or 남성 13g/dL 미만인 경우', '어지럼증·두근거림·만성 피로가 동반된 경우'],
  '금연 클리닉':        ['혼자 금연에 반복 실패한 경우', '국가 금연치료 지원사업을 이용하고 싶은 경우'],
  '비만·다이어트 치료': ['BMI 25 이상 or 체중 감량에 반복 실패한 경우', '고혈압·당뇨·고지혈증이 동반된 비만인 경우'],
  '수면 장애':          ['3개월 이상 불면 증상으로 일상 기능이 저하되는 경우', '수면제 의존 없이 단기 처방이 필요한 경우'],
  '생활습관병 관리':    ['고혈압·당뇨·고지혈증 중 2가지 이상이 동반된 경우', '여러 병원을 다니다가 통합 관리를 원하는 경우'],
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
// 메인 핸들러
// ============================================================
export default async function handleGeneral(req, res) {
  const { target, program, blogType, userRegion, userMemo, overrideTitle } = req.body;

  const subKw      = program.name || '';
  const region     = (userRegion || '강남').trim();
  const blogTypeId = blogType?.id || 'review';
  const industry   = 'general';

  const GENERAL_IDS = [
    'hypertension', 'diabetes', 'dyslipidemia', 'thyroid', 'checkup',
    'shingles', 'iv_therapy', 'fatigue', 'flu_adult', 'vitamin_d',
    'anemia_adult', 'smoking_cessation', 'weight_loss', 'insomnia', 'lifestyle_disease',
  ];
  const GENERAL_NAMES = [
    '고혈압', '당뇨', '고지혈증', '갑상선 기능이상', '건강검진',
    '대상포진', '수액·영양주사', '만성피로', '독감·감기(성인)', '비타민D 결핍',
    '빈혈(성인)', '금연 클리닉', '비만·다이어트 치료', '수면 장애', '생활습관병 관리',
  ];
  const isGeneralTreatment = GENERAL_IDS.includes(program.id) || GENERAL_NAMES.includes(subKw);
  if (!isGeneralTreatment) {
    return res.status(400).json({ error: "내과 생성기에 잘못된 진료가 전달되었습니다: " + subKw });
  }
  console.log("[general] 진료 검증 통과: " + subKw);

  const treatmentData = GENERAL_TREATMENTS.find(function(t) { return t.id === program.id || t.name === program.name; }) || GENERAL_TREATMENTS[0];
  const seoData = Object.assign({}, treatmentData);
  if (seoData.keywords)      seoData.keywords      = seoData.keywords.map(function(k) { return k.replace(/\{region\}/g, region); });
  if (seoData.titlePatterns) seoData.titlePatterns = seoData.titlePatterns.map(function(t) { return t.replace(/\{region\}/g, region); });

  const systemPrompt = "당신은 " + region + "에 사는 성인입니다. 내과·가정의학과 방문 경험을 1인칭 블로그 후기로 작성합니다.\n" +
    "업종: 내과·가정의학과 | 진료: " + subKw + " | 지역: " + region + "\n\n" +
    "[절대 금지]\n" +
    "- 성형외과·피부과·치과·비뇨기과·소아과 관련 표현 일절 금지\n" +
    "- \"첫째/둘째/셋째\" 나열, \"중요합니다\", \"살펴보겠습니다\", \"결론적으로\"\n" +
    "- 진료명(\"" + subKw + "\") 문장에 직접 조사 연결 금지 → 수치·증상 표현으로 대체\n\n" +
    "[필수]\n" +
    "- ~했어요, ~더라고요 블로그 구어체 | 1인칭 \"저는/제가\" 포함\n" +
    "- 검사 수치 최소 1개 포함 (혈압·혈당·HbA1c·콜레스테롤·TSH 등)\n" +
    "- 의사 말 간접 인용 1회 이상: \"원장님이 '~' 라고 하시더라고요\"\n" +
    "- 동일 키워드 3회 초과 반복 금지";

  const SECTIONS = GENERAL_FLOW_ENGINE.sections;
  const sectionTexts = {};
  let prevTextRaw = '';

  for (const sec of SECTIONS) {
    const richPrompt = buildGeneralPrompt(sec.key, treatmentData, region);
    const prevBlock  = prevTextRaw ? "\n[이미 작성된 내용 — 반복 금지]\n" + prevTextRaw + "\n[끝]\n" : '';
    const userPrompt = "업종: general | 키워드: " + subKw + " | 지역: " + region + "\n" +
      prevBlock + "\n---\n[현재 섹션: " + sec.label + " (" + sec.key + ")]\n" +
      "⚠️ 이 섹션만 작성. 타 업종 표현 금지. 반드시 200자 이상.\n" + richPrompt;

    let secText = await generateSection({ systemPrompt, userPrompt });
    secText = cleanGeneralText(secText, subKw);
    secText = stripInlineImages(secText);
    secText = restoreKeyword(secText, subKw);

    if (calcCharCount(secText) < 100) {
      let retry = await generateSection({ systemPrompt, userPrompt: userPrompt + "\n\n[중요] 반드시 200자 이상 실제 내용으로 작성하세요.", temperature: 0.72 });
      retry = cleanGeneralText(retry, subKw);
      retry = stripInlineImages(retry);
      retry = restoreKeyword(retry, subKw);
      if (calcCharCount(retry) > calcCharCount(secText)) secText = retry;
    }
    console.log("[general] " + sec.label + ": " + calcCharCount(secText) + "자");
    sectionTexts[sec.key] = secText;
    prevTextRaw += '\n' + secText;
  }

  // ★ [PATCH] alt 단순화 — 사용자 사진 폴더 5종 카테고리로 강제 통일
  //   풀: 검사 / 상담 / 진료 / 처방 / 일상
  const GENERAL_ALT_POOL = ["검사 사진", "상담 사진", "진료 사진", "처방 사진", "일상 사진"];
  const _GENERAL_ALT_BY_KEY = {
    concern:  "일상 사진",
    search:   "상담 사진",
    consult:  "검사 사진",
    decision: "상담 사진",
    reason:   "상담 사진",
    progress: "진료 사진",
    result:   "처방 사진",
    closing:  "일상 사진",
  };
  const altList = SECTIONS.slice(0, 5).map(function(sec) {
    var label = _GENERAL_ALT_BY_KEY[sec.key] || "상담 사진";
    return "[이미지: " + label + "]";
  });

  let title = overrideTitle || buildGeneralTitle(subKw, region, seoData, blogTypeId);
  const TITLE_BLOCK = /쌍꺼풀|눈매|리프팅|울쎄라|필러|보톡스|성형외과|임플란트|소아과/;
  if (TITLE_BLOCK.test(title)) title = region + " 내과 " + subKw + " 후기｜수치부터 관리까지 솔직하게";
  if (!title.includes(subKw) && !title.includes('내과')) title = region + " 내과 " + subKw + " 후기｜처음 진단받고 관리한 이야기";

  const secKeys = SECTIONS.map(function(s) { return s.key; });

  if (sectionTexts['result']) sectionTexts['result'] = insertGeneralTimeline(sectionTexts['result'], subKw);

  // ★ 정보 블럭 강제 삽입
  if (sectionTexts['reason']) {
    sectionTexts['reason'] = insertGeneralInfoBlock(sectionTexts['reason'], subKw);
    console.log("[general] 정보 블럭 삽입: " + subKw);
  }

  // ★ 수치 강제 삽입
  if (sectionTexts['consult']) {
    sectionTexts['consult'] = injectGeneralExamValue(sectionTexts['consult'], subKw);
    console.log("[general] 수치 삽입 체크: " + subKw);
  }

  const lastKey = secKeys[secKeys.length - 1];
  if (sectionTexts[lastKey]) {
    const recList = GENERAL_REC_MAP[subKw] || [];
    const recBlock = recList.length > 0
      ? "\n\n**이런 경우라면 내과 방문을 권해요**\n" + recList.map(function(r) { return "- " + r; }).join("\n")
      : '';
    sectionTexts[lastKey] = sectionTexts[lastKey].trimEnd()
      + recBlock
      + "\n\n혼자 검색만 하지 말고 가까운 내과·가정의학과에서 한 번 확인해보시길 권해요.";
  }

  let assembled = "# " + title + "\n\n";
  secKeys.forEach(function(key, i) {
    const secContent = sectionTexts[key] || '';
    if (calcCharCount(secContent) < 50) return;
    assembled += secContent + '\n\n';
    if (i < SECTIONS.length - 1 && altList[i]) assembled += altList[i] + '\n\n';
  });
  assembled = assembled.replace(/\n{3,}/g, '\n\n').trim();
  assembled = removeDuplicateSentences(assembled);
  assembled += '\n\n' + buildGeneralHashtags(subKw, region);

  // ★ 본문 인라인 볼드 제거 — 헤더형 **제목**(앞뒤 줄바꿈)은 보존, 문장 중간 **강조**만 제거
  assembled = assembled.replace(/(?<![\n^])\*\*([^*\n]+?)\*\*(?!\n)/g, "$1");

  // ─────────────────────────────────────────────
  // ★ [PATCH] alt 강제 정규화 — GPT가 본문에 만든 [이미지: ...] 도 5종으로 통일
  //   풀: 검사 / 상담 / 진료 / 처방 / 일상
  // ─────────────────────────────────────────────
  assembled = assembled.replace(/\[이미지:\s*([^\]]+)\]/g, (_m, inner) => {
    const s = String(inner);
    if (/^(검사|상담|진료|처방|일상)\s*사진$/.test(s.trim())) return `[이미지: ${s.trim()}]`;
    if (/검사|혈액|영상|진단|소견|건강검진|x.?ray|초음파/i.test(s)) return "[이미지: 검사 사진]";
    if (/처방|약물|복용|투약|약제/.test(s))                  return "[이미지: 처방 사진]";
    if (/진료|치료|처치|주사|시술/.test(s))                  return "[이미지: 진료 사진]";
    if (/상담|설명|차트|문진|원장|의사|병원/.test(s))        return "[이미지: 상담 사진]";
    if (/일상|회복|복귀|평소|생활|마무리/.test(s))           return "[이미지: 일상 사진]";
    return "[이미지: 상담 사진]";
  });

  const _altAll = assembled.match(/\[이미지:[^\]]+\]/g) || [];
  const _altOk  = _altAll.filter(a => /\[이미지:\s*(검사|상담|진료|처방|일상)\s*사진\]/.test(a));
  console.log(`[QC] alt 총 ${_altAll.length}개 / 정상 ${_altOk.length}개 / 비정상 ${_altAll.length - _altOk.length}개`);

  const charCount = calcCharCount(assembled);
  const seoScore  = diagnosePost(assembled, subKw);

  // ★ QC 로그
  const hasInfoBlock = /vs|어떻게 다른|어떻게 구별|어떻게 달라/.test(assembled);
  const hasExamValue = /\d+(\.\d+)?\s*(mmHg|mg\/dL|%|ng\/mL|mIU\/L|g\/dL|IU)/.test(assembled);
  const repeatCount  = (assembled.match(new RegExp(subKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log("[general] 완료: " + charCount + "자 / SEO " + seoScore + "점");
  console.log("[general] QC — 정보블럭: " + hasInfoBlock + " / 수치: " + hasExamValue + " / 키워드반복: " + repeatCount + "회");
  if (!hasInfoBlock) console.warn("[general] 정보 블럭 미삽입");
  if (!hasExamValue) console.warn("[general] 검사 수치 미포함");
  if (repeatCount > 5) console.warn("[general] 키워드 " + repeatCount + "회 반복");

  await autoSave({ assembled, charCount, subKw, region, seoScore, industry });

  const imageRegex = /\[이미지:\s*([^\]]+)\]/g;
  const images = [];
  let m;
  while ((m = imageRegex.exec(assembled)) !== null) images.push({ alt: m[1].trim(), caption: '' });
  const lastLine = assembled.trimEnd().split('\n').pop() || '';
  const hashtagsArr = lastLine.startsWith('#') ? lastLine.split(/\s+/).filter(function(t) { return t.startsWith('#'); }) : [];

  // ★★★ v2 패치: 네이버 블로그 복사용 평문 변환 ★★★
  const assembledMarkdown = assembled;                         // 마크다운 원본 보존
  const assembledPlain    = stripMarkdownForNaver(assembled);  // 네이버 복사용 평문
  const charCountPlain    = calcCharCount(assembledPlain);

  return res.status(200).json({
    success: true, text: assembledPlain, textMarkdown: assembledMarkdown, hashtags: hashtagsArr,
    images, charCount: charCountPlain, seoScore,
    validation: { passed: charCountPlain >= 2000, charCount: charCountPlain },
  });
}
