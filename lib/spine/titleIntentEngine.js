// lib/spine/titleIntentEngine.js
// 병원군 공통 — 제목 검색의도 Spine (Hospital Title Intent Spine)
// ────────────────────────────────────────────────────────────────
// 목적: 병원 업종(정형외과·치과·피부과·안과·한의원·비뇨의학과 등) 제목을
//       "지역 + 증상/상황 + 치료 + 검색의도" 구조로 다양화.
//
// FREEZE 원칙 준수:
//   - 본문 프롬프트 / generate / 엔진 로직 무수정.
//   - 제목 생성부만 이 Spine을 참조(buildIntentTitle).
//
// 구조:
//   ① INTENT_KINDS — 병원 공통 검색의도 7종 (증상/진단/치료선택/진료과정/회복/병원선택/비용예약)
//   ② 각 의도별 제목 템플릿 (설명체·비광고·검색의도 유지)
//   ③ 업종은 질환 데이터(condition)만 주입 — 제목 엔진 재생성 불필요.
//
// 사용:
//   buildIntentTitle({ region, treatmentName, condition, intent, rng })
//     - condition: { symptoms:[], situations:[], intents:[] } (선택) — 증상/상황 주입
//     - intent: 특정 의도 강제(선택). 없으면 condition.intents 또는 전체에서 랜덤.
// ────────────────────────────────────────────────────────────────

// 광고성 어휘 필터 (제목 안전장치)
const TITLE_AD_WORDS = /솔직|추천|꼭|만족|후회|다행|확실|드디어|결심|최고|원조|찐|강추|명의/;

// 검색의도 7종
export const INTENT_KINDS = [
  'symptom',    // 1. 증상형 — 이런 증상도 ○○ 때문일까 / 언제 병원 가야 할까
  'diagnosis',  // 2. 진단형 — 어떤 검사를 하나 / 검사 과정
  'treatment',  // 3. 치료선택형 — 어떤 치료를 고려할 수 있나 / 비수술·비침습
  'process',    // 4. 진료과정형 — 상담→검사→치료→경과
  'recovery',   // 5. 회복형 — 치료 후 관리 / 회복 과정 / 주의사항
  'hospital',   // 6. 병원선택형 — 어떤 기준으로 선택 / 의료진·장비·사후관리
  'cost',       // 7. 비용·예약형 — 진료 전 준비 / 예약 / 비용 안내 범위
];

// ── 의도별 제목 템플릿 ────────────────────────────────────────────
// 변수: {r}=지역, {t}=치료명, {s}=증상/상황 문구(있으면)
// 모두 설명체·비광고. "증상형/진단형"은 {s} 있으면 상황 결합, 없으면 일반형 fallback.
const TEMPLATES = {
  symptom: {
    withS: [
      `{r} {t}｜{s} 확인할 점`,
      `{r} {t}｜{s} 어떤 진료가 필요할까`,
      `{r} {t}｜{s} 병원 가야 하는 신호`,
    ],
    base: [
      `{r} {t}｜이런 증상이 있다면 확인할 점`,
      `{r} {t}｜언제 병원을 찾아야 할까`,
      `{r} {t}｜초기 증상부터 살펴보기`,
    ],
  },
  diagnosis: {
    withS: [
      `{r} {t}｜{s} 어떤 검사를 하게 될까`,
      `{r} {t}｜{s} 검사가 필요한 상황`,
    ],
    base: [
      `{r} {t}｜어떤 검사를 하게 될까`,
      `{r} {t}｜검사 과정 살펴보기`,
      `{r} {t}｜진단은 어떻게 진행될까`,
    ],
  },
  treatment: {
    withS: [
      `{r} {t}｜{s} 비수술 치료를 고려하는 경우`,
      `{r} {t}｜{s} 어떤 치료를 고려할 수 있을까`,
    ],
    base: [
      `{r} {t}｜비수술 치료를 고려하는 경우`,
      `{r} {t}｜어떤 치료를 고려할 수 있을까`,
      `{r} {t}｜비침습적 방법 알아보기`,
    ],
  },
  process: {
    withS: [
      `{r} {t}｜{s} 진료는 어떻게 진행될까`,
    ],
    base: [
      `{r} {t}｜상담부터 치료까지 살펴보기`,
      `{r} {t}｜진료는 어떻게 진행될까`,
      `{r} {t}｜검사와 치료 절차 정리`,
      `{r} {t}｜비수술 진료 과정 알아보기`,
    ],
  },
  recovery: {
    withS: [
      `{r} {t}｜{s} 회복 과정 살펴보기`,
    ],
    base: [
      `{r} {t}｜치료 후 관리와 회복 과정`,
      `{r} {t}｜회복은 어떻게 진행될까`,
      `{r} {t}｜치료 후 주의할 점 정리`,
    ],
  },
  hospital: {
    base: [
      `{r} {t}｜병원 선택 전 살펴볼 기준`,
      `{r} {t}｜진료처 선택 시 확인할 점`,
      `{r} {t}｜의료진·장비·사후관리 기준`,
    ],
  },
  cost: {
    base: [
      `{r} {t}｜진료 전 알아두면 좋은 내용`,
      `{r} {t}｜방문 전 확인할 사항`,
      `{r} {t}｜진료 전 준비와 상담 안내`,
    ],
  },
};

