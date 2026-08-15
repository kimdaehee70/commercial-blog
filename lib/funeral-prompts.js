// lib/funeral-prompts.js
// 상조(funeral) 프롬프트. 화자 = 장례지도사(상조회사 안내자). 정보형.
// 구조는 narrative가 소유 — SYSTEM_PROMPT가 강제하지 않는다. 공통 골격: 도입부→본론→정리.
// 복사 베이스: daycare-prompts.js → 화자/금지/정보톤 교체
// 규제: 할부거래법(선불식 할부거래) — 환급·수익 단정 금지 / 감성 과장 금지
import {
  FUNERAL_FORBIDDEN, FUNERAL_INFO_BLOCKS,
  // [세션59] 판단자산 본문배선 — Context Injection 소스(읽기 전용, 데이터 무손상)
  FUNERAL_HALL_DATA, FUNERAL_PRODUCT_DATA, FUNERAL_COST_DATA, FUNERAL_FAQ_DATA,
} from "./funeral-data.js";
// [GENERAL-ASSET-V1] 검증된 일반 장례정보 자산 (시설 무관 공통 계층, 읽기 전용)
import {
  FUNERAL_GENERAL_ASSETS,
  GENERAL_ASSETS_BY_INTENT,
  GENERAL_ONLY_ASSET_KEYS,
  GENERAL_ASSET_EXCLUSIVE_PAIRS,
  GENERAL_ASSET_RULES,
  GENERAL_ASSET_TOPIC_GROUP,
  // [PRACTICAL-ASSET-01B] 실용 안내층 — 공급·선택은 자산 파일 소관. 여기서는 소비만 한다.
  pickPracticalSentences,
} from "./funeral-general-assets.js";
// [FUNERAL-BODY-TOPIC-COMPOSER-01] 신규 경로. 기존 flow 함수는 무수정이다.
import { composeTopicPlan, flowHallTopic } from "./funeral-topic-composer.js";

// 공통 광고형 금칙어(PHILOSOPHY) + 업종 고유 금칙어 합산
const COMMON_AD_FORBIDDEN = [
  "강추", "원조", "찐맛집", "인생맛집", "최고였어요", "꼭 가보세요",
  "미친", "역대급", "숨은 맛집", "강력추천",
];
export const FORBIDDEN = [...COMMON_AD_FORBIDDEN, ...FUNERAL_FORBIDDEN];

export const SYSTEM_PROMPT = `
당신은 {region} 상조회사의 안내 글을 쓰는 장례지도사입니다.
글의 목적은 장례를 앞둔 유가족이 절차·비용·장례식장을 판단하도록 돕는 정보 제공입니다.

[화자]
- 반드시 장례지도사 화자. 도입 인사: "안녕하세요. {hallSpeaker}장례지도사입니다."
- 회사(상조회사) 상호명은 본문에 절대 쓰지 않는다. 지역명 단독 반복도 하지 않는다.
- 1인칭 후기형 금지. 유가족 체험담·인터뷰·성공사례 금지.

[장례식장명 표기 — C-1 확정 규칙]
- 프롬프트에 [장례식장]이 주어지면 그 명칭을 본문에 그대로 쓴다. "이 지역 장례식장"·"이곳"으로 일반화하지 말 것.
- 장례식장은 홍보 대상이 아니라 '정보 대상'이다. 유가족이 검색해 찾아온 시설이므로 명칭을 밝혀 안내한다.
- 도입·시설 안내·절차 설명·마무리에 걸쳐 자연스럽게 3~5회 사용. 한 문단에 몰아 쓰지 말 것.
- 장례식장에 대한 평가·추천·홍보 표현 금지(좋다/최고/추천 등). 사실 안내와 확인 기준만.
- [장례식장]이 주어지지 않으면 "장례식장"으로 일반 서술한다(억지 명칭 생성 금지).

[톤]
- 정보형. 절차(임종·안치·빈소·발인·화장)와 비용 구조를 차분하고 정확하게 안내.
- 유가족의 막막함(무엇부터·얼마나·어디서)에 답하는 흐름.
- 감성 과장·슬픔 강조·광고·상조 가입 강권 금지. 사실 안내 우선.

[중심 축 — C-3-1]
- 글의 주인공은 상품이 아니라 '담당 장례지도사'다. 유가족은 상품을 고르기 전에 누가 진행해 주는지를 먼저 확인한다.
- 상품명·가격·구성 비교를 본문 중심에 두지 않는다(하단 상품 블록 소관). 본문은 "이 상황을 누가 어떻게 진행하는가"를 다룬다.
- 장례 절차 나열은 글 앞부분에 두지 않는다. 장례지도사가 진행하는 일로 후반에 녹인다.

[비용 표현 — 중요]
- 장례비용은 빈소 규모·조문 기간·화장 여부에 따라 변동. 세부 금액 단정 금지.
- "빈소 임대료·식대·용품·화장료로 구성된다" 수준의 구조 안내만.
- 정확한 총액 확정 표기 금지 → "정확한 금액은 상담 시 안내" 톤.

[상조 표현 — 할부거래법 정합]
- 선불식 상조 언급 시 해약환급금·공정위 등록 '확인 기준'만 안내.
- 원금 보장·100% 환급·수익률 등 단정 표현 전면 금지.
- 가입 권유·선택 강권 금지. "확인 후 판단" 톤.

[금지]
- 유가족 후기·체험·감성 과장(눈물·슬픔·마지막 가시는 길 등)
- 광고 표현(${FORBIDDEN.join(" / ")})
- 상조회사명(업체 상호) 본문 직접 노출 (placeholder {storeName}도 쓰지 말 것)
- ※ 장례식장명은 금지 대상이 아니다 — 위 [장례식장명 표기] 규칙에 따라 노출한다.
- 문단 반복 / 항목 혼용 / AI 논문체(정리하면·결론적으로·따라서·살펴보겠습니다)
- 지역+업종 결합 4회 이상 (3회 이하 유지, 이후 "이 지역/근처/저희" 자연 치환)

[필수]
- 핵심 키워드 자연 반복 (강제 횟수 없음 — 장례식장명·가족장·절차 등 키워드가 분산되므로 억지 반복 금지)
- 지역+업종(상조·장례) 자연스럽게 노출 (결합 4회 이상 과밀 금지)
- 정보블럭(절차/비용/형태/상조 기준) 포함
- 사진 유도 자연스럽게(빈소 안내·절차 자료·상담)

[판단 근거 소비 — 핵심]
아래 [판단 근거] 섹션이 프롬프트에 제공되면 반드시 따른다. 없으면 무시한다.
- 시설·비용·항목을 존재/유무만 나열하고 끝내지 말 것. (예: "주차장이 있습니다" ❌)
- 제공된 판단 근거를 본문 전체에서 최소 1회 이상 실제로 활용할 것 — "누가·왜 확인해야 하는지"로 연결.
- 조건형으로 서술할 것. 가족 상황(조문객 수·기간·예산 등)에 따라 판단이 달라진다는 흐름. ("~라면 ~할 수 있습니다")
- 추천·평가·광고 표현 금지. 특정 시설·상품을 좋다/나쁘다로 단정하지 말 것. 트레이드오프는 장점과 부담을 함께 둘 것.
`.trim();

// [세션59] Context Injection — treatment.cat에 맞는 판단 자산만 선별 (Prompt도 One Axis)
//   데이터는 읽기만. 절차형은 자산 미주입(DIRECTION.effect로 충분) + 절차 FAQ 일부만.
function _buildDecisionAssets(treatment, hallFacts = null) {
  const cat = treatment?.cat || "";
  const lines = [];

  // [C-3-2 / 01D] 실데이터(hallFacts)가 들어온 장례식장 글에는 범용 판단자산을 주입하지 않는다.
  //   범용 selectionGuide(조문객수→빈소크기)·checkPoints가 등록되지 않은 사실을 창작하게 만들기 때문.
  //   hallFacts가 없을 때(=일반 안내글)는 기존 동작 유지.
  const _hallHasFacts = cat === "장례식장" && !!hallFacts && Object.keys(hallFacts).length > 0;

  if (cat === "장례식장" && _hallHasFacts) {
    // 판단자산 미주입 — [확인된 시설 정보]만 근거로 사용한다.
  } else if (cat === "장례식장") {
    lines.push("· 조문 규모별 빈소 선택 기준:");
    (FUNERAL_HALL_DATA.selectionGuide || []).forEach((g) =>
      lines.push(`  - ${g.mourners} → ${g.hallSize} (${g.note})`)
    );
    lines.push("· 장례식장에서 확인해야 할 점 (왜 중요한지):");
    (FUNERAL_HALL_DATA.checkPoints || []).forEach((c) =>
      lines.push(`  - ${c.item}: ${c.why}`)
    );
  } else if (cat === "장례비용") {
    lines.push("· 비용이 달라지는 결정 요소:");
    (FUNERAL_COST_DATA.decisionFactors || []).forEach((f) => lines.push(`  - ${f}`));
    lines.push("· 조문 규모별 비용 방향:");
    (FUNERAL_COST_DATA.byScale || []).forEach((s) =>
      lines.push(`  - ${s.mourners}: ${s.direction} (${s.drivers})`)
    );
    lines.push("· 놓치기 쉬운 추가 비용:");
    (FUNERAL_COST_DATA.extraCosts || []).forEach((e) => lines.push(`  - ${e}`));
  } else if (cat === "장례형태") {
    lines.push("· 형태별 적합한 가족 상황(상황 매칭, 강권 금지):");
    (FUNERAL_PRODUCT_DATA || []).forEach((p) =>
      lines.push(`  - ${p.name}: ${p.feature} / 적합한 경우: ${p.fitWhen}`)
    );
  } else if (cat === "상조서비스") {
    lines.push("· 상조 상품별 적합 상황:");
    (FUNERAL_PRODUCT_DATA || []).forEach((p) =>
      lines.push(`  - ${p.name}: ${p.fitWhen}`)
    );
    lines.push("· 비용이 달라지는 결정 요소:");
    (FUNERAL_COST_DATA.decisionFactors || []).forEach((f) => lines.push(`  - ${f}`));
  } else if (cat === "장례절차") {
    // 절차형: 판단자산 미주입. 검색자가 즉시 궁금해하는 절차 FAQ만 소량.
    const procFaq = (FUNERAL_FAQ_DATA || []).filter((f) =>
      /먼저|사망진단서|화장|예약/.test(f.q)
    ).slice(0, 2);
    if (procFaq.length) {
      lines.push("· 임종 직후 판단이 필요한 지점(절차 연결):");
      procFaq.forEach((f) => lines.push(`  - ${f.q} → ${f.a}`));
    }
  }

  if (!lines.length) return "";
  return `\n[판단 근거 — 본문에 반드시 녹여 쓸 것 (나열 금지, 조건형으로)]\n${lines.join("\n")}`;
}

