// ============================================================
// neuro-v2-prompts.js — 신경외과 정보형 V2 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / ortho / pain 절대 참조 금지
// [V2 Purpose 재설계 · 2026-07-12] 구 정보형 7섹션 → Purpose 7섹션.
//   기준 엔진: ortho-v2(정식 승격본) One Axis 이식. 신경외과 데이터만 치환.
//   Purpose 7섹션:
//   concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//   개인 후기·1인칭·시간축(1일/1주/2주/1개월)·비용/횟수 단정·효과 단정·CTA 전면 제거.
//   NEURO_DIRECTION(질환 방향 데이터)은 신경외과 전용 자산 — 문맥 힌트로만 사용.
// [화이트리스트 없음] 신경외과 전 시술(24종) — ortho-v2 방침 동일.
// ============================================================

// [Purpose 데이터] concern/effect/hook/keyword/compare = 기존 문맥 힌트.
// diagnosisFocus/treatmentDecision/hospitalPoint = 질환별 '판단 기준' (섹션3·4·5가 직접 소비).
//   - diagnosisFocus: ③검사에서 "먼저 무엇을 판단하는가" — 이 질환의 핵심 판단축(공통 템플릿 탈피).
//   - treatmentDecision: ④치료에서 "어떤 증상·기준을 보고 비수술/수술이 갈리는가" — 설명형→판단형 전환.
//   - hospitalPoint: ⑤병원선택에서 이 질환 특유의 확인 포인트.
const NEURO_DIRECTION = {
  // ── 척추·디스크 ──
  neuro_disc:        { concern: "오래 앉으면 허리에서 다리로 내려가는 저림이 반복돼서", effect: "신경 압박 정도·다리 저림 양상·보행 거리 관점", hook: "오래 앉다 일어설 때 다리까지 저린 상황", keyword: "허리디스크", compare: "신경성형술",
    diagnosisFocus: "신경이 어느 위치에서 얼마나 눌려 있는지와 다리로 뻗치는 저림·근력 저하 여부. 허리 통증 자체보다 다리로 내려가는 신경 증상이 핵심 판단축",
    treatmentDecision: "다리 저림·방사통이 얼마나 지속되는지, 근력 저하가 있는지, 통증이 일상을 얼마나 제한하는지를 봅니다. 대체로 비수술을 먼저 보고, 근력 저하나 배뇨 이상 같은 신경 증상이 뚜렷하면 수술을 함께 판단",
    hospitalPoint: "MRI 영상 판독과 신경학적 진찰을 함께 보는지, 비수술 단계별 경로를 갖추었는지" },
  neuro_stenosis:    { concern: "조금만 걸어도 다리가 저려 자꾸 멈춰 서게 돼서", effect: "신경관 협착 정도·연속 보행 거리·신경성 파행 관점", hook: "걷다가 다리 저림으로 멈춰 쉬는 상황", keyword: "척추관협착증", compare: "경막외신경성형술",
    diagnosisFocus: "얼마나 걸으면 멈추게 되는지(신경성 파행)와 허리를 숙이면 편해지는지 여부. 이 보행 양상이 다른 척추 질환과 가르는 핵심 판단축",
    treatmentDecision: "연속으로 걸을 수 있는 거리, 다리 저림이 생활을 제한하는 정도, 신경 압박 진행 여부를 봅니다. 걸을 수 있으면 비수술을 먼저 보고, 보행이 크게 제한되면 수술을 함께 판단",
    hospitalPoint: "보행 상태를 실제로 확인하는지, 협착 정도 영상 판독과 이후 계획을 함께 안내하는지" },
  neuro_neckdisc:    { concern: "목이 뻐근하고 팔·손 저림이 반복돼서", effect: "경추 신경 압박·손 저림 양상·목 가동 범위 관점", hook: "아침에 손가락이 저린 채로 깨는 상황", keyword: "목디스크", compare: "신경차단술",
    diagnosisFocus: "목에서 팔·손으로 내려가는 저림 범위와 손 근력 변화 여부. 목 자체 통증보다 팔로 뻗치는 신경 증상이 핵심 판단축",
    treatmentDecision: "팔 저림·감각 이상의 범위, 손 근력 저하 정도, 증상이 얼마나 지속되는지를 봅니다. 대체로 비수술을 먼저 보고, 근력 저하가 진행하면 수술을 함께 판단",
    hospitalPoint: "경추 영상과 팔 신경 증상을 연결해 보는지, 자세·생활 지도를 병행하는지" },
  neuro_compfx:      { concern: "낙상 뒤 돌아눕거나 일어서기가 힘들 만큼 허리가 아파서", effect: "압박 부위 안정성·허리 폄 가능 여부 관점", hook: "낙상 후 자세를 바꿀 때마다 극심한 통증이 오는 상황", keyword: "척추압박골절", compare: "척추성형술",
    diagnosisFocus: "골절 부위와 눌린 정도, 골밀도 상태, 돌아눕거나 일어설 때의 통증. 서서히 오는 디스크 통증과 달리 갑작스러운 극심한 통증이 핵심 판단축",
    treatmentDecision: "골절 눌림 정도, 통증으로 움직임이 얼마나 제한되는지, 골밀도 상태를 봅니다. 안정적이면 보존치료를 먼저 보고, 눌림이 심하거나 통증이 지속되면 시술을 함께 판단",
    hospitalPoint: "골밀도 상태를 함께 확인하는지, 보존치료와 시술의 기준을 함께 안내하는지" },
  neuro_fbss:        { concern: "척추 수술을 받았는데도 같은 자리 통증이 남아 있어서", effect: "신경 유착 여부·통증 강도·약 복용 양상 관점", hook: "수술 후에도 같은 부위 통증이 이어지는 상황", keyword: "척추수술후증후군", compare: "재수술",
    diagnosisFocus: "수술 부위 신경 유착이 의심되는지와 통증 양상이 수술 전과 같은지 다른지. 새로운 손상인지 유착인지 가르는 것이 핵심 판단축",
    treatmentDecision: "통증이 수술 전과 같은 양상인지, 신경 유착이 의심되는지, 약물로 조절되는지를 봅니다. 대체로 비수술을 먼저 보고, 구조적 문제가 확인되면 재수술을 함께 판단",
    hospitalPoint: "수술 전후 영상을 비교해 보는지, 유착과 새 손상을 감별해 설명하는지" },
  neuro_sciatica:    { concern: "엉덩이부터 다리까지 저림이 반복돼서", effect: "좌골신경 압박 정도·저림 발생 양상·보행 관점", hook: "엉덩이부터 종아리까지 저린 상황", keyword: "좌골신경통", compare: "신경차단술",
    diagnosisFocus: "저림이 엉덩이에서 다리 어디까지 내려가는지와 어느 자세에서 심해지는지. 저림이 뻗치는 경로가 핵심 판단축",
    treatmentDecision: "저림이 뻗치는 범위, 근력 저하 유무, 걷기가 얼마나 제한되는지를 봅니다. 대체로 비수술을 먼저 보고, 신경 증상이 진행하면 수술을 함께 판단",
    hospitalPoint: "저림 경로를 신경 분포와 연결해 보는지, 원인 부위를 영상으로 확인하는지" },

  // ── 두통·신경통 ──
  neuro_headache:    { concern: "두통이 잦아져 진통제 복용이 늘어서", effect: "두통 빈도·진통제 복용 양상·두통 강도 관점", hook: "진통제를 먹는 날이 잦아진 상황", keyword: "만성두통", compare: "약물 치료",
    diagnosisFocus: "두통이 한 달에 며칠이나 되는지와 진통제 복용 일수, 그리고 이차성 두통을 시사하는 신호가 있는지. 빈도와 위험 신호 감별이 핵심 판단축",
    treatmentDecision: "두통 빈도, 진통제 복용 일수, 이차성 원인이 의심되는 신호를 봅니다. 대체로 약물·생활 조절을 먼저 보고, 위험 신호가 있으면 영상 검사를 함께 판단",
    hospitalPoint: "이차성 두통 감별을 하는지, 진통제 과다 복용 여부를 함께 살피는지" },
  neuro_migraine:    { concern: "편두통 발작으로 일상을 쉬어야 하는 날이 반복돼서", effect: "발작 빈도·발작 강도·일상 지장 정도 관점", hook: "편두통 발작으로 쉬어야 하는 날이 잦은 상황", keyword: "편두통", compare: "약물 치료",
    diagnosisFocus: "한 달에 발작이 몇 번인지, 발작마다 얼마나 오래 가는지, 전조 증상이 있는지. 발작 빈도와 양상이 핵심 판단축",
    treatmentDecision: "월 발작 횟수, 발작이 일상을 멈추게 하는 정도, 급성기 약의 반응을 봅니다. 발작이 드물면 급성기 약을 먼저 보고, 잦아지면 예방적 접근을 함께 판단",
    hospitalPoint: "발작 빈도를 기록해 보는지, 급성기와 예방 접근을 구분해 안내하는지" },
  neuro_trigeminal:  { concern: "세수·양치 같은 가벼운 자극에도 얼굴 한쪽이 찌릿해서", effect: "일상 동작 시 통증 발생 양상·통증 강도 관점", hook: "가벼운 자극에도 얼굴 한쪽이 전기 오듯 아픈 상황", keyword: "삼차신경통", compare: "약물 치료",
    diagnosisFocus: "가벼운 자극에서 전기 오듯 짧게 스치는 통증이 얼굴 어느 부위에 오는지. 지속적 통증이 아니라 자극 유발성 발작 양상이 핵심 판단축",
    treatmentDecision: "통증 발작 빈도, 자극 유발 정도, 약물 반응을 봅니다. 대체로 약물을 먼저 보고, 약물로 조절되지 않으면 시술·수술을 함께 판단",
    hospitalPoint: "통증 유발 부위를 확인하는지, 다른 얼굴 통증과 감별해 설명하는지" },
  neuro_occipital:   { concern: "뒷머리가 찌르듯 아픈 일이 반복돼서", effect: "통증 발생 양상·수면 영향·통증 강도 관점", hook: "뒷머리를 건드리면 찌릿한 상황", keyword: "후두신경통", compare: "신경차단술",
    diagnosisFocus: "뒷머리에서 정수리 쪽으로 뻗치는 찌르는 통증과 특정 지점을 누를 때의 압통. 두통 전반이 아니라 후두신경 경로를 따라가는지가 핵심 판단축",
    treatmentDecision: "통증이 신경 경로를 따라가는지, 압통점이 있는지, 약물 반응을 봅니다. 대체로 약물을 먼저 보고, 반응이 부족하면 신경차단을 함께 판단",
    hospitalPoint: "압통점을 실제로 확인하는지, 다른 두통과 감별해 설명하는지" },
  neuro_cluster:     { concern: "한쪽 눈 주변 극심한 두통이 정해진 시간대에 반복돼서", effect: "발작 빈도·발작당 지속 시간 관점", hook: "매일 같은 시간대에 극심한 두통이 오는 상황", keyword: "군발성두통", compare: "약물 치료",
    diagnosisFocus: "발작이 매일 같은 시간대에 오는지, 한쪽 눈 주변에 국한되는지, 눈물·코막힘이 동반되는지. 시간 규칙성과 동반 증상이 핵심 판단축",
    treatmentDecision: "발작 시간 규칙성, 발작 지속 시간, 군발기 여부를 봅니다. 급성기 대응을 먼저 보고, 군발기가 이어지면 예방적 접근을 함께 판단",
    hospitalPoint: "발작 패턴을 기록해 보는지, 편두통과 감별해 설명하는지" },

  // ── 신경차단·통증 ──
  neuro_block:       { concern: "약을 먹어도 통증이 줄지 않아서", effect: "신경 신호 차단·통증 강도·약 복용 양상 관점", hook: "약 복용에도 통증이 그대로 남는 상황", keyword: "신경차단술", compare: "신경성형술",
    diagnosisFocus: "약물로 조절되지 않는 통증이 어느 신경 경로에서 오는지와 신경학적 소견이 있는지. 통증의 출처가 되는 신경 부위 확인이 핵심 판단축",
    treatmentDecision: "약물 반응이 얼마나 부족한지, 통증이 특정 신경 경로를 따르는지, 일상 제한 정도를 봅니다. 약물 단계에서 부족하면 이 방법을 고려하고, 신경 증상이 진행하면 다른 치료를 함께 판단",
    hospitalPoint: "통증의 출처가 되는 신경 부위를 확인하는지, 시술 전후 계획을 함께 안내하는지" },
  neuro_neuroplasty: { concern: "신경차단을 받아도 저림이 다시 돌아와서", effect: "신경 유착·저림 재발 간격·통증 강도 관점", hook: "차단 후 일정 기간 뒤 저림이 재발하는 상황", keyword: "경막외신경성형술", compare: "신경차단술",
    diagnosisFocus: "차단술 이후 통증이 얼마 만에 재발하는지와 신경 유착이 의심되는지. 일시적 반응 후 반복 재발하는 양상이 핵심 판단축",
    treatmentDecision: "재발 간격, 유착 의심 여부, 이전 치료 반응을 봅니다. 반복 재발이 확인되면 이 방법을 고려하고, 구조적 압박이 크면 수술을 함께 판단",
    hospitalPoint: "이전 치료 반응을 기록해 보는지, 유착 가능성을 영상과 함께 설명하는지" },
  neuro_rfa:         { concern: "같은 부위 통증으로 반복해서 진료를 받게 돼서", effect: "신경 신호 차단·통증 완화 지속 관점", hook: "같은 자리 통증으로 병원을 반복해 찾는 상황", keyword: "고주파신경치료", compare: "신경차단술",
    diagnosisFocus: "같은 부위 통증이 얼마나 오래 반복됐는지와 이전 차단 치료에 어떻게 반응했는지. 만성 반복 여부가 핵심 판단축",
    treatmentDecision: "통증이 반복된 기간, 이전 치료 반응, 적용 대상 조건을 봅니다. 만성 반복이 확인되면 이 방법을 고려하고, 원인 구조 문제가 크면 다른 치료를 함께 판단",
    hospitalPoint: "이전 치료 반응을 확인하는지, 적용 대상 여부를 먼저 평가하는지" },
  neuro_fims:        { concern: "물리치료를 받아도 저림 동반 통증이 남아 있어서", effect: "근막 유착·방사통 동반 압통·가동 범위 관점", hook: "물리치료 후에도 저림이 함께 오는 통증이 남는 상황", keyword: "FIMS시술", compare: "체외충격파",
    diagnosisFocus: "통증이 근막에서 오는지 신경뿌리 자극이 동반되는지와 눌렀을 때 깊은 압통이 있는지. 신경뿌리 자극 동반 여부가 핵심 판단축",
    treatmentDecision: "신경뿌리 자극이 동반되는지, 기존 치료로 부족했는지, 적용 대상 조건을 봅니다. 대상이 맞으면 보조적으로 고려하고, 신경 압박이 뚜렷하면 다른 치료를 함께 판단",
    hospitalPoint: "신경뿌리 자극 동반 여부를 평가하는지, 단계적 적용 기준을 안내하는지" },
  neuro_eswt:        { concern: "만성 통증이 약물·재활로도 줄지 않아서", effect: "국소 통증 강도·압통 부위·신경성 저림 관점", hook: "같은 부위 통증이 오래 이어지는 상황", keyword: "체외충격파", compare: "FIMS시술",
    diagnosisFocus: "통증이 국소 압통점에 국한되는지 신경 경로를 따라 뻗치는지. 급성 손상이 아닌 만성 반복 통증인지가 핵심 판단축",
    treatmentDecision: "통증이 반복된 기간, 압통 부위, 기존 치료 반응을 봅니다. 적용 대상이면 보조적으로 고려하고, 신경 압박이 확인되면 다른 치료를 함께 판단",
    hospitalPoint: "적용 부위가 맞는지 평가하는지, 신경 증상 동반 여부를 함께 살피는지" },

  // ── 말초신경·손저림 ──
  neuro_carpal:      { concern: "밤에 손이 저려 잠에서 깨는 일이 반복돼서", effect: "야간 손저림 양상·손 악력·감각 관점", hook: "자다가 손 저림으로 깨는 상황", keyword: "수근관증후군", compare: "수술적 치료",
    diagnosisFocus: "밤에 심해지는 손 저림이 어느 손가락에 오는지와 물건을 집는 힘이 떨어졌는지. 야간 증상과 저림 범위가 핵심 판단축",
    treatmentDecision: "저림 범위, 손 근력 저하 정도, 야간 증상이 수면을 방해하는지를 봅니다. 가벼우면 비수술을 먼저 보고, 근력 저하가 진행하면 수술을 함께 판단",
    hospitalPoint: "저림 범위와 손 근력을 실제로 확인하는지, 신경 압박 정도를 함께 보는지" },
  neuro_ulnar:       { concern: "팔꿈치를 굽히면 새끼손가락이 저려서", effect: "저림 발생 양상·손가락 감각·악력 관점", hook: "팔꿈치를 굽힌 자세에서 새끼손가락이 저린 상황", keyword: "척골신경포착증후군", compare: "수술적 치료",
    diagnosisFocus: "저림이 새끼손가락 쪽에 오는지와 팔꿈치를 굽힌 자세에서 심해지는지. 저림 위치와 자세 연관성이 핵심 판단축",
    treatmentDecision: "저림 범위, 손 근력·집기 힘 저하 정도, 자세 교정으로 줄어드는지를 봅니다. 가벼우면 보존적 접근을 먼저 보고, 근위축이 진행하면 수술을 함께 판단",
    hospitalPoint: "저림 위치를 신경 분포와 연결해 보는지, 손목터널과 감별해 설명하는지" },
  neuro_peripheral:  { concern: "손발 감각이 둔해진 상태가 이어져서", effect: "손발 저림 양상·감각 정도·보행 안정 관점", hook: "손발 끝 감각이 둔한 상황", keyword: "말초신경병증", compare: "약물 치료",
    diagnosisFocus: "저림·감각 저하가 양쪽 손발 끝에서 시작하는지와 당뇨 등 기저 원인이 있는지. 좌우 대칭 여부와 기저 원인 확인이 핵심 판단축",
    treatmentDecision: "증상이 좌우 대칭인지, 기저 원인이 있는지, 보행 안정성이 떨어졌는지를 봅니다. 원인 질환 관리를 먼저 보고, 증상이 심하면 약물·시술을 함께 판단",
    hospitalPoint: "기저 원인 검사를 함께 보는지, 신경전도검사로 손상 부위를 확인하는지" },

  // ── 어지럼·뇌신경 ──
  neuro_dizzy:       { concern: "기상 시나 자세를 바꿀 때 어지럼이 반복돼서", effect: "어지럼 발생 양상·원인 감별 관점", hook: "자세를 바꿀 때 천장이 도는 상황", keyword: "어지럼증", compare: "이비인후과 검사",
    diagnosisFocus: "어지럼이 자세 변화에서 오는지 지속적인지와 두통·저림 같은 신경학적 동반 증상이 있는지. 중추성인지 말초성인지 감별이 핵심 판단축",
    treatmentDecision: "어지럼 발생 상황, 신경학적 동반 증상 유무, 지속 양상을 봅니다. 말초성이 의심되면 해당 과 협진을 먼저 보고, 중추성 신호가 있으면 뇌 영상 검사를 함께 판단",
    hospitalPoint: "중추성·말초성 감별을 하는지, 필요 시 타과 협진을 안내하는지" },
  neuro_brainmri:    { concern: "두통·어지럼이 잦고 가족력이 있어 검사를 고민해서", effect: "뇌혈관·구조 감별·두통 원인 확인 관점", hook: "가족력과 잦은 두통으로 검사를 고려하는 상황", keyword: "뇌MRI", compare: "뇌CT",
    diagnosisFocus: "두통·어지럼에 위험 신호가 동반되는지와 가족력이 검사 필요성에 어떻게 작용하는지. 검사가 필요한 상황인지 판단하는 것 자체가 핵심 판단축",
    treatmentDecision: "위험 신호 동반 여부, 가족력, 증상 지속 정도를 봅니다. 검사 필요성이 확인되면 영상 검사를 고려하고, 결과 해석과 이후 계획은 진료 시 함께 판단",
    hospitalPoint: "검사가 필요한 상황인지 먼저 평가하는지, 결과를 신경학적 소견과 함께 설명하는지" },
  neuro_facialspasm: { concern: "한쪽 얼굴이 떨리는 일이 이어져서", effect: "떨림 발생 양상·지속 시간 관점", hook: "한쪽 눈가·입가가 반복해 떨리는 상황", keyword: "안면경련", compare: "보툴리눔 치료",
    diagnosisFocus: "떨림이 한쪽에만 오는지와 눈가에서 입가로 번지는지. 단순 눈꺼풀 떨림과 구별되는 편측·확산 양상이 핵심 판단축",
    treatmentDecision: "떨림이 한쪽에 국한되는지, 얼마나 자주·오래 지속되는지, 일상에 지장이 있는지를 봅니다. 대체로 비수술적 접근을 먼저 보고, 원인 압박이 확인되면 수술을 함께 판단",
    hospitalPoint: "편측성 여부를 확인하는지, 단순 눈꺼풀 떨림과 감별해 설명하는지" },
  neuro_tinnitus:    { concern: "귀울림이 이어져 잠들기 어려워서", effect: "이명 강도·원인 감별·수면 영향 관점", hook: "조용할 때 귀울림이 커져 수면에 지장이 있는 상황", keyword: "이명", compare: "이비인후과 검사",
    diagnosisFocus: "이명이 한쪽인지 양쪽인지와 청력 저하·어지럼 같은 동반 증상이 있는지. 편측성과 동반 증상이 감별의 핵심 판단축",
    treatmentDecision: "편측성 여부, 청력 저하 동반, 수면·집중 지장 정도를 봅니다. 청각 원인이 의심되면 해당 과 협진을 먼저 보고, 중추성 원인이 의심되면 영상 검사를 함께 판단",
    hospitalPoint: "편측 이명을 별도로 살피는지, 필요 시 청각 검사·타과 협진을 안내하는지" },
  neuro_memory:      { concern: "익숙한 이름이나 단어가 잘 떠오르지 않는 일이 반복돼서", effect: "인지기능 감별·원인 확인 관점", hook: "익숙한 이름이 떠오르지 않는 일이 잦아진 상황", keyword: "기억력저하", compare: "정신건강의학과",
    diagnosisFocus: "기억력 저하가 일상생활에 지장을 주는 수준인지와 가역적 원인이 있는지. 노화에 따른 변화인지 병적 저하인지 감별이 핵심 판단축",
    treatmentDecision: "일상 지장 정도, 진행 속도, 가역적 원인 유무를 봅니다. 가역적 원인부터 먼저 확인하고, 진행성이 의심되면 정밀 평가를 함께 판단",
    hospitalPoint: "인지기능 평가를 하는지, 가역적 원인 검사를 함께 살피는지" },
};

