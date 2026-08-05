// ╔══════════════════════════════════════════════════════════╗
// ║ obgyn-v2-data.js — 산부인과 V2 Purpose                     ║
// ║ ⚠ v1 lib/obgyn-data.js (OBGYN_TREATMENTS) 무손상            ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 여성 증상 → 검사 선택 → 치료 판단               ║
// ║ 경계: 임신·출산·분만·난임 제외(분만/성공률 리스크)          ║
// ║       소음순·질성형 등 미용 제외 / 피임 시술 제외            ║
// ║       유방 = 유방외과 SoT / 요실금 = urology SoT             ║
// ║       자궁경부암 = 검사에서 '추가 확인 필요 여부'까지만      ║
// ║       갱년기 = 정보형. HRT는 '진료에서 함께 검토되는 방향'   ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const OBGYN_V2_META = {
  industry: "obgyn",
  name: "산부인과",
  bizWord: "산부인과",
  deptWord: "산부인과",
};

export const OBGYN_V2_CATS = [
  "검사",
  "자궁",
  "난소·호르몬",
  "월경",
  "감염·갱년기",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const OBGYN_V2_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "pelvic_us", name: "부인과초음파", cat: "검사",
    compareWith: "골반MRI",
    desc: "자궁과 난소의 크기·모양·내부 상태를 영상으로 확인하는 검사",
  },
  {
    id: "pap", name: "자궁경부세포검사", cat: "검사",
    compareWith: "HPV검사",
    desc: "자궁경부에서 채취한 세포의 변화 여부를 확인하는 검사",
  },
  {
    id: "hpv", name: "HPV검사", cat: "검사",
    compareWith: "자궁경부세포검사",
    desc: "자궁경부 관련 바이러스의 존재와 유형을 확인해 추가 확인 필요 여부를 가르는 검사",
  },
  {
    id: "hormone", name: "여성호르몬검사", cat: "검사",
    compareWith: "부인과초음파",
    desc: "혈액에서 여성호르몬 관련 수치를 확인해 주기·배란·난소 기능의 변화를 살피는 검사",
  },
  {
    id: "pelvic_mri", name: "골반MRI", cat: "검사",
    compareWith: "부인과초음파",
    desc: "초음파만으로 정리되지 않는 골반 내 구조와 병변의 범위를 정밀하게 확인하는 검사",
  },

  // ── 자궁 (disease 3) ──
  {
    id: "fibroid", name: "자궁근종", cat: "자궁",
    compareWith: "자궁선근증",
    desc: "자궁 근육층에 생긴 양성 종양. 크기·위치·증상 정도가 판단 근거",
  },
  {
    id: "adenomyosis", name: "자궁선근증", cat: "자궁",
    compareWith: "자궁근종",
    desc: "자궁 근육층 안으로 내막 조직이 자리 잡은 상태. 생리량과 통증 양상이 판단 축",
  },
  {
    id: "endometriosis", name: "자궁내막증", cat: "자궁",
    compareWith: "자궁선근증",
    desc: "자궁 바깥에 내막 조직이 자리 잡은 상태. 생리통과 골반통의 양상이 확인의 출발점",
  },

  // ── 난소·호르몬 (disease 2) ──
  {
    id: "ovarian_cyst", name: "난소낭종", cat: "난소·호르몬",
    compareWith: "다낭성난소증후군",
    desc: "난소에 생긴 물혹. 크기와 경과, 영상 소견이 판단 근거",
  },
  {
    id: "pcos", name: "다낭성난소증후군", cat: "난소·호르몬",
    compareWith: "생리불순",
    desc: "배란과 호르몬 균형의 변화가 이어지는 상태. 주기·호르몬 수치·영상 소견을 함께 확인",
  },

  // ── 월경 (disease 2) ──
  {
    id: "irregular", name: "생리불순", cat: "월경",
    compareWith: "다낭성난소증후군",
    desc: "생리 주기나 양의 변화가 이어지는 상태. 원인 범위를 가르는 확인이 축",
  },
  {
    id: "dysmenorrhea", name: "생리통", cat: "월경",
    compareWith: "자궁내막증",
    desc: "생리 기간의 통증. 통증 정도와 일상 지장, 동반 소견이 판단 근거",
  },

  // ── 감염·갱년기 (disease 2) ──
  {
    id: "vaginitis", name: "질염", cat: "감염·갱년기",
    compareWith: "자궁경부세포검사",
    desc: "질 내 염증. 분비물 양상과 검사 소견, 반복 여부가 판단 축",
  },
  {
    id: "menopause", name: "갱년기", cat: "감염·갱년기",
    compareWith: "여성호르몬검사",
    desc: "호르몬 변화로 여러 증상이 나타나는 시기. 증상과 호르몬 수치 확인이 출발점",
  },
];

export default OBGYN_V2_TREATMENTS;