// buildPrompt: 서비스(treatment)·지역·DIRECTION을 받아 본문 생성 지시 구성
// ════════════════════════════════════════════════════════════════════
// [C-3-1] Search Intent 축 분리 (2026-07-18 확정)
//   상조 검색은 한 종류가 아니다. 검색자가 다르면 글의 주인공도 달라진다.
//     · 조문객·시설 이용축 (cat === "장례식장")  → 장례식장 정보가 주인공  [C-3-2에서 재설계]
//     · 유가족 결정축     (그 외 4개 cat)        → 장례지도사가 주인공     [본 축]
//   유가족축 흐름: 장례 상황 → 불안 → 누가 해결하는가 → 장례지도사 역할 → 비용 판단 → 상담
//   원칙: 상품은 주인공이 아니라 '해결 수단'. 절차 설명은 SEO용이 아니라 신뢰 형성용 → 후반 배치.
// ════════════════════════════════════════════════════════════════════
const HALL_INTENT_CATS = ["장례식장"];

export function resolveFuneralIntent(treatment) {
  const cat = treatment?.cat || "";
  return HALL_INTENT_CATS.includes(cat) ? "hall" : "bereaved";
}

// [C-4] 유가족 결정축 — 절차 나열이 아니라 '상황별 판단'.
//   근거(실측 2026-07-18): 순서는 정확한데 "우리 가족은 어떻게 해야 하는가"가 없다.
//     ① 장례지도사 개입이 "즉시 출동"에서 끊김 → 실제 상담 흐름과 다름
//     ② 절차가 순서만 나열 → 왜 그 순서인지 없음(정보 가치 낮음)
//     ③ 비용이 항목 나열 → 무엇이 비용을 바꾸는지 없음
//     ④ 마무리가 "지금 상담하세요" → 광고톤
const _FLOW_BEREAVED_BASE = `
[글 구성 — 이 순서를 지킬 것]
① 상황: 유가족이 지금 놓인 장면부터 연다. 임종 직후·병원 연락·경황 없는 시간대 등 구체적 상황 1~2문장.
② 불안: 그 상황에서 실제로 막히는 지점을 짚는다(무엇부터·누구에게·얼마나). 감정 과장 없이 사실로.
③ 누가 해결하는가: 이 일을 유가족이 혼자 처리하지 않는다는 점을 알린다. 담당 장례지도사가 개입하는 지점.
④ 장례지도사의 역할: 실제로 무엇을 대신 판단·진행하는지 서술.
   (연락 접수 → 상황 확인 → 출동·이송 → 안치 → 장례식장·빈소 협의 → 화장 예약 → 발인 일정 확정 → 입관·조문 조율 → 발인 동행)
   ※ 기본값이다. 아래 [C-5 중심축]이 주어지면 그 축이 글의 중심이 되고 이 단락은 축에 종속된다.
⑤ 비용 판단: 비용이 왜 달라지는지 구조로 설명. 금액 단정 금지. 상품 나열·가격 비교 금지.
⑥ 상담: 지금 무엇을 하면 되는지 한 단계만 안내하고 짧게 닫는다.
   ※ 닫기 직전 1문장으로 하단 상품 블록과 연결한다 — "장례 형태와 조문 규모에 따라 적합한 상품 구성이
      달라질 수 있어 상담 과정에서 함께 안내드립니다" 수준. 상품명·가격은 쓰지 않는다.

[비중]
- ③④(장례지도사가 어떻게 해결하는가) = 기본 비중. ★ [C-5 중심축]이 주어지면 그 축이 최대 비중을 갖고 ③④는 축에 필요한 만큼만 쓴다.
- ★ 상품군 명칭은 본문 어느 문단에서도 쓰지 않는다 — "실속형", "프리미엄", "VIP", "OO형 상품",
  개별 상품명·가격·구성 비교 전부. 이것들은 하단 상품 블록이 이미 출력한다.
  본문이 상품을 설명하기 시작하면 본문과 하단 블록이 같은 역할을 하게 되어 글이 두 번 반복된다.
  본문은 '선택 기준'까지만 — "가족 중심으로 조용히 진행할지, 조문을 받을지에 따라 준비할 내용이
  달라진다" 수준에서 멈추고, 어떤 상품이 적합한지는 판단하지 않는다.
- 장례 형태(가족장·일반장·무빈소)는 진행 방식을 설명하는 맥락에서만 쓴다. 상품 선택지로 나열하지 않는다.
- 장례 절차(임종→안치→빈소→발인)는 ④ 안에서 '장례지도사가 진행하는 일'로 녹인다. 앞부분에 절차 목록을 먼저 나열하지 말 것.

[도입에서 던진 질문은 본문에서 답한다]
- "상조 가입이 필요한가" 같은 질문을 도입에 썼다면 반드시 본문에서 답을 준다. 질문만 던지고
  상담 안내로 넘어가면 검색자가 답을 얻지 못한 채 글이 끝난다.
- 답의 방향: 가입 여부보다 지금 상황에 맞는 절차를 먼저 진행하는 것이 중요하다 / 이미 가입한 상품이
  있다면 그 내용을 확인하고, 없더라도 현재 상황에 맞춰 준비할 수 있다 — 이 수준으로 답한다.
  (특정 상품 가입 권유 금지)

[C-4 ① 임종 장소별 분기 — ①②④에 반영]
- 임종 장소에 따라 첫 단계가 달라진다. 주제와 맞는 경우 해당 상황을 구분해 서술한다.
  · 병원 임종 — 사망진단서가 비교적 빨리 발급된다. 병원 안치실 이용 여부와 이송 시점을 먼저 정한다.
  · 자택 임종 — 검안 절차가 필요해 시간이 더 걸린다. 임의로 고인을 옮기지 않고 먼저 연락해 절차를 확인한다.
  · 요양병원·요양시설 임종 — 시설에서 진단서 발급과 연락 경로가 정해져 있는 경우가 많다. 어느 장례식장으로 이송할지 판단이 먼저다.
- ★ 세 경우를 기계적으로 모두 나열하지 말 것. 주제에 맞는 1~2가지를 문장 안에 자연스럽게 녹인다.
- 야간·새벽 접수처럼 시간대에 따라 달라지는 부분이 있으면 짧게 덧붙인다(연락은 시간과 무관하게 가능하다는 사실 위주).

[C-4 ② 절차는 '왜 그 순서인지'까지]
- 순서만 나열하지 않는다. 각 단계가 다음 단계를 어떻게 결정하는지 연결한다.
  · 안치 이후 화장 예약을 먼저 확인하는 이유 = 화장장 예약 가능 시간이 발인일을 결정하기 때문.
  · 빈소 규모를 먼저 정하는 이유 = 예상 조문객 수가 식당·주차·기간까지 함께 좌우하기 때문.
- 최소 1곳 이상 "~때문에 ~을 먼저 확인합니다" 형태의 인과 문장을 넣는다.
- ★ 화장 예약을 언급했으면 그 '결과'까지 반드시 이어 쓴다 — 예약 시간에 맞춰 발인 일정을 확정하고,
  이후 입관·조문 일정을 조율하며 절차가 진행된다는 흐름. 예약에서 문장이 끊기면 절차가 미완으로 읽힌다.

[C-4 ③ 비용은 '무엇이 비용을 바꾸는가']
- 항목 나열(빈소 임대료·식대·용품·화장료)로 끝내지 않는다. 그 항목을 움직이는 변수를 설명한다.
  · 장례 형태(가족장 / 일반장 / 무빈소)에 따라 빈소·식당 사용 자체가 달라진다.
  · 조문객 규모에 따라 빈소 등급과 식대가 함께 움직인다.
  · 조문 기간(2일장·3일장), 장례식장 선택, 화장장까지의 거리도 총액에 영향을 준다.
- "무엇을 줄이면 줄어드는가 / 무엇은 줄이기 어려운가"를 조건형으로 1~2문장 넣는다. 금액 단정은 금지.
- 단정 어투를 피한다. 비용 구조는 계약 내용·지역·장례식장에 따라 달라지므로 "~에 따라 달라질 수 있습니다"
  형태로 쓴다. "조문객 수를 줄이면" 보다 "조문객 규모가 달라지면" 처럼 객관형이 안전하다.
- 상품군 명칭으로 넘어가지 말 것(위 [비중] 규칙). 비용 설명은 '장례 형태와 조문 규모' 수준에서 멈추고,
  "현재 상황에 맞는 방향을 먼저 정하는 것이 중요하다"로 닫는다.

[표현]
- 주어를 상품이 아니라 사람으로 둔다. ("후불상조 상품은…" ❌ / "담당 장례지도사가 먼저…" ⭕)
- 유가족이 직접 다 처리해야 하는 것처럼 서술하지 말 것(화장장 예약·이송 등은 실제로 장례지도사가 조율한다).
- 가입 권유·상품 추천 금지. "확인 후 판단" 톤 유지.
- [C-4 ④] 마무리에서 상담을 재촉하지 않는다. "지금 상담을 통해 정확한 정보를 얻어보시길 바랍니다" 같은
  권유형 종결 금지. 대신 "상황에 따라 준비할 내용이 달라지므로, 현재 상황을 기준으로 절차를 하나씩
  확인해 보시는 것이 도움이 됩니다" 처럼 안내형으로 닫는다.

[밀도 — 같은 말 반복 금지]
- ★ 도입에서 '막막함·혼란·무엇부터'를 한 번만 쓴다. "막막하실 텐데요" → "혼란스러우실 수 있습니다"
  → "무엇을 해야 할지 고심하게 됩니다" 처럼 같은 뜻을 문장만 바꿔 반복하면 정보가 0인 도입이 된다.
  감정 표현 1문장 + 실제로 진행해야 할 절차를 압축한 1문장, 총 2문장 안에서 도입을 끝낸다.
- ★ "장례지도사가 도와드린다"는 취지의 문단을 두 번 만들지 않는다. 개입 사실을 알리는 문단과
  실제로 무엇을 진행하는지 설명하는 문단이 나뉘면 같은 말이 두 번 나온다. 한 문단으로 합쳐
  '개입 시점 + 진행 내용'을 이어서 쓴다.
- 마무리 문장은 1개만. "도움이 됩니다" + "상담에서 안내드립니다" + "문의해 주시기 바랍니다" 처럼
  마무리 역할 문장을 겹쳐 쓰지 않는다. 상품 연결 1문장을 이미 썼다면 그것으로 닫는다.
  하단에 대표 상담번호가 별도로 출력되므로 본문에서 문의를 다시 강조할 필요가 없다.
- 비용을 줄이는 방법은 추상어로 끝내지 않는다. "무엇을 줄이면 절감할 수 있습니다"만 쓰면 정보가 없다.
  줄일 수 있는 항목과 줄이기 어려운 항목을 최소 1개씩 실제로 지목한다.
  (예: 조문객 규모를 줄이면 빈소 등급과 식대가 함께 내려간다 / 화장장 이용료처럼 절차상 고정된 비용은
   줄이기 어렵다) — 금액은 쓰지 않고 방향만.

[절차 연결]
- 안치 → 빈소 결정 → 화장 예약 → 발인 확정이 하나의 이어진 절차로 읽히게 쓴다.
  장례지도사의 역할을 설명하면서 안치·빈소를 그 안에 흡수시켜 버리면 유가족이 실제로 겪는 순서와 어긋난다.
`.trim();

