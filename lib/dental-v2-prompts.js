// ============================================================
// dental-v2-prompts.js — 치과 정보형 V2 (완전 독립)
// ⚠️ clinic / derma / ortho / ent / oriental / neuro / pain 절대 참조 금지
// [V2 전환] 설명형/상담안내형 → Purpose 정보형. 검사·치료를 '사용자 의사결정 수단'으로 종속.
//   Purpose 7섹션 (병원군 Reference Spine = ortho-v2 동일):
//   concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//   개인 후기·1인칭·시간축(D+1/1주/1개월/3개월)·비용/횟수 단정·효과 단정·CTA 전면 제거.
//   DENTAL_DIRECTION(치료 방향 데이터)은 치과 전용 자산 — 문맥 힌트로만 사용.
// [화이트리스트 없음] 치과 전 치료(19종) — ortho-v2 방침 동일.
// ------------------------------------------------------------
// 복사한 것: 구조(Spine) · 제약 · 흐름 · DIRECTION 소비 방식
// 복사하지 않은 것: 판단 내용 · 용어 · Direction (전부 치과 자립)
// ============================================================

// [Purpose 데이터] concern/effect/hook/keyword/compare = 기존 문맥 힌트.
// diagnosisFocus/treatmentDecision/hospitalPoint = 치료별 '판단 기준' (섹션3·4·5가 직접 소비).
//   - diagnosisFocus: ③검사에서 "먼저 무엇을 판단하는가" — 이 치료의 핵심 판단축(공통 템플릿 탈피).
//   - treatmentDecision: ④치료에서 "어떤 상태·기준을 보고 방향이 갈리는가" — 설명형→판단형 전환.
//   - hospitalPoint: ⑤치과 선택에서 이 치료 특유의 확인 포인트.
const DENTAL_DIRECTION = {
  // ── 보철·수복 ──
  implant:        { concern: "치아가 빠진 채로 한쪽으로만 씹게 돼서", effect: "저작 기능 관점, 인접치·잇몸뼈 관점, 식립 가능 여부 관점", hook: "빠진 치아를 오래 방치해 씹기가 불편해진 상황", keyword: "임플란트", compare: "브릿지·틀니",
    diagnosisFocus: "잇몸뼈가 식립을 견딜 만큼 남아 있는지와 인접 치아·신경 위치. 치아가 빠진 기간이 길수록 뼈가 줄어들 수 있어, 뼈 양이 핵심 판단축",
    treatmentDecision: "잇몸뼈 양, 빠진 치아 개수와 위치, 인접 치아 상태를 본다. 뼈가 충분하면 식립을 바로 검토하고, 뼈가 부족하면 뼈 이식 병행 여부나 브릿지·틀니를 함께 판단",
    hospitalPoint: "3차원 영상으로 뼈 양과 신경 위치를 확인하는지, 뼈 이식이 필요한 경우 그 기준을 미리 설명하는지" },
  denture:        { concern: "여러 개가 빠져 식사와 발음이 함께 불편해서", effect: "저작·발음 관점, 잇몸 지지 관점, 착용 적응 관점", hook: "남은 치아가 적어 씹는 것이 어려워진 상황", keyword: "틀니", compare: "임플란트",
    diagnosisFocus: "남아 있는 치아 개수와 잇몸이 틀니를 지지할 수 있는 상태인지. 빠진 개수보다 남은 치아와 잇몸의 지지력이 핵심 판단축",
    treatmentDecision: "남은 치아 수, 잇몸 상태, 잇몸뼈 흡수 정도를 본다. 지지 조건이 되면 부분·완전 틀니를 검토하고, 고정성이 필요하면 임플란트 병행을 함께 판단",
    hospitalPoint: "잇몸 상태와 남은 치아를 함께 보는지, 착용 후 조정 과정을 안내하는지" },
  zirconia:       { concern: "신경치료한 치아가 깨질까 걱정돼서", effect: "치아 강도 관점, 잔존 치질 관점, 씹는 힘 분산 관점", hook: "신경치료 뒤 보철을 어떻게 씌울지 정해야 하는 상황", keyword: "지르코니아크라운", compare: "올세라믹크라운",
    diagnosisFocus: "치아에 남아 있는 조직(잔존 치질) 양과 씹는 힘이 크게 걸리는 부위인지. 심미보다 강도가 필요한 자리인지가 핵심 판단축",
    treatmentDecision: "치아 위치(앞니·어금니), 잔존 치질 양, 이갈이·악무는 습관 유무를 본다. 씹는 힘이 큰 어금니는 강도를 우선 보고, 앞니는 색·투명도를 함께 판단",
    hospitalPoint: "치아 위치와 씹는 힘을 고려해 재료를 나눠 설명하는지, 이갈이 습관을 확인하는지" },
  ceramic_crown:  { concern: "앞니 보철이 티가 날까 신경 쓰여서", effect: "색·투명도 관점, 인접치 조화 관점, 잇몸 라인 관점", hook: "앞니 보철의 자연스러움이 중요한 상황", keyword: "올세라믹크라운", compare: "지르코니아크라운",
    diagnosisFocus: "옆 치아의 색·투명도와 잇몸 라인의 높낮이. 강도보다 인접 치아와의 조화가 핵심 판단축",
    treatmentDecision: "치아 위치, 인접 치아 색, 잇몸 라인, 씹는 힘이 걸리는 정도를 본다. 앞니처럼 심미가 중요하면 투명도를 우선 보고, 힘이 크게 걸리면 강도를 함께 판단",
    hospitalPoint: "인접 치아 색을 맞추는 과정이 있는지, 잇몸 라인까지 함께 보는지" },
  inlay:          { concern: "충치가 깊은데 크라운까지는 부담스러워서", effect: "충치 깊이 관점, 잔존 치질 관점, 수복 범위 관점", hook: "충치 범위가 커서 때우는 것으로 될지 애매한 상황", keyword: "인레이·온레이", compare: "레진치료·크라운",
    diagnosisFocus: "충치가 신경에 얼마나 가까운지와 남은 치아 벽의 두께. 충치의 넓이보다 깊이와 잔존 벽이 핵심 판단축",
    treatmentDecision: "충치 깊이, 남은 치아 벽의 양, 씹는 힘이 걸리는 부위인지를 본다. 벽이 충분하면 부분 수복을 검토하고, 벽이 얇거나 깨질 우려가 있으면 크라운을 함께 판단",
    hospitalPoint: "충치 깊이를 영상으로 확인하는지, 레진·인레이·크라운의 구분 기준을 설명하는지" },
  resin:          { concern: "검진에서 작은 충치가 보인다고 들어서", effect: "충치 범위 관점, 자연치 보존 관점, 1회 치료 가능 여부 관점", hook: "충치를 초기에 발견해 빨리 정리하고 싶은 상황", keyword: "레진치료", compare: "인레이",
    diagnosisFocus: "충치 범위가 한 번에 메울 수 있는 크기인지와 신경까지의 거리. 초기 충치라도 깊이에 따라 방법이 달라지는 것이 핵심 판단축",
    treatmentDecision: "충치의 크기와 깊이, 위치(앞니·어금니)를 본다. 범위가 작으면 당일 수복을 검토하고, 넓거나 깊으면 인레이·크라운을 함께 판단",
    hospitalPoint: "충치 범위를 확대해 확인하는지, 지금 치료할 단계인지 경과를 볼 단계인지 구분해 설명하는지" },

  // ── 신경·외과 ──
  rootcanal:      { concern: "찬물에 시리고 밤에 욱신거려서", effect: "신경 염증 관점, 치아 보존 가능 여부 관점, 통증 양상 관점", hook: "가만히 있어도 치아가 욱신거리는 상황", keyword: "신경치료", compare: "발치",
    diagnosisFocus: "신경에 염증이 어디까지 진행했는지와 치아를 살릴 수 있는 상태인지. 시린 정도보다 가만히 있을 때의 통증과 뿌리 끝 염증이 핵심 판단축",
    treatmentDecision: "통증 양상(자극 시 시림인지, 가만히 있어도 욱신거리는지), 뿌리 끝 염증 유무, 남은 치아 조직을 본다. 살릴 수 있으면 보존을 우선 보고, 뿌리가 갈라지거나 조직이 거의 없으면 발치를 함께 판단",
    hospitalPoint: "뿌리 끝 염증을 영상으로 확인하는지, 치료 후 보철까지의 흐름을 함께 안내하는지" },
  wisdom:         { concern: "사랑니 쪽이 자꾸 붓고 음식이 껴서", effect: "매복 방향 관점, 인접치·신경 근접 관점, 발치 난이도 관점", hook: "사랑니 부위가 반복해서 붓는 상황", keyword: "사랑니발치", compare: "경과 관찰",
    diagnosisFocus: "사랑니가 누워 있는 방향과 아래턱 신경관까지의 거리, 앞 어금니를 밀고 있는지. 통증보다 매복 방향과 신경 근접도가 핵심 판단축",
    treatmentDecision: "매복 방향, 신경관과의 거리, 염증이 반복되는지, 앞 치아에 영향을 주는지를 본다. 염증이 반복되거나 인접치를 밀면 발치를 검토하고, 위치가 안정적이면 경과 관찰을 함께 판단",
    hospitalPoint: "3차원 영상으로 신경관과의 거리를 확인하는지, 발치 난이도와 주의사항을 미리 설명하는지" },
  implant_redo:   { concern: "예전에 한 임플란트가 흔들리거나 잇몸이 부어서", effect: "주위염 관점, 잔존 뼈 관점, 재식립 가능 여부 관점", hook: "이전 임플란트에 문제가 생겨 다시 알아보는 상황", keyword: "임플란트재수술", compare: "제거 후 경과 관찰",
    diagnosisFocus: "임플란트 주위 뼈가 얼마나 녹았는지와 염증 범위. 흔들림 자체보다 남은 뼈 양과 주위 염증이 핵심 판단축",
    treatmentDecision: "주위 뼈 소실 정도, 염증 범위, 제거 후 남을 뼈 양을 본다. 뼈가 남아 있으면 제거 후 재식립을 검토하고, 소실이 크면 뼈 이식 병행이나 다른 수복을 함께 판단",
    hospitalPoint: "이전 식립 상태와 뼈 소실을 영상으로 비교하는지, 재식립까지의 대기 기간을 함께 안내하는지" },

  // ── 잇몸 ──
  scaling:        { concern: "양치할 때 피가 나고 입 냄새가 신경 쓰여서", effect: "치석 침착 관점, 잇몸 염증 관점, 정기 관리 주기 관점", hook: "잇몸에서 피가 나는 것이 반복되는 상황", keyword: "스케일링", compare: "잇몸치료",
    diagnosisFocus: "치석이 잇몸선 위에 있는지 아래까지 내려갔는지와 잇몸 출혈 범위. 치석의 양보다 위치(잇몸 위·아래)가 핵심 판단축",
    treatmentDecision: "치석 위치, 잇몸 출혈·부기 범위, 잇몸뼈 소실 여부를 본다. 잇몸선 위 치석이면 정기 관리로 보고, 잇몸 속 치석이나 뼈 소실이 있으면 잇몸치료를 함께 판단",
    hospitalPoint: "잇몸 깊이를 재어 보는지, 정기 관리 주기를 상태에 맞춰 안내하는지" },
  periodontal:    { concern: "잇몸이 자주 붓고 치아가 흔들리는 느낌이 있어서", effect: "잇몸뼈 소실 관점, 치주낭 깊이 관점, 치아 보존 가능 여부 관점", hook: "잇몸이 내려가고 치아가 길어 보이는 상황", keyword: "잇몸치료", compare: "스케일링",
    diagnosisFocus: "잇몸 속 주머니(치주낭) 깊이와 잇몸뼈가 녹은 정도. 잇몸이 붓는 것보다 뼈 소실이 얼마나 진행했는지가 핵심 판단축",
    treatmentDecision: "치주낭 깊이, 잇몸뼈 소실 정도, 치아 흔들림을 본다. 초·중기면 잇몸 속 치석 제거를 우선 보고, 뼈 소실이 크고 흔들림이 심하면 잇몸 수술이나 발치를 함께 판단",
    hospitalPoint: "치주낭 깊이를 부위별로 측정하는지, 치료 후 유지 관리 주기를 함께 계획하는지" },
  gum_contour:    { concern: "웃을 때 잇몸이 많이 보여 치아가 짧아 보여서", effect: "잇몸 라인 관점, 치관 노출 길이 관점, 잇몸뼈 위치 관점", hook: "웃을 때 잇몸이 도드라져 보이는 상황", keyword: "잇몸성형", compare: "라미네이트",
    diagnosisFocus: "잇몸이 덮은 정도인지, 잇몸뼈 자체가 높이 있는지, 윗입술이 많이 올라가는지. 원인이 잇몸인지 뼈인지 입술인지 감별이 핵심 판단축",
    treatmentDecision: "잇몸 노출 원인, 치아가 실제로 짧은지, 잇몸뼈 높이를 본다. 잇몸만 덮은 경우는 잇몸 라인 조정을 검토하고, 뼈 위치나 치아 길이가 원인이면 다른 방법을 함께 판단",
    hospitalPoint: "잇몸 노출의 원인을 감별해 설명하는지, 치아 길이와 잇몸 라인을 함께 보는지" },

  // ── 교정 ──
  braces:         { concern: "치아 배열이 신경 쓰이는데 장치가 보이는 게 부담스러워서", effect: "부정교합 정도 관점, 장치 적용 범위 관점, 착용 협조도 관점", hook: "교정은 필요한데 외관이 걱정되는 상황", keyword: "투명교정", compare: "일반교정",
    diagnosisFocus: "치아가 틀어진 정도가 투명 장치로 움직일 수 있는 범위인지와 하루 착용 시간을 지킬 수 있는지. 외관보다 적용 범위와 착용 협조도가 핵심 판단축",
    treatmentDecision: "부정교합 정도, 발치가 필요한지, 하루 착용 시간을 지킬 수 있는지를 본다. 범위 안이면 투명 장치를 검토하고, 이동량이 크거나 복잡하면 고정식 장치를 함께 판단",
    hospitalPoint: "투명 장치로 가능한 범위를 미리 구분해 설명하는지, 착용 시간과 점검 주기를 함께 안내하는지" },
  metal_braces:   { concern: "치아가 많이 틀어져 본격적으로 교정해야 할 것 같아서", effect: "부정교합 유형 관점, 발치 여부 관점, 교정 기간 관점", hook: "치아 배열이 심하게 틀어진 상황", keyword: "일반교정", compare: "투명교정",
    diagnosisFocus: "위·아래 턱 관계와 치아를 배열할 공간이 있는지. 앞니가 튀어나온 정도보다 공간 부족과 교합 관계가 핵심 판단축",
    treatmentDecision: "부정교합 유형, 배열 공간 부족 정도, 발치 필요 여부를 본다. 공간이 있으면 비발치를 우선 보고, 공간이 크게 부족하면 발치 교정을 함께 판단",
    hospitalPoint: "교합 관계와 공간 부족을 함께 진단하는지, 발치 여부의 기준을 미리 설명하는지" },
  lingual_braces: { concern: "교정은 필요하지만 장치가 보이는 게 신경 쓰여서", effect: "장치 부착 위치 관점, 적용 범위 관점, 적응 기간 관점", hook: "직업·대인 관계상 장치 노출이 부담되는 상황", keyword: "설측교정", compare: "투명교정",
    diagnosisFocus: "치아 안쪽 면에 장치를 붙일 공간이 되는지와 교정 이동량이 큰지. 노출 여부보다 안쪽 부착 조건이 핵심 판단축",
    treatmentDecision: "부정교합 정도, 치아 안쪽 형태, 발음·혀 적응 부담을 본다. 조건이 맞으면 안쪽 부착을 검토하고, 이동량이 크거나 적응이 어려우면 다른 장치를 함께 판단",
    hospitalPoint: "안쪽 부착이 가능한 조건인지 먼저 평가하는지, 초기 적응 과정을 미리 안내하는지" },

  // ── 심미 ──
  whitening:      { concern: "치아 색이 예전보다 어두워 보여서", effect: "착색 원인 관점, 시린 증상 관점, 기존 보철물 관점", hook: "웃을 때 치아 색이 신경 쓰이는 상황", keyword: "치아미백", compare: "라미네이트",
    diagnosisFocus: "색 변화가 표면 착색인지 치아 안쪽 변색인지, 그리고 앞니에 기존 보철물이 있는지. 모든 변색이 같은 원인이 아니라는 점이 핵심 판단축 — 보철물은 색이 함께 변하지 않습니다",
    treatmentDecision: "착색이 표면인지 내부인지, 앞니에 크라운·레진 등 기존 수복물이 있는지, 평소 시린 증상이 있는지를 본다. 표면 착색이고 자연치 위주면 미백을 검토하고, 내부 변색이거나 보철물이 섞여 있으면 라미네이트·보철 교체를 함께 판단",
    hospitalPoint: "변색 원인을 표면·내부로 나눠 확인하는지, 기존 보철물과 색이 맞지 않을 수 있다는 점을 미리 설명하는지, 시린 증상이 있을 때의 조절 방법을 안내하는지" },
  laminate:       { concern: "앞니 모양·색이 신경 쓰여 웃을 때 가리게 돼서", effect: "치아 삭제량 관점, 배열·색 동시 개선 관점, 원래 치아 상태 관점", hook: "앞니 모양과 색이 함께 신경 쓰이는 상황", keyword: "라미네이트", compare: "치아미백·교정",
    diagnosisFocus: "고민이 색만인지 모양·배열까지인지, 그리고 자연치를 얼마나 깎게 되는지. 색만의 문제라면 다른 방법이 먼저일 수 있어 원인 구분이 핵심 판단축",
    treatmentDecision: "색·모양·배열 중 무엇이 주된 고민인지, 치아 삭제 범위, 이갈이 습관을 본다. 색만이면 미백을, 배열이 크면 교정을 먼저 보고, 모양·색을 함께 바꿔야 하면 라미네이트를 판단",
    hospitalPoint: "미백·교정으로 해결 가능한 경우를 먼저 구분해 주는지, 치아 삭제량을 미리 설명하는지" },

  // ── 소아·기능 ──
  pedo_caries:    { concern: "아이가 치과를 무서워하는데 충치가 보여서", effect: "유치 충치 진행 관점, 영구치 영향 관점, 아이 협조도 관점", hook: "아이 충치를 발견했는데 치료를 겁내는 상황", keyword: "소아충치치료", compare: "경과 관찰",
    diagnosisFocus: "충치가 신경까지 갔는지와 그 유치가 빠질 시기가 가까운지, 아이가 앉아서 협조할 수 있는지. 어른 충치와 달리 교체 시기와 협조도가 핵심 판단축",
    treatmentDecision: "충치 깊이, 해당 유치의 잔여 사용 기간, 아이의 협조 정도를 본다. 얕고 협조가 되면 당일 수복을 검토하고, 깊거나 협조가 어려우면 단계적 접근을 함께 판단",
    hospitalPoint: "유치의 교체 시기를 함께 보는지, 아이의 협조 정도에 맞춘 진행 방식을 설명하는지" },
  tmj:            { concern: "입을 벌릴 때 턱에서 소리가 나고 아파서", effect: "관절 소리·통증 관점, 개구 범위 관점, 이갈이·습관 관점", hook: "하품이나 식사 때 턱이 걸리는 느낌이 있는 상황", keyword: "턱관절치료", compare: "경과 관찰·생활 관리",
    diagnosisFocus: "입이 얼마나 벌어지는지(개구 범위)와 소리만 나는지 통증·걸림이 함께 있는지, 이갈이·이 악물기 습관이 있는지. 소리 자체보다 통증과 개구 제한이 핵심 판단축",
    treatmentDecision: "개구 범위 제한, 통증 정도, 이갈이·자세 습관을 본다. 소리만 있고 통증이 없으면 생활 관리를 우선 보고, 통증이나 걸림이 일상을 제한하면 장치·추가 치료를 함께 판단",
    hospitalPoint: "개구 범위를 실제로 측정하는지, 이갈이·습관 등 생활 요인을 함께 확인하는지" },
};

