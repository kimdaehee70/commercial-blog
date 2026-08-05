// =============================================
// lib/fishing-playConfig.js — 고패킹 섹션 구성 (DEAD CODE)
// =============================================
// ⚠️ DEAD CODE — 고패킹은 단일호출형 엔진이다.
//    유치원(generateKindergarten)과 달리 섹션 루프가 없다.
//    글 생성은 generateFishing.js가 buildXxxPrompt() 1개를 만들어
//    GPT 1회 호출로 전문(全文)을 받는다. 섹션별 getSectionInstruction 미사용.
//
//    SOP v4.2 STEP1 정합: "단일호출형이면 playConfig는 DEAD CODE 마커로 보존".
//    엔진 4파일 규격(data/prompts/playConfig/handler)을 형식상 충족하기 위해
//    파일만 존재시킨다. 어떤 코드 경로에서도 import되지 않는다.
//
//    ⛔ 향후 고패킹을 섹션루프형으로 전환할 때만 이 파일을 활성화한다.
//       그 전까지 수정 금지(엔진 FREEZE 대상).
// =============================================

export const FISHING_PLAYCONFIG_DEAD = true;
