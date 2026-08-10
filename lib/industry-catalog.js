// lib/industry-catalog.js
// ─────────────────────────────────────────────────────────────────────────
// 업종 카탈로그 — 운영 로드맵 전용 데이터 (엔진 무관).
//
// 역할: 업종센터(카탈로그 + 개발 현황판 + 신규 신청)가 읽는 단일 소스.
//   - INDUSTRY_CONFIG(엔진 실동작) 와 분리. 여기는 "로드맵/소개"용.
//   - 기획중·개발중·검수중 업종도 자유롭게 등록 가능(엔진 영향 0).
//
// 필드 계약:
//   id          : 업종 키. enabled=true면 반드시 엔진 INDUSTRY_CONFIG 키와 일치해야 함.
//   name        : 표시명(한글)
//   category    : 대분류(업종센터 트리 그룹)
//   status      : 배지 상태 — "live"|"review"|"dev"|"plan"|"stopped"
//   verified    : 검색 검증 완료 플래그(선택). true = 실발행 후 상위노출 확인된 대표 검증 통과.
//                 ※ status와 역할 분리. status=서비스 단계 / verified=검색 검증 단계.
//                 ※ UI: 🟡동그라미=review / 🟢동그라미=live(검증 전) / 🟩초록네모=live+verified.
//                 ※ 향후 2위·장기생존 등 검증 확장 시 status 무변경, verified 계열만 확장.
//   enabled     : 실제 업종 선택 가능 여부. true = 엔진 등록 완료 → 업체정보에서 선택 가능.
//                 ※ status(배지)와 독립. 예: status:"review" + enabled:true = 검수중 배지지만 발행은 가능.
//                 ※ enabled:true 인데 엔진 미등록이면 발행 실패 → 반드시 엔진 등록분만 true.
//   description : 한 줄 소개(상세 패널 표시)
//   example     : 생성 예시 문장(상세 패널 표시). 없으면 미표시.
//   features    : 지원 기능 태그 배열(상세 패널 표시). 없으면 미표시.
//   icon        : 카탈로그 카드 아이콘(이모지). enabled:true 업종만 부여. 카드 인식속도용.
//   summary     : 카드 한줄 — "사용자가 생성할 글 주제" 형태(· 구분). enabled:true 업종만 부여.
//   hasPhysicalStore : [세션39][STORE-01] 매장 유무. 미기재 = true(매장형 기본값).
//                 ※ true  = 고객이 업체를 방문 → 주소·찾아오시는 길·방문정보 입력/출력.
//                 ※ false = 방문형(출장 서비스) → 위치 3필드·locationBlock·방문정보 미노출.
//                            단 address 는 유지(대표지역 SoT · suggestRegion · 지역키워드 기반).
//                 ※ 판정 기준: "고객이 주로 업체를 방문하는가".
//   version     : 운영 버전(상세 패널 표시). enabled:true(엔진 등록=운영중) 업종만 부여.
//                 ※ plan/dev(준비중·개발중) 업종은 version 미부여 → 상세 패널에 버전 줄 미표시.
//
// 확장 규칙: 업종 추가 = 여기 객체 1개 추가. 엔진 등록 전이면 enabled:false 로 두면 됨.
// ─────────────────────────────────────────────────────────────────────────

// 상태 메타 — 배지 색/라벨/아이콘. 하드코딩 렌더 금지용 단일 참조.
export const INDUSTRY_STATUS_META = {
  live:    { label: "운영중", dot: "🟢", color: "#16a34a", bg: "#e7f7ee", border: "#bfe8cf" },   // 관측 완료 · enabled:true
  review:  { label: "관측중", dot: "🟡", color: "#ca8a04", bg: "#fdf6e3", border: "#f0e2b0" },   // 엔진 완료 · 스위치 ON · 관측 진행
  dev:     { label: "개발중", dot: "🔵", color: "#2563eb", bg: "#eaf1fd", border: "#c7dbf7" },   // 엔진 생성/배선 중 · enabled:false
  plan:    { label: "기획중", dot: "⚪", color: "#6b7280", bg: "#f3f4f6", border: "#e3e5e9" },   // 미개발 · 기획만 완료
  stopped: { label: "중단",   dot: "🔴", color: "#dc2626", bg: "#fdecec", border: "#f5cccc" },   // 개발 중단
};

// 대분류 순서(트리 렌더 순서). 카탈로그에 없는 카테고리는 무시.
export const INDUSTRY_CATEGORY_ORDER = [
  "건강·의료",
  "전문서비스",
  "외식업",
  "건설·시공",
  "생활서비스",
  "교육·행사",
  "실버케어",
  "부동산",
  "레저·취미",
  "기타",
];