function _pick(arr, rng) {
  const r = (typeof rng === 'function') ? rng() : Math.random();
  return arr[Math.floor(r * arr.length)];
}

// 증상/상황 문구 1개 선택 (condition.symptoms 또는 situations)
function _pickSituation(condition, rng) {
  if (!condition) return '';
  const pool = [
    ...(Array.isArray(condition.situations) ? condition.situations : []),
    ...(Array.isArray(condition.symptoms) ? condition.symptoms : []),
  ].filter(Boolean);
  if (!pool.length) return '';
  return _pick(pool, rng);
}

// 의도 선택: 명시 intent > condition.intents > 전체 랜덤
function _pickIntent(condition, intent, rng) {
  if (intent && INTENT_KINDS.includes(intent)) return intent;
  const cond = condition && Array.isArray(condition.intents)
    ? condition.intents.filter(i => INTENT_KINDS.includes(i)) : [];
  const pool = cond.length ? cond : INTENT_KINDS;
  return _pick(pool, rng);
}

/**
 * 병원 공통 제목 생성.
 * @param {object} o
 * @param {string} o.region        지역
 * @param {string} o.treatmentName 치료명
 * @param {object} [o.condition]   { symptoms:[], situations:[], intents:[] }
 * @param {string} [o.intent]      특정 의도 강제
 * @param {function} [o.rng]       0~1 난수 함수(테스트용)
 * @returns {string} 제목 (광고어 포함 시 base로 자동 회피)
 */
export function buildIntentTitle({ region, treatmentName, condition, intent, rng } = {}) {
  const r = region || '';
  const t = treatmentName || '';
  const chosen = _pickIntent(condition, intent, rng);
  const tmpl = TEMPLATES[chosen] || TEMPLATES.process;

  const situation = _pickSituation(condition, rng);
  let pool = (situation && tmpl.withS && tmpl.withS.length) ? tmpl.withS : tmpl.base;

  let title = _pick(pool, rng)
    .replace(/\{r\}/g, r)
    .replace(/\{t\}/g, t)
    .replace(/\{s\}/g, situation);

  // 안전장치: 광고어 검출 시 base 재선택 → 그래도 걸리면 process.base
  if (TITLE_AD_WORDS.test(title)) {
    title = _pick(tmpl.base || TEMPLATES.process.base, rng)
      .replace(/\{r\}/g, r).replace(/\{t\}/g, t).replace(/\{s\}/g, '');
  }
  // 공백 정리 (situation 미치환 등)
  return title.replace(/\s{2,}/g, ' ').replace(/｜\s+/g, '｜').trim();
}

export default { INTENT_KINDS, buildIntentTitle };
