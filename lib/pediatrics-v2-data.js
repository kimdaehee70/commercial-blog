// ╔══════════════════════════════════════════════════════════╗
// ║ pediatrics-v2-data.js — 소아청소년과 V2 Purpose            ║
// ║ ⚠ v1 lib/pediatrics-data.js (PEDIATRICS_TREATMENTS) 무손상 ║
// ║ 14종: exam 5 / disease 9 · cat 5계열                       ║
// ║ 핵심 철학: 아이 증상 → 검사 선택 → 치료 판단               ║
// ║ 경계: 예방접종 제외(백신 권장·효과 표현 리스크)             ║
// ║       고열·열성경련 제외(응급 프레이밍 리스크)              ║
// ║       성장호르몬·소아비만 제외(비급여 광고 리스크)          ║
// ║       신생아·영아 진료 제외(범위 모호)                      ║
// ║       중이염·비염·축농증 = ent SoT                          ║
// ║       결막염·다래끼 = eye SoT / ADHD·발달장애 = psy SoT     ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const PEDIATRICS_V2_META = {
  industry: "pediatrics",
  name: "소아청소년과",
  bizWord: "소아과",
  deptWord: "소아청소년과",
};

export const PEDIATRICS_V2_CATS = [
  "검사",
  "호흡기",
  "알레르기·피부",
  "소화기",
  "감염·성장",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const PEDIATRICS_V2_TREATMENTS = [
  // ── 검사 (exam 5) ──
  {
    id: "allergy_test", name: "소아알레르기검사", cat: "검사",
    compareWith: "소아혈액검사",
    desc: "반복되는 피부·호흡기 증상과 관련된 자극 요인을 혈액·피부 반응으로 확인하는 검사",
  },
  {
    id: "growth_test", name: "소아성장검사", cat: "검사",
    compareWith: "성조숙증",
    desc: "성장 곡선과 손목 영상으로 확인하는 뼈의 성숙 정도를 함께 살펴 성장 속도를 확인하는 검사",
  },
  {
    id: "development_test", name: "영유아발달검사", cat: "검사",
    compareWith: "소아성장검사",
    desc: "월령별 항목과 보호자 관찰 기록을 함께 확인해 발달 시기를 살피는 검사",
  },
  {
    id: "blood_test", name: "소아혈액검사", cat: "검사",
    compareWith: "소아알레르기검사",
    desc: "나이별 기준 범위에 따라 적혈구·철분·염증 관련 수치를 확인하는 검사",
  },
  {
    id: "lung_function_test", name: "소아폐기능검사", cat: "검사",
    compareWith: "소아천식",
    desc: "숨을 내쉴 때의 흐름과 약물 사용 전후 변화를 확인하는 검사. 연령에 따라 수행 가능 여부가 갈림",
  },

  // ── 호흡기 (disease 3) ──
  {
    id: "asthma", name: "소아천식", cat: "호흡기",
    compareWith: "소아폐렴",
    desc: "기침과 숨소리 변화가 계절·활동에 따라 반복되는 상태. 증상 기록과 진찰 소견이 판단 축",
  },
  {
    id: "bronchiolitis", name: "모세기관지염", cat: "호흡기",
    compareWith: "소아천식",
    desc: "어린 아이의 숨소리와 호흡 양상 변화. 먹는 양과 활력 등 일상 상태가 판단 근거",
  },
  {
    id: "pneumonia", name: "소아폐렴", cat: "호흡기",
    compareWith: "모세기관지염",
    desc: "기침과 열이 이어지는 경과. 진찰 소견과 필요한 영상 확인이 판단의 출발점",
  },

  // ── 알레르기·피부 (disease 2) ──
  {
    id: "atopy", name: "아토피피부염", cat: "알레르기·피부",
    compareWith: "소아두드러기",
    desc: "피부 건조와 가려움이 반복해 이어지는 상태. 부위·시기 기록과 관리 방식이 판단 축",
  },
  {
    id: "urticaria", name: "소아두드러기", cat: "알레르기·피부",
    compareWith: "아토피피부염",
    desc: "피부 반응이 갑자기 올라왔다 가라앉는 흐름. 유발 상황과 지속 시간이 확인의 출발점",
  },

  // ── 소화기 (disease 2) ──
  {
    id: "gastroenteritis", name: "소아장염", cat: "소화기",
    compareWith: "수족구병",
    desc: "구토·설사가 이어지는 경과. 물과 음식을 받아들이는 정도와 활력이 판단 근거",
  },
  {
    id: "constipation", name: "소아변비", cat: "소화기",
    compareWith: "소아장염",
    desc: "배변 간격이 벌어지고 힘들어하는 상태. 배변을 피하게 된 흐름이 함께 확인됨",
  },

  // ── 감염·성장 (disease 2) ──
  {
    id: "hfmd", name: "수족구병", cat: "감염·성장",
    compareWith: "소아장염",
    desc: "입 안과 손발에 반응이 나타나는 경과. 먹고 마시는 정도와 단체 생활 복귀 시점이 확인 축",
  },
  {
    id: "precocious_puberty", name: "성조숙증", cat: "감염·성장",
    compareWith: "소아성장검사",
    desc: "또래보다 이른 시기의 몸의 변화. 성장 기록·뼈 나이·관련 수치를 함께 확인",
  },
];

export default PEDIATRICS_V2_TREATMENTS;
