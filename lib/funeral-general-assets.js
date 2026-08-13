// ════════════════════════════════════════════════════════════════════
// [GENERAL-ASSET-V2] 검증된 일반 장례정보 자산 — 시설 무관 공통 계층.
//
//   존재 이유: AI가 일반 장례상식을 자유 생성하면 낡거나 부정확한 관례가 섞인다
//   (실증: "여성은 검은색 정장이나 한복"). 자유 생성을 막으면 본문이 짧아지고,
//   짧아지는 것을 막으려 다시 생성을 열게 된다. 이 순환은 검증된 문장을
//   미리 고정해 두는 것으로만 끊긴다.
//
//   ★ AI의 역할: 무엇을 말할지 정하지 않는다. 제공된 문장의 배열과 어미 조정만.
//
//   ★ V2에서 바뀐 것 = 반복 문제의 원인 특정.
//     V1은 "축"을 다양화했지만 A01·A02가 둘 다 빈소, A08·A09가 둘 다 입관이라
//     축 3개를 골라도 실제 개념은 2개일 수 있었다. 그리고 28문장 중 14문장이
//     "장례마다 다르다"(variability) 한 종류였다.
//     → 통제 단위를 축이 아니라 concept + group 으로 바꾼다.
//
//   ★ group 정의
//     definition  — 무엇을 뜻하는가
//     role_space  — 어디에 / 무엇에 쓰이는가
//     variability — 경우마다 다름 (정보를 주는 주축이 아니라 단정을 완충하는 보조)
//
//   ★ 문장 작성 규약 (사람이 자산을 추가할 때 지키는 기준):
//     - 수치 금지 (수치가 들어가면 미검증 시설 Facts가 된다)
//     - 시설명 주어 금지 — "일반적으로 ~합니다" 형태만
//     - 평가·권장 형용 금지 / 확인·상담 권유 금지
//     - 경험·사례 서술 금지 (조문객 수, 실제 장례 진행 등)
//     - 지역·시대 관례 단정 금지 (예: "장남이 상주를 맡는다")
//     - 절차 간 후속 순서 일반화 금지 (예: "입관 후 조문")
//     - 필수 구성항목·필수 조건처럼 읽히는 열거 금지
//     - 문장당 사실 1개
//
//   ★ 등급 F(시설 Facts 게이트) 축은 여기 넣지 않는다:
//     면적·요금·좌석·편의시설 유무·내부 동선·화장장 연계 = funeral_halls_* 소관.
//   ★ 등급 H(보류) 축 미포함: 빈소 배정 시점 / 안치 기간 / 입관 참여 주체 /
//     조문 시간대 / 발인 이후 이동 / 화장시설 운영 / 상조 역할 구분 / 주차 확인항목.
//   ★ 상복(복장) HOLD — "한복" 오류와 인접 영역. 열지 않는다.
//   ★ 등급 X(금지): 비용 일반 — 개방하지 않는다.
// ════════════════════════════════════════════════════════════════════