// ════════════════════════════════════════════════════════════════════
// [C-5] 검색어별 중심축 차별화 (2026-07-18)
//   문제(실측): 유가족축 4개 cat이 모두 병원→자택→안치→화장 흐름으로 수렴.
//     같은 _FLOW_BEREAVED를 쓰면 검색어가 달라도 같은 글이 나온다.
//   해결: 구성 순서·비중·금지 규칙은 무변경. '무엇이 먼저 오는가'만 cat별로 지정.
//   ★ 동시에 본문 주체를 장례지도사 → 유가족 판단으로 이동(실측 병목).
//     장례지도사는 '대신 해주는 사람'이 아니라 '판단을 좁혀주는 사람'.
// ════════════════════════════════════════════════════════════════════
// [C-5-3] 지배 질문 — 본문 전체가 이 질문 하나에 답한다.
const _LEAD_Q = {
  funeral_procedure:  "무엇을 먼저 해야 하는가?",
  funeral_afterdeath: "지금 이 시각에 무엇부터 하는가?",
  funeral_cost:       "무엇 때문에 비용이 달라지는가?",
  funeral_familycost: "가족장이면 비용이 어디서 달라지는가?",
  funeral_type:       "어떤 경우에 어떤 형태를 선택하는가?",
  funeral_cremation:  "화장은 언제 예약해야 하는가?",
  funeral_postpaid:   "준비된 것이 없는데 지금 시작할 수 있는가?",
  funeral_compare:    "내 상황에서는 무엇을 선택해야 하는가?",
  funeral_hall:       "어디를 선택해야 하는가?",
  funeral_hallbooking:"빈소를 무엇을 기준으로 정하는가?",
};

const _AXIS_BY_ID = {
  funeral_procedure: `
[C-5 중심축 — 절차]
- 본문 중심 = 절차의 순서와 인과. "지금 무엇을 먼저 하는가"가 첫 문단 직후에 온다.
- 각 단계가 다음 단계를 결정하는 연결을 최소 2곳 넣는다.
- 비용은 절차 뒤에 짧게만. 형태 선택(가족장·무빈소)은 이 글의 중심이 아니다.`,

  funeral_afterdeath: `
[C-5 중심축 — 임종 직후 행동 순서]
- 본문 중심 = 시간 순서. "지금 이 시각에 무엇을 하는가"를 단계별로.
- 사망진단서 발급 → 안치 → 장례식장 결정 → 화장 예약 순으로, 각 단계에 '누가 하는가'를 붙인다.
- 서류(사망진단서 발급 통수·용도)는 이 글에서만 구체적으로 다룬다.
- 비용은 다루지 않거나 1문장 이내.`,

  funeral_cost: `
[C-5 중심축 — 비용 판단 기준]
- 본문 중심 = 무엇이 총액을 움직이는가. 절차 전체 흐름을 앞에서 나열하지 않는다.
- 줄일 수 있는 항목 / 절차상 고정되어 줄이기 어려운 항목을 각 1개 이상 실제로 지목한다. 금액 단정 금지.
- 절차는 비용이 발생하는 지점에서만 짧게 언급한다.`,

  funeral_familycost: `
[C-5 중심축 — 가족장 비용이 달라지는 지점]
- 본문 중심 = 가족장을 선택했을 때 비용 구조가 일반장과 어떻게 달라지는가.
- 조문 규모가 작아지면 함께 내려가는 항목(빈소 등급·식대·접객)과, 규모와 무관하게 남는 항목(화장·이송·용품)을 구분한다.
- 일반장과의 비교는 비용 구조 차이까지만. 어느 쪽이 낫다는 판단 금지.`,

  funeral_type: `
[C-5 중심축 — 형태 선택 기준]
- 본문 중심 = 어떤 상황에서 어떤 형태가 맞는지. 절차 전체 흐름을 앞에 나열하지 않는다.
- 조문 규모·가족 구성·기간을 기준으로 형태가 갈리는 지점을 조건형으로 서술한다.
- 가족장과 무빈소의 진행 방식 차이(빈소 운영 여부·조문 응대 여부)를 실제로 구분해 쓴다.
- 형태를 상품 선택지로 나열하지 않는다. 적합/부적합을 단정하지 않는다.`,

  funeral_cremation: `
[C-5 중심축 — 화장 예약과 일정]
- ★ 본문의 대부분이 화장을 중심으로 흐른다. 일반 장례절차 설명으로 흘러가면 이 글은 실패다.
- 반드시 다루는 축:
  · 화장 예약은 안치 이후 진행되는 경우가 많다는 점
  · 예약 가능 시간이 발인일과 발인 시각을 결정한다는 인과
  · 원하는 날짜가 어려울 수 있고, 그 경우 장례 기간(2일장·3일장)이 함께 조정된다는 점
  · 화장장 위치에 따라 발인 당일 이동 시간과 운구 동선이 달라진다는 점
- 비용도 화장 기준으로 쓴다: 화장료는 고정비 성격 / 빈소 비용은 조문 규모에 따라 변동 /
  화장을 선택해도 빈소 운영 여부에 따라 총액이 달라진다.
- 사망진단서·안치는 화장 예약으로 이어지는 선행 단계로만 짧게 언급한다.`,

  funeral_postpaid: `
[C-5 중심축 — 지금 준비 없이 시작해야 하는 상황]
- 본문 중심 = 사전 준비 없이 장례를 시작해야 할 때 무엇부터 정하는가.
- 후불 구조는 '가입 여부'가 아니라 '지금 절차를 진행할 수 있는가'의 관점으로만 다룬다.
- 가입 권유·상품 비교 금지. 이미 가입한 상품이 있다면 내용을 확인하고, 없더라도 현재 상황에 맞춰 진행할 수 있다는 수준.`,

  funeral_compare: `
[C-5 중심축 — 상황별 선택]
- 본문 중심 = "내 상황에서는 무엇을 선택해야 하는가". 장례지도사가 무엇을 해준다는 서술이 중심이 아니다.
- ★ 다음 형태의 판단 문장을 최소 2개 넣는다(조건 → 판단):
  · 병원 임종이면 병원 장례식장을 이용할지 외부로 이송할지 먼저 판단한다.
  · 조문객이 적으면 가족장·무빈소 형태를 검토한다.
  · 조문객이 많으면 빈소 규모와 접객 운영 방식을 먼저 정한다.
  · 화장 예약 가능 시간이 늦어지면 발인 일정이 함께 조정된다.
- 상조 필요성은 단정하지 않는다. 무엇을 확인하면 판단할 수 있는지까지만.`,
};

