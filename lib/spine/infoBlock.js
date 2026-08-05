// ============================================================
// lib/spine/infoBlock.js — commercial InfoBlock 공통 Spine (전 업종 공유)
// ------------------------------------------------------------
// 역할: commercial 모드 "마지막 섹션 끝"에 붙던 업종별 CTA/안내 문구를
//   업종별 인라인 배열에서 이 Spine으로 이관. 각 엔진은 renderInfoBlock()만 호출.
//
//   · LocationBlock(위치/주차)과 별개 모듈. 여긴 commercial 마감 안내 전용.
//   · narrative 아님 — 순수 문구 registry. 문구·랜덤로직 기존과 100% 동일.
//   · personal 모드는 이관 대상 아님(엔진 내부 심볼 의존). commercial만.
//
// 이관 원칙(신규 추가 아님):
//   기존 commercialCTAs 배열 문구 그대로 → registry로 이동 → 같은 위치에서 출력.
//   문구 변경·위치 변경·신규 블록 추가 없음.
//
// 업종 추가 시(SOP v4.2 정합):
//   INFO_BLOCKS 에 업종키 + build(ctx) 만 등록. 엔진은 renderInfoBlock 호출만.
// ============================================================

// ctx: 각 엔진이 넘기는 치환 변수. 업종마다 키가 다르므로 build 시점에 꺼내 쓴다.
//   ortho:      { region, subKw }
//   restaurant: { region, menu }
const INFO_BLOCKS = {
  // ── 정형외과 (generateOrtho commercialCTAs 원본 이관, 2413~2417) ──
  ortho: {
    commercial(ctx) {
      const { region = "", subKw = "" } = ctx || {};
      return [
        `\n\n비슷한 증상이 있다면 ${region} ${subKw} 진료를 고려해볼 수 있습니다. 진단·치료 결정은 의료진 상담 후 안내됩니다.`,
        `\n\n${region}에서 ${subKw} 진료 검토 시 전문의 자격, 시설(MRI·X-ray·초음파), 진료 분야 등을 일반적으로 확인해보시는 것이 권장됩니다.`,
        `\n\n${subKw} 진행 여부는 환자 상태에 따라 다르므로 ${region} 정형외과 진료 후 안내받으실 수 있습니다.`,
      ];
    },
  },

  // ── 음식점 (generateRestaurant commercialCTAs 원본 이관, 1556~1558) ──
  restaurant: {
    commercial(ctx) {
      const { region = "", menu = "" } = ctx || {};
      return [
        `\n\n${region} ${menu} 관련 정보는 일반적인 안내입니다. 메뉴·가격·영업시간은 매장 상황에 따라 달라질 수 있으니, 방문 시 매장에서 직접 확인해보시는 것이 권장됩니다.`,
        `\n\n위 내용은 ${region} ${menu} 일반 정보 안내입니다. 운영 정보·웨이팅·메뉴 구성은 시기에 따라 차이가 있으므로 방문 전 확인해보시기 바랍니다.`,
        `\n\n${menu} 관련 운영 정보를 정리한 내용입니다. 본인 방문 목적에 맞는지는 매장 안내 후 확인해보시는 것이 좋습니다.`,
      ];
    },
  },
};

/**
 * renderInfoBlock(industry, mode, ctx)
 * @param {string} industry  업종키 (ortho / restaurant / ...)
 * @param {string} mode      "commercial" 만 지원 (personal은 엔진 내부 유지 → "" 반환)
 * @param {object} ctx       치환 변수 (업종별 상이)
 * @returns {string}  본문 끝에 붙일 문구 1개(기존과 동일 랜덤 선택). 없으면 "".
 *
 * 기존 인라인 로직과 100% 동형:
 *   const arr = [...]; text += arr[Math.floor(Math.random()*arr.length)];
 */
export function renderInfoBlock(industry, mode, ctx = {}) {
  if (mode !== "commercial") return "";        // personal 등은 이관 대상 아님
  const entry = INFO_BLOCKS[industry];
  if (!entry || typeof entry.commercial !== "function") return "";
  const arr = entry.commercial(ctx);
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

export default renderInfoBlock;
