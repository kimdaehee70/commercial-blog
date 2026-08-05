// lib/spine/conditionData.js
// 병원군 — 업종별 질환 데이터 (제목 Intent Spine 주입용)
// ────────────────────────────────────────────────────────────────
// 구조: HOSPITAL_CONDITIONS[industry][conditionKey] = {
//   symptoms:   대표 증상 (제목 {s}에 사용)
//   situations: 검색 상황 (제목 {s}에 사용, 우선)
//   intents:    이 질환에 적합한 검색의도 우선순위 (선택)
// }
// 매칭: 치료명(treatmentName)에 conditionKey가 포함되면 해당 데이터 사용.
//
// 신규 병원 업종 추가 = 여기 industry 블록 1개만 추가. 제목 엔진 무수정.
// ────────────────────────────────────────────────────────────────

export const HOSPITAL_CONDITIONS = {
  // ── 정형외과 (첫 적용 대상) ──
  ortho: {
    '목디스크': {
      situations: ['팔 저림이 계속된다면', '뒷목 당김이 잦다면', '수술 없이 치료를 고려한다면'],
      symptoms: ['목·어깨 통증', '팔·손 저림'],
      intents: ['symptom', 'treatment', 'diagnosis', 'process', 'hospital'],
    },
    '허리디스크': {
      situations: ['오래 앉아 허리가 아프다면', '다리 저림이 함께 나타난다면', '허리를 숙일 때 통증이 심하다면', '수술 권유를 받아 고민된다면'],
      symptoms: ['허리 통증', '다리 저림·방사통'],
      intents: ['symptom', 'treatment', 'diagnosis', 'process', 'hospital'],
    },
    '오십견': {
      situations: ['팔이 잘 올라가지 않는다면', '밤에 어깨 통증이 심하다면'],
      symptoms: ['어깨 통증', '팔 거상 제한'],
      intents: ['symptom', 'treatment', 'process', 'recovery'],
    },
    '회전근개': {
      situations: ['팔을 올릴 때 통증이 있다면', '어깨 힘이 약해진 느낌이라면'],
      symptoms: ['어깨 통증', '근력 저하'],
      intents: ['symptom', 'diagnosis', 'treatment', 'hospital'],
    },
    '무릎': {
      situations: ['계단 오를 때 무릎이 아프다면', '무릎이 붓고 시큰하다면'],
      symptoms: ['무릎 통증', '계단 보행 불편'],
      intents: ['symptom', 'treatment', 'process', 'recovery'],
    },
    '척추관협착': {
      situations: ['걷다가 다리가 저려 멈추게 된다면', '오래 서 있기 힘들다면'],
      symptoms: ['하지 저림', '보행 시 통증'],
      intents: ['symptom', 'diagnosis', 'treatment', 'hospital'],
    },
    '족저근막': {
      situations: ['아침 첫발이 아프다면', '오래 걸으면 발바닥이 아프다면'],
      symptoms: ['발바닥 통증', '보행 부담'],
      intents: ['symptom', 'treatment', 'recovery'],
    },
  },

  // 이후 업종은 데이터만 추가 (제목 엔진 무수정):
  // dental: { '임플란트': {...}, '교정': {...}, '사랑니': {...} },
  // derma:  { '여드름': {...}, '기미': {...}, '리프팅': {...} },
  // ent:    { '비염': {...}, '축농증': {...} },
};

/**
 * 치료명으로 질환 데이터 조회. conditionKey가 치료명에 포함되면 매칭.
 * @param {string} industry  업종 키(ortho 등)
 * @param {string} treatmentName 치료명
 * @returns {object|null} { symptoms, situations, intents } | null
 */
export function getCondition(industry, treatmentName) {
  const block = HOSPITAL_CONDITIONS[industry];
  if (!block || !treatmentName) return null;
  const name = String(treatmentName);
  for (const key of Object.keys(block)) {
    if (name.includes(key)) return block[key];
  }
  return null;
}

export default { HOSPITAL_CONDITIONS, getCondition };