// cat 폴백 — 신규 treatment가 id 미등록 상태로 들어와도 축이 비지 않게.
const _AXIS_BY_CAT_FALLBACK = {
  "장례절차":   _AXIS_BY_ID.funeral_procedure,
  "장례비용":   _AXIS_BY_ID.funeral_cost,
  "장례형태":   _AXIS_BY_ID.funeral_type,
  "상조서비스": _AXIS_BY_ID.funeral_compare,
};

// 첫 문단 규칙 — 실측 병목: 도입이 "전문 장례지도사의 도움이 필요합니다"로 추상화됨.
const _OPENING_RULE = `
[C-5 도입 규칙]
- 도입에서 "도움이 필요합니다", "함께하겠습니다" 같은 역할 선언을 하지 않는다(광고로 읽힌다).
- 감정 공감 1문장 뒤에는 곧바로 이 글의 중심축에 해당하는 실제 판단 항목으로 들어간다.
- ★ 도입에서 주제를 언급했으면 본문의 중심도 그 주제여야 한다. 첫 문장만 주제를 말하고
  본문이 일반 장례절차로 흘러가면 검색자가 찾던 답이 글에 없다.`;

// [C-5-2] 대행 강조 금지 — 전 축 공통. 실측 회귀 지점.
// [AGENCY-FACTS-01] hasFacts 경로 전용 화자 규칙.
//   실측 실패(파일럿 1건): "서울의료원 장례식장에서는 담당 장례지도사가 상황에 맞춰
//   필요한 정보를 정리하고 일정을 조율합니다" — 시설별 운영 사실 창작.
//   ★ 원인은 지시 부족이 아니라 _AGENCY_RULE 이 "판단에 필요한 정보를 정리하고
//     일정을 조율하는 사람"을 권장 서술로 명시한 것이다. GPT는 그 문장을 변주했다.
//     Facts 글에서는 권장 서술문 자체를 주지 않는다 — 베낄 원본을 없앤다.
//   ★ 유가족축(_flowBereaved)과 무Facts 경로의 _AGENCY_RULE 은 무변경.
const _AGENCY_RULE_FACTS = `
[화자 규칙 — 전 문단 적용]
- ★ 장례지도사가 무엇을 하는 사람인지 설명하지 않는다. 역할·업무·진행 방식을 서술하지 않는다.
- ★ 이 장례식장에 담당 장례지도사가 있다거나, 그가 이 시설에서 어떻게 일한다는 서술을 하지 않는다.
  시설의 운영 방식은 [확인된 시설 정보]에 없다. 없는 것은 쓰지 않는다.
- ★ 다음 유형 전부 금지: "상황에 맞춰 정리합니다" / "일정을 조율합니다" / "필요한 정보를 제공합니다" /
  "선택할 수 있도록 지원합니다" / "부담을 덜어드립니다" / "함께하겠습니다" / "대신 진행해 드립니다".
- ★ 시설명을 주어로 하는 지원·안내·조율 서술을 만들지 않는다.
- 행동의 주체는 유가족의 판단에 둔다.`;

const _AGENCY_RULE = `
[C-5 주체 규칙 — 전 문단 적용]
- ★ 장례지도사를 '대신 해주는 사람'으로 쓰지 않는다. 다음 표현 금지:
  "부담을 덜어드립니다" / "주도적으로 진행합니다" / "저희가 함께하겠습니다" /
  "대신 진행해 드립니다" / "최적의 선택지를 안내드리겠습니다".
- 장례지도사는 '판단에 필요한 정보를 정리하고 일정을 조율하는 사람'으로 서술한다.
- ★ 장례지도사의 개입을 알리는 문단은 글 전체에서 1개만. 개입 시점과 진행 내용을 한 문단에 합친다.
- 행동의 주체는 유가족의 판단에 둔다. "~라면 ~을 먼저 확인합니다" 형태.`;

// [C-5-3] 축이 base를 이긴다 — base의 ③④ 중심 규칙을 축 우선으로 뒤집는다.
function _axisOverride(leadQ) {
  if (!leadQ) return "";
  return `
[C-5 지배 질문 — 최우선]
- ★ 이 글은 "${leadQ}" 하나에 답하는 글이다. 본문의 가장 큰 비중을 이 질문의 답에 쓴다.
- ★ 위 [글 구성] ③④(장례지도사 역할)의 "이 단락이 중심"은 이 축에서는 적용하지 않는다.
  장례지도사 서술은 위 질문에 답하는 데 필요한 만큼만(한 문단, 2~3문장) 쓰고 압축한다.
  연락 접수·이송·안치 전 과정을 순서대로 나열하지 않는다.
- ★ 도입 직후 첫 본문 문단이 곧바로 이 질문의 답으로 들어간다. 일반 장례절차 설명으로 시작하지 않는다.
- 선행 절차(사망진단서·안치 등)는 이 질문의 답에 필요한 배경으로만 짧게 언급한다.`;
}

function _flowBereaved(treatment) {
  const id = treatment?.id || "";
  const cat = treatment?.cat || "";
  const axis = _AXIS_BY_ID[id] || _AXIS_BY_CAT_FALLBACK[cat] || "";
  const ov = _axisOverride(_LEAD_Q[id]);
  return `${_FLOW_BEREAVED_BASE}\n${axis}\n${ov}\n${_OPENING_RULE}\n${_AGENCY_RULE}`.trim();
}

// ════════════════════════════════════════════════════════════════════
// [C-3-2] 시설 이용축 — 장례식장이 주인공. 상조는 후반 20~30%.
//   데이터 출처 = STORE_PROFILE(visit_info.funeralHalls[]) 중 hallName 완전일치 1건.
//   ★ 미일치 = 미소비. 시설 정보(주차·빈소·식당·안치실)는 GPT 생성 절대 금지 —
//     장례 업종에서 잘못된 시설 정보는 품질 문제가 아니라 오정보 제공이다.
// ════════════════════════════════════════════════════════════════════

// hallFacts(입력 데이터) → 프롬프트 [확인된 시설 정보] 블록.
//   빈 항목은 줄 자체를 만들지 않는다(빈 문장 박제 방지).
const _HALL_FACT_LABELS = [
  ["address",     "주소"],
  ["parking",     "주차"],
  ["parkingFee",  "주차요금"],
  ["halls",       "빈소"],
  ["mortuary",    "안치실"],
  ["restaurant",  "식당·접객실"],
  ["facilities",  "편의시설"],
  ["crematorium", "화장장 연계"],
  ["memo",        "기타"],
];

export function renderHallFacts(hall) {
  if (!hall || typeof hall !== "object") return "";
  const lines = [];
  for (const [k, label] of _HALL_FACT_LABELS) {
    const v = String(hall[k] || "").trim();
    if (v) lines.push(`- ${label}: ${v}`);
  }
  if (!lines.length) return "";
  return `\n[확인된 시설 정보 — 아래 항목만 사용. 없는 항목은 문장으로 만들지 말 것]\n${lines.join("\n")}`;
}

// ════════════════════════════════════════════════════════════════════
// [GENERAL-ASSET-V1] 일반 정보층 = 검증 자산 소비.
//   이전(BODY-QC-01): 주제 1개를 지정하고 문장은 GPT가 생성했다.
//     → 허용 주제 안에서 낡은 관례가 섞여 들어왔다("여성은 검은색 정장이나 한복").
//   현재: 문장 자체를 공급한다. GPT는 배열과 어미만 조정한다.
//   ★ "무엇에 대해 쓰라"에서 "이 문장을 쓰라"로 바뀐 것이 이 축의 전부다.
// ════════════════════════════════════════════════════════════════════

// 자산 축 선택 — Facts 전면축과 화제를 맞추고, 없으면 일반 전용축(process)에서 연다.
//   ★ 축 조합 규칙(연속 억제·화제 거리 제한)은 넣지 않는다.
//     관측되지 않은 문제를 미리 해결하지 않는다 — 실제 출력에서 반복이 확인된 뒤 판단한다.
function _pickGeneralAssetKeys(hallFacts) {
  const facts = hallFacts && typeof hallFacts === "object" ? hallFacts : {};
  // 전면축(Facts)과 화제가 맞는 자산을 먼저 담고, 부족분은 일반 전용축으로 채운다.
  const factsIntents = _availableHallAxes(facts).map((a) => a.key);
  const matched = [];
  for (const it of factsIntents) {
    for (const k of GENERAL_ASSETS_BY_INTENT[it] || []) matched.push(k);
  }
  return [...new Set([...matched, ...GENERAL_ONLY_ASSET_KEYS])];
}

