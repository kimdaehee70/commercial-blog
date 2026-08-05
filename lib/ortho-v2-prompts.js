// ============================================================
// ortho-v2-prompts.js — 정형외과 정보형 V2 (완전 독립)
// ⚠️ clinic / derma / dental / ent / oriental / neuro / pain 절대 참조 금지
// [V2 전환] 후기형/회복일지 → 정보형 → [Purpose 재설계] 검사·치료를 '사용자 의사결정 수단'으로 종속.
//   Purpose 7섹션:
//   concern / visitTrigger / examination / treatmentDecision / checkPoint / sceneVisit / closing
//   개인 후기·1인칭·시간축(1주/1개월/3개월)·비용/횟수 단정·효과 단정·CTA 전면 제거(정보형 원칙 유지).
//   ORTHO_DIRECTION(치료 방향 데이터)은 정형외과 전용 자산 — 문맥 힌트로만 사용.
// [화이트리스트 없음] 정형외과 전 치료(24종) — neuro-v2 방침 동일.
// ============================================================

// [Purpose 데이터] concern/effect/hook/keyword/compare = 기존 문맥 힌트.
// diagnosisFocus/treatmentDecision/hospitalPoint = 질환별 '판단 기준' (섹션3·4·5가 직접 소비).
//   - diagnosisFocus: ③검사에서 "먼저 무엇을 판단하는가" — 이 질환의 핵심 판단축(공통 템플릿 탈피).
//   - treatmentDecision: ④치료에서 "어떤 증상·기준을 보고 비수술/수술이 갈리는가" — 설명형→판단형 전환.
//   - hospitalPoint: ⑤병원선택에서 이 질환 특유의 확인 포인트.
const ORTHO_DIRECTION = {
  // ── 척추·디스크 ──
  lumbar_disc:      { concern: "앉아 있을수록 허리가 아프고 다리까지 저려서", effect: "신경 압박 양상, 다리 저림·방사통 관점, 비수술/수술 판단 관점", hook: "오래 앉아 있으면 허리·다리가 저려 오는 상황", keyword: "허리디스크", compare: "수술적 치료",
    diagnosisFocus: "신경 압박 정도와 다리로 뻗치는 방사통·근력 저하 여부. 연골 마모가 아니라 디스크 돌출과 신경 눌림이 핵심 판단축",
    treatmentDecision: "다리 저림·방사통의 지속 정도, 근력 저하 유무, 통증이 일상을 얼마나 제한하는지를 본다. 대체로 비수술을 먼저 보고, 근력 저하나 배뇨 이상 등 신경 증상이 뚜렷하면 수술을 함께 판단",
    hospitalPoint: "MRI 등 영상 판독과 신경학적 진찰을 함께 보는지, 비수술 단계별 치료 경로를 갖추었는지" },
  cervical_disc:    { concern: "목이 뻐근하고 어깨·팔까지 저림이 반복돼서", effect: "경추 신경 압박 관점, 팔 저림·근력 관점, 자세 관점", hook: "목·어깨가 늘 뻐근하고 손이 저린 상황", keyword: "목디스크", compare: "물리치료 단독",
    diagnosisFocus: "목에서 팔·손으로 내려가는 저림과 감각 이상, 손 근력 변화 여부. 목 자체 통증보다 팔로 뻗치는 신경 증상이 핵심 판단축",
    treatmentDecision: "팔 저림·감각 이상의 범위, 손 근력 저하 정도, 증상이 얼마나 지속되는지를 본다. 대체로 비수술을 먼저 보고, 근력 저하가 진행하면 수술을 함께 판단",
    hospitalPoint: "경추 영상과 팔 신경 증상을 연결해 보는지, 자세·생활습관 지도를 병행하는지" },
  spinal_stenosis:  { concern: "걷다 보면 다리가 저리고 힘이 빠져 자꾸 쉬게 돼서", effect: "척추관 협착 양상, 간헐적 파행 관점, 보행 거리 관점", hook: "조금만 걸어도 다리가 저려 멈춰 서는 상황", keyword: "척추관협착증", compare: "비수술 보존치료 단독",
    diagnosisFocus: "얼마나 걸으면 멈추게 되는지(간헐적 파행), 허리를 숙이면 편해지는지, 보행 가능 거리의 변화. 이 보행 양상이 다른 척추 질환과 가르는 핵심 판단축",
    treatmentDecision: "보행 가능 거리, 다리 저림이 생활을 제한하는 정도, 신경 압박 진행 여부를 본다. 걸을 수 있으면 비수술을 먼저 보고, 보행이 크게 제한되면 수술을 함께 판단",
    hospitalPoint: "보행 상태를 실제로 확인하는지, 협착 정도 영상 판독과 재활 계획을 함께 안내하는지" },
  scoliosis:        { concern: "척추가 휘어 보이거나 검진에서 측만 소견을 들어서", effect: "만곡 각도 관점, 성장기 진행 관점, 자세 균형 관점", hook: "어깨 높이가 다르거나 척추가 휘어 보이는 상황", keyword: "척추측만증", compare: "보조기 단독 치료",
    diagnosisFocus: "척추 만곡 각도와 성장기 진행 가능성, 어깨·골반 높이 좌우 차이. 통증보다 각도와 진행 속도가 핵심 판단축",
    treatmentDecision: "만곡 각도, 남은 성장 여지, 각도가 진행하는 속도를 본다. 각도가 크지 않으면 경과 관찰·운동을 먼저 보고, 각도가 크거나 빠르게 진행하면 보조기·수술을 함께 판단",
    hospitalPoint: "성장기 경과를 주기적으로 추적하는지, 각도 측정과 운동·자세 지도를 병행하는지" },
  cervical_stenosis:{ concern: "목·어깨가 뻣뻣하고 손 저림·두통이 동반돼서", effect: "경추 협착 양상, 손 저림·미세운동 관점, 자세 관점", hook: "장시간 화면을 본 뒤 목·손이 저리고 뻣뻣한 상황", keyword: "경추협착증", compare: "목디스크",
    diagnosisFocus: "손 저림과 단추 잠그기 같은 미세 손 동작의 어려움, 걸음의 균형 변화 여부. 목 뻣뻣함보다 손·보행의 미세 기능이 핵심 판단축",
    treatmentDecision: "손 저림 범위와 미세운동 저하 정도, 균형 변화 유무를 본다. 증상이 가벼우면 비수술을 먼저 보고, 손 기능·보행이 나빠지면 수술을 함께 판단",
    hospitalPoint: "경추 협착 영상과 손·보행 기능을 함께 보는지, 목디스크와의 감별을 설명하는지" },
  compression_fracture:{ concern: "갑자기 허리 통증이 심해 일어서거나 돌아눕기 힘들어서", effect: "골절 부위·정도 관점, 골밀도 관점, 보존/시술 판단 관점", hook: "허리에 갑작스러운 극심한 통증이 온 상황", keyword: "허리압박골절", compare: "허리디스크",
    diagnosisFocus: "골절 부위와 눌린 정도, 골밀도 상태, 돌아눕거나 일어설 때의 통증. 서서히 오는 디스크 통증과 달리 갑작스러운 극심한 통증이 핵심 판단축",
    treatmentDecision: "골절 눌림 정도, 통증으로 움직임이 얼마나 제한되는지, 골밀도 상태를 본다. 안정적이면 보존치료를 먼저 보고, 눌림이 심하거나 통증이 지속되면 시술을 함께 판단",
    hospitalPoint: "골밀도 검사를 함께 보는지, 보존치료와 시술 기준을 함께 안내하는지" },

  // ── 무릎·관절 ──
  knee_arthritis:   { concern: "계단 오르내릴 때 무릎이 시큰거리고 욱신거려서", effect: "연골 마모 양상, 가동범위 관점, 통증 유발 동작 관점", hook: "계단·쪼그려 앉기에서 무릎이 아파 느려진 상황", keyword: "무릎관절염", compare: "주사·물리치료 단독",
    diagnosisFocus: "연골 마모 정도와 무릎 가동범위, 계단·쪼그려 앉기 등 체중 부하 동작에서의 통증. 연골 마모와 체중 부하가 핵심 판단축",
    treatmentDecision: "연골 마모 단계, 통증이 걷기·계단을 얼마나 제한하는지, 변형 유무를 본다. 초·중기에는 비수술을 먼저 보고, 마모가 심하고 변형이 크면 수술을 함께 판단",
    hospitalPoint: "연골 마모 단계를 영상으로 확인하는지, 체중 관리·근력 운동 지도를 병행하는지" },
  meniscus:         { concern: "무릎을 삐끗한 뒤 붓고 구부리기 힘들어져서", effect: "연골판 손상 양상, 잠김·불안정성 관점, 보존/관절경 판단 관점", hook: "무릎을 접질린 뒤 붓고 잘 안 구부러지는 상황", keyword: "반월상연골", compare: "보존적 치료 단독",
    diagnosisFocus: "무릎이 걸리거나 잠기는 느낌, 접었다 펼 때의 통증과 불안정성. 연골판 파열 양상과 잠김 증상이 핵심 판단축",
    treatmentDecision: "파열 위치와 크기, 무릎 잠김·불안정성 정도, 일상 동작 제한을 본다. 잠김이 없으면 보존치료를 먼저 보고, 걸림·잠김이 반복되면 관절경을 함께 판단",
    hospitalPoint: "잠김·불안정성을 실제로 확인하는지, 관절경 기준과 재활 계획을 함께 안내하는지" },
  acl:              { concern: "운동 중 무릎에서 뚝 소리가 나고 심하게 부어서", effect: "인대 파열 양상, 무릎 불안정성 관점, 재활/재건 판단 관점", hook: "점프·방향 전환 중 무릎이 꺾이며 붓는 상황", keyword: "전방십자인대", compare: "보존적 치료 단독",
    diagnosisFocus: "무릎이 꺾이거나 빠지는 불안정감, 방향 전환 시 무릎이 흔들리는 느낌. 인대 파열로 인한 불안정성이 핵심 판단축",
    treatmentDecision: "불안정성 정도, 활동 수준과 운동 복귀 목표, 동반 손상 유무를 본다. 활동량이 낮으면 재활을 먼저 보고, 불안정성이 크거나 운동 복귀가 목표면 재건을 함께 판단",
    hospitalPoint: "불안정성 검사를 하는지, 활동 목표에 맞춘 재활·재건 기준을 함께 안내하는지" },
  hip:              { concern: "걸을 때마다 사타구니·엉덩이 깊은 곳이 아파서", effect: "고관절 구조 관점, 보행 시 통증 관점, 가동범위 관점", hook: "걷거나 다리를 벌릴 때 사타구니가 아픈 상황", keyword: "고관절", compare: "허리디스크",
    diagnosisFocus: "사타구니 깊은 곳의 통증과 다리를 벌리거나 돌릴 때의 제한. 허리에서 내려온 통증인지 고관절 자체 문제인지 감별이 핵심 판단축",
    treatmentDecision: "고관절 가동범위 제한, 보행 시 통증 정도, 구조적 손상 유무를 본다. 초기에는 비수술을 먼저 보고, 구조 손상이 크면 수술을 함께 판단",
    hospitalPoint: "허리 문제와의 감별을 하는지, 고관절 영상과 보행 상태를 함께 보는지" },

  // ── 어깨 ──
  shoulder:         { concern: "밤에 어깨가 아파 잠을 못 자고 팔 올리기가 힘들어서", effect: "야간 통증 양상, 팔 가동범위 관점, 원인 감별 관점", hook: "누우면 어깨가 아파 잠을 설치는 상황", keyword: "어깨통증", compare: "물리치료 단독",
    diagnosisFocus: "야간 통증 유무와 팔을 올릴 때의 가동범위, 힘 빠짐 여부. 회전근개·오십견 등 원인 감별이 핵심 판단축",
    treatmentDecision: "통증이 수면·일상을 제한하는 정도, 가동범위 제한, 원인 질환을 본다. 대체로 비수술을 먼저 보고, 구조 손상이 확인되면 수술을 함께 판단",
    hospitalPoint: "어깨 통증 원인을 감별해 보는지, 가동범위를 실제로 확인하는지" },
  rotator_cuff:     { concern: "팔을 들거나 벌릴 때 통증과 힘 빠짐이 있어서", effect: "회전근개 손상 양상, 근력 저하 관점, 파열 정도 관점", hook: "팔을 옆으로 들 때 특정 각도에서 아픈 상황", keyword: "회전근개파열", compare: "오십견",
    diagnosisFocus: "팔을 특정 각도로 들 때의 통증과 힘 빠짐, 파열 크기. 가동범위 자체보다 근력 저하와 파열 정도가 핵심 판단축",
    treatmentDecision: "파열 크기, 팔 근력 저하 정도, 일상·직업 동작 제한을 본다. 부분 손상은 비수술을 먼저 보고, 완전 파열이거나 근력 저하가 크면 수술을 함께 판단",
    hospitalPoint: "파열 정도를 영상으로 확인하는지, 오십견과의 감별을 설명하는지" },
  frozen_shoulder:  { concern: "팔을 위로 올리거나 등 뒤로 돌리기가 거의 안 돼서", effect: "관절낭 유착 양상, 가동범위 제한 관점, 진행 단계 관점", hook: "옷 입기·머리 감기 동작이 어려워진 상황", keyword: "오십견", compare: "회전근개 파열",
    diagnosisFocus: "스스로 올릴 때뿐 아니라 남이 올려줘도 안 되는 가동범위 제한, 진행 단계. 근력이 아닌 관절 굳음(유착)이 핵심 판단축",
    treatmentDecision: "관절 굳음의 단계, 가동범위 제한 정도, 통증이 밤잠을 방해하는지를 본다. 대개 비수술 재활을 먼저 보고, 굳음이 심해 오래 풀리지 않으면 추가 시술을 함께 판단",
    hospitalPoint: "진행 단계를 구분해 보는지, 회전근개 파열과 감별해 재활 계획을 안내하는지" },

  // ── 발목·족부 ──
  plantar_fasciitis:{ concern: "아침에 첫 발을 디딜 때 발뒤꿈치가 찌릿해서", effect: "족저근막 부하 양상, 첫 발 통증 관점, 보행 습관 관점", hook: "아침 첫 발·오래 서 있을 때 뒤꿈치가 아픈 상황", keyword: "족저근막염", compare: "찜질·자가 치료",
    diagnosisFocus: "아침 첫 발이나 오래 앉았다 일어설 때 뒤꿈치의 찌릿한 통증, 오래 서 있는 생활습관. 이 첫 발 통증 양상이 핵심 판단축",
    treatmentDecision: "통증이 걷기·서기를 제한하는 정도, 얼마나 오래 반복됐는지, 발 부하 습관을 본다. 대체로 스트레칭·보조 등 비수술을 먼저 보고, 오래 반복되면 추가 시술을 함께 판단",
    hospitalPoint: "보행·서 있는 습관을 함께 보는지, 스트레칭·보조 지도를 병행하는지" },
  ankle_sprain:     { concern: "발목을 접질린 뒤 붓고 걷기가 힘들어져서", effect: "인대 손상 정도 관점, 부종·불안정성 관점, 재손상 관점", hook: "발목을 삐끗한 뒤 붓고 디디기 어려운 상황", keyword: "발목인대손상", compare: "찜질·자가 치료",
    diagnosisFocus: "인대 손상 정도와 부종, 발목이 자꾸 접질리는 불안정감. 단순 삠인지 인대 손상·재손상인지 감별이 핵심 판단축",
    treatmentDecision: "인대 손상 등급, 발목 불안정성, 재손상 반복 여부를 본다. 경미하면 보존치료를 먼저 보고, 불안정성이 남거나 재손상이 반복되면 추가 치료를 함께 판단",
    hospitalPoint: "인대 손상 정도를 확인하는지, 재손상 예방 재활을 안내하는지" },
  bunion:           { concern: "엄지발가락이 휘어 신발 신을 때 튀어나온 부분이 아파서", effect: "변형 각도 관점, 통증·굳은살 관점, 보존/교정 판단 관점", hook: "엄지발가락이 휘고 신발이 배기는 상황", keyword: "무지외반증", compare: "족저근막염",
    diagnosisFocus: "엄지발가락 휘어짐 각도와 튀어나온 부위의 통증·굳은살, 신발 착용 시 불편. 변형 각도와 통증 정도가 핵심 판단축",
    treatmentDecision: "변형 각도, 통증이 보행·신발 착용을 제한하는 정도, 진행 여부를 본다. 각도가 작고 통증이 견딜 만하면 보존·교정을 먼저 보고, 각도가 크고 통증이 심하면 교정 수술을 함께 판단",
    hospitalPoint: "변형 각도를 영상으로 확인하는지, 보존·교정과 수술 기준을 함께 안내하는지" },

  // ── 비수술치료 ──
  manual_therapy_ortho:{ concern: "물리치료만으로는 통증·자세가 잘 잡히지 않아서", effect: "관절·근막 접근 관점, 자세·가동범위 관점, 적용 대상 관점", hook: "일반 물리치료로 부족함을 느끼는 상황", keyword: "도수치료", compare: "일반 물리치료",
    diagnosisFocus: "통증 부위의 관절 움직임과 자세 불균형, 근막 긴장 상태. 일반 물리치료로 부족한 원인이 어디인지가 핵심 판단축",
    treatmentDecision: "관절·근막 제한 부위, 자세 불균형 정도, 통증 지속 기간을 본다. 적용 대상이 맞는지 먼저 보고, 구조적 손상이 의심되면 영상 검사를 함께 판단",
    hospitalPoint: "적용 대상 여부를 먼저 평가하는지, 자세·가동범위를 함께 보는지" },
  shockwave_ortho:  { concern: "힘줄·근막 통증이 오래 반복돼 다른 방법을 찾아서", effect: "충격파 원리 관점, 적용 부위 관점, 반복 통증 관점", hook: "만성 힘줄·발뒤꿈치 통증이 지속되는 상황", keyword: "체외충격파", compare: "스테로이드 주사",
    diagnosisFocus: "만성적으로 반복되는 힘줄·근막 통증 부위와 지속 기간. 급성 손상이 아닌 오래된 반복 통증인지가 핵심 판단축",
    treatmentDecision: "통증이 반복된 기간, 적용 부위, 다른 치료로 부족했는지를 본다. 적용 대상이면 이 방법을 고려하고, 원인 구조 손상이 크면 다른 치료를 함께 판단",
    hospitalPoint: "적용 부위가 맞는지 평가하는지, 반복 통증 원인을 함께 살피는지" },
  prolotherapy:     { concern: "인대 약화로 반복되는 통증에 다른 주사를 찾아서", effect: "인대증식 원리 관점, 반복 통증 관점, 적용 대상 관점", hook: "같은 부위 통증이 자꾸 재발하는 상황", keyword: "프롤로주사", compare: "스테로이드 주사",
    diagnosisFocus: "같은 부위 통증이 반복 재발하는 양상과 인대 약화 여부. 일시적 통증이 아닌 반복 재발이 핵심 판단축",
    treatmentDecision: "재발 반복 정도, 인대 약화 부위, 적용 대상 여부를 본다. 대상이 맞으면 이 주사를 고려하고, 다른 원인이 의심되면 검사를 함께 판단",
    hospitalPoint: "적용 대상 여부를 평가하는지, 스테로이드 주사와 차이를 설명하는지" },
  regenerten:       { concern: "회전근개 손상 진단 뒤 수술 외 방법을 찾아서", effect: "콜라겐 유도 원리 관점, 어깨 통증 관점, 적용 대상 관점", hook: "어깨 힘줄 손상으로 비수술 방법을 찾는 상황", keyword: "리제네텐", compare: "수술적 봉합",
    diagnosisFocus: "회전근개 손상 정도와 비수술 적용 대상 여부. 파열이 봉합 수술 단계인지 비수술 범위인지가 핵심 판단축",
    treatmentDecision: "손상 정도, 근력 저하 여부, 적용 대상 조건을 본다. 부분 손상이면 이 방법을 고려하고, 완전 파열이면 수술적 봉합을 함께 판단",
    hospitalPoint: "손상 정도를 영상으로 확인하는지, 수술 기준과 비수술 적용 범위를 함께 안내하는지" },
  cartilage_injection:{ concern: "관절염 진단 뒤 수술은 미루고 주사 치료를 알아봐서", effect: "관절 윤활 관점, 통증·가동범위 관점, 적용 대상 관점", hook: "무릎 관절염으로 주사 치료를 고려하는 상황", keyword: "연골주사", compare: "프롤로주사",
    diagnosisFocus: "관절염 단계와 무릎 통증·가동범위, 주사 적용 대상 여부. 마모 단계가 주사 범위인지 수술 단계인지가 핵심 판단축",
    treatmentDecision: "관절염 단계, 통증 정도, 적용 대상 조건을 본다. 초·중기면 이 주사를 고려하고, 마모가 심하면 다른 치료를 함께 판단",
    hospitalPoint: "관절염 단계를 확인하는지, 적용 대상 여부를 먼저 평가하는지" },
  elbow:            { concern: "물건을 들거나 문을 열 때 팔꿈치 바깥이 찌릿해서", effect: "힘줄 부착부 부하 관점, 반복 동작 관점, 통증 유발 동작 관점", hook: "손목을 쓰는 동작에서 팔꿈치가 아픈 상황", keyword: "팔꿈치통증", compare: "파스·찜질 자가 치료",
    diagnosisFocus: "물건을 들거나 손목을 쓸 때 팔꿈치 바깥·안쪽의 통증, 반복 동작 습관. 힘줄 부착부에 반복 부하가 걸리는 양상이 핵심 판단축",
    treatmentDecision: "통증 부위와 반복 동작 정도, 일상·업무 제한을 본다. 대체로 휴식·비수술을 먼저 보고, 오래 반복되면 추가 치료를 함께 판단",
    hospitalPoint: "반복 동작 습관을 함께 보는지, 통증 부위를 정확히 감별하는지" },
  carpal_tunnel:    { concern: "밤에 손이 저리고 타는 듯해 잠에서 깨서", effect: "정중신경 압박 관점, 손 저림·근력 관점, 야간 증상 관점", hook: "자다가 손 저림으로 깨거나 손에 힘이 빠지는 상황", keyword: "손목터널증후군", compare: "물리치료 단독",
    diagnosisFocus: "밤에 심해지는 손 저림 범위(엄지·검지·중지)와 손 근력·집기 힘 저하. 야간 증상과 저림 범위가 핵심 판단축",
    treatmentDecision: "저림 범위, 손 근력 저하 정도, 야간 증상 심함을 본다. 가벼우면 비수술을 먼저 보고, 근력 저하가 진행하면 수술을 함께 판단",
    hospitalPoint: "저림 범위와 손 근력을 확인하는지, 신경 압박 정도를 함께 보는지" },

  // ── 수술·재활 ──
  fracture_rehab:   { concern: "골절 후 깁스를 풀었는데 관절이 굳어 움직이기 힘들어서", effect: "가동범위 회복 관점, 근력 저하 관점, 재활 단계 관점", hook: "깁스 제거 후 관절이 굳고 힘이 빠진 상황", keyword: "골절재활", compare: "자가 재활",
    diagnosisFocus: "깁스 제거 후 관절 굳음 정도와 근력 저하, 골 유합 상태. 통증보다 굳은 관절의 가동범위 회복이 핵심 판단축",
    treatmentDecision: "관절 굳음 정도, 근력 저하, 재활 단계를 본다. 유합이 안정적이면 단계별 재활을 진행하고, 회복이 더디면 재활 강도를 조정해 함께 판단",
    hospitalPoint: "골 유합 상태를 확인하며 재활을 진행하는지, 단계별 재활 계획을 안내하는지" },
};

