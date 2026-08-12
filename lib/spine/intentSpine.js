// lib/spine/intentSpine.js
// CONSTRUCTION-INTENT-SPINE-01
// 역할: intents/*.js 데이터를 조회/반환하는 공통 계층. 조회 외 어떤 일도 하지 않는다.
//
// 하지 않는 것(계약):
//   - 랜덤 선택 / 순차 회전 없음
//   - 프롬프트 조립 없음
//   - basis 결합 없음
//   - DB / localStorage / quota 무접촉
//   - 기본값 조용한 폴백 없음 (없으면 null)

import { INTENTS as FILM_INTENTS } from './intents/film.js';
import { INTENTS as INTERIOR_INTENTS } from './intents/interior.js';

// 엔진(업종) → INTENT 데이터. 다른 공사업종은 여기에 한 줄씩 추가한다.
const REGISTRY = {
  film: FILM_INTENTS,
  interior: INTERIOR_INTENTS,
};

function normalize(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * 해당 엔진·cat 에 정의된 INTENT 목록.
 * 정의가 없으면 빈 배열 — 데이터가 곧 게이트다.
 * @returns {Array<object>}
 */
export function getIntents(engine, cat) {
  const e = normalize(engine);
  const c = normalize(cat);
  if (!e || !c) return [];

  const table = REGISTRY[e];
  if (!table) return [];

  const list = table[c];
  return Array.isArray(list) ? list : [];
}

/**
 * intentId 로 단일 INTENT 조회.
 * 없는 engine / cat / intentId 는 전부 null.
 * @returns {object|null}
 */
export function getIntent(engine, cat, intentId) {
  const id = normalize(intentId);
  if (!id) return null;

  const list = getIntents(engine, cat);
  if (list.length === 0) return null;

  const found = list.find((it) => it && it.id === id);
  return found || null;
}

/**
 * 해당 cat 이 INTENT 선택 대상인지 여부.
 * false 면 기존 흐름 그대로 — 서비스 흐름을 막지 않는다.
 * @returns {boolean}
 */
export function hasIntents(engine, cat) {
  return getIntents(engine, cat).length > 0;
}

/**
 * UI 노출용 최소 형태(label / question 만).
 * axes 는 프롬프트 전용이므로 여기서 내보내지 않는다.
 * @returns {Array<{id:string,label:string,question:string}>}
 */
export function listIntentOptions(engine, cat) {
  return getIntents(engine, cat).map((it) => ({
    id: it.id,
    label: it.label,
    question: it.question,
  }));
}

/**
 * INTENT 를 보유한 cat 키 목록(점검용).
 * @returns {Array<string>}
 */
export function listIntentCats(engine) {
  const table = REGISTRY[normalize(engine)];
  if (!table) return [];
  return Object.keys(table).filter((k) => Array.isArray(table[k]) && table[k].length > 0);
}

export default {
  getIntents,
  getIntent,
  hasIntents,
  listIntentOptions,
  listIntentCats,
};