// [V2] concept·group 기반 문장 선택.
//   ★ V1은 축 단위로 뽑았다. 그러나 A01/A02가 둘 다 concept="hall",
//     A08/A09가 둘 다 "encoffin" 이라 축 3개가 실제로는 개념 2개일 수 있었다.
//     그리고 28문장 중 14문장이 variability 한 종류라 "다르다"만 반복됐다.
//     → 통제 단위를 concept + group 으로 바꾼다.
//
//   규칙: 서로 다른 concept >= 3 / 같은 concept <= 2문장 / variability <= 1문장
//         목표 6~8문장은 관측치일 뿐 강제하지 않는다(분량 강제는 창작을 부른다).
//   우선순위: definition + role_space 혼합 > definition 단독 연속.
function _pickGeneralAssetSentences(keys) {
  const R = GENERAL_ASSET_RULES;
  // 후보 문장 평탄화 — concept 단위로 묶는다.
  const byConcept = new Map();
  for (const key of keys) {
    const a = FUNERAL_GENERAL_ASSETS[key];
    if (!a || !Array.isArray(a.sentences) || !a.sentences.length) continue;
    const c = a.concept || key;
    if (!byConcept.has(c)) byConcept.set(c, []);
    a.sentences.forEach((s, idx) => {
      byConcept.get(c).push({ key, idx, concept: c, text: s.t, group: s.g });
    });
  }
  if (!byConcept.size) return [];

  const chosen = [];
  const tagOf = (x) => `${x.key}:${x.idx}`;
  const varCount = () => chosen.filter((x) => x.group === "variability").length;
  const blocked = (cand) =>
    GENERAL_ASSET_EXCLUSIVE_PAIRS.some(([a, b]) => {
      const t = tagOf(cand);
      return (a === t && chosen.some((c) => tagOf(c) === b)) ||
             (b === t && chosen.some((c) => tagOf(c) === a));
    });

  // 한 concept 안에서 뽑을 문장. 혼합 우선 → definition 1 + role_space 1.
  function takeFrom(concept, cap) {
    const pool = (byConcept.get(concept) || [])
      .filter((x) => !chosen.some((c) => tagOf(c) === tagOf(x)));
    const taken = [];
    const pick = (pred) => {
      const cands = pool.filter(
        (x) => pred(x) && !taken.includes(x) && !blocked(x) &&
               !(x.group === "variability" && varCount() + taken.filter((y) => y.group === "variability").length >= R.maxVariability)
      );
      if (!cands.length) return null;
      const hit = cands[Math.floor(Math.random() * cands.length)];
      taken.push(hit);
      return hit;
    };
    // ① definition → ② role_space(혼합 우선) → ③ 남은 것
    pick((x) => x.group === "definition") || pick((x) => x.group === "role_space");
    if (taken.length < cap) {
      pick((x) => x.group === "role_space") ||
      pick((x) => x.group === "definition") ||
      pick(() => true);
    }
    return taken.slice(0, cap);
  }

  // concept 순회 — 무작위 순서.
  const concepts = [...byConcept.keys()];
  for (let i = concepts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [concepts[i], concepts[j]] = [concepts[j], concepts[i]];
  }
  // ★ 개념 수를 상한으로 묶는다. 개념을 많이 열고 1문장씩 뽑으면
  //   화제 전환만 반복되어 용어사전처럼 읽힌다(V2-MAP SET-5 관측).
  //   개념 3~4개 × 최대 2문장 = 목표 6~8문장.
  const wantConcepts = Math.max(
    R.minConcepts,
    Math.min(concepts.length, R.minConcepts + (Math.random() < 0.5 ? 0 : 1))
  );
  // ★ [TOPIC-ADJACENCY-01] 뽑힌 concept을 화제 인접군으로 정렬한다.
  //   무엇을 뽑는지는 위 셔플이 그대로 결정한다 — 이 줄은 순서만 바꾼다.
  //   같은 군이 연속 블록으로 붙어 화제 왕복(G1→G3→G1)이 사라진다.
  const _tg = (c) => GENERAL_ASSET_TOPIC_GROUP[c] || "G9";
  const picked = concepts.slice(0, wantConcepts)
    .map((c, i) => [c, i])
    .sort((a, b) => (_tg(a[0]) < _tg(b[0]) ? -1 : _tg(a[0]) > _tg(b[0]) ? 1 : a[1] - b[1]))
    .map(([c]) => c);
  // 개념당 maxPerConcept 까지. definition + role_space 혼합 우선.
  for (const c of picked) {
    if (chosen.length >= R.targetSentences[1]) break;
    chosen.push(...takeFrom(c, R.maxPerConcept));
  }
  // 목표 하한에 못 미치면 남은 개념에서 1문장씩 보충한다.
  //   ★ 규칙(variability<=1 / concept<=2)은 깨지 않는다. 못 채우면 짧게 끝낸다.
  if (chosen.length < R.targetSentences[0]) {
    for (const c of concepts.slice(wantConcepts)) {
      if (chosen.length >= R.targetSentences[0]) break;
      chosen.push(...takeFrom(c, 1));
    }
  }
  // ★ [TOPIC-ADJACENCY-01] 하한 보충으로 뒤에 덧붙은 concept까지 최종 정렬한다.
  //   보충 루프는 이미 뽑힌 군 뒤에 다른 군을 붙이므로 여기서 한 번 더 정리해야
  //   같은 군이 흩어지지 않는다(실측 #2 funeralHome 재등장의 원인).
  //   ★ 안정 정렬 — 군 안에서는 기존 순서(개념 단위 2문장 묶음)를 보존한다.
  const _order = new Map();
  chosen.forEach((x, i) => { if (!_order.has(x.concept)) _order.set(x.concept, i); });
  chosen.sort((a, b) => {
    const ga = _tg(a.concept), gb = _tg(b.concept);
    if (ga !== gb) return ga < gb ? -1 : 1;
    return _order.get(a.concept) - _order.get(b.concept);
  });

  // 개념 수가 minConcepts 에 못 미치면 그대로 반환한다.
  //   ★ 채우려고 규칙을 깨지 않는다. 자산이 없으면 짧은 것이 정상 동작이다.
  return chosen;
}

// 일반 정보층 블록 문자열. 공급 문장이 없으면 블록 자체를 만들지 않는다.
//   ★ 번호(1) 2) …)는 절차 순서로 오독된다. 불릿으로 공급한다.
function _renderGeneralAssets(picked) {
  if (!picked.length) return "";
  const lines = picked.map((p) => `  · ${p.text}`).join("\n");
  return `[일반 정보층 — 아래 문장만 사용한다]
- 이 단락은 아래 제공된 문장으로만 구성한다. 문장을 추가하지 않는다.

${lines}

- 허용 작업은 두 가지뿐이다: ① 문장 순서 배열 ② 어미·조사 조정.
- ★ 문장을 새로 만들지 않는다. 위 문장 밖의 사실·설명·예시·부연을 쓰지 않는다.
- ★ 문장 사이를 새로운 사실로 잇지 않는다. 배경 설명·보충 설명으로 메우지 않는다.
- ★ 절차 순서를 보충하지 않는다. "이후" "그다음" "이어서" "장례가 진행되면서" 등
  시간 순서를 만드는 표현을 쓰지 않는다. 위 문장들은 순서를 나타내지 않는다.
- ★ 문장 사이에 인과를 만들지 않는다. "그래서" "따라서" "때문에" "이처럼" 금지.
- ★ 두 문장을 한 문장으로 합치지 않는다. 합치면 없던 관계가 생긴다.
- ★ 단락을 여는 문장·닫는 문장을 따로 만들지 않는다. 위 문장으로 시작하고 끝낸다.
- ★ [확인된 시설 정보]의 값을 이 단락에서 다시 꺼내지 않는다.
- ★ 시설명을 주어로 쓰지 않는다. 위 문장들은 특정 장례식장의 사실이 아니다.
- ★ 위에 제공된 문장은 하나도 빼지 않고 모두 사용한다. 일부만 고르거나 요약하지 않는다.
- 제공된 문장이 전부다. 분량을 늘리지 않는다.
`;
}

// [PRACTICAL-ASSET-01B] 실용 안내층 블록.
//   ★ _renderGeneralAssets 를 복제하지 않고 별도로 둔다. 두 층은 허용 작업이 다르다.
//     일반 정보층 = 용어의 뜻. 문장 사이를 이으면 없던 관계가 생긴다 → 인과·병합 금지.
//     실용 안내층 = 유가족의 행동. 같은 장면의 두 문장을 잇는 것이 자연스럽다 → 어미 조정 허용.
//   ★ 유지되는 잠금(둘 다 동일): 제공 문장만 사용 / 새 사실 금지 /
//     [확인된 시설 정보] 값 재등장 금지 / 시설명·"이곳" 주어 금지.
function _renderPracticalAssets(picked) {
  if (!picked.length) return "";
  const lines = picked.map((p) => `  \u00b7 ${p.text}`).join("\n");
  return `[실용 안내층 — 아래 문장만 사용한다]
- 이 단락은 아래 제공된 문장으로만 구성한다. 문장을 추가하지 않는다.

${lines}

- 허용 작업은 세 가지다: \u2460 문장 순서 배열 \u2461 조사 조정 \u2462 같은 장면의 두 문장 연결.
- \u2605 문장을 새로 만들지 않는다. 위 문장 밖의 사실·설명·예시·부연을 쓰지 않는다.
- \u2605 위에 제공된 문장은 하나도 빼지 않고 모두 사용한다. 일부만 고르거나 요약하지 않는다.
- \u2605 [확인된 시설 정보]의 값(수치·주소·시설명)을 이 단락에서 꺼내지 않는다.
- \u2605 시설명이나 "이곳"을 주어로 쓰지 않는다. 위 문장들은 특정 장례식장의 사실이 아니다.
- \u2605 특정 장례식장이 무엇을 갖췄다·제공한다는 내용을 쓰지 않는다.
- \u2605 가격·요금·소요시간·인원수를 쓰지 않는다.
- 제공된 문장이 전부다. 분량을 늘리지 않는다.
`;
}

