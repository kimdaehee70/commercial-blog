// ============================================================
// lib/locationBlock.js — 위치/주차 공통 후단 블록 (전 업종 공유)
// ------------------------------------------------------------
// 역할: 생성 완료된 본문 "맨 끝(해시태그 직전)"에 붙는 "찾아오시는 길" 블록을 만든다.
//   · narrative 아님 — 순수 기능 모듈. Naver §6 "기능은 공유, 철학·narrative는 업종 독립" 정합.
//   · 엔진(prompt/section/scene/density/QC) 무관 — 응답 직전 문자열 append 전용.
//
// 데이터 출처: store_profiles 1행(store 객체). index.js가 hubStore에서 페이로드로 실어 보내고,
//   각 generateXxx.js가 req.body에서 위치필드를 받아 buildLocationBlock(store)로 호출.
//
// 사용 컬럼(store_profiles 실측 기준):
//   address        text  — 정확 주소 (네이버 지도 자동 인식용, 1회만 노출)
//   map_guide      text  — 지도안내 문구 ("처인구청 맞은편", "CGV건물 3층") [v-loc ADD]
//   transit        text  — 대중교통 안내 ("2번 출구 도보 3분")               [v-loc ADD]
//   building_desc  text  — 건물 위치 설명                                    [v-loc ADD]
//   parking_info   text  — 주차 자유텍스트 ("지하주차장 2시간 무료") (기존 컬럼 유지)
//
// 설계 원칙(PHILOSOPHY 정합):
//   1) 매장명/브랜드명 본문 직접 노출 금지 → 이 블록은 지형지물만. store_name 미사용.
//   2) 광고어 0. "찾아오시는 길 / 주소 / 주차 안내" 등 사실 안내만.
//   3) address 없으면 블록 자체를 생성하지 않음("") → 빈 "찾아오시는 길" 박제 방지.
//   4) 있는 항목만 줄 단위로 출력. 비면 그 줄 생략(부분 입력 매장 대응).
//   5) QC/글자수 오염 방지 — 호출부에서 카운트 산출 이후(해시태그와 같은 위치)에 append.
// ============================================================
//
// [세션39][STORE-01] 매장 유무 게이트 추가
//   방문형(출장 서비스: 청소·이사·방역·누수·꽃배달 등 24종)은 고객이 업체를 방문하지 않는다.
//   → hasPhysicalStore(industry)===false 면 블록 미생성("").
//   → store.industry 가 없으면(구 페이로드) 기존 동작 유지(주소 기준 생성) — 하위호환.
//   ⚠ address 자체는 무손상. 대표지역 SoT(suggestRegion)·지역키워드가 이를 사용한다.
// ============================================================

import { hasPhysicalStore } from "./industry-catalog.js"; // [STORE-01]

// parking_info 가 "{상태} · {지하철안내}" 합성 포맷(index.js v77 composeParking)일 수 있어,
//   주차 라인엔 앞부분(상태)만 자연스럽게 쓰고 지하철 안내는 transit 라인이 담당.
//   단 transit 가 비어있고 parking_info 뒤쪽에 지하철 안내가 있으면 통째로 보여준다(정보 손실 방지).
function splitParking(parkingRaw, hasTransit) {
  const raw = String(parkingRaw || "").trim();
  if (!raw) return "";
  // "지하 주차장 2시간 무료 · 2호선 OO역 도보 3분" → ["지하 주차장 2시간 무료", "2호선 …"]
  const parts = raw.split(/\s*[·|]\s*/).filter(Boolean);
  if (parts.length <= 1) return raw;
  // transit 가 따로 채워져 있으면 주차 상태부만, 아니면 전체 유지.
  return hasTransit ? parts[0] : raw;
}

/**
 * buildLocationBlock(store)
 * @param {object} store  store_profiles 1행 (또는 위치 필드만 담은 객체)
 * @returns {string}  본문 끝에 붙일 블록 문자열. 데이터 없으면 "".
 */