/** 치료 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return DENTAL_DIRECTION[treatmentId] || {
    concern: "치아·잇몸 불편이 이어져서",
    effect:  "치아 상태·구강 구조 관점",
    hook:    "치아·잇몸 불편으로 일상이 신경 쓰이는 상황",
    keyword: "치과 치료",
    compare: "다른 치료",
    diagnosisFocus: "현재 치아·잇몸 상태와 원인이 무엇인지",
    treatmentDecision: "치아·잇몸 상태와 일상 불편 정도를 함께 보고 방향을 정한다",
    hospitalPoint: "영상과 구강 검진을 함께 보고 치료 기준을 설명하는지",
  };
}

// [호환 유지] v2 핸들러가 쓰던 getDentalV2Direction 이름 유지 (내부는 신 구조)
export function getDentalV2Direction(treatmentId) {
  return getDirection(treatmentId);
}

// ── 병원형 공통 금지 (의료광고법 + PHILOSOPHY 정합) ──
export const DENTAL_V2_FORBIDDEN = [
  // 환자 1인칭 후기 (병원 화자 위반)
  '저는', '제가', '받아봤', '받았어요', '고민했어요', '추천드려요', '강추',
  // 광고 단정 (의료광고법)
  '최고', '가장 좋은', '1위', '완벽', '보장', '무조건', '확실히 낫', '부작용 없',
  // 효능 과장
  '평생', '영구적으로', '100%', '반드시 성공',
  // AI 논문형
  '결론적으로', '정리하면', '살펴보겠습니다', '체계적인 접근',
];

// ── 시스템 프롬프트 (ortho-v2 Spine · 치과 어휘) ──
export const DENTAL_SYSTEM_PROMPT_V2 = `당신은 치과 치료 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 치료 정보 안내"입니다.
- 1인칭 체험(저는/제가/받아봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(나았다/좋아졌다/완치). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·유지 기간·치료 횟수 단정 금지. "개인 구강 상태에 따라 다르며 상담 시 안내" 수준.
- 개인 타임라인(D+1/1주/1개월/3개월 경과·회복일지·통증 점수 변화) 금지.
- 병원·원장 평가·추천·CTA(상담 받아보세요) 금지. 매장명(치과명) 본문 노출 금지.
- 원장·의사 발화 인용("~라고 하셨어요") 금지.
- 실비·가격 언급 금지(환자 유인 표현).
- 의료광고법 준수: 효능·효과 보장 표현 금지.
[Purpose 원칙] 이 글의 목적은 '많이 설명하는 것'이 아니라 '사용자가 빨리 판단하도록 돕는 것'이다. 각 섹션은 검사·치료를 나열·해설하기보다 '무엇을 판단하기 위한 것인지'를 먼저 밝힌다.
[가독성 원칙] 문단당 2~3문장, 한 문장 40~70자 내외로 짧게. 만연체·긴 문단 금지. "예를 들어/또한/이러한" 등 접속 표현 남발 금지.
[문체 통일 — 필수] 모든 문장의 종결어미는 "~습니다 / ~됩니다 / ~있습니다" 존댓말체로 통일한다. "~된다 / ~한다 / ~이다 / ~중요하다" 같은 '-다'체를 절대 섞지 말 것.
[나열 제약] 검사 종류는 한 번에 최대 2개, 치료 종류는 최대 2개까지만. 치료법은 '기준에 종속된 예시'로만 짧게 스치고, 가능하면 "먼저 보는 방향 / 다른 방향을 함께 보는 조건"이라는 판단 흐름만으로 끝낸다. 같은 내용을 반복 설명하지 말 것.
[반복 억제 — 필수] "상담 후 확인하시기 바랍니다 / 정확한 사항은 치과 상담 시 / 개인 구강 상태에 따라 다를 수 있습니다" 계열의 마무리 유보 문장은 글 전체에서 최대 2회까지만. 매 문단 끝에 붙이지 말 것.
[한의·비치과 금지] 한방·한의 치료, 성형외과·피부과 시술은 다루지 않는다.`;

// 하위호환 별칭 (핸들러가 buildDentalV2SystemPrompt 로 부름)
export function buildDentalV2SystemPrompt({ region, hospital, subKw, speakerIntro }) {
  return `${DENTAL_SYSTEM_PROMPT_V2}
[화자 규칙 — 의료법 §56① 광고 주체 요건]
- 도입 첫 문장 고정(글자 그대로 사용): "${speakerIntro}"
- 1인칭은 '의료기관/대표원장'으로만. 환자 1인칭 전면 금지.
- 지역: ${region} | 치료: ${subKw}
- 지역+키워드 결합은 글 전체 3회 이하.`;
}

// ============================================================
// [D-4-5b] storeFacts → 프롬프트 사실 블록 (V2)
// ------------------------------------------------------------
//   입력 = consumeStoreProfile View의 promptBody 배열 [{slot,value,meta}].
//   역할 = 본문 '판단 보조 사실'. 하단 방문정보 블록과 표현 차등 —
//          항목 나열이 아니라 문장 흐름 안에서 1회만 소화하도록 지시.
//   빈 배열/미전달 → "" 반환 → 기존 프롬프트 100% 보존(부작용 0).
//   소비 섹션 = checkPoint / sceneVisit 2곳만. 그 외 미주입.
// ============================================================
const _SF_LABEL_V2 = { business_hours: "진료시간", transit: "대중교통 접근", parking_ops: "주차 운영" };
// 섹션별 역할 분담 — 같은 사실이 두 섹션에 중복되지 않도록 소비 슬롯을 나눈다.
//   checkPoint : 치과를 '고르는' 판단 기준 축 → 접근성(transit)
//   sceneVisit : 처음 '방문하는' 준비 행동 축 → 일정(business_hours) · 자가용(parking_ops)
const _SF_SECTION_SLOTS = {
  checkPoint: ["transit"],
  sceneVisit: ["business_hours", "parking_ops"],
};
// 슬롯별 '행동' 연결 지시 — 정보 나열이 아니라 방문자의 행동으로 서술시킨다.
const _SF_ACTION_V2 = {
  business_hours: "방문 전 일정을 맞추는 행동으로 연결(예: 방문 전 진료 가능한 요일·시간을 확인해 두는 흐름)",
  parking_ops:    "자가용 방문을 준비하는 행동으로 연결(예: 차로 올 경우 주차를 어떻게 하는지)",
  transit:        "찾아오는 경로를 가늠하는 행동으로 연결(예: 대중교통으로 어떻게 닿는지)",
};
function buildStoreFactsBlockV2(storeFacts, section) {
  const allow = _SF_SECTION_SLOTS[section];
  if (!allow) return "";
  const list = Array.isArray(storeFacts) ? storeFacts : [];
  const picked = list.filter(it =>
    it && it.slot && allow.includes(it.slot) && _SF_LABEL_V2[it.slot] && String(it.value || "").trim());
  if (picked.length === 0) return "";
  const lines = picked.map(it =>
    `- ${_SF_LABEL_V2[it.slot]}: ${String(it.value).trim()}  → ${_SF_ACTION_V2[it.slot]}`);
  return `
[실제 운영 사실 — 아래 값만 사용. 없는 정보 생성 금지]
${lines.join("\n")}
[사용 규칙 — 행동 중심]
- 핵심 원칙: 방문정보를 '정보'로 넣지 말고 '방문 준비 행동'으로 넣는다.
  ❌ "진료시간은 ~입니다. 주차는 ~입니다." (나열)
  ⭕ "방문 전 진료 가능한 시간을 확인해 두면 당일 일정을 잡기 수월합니다." (행동)
- 위 화살표(→)의 행동 맥락에 맞춰 앞 문장 흐름에 이어 붙인다. 단독 문단으로 떼어 놓지 말 것.
- 이 섹션에 배정된 항목만 쓴다. 다른 항목(위에 없는 것)은 이 섹션에서 언급하지 않는다.
- [메타 언급 금지] 값이 주어지지 않은 항목을 "별도로 확인 가능합니다 / 문의 바랍니다"처럼 언급하지 말 것. 없는 항목은 아예 쓰지 않는다.
- 값에 없는 시간·주차·교통 정보를 추정해 쓰지 말 것. 최대 1~2문장.
- [상세도 제한] 값을 통째로 옮기지 말 것. 출구 번호·정류장명·도보 분수 같은 세부는 글 하단 「찾아오시는 길」 담당이다.
  본문은 역·지역 수준으로만 요약한다. (❌ "1호선 제기동역 2번 출구에서 도보 5분, 청량리역에서 도보 8분"
  ⭕ "제기동역이나 청량리역에서 도보로 이동할 수 있어 처음 방문에도 찾기 어렵지 않습니다")
  진료시간·주차도 같은 원칙 — 요일·시간표 전체를 나열하지 말고 행동에 필요한 만큼만.
- 광고성 유도(방문 권유·강조·"편리합니다" 같은 편의성 평가) 금지. 사실과 행동만.`;
}

export function buildDentalPromptV2(section, treatment, region, mode, storeFacts) {
  const name    = treatment.name;
  const dir     = getDirection(treatment.id);
  const compare = dir.compare || treatment.compareWith || "다른 치료";

  const isSurgery = /발치|임플란트|재수술|수술|성형/.test(name);
  const surgeryGuide = isSurgery
    ? `\n[외과적 치료 주의] 마취·회복·주의사항은 일반 정보로만 안내. 안전·성공 단정 금지. 개인 구강 상태·경과에 따라 다름을 명시.`
    : "";

  const isEsthetic = /미백|라미네이트|세라믹|잇몸성형/.test(name);
  const estheticGuide = isEsthetic
    ? `\n[심미 치료 주의 ⚠️] "밝아짐/하얘짐/자신감/이미지 개선" 등 결과·효과 단정 절대 금지. 유지 기간·회차 단정 금지. 개인차가 있으며 상담 시 안내 수준의 일반 정보로만 서술. 외모 평가·자존감 자극 표현 금지.`
    : "";

  const isOrtho = /교정/.test(name);
  const orthoGuide = isOrtho
    ? `\n[교정 주의] 총 기간·장치 개수·발치 여부 단정 금지. "개인 부정교합 유형에 따라 다르며 진단 후 안내" 수준.`
    : "";

  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/받아봤어요/느꼈어요/좋아졌어요/나았어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한/경험 많은"
"원장님이 ~라고 하셨/설명해 주셨"(발화 인용) 금지
"D+1/1주차/1개월차/3개월차/시술 후 첫날" 등 개인 타임라인·수치 변화
"OO만원/실비 적용" 등 비용·환자유인 표현
[V2 정보형 추가 금지 — 주관·광고성 표현]
"자신감 있는 미소/밝고 깨끗한 이미지"(심미 효과 암시) → "색·모양의 변화에 대해 살피는 치료입니다"
"체감되는 부분이었다"(주관) → "일반적으로 살피는 요소입니다"
"최적의/최선의/맞춤형 접근"(광고성) → "개인 구강 상태에 따른 접근"
[유보 문장 반복 금지] "정확한 사항은 상담받고 나서 확인하시기 바랍니다" 계열을 매 문단 끝에 붙이지 말 것. 이 섹션에서는 최대 1회.
[접속사·군더더기 남발 금지] "예를 들어 / 또한 / 이러한 / 이와 같이 / 뿐만 아니라"를 습관적으로 반복하지 말 것.
- 이 글은 후기가 아니라 일반 치료 정보 안내다. 객관적·설명형으로 서술.`;

  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 "이 치료/해당 치료/진료" 등으로 대체. 3회 이상 금지.`;
  const grammarGuide = `\n[조사 오류 금지] "${name}을/이/를/가" 직접 연결 금지. 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  const readabilityGuide = `\n[가독성 — 필수] 문단당 2~3문장. 한 문장은 40~70자 내외. 긴 문단·만연체 금지.\n[문체 — 필수] 모든 문장을 "~습니다/~됩니다/~있습니다" 존댓말체로 끝낸다. '-다'체를 한 문장도 섞지 말 것.`;
  const purposeGuide = `\n[Purpose — 목적] 이 글의 목적은 '설명'이 아니라 '사용자의 결정을 돕는 것'이다. 각 섹션 첫 문장은 그 섹션 제목(질문)에 바로 답하는 문장으로 시작한다. 검사·치료 용어를 나열하기 전에 '무엇을 판단하기 위한 것인지'를 먼저 제시.`;

  // [D-4-5b] storeFacts — checkPoint/sceneVisit 2섹션만 주입. 그 외 "" (기존 동작).
  const storeFactsBlock = buildStoreFactsBlockV2(storeFacts, section);

  const G = { name, region, compare, dir, surgeryGuide, estheticGuide, orthoGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide, storeFactsBlock };

  switch (section) {
    case 'concern':           return buildConcernPrompt(G);
    case 'visitTrigger':      return buildVisitTriggerPrompt(G);
    case 'examination':       return buildExaminationPrompt(G);
    case 'treatmentDecision': return buildTreatmentDecisionPrompt(G);
    case 'checkPoint':        return buildCheckPointPrompt(G);
    case 'sceneVisit':        return buildSceneVisitPrompt(G);
    case 'closing':           return buildClosingPrompt(G);
    default: throw new Error(`[dental-v2-prompts] 알 수 없는 섹션: ${section}`);
  }
}

// 하위호환 별칭 (핸들러 기존 호출명)
export function buildDentalV2Prompt(sectionKey, treatment, region, options = {}) {
  return buildDentalPromptV2(sectionKey, treatment, region, options?.mode, options?.storeFacts);
}

// [Purpose 프레임] 검사·치료를 '설명 중심'이 아니라 '사용자 의사결정을 돕는 수단'으로 종속시킨다.

function buildConcernPrompt({ name, region, dir, surgeryGuide, estheticGuide, orthoGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 1 — 지금 이런 상황인가요?] ⚠ 소제목(##) 출력 금지. 본문부터 바로 시작. [세션40][NOHDR-01] ${region} 지역 독자 대상, ${name} 정보를 찾는 사람이 처한 상황에 짧고 담담하게 공감.
- 이 섹션의 역할은 "공감·검색 계기"다. 길게 설명하지 말 것 — 텍스트는 짧게, 상황을 짚어 주는 정도.
- "혹시 이런 상황이신가요?"처럼 독자가 자신의 상황을 알아보게 하는 톤. 특정 개인 경험 서술 아님.
- 참고 맥락: ${dir.concern} (단정 아님, 일반 배경으로만).
- [원인 나열 금지] "커피·차·흡연 때문에 / 잘못된 양치 습관 때문에" 같은 교과서적 원인 설명으로 시작하지 말 것. 독자는 이미 자기 상황을 알고 검색했다. 원인이 아니라 '지금 겪는 불편'에서 출발한다.
- 관찰 가능한 불편(씹기·시림·통증·외관·발음 등)과 일상 제한을 2~3개 짚어 주는 수준.
- 겁주기·효과 암시·광고성 금지. 진단·치료를 여기서 설명하지 말 것(다음 섹션 역할).
- 120~180자로 짧게 (사진이 공감을 담당하므로 텍스트는 최소).${readabilityGuide}${purposeGuide}${surgeryGuide}${estheticGuide}${orthoGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitTriggerPrompt({ name, region, dir, surgeryGuide, estheticGuide, orthoGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 2 — 이럴 때 진료를 고려해볼 수 있습니다] ${name} 관련해 "언제 진료를 고려하면 좋은지" 방문 판단을 돕는 정보.
- 이 섹션의 역할은 "방문 판단"이다. 어떤 신호·지속 기간·악화 양상일 때 진료를 생각해볼 수 있는지 기준을 제시.
- "이런 경우에는 진료를 고려해볼 수 있습니다" 형식의 판단 도움 정보. 단정·강요·CTA 아님.
- 참고 맥락: ${dir.hook} (일반 배경으로만).
- 자가 관리로 지켜봐도 되는 선과 진료를 고려할 선을 구분해 주는 관점(단, 위험 과장 금지).
- 검사·치료 자체를 설명하지 말 것 — 그건 다음 섹션들 역할. 여기서는 '판단'만.
- 180~250자.${readabilityGuide}${purposeGuide}${surgeryGuide}${estheticGuide}${orthoGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, dir, surgeryGuide, estheticGuide, orthoGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 3 — 진료에서는 무엇을 확인하나요?] ${name} 진료 시 무엇을 확인하는지를, '판단 기준'을 먼저 세우고 검사를 그 뒤에 '수단'으로 종속시켜 안내.
- 이 치료의 핵심 판단 기준(반드시 반영): ${dir.diagnosisFocus}. 이 판단축을 첫 문장~둘째 문장에 녹여, 다른 치료와 구별되는 이 치료 고유의 관점으로 서술한다(공통 템플릿 문장 금지).
- 첫 문장은 '무엇을 판단하기 위해 확인하는지'로 시작한다. 예: "진료에서는 먼저 현재 상태가 이 치료를 적용할 수 있는 조건인지부터 확인합니다."
- 순서 필수: ① 위 핵심 판단 기준을 먼저 제시 → ② 그 다음 "이를 확인하기 위해 파노라마·3차원 영상, 구강 검진 등을 활용할 수 있습니다" 정도로 검사를 1~2줄만 붙인다.
- [나열 제약] 검사 종류는 최대 2개까지만 언급. 각 검사의 원리·과정을 길게 설명하지 말 것 — '무엇을 살피는지' 한 줄이면 충분.
- 검사는 원인을 확인하는 과정이며 확정 진단이 아님을 명시. 결과 해석은 진료 시 안내됨.
- 비용·검사 소요시간 단정은 다루지 않음.
- 200~300자.${readabilityGuide}${purposeGuide}${surgeryGuide}${estheticGuide}${orthoGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentDecisionPrompt({ name, region, compare, dir, surgeryGuide, estheticGuide, orthoGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 4 — 치료는 어떤 기준으로 결정되나요?] (핵심 축) ${name} 치료가 '어떤 기준으로 선택되는지' 의사결정 흐름을 안내.
- 이 치료의 결정 기준(반드시 반영): ${dir.treatmentDecision}. 이 기준을 그대로 판단축으로 삼아, 치료 방향이 갈리는 지점을 이 치료에 맞게 서술한다(치료법을 순서대로 나열·해설하지 말 것).
- 첫 문장은 '무엇을 보고 치료 방향을 정하는지'로 시작한다. 예: "치료 방향은 현재 구강 상태와 검사 결과를 함께 보고 결정됩니다."
- 순서 필수: ① 위 치료 결정 기준을 먼저 제시 → ② 그 기준에 따라 이 치료를 먼저 보는 경우와 다른 방향(${compare})을 함께 보는 경우가 어떻게 갈리는지.
- [권장 골격 — 이 형태를 기본으로 삼는다] 이 섹션의 이상적 형태는 다음 2~3문장 구조다:
  「치료 방향은 (이 치료의 핵심 판단 기준 중 대표 요소 1~2개)을(를) 종합해 결정합니다. 조건이 맞으면 이 치료를 우선 검토하며, (다른 방향을 함께 보는 조건)이 확인되는 경우에는 ${compare} 등 다른 방향도 함께 판단할 수 있습니다.」
  이 골격을 치료에 맞게 변주하되, 여기서 크게 벗어나 문장을 늘리지 말 것.
- [치료 작동 설명 금지] 각 치료가 '무엇을 하는지'(약제를 바른다·장치를 붙인다·깎아낸다 등)를 해설하지 말 것. 이 섹션은 '무슨 치료인지'가 아니라 '어떤 기준으로 무엇을 먼저 보는지'만 다룬다.
- [분량 하드 제약 — 필수 준수] 이 섹션은 5~6문장 이내로 끝낸다. 아래를 모두 지킨다:
  · 같은 판단 기준을 두 번 이상 되풀이하지 말 것 — 한 번만.
  · "상담 시 결정됩니다 / 개인 구강 상태에 따라" 류의 마무리 문장은 글 전체에서 1회만.
  · 지역명("${region}")을 이 섹션에서 다시 넣지 말 것.
  · 뜻이 겹치는 문장을 늘려 쓰지 말 것. 한 번 말한 것은 다시 말하지 않는다.
- ${name}과 "${compare}"의 구분은 '어떤 상황에 어느 쪽을 고려하는지' 한 문장 안에서 자연스럽게 스칠 때만 넣고, 억지 대비 문장을 만들지 말 것(어색하면 생략).
- 참고 방향: ${dir.effect} (효과 단정 아님, 살피는 관점으로만).
- [금지] 효과 단정("사라진다/하얘진다/빠르게 회복된다"). 비용·유지 기간·회차 단정("보통 3회/6개월 유지").
- 180~260자로 짧게(넘기지 말 것).${readabilityGuide}${purposeGuide}${surgeryGuide}${estheticGuide}${orthoGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, dir, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide, storeFactsBlock = "" }) {
  return `[섹션 5 — 치과 선택 시 확인할 점] 사용자가 치과를 판단할 때 확인하면 좋은 기준을 정리.
- 이 섹션의 역할은 "사용자 판단 기준" 제공이다.
- 이 치료 특유의 확인 포인트(반드시 1개 이상 반영): ${dir.hospitalPoint}. "전문의 여부·최신 장비·접근성" 같은 모든 치료 공통 문장만 반복하지 말고, 이 치료에 맞는 포인트를 중심에 둔다.
- [일반론 억제 — 필수] "전문의 자격 / 최신 장비 / 위치와 접근성 / 상담 시간" 같은 일반 기준은 최대 1개만 곁들인다. 이 치료 고유의 확인 포인트가 중심이어야 한다.
- 특정 병원 추천·홍보 아님. 사용자가 스스로 판단할 항목을 정리하는 형식(항목식 가능).
- 200~300자.${storeFactsBlock}${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildSceneVisitPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide, storeFactsBlock = "" }) {
  return `[섹션 6 — 진료실과 상담실에서 확인하는 과정] 진료실·상담실의 실제 장면을 그리며 방문 안내를 함께.
- 이 섹션의 역할은 "장면 묘사 + 방문 안내로 불안 완화"다(사진과 함께 배치되는 자리).
- [불안완화형] 과정을 '설명'하지 말고, 처음 오는 사람의 불안을 줄이는 방향으로. "처음 방문하시면 이런 순서로 진행됩니다" 톤으로 흐름을 담담히 안내.
- 진료 의자 옆 모니터로 촬영 영상을 함께 보며 설명을 듣는 장면 등 실제 공간 장면을 1개 정도 짧게 묘사.
- 방문 시 일반 흐름(접수 → 구강 검진 → 영상 촬영 → 상태 확인 → 치료 계획 안내)을 자연스럽게 안내하되 각 단계를 길게 풀지 말 것.
- 개인 타임라인·회복일지·후기·원장 발화 인용·비용 안내·치과명 노출 금지.
- 150~250자.${storeFactsBlock}${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 짧게 정리하며 마무리.
- 개인 변화·예약 예정·후기·추천·비용 표현 전면 금지.
- "치아·잇몸 불편이 이어진다면 치과 진료를 통해 현재 상태에 맞는 치료 방향을 확인해 보시는 것이 좋습니다" 수준의 일반 안내.
- ${region} + ${name} 키워드 자연스럽게 1회 이내 포함 가능.
- [반복 금지] 앞 섹션에서 이미 쓴 "상담 시 확인" 문장을 다시 쓰지 말 것. 마무리 유보 문장은 여기서 1회만.
- 100~150자로 간결하게.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

/** 섹션별 이미지 ALT — 정보형 7섹션 */
export function getDentalImageAltsV2(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const ak      = activeKeyword || name;
  const fullKw  = region + " " + ak;
  return {
    concern:           "[이미지: " + region + " 치과 " + ak + " 불편 상황 | " + ak + " 공감 안내]",
    visitTrigger:      "[이미지: " + region + " 치과 " + ak + " 진료 고려 시점 | " + fullKw + " 방문 판단]",
    examination:       "[이미지: " + region + " 치과 " + ak + " 진료 확인 과정 | " + fullKw + " 검사 정보]",
    treatmentDecision: "[이미지: " + fullKw + " 치료 결정 기준 | " + ak + " 치료 선택 정보]",
    checkPoint:        "[이미지: " + fullKw + " 치과 선택 확인 | " + ak + " 판단 항목]",
    sceneVisit:        "[이미지: " + region + " 치과 진료실 상담실 | " + fullKw + " 방문 안내]",
    closing:           "[이미지: " + fullKw + " 치료 정보 | " + ak + " 안내]",
  };
}