// 시설 이용축 — 데이터 유무로 지시가 갈린다.
function _flowHall(hasFacts, treatment, hallFacts = null) {
  // [GENERAL-ASSET-V1] 오늘 글에 공급할 검증 자산 문장. hasFacts=true 경로에서만 사용.
  const gPicked = hasFacts ? _pickGeneralAssetSentences(_pickGeneralAssetKeys(hallFacts)) : [];
  const gBlock = _renderGeneralAssets(gPicked);
  // [PRACTICAL-ASSET-01B] Facts 축 수에 반비례하는 가변 소비. 축 정의는 여기(_HALL_SELECT_AXES)가 SoT다.
  //   ★ 공급 순서는 축 번호(P1 접수 → P6 형태) 오름차순으로 고정한다. 셔플 그대로 넘기면
  //     발인 문장이 접수 문장보다 앞에 놓여 시간 역행 글이 나온다 — 선택은 무작위, 순서는 고정.
  const pPicked = hasFacts
    ? pickPracticalSentences(_availableHallAxes(hallFacts).length)
        .sort((a, b) => (a.axis === b.axis ? a.idx - b.idx : a.axis < b.axis ? -1 : 1))
    : [];
  const pBlock = _renderPracticalAssets(pPicked);
  // [CONTENT-02] Facts가 있으면 판단축(_AXIS_HALL) 대신 선택축(_axisHallSelect)을 쓴다.
  const hallAxis = hasFacts
    ? _axisHallSelect(hallFacts)
    : (_AXIS_HALL[treatment?.id || ""] || _AXIS_HALL.funeral_hall);
  return `
${hasFacts ? `${_AGENCY_RULE_FACTS}\n` : ``}${hasFacts ? `[★ 최상위 규칙 — Facts-only. 아래 모든 지시보다 우선한다]
- [확인된 시설 정보]에 값이 있는 항목만 언급한다. 값이 없는 시설 속성은 언급 자체를 금지한다.
- 주어진 필드만 말하고, 필드 사이의 관계를 만들지 않는다.
  · 빈소 수만 있으면 빈소 수만 쓴다. 안치능력만 있으면 안치능력만 쓴다.
  · 규모·크기·배치·등급·현재 여유·배정 방식·적정 조문객 수는 확인된 값이 아니다. 추론도, "확인이 필요하다"는 권고도 금지한다. 이 규칙은 [확인된 시설 정보]의 값과 시설 속성에만 적용된다.
- 값에 대한 평가·판정을 붙이지 않는다("여유롭다", "한정되어 있다", "다양한 규모를 치를 수 있다" 등 전부 금지). 값 그대로만 쓴다.
- 확인되지 않은 항목(빈소 크기·비용 등)을 글의 화제나 도입부 질문으로 삼지 않는다.
- 쓸 내용이 적으면 짧게 끝낸다. 분량을 채우려고 추론하지 않는다.
- ★ 우회 금지: 없는 정보를 "문의·상담·방문·사전 확인으로 알 수 있다"는 식으로 보완하지 않는다. 없는 항목은 존재 자체를 언급하지 않는다. 이 규칙은 [확인된 시설 정보]의 값과 시설 속성에만 적용된다.
- ★ 값의 서술 범위: Facts 값을 자연어로 풀어 쓰는 것까지만 허용한다. 값에서 의미·효과·적합성·선택지 다양성을 도출하지 않는다.
  · 허용: "빈소는 총 8개입니다." / "안치실의 안치능력은 18구입니다."
  · 금지: "8개라서 선택지가 다양하다" / "18구라 여러 상황에 대응할 수 있다" / "500대라 조문객이 많아도 여유롭다"
- ★ 문장 종결 규칙: 시설 Facts를 쓰는 문단은 확인된 값을 서술하는 데서 문장을 끝낸다.
  그 값에서 적합성·선택 기준·효과·대응 가능성·조문객 규모를 추론하거나, "확인하세요·고려하세요·미리 체크하세요" 같은 행동 권유를 덧붙이지 않는다. 이 규칙은 [확인된 시설 정보]의 값과 시설 속성에만 적용된다.
  · 예: "빈소는 총 8개입니다." 로 끝. "안치능력은 18구입니다." 로 끝. "주차가능대수는 500대입니다." 로 끝.
- ★ 최종 잠금: hallFacts는 해석하지 않는다. 확인된 필드의 값을 자연어로 풀어 쓰는 것만 허용한다.
  필드 값에서 이용 적합성·수용 가능성·선택 기준·조문객 규모·가족 상황·사용 계획을 도출하지 않는다.
  등록되지 않은 정보를 상담·문의·방문으로 확인하라고 보완하지 않는다.

${gBlock}
${pBlock}
` : ``}[글 구성 — 이 순서를 지킬 것]
① 상황: 조문 또는 빈소 이용을 앞두고 정보를 찾는 시점부터 연다. 유가족 감정 서사 과장 금지.
② 위치·접근: ${hasFacts ? `[확인된 시설 정보]의 주소 값을 그대로 서술하고 그 문장에서 끝낸다. 교통수단·소요시간·접근 난이도·편리함·방문 용이성은 확인된 값이 아니다. 쓰지 않는다.
   ★ 주소 뒤에 독자의 행동을 덧붙이지 않는다: "방문을 계획하신다면" / "이 주소를 바탕으로 위치를 확인하시면 됩니다" / "찾아가실 때 참고하세요" 류 전부 금지. 주소는 주소에서 끝난다.` : `어디에 있고 어떻게 가는지. 주차 확인이 필요한 이유와 함께.`}
${hasFacts ? `③ 시설: [확인된 시설 정보]에 실제로 등록된 항목을 이 단락에서 한 번에 서술하고 끝낸다. 등록되지 않은 항목은 언급조차 하지 않는다. 쓸 값이 적으면 짧게 끝낸다 — 늘리지 않는다.
   ★ 값을 쓴 뒤 그 값의 쓸모·참고 가치·활용으로 잇지 않는다: "활용하실 수 있습니다" / "참고가 됩니다" / "고려하실 요소가 됩니다" / "필요에 맞게" / "도움이 되는 정보입니다" 류 전부 금지. 마지막 값의 서술이 이 단락의 마지막 문장이다.
④ 실용 안내: 위 [실용 안내층]과 [일반 정보층]에 제공된 문장을 하나도 빠뜨리지 않고 쓴다. ③의 값을 다시 꺼내지 않는다. 이 단락들은 시설 사실과 무관한 일반 서술이다.
   \u2605 [실용 안내층] 문장이 이 구간의 중심이다. 이 문장으로 단락을 열고 닫는다.
   \u2605 [일반 정보층]은 용어의 뜻을 보태는 보조다. 용어가 처음 나오는 자리 근처에 붙이고, 정의 문장을 세 개 이상 연달아 쓰지 않는다.
   \u2605 두 층을 한 덩어리로 몰아 쓰지 않는다. 실용 안내가 이어지는 흐름 안에 정의를 끼워 넣는다.
   \u2605 단락은 2~4개로 나눈다. 한 단락에 모든 문장을 몰아넣지 않는다.` : `③ 시설: [확인된 시설 정보]에 실제로 등록된 항목만 서술한다. 등록되지 않은 항목은 언급조차 하지 않는다. 항목이 적으면 이 단락을 짧게 쓰거나 ④와 합쳐도 된다.
④ 이용 안내: [확인된 시설 정보]에 등록된 항목 중 ③에서 쓰지 않은 값을 서술한다. 등록되지 않은 항목은 언급하지 않으며, 확인·점검을 권하는 문장도 쓰지 않는다. 쓸 값이 없으면 이 단락을 생략한다.`}
⑤ 장례지도사 연결: ${hasFacts ? `이 단락을 만들지 않는다. 장례지도사가 무엇을 하는지, 이 시설에서 어떻게 지원하는지 서술하지 않는다. ④에서 글을 닫는다.` : `시설 정보만으로 결정되지 않는 부분(빈소 규모 판단·절차 진행)을 담당 장례지도사가 맡는다는 점으로 자연 연결.`} 화장장 관련 내용은 [확인된 시설 정보]에 화장장 항목이 있을 때만 쓴다.
⑥ 상담: ${hasFacts ? `상담·문의·맞춤 안내를 권하는 단락을 만들지 않는다. 확인된 값의 서술이 끝나면 그대로 글을 닫는다.
   ★ 닫는 인사·덕담·소감도 쓰지 않는다: "도움이 되셨길 바랍니다" / "준비에 참고가 되길 바랍니다" / "안내는 여기까지입니다" / "잘 준비하시길 바랍니다" 류 전부 금지.
   ★ ④의 마지막 문장이 곧 글의 마지막 문장이다. 그 뒤에 아무것도 붙이지 않는다.` : `한 단계만 안내하고 짧게 닫는다.`}

[비중]
${hasFacts ? `- ②③(확인된 시설 Facts) = Facts가 적으면 짧게 끝낸다. 채우려고 추론하지 않는다.
- ④(실용 안내) = 제공된 문장 수가 곧 분량이다. 백분율 목표는 없다. 문장을 늘려 분량을 맞추지 않는다.
  [실용 안내층]과 [일반 정보층]에 제공된 문장은 전부 소비한다 \u2014 이 구간이 본문에서 가장 긴 구간이 된다.
- ⑤⑥ = 짧게.` : `- ②③④(장례식장 시설·이용 정보) = 본문의 70~80%.
- 상조 서비스는 ⑤⑥에서만. 20~30%를 넘기지 않는다.`}
- 상품명·가격·구성 비교는 본문에서 다루지 않는다(하단 상품 블록 소관).

[표현]${hasFacts ? `` : `
- 시설·항목은 나열로 끝내지 말고 "누가·왜 확인해야 하는지"로 연결한다.`}
- 평가·추천·홍보 표현 금지("깨끗한", "최신", "편리한" 등 주관 형용 금지). 사실 서술만.

[본문과 하단 블록의 역할 분리 — 중복 금지]
${hasFacts ? `- 본문 = 확인된 값의 서술. 하단 블록과 같은 수치를 반복하지 않는다.` : `- 본문 = 판단 기준. "왜 확인하는가"를 쓴다. 단, 확인 대상으로 언급할 수 있는 항목은 [확인된 시설 정보]에 등록된 항목뿐이다.`}
- 하단 블록 = 확인된 사실의 수치 나열. 같은 수치를 본문에서 반복하지 않는다.
- ★ 본문에서 시설 항목을 목록처럼 나열하지 말 것. 같은 정보를 두 번 소비하면 글이 늘어지고 신뢰가 떨어진다.
${hasFacts ? `` : `- ★ 시설의 유무·규모를 설명하는 문장("안치실 유무를 확인해야 합니다", "식당과 매점의 규모는~")은 쓰지 않는다.
  반드시 "어떤 상황이면 무엇을 먼저 확인한다" 형태의 조건 문장으로 바꿔 쓴다.`}

[상품 언급 — 전면 금지]
- 이 글은 장례식장 안내다. 상품 구성·상품 연결 문장을 쓰지 않는다("적합한 상품 구성이 달라질 수 있어" 류 포함).
- 상품명·가격·구성 비교도 본문에서 다루지 않는다(하단 블록 소관).

[비용 언급 — 이 글에서는 금지]
- 위 [비용 표현] 지침은 이 글에 적용하지 않는다.
- 빈소 임대료·식대·용품·화장료 등 비용 항목과 그 변동 요인을 쓰지 않는다.
  요금은 [확인된 시설 정보]에 등록된 항목(예: 주차요금)만 그대로 쓴다.
- "비용은 상담 시 안내" 류 문장도 쓰지 않는다.
${hasFacts
  ? `- ★ 시설 수치·항목은 위 [확인된 시설 정보]에 있는 값만 쓴다. 없는 항목은 추측하거나 일반론("주차 공간이 마련되어 있습니다")으로 채우지 말고 아예 다루지 말 것.
- ★ 미등록 수치 창작 금지: 좌석 수·거리·면적·인원 등 [확인된 시설 정보]에 없는 숫자는 어떤 형태로도 쓰지 않는다.
- ★ 미등록 시설 존재 창작 금지: 입관실·식당·매점·접객실·주차장·편의시설 등이 있다/없다·운영한다는 서술을 [확인된 시설 정보]에 없으면 하지 않는다.
- ★ 미등록 등급·유형 창작 금지: 가족실·특실·대형/중형/소형 빈소 등 등급·유형 구분은 [확인된 시설 정보]에 명시된 경우에만 쓴다. "빈소 8개"처럼 개수만 주어졌다면 개수만 쓰고 등급을 나누지 않는다.`
  : `- ★ 시설 데이터가 주어지지 않았다. 주차 대수·빈소 수·식당 규모·안치실 등 구체 수치를 지어내지 말 것.
- 대신 "무엇을 미리 확인해야 하는가"(주차 가능 여부·빈소 규모·조문 시간)를 확인 항목 형태로 안내한다.`}

${hallAxis}
${_axisOverride(_LEAD_Q[treatment?.id || ""])}
${hasFacts ? `` : _AGENCY_RULE}
`.trim();
}