/** 치료 방향 가져오기 (없으면 기본값) */
function getDirection(treatmentId) {
  return ORTHO_DIRECTION[treatmentId] || {
    concern: "통증·기능 제한이 이어져서",
    effect:  "부위 상태·구조 관점",
    hook:    "통증으로 일상 동작이 불편해진 상황",
    keyword: "정형외과 치료",
    compare: "다른 치료",
  };
}

export const ORTHO_SYSTEM_PROMPT_V2 = `당신은 정형외과 치료 정보를 정리하는 의료정보 에디터입니다.
이 글은 개인 후기가 아니라 "일반 치료 정보 안내"입니다.
- 1인칭 체험(저는/제가/받아봤어요/느꼈어요) 금지. 객관적 정보 서술.
- 효과·회복 단정 금지(나았다/좋아졌다/완치). "~에 대해 살핍니다/안내합니다" 톤.
- 비용·회복 기간·치료 횟수 단정 금지. "개인 상태에 따라 다르며 상담 시 안내" 수준.
- 개인 타임라인(1주/1개월/3개월 경과·회복일지·통증 점수 변화) 금지.
- 병원·원장 평가·추천·CTA(상담 받아보세요) 금지. 매장명(지점명) 본문 노출 금지.
- 원장·의사 발화 인용("~라고 하셨어요") 금지.
- 실비·가격 언급 금지(환자 유인 표현).
- 의료광고법 준수: 효능·효과 보장 표현 금지.
[Purpose 원칙] 이 글의 목적은 '많이 설명하는 것'이 아니라 '사용자가 빨리 판단하도록 돕는 것'이다. 각 섹션은 검사·치료를 나열·해설하기보다 '무엇을 판단하기 위한 것인지'를 먼저 밝힌다.
[가독성 원칙] 문단당 2~3문장, 한 문장 40~70자 내외로 짧게. 만연체·긴 문단 금지. "예를 들어/또한/이러한" 등 접속 표현 남발 금지.
[문체 통일 — 필수] 모든 문장의 종결어미는 "~습니다 / ~됩니다 / ~있습니다" 존댓말체로 통일한다. "~된다 / ~한다 / ~이다 / ~중요하다" 같은 '-다'체(음슴체·평서 단정체)를 절대 섞지 말 것. 한 글 안에서 어미가 섞이면 완성도가 떨어진다 — 처음부터 끝까지 '-습니다' 계열로만 쓴다.
[나열 제약] 검사 종류는 한 번에 최대 2개, 치료 종류는 최대 2개까지만. 치료법은 '기준에 종속된 예시'로만 짧게 스치고, 가능하면 "비수술 우선 검토 / 수술 검토 조건"이라는 판단 흐름만으로 끝낸다. 약물·물리·도수를 순서대로 소개·해설하지 말 것. 같은 내용을 반복 설명하지 말 것. 한방·한의 치료는 다루지 않는다.`;