export const FUNERAL_GENERAL_ASSETS = {
  // ── 시설 개념축 (INTENT room / mortuary 연결) ──────────────────
  hallRole: {
    id: "A01",
    label: "빈소의 역할",
    concept: "hall",
    intent: "room",
    maxPick: 2,
    sentences: [
      { t: "빈소는 고인을 모시고 조문을 받는 공간입니다.",              g: "definition" },
      { t: "빈소에는 고인의 영정과 위패를 모시는 자리가 마련됩니다.",   g: "role_space" },
      { t: "빈소는 장례 기간 동안 유가족이 머무르는 공간이기도 합니다.", g: "role_space" },
      { t: "빈소의 구성과 이용 조건은 장례식장마다 다르게 정해집니다.", g: "variability" },
    ],
  },

  hallChoice: {
    id: "A02",
    label: "빈소 선택에서 달라지는 것",
    concept: "hall",
    intent: "room",
    maxPick: 2,
    // ★ 이 자산은 "확인한다"가 아니라 "달라진다"를 서술한다.
    //   현행 [확인·점검 권유 금지] 잠금과의 표면형 접촉을 피하기 위한 설계.
    //   ★ 4문장 전부 variability — V2 규칙 아래에서 한 글에 최대 1문장만 소비된다.
    sentences: [
      { t: "빈소 선택에 영향을 주는 이용 조건은 장례마다 다를 수 있습니다.", g: "variability" },
      { t: "빈소마다 딸린 공간의 구성이 다를 수 있습니다.",                  g: "variability" },
      { t: "빈소 선택은 장례 형태에 따라서도 달라집니다.",                   g: "variability" },
      { t: "빈소의 이용 조건은 장례식장마다 다르게 정해져 있습니다.",        g: "variability" },
    ],
  },

  mortuaryRole: {
    id: "A05",
    label: "안치실의 역할",
    concept: "mortuary",
    intent: "mortuary",
    maxPick: 2,
    sentences: [
      { t: "안치실은 고인을 모시는 공간입니다.",                        g: "definition" },
      { t: "안치실은 장례를 준비하는 동안 고인이 머무는 자리입니다.",   g: "role_space" },
      { t: "안치는 고인을 모셔 두는 것을 가리키는 말입니다.",           g: "definition" },
      { t: "안치실의 규모와 운영 방식은 장례식장마다 다릅니다.",        g: "variability" },
    ],
  },

  // ── 일반 절차축 (INTENT process — 시설 Facts 없이도 성립) ──────
  //   ★ 기존 _HALL_SELECT_AXES 7축은 전부 시설 Facts 필드 파생이라
  //     입관·발인 자산이 들어갈 자리가 없다. 그래서 별도 풀로 둔다.
  encoffinDef: {
    id: "A08",
    label: "입관의 뜻",
    concept: "encoffin",
    intent: "process",
    maxPick: 2,
    // ★ "별도로 마련된 공간에서 진행됩니다"는 입관실 존재 함의라 제외했다
    //   ([미등록 시설 존재 창작 금지] 잠금에 입관실이 명시 열거되어 있다).
    //   공간이 아니라 시간으로 서술한다.
    sentences: [
      { t: "입관은 고인을 관에 모시는 절차를 말합니다.",                    g: "definition" },
      { t: "입관은 장례 절차 가운데 하나로 진행됩니다.",                    g: "role_space" },
      { t: "입관이라는 말은 관에 모신다는 뜻에서 비롯됩니다.",              g: "definition" },
      { t: "입관은 장례 진행 과정에서 별도의 시간을 두고 이루어집니다.",    g: "role_space" },
    ],
  },

  encoffinPrep: {
    id: "A09",
    label: "입관 준비 절차",
    concept: "encoffin",
    intent: "process",
    maxPick: 2,
    // ★ "수의" 미사용 — 수의 착용은 장례 형태·가족 결정에 따라 달라져
    //   필수 절차로 단정할 근거가 없다. 최소 정의형으로만 서술한다.
    sentences: [
      { t: "입관에 앞서 고인을 정돈하고 입관을 준비하는 절차가 진행됩니다.",     g: "role_space" },
      { t: "고인을 정돈하는 과정은 입관 절차의 일부로 다루어집니다.",            g: "role_space" },
      { t: "입관 준비에 포함되는 내용은 장례마다 다를 수 있습니다.",             g: "variability" },
      { t: "입관 준비 절차를 부르는 이름은 경우에 따라 다르게 쓰이기도 합니다.", g: "variability" },
    ],
  },

  processVariance: {
    id: "A11",
    label: "진행 순서의 변동성",
    concept: "procedure",
    intent: "process",
    maxPick: 2,
    // ★ 단정이 아니라 단정 불가를 서술하는 자산. 관례 일반화 위험이
    //   구조적으로 없고, 다른 자산의 단정 톤을 눌러주는 완충으로 작동한다.
    //   ★ 4문장 전부 variability → V2에서 한 글 최대 1문장. 정상 동작이다.
    sentences: [
      { t: "입관을 포함한 장례 진행 순서는 장례마다 다르게 정해집니다.",  g: "variability" },
      { t: "각 절차에 걸리는 시간도 일정하게 정해져 있지 않습니다.",      g: "variability" },
      { t: "장례 진행 순서는 모든 경우에 동일하게 적용되는 것은 아닙니다.", g: "variability" },
      { t: "같은 절차라도 진행 방식은 장례마다 차이가 있습니다.",         g: "variability" },
    ],
  },

  funeralDepartDef: {
    id: "A21",
    label: "발인의 뜻",
    concept: "depart",
    intent: "process",
    maxPick: 2,
    // ★ "발인은 장례 마지막 날에 이루어집니다"는 3일장 전제가 깔린
    //   관례 단정이라 제외했다. 화장시설·장지는 언급하지 않는다
    //   ([화장장은 Facts 있을 때만] 잠금).
    sentences: [
      { t: "발인은 고인이 장례식장을 떠나는 절차를 말합니다.",        g: "definition" },
      { t: "발인이라는 말은 고인을 모시고 떠난다는 의미로 쓰입니다.", g: "definition" },
      { t: "발인 시각은 장례마다 다르게 정해집니다.",                g: "variability" },
      { t: "발인 이후의 일정은 장례마다 다르게 정해집니다.",          g: "variability" },
    ],
  },

  // ── [V2 신규] 정의형 6개념 ────────────────────────────────────
  //   ★ 정의형을 늘린 이유: V1 자산의 50%가 variability 였다.
  //     안전하게 쓰려다 보니 단정을 피하는 형태가 가장 통과하기 쉬웠고,
  //     그 결과 "다르다"만 반복하는 글이 나왔다.
  //     정의형은 지역·시대차가 없어 가장 안전하면서 실제 정보를 준다.
  condolence: {
    id: "V01",
    label: "조문",
    concept: "condolence",
    intent: "process",
    maxPick: 2,
    // ★ 복장·방명록 작성 순서 등 예절 안내는 넣지 않는다(상복 HOLD / 조문 시간대 H등급).
    sentences: [
      { t: "조문은 고인을 기리고 유가족을 위로하기 위해 빈소를 찾는 일을 말합니다.", g: "definition" },
      { t: "조문이라는 말에는 고인을 애도한다는 뜻이 담겨 있습니다.",                g: "definition" },
      { t: "조문은 빈소가 마련된 기간 동안 이루어집니다.",                          g: "role_space" },
    ],
  },

  obituary: {
    id: "V02",
    label: "부고",
    concept: "obituary",
    intent: "process",
    maxPick: 2,
    // ★ V02-3은 "고인과 상주, 빈소가 마련된 곳" 열거형이었으나
    //   부고의 필수 구성항목처럼 읽혀 용도 서술로 낮췄다.
    sentences: [
      { t: "부고는 상을 당한 사실을 알리는 통지를 말합니다.",         g: "definition" },
      { t: "부고라는 말은 슬픈 소식을 전한다는 뜻에서 비롯됩니다.",   g: "definition" },
      { t: "부고는 고인과 장례에 관한 소식을 알리는 데 쓰입니다.",    g: "role_space" },
    ],
  },

  portrait: {
    id: "V03",
    label: "영정·위패",
    concept: "portrait",
    intent: "room",
    maxPick: 2,
    sentences: [
      { t: "영정은 빈소에 모시는 고인의 사진이나 초상을 말합니다.",        g: "definition" },
      { t: "위패는 고인의 이름을 적어 모시는 표석을 말합니다.",            g: "definition" },
      { t: "영정과 위패는 빈소에서 고인을 모시는 자리에 함께 놓입니다.",   g: "role_space" },
      { t: "영정과 위패를 갖추는 방식은 장례마다 다를 수 있습니다.",       g: "variability" },
    ],
  },

  chiefMourner: {
    id: "V04",
    label: "상주",
    concept: "chiefMourner",
    intent: "process",
    maxPick: 2,
    // ★ "장남이 상주를 맡는다"는 지역·시대 관례 단정 — "한복"과 동일 유형이라
    //   제외하고, 누가 맡는지는 variability 로만 서술한다.
    sentences: [
      { t: "상주는 장례를 주관하는 유가족을 말합니다.",              g: "definition" },
      { t: "상주라는 말은 상을 치르는 주체라는 뜻에서 비롯됩니다.",  g: "definition" },
      { t: "상주는 빈소에서 조문을 받는 자리에 섭니다.",             g: "role_space" },
      { t: "누가 상주를 맡는지는 가족마다 다르게 정해집니다.",       g: "variability" },
    ],
  },

  guestbook: {
    id: "V05",
    label: "방명록",
    concept: "guestbook",
    intent: "room",
    maxPick: 2,
    // ★ 2문장뿐이다. 개념이 작아 늘리면 예절 안내로 넘어간다.
    //   개념당 최대 2문장 규칙과 정확히 맞으므로 부족이 아니다.
    sentences: [
      { t: "방명록은 빈소를 찾은 조문객이 이름을 남기는 기록을 말합니다.", g: "definition" },
      { t: "방명록은 유가족이 조문객을 확인하는 데 쓰입니다.",             g: "role_space" },
    ],
  },

  funeralHome: {
    id: "V06",
    label: "장례식장의 역할",
    concept: "funeralHome",
    intent: "room",
    maxPick: 2,
    // ★ V06-1은 "빈소와 안치 시설을 갖추고"였으나 시설 구성을 일반적
    //   필수조건처럼 읽을 여지가 있어 이용 목적 서술로 낮췄다.
    sentences: [
      { t: "장례식장은 장례를 치르기 위해 이용하는 시설을 말합니다.",        g: "definition" },
      { t: "장례식장은 조문객이 고인을 찾아뵐 수 있는 자리를 제공합니다.",   g: "role_space" },
      { t: "장례식장이 갖춘 시설의 구성은 곳마다 다릅니다.",                 g: "variability" },
    ],
  },

  // ── [V3 · EXPANSION-02] 신규 concept 7개 / 9문장 ────────────────
  //   ★ 확장 KPI 전환 — 문장 수가 아니라 usable concept coverage.
  //     소비 상한 = 선택 concept 수 × maxPerConcept(2). 기존 concept에 문장을
  //     더 넣으면 pool 다양성만 늘고 본문 분량은 1문장도 늘지 않는다.
  //     이번 증분은 +9문장 / +7 concept (11 → 18) — 전량 신규 concept이다.
  //   ★ variability 0 — maxVariability=1 때문에 추가해도 순증이 없다.
  //   ★ 신규 5개(성복·조문객·상례·운구·분향헌화)가 intent:process 이므로
  //     GENERAL_ONLY_ASSET_KEYS 경로(Facts 0건)에서도 열린다 → 본문 하한 상승.
  //   ★ 기각 이력(같은 실수 반복 방지):
  //     - 유가족·장례·상여·고인 = 사전 첫 페이지 수준 정의. 독자 정보 순증 작음.
  //     - 영결식 = 신규 concept이나 2번째 문장을 만들려면 시점·주체 일반화로 간다.
  //     - "장례식장은 조문객이 머물 자리를 함께 둡니다" = 미등록 공간 존재 함의.
  //     - "성복을 마친 뒤에는 …" = 절차 간 후속 순서 일반화 잠금 정면 위반.
  //       ★ 입관→발인 구간은 개념 단위로만 열리고 '순서'로는 열리지 않는다.
  mourningRite: {
    id: "V07",
    label: "성복",
    concept: "mourningRite",
    intent: "process",
    maxPick: 2,
    // ★ 복장의 형태·색은 쓰지 않는다 — 상복(복장) HOLD 영역. 절차 용어로만 정의한다.
    sentences: [
      { t: "성복은 상을 당한 유가족이 상복을 갖춰 입는 절차를 말합니다.", g: "definition" },
      { t: "성복이라는 말은 상복을 입는다는 뜻에서 비롯됩니다.",         g: "definition" },
    ],
  },

  mourner: {
    id: "V08",
    label: "조문객",
    concept: "mourner",
    intent: "process",
    maxPick: 2,
    // ★ condolence(V01)는 '빈소를 찾는 일'이라는 행위, 이쪽은 주체 정의로 분리된다.
    //   유가족 범위 정의는 넣지 않는다(가족·친족으로 고정할 근거가 없다).
    sentences: [
      { t: "조문객은 빈소를 찾아 조문하는 사람을 말합니다.", g: "definition" },
    ],
  },

  funeralTerm: {
    id: "V09",
    label: "상례",
    concept: "funeralTerm",
    intent: "process",
    maxPick: 2,
    // ★ '장례' 정의는 넣지 않는다 — 순환 정의에 가깝고 정보 밀도가 낮다.
    sentences: [
      { t: "상례는 상을 치르는 일 전반을 이르는 말입니다.", g: "definition" },
    ],
  },

  bier: {
    id: "V10",
    label: "운구",
    concept: "bier",
    intent: "process",
    maxPick: 2,
    // ★ 차량·인원·이동 경로는 쓰지 않는다(H등급 발인 이후 이동).
    //   '상여'는 현대 장례식장 안내 글에서 활용도가 낮아 제외했다.
    sentences: [
      { t: "운구는 고인을 모신 관을 옮기는 일을 말합니다.", g: "definition" },
    ],
  },

  condolenceAct: {
    id: "V11",
    label: "분향·헌화",
    concept: "condolenceAct",
    intent: "process",
    maxPick: 2,
    // ★ 순서·횟수·절하는 방식·종교별 차이는 쓰지 않는다(관례 단정).
    //   분향과 헌화 중 무엇을 하는지도 서술하지 않는다 — 택일 관계를 단정하게 된다.
    sentences: [
      { t: "분향은 빈소에서 향을 피워 고인을 기리는 일을 말합니다.", g: "definition" },
      { t: "헌화는 고인을 기리며 꽃을 올리는 일을 말합니다.",        g: "definition" },
    ],
  },

  condolenceFlower: {
    id: "V12",
    label: "조화",
    concept: "condolenceFlower",
    intent: "room",
    maxPick: 2,
    // ★ 보내는 방법·업체·비용은 쓰지 않는다(등급 X 비용 / 상업 유도).
    sentences: [
      { t: "조화는 조의를 표하기 위해 빈소에 보내는 꽃을 말합니다.",          g: "definition" },
      { t: "조화는 빈소를 찾기 어려울 때 조의를 전하는 방법으로도 쓰입니다.", g: "role_space" },
    ],
  },
};