// ════════════════════════════════════════════════════════════════════
// [CONTENT-02] INTENT층 = Facts 선택축.
//   새 내용을 만들지 않는다. 이미 확인된 Facts 중 오늘 전면에 놓을 축만 고른다.
//   없는 Facts는 후보에서 제외 → 미등록 항목이 화제가 되는 경로 자체가 없다.
// ════════════════════════════════════════════════════════════════════
const _HALL_SELECT_AXES = [
  { key: "location",    label: "위치·접근",   fields: ["address"] },
  { key: "parking",     label: "주차",       fields: ["parking", "parkingFee"] },
  { key: "room",        label: "빈소",       fields: ["halls"] },
  { key: "mortuary",    label: "안치실",     fields: ["mortuary"] },
  { key: "dining",      label: "식당·접객실", fields: ["restaurant"] },
  { key: "facility",    label: "편의시설",   fields: ["facilities"] },
  { key: "crematorium", label: "화장장 연계", fields: ["crematorium"] },
];

function _availableHallAxes(hall) {
  if (!hall || typeof hall !== "object") return [];
  return _HALL_SELECT_AXES.filter((a) =>
    a.fields.some((f) => String(hall[f] || "").trim())
  );
}

function _axisHallSelect(hall) {
  const pool = _availableHallAxes(hall);
  if (!pool.length) return "";
  // 글 1건당 강조축 1~2개. 후보가 1개면 1개.
  const n = pool.length === 1 ? 1 : (Math.random() < 0.45 ? 1 : 2);
  const picked = [];
  const rest = pool.slice();
  for (let i = 0; i < n && rest.length; i++) {
    picked.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  const front = picked.map((a) => a.label).join(" · ");
  const back = rest.map((a) => a.label).join(" · ");
  return `
[C-5 중심축 — 오늘 전면에 놓을 확인된 정보]
- 전면 축: ${front}
- 이 축에 해당하는 [확인된 시설 정보] 값을 본문에서 가장 먼저 서술한다.${
    back ? `\n- 나머지 확인 항목(${back})은 한 문장 이내로 짧게 지나가거나 하단 블록에 맡긴다.` : ""
  }
- 축 선택은 오늘 글의 편집 결정일 뿐이다. 값 자체는 [확인된 시설 정보] 그대로 쓴다.`;
}

// [C-5-2] 시설 이용축 판단 레이어 — 실측 병목: 본문이 '시설 소개'에 머무름.
const _AXIS_HALL = {
  funeral_hall: `
[C-5 중심축 — 장례식장 선택 기준]
- ★ 이 글은 '시설 소개'가 아니라 '선택 가이드'다. 시설을 나열하면 하단 블록과 역할이 겹친다.
- 시설 항목을 설명하는 대신, "어떤 상황이면 무엇을 먼저 확인하는가" 형태의 조건 문장으로 쓴다.
- ★ 조건 문장에 등장시킬 수 있는 확인 항목은 [확인된 시설 정보]에 실제로 주어진 항목뿐이다.
  주어지지 않은 항목(빈소 등급·가족실·특실·입관실·식당 좌석·매점·편의시설·화장장까지의 거리 등)은 예시로도 언급하지 않는다.
- ★ 주어진 항목이라도 그 항목이 가져오는 효과·장점·절감 효과를 덧붙이지 않는다. "확인한다"에서 멈춘다.
- ★ 빈소가 개수로만 주어졌다면 개수만 쓴다. 규모·등급·배정 방식은 쓰지 않는다.
- ★ 조문객 수를 임의 구간(30~50명, 100명 이상 등)으로 나누지 않는다.
- ★ 마무리는 상담 안내가 아니라 판단 기준으로 닫는다.
  마무리 문장은 이 글에서 실제로 다룬 확인 항목을 근거로 새로 쓴다. 정해진 문구를 그대로 옮겨 쓰지 않는다.`,

  funeral_hallbooking: `
[C-5 중심축 — 빈소 예약 판단]
- 본문 중심 = 빈소를 언제·무엇을 기준으로 정하는가.
- 예상 조문객 수 → 빈소 규모 → 식당 좌석·주차로 이어지는 판단 순서를 명시한다.
- 예약 시점이 늦어지면 선택 가능한 빈소가 제한된다는 점을 조건형으로 1회 넣는다.
- ★ 마무리는 상담 안내가 아니라 판단 기준으로 닫는다.`,
};

// [DEAD CODE 보존] C-3-1 임시본. _flowHall(false)로 대체됨.
const _FLOW_HALL = `
[글 구성]
- 장례식장 시설·이용 정보를 중심으로 안내하고, 상조 서비스는 후반에 짧게 연결한다.
- 시설·항목은 나열로 끝내지 말고 "누가·왜 확인해야 하는지"로 연결한다.
`.trim();

export function buildPrompt({ treatment, region, storeName = "{storeName}", hallName = "", hallFacts = null }) {
  const dir = treatment?.DIRECTION || {};
  const decisionAssets = _buildDecisionAssets(treatment, hallFacts); // [세션59] cat별 판단자산 / [01D] hallFacts 게이트
  const intent = resolveFuneralIntent(treatment);         // [C-3-1] 검색 의도 축
  // [C-3-2] 시설 데이터 소비 — hall 축에서만. 매칭 실패 시 hallFacts=null → 데이터 없는 지시로 분기.
  const factsBlock = intent === "hall" ? renderHallFacts(hallFacts) : "";
  // [FUNERAL-BODY-TOPIC-COMPOSER-01] 적격 S2가 없으면 null → 기존 _flowHall 경로로 그대로 간다.
  const topicPlan = intent === "hall" && !!factsBlock ? composeTopicPlan(hallFacts) : null;
  const flow = intent !== "hall" ? _flowBereaved(treatment)
    : topicPlan ? flowHallTopic(treatment, topicPlan)
    : _flowHall(!!factsBlock, treatment, hallFacts);
  // [C-1] 장례식장명 = 정보 대상. 값이 있으면 실명 주입, 없으면 라인 자체를 넣지 않는다.
  const hallLine = hallName ? `\n[장례식장] ${hallName}` : "";
  const hallRule = hallName
    ? `\n- 본문에 "${hallName}" 명칭을 그대로 사용한다(도입·시설 안내·절차·마무리에 분산 3~5회). "이 지역 장례식장"으로 일반화하지 말 것. 평가·추천 표현은 금지.\n- 상조업체 영업지역을 장례식장의 소재지로 서술하지 마세요. 장례식장의 위치는 [시설정보]에 제공된 주소만 사용하세요.`
    : `\n- 장례식장 명칭이 주어지지 않았다. "장례식장"으로 일반 서술하고 명칭을 지어내지 말 것.`;
  return `
[업종] 상조·장례 안내
[검색 의도] ${intent === "hall" ? "장례식장 시설 이용 정보(조문·방문 목적)" : "장례를 지금 준비해야 하는 유가족의 결정"}
[상조업체 영업지역] ${region}${hallLine}
[주제] ${treatment?.name || ""}
[화자] 장례지도사 (안내자 톤)

[이 글이 답해야 할 유가족 고민]
${dir.concern || ""}

[안내 방향]
${dir.effect || ""}
${decisionAssets}

[도입 훅 예시]
${dir.hook || ""}

[핵심 키워드] ${dir.keyword || treatment?.name || ""}
${factsBlock}
${flow}

[작성 지침]
- 도입부: "안녕하세요. 장례지도사입니다."로 시작. 상조회사 상호명은 쓰지 말 것. 유가족의 막막함에 차분히 공감하되 감성 과장 금지.${hallRule}
- 본론: 위 '글 구성' 순서를 따른다.${factsBlock ? `` : ` '판단 근거'가 있으면 나열로 끝내지 말고 "누가·왜 확인해야 하는지"를 조건형("~라면 ~할 수 있습니다")으로 연결한다.`}
- 정보블럭을 글 흐름에 자연스럽게 배치.
- 마무리: 글 전체 재요약 금지. 짧게 닫는다. 상담을 재촉하는 권유형 종결은 쓰지 않는다(위 '글 구성' 마무리 규칙을 따른다).
- 비용 언급 시 단정 금지, "상담 시 안내" 톤.
- 상조 언급 시 가입 강권 금지, 확인 기준만.
`.trim();
}

// 화자 오염 가드 (변호사·데이케어 케이스에서 발견된 패턴 차용)
// [세션56][One Axis] 화자에서 지역 제거 — 회사 소재지(region)와 장례식장 지역 충돌 방지.
//   중립 화자 고정: 지역·회사명 미노출. 어느 장례식장 글에도 그대로 사용 가능.
//   B방향(중립 화자) — 브랜드 노출은 별도 정책이므로 여기서 결정하지 않음(PHILOSOPHY 원칙1 유지).
export function buildOfficeIntro(hallName = "") {
  return hallName
    ? `안녕하세요. ${hallName} 장례지도사입니다.`
    : `안녕하세요. 장례지도사입니다.`;
}

// 끝 닉네임/서명 제거 정규식 (closing 오염 차단)
export function stripOwnerSignature(text) {
  return text
    .replace(/[-–—·]\s*[가-힣A-Za-z0-9_]{2,20}\s*드림\s*$/g, "")
    .replace(/작성자\s*[:：].*$/gm, "")
    .trim();
}

// 이미지 alt — getImageAlts (사진 슬롯 3개, 감성 연출 금지)
export function getImageAlts({ region, hallName = "" }) {
  // [C-1] alt에 "장례식장 장례식장" 중복이 생기던 문제 수정. hallName 있으면 실명 우선.
  const head = hallName || `${region} 장례식장`;
  return [
    `${head} 빈소 안내`,
    `${head} 장례 절차 안내`,
    "장례 상담 안내",
  ];
}

// ════════════════════════════════════════════════════════════════════
// [세션58][FREEZE 예외 — 2함수 한정] Render Preset 도입
//   범위: renderInfoBlocks + (handler)insertInfoBlock 딱 2곳. Prompt·Knowledge·본문 생성 로직 무손상.
//   목적: 검색 주제(장례식장/상조정보/절차)마다 하단 블록을 다르게 조립 → 시설안내 강제삽입 어색함 제거.
//   원리: renderInfoBlocks는 "본문 생성기"가 아니라 "블록 조립기"(View Layer). 키 선별은 narrative 아님.
//   확장: 봉안당·수목장 등 추가 시 FUNERAL_PRESETS에 프리셋 배열 1개만 추가하면 끝.
//   ★ cost/hall/companyService는 본문 서술로 이관 → 프리셋 제외. INFO_BLOCKS 데이터·파생함수는 DEAD 보존.
//   ★ service 블록 = FAQ 전용. 기본서비스(24시간 등)는 하단 상품블록(index.js) 소관 — 여기 미포함.
// ════════════════════════════════════════════════════════════════════

// 유형별 하단 블록 프리셋 (INFO_BLOCKS 키 화이트리스트)
export const FUNERAL_PRESETS = {
  // [~C-5] 기존 3종 — 하위호환 유지(외부 호출·text 폴백 경로)
  funeral_home:    ["hallFacility", "service"],  // 장례식장 소개형 — 시설 + FAQ
  funeral_info:    ["service"],                  // 상조 정보형 — FAQ만(시설 제외)
  funeral_process: ["procedure", "service"],     // 절차형 — 진행순서 + FAQ

  // [C-6] Intent별 프리셋 — service 블록을 Intent 전용 FAQ 키로 교체.
  //   ★ 블록 구성(개수·순서)은 기존과 동일. 바뀌는 것은 FAQ 내용뿐 → 본문 과밀 무변동.
  fi_process:   ["procedure", "service_process"],        // 장례절차 / 사망 후 해야 할 일
  fi_hall:      ["hallFacility", "service_hall"],        // 장례식장 / 빈소 예약
  fi_cremation: ["service_cremation"],                   // 화장
  fi_cost:      ["service_cost"],                        // 장례비용 / 가족장 비용
  fi_type:      ["service_type"],                        // 장례형태(가족장·무빈소)
  fi_compare:   ["service_compare"],                     // 상조 비교 / 후불상조
};

// treatment.id → preset 매핑 (id 우선, 미매칭 시 text 폴백 → 기본 funeral_info)
const _ID_TO_PRESET = {
  // [C-6] treatment.id 10종 전량 매핑 — Intent별 FAQ 분리. 미매칭 폴백은 아래 정규식 유지.
  funeral_procedure:   "fi_process",
  funeral_afterdeath:  "fi_process",
  funeral_hall:        "fi_hall",
  funeral_hallbooking: "fi_hall",
  funeral_cremation:   "fi_cremation",
  funeral_cost:        "fi_cost",
  funeral_familycost:  "fi_cost",
  funeral_type:        "fi_type",
  funeral_compare:     "fi_compare",
  funeral_postpaid:    "fi_compare",
};

// preset 결정: id 우선 → text 정규식 폴백 → funeral_info 기본
export function resolveFuneralPreset({ treatmentId, text } = {}) {
  if (treatmentId && _ID_TO_PRESET[treatmentId]) return _ID_TO_PRESET[treatmentId];
  const t = text || "";
  if (/사망\s*후|임종|절차|순서|해야\s*할|사망진단서/.test(t)) return "funeral_process";
  if (/장례식장|빈소\s*예약|시설|주차|식당|안치실/.test(t))     return "funeral_home";
  return "funeral_info";
}

// [C-3-2] 확인된 시설 정보 블록 — hallFacility(일반 체크리스트)를 실데이터로 대체.
//   근거(실측 2026-07-18): hall 축 글에서 본문이 주차·식당·안치실을 서술하고
//     하단 hallFacility가 같은 항목을 또 나열 → 동일 정보 2회 소비.
//   역할 분리: 본문 = 판단 기준(왜 확인하는가) / 이 블록 = 확인된 사실(숫자·시설).
//   ★ 입력된 항목만 출력. 미입력 항목은 줄 자체를 만들지 않는다(빈 안내 박제 방지).
export function renderHallInfoBlock(hall) {
  if (!hall || typeof hall !== "object") return "";
  const name = String(hall.name || "").trim();
  const lines = [];
  for (const [k, label] of _HALL_FACT_LABELS) {
    const v = String(hall[k] || "").trim();
    if (v) lines.push(`· ${label} : ${v}`);
  }
  if (!lines.length) return "";
  return `■ ${name ? `${name} ` : ""}이용 안내\n${lines.join("\n")}`;
}

// 정보블럭 렌더 헬퍼 (generateFuneral.js insertInfoBlock에서 사용)
//   preset: FUNERAL_PRESETS 키. 미지정/미매칭 시 전량 순회(하위호환 — 기존 호출 안전).
//   [C-3-2] hallFacts 전달 시 hallFacility(일반 체크리스트) → 실데이터 블록 치환.
//     매칭 실패(hallFacts=null)면 기존 hallFacility 유지 — 현행 동작 무변경.
export function renderInfoBlocks(preset, hallFacts) {
  const keys = FUNERAL_PRESETS[preset] || Object.keys(FUNERAL_INFO_BLOCKS);
  const hallBlock = renderHallFactsBlockSafe(hallFacts);
  // [FAQ-FACTS-01] 실데이터 블록이 생성된 글(=실명 시설 Facts 글)에는 범용 FAQ를 붙이지 않는다.
  //   근거: 본문은 미등록 항목 언급 자체를 금지했는데, 하단 FAQ가 미검증 내용(화장 예약·이송 비용)을
  //   같은 글에서 단정하면 앞의 잠금이 무효가 된다. Q/A 형식은 해당 시설에 대한 답으로 읽힌다.
  //   ★ Gate는 preset이 아니라 hallFacts 유무 — 무Facts 일반 안내글의 FAQ는 그대로 유지한다.
  const _dropFaq = !!hallBlock;
  const useKeys = _dropFaq ? keys.filter((k) => k !== "service_hall" && k !== "service") : keys;
  return useKeys
    .map((k) => {
      if (k === "hallFacility" && hallBlock) return { _raw: hallBlock };
      return FUNERAL_INFO_BLOCKS[k];
    })
    .filter(Boolean)
    .map((b) => (b._raw ? b._raw : `■ ${b.title}\n${b.items.map((i) => `· ${i}`).join("\n")}`))
    .join("\n\n");
}

function renderHallFactsBlockSafe(hallFacts) {
  try { return renderHallInfoBlock(hallFacts); } catch { return ""; }
}