export function buildLocationBlock(store) {
  const s = store || {};

  // [STORE-01] 방문형(출장) 업종 → 찾아오시는 길 미생성.
  //   industry 미전달(구 페이로드)이면 게이트 미적용 → 기존 동작 유지.
  const _ind = String(s.industry || "").trim();
  if (_ind && !hasPhysicalStore(_ind)) return "";

  const address      = String(s.address       || "").trim();
  const mapGuide     = String(s.map_guide      || "").trim();
  const transit      = String(s.transit        || "").trim();
  const buildingDesc = String(s.building_desc  || "").trim();
  const parkingState = splitParking(s.parking_info, !!transit);

  // address 가 핵심 앵커. 없으면 블록 미생성(빈 안내 박제 방지).
  if (!address) return "";

  const lines = [];
  lines.push("📍 찾아오시는 길");
  lines.push("");
  lines.push(`주소: ${address}`);

  // 위치 설명(지도안내 + 건물) — 지형지물 기반 자연 문장.
  const placeBits = [mapGuide, buildingDesc].filter(Boolean);
  if (placeBits.length) lines.push(placeBits.join(" "));

  if (transit)      lines.push(`대중교통: ${transit}`);
  if (parkingState) lines.push(`주차: ${parkingState}`);

  return lines.join("\n").trim();
}

/**
 * appendLocationBlock(bodyText, store, { before })
 * 본문 끝(해시태그 직전)에 LocationBlock 을 안전하게 붙인다.
 *   · 블록이 비면 원문 그대로 반환(부작용 0).
 *   · before(해시태그 문자열)가 주어지면 [본문 + 블록 + 해시태그] 순으로 재조립.
 *   · before 없으면 [본문 + 블록]만(해시태그는 호출부가 이후 append).
 * @returns {string}
 */
export function appendLocationBlock(bodyText, store, opts = {}) {
  const block = buildLocationBlock(store);
  const body  = String(bodyText || "");
  if (!block) {
    // 블록 없음 → before(해시태그)만 있으면 붙여서, 없으면 원문 그대로.
    return opts.before ? body.trimEnd() + "\n\n" + opts.before + "\n" : body;
  }
  let out = body.trimEnd() + "\n\n" + block;
  if (opts.before) out += "\n\n" + String(opts.before).trim() + "\n";
  return out;
}

/**
 * insertLocationBeforeHashtags(text, store)
 * 이미 "본문 … #해시태그"(맨 끝 줄이 해시태그)인 완성 텍스트에서,
 *   해시태그 줄을 떼어 → [본문 + LocationBlock + 해시태그] 순으로 재조립한다.
 *   · 네이버 관례: 해시태그는 항상 글 맨 끝. 위치블록은 그 위.
 *   · 블록이 비면(주소 없음) 원문 그대로 반환.
 *   · 맨 끝 줄이 해시태그가 아니면(태그 없는 업종) 그냥 본문 끝에 블록만 붙인다.
 *
 * dental/restaurant/bedding 처럼 "해시태그가 본문에 이미 합쳐진" 핸들러용.
 * @param {string} text   완성 본문(해시태그 포함 가능)
 * @param {object} store  위치 필드 객체
 * @returns {string}
 */
export function insertLocationBeforeHashtags(text, store) {
  const block = buildLocationBlock(store);
  const src   = String(text || "");
  if (!block) return src;

  const trimmed = src.trimEnd();
  const lines   = trimmed.split("\n");
  const lastLine = (lines[lines.length - 1] || "").trim();

  // 맨 끝 줄이 해시태그(#…)인가?
  if (lastLine.startsWith("#")) {
    const hashLine = lines.pop();                 // 해시태그 줄 분리
    const bodyOnly = lines.join("\n").trimEnd();  // 해시태그 위 본문
    return bodyOnly + "\n\n" + block + "\n\n" + hashLine + "\n";
  }

  // 해시태그 없는 경우(legal 등) → 본문 끝에 블록만.
  return trimmed + "\n\n" + block + "\n";
}

export default buildLocationBlock;
