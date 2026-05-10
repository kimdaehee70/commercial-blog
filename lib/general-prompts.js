// ============================================================
// general-prompts.js — 내과·가정의학과 프롬프트 빌더 v1.0
// ⚠️ clinic/dental/pediatrics/gastro 등 절대 참조 금지
//
// 설계 원칙 (SEO 92~95점 구조):
//   1. 세부 키워드 자연 분산
//   2. 검사 수치 묘사 필수
//   3. 정보 블럭 (질환 비교·위험 신호)
//   4. 진료명 직접 조사 연결 금지
// ============================================================

const DETAIL_KEYWORDS = {
  '고혈압':             ['수축기 혈압', 'ACE억제제', '생활습관 교정', '심혈관 위험', '가정혈압'],
  '당뇨':               ['HbA1c', '공복혈당', '메트포민', '당뇨 식단', '합병증 검사'],
  '고지혈증':           ['LDL 콜레스테롤', '스타틴', '중성지방', '심혈관 위험', '콜레스테롤 식단'],
  '갑상선 기능이상':    ['TSH 수치', '레보티록신', '갑상선 초음파', '갑상선 항진', '갑상선 저하'],
  '건강검진':           ['국가건강검진', '종합검진', '흉부 X-ray', '심전도', '혈액검사 항목'],
  '대상포진':           ['항바이러스제', '72시간 내 치료', '대상포진 신경통', '발라사이클로버', '수포'],
  '수액·영양주사':      ['마이어스칵테일', '백옥주사', '글루타치온', '비타민C 주사', '피로회복'],
  '만성피로':           ['혈액검사 피로', '비타민D 결핍', '갑상선 감별', '철분 결핍', '부신 피로'],
  '독감·감기(성인)':    ['신속항원검사', '타미플루', '인플루엔자 A', '격리 기간', '독감 확진'],
  '비타민D 결핍':       ['25(OH)D3', '비타민D 주사', '콜레칼시페롤', '비타민D 수치 정상', '면역력'],
  '빈혈(성인)':         ['헤모글로빈', '혈청 페리틴', '철분 주사', '소구성 빈혈', '철분 흡수'],
  '금연 클리닉':        ['챔픽스', '바레니클린', '니코틴 패치', '국가 금연 지원', '금단증상'],
  '비만·다이어트 치료': ['마운자로', '위고비', '삭센다', 'GLP-1', 'BMI'],
  '수면 장애':          ['졸피뎀', '수면위생', '불면증 CBT', '수면일지', '멜라토닌 비교'],
  '생활습관병 관리':    ['Framingham 위험도', '심혈관 위험 계산', '통합 처방', '만성질환 병용', '생활습관 교정'],
};

export function buildGeneralPrompt(section, treatment, region, options = {}) {
  const { name, pains, recommend, operationNotes, compareWith } = treatment;
  const detailKws = DETAIL_KEYWORDS[name] || [];

  switch (section) {
    case 'concern':   return buildConcernPrompt(name, region, pains, detailKws);
    case 'situation': return buildSituationPrompt(name, region, detailKws);
    case 'consult':   return buildConsultPrompt(name, region, compareWith, operationNotes);
    case 'reason':    return buildReasonPrompt(name, region, compareWith);
    case 'result':    return buildResultPrompt(name, region, operationNotes, detailKws);
    case 'closing':   return buildClosingPrompt(name, region, recommend);
    default: throw new Error(`[general-prompts] 알 수 없는 섹션: ${section}`);
  }
}

function buildConcernPrompt(name, region, pains, detailKws) {
  const kwHint = detailKws.length
    ? "\n- 세부 키워드 1~2개를 문장 안에 자연스럽게 녹일 것:\n  " + detailKws.slice(0, 3).join(' / ')
    : '';
  return (
    "당신은 " + region + "에 사는 성인입니다. 내과·가정의학과 방문 경험을 1인칭 블로그 후기로 작성합니다.\n" +
    "첫 번째 섹션: 증상 or 건강검진 결과로 인한 고민을 작성하세요.\n\n" +
    "[주제] " + name + " 관련 증상·수치 발견과 걱정\n" +
    "[조건]\n" +
    "- 일상에서 겪는 증상 or 건강검진 결과를 1인칭 구어체로 구체적으로 묘사\n" +
    "- 아래 고민 1~2개를 자연스럽게 녹여낼 것:\n" +
    "  " + pains.map((p, i) => (i + 1) + ". " + p).join("\n  ") +
    kwHint + "\n" +
    "- 진료명(\"" + name + "\")을 문장에 직접 조사 연결 금지 → 증상·수치 표현으로 대체\n" +
    "  ❌ \"" + name + "이 생겼어요\" → ✅ \"혈압 수치가 150/95가 나왔어요\"\n" +
    "- 분량: 200~300자 | 말투: ~했어요, ~더라고요 (블로그 구어체)"
  ).trim();
}