export function buildOrthoPromptV2(section, treatment, region, mode) {
  const name    = treatment.name;
  const dir     = getDirection(treatment.id);
  const compare = dir.compare || treatment.compareWith || "다른 치료";

  const isInjection = /주사|충격파|프롤로|리제네텐|연골/.test(name);
  const injectionGuide = isInjection
    ? `\n[비수술 시술 주의 ⚠️] "개선/효과/사라짐/완치" 등 효과 단정 절대 금지. 회차·비용 단정 금지. "개인차가 있으며 상담 시 안내" 수준의 일반 정보로만 서술.`
    : "";

  const isSurgery = /수술|재활|십자인대|골절|압박골절/.test(name);
  const surgeryGuide = isSurgery
    ? `\n[수술·재활 주의] 마취·회복·재활 기간은 일반 정보로만 안내. 안전·성공 단정 금지. 개인 상태·경과에 따라 다름을 명시.`
    : "";

  const aiSmellGuide = `\n[표현 금지] 후기·광고·효과단정 표현 금지:
"저는/제가/받아봤어요/느꼈어요/좋아졌어요/나았어요/효과를 봤"
"결심하고/마음먹고/추천/강추/꼭/친절/따뜻/신뢰가 갔/맞춤형/꼼꼼한/경험 많은"
"원장님이 ~라고 하셨/설명해 주셨"(발화 인용) 금지
"1주차/1개월차/3개월차/치료 후 첫날/통증 10→5점" 등 개인 타임라인·수치 변화
"OO만원/실비 적용" 등 비용·환자유인 표현
[V2 정보형 추가 금지 — 주관·광고성 표현]
"체감되는 부분이었다/체감된다"(주관) → "일반적으로 살피는 요소입니다"
"호전이 관찰될 수 있는/회복을 기대할 수 있는"(효과 암시) → "상태에 따라 진료 시 안내됩니다"
"최적의/최선의/맞춤형 접근"(광고성) → "개인 상태에 따른 접근"
"통증을 없애준다/빠르게 회복시킨다"(효과 단정) → "~에 대해 살피는 진료입니다"
[접속사·군더더기 남발 금지] "예를 들어 / 또한 / 이러한 / 이와 같이 / 뿐만 아니라"를 습관적으로 반복하지 말 것. 한 섹션에 접속 표현은 최소한으로.
- 이 글은 후기가 아니라 일반 치료 정보 안내다. 객관적·설명형으로 서술.`;

  const kwDensityGuide = `\n[키워드 밀도] "${name}"는 이 섹션 최대 2회 직접 표기. 나머지는 "이 치료/해당 치료/진료" 등으로 대체. 3회 이상 금지.`;
  const grammarGuide = `\n[조사 오류 금지] "${name}을/이/를/가" 직접 연결 금지. 띄어쓰기 또는 자연스러운 문장으로 연결.`;

  // [가독성] 모바일 가독성 — 문단·문장 길이 제한 (전 섹션 공통)
  const readabilityGuide = `\n[가독성 — 필수] 문단당 2~3문장. 한 문장은 40~70자 내외. 긴 문단·만연체 금지. 짧게 끊어 읽기 편하게.\n[문체 — 필수] 모든 문장을 "~습니다/~됩니다/~있습니다" 존댓말체로 끝낸다. "~된다/~한다/~이다/~중요하다/~살핀다" 같은 '-다'체를 한 문장도 섞지 말 것. 이 섹션 안에서 어미를 반드시 통일한다.`;
  // [Purpose] 설명이 아니라 결정을 돕는 글 — 첫 문장은 사용자 질문에 바로 답한다 (전 섹션 공통)
  const purposeGuide = `\n[Purpose — 목적] 이 글의 목적은 '설명'이 아니라 '사용자의 결정을 돕는 것'이다. 각 섹션 첫 문장은 그 섹션 제목(질문)에 바로 답하는 문장으로 시작한다. 검사·치료 용어를 나열하기 전에 '무엇을 판단하기 위한 것인지'를 먼저 제시.`;

  const G = { name, region, compare, dir, injectionGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide };

  switch (section) {
    case 'concern':           return buildConcernPrompt(G);
    case 'visitTrigger':      return buildVisitTriggerPrompt(G);
    case 'examination':       return buildExaminationPrompt(G);
    case 'treatmentDecision': return buildTreatmentDecisionPrompt(G);
    case 'checkPoint':        return buildCheckPointPrompt(G);
    case 'sceneVisit':        return buildSceneVisitPrompt(G);
    case 'closing':           return buildClosingPrompt(G);
    default: throw new Error(`[ortho-v2-prompts] 알 수 없는 섹션: ${section}`);
  }
}