export const INDUSTRY_CATALOG = [
  // ── 건강·의료 ──────────────────────────────────────────────
  {
    id: "dental", name: "치과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🦷", summary: "임플란트 · 라미네이트 · 투명교정 · 신경치료 · 스케일링 · 사랑니발치 · 지르코니아크라운 · 치아미백 · 턱관절치료 · 레진치료 · 인레이·온레이 · 올세라믹크라운 · 일반교정 · 설측교정 · 잇몸치료 · 잇몸성형 · 소아충치치료 · 임플란트재수술 · 틀니",
    description: "임플란트·교정·신경치료 등 치과 진료를 정보형 후기로 안내합니다.",
    example: "강남 임플란트 후기 / 분당 투명교정 vs 일반교정 결정 이유",
    features: ["정보형 생성", "진료과별 제목패턴", "survival 관측"],
  },
  {
    id: "oriental", name: "한의원", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2-new",
    icon: "🌿", summary: "교통사고한방치료 · 추나요법 · 한방다이어트 · 한방피부질환치료 · 갱년기한약치료 · 소화기한방치료 · 면역한방치료 · 침치료 · 한약처방 · 산후한방치료 · 구안와사치료 · 부항치료 · 체외충격파치료 · 뜸치료 · 공진단처방 · 관절한방치료 · 중풍재활치료 · 이명난청치료 · 불면증한방치료 · 생리통한방치료 · 난임한방치료 · 두통한방치료 · 소아한방치료",
    description: "교통사고·근골격·한약 등 한의원 치료를 카테고리별로 안내합니다.",
    example: "강남 교통사고 한방치료 자동차보험 후기",
    features: ["정보형 생성", "치료 카테고리 7분류"],
  },
  {
    // [2026-07-13] V2 Purpose 전환 — 관측 대기(🟨 v2-new). pulmo/card/endo 동일 표준.
    //   관측 완료(PASS) 후 status:"live" + version:"v2" (🟦)로 승격.
    id: "derma", name: "피부과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "✨", summary: "여드름 · 여드름 흉터 · 기미 · 잡티 · 주근깨 · 색소침착 · 아토피 피부염 · 습진 · 건선 · 지루성 피부염 · 두드러기 · 대상포진 · 사마귀 · 티눈 · 무좀 · 손발톱무좀 · 탈모 · 원형탈모 · 울쎄라 · 써마지 · 슈링크 · 레이저토닝 · 피코레이저 · 레이저 제모 · 보톡스 · 필러 · 스킨부스터",
    description: "피부 증상 → 피부 상태 평가 → 치료·시술 판단 축으로 안내합니다. (V2 관측 중)",
    example: "강남 여드름 흉터 정보｜흉터 종류에 따른 접근 안내",
    features: ["정보형 생성", "질환·시술 이중축"],
  },
  {
    id: "clinic", name: "성형외과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "💉", summary: "자연유착 쌍꺼풀 · 실리프팅 · 피코레이저 · 눈밑지방재배치 · 코성형 · 보톡스 · 필러 · 울쎄라 · 지방흡입 · 레이저토닝 · 앞트임·뒤트임 · 눈매교정 · 안면윤곽 · 이마성형 · 인모드·써마지 · 지방이식 · 모발이식",
    description: "외형 고민 → 판단 요소 → 시술 방법 결정 축으로 안내합니다. (V2 관측 중)",
    example: "강남 자연유착 쌍꺼풀 정보｜라인 형성 방식과 판단 기준 안내",
    features: ["정보형 생성", "시술별 방향 분리"],
  },
  {
    id: "ortho", name: "정형외과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🦴", summary: "허리디스크치료 · 목디스크치료 · 척추관협착증치료 · 무릎관절염치료 · 반월상연골치료 · 어깨통증치료 · 도수치료 · 체외충격파치료 · 프롤로주사치료 · 전방십자인대치료 · 족저근막염치료 · 발목인대손상치료 · 팔꿈치통증치료 · 손목터널증후군치료 · 골절재활치료 · 척추측만증치료 · 리제네텐주사치료 · 회전근개파열치료 · 오십견치료 · 고관절치료 · 경추협착증치료 · 연골주사치료 · 무지외반증치료 · 허리압박골절치료",
    description: "무릎·어깨·허리·재활 등 정형외과 치료를 수술/비수술로 안내합니다.",
    example: "강남 허리디스크 수술 안 하고 나은 이야기",
    features: ["정보형 생성", "재활 회복 일지"],
  },
  {
    id: "ent", name: "이비인후과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "👃", summary: "청력검사 · 비내시경 · 후두내시경 · 수면다원검사 · 중이염 · 이명 · 돌발성난청 · 알레르기비염 · 축농증 · 비중격만곡증 · 코골이·수면무호흡 · 편도염 · 인후두역류 · 어지럼증",
    description: "귀·코·목 증상 → 검사 → 치료 판단 축으로 안내합니다. (V2 관측 중)",
    example: "강남 청력검사 정보｜어떤 경우에 검토되는지 안내",
    features: ["정보형 생성", "검사·질환 축 분리"],
  },
  {
    id: "urology", name: "비뇨기과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "🩺", summary: "소변검사 · 요류검사 · 전립선초음파 · PSA검사 · 방광내시경 · 전립선비대증 · 전립선염 · 과민성방광 · 요실금 · 배뇨장애 · 방광염 · 요로결석 · 혈뇨 · 발기부전",
    description: "배뇨 증상 → 검사 선택 → 치료 판단 축으로 안내합니다. (V2 관측 중)",
    example: "강남 PSA검사 정보｜어떤 경우에 검토되는지 안내",
    features: ["정보형 생성", "검사·질환 축 분리"],
  },
  // ── [노출 개방] 병원과 9종 — 엔진 4파일 구축 완료, 후기형→정보형(V2) 전환 진행 중.
  //   status:"review" + enabled:true = 업종센터 선택 가능(검수중 배지). 관측 후 status:"live" 승격.
  {
    id: "eye", name: "안과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "👁️", summary: "시력·굴절검사 · 안압검사 · 안저검사 · 세극등현미경검사 · 시야검사 · 백내장 · 노안 · 녹내장 · 황반변성 · 당뇨망막병증 · 비문증 · 안구건조증 · 결막염 · 소아근시",
    description: "시야·시력 변화 → 검사 → 치료 판단 축으로 안내합니다. (V2 관측 중)",
    example: "강남 안압검사 정보｜어떤 경우에 검토되는지 안내",
    features: ["정보형 생성", "검사·질환 축 분리"],
  },
  {
    id: "general", name: "내과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🩺", summary: "피로감 지속 · 발열 지속 · 기침 지속 · 복통·소화불편 · 어지럼 · 건강검진 결과 상담 · 혈액검사 이상 소견 · 혈압 상담 · 만성질환 관리 · 건강 상담 · 금연 상담 · 생활습관 상담 · 독감 진료 · 대상포진 진료 · 예방접종 · 영양 상담",
    description: "증상·검진 이상을 기본검사로 확인하고 전문 진료 연계 여부를 판단하는 1차 진료 안내입니다.",
    example: "강남 내과 건강검진 결과 상담 / 피로감 지속 진료 정보",
    features: ["1차 진료 허브", "전문내과 연계 판단", "정보형 생성", "survival 관측"],
  },
  {
    id: "gastro", name: "소화기내과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2",
    icon: "🫃", summary: "위내시경 · 대장내시경 · 역류성 식도염 · 헬리코박터 제균치료 · 위궤양·십이지장궤양 · 과민성대장증후군 · 염증성 장질환(크론병·궤양성 대장염) · 지방간 · 바이러스 간염(B형·C형) · 간경변 · 담석·담낭염 · 췌장염 · 기능성 소화불량 · 대장 용종 · 복부 초음파 · 수면내시경 · 위암 검진 · 대장암 검진 · 치질·치핵치료 · 만성변비치료 · 장상피화생 · 위·식도 정맥류",
    description: "위·대장내시경, 위염·역류 등 소화기내과 진료를 정보형으로 안내합니다.",
    example: "강남 소화기내과 위내시경 안내 / 역류성식도염 정보",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "pulmo", name: "호흡기내과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🫁", summary: "폐기능검사 · 흉부 X-ray · 흉부 CT · 만성기침 · 기관지염 · 천식 · 폐렴 · 독감 · 결핵 · COPD · 폐결절 · 수면무호흡",
    description: "호흡기 증상에서 어떤 검사가 필요한지, 검사·치료가 어떤 기준으로 결정되는지를 검색자 목적축으로 안내합니다. 검사형(폐기능·흉부영상)과 질환형이 공존하는 이중축 엔진.",
    example: "강남 만성기침 검사·치료 결정 기준 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "card", name: "순환기내과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🫀", summary: "심전도검사 · 심장초음파 · 24시간 홀터검사 · 운동부하검사 · 혈압검사 · 고혈압 · 협심증 · 심근경색 · 부정맥 · 두근거림 · 실신 · 심부전 · 고지혈증 · 흉통",
    description: "가슴 증상에서 어떤 검사가 선택되는지, 결과에 따라 치료 방향이 어떻게 결정되는지를 검색자 목적축으로 안내합니다. 검사형(심전도·심장초음파)과 질환형이 공존하는 이중축 엔진.",
    example: "강남 두근거림 심전도·홀터검사 결정 기준 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "endo", name: "내분비내과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🩸", summary: "갑상선초음파 · 갑상선기능검사 · 당화혈색소검사 · 골밀도검사 · 호르몬검사 · 당뇨병 · 당뇨전단계 · 고지혈증 · 비만 · 갑상선기능저하증 · 갑상선기능항진증 · 갑상선결절 · 골다공증 · 부신질환",
    description: "검진에서 나온 수치를 출발점으로, 어떤 검사가 선택되고 결과에 따라 관리 방향이 어떻게 결정되는지를 검색자 목적축으로 안내합니다. 검사형과 질환형이 공존하는 이중축 엔진. 만성 관리 구조.",
    example: "강남 검진 혈당 이상 당화혈색소검사 결정 기준 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    // [세션55] 관측 PASS — 소아폐렴 등 상록구 키워드 1위 확인(2026-07-21) → 🟦 승격.
    id: "pediatrics", name: "소아청소년과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🧸", summary: "소아알레르기검사 · 소아성장검사 · 영유아발달검사 · 소아혈액검사 · 소아폐기능검사 · 소아천식 · 모세기관지염 · 소아폐렴 · 아토피피부염 · 소아두드러기 · 소아장염 · 소아변비 · 수족구병 · 성조숙증",
    description: "아이 증상 → 검사 선택 → 치료 판단 흐름을 정보형으로 안내합니다.",
    example: "강남 소아과 소아알레르기검사 정보 / 소아천식 결정 기준 안내",
    features: ["정보형 생성", "decisionAxis 이중축", "survival 관측"],
  },
  {
    id: "psy", name: "정신건강의학과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "🫧", summary: "종합심리검사 · 정서상태검사 · 주의력검사 · 기질성격검사 · 스트레스반응검사 · 우울증 · 불안장애 · 공황장애 · 강박장애 · 사회불안장애 · 성인ADHD · 아동ADHD · 불면증 · 번아웃",
    description: "심리검사·우울·불안·공황·강박·집중·불면 진료를 정보형으로 안내합니다. (중증·상담 프로그램 제외)",
    example: "강남 종합심리검사 정보",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "obgyn", name: "산부인과", category: "건강·의료", status: "review", enabled: true, verified: true, version: "v2-new",
    icon: "🌷", summary: "부인과초음파 · 자궁경부세포검사 · HPV검사 · 여성호르몬검사 · 골반MRI · 자궁근종 · 자궁선근증 · 자궁내막증 · 난소낭종 · 다낭성난소증후군 · 생리불순 · 생리통 · 질염 · 갱년기",
    description: "부인과 검사·자궁·난소·생리·갱년기 진료를 정보형으로 안내합니다. (임신·출산·난임 제외)",
    example: "강남 산부인과 부인과초음파 정보",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "neuro", name: "신경외과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🧬", summary: "허리디스크 · 척추관협착증 · 목디스크 · 척추압박골절 · 만성두통 · 편두통 · 삼차신경통 · 후두신경통 · 군발성두통 · 신경차단술 · 경막외신경성형술 · 고주파신경치료 · FIMS시술 · 체외충격파 · 수근관증후군 · 척골신경포착증후군 · 말초신경병증 · 어지럼증 · 뇌MRI · 안면경련 · 이명 · 기억력저하 · 척추수술후증후군 · 좌골신경통",
    description: "저림·통증·어지럼 등 신경학적 증상에서 어떤 검사가 필요한지, 치료가 어떤 기준으로 결정되는지를 검색자 목적축으로 안내합니다.",
    example: "강남 허리디스크 검사·치료 결정 기준 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "pain", name: "통증의학과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "💢", summary: "허리디스크 신경차단술 · 목디스크 신경차단술 · 척추관협착증 시술 · 신경성형술(PEN) · 만성요통·만성통증 클리닉 · 좌골신경통 치료 · 프롤로 주사 · PRP 주사 · 무릎 관절 주사 · 어깨 주사 치료 · 오십견 수압팽창술 · 무릎 줄기세포·연골재생 · 턱관절 통증치료(TMD) · 도수치료 · 체외충격파 · 근막통증 IMS 치료 · 고주파 열응고술 · 섬유근육통 · 두통 신경차단 · 대상포진 후 신경통 · 신경병증성 통증 · 암성 통증 관리 · 경추성 어깨·목 통증 · 족저근막염 치료 · 발목 인대 손상 치료 · 손목·팔꿈치 통증 치료 · 꼬리뼈·골반 통증 치료",
    description: "통증이 지속될 때 진료에서 무엇을 확인하는지, 보존적 관리와 중재적 시술이 어떤 기준으로 갈리는지를 검색자 목적축으로 안내합니다.",
    example: "강남 허리디스크 통증 치료 결정 기준 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "radio", name: "영상의학과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🩻", summary: "뇌 MRI 검사 · 뇌 CT 검사 · 경동맥 초음파 · 척추 MRI 검사 · 관절 MRI 검사 · 골밀도 검사 · 폐 CT(저선량) 검사 · 흉부 엑스레이 · 복부 초음파 · 복부 CT 검사 · 영상 종합검진 · 갑상선 초음파 · 유방 초음파·촬영",
    description: "증상에서 어떤 검사가 필요한지, 왜 그 검사가 선택되는지를 검색자 목적축으로 안내합니다. 검사형 엔진 · 검사 선택 기준 → 판독 위임 흐름.",
    example: "분당 뇌 MRI 두통 검사 안내",
    features: ["정보형 생성", "survival 관측"],
  },
  {
    id: "family", name: "가정의학과", category: "건강·의료", status: "live", enabled: true, verified: true, version: "v2",
    icon: "👨‍⚕️", summary: "건강검진 · 국가건강검진 · 만성질환 정기검사 · 검진결과상담 · 예방접종 · 고혈압 · 당뇨 · 고지혈증 · 감기·몸살 · 오래가는 기침 · 만성피로 · 어지럼 · 두통 · 수면 문제",
    description: "증상·검진 항목별로 진료가 검토되는 기준을 안내합니다(정보형·7섹션·decisionAxis). 첫 확인 창구 · 흐름과 생활 기록을 함께 확인.",
    example: "강남 건강검진 정보｜어떤 경우에 검토되는지 안내",
    features: ["정보형 생성", "survival 관측"],
  },

  // ── 전문서비스 ──────────────────────────────────────────────
  {
    id: "legal", name: "법무사", category: "전문서비스", status: "live", enabled: true, verified: true, version: "v2",
    icon: "⚖️", summary: "상속등기 · 증여등기 · 법인설립 · 임원변경등기 · 부동산등기 · 상속포기 · 한정승인 · 개인회생 · 파산면책 · 법인등기 · 본점이전 · 회사해산 · 청산등기 · 상업등기 · 유언장 작성 · 가압류 · 가처분 · 지급명령 신청 · 공탁 · 가족관계정정",
    description: "등기·상속·법인·회생 업무를 기관 화자 정보형으로 안내합니다.",
    example: "노원구 상속등기 절차와 준비서류",
    features: ["정보형·기관화자", "사례별 글 금지"],
  },
  {
    id: "lawyer", name: "변호사", category: "전문서비스", status: "live", enabled: true, verified: true, version: "v2",
    icon: "⚖️", summary: "사기 · 폭행 · 마약 · 명예훼손 · 성범죄 · 스토킹 · 음주운전 · 교통사고 · 이혼 · 상간 · 양육권 · 재산분할 · 학교폭력 · 부동산분쟁 · 상속 · 유류분 · 상속재산분할 · 손해배상 · 계약분쟁 · 대여금 · 개인회생 · 개인파산",
    description: "형사·가사·상속·민사 사건을 사무소 화자 정보형으로 안내합니다.",
    example: "수원 음주운전 초기 대응방법 / 분당 이혼 절차와 준비사항",
    features: ["정보형·사무소화자", "결과보장 표현 금지"],
  },
  {
    // [세션43][SPINE7-TAX] V1(단일호출) → V2 7섹션 Spine 전환. legal V2 엔진축 재사용 / savings = cost 대체.
    id: "tax", name: "세무사", category: "전문서비스", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🧾", summary: "종합소득세 · 종소세 환급 · 부가가치세 · 간이·일반과세자 · 기장대리 · 간편장부·복식부기 · 상속세 · 증여세 · 양도소득세 · 사업자등록 · 세무조사",
    description: "종합소득세·부가가치세·기장·양도세 등 세무 업무를 세무사 화자 정보형으로 안내합니다.",
    example: "잠실 종합소득세 신고 기한과 준비자료",
    features: ["정보형·기관화자", "절세·환급 단정 금지"],
  },
  {
    // [세션45][SPINE7-LABOR] V1(단일호출) → V2 7섹션 Spine 전환. 3축(filing/advisory/managing).
    id: "labor", name: "노무사", category: "전문서비스", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🧑‍⚖️", summary: "임금체불 · 퇴직금 · 체당금 · 노동청진정 · 부당해고 · 권고사직 · 징계해고 · 노동위원회 · 산재신청 · 직업병 · 출퇴근재해 · 휴업급여 · 근로계약서 · 취업규칙 · 급여관리 · 4대보험 · 직장내괴롭힘 · 성희롱 · 인사발령 · 부당전직",
    description: "임금체불·부당해고·산재·근로계약·4대보험 등 노무 업무를 공인노무사 화자 정보형으로 안내합니다.",
    example: "송파구 부당해고 구제신청 기한과 준비서류",
    features: ["정보형·기관화자", "인정·구제 단정 금지"],
  },
  {
    // [세션46][SPINE7-ADMIN] 6섹션 → V2 7섹션 Spine 전환. 3축(application/appeal/document).
    id: "administrative", name: "행정사", category: "전문서비스", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "📋", summary: "F4비자 거소증 · E7 취업비자 · 체류연장 · 영주권 · 전문건설업 등록 · 직업소개소 등록 · 여행업 등록 · 공유주방 등록 · 여성기업 인증 · 메인비즈 인증 · 이노비즈 인증 · 영업정지 행정심판 · 학교폭력 행정심판 · 징계처분 행정심판 · 운전면허 행정심판 · 미수금 내용증명 · 계약해지 내용증명 · 손해배상 내용증명 · 사단법인 설립 · 재단법인 설립 · 협회설립 · 사실확인서 · 행정기관 제출서류",
    description: "F4·E7비자·거소증·전문건설업/직업소개소/여행업 등록·여성기업/이노비즈 인증·행정심판·내용증명 등을 행정사 화자 정보형으로 안내합니다.",
    example: "송파구 E7비자 발급 요건과 준비서류",
    features: ["정보형·기관화자", "승인·인용 단정 금지"],
  },

  // ── 외식업 ─────────────────────────────────────────────────
  {
    id: "restaurant", name: "음식점", category: "외식업", status: "review", enabled: false, version: "v1",
    icon: "🍜", summary: "맛집 · 포장 · 혼밥 · 배달 · 회식 · 데이트 · 점심",
    description: "지역·메뉴·상황·목적 조합으로 검색의도 기반 맛집 글을 생성합니다.",
    example: "공릉동 떡볶이 포장 친구 / 구리 순대국 해장 혼밥",
    features: ["조합형 검색의도 SEO", "scene 중심"],
  },
  {
    id: "chinese", name: "중식", category: "외식업", status: "review", enabled: false,
    icon: "🍜", summary: "짜장면 · 짬뽕 · 탕수육 · 볶음밥 · 깐풍기 · 유산슬 · 팔보채 · 양장피 · 마파두부 · 고추잡채 · 울면 · 기스면 · 사천요리 · 코스요리 · 룸식사",
    description: "지역·중식 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 계열 독립 엔진.",
  },
  {
    id: "korean", name: "한식", category: "외식업", status: "review", enabled: false,
    icon: "🍲", summary: "국밥 · 순대국 · 찌개 · 백반 · 불고기 · 구이 · 갈비탕 · 설렁탕 · 비빔밥 · 정식 · 제육볶음 · 김치찌개 · 된장찌개 · 생선구이 · 보쌈 · 족발",
    description: "지역·한식 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Chinese 계열 독립 엔진.",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "korean",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "jokbal_bossam", name: "족발·보쌈", category: "외식업", status: "dev", enabled: false,
    icon: "🐷", summary: "족발 · 보쌈 · 앞다리족발 · 뒷다리족발 · 반반족발 · 냉채족발 · 불족발 · 마늘족발 · 굴보쌈 · 마늘보쌈 · 매운보쌈 · 한방보쌈 · 족발보쌈세트",
    description: "지역·족발/보쌈 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 공통 엔진.",
    engineIndustry: "restaurant",
    hasTree: "jokbal_bossam",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "snack", name: "분식", category: "외식업", status: "review", enabled: false,
    icon: "🍢", summary: "떡볶이 · 김밥 · 순대 · 튀김 · 라면 · 쫄면 · 우동 · 만두 · 어묵 · 김치볶음밥 · 오므라이스 · 돈까스 · 비빔국수 · 라볶이 · 치즈김밥 · 참치김밥",
    description: "지역·분식 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Korean(Restaurant) 계열 독립 엔진 · class 4축(국물·양념·밥·면).",
  },
  {
    id: "japanese", name: "일식", category: "외식업", status: "review", enabled: false,
    icon: "🍱", summary: "초밥 · 라멘 · 돈카츠 · 덮밥 · 우동 · 사시미 · 회 · 규동 · 오마카세 · 텐동 · 소바 · 유부초밥 · 알밥 · 연어덮밥 · 장어덮밥 · 가라아게",
    description: "지역·일식 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Chinese 계열 독립 엔진 · cat 4계열(스시·면·튀김·덮밥).",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "japanese",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "western", name: "양식", category: "외식업", status: "review", enabled: false,
    icon: "🍝", summary: "파스타 · 스테이크 · 리조또 · 브런치 · 피자 · 샐러드 · 오일파스타 · 크림파스타 · 토마토파스타 · 함박스테이크 · 뇨끼 · 라자냐 · 수프 · 감바스 · 화덕피자 · 와인",
    description: "지역·양식 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Chinese 계열 독립 엔진 · cat 4계열(면·밥·고기·단품).",
  },
  {
    id: "chicken", name: "치킨", category: "외식업", status: "review", enabled: false,
    icon: "🍗", summary: "후라이드 · 양념 · 간장 · 순살 · 마늘 · 오븐구이 · 반반 · 파닭 · 뿌링클 · 크림치즈 · 닭강정 · 봉구이 · 윙 · 콤보 · 치즈볼 · 맥주",
    description: "지역·치킨 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Japanese 계열 독립 엔진 · cat 4계열(fried·seasoned·oven·special).",
  },
  {
    id: "meat", name: "고깃집", category: "외식업", status: "review", enabled: false,
    icon: "🍖", summary: "삼겹살 · 목살 · 항정살 · 돼지갈비 · 갈비 · 소갈비 · 차돌박이 · 등심 · 안심 · 대패삼겹 · 갈매기살 · 가브리살 · 소금구이 · 양념갈비 · 냉면 · 된장찌개",
    description: "지역·고기 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant v2 계열 독립 엔진 · cat 단일(고깃집)·8메뉴(돼지5+소3) · SCENE 불판/굽기/쌈 · 국물 ritual 분리.",
  },
  {
    id: "cafe", name: "카페", category: "외식업", status: "review", enabled: false,
    icon: "☕", summary: "디저트 · 브런치 · 베이커리 · 분위기 · 작업하기좋은 · 데이트 · 아메리카노 · 라떼 · 케이크 · 크로플 · 마카롱 · 스콘 · 빙수 · 에이드 · 감성카페 · 루프탑",
    description: "분위기·디저트·체류 중심 카페 후기 생성(개발 중).",
  },
  {
    id: "asian", name: "아시안", category: "외식업", status: "dev", enabled: false,
    icon: "🍲", summary: "쌀국수 · 소고기쌀국수 · 양지쌀국수 · 차돌쌀국수 · 매운쌀국수 · 해물쌀국수 · 분짜 · 월남쌈",
    description: "지역·아시안 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 공통 엔진.",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "asian",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "seafood", name: "해산물", category: "외식업", status: "dev", enabled: false,
    icon: "🦀", summary: "대게 · 킹크랩 · 회 · 물회 · 아구찜 · 해물찜 · 조개 · 활어 · 대게찜 · 모둠회 · 간장게장 · 아귀전골",
    description: "지역·해산물 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 공통 엔진.",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "seafood",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "jjim", name: "찜·조림", category: "외식업", status: "dev", enabled: false,
    icon: "🍲", summary: "찜닭 · 안동찜닭 · 매운찜닭 · 순살찜닭 · 치즈찜닭 · 국물찜닭 · 마라찜닭 · 닭발",
    description: "지역·찜 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 공통 엔진.",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "jjim",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },
  {
    id: "grill", name: "육류·구이", category: "외식업", status: "dev", enabled: false,
    icon: "🍖", summary: "닭갈비 · 철판닭갈비 · 숯불닭갈비 · 치즈닭갈비 · 닭목살 · 갈비 · 소고기 · 양고기",
    description: "지역·육류 메뉴·상황·목적 조합으로 메뉴 정보형 글을 생성합니다(개발 중 · 관측 전). Restaurant 공통 엔진.",
    // [전문점 2단 트리] industry=restaurant 고정, specialty=id 전달. name=RESTAURANT_SPECIALTY.name(엔진 cat 소비값).
    engineIndustry: "restaurant",
    hasTree: "grill",  // [Tree Spine] 전문점 목록 = industry-tree.js SoT (subItems 이관)
  },

  // ── 건설·시공 / 생활서비스 ──────────────────────────────────
  //   [v-cl 2026-07-27] 구 "리빙·홈" 1개 카테고리 → Construction/Living 2분리(표시 전용).
  //   ※ SERVICE_GROUPS.construction(검증집합)은 통합 유지 → 겸업 선택(인테리어+입주청소 등) 무손상.
  {
    // [세션55] 전국 공통 엔진 전환 — 대표지역 하드코딩("용인") 제거 완료.
    //   [세션55] 실발행 상단 노출 확인(2026-07-21) → ⬜ v2-pilot → 🟦 v2 승격.
    id: "bedding", name: "이브자리", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2",
    icon: "🛏️", summary: "혼수침구 · 신혼침구 · 예단침구 · 냉감침구 · 여름이불 · 구스이불 · 사계절이불 · 알레르기케어침구 · 기능성베개 · 맞춤베개 · 매트리스 · 토퍼 · 냉감패드 · 아이유베개",
    description: "혼수·냉감·구스 등 침구를 매장 화자 정보형으로 안내합니다.",
    example: "혼수침구 준비 전 확인할 기준",
    features: ["정보형·매장화자", "전국 공통 엔진"],
  },
  {
    // [세션55] 정적 품질 리뷰만 완료(94~95) → ⬜ v2-pilot 유지.
    // [세션70 2026-07-29] 승격 ⬜ v2-pilot → 🟦 v2. 근거 = 정적 리뷰가 아니라 실측.
    //   실발행 「신내동 입주청소 주기를 정하는 기준」 → 네이버 블로그탭 상단 노출 확인(발행 29분).
    //   품질 재평가 97점(구조98/Scene98/검색의도97/자연스러움95/현장감96).
    //   ★ 승격은 배지·status 만 변경한다. V1 FREEZE 유지·엔진 무수정.
    //   관측 이월(수정 금지, 3건 재현 시 판정): ①titlePattern↔work 축 불일치(window#3·demolition#6과 동일 축, 3회차)
    //     ②마무리 문단 「다음 일정으로 넘기고」 ③「확인합니다」 반복 ④비용 단락 일반론
    id: "cleaning", name: "입주청소", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "입주청소 · 이사청소 · 신축아파트청소 · 구축아파트청소 · 원룸청소 · 오피스텔청소 · 청소비용 · 체크리스트",
    description: "입주청소·이사청소·신축/구축·원룸/오피스텔·비용·체크리스트를 청소업체 화자 정보형으로 안내합니다.",
  },
  {
    // [세션55] 정적 품질 리뷰만 완료(포장이사·투룸이사 94~96 / 원룸이사 91~92).
    //   발행·관측 데이터 확보 후 배지 결정 → ⬜ v2-pilot(관측 중). V1 FREEZE 유지.
    //   백로그: 원룸이사 후반부 중복 문단(서비스범위·견적·예약확인 재서술) 축약 — V2 Pilot.
    id: "moving", name: "이사업체", category: "생활서비스", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🔵", summary: "포장이사 비용 · 원룸이사 · 투룸이사 · 용달이사 · 반포장이사 · 보관이사 · 이사업체 선택 기준 · 이사 체크리스트",
    description: "포장이사·원룸/투룸·용달·반포장·보관이사·비용·이사업체 선택 기준·체크리스트를 이사업체 화자 정보형으로 안내합니다.",
  },
  {
    // [세션55] 정적 품질 리뷰만 완료(93~95). 발행·관측 데이터 확보 후 배지 결정 → 현재 ⬜ 유지.
    //   백로그: 도입부 상황형 통일 · 확인사항 중복 축소 · 체크리스트 형식 통일 — V2 Pilot.
    id: "interior", name: "인테리어", category: "건설·시공", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🔵", summary: "아파트 리모델링 · 구축아파트 인테리어 · 부분 인테리어 · 욕실 리모델링 · 주방 리모델링 · 도배장판 · 상가 인테리어 · 인테리어 견적 체크리스트",
    description: "아파트 리모델링·구축아파트·부분 인테리어·욕실/주방 리모델링·도배장판·상가 인테리어·견적 체크리스트를 인테리어 업체 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션62] ⬜ 오픈 — enabled:true / status:review. 일반 사용자 채택 허용(관측 병행).
    //   [세션61] 신설 시 관측 전(enabled:false)이었음.
    //   ★ siteBlock(현장정보: 단지명·평형) 최초 적용 업종. 공사군 공통 인프라 검증 대상.
    id: "dobae", name: "도배", category: "건설·시공", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🔵", summary: "전체도배 · 부분도배 · 실크도배 · 합지도배 · 거주중도배 · 입주도배 · 곰팡이·결로도배 · 누수도배 · 도배장판",
    description: "전체·부분 도배, 실크·합지 벽지 시공, 거주중(살림집)·입주 상황별 진행, 곰팡이·결로 및 누수 자국 처리, 도배장판 동시 시공을 도배 업체 화자 정보형(현장 확인·공정 순서·자재 선택)으로 안내합니다.",
  },
  {
    // [세션62] ⬜ 신규 — 관측 전(enabled:false / status:dev). PATCH-05 준수, OWNER 게이트로만 검증.
    //   ★ siteBlock(단지명·평형) + 두께(T) 축을 함께 쓰는 첫 업종. 공사군 세 번째 SCENE_SPINE.
    //   ★ [세션71] 「장판」 → 「바닥시공」 개명 + 자재축 1 CAT(마루시공) 편입 = 11 CAT.
    //     강마루시공 CAT 미생성(work 첫 3토큰 동일 → Scene 분리 기준 미충족). 강마루·강화마루·
    //     원목마루는 마루시공 keywords, 데코타일은 공간 CAT(거실·상가·사무실·병원) keywords 로 흡수.
    //   ★ [세션71] 배지 승격 ⬜ v2-pilot/dev/enabled:false → 🟦 v2/live/enabled:true.
    //     근거: 실발행 「평내동 전체장판, 이사 날짜가 잡혔다면 확인할 부분」 네이버 블로그탭
    //     최상단 노출 확인(발행 1시간). 반장 판정으로 🟦 v2/live 직행(관측 단계 생략).
    id: "flooring", name: "바닥시공", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🧻", summary: "전체장판 · 거실장판 · 방장판 · 주방장판 · 베란다장판 · 현관장판 · 상가장판 · 사무실장판 · 학원장판 · 병원장판 · 마루시공",
    description: "집 전체·공간 단위 장판 교체, 주방·베란다 등 물기 있는 공간 처리, 상가·사무실·학원·병원 등 영업 공간 시공, 그리고 강마루·강화마루·원목마루를 포함한 마루 시공을 바닥 시공 업체 화자 정보형(현장 확인·철거·덧방 판단·바닥 수평·습기·두께 선택)으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션63] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    id: "film", name: "인테리어필름", category: "건설·시공", status: "dev", enabled: false, verified: false, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🎞️", summary: "전체필름 · 싱크대필름 · 현관문필름 · 방문필름 · 몰딩필름 · 붙박이장필름 · 샷시필름 · 상가필름 · 사무실필름 · 엘리베이터필름",
    description: "싱크대·현관문·방문·몰딩·붙박이장·창틀 등 부위별 인테리어필름 시공과 상가·사무실·엘리베이터 등 영업 공간 시공을 인테리어필름 시공 업체 화자 정보형(하지 상태 판단·퍼티·샌딩·프라이머·압착·열마감)으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션63] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ [세션71] 배지 승격 ⬜ v2-pilot/dev/enabled:false → 🟦 v2/live/enabled:true.
    //     근거: 실발행 「별내 현관문수리 이후 관리 방법」 네이버 통합검색 상단 노출 확인(발행 1시간).
    //     cleaning·birdcontrol·tile(세션70) 동일 판정 기준.
    id: "door", name: "도어수리", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🚪", summary: "슬라이딩도어수리 · 포켓도어수리 · 터닝도어수리 · 붙박이장도어수리 · 중문수리 · 현관문수리 · 방문수리 · 문손잡이수리 · 도어클로저교체 · 힌지교체 · 롤러레일교체",
    description: "슬라이딩·포켓·터닝·붙박이장·중문·현관문·방문 고장과 손잡이·클로저·힌지·롤러레일 부품 교체를 도어 수리 업체 화자 정보형(증상 재현·부품 진단·수리와 교체 판단·작동 테스트)으로 안내합니다. 도어 시공 계열은 별도 업종으로 분리합니다(개발 중 · 관측 전).",
  },
  {
    // [세션65] ⬜ v2-pilot — 실생성 2건 PASS(옥상·외벽) 후 정식 오픈(enabled:true / status:review).
    //   survival 관찰은 병행 유지. 30건 도달 시 배지 재판정 → FREEZE.
    //   ★ 경쟁 실측: 상위글 4패턴(공법홍보·오래가는방수·견적·공사순서)이 전부 설명형.
    //     비어 있는 축 = 현장 발견 → 원인 진단 → 범위 판단 → 공법 선택. 이 축을 본문 골격으로 세운다.
    //   ★ [세션81] 배지 승격 ⬜ v2-pilot/review → 🟦 v2/live.
    //     근거: 실발행 「마석 옥상방수 자주 생기는 문제」 네이버 블로그탭 관련도순 2위 노출(발행 59분).
    //     door(세션71)·cleaning·birdcontrol·tile(세션70) 동일 판정 기준.
    id: "waterproof", name: "방수공사", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "💧", summary: "옥상방수 · 외벽방수 · 베란다방수 · 화장실방수 · 지하주차장방수 · 균열보수 · 인젝션방수 · 우레탄방수 · PVC시트방수",
    description: "옥상·외벽·베란다·화장실·지하주차장 누수와 균열보수·인젝션 주입, 우레탄 도막·PVC 시트 공법 선택을 방수 시공 업체 화자 정보형(누수 흔적 발견·물길 추적·부분보수와 전체시공 판단·담수 시험)으로 안내합니다. 공법은 홍보가 아니라 판단의 결과로만 다룹니다.",
  },
  {
    // [세션66] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 경쟁 실측: 상위글이 「페인트 중요성·공간별 차이·밑작업 중요·공정 나열」로 수렴하는 설명형.
    //     비어 있는 축 = 현장 발견 → 손상 진단 → 밑작업 범위 판단 → 도장 → 검수.
    //   ★ 용도(아파트·상가·사무실·복도)는 cat 이 아니라 실내벽면도장의 검색축으로 흡수(세션64 원칙).
    //   ★ [세션71] 배지 승격 ⬜ v2-pilot/dev/enabled:false → 🟦 v2/live/enabled:true (반장 판정).
    id: "paint", name: "페인트공사", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🎨", summary: "실내벽면도장 · 외벽도장 · 계단실도장 · 베란다도장 · 도막박리보수 · 목재도장 · 철재도장 · 바닥에폭시도장",
    description: "실내벽면·외벽·계단실 도장과 베란다 곰팡이·도막박리 보수, 목재·철재·바닥에폭시 밑칠 선택을 페인트 시공 업체 화자 정보형(도막 상태 확인·손상 발견·밑작업 범위 판단·1·2차 도장·마감 확인)으로 안내합니다. 공정은 소개가 아니라 밑작업 범위를 정한 결과로만 다룹니다(개발 중 · 관측 전).",
  },
  {
    // [세션67] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 경쟁 실측: 상위글이 공간이 아니라 공법 중심으로 흐르나 전부 설명형.
    //     비어 있는 축 = 빈소리로 범위 재기 → 바탕 진단 → 걷어낼지 위에 올릴지 판단.
    //   ★ 공간(욕실·주방·현관·베란다·아파트·상가)은 cat 이 아니라 keywords 로 흡수(세션64 원칙).
    //   ★ 「욕실리모델링」 명칭 미사용 — bathroom 업종·interior cat 과 중복(LEX 누수 방지).
    // [세션70 2026-07-29] 정식오픈 ⬜ v2-pilot(dev·enabled:false) → 🟦 v2(live·enabled:true).
    //   근거 = 실발행 「남양주시 욕실타일시공 전 확인할 부분」 네이버 게시 확인(blog.naver.com/backhyunil).
    //   ★ SOP PATCH-08: 지금까지 enabled:false 였으므로 노출 경로는 OWNER 게이트뿐이었다.
    //     enabled:true 로 일반 사용자에게도 「선택하기」가 열린다 — 온보딩 화이트리스트 동반 확인 필요.
    //   ★ 배지·게이트만 변경. 엔진 4파일 FREEZE 유지·무수정.
    id: "tile", name: "타일시공", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🧱", summary: "욕실타일시공 · 타일덧방시공 · 타일철거시공 · 타일부분보수 · 타일들뜸보수 · 포세린타일시공",
    description: "욕실·주방·현관 타일의 들뜸과 빈소리를 확인해 걷어낼지 위에 올릴지 정하는 과정을 타일 시공 업체 화자 정보형(빈소리 범위 확인·바탕면 진단·철거와 덧방 판단·부착·줄눈 마감)으로 안내합니다. 공법은 소개가 아니라 바탕 상태를 보고 정한 결과로만 다룹니다.",
  },
  {
    // [세션68] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 경쟁 실측: 상위글이 창호 종류·자재 등급 소개(이중창·시스템창호·유리 사양)로 수렴하는 설명형.
    //     비어 있는 축 = 외풍·물이 어디로 들어오는지 찾아 → 창을 갈지 새는 자리만 잡을지 판단.
    //   ★ 방충망은 screen 업종이 소유 — 동선 중복으로 cat 미신설(세션68 실측). 결합 의도만 keywords 흡수.
    //   ★ 창문단열시공은 샷시교체와 별도 cat — 창이 아니라 창 주변 벽체를 여는 공정.
    id: "window", name: "창호시공", category: "건설·시공", status: "dev", enabled: false, verified: false, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🪟", summary: "샷시교체 · 복층유리교체 · 창문누수수리 · 창틀실리콘교체 · 창문단열시공 · 방범창설치",
    description: "외풍·결로·누수 자국을 따라 어디로 들어오는지 찾아내고 창을 갈지 새는 자리만 잡을지 정하는 과정을 창호 시공 업체 화자 정보형(유입 지점 진단·교체 범위 판단·설치·이음 마감·기밀 확인)으로 안내합니다. 자재 등급은 소개가 아니라 판단의 결과로만 다룹니다(개발 중 · 관측 전).",
  },
  {
    // [세션68] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 업종 분리 근거(실측): 철거를 다루는 엔진이 셋이다.
    //     tile = 재시공 전제의 1공정 / interior = 리모델링 과정의 1공정 /
    //     demolition = 해체 자체가 목적이며 다음 공정에 면을 넘기고 종료한다.
    //   ★ 제외 CAT — 3단 판정 저촉: 욕실철거(bathroom 업종명+interior cat+tile 동선),
    //     주방철거(interior「주방리모델링」상위 개념), 바닥철거(flooring 완전일치 토큰).
    //     상가철거는 interior「상가인테리어」어휘 겹침 → experimental 보존, LEX 누수 관측 후 판단.
    //   ★ 선점 어휘 회피 — interior 가 「철거」 단독 토큰 보유. SCENE 토큰에 "철거·파쇄·폐기물·잔재·보양" 미사용.
    id: "demolition", name: "철거공사", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🪓", summary: "가벽철거 · 천장철거 · 원상복구철거",
    description: "가벽·천장·임대 원상복구 현장에서 무엇을 살리고 무엇을 뜯을지 경계를 정하는 과정을 철거 공사 업체 화자 정보형(구조 여부 판별·매립 설비 확인·손댈 경계 판단·분리·반출·다음 공정 인계)으로 안내합니다. 장비는 소개가 아니라 경계를 정한 결과로만 다룹니다.",
  },
  {
    // [세션69] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 예약석 승격 — tree 에 { id:"furniture", label:"붙박이장", available:false } 가 존재했다.
    //     label 을 「맞춤가구」로 개명 + available:true 로 전환(업종명 = 메인 CAT 명이면 LEX 누수).
    //   ★ 「붙박이장」 단독 어휘 4중 선점(실측): door「붙박이장도어수리」CAT / film「붙박이장필름」CAT /
    //     film FILM_AREAS 단독 토큰 / titleEngine SYMPTOM_LEX k:['붙박이장'] 6엔트리.
    //     → 세션68 「철거」 봉쇄와 동일. 「~제작」 접미로 검색축·토큰을 동시에 분리(「제작」 선점 0건).
    //   ★ 역할 경계: door = 달린 문의 부품 축 / film = 있는 면의 표면 축 /
    //     interior = 리모델링 과정 / furniture = 없던 것을 그 자리 치수로 짜서 넣는 축.
    //   ★ 공간 CAT 8종 전원 유지 — work 첫3토큰을 실제로 설계해 돌린 결과 내부·타업종 복제 0.
    //     제약(벽 기울기·지나갈 폭·레일 간섭·단 처짐·배선·열·배관·무릎 공간)이 첫 동작을 가른다.
    //   ★ 옵션(슬라이딩·여닫이·코너장·시스템행거·플랩도어·무몰딩·MDF·PET)은 CAT 아님 → keywords 흡수.
    id: "furniture", name: "맞춤가구", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🗄️", summary: "붙박이장제작 · 드레스룸제작 · 신발장제작 · 거실수납장제작 · 팬트리제작 · 주방수납장제작 · 세탁실수납장제작 · 맞춤책상제작",
    description: "벽 기울기·지나갈 폭·간섭물·깊이를 재 보고 그 자리의 제약을 치수로 어떻게 옮길지 정하는 과정을 맞춤가구 제작 업체 화자 정보형(자리 계측·제약 진단·내부 구성 판단·현장 설치·여닫이 조정)으로 안내합니다. 자재와 옵션은 소개가 아니라 자리를 재 본 결과로만 다룹니다.",
  },
  {
    // [세션69] ⬜ v2-pilot — 관측 전. PATCH-05 준수(enabled:false / status:dev).
    //   ★ 예약석 승격 — industry-tree.js 에 { id:"lighting", available:false } 가 이미 존재했다.
    //     신규 라인 추가가 아니라 available:true 전환(SOP v4.3 제안 K).
    //   ★ electricrepair 와 검색축 분리(실측): 전기수리 = "왜 안 켜지는가"(증상 축),
    //     조명 = "어디에 어떻게 배치하는가"(배치 축).
    //   ★ 제외 CAT — electricrepair 저촉: LED조명교체(er_led「조명 교체」), 조명설치(er_lightinst),
    //     센서등교체(er_sensor), 전등안들어옴(er_nolight).
    //   ★ 거실·침실·주방조명은 용도 축이라 cat 미신설(work 동선 복제) → keywords 흡수.
    id: "lighting", name: "조명", category: "건설·시공", status: "dev", enabled: false, verified: false, version: "v2-pilot", hasPhysicalStore: false,
    icon: "💡", summary: "간접조명 · 라인조명 · 매립등 · 마그네틱조명 · 레일조명 · 펜던트조명",
    description: "천장 속 여유·받칠 자리·전원 지점을 재 보고 그 자리를 그대로 쓸지 자리를 만들지 정하는 과정을 조명 시공 업체 화자 정보형(자리 계측·천장 여건 진단·배치 판단·앉힘·점등 확인)으로 안내합니다. 기구는 소개가 아니라 여건을 재 본 결과로만 다룹니다(개발 중 · 관측 전).",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    //   ★ [세션71] 배지 승격 ⬜ v2-pilot/review → 🟦 v2/live. 관측 종료 판정(반장).
    //     실발행 「남양주시 욕실 줄눈 시공 범위와 관리 방법」 노출 확인.
    id: "grout", name: "줄눈", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "욕실 줄눈 시공 · 주방 줄눈 시공 · 현관 줄눈 시공 · 베란다 줄눈 시공 · 구축아파트 줄눈 관리 · 줄눈 재시공 · 줄눈 종류 비교 · 입주 전 줄눈 체크리스트",
    description: "욕실·주방·현관·베란다 줄눈 시공, 구축아파트 줄눈 관리, 재시공, 종류 비교(케라폭시·폴리우레아), 입주 전 체크리스트를 줄눈 시공 업체 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    //   ★ [세션71] 배지 승격 ⬜ v2-pilot/review → 🟦 v2/live. 관측 종료 판정(반장).
    id: "coating", name: "탄성코트", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "베란다 탄성코트 · 결로 방지 관리 · 곰팡이 예방 방법 · 구축아파트 탄성코트 · 탄성코트 보수 · 탄성코트 재시공 · 탄성코트 종류 비교 · 탄성코트 시공 범위",
    description: "베란다 탄성코트, 결로 방지 관리, 곰팡이 예방, 구축아파트 탄성코트, 보수·재시공, 종류 비교(일반·세라믹·규조토·에어로겔), 시공 범위를 탄성코트 업체 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "systemair", name: "시스템에어컨", category: "건설·시공", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "❄️", summary: "시스템에어컨 설치 · 아파트 시스템에어컨 · 구축아파트 시스템에어컨 · 시스템에어컨 교체 · 시스템에어컨 견적 · 시스템에어컨 추가설치 · 시스템에어컨 배관 · 시스템에어컨 실외기실 체크",
    description: "시스템에어컨 설치, 아파트·구축아파트 설치, 교체, 견적, 추가설치, 배관(선배관·단배관·배수배관), 실외기실 체크를 시스템에어컨 업체 화자 정보형으로 안내합니다.",
  },
  {
    // [세션61] 🟦 v2 승격 — 실발행 상단 1위 확인(중랑구 중화동 시스템에어컨 청소). 관측 → live 전환.
    id: "airclean", name: "에어컨청소", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "벽걸이 에어컨 청소 · 스탠드 에어컨 청소 · 시스템에어컨 청소 · 에어컨 분해청소 · 에어컨 냄새 원인 점검 · 에어컨 곰팡이 제거 · 에어컨 물 떨어짐 원인 · 에어컨 청소 주기",
    description: "벽걸이·스탠드·시스템에어컨(천장형) 청소, 에어컨 분해청소, 냄새 원인 점검, 곰팡이 제거, 물 떨어짐 원인, 청소 주기를 에어컨청소 업체 화자 정보형으로 안내합니다.",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "screen", name: "방충망", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "미세방충망 · 현관방충망 · 롤방충망 · 안전방충망 · 추락방지방충망 · 방범방충망 · 방충망 교체 · 방충망 수리 · 방충망 설치 · 방충망 관리방법 · 방충망 종류 비교",
    description: "미세방충망·현관방충망·롤방충망·안전방충망·추락방지방충망·교체·관리방법·종류비교를 방충망 업체 화자 정보형으로 안내합니다.",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    // [세션61 2026-07-27] 관측 PASS — 🟨 v2-new → 🟦 v2 승격. (buildingclean 동형: status는 review 유지)
    id: "pestcontrol", name: "방역", category: "생활서비스", status: "review", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🟦", summary: "가정집 방역 · 원룸 방역 · 상가 방역 · 음식점 방역 · 바퀴벌레 퇴치 · 개미 퇴치 · 해충 방역 · 방역 관리방법",
    description: "가정집·원룸·상가·음식점 방역, 바퀴벌레·개미 퇴치, 해충 방역, 방역 관리방법을 방역 업체 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "buildingclean", name: "건물청소", category: "생활서비스", status: "review", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🟦", summary: "건물청소 · 사무실청소 · 상가청소 · 계단청소 · 정기청소 · 준공청소 · 외벽청소 · 건물관리 체크리스트",
    description: "건물청소·사무실청소·상가청소·계단청소·정기청소·준공청소·외벽청소·건물관리 체크리스트를 건물청소 업체 화자 정보형(건물 유지관리)으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션55] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    // [세션70 2026-07-29] 승격 ⬜ v2-pilot → 🟦 v2 (cleaning 과 동일 판정).
    //   ★ 배지·status·설명 꼬리말만 변경. V1 FREEZE 유지·엔진 무수정.
    id: "birdcontrol", name: "비둘기퇴치", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "비둘기퇴치 · 실외기실 비둘기퇴치 · 베란다 비둘기퇴치 · 옥상 비둘기퇴치 · 비둘기퇴치망 · 버드스파이크 · 비둘기 둥지제거 · 비둘기 배설물청소 · 비둘기 소독 · 상가 비둘기퇴치 · 건물 비둘기퇴치 · 조류퇴치 체크리스트",
    description: "비둘기퇴치·실외기실·베란다 비둘기퇴치, 비둘기퇴치망·버드스파이크 차단시설, 상가·건물 비둘기퇴치, 조류퇴치 체크리스트를 비둘기퇴치 업체 화자 정보형(차단·예방)으로 안내합니다.",
  },
  {
    // [세션61] 🟦 v2 승격 — 실발행 상단 확인(상봉동 물탱크청소). 관측 → live 전환.
    id: "tankclean", name: "저수조청소", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "저수조청소 · 물탱크청소 · 아파트저수조청소 · 공동주택저수조청소 · 상가저수조청소 · 저수조소독 · 저수조청소주기 · 저수조관리체크리스트",
    description: "저수조청소·물탱크청소, 아파트·공동주택·상가 저수조청소, 소독·관리주기·관리대장·점검 체크리스트를 저수조청소 업체 화자 정보형(급수시설 관리)으로 안내합니다.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "leakdetect", name: "누수탐지", category: "생활서비스", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🔵", summary: "누수탐지 · 아파트누수 · 화장실누수 · 천장누수 · 수도배관누수 · 누수탐지비용 · 누수보험처리 · 아래층누수대처",
    description: "누수탐지·아파트누수, 화장실·천장·수도배관 누수, 누수탐지비용·보험처리·아래층누수 대처를 누수탐지 업체 화자 정보형(원인·탐지절차·장비)으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "sewer", name: "하수구막힘", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "하수구막힘 · 싱크대막힘 · 변기막힘 · 세면대막힘 · 배수구막힘 · 하수구역류 · 하수구악취 · 하수구고압세척 · 배관내시경 · 횡주관청소",
    description: "하수구막힘·싱크대·변기·세면대·배수구 막힘, 하수구역류·악취, 고압세척·배관내시경·횡주관청소를 하수구막힘 업체 화자 정보형(원인·점검·작업절차·예방)으로 안내합니다.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "plumbing", name: "수도설비", category: "건설·시공", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "수도설비 · 수도배관설치 · 수도배관수리 · 수도계량기설치 · 상하수도배관공사 · 싱크대수도설치 · 전기온수기설치 · 수도배관위치변경",
    description: "수도설비·수도배관 설치·수리, 수도계량기·상하수도배관공사·싱크대수도·전기온수기 설치·배관위치변경을 수도설비 업체 화자 정보형(작업범위·원인·진행절차·유지관리)으로 안내합니다.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "boiler", name: "보일러설치", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🔵", summary: "보일러교체 · 콘덴싱보일러설치 · 보일러고장원인 · 보일러에러코드 · 온수안나옴 · 난방안됨 · 보일러누수 · 보일러배관청소 · 보일러교체시기 · 보일러설치비용 · 귀뚜라미보일러 · 경동나비엔보일러",
    description: "보일러교체·콘덴싱설치, 고장원인·에러코드·온수·난방·누수·배관청소·교체시기·설치비용·브랜드(귀뚜라미·경동나비엔)를 보일러설치 업체 화자 정보형(시공범위·발생원인·진행절차·관리방법)으로 안내합니다.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "homefix", name: "집수리", category: "생활서비스", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🔧", summary: "문손잡이교체 · 현관문수리 · 도어클로저교체 · 빨래건조대설치 · 커튼레일설치 · 실리콘보수 · 콘센트교체 · 전등교체",
    description: "문손잡이·현관문·도어클로저·빨래건조대·커튼레일·실리콘·콘센트·전등 등 집 안 소규모 수리·교체·설치를 집수리 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [세션126] 승격 — 실발행 상위노출 확인(남양주시 콘센트교체). review/v2-pilot → live/v2.
    id: "electricrepair", name: "전기수리", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "⚡", summary: "누전점검 · 차단기점검 · 차단기교체 · 누전차단기교체 · 분전함점검 · 콘센트교체 · 스위치교체 · LED교체 · 센서등교체 · 조명설치 · 전등안들어옴",
    description: "누전·차단기·콘센트·스위치·조명·센서등 등 생활전기 점검·교체를 전기수리 업체 화자 정보형(발생원인·점검위치·증상·확인사항·관리방법)으로 안내합니다.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "sinkrepair", name: "싱크대수리", category: "생활서비스", status: "live", enabled: true, verified: true, version: "v2", hasPhysicalStore: false,
    icon: "🚰", summary: "싱크대수리 · 싱크대문교체 · 싱크대경첩교체 · 싱크대레일교체 · 하부장수리 · 수납장수리 · 상판보수 · 싱크볼교체",
    description: "싱크대 문·경첩·레일·하부장·수납장·상판·싱크볼 등 주방 싱크대 소규모 수리·교체·보수를 싱크대수리 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다. 수리·교체 전용 — 제작·리폼·리모델링 미포함.",
  },
  {
    // [세션56] ⬜ v2-pilot(관측 중) — 발행·관측 데이터 확보 후 배지 재판정.
    id: "bathroom", name: "욕실리모델링", category: "건설·시공", status: "review", enabled: false, verified: true, version: "v2-pilot", hasPhysicalStore: false,
    icon: "🛁", summary: "욕실리모델링 · 화장실리모델링 · 욕실타일교체 · 욕조교체 · 샤워부스설치 · 변기교체 · 세면대교체 · 욕실수전교체 · 욕실환풍기교체 · 욕실실리콘교체 · 욕실배수구교체 · 욕실천장교체 · 거울장교체",
    description: "욕실 전체·부분 리모델링과 타일·욕조·샤워부스·변기·세면대·수전·환풍기·실리콘·배수구·거울장 등 교체·보수를 욕실리모델링 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다(개발 중 · 관측 전).",
  },

  // ── 교육·행사 ───────────────────────────────────────────────
  {
    id: "kindergarten", name: "유치원·어린이집", category: "교육·행사", status: "review", enabled: false, hasPhysicalStore: false,
    icon: "🏫", summary: "병원놀이 · 시장놀이 · 과학 · 전통놀이 · 블랙라이트 · 캠핑 등 18종 체험행사",
    description: "유치원·어린이집 방문 체험행사를 현장 장면 중심 후기형으로 안내합니다. 18종 프로그램(역할놀이·체험탐구·신체활동·만들기·안전교육)(개발 중 · 관측 전).",
  },

  // ── 실버케어 ────────────────────────────────────────────────
  {
    id: "daycare", name: "주간보호센터", category: "실버케어", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "입소자격(이용대상) · 장기요양등급 · 이용비용(본인부담금) · 치매돌봄 · 재활프로그램 · 송영서비스 · 보호자상담 · 센터선택기준 · 생활실 소개 · 식사·간식 관리 · 인지활동 프로그램 · 시설 환경 소개 · 하루 일과 소개",
    description: "주간보호·데이케어 센터 콘텐츠(개발 중 · 관측 전).",
  },
  {
    id: "homecare", name: "방문요양", category: "실버케어", status: "review", enabled: false, hasPhysicalStore: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "장기요양등급 · 방문요양 비용(본인부담금) · 방문요양 신청방법 · 가족요양 · 방문요양 vs 요양원 · 병원 퇴원 후 돌봄 · 방문요양센터 선택기준",
    description: "방문요양·재가 돌봄 콘텐츠(개발 중 · 관측 전).",
  },
  {
    id: "welfarecare", name: "복지용구", category: "실버케어", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "장기요양등급 · 복지용구 신청방법 · 전동침대 · 휠체어 · 보행기 · 안전손잡이 · 목욕용품 · 복지용구 한도액",
    description: "장기요양등급·복지용구 신청·전동침대/휠체어/안전손잡이·한도액 등을 복지용구 사업소 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    id: "seniorgoods", name: "노인용품", category: "실버케어", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "전동침대 · 휠체어 · 전동휠체어 · 성인보행기 · 실버카 · 지팡이 · 안전손잡이 · 욕실안전용품 · 이동변기 · 목욕의자 · 욕창예방매트리스 · 미끄럼방지용품 · 복지용구 보험적용 · 장기요양등급 복지용구 · 복지용구 대여 · 복지용구 구매 · 복지용구 선택방법",
    description: "전동침대/휠체어/보행기/안전손잡이 등 노인용품과 복지용구 보험적용·등급·대여/구매를 노인용품 전문점 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    id: "funeral", name: "상조", category: "실버케어", status: "review", enabled: false, hasPhysicalStore: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "장례비용 · 가족장 비용 · 장례절차 · 사망 후 해야 할 일 · 장례식장 안내 · 빈소 예약·선택 · 장례형태(가족장·무빈소) · 화장 장례 · 후불상조 · 상조 비교·필요성 · 실속형 · 가족장 · 무빈소 · 프리미엄 · VIP",
    description: "상조·장례 절차/비용/장례식장 콘텐츠(개발 중 · 관측 전 · 장례지도사 화자 정보형).",
  },

  // ── 부동산 ─────────────────────────────────────────────────
  {
    id: "realestate", name: "부동산", category: "부동산", status: "review", enabled: false, verified: true, version: "v2-new",
    icon: "🔵", summary: "아파트분석 · 실거주분석 · 전세 · 전세보증금 · 월세 · 재건축 · 재개발 · 지역분석 · 단지생활권 · 계약상식 · 세금상식",
    description: "아파트분석·전세·월세·재건축·재개발·지역분석·부동산상식을 공인중개사 화자 분석리포트형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    id: "realtor", name: "공인중개사", category: "부동산", status: "plan", enabled: false,
    description: "매매·전세·급매 등 지역 부동산 콘텐츠(기획 단계).",
  },
  {
    id: "presale", name: "분양", category: "부동산", status: "plan", enabled: false,
    description: "아파트·오피스텔 분양 콘텐츠(기획 단계).",
  },

  // ── 레저·취미 ──────────────────────────────────────────────
  {
    id: "fishing", name: "고패킹·바다낚시", category: "레저·취미", status: "review", enabled: false,
    icon: "🎣", summary: "낚시방법 · 입질조황분석 · 자동vs수동비교 — 어종별 고패질·세팅·포인트",
    description: "고패킹·자동낚시장비와 바다낚시터 공략을 낚시 화자 정보형(어종별 입질패턴·고패질 타이밍·수심세팅·포인트·시즌)으로 안내합니다. 글유형 3종(방법형·분석형·비교형) · 단일호출형(개발 중 · 관측 전).",
  },

  // ── 기타 ───────────────────────────────────────────────────
  {
    id: "flower", name: "꽃배달", category: "기타", status: "review", enabled: false, hasPhysicalStore: false,
    icon: "🔵", summary: "근조화환 · 축하화환 · 개업화분 · 꽃바구니 · 꽃다발 · 동양란 · 서양란",
    description: "근조화환·축하화환·개업화분·꽃다발 등 화훼 상품을 플로리스트 화자 정보형으로 안내합니다(개발 중 · 관측 전).",
  },
  {
    // [2026-08-05 / 세션95] 무속 상담 엔진 V1 — 배선 완료 → status:"review" + enabled:true 승격.
    //   승격 전(dev·false)에는 트리 선택 판정(it.enabled && !confirmedIndustry)이 false라
    //   업종센터에서 행은 보이되 선택 버튼이 렌더되지 않았다.
    //   대분류는 "기타" 유지. 철학관·사주·타로 추가 시 "상담·역학" 신설 검토(V2).
    //   ※ hasPhysicalStore 미기재 = true(매장형). 고객이 상담소를 방문.
    id: "shaman", name: "무속 상담", category: "기타", status: "live", enabled: true, done: true,
    icon: "🔵",
    summary: "사업번창 · 문서매매 · 자손학업 · 병굿신굿 · 조상천도 · 혼인인연",
    description: "사업·문서·자손·건강·조상·인연 상담 분야와 실제 검색 상황을 연결해 안내합니다(관측 중).",
    example: "장사가 계속 안될 때, 어디서부터 봐야 할까",
  },
];