// 하위호환 별칭 (핸들러 기존 호출명 — 배열 반환)
export function getDentalV2ImageAlts(treatment, region) {
  const m = getDentalImageAltsV2(treatment, region);
  return [m.concern, m.visitTrigger, m.examination, m.treatmentDecision, m.checkPoint, m.sceneVisit, m.closing];
}

/** 정보블록 — 치료 판단 기준 요약표 (섹션 5 뒤 삽입) */
export function renderDentalV2InfoBlock(treatment, region) {
  const dir = getDirection(treatment?.id);
  const name = treatment?.name || "치료";
  return `${name} 진료 시 일반적으로 확인하는 항목

| 확인 항목 | 내용 |
|---|---|
| 원인 구분 | ${dir.diagnosisFocus.split(".")[0]} |
| 치료 방향 판단 | 상태에 따라 ${name} 또는 ${dir.compare} 등을 함께 검토 |
| 치과 선택 시 | ${dir.hospitalPoint.split(",")[0]} |
| 개인차 | 구강 상태에 따라 적용과 경과가 다를 수 있음 |`;
}

/** 제목 빌더 — 목적형(판단 지원). '결정 전 기준' 등 번역투 금지 */
export function buildDentalV2Title(name, region, treatmentId) {
  const dir = getDirection(treatmentId);
  const isEsthetic = /미백|라미네이트|세라믹|잇몸성형/.test(name);
  const isOrtho    = /교정/.test(name);
  const variants = isEsthetic
    ? [`${region} ${name}｜치료 전 확인할 사항`, `${region} ${name}｜상담 전 알아두면 좋은 내용`]
    : isOrtho
    ? [`${region} ${name}｜진단 전 확인할 사항`, `${region} ${name}｜치과 선택 시 살펴볼 기준`]
    : [`${region} ${name}｜치료 전 확인할 사항`, `${region} ${name}｜치과 선택 시 살펴볼 기준`];
  // 치료 id 해시로 고정 분산 (같은 치료는 항상 같은 제목형 — 관측 일관성)
  const idx = (treatmentId || "").length % variants.length;
  return variants[idx];
}

export { DENTAL_DIRECTION };
