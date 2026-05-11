// lib/eye-data.js — 안과 진료/시술 데이터 v1.0
// EYE_DIRECTION(eye-prompts.js)의 22개 id와 1:1 매칭
// 카테고리: index.js EYE_CATS와 동일
//   ["전체","시력교정","백내장·노안","망막·녹내장","안구건조·결막","사시·소아안과","검진·상담"]

export const EYE_META = {
  industry: "eye",
  label: "안과",
  minLength: 2000,
};

export const EYE_TREATMENTS = [
  // ─── 시력교정 ───
  {
    id: "lasik",
    industry: "eye",
    name: "라식",
    cat: "시력교정",
    emoji: "👓",
    titlePatterns: [
      "{region} 안과 라식 후기｜안경 벗고 달라진 일상",
      "{region} 라식 수술 결정한 이유 솔직 후기",
      "{region} 안과 라식 회복 일지 기록",
    ],
    keywords: ["라식", "시력교정", "{region}라식", "{region}안과라식"],
    compareWith: "라섹",
  },
  {
    id: "lasek",
    industry: "eye",
    name: "라섹",
    cat: "시력교정",
    emoji: "👁️",
    titlePatterns: [
      "{region} 안과 라섹 후기｜회복 기간 솔직 정리",
      "{region} 라섹 통증·경과 기록한 이야기",
      "각막 얇아 라섹 선택한 {region} 안과 후기",
    ],
    keywords: ["라섹", "각막 보존", "{region}라섹", "{region}안과라섹"],
    compareWith: "라식",
  },
  {
    id: "smile_lasik",
    industry: "eye",
    name: "스마일라식",
    cat: "시력교정",
    emoji: "🔬",
    titlePatterns: [
      "{region} 안과 스마일라식 후기｜회복 빠른 이유",
      "{region} 스마일라식 결정한 이야기",
      "{region} 안과 스마일라식 통증·다운타임 기록",
    ],
    keywords: ["스마일라식", "최소 절개", "{region}스마일라식", "{region}안과스마일라식"],
    compareWith: "라식",
  },
  {
    id: "icl",
    industry: "eye",
    name: "안내렌즈삽입술",
    cat: "시력교정",
    emoji: "👀",
    titlePatterns: [
      "{region} 안과 안내렌즈삽입술 후기｜고도근시 해결",
      "{region} ICL 수술 결정한 이유 솔직 후기",
      "라식 안 되는 고도근시 {region} 안과 후기",
    ],
    keywords: ["안내렌즈삽입술", "ICL", "고도근시", "{region}안내렌즈삽입술"],
    compareWith: "라식",
  },

  // ─── 백내장·노안 ───
  {
    id: "cataract",
    industry: "eye",
    name: "백내장 수술",
    cat: "백내장·노안",
    emoji: "🌫️",
    titlePatterns: [
      "{region} 안과 백내장 수술 후기｜시야 선명해진 변화",
      "{region} 백내장 수술 다초점렌즈 결정 이유",
      "{region} 안과 백내장 회복 일지",
    ],
    keywords: ["백내장수술", "다초점렌즈", "{region}백내장", "{region}안과백내장"],
    compareWith: "노안 교정",
  },
  {
    id: "presbyopia",
    industry: "eye",
    name: "노안 교정",
    cat: "백내장·노안",
    emoji: "🔎",
    titlePatterns: [
      "{region} 안과 노안 교정 후기｜돋보기 벗은 이야기",
      "{region} 노안 다초점렌즈 솔직 후기",
      "{region} 안과 노안 교정 회복 일지",
    ],
    keywords: ["노안교정", "다초점", "{region}노안교정", "{region}안과노안"],
    compareWith: "백내장 수술",
  },

  // ─── 망막·녹내장 ───
  {
    id: "retina",
    industry: "eye",
    name: "망막 질환",
    cat: "망막·녹내장",
    emoji: "🩺",
    titlePatterns: [
      "{region} 안과 망막 검사 후기｜비문증으로 시작",
      "{region} 망막 질환 진단 후 치료 기록",
      "{region} 안과 망막 정밀검사 솔직 후기",
    ],
    keywords: ["망막질환", "망막검사", "{region}망막", "{region}안과망막"],
    compareWith: "녹내장",
  },
  {
    id: "floaters",
    industry: "eye",
    name: "비문증",
    cat: "망막·녹내장",
    emoji: "🔭",
    titlePatterns: [
      "{region} 안과 비문증 검사 후기｜점이 늘어나서 방문",
      "{region} 비문증 원인 찾으러 간 이야기",
      "{region} 안과 비문증 정밀검사 솔직 후기",
    ],
    keywords: ["비문증", "{region}비문증", "{region}안과비문증", "망막박리"],
    compareWith: "망막 질환",
  },
  {
    id: "glaucoma",
    industry: "eye",
    name: "녹내장",
    cat: "망막·녹내장",
    emoji: "💧",
    titlePatterns: [
      "{region} 안과 녹내장 진단 후 치료 후기",
      "{region} 안압 높다고 들은 후 검진 기록",
      "{region} 안과 녹내장 관리 솔직 후기",
    ],
    keywords: ["녹내장", "안압", "{region}녹내장", "{region}안과녹내장"],
    compareWith: "망막 질환",
  },
  {
    id: "macular",
    industry: "eye",
    name: "황반변성",
    cat: "망막·녹내장",
    emoji: "🎯",
    titlePatterns: [
      "{region} 안과 황반변성 진단 후기｜글자 휘어 보여서",
      "{region} 황반변성 치료 시작한 이야기",
      "{region} 안과 황반 검사 솔직 후기",
    ],
    keywords: ["황반변성", "{region}황반변성", "{region}안과황반", "중심시야"],
    compareWith: "망막 질환",
  },
  {
    id: "diabetic_retina",
    industry: "eye",
    name: "당뇨망막병증",
    cat: "망막·녹내장",
    emoji: "🩸",
    titlePatterns: [
      "{region} 안과 당뇨망막병증 검진 후기",
      "당뇨 5년차 {region} 안과 망막 검사 기록",
      "{region} 당뇨망막병증 치료 솔직 후기",
    ],
    keywords: ["당뇨망막병증", "{region}당뇨망막", "{region}안과당뇨", "망막합병증"],
    compareWith: "망막 질환",
  },

  // ─── 안구건조·결막 ───
  {
    id: "dry_eye",
    industry: "eye",
    name: "안구건조증",
    cat: "안구건조·결막",
    emoji: "💦",
    titlePatterns: [
      "{region} 안과 안구건조증 치료 후기｜인공눈물 한계",
      "{region} 안구건조증 IPL·마이봄샘 치료 기록",
      "{region} 안과 안구건조 정밀검사 솔직 후기",
    ],
    keywords: ["안구건조증", "마이봄샘", "{region}안구건조", "{region}안과안구건조증"],
    compareWith: "결막염",
  },
  {
    id: "conjunctivitis",
    industry: "eye",
    name: "결막염",
    cat: "안구건조·결막",
    emoji: "🌸",
    titlePatterns: [
      "{region} 안과 결막염 치료 후기｜반복되는 충혈",
      "{region} 알레르기 결막염 치료 기록",
      "{region} 안과 결막염 솔직 후기",
    ],
    keywords: ["결막염", "알레르기결막염", "{region}결막염", "{region}안과결막염"],
    compareWith: "안구건조증",
  },
  {
    id: "stye",
    industry: "eye",
    name: "다래끼·눈꺼풀염",
    cat: "안구건조·결막",
    emoji: "🩹",
    titlePatterns: [
      "{region} 안과 다래끼 치료 후기｜재발해서 절개",
      "{region} 눈꺼풀염 치료 받은 이야기",
      "{region} 안과 다래끼 절개 솔직 후기",
    ],
    keywords: ["다래끼", "눈꺼풀염", "{region}다래끼", "{region}안과다래끼"],
    compareWith: "결막염",
  },

  // ─── 사시·소아안과 ───
  {
    id: "strabismus",
    industry: "eye",
    name: "사시 교정",
    cat: "사시·소아안과",
    emoji: "👶",
    titlePatterns: [
      "{region} 안과 사시 교정 후기｜아이 눈 방향 발견",
      "{region} 소아 사시 진단 후 치료 기록",
      "{region} 안과 사시 검사 솔직 후기",
    ],
    keywords: ["사시교정", "소아사시", "{region}사시", "{region}안과사시"],
    compareWith: "약시 치료",
  },
  {
    id: "myopia_control",
    industry: "eye",
    name: "근시 진행 억제",
    cat: "사시·소아안과",
    emoji: "📉",
    titlePatterns: [
      "{region} 안과 아이 근시 진행 억제 후기",
      "{region} 소아 근시 안경 도수 안정화 기록",
      "{region} 안과 근시 관리 솔직 후기",
    ],
    keywords: ["근시진행억제", "소아근시", "{region}근시억제", "{region}안과근시"],
    compareWith: "드림렌즈",
  },
  {
    id: "dream_lens",
    industry: "eye",
    name: "드림렌즈",
    cat: "사시·소아안과",
    emoji: "🌙",
    titlePatterns: [
      "{region} 안과 드림렌즈 후기｜아이 시력 관리",
      "{region} 드림렌즈 1년 사용 솔직 후기",
      "{region} 안과 드림렌즈 적응 기간 기록",
    ],
    keywords: ["드림렌즈", "야간렌즈", "{region}드림렌즈", "{region}안과드림렌즈"],
    compareWith: "근시 진행 억제",
  },
  {
    id: "amblyopia",
    industry: "eye",
    name: "약시 치료",
    cat: "사시·소아안과",
    emoji: "🧒",
    titlePatterns: [
      "{region} 안과 약시 치료 후기｜시력검사에서 발견",
      "{region} 소아 약시 가림치료 기록",
      "{region} 안과 약시 시기능 훈련 솔직 후기",
    ],
    keywords: ["약시치료", "가림치료", "{region}약시", "{region}안과약시"],
    compareWith: "사시 교정",
  },

  // ─── 검진·상담 ───
  {
    id: "eye_checkup",
    industry: "eye",
    name: "안과 정밀검진",
    cat: "검진·상담",
    emoji: "🔍",
    titlePatterns: [
      "{region} 안과 정밀검진 후기｜안저·안압 한번에",
      "{region} 안과 종합검진 받아봤어요",
      "{region} 안과 첫 정밀검사 솔직 후기",
    ],
    keywords: ["안과정밀검진", "안저검사", "{region}안과검진", "{region}안과정밀검진"],
    compareWith: "",
  },
];