// [Purpose 프레임] 검사·치료를 '설명 중심'이 아니라 '사용자 의사결정을 돕는 수단'으로 종속시킨다.

function buildConcernPrompt({ name, region, dir, injectionGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 1 — 지금 이런 상황인가요?] ⚠ 소제목(##) 출력 금지. 본문부터 바로 시작. [세션40][NOHDR-01] ${region} 지역 독자 대상, ${name} 정보를 찾는 사람이 처한 상황에 짧고 담담하게 공감.
- 이 섹션의 역할은 "공감·검색 계기"다. 길게 설명하지 말 것 — 텍스트는 짧게, 상황을 짚어 주는 정도.
- "혹시 이런 상황이신가요?"처럼 독자가 자신의 상황을 알아보게 하는 톤. 특정 개인 경험 서술 아님.
- 참고 맥락: ${dir.concern} (단정 아님, 일반 배경으로만).
- 관찰 가능한 통증 부위·유발 동작·일상 제한을 2~3개 짚어 주는 수준.
- 겁주기·효과 암시·광고성 금지. 진단·치료를 여기서 설명하지 말 것(다음 섹션 역할).
- 120~180자로 짧게 (사진이 공감을 담당하므로 텍스트는 최소).${readabilityGuide}${purposeGuide}${injectionGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildVisitTriggerPrompt({ name, region, dir, injectionGuide, surgeryGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 2 — 이럴 때 진료를 고려해볼 수 있습니다] ${name} 관련해 "언제 진료를 고려하면 좋은지" 방문 판단을 돕는 정보.
- 이 섹션의 역할은 "방문 판단"이다. 어떤 신호·지속 기간·악화 양상일 때 진료를 생각해볼 수 있는지 기준을 제시.
- "이런 경우에는 진료를 고려해볼 수 있습니다" 형식의 판단 도움 정보. 단정·강요·CTA 아님.
- 참고 맥락: ${dir.hook} (일반 배경으로만).
- 자가 대처로 지켜봐도 되는 선과 진료를 고려할 선을 구분해 주는 관점(단, 위험 과장 금지).
- 검사·치료 자체를 설명하지 말 것 — 그건 다음 섹션들 역할. 여기서는 '판단'만.
- 180~250자.${readabilityGuide}${purposeGuide}${injectionGuide}${surgeryGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildExaminationPrompt({ name, region, dir, surgeryGuide, injectionGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 3 — 진료에서는 무엇을 확인하나요?] ${name} 진료 시 무엇을 확인하는지를, '판단 기준'을 먼저 세우고 검사를 그 뒤에 '수단'으로 종속시켜 안내.
- 이 질환의 핵심 판단 기준(반드시 반영): ${dir.diagnosisFocus}. 이 판단축을 첫 문장~둘째 문장에 녹여, 다른 질환과 구별되는 이 질환 고유의 관점으로 서술한다(공통 템플릿 문장 금지).
- 첫 문장은 '무엇을 판단하기 위해 확인하는지'로 시작한다. 예: "진료에서는 먼저 현재 상태가 비수술 치료가 가능한 단계인지부터 확인합니다."
- 순서 필수: ① 위 핵심 판단 기준을 먼저 제시 → ② 그 다음 "이를 확인하기 위해 X-ray·MRI 등을 활용할 수 있습니다" 정도로 검사를 1~2줄만 붙인다.
- [나열 제약] 검사 종류는 최대 2개까지만 언급. 각 검사의 원리·과정을 길게 설명하지 말 것 — '무엇을 살피는지' 한 줄이면 충분.
- 검사는 원인을 확인하는 과정이며 확정 진단이 아님을 명시. 결과 해석은 진료 시 안내됨.
- 비용·검사 소요시간 단정은 다루지 않음.
- 200~300자.${readabilityGuide}${purposeGuide}${surgeryGuide}${injectionGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildTreatmentDecisionPrompt({ name, region, compare, dir, surgeryGuide, injectionGuide, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 4 — 치료는 어떤 기준으로 결정되나요?] (핵심 축) ${name} 치료가 '어떤 기준으로 선택되는지' 의사결정 흐름을 안내.
- 이 질환의 치료 결정 기준(반드시 반영): ${dir.treatmentDecision}. 이 기준을 그대로 판단축으로 삼아, 비수술과 수술이 갈리는 지점을 이 질환에 맞게 서술한다(약물·물리·도수·수술을 순서대로 나열·해설하지 말 것).
- 첫 문장은 '무엇을 보고 치료 방향을 정하는지'로 시작한다. 예: "치료 방향은 증상이 일상생활에 얼마나 영향을 주는지와 검사 결과를 함께 보고 결정됩니다."
- 순서 필수: ① 위 치료 결정 기준을 먼저 제시 → ② 그 기준에 따라 비수술을 먼저 보는 경우와 수술까지 고려하는 경우가 어떻게 갈리는지.
- [권장 골격 — 이 형태를 기본으로 삼는다] 이 섹션의 이상적 형태는 다음 2~3문장 구조다:
  「치료 방향은 (이 질환의 핵심 판단 기준: ${dir.treatmentDecision} 중 대표 요소 1~2개)을(를) 종합해 결정합니다. 증상이 가볍고 일상에 큰 지장이 없으면 비수술적 치료를 우선 검토하며, (이 질환에서 수술을 함께 보는 악화 신호)가 확인되는 경우에는 수술적 치료 여부도 함께 판단할 수 있습니다.」
  이 골격을 질환에 맞게 변주하되, 여기서 크게 벗어나 문장을 늘리지 말 것.
- [치료 작동 설명 금지] 비수술·수술이 '무엇을 하는지'(근육 긴장 완화·통증 감소·손으로 조작·물리치료 단독의 한계 등)를 설명하지 말 것. 이 섹션은 '무슨 치료인지'가 아니라 '어떤 기준으로 무엇을 먼저 보는지'만 다룬다.
- [분량 하드 제약 — 필수 준수] 이 섹션은 5~6문장 이내로 끝낸다. 아래를 모두 지킨다:
  · "비수술"과 "수술"은 각각 최대 1회만 언급(반복 금지).
  · 같은 판단 기준(보행 거리·통증 정도·신경 압박 등)을 두 번 이상 되풀이하지 말 것 — 한 번만.
  · "상담 시 결정됩니다 / 개인 상태에 따라" 류의 마무리 문장은 글 전체에서 1회만.
  · 지역명("${region}")을 이 섹션에서 다시 넣지 말 것("예를 들어 ${region}…" 같은 정보 없는 문장 금지).
  · 뜻이 겹치는 문장을 늘려 쓰지 말 것. 한 번 말한 것은 다시 말하지 않는다.
- ${name}과 "${compare}"의 구분은 '어떤 상황에 어느 쪽을 고려하는지' 한 문장 안에서 자연스럽게 스칠 때만 넣고, 억지로 "A와 B는 각각의 상황에 따라…" 같은 대비 문장을 만들지 말 것(어색하면 생략).
- 참고 방향: ${dir.effect} (효과 단정 아님, 살피는 관점으로만).
- [금지] 한방·한의 치료 언급 금지(Purpose 흐름을 끊음). 효과 단정 금지("사라진다/빠르게 회복된다"). 비용·회복 기간·회차 단정 금지("보통 3회").
- "개인 상태에 따라 상담 시 결정됩니다" 수준.
- 180~260자로 짧게(넘기지 말 것).${readabilityGuide}${purposeGuide}${surgeryGuide}${injectionGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildCheckPointPrompt({ name, region, dir, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 5 — 병원 선택 시 확인할 점] 사용자가 병원을 판단할 때 확인하면 좋은 기준을 정리.
- 이 섹션의 역할은 "사용자 판단 기준" 제공이다.
- 이 질환 특유의 확인 포인트(반드시 1개 이상 반영): ${dir.hospitalPoint}. "비수술·수술 모두 다루는 병원" 같은 모든 질환 공통 문장만 반복하지 말고, 이 질환에 맞는 포인트를 섞어 준다.
- 정형외과 전문의 여부, 치료 분야가 본인 증상과 맞는지, 재활·주의사항 안내 여부 등 일반 기준은 1~2개만 곁들인다.
- 특정 병원 추천·홍보 아님. 사용자가 스스로 판단할 항목을 정리하는 형식(항목식 가능).
- 200~300자.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildSceneVisitPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 6 — 진료실과 검사실에서 확인하는 과정] 진료실·검사실의 실제 장면을 그리며 방문 안내를 함께.
- 이 섹션의 역할은 "장면 묘사 + 방문 안내로 신뢰 형성"이다(사진과 함께 배치되는 자리).
- [불안완화형] 과정을 '설명'하지 말고, 처음 오는 사람의 불안을 줄이는 방향으로. "처음 방문하시면 이런 순서로 진행됩니다" 톤으로 흐름을 담담히 안내.
- 진료실에서 모니터로 영상을 함께 보며 설명을 듣는 장면 등 실제 공간 장면을 1개 정도 짧게 묘사.
- 방문 시 일반 흐름(접수 → 상담 → 검사 → 상태 확인 → 계획 안내)을 자연스럽게 안내하되 각 단계를 길게 풀지 말 것.
- 개인 타임라인·회복일지·후기·원장 발화 인용·비용 안내·매장명 노출 금지.
- 150~250자.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

function buildClosingPrompt({ name, region, aiSmellGuide, kwDensityGuide, grammarGuide, readabilityGuide, purposeGuide }) {
  return `[섹션 7 — 마무리] 일반 안내 수준으로 짧게 정리하며 마무리.
- 개인 변화·예약 예정·후기·추천·비용 표현 전면 금지.
- "통증이 지속되면 정형외과 전문의와 상담을 통해 적절한 치료 계획을 세우는 것이 좋습니다" 수준의 일반 안내.
- ${region} + ${name} 키워드 자연스럽게 1회 이내 포함 가능.
- 100~150자로 간결하게.${readabilityGuide}${purposeGuide}${aiSmellGuide}${kwDensityGuide}${grammarGuide}`;
}

/** 섹션별 이미지 ALT — 정보형 7섹션 */
export function getOrthoImageAltsV2(treatment, region, activeKeyword, mode) {
  const name    = treatment.name;
  const ak      = activeKeyword || name;
  const fullKw  = region + " " + ak;
  return {
    concern:           "[이미지: " + region + " 정형외과 " + ak + " 증상 상황 | " + ak + " 공감 안내]",
    visitTrigger:      "[이미지: " + region + " 정형외과 " + ak + " 진료 고려 시점 | " + fullKw + " 방문 판단]",
    examination:       "[이미지: " + region + " 정형외과 " + ak + " 진료 확인 과정 | " + fullKw + " 검사 정보]",
    treatmentDecision: "[이미지: " + fullKw + " 치료 결정 기준 | " + ak + " 치료 선택 정보]",
    checkPoint:        "[이미지: " + fullKw + " 병원 선택 확인 | " + ak + " 판단 항목]",
    sceneVisit:        "[이미지: " + region + " 정형외과 진료실 검사실 | " + fullKw + " 방문 안내]",
    closing:           "[이미지: " + fullKw + " 치료 정보 | " + ak + " 안내]",
  };
}

export { ORTHO_DIRECTION };