function buildSituationPrompt(name, region, detailKws) {
  const searchKw = detailKws[0] || (name + " 치료");
  return (
    "블로그 후기 두 번째 섹션입니다.\n\n" +
    "[주제] " + name + " 때문에 내과를 탐색한 과정\n" +
    "[조건]\n" +
    "- 네이버 검색·지인 추천·건강검진 연계 등 실제 탐색 경로 묘사\n" +
    "- 검색어 자연스럽게 포함: \"" + region + " 내과\", \"" + searchKw + "\", \"" + region + " 가정의학과 후기\"\n" +
    "- " + region + " 지역명 반드시 포함\n" +
    "- 2~3곳 비교 or 후기 찾아본 과정 언급\n" +
    "- 병원 선택 기준 구체화: \"후기 많아서\" 금지 → 접근성·전문의·장비 등\n" +
    "- 분량: 200~300자 | 말투: 블로그 구어체"
  ).trim();
}

function buildConsultPrompt(name, region, compareWith, operationNotes) {
  return (
    "블로그 후기 세 번째 섹션입니다.\n\n" +
    "[주제] " + region + " 내과 실제 진료·검사 과정\n" +
    "[조건]\n" +
    "- 검사 순서를 구체적으로 서술 (참고: " + operationNotes + ")\n" +
    "- 검사 결과 수치 최소 1개 구체적으로:\n" +
    "  예) 수축기 혈압 152mmHg / HbA1c 7.2% / LDL 178mg/dL / TSH 0.1 / 비타민D 8ng/mL\n" +
    "- 환자 질문 1~2개 대화체 포함:\n" +
    "  예) \"선생님, 이게 " + compareWith + "은 아닌 건가요?\" / \"약을 꼭 먹어야 하나요?\"\n" +
    "- 의사 말 간접 인용 1회 필수:\n" +
    "  예) \"원장님이 '~' 라고 하시더라고요\"\n" +
    "- 분량: 300~400자 | 말투: 블로그 구어체"
  ).trim();
}

function buildReasonPrompt(name, region, compareWith) {
  return (
    "블로그 후기 네 번째 섹션입니다.\n\n" +
    "[주제] 이 내과·이 치료를 선택한 이유 + 유용한 정보\n" +
    "[조건]\n" +
    "- " + compareWith + " 비교 후 결정 과정 서술\n" +
    "- \"후기 많아서\" 금지 → 검사 결과·의사 설명 기반 이유\n" +
    "- " + region + " 내과 선택 구체적 이유 1가지 이상\n" +
    "- [정보 블럭] 이 섹션 끝에 \"찾아보면서 알게 된 것\"으로 비교 정보 2~3줄 추가\n" +
    "  예) '" + name + "에 대해 찾아보면서 알게 된 것이 있어요' 형태로 자연스럽게\n" +
    "- 분량: 250~350자 | 말투: 블로그 구어체"
  ).trim();
}

function buildResultPrompt(name, region, operationNotes, detailKws) {
  const kwHint = detailKws.length
    ? "\n- 세부 키워드 1~2개를 경과 묘사에 자연스럽게 삽입:\n  " + detailKws.slice(2, 5).join(' / ')
    : '';
  return (
    "블로그 후기 다섯 번째 섹션입니다.\n\n" +
    "[주제] 치료 후 경과 — 수치 변화 타임라인\n" +
    "[조건]\n" +
    "- 1개월 / 3개월 형식으로 단계별 수치·상태 변화 서술\n" +
    "- 참고 정보: " + operationNotes + "\n" +
    "- 수치 변화 필수:\n" +
    "  예) 혈압 152→128로 하강 / HbA1c 7.2→6.4% / LDL 178→102mg/dL\n" +
    "- 처방약 복용 반응 서술 (약 이름·용량 구체적으로)" +
    kwHint + "\n" +
    "- 진료명(\"" + name + "\") 직접 조사 연결 금지:\n" +
    "  ❌ \"" + name + "이 나았어요\" → ✅ \"혈압이 정상 범위로 들어왔어요\"\n" +
    "- 분량: 300~400자 | 말투: 블로그 구어체"
  ).trim();
}

function buildClosingPrompt(name, region, recommend) {
  return (
    "블로그 후기 마지막 섹션입니다.\n\n" +
    "[주제] 비슷한 상황의 독자에게 전하는 말\n" +
    "[조건]\n" +
    "- 치료 전후 수치 변화를 한 문장으로 감성적 요약\n" +
    "- 추천 대상 2개 자연스럽게 언급:\n" +
    "  " + recommend.map((r, i) => (i + 1) + ". " + r).join("\n  ") + "\n" +
    "- \"증상 있으면 혼자 버티지 말고 내과 상담 먼저\" 메시지\n" +
    "- " + region + " + 내과/가정의학과 키워드 자연스럽게 포함 (진료명 직접 반복 금지)\n" +
    "- CTA: \"비슷한 상황이라면 가까운 내과에서 한 번 확인해보시길 권해요\" 류\n" +
    "- 분량: 200~250자 | 말투: 블로그 구어체"
  ).trim();
}
