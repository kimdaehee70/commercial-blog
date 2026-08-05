// ╔══════════════════════════════════════════════════════════╗
// ║ ent-v2-data.js — 이비인후과 V2 Purpose                     ║
// ║ ⚠ v1 lib/ent-data.js (ENT_TREATMENTS) 무손상 · FREEZE 유지 ║
// ║ 14종: exam 4 / disease 10 · cat 5계열                      ║
// ║ 핵심 철학: 귀·코·목 증상 → 검사 → 치료 판단                ║
// ║ 경계: 갑상선 제외(endo SoT) / 비중격만곡 = 기능 개선만      ║
// ║       수면무호흡 = 검사·판단까지 / 어지럼증 = 전정기관 축   ║
// ║ ⚠ 관측 전. FREEZE 아님.                                   ║
// ╚══════════════════════════════════════════════════════════╝

export const ENT_V2_META = {
  industry: "ent",
  name: "이비인후과",
  bizWord: "이비인후과",
  deptWord: "이비인후과",
};

export const ENT_V2_CATS = [
  "검사",
  "귀질환",
  "코질환",
  "목질환",
  "어지럼",
];

// t.compareWith = 4섹션 비교 대상 (결정 기준 축에서만 사용)
export const ENT_V2_TREATMENTS = [
  // ── 검사 (exam 4) ──
  {
    id: "hearing_test", name: "청력검사", cat: "검사",
    compareWith: "귀 내시경 진찰",
    desc: "소리가 어느 구간에서 어느 정도 들리는지를 주파수별로 확인하는 검사",
  },
  {
    id: "nasal_endo", name: "비내시경", cat: "검사",
    compareWith: "부비동 영상검사",
    desc: "콧속 점막·비중격·부비동 입구 상태를 직접 확인하는 검사",
  },
  {
    id: "laryngo_endo", name: "후두내시경", cat: "검사",
    compareWith: "비내시경",
    desc: "목 안쪽과 성대의 상태·움직임을 직접 확인하는 검사",
  },
  {
    id: "psg", name: "수면다원검사", cat: "검사",
    compareWith: "간이 수면검사",
    desc: "수면 중 호흡·산소포화도·수면 단계를 하룻밤 동안 함께 기록하는 검사",
  },

  // ── 귀질환 (disease 3) ──
  {
    id: "otitis", name: "중이염", cat: "귀질환",
    compareWith: "외이도염",
    desc: "고막 안쪽 공간의 염증. 고막 상태와 청력 확인이 판단 근거",
  },
  {
    id: "tinnitus", name: "이명", cat: "귀질환",
    compareWith: "돌발성난청",
    desc: "외부 소리 없이 들리는 소리. 청력 확인과 원인 범위 확인이 축",
  },
  {
    id: "sudden_hearing", name: "돌발성난청", cat: "귀질환",
    compareWith: "이명",
    desc: "짧은 기간에 확인되는 청력 저하. 청력검사 소견과 경과 확인이 축",
  },

  // ── 코질환 (disease 4) ──
  {
    id: "rhinitis", name: "알레르기비염", cat: "코질환",
    compareWith: "감기 후 코막힘",
    desc: "코 점막의 알레르기 반응. 유발 요인 확인과 반복 양상이 판단 근거",
  },
  {
    id: "sinusitis", name: "축농증", cat: "코질환",
    compareWith: "알레르기비염",
    desc: "부비동의 염증. 내시경·영상 소견과 증상 지속 기간이 판단 근거",
  },
  {
    id: "septum", name: "비중격만곡증", cat: "코질환",
    compareWith: "알레르기비염",
    desc: "콧속 중간 벽의 휘어짐. 코막힘 등 기능 문제 여부가 판단 축",
  },
  {
    id: "snoring", name: "코골이·수면무호흡", cat: "코질환",
    compareWith: "단순 코골이",
    desc: "수면 중 기도 좁아짐. 수면검사 기록과 주간 증상이 판단 근거",
  },

  // ── 목질환 (disease 2) ──
  {
    id: "tonsillitis", name: "편도염", cat: "목질환",
    compareWith: "인후두역류",
    desc: "편도의 염증. 반복 빈도와 일상 지장 정도가 판단 축",
  },
  {
    id: "lpr", name: "인후두역류", cat: "목질환",
    compareWith: "편도염",
    desc: "위 내용물의 역류로 인한 목 증상. 후두 소견과 증상 양상이 판단 근거",
  },

  // ── 어지럼 (disease 1) ──
  {
    id: "vertigo", name: "어지럼증", cat: "어지럼",
    compareWith: "기립성 어지럼",
    desc: "귀 안쪽 평형기관 원인 여부를 먼저 가르는 것이 축",
  },
];

export default ENT_V2_TREATMENTS;