// 헬퍼 — 카테고리별 그룹핑(트리 렌더용). ORDER 기준 정렬, 빈 카테고리 제외.
export function getCatalogByCategory() {
  const byCat = {};
  INDUSTRY_CATALOG.forEach(it => {
    (byCat[it.category] = byCat[it.category] || []).push(it);
  });
  return INDUSTRY_CATEGORY_ORDER
    .filter(cat => byCat[cat] && byCat[cat].length)
    .map(cat => ({ category: cat, items: byCat[cat] }));
}

// 헬퍼 — id로 카탈로그 항목 조회.
export function getCatalogItem(id) {
  return INDUSTRY_CATALOG.find(it => it.id === id) || null;
}

// ── [세션39][STORE-01] 매장 유무 게이트 ──────────────────────────────────
// hasPhysicalStore(industryId) → boolean
//   true  = 매장형: 고객이 업체를 방문. 주소·찾아오시는 길·방문정보 사용.
//   false = 방문형: 출장 서비스. 위치 3필드·locationBlock·방문정보 미사용.
// 계약: 카탈로그 미기재 = true(기본값 매장형). 카탈로그 미등록 id도 true(안전측).
//   ⚠ address 는 이 게이트와 무관하게 항상 유지 — 대표지역 SoT(suggestRegion) 기반.
export function hasPhysicalStore(industryId) {
  const it = getCatalogItem(String(industryId || ""));
  if (!it) return true;                       // 미등록 → 매장형 기본
  return it.hasPhysicalStore !== false;       // 미기재 → true
}

// 방문형(출장) 업종 id 목록 — 디버그/검수용.
export function getVisitTypeIndustries() {
  return INDUSTRY_CATALOG.filter(it => it.hasPhysicalStore === false).map(it => it.id);
}