// 시설 Facts 축(_HALL_SELECT_AXES)에 대응하는 자산 키 — 전면축과 화제를 맞춘다.
export const GENERAL_ASSETS_BY_INTENT = {
  room:     ["hallRole", "hallChoice", "portrait", "guestbook", "funeralHome",
             "condolenceFlower"],
  mortuary: ["mortuaryRole"],
  process:  ["encoffinDef", "encoffinPrep", "processVariance", "funeralDepartDef",
             "condolence", "obituary", "chiefMourner",
             "mourningRite", "mourner", "funeralTerm", "bier", "condolenceAct"],
};

// Facts 축이 없을 때도 열리는 축 — 시설 Facts 0건에서도 본문이 선다.
export const GENERAL_ONLY_ASSET_KEYS = GENERAL_ASSETS_BY_INTENT.process;

// ★ V2 소비 규칙 — 반복의 원인은 축이 아니라 개념·의미 중복이었다.
export const GENERAL_ASSET_RULES = {
  minConcepts:        3,   // 서로 다른 concept 최소
  maxPerConcept:      2,   // 같은 concept 최대 문장
  maxVariability:     1,   // variability 최대 (하한 없음 — 0문장이 성공 사례다)
  targetSentences:    [6, 8], // 목표 관측치. 강제 분량이 아니다.
};

// 동시 선택 금지 문장쌍 — concept 이 달라도 같은 그림을 두 번 말하는 조합.
//   "<자산키>:<0-based index>" 표기.
export const GENERAL_ASSET_EXCLUSIVE_PAIRS = [
  ["hallRole:3", "hallChoice:3"],   // "장례식장마다 다르게 정해집니다" 문형 중복
  ["hallRole:1", "portrait:2"],     // 영정·위패 자리를 두 번 말함
  ["funeralHome:0", "hallRole:0"],  // 장례식장/빈소 역할 중복 서술
  ["funeralHome:0", "mortuaryRole:0"], // 장례식장/안치실 역할 중복 서술
];
