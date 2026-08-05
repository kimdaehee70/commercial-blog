// ╔══════════════════════════════════════════════════════════╗
// ║ family-v2-playConfig.js — 가정의학과 V2 (병원군 표준)      ║
// ║ 7섹션 FLOW · blockKeywords(경계 오염 차단)                 ║
// ║ ⚠ 관측 전. FREEZE 아님. v1(6섹션) 무손상.                  ║
// ╚══════════════════════════════════════════════════════════╝

export const FAMILY_V2_FLOW_ENGINE = {
  industry: "family",

  // 병원군 표준 7섹션 (psy/pediatrics/obgyn 동형)
  sections: [
    { key: "concern",     label: "지금 이런 상황인가요",            minLength: 200 },
    { key: "consider",    label: "이럴 때 진료를 고려해볼 수 있습니다", minLength: 220 },
    { key: "checkItems",  label: "진료에서는 무엇을 확인하나요",     minLength: 250 },
    { key: "decision",    label: "검사·치료는 어떤 기준으로 결정되나요", minLength: 250 },
    { key: "choosePoint", label: "병원 선택 시 확인할 점",           minLength: 220 },
    { key: "process",     label: "진료실과 검사실에서 확인하는 과정", minLength: 250 },
    { key: "closing",     label: "마무리",                          minLength: 160 },
  ],

  // 경계 오염 차단 토큰 — 타 진료과 SoT 침범 방지
  blockKeywords: [
    // 한방
    "한약", "침술", "추나", "공진단", "보약", "한의원",
    // 미용·비급여
    "보톡스", "필러", "레이저", "여드름", "기미", "리프팅",
    "수액치료", "영양주사", "마늘주사", "신데렐라주사",
    "비만치료", "삭센다", "위고비", "다이어트약",
    "금연클리닉", "챔픽스",
    // 소화기(gastro 경계)
    "위내시경", "대장내시경", "내시경", "역류성식도염", "과민성대장", "위염", "헬리코박터",
    // 타 과
    "전립선", "발기", "포경",
    "임플란트", "교정", "치과",
    "백내장", "라식", "라섹", "녹내장",
    "제왕절개", "산전검사",
    // 약물 성분·계열
    "스타틴", "메트포르민", "PPI", "항생제 처방",
  ],

  minTotalLength: 2000,
};