/** 시술 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return NEURO_DIRECTION[treatmentId] || {
    concern: "신경학적 증상이 반복돼서",
    effect:  "신경 압박·증상 양상·검사 소견 관점",
    hook:    "일상 동작 중 신경학적 증상이 반복되는 상황",
    keyword: "신경외과 진료",
    compare: "다른 치료",
    diagnosisFocus: "증상이 어느 신경 경로에서 오는지와 신경학적 이상 소견이 있는지",
    treatmentDecision: "증상 지속 정도, 신경학적 소견, 일상 제한 정도를 봅니다. 대체로 비수술을 먼저 보고, 신경 증상이 진행하면 수술을 함께 판단",
    hospitalPoint: "신경학적 진찰과 영상 판독을 함께 보는지",
  };
}

export const NEURO_SYSTEM_PROMPT_V2 = `당신은 신경외과 진료 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 진료 정보 안내"입니다.
- 1인칭 체험(저는/제가/받아봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(나았다/좋아졌다/저림이 사라졌다/완치). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·회복 기간·치료 횟수 단정 금지. "개인 상태에 따라 다르며 상담 시 안내" 수준.
- 개인 타임라인(1일/1주/2주/1개월 경과·회복일지·통증 점수 변화) 금지.
- 병원·원장 평가·추천·CTA(상담 받아보세요) 금지. 매장명(지점명) 본문 노출 금지.
- 원장·의사 발화 인용("~라고 하셨어요") 금지.
- 실비·가격 언급 금지(환자 유인 표현).
- 의료광고법 준수: 효능·효과 보장 표현 금지. 검사·진단은 감별 목적으로만 서술(진단 단정 금지).
[Purpose 원칙] 이 글의 목적은 '많이 설명하는 것'이 아니라 '사용자가 빨리 판단하도록 돕는 것'이다. 각 섹션은 검사·치료를 나열·해설하기보다 '무엇을 판단하기 위한 것인지'를 먼저 밝힌다.
[가독성 원칙] 문단당 2~3문장, 한 문장 40~70자 내외로 짧게. 만연체·긴 문단 금지. "예를 들어/또한/이러한" 등 접속 표현 남발 금지.
[문체 통일 — 필수] 모든 문장의 종결어미는 "~습니다 / ~됩니다 / ~있습니다" 존댓말체로 통일한다. "~된다 / ~한다 / ~이다 / ~중요하다" 같은 '-다'체(음슴체·평서 단정체)를 절대 섞지 말 것. 한 글 안에서 어미가 섞이면 완성도가 떨어진다 — 처음부터 끝까지 '-습니다' 계열로만 쓴다.
[나열 제약] 검사 종류는 한 번에 최대 2개, 치료 종류는 최대 2개까지만. 치료법은 '기준에 종속된 예시'로만 짧게 스치고, 가능하면 "비수술 우선 검토 / 수술 검토 조건"이라는 판단 흐름만으로 끝낸다. 약물·주사·신경차단·수술을 순서대로 소개·해설하지 말 것. 같은 내용을 반복 설명하지 말 것. 한방·한의 치료, 도수치료·프롤로·PRP는 다루지 않는다.`;

export function buildNeuroPromptV2(section, treatment, region, mode) {
  const name    = treatment.name;
  const dir     = getDirection(treatment.id);
  const compare = dir.compare || treatment.compareWith || "다른 치료";

  // 검사·영상 민감군: 진단 단정 금지 강화
  const isImaging = /MRI|CT|검사|기억력|어지럼|이명/.test(name);
  const imagingGuide = isImaging
    ? `\n[검사·영상 민감 ⚠️] 검사 결과로 특정 질환을 "확정/진단"하는 단정 금지. "원인을 살피기 위한 검사이며 결과 해석은 진료 시 안내" 수준의 일반 정보로만 서술. 필요 시 타과 협진 가능성 명시.`
    : "";

  // 비수술 시술군: 효과·회차 단정 금지
  const isProcedure = /차단|성형술|고주파|FIMS|충격파/.test(name);
  const procedureGuide = isProcedure
    ? `\n[비수술 시술 주의 ⚠️] "개선/효과/사라짐/완치" 등 효과 단정 절대 금지. 회차·비용 단정 금지. "개인차가 있으며 상담 시 안내" 수준의 일반 정보로만 서술.`
    : "";

  // 수술 가능군: 마취·회복 일반 안내, 안전 단정 금지
  const isSurgical = /디스크|협착|골절|수술후|포착|경련/.test(name);
  const surgeryGuide = isSurgical
    ? `\n[수술 관련 주의] 수술은 비수술적 치료 경과에 따라 고려되는 선택지 중 하나로만 안내. 마취·회복·부작용 가능성은 일반 정보로만. 안전·성공 단정 금지. 개인 상태·경과에 따라 다름을 명시.`
    : "";

  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/받아봤어요/느꼈어요/좋아졌어요/나았어요/사라졌어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한/경험 많은"
"원장님이 ~라고 하셨/설명해 주셨"(발화 인용) 금지
"1일차/1주일차/2주차/1개월차/치료 후 첫날/통증 8→3점" 등 개인 타임라인·수치 변화
"OO만원/실비 적용" 등 비용·환자유인 표현
[V2 정보형 추가 금지 — 주관·광고성 표현]
"체감되는 부분이었다/체감된다"(주관) → "일반적으로 살피는 요소입니다"
"저림이 사라질 수 있는/호전을 기대할 수 있는"(효과 암시) → "상태에 따라 진료 시 안내됩니다"
"최적의/최선의/맞춤형 접근"(광고성) → "개인 상태에 따른 접근"
"통증을 없애준다/저림을 잡아준다"(효과 단정) → "~에 대해 살피는 진료입니다"
[접속사·군더더기 남발 금지] "예를 들어 / 또한 / 이러한 / 이와 같이 / 뿐만 아니라"를 습관적으로 반복하지 말 것. 한 섹션에 접속 표현은 최소한으로.
- 이 글은 후기가 아니라 일반 진료 정보 안내다. 객관적·설명형으로 서술.`;

  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 "이 질환/해당 증상/진료" 등으로 대체. 3회 이상 금지.`;
  const grammarGuide = `\n[조사 오류 금지] "${name}을/이/를/가" 직접 연결 금지. 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  // [가독성] 모바일 가독성 — 문단·문장 길이 제한 (전 섹션 공통)
  const readabilityGuide = `\n[가독성 — 필수] 문단당 2~3문장. 한 문장은 40~70자 내외. 긴 문단·만연체 금지. 짧게 끊어 읽기 편하게.\n[문체 — 필수] 모든 문장을 "~습니다/~됩니다/~있습니다" 존댓말체로 끝낸다. "~된다/~한다/~이다/~중요하다/~살핀다" 같은 '-다'체를 한 문장도 섞지 말 것. 이 섹션 안에서 어미를 반드시 통일한다.`;
  // [Purpose] 설명이 아니라 결정을 돕는 글 — 첫 문장은 사용자 질문에 바로 답한다 (전 섹션 공통)
  const purposeGuide = `\n[Purpose — 목적] 이 글의 목적은 '설명'이 아니라 '사용자의 결정을 돕는 것'이다. 검사·치료 용어를 나열하기 전에 '무엇을 판단하기 위한 것인지'를 먼저 제시.
[섹션 제목 반복 금지 — 필수] 섹션 제목은 시스템이 별도로 붙인다. 제목 문장("지금 이런 상황인가요?" / "진료에서는 무엇을 확인하나요?" / "치료는 어떤 기준으로 결정되나요?" 등)을 본문 안에 다시 쓰지 말 것. 질문을 되풀이하지 말고 곧바로 그 답부터 쓴다.
  ❌ "진료에서는 무엇을 확인하나요? 진료에서는 먼저 신경 경로를…"
  ✅ "먼저 증상이 어느 신경 경로에서 오는지를 확인합니다."`;

  const G = { name, region, compare, dir, imagingGuide, procedureGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide };

  switch (section) {
    case 'concern':           return buildConcernPrompt(G);
    case 'visitTrigger':      return buildVisitTriggerPrompt(G);
    case 'examination':       return buildExaminationPrompt(G);
    case 'treatmentDecision': return buildTreatmentDecisionPrompt(G);
    case 'checkPoint':        return buildCheckPointPrompt(G);
    case 'sceneVisit':        return buildSceneVisitPrompt(G);
    case 'closing':           return buildClosingPrompt(G);
    default: throw new Error(`[neuro-v2-prompts] 알 수 없는 섹션: ${section}`);
  }
}

// [Purpose 프레임] 검사·치료를 '설명 중심'이 아니라 '사용자 의사결정을 돕는 수단'으로 종속시킨다.

function buildConcernPrompt({ name, region, dir, imagingGuide, procedureGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 1 — 지금 이런 상황인가요?] ⚠ 소제목(##) 출력 금지. 본문부터 바로 시작. [세션40][NOHDR-01] ${region} 지역 독자 대상, ${name} 정보를 찾는 사람이 처한 상황에 짧고 담담하게 공감.
- 이 섹션의 역할은 "공감·검색 계기"다. 길게 설명하지 말 것 — 텍스트는 짧게, 상황을 짚어 주는 정도.
- "혹시 이런 상황이신가요?"처럼 독자가 자신의 상황을 알아보게 하는 톤. 특정 개인 경험 서술 아님.
- 참고 맥락: ${dir.concern} (단정 아님, 일반 배경으로만).
- 관찰 가능한 저림·통증 부위·유발 상황·일상 제한을 2~3개 짚어 주는 수준.
- 겁주기·효과 암시·광고성 금지. 검사·치료를 여기서 설명하지 말 것(다음 섹션 역할).
- 120~180자로 짧게 (사진이 공감을 담당하므로 텍스트는 최소).${readabilityGuide}${purposeGuide}${imagingGuide}${procedureGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitTriggerPrompt({ name, region, dir, imagingGuide, procedureGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 2 — 이럴 때 진료를 고려해볼 수 있습니다] ${name} 관련해 "언제 신경외과 진료를 고려하면 좋은지" 방문 판단을 돕는 정보.
- 이 섹션의 역할은 "방문 판단"이다. 어떤 신호·지속 기간·악화 양상일 때 진료를 생각해볼 수 있는지 기준을 제시.
- "이런 경우에는 진료를 고려해볼 수 있습니다" 형식의 판단 도움 정보. 단정·강요·CTA 아님.
- 참고 맥락: ${dir.hook} (일반 배경으로만).
- 자가 대처로 지켜봐도 되는 선과 진료를 고려할 선을 구분해 주는 관점(단, 위험 과장 금지).
- 신경학적 증상(저림 범위 확대·근력 저하·감각 이상 등)이 동반될 때는 진료를 고려할 수 있다는 관점을 담되 겁주지 말 것.
- 검사·치료 자체를 설명하지 말 것 — 그건 다음 섹션들 역할. 여기서는 '판단'만.
- 180~250자.${readabilityGuide}${purposeGuide}${imagingGuide}${procedureGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, dir, imagingGuide, procedureGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 3 — 진료에서는 무엇을 확인하나요?] ${name} 진료 시 무엇을 확인하는지를, '판단 기준'을 먼저 세우고 검사를 그 뒤에 '수단'으로 종속시켜 안내.
- 이 질환의 핵심 판단 기준(반드시 반영): ${dir.diagnosisFocus}. 이 판단축을 첫 문장~둘째 문장에 녹여, 다른 질환과 구별되는 이 질환 고유의 관점으로 서술한다(공통 템플릿 문장 금지).
- 첫 문장은 '무엇을 판단하기 위해 확인하는지'로 시작한다. 예: "진료에서는 먼저 증상이 어느 신경 경로에서 오는지부터 확인합니다."
- 순서 필수: ① 위 핵심 판단 기준을 먼저 제시 → ② 그 다음 검사를 1~2줄만 '수단'으로 붙인다.
- [검사 선택 — 필수] 이 질환에 실제로 쓰이는 검사만 쓴다. 검사 이름을 병렬로 나열하지 말 것.
  · 기본은 MRI 등 영상 검사 1개를 중심으로 서술한다.
  · 신경전도검사(NCS)·근전도(EMG)는 손발 저림·감각 저하 등 말초신경 문제에서만 쓰는 검사다. 척추(허리·목디스크, 협착증)·두통·어지럼 글에서는 언급하지 말 것.
  · 추가 검사가 필요할 수 있다는 취지는 "필요한 경우 추가 검사가 시행될 수 있습니다" 수준의 한 줄로만 처리한다.
  ❌ "MRI나 신경전도검사 등을 활용할 수 있습니다"(질환과 무관한 병렬 나열)
  ✅ "이를 확인하기 위해 MRI 영상을 활용할 수 있으며, 필요한 경우 추가 검사가 시행될 수 있습니다."
- [나열 제약] 검사 종류는 최대 2개까지만 언급. 각 검사의 원리·과정을 길게 설명하지 말 것 — '무엇을 살피는지' 한 줄이면 충분.
- 검사는 원인을 확인하는 과정이며 확정 진단이 아님을 명시. 결과 해석은 진료 시 안내됨.
- 비용·검사 소요시간 단정은 다루지 않음.
- 200~300자.${readabilityGuide}${purposeGuide}${imagingGuide}${procedureGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentDecisionPrompt({ name, region, compare, dir, imagingGuide, procedureGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 4 — 치료는 어떤 기준으로 결정되나요?] (핵심 축) ${name} 치료가 '어떤 기준으로 선택되는지' 의사결정 흐름을 안내.
- 이 질환의 치료 결정 기준(반드시 반영): ${dir.treatmentDecision}. 이 기준을 그대로 판단축으로 삼아, 비수술과 수술이 갈리는 지점을 이 질환에 맞게 서술한다(약물·주사·신경차단·수술을 순서대로 나열·해설하지 말 것).
- 첫 문장은 '무엇을 보고 치료 방향을 정하는지'로 시작한다. 예: "치료 방향은 신경 증상이 일상생활에 얼마나 영향을 주는지와 검사 결과를 함께 보고 결정됩니다."
- 순서 필수: ① 위 치료 결정 기준을 먼저 제시 → ② 그 기준에 따라 비수술을 먼저 보는 경우와 수술까지 고려하는 경우가 어떻게 갈리는지.
- [권장 골격 — 이 형태를 기본으로 삼는다] 이 섹션의 이상적 형태는 다음 2~3문장 구조다:
  「치료 방향은 (이 질환의 핵심 판단 기준: ${dir.treatmentDecision} 중 대표 요소 1~2개)을(를) 종합해 결정합니다. 증상이 가볍고 일상에 큰 지장이 없으면 비수술적 치료를 우선 검토하며, (이 질환에서 수술을 함께 보는 신경학적 악화 신호)가 확인되는 경우에는 수술적 치료 여부도 함께 판단할 수 있습니다.」
  이 골격을 질환에 맞게 변주하되, 여기서 크게 벗어나 문장을 늘리지 말 것.
- [치료 작동 설명 금지] 비수술·수술이 '무엇을 하는지'(신경 염증 완화·통증 신호 차단·카테터로 유착을 박리 등)를 설명하지 말 것. 이 섹션은 '무슨 치료인지'가 아니라 '어떤 기준으로 무엇을 먼저 보는지'만 다룬다.
- [분량 하드 제약 — 필수 준수] 이 섹션은 5~6문장 이내로 끝낸다. 아래를 모두 지킨다:
  · "비수술"과 "수술"은 각각 최대 1회만 언급(반복 금지).
  · 같은 판단 기준(저림 범위·근력 저하·통증 지속 등)을 두 번 이상 되풀이하지 말 것 — 한 번만.
  · "상담 시 결정됩니다 / 개인 상태에 따라" 류의 마무리 문장은 글 전체에서 1회만.
  · 지역명("${region}")을 이 섹션에서 다시 넣지 말 것("예를 들어 ${region}…" 같은 정보 없는 문장 금지).
  · 뜻이 겹치는 문장을 늘려 쓰지 말 것. 한 번 말한 것은 다시 말하지 않는다.
- [치료명 노출 최소화 — 필수] 특정 시술·치료의 고유명("${compare}" / 신경차단술 / 신경성형술 / 고주파신경치료 / 척추성형술 등)을 본문에 이름으로 등장시키지 말 것. 이 섹션은 '어떤 기준으로 판단하는가'만 다룬다. 치료는 "비수술적 치료" / "수술적 치료" / "다른 치료 방향" 같은 범주 표현으로만 지칭한다.
  ❌ "신경차단술은 해당 증상이 심할 때 고려될 수 있으며…"(특정 치료명 등장 → 치료 소개글이 됨)
  ❌ "신경성형술은 비수술적 치료가 적합한 경우에 고려되며…"
  ✅ "증상이 지속되거나 근력 저하가 진행되면 다른 치료 방향을 함께 결정합니다."
- 마지막 문장을 특정 치료 소개로 끝내지 말 것. 판단 흐름으로 끝낸다.
- "${compare}"와의 대비 문장은 만들지 말 것(억지 비교 금지 — 생략이 기본).
- 참고 방향: ${dir.effect} (효과 단정 아님, 살피는 관점으로만).
- [금지] 한방·한의 치료, 도수치료·프롤로·PRP 언급 금지(Purpose 흐름을 끊고 타과 침투). 효과 단정 금지("저림이 사라진다/통증이 없어진다"). 비용·회복 기간·회차 단정 금지("보통 3회").
- "개인 상태에 따라 상담 시 결정됩니다" 수준.
- 180~260자로 짧게(넘기지 말 것).${readabilityGuide}${purposeGuide}${imagingGuide}${procedureGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, dir, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 5 — 병원 선택 시 확인할 점] 사용자가 병원을 판단할 때 확인하면 좋은 기준을 정리.
- 이 섹션의 역할은 "사용자 판단 기준" 제공이다.
- 이 질환 특유의 확인 포인트(반드시 1개 이상 반영): ${dir.hospitalPoint}. "비수술·수술 모두 다루는 병원" 같은 모든 질환 공통 문장만 반복하지 말고, 이 질환에 맞는 포인트를 섞어 준다.
- 신경외과 전문의 여부, 진료 분야가 본인 증상과 맞는지, 검사 장비 보유 여부, 주의사항 안내 여부 등 일반 기준은 1~2개만 곁들인다.
- 특정 병원 추천·홍보 아님. 사용자가 스스로 판단할 항목을 정리하는 형식(항목식 가능).
- 200~300자.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildSceneVisitPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 6 — 진료실과 검사실에서 확인하는 과정] 진료실·검사실의 실제 장면을 그리며 방문 안내를 함께.
- 이 섹션의 역할은 "장면 묘사 + 방문 안내로 신뢰 형성"이다(사진과 함께 배치되는 자리).
- [불안완화형] 과정을 '설명'하지 말고, 처음 오는 사람의 불안을 줄이는 방향으로. "처음 방문하시면 이런 순서로 진행됩니다" 톤으로 흐름을 담담히 안내.
- 진료실에서 모니터로 MRI·검사 영상을 함께 보며 설명을 듣는 장면 등 실제 공간 장면을 1개 정도 짧게 묘사.
- 방문 시 일반 흐름(접수 → 상담 → 신경학적 진찰 → 검사 → 결과 확인 → 계획 안내)을 자연스럽게 안내하되 각 단계를 길게 풀지 말 것.
- 개인 타임라인·회복일지·후기·원장 발화 인용·비용 안내·매장명 노출 금지.
- 150~250자.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 짧게 정리하며 마무리.
- [문장 수 하드 제약 — 필수] 정확히 3문장으로 끝낸다. 4문장 이상 금지. 아래 3가지를 각각 1문장씩:
  ① 증상이 지속되거나 일상에 불편이 이어진다면 진료로 현재 상태를 확인해보는 것이 도움이 될 수 있다는 안내
  ② 검사 결과와 증상을 함께 고려해 치료 방향이 결정된다는 안내
  ③ 치료 계획은 개인 상태에 따라 달라질 수 있어 진료 후 안내를 받는 것이 좋다는 안내
- [반복 금지] 위 3문장은 서로 다른 내용을 담는다. "상담이 필요합니다 / 전문의 의견이 중요합니다 / 전문가와 상의하는 것이 필요합니다"처럼 같은 뜻을 바꿔 말하며 문장을 늘리지 말 것.
- [지역명 홍보 톤 금지] "${region}에서 진료를 받을 수 있습니다" / "${region} 지역에서 진료가 가능합니다" 같은 문장 금지 — 안내가 아니라 홍보로 읽힌다. 이 섹션에 지역명을 넣지 않아도 된다.
- 개인 변화·예약 예정·후기·추천·비용 표현 전면 금지.
- 100~150자로 간결하게.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

/** 섹션별 이미지 ALT — Purpose 7섹션 */
export function getNeuroImageAltsV2(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const ak      = activeKeyword || name;
  const fullKw  = region + " " + ak;
  return {
    concern:           "[이미지: " + region + " 신경외과 " + ak + " 증상 상황 | " + ak + " 공감 안내]",
    visitTrigger:      "[이미지: " + region + " 신경외과 " + ak + " 진료 고려 시점 | " + fullKw + " 방문 판단]",
    examination:       "[이미지: " + region + " 신경외과 " + ak + " 진료 확인 과정 | " + fullKw + " 검사 정보]",
    treatmentDecision: "[이미지: " + fullKw + " 치료 결정 기준 | " + ak + " 치료 선택 정보]",
    checkPoint:        "[이미지: " + fullKw + " 병원 선택 확인 | " + ak + " 판단 항목]",
    sceneVisit:        "[이미지: " + region + " 신경외과 진료실 검사실 | " + fullKw + " 방문 안내]",
    closing:           "[이미지: " + fullKw + " 진료 정보 | " + ak + " 안내]",
  };
}

export { NEURO_DIRECTION };
