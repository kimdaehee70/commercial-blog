// pages/index.js — commercial-blog v3.2
// 좌측: 대화창 | 우측: 단계별 설명보드 → 생성 완료 시 결과물

import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useStore } from "../contexts/StoreContext";
import { getActiveContext } from "../lib/contextSpine";
import { getPhotoPolicy, photoDescLine } from "../lib/photoPolicyRegistry";
import { getRegionStrategySafe } from "../lib/spine/regionStrategyRegistry";  // [v-region] 지역 전략(visit/service) 조회 — 미등록 업종은 visit 축퇴
import { buildCoreKeyword, buildObservationCore, stripCtpvPrefix } from "../lib/spine/serviceAxis";  // [S117] Core 관측축 — region + catalog.name. full_keyword(소재축)와 분리
//   [CORE-AT-GENERATION-01] stripCtpvPrefix / buildObservationCore = lib 이관분(구 index 로컬 정의).
//     Core 계산 SoT 는 lib 1곳. 화면에서 조합식을 재구현하지 않는다.

// [CORE-AT-GENERATION-01] 구 로컬 CORE_CTPV_PREFIX / stripCtpvPrefix 정의는
//   lib/spine/serviceAxis.js 로 이관됨(서버 save-generated 공용 사용). 상단 import 참조.
import { getIntents, listIntentOptions } from "../lib/spine/intentSpine";  // [WIRING-03] INTENT 조회 전용. 정의된 cat 에서만 셀렉터 노출(데이터가 곧 게이트)
import { CLINIC_TARGETS, ALL_TREATMENTS as CLINIC_TREATMENTS, CLINIC_BLOG_TYPES } from "../lib/clinic-data";
import { DENTAL_TREATMENTS, DENTAL_META } from "../lib/dental-data";
// [ent v2 승격 2026-07-13] 이비인후과 V2 Purpose — v1(ent-data 20종·후기형) → v2(14종·정보형) 교체.
//   v1 lib/ent-data.js 파일 무손상·FREEZE 유지. 롤백 = 이 import 1줄만 원복.
import { ENT_V2_TREATMENTS as ENT_TREATMENTS, ENT_V2_META as ENT_META } from "../lib/ent-v2-data";
import { UROLOGY_V2_TREATMENTS as UROLOGY_TREATMENTS, UROLOGY_V2_META as UROLOGY_META } from "../lib/urology-v2-data";
import { ORIENTAL_TREATMENTS, ORIENTAL_META }   from "../lib/oriental-data";
import { ORTHO_TREATMENTS, ORTHO_META }         from "../lib/ortho-data";
import { PEDIATRICS_V2_TREATMENTS as PEDIATRICS_TREATMENTS, PEDIATRICS_V2_META as PEDIATRICS_META } from "../lib/pediatrics-v2-data";  // ← 소아청소년과 V2 (2026-07-13 승격 · v1 무손상)
import { GASTRO_TREATMENTS, GASTRO_META }         from "../lib/gastro-data";         // ← 소화기내과
import { PULMO_TREATMENTS, PULMO_META, PULMO_CATS } from "../lib/pulmo-data";          // ← 호흡기내과 (신규, V2 Purpose 단독)
import { CARD_TREATMENTS, CARD_META, CARD_CATS } from "../lib/card-data";              // ← 순환기내과 (신규, V2 Purpose 단독)
import { ENDO_TREATMENTS, ENDO_META, ENDO_CATS } from "../lib/endo-data";              // ← 내분비내과 (신규, V2 Purpose 단독)
import { GENERAL_TREATMENTS, GENERAL_META }       from "../lib/general-data";        // ← 내과 (v1 후기형 · FREEZE)
import { GENERAL_V2_TREATMENTS, GENERAL_V2_META, GENERAL_V2_CATS } from "../lib/general-v2-data";  // ← 내과 V2 (1차 진료 허브 · 관측 전)
import { OBGYN_V2_TREATMENTS as OBGYN_TREATMENTS, OBGYN_V2_META as OBGYN_META } from "../lib/obgyn-v2-data";   // ← 산부인과 V2 (14종·정보형) 2026-07-13 · v1 obgyn-data 무손상
import { DERMA_V2_TREATMENTS as DERMA_TREATMENTS, DERMA_V2_META as DERMA_META, DERMA_V2_CATS } from "../lib/derma-v2-data";  // ← 피부과 V2 Purpose (v1 derma-data 보존·미참조)
import { PAIN_TREATMENTS, PAIN_META }             from "../lib/pain-data";            // ← 통증의학과
import { RADIO_TREATMENTS, RADIO_META }           from "../lib/radio-data";           // ← 영상의학과 (검사형·관측 전)
import { NEURO_TREATMENTS, NEURO_META }           from "../lib/neuro-data";           // ← 신경외과
import { PSY_V2_TREATMENTS as PSY_TREATMENTS, PSY_V2_META as PSY_META } from "../lib/psy-v2-data";   // ← 정신건강의학과 [V2 승격 2026-07-13] v1 lib/psy-data 롤백용 보존
import { EYE_V2_TREATMENTS as EYE_TREATMENTS, EYE_V2_META as EYE_META } from "../lib/eye-v2-data";   // ← 안과 V2 (재구축 2026-07-13)
import { FAMILY_V2_TREATMENTS as FAMILY_TREATMENTS, FAMILY_V2_META as FAMILY_META } from "../lib/family-v2-data";  // ← 가정의학과 V2 승격 (v1 family-data 보존)
import { LEGAL_TREATMENTS, LEGAL_META }           from "../lib/legal-data";           // ← 법무사 (v142, 비의료·정보형)
import { LAWYER_TREATMENTS, LAWYER_META, LAWYER_CATS } from "../lib/lawyer-data";      // ← 변호사 (v29 — 4대분류·정보형·사무소화자)
import { DAYCARE_TREATMENTS, DAYCARE_META, DAYCARE_CATS } from "../lib/daycare-data";  // ← 데이케어센터 (정보형·기관화자, lawyer 복사 베이스)
import { HOMECARE_TREATMENTS, HOMECARE_META, HOMECARE_CATS } from "../lib/homecare-data";  // ← 방문요양 (정보형·기관화자, daycare 복사 베이스)
import { FUNERAL_TREATMENTS, FUNERAL_META, FUNERAL_CATS } from "../lib/funeral-data";  // ← 상조 (정보형·장례지도사화자, daycare 복사 베이스)
import { TAX_TREATMENTS, TAX_META, TAX_CATS } from "../lib/tax-data";  // ← 세무사 (정보형·세무사화자, funeral 복사 베이스)
import { LABOR_TREATMENTS, LABOR_META, LABOR_CATS } from "../lib/labor-data";  // ← 노무사 (정보형·공인노무사화자, tax 복사 베이스)
import { FLOWER_TREATMENTS, FLOWER_META, FLOWER_CATS } from "../lib/flower-data";  // ← 꽃배달 (정보형·플로리스트화자, daycare 복사 베이스·단일호출)
import { WELFARECARE_TREATMENTS, WELFARECARE_META, WELFARECARE_CATS } from "../lib/welfarecare-data";  // ← 복지용구 (정보형·사업소화자, daycare 복사 베이스·단일호출)
import { SENIORGOODS_TREATMENTS, SENIORGOODS_META, SENIORGOODS_CATS } from "../lib/seniorgoods-data";  // ← 노인용품 (정보형·노인용품전문점화자, welfarecare 복사 베이스·단일호출)
import { ADMIN_TREATMENTS, ADMIN_META, ADMIN_CATS } from "../lib/administrative-data";  // ← 행정사 (정보형·행정사화자, lawyer 복사 베이스·섹션루프)
import { REALESTATE_TREATMENTS, REALESTATE_META, REALESTATE_CATS } from "../lib/realestate-data";  // ← 부동산 (분석리포트형·공인중개사화자, lawyer 복사 베이스·섹션루프)
import { CLEANING_TREATMENTS, CLEANING_META, CLEANING_CATS } from "../lib/cleaning-data";  // ← 입주청소 (정보형·청소업체화자, realestate 복사 베이스·섹션루프)
import { MOVING_TREATMENTS, MOVING_META, MOVING_CATS } from "../lib/moving-data";  // ← 이사업체 (정보형·이사업체화자, cleaning 복사 베이스·섹션루프)
import { INTERIOR_TREATMENTS, INTERIOR_META, INTERIOR_CATS } from "../lib/interior-data";  // ← 인테리어 (정보형·인테리어업체화자, moving 복사 베이스·섹션루프)
import { GROUT_TREATMENTS, GROUT_META, GROUT_CATS } from "../lib/grout-data";  // ← 줄눈 (정보형·줄눈시공업체화자, interior70%+cleaning30% 복사 베이스·섹션루프)
import { COATING_TREATMENTS, COATING_META, COATING_CATS } from "../lib/coating-data";  // ← 탄성코트 (정보형·탄성코트업체화자, grout 복사 베이스·섹션루프)
import { SYSTEMAIR_TREATMENTS, SYSTEMAIR_META, SYSTEMAIR_CATS } from "../lib/systemair-data";  // ← 시스템에어컨 (정보형·시스템에어컨업체화자, coating 복사 베이스·섹션루프)
import { AIRCLEAN_TREATMENTS, AIRCLEAN_META, AIRCLEAN_CATS } from "../lib/airclean-data";  // ← 에어컨청소 (정보형·에어컨청소업체화자, coating 복사 베이스·섹션루프, 청소전용)
import { SCREEN_TREATMENTS, SCREEN_META, SCREEN_CATS } from "../lib/screen-data";  // ← 방충망 (정보형·방충망업체화자, airclean 복사 베이스·섹션루프, useApt=true)
import { PESTCONTROL_TREATMENTS, PESTCONTROL_META, PESTCONTROL_CATS } from "../lib/pestcontrol-data";  // ← 방역 (정보형·방역업체화자, cleaning 복사 베이스·섹션루프, 출장업종)
import { BUILDINGCLEAN_TREATMENTS, BUILDINGCLEAN_META, BUILDINGCLEAN_CATS } from "../lib/buildingclean-data";  // ← 건물청소 (정보형·건물청소업체화자, cleaning70%+pestcontrol20% 복사 베이스·섹션루프, 출장업종)
import { DOBAE_TREATMENTS, DOBAE_META, DOBAE_CATS } from "../lib/dobae-data";  // ← 도배 (정보형·도배업체화자, buildingclean 복사 베이스·섹션루프, 출장업종 / siteBlock 현장정보(단지명·평형) 사용)
import { FLOORING_TREATMENTS, FLOORING_META, FLOORING_CATS } from "../lib/flooring-data";
import { FILM_TREATMENTS, FILM_META, FILM_CATS } from "../lib/film-data";
import { DOOR_TREATMENTS, DOOR_META, DOOR_CATS } from "../lib/door-data";  // ← 도어수리 (정보형·도어수리업체화자, film 복사 베이스·섹션루프, 출장수리 / siteBlock 미사용 / 부품군 축)  // ← 인테리어필름 (정보형·필름시공업체화자, flooring 복사 베이스·섹션루프, 출장업종 / siteBlock 현장정보(단지명·평형) + 하지(下地) 축)  // ← 장판 (정보형·장판시공업체화자, dobae 복사 베이스·섹션루프, 출장업종 / siteBlock 현장정보(단지명·평형) + 두께(T) 축)
import { WATERPROOF_TREATMENTS, WATERPROOF_META, WATERPROOF_CATS } from "../lib/waterproof-data";  // ← 방수공사 (정보형·방수시공업체화자, door 복사 베이스·섹션루프, 출장시공 / siteBlock 미사용 / 원인군 축)
import { PAINT_TREATMENTS, PAINT_META, PAINT_CATS } from "../lib/paint-data";  // ← 페인트공사 (정보형·페인트시공업체화자, waterproof 복사 베이스·섹션루프, 출장시공 / siteBlock 미사용 / 원인군 축)
import { TILE_TREATMENTS, TILE_META, TILE_CATS } from "../lib/tile-data";  // ← 타일시공 (정보형·타일시공업체화자, paint 복사 베이스·섹션루프, 출장시공 / siteBlock 미사용 / 철거·덧방 판단 축)
import { WINDOW_TREATMENTS, WINDOW_META, WINDOW_CATS } from "../lib/window-data";  // ← 창호시공 (정보형·창호시공업체화자, tile 복사 베이스·섹션루프, 출장시공 / siteBlock 미사용 / 전체교체·부분보수 판단 축)
import { FURNITURE_TREATMENTS, FURNITURE_META, FURNITURE_CATS } from "../lib/furniture-data";  // ← 맞춤가구 (정보형·맞춤가구제작업체화자, lighting 복사 베이스·섹션루프, 출장제작설치 / siteBlock 미사용 / 자리 제약 판단 축)
import { LIGHTING_TREATMENTS, LIGHTING_META, LIGHTING_CATS } from "../lib/lighting-data";  // ← 조명 (정보형·조명시공업체화자, window 복사 베이스·섹션루프, 출장시공 / siteBlock 미사용 / 배치 여건 판단 축)
import { DEMOLITION_TREATMENTS, DEMOLITION_META, DEMOLITION_CATS } from "../lib/demolition-data";  // ← 철거공사 (정보형·철거공사업체화자, tile 복사 베이스·섹션루프, 출장해체 / siteBlock 미사용 / 살릴면·뜯을면 판단 축)
import { BIRDCONTROL_TREATMENTS, BIRDCONTROL_META, BIRDCONTROL_CATS } from "../lib/birdcontrol-data";  // ← 비둘기퇴치 (정보형·비둘기퇴치업체화자, pestcontrol50%+buildingclean30%+screen20% 복사 베이스·섹션루프, 출장업종)
import { TANKCLEAN_TREATMENTS, TANKCLEAN_META, TANKCLEAN_CATS } from "../lib/tankclean-data";  // ← 저수조청소 (정보형·저수조청소업체화자, cleaning70%+pestcontrol20%+birdcontrol10% 복사 베이스·섹션루프, 출장업종·useApt)
import { LEAKDETECT_TREATMENTS, LEAKDETECT_META, LEAKDETECT_CATS } from "../lib/leakdetect-data";  // ← 누수탐지 (정보형·누수탐지업체화자, tankclean70%+buildingclean60% 복사 베이스·섹션루프, 출장업종·useApt)
import { SEWER_TREATMENTS, SEWER_META, SEWER_CATS } from "../lib/sewer-data";  // ← 하수구막힘 (정보형·하수구막힘업체화자, leakdetect70% 복사 베이스·섹션루프, 출장업종·APT미사용)
import { PLUMBING_TREATMENTS, PLUMBING_META, PLUMBING_CATS } from "../lib/plumbing-data";  // ← 수도설비 (정보형·수도설비업체화자, sewer70% 복사 베이스·섹션루프, 출장업종·APT미사용)
import { BOILER_TREATMENTS, BOILER_META, BOILER_CATS } from "../lib/boiler-data";  // ← 보일러설치 (정보형·보일러설치업체화자, systemair70% 복사 베이스·섹션루프, 출장업종·APT미사용)
import { HOMEFIX_TREATMENTS, HOMEFIX_META, HOMEFIX_CATS } from "../lib/homefix-data";  // ← 집수리 (정보형·집수리업체화자, boiler 복사 베이스·섹션루프, 출장업종·APT미사용)
import { ELECTRICREPAIR_TREATMENTS, ELECTRICREPAIR_META, ELECTRICREPAIR_CATS } from "../lib/electricrepair-data";  // ← 전기수리 (정보형·전기수리업체화자, homefix80%+plumbing20% 복사 베이스·섹션루프, 출장업종·APT미사용)
import { SINKREPAIR_TREATMENTS, SINKREPAIR_META, SINKREPAIR_CATS } from "../lib/sinkrepair-data";  // ← 싱크대수리 (정보형·싱크대수리업체화자, homefix60%+plumbing20%+interior20% 복사 베이스·섹션루프, 출장업종·APT미사용 / 수리전용, 제작·리폼 차단)
import { BATHROOM_TREATMENTS, BATHROOM_META, BATHROOM_CATS } from "../lib/bathroom-data";  // ← 욕실리모델링 (정보형·욕실리모델링업체화자, homefix40%+sinkrepair30%+plumbing20%+grout10% 복사 베이스·섹션루프, 출장업종·APT미사용 / 12메뉴)
import { BEDDING_TREATMENTS, BEDDING_META, BEDDING_CATS } from "../lib/bedding-data"; // ← 이브자리 침구 (v10 — 비의료·정보형·매장화자)
import { CAFE_TREATMENTS, CAFE_META, CAFE_CATS, CAFE_LONGTAIL_SUFFIXES } from "../lib/cafe-data"; // ← 카페·디저트 (Phase 9)
import { KINDERGARTEN_TREATMENTS, KINDERGARTEN_TARGET, KINDERGARTEN_CATS, KINDERGARTEN_BLOG_TYPES } from "../lib/kindergarten-data"; // ← 유치원 (반장 edu 18 이식·정보형·기관화자·섹션루프 / 관측 전)
import { FISHING_TREATMENTS, FISHING_CATS, FISHING_META } from "../lib/fishing-catalog"; // ← 고패킹·바다낚시 (반장 fishing 이식·정보형·낚시화자·단일호출형 / 글유형 3종 method·analysis·compare / 관측 전)
import { SHAMAN_TREATMENTS, SHAMAN_META, SHAMAN_CATS } from "../lib/shaman-data";  // ← 무속 상담 (공감형·상담소화자, 신규 골격·단일호출 / SPECIALTY 6 × SITUATION 35 + 분야소개 6 = 41 / Engine C hidden)
import {
  RESTAURANT_TREATMENTS, RESTAURANT_META,
  RESTAURANT_CATS, RESTAURANT_LONGTAIL_SUFFIXES,
  filterTreatmentsByPromotion,   // ★ v3 홍보메뉴 필터 (생성/노출 대상 = promotionMenus만)
  getSpecialtyMenus,             // ★ [전문점 메뉴 인라인] SPECIALTY.menus 조회 (data.js SoT · 하드코딩 금지)
  RESTAURANT_SPECIALTY,          // ★ [로그인 훅 집계] 메뉴 합계 산출용
} from "../lib/restaurant-data"; // ← 맛집·식당 (Phase 9.5 — 조합형 검색의도 SEO)
import {
  INDUSTRY_TREE,                                    // ← [Tree Spine SoT] 업종 선택 구조 단일 소스. subItems 이관(catalog=메타, tree=선택구조).
  treeItemsOf, treeEngineOf,                         // ← [Spine 이관] tree 조회 헬퍼 (CATALOG_COUNT 등 index 본체 소비)
  INDUSTRY_GROUPS, SUB_TO_GROUP,                     // ← [Spine 이관] 온보딩 대분류 선택구조 (industryPath·index 본체 소비)
  HOSPITAL_DEPARTMENTS, isHospitalIndustry,          // ← [v-dept] 병원 다중 진료과 SoT (진료과 스위처)
  normalizeDepartments, deptLabel, hasServiceFields, serviceGroupOf,   // ← [v-svcgate] 다중분야 게이트 일반화(병원+공사군)
} from "../lib/industry-tree";
import {
  IndustryPicker, IndustrySideMenu, industryStatusBadge, IndustryTree, IndustryDetail,
} from "../lib/IndustrySelector"; // ← [IndustrySelector Spine] 업종 선택 UI 분리 모듈. index는 배선만.
import { StoreInfoForm, makeStoreApi } from "../lib/Store"; // ← [Store Spine 2026-07-06] 업체정보 폼 + 저장/API 분리. INDUSTRY_CONFIG·lex 주입 소비.
import { makeObservationApi } from "../lib/Observation"; // ← [Observation Spine 2026-07-06] survival/rank 로드 + saveRank 분리. setter 주입 소비.
import { makePublishApi } from "../lib/Publish"; // ← [Publish Spine 1차 2026-07-06] publish-secure/check-quota fetch 위임. payload·state는 호출부 유지.
import { makeAIGenerateApi } from "../lib/AIGenerate"; // ← [AI Generate Spine 2026-07-06] check-quota/generate/save-generated 순수 fetch 위임. payload·분기·state는 호출부 유지.
import {
  CHINESE_TREATMENTS, CHINESE_META,
  CHINESE_CATS, CHINESE_LONGTAIL_SUFFIXES,
} from "../lib/chinese-data"; // ← 중식·중화요리 (신규, Restaurant계열 독립엔진 / 관측 전)
import {
  KOREAN_TREATMENTS, KOREAN_META,
  KOREAN_CATS, KOREAN_LONGTAIL_SUFFIXES,
} from "../lib/korean-data"; // ← 한식 (신규, Chinese계열 독립엔진 / 관측 전)
import {
  SNACK_TREATMENTS, SNACK_META,
  SNACK_CATS, SNACK_LONGTAIL_SUFFIXES,
} from "../lib/snack-data"; // ← 분식 (신규, Korean(Restaurant)계열 독립엔진·class 4축·13메뉴 / 관측 전)
import {
  JAPANESE_TREATMENTS, JAPANESE_META,
  JAPANESE_CATS, JAPANESE_LONGTAIL_SUFFIXES,
} from "../lib/japanese-data"; // ← 일식 (신규, Chinese계열 독립엔진·cat 4계열·13메뉴 / 관측 전)
import {
  CHICKEN_TREATMENTS, CHICKEN_META,
  CHICKEN_CATS, CHICKEN_LONGTAIL_SUFFIXES,
} from "../lib/chicken-data"; // ← 치킨 (신규, Japanese계열 독립엔진·cat 4계열·12메뉴 / 관측 전)
import {
  WESTERN_TREATMENTS, WESTERN_META,
  WESTERN_CATS, WESTERN_LONGTAIL_SUFFIXES,
  WESTERN_PURPOSES, WESTERN_SITUATIONS,   // ★ [세션46] purpose/situation 랜덤 선택 소스 (엔진 무수정)
} from "../lib/western-data"; // ← 양식 (신규, Chinese계열 독립엔진·cat 4계열·8메뉴 / 관측 전)
import {
  MEAT_TREATMENTS, MEAT_META,
  MEAT_CATS, MEAT_LONGTAIL_SUFFIXES,
} from "../lib/meat-data"; // ← 고깃집 (신규, Restaurant v2계열 독립엔진·cat 단일·8메뉴 / 관측 전)
// [업종센터] 업종 카탈로그(로드맵 전용, 엔진 무관). 업종센터 탭 + 업체정보 진입점에서 사용.
import { INDUSTRY_CATALOG, INDUSTRY_STATUS_META, getCatalogByCategory, getCatalogItem } from "../lib/industry-catalog";
// [Tree Spine] tree 헬퍼(treeNodeOf/treeItemsOf/treeEngineOf) + 온보딩 선택구조는
//   industry-tree.js(SoT)로 이관 — 아래 import에서 소비.
// ★ [로그인 훅] 업종/메뉴 집계 — catalog SoT 자동 반영(업종 추가 시 숫자 자동 증가)
const CATALOG_COUNT = (() => {
  const leaf = (it) => { const t = treeItemsOf(it); return t.length ? t.length : 1; };
  let industries = 0;
  for (const it of INDUSTRY_CATALOG) industries += leaf(it);
  let menus = 0;
  try {
    for (const s of RESTAURANT_SPECIALTY) {
      menus += (s.menus?.representative?.length || 0) + (s.menus?.side?.length || 0);
    }
  } catch (_) {}
  const cats = new Set(INDUSTRY_CATALOG.map((it) => it.category || "기타"));
  // [v-cl 2026-07-27] Construction / Living 분리 통계 — 카테고리별 leaf 합계.
  //   전체 합계(industries)는 유지하고, 두 축만 추가로 노출(4타일). 카테고리 추가 시 여기 1줄.
  const byCat = (name) => INDUSTRY_CATALOG
    .filter((it) => (it.category || "기타") === name)
    .reduce((a, it) => a + leaf(it), 0);
  return {
    industries,
    menus,
    categories: cats.size,
    construction: byCat("건설·시공"),
    living: byCat("생활서비스"),
  };
})();
import RestaurantSelector from "../components/RestaurantSelector"; // ← restaurant 전용 4단 select UI
import MainHero from "../components/MainHero";
import SiteFooter from "../components/SiteFooter";

// ============================================================
// [howto-video] 사용방법 영상 가이드 — 좌측 목차(HowtoScreen) + 중앙 재생(HowtoVideoPanel)
//   videoId 있으면 활성, 없으면 "준비 중"(회색). 영상 추가 = 아래 배열에 id만 채우면 끝.
// ============================================================
// [세션57][AI영상코치] 메뉴별 고정 도우미 영상 — 좌측 코치창 상단 영상 플레이어의 SoT.
//   틀 원칙: 플레이어는 하나, 메뉴가 바뀌면 title/videoId만 교체된다.
//   확장 = 이 맵에 한 줄 추가. 컴포넌트·배선 무수정.
//   videoId 빈값 = "준비 중" 카드(부작용 0). 영상 준비되면 id만 채우면 즉시 노출.
const COACH_VIDEOS = {
  // 업체정보 — 입력 카드 단위
  store_title:  { title: "제목 업체명 표시 도우미", videoId: "rG7J5dKu0OY" },
  store_region: { title: "생활권 입력 도우미",      videoId: "S5lweK-6twk" },
  store_visit:  { title: "방문정보 입력 도우미",    videoId: "dZ-WHC2xH7U" },
  store_ident:  { title: "업체정보 입력 도우미",    videoId: "jgqjfVqa7jc" },
  store_dept:   { title: "서비스 분야 선택 도우미",  videoId: "Xjvup73BVXg" },
  // 메뉴 단위
  stats:    { title: "발행비율 설정 도우미",   videoId: "maJ74BEyELA" },
  coach:    { title: "AI 글쓰기 도우미",       videoId: "zK5RZ8bLT5Y" },
  posts:    { title: "발행 결과 확인 도우미",  videoId: "GqOfl5q6TuA" },
  // [v-editguide] AI 글 수정 가이드 전용 — 영상 준비되면 videoId만 채운다.
  edit_guide: { title: "AI 글을 안전하게 수정하는 방법", videoId: "" },
  // [v-blogtitle] 블로그 타이틀 꾸미기 전용 — 교체는 videoId 한 줄.
  blogtitle: { title: "블로그 타이틀 꾸미기", videoId: "Ne0dsplY6FI" },
  tools:    { title: "사진편집기 사용 도우미", videoId: "XZ8QbVjNPqY" },
  survival: { title: "순위관측 도우미",        videoId: "" },
  account:  { title: "마이페이지 도우미",      videoId: "o_vU2JVdvOk" },
  plans:    { title: "요금제 안내 도우미",     videoId: "1yVBmGX6B0c" },
  // [v-landing 2026-07-27] 메인 소개 영상 — 교체는 videoId 한 줄.
  landing:  { title: "AI-POST.AI 소개",        videoId: "wFGgmYFxjP4" },   // [세션71] 로그인 메인 영상 교체(구 U50mwRLjj28)
  // [세션71] 비로그인 좌측 전용 영상. 로그인 좌측(landing)과 SoT 분리 —
  //   비로그인은 "가능할까?" 증명용, 로그인은 실행 안내용이라 소재가 다르다.
  landing_guest: { title: "AI-POST.AI 소개", videoId: "QTQwFiufEYA" },
};

const HOWTO_VIDEOS = {
  write: {
    title: "사용방법",
    groups: [
      { g: "시작하기", items: [
        { id: "store",    no: "①", label: "업체등록",   videoId: "gm-McMiNzRc", desc: "업체명·업종·대표지역을 등록하는 과정입니다. 약 3분 소요." },
        { id: "industry", no: "②", label: "업종선택",   videoId: "", desc: "" },
        { id: "write",    no: "③", label: "블로그 생성", videoId: "", desc: "" },
        { id: "url",      no: "④", label: "URL 등록",   videoId: "", desc: "" },
        { id: "posts",    no: "⑤", label: "최근발행",   videoId: "", desc: "" },
        { id: "survival", no: "⑥", label: "순위관측",   videoId: "", desc: "" },
      ]},
      { g: "운영", items: [
        { id: "photo",  no: "⑦", label: "사진편집기",  videoId: "", desc: "" },
        { id: "guide",  no: "⑧", label: "발행가이드",  videoId: "", desc: "" },
        { id: "shorts", no: "⑨", label: "쇼츠 만들기", videoId: "", desc: "" },
      ]},
    ],
  },
  publish: { title: "네이버 발행방법", groups: [{ g: "발행", items: [
    { id: "naver", no: "①", label: "네이버 블로그 발행", videoId: "", desc: "" },
  ]}]},
  title: { title: "블로그 타이틀 만드는 법", groups: [{ g: "타이틀", items: [
    { id: "blogtitle", no: "①", label: "블로그 타이틀 설정", videoId: "rG7J5dKu0OY", desc: "제목 끝 업체명 표시 설정 방법" },
  ]}]},
};
const _howtoFlat = (guideId) =>
  (HOWTO_VIDEOS[guideId] || HOWTO_VIDEOS.write).groups.flatMap(g => g.items);
const howtoFindItem = (guideId, itemId) => {
  const flat = _howtoFlat(guideId);
  return flat.find(i => i.id === itemId) || flat.find(i => i.videoId) || flat[0] || null;
};

// [세션57][AI영상코치] 좌측 코치창 상단 고정 영상 플레이어.
//   플레이어는 하나. 메뉴(menuId)에 따라 COACH_VIDEOS의 title/videoId만 교체된다.
//   맵에 없는 메뉴 = null 반환(미노출). 신규 메뉴는 COACH_VIDEOS 한 줄 추가로 끝.
// [v-editguide5] 글 수정 가이드는 이미지(/g-guide-1~4.png)로 대체 — 텍스트 프리셋/패널 전량 삭제.

function CoachVideoCard({ menuId, onClose }) {
  const conf = COACH_VIDEOS[menuId];
  if (!conf) return null;
  return (
    <div style={{ margin: "0 10px 12px", background: "#fff", borderRadius: 14,
      border: "1.5px solid #e0d0f0", overflow: "hidden",
      boxShadow: "0 2px 10px rgba(100,50,180,.06)" }}>
      <div style={{ padding: "9px 13px", background: "#faf5ff",
        borderBottom: "1px solid #f0e6fa", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#4A148C" }}>🎥 {conf.title}</span>
        {/* [세션58] 고정형 배치 시 onClose 미전달 → 닫기 버튼 미표시 */}
        {onClose && (
        <button type="button" onClick={onClose}
          style={{ fontSize: 11.5, fontWeight: 700, color: "#7a5a9a", background: "#fff",
            border: "1px solid #e0d0f0", borderRadius: 12, padding: "3px 10px",
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          ✕ 닫기
        </button>
        )}
      </div>
      {conf.videoId ? (
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000" }}>
          <iframe
            src={`https://www.youtube.com/embed/${conf.videoId}?cc_load_policy=0&iv_load_policy=3`}
            title={conf.title}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <div style={{ padding: "26px 14px", textAlign: "center", color: "#9a9ab5", fontSize: 12.5 }}>
          준비 중인 영상입니다.
        </div>
      )}
    </div>
  );
}

// 좌측 코치창 = 영상(상단) + 목차(하단). 우측은 실제 작업 화면 그대로 유지 → 보면서 따라하기.
function HowtoScreen({ guideId = "write", selId = "", onPick }) {
  const conf = HOWTO_VIDEOS[guideId] || HOWTO_VIDEOS.write;
  const cur = howtoFindItem(guideId, selId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#4A148C", padding: "2px 4px" }}>
        🎥 {conf.title}
      </div>

      {/* 영상 — 좌측 코치. 오른쪽 화면에서 그대로 따라 하면 됩니다. */}
      {cur && cur.videoId ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8ed", padding: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>
            {cur.no} {cur.label}
          </div>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%",
            borderRadius: 8, overflow: "hidden", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${cur.videoId}`}
              title={cur.label}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          {cur.desc && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: "#4a4a5e", lineHeight: 1.6 }}>{cur.desc}</div>
          )}
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#7B1FA2", fontWeight: 700 }}>
            👉 영상을 보면서 오른쪽 화면에서 그대로 따라 하세요.
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8ed",
          padding: "28px 16px", textAlign: "center", color: "#9a9ab5", fontSize: 12.5 }}>
          준비 중인 영상입니다.
        </div>
      )}

      {/* 목차 */}
      {conf.groups.map((grp) => (
        <div key={grp.g}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#9a9ab5", padding: "0 4px 6px" }}>▶ {grp.g}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {grp.items.map((it) => {
              const ready = !!it.videoId;
              const act = ready && cur && cur.id === it.id;
              return (
                <button key={it.id} type="button"
                  disabled={!ready}
                  onClick={() => ready && onPick && onPick(it.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 11px", borderRadius: 10, fontFamily: "inherit", textAlign: "left",
                    border: act ? "1.5px solid #9C27B0" : "1.5px solid #ececf2",
                    background: act ? "#faf5ff" : ready ? "#fff" : "#f7f7fa",
                    color: ready ? "#1a1a2e" : "#b6b6c2",
                    cursor: ready ? "pointer" : "default",
                    fontSize: 13, fontWeight: act ? 800 : 600 }}>
                  <span style={{ flexShrink: 0 }}>{it.no}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>{it.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ready ? "#7B1FA2" : "#bdbdc9" }}>
                    {ready ? "🎥" : "준비 중"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "#9a9ab5", lineHeight: 1.6, padding: "2px 4px" }}>
        영상은 순차적으로 추가됩니다.
      </div>
    </div>
  );
}

// 중앙 영상 패널 — 목차에서 고른 항목의 유튜브 임베드 + 설명
function HowtoVideoPanel({ guideId = "write", itemId = "" }) {
  const it = howtoFindItem(guideId, itemId);
  if (!it || !it.videoId) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed",
        padding: "48px 24px", textAlign: "center", color: "#9a9ab5", fontSize: 13.5 }}>
        준비 중인 영상입니다. 왼쪽에서 🎥 표시된 항목을 선택하세요.
      </div>
    );
  }
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: 18 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#4A148C", marginBottom: 12 }}>
        🎥 {it.label}
      </div>
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%",
        borderRadius: 10, overflow: "hidden", background: "#000" }}>
        <iframe
          src={`https://www.youtube.com/embed/${it.videoId}`}
          title={it.label}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      {it.desc && (
        <div style={{ marginTop: 14, fontSize: 13.5, color: "#4a4a5e", lineHeight: 1.7 }}>{it.desc}</div>
      )}
    </div>
  );
}

// [howto] WhyScreen 미구현 대체 — 정의 누락으로 인한 런타임 에러 차단.
function WhyScreen() {
  return (
    <div style={{ fontSize: 13.5, color: "#4a4a5e", lineHeight: 1.8, padding: "4px 6px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#4A148C", marginBottom: 10 }}>✨ 왜 다른가요?</div>
      AI-POST.AI는 광고 문구가 아니라 실제 검색 행동에 맞춘 글을 만듭니다.<br />
      지역·상황·목적을 조합해 검색 상단에서 오래 살아남는 구조를 지향합니다.
    </div>
  );
} // [v34] 우측 메인 대기 화면(공용) — 로고/홈/로그아웃후/비로그인
// ★ [PATCH v3.7] 새로고침 시 글쓰기·결과·탭 상태 유지 (운영 안정화)
import { usePersistentState, SK, storageGet, storageSet, storageRemove } from "../lib/storage";
// [51차] quota spine 연결 — supabase client (세션 조회용)
import { supabase, getFreshToken } from "../lib/supabase";
import { SUPPORT_KINDS, SUPPORT_CONTACT_NOTE, kindLabel as supKindLabel, kindColor as supKindColor, statusLabel as supStatusLabel, statusColor as supStatusColor } from "../lib/supportKinds";  // [세션96] 접수 게시판 통합
// [v7] 오버레이 폐기 — 기존 AI 대화창이 랜딩+체험+네비 담당. import 비활성.
// import ExperienceOverlay from "../components/ExperienceOverlay";
// [v32] 정책문서 외부 분리 — 본문은 /pages/policies/*.js 에 보관, index.js는 호출만.
import POLICY_TERMS   from "../lib/policies/terms";
import POLICY_PRIVACY from "../lib/policies/privacy";
import POLICY_REFUND  from "../lib/policies/refund";
import POLICY_AINOTICE from "../lib/policies/aiNotice";
import POLICY_SUPPORT from "../lib/policies/support";

// 업종별 카테고리 탭 (컴포넌트보다 먼저 선언)
// [v2 승격 2026-07-13] "피부" 제거 — clinic-v2 화이트리스트(CLINIC_V2_ALLOWED 15종)에 피부 시술 없음.
//   pico_laser / laser_toning 은 derma(피부과) 엔진 소관 → clinic에서 선택 시 400 반환되던 장애 차단.
//   clinic-data.js 무손상(17종 유지). CATS 노출만 15종 계열로 한정.
const CLINIC_CATS = ["전체", "눈성형", "코성형", "윤곽", "리프팅", "보톡스·필러", "지방·체형", "모발"];
const DENTAL_CATS  = ["전체", "보철", "심미", "교정", "보존", "예방", "구강외과", "턱관절", "소아"];
// [ent v2] 5계열 — ent-v2-data.ENT_V2_CATS SoT 정합 (검사/귀질환/코질환/목질환/어지럼)
const ENT_CATS     = ["전체", "검사", "귀질환", "코질환", "목질환", "어지럼"];
// [urology v2] 5계열 — urology-v2-data.UROLOGY_V2_CATS SoT 정합 (검사/전립선/방광·배뇨/요로·감염/남성건강)
const UROLOGY_CATS = ["전체", "검사", "전립선", "방광·배뇨", "요로·감염", "남성건강"];
const ORIENTAL_CATS = ["전체", "교통사고", "피부", "근골격", "다이어트", "여성", "통증", "내과", "신경"];
const ORTHO_CATS    = ["전체", "척추·디스크", "무릎·관절", "어깨", "발목·족부", "비수술치료", "수술·재활"];
const PEDIATRICS_CATS = ["전체", "검사", "호흡기", "알레르기·피부", "소화기", "감염·성장"];   // v2 5계열 (2026-07-13)
const GASTRO_CATS   = ["전체", "내시경", "식도", "위", "대장", "간", "담낭·담도", "췌장", "검진"];
const PULMO_CATS_UI = ["전체", ...PULMO_CATS];   // ← 호흡기내과 (pulmo-data SoT + 전체)
const CARD_CATS_UI  = ["전체", ...CARD_CATS];    // ← 순환기내과 (card-data SoT + 전체)
const ENDO_CATS_UI  = ["전체", ...ENDO_CATS];    // ← 내분비내과 (endo-data SoT + 전체)
const GENERAL_CATS  = ["전체", "만성질환", "내분비", "검진", "감염·면역", "컨디션 관리", "영양·대사", "혈액·영양", "생활습관", "신경·정신"];  // ← 내과 v1 (후기형)
const GENERAL_V2_CATS_UI = ["전체", ...GENERAL_V2_CATS];  // ← 내과 V2 (general-v2-data SoT · 증상/검진·검사/상담·관리/감염·예방)
// [obgyn v2] 5계열 — obgyn-v2-data.OBGYN_V2_CATS SoT 정합 (검사/자궁/난소·호르몬/월경/감염·갱년기)
const OBGYN_CATS    = ["전체", "검사", "자궁", "난소·호르몬", "월경", "감염·갱년기"];
const DERMA_CATS    = ["전체", ...DERMA_V2_CATS];   // ← 피부과 V2 (derma-v2-data SoT · 질환5계열 + 시술3계열)
const PAIN_CATS     = ["전체", "척추·디스크", "관절·인대", "재활·물리", "두통·신경", "족부·하지"];
const RADIO_CATS    = ["전체", "머리·어지럼", "허리·목·관절", "가슴·호흡", "배·소화기", "종합검진"];
const NEURO_CATS    = ["전체", "척추·디스크", "두통·신경통", "신경차단·통증", "말초신경·손저림", "어지럼·뇌신경"];
const PSY_CATS      = ["전체", "검사", "우울·불안", "강박·사회불안", "집중", "수면·소진"];   // [v2 2026-07-13] 5계열
// [eye v2] 5계열 — eye-v2-data.EYE_V2_CATS SoT 정합 (검사/백내장·노안/망막·녹내장/안구표면/소아안과)
const EYE_CATS      = ["전체", "검사", "백내장·노안", "망막·녹내장", "안구표면", "소아안과"];
const FAMILY_CATS   = ["전체", "검진", "예방접종", "만성질환", "감기·호흡기", "생활증상"];  // ← [V2 재설계 2026-07-14] 병원군 표준 5계열 · family-v2-data FAMILY_V2_CATS 와 SoT 일치
const LEGAL_CATS    = ["전체", "부동산", "법인", "상속", "회생·파산", "보전·집행", "가족관계"];  // ← 법무사 (v150 — legal-data 6개 cat과 일치)
const LAWYER_CATS_LOCAL = LAWYER_CATS;  // ← 변호사 (v29 — 형사·가사·상속·민사, lawyer-data 소유)
const DAYCARE_CATS_LOCAL = DAYCARE_CATS;  // ← 데이케어센터 (8메뉴, daycare-data 소유)
const KINDERGARTEN_CATS_LOCAL = KINDERGARTEN_CATS;  // ← 유치원 (반장 edu cats, kindergarten-data 소유)
const FISHING_CATS_LOCAL = FISHING_CATS;  // ← 고패킹 (글유형 3종: 방법형·분석형·비교형, fishing-catalog 소유)
const HOMECARE_CATS_LOCAL = HOMECARE_CATS;  // ← 방문요양 (7메뉴, homecare-data 소유)
const FUNERAL_CATS_LOCAL = FUNERAL_CATS;  // ← 상조 (5메뉴, funeral-data 소유)
const TAX_CATS_LOCAL = TAX_CATS;  // ← 세무사 (7메뉴, tax-data 소유)
const LABOR_CATS_LOCAL = LABOR_CATS;  // ← 노무사 (5메뉴, labor-data 소유)
const FLOWER_CATS_LOCAL = FLOWER_CATS;  // ← 꽃배달 (7메뉴, flower-data 소유)
const WELFARECARE_CATS_LOCAL = WELFARECARE_CATS;  // ← 복지용구 (8메뉴, welfarecare-data 소유)
const SENIORGOODS_CATS_LOCAL = SENIORGOODS_CATS;  // ← 노인용품 (17메뉴: 제품12+정보5, seniorgoods-data 소유)
const ADMIN_CATS_LOCAL = ADMIN_CATS;  // ← 행정사 (7메뉴, administrative-data 소유)
const REALESTATE_CATS_LOCAL = REALESTATE_CATS;  // ← 부동산 (7메뉴, realestate-data 소유)
const CLEANING_CATS_LOCAL = CLEANING_CATS;  // ← 입주청소 (8메뉴, cleaning-data 소유)
const MOVING_CATS_LOCAL = MOVING_CATS;  // ← 이사업체 (8메뉴, moving-data 소유)
const INTERIOR_CATS_LOCAL = INTERIOR_CATS;  // ← 인테리어 (8메뉴, interior-data 소유)
const GROUT_CATS_LOCAL = GROUT_CATS;  // ← 줄눈 (8메뉴, grout-data 소유)
const COATING_CATS_LOCAL = COATING_CATS;  // ← 탄성코트 (8메뉴, coating-data 소유)
const SYSTEMAIR_CATS_LOCAL = SYSTEMAIR_CATS;  // ← 시스템에어컨 (8메뉴, systemair-data 소유)
const AIRCLEAN_CATS_LOCAL = AIRCLEAN_CATS;  // ← 에어컨청소 (8메뉴, airclean-data 소유)
const SCREEN_CATS_LOCAL = SCREEN_CATS;  // ← 방충망 (8메뉴, screen-data 소유)
const PESTCONTROL_CATS_LOCAL = PESTCONTROL_CATS;  // ← 방역 (4cat/8메뉴, pestcontrol-data 소유)
const BUILDINGCLEAN_CATS_LOCAL = BUILDINGCLEAN_CATS;  // ← 건물청소 (6cat/8메뉴, buildingclean-data 소유)
const DOBAE_CATS_LOCAL = DOBAE_CATS;  // ← 도배 (9cat/9메뉴 평면, dobae-data 소유)
const FLOORING_CATS_LOCAL = FLOORING_CATS;  // ← 장판 (10cat/10메뉴 평면, flooring-data 소유)
const FILM_CATS_LOCAL = FILM_CATS;  // ← 인테리어필름 (10cat/10메뉴 평면, film-data 소유)
const DOOR_CATS_LOCAL = DOOR_CATS;  // ← 도어수리 (10cat/10메뉴 평면, door-data 소유)
const WATERPROOF_CATS_LOCAL = WATERPROOF_CATS;  // ← 방수공사 (9cat/9메뉴 평면, waterproof-data 소유)
const PAINT_CATS_LOCAL = PAINT_CATS;  // ← 페인트공사 (8cat/8메뉴 평면, paint-data 소유)
const TILE_CATS_LOCAL = TILE_CATS;  // ← 타일시공 (6cat/6메뉴 평면, tile-data 소유)
const WINDOW_CATS_LOCAL = WINDOW_CATS;  // ← 창호시공 (6cat/6메뉴 평면, window-data 소유)
const FURNITURE_CATS_LOCAL = FURNITURE_CATS;  // ← 맞춤가구 (8cat/8메뉴 평면, furniture-data 소유)
const LIGHTING_CATS_LOCAL = LIGHTING_CATS;  // ← 조명 (6cat/6메뉴 평면, lighting-data 소유)
const DEMOLITION_CATS_LOCAL = DEMOLITION_CATS;  // ← 철거공사 (3cat/3메뉴 평면, demolition-data 소유)
const BIRDCONTROL_CATS_LOCAL = BIRDCONTROL_CATS;  // ← 비둘기퇴치 (5cat/8메뉴, birdcontrol-data 소유)
const TANKCLEAN_CATS_LOCAL = TANKCLEAN_CATS;  // ← 저수조청소 (8cat/8메뉴, tankclean-data 소유)
const LEAKDETECT_CATS_LOCAL = LEAKDETECT_CATS;  // ← 누수탐지 (8cat/8메뉴, leakdetect-data 소유)
const SEWER_CATS_LOCAL = SEWER_CATS;  // ← 하수구막힘 (10cat/10메뉴, sewer-data 소유)
const PLUMBING_CATS_LOCAL = PLUMBING_CATS;  // ← 수도설비 (8cat/8메뉴, plumbing-data 소유)
const BOILER_CATS_LOCAL = BOILER_CATS;  // ← 보일러설치 (12cat/12메뉴, boiler-data 소유)
const HOMEFIX_CATS_LOCAL = HOMEFIX_CATS;  // ← 집수리 (8cat/8메뉴, homefix-data 소유)
const ELECTRICREPAIR_CATS_LOCAL = ELECTRICREPAIR_CATS;  // ← 전기수리 (8cat/8메뉴, electricrepair-data 소유)
const SINKREPAIR_CATS_LOCAL = SINKREPAIR_CATS;  // ← 싱크대수리 (8cat/8메뉴, sinkrepair-data 소유)
const BATHROOM_CATS_LOCAL = BATHROOM_CATS;  // ← 욕실리모델링 (12cat/12메뉴, bathroom-data 소유)
const SHAMAN_CATS_LOCAL = SHAMAN_CATS;  // ← 무속 상담 (7cat/41메뉴 — 분야6 + "전문분야 소개"1, shaman-data 소유)

// ============================================================
// 업종 설정 — URL 쿼리 ?industry=dental 로 결정
// 로그인 기능 추가 시 user.industry 로 덮어쓰기
// ============================================================
// CURRENT_INDUSTRY는 컴포넌트 내부에서 useRouter로 읽음 (아래 Home 참고)
// 빌드 타임 기본값 (SSR fallback)
// [v122] env(NEXT_PUBLIC_INDUSTRY) 의존 제거. SSR/미정 폴백 전용 상수 = "clinic".
//   실제 업종은 hubStore.industry(SoT). env=dental 잔재가 발행비율·제목·라벨을 오염시키던 문제 차단.
//   .env.local의 NEXT_PUBLIC_INDUSTRY는 무의미해짐(주석/제거 무방). NEXT_PUBLIC_MY_INDUSTRY=cafe와 무관.
const DEFAULT_INDUSTRY = "clinic";

// ============================================================
// IS_ADMIN — 관리자(운영자) 모드 토글 (Phase 10)
//   - 일반 사용자: industry = store identity (고정, 변경 불가)
//   - ADMIN: industry mutation 허용 (개발/테스트용)
//   - .env.local: NEXT_PUBLIC_ADMIN=true
// ============================================================
const IS_ADMIN = process.env.NEXT_PUBLIC_ADMIN === "true";

// 업종별 시술 목록
// [v122] 업종 용어 분기 — 의료군 vs 비의료군(cafe·restaurant).
//   "진료시간/진료과/시술" 같은 병원 용어가 음식점·카페 화면에 그대로 뜨던 문제 차단.
//   비의료 = 명시 집합. 그 외 전부 의료(병원군)로 간주(신규 병원 업종 자동 의료 처리).
const NONMEDICAL_INDUSTRIES = new Set(["cafe", "restaurant", "chinese", "korean", "snack", "japanese", "western", "chicken", "legal", "bedding"]);
function isMedical(industry) {
  return !NONMEDICAL_INDUSTRIES.has(industry);
}
// 라벨 용어집 — 업종별 맵. UI 라벨/placeholder/hint 공통화의 단일 출처.
//   [v144] 이분법(med?:) → 업종별 LABELS 맵으로 확장. legal/bedding 미리 포함.
//   기존 키(hoursLabel/hoursPh/hoursHint/industryWord/itemWord) 전부 유지 + bizWord 추가.
//   LABELS에 없는 업종 = 의료 기본값(진료시간/시술/진료과/병원). 신규 병원 업종 자동 처리.
const MED_LABELS = {
  hoursLabel: "진료시간",
  hoursPh:    "예: 평일 09:30-18:30 / 토 09:00-13:00",
  hoursHint:  "변동 시 수정 — 후기·방문 안내 문맥에 활용",
  industryWord: "진료과",
  itemWord:     "시술",
  bizWord:      "병원",
};
const LABELS = {
  legal:      { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 토 휴무",  hoursHint: "변동 시 수정 — 방문 안내 문맥에 활용", industryWord: "분야", itemWord: "업무", bizWord: "사무소" },
  restaurant: { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 후기·방문 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "매장" },
  kindergarten: { hoursLabel: "행사문의", hoursPh: "예: 평일 09:00-18:00 / 행사 상담 가능", hoursHint: "변동 시 수정 — 유치원 행사 안내 문맥에 활용", industryWord: "분야", itemWord: "프로그램", bizWord: "기관" },
  fishing: { hoursLabel: "조황문의", hoursPh: "예: 연중무휴 / 방류 09:00·15:00", hoursHint: "변동 시 수정 — 바다낚시터 운영 안내 문맥에 활용", industryWord: "분야", itemWord: "글유형", bizWord: "낚시터" },
  chinese:    { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "중식당" },
  korean:     { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "한식당" },
  snack:      { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "분식집" },
  japanese:   { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "일식당" },
  chicken:    { hoursLabel: "영업시간", hoursPh: "예: 평일 15:00-24:00 / 연중무휴",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "치킨집" },
  western:    { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-21:00 / 일 휴무",  hoursHint: "변동 시 수정 — 메뉴 정보 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "양식당" },
  cafe:       { hoursLabel: "영업시간", hoursPh: "예: 평일 11:00-22:00 / 연중무휴", hoursHint: "변동 시 수정 — 후기·방문 안내 문맥에 활용", industryWord: "업종", itemWord: "메뉴", bizWord: "매장" },
  bedding:    { hoursLabel: "영업시간", hoursPh: "예: 평일 10:00-20:00 / 일 휴무",  hoursHint: "변동 시 수정 — 후기·방문 안내 문맥에 활용", industryWord: "분야", itemWord: "상품", bizWord: "매장" },
  funeral:    { hoursLabel: "상담시간", hoursPh: "예: 24시간 상담 가능",  hoursHint: "변동 시 수정 — 장례 상담 안내 문맥에 활용", industryWord: "분야", itemWord: "서비스", bizWord: "상조" },
  tax:        { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 신고시즌 연장", hoursHint: "변동 시 수정 — 세무 상담 안내 문맥에 활용", industryWord: "분야", itemWord: "안내", bizWord: "세무사" },
  labor:      { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00", hoursHint: "변동 시 수정 — 노무 상담 안내 문맥에 활용", industryWord: "분야", itemWord: "안내", bizWord: "노무사" },
  flower:     { hoursLabel: "영업시간", hoursPh: "예: 매일 08:00-21:00 / 연중무휴", hoursHint: "변동 시 수정 — 꽃배달 주문 안내 문맥에 활용", industryWord: "분야", itemWord: "안내", bizWord: "꽃집" },
  // [v-lex-silver 2026-07-22] 실버케어 4종 itemWord="서비스". daycare/homecare 미등록 → MED_LABELS("시술") 폴백되던 문제 교정.
  daycare:    { hoursLabel: "운영시간", hoursPh: "예: 평일 08:00-19:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 주간보호 상담·방문 안내 문맥에 활용", industryWord: "분야", itemWord: "서비스", bizWord: "센터" },
  homecare:   { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 방문요양 상담 안내 문맥에 활용", industryWord: "분야", itemWord: "서비스", bizWord: "센터" },
  welfarecare: { hoursLabel: "운영시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 복지용구 상담·방문 안내 문맥에 활용", industryWord: "분야", itemWord: "서비스", bizWord: "사업소" },
  seniorgoods: { hoursLabel: "운영시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 노인용품 상담·방문 안내 문맥에 활용", industryWord: "분야", itemWord: "서비스", bizWord: "전문점" },
  administrative: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 행정사 상담 안내 문맥에 활용", industryWord: "업무", itemWord: "안내", bizWord: "사무소" },
  realestate: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-13:00", hoursHint: "변동 시 수정 — 부동산 상담 안내 문맥에 활용", industryWord: "분석", itemWord: "안내", bizWord: "중개사무소" },
  cleaning: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 토 09:00-15:00", hoursHint: "변동 시 수정 — 입주청소 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "청소업체" },
  moving: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-20:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 이사 견적 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "이사업체" },
  interior: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 인테리어 견적 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "인테리어 업체" },
  grout: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 줄눈 시공 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "줄눈 시공 업체" },
  coating: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 탄성코트 시공 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "탄성코트 업체" },
  systemair: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 시스템에어컨 설치 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "시스템에어컨 업체" },
  airclean: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 에어컨청소 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "에어컨청소 업체" },
  screen: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 방충망 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "방충망 업체" },
  pestcontrol: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 방역 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "방역 업체" },
  buildingclean: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 건물청소 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "건물청소 업체" },
  dobae: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 시공 가능", hoursHint: "변동 시 수정 — 도배 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "도배 업체" },
  flooring: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 야간·휴무일 시공 가능", hoursHint: "변동 시 수정 — 장판 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "장판 시공 업체" },
  door: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 방문 협의", hoursHint: "변동 시 수정 — 도어 수리 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "도어 수리 업체" },
  waterproof: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 현장 확인 협의", hoursHint: "변동 시 수정 — 방수공사 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "방수 시공 업체" },
  paint: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 현장 확인 협의", hoursHint: "변동 시 수정 — 페인트공사 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "페인트 시공 업체" },
  tile: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 현장 확인 협의", hoursHint: "변동 시 수정 — 타일시공 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "타일 시공 업체" },
  window: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 현장 실측 협의", hoursHint: "변동 시 수정 — 창호시공 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "창호 시공 업체" },
  furniture: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 현장 계측 협의", hoursHint: "변동 시 수정 — 맞춤가구 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "맞춤가구 제작 업체" },
  lighting: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 현장 실측 협의", hoursHint: "변동 시 수정 — 조명시공 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "조명 시공 업체" },
  demolition: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 주말 현장 확인 협의", hoursHint: "변동 시 수정 — 철거공사 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "철거 공사 업체" },
  film: { hoursLabel: "상담시간", hoursPh: "예: 평일 08:00-18:00 / 야간·휴무일 시공 가능", hoursHint: "변동 시 수정 — 인테리어필름 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "인테리어필름 시공 업체" },
  birdcontrol: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 비둘기퇴치 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "비둘기퇴치 업체" },
  tankclean: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 저수조청소 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "저수조청소 업체" },
  leakdetect: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말·야간 상담 가능", hoursHint: "변동 시 수정 — 누수탐지 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "누수탐지 업체" },
  sewer: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말·야간 상담 가능", hoursHint: "변동 시 수정 — 하수구막힘 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "하수구막힘 업체" },
  plumbing: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말·야간 상담 가능", hoursHint: "변동 시 수정 — 수도설비 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "수도설비 업체" },
  boiler: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말·야간 상담 가능", hoursHint: "변동 시 수정 — 보일러설치 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "보일러설치 업체" },
  homefix: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 집수리 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "집수리 업체" },
  electricrepair: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 전기수리 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "전기수리 업체" },
  sinkrepair: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 싱크대수리 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "싱크대수리 업체" },
  bathroom: { hoursLabel: "상담시간", hoursPh: "예: 평일 09:00-18:00 / 주말 상담 가능", hoursHint: "변동 시 수정 — 욕실리모델링 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "욕실리모델링 업체" },
  shaman: { hoursLabel: "상담시간", hoursPh: "예: 평일 10:00-19:00 / 예약제", hoursHint: "변동 시 수정 — 상담 안내 문맥에 활용", industryWord: "안내", itemWord: "분야", bizWord: "상담소" },
};
function lex(industry) {
  return LABELS[industry] || MED_LABELS;
}

const INDUSTRY_TREATMENTS = {
  clinic:   CLINIC_TREATMENTS,
  dental:   DENTAL_TREATMENTS,
  ent:      ENT_TREATMENTS,
  urology:  UROLOGY_TREATMENTS,
  oriental: ORIENTAL_TREATMENTS,
  ortho:    ORTHO_TREATMENTS,
  pediatrics: PEDIATRICS_TREATMENTS,  // ← 소아청소년과
  gastro:     GASTRO_TREATMENTS,       // ← 소화기내과
  pulmo:      PULMO_TREATMENTS,        // ← 호흡기내과 (V2 Purpose 단독 · v1 없음)
  card:       CARD_TREATMENTS,         // ← 순환기내과 (V2 Purpose 단독 · v1 없음)
  endo:       ENDO_TREATMENTS,         // ← 내분비내과 (V2 Purpose 단독 · v1 없음)
  general:    GENERAL_V2_TREATMENTS,   // ← 내과 (V2 1차 진료 허브 · 16메뉴). v1=GENERAL_TREATMENTS는 FREEZE 보존(엔진 파일 잔존)
  obgyn:      OBGYN_TREATMENTS,        // ← 산부인과
  derma:      DERMA_TREATMENTS,        // ← 피부과 (V2 Purpose · 27메뉴 = 질환18 + 시술9). v1=derma-data는 FREEZE 보존(엔진 파일 잔존)
  pain:       PAIN_TREATMENTS,         // ← 통증의학과
  radio:      RADIO_TREATMENTS,        // ← 영상의학과 (검사형·관측 전)
  neuro:      NEURO_TREATMENTS,        // ← 신경외과
  psy:        PSY_TREATMENTS,          // ← 정신건강의학과
  eye:        EYE_TREATMENTS,          // ← 안과
  family:     FAMILY_TREATMENTS,       // ← 가정의학과
  cafe:       CAFE_TREATMENTS,         // ← 카페·디저트 (Phase 9)
  restaurant: RESTAURANT_TREATMENTS,    // ← 맛집·식당 (Phase 9.5 — 조합형 검색의도 SEO)
  kindergarten: KINDERGARTEN_TREATMENTS, // ← 유치원 (반장 edu 18 이식·정보형·기관화자 / 관측 전)
  fishing:    FISHING_TREATMENTS,        // ← 고패킹·바다낚시 (반장 fishing 이식·정보형·낚시화자·단일호출형 / 글유형 3종 / 관측 전)
  chinese:    CHINESE_TREATMENTS,        // ← 중식·중화요리 (신규, Restaurant계열 독립엔진 / 관측 전)
  korean:     KOREAN_TREATMENTS,         // ← 한식 (신규, Chinese계열 독립엔진 / 관측 전)
  snack:      SNACK_TREATMENTS,          // ← 분식 (신규, Korean(Restaurant)계열 독립엔진·class 4축·13메뉴 / 관측 전)
  japanese:   JAPANESE_TREATMENTS,       // ← 일식 (신규, Chinese계열 독립엔진·cat 4계열·13메뉴 / 관측 전)
  chicken:    CHICKEN_TREATMENTS,        // ← 치킨 (신규, Japanese계열 독립엔진·cat 4계열·12메뉴 / 관측 전)
  western:    WESTERN_TREATMENTS,        // ← 양식 (신규, Chinese계열 독립엔진·cat 4계열·8메뉴 / 관측 전)
  meat:       MEAT_TREATMENTS,           // ← 고깃집 (신규, Restaurant v2계열 독립엔진·cat 단일·8메뉴·SCENE 불판/굽기/쌈 / 관측 전)
  legal:      LEGAL_TREATMENTS,         // ← 법무사 (v142 — 비의료·정보형)
  bedding:    BEDDING_TREATMENTS,       // ← 이브자리 침구 (v10 — 비의료·정보형·매장화자)
  lawyer:     LAWYER_TREATMENTS,        // ← 변호사 (v29 — 4대분류·정보형·사무소화자)
  daycare:    DAYCARE_TREATMENTS,       // ← 데이케어센터 (정보형·기관화자)
  homecare:   HOMECARE_TREATMENTS,      // ← 방문요양 (정보형·기관화자)
  funeral:    FUNERAL_TREATMENTS,       // ← 상조 (정보형·장례지도사화자)
  tax:        TAX_TREATMENTS,           // ← 세무사 (정보형·세무사화자)
  labor:      LABOR_TREATMENTS,         // ← 노무사 (정보형·공인노무사화자)
  flower:     FLOWER_TREATMENTS,        // ← 꽃배달 (정보형·플로리스트화자)
  welfarecare: WELFARECARE_TREATMENTS,  // ← 복지용구 (정보형·사업소화자)
  seniorgoods: SENIORGOODS_TREATMENTS,  // ← 노인용품 (정보형·노인용품전문점화자)
  administrative: ADMIN_TREATMENTS,     // ← 행정사 (정보형·행정사화자)
  realestate: REALESTATE_TREATMENTS,    // ← 부동산 (분석리포트형·공인중개사화자)
  cleaning: CLEANING_TREATMENTS,        // ← 입주청소 (정보형·청소업체화자)
  moving: MOVING_TREATMENTS,            // ← 이사업체 (정보형·이사업체화자)
  interior: INTERIOR_TREATMENTS,        // ← 인테리어 (정보형·인테리어업체화자)
  grout: GROUT_TREATMENTS,              // ← 줄눈 (정보형·줄눈시공업체화자)
  coating: COATING_TREATMENTS,          // ← 탄성코트 (정보형·탄성코트업체화자)
  systemair: SYSTEMAIR_TREATMENTS,      // ← 시스템에어컨 (정보형·시스템에어컨업체화자)
  airclean: AIRCLEAN_TREATMENTS,        // ← 에어컨청소 (정보형·에어컨청소업체화자)
  screen: SCREEN_TREATMENTS,            // ← 방충망 (정보형·방충망업체화자, useApt=true)
  pestcontrol: PESTCONTROL_TREATMENTS,  // ← 방역 (정보형·방역업체화자, 출장업종)
  buildingclean: BUILDINGCLEAN_TREATMENTS,  // ← 건물청소 (정보형·건물청소업체화자, 출장업종)
  dobae: DOBAE_TREATMENTS,  // ← 도배 (정보형·도배업체화자, 출장업종·siteBlock 사용)
  flooring: FLOORING_TREATMENTS,  // ← 장판 (정보형·장판시공업체화자, 출장업종·siteBlock + 두께 축)
  film: FILM_TREATMENTS,  // ← 인테리어필름 (정보형·필름시공업체화자, 출장업종·siteBlock + 하지 축)
  door: DOOR_TREATMENTS,  // ← 도어수리 (정보형·도어수리업체화자, 출장수리·siteBlock 미사용 + 부품군 축)
  waterproof: WATERPROOF_TREATMENTS,  // ← 방수공사 (정보형·방수시공업체화자, 출장시공·siteBlock 미사용 + 원인군 축)
  paint: PAINT_TREATMENTS,  // ← 페인트공사 (정보형·페인트시공업체화자, 출장시공·siteBlock 미사용 + 원인군 축)
  tile: TILE_TREATMENTS,  // ← 타일시공 (정보형·타일시공업체화자, 출장시공·siteBlock 미사용 + 철거·덧방 판단 축)
  window: WINDOW_TREATMENTS,  // ← 창호시공 (정보형·창호시공업체화자, 출장시공·siteBlock 미사용 + 전체교체·부분보수 판단 축)
  furniture: FURNITURE_TREATMENTS,  // ← 맞춤가구 (정보형·맞춤가구제작업체화자, 출장제작설치·siteBlock 미사용 + 자리 제약 판단 축)
  lighting: LIGHTING_TREATMENTS,  // ← 조명 (정보형·조명시공업체화자, 출장시공·siteBlock 미사용 + 배치 여건 판단 축)
  demolition: DEMOLITION_TREATMENTS,  // ← 철거공사 (정보형·철거공사업체화자, 출장해체·siteBlock 미사용 + 살릴면·뜯을면 판단 축)
  birdcontrol: BIRDCONTROL_TREATMENTS,  // ← 비둘기퇴치 (정보형·비둘기퇴치업체화자, 출장업종)
  tankclean: TANKCLEAN_TREATMENTS,  // ← 저수조청소 (정보형·저수조청소업체화자, 출장업종·useApt)
  leakdetect: LEAKDETECT_TREATMENTS,  // ← 누수탐지 (정보형·누수탐지업체화자, 출장업종·useApt)
  sewer: SEWER_TREATMENTS,  // ← 하수구막힘 (정보형·하수구막힘업체화자, 출장업종·APT미사용)
  plumbing: PLUMBING_TREATMENTS,  // ← 수도설비 (정보형·수도설비업체화자, 출장업종·APT미사용)
  boiler: BOILER_TREATMENTS,  // ← 보일러설치 (정보형·보일러설치업체화자, 출장업종·APT미사용)
  homefix: HOMEFIX_TREATMENTS,  // ← 집수리 (정보형·집수리업체화자, 출장업종·APT미사용)
  electricrepair: ELECTRICREPAIR_TREATMENTS,  // ← 전기수리 (정보형·전기수리업체화자, 출장업종·APT미사용)
  sinkrepair: SINKREPAIR_TREATMENTS,  // ← 싱크대수리 (정보형·싱크대수리업체화자, 출장업종·APT미사용)
  bathroom: BATHROOM_TREATMENTS,  // ← 욕실리모델링 (정보형·욕실리모델링업체화자, 출장업종·APT미사용)
  shaman: SHAMAN_TREATMENTS,  // ← 무속 상담 (공감형·상담소화자, 상황35 + 분야소개6 = 41 / cat=분야 라벨)
};

// 업종별 인사말 + 예시문장
const INDUSTRY_CONFIG = {
  clinic: {
    label: "성형외과",
    greeting: "안녕하세요! 성형외과 블로그 생성기입니다.",
    // [v2 승격 2026-07-13] 후기형 → Purpose 정보형 예시. 1인칭·후기·경과일지 표현 제거.
    examples: [
      "강남 자연유착 쌍꺼풀 정보｜라인 형성 방식과 판단 기준",
      "실리프팅과 울쎄라, 무엇을 기준으로 나뉘는지",
      "코성형 시술 전 확인사항 안내",
      "안면윤곽 판단 요소 안내｜골격·비대칭 확인 항목",
      "보톡스·필러 진료 흐름과 상담 시 확인 사항",
    ],
    badge: "clinic v2.0",
  },
  dental: {
    label: "치과",
    greeting: "안녕하세요! 치과 블로그 생성기입니다.",
    examples: [
      "강남 임플란트 후기 써줘",
      "분당 투명교정 vs 일반교정 비교하다 결정한 이유",
      "수원 사랑니 발치 무서웠는데 받아봤어요",
      "강남 스케일링 연 1회 보험 적용 후기",
      "신경치료 두려워서 미루다가 결국 받은 이야기",
    ],
    badge: "dental v1.0",
  },
  // [ent v2 승격 2026-07-13] 후기형(v1) → 정보형 Purpose(v2). examples 전면 교체.
  ent: {
    label: "이비인후과",
    greeting: "안녕하세요! 이비인후과 블로그 생성기입니다.",
    examples: [
      "강남 청력검사 어떤 경우에 검토되는지 안내",
      "분당 알레르기비염 검사·치료 결정 기준",
      "수원 축농증 확인 항목과 판단 기준 안내",
      "강남 코골이·수면무호흡 검사 안내",
      "어지럼증 원인 확인 흐름 정보",
    ],
    badge: "ent v2-new",
  },
  oriental: {
    label: "한의원",
    greeting: "안녕하세요! 한의원 블로그 생성기입니다.",
    examples: [
      "강남 교통사고 한방치료 자동차보험으로 받은 후기",
      "분당 아토피 한방치료 스테로이드 없이 해결한 이야기",
      "수원 갱년기한약 증상 완화 처방받고 달라진 것",
      "강남 공진단 면역력 증진을 위한 선택",
      "부천 담적 증상 소화불량 한의원에서 해결한 이야기",
    ],
    badge: "oriental v1.2",
  },
  ortho: {
    label: "정형외과",
    greeting: "안녕하세요! 정형외과 블로그 생성기입니다.",
    examples: [
      "강남 허리디스크 수술 안 하고 나은 이야기",
      "분당 무릎관절염 연골주사 맞고 나서 솔직 후기",
      "수원 도수치료 효과 언제부터 느꼈나요",
      "강남 족저근막염 체외충격파 치료 후기",
      "분당 어깨 회전근개 파열 정형외과 치료 기록",
    ],
    badge: "ortho v1.0",
  },
  urology: {
    label: "비뇨기과",
    greeting: "안녕하세요! 비뇨기과 블로그 생성기입니다.",
    examples: [
      "강남 PSA검사 정보｜어떤 경우에 검토되는지 안내",
      "분당 요류검사 정보｜배뇨 흐름 확인 안내",
      "수원 전립선비대증 정보｜검사·치료 결정 기준 안내",
      "강남 과민성방광 정보｜검사·치료 결정 기준 안내",
      "일산 요로결석 정보｜검사·치료 결정 기준 안내",
    ],
    badge: "urology v2.0",
  },
  pediatrics: {
    label: "소아청소년과",
    greeting: "안녕하세요! 소아청소년과 블로그 생성기입니다.",
    examples: [
      "강남 소아과 소아알레르기검사 정보 써줘",
      "분당 소아천식 검사·치료 결정 기준 안내",
      "수원 소아과 아토피피부염 확인 흐름 정리",
      "강남 소아성장검사 어떤 경우에 검토되는지 안내",
      "소아장염 진료에서 확인하는 항목",
    ],
    badge: "pediatrics v2.0",
  },
  gastro: {
    label: "소화기내과",
    greeting: "안녕하세요! 소화기내과 블로그 생성기입니다.",
    examples: [
      "강남 위내시경 어떤 경우에 검토되는지 안내",
      "분당 대장내시경 확인하는 항목 정리",
      "수원 역류성식도염 진료 흐름 정리",
      "헬리코박터 제균치료 판단 기준 안내",
      "지방간 진료에서 확인하는 항목",
    ],
    badge: "gastro v2.0",
  },
  pulmo: {
    label: "호흡기내과",
    greeting: "안녕하세요! 호흡기내과 블로그 생성기입니다.",
    examples: [
      "강남 만성기침 검사 기준 안내",
      "분당 천식 진료에서 확인하는 항목",
      "수원 폐결절 추적 간격 안내",
      "강남 COPD 폐기능검사 안내",
      "안산 폐렴 검사·치료 결정 기준",
    ],
    badge: "pulmo v2.0",
  },
  card: {
    label: "순환기내과",
    greeting: "안녕하세요! 순환기내과 블로그 생성기입니다.",
    examples: [
      "강남 두근거림 심전도검사 안내",
      "분당 심장초음파 검사 기준 안내",
      "수원 24시간 홀터검사 결정 기준",
      "강남 고혈압 검사·관리 결정 기준",
      "안산 협심증 검사·치료 결정 기준",
    ],
    badge: "card v2.0",
  },
  endo: {
    label: "내분비내과",
    greeting: "안녕하세요! 내분비내과 블로그 생성기입니다.",
    examples: [
      "강남 갑상선초음파 검사 기준 안내",
      "분당 당화혈색소검사 결정 기준",
      "수원 골밀도검사 검토 기준 안내",
      "강남 당뇨병 검사·관리 결정 기준",
      "안산 갑상선결절 경과 확인 안내",
    ],
    badge: "endo v2.0",
  },
  general: {
    label: "내과",
    greeting: "안녕하세요! 내과 블로그 생성기입니다.",
    examples: [
      "강남 내과 고혈압 관리 안내",
      "당뇨 HbA1c 관리 방법 정보",
      "건강검진 이상 소견 결과상담 안내",
      "대상포진 조기 진단·치료 정보",
      "만성피로 원인 검사 안내",
    ],
    badge: "general v2.0",
  },
  obgyn: {
    label: "산부인과",
    greeting: "안녕하세요! 산부인과 블로그 생성기입니다.",
    examples: [
      "강남 산부인과 부인과초음파 정보 써줘",
      "분당 자궁근종 검사·치료 결정 기준 안내",
      "수원 산부인과 생리불순 확인 흐름 정리",
      "강남 HPV검사 어떤 경우에 검토되는지 안내",
      "자궁내막증 진료에서 확인하는 항목",
    ],
    badge: "obgyn v2.0",
  },
  derma: {
    label: "피부과",
    greeting: "안녕하세요! 피부과 블로그 생성기입니다.",
    examples: [
      "강남 여드름 정보 — 치료 방향은 어떤 기준으로 정해지나",
      "분당 기미 정보 — 잡티와 어떻게 구분하나",
      "수원 울쎄라 정보 — 어떤 경우에 검토되는지",
      "강남 탈모 정보 — 진행 양상에 따른 접근",
      "아토피 피부염 — 급성기와 유지 관리 구분",
    ],
    badge: "derma v2.0",
  },
  pain: {
    label: "통증의학과",
    greeting: "안녕하세요! 통증의학과 블로그 생성기입니다.",
    examples: [
      "강남 허리디스크 통증 치료 결정 기준 안내",
      "분당 무릎 통증 진료에서 확인하는 과정",
      "수원 족저근막염 치료 판단 기준 정리",
      "강남 오십견 어깨 통증 진료 안내",
      "만성요통 보존치료와 시술 판단 기준",
    ],
    badge: "pain v2.0",
  },
  radio: {
    label: "영상의학과",
    greeting: "안녕하세요! 영상의학과 검사 안내 블로그 생성기입니다.",
    examples: [
      "분당 뇌 MRI 두통 어지럼 검사 안내 써줘",
      "강남 척추 MRI 허리디스크 검사 정보",
      "수원 복부 초음파 간 수치 확인 안내",
      "폐 CT 저선량 검진 대상 정리",
      "갑상선 초음파 목 결절 검사 안내",
    ],
    badge: "radio v1.0",
  },
  neuro: {
    label: "신경외과",
    greeting: "안녕하세요! 신경외과 블로그 생성기입니다.",
    examples: [
      "강남 허리디스크 검사·치료 결정 기준 안내",
      "분당 척추관협착증 MRI 확인 과정 정리",
      "수원 만성두통 신경외과 진료 안내",
      "강남 수근관증후군 신경전도검사 안내",
      "목디스크 손저림 진료 판단 기준",
    ],
    badge: "neuro v2.0",
  },
  psy: {
    label: "정신건강의학과",
    greeting: "안녕하세요! 정신건강의학과 블로그 생성기입니다.",
    examples: [
      "강남 종합심리검사 정보 써줘",
      "분당 공황장애 검사·치료 결정 기준",
      "수원 성인ADHD 진료 안내",
      "강남 불면증 확인 항목 정리",
      "일산 스트레스반응검사 어떤 경우 검토되나요",
    ],
    badge: "psy v2.0",
  },
  eye: {
    label: "안과",
    greeting: "안녕하세요! 안과 블로그 생성기입니다.",
    examples: [
      "강남 안압검사 정보｜어떤 경우에 검토되는지 안내",
      "분당 안저검사 정보｜무엇을 확인하는 검사인가",
      "수원 백내장 정보｜검사·치료 결정 기준 안내",
      "강남 녹내장 정보｜검사·치료 결정 기준 안내",
      "일산 안구건조증 정보｜검사·치료 결정 기준 안내",
    ],
    badge: "eye v2.0",
  },
  family: {
    label: "가정의학과",
    greeting: "안녕하세요! 가정의학과 블로그 생성기입니다.",
    examples: [
      "강남 건강검진 정보｜어떤 경우에 검토되는지 안내",
      "분당 고혈압 정보｜검사·치료 결정 기준 안내",
      "수원 만성질환 정기검사 정보｜수치 확인이 필요할 때",
      "강남 만성피로 정보｜검사·치료 결정 기준 안내",
      "분당 오래가는 기침 정보｜검사·치료 결정 기준 안내",
    ],
    badge: "family v2.0",
  },
  cafe: {
    label: "카페·디저트",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. (카드 클릭이 아닌 검색 행동 조합 방식입니다)",
    examples: [
      "작업하기 좋은 홍대 아메리카노 카페",
      "데이트하기 좋은 홍대 케이크 카페",
      "혼자 가기 좋은 홍대 콜드브루 카페",
      "모임하기 좋은 홍대 빙수 카페",
      "데이트하기 좋은 홍대 브런치 카페",
    ],
    badge: "cafe v2.0",
  },
  restaurant: {
    label: "맛집·식당",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. (카드 클릭이 아닌 검색 행동 조합 방식입니다)",
    examples: [
      "구리 순대국 해장 혼밥",
      "공릉동 떡볶이 포장 친구",
      "공릉동 로제떡볶이 간식",
    ],
    badge: "restaurant v1.0 (Phase 9.5)",
  },
  kindergarten: {
    label: "유치원·어린이집",
    greeting: "유치원·어린이집 방문 체험행사 프로그램을 선택하세요. 현장 장면 중심 후기형으로 안내합니다.",
    examples: [
      "노원구 유치원 병원놀이 현장",
      "강남 어린이집 시장놀이 운영 후기",
      "분당 유치원 전통놀이 체험 기록",
    ],
    badge: "kindergarten v1.0 (관측 전)",
  },
  fishing: {
    label: "고패킹·바다낚시",
    greeting: "아래에서 글 유형을 선택하고 낚시 상황(어종·장소·수심·상황)을 입력하세요. 어종별 입질패턴·고패질 타이밍 중심 정보형으로 안내합니다.",
    examples: [
      "우럭 영종도 바다낚시터 고패질 타이밍",
      "참돔 방류 직후 입질 없는 이유",
      "자동 고패킹 vs 수동 고패질 조과 차이",
    ],
    badge: "fishing v1.0 (관측 전)",
  },
  chinese: {
    label: "중식·중화요리",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 중식 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 짜장면 점심 혼밥",
      "구리 짬뽕 가족 외식",
      "구리 탕수육 포장",
    ],
    badge: "chinese v1.0 (관측 전)",
  },
  korean: {
    label: "한식",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 한식 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 순대국 점심 혼밥",
      "구리 김치찌개 가족 외식",
      "구리 수육 포장",
    ],
    badge: "korean v1.0 (관측 전)",
  },
  snack: {
    label: "분식",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 분식 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 떡볶이 간식 혼밥",
      "구리 김밥 간단한 한 끼",
      "구리 순대 나눠 먹기",
    ],
    badge: "snack v1.0 (관측 전)",
  },
  japanese: {
    label: "일식",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 일식 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 초밥 점심 혼밥",
      "구리 라멘 간단한 한 끼",
      "구리 돈카츠 가족 외식",
    ],
    badge: "japanese v1.0 (관측 전)",
  },
  chicken: {
    label: "치킨",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 치킨 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 후라이드치킨 야식 혼밥",
      "구리 양념치킨 가족 외식",
      "구리 순살치킨 포장 간단히",
    ],
    badge: "chicken v1.0 (관측 전)",
  },
  western: {
    label: "양식",
    greeting: "아래에서 지역·메뉴·상황·목적을 선택하세요. 양식 메뉴를 정보형으로 안내합니다.",
    examples: [
      "구리 파스타 점심 혼밥",
      "구리 스테이크 가족 외식",
      "구리 피자 친구",
    ],
    badge: "western v1.0 (관측 전)",
  },
  legal: {
    label: "법무사",
    greeting: "안녕하세요! 법무사사무소 블로그 생성기입니다. 등기·상속·법인·회생 업무를 정보형으로 안내합니다.",
    examples: [
      "노원구 상속등기 절차와 준비서류",
      "강남 법인설립 등기 진행 순서",
      "상속포기 기한 확인사항 정리",
      "개인회생 신청 전 절차 안내",
    ],
    badge: "legal v1.0 (정보형·기관화자)",
  },
  lawyer: {
    label: "변호사",
    greeting: "안녕하세요! 변호사사무소 블로그 생성기입니다. 형사·가사·상속·민사 사건을 정보형으로 안내합니다.",
    examples: [
      "수원 음주운전 초기 대응방법",
      "분당 이혼 절차와 준비사항",
      "성남 상속분쟁 변호사 선임기준",
      "용인 손해배상 청구 절차 안내",
    ],
    badge: "lawyer v1.0 (정보형·사무소화자)",
  },
  daycare: {
    label: "데이케어센터",
    greeting: "안녕하세요! 데이케어센터(주간보호센터) 블로그 생성기입니다. 이용대상·등급·비용·송영을 정보형으로 안내합니다.",
    examples: [
      "수원 데이케어센터 이용 가능한 대상은?",
      "장기요양 4등급 주간보호센터 이용 안내",
      "분당 데이케어센터 본인부담금 구조",
      "용인 주간보호센터 송영 가능 지역 확인",
    ],
    badge: "daycare v1.0 (정보형·기관화자)",
  },
  homecare: {
    label: "방문요양",
    greeting: "안녕하세요! 방문요양(재가) 블로그 생성기입니다. 등급·비용·신청·가족요양을 정보형으로 안내합니다.",
    examples: [
      "수원 방문요양 장기요양등급부터 알아보기",
      "분당 방문요양 비용 본인부담금 구조",
      "용인 방문요양 신청 절차와 준비서류",
      "성남 가족요양 자격과 이용 방법",
    ],
    badge: "homecare v1.0 (정보형·기관화자)",
  },
  funeral: {
    label: "상조",
    greeting: "안녕하세요! 상조·장례 안내 블로그 생성기입니다. 비용·절차·장례식장·장례형태를 정보형으로 안내합니다.",
    examples: [
      "수원 가족장 비용 알아보신다면",
      "사망 후 장례 절차 정리",
      "원자력병원 장례식장 비용과 빈소 안내",
      "후불상조 이용 전 확인할 사항",
    ],
    badge: "funeral v1.0 (정보형·장례지도사화자)",
  },
  tax: {
    label: "세무사",
    greeting: "안녕하세요! 세무·신고 안내 블로그 생성기입니다. 종합소득세·부가가치세·기장·양도세 등을 정보형으로 안내합니다.",
    examples: [
      "프리랜서 종합소득세 신고 전 확인할 사항",
      "부가가치세 신고 대상과 기한 정리",
      "기장대리 맡길지 직접 할지 판단 기준",
      "1세대1주택 양도소득세 비과세 요건",
    ],
    badge: "tax v1.0 (정보형·세무사화자)",
  },
  labor: {
    label: "노무사",
    greeting: "안녕하세요! 노무·인사 안내 블로그 생성기입니다. 임금체불·부당해고·산재·근로계약·4대보험 등을 정보형으로 안내합니다.",
    examples: [
      "노원구 임금체불 진정 절차 안내",
      "노원구 부당해고 구제신청 절차",
      "퇴직금 계산 시 확인할 사항",
      "근로계약서 작성 시 확인할 사항",
    ],
    badge: "labor v1.0 (정보형·공인노무사화자)",
  },
  flower: {
    label: "꽃배달",
    greeting: "안녕하세요! 꽃집 블로그 생성기입니다. 근조화환·축하화환·개업화분·꽃다발 등을 정보형으로 안내합니다.",
    examples: [
      "근조화환 보낼 때 리본 문구 정하는 기준",
      "개업화분 어떤 종류로 보낼지 고를 때",
      "꽃다발 예산대별로 달라지는 점",
      "축하화환 주문 전 확인할 사항",
    ],
    badge: "flower v1.0 (정보형·플로리스트화자)",
  },
  welfarecare: {
    label: "복지용구",
    greeting: "안녕하세요! 복지용구 사업소 블로그 생성기입니다. 장기요양등급·신청방법·한도액·품목선택 등을 정보형으로 안내합니다.",
    examples: [
      "복지용구 신청방법과 급여확인서 확인 절차",
      "전동침대 대여 전 확인사항",
      "안전손잡이 설치가 필요한 경우",
      "복지용구 한도액·본인부담금 안내",
    ],
    badge: "welfarecare v1.0 (정보형·사업소화자)",
  },
  seniorgoods: {
    label: "노인용품",
    greeting: "안녕하세요! 노인용품 전문점 블로그 생성기입니다. 전동침대·휠체어·보행기·안전손잡이 등 노인용품과 복지용구 보험적용·등급·대여/구매를 정보형으로 안내합니다.",
    examples: [
      "전동침대가 필요한 상황과 선택 시 확인사항",
      "어르신 휠체어·전동휠체어 선택 기준",
      "안전손잡이·미끄럼방지용품 낙상예방 안내",
      "복지용구 보험적용·장기요양등급·대여/구매 안내",
    ],
    badge: "seniorgoods v1.0 (정보형·노인용품전문점화자)",
  },
  administrative: {
    label: "행정사",
    greeting: "안녕하세요! 행정사사무소 블로그 생성기입니다. 출입국·비자·인허가·기업인증·행정심판·내용증명 등을 정보형으로 안내합니다.",
    examples: [
      "F4비자 거소증 준비서류와 신청절차",
      "전문건설업 등록 요건과 등록기준",
      "직업소개소 등록 절차 안내",
      "여성기업 인증 신청 준비서류",
    ],
    badge: "administrative v1.0 (정보형·행정사화자)",
  },
  realestate: {
    label: "부동산",
    greeting: "안녕하세요! 부동산 블로그 생성기입니다. 아파트분석·전세·월세·재건축·재개발·지역분석·부동산상식을 공인중개사 화자 분석리포트형으로 안내합니다.",
    examples: [
      "노원구 상계주공5단지 입지 분석",
      "노원구 중계그린 실거주 관점 정리",
      "전세 보증금 계약 주의사항",
      "재건축 진행 단계 정리",
    ],
    badge: "realestate v1.0 (분석리포트형·공인중개사화자)",
  },
  cleaning: {
    label: "입주청소",
    greeting: "안녕하세요! 입주청소 블로그 생성기입니다. 입주청소·이사청소·신축/구축·원룸/오피스텔·비용·체크리스트를 청소업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 입주청소 전 확인해야 할 사항",
      "상계주공7단지 입주청소 범위 안내",
      "중계 생활권 입주청소 안내",
      "입주청소 비용이 달라지는 이유",
    ],
    badge: "cleaning v1.0 (정보형·청소업체화자)",
  },
  moving: {
    label: "이사업체",
    greeting: "안녕하세요! 이사업체 블로그 생성기입니다. 포장이사·원룸/투룸·용달·반포장·보관이사·비용·체크리스트를 이사업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 포장이사 비용 확인사항",
      "노원구 원룸이사 준비 체크리스트",
      "노원구 보관이사 필요한 경우",
      "노원구 이사업체 선택 기준",
    ],
    badge: "moving v1.0 (정보형·이사업체화자)",
  },
  interior: {
    label: "인테리어",
    greeting: "안녕하세요! 인테리어 블로그 생성기입니다. 아파트 리모델링·구축아파트·부분 인테리어·욕실/주방·도배장판·상가·견적 체크리스트를 인테리어 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 상계주공7단지 인테리어 준비 전 확인사항",
      "노원구 구축아파트 인테리어 체크리스트",
      "노원구 욕실 리모델링 시 확인할 부분",
      "노원구 인테리어 견적 전 확인사항",
    ],
    badge: "interior v1.0 (정보형·인테리어업체화자)",
  },
  grout: {
    label: "줄눈",
    greeting: "안녕하세요! 줄눈 블로그 생성기입니다. 욕실·주방·현관·베란다 줄눈 시공, 구축아파트 줄눈 관리, 재시공, 종류 비교(케라폭시·폴리우레아), 입주 전 체크리스트를 줄눈 시공 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 하계동 욕실 줄눈 시공 전 확인사항",
      "노원구 공릉동 구축아파트 줄눈 관리 방법",
      "노원구 묵동 줄눈 재시공이 필요한 경우",
      "노원구 입주 전 줄눈 준비 체크리스트",
    ],
    badge: "grout v1.0 (정보형·줄눈시공업체화자)",
  },
  coating: {
    label: "탄성코트",
    greeting: "안녕하세요! 탄성코트 블로그 생성기입니다. 베란다 탄성코트, 결로 방지·곰팡이 예방, 구축아파트 탄성코트, 보수·재시공, 종류 비교(일반·세라믹·규조토·에어로겔), 시공 범위를 탄성코트 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 상계동 베란다 탄성코트 전 확인사항",
      "노원구 결로 방지 관리 체크포인트",
      "노원구 구축아파트 탄성코트 관리 방법",
      "노원구 탄성코트 종류 비교 가이드",
    ],
    badge: "coating v1.0 (정보형·탄성코트업체화자)",
  },
  systemair: {
    label: "시스템에어컨",
    greeting: "안녕하세요! 시스템에어컨 블로그 생성기입니다. 설치, 아파트·구축아파트 설치, 교체, 견적, 추가설치, 배관(선배관·단배관·배수배관), 실외기실 체크를 시스템에어컨 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 상계동 시스템에어컨 설치 전 확인사항",
      "노원구 구축아파트 시스템에어컨 진행 순서 안내",
      "노원구 시스템에어컨 교체 판단 기준 안내",
      "노원구 시스템에어컨 배관 확인사항",
    ],
    badge: "systemair v1.0 (정보형·시스템에어컨업체화자)",
  },
  airclean: {
    label: "에어컨청소",
    greeting: "안녕하세요! 에어컨청소 블로그 생성기입니다. 벽걸이·스탠드·시스템에어컨 청소, 분해청소, 냄새 원인, 곰팡이 제거, 물 떨어짐 원인, 청소 주기를 에어컨청소 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 벽걸이 에어컨 청소 분해세척 어디까지",
      "노원구 에어컨 곰팡이 냄새 원인과 청소",
      "노원구 에어컨 분해청소 분해 범위 안내",
      "노원구 에어컨 청소 주기 얼마나 자주",
    ],
    badge: "airclean v1.0 (정보형·에어컨청소업체화자)",
  },
  screen: {
    label: "방충망",
    greeting: "안녕하세요! 방충망 블로그 생성기입니다. 미세방충망·현관방충망·롤방충망·안전방충망·추락방지방충망·교체·관리방법·종류비교를 방충망 업체 화자 정보형으로 안내합니다.",
    examples: [
      "화성 동탄 미세방충망 교체 전 확인사항",
      "화성 동탄 현관방충망 선택 기준",
      "화성 동탄 추락방지방충망 안전정보",
      "화성 동탄 방충망 종류 비교 정리",
    ],
    badge: "screen v1.0 (정보형·방충망업체화자·useApt)",
  },
  pestcontrol: {
    label: "방역",
    greeting: "안녕하세요! 방역 블로그 생성기입니다. 가정집·원룸·상가·음식점 방역, 바퀴벌레·개미 퇴치, 해충 방역, 관리방법을 방역 업체 화자 정보형으로 안내합니다.",
    examples: [
      "노원구 중계동 바퀴벌레 퇴치 전 확인사항",
      "노원구 공릉동 가정집 방역 관리방법",
      "노원구 하계동 음식점 방역 체크리스트",
      "노원구 월계동 개미 퇴치 안내",
    ],
    badge: "pestcontrol v1.0 (정보형·방역업체화자·출장업종)",
  },
  dobae: {
    label: "도배",
    greeting: "안녕하세요! 도배 블로그 생성기입니다. 전체·부분 도배, 실크·합지 벽지, 거주중·입주 상황, 곰팡이·결로·누수 처리, 도배장판을 도배 업체 화자 정보형(현장 확인·공정 순서)으로 안내합니다.",
    examples: [
      "용인 신동백롯데캐슬에코1단지 34평 실크도배",
      "용인 수지구 거주중도배 진행 순서",
      "용인 기흥구 곰팡이 도배 원인과 처리 방법",
      "용인 처인구 부분도배 시공 범위를 정하는 기준",
    ],
    badge: "dobae v1.0 (정보형·도배업체화자·출장업종·siteBlock)",
  },
  flooring: {
    label: "장판",
    greeting: "안녕하세요! 장판 블로그 생성기입니다. 전체·공간별 장판 교체, 주방·베란다 물기 있는 공간, 상가·사무실·학원·병원 영업 공간 시공을 장판 시공 업체 화자 정보형(현장 확인·철거·덧방 판단·두께 선택)으로 안내합니다.",
    examples: [
      "용인 신동백롯데캐슬에코1단지 34평 전체장판",
      "용인 수지구 거실장판 두께를 정하는 기준",
      "용인 기흥구 주방장판 들뜨는 이유",
      "용인 처인구 상가장판 작업 시간대를 잡는 기준",
    ],
    badge: "flooring v1.0 (정보형·장판시공업체화자·출장업종·siteBlock+두께축)",
  },
  film: {
    label: "인테리어필름",
    greeting: "안녕하세요! 인테리어필름 블로그 생성기입니다. 싱크대·현관문·방문·몰딩·붙박이장·창틀 부위별 시공과 상가·사무실·엘리베이터 영업 공간 시공을 인테리어필름 시공 업체 화자 정보형(현장 확인·하지 상태 판단·원단 선택)으로 안내합니다.",
    examples: [
      "용인 신동백롯데캐슬에코1단지 34평 전체필름",
      "용인 수지구 싱크대필름 문짝을 떼고 하는 이유",
      "용인 기흥구 현관문필름 하지 작업이 갈리는 지점",
      "용인 처인구 상가필름 작업 시간대를 잡는 기준",
    ],
    badge: "film v1.0 (정보형·필름시공업체화자·출장업종·siteBlock+하지축)",
  },
  door: {
    label: "도어수리",
    greeting: "안녕하세요! 도어수리 블로그 생성기입니다. 슬라이딩·포켓·터닝·붙박이장·중문·현관문·방문 고장과 손잡이·클로저·힌지·롤러레일 부품 교체를 도어 수리 업체 화자 정보형(증상 재현·부품 진단·수리와 교체 판단)으로 안내합니다.",
    examples: [
      "노원구 중계동 슬라이딩도어수리 뻑뻑해지는 원인",
      "노원구 하계동 포켓도어수리 진행 순서",
      "노원구 공릉동 현관문수리 처짐 원인과 처리 방법",
      "노원구 월계동 롤러레일교체 규격을 정하는 기준",
    ],
    badge: "door v1.0 (정보형·도어수리업체화자·출장수리·부품군축)",
  },
  waterproof: {
    label: "방수공사",
    greeting: "안녕하세요! 방수공사 블로그 생성기입니다. 옥상·외벽·베란다·화장실·지하주차장 누수와 균열보수·인젝션, 우레탄·PVC시트 공법 선택을 방수 시공 업체 화자 정보형(누수 흔적 발견·물길 추적·부분보수와 전체시공 판단)으로 안내합니다.",
    examples: [
      "노원구 중계동 옥상방수 누수 원인 잡는 순서",
      "노원구 하계동 베란다방수 부분보수와 전체시공 판단 기준",
      "노원구 공릉동 균열보수 보수 방식을 정하는 기준",
      "노원구 월계동 우레탄방수 기존 방수층 처리 기준",
    ],
    badge: "waterproof v1.0 (정보형·방수시공업체화자·출장시공·원인군축)",
  },
  paint: {
    label: "페인트공사",
    greeting: "안녕하세요! 페인트공사 블로그 생성기입니다. 실내벽면·외벽·계단실 도장과 베란다 곰팡이·도막박리 보수, 목재·철재·바닥에폭시 밑칠 선택을 페인트 시공 업체 화자 정보형(도막 상태 확인·손상 발견·밑작업 범위 판단)으로 안내합니다.",
    examples: [
      "노원구 중계동 실내벽면도장 밑작업 범위를 정하는 기준",
      "노원구 하계동 외벽도장 부분보수와 전체도장 판단 기준",
      "노원구 공릉동 도막박리보수 다시 벗겨지는 자리의 차이",
      "노원구 월계동 철재도장 밑칠을 정하는 기준",
    ],
    badge: "paint v1.0 (정보형·페인트시공업체화자·출장시공·원인군축)",
  },
  tile: {
    label: "타일시공",
    greeting: "안녕하세요! 타일시공 블로그 생성기입니다. 욕실·주방·현관 타일의 들뜸과 빈소리를 확인해 걷어낼지 위에 올릴지 정하는 과정을 타일 시공 업체 화자 정보형(빈소리 범위 확인·바탕면 진단·철거와 덧방 판단)으로 안내합니다.",
    examples: [
      "노원구 중계동 욕실타일시공 철거와 덧방을 가르는 기준",
      "노원구 하계동 타일덧방시공 바탕 처리 기준",
      "노원구 공릉동 타일들뜸보수 손볼 범위를 정하는 기준",
      "노원구 월계동 포세린타일시공 판 나누기 기준",
    ],
    badge: "tile v1.0 (정보형·타일시공업체화자·출장시공·철거덧방축)",
  },
  window: {
    label: "창호시공",
    greeting: "안녕하세요! 창호시공 블로그 생성기입니다. 외풍·결로·누수 자국을 따라 어디로 들어오는지 찾아내고 창을 갈지 새는 자리만 잡을지 정하는 과정을 창호 시공 업체 화자 정보형(유입 지점 진단·교체 범위 판단·기밀 확인)으로 안내합니다.",
    examples: [
      "노원구 중계동 샷시교체 부분보수와 전체교체 판단 기준",
      "노원구 하계동 창문누수수리 새는 자리를 찾는 순서",
      "노원구 공릉동 창문단열시공 창을 갈아도 남는 문제",
      "노원구 월계동 복층유리교체 실측에서 갈리는 지점",
    ],
    badge: "window v1.0 (정보형·창호시공업체화자·출장시공·교체보수판단축)",
  },
  furniture: {
    label: "맞춤가구",
    greeting: "안녕하세요! 맞춤가구 블로그 생성기입니다. 벽 기울기·지나갈 폭·간섭물·깊이를 재 보고 그 자리의 제약을 치수로 어떻게 옮길지 정하는 과정을 맞춤가구 제작 업체 화자 정보형(자리 계측·제약 진단·내부 구성 판단·설치·조정)으로 안내합니다.",
    examples: [
      "노원구 중계동 붙박이장제작 벽 조건에서 갈리는 지점",
      "노원구 하계동 드레스룸제작 폭을 나누는 기준",
      "노원구 공릉동 신발장제작 문이 걸리는 이유",
      "노원구 월계동 팬트리제작 치수를 정하는 기준",
    ],
    badge: "furniture v1.0 (정보형·맞춤가구제작업체화자·출장제작설치·자리제약판단축)",
  },
  lighting: {
    label: "조명",
    greeting: "안녕하세요! 조명 블로그 생성기입니다. 천장 속 여유·받칠 자리·전원 지점을 재 보고 그 자리를 그대로 쓸지 자리를 만들지 정하는 과정을 조명 시공 업체 화자 정보형(자리 계측·배치 판단·점등 확인)으로 안내합니다.",
    examples: [
      "노원구 중계동 간접조명 자리를 정하는 기준",
      "노원구 하계동 매립등 천장 여건에서 갈리는 지점",
      "노원구 공릉동 라인조명 빛이 얼룩지는 이유",
      "노원구 월계동 펜던트조명 높이에서 갈리는 지점",
    ],
    badge: "lighting v1.0 (정보형·조명시공업체화자·출장시공·배치여건판단축)",
  },
  demolition: {
    label: "철거공사",
    greeting: "안녕하세요! 철거공사 블로그 생성기입니다. 가벽·천장·임대 원상복구 현장에서 무엇을 살리고 무엇을 뜯을지 경계를 정하는 과정을 철거 공사 업체 화자 정보형(구조 여부 판별·매립 설비 확인·손댈 경계 판단)으로 안내합니다.",
    examples: [
      "노원구 중계동 가벽철거 살리는 면과 뜯는 면을 가르는 기준",
      "노원구 하계동 천장철거 손대기 전에 봐야 하는 곳",
      "노원구 공릉동 원상복구철거 어디까지 되돌려야 하는지 가르는 기준",
      "노원구 월계동 가벽철거 비용이 달라지는 이유",
    ],
    badge: "demolition v1.0 (정보형·철거공사업체화자·출장해체·살릴면뜯을면축)",
  },
  buildingclean: {
    label: "건물청소",
    greeting: "안녕하세요! 건물청소 블로그 생성기입니다. 건물청소·사무실청소·상가청소·계단청소·정기청소·준공청소·외벽청소·건물관리를 건물청소 업체 화자 정보형(건물 유지관리)으로 안내합니다.",
    examples: [
      "노원구 중계동 건물청소 관리방법",
      "노원구 하계동 사무실청소 체크포인트",
      "노원구 공릉동 상가청소 준비사항",
      "노원구 월계동 정기청소 체크리스트",
    ],
    badge: "buildingclean v1.0 (정보형·건물청소업체화자·출장업종)",
  },
  birdcontrol: {
    label: "비둘기퇴치",
    greeting: "안녕하세요! 비둘기퇴치 블로그 생성기입니다. 비둘기퇴치·실외기실·베란다·비둘기퇴치망·버드스파이크·상가·건물·조류퇴치 체크리스트를 비둘기퇴치 업체 화자 정보형(차단·예방)으로 안내합니다.",
    examples: [
      "노원구 중계동 비둘기퇴치 방법 알아보기",
      "노원구 하계동 실외기실 비둘기 문제 관리방법",
      "노원구 공릉동 비둘기퇴치망 설치 시 체크포인트",
      "노원구 월계동 조류퇴치 체크리스트",
    ],
    badge: "birdcontrol v1.0 (정보형·비둘기퇴치업체화자·출장업종)",
  },
  tankclean: {
    label: "저수조청소",
    greeting: "안녕하세요! 저수조청소 블로그 생성기입니다. 저수조청소·물탱크청소·아파트저수조·공동주택저수조·상가저수조·소독·관리주기·체크리스트를 저수조청소 업체 화자 정보형(급수시설 관리)으로 안내합니다.",
    examples: [
      "노원구 중계동 저수조청소 관리방법",
      "노원구 하계동 물탱크청소 안내",
      "노원구 공릉동 아파트 저수조청소 범위",
      "노원구 월계동 저수조 관리 체크리스트",
    ],
    badge: "tankclean v1.0 (정보형·저수조청소업체화자·출장업종·useApt)",
  },
  leakdetect: {
    label: "누수탐지",
    greeting: "안녕하세요! 누수탐지 블로그 생성기입니다. 누수탐지·아파트누수·화장실누수·천장누수·수도배관누수·비용·보험처리·아래층누수를 누수탐지 업체 화자 정보형(원인·탐지절차·장비)으로 안내합니다.",
    examples: [
      "노원구 공릉동 누수탐지 전 확인사항",
      "노원구 하계동 아파트누수 원인 점검",
      "노원구 중계동 화장실누수 확인방법",
      "노원구 월계동 천장누수 원인 분석",
    ],
    badge: "leakdetect v1.0 (정보형·누수탐지업체화자·출장업종·useApt)",
  },
  sewer: {
    label: "하수구막힘",
    greeting: "안녕하세요! 하수구막힘 블로그 생성기입니다. 하수구막힘·싱크대·변기·세면대·배수구 막힘, 하수구역류·악취, 고압세척·배관내시경·횡주관청소를 하수구막힘 업체 화자 정보형(원인·점검·작업절차·예방)으로 안내합니다.",
    examples: [
      "노원구 공릉동 하수구막힘 원인 확인",
      "노원구 하계동 싱크대막힘 점검사항",
      "노원구 월계동 변기막힘 관리방법",
      "노원구 공릉동 배관내시경 확인절차",
    ],
    badge: "sewer v1.0 (정보형·하수구막힘업체화자·출장업종·APT미사용)",
  },
  plumbing: {
    label: "수도설비",
    greeting: "안녕하세요! 수도설비 블로그 생성기입니다. 수도설비·수도배관 설치·수리, 수도계량기·상하수도배관공사·싱크대수도·전기온수기 설치·배관위치변경을 수도설비 업체 화자 정보형(작업범위·원인·진행절차·유지관리)으로 안내합니다.",
    examples: [
      "노원구 공릉동 수도설비 안내",
      "노원구 하계동 수도배관설치 진행 범위",
      "노원구 월계동 수도배관수리 확인사항",
      "노원구 공릉동 전기온수기설치 확인사항",
    ],
    badge: "plumbing v1.0 (정보형·수도설비업체화자·출장업종·APT미사용)",
  },
  boiler: {
    label: "보일러설치",
    greeting: "안녕하세요! 보일러설치 블로그 생성기입니다. 보일러교체·콘덴싱설치, 고장원인·에러코드·온수·난방·누수·배관청소·교체시기·설치비용·브랜드(귀뚜라미·경동나비엔)를 보일러설치 업체 화자 정보형(시공범위·발생원인·진행절차·관리방법)으로 안내합니다.",
    examples: [
      "노원구 공릉동 보일러교체 안내",
      "노원구 하계동 콘덴싱보일러설치 진행절차",
      "노원구 월계동 보일러고장원인 체크사항",
      "노원구 공릉동 보일러설치비용 확인사항",
    ],
    badge: "boiler v1.0 (정보형·보일러설치업체화자·출장업종·APT미사용)",
  },
  homefix: {
    label: "집수리",
    greeting: "안녕하세요! 집수리 블로그 생성기입니다. 문손잡이교체·현관문수리·도어클로저교체·빨래건조대설치·커튼레일설치·실리콘보수·콘센트교체·전등교체를 집수리 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다.",
    examples: [
      "노원구 공릉동 문손잡이교체 안내",
      "노원구 하계동 현관문수리 점검방법",
      "노원구 월계동 빨래건조대설치 교체 전 확인사항",
      "노원구 공릉동 실리콘보수 관리방법",
    ],
    badge: "homefix v1.0 (정보형·집수리업체화자·출장업종·APT미사용)",
  },
  electricrepair: {
    label: "전기수리",
    greeting: "안녕하세요! 전기수리 블로그 생성기입니다. 누전점검·차단기점검·차단기교체·콘센트교체·스위치교체·LED교체·센서등교체·전등안들어옴을 전기수리 업체 화자 정보형(발생원인·점검위치·증상·확인사항·관리방법)으로 안내합니다.",
    examples: [
      "노원구 공릉동 누전점검 안내",
      "노원구 하계동 차단기점검 점검방법",
      "노원구 월계동 콘센트교체 확인방법",
      "노원구 공릉동 전등안들어옴 점검방법",
    ],
    badge: "electricrepair v1.0 (정보형·전기수리업체화자·출장업종·APT미사용)",
  },
  sinkrepair: {
    label: "싱크대수리",
    greeting: "안녕하세요! 싱크대수리 블로그 생성기입니다. 싱크대수리·싱크대문교체·싱크대경첩교체·싱크대레일교체·하부장수리·수납장수리·상판보수·싱크볼교체를 싱크대수리 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다. (수리·교체 전용 / 제작·리폼·리모델링 차단)",
    examples: [
      "노원구 공릉동 싱크대수리 안내",
      "노원구 하계동 싱크대경첩교체 점검방법",
      "노원구 월계동 싱크대레일교체 확인사항",
      "노원구 공릉동 싱크볼교체 점검방법",
    ],
    badge: "sinkrepair v1.0 (정보형·싱크대수리업체화자·출장업종·APT미사용·수리전용)",
  },
  bathroom: {
    label: "욕실리모델링",
    greeting: "안녕하세요! 욕실리모델링 블로그 생성기입니다. 욕실리모델링·화장실리모델링·욕실타일·욕조교체·샤워부스·변기교체·세면대교체·욕실수전·욕실환풍기·욕실실리콘·욕실배수구·거울장 교체를 욕실리모델링 업체 화자 정보형(작업범위·점검항목·발생원인·관리방법)으로 안내합니다.",
    examples: [
      "노원구 공릉동 욕실리모델링 안내",
      "노원구 하계동 욕실타일교체 점검방법",
      "노원구 월계동 욕조교체 확인사항",
      "노원구 공릉동 변기교체 점검방법",
    ],
    badge: "bathroom v1.0 (정보형·욕실리모델링업체화자·출장업종·APT미사용)",
  },
  bedding: {
    label: "침구·이브자리",
    greeting: "안녕하세요! 이브자리 매장 블로그 생성기입니다. 혼수·냉감·구스 등 침구를 정보형으로 안내합니다.",
    examples: [
      "용인 혼수침구 준비 전 확인할 기준",
      "용인 냉감침구 선택 시 확인할 기준",
      "여름이불 소재에 따라 달라지는 점",
      "맞춤베개 상담 전 확인사항",
    ],
    badge: "bedding v1.0 (정보형·매장화자)",
  },
  shaman: {
    label: "무속 상담",
    greeting: "안녕하세요! 무속 상담 블로그 생성기입니다. 사업·문서·자손·건강·조상·인연 상담 분야와 실제 검색 상황(\u2018장사가 계속 안될 때\u2019, \u2018아이가 말을 안 들을 때\u2019)을 연결해 상담소 화자 공감형으로 안내합니다. 결과 보장·의례 권유 표현은 엔진에서 차단됩니다.",
    examples: [
      "노원구 중계동 장사가 계속 안될 때 어디서부터 봐야 할까",
      "노원구 하계동 아이가 말을 안 들을 때 상담 전에 정리해두면 좋은 것",
      "노원구 공릉동 결혼이 늦어질 때 혼자 답이 안 나올 때",
      "노원구 월계동 문서매매 상담은 어떤 이야기를 나누나",
    ],
    badge: "shaman v1.0 (공감형·상담소화자·SPECIALTY×SITUATION 2단축·41메뉴·EngineC hidden)",
  },
};

// ACTIVE_CONFIG, ALL_TREATMENTS는 컴포넌트 내부에서 CURRENT_INDUSTRY 기반으로 동적 계산
const ACTIVE_CONFIG    = INDUSTRY_CONFIG["clinic"]; // fallback only
const ALL_TREATMENTS   = CLINIC_TREATMENTS; // fallback only
import WatermarkTab    from "../components/WatermarkTab";
import PhotoEditorTab  from "../components/PhotoEditorTab";
import DiagnosePage  from "../components/DiagnosePage";
import GuideAccordion  from "../components/GuideAccordion";
import ToolsAccordion  from "../components/ToolsAccordion";

// ============================================================
// [v159] 빌드 마커 — 번들 반영 판별용. Console에 이 줄이 안 보이면 구번들 실행 중.
//   확인: F12 → Console → "BUILD_v159" 검색. 보이면 최신 / 없으면 .next 캐시 or 다른 폴더 실행.
console.log("%cBUILD_v159b / keyword-fallback / copy-textMarkdown-fallback / " + new Date().toISOString(), "color:#fff;background:#4A148C;padding:2px 6px;border-radius:3px;font-weight:700");
// ============================================================
// 유틸
// ============================================================
// ============================================================
// [세션49] 상조 상품 안내 블록 — 프론트 후처리(Engine FREEZE 무손상).
//   출력 위치: 본문 ↓ 운영 상품 안내 ↓ 해시태그. locationBlock과 동일한 "해시태그 앞 삽입" 패턴을
//   프론트에서 재현. 핸들러/프롬프트/INFO_BLOCKS 전부 무수정.
//   규칙: 상품 1개+ 존재 시만 출력 · 빈 항목 미출력 · 안내문구 항상 동반 · 대표번호 있으면만 ☎.
// ============================================================
// ============================================================
// [세션54] Premium Product Card Renderer V1 — 범용 상품 안내(프론트 후처리·Engine FREEZE 무관).
//   목적: 목록형("메모장 느낌") → 정돈된 안내문형. 상조 전용 아님 —
//         {name,price,target,feature,note} shape를 쓰는 모든 업종 재사용
//         (복지용구·데이케어·방문요양·병원 검진상품·법률 패키지 등. opts만 교체).
//   [세션55] 이모지 제거 → 공문/안내문 톤. 장례·의료·법률처럼 신뢰가 중요한 업종은
//            💰📋☎ 이모지가 가벼워 보임 → ■·─ 구분문자 + 텍스트 라벨만 사용.
//   출력 형태: 상품명 1줄 + 세부(라벨 : 값) 다음 줄. 값 여러 항목은 가운뎃점(·)으로 결합.
//   네이버 안전: 유니코드 ■ ─ · 만 사용. HTML/마크다운표 미사용 → 붙여넣기 유지.
//   원칙 정합(PHILOSOPHY): 입력된 필드만 출력(빈 항목 미출력). 데이터에 없는 값 추측 생성 금지 —
//                          라벨 표기 변경만 허용(데이터 무변경).
//   opts: { title, labels:{price,target,feature,note}, notices:[], repPhone, phonePrefix }
// ============================================================
function buildPremiumProductCards(products, opts) {
  const o = opts || {};
  const list = Array.isArray(products) ? products : [];
  const valid = list.filter(p => p && (String(p.name || "").trim() || String(p.price || "").trim()
    || String(p.target || "").trim() || String(p.feature || "").trim() || String(p.note || "").trim()));
  if (valid.length === 0) return "";  // 상품 없으면 블록 전체 미출력

  const title = o.title || "운영 상품 안내";
  const L = Object.assign({ price: "상품금액", target: "추천 대상", feature: "주요 구성", note: "기타 안내" }, o.labels || {});
  const DIV = "────────────────────────────────────";

  // 값 정규화: 줄바꿈·중점·2칸공백·슬래시로 나뉜 항목을 가운뎃점(·)으로 재결합. 단일 값이면 그대로.
  const joinDot = (v) => {
    const parts = String(v || "").split(/\n|·|(?:\s{2,})|(?:\s\/\s)/).map(s => s.trim()).filter(Boolean);
    return parts.join(" · ");
  };

  const lines = [DIV, "", title, ""];
  valid.forEach((p, idx) => {
    const name = String(p.name || "").trim();
    lines.push(`■ ${name || "상품"}`);
    const row = (label, v, useDot) => {
      const t = useDot ? joinDot(v) : String(v || "").trim();
      if (t) lines.push(`${label} : ${t}`);
    };
    row(L.price, p.price, false);
    row(L.target, p.target, true);
    row(L.feature, p.feature, true);
    row(L.note, p.note, false);
    if (idx !== valid.length - 1) lines.push("");
  });

  lines.push("");
  lines.push(DIV);

  const notices = Array.isArray(o.notices) ? o.notices.filter(n => String(n || "").trim()) : [];
  notices.forEach(n => { lines.push(""); lines.push(n); });

  const phone = String(o.repPhone || "").trim();
  if (phone) { lines.push(""); lines.push(`${o.phonePrefix || "대표 상담 : "}${phone}`); }

  return lines.join("\n");
}

// 상조 어댑터 — 범용 렌더러에 상조 라벨·안내문구·대표번호를 주입.
//   출력 위치/삽입 로직은 insertFuneralProductBlock(무수정) 그대로.
function buildFuneralProductBlock(products, repPhone) {
  return buildPremiumProductCards(products, {
    title: "운영 상품 안내",
    labels: { price: "상품금액", target: "추천 대상", feature: "주요 구성", note: "기타 안내" },
    notices: [
      "※ 상품 구성 및 포함 사항은 장례 형태와 선택 옵션에 따라 달라질 수 있습니다.",
      "※ 실제 진행 금액은 장례식장 이용료, 화장·봉안시설 이용료, 추가 선택 품목 등에 따라 달라질 수 있으므로 자세한 내용은 상담을 통해 안내받으시기 바랍니다.",
    ],
    repPhone,
    phonePrefix: "대표 상담 : ",
  });
}

// 해시태그 줄(맨 끝 #..#..) 앞에 블록 삽입. 해시태그 없으면 맨 끝에 append.
//   locationBlock(위치)이 이미 해시태그 앞에 있을 수 있음 → 위치블록보다 위(본문 쪽)에 상품블록을 둔다.
function insertFuneralProductBlock(text, block) {
  if (!block) return text;
  const src = String(text || "");
  const lines = src.split("\n");
  // 뒤에서부터 첫 해시태그 줄 탐색
  let hashIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*#\S/.test(lines[i])) { hashIdx = i; } else if (hashIdx !== -1 && lines[i].trim() !== "") { break; }
  }
  if (hashIdx === -1) return `${src}\n\n${block}`;  // 해시태그 없음 → 끝에 append
  // 위치블록(📍 찾아오시는 길)이 해시태그 앞에 있으면 그 앞에 삽입(상품 → 위치 → 해시태그 순)
  let insertAt = hashIdx;
  for (let i = hashIdx - 1; i >= 0; i--) {
    if (lines[i].includes("📍") || lines[i].includes("찾아오시는 길")) { insertAt = i; }
  }
  const before = lines.slice(0, insertAt).join("\n").replace(/\s+$/, "");
  const after = lines.slice(insertAt).join("\n").replace(/^\s+/, "");
  return `${before}\n\n${block}\n\n${after}`;
}

function calcValidCharCount(text) {
  if (!text) return 0;
  return text
    .replace(/\[이미지:[^\]]*\]/g, "")
    // [v3.6.4] 네이버 복붙용 점선 박스 placeholder 제거 (글자수 제외)
    //   ━━━ ... ━━━ 형태의 사진 안내 블록 전체 삭제
    .replace(/━{5,}[\s\S]*?━{5,}/g, "")
    .replace(/^(#\S+[\s\t]*){2,}$/gm, "")
    .replace(/^HASHTAGS:.+$/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/\s/g, "").length;
}

function scoreToPercentInline(score) {
  if (score >= 95) return 97; if (score >= 90) return 93;
  if (score >= 85) return 87; if (score >= 80) return 80;
  if (score >= 75) return 72; if (score >= 70) return 63;
  if (score >= 65) return 53; if (score >= 60) return 43;
  if (score >= 50) return 32; return 20;
}

function md2html(text) {
  return text
    .replace(/^# (.+)$/gm,     "<h1 style='font-size:20px;font-weight:800;margin:18px 0 10px;color:#1a1a2e'>$1</h1>")
    .replace(/^## (.+)$/gm,    "<h2 style='font-size:16px;font-weight:600;margin:14px 0 6px;color:#37474f'>$1</h2>")
    .replace(/^### (.+)$/gm,   "<h3 style='font-size:16px;font-weight:600;margin:10px 0 4px;color:#37474f'>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<span>$1</span>")
    .replace(/\*(.+?)\*/g,     "<span>$1</span>");
}

// ============================================================
// [v122] region 정제 — 엔진(제목·해시태그·본문)에 박힐 값.
//   생활권(sub_region)에 교통정보(역·출구·노선)가 섞이면 제목/해시태그가 깨짐.
//   규칙: 대표지역 + '동' 1개만 region으로. 역/출구/노선/번호 토큰은 제외.
//   교통정보는 별도 부가정보로 보관(본문 반영은 엔진 영역 — 현재 미주입).
// ============================================================
// [v123] 생활권 회전 비대상 — '그 자체로 검색 키워드가 못 되는' 순수 교통 수식어만 제외.
//   ✅ 회전 대상: 동·역·읍·면·신도시명·상권명 (예: 공릉동, 태릉입구역, 별내신도시, 서면)
//   ❌ 제외: N호선 / N번출구 / '출구' 단독 — 지역명이 아니라 위치 안내어이므로.
//   (v122의 '역 제외'는 폐기: 생활권=공략축이므로 'OO역 OO' 도 정당한 롱테일 키워드)
function isTransitToken(t) {
  return (
    /^\d+\s*호선$/.test(t) ||         // "6호선" 단독
    /\d+\s*번\s*출구/.test(t) ||      // "6번출구"
    /^출구$/.test(t)                  // "출구" 단독
  );
}

// [v123] 생활권 토큰화 — 콤마·중점 등으로 분리. 순수 교통 수식어만 빼고 전부 회전 대상.
//   예) "공릉동, 태릉입구역, 하계동" → subs ["공릉동","태릉입구역","하계동"] (역 포함)
function tokenizeSubRegions(sub) {
  const rawTokens = (sub || "").split(/[,·、|/]+/).map(t => t.trim()).filter(Boolean);
  const subs    = rawTokens.filter(t => !isTransitToken(t)); // 회전 대상(동·역·읍·면·상권 전부)
  const transit = rawTokens.filter(isTransitToken);          // 제외(호선·출구 등 순수 안내어)
  return { rawTokens, subs, transit };
}

// ============================================================
// [v124] 행정구역 계층 판정 — 대표지역과 '결합'할지 '대체'할지 결정.
//   배경(2026-07 실측): 대표지역=중랑구 / 생활권=분당·일산·성북구 입력 시
//     "중랑구 분당", "중랑구 성북구" 같은 비검색어가 제목·ALT·해시태그 전체로 전파.
//   원인: 결합 규칙이 "대표지역(구) + 하위 생활권(동/역)"만 전제했기 때문.
//     생활권 칸에 같은 계층(구·시·군) 또는 타 지역 상권명이 들어오면 조합이 깨진다.
//   규칙: 하위 계층(동·가·리·역·街) → 결합 / 동급 이상(구·시·군) → 대체.
//   ★ 업종 분기 없음 — 병원·전문직 등 동일 오입력을 전 업종에서 자동 보정.
function isSameLevelRegion(t) {
  const s = String(t || "").trim();
  if (!s) return false;
  // 동급 이상 행정구역: OO구 / OO시 / OO군 / OO도 / 광역시·특별시
  if (/(특별시|광역시|특별자치시|특별자치도)$/.test(s)) return true;
  if (/[가-힣]{1,}[시군구도]$/.test(s) && !/[가-힣]+동$/.test(s)) return true;
  // 계층 표기가 없는 광역 상권·신도시명(분당·일산·평촌 등) — 대표지역 하위가 아니므로 대체.
  //   ※ 동/역/가/리 접미가 있으면 하위 계층이므로 여기 해당 없음.
  return false;
}

// 하위 계층 여부 — 동·가·리·역(逆으로 명시). 그 외는 판정 보류(기본 결합 유지).
function isSubLevelRegion(t) {
  return /(동|가|리|역)$/.test(String(t || "").trim());
}

// [v124] 대표지역 + 생활권 1개 → 최종 region 문자열.
//   · 동일값       → 대표지역만 ("잠실 잠실" 방지, 기존 동작 유지)
//   · 하위 계층    → 결합      ("노원구 공릉동", "노원구 태릉입구역")
//   · 동급 이상    → 대체      ("중랑구"+"성북구" → "성북구")
//   · 계층 불명    → 대체      ("중랑구"+"분당" → "분당") — 결합하면 비검색어가 되므로 안전측
// [v-region 2026-07-27] strategy 인자 추가 — 출동업종(service)의 대표지역 혼입 차단.
//   service: 고객 검색 의도 = 현장 위치(작업지). 업체 소재지는 검색어가 아니다.
//     → 생활권 단독 사용. "중랑구 중곡동"(존재하지 않는 행정구역) 구조적 발생 불가.
//     → 생활권 미입력 시에만 대표지역 fallback(지역 공백 방지).
//   visit  : 기존 동작 100% 유지(소재지 = 검색지).
//   ★ strategy 미전달 시 visit 규칙 — 기존 호출부 회귀 0.
// [v125 · S113] 축A 정합성 — 대표지역+생활권 자동 결합 폐지.
//   근거: 대표지역=업체 기준(신뢰축) / 생활권=사용자가 노출을 원하는 검색 기준(검색축).
//     두 축은 페이로드에 이미 분리되어 있다(repRegion / userRegion). 결합이 이 분리를 깨뜨렸다.
//   실측(S113): region='노원구' + sub_region='중화동' → '노원구 중화동'(비존재 행정구역)이
//     제목·본문 강제 3회·closing·해시태그 3종 전체로 전파.
//   결합 유지 시 동↔구 매핑 DB가 필요하고 법정동·행정동·읍면 개편까지 영구 유지 대상이 된다.
//   ★ 구 service 규칙을 전 업종 공통으로 승격. 매핑표 0 · 비존재 행정구역 0.
//   ※ 정합성 수정이며 신뢰축 설계(축B)가 아니다. 축B는 별도 관측 프로젝트.
//   strategy 인자는 시그니처 호환용 잔존(호출부 무수정).
function composeRegion(rep, subPick, strategy) {
  const r = String(rep || "").trim();
  const s = String(subPick || "").trim();
  return s || r;   // 생활권 우선 · 미입력 시 대표지역
}

// [v123] 생활권 순번 회전 선택 — 콤마 입력 목록에서 idx 위치 1개를 고른다(라운드로빈).
//   예) ["공릉동","태릉입구역","하계동","월계동"], idx 0→공릉, 1→태릉, 4→공릉(순환).
//   목록이 비면 "" 반환(대표지역만 사용). idx<0 또는 단일 항목이면 항상 첫 항목.
// [v-region] industry 인자 추가 — 업종별 지역 전략(visit/service) 반영.
//   미전달·미등록 업종 → visit(기존 동작). 화면이 죽지 않도록 Safe 조회 사용.
function pickSubRegion(rep, sub, idx, industry) {
  const r = (rep || "").trim();
  const { subs, transit } = tokenizeSubRegions(sub);
  const n = subs.length;
  const i = (n > 0 && Number.isInteger(idx) && idx >= 0) ? (idx % n) : 0;
  const subPick = n > 0 ? subs[i] : "";
  const strategy = industry ? getRegionStrategySafe(industry) : "visit";
  // [v124] 결합/대체 규칙 위임(composeRegion). 구 규칙(무조건 결합)은 동급 계층 입력 시 붕괴.
  const region = composeRegion(r, subPick, strategy);
  return { region, subPick, subs, transit, count: n, index: i, strategy };
}

// [v123] 기존 시그니처 호환 — 회전 인덱스 없이 '첫 항목 1개'만 고르는 정제(레거시 호출부용).
//   ★ 선택(회전)은 pickSubRegion이 담당, cleanRegionForEngine은 단일 정제만(역할 분리, 설계서 §5-2).
function cleanRegionForEngine(rep, sub) {
  const r = (rep || "").trim();
  const { subs, transit } = tokenizeSubRegions(sub);
  // 동(洞) 우선 — '동'으로 끝나는 첫 토큰. 없으면 첫 일반 토큰.
  const dong = subs.find(t => /동$/.test(t));
  const subPick = dong || subs[0] || "";
  // [v124] 결합/대체 규칙 위임(composeRegion) — pickSubRegion과 동일 규칙 공유.
  const region = composeRegion(r, subPick);
  return { region, subPick, transit };
}

// [v123] 생활권 회전 인덱스 영속 — localStorage(브라우저 보존). 계정 단위 DB 영속화는 회원관리 단계에서.
//   키: 생활권 목록 문자열 기준 → 목록이 바뀌면 자연스럽게 회전 리셋(섹션 일관성).
const LS_SUBROT_KEY = "aipost_subregion_rotation_v1";
function getSubRotIndex(listKey) {
  try {
    const raw = window.localStorage.getItem(LS_SUBROT_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const v = map[listKey];
    return Number.isInteger(v) ? v : 0;
  } catch { return 0; }
}
function bumpSubRotIndex(listKey) {
  try {
    const raw = window.localStorage.getItem(LS_SUBROT_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const cur = Number.isInteger(map[listKey]) ? map[listKey] : 0;
    map[listKey] = cur + 1;
    window.localStorage.setItem(LS_SUBROT_KEY, JSON.stringify(map));
    return cur; // 이번 생성에 사용할 인덱스(증가 전 값)
  } catch { return 0; }
}

// ============================================================
// 전략별 제목 자동 생성 — 우회 키워드 패턴 (비용 0원)
// ============================================================
function generateTitleSuggestions(treatmentName, region, strategyType, industry) {
  const kw = treatmentName;
  const r  = region || "";

  // 우회 패턴: "후기→회복과정", "효과→기간/변화", "병원→경험/비교"
  // [v122] isDental = store.industry 기준 (env DEFAULT_INDUSTRY 의존 제거).
  const isDental = (industry || DEFAULT_INDUSTRY) === "dental";
  const templates = {
    롱테일: isDental ? [
      `${r} ${kw} 후기｜치료 과정 솔직하게 기록`,
      `${kw} 처음 받는 분들이 제일 많이 묻는 것`,
      `${r} ${kw} 받기 전 몰랐던 것들`,
      `${kw} 두려워서 미루다가 결국 받은 이야기`,
      `${r} ${kw} 비용·기간 정리｜상담 3곳 비교`,
    ] : [
      `${kw} 받고 붓기 언제 빠지나 — 직접 기록`,
      `${r} ${kw} 회복 과정 3일차 솔직 후기`,
      `${kw} 후 일상 복귀까지 며칠 걸렸나`,
      `${r} ${kw} 멍·붓기 기간 정리`,
      `${kw} 처음 받는 분들이 제일 많이 묻는 것`,
    ],
    후기형: isDental ? [
      `${r} ${kw} — 치료 끝나고 드는 생각`,
      `${kw} 받기로 결심한 이유가 있었다`,
      `${r} ${kw} 상담 다녀온 날 정리`,
      `${kw} 처음 받아봤는데 솔직히 말하면`,
      `${r} 치과 가기 무서웠는데 ${kw} 받은 이야기`,
    ] : [
      `${r} ${kw} — 3개월 지나고 드는 생각`,
      `${kw} 받기로 결심한 이유가 있었다`,
      `${r} ${kw} 상담 다녀온 날 정리`,
      `${kw} 처음 받아봤는데 솔직히 말하면`,
      `거울 보다가 ${kw} 예약한 이야기`,
    ],
    비교형: isDental ? [
      `${kw} 할까 말까 — 다른 방법이랑 비교해봤어요`,
      `${r} ${kw} 선택한 이유 한 가지`,
      `${kw} vs 다른 치료 — 상담에서 들은 차이`,
      `${r} 치과 3곳 비교 후 ${kw} 선택한 이유`,
    ] : [
      `${kw} 할까 말까 — 다른 방법이랑 비교해봤어요`,
      `${r} ${kw} 선택한 이유 한 가지`,
      `비수술 리프팅 비교 — 내가 ${kw}로 간 이유`,
      `${kw} vs 다른 방법 — 상담에서 들은 차이`,
    ],
    원본: [
      `${r} ${kw} — 솔직한 경험담`,
      `${kw} 고민하는 분들께 드리는 이야기`,
      `${r} ${kw} 받고 나서 달라진 것`,
    ],
  };

  const list = templates[strategyType] || templates["후기형"];
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(t => t.replace(/\s+/g, " ").trim());
}


// [운영 화면 전용] 데모/테스트 더미 데이터를 집계에서 제외. DB는 건드리지 않고 화면 표시에서만 필터.
//   실서비스 운영 화면에 "데모치료" 같은 테스트 발행이 추천·성과·조언을 먹는 문제 차단.
const DEMO_TOPIC_TOKENS = ["데모", "테스트", "샘플", "demo", "test", "sample"];
function isDemoTopic(name) {
  const t = (name || "").toLowerCase();
  return DEMO_TOPIC_TOKENS.some(d => t.includes(d.toLowerCase()));
}
function filterRealPosts(arr, industry) {
  // [v157] 업종 필터 통합 — 달력(line 6732)과 동일 기준을 공통 헬퍼로 일원화.
  //   industry 미전달(undefined) 시 업종 필터 스킵 → 기존 호출부 하위호환 유지.
  //   p.industry 빈 레거시 행은 보존(가리지 않음). 데모 토픽 필터는 종전대로 항상 적용.
  // [UI-SCOPE-VS-CORE-INDUSTRY-CONFLATION-01] 2번째 인자 배열 허용 — 다중 시공분야(departments) 표시 범위.
  //   근거: Core 축(publish_history.industry = treatment owner)과 사용자 UI 소속은 다른 질문이다.
  //         겸업 계정(예: departments=[interior,window,film])이 정상 메뉴로 만든 글이
  //         대표업종 1개 비교에 걸려 자기 목록에서 사라졌다. Core 저장은 무변경.
  //   문자열 전달 호출부 동작 100% 불변. 빈배열/null = 기존과 동일하게 필터 스킵.
  const _scope = Array.isArray(industry)
    ? industry.filter(Boolean)
    : (industry ? [industry] : []);
  return (Array.isArray(arr) ? arr : []).filter(p =>
    !isDemoTopic(p && (p.treatment_name || p.keyword)) &&
    !(_scope.length && p && p.industry && !_scope.includes(p.industry))
  );
}
function filterRealItems(arr) {
  return (Array.isArray(arr) ? arr : []).filter(it => !isDemoTopic(it && it.treatment));
}

// ★ [pediatrics v2] 소아 한정자 — 성인 동명 질환(천식/폐렴/장염/변비/두드러기)과 분리
function _isPed(text) {
  return text.includes("아이") || text.includes("소아") || text.includes("아기")
      || text.includes("영유아") || text.includes("소아과") || text.includes("소아청소년과");
}

// ★ [psy V2 2026-07-13] 정신과 한정자 — 성인 동명 생활어("우울/불안/불면/집중/번아웃")와 분리 필수.
//   else-if 체인 내부 const 선언 금지 → 모듈스코프 함수.
function _isPsy(text) {
  return text.includes("정신건강의학과") || text.includes("정신과") || text.includes("정신")
      || text.includes("심리") || text.includes("상담") || text.includes("진료");
}

// ★ [family V2 재설계 2026-07-14] 가정의학과 한정자 — "감기/기침/두통/피로/수면/혈압"은
//   일반 생활어이자 타 과(general·ent·neuro·psy) 후기에 광범위 등장 → 한정자 없이 잡으면 오탐.
//   else-if 체인 내부 const 선언 금지 → 모듈스코프 함수.
function _isFamily(text) {
  return text.includes("가정의학과") || text.includes("가정의학");
}

function parseNaturalInput(text) {
  // 🔧 v2: 사용자 입력 region 중복 토큰 정리 ("인천 인천" → "인천")
  // 한글 토큰 경계가 \b로 잡히지 않으므로 공백/문장경계 기반으로 처리
  text = String(text || '').replace(/(^|\s)([가-힣]{2,5})\s+\2(?=\s|$)/g, '$1$2');

  // ── v3: 동사 어미 / 형용사 어미 region 오인 차단 ──────────
  // "끊으면", "다녀왔다면", "좋네요", "있거든요", "했더니" 같은 어미가 행정구역 "면"·"동"·"구"와 충돌
  // 행정구역 매칭 시 앞 글자가 어미 패턴이면 제외
  const VERB_ENDING_BLOCKS = [
    // ~으면 / ~다면 / ~라면 (조건형 어미) — "면" 충돌
    /[으다라]면$/,
    // ~네요 / ~군요 / ~데요 (감탄형) — 끝 글자 충돌 가능성 낮으나 보수적 차단
    /[네군데]요$/,
    // ~거든요 / ~인데요 (설명형)
    /거든요?$/,
    /인데요?$/,
    // ~했더니 / ~다더니 (회상형)
    /더니$/,
    // ~니까 / ~으니 (이유형)
    /니까$/,
    /[으아어]니$/,
    // ~ㅂ니다 / ~습니다 종결
    /[습ㅂ]니다$/,
  ];
  function looksLikeVerbEnding(candidate) {
    return VERB_ENDING_BLOCKS.some(re => re.test(candidate));
  }

  // ── 시/군/구/읍/면/동 단위 자동 추출 (지방 포함) ──────────
  const UNIT_PATTERN = /([가-힣]{2,5})(시|군|구|읍|면|동)(?=\s|$|[^가-힣])/g;
  let unitMatch, extractedRegion = "";
  while ((unitMatch = UNIT_PATTERN.exec(text)) !== null) {
    const candidate = unitMatch[1] + unitMatch[2]; // "끊으면" / "중랑구"
    // ★ 동사 어미 차단: "끊으면", "다녀왔다면", "있거든요" 등 region 후보에서 제외
    if (looksLikeVerbEnding(candidate)) {
      console.log(`[parseNaturalInput] 동사 어미 차단: "${candidate}"`);
      continue;
    }
    // ★ 첫 글자가 너무 짧거나 일반 동사 어근이면 차단
    //   "면 단위" 매칭 시 앞부분이 1글자 + "면"이면 부적절 (예: "가면", "오면")
    if (unitMatch[2] === "면" && unitMatch[1].length < 2) {
      continue;
    }
    extractedRegion = candidate;
  }

  const regions = [
    "강남","서초","송파","강동","강서",
    "중랑","노원","도봉","강북","성북","동대문","광진",
    "은평","서대문","마포","종로","중구","용산",
    "양천","구로","금천","영등포","동작","관악",
    "압구정","청담","신사","잠실","목동","홍대","신촌","이태원","혜화","건대",
    "분당","판교","수원","성남","용인","고양","일산","의정부","남양주","하남",
    "광명","안양","안산","별내","다산","위례","미사","광교","동탄","수지",
    "기흥","평택","화성","시흥","부천","김포","오산",
    "인천","대구","부산","광주","대전","울산","세종","제주",
    "전주","청주","창원","포항","김해","천안","아산","순천","여수","원주",
  ];

  let region = "", treatmentId = null, treatmentName = "";

  if (extractedRegion) {
    region = extractedRegion; // "중랑구" 원본 그대로
  } else {
    const sorted = [...regions].sort((a, b) => b.length - a.length);
    for (const r of sorted) {
      if (text.includes(r)) { region = r; break; }
    }
  }

  // ★ v3: region 최종 검증 — 동사 어미가 통과했거나 화이트리스트 매칭 실패 시 기본값
  if (region && looksLikeVerbEnding(region)) {
    console.log(`[parseNaturalInput] region 최종 검증 실패 (동사 어미): "${region}" → 기본값 사용`);
    region = "";
  }
  // ★ v4: region 미입력 시 빈값 유지 (강남 fallback 제거 — Phase 9.5 누수 차단)
  if (!region || region.length < 2) {
    region = "";
    console.log(`[parseNaturalInput] region 추출 실패 — 빈값 유지 (입력: "${text.slice(0, 60)}")`);
  } else {
    console.log(`[parseNaturalInput] region: "${region}" (입력: "${text.slice(0, 60)}")`);
  }

  const allT = [...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS, ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS, ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...PULMO_TREATMENTS, ...CARD_TREATMENTS, ...ENDO_TREATMENTS, ...GENERAL_V2_TREATMENTS, ...OBGYN_TREATMENTS, ...PAIN_TREATMENTS, ...RADIO_TREATMENTS, ...NEURO_TREATMENTS, ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS, ...CAFE_TREATMENTS, ...KINDERGARTEN_TREATMENTS, ...FISHING_TREATMENTS, ...RESTAURANT_TREATMENTS, ...CHINESE_TREATMENTS, ...KOREAN_TREATMENTS, ...SNACK_TREATMENTS, ...JAPANESE_TREATMENTS, ...WESTERN_TREATMENTS, ...CHICKEN_TREATMENTS, ...MEAT_TREATMENTS, ...LEGAL_TREATMENTS, ...BEDDING_TREATMENTS, ...LAWYER_TREATMENTS, ...DAYCARE_TREATMENTS, ...HOMECARE_TREATMENTS, ...FUNERAL_TREATMENTS, ...TAX_TREATMENTS, ...LABOR_TREATMENTS, ...FLOWER_TREATMENTS, ...WELFARECARE_TREATMENTS, ...SENIORGOODS_TREATMENTS, ...ADMIN_TREATMENTS, ...REALESTATE_TREATMENTS, ...CLEANING_TREATMENTS, ...MOVING_TREATMENTS, ...INTERIOR_TREATMENTS, ...GROUT_TREATMENTS, ...COATING_TREATMENTS, ...SYSTEMAIR_TREATMENTS, ...AIRCLEAN_TREATMENTS, ...SCREEN_TREATMENTS, ...PESTCONTROL_TREATMENTS, ...BUILDINGCLEAN_TREATMENTS, ...BIRDCONTROL_TREATMENTS, ...TANKCLEAN_TREATMENTS, ...LEAKDETECT_TREATMENTS, ...SEWER_TREATMENTS, ...PLUMBING_TREATMENTS, ...BOILER_TREATMENTS, ...HOMEFIX_TREATMENTS, ...ELECTRICREPAIR_TREATMENTS, ...SINKREPAIR_TREATMENTS, ...BATHROOM_TREATMENTS, ...DOBAE_TREATMENTS, ...FLOORING_TREATMENTS, ...FILM_TREATMENTS, ...DOOR_TREATMENTS, ...WATERPROOF_TREATMENTS, ...PAINT_TREATMENTS, ...TILE_TREATMENTS, ...WINDOW_TREATMENTS, ...DEMOLITION_TREATMENTS, ...LIGHTING_TREATMENTS, ...FURNITURE_TREATMENTS, ...SHAMAN_TREATMENTS];
  for (const t of allT) { if (text.includes(t.name)) { treatmentId = t.id; treatmentName = t.name; break; } }
  if (!treatmentId) {
    if      (text.includes("쌍꺼풀") || text.includes("눈매"))                                  { treatmentId = "natural_double"; treatmentName = "자연유착 쌍꺼풀"; }
    else if (text.includes("눈밑") || text.includes("다크서클") || text.includes("애교살"))      { treatmentId = "eye_fat";        treatmentName = "눈밑지방재배치"; }
    else if (text.includes("코성형") || text.includes("콧대") || text.includes("매부리"))        { treatmentId = "rhinoplasty";    treatmentName = "코성형"; }
    else if (text.includes("실리프팅") || (text.includes("실리") && !text.includes("실리콘")))     { treatmentId = "sili_lifting";   treatmentName = "실리프팅"; }
    else if (text.includes("울쎄라"))                                                            { treatmentId = "ulthera";        treatmentName = "울쎄라"; }
    else if (text.includes("리프팅"))                                                            { treatmentId = "sili_lifting";   treatmentName = "실리프팅"; }
    else if (text.includes("보톡스") || text.includes("사각턱"))                                 { treatmentId = "botox";          treatmentName = "보톡스"; }
    else if (text.includes("필러") || text.includes("팔자"))                                     { treatmentId = "filler";         treatmentName = "필러"; }
    else if (text.includes("지방흡입") || text.includes("지흡"))                                 { treatmentId = "liposuction";    treatmentName = "지방흡입"; }
    else if (text.includes("토닝") || text.includes("기미"))                                     { treatmentId = "laser_toning";   treatmentName = "레이저토닝"; }
    else if (text.includes("피코레이저") || text.includes("피코") || text.includes("잡티"))      { treatmentId = "pico_laser";     treatmentName = "피코레이저"; }
    else if (text.includes("레이저"))                                                            { treatmentId = "pico_laser";     treatmentName = "피코레이저"; }
    // dental 시술 인식
    else if (text.includes("임플란트"))                                                          { treatmentId = "implant";        treatmentName = "임플란트"; }
    else if (text.includes("라미네이트"))                                                        { treatmentId = "laminate";       treatmentName = "라미네이트"; }
    else if (text.includes("설측교정") || text.includes("설측"))                                 { treatmentId = "lingual_braces"; treatmentName = "설측교정"; }
    else if (text.includes("일반교정") || text.includes("메탈교정"))                             { treatmentId = "metal_braces";   treatmentName = "일반교정"; }
    else if (text.includes("투명교정") || text.includes("교정"))                                 { treatmentId = "braces";         treatmentName = "투명교정"; }
    else if (text.includes("신경치료") && !text.includes("고주파") && !text.includes("신경외과")) { treatmentId = "rootcanal";      treatmentName = "신경치료"; }
    else if (text.includes("스케일링"))                                                          { treatmentId = "scaling";        treatmentName = "스케일링"; }
    else if (text.includes("사랑니"))                                                            { treatmentId = "wisdom";         treatmentName = "사랑니발치"; }
    else if (text.includes("지르코니아") || text.includes("크라운"))                             { treatmentId = "zirconia";       treatmentName = "지르코니아크라운"; }
    else if (text.includes("미백"))                                                              { treatmentId = "whitening";      treatmentName = "치아미백"; }
    else if (text.includes("턱관절"))                                                            { treatmentId = "tmj";            treatmentName = "턱관절치료"; }
    else if (text.includes("틀니"))                                                              { treatmentId = "denture";        treatmentName = "틀니"; }
    // ent 치료 인식
    else if (text.includes("코골이") || text.includes("수면무호흡"))                             { treatmentId = "snoring";         treatmentName = "코골이수면치료"; }
    else if (text.includes("비중격") || (text.includes("코막힘") && text.includes("수술")))      { treatmentId = "septum";          treatmentName = "비중격만곡증수술"; }
    else if (text.includes("축농증") || text.includes("부비동"))                                 { treatmentId = "sinusitis";       treatmentName = "축농증치료"; }
    else if (text.includes("비염"))                                                              { treatmentId = "rhinitis";        treatmentName = "비염치료"; }
    else if (text.includes("편도"))                                                              { treatmentId = "tonsil";          treatmentName = "편도선수술"; }
    else if (text.includes("중이염"))                                                            { treatmentId = "otitis";          treatmentName = "중이염치료"; }
    else if (text.includes("이명"))                                                              { treatmentId = "tinnitus";        treatmentName = "이명치료"; }
    else if (text.includes("돌발성난청") || text.includes("돌발 난청") || text.includes("갑자기") && text.includes("난청")) { treatmentId = "sudden_hearing"; treatmentName = "돌발성난청치료"; }
    else if (text.includes("성대") || text.includes("목소리") || text.includes("쉰목"))         { treatmentId = "voice";           treatmentName = "목소리이상치료"; }
    else if (text.includes("이석증") || text.includes("메니에르") || (text.includes("어지럼") && !text.includes("신경"))) { treatmentId = "dizziness"; treatmentName = "어지럼증치료"; }
    else if (text.includes("후두") || text.includes("인후두") || text.includes("목이물감"))                             { treatmentId = "laryngoscopy"; treatmentName = "후두내시경검사"; }
    else if (text.includes("청력") || text.includes("보청기") || text.includes("난청"))                                 { treatmentId = "hearing";       treatmentName = "청력검사보청기"; }
    else if (text.includes("코피") || text.includes("비출혈"))                                                          { treatmentId = "epistaxis";     treatmentName = "코피비출혈치료"; }
    // urology 치료 인식
    else if (text.includes("전립선비대") || text.includes("야간빈뇨") || text.includes("잔뇨"))                         { treatmentId = "prostate";          treatmentName = "전립선비대증치료"; }
    else if (text.includes("포경"))                                                                                     { treatmentId = "circumcision";      treatmentName = "포경수술"; }
    else if (text.includes("요로결석") || text.includes("신장결석") || text.includes("옆구리통증"))                     { treatmentId = "kidney_stone";      treatmentName = "요로결석치료"; }
    else if (text.includes("방광염"))                                                                                   { treatmentId = "bladder";           treatmentName = "방광염치료"; }
    else if (text.includes("발기부전") || text.includes("발기"))                                                        { treatmentId = "ed";                treatmentName = "발기부전치료"; }
    else if (text.includes("정관수술") || text.includes("정관"))                                                        { treatmentId = "vasectomy";         treatmentName = "정관수술"; }
    else if (text.includes("요실금"))                                                                                   { treatmentId = "incontinence";      treatmentName = "요실금치료"; }
    else if (text.includes("정계정맥류"))                                                                               { treatmentId = "varicocele";        treatmentName = "정계정맥류치료"; }
    else if (text.includes("성병"))                                                                                     { treatmentId = "sti";               treatmentName = "성병검사치료"; }
    else if (text.includes("과민성방광") || text.includes("빈뇨"))                                                     { treatmentId = "overactive_bladder"; treatmentName = "과민성방광치료"; }
    else if (text.includes("혈뇨"))                                                                                     { treatmentId = "hematuria";         treatmentName = "혈뇨검사치료"; }
    else if (text.includes("전립선암") || text.includes("PSA"))                                                        { treatmentId = "prostate_cancer";    treatmentName = "전립선암검진"; }
    else if (text.includes("조루"))                                                                                     { treatmentId = "pe";                 treatmentName = "조루증치료"; }
    else if (text.includes("유로리프트") || text.includes("결찰술"))                                                    { treatmentId = "urolift";            treatmentName = "전립선결찰술"; }
    else if (text.includes("갱년기") || text.includes("테스토스테론"))                                                  { treatmentId = "male_menopause";     treatmentName = "남성갱년기치료"; }
    else if (text.includes("배뇨장애") || text.includes("소변줄기"))                                                    { treatmentId = "voiding";            treatmentName = "배뇨장애치료"; }
    else if (text.includes("불임") || text.includes("정자검사") || text.includes("정액검사"))                           { treatmentId = "male_infertility";   treatmentName = "남성불임검사"; }
    else if (text.includes("음경확대") || text.includes("귀두확대"))                                                    { treatmentId = "penile_enlargement"; treatmentName = "음경확대수술"; }
    // ortho 치료 인식
    else if (text.includes("허리디스크") || (text.includes("허리") && text.includes("디스크")))  { treatmentId = "lumbar_disc";         treatmentName = "허리디스크치료"; }
    else if (text.includes("목디스크") || (text.includes("목") && text.includes("디스크")))      { treatmentId = "cervical_disc";       treatmentName = "목디스크치료"; }
    else if (text.includes("협착증") || text.includes("척추관협착"))                              { treatmentId = "spinal_stenosis";     treatmentName = "척추관협착증치료"; }
    // ortho v1.1 신규 — 경추협착·거북목 (목디스크 분리, 척추협착증 위에 우선 배치는 부적절하므로 별도 키워드만)
    else if (text.includes("경추협착") || text.includes("거북목") || text.includes("일자목"))    { treatmentId = "cervical_stenosis";   treatmentName = "경추협착증치료"; }
    // ortho v1.1 신규 — 연골주사 (무릎관절염 위에 배치: DN·콘쥬란·히알루론산 키워드 우선)
    else if (text.includes("DN주사") || text.includes("콘쥬란") || text.includes("히알루론산") || (text.includes("연골주사") && !text.includes("무릎"))) { treatmentId = "cartilage_injection"; treatmentName = "연골주사치료"; }
    else if ((text.includes("무릎") && (text.includes("관절염") || text.includes("연골주사"))))   { treatmentId = "knee_arthritis";      treatmentName = "무릎관절염치료"; }
    else if (text.includes("반월상") || text.includes("반월"))                                    { treatmentId = "meniscus";            treatmentName = "반월상연골치료"; }
    // v3.7.4 (2026-05-13): 회전근개·오십견·고관절 → 어깨통증치료/도수치료로 통합
    //   원인: generateOrtho.js 화이트리스트(ORTHO_NAMES) 미포함 → reject 발생
    //   결정: 별도 id 추가 대신 어깨통증치료 narrative로 흡수 (ortho freeze 유지)
    else if (text.includes("회전근개") || text.includes("오십견") || text.includes("유착성관절낭염")) { treatmentId = "shoulder";            treatmentName = "어깨통증치료"; }
    else if (text.includes("어깨") && (text.includes("통증") || text.includes("정형외과")))       { treatmentId = "shoulder";            treatmentName = "어깨통증치료"; }
    else if (text.includes("프롤로") || text.includes("PRP주사"))                                 { treatmentId = "prolotherapy";        treatmentName = "프롤로주사치료"; }
    else if (text.includes("전방십자인대") || text.includes("십자인대"))                          { treatmentId = "acl";                 treatmentName = "전방십자인대치료"; }
    // v3.7.4: 고관절 → 도수치료로 통합 (ortho 화이트리스트 미포함)
    else if (text.includes("고관절") || text.includes("대퇴골두") || (text.includes("사타구니") && text.includes("통증"))) { treatmentId = "manual_therapy_ortho"; treatmentName = "도수치료"; }
    else if (text.includes("족저근막"))                                                            { treatmentId = "plantar_fasciitis";   treatmentName = "족저근막염치료"; }
    else if (text.includes("발목인대"))                                                            { treatmentId = "ankle_sprain";        treatmentName = "발목인대손상치료"; }
    // ortho v1.1 신규 — 무지외반증
    else if (text.includes("무지외반증") || text.includes("무지외반") || text.includes("엄지발가락변형")) { treatmentId = "bunion"; treatmentName = "무지외반증치료"; }
    else if (text.includes("테니스엘보") || text.includes("골프엘보"))                            { treatmentId = "elbow";               treatmentName = "팔꿈치통증치료"; }
    else if (text.includes("손목터널") || text.includes("수근관"))                                { treatmentId = "carpal_tunnel";       treatmentName = "손목터널증후군치료"; }
    // ortho v1.1 신규 — 압박골절 (척추압박골절은 신경외과에도 있으므로 정형외과 명시 시만)
    else if ((text.includes("압박골절") || text.includes("척추성형술") || text.includes("풍선척추성형")) && !text.includes("신경외과")) { treatmentId = "compression_fracture"; treatmentName = "허리압박골절치료"; }
    else if (text.includes("골절") && text.includes("재활"))                                      { treatmentId = "fracture_rehab";      treatmentName = "골절재활치료"; }
    else if (text.includes("측만증"))                                                              { treatmentId = "scoliosis";           treatmentName = "척추측만증치료"; }
    else if (text.includes("리제네텐"))                                                               { treatmentId = "regenerten";          treatmentName = "리제네텐주사치료"; }
    // pediatrics 진료 인식 — ★ V2 14종 (2026-07-13 승격). v1 22종 폐기.
    //   경계: 예방접종·고열/열성경련·성장호르몬·소아비만·신생아 제외
    //         중이염/비염/축농증(ent) · 결막염/다래끼(eye) · ADHD/발달장애(psy) 제외
    //   ※ 소아 한정자(아이/소아/아기/영유아) 필수 — 성인 동명 질환(천식/폐렴/장염/변비/두드러기)과 분리
    // ── 검사 (exam 5) ──
    else if (text.includes("소아알레르기검사") || (text.includes("알레르기검사") && _isPed(text)) || ((text.includes("MAST") || text.includes("피부반응")) && _isPed(text))) { treatmentId = "allergy_test"; treatmentName = "소아알레르기검사"; }
    else if (text.includes("소아성장검사") || (text.includes("골연령") && _isPed(text)) || ((text.includes("성장검사") || text.includes("성장판검사")) && _isPed(text))) { treatmentId = "growth_test"; treatmentName = "소아성장검사"; }
    else if (text.includes("영유아발달검사") || text.includes("발달검사") || (text.includes("영유아") && text.includes("검진"))) { treatmentId = "development_test"; treatmentName = "영유아발달검사"; }
    else if (text.includes("소아혈액검사") || ((text.includes("혈액검사") || text.includes("빈혈") || text.includes("철분")) && _isPed(text))) { treatmentId = "blood_test"; treatmentName = "소아혈액검사"; }
    else if (text.includes("소아폐기능검사") || (text.includes("폐기능") && _isPed(text))) { treatmentId = "lung_function_test"; treatmentName = "소아폐기능검사"; }
    // ── 질환 (disease 9) ──
    else if ((text.includes("천식") || text.includes("쌕쌕")) && _isPed(text) && !text.includes("모세기관지")) { treatmentId = "asthma"; treatmentName = "소아천식"; }
    else if (text.includes("모세기관지염") || (text.includes("RSV") && _isPed(text))) { treatmentId = "bronchiolitis"; treatmentName = "모세기관지염"; }
    else if ((text.includes("폐렴") || text.includes("기관지염")) && _isPed(text)) { treatmentId = "pneumonia"; treatmentName = "소아폐렴"; }
    else if ((text.includes("아토피") || text.includes("습진")) && _isPed(text)) { treatmentId = "atopy"; treatmentName = "아토피피부염"; }
    else if ((text.includes("두드러기") || text.includes("발진")) && _isPed(text)) { treatmentId = "urticaria"; treatmentName = "소아두드러기"; }
    else if ((text.includes("장염") || text.includes("구토") || text.includes("설사")) && _isPed(text)) { treatmentId = "gastroenteritis"; treatmentName = "소아장염"; }
    else if (text.includes("변비") && _isPed(text)) { treatmentId = "constipation"; treatmentName = "소아변비"; }
    else if (text.includes("수족구")) { treatmentId = "hfmd"; treatmentName = "수족구병"; }
    else if (text.includes("성조숙증") || text.includes("조기성징")) { treatmentId = "precocious_puberty"; treatmentName = "성조숙증"; }
    // general 진료 인식
    else if (text.includes("고혈압") && !text.includes("소아"))                                                                           { treatmentId = "hypertension";       treatmentName = "고혈압"; }
    else if ((text.includes("당뇨") || text.includes("HbA1c") || text.includes("혈당")) && !text.includes("소아"))                        { treatmentId = "diabetes";           treatmentName = "당뇨"; }
    // general v1.1 신규 — 통풍 (고지혈증보다 위 배치)
    else if (text.includes("통풍") || text.includes("요산") || text.includes("알로퓨리놀") || text.includes("페북소스타트"))               { treatmentId = "gout";               treatmentName = "요산·통풍치료"; }
    // general v1.1 신규 — 심혈관 정밀 관리 (고지혈증보다 위 배치)
    else if (text.includes("심혈관") || text.includes("이상지질혈증") || text.includes("경동맥초음파") || text.includes("관상동맥CT") || (text.includes("LDL") && (text.includes("정밀") || text.includes("강화") || text.includes("위험")))) { treatmentId = "cardiovascular"; treatmentName = "이상지질혈증·심혈관 관리"; }
    else if (text.includes("고지혈증") || text.includes("콜레스테롤") || text.includes("LDL"))                                            { treatmentId = "dyslipidemia";       treatmentName = "고지혈증"; }
    // general v1.1 신규 — 남성갱년기 호르몬 (내과 한정, 비뇨기과와 분리)
    else if ((text.includes("남성갱년기") || text.includes("테스토스테론") || text.includes("남성호르몬")) && (text.includes("내과") || text.includes("가정의학") || text.includes("호르몬") || text.includes("만성피로"))) { treatmentId = "male_menopause"; treatmentName = "남성갱년기·호르몬 관리"; }
    else if (text.includes("갑상선") && (text.includes("기능") || text.includes("TSH") || text.includes("저하") || text.includes("항진"))) { treatmentId = "thyroid";            treatmentName = "갑상선 기능이상"; }
    // general v1.1 신규 — 정밀검진 (기존 건강검진보다 우선)
    else if (text.includes("정밀검진") || text.includes("프리미엄검진") || (text.includes("종합검진") && (text.includes("패키지") || text.includes("정밀") || text.includes("CT") || text.includes("MRI")))) { treatmentId = "comprehensive_checkup"; treatmentName = "종합검진·정밀검진"; }
    else if ((text.includes("건강검진") || text.includes("종합검진")) && !text.includes("소아") && !text.includes("영유아"))               { treatmentId = "checkup";            treatmentName = "건강검진"; }
    // general v1.1 신규 — 대상포진 예방접종 (기존 대상포진 진료보다 우선)
    else if (text.includes("싱그릭스") || text.includes("조스타박스") || (text.includes("대상포진") && (text.includes("예방접종") || text.includes("백신") || text.includes("접종")))) { treatmentId = "shingles_vaccine"; treatmentName = "대상포진 예방접종"; }
    else if (text.includes("대상포진"))                                                                                                    { treatmentId = "shingles";           treatmentName = "대상포진"; }
    // general v1.1 신규 — 코로나 후유증 (만성피로보다 우선)
    else if (text.includes("롱코비드") || text.includes("코로나후유증") || text.includes("코로나 후유증") || text.includes("브레인포그") || (text.includes("코로나") && (text.includes("후유증") || text.includes("만성") || text.includes("피로")))) { treatmentId = "long_covid"; treatmentName = "코로나 후유증·롱코비드"; }
    else if (text.includes("수액") || text.includes("영양주사") || text.includes("마이어스") || text.includes("백옥주사"))                 { treatmentId = "iv_therapy";         treatmentName = "수액·영양주사"; }
    else if ((text.includes("만성피로") || text.includes("번아웃")) && !text.includes("소아") && !text.includes("코로나"))                 { treatmentId = "fatigue";            treatmentName = "만성피로"; }
    else if ((text.includes("독감") || text.includes("타미플루")) && !text.includes("소아") && !text.includes("아이") && !text.includes("예방접종")) { treatmentId = "flu_adult"; treatmentName = "독감·감기(성인)"; }
    // general v1.1 신규 — 알레르기 검사
    else if ((text.includes("알레르기검사") || text.includes("MAST검사") || text.includes("피부반응검사") || text.includes("알레르기면역치료") || (text.includes("알레르기") && (text.includes("원인") || text.includes("정밀") || text.includes("검사")))) && !text.includes("소아") && !text.includes("아이")) { treatmentId = "allergy"; treatmentName = "알레르기 검사·관리"; }
    else if (text.includes("비타민D") || text.includes("비타민 D"))                                                                       { treatmentId = "vitamin_d";          treatmentName = "비타민D 결핍"; }
    else if ((text.includes("빈혈")) && !text.includes("소아") && !text.includes("아이"))                                                  { treatmentId = "anemia_adult";       treatmentName = "빈혈(성인)"; }
    else if (text.includes("금연") || text.includes("챔픽스"))                                                                            { treatmentId = "smoking_cessation";  treatmentName = "금연 클리닉"; }
    else if ((text.includes("마운자로") || text.includes("위고비") || text.includes("삭센다") || text.includes("비만")) && !text.includes("한의원")) { treatmentId = "weight_loss"; treatmentName = "비만·다이어트 치료"; }
    else if (text.includes("불면증") || text.includes("수면장애") || text.includes("수면제"))                                              { treatmentId = "insomnia";           treatmentName = "수면 장애"; }
    else if (text.includes("생활습관병") || (text.includes("고혈압") && text.includes("당뇨")))                                           { treatmentId = "lifestyle_disease";  treatmentName = "생활습관병 관리"; }
    // obgyn 진료 인식
    else if (text.includes("자궁근종"))                                                                                                    { treatmentId = "uterine_fibroid";    treatmentName = "자궁근종"; }
    else if (text.includes("난소낭종") || text.includes("난소물혹"))                                                                      { treatmentId = "ovarian_cyst";       treatmentName = "난소낭종"; }
    // obgyn v1.1 신규 — 여성암 종합검진 (자궁경부암보다 우선 매칭)
    else if (text.includes("여성암검진") || text.includes("여성암 검진") || (text.includes("여성암") && (text.includes("종합") || text.includes("정밀"))) || text.includes("CA-125") || text.includes("난소암표지자")) { treatmentId = "female_cancer_screening"; treatmentName = "여성암 종합검진"; }
    else if (text.includes("자궁경부암") || (text.includes("HPV") && !text.includes("백신") && text.includes("검진")))                   { treatmentId = "cervical_cancer";    treatmentName = "자궁경부암 검진·HPV"; }
    // obgyn v1.1 신규 — 생리통·자궁선근증 (생리불순보다 우선)
    else if (text.includes("자궁선근증") || (text.includes("생리통") && (text.includes("심한") || text.includes("진통제") || text.includes("산부인과") || text.includes("치료")))) { treatmentId = "dysmenorrhea"; treatmentName = "생리통·자궁선근증"; }
    else if (text.includes("생리불순") || text.includes("무월경") || (text.includes("생리") && text.includes("불규칙")))                  { treatmentId = "menstrual_disorder"; treatmentName = "생리불순·무월경"; }
    // obgyn v1.1 신규 — 조기난소부전 (난임·갱년기보다 우선)
    else if (text.includes("조기난소부전") || text.includes("이른폐경") || text.includes("이른 폐경") || (text.includes("폐경") && (text.includes("30대") || text.includes("40대초") || text.includes("조기"))) || (text.includes("난소") && text.includes("나이"))) { treatmentId = "premature_menopause"; treatmentName = "이른 폐경·조기난소부전"; }
    else if (text.includes("난임") || text.includes("가임력") || text.includes("AMH"))                                                    { treatmentId = "fertility";          treatmentName = "난임·가임력 검사"; }
    // obgyn v1.1 신규 — 임신 중기·후기 (임신초기보다 우선)
    else if (text.includes("임신중기") || text.includes("임신 중기") || text.includes("임신후기") || text.includes("임신 후기") || text.includes("정밀초음파") || text.includes("기형아검사") || text.includes("임신성당뇨") || text.includes("NST검사") || text.includes("입체초음파") || (text.includes("임신") && (text.includes("24주") || text.includes("28주") || text.includes("36주")))) { treatmentId = "prenatal_late"; treatmentName = "임신 중기·후기 검진"; }
    else if (text.includes("임신초기") || text.includes("임신 초기") || text.includes("NT초음파") || (text.includes("임신") && text.includes("검진"))) { treatmentId = "prenatal"; treatmentName = "임신 초기 검진"; }
    // obgyn v1.1 신규 — 출산·분만
    else if (text.includes("자연분만") || text.includes("제왕절개") || text.includes("무통분만") || text.includes("출산후기") || (text.includes("분만") && !text.includes("진통의학"))) { treatmentId = "delivery"; treatmentName = "출산·분만"; }
    else if (text.includes("질염"))                                                                                                        { treatmentId = "vaginitis";          treatmentName = "질염"; }
    else if (text.includes("갱년기") && (text.includes("산부인과") || text.includes("폐경") || text.includes("HRT")))                    { treatmentId = "menopause";          treatmentName = "갱년기·폐경"; }
    else if (text.includes("미레나") || text.includes("루프") || (text.includes("피임") && !text.includes("한의원")))                    { treatmentId = "contraception";      treatmentName = "피임·루프 시술"; }
    else if (text.includes("자궁내막증") || text.includes("초콜릿낭종") || text.includes("초콜릿 낭종"))                                  { treatmentId = "endometriosis";      treatmentName = "자궁내막증"; }
    else if ((text.includes("HPV") && text.includes("백신")) || text.includes("가다실") || text.includes("서바릭스"))                    { treatmentId = "hpv_vaccine";        treatmentName = "HPV 백신"; }
    else if (text.includes("유방초음파") || text.includes("유방 초음파") || text.includes("유방멍울") || text.includes("유방 멍울"))      { treatmentId = "breast_us";          treatmentName = "유방 초음파·멍울"; }
    else if (text.includes("다낭성난소") || text.includes("다낭성 난소") || text.includes("PCOS"))                                        { treatmentId = "pcos";               treatmentName = "다낭성 난소 증후군"; }
    // obgyn v1.1 신규 — 요실금·골반저 (비뇨기과 요실금과 분리)
    else if ((text.includes("요실금") && (text.includes("산부인과") || text.includes("출산후") || text.includes("출산 후") || text.includes("골반저") || text.includes("케겔") || text.includes("여성"))) || text.includes("골반장기탈출") || text.includes("골반저치료") || text.includes("TOT수술") || text.includes("TVT수술")) { treatmentId = "urinary_incontinence"; treatmentName = "요실금·골반저 치료"; }
    // obgyn v1.1 신규 — 부인과 정기 초음파 검진
    else if (text.includes("부인과초음파") || text.includes("부인과 초음파") || text.includes("자궁초음파") || text.includes("질초음파") || (text.includes("부인과") && text.includes("정기검진"))) { treatmentId = "pelvic_us"; treatmentName = "부인과 초음파 정기검진"; }
    else if (text.includes("소음순") || text.includes("콘딜로마") || text.includes("외음부"))                                             { treatmentId = "vulvar";             treatmentName = "외음부 질환·소음순"; }
    else if (text.includes("자궁경부이형성증") || text.includes("자궁경부 이형성증") || text.includes("CIN") || text.includes("LEEP"))    { treatmentId = "cervical_dysplasia"; treatmentName = "자궁경부 이형성증"; }
    else if (text.includes("BCG") || text.includes("DTaP") || text.includes("MMR") || (text.includes("예방접종") && (text.includes("개월") || text.includes("신생아") || text.includes("스케줄")))) { treatmentId = "vaccination"; treatmentName = "영유아 예방접종"; }
    // pain 치료 인식
    else if ((text.includes("허리디스크") || text.includes("허리") && text.includes("신경차단")) && text.includes("통증의학과")) { treatmentId = "lumbar_nerve_block";      treatmentName = "허리디스크 신경차단술"; }
    else if ((text.includes("목디스크") || text.includes("목") && text.includes("신경차단")) && text.includes("통증의학과"))   { treatmentId = "cervical_nerve_block";   treatmentName = "목디스크 신경차단술"; }
    else if (text.includes("척추관협착증") && text.includes("통증의학과"))                                                    { treatmentId = "spinal_stenosis_pain";   treatmentName = "척추관협착증 시술"; }
    else if (text.includes("프롤로") && text.includes("통증의학과"))                                                           { treatmentId = "prolotherapy_pain";      treatmentName = "프롤로 주사"; }
    else if (text.includes("PRP") && text.includes("통증의학과"))                                                             { treatmentId = "prp_pain";               treatmentName = "PRP 주사"; }
    else if (text.includes("도수치료") && text.includes("통증의학과"))                                                         { treatmentId = "manual_therapy_pain";    treatmentName = "도수치료"; }
    else if (text.includes("체외충격파") && text.includes("통증의학과"))                                                       { treatmentId = "shockwave_pain";         treatmentName = "체외충격파"; }
    else if ((text.includes("무릎") && text.includes("관절주사")) || (text.includes("무릎") && text.includes("히알루론산")))   { treatmentId = "knee_injection";         treatmentName = "무릎 관절 주사"; }
    else if ((text.includes("어깨") && text.includes("주사")) && text.includes("통증의학과"))                                  { treatmentId = "shoulder_injection";     treatmentName = "어깨 주사 치료"; }
    else if (text.includes("오십견") && text.includes("수압팽창"))                                                             { treatmentId = "frozen_shoulder";        treatmentName = "오십견 수압팽창술"; }
    else if (text.includes("고주파") && (text.includes("열응고") || text.includes("통증의학과")))                              { treatmentId = "radiofrequency_ablation"; treatmentName = "고주파 열응고술"; }
    else if (text.includes("두통") && text.includes("신경차단"))                                                               { treatmentId = "headache_nerve_block";   treatmentName = "두통 신경차단"; }
    else if (text.includes("대상포진") && text.includes("신경통"))                                                             { treatmentId = "postherpetic_neuralgia"; treatmentName = "대상포진 후 신경통"; }
    else if (text.includes("족저근막") && text.includes("통증의학과"))                                                         { treatmentId = "plantar_fasciitis_pain"; treatmentName = "족저근막염 치료"; }
    else if (text.includes("IMS") || text.includes("트리거포인트"))                                                            { treatmentId = "ims_trigger";            treatmentName = "근막통증 IMS 치료"; }
    else if (text.includes("꼬리뼈") || text.includes("미골"))                                                                 { treatmentId = "coccyx_pelvic_pain";     treatmentName = "꼬리뼈·골반 통증 치료"; }
    else if ((text.includes("테니스엘보") || text.includes("손목건초염")) && text.includes("통증의학과"))                      { treatmentId = "wrist_elbow_pain";       treatmentName = "손목·팔꿈치 통증 치료"; }
    else if (text.includes("경추성") && text.includes("통증의학과"))                                                           { treatmentId = "cervicogenic_pain";      treatmentName = "경추성 어깨·목 통증"; }
    else if (text.includes("발목인대") && text.includes("통증의학과"))                                                         { treatmentId = "ankle_pain";             treatmentName = "발목 인대 손상 치료"; }
    else if (text.includes("신경병증") || text.includes("신경통") && text.includes("통증의학과"))                              { treatmentId = "neuropathic_pain";       treatmentName = "신경병증성 통증"; }
    else if (text.includes("암성통증") || text.includes("암성 통증"))                                                          { treatmentId = "cancer_pain";            treatmentName = "암성 통증 관리"; }
    // pain v1.1 신규 — 신경성형술·만성통증·TMD·섬유근육통·좌골신경통·줄기세포
    else if ((text.includes("신경성형술") || text.includes("PEN시술") || text.includes("PEN 시술") || text.includes("신경유착박리")) && (text.includes("통증의학과") || text.includes("디스크"))) { treatmentId = "nerve_plasty"; treatmentName = "신경성형술(PEN)"; }
    else if ((text.includes("만성요통") || text.includes("만성통증") || text.includes("난치성통증") || text.includes("통증클리닉")) && !text.includes("한의원") && !text.includes("정신")) { treatmentId = "chronic_pain"; treatmentName = "만성요통·만성통증 클리닉"; }
    else if (text.includes("턱관절") || text.includes("TMD") || (text.includes("턱") && (text.includes("딱딱거림") || text.includes("개구장애") || text.includes("통증")))) { treatmentId = "tmd"; treatmentName = "턱관절 통증치료(TMD)"; }
    else if (text.includes("섬유근육통") || text.includes("전신통증") || (text.includes("만성") && text.includes("전신통증"))) { treatmentId = "fibromyalgia"; treatmentName = "섬유근육통"; }
    else if (text.includes("좌골신경통") || text.includes("이상근증후군") || (text.includes("엉덩이") && (text.includes("저림") || text.includes("당김")))) { treatmentId = "sciatica"; treatmentName = "좌골신경통 치료"; }
    else if ((text.includes("무릎줄기세포") || text.includes("연골재생") || text.includes("자가줄기세포") || text.includes("카티스템")) && !text.includes("정형외과")) { treatmentId = "stem_cell_knee"; treatmentName = "무릎 줄기세포·연골재생"; }
    // oriental 치료 인식
    // [v-oriental] 도수치료는 oriental 영역 아님(핸들러 400 차단) → ortho/pain으로만 라우팅
    else if (text.includes("도수치료"))                                                                                     { treatmentId = text.includes("통증의학") ? "manual_therapy_pain" : "manual_therapy_ortho"; treatmentName = "도수치료"; }
    else if (text.includes("추나"))                                                                                         { treatmentId = "chuna";               treatmentName = "추나요법"; }
    else if (text.includes("한방다이어트") || text.includes("한방 다이어트") || text.includes("마운자로") && text.includes("한")) { treatmentId = "oriental_diet";    treatmentName = "한방다이어트"; }
    else if (text.includes("출산후다이어트") || text.includes("출산 후 다이어트"))                                          { treatmentId = "oriental_diet";       treatmentName = "한방다이어트"; }
    else if (text.includes("침치료") || (text.includes("침") && text.includes("한의원")))                                  { treatmentId = "acupuncture";         treatmentName = "침치료"; }
    else if (text.includes("한약") && !text.includes("다이어트") && !text.includes("산후") && !text.includes("갱년기"))    { treatmentId = "herbal_medicine";     treatmentName = "한약처방"; }
    else if (text.includes("공진단"))                                                                                       { treatmentId = "gongjindan";          treatmentName = "공진단처방"; }
    else if (text.includes("부항"))                                                                                         { treatmentId = "cupping";             treatmentName = "부항치료"; }
    else if (text.includes("뜸"))                                                                                           { treatmentId = "moxibustion";         treatmentName = "뜸치료"; }
    else if (text.includes("산후") && text.includes("한"))                                                                  { treatmentId = "postpartum";          treatmentName = "산후한방치료"; }
    else if (text.includes("아토피") || (text.includes("피부") && text.includes("한의원") && !text.includes("성형")))      { treatmentId = "skin_disease";        treatmentName = "한방피부질환치료"; }
    else if ((text.includes("기미") || text.includes("흑자")) && text.includes("한의원"))                                  { treatmentId = "skin_disease";        treatmentName = "한방피부질환치료"; }
    else if (text.includes("갱년기"))                                                                                       { treatmentId = "menopause";           treatmentName = "갱년기한약치료"; }
    else if (text.includes("담적") || text.includes("소화불량") && text.includes("한") || text.includes("역류성식도염") && text.includes("한")) { treatmentId = "digestive"; treatmentName = "소화기한방치료"; }
    else if ((text.includes("면역") || text.includes("감기") || text.includes("비염")) && text.includes("한의원"))         { treatmentId = "immunity";            treatmentName = "면역한방치료"; }
    else if (text.includes("구안와사") || text.includes("안면마비"))                                                        { treatmentId = "facial_palsy";        treatmentName = "구안와사치료"; }
    else if (text.includes("중풍") || text.includes("뇌졸중"))                                                             { treatmentId = "stroke_rehab";        treatmentName = "중풍재활치료"; }
    else if (text.includes("교통사고") && (text.includes("한") || text.includes("한의원")))                                { treatmentId = "traffic_accident";    treatmentName = "교통사고한방치료"; }
    else if ((text.includes("무릎") || text.includes("관절") || text.includes("퇴행")) && text.includes("한"))             { treatmentId = "joint";               treatmentName = "관절한방치료"; }
    else if (text.includes("체외충격파") && !text.includes("비뇨"))                                                        { treatmentId = "shockwave_oriental";  treatmentName = "체외충격파치료"; }
    // oriental v1.3 신규 추가 — 이명·불면·생리·난임·두통·소아
    else if (text.includes("이명") || text.includes("난청") || text.includes("귀울림"))                                    { treatmentId = "tinnitus";            treatmentName = "이명난청치료"; }
    else if (text.includes("불면") && (text.includes("한") || text.includes("한의원") || text.includes("한방")))           { treatmentId = "insomnia";            treatmentName = "불면증한방치료"; }
    else if ((text.includes("수면장애") || text.includes("잠") && text.includes("못")) && text.includes("한"))             { treatmentId = "insomnia";            treatmentName = "불면증한방치료"; }
    else if ((text.includes("생리통") || text.includes("생리불순") || text.includes("PMS") || text.includes("생리전증후군")) && !text.includes("산부인과")) { treatmentId = "menstrual"; treatmentName = "생리통한방치료"; }
    else if ((text.includes("난임") || text.includes("임신준비") || text.includes("시험관") && text.includes("한")) && !text.includes("산부인과")) { treatmentId = "fertility"; treatmentName = "난임한방치료"; }
    else if ((text.includes("편두통") || text.includes("두통")) && (text.includes("한의원") || text.includes("한방")) && !text.includes("신경외과")) { treatmentId = "headache"; treatmentName = "두통한방치료"; }
    else if ((text.includes("틱") || text.includes("ADHD") || text.includes("키크는") || text.includes("성장한약") || text.includes("소아") && text.includes("한")) && !text.includes("정신건강")) { treatmentId = "pediatric"; treatmentName = "소아한방치료"; }
    // derma 시술 인식
    // derma v1.1 신규 — 여드름 흉터·PDT (여드름·모공·흉터보다 우선)
    else if (text.includes("여드름흉터") || text.includes("여드름 흉터") || text.includes("서브시전") || (text.includes("흉터") && (text.includes("치료") || text.includes("피부과")))) { treatmentId = "acne_scar"; treatmentName = "여드름 흉터 치료"; }
    else if (text.includes("PDT") || text.includes("광역동") || (text.includes("여드름") && text.includes("PDT")))                                                                       { treatmentId = "pdt"; treatmentName = "PDT 광역동 치료"; }
    // derma v1.1 신규 — 포텐자 (모공·흉터보다 우선)
    else if (text.includes("포텐자") || text.includes("마이크로니들RF") || text.includes("마이크로니들 RF"))                                                                            { treatmentId = "potenza"; treatmentName = "포텐자"; }
    else if (text.includes("여드름") && (text.includes("피부과") || text.includes("치료") || text.includes("압출") || text.includes("레이저"))) { treatmentId = "acne";           treatmentName = "여드름 치료"; }
    else if (text.includes("레이저토닝") || (text.includes("토닝") && text.includes("레이저")))                                              { treatmentId = "toning";         treatmentName = "레이저토닝"; }
    else if (text.includes("피코레이저") || text.includes("피코") && text.includes("레이저"))                                               { treatmentId = "pico";           treatmentName = "피코레이저"; }
    else if (text.includes("기미") && (text.includes("피부과") || text.includes("레이저") || text.includes("치료")))                         { treatmentId = "melasma";        treatmentName = "기미 치료"; }
    else if (text.includes("색소") && text.includes("레이저"))                                                                               { treatmentId = "pigment";        treatmentName = "색소 레이저"; }
    // derma v1.1 신규 — 다한증 보톡스 (일반 보톡스보다 우선)
    else if (text.includes("다한증") || (text.includes("보톡스") && (text.includes("겨드랑이") || text.includes("땀") || text.includes("다한증"))))                                  { treatmentId = "botox_hyperhidrosis"; treatmentName = "다한증 보톡스"; }
    else if (text.includes("보톡스") && (text.includes("피부과") || text.includes("주름") || text.includes("사각턱") || text.includes("팔자"))) { treatmentId = "botox_derma";   treatmentName = "보톡스"; }
    else if (text.includes("필러") && (text.includes("피부과") || text.includes("볼륨") || text.includes("코") || text.includes("입술")))    { treatmentId = "filler_derma";   treatmentName = "필러"; }
    // derma v1.1 신규 — 인모드 (리프팅 매칭보다 우선)
    else if (text.includes("인모드") || text.includes("인모드FX") || (text.includes("RF리프팅") && !text.includes("울쎄라")))                                                          { treatmentId = "inmode"; treatmentName = "인모드"; }
    else if (text.includes("리프팅") && (text.includes("피부과") || text.includes("울쎄라") || text.includes("슈링크") || text.includes("HIFU"))) { treatmentId = "lifting_derma"; treatmentName = "피부 리프팅"; }
    else if (text.includes("모발이식") || text.includes("탈모") && (text.includes("피부과") || text.includes("치료") || text.includes("주사"))) { treatmentId = "hair";          treatmentName = "탈모 치료"; }
    // derma v1.1 신규 — 건선 (아토피보다 우선)
    else if (text.includes("건선") && !text.includes("한의원"))                                                                                                                          { treatmentId = "psoriasis"; treatmentName = "건선 치료"; }
    else if (text.includes("아토피") && (text.includes("피부과") || text.includes("피부")) && !text.includes("한의원"))                     { treatmentId = "atopy_derma";    treatmentName = "아토피 피부염"; }
    else if ((text.includes("모공") || text.includes("흉터")) && text.includes("레이저"))                                                   { treatmentId = "pore";           treatmentName = "모공·흉터 레이저"; }
    else if (text.includes("IPL") || text.includes("광치료"))                                                                                { treatmentId = "ipl";            treatmentName = "IPL 광치료"; }
    else if (text.includes("스킨부스터") || text.includes("물광주사") || text.includes("쥬베룩") || text.includes("리쥬란"))                  { treatmentId = "skin_booster";   treatmentName = "스킨부스터"; }
    else if (text.includes("피부과") && (text.includes("후기") || text.includes("상담") || text.includes("치료")))                          { treatmentId = "acne";           treatmentName = "피부과 시술"; }
    // 추가 derma 시술 인식
    else if (text.includes("울쎄라"))                                                                                                         { treatmentId = "ulthera";        treatmentName = "울쎄라"; }
    else if (text.includes("써마지"))                                                                                                         { treatmentId = "thermage";       treatmentName = "써마지"; }
    else if (text.includes("슈링크"))                                                                                                         { treatmentId = "shurink";        treatmentName = "슈링크"; }
    else if (text.includes("실리프팅"))                                                                                                       { treatmentId = "silhouette_lift"; treatmentName = "실리프팅"; }
    else if (text.includes("콜소닉") || text.includes("울리지오"))                                                                           { treatmentId = "kolsonik";       treatmentName = "콜소닉·울리지오"; }
    else if (text.includes("쥬베룩") || (text.includes("리쥬란") && text.includes("힐러")))                                                  { treatmentId = "juvelook";       treatmentName = "쥬베룩·리쥬란"; }
    else if (text.includes("레이저제모") || text.includes("제모") && text.includes("레이저") || text.includes("영구제모"))                   { treatmentId = "laser_hair_removal"; treatmentName = "레이저 제모"; }
    else if (text.includes("점빼기") || text.includes("점 빼기") || (text.includes("검버섯") && text.includes("레이저")))                    { treatmentId = "mole_removal";   treatmentName = "점 빼기·검버섯"; }
    else if (text.includes("블랙헤드") && text.includes("피부과"))                                                                           { treatmentId = "bb_glow";        treatmentName = "블랙헤드·각질 관리"; }
    else if (text.includes("뽀띠성형") || text.includes("윤곽주사"))                                                                         { treatmentId = "bbtopping";      treatmentName = "뽀띠성형·윤곽주사"; }
    else if ((text.includes("PRP") || text.includes("자가혈")) && text.includes("피부"))                                                     { treatmentId = "prp";            treatmentName = "PRP·자가혈 시술"; }
    // neuro 진료 인식 — 신경외과 명시 키워드와 함께 들어왔을 때만 잡아 정형/통증/한의원과 충돌 방지
    else if (text.includes("허리디스크") && text.includes("신경외과"))                                                                       { treatmentId = "neuro_disc";       treatmentName = "허리디스크"; }
    else if ((text.includes("척추관협착증") || text.includes("협착증")) && text.includes("신경외과"))                                         { treatmentId = "neuro_stenosis";   treatmentName = "척추관협착증"; }
    else if ((text.includes("목디스크") || text.includes("경추디스크")) && text.includes("신경외과"))                                         { treatmentId = "neuro_neckdisc";   treatmentName = "목디스크"; }
    else if (text.includes("척추압박골절") || text.includes("압박골절"))                                                                       { treatmentId = "neuro_compfx";     treatmentName = "척추압박골절"; }
    else if (text.includes("만성두통") && text.includes("신경외과"))                                                                          { treatmentId = "neuro_headache";   treatmentName = "만성두통"; }
    else if (text.includes("편두통") && text.includes("신경외과"))                                                                            { treatmentId = "neuro_migraine";   treatmentName = "편두통"; }
    else if (text.includes("삼차신경통"))                                                                                                      { treatmentId = "neuro_trigeminal"; treatmentName = "삼차신경통"; }
    else if (text.includes("후두신경통"))                                                                                                      { treatmentId = "neuro_occipital";  treatmentName = "후두신경통"; }
    else if (text.includes("군발성두통") || text.includes("군발두통"))                                                                          { treatmentId = "neuro_cluster";    treatmentName = "군발성두통"; }
    else if (text.includes("신경차단술") && text.includes("신경외과") && !text.includes("통증의학과"))                                          { treatmentId = "neuro_block";      treatmentName = "신경차단술"; }
    else if (text.includes("신경성형술") || text.includes("경막외신경성형"))                                                                  { treatmentId = "neuro_neuroplasty"; treatmentName = "경막외신경성형술"; }
    else if (text.includes("고주파신경치료") || (text.includes("고주파") && text.includes("신경외과")))                                        { treatmentId = "neuro_rfa";        treatmentName = "고주파신경치료"; }
    else if (text.includes("FIMS시술") || (text.includes("FIMS") && text.includes("신경외과")))                                                { treatmentId = "neuro_fims";       treatmentName = "FIMS시술"; }
    else if (text.includes("체외충격파") && text.includes("신경외과"))                                                                         { treatmentId = "neuro_eswt";       treatmentName = "체외충격파(신경통증)"; }
    else if (text.includes("수근관증후군") && text.includes("신경외과"))                                                                       { treatmentId = "neuro_carpal";     treatmentName = "수근관증후군"; }
    else if (text.includes("척골신경") || (text.includes("팔꿈치터널") && text.includes("신경외과")))                                          { treatmentId = "neuro_ulnar";      treatmentName = "척골신경포착증후군"; }
    else if (text.includes("말초신경병증") || (text.includes("당뇨신경병증") && text.includes("신경외과")))                                    { treatmentId = "neuro_peripheral"; treatmentName = "말초신경병증"; }
    else if ((text.includes("어지럼") || text.includes("현훈")) && text.includes("신경외과"))                                                  { treatmentId = "neuro_dizzy";      treatmentName = "어지럼증"; }
    else if (text.includes("뇌MRI") || text.includes("뇌검진") || text.includes("뇌혈관검사"))                                                 { treatmentId = "neuro_brainmri";   treatmentName = "뇌MRI검진"; }
    else if (text.includes("안면경련") || (text.includes("얼굴떨림") && text.includes("신경외과")))                                            { treatmentId = "neuro_facialspasm"; treatmentName = "안면경련"; }
    else if ((text.includes("이명") || text.includes("귀울림")) && text.includes("신경외과"))                                                   { treatmentId = "neuro_tinnitus";   treatmentName = "이명·신경성귀울림"; }
    else if ((text.includes("기억력") || text.includes("건망증") || text.includes("인지기능")) && text.includes("신경외과"))                    { treatmentId = "neuro_memory";     treatmentName = "기억력저하·인지검사"; }
    else if (text.includes("척추수술후") || text.includes("FBSS") || (text.includes("수술후통증") && text.includes("신경외과")))                 { treatmentId = "neuro_fbss";       treatmentName = "척추수술후증후군"; }
    else if (text.includes("좌골신경통") || (text.includes("엉덩이통증") && text.includes("신경외과")))                                          { treatmentId = "neuro_sciatica";   treatmentName = "좌골신경통"; }
    // psy 진료 인식 — [V2 교체 2026-07-13] 22종(후기형·비급여 프로그램) → 14종(정보형 decisionAxis)
    //   ★ _isPsy() 한정자 필수 — "우울/불안/불면/집중/번아웃"은 일반 생활어·타 업종 후기에 광범위 등장.
    //   ★ 폐기 8종: CBT·rTMS·뉴로피드백·EMDR·MBCT(비급여 프로그램 광고) / 트라우마·관계·애도·분노조절(비급여)
    //              / 청소년·중년·노인·산후(연령 대상일 뿐 진단축 아님. 산후는 obgyn 경계 저촉)
    //   더 긴 키워드를 먼저, 짧은 키워드를 나중에.
    // ── 검사 (exam 5) ──
    else if (text.includes("종합심리검사") || (text.includes("심리검사") && !text.includes("주의력") && !text.includes("기질")))                { treatmentId = "psy_test_full";       treatmentName = "종합심리검사"; }
    else if (text.includes("정서상태검사") || ((text.includes("정서검사") || text.includes("기분검사")) && _isPsy(text)))                        { treatmentId = "psy_test_mood";       treatmentName = "정서상태검사"; }
    else if (text.includes("주의력검사") || ((text.includes("집중력검사") || text.includes("주의집중검사")) && _isPsy(text)))                    { treatmentId = "psy_test_attention";  treatmentName = "주의력검사"; }
    else if (text.includes("기질성격검사") || (text.includes("성격검사") && _isPsy(text)) || text.includes("TCI"))                               { treatmentId = "psy_test_temperament"; treatmentName = "기질성격검사"; }
    else if (text.includes("스트레스반응검사") || ((text.includes("스트레스검사") || text.includes("스트레스 검사")) && _isPsy(text)))            { treatmentId = "psy_test_stress";     treatmentName = "스트레스반응검사"; }
    // ── 질환 (disease 9) ──
    else if (text.includes("강박장애") || text.includes("강박증") || text.includes("OCD"))                                                       { treatmentId = "psy_ocd";             treatmentName = "강박장애"; }
    else if (text.includes("사회불안장애") || text.includes("사회불안") || text.includes("사회공포") || text.includes("발표불안") || text.includes("대인기피")) { treatmentId = "psy_social";  treatmentName = "사회불안장애"; }
    else if (text.includes("공황장애") || (text.includes("공황") && _isPsy(text)))                                                                { treatmentId = "psy_panic";           treatmentName = "공황장애"; }
    else if (text.includes("아동ADHD") || text.includes("아동 ADHD") || (text.includes("ADHD") && (text.includes("아동") || text.includes("초등") || text.includes("어린이") || text.includes("아이")))) { treatmentId = "psy_child_adhd"; treatmentName = "아동ADHD"; }
    else if (text.includes("성인ADHD") || text.includes("성인 ADHD") || text.includes("ADHD"))                                                    { treatmentId = "psy_adhd";            treatmentName = "성인ADHD"; }
    else if (text.includes("불안장애") || (text.includes("불안") && _isPsy(text)))                                                                { treatmentId = "psy_anxiety";         treatmentName = "불안장애"; }
    else if (text.includes("우울증") || (text.includes("우울") && _isPsy(text)))                                                                  { treatmentId = "psy_depression";      treatmentName = "우울증"; }
    else if (text.includes("번아웃") || text.includes("소진증후군"))                                                                              { treatmentId = "psy_burnout";         treatmentName = "번아웃"; }
    else if (text.includes("불면증") && !text.includes("한의원") && !text.includes("한방"))                                                       { treatmentId = "psy_insomnia";        treatmentName = "불면증"; }
    // eye 진료 인식 — 안과/안과수술/시력 명시 키워드와 함께 들어왔을 때만 잡아 다른 업종과 충돌 방지
    else if (text.includes("스마일라식") || (text.includes("스마일") && text.includes("라식")))                                                  { treatmentId = "smile_lasik";     treatmentName = "스마일라식"; }
    else if (text.includes("렌즈교환술") || text.includes("RLE") || (text.includes("다초점") && text.includes("인공수정체")))                    { treatmentId = "rle";             treatmentName = "렌즈교환술(RLE)"; }
    else if (text.includes("라식"))                                                                                                                { treatmentId = "lasik";           treatmentName = "라식"; }
    else if (text.includes("라섹"))                                                                                                                { treatmentId = "lasek";           treatmentName = "라섹"; }
    else if (text.includes("ICL") || text.includes("안내렌즈삽입") || text.includes("안내렌즈 삽입") || (text.includes("고도근시") && text.includes("수술"))) { treatmentId = "icl";             treatmentName = "안내렌즈삽입술"; }
    else if (text.includes("백내장"))                                                                                                              { treatmentId = "cataract";        treatmentName = "백내장 수술"; }
    else if (text.includes("노안") && (text.includes("교정") || text.includes("수술") || text.includes("다초점") || text.includes("안과")))      { treatmentId = "presbyopia";      treatmentName = "노안 교정"; }
    else if (text.includes("황반변성"))                                                                                                            { treatmentId = "macular";         treatmentName = "황반변성"; }
    else if (text.includes("당뇨망막") || (text.includes("당뇨") && text.includes("망막")))                                                       { treatmentId = "diabetic_retina"; treatmentName = "당뇨망막병증"; }
    else if (text.includes("녹내장") || (text.includes("안압") && text.includes("안과")))                                                         { treatmentId = "glaucoma";        treatmentName = "녹내장"; }
    else if (text.includes("비문증") || text.includes("날파리증") || (text.includes("눈") && text.includes("점") && text.includes("떠다")))    { treatmentId = "floaters";       treatmentName = "비문증"; }
    else if (text.includes("드림렌즈") || text.includes("OK렌즈") || text.includes("각막굴절교정렌즈"))                                          { treatmentId = "dream_lens";     treatmentName = "드림렌즈"; }
    else if (text.includes("망막") && (text.includes("안과") || text.includes("검진") || text.includes("비문증")))                                { treatmentId = "retina";          treatmentName = "망막 질환"; }
    else if (text.includes("안구건조") || (text.includes("건조") && text.includes("눈")) || (text.includes("IPL") && text.includes("안과")))      { treatmentId = "dry_eye";         treatmentName = "안구건조증"; }
    else if (text.includes("익상편") || text.includes("군날개"))                                                                                   { treatmentId = "pterygium";       treatmentName = "익상편 수술"; }
    else if (text.includes("결막염") || text.includes("알레르기성결막염") || text.includes("유행성결막염"))                                       { treatmentId = "conjunctivitis";  treatmentName = "결막염"; }
    else if (text.includes("다래끼") || (text.includes("눈꺼풀") && text.includes("염")))                                                          { treatmentId = "stye";            treatmentName = "다래끼·눈꺼풀염"; }
    else if (text.includes("사시") && (text.includes("안과") || text.includes("교정") || text.includes("수술") || text.includes("아이")))         { treatmentId = "strabismus";      treatmentName = "사시 교정"; }
    else if (text.includes("드림렌즈") || text.includes("아트로핀") || (text.includes("근시") && text.includes("억제")))                          { treatmentId = "myopia_control";  treatmentName = "근시 진행 억제"; }
    else if (text.includes("약시") || text.includes("가림치료"))                                                                                   { treatmentId = "amblyopia";       treatmentName = "약시 치료"; }
    else if (text.includes("콘택트렌즈") || text.includes("하드렌즈") || (text.includes("소프트렌즈") && text.includes("안과")) || (text.includes("렌즈") && text.includes("처방"))) { treatmentId = "contact_lens";    treatmentName = "콘택트렌즈 처방"; }
    else if (text.includes("안저검사") || (text.includes("안과") && text.includes("정밀검진")) || (text.includes("안과") && text.includes("검진"))) { treatmentId = "eye_checkup";     treatmentName = "안과 정밀검진"; }
    // ★ [family V2 재설계 2026-07-14] 진료 인식 — 14종(exam5/disease9). 병원군 표준 정합.
    //   제외: 복통·소화불량·설사변비(gastro 경계) / 발열(응급 경계) / 체중관리(비급여 경계)
    //   name = family-v2-data.js FAMILY_V2_TREATMENTS.name 과 1:1 (SoT 일치 필수)
    //   순서 주의: 국가건강검진→건강검진 / 기침→감기 (부분문자열 선점 방지)
    // ── 검진 (exam) ──
    else if (_isFamily(text) && (text.includes("국가건강검진") || text.includes("국가검진") || text.includes("공단검진")))                   { treatmentId = "national_checkup"; treatmentName = "국가건강검진"; }
    else if (_isFamily(text) && (text.includes("검진결과") || text.includes("결과상담") || text.includes("건강상담")))                        { treatmentId = "checkup_consult";  treatmentName = "검진결과상담"; }
    else if (_isFamily(text) && (text.includes("정기검사") || text.includes("혈액검사") || text.includes("수치확인")))                        { treatmentId = "chronic_lab";      treatmentName = "만성질환 정기검사"; }
    else if (_isFamily(text) && (text.includes("건강검진") || text.includes("종합검진") || text.includes("정기검진")))                        { treatmentId = "checkup";          treatmentName = "건강검진"; }
    // ── 예방접종 (exam) ──
    else if (_isFamily(text) && (text.includes("예방접종") || text.includes("백신") || text.includes("대상포진") || text.includes("독감")))    { treatmentId = "vaccination";      treatmentName = "예방접종"; }
    // ── 만성질환 (disease) ──
    else if (_isFamily(text) && (text.includes("고혈압") || text.includes("혈압")))                                                          { treatmentId = "hypertension";     treatmentName = "고혈압"; }
    else if (_isFamily(text) && (text.includes("당뇨") || text.includes("혈당")))                                                            { treatmentId = "diabetes";         treatmentName = "당뇨"; }
    else if (_isFamily(text) && (text.includes("고지혈증") || text.includes("콜레스테롤") || text.includes("지질")))                          { treatmentId = "dyslipidemia";     treatmentName = "고지혈증"; }
    // ── 감기·호흡기 (disease) ──
    else if (_isFamily(text) && (text.includes("기침") || text.includes("인후")))                                                            { treatmentId = "cough";            treatmentName = "오래가는 기침"; }
    else if (_isFamily(text) && (text.includes("감기") || text.includes("몸살") || text.includes("환절기")))                                  { treatmentId = "cold";             treatmentName = "감기·몸살"; }
    // ── 생활증상 (disease) ──
    else if (_isFamily(text) && (text.includes("만성피로") || text.includes("피로") || text.includes("활력")))                                { treatmentId = "fatigue";          treatmentName = "만성피로"; }
    else if (_isFamily(text) && (text.includes("어지럼") || text.includes("현기증")))                                                        { treatmentId = "dizziness";        treatmentName = "어지럼"; }
    else if (_isFamily(text) && (text.includes("두통") || text.includes("머리아픔")))                                                        { treatmentId = "headache";         treatmentName = "두통"; }
    else if (_isFamily(text) && (text.includes("수면") || text.includes("불면") || text.includes("잠")))                                      { treatmentId = "sleep";            treatmentName = "수면 문제"; }
    // ─── 카페·디저트 (v2 메뉴 중심 재설계 2026-06-28) ───
    //   업체 카드 8개 폐기 → 메뉴 중심. treatmentName = 카드 id (name='카페' 중복 → id로 카드 특정)
    //   계열: 커피(아메리카노·라떼) / 디저트(크로플·케이크) / 브런치. promotionMenus 5종 = 생성 카드.
    //   구체 메뉴명 우선 → 일반어 차단. 미지정 시 계열 대표로 폴백.
    else if (text.includes("아메리카노"))                                                              { treatmentId = "cafe_coffee_americano_hongdae_01"; treatmentName = "cafe_coffee_americano_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) — 말차라떼 (2026-06-28). '라떼' 커피분기가 "말차라떼" 선점 → 반드시 라떼 분기보다 앞.
    else if (text.includes("말차라떼") || text.includes("말차"))                                       { treatmentId = "cafe_drink_matchalatte_hongdae_01"; treatmentName = "cafe_drink_matchalatte_hongdae_01"; }
    else if (text.includes("카페라떼") || text.includes("라떼") || text.includes("바닐라라떼"))         { treatmentId = "cafe_coffee_latte_hongdae_01";     treatmentName = "cafe_coffee_latte_hongdae_01"; }
    else if (text.includes("콜드브루") || text.includes("디카페인") || text.includes("에스프레소") || text.includes("핸드드립") || text.includes("드립")) { treatmentId = "cafe_coffee_americano_hongdae_01"; treatmentName = "cafe_coffee_americano_hongdae_01"; }
    else if (text.includes("크로플"))                                                                  { treatmentId = "cafe_dessert_croffle_hongdae_01";  treatmentName = "cafe_dessert_croffle_hongdae_01"; }
    // [APPEND v2-ext] 디저트 경계 — 아포가토 (2026-06-28). 케이크('디저트' 광역어) 분기보다 앞.
    else if (text.includes("아포가토"))                                                               { treatmentId = "cafe_dessert_affogato_hongdae_01"; treatmentName = "cafe_dessert_affogato_hongdae_01"; }
    else if (text.includes("케이크") || text.includes("티라미수") || text.includes("치즈케이크") || text.includes("마카롱") || text.includes("쿠키") || text.includes("빙수") || text.includes("디저트")) { treatmentId = "cafe_dessert_cake_hongdae_01"; treatmentName = "cafe_dessert_cake_hongdae_01"; }
    // [APPEND v2-ext] 브런치 계열 — 아사이볼 (2026-06-28). 구체메뉴 우선, 브런치 일반분기 앞.
    else if (text.includes("아사이볼") || text.includes("아사이"))                                     { treatmentId = "cafe_brunch_acaibowl_hongdae_01"; treatmentName = "cafe_brunch_acaibowl_hongdae_01"; }
    else if (text.includes("브런치") || text.includes("샌드위치") || text.includes("베이글"))           { treatmentId = "cafe_brunch_brunch_hongdae_01";    treatmentName = "cafe_brunch_brunch_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) — 에이드 (2026-06-28). 구체 메뉴 우선, 일반 '카페' 폴백 앞.
    else if (text.includes("에이드"))                                                                 { treatmentId = "cafe_drink_ade_hongdae_01";        treatmentName = "cafe_drink_ade_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) — 밀크티 (2026-06-28). '라떼' 충돌 없음. 일반 '카페' 폴백 앞.
    else if (text.includes("밀크티"))                                                                 { treatmentId = "cafe_drink_milktea_hongdae_01";    treatmentName = "cafe_drink_milktea_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 허브티 (2026-06-28 세션3). 차 계열. '티'/'차' 단독 폴백 없어 충돌 없음. 일반 '카페' 폴백 앞.
    else if (text.includes("허브티"))                                                                 { treatmentId = "cafe_drink_herbtea_hongdae_01";    treatmentName = "cafe_drink_herbtea_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 과일차 (2026-06-28 세션4). 차 계열. '과일차'는 타 메뉴명 미포함 → 충돌 없음. 허브티 다음. 일반 '카페' 폴백 앞.
    else if (text.includes("과일차"))                                                                 { treatmentId = "cafe_drink_fruittea_hongdae_01";   treatmentName = "cafe_drink_fruittea_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 레몬티 (2026-06-28 세션4). 차 계열. '레몬티'는 타 메뉴명 미포함 → 충돌 없음. 과일차 다음. 일반 '카페' 폴백 앞.
    else if (text.includes("레몬티"))                                                                 { treatmentId = "cafe_drink_lemontea_hongdae_01";   treatmentName = "cafe_drink_lemontea_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 자몽티 (2026-06-28 세션4). 차 계열. '자몽티'는 타 메뉴명 미포함 → 충돌 없음. 레몬티 다음. 일반 '카페' 폴백 앞.
    else if (text.includes("자몽티"))                                                                 { treatmentId = "cafe_drink_grapefruittea_hongdae_01"; treatmentName = "cafe_drink_grapefruittea_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 핫초코 (2026-06-28 세션4). 코코아 단음료. '핫초코'는 타 메뉴명 미포함 → 충돌 없음. 자몽티 다음. 일반 '카페' 폴백 앞.
    else if (text.includes("핫초코"))                                                                 { treatmentId = "cafe_drink_hotchoco_hongdae_01";   treatmentName = "cafe_drink_hotchoco_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 아이스초코 (2026-06-28 세션4). 코코아 시원 단음료. 핫초코 alias 아님(독립 카드). '아이스초코'/'핫초코' 상호 미포함 → 순서 무관, 명확성 위해 핫초코 다음. 일반 '카페' 폴백 앞.
    else if (text.includes("아이스초코"))                                                             { treatmentId = "cafe_drink_icechoco_hongdae_01";   treatmentName = "cafe_drink_icechoco_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 스무디 (2026-06-28). '라떼' 충돌 없음. 일반 '카페' 폴백 앞.
    else if (text.includes("스무디"))                                                                 { treatmentId = "cafe_drink_smoothie_hongdae_01";   treatmentName = "cafe_drink_smoothie_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 프라푸치노 (2026-06-28 세션3). 프라페와 별개 카드/데이터. 프라페 분기보다 앞.
    else if (text.includes("프라푸치노"))                                                             { treatmentId = "cafe_drink_frappuccino_hongdae_01"; treatmentName = "cafe_drink_frappuccino_hongdae_01"; }
    // [APPEND v2-ext] 음료(drink) 신규 데이터 — 프라페 (2026-06-28). 커피베이스지만 cat=음료. 일반 '카페' 폴백 앞.
    else if (text.includes("프라페"))                                                                 { treatmentId = "cafe_drink_frappe_hongdae_01";     treatmentName = "cafe_drink_frappe_hongdae_01"; }
    // 일반 '카페' 미지정 시 — 커피 대표(아메리카노)로 폴백 (의료어 제외)
    else if (text.includes("카페") && !text.includes("치과") && !text.includes("병원") && !text.includes("의원")) { treatmentId = "cafe_coffee_americano_hongdae_01"; treatmentName = "cafe_coffee_americano_hongdae_01"; }
    // ─── 분식 (맵고분식 · 공릉동) — v132 순대국 fallback 차단 ───
    //   treatmentName = 카드 id. (name='이 분식집' 9종 중복 → name으론 카드 특정 불가. 하류 treatmentData.find가 t.id 매칭)
    //   구체 메뉴명 우선 → 일반어 차단. 꼬마김밥 2종은 키워드 분기, 미지정 시 참치마요 대표. 순대국(한식)은 별도 카드라 무영향.
    else if (text.includes("로제떡볶이") || text.includes("로제 떡볶이"))                                          { treatmentId = "rest_boonsik_rose_gongleung_01";         treatmentName = "rest_boonsik_rose_gongleung_01"; }
    else if (text.includes("떡볶이"))                                                                            { treatmentId = "rest_boonsik_tteokbokki_gongleung_01";    treatmentName = "rest_boonsik_tteokbokki_gongleung_01"; }
    else if (text.includes("매운어묵") && text.includes("김밥"))                                                  { treatmentId = "rest_boonsik_maeunkimbap_gongleung_01";   treatmentName = "rest_boonsik_maeunkimbap_gongleung_01"; }
    else if (text.includes("참치") && text.includes("김밥"))                                                      { treatmentId = "rest_boonsik_chamchikimbap_gongleung_01"; treatmentName = "rest_boonsik_chamchikimbap_gongleung_01"; }
    else if (text.includes("꼬마김밥") || text.includes("김밥"))                                                  { treatmentId = "rest_boonsik_chamchikimbap_gongleung_01"; treatmentName = "rest_boonsik_chamchikimbap_gongleung_01"; }
    else if (text.includes("모둠튀김") || text.includes("튀김"))                                                  { treatmentId = "rest_boonsik_twigim_gongleung_01";        treatmentName = "rest_boonsik_twigim_gongleung_01"; }
    else if (text.includes("찰순대") || (text.includes("순대") && !text.includes("순대국")))                       { treatmentId = "rest_boonsik_chalsundae_gongleung_01";    treatmentName = "rest_boonsik_chalsundae_gongleung_01"; }
    else if (text.includes("오뎅") || (text.includes("어묵") && !text.includes("김밥")))                          { treatmentId = "rest_boonsik_odeng_gongleung_01";         treatmentName = "rest_boonsik_odeng_gongleung_01"; }
    else if (text.includes("라면"))                                                                              { treatmentId = "rest_boonsik_ramen_gongleung_01";         treatmentName = "rest_boonsik_ramen_gongleung_01"; }
  }
  return { region: region || "", treatmentId, treatmentName }; // 강남 기본값 제거
}

// ============================================================
// 키워드 경쟁 분석 유틸
// ============================================================
const COMPETITION_LABEL = {
  "높음": { emoji: "🔴", text: "경쟁 높음",  desc: "상단 진입 어려움" },
  "중간": { emoji: "🟡", text: "경쟁 중간",  desc: "전략적 접근 필요" },
  "낮음": { emoji: "🟢", text: "경쟁 낮음",  desc: "상단 진입 유리" },
};
const TYPE_LABEL = {
  "롱테일": "📌 롱테일",
  "비교형": "⚖️ 비교형",
  "후기형": "📖 후기형",
  "정보형": "💡 정보형",
  "원본":   "🔤 원본 그대로",
};


// ============================================================
// 키워드 분석 결과 보드 (우측 패널)
// ============================================================
const COMP_COLOR = { 높음: "#E53935", 중간: "#F9A825", 낮음: "#43A047" };
const COMP_BG    = { 높음: "#FFF5F5", 중간: "#FFFDE7", 낮음: "#F1F8E9" };
const COMP_SCORE = { 높음: 5,         중간: 3,          낮음: 1 };

// ⚠️ [v131] DEAD CODE — AnalysisBoard(추천 글 방향 선택 화면).
//   v130에서 자동스킵 복구로 운영 플로우에서 분리됨. setStage("analysis") 진입 = 도달불가 폴백 1곳뿐.
//   판정: dead code 확정 · 운영 영향 0 · 사용자 진입 불가 · 실행 안 됨 · 버그 원인 아님.
//   조치: 삭제 보류(오픈 전 리팩터 묶음으로 이관). 신규 기능을 여기에 연결 금지.
//   관련 잔존(동일 보류): analysis 렌더분기(아래) / state selectedStrategyIdx·analysisData / coachStage "analysis".
function AnalysisBoard({ analysis, onSelect, selectedIdx, onSelectIdx }) {
  const setSelectedIdx = onSelectIdx; // 외부 state 연결
  const [regionInput, setRegionInput] = useState("");   // 대표지역
  const [subRegionInput, setSubRegionInput] = useState(""); // 생활권(선택)
  if (!analysis) return null;

  // 지역 입력 필요 단계 — 2단계(대표지역 + 생활권)
  if (analysis.needRegion && analysis.pendingSelection) {
    const s = analysis.pendingSelection;
    // 대표지역 + 생활권 결합 → 내부 region 문자열.
    //   [v122] 교통정보(역·출구·노선) 제거, 대표지역+동 1개만(제목·해시태그 오염 방지).
    const repTrim = regionInput.trim();
    const subTrim = subRegionInput.trim();
    const combinedRegion = cleanRegionForEngine(repTrim, subTrim).region || repTrim;
    const canSubmit = repTrim.length > 0;
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", background: "#f7f7fb" }}>
        <div style={{ background: "#fff", borderRadius: 14, border: "2px solid #9C27B0",
          padding: "20px 18px", boxShadow: "0 2px 12px rgba(123,31,162,.1)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9C27B0", marginBottom: 10 }}>
            📍 지역을 입력해주세요
          </div>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>
            선택한 방향: <strong>{s.keyword}</strong><br/>
            대표지역을 정하고, 동·역 등 생활권을 추가하면 더 정확히 반영됩니다.
          </div>

          {/* ── 1단계: 대표지역 ── */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "#7B1FA2", marginBottom: 6 }}>
            1. 대표지역 <span style={{ color: "#c00" }}>*</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {["강남","압구정","청담","서초","홍대","분당","수원","별내","동탄","인천","부산"].map(r => (
              <button key={r} onClick={() => setRegionInput(r)}
                style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 700,
                  border: regionInput === r ? "2px solid #9C27B0" : "1.5px solid #e0d0f0",
                  background: regionInput === r ? "#F3E5F5" : "#fff",
                  color: regionInput === r ? "#7B1FA2" : "#555",
                  cursor: "pointer", fontFamily: "inherit" }}>
                {r}
              </button>
            ))}
          </div>
          <input
            value={regionInput}
            onChange={e => setRegionInput(e.target.value)}
            placeholder="직접 입력 (예: 중랑구, 수원시, 해운대구)"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid #e0d0f0", fontFamily: "inherit",
              fontSize: 13, outline: "none", marginBottom: 16, boxSizing: "border-box" }}
          />

          {/* ── 2단계: 생활권(선택) ── */}
          <div style={{ fontSize: 11, fontWeight: 800, color: "#7B1FA2", marginBottom: 6 }}>
            2. 생활권 <span style={{ color: "#aaa", fontWeight: 600 }}>(선택 · 동/역)</span>
          </div>
          <input
            value={subRegionInput}
            onChange={e => setSubRegionInput(e.target.value)}
            placeholder="예: 공릉동(동), 정자역·강남역(지하철), 서면(번화가) — 비워도 됩니다"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10,
              border: "1.5px solid #e0d0f0", fontFamily: "inherit",
              fontSize: 13, outline: "none", marginBottom: 10, boxSizing: "border-box" }}
          />

          {/* 결합 미리보기 */}
          {canSubmit && (
            <div style={{ fontSize: 12, color: "#7B1FA2", marginBottom: 12,
              padding: "8px 12px", background: "#F3E5F5", borderRadius: 8 }}>
              적용될 지역: <strong>{combinedRegion}</strong>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { if (canSubmit) onSelect(s, combinedRegion); }}
              disabled={!canSubmit}
              style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: canSubmit
                  ? "linear-gradient(135deg,#7B1FA2,#CE93D8)" : "#e8e8ed",
                color: canSubmit ? "#fff" : "#aaa",
                fontSize: 13, fontWeight: 800, cursor: canSubmit ? "pointer" : "default",
                fontFamily: "inherit" }}>
              {canSubmit ? `${combinedRegion} 으로 작성` : "대표지역을 선택하세요"}
            </button>
            <button onClick={() => onSelect(s, null)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid #e0d0f0", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              이전으로
            </button>
          </div>
        </div>
      </div>
    );
  }
  const { keyword, competition, suggestions } = analysis;
  const color = COMP_COLOR[competition] || "#888";
  const bg    = COMP_BG[competition]    || "#fafafa";
  const score = COMP_SCORE[competition] || 3;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#f7f7fb", animation: "fadeIn .25s ease" }}>
    {/* 스크롤 영역 */}
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>

      {/* ── 입력 키워드 분석 카드 ── */}
      <div style={{ background: "#fff", borderRadius: 14, border: `2px solid ${color}`,
        padding: "18px 20px", marginBottom: 16,
        boxShadow: `0 3px 14px ${color}22` }}>

        <div style={{ fontSize: 17, fontWeight: 900, color: "#1a1a2e", marginBottom: 12, lineHeight: 1.4 }}>
          {keyword}
        </div>
        {/* 경쟁도 게이지 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: color }}>
              경쟁도 {competition}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#999" }}>{score}/5</span>
          </div>
          <div style={{ height: 10, background: "#f0ecf8", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(score/5)*100}%`,
              background: `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius: 6, transition: "width .4s ease" }} />
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8,
          background: bg, borderRadius: 9, padding: "12px 14px",
          border: `1px solid ${color}33` }}>
          {competition === "높음" && <>
            <strong style={{color}}>⚠️ 이 키워드는 경쟁이 매우 높습니다.</strong><br/>
            지금 그대로 작성하면 상단 노출이 어렵습니다.<br/>
            <span style={{color:"#7B1FA2",fontWeight:800}}>👇 아래 추천 글 방향으로 작성하면 노출 확률이 크게 올라갑니다.</span>
          </>}
          {competition === "중간" && <>
            <strong style={{color:"#F9A825"}}>💡 경쟁이 있는 키워드입니다.</strong><br/>
            롱테일형 글 방향으로 보완하면 더 효과적입니다.<br/>
            <span style={{color:"#7B1FA2",fontWeight:800}}>👇 추천 글 방향을 선택하면 노출 가능성이 높아집니다.</span>
          </>}
          {competition === "낮음" && <>
            <strong style={{color:"#43A047"}}>✅ 이미 좋은 롱테일 키워드입니다.</strong><br/>
            <span style={{color:"#555"}}>지금 바로 작성하셔도 상단 노출에 유리합니다.</span>
          </>}
        </div>
      </div>

      {/* ── 추천 글 방향 선택 ── */}
      <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", marginBottom: 4 }}>
        📝 추천 글 방향
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
        선택한 방향에 맞춰 제목과 글 구성이 자동으로 작성됩니다.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {suggestions.map((s, i) => {
          const sc  = COMP_COLOR[s.competition] || "#888";
          const sb  = COMP_BG[s.competition]    || "#fafafa";
          const ss  = COMP_SCORE[s.competition] || 3;
          const sel = selectedIdx === i;
          return (
            <button key={i} onClick={() => setSelectedIdx(sel ? null : i)}
              style={{ textAlign: "left",
                background: sel ? "#F0E6FF" : s.recommended ? "#FAF5FF" : "#fff",
                border: `2px solid ${sel ? "#7B1FA2" : s.recommended ? "#CE93D8" : "#e8e2f5"}`,
                borderRadius: 13, padding: "16px 18px", cursor: "pointer",
                fontFamily: "inherit", transition: "all .15s",
                boxShadow: sel ? "0 3px 14px rgba(123,31,162,.15)" : "none" }}>
              {/* 상단: 타입 뱃지 + 경쟁도 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.recommended && (
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#fff",
                      background: "linear-gradient(135deg,#7B1FA2,#CE93D8)",
                      borderRadius: 6, padding: "3px 9px" }}>★ 추천</span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#7B1FA2",
                    background: "#F3E5F5", borderRadius: 6, padding: "3px 10px" }}>
                    {s.type}
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: sc,
                  background: sb, border: `1.5px solid ${sc}`,
                  borderRadius: 20, padding: "3px 11px" }}>
                  경쟁 {s.competition}
                </span>
              </div>
              {/* 키워드 */}
              <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1a2e", marginBottom: 6, lineHeight: 1.4 }}>
                {s.keyword}
              </div>
              {/* 전략 설명 */}
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <span style={{ color: "#7B1FA2", fontWeight: 700 }}>
                  {s.competition === "낮음" ? "✅ 상단 노출 유리 · " : s.competition === "중간" ? "💡 노출 가능 · " : "⚠️ 경쟁 높음 · "}
                </span>
                <span style={{ color: "#666" }}>{s.reason}</span>
              </div>
            </button>
          );
        })}
      </div>

    </div>{/* 스크롤 영역 끝 */}

    {/* 하단 고정 — 전략 선택 + 추천 제목 */}
    {selectedIdx !== null && (() => {
      const s = analysis.suggestions[selectedIdx];
      return (
        <div style={{ flexShrink: 0, background: "#F0E6FF",
          borderTop: "2px solid #9C27B0", padding: "14px 16px",
          animation: "fadeIn .2s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", marginBottom: 6 }}>
            ✅ 선택한 글 방향
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", marginBottom: 12, lineHeight: 1.4 }}>
            {s.keyword}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onSelect(s, null)}
              style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#4A148C,#9C27B0)", color: "#fff",
                fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 3px 10px rgba(74,20,140,.25)" }}>
              이 방향으로 작성 →
            </button>
            <button onClick={() => setSelectedIdx(null)}
              style={{ flex: "0 0 70px", padding: "13px 0", borderRadius: 10,
                border: "1.5px solid #ccc", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              취소
            </button>
          </div>
        </div>
      );
    })()}
    </div>
  );
}

// ============================================================
// 진행 상태 보드 (우측)
// ============================================================
// DRAFT_KEY 제거됨 (Phase D) — draft는 Supabase stores.current_draft로 관리
// lib/store/profile.js의 saveDraft/loadDraft/clearDraft 사용

function stageToIndex(stage) {
  if (stage === "welcome" || stage === "treatment") return 0;
  if (stage === "target")     return 1;
  if (stage === "blogtype")   return 2;
  if (stage === "generating") return 3;
  return 4;
}

function StatusBoard({ stage, onResume, onNewStart, industryConfig, home, onGenerate, onFillInput }) {
  const [draft,    setDraft]    = useState(null);
  

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { loadDraft } = await import("../lib/store/profile");
        const saved = await loadDraft();
        if (mounted && saved) setDraft(saved);
      } catch (e) {
        console.error("[draft] load failed:", e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const activeIdx    = stageToIndex(stage);
  const isGenerating = stage === "generating";
  const stepLabels   = ["시술·지역", "타겟", "글 유형", "생성"];

  const stageGuide = {
    welcome: {
      title: "이렇게 입력하세요",
      items: [
        { q: "어떻게 입력하나요?",         a: "\"강남 쌍꺼풀 후기 써줘\" 처럼 시술명 + 지역으로 입력하세요. 유형은 자동 감지됩니다." },
        { q: "어떤 유형의 글이 만들어지나요?", a: "후기형 · 상담형 · 비교형 3가지를 자동 감지합니다. 생성 후 변경 버튼으로 바꿀 수 있습니다." },
        { q: "생성까지 얼마나 걸리나요?",   a: "약 30~60초 소요됩니다. 6개 섹션을 순서대로 작성합니다." },
        { q: "글 길이는 얼마나 되나요?",    a: "SEO 최적화 기준 2,000자 이상으로 작성됩니다." },
      ],
    },
    treatment: {
      title: "시술 + 지역을 입력하세요",
      items: [
        { q: "어떻게 입력하나요?",
          a: `${industryConfig?.label || ""} 시술명 + 지역으로 입력하세요. 예: "강남 OO 후기 써줘"`.trim() },
        { q: "지역은 꼭 넣어야 하나요?", a: "넣으면 SEO에 유리합니다. 강남·압구정·청담·서초·홍대·분당 등." },
        { q: "입력 예시",
          a: (industryConfig?.examples && industryConfig.examples.length)
            ? industryConfig.examples.slice(0, 3).map(e => `"${e}"`).join(" / ")
            : "\"강남 자연유착 쌍꺼풀 후기\" / \"압구정 실리프팅 vs 울쎄라\"" },
      ],
    },
    target: {
      title: "타겟이 자동 선택됩니다",
      items: [
        { q: "상담 고민형이란?", a: "수술 전 고민 중인 독자 대상. 전환율이 가장 높습니다. 기본값으로 추천." },
        { q: "시술 후기형이란?", a: "이미 시술을 받은 독자 대상. 결과·회복 중심으로 작성됩니다." },
        { q: "비교 탐색형이란?", a: "여러 선택지를 비교 중인 독자 대상. 비교·결정 과정 중심." },
      ],
    },
    blogtype: {
      title: "글 유형이 자동 선택됩니다",
      items: [
        { q: "후기형이란?",   a: "고민→상담→결과 전 과정을 담는 형태. 가장 보편적." },
        { q: "상담기형이란?", a: "상담 장면 비중이 높은 형태. 신뢰감 형성에 효과적." },
        { q: "비교형이란?",   a: "두 시술을 비교하다 선택하는 과정 중심. \"실리프팅 vs 울쎄라\" 입력 시 자동 적용." },
      ],
    },
    generating: {
      title: "AI가 작성 중입니다 (30~60초)",
      items: [], // GeneratingProgress 컴포넌트가 렌더링 — 이 items는 미사용
    },
  };

  const guide = stageGuide[stage] || stageGuide.welcome;

  // [v111] 생성 단계: 우측은 진행 단계(점·체크리스트)를 일절 표시하지 않는다.
  //   "글 작성하기" 버튼이 눌린 자리 느낌의 단일 '작성 중' 카드만 표시 → 완료 시 stage="result" 자동 전환.
  //   7단계 진행 체크리스트는 좌측 코치(GeneratingProgress)가 단독 소유. 우측 중복 제거.
  if (isGenerating) return <GenWritingCard />;

  return (
    <div key={stage} style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "#f7f7fb", overflowY: "auto",
      animation: "fadeIn .25s ease",
    }}>

      {/* ── 오늘의 시작 (홈 요약) — 대기(welcome)에서만. 글쓰기 단계 진입 시 숨김 ── */}
      {home && stage === "welcome" && (
        <div style={{ padding: "16px 16px 4px", background: "#f7f7fb" }}>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ede8f8",
            boxShadow: "0 2px 10px rgba(123,31,162,.05)", padding: "16px 18px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#4A148C", marginBottom: 14 }}>☀️ 오늘의 시작</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { label: "최근 발행", value: home.recent != null ? `${home.recent}건` : "—", color: "#6A1B9A", sub: "" },
                { label: "사용량",   value: home.usageText || "—",                          color: "#1565C0", sub: "" },
                { label: "관측 중",  value: home.observing != null ? `${home.observing}건` : "—", color: "#E65100", sub: "" },
              ].map(c => (
                <div key={c.label} style={{ background: "#faf8ff", borderRadius: 10, padding: "16px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#999", fontWeight: 700, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value}</div>
                  {c.sub ? <div style={{ fontSize: 10.5, fontWeight: 700, color: "#999", marginTop: 2 }}>{c.sub}</div> : null}
                </div>
              ))}
            </div>
            {/* ⑤ 관측 요약 — "내 글 살아있나?" 사용자 1순위 관심. 유지/이탈/관측중 한눈에. (점수 아님, 상태 기록) */}
            {home.surv ? (
              <div style={{ background: "#faf8ff", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "#6A1B9A", fontWeight: 800 }}>📈 내 글 관측</span>
                  {home.verdict ? (
                    <span style={{ fontSize: 13, fontWeight: 800, color: home.verdictColor }}>{home.verdict}</span>
                  ) : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {[
                    { label: "살아있는 글", value: home.surv.alive,   color: "#2e7d32", ic: "🟢" },
                    { label: "관측 필요",   value: home.surv.unknown, color: "#C79A00", ic: "🟡" },
                    { label: "위험 글",     value: home.surv.gone + home.surv.fossil, color: "#c62828", ic: "🔴" },
                  ].map(c => (
                    <div key={c.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12.5, color: "#999", fontWeight: 700, marginBottom: 4 }}>{c.ic} {c.label}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                {/* 최근 상승/하락 — rank 데이터 연동 후 표시. (지금은 데이터 없으면 숨김) */}
                {(home.surv.up != null || home.surv.down != null) ? (
                  <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10,
                    paddingTop: 10, borderTop: "1px solid #f0eef5" }}>
                    {home.surv.up != null ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#2e7d32" }}>↗ 최근 상승 {home.surv.up}</span>
                    ) : null}
                    {home.surv.down != null ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#c62828" }}>↘ 최근 하락 {home.surv.down}</span>
                    ) : null}
                  </div>
                ) : null}
                {/* 자연어 해석 — 사장님 언어 */}
                {home.surv.note ? (
                  <div style={{ fontSize: 11.5, color: "#777", lineHeight: 1.6, marginTop: 10,
                    paddingTop: 10, borderTop: "1px solid #f0eef5" }}>
                    {home.surv.note}
                  </div>
                ) : null}
              </div>
            ) : null}
            {/* 🎯 추천 주제 — 1줄 3칸(표시 전용). */}
            {home.recos?.length ? (
              <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e6d6f5", padding: "14px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: "#4A148C", fontWeight: 900, marginBottom: 10 }}>🎯 추천 주제</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {home.recos.map((r, i) => (
                    <div key={r.topic}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6,
                        background: "#faf8ff", border: "1px solid #ede8f8", borderRadius: 10, padding: "13px 8px" }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{["🥇","🥈","🥉"][i] || "🔹"}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "#2a2a33", lineHeight: 1.3, wordBreak: "keep-all" }}>{r.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#9457b8", lineHeight: 1.35, wordBreak: "keep-all" }}>{r.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {/* ④ 운영 코치 — 공백/과집중/활동성/지역편중 동시 분석. 사장님 보고 톤. */}
            {home.advices?.length ? (
              <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #ede8f8", padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#9457b8", fontWeight: 800, marginBottom: 8 }}>🧠 운영 코치 분석</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {home.advices.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start",
                      background: a.tone === "warn" ? "#fff5eb" : "#faf8ff",
                      borderRadius: 8, padding: "9px 11px" }}>
                      <span style={{ fontSize: 14, lineHeight: 1.4 }}>{a.icon}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.5,
                        color: a.tone === "warn" ? "#A84300" : "#4A148C", fontSize: 14 }}>{a.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {/* AI 발견 — Observer/경쟁환경 DB 연결 시 실데이터. 지금은 자리 확보. */}
            <div style={{ borderRadius: 10, border: "1.5px dashed #d9d2ec", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, color: "#6A1B9A", fontWeight: 800 }}>🔍 AI 발견</span>
                <span style={{ fontSize: 10, color: "#bbb", fontWeight: 700 }}>준비 중</span>
              </div>
              <div style={{ fontSize: 12, color: "#7B1FA2", fontWeight: 700, marginBottom: 2 }}>경쟁환경 분석 시스템 준비 중</div>
              <div style={{ fontSize: 11.5, color: "#999", lineHeight: 1.6 }}>
                글을 생성할 때마다 그 키워드의 경쟁환경을 모아, 새로운 기회 주제와 변화를 곧 알려드립니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 가로 STEP 진행바 ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #ede8f8", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {stepLabels.map((label, i) => {
            const isDone    = i < activeIdx;
            const isActive  = i === activeIdx;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", position: "relative" }}>
                {i < stepLabels.length - 1 && (
                  <div style={{ position: "absolute", top: 15, left: "50%", width: "100%", height: 2,
                    background: isDone ? "#9C27B0" : "#e0d8f0", zIndex: 0, transition: "background .3s" }} />
                )}
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", zIndex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: isDone ? 13 : 11, fontWeight: 900,
                  background: isDone ? "linear-gradient(135deg,#7B1FA2,#CE93D8)"
                    : isActive ? "#fff" : "#f0ecf8",
                  border: isActive ? "2.5px solid #9C27B0" : "2px solid transparent",
                  color: isDone ? "#fff" : isActive ? "#7B1FA2" : "#ccc",
                  boxShadow: isActive ? "0 0 0 4px rgba(156,39,176,.12)" : "none",
                  transition: "all .3s",
                  ...(isActive && isGenerating ? { animation: "pulse 1.5s infinite" } : {}),
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: isActive ? 800 : 600,
                  color: isDone || isActive ? "#4A148C" : "#bbb", whiteSpace: "nowrap" }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 이어쓰기 — 생성 완료 후에만 표시 ── */}
      {draft && stage !== "generating" && (
        <div style={{ margin: "12px 14px 0", background: "#fff", borderRadius: 12,
          border: "1.5px solid #CE93D8", padding: "13px 15px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9C27B0", marginBottom: 6 }}>이어쓰기 가능</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e",
            background: "#f9f5ff", borderRadius: 8, padding: "7px 11px", marginBottom: 10 }}>
            {draft.region} {draft.treatmentName}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onResume(draft)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
                fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              이어쓰기
            </button>
            <button onClick={async () => {
                try {
                  const { clearDraft } = await import("../lib/store/profile");
                  await clearDraft();
                } catch (e) { console.error("[draft] clear failed:", e); }
                setDraft(null);
                onNewStart();
              }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 9,
                border: "1.5px solid #e0d0f0", background: "#fff",
                color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              새로 시작
            </button>
          </div>
        </div>
      )}

      {/* ── 단계별 안내 — 카드 표시 ── */}
      <div style={{ padding: "14px 14px 24px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0",
          marginBottom: 12, letterSpacing: 0.5 }}>
          💬 {guide.title}
        </div>

        {/* [v111] 생성 단계는 위에서 GenWritingCard로 조기 return → 여기는 안내 카드만. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {guide.items.map((item, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12,
              border: "1.5px solid #ede8f8", padding: "14px 16px",
              boxShadow: "0 2px 8px rgba(100,50,180,.04)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#4A148C",
                marginBottom: 6 }}>
                {item.q}
              </div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// AI 진행감 컴포넌트 (대기 화면용)
// 7단계 순차 진행 — 응답이 도착하면 남은 단계를 빠르게 통과 후 onComplete
// ────────────────────────────────────────────────────────────
// [v129] 문구 정합화 — "검수/통과"(사후 검사 함의) → "기준 적용/검토"(프롬프트 사전 규칙). 8단계(생성 완료) 추가.
//   checks = 실제 *-prompts.js 에 존재하는 작성 규칙만 표기. 업종 계열별로 분리(외식업에 의료 문구 금지).
const GENERATING_STEPS = [
  { icon: "🔍", title: "키워드·검색의도 분석",    sub: "지역+키워드 조합 검색량 확인 중…",                        doneLabel: "분석 완료" },
  { icon: "⚖️", title: "광고법 기준 적용",        sub: "생성 중 적용되는 작성 기준입니다.",                        doneLabel: "기준 적용됨",
    checks: ["단정 표현 제한","가격·비용 표현 제한","광고성 표현 제한","1인칭 후기체 제한","진료과 이탈 표현 제한","수치 과장 표현 제한"] },
  { icon: "🤖", title: "AI 패턴 최적화",           sub: "결심·편안·새로운삶 등 AI 표시 표현 제거 중…",              doneLabel: "자연스러운 톤" },
  { icon: "✏️", title: "제목 생성",                sub: "지역+키워드+후킹 패턴 조합 생성 중…",                      doneLabel: "생성 완료" },
  { icon: "📝", title: "본문 작성",                sub: "고민→탐색→비교→선택→마무리 자연스럽게 연결 중…",          doneLabel: "작성 완료" },
  { icon: "🔎", title: "품질 검토",                sub: "글자수·키워드·복합키워드·구조·정보 자동 점검 중…",        doneLabel: "검토 완료" },
  { icon: "📋", title: "최종 문서 정리",           sub: "해시태그·이미지 ALT·문단 구분 최종 정리 중…",              doneLabel: "정리 완료" },
  { icon: "✅", title: "생성 완료",                sub: "결과 화면으로 이동합니다…",                                doneLabel: "완료" },
];
// [v136] restaurant 전용 진행 단계 — 의료광고법/시술 문구 노출 차단(맵꼬는 음식점).
const GENERATING_STEPS_RESTAURANT = [
  { icon: "🔍", title: "키워드·검색의도 분석",    sub: "지역+메뉴 조합 검색량 확인 중…",                          doneLabel: "분석 완료" },
  { icon: "⚖️", title: "광고성 표현 기준 적용",   sub: "생성 중 적용되는 작성 기준입니다.",                        doneLabel: "기준 적용됨",
    checks: ["광고성 표현 제한","단정·과장 표현 제한","가격 표현 제한","1인칭 후기체 제한","업종 이탈 표현 제한","장면 중심 서술 유지"] },
  { icon: "🤖", title: "AI 패턴 최적화",           sub: "결심·편안·새로운삶 등 AI 표시 표현 제거 중…",              doneLabel: "자연스러운 톤" },
  { icon: "✏️", title: "제목 생성",                sub: "지역+메뉴+후킹 패턴 조합 생성 중…",                        doneLabel: "생성 완료" },
  { icon: "📝", title: "본문 작성",                sub: "방문→주문→맛·분위기 장면 자연스럽게 연결 중…",            doneLabel: "작성 완료" },
  { icon: "🔎", title: "품질 검토",                sub: "글자수·키워드·복합키워드·장면·운영정보 자동 점검 중…",   doneLabel: "검토 완료" },
  { icon: "📋", title: "최종 문서 정리",           sub: "해시태그·이미지 ALT·문단 구분 최종 정리 중…",              doneLabel: "정리 완료" },
  { icon: "✅", title: "생성 완료",                sub: "결과 화면으로 이동합니다…",                                doneLabel: "완료" },
];
// [v146] legal 전용 진행 단계 — 의료광고법/시술 문구 노출 차단(법무사는 전문직).
const GENERATING_STEPS_LEGAL = [
  { icon: "🔍", title: "키워드·검색의도 분석",    sub: "지역+업무 조합 검색량 확인 중…",                        doneLabel: "분석 완료" },
  { icon: "⚖️", title: "표시광고법 기준 적용",    sub: "생성 중 적용되는 작성 기준입니다.",                        doneLabel: "기준 적용됨",
    checks: ["단정 표현 제한","보수·비용 표현 제한","광고성 표현 제한","1인칭 후기체 제한","업무 범위 이탈 제한","결과 보장 표현 제한"] },
  { icon: "🤖", title: "AI 패턴 최적화",           sub: "결심·편안·새로운삶 등 AI 표시 표현 제거 중…",              doneLabel: "자연스러운 톤" },
  { icon: "✏️", title: "제목 생성",                sub: "지역+업무+후킹 패턴 조합 생성 중…",                      doneLabel: "생성 완료" },
  { icon: "📝", title: "본문 작성",                sub: "고민→상담→절차→비교→해결→마무리 자연스럽게 연결 중…",  doneLabel: "작성 완료" },
  { icon: "🔎", title: "품질 검토",                sub: "글자수·키워드·복합키워드·정보블럭·수치 자동 점검 중…",   doneLabel: "검토 완료" },
  { icon: "📋", title: "최종 문서 정리",           sub: "해시태그·이미지 ALT·문단 구분 최종 정리 중…",              doneLabel: "정리 완료" },
  { icon: "✅", title: "생성 완료",                sub: "결과 화면으로 이동합니다…",                                doneLabel: "완료" },
];
const getGeneratingSteps = (industry) =>
  industry === "restaurant" ? GENERATING_STEPS_RESTAURANT
  : industry === "legal" ? GENERATING_STEPS_LEGAL
  : GENERATING_STEPS;
// [v147] 클립보드 복사 — http/포커스 등으로 navigator.clipboard 실패 시 execCommand fallback.
// 성공하면 true 반환. 호출부는 true일 때만 setCopied(true) 처리.
// [세션54] 전체복사(제목+본문) 조립 — 엔진별 제목 계약 차이 흡수.
//   배경: 일부 엔진(bedding 등)은 제목을 본문에 넣지 않고 응답 title 필드로만 반환한다.
//     → copyPlainText는 "# 제목"을 평문화할 뿐이라, 본문에 제목이 없으면 복사본에도 없다.
//     결과: "전체 복사 (제목 + 본문)"인데 제목이 빠져 사용자가 수동으로 옮겨 적어야 했음.
//   처리: 본문 첫 줄이 이미 제목이면 그대로, 아니면 title을 첫 줄로 얹는다(엔진 무수정).
function withTitleForCopy(rawText, title) {
  const body = String(rawText || "");
  const t    = String(title || "").trim();
  if (!t) return body;
  // 본문 첫 비어있지 않은 줄 — "# " 헤더 표기 제거 후 비교.
  const firstLine = (body.split("\n").find((l) => l.trim()) || "")
    .replace(/^#{1,6}\s+/, "").trim();
  const norm = (x) => x.replace(/\s+/g, "");
  if (firstLine && norm(firstLine) === norm(t)) return body;  // 이미 포함 → 중복 방지
  return t + "\n\n" + body.replace(/^\s+/, "");
}

async function copyPlainText(raw) {
  const plain = (raw || "")
    .replace(/([^\n])\s*(#{1,6})\s+/g, "$1\n\n$2 ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
  if (!plain.trim()) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plain);
      return true;
    }
  } catch (_) { /* fallback 진행 */ }
  // 현재 선택영역 보존(폴백 공통) → 종료 시 복원
  const prevSel = (document.getSelection && document.getSelection().rangeCount > 0)
    ? document.getSelection().getRangeAt(0) : null;
  const restoreSel = () => {
    if (prevSel && document.getSelection) {
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(prevSel);
    }
  };
  // [v154] 폴백 1차 — textarea + execCommand('copy')
  try {
    const ta = document.createElement("textarea");
    ta.value = plain;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "0";
    ta.style.top = "0";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    ta.style.fontSize = "16px"; // iOS 줌 방지
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, plain.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
    document.body.removeChild(ta);
    if (ok) { restoreSel(); return true; }
  } catch (_) { /* 2차 폴백 진행 */ }
  // [v154] 폴백 2차 — contentEditable div + Range 선택 후 execCommand('copy').
  //   일부 최신 Chrome(http/localhost)에서 textarea execCommand가 no-op(false) 반환하는 케이스 우회.
  try {
    const div = document.createElement("div");
    div.textContent = plain;
    div.setAttribute("contenteditable", "true");
    div.style.position = "fixed";
    div.style.left = "0";
    div.style.top = "0";
    div.style.width = "1px";
    div.style.height = "1px";
    div.style.opacity = "0";
    div.style.whiteSpace = "pre-wrap";
    document.body.appendChild(div);
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
    document.body.removeChild(div);
    restoreSel();
    if (ok) return true;
  } catch (_) { /* 3차 폴백 진행 */ }
  // [v155] 폴백 3차(최종) — prompt 수동복사. execCommand 무력화(최신 Chrome http/localhost)
  //   케이스 안전망. 사용자가 Ctrl+C로 직접 복사. 성공률 100% / 업종 분기 0.
  //   정식 https에선 1차 navigator.clipboard로 끝나 거의 도달 안 함.
  try {
    restoreSel();
    window.prompt("Ctrl+C(⌘+C)로 복사 후 Enter를 누르세요.", plain);
    return true;
  } catch (_) {
    return false;
  }
}

// [v133] 단계 내부 세부 문구 — title 기준 매칭. 미정의 단계는 cur.sub 단독 사용.
const STEP_PHRASES = {
  "키워드·검색의도 분석": ["지역+키워드 조합 검색량 확인 중…", "검색 의도 분류 중…", "경쟁 노출 패턴 확인 중…"],
  "광고법 기준 적용":     ["금지 표현 목록 대조 중…", "과장·단정 표현 점검 중…", "표현 수위 조정 중…"],
  "광고성 표현 기준 적용": ["금지 표현 목록 대조 중…", "과장·단정 표현 점검 중…", "표현 수위 조정 중…"],
  "AI 패턴 최적화":       ["AI 표시 표현 제거 중…", "반복 문장 수정 중…", "문맥 자연화 중…", "마무리 표현 정리 중…"],
  "제목 생성":            ["후킹 패턴 조합 중…", "지역+키워드 배치 중…", "길이·가독성 확인 중…"],
  "본문 작성":            ["도입 흐름 작성 중…", "장면 묘사 연결 중…", "선택 기준 정리 중…", "마무리 문단 작성 중…"],
  "품질 검토":            ["글자수·키워드 밀도 점검 중…", "복합키워드 분포 확인 중…", "구조·정보 블록 점검 중…"],
  "최종 문서 정리":       ["해시태그 정리 중…", "이미지 ALT 배치 중…", "문단 구분 정리 중…"],
};

const STEP_INTERVAL_MS = 4500;   // 통상 진행 속도
const FINISH_INTERVAL_MS = 220;  // 응답 도착 후 남은 단계 빠르게 통과
const FINAL_HOLD_MS = 700;       // 마지막 단계 완료 후 결과 전환까지 대기

// 모듈 스코프 이벤트 버스 — generate 함수가 응답 도착 시 finish 신호를 보냄
const genProgressBus = {
  pendingFinish: null,    // { onComplete } | null  — emitter 측 보관
  finishHandler: null,    // (onComplete) => void   — 컴포넌트가 등록
  // 외부(generate 함수)에서 호출
  signalDone(onComplete) {
    if (typeof this.finishHandler === "function") {
      this.finishHandler(onComplete);
    } else {
      // 진행감 컴포넌트가 없으면 즉시 콜백 (fail-safe)
      try { onComplete && onComplete(); } catch (_) {}
    }
  },
  // 컴포넌트 mount/unmount 시 등록/해제
  setHandler(fn) { this.finishHandler = fn; },
};

// [v132] logCtx = 실제 화면 데이터(지역·생활권·업종명·시술명). 로그에 허위값 금지 — 없으면 해당 줄 생략.
function GeneratingProgress({ industry, logCtx } = {}) {
  const STEPS = getGeneratingSteps(industry);
  const [activeIdx, setActiveIdx] = useState(0);
  const [allDone, setAllDone]     = useState(false);
  const finishingRef              = useRef(false);
  const onCompleteRef             = useRef(null);

  // 통상 진행: 단계 간격마다 다음 단계로 (마지막 단계 도달하면 정지 — 응답 대기)
  useEffect(() => {
    if (finishingRef.current) return;            // 빠른 마무리 진행 중이면 통상 진행 중지
    if (activeIdx >= STEPS.length - 1) return;
    const t = setTimeout(() => setActiveIdx(i => i + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [activeIdx]);

  // 빠른 마무리 — 외부에서 signalDone 호출 시 시작
  const runFinish = useCallback((onComplete) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    onCompleteRef.current = onComplete;

    const total = STEPS.length;
    const stepFromNow = (idx) => {
      if (idx >= total - 1) {
        // 마지막 단계 활성 → 잠깐 보여준 뒤 모두 완료 처리
        setActiveIdx(total - 1);
        setTimeout(() => {
          setActiveIdx(total);   // 모든 카드 ✓ 표시
          setAllDone(true);
          // 최종 안심 메시지 잠깐 보여주고 결과로 전환
          setTimeout(() => {
            try { onCompleteRef.current && onCompleteRef.current(); } catch (_) {}
          }, FINAL_HOLD_MS);
        }, FINISH_INTERVAL_MS);
        return;
      }
      setActiveIdx(idx);
      setTimeout(() => stepFromNow(idx + 1), FINISH_INTERVAL_MS);
    };
    // 현재 idx부터 빠르게 진행
    setActiveIdx(prev => {
      stepFromNow(prev + 1);
      return prev;
    });
  }, []);

  // 모듈 버스에 핸들러 등록 — mount 시 등록, unmount 시 해제
  useEffect(() => {
    genProgressBus.setHandler(runFinish);
    return () => {
      genProgressBus.setHandler(null);
      finishingRef.current = false;
      onCompleteRef.current = null;
    };
  }, [runFinish]);

  const total    = STEPS.length;
  const progress = allDone ? 100 : Math.min(((activeIdx + 1) / total) * 100, 100);

  // [v131] 진행형 UI — 설명형(8카드 나열) 폐기. 현재 작업 1개만 크게, 나머지는 한 줄 칩.
  //   레이아웃 고정: 컨테이너 높이 불변 → 단계 전환 시 박스 변동·스크롤 없음.
  // ── AI 작업 로그 — 실제 단계 전환 시각만 기록. 값이 없는 줄은 만들지 않는다. ──
  const [logs, setLogs] = useState([]);
  const loggedRef = useRef(-1);
  useEffect(() => {
    const i = Math.min(activeIdx, STEPS.length - 1);
    if (loggedRef.current >= i) return;
    loggedRef.current = i;
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    const add = [];
    const L = logCtx || {};
    if (i === 0) {
      if (L.picked)    add.push(`주제 확정 — ${L.picked}`);
      if (L.region)    add.push(`대표지역 적용 — ${L.region}`);
      if (L.subRegion) add.push(`생활권 적용 — ${String(L.subRegion).split(",")[0].trim()}`);
      add.push(`${STEPS[0].title} 진행`);
    } else {
      add.push(`${STEPS[i - 1].title} 완료`);
      const st = STEPS[i];
      add.push(Array.isArray(st.checks) ? `${st.title} — ${st.checks.length}개 항목` : `${st.title} 진행`);
    }
    setLogs(prev => [...prev, ...add.map(t => ({ ts, t }))].slice(-24));
  }, [activeIdx]);
  useEffect(() => {
    if (!allDone) return;
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    setLogs(prev => [...prev, { ts, t: "생성 완료" }].slice(-24));
  }, [allDone]);

  // [v133] 같은 단계 안에서도 세부 문구가 순환 — 실제 처리 중 체감
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => { setPhraseIdx(0); }, [activeIdx]);
  useEffect(() => {
    if (allDone) return;
    const t = setInterval(() => setPhraseIdx(n => n + 1), 1500);
    return () => clearInterval(t);
  }, [activeIdx, allDone]);

  const cur      = STEPS[Math.min(activeIdx, total - 1)];
  const curNo    = Math.min(activeIdx + 1, total);
  const etaSec   = Math.max(4, Math.round(((total - curNo) * STEP_INTERVAL_MS) / 1000));

  return (
    <div>
      <style>{`@keyframes gpDots{0%,20%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
        @keyframes gpBar{0%{transform:translateX(-100%)}100%{transform:translateX(320%)}}
        @keyframes gpGlow{0%,100%{box-shadow:0 0 0 0 rgba(156,39,176,.30)}50%{box-shadow:0 0 0 5px rgba(156,39,176,0)}}
        @keyframes gpIcon{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(156,39,176,0))}50%{transform:scale(1.18);filter:drop-shadow(0 0 4px rgba(156,39,176,.55))}}
        @keyframes gpTip{0%,100%{opacity:.45;transform:scale(.85)}50%{opacity:1;transform:scale(1.25)}}
        @keyframes gpFade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>

      {/* ── Hero ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 15, flexShrink: 0,
          background: allDone ? "linear-gradient(135deg,#2E7D32,#66BB6A)" : "linear-gradient(135deg,#7B1FA2,#CE93D8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 23, boxShadow: "0 4px 14px rgba(123,31,162,.26)" }}>{allDone ? "✅" : "🤖"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 900, color: "#2b2536", letterSpacing: "-0.02em" }}>
            {allDone ? "글 작성이 완료되었습니다" : "AI가 글을 작성하고 있습니다"}
          </div>
          <div style={{ fontSize: 12, color: "#7a7288", marginTop: 2 }}>
            {allDone ? "결과 화면으로 이동합니다." : `업체 정보와 작성 기준을 적용하는 중 · 남은 시간 약 ${etaSec}초`}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1,
            color: allDone ? "#2E7D32" : "#7B1FA2" }}>{Math.round(progress)}<span style={{ fontSize: 15 }}>%</span></div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#9b93a9", marginTop: 3 }}>{curNo} / {total} 단계</div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: allDone ? "#2E7D32" : "#7B1FA2", marginTop: 2 }}>
            {allDone ? "완료" : `약 ${etaSec}초 남음`}
          </div>
        </div>
      </div>

      {/* ── 진행바 ── */}
      <div style={{ height: 14, background: "#efe9f6", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ width: `${progress}%`, height: "100%", borderRadius: 8, position: "relative", overflow: "hidden",
          background: allDone ? "linear-gradient(90deg,#43A047,#81C784)" : "linear-gradient(90deg,#6A1B9A,#B57BDC)",
          transition: "width .5s ease" }}>
          {!allDone && (
            <>
              <div style={{ position: "absolute", inset: 0, width: "34%",
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,.8),transparent)",
                animation: "gpBar 1.35s linear infinite" }} />
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 16,
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,.95))",
                animation: "gpTip 1.1s ease-in-out infinite" }} />
            </>
          )}
        </div>
      </div>

      {/* ── 현재 작업 (크게, 고정 높이) ── */}
      <div style={{ height: 104, background: "#fff", borderRadius: 13, boxSizing: "border-box",
        border: allDone ? "1.5px solid #c8e6c9" : "1.5px solid #9C27B0",
        boxShadow: allDone ? "none" : "0 4px 18px rgba(123,31,162,.13)",
        padding: "9px 13px", marginBottom: 11, display: "flex", flexDirection: "column",
        overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#9C27B0", background: "#F3E5F5",
            padding: "3px 9px", borderRadius: 20, letterSpacing: ".02em" }}>
            {allDone ? "완료" : `현재 작업 ${curNo}`}
          </span>
          <span style={{ fontSize: 19 }}>{allDone ? "✅" : cur.icon}</span>
          <span style={{ fontSize: 15.5, fontWeight: 900, color: "#2b2536", letterSpacing: "-0.02em" }}>
            {allDone ? "생성 완료" : cur.title}
          </span>
          {!allDone && (
            <span style={{ marginLeft: 4, display: "inline-flex", gap: 3 }}>
              {[0, 1, 2].map(d => (
                <span key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: "#B57BDC",
                  animation: `gpDots 1.2s ${d * 0.18}s infinite` }} />
              ))}
            </span>
          )}
        </div>
        <div key={`${activeIdx}-${phraseIdx}`} style={{ fontSize: 12.5, color: "#6d6580", lineHeight: 1.45,
          animation: "gpFade .35s ease" }}>
          {allDone ? "작성 기준이 모두 적용되었습니다."
                   : (STEP_PHRASES[cur.title] || [cur.sub])[phraseIdx % (STEP_PHRASES[cur.title] || [cur.sub]).length]}
        </div>
        {/* 광고법 기준 체크리스트 — 해당 단계에서만 노출. 실제 프롬프트 규칙과 1:1 대응. */}
        {!allDone && Array.isArray(cur.checks) && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "5px 7px" }}>
            {cur.checks.map((c, ci) => (
              <span key={ci} style={{ fontSize: 11.5, color: "#5E35B1", fontWeight: 700,
                background: "#f6f1fc", border: "1px solid #e4d8f5",
                borderRadius: 6, padding: "4px 9px", whiteSpace: "nowrap" }}>✓ {c}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── 나머지 단계 — 한 줄 칩 (고정 2행) ── */}
      {/* [v134] 고정 4열 그리드 — 칩 폭/개수와 무관하게 항상 2행. 아래 로그박스 위치 불변. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 4 }}>
        {STEPS.map((step, i) => {
          const done = allDone || i < activeIdx;
          const act  = !allDone && i === activeIdx;
          return (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              boxSizing: "border-box", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis",
              fontSize: 11.5, fontWeight: done || act ? 800 : 600,
              color: done ? "#2E7D32" : act ? "#7B1FA2" : "#a29ab2",
              background: done ? "#EDF7EE" : act ? "#F3E5F5" : "#f7f5fa",
              border: `1px solid ${done ? "#c8e6c9" : act ? "#d9b3e8" : "#ece7f3"}`,
              borderRadius: 20, padding: "5px 11px", whiteSpace: "nowrap",
              fontSize: 11.5,
              animation: act ? "gpGlow 1.8s ease-in-out infinite" : "none",
              transition: "background .3s, color .3s, border-color .3s" }}>
              <span style={act ? { fontSize: 14, display: "inline-block",
                animation: "gpIcon 1s ease-in-out infinite" } : undefined}>
                {done ? "✓" : act ? step.icon : "○"}
              </span>{step.title}
            </span>
          );
        })}
      </div>

      {/* ── AI 작업 로그 — 최근 5줄 고정 높이. 레이아웃 변동·스크롤 없음. ── */}
      <div style={{ marginTop: 18, background: "#1e1a26", borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 11 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%",
            background: allDone ? "#66BB6A" : "#CE93D8",
            animation: allDone ? "none" : "gpDots 1.2s infinite" }} />
          <span style={{ fontSize: 11.5, fontWeight: 800, color: "#ddd2ec", letterSpacing: ".02em" }}>AI 작업 기록</span>
        </div>
        <div style={{ height: 224, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 }}>
          {logs.slice(-6).map((l, i, arr) => {
            const last = i === arr.length - 1;
            return (
              <div key={logs.length - arr.length + i} style={{
                opacity: last ? 1 : 0.6 + i * 0.06, transition: "opacity .4s",
                animation: last ? "gpFade .35s ease" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6,
                  fontSize: 10.5, fontWeight: 700, color: last ? "#CE93D8" : "#8d80a4",
                  letterSpacing: ".02em" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%",
                    background: last ? "#CE93D8" : "#6b6080", flexShrink: 0 }} />
                  {l.ts}
                </div>
                <div style={{ marginLeft: 11, fontSize: 13, fontWeight: last ? 700 : 500,
                  lineHeight: "19px", color: last ? "#f4ecfb" : "#c6b9da",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.t}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// [v134] 완료 화면 좌측 — 생성 Hero와 동일한 디자인 언어(아이콘+타이틀+지표).
//   "AI 코치" 톤 폐기. AI Engine → 생성 완료 → 발행 → 관측 하나의 흐름 유지.
// ────────────────────────────────────────────────────────────
function ResultSummary({ meta, doneCopied, doneNaver, doneUrl, onHowto }) {
  const m = meta || {};
  const cells = [
    { k: "글자수",     v: m.chars != null ? m.chars.toLocaleString() : "—", u: "자" },
    { k: "문단",       v: m.paras != null ? m.paras : "—",                 u: "개" },
    { k: "이미지 위치", v: m.imgs != null ? m.imgs : "—",                   u: "곳" },
    { k: "예상 읽기",   v: m.readMin != null ? m.readMin : "—",             u: "분" },
  ];
  // [v135] One Click Publishing 표준 5단계 — 전 업종 동일.
  const flow = [
    { label: "전체 복사",                 on: !!doneCopied },
    { label: "네이버에 붙여넣기",          on: !!doneNaver },
    { label: "[이미지: …] 위치에 사진 삽입", on: !!doneNaver },
    { label: "발행",                      on: !!doneNaver },
    { label: "URL 등록",                  on: !!doneUrl },
  ];
  const nextIdx = flow.findIndex(f => !f.on);

  return (
    <div style={{ marginBottom: 14 }}>
      <style>{`@keyframes rsFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

      {/* Hero — 생성화면과 동일 골격 */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 16, animation: "rsFade .3s ease" }}>
        <div style={{ width: 46, height: 46, borderRadius: 15, flexShrink: 0,
          background: "linear-gradient(135deg,#2E7D32,#66BB6A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 23, boxShadow: "0 4px 14px rgba(46,125,50,.26)" }}>🎉</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 900, color: "#2b2536", letterSpacing: "-0.02em" }}>
            글 생성이 완료되었습니다
          </div>
          <div style={{ fontSize: 12, color: "#7a7288", marginTop: 2, lineHeight: 1.5 }}>
            발행 후 URL을 등록하면 검색 순위 관측이 자동으로 시작됩니다.
          </div>
        </div>
        {m.score != null && (
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#2E7D32" }}>
              {m.score}<span style={{ fontSize: 14 }}>점</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#9b93a9", marginTop: 3 }}>SEO 검토</div>
          </div>
        )}
      </div>

      {/* 지표 4칸 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e6e1f0", borderRadius: 11,
            padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#2b2536", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              {c.v}<span style={{ fontSize: 11, fontWeight: 800, color: "#9b93a9", marginLeft: 1 }}>{c.u}</span>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8d85a0", marginTop: 4 }}>{c.k}</div>
          </div>
        ))}
      </div>

      {/* [v135] 1분 사용방법 — 텍스트 대신 영상이 중심 */}
      {onHowto && (
        <button onClick={onHowto}
          style={{ width: "100%", marginBottom: 10, padding: "11px 14px", borderRadius: 12,
            border: "1px solid #e0d0f0", cursor: "pointer", fontFamily: "inherit",
            background: "linear-gradient(135deg,#faf6fe,#fff)", textAlign: "left",
            display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,#4A148C,#9C27B0)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>▶</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#4a4458" }}>
              1분 사용방법 영상
            </span>
            <span style={{ display: "block", fontSize: 11.5, color: "#8d85a0", marginTop: 1 }}>
              복사 → 붙여넣기 → 사진 삽입 → 발행까지
            </span>
          </span>
        </button>
      )}

      {/* 발행 흐름 — 완료는 ✓, 지금 할 일만 강조 */}
      <div style={{ background: "#fff", border: "1px solid #e6e1f0", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {flow.map((f, i) => {
            const now = i === nextIdx;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9,
                fontSize: 13, fontWeight: f.on || now ? 800 : 600,
                color: f.on ? "#2E7D32" : now ? "#7B1FA2" : "#b0a8bf" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 900, color: f.on ? "#fff" : now ? "#7B1FA2" : "#b0a8bf",
                  background: f.on ? "#43A047" : now ? "#F3E5F5" : "#f0edf6",
                  border: now ? "1.5px solid #d9b3e8" : "none" }}>{f.on ? "✓" : "○"}</span>
                {f.label}
                {now && <span style={{ fontSize: 11, fontWeight: 800, color: "#9C27B0",
                  background: "#F3E5F5", padding: "2px 8px", borderRadius: 20 }}>지금 할 일</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// [v127] 우측 생성 애니메이션 — 7단계 체크리스트는 좌측(GeneratingProgress)으로 이동.
//   우측은 "AI가 글을 쓰고 있다"는 시각 신호만. 진행 로직·완료 버스 없음(순수 표시).
//   완료되면 stage="result"로 전환되어 우측이 결과 화면으로 자동 교체됨.
// ────────────────────────────────────────────────────────────
// [v111] 생성 단계 우측 — "글 작성하기" 버튼이 그대로 '작성 중' 상태로 바뀐 느낌의 단일 카드.
//   진행 단계(점·체크리스트)는 좌측 코치가 단독 소유. 여기는 순수 표시(움직임만).
const GEN_WRITE_CHECKS = [
  "키워드 · 지역 분석",
  "광고법 기준 적용",
  "제목 생성",
  "생활권 적용",
  "업체정보 반영",
  "본문 작성",
  "최종 점검",
];
function GenWritingCard() {
  const [doneN, setDoneN] = useState(0);
  useEffect(() => {
    if (doneN >= GEN_WRITE_CHECKS.length) return;
    const t = setTimeout(() => setDoneN(n => n + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [doneN]);
  const nearDone = doneN >= GEN_WRITE_CHECKS.length;
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#f7f7fb", animation: "fadeIn .25s ease", padding: "40px 24px",
    }}>
      {/* 버튼이 변환된 모양 — 풀폭 그라데이션 + 흐르는 진행 + 펄스 아이콘 */}
      <div style={{
        width: "100%", maxWidth: 460, padding: "18px 22px", borderRadius: 14,
        background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
        boxShadow: "0 6px 22px rgba(123,31,162,.28)",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20, animation: "pulse 1.5s infinite" }}>{nearDone ? "✓" : "✍️"}</span>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.3 }}>
            {nearDone ? "초안 생성 완료" : "AI가 글을 쓰고 있습니다"}
          </span>
          <span style={{ display: "inline-block", width: 22, textAlign: "left", fontWeight: 900 }}>
            {[0, 1, 2].map(d => (
              <span key={d} style={{ opacity: 0, animation: `blinkDot 1.4s ${d * 0.25}s infinite` }}>.</span>
            ))}
          </span>
        </div>
        {/* 흐르는 진행 바 */}
        <div style={{ position: "relative", height: 5, borderRadius: 5,
          background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%",
            borderRadius: 5, background: "rgba(255,255,255,.95)",
            animation: "genSlide 1.3s ease-in-out infinite" }} />
        </div>
      </div>
      {/* [v132] 실시간 체감 — 좌측 단계와 동일 주기로 체크가 하나씩 들어온다(표시 전용) */}
      <div style={{ width: "100%", maxWidth: 460, marginTop: 18, display: "flex",
        flexDirection: "column", gap: 9 }}>
        {GEN_WRITE_CHECKS.map((c, i) => {
          const on = i < doneN;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 9,
              fontSize: 13, fontWeight: on ? 800 : 600,
              color: on ? "#2E7D32" : "#b0a8bf",
              transition: "color .35s, opacity .35s", opacity: on ? 1 : 0.72 }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 900, color: "#fff",
                background: on ? "#43A047" : "#dcd6e6",
                transition: "background .35s" }}>{on ? "✓" : ""}</span>
              {c}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 12.5, color: "#7B1FA2", fontWeight: 700,
        lineHeight: 1.7, textAlign: "center" }}>
        {nearDone ? <>발행 전 최종 점검 중입니다.<br />잠시 후 결과 화면으로 이동합니다.</>
                  : <>보통 20~60초 걸려요. 왼쪽에서 진행 단계를 확인할 수 있어요.<br />
                     💡 광고법 · SEO · AI패턴 기준을 적용해 작성 중입니다.</>}
      </div>
      <style>{`
        @keyframes blinkDot { 0%,100%{opacity:0} 50%{opacity:1} }
        @keyframes genSlide { 0%{left:-40%} 100%{left:100%} }
      `}</style>
    </div>
  );
}


// ── 아래는 더 이상 쓰지 않는 STAGE_INFO (삭제용 더미) ──
const STAGE_INFO = {
  welcome: {
    icon: "✦", color: "#7B1FA2",
    title: "블로그 생성기 사용법",
    subtitle: "아래 순서대로 진행하세요",
    content: [
      { step: "01", icon: "✏️", title: "시술 + 지역을 입력하세요",
        desc: "\"강남 쌍꺼풀 후기 써줘\" 처럼 자유롭게 입력하거나, 버튼을 눌러 시술을 선택할 수 있습니다." },
      { step: "02", icon: "🎯", title: "타겟 독자를 선택하세요",
        desc: "상담 고민 중인 고객 / 시술 후 후기 작성자 / 병원 비교 중인 고객 중 하나를 고릅니다." },
      { step: "03", icon: "📝", title: "블로그 유형을 선택하세요",
        desc: "상담 후기형 / 시술 결과형 / 비교형 등 목적에 맞는 유형을 선택합니다." },
      { step: "04", icon: "⚡", title: "AI가 블로그를 작성합니다",
        desc: "강제 6섹션 전환형 구조로 약 30~60초 내 완성됩니다. 결과는 이 패널에 표시됩니다." },
    ],
    tip: "💡 네이버 SEO 최적화된 2,000자 이상의 블로그가 자동 생성됩니다.",
  },

  treatment: {
    icon: "💉", color: "#6A1B9A",
    title: "시술 선택 중",
    subtitle: "원하는 시술을 선택하거나 직접 입력하세요",
    content: [
      { step: "👁️", icon: "👁️", title: "눈성형",      desc: "자연유착 쌍꺼풀 · 눈매교정 · 눈밑지방재배치 · 상안검" },
      { step: "👃", icon: "👃", title: "코성형",      desc: "콧대 · 코끝 · 매부리코 · 재수술" },
      { step: "🔺", icon: "🔺", title: "리프팅",      desc: "실리프팅 · 울쎄라 · 써마지 · 인모드" },
      { step: "💉", icon: "💉", title: "보톡스·필러", desc: "이마 · 팔자 · 광대축소 · 턱끝" },
      { step: "✨", icon: "✨", title: "피부레이저",  desc: "피코레이저 · 레이저토닝 · 여드름흉터 · 모공" },
      { step: "🌀", icon: "🌀", title: "지방·체형",   desc: "지방흡입 · 복부 · 허벅지 · 팔뚝" },
    ],
    tip: "💡 시술명 + 지역을 함께 입력하면 더 빠르게 진행됩니다.\n예) \"강남 실리프팅 후기 써줘\"",
  },

  target: {
    icon: "🎯", color: "#4A148C",
    title: "타겟 독자 선택 중",
    subtitle: "독자 유형에 따라 글의 톤과 전략이 달라집니다",
    content: [
      { step: "😟", icon: "😟", title: "상담 고민 고객 — 전환율 최고",
        desc: "시술을 고민 중인 독자 대상. '나도 그 고민 했어요' 공감형으로 시작해 상담 예약을 자연스럽게 유도합니다." },
      { step: "😊", icon: "😊", title: "시술 후기 작성자 — 신뢰 구축",
        desc: "이미 시술을 받은 독자 대상. 결과 체감 · 회복 과정을 중심으로 작성되어 신뢰감을 높입니다." },
      { step: "🔍", icon: "🔍", title: "병원 비교 고객 — 선택 유도",
        desc: "여러 병원을 비교 중인 독자 대상. 선택 기준과 비교 포인트를 명확하게 서술해 결정을 돕습니다." },
    ],
    tip: "💡 처음 시작하는 경우 '상담 고민 고객' 타겟이 전환율이 가장 높습니다.",
  },

  blogtype: {
    icon: "📝", color: "#4A148C",
    title: "블로그 유형 선택 중",
    subtitle: "어떤 형태의 글을 작성할까요?",
    content: [
      { step: "📖", icon: "📖", title: "상담 후기형",
        desc: "상담 과정을 중심으로 서술. 의사와의 대화, 질문·답변 흐름이 자연스럽게 담깁니다. 신뢰감 형성에 탁월." },
      { step: "✅", icon: "✅", title: "시술 결과형",
        desc: "시술 전후 변화를 중심으로 서술. 결과 체감과 감정 흐름 중심. 비포·애프터가 궁금한 독자에게 효과적." },
      { step: "⚖️", icon: "⚖️", title: "병원 비교형",
        desc: "여러 병원을 비교한 경험을 서술. 선택 이유와 비교 포인트 포함. 결정을 못하는 독자에게 설득력 높음." },
    ],
    tip: "💡 어떤 유형이든 강제 6섹션 전환형 구조가 자동 적용됩니다.",
  },

  generating: {
    icon: "⚡", color: "#7B1FA2",
    title: "블로그 생성 중...",
    subtitle: "강제 6섹션 구조로 작성되고 있습니다",
    isGenerating: true,
    content: [
      { step: "01", icon: "😔", title: "SECTION 1 — 고민",      desc: "독자가 공감할 수 있는 시작 문장. '저도 그 고민 했어요' 형태로 작성됩니다." },
      { step: "02", icon: "📖", title: "SECTION 2 — 상황",      desc: "왜 고민하게 됐는지 구체적인 상황을 묘사합니다." },
      { step: "03", icon: "🏥", title: "SECTION 3 — 상담 흐름", desc: "상담 장면과 의사 질문을 1개 이상 포함합니다. (강제 적용)" },
      { step: "04", icon: "💡", title: "SECTION 4 — 선택 이유", desc: "비교 대상을 포함해 왜 이 시술·병원을 선택했는지 서술합니다. (강제 적용)" },
      { step: "05", icon: "🌟", title: "SECTION 5 — 결과 체감", desc: "변화된 느낌과 감정 표현을 담습니다." },
      { step: "06", icon: "📌", title: "SECTION 6 — 정리",      desc: "광고가 아닌 경험형 선택 유도 문장으로 마무리합니다." },
    ],
    tip: "⏱ 약 30~60초 소요됩니다. 잠시 기다려주세요.",
  },
};

// ============================================================
// 우측 설명 보드
// ============================================================
function InfoBoard({ stage }) {
  const info = STAGE_INFO[stage] || STAGE_INFO.welcome;

  return (
    <div key={stage} style={{
      flex: 1, overflowY: "auto",
      background: "linear-gradient(160deg,#faf8ff 0%,#f0eaff 100%)",
      display: "flex", flexDirection: "column",
      animation: "fadeIn .3s ease",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "22px 24px 16px",
        borderBottom: "1px solid #ede8f8",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg,${info.color},#CE93D8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: `0 4px 14px ${info.color}35`,
            ...(info.isGenerating ? { animation: "pulse 1.6s ease-in-out infinite" } : {}),
          }}>{info.icon}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.3px" }}>
              {info.title}
            </div>
            <div style={{ fontSize: 11, color: info.color, fontWeight: 600, marginTop: 2 }}>
              {info.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* 카드 목록 */}
      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 9 }}>
        {info.content.map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
            background: "#fff", borderRadius: 14, padding: "13px 15px",
            border: "1px solid #ede8f8",
            boxShadow: "0 2px 8px rgba(100,50,180,.04)",
            animation: `fadeIn .3s ease ${i * 0.06}s both`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg,#F3E5F5,#E1BEE7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17,
            }}>{item.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1a2e", marginBottom: 4,
                display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 9, fontWeight: 900, color: "#fff",
                  background: info.color, borderRadius: 5,
                  padding: "2px 6px", letterSpacing: "0.3px", flexShrink: 0,
                }}>{item.step}</span>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: "#777", lineHeight: 1.75 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 팁 */}
      {info.tip && (
        <div style={{
          margin: "14px 20px 24px",
          background: `${info.color}0d`,
          border: `1px solid ${info.color}22`,
          borderRadius: 12, padding: "12px 16px",
          fontSize: 12, color: "#5e2e7a", lineHeight: 1.75,
          fontWeight: 500, whiteSpace: "pre-line",
        }}>
          {info.tip}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 이미지 플레이스홀더 / BlogContent
// ============================================================
function ImgPlaceholder({ alt, index, uploadedSrc, onUpload }) {
  const inputRef = useRef();
  return (
    <div onClick={!uploadedSrc ? () => inputRef.current?.click() : undefined}
      style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden",
        border: uploadedSrc ? "2px solid #66BB6A" : "2px dashed #CE93D8",
        background: uploadedSrc ? "#F1F8E9" : "#FCF4FF",
        cursor: uploadedSrc ? "default" : "pointer" }}>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(index, URL.createObjectURL(f)); }} />
      {uploadedSrc
        ? <img src={uploadedSrc} alt={alt} style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
        : <div style={{ minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 10 }}>
            <span style={{ fontSize: 16 }}>🖼️</span>
            <span style={{ fontSize: 11, color: "#9C27B0", fontWeight: 700 }}>{alt}</span>
          </div>}
      <div style={{ background: "#F3E5F5", padding: "3px 10px", fontSize: 9, color: "#7B1FA2" }}>ALT: {alt}</div>
    </div>
  );
}

function BlogContent({ text, uploadedImgs, onUpload }) {
  const safeText = text || "";
  const parts = safeText.split(/\[이미지:\s*(.*?)\]/g);
  let imgIdx = 0;
  return (
    <div style={{ fontSize: 16, lineHeight: 1.8, color: "#37474f", wordBreak: "break-word", fontWeight: 400 }}>
      {parts.map((part, i) => {
        if (i % 2 === 1) { const idx = imgIdx++; return <ImgPlaceholder key={i} index={idx} alt={part.trim()} uploadedSrc={(uploadedImgs && uploadedImgs[idx])||null} onUpload={onUpload} />; }
        if (!part.trim()) return null;
        return <div key={i} style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: md2html(part) }} />;
      })}
    </div>
  );
}

// ============================================================
// 메시지 컴포넌트
// ============================================================
function ChatMessage({ msg, onCta, onAction }) {
  if (msg.role === "user") return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
      <div style={{ maxWidth: "65%", background: "#F0EBF8", color: "#1a1a2e",
        borderRadius: "18px 18px 4px 18px", padding: "10px 16px", fontSize: 14, lineHeight: 1.6 }}>
        {msg.text}
      </div>
    </div>
  );

  // [v-landing2 2026-07-27] 온보딩 첫 화면 = 설명이 아니라 "증명 한 장".
  //   교체 전: 연보라 안내박스 + 인사말 5줄 → 영상보다 텍스트가 먼저 읽히는 구조였다.
  //   구성 5단: ① 질문 한 줄 ② 답 한 줄 ③ 큰 영상 ④ 생성→발행→검색→노출 ⑤ 시작 버튼.
  //   문구·영상·단계는 전부 msg 필드로 주입 → 렌더러는 레이아웃만 소유.
  if (msg.role === "landing") {
    const conf = msg.video ? COACH_VIDEOS[msg.video] : null;
    return (
      // [세션71] 블록 전체를 아래로 내린다 — 제목·4단계·영상 간격을 좁히고 덩어리째 중앙에 앉힌다.
      <div style={{ marginBottom: 16, paddingTop: 64 }}>
        <div style={{ fontSize: 27, fontWeight: 900, color: "#1a1a2e", lineHeight: 1.35,
          letterSpacing: "-0.03em", marginBottom: 10, textAlign: "center" }}>
          {msg.headline}
        </div>
        <div style={{ fontSize: 14.5, color: "#6a5a7a", lineHeight: 1.7, marginBottom: 14, textAlign: "center" }}>
          {msg.sub}
        </div>

        {/* [v-landing3] 신뢰 문구 — "연출이 아니라 실제"를 영상 보기 전에 확정한다. */}
        {Array.isArray(msg.proof) && msg.proof.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 16,
            justifyContent: "center" }}>
            {msg.proof.map((pf) => (
              <span key={pf} style={{ fontSize: 12, fontWeight: 700, color: "#2e7d5b",
                display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                <span style={{ color: "#34a853", fontWeight: 900 }}>✔</span>{pf}
              </span>
            ))}
          </div>
        )}

        {/* [v-landing3] 4단계 — pill(버튼처럼 보여 클릭 오인) → 번호 플로우로 전환.
            테두리·배경 제거, 번호 배지 + 화살표만 남겨 "과정"임을 형태로 전달한다. */}
        {Array.isArray(msg.steps) && msg.steps.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            flexWrap: "wrap", gap: 10, marginTop: 20 }}>
            {msg.steps.map((st, i) => (
              <Fragment key={st}>
                {i > 0 && <span style={{ color: "#d6c6e4", fontWeight: 900, fontSize: 15 }}>→</span>}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    background: "#7B1FA2", color: "#fff", fontSize: 11, fontWeight: 900,
                    display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#4A148C",
                    whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>{st}</span>
                </span>
              </Fragment>
            ))}
          </div>
        )}

        {/* [세션71] 영상 위치 = 4단계 플로우 아래. 순서: 제목 → 부제 → (신뢰3줄) → 4단계 → 영상 → 사례.
            "무엇을 하는 서비스인가"를 먼저 읽히고 증명 영상을 이어 붙인다. */}
        {conf && (conf.videoId ? (
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000",
            // [세션71] 영상 시작선을 다른 메뉴(최근발행 등)의 도우미 영상 위치에 맞춘다.
            //   위쪽 여백을 키워 화면 중앙에 앉히고, 하단은 안내 2줄이 받는다.
            //   비로그인은 신뢰 3줄(proof)이 이미 자리를 먹으므로 그만큼 뺀다.
            marginTop: Array.isArray(msg.proof) && msg.proof.length > 0 ? 26 : 34,
            borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(74,20,140,.16)" }}>
            <iframe
              src={`https://www.youtube.com/embed/${conf.videoId}?cc_load_policy=0&iv_load_policy=3`}
              title={conf.title}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <div style={{ padding: "60px 14px", textAlign: "center", color: "#9a9ab5", fontSize: 13,
            background: "#f7f3fb", borderRadius: 16 }}>
            준비 중인 영상입니다.
          </div>
        ))}

        {/* [세션71] 영상 하단 안내 2줄. SoT = msg.videoNote { main, sub } (없으면 미노출).
            main = 행동 지시(크게) / sub = 소요 시간 안내(중간). */}
        {msg.videoNote && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 23, fontWeight: 900, color: "#4A148C",
              letterSpacing: "-0.03em", lineHeight: 1.35 }}>
              {msg.videoNote.main}
            </div>
            {msg.videoNote.sub && (
              <div style={{ marginTop: 7, fontSize: 16.5, fontWeight: 700, color: "#6b6178",
                letterSpacing: "-0.02em", lineHeight: 1.45 }}>
                {msg.videoNote.sub}
              </div>
            )}
          </div>
        )}

        {/* [세션71] 실제 노출 사례 — 영상 아래 여백 자리. 비로그인 전용(신뢰 확보).
            SoT = msg.cases 배열. 행 추가·교체는 메시지 정의부 한 곳에서만 한다(렌더러 무수정).
            ★ 업체명·블로그명은 넣지 않는다(PHILOSOPHY 원칙1). 검색어와 결과만 적는다. */}
        {Array.isArray(msg.cases) && msg.cases.length > 0 && (
          <div style={{ marginTop: 18, border: "1.5px solid #ece3f7", borderRadius: 12,
            background: "#fbf9fe", padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: "#4A148C",
              letterSpacing: "-0.02em", marginBottom: 8 }}>
              실제 발행 → 노출 확인
            </div>
            {msg.cases.map((c, i) => (
              <div key={c.q + i} style={{ display: "flex", alignItems: "center", gap: 8,
                padding: "7px 0", borderTop: i === 0 ? "none" : "1px solid #f0eaf8" }}>
                <span style={{ fontSize: 12, color: "#7a6f8a", flexShrink: 0 }}>🔍</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#2f2740",
                  letterSpacing: "-0.02em", flex: "1 1 0", minWidth: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.q}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#6D28D9",
                  whiteSpace: "nowrap", flexShrink: 0 }}>{c.r}</span>
                <span style={{ fontSize: 11.5, color: "#9a8fac",
                  whiteSpace: "nowrap", flexShrink: 0 }}>{c.t}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 11, color: "#9a8fac", letterSpacing: "-0.02em" }}>
              네이버 검색 화면 기준 · 순위는 시점에 따라 달라집니다
            </div>
          </div>
        )}

        {/* [v-hero 2026-07-29] 로그인 후 좌측 = 작업 시작 화면. 영상 아래 바로 다음 행동 3개.
            우측 포스터(왜 AI-POST인가)와 역할 분리 — 좌측은 "지금 무엇을 해야 하는가"만 담당.
            tab 값 = HUB_TABS id. 이동은 onAction(부모 goHubTab) 위임 → 렌더러는 레이아웃만 소유. */}
        {Array.isArray(msg.actions) && msg.actions.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            {msg.actions.map((ac, i) => (
              <button key={ac.tab} type="button"
                onClick={() => onAction && onAction(ac.tab)}
                style={{ flex: "1 1 0", minWidth: 0, padding: "12px 4px",
                  borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13.5, fontWeight: 800, letterSpacing: "-0.02em",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  border: i === msg.actions.length - 1 ? "none" : "1.5px solid #e0d3ef",
                  background: i === msg.actions.length - 1
                    ? "linear-gradient(135deg,#6D28D9,#9333EA)" : "#fff",
                  color: i === msg.actions.length - 1 ? "#fff" : "#6D28D9",
                  boxShadow: i === msg.actions.length - 1
                    ? "0 6px 18px rgba(109,40,217,.26)" : "none" }}>
                {ac.label}
              </button>
            ))}
          </div>
        )}

        {msg.cta && (
          <button type="button" onClick={() => onCta && onCta()}
            style={{ display: "block", width: "100%", marginTop: 20, padding: "14px 0",
              border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
              // [v129] 레드·오렌지 철회 → 브랜드 보라 그라데이션. 로고·상단메뉴·단계표시와 계열 통일.
              background: "linear-gradient(135deg,#6D28D9,#9333EA)", color: "#fff",
              fontSize: 15.5, fontWeight: 900, letterSpacing: "-0.02em",
              boxShadow: "0 6px 20px rgba(109,40,217,.30)" }}>
            {msg.cta}
          </button>
        )}
        {msg.note && (
          <div style={{ marginTop: 10, textAlign: "center", fontSize: 12, color: "#9a8fac" }}>
            {msg.note}
          </div>
        )}
      </div>
    );
  }

  if (msg.role === "assistant") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#4A148C,#9C27B0)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900 }}>B</div>
      <div style={{ maxWidth: "78%" }}>
        <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px",
          padding: "12px 16px", fontSize: 14, lineHeight: 1.8, color: "#1a1a2e",
          boxShadow: "0 1px 3px rgba(0,0,0,.06)", whiteSpace: "pre-line" }}>
          {msg.text}
        </div>
        {msg.image && (
          <img
            src={msg.image}
            alt={msg.imageAlt || ""}
            style={{ width: "100%", maxWidth: 420, height: "auto", borderRadius: 14, marginTop: 10, display: "block", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}
          />
        )}
        {/* [v-landing] 영상 박스 — msg.video(YouTube ID) 있으면 16:9 임베드. 이미지와 배타 아님(둘 다 가능). */}
        {msg.video && (
          <div style={{ width: "100%", maxWidth: 420, marginTop: 10, borderRadius: 14,
            overflow: "hidden", background: "#000", boxShadow: "0 1px 3px rgba(0,0,0,.06)",
            aspectRatio: "16 / 9" }}>
            <iframe
              src={`https://www.youtube.com/embed/${msg.video}?rel=0&iv_load_policy=3`}
              title={msg.videoTitle || "AI-POST.AI 소개 영상"}
              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}

      </div>
    </div>
  );

  if (msg.role === "loading") return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#4A148C,#9C27B0)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 900 }}>B</div>
      <div style={{ background: "#fff", borderRadius: "4px 18px 18px 18px",
        padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.06)",
        display: "flex", alignItems: "center", gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#CE93D8",
            animation: "bounce 1.2s infinite", animationDelay: `${i*0.2}s` }} />
        ))}
        <span style={{ fontSize: 12, color: "#9C27B0", marginLeft: 4 }}>{msg.text}</span>
      </div>
    </div>
  );
  return null;
}

// ============================================================
// [v15] 인증 헬퍼 — login.js 로직 이식 (동일 동작). 메인 우측 로그인 카드용.
//   성공 시 페이지 이동 없이 부모 onAuthed(session) 호출 → 우측 패널만 전환.
// ============================================================
async function ensureAccountMain(session) {
  if (!session?.access_token) return { ok: false, error: "no_session" };
  try {
    const r = await fetch("/api/account/ensure", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: "exception" };
  }
}

async function enforceActiveStatusMain(ensured) {
  if (!ensured?.ok) return { blocked: false };
  if (ensured.status && ensured.status !== "active") {
    // [계정누수차단] 강제 로그아웃 경로에서도 계정별 캐시 제거.
    try {
      window.localStorage.removeItem("aipost_plan_state_v1");
      window.localStorage.removeItem("aipost_mymenus_v1");
    } catch {}
    await supabase.auth.signOut();
    return { blocked: true, reason: ensured.status,
      message: `계정 상태가 "${ensured.status}" 입니다. 관리자에게 문의하세요.` };
  }
  return { blocked: false };
}

// ============================================================
// [v15] LoginCard — 메인 우측 패널 비로그인 상태. /login 페이지 대신 인라인.
//   로그인 성공 → onAuthed() 호출 (부모가 세션 재조회 → 우측이 작업화면으로 전환)
// ============================================================
function LoginCard({ onAuthed, onExplore }) {
  const [mode, setMode] = useState("login");   // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  // [회원가입] 이메일+비밀번호 최소 가입 → 세션 생성 시 즉시 메인 진입
  async function handleSignup() {
    setErr(""); setNotice("");
    if (!email || !password) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    if (password.length < 6) { setErr("비밀번호는 6자 이상 입력하세요."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setErr(authErrMsg(error.message)); return; }
    if (data?.session) {
      const ensured = await ensureAccountMain(data.session);
      const guard = await enforceActiveStatusMain(ensured);
      if (guard.blocked) { setErr(guard.message); return; }
      onAuthed?.();
      return;
    }
    setNotice("가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증을 완료하세요.");
  }

  // [v128] Supabase 인증 에러 한글화 — 원문 노출 금지. 미매핑은 일반 문구로 폴백.
  function authErrMsg(m) {
    const t = String(m || "");
    if (/invalid login credentials/i.test(t))      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    if (/email not confirmed/i.test(t))            return "가입 확인 메일의 링크를 눌러 인증을 완료해주세요.";
    if (/user already registered/i.test(t))        return "이미 가입된 이메일입니다. 로그인해주세요.";
    if (/password should be at least/i.test(t))    return "비밀번호는 6자 이상이어야 합니다.";
    if (/unable to validate email|invalid email/i.test(t)) return "이메일 형식을 확인해주세요.";
    if (/rate limit|too many requests/i.test(t))   return "시도 횟수가 많습니다. 잠시 후 다시 시도해주세요.";
    if (/network|fetch/i.test(t))                  return "네트워크 연결을 확인해주세요.";
    return "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }

  async function handleSubmit() {
    setErr("");
    if (!email || !password) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(authErrMsg(error.message)); return; }
    if (data?.user && data?.session) {
      const ensured = await ensureAccountMain(data.session);
      const guard = await enforceActiveStatusMain(ensured);
      if (guard.blocked) { setErr(guard.message); return; }
      onAuthed?.();  // 페이지 이동 없음 — 부모가 상태 갱신
    }
  }

  async function handleKakao() {
    setErr("");
    setKakaoLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setKakaoLoading(false); setErr("카카오 로그인에 실패했습니다. 다시 시도해주세요."); }
  }

  // [v-signup 2026-07-27] 로그인/회원가입 화면 시각 분리.
  //   문제: 두 화면이 배경·카드·버튼이 모두 같아 "페이지가 바뀌었다"는 인지가 안 됐다.
  //   조치: signup 모드에서 ① 배경 톤 ② 카드 상단 액센트바 ③ 버튼 색 ④ 진행 스텝바 4가지를 전환.
  //         로그인 화면은 기존 그대로(회귀 0).
  const isSignup = mode === "signup";
  const L = {
    wrap: { flex: 1, overflowY: "auto", padding: "40px 28px",
      background: isSignup ? "linear-gradient(180deg,#fff5f8 0%,#fbf6ff 55%,#f6f2ff 100%)" : "#faf8ff",
      display: "flex", flexDirection: "column", alignItems: "center" },
    brand: { fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em",
      background: "linear-gradient(135deg,#4A148C,#9C27B0)", WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent", marginBottom: 4 },
    tagline: { fontSize: 13, color: "#7a6a8a", marginBottom: 28 },
    card: { width: "100%", maxWidth: 340, background: "#fff", borderRadius: 16,
      border: isSignup ? "1px solid #f7dce7" : "1px solid #ece2f5",
      boxShadow: isSignup ? "0 6px 24px rgba(194,24,91,.10)" : "0 4px 20px rgba(74,20,140,.08)",
      borderTop: isSignup ? "4px solid #EC407A" : "1px solid #ece2f5",
      padding: 26 },
    h: { fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 },
    input: { width: "100%", boxSizing: "border-box", padding: "11px 13px", marginBottom: 10,
      border: "1px solid #e0d0f0", borderRadius: 9, fontSize: 14, outline: "none", fontFamily: "inherit" },
    btn: { width: "100%", padding: "12px 0", marginTop: 6, border: "none", borderRadius: 9,
      background: isSignup ? "linear-gradient(135deg,#AD1457,#EC407A)" : "linear-gradient(135deg,#4A148C,#9C27B0)",
      color: "#fff",
      fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
    // 회원가입 전용 — 진행 스텝바
    steps: { width: "100%", maxWidth: 340, display: "flex", alignItems: "center",
      gap: 6, marginBottom: 14, justifyContent: "center" },
    step: (on) => ({ fontSize: 11.5, fontWeight: 800, padding: "5px 10px", borderRadius: 20,
      background: on ? "#EC407A" : "#fff", color: on ? "#fff" : "#c48aa4",
      border: on ? "1px solid #EC407A" : "1px solid #f2dbe4", whiteSpace: "nowrap" }),
    stepArrow: { fontSize: 11, color: "#e0b6c8", fontWeight: 900 },
    divider: { display: "flex", alignItems: "center", margin: "16px 0 12px", gap: 10 },
    dline: { flex: 1, height: 1, background: "#eee" },
    dtext: { fontSize: 11, color: "#aaa" },
    kakao: { width: "100%", padding: "12px 0", border: "none", borderRadius: 9,
      background: "#FEE500", color: "#191919", fontSize: 14, fontWeight: 700,
      cursor: "pointer", fontFamily: "inherit", display: "flex",
      alignItems: "center", justifyContent: "center", gap: 8 },
    footer: { marginTop: 16, fontSize: 12.5, color: "#8a7a9a", textAlign: "center" },
    link: { color: "#7B1FA2", textDecoration: "none", fontWeight: 700 },
    err: { marginTop: 12, padding: 10, background: "#fef2f2", border: "1px solid #fecaca",
      color: "#991b1b", borderRadius: 8, fontSize: 12.5 },
    feats: { width: "100%", maxWidth: 340, marginTop: 22, display: "grid",
      gridTemplateColumns: "1fr 1fr", gap: 8 },
    feat: { background: "#fff", border: "1px solid #f0eaf7", borderRadius: 10,
      padding: "12px 14px", fontSize: 12.5, color: "#5a4a6a" },
    featIc: { fontSize: 18, display: "block", marginBottom: 4 },
  };

  return (
    <div style={L.wrap}>
      <div style={L.brand}>AI-POST.AI</div>
      <div style={L.tagline}>
        {isSignup
          ? "회원가입 진행 중 — 이메일만으로 간단하게 가입합니다"
          : "AI를 이용한 콘텐츠 운영 플랫폼"}
      </div>

      {/* [v-signup] 진행 스텝바 — 회원가입에서만 노출. "다른 페이지"임을 첫눈에 알리는 축. */}
      {isSignup && (
        <div style={L.steps}>
          <span style={L.step(true)}>① 계정 만들기</span>
          <span style={L.stepArrow}>›</span>
          <span style={L.step(false)}>② 업종 선택</span>
          <span style={L.stepArrow}>›</span>
          <span style={L.step(false)}>③ 글 발행</span>
        </div>
      )}

      <div style={L.card}>
        <div style={{ ...L.h, color: isSignup ? "#AD1457" : "#1a1a2e" }}>
          {isSignup ? "✍️ 회원가입" : "로그인"}
        </div>
        {mode === "signup" && (
          <div style={{ fontSize: 12, color: "#AD1457", background: "#fff5f8",
            border: "1px solid #f7dce7", borderRadius: 8, padding: "9px 11px",
            lineHeight: 1.5, marginBottom: 12 }}>
            이메일과 비밀번호만 입력하면 가입이 완료됩니다.
          </div>
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일" style={L.input} autoComplete="email"
          onKeyDown={(e) => e.key === "Enter" && (mode === "signup" ? handleSignup() : handleSubmit())} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "비밀번호 (6자 이상)" : "비밀번호"} style={L.input}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          onKeyDown={(e) => e.key === "Enter" && (mode === "signup" ? handleSignup() : handleSubmit())} />
        <button onClick={mode === "signup" ? handleSignup : handleSubmit} disabled={loading} style={L.btn}>
          {loading ? (mode === "signup" ? "가입 중..." : "로그인 중...") : (mode === "signup" ? "가입하기" : "로그인")}
        </button>

        {/* [세션98] 비밀번호 찾기 — 로그인 모드에서만. 인증은 Supabase Auth(이메일+비번)이라
            아이디 개념이 없다. 따라서 「아이디 찾기」는 두지 않는다. */}
        {mode !== "signup" && (
          <div style={{ marginTop: 10, textAlign: "center", fontSize: 12 }}>
            <a href="/forgot-password" style={{ ...L.link, fontWeight: 600 }}>비밀번호 찾기</a>
          </div>
        )}

        <div style={L.divider}>
          <span style={L.dline} /><span style={L.dtext}>또는</span><span style={L.dline} />
        </div>
        <button onClick={handleKakao} disabled={kakaoLoading} style={L.kakao}>
          <span>💬</span>{kakaoLoading ? "이동 중..." : "카카오로 시작하기"}
        </button>

        <div style={L.footer}>
          {mode === "signup" ? (
            <>이미 계정이 있으신가요?{" "}
              <a onClick={() => { setMode("login"); setErr(""); setNotice(""); }}
                style={{ ...L.link, cursor: "pointer" }}>로그인</a></>
          ) : (
            <>계정이 없으신가요?{" "}
              <a onClick={() => { setMode("signup"); setErr(""); setNotice(""); }}
                style={{ ...L.link, cursor: "pointer" }}>회원가입</a></>
          )}
        </div>
        {notice && <div style={{ marginTop: 12, padding: 10, background: "#f0fdf4",
          border: "1px solid #bbf7d0", color: "#166534", borderRadius: 8, fontSize: 12.5 }}>{notice}</div>}
        {err && <div style={L.err}>{err}</div>}
      </div>

      <div style={{ width: "100%", maxWidth: 460, marginTop: 22 }}>
        {/* ★ [훅] 업종 탐색 유도 — catalog SoT 자동 집계(업종 추가 시 숫자 자동 반영) */}
        <div style={{
          borderRadius: 14, padding: "16px 16px 14px",
          background: "linear-gradient(135deg,#faf5ff 0%,#f3ecff 100%)",
          border: "1px solid #e6d8f7",
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: "#4A148C", marginBottom: 4, textAlign: "center" }}>
            🔍 당신의 업종을 찾아보세요
          </div>
          <div style={{ fontSize: 11.5, color: "#7a6a8a", lineHeight: 1.5, marginBottom: 12, textAlign: "center" }}>
            가입하고 글을 발행하면 네이버 상단에 노출됩니다.<br />지금 시작하세요.
          </div>

          {/* [v-cl 2026-07-27] 3타일 → 4타일(C안). 총 규모 유지 + Construction/Living 분리 노출.
              상단 2칸 = 플랫폼 총량(강조) / 하단 2칸 = 업종군 축(보조). 카테고리 확장 시 타일만 추가. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
            <div style={{
              background: "#fff", borderRadius: 10, padding: "12px 6px",
              textAlign: "center", border: "1px solid #ecdff9",
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#7B1FA2", lineHeight: 1 }}>
                {CATALOG_COUNT.industries}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a", marginTop: 4, whiteSpace: "nowrap" }}>총 업종</div>
            </div>
            <div style={{
              background: "#fff", borderRadius: 10, padding: "12px 6px",
              textAlign: "center", border: "1px solid #ecdff9",
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#7B1FA2", lineHeight: 1 }}>
                {CATALOG_COUNT.menus}+
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a", marginTop: 4, whiteSpace: "nowrap" }}>총 메뉴</div>
            </div>
            <div style={{
              background: "#fff", borderRadius: 10, padding: "12px 6px",
              textAlign: "center", border: "1px solid #ecdff9",
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#9C4DCC", lineHeight: 1 }}>
                {CATALOG_COUNT.construction}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a", marginTop: 4, whiteSpace: "nowrap" }}>🏗️ 건설·시공</div>
            </div>
            <div style={{
              background: "#fff", borderRadius: 10, padding: "12px 6px",
              textAlign: "center", border: "1px solid #ecdff9",
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#9C4DCC", lineHeight: 1 }}>
                {CATALOG_COUNT.living}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#8a7a9a", marginTop: 4, whiteSpace: "nowrap" }}>🏠 생활서비스</div>
            </div>
          </div>

          <button onClick={() => onExplore?.()} style={{
            display: "block", width: "100%", textAlign: "center",
            background: "#7B1FA2", color: "#fff", fontWeight: 900, fontSize: 13,
            borderRadius: 10, padding: "11px 0", border: "none", cursor: "pointer",
            fontFamily: "inherit",
          }}>
            내 업종 찾고 시작하기 →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// [v28] 탭별 좌측 도움말 — 우측 작업화면에 대응하는 사용법/예시. 텍스트 전용(엔진 무관).
//   초보자: 메뉴 클릭 시 좌측에 설명이 뜸. 숙련자: 같은 탭 재클릭 → 대화창 복귀.
//   PHILOSOPHY 정합: 과발행 경고·생활권 강조·관측(점수 아님) 의미 전달.
const HELP_CONTENT = {
  writer: {
    ic: "✍️", title: "글생성 — 이렇게 진행돼요",
    intro: "오른쪽에서 시술 → 지역 → 글 방향 순서대로 고르면 글이 완성됩니다. 익숙해지면 아래 입력창에 바로 적어도 돼요.",
    flow: [
      { n: "1", ic: "🦷", label: "시술 선택",  desc: "진료/시술 고르기", ex: "임플란트", color: "#7B1FA2" },
      { n: "2", ic: "📍", label: "지역 선택",  desc: "노출할 동네 고르기", ex: "강남", color: "#1565C0" },
      { n: "3", ic: "🎯", label: "글 방향",    desc: "추천 전략 고르기", ex: "롱테일·비교", color: "#00897B" },
      { n: "4", ic: "✍️", label: "생성",       desc: "검수·QC 후 30~60초", ex: "자동 작성", color: "#E65100" },
      { n: "5", ic: "✅", label: "완료",       desc: "복사·발행·URL 등록", ex: "관측 시작", color: "#2E7D32" },
    ],
    blocks: [
      { h: "바로 입력도 가능", items: [
        "“강남 임플란트 후기 써줘”처럼 시술명+지역을 한 줄로 적어도 됩니다.",
        "비교형은 “분당 투명교정 vs 일반교정”처럼 적으면 자동 인식됩니다.",
      ]},
      { h: "발행 후", items: [
        "URL 등록 → 최근발행에서 순위 입력 → 관측에서 생존을 확인하세요.",
      ]},
    ],
  },
  tools: {
    ic: "🖼️", title: "사진편집기 — 이렇게 써요",
    intro: "같은 테마의 사진을 최대 30장까지 한 번에 — 파일명·ALT 삽입과 워터마크까지 일괄 처리합니다. 한 장씩 손볼 필요 없이, 올리고 받으면 끝.",
    flow: [
      { n: "1", ic: "📤", label: "사진 업로드",  desc: "같은 테마 한 번에 · 최대 30장", ex: "JPG·PNG·WEBP", color: "#7B1FA2" },
      { n: "2", ic: "🏷️", label: "파일명 테마",  desc: "30장 파일명·ALT 일괄 자동 생성", ex: "SEO용 이름", color: "#1565C0" },
      { n: "3", ic: "💧", label: "워터마크",     desc: "30장 전체에 한 번에 입힘", ex: "우하단 표기", color: "#00897B" },
      { n: "4", ic: "📦", label: "압축+저장",    desc: "1200px 압축 · 일괄 다운로드", ex: "한 번에 받기", color: "#E65100" },
    ],
    blocks: [
      { h: "한 번에 끝나는 일괄 처리", items: [
        "같은 테마 사진 최대 30장을 업로드하면, 파일명·ALT·워터마크가 30장 모두에 동시 적용됩니다.",
        "장당 작업이 아니라 ‘올리고 → 받기’ 한 번 — 30장도 몇 초면 끝납니다.",
      ]},
      { h: "왜 파일명·ALT를 바꾸나요?", items: [
        "네이버는 사진의 파일명·ALT 텍스트도 읽습니다 — 검색 노출에 유리해집니다.",
        "‘사진내용+화일이름’ 형태로 저장돼 나중에 찾기도 쉽습니다.",
      ]},
    ],
    folders: {
      title: "사진 폴더 저장 방식",
      desc: "시술·상황별로 미리 폴더를 나눠두면, 글 생성 → 복사 → 해당 폴더 사진 첨부 → 발행이 5분 안에 끝납니다.",
      root: "강남눈성형",
      children: ["상담실", "수술전후", "회복실", "후기인터뷰", "의료진", "시설내부"],
      naming: "날짜-시간-사진내용-화일이름-ALT내용  ·  예) 강남눈성형_상담실_01.jpg",
    },
    closing: [
      { h: "편집 화면 열기", items: [
        "오른쪽 위 ‘🖼️ 사진편집기’ 버튼을 누르면 편집 화면이 열립니다.",
      ]},
    ],
  },
  stats: {
    ic: "📊", title: "발행비율 설정 가이드",
    intro: "시스템이 마음대로 글을 발행하지 않습니다. 어떤 항목을 얼마나 알릴지, 그 비중을 사용자가 직접 정하는 곳입니다. 여기서 정한 비중대로만 발행 계획과 추천이 만들어집니다.",
    flow: [
      { n: "1", ic: "🎚️", label: "항목 비중 정하기", desc: "알리고 싶은 항목의 슬라이더를 조정", ex: "직접 설정", color: "#7B1FA2" },
      { n: "2", ic: "⚖️", label: "균형 맞추기", desc: "합계 100% 기준으로 분산", ex: "쏠림 방지", color: "#1565C0" },
      { n: "3", ic: "💾", label: "저장", desc: "정한 비중을 저장", ex: "내 설정 반영", color: "#00897B" },
      { n: "4", ic: "🧠", label: "계획 생성", desc: "발행코치가 비중대로 계획 생성", ex: "자동 배치", color: "#E65100" },
    ],
    blocks: [
      { h: "내가 직접 정하는 것", items: [
        "홍보하고 싶은 항목과 그 비중을 사용자가 직접 설정합니다.",
        "시스템은 정해진 비중을 그대로 따를 뿐, 임의로 늘리거나 발행하지 않습니다.",
        "원하는 방향이 바뀌면 언제든 슬라이더로 다시 조정하고 저장하세요.",
      ]},
      { h: "비율이란?", items: [
        "각 항목이 한 달 발행에서 차지하는 몫(비중)입니다.",
        "합계 100% 기준으로 슬라이더를 움직여 조정합니다.",
        "예: 한 항목을 40%로 두면, 한 달 발행의 약 40%가 그 항목으로 채워집니다.",
      ]},
      { h: "권장 비율", items: [
        "주력 항목은 30~50% 권장 — 한쪽으로 쏠리면 도배처럼 보입니다.",
        "한 항목 100% 설정은 권장하지 않습니다(검색 노출에 불리).",
        "처음 시작한다면 여러 항목으로 분산해 공백 주제를 먼저 확보하세요.",
      ]},
      { h: "왜 비중을 나누나요?", items: [
        "같은 주제만 반복하면 검색에서 도배·광고성으로 인식되기 쉽습니다.",
        "여러 주제를 고르게 다루면 더 많은 검색어에서 노출 기회가 생깁니다.",
        "비중 분산은 곧 검색 유입 경로를 넓히는 일입니다.",
      ]},
      { h: "다음 순서", items: [
        "저장 → AI 발행코치에서 계획 생성 → 달력 날짜 클릭으로 글 생성.",
        "내가 정한 비중이 그대로 계획에 반영됩니다.",
        "운영하면서 반응이 좋은 항목 위주로 비중을 다시 조정하면 됩니다.",
      ]},
    ],
    banner: {
      title: "이 화면의 핵심: ‘무엇을 얼마나 알릴지’는 전적으로 사용자가 결정합니다.",
      desc: "시스템은 사용자가 정한 비중을 도와 계획으로 옮길 뿐입니다.",
    },
  },
  coach: {
    ic: "🧠", title: "AI 발행코치 가이드",
    intro: "‘오늘은 뭘 쓰지?’ 고민하지 않도록, 사용자가 발행비율설정에서 정한 비중을 바탕으로 한 달 발행 스케줄을 대신 짜줍니다. 달력의 해당 날짜를 누르면 그 주제로 바로 글쓰기가 시작됩니다.",
    flow: [
      { n: "1", ic: "🎚️", label: "비중은 내가 설정", desc: "발행비율설정에서 항목별 비중 지정", ex: "사용자 결정", color: "#7B1FA2" },
      { n: "2", ic: "📅", label: "스케줄 자동 배치", desc: "정한 비중대로 한 달 달력에 분산 배치", ex: "고민 끝", color: "#1565C0" },
      { n: "3", ic: "👆", label: "날짜 눌러 글쓰기", desc: "해당일 주제를 누르면 입력창에 자동 입력", ex: "바로 시작", color: "#00897B" },
      { n: "4", ic: "🚦", label: "쏠림 분석", desc: "한 주제 과다 시 분산 권장 안내", ex: "도배 방지", color: "#E65100" },
    ],
    blocks: [
      { h: "오늘 뭘 쓸지 대신 정해줍니다", items: [
        "사용자가 정한 비중을 그대로 달력에 펼쳐 ‘오늘 쓸 주제’를 알려줍니다.",
        "매일 무엇을 쓸지 고민할 필요 없이, 추천된 순서대로 따라가면 됩니다.",
        "비중을 바꾸면 남은 일정도 그에 맞춰 다시 배치됩니다.",
      ]},
      { h: "해당일 클릭 = 바로 글쓰기", items: [
        "📌 예정된 날짜의 주제를 누르면 입력창이 그 주제로 자동 채워집니다.",
        "전송을 눌러야 글이 생성됩니다 — 시스템이 자동으로 발행하지 않습니다.",
        "🔵 생성완료 → 🟢 URL등록완료 순으로 상태가 바뀝니다.",
      ]},
      { h: "쏠림현상 분석", items: [
        "한 주제에 너무 몰리면(과다 발행) 도배·광고성으로 보일 수 있어 경고합니다.",
        "특정 주제 비중이 높으면 ‘분산 권장’으로 알려, 여러 검색어를 고르게 잡도록 돕습니다.",
        "관측 상태(살아있는 글/경계/이탈)도 함께 참고해 다음 주제를 추천합니다.",
      ]},
      { h: "계획이 비어 있다면", items: [
        "발행비율설정에서 항목 비중을 저장하면 스케줄이 자동으로 생깁니다.",
        "비중을 먼저 정하는 것이 코치 사용의 출발점입니다.",
      ]},
    ],
    banner: {
      title: "핵심: 비중은 사용자가, 스케줄은 코치가. 매일 ‘뭘 쓸지’ 고민을 덜어줍니다.",
      desc: "정해진 비중을 벗어난 자동 발행은 하지 않습니다.",
    },
  },
  posts: {
    ic: "📝", title: "최근발행 · 순위 입력 — URL 안 넣으면 여기 안 보입니다",
    intro: "발행한 글들이 여기 모입니다. 그런데 글 주소(URL)를 등록하지 않으면 이 목록에 잡히지 않습니다. 내가 어떤 글을 발행했는지, 그 글이 검색에서 몇 위인지 확인할 수 있는 곳은 여기뿐입니다.",
    warnBanner: {
      title: "URL을 등록하지 않은 글은 ‘유령글’이 됩니다.",
      desc: "목록에서 빠지고 → 순위 입력 불가 → 관측·분석에서 제외 → 다음 글 재료로도 안 쌓입니다. 결국 내가 손해입니다.",
    },
    flow: [
      { n: "1", ic: "🔗", label: "URL 등록", desc: "발행한 글 주소를 넣어야 목록에 잡힙니다", ex: "발행 후 필수", color: "#7B1FA2" },
      { n: "2", ic: "🔎", label: "순위 검색", desc: "내 글을 검색해 현재 순위 확인", ex: "기본/후기", color: "#1565C0" },
      { n: "3", ic: "🔢", label: "순위 입력", desc: "확인한 순위 숫자를 적어 저장", ex: "몇 위?", color: "#00897B" },
      { n: "4", ic: "📈", label: "분석·재생성", desc: "상단 글 패턴 분석 → 다음 글에 반영", ex: "상위 노출", color: "#E65100" },
    ],
    blocks: [
      { h: "URL 안 넣으면 — 유령글", items: [
        "글을 발행해도 URL을 등록하지 않으면 이 목록에 뜨지 않습니다.",
        "발행 여부를 확인할 수 있는 곳은 이 최근발행 목록이 유일합니다.",
        "URL이 없으면 순위 입력도, 관측도, 다음 글 분석도 전부 막힙니다.",
        "발행 직후 바로 주소를 등록하는 것이 손해를 막는 길입니다.",
      ]},
      { h: "내 글 순위 직접 입력", items: [
        "내 글을 네이버에서 검색해, 몇 위에 있는지 숫자로 적어 저장하세요.",
        "🔎 검색 버튼으로 바로 확인할 수 있습니다.",
        "주기적으로 갱신하면 순위 변화(▲▼)가 자동으로 기록됩니다.",
      ]},
      { h: "하루 한 번, 24시간 관측", items: [
        "순위를 입력하면 24시간 동안 ‘오늘 기록함’으로 잠깁니다.",
        "같은 글을 여러 번 적었나 헷갈릴 일이 없습니다.",
        "다음 날 다시 오면 입력칸이 새로 열려 변화 추이가 쌓입니다.",
      ]},
      { h: "분석해서 다음 글을 더 잘 쓰기", items: [
        "입력한 순위 데이터로 어떤 글이 상단에 갔는지 패턴을 분석합니다.",
        "상단에 오른 글의 구조를 다음 글 생성에 반영해 상위 노출 가능성을 높입니다.",
        "순위가 떨어진 글은 보강·재생성 대상으로 검토할 수 있습니다.",
      ]},
    ],
    banner: {
      title: "URL 등록 + 순위 입력 = 다음 글이 상단에 갈 확률을 높이는 데이터.",
      desc: "쌓일수록 ‘상단에 살아남는 글’의 패턴이 또렷해집니다.",
    },
  },
  survival: {
    ic: "📈", title: "관측 보는 법",
    intro: "내 글이 검색에서 살아남았는지 상태로 봅니다. 점수가 아니라 생존 기록입니다.",
    blocks: [
      { h: "상태 의미", items: [
        "유지(살아있음): 순위를 지키고 있는 글 — 그대로 둡니다.",
        "경계: 순위가 흔들리는 글 — 곧 손봐야 할 수 있습니다.",
        "이탈: 상단에서 사라진 글 — 재작성/재발행을 검토합니다.",
        "관측 중: 아직 판단하기 이른 글 — 데이터가 더 필요합니다.",
      ]},
      { h: "언제 수정하나", items: [
        "경계·이탈로 바뀐 글부터 우선 손봅니다.",
        "유지 중인 글은 건드리지 않는 게 안전합니다(과수정 위험).",
      ]},
    ],
  },
  manage: {
    ic: "🗂️", title: "운영 관리 — 무엇이 있나요",
    intro: "발행 계획부터 글 관측, 계정·요금까지 한곳에서 관리합니다. 오른쪽 상단 탭에서 각 화면으로 이동할 수 있어요.",
    blocks: [
      { h: "📊 발행비율설정", items: ["알릴 항목의 발행 비중을 직접 정합니다. 한쪽 쏠림을 막아요."] },
      { h: "🧠 AI 발행코치", items: ["이번 주·이번 달 무엇을 먼저 쓸지 안내합니다."] },
      { h: "📝 최근발행", items: ["발행한 글에 현재 순위를 입력해 기록합니다."] },
      { h: "📈 관측", items: ["내 글이 검색에서 살아있는지 상태로 봅니다."] },
      { h: "🏠 마이페이지", items: ["계정·사용량·이용내역을 제목별로 확인합니다."] },
      { h: "💳 요금제", items: ["플랜을 비교하고 발행 한도를 올립니다."] },
      { h: "🏢 업체정보", items: ["글에 들어갈 생활권·사업장 정보를 입력합니다."] },
    ],
    banner: {
      title: "처음이라면: 발행비율설정 → 업체정보(생활권) 순서를 권장합니다.",
      desc: "비중을 정하고 생활권을 채워두면 발행코치가 바로 계획을 만들어줍니다.",
    },
  },
  guide: {
    ic: "📚", title: "발행가이드 — 생성부터 관측까지",
    intro: "생성한 글을 네이버에 발행하고, 순위를 입력해 관측까지 이어지는 전체 흐름입니다. 순서대로 따라 하면 5분 안에 한 편이 끝납니다.",
    flow: [
      { n: "1", ic: "✍️", label: "생성기 글 생성", desc: "생성기 안내에 따라 AI 글 생성 → 전체복사", ex: "AI 생성 → 복사", color: "#7B1FA2" },
      { n: "2", ic: "📝", label: "네이버 글쓰기 → 붙여넣기", desc: "네이버 블로그 ‘글쓰기’ 열고 본문에 붙여넣기", ex: "붙여넣기", color: "#5E35B1" },
      { n: "3", ic: "🖼️", label: "사진 첨부", desc: "사진 첨부란 안내문구 삭제 후 사진 5~6장 첨부", ex: "5~6장", color: "#1565C0" },
      { n: "4", ic: "🔍", label: "내용 확인", desc: "본문·사진 이상 유무 최종 점검", ex: "이상 유무", color: "#00838F" },
      { n: "5", ic: "🚀", label: "네이버 발행", desc: "‘발행’ 버튼 클릭 → 블로그에 게시", ex: "발행 버튼", color: "#00897B" },
      { n: "6", ic: "🔗", label: "URL 등록", desc: "발행된 글 주소 복사 → 시스템에 주소 등록", ex: "URL 복사", color: "#558B2F" },
      { n: "7", ic: "📊", label: "순위 입력", desc: "관측 > 최근발행 확인 후 현재 순위 입력", ex: "현재 순위", color: "#E65100" },
      { n: "8", ic: "📈", label: "관측 분석", desc: "관측 분석표로 생존 상태 확인", ex: "분석표", color: "#2E7D32" },
    ],
    blocks: [
      { h: "사진 첨부 팁", items: [
        "첨부란의 기본 안내문구는 지우고 사진만 남기세요.",
        "사진편집기에서 파일명·ALT·워터마크를 먼저 처리해두면 더 빠릅니다.",
      ]},
      { h: "URL 등록 → 관측 연결", items: [
        "발행 직후 주소를 등록해야 최근발행에서 순위를 입력할 수 있습니다.",
        "순위를 주기적으로 갱신하면 관측 분석표에 생존 변화가 쌓입니다.",
      ]},
    ],
    banner: {
      title: "테마별로 사진을 미리 분류해두면, 블로그 1편 발행이 5분 안에 끝납니다!",
      desc: "시술·상황별 폴더를 나눠두면 글 생성 → 복사 → 해당 폴더 사진만 첨부 → 발행까지 한 번에.",
    },
  },
  store: {
    ic: "🏢", title: "업체정보 — 블로그 생성에 필요한 최소 정보",
    intro: "여기서는 블로그 글을 만드는 데 꼭 필요한 최소한의 정보만 요청합니다. 그중 생활권은 검색 노출을 좌우하므로 반드시 입력해 주세요. 나머지는 글의 정확도를 높이는 선택 정보입니다.",
    warnBanner: {
      title: "생활권은 반드시 입력하세요.",
      desc: "고객은 ‘동네 + 항목’으로 검색합니다. 생활권이 비어 있으면 검색 노출의 핵심을 놓칩니다.",
    },
    blocks: [
      { h: "🌟 생활권 (필수) — 검색 노출의 핵심", items: [
        "고객이 실제로 검색하는 동네·지역입니다. 글의 롱테일 키워드로 쓰입니다.",
        "여러 곳을 넣으면 글 작성 시 순서대로 활용됩니다. 예) 공릉동 → 태릉입구역 → 하계동 (3~10개 권장)",
      ]},
      { h: "📍 주소 (참고용)", items: [
        "AI가 위치 맥락을 잡는 데 참고합니다. 글에 주소가 그대로 노출되지는 않습니다.",
      ]},
      { h: "📌 대표지역 (자동)", items: [
        "사업장이 속한 큰 행정구역으로, 관측(순위 추적)의 기준이 됩니다.",
        "보통 자동으로 잡히며, 필요할 때만 ‘수정’으로 바꿉니다.",
      ]},
      { h: "🔗 플레이스·블로그 (선택)", items: [
        "네이버 플레이스/홈페이지: 업체 정보 검증에 참고합니다.",
        "블로그: 기존 운영 스타일을 참고합니다(추후 활용).",
      ]},
      { h: "🅿️ 주차·☎️ 전화 (선택)", items: [
        "주차정보: 후기·방문편 글의 문맥에 자연스럽게 활용됩니다.",
        "전화번호: 업체 정보 참고용 — 글에 직접 노출되지 않습니다.",
      ]},
    ],
  },
  account: {
    ic: "🏠", title: "마이페이지 — 내 계정 · 사용량 관리",
    intro: "계정 정보와 사용량을 확인하고, 발행한 글을 제목별로 관리하는 곳입니다. 가입·결제하면 플랜과 권한이 자동으로 적용됩니다.",
    blocks: [
      { h: "계정정보", items: [
        "사업장·이메일·업종을 확인합니다.",
        "가입·결제 후 플랜과 권한(기능 사용 범위)이 자동으로 적용됩니다.",
      ]},
      { h: "사용량 — 발행이 아니라 ‘생성’ 기준", items: [
        "발행/남은 발행은 ‘생성기에서 글을 만든 횟수’ 기준입니다(발행 여부 무관).",
        "테스트·미발행 글도 모두 사용량에 포함됩니다.",
      ]},
      { h: "누적사용량", items: [
        "실제 발행글: URL을 등록한 글 수입니다.",
        "URL 미등록: 발행했어도 주소를 안 넣은 글 — 추적이 안 됩니다.",
      ]},
      { h: "전체 이용내역", items: [
        "발행한 글을 제목별로 보고, 발행 여부·날짜를 확인합니다.",
        "사용량 상세도 이 전체 이용내역에서 확인할 수 있습니다.",
      ]},
    ],
    banner: {
      title: "사용량은 ‘발행’이 아니라 ‘생성’ 기준입니다.",
      desc: "테스트·미발행 글도 포함됩니다. 제목별 상세는 ‘전체 이용내역’에서 확인하세요. 글 발행·순위 입력은 상단 ‘최근발행’·‘관측’에서 진행합니다.",
    },
  },
  plans: {
    ic: "💳", title: "요금제 — 검색 자산을 쌓는 구독",
    intro: "블로그는 한 번 쓰고 사라지는 광고가 아니라, 검색하면 다시 나오는 내 사업장의 검색 자산입니다. 플랜은 ‘월 생성 한도’로 나뉘며, 업그레이드하면 권한이 자동 적용됩니다.",
    blocks: [
      { h: "Free — 0원 / 월", items: [
        "체험용. 발행 3건 포함.",
        "블로그 글 생성·SEO 진단, 검색 노출 구조 미리보기.",
      ]},
      { h: "Basic — 69,000원 / 월", items: [
        "하루 1건 운영. 발행 30건 포함.",
        "검색 노출 블로그 운영, 경쟁 환경 관측, 지속형 검색 자산 축적.",
      ]},
      { h: "Standard — 119,000원 / 월 (추천)", items: [
        "하루 2건 운영. 발행 60건 포함.",
        "Basic 전체 + SEO 운영 코치 + 발행 관리·월간 계획.",
      ]},
      { h: "Pro — 179,000원 / 월", items: [
        "하루 3건 운영. 발행 100건 포함.",
        "Standard 전체 + 가장 많은 발행량 + ROI 리포트.",
      ]},
      { h: "꼭 알아두세요", items: [
        "‘발행 N건’은 생성기에서 글을 만드는 횟수 기준입니다(발행 여부 무관).",
      ]},
    ],
    banner: {
      title: "광고를 멈추면 노출도 멈춥니다. 검색 자산은 계속 쌓입니다.",
      desc: "월 생성 한도가 큰 플랜일수록 더 많은 키워드·지역을 선점할 수 있습니다.",
    },
  },
};

// [v42] 좌측 AI 코치 패널 — 로그인 사용자 전용.
//   정적 설명서(HELP_CONTENT)가 아니라, 현재 열린 화면 + 지금 가진 데이터로 운영 조언을 만든다.
//   1단계 범위: 지금 state만 사용(신규 API/DB 없음). 생활권·주소·발행이력·사용량·관측 결핍 진단만.
//   심층 분석(치료별 집중도/관련도 이동 등)은 quota/usage 정합화 이후 확장.
function buildCoachAdvice(tabId, ctx) {
  const store = ctx.hubStore || {};
  const region = (store.region || "").trim();
  const subRegion = (store.sub_region || "").trim();
  const address = (store.address || "").trim();
  // [UI-SCOPE-VS-CORE-INDUSTRY-CONFLATION-01] 표시 범위 = 등록 departments. 없으면 대표업종 fallback.
  //   ★ normalizeDepartments 는 그룹 미소속 업종(무속·상조·전문직)에서 []를 반환한다(industry-tree L413).
  //     fallback 없이 넘기면 필터가 전면 해제되므로 반드시 대표업종으로 되돌린다.
  const _scopeInds = (() => {
    const dl = normalizeDepartments((store && store.departments) || [], store && store.industry);
    return dl.length ? dl : (store && store.industry ? [store.industry] : []);
  })();
  const posts = filterRealPosts(ctx.hubPosts, _scopeInds); // [UI-SCOPE-01] 등록 분야 전체
  const postCount = posts.length;
  const surv = ctx.hubSurvival || null;
  const observed = surv && surv.observed ? surv.observed : 0;
  const q = ctx.quotaInfo || {};
  const monthlyPublish = Number.isFinite(q.monthly_publish) ? q.monthly_publish : null;

  // [v45] 온보딩 단계 판정 — 필수데이터 충족 여부로 단계 결정.
  //   우선순위: 온보딩(업체정보→발행비율) → 운영(첫 글) → 분석(발행이력 기반).
  //   "제한 아닌 추천": 단계는 다음에 할 일을 안내하는 용도일 뿐, 무엇도 막지 않는다.
  const hasStore   = !!(subRegion || region || address);
  const hasIndustry = !!(store.industry); // [v68] 업종 확정(store행+industry) 여부 — 최초 등록 안내용
  const sw = ctx.savedWeights || null;
  const hasWeights = !!(sw && Object.values(sw).some(v => Number(v) > 0));
  const hasPublished = postCount > 0;
  const onbStage = !hasStore ? "store"    // 업체정보 미입력
                 : !hasWeights ? "weights" // 발행비율 미설정
                 : !hasPublished ? "first" // 첫 글 미작성
                 : "operating";            // 운영 단계

  // 공통 결핍 신호 — 어느 탭에서든 우선 노출할 핵심 경고
  const blocks = []; // { tone:'warn'|'tip'|'ok', lines:[...], recs:[...] }

  // 1) 생활권 — 검색 노출 핵심 ([v68] 업종 확정 후에만 안내. 미확정이면 '업체 등록부터'가 우선)
  if (store.industry && !subRegion) {
    blocks.push({
      tone: "warn",
      lines: ["생활권이 비어 있습니다.", "고객은 '치과'보다 '정자동 치과', '수내역 치과'처럼 동네·역 이름으로 검색합니다.", "생활권이 없으면 검색 노출의 핵심을 놓칩니다."],
      recs: ["예: 정자역, 수내역, 서현역", "업체정보에서 입력 후 저장하세요."],
    });
  }
  // 2) 주소(대표지역 자동 설정 기준) ([v68] 업종 확정 후에만)
  if (store.industry && !region && !address) {
    blocks.push({
      tone: "warn",
      lines: ["주소·대표지역이 비어 있습니다.", "대표지역은 순위 추적의 기준이 됩니다."],
      recs: ["업체정보에서 주소를 입력하면 대표지역이 자동으로 잡힙니다."],
    });
  }

  // [v46] 발행비율 라이브 분석 — 현재 사용자가 만지고 있는 menuWeights(미저장 포함) 기준.
  //   단계: 끔(<=0) / 보조(1~49) / 주력(50~100). 동적 코치가 "주력 18개" 같은 현재 상태를 읽기 위함.
  const liveW = ctx.menuWeights || {};
  const stageOf = (v) => { const n = Number(v || 0); if (n <= 0) return "off"; if (n < 50) return "sub"; return "main"; };
  const mainList = Object.keys(liveW).filter(k => stageOf(liveW[k]) === "main");
  const subList  = Object.keys(liveW).filter(k => stageOf(liveW[k]) === "sub");
  const mainCount = mainList.length;
  const subCount  = subList.length;
  const onCount   = mainCount + subCount;

  // 진료별 발행 분포 — "임플란트 20건, 사랑니 0건 → 공백 채워라" 판정용.
  const pubByName = {};
  for (const p of posts) {
    const nm = (p.treatment_name || p.keyword || "").trim();
    if (!nm) continue;
    pubByName[nm] = (pubByName[nm] || 0) + 1;
  }
  // 켜져 있으나(주력·보조) 아직 한 건도 발행 안 된 진료 = 공백 주제.
  const gapTopics = [...mainList, ...subList].filter(nm => !pubByName[nm]);

  // [v46] 저장 완료 상태 — 저장된 비중이 있고, 현재 작업값이 dirty가 아님(= 방금 저장했거나 저장값 그대로).
  //   이때 코치는 "설정 끝 → 다음 단계(발행코치)"로 흐름을 이어준다.
  const weightsSaved = hasWeights && ctx.weightsDirty === false;
  const planReady = !!(ctx.activePlan && ctx.activePlan.byDay && Object.keys(ctx.activePlan.byDay).length > 0);

  // [v49] 기존/처음 판정 — 오직 "저장된 비율에 주력이 있을 때"만 기존 운영자.
  //   activePlan만 있고 저장비율이 비면(데모·유실) 처음으로 본다. (0 리셋 가드와 기준 통일)
  const savedHasMain = !!(sw && Object.values(sw).some(v => Number(v) >= 50));
  const isReturning = savedHasMain;

  // [v57] intro 기존 스케줄 요약용 — 저장된 주력 주제명 + 이번 달 예정 발행 건수.
  const savedMainList = sw ? Object.keys(sw).filter(k => Number(sw[k]) >= 50) : [];
  let planMonthCount = 0;
  if (ctx.activePlan && ctx.activePlan.byDay) {
    for (const d of Object.values(ctx.activePlan.byDay)) {
      if (Array.isArray(d)) planMonthCount += d.length;
      else if (d) planMonthCount += 1;
    }
  }

  // [v46] 네비게이션 코치용 집계 — URL 등록(실제 발행) 글 수 / 관측 시작 여부.
  const urlPostCount = posts.filter(p => !!p.naver_post_url).length;
  const hasUrl = urlPostCount > 0;
  const hasObserved = observed > 0;

  // ── 네비게이션 단계(nav) — "지금 뭘 해야 하는지" 1순위 흐름 ──────────
  //   분석보다 상위. 저장→계획→작성→URL등록→관측 순서로 다음 한 가지 행동만 가리킨다.
  let navStep;
  if (!hasIndustry)         navStep = "store";    // 0. 업체 등록(업종 확정) 먼저
  else if (!hasStore)       navStep = "store";    // 0. 업체정보(생활권) 먼저
  else if (!weightsSaved)   navStep = "save";     // 1. 발행비율 저장 안 됨
  else if (!planReady)      navStep = "plan";     // 2. 저장됨 + 계획 없음 → 발행코치
  else if (!hasPublished)   navStep = "write";    // 3. 계획 있음 + 글 0 → 오늘 1건
  else if (!hasUrl)         navStep = "url";      // 4. 글 있음 + URL 등록 0 → URL 등록
  else if (!hasObserved)    navStep = "observe";  // 5. URL 등록됨 + 관측 0 → 관측 확인
  else                      navStep = "loop";     // 6. 관측까지 돌아감 → 분석 코치(루프)

  return { region, subRegion, address, postCount, observed, monthlyPublish, blocks,
           hasStore, hasWeights, hasPublished, onbStage, hasIndustry,
           mainList, subList, mainCount, subCount, onCount, pubByName, gapTopics,
           weightsSaved, planReady, isReturning, urlPostCount, hasUrl, hasObserved, navStep,
           savedMainList, planMonthCount };
}

function CoachPanel({ tabId, ctx, onClose, onTab }) {
  const a = buildCoachAdvice(tabId, ctx);

  // [v144] 코치 멘트용 업종 라벨 — ctx.hubStore.industry 기반. 미확정 시 의료 기본값.
  const _ind = (ctx && ctx.hubStore && ctx.hubStore.industry) || "";
  const _LX  = lex(_ind);
  // [UI-SCOPE-VS-CORE-INDUSTRY-CONFLATION-01] 표시 범위 = 등록 departments(없으면 대표업종 fallback).
  const _scopeInds = (() => {
    const s  = (ctx && ctx.hubStore) || {};
    const dl = normalizeDepartments(s.departments || [], s.industry);
    return dl.length ? dl : (s.industry ? [s.industry] : []);
  })();

  // [v86] 발행코치(coach) = 매일 오는 발행 전용 페이지. 좌측 코치는 "글 쓸 준비 점검" 역할.
  //   필수 재료(업체명·주소·업종·생활권·발행비율)가 정상인지 빠르게 확인 → 정상이면 "준비 완료",
  //   누락이면 정지 + 해당 탭으로 안내(그 방 코치가 자체 안내). 우측은 달력만.
  const coachCheck = (() => {
    const s = (ctx && ctx.hubStore) || {};
    const missing = [];
    if (!(s.store_name || "").trim()) missing.push({ label: "업체명", tab: "store" });
    if (!(s.address || "").trim())    missing.push({ label: "주소", tab: "store" });
    if (!s.industry)                  missing.push({ label: "업종", tab: "store" });
    if (!(s.sub_region || "").trim()) missing.push({ label: "생활권", tab: "store" });
    const hasW = !!(a && a.hasWeights);
    if (!hasW)                        missing.push({ label: "발행비율", tab: "stats" });
    // [v87] 둘째 박스(coachStore)에서만 쓰는 값. 첫 박스 요약·softMiss 제거.
    const name = (s.store_name || "").trim();
    const sub  = (s.sub_region || "").trim();
    // [v136] 업종별 항목 라벨 — restaurant=메뉴 / 의료군=시술. 코치 문구 단어만 분기.
    const _isRest  = s.industry === "restaurant";
    const ITEM2    = _isRest ? "메뉴"      : "주제";      // "다른 주제로" → "다른 메뉴로"
    const ITEMLIST = _isRest ? "메뉴 목록" : "시술 목록";  // 우측 패널 지칭
    // [v88] 오늘 예정 항목 추출 — coachGo에서 "오늘 예정: A · B 중 하나를 누르세요"로 치환.
    let todayTopics = [];
    const ap = ctx && ctx.activePlan;
    if (ap && ap.byDay) {
      const now = new Date();
      if (ap.monthY === now.getFullYear() && ap.monthM === now.getMonth()) {
        const v = ap.byDay[now.getDate()];
        const items = Array.isArray(v) ? v : (v ? [v] : []);
        todayTopics = items.map(it => it && it.topic).filter(Boolean);
      }
    }
    // [v119] 오늘 URL 등록(발행)한 글 — 진행상태 표시용(쿼터 숫자 아님, 마이페이지 전용 원칙 유지).
    //   오늘 날짜 + naver_post_url 있는 글의 시술명/키워드. 다음 예정 = 아직 안 쓴 todayTopic.
    let publishedToday = [];
    {
      // [v126] 업종 게이트 — 코치 진단도 현재 업종(s.industry)만 집계. 타 업종 이력 누수 차단.
      const _coachInd = s.industry || "";
      const ps = (filterRealPosts(ctx && ctx.hubPosts) || [])
        .filter(p => !(_coachInd && p && p.industry && p.industry !== _coachInd));
      const now = new Date();
      const sameDay = (d) => { if (!d) return false; const x = new Date(d); return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate(); };
      publishedToday = ps
        .filter(p => p && p.naver_post_url && (sameDay(p.published_at) || sameDay(p.created_at)))
        .map(p => (p.treatment_name || p.keyword || "").trim())
        .filter(Boolean);
    }
    const matchedPublished = (t) => publishedToday.some(pt => pt && (pt.includes(t) || t.includes(pt)));
    const doneTopics = todayTopics.filter(matchedPublished);
    const pendingTopics = todayTopics.filter(t => !matchedPublished(t));
    // [v120] 생성완료(URL 미등록) = 중간상태. 발행 대기 안내용. 완료 판정 아님(완료는 URL 등록뿐).
    let madeNoUrl = [];
    {
      // [v126] 업종 게이트 — 생성완료(URL 미등록) 나열도 현재 업종만. (Image5 라미네이트 무더기 차단)
      const _coachInd = s.industry || "";
      const ps = (filterRealPosts(ctx && ctx.hubPosts) || [])
        .filter(p => !(_coachInd && p && p.industry && p.industry !== _coachInd));
      const now = new Date();
      const sameDay = (d) => { if (!d) return false; const x = new Date(d); return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate(); };
      // [v136] restaurant placeholder name("이 분식집"/"이 순대국집") = 과거 오염 row → 코치 나열에서 제외.
      const _isPlaceholderNm = (nm) =>
        _coachInd === "restaurant" && /^이\s*[가-힣]+(집|식당)$/.test((nm || "").trim());
      madeNoUrl = ps
        .filter(p => p && !p.naver_post_url && sameDay(p.created_at))
        .map(p => {
          const nm = (p.treatment_name || p.keyword || "").trim();
          if (_isPlaceholderNm(nm)) return "";   // 오염 placeholder 숨김
          return nm;
        })
        .filter(Boolean);
      // [v160] 같은 메뉴 중복 생성 압축 — 코치 나열 '족발·족발·보쌈·보쌈' 방지. 순서 보존 dedup.
      madeNoUrl = Array.from(new Set(madeNoUrl));
    }
    return {
      ok: missing.length === 0,
      missing,
      firstTab: missing.length ? missing[0].tab : null,
      missLabels: missing.map(m => m.label).join(" · "),
      name, sub, todayTopics,
      doneTopics, pendingTopics, hasPublishedToday: publishedToday.length > 0,
      madeNoUrl, hasMadeNoUrl: madeNoUrl.length > 0,
    };
  })();


  // [v50] stats 탭 = 채팅 로그(메시지 누적) ─────────────────────────────
  //   단계: intro → pickMain → save (단방향 진행). 도달한 단계 메시지는 위에 남고,
  //   다음 안내가 아래에 쌓인다. 사용자가 "지금 뭘 하는지" 흐름을 위에서부터 읽을 수 있다.
  //   진입(intro)만 타이핑, 이후 추가 메시지는 즉시. save 안내는 주력 선택 2.5초 뒤 등장.
  // [v51] stats 채팅 로그 단계: intro → pickMain → review(상태평가) → save
  //   3단계 코치(intro→pickMain→save). 보조는 선택사항이라 안내 흐름에서 제외.
  //   [v57] 옆에서 코치가 안내하듯 — 시간+행동 혼합 트리거.
  //   intro(입장) → pickMain(첫 조작) → addInfo(6~8초 무조작) → save(주력 선택).
  const STEP_MSGS = {
    intro: {
      tone: "tip",
      lines: ["📋 발행 일정을 자동으로 잡아 드리는 곳입니다."],
    },
    pickMain: {
      tone: "tip",
      lines: ["👉 가장 많이 발행할 주제를 눌러 🔥주력으로 지정해 주세요."],
    },
    addInfo: {
      tone: "tip",
      lines: ["🔍 찾으시는 항목이 없으세요?\n하단의 ‘➕ 없는 항목 추가하기’를 이용하시면 빠른 시간 안에 적용해 드립니다."],
    },
    save: {
      tone: "ok",
      lines: ["✅ 오른쪽 ‘저장하고 달력 반영’을 누르면 완료됩니다."],
    },
    saveCta: {
      tone: "ok",
      lines: ["✅ 설정이 끝났다면 오른쪽 ‘저장하고 달력 반영’을 눌러 주세요.\n다음 단계에서 자동 발행 스케줄을 확인할 수 있습니다."],
    },
    saved: {
      tone: "ok",
      lines: ["✅ 현재 발행 설정이 적용되어 있습니다.",
              "변경하려면 오른쪽 카드를 눌러 수정한 뒤 저장하세요. 지금 일정을 보려면 AI 발행코치로 이동하세요."],
      action: { tab: "coach", label: "📅 AI 발행코치로 이동" },
    },
    // [v62] 요금제(plans) 탭 = 시간 텀만으로 5단계. 행동 트리거 없음(사용자 확정).
    //   설명 → 비교 → 선택기준 → 판단도움 → 마무리. 각 박스는 짧게.
    introPlans: {
      tone: "tip",
      lines: ["📦 여기는 사업 규모에 맞는 요금제를 선택하는 곳입니다."],
    },
    plansDetail: {
      tone: "tip",
      lines: ["현재 4개의 플랜이 준비되어 있습니다.\n하루 몇 건 정도 발행할 계획인지 생각해 보세요."],
    },
    plansChoice: {
      tone: "tip",
      lines: ["꾸준한 발행이 검색 자산을 만듭니다.\n하루 1건은 Basic, 하루 2건은 Standard, 하루 3건 집중 운영은 Pro가 적합합니다."],
    },
    plansGuide: {
      tone: "tip",
      lines: ["검색 상단을 적극적으로 공략하려면 발행량이 중요합니다.\n하루 3건까지 운영하려면 Pro 플랜을 고려해 보세요."],
    },
    plansClosing: {
      tone: "ok",
      lines: ["📞 “블로그 보고 전화드렸는데요…”",
              "오늘 작성한 글이 몇 달 뒤에도 새로운 고객을 데려올 수 있습니다."],
    },
    plansTrial: {
      tone: "ok",
      lines: ["🎁 무료 체험이 가능합니다.\n먼저 3건을 직접 발행해 보시고, 내 사업에 맞는 플랜을 선택해 보세요."],
    },
    // [v66] 마이페이지(account) 탭 = 읽고 나가는 화면 → 시간 텀만(행동 트리거 없음).
    //   역할 안내 → 사용량 → 내역 → 플랜/권한. intro 후 2초 간격 순차.
    introAcct: {
      tone: "tip",
      lines: ["🏠 여기는 내 계정과 사용량을 확인하는 공간입니다."],
    },
    acctNow: {
      tone: "tip",
      lines: ["현재 사용 중인 플랜과\n이번 달 발행 현황을 확인할 수 있습니다."],
    },
    acctInfo: {
      tone: "tip",
      lines: ["📋 업체명 · 업종 · 이메일 · 플랜 정보입니다.",
              "업체 정보 변경은\n‘업체정보’ 메뉴에서 진행할 수 있습니다."],
    },
    acctUse: {
      tone: "tip",
      lines: ["📊 이번 달 발행 · 남은 발행 · URL 등록 완료\n현황을 확인할 수 있습니다."],
    },
    acctHist: {
      tone: "tip",
      lines: ["📁 ‘전체 이용내역 보기’에서는\n생성한 글 · 발행한 글 · 등록한 URL 목록을 확인할 수 있습니다."],
    },
    acctClose: {
      tone: "ok",
      lines: ["사용량을 확인했다면\n‘전체 이용내역 보기’를 눌러 발행한 글 목록을 확인해 보세요."],
    },
    // [v82] 최근발행(posts) — 사용자 동선(눌러볼 것)을 순서대로 짚는 행동형 6단계.
    //   첫 글 제목을 박스에 노출해 "맨 위 글을 눌러보라"를 구체화.
    introPosts: {
      tone: "tip",
      lines: ["발행 후 그대로 운영할 수도,",
              "순위까지 기록해 내 글이 검색에서\n유지되는지, 상승하는지, 사라지는지\n확인할 수도 있습니다."],
    },
    postsNow: {
      tone: "tip",
      lines: [(() => {
        const fp = (filterRealPosts(ctx.hubPosts, _scopeInds) || [])[0]; // [UI-SCOPE-01] 등록 분야 전체
        const t = fp && (fp.title || fp.keyword);
        return t
          ? `👇 맨 위 글 「${String(t).length > 24 ? String(t).slice(0, 24) + "…" : t}」을 눌러보세요.`
          : "👇 맨 위 글을 눌러보세요.";
      })(),
              "내가 발행한 글을 확인할 수 있습니다."],
    },
    postsUrl: {
      tone: "tip",
      lines: ["🔎 돋보기를 누르면\n이 글이 노리는 검색어를 볼 수 있습니다.",
              "예) ‘군포 신경치료’",
              "📄 제목이 보라색인 글은 클릭하면 블로그 글로 바로 열립니다.\n검정색 제목은 아직 URL 미등록 상태라 열리지 않습니다."],
    },
    postsRank: {
      tone: "tip",
      lines: ["🔢 🔎로 검색해 글의 현재 순위를 확인하고 입력하세요.",
              "✓ 한 번 입력하면 24시간 동안 ‘오늘 기록함’으로 잠깁니다.\n중복 입력 걱정 없이 하루 한 번만 확인하면 됩니다.",
              "다음 날 다시 오면 입력칸이 새로 열려요."],
    },
    postsObserve: {
      tone: "tip",
      lines: ["순위를 기록하면",
              "‘글 작성’만 하는 운영과\n‘발행 후 결과까지 확인하는 운영’의\n차이를 볼 수 있습니다."],
    },
    postsClose: {
      tone: "ok",
      lines: ["🟢 순위 입력은 선택사항입니다.",
              "기록이 쌓일수록\n내 글의 생존 여부와\n변화 추이를 더 정확하게 확인할 수 있습니다."],
    },
    // [v86] 발행코치(coach) — 매일 오는 발행 전용 페이지. "글 쓸 준비 점검" 흐름.
    //   introCoach(역할) → coachCheck(점검 중, 항상) → 분기:
    //     · 누락: coachNeed(정지 + 해당 탭 버튼)
    //     · 정상: coachReady(준비 완료) → coachStore(적용 업체정보 이상무) → coachGo(달력 누르세요)
    introCoach: {
      tone: "tip",
      lines: ["🩷 여기는 발행 스케줄에 맞춰 글을 쓰는 곳입니다.\n달력에 잡힌 발행 계획에서 오늘 쓸 글을 바로 만들 수 있어요."],
    },
    coachCheck: {
      tone: "tip",
      lines: ["🔍 글 작성에 필요한 정보를 확인했습니다.\n업체정보와 발행설정이 정상입니다."],
    },
    coachNeed: {
      tone: "warn",
      lines: [coachCheck.ok
        ? "🔍 확인 중…"
        : `⚠️ ${coachCheck.missLabels}이(가) 비어 있습니다.\n글에 녹여야 할 재료가 빠졌습니다 — 먼저 채워 주세요.`],
      action: coachCheck.firstTab
        ? { tab: coachCheck.firstTab, label: coachCheck.firstTab === "stats" ? "📊 발행비율 설정하러 가기" : "🏢 업체정보 입력하러 가기" }
        : undefined,
    },
    coachReady: {
      tone: "ok",
      lines: ["🟢 업체정보·발행설정 확인 완료 — 필수 정보가 모두 정상입니다."],
    },
    // [세션58] 초기 진입 고정 1박스 — 업체정보 탭과 동형(설명은 영상, 텍스트는 행동 하나).
    coachFixed: {
      tone: "ok",
      lines: ["오른쪽 달력에서 오늘 날짜의 발행 항목을 누르면 글쓰기가 시작됩니다.",
              "예정 항목이 없으면 아래 입력창에 바로 주제를 적어 만들 수도 있습니다."],
    },
    coachStore: {
      tone: "ok",
      lines: ["📋 달력에 자동 발행 스케줄이 잡혀 있습니다.",
              `오늘 날짜의 발행 항목을 누르면 그 주제로 글쓰기가 바로 시작됩니다.\n오늘 항목 말고 다른 주제를 쓰고 싶다면, 일단 오늘 항목을 누른 뒤 다음 화면에서 다른 항목을 고르면 됩니다.${coachCheck.name || coachCheck.sub ? "\n\n자동으로 들어갈 정보: " + (coachCheck.name ? "업체명 · " : "") + (coachCheck.sub ? "생활권(" + coachCheck.sub + ") · " : "") + _LX.hoursLabel + " · 주차 안내." : ""}`],
    },
    coachGo: {
      tone: "ok",
      lines: (() => {
        const t = coachCheck.todayTopics;
        // [v120] 생성완료(URL 미등록) 대기 — 완료 아님. 발행 후 URL 등록 유도. 최우선 안내.
        if (coachCheck.hasMadeNoUrl) {
          // [v160] 종류 많으면 앞 6개만 + '외 N건' — 코치 한 줄 폭주 방지.
          const _mn = coachCheck.madeNoUrl;
          const made = _mn.length > 6
            ? _mn.slice(0, 6).join(" · ") + ` 외 ${_mn.length - 6}건`
            : _mn.join(" · ");
          return [`🔵 ${made} 생성 완료 — 아직 발행 전입니다.`,
                  "👉 네이버에 발행한 뒤, 글 주소(URL)를 우측 ‘URL 등록’에 붙여넣으세요.\nURL을 등록해야 순위 추적이 시작되고 다음 글로 넘어갑니다."];
        }
        // [v119] 오늘 분 일부/전부 발행 완료 → "작성 완료 · 다음 예정" 진행상태로 전환(쿼터 숫자 비노출).
        if (coachCheck.hasPublishedToday && coachCheck.doneTopics.length) {
          const done = coachCheck.doneTopics.join(" · ");
          const next = coachCheck.pendingTopics[0];
          if (next) {
            return [`🟢 ${done} 발행 완료`,
                    `👉 다음 예정: ${next}\n달력에서 오늘 날짜의 항목을 누르면 다음 글이 바로 시작됩니다.`];
          }
          return [`🟢 ${done} 발행 완료 — 오늘 예정한 글을 모두 끝냈습니다.`,
                  `👉 다른 ${_LX.itemWord}로 더 쓰려면 우측 ${_LX.itemWord} 목록에서 선택하세요.\n달력에서 다른 날짜의 계획을 눌러 미리 작성해둘 수도 있어요.`];
        }
        return [t.length
          ? `🟢 오늘 예정: ${t.join(" · ")}\n달력에서 오늘 날짜의 항목을 누르면 글쓰기가 바로 시작됩니다.\n다른 ${_LX.itemWord}로 작성하려면 우측 ${_LX.itemWord} 목록에서 선택하세요.`
          : "🟢 준비 완료입니다.\n달력에서 주제 항목을 누르면 그 주제로 글이 바로 생성됩니다."];
      })(),
    },
    // [v114] 시술선택 화면(달력진입 후) 코치 — 처음부터 다시 시작하지 않고 다음 행동 1개만.
    coachPick: {
      tone: "ok",
      lines: (() => {
        // [v136] restaurant=메뉴 / 의료군=시술. ctx.hubStore.industry로 직접 분기(coachCheck 스코프 밖).
        const _ind = (ctx && ctx.hubStore && ctx.hubStore.industry) || "";
        const _r = _ind === "restaurant";
        const _item = _r ? "메뉴" : "시술";
        const _list = _r ? "메뉴 목록" : "시술 목록";
        return [(ctx && ctx.coachPicked) ? `🟢 오늘 예정: ${ctx.coachPicked}\n${_item}가 선택되었습니다.` : `🟢 ${_item}를 선택하세요.`,
                `👉 아래 “${(ctx && ctx.coachPicked) ? ctx.coachPicked + " 글 작성하기" : "글 작성하기"}”를 누르면 글이 생성됩니다.\n👉 다른 ${_r ? "메뉴" : "주제"}로 작성하려면 우측 ${_list}에서 선택하세요.`];
      })(),
    },
    // [v121] 글 생성 중 — 어떤 방식으로 만드는지 + 완료 후 발행 흐름 미리보기(대기 시간 체감 완화).
    // [v127] 진행 단계는 아래 체크리스트로 표시 → '오른쪽 단계' 문구 제거.
    coachGen: {
      tone: "tip",
      lines: ["✍️ 글을 작성하고 있습니다. 보통 20~60초 걸려요.\n아래 단계가 순서대로 진행됩니다."],
    },
    // [v116] 글 생성 완료 — 발행까지 다음 행동을 순서대로 안내.
    coachDone: {
      tone: "ok",
      lines: ["🟢 글이 완성되었습니다.",
              "①  우측 ‘📋 전체 복사’를 눌러 글을 복사합니다.\n②  네이버 블로그에 붙여넣고, 사진은 표시된 위치에 올립니다.\n③  발행한 뒤 글 주소(URL)를 복사해 우측 ‘URL 등록’에 붙여넣으세요.\n   → 순위를 추적해 다음 글이 더 빨리 상단에 갑니다."],
    },
    coachAlt: {
      tone: "guide",
      lines: ["✍️ 정해진 계획 말고 자유롭게 쓰고 싶다면\n상단의 ‘✍️ 글생성’을 누르세요.",
              "달력 글쓰기는 업체정보(업체명·생활권·" + _LX.hoursLabel + "·주차)를 자동으로 녹여 발행용으로 씁니다.\n글생성은 기본정보 없이 원하는 주제만으로 자유롭게 작성합니다 — 누구 부탁받은 글처럼요."],
    },
    // [v78] 업체정보(store) 탭 = 능동 입력 화면. 3단계 위계: 필수 → 권장(주차) → 생활권/추가.
    //   [v79] 진입 후 항상 "분석 중"(storeAnalyzing)을 먼저 보여준 뒤 필수(업체명·주소·업종)만으로 분기.
    //   필수빠짐: introStore → storeAnalyzing → storeNeedBasic(콕 집기) → 멈춤(저장 전까지 메시지 정지).
    //   주차빠짐: introStore → storeAnalyzing → storeAllOk → storeParkRec(권유 톤) → 멈춤.
    //   전부OK:  introStore → storeAnalyzing → storeAllOk → storeEditReady → storeAreaEx → storeAddInfo → storeBrowse.
    introStore: {
      tone: "tip",
      lines: ["🏢 여기는 업체 정보를 관리하는 공간입니다.\n여기서 입력한 정보가 블로그 글에 자동으로 들어갑니다."],
    },
    // ── [v79] 분석 중(항상 노출) ──
    storeAnalyzing: {
      tone: "tip",
      lines: ["🔍 사용자님의 업체 정보를 분석하고 있습니다…"],
    },
    // ── [v79] 필수 모두 정상(통과 톤) ──
    storeAllOk: {
      tone: "ok",
      lines: ["확인했습니다. 필수 정보가 모두 정상입니다."],
    },
    // ── 필수 빠짐(막는 톤) — 동적 구성(판정부) ──
    storeNeedBasic: {
      tone: "tip",
      lines: ["빠진 정보가 있습니다.",
              "우측 위 ‘업종·업체명 수정’을 누른 뒤 비어 있는 항목을 채워주세요."],
    },
    // ── 필수 OK + 주차/대중교통 빠짐(권유 톤) — 동적 구성(판정부) ──
    storeParkRec: {
      tone: "tip",
      lines: ["업체 정보를 확인하고 있습니다.",
              "현재 기본 정보는 입력되어 있습니다.",
              "주차 또는 대중교통 안내가 아직 없습니다.",
              "우측 ‘업종·업체명 수정’ 버튼을 누른 뒤\n방문 안내 정보를 추가해 보세요.",
              "고객이 찾아오는 데 도움이 됩니다."],
    },
    // ── 전부 충족(생활권 흐름) ──
    storeEditReady: {
      tone: "tip",
      lines: ["‘업종·업체명 수정’을 누르면 기본정보를 수정할 수 있습니다."],
    },
    storeAreaEx: {
      tone: "area",
      lines: ["⭐ 여기가 가장 중요한 단계입니다.",
              "생활권 = 고객이 실제로 검색하는 지역.\n발행 제목과 지역 검색 노출을 좌우합니다.",
              "예) 공릉동, 태릉입구역, 하계동\n여러 곳 넣을수록 노출이 넓어집니다.",
              "언제든 자유롭게 바꿔도 됩니다."],
    },
    storeAddInfo: {
      tone: "tip",
      lines: ["생활권이 저장되었습니다. 기본 준비는 끝났습니다.",
              "플레이스·홈페이지·" + _LX.hoursLabel + "을 추가하면\n글에 참고자료로 더 반영됩니다.",
              "필요하면 아래 ‘추가 정보’에서 입력해 두세요."],
    },
    storeBrowse: {
      tone: "ok",
      lines: ["천천히 둘러보고 변경 내용을 확인하세요."],
    },
  };
  // [v57] save 단계 = 평가(전략 유형) → (주력 8개+일 때만)분산 안내 → 저장 안내.
  //   제한·경고 아님. 운영자가 정하는 것이라 중립적으로 비춰주기만 한다.
  if (tabId === "stats" && a.mainCount >= 1) {
    const mc = a.mainCount;
    const styleLabel = mc <= 3 ? "집중형" : mc <= 6 ? "균형형" : "분산형";
    const styleDesc = mc <= 3
      ? "핵심 주제에 집중하는 전략입니다."
      : mc <= 6
        ? "여러 시술을 함께 운영하는 균형형 전략입니다."
        : "다양한 주제를 폭넓게 다루는 전략입니다.";
    // [v-simple] 1줄 상태 + 1줄 CTA. saveCta 박스 비노출이므로 저장 안내를 여기에 포함한다.
    const lines = [`🔥 주력 ${mc}개 선택 · ${styleLabel} — ${styleDesc}`,
                   "✅ 오른쪽 ‘저장하고 달력 반영’을 누르면 완료됩니다."];
    STEP_MSGS.save = { tone: "ok", lines };
  }
  // [v57] 기존 사용자(저장본+계획 있음) intro/saved 박스 = 현재 스케줄 요약.
  //   상세 배분이 아니라 "설정된 스케줄이 있구나" 확인용. 신규는 기존 설명 그대로.
  if (tabId === "stats" && a.isReturning && a.planReady) {
    const mains = (a.savedMainList || []).slice(0, 4);
    const mainsStr = mains.length ? mains.join(", ") : "—";
    const lines = ["📅 현재 자동 발행 스케줄이 설정되어 있습니다.",
                   `이번 달 예정 발행 : ${a.planMonthCount}건\n주력 주제 : ${mainsStr}`,
                   "새로운 전략으로 변경하려면 위쪽 ‘🔄 새로 설정하기’를 눌러주세요."];
    STEP_MSGS.saved = { ...STEP_MSGS.saved, lines };
  }
  const STEP_ORDER = ["intro", "pickMain", "addInfo", "save"];

  // [v78] 업체정보(store) 단계 판정 — hubStore 기준. 3단계 위계.
  //   필수 = 업체명·주소·업종 (없으면 글 생성 불가 → "채워주세요").
  //   권장 = 주차/대중교통 (방문안내. 비면 "추가하면 더 좋아요" 톤, 막지 않음).
  //   선택 = 플레이스·블로그·진료시간 (코치 언급 안 함).
  //   흐름: 필수빠짐(storeNeedBasic) → 주차빠짐(storeParkRec) → 전부OK(storeEditReady…).
  let storeComplete = false;     // 필수+권장(주차)까지 충족 → 생활권 흐름 진입
  let essentialOk = false;       // 필수 3개 충족 여부
  let storeMissing = [];         // 빠진 필수 목록
  let hasSubRegion = false;      // [v79] 생활권(sub_region) 입력 여부
  if (tabId === "store") {
    const s = ctx.hubStore || {};
    const pk = String(s.parking_info || "").trim();
    // [v79] parking_info 포맷 "{상태} · {지하철안내}" 분해.
    //   조건부 필수: '주차 가능' → 지하철 없어도 통과 / '대중교통 이용 추천' → 지하철 안내 필수.
    let parkStatus = "", parkSubway = "";
    if (pk) {
      const sepIdx = pk.indexOf(" · ");
      if (sepIdx >= 0) { parkStatus = pk.slice(0, sepIdx).trim(); parkSubway = pk.slice(sepIdx + 3).trim(); }
      else if (pk.startsWith("주차 가능") || pk.startsWith("대중교통 이용 추천")) { parkStatus = pk; }
      else { parkSubway = pk; } // 옛 자유입력 → 지하철로 흡수
    }
    const isCar     = parkStatus.startsWith("주차 가능");
    const isTransit = parkStatus.startsWith("대중교통 이용 추천");
    const hasSubway = parkSubway.length > 0;
    // 방문안내 충족: 주차가능(지하철 무관) OR 대중교통+지하철 입력. [v126] 필수 아님(권유용 판정만).
    const hasPark        = isCar || (isTransit && hasSubway);
    if (!(s.store_name || "").trim()) storeMissing.push("업체명");
    if (!(s.address || "").trim())    storeMissing.push("주소");
    if (!s.industry)                  storeMissing.push("업종");
    if (!(s.sub_region || "").trim()) storeMissing.push("생활권");   // [v126] 생활권 필수 편입
    essentialOk = storeMissing.length === 0;
    // [v126] 방문안내(주차/대중교통)는 필수 제외 → storeComplete는 필수 4셋만으로 판정.
    //   방문안내 미입력은 '멈춤'이 아니라 '권유(선택)' 톤. 저장·글쓰기 차단하지 않음.
    storeComplete = essentialOk;
    if (!essentialOk) {
      // 1단계: 필수 빠짐 — 막는 톤(채워야 글이 됨).
      const onlySubRegion = storeMissing.length === 1 && storeMissing[0] === "생활권";
      STEP_MSGS.storeNeedBasic = {
        tone: "tip",
        lines: onlySubRegion
          ? ["생활권이 아직 비어 있습니다.",
             "아래 ‘AI 지역 전략’ 박스에서 생활권을 입력하고 저장해 주세요.",
             "생활권 = 고객이 실제로 검색하는 지역(예: 공릉동, 태릉입구역)."]
          : ["빠진 정보가 있습니다.",
             "우측 위 ‘업종·업체명 수정’을 누른 뒤 비어 있는 항목을 채워주세요." +
               (storeMissing.includes("생활권") ? "\n생활권은 아래 ‘AI 지역 전략’ 박스에서 입력합니다." : ""),
             `👉 채울 항목 : ${storeMissing.join(", ")}`],
      };
    } else if (!hasPark) {
      // [v126] 방문안내 미입력 — 선택 항목. 권유 톤(막지 않음).
      STEP_MSGS.storeParkRec = {
        tone: "tip",
        lines: ["기본 정보는 모두 입력되어 있습니다. 바로 글을 쓸 수 있어요.",
                "주차 또는 대중교통 안내를 추가하면\n글 하단 ‘오시는 길’에 함께 반영됩니다. (선택)",
                "필요할 때 ‘업종·업체명 수정’에서 언제든 추가하세요."],
      };
    }
    if (storeComplete) {
      // [세션36] 6박스→3박스 축소. 업체명·업종 표시는 상단 배지가 담당 → 좌측은 정상 확인만.
      STEP_MSGS.storeAnalyzing = {
        tone: "ok",
        lines: ["🔍 업체 정보 분석 완료 — 필수 정보가 모두 정상입니다.",
                "업종·업체명은 위 ‘업종·업체명 수정’에서 언제든 바꿀 수 있어요."],
      };
      STEP_MSGS.storeEditReady = { tone: "tip", lines: [] }; // [세션36] 병합됨 — 빈 단계(렌더 스킵)
      // [v79] 생활권(sub_region) 입력 유무로 storeAreaEx 분기.
      hasSubRegion = !!(s.sub_region || "").trim();
      if (hasSubRegion) {
        // 입력됨 → 통과 톤(정상 입력) + 활용 설명. [세션36] 마지막 박스(체인 종료).
        STEP_MSGS.storeAreaEx = {
          tone: "area",
          lines: ["✅ 생활권 입력 완료 — 기본 준비가 끝났습니다.",
                  `현재 생활권 : ${(s.sub_region || "").trim()}`,
                  "아래 ‘방문정보’를 채우면 글이 더 풍부해집니다. 천천히 둘러보세요."],
        };
      } else {
        // 비어있음 → 입력 유도(멈춤).
        STEP_MSGS.storeAreaEx = {
          tone: "area",
          lines: ["⭐ 생활권 입력을 안 하셨네요. 여기가 가장 중요한 단계입니다.",
                  "생활권 = 고객이 실제로 검색하는 지역.\n발행 제목과 지역 검색 노출을 좌우합니다.",
                  "오른쪽 ‘생활권’ 칸에 입력 후 ‘생활권 저장’을 눌러주세요."],
        };
      }
    }
  }



  // 현재 도달 단계 산출 — [v57] 옆에서 코치가 안내하듯, 행동+시간 트리거.
  //   · intro      : 입장 즉시(항상)
  //   · pickMain   : 사용자가 카드를 만지기 시작(weightsDirty)했지만 주력 0
  //   · addInfo    : 주력 0 + 6~8초 무조작(browseElapsed) — pickMain과 함께 누적
  //   · save       : 주력 1개 이상
  //   신규는 전부 보조로 시작하므로 onCount는 항상 >0 → '첫 조작'은 weightsDirty로 본다.
  let curStep = null;
  if (tabId === "stats") {
    const editing = ctx.weightsDirty === true;
    if (a.isReturning && !editing && a.onCount > 0 && a.mainCount > 0) curStep = "saved";
    else if (a.mainCount >= 1) curStep = "save";          // 주력 선택됨 → 저장 안내
    else if (editing) curStep = "pickMain";               // 카드 만지는 중, 주력 아직 0
    else curStep = "intro";                               // 입장 직후(아직 무조작)
  } else if (tabId === "plans") {
    curStep = "introPlans";                               // [v58] 요금제 = 역할 안내 1단계 고정
  } else if (tabId === "account") {
    curStep = "introAcct";                                // [v66] 마이페이지 = 역할 안내 1단계 고정
  } else if (tabId === "posts") {
    curStep = "introPosts";                               // [v81] 최근발행 = 역할 안내 1단계 고정(이후 시간텀 체인)
  } else if (tabId === "coach") {
    curStep = "introCoach";                               // [v86] 발행코치 = 역할 안내 1단계 고정(이후 시간텀 6단계)
  } else if (tabId === "store") {
    curStep = "introStore";                               // [v78] 업체정보 = 역할 안내 1단계 고정(이후 시간텀 체인)
  }

  // [v53] 단계별 타이핑 — intro·pickMain·save는 박스 등장 시 타이핑. review만 즉시(개수 실시간 변동).
  //   typedLen[step] = 현재까지 친 글자 수, doneSteps[step] = 완료 여부.
  const [typedLen, setTypedLen] = useState({});   // { intro: 12, pickMain: 40, ... }
  const [doneSteps, setDoneSteps] = useState({});
  // [v57] 주력 0인 채로 일정 시간(6~8초) 무조작 시 '항목 추가' 안내를 띄우는 idle 플래그.
  const [browseElapsed, setBrowseElapsed] = useState(false);
  // [v57] save 단계에서 addInfo가 뜬 뒤 다시 3초 무조작이면 저장 유도(saveCta) 박스를 띄운다.
  const [ctaElapsed, setCtaElapsed] = useState(false);
  // [v59] 요금제 탭: intro 타이핑 후 3초 지나면 plansDetail(4개 플랜 안내)을 띄운다.
  const [plansElapsed, setPlansElapsed] = useState(false);
  // [v60] plansDetail 타이핑 후 2초 지나면 plansChoice(플랜별 한 줄 설명)을 띄운다.
  const [choiceElapsed, setChoiceElapsed] = useState(false);
  // [v61] plansChoice 타이핑 후 2초 지나면 plansClosing(검색 자산 마무리)을 띄운다.
  const [closingElapsed, setClosingElapsed] = useState(false);
  // [v62] plansChoice 후 plansGuide(Basic/Standard 안내), 그 후 plansClosing. 단계 하나 추가.
  const [guideElapsed, setGuideElapsed] = useState(false);
  // [v64] plansClosing 후 plansTrial(무료체험 유도) 마무리 단계.
  const [trialElapsed, setTrialElapsed] = useState(false);
  // [v80] 마이페이지(account) 6단계 시간텀 체인(전부 타이핑, 각 2초):
  //   introAcct(역할) → acctNow(현황) → acctInfo(계정정보) → acctUse(사용량) → acctHist(이용내역) → acctClose(마감)
  const [acctS2, setAcctS2] = useState(false);  // intro → acctNow
  const [acctS3, setAcctS3] = useState(false);  // acctNow → acctInfo
  const [acctS4, setAcctS4] = useState(false);  // acctInfo → acctUse
  const [acctS5, setAcctS5] = useState(false);  // acctUse → acctHist
  const [acctS6, setAcctS6] = useState(false);  // acctHist → acctClose
  // [v81] 최근발행(posts) 6단계 체인 elapsed: introPosts→postsNow→postsUrl→postsRank→postsObserve→postsClose.
  const [postsS2, setPostsS2] = useState(false);  // intro → postsNow
  const [postsS3, setPostsS3] = useState(false);  // postsNow → postsUrl
  const [postsS4, setPostsS4] = useState(false);  // postsUrl → postsRank
  const [postsS5, setPostsS5] = useState(false);  // postsRank → postsObserve
  const [postsS6, setPostsS6] = useState(false);  // postsObserve → postsClose
  // [v86] 발행코치(coach) 점검 흐름:
  //   introCoach → coachCheck → 분기(coachNeed 정지 | coachReady → coachStore → coachGo)
  const [coachS2, setCoachS2] = useState(false);  // introCoach → coachCheck
  const [coachS3, setCoachS3] = useState(false);  // coachCheck → 분기(coachNeed | coachReady)
  const [coachS4, setCoachS4] = useState(false);  // coachReady → coachStore
  const [coachS5, setCoachS5] = useState(false);  // coachStore → coachGo
  const [coachS6, setCoachS6] = useState(false);  // (예약 — 미사용)
  // [v78] 업체정보(store) 시간텀 체인:
  //   [v79] introStore →(2s) storeAnalyzing →(2s) [필수빠짐: storeNeedBasic 멈춤 | 필수OK: storeAllOk → …]
  //   기존: introStore →(2s) storeEditReady →(2s) storeAreaEx →(3s) storeAddInfo →(2s) storeBrowse.
  const [storeS2, setStoreS2] = useState(false);   // intro 후 2s → storeAnalyzing
  const [storeSA, setStoreSA] = useState(false);   // [v79] storeAnalyzing 후 2s → 분기(needBasic / allOk)
  const [storeS3, setStoreS3] = useState(false);
  const [storeS4, setStoreS4] = useState(false);
  const [storeS5, setStoreS5] = useState(false);
  const [storeS6, setStoreS6] = useState(false);   // [v79] storeAddInfo 후 2s → storeBrowse
  const TYPING_STEPS = ["intro", "introPlans", "plansDetail", "plansChoice", "plansGuide", "plansClosing", "plansTrial", "introAcct", "acctNow", "acctInfo", "acctUse", "acctHist", "acctClose", "introPosts", "postsNow", "postsUrl", "postsRank", "postsObserve", "postsClose", "introCoach", "coachCheck", "coachNeed", "introStore", "storeAnalyzing", "storeAllOk", "storeNeedBasic", "storeParkRec", "storeEditReady", "storeAreaEx", "storeAddInfo", "storeBrowse"]; // [v78][v79][v80][v81][v86][v87 coachReady/Store/Go 즉시출력][v112 introCoach 타이핑]
  // 각 단계의 전체 텍스트(줄을 \n로 결합) — 타이핑 길이 계산용
  const stepFullText = (s) => (STEP_MSGS[s]?.lines || []).join("\n");

  // 현재 표시돼야 할 마지막 단계 인덱스 — 그 단계가 새로 보이면 타이핑 시작.
  //   [v57] 균일 18ms → 사람이 치는 듯한 가변 리듬. 글자별로 딜레이를 달리해 "딱딱함"을 줄인다.
  //     · 기본 18ms ± 약간의 랜덤 흔들림
  //     · 쉼표·가운뎃점 뒤 짧은 멈칫, 마침표·물음표·느낌표 뒤 긴 멈춤
  //     · 줄바꿈(\n) 뒤엔 한 박자 쉼 — 새 문장이 또박또박 시작되는 느낌
  const typingTimers = useRef({});
  const charDelay = (prevCh) => {
    if (prevCh === "\n") return 280;                       // 줄바꿈 후 한 박자
    if (".!?".includes(prevCh)) return 320;                // 문장 끝 긴 멈춤
    if (",·…".includes(prevCh)) return 150;                // 쉼표/가운뎃점 짧은 멈칫
    if (prevCh === " ") return 30;                         // 공백은 빠르게
    return 15 + Math.floor(Math.random() * 18);            // 기본 15~32ms 흔들림
  };
  const startTyping = (s) => {
    if (doneSteps[s] || typedLen[s] != null) return; // 이미 시작/완료
    const full = stepFullText(s);
    setTypedLen(prev => ({ ...prev, [s]: 0 }));
    let i = 0;
    const tick = () => {
      i += 1;
      setTypedLen(prev => ({ ...prev, [s]: i }));
      if (i >= full.length) {
        setDoneSteps(prev => ({ ...prev, [s]: true }));
        return;
      }
      typingTimers.current[s] = setTimeout(tick, charDelay(full[i - 1]));
    };
    typingTimers.current[s] = setTimeout(tick, charDelay(""));
  };

  // stats/plans/account/store 벗어나면 타이핑 상태 초기화(다시 들어오면 처음부터 친다)
  useEffect(() => {
    if (tabId !== "stats" && tabId !== "plans" && tabId !== "account" && tabId !== "posts" && tabId !== "coach" && tabId !== "store") {
      Object.values(typingTimers.current).forEach(t => clearTimeout(t));
      typingTimers.current = {};
      setTypedLen({}); setDoneSteps({}); setBrowseElapsed(false); setCtaElapsed(false); setPlansElapsed(false); setChoiceElapsed(false); setClosingElapsed(false); setGuideElapsed(false); setTrialElapsed(false); setAcctS2(false); setAcctS3(false); setAcctS4(false); setAcctS5(false); setAcctS6(false); setPostsS2(false); setPostsS3(false); setPostsS4(false); setPostsS5(false); setPostsS6(false); setCoachS2(false); setCoachS3(false); setCoachS4(false); setCoachS5(false); setCoachS6(false); setStoreS2(false); setStoreSA(false); setStoreS3(false); setStoreS4(false); setStoreS5(false); setStoreS6(false);
    }
  }, [tabId]);
  // [v58] stats↔plans↔account↔store 전환 시에도 타이핑을 처음부터 — 탭 진입 = 역할 안내 재생.
  useEffect(() => {
    if (tabId === "stats" || tabId === "plans" || tabId === "account" || tabId === "posts" || tabId === "coach" || tabId === "store") {
      Object.values(typingTimers.current).forEach(t => clearTimeout(t));
      typingTimers.current = {};
      setTypedLen({}); setDoneSteps({}); setBrowseElapsed(false); setCtaElapsed(false); setPlansElapsed(false); setChoiceElapsed(false); setClosingElapsed(false); setGuideElapsed(false); setTrialElapsed(false); setAcctS2(false); setAcctS3(false); setAcctS4(false); setAcctS5(false); setAcctS6(false); setPostsS2(false); setPostsS3(false); setPostsS4(false); setPostsS5(false); setPostsS6(false); setCoachS2(false); setCoachS3(false); setCoachS4(false); setCoachS5(false); setCoachS6(false); setStoreS2(false); setStoreSA(false); setStoreS3(false); setStoreS4(false); setStoreS5(false); setStoreS6(false);
    }
  }, [tabId]);
  // [v80] stats 탭 안에서 "새로 설정하기"로 저장본이 풀릴 때(isReturning true→false) 코치 단계 리셋.
  //   탭 전환이 아니라 같은 stats 안의 상태 변화라 위 [tabId] 리셋이 안 걸린다.
  //   리셋 안 하면 직전 saved 단계의 typedLen/doneSteps 잔재 + 새 intro·pickMain이 게이트 없이 동시 출력됨.
  //   → 저장본이 풀린 순간 처음부터(intro→pickMain) 순차 타이핑 재생.
  const prevReturningRef = useRef(a.isReturning);
  useEffect(() => {
    if (tabId !== "stats") { prevReturningRef.current = a.isReturning; return; }
    if (prevReturningRef.current === true && a.isReturning === false) {
      Object.values(typingTimers.current).forEach(t => clearTimeout(t));
      typingTimers.current = {};
      setTypedLen({}); setDoneSteps({}); setBrowseElapsed(false); setCtaElapsed(false);
    }
    prevReturningRef.current = a.isReturning;
  }, [tabId, a.isReturning]);
  // 언마운트 시 잔여 타이머 정리
  useEffect(() => () => { Object.values(typingTimers.current).forEach(t => clearTimeout(t)); }, []);

  // [v57] 둘러보기 idle 타이머 — 카드 만진 뒤(weightsDirty) 7초 무조작 시 '항목 추가' 안내.
  //   pickMain(주력 0)·save(주력 선택 후) 양쪽 모두에서 동작. 조작이 생기면 재시작.
  //   onCount/mainCount/subCount가 바뀌면(=사용자가 카드를 또 눌렀음) 안내를 잠시 내리고 다시 7초 잰다.
  useEffect(() => { setBrowseElapsed(false); setCtaElapsed(false); }, [a.onCount, a.mainCount, a.subCount]);
  useEffect(() => {
    const editing = tabId === "stats" && ctx.weightsDirty === true;
    if (!editing || browseElapsed) return;
    const id = setTimeout(() => setBrowseElapsed(true), 4000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, ctx.weightsDirty, a.onCount, a.mainCount, a.subCount, browseElapsed]);
  // [v57] addInfo(browseElapsed) 노출 후 save 단계에서 3초 더 무조작이면 saveCta.
  useEffect(() => {
    const inSave = tabId === "stats" && ctx.weightsDirty === true && a.mainCount >= 1;
    if (!inSave || !browseElapsed || ctaElapsed) return;
    const id = setTimeout(() => setCtaElapsed(true), 3000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, ctx.weightsDirty, a.mainCount, browseElapsed, ctaElapsed]);
  // [v59] 요금제 탭: intro 타이핑이 끝나면 3초 뒤 plansDetail(4개 플랜 안내)을 띄운다.
  useEffect(() => {
    if (tabId !== "plans" || !doneSteps.introPlans || plansElapsed) return;
    const id = setTimeout(() => setPlansElapsed(true), 3000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.introPlans, plansElapsed]);
  // [v60] plansDetail 타이핑이 끝나면 2초 뒤 plansChoice(플랜별 한 줄 설명)을 띄운다.
  useEffect(() => {
    if (tabId !== "plans" || !doneSteps.plansDetail || choiceElapsed) return;
    const id = setTimeout(() => setChoiceElapsed(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.plansDetail, choiceElapsed]);
  // [v62] plansChoice 타이핑이 끝나면 2초 뒤 plansGuide(Basic/Standard 안내)를 띄운다.
  useEffect(() => {
    if (tabId !== "plans" || !doneSteps.plansChoice || guideElapsed) return;
    const id = setTimeout(() => setGuideElapsed(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.plansChoice, guideElapsed]);
  // [v62] plansGuide 타이핑이 끝나면 2초 뒤 plansClosing(검색 자산 마무리)을 띄운다.
  useEffect(() => {
    if (tabId !== "plans" || !doneSteps.plansGuide || closingElapsed) return;
    const id = setTimeout(() => setClosingElapsed(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.plansGuide, closingElapsed]);
  // [v64] plansClosing 타이핑이 끝나면 2초 뒤 plansTrial(무료체험 유도)을 띄운다.
  useEffect(() => {
    if (tabId !== "plans" || !doneSteps.plansClosing || trialElapsed) return;
    const id = setTimeout(() => setTrialElapsed(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.plansClosing, trialElapsed]);
  // [v80] 마이페이지 6단계 체인 — 각 단계 타이핑 완료 후 2초 뒤 다음 단계.
  useEffect(() => {  // introAcct → acctNow
    if (tabId !== "account" || !doneSteps.introAcct || acctS2) return;
    const id = setTimeout(() => setAcctS2(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.introAcct, acctS2]);
  useEffect(() => {  // acctNow → acctInfo
    if (tabId !== "account" || !doneSteps.acctNow || acctS3) return;
    const id = setTimeout(() => setAcctS3(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.acctNow, acctS3]);
  useEffect(() => {  // acctInfo → acctUse
    if (tabId !== "account" || !doneSteps.acctInfo || acctS4) return;
    const id = setTimeout(() => setAcctS4(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.acctInfo, acctS4]);
  useEffect(() => {  // acctUse → acctHist
    if (tabId !== "account" || !doneSteps.acctUse || acctS5) return;
    const id = setTimeout(() => setAcctS5(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.acctUse, acctS5]);
  useEffect(() => {  // acctHist → acctClose
    if (tabId !== "account" || !doneSteps.acctHist || acctS6) return;
    const id = setTimeout(() => setAcctS6(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.acctHist, acctS6]);
  // [v81] 최근발행 6단계 체인 — 각 단계 타이핑 완료 후 2초 뒤 다음 단계.
  useEffect(() => {  // introPosts → postsNow
    if (tabId !== "posts" || !doneSteps.introPosts || postsS2) return;
    const id = setTimeout(() => setPostsS2(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.introPosts, postsS2]);
  useEffect(() => {  // postsNow → postsUrl
    if (tabId !== "posts" || !doneSteps.postsNow || postsS3) return;
    const id = setTimeout(() => setPostsS3(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.postsNow, postsS3]);
  useEffect(() => {  // postsUrl → postsRank
    if (tabId !== "posts" || !doneSteps.postsUrl || postsS4) return;
    const id = setTimeout(() => setPostsS4(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.postsUrl, postsS4]);
  useEffect(() => {  // postsRank → postsObserve
    if (tabId !== "posts" || !doneSteps.postsRank || postsS5) return;
    const id = setTimeout(() => setPostsS5(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.postsRank, postsS5]);
  useEffect(() => {  // postsObserve → postsClose
    if (tabId !== "posts" || !doneSteps.postsObserve || postsS6) return;
    const id = setTimeout(() => setPostsS6(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.postsObserve, postsS6]);
  // [v113] 발행코치 3박스 — introCoach(역할, 타이핑) →2s coachReady+coachGo(즉시 동시).
  //   coachCheck/coachStore/coachAlt/coachS3는 미사용 보존(옵저버 완성 후 2박스 재편 예정).
  useEffect(() => {  // introCoach 타이핑 완료 → 2s 후 분기(coachReady+coachGo | coachNeed)
    if (tabId !== "coach" || !doneSteps.introCoach || coachS2) return;
    const id = setTimeout(() => setCoachS2(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.introCoach, coachS2]);
  useEffect(() => {  // [v113 미사용 보존] coachCheck → 분기
    if (tabId !== "coach" || !doneSteps.coachCheck || coachS3) return;
    const id = setTimeout(() => setCoachS3(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.coachCheck, coachS3]);
  // [v87] coachReady/coachStore/coachGo는 즉시 동시 출력 — 별도 텀 effect 제거.
  //   (coachS4/coachS5 미사용. render에서 coachS3+ok면 3박스 한꺼번에 push.)
  // [v78][v79] 업체정보 시간텀 체인.
  //   introStore →(2s) storeAnalyzing(항상) →(2s) 분기:
  //     · 필수빠짐(!essentialOk): storeNeedBasic 노출 → 멈춤(저장 전까지 정지).
  //     · 필수OK(essentialOk):    storeAllOk 노출 → 이후 단계 진행.
  //   필수OK일 때만: storeAllOk →(2s) storeEditReady →(2s) storeAreaEx →(3s) storeAddInfo →(2s) storeBrowse.
  //   (주차 빠짐이면 storeComplete=false라 editReady 이후로 안 가고 storeParkRec에서 멈춤 — renderCards 분기.)
  useEffect(() => {
    if (tabId !== "store" || !doneSteps.introStore || storeS2) return;
    const id = setTimeout(() => setStoreS2(true), 2000);   // → storeAnalyzing
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.introStore, storeS2]);
  useEffect(() => {
    // storeAnalyzing 타이핑 완료 후 2s → 분기(needBasic / allOk·parkRec).
    if (tabId !== "store" || !doneSteps.storeAnalyzing || storeSA) return;
    const id = setTimeout(() => setStoreSA(true), 2000);
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, doneSteps.storeAnalyzing, storeSA]);
  useEffect(() => {
    // [v79] storeComplete면 storeAnalyzing 박스가 "정상" 결과 겸함 → 그 타이핑 완료 후 storeEditReady로.
    if (tabId !== "store" || !storeComplete || !storeSA || !doneSteps.storeAnalyzing || storeS3) return;
    const id = setTimeout(() => setStoreS3(true), 2000);   // → storeEditReady
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, storeComplete, storeSA, doneSteps.storeAnalyzing, storeS3]);
  useEffect(() => {
    if (tabId !== "store" || !storeComplete || !doneSteps.storeEditReady || storeS4) return;
    const id = setTimeout(() => setStoreS4(true), 2000);   // → storeAreaEx
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, storeComplete, doneSteps.storeEditReady, storeS4]);
  useEffect(() => {
    // [세션36] 6→3박스 축소: storeAreaEx가 마지막. storeAddInfo/Browse 단계 폐지(진행 차단).
    return;
    /* eslint-disable-next-line */
  }, [tabId, storeComplete, doneSteps.storeAreaEx, storeS5, ctx.hubStore && ctx.hubStore.sub_region]);
  useEffect(() => {
    if (tabId !== "store" || !storeComplete || !doneSteps.storeAddInfo || storeS6) return;
    const id = setTimeout(() => setStoreS6(true), 2000);   // → storeBrowse
    return () => clearTimeout(id);
    /* eslint-disable-next-line */
  }, [tabId, storeComplete, doneSteps.storeAddInfo, storeS6]);

  // 탭별 코치 메시지 — 지금 가진 데이터로만 분기(가벼운 1단계).
  const cards = []; // { lines:[...], recs:[...], tone }

  // [v46] ── 네비게이션 카드(최상단) — "지금 뭘 해야 하는지" 1가지만. 분석보다 먼저. ──
  //   매 단계 끝에 다음 행동 버튼을 달아 흐름이 끊기지 않게 한다(저장→계획→작성→URL→관측→루프).
  const NAV = {
    store:   { tone: "warn", emoji: "🏥", lines: ["먼저 업체정보를 입력하세요.", "생활권(동·역 이름)이 있어야 검색 노출이 시작됩니다."],
               action: { tab: "store", label: "🏥 업체정보 입력하러 가기" } },
    save:    { tone: "warn", emoji: "📊", lines: ["발행비율을 저장하세요.", "주력 1~2개를 🔥로 선택하고 ‘저장하고 달력 반영’을 누르면 추천 계획이 만들어집니다."],
               action: { tab: "stats", label: "📊 발행비율 설정하러 가기" } },
    plan:    { tone: "tip", emoji: "📅", lines: ["설정이 저장됐습니다.", "AI 발행코치에서 이번 달 추천 일정을 확인하세요."],
               action: { tab: "coach", label: "📅 발행코치로 이동" } },
    write:   { tone: "tip", emoji: "✍️", lines: ["✅ 발행비율이 저장되어 추천 일정이 만들어졌습니다.", "달력에서 오늘 날짜의 추천 주제로 글 1건을 작성해 보세요."],
               action: { tab: "coach", label: "✍️ 오늘 계획 보러 가기" } },
    url:     { tone: "tip", emoji: "🔗", lines: ["글을 발행했다면 네이버 URL을 등록하세요.", "URL을 등록해야 실제 발행으로 집계되고 순위 추적이 시작됩니다."],
               action: { tab: "posts", label: "🔗 URL 등록하러 가기" } },
    // [세션59] 관측 화면 제거 — observe 네비 카드 폐기(관측 용어 미노출).
    observe: null,
    loop:    null, // 루프 단계 — 네비 카드 없이 아래 분석 코치로.
  };
  {
    let nav = NAV[a.navStep];
    // [v68] 업종 미확정이면 store 카드를 '업체 등록부터'로 바꿔 안내(생활권 이전 단계).
    if (a.navStep === "store" && !a.hasIndustry) {
      nav = { tone: "warn", emoji: "🏢", lines: ["먼저 업체를 등록하세요.", "업체명과 " + _LX.industryWord + "(업종)를 등록하면 업종에 맞춰 코치·추천이 작동합니다."],
              action: { tab: "store", label: "🏢 업체 등록하러 가기" } };
    }
    // [v48] stats(발행비율) 탭의 save 단계는 아래 "행동 코치"가 단계형으로 전담.
    //   여기서 네비 카드를 또 띄우면 카드가 겹쳐 "한 번에 한 행동"이 깨진다 → stats에서는 생략.
    if (a.navStep === "save" && tabId === "stats") {
      nav = null;
    } else if (a.navStep === "save") {
      // 다른 탭에서 save 단계면 "발행비율로 가서 설정하라"고 유도(주력 선택 여부로 문구 분기).
      if (a.mainCount === 0) {
        nav = { tone: "warn", lines: ["🔥 주력할 진료를 먼저 선택하세요.", "가장 밀고 싶은 진료 1~2개를 🔥 주력으로 올린 뒤 저장하면 됩니다."],
                action: { tab: "stats", label: "📊 발행비율 설정하러 가기" } };
      } else {
        nav = { tone: "tip", lines: [`🔥 주력 ${a.mainCount}개를 선택했습니다.`, "이제 ‘💾 저장하고 달력 반영’을 누르세요. 저장하면 발행코치 달력으로 이동합니다."],
                action: { tab: "stats", label: "📊 발행비율 설정으로 가기" } };
      }
    }
    if (nav) {
      // 현재 보고 있는 탭이 바로 그 행동의 탭이면 이동 버튼은 숨김(이미 여기 있음).
      const sameTab = nav.action && nav.action.tab === tabId;
      cards.push({ tone: nav.tone, lines: nav.lines, recs: [],
                   action: sameTab ? null : nav.action, isNav: true });
    }
  }

  // [v45] 현재 열려있는 화면 사용법 — AI코치 = 화면 안내 + 상태분석. 맨 위 고정.
  const HOWTO = {
    stats: {
      title: "발행비율 설정 방법",
      steps: [
        "카드를 누를 때마다 ❌ 사용 안 함 → 🟡 보조 → 🔥 주력 순서로 바뀝니다.",
        "주력으로 운영할 진료 1~2개만 🔥로 선택하세요. 예) 임플란트 🔥",
        "곁들일 진료는 🟡 보조로. 예) 사랑니 🟡 · 스케일링 🟡",
        "‘저장하고 달력 반영’을 누르면 추천 계획이 생성됩니다.",
      ],
    },
    coach: {
      title: "AI 발행코치 보는 방법",
      steps: [
        "달력의 오늘 날짜를 누르면 그 주제로 글쓰기가 시작됩니다.",
        "계획은 추천일 뿐 — 다른 주제·지역도 자유롭게 쓸 수 있습니다.",
        "발행비율설정에서 비중을 바꾸면 추천 계획이 다시 짜집니다.",
      ],
    },
    posts: {
      title: "최근발행 보는 방법",
      steps: [
        "발행한 글의 네이버 URL을 등록하세요.",
        "URL을 등록하면 그 글의 검색 순위를 추적합니다.",
        "추적 데이터가 다음 글의 상단 노출에 활용됩니다.",
      ],
    },
    survival: {
      title: "관측 화면 보는 방법",
      steps: [
        "발행한 글이 검색에서 살아있는지(Alive) 확인하는 화면입니다.",
        "최근순보다 ‘관련도’ 반응을 우선 보세요.",
        "3건 이상 발행하고 7일 이상 지난 뒤 판단하는 것이 정확합니다.",
      ],
    },
    account: {
      title: "마이페이지 보는 방법",
      steps: [
        "회원정보·사용량·누적 내역을 확인합니다.",
        "사용량은 글을 생성한 시점에 집계됩니다(발행 여부 무관). URL 등록은 별도 표시됩니다.",
        "아래 이용내역을 펼치면 지난 발행 기록을 볼 수 있습니다.",
      ],
    },
    plans: {
      title: "요금제 보는 방법",
      steps: [
        "플랜별 월 발행 한도를 비교하는 화면입니다.",
        "한도는 글을 생성한 횟수 기준으로 차감됩니다(발행 여부 무관).",
        "사용량이 한도에 가까워지면 상위 플랜을 고려하세요.",
      ],
    },
    store: {
      title: "업체정보 입력 방법",
      steps: [
        "필수 — 업체명·주소·전화·생활권. 생활권(동·역 이름)이 검색 노출의 핵심입니다.",
        "선택 — 주차정보(상태 선택 + 지하철 안내)는 방문 편의 문맥에 쓰입니다.",
        "주소를 입력하면 대표지역이 자동으로 잡힙니다.",
        _LX.hoursLabel + "·플레이스·블로그는 ‘추가 정보’에 넣어두면 됩니다(없어도 글 생성 가능).",
      ],
    },
  };
  const howto = HOWTO[tabId];
  // [v48] stats(발행비율)는 행동 코치(단계형)가 전담 → 설명서형 HOWTO 노출 안 함.
  // [v58] plans(요금제)도 타이핑 코치(introPlans)가 전담 → HOWTO 정적 카드 제외.
  // [v121] survival(관측)은 미등록 시 등록 게이트(NAV)만 노출 → HOWTO 게이트 뒤로.
  const _survivalGated = (tabId === "survival" && !a.hasStore);
  if (howto && tabId !== "stats" && tabId !== "plans" && tabId !== "account" && tabId !== "posts" && tabId !== "coach" && !_survivalGated) {
    cards.push({ tone: "guide", lines: [howto.title], recs: howto.steps, isHowto: true });
  }

  // 공통 결핍 경고를 항상 먼저
  a.blocks.forEach(b => cards.push(b));

  if (tabId === "store") {
    if (a.subRegion && (a.region || a.address)) {
      cards.push({ tone: "ok", lines: ["기본 정보가 채워져 있습니다.", "추가 정보(전화·주차·플레이스)는 글의 신뢰도를 높여줍니다."], recs: [] });
    }
  } else if (tabId === "stats") {
    // [v50] stats는 채팅 로그(누적)로 렌더 단계에서 직접 구성한다. 여기선 카드를 만들지 않는다.
    //   (NAV/blocks/howto도 stats에선 제외 — 동선 흐름만 보여준다.)
  } else if (tabId === "coach") {
    // [v86] coach는 채팅형 6단계 체인(renderCards=log)으로 전담 → 아래 cards는 미사용(무해).
    //   [v46] 진행 상태 체크리스트 — "지금 할 일"은 상단 네비 카드가 안내. 여기선 전체 진행도만 한눈에.
    const ck = (done, label) => `${done ? "✅" : "⬜"} ${label}`;
    cards.push({
      tone: a.onbStage === "operating" ? "ok" : "tip",
      lines: [
        "전체 진행 상황",
        ck(a.hasStore,     "① 업체정보 입력 (대표지역·생활권)"),
        ck(a.hasWeights,   "② 발행비율 설정"),
        ck(a.hasPublished, "③ 첫 글 작성·발행"),
        ck(a.hasUrl,       "④ 네이버 URL 등록"),
      ],
      recs: [],
    });

    // 운영 단계에서만 플랜 한도/권장량 안내
    if (a.onbStage === "operating") {
      const q = ctx.quotaInfo || {};
      const lim = Number.isFinite(q.monthly_quota) ? q.monthly_quota : null;
      const rem = Number.isFinite(q.remaining) ? q.remaining
                : (lim != null && Number.isFinite(q.monthly_publish) ? Math.max(0, lim - q.monthly_publish) : null);
      const planName = q.plan_id ? String(q.plan_id).toUpperCase() : "FREE";
      const isOwner = q.bypass === true || q.reason === "OWNER_BYPASS";
      if (!isOwner && lim != null) {
        const recs = [`권장 발행량: 월 ${lim}건`];
        // [MYPAGE-SUBSCRIPTION-PERIOD-DISPLAY-01] 집계 기간은 서버 period_basis 를 따른다.
        const _pl = q.period_basis === "subscription" ? "이용기간" : "이번 달";
        if (rem != null) recs.push(rem > 0 ? `${_pl} 남은 발행: ${rem}건` : `${_pl} 한도 소진 — 새 이용권 구매 시 바로 이어집니다`);
        cards.push({ tone: rem === 0 ? "warn" : "tip",
          lines: [`현재 ${planName} 플랜입니다.`, `달력의 계획은 플랜 한도(${lim}건) 기준 추천입니다(강제 아님).`],
          recs });
      }
      cards.push({ tone: "ok",
        lines: ["계획은 AI 추천입니다 — 따라야 하는 의무는 없습니다.", "달력의 오늘 날짜를 누르면 그 주제로 글쓰기가 시작됩니다.", "원하는 주제·지역을 직접 입력해 써도 됩니다."],
        recs: [] });
    }
  } else if (tabId === "posts") {
    // [v81] posts는 채팅형 6단계 체인(renderCards=log)으로 전담 → 아래 cards는 미사용(무해).
    if (a.postCount === 0) {
      cards.push({ tone: "tip", lines: ["아직 발행한 글이 없습니다.", "글을 생성·발행하고 URL을 등록하면 여기서 순위를 추적합니다."], recs: [] });
    } else {
      cards.push({ tone: "ok", lines: [`발행 글 ${a.postCount}건을 추적 중입니다.`, "URL 등록 후 순위를 입력하면 생존 여부를 확인할 수 있습니다."], recs: [] });
    }
  } else if (tabId === "survival") {
    // [v121] 미등록이면 NAV 등록 게이트만 노출 → 정적 안내 카드 생략.
    if (!a.hasStore) {
      // (등록 게이트는 위 NAV에서 처리됨)
    } else if (a.observed === 0) {
      // [v-obs1] 0건 = 대기실 톤. 행동(URL 등록) 유도.
      cards.push({ tone: "tip", lines: ["관측 데이터를 수집하고 있습니다.", "발행한 글의 URL을 등록하면 검색 노출 상태를 추적합니다."], recs: [],
        action: { tab: "posts", label: "🔗 URL 등록하러 가기" } });
    } else if (a.observed < 3) {
      // [v-obs2] 1~2건 = 판단 이른 단계. 3건부터 내 계정 분석 시작.
      cards.push({ tone: "tip", lines: ["관측 데이터를 모으는 중입니다.", "URL을 3건 이상 등록하면 내 글의 노출 상태를 확인할 수 있습니다."], recs: [] });
    } else {
      // [v-obs2] 3건+ = 내 계정 분석 노출. 충분.
      cards.push({ tone: "ok", lines: [`관측 ${a.observed}건이 쌓였습니다.`, "유지·이탈 상태와 살아있는 글 비율을 오른쪽에서 확인하세요."], recs: [] });
    }
  } else if (tabId === "account") {
    // [v66] 정적 안내 제거 — introAcct 타이핑 코치가 역할 안내 전담(시간 텀 4단계).
  } else if (tabId === "plans") {
    // [v58] 정적 안내 제거 — introPlans 타이핑 코치가 역할 안내 전담.
  }

  // 진단할 게 전혀 없으면(완벽 상태) 기본 안내 한 줄
  if (cards.length === 0) {
    cards.push({ tone: "ok", lines: ["지금은 특별히 조정할 항목이 없습니다.", "오른쪽 화면에서 작업을 이어가세요."], recs: [] });
  }

  // [v50] stats 채팅 로그 구성 — 도달한 단계들을 순서대로 쌓는다(기존 메시지 유지).
  //   saved 단계는 별개(기존 사용자) → 단독 표시. intro/pickMain/save는 누적.
  let renderCards = cards;
  if (tabId === "plans") {
    // [세션59] 요금제 코치 — store 동형. 1박스 즉시출력(타이핑·누적 폐기). 설명은 영상이 담당.
    renderCards = [{ tone: "tip", _step: "plansFixed",
      lines: ["하루 몇 건을 발행할지에 맞춰 플랜을 고르면 됩니다.",
              "먼저 3건까지 무료로 써보고 정해도 됩니다."] }];
  } else if (tabId === "account") {
    // [세션59] 마이페이지 코치 — store 동형. 1박스 즉시출력(타이핑·누적 폐기). 설명은 영상이 담당.
    renderCards = [{ tone: "tip", _step: "acctFixed",
      lines: [`계정 정보와 ${(ctx && ctx.quotaInfo && ctx.quotaInfo.period_basis === "subscription") ? "이용기간" : "이번 달"} 사용량을 확인하는 공간입니다.`,
              "지난 발행 기록은 아래 ‘전체 이용내역 보기’에서 확인하세요."] }];
  } else if (tabId === "posts") {
    // [세션59] 최근발행 코치 — store 동형. 1박스 상태 분기, 타이핑·누적 폐기(설명은 영상이 담당).
    //   체인: 발행 없음 → URL 미등록 → 순위 입력/관측.
    let _pcard;
    if (a.postCount === 0) {
      _pcard = { tone: "warn", lines: ["아직 발행한 글이 없습니다.", "AI 글쓰기에서 글을 만들고 네이버에 발행하세요."],
                 action: { tab: "coach", label: "AI 글쓰기로 가기" } };
    } else if (!a.hasUrl) {
      _pcard = { tone: "warn", lines: ["발행한 글의 주소를 등록해주세요.", "맨 위 글을 눌러 네이버 URL을 넣으면 순위 기록이 시작됩니다."] };
    } else {
      _pcard = { tone: "ok", lines: ["순위는 매일 재지 않아도 됩니다.", "일주일에 한두 번 내 글 순위를 확인하면 상단 노출에 도움이 됩니다."] };
    }
    renderCards = [{ ..._pcard, _step: "postsFixed" }];
  } else if (tabId === "coach") {
    // [v86] 발행코치 점검 흐름 — introCoach →2s coachCheck →2s 분기.
    //   누락: coachNeed(정지). 정상: coachReady →2s coachStore →2s coachGo.
    // [v63] 이번 달 생성 한도 소진 시: 좌측 코치를 소진 전용 안내로 교체(라미네이트 생성완료/URL등록 등 미노출).
    //   판정은 ctx.quotaInfo 기준(NavPanel quotaSoldOut와 동일식). OWNER 무제한·미연동(null)은 미적용.
    const _cq = (ctx && ctx.quotaInfo) || {};
    const _cqUnlimited = _cq.bypass === true || _cq.reason === "OWNER_BYPASS";
    const _cqUsed  = Number.isFinite(_cq.monthly_publish) ? _cq.monthly_publish : null;
    const _cqLimit = Number.isFinite(_cq.monthly_quota)   ? _cq.monthly_quota   : null;
    const _cqRemain = Number.isFinite(_cq.remaining) ? _cq.remaining
      : ((_cqLimit != null && _cqUsed != null) ? Math.max(0, _cqLimit - _cqUsed) : null);
    const coachSoldOut = !_cqUnlimited && Number.isFinite(_cqRemain) && _cqRemain <= 0;
    // [MYPAGE-SUBSCRIPTION-PERIOD-DISPLAY-01] 프론트 기간 추정 금지.
    //   유료 구독의 이용기간은 결제일 기준 +1개월이다. 달력 1일이 아니다.
    //   서버(check-quota)가 period_basis / period_end 로 정답을 내려주므로 표시만 한다.
    //   Free/비구독(calendar)은 종료일을 표시하지 않는다 — period_end 는 다음 달 1일 00:00 이라
    //   그대로 쓰면 "종료일"과 어긋나고, -1일 보정은 프론트 추정이 되므로 금지.
    const _cqLabel = _cq.period_basis === "subscription" ? "이용기간" : "이번 달";
    const _periodEndText = (() => {
      if (_cq.period_basis !== "subscription" || !_cq.period_end) return null;
      const d = new Date(_cq.period_end);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    })();
    const visible = [];
    if ((ctx && ctx.coachStage) === "generating") {
      // [v130] 생성 중 안내 카드 제거 — 아래 진행 Hero(GeneratingProgress)가 동일 내용을 대체. 3중 중복 해소.
    } else if ((ctx && ctx.coachStage) === "result") {
      visible.push("coachDone");         // [v116] 글 완성 — 복사·발행·URL 등록 안내
    } else if ((ctx && ctx.coachStage) === "analysis") {
      // [v128] 추천 글 방향(AnalysisBoard) 화면 = 우측 보드만 사용. 좌측 코치 카드 없음.
      //   사용자는 이미 시술선택→방향선택으로 진입. 좌측 코치(발행/URL 안내)가 다시 뜨면 중복+stage 불일치.
      //   visible 비움 → 코치 헤더만 남고 안내 카드 미노출. coachGo의 'hasMadeNoUrl 생성완료' 오노출 차단.
    } else if ((ctx && ctx.coachStage) === "treatment") {
      // [v114] 달력 클릭 후 시술선택 화면 — 인트로 반복 없이 '선택 완료 → 작성 버튼' 단계만.
      visible.push("coachPick");
    } else {
      // [세션58] 초기 진입(달력) = 고정 1박스로 통일(업체정보 탭과 동형).
      //   타이핑·누적·introCoach 폐기. 소진/누락은 종전 유지(정지 흐름 보존).
      if (coachSoldOut) {
        visible.push("coachSoldOut");
      } else if (coachCheck.ok) {
        visible.push("coachFixed");     // 고정 1박스
      } else {
        visible.push("coachNeed");      // 누락 → 정지(저장 전까지 멈춤)
      }
    }
    const log = [];
    let typingGateOpen = true;
    for (const s of visible) {
      const m = STEP_MSGS[s];
      if (!typingGateOpen) break;
      // [v63] 소진 전용 박스 — 즉시 출력(타이핑 없음). 계획 단계 자유 + 다음 생성일 안내.
      if (s === "coachSoldOut") {
        log.push({
          tone: "warn",
          lines: [
            `🔒 ${_cqLabel} 생성 한도를 모두 사용했습니다.`,
            `✅ ${_cqLabel} 발행 기록은 달력에서 확인할 수 있습니다.\n📝 다음 기간 발행 전략은 지금 미리 설정할 수 있습니다.`,
            ...(_periodEndText ? [`📅 현재 이용기간 종료일 : ${_periodEndText}`] : []),
            "💎 새 이용권을 구매하면 결제 시점부터 바로 다시 생성할 수 있습니다.",
          ],
          _step: s,
        });
        continue;
      }
      // [v111] coachDone = 동작 감지형 순차 노출. 행동을 감지할 때마다 다음 박스만 나타남.
      //   ① 인트로+전체복사 → (복사 감지) → ② 사진준비+네이버발행 → (탭복귀 감지) → ③ URL등록 → (등록) ✅완료
      if (s === "coachDone") {
        const copied  = !!(ctx && ctx.doneCopied);
        const naver   = !!(ctx && ctx.doneNaver);
        const urlDone = !!(ctx && ctx.doneUrl);

        // [v134] 흐름 체크리스트는 좌측 ResultSummary가 단독 소유(중복 제거).
        //   여기는 "지금 할 일 1개"만 안내한다.
        if (!copied) {
          log.push({ tone: "ok", lines: [
            "우측 ‘📋 전체 복사’를 눌러 글을 복사하세요.",
          ], _step: s });
        } else if (!naver) {
          log.push({ tone: "ok", lines: [
            "네이버 블로그에 붙여넣은 뒤, 제목 줄을 잘라 맨 위 제목칸으로 옮기세요.",
            "본문의 [이미지: …] 위치에 사진을 넣고 발행하면 됩니다.",
            (ctx && ctx.donePhoto) ? "" : "사진이 없다면 ‘🖼️ 사진편집기’에서 먼저 준비할 수 있습니다. (선택)",
          ].filter(Boolean), _step: s });
        } else if (!urlDone) {
          log.push({ tone: "ok", lines: [
            "발행한 글 주소(URL)를 우측 ‘URL 등록’에 붙여넣으세요.",
            "URL을 등록해야 검색 순위 추적이 시작됩니다.",
          ], _step: s });
        } else {
          log.push({ tone: "ok", lines: [
            "순위 추적이 시작되었습니다.",
            "순위를 추적해 다음 글이 더 빨리 상단에 갑니다.",
          ], _step: s });
        }
        continue;
      }
      if (!TYPING_STEPS.includes(s)) {
        // [v87] coachReady/Store/Go/Alt = 타이핑 없이 즉시 완성본. 게이트 막지 않음.
        log.push({ ...m, _step: s });
      } else if (doneSteps[s]) {
        log.push({ ...m, _step: s });
      } else {
        const full = stepFullText(s);
        const n = typedLen[s] || 0;
        log.push({ tone: m.tone, lines: [full.slice(0, n)], action: undefined, _step: s, _typing: true });
        typingGateOpen = false;
      }
    }
    renderCards = log;
  } else if (tabId === "store") {
    // [세션58] 업체정보 코치 — 1박스 상태 분기. 타이핑·누적 폐기.
    //   설명은 영상이 담당. 텍스트는 "지금 할 행동" 하나만.
    //   체인: 업체명·주소 → 전화번호 → 생활권 → 완료(발행비율 이동).
    //   진료과는 판정 제외(다중과·업종별 상이).
    //   ※ 타 탭은 종전 유지. 페이지별 순차 전환 예정.
    const _st = (ctx && ctx.hubStore) || {};
    const _has = (k) => !!String(_st[k] || "").trim();
    let _card;
    if (!_has("store_name") || !_has("address")) {
      _card = { tone: "warn", lines: ["업체 정보를 입력해주세요.", "업체명과 주소가 있어야 글을 만들 수 있습니다."] };
    } else if (!_has("phone")) {
      _card = { tone: "warn", lines: ["전화번호를 입력해주세요.", "「업종·업체명 수정」에서 대표번호를 넣을 수 있습니다."] };
    } else if (!_has("sub_region")) {
      _card = { tone: "warn", lines: ["생활권을 입력해주세요.", "동·역 이름 3~5개를 쉼표로 구분해 넣고 저장하세요."] };
    } else {
      _card = { tone: "ok", lines: ["업체 정보 입력이 끝났습니다.", "이제 발행비율을 설정하면 글쓰기를 시작할 수 있습니다."],
                action: { tab: "stats", label: "발행비율 설정하기" } };
    }
    renderCards = [{ ..._card, _step: "storeFixed" }];
  } else if (tabId === "stats") {
    const log = [];
    if (curStep === "saved") {
      // 기존 운영자: 누적 흐름 없이 스케줄 요약 박스만 — 즉시 출력.
      log.push({ ...STEP_MSGS.saved, _step: "saved" });
    } else {
      // [v57] 누적 표시 규칙(옆에서 안내하는 흐름):
      //   intro    : 항상
      //   pickMain : curStep이 pickMain 이후(카드 조작 시작)
      //   addInfo  : pickMain 중 + 6~8초 무조작(browseElapsed)일 때만 — 주력 생기면 사라짐
      //   save     : 주력 선택됨
      // [v-simple] 코치 단순화 — intro → pickMain → save 3박스만. addInfo/saveCta 노출 중단.
      const visible = ["intro"];
      if (curStep === "pickMain") {
        visible.push("pickMain");
      } else if (curStep === "save") {
        visible.push("pickMain", "save");
      }

      // [v55] 순차 노출 게이트 — 앞선 타이핑 단계가 끝나기 전엔 다음 타이핑 박스를 렌더하지 않는다.
      let typingGateOpen = true;
      for (const s of visible) {
        const m = STEP_MSGS[s];
        if (TYPING_STEPS.includes(s)) {
          if (!typingGateOpen) break; // 앞 타이핑 미완료 → 이후 박스 대기(빈 박스 동시 노출 방지)
          const done = doneSteps[s];
          if (done) {
            log.push({ ...m, _step: s });
          } else {
            const full = stepFullText(s);
            const n = typedLen[s] || 0;
            log.push({ tone: m.tone, lines: [full.slice(0, n)], action: undefined, _step: s, _typing: true });
            typingGateOpen = false; // 이 단계 끝날 때까지 다음 타이핑 박스 잠금
          }
        } else {
          log.push({ ...m, _step: s });
        }
      }
    }
    renderCards = log;
  }

  // [v53] 타이핑 트리거 — 화면에 표시 중인 타이핑 단계 중 아직 시작 안 한 것을 친다.
  //   렌더 중 호출 금지 → useEffect로. visibleSteps 의존.
  const visibleTypingSteps = renderCards.filter(c => c._typing || (c._step && TYPING_STEPS.includes(c._step))).map(c => c._step);
  const visibleKey = visibleTypingSteps.join(",");
  useEffect(() => {
    if (tabId !== "stats" && tabId !== "plans" && tabId !== "account" && tabId !== "posts" && tabId !== "coach" && tabId !== "store") return;
    // [v55] 순차 타이핑 — 앞 단계가 끝나야(done) 다음 단계가 시작된다(동시 노출 방지).
    //   화면에 보이는 타이핑 단계를 STEP_ORDER 순으로 보고, 첫 미완료 단계 하나만 친다.
    // [v57] saved(기존 사용자 요약)는 STEP_ORDER 밖이라 별도로 트리거.
    // [v58] introPlans(요금제 역할 안내)도 STEP_ORDER 밖 — 별도 트리거.
    const orderRef = [...STEP_ORDER, "saved", "introPlans", "plansDetail", "plansChoice", "plansGuide", "plansClosing", "plansTrial", "introAcct", "acctNow", "acctInfo", "acctUse", "acctHist", "acctClose", "introPosts", "postsNow", "postsUrl", "postsRank", "postsObserve", "postsClose", "introCoach", "coachCheck", "coachNeed", "coachReady", "coachStore", "coachGo", "introStore", "storeAnalyzing", "storeAllOk", "storeNeedBasic", "storeParkRec", "storeEditReady", "storeAreaEx", "storeAddInfo", "storeBrowse"];
    const ordered = orderRef.filter(s => TYPING_STEPS.includes(s) && visibleTypingSteps.includes(s));
    for (const s of ordered) {
      if (doneSteps[s]) continue;      // 이미 끝남 → 다음 단계 검토
      startTyping(s);                  // 아직 안 끝난 첫 단계만 시작
      break;                           // 그 뒤 단계는 이번엔 대기
    }
    /* eslint-disable-next-line */
  }, [visibleKey, tabId, doneSteps]);

  const toneColor = (t) => t === "warn" ? "#c62828" : t === "ok" ? "#2E7D32" : t === "guide" ? "#6A1B9A" : t === "area" ? "#B8860B" : "#1565C0";
  const toneBg    = (t) => t === "warn" ? "#fff3f3" : t === "ok" ? "#f1f8f2" : t === "guide" ? "#faf5ff" : t === "area" ? "#fffaf0" : "#f3f8ff";
  const toneBorder= (t) => t === "warn" ? "#f3c0c0" : t === "ok" ? "#c8e6c9" : t === "guide" ? "#e0d0f0" : t === "area" ? "#f0d890" : "#cfe0f5";

  // [v130] 생성 중에는 코치 헤더 제거 + 폭 확장 — 진행 Hero가 화면 최상단을 단독 사용.
  const _generating = (ctx && ctx.coachStage) === "generating";
  const _resultStage = (ctx && ctx.coachStage) === "result";

  return (
    <div style={{ maxWidth: (_generating || _resultStage) ? 980 : 600, margin: "0 auto", padding: (_generating || _resultStage) ? "0 8px" : "0 20px" }}>
      <style>{`@keyframes coachBlink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div style={{ display: (_generating || _resultStage) ? "none" : "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#6A1B9A" }}>🧭 AI 코치</div>
        {/* [세션58] 「💬 대화창」 버튼 폐기 — 대화창 미사용. onClose는 내부 경로에서만 사용. */}
      </div>
      {_resultStage && (
        <ResultSummary meta={ctx && ctx.resultMeta} onHowto={ctx && ctx.onHowto}
          doneCopied={ctx && ctx.doneCopied} doneNaver={ctx && ctx.doneNaver} doneUrl={ctx && ctx.doneUrl} />
      )}
      {/* [세션58] store·coach 초기진입 — 텍스트 박스 최소높이 고정 → 아래 영상 위치 불변(문구 길이 무관). */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12,
        ...((tabId === "store" || tabId === "coach" || tabId === "posts" || tabId === "account" || tabId === "plans") ? { minHeight: 132 } : {}) }}>
        {renderCards.map((c, i) => (
          <div key={i} style={{
            background: toneBg(c.tone), border: `1px solid ${toneBorder(c.tone)}`,
            borderRadius: 12, padding: "14px 16px",
          }}>
            {c.lines.map((ln, j) => (
              <div key={j} style={{
                fontSize: 13.5, lineHeight: 1.7,
                fontWeight: c._typing ? 600 : (j === 0 ? 700 : 500),
                color: c._typing ? toneColor(c.tone) : (j === 0 ? toneColor(c.tone) : "#3a3a44"),
                whiteSpace: "pre-line", // \n 줄바꿈 표시
              }}>
                {ln}
                {/* 타이핑 진행 중인 카드의 마지막 줄 끝에 깜빡이는 커서 */}
                {c._typing && j === c.lines.length - 1 && (
                  <span style={{
                    display: "inline-block", width: 7, marginLeft: 1,
                    color: toneColor(c.tone), animation: "coachBlink 1s step-end infinite",
                  }}>▍</span>
                )}
              </div>
            ))}
            {c.recs && c.recs.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed " + toneBorder(c.tone) }}>
                {c.isHowto ? (
                  c.recs.map((r, k) => (
                    <div key={k} style={{ fontSize: 13, color: "#444", lineHeight: 1.65, display: "flex", gap: 7, marginBottom: 5 }}>
                      <span style={{ flexShrink: 0, fontWeight: 800, color: "#9C27B0" }}>{["①","②","③","④","⑤","⑥"][k] || (k+1)}</span>
                      <span>{r}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#888", marginBottom: 4 }}>추천</div>
                    {c.recs.map((r, k) => (
                      <div key={k} style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>· {r}</div>
                    ))}
                  </>
                )}
              </div>
            )}
            {c.action && onTab && !c._hideAction && (
              <button onClick={() => onTab(c.action.tab)}
                style={{ marginTop: 12, border: "none", borderRadius: 9, padding: "9px 16px",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, color: "#fff",
                  background: "linear-gradient(135deg,#4A148C,#9C27B0)", whiteSpace: "nowrap" }}>
                {c.action.label} →
              </button>
            )}
          </div>
        ))}
        {/* [v127] 발행코치 생성 단계 — 7단계 진행 체크리스트를 코치 카드 아래 실시간 표시.
            chat 경로와 coach 경로는 helpTab으로 상호배타 → GeneratingProgress 중복 마운트 없음. */}
        {(ctx && ctx.coachStage) === "generating" && (
          <div style={{ background: "#fff", border: "1.5px solid #ede8f8",
            borderRadius: 12, padding: "14px 16px",
            boxShadow: "0 2px 10px rgba(100,50,180,.05)" }}>
            <GeneratingProgress industry={ctx && ctx.hubStore && ctx.hubStore.industry}
              logCtx={{ region: ctx && ctx.hubStore && ctx.hubStore.region,
                        subRegion: ctx && ctx.hubStore && ctx.hubStore.sub_region,
                        picked: ctx && ctx.coachPicked }} />
          </div>
        )}
      </div>
      {/* [세션58] 업체정보 — 텍스트 코치 아래 영상 고정 배치(닫기 없음). 타 탭 무영향. */}
      {tabId === "store" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          {/* 기본 store_ident. 우측 「▶영상보기」 클릭 시 해당 영상으로 교체(위치 고정). */}
          <CoachVideoCard menuId={(ctx && ctx.coachVideoKey) || "store_ident"} />
        </div>
      )}
      {/* [세션61] 발행비율설정(stats) — 좌측 코치 텍스트 아래 영상 고정(닫기 없음).
          기존 stats 영상은 「주력분야 새로 설정」 화면 내부에만 있어 기본 화면에서 미노출이었다. */}
      {tabId === "stats" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          <CoachVideoCard menuId="stats" />
        </div>
      )}
      {/* [세션59] 요금제(plans) — 좌측 코치 텍스트 아래 영상 고정(닫기 없음). */}
      {tabId === "plans" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          <CoachVideoCard menuId="plans" />
        </div>
      )}
      {/* [세션59] 마이페이지(account) — 좌측 코치 텍스트 아래 영상 고정(닫기 없음). */}
      {tabId === "account" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          <CoachVideoCard menuId="account" />
        </div>
      )}
      {/* [세션59] 최근발행(posts) — 좌측 코치 텍스트 아래 영상 고정(닫기 없음). */}
      {tabId === "posts" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          <CoachVideoCard menuId="posts" />
        </div>
      )}
      {/* [세션58] AI 글쓰기(coach) 초기 진입 — 좌측 하단 영상 고정(업체정보 탭과 동형). */}
      {tabId === "coach" && (ctx && ctx.coachStage) !== "generating"
        && (ctx && ctx.coachStage) !== "result"
        && (ctx && ctx.coachStage) !== "analysis"
        && (ctx && ctx.coachStage) !== "treatment" && (
        <div style={{ marginTop: 34, width: "min(920px, calc(100vw - 40px))",
          position: "relative", left: "50%", transform: "translateX(-50%)" }}>
          <CoachVideoCard menuId="coach" />
        </div>
      )}
    </div>
  );
}

// [v28] 좌측 도움말 패널 — 현재 탭의 사용법을 단계별로 보여줌. 입력창은 아래 그대로 유지.
function HelpPanel({ tabId, onClose }) {
  const c = HELP_CONTENT[tabId];
  if (!c) return null;
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#6A1B9A" }}>{c.ic} {c.title}</div>
        {/* [세션58] 「💬 대화창」 버튼 폐기 — 대화창 미사용. onClose는 내부 경로에서만 사용. */}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: "#5a4a6a", background: "#f7f1fc",
        border: "1px solid #e6d8f5", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        {c.intro}
      </div>
      {c.warnBanner && (
        <div style={{ marginBottom: 14, background: "linear-gradient(135deg,#fff0f0,#ffe0e0)",
          border: "1.5px solid #f5a3a3", borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>👻</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#c62828", lineHeight: 1.35 }}>{c.warnBanner.title}</div>
            {c.warnBanner.desc && (
              <div style={{ fontSize: 12.5, color: "#a13030", marginTop: 4, lineHeight: 1.5 }}>{c.warnBanner.desc}</div>
            )}
          </div>
        </div>
      )}
      {c.flow && (
        <div style={{ marginBottom: 18 }}>
          {c.flow.map((s, i) => (
            <div key={i} style={{ position: "relative", paddingLeft: 52, paddingBottom: i === c.flow.length - 1 ? 0 : 14 }}>
              {/* 연결선 */}
              {i !== c.flow.length - 1 && (
                <span style={{ position: "absolute", left: 19, top: 40, bottom: 0, width: 2,
                  background: "linear-gradient(" + s.color + "55, " + c.flow[i + 1].color + "55)" }} />
              )}
              {/* 번호 원 */}
              <span style={{ position: "absolute", left: 0, top: 0, width: 40, height: 40, borderRadius: "50%",
                background: s.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 800, boxShadow: "0 2px 8px " + s.color + "44" }}>{s.ic}</span>
              {/* 카드 */}
              <div style={{ background: "#fff", border: "1px solid " + s.color + "33", borderLeft: "3px solid " + s.color,
                borderRadius: 10, padding: "9px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: s.color, background: s.color + "14",
                    borderRadius: 6, padding: "1px 6px" }}>STEP {s.n}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#333" }}>{s.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: s.color,
                    background: s.color + "10", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>예: {s.ex}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#777" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {c.blocks.map((b, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#7B1FA2", marginBottom: 6 }}>{b.h}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {b.items.map((it, j) => (
              <li key={j} style={{ fontSize: 13, lineHeight: 1.7, color: "#444" }}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
      {c.folders && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#7B1FA2", marginBottom: 6 }}>📁 {c.folders.title}</div>
          <div style={{ fontSize: 12.5, color: "#666", lineHeight: 1.6, marginBottom: 10 }}>{c.folders.desc}</div>
          <div style={{ background: "#fffaf2", border: "1px solid #f0e0c8", borderRadius: 10,
            padding: "12px 14px", fontSize: 13 }}>
            <div style={{ fontWeight: 800, color: "#E65100", display: "flex", alignItems: "center", gap: 6 }}>
              📂 {c.folders.root}/
            </div>
            <div style={{ marginTop: 4 }}>
              {c.folders.children.map((f, i) => {
                const last = i === c.folders.children.length - 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                    color: "#5a4a3a", lineHeight: 1.9, fontSize: 12.5 }}>
                    <span style={{ color: "#d0b894", fontFamily: "monospace" }}>{last ? "└─" : "├─"}</span>
                    <span>📁</span><span>{f}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: "#999", lineHeight: 1.6 }}>
            🏷️ 저장 이름: <span style={{ color: "#666" }}>{c.folders.naming}</span>
          </div>
          <div style={{ marginTop: 12, background: "linear-gradient(135deg,#fff3e0,#ffe7cc)",
            border: "1px solid #ffc99a", borderRadius: 12, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>⚡</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#E65100", lineHeight: 1.35 }}>
                이렇게 테마별로 정리해두면<br/>블로그 1편 발행이 <span style={{ fontSize: 19 }}>5분 미만</span>!
              </div>
              <div style={{ fontSize: 12.5, color: "#a35a1a", marginTop: 4 }}>
                글 생성 → 복사 → 해당 폴더 사진만 첨부 → 발행. 사진 찾느라 헤맬 일이 없어요.
              </div>
            </div>
          </div>
        </div>
      )}
      {c.banner && (
        <div style={{ marginBottom: 14, background: "linear-gradient(135deg,#fff3e0,#ffe7cc)",
          border: "1px solid #ffc99a", borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>⚡</span>
          <div>
            <div style={{ fontSize: 15.5, fontWeight: 900, color: "#E65100", lineHeight: 1.35 }}>{c.banner.title}</div>
            {c.banner.desc && (
              <div style={{ fontSize: 12.5, color: "#a35a1a", marginTop: 4 }}>{c.banner.desc}</div>
            )}
          </div>
        </div>
      )}
      {c.closing && c.closing.map((b, i) => (
        <div key={"cl" + i} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#7B1FA2", marginBottom: 6 }}>{b.h}</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {b.items.map((it, j) => (
              <li key={j} style={{ fontSize: 13, lineHeight: 1.7, color: "#444" }}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "#999", marginTop: 4 }}>
        💡 익숙해지면 같은 메뉴를 한 번 더 눌러 설명을 접고 대화창으로 돌아갈 수 있어요.
      </div>
    </div>
  );
}

// [v32] 좌측 하단 푸터 문서 — 본문은 /pages/policies/*.js 외부 파일에서 import.
//   각 파일: export default { title, content }. 정식 문안은 해당 파일에서만 수정.
//   결제(PG) 연동 시 refund.js 우선 갱신.
const FOOTER_DOCS = {
  terms:    POLICY_TERMS,
  privacy:  POLICY_PRIVACY,
  refund:   POLICY_REFUND,
  aiNotice: POLICY_AINOTICE,
  support:  POLICY_SUPPORT,
};

// [v7] NavPanel — 우측 result 영역에 표시되는 네비 패널 (추가형 · 엔진 무관)
//   plans: 실제 요금제 카드 (비로그인도 열람)
//   [v19] AI 운영 허브 — coach/posts/survival/usage/account 를 탭 컨테이너로 통합.
//         진입 view 중 5종은 허브로 묶여 내부 탭 전환.
//         usage/account = 실데이터(읽기전용) · coach/posts/survival = placeholder(데이터 미연결).
//         plans 는 종전대로 단독 카드 뷰.
// ============================================================
const HUB_TABS = [
  { id: "stats",    ic: "📊", label: "발행비율설정" },    // [1] 메뉴 요율 선택 (전략 — menu_weights 입력)
  { id: "coach",    ic: "🧠", label: "AI 글쓰기" }, // [2] 실행 — 달력/오늘 할 일 (생성기→운영도구 전환 핵심)
  { id: "posts",    ic: "📝", label: "최근발행" },
  // [v127] 관측 탭 상단 메뉴 제외 — 렌더/API/DB 무손상. HUB_IDS 자동 파생 → ?view=survival 은 posts 폴백.
  { id: "account",  ic: "🏠", label: "마이페이지" },   // 계정 전용 — 회원정보/사용량/누적/이용내역(펼치기)
  { id: "plans",    ic: "💳", label: "요금제", sub: true, guest: true },       // [v107] 보조 — 평소 연하게 / [v129] 비로그인 노출
  // [v24] 업종센터(industry) 탭 핵심 메뉴 제외. 컴포넌트/라우팅/카탈로그 무손상.
  //   진입은 업체정보 내 "🗂️ 업종센터에서 둘러보기"(setTab("industry"))로만 유지.
  //   메뉴/URL(?view=industry) 진입 차단(HUB_IDS 자동 파생 → posts 폴백). 좌측 메뉴 개편 시 도움말/지원업종으로 흡수.
  { id: "store",    ic: "🏢", label: "업체정보", sub: true },     // [v107] 보조 — 평소 연하게
  { id: "tools",    ic: "🖼️", label: "사진편집기", ext: true, sub: true, guest: true }, // [v95] 상단 메뉴 승격 / [v107] 보조 톤 / [v129] 비로그인 노출(저장은 로그인 게이트)
];
// [v129] 비로그인 상단 메뉴 = guest:true 만. 나머지 5탭은 로그인 후에만 노출·클릭 가능.
//   이유: 비로그인 진입 시 우측이 로그인 카드라 좌측 가이드만 흘러 전환 없음. 온보딩 영상이 ①~④ 흐름 대체.
//   HUB_IDS·라우팅·컴포넌트 무변경 → ?view=stats 등 직접 URL 진입은 종전대로(로그인 카드 표시).
const HUB_IDS = HUB_TABS.filter(t => !t.ext).map(t => t.id); // [v95] ext 탭은 nav 내부 id 아님 — 제외

// [v67] 가입 후 최초 1회 온보딩 — 업종 미설정(hasStore=false) 사용자 가로채기.
//   한 화면 2스텝: ①업종 선택 → ②업체명·대표지역·주소. 완료 후 운영허브 진입.
//   업종은 여기서만 확정(이후 고정·변경불가). 나머지 선택정보는 업체정보 메뉴에서.
//   병원 진료과는 기본 7개 노출 + '더보기'로 나머지. 일반업종(카페/식당)은 하단 분리.
// [v120] 온보딩 노출 = 실제 발행 검증 완료 업종만(화이트리스트). 엔진 정의(INDUSTRY_TREATMENTS 19개)는
//   유지하되 선택 UI에서만 미검증 업종을 숨긴다. 검증되면 여기 한 줄 추가로 노출.
//   숨김: cafe·eye·general·pediatrics·psy·obgyn·neuro·gastro·urology(미검증)·pain·family 등.
//   ※ urology(비뇨기과)는 노출 유지(검증분). 분식점=restaurant(맵꼬, 테스트중).
// [Spine 이관] ONBOARD_*/INDUSTRY_GROUPS/SUB_TO_GROUP → industry-tree.js(SoT). 위 import에서 소비.

// [v71] 계층형 업종 선택 — 1차 대분류 → 2차 세부업종.
//   value = 최종 세부업종 key. onChange(key) 로 2차 선택 시 emit.
// [v125] 재사용 — store 미확정(최초등록) 화면 STEP1에서 인라인 호출(좌측 사이드바 의존 제거).
// [IndustrySelector Spine 이관] IndustryPicker → lib/IndustrySelector.js
// [IndustrySelector Spine 이관] IndustrySideMenu → lib/IndustrySelector.js
// [IndustrySelector Spine 이관] industryStatusBadge / IndustryTree → lib/IndustrySelector.js
// [IndustrySelector Spine 이관] IndustryDetail → lib/IndustrySelector.js
// [v26] 업체정보 편집 폼 = "AI 지역 전략 설정". store_profiles 기존 컬럼 우선.
//   1순위(지역 전략): region(대표지역) / sub_region(생활권) — 상단 강조 박스 + 설명.
//   2순위(기본 정보): 주소/전화/플레이스/블로그/진료시간/휴무일/주차 — 하단.
//   업체명/업종 읽기전용. 사진 2차 보류. 저장=PATCH.
// [Store Spine 이관 2026-07-06] StoreInfoForm → lib/Store.js (industryPath 포함). index는 import 배선만.
// 호출부(NavPanel 내부)에서 INDUSTRY_CONFIG·lex 를 prop 주입한다.

// ──────────────────────────────────────────────────────────
// [세션75] 회원탈퇴 버튼 — 마이페이지 헤더 우측 상단 전용.
//   역할 분리: 요금제 탭 = '결제(플랜 변경)' / 마이페이지 = '계정'.
//   ★ 하단 「계정 관리」 카드는 제거됐다 — 플랜 변경이 상단 요금제 탭과 중복이었고,
//     빨간 큰 버튼이 항상 노출돼 탈퇴를 과하게 강조했다.
//   ★ 정기결제 해지/재개 UI는 유료 회원이 생긴 뒤(B-4 결제 배선 완료 후) 다시 붙인다.
//     서버(/api/me/subscription POST cancel·resume)는 그대로 살아 있다.
//   ★ 별도 컴포넌트인 이유: 마이페이지 렌더는 NavPanel 내부 분기라 훅을 쓸 수 없다.
//   ★ 구독 조회는 마운트가 아니라 '탈퇴 클릭 시' 1회 — 안내문에 유료 여부를 반영하기 위함.
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// [세션96] 접수 게시판 — 신청 폼 / 내 접수내역
//   게시판은 하나(support_requests)다. 서비스별 게시판을 만들지 않고 kind 로만 구분한다.
//   제목은 사용자가 입력하지 않는다 — 버튼이 곧 제목이고, 문구는 서버(lib/supportKinds)가 소유한다.
//   ★ 별도 컴포넌트인 이유: 패널 렌더는 긴 삼항 체인 안이라 훅을 쓸 수 없다(AccountLeaveButton 과 동일 사정).
// ──────────────────────────────────────────────────────────
// [S132] btnLabel/placeholder 는 표시 전용 선택 인자다.
//   kind 와 서버 제목(kindTitle)은 건드리지 않는다 — 같은 게시판에 다른 입구를 내는 용도.
function SupportForm({ kind, compact = false, btnLabel, placeholder }) {
  const meta = SUPPORT_KINDS[kind] || {};
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const body = content.trim();
    if (!body) { setErr("내용을 입력해 주세요."); return; }
    setBusy(true); setErr("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { setErr("로그인이 필요합니다."); return; }
      const r = await fetch("/api/support/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, content: body }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || j.error || "접수에 실패했습니다.");
      setDone(true); setContent(""); setOpen(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ margin: compact ? "10px 0 0" : "14px 10px 0", padding: "12px 14px",
        background: "#f3fbf5", border: "1px solid #cde9d5", borderRadius: 12,
        fontSize: 12.5, fontWeight: 700, color: "#2e7d32", lineHeight: 1.7 }}>
        ✅ 접수되었습니다.<br />
        <span style={{ fontWeight: 600, color: "#4c7a56" }}>
          답변은 마이페이지 → 접수내역에서 확인하실 수 있습니다.
        </span>
      </div>
    );
  }

  return (
    <div style={{ margin: compact ? "10px 0 0" : "14px 10px 0" }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
            border: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "#fff",
            background: "linear-gradient(135deg,#7B1FA2,#9C27B0)",
            boxShadow: "0 6px 16px rgba(123,31,162,.22)" }}>
          {btnLabel || meta.title || "신청하기"}
        </button>
      ) : (
        <div style={{ padding: "14px", background: "#fff", border: "1px solid #ece7f6", borderRadius: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 900, color: "#2b2340", marginBottom: 8 }}>
            {btnLabel || meta.title || "접수"}
          </div>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); if (err) setErr(""); }}
            placeholder={placeholder || "내용을 자유롭게 적어주세요."}
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px",
              border: "1px solid #e0d5ef", borderRadius: 10, fontSize: 13, lineHeight: 1.7,
              fontFamily: "inherit", color: "#3a3450", outline: "none", resize: "vertical" }}
          />
          <div style={{ fontSize: 11.5, color: "#8a7ba0", lineHeight: 1.7, margin: "8px 0 10px" }}>
            {SUPPORT_CONTACT_NOTE}
          </div>
          {err && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#c62828", marginBottom: 8 }}>{err}</div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => { setOpen(false); setErr(""); }} disabled={busy}
              style={{ flex: "0 0 auto", padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                border: "1px solid #e0d5ef", background: "#fff", color: "#8a7ba0",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 700 }}>
              취소
            </button>
            <button type="button" onClick={submit} disabled={busy}
              style={{ flex: 1, padding: "9px 14px", borderRadius: 10, cursor: busy ? "default" : "pointer",
                border: "none", background: busy ? "#c9bcd9" : "linear-gradient(135deg,#7B1FA2,#9C27B0)",
                color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}>
              {busy ? "접수 중…" : "접수하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 마이페이지 접수내역 — 내 접수와 관리자 답변만 본다(서버가 토큰으로 account 를 해석).
const SUPPORT_VISIBLE = 5;   // 기본 노출 건수. 그 이상은 '전체 보기'로 접는다.

function SupportHistory() {
  const VISIBLE = SUPPORT_VISIBLE;
  const [rows, setRows] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [newKind, setNewKind] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { setRows([]); return; }
      const r = await fetch("/api/support/my", { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      setRows(Array.isArray(j.rows) ? j.rows : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: "#fff", border: "1px solid #f0eef5", borderRadius: 13, padding: "14px 16px", marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, color: "#1a1a2e" }}>접수내역</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          {["issue", "feature"].map((k) => (
            <button key={k} type="button"
              onClick={() => setNewKind(newKind === k ? null : k)}
              style={{ padding: "5px 11px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                fontSize: 11.5, fontWeight: 800,
                border: `1px solid ${newKind === k ? supKindColor(k) : "#e0d5ef"}`,
                background: newKind === k ? `${supKindColor(k)}18` : "#fff",
                color: newKind === k ? supKindColor(k) : "#8a7ba0" }}>
              {SUPPORT_KINDS[k].label} 접수
            </button>
          ))}
        </div>
      </div>

      {newKind && (
        <div style={{ marginBottom: 12 }}>
          <SupportForm kind={newKind} compact />
        </div>
      )}

      {rows === null ? (
        <div style={{ fontSize: 12.5, color: "#9a93a8", padding: "10px 0" }}>불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#9a93a8", padding: "10px 0" }}>접수하신 내역이 없습니다.</div>
      ) : (
        <div>
          {(showAll ? rows : rows.slice(0, VISIBLE)).map((r) => {
            const on = openId === r.id;
            return (
              <div key={r.id} style={{ borderTop: "1px solid #f2eef8" }}>
                <button type="button" onClick={() => setOpenId(on ? null : r.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "10px 2px", background: "transparent", border: "none",
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
                    color: supKindColor(r.kind), border: `1px solid ${supKindColor(r.kind)}55`,
                    background: `${supKindColor(r.kind)}12`, whiteSpace: "nowrap" }}>
                    {supKindLabel(r.kind)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#2b2340", minWidth: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#b3aac2", whiteSpace: "nowrap" }}>
                    {String(r.created_at || "").slice(0, 10)}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
                    color: supStatusColor(r.status), border: `1px solid ${supStatusColor(r.status)}44`,
                    background: `${supStatusColor(r.status)}10`, whiteSpace: "nowrap" }}>
                    {supStatusLabel(r.status)}
                  </span>
                  <span style={{ fontSize: 10, color: "#b3aac2" }}>{on ? "▲" : "▼"}</span>
                </button>

                {on && (
                  <div style={{ padding: "0 2px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#8a7ba0", marginBottom: 5,
                      paddingBottom: 4, borderBottom: "1px solid #f0eef5" }}>내 질문</div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "#4a4459",
                      background: "#fafafb", border: "1px solid #eeeef2", borderRadius: 10, padding: "10px 12px" }}>
                      {r.content}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 5px",
                      paddingBottom: 4, borderBottom: "1px solid #e8ddf5" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#7b5cd6" }}>관리자 답변</span>
                      {r.admin_reply && (r.answered_at || r.updated_at) && (
                        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "#b3aac2" }}>
                          {String(r.answered_at || r.updated_at).slice(0, 10)}
                        </span>
                      )}
                    </div>
                    {r.admin_reply ? (
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "#2b2340",
                        background: "#f4efff", border: "1px solid #ddd0f5", borderRadius: 10, padding: "11px 13px" }}>
                        {r.admin_reply}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12.5, color: "#9a93a8", padding: "9px 12px",
                        background: "#faf9fc", border: "1px dashed #e8ddf5", borderRadius: 10 }}>
                        관리자가 확인 후 답변을 등록할 예정입니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {rows.length > VISIBLE && (
            <button type="button" onClick={() => setShowAll((v) => !v)}
              style={{ width: "100%", marginTop: 8, padding: "7px 0", borderRadius: 9,
                border: "1px solid #ece7f6", background: "#faf9fc", cursor: "pointer",
                fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, color: "#8a7ba0" }}>
              {showAll ? "접기 ▲" : `전체 ${rows.length}건 보기 ▼`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AccountLeaveButton({ isOwner }) {
  const [step, setStep] = useState(0);           // 0=닫힘 / 1=안내 / 2=최종확인
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const authFetch = useCallback(async (url, opts = {}) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) throw new Error("로그인이 필요합니다.");
    const r = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, json: j };
  }, []);

  const open = async () => {
    setErr(""); setStep(1);
    try {
      const { json } = await authFetch("/api/me/subscription");
      if (json?.ok) setSub(json.subscription);
    } catch (e) {
      // 조회 실패해도 탈퇴 자체는 막지 않는다. 안내문만 일반형으로 표시.
      console.warn("[account] subscription load failed:", e?.message);
    }
  };

  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isFinite(d.getTime())
      ? `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.` : "—";
  };

  const leave = async () => {
    setBusy(true); setErr("");
    try {
      // deactivate는 PATCH(soft delete). 성공 시 서버가 세션을 끊으므로 여기서도 로그아웃 후 홈으로.
      const { status, json } = await authFetch("/api/account/deactivate", { method: "PATCH" });
      if (json?.ok) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }
      const map = {
        already_deactivated: "이미 탈퇴 처리된 계정입니다.",
        status_not_active: "현재 상태에서는 탈퇴할 수 없습니다. 고객센터로 문의해 주세요.",
      };
      setErr(map[json?.error] || `탈퇴 실패: ${json?.error || status}`);
    } catch (e) {
      setErr(e?.message || "네트워크 오류");
    } finally { setBusy(false); }
  };

  // 운영자 계정은 탈퇴 대상이 아니다 — 버튼 자체를 노출하지 않는다.
  if (isOwner) return null;

  const paid = sub && sub.has_subscription;

  const modal = (title, body, actions) => (
    <div onClick={() => !busy && setStep(0)}
      style={{ position: "fixed", inset: 0, background: "rgba(26,19,51,.38)", zIndex: 9000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 14,
          border: "1.5px solid #e8e8ed", padding: "18px 20px 16px",
          boxShadow: "0 12px 40px rgba(26,19,51,.22)" }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#1A1333", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "#4a4458", lineHeight: 1.75 }}>{body}</div>
        {err && (
          <div style={{ fontSize: 12, fontWeight: 700, color: "#c62828", marginTop: 8 }}>{err}</div>
        )}
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>{actions}</div>
      </div>
    </div>
  );

  const btnGhost = (label, onClick) => (
    <button onClick={onClick} disabled={busy}
      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #e8e0f4",
        background: "#fff", color: "#4A148C", fontSize: 12.5, fontWeight: 800,
        cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? .6 : 1 }}>
      {label}
    </button>
  );
  const btnDanger = (label, onClick) => (
    <button onClick={onClick} disabled={busy}
      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#c62828",
        color: "#fff", fontSize: 12.5, fontWeight: 800,
        cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? .6 : 1 }}>
      {label}
    </button>
  );

  return (
    <>
      {/* 작은 회색 텍스트 버튼 — 찾는 사람은 찾되, 눈에 먼저 들어오지는 않게. */}
      <button onClick={open}
        style={{ border: "none", background: "transparent", padding: "2px 0",
          fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: "#a49bb5",
          cursor: "pointer", whiteSpace: "nowrap", textDecoration: "underline",
          textUnderlineOffset: 3, textDecorationColor: "#d8d2e4" }}>
        회원탈퇴
      </button>

      {step === 1 && modal("회원탈퇴", (
        <>
          탈퇴하면<br />
          · 이용 중인 구독이 해지됩니다.<br />
          · 계정이 비활성화되어 로그인할 수 없습니다.<br />
          · 작성한 글과 관측 기록은 보관 기간 내 복구할 수 있습니다.
          {paid && !sub.cancel_at_period_end && (
            <div style={{ marginTop: 8, color: "#c08a2e", fontWeight: 700 }}>
              현재 {sub.plan_label} 이용 중입니다({fmt(sub.current_period_end)}까지).
              남은 기간은 환불되지 않습니다.
            </div>
          )}
        </>
      ), <>
        {btnGhost("취소", () => setStep(0))}
        {btnDanger("회원탈퇴", () => { setErr(""); setStep(2); })}
      </>)}

      {step === 2 && modal("정말 탈퇴하시겠습니까?",
        "이 작업은 되돌리기 어렵습니다. 계속하려면 아래 ‘탈퇴 진행’을 눌러 주세요.",
        <>
          {btnGhost("돌아가기", () => setStep(1))}
          {btnDanger(busy ? "처리 중…" : "탈퇴 진행", leave)}
        </>)}
    </>
  );
}

function NavPanel({ view, isLoggedIn, onLogin, onWriter, quotaInfo, storeName, authEmail, industry, hubPosts, hubSurvival, hubSurvivalItems, hubLoading, treatmentNames, treatments, treatmentCats, onFillInput, onGenerate, hubRanks, rankDraft, setRankDraft, saveRank, rankSaving, coachOpen, setCoachOpen, hubStore, setHubStore, saveStore, createStore, storeSaving, industrySidePick, industryCenterSel, setIndustryCenterSel, centerSpecialty,
  calMonth, setCalMonth, menuWeights, setMenuWeights, savedWeights, setSavedWeights, weightsDirty, setWeightsDirty, activePlan, setActivePlan, extraMenus, setExtraMenus, newMenuInput, setNewMenuInput, masterMenuNames, currentIndustry, myMenusMap, setMyMenusMap, editingMenus, setEditingMenus, menuToast, setMenuToast, onCoachMessage, onTabChange, onCalendarPick, onOpenTools, toolsActive, onGoIndustryCenter, onCoachVideo, authUserId, storeEditRef, publishApi,
  // [MultiDeptMenu 2026-07-12] 병원 다중 진료과 — 우측 '나의 메뉴' 통합 뷰용.
  //   미전달(비병원·단일과) = undefined → 기존 currentIndustry 단일 로직 폴백(하위호환).
  isMultiDept, myMenuFlat, deptLabelOf, onRemoveMyMenuDept }) {
  // [요율/계획 상태] menuWeights·savedWeights·activePlan·calMonth 등은 부모(Home)에서 관리하고 props로 받는다.
  //   NavPanel은 resultTab 삼항 분기로 재마운트되므로, 내부 useState로 두면 글쓰기/예정클릭 시 초기화되어 저장값이 소실된다.
  //   (A 버그 수정: lift state up — 재마운트돼도 부모가 값 보존)
  // [UI-SCOPE-VS-CORE-INDUSTRY-CONFLATION-01] 표시 범위 = 등록 departments(없으면 대표업종 fallback).
  //   deptList(Home 스코프)는 여기서 접근 불가 → hubStore prop 에서 동일 SoT 재파생.
  // [PLAN-CARD-CTA-NO-CHECKOUT-01] 요금제 카드 CTA → /billing/subscribe 이동용.
  //   router 인스턴스는 Home(L9326)에만 있었고 NavPanel에서는 접근 불가였다.
  //   useRouter import는 L5에 이미 존재 — 신규 import 없음.
  const router = useRouter();
  const _scopeInds = (() => {
    const dl = normalizeDepartments((hubStore && hubStore.departments) || [], hubStore && hubStore.industry);
    return dl.length ? dl : (hubStore && hubStore.industry ? [hubStore.industry] : []);
  })();
  const PLANS = [
    { id: "free",     name: "Free",     price: "0원",        unit: "/월",
      desc: "시작하기", tagline: "체험용 · 월 3건", quota: "발행 3건 포함", daily: "체험용 3건", color: "#9C27B0",
      big: "월 3건", sub: "체험용",
      feats: ["블로그 글 생성·SEO 진단", "검색 노출 구조 미리보기", "발행 3건까지 무료"] },
    { id: "basic",    name: "Basic",    price: "69,000원",   unit: "/월",
      desc: "꾸준한 운영", tagline: "하루 1건 운영", quota: "발행 30건 포함", daily: "하루 1건 발행", color: "#1565C0",
      big: "하루 1건", sub: "월 30건",
      feats: ["검색 노출 블로그 운영", "경쟁 환경 관측", "지속형 검색 자산 축적"] },
    { id: "standard", name: "Standard", price: "119,000원",  unit: "/월", highlight: true,
      desc: "적극적인 운영", tagline: "하루 2건 운영", quota: "발행 60건 포함", daily: "하루 2건 발행", color: "#03c75a",
      big: "하루 2건", sub: "월 60건",
      feats: ["Basic 전체 포함", "SEO 운영 코치", "발행 관리 + 월간 계획"] },
    { id: "pro",      name: "Pro",      price: "179,000원",  unit: "/월",
      desc: "집중 운영", tagline: "하루 3건 운영", quota: "발행 100건 포함", daily: "하루 3건 발행", color: "#E65100",
      big: "하루 3건", sub: "월 100건",
      feats: ["Standard 전체 포함", "많은 발행량", "ROI 리포트"] },
    // [세션74] Enterprise 복원 — 문의형이 아니라 정식 결제 플랜.
    //   근거: 셀프서비스 SaaS에서 최상위만 상담 전환하면 결제 흐름이 끊긴다.
    //   하루 5건은 대형 병원·인테리어·프랜차이즈·대행사에서 현실적인 수요.
    //   ★ 3곳 동시 정합 필수 — DB plans 행 + lib/billing/plans.js fallback + ALLOWED_PLANS.
    //     화면에만 있으면 "결제해도 지급할 등급이 DB에 없는" 세션73 유령등급 상태로 되돌아간다.
    { id: "enterprise", name: "Enterprise", price: "249,000원", unit: "/월",
      desc: "최고 성능", tagline: "하루 5건 운영", quota: "발행 150건 포함", daily: "하루 5건 발행", color: "#7B1FA2",
      big: "하루 5건", sub: "월 150건", crown: true,
      feats: ["Pro 전체 포함", "우선 생성 큐 · 최고 우선 처리", "신규 기능 우선 제공"] },
  ];


  // ──────────────────────────────────────────────────────────
  // [v19] AI 운영 허브 — coach/posts/survival/usage/account 탭 컨테이너
  //   진입 view(HUB_IDS 중 하나)를 초기 활성 탭으로. 내부 탭바로 전환.
  //   비로그인 시: 탭바 + 로그인 유도 카드. plans 만 비로그인 열람.
  // ──────────────────────────────────────────────────────────
  const initialTab = HUB_IDS.includes(view) ? view : "posts";
  const [tab, setTab] = useState(initialTab);
  // [업종센터] 센터에서 "이 업종 선택" 클릭 시 업체정보(store)로 넘길 업종 key.
  //   업체정보 진입 시 StoreInfoForm의 초기 pickIndustry로 주입(미확정 계정에 한해 반영).
  const [centerPick, setCenterPick] = useState("");
  // [v26] 좌측 세로띠 IndustrySideMenu 클릭값(industrySidePick) 수신 → centerPick 반영 → StoreInfoForm initialPick → pickIndustry 채택.
  //   미확정 계정만 반영(확정 계정은 좌측 자체가 잠김). 확정 시 업체정보(store) 탭으로 전환해 입력 이어가게 함.
  useEffect(() => {
    const confirmed = !!(hubStore && hubStore.industry);
    if (industrySidePick && !confirmed) {
      setCenterPick(industrySidePick);
      setTab("store");
      onTabChange && onTabChange("store");
    }
    /* eslint-disable-next-line */
  }, [industrySidePick]);
  // [세션96] 기본 펼침. 계정정보 4칸을 1줄로 줄여 확보한 공간을 이용내역이 쓴다.
  //   접혀 있으면 "내 글이 몇 건인지" 확인에 클릭이 한 번 더 든다 — 마이페이지의 본래 목적이 그것이다.
  const [historyOpen, setHistoryOpen] = useState(true); // 마이페이지 하단 이용내역 펼치기
  const [ratioHelpOpen, setRatioHelpOpen] = useState(false); // [v150] 발행비율 사용법 모달
  // [v18x] 최근발행 "글 열기" 작업패널 — 행 클릭 시 단건 fetch(me/post/[id]) → 본문복사·URL등록.
  //   openPostId: 펼친 행 id | openPost: 단건 응답(본문/메타) | openBusy: 진행 상태문구
  //   urlDraft: URL 입력값 | urlMsg: 등록 결과 인라인 메시지(성공/중복/실패).
  const [openPostId, setOpenPostId] = useState(null);
  const [openPost,   setOpenPost]   = useState(null);
  // [v-copyfb 2026-07-22] 복사 피드백 — 버튼 상태(copiedKey) + 하단 Toast(copyToast). 각 1.5s 자동 복귀.
  const [copiedKey, setCopiedKey] = useState("");   // "제목"|"본문"|"전체" — 눌린 버튼만 ✅ 표시
  const [copyToast, setCopyToast] = useState("");   // 하단 Toast 문구
  const _copyTimer = useRef(null);
  const [openBusy,   setOpenBusy]   = useState("");
  const [urlDraft,   setUrlDraft]   = useState("");
  const [urlMsg,     setUrlMsg]     = useState(null); // { kind:'ok'|'dup'|'err', text }
  //   urlEditOpen: 등록완료 글에서 'URL 변경'을 눌러 입력칸을 펼쳤을 때만 true.
  //   미등록 글은 입력칸을 처음부터 노출하므로 렌더 조건에서 (!openPost.naver_post_url || urlEditOpen) 사용.
  const [urlEditOpen, setUrlEditOpen] = useState(false);
  // [v150] 주력업무 편집 모드 — 첫 진입(주력 미설정) 또는 "새로 설정하기" 시 2컬럼 편집기 노출.
  //   editingMenus(부모 state)를 그대로 재사용(별도 신설 없음). 저장 완료 시 false → 발행비율 카드 복귀.
  // 진입 view 변경 시(👤 재진입/다른 메뉴 클릭) 활성 탭 동기화
  //   [업종센터] industry는 HUB_TABS(상단 메뉴) 비노출이라 HUB_IDS에 없음.
  //   좌측 세로띠 '🗂️ 업종센터' 클릭 → setNavView("industry") → 여기서 tab 동기화 필요 → 예외 허용.
  useEffect(() => { if (HUB_IDS.includes(view) || view === "industry") setTab(view); }, [view]);

  // [v50/v55] 발행비율설정 첫 진입 시 모든 항목 ❌사용안함(0=off)으로 시작.
  //   [v56] "저장 = 현재 전략" 모델.
  //   - 기존 운영자(savedWeights에 주력≥50): 그 전략을 그대로 둔다(복원값 유지, 리셋 금지).
  //   - 신규(저장본 없음): 첫 진입 시 전부 보조(30)로 시작 → 주력 선택만 하면 됨.
  //   재방문 시 보조가 같이 켜져 보이는 건 정상(이전 전략 그대로). 매번 초기화 안 한다.
  const statsResetDone = useRef(false);
  useEffect(() => {
    const onStats = (view === "stats" || tab === "stats");
    if (!onStats) { statsResetDone.current = false; return; } // 나가면 가드 해제
    const base = Array.isArray(treatmentNames) ? treatmentNames : [];
    if (base.length === 0) return;                               // 진료 목록 로드 전 — 다음 변경 때 재시도
    if (statsResetDone.current) return;                          // 이번 진입에 이미 처리 — 사용자 클릭 보호

    // [v151] 카드 표시값(menuWeights) 시드 — 카드는 menuWeights를 읽으므로 진입 시 반드시 채운다.
    //   원칙(사용자 지시): 저장된 나의 메뉴(base)는 회색 OFF로 보이면 안 된다 → 자동 ON.
    //   우선순위: ① savedWeights에 값이 있으면 그 값(주력≥50/보조1~49) 복원
    //            ② 없으면 보조(30)로 ON
    //   사용자가 이미 만진 값(liveOn)이 있으면 건드리지 않는다(편집 보호).
    const liveOn = Object.values(menuWeights || {}).some(v => Number(v) > 0);
    if (!liveOn) {
      const sw = savedWeights || {};
      const seeded = {};
      base.forEach((name) => {
        const s = Number(sw[name]);
        seeded[name] = (Number.isFinite(s) && s > 0) ? s : 30; // 저장값 우선, 없으면 보조(30)
      });
      setMenuWeights(seeded);
      // savedWeights에 주력(≥50)이 있던 기존 운영자는 '저장된 전략 복원'이므로 dirty=false 유지.
      setWeightsDirty(false);
    }
    statsResetDone.current = true;
    /* eslint-disable-next-line */
  }, [view, tab, treatmentNames]);

  // [v150] 주력업무 편집 모드 자동 진입 — stats 진입 시 "주력업무(내 메뉴)"가 아직 없으면 2컬럼 편집기로 시작.
  //   내 메뉴가 이미 있으면(설정 완료자) 발행비율 카드 화면으로 바로 진입. "새로 설정하기"는 수동으로 다시 켠다.
  const ratioEditInitDone = useRef(false);
  useEffect(() => {
    const onStats = (view === "stats" || tab === "stats");
    if (!onStats) { ratioEditInitDone.current = false; return; }
    if (ratioEditInitDone.current) return;
    const base = Array.isArray(treatmentNames) ? treatmentNames : [];
    if (base.length === 0) return; // 목록 로드 전 — 재시도
    const cur = (myMenusMap && Array.isArray(myMenusMap[currentIndustry])) ? myMenusMap[currentIndustry] : [];
    setEditingMenus(cur.length === 0); // 주력 미설정 → 편집기 / 설정완료 → 비율카드
    ratioEditInitDone.current = true;
    /* eslint-disable-next-line */
  }, [view, tab, treatmentNames, myMenusMap, currentIndustry]);

  const q = quotaInfo || {};
  const displayName = storeName || (authEmail ? authEmail.split("@")[0] : "사용자");
  const planLabel = q.plan_id ? String(q.plan_id).toUpperCase() : "FREE";
  const isUnlimited = q.bypass === true || q.reason === "OWNER_BYPASS"; // owner — quota 무제한 응답
  // [MYPAGE-PERIOD-LABEL-MISMATCH-01] 집계 기간이 구독 결제주기인데 라벨은 '이번 달'이었다.
  //   서버(check-quota)가 resolveBillingPeriod로 정한 period_basis를 그대로 따른다.
  //   구독행 있음 → 'subscription'(결제주기) / 없음 → 'calendar'(KST 월). 숫자·계산 무접촉.
  const periodLabel = q.period_basis === "subscription" ? "이용기간" : "이번 달";
  const used  = Number.isFinite(q.monthly_publish) ? q.monthly_publish : null;
  const limit = Number.isFinite(q.monthly_quota)   ? q.monthly_quota   : null;
  const hasUsage = used != null && limit != null && limit > 0;
  const remaining = Number.isFinite(q.remaining) ? q.remaining : (hasUsage ? Math.max(0, limit - used) : null);

  // [일일 발행량] 플랜 월 한도 → 하루 권장 발행 개수. Basic 월30→1/일, Standard 60→2/일, Pro 100→3/일.
  //   달력 계획은 하루 perDay개씩 배치한다. OWNER(무제한)·미연동 시 1/일 기본.
  const perDay = (() => {
    if (isUnlimited) return 3;                        // 운영자 데모 — 넉넉히
    if (Number.isFinite(limit) && limit > 0) return Math.max(1, Math.round(limit / 30));
    return 1;
  })();

  // [v42] 월 계획 총량 상한. 이번 달은 남은 발행 가능 건수(remaining), 다음 달 이후는 월 한도(limit).
  //   quotaInfo 미연동/OWNER 무제한이면 null → 캡 미적용(기존 동작).
  const planCapThisMonth = Number.isFinite(remaining) ? remaining : (Number.isFinite(limit) ? limit : null);
  const planCapFullMonth = Number.isFinite(limit) ? limit : null;

  // [v62] 이번 달 생성 한도 소진 여부 — 계획 단계(발행비율설정·달력)는 막지 않고 배너로만 고지.
  //   소진해도 전략 수정/저장·달력 확인은 자유(다음 달 미리 준비). 차단은 생성 진입(글 작성하기 등)에서만.
  //   OWNER 무제한·미연동(remaining null)은 배너 미표시.
  const quotaSoldOut = !isUnlimited && Number.isFinite(remaining) && remaining <= 0;
  const soldOutBanner = quotaSoldOut ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "linear-gradient(135deg,#fff3e0,#ffe0b2)",
      border: "1.5px solid #ffb74d", borderRadius: 12,
      padding: "12px 16px", marginBottom: 12,
    }}>
      <span style={{ fontSize: 20, lineHeight: 1.1 }}>🔒</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: "#E65100" }}>
          {periodLabel} 생성 한도 사용 완료{(used != null && limit != null) ? ` (${used}/${limit})` : ""}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#BF360C", lineHeight: 1.5 }}>
          새 이용권을 구매하면 결제 시점부터 바로 다시 생성할 수 있어요. 지금은 전략·달력을 미리 준비해 둘 수 있습니다.
        </span>
      </div>
    </div>
  ) : null;

  const row = (label, value) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "13px 0", borderBottom: "1px solid #f0eef5" }}>
      <span style={{ fontSize: 13, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{value}</span>
    </div>
  );

  // placeholder 카드 (데이터 미연결 탭 공통) — '관찰·기록' 프레임, 점수경쟁 톤 지양
  const pendingCard = (title, desc) => (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px dashed #d9d2ec",
      padding: "30px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#6A1B9A", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "#999", lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
  const loadingCard = (msg) => (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed",
      padding: "28px 24px", textAlign: "center", fontSize: 12.5, color: "#aaa" }}>{msg}</div>
  );
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
  };

  // [v19] 운영코치 집계 — treatment_name 기준(지역 분산 방지). 현재 업종 시술목록과 비교해 공백 도출.
  //   keyword는 "강남 임플란트 후기"처럼 지역+제목 합성이라 같은 시술이 쪼개짐 → treatment_name으로 집계.
  const coach = (() => {
    const posts = filterRealPosts(hubPosts, _scopeInds); // [UI-SCOPE-01] 등록 분야 전체
    const freq = {};
    for (const p of posts) {
      // 1순위 treatment_name, 없으면 keyword fallback (구 데이터 호환)
      const t = (p.treatment_name || p.keyword || "").trim();
      if (t) freq[t] = (freq[t] || 0) + 1;
    }
    const ranked = Object.entries(freq).sort((a,b) => b[1]-a[1]);
    const total = posts.length;
    // 주력 주제 — 이름 + 건수
    const mainTopics = ranked.slice(0, 3).map(([k,c]) => ({ name: k, count: c }));
    const writtenSet = new Set(Object.keys(freq));
    const pool = Array.isArray(treatmentNames) ? treatmentNames : [];
    const gapTopics = pool.filter(n => !writtenSet.has(n)).slice(0, 4);
    // 지역 빈도
    const regionFreq = {};
    for (const p of posts) { const r = (p.region || "").trim(); if (r) regionFreq[r] = (regionFreq[r]||0)+1; }
    const regionRanked = Object.entries(regionFreq).sort((a,b)=>b[1]-a[1]);
    const topRegion = regionRanked[0]?.[0] || "";
    const suggestTopic = gapTopics[0] || (mainTopics[0]?.name) || "";
    const suggestion = suggestTopic
      ? `${topRegion ? topRegion + " " : ""}${suggestTopic} 주제로 1건 작성해보세요.`
      : "";
    const suggestQuery = suggestTopic
      ? `${topRegion ? topRegion + " " : ""}${suggestTopic} 후기 써줘`
      : "";

    // ⑤ 관측 요약 — survival 데이터(alive/gone/fossil/unknown)
    let surv = null, verdict = "", verdictColor = "#888";
    if (hubSurvival && hubSurvival.observed) {
      const a = hubSurvival.alive ?? 0, g = hubSurvival.gone ?? 0, f = hubSurvival.fossil ?? 0, u = hubSurvival.unknown ?? 0;
      const settled = a + g + f;
      surv = { alive: a, gone: g, fossil: f, unknown: u, observed: hubSurvival.observed };
      const parts = [];
      if (a > 0) parts.push(`${a}개가 살아있습니다`);
      if (g + f > 0) parts.push(`${g + f}개는 위험(노출 밀림) 상태입니다`);
      if (u > 0) parts.push(`${u}개는 관측이 더 필요합니다`);
      surv.note = parts.join(", ") + ".";
      surv.up = Number.isFinite(hubSurvival.up) ? hubSurvival.up : null;
      surv.down = Number.isFinite(hubSurvival.down) ? hubSurvival.down : null;
      if (settled === 0) { verdict = "관측 중"; verdictColor = "#888"; }
      else if (a / settled >= 0.6) { verdict = "안정적"; verdictColor = "#2e7d32"; }
      else if (a / settled >= 0.3) { verdict = "보통";   verdictColor = "#E65100"; }
      else { verdict = "주의"; verdictColor = "#c62828"; }
    }

    // ④ 운영조언 — coachLogic 철학: Alive(반응) 최우선 → 공백 → 과집중 → 활동성 → 지역
    const advices = [];
    const gap = gapTopics[0] || "";
    if (gap) {
      advices.push({ icon: "💡", tone: "info",
        text: `'${gap}'는 아직 한 번도 안 썼습니다. ${topRegion ? topRegion + " " : ""}${gap} 글을 써보세요.` });
    }
    if (ranked.length && total >= 3) {
      const [topName, topCnt] = ranked[0];
      const pct = Math.round((topCnt / total) * 100);
      if (pct >= 50 && topCnt >= 2) {
        advices.push({ icon: "⚠️", tone: "warn",
          text: `최근 발행의 ${pct}%가 '${topName}'에 집중돼 있습니다. 주제를 분산해보세요.` });
      }
    }
    const now = Date.now(), DAY = 86400000;
    let last7 = 0;
    for (const p of posts) {
      const d = p.published_at || p.created_at;
      if (!d) continue;
      const t = new Date(d).getTime();
      if (Number.isFinite(t) && (now - t) <= 7 * DAY) last7++;
    }
    if (total > 0) {
      if (last7 === 0) advices.push({ icon: "📉", tone: "warn", text: `최근 7일간 발행이 없습니다. 활동성이 떨어지고 있어요.` });
      else if (last7 >= 3) advices.push({ icon: "🔥", tone: "info", text: `최근 7일 ${last7}건 발행. 활동성이 좋습니다.` });
    }
    if (regionRanked.length >= 1 && total >= 3) {
      const [rName, rCnt] = regionRanked[0];
      const rPct = Math.round((rCnt / total) * 100);
      if (rPct >= 70 && regionRanked.length === 1) advices.push({ icon: "📍", tone: "info", text: `${rName} 위주로 발행 중입니다. 인근 생활권으로 키워드를 넓혀보세요.` });
      else if (rPct >= 70) advices.push({ icon: "📍", tone: "info", text: `발행이 ${rName}에 ${rPct}% 몰려 있습니다. 다른 지역도 보강해보세요.` });
    }

    // ⑤ 최근 성과 — survival items에서 Alive 글을 주제별 집계. "신경치료에서 Alive 4건"
    let perf = null;
    const sitems = filterRealItems(hubSurvivalItems);
    if (sitems.length) {
      const aliveItems = sitems.filter(it => (it.status || "").toLowerCase() === "alive");
      const aliveRate = (surv && surv.observed) ? Math.round((surv.alive / surv.observed) * 1000) / 10 : null;
      if (aliveItems.length) {
        const byT = {};
        for (const it of aliveItems) { const t = (it.treatment || "").trim() || "기타"; byT[t] = (byT[t]||0)+1; }
        const tRanked = Object.entries(byT).sort((a,b)=>b[1]-a[1]);
        const topT = tRanked[0]?.[0] || "";
        perf = {
          totalAlive: aliveItems.length,
          byTreatment: tRanked,          // [["신경치료",4],["임플란트",1]]
          topTreatment: topT,
          aliveRate,
          note: topT ? `최근 반응은 '${topT}'에서 집중 발생하고 있습니다.` : "",
        };
      } else {
        perf = { totalAlive: 0, byTreatment: [], topTreatment: "", aliveRate, note: "" };
      }
    }

    // coachLogic 1순위 — Alive 반응 주제가 있으면 그걸 최우선 조언으로 (advices 맨 앞)
    if (perf && perf.topTreatment && perf.totalAlive > 0) {
      const tc = perf.byTreatment[0]?.[1] || perf.totalAlive;
      advices.unshift({ icon: "✅", tone: "info",
        text: `'${perf.topTreatment}'에서 살아있는 반응 ${tc}건이 확인됐습니다. ${topRegion ? topRegion + " " : ""}${perf.topTreatment} 1건 더 발행해 흐름을 이어가세요.` });
    }

    // 🎯 추천 주제 — 분류 박스 대신 "뭘 쓸지" 3개로 통합. 각 항목은 region을 항상 포함(클릭 즉시 생성, 재선택 0).
    //   우선순위: ① Alive 반응 주제(흐름 잇기) → ② 공백 주제(과집중 방지) → ③ 주력 주제(확장). 중복 제거 후 3개.
    const recos = (() => {
      const rgPrefix = topRegion ? topRegion + " " : "";
      const out = [];
      const seen = new Set();
      const add = (topic, reason) => {
        const t = (topic || "").trim();
        if (!t || seen.has(t) || out.length >= 3) return;
        seen.add(t);
        out.push({ topic: t, label: `${rgPrefix}${t}`, reason, query: `${rgPrefix}${t} 후기 써줘` });
      };
      if (perf && perf.topTreatment && perf.totalAlive > 0) add(perf.topTreatment, "최근 반응 좋음");
      for (const g of gapTopics) add(g, "아직 한 번도 안 씀");
      for (const m of mainTopics) add(m.name, "주제 다양화");
      return out;
    })();

    return { posts, mainTopics, gapTopics, suggestion, suggestTopic, topRegion, suggestQuery,
      surv, verdict, verdictColor, advices, perf, last7, total, recos };
  })();

  // [계획 생성] 요율(weights) + 대상 월(ym) → 달력 계획 객체 생성. 월간계획 탭 저장·운영코치 둘 다 공유.
  //   coach.posts(발행이력)는 항상 접근 가능 → 발행한 날은 건너뜀. 비중 없으면 공백→보강 fallback.
  const buildPlanFromWeights = (weights, ym) => {
    // [v45 #12] 발행비율 미설정이면 계획을 만들지 않는다. (기본 슬라이더값으로 가짜 계획 생성하던 버그 차단)
    //   미설정 = 양수 비중이 하나도 없음. 0(사용안함)은 명시값이라 여기서 통과시키되 아래 weighted에서 제외됨.
    const _sw = weights || {};
    const _hasAnyWeight = Object.values(_sw).some(v => Number(v) > 0);
    if (!_hasAnyWeight) {
      return { byDay: {}, builtAt: Date.now(), monthY: ym.y, monthM: ym.m, perDay, unset: true };
    }
    const today = new Date(); today.setHours(0,0,0,0);
    const rg = coach.topRegion ? coach.topRegion + " " : "";
    const lastDay = new Date(ym.y, ym.m + 1, 0).getDate();
    const isThisMonth = today.getFullYear() === ym.y && today.getMonth() === ym.m;
    const startDay = isThisMonth ? today.getDate() : 1;
    const planCap = isThisMonth ? planCapThisMonth : planCapFullMonth;
    const dayCount = Math.max(1, lastDay - startDay + 1);  // 남은 날 수
    const dayLimit = dayCount * Math.max(1, perDay);       // 날수 × 하루 발행량(물리적 상한)
    // [v43] 계획 총량 = 플랜 한도 우선. (기존 v42: 비율로 채우고 플랜이 사후 캡 → 역전)
    //   생성순서: 플랜 → slots 결정 → 비율 정규화 → slots 범위 배분.
    //   이번달=remaining, 다음달=limit. OWNER 무제한·미연동이면 날수×perDay 사용(기존 동작).
    //   날수×perDay는 물리적 상한(달력 못 넘김)으로만 작용.
    let slots;
    // [v62] planCap===0(이번 달 한도 소진)도 cap으로 인정. 기존엔 (planCap>0)만 cap → 0이면
    //   미연동과 같은 길로 빠져 slots=dayLimit(전체 날수)로 깔리던 버그. 유한값이면 0 포함 적용.
    if (isUnlimited || !Number.isFinite(planCap)) {
      slots = dayLimit;                                    // 무제한/미연동 — 날수 기준
    } else {
      slots = Math.min(Math.max(0, planCap), dayLimit);    // 플랜 한도 우선(0=소진→0개), 달력 한도 내
    }
    slots = Math.max(0, slots);

    // [v-plangrid 2026-07-22] 날짜별 실제 발행/생성 건수(이번 달).
    //   종전: Set(pubDays)로 "그 날 1건이라도 있으면 하루 통째로 스킵".
    //     → PRO(하루 3건)에서 오늘 2건 생성 시 오늘 계획이 0이 되어 "오늘 1건이 사라진" 것처럼 보였다.
    //   현재: 건수를 세어 하루 목표(perDay)에서 차감 → 부족분만 그 날에 계속 배치한다.
    //     하루 목표는 발행 이력과 무관하게 항상 perDay로 유지된다(계획과 실행의 분리).
    const pubCount = new Map();   // day → 그 날 생성·발행된 건수
    for (const p of coach.posts) {
      const hasUrl = !!p.naver_post_url;
      const d = new Date(hasUrl ? (p.published_at || p.created_at) : (p.created_at || p.published_at));
      if (!Number.isFinite(d.getTime())) continue;
      if (d.getFullYear() !== ym.y || d.getMonth() !== ym.m) continue;
      const k = d.getDate();
      pubCount.set(k, (pubCount.get(k) || 0) + 1);
    }

    let seq = []; const reasonOf = {};
    const sw = weights || {};
    const weighted = Object.entries(sw).filter(([, v]) => Number(v) > 0);
    if (weighted.length && slots > 0) {
      // [v43] 최대잔여법(largest remainder) — 합이 정확히 slots가 되도록 비율 정규화.
      //   기존 Math.max(1, round) → 진료마다 최소 1건 강제 → FREE=3인데 진료 18개면 18건 누수.
      //   slots가 작으면(FREE=3) 비중 큰 진료부터 채워지고 나머지는 0건(자연 탈락).
      const totalW = weighted.reduce((s, [, v]) => s + Number(v), 0);
      const raw = weighted.map(([name, v]) => {
        const exact = Number(v) / totalW * slots;
        return { name, floor: Math.floor(exact), frac: exact - Math.floor(exact), w: Number(v) };
      });
      let assigned = raw.reduce((s, r) => s + r.floor, 0);
      let rem = slots - assigned;                          // 잔여 배분 대상
      // 잔여를 소수부 큰 순(동률이면 비중 큰 순)으로 +1
      raw.sort((a, b) => (b.frac - a.frac) || (b.w - a.w));
      for (let i = 0; i < raw.length && rem > 0; i++) { raw[i].floor++; rem--; }
      const alloc = raw.filter(r => r.floor > 0)
        .map(r => ({ name: r.name, n: r.floor }))
        .sort((a, b) => b.n - a.n);
      const pools = alloc.map(a => ({ name: a.name, left: a.n }));
      while (seq.length < slots && pools.some(p => p.left > 0)) {
        for (const p of pools) { if (p.left > 0 && seq.length < slots) { seq.push(p.name); reasonOf[p.name] = "비중"; p.left--; } }
      }
    } else if (slots > 0) {
      const writtenSet = new Set(coach.posts.map(p => (p.treatment_name||p.keyword||"").trim()).filter(Boolean));
      const pool = Array.isArray(treatmentNames) ? treatmentNames : [];
      const gaps = pool.filter(n => !writtenSet.has(n));
      const mains = (coach.mainTopics || []).map(t => t.name);
      for (const g of gaps) { if (seq.length >= slots) break; seq.push(g); reasonOf[g] = "공백"; }
      let mi = 0; while (seq.length < Math.min(slots, 7 * perDay) && mains.length) { const m = mains[mi % mains.length]; mi++; seq.push(m); if(!(m in reasonOf)) reasonOf[m]="보강"; if (mi > 7 * perDay + mains.length) break; }
    }

    // 날짜 배치 — 하루 목표 perDay 유지. 그 날 이미 만든 건수만큼만 차감해 잔여분 배치.
    const byDay = {};   // { day: [{topic,label,query,reason}, ...] }
    let day = startDay, si = 0;
    while (si < seq.length && day <= lastDay) {
      // [v-plangrid] 하루 목표(perDay)에서 그 날 이미 만든 건수를 뺀 잔여 슬롯만 배치.
      //   done >= perDay 인 날은 slot 0 → 예정 없음(그 날은 목표 달성). 날짜를 건너뛰지는 않는다.
      const done = pubCount.get(day) || 0;
      const slotToday = Math.max(0, perDay - done);
      if (slotToday === 0) { day++; continue; }
      const items = [];
      for (let k = 0; k < slotToday && si < seq.length; k++, si++) {
        const s = seq[si];
        items.push({ topic: s, label: `${rg}${s}`, query: `${rg}${s} 후기 써줘`, reason: reasonOf[s] });
      }
      if (items.length) byDay[day] = items;
      day++;
    }
    return { byDay, builtAt: Date.now(), monthY: ym.y, monthM: ym.m, perDay };
  };

  // [v151] 계획 자동 복구 — 저장본(주력≥50)이 있는데 activePlan이 없거나(새로고침 후 유실) 표시 월과
  //   불일치하면 savedWeights로 계획을 다시 만들어 달력에 채운다. 저장 버튼을 다시 누르지 않아도 복구됨.
  //   ※ 사용자가 직접 비운 경우(savedWeights null)는 건드리지 않는다.
  const planRebuildKey = useRef("");
  useEffect(() => {
    const onCal = (view === "coach" || tab === "coach");
    if (!onCal) return;
    // [v153] 자동 복구는 '당월 + 익월 1개월'까지만. 그 이후 달은 차단.
    //   원인: calMonth를 넘길 때마다 buildPlanFromWeights가 재실행되어 미래 모든 달이
    //   플랜 한도(STANDARD 60건)로 채워졌다. 달력 이동만으로 계획이 무한 생성되던 문제.
    const now = new Date();
    const _cur  = now.getFullYear() * 12 + now.getMonth();
    const _view = calMonth.y * 12 + calMonth.m;
    const _diff = _view - _cur;
    if (_diff < 0 || _diff > 1) return;
    const hasSavedMain = savedWeights && Object.values(savedWeights).some(v => Number(v) >= 50);
    if (!hasSavedMain) return;
    const planFitsMonth = activePlan && activePlan.byDay
      && activePlan.monthY === calMonth.y && activePlan.monthM === calMonth.m
      && Object.keys(activePlan.byDay).length > 0;
    if (planFitsMonth) return;
    // 같은 (월+저장본) 조합으로 중복 재생성 방지
    const key = `${calMonth.y}-${calMonth.m}|${JSON.stringify(savedWeights)}`;
    if (planRebuildKey.current === key) return;
    planRebuildKey.current = key;
    setActivePlan(buildPlanFromWeights(savedWeights, calMonth));
    /* eslint-disable-next-line */
  }, [view, tab, calMonth, savedWeights, activePlan]);

  // [운영코치 조언] 계획(activePlan) + 발행이력(coach.posts) 기반 진단 텍스트 생성.
  //   PHILOSOPHY: 과발행·편중 경고, 공백 보강 권장. "분석→행동" — 채팅창에 비서처럼 전달.
  const diagnosePlan = () => {
    const plan = (activePlan && activePlan.byDay) ? activePlan.byDay : {};
    const planItems = [];
    for (const k of Object.keys(plan)) {
      const v = plan[k]; (Array.isArray(v) ? v : [v]).forEach(it => it && planItems.push(it));
    }
    const lines = ["🩺 발행코치 진단"];

    if (!planItems.length) {
      // [v45 #12] 미설정(unset) vs 한도소진 등 구분.
      if (activePlan && activePlan.unset) {
        lines.push("• 발행비율을 먼저 설정해주세요.");
        lines.push("• 발행비율설정 탭에서 알릴 항목과 비중을 정하면, 그 비중을 바탕으로 한 달 발행 계획을 추천해 드립니다.");
      } else {
        lines.push("• 아직 추천 계획이 없습니다. 발행비율설정 탭에서 항목 비중을 정하고 저장하면 달력에 추천 계획이 배치됩니다.");
      }
      return lines.join("\n");
    }

    // 진료별 편중 계산
    const cnt = {};
    planItems.forEach(it => { const t = it.topic || ""; if (t) cnt[t] = (cnt[t]||0)+1; });
    const ranked = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
    const total = planItems.length;
    const [topName, topCnt] = ranked[0] || ["", 0];
    const topPct = total ? Math.round(topCnt/total*100) : 0;

    // [v42] 플랜 기준 안내 — 계획이 플랜 한도에 맞춰졌음을 사용자에게 명확히. (FREE도 한 달 가득 차던 문제의 사용자 설명)
    if (isUnlimited) {
      lines.push(`🧭 운영자 계정 — 발행 한도 제한 없이 계획을 배치합니다 (현재 ${total}건).`);
    } else if (Number.isFinite(remaining) && Number.isFinite(limit)) {
      lines.push(`🧭 ${planLabel} 플랜 · 이번 달 발행 가능 ${remaining}건(한도 ${limit}건). 계획을 ${total}건으로 맞췄습니다.`);
      if (remaining <= 0) lines.push(`• 이번 달 한도를 모두 사용했습니다. 다음 달 또는 상위 플랜에서 이어서 계획됩니다.`);
    } else if (Number.isFinite(limit)) {
      lines.push(`🧭 ${planLabel} 플랜 · 월 발행 한도 ${limit}건 기준으로 계획을 맞췄습니다 (현재 ${total}건).`);
    }

    // 🔴 편중 경고
    if (topPct >= 60 && ranked.length <= 2) {
      lines.push(`🔴 '${topName}' 편중 ${topPct}% — 같은 진료를 한 달 내내 반복하면 노출이 빨리 밀립니다(과최적화 신호). 주제를 분산하세요.`);
    } else if (topPct >= 40) {
      lines.push(`🟡 '${topName}'에 ${topPct}% 몰려 있습니다. 다른 진료도 섞어 주세요.`);
    } else {
      lines.push(`🟢 진료 분산 양호 (최다 '${topName}' ${topPct}%).`);
    }

    // 🟡 월 계획량 과다 — 하루 권장 1~2건 초과 경고
    const planDays = Object.keys(plan).length;
    const avgPerDay = planDays ? (total / planDays) : 0;
    if (avgPerDay >= 3) {
      lines.push(`🔴 하루 평균 ${avgPerDay.toFixed(1)}건은 과합니다. 매일 다량 발행은 위험 신호 — 이틀에 한 번꼴(주 3~4회)을 권장합니다.`);
    } else if (avgPerDay >= 2) {
      lines.push(`🟡 하루 ${avgPerDay.toFixed(1)}건 계획. 무리면 격일 발행으로 줄여도 됩니다.`);
    }

    // 🟢 공백 주제
    const writtenSet = new Set(coach.posts.map(p => (p.treatment_name||p.keyword||"").trim()).filter(Boolean));
    const pool = Array.isArray(treatmentNames) ? treatmentNames : [];
    const gaps = pool.filter(n => !writtenSet.has(n) && !(n in cnt));
    if (gaps.length) {
      lines.push(`🟢 아직 안 쓴 주제 ${gaps.length}개 — 예: ${gaps.slice(0,3).join(", ")}. 검색 노출 키워드를 넓혀보세요.`);
    }

    // 💡 다음 추천
    const nextTopic = gaps[0] || (ranked.length > 1 ? ranked[ranked.length-1][0] : topName);
    if (nextTopic) {
      const rg = coach.topRegion ? coach.topRegion + " " : "";
      lines.push(`💡 다음 추천: ${rg}${nextTopic} 1건.`);
    }
    return lines.join("\n");
  };

  // 특정 날짜(d, 이번 ym 월) 클릭 시 "오늘 할 일" 조언
  const diagnoseDay = (d) => {
    const plan = (activePlan && activePlan.byDay) ? activePlan.byDay : {};
    const v = plan[d];
    const items = Array.isArray(v) ? v : (v ? [v] : []);
    const lines = [];
    const mm = (calMonth?.m ?? new Date().getMonth()) + 1;
    if (!items.length) {
      lines.push(`📅 ${mm}월 ${d}일 — 예정된 계획이 없습니다.`);
      return lines.join("\n");
    }
    const topics = items.map(it => it.topic);
    lines.push(`📅 ${mm}월 ${d}일 추천`);
    lines.push(`• 오늘 발행: ${topics.map(t=>`${t} 1건`).join(", ")}`);

    // 전체 계획 맥락 한 줄
    const planItems = [];
    for (const k of Object.keys(plan)) { const vv=plan[k]; (Array.isArray(vv)?vv:[vv]).forEach(it=>it&&planItems.push(it)); }
    const cnt = {}; planItems.forEach(it=>{const t=it.topic||""; if(t)cnt[t]=(cnt[t]||0)+1;});
    const ranked = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
    if (ranked.length) {
      const [tn, tc] = ranked[0];
      const pct = planItems.length ? Math.round(tc/planItems.length*100) : 0;
      if (pct >= 60) lines.push(`• 현재 계획: '${tn}' 편중 ${pct}% — 분산 권장`);
    }
    // 이번 주/이번 달 사용 예정
    lines.push(`• 이번 달 발행 예정: ${planItems.length}건`);
    if (Number.isFinite(limit) && limit > 0 && !isUnlimited) {
      lines.push(`• 이번 달 사용 예정: ${Math.min(planItems.length, limit)}/${limit}건`);
    }
    return lines.join("\n");
  };

  // 탭별 본문
  const renderTabBody = () => {
    // 비로그인 — plans(요금제)는 열람 허용, 그 외 허브 탭은 로그인 유도
    if (!isLoggedIn && tab !== "plans") {
      return (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#4A148C", marginBottom: 8 }}>🔒 로그인 후 확인 가능합니다</div>
          <div style={{ fontSize: 12, color: "#999", marginBottom: 20, lineHeight: 1.6 }}>
            글쓰기는 로그인 없이 체험할 수 있어요.<br />로그인하면 운영 현황을 바로 보여드립니다.
          </div>
          <button onClick={onLogin}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#4A148C,#9C27B0)", color: "#fff",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>🔑 로그인</button>
          <button onClick={onWriter}
            style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid #e0d0f0",
              background: "#fff", color: "#7B1FA2", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit" }}>✍️ 먼저 글쓰기 체험하기</button>
        </div>
      );
    }

    // [v120] 업종 미정(업체정보 미등록) 잠금 게이트 — 실사용 탭은 본문 대신 등록 안내만.
    //   v118 철학(강제 리다이렉트 없음) 유지: 튕기지 않고 해당 탭에 들어가되 게이트 화면을 보여준다.
    //   잠금: stats/coach/posts/survival(실사용). 허용: store(등록)·plans(요금제)·account(계정)·tools(사진편집기).
    //   판정 SoT = hubStore.industry. 등록 완료(POST) 시 즉시 해제.
    {
      const LOCKED_UNTIL_STORE = ["stats", "coach", "posts", "survival"];
      const _industryReady = !!(hubStore && hubStore.industry);
      if (isLoggedIn && !_industryReady && LOCKED_UNTIL_STORE.includes(tab)) {
        const goStoreTab = () => { setTab("store"); onTabChange && onTabChange("store"); };
        return (
          <div style={{ background: "linear-gradient(135deg,#faf5ff,#f3e9ff)", borderRadius: 14,
            border: "1.5px solid #e0d0f0", padding: "34px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#4A148C", marginBottom: 10 }}>
              업체정보를 먼저 등록해주세요.
            </div>
            <div style={{ fontSize: 12.5, color: "#7B5E96", marginBottom: 22, lineHeight: 1.7, fontWeight: 600 }}>
              업종·지역 정보를 등록하면<br />발행계획과 글쓰기가 시작됩니다.
            </div>
            <button onClick={goStoreTab}
              style={{ padding: "11px 22px", borderRadius: 10, border: "none",
                background: "#7B1FA2", color: "#fff", fontSize: 13.5, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit" }}>업체정보 등록하기</button>
          </div>
        );
      }
    }

    // [업종센터/B] 우측 상세패널 제거. 업종 선택은 좌측 코치창 트리만. tab=industry도 우측은 업체정보(store).
    if (tab === "store" || tab === "industry") {
      // [v26] 업체정보 — AI 생성용 사업장 데이터. store_profiles 1차 9컬럼 편집(PATCH).
      // [v68] 배지 라벨은 확정된 hubStore.industry 우선(없으면 prop industry fallback).
      const storeIndustry = (hubStore && hubStore.industry) || industry;
      const industryLabel = (storeIndustry && INDUSTRY_CONFIG[storeIndustry]?.label) || (storeIndustry && getCatalogItem(storeIndustry)?.name) || "—";
      return (
        <StoreInfoForm
          authUserId={authUserId}
          hubStore={hubStore}
          setHubStore={setHubStore}
          saveStore={saveStore}
          createStore={createStore}
          storeSaving={storeSaving}
          industryLabel={industryLabel}
          hubLoading={hubLoading}
          isOwner={!!(quotaInfo && (quotaInfo.bypass || quotaInfo.reason === "OWNER_BYPASS"))}
          initialPick={centerPick || industryCenterSel}
          initialSpecialty={centerSpecialty}
          editRef={storeEditRef}
          INDUSTRY_CONFIG={INDUSTRY_CONFIG}
          lex={lex}
          onCoachVideo={onCoachVideo}
          onGoIndustryCenter={() => {
            // [A안 복구] 좌측 코치창 트리 + 우측 상세로 진입. 정상 진입(openCenter)과 동일 경로.
            //   setHelpTab/setResultTab/setNavView는 Home 스코프 → NavPanel은 부모 prop으로 위임.
            if (!industryCenterSel) { setIndustryCenterSel((hubStore && hubStore.industry) || ""); }
            onGoIndustryCenter && onGoIndustryCenter();
          }}
        />
      );
    }

    if (tab === "account") {
      // 마이페이지 = 계정+사용량 단일 화면. 서브탭 없음(내부 재이동 제거).
      //   발행내역은 상단 '최근발행' 탭이 담당 → 하단 링크 버튼 1개로만 연결.
      //   가드레일: 신규 fetch 없음 · SELECT only · 쿼터 숫자는 마이페이지에서만.
      if (hubPosts === null) return loadingCard("내 정보를 불러오는 중입니다…");

      const usageText = isUnlimited ? "무제한" : (hasUsage ? `${used} / ${limit}건` : null);

      // 표시용 파생 — DB 변경 없음. accounts/store_profiles 기존 데이터만 사용.
      // [v80] 업종 = "그룹 > 세부"(예: 병원 > 치과). 확장 대응. 그룹 못 찾으면 세부만.
      let industryLabel = "—";
      if (industry) {
        const subLbl = INDUSTRY_CONFIG[industry]?.label || getCatalogItem(industry)?.name || industry;
        const g = INDUSTRY_GROUPS.find(x => x.key === SUB_TO_GROUP[industry]);
        industryLabel = g ? `${g.label} > ${subLbl}` : subLbl;
      }
      const roleText = isUnlimited ? "운영자(OWNER)" : "일반 회원";

      const statRow = (label, value, accent) => (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "5px 0", borderBottom: "1px solid #f0eef5" }}>
          <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: accent || "#1a1a2e" }}>{value}</span>
        </div>
      );
      // [v80] 2칸 그리드 셀 — 라벨(위) / 값(아래) / 보조설명(sub, 값 옆). 업체정보 카드처럼 컴팩트.
      const statCell = (label, value, accent, sub) => (
        <div style={{ padding: "6px 10px", background: "#faf9fc", borderRadius: 9, border: "1px solid #f0eef5", minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent || "#1a1a2e",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
            {sub ? <span style={{ fontSize: 10.5, color: "#aaa", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span> : null}
          </div>
        </div>
      );
      const statGrid = (children, cols) => (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols || 2},1fr)`, gap: 6 }}>{children}</div>
      );
      const sectionCard = (title, children) => (
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8ed", padding: "8px 14px 9px" }}>
          <div style={{ fontSize: 11, color: "#9457b8", fontWeight: 800, marginBottom: 5 }}>{title}</div>
          {children}
        </div>
      );

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* ⓪ [v29] 관리 안내 — 제목 + 역할 한 줄(컴팩트) */}
          <div style={{ background: "linear-gradient(135deg,#f3e9ff,#fdfbff)",
            border: "1.5px solid #e0d0f0", borderRadius: 12, padding: "10px 16px" }}>
            {/* [세션75] 제목 줄 = 제목 + 우측 회원탈퇴(작은 회색 텍스트).
                하단 「계정 관리」 카드 제거에 따른 이전. 탈퇴는 접근은 되되 강조하지 않는다. */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
              gap: 10, marginBottom: 2 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#4A148C" }}>
                🏠 내 계정 · 관리 페이지
              </div>
              <AccountLeaveButton isOwner={isUnlimited} />
            </div>
          </div>

          {/* [세션96] ① 계정정보 4칸(사업장명·업종·이메일·플랜) → 1줄 축약.
              사업장명·업종·이메일은 전부 업체정보 페이지가 원본이다. 마이페이지에 복사해 두면
              두 화면이 어긋날 때 어느 쪽이 맞는지 알 수 없다 → 원본으로 보내는 링크 한 줄만 둔다.
              플랜은 쿼터 판단에 직결되므로 남긴다. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10,
            background: "#fff", border: "1px solid #f0eef5", borderRadius: 13, padding: "11px 16px" }}>
            <button type="button"
              onClick={() => { setTab("store"); onTabChange && onTabChange("store"); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: 0,
                background: "transparent", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "#4A148C" }}>
              👤 업체정보
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7ba0" }}>바로가기 ›</span>
            </button>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#8a7ba0" }}>플랜</span>
              <span style={{ fontSize: 14, fontWeight: 800,
                color: isUnlimited ? "#6A1B9A" : "#1a1a2e" }}>
                {isUnlimited ? "OWNER" : planLabel}
              </span>
            </div>
          </div>

          {/* ②③ 사용량 + 누적사용량 — 한 줄 4칸. 이번달/남은(쿼터) + URL등록/미등록(누적).
              쿼터 숫자는 마이페이지에서만 노출(가드레일). 발행 판정 = naver_post_url 유무. 신규 fetch 없음. */}
          {(() => {
            const allPosts = filterRealPosts(hubPosts, _scopeInds); // [UI-SCOPE-01] 등록 분야 전체
            // [status 기준 — 추가형(INSERT) 구조 확정 반영]
            //   baseline = 생성 글(url=null) = 사용량 1건 (서버 usage.js와 동일 기준)
            //   published(naver_post_url 있음) = URL 등록완료 (별도 row)
            //   test 등 기타 status는 사용량/등록 집계에서 제외
            const baselineCount  = allPosts.filter(p => p && p.publish_status === "baseline").length;
            const publishedCount = allPosts.filter(p => p && p.naver_post_url).length;
            // [v158] quota 단일출처 전환 — 이번 달 생성·한도·남은은 서버(check-quota)만 본다.
            //   서버는 resolveBillingPeriod(구독 우선 / 캘린더 폴백) 기간으로 집계 → 차단과 표시가 항상 일치.
            //   클라 누적 집계(hubPosts)는 기간 필터가 없어 39/30 같은 오표시 원인이었음 → quota에서 분리.
            //   아래 URL 등록/미등록은 '누적' 참고 지표로만 유지(기간과 무관, 라벨에 누적 명시).
            const genCount = isUnlimited ? null : used;   // 서버 monthly_publish (기간 기준)
            const noUrlCount = Math.max(0, baselineCount - publishedCount);
            const remainGen = isUnlimited ? null : (Number.isFinite(remaining) ? remaining : null);
            // 이번 달 생성 표시: 한도 병기(2/30). 서버 미연동(null)이면 "—".
            const usageWithLimit = isUnlimited ? "무제한"
              : (genCount == null ? "—"
                 : (limit != null ? `${genCount}/${limit}건` : `${genCount}건`));
            const cell = (label, value, accent) => (
              <div style={{ padding: "9px 12px", background: "#faf9fc", borderRadius: 9, border: "1px solid #f0eef5", minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#555", marginBottom: 3,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: accent || "#1a1a2e",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
              </div>
            );
            // [v158] 4칸 = quota 2칸(서버·기간 기준) + 누적 2칸(참고·전체 기간).
            //   앞 2칸만 결제/차단과 직결. 뒤 2칸은 라벨에 '누적' 명시해 기간 혼동 차단.
            //   한도 초과 시 생성칸·남은칸 빨강으로 '끝났음'을 명시(결제 유도).
            const genOver = !isUnlimited && limit != null && genCount != null && genCount >= limit;
            return sectionCard("사용량 · 누적", (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {cell(`${periodLabel} 생성`, usageWithLimit,
                  isUnlimited ? "#6A1B9A" : (genOver ? "#c62828" : undefined))}
                {cell("남은 생성", isUnlimited ? "무제한" : (remainGen != null ? `${remainGen}건` : "—"),
                  isUnlimited ? "#6A1B9A" : (remainGen === 0 ? "#c62828" : "#2e7d32"))}
                {cell("URL 등록(누적)", publishedCount > 0 ? `${publishedCount}건` : "—",
                  publishedCount > 0 ? "#2e7d32" : "#bbb")}
                {cell("URL 미등록(누적)", noUrlCount > 0 ? `${noUrlCount}건` : "—",
                  noUrlCount > 0 ? "#c08a2e" : "#bbb")}
              </div>
            ));
          })()}

          {/* 하단 — 전체 이용내역 펼치기. 사용자 확인용(며칠에 뭐 했나). 보기 링크·순위·점수 없음. */}
          {/* [세션96] 접수내역 — 내 접수와 관리자 답변. 불편사항·기능제안 접수도 여기서 받는다.
              이용내역(펼치면 수십 줄)보다 위에 둔다: 아래에 두면 펼침 상태에서 화면 밖으로 밀려
              "답변이 왔는데 못 봤다"가 된다. */}
          <SupportHistory />

          {(() => {
            const fmtD = (v) => {
              if (!v) return "—";
              const t = new Date(v).getTime();
              if (!Number.isFinite(t)) return "—";
              const d = new Date(t);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            };
            // [v59] 글 단위 통합 — me/posts가 baseline+published 둘 다 반환(추가형 INSERT).
            //   같은 글이 2줄(생성 1 + 발행 1)로 뜨던 문제 → (이름+생성일) 키로 1글 통합.
            //   생성일=baseline created_at 기준. published row가 있으면 그 글에 발행상태·발행일 병합.
            const rows = (() => {
              const real = filterRealPosts(hubPosts, _scopeInds); // [UI-SCOPE-01] 등록 분야 전체
              const dayKey = (v) => { const t = new Date(v).getTime();
                if (!Number.isFinite(t)) return "?"; const d = new Date(t);
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
              const nameOf = (p) => (p.title || p.treatment_name || p.keyword || "").trim();
              const merged = {}; // key → 통합 글
              for (const p of real) {
                // 생성일은 baseline의 created_at 우선. published row는 같은 글로 흡수.
                const baseDate = p.created_at || p.published_at;
                // [v-merge-fix] 통합 키 = 제목만. (구: 제목+생성일 → 지난 생성글 등록 시
                //   published의 created_at이 등록일로 찍혀 baseline과 날짜 갈려 2줄 분리됐음.)
                const mk = nameOf(p);
                const hasUrl = !!p.naver_post_url;
                const prev = merged[mk];
                if (!prev) {
                  merged[mk] = {
                    id: p.id, title: nameOf(p) || "(제목 없음)",
                    created_at: baseDate,
                    naver_post_url: hasUrl ? p.naver_post_url : null,
                    published_at: hasUrl ? (p.published_at || p.created_at) : null,
                  };
                } else {
                  // 생성일은 더 이른 쪽(=baseline) 유지. URL 정보는 published 쪽에서 채움.
                  const prevT = new Date(prev.created_at || 0).getTime();
                  const curT  = new Date(baseDate || 0).getTime();
                  if (Number.isFinite(curT) && curT < prevT) prev.created_at = baseDate;
                  if (hasUrl && !prev.naver_post_url) {
                    prev.naver_post_url = p.naver_post_url;
                    prev.published_at = p.published_at || p.created_at;
                  }
                }
              }
              return Object.values(merged).sort((a, b) => {
                const ta = new Date(a.created_at || a.published_at || 0).getTime();
                const tb = new Date(b.created_at || b.published_at || 0).getTime();
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
              });
            })();
            return (
              <div>
                <button onClick={() => setHistoryOpen(o => !o)}
                  style={{ width: "100%", padding: "11px 16px", borderRadius: 12,
                    border: historyOpen ? "1.5px solid #d9c3ee" : "1.5px solid #e0d0f0",
                    background: historyOpen ? "#faf7ff" : "linear-gradient(135deg,#f7f0ff,#fdfbff)",
                    color: "#7B1FA2", fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: 15 }}>📋</span>
                  {historyOpen ? "접기" : "전체 보기"}{/* [세션96] 라벨 축약 — 카드 제목이 이미 맥락을 준다 */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#9457b8" }}>
                    {historyOpen ? "▲" : `(${rows.length}건) ▼`}
                  </span>
                </button>
                {historyOpen && (
                  <div style={{ marginTop: 10, background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8ed", padding: "2px 14px" }}>
                    {rows.length === 0 ? (
                      <div style={{ fontSize: 13, color: "#bbb", padding: "16px 2px", textAlign: "center" }}>
                        아직 생성한 글이 없습니다.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px 6px", borderBottom: "1px solid #f0eef5" }}>
                          <span style={{ width: 84, fontSize: 11.5, fontWeight: 800, color: "#9457b8" }}>생성일</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 800, color: "#9457b8" }}>제목</span>
                          <span style={{ width: 96, fontSize: 11.5, fontWeight: 800, color: "#9457b8", textAlign: "center" }}>상태</span>
                        </div>
                        {rows.map((p, i) => {
                          const published = !!p.naver_post_url;
                          return (
                            <div key={p.id || i} style={{ display: "flex", alignItems: "center", gap: 10,
                              padding: "9px 2px", borderBottom: i < rows.length - 1 ? "1px solid #f5f3f8" : "none" }}>
                              <span style={{ width: 84, fontSize: 12, color: "#888" }}>{fmtD(p.created_at || p.published_at)}</span>
                              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "#1a1a2e",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {p.title || p.treatment_name || p.keyword || "(제목 없음)"}
                              </span>
                              <span style={{ width: 96, textAlign: "center" }}>
                                {published
                                  ? <span style={{ fontSize: 10.5, fontWeight: 800, color: "#2e7d32", background: "#eafaef", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>🟢 URL등록 완료</span>
                                  : <span style={{ fontSize: 10.5, fontWeight: 700, color: "#c08a2e", background: "#fdf6e9", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>🟡 생성완료</span>}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* [세션75] 하단 「계정 관리」 카드 제거.
              · 플랜 변경 → 상단 요금제 탭과 중복
              · 정기결제 해지·재개 → 유료 회원 발생(B-4 결제 배선) 이후 재배치
              · 회원탈퇴 → 헤더 우측 상단 텍스트 버튼으로 이전 */}
        </div>
      );
    }

    if (tab === "plans") {
      // 💳 요금제 — NavPanel 내부 탭. 탭바 유지(동선 끊김 방지). 카드 비교 + 업그레이드(PG는 추후).
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#1A1333", letterSpacing: "-.02em",
              lineHeight: 1.3, marginBottom: 12 }}>
              사업 규모에 맞는 플랜을 선택하세요.
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.55 }}>
              블로그는 한 번 쓰고 사라지는 광고가 아닙니다.
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#6A1B9A", lineHeight: 1.55 }}>
              검색하면 언제든 다시 나오는, 내 사업장의 검색 자산입니다.
            </div>
          </div>
          {/* [세션59] 요금제 카드 리디자인 — 발행 리듬(주간 도트) 시그니처 + 카드 위계 정리. 데이터·동작 무변경. */}
          <style>{`
            .planCard { transition: transform .18s ease, box-shadow .18s ease; }
            .planCard:hover { transform: translateY(-4px); box-shadow: 0 14px 34px rgba(70,30,120,.13); }
            .planCard.isHi:hover { transform: translateY(-10px) scale(1.05); }
            .planCta:focus-visible { outline: 2px solid #6A1B9A; outline-offset: 2px; }
            .planGrid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px;
              align-items: stretch; padding: 16px 0 18px; }
            @media (max-width: 1180px) { .planGrid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
            @media (max-width: 720px)  { .planGrid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
            .planBig { font-size: clamp(21px, 1.9vw, 29px); white-space: nowrap; }
            @media (prefers-reduced-motion: reduce) {
              .planCard, .planCard:hover, .planCard.isHi:hover { transition: none; transform: none; }
            }
          `}</style>
          <div className="planGrid">
            {PLANS.map(p => {
              const cur = !isUnlimited && String(planLabel).toLowerCase() === p.id;
              // [세션59] Free = 무채색 톤다운(유료 플랜에 시선 양보). 나머지는 플랜 고유색.
              const ac = p.id === "free" ? "#9b95aa" : p.color;
              const perDay = { free: 0, basic: 1, standard: 2, pro: 3, enterprise: 5 }[p.id] || 0;
              const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
              return (
                <div key={p.id} className={"planCard" + (p.highlight ? " isHi" : "")} style={{
                  background: p.crown ? "linear-gradient(180deg,#FFFDF6 0%,#fff 46%)" : "#fff",
                  borderRadius: 15, display: "flex", flexDirection: "column",
                  border: p.crown ? "1.5px solid #C9A227" : (p.highlight ? `1.5px solid ${ac}` : (cur ? `1.5px solid ${ac}55` : "1px solid #ECE7F5")),
                  padding: "16px 13px 14px", position: "relative",
                  transform: p.highlight ? "translateY(-6px) scale(1.04)" : "none", zIndex: p.highlight ? 2 : 1,
                  boxShadow: p.crown ? "0 10px 28px rgba(201,162,39,.20)"
                    : (p.highlight ? `0 14px 34px ${ac}22` : "0 2px 10px rgba(70,30,120,.05)") }}>
                  {(p.highlight || p.crown) && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                      background: p.crown ? "linear-gradient(135deg,#7B1FA2,#C9A227)" : ac,
                      color: "#fff", fontSize: 10.5, fontWeight: 900,
                      letterSpacing: ".04em", padding: "4px 12px", borderRadius: 999,
                      boxShadow: p.crown ? "0 4px 12px rgba(201,162,39,.45)" : `0 4px 12px ${ac}40`,
                      whiteSpace: "nowrap" }}>
                      {p.crown ? "👑 가장 강력한 플랜" : "가장 많이 선택"}
                    </div>
                  )}

                  {/* 플랜명 · 한 줄 성격 */}
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: ac, letterSpacing: ".01em" }}>
                    {p.name}{p.crown ? " 👑" : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8b83a0", marginTop: 2 }}>{p.desc}</div>

                  {/* [판매 포인트] 발행량 우선 — 가격보다 크게 */}
                  <div style={{ marginTop: 10, whiteSpace: "nowrap" }}>
                    <div className="planBig" style={{ fontWeight: 900, letterSpacing: "-.03em",
                      color: p.id === "free" ? "#6f6980" : "#1A1333", lineHeight: 1.1 }}>{p.big}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: ac, marginTop: 3 }}>{p.sub}</div>
                  </div>
                  {p.crown && (
                    <div style={{ fontSize: 11, color: "#C9A227", letterSpacing: ".12em", marginTop: 6 }}>★★★★★</div>
                  )}

                  {/* 가격 — 보조 정보 */}
                  <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 2,
                    whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#5d566f", letterSpacing: "-.02em" }}>{p.price}</span>
                    <span style={{ fontSize: 10.5, color: "#a49cb8", fontWeight: 700 }}>{p.unit}</span>
                  </div>

                  {/* [시그니처] 발행 리듬 — 한 주에 몇 건을 올리는 플랜인지 눈으로 보이게 */}
                  <div style={{ marginTop: 11, padding: "9px 9px 7px", borderRadius: 11,
                    background: ac + "0d", border: `1px solid ${ac}1f` }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: ac,
                      letterSpacing: ".03em", marginBottom: 6 }}>{p.tagline}</div>
                    {perDay === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, height: 32 }}>
                        {[0, 1, 2].map(i => (
                          <span key={i} style={{ width: 16, height: 5, borderRadius: 3, background: ac }} />
                        ))}
                        <span style={{ fontSize: 10.5, color: "#8b83a0", marginLeft: 4 }}>체험 3건</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 32 }}>
                        {DAYS.map((d, di) => (
                          <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column",
                            alignItems: "center", gap: 2 }}>
                            <div style={{ display: "flex", flexDirection: "column-reverse", gap: 2 }}>
                              {Array.from({ length: perDay }).map((_, k) => (
                                <span key={k} style={{ width: "100%", minWidth: 7, height: 4,
                                  borderRadius: 2, background: di >= 5 ? ac + "59" : ac }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 8.5, color: "#b4adc4", fontWeight: 700 }}>{d}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 포함 항목 */}
                  <div style={{ display: "flex", flexDirection: "column", marginTop: 10, marginBottom: 12 }}>
                    {p.feats.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ fontSize: 11.5, color: "#4a4458", display: "flex", gap: 6,
                        alignItems: "flex-start", padding: "5px 0",
                        borderTop: i === 0 ? "none" : "1px solid #F4F0FA" }}>
                        <span style={{ flexShrink: 0, width: 14, height: 14, borderRadius: 5,
                          background: ac + "1a", color: ac, fontSize: 9.5, fontWeight: 900,
                          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>✓</span>
                        <span style={{ lineHeight: 1.45 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA — 카드 바닥 정렬 */}
                  <div style={{ marginTop: "auto" }}>
                  {isUnlimited ? (
                    <div style={{ width: "100%", padding: "9px 0", borderRadius: 10, textAlign: "center",
                      background: "#F7F5FB", color: "#b4adc4", fontSize: 12.5, fontWeight: 800 }}>
                      OWNER
                    </div>
                  ) : cur ? (
                    <div style={{ width: "100%", padding: "9px 0", borderRadius: 10, textAlign: "center",
                      background: ac + "12", color: ac, fontSize: 12.5, fontWeight: 900 }}>
                      현재 플랜
                    </div>
                  ) : p.id === "free" ? (
                    /* [PLAN-CARD-CTA-NO-CHECKOUT-01] Free는 결제 대상이 아니다.
                       「플랜 변경」으로 보이면서 클릭만 안 되는 상태보다 비활성 「기본 플랜」이 정확하다.
                       subscribe.js의 isFree → btnDisabled/'기본 플랜' 표현과 일치시킨다. */
                    <div style={{ width: "100%", padding: "9px 0", borderRadius: 10, textAlign: "center",
                      border: "1.5px solid #E8E0F4", background: "#F7F5FB", color: "#b4adc4",
                      fontSize: 12.5, fontWeight: 800 }}>
                      기본 플랜
                    </div>
                  ) : (
                    <button className="planCta"
                      /* [PLAN-CARD-CTA-NO-CHECKOUT-01] 종전 alert(이메일 문의) → 결제 정본 페이지 이동.
                         ?plan= 자동선택은 신설하지 않는다 — subscribe.js가 자체 카드/버튼을 그린다. */
                      onClick={() => { if (!isLoggedIn) { onLogin && onLogin(); return; } router.push("/billing/subscribe"); }}
                      style={{ width: "100%", padding: "9px 0", borderRadius: 10,
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                        border: p.highlight ? "none" : "1.5px solid #E8E0F4",
                        background: p.highlight ? ac : "#fff",
                        color: p.highlight ? "#fff" : "#4A148C",
                        boxShadow: p.highlight ? `0 4px 14px ${ac}3d` : "none" }}>
                      {(() => {
                        const order = PLANS.map(x => x.id);
                        const ci = order.indexOf(String(planLabel).toLowerCase());
                        const ti = order.indexOf(p.id);
                        return (ci >= 0 && ti > ci) ? "업그레이드" : "플랜 변경";
                      })()}
                    </button>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#444", textAlign: "center", marginTop: 26 }}>
            광고를 멈추면 노출도 멈춥니다. 검색 자산은 계속 쌓입니다.
          </div>
          {/* ★ [S111] 서비스 제공기간·자동갱신 고지 — 전자상거래법 및 PG(KG이니시스) 심사 모니터링 항목.
              심사관이 요금제 화면에서 직접 확인한다. 요금·한도 변경 시 PLANS / lib/billing/plans.js /
              lib/policies/refund.js 건당 단가와 함께 갱신할 것(이중 관리 지점). */}
          <div style={{
            maxWidth: 900, margin: "22px auto 0", padding: "16px 18px",
            background: "#fafafd", border: "1px solid #e8e4f0", borderRadius: 12,
            fontSize: 12.5, color: "#5a5a6a", lineHeight: 1.75,
          }}>
            <div style={{ fontWeight: 900, color: "#4A148C", fontSize: 13, marginBottom: 6 }}>
              서비스 제공기간 및 이용 안내
            </div>
            · 서비스 제공기간 — 결제일로부터 1개월(월 단위). 별도 배송이 없는 온라인 서비스로, 결제 완료 즉시 이용할 수 있습니다.<br />
            · 자동갱신 — 월 정기결제이며 매 결제일에 동일 플랜으로 자동 갱신됩니다. 해지 시 다음 결제일부터 청구되지 않으며, 이미 결제된 이용기간은 만료일까지 이용할 수 있습니다.<br />
            · 발행 한도 — 각 플랜의 월 발행 건수는 결제 주기 시작 시 초기화되며 다음 달로 이월되지 않습니다.<br />
            · 청약철회 및 환불 — 환불정책에 따르며, 사용한 발행 건수만큼 공제 후 잔액을 환불합니다.<br />
            · 이용요금은 부가세 포함 금액입니다.
          </div>
        </div>
      );
    }

    if (tab === "stats") {
      // [v45] 발행비율설정 = 시술선택 + 비율설정 통합(1단계).
      //   생성기 카드 UI 재활용. 카드 내부에 [☑사용 / 발행요율 숫자입력].
      //   null=미설정(키없음) / 0=사용안함 / 1~100=사용. 첫 진입 시 전 항목 기본 50(위 useEffect).
      const baseMenus = Array.isArray(treatmentNames) ? treatmentNames : [];
      const allMenus = [...baseMenus, ...extraMenus];
      if (allMenus.length === 0) {
        return pendingCard("진료 목록을 불러오는 중입니다", "업체 업종이 설정되면 진료 항목이 여기에 표시됩니다.");
      }

      // 카드 메타(이모지·카테고리) — treatments 객체에서 이름으로 매칭. 추가 항목은 기본 이모지.
      const tList = Array.isArray(treatments) ? treatments : [];
      const metaOf = (name) => {
        // [v152] 업종 공통 매칭 — restaurant는 t.menu/menuRef가 표시명(name 없음). clinic류는 t.name.
        const t = tList.find(x => (x.menu || x.menuRef || x.name) === name);
        return { emoji: t?.emoji || "📝", cat: t?.cat || (extraMenus.includes(name) ? "직접추가" : "") };
      };

      // [v46] 3단계 토글 — 사용자는 30/50/70 숫자를 계산하지 않는다.
      //   ❌ 사용안함 = 0 / 🟡 보조 = 30 / 🔥 주력 = 70  (시스템이 내부 변환)
      //   기존 저장값(50 등)도 단계로 스냅해서 표시: 0=끔, 1~49=보조, 50~100=주력.
      const VAL = { off: 0, sub: 30, main: 70 };
      const stageOf = (v) => { const n = Number(v || 0); if (n <= 0) return "off"; if (n < 50) return "sub"; return "main"; };
      const nextStage = (s) => (s === "off" ? "sub" : s === "sub" ? "main" : "off"); // 끔→보조→주력→끔

      // 사용중(>0) 항목 — 저장 가능 판정용.
      const setWeights = Object.entries(menuWeights).filter(([, v]) => Number(v) > 0);

      // 빠른 옵션
      const applyAllSub  = () => { const w = {}; for (const m of allMenus) w[m] = VAL.sub;  setMenuWeights(w); setWeightsDirty(true); };

      // 카드 클릭 = 3단계 순환. 발행 숫자 입력은 제거(단계 버튼으로 대체).
      const cycleMenu = (name) => {
        setMenuWeights(prev => {
          const s = stageOf(prev[name]); return { ...prev, [name]: VAL[nextStage(s)] };
        });
        setWeightsDirty(true);
      };
      const mainCount = allMenus.filter(m => stageOf(menuWeights[m]) === "main").length;
      const subCount  = allMenus.filter(m => stageOf(menuWeights[m]) === "sub").length;

      // 저장 — 확정값 복사 + 즉시 달력 계획 생성 → 발행코치 탭으로 자동 이동(저장=다음 단계 진입).
      const onSaveWeights = () => {
        // [v149] 내 메뉴(allMenus)에 속한 항목만 저장. menuWeights에 잔존하던 편집 전 항목(필터로 카드에서
        //   사라졌지만 값은 남은 것)이 plan에 새어 달력에 노출되던 버그 차단. allMenus = baseMenus(내 메뉴 필터) + extraMenus.
        const allowed = new Set(allMenus);
        const w = {};
        for (const [k, v] of Object.entries(menuWeights)) { if (allowed.has(k)) w[k] = v; }
        // 주력(🔥, ≥50) 없으면 저장하지 않는다(보조만 저장된 비정상 저장본 방지).
        if (!Object.values(w).some(v => Number(v) >= 50)) return;
        setMenuWeights(w);   // 잔존 키 제거된 상태로 동기화
        setSavedWeights(w); setWeightsDirty(false);
        setActivePlan(buildPlanFromWeights(w, calMonth));
        // 설정에서 멈추지 않도록 발행코치로 바로 넘긴다. 좌측 코치는 보조 안내만.
        setTab("coach");
        onTabChange && onTabChange("coach");
      };
      // [v-cnt1] 업종별 항목 용어 — lex().itemWord 단일 출처(전 화면 동일 용어).
      //   이브자리=상품 / 음식점=메뉴 / 병원=시술 / 법무=업무. 기존 하드코딩 "업무" 대체.
      const _ITEM_WORD = lex(currentIndustry).itemWord;

      // [v55] 정식 저장본 판정 = 주력(≥50)이 1개 이상 있을 때만. 보조만 저장된 비정상 저장본은 무효.
      const hasSaved = savedWeights && Object.values(savedWeights).some(v => Number(v) >= 50);

      // [v150] "새로 설정하기" = 주력업무 편집 모드 재진입. (구 의미인 "발행비율/메뉴 초기화" 아님.)
      //   기존 저장된 주력업무는 myMenusMap에 그대로 두고, 우측 편집기에 복원된 채로 추가·삭제만 한다.
      //   ⚠️ myMenus 삭제 금지(지시서 §4). menuWeights/savedWeights/activePlan도 건드리지 않는다.
      const onResetStrategy = () => { setEditingMenus(true); };

      // [v150] 진짜 발행비율(요율)만 초기화 — 주력업무는 유지. 리셋 동작(지시서 §4).
      const onResetRatioOnly = () => {
        if (!window.confirm(`발행비율(요율)만 초기화됩니다. 주력${_ITEM_WORD}는 그대로 유지됩니다.`)) return;
        const w = {}; for (const m of allMenus) w[m] = VAL.sub; // 주력업무 항목만 보조로
        setMenuWeights(w);
        setSavedWeights(null);
        setActivePlan(null);
        setWeightsDirty(true);
        try { window.localStorage.setItem("aipost_plan_state_v1", JSON.stringify({ menuWeights: w, savedWeights: null, activePlan: null, extraMenus: Array.isArray(extraMenus) ? extraMenus : [] })); } catch {}
      };

      // [v150] 주력업무 편집기 저장 — myMenusMap[업종] 확정 후 편집모드 종료 → 발행비율 카드로 복귀.
      //   주력 0개면 저장 막음(아무것도 운영 안 하는 상태 방지). 비율(menuWeights)은 건드리지 않는다.
      const onSaveMyMenu = () => {
        // [MultiDeptMenu] 다중과 = 전 진료과 통합 목록 기준. 단일과 = 기존 단일 키.
        const cur = (isMultiDept && Array.isArray(myMenuFlat))
          ? myMenuFlat.map(x => x.name)
          : ((myMenusMap && Array.isArray(myMenusMap[currentIndustry])) ? myMenusMap[currentIndustry] : []);
        if (cur.length === 0) { window.alert(`주력${_ITEM_WORD}를 1개 이상 선택해 주세요.`); return; }
        // [v151] 저장 시 나의 메뉴 항목 weight 시드 — 카드가 회색 OFF로 보이는 모순 방지.
        //   이미 값이 있는 항목(주력/보조)은 보존, 값 없는 항목만 보조(30)로 ON.
        setMenuWeights(prev => {
          const next = { ...(prev || {}) };
          cur.forEach(name => { if (!(Number(next[name]) > 0)) next[name] = VAL.sub; });
          return next;
        });
        setEditingMenus(false); // 발행비율 카드 화면으로 복귀(저장은 toggle 시 이미 myMenusMap에 반영됨)
        // [v-menuclean] 저장 Toast 1.5s
        try { setMenuToast("저장되었습니다."); setTimeout(() => setMenuToast(""), 1500); } catch {}
      };

      // [#7] 없는 진료 즉시 추가 — 카드 바로 생성(승인 없음). 사용자 개인 메뉴.
      const addMenu = () => {
        const name = (newMenuInput || "").trim();
        if (!name) return;
        if (!allMenus.includes(name)) setExtraMenus(prev => [...prev, name]);
        setMenuWeights(prev => ({ ...prev, [name]: VAL.sub })); // 추가 즉시 🟡보조
        setWeightsDirty(true);
        setNewMenuInput("");
      };

      const card = { background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "16px 18px" };

      // [v148] 내 메뉴 편집 — masterMenuNames(업종 전체) 중 토글로 선택, 저장 시 myMenusMap[업종]에 반영.
      //   편집 중 임시 선택은 menuDraft(로컬). 저장 전까지 발행비율/AI글쓰기에 영향 없음.
      const masterAll = Array.isArray(masterMenuNames) ? masterMenuNames : [];
      // [MultiDeptMenu] 병원 다중과 = 전 진료과 통합(myMenuFlat). 단일과·비병원 = 기존 currentIndustry 단일 키.
      const _flat = Array.isArray(myMenuFlat) ? myMenuFlat : [];
      const _multi = !!isMultiDept && _flat.length >= 0 && !!isMultiDept;
      const curMyMenu = _multi
        ? _flat.map(x => x.name)
        : ((myMenusMap && Array.isArray(myMenusMap[currentIndustry])) ? myMenusMap[currentIndustry] : []);
      // 메뉴명 → 진료과 라벨(배지). 단일과 = 빈 문자열(배지 미표시).
      const deptBadgeOf = (name) => {
        if (!_multi) return "";
        const hit = _flat.find(x => x.name === name);
        return hit ? (hit.deptLabel || (deptLabelOf ? deptLabelOf(hit.dept) : "")) : "";
      };
      const usingMyMenu = curMyMenu.length > 0;
      // [v150] 우측 "나의 메뉴"에서 칩 삭제(추가는 좌측 전체메뉴 패널이 담당)
      //   [MultiDeptMenu] 다중과 = 소속 진료과 키에서 제거(부모 헬퍼 위임). 단일과 = 기존 동작.
      const removeMyMenu = (name) => {
        if (_multi && onRemoveMyMenuDept) {
          const hit = _flat.find(x => x.name === name);
          onRemoveMyMenuDept(name, hit ? hit.dept : null);
          return;
        }
        setMyMenusMap(prev => {
          const cur = Array.isArray(prev[currentIndustry]) ? prev[currentIndustry] : [];
          return { ...prev, [currentIndustry]: cur.filter(x => x !== name) };
        });
      };
      // [v150] 발행비율 사용법 모달 (stats 내부 전용 — 새 탭/좌측메뉴 없음)
      const ratioHelpModal = ratioHelpOpen ? (
        <div onClick={() => setRatioHelpOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, maxWidth: 440, width: "100%", maxHeight: "85vh",
              overflowY: "auto", padding: "22px 24px", boxShadow: "0 12px 40px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#4A148C" }}>📊 발행비율이란?</div>
              <button onClick={() => setRatioHelpOpen(false)}
                style={{ border: "none", background: "#f3e9ff", borderRadius: 8, width: 30, height: 30,
                  cursor: "pointer", fontSize: 16, fontWeight: 800, color: "#7B1FA2" }}>×</button>
            </div>
            <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#444" }}>
              <li>주력{_ITEM_WORD}만 선택하세요</li>
              <li>모든 {_ITEM_WORD}를 선택할 필요는 없습니다</li>
              <li>플랜에 맞게 개수를 정하는 것이 좋습니다</li>
            </ul>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#6A1B9A", margin: "0 0 8px" }}>예시</div>
            <div style={{ background: "#faf5ff", border: "1px solid #e8d8f5", borderRadius: 10, padding: "12px 14px",
              fontSize: 12.5, lineHeight: 1.7, color: "#555", marginBottom: 10 }}>
              베이직(30건) → 10개 업무 선택 → 업무당 월 3건<br />
              베이직(30건) → 30개 업무 선택 → 업무당 월 1건
            </div>
            <div style={{ fontSize: 12.5, color: "#C62828", fontWeight: 700 }}>
              업무가 많을수록 집중도가 떨어집니다.
            </div>
          </div>
        </div>
      ) : null;

      // [v150] 현재 주력업무(=나의 메뉴) 이름 배열. 우측 칩/저장에서 사용.
      const myMenuPicked = curMyMenu;

      // ── 편집 모드: 우측 = "나의 메뉴" 확정 패널 (좌측이 전체 메뉴 담당). 저장 시 발행비율 카드로 복귀 ──
      if (editingMenus) {
        // [v152] 월 목표 = 플랜 quota. OWNER(무제한·bypass)는 quota가 숫자가 아니므로 데모 기준(60건)으로 미리보기.
        const DEMO_QUOTA = 60; // OWNER 미리보기 기준 (Standard). 실사용자는 실제 plan quota 사용.
        const planQuota = Number.isFinite(limit) && limit > 0 ? limit
                        : (isUnlimited ? DEMO_QUOTA : null);
        const planQuotaIsDemo = !(Number.isFinite(limit) && limit > 0) && isUnlimited;

        // [v152] 가중치 비례 배분 — 월 목표(planQuota)를 주력(50)/보조(30) weight 비율로 자동 분배.
        //   주력/보조 weight 그대로 사용. 합계가 planQuota와 정확히 일치하도록 잔여분(remainder) 보정.
        const wOf = (name) => { const v = Number(menuWeights[name] || 0); return v > 0 ? v : 30; }; // 시드 누락 안전망(보조)
        const totalW = myMenuPicked.reduce((s, n) => s + wOf(n), 0);
        const planCounts = {};
        if (planQuota && totalW > 0 && myMenuPicked.length > 0) {
          let assigned = 0;
          const raw = myMenuPicked.map(n => ({ n, exact: planQuota * wOf(n) / totalW }));
          raw.forEach(r => { planCounts[r.n] = Math.floor(r.exact); assigned += planCounts[r.n]; });
          // 잔여분 = planQuota - 합. 소수부 큰 순으로 +1.
          let remain = planQuota - assigned;
          raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
          for (let i = 0; i < raw.length && remain > 0; i++, remain--) planCounts[raw[i].n] += 1;
        }
        const mainPicked = myMenuPicked.filter(n => stageOf(menuWeights[n]) === "main");
        const subPicked  = myMenuPicked.filter(n => stageOf(menuWeights[n]) !== "main"); // 보조 + 시드기본
        // [v152] 운영 지역 — 업체정보 기반(대표지역 + 생활권 콤마분리). 없으면 숨김(고정숫자 금지).
        const repRegion = (hubStore && hubStore.region ? String(hubStore.region) : "").trim();
        const subRegions = (hubStore && hubStore.sub_region ? String(hubStore.sub_region) : "")
          .split(/[,·]/).map(s => s.trim()).filter(Boolean);
        const regionCount = (repRegion ? 1 : 0) + subRegions.length;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ratioHelpModal}
            {soldOutBanner}

            {/* 제목 + 사용법 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#333" }}>메뉴 선택</div>
              <button onClick={() => setRatioHelpOpen(true)}
                style={{ border: "1.5px solid #d8c4ed", background: "#fff", borderRadius: 9, padding: "6px 12px",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: "#7B1FA2" }}>
                ❓ 사용법
              </button>
            </div>

            {/* [v-menuclean 2026-07-14] '이번 달 운영 계획' 카드 제거 — 운영계획은 발행비율 화면(일반 모드) 담당.
                 planCounts/mainPicked/subPicked 계산은 카드 내부 배지에서 계속 사용하므로 유지. */}

            {/* 선택한 메뉴 */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e0d0f0", padding: "13px 15px", minHeight: 90 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#6a1b9a", marginBottom: 8 }}>
                선택한 메뉴 <span style={{ color: "#999", fontWeight: 700 }}>({myMenuPicked.length}개)</span>
              </div>
              {myMenuPicked.length === 0 ? (
                <div style={{ fontSize: 12, color: "#aaa", padding: "8px 2px", lineHeight: 1.6 }}>
                  선택한 메뉴가 없습니다.<br />왼쪽에서 메뉴를 선택하세요.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {myMenuPicked.map(name => {
                    const m = metaOf(name);
                    const isMain = stageOf(menuWeights[name]) === "main";
                    const cnt = planCounts[name];
                    return (
                      // [v-cardsize] 좌측 「병원 전체 메뉴」 카드와 동일 크기·구조.
                      //   좌측 = 메뉴 선택 / 우측 = 운영 계획(주력·보조 + 월 건수). 역할만 다르고 형태는 통일.
                      <button key={name} onClick={() => removeMyMenu(name)}
                        title="클릭: 선택 해제"
                        style={{ background: "#f3e9ff", borderRadius: 7, border: "1.5px solid #9C27B0",
                          padding: "8px 8px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .12s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: "#4A148C",
                            lineHeight: 1.2, wordBreak: "keep-all", flex: 1 }}>{name}</span>
                          {m.cat ? (
                            <span style={{ fontSize: 8.5, color: "#9C27B0", fontWeight: 700, background: "#fff",
                              borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", flexShrink: 0 }}>{m.cat}</span>
                          ) : null}
                        </div>
                        {/* [v-menuclean] 주력/보조·월N건 배지 제거 — 운영계획은 발행비율 화면 담당. 진료과 배지만 유지. */}
                        {deptBadgeOf(name) ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <span style={{ fontSize: 8.5, fontWeight: 800, color: "#fff", background: "#7B1FA2",
                              borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", flexShrink: 0 }}>
                              {deptBadgeOf(name)}
                            </span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 저장 */}
            <button onClick={onSaveMyMenu} disabled={myMenuPicked.length === 0}
              style={{ border: "none", borderRadius: 11, padding: "14px 16px",
                cursor: myMenuPicked.length === 0 ? "default" : "pointer", fontFamily: "inherit",
                fontSize: 14.5, fontWeight: 900, color: myMenuPicked.length === 0 ? "#aaa" : "#fff",
                background: myMenuPicked.length === 0 ? "#e8e8ed" : "linear-gradient(135deg,#1b8a4b,#2ecc71)",
                boxShadow: myMenuPicked.length === 0 ? "none" : "0 2px 8px rgba(46,204,113,.35)" }}>
              💾 저장
            </button>

            {/* [세션58] 발행비율 — 저장 버튼 아래 영상 고정(닫기 없음). */}
            <CoachVideoCard menuId="stats" />

            {/* [v-menuclean] 저장 Toast */}
            {menuToast ? (
              <div style={{ position: "fixed", left: "50%", bottom: 40, transform: "translateX(-50%)",
                background: "rgba(30,20,45,.92)", color: "#fff", borderRadius: 10, padding: "10px 20px",
                fontSize: 13, fontWeight: 800, zIndex: 9999, boxShadow: "0 4px 16px rgba(0,0,0,.25)" }}>
                ✅ {menuToast}
              </div>
            ) : null}
          </div>
        );
      }

      // ── 일반 모드: 발행비율 카드 화면 ──
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ratioHelpModal}
          {soldOutBanner}

          {/* 상단: 제목 + 사용법 + 새로 설정하기 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#333" }}>
              발행비율 설정
              {usingMyMenu && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#7B1FA2" }}>
                {/* [v-cnt1] 라벨 오류 수정 — curMyMenu.length는 '운영 목록 수'이지 주력 수가 아니다.
                    🔥주력 판정(≥50)은 mainCount. 우측 배지("🔥 주력 N개 선택됨")와 수치 정합. */}
                {_ITEM_WORD} {curMyMenu.length}개 운영 중{mainCount >= 1 ? ` · 주력 ${mainCount}개` : ""}</span>}
            </div>
            {/* [v-hdr] 사용법 버튼 제거(영상 카드가 하단에 상시 노출) · 새로 설정 버튼 강조 */}
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={onResetStrategy}
                style={{ border: "none", borderRadius: 10, padding: "9px 18px",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 900, color: "#fff",
                  background: "linear-gradient(135deg,#7B1FA2,#9C27B0)",
                  boxShadow: "0 2px 8px rgba(123,31,162,.32)" }}>
                ✏️ 주력{_ITEM_WORD} 새로 설정
              </button>
            </div>
          </div>

          {/* 저장(달력 반영) + 상태 안내 */}
          <div style={{ background: "linear-gradient(135deg,#faf5ff,#f3e9ff)", borderRadius: 16,
            border: "1.5px solid #e0d0f0", padding: "14px 18px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {(() => {
                const canSave = mainCount >= 1 && (weightsDirty || !hasSaved);
                return (
                  <button onClick={onSaveWeights} disabled={!canSave}
                    style={{ border: "none", borderRadius: 9, padding: "8px 16px", cursor: canSave ? "pointer" : "default",
                      fontFamily: "inherit", fontSize: 12.5, fontWeight: 900, color: canSave ? "#fff" : "#aaa",
                      background: canSave ? "linear-gradient(135deg,#1b8a4b,#2ecc71)" : "#e8e8ed",
                      boxShadow: canSave ? "0 2px 8px rgba(46,204,113,.35)" : "none" }}>
                    {canSave ? "💾 저장하고 달력 반영" : hasSaved ? "✓ 저장됨" : "💾 저장"}
                  </button>
                );
              })()}
              {(() => {
                const dirtyOrUnsaved = weightsDirty || !hasSaved;
                if (mainCount === 0) {
                  return <span style={{ margin: "0 auto", fontSize: 15, fontWeight: 900, color: "#C62828" }}>
                    🔥 주력할 주제를 선택하세요
                  </span>;
                }
                if (dirtyOrUnsaved) {
                  return <span style={{ margin: "0 auto", fontSize: 15, fontWeight: 900, color: "#1b8a4b" }}>
                    💾 저장을 누르면 달력으로 이동합니다
                  </span>;
                }
                return null;
              })()}
              {mainCount >= 1 && (
                <span style={{ marginLeft: (weightsDirty || !hasSaved) ? 8 : "auto", alignSelf: "center",
                  fontSize: 14, fontWeight: 900, color: "#C62828" }}>
                  🔥 주력{_ITEM_WORD} {mainCount}개 선택됨
                </span>
              )}
            </div>
          </div>

          {/* [v152] 이번 달 운영 계획 요약 — activePlan 실제 합계(좌측 코치와 동일 기준). 없으면 plan quota 폴백. */}
          {(() => {
            // activePlan.byDay 합계 = 좌측 "이번 달 예정 발행 N건"과 동일 출처.
            let planTotal = 0;
            if (activePlan && activePlan.byDay) {
              for (const d of Object.values(activePlan.byDay)) {
                if (Array.isArray(d)) planTotal += d.length; else if (d) planTotal += 1;
              }
            }
            const DEMO_QUOTA = 60;
            const quotaBase = Number.isFinite(limit) && limit > 0 ? limit : (isUnlimited ? DEMO_QUOTA : null);
            const planQuota = planTotal > 0 ? planTotal : quotaBase; // 실제 계획 우선
            const isPreview = !(planTotal > 0) && !(Number.isFinite(limit) && limit > 0) && isUnlimited;
            if (planQuota == null) return null;
            return (
              <div style={{ background: "linear-gradient(135deg,#f3e9ff,#ede1fb)", borderRadius: 14,
                border: "1.5px solid #d8c4ed", padding: "12px 16px",
                display: "flex", flexWrap: "wrap", gap: "6px 18px", alignItems: "center",
                fontSize: 12.5, color: "#444", fontWeight: 700 }}>
                <span style={{ fontSize: 13.5, fontWeight: 900, color: "#4A148C" }}>📊 이번 달 운영 계획</span>
                <span>{planTotal > 0 ? "이번 달 예정 발행" : "월 목표 발행"} <b style={{ color: "#6A1B9A" }}>{planQuota}건</b>
                  {isPreview && <span style={{ color: "#aaa", fontWeight: 600, fontSize: 11 }}> (미리보기)</span>}
                </span>
                <span>운영 {_ITEM_WORD} <b style={{ color: "#6A1B9A" }}>{mainCount + subCount}개</b>
                  <span style={{ color: "#999", fontWeight: 600 }}> (🔥{mainCount} · 🟡{subCount})</span>
                </span>
              </div>
            );
          })()}


          {(() => {
            const shown = allMenus;
            // [v152] 카드별 월 예상 건수.
            //   우선: activePlan.byDay 실제 배치(좌측 코치·달력과 동일). 없으면 weight 비례 폴백.
            const planCounts = {};
            let fromPlan = false;
            if (activePlan && activePlan.byDay) {
              for (const d of Object.values(activePlan.byDay)) {
                const arr = Array.isArray(d) ? d : (d ? [d] : []);
                for (const it of arr) {
                  const t = (it && (it.topic || it.name)) || "";
                  if (t) { planCounts[t] = (planCounts[t] || 0) + 1; fromPlan = true; }
                }
              }
            }
            if (!fromPlan) {
              // 폴백: 저장 전/계획 없음 — weight 비례로 미리보기.
              const DEMO_QUOTA = 60;
              const planQuota = Number.isFinite(limit) && limit > 0 ? limit : (isUnlimited ? DEMO_QUOTA : null);
              const onMenus = allMenus.filter(n => stageOf(menuWeights[n]) !== "off");
              const wOf = (n) => { const v = Number(menuWeights[n] || 0); return v > 0 ? v : 0; };
              const totalW = onMenus.reduce((s, n) => s + wOf(n), 0);
              if (planQuota && totalW > 0 && onMenus.length > 0) {
                let assigned = 0;
                const raw = onMenus.map(n => ({ n, exact: planQuota * wOf(n) / totalW }));
                raw.forEach(r => { planCounts[r.n] = Math.floor(r.exact); assigned += planCounts[r.n]; });
                let remain = planQuota - assigned;
                raw.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
                for (let i = 0; i < raw.length && remain > 0; i++, remain--) planCounts[raw[i].n] += 1;
              }
            }
            return (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 7 }}>
                  {shown.map(name => {
                    const st = stageOf(menuWeights[name]); // off | sub | main
                    const on = st !== "off";
                    const m = metaOf(name);
                    const cnt = planCounts[name];
                    const stageStyle = {
                      off:  { bg: "#f4f4f6", border: "1.5px solid #e6e6ea", label: "❌ 사용 안 함", labelColor: "#bbb" },
                      sub:  { bg: "#FFF8E1", border: "1.5px solid #FFD54F", label: "🟡 보조",       labelColor: "#F57F17" },
                      main: { bg: "#FFEBEE", border: "1.5px solid #EF5350", label: "🔥 주력",       labelColor: "#C62828" },
                    }[st];
                    return (
                      <div key={name} onClick={() => cycleMenu(name)}
                        title="클릭: ❌→🟡→🔥→❌ 순서로 변경"
                        style={{ background: stageStyle.bg, borderRadius: 8,
                        border: stageStyle.border,
                        boxShadow: "0 2px 8px rgba(100,50,180,.04)", padding: "8px 9px",
                        cursor: "pointer", opacity: on ? 1 : 0.6, transition: "all .15s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 15, flexShrink: 0, filter: on ? "none" : "grayscale(1)" }}>{m.emoji}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 900, color: on ? "#1a1a2e" : "#aaa",
                            lineHeight: 1.2, wordBreak: "keep-all", flex: 1 }}>{name}</span>
                          {m.cat ? (
                            <span style={{ fontSize: 8.5, color: on ? "#9C27B0" : "#bbb", fontWeight: 700,
                              background: on ? "#F3E5F5" : "#ececef",
                              borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", flexShrink: 0 }}>{m.cat}</span>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: stageStyle.labelColor }}>
                            {stageStyle.label}
                          </span>
                          {on ? (
                            (cnt != null && cnt > 0) ? (
                              <span style={{ fontSize: 13.5, fontWeight: 900, color: "#fff",
                                background: st === "main" ? "#EF5350" : "#FFA726",
                                borderRadius: 6, padding: "2px 8px", lineHeight: 1.3,
                                boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>월 {cnt}건</span>
                            ) : (
                              // [v153] 켜져 있지만 이번 달 배정 0건 — 공백이면 '저장 안 됨/오류'로 오해.
                              //   엔진·배분 무수정. 자연 탈락 항목을 회색 '월 0건'으로 명시(UI만).
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#9e9e9e",
                                background: "#f0f0f3", border: "1px solid #e2e2e8",
                                borderRadius: 6, padding: "2px 8px", lineHeight: 1.3 }}>월 0건</span>
                            )
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 발행비율(요율)만 초기화 — 주력업무 유지. [v151] 회색 링크 → 안내 카드(기능 차이 명시) */}
          <div style={{ ...card, padding: "14px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6A1B9A", marginBottom: 4 }}>
                🔄 발행비율 재설정
              </div>
              <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6 }}>
                주력{_ITEM_WORD}는 그대로 두고, 주력·보조 배분 비율만 처음 상태로 되돌립니다.
                <br/>※ 주력{_ITEM_WORD} 목록은 삭제되지 않습니다.
              </div>
            </div>
            <button onClick={onResetRatioOnly}
              style={{ flexShrink: 0, border: "1.5px solid #E1BEE7", background: "#F9F3FF",
                borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: 800, color: "#7B1FA2", whiteSpace: "nowrap" }}>
              발행비율 초기화
            </button>
          </div>

          {/* 없는 항목 추가 */}
          <div style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6A1B9A", marginBottom: 8 }}>➕ 없는 항목 추가하기</div>
            <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6, marginBottom: 10 }}>
              목록에 없는 항목은 직접 추가하세요. 추가한 항목은 확인 후 적용되도록 안내해 드립니다.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newMenuInput} onChange={e => setNewMenuInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addMenu(); }}
                placeholder="예: 턱관절, 잇몸성형…"
                style={{ flex: 1, border: "1px solid #e0d0f0", borderRadius: 9, padding: "9px 12px",
                  fontFamily: "inherit", fontSize: 13, outline: "none" }} />
              <button onClick={addMenu} style={{ border: "none", borderRadius: 9, padding: "9px 16px",
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#fff",
                background: "linear-gradient(135deg,#4A148C,#9C27B0)", whiteSpace: "nowrap" }}>추가</button>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "usage") {
      return (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8ed", padding: "8px 24px 18px" }}>
          {isUnlimited ? (
            <>
              {row("플랜", "OWNER")}
              {row("사용량", "무제한")}
              <div style={{ padding: "12px 0 2px", fontSize: 12, color: "#aaa", textAlign: "center" }}>
                운영자 계정 · 제한 없음
              </div>
            </>
          ) : hasUsage ? (
            <>
              {row(`${periodLabel} 발행`, `${used} / ${limit}건`)}
              {remaining != null && row("남은 한도", `${remaining}건`)}
              <div style={{ marginTop: 14, height: 8, background: "#f0eef5", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, Math.round((used / limit) * 100))}%`, height: "100%",
                  background: "linear-gradient(90deg,#7c3aed,#a855f7)", borderRadius: 99 }} />
              </div>
            </>
          ) : (
            <div style={{ padding: "14px 0 4px", fontSize: 12.5, color: "#aaa", textAlign: "center" }}>
              사용량 정보를 불러오는 중입니다…
            </div>
          )}
        </div>
      );
    }

    if (tab === "coach") {
      if (hubPosts === null) return loadingCard("발행 달력을 불러오는 중입니다…");

      // ── 년/월 달력 — 발행 이력(과거) + 추천 계획(미래). 클릭 시 입력창 채움. ──
      //   발행: coach.posts의 published_at/created_at을 날짜별로 묶음.
      //   계획: 추천 발행 순서(공백→보강)를 오늘부터 요일 순으로 배치.
      const ym = calMonth; // {y, m} — m은 0-base
      const today = new Date(); today.setHours(0,0,0,0);
      const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

      // 1) 발행 이력 → 날짜별 집계 (해당 월만)
      //    상태: naver_post_url 있음 = 🟢 URL등록완료(published_at 기준) / 없음 = 🔵 생성완료(created_at 기준)
      // [v59] 중복 표시 제거 — me/posts가 baseline+published 둘 다 반환(추가형 INSERT 구조).
      //   같은 글이 같은 날 🔵생성+🟢URL등록 두 칩으로 뜨던 문제 → (날짜+이름) 단위로 통합.
      //   같은 키면 done(URL등록) 우선. published_at 없으면 created_at로 같은 날에 묶임.
      // [v126] 업종 게이트 — 이력 칩도 현재 업종(hubStore.industry)만 표시.
      //   원인: 계획(planByDay)은 v120으로 막았지만 이력(pubByDay)은 필터 부재 →
      //   치과 계정에 과거 분식 생성기록이 칩으로 누수(수육·떡볶이). DB는 무수정, 표시만 차단.
      //   현재 업종이 정해진 경우에만 적용. p.industry 빈 레거시는 보존(가리지 않음).
      const _calIndustry = (hubStore && hubStore.industry) || "";
      // [v133] 레거시 오염 칩 숨김 — DB 무수정, 표시만 차단.
      //   restaurant 정상 신규 칩 = 실메뉴명("매콤한 떡볶이" 등). 과거 순대국 fallback 오염 레코드 =
      //   placeholder name("이 순대국집/이 분식집/이 국밥집…"). 정상 칩은 "이 "로 시작하지 않으므로 오탐 0.
      //   parseNaturalInput 분식 분기(v132) 이전 생성분 정리. DB 삭제 대신 표시 레이어 차단(관측 단계 안전).
      const _isLegacyPlaceholderName = (nm) =>
        _calIndustry === "restaurant" && /^이\s*[가-힣]+(집|식당)$/.test((nm || "").trim());
      const pubMerge = {}; // { `${day}|${name}`: {name,region,state,label,day} }
      for (const p of coach.posts) {
        if (_calIndustry && p.industry && p.industry !== _calIndustry) continue;
        if (_isLegacyPlaceholderName(p.treatment_name || p.keyword)) continue; // [v133] 오염 placeholder 칩 숨김
        const hasUrl = !!p.naver_post_url;
        const d = new Date(hasUrl ? (p.published_at || p.created_at) : (p.created_at || p.published_at));
        if (!Number.isFinite(d.getTime())) continue;
        if (d.getFullYear() !== ym.y || d.getMonth() !== ym.m) continue;
        const day = d.getDate();
        const name = (p.treatment_name || p.keyword || "").trim() || "발행";
        const region = (p.region || "").trim();
        const state = hasUrl ? "done" : "made"; // done=🟢 URL등록 / made=🔵 생성만
        const mk = `${day}|${name}`;
        const prev = pubMerge[mk];
        // done(URL등록완료)이 made(생성만)를 덮어씀. 이미 done이면 유지.
        if (!prev || (state === "done" && prev.state !== "done")) {
          pubMerge[mk] = { name, region, state, day, label: region ? `${region} ${name}` : name };
        }
      }
      const pubByDay = {};
      for (const v of Object.values(pubMerge)) {
        (pubByDay[v.day] = pubByDay[v.day] || []).push({ name: v.name, region: v.region, state: v.state, label: v.label });
      }

      // 2) 추천 계획 — "계획 재생성" 버튼으로 확정된 activePlan에서 읽음(이번 달 한정).
      //    요율 저장만으로 자동 변경 안 함. 버튼을 눌러야 savedWeights 기반으로 재배치.
      // [v120] 업종 미정(업체정보 미등록) 게이트 — store.industry 없으면 계획을 그리지 않는다.
      //   빌드전역 dental 잔재 + localStorage 잔존 activePlan으로 새 계정에 치과 달력이 뜨던 누수 차단.
      const _planIndustryReady = !!(hubStore && hubStore.industry);
      const planByDay = {};
      if (_planIndustryReady && activePlan && activePlan.monthY === ym.y && activePlan.monthM === ym.m) {
        Object.assign(planByDay, activePlan.byDay);
      }

      // [v105] 이미 생성/발행한 품목은 '예정(📌)'에서 제거.
      //   planByDay(계획)와 pubByDay(생성·발행이력)가 독립 배열이라, 같은 날 같은
      //   품목이 🔵생성완료 + 📌예정으로 중복 표시되던 문제(15일 +3건 잔존)를 차단.
      //   기준: 같은 날(day) + 같은 품목명(topic≈name). 발행하면 그 칩이 예정에서 사라짐.
      {
        for (const dayKey of Object.keys(planByDay)) {
          const donePubs = pubByDay[dayKey];
          if (!donePubs || !donePubs.length) continue;
          const doneNames = new Set(donePubs.map(p => (p.name || "").trim()));
          const rawPlans = Array.isArray(planByDay[dayKey])
            ? planByDay[dayKey]
            : (planByDay[dayKey] ? [planByDay[dayKey]] : []);
          const remain = rawPlans.filter(pl => !doneNames.has((pl.topic || "").trim()));
          if (remain.length) planByDay[dayKey] = remain;
          else delete planByDay[dayKey];
        }
      }

      // [읽기 전용] 운영코치 달력은 계획을 만들지 않는다. 계획 생성·수정은 월간계획 탭의 "요율 저장"에서만.
      //   계획 로직은 NavPanel 상단 buildPlanFromWeights로 일원화됨.
      const hasWeights = savedWeights && Object.values(savedWeights).some(v => Number(v) > 0);

      // 3) 달력 그리드 구성
      const firstDow = new Date(ym.y, ym.m, 1).getDay(); // 0=일
      const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < firstDow; i++) cells.push(null);
      for (let d = 1; d <= daysInMonth; d++) cells.push(d);
      const dowNames = ["일","월","화","수","목","금","토"];

      const goPrev = () => setCalMonth(ym.m === 0 ? { y: ym.y - 1, m: 11 } : { y: ym.y, m: ym.m - 1 });
      const goNext = () => setCalMonth(ym.m === 11 ? { y: ym.y + 1, m: 0 } : { y: ym.y, m: ym.m + 1 });
      const goToday = () => setCalMonth({ y: today.getFullYear(), m: today.getMonth() });

      // [v70] 적용 업체정보 박스 — 발행코치 화면 전용.
      //   원칙(v69 §1-2): "박스에 보이는 값 = 실제 주입되는 값" (동일 소스 hubStore).
      //   여기는 read-only 표시만. 실제 주입(우선순위 4)은 발행 직전 입력텍스트 합치기 단계에서 동일 hubStore 사용.
      //   생활권(sub_region)·진료시간(business_hours)은 SEO/방문문맥 핵심 → 미등록 시 약한 유도.
      const cs = hubStore || {};
      const csStoreName = (cs.store_name || storeName || "").trim();
      const csSubRegion = (cs.sub_region || "").trim();
      const csRegion    = (cs.region || "").trim();
      const csHours     = (cs.business_hours || (cs.visit_info && cs.visit_info.businessHours) || "").trim();
      const csParking   = (cs.parking_info || "").trim();
      const csPlace     = (cs.naver_place_url || "").trim();
      // [v77] 생활권 표시는 sub_region만 사용 — region fallback 제거(옛 데모값 노출 차단).
      const goStore = () => { setTab("store"); onTabChange && onTabChange("store"); };

      // 한 행 렌더 — 값 있으면 진하게, 없으면 회색 "미등록" + (nudge 있으면) 약한 유도문.
      const infoRow = (label, value, nudge) => (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "5px 0",
          borderBottom: "1px solid #f0e9f7" }}>
          <span style={{ flex: "0 0 64px", fontSize: 11.5, fontWeight: 700, color: "#9a85b5" }}>{label}</span>
          {value ? (
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "#4a3a5e", wordBreak: "keep-all", lineHeight: 1.5 }}>{value}</span>
          ) : (
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#bbb", lineHeight: 1.5 }}>
              미등록{nudge ? <span style={{ color: "#C2185B", fontWeight: 600, marginLeft: 6, fontSize: 11 }}>· {nudge}</span> : null}
            </span>
          )}
        </div>
      );

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {soldOutBanner}
          {/* [세션59] 월 이동 + 범례 1줄 통합 — 달력 세로 여백 확보(하루 5건 셀 수용). */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={goPrev} style={{ border: "1px solid #e0d0f0", background: "#fff", borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#7B1FA2" }}>‹</button>
            <span style={{ fontSize: 17, fontWeight: 900, color: "#4A148C", minWidth: 96, textAlign: "center" }}>{ym.y}년 {ym.m + 1}월</span>
            <button onClick={goNext} style={{ border: "1px solid #e0d0f0", background: "#fff", borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#7B1FA2" }}>›</button>
            <button onClick={goToday} style={{ border: "1px solid #e0d0f0", background: "#faf5ff", borderRadius: 7,
              padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#9C27B0", marginLeft: 4 }}>오늘</button>
          </div>
            {/* 범례 — 상태 흐름 + 클릭 안내 (헤더 우측 인라인) */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7,
              fontSize: 11.5, color: "#999", fontWeight: 700 }}>
              <span style={{ color: "#C2185B" }}>📌 예정</span>
              <span style={{ color: "#ccc" }}>→</span>
              <span style={{ color: "#1565c0" }}>🔵 생성완료</span>
              <span style={{ color: "#ccc" }}>→</span>
              <span style={{ color: "#2e7d32" }}>🟢 URL등록완료</span>
              <span style={{ color: "#9C27B0" }}>· 예정 항목을 클릭하면 글이 생성돼요.</span>
            </div>
          </div>

          {/* [읽기 전용] 계획 생성은 월간계획 탭에서만. 여기선 안내만. */}
          {/* [v120] 업종 미정(미등록)이면 등록 게이트 우선. 강제 리다이렉트 없이 안내만(v118 철학 유지). */}
          {!_planIndustryReady ? (
            <div style={{ borderRadius: 11, padding: "15px 13px", textAlign: "center",
              fontSize: 12.5, fontWeight: 800, color: "#7B1FA2",
              background: "linear-gradient(135deg,#faf5ff,#f3e9ff)", border: "1.5px solid #e0d0f0" }}>
              🏢 업체정보를 등록하면 이 달력에 발행계획이 생성됩니다.
              <div style={{ marginTop: 9 }}>
                <button onClick={goStore} style={{ border: "none", background: "#7B1FA2", color: "#fff",
                  borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12.5, fontWeight: 800 }}>업체정보 등록하기</button>
              </div>
            </div>
          ) : !activePlan && (
            <div style={{ borderRadius: 11, padding: "13px", textAlign: "center",
              fontSize: 12.5, fontWeight: 800, color: "#7B1FA2",
              background: "linear-gradient(135deg,#faf5ff,#f3e9ff)", border: "1.5px solid #e0d0f0" }}>
              📊 발행비율설정 탭에서 발행 요율을 저장하면 이 달력에 계획이 자동 배치됩니다.
            </div>
          )}

          {/* [v86] 발행코치 진단 패널 제거 — 진단(분산·발행량·다음추천)은 좌측 채팅 코치로 이전. 우측은 달력만. */}

          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {dowNames.map((n, i) => (
              <div key={n} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, padding: "1px 0",
                color: i === 0 ? "#c62828" : i === 6 ? "#1565c0" : "#999" }}>{n}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {cells.map((d, i) => {
              if (d == null) return <div key={`e${i}`} />;
              const isToday = `${ym.y}-${ym.m}-${d}` === todayKey;
              const pubs = pubByDay[d];
              const plans = Array.isArray(planByDay[d]) ? planByDay[d] : (planByDay[d] ? [planByDay[d]] : null);
              const firstPlan = plans && plans[0];
              // [세션59] 하루 5건 플랜(Enterprise) 수용 — 셀 노출 상한 3 → 5. 발행이력 우선, 나머지 계획.
              const CELL_MAX = 5;
              const pubShow = pubs ? pubs.slice(0, CELL_MAX) : [];
              const planShow = plans ? plans.slice(0, Math.max(0, CELL_MAX - pubShow.length)) : [];
              const hiddenCount = (pubs ? Math.max(0, pubs.length - pubShow.length) : 0)
                                + (plans ? Math.max(0, plans.length - planShow.length) : 0);
              // [v139] 칩 클릭 → 클릭한 그 항목(pl)으로 진입. (구: 셀 전체 onClick + 항상 firstPlan
              //   → 어떤 칩을 눌러도 그 날 첫 항목만 생성되던 버그. 명예훼손·사기·성범죄 모두 명예훼손으로 떨어짐.)
              const pickPlan = (pl) => {
                if (!pl) return;
                if (onCalendarPick) {
                  onCalendarPick({ topic: pl.topic, rep: coach.topRegion || "", sub: "" });
                } else if (onFillInput) {
                  onFillInput(pl.query, `📝 '${pl.query}' 주제를 입력창에 넣었어요. 전송하면 글이 생성됩니다.`);
                }
              };
              return (
                <div key={d}
                  style={{
                    minHeight: 132, borderRadius: 9, padding: "4px 6px",
                    border: isToday ? "2.5px solid #9C27B0" : "1px solid #ece4f5",
                    boxShadow: isToday ? "0 0 0 3px rgba(156,39,176,.12)" : "none",
                    background: isToday
                      ? (pubs ? (pubs.some(p => p.state === "done") ? "#eef8ee" : "#eaf1fb") : "#fbeefb")
                      : (pubs ? (pubs.some(p => p.state === "done") ? "#f1f8f1" : "#eef4fd") : plans ? "#fff0f5" : "#fff"),
                    cursor: "default", display: "flex", flexDirection: "column", gap: 2.5,
                  }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {isToday && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", background: "#9C27B0",
                        borderRadius: 5, padding: "1px 6px", lineHeight: 1.4 }}>오늘</span>
                    )}
                    <span style={{ fontSize: isToday ? 12.5 : 11, fontWeight: 800, color: isToday ? "#7B1FA2" : "#666" }}>{d}</span>
                  </span>
                  {pubShow.map((p, k) => (
                    p.state === "done" ? (
                      <span key={`pub${k}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#2e7d32", lineHeight: 1.25,
                        background: "#e3f1e3", borderRadius: 4, padding: "1px 4px", wordBreak: "keep-all" }}>🟢 {p.name}</span>
                    ) : (
                      <span key={`pub${k}`} style={{ fontSize: 9.5, fontWeight: 700, color: "#1565c0", lineHeight: 1.25,
                        background: "#e3eefc", borderRadius: 4, padding: "1px 4px", wordBreak: "keep-all" }}>🔵 {p.name}</span>
                    )
                  ))}
                  {planShow.map((pl, k) => (
                    <span key={`pl${k}`}
                      onClick={(e) => { e.stopPropagation(); pickPlan(pl); }}
                      style={{ fontSize: 9.5, fontWeight: 700, color: "#C2185B", lineHeight: 1.25,
                      background: "#ffe0ec", borderRadius: 4, padding: "1px 4px", wordBreak: "keep-all", cursor: "pointer" }}>📌 {pl.topic}</span>
                  ))}
                  {hiddenCount > 0 && (
                    <span style={{ fontSize: 9, color: "#888", fontWeight: 700 }}>+{hiddenCount}건</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* [v86] 우측 하단 업체정보 박스 제거 — 좌측 코치 첫 박스(introCoach)에 동일 요약이 들어가 중복. 우측은 달력만. */}

          {/* [v104] 달력 하단 액션 버튼 제거 — 시술 변경은 우측 시술선택판에서 직접 가능(중복 제거). */}
        </div>
      );
    }

    if (tab === "posts") {
      if (hubPosts === null) return loadingCard("발행 이력을 불러오는 중입니다…");
      if (coach.total === 0) {
        return pendingCard("발행한 글이 없습니다", "글을 발행하면 여기서 순위를 기록하고 추이를 볼 수 있어요.");
      }
      const ranks = hubRanks || {};
      const draft = rankDraft || {};

      // ── [v18x] 최근발행 작업패널 핸들러 ──
      //   행 "글 열기" → me/post/[id] 단건 fetch → 본문복사·URL등록.
      //   목록(me/posts)은 본문 미포함 → 클릭 순간에만 본문을 가져온다(트래픽/§2).
      const openPostRow = async (postId) => {
        setUrlMsg(null);
        setUrlEditOpen(false); // 행 전환 시 편집칸 접힘 초기화(등록완료 글은 완료뷰로 시작)
        if (openPostId === postId) { setOpenPostId(null); setOpenPost(null); return; } // 토글 닫기
        setOpenPostId(postId); setOpenPost(null); setOpenBusy("글을 불러오는 중…");
        setUrlDraft("");
        try {
          const token = await getFreshToken();   // [SESSION-EXPIRE-01] 만료 시 1회 복구 · 실패면 로그아웃
          if (!token) { setOpenBusy("세션이 만료되었습니다. 다시 로그인해주세요."); return; }
          const r = await fetch(`/api/me/post/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json();
          if (!r.ok || !j.ok || !j.post) { setOpenBusy(`불러오기 실패: ${j.error || r.status}`); return; }
          setOpenPost(j.post);
          setUrlDraft(j.post.naver_post_url || "");
          setOpenBusy("");
        } catch (e) {
          setOpenBusy(`네트워크 오류: ${e?.message || e}`);
        }
      };
      // text_markdown에서 첫 제목줄(#~######) 1개 제거 → 순수 본문.
      const stripTitle = (md) => (md || "").replace(/^\s*#{1,6}\s+.*(?:\r?\n)+/, "");
      const copyAndFlash = async (text, label) => {
        const ok = await copyPlainText(text || "");
        setUrlMsg({ kind: ok ? "ok" : "err", text: ok ? `${label} 복사됨` : `${label} 복사 실패 — 길게 눌러 직접 복사하세요` });
        // [v-copyfb] 버튼 상태 + Toast. 성공 시에만 ✅ / 실패 시 Toast로 안내.
        if (_copyTimer.current) clearTimeout(_copyTimer.current);
        if (ok) {
          setCopiedKey(label);
          const _word = label === "제목" ? "제목이" : label === "본문" ? "본문이" : "전체 글이";
          setCopyToast(`${_word} 클립보드에 복사되었습니다.`);
        } else {
          setCopiedKey("");
          setCopyToast(`${label} 복사에 실패했습니다. 길게 눌러 직접 복사하세요.`);
        }
        _copyTimer.current = setTimeout(() => { setCopiedKey(""); setCopyToast(""); }, 1500);
      };
      // URL 등록 — 기존 발행 흐름과 동일하게 publish-secure 경유(quota/중복/Observer 그대로).
      //   재등록용 메타는 단건 응답(openPost)에서 채운다.
      const registerUrl = async () => {
        const url = (urlDraft || "").trim();
        if (!url || !/^https?:\/\//.test(url)) { setUrlMsg({ kind: "err", text: "네이버 URL을 정확히 입력해주세요" }); return; }
        const m = url.match(/blog\.naver\.com\/([^/?#]+)/);
        const blogAccount = m ? m[1] : "";
        if (!blogAccount) { setUrlMsg({ kind: "err", text: "blog.naver.com/계정명/... 형식이 아닙니다" }); return; }
        const p = openPost; if (!p) return;
        setOpenBusy("URL 등록 중…"); setUrlMsg(null);
        try {
          // [Publish Spine 1차] 토큰 획득 + publish-secure 위임 (동작·payload 동일).
          const token = await getFreshToken();   // [SESSION-EXPIRE-01] Publish.js 무수정 · 호출부만 교체
          if (!token) { setOpenBusy(""); setUrlMsg({ kind: "err", text: "세션이 만료되었습니다. 다시 로그인해주세요." }); return; }
          const res = await publishApi.publishSecure({
              blog_account:   blogAccount,
              naver_post_url: url,
              industry:       p.industry,
              keyword:        p.keyword || p.treatment_name || "unknown_keyword",
              title:          p.title || ("제목없음_" + Date.now()),
              content:        p.content || "",
              active_keyword: p.active_keyword,
              full_keyword:   p.full_keyword,
              // [CORE-AT-GENERATION-01] Core 는 생성 시점에 확정된다 — 여기서 새로 만들지 않는다.
              //   p.core_keyword = 생성 저장(save-generated)에서 확정된 값. 그대로 승계.
              //   legacy(core_keyword NULL) 행만 종전 조합식으로 폴백 — 하위호환 보존.
              //   ★ 이중 SoT 금지: 계산 로직은 lib/spine/serviceAxis 1곳에만 존재한다.
              core_keyword:   p.core_keyword || buildObservationCore(p.industry, p.region, p.cluster),  // [S117] Core 관측축(상업 경쟁키워드). 생성물 역산 금지
              region:         p.region,
              treatment_id:   p.treatment_id,
              treatment_name: p.treatment_name,
              text_markdown:  p.text_markdown,
              char_count:     p.char_count ?? (p.content || "").length,
              model:          p.model,
              store_id:       p.store_id,
              source_post_id: p.id,   // [qc-fix] baseline row id — 서버가 qc_score 조회용(§2 미노출 보강)
              // account_id는 서버(publish-secure)가 검증값으로 강제 주입 — 클라 미전송.
          }, token);
          const j = res.json;
          setOpenBusy("");
          if (j.ok) {
            setUrlMsg({ kind: "ok", text: "✅ URL 등록 완료" });
            setUrlEditOpen(false); // 등록 성공 → 완료뷰로 접힘
            // [v-urlfix 2026-07-22] 열린 단건 낙관적 갱신 — hub만 갱신하면 openPost.naver_post_url이 stale이라
            //   렌더 조건(naver_post_url && !urlEditOpen)이 편집칸을 계속 노출. 여기서 URL을 반영해 즉시 완료뷰 전환.
            setOpenPost(prev => prev ? { ...prev, naver_post_url: url } : prev);
            onTabChange && onTabChange("__refreshHub"); // 목록 갱신 신호(부모가 fetchHub 재호출)
          } else if (res.status === 409 || j.error === "DUPLICATE_URL") {
            // 이미 본인 계정에 등록된 URL — 사용자에겐 완료와 동일하게 취급(중복 경고 문구 제거).
            setUrlMsg({ kind: "ok", text: "✅ URL 등록 완료" });
            setUrlEditOpen(false);
            setOpenPost(prev => prev ? { ...prev, naver_post_url: url } : prev); // [v-urlfix] 동일 낙관적 갱신
            onTabChange && onTabChange("__refreshHub");
          } else if (j.error === "QUOTA_EXCEEDED" || j.quota) {
            setUrlMsg({ kind: "err", text: "이번 달 발행 한도를 초과했습니다. 요금제를 확인해주세요." });
          } else {
            setUrlMsg({ kind: "err", text: `등록 실패: ${j.error || res.status}` });
          }
        } catch (e) {
          setOpenBusy("");
          setUrlMsg({ kind: "err", text: `네트워크 오류: ${e?.message || e}` });
        }
      };
      // [v30] 최근발행 탭은 최근 14건만 표시 (전체 분석은 '관측' 탭이 담당).
      //   coach.posts는 최신순 정렬 → 앞 14건이 가장 최근. 집계(편중/추천)는 전체 coach.posts 유지.
      const RECENT_LIMIT = 14;
      // [v59] 글 단위 통합 — me/posts가 baseline+published 둘 다 반환(추가형 INSERT).
      //   같은 글이 2줄(생성 + 발행)로 뜨던 문제 → (제목+생성일) 키로 1글 통합.
      //   대표 row = baseline(생성글) — 순위입력(post_ranks)이 생성글 id 기준이라 안정적.
      //   published row의 naver_post_url만 대표에 병합(제목 클릭 → 블로그 열기 유지).
      const mergedPosts = (() => {
        const dayKey = (v) => { const t = new Date(v).getTime();
          if (!Number.isFinite(t)) return "?"; const d = new Date(t);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
        const nameOf = (p) => (p.title || p.treatment_name || p.keyword || "").trim();
        // [merge-A안] 통합 키 우선순위: source_post_id → id → 제목(fallback).
        //   baseline row = 자기 id가 식별자. published row = source_post_id가 baseline을 가리킴.
        //   → 둘 다 baseline id로 수렴하여 병합. 제목 정규화/suffix 변경과 완전 분리.
        //   source_post_id 미저장 구버전 행은 제목 fallback으로 기존 동작 유지(호환).
        const keyOf = (p) => {
          if (p.publish_status === "baseline") return `id:${p.id}`;
          if (p.source_post_id != null)        return `id:${p.source_post_id}`;
          return `t:${nameOf(p)}`;
        };
        const m = {};
        const _leftover = [];   // 1차(id) 병합 안 된 구버전 published 후보
        for (const p of coach.posts) {
          const baseDate = p.created_at || p.published_at;
          const mk = keyOf(p);
          const hasUrl = !!p.naver_post_url;
          const isBaseline = p.publish_status === "baseline";
          const prev = m[mk];
          if (!prev) {
            m[mk] = { ...p };
          } else {
            // 대표는 baseline 우선. 현재가 baseline이고 기존이 아니면 교체(URL은 보존).
            if (isBaseline && prev.publish_status !== "baseline") {
              const keepUrl = prev.naver_post_url || (hasUrl ? p.naver_post_url : null);
              const keepPub = prev.published_at || p.published_at;
              m[mk] = { ...p, naver_post_url: keepUrl, published_at: keepPub };
            } else if (hasUrl && !prev.naver_post_url) {
              // 기존이 대표(baseline)인데 URL 없으면 published의 URL만 병합.
              prev.naver_post_url = p.naver_post_url;
              prev.published_at = p.published_at || p.created_at;
            }
          }
        }
        // [merge-A안 호환] source_post_id 미저장 구버전 published(URL 보유)가
        //   id키로 baseline과 못 만난 경우 → 제목으로 2차 병합(기존 동작 복원).
        //   대표 baseline이 이미 URL 있으면 skip. 없을 때만 URL 이식.
        const _byName = {};
        for (const rep of Object.values(m)) {
          if (rep.publish_status === "baseline") _byName[nameOf(rep)] = rep;
        }
        for (const p of coach.posts) {
          if (p.publish_status === "baseline") continue;
          if (p.source_post_id != null) continue;   // 신규행은 1차에서 처리됨
          if (!p.naver_post_url) continue;
          const rep = _byName[nameOf(p)];
          if (rep && !rep.naver_post_url) {
            rep.naver_post_url = p.naver_post_url;
            rep.published_at = p.published_at || p.created_at;
            delete m[keyOf(p)];   // 별도 노출됐던 구버전 published 행 제거(중복 방지)
          }
        }
        return Object.values(m).sort((a, b) => {
          const ta = new Date(a.created_at || a.published_at || 0).getTime();
          const tb = new Date(b.created_at || b.published_at || 0).getTime();
          return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        });
      })();
      const recentPosts = mergedPosts.slice(0, RECENT_LIMIT);
      // ── 운영코치 집계: 주제 편중 + 보강 추천 + (순위 누적 시) 추이 ──
      const freqMap = {};
      for (const p of coach.posts) {
        const t = (p.treatment_name || p.keyword || "").trim();
        if (t) freqMap[t] = (freqMap[t] || 0) + 1;
      }
      const freqSorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);
      const topName = freqSorted[0]?.[0];
      const topCnt  = freqSorted[0]?.[1] || 0;
      const skew = topCnt >= 3 && topCnt / coach.total >= 0.4; // 편중 신호
      // 순위 추이 집계 (기본=관련도 기준, 입력된 글만)
      let up = 0, flat = 0, down = 0, tracked = 0;
      for (const p of coach.posts) {
        const r = ranks[p.id]?.rel;
        if (!r || r.delta == null) continue;
        tracked++;
        if (r.delta > 0) up++; else if (r.delta < 0) down++; else flat++;
      }
      // 등록 비율: 순위(관련도) 기록된 글 수 / 전체
      let registered = 0;
      for (const p of coach.posts) {
        const rr0 = ranks[p.id];
        if (rr0 && rr0.rel) registered++;
      }
      const regPct = coach.posts.length ? Math.round((registered / coach.posts.length) * 100) : 0;
      const deltaBadge = (r) => {
        if (!r || r.delta == null) return null;
        if (r.delta > 0) return <span style={{ fontSize: 11, color: "#2e7d32", fontWeight: 800 }}>▲{r.delta}</span>;
        if (r.delta < 0) return <span style={{ fontSize: 11, color: "#c62828", fontWeight: 800 }}>▼{Math.abs(r.delta)}</span>;
        return <span style={{ fontSize: 11, color: "#888", fontWeight: 700 }}>—</span>;
      };
      const miniStat = (label, n, color) => (
        <div style={{ flex: 1, textAlign: "center", padding: "6px 0", background: "#fafafa", borderRadius: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color }}>{n}</span>
          <span style={{ fontSize: 11, color: "#999", marginLeft: 4 }}>{label}</span>
        </div>
      );
      const coachChip = (txt, bg, fg) => (
        <span key={txt} style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999,
          background: bg, color: fg, fontSize: 11.5, fontWeight: 700, marginRight: 5, marginBottom: 5 }}>{txt}</span>
      );
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* ── 발행 목록: 1건 = 1줄 (가로 압축) ── */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8ed", padding: "2px 12px" }}>
            <div style={{ fontSize: 12.5, color: "#999", padding: "9px 2px 6px" }}>
              최근 {recentPosts.length}건{mergedPosts.length > RECENT_LIMIT ? ` (전체 ${mergedPosts.length}건 중)` : ""} · 🔎로 검색해 현재 순위를 입력하세요
            </div>
            {/* 컬럼 구분 헤더 — 제목 | 🔎 | 순위 | 저장 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 2px 6px", borderBottom: "1px solid #f0eef5" }}>
              <span style={{ flex: 1, minWidth: 0 }} />
              <span style={{ width: 30 }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "#4A148C", width: 120, textAlign: "center" }}>현재 순위</span>
              <span style={{ width: 52 }} />
            </div>
            {recentPosts.map((p, i) => {
              const rr = ranks[p.id] || {};
              const postUrl = p.naver_post_url || null;
              // [LENS-CORE-SOT-01] 돋보기 검색어 = Core 관측축(생성 시점 확정값). 화면 재조립 폐기.
              //   ① p.core_keyword ② legacy 폴백(lib 단일 계산) ③ 종전 region+treatment_name.
              //   ★ URL 미등록 글도 Core 를 가지므로 돋보기는 항상 동작한다.
              const searchQ = p.core_keyword
                || buildObservationCore(p.industry, p.region, p.cluster)
                || [p.region, p.treatment_name || p.keyword].filter(Boolean).join(" ");
              // 기본=검색어 그대로 (관련도순). 후기 순위 제거됨.
              const urlRel    = `https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(searchQ)}`;
              const titleNode = (
                <div style={{ fontSize: 14, fontWeight: 700,
                  color: postUrl ? "#4A148C" : "#1a1a2e",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title || p.keyword || "(제목 없음)"}
                </div>
              );
              const relR = rr.rel;
              const keyRel = `${p.id}:rel`;
              const dvRel = draft[keyRel] ?? "";
              const saving = rankSaving === keyRel;
              const canSave = String(dvRel).trim();
              // [v-rank2] 후기 순위 제거 — 기본(관련도)만 입력. 글 패턴 변경으로 후기 검색 불필요.
              const saveBoth = () => {
                if (String(dvRel).trim()) saveRank(p, dvRel, "rel");
              };
              // [v-notfound] 미발견 = 검색했는데 못 찾음. 순위 입력과 같은 무게의 관측이다.
              //   「입력 안 함」과 「없음」을 구분해야 엔진 검증 대상이 추려진다.
              const saveNotFound = () => saveRank(p, null, "rel", true);
              // [v-rank2] 24시간 관측 사이클 — 입력 후 24h 이내엔 "오늘 기록함" 잠금(중복 입력 착각 방지),
              //   24h 경과 시 입력칸 재노출(오늘 순위 다시 확인 유도).
              const HRS24 = 24 * 60 * 60 * 1000;
              const checkedFresh = (r) => {
                if (!r || !r.checked_at) return false;
                const t = new Date(r.checked_at).getTime();
                return Number.isFinite(t) && (Date.now() - t) < HRS24;
              };
              const rankCell = (r, accent, val, key) => {
                const fresh = checkedFresh(r);
                if (fresh) {
                  // 오늘 기록 완료 — 잠금 표시(착각 방지)
                  return (
                    <div style={{ width: 178, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {r.not_found || r.current == null ? (
                          <span style={{ fontWeight: 900, color: "#8a8a9a", fontSize: 13.5 }}>미발견</span>
                        ) : (
                        <span style={{ fontWeight: 900, color: accent, fontSize: 15 }}>{r.current}위</span>
                        )}
                        {r.delta != null && r.delta !== 0 && (
                          <span style={{ fontWeight: 800, fontSize: 12,
                            color: r.delta > 0 ? "#2e7d32" : "#c62828" }}>
                            {r.delta > 0 ? "▲" : "▼"}{Math.abs(r.delta)}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 10.5, color: "#2e7d32", fontWeight: 700 }}>✓ 오늘 기록함</span>
                    </div>
                  );
                }
                // 미입력 or 24h 경과 → 입력칸. 직전 기록 있으면 흐리게 참고 표시.
                return (
                  <div style={{ width: 178, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, whiteSpace: "nowrap" }}>
                    <span style={{ display: "block", fontSize: 10.5, color: "#bbb", height: 14, lineHeight: "14px" }}>
                      {r && r.current != null ? `직전 ${r.current}위` : "\u00A0"}
                    </span>
                    {/* [v-notfound2] 순위칸 + 미발견 버튼 1행 배치 — 세로 2줄이 목록 높이를 키우던 문제 해소. */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number" inputMode="numeric" min={1} max={999}
                        value={val} placeholder="오늘 순위"
                        onChange={(e) => setRankDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveBoth(); }}
                        style={{ width: 96, padding: "6px 6px", borderRadius: 8, border: "1.5px solid #e0d5ef",
                          fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", outline: "none", textAlign: "center" }} />
                      {/* 검색해도 안 보일 때 — 순위 대신 이 버튼. 기록이 남아야 원인을 찾는다. */}
                      <button type="button" onClick={saveNotFound} disabled={saving}
                        title="검색했는데 글을 찾지 못했을 때 눌러 주세요"
                        style={{ width: 62, padding: "6px 0", borderRadius: 8, cursor: saving ? "default" : "pointer",
                          border: "1px solid #e0d5ef", background: "#fff", color: "#8a8a9a",
                          fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", lineHeight: 1.2 }}>
                        미발견
                      </button>
                    </div>
                  </div>
                );
              };
              // [세션79] 관리자 관측 우선 표시 (SoT: publish_metrics > post_ranks)
              //   관리자가 관측을 입력하면 그 값이 최종 신뢰값 → 사용자는 읽기 전용.
              //   관측 없으면 기존대로 사용자 입력칸(post_ranks 무손상 · 관측 삭제 시 자동 복귀).
              //   obs = /api/me/posts 가 published 관측을 baseline 대표행에 실어 내려준 값.
              const adminObs = (p.obs && p.obs.observed_rank != null) ? p.obs : null;
              const RELLBL = { core_related: "기본", review_related: "후기", full_related: "제목" };
              const obsTip = adminObs ? [
                `관리자 확인 순위 ${adminObs.observed_rank}위`,
                adminObs.related
                  ? `관련도 — ${Object.entries(adminObs.related).map(([k, v]) => `${RELLBL[k] || k} ${v}위`).join(" / ")}`
                  : null,
                adminObs.survival_hours != null
                  ? `생존 ${Math.floor(adminObs.survival_hours / 24)}일 (${adminObs.survival_hours}시간)`
                  : null,
                adminObs.alive_status ? `상태 ${adminObs.alive_status}` : null,
              ].filter(Boolean).join("\n") : "";
              const adminRankCell = (o) => (
                <div title={obsTip}
                  style={{ width: 178, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, whiteSpace: "nowrap" }}>
                  <span style={{ fontWeight: 900, color: "#4A148C", fontSize: 15 }}>{o.observed_rank}위</span>
                </div>
              );
              return (
                <Fragment key={p.id || i}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px",
                  borderBottom: (openPostId === p.id) ? "none" : (i < recentPosts.length - 1 ? "1px solid #f7f5fb" : "none") }}>
                  {/* 제목 클릭 = 작업패널 열기/닫기 (본문복사·URL등록). 상태배지 동반. */}
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => openPostRow(p.id)} title="글 열기 — 본문 복사 · URL 등록">
                    <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, borderRadius: 6, padding: "2px 6px",
                      background: postUrl ? "#e8f5e9" : "#fff3e0", color: postUrl ? "#2e7d32" : "#E65100" }}>
                      {postUrl ? "등록완료" : "미등록"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>{titleNode}</div>
                    <span style={{ flexShrink: 0, fontSize: 11, color: "#bbb" }}>{openPostId === p.id ? "▲" : "▾"}</span>
                  </div>
                  {/* 🔎 = 네이버 검색 */}
                  <a href={urlRel} target="_blank" rel="noreferrer" title={`네이버 검색 — '${searchQ}' 현재 순위 확인`}
                    style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #d8c4ed",
                      background: "#fff", color: "#7B1FA2", fontSize: 14, textDecoration: "none", lineHeight: 1 }}>🔎</a>
                  {/* 순위 (기본/관련도만) — [세션79] 관리자 관측 있으면 그 값(읽기 전용) */}
                  {adminObs ? adminRankCell(adminObs) : rankCell(relR, "#4A148C", dvRel, keyRel)}
                  {/* 저장 1개 (둘 다) */}
                  {(adminObs || checkedFresh(relR)) ? (
                    <span style={{ width: 54 }} />
                  ) : (
                  <button
                    onClick={saveBoth}
                    disabled={saving || !canSave}
                    style={{ width: 54, padding: "8px 0", borderRadius: 8, border: "none",
                      background: (saving || !canSave) ? "#d8c4ed" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                      color: "#fff", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap",
                      cursor: (saving || !canSave) ? "default" : "pointer", fontFamily: "inherit" }}>
                    {saving ? "…" : "저장"}
                  </button>
                  )}
                </div>
                {/* ── [v18x] 작업패널 — 이 행을 열었을 때만 ── */}
                {openPostId === p.id && (
                  <div style={{ padding: "10px 4px 14px", borderBottom: i < recentPosts.length - 1 ? "1px solid #f7f5fb" : "none",
                    background: "#fcfbfe" }}>
                    {openBusy && <div style={{ fontSize: 12.5, color: "#888", padding: "4px 2px" }}>{openBusy}</div>}
                    {!openBusy && openPost && (() => {
                      const md = openPost.text_markdown || openPost.content || "";
                      const bodyOnly = stripTitle(md);
                      const fullCopy = `${openPost.title || ""}\n\n${bodyOnly}`.trim();
                      const hasBody = !!bodyOnly.trim();
                      const btn = (label, onClick, primary, copyKey) => {
                        const isCopied = !!copyKey && copiedKey === copyKey;
                        return (
                          <button onClick={onClick} disabled={isCopied} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                            fontFamily: "inherit", cursor: isCopied ? "default" : "pointer", whiteSpace: "nowrap",
                            transition: "background .15s, color .15s, border-color .15s",
                            border: isCopied ? "1.5px solid #2e7d32" : (primary ? "none" : "1.5px solid #d8c4ed"),
                            background: isCopied ? "#2e7d32" : (primary ? "linear-gradient(135deg,#4A148C,#9C27B0)" : "#fff"),
                            color: isCopied ? "#fff" : (primary ? "#fff" : "#4A148C") }}>{isCopied ? "✅ 복사됨" : label}</button>
                        );
                      };
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {/* 복사 버튼들 */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {btn("📋 제목 복사", () => copyAndFlash(openPost.title, "제목"), false, "제목")}
                            {hasBody && btn("📄 본문 복사", () => copyAndFlash(bodyOnly, "본문"), false, "본문")}
                            {hasBody && btn("🗂 전체 복사", () => copyAndFlash(fullCopy, "전체"), false, "전체")}
                            {/* [v-copyfb] 하단 고정 Toast — 복사 성공/실패 안내 (1.5s). */}
                            {copyToast && (
                              <div style={{ position: "fixed", left: "50%", bottom: 28, transform: "translateX(-50%)",
                                background: "#2e7d32", color: "#fff", padding: "10px 18px", borderRadius: 10,
                                fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,.18)", zIndex: 9999,
                                whiteSpace: "nowrap", pointerEvents: "none" }}>
                                ✅ {copyToast}
                              </div>
                            )}
                            {openPost.naver_post_url &&
                              <a href={openPost.naver_post_url} target="_blank" rel="noreferrer"
                                style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                                  border: "1.5px solid #a5d6a7", background: "#fff", color: "#2e7d32", textDecoration: "none" }}>
                                🔗 네이버에서 열기</a>}
                          </div>
                          {!hasBody && (
                            <div style={{ fontSize: 11.5, color: "#999", padding: "0 2px" }}>
                              이 글은 본문이 저장돼 있지 않아 제목만 복사할 수 있습니다.
                            </div>
                          )}
                          {/* URL 등록/수정 — 등록완료 글은 완료뷰(접힘), 'URL 변경' 눌러야 편집칸 노출. */}
                          {(openPost.naver_post_url && !urlEditOpen) ? (
                            // ── 등록완료 뷰 ──
                            <div style={{ background: "#f1f8e9", borderRadius: 10, border: "1px solid #c5e1a5", padding: "10px 12px" }}>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2e7d32", marginBottom: 8 }}>
                                ✅ URL 등록 완료
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <a href={openPost.naver_post_url} target="_blank" rel="noreferrer"
                                  style={{ padding: "8px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
                                    border: "1.5px solid #a5d6a7", background: "#fff", color: "#2e7d32", textDecoration: "none" }}>
                                  🔗 네이버에서 보기</a>
                                <button
                                  onClick={() => { setUrlMsg(null); setUrlDraft(openPost.naver_post_url || ""); setUrlEditOpen(true); }}
                                  style={{ padding: "8px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 700,
                                    border: "1.5px solid #d8c4ed", background: "#fff", color: "#7B1FA2",
                                    cursor: "pointer", fontFamily: "inherit" }}>
                                  URL 변경</button>
                              </div>
                            </div>
                          ) : (
                            // ── 편집 뷰 (미등록 최초 등록 · 등록완료 글의 'URL 변경') ──
                            <div style={{ background: "#fff8f0", borderRadius: 10, border: "1px solid #ffe0b2", padding: "10px 12px" }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#E65100", marginBottom: 6 }}>
                                {openPost.naver_post_url ? "🔧 발행 URL 변경" : "📌 블로그 발행 후 URL 등록"}
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <input type="text" value={urlDraft} onChange={e => setUrlDraft(e.target.value)}
                                  placeholder="https://blog.naver.com/..."
                                  style={{ flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 7, border: "1px solid #ffcc80",
                                    fontSize: 12.5, fontFamily: "inherit", outline: "none", background: "#fff" }} />
                                <button onClick={registerUrl}
                                  style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 7, border: "none",
                                    background: "linear-gradient(135deg,#E65100,#FB8C00)", color: "#fff",
                                    fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                                  {openPost.naver_post_url ? "저장" : "등록"}
                                </button>
                                {openPost.naver_post_url && (
                                  <button onClick={() => { setUrlMsg(null); setUrlDraft(openPost.naver_post_url || ""); setUrlEditOpen(false); }}
                                    style={{ flexShrink: 0, padding: "9px 12px", borderRadius: 7, border: "1.5px solid #e0d6ef",
                                      background: "#fff", color: "#888", fontSize: 12.5, fontWeight: 700,
                                      cursor: "pointer", fontFamily: "inherit" }}>
                                    취소</button>
                                )}
                              </div>
                              {urlMsg && urlMsg.kind !== "ok" && (
                                <div style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: "#c62828" }}>
                                  {urlMsg.text}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                </Fragment>
              );
            })}
            {coach.posts.length > RECENT_LIMIT && (
              <div style={{ fontSize: 11.5, color: "#aaa", textAlign: "center", padding: "8px 2px 4px" }}>
                최근 {RECENT_LIMIT}건만 표시됩니다. 전체 {coach.posts.length}건 분석은 <span style={{ color: "#7B1FA2", fontWeight: 700 }}>관측</span> 탭에서 확인하세요.
              </div>
            )}
          </div>

          {/* 안내: 순위 입력 → 혜택 */}
          <div style={{ background: "linear-gradient(135deg,#faf5ff,#f3e9fb)", borderRadius: 12,
            border: "1.5px solid #e6d6f5", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎁</span>
            <div style={{ fontSize: 12.5, color: "#4A148C", fontWeight: 700, lineHeight: 1.55 }}>
              순위를 입력하면 <span style={{ color: "#7B1FA2" }}>상승·하락 추세</span> · <span style={{ color: "#7B1FA2" }}>상세 분석</span> · <span style={{ color: "#7B1FA2" }}>운영 코치</span>를 확인할 수 있어요.
            </div>
          </div>
        </div>
      );
    }

    if (tab === "survival") {
      if (hubSurvival === null) return loadingCard("관측 데이터를 불러오는 중입니다…");
      const s = hubSurvival;
      if (!s.observed) {
        // [v-obs1] 0건도 대기실 톤 — "비어있음"이 아니라 "데이터 모으는 단계"로 인식시킨다.
        const goPosts = () => { setTab("posts"); onTabChange && onTabChange("posts"); };
        const previewFeatures = [
          "Alive / Fossil 생존 분석",
          "관련도 이동 추적",
          "생존 패턴 분석",
          "AI 코치 리포트",
        ];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#6A1B9A", marginBottom: 4 }}>
                🔍 관측 데이터를 수집하고 있습니다
              </div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                발행한 글의 URL을 등록하면 검색 노출 상태를 추적합니다. 데이터가 충분히 쌓이면 분석 리포트가 자동으로 활성화됩니다.
              </div>
            </div>

            {/* 현재 상태 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              {[
                { label: "등록 URL", value: 0, color: "#1565C0", bg: "#eef4fc" },
                { label: "관측 완료", value: 0, color: "#2e7d32", bg: "#eef7ee" },
              ].map(it => (
                <div key={it.label} style={{ background: it.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, color: it.color, fontWeight: 700, marginBottom: 4 }}>{it.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{it.value}</div>
                </div>
              ))}
            </div>

            {/* URL 등록 CTA */}
            <button onClick={goPosts}
              style={{ background: "linear-gradient(135deg,#7B1FA2,#6A1B9A)", color: "#fff", border: "none",
                borderRadius: 12, padding: "13px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              🔗 URL 등록하러 가기 →
            </button>

            {/* 준비중 기능 미리보기 */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1.5px dashed #d9d2ec", padding: "16px 18px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6A1B9A", marginBottom: 10 }}>관측 결과는 이렇게 제공됩니다</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {previewFeatures.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#888" }}>
                    <span style={{ fontSize: 13, color: "#c9b6e0" }}>○</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      // [v-obs2] 관측 v1 → v1.5 게이트. 개인 계정(me/survival) 기준.
      //   1~2건: 판단 이른 단계 → 수집 중 대기실. 3건+: 내 계정 분석(아래 상태 카드) 노출.
      //   ※ 업종 전체 생존율·제목패턴·클러스터·업종비교 = Observer v2(전체 데이터 500~1000건+) 별도 화면. 여기 아님.
      const MY_ANALYSIS_MIN = 3;  // 내 계정 분석 노출 최소 관측 건수
      const settled = (s.alive ?? 0) + (s.fossil ?? 0) + (s.gone ?? 0);  // 판정 완료 건
      const observing = s.unknown ?? 0;  // 관측 진행 중
      if (s.observed < MY_ANALYSIS_MIN) {
        const pct = Math.min(100, Math.round((s.observed / MY_ANALYSIS_MIN) * 100));
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 헤더 */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#6A1B9A", marginBottom: 4 }}>
                🔍 관측 데이터를 수집하고 있습니다
              </div>
              <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
                URL을 {MY_ANALYSIS_MIN}건 이상 등록하면 내 글의 검색 노출 상태를 확인할 수 있습니다.
              </div>
            </div>

            {/* 진행률 바 */}
            <div style={{ background: "#faf7fd", borderRadius: 12, border: "1px solid #eee2f5", padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#6A1B9A", fontWeight: 700 }}>관측 시작까지</span>
                <span style={{ fontSize: 12, color: "#999" }}>{s.observed} / {MY_ANALYSIS_MIN}건</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "#eee", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6,
                  background: "linear-gradient(90deg,#9c5fd0,#7B1FA2)", transition: "width .4s ease" }} />
              </div>
            </div>

            {/* 수집 현황 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {[
                { label: "등록 URL", value: s.observed, color: "#1565C0", bg: "#eef4fc" },
                { label: "관측 완료", value: settled, color: "#2e7d32", bg: "#eef7ee" },
                { label: "관측 중", value: observing, color: "#888", bg: "#f4f4f7" },
              ].map(it => (
                <div key={it.label} style={{ background: it.bg, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, color: it.color, fontWeight: 700, marginBottom: 4 }}>{it.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e" }}>{it.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6 }}>
              발행한 글의 URL을 계속 등록하면 검색 노출 상태가 쌓입니다. {MY_ANALYSIS_MIN}건부터 내 계정 분석이 시작됩니다.
            </div>
          </div>
        );
      }
      // ── 3건 이상: 내 계정 분석 (v1.5) — 노출 상태 카드 + Alive 비율 ──
      // Naver §2: 상태값만. 점수·재발행CTA 없음. '관찰·기록' 톤.
      const items = [
        { key: "alive",   label: "유지",     ic: "▲", color: "#2e7d32", bg: "#eef7ee" },
        { key: "fossil",  label: "정체",     ic: "—", color: "#E65100", bg: "#fff5eb" },
        { key: "gone",    label: "이탈",     ic: "▼", color: "#c62828", bg: "#fdecec" },
        { key: "unknown", label: "관측 중",  ic: "·", color: "#888",    bg: "#f4f4f7" },
      ];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#999" }}>관측된 글 {s.observed}건의 노출 상태</div>

          {/* [v-obs2] 내 계정 Alive 비율 — 판정 완료(유지+정체+이탈) 중 유지 비율 */}
          {settled >= 1 && (
            <div style={{ background: "linear-gradient(135deg,#eef7ee,#e3f1e3)", borderRadius: 12,
              border: "1px solid #cfe6cf", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#2e7d32" }}>
                {Math.round((s.alive ?? 0) / settled * 100)}%
              </div>
              <div style={{ fontSize: 12, color: "#33691e", lineHeight: 1.5 }}>
                판정 완료 {settled}건 중 <b>{s.alive ?? 0}건</b>이 검색에 살아있습니다.
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {items.map(it => (
              <div key={it.key} style={{ background: it.bg, borderRadius: 12, padding: "16px 14px" }}>
                <div style={{ fontSize: 12, color: it.color, fontWeight: 700, marginBottom: 4 }}>
                  {it.ic} {it.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e" }}>{s[it.key] ?? 0}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.6 }}>
            노출 상태는 관찰 결과를 기록한 값입니다. 순위 점수가 아니라 유지·이탈 추이를 보기 위한 지표입니다.
          </div>
        </div>
      );
    }
    return null;
  };

  const activeMeta = HUB_TABS.find(t => t.id === tab) || HUB_TABS[0];

  return (
    <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", animation: "fadeIn .25s ease" }}>
      {/* [v95] 허브 헤더·내부 탭바 모두 제거 — 상단 공통 메뉴줄(TopMenuBar)로 승격. NavPanel은 콘텐츠만. */}

      {/* 활성 탭 제목 */}
      <div style={{ fontSize: 15, fontWeight: 800, color: "#4A148C", marginBottom: 8,
        display: "flex", alignItems: "center", gap: 6 }}>
        <span>{activeMeta.ic}</span>{activeMeta.label}
      </div>

      {renderTabBody()}
    </div>
  );
}

// ============================================================
// 메인
// ============================================================
export default function Home() {
  const router = useRouter();
  const { currentStore, hydrating } = useStore();
  // [v122] CURRENT_INDUSTRY SoT = hubStore.industry (me/store fetch 결과).
  //   기존엔 useState(DEFAULT_INDUSTRY=env dental)로 시작 + 죽은 currentStore(stub=null) 동기화 →
  //   업종이 영구 dental 고정 → 음식점 계정에 치과 발행비율/제목/라벨이 뜨던 근본 원인.
  //   미정("")으로 시작 → hubStore 로드되면 그 industry로 확정(동기화 useEffect는 hubStore 선언 이후).
  const [CURRENT_INDUSTRY, setCURRENT_INDUSTRY] = useState("");

  // ── [v-dept 2026-07-12] 병원 다중 진료과 ────────────────────────
  //   병원 1곳 = 공통 업체정보 1행(store_profiles) + 진료과 N개(departments jsonb).
  //   departments[0] = 대표 진료과 = hubStore.industry (서버 store.js가 불변식 강제).
  //   진료과 선택 = setCURRENT_INDUSTRY(dept) 1회 → activeConfig/activeTreatments/
  //   activeCats/menuTreatments/payload.industry 가 전부 자동 재계산.
  //   ★ Generate / engineBootstrap / Registry / 엔진 / Publish / Observation 무수정.
  //     진료과 id = 엔진 industry key 와 1:1 이므로 기존 계약이 그대로 성립한다.
  //   비병원 업종·단일과 병원(departments 길이 ≤1) = 스위처 미노출 → 영향 0.

  // 업종별 동적 계산 — 미정("")이면 clinic 폴백(빈 UI 방지). hubStore 확정 후 실업종.
  const activeConfig   = INDUSTRY_CONFIG[CURRENT_INDUSTRY] || INDUSTRY_CONFIG.clinic;
  const activeTreatments = INDUSTRY_TREATMENTS[CURRENT_INDUSTRY] || CLINIC_TREATMENTS;
  // [v134] 메뉴판/시술그리드 노출용 — restaurant는 현재 운영매장(맵꼬·분식) cat만 노출.
  //   원인: RESTAURANT_TREATMENTS = 한식(검증용 가상매장 이순대국집) + 분식(맵꼬) 혼재.
  //         발행비율 메뉴판에 순대국·수육·술국·머릿고기(한식)가 맵꼬 계정에 노출됨.
  //   현 단계: restaurant 실계정 = 맵꼬 1개뿐. storeId/cat↔hubStore 매핑 구조 없음(stores 테이블 미보유),
  //            region 매칭도 데이터셋(공릉동) vs 실매장(중랑구) 불일치로 불가.
  //   조치: 데이터셋 무수정. 표시 레이어에서 분식 cat만 통과. 생성매칭용 activeTreatments는 무변경(엣지 방어).
  //   정식 해결(차후): stores.store_type/cat 저장 또는 storeId↔STORE_PROFILES 매핑 도입.
  const RESTAURANT_LIVE_CAT = "분식"; // 현재 운영매장 cat (맵꼬). 멀티매장 전환 시 hubStore에서 동적 도출.
  // [v148] 업종별 "내 메뉴" — 마스터 메뉴 중 사용자가 고른 항목만 발행비율/AI글쓰기/달력에 노출.
  //   형태: { dental:[...], legal:[...] }. 미설정(키 없음/빈배열) = fallback(마스터 전체) — 기존 사용자 무손상.
  //   저장은 localStorage(aipost_mymenus_v1) 단독 키. plan_state와 분리 → 리셋(plan)이 내 메뉴를 안 건드림.
  //   ※ menuTreatments(아래)가 참조하므로 반드시 그 위에서 선언(TDZ 방지).
  const [myMenusMap,   setMyMenusMap]   = useState({});
  const [editingMenus, setEditingMenus] = useState(false); // 발행비율 탭 "내 메뉴 편집" 모드 토글
  const [menuToast, setMenuToast] = useState("");           // [v-menuclean] 저장 Toast (1.5s)
  const LS_MYMENU_KEY = "aipost_mymenus_v1";

  // [이동됨] quotaInfo — 원래 아래쪽 useState 묶음에 있었으나 masterMenus OWNER 게이트가 참조 → 상단 이동(TDZ 방지).
  const [quotaInfo,    setQuotaInfo]    = useState(null);
  // [전문점 2단 트리] hubStore를 restaurant 메뉴 필터보다 먼저 선언(TDZ 방지). 원위치(아래)에서 이동.
  //   [v26] 업체정보 — store_profiles. AI 생성용 사업장 데이터. GET/PATCH(me/store).
  const [hubStore,    setHubStore]    = useState(null);   // null=미로딩 | {industry,store_name,address,specialty,...}
  // [OWNER 검수 게이트] restaurant 멀티카테고리 검수용 임시 우회.
  //   일반 사용자: 기존대로 RESTAURANT_LIVE_CAT(분식)만 노출 — 운영 무영향.
  //   OWNER: 전 카테고리(한식·분식·…) 노출 → FREEZE 검수 가능. PATCH-08 OWNER 완화 철학 동일.
  //   ※ 정식 해결(stores.cat↔storeId 매핑) 완성 시 이 분기 제거.
  const _isOwnerView = !!(quotaInfo && (quotaInfo.bypass || quotaInfo.reason === "OWNER_BYPASS"));
  // [v3 홍보메뉴 분리] restaurant 노출/발행 대상 = promotionMenus만 (검수 2026-06-26).
  //   역할 분리: RESTAURANT_TREATMENTS(데이터·전체 보유)는 무변경 / 노출은 promotion 필터로 거른다.
  //   → 전체메뉴 과다 생성(냉면·기사식당·… 분산) 차단, SEO 집중. menus 전체는 메뉴판 사진 노출용(차후 UI).
  //   OWNER 검수 시엔 전체 노출 유지(promotion 미적용) — FREEZE 검수에 전 메뉴 확인 필요.
  //   promotionMenus 미정의 매장 → 헬퍼가 menus로 폴백(하위호환).
  // [전문점 2단 트리] hubStore.specialty(선택 전문점 cat)가 있으면 그 cat만 노출 → 메뉴 자동 변경.
  //   specialty 없으면 기존 LIVE_CAT(분식) 유지(하위호환). OWNER 뷰는 전체 노출 유지(검수).
  // [v-dept] 진료과 파생 — hubStore 선언 이후(TDZ 방지). 대표=[0]=hubStore.industry.
  const _repIndustry  = (hubStore && hubStore.industry) || "";
  const myDepartments = normalizeDepartments((hubStore && hubStore.departments) || [], _repIndustry);
  // [UI-SCOPE-VS-CORE-INDUSTRY-CONFLATION-01] 글 목록 표시 범위 전용 파생.
  //   ★ myDepartments 를 그대로 쓰면 안 된다 — normalizeDepartments 는 그룹 미소속 업종
  //     (무속·상조·전문직)에서 [] 를 반환하므로(industry-tree L413) 필터가 전면 해제된다.
  //   ★ deptList(_isMultiDept 게이트 통과분)도 아니다. 게이트와 무관한 원본 등록 범위를 쓴다.
  const _scopeInds = myDepartments.length ? myDepartments : (_repIndustry ? [_repIndustry] : []);
  //   스위처 노출 조건: 병원군 + 진료과 2개 이상. 단일과·비병원 = 기존 화면 그대로.
  // [v-svcgate 2026-07-21] 병원 전용 → 서비스그룹 일반화. 공사군(interior 등) 다중 시공분야도 메뉴 분리 노출.
  //   근거: departments 저장은 성공하나 게이트가 isHospitalIndustry라 공사군은 _isMultiDept=false → 대표 업종 메뉴만 노출.
  //   hasServiceFields = 그룹 소속 + 대표가 available. 그룹 미소속 단독 업종 = 기존 동작 100% 동일.
  const showDeptSwitch = hasServiceFields(_repIndustry) && myDepartments.length > 1;
  // [v-svcgate] 그룹 라벨 — 좌측 패널 문구를 그룹별로(병원=진료과 / 공사군=시공 분야). 미소속=기본값.
  const _svcGroup = serviceGroupOf(_repIndustry);
  const _svcLabel = (_svcGroup && _svcGroup.label) || "분야";
  const _svcEmoji = (_svcGroup && _svcGroup.emoji) || "📋";

  const _restaurantSpecialtyCat = (hubStore && hubStore.specialty) ? String(hubStore.specialty) : "";
  const _restaurantCat = _restaurantSpecialtyCat || RESTAURANT_LIVE_CAT;
  // [전문점 필터] specialty 있으면 OWNER도 그 cat만 노출(SPECIALTY 기준 조회). 순대국/전체 fallback 제거.
  //   OWNER + specialty 없음 = 검수용 전체 노출 유지. 일반 사용자 = 기존 promotion 필터.
  const _restaurantSpecView = (CURRENT_INDUSTRY === "restaurant" && !!_restaurantSpecialtyCat);
  const _restaurantMaster = (CURRENT_INDUSTRY === "restaurant" && !_isOwnerView)
    ? filterTreatmentsByPromotion(activeTreatments.filter(t => (t.cat || "") === _restaurantCat))
    : activeTreatments;
  // [clinic v2 승격 2026-07-13] 성형외과 — cat:"피부" 2종(피코레이저·레이저토닝) 표시 제외.
  //   근거: clinic-v2 화이트리스트(CLINIC_V2_ALLOWED 15종)에 미포함 → 선택 시 엔진이 400 반환(사용자 장애).
  //        해당 시술은 derma(피부과) 엔진 소관. restaurant와 동일하게 "표시 레이어에서만" 거른다.
  //   clinic-data.js(17종) 무손상 — 생성매칭용 activeTreatments는 무변경(엣지 방어).
  //   ※ OWNER도 동일 적용(400은 OWNER에게도 발생하므로 검수 우회 대상 아님).
  const _clinicMaster = (CURRENT_INDUSTRY === "clinic")
    ? activeTreatments.filter(t => (t.cat || "") !== "피부")
    : activeTreatments;

  const masterMenus = _restaurantSpecView
    ? activeTreatments.filter(t => (t.cat || "") === _restaurantSpecialtyCat)
    : (CURRENT_INDUSTRY === "restaurant" && !_isOwnerView)
      ? _restaurantMaster
      : _clinicMaster;
  // [v148] 내 메뉴 필터 — myMenusMap[업종]에 항목이 있으면 그 항목만 노출. 없으면 마스터 전체(fallback, 기존 사용자 무손상).
  //   menuTreatments는 발행비율·AI글쓰기·달력·최근발행 4곳의 단일 소스 → 여기 한 번 거르면 전 화면 동시 반영.
  const nameOfT = (t) => (t.menu || t.menuRef || t.name);
  const myMenuList = (myMenusMap && Array.isArray(myMenusMap[CURRENT_INDUSTRY])) ? myMenusMap[CURRENT_INDUSTRY] : [];
  // [MultiDeptMenu] menuTreatments 는 아래 Spine 선언 후 재정의된다(_menuTreatmentsBase = 단일과 원본).
  //   ⚠️ 아래 `const menuTreatments`(Spine) 가 실제 소비값. 여기선 폴백 원본만 보관.
  const _menuTreatmentsBase = (myMenuList.length > 0)
    ? masterMenus.filter(t => myMenuList.includes(nameOfT(t)))
    : masterMenus;
  // ══════════════════════════════════════════════════════════════
  // [MultiDeptMenu Spine 2026-07-12] 병원 다중 진료과 — 메뉴 선택 UX에서 CURRENT_INDUSTRY 의존 제거.
  // ──────────────────────────────────────────────────────────────
  // 원칙(사용자 합의):
  //   · 사용자는 진료과를 전환하지 않는다 / 엔진을 선택하지 않는다 / 메뉴만 선택한다.
  //   · 진료과·엔진 매칭은 시스템이 자동 처리(_deptOfMenu 역인덱스).
  // 저장구조 무변경(One Axis): myMenusMap[dept] = [메뉴명…] 그대로. 마이그레이션 0.
  // 중복 처리 = C안: 같은 메뉴명이 여러 진료과에 있으면 '첫 진료과' 고정(departments 순).
  //   이미 선택된 이름은 다른 진료과 섹션에서 비활성 표시 → 중복 카드 원천 차단.
  // 비병원·단일과 = deptList 길이 ≤1 → 기존 동작 100% 동일(전 로직 하위호환).
  // ★ Generate / V2 엔진 / prompts / publish 무수정. UI Spine + payload.industry 매칭만.
  // ══════════════════════════════════════════════════════════════
  const _isMultiDept = showDeptSwitch; // 병원군 + 진료과 2개 이상
  const deptList = _isMultiDept ? myDepartments : (CURRENT_INDUSTRY ? [CURRENT_INDUSTRY] : []);
  // 좌측 진료과 섹션 접기/펼치기 — 기본: 첫(대표) 진료과만 펼침. { dept: true }
  //   [v-lastdept] 마지막으로 작업하던 진료과를 기억한다(localStorage). 없으면 첫(대표) 진료과.
  const LAST_DEPT_KEY = "aipost_last_dept_v1";
  const [openDepts, setOpenDepts] = useState({});
  useEffect(() => {
    if (!deptList.length) return;
    setOpenDepts(prev => {
      if (Object.keys(prev).length) return prev;
      let last = "";
      try { last = localStorage.getItem(LAST_DEPT_KEY) || ""; } catch {}
      const pick = (last && deptList.includes(last)) ? last : deptList[0];
      return { [pick]: true };
    });
  }, [deptList.join(",")]);
  const toggleDept = (d) => setOpenDepts(prev => {
    const next = { ...prev, [d]: !prev[d] };
    if (next[d]) { try { localStorage.setItem(LAST_DEPT_KEY, d); } catch {} }   // 펼친 과 = 마지막 작업 과
    return next;
  });

  // 좌측 「병원 전체 메뉴」 — 진료과별 섹션. [{ dept, label, items:[{name,emoji,cat}] }]
  //   items 는 해당 진료과의 마스터 시술 전체. 단일과/비병원은 masterMenus 1섹션.
  const hospitalMenuSections = useMemo(() => {
    if (!_isMultiDept) {
      return CURRENT_INDUSTRY
        ? [{ dept: CURRENT_INDUSTRY, label: deptLabel(CURRENT_INDUSTRY),
             items: masterMenus.map(t => ({ name: nameOfT(t), emoji: t.emoji || "📄", cat: t.cat || "" })).filter(x => x.name) }]
        : [];
    }
    //   [v-nodup] 소유권(첫 등장 과) 없는 중복 메뉴는 아예 렌더하지 않는다.
    //   회색 비활성 카드는 실무자에게 "왜 안 되지?"만 남김 → 선택 가능한 것만 보인다.
    //   ※ 진료과별로 다른 글이 필요해지면 그때 데이터셋 유일화(C안)로 분리.
    const _seen = new Set();
    return deptList.map(d => {
      const items = [];
      for (const t of (INDUSTRY_TREATMENTS[d] || [])) {
        const nm = nameOfT(t);
        if (!nm || _seen.has(nm)) continue;   // 앞 진료과가 이미 소유 → 스킵
        _seen.add(nm);
        items.push({ name: nm, emoji: t.emoji || "📄", cat: t.cat || "" });
      }
      return { dept: d, label: deptLabel(d), items };
    });
  }, [_isMultiDept, CURRENT_INDUSTRY, deptList.join(","), masterMenus]);

  // 역인덱스: 메뉴명 → 소속 진료과(첫 등장 고정 = C안). 생성 시 payload.industry 자동 결정.
  const _deptOfMenuMap = useMemo(() => {
    const m = {};
    for (const sec of hospitalMenuSections) {
      for (const it of sec.items) { if (!(it.name in m)) m[it.name] = sec.dept; }
    }
    return m;
  }, [hospitalMenuSections]);
  //   메뉴명 → 진료과. 미등록(사용자 직접추가 extraMenus 등)이면 CURRENT_INDUSTRY 폴백.
  const deptOfMenu = (name) => _deptOfMenuMap[String(name || "")] || CURRENT_INDUSTRY;

  // 우측 「나의 메뉴」 통합 — 전 진료과 flat merge(읽기 전용). 저장은 여전히 dept별.
  //   [{ name, dept, deptLabel, emoji, cat }] — 카드에 진료과 배지 표시.
  const myMenuFlat = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const d of deptList) {
      const arr = (myMenusMap && Array.isArray(myMenusMap[d])) ? myMenusMap[d] : [];
      for (const nm of arr) {
        if (seen.has(nm)) continue; // C안: 중복 이름 1회만
        seen.add(nm);
        const meta = (hospitalMenuSections.find(s => s.dept === d)?.items || []).find(x => x.name === nm) || {};
        out.push({ name: nm, dept: d, deptLabel: deptLabel(d), emoji: meta.emoji || "📄", cat: meta.cat || "" });
      }
    }
    return out;
  }, [deptList.join(","), JSON.stringify(myMenusMap), hospitalMenuSections]);
  const myMenuFlatNames = myMenuFlat.map(x => x.name);

  // 병원 전체 마스터 treatment 객체(진료과 무관) — menuTreatments 산출용.
  //   단일과·비병원 = masterMenus 그대로(하위호환).
  const hospitalMasterTreatments = useMemo(() => {
    if (!_isMultiDept) return masterMenus;
    const out = []; const seen = new Set();
    for (const d of deptList) {
      for (const t of (INDUSTRY_TREATMENTS[d] || [])) {
        const nm = nameOfT(t);
        if (!nm || seen.has(nm)) continue; // C안: 첫 진료과 우선
        seen.add(nm);
        out.push({ ...t, __dept: d }); // __dept = 소속 진료과(엔진 자동매칭용)
      }
    }
    return out;
  }, [_isMultiDept, deptList.join(","), masterMenus]);

  // 좌측 추가 — 해당 진료과 키에 저장(저장구조 유지).
  const addMyMenuDept = (name, dept) => setMyMenusMap(prev => {
    const d = dept || deptOfMenu(name) || CURRENT_INDUSTRY;
    const cur = Array.isArray(prev[d]) ? prev[d] : [];
    return cur.includes(name) ? prev : { ...prev, [d]: [...cur, name] };
  });
  // 우측 삭제 — 소속 진료과 키에서 제거.
  const removeMyMenuDept = (name, dept) => setMyMenusMap(prev => {
    const d = dept || deptOfMenu(name) || CURRENT_INDUSTRY;
    const cur = Array.isArray(prev[d]) ? prev[d] : [];
    return { ...prev, [d]: cur.filter(x => x !== name) };
  });

  // ★ menuTreatments 최종 — 발행비율·AI글쓰기·달력·최근발행 4곳 단일 소스.
  //   병원 다중과: 전 진료과 통합 '나의 메뉴'. 미선택 시 병원 전체 마스터(fallback).
  //   단일과·비병원: _menuTreatmentsBase(기존 로직 100% 동일).
  const menuTreatments = !_isMultiDept
    ? _menuTreatmentsBase
    : (myMenuFlatNames.length > 0
        ? hospitalMasterTreatments.filter(t => myMenuFlatNames.includes(nameOfT(t)))
        : hospitalMasterTreatments);

  // [v150] 좌측 전체메뉴 선택 패널용 — 마스터 전체 이름 + 추가/삭제 헬퍼(편집모드에서 좌측이 직접 우측 state에 반영).
  const masterMenuNamesAll = masterMenus.map(nameOfT).filter(Boolean);
  // [v150] 좌측 카드 메타(우측 발행비율 카드와 동일 형식) — 이름→{emoji,cat}
  const masterMetaOf = (name) => {
    const t = masterMenus.find(x => nameOfT(x) === name);
    return { emoji: (t && t.emoji) || "📄", cat: (t && t.cat) || "" };
  };
  const addMyMenuParent = (name) => setMyMenusMap(prev => {
    const cur = Array.isArray(prev[CURRENT_INDUSTRY]) ? prev[CURRENT_INDUSTRY] : [];
    return cur.includes(name) ? prev : { ...prev, [CURRENT_INDUSTRY]: [...cur, name] };
  });
  const activeCats     = CURRENT_INDUSTRY === "dental"  ? DENTAL_CATS
                       : CURRENT_INDUSTRY === "ent"     ? ENT_CATS
                       : CURRENT_INDUSTRY === "urology"  ? UROLOGY_CATS
                       : CURRENT_INDUSTRY === "oriental" ? ORIENTAL_CATS
                       : CURRENT_INDUSTRY === "ortho"    ? ORTHO_CATS
                       : CURRENT_INDUSTRY === "pediatrics" ? PEDIATRICS_CATS
                       : CURRENT_INDUSTRY === "gastro"      ? GASTRO_CATS
                       : CURRENT_INDUSTRY === "pulmo"       ? PULMO_CATS_UI
                       : CURRENT_INDUSTRY === "card"        ? CARD_CATS_UI
                       : CURRENT_INDUSTRY === "endo"        ? ENDO_CATS_UI
                       : CURRENT_INDUSTRY === "general"     ? GENERAL_V2_CATS_UI
                       : CURRENT_INDUSTRY === "obgyn"       ? OBGYN_CATS
                       : CURRENT_INDUSTRY === "derma"       ? DERMA_CATS
                       : CURRENT_INDUSTRY === "pain"        ? PAIN_CATS
                       : CURRENT_INDUSTRY === "radio"       ? RADIO_CATS
                       : CURRENT_INDUSTRY === "neuro"       ? NEURO_CATS
                       : CURRENT_INDUSTRY === "psy"         ? PSY_CATS
                       : CURRENT_INDUSTRY === "eye"         ? EYE_CATS
                       : CURRENT_INDUSTRY === "family"      ? FAMILY_CATS
                       : CURRENT_INDUSTRY === "cafe"        ? CAFE_CATS
                       : CURRENT_INDUSTRY === "kindergarten" ? KINDERGARTEN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "fishing"     ? FISHING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "restaurant"  ? RESTAURANT_CATS
                       : CURRENT_INDUSTRY === "chinese"     ? CHINESE_CATS
                       : CURRENT_INDUSTRY === "korean"      ? KOREAN_CATS
                       : CURRENT_INDUSTRY === "snack"       ? SNACK_CATS
                       : CURRENT_INDUSTRY === "japanese"    ? JAPANESE_CATS
                       : CURRENT_INDUSTRY === "chicken"     ? CHICKEN_CATS
                       : CURRENT_INDUSTRY === "western"     ? WESTERN_CATS
                       : CURRENT_INDUSTRY === "meat"        ? MEAT_CATS
                       : CURRENT_INDUSTRY === "legal"       ? LEGAL_CATS
                       : CURRENT_INDUSTRY === "bedding"     ? BEDDING_CATS
                       : CURRENT_INDUSTRY === "lawyer"      ? LAWYER_CATS_LOCAL
                       : CURRENT_INDUSTRY === "daycare"     ? DAYCARE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "homecare"    ? HOMECARE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "funeral"     ? FUNERAL_CATS_LOCAL
                       : CURRENT_INDUSTRY === "tax"         ? TAX_CATS_LOCAL
                       : CURRENT_INDUSTRY === "labor"       ? LABOR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "flower"      ? FLOWER_CATS_LOCAL
                       : CURRENT_INDUSTRY === "welfarecare" ? WELFARECARE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "seniorgoods" ? SENIORGOODS_CATS_LOCAL
                       : CURRENT_INDUSTRY === "administrative" ? ADMIN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "realestate"    ? REALESTATE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "cleaning"      ? CLEANING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "moving"        ? MOVING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "interior"      ? INTERIOR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "grout"         ? GROUT_CATS_LOCAL
                       : CURRENT_INDUSTRY === "coating"       ? COATING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "systemair"     ? SYSTEMAIR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "airclean"      ? AIRCLEAN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "screen"        ? SCREEN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "pestcontrol"   ? PESTCONTROL_CATS_LOCAL
                       : CURRENT_INDUSTRY === "buildingclean" ? BUILDINGCLEAN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "dobae" ? DOBAE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "flooring" ? FLOORING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "film" ? FILM_CATS_LOCAL
                       : CURRENT_INDUSTRY === "door" ? DOOR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "waterproof" ? WATERPROOF_CATS_LOCAL
                       : CURRENT_INDUSTRY === "paint" ? PAINT_CATS_LOCAL
                       : CURRENT_INDUSTRY === "tile" ? TILE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "window" ? WINDOW_CATS_LOCAL
                       : CURRENT_INDUSTRY === "furniture" ? FURNITURE_CATS_LOCAL
                       : CURRENT_INDUSTRY === "lighting" ? LIGHTING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "demolition" ? DEMOLITION_CATS_LOCAL
                       : CURRENT_INDUSTRY === "birdcontrol" ? BIRDCONTROL_CATS_LOCAL
                       : CURRENT_INDUSTRY === "tankclean" ? TANKCLEAN_CATS_LOCAL
                       : CURRENT_INDUSTRY === "leakdetect" ? LEAKDETECT_CATS_LOCAL
                       : CURRENT_INDUSTRY === "sewer" ? SEWER_CATS_LOCAL
                       : CURRENT_INDUSTRY === "plumbing" ? PLUMBING_CATS_LOCAL
                       : CURRENT_INDUSTRY === "boiler" ? BOILER_CATS_LOCAL
                       : CURRENT_INDUSTRY === "homefix" ? HOMEFIX_CATS_LOCAL
                       : CURRENT_INDUSTRY === "electricrepair" ? ELECTRICREPAIR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "sinkrepair" ? SINKREPAIR_CATS_LOCAL
                       : CURRENT_INDUSTRY === "bathroom" ? BATHROOM_CATS_LOCAL
                       : CURRENT_INDUSTRY === "shaman" ? SHAMAN_CATS_LOCAL
                       : CLINIC_CATS;

  // ★ [PATCH v3.7] 새로고침 시 글쓰기 진행 상태 유지 — 운영 안정화 핵심
  //  - messages: 대화 로그
  //  - input/stage/result: 글쓰기 진행 + 결과물
  //  - rightTab: 현재 탭 (blog/watermark/photoedit)
  //  - publishUrl: 발행 URL 유지
  const [messages,     setMessages]     = usePersistentState(SK.INDEX_MESSAGES, [],        { debounceMs: 700 });
  const [input,        setInput]        = usePersistentState(SK.INDEX_INPUT,    "",        { debounceMs: 500 });
  // [v126] 좌측 하단 채팅 입력창 화면 렌더 OFF. 코드·핸들러·state 전부 보존(setInput/handleSend는 우측 버튼·달력·생성칩이 계속 사용).
  //        옵저버 완성 후 데이터 기반 질문(공릉동 생존·시술 반응 등)이 의미를 가지면 true로 부활. 엔진/publish/usage 무관.
  const SHOW_CHAT_INPUT = false;
  const [loading,      setLoading]      = useState(false);
  const [stage,        setStage]        = usePersistentState(SK.INDEX_STAGE,    "welcome", { debounceMs: 300 });
  const [result,       setResult]       = usePersistentState(SK.INDEX_RESULT,   null,      { debounceMs: 1000 });
  const [copied,       setCopied]       = useState(false);
  const [titleCopied,  setTitleCopied]  = useState(false); // [v111] 제목 옆 작은 복사 아이콘 피드백
  // publish 발행 완료 기록 (Supabase publish_history)
  const [publishUrl,    setPublishUrl]    = useState("");
  const [publishStatus, setPublishStatus] = useState("idle"); // idle | sending | done | error
  const [publishError,  setPublishError]  = useState("");
  // [v118] 발행 체크리스트 — 사진편집기 한 번이라도 열었는지(선택 단계 점등용). 확인 가능한 행동만 추적.
  const [photoToolUsed, setPhotoToolUsed] = useState(false);
  // [v111] 동작 감지형 체크리스트 — copied는 2초 후 리셋되므로 점등용 sticky 플래그를 따로 둠.
  const [everCopied,   setEverCopied]   = useState(false); // 한 번이라도 복사했는가(영구)
  const [naverVisited, setNaverVisited] = useState(false); // 복사 후 탭 이탈→복귀(발행하러 다녀옴)

  // ─────────────────────────────────────────────────────────
  // [51차] quota spine 연결 — 헤더 상시표시 + 발행 직전 차단
  //   - 호출 시점: 발행 직전 (글 생성은 자유)
  //   - 차단 UI: 모달 (한도초과 / 미로그인 / 비활성)
  //   - 표시: 우측 헤더 상시 "📌 발행 N/10" (owner는 ∞)
  // ─────────────────────────────────────────────────────────
  const [authUserId,   setAuthUserId]   = useState(null); // null = 미로그인
  const [authChecked,  setAuthChecked]  = useState(false); // 세션 체크 완료 여부
  const [authEmail,    setAuthEmail]    = useState(null);  // [v15] 계정 표시용
  const [storeName,    setStoreName]    = useState(null);  // [v15] 인사 표시 1순위(사업장명)
  // [v27] 첫 진입 온보딩 판별: null=미확인 | "onboard"=업체정보 미입력(대표지역 비어있음) | "ready"=입력완료
  const [storeReady,   setStoreReady]   = useState(null);
  // [v68] 가입 후 가로채기 제거 → 업체 등록은 업체정보 화면이 전담(코치가 유도).
  //   needsOnboard는 신호용으로만 유지(true=store행 없음). 렌더 가로채기 없음.
  const [needsOnboard, setNeedsOnboard] = useState(null);
  // [v6 1단계] 비로그인 첫 진입 시 체험 오버레이 표시 (닫으면 기존 화면 노출)
  const [showExp,      setShowExp]      = useState(true);
  // quotaInfo 형태: { allowed, reason, account_id, plan_id, monthly_publish, monthly_quota, remaining }
  // [이동] quotaInfo 선언은 masterMenus(restaurant OWNER 게이트)가 참조하므로 상단으로 옮김 — TDZ 방지.
  const [quotaModal,   setQuotaModal]   = useState(null);
  // quotaModal 형태: null | { type: 'login_required' | 'quota_exceeded' | 'inactive' | 'not_found', detail?: any }

  // [v19] AI 운영 허브 실데이터 — me/posts(최근발행+운영코치) / me/survival(관측). 읽기 전용.
  const [hubPosts,    setHubPosts]    = useState(null);   // null=미로딩 | [] = 없음 | [{...}]
  const [hubSurvival, setHubSurvival] = useState(null);   // null=미로딩 | {alive,fossil,gone,unknown,observed}
  const [hubSurvivalItems, setHubSurvivalItems] = useState(null); // post별 [{status,treatment,region,...}] — ⑤ 최근성과
  const [hubLoading,  setHubLoading]  = useState(false);
  // [v24] 순위 관측 — post_ranks. { [post_id]: {current,prev,delta,checked_at} }. RLS 본인 격리.
  const [hubRanks,    setHubRanks]    = useState({});     // 글별 최신·직전 순위 맵
  const [rankDraft,   setRankDraft]   = useState({});     // { [post_id]: "8" } 입력 중 값
  const [rankSaving,  setRankSaving]  = useState(null);   // 저장 중인 post_id
  const [coachOpen,   setCoachOpen]   = useState(false);  // [v24] 운영코치 펼침(기본 접힘=스크롤 절감)
  const [navOpen,     setNavOpen]     = useState(false);  // [v41] 좌측 메뉴 기본 접힘(아이콘만). 펼침 버튼 클릭 시에만 라벨 표시. 로그인/비로그인 공통.
  // [v32] footerDoc state 제거 — 정책문서는 좌측 대화 버블로 직접 출력(상태 불필요).
  const [helpTab,     setHelpTab]     = useState(null);   // [v28] 좌측 도움말 패널: null=대화창 | stats|coach|posts|survival|store. 탭 클릭 시 표시, 같은 탭 재클릭 시 대화창 복귀.
  // [v26] 좌측 세로띠 IndustrySideMenu 클릭값 → NavPanel centerPick으로 흘려보내는 통로.
  //   좌측에서 "이 업종으로 시작하기" 확정 시 set → NavPanel이 prop으로 받아 centerPick에 반영(미확정 계정만).
  const [industrySidePick, setIndustrySidePick] = useState("");
  // [v122] hubStore.industry 가 SoT → CURRENT_INDUSTRY 확정. (currentStore stub 대체)
  //   store 행 있으면 그 업종, industry 비면 미정 유지. 발행비율·제목패턴·라벨 전부 이 값 따라감.
  useEffect(() => {
    if (!hubStore || !hubStore.industry) return;
    // [v-dept] 다중 진료과 계정: 이미 유효한 진료과가 선택돼 있으면 유지(사용자 선택 존중).
    //   그 외(최초 로드 / 타 업종 잔재 / 목록에서 제거된 과) → 대표 진료과로 확정.
    const _dl = normalizeDepartments(hubStore.departments || [], hubStore.industry);
    setCURRENT_INDUSTRY(prev => (prev && _dl.length > 1 && _dl.includes(prev)) ? prev : hubStore.industry);
  }, [hubStore && hubStore.industry, JSON.stringify((hubStore && hubStore.departments) || [])]);
  // [v122] 업종 전환 시 이전 업종 plan 캐시 폐기 가드 → plan state 선언 이후로 이동(아래 useEffect 참조).
  const [storeSaving, setStoreSaving] = useState(false);  // 업체정보 저장 중

  // [Spine 연결] 단일 진실원 — 배지·라우팅·profile·Observer 가 읽는 컨텍스트.
  //   입력원 = hubStore(store_name·region·sub_region·industry) + currentStore.id.
  //   배지는 store/profile 을 직접 조회하지 않고 이 객체만 읽는다(계약).
  const activeCtx = getActiveContext(
    hubStore ? { ...hubStore, id: hubStore.id || currentStore?.id || null } : currentStore
  );
  // 세션 로드 + 초기 quota 조회
  // [v15] 사업장명 조회 — 인사 표시 1순위. 실패해도 무해(이메일 앞부분 fallback).
  const fetchStoreName = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) { setStoreName(null); return; }
      const res = await fetch("/api/me/store", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const st = await res.json();
        setStoreName(st?.hasStore ? (st.storeName || st.store_name || null) : null);
        // [v67] store_profiles 행 자체가 없으면(hasStore=false) 최초 온보딩 대상.
        //   업종이 여기서 확정되므로, region 유무보다 행 존재가 우선 판별 기준.
        setNeedsOnboard(st?.hasStore === false);
        // [v27] 대표지역(region) 입력 여부로 온보딩 상태 판별. 미입력 → 순차 유도 인사.
        const region = (st?.store?.region || "").trim();
        const ready = region ? "ready" : "onboard";
        setStoreReady(ready);
        return ready; // [v41] 호출부(로그인 직후)에서 온보딩 라우팅 분기에 사용
      }
    } catch (_) { /* fallback 사용 */ }
    return null;
  }, []);

  // [v19] 허브 실데이터 조회 — posts(최근발행+운영코치) + survival(관측) 병렬. 읽기 전용.
  //   허브(👤) 진입 시 1회 lazy load. me/store 와 동일 Bearer 패턴. 실패해도 placeholder 유지.
  // [Observation Spine 이관 2026-07-06] survival/rank 응답 파싱 + saveRank → lib/Observation.js.
  //   setter 주입으로 기존 fetchHub 처리부·saveRank useCallback 본문을 그대로 재현. 동작·API 무변경.
  const observationApi = useMemo(
    () => makeObservationApi({
      setHubSurvival, setHubSurvivalItems, setHubRanks, setRankDraft, setRankSaving,
    }),
    []
  );

  // [Publish Spine 1차 2026-07-06] 발행 실행 fetch 위임. 순수 네트워크 계층(setter 미주입).
  //   payload 조립·상태 반영은 각 호출부 유지. 경계만 확보.
  const publishApi = useMemo(() => makePublishApi(), []);
  const generateApi = useMemo(() => makeAIGenerateApi(), []); // [AI Generate Spine] 순수 네트워크 계층. setter 미주입.

  const fetchHub = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return;
      setHubLoading(true);
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [pRes, sRes, rRes, stRes] = await Promise.allSettled([
        fetch("/api/me/posts?limit=1000", h),
        fetch("/api/me/survival", h),
        fetch("/api/me/rank", h),
        fetch("/api/me/store", h),
      ]);
      // [v157] 업종 필터를 fetchHub에서 제거 — 저장 레이어는 원본 유지, 화면 레이어(filterRealPosts)에서 필터.
      //   달력(6732)이 성공한 구조와 동일: 표시 시점 + state hubStore.industry 단일 소스.
      //   store 응답은 그대로 파싱해 setHubStore (필터 기준 소스이므로 보존 필수).
      if (stRes.status === "fulfilled" && stRes.value.ok) {
        const stj = await stRes.value.json();
        if (stj?.ok) {
          const s = stj.store || {
            industry: stj.industry, store_name: stj.storeName || stj.store_name,
          };
          setHubStore(s || {});
        }
      }
      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const pj = await pRes.value.json();
        // [v157] 원본 그대로 저장. 업종 필터는 소비 지점 filterRealPosts(hubPosts, hubStore?.industry)에서.
        if (pj?.ok && Array.isArray(pj.posts)) setHubPosts(pj.posts);
      }
      // [Observation Spine] survival/rank 응답 파싱 위임 (판정+setter 원본 동일).
      await observationApi.applySurvivalResponse(sRes);
      await observationApi.applyRankResponse(rRes);
    } catch (e) {
      console.warn("[hub] 조회 실패:", e?.message);
    } finally {
      setHubLoading(false);
    }
  }, []);

  // [Observation Spine 이관 2026-07-06] saveRank 본문 → lib/Observation.js makeObservationApi.
  //   [v24] 오늘 순위 저장(post_ranks upsert, basis별 분리 기록) 로직은 모듈로 이동.
  //   호출부(JSX)는 saveRank(post, raw, basis) 시그니처 그대로 소비. 동작·API 무변경.
  const saveRank = observationApi.saveRank;

  // [Store Spine 이관 2026-07-06] createStore/saveStore → lib/Store.js makeStoreApi 팩토리.
  //   setter 주입으로 기존 useCallback 본문을 그대로 재현. 동작·API 무변경.
  const { createStore, saveStore } = useMemo(
    () => makeStoreApi({ setStoreSaving, setHubStore, setStoreReady }),
    []
  );
  useEffect(() => {
    if ((helpTab === "writer" || helpTab === "tools" || helpTab === "guide") && stage !== "welcome") setHelpTab(null);
  }, [stage, helpTab]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const uid = session?.user?.id || null;
        setAuthUserId(uid);
        setAuthEmail(session?.user?.email || null);
        setAuthChecked(true);
        if (uid) {
          fetchStoreName();
          // [fix] 새로고침(세션 복원) 시 hubStore가 비어 hasStore=false로 오판
          //   → 메인 코치가 "업체정보 먼저 등록" 오표시. 인라인 로그인 경로(handleInlineAuthed)와
          //   동일하게 fetchHub 호출해 hubStore(region/address/sub_region) 채움.
          if (hubPosts === null && !hubLoading) fetchHub();
          // 헤더 표시용 quota 조회 (차단 판정 아님 — GET 도 지원)
          try {
            const r = await fetch(`/api/publish/check-quota?auth_user_id=${encodeURIComponent(uid)}`);
            const j = await r.json();
            if (mounted && j && j.ok !== false) setQuotaInfo(j);
          } catch (e) {
            console.warn("[quota] 초기 조회 실패:", e?.message);
          }
        }
      } catch (e) {
        if (mounted) setAuthChecked(true);
        console.warn("[auth] 세션 조회 실패:", e?.message);
      }
    })();
    // auth 변경 감지 (로그인/로그아웃)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setAuthUserId(uid);
      setAuthEmail(session?.user?.email || null);
      if (!uid) {
        // [계정누수차단] 로그아웃/계정전환 시 이전 계정의 plan·store·quota 상태가
        //   다음 계정 화면에 노출되던 누수 차단. state + localStorage 동시 제거.
        setQuotaInfo(null); setStoreName(null);
        setMenuWeights({}); setSavedWeights(null); setWeightsDirty(false);
        setActivePlan(null); setExtraMenus([]); setMyMenusMap({});
        setHubStore(null); setHubPosts(null);
        try {
          window.localStorage.removeItem("aipost_plan_state_v1");
          window.localStorage.removeItem("aipost_mymenus_v1");
        } catch {}
      }
      else fetchStoreName();
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [fetchStoreName]);

  // [v15] 메인 인라인 로그인 성공 — 페이지 이동 없이 세션 재조회 → 우측이 작업화면으로 전환
  const handleInlineAuthed = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setAuthUserId(uid);
      setAuthEmail(session?.user?.email || null);
      setAuthChecked(true);
      if (uid) {
        try {
          const r = await fetch(`/api/publish/check-quota?auth_user_id=${encodeURIComponent(uid)}`);
          const j = await r.json();
          if (j && j.ok !== false) setQuotaInfo(j);
        } catch (_) {}
        // [v42] 온보딩 분기 제거. 로그인 직후 무조건 AI 운영 허브(coach).
        //   좌측은 helpTab=null(대화창 인사만). 메뉴/탭 누르기 전엔 설명창 안 띄움.
        await fetchStoreName(); // storeReady 상태는 인사문구 분기용으로만 유지
        if (hubPosts === null && !hubLoading) fetchHub();
        setHelpTab(null);
        setNavView("coach");
        setResultTab("nav");
        return;
      }
      setResultTab("blog");
    } catch (_) {}
  }, [fetchStoreName, fetchHub, hubPosts, hubLoading]);

  const [resultTab,    setResultTab]    = useState("blog"); // 결과화면 탭: blog | tools | guide | nav
  // [v118] 사진편집기(tools) 한 번이라도 열면 체크리스트 선택단계 점등. 모든 진입 경로 공통 감지.
  useEffect(() => { if (resultTab === "tools" || helpTab === "tools") setPhotoToolUsed(true); }, [resultTab, helpTab]);
  // [v111] copied(2초 리셋) → everCopied(영구) 승격. 복사 행동 1회면 점등 유지.
  useEffect(() => { if (copied) setEverCopied(true); }, [copied]);
  // [v111] 네이버 발행 감지 — 복사 후 탭을 떠났다(발행하러 감) 돌아오면 발행 단계 점등.
  //   조건: 글 완성(result) + 복사 완료 + URL 미등록 상태에서 탭 복귀(visibilitychange visible).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible"
          && stage === "result" && everCopied && publishStatus !== "done") {
        setNaverVisited(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stage, everCopied, publishStatus]);

  const [showHome,     setShowHome]     = useState(true);  // [v91] 진입/새로고침 기본 = MainHero 랜딩. 로고 클릭 재진입도 동일. 메뉴/탭/글입력 시 false.
  const [showLogin,    setShowLogin]    = useState(false); // [v37] 우측 인라인 로그인폼 표시 토글(비로그인). 상단 🔑로그인 클릭 시 true.
  const [loginNonce,   setLoginNonce]   = useState(0);
  const [howtoItem,    setHowtoItem]    = useState("");    // [howto-video] 사용방법 목차 선택 항목
  // [세션57][AI영상코치] 좌측 상단 도우미 영상 — 입력 카드의 「▶ 영상보기」로만 열림. 기본 미표시.
  //   값 = COACH_VIDEOS 키. null이면 미노출. 다른 키 클릭 시 즉시 교체.
  const [coachVideoKey, setCoachVideoKey] = useState(null);
     // [v90] 상단 🔑로그인 클릭 시 LoginCard 리마운트 → 회원가입 모드에서 로그인 모드로 복귀
  // [v7] 네비 패널 — 우측 result 영역에 표시 (페이지 이동 없음). null | plans|usage|survival|posts|account
  const [navView,      setNavView]      = useState(null);
  // [업종센터/A] 좌측 코치창 트리 ↔ 우측 작업영역 상세 공유 선택 id. 트리 클릭 시 set → 우측 상세 갱신.
  const [industryCenterSel, setIndustryCenterSel] = useState("");
  // [업종선택 직접갱신] StoreInfoForm이 등록하는 명령형 핸들. 업종 선택 이벤트마다 우측 store 편집상태를 직접 갱신.
  //   useEffect([initialPick]) 값의존 우회 없이 선택 시점에 openEditFor를 즉시 호출한다.
  const storeEditRef = useRef(null);
  // [로그인 훅] 비로그인 로그인폼 유지한 채 좌측 대화창에만 업종센터 트리(미리보기) 표시. 우측 로그인폼 불변.
  const [showLeftCatalog, setShowLeftCatalog] = useState(false);
  // [전문점 2단 트리] 전문점 선택 시 specialty(전문점명) 보관. store prefill/저장에 사용. 일반 업종=빈값.
  const [centerSpecialty, setCenterSpecialty] = useState("");
  // [요율/계획] NavPanel이 resultTab 분기로 재마운트돼도 보존(A) + 새로고침에도 보존(B, localStorage).
  //   menuWeights=편집중 슬라이더 / savedWeights=저장 확정값 / activePlan=달력 확정계획 / extraMenus=추가진료.
  //   계정 단위 DB 영속화는 회원관리 단계에서. 지금은 브라우저(localStorage) 보존.
  const LS_PLAN_KEY = "aipost_plan_state_v1";
  // [D-5 축①] 계정 영속화 — DB(accounts.plan_state)가 SoT, localStorage는 즉시렌더 캐시(계정별 키).
  const lsPlanKeyFor = (uid) => (uid ? `aipost_plan_state_v1__${uid}` : LS_PLAN_KEY);
  const planSaveTimer = useRef(null);
  const planDbLoaded  = useRef(false);
  const fetchPlanStateDB = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return null;
      const r = await fetch("/api/plan-state", { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      return (j && j.ok) ? (j.plan_state || null) : null;
    } catch { return null; }
  };
  const savePlanStateDB = async (payload) => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) return false;
      const r = await fetch("/api/plan-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_state: payload }),
      });
      const j = await r.json();
      return !!(j && j.ok);
    } catch { return false; }
  };
  const loadPlanState = () => {
    if (typeof window === "undefined") return null;
    try { const raw = window.localStorage.getItem(LS_PLAN_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  };
  const [calMonth,     setCalMonth]     = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [menuWeights,  setMenuWeights]  = useState({});
  const [savedWeights, setSavedWeights] = useState(null);
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [activePlan,   setActivePlan]   = useState(null);
  const [extraMenus,   setExtraMenus]   = useState([]);
  const [newMenuInput, setNewMenuInput] = useState("");
  const planHydrated = useRef(false);
  // 마운트 후 1회 localStorage 복원(SSR 하이드레이션 불일치 방지 — 초기값은 기본값으로 두고 이후 주입)
  useEffect(() => {
    const s = loadPlanState();
    if (s) {
      // [v51] 카드 복원 — "정식 저장된 비율"(savedWeights에 주력≥50 존재)만 복원한다.
      //   주력 없는 menuWeights(이전 세션 보조만 켜둔 잔존값)는 복원하지 않는다 → 첫 진입 0 상태 유지.
      //   (보조19가 새 진입마다 부활하던 문제 차단. 정식 저장본은 그대로 살아남는다.)
      const savedHasMain = s.savedWeights && Object.values(s.savedWeights).some(v => Number(v) >= 50);
      if (savedHasMain) {
        // 기존 운영자 — 저장값(or 편집중값) 복원
        // [v153] 잔존 키 정렬 — localStorage menuWeights에 savedWeights에 없는 키가 남아 있으면
        //   카드는 그 키까지 그리는데 activePlan은 savedWeights 기준이라 '월 0건' 유령 카드가 생긴다.
        //   (7691 첫진입 분기의 '잔존 menuWeights 복원 안 함' 철학을 기존운영자 복원에도 동일 적용)
        //   → 화면(menuWeights)·정식저장본(savedWeights)·계획(activePlan) 3자 키를 일치시킨다.
        const savedKeys = new Set(Object.keys(s.savedWeights));
        const rawMenu = (s.menuWeights && Object.keys(s.menuWeights).length > 0) ? s.menuWeights : { ...s.savedWeights };
        const alignedMenu = {};
        for (const [k, v] of Object.entries(rawMenu)) { if (savedKeys.has(k)) alignedMenu[k] = v; }
        // savedWeights에 있는데 menuWeights에서 누락된 키는 저장본 값으로 보강(누락 0건 방지)
        for (const [k, v] of Object.entries(s.savedWeights)) { if (!(k in alignedMenu)) alignedMenu[k] = v; }
        setMenuWeights(alignedMenu);
        setSavedWeights(s.savedWeights);
        setWeightsDirty(false);
      } else {
        // [v55] 정식 저장본 없음 = 첫 진입 취급. localStorage의 잔존 menuWeights(보조만 켜둔 구버전)는
        //   복원하지 않을 뿐 아니라, 저장소 자체에서도 즉시 비워 둔다(다음 저장 effect가 빈 값으로 덮어씀).
        //   → 보조19가 다시 올라오는 잔존 경로 완전 차단.
        // [v119] 첫 진입 = 비중·계획 모두 비운다. activePlan만 잔존 복원하던 비대칭 버그 수정.
        //   계정 전환 시 이전 계정 계획(예: 치과 달력)이 localStorage로 새 계정에 노출되던 누수 차단.
        setMenuWeights({}); setSavedWeights(null); setWeightsDirty(false); setActivePlan(null);
        try { window.localStorage.setItem(LS_PLAN_KEY, JSON.stringify({ menuWeights: {}, savedWeights: null, activePlan: null, extraMenus: Array.isArray(s.extraMenus) ? s.extraMenus : [] })); } catch {}
      }
      // [v119] 계획 복원은 정식 저장본(주력≥50) 있을 때만. 첫 진입은 위에서 이미 null 처리됨.
      if (savedHasMain && s.activePlan) setActivePlan(s.activePlan);
      if (Array.isArray(s.extraMenus)) setExtraMenus(s.extraMenus);
    }
    planHydrated.current = true;
  }, []);
  // [D-5 축①] 로그인 확정 후 계정 복원 — ① 계정별 LS 캐시 즉시 반영 ② DB(plan_state) 최종 반영.
  //   DB 값이 없으면 현재 상태 유지 → 첫 저장 시 DB로 승격.
  useEffect(() => {
    if (!authUserId) { planDbLoaded.current = false; return; }
    let alive = true;
    (async () => {
      try {
        const raw = window.localStorage.getItem(lsPlanKeyFor(authUserId));
        const c = raw ? JSON.parse(raw) : null;
        if (c && c.savedWeights && Object.values(c.savedWeights).some(v => Number(v) >= 50)) {
          setMenuWeights(c.menuWeights || { ...c.savedWeights });
          setSavedWeights(c.savedWeights);
          setActivePlan(c.activePlan || null);
          setWeightsDirty(false);
          if (Array.isArray(c.extraMenus)) setExtraMenus(c.extraMenus);
          if (c.myMenusMap && typeof c.myMenusMap === "object") setMyMenusMap(c.myMenusMap);
        }
      } catch {}
      const s = await fetchPlanStateDB();
      if (!alive) return;
      if (s) {
        const hasMain = s.savedWeights && Object.values(s.savedWeights).some(v => Number(v) >= 50);
        if (hasMain) {
          setMenuWeights(s.menuWeights || { ...s.savedWeights });
          setSavedWeights(s.savedWeights);
          setActivePlan(s.activePlan || null);
          setWeightsDirty(false);
        }
        if (Array.isArray(s.extraMenus)) setExtraMenus(s.extraMenus);
        if (s.myMenusMap && typeof s.myMenusMap === "object") setMyMenusMap(s.myMenusMap);
      }
      planDbLoaded.current = true;
    })();
    return () => { alive = false; };
  }, [authUserId]);
  // [v148] 내 메뉴 복원(마운트 1회) — plan_state와 별도 키. 리셋이 절대 건드리지 않는 영역.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LS_MYMENU_KEY);
      const m = raw ? JSON.parse(raw) : null;
      if (m && typeof m === "object") setMyMenusMap(m);
    } catch {}
  }, []);
  // [v148] 내 메뉴 저장 — 복원 완료 후에만(빈 값 덮어쓰기 방지). plan effect와 독립.
  useEffect(() => {
    if (typeof window === "undefined" || !planHydrated.current) return;
    try { window.localStorage.setItem(LS_MYMENU_KEY, JSON.stringify(myMenusMap || {})); } catch {}
  }, [myMenusMap]);
  // 보존 대상 변경 시 localStorage 저장(복원 완료 후에만 — 복원 직전 빈 값으로 덮어쓰기 방지)
  useEffect(() => {
    if (typeof window === "undefined" || !planHydrated.current) return;
    // [v122] plan에 업종 태깅 — 업종 전환 시 이전 업종 계획(치과 달력 등) 폐기 판정용.
    const payload = { menuWeights, savedWeights, activePlan, extraMenus, myMenusMap, industry: CURRENT_INDUSTRY || null };
    try {
      window.localStorage.setItem(LS_PLAN_KEY, JSON.stringify(payload));
      // [D-5 축①] 계정별 캐시 — 로그아웃 시 공용키만 지워도 계정 캐시는 보존된다.
      if (authUserId) window.localStorage.setItem(lsPlanKeyFor(authUserId), JSON.stringify(payload));
    } catch {}
    // [D-5 축①] DB 저장(SoT) — 디바운스 800ms. DB 복원 완료 후에만(초기 빈값 덮어쓰기 방지).
    if (!authUserId || !planDbLoaded.current) return;
    if (planSaveTimer.current) clearTimeout(planSaveTimer.current);
    planSaveTimer.current = setTimeout(() => { savePlanStateDB(payload); }, 800);
  }, [menuWeights, savedWeights, activePlan, extraMenus, myMenusMap, CURRENT_INDUSTRY, authUserId]);
  // [v122] 업종 전환 시 이전 업종 plan 캐시(치과 달력 등) 폐기.
  //   plan 복원은 마운트 1회([])라 hubStore 도착 전 치과 plan이 복원될 수 있음.
  //   hubStore.industry 확정 후, 저장된 plan.industry와 다르면 비율·계획 전부 리셋.
  // [v127] 레거시 누수 보강 — industry 태그 없는(v122 이전 저장) plan은 7098 조건을 빠져나가
  //   타 업종(분식) 계획이 치과 달력에 칩으로 노출됨. 태그 없으면 plan topic을 현재 업종
  //   시술목록과 대조: 하나도 안 맞으면 타 업종 레거시로 판정·폐기. 하나라도 맞으면 보존.
  useEffect(() => {
    if (!planHydrated.current) return;            // 최초 복원 끝난 뒤에만
    const ind = hubStore && hubStore.industry;
    if (!ind) return;                              // 업종 미정이면 보류
    const s = loadPlanState();
    if (!s) return;
    // [v-dept] 다중 진료과 — 같은 병원 내 진료과 전환은 "타 업종"이 아니다.
    //   plan 태그(s.industry)는 CURRENT_INDUSTRY로 저장되므로 pain/radio 등 진료과 전환 시
    //   s.industry("pain") !== ind("ortho") 가 되어 아래 case1이 plan을 매번 폐기해버린다.
    //   → 두 값이 모두 이 계정의 진료과 목록(departments) 안에 있으면 폐기 금지(정상 전환).
    //   비병원·단일과 계정은 myDepartments 길이 ≤1 → 조건 미성립 → 기존 로직 100% 동일.
    const _sameHospital =
      myDepartments.length > 1 &&
      myDepartments.includes(ind) &&
      !!s.industry && myDepartments.includes(s.industry);
    if (_sameHospital) return;
    // [v158] case1(태그 비교)은 CURRENT_INDUSTRY 동기화와 무관하게 즉시 판정한다.
    //   plan.industry 태그가 존재하고 hubStore.industry와 다르면 명백한 타 업종 plan →
    //   activeTreatments(CLINIC 폴백 여부) 볼 필요 없이 안전하게 폐기. 이것이 맵꼬 계정에
    //   법무사 plan이 노출되던 누수의 직접 차단 지점이다. (동기화 대기 = 누수 통과였음)
    if (s.industry && s.industry !== ind) {
      setMenuWeights({}); setSavedWeights(null); setWeightsDirty(false); setActivePlan(null);
      try { window.localStorage.setItem(LS_PLAN_KEY, JSON.stringify({ menuWeights: {}, savedWeights: null, activePlan: null, extraMenus: [], industry: ind })); } catch {}
      return;
    }
    // [v153] 레이스 가드 — 아래 case2(태그 없는 레거시 topic 대조)만 동기화에 의존한다.
    //   새로고침 시 hubStore.industry는 도착했지만 CURRENT_INDUSTRY(→activeTreatments)가
    //   아직 동기화 전이면 activeTreatments가 CLINIC 폴백 → 타 업종 plan 오판·유실 위험.
    //   CURRENT_INDUSTRY가 실업종으로 확정되어 hubStore.industry와 일치할 때만 topic 대조.
    if (!CURRENT_INDUSTRY) return;
    if (CURRENT_INDUSTRY !== ind) return;
    let purge = false;
    // 2) 태그 없음(레거시) + activePlan 존재 → topic이 현재 업종 시술목록과 하나도 안 맞으면 폐기
    if (!purge && !s.industry && s.activePlan && s.activePlan.byDay) {
      const names = new Set(
        (Array.isArray(activeTreatments) ? activeTreatments : [])
          .map(t => (t.menu || t.menuRef || t.name)).filter(Boolean)
      );
      if (names.size > 0) {
        const topics = [];
        for (const v of Object.values(s.activePlan.byDay)) {
          const arr = Array.isArray(v) ? v : (v ? [v] : []);
          for (const it of arr) { const t = it && (it.topic || "").trim(); if (t) topics.push(t); }
        }
        const anyMatch = topics.some(t => names.has(t));
        if (topics.length > 0 && !anyMatch) purge = true;  // 전부 타 업종 → 레거시 폐기
      }
    }
    if (purge) {
      setMenuWeights({}); setSavedWeights(null); setWeightsDirty(false); setActivePlan(null);
      try { window.localStorage.setItem(LS_PLAN_KEY, JSON.stringify({ menuWeights: {}, savedWeights: null, activePlan: null, extraMenus: [], industry: ind })); } catch {}
    }
  }, [hubStore && hubStore.industry, CURRENT_INDUSTRY, myDepartments.join(",")]);
  const [uploadedImgs, setUploadedImgs] = useState({});
  const [diagResult,   setDiagResult]   = useState(null);
  const [diagLoading,  setDiagLoading]  = useState(false);
  const [rightTab,     setRightTab]     = usePersistentState(SK.INDEX_RIGHT_TAB, "blog",   { debounceMs: 200 });
  const [mountedTabs,  setMountedTabs]  = useState({ blog: true, watermark: false, photoedit: false });

  // ★ [PATCH v3.7] rightTab이 복구되면 해당 탭도 자동 마운트
  useEffect(() => {
    if (!rightTab) return;
    setMountedTabs(prev => prev[rightTab] ? prev : { ...prev, [rightTab]: true });
  }, [rightTab]);
  const [analysisData, setAnalysisData]       = useState(null); // 키워드 분석 결과
  const [pendingTreatment, setPendingTreatment]         = useState(null); // 시술 선택 후 지역 대기
  const [showTreatmentSelect, setShowTreatmentSelect]   = useState(false); // 우측 시술 선택 패널
  // [v94] 달력 진입 prefill — 달력 클릭 시 {treatment,rep,sub} 채워 통합화면으로 합류. null이면 직접작성.
  const [calendarPrefill, setCalendarPrefill]           = useState(null);
  const [selectedStrategyIdx, setSelectedStrategyIdx] = useState(null); // 전략 선택 상태

  // [v111] 결과 진입 시 시술선택 보드 상태 정리 — onComplete에서 즉시 정리하면 보드가 사라져 버튼 변환을 못 보여줌.
  //   생성 중에는 보드를 유지하다가, stage==="result"가 되면(우측이 결과화면으로 교체된 뒤) 다음 진입용으로 초기화.
  useEffect(() => {
    if (stage === "result") {
      if (showTreatmentSelect) setShowTreatmentSelect(false);
      if (calendarPrefill) setCalendarPrefill(null);
    }
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★ photoContext (scene 강화) — 생성 전 사진 업로드 → analyze.js 캐시
  const [scenePhotos,  setScenePhotos]  = useState([]);   // base64 배열 (최대 3)
  const [photoContext, setPhotoContext] = useState("");   // analyze 결과
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);

  const switchTab = (tab) => {
    setRightTab(tab);
    setMountedTabs(prev => ({ ...prev, [tab]: true }));
  };

  // [v-industry 2026-07-29] 업종 트리 선택 핸들러 — 업종센터(navView=industry)와
  //   최초등록 좌측 자동펼침이 같은 동작을 써야 한다. 두 군데 인라인 복제 금지 → 단일 소유.
  const handleIndustryTreeSelect = (id) => {
    // [전문점 2단 트리] 복합키 "restaurant#순대국" 파싱 → industry + specialty 분리.
    let _ind = id, _spec = "";
    if (typeof id === "string" && id.includes("#")) {
      const [eng, sp] = id.split("#");
      _ind = eng; _spec = sp || "";
    }
    setIndustryCenterSel(_ind);
    setCenterSpecialty(_spec);
    setResultTab("nav");
    setNavView("store");
    storeEditRef.current = { pending: { ind: _ind, spec: _spec } };
  };

  // [v-hero 2026-07-29] 좌측 히어로 CTA → 상단 HUB_TABS 이동.
  //   상단 탭바 onClick 의 '정상 로그인' 경로만 추출. 탭바 자체는 무수정.
  const goHubTab = (tabId) => {
    setShowHome(false);
    setShowLogin(false);
    setHelpTab(tabId);
    setStage("welcome");
    setShowTreatmentSelect(false);
    setCalendarPrefill(null);
    setPendingTreatment(null);
    if (tabId === "store" && !(hubStore && hubStore.industry)) {
      setHelpTab(null);
      setIndustryCenterSel((hubStore && hubStore.industry) || "");
      setNavView("industry");
    } else {
      setNavView(tabId);
    }
    setResultTab("nav");
    if (authUserId && hubPosts === null && !hubLoading) fetchHub();
  };

  const messagesEndRef = useRef(null);
  const isGenerating   = useRef(false);

  useEffect(() => {
    const config = INDUSTRY_CONFIG[CURRENT_INDUSTRY] || INDUSTRY_CONFIG.clinic;
    // [v127] '빠른 명령' 인사 블록 제거 — 좌측은 대화창 아닌 코치 메시지. examples 변수 미사용 삭제.
    // [v7] 비로그인: 네비형 인사 (버튼은 입력창 위 바에서 렌더). 로그인: 기존 greeting.
    if (authChecked && !authUserId) {
      setMessages([{
        // [v-landing2] 설명형 인사 제거. 질문 → 답 → 영상 → 4단계 → 시작 버튼.
        //   영상 SoT = COACH_VIDEOS.landing_guest (videoId 한 줄로 교체). [세션71] 로그인용과 분리.
        role: "landing",
        headline: "정말 검색 상단에 올라갈 수 있을까요?",
        sub: "AI가 글을 쓰는 것은 시작입니다. 생성부터 검색 노출까지, 2분 안에 확인해보세요.",
        video: "landing_guest",
        proof: ["실제 AI-POST 화면", "실제 네이버 검색", "편집 없이 그대로 촬영"],
        steps: ["생성", "발행", "검색", "상단 노출"],
        // [세션114] cases 제거 — 실제 노출 사례 블록 미노출. 렌더러(3921) 가드로 자동 차단.
        //   행 복구가 필요하면 여기 cases 배열만 다시 넣는다(렌더러 무수정).
        // [세션71] cta·note 제거 — 우측 포스터의 「무료 체험하기」와 CTA 중복.
        //   렌더러(3891/3902)는 msg.cta/msg.note 존재 여부로 가드 → 필드 삭제만으로 미노출.
      }]);
      return;
    }
    // [v120] 업종 미정(업체정보 미등록) 게이트 — store.industry 없으면 폴백(DEFAULT_INDUSTRY="clinic")
    //   잔재로 치과 인사·빠른명령이 새 계정에 노출되던 누수 차단. 등록 전엔 업종 색채 없는 안내만.
    //   판정 SoT = hubStore.industry(me/store API). 미정이면 greeting/examples/activePlan 전부 보류.
    const _industryReady = !!(hubStore && hubStore.industry);
    // [세션95] 세션74의 '미확정 계정 좌측 빈 화면' 해제.
    //   빈 화면은 첫 진입자에게 고장으로 읽힌다. 메인 좌측은 확정 여부와 무관하게 landing 히어로(영상).
    //   업종 색채가 없는 화면이라 v120 누수(치과 인사·빠른명령) 위험은 없다.
    //   업종 선택은 상단 [업체정보] · 좌측 세로띠 [업종센터]가 담당.
    void _industryReady;
    // [v-hero 2026-07-29] hello(인사말) 제거 — 하단 말풍선 삭제로 소비처 없음.
    //   좌측은 인사 화면이 아니라 작업 시작 화면. config.greeting 은 타 경로에서 계속 사용.
    // [v42] 온보딩 분기 제거. 로그인 시 항상 실행창 인사(대화 미저장 고지 + 오늘 할 일 + 빠른 명령).
    {
      // 오늘 계획 추출 — activePlan.byDay(일 숫자 키) + 이번 달 매칭.
      const now = new Date();
      const todayD = now.getDate();
      let todayTopics = [];
      if (activePlan && activePlan.byDay
          && activePlan.monthY === now.getFullYear()
          && activePlan.monthM === now.getMonth()) {
        const v = activePlan.byDay[todayD];
        const items = Array.isArray(v) ? v : (v ? [v] : []);
        todayTopics = items.map(it => it && it.topic).filter(Boolean);
      }
      // [v-hero 2026-07-29] 하단 대화 말풍선 제거 — 할 일은 위 CTA 3버튼이 이미 말한다.
      //   남길 정보는 ①오늘 예정 건수 ②미저장 고지 2가지뿐 → landing.note 회색 1줄로 흡수.
      const todayLine = (todayTopics.length
        ? `오늘 예정된 발행 : ${todayTopics.length}건 — ${todayTopics.join(", ")}`
        : `오늘 예정된 발행 : 0건`)
        + `  ·  생성한 글은 저장되지 않습니다 (발행내역·관측결과·운영설정만 저장)`;
      // [세션61] 로그인 메인 좌측도 비로그인과 동일한 landing 히어로를 먼저 노출한다.
      //   히어로(질문→답→신뢰3줄→영상→4단계) 아래에 기존 인사·오늘 계획을 이어 붙인다.
      //   ★ 영상 SoT = COACH_VIDEOS.landing 동일. cta만 로그인 사용자용으로 교체.
      // [v-hero 2026-07-29] 로그인 후 좌측 = 작업 시작 화면(우측 포스터 = 신뢰 확보). 역할 분리.
      //   ① 제목: "가능할까?"(가입 전 질문) → "오늘도 만들어보세요"(가입 후 실행)
      //   ② proof 3줄 삭제 — 증명은 우측 소관. 좌측은 다음 행동만.
      //   ③ steps: 생성·발행·검색·노출(결과 흐름) → 실제 조작 순서(업체등록→비율→글쓰기→URL)
      //   ④ actions: HUB_TABS 전환 3버튼 신설.
      //   ★ 비로그인 landing(위쪽 분기)은 무변경 — 그쪽은 여전히 "가능할까?"가 맞다.
      setMessages([
        {
          role: "landing",
          headline: "오늘도 검색 상단을 만들어보세요",
          sub: "3분이면 오늘 글 작성이 시작됩니다.",   // [세션71] 영상 길이 기준 2분→3분
          video: "landing",
          steps: ["업체등록", "발행비율 설정", "AI 글쓰기", "URL 등록"],
          videoNote: {
            main: "영상을 따라 해보세요",
            sub:  "3분이면 사용방법을 모두 익힐 수 있어요",
          },
          // [세션71] actions 3버튼·note(오늘 예정/미저장 고지) 제거 — 상단 HUB_TABS와 이동 경로 중복.
          //   렌더러는 msg.actions/msg.note 존재 가드 → 필드 삭제만으로 미노출(컴포넌트 무수정).
        },
      ]);
      return;
    }
  }, [CURRENT_INDUSTRY, authChecked, authUserId, storeName, storeReady, activePlan, hubStore]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg        = (msg) => setMessages(prev => [...prev, msg]);
  const removeLoading = ()    => setMessages(prev => prev.filter(m => m.role !== "loading"));

  const handleBlogImgUpload = useCallback((index, url) => {
    setUploadedImgs(prev => ({ ...prev, [index]: url }));
  }, []);

  // ★ 사진 업로드 → analyze.js → photoContext 캐시
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });

  const handleScenePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (files.length === 0) return;

    setIsAnalyzing(true);
    try {
      const base64s = await Promise.all(files.map(fileToBase64));
      setScenePhotos(base64s);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: base64s,
          industry: CURRENT_INDUSTRY,
          treatmentName: pendingTreatment?.name || "",
          region: "",
        }),
      });
      const data = await res.json();
      if (data?.photoContext) {
        setPhotoContext(data.photoContext);
        addMsg({
          role: "assistant",
          text: `📷 사진 ${files.length}장 분석 완료 (${data.photoContext.length}자). 생성 시 현장 분위기에 반영됩니다.`,
        });
      } else {
        addMsg({ role: "assistant", text: "사진 분석 결과가 비어있습니다. 사진 없이 진행됩니다." });
      }
    } catch (err) {
      console.error("analyze error:", err);
      addMsg({ role: "assistant", text: "사진 분석 실패. 사진 없이 진행됩니다." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearScenePhotos = () => {
    setScenePhotos([]);
    setPhotoContext("");
  };

  const runDiagnose = async (text, keyword) => {
    setDiagLoading(true); setDiagResult(null);
    try {
      const res  = await fetch("/api/diagnose", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogText: text, keyword: keyword || "" }) });
      const data = await res.json();
      if (data?.result) setDiagResult(data.result);
    } catch (_) {} finally { setDiagLoading(false); }
  };

  const generate = async (treatmentId, region, blogType = "review", targetId = "consult", overrideTitle = null, treatmentName = "", hallName = "", intentId = "") => {
    if (isGenerating.current) return;

    // [v60] quota spine — 생성 시작 전 차단 (정책: quota는 '생성 횟수' 기준이므로 발행이 아닌 생성 진입에서 막아야 함)
    //   미로그인 → 로그인 모달 / 비활성 → 비활성 모달 / 한도초과 → 한도초과 모달
    //   owner / 정상 → 통과. helper·fallback 모두 baseline 기준이라 check-quota 한 곳만 보면 됨.
    if (!authChecked) {
      addMsg({ role: "coach", text: "세션 확인 중입니다. 잠시 후 다시 시도해주세요." });
      return;
    }
    if (!authUserId) {
      setQuotaModal({ type: "login_required" });
      return;
    }
    try {
      const { status: cqStatus, json: cqJson } = await generateApi.checkGenerateQuota(authUserId);
      if (cqStatus === 404 || cqJson.reason === "ACCOUNT_NOT_FOUND") {
        setQuotaModal({ type: "not_found", detail: cqJson });
        return;
      }
      if (cqJson.reason === "ACCOUNT_INACTIVE") {
        setQuotaModal({ type: "inactive", detail: cqJson });
        return;
      }
      if (cqJson.allowed === false && cqJson.reason === "QUOTA_EXCEEDED") {
        setQuotaInfo(cqJson);
        goCoachBg(); // [v61] 모달 배경 = 발행코치(글 작성하기) 화면으로 통일
        setQuotaModal({ type: "quota_exceeded", detail: cqJson });
        return;
      }
      if (cqJson.allowed !== true) {
        addMsg({ role: "coach", text: `생성 권한 확인 실패: ${cqJson.reason || "UNKNOWN"}` });
        return;
      }
      setQuotaInfo(cqJson); // 헤더·남은건수 최신화
    } catch (e) {
      console.error("[check-quota:generate] network error:", e);
      addMsg({ role: "coach", text: `생성 권한 확인 네트워크 오류: ${e.message || e}` });
      return;
    }

    isGenerating.current = true;
    setLoading(true);
    setStage("generating");
    // [v111] 새 글 생성 시작 → 동작감지 체크리스트 플래그 초기화.
    setEverCopied(false); setNaverVisited(false); setPhotoToolUsed(false);

    // draft 저장 (이어쓰기용) — Supabase stores.current_draft
    try {
      const treatment_ = activeTreatments.find(t => t.id === treatmentId);
      const { saveDraft } = await import("../lib/store/profile");
      await saveDraft({
        treatmentId, treatmentName: treatment_?.name || "",
        region, blogType, targetId,
        savedAt: new Date().toISOString(),
      });
    } catch (_) {}

    // treatmentId로 못 찾으면 treatmentName으로 재검색 (id 불일치 방어)
    // [MultiDeptMenu] 병원 다중과 = 전 진료과 통합 마스터에서 먼저 탐색(__dept 보유).
    //   단일과·비병원은 hospitalMasterTreatments === masterMenus → 기존과 동일 결과.
    let treatment   = hospitalMasterTreatments.find(t => t.id === treatmentId)
                   || hospitalMasterTreatments.find(t => t.name === treatmentName)
                   || activeTreatments.find(t => t.id === treatmentId)
                   || activeTreatments.find(t => t.name === treatmentName);

    // 활성 업종에서도 못 찾으면 전체 업종에서 재검색 (업종 자동 전환 케이스 대응)
    if (!treatment) {
      const ALL_TREATMENTS_FLAT = [
        ...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS,
        ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS,
        ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...PULMO_TREATMENTS, ...CARD_TREATMENTS, ...ENDO_TREATMENTS, ...GENERAL_V2_TREATMENTS,
        // [2026-07-13] derma 누락 복구 — FLAT에 DERMA_TREATMENTS 미포함이었음(v159 누락군과 동일 패턴).
        //   업종 자동 전환 시 derma treatment id fallback 미검색 → keyword="" → save-generated 400 원인.
        ...OBGYN_TREATMENTS, ...DERMA_TREATMENTS, ...PAIN_TREATMENTS, ...RADIO_TREATMENTS, ...NEURO_TREATMENTS,
        ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS,
        // [v159] 누락 복구 — 비의료 3종(legal/cafe/restaurant) 추가. allT(상단)·treatmentData와 정합.
        //   legal id fallback 미검색 → treatment=undefined → keyword="" → save-generated 400 원인.
        // [v10] bedding(이브자리 침구) 추가 — 동일 정합.
        ...CAFE_TREATMENTS, ...KINDERGARTEN_TREATMENTS, ...FISHING_TREATMENTS, ...RESTAURANT_TREATMENTS, ...CHINESE_TREATMENTS, ...KOREAN_TREATMENTS, ...SNACK_TREATMENTS, ...JAPANESE_TREATMENTS, ...WESTERN_TREATMENTS, ...CHICKEN_TREATMENTS, ...MEAT_TREATMENTS, ...LEGAL_TREATMENTS, ...BEDDING_TREATMENTS, ...LAWYER_TREATMENTS, ...DAYCARE_TREATMENTS, ...HOMECARE_TREATMENTS, ...FUNERAL_TREATMENTS, ...TAX_TREATMENTS, ...LABOR_TREATMENTS, ...FLOWER_TREATMENTS, ...WELFARECARE_TREATMENTS, ...SENIORGOODS_TREATMENTS, ...ADMIN_TREATMENTS, ...REALESTATE_TREATMENTS, ...CLEANING_TREATMENTS, ...MOVING_TREATMENTS, ...INTERIOR_TREATMENTS, ...GROUT_TREATMENTS, ...COATING_TREATMENTS, ...SYSTEMAIR_TREATMENTS, ...AIRCLEAN_TREATMENTS, ...SCREEN_TREATMENTS, ...PESTCONTROL_TREATMENTS, ...BUILDINGCLEAN_TREATMENTS, ...BIRDCONTROL_TREATMENTS, ...TANKCLEAN_TREATMENTS, ...LEAKDETECT_TREATMENTS, ...SEWER_TREATMENTS, ...PLUMBING_TREATMENTS, ...BOILER_TREATMENTS, ...HOMEFIX_TREATMENTS, ...ELECTRICREPAIR_TREATMENTS, ...SINKREPAIR_TREATMENTS, ...BATHROOM_TREATMENTS, ...DOBAE_TREATMENTS, ...FLOORING_TREATMENTS, ...FILM_TREATMENTS, ...DOOR_TREATMENTS, ...WATERPROOF_TREATMENTS, ...PAINT_TREATMENTS, ...TILE_TREATMENTS, ...WINDOW_TREATMENTS, ...DEMOLITION_TREATMENTS, ...LIGHTING_TREATMENTS, ...FURNITURE_TREATMENTS, ...SHAMAN_TREATMENTS,
      ];
      treatment = ALL_TREATMENTS_FLAT.find(t => t.id === treatmentId)
               || ALL_TREATMENTS_FLAT.find(t => t.name === treatmentName);
    }

    // ★ [MultiDeptMenu] 생성 엔진 = 선택된 메뉴의 소속 진료과. 사용자는 엔진을 고르지 않는다.
    //   우선순위: treatment.__dept(통합마스터 유래) > deptOfMenu(메뉴명 역인덱스) > CURRENT_INDUSTRY(폴백)
    //   단일과·비병원: __dept 없음 + deptOfMenu → CURRENT_INDUSTRY → 기존 동작 100% 동일.
    const _genIndustry = (treatment && treatment.__dept)
                      // [TREATMENT-OWNER-ROUTING-FIX-01 · S188] 선택 확정된 treatment 의 소유 업종을 채택.
                      //   근거(실측): treatment.industry 선언분 1074건 전수 원본 배열 owner 와 일치(불일치 0).
                      //   미선언 객체는 아래 폴백 그대로 → 기존 동작 무변화(회귀 0).
                      //   __dept 최우선 유지 → 병원 다중과 경로 영향 0.
                      || treatment?.industry
                      || deptOfMenu(treatment?.name || treatmentName)
                      || CURRENT_INDUSTRY;

    // 최종 방어: 그래도 없으면 최소 program 객체 만들기
    if (!treatment && (treatmentId || treatmentName)) {
      treatment = {
        id: treatmentId || "unknown",
        // [v159] 의료 전용 "안과 진료" 제거 → 업종 중립. name 비면 빈 문자열(서버 publishGate가 차단).
        name: treatmentName || treatmentId || "",
        cat: "기타",
        industry: _genIndustry,
        titlePatterns: ["{region} {name} 후기"],
        keywords: [treatmentName || treatmentId],
        compareWith: "",
      };
    }
    const target      = CLINIC_TARGETS.find(t => t.id === targetId);
    const blogTypeObj = CLINIC_BLOG_TYPES.find(b => b.id === blogType);

    addMsg({ role: "loading", text: `${region} ${treatment?.name} 블로그 작성 중... (약 30~60초)` });

    try {
      // [v103] 4필드 연결 — 실사업장 기반 생성 (정보형 placeholder 제거 + publishGate.storeNameOk).
      //   출처 = hubStore (SoT). storeName/repRegion 필수, directorName/specialty 선택(빈값 OK·스키마 변경 불필요).
      //   storeName 빈값이면 서버 publishGate가 정상 차단 → {병원명} 노출 방지.
      const _gStore = hubStore || {};
      const _storeName     = (_gStore.store_name    || "").trim();
      const _repRegion     = (_gStore.region        || region || "").trim();
      const _directorName  = (_gStore.director_name || "").trim();
      const _specialty     = (_gStore.specialty     || "").trim();
      // [v-loc] 위치 공통화 — hubStore 위치 5필드를 페이로드로 실어 보냄(전 업종 후단 LocationBlock용).
      const _locAddress    = (_gStore.address       || "").trim();
      const _locMapGuide   = (_gStore.map_guide     || "").trim();
      // [세션54] transit 폴백 — 공통 방문정보(visit_info.transit) 입력분도 위치블록에 반영.
      //   '찾아오시는 길' 입력 은퇴(v127) 이후 신규 매장은 top-level transit이 비어 있다.
      //   우선순위: top-level(구 입력) → visit_info(신 입력). 기존 계정 동작 무변경.
      const _locTransit    = ((_gStore.transit || "").trim())
                          || ((_gStore.visit_info && _gStore.visit_info.transit) || "").trim();
      // [세션54] parking 동형 폴백 — parking_info 은퇴(v127) → parkingOps가 실입력 경로.
      const _locParkingOps = ((_gStore.visit_info && _gStore.visit_info.parkingOps) || "").trim();
      const _locBuilding   = (_gStore.building_desc || "").trim();
      const _locParking    = ((_gStore.parking_info || "").trim()) || _locParkingOps;
      // [세션37][STEP1] 방문정보 전달 전용 — hubStore.visit_info를 페이로드로 실어 보냄.
      //   ⚠ 전달만. 프롬프트/엔진은 아직 이 값을 사용하지 않음(STEP2에서 배선). FREEZE 무손상.
      //   빈 객체여도 무해(핸들러 미사용). 가격 등 개별 필드 정책은 STEP2 이후 확정.
      const _visitInfo     = (_gStore.visit_info && typeof _gStore.visit_info === "object") ? _gStore.visit_info : {};

      // [D-4-4] 생성 신원 토큰 — 서버 getStoreRuntime(req) 가 account 해석에 사용.
      //   saveGenerated(gToken)와 동일 소스(supabase.auth.getSession). 신규 인증 로직 없음.
      //   미로그인이면 _genToken=null → postGenerate 헤더 미부착 → 서버 익명(store=null). 생성은 정상.
      const { data: _genSess } = await supabase.auth.getSession();
      const _genToken = _genSess?.session?.access_token || null;

      // [FUNERAL-HALL-IDENTITY-MERGE-01] 선택 확정 식별자. name 이 일치할 때만 살아난다.
      //   미선택·수동입력·재생성(hallName="") → null → 서버는 종전 폴백 경로로 간다.
      const _pickedHall = getPickedHall(hallName);

      const { ok: _genOk, data } = await generateApi.postGenerate(_genToken, {
          target, program: treatment, blogType: blogTypeObj,
          userRegion: region, userMemo: "", overrideTitle,
          // [WIRING-01C] 장례식장명 — funeral(cat="장례식장")에서만 값 존재. 그 외 전 업종 "".
          //   서버 generateFuneral.js:200 hallName 수신부는 기존 구현 그대로(백엔드 무수정).
          //   빈 문자열이면 splitRegionHall 폴백 → 현행 동작과 동일.
          hallName,
          // [FUNERAL-HALL-IDENTITY-MERGE-01] 지역 식별자 — 동명 시설 식별 전용. 본문 미노출.
          //   ★ hallName 에 섞지 않는 이유: hallName 은 제목·본문 실명·해시태그·이미지 alt 에
          //     그대로 쓰인다. 지역을 붙이면 "경상북도 상주시 제일장례식장"이 본문에 노출된다.
          hallCtpv:    _pickedHall ? _pickedHall.ctpv : "",
          hallSigungu: _pickedHall ? _pickedHall.sigungu : "",
          // [WIRING-03] INTENT id — intents/*.js 정의 cat 에서만 값 존재. 그 외 전 업종 "".
          //   서버 generateFilm.js 는 값이 있으면 조회, 없는 id 면 400. 조용한 폴백 없음.
          intentId,
          // [v103] 실사업장 4필드 — 정보형 생성/발행 게이트용
          storeName:    _storeName,
          // [v77] 제목 끝 상호 표시 토글 — store_profiles.title_suffix_on. 서버(핸들러)가 resolveTitleSuffix로 방어.
          titleSuffixOn: !!(_gStore.title_suffix_on),
          repRegion:    _repRegion,
          directorName: _directorName,
          specialty:    _specialty,
          // [v-loc] 위치 5필드 — 전 업종 핸들러가 후단 LocationBlock에 사용. 빈값이면 블록 미생성.
          address:       _locAddress,
          map_guide:     _locMapGuide,
          transit:       _locTransit,
          building_desc: _locBuilding,
          parking_info:  _locParking,
          // [세션37][STEP1] 방문정보 전달 — 엔진/프롬프트는 아직 미사용(STEP2 배선 전까지 무영향).
          //   전 업종 공통. 서버 핸들러가 읽지 않으면 그냥 무시됨 → 현재 출력 변화 0. FREEZE 유지.
          visit_info:    _visitInfo,
          // treatment.industry 없으면 DENTAL_TREATMENTS 포함 여부로 판단
          // ★ [MultiDeptMenu] 선택 메뉴의 소속 진료과로 엔진 자동 결정. 단일과=CURRENT_INDUSTRY와 동일.
          industry: _genIndustry,
          // Phase E — 어느 store에서 생성됐는지 추적 (Phase F generated_posts insert용)
          storeId: currentStore?.id || null,
          // ★ photoContext — 사진 업로드 시 analyze 결과 주입 (scene 강화)
          ...(photoContext && { photoContext }),
          // ★ Phase 9.5 — restaurant 전용: 상황·목적 전달
          // (treatment 객체에 situation/purpose가 들어 있으면 그대로 전달)
          ...((CURRENT_INDUSTRY === "restaurant" || CURRENT_INDUSTRY === "chinese" || CURRENT_INDUSTRY === "korean" || CURRENT_INDUSTRY === "snack" || CURRENT_INDUSTRY === "japanese" || CURRENT_INDUSTRY === "western" || CURRENT_INDUSTRY === "chicken") && {
            situation: treatment?.situation || "",
            purpose:   treatment?.purpose   || "",
          }),
          // ★★ [Western Purpose Engine · 정식 코드화 · 세션46] Pilot window 스위치 → 엔진 랜덤 선택 전환.
          //   판정: Purpose 3회+ 통과 / 메뉴 고정 / menu-first 해소 / 방문정보 편입 정상 → 코드화.
          //   설계: purpose는 사용자 선택 UI가 아니라 엔진이 랜덤 결정(발행 다양성·survival 분산). window.__PURPOSE_PILOT가
          //         하던 값 공급 역할을 랜덤 선택이 대신함. western일 때 항상 mode="purpose"(양식=목적 중심 기본 출력).
          //   소스: WESTERN_PURPOSES / WESTERN_SITUATIONS (western-data export, 엔진 4파일 무수정).
          //   commercial/personal 레일은 handler 기본값·명시요청으로 보존(회귀·롤백 유지). 다른 6개 식당엔진 무영향.
          ...((CURRENT_INDUSTRY === "western") && {
            mode:      "purpose",
            purpose:   (Array.isArray(WESTERN_PURPOSES) && WESTERN_PURPOSES.length)
                         ? WESTERN_PURPOSES[Math.floor(Math.random() * WESTERN_PURPOSES.length)]
                         : "데이트",
            situation: (Array.isArray(WESTERN_SITUATIONS) && WESTERN_SITUATIONS.length)
                         ? WESTERN_SITUATIONS[Math.floor(Math.random() * WESTERN_SITUATIONS.length)]
                         : "",
          }),
          // [Pilot Gate 제거 2026-07-14] dental — V2 승격 완료. engineBootstrap register("dental") → handleDentalV2 직결.
          //   근거: v1/v2 메뉴 SoT 동일(v2가 dental-data.js 재활용) → 스위치 불필요. mode 미주입.
          //   치과는 treatment 중심 → decisionAxis 미도입, 목적축 7섹션 유지. 롤백 = engineBootstrap 1줄 원복.
          // [Pilot Gate 제거 2026-07-13] eye — V2 승격 완료. engineBootstrap register("eye") → handleEyeV2 직결.
          //   근거: v1(22종 후기형) ≠ v2(14종 정보형). 메뉴 SoT가 달라 스위치 불가(ent 원칙).
          //   mode 주입 불필요(스위치 무의미). ent/urology/clinic/derma와 동형. 롤백 시 engineBootstrap 1줄만 원복.
          // [Pilot Gate 제거 2026-07-13] clinic — V2 승격 완료. engineBootstrap register("clinic") → handleClinicV2 직결.
          //   mode 주입 불필요(스위치 무의미). derma와 동형. 롤백 시 engineBootstrap 1줄만 원복.
          // [Pilot Gate 제거 2026-07-14] neuro — V2 승격 완료. engineBootstrap register("neuro") → handleNeuroV2 직결.
          //   근거: 전용 v2-data 부재 → v1 neuro-data.js(24종) 재활용 → 메뉴 SoT 동일 → 치과형 승격(gastro 동형).
          //   mode 주입 불필요(스위치 무의미). 롤백 시 engineBootstrap 1줄만 원복(v1 4파일 무손상).
          // [Pilot Gate 제거 2026-07-14] pain — V2 승격 완료. engineBootstrap register("pain") → handlePainV2 직결.
          //   근거: 전용 v2-data 부재 → v1 pain-data.js(28종) 재활용 → 메뉴 SoT 동일 → 치과형 승격(gastro/neuro 동형).
          //   mode 주입 불필요(스위치 무의미). 롤백 시 engineBootstrap 1줄만 원복(v1 4파일 FREEZE 무손상).
          // ★★ [Pilot Gate · Radio Purpose Engine v2 · 영상의학과] 검증 전용 런타임 스위치 — 삭제 시 이 블록만 제거하면 원복.
          //   ON 방법(콘솔): window.__RADIO_V2_PILOT = { on:true }
          //   OFF: window.__RADIO_V2_PILOT = null  (또는 on:false)
          //   radio + 스위치 ON 일 때만 mode="purpose" 주입 → engineBootstrap radio 래퍼가 generateRadioV2로 위임.
          //   기본값(스위치 OFF)=mode 미주입 → v1(검사형 generateRadio) 그대로. v1 출력 무손상 → A/B 보존.
          //   ⚠ window 변수라 F5 시 사라짐. 스위치 설정 → (새로고침 없이) → 곧바로 생성.
          //   ★ radio 고유 축: '치료 판단' 아님 → '검사 선택 기준(examDecision) + 판독 위임(resultReading)'.
          //   radio-v2는 radio-data 전 검사(13종) 사용 — 화이트리스트 없음(전부 영상의학과 자산).
          //   ★ 판정은 처음부터 _genIndustry(8482) — pain 세션과 동일 방침.
          ...((_genIndustry === "radio"
                && typeof window !== "undefined"
                && window.__RADIO_V2_PILOT
                && window.__RADIO_V2_PILOT.on) && {
            mode: "purpose",
          }),
          // ★★ [Gastro V2 승격 완료 · 2026-07-14] 소화기내과 Purpose Engine v2 = 기본 엔진.
          //   __GASTRO_V2_PILOT 런타임 스위치 제거됨. mode 주입 불필요 —
          //   engineBootstrap register("gastro", handleGastroV2) 로 직결. 플래그 없이 일반 발행.
          //   ★ 치과형 승격: 전용 v2-data 없음 → v1 gastro-data(22종) 재활용 → 메뉴 SoT 동일 → 메뉴 배선 무변경.
          //   ★ gastro 고유 축: decisionAxis 분기 — exam(6종)=검사 선택 기준 / disease(16종)=치료 결정 기준.
          // ★★ [General V2 승격 완료 · 2026-07-14] 내과 Purpose Engine v2 = 기본 엔진.
          //   __GENERAL_V2_PILOT 런타임 스위치 제거됨. mode 주입 불필요 —
          //   engineBootstrap register("general", handleGeneralV2) 로 직결. 플래그 없이 일반 발행.
          //   ★ general 고유 축: 1차 진료 허브 — 증상/검진 이상 → 기본검사 → 원인 범위 → 전문내과 연계 판단.
          //     질환 확정형 서술 금지(referOnlyKeywords QC). 당뇨/갑상선=endo · 고혈압/심장=card ·
          //     천식/폐렴=pulmo · 위장=gastro 로 이관 — 전문내과 V2와 역할 중복 제거.
          // ★★ [Ortho V2 승격 완료 · 2026-07-12] 정형외과 Purpose Engine v2 = 기본 엔진.
          //   __ORTHO_V2_PILOT 런타임 스위치 제거됨. mode 주입 불필요 —
          //   engineBootstrap register("ortho", handleOrthoV2) 로 직결. 플래그 없이 일반 발행.
          // ★★ [Pilot Gate · Restaurant Visit Pilot] 검증 전용 런타임 스위치 — 삭제 시 이 블록만 제거하면 원복.
          //   ON 방법(콘솔): window.__RESTAURANT_VISIT_PILOT = { on:true }
          //   OFF: window.__RESTAURANT_VISIT_PILOT = null  (또는 on:false)
          //   restaurant + 스위치 ON 일 때만 visitPilot:true + visitInfo(카멜) 주입.
          //     → generateRestaurant.js가 req.body에서 수신 → buildVisitGuide로 A~D scene 삽입.
          //   OFF(기본값)=미주입 → 기존 경로 100% 무변경(세션40 스모크 T1~T3 정합). FREEZE 유지·즉시 롤백.
          //   ⚠ visitInfo 소스 = _visitInfo(line~10171, hubStore.visit_info, 세션32 10필드). visit_info(스네이크)는
          //      세션37 전달 전용 잔존 — 핸들러 미사용. 본 게이트는 카멜 visitInfo로 세션40 핸들러 계약 정합.
          //   ⚠ window 변수라 F5 시 사라짐. 스위치 설정 → (새로고침 없이) → 곧바로 생성.
          ...((CURRENT_INDUSTRY === "restaurant"
                && typeof window !== "undefined"
                && window.__RESTAURANT_VISIT_PILOT
                && window.__RESTAURANT_VISIT_PILOT.on) && {
            visitPilot: true,
            visitInfo:  _visitInfo,
          }),
          // ★★ [Pilot Gate · Korean Visit Pilot · 세션42] 검증 전용 런타임 스위치 — 삭제 시 이 블록만 제거하면 원복.
          //   ON 방법(콘솔): window.__KOREAN_VISIT_PILOT = { on:true }
          //   OFF: window.__KOREAN_VISIT_PILOT = null  (또는 on:false)
          //   korean(실사용 엔진) + 스위치 ON 일 때만 visitPilot:true + visitInfo(카멜) 주입.
          //     → generateKorean.js가 req.body 수신 → buildCommercialKoreanPrompt common에 buildVisitGuide 합성.
          //   OFF(기본값)=미주입 → 기존 경로 100% 무변경. FREEZE 유지·즉시 롤백.
          //   ⚠ 세션41 실측: restaurant는 레거시(맵꼬 분식 1개), 한식 실사용=korean 독립 엔진.
          //      관측 대상은 korean이므로 엔진별 독립 토글 신설(restaurant 게이트와 A/B 격리).
          //   ⚠ visitInfo 소스 = _visitInfo(line~10171, hubStore.visit_info, 세션32 10필드) — restaurant 게이트와 동일.
          //   ⚠ window 변수라 F5 시 사라짐. 스위치 설정 → (새로고침 없이) → 곧바로 생성.
          ...((CURRENT_INDUSTRY === "korean"
                && typeof window !== "undefined"
                && window.__KOREAN_VISIT_PILOT
                && window.__KOREAN_VISIT_PILOT.on) && {
            visitPilot: true,
            visitInfo:  _visitInfo,
          }),
          // [Legal V2 기본화 · 세션48] Pilot 승격 확정 → lawyer는 항상 V2(검색자 고민 우선) 경로.
          //   V2 구조: 상황공감→지금뭘→상담확인→절차→마무리. V1(절차 나열)은 제거됨.
          ...(CURRENT_INDUSTRY === "lawyer" && {
            mode: "concern",
          }),
        });
      if (!_genOk) {
        // [menu-map] 메뉴 매칭 실패(422) → 코드 대신 사용자 친절 메시지. (엔진 국밥 무음폴백 제거 대응)
        //   catch 블록이 removeLoading/stage복귀/버튼잠금해제 처리 → 무한대기 없음. 여기선 메시지만 친절화.
        if (data?.error === "MENU_MAPPING_FAILED") {
          throw new Error(data.message || "선택한 메뉴를 인식하지 못했습니다. 메뉴를 다시 선택해 주세요.");
        }
        // [MISMATCH-GUARD-01] 장례식장 실명 요청 미매칭(422) → 영문 코드 노출 금지, message만 표시.
        //   MENU_MAPPING_FAILED와 동형. catch가 removeLoading/stage/버튼잠금 복구 처리.
        if (data?.error === "HALL_FACTS_NOT_FOUND") {
          throw new Error(data.message || "등록된 장례식장 정보와 입력하신 이름이 일치하지 않습니다. 업체정보에 등록한 이름과 똑같이 입력해 주세요.");
        }
        throw new Error(data.error || "생성 중 오류가 발생했습니다.");
      }

      // 응답 도착 — 진행감 컴포넌트가 빠르게 마무리되도록 신호.
      // 마무리 콜백 안에서 실제 결과 전환을 수행 → "AI가 끝까지 검수한 느낌"
      genProgressBus.signalDone(async () => {
        removeLoading();
        // 메타 보강 — publish_history 매핑용 (generateXxx.js freeze 우회)
        // [fix] 제목 추출 정석화 — API가 주는 data.title을 1순위로 신뢰.
        //   (발행 경로 result.title 우선과 동일 패턴으로 통일. 생성/발행 불일치 해소.)
        //   textMarkdown # 헤더에 제목을 심는 우회 불필요 → 본문 h1 중복·textMarkdown 오염 방지.
        //   title 없는 엔진만 헤더/첫줄 fallback.
        let extractedTitle = (data.title || "").trim();
        if (!extractedTitle) {
          const titleMatch = (data.textMarkdown || data.text || "").match(/^#{1,6}\s+(.+)$/m);
          if (titleMatch) extractedTitle = titleMatch[1].trim();
        }
        // 2차 fallback: 그래도 없으면 평문 첫 비어있지 않은 줄 사용
        if (!extractedTitle) {
          const firstLine = (data.text || data.textMarkdown || "")
            .split("\n").map(l => l.trim()).find(l => l && !l.startsWith("#"));
          if (firstLine) extractedTitle = firstLine.slice(0, 60);
        }
        // [세션49] 상조 상품 안내 블록 삽입 — funeral + 상품 존재 시만. Engine FREEZE 무손상(프론트 후처리).
        //   출력 위치: 본문 ↓ 상품안내 ↓ (위치블록) ↓ 해시태그. 상품 없으면 원문 그대로(부작용 0).
        if (CURRENT_INDUSTRY === "funeral") {
          const _fProducts = (_gStore && _gStore.visit_info && _gStore.visit_info.funeralProducts) || [];
          const _fPhone = (_gStore && _gStore.visit_info && _gStore.visit_info.phone)
            || (_gStore && _gStore.phone) || "";
          const _fBlock = buildFuneralProductBlock(_fProducts, _fPhone);
          if (_fBlock) {
            if (data.text)         data.text         = insertFuneralProductBlock(data.text, _fBlock);
            if (data.textMarkdown) data.textMarkdown = insertFuneralProductBlock(data.textMarkdown, _fBlock);
            if (data.content)      data.content      = insertFuneralProductBlock(data.content, _fBlock);
          }
        }
        setResult({
          ...data,
          treatment,
          region,
          // 명시적 메타 (publish.js INSERT용)
          // [v136] 표시명 = menu/menuRef 우선(restaurant placeholder name "이 분식집" 오염 차단). id는 매칭용 유지.
          treatmentId:   treatment?.id   || treatmentId   || "",
          treatmentName: treatment?.menu || treatment?.menuRef || treatment?.name || treatmentName || "",
          keyword:       treatment?.menu || treatment?.menuRef || treatment?.name || treatmentName || "",
          activeKeyword: treatment?.menu || treatment?.menuRef || treatment?.name || treatmentName || "",
          fullKeyword:   `${region} ${treatment?.menu || treatment?.menuRef || treatment?.name || treatmentName || ""}`.trim(),
          title:         extractedTitle,
          storeId:       currentStore?.id || null,
        });
        // ── 생성이력 저장 (fire-and-forget, UX 비차단) ──
        //   publish_history에 publish_status='generated' insert → 달력 🔵 / 최근발행 / 생성글 목록.
        //   quota 미차감(check-quota는 'published'만 집계). 실패해도 생성 흐름 영향 없음.
        (async () => {
          try {
            const { data: gSess } = await supabase.auth.getSession();
            const gToken = gSess?.session?.access_token;
            if (!gToken) return; // 미로그인 → 저장 skip (생성 자체는 정상)
            // [v159] keyword 다단 fallback — save-generated 400("필수 필드 누락: keyword") 구조적 차단.
            //   증상: 제목엔 "상속등기"가 들어가는데(extractedTitle) treatment.name/treatmentName이 비어
            //         keyword=""로 떨어지는 경로(달력 prefill 등) 존재. legal에서 발현.
            //   해법: menu/menuRef/name/treatmentName → 없으면 extractedTitle → treatment_id → "무제목" 순.
            const _kwBase =
                 treatment?.menu || treatment?.menuRef || treatment?.name
              || treatmentName  || (extractedTitle || "").split("|")[0].trim()
              || treatment?.id  || treatmentId || "생성글";
            await generateApi.saveGenerated(gToken, {
                industry:       _genIndustry,   // [INDUSTRY-SAVE-CONTAMINATION-01] 대표업종 아닌 글별 실제 진료과 저장
                keyword:        _kwBase,
                title:          extractedTitle || ("제목없음_" + Date.now()),
                content:        data.text || data.textMarkdown || "",
                region,
                treatment_id:   treatment?.id   || treatmentId   || "",
                treatment_name: _kwBase,
                active_keyword: _kwBase,
                full_keyword:   `${region} ${_kwBase}`.trim(),
                text_markdown:  data.textMarkdown || "",
                char_count:     (data.text || "").length,
                qc_score:       data.seoScore ?? data.score ?? 0,
                model:          data.model,
                store_id:       currentStore?.id || null,
                // [CORE-KEYWORD-HALL-01] cluster = 장례식장 선택 글의 hallName 을 URL 등록 시점까지
                //   전달하는 내부 브리지. 컬럼명과 의미가 다르다(기존 전량 NULL·미사용 컬럼 재사용 · DB 변경 0).
                //   hallName 은 카탈로그 확정값 그대로 — 접두 제거·접미 추가 금지.
                //   장례식장 글이 아니면 hallName="" → undefined → 미전송(기존 동작 무변화).
                cluster:        hallName || undefined,
            }).then(() => {
              // 저장 성공 → 허브 갱신(달력/목록 즉시 반영). 미인증/실패 시 조용히 skip.
              if (authUserId) fetchHub();
            });
          } catch (e) {
            console.warn("[save-generated] skip:", e?.message);
          }
        })().catch((e) => console.warn("[save-generated] skip:", e?.message));
        setUploadedImgs({});
        setDiagResult(null);
        // publish state 리셋
        setPublishUrl("");
        setPublishStatus("idle");
        setPublishError("");
        // ★ photoContext 초기화 (다음 글에 재사용 방지)
        setScenePhotos([]);
        setPhotoContext("");
        setStage("result");
        switchTab("blog");
        try {
          const { clearDraft } = await import("../lib/store/profile");
          await clearDraft();
        } catch (_) {}

        const cc = calcValidCharCount(data.text);
        addMsg({
          role: "assistant",
          text: `✅ ${region} ${treatment?.name} 블로그 생성 완료!\n\n📝 ${cc.toLocaleString()}자 · 6섹션\n오른쪽 패널에서 확인하세요.`,
          options: [
            { label: "📋 전체 복사", action: async () => {
              const ok = await copyPlainText(data.text || data.textMarkdown);
              if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
              else { alert("복사에 실패했습니다. 본문을 직접 드래그해 복사해주세요."); }
            }},
            { label: "🔄 재생성",    action: () => generate(treatmentId, region, blogType, targetId) },
            { label: "🆕 새 블로그", action: () => { setResult(null); setStage("welcome"); }},
          ],
        });
        runDiagnose(data.textMarkdown || data.text, treatment?.name);

        // 진행감 마무리 + 결과 표시 끝났으니 잠금 해제
        setLoading(false);
        isGenerating.current = false;
      });

    } catch (e) {
      removeLoading();
      setStage("welcome");
      addMsg({ role: "assistant", text: `❌ 오류: ${e.message}\n\n다시 시도해주세요.` });
      setLoading(false);
      isGenerating.current = false;
    }
  };

// 자연어에서 타겟·유형 자동 감지
function parseTargetFromText(text) {
  if (/비교|vs|차이|어디가|어느|몇 군데|여러/.test(text)) return "compare";
  if (/결과|효과|변화|후기|받았|했어|이후|달|주차|경과/.test(text)) return "result";
  return "consult";
}

function parseBlogTypeFromText(text) {
  if (/비교|vs|차이|어디가|어느/.test(text)) return "compare";
  if (/상담|병원에서|원장님|물어봤|질문/.test(text)) return "consult";
  return "review";
}

const BLOGTYPE_LABEL = { review: "후기형", consult: "상담형", compare: "비교형" };
const BLOGTYPE_DESC  = { review: "결과 중심 글", consult: "고민 중심 글", compare: "선택 과정 글" };
const TARGET_LABEL   = { consult: "상담 고민형", result: "시술 후기형", compare: "비교 탐색형" };

// ============================================================
// 시술 선택 보드 (우측 패널) — 카테고리별 그리드
// ============================================================
// CATS는 컴포넌트 상단에서 동적 계산 (선언은 파일 상단으로 이동됨)

// ── [FUNERAL-HALL-IDENTITY-MERGE-01] 장례식장 '선택 확정' 식별자 ──────────────
//   문제(S156 실측): 자동완성 후보는 ctpv/sigungu 를 알고 있는데 선택 순간 name 만 남았다.
//     → 생성 API 는 동명 시설(DB 21종/51행)을 식별하지 못한다.
//       종전 코드는 .limit(1) 로 아무거나 붙였고, 신규 코드는 AMBIGUOUS 로 주입을 포기한다.
//       어느 쪽도 정답이 아니다 — 사용자가 이미 고른 지역을 끝까지 들고 가야 한다.
//
//   ★ hallName 문자열에 지역을 섞지 않는다. hallName 은 본문 실명·제목·해시태그·이미지 alt
//     에 그대로 쓰이므로("서울특별시 중랑구 …" 노출) 식별자는 반드시 별도 필드여야 한다.
//   ★ TreatmentSelectBoard(선택) 와 Home(생성) 은 서로 다른 컴포넌트다. 5홉 prop 스레딩
//     (onComplete → analyzeKeyword → parsed → generate(8인자) → body) 대신 모듈 스코프 1개로
//     전달한다. generate() 시그니처 무변경 = 재생성·초안 등 타 호출부 영향 0.
//   ★ 안전장치: 저장된 name 과 실제 전송 hallName 이 정확히 같을 때만 식별자를 쓴다.
//     수동 편집·다른 시설 전환·재생성(hallName="") 은 자동으로 불일치 → 폐기된다.
let _funeralPickedHall = null;   // { name, ctpv, sigungu } | null

function setPickedHall(it) {
  _funeralPickedHall = it
    ? { name: String(it.name || ""), ctpv: String(it.ctpv || ""), sigungu: String(it.sigungu || "") }
    : null;
}

function getPickedHall(hallName) {
  const n = String(hallName || "").trim();
  if (!n || !_funeralPickedHall) return null;
  return _funeralPickedHall.name === n ? _funeralPickedHall : null;
}

function TreatmentSelectBoard({ treatments, cats, onSelect, onComplete, currentIndustry, initialTreatment, initialRep, initialSub, entryMode, storeInfo, onEditStore, isGenerating, onPickChange }) {
  // ★ Phase 9.5 — restaurant 업종은 카드 대신 4단 select UI 사용
  // PHILOSOPHY 2-1: 카드 클릭 ❌ / 검색 행동 조합 ⭕
  // [v135] 단, 달력 진입(entryMode="calendar")은 예외. 달력은 이미 메뉴가 정해진 상태이므로
  //   조합 select가 아니라 "프리선택된 카드 + 확인 후 작성하기" 흐름이 맞다. RestaurantSelector를
  //   우회하고 아래 공용 카드보드를 탄다(initialTreatment 프리필 + 작성하기 버튼). 직접작성은 그대로 조합 UI.
  if (currentIndustry === "restaurant" && entryMode !== "calendar") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto",
        background: "#f7f7fb", animation: "fadeIn .25s ease", padding: "12px" }}>
        <RestaurantSelector
          onChange={(sel) => {
            // sel = { program, region, situation, purpose }
            // virtualProgram을 onSelect로 전달 → 기존 흐름 재사용
            if (sel?.program) onSelect(sel.program);
          }}
        />
      </div>
    );
  }

  // [v94] prefill — 달력 진입 시 시술 자동 채움. 미전달이면 빈값(일반 직접작성, 기존 동작).
  const [picked, setPicked]       = useState(initialTreatment || null); // [v91] 선택된 시술
  const filtered = treatments; // [v92] 카테고리 필터 제거 — 전체 표시

  // [v99] A안 — 발행지역은 업체정보(1계정=1사업장=1지역전략)에서 자동 적용. 입력칸 제거.
  //   대표지역=storeInfo.region, 생활권=storeInfo.sub_region. 글생성에 자동 주입.
  const st = storeInfo || {};
  const storeRep  = (st.region || "").trim();
  const storeSub  = (st.sub_region || "").trim();
  const storeHours   = (st.business_hours || (st.visit_info && st.visit_info.businessHours) || "").trim();
  const storeParking = (st.parking_info || "").trim();
  const storeName    = (st.store_name || "").trim();
  // [v123] 생활권 순번 회전 — 콤마 목록을 글마다 1개씩 순환 사용(공릉→태릉→하계→월계→공릉…).
  //   목록 문자열을 키로 localStorage에 인덱스 보존(목록 변경 시 자연 리셋). 표시 region도 이번 차례로.
  const subRotList = tokenizeSubRegions(storeSub).subs;            // 회전 대상(역 제외)
  const subRotKey  = `${storeRep}|${subRotList.join(",")}`;        // 보존 키
  const subRotIdx  = (typeof window !== "undefined" && subRotList.length > 1)
    ? getSubRotIndex(subRotKey) : 0;                               // 다음 차례(미리보기용)
  const picked0 = pickSubRegion(storeRep, storeSub, subRotIdx, currentIndustry);  // [v-region] 업종 전략 주입
  const combinedRegion = picked0.region || storeRep;
  const hasRegion = combinedRegion.length > 0;
  // [WIRING-01C] 장례식장명 입력 — funeral + cat="장례식장" 카드 선택 시에만 노출·필수.
  //   ⚠ 게이트 기준을 cat으로 잡는 이유: 백엔드 resolveFuneralIntent(funeral-prompts.js:137
  //     HALL_INTENT_CATS=["장례식장"])와 동일 기준. id 기준으로 잡으면 프론트/백엔드 축이 갈라진다.
  //   ⚠ 다른 funeral 9종·타 업종은 isHall=false → 입력칸 미렌더 + hallName="" → 현행 출력 무변화.
  const [hallInput, setHallInput] = useState("");
  // [FUNERAL-PUBLIC-RUNTIME-INJECT-01] 장례식장 검색·선택.
  //   ★ 여기서 확정하는 것은 '공식 장례식장명' 하나뿐이다. 시설 Facts 는 저장하지 않는다 —
  //     생성 요청 시 서버(pages/api/generate.js)가 funeral_halls_public 에서 직접 읽는다.
  //   ★ [S158 폐기] 구 설계는 '선택 강제 아님 — 미수록 시설도 자유 입력 생성 가능'이었다.
  //     전제였던 '미수록 = 시설 정보 없는 일반 안내글'이 실측에서 깨졌다(S158). Facts 없이도
  //     주소·빈소 등급·조문객 수치·화장장 거리를 창작한 허위 시설 안내문이 나온다.
  //     → 현행: 자동완성 선택 필수. 미선택(hallPicked=null) 시 생성 차단(hallOk).
  const [hallAcItems, setHallAcItems] = useState([]);
  // [FUNERAL-HALL-IDENTITY-MERGE-01] 선택 확정 배지 상태. 값이 있으면 = 이번 생성 요청에
  //   지역 식별자가 살아 있다는 뜻이다. 장식이 아니라 상태 표시다.
  const [hallPicked, setHallPicked] = useState(null);   // { ctpv, sigungu } | null
  const hallAcTimer = useRef(null);
  const hallAcSeq = useRef(0);
  const closeHallAc = () => setHallAcItems([]);
  const onHallInput = (val) => {
    setHallInput(val);
    // ★ 수동 편집 = 선택 해제. 이름만 바뀌고 옛 지역이 남으면 다른 시설의 지역으로 조회된다.
    setHallPicked(null);
    setPickedHall(null);
    if (hallAcTimer.current) clearTimeout(hallAcTimer.current);
    const q = String(val || "").trim();
    if (q.length < 2) { closeHallAc(); return; }   // API 와 동일 기준(2자)
    const seq = ++hallAcSeq.current;
    hallAcTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/funeral-halls-search?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        if (seq !== hallAcSeq.current) return;     // 늦게 도착한 응답 폐기
        setHallAcItems(j && j.ok && Array.isArray(j.items) ? j.items : []);
      } catch { closeHallAc(); }                   // 실패해도 수동 입력 경로는 살아 있다
      // [FUNERAL-HALL-SEARCH-UX-01] 300 → 150ms. 1080건 규모라 서버 부담보다 체감 지연이 크다.
      //   ⚠ 0ms(무debounce) 금지 — 매 키스트로크 요청. 응답 역전은 hallAcSeq 가 이미 막는다.
    }, 150);
  };
  const pickHall = (it) => {
    setHallInput(it.name);                         // 공식명 확정 = 서버 조회 키
    // [FUNERAL-HALL-IDENTITY-MERGE-01] 지역 식별자 확정. name 만으로는 동명 시설을 못 가른다.
    setHallPicked({ ctpv: it.ctpv || "", sigungu: it.sigungu || "" });
    setPickedHall(it);
    hallAcSeq.current++;
    closeHallAc();
  };
  const isHall = currentIndustry === "funeral" && picked?.cat === "장례식장";
  // [FUNERAL-NOFACTS-NAMED-FABRICATION-01] 선택 강제 — 자동완성 미선택(hallPicked=null) 차단.
  //   근거(S158 실측): 실명 + hallFacts=null 경로가 주소·빈소 등급·조문객 수치·화장장 거리를
  //   전부 창작한 허위 시설 안내문을 생성했다. 자유 입력의 산출물은 오정보다.
  const hallOk = !isHall || (hallInput.trim().length > 0 && !!hallPicked);
  // [WIRING-03] INTENT 선택 — 글의 내용축. hallName 과 동일 패턴(특정 cat 에서만 값 존재).
  //   ⚠ 게이트는 하드코딩 cat 이 아니라 데이터다. intents/*.js 에 정의된 cat 만 목록이 나온다.
  //     미정의 cat(현재 싱크대필름 외 전부)은 intentList=[] → 셀렉터 미렌더 + intentId="" → 현행 출력 무변화.
  //   ⚠ 정의된 cat 은 선택 필수. 조용한 기본값 폴백을 두지 않는다(S137 계약) — 두면 반복 문제가 형태만 바꿔 남는다.
  const [intentPick, setIntentPick] = useState("");
  // [WIRING-03B] INTENT 축 = 허브 업종이 아니라 선택된 treatment 가 선언한 엔진 업종.
  //   근거(S139 실측): 프론트 currentIndustry="interior" / 서버 라우팅 업종="film" → 애초에 다른 축.
  //   우선순위: __dept(다중 시공분야 통합마스터가 주입) > industry(데이터 원본 선언) > currentIndustry(단일업종 폴백).
  //   ⚠ 달력 프리필 경로는 picked 자체가 원본 t(_raw 없음) → (picked?._raw || picked) 로 두 경로를 통일한다.
  //   ⚠ 하드코딩 매핑(interior→film) 금지. 게이트는 intents/*.js 정의 유무(데이터)로만 결정된다.
  const _pickedRaw = picked?._raw || picked;
  const intentIndustry = _pickedRaw?.__dept || _pickedRaw?.industry || currentIndustry;
  const intentList = getIntents(intentIndustry, picked?.cat);
  // [WIRING-03C] 0종=박스없음 / 1종=박스표시+자동선택(클릭 불필요) / 2종↑=직접선택 필수.
  //   ⚠ 자동선택은 "1종일 때만" 성립하는 파생값이다. 2종 이상에서 조용한 기본값 폴백은 두지 않는다(S137 계약 유지).
  //   ⚠ setIntentPick 을 건드리지 않는다 — state 를 쓰면 cat 전환 타이밍에 이전 cat 의 id 가 남는다.
  const intentAuto = intentList.length === 1 ? (intentList[0]?.id || "") : "";
  const intentValue = intentPick || intentAuto;
  const intentOk = intentList.length === 0 || !!intentValue;
  // [WIRING-03A] UI 노출용 최소 형태(label/question). axes 는 프롬프트 전용이라 여기로 내려오지 않는다.
  const intentOptions = listIntentOptions(intentIndustry, picked?.cat);
  // 메뉴(cat)를 바꾸면 이전 선택은 무효 — 다른 cat 의 intentId 가 남으면 서버가 400 을 낸다.
  useEffect(() => { setIntentPick(""); }, [picked?.id, currentIndustry]);
  const canGo = !!picked && hasRegion && hallOk && intentOk;
  const complete = () => {
    if (!canGo) return;
    // 회전 인덱스 확정·증가(증가 전 값으로 region 재산출 — 미리보기와 동일 보장).
    let useIdx = subRotIdx;
    if (subRotList.length > 1) { try { useIdx = bumpSubRotIndex(subRotKey); } catch {} }
    const finalRegion = pickSubRegion(storeRep, storeSub, useIdx, currentIndustry).region || storeRep;  // [v-region]
    // [WIRING-01C] 3번째 인자 = 사용자 입력 장례식장명(SoT). 비대상이면 항상 "".
    // [WIRING-03] 4번째 인자 = 선택한 INTENT id. 미정의 cat 이면 항상 "".
    if (onComplete) onComplete(picked, finalRegion, isHall ? hallInput.trim() : "", intentList.length ? intentValue : "");
  };

  // [v144] 업종별 항목 라벨 — lex().itemWord 단일 출처. restaurant=메뉴/legal=업무/의료=시술 자동.
  const _isRest   = currentIndustry === "restaurant";
  const _LX_ITEM  = lex(currentIndustry).itemWord;
  const L_ITEM    = _LX_ITEM;
  const L_ITEM2   = _isRest ? "메뉴"      : "주제";
  const L_LIST    = _LX_ITEM + " 목록";
  const L_EMOJI   = _isRest ? "🍽️"       : "💉";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#f7f7fb", animation: "fadeIn .25s ease" }}>

      {/* [v92] 카테고리 탭 제거 — 한 화면에 전체 시술 표시(필터 불필요) */}

      {/* [v94] 진입 경로 배지 — 달력에서 불러온 경우만 표시. 직접작성은 미표시(노이즈 최소). */}
      {entryMode === "calendar" && (
        <div style={{ margin: "12px 10px 0", padding: "14px 16px", borderRadius: 12,
          background: "linear-gradient(135deg,#eef4fd,#e3eefc)", border: "1.5px solid #b8d0f0",
          boxShadow: "0 2px 8px rgba(21,101,192,0.08)",
          display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 20, lineHeight: 1.2 }}>📅</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#1565C0" }}>
              오늘 계획된 {L_ITEM2}를 불러왔습니다.
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1976D2", lineHeight: 1.5 }}>
              {L_ITEM}을 확인 후 작성하세요. 다른 {L_ITEM2}로 쓰려면 <b style={{ color: "#1565C0" }}>아래 {L_LIST}에서 선택</b>하면 됩니다.<br />
              지역은 업체정보가 자동 적용됩니다.
            </span>
          </div>
        </div>
      )}

      {/* 본문 — 위: 시술 카드(발행비율설정과 동일한 4열 초소형) / 아래: 발행지역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px" }}>

        {/* ── 시술/메뉴 선택 (4열 작은 카드) ── */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6A1B9A", margin: "2px 2px 8px" }}>
          {L_EMOJI} {L_ITEM} 선택 {picked ? <span style={{ color: "#9C27B0" }}>· {picked.name} 선택됨</span> : <span style={{ color: "#bbb", fontWeight: 700 }}>(카드를 누르세요)</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          {filtered.map(t => {
            const on = picked && picked.id === t.id;
            return (
              <div key={t.id} onClick={() => { const _p = { id: t.id, name: (t.menu || t.menuRef || t.name), emoji: t.emoji, cat: t.cat, _raw: t }; setPicked(_p); if (onPickChange) onPickChange(t); }}
                title={`클릭하여 ${L_ITEM} 선택`}
                style={{ background: on ? "#F3E5F5" : "#fff", borderRadius: 8,
                  border: on ? "1.5px solid #9C27B0" : "1.5px solid #ede8f8",
                  boxShadow: on ? "0 3px 12px rgba(123,31,162,.12)" : "0 2px 8px rgba(100,50,180,.04)",
                  padding: "8px 9px", cursor: "pointer", transition: "all .15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{t.emoji}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 900, color: on ? "#4A148C" : "#1a1a2e",
                    lineHeight: 1.2, wordBreak: "keep-all", flex: 1 }}>{t.menu || t.menuRef || t.name}</span>
                  {t.cat ? (
                    <span style={{ fontSize: 8.5, color: "#9C27B0", fontWeight: 700,
                      background: "#F3E5F5", borderRadius: 4, padding: "1px 4px",
                      whiteSpace: "nowrap", flexShrink: 0 }}>{t.cat}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── [WIRING-01C] 장례식장명 — cat="장례식장" 선택 시에만 노출·필수 ── */}
        {isHall && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#E65100", margin: "18px 2px 8px" }}>
              🏛️ 장례식장명 <span style={{ color: "#d32f2f", fontWeight: 900 }}>필수</span>
            </div>
            <div style={{ background: "#fff", borderRadius: 12,
              border: hallInput.trim() ? "1.5px solid #e0d0f0" : "1.5px solid #FFB300",
              padding: "14px 16px" }}>
              <div style={{ position: "relative" }}>
                <input
                  value={hallInput}
                  onChange={(e) => onHallInput(e.target.value)}
                  onBlur={() => setTimeout(closeHallAc, 150)}
                  autoComplete="off"
                  placeholder="장례식장명 2자 이상 입력 (예: 서울의료원)"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px",
                    borderRadius: 8, border: "1.5px solid #e8e8ed", fontSize: 13.5,
                    fontFamily: "inherit", color: "#1a1a2e", outline: "none" }}
                />
                {hallAcItems.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 40,
                    marginTop: 3, background: "#fff", border: "1.5px solid #e0d0f0", borderRadius: 8,
                    boxShadow: "0 6px 18px rgba(80,40,120,.15)", overflow: "hidden" }}>
                    {hallAcItems.map((it, k) => (
                      <div key={k}
                        onMouseDown={(e) => { e.preventDefault(); pickHall(it); }}
                        style={{ padding: "8px 11px", fontSize: 12.5, cursor: "pointer",
                          borderTop: k ? "1px solid #f2ecf8" : "none" }}>
                        <span style={{ fontWeight: 700, color: "#4a3560" }}>{it.name}</span>
                        <span style={{ color: "#a99bbb", marginLeft: 6, fontSize: 11.5 }}>
                          {it.ctpv}{it.sigungu ? " · " + it.sigungu : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* [FUNERAL-HALL-IDENTITY-MERGE-01] 선택 확정 배지 — 지역 식별자 보유 상태 표시 */}
              {hallPicked ? (
                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 999,
                  padding: "4px 11px", fontSize: 11.5, fontWeight: 800, color: "#2E7D32" }}>
                  ✓ {hallPicked.ctpv}{hallPicked.sigungu ? " " + hallPicked.sigungu : ""} 시설로 확정
                </div>
              ) : hallInput.trim().length >= 2 ? (
                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 999,
                  padding: "4px 11px", fontSize: 11.5, fontWeight: 800, color: "#8a5a00" }}>
                  · 미선택 — 후보에서 선택해야 글을 만들 수 있습니다
                </div>
              ) : null}
              <div style={{ marginTop: 8, fontSize: 11.5, color: "#8a5a00", lineHeight: 1.5 }}>
                후보에서 고르면 공식 명칭으로 확정되고, 주소·주차·빈소·안치실은 글 작성 시 자동으로 반영됩니다.<br />
                목록에 없는 곳은 시설 정보를 확인할 수 없어 글을 만들 수 없습니다.
              </div>
            </div>
          </>
        )}

        {/* ── [WIRING-03A] INTENT 선택 — intents/*.js 에 정의된 cat 에서만 노출·필수 ── */}
        {intentList.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#E65100", margin: "12px 2px 6px" }}>
              🧭 글의 내용축{intentList.length > 1 ? <span style={{ color: "#d32f2f", fontWeight: 900 }}> 필수</span> : null}
              {intentList.length > 1
                ? (intentValue ? null : <span style={{ color: "#ccc", fontWeight: 700 }}> · 하나를 선택하세요</span>)
                : <span style={{ color: "#aaa", fontWeight: 700 }}> · 이 축으로 작성됩니다</span>}
            </div>
            <div style={{ background: "#fff", borderRadius: 12,
              border: intentValue ? "1.5px solid #e0d0f0" : "1.5px solid #FFB300",
              padding: "10px 12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
                {intentOptions.map(op => {
                  const on = intentValue === op.id;
                  const one = intentList.length === 1;
                  return (
                    <div key={op.id} onClick={one ? undefined : () => setIntentPick(op.id)}
                      title={one ? "이번 글의 내용축" : "클릭하여 내용축 선택"}
                      style={{ position: "relative", background: on ? "#F3E5F5" : "#fff", borderRadius: 8,
                        border: on ? "2px solid #9C27B0" : "1.5px solid #ede8f8",
                        boxShadow: on ? "0 3px 12px rgba(123,31,162,.16)" : "0 2px 8px rgba(100,50,180,.04)",
                        padding: on ? "7px 26px 7px 9px" : "8px 9px",
                        cursor: one ? "default" : "pointer", transition: "all .15s" }}>
                      {on && (
                        <span style={{ position: "absolute", top: 6, right: 7, width: 16, height: 16,
                          borderRadius: 8, background: "#9C27B0", color: "#fff", fontSize: 10.5,
                          fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1 }}>✓</span>
                      )}
                      <div style={{ fontSize: 12, fontWeight: 900, color: on ? "#4A148C" : "#1a1a2e",
                        lineHeight: 1.3, wordBreak: "keep-all", marginBottom: 3 }}>{op.label}</div>
                      <div style={{ fontSize: 11, color: on ? "#7B1FA2" : "#999", fontWeight: 600,
                        lineHeight: 1.35, wordBreak: "keep-all" }}>{op.question}</div>
                    </div>
                  );
                })}
              </div>
              {intentList.length > 1 && !intentValue && (
                <div style={{ marginTop: 7, fontSize: 11.5, color: "#8a5a00", lineHeight: 1.45 }}>
                  선택한 축이 제목과 본문 전체의 주제가 됩니다. 같은 시술이라도 축이 다르면 다른 글이 나옵니다.
                </div>
              )}
            </div>
          </>
        )}

        {/* ── [v99] 발행지역 — 업체정보 자동 적용(읽기전용). 1계정=1지역전략이므로 입력 제거. ── */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: picked ? "#E65100" : "#bbb",
          margin: "12px 2px 6px" }}>
          📍 발행지역 {picked ? null : <span style={{ color: "#ccc", fontWeight: 700 }}>· {L_ITEM}을 먼저 선택하세요</span>}
        </div>

        <div style={{ opacity: picked ? 1 : 0.45, pointerEvents: picked ? "auto" : "none" }}>
          {hasRegion ? (
            <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #e0d0f0",
              padding: "11px 14px", marginBottom: 10 }}>
              {/* ── 자동 적용 — 가로 1줄(설정된 것만) ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#7B1FA2",
                  display: "flex", alignItems: "center", gap: 6 }}>
                  <span>✅</span> AI 자동 적용
                </div>
                {onEditStore && (
                  <button onClick={onEditStore}
                    style={{ flexShrink: 0, marginLeft: 10, padding: "6px 12px", borderRadius: 8,
                      border: "1.5px solid #e0d0f0", background: "#fff", color: "#7B1FA2",
                      fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    업체정보 수정
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.55 }}>
                {[
                  storeName && <span key="n"><span style={{ color: "#999" }}>업체명 </span><strong style={{ color: "#1a1a2e", fontWeight: 600 }}>{storeName}</strong></span>,
                  storeRep  && <span key="r"><span style={{ color: "#999" }}>지역 </span><strong style={{ color: "#1a1a2e", fontWeight: 600 }}>{storeRep}</strong></span>,
                  storeSub  && <span key="s"><span style={{ color: "#999" }}>생활권 </span><strong style={{ color: "#1a1a2e", fontWeight: 600 }}>{storeSub}</strong></span>,
                  storeHours   && <span key="h"><span style={{ color: "#999" }}>{lex(currentIndustry).hoursLabel} </span><strong style={{ color: "#43A047", fontWeight: 600 }}>적용</strong></span>,
                  storeParking && <span key="p"><span style={{ color: "#999" }}>주차 </span><strong style={{ color: "#43A047", fontWeight: 600 }}>적용</strong></span>,
                ].filter(Boolean).map((el, i, arr) => (
                  <span key={i}>{el}{i < arr.length - 1 && <span style={{ color: "#ddd" }}> · </span>}</span>
                ))}
              </div>

              {/* [v123] 생활권 순번 회전 — 이번 글에 쓰일 생활권 1개 명시(보이는=적용). 2개 이상일 때만. */}
              {subRotList.length > 1 && picked0.subPick && (
                <div style={{ marginTop: 7, padding: "6px 10px", borderRadius: 8,
                  background: "#F3E5F5", fontSize: 12, color: "#6A1B9A", lineHeight: 1.4 }}>
                  📍 이번 글 생활권 <strong style={{ fontWeight: 800 }}>{picked0.subPick}</strong>
                  <span style={{ color: "#9457b8", fontWeight: 700 }}> ({picked0.index + 1}/{subRotList.length} · 작성할 때마다 순서대로 회전)</span>
                </div>
              )}

              {/* ── 구분선 ── */}
              <div style={{ borderTop: "1px solid #f0ebf8", margin: "9px 0" }} />

              {/* ── AI 자동 작성 — 누르면 무엇이 만들어지는가 ── */}
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#7B1FA2", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 6 }}>
                <span>✍️</span> AI 자동 작성
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#999" }}>
                  · 선택한 {L_ITEM}과 업체정보로 제목·내용 자동 생성
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "#555" }}>
                <span>✓ 제목 자동 생성</span>
                <span>✓ 생활권 자동 반영</span>
                <span>✓ 업체정보 자동 반영</span>
                <span>✓ 주차·업종정보 자동 반영</span>
              </div>
            </div>
          ) : (
            /* 업체정보에 지역(대표지역/생활권)이 비어 있음 → 작성 불가, 업체정보로 유도 */
            <div style={{ background: "#FFF8E1", borderRadius: 12, border: "1.5px solid #FFB300",
              padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#8a5a00", marginBottom: 8, lineHeight: 1.5 }}>
                ⚠️ 업체정보에 지역이 설정되지 않았습니다.
              </div>
              <div style={{ fontSize: 11.5, color: "#8a5a00", marginBottom: 10, lineHeight: 1.5 }}>
                발행 글에는 업체정보의 대표지역·생활권이 자동으로 들어갑니다. 먼저 업체정보에서 지역을 설정해 주세요.
              </div>
              {onEditStore && (
                <button onClick={onEditStore}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none",
                    background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
                    fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  업체정보 설정하러 가기 →
                </button>
              )}
            </div>
          )}

          {isGenerating ? (
            /* [v111] 페이지 전환 없이 버튼 자리에서만 '작성 중'으로 변환. 시술선택 화면은 그대로 유지. */
            <div style={{ width: "100%", padding: "13px 18px", borderRadius: 10,
              background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
              boxShadow: "0 4px 16px rgba(123,31,162,.28)",
              display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
                <span style={{ fontSize: 16, animation: "pulse 1.5s infinite" }}>✍️</span>
                <span style={{ fontSize: 13.5, fontWeight: 900, letterSpacing: 0.3 }}>
                  AI가 글을 쓰고 있습니다
                </span>
                <span style={{ display: "inline-block", width: 20, textAlign: "left", fontWeight: 900 }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{ opacity: 0, animation: `blinkDot 1.4s ${d * 0.25}s infinite` }}>.</span>
                  ))}
                </span>
              </div>
              <div style={{ position: "relative", height: 4, borderRadius: 4,
                background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%",
                  borderRadius: 4, background: "rgba(255,255,255,.95)",
                  animation: "genSlide 1.3s ease-in-out infinite" }} />
              </div>
              <style>{`
                @keyframes blinkDot { 0%,100%{opacity:0} 50%{opacity:1} }
                @keyframes genSlide { 0%{left:-40%} 100%{left:100%} }
              `}</style>
            </div>
          ) : (
          <button onClick={complete} disabled={!canGo}
            style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
              background: canGo ? "linear-gradient(135deg,#7B1FA2,#CE93D8)" : "#e8e8ed",
              color: canGo ? "#fff" : "#aaa", fontSize: 13.5, fontWeight: 900,
              cursor: canGo ? "pointer" : "default", fontFamily: "inherit" }}>
            {canGo ? `${picked.name} 글 작성하기`
              : !picked ? `${L_ITEM}을 먼저 선택하세요`
              : !hasRegion ? "업체정보에서 지역을 설정하세요"
              : !hallOk ? "장례식장을 후보에서 선택하세요"
              : !intentOk ? "글의 내용축을 선택하세요"
              : "글 작성하기"}
          </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================
// 키워드 경쟁도 분석 — 완전 내부 로직 (API/GPT 비용 없음)
// ============================================================
const COMPETITION_LABEL = {
  높음:  { emoji: "🔴", text: "경쟁 높음" },
  중간:  { emoji: "🟡", text: "경쟁 중간" },
  낮음:  { emoji: "🟢", text: "경쟁 낮음" },
};
const TYPE_LABEL = { 롱테일: "롱테일", 비교형: "비교형", 후기형: "후기형", 원본: "원본 그대로" };

function analyzeKeywordLocal(keyword, treatmentName, region) {
  const words = keyword.trim().split(/\s+/);
  const wordCount = words.length;

  // 경쟁도 판정 — 단어 수 + 특수 단어 기반
  const isLongTail   = wordCount >= 4;
  const hasSpec      = /붓기|멍|회복|일지|기간|통증|후기|상담|비교|차이|vs|처음|솔직|결과|3개월|1개월|비용|가격|재수술|처음|30대|40대/.test(keyword);
  const hasRegion    = !!region;
  const hasCompare   = /vs|비교|차이|어디/.test(keyword);

  let competition;
  if (isLongTail && hasSpec)          competition = "낮음";
  else if (isLongTail || hasSpec)     competition = "중간";
  else                                competition = "높음";

  // 롱테일 키워드 추천 — 업종별 완전 분리
  // treatmentData를 먼저 선언해야 detectedIndustry에서 사용 가능
  const treatmentData    = [...CLINIC_TREATMENTS, ...DENTAL_TREATMENTS, ...ENT_TREATMENTS, ...UROLOGY_TREATMENTS, ...ORIENTAL_TREATMENTS, ...ORTHO_TREATMENTS, ...PEDIATRICS_TREATMENTS, ...GASTRO_TREATMENTS, ...PULMO_TREATMENTS, ...CARD_TREATMENTS, ...ENDO_TREATMENTS, ...GENERAL_V2_TREATMENTS, ...OBGYN_TREATMENTS, ...PAIN_TREATMENTS, ...RADIO_TREATMENTS, ...NEURO_TREATMENTS, ...PSY_TREATMENTS, ...EYE_TREATMENTS, ...FAMILY_TREATMENTS, ...CAFE_TREATMENTS, ...KINDERGARTEN_TREATMENTS, ...FISHING_TREATMENTS, ...RESTAURANT_TREATMENTS, ...CHINESE_TREATMENTS, ...KOREAN_TREATMENTS, ...SNACK_TREATMENTS, ...JAPANESE_TREATMENTS, ...WESTERN_TREATMENTS, ...CHICKEN_TREATMENTS, ...MEAT_TREATMENTS, ...LEGAL_TREATMENTS, ...BEDDING_TREATMENTS, ...LAWYER_TREATMENTS, ...DAYCARE_TREATMENTS, ...HOMECARE_TREATMENTS, ...FUNERAL_TREATMENTS, ...TAX_TREATMENTS, ...LABOR_TREATMENTS].find(t => t.name === treatmentName || t.id === treatmentName);
  const detectedIndustry = treatmentData?.industry || "clinic";
  const LONGTAIL_SUFFIXES = detectedIndustry === "pain" ? (() => {
    const nm = treatmentData?.name || "";
    if (/디스크|협착|척추|경추성/.test(nm)) return [
      { suffix: "수술 없이 나은 이야기",              type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "주사 몇 회 맞았나요 솔직 후기",      type: "롱테일", reason: "시술 횟수 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "비용 보험 적용 정리",                type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    if (/무릎|어깨|관절|오십견/.test(nm)) return [
      { suffix: "주사 맞고 달라진 것",                type: "롱테일", reason: "주사 결과 탐색층 · 공감 높음" },
      { suffix: "수술 전 마지막으로 시도한 것",       type: "롱테일", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "효과 언제부터 느꼈나요",             type: "롱테일", reason: "치료 전 탐색 키워드" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    if (/도수치료|체외충격파|프롤로|PRP/.test(nm)) return [
      { suffix: "vs 다른 치료 비교｜직접 받아보고",   type: "비교형", reason: "비교 탐색층 · 실검 패턴" },
      { suffix: "실비 적용 비용 정리",                type: "롱테일", reason: "보험 탐색층 · 체류시간 높음" },
      { suffix: "효과 언제부터 느꼈나요",             type: "롱테일", reason: "치료 전 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 받은 솔직 후기",                type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
    ];
    if (/두통|신경통|대상포진|신경병증/.test(nm)) return [
      { suffix: "진통제 끊고 해결한 이야기",          type: "롱테일", reason: "약물 의존 탈출층 · 전환율 높음" },
      { suffix: "원인 찾고 달라진 것",                type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    if (/족저|발목|꼬리뼈|손목|팔꿈치/.test(nm)) return [
      { suffix: "아침 통증 사라진 이야기",            type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "치료 기간 얼마나 걸리나",            type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 신경성형술 (PEN)
    if (/신경성형/.test(nm)) return [
      { suffix: "수술 전 마지막 시도 솔직 후기",      type: "후기형", reason: "수술 보류층 · 전환율 높음" },
      { suffix: "신경차단술과 다른 점 정리",          type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
      { suffix: "시술 비용·실비 적용 정리",           type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 일지",                type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
    ];
    // 만성요통·만성통증 클리닉
    if (/만성요통|만성통증|난치성/.test(nm)) return [
      { suffix: "진통제 의존 끊은 3개월 후기",        type: "후기형", reason: "약물 의존 탈출층 · 전환율 높음" },
      { suffix: "다학제 통합 관리 솔직 정리",         type: "롱테일", reason: "통합 치료 탐색층 · 체류시간 높음" },
      { suffix: "여러 병원 다녀도 못 찾은 원인",      type: "후기형", reason: "난치성 공감층 · 공감 높음" },
    ];
    // 턱관절 (TMD)
    if (/턱관절|TMD/.test(nm)) return [
      { suffix: "두통까지 함께 사라진 이야기",        type: "후기형", reason: "동반 증상 공감층 · 전환율 높음" },
      { suffix: "치과 vs 통증의학과 비교",            type: "비교형", reason: "병원 비교 탐색층 · 경쟁 낮음" },
      { suffix: "보톡스·신경차단 솔직 후기",          type: "후기형", reason: "치료 비교층 · 체류시간 높음" },
    ];
    // 섬유근육통
    if (/섬유근육통|전신통증/.test(nm)) return [
      { suffix: "원인 모를 통증 진단받은 이야기",     type: "후기형", reason: "진단 지연 공감층 · 전환율 높음" },
      { suffix: "약물·운동 6개월 변화 일지",          type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "류마티스 검사 정상인데 통증 있을 때", type: "정보형", reason: "감별 탐색 · 경쟁 낮음" },
    ];
    // 좌골신경통
    if (/좌골신경통|이상근/.test(nm)) return [
      { suffix: "디스크인 줄 알았는데 다른 원인",     type: "후기형", reason: "감별 진단 공감층 · 전환율 높음" },
      { suffix: "엉덩이부터 다리까지 저림 후기",      type: "후기형", reason: "증상 공감층 · 공감 높음" },
      { suffix: "신경차단·신경성형 비교 정리",        type: "비교형", reason: "치료 비교 탐색층 · 체류시간 높음" },
    ];
    // 무릎 줄기세포·연골재생
    if (/줄기세포|연골재생|카티스템/.test(nm)) return [
      { suffix: "인공관절 전 마지막 시도 후기",       type: "후기형", reason: "수술 보류층 · 전환율 높음" },
      { suffix: "비용·효과·회복 솔직 정리",           type: "롱테일", reason: "비용 탐색층 · 체류시간 높음" },
      { suffix: "줄기세포 vs 인공관절 비교",          type: "비교형", reason: "치료 비교 탐색층 · 경쟁 낮음" },
      { suffix: "6개월 효과 변화 일지",               type: "롱테일", reason: "장기 결과 탐색 · 공감 높음" },
    ];
    return [
      { suffix: "비수술 치료 후기 솔직하게",          type: "후기형", reason: "비수술 탐색 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "비용 횟수 솔직 정리",                type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
  })() : detectedIndustry === "dental" ? [    { suffix: "치료 후 회복 일지",        type: "롱테일", reason: "치과 회복 정보 검색 多 · 경쟁 낮음" },
    { suffix: "통증 회복 기간 정리",      type: "롱테일", reason: "시술 전 불안 검색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "두려워서 미루다 받은 후기", type: "후기형", reason: "치과 공포증 타겟 · 공감 높음" },
    { suffix: "비용 기간 솔직 정리",      type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
  // [ent v2] 정보형 Purpose — 후기형 suffix 제거(1인칭·후기 금지 엔진과 정합)
  ] : detectedIndustry === "ent" ? [
    { suffix: "어떤 경우에 검토되는지 안내", type: "정보형", reason: "검사·진료 검토 상황 탐색층 · 체류시간 높음" },
    { suffix: "검사·치료 결정 기준 안내",   type: "정보형", reason: "판단 기준 탐색층 · 경쟁 낮음" },
    { suffix: "진료에서 확인하는 항목",     type: "롱테일", reason: "내원 전 확인 검색 多 · 경쟁 낮음" },
    { suffix: "병원 선택 시 확인할 점",     type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    { suffix: "증상별 확인 흐름 정리",      type: "롱테일", reason: "증상 검색 진입 · 상단 유지력 높음" },
  ] : detectedIndustry === "urology" ? [
    // [v2 교체 2026-07-13] 후기형 → 정보형. urology V2 승격 정합(ent 동형).
    { suffix: "어떤 경우에 검토되는지 안내", type: "롱테일", reason: "검사 선택 기준 탐색 · 광고글 회피층" },
    { suffix: "검사·치료 결정 기준 안내",    type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
    { suffix: "진료에서 확인하는 항목",      type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
    { suffix: "병원 선택 시 확인할 점",      type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    { suffix: "배뇨 증상별 확인 흐름 정리",  type: "롱테일", reason: "증상 검색 진입 · 상단 유지력 높음" },
  ] : detectedIndustry === "ortho" ? (() => {
    const nm = treatmentData?.name || "";
    if (/디스크|협착|측만/.test(nm)) return [
      { suffix: "꼭 수술만이 답일까요｜비수술로 해결한 이야기",   type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "앉아 있을수록 아프다면｜치료 기록",             type: "롱테일", reason: "증상 탐색 · 실검 패턴" },
      { suffix: "치료 방법 체크｜3개월 기록",                    type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "수술 없이 나은 이야기",                         type: "후기형", reason: "비수술 공감층 · 전환율 높음" },
    ];
    if (/무릎|연골|십자인대|반월/.test(nm)) return [
      { suffix: "밤마다 찾아오는 통증｜치료받고 달라진 것",      type: "롱테일", reason: "야간통증 탐색 · 실검 패턴" },
      { suffix: "수술 전 마지막으로 시도한 것",                  type: "롱테일", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "주사 맞고 나서 솔직 후기",                      type: "후기형", reason: "주사 탐색층 · 공감 높음" },
      { suffix: "효과 언제부터 느꼈나요",                        type: "롱테일", reason: "치료 전 탐색 키워드" },
    ];
    if (/고관절|대퇴골두/.test(nm)) return [
      { suffix: "사타구니 통증으로 시작한 진단 후기",            type: "롱테일", reason: "증상형 실검 패턴 · 경쟁 낮음" },
      { suffix: "MRI 찍고 나서야 알게 된 이야기",                type: "롱테일", reason: "검사 탐색층 · 체류시간 높음" },
      { suffix: "인공관절 수술 전 마지막 시도",                  type: "후기형", reason: "수술 보류층 타겟 · 전환율 높음" },
      { suffix: "허리디스크인 줄 알았는데｜정확한 진단 후기",    type: "롱테일", reason: "진단 혼동층 · 공감 높음" },
    ];
    if (/어깨|오십견|회전근/.test(nm)) return [
      { suffix: "통증이 계속된다면｜원인 찾고 달라진 것",        type: "롱테일", reason: "증상형 실검 패턴 · 경쟁 낮음" },
      { suffix: "밤에 더 심하다면｜치료받고 나서 후기",          type: "후기형", reason: "야간통증 탐색층 · 공감 높음" },
      { suffix: "속에 돌이 생긴다?｜석회성건염 치료 후기",       type: "롱테일", reason: "질환명 탐색층 · 경쟁 낮음" },
      { suffix: "수술 없이 치료 후기",                           type: "후기형", reason: "비수술 탐색층 · 전환율 높음" },
    ];
    if (/도수치료|체외충격파|프롤로|주사/.test(nm)) return [
      { suffix: "vs 물리치료 차이점｜직접 받아보고 선택",        type: "비교형", reason: "비교 탐색층 · 실검 패턴" },
      { suffix: "추천｜비용·효과·실비 정리",                     type: "롱테일", reason: "보험 탐색층 · 체류시간 높음" },
      { suffix: "효과 언제부터 느꼈나요",                        type: "롱테일", reason: "치료 전 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 받은 솔직 후기",                           type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
    ];
    if (/족저|발목|족부/.test(nm)) return [
      { suffix: "아침 통증 사라진 이야기",                       type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "원인 치료방법｜솔직 후기",                      type: "롱테일", reason: "실검 패턴 반영 · 경쟁 낮음" },
      { suffix: "치료 기간 얼마나 걸리나",                       type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
    ];
    if (/수술|재활|골절|십자인대/.test(nm)) return [
      { suffix: "수술 후 재활 기록",                             type: "롱테일", reason: "수술 후 탐색층 · 체류시간 높음" },
      { suffix: "복귀까지 솔직 일지",                            type: "롱테일", reason: "회복 기간 탐색층 · 경쟁 낮음" },
      { suffix: "수술 결정하기까지 과정",                        type: "후기형", reason: "수술 고민층 타겟 · 전환율 높음" },
    ];
    return [
      { suffix: "치료 후기 솔직 정리",   type: "롱테일", reason: "정형외과 후기 공백 · 경쟁 낮음" },
      { suffix: "비용 기간 솔직 정리",   type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",        type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    ];
  })() : detectedIndustry === "obgyn" ? [
    // [v2 교체 2026-07-13] 후기형·분기형 → 정보형 평면. obgyn V2 승격 정합(urology/eye 동형).
    //   v1 분기(자궁근종/검진/난임·임신/갱년기/임신중기·후기/생리통/요실금/여성암/조기폐경)는 전면 폐기.
    //   ★ v2 메뉴에 임신·출산·난임·요실금·유방·소음순 없음 → 해당 분기 도달 불가.
    { suffix: "어떤 경우에 검토되는지 안내", type: "롱테일", reason: "검사 선택 기준 탐색 · 광고글 회피층" },
    { suffix: "검사·치료 결정 기준 안내",    type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
    { suffix: "진료에서 확인하는 항목",      type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
    { suffix: "병원 선택 시 확인할 점",      type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    { suffix: "증상별 확인 흐름 정리",       type: "롱테일", reason: "증상 검색 진입 · 상단 유지력 높음" },
  ] : detectedIndustry === "general" ? (() => {
    const nm = treatmentData?.name || "";
    if (/고혈압|당뇨|고지혈증|생활습관/.test(nm)) return [
      { suffix: "처음 약 처방받은 날",              type: "후기형", reason: "만성질환 첫 처방 탐색 · 공감 높음" },
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
      { suffix: "평생 먹어야 하나요",               type: "정보형", reason: "약 의존 불안 탐색 · 경쟁 낮음" },
    ];
    if (/갑상선|빈혈|비타민D|만성피로/.test(nm)) return [
      { suffix: "원인 찾은 이야기",                 type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "혈액검사 후기 솔직하게",           type: "후기형", reason: "검사 탐색층 · 공감 높음" },
      { suffix: "수치 정상화까지 기록",             type: "롱테일", reason: "경과 탐색층 · 체류시간 높음" },
    ];
    if (/건강검진/.test(nm)) return [
      { suffix: "이상 소견 받고 나서 한 것들",      type: "롱테일", reason: "검진 후 탐색층 · 전환율 높음" },
      { suffix: "항목 미리 알고 가기",              type: "정보형", reason: "사전 탐색층 · 경쟁 낮음" },
      { suffix: "국가검진 vs 종합검진 비교",        type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
    ];
    if (/독감|대상포진/.test(nm)) return [
      { suffix: "조기 치료 후기",                   type: "후기형", reason: "조기 탐색층 · 전환율 높음" },
      { suffix: "언제 병원 가야 하나요",            type: "정보형", reason: "방문 기준 탐색 · 경쟁 낮음" },
      { suffix: "타미플루 효과 솔직 후기",          type: "후기형", reason: "처방 탐색층 · 공감 높음" },
    ];
    // 통풍·요산
    if (/통풍|요산/.test(nm)) return [
      { suffix: "첫 발작 후 시작한 약물 관리",      type: "후기형", reason: "발작 경험층 · 공감 높음" },
      { suffix: "약 평생 먹어야 하나요",            type: "정보형", reason: "약 의존 탐색 · 경쟁 낮음" },
      { suffix: "요산 수치 낮추는 식이·약물 정리",  type: "롱테일", reason: "수치 관리 탐색층 · 체류시간 높음" },
    ];
    // 종합검진·정밀검진
    if (/종합검진|정밀검진/.test(nm)) return [
      { suffix: "국가검진과 다른 점 비교",          type: "비교형", reason: "검진 비교 탐색층 · 체류시간 높음" },
      { suffix: "40대 처음 받은 솔직 후기",         type: "후기형", reason: "첫 정밀검진 공감층 · 전환율 높음" },
      { suffix: "패키지·비용 정리",                 type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
      { suffix: "이상 소견 받고 추가 검사 후기",    type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
    ];
    // 코로나 후유증·롱코비드
    if (/롱코비드|코로나/.test(nm)) return [
      { suffix: "회복까지 솔직 일지",               type: "롱테일", reason: "회복 경과 탐색층 · 체류시간 높음" },
      { suffix: "브레인포그·집중력 저하 진료 후기", type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "정밀 검사 항목 정리",              type: "정보형", reason: "검사 탐색층 · 경쟁 낮음" },
    ];
    // 대상포진 예방접종
    if (/싱그릭스|예방접종|백신/.test(nm)) return [
      { suffix: "싱그릭스 vs 조스타박스 비교",      type: "비교형", reason: "백신 비교 탐색층 · 체류시간 높음" },
      { suffix: "50대 첫 접종 솔직 후기",           type: "후기형", reason: "첫 접종 공감층 · 전환율 높음" },
      { suffix: "비용·일정·부작용 정리",            type: "롱테일", reason: "예약 정보 탐색층 · 경쟁 낮음" },
    ];
    // 심혈관·이상지질혈증
    if (/심혈관|이상지질혈증/.test(nm)) return [
      { suffix: "가족력 있을 때 정밀 평가",         type: "정보형", reason: "가족력 탐색 · 경쟁 낮음" },
      { suffix: "경동맥 초음파 후기 솔직하게",      type: "후기형", reason: "검사 경험층 · 전환율 높음" },
      { suffix: "LDL 강화 관리 3개월 기록",         type: "롱테일", reason: "관리 결과 탐색층 · 체류시간 높음" },
    ];
    // 남성갱년기·호르몬
    if (/남성갱년기|호르몬|테스토스테론/.test(nm)) return [
      { suffix: "만성피로로 시작한 호르몬 검사",    type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "보충 요법 3개월 변화 일지",        type: "롱테일", reason: "치료 결과 탐색층 · 체류시간 높음" },
      { suffix: "비뇨기과 vs 내과 어디가 나을까",   type: "비교형", reason: "병원 비교 탐색층 · 경쟁 낮음" },
    ];
    // 알레르기
    if (/알레르기/.test(nm)) return [
      { suffix: "원인 찾고 달라진 3개월",           type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "MAST 검사 솔직 후기",              type: "후기형", reason: "검사 탐색층 · 공감 높음" },
      { suffix: "면역치료 효과 정리",               type: "정보형", reason: "치료법 탐색 · 경쟁 낮음" },
    ];
    return [
      { suffix: "내과 후기 솔직하게",               type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                   type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "gastro" ? (() => {
    const nm = treatmentData?.name || "";
    if (/내시경/.test(nm)) return [
      { suffix: "처음 받는 분들 준비 가이드",      type: "정보형", reason: "첫 내시경 탐색 · 경쟁 낮음" },
      { suffix: "수면 vs 비수면 직접 비교",        type: "비교형", reason: "비교 탐색층 · 체류시간 높음" },
      { suffix: "전날 준비부터 결과까지 솔직 후기", type: "후기형", reason: "후기 탐색층 · 전환율 높음" },
    ];
    if (/역류|식도|소화불량/.test(nm)) return [
      { suffix: "약 끊으면 재발하는 이유",         type: "정보형", reason: "재발 탐색 · 경쟁 낮음" },
      { suffix: "치료 후 달라진 식습관",           type: "롱테일", reason: "관리법 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",                  type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    ];
    if (/간|지방간|간경변|간염/.test(nm)) return [
      { suffix: "수치 얼마나 좋아졌나요",           type: "롱테일", reason: "결과 탐색층 · 체류시간 높음" },
      { suffix: "3개월 관리 솔직 후기",            type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "건강검진 소견 받고 나서 한 것들", type: "롱테일", reason: "건강검진 후 탐색층 · 전환율 높음" },
    ];
    if (/담석|담낭|췌장/.test(nm)) return [
      { suffix: "수술 꼭 해야 하나요",             type: "정보형", reason: "수술 고민 탐색 · 경쟁 낮음" },
      { suffix: "처음 진단받고 한 것들",           type: "후기형", reason: "진단 후 탐색층 · 공감 높음" },
      { suffix: "증상 원인 찾은 이야기",           type: "롱테일", reason: "증상 탐색층 · 체류시간 높음" },
    ];
    // 위암·대장암 검진
    if (/위암|대장암/.test(nm)) return [
      { suffix: "가족력 있을 때 시작 시기",         type: "정보형", reason: "검진 시기 탐색 · 경쟁 낮음" },
      { suffix: "국가검진과 다른 점 정리",          type: "비교형", reason: "검진 비교 탐색층 · 체류시간 높음" },
      { suffix: "조기 발견된 이야기 솔직 후기",     type: "후기형", reason: "조기진단 공감층 · 전환율 높음" },
      { suffix: "검진 비용·주기 정리",              type: "롱테일", reason: "비용 탐색층 · 경쟁 낮음" },
    ];
    // 치질·치핵
    if (/치질|치핵/.test(nm)) return [
      { suffix: "혼자 고민하다 받은 진료 후기",     type: "후기형", reason: "심리 장벽 공감층 · 전환율 높음" },
      { suffix: "수술 vs 비수술 단계별 정리",       type: "비교형", reason: "치료 비교 탐색층 · 체류시간 높음" },
      { suffix: "좌욕·연고로 안 될 때 다음 단계",   type: "롱테일", reason: "보존 한계층 · 경쟁 낮음" },
      { suffix: "혈변으로 시작한 진단 과정",        type: "후기형", reason: "증상 공감층 · 전환율 높음" },
    ];
    // 만성변비
    if (/변비/.test(nm)) return [
      { suffix: "변비약 의존 끊고 시작한 후기",     type: "후기형", reason: "약물 의존 탈출층 · 공감 높음" },
      { suffix: "식이요법만으로 안 될 때",          type: "롱테일", reason: "보존 한계층 · 경쟁 낮음" },
      { suffix: "락툴로오즈 효과 솔직 정리",        type: "롱테일", reason: "약물 탐색층 · 체류시간 높음" },
      { suffix: "원인 찾은 정밀 검진 후기",         type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
    ];
    // 장상피화생
    if (/장상피화생/.test(nm)) return [
      { suffix: "내시경 결과 통보받고 한 것들",     type: "후기형", reason: "결과 통보 공감층 · 전환율 높음" },
      { suffix: "추적 검사 주기 정리",              type: "정보형", reason: "추적 탐색 · 경쟁 낮음" },
      { suffix: "헬리코박터 제균 함께 받은 후기",   type: "롱테일", reason: "병행 치료 탐색층 · 체류시간 높음" },
      { suffix: "위암 전구 단계 관리 솔직 후기",    type: "롱테일", reason: "고위험군 공감층 · 전환율 높음" },
    ];
    // 정맥류
    if (/정맥류/.test(nm)) return [
      { suffix: "결찰술 치료 솔직 후기",            type: "후기형", reason: "시술 경험층 · 공감 높음" },
      { suffix: "간경변 진단 후 추적 시작",         type: "롱테일", reason: "합병증 탐색층 · 체류시간 높음" },
      { suffix: "재출혈 예방 관리 정리",            type: "정보형", reason: "예방 탐색층 · 경쟁 낮음" },
    ];
    return [
      { suffix: "소화기내과 후기 솔직하게",         type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",                  type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "증상 원인 찾고 달라진 것들",       type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "pediatrics" ? (() => {
    // ★ V2 정보형 평면 5종 (2026-07-13 승격). v1 후기형 12분기 폐기.
    //   경계: 예방접종·응급(고열/열성경련)·성장호르몬·소아비만·신생아 제외
    //         중이염/비염(ent) · 결막염(eye) · ADHD(psy) 제외
    return [
      { suffix: "어떤 경우에 검토되나요",           type: "정보형", reason: "검토 기준 탐색 · 경쟁 낮음" },
      { suffix: "진료에서 확인하는 항목 정리",       type: "정보형", reason: "확인 항목 탐색 · 체류시간 높음" },
      { suffix: "검사·치료 결정 기준 안내",         type: "정보형", reason: "판단 기준 탐색 · 전환율 높음" },
      { suffix: "병원 선택 시 확인할 점",           type: "정보형", reason: "선택 기준 탐색 · 경쟁 낮음" },
      { suffix: "증상 확인부터 관리까지 흐름",       type: "롱테일", reason: "전체 흐름 탐색 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "oriental" ? (() => {
    // 한의원은 치료 카테고리별로 완전히 다른 suffix 사용
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 교통사고
    if (/교통사고/.test(nm)) return [
      { suffix: "후유증 관리 솔직 후기",        type: "롱테일", reason: "교통사고 후유증 공백 · 경쟁 낮음" },
      { suffix: "보험 처리 치료 후기",          type: "롱테일", reason: "보험 탐색층 · 전환율 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "사고 후 통증 있다면",          type: "롱테일", reason: "증상 탐색 키워드 · 경쟁 낮음" },
    ];
    // 근골격 (추나·도수·체외충격파·관절)
    if (/추나|도수|체외충격파|관절/.test(nm)) return [
      { suffix: "효과 언제부터 느꼈나요",       type: "롱테일", reason: "치료 전 탐색 검색어 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 정리",          type: "롱테일", reason: "치료 후 정보 탐색 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 보험 적용 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 내과·한약·공진단·소화기·면역
    if (/한약|공진단|소화기|면역|뜸/.test(nm)) return [
      { suffix: "효과 있나요 솔직 후기",        type: "후기형", reason: "효능 의심층 타겟 · 공감 높음" },
      { suffix: "처음 복용 후기",               type: "후기형", reason: "처음 경험층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "체질 개선 경험담",             type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
    // 여성·산후·갱년기·생리·난임
    if (/산후|갱년기/.test(nm)) return [
      { suffix: "후기 솔직하게 정리했습니다",   type: "후기형", reason: "여성 공감층 타겟 · 전환율 높음" },
      { suffix: "효과 언제부터 체감했나요",     type: "롱테일", reason: "증상 탐색 키워드 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 생리통·생리불순
    if (/생리통|생리불순/.test(nm)) return [
      { suffix: "진통제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "진통제 탈출층 · 공감 높음" },
      { suffix: "체질별 맞춤 치료 솔직 정리",     type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
      { suffix: "처음 한방 진단받고 달라진 것",   type: "후기형", reason: "초진 고민층 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",            type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 난임·임신준비
    if (/난임|임신준비/.test(nm)) return [
      { suffix: "시험관 전 체질 개선 후기",     type: "롱테일", reason: "시험관 보조 탐색 · 경쟁 낮음" },
      { suffix: "6개월 관리 솔직 일지",         type: "롱테일", reason: "장기 치료 탐색층 · 체류시간 높음" },
      { suffix: "처음 난임 한방 상담 후기",     type: "후기형", reason: "상담 고민층 · 전환율 높음" },
      { suffix: "자궁 환경 개선 솔직 정리",     type: "롱테일", reason: "원인 탐색층 · 공감 높음" },
    ];
    // 피부·다이어트
    if (/피부|다이어트/.test(nm)) return [
      { suffix: "전후 변화 솔직 후기",          type: "후기형", reason: "결과 탐색층 타겟 · 전환율 높음" },
      { suffix: "효과 있나요 체질별 비교",      type: "롱테일", reason: "체질 비교 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "비용 기간 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
    ];
    // 신경(구안와사·중풍)
    if (/구안와사|중풍/.test(nm)) return [
      { suffix: "72시간 내 치료 시작 후기",     type: "롱테일", reason: "초기 치료 탐색 · 경쟁 낮음" },
      { suffix: "회복 기간 솔직 정리",          type: "롱테일", reason: "회복 정보 탐색 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
      { suffix: "후유증 없이 나은 이야기",      type: "후기형", reason: "결과 탐색층 · 공감 높음" },
    ];
    // 이명·난청
    if (/이명|난청/.test(nm)) return [
      { suffix: "양방 후 한방 병행 후기",       type: "롱테일", reason: "양방 한계 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 달라진 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "한약·침치료 병행 솔직 후기",   type: "후기형", reason: "병행 치료 탐색층 · 공감 높음" },
      { suffix: "처음 한방 진단 후기",          type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 불면증·수면장애
    if (/불면|수면/.test(nm)) return [
      { suffix: "수면제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "수면제 탈출층 · 공감 높음" },
      { suffix: "3개월 변화 솔직 일지",           type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "스트레스성 불면 회복 후기",      type: "후기형", reason: "원인 공감층 · 전환율 높음" },
      { suffix: "체질 진단 솔직 정리",            type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
    // 소아한방(틱·ADHD·성장)
    if (/소아한방|틱|성장한약/.test(nm)) return [
      { suffix: "아이 변화 6개월 솔직 일지",    type: "롱테일", reason: "장기 관리 부모층 · 체류시간 높음" },
      { suffix: "약물 부담 없이 시작한 후기",   type: "후기형", reason: "약물 회피층 · 공감 높음" },
      { suffix: "처음 소아 한방 상담 후기",     type: "후기형", reason: "초진 부모층 · 전환율 높음" },
      { suffix: "체질·성장·면역 한 번에 본 후기", type: "롱테일", reason: "통합 관리 탐색층 · 경쟁 낮음" },
    ];
    // 두통·편두통 한방
    if (/두통|편두통/.test(nm)) return [
      { suffix: "진통제 끊고 한약으로 바꾼 후기", type: "후기형", reason: "진통제 의존 탈출층 · 공감 높음" },
      { suffix: "원인별 맞춤 치료 솔직 정리",     type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "3개월 변화 솔직 일지",           type: "롱테일", reason: "장기 변화 탐색층 · 체류시간 높음" },
      { suffix: "처음 한방 진단 후기",            type: "후기형", reason: "초진 고민층 · 전환율 높음" },
    ];
    // 기본 (침·부항 등)
    return [
      { suffix: "처음 받아봤는데 솔직 후기",    type: "후기형", reason: "첫 경험층 타겟 · 공감 높음" },
      { suffix: "효과 있나요 상담 후기",        type: "후기형", reason: "효능 의심층 타겟 · 전환율 높음" },
      { suffix: "비용 횟수 솔직 정리",          type: "롱테일", reason: "가격 탐색층 · 경쟁 낮음" },
      { suffix: "체질 원인 찾고 달라진 것",     type: "롱테일", reason: "체질 탐색층 · 경쟁 낮음" },
    ];
  })() : detectedIndustry === "neuro" ? (() => {
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 척추수술후증후군 — 별도 분기 (디스크보다 우선)
    if (/척추수술후|FBSS|수술후증후군/.test(nm)) return [
      { suffix: "수술 후 통증 재발 후기",       type: "후기형", reason: "수술 후 통증 공감층 · 전환율 매우 높음" },
      { suffix: "재시술 없이 회복한 일지",      type: "롱테일", reason: "재수술 회피층 · 경쟁 낮음" },
      { suffix: "신경성형술 솔직 후기",         type: "롱테일", reason: "비수술 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 공감 높음" },
    ];
    // 척추·디스크
    if (/디스크|협착|압박골절/.test(nm) || cat === "척추·디스크") return [
      { suffix: "비수술 치료 후기 솔직 정리",   type: "롱테일", reason: "비수술 탐색 최강 · 경쟁 낮음" },
      { suffix: "수술 없이 치료한 이야기",      type: "후기형", reason: "비수술 공감층 · 전환율 높음" },
      { suffix: "재활 회복 일지",               type: "롱테일", reason: "회복 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 두통·신경통
    if (/두통|편두통|삼차신경통|후두신경통|군발/.test(nm) || cat === "두통·신경통") return [
      { suffix: "약 끊고 시술 받은 후기",       type: "롱테일", reason: "약 의존 탈출층 · 전환율 높음" },
      { suffix: "원인 찾고 달라진 이야기",      type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "신경외과 검진 후기",           type: "후기형", reason: "검진 고민층 · 공감 높음" },
      { suffix: "뇌MRI까지 받아본 솔직 후기",   type: "롱테일", reason: "검사 탐색층 · 체류시간 높음" },
    ];
    // 신경차단·통증
    if (/신경차단|신경성형|고주파|FIMS|체외충격파/.test(nm) || cat === "신경차단·통증") return [
      { suffix: "시술 후 통증 변화 솔직 정리",  type: "롱테일", reason: "시술 결과 탐색층 · 전환율 높음" },
      { suffix: "비수술 치료 후기",             type: "후기형", reason: "비수술 공감층 · 경쟁 낮음" },
      { suffix: "만성통증 치료 일지",           type: "롱테일", reason: "만성통증 탐색층 · 체류시간 높음" },
      { suffix: "처음 시술 솔직 후기",          type: "후기형", reason: "첫 경험층 · 공감 높음" },
    ];
    // 좌골신경통 — 별도 분기 (말초신경 카테고리 안에서 우선 매칭)
    if (/좌골신경통/.test(nm)) return [
      { suffix: "엉덩이 다리 저림 호전 일지",   type: "후기형", reason: "특정 증상 공감 · 전환율 높음" },
      { suffix: "비수술 치료 솔직 후기",        type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 해결한 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 상담 후기",      type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 말초신경·손저림
    if (/수근관|척골신경|말초신경/.test(nm) || cat === "말초신경·손저림") return [
      { suffix: "손저림 호전 일지",             type: "후기형", reason: "증상 공감층 · 전환율 높음" },
      { suffix: "수술 없이 치료한 후기",        type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "원인 찾고 해결한 이야기",      type: "롱테일", reason: "원인 탐색층 · 체류시간 높음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
    // 이명 — 별도 분기 (어지럼 카테고리 안에서 우선 매칭)
    if (/이명|귀울림/.test(nm)) return [
      { suffix: "이명 원인 찾은 솔직 후기",     type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "만성이명 검진 일지",           type: "롱테일", reason: "만성 탐색층 · 체류시간 높음" },
      { suffix: "수면 회복 후기",               type: "롱테일", reason: "수면 영향 공감층 · 경쟁 낮음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 기억력저하·인지검사 — 별도 분기
    if (/기억력|인지기능|건망증/.test(nm)) return [
      { suffix: "인지기능검사 솔직 후기",       type: "롱테일", reason: "검사 탐색층 · 경쟁 낮음" },
      { suffix: "건망증 원인 찾은 후기",        type: "후기형", reason: "원인 고민층 · 전환율 높음" },
      { suffix: "치매 조기 검진 후기",          type: "롱테일", reason: "예방 탐색층 · 체류시간 높음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 어지럼·뇌신경
    if (/어지럼|뇌MRI|안면경련/.test(nm) || cat === "어지럼·뇌신경") return [
      { suffix: "원인 찾은 솔직 후기",          type: "후기형", reason: "원인 탐색층 · 전환율 높음" },
      { suffix: "뇌MRI 검진 후기",              type: "롱테일", reason: "검진 탐색층 · 경쟁 낮음" },
      { suffix: "처음 신경외과 검진 후기",      type: "후기형", reason: "검진 고민층 · 공감 높음" },
    ];
    // 신경외과 기본값
    return [
      { suffix: "신경외과 후기 솔직하게",       type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "비수술 치료 후기",             type: "롱테일", reason: "비수술 탐색층 · 경쟁 낮음" },
      { suffix: "처음 상담 후기",               type: "후기형", reason: "상담 고민층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "psy" ? (() => {
    // [v2 교체 2026-07-13] 후기형·비급여 프로그램(CBT/rTMS/EMDR/뉴로피드백) 분기 전면 폐기 → 정보형(decisionAxis) 정합.
    //   psy V2 = 검사5 + 질환9 (14종). 트라우마·관계·애도·분노조절·연령별(청소년/중년/노인/산후) 엔진 제외.
    //   ★ 자살·자해 / 약물 성분·용량 / 비용·회기 / 타 기관 비교 → suffix에서도 금지.
    return [
      { suffix: "검사·치료 결정 기준",          type: "정보형", reason: "판단 기준 탐색층 · 체류시간 높음" },
      { suffix: "진료에서 확인하는 항목",       type: "정보형", reason: "확인 항목 탐색층 · 경쟁 낮음" },
      { suffix: "어떤 경우에 검토되나요",       type: "롱테일", reason: "내원 고민층 · 전환율 높음" },
      { suffix: "병원 선택 시 확인할 점",       type: "정보형", reason: "선택 기준 탐색층 · 경쟁 낮음" },
      { suffix: "진료 과정 안내",               type: "정보형", reason: "절차 탐색층 · 낙인 우려 완화" },
    ];
  })() : detectedIndustry === "eye" ? (() => {
    // [v2 교체 2026-07-13] 후기형·시력교정 분기 전면 폐기 → 정보형(decisionAxis) 정합.
    //   eye V2 = 검사5 + 질환9 (14종). 라식·라섹·ICL·드림렌즈·약시·사시 엔진 제외.
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 검사 5종 (exam 축)
    if (cat === "검사" || /검사$/.test(nm)) return [
      { suffix: "어떤 경우에 검토되는지 안내",   type: "롱테일", reason: "검사 선택 기준 탐색 · 광고글 회피층" },
      { suffix: "무엇을 확인하는 검사인가",      type: "롱테일", reason: "검사 목적 탐색 · 경쟁 낮음" },
      { suffix: "검사 전 알아둘 점 정리",        type: "롱테일", reason: "내원 전 정보 탐색 · 체류시간 높음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
    // 백내장·노안
    if (cat === "백내장·노안") return [
      { suffix: "검사·치료 결정 기준 안내",      type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
      { suffix: "진료에서 확인하는 항목",        type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
      { suffix: "언제 진료를 고려하는지",        type: "롱테일", reason: "증상 검색 진입 · 상단 유지력 높음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
    // 망막·녹내장
    if (cat === "망막·녹내장") return [
      { suffix: "검사·치료 결정 기준 안내",      type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
      { suffix: "어떤 검사로 확인하는지",        type: "롱테일", reason: "검사 흐름 탐색 · 경쟁 낮음" },
      { suffix: "경과 확인은 어떻게 하는지",     type: "롱테일", reason: "관리 탐색층 · 상단 유지력 높음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
    // 안구표면
    if (cat === "안구표면") return [
      { suffix: "원인 범위를 가르는 확인 흐름",  type: "롱테일", reason: "원인 탐색층 · 경쟁 낮음" },
      { suffix: "검사·치료 결정 기준 안내",      type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
      { suffix: "진료에서 확인하는 항목",        type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
    // 소아안과
    if (cat === "소아안과") return [
      { suffix: "진행 확인은 어떻게 하는지",     type: "롱테일", reason: "진행 탐색층 · 체류시간 높음" },
      { suffix: "검사·관리 결정 기준 안내",      type: "롱테일", reason: "판단 기준 탐색 · 경쟁 낮음" },
      { suffix: "진료에서 확인하는 항목",        type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
    // 안과 기본값 (정보형)
    return [
      { suffix: "검사·치료 결정 기준 안내",      type: "롱테일", reason: "판단 기준 탐색 · 체류시간 높음" },
      { suffix: "진료에서 확인하는 항목",        type: "롱테일", reason: "내원 전 정보 탐색 · 경쟁 낮음" },
      { suffix: "병원 선택 시 확인할 점",        type: "롱테일", reason: "비교 탐색층 · 광고글 회피층" },
    ];
  })() : detectedIndustry === "family" ? (() => {
    // ★ [family V2 재설계 2026-07-14] 정보형 suffix만. cat 5계열(검진/예방접종/만성질환/감기·호흡기/생활증상).
    //   ⚠️ 후기형·소화기(gastro 경계) 분기 폐기.
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";

    // 검진 (exam)
    if (cat === "검진" || /건강검진|국가건강검진|정기검사|검진결과상담/.test(nm)) return [
      { suffix: "항목·대상 정리",       type: "정보형", reason: "사전 탐색층 · 정보 공백" },
      { suffix: "진행 과정 안내",       type: "정보형", reason: "초보 탐색층 · 체류시간 높음" },
      { suffix: "결과 확인 시점 정리",  type: "정보형", reason: "사후 확인층 · 경쟁 낮음" },
    ];
    // 예방접종 (exam)
    if (cat === "예방접종" || /예방접종|대상포진|독감/.test(nm)) return [
      { suffix: "대상·시기 정리",       type: "정보형", reason: "사전 탐색층 · 정보 공백" },
      { suffix: "진행 과정 안내",       type: "정보형", reason: "초보 탐색층 · 체류시간 높음" },
      { suffix: "이력 확인 안내",       type: "정보형", reason: "사전 준비층 · 경쟁 낮음" },
    ];
    // 만성질환 (disease)
    if (cat === "만성질환" || /고혈압|당뇨|고지혈증/.test(nm)) return [
      { suffix: "확인 항목 정리",       type: "정보형", reason: "관리 탐색층 · 정보 공백" },
      { suffix: "관리 방향 안내",       type: "정보형", reason: "관리 초기층 · 체류시간 높음" },
      { suffix: "정기 확인 시점 정리",  type: "정보형", reason: "관리 유지층 · 경쟁 낮음" },
    ];
    // 감기·호흡기 (disease)
    if (cat === "감기·호흡기" || /감기|몸살|기침/.test(nm)) return [
      { suffix: "증상 오래갈 때 안내",  type: "정보형", reason: "장기 증상 탐색층 · 정보 공백" },
      { suffix: "진료 필요 시점 정리",  type: "정보형", reason: "진료 결정 탐색층 · 경쟁 낮음" },
      { suffix: "확인 항목 안내",       type: "정보형", reason: "증상 확인층 · 체류시간 높음" },
    ];
    // 생활증상 (disease)
    if (cat === "생활증상" || /만성피로|어지럼|두통|수면/.test(nm)) return [
      { suffix: "원인 확인 안내",       type: "정보형", reason: "원인 탐색층 · 정보 공백" },
      { suffix: "진료 필요 시점 정리",  type: "정보형", reason: "진료 결정 탐색층 · 경쟁 낮음" },
      { suffix: "생활 기록 확인 안내",  type: "정보형", reason: "관리 탐색층 · 체류시간 높음" },
    ];
    // 기본값
    return [
      { suffix: "확인 항목 정리",       type: "정보형", reason: "정보 공백 · 경쟁 낮음" },
      { suffix: "진료 필요 시점 안내",  type: "정보형", reason: "진료 결정 탐색층 · 전환율 높음" },
      { suffix: "진행 과정 안내",       type: "정보형", reason: "증상 확인층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "legal" ? (() => {
    // ─── 법무사 (v142) ─── 정보형 suffix만. ⚠️ 후기형("혼자 고민하다","두려워서 미루다") 전면 배제 (기관 화자 §철학)
    const cat = treatmentData?.cat || "";
    const nm  = treatmentData?.name || "";
    // 회생·파산 — 절차 순서/신청 전 확인
    if (cat === "회생·파산" || /회생|파산/.test(nm)) return [
      { suffix: "신청 전 확인사항",        type: "정보형", reason: "신청 검토층 · 정보 공백" },
      { suffix: "절차 순서 정리",          type: "정보형", reason: "절차 탐색층 · 체류시간 높음" },
      { suffix: "준비서류 정리",           type: "정보형", reason: "서류 탐색층 · 경쟁 낮음" },
    ];
    // 상속 — 기한/준비서류
    if (cat === "상속" || /상속|한정승인/.test(nm)) return [
      { suffix: "기한 확인사항",           type: "정보형", reason: "기한 임박층 · 전환율 높음" },
      { suffix: "준비서류 정리",           type: "정보형", reason: "서류 탐색층 · 경쟁 낮음" },
      { suffix: "절차 순서 안내",          type: "정보형", reason: "절차 탐색층 · 체류시간 높음" },
    ];
    // 보전·집행 (v150) — 가압류·가처분·지급명령·공탁: 신청 절차/요건 탐색
    if (cat === "보전·집행" || /가압류|가처분|지급명령|공탁/.test(nm)) return [
      { suffix: "신청 절차 정리",          type: "정보형", reason: "신청 검토층 · 정보 공백" },
      { suffix: "준비서류 확인사항",       type: "정보형", reason: "서류 탐색층 · 경쟁 낮음" },
      { suffix: "신청 전 따져볼 점",        type: "정보형", reason: "요건 탐색층 · 체류시간 높음" },
    ];
    // 가족관계 (v150) — 가족관계정정: 정정 사유/절차 탐색
    if (cat === "가족관계" || /가족관계|등록부/.test(nm)) return [
      { suffix: "정정 절차 정리",          type: "정보형", reason: "정정 검토층 · 정보 공백" },
      { suffix: "준비서류 안내",           type: "정보형", reason: "서류 탐색층 · 경쟁 낮음" },
      { suffix: "사유별 진행 방법",        type: "정보형", reason: "사유 탐색층 · 체류시간 높음" },
    ];
    // 등기·법인 (기본) — 준비서류/절차
    return [
      { suffix: "준비서류 정리",           type: "정보형", reason: "서류 탐색층 · 경쟁 낮음" },
      { suffix: "절차 순서 안내",          type: "정보형", reason: "절차 탐색층 · 체류시간 높음" },
      { suffix: "기한 확인사항",           type: "정보형", reason: "기한 탐색층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "cafe" ? (() => {
    // ─── 카페 (v2 메뉴 중심 재설계) ─── 계열별 3분기 (cafe-data.js의 CAFE_LONGTAIL_SUFFIXES와 일치)
    const cat = treatmentData?.cat || "";

    // 커피 (coffee)
    if (cat === "커피") return [
      { suffix: "작업하기 좋은 자리 안내",       type: "롱테일", reason: "작업 카페 탐색층 · 체류시간 높음" },
      { suffix: "오래 머물기 좋은 곳 안내",      type: "롱테일", reason: "체류 부담 탐색층 · 경쟁 낮음" },
      { suffix: "커피 메뉴 안내",               type: "롱테일", reason: "커피 메뉴 탐색층 · 전환율 높음" },
    ];
    // 디저트 (dessert) — 빙수 포함
    if (cat === "디저트") return [
      { suffix: "대표 디저트 안내",             type: "롱테일", reason: "디저트 탐색층 · 체류시간 높음" },
      { suffix: "데이트하기 좋은 곳 안내",       type: "롱테일", reason: "데이트 코스 탐색층 · 전환율 높음" },
      { suffix: "디저트 메뉴 소개",             type: "롱테일", reason: "디저트 메뉴 탐색층 · 경쟁 낮음" },
    ];
    // 브런치 (brunch)
    if (cat === "브런치") return [
      { suffix: "브런치 메뉴 안내",             type: "롱테일", reason: "브런치 탐색층 · 체류시간 높음" },
      { suffix: "주말 가기 좋은 곳 안내",        type: "롱테일", reason: "주말 약속 탐색층 · 전환율 높음" },
      { suffix: "메뉴 구성 정리",               type: "롱테일", reason: "브런치 구성 탐색층 · 경쟁 낮음" },
    ];
    // 카페 기본값 (cat 미감지 시)
    return [
      { suffix: "방문 정보 안내",               type: "롱테일", reason: "방문 정보 탐색층 · 경쟁 낮음" },
      { suffix: "메뉴 안내",                    type: "롱테일", reason: "메뉴 탐색층 · 전환율 높음" },
      { suffix: "운영 정보 안내",               type: "롱테일", reason: "운영 정보 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "restaurant" ? (() => {
    // ─── 맛집·식당 (Phase 9.5 — 조합형 검색의도 SEO) ───
    // PHILOSOPHY 2-1: 지역+행동+상황+목적. 브랜드 노출 X.
    const cat  = treatmentData?.cat || "";
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // 한식 국물요리 (순대국·국밥·해장국·갈비탕)
    if (menu === "순대국" || menu === "국밥" || menu === "해장국" || menu === "갈비탕") return [
      { suffix: "국물 솔직 후기",               type: "후기형", reason: "국물 탐색층 · 공감 높음" },
      { suffix: "혼밥하기 좋은 자리 정리",       type: "롱테일", reason: "혼밥층 탐색 · 경쟁 낮음" },
      { suffix: "해장하러 다녀온 후기",          type: "후기형", reason: "해장 탐색층 · 전환율 높음" },
      { suffix: "비 오는 날 다녀온 후기",       type: "롱테일", reason: "상황 탐색층 · 체류 높음" },
    ];

    // 분식 (떡볶이·김밥·튀김·순대·어묵·라면)
    if (cat === "분식" || menu === "맵고떡볶이" || menu === "로제떡볶이" || menu === "꼬마김밥" || menu === "모둠튀김" || menu === "어묵" || menu === "라면") return [
      { suffix: "메뉴 정리",                    type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "포장 정보 정리",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
      { suffix: "주문 메뉴 소개",               type: "소개형", reason: "메뉴 탐색층 · 정보 공백" },
      { suffix: "위치 안내",                    type: "롱테일", reason: "위치 탐색층 · 방문 직전" },
    ];

    // 한식 (기본)
    if (cat === "한식") return [
      { suffix: "동네 한식집 솔직 후기",        type: "후기형", reason: "동네 탐색층 · 공감 높음" },
      { suffix: "반찬 가짓수 정리",             type: "롱테일", reason: "반찬 탐색층 · 경쟁 낮음" },
      { suffix: "가족모임 다녀온 후기",         type: "후기형", reason: "가족 외식 탐색층 · 전환율 높음" },
    ];

    // 맛집 기본값
    return [
      { suffix: "솔직 방문 후기",               type: "후기형", reason: "후기 공백 · 경쟁 낮음" },
      { suffix: "재방문 의사 정리",             type: "후기형", reason: "재방문 탐색층 · 전환율 높음" },
      { suffix: "운영 정보 솔직 후기",          type: "롱테일", reason: "운영 정보 탐색층 · 체류시간 높음" },
    ];
  })() : detectedIndustry === "chinese" ? (() => {
    // ─── 중식·중화요리 (신규, 정보형·메뉴 중심) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // 면·밥 (짜장면·짬뽕·볶음밥 등)
    if (/짜장|짬뽕|볶음밥|잡채밥/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "롱테일", reason: "점심 탐색층 · 방문 직전" },
      { suffix: "혼밥 메뉴 정리",               type: "소개형", reason: "혼밥 탐색층 · 정보 공백" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // 요리·딤섬 (탕수육·깐풍기·양장피·동파육·샤오롱바오 등)
    return [
      { suffix: "나눠 먹기 좋은 메뉴 안내",     type: "소개형", reason: "모임 탐색층 · 정보 공백" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
      { suffix: "가족 외식 메뉴 안내",          type: "롱테일", reason: "가족 외식 탐색층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "korean" ? (() => {
    // ─── 한식 (신규, 정보형·메뉴 중심) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // 국물·밥·면 (국밥·순대국·김치찌개·칼국수·비빔밥 등)
    if (/국밥|순대국|해장국|갈비탕|설렁탕|곰탕|칼국수|냉면|찌개|비빔밥|삼계탕|술국/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "롱테일", reason: "점심 탐색층 · 방문 직전" },
      { suffix: "혼밥 메뉴 정리",               type: "소개형", reason: "혼밥 탐색층 · 정보 공백" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // 고기·볶음 (수육·머릿고기·제육볶음·불고기 등)
    return [
      { suffix: "나눠 먹기 좋은 메뉴 안내",     type: "소개형", reason: "모임 탐색층 · 정보 공백" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
      { suffix: "가족 외식 메뉴 안내",          type: "롱테일", reason: "가족 외식 탐색층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "snack" ? (() => {
    // ─── 분식 (신규, 정보형·메뉴 중심·class 4축) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    // class SoT: soup(국물)·meat(양념·볶음·튀김)·rice(밥)·noodle(면)
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // soup — 국물류 (라면·우동·어묵·국물떡볶이·잔치국수)
    if (/라면|우동|어묵|국물떡볶이|잔치국수/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "혼밥 메뉴 안내",               type: "소개형", reason: "혼밥 탐색층 · 정보 공백" },
      { suffix: "간단한 한 끼 정리",            type: "롱테일", reason: "간식 탐색층 · 방문 직전" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // noodle — 면류 (쫄면·비빔국수)
    if (/쫄면|비빔국수/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "혼밥 메뉴 안내",               type: "소개형", reason: "혼밥 탐색층 · 정보 공백" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
    ];

    // rice — 밥류 (김밥)
    if (/김밥/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
      { suffix: "간단한 한 끼 정리",            type: "롱테일", reason: "간식 탐색층 · 방문 직전" },
    ];

    // meat — 양념·볶음·튀김 (떡볶이·라볶이·튀김·순대·돈가스)
    return [
      { suffix: "나눠 먹기 좋은 메뉴 안내",     type: "소개형", reason: "모임 탐색층 · 정보 공백" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
      { suffix: "간식 메뉴 안내",               type: "롱테일", reason: "간식 탐색층 · 전환율 높음" },
    ];
  })() : detectedIndustry === "japanese" ? (() => {
    // ─── 일식 (신규, 정보형·메뉴 중심·cat 4계열) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    // cat SoT: 스시(신선도)·면(육수)·튀김(튀김옷)·덮밥(밥+토핑)
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // 스시 — 초밥·사시미·회덮밥
    if (/초밥|사시미|회덮밥/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "소개형", reason: "점심 탐색층 · 정보 공백" },
      { suffix: "가족 외식 메뉴 안내",          type: "롱테일", reason: "가족 외식 탐색층 · 전환율 높음" },
    ];

    // 면 — 라멘·우동·소바
    if (/라멘|우동|소바/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "혼밥 메뉴 안내",               type: "소개형", reason: "혼밥 탐색층 · 정보 공백" },
      { suffix: "점심 메뉴 안내",               type: "롱테일", reason: "점심 탐색층 · 방문 직전" },
    ];

    // 튀김 — 돈카츠·텐푸라·가라아게
    if (/돈카츠|텐푸라|가라아게/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // 덮밥 — 규동·가츠동·오야코동·카레
    return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "소개형", reason: "점심 탐색층 · 정보 공백" },
      { suffix: "혼밥 메뉴 안내",               type: "롱테일", reason: "혼밥 탐색층 · 방문 직전" },
    ];
  })() : detectedIndustry === "chicken" ? (() => {
    // ─── 치킨 (신규, 정보형·메뉴 중심·cat 4계열) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    // cat SoT: fried(순수튀김)·seasoned(소스결)·oven(구운결)·special(구성형)
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // fried — 후라이드치킨
    if (/후라이드/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "야식 메뉴 안내",               type: "소개형", reason: "야식 탐색층 · 정보 공백" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // seasoned — 양념·간장·마늘·허니·고추
    if (/양념|간장|마늘|허니|고추/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "배달 메뉴 안내",               type: "소개형", reason: "배달 탐색층 · 방문 직전" },
      { suffix: "야식 메뉴 안내",               type: "롱테일", reason: "야식 탐색층 · 정보 공백" },
    ];

    // oven — 오븐·로스트
    if (/오븐|로스트/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // special — 순살·반반·닭강정·윙봉세트
    return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "가족 외식 메뉴 안내",          type: "소개형", reason: "가족 외식 탐색층 · 전환율 높음" },
      { suffix: "세트 구성 안내",               type: "롱테일", reason: "구성 탐색층 · 방문 직전" },
    ];
  })() : detectedIndustry === "western" ? (() => {
    // ─── 양식 (신규, 정보형·메뉴 중심·cat 4계열) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    // cat SoT: 면(파스타·라자냐·뇨끼)·밥(리소토/필라프/오므라이스)·고기(스테이크/함박/돈가스)·단품(피자·그라탕)
    const menu = treatmentData?.menu || treatmentData?.menuRef || "";

    // 면 — 파스타·라자냐·뇨끼
    if (/파스타|라자냐|뇨끼/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "소개형", reason: "점심 탐색층 · 정보 공백" },
      { suffix: "혼밥 메뉴 안내",               type: "롱테일", reason: "혼밥 탐색층 · 방문 직전" },
    ];

    // 밥 — 리소토·필라프·오므라이스
    if (/리소토|필라프|오므라이스/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "점심 메뉴 안내",               type: "소개형", reason: "점심 탐색층 · 정보 공백" },
      { suffix: "포장 정보 안내",               type: "롱테일", reason: "포장 탐색층 · 전환율 높음" },
    ];

    // 고기 — 스테이크·함박스테이크·돈가스
    if (/스테이크|함박스테이크|돈가스/.test(menu)) return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "가족 외식 메뉴 안내",          type: "롱테일", reason: "가족 외식 탐색층 · 전환율 높음" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성 탐색층 · 경쟁 낮음" },
    ];

    // 단품 — 피자·그라탕 (default 폴백)
    return [
      { suffix: "메뉴 정보 정리",               type: "롱테일", reason: "메뉴 탐색층 · 경쟁 낮음" },
      { suffix: "나눠 먹기 좋은 메뉴 안내",     type: "롱테일", reason: "여럿이 나눔 탐색층 · 전환율 높음" },
      { suffix: "가족 외식 메뉴 안내",          type: "소개형", reason: "가족 외식 탐색층 · 정보 공백" },
    ];
  })() : detectedIndustry === "meat" ? (() => {
    // ─── 고깃집 (신규, 정보형·방문목적 중심·cat 단일) ───
    // PHILOSOPHY 2-1: 지역+메뉴+상황. 브랜드 노출 X. 효능 표현 X.
    // cat 단일(고깃집) — 메뉴별 분기 대신 방문목적형 suffix 1세트. SCENE=불판/굽기/쌈(국물 ritual 분리).
    // MEAT_LONGTAIL_SUFFIXES.meat 결 정합(회식·가족외식·주차·한잔·여럿).
    return [
      { suffix: "회식 자리 메뉴 안내",          type: "소개형", reason: "회식 탐색층 · 전환율 높음" },
      { suffix: "가족 외식 메뉴 안내",          type: "롱테일", reason: "가족 외식 탐색층 · 정보 공백" },
      { suffix: "곁들임 메뉴 정리",             type: "롱테일", reason: "구성(쌈·반찬) 탐색층 · 경쟁 낮음" },
      { suffix: "주차 정보 안내",               type: "롱테일", reason: "방문 직전 탐색층 · 방문 직전" },
    ];
  })() : [
    { suffix: "붓기 회복 일지",           type: "롱테일", reason: "성형 회복 정보 검색 多 · 경쟁 낮음" },
    { suffix: "붓기 멍 기간",             type: "롱테일", reason: "시술 전 불안 검색 · 체류시간 높음" },
    { suffix: "처음 상담 후기",           type: "후기형", reason: "상담 고민층 타겟 · 전환율 높음" },
    { suffix: "솔직 후기",               type: "후기형", reason: "신뢰형 검색어 · 광고글 회피층" },
    { suffix: "30대 경험담",             type: "롱테일", reason: "연령대 타겟 · 경쟁 낮음" },
  ];

  // compareWith — 업종별 기본값
  const compareWithText  = treatmentData?.compareWith
    || (detectedIndustry === "dental"  ? "틀니"
      : detectedIndustry === "ent"     ? "약물치료"
      : detectedIndustry === "urology"  ? "약물치료"
      : detectedIndustry === "oriental" ? "양방치료"
      : detectedIndustry === "ortho"    ? "수술치료"
      : detectedIndustry === "pediatrics" ? "경과 관찰"   // [v2] 경계 정합 — 응급 프레이밍 제거. 실제 비교는 pediatrics-v2-data.compareWith SoT
      : detectedIndustry === "gastro"      ? "경과 관찰"
      : detectedIndustry === "pulmo"       ? "경과 관찰"
      : detectedIndustry === "card"        ? "경과 관찰"
      : detectedIndustry === "endo"        ? "경과 관찰"
      : detectedIndustry === "general"     ? "생활습관 교정만"
      : detectedIndustry === "obgyn"       ? "경과 관찰"   // [v2] 도달 시 무해 — 실제 비교는 obgyn-v2-data.compareWith SoT
      : detectedIndustry === "pain"        ? "수술치료"
      : detectedIndustry === "neuro"       ? "신경차단술"
      : detectedIndustry === "psy"         ? "경과 관찰"   // [v2] 경계 정합 — 타 기관(상담센터) 비교 금지
      : detectedIndustry === "eye"         ? "안저검사"
      : detectedIndustry === "family"      ? "만성질환 정기검사"   // [V2 재설계] "생활습관 교정만" → 타 접근 폄훼 소지 제거
      : detectedIndustry === "cafe"        ? "프랜차이즈 카페"
      : detectedIndustry === "legal"       ? "직접 진행(셀프등기)"
      : "울쎄라");
  const compareWithText2 = detectedIndustry === "dental"   ? "브릿지"
                         : detectedIndustry === "ent"      ? "수술치료"
                         : detectedIndustry === "urology"  ? "수술치료"
                         : detectedIndustry === "oriental" ? "정형외과치료"
                         : detectedIndustry === "pediatrics" ? "소아혈액검사"   // [v2] 경계 정합
                         : detectedIndustry === "gastro"      ? "CT 검사"
                         : detectedIndustry === "pulmo"       ? "흉부 CT"
                         : detectedIndustry === "card"        ? "심장초음파"
                         : detectedIndustry === "endo"        ? "갑상선기능검사"
                         : detectedIndustry === "general"     ? "건강기능식품"
                         : detectedIndustry === "obgyn"       ? "골반MRI"   // [v2 교체 2026-07-13] 수술 → 검사(경계 정합)
                         : detectedIndustry === "pain"        ? "물리치료"
                         : detectedIndustry === "neuro"       ? "경막외신경성형술"
                         : detectedIndustry === "psy"         ? "주의력검사"   // [v2] 경계 정합 — 약물 언급 금지
                         : detectedIndustry === "eye"         ? "안압검사"
                         : detectedIndustry === "family"      ? "경과 관찰"   // [V2 재설계] "건강기능식품" → 비급여·효능 서술 유발 제거
                         : detectedIndustry === "cafe"        ? "동네 일반 카페"
                         : detectedIndustry === "legal"       ? "위임 진행"
                         : "써마지";
  const COMPARE_SUFFIXES = [
    { suffix: `vs ${compareWithText} 비교`,  type: "비교형", reason: "비교 탐색층 · 결정 직전 독자" },
    { suffix: `vs ${compareWithText2} 차이`, type: "비교형", reason: "비교 검색 많음 · 체류시간 길음" },
  ];

  // keyword 자체가 "서초 임플란트"처럼 region 포함한 경우 중복 방지
  const base = keyword.includes(treatmentName) ? keyword : (region ? `${region} ${treatmentName}` : treatmentName);

  let suggestions = [];

  if (competition === "높음") {
    // 경쟁 높음 → 롱테일 강력 추천
    suggestions = [
      ...LONGTAIL_SUFFIXES.slice(0, 2).map((s, i) => ({
        keyword:     `${base} ${s.suffix}`,
        type:        s.type,
        competition: "낮음",
        reason:      s.reason,
        recommended: i === 0,
      })),
      hasCompare ? null : {
        keyword:     `${base} ${COMPARE_SUFFIXES[0].suffix}`,
        type:        "비교형",
        competition: "중간",
        reason:      COMPARE_SUFFIXES[0].reason,
        recommended: false,
      },
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "원본 키워드 그대로 (경쟁 높음)",
        recommended: false,
      },
    ].filter(Boolean);
  } else if (competition === "중간") {
    suggestions = [
      {
        keyword:     `${base} ${LONGTAIL_SUFFIXES[0].suffix}`,
        type:        "롱테일",
        competition: "낮음",
        reason:      LONGTAIL_SUFFIXES[0].reason,
        recommended: true,
      },
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "현재 키워드 (경쟁 중간)",
        recommended: false,
      },
      {
        keyword:     `${base} ${COMPARE_SUFFIXES[0].suffix}`,
        type:        "비교형",
        competition: "중간",
        reason:      COMPARE_SUFFIXES[0].reason,
        recommended: false,
      },
    ];
  } else {
    // 이미 낮음 → 원본 추천 + 추가 변형 1개
    suggestions = [
      {
        keyword:     keyword,
        type:        "원본",
        competition: competition,
        reason:      "이미 좋은 롱테일 키워드 ✅",
        recommended: true,
      },
      {
        keyword:     `${base} ${LONGTAIL_SUFFIXES[2].suffix}`,
        type:        "후기형",
        competition: "낮음",
        reason:      LONGTAIL_SUFFIXES[2].reason,
        recommended: false,
      },
    ];
  }

  return { competition, suggestions, keyword };
}

  // 키워드 경쟁 분석 → 우측 패널 분석 카드 표시 (완전 내부 로직 — API/GPT 비용 없음)
  const analyzeKeyword = (parsed, text) => {
    const keyword = `${parsed.region} ${parsed.treatmentName}`.trim();
    const analysis = analyzeKeywordLocal(keyword, parsed.treatmentName, parsed.region);

    // [v130] AnalysisBoard(추천 글 방향) = 현재 운영 플로우에서 미사용(죽은 화면).
    //   반장 확정: 시술선택 → "글 작성하기" → 방향 선택 없이 추천(★) 방향 자동선택 → generating 직행.
    //   (v125가 끈 자동스킵을 의도적으로 복구. 방향 기준 = 추천 ★ 고정, 없으면 suggestions[0].)
    //   stage="analysis" 진입 제거. handleAnalysisSelect 즉시 호출 → 그 안의 quota/region 가드는 그대로 동작.
    const ctx = { ...analysis, parsed, text };
    setAnalysisData(ctx);
    const sugg = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];
    const autoPick = sugg.find(s => s && s.recommended) || sugg[0] || null;
    if (autoPick) {
      // 추천 방향으로 즉시 생성(보드 미경유). region 없으면 handleAnalysisSelect 내부에서 needRegion 처리(안전망).
      handleAnalysisSelect(autoPick, ctx, null);
    } else {
      // ⚠️ [v131] DEAD CODE(도달불가) — suggestions는 analyzeKeywordLocal에서 if(높음)/elseif(중간)/else(낮음)
      //   3분기 모두 배열을 채워 빈 배열 반환 불가 → autoPick 항상 truthy → 이 폴백은 실행되지 않음.
      //   삭제 보류(오픈 전 리팩터). 생성불가 상태 회피용 안전 가드로만 존치.
      // suggestions가 비는 예외 — 기존 보드 폴백(생성 불가 상태 회피).
      setStage("analysis");
      const cl = COMPETITION_LABEL[analysis.competition] || COMPETITION_LABEL["중간"];
      addMsg({
        role: "assistant",
        text: `${cl.emoji} "${keyword}" 분석 완료
오른쪽에서 글 방향을 선택해주세요.`,
      });
    }
  };

  // 분석 결과에서 전략 선택 → 생성
  const handleAnalysisSelect = async (s, analysisCtx, regionOverride) => {
    const { parsed, text } = analysisCtx;
    const newParsed      = parseNaturalInput(s.keyword);
    const finalRegion    = regionOverride || parsed.region || newParsed.region || (hubStore?.region || "").trim();
    // [menu-map fix] 카드 클릭이 들고온 진짜 program.id(parsed.treatmentId)를 최우선 사용.
    //   기존: newParsed(s.keyword 재파싱) 우선 → 한식 메뉴(삼계탕/제육 등) 재파싱 실패/오매칭 시
    //         allT 첫매칭(국밥)으로 떨어져 program.id가 국밥으로 고정되던 치명버그.
    //   parsed.treatmentId는 TreatmentSelectBoard onComplete→analyzeKeyword로 보존돼 온 t.id(정답).
    //   재파싱(newParsed)은 채팅 자유입력 등 parsed.id가 없는 경로의 폴백으로만 사용.
    const finalTreatment = parsed.treatmentId  || newParsed.treatmentId;
    const finalName      = parsed.treatmentName || newParsed.treatmentName;
    // [WIRING-01C] 장례식장명 = 사용자가 명시 입력한 사실값. 검색어 재파싱(newParsed) 결과가 아니다.
    //   → parsed 단일 소스에서만 읽고, newParsed 폴백을 두지 않는다(삭제·변경 불가).
    const finalHallName  = (parsed.hallName || "").trim();
    // [WIRING-03] INTENT id 도 동일 원칙 — parsed 단일 소스. 재파싱 폴백을 두지 않는다.
    const finalIntentId  = (parsed.intentId || "").trim();
    const autoBlogType   = s.type === "비교형" ? "compare"
                         : s.type === "후기형" ? "review"
                         : parseBlogTypeFromText(text);
    const autoTarget     = parseTargetFromText(s.keyword + " " + text);
    const overrideTitle  = s.overrideTitle || null; // 추천 제목 클릭 시 전달

    // [v125] 진단 로그 — 순대국 fallback 지점 특정. newParsed(s.keyword 재파싱) vs parsed(원본) 분리.
    //   비정상: finalName="순대국" / industry=restaurant인데 메뉴 미반영 / 업체명 없음.
    //   정상: finalName=떡볶이·튀김·순대·어묵·김밥 계열 / region=중랑구(묵동) / store_name=맵꼬…
    console.log("[GENERATE_PAYLOAD_CHECK]", {
      industry: CURRENT_INDUSTRY,
      "s.keyword": s.keyword,
      "newParsed.id": newParsed.treatmentId, "newParsed.name": newParsed.treatmentName,
      "parsed.id": parsed?.treatmentId, "parsed.name": parsed?.treatmentName,
      finalTreatment, finalName, finalRegion,
      store_name: (hubStore?.store_name || "(없음)"),
      store_region: (hubStore?.region || "(없음)"),
      store_sub: (hubStore?.sub_region || "(없음)"),
    });

    // 지역 없으면 → AnalysisBoard에 지역 입력 요청 (생성 중단)
    if (!finalRegion) {
      setAnalysisData(prev => ({ ...prev, needRegion: true, pendingSelection: s }));
      return;
    }

    setAnalysisData(null);
    setSelectedStrategyIdx(null);
    const displayTitle = overrideTitle || `${finalRegion} ${finalName}`;
    // s.keyword 가 이미 region 을 포함하는 경우 중복 prefix 방지
    const userMsgText = overrideTitle
      || (s.keyword.startsWith(finalRegion) ? s.keyword : `${finalRegion} ${s.keyword}`);

    // [v60] quota 가드 — generate 호출·조기 메시지·stage 전환 '이전'에 차단.
    //   여기서 막아야 진행바(generating)도 안 뜨고 /api/generate 호출(토큰 발생)도 없음.
    //   generate 내부 가드는 재생성/이어쓰기 등 다른 진입 경로 보호용으로 유지.
    if (!authChecked) {
      addMsg({ role: "coach", text: "세션 확인 중입니다. 잠시 후 다시 시도해주세요." });
      return;
    }
    if (!authUserId) { setQuotaModal({ type: "login_required" }); return; }
    try {
      const { status: cqStatus, json: cqJson } = await generateApi.checkGenerateQuota(authUserId);
      if (cqStatus === 404 || cqJson.reason === "ACCOUNT_NOT_FOUND") { setQuotaModal({ type: "not_found", detail: cqJson }); return; }
      if (cqJson.reason === "ACCOUNT_INACTIVE") { setQuotaModal({ type: "inactive", detail: cqJson }); return; }
      if (cqJson.allowed === false && cqJson.reason === "QUOTA_EXCEEDED") {
        setQuotaInfo(cqJson); goCoachBg(); setQuotaModal({ type: "quota_exceeded", detail: cqJson }); return;
      }
      if (cqJson.allowed !== true) { addMsg({ role: "coach", text: `생성 권한 확인 실패: ${cqJson.reason || "UNKNOWN"}` }); return; }
      setQuotaInfo(cqJson);
    } catch (e) {
      console.error("[check-quota:handleSend] network error:", e);
      addMsg({ role: "coach", text: `생성 권한 확인 네트워크 오류: ${e.message || e}` });
      return;
    }

    addMsg({ role: "user", text: userMsgText });
    addMsg({ role: "assistant", text: `${displayTitle}\n${BLOGTYPE_LABEL[autoBlogType]} 글로 작성합니다.` });
    setStage("generating");
    generate(finalTreatment, finalRegion, autoBlogType, autoTarget, overrideTitle, finalName, finalHallName, finalIntentId);
  };

  // ─────────────────────────────────────────────────────────
  // [v7] Intent Layer — parseNaturalInput 앞단 (엔진 무수정 · 통과형)
  //   6종 키워드 매칭 → 화면 라우팅. 안 걸리면 전부 writer(=기존 흐름) 통과.
  //   원칙: 모르면 writer / 막지 말고 생성 / 저장·발행에서 로그인
  // ─────────────────────────────────────────────────────────
  // [v23] 시스템 명령 정확매칭 테이블 — 최우선. 글쓰기 플로우 중이어도 강제 전환.
  //   한 단어 명령(관측/마이/사용량/홈/옵저버/최근발행)은 정확 일치로만 인식 → 오발동 차단.
  const SYS_CMD = {
    "홈": "home", "운영홈": "home", "대시보드": "home",
    "관리": "manage", "운영관리": "manage", "관리페이지": "manage",
    "마이": "account", "마이페이지": "account", "내정보": "account",
    "관측": "survival",
    "운영현황": "stats", "현황": "stats", "통계": "stats", "분포": "stats", "월간발행계획": "stats", "발행계획": "stats",
    "코치": "coach", "운영코치": "coach", "발행코치": "coach", "추천": "coach",
    "사용량": "account",
    "최근발행": "posts", "최근글": "posts", "최근": "posts",
    "이용내역": "account", "사용내역": "account", "작업기록": "account", "내역": "account",
    "요금제": "plans", "플랜": "plans",
    "업체정보": "store", "업체": "store", "사업장정보": "store", "매장정보": "store",
  };
  const classifyIntent = (text) => {
    const raw = (text || "").trim();
    // 1) 정확매칭 시스템 명령 — 글쓰기 플로우보다 선행
    if (Object.prototype.hasOwnProperty.call(SYS_CMD, raw)) return SYS_CMD[raw];
    const t = raw.toLowerCase();
    if (/^\[수정요청\]|^\[기능제안\]/.test(raw))               return "feedback";
    if (/운영코치|발행코치|코치|추천\s*행동|공백\s*주제/.test(t))        return "coach";
    if (/운영\s*현황|월간\s*발행\s*계획|발행\s*계획|통계|분포|키워드\s*분포|지역\s*분포/.test(t)) return "stats";
    if (/사용량|quota|남은|몇\s*개|한도/.test(t))              return "account";
    if (/관측|순위|상태|survival|유지/.test(t))                return "survival";
    if (/이용\s*내역|사용\s*내역|작업\s*기록|생성\s*내역|생성\s*기록/.test(t)) return "account";
    if (/최근글|내\s*글|발행\s*목록|내가\s*쓴|최근발행|마이페이지/.test(t)) return "posts";
    if (/업체\s*정보|사업장\s*정보|매장\s*정보|업체\s*수정/.test(t))  return "store";
    if (/요금제|플랜|결제|구독/.test(t))                       return "plans";
    if (/내\s*정보|계정|프로필/.test(t))                       return "account";
    if (/로그인|로그아웃/.test(t))                             return "login";
    return "writer"; // 그 외 전부 기존 parseNaturalInput으로
  };

  // [v7] intent → 우측 result 패널 전환 (페이지 이동 없음). 좌측 대화창 고정.
  //   login만 /login 이동 허용. writer는 기존 생성기 흐름으로 복귀.
  //   usage/survival/posts/account/plans → resultTab='nav' + navView 설정.
  //   (로그인 게이트는 패널 내부에서 안내 — 미로그인이라도 패널은 열림)
  const routeIntent = (intent) => {
    setShowHome(false);  // [v89] 메뉴/탭 라우팅 = 랜딩 해제(로고 클릭으로만 랜딩 진입)
    // [v38] 메뉴/탭 클릭 시 인라인 로그인폼은 닫는다(로그인 진입은 login intent에서만).
    //   → 로그인폼이 떠 있어도 발행비율설정 등 메뉴를 누르면 미리보기로 전환된다.
    if (intent !== "login") setShowLogin(false);
    // [v28] 좌측 도움말 토글 — 5개 작업 탭은 클릭 시 좌측에 사용법 표시, 같은 탭 재클릭 시 대화창 복귀.
    //   우측(작업화면) 라우팅은 종전대로 진행. 좌측만 도움말/대화창 전환.
    const HELP_TABS = ["writer", "stats", "coach", "posts", "survival", "store", "account", "plans"];
    if (HELP_TABS.includes(intent)) {
      setHelpTab((prev) => (prev === intent ? null : intent));
    } else {
      setHelpTab(null); // 홈/글쓰기/마이페이지/요금제 등은 대화창 유지
    }
    if (intent === "login") { router.push("/login"); return; }
    if (intent === "feedback") {
      // 베타 피드백 — 현재는 접수 안내만. 정식 저장(요청번호·상태관리)은 feedback 테이블 도입 시 연결.
      setNavView(null);
      setResultTab("blog");
      addMsg({ role: "assistant",
        text: "의견 감사합니다. 접수되었습니다. 검토 후 반영하겠습니다.\n(베타 단계 — 처리 현황 화면은 곧 제공됩니다.)" });
      return;
    }
    if (intent === "writer") {
      // 글쓰기 — 기존 생성기 화면으로 복귀
      setNavView(null);
      setResultTab("blog");
      return;
    }
    if (intent === "home") {
      // [v23] 운영 홈(본문 welcome) 복귀 — 글쓰기 플로우 중이어도 강제 전환
      setNavView(null);
      setResultTab("blog");
      setStage("welcome");
      return;
    }
    if (intent === "manage") {
      // [v86] 관리 = 발행코치(coach) 탭 진입과 동일 취급.
      //   상단 '관리'와 내부 'AI 발행코치' 탭이 같은 화면이므로 좌측 코치 안내도 동일하게(helpTab=coach).
      setHelpTab("coach");
      setNavView("coach");
      setResultTab("nav");
      if (authUserId && hubPosts === null && !hubLoading) fetchHub();
      return;
    }
    if (intent === "plans" || intent === "survival"
        || intent === "posts" || intent === "account" || intent === "coach"
        || intent === "stats" || intent === "store") {
      // [v127] 업체정보 미확정(최초등록) 진입 → 좌측 업종 트리부터 노출.
      //   navView='store'면 좌측이 안내문(트리 없음)으로 빠져 "왼쪽에서 선택" 이 가리키는 트리가 안 보이는 함정.
      //   트리 선택(onSelect)이 우측 STEP2 폼을 순차 오픈. 확정계정은 종전대로 store.
      // [fix] hubStore===null = 미로딩(온보딩 대상 아님). 로드 후에도 industry 없을 때만 온보딩 트리로.
      // [세션95] 업종 미확정이면 항상 업종센터로 보낸다. hubStore 미로딩(null)도 포함 —
      //   종전에는 null일 때 navView="store"로 빠져 좁은 최초등록 트리가 뜨는 경로가 있었다.
      if (intent === "store" && !(hubStore && hubStore.industry)) {
        if (hubStore === null && authUserId && !hubLoading) fetchHub();
        setNavView("industry");
        setHelpTab("store");
        setResultTab("nav");
        return;
      }
      setNavView(intent);
      setResultTab("nav");
      // [v19] 허브 데이터 탭 진입 시 1회 lazy load (plans 제외, 로그인 상태에서만)
      if (intent !== "plans" && authUserId && hubPosts === null && !hubLoading) {
        fetchHub();
      }
      return;
    }
  };

  // 네비 버튼 클릭 — 입력 경유 없이 직접 패널 전환 (v6 클릭 새어듦 방지)
  const handleNav = (intent) => {
    routeIntent(intent);
  };

  // [v61] quota 모달 배경 통일 — 모달 띄우기 직전/확인 시 발행코치(글 작성하기) 화면으로.
  //   한도초과 모달 뒤 배경이 안 쓰는 글쓰기 입력(writer/blog/step1)이 되지 않도록.
  const goCoachBg = () => {
    setShowHome(false);
    setShowLogin(false);
    setHelpTab("coach");
    setNavView("coach");
    setResultTab("nav");
    if (authUserId && hubPosts === null && !hubLoading) fetchHub();
  };

  const handleSend = (override) => {
    const text = (typeof override === "string" ? override : input).trim();
    if (!text || loading) return;
    if (helpTab) setHelpTab(null); // [v28] 입력 시 도움말 접고 대화창 표시

    // [v7] Intent Layer — writer 외 의도는 화면 라우팅 후 종료. writer는 통과.
    const intent = classifyIntent(text);
    if (intent !== "writer") {
      setInput("");
      addMsg({ role: "user", text });
      routeIntent(intent);
      return;
    }

    // 가이드/사진편집기/네비 패널에서 입력 시 본문 탭으로 자동 전환
    setShowHome(false);  // [v89] 글 입력 시 랜딩 해제
    if (navView) setNavView(null);
    if (resultTab !== "blog") setResultTab("blog");

    setInput("");
    addMsg({ role: "user", text });

    const parsed = parseNaturalInput(text);

    if (parsed.treatmentId) {
      // [v124] 지역 없으면 업체정보(hubStore.region) 자동 프리필 → 가드 스킵. 그래도 없으면 지역 선택 화면.
      const region2 = parsed.region || (hubStore?.region || "").trim();
      if (!region2) {
        // 지역 없음 → 우측 패널에서 지역 선택 (대화창 질문 없음)
        setPendingTreatment({ id: parsed.treatmentId, name: parsed.treatmentName });
        setStage("treatment");
        addMsg({ role: "assistant", text: `${parsed.treatmentName} 블로그를 작성합니다.\n오른쪽에서 지역을 선택해주세요.` });
        return;
      }
      // 키워드 경쟁 분석 → 전략 제안
      setStage("treatment");
      analyzeKeyword({ ...parsed, region: region2 }, text);

    } else {
      setStage("treatment");
      setShowTreatmentSelect(true); // 우측 패널에 시술 선택 표시
      addMsg({
        role: "assistant",
        text: "어떤 " + lex(CURRENT_INDUSTRY).itemWord + " 블로그를 작성할까요?\n오른쪽에서 " + lex(CURRENT_INDUSTRY).itemWord + "을 선택해주세요.",
      });
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const charCount = result ? calcValidCharCount(result.text) : 0;

  return (
    <>
      <Head>
        <title>AI-POST.AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans KR', sans-serif; background: #f7f7f8; }
          @keyframes bounce  { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
          @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(123,31,162,.35)} 50%{box-shadow:0 0 0 9px rgba(123,31,162,0)} }
          @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
          textarea { outline: none; }
          button { transition: all .15s; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: #d0b8e8; border-radius: 4px; }
        `}</style>
      </Head>

      {/* [PG] 최상위 세로 래퍼 — 좌우 분할(위) + 전체 폭 푸터(아래).
          기존 100vh 가로 flex는 아래 flex:1 자식으로 그대로 이동. 내부 레이아웃 무변경. */}
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f7f7f8" }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", background: "#f7f7f8" }}>

        {/* [v7] 오버레이 폐기 — 네비형 초기 메시지 + Intent Layer가 대체. 렌더 비활성. */}
        {false && authChecked && !authUserId && showExp && (
          null
        )}

        {/* ── 좌측 사이드바 (v25) — 접기/펼치기 · 라벨+아이콘 · handleNav 연동 ──
            메뉴 클릭 = 대화창 'handleNav(intent)' 와 동일 경로. 텍스트 입력(글쓰기/관측/마이페이지…)도
            classifyIntent→routeIntent 로 같은 화면을 연다. 버튼·대화 둘 다 동일 동작. */}
        {(() => {
          // 현재 어떤 메뉴가 활성인지 — resultTab/navView/stage/helpTab 로 역산.
          const activeIntent =
            (helpTab === "manage")                      ? "manage"
            : (helpTab === "guide" || resultTab === "guide") ? "guide"
            : (resultTab === "tools")                   ? "tools"
            : (resultTab === "nav" && navView)          ? navView
            : (resultTab === "blog" && stage === "welcome") ? "home"
            : (resultTab === "blog")                    ? "writer"
            : null;
          // [v124] 좌측 기능 메뉴 전면 제거 — 상단 HUB_TABS·로고(홈)와 100% 중복.
          //   3축 정리: 상단=기능 / 로고=홈 / 좌측=정책·고객지원(푸터). 과거 '사용방법/관리' 구조 폐기.
          //   접근 경로 보존: 홈→로고, 글쓰기·코치→상단 AI글쓰기, 그 외 전부 상단 동일 탭.
          const MENU = [];
          const W = navOpen ? 200 : 60;
          return (
            <div style={{ width: W, flexShrink: 0, background: "#1a1a2e",
              display: "flex", flexDirection: "column", padding: "14px 10px", gap: 6,
              transition: "width .2s ease", overflow: "hidden" }}>

              {/* 로고 + 접기/펼치기 토글 */}
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: navOpen ? "space-between" : "center", marginBottom: 10, minHeight: 36 }}>
                {navOpen && (
                  <div
                    onClick={() => {
                      // [v89] 사이드바 로고 클릭 = 우측 전체 MainHero 랜딩.
                      if (navView) setNavView(null);
                      setResultTab("blog");
                      setStage("welcome");
                      setHelpTab(null);
                      setShowHome(true);
                    }}
                    title="홈으로"
                    style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", cursor: "pointer" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: "linear-gradient(135deg,#9C27B0,#CE93D8)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✦</div>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>AI-POST.AI</span>
                  </div>
                )}
                <button onClick={() => setNavOpen(v => !v)} title={navOpen ? "메뉴 접기" : "메뉴 펼치기"}
                  aria-label={navOpen ? "메뉴 접기" : "메뉴 펼치기"}
                  style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    border: "none", cursor: "pointer", background: "rgba(255,255,255,.06)",
                    color: "#CE93D8", fontSize: 15, fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {navOpen ? "«" : "»"}
                </button>
              </div>

              {/* [v124] 기능 메뉴 제거(상단 HUB·로고와 중복). 좌측은 하단 정책 푸터 전용. */}
              {/* [업종센터] 좌측 세로띠 '🗂️ 업종센터' 진입 버튼(평면 리스트 IndustrySideMenu 폐기).
                   클릭 → navView="industry": 좌측 코치창=IndustryTree(트리) / 우측 작업영역=IndustryDetail(상세).
                   트리 클릭 → industryCenterSel 갱신 → 우측 상세 전환. 채택/잠금은 우측 IndustryDetail이 처리.
                   업종센터 = 전체 catalog 노출(enabled 무관). 실제 채택은 enabled+미확정 계정만(센터 내부 가드). */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 4 }}>
              {(() => {
                const centerActive = (resultTab === "nav" && navView === "industry");
                const openCenter = () => {
                  if (navView === "industry") { setNavView(null); setResultTab("blog"); return; } // 재클릭 = 닫기
                  // [v27] 첫 진입: 확정 계정은 내 업종 상세, 미확정은 빈값(우측 전체 카드 카탈로그).
                  if (!industryCenterSel) {
                    const confirmedId = (hubStore && hubStore.industry) || "";
                    setIndustryCenterSel(confirmedId);
                  }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("industry");
                };
                return (
                  <button type="button" onClick={openCenter}
                    title="업종센터" aria-label="업종센터"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: centerActive ? 800 : 600,
                      color: centerActive ? "#fff" : "#9a9ab5",
                      background: centerActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!centerActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!centerActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>🗂️</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>업종센터</span>}
                  </button>
                );
              })()}
              {/* [v-upjong] 좌측 세로띠 '❓ 내 업종은 없나요?' — 업종센터 바로 아래.
                   이미지 2장(/upjong-1~2.png). 재클릭 = 닫기. 우측 작업화면 유지. */}
              {(() => {
                const upActive = (resultTab === "nav" && navView === "upjong");
                const openUp = () => {
                  if (navView === "upjong") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("upjong");
                };
                return (
                  <button type="button" onClick={openUp}
                    title="내 업종은 없나요?" aria-label="내 업종은 없나요?"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: upActive ? 800 : 600,
                      color: upActive ? "#fff" : "#9a9ab5",
                      background: upActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!upActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!upActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>❓</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>내 업종은 없나요?</span>}
                  </button>
                );
              })()}
              {/* [세션95] 좌측 세로띠 '🤝 운영대행 문의' — '내 업종은 없나요?' 바로 아래.
                   이미지 3장(/daehang-1~3.png). 재클릭 = 닫기. */}
              {(() => {
                const dhActive = (resultTab === "nav" && navView === "daehang");
                const openDh = () => {
                  if (navView === "daehang") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("daehang");
                };
                return (
                  <button type="button" onClick={openDh}
                    title="운영대행 문의" aria-label="운영대행 문의"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: dhActive ? 800 : 600,
                      color: dhActive ? "#fff" : "#9a9ab5",
                      background: dhActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!dhActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!dhActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>🤝</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>운영대행 문의</span>}
                  </button>
                );
              })()}
              {/* [v-editguide] 업종센터(업종 선택) ↔ 글 수정 가이드(작성 도움) 성격 분리선 */}
              <div style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "6px 10px", flexShrink: 0 }} />
              {/* [S132] 좌측 세로띠 '🛡 콘텐츠 오류·수정' — 글 수정 가이드 바로 위.
                   이미지 2장(/sujung-1~2.png). 재클릭 = 닫기. 우측 작업화면 유지. */}
              {(() => {
                const sjActive = (resultTab === "nav" && navView === "sujung");
                const openSj = () => {
                  if (navView === "sujung") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("sujung");
                };
                return (
                  <button type="button" onClick={openSj}
                    title="콘텐츠 오류·수정" aria-label="콘텐츠 오류·수정"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: sjActive ? 800 : 600,
                      color: sjActive ? "#fff" : "#9a9ab5",
                      background: sjActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!sjActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!sjActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>🛡</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>콘텐츠 오류·수정</span>}
                  </button>
                );
              })()}
              {/* [v-editguide] 좌측 세로띠 '✏️ 글 수정 가이드' — 클릭 → 좌측 코치창에 가이드 표시.
                   우측 작업화면은 그대로 둔다(보면서 수정). 재클릭 = 닫기. */}
              {(() => {
                const guideActive = (resultTab === "nav" && navView === "editguide");
                const openGuide = () => {
                  if (navView === "editguide") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("editguide");
                };
                return (
                  <button type="button" onClick={openGuide}
                    title="글 수정 가이드" aria-label="글 수정 가이드"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: guideActive ? 800 : 600,
                      color: guideActive ? "#fff" : "#9a9ab5",
                      background: guideActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!guideActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!guideActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>✏️</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>글 수정 가이드</span>}
                  </button>
                );
              })()}
              {/* [v-blogtitle] 좌측 세로띠 '🎨 블로그 타이틀 꾸미기' — 글 수정 가이드 바로 아래.
                   클릭 → navView="blogtitle": 좌측 코치창에만 표시(예시 이미지). 우측 작업화면은 유지. 재클릭 = 닫기. */}
              {(() => {
                const btActive = (resultTab === "nav" && navView === "blogtitle");
                const openBt = () => {
                  if (navView === "blogtitle") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("blogtitle");
                };
                return (
                  <button type="button" onClick={openBt}
                    title="블로그 타이틀 꾸미기" aria-label="블로그 타이틀 꾸미기"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: btActive ? 800 : 600,
                      color: btActive ? "#fff" : "#9a9ab5",
                      background: btActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!btActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!btActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>🎨</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>블로그 타이틀 꾸미기</span>}
                  </button>
                );
              })()}
              {/* [v-naverguide] 좌측 세로띠 '📗 네이버 발행 가이드' — 이미지 5장(/naver-1~5.png). 재클릭 = 닫기. */}
              {(() => {
                const ngActive = (resultTab === "nav" && navView === "naverguide");
                const openNg = () => {
                  if (navView === "naverguide") { setNavView(null); setResultTab("blog"); return; }
                  setHelpTab(null);
                  setResultTab("nav");
                  setNavView("naverguide");
                };
                return (
                  <button type="button" onClick={openNg}
                    title="네이버 발행 가이드" aria-label="네이버 발행 가이드"
                    style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                      fontSize: 13.5, fontWeight: ngActive ? 800 : 600,
                      color: ngActive ? "#fff" : "#9a9ab5",
                      background: ngActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!ngActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!ngActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>📗</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap" }}>네이버 발행 가이드</span>}
                  </button>
                );
              })()}
              {/* [howto] 사이드바 — 사용방법 / 네이버 발행방법. 클릭 → 우측 메인을 캡처 가이드로 교체. */}
              {(() => {
                // [세션71] 사이드바 4항목 제거 — 같은 설명이 각 메뉴 화면·영상코치에 이미 있어 경로 중복.
                //   렌더·이동 로직(openHowto)은 남겨 둔다. 되돌리려면 아래 배열만 복구.
                //   { id: "why", ic: "✨", label: "왜 다른가요?" },
                //   { id: "howto-write", ic: "📖", label: "사용방법" },
                //   { id: "howto-publish", ic: "📝", label: "네이버 발행방법" },
                //   { id: "howto-title", ic: "🏷️", label: "블로그 타이틀 만드는 법" },
                const items = [];
                const openHowto = (vid) => {
                  if (navView === vid) { setNavView(null); setResultTab("blog"); return; } // 재클릭 = 닫기
                  setHelpTab(null);
                  // [howto-coach] 좌측만 코치(영상)로 전환. 우측 작업 화면은 그대로 둬야
                  //   영상 보면서 바로 따라 할 수 있다. why만 기존 동작(우측 MainHero) 유지.
                  setShowLogin(false);
                  setHowtoItem("");
                  if (vid === "why") { setShowHome(true); setResultTab("nav"); }
                  setNavView(vid);
                };
                return items.map(it => {
                  const act = (navView === it.id) && (it.id === "why" ? resultTab === "nav" : true);
                  return (
                    <button key={it.id} type="button" onClick={() => openHowto(it.id)}
                      title={it.label} aria-label={it.label}
                      style={{ display: "flex", alignItems: "center", gap: navOpen ? 12 : 0,
                        justifyContent: navOpen ? "flex-start" : "center",
                        width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                        border: "none", fontFamily: "inherit", padding: navOpen ? "0 14px" : "0",
                        fontSize: 13.5, fontWeight: act ? 800 : 600,
                        color: act ? "#fff" : "#9a9ab5",
                        background: act ? "rgba(156,39,176,.28)" : "transparent",
                        transition: "background .15s" }}
                      onMouseOver={e => { if (!act) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                      onMouseOut={e => { if (!act) e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{it.ic}</span>
                      {navOpen && <span style={{ whiteSpace: "nowrap" }}>{it.label}</span>}
                    </button>
                  );
                });
              })()}
              {MENU.map((item, idx) => {
                if (item.kind === "divider") {
                  return navOpen ? (
                    <div key={"d" + idx} style={{ display: "flex", alignItems: "center", gap: 8,
                      margin: "10px 6px 4px", color: "#6b6b86", fontSize: 10.5, fontWeight: 800,
                      letterSpacing: 0.6, whiteSpace: "nowrap" }}>
                      <span>{item.label}</span>
                      <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
                    </div>
                  ) : (
                    <div key={"d" + idx} style={{ height: 1, background: "rgba(255,255,255,.10)", margin: "8px 8px" }} />
                  );
                }
                const itemActive = item.action ? (activeIntent === item.action) : (activeIntent === item.intent);
                const onClick = item.action
                  ? () => {
                      // [v28] 사진편집기 — 우측 홈(welcome) 유지. 좌측에 시각 단계 다이어그램(도움말) 토글.
                      //        발행가이드 — 좌측 도움말 + 우측 발행가이드 화면 동시 오픈.
                      if (item.action === "tools") {
                        // [v40] 사진편집기 — 우측 본체(ToolsAccordion) 오픈 + 좌측 도움말 토글.
                        //        비로그인도 전체 기능 테스트 허용. 저장 시점에만 로그인 게이트.
                        if (navView) setNavView(null);
                        setStage("welcome");
                        setShowLogin(false);
                        setResultTab("tools");
                        setHelpTab((prev) => (prev === "tools" ? null : "tools"));
                      } else if (item.action === "guide") {
                        // [v29] 좌측 도움말 flow + 우측 발행가이드 동시 오픈. 재클릭 시 대화창 복귀.
                        if (navView) setNavView(null);
                        setStage("welcome");
                        setShowLogin(false);
                        setResultTab("guide");
                        setHelpTab((prev) => (prev === "guide" ? null : "guide"));
                      }
                    }
                  : () => handleNav(item.intent);
                return (
                  <button key={item.label + idx}
                    onClick={onClick}
                    title={item.label} aria-label={item.label}
                    style={{ display: "flex", alignItems: "center",
                      gap: navOpen ? 12 : 0,
                      justifyContent: navOpen ? "flex-start" : "center",
                      width: "100%", height: 42, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                      border: "none", fontFamily: "inherit",
                      padding: navOpen ? "0 12px" : 0,
                      fontSize: navOpen ? 14 : 18,
                      fontWeight: itemActive ? 800 : 600,
                      color: itemActive ? "#fff" : "#9a9ab5",
                      background: itemActive ? "rgba(156,39,176,.28)" : "transparent",
                      transition: "background .15s" }}
                    onMouseOver={e => { if (!itemActive) e.currentTarget.style.background = "rgba(156,39,176,.12)"; }}
                    onMouseOut={e => { if (!itemActive) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                    {navOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                  </button>
                );
              })}
              </div>

              {/* ── 좌측 하단 푸터 (정책/지원) — 클릭 시 좌측 대화창에 버블 출력. 우측 변화 없음. 펼침 상태에서만 표시 ── */}
              {navOpen && (
                <div style={{ flexShrink: 0, paddingTop: 14, marginTop: 14, marginBottom: 18,
                  borderTop: "1px solid rgba(255,255,255,.10)",
                  display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { id: "terms",    label: "이용약관" },
                    { id: "privacy",  label: "개인정보처리방침" },
                    { id: "refund",   label: "환불정책" },
                    { id: "aiNotice", label: "AI 생성 고지" },
                    { id: "support",  label: "고객지원" },
                  ].map((f) => {
                    return (
                    <button key={f.id}
                      onClick={() => {
                        // [v-doc] 정책문서 = 독립 문서 뷰(navView="doc:{id}"). 대화창 버블 출력 폐기 —
                        //   버블은 히스토리에 남아 다른 메뉴로 이동해도 아래에 계속 보이는 문제가 있었다.
                        //   재클릭 = 닫기. 우측 작업화면은 건드리지 않는다.
                        if (!FOOTER_DOCS[f.id]) return;
                        if (navView === "doc:" + f.id) { setNavView(null); setResultTab("blog"); return; }
                        setHelpTab(null);
                        setResultTab("nav");
                        setNavView("doc:" + f.id);
                      }}
                      style={{ background: (resultTab === "nav" && navView === "doc:" + f.id) ? "rgba(156,39,176,.28)" : "none",
                        border: "none", cursor: "pointer",
                        textAlign: "left", padding: "9px 12px", borderRadius: 10,
                        fontFamily: "inherit", fontWeight: (resultTab === "nav" && navView === "doc:" + f.id) ? 800 : 600,
                        fontSize: 14, color: (resultTab === "nav" && navView === "doc:" + f.id) ? "#fff" : "#9a9ab5", whiteSpace: "nowrap",
                        transition: "background .15s" }}
                      onMouseOver={e => { e.currentTarget.style.background = "rgba(156,39,176,.12)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseOut={e => { const on = (resultTab === "nav" && navView === "doc:" + f.id);
                        e.currentTarget.style.background = on ? "rgba(156,39,176,.28)" : "transparent";
                        e.currentTarget.style.color = on ? "#fff" : "#9a9ab5"; }}>
                      {f.label}
                    </button>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })()}

        {/* ── 메인 영역 ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── 좌측: 대화창 50% — 도구 탭일 때 숨김 ── */}
          {/* [UI-RESULT-LEFT-RESTORE-01] FULLWIDTH-01 폐기 — stage!=="result" 게이트 제거.
              배경: 좌컬럼 언마운트는 증상 대응이었다. 진짜 원인은 아래 helpTab 게이트다.
                    helpTab=null(로그인 직후 정상 초기값)이면 완료안내를 담은 CoachPanel 분기를
                    통과하지 못하고 landing else 로 떨어져 히어로+유튜브가 드러났다.
              해결: 좌컬럼 진입 사유를 helpTab 과 stage==="result" 둘로 분리(아래 참조).
              ★ resultTab==="tools" 는 무변화. 생성 중(generating) 2컬럼도 무변화. */}
          {resultTab !== "tools" && (
          <div style={{ width: "50%", flexShrink: 0, display: "flex", flexDirection: "column",
            borderRight: "1px solid #e8e8ed", background: "#f7f7f8" }}>
            <div style={{ padding: "0 24px", borderBottom: "1px solid #e8e8ed", height: 53,
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div
                onClick={() => {
                  // [v89] 로고 클릭 = 우측 전체 MainHero 랜딩(로그인/비로그인 공용). 좌측은 대화창 안내.
                  if (navView) setNavView(null);
                  setResultTab("blog");
                  setStage("welcome");
                  setHelpTab(null);
                  setShowHome(true);
                }}
                title="홈으로"
                style={{ fontSize: 18, fontWeight: 800, color: "#7B1FA2", letterSpacing: 0.5, cursor: "pointer" }}>AI-POST.AI</div>
              {/* 업종 드롭다운 제거 (v22) — 업종은 currentStore.industry(프로필)가 SoT. UI 노출 없음. */}
              {/* [v15] 로그인/로그아웃 토글 + 사용자 이름. 비로그인=로그인 표시, 로그인=이름+로그아웃. */}
              {authChecked && (
                authUserId ? (
                  <span style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {/* [Spine 배지] getActiveContext() 만 읽음 — store/profile 직접 조회 금지.
                        업체명 = 앵커, 업종·대표지역·생활권 = 서브라인(레이아웃 불변·스크롤 추가 없음). */}
                    <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 1.15,
                      minWidth: 0, overflow: "hidden" }} title={authEmail || ""}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", letterSpacing: -0.3,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                        {"🟢 "}{(activeCtx.store_id
                          ? ((hubStore && hubStore.store_name) || storeName || "내 업체")
                          : (storeName || (authEmail ? authEmail.split("@")[0] : "사용자") + "님"))}
                      </span>
                      {/* [v126] 서브라인 제거 — 업체명 1줄만. 지역/업종은 업체정보 페이지로 위임.
                          전 업종(치과·법무사·음식점·이브자리) 공통: 헤더=업체명 단일 앵커. 우측 FREE·운영중 배지 유지. */}
                    </span>
                    {/* 플랜/상태 배지 — 이름 옆 인라인 */}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#9457b8", letterSpacing: 0.2, whiteSpace: "nowrap" }}>
                      {(quotaInfo && (quotaInfo.bypass || quotaInfo.reason === "OWNER_BYPASS"))
                        ? "OWNER · 운영중"
                        : ((quotaInfo && quotaInfo.plan_id ? String(quotaInfo.plan_id).toUpperCase() : "FREE") + " 플랜 · 운영중")}
                    </span>
                    {/* [권한] 관리자 진입 — owner만 노출. 판정=OWNER 배지와 동일 단일출처(quotaInfo.OWNER_BYPASS).
                        HUB_TABS 미변경(사용자 메뉴 분리 유지). admin 페이지(/admin)는 서버 requireOwner로 2중 보호. */}
                    {(quotaInfo && (quotaInfo.bypass || quotaInfo.reason === "OWNER_BYPASS")) && (
                      <button onClick={() => router.push("/admin")}
                        style={{
                          fontSize: 11, fontWeight: 700,
                          color: "#6A1B9A", background: "#f3e5f5",
                          border: "1px solid #ce93d8", padding: "4px 10px",
                          borderRadius: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }} title="관리자">🛠 관리자</button>
                    )}
                    <button onClick={async () => {
                        // [계정누수차단] 로그아웃 시 PC에 남는 계정별 plan·메뉴 캐시 제거.
                        try {
                          window.localStorage.removeItem("aipost_plan_state_v1");
                          window.localStorage.removeItem("aipost_mymenus_v1");
                        } catch {}
                        await supabase.auth.signOut();
                        window.location.href = "/";
                      }}
                      style={{
                        fontSize: 11, fontWeight: 700,
                        color: "#c62828", background: "#fff5f5",
                        border: "1px solid #ffcdd2", padding: "4px 10px",
                        borderRadius: 14, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }} title="로그아웃">🚪 로그아웃</button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setShowLogin(true); setLoginNonce((n) => n + 1); setShowHome(false); setResultTab("blog"); setNavView(null); }}
                    style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 700,
                      color: "#6a1b9a", background: "#faf6fe",
                      border: "1px solid #e0d0f0", padding: "4px 10px",
                      borderRadius: 14, fontFamily: "inherit", whiteSpace: "nowrap",
                      cursor: "pointer",
                    }} title="로그인하기">🔑 로그인</button>
                )
              )}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
              {/* [세션57][AI영상코치] 좌측 최상단 — 우측 입력 카드의 「▶ 영상보기」 클릭 시에만 표시.
                  플레이어는 하나. 다른 버튼을 누르면 title/videoId만 교체된다. 자동재생 없음. */}
              {/* [세션58] 업체정보 탭 = 하단 고정 영상만 사용. 상단 공용 플레이어 미표시(화면 흔들림 차단). */}
              {helpTab !== "store" && (
                <CoachVideoCard menuId={coachVideoKey} onClose={() => setCoachVideoKey(null)} />
              )}
              {(authUserId && resultTab === "nav" && navView === "stats" && editingMenus) ? (
                /* [v150] 발행비율 편집 중 — 좌측 = 전체 메뉴 카드(컴팩트). 클릭하면 우측 "나의 메뉴"로 이동(좌에서 사라짐). 저장 시 코치로 복귀. */
                <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 22px" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#4A148C", marginBottom: 8 }}>
                    {_isMultiDept ? `${_svcEmoji} 전체 메뉴` : "📋 전체 메뉴"}
                  </div>
                  {/* 코치 안내 */}
                  <div style={{ background: "linear-gradient(135deg,#faf5ff,#f3e9ff)", borderRadius: 11,
                    border: "1.5px solid #e0d0f0", padding: "10px 12px", marginBottom: 11 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 900, color: "#6A1B9A", marginBottom: 4 }}>🧭 AI 코치</div>
                    <div style={{ fontSize: 11.5, color: "#555", lineHeight: 1.6 }}>
                      {_isMultiDept
                        ? <>{_svcLabel}를 펼쳐 운영할 메뉴를 선택하세요. 어느 {_svcLabel} 메뉴든 한 목록에서 함께 운영됩니다.</>
                        : <>운영할 메뉴를 선택한 뒤 <b>저장</b>하세요.</>}
                    </div>
                  </div>

                  {/* ★ [MultiDeptMenu] 진료과 섹션 — 병원 다중과. 접기/펼치기. C안: 이미 선택된 이름은 비활성. */}
                  {_isMultiDept ? (
                    hospitalMenuSections.length === 0
                      ? <div style={{ fontSize: 14, color: "#aaa" }}>업체 업종이 설정되면 업무 항목이 표시됩니다.</div>
                      : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {hospitalMenuSections.map((sec, si) => {
                            const open = !!openDepts[sec.dept];
                            const pickedCnt = sec.items.filter(x => myMenuFlatNames.includes(x.name)).length;
                            return (
                              <div key={sec.dept} style={{ border: "1.5px solid #e6e0f0", borderRadius: 10, background: "#fff", overflow: "hidden" }}>
                                <button onClick={() => toggleDept(sec.dept)}
                                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 7,
                                    background: open ? "#f6f0ff" : "#fbfaff", border: "none", borderBottom: open ? "1px solid #ece4fa" : "none",
                                    padding: "9px 11px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                                  <span style={{ fontSize: 11, color: "#7B1FA2", width: 12, flexShrink: 0 }}>{open ? "▼" : "▶"}</span>
                                  <span style={{ fontSize: 13, fontWeight: 900, color: "#4A148C", flex: 1 }}>
                                    {si === 0 ? "★ " : ""}{sec.label}
                                    {pickedCnt > 0 ? (
                                      <span style={{ fontSize: 12.5, fontWeight: 900, color: "#7B1FA2", marginLeft: 4 }}>({pickedCnt})</span>
                                    ) : null}
                                  </span>
                                  <span style={{ fontSize: 10.5, color: "#999", fontWeight: 700 }}>{sec.items.length}개</span>
                                </button>
                                {open ? (
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "9px 10px" }}>
                                    {sec.items.map(it => {
                                      const taken = myMenuFlatNames.includes(it.name);    // 이미 나의 메뉴에 있음
                                      const off   = taken;
                                      return (
                                        <button key={sec.dept + "::" + it.name}
                                          onClick={() => { if (!off) { addMyMenuDept(it.name, sec.dept); try { localStorage.setItem(LAST_DEPT_KEY, sec.dept); } catch {} } }}
                                          disabled={off}
                                          title={taken ? "이미 나의 메뉴에 있습니다" : "클릭: 오른쪽 나의 메뉴로 이동"}
                                          style={{ background: off ? "#f6f6f8" : "#fff", borderRadius: 7,
                                            border: off ? "1.5px dashed #ddd" : "1.5px solid #e6e6ea",
                                            boxShadow: off ? "none" : "0 2px 8px rgba(100,50,180,.04)", padding: "8px 8px",
                                            cursor: off ? "not-allowed" : "pointer", opacity: taken ? .38 : 1,
                                            textAlign: "left", fontFamily: "inherit", transition: "all .12s" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <span style={{ fontSize: 14, flexShrink: 0 }}>{it.emoji}</span>
                                            <span style={{ fontSize: 12, fontWeight: 900, color: off ? "#999" : "#1a1a2e",
                                              lineHeight: 1.2, wordBreak: "keep-all", flex: 1 }}>{it.name}</span>
                                            {it.cat ? (
                                              <span style={{ fontSize: 8.5, color: "#9C27B0", fontWeight: 700, background: "#F3E5F5",
                                                borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", flexShrink: 0 }}>{it.cat}</span>
                                            ) : null}
                                          </div>
                                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                                            <span style={{ fontSize: 10, fontWeight: 800,
                                              color: taken ? "#4CAF50" : "#7B1FA2",
                                              border: `1px solid ${taken ? "#c8e6c9" : "#d8c4ed"}`,
                                              borderRadius: 5, padding: "1px 7px" }}>
                                              {taken ? "✅ 선택됨" : "선택"}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )
                  ) : (() => {
                    const picked = (myMenusMap && Array.isArray(myMenusMap[CURRENT_INDUSTRY])) ? myMenusMap[CURRENT_INDUSTRY] : [];
                    const avail = masterMenuNamesAll.filter(n => !picked.includes(n));
                    if (masterMenuNamesAll.length === 0) {
                      return <div style={{ fontSize: 14, color: "#aaa" }}>업체 업종이 설정되면 업무 항목이 표시됩니다.</div>;
                    }
                    if (avail.length === 0) {
                      return <div style={{ fontSize: 14, color: "#aaa", padding: "10px 2px" }}>모든 업무가 오른쪽 나의 메뉴로 이동했습니다.</div>;
                    }
                    // [v-catgroup] cat 소제목 그룹핑 — 메뉴 30~40개 확장 대비.
                    //   masterMenus의 cat 등장 순서를 그대로 따름(data.js CATS SoT와 동일 순서).
                    //   cat 없는 업종/항목은 그룹 미생성 → 기존 flat 렌더 그대로(무손상 폴백).
                    const _catOrder = [];
                    const _grouped  = {};
                    avail.forEach(name => {
                      const c = (masterMetaOf(name).cat || "").trim();
                      if (!c) return;
                      if (!_grouped[c]) { _grouped[c] = []; _catOrder.push(c); }
                      _grouped[c].push(name);
                    });
                    const _uncat = avail.filter(n => !(masterMetaOf(n).cat || "").trim());
                    // [v-oriental-flat] 한의원은 진료과 탐색이 아니라 치료·증상 직접 탐색 →
                    //   cat 소제목 없이 평면 배치. data.js의 cat 필드는 보존(되돌리기 1줄).
                    // [v-derma-flat 2026-07-13] 피부과 V2 동일 — 사용자는 '여드름/기미/탈모/무좀'을 직접 찾는다.
                    //   '염증성 피부질환·색소질환' 같은 상위 분류는 탐색에 도움이 되지 않음 → 27종 평면 카드.
                    //   derma-v2-data의 cat / DERMA_V2_CATS는 보존(엔진 CAT_FOCUS·필터가 계속 사용). 되돌리기 = 이 배열에서 "derma" 제거.
                    // [평면화] 메뉴 15개 이하 업종 = cat 소제목 없이 카드만 나열(스캔 속도 우선).
                    //   기준: ~15개 → 평면 / 20개+ → 분류 표시. clinic(15종) 추가 2026-07-13.
                    const _FLAT_INDUSTRIES = ["oriental", "derma", "clinic", "ent", "urology", "eye", "obgyn", "pediatrics", "psy", "family", "dental", "general", "legal", "lawyer", "tax", "labor", "administrative", "funeral", "realestate", "bedding", "cleaning", "ortho"];   // ent·urology·eye·obgyn·pediatrics·psy(각 14종) 2026-07-13 / family(14종) 2026-07-14 / dental(19종) 2026-07-14 / general(16종 — V2 승격, 평면 전환) 2026-07-14 / [세션41] legal·lawyer — 카테고리 그룹 6~8개 과다, 구분선이 메뉴보다 먼저 보임 → 평면 전환 / [세션43] tax — 카테고리 7개 vs 메뉴 11개, 구분선이 메뉴만큼 많음 → 평면 전환 / [세션45] labor — 카테고리 5그룹이 20메뉴를 3~4개씩 끊어 스캔이 5번 중단됨 → 평면 전환 / [세션46] administrative — 카테고리 7그룹이 23메뉴를 평균 3.3개씩 끊음(labor 동형) → 평면 전환 / [세션49] funeral — 카테고리 5그룹이 10메뉴를 2개씩 끊어 스캔 5번 중단(labor 동형) → 평면 전환 / [세션50] realestate — 카테고리 8그룹이 11메뉴를 1~2개씩 끊어 스캔 8번 중단(funeral 동형) → 평면 전환 / [세션51] bedding — 14메뉴/4그룹, 15개 이하 평면 기준 부합 → 평면 전환(데이터 무수정, BEDDING_CATS 보존) / [세션51] cleaning — 카테고리 7그룹이 8메뉴를 1~2개씩 끊음(1:1 자동판정은 주거형태 2개 때문에 미성립) → 평면 전환 / [세션58] ortho — 카테고리 5그룹(척추·디스크/무릎·관절/어깨/비수술치료/발목·족부)이 카드 스캔을 매 줄 끊음 → 평면 전환(ORTHO_CATS 보존)
                    // [세션48][ONE-TO-ONE] 카테고리 1:1 자동 평면 판정 (공통·전업종)
                    //   모든 카테고리가 정확히 메뉴 1개만 보유 → cat은 분류가 아니라 메뉴명 자체.
                    //   → 그룹 헤더가 메뉴 수만큼 생겨 스캔이 매 줄 끊김 → 자동 평면 전환.
                    //   ★ '평균 N개 미만' 기준 금지 — 카테고리당 2개 정상 업종을 오판함. 전부 1개일 때만 성립.
                    //   daycare(13/13) 등 신규 1:1 업종은 _FLAT_INDUSTRIES 등록 없이 자동 처리.
                    //   _FLAT_INDUSTRIES는 1:1이 아닌데도 평면이 나은 업종(legal·labor 등) 예외용으로 존속.
                    const _catCounts   = _catOrder.map(c => (_grouped[c] || []).length);
                    const _isOneToOne  = _catCounts.length > 0 && _catCounts.every(n => n === 1);
                    // [세션58][ALL-FLAT] 단일업종 전 업종 평면 고정.
                    //   업종별 개별 등록/판정이 관리 부담만 키움(추가할 때마다 누락 확인 필요) → 일괄 평면.
                    //   _FLAT_INDUSTRIES / _isOneToOne / _catOrder는 되돌리기용 보존.
                    //   원복: const _useGroup = !_isOneToOne && !_FLAT_INDUSTRIES.includes(CURRENT_INDUSTRY) && _catOrder.length >= 2;
                    //   ※ 다중과(_isMultiDept)는 별개 렌더 경로 → 진료과 섹션 그대로 유지.
                    const _useGroup = false;

                    // [v-menuclean 2026-07-14] 카테고리 헤더 — 개수 제거 + 이모지. UI 정리(구조 무변경).
                    const _CAT_EMOJI = {
                      "보철": "🦷", "심미": "✨", "교정": "🪥", "보존": "💊", "예방": "🛡",
                      "구강외과": "🩺", "턱관절": "🦴", "소아": "👧",
                    };
                    const _catIcon = (c) => _CAT_EMOJI[c] || "▪";

                    const _card = (name) => {
                      const m = masterMetaOf(name);
                      return (
                        <button key={name} onClick={() => addMyMenuParent(name)}
                          title="클릭: 선택"
                          style={{ background: "#fff", borderRadius: 7, border: "1.5px solid #e6e6ea",
                            boxShadow: "0 2px 8px rgba(100,50,180,.04)", padding: "8px 8px",
                            cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all .12s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#9C27B0"; e.currentTarget.style.background = "#faf5ff"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e6e6ea"; e.currentTarget.style.background = "#fff"; }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{m.emoji}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: "#1a1a2e",
                              lineHeight: 1.2, wordBreak: "keep-all", flex: 1 }}>{name}</span>
                            {(!_useGroup && m.cat) ? (
                              <span style={{ fontSize: 8.5, color: "#9C27B0", fontWeight: 700, background: "#F3E5F5",
                                borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", flexShrink: 0 }}>{m.cat}</span>
                            ) : null}
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#7B1FA2",
                              border: "1px solid #d8c4ed", borderRadius: 5, padding: "1px 7px" }}>선택</span>
                          </div>
                        </button>
                      );
                    };

                    if (!_useGroup) {
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                          {avail.map(_card)}
                        </div>
                      );
                    }

                    return (
                      <div>
                        {_catOrder.map(c => (
                          <div key={c} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px 2px" }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{_catIcon(c)}</span>
                              <span style={{ fontSize: 12.5, fontWeight: 900, color: "#5a2a7a", letterSpacing: -.2 }}>{c}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                              {_grouped[c].map(_card)}
                            </div>
                          </div>
                        ))}
                        {_uncat.length > 0 ? (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 6px 2px" }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>▪</span>
                              <span style={{ fontSize: 12.5, fontWeight: 900, color: "#777", letterSpacing: -.2 }}>기타</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                              {_uncat.map(_card)}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : (resultTab === "nav" && navView === "editguide") ? (
                // [v-editguide5] 좌측 코치창 = 글 수정 가이드(이미지). 업종별 텍스트 프리셋 폐기 —
                //   설명을 읽게 하지 않고 화면 그대로 보여준다. 교체는 /public/g-guide-N.png 파일만.
                <div style={{ padding: "12px 10px 24px", overflowY: "auto" }}>
                  {[1, 2, 3, 4].map((n) => (
                    <img key={n} src={"/g-guide-" + n + ".png"} alt={"글 수정 가이드 " + n}
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12,
                        border: "1px solid #ece7f6", marginTop: n === 1 ? 0 : 12 }} />
                  ))}
                </div>
              ) : (resultTab === "nav" && typeof navView === "string" && navView.startsWith("doc:")) ? (
                // [v-doc] 정책·지원 문서 = 독립 페이지. 대화 히스토리에 남지 않는다.
                (() => {
                  const d = FOOTER_DOCS[navView.slice(4)] || {};
                  return (
                    <div style={{ padding: "18px 18px 40px", overflowY: "auto", background: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 17, fontWeight: 900, color: "#2b2340", letterSpacing: "-0.4px" }}>
                          {d.title || ""}
                        </div>
                        <button type="button" onClick={() => { setNavView(null); setResultTab("blog"); }}
                          style={{ flexShrink: 0, border: "1px solid #e0d5ef", background: "#fff", color: "#8a7ba0",
                            borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 800,
                            fontFamily: "inherit", cursor: "pointer" }}>
                          닫기
                        </button>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.95,
                        color: "#4a4459", fontWeight: 500, wordBreak: "break-word" }}>
                        {d.content || ""}
                      </div>
                    </div>
                  );
                })()
              ) : (resultTab === "nav" && navView === "sujung") ? (
                // [S132] 좌측 코치창 = 콘텐츠 오류·수정 안내(이미지 1장 /sujung-1.png). 교체는 파일만.
                <div style={{ padding: "12px 10px 24px", overflowY: "auto" }}>
                  <img src="/sujung-1.png" alt="콘텐츠 오류·수정 안내"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    style={{ width: "100%", height: "auto", display: "block", borderRadius: 12,
                      border: "1px solid #ece7f6" }} />
                  {/* [S132] 접수 = 기존 불편사항 게시판(kind=issue)에 합류. 신규 kind/테이블 없음.
                       버튼 문구만 콘텐츠 오류 맥락으로 바꾼다(표시 전용 — 서버 제목은 불편사항 문의). */}
                  <SupportForm kind="issue" compact
                    btnLabel="콘텐츠 오류·수정 요청"
                    placeholder="수정이 필요하다고 생각되는 문장이나 내용을 그대로 붙여 넣어 주세요.&#10;가능하시면 어떤 부분이 잘못되었는지, 어떻게 수정하면 좋을지도 함께 적어주세요." />
                </div>
              ) : (resultTab === "nav" && navView === "upjong") ? (
                // [v-upjong] 좌측 코치창 = 내 업종 안내(이미지 2장). 교체는 파일만.
                <div style={{ padding: "12px 10px 24px", overflowY: "auto" }}>
                  {[1, 2].map((n) => (
                    <img key={n} src={"/upjong-" + n + ".png"} alt={"내 업종 안내 " + n}
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12,
                        border: "1px solid #ece7f6", marginTop: n === 1 ? 0 : 12 }} />
                  ))}
                  {/* [세션96] 접수 게시판 통합 — 제목 "내 업종 신청". */}
                  <SupportForm kind="industry" compact />
                </div>
              ) : (resultTab === "nav" && navView === "daehang") ? (
                // [세션95] 좌측 코치창 = 운영대행 안내(이미지 3장 /daehang-1~3.png). 교체는 파일만.
                //   CTA는 이미지 내부('운영 대행 신청')가 담당 — 중복 버튼 제거.
                <div style={{ padding: "12px 10px 24px", overflowY: "auto" }}>
                  {[1, 2, 3].map((n) => (
                    <img key={"dh" + n} src={"/daehang-" + n + ".png"} alt={"운영대행 안내 " + n}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12,
                        border: "1px solid #ece7f6", marginTop: n === 1 ? 0 : 12 }} />
                  ))}
                  {/* [세션96] 접수 게시판 통합 — 제목은 서버가 붙인다("운영 대행 신청"). */}
                  <SupportForm kind="agency" compact />
                </div>
              ) : (resultTab === "nav" && navView === "naverguide") ? (
                // [v-naverguide] 좌측 코치창 = 네이버 발행 가이드(이미지 5장). 교체는 파일만.
                <div style={{ padding: "12px 10px 24px", overflowY: "auto" }}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <img key={n} src={"/naver-" + n + ".png"} alt={"네이버 발행 가이드 " + n}
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12,
                        border: "1px solid #ece7f6", marginTop: n === 1 ? 0 : 12 }} />
                  ))}
                </div>
              ) : (resultTab === "nav" && navView === "blogtitle") ? (
                // [v-blogtitle] 좌측 코치창 = 타이틀 예시 이미지 1장.
                <div style={{ padding: "12px 0", overflowY: "auto" }}>
                  <div style={{ padding: "0 10px" }}>
                    <img src="/title-1.png" alt="블로그 타이틀 꾸미기 예시"
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12, border: "1px solid #ece7f6" }} />
                    <img src="/title-2.png" alt="블로그 타이틀 꾸미기 예시 2"
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12, border: "1px solid #ece7f6", marginTop: 12 }} />
                    <img src="/title-3.png" alt="블로그 타이틀 꾸미기 예시 3"
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12, border: "1px solid #ece7f6", marginTop: 12 }} />
                    <img src="/title-4.png" alt="블로그 타이틀 꾸미기 예시 4"
                      style={{ width: "100%", height: "auto", display: "block", borderRadius: 12, border: "1px solid #ece7f6", marginTop: 12 }} />
                    {/* [세션96] 접수 게시판 통합 — 제목 "블로그 타이틀 제작". */}
                    <SupportForm kind="title" compact />
                  </div>
                </div>
              ) : (resultTab === "nav" && navView === "why") ? (
                // [왜다른가요] 정적 차별점 소개. HOWTO 아님 — 별도 카드형.
                <div style={{ padding: "8px 10px", overflowY: "auto" }}>
                  <WhyScreen />
                </div>
              ) : (navView === "howto-write" || navView === "howto-publish" || navView === "howto-title") ? (
                // [howto] 좌측 코치창 = 사용방법/네이버발행 캡처 가이드.
                <div style={{ padding: "8px 10px", overflowY: "auto" }}>
                  <HowtoScreen
                    guideId={navView === "howto-publish" ? "publish" : navView === "howto-title" ? "title" : "write"}
                    selId={howtoItem}
                    onPick={(id) => setHowtoItem(id)} />
                </div>
              ) : ((resultTab === "nav" && navView === "industry")
                   // [세션95] 업종 미확정 계정은 어떤 경로로 들어와도 이 업종센터 하나로 받는다.
                   //   전용(좁은) 최초등록 트리 폐기에 따른 수용 분기. 메인 기본 화면은 아니다
                   //   (메인 좌측 = landing 히어로 영상). helpTab="store" 진입일 때만.
                   || (authUserId && helpTab === "store" && !(hubStore && hubStore.industry))) ? (
                // [업종센터/A] 좌측 코치창 = 업종 트리. 클릭 → 우측 상세(industryCenterSel) 갱신.
                // [fix] marginTop:-24 제거 — sticky 헤더가 첫 카테고리(건강·의료)를 덮던 겹침 해소.
                //   안내문구 아래부터 리스트 정상 시작. 상단 흰 띠 24px는 허용(겹침 < 흰띠).
                <div style={{ padding: "0 6px" }}>
                  <IndustryTree
                    selId={industryCenterSel}
                    confirmedIndustry={(hubStore && hubStore.industry) || ""}
                    authUserId={authUserId}
                    counts={CATALOG_COUNT}
                    isOwner={!!(quotaInfo && (quotaInfo.bypass || quotaInfo.reason === "OWNER_BYPASS"))}
                    onPick={(id) => setIndustryCenterSel(id)}
                    onSelect={handleIndustryTreeSelect}
                  />
                </div>
              // [UI-RESULT-LEFT-RESTORE-01] 좌컬럼 진입 사유 2개를 동등하게 병렬화.
              //   ① 생성 완료  — stage==="result" (helpTab 무관 · 로그인 한정)
              //   ② 도움말 선택 — helpTab (기존 식 문자 단위 무변경)
              //   완료안내 UI 는 CoachPanel 내부 ctx.resultMeta / ctx.onHowto 가 소유한다.
              //   CoachPanel 은 tabId 를 buildCoachAdvice 에만 넘기고, 그 함수는 tabId 를
              //   참조하지 않는다 → tabId=null 진입 안전.
              ) : ((authUserId && stage === "result") || (helpTab && (authUserId
                // [v126] 미확정 store(최초등록)는 우측 STEP 순차입력이 단독 안내 → 좌측 코치 제외(이중안내 해소).
                //   확정계정 store 편집은 코치 유지(생활권·방문안내 안내 유용).
                ? ((HELP_CONTENT[helpTab] || helpTab === "manage")
                   && !(helpTab === "store" && !(hubStore && hubStore.industry)))
                : HELP_CONTENT[helpTab]                            // 비로그인: 기존 정적 안내페이지
              ))) ? (
                authUserId ? (
                  <CoachPanel
                    tabId={helpTab}
                    ctx={{ hubStore, hubPosts, hubSurvival, quotaInfo, menuWeights, savedWeights, weightsDirty, activePlan,
                           treatmentNames: menuTreatments.map(t => (t.menu || t.menuRef || t.name)).filter(Boolean), // [v134] restaurant cat 필터
                           // [v114][v116] 발행코치 좌측 진도 — 우측 글쓰기 stage 따라 코치도 다음 단계로.
                           coachStage: (stage === "generating") ? "generating"
                             : (stage === "result") ? "result"
                             : (stage === "analysis") ? "analysis"  // [v128] 추천 글 방향 화면 — 좌측 코치 숨김(우측 보드만)
                             : (showTreatmentSelect && stage === "treatment" && !pendingTreatment) ? "treatment"
                             : "calendar",
                           coachPicked: calendarPrefill?.treatment?.menu || calendarPrefill?.treatment?.menuRef || calendarPrefill?.treatment?.name || "",
                           // [세션58] 업체정보 하단 고정 영상 — 우측 「▶영상보기」 클릭 키 반영(위치 불변).
                           coachVideoKey,
                           // [v118] 발행 체크리스트 점등 — 확인 가능한 행동만. 네이버 발행은 추적 불가(회색 수동).
                           doneCopied: everCopied,
                           donePhoto: photoToolUsed,
                           doneNaver: naverVisited,
                           doneUrl: publishStatus === "done",
                           // [v134] 완료 화면 요약 — 좌측 결과 카드용 지표
                           resultMeta: (stage === "result" && result) ? {
                             chars: charCount,
                             paras: String(result.text || "").split(/\n\s*\n/).filter(x => x.trim().length > 20).length,
                             imgs:  (String(result.text || "").match(/\[이미지:[^\]]*\]/g) || []).length,
                             score: result.seoScore ?? result.score ?? null,
                             readMin: Math.max(1, Math.round(charCount / 500)),
                           } : null,
                           // [v135] 완료 화면 1분 사용방법 — 좌측만 영상으로 전환(우측 결과 유지).
                           onHowto: () => {
                             setHelpTab(null); setShowLogin(false);
                             setHowtoItem("naver"); setNavView("howto-publish");
                           } }}
                    onTab={(id) => {
                      // 좌측 코치 안내 + 우측 운영허브 화면을 함께 해당 탭으로 전환.
                      setHelpTab(id);
                      if (HUB_IDS.includes(id)) { setResultTab("nav"); setNavView(id); }
                    }}
                    onClose={() => setHelpTab(null)}
                  />
                ) : (
                  <HelpPanel tabId={helpTab} onClose={() => setHelpTab(null)} />
                )
              ) : showLeftCatalog ? (
                /* [로그인 훅] 비로그인 — 우측 로그인폼 유지, 좌측에만 업종센터 트리(미리보기). 채택은 로그인 후. */
                <div style={{ padding: "0 6px 4px" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <button onClick={() => setShowLeftCatalog(false)}
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#7a5a9a",
                        background: "#fff", border: "1px solid #e0d0f0", borderRadius: 12,
                        padding: "4px 11px", cursor: "pointer", fontFamily: "inherit" }}>
                      ✕ 닫기
                    </button>
                  </div>
                  <IndustryTree
                    selId={industryCenterSel}
                    confirmedIndustry={null}
                    onPick={(id) => setIndustryCenterSel(id)}
                    onSelect={() => { setShowLogin(true); }}
                    isOwner={false}
                    authUserId={null}
                    counts={CATALOG_COUNT}
                  />
                </div>
              ) : (
              <div style={{
                // [v-landing 2026-07-27] 비로그인 소개 화면만 폭 확대(600→900) — 소개 영상 가독성.
                //   로그인 후 코치 흐름은 기존 600 유지(회귀 0).
                // [세션71] 로그인 메인(landing 히어로)도 900으로 통일 — 같은 영상이 비로그인보다
                //   작게 보이던 차이 제거. 판정 = 첫 메시지 role==="landing" 且 대기 단계.
                //   생성·결과 단계는 코치 흐름이므로 600 유지(회귀 0).
                maxWidth: (!authUserId
                  || (messages[0] && messages[0].role === "landing"
                      && stage !== "generating" && stage !== "result"))
                  ? 900 : 600, margin: "0 auto", padding: "0 20px" }}>
                {/* [세션95] 최초등록 전용 좁은 업종트리 폐기. 업종 선택은 업종센터(navView="industry") 단일 경로. */}
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg}
                    onAction={goHubTab}
                    onCta={() => { setLoginNonce((n) => n + 1); setShowLogin(true); }} />
                ))}
                {/* [v127] 생성 단계 — 7단계 진행 체크리스트를 좌측 코치 영역에 표시.
                    GeneratingProgress가 완료 버스(genProgressBus)를 소유 → 완료 시 stage="result" 전환. */}
                {stage === "generating" && (
                  <div style={{ marginTop: 14, padding: "14px 16px", background: "#fff",
                    borderRadius: 14, border: "1.5px solid #ede8f8",
                    boxShadow: "0 2px 10px rgba(100,50,180,.05)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0",
                      marginBottom: 12, letterSpacing: 0.5 }}>
                      💬 AI가 작성 중입니다 (30~60초)
                    </div>
                    <GeneratingProgress industry={CURRENT_INDUSTRY}
                      logCtx={{ region: hubStore && hubStore.region,
                                subRegion: hubStore && hubStore.sub_region,
                                picked: (pendingTreatment && (pendingTreatment.menu || pendingTreatment.name)) || "" }} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              )}
            </div>
            {SHOW_CHAT_INPUT && (
            <div style={{ padding: "16px 20px 20px", background: "#fff", borderTop: "1px solid #e8e8ed" }}>
              <div style={{ maxWidth: 600, margin: "0 auto" }}>
                {/* [v35] 비로그인 글쓰기 시작 버튼 + 단축 칩 6종 제거 — 입력창만 유지 */}
                {/* 피드백 — 글 쓰다가 바로 누르는 자연 동선. 클릭 시 입력창 프리필 (정식 게시판은 테이블 도입 시) */}
                {authChecked && authUserId && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 6 }}>
                    <button onClick={() => { if (navView) setNavView(null); setResultTab("blog"); setInput("[기능제안] "); }}
                      style={{ fontSize: 11, fontWeight: 700, color: "#1565C0", background: "#eef4fb",
                        border: "1px solid #cfe0f3", padding: "4px 10px", borderRadius: 12,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      title="이런 기능 있었으면 좋겠어요">💡 기능제안</button>
                    <button onClick={() => { if (navView) setNavView(null); setResultTab("blog"); setInput("[수정요청] "); }}
                      style={{ fontSize: 11, fontWeight: 700, color: "#7B1FA2", background: "#faf6fe",
                        border: "1px solid #e0d0f0", padding: "4px 10px", borderRadius: 12,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                      title="이거 불편해요 / 오류가 있어요">🐞 오류신고</button>
                  </div>
                )}
                {/* [v24] 입력창 옆 👤 버튼 제거 — 상단 '관리' 버튼으로 일원화 */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                <div style={{ flex: 1, display: "flex", gap: 10, alignItems: "flex-end",
                  background: "#fff", borderRadius: 16, padding: "10px 14px",
                  border: "1.5px solid #e0d0f0", boxShadow: "0 2px 12px rgba(156,39,176,.08)" }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder={navView === "coach"
                      ? "자유 주제로 쓰려면 여기에 입력하세요 (예: 임플란트 가격 정리)"
                      : "어떤 글을 쓸까요? 주제를 입력해 보세요"} rows={1}
                    style={{ flex: 1, border: "none", background: "transparent",
                      fontFamily: "inherit", fontSize: 14, resize: "none",
                      lineHeight: 1.6, color: "#1a1a2e", maxHeight: 100, overflowY: "auto" }} />
                  <button onClick={handleSend} disabled={loading || !input.trim()}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: "none",
                      cursor: loading || !input.trim() ? "default" : "pointer",
                      background: loading || !input.trim() ? "#e8e8ed" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                      color: loading || !input.trim() ? "#aaa" : "#fff",
                      fontSize: 16, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: loading || !input.trim() ? "none" : "0 2px 8px rgba(74,20,140,.3)" }}>↑</button>
                </div>
                </div>
                <div style={{ fontSize: 10, color: "#b0b0c0", textAlign: "center", marginTop: 6 }}>
                  Enter 전송 · Shift+Enter 줄바꿈
                </div>
              </div>
            </div>
            )}
          </div>
          )}

          {/* ── 우측: 결과 패널 — 도구 탭이면 100%, 아니면 50% ── */}
          <div style={{ width: resultTab === "tools" ? "100%" : "50%",
            display: "flex", flexDirection: "column",
            background: "#fff", overflow: "hidden",
            transition: "width .25s ease" }}>

            {/* ── 상단 헤더 — 좌측 헤더와 동일 높이. [v98] 모든 화면에서 무조건 공통 탭바만 노출. 제목·완료뱃지 없음. ── */}
            <div style={{ padding: "0 16px", borderBottom: "1px solid #e8e8ed",
              background: "#fff", flexShrink: 0,
              display: "flex", alignItems: "center", height: 53, gap: 10 }}>
              {/* ── [v106] 공통 탭바 — A안: 플랫 텍스트 + 활성 밑줄(노션/커서/Stripe 방식). 박스·테두리 제거. ── */}
              <div style={{ display: "flex", gap: 2, width: "100%", height: "100%", overflowX: "auto" }}>
                {HUB_TABS.map(t => {
                  // [v129] 비로그인 = 메뉴 표시·톤 그대로. 클릭만 가로채 우측 로그인 카드, 좌측은 랜딩 영상 유지.
                  const locked = !(authChecked && authUserId) && !t.guest;
                  // active 판정: tools 탭은 resultTab==="tools" / 그 외는 nav + navView 일치.
                  const active = t.ext
                    ? (resultTab === "tools")
                    : (resultTab === "nav" && navView === t.id);
                  return (
                    <button key={t.id}
                      onClick={() => {
                        if (locked) {
                          // [v129] 사진편집기(전체폭) → 잠금 탭 이동 시 분할 레이아웃 복원 후 로그인 카드
                          setShowHome(false); setHelpTab(null);
                          setResultTab("nav"); setNavView(t.id);
                          setShowLogin(true);
                          return;
                        }
                        setShowHome(false);
                        setShowLogin(false);
                        // [v129] 비로그인은 좌측 가이드 대신 랜딩 영상 유지 (요금제 등 guest 탭 포함)
                        setHelpTab((t.ext || !(authChecked && authUserId)) ? null : t.id);
                        if (t.ext) {
                          // 사진편집기 — NavPanel 밖 전용 화면.
                          if (navView) setNavView(null);
                          setResultTab("tools");
                        } else {
                          // 운영허브 탭 — nav + 해당 탭. NavPanel이 view로 콘텐츠 전환.
                          // [v115] 탭 재진입 시 진행 중이던 글쓰기 흐름 초기화 — 코치/우측이 처음(달력) 화면으로 복귀.
                          setStage("welcome");
                          setShowTreatmentSelect(false);
                          setCalendarPrefill(null);
                          setPendingTreatment(null);
                          // [v126] 업체정보 최초등록(미확정) → 좌측을 업종센터 트리("나의 업종")로 열고 우측은 store 폼.
                          //   트리에서 업종 선택 → 우측 pickIndustry 반영 → 주소·생활권 순차 입력. (확정계정은 기존대로 store)
                          if (t.id === "store" && !(hubStore && hubStore.industry)) {
                            setHelpTab(null);
                            setIndustryCenterSel((hubStore && hubStore.industry) || "");
                            setNavView("industry");
                          } else {
                            setNavView(t.id);
                          }
                          setResultTab("nav");
                          if (authUserId && hubPosts === null && !hubLoading) fetchHub();
                        }
                      }}
                      style={{ flex: "1 1 0", minWidth: 0, height: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        border: "none", background: "none", position: "relative",
                        color: active ? "#4A148C" : (t.sub ? "#6e6a78" : "#4a4754"),
                        fontSize: 14.5, fontWeight: active ? 800 : (t.sub ? 550 : 600),
                        cursor: "pointer", fontFamily: "inherit",
                        whiteSpace: "nowrap", transition: "color .12s" }}
                      onMouseOver={e => { if (!active) e.currentTarget.style.color = "#7B1FA2"; }}
                      onMouseOut={e => { if (!active) e.currentTarget.style.color = (t.sub ? "#6e6a78" : "#4a4754"); }}>
                      <span style={{ fontSize: 14.5, opacity: t.sub ? .8 : 1 }}>{t.ic}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
                      {active && (
                        <span style={{ position: "absolute", left: "8%", right: "8%", bottom: -1,
                          height: 3.5, borderRadius: 3, background: "#7B1FA2" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── [Service Switch Spine · v-dept 2026-07-12] 서비스(진료과) 전환줄 ──
                위치: 우측 패널 헤더(탭바 바로 아래). 탭·화면보다 상위 = CURRENT_INDUSTRY 결정 지점.
                  AI글쓰기(달력) / 발행비율설정 / 질환선택 / 관측 / 최근발행 — 아래 모든 화면이
                  CURRENT_INDUSTRY 파생(activeConfig·activeTreatments·activeCats·menuTreatments·payload)이므로
                  여기서 1회 전환하면 전 화면이 동시에 따라온다. 개별 화면 수정 불필요.
                ★ Generate / engineBootstrap / Registry / 엔진 / Publish / Observation 무수정.
                노출: 병원 다중 진료과(departments 2개 이상)만. 단일과·비병원 = 미렌더 → 화면 100% 동일.
                확장(향후): 리빙=서비스(욕실·도배·장판) / 법률=업무(형사·이혼·상속) 도 동일 컴포넌트 재사용.
                  → showDeptSwitch / myDepartments 를 업종별 목록으로 일반화하면 그대로 성립. */}
            {authUserId && showDeptSwitch && !_isMultiDept && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
                padding: "9px 16px", borderBottom: "1px solid #e8e8ed",
                background: "linear-gradient(180deg,#f5faff,#fff)", flexShrink: 0 }}>
                <span style={{ fontSize: 11.5, fontWeight: 900, color: "#0D47A1",
                  marginRight: 4, whiteSpace: "nowrap" }}>🏥 진료과</span>
                {myDepartments.map(d => {
                  const on  = CURRENT_INDUSTRY === d;
                  const rep = d === _repIndustry;
                  const busy = (stage === "generating");
                  return (
                    <button key={d} type="button"
                      disabled={busy}
                      onClick={() => {
                        if (on || busy) return;
                        // 진료과 전환 = CURRENT_INDUSTRY 전환. 진행 중 선택·프리필 초기화(타 과 질환 잔재 방지).
                        setCURRENT_INDUSTRY(d);
                        setCalendarPrefill(null);
                        setPendingTreatment(null);
                        setShowTreatmentSelect(false);
                        setAnalysisData(null);
                        setSelectedStrategyIdx(null);
                      }}
                      title={rep ? "대표 진료과" : deptLabel(d)}
                      style={{
                        padding: "5px 12px", borderRadius: 999, fontFamily: "inherit",
                        fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
                        cursor: (on || busy) ? "default" : "pointer",
                        border: on ? "1.5px solid #1976D2" : "1.5px solid #dbe2ea",
                        background: on ? "linear-gradient(135deg,#0D47A1,#1E88E5)" : "#fff",
                        color: on ? "#fff" : "#7a8699",
                        opacity: (busy && !on) ? .5 : 1,
                        transition: "all .12s",
                      }}>
                      {rep ? "★ " : ""}{deptLabel(d)}
                    </button>
                  );
                })}
                <span style={{ fontSize: 10.5, color: "#9aa6b6", marginLeft: 4 }}>
                  선택한 진료과 기준으로 달력·발행비율·질환목록이 바뀝니다
                </span>
              </div>
            )}

            {/* ── 단계 표시줄 ── */}
            {/* [v111] 생성 단계는 StatusBoard가 GenWritingCard로 조기 return → 이 단계표시줄은 generating 제외. */}
            {!showHome && resultTab !== "nav" && stage !== "result" && stage !== "generating" && (() => {
              const selectedKw = selectedStrategyIdx !== null && analysisData?.suggestions?.[selectedStrategyIdx]?.keyword;
              const step =
                selectedKw               ? { icon: "✅", text: "글 방향 선택됨",        sub: selectedKw,                  color: "#4A148C", bg: "#EDE7F6" }
              : stage === "analysis"     ? { icon: "📝", text: "추천 글 방향",    sub: "어떤 방식으로 글을 작성할까요?",     color: "#1565C0", bg: "#E3F2FD" }
              : pendingTreatment         ? { icon: "📍", text: "지역 선택",         sub: `${pendingTreatment.name}`,   color: "#E65100", bg: "#FFF3E0" }
              : showTreatmentSelect      ? { icon: CURRENT_INDUSTRY === "restaurant" ? "🍽️" : "💉", text: lex(CURRENT_INDUSTRY).itemWord + " 선택", sub: "카테고리에서 고르세요", color: "#6A1B9A", bg: "#F3E5F5" }
              : null;
              if (!step) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderBottom: "1px solid #e8e8ed",
                  background: step.bg, flexShrink: 0, transition: "background .3s" }}>
                  <span style={{ fontSize: 15 }}>{step.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: step.color }}>{step.text}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{step.sub}</div>
                  </div>
                </div>
              );
            })()}

            {/* 메인 콘텐츠 영역 */}
            <div style={{ display: "flex",
              flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* ★ 탭 우선 — 네비 패널(요금제/사용량 등)은 최우선 */}
              {showHome ? (
                /* [v89] 로고 클릭 랜딩 — 우측 전체 MainHero(로그인/비로그인 공용). 좌측은 대화창 안내. */
                <MainHero />
              ) : authChecked && !authUserId && showLogin ? (
                /* [v37] 상단 🔑로그인 / 패널 로그인버튼 클릭 → 우측 인라인 로그인폼(LoginCard). 전체 페이지 이동 없음. */
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                  <LoginCard
                    key={loginNonce}
                    onAuthed={() => { setShowLogin(false); handleInlineAuthed(); }}
                    onExplore={() => { setShowLeftCatalog(true); }}
                  />
                  <button onClick={() => setShowLogin(false)}
                    style={{ position: "absolute", top: 14, right: 16, fontSize: 12, fontWeight: 600,
                      color: "#7a5a9a", background: "#fff", border: "1px solid #e0d0f0",
                      borderRadius: 12, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                    ← 둘러보기
                  </button>
                </div>
              ) : authChecked && !authUserId && resultTab !== "nav" && resultTab !== "guide" && resultTab !== "tools" ? (
                /* [v40] 비로그인 — 메뉴(nav)·발행가이드(guide)·사진편집기(tools) 외 화면은 홈 대기(MainHero).
                   사진편집기는 비로그인도 전체 기능 테스트 허용, 저장 시점에만 로그인 게이트. */
                <MainHero />
              ) : resultTab === "nav" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 22px", background: "#f7f7fb" }}>
                  {navView === "why" ? (
                    <MainHero />
                  ) : (
                  <NavPanel
                    view={navView}
                    isLoggedIn={authChecked && authUserId}
                    authUserId={authUserId}
                    onOpenTools={() => { if (navView) setNavView(null); setHelpTab(null); setShowLogin(false); setResultTab("tools"); }}
                    toolsActive={resultTab === "tools"}
                    quotaInfo={quotaInfo}
                    storeName={storeName}
                    authEmail={authEmail}
                    industry={currentStore?.industry || CURRENT_INDUSTRY}
                    hubPosts={hubPosts}
                    hubSurvival={hubSurvival}
                    hubSurvivalItems={hubSurvivalItems}
                    hubLoading={hubLoading}
                    hubRanks={hubRanks}
                    rankDraft={rankDraft}
                    setRankDraft={setRankDraft}
                    saveRank={saveRank}
                    rankSaving={rankSaving}
                    coachOpen={coachOpen}
                    setCoachOpen={setCoachOpen}
                    hubStore={hubStore}
                    setHubStore={setHubStore}
                    industrySidePick={industrySidePick}
                    industryCenterSel={industryCenterSel}
                    setIndustryCenterSel={setIndustryCenterSel}
                    storeEditRef={storeEditRef}
                    publishApi={publishApi}
                    centerSpecialty={centerSpecialty}
                    saveStore={saveStore}
                    createStore={createStore}
                    storeSaving={storeSaving}
                    treatmentNames={menuTreatments.map(t => (t.menu || t.menuRef || t.name)).filter(Boolean)}
                    treatments={menuTreatments}
                    treatmentCats={activeCats}
                    masterMenuNames={masterMenus.map(t => (t.menu || t.menuRef || t.name)).filter(Boolean)}
                    currentIndustry={CURRENT_INDUSTRY}
                    myMenusMap={myMenusMap} setMyMenusMap={setMyMenusMap}
                    isMultiDept={_isMultiDept}
                    myMenuFlat={myMenuFlat}
                    deptLabelOf={deptLabel}
                    onRemoveMyMenuDept={removeMyMenuDept}
                    editingMenus={editingMenus} setEditingMenus={setEditingMenus}
                    menuToast={menuToast} setMenuToast={setMenuToast}
                    calMonth={calMonth} setCalMonth={setCalMonth}
                    menuWeights={menuWeights} setMenuWeights={setMenuWeights}
                    savedWeights={savedWeights} setSavedWeights={setSavedWeights}
                    weightsDirty={weightsDirty} setWeightsDirty={setWeightsDirty}
                    activePlan={activePlan} setActivePlan={setActivePlan}
                    extraMenus={extraMenus} setExtraMenus={setExtraMenus}
                    newMenuInput={newMenuInput} setNewMenuInput={setNewMenuInput}
                    onLogin={() => { setShowLogin(true); }}
                    onWriter={() => { setNavView(null); setResultTab("blog"); }}
                    onCoachMessage={(text) => {
                      // 운영코치 진단/조언 → 좌측 채팅창에 표시(화면 전환 없음 — 달력 보면서 조언 확인).
                      //   직전 메시지와 동일하면 스킵(탭 재진입 시 중복 누적 방지).
                      setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === "assistant" && last.text === text) return prev;
                        return [...prev, { role: "assistant", text }];
                      });
                    }}
                    onFillInput={(text, coachText) => {
                      // 추천 주제 → 좌측 입력창 채우기 (생성기 화면으로 전환, 제출은 사용자)
                      setNavView(null); setResultTab("blog"); setInput(text);
                      if (coachText) addMsg({ role: "assistant", text: coachText });
                    }}
                    onCalendarPick={({ topic, rep, sub }) => {
                      // [v94] 달력 클릭 → 통합 시술선택 화면으로 prefill 진입(일반/달력 합류지점 일원화).
                      //   topic(시술명 문자열)을 activeTreatments에서 매칭 → 시술 객체. 못 찾으면 시술 빈 채로 진입(사용자 선택).
                      // [v135] restaurant 매칭 버그 수정: restaurant 항목은 표시명을 menu/menuRef에 담고
                      //   name에는 내부 id(rest_boonsik_tteokbokki_gongleung_01)를 둔다. topic="떡볶이"는 name과
                      //   절대 안 맞아 treatObj=null → 프리필 소실 → 순대국 기본값으로 떨어졌다. 매칭 라벨을
                      //   menu||menuRef||name으로 확장(운영레이어). 의료군은 menu/menuRef 부재 → name으로 동일 동작.
                      const _label = t => t.menu || t.menuRef || t.name;
                      // [MultiDeptMenu-fix] 달력에는 전 진료과 메뉴가 섞여 있다. activeTreatments(=CURRENT_INDUSTRY 단일과)
                      //   에서만 찾으면 타 진료과 메뉴는 매칭 실패 → treatObj=null → 프리필 소실(작성 버튼 비활성).
                      //   다중과는 hospitalMasterTreatments(전 진료과 마스터, __dept 부착) 우선으로 탐색한다.
                      const _pool = _isMultiDept
                        ? (hospitalMasterTreatments || activeTreatments || [])
                        : (activeTreatments || []);
                      const matched = _pool.find(t => _label(t) === topic)
                        || _pool.find(t => topic && topic.includes(_label(t)));
                      // [v136] treatObj.name = 표시명(menu/menuRef 우선). placeholder name("이 분식집") 노출 차단.
                      //   id는 매칭·payload용 실 id 유지. menu/menuRef도 보존(save payload 표시명 정합).
                      //   __dept 보존 → 생성 시 _genIndustry가 해당 진료과 엔진으로 자동 라우팅.
                      const treatObj = matched
                        ? { id: matched.id, name: _label(matched), menu: matched.menu, menuRef: matched.menuRef,
                            emoji: matched.emoji, cat: matched.cat, __dept: matched.__dept, _raw: matched }
                        : null;
                      setCalendarPrefill({ treatment: treatObj, rep: rep || "", sub: sub || "" });
                      setNavView(null);
                      setResultTab("blog");
                      setStage("treatment");
                      setPendingTreatment(null);
                      setShowTreatmentSelect(true);
                    }}
                    onGenerate={(text) => {
                      // 추천 주제 → 바로 생성 (1클릭). 생성기 화면 전환 후 즉시 제출.
                      setNavView(null); setResultTab("blog"); setInput(text); handleSend(text);
                    }}
                    onCoachVideo={(key) => setCoachVideoKey(key)}
                    onGoIndustryCenter={() => {
                      // [A안] 업종센터 진입 — 좌측 대화창 닫고 우측 industry 트리/상세.
                      setHelpTab(null); setResultTab("nav"); setNavView("industry");
                    }}
                    onTabChange={(tabId) => {
                      // [v18x] 최근발행 URL 등록 성공 → 목록 갱신 신호. 탭 전환 아님.
                      if (tabId === "__refreshHub") { fetchHub(); return; }
                      // [v42] 우측 운영허브 내부 탭 전환 시 좌측 연동.
                      //   로그인: AI 코치 패널(CoachPanel)이 stats/coach/posts/survival/account/plans/store/manage 처리.
                      //   비로그인: HELP_CONTENT 있는 탭만 정적 안내.
                      // [v95] navView도 동기화 — 상단 공통 메뉴줄 active 표시가 내부 탭 변경과 일치하도록.
                      if (tabId && HUB_IDS.includes(tabId)) { setNavView(tabId); setResultTab("nav"); }
                      if (authUserId) {
                        setHelpTab(tabId || null);
                      } else {
                        setHelpTab(HELP_CONTENT[tabId] ? tabId : null);
                      }
                    }}
                  />
                  )}
                </div>
              ) : resultTab === "tools" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
                  <ToolsAccordion
                    defaultOpenId="watermark"
                    isAuthed={!!(authChecked && authUserId)}
                    onRequireAuth={() => { setShowLogin(true); }}
                  />
                </div>
              ) : resultTab === "guide" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
                  <GuideAccordion defaultOpenId="first" />
                  <div style={{ height: 40 }} />
                </div>
              ) : showTreatmentSelect && !pendingTreatment && (stage === "treatment" || stage === "generating") ? (
                <TreatmentSelectBoard
                  key={(showDeptSwitch ? `d-${CURRENT_INDUSTRY}-` : "") + (calendarPrefill ? `cal-${calendarPrefill.rep || "x"}` : "direct")}
                  treatments={menuTreatments}
                  cats={activeCats}
                  currentIndustry={CURRENT_INDUSTRY}
                  initialTreatment={calendarPrefill?.treatment || null}
                  initialRep={calendarPrefill?.rep || ""}
                  initialSub={calendarPrefill?.sub || ""}
                  entryMode={calendarPrefill ? "calendar" : "direct"}
                  storeInfo={hubStore}
                  isGenerating={stage === "generating"}
                  onPickChange={(t) => { if (calendarPrefill) setCalendarPrefill(prev => prev ? { ...prev, treatment: t } : prev); }}
                  onEditStore={() => { setShowTreatmentSelect(false); setNavView("store"); setResultTab("nav"); }}
                  onSelect={(t) => {
                    // restaurant 등 onSelect 직접 흐름
                    setShowTreatmentSelect(false);
                    addMsg({ role: "user", text: t.name });
                    // [v124] 업체정보 대표지역 있으면 레거시 지역선택 화면 스킵 → 바로 분석/생성.
                    //   없을 때만 기존 지역 대기(pendingTreatment) 경로 유지.
                    const storeRegion = (hubStore?.region || "").trim();
                    if (storeRegion) {
                      setPendingTreatment(null);
                      setStage("treatment");
                      analyzeKeyword({ treatmentId: t.id, treatmentName: t.name, region: storeRegion }, t.name);
                      return;
                    }
                    if (CURRENT_INDUSTRY === "restaurant") {
                      setPendingTreatment(t);
                    } else {
                      setPendingTreatment({ id: t.id, name: t.name });
                    }
                    setStage("treatment");
                  }}
                  onComplete={(t, region, hallName, intentId) => {
                    // [v111] 페이지 전환 없이 버튼만 '작성 중'으로 변환 → 보드를 계속 마운트 유지.
                    //   showTreatmentSelect/calendarPrefill은 result 진입 시 정리(아래 useEffect). 여기선 stage만 generating으로.
                    setPendingTreatment(null);
                    addMsg({ role: "user", text: `${region} ${t.name}` });
                    // [WIRING-01C] hallName = 사용자 입력 SoT. parsed에 실어 handleAnalysisSelect까지 무손실 전달.
                    // [WIRING-03] intentId 도 동일 경로. 미정의 cat 이면 "" → 서버가 기존 경로로 생성.
                    analyzeKeyword({ treatmentId: t.id, treatmentName: t.name, region, hallName: hallName || "", intentId: intentId || "" }, t.name);
                  }}
                />
              ) : stage === "analysis" && analysisData ? (
                /* ⚠️ [v131] DEAD CODE — analysis 렌더분기. stage="analysis" 진입은 도달불가 폴백뿐 → 미렌더. 삭제 보류. */
                <AnalysisBoard
                  analysis={analysisData}
                  onSelect={(s, regionOverride) => handleAnalysisSelect(s, analysisData, regionOverride)}
                  selectedIdx={selectedStrategyIdx}
                  onSelectIdx={setSelectedStrategyIdx}
                />
              ) : pendingTreatment && stage === "treatment" ? (
                /* 시술 선택 후 지역 선택 — 우측 패널 */
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px", background: "#f7f7fb",
                  animation: "fadeIn .25s ease" }}>
                  <div style={{ background: "#fff", borderRadius: 14,
                    border: "2px solid #9C27B0", padding: "20px 18px",
                    boxShadow: "0 3px 14px rgba(123,31,162,.1)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#9C27B0", marginBottom: 6 }}>
                      {CURRENT_INDUSTRY === "restaurant" ? "🍽️" : "💉"} {pendingTreatment.name} 선택됨
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1a2e", marginBottom: 16 }}>
                      📍 지역을 선택하세요
                    </div>
                    {/* 자주 쓰는 지역 버튼 */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
                      {["강남","압구정","청담","서초","홍대","분당","수원","별내","동탄","인천","부산","대구","광주","대전"].map(r => (
                        <button key={r}
                          onClick={() => {
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }}
                          style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
                            border: "1.5px solid #e0d0f0", background: "#fff", color: "#4A148C",
                            cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                          onMouseOver={e => { e.currentTarget.style.background = "#F3E5F5"; e.currentTarget.style.borderColor = "#CE93D8"; }}
                          onMouseOut={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e0d0f0"; }}>
                          {r}
                        </button>
                      ))}
                    </div>
                    {/* 직접 입력 */}
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>직접 입력 (중랑구, 수원시, 해운대구 등)</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <input
                        id="region-direct-input"
                        placeholder="예: 중랑구"
                        style={{ flex: 1, padding: "10px 14px", borderRadius: 10,
                          border: "1.5px solid #e0d0f0", fontFamily: "inherit",
                          fontSize: 13, outline: "none" }}
                        onKeyDown={e => {
                          if (e.key === "Enter" && e.target.value.trim()) {
                            const r = e.target.value.trim();
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const el = document.getElementById("region-direct-input");
                          const r = el?.value?.trim();
                          if (r) {
                            setPendingTreatment(null);
                            addMsg({ role: "user", text: r });
                            analyzeKeyword({ treatmentId: pendingTreatment.id, treatmentName: pendingTreatment.name, region: r }, pendingTreatment.name);
                          }
                        }}
                        style={{ padding: "10px 18px", borderRadius: 10, border: "none",
                          background: "linear-gradient(135deg,#7B1FA2,#CE93D8)", color: "#fff",
                          fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                        확인
                      </button>
                    </div>

                    {/* ★ 현장 사진 업로드 (선택) — scene 강화 */}
                    <div style={{ paddingTop: 14, borderTop: "1px dashed #e0d0f0" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#7B1FA2", marginBottom: 6 }}>
                        📷 현장 사진 (선택) — 분위기 반영용, 최대 3장
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleScenePhotoUpload}
                        disabled={isAnalyzing}
                        style={{ fontSize: 12 }}
                      />
                      {isAnalyzing && (
                        <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
                          🔍 분석 중...
                        </div>
                      )}
                      {photoContext && !isAnalyzing && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                            ✓ 사진 {scenePhotos.length}장 반영 준비 완료 ({photoContext.length}자)
                          </span>
                          <button
                            onClick={clearScenePhotos}
                            style={{ padding: "2px 8px", fontSize: 11, borderRadius: 6,
                              border: "1px solid #ddd", background: "#fff", color: "#666",
                              cursor: "pointer", fontFamily: "inherit" }}>
                            초기화
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (stage !== "result" && stage === "welcome") ? (
                /* [v91] 운영허브('오늘의 시작') 폐기 — welcome 진입/복귀 시 MainHero 랜딩으로 통일. 통계는 마이페이지(관리) 참조. */
                <MainHero />
              ) : stage !== "result" ? (
                <StatusBoard
                  stage={stage}
                  industryConfig={activeConfig}
                  home={authChecked && authUserId ? (() => {
                    // 홈 요약 — 이미 로드된 quotaInfo/hubSurvival/hubPosts 재사용 (신규 fetch 없음)
                    const q = quotaInfo || {};
                    const unlimited = q.bypass === true || q.reason === "OWNER_BYPASS";
                    const used  = Number.isFinite(q.monthly_publish) ? q.monthly_publish : null;
                    const limit = Number.isFinite(q.monthly_quota)   ? q.monthly_quota   : null;
                    const usageText = unlimited ? "무제한" : (used != null && limit != null ? `${used}/${limit}` : null);
                    const recent = Array.isArray(hubPosts) ? filterRealPosts(hubPosts, _scopeInds).length : null; // [UI-SCOPE-01] 등록 분야 전체
                    const observing = hubSurvival && Number.isFinite(hubSurvival.unknown) ? hubSurvival.unknown : null;
                    // 관측 요약 — "내 글 살아있나?"가 사용자 1순위 관심. survival 데이터(alive/gone/unknown) 그대로 노출.
                    let verdict = "", verdictColor = "#888";
                    let surv = null;
                    if (hubSurvival && hubSurvival.observed) {
                      const a = hubSurvival.alive ?? 0, g = hubSurvival.gone ?? 0, f = hubSurvival.fossil ?? 0;
                      const u = hubSurvival.unknown ?? 0;
                      const settled = a + g + f;
                      surv = { alive: a, gone: g, fossil: f, unknown: u, observed: hubSurvival.observed };
                      // 자연어 해석 — 숫자를 사장님 언어로. (점수 아님, 상태 설명)
                      const parts = [];
                      if (a > 0) parts.push(`${a}건이 유지되고 있습니다`);
                      if (g + f > 0) parts.push(`${g + f}건은 노출에서 밀렸습니다`);
                      if (u > 0) parts.push(`${u}건은 추가 관측이 필요합니다`);
                      surv.note = parts.join(", ") + ".";
                      // 상승/하락 — rank 데이터(hubRanks) 연동 후 채움. 지금은 자리만.
                      surv.up = (hubSurvival && Number.isFinite(hubSurvival.up)) ? hubSurvival.up : null;
                      surv.down = (hubSurvival && Number.isFinite(hubSurvival.down)) ? hubSurvival.down : null;
                      if (settled === 0) { verdict = "관측 중"; verdictColor = "#888"; }
                      else if (a / settled >= 0.6) { verdict = "안정적"; verdictColor = "#2e7d32"; }
                      else if (a / settled >= 0.3) { verdict = "보통";   verdictColor = "#E65100"; }
                      else { verdict = "주의"; verdictColor = "#c62828"; }
                    }
                    // 추천: 현재 업종 시술 중 최근 발행에 없는 것 1개 → "지역 시술 후기 써줘"
                    const posts = filterRealPosts(hubPosts, _scopeInds); // [UI-SCOPE-01] 등록 분야 전체
                    const freq = {};
                    for (const p of posts) { const t = (p.treatment_name || p.keyword || "").trim(); if (t) freq[t] = (freq[t]||0)+1; }
                    const ranked = Object.entries(freq).sort((a,b) => b[1]-a[1]);
                    const mainTopics = ranked.slice(0, 3).map(([k,c]) => ({ name: k, count: c }));
                    const names = menuTreatments.map(t => (t.menu || t.menuRef || t.name)).filter(Boolean); // [v134] restaurant cat 필터
                    const published = new Set(Object.keys(freq));
                    const gapTopics = names.filter(n => !published.has(n)).slice(0, 4);
                    const gap = gapTopics[0] || "";
                    // B: 분당 하드코딩 제거 — 실제 최빈 발행지역 사용
                    const regionFreqH = {};
                    for (const p of posts) { const r = (p.region || "").trim(); if (r) regionFreqH[r] = (regionFreqH[r]||0)+1; }
                    const regionRanked = Object.entries(regionFreqH).sort((a,b)=>b[1]-a[1]);
                    const topRegion = regionRanked[0]?.[0] || "";
                    const region = topRegion; // 추천 문구용 (없으면 빈 문자열 → 지역 없이)
                    const suggestQuery = gap ? `${region ? region + " " : ""}${gap} 후기 써줘` : "";
                    const suggestText = gap ? `아직 안 다룬 '${gap}' 주제로 한 건 써보세요.` : "";

                    // ④ 운영조언 4종 — 공백 / 과집중 / 활동성 / 지역편중 동시 분석.
                    //    각 advice: { type, icon, text, tone } tone=info|warn
                    const advices = [];
                    const total = posts.length;
                    // (1) 공백 — 안 다룬 주제
                    if (gap) {
                      advices.push({ type: "gap", icon: "💡",
                        text: `'${gap}'는 아직 한 번도 안 썼습니다. ${region ? region + " " : ""}${gap} 글을 써보세요.`, tone: "info" });
                    }
                    // (2) 과집중 — 1위 주제 비중 과도 (top/total ≥ 0.5 & 2건 이상)
                    if (ranked.length && total >= 3) {
                      const [topName, topCnt] = ranked[0];
                      const pct = Math.round((topCnt / total) * 100);
                      if (pct >= 50 && topCnt >= 2) {
                        advices.push({ type: "skew", icon: "⚠️",
                          text: `최근 발행의 ${pct}%가 '${topName}'에 집중돼 있습니다. 주제를 분산해보세요.`, tone: "warn" });
                      }
                    }
                    // (3) 활동성 — 최근 7일 발행 수
                    const now = Date.now();
                    const DAY = 86400000;
                    let last7 = 0;
                    for (const p of posts) {
                      const d = p.published_at || p.created_at;
                      if (!d) continue;
                      const t = new Date(d).getTime();
                      if (Number.isFinite(t) && (now - t) <= 7 * DAY) last7++;
                    }
                    if (total > 0) {
                      if (last7 === 0) {
                        advices.push({ type: "activity", icon: "📉",
                          text: `최근 7일간 발행이 없습니다. 활동성이 떨어지고 있어요.`, tone: "warn" });
                      } else if (last7 >= 3) {
                        advices.push({ type: "activity", icon: "🔥",
                          text: `최근 7일 ${last7}건 발행. 활동성이 좋습니다.`, tone: "info" });
                      }
                    }
                    // (4) 지역편중 — 한 지역 비중 과도 (top region ≥ 70% & 다른 지역 존재)
                    if (regionRanked.length >= 1 && total >= 3) {
                      const [rName, rCnt] = regionRanked[0];
                      const rPct = Math.round((rCnt / total) * 100);
                      if (rPct >= 70 && regionRanked.length === 1) {
                        advices.push({ type: "region", icon: "📍",
                          text: `${rName} 위주로 발행 중입니다. 인근 생활권으로 키워드를 넓혀보세요.`, tone: "info" });
                      } else if (rPct >= 70 && regionRanked.length > 1) {
                        advices.push({ type: "region", icon: "📍",
                          text: `발행이 ${rName}에 ${rPct}% 몰려 있습니다. 다른 지역도 보강해보세요.`, tone: "info" });
                      }
                    }
                    // 🎯 추천 주제 — 공백 우선 + 주력 확장. region 항상 포함(클릭 즉시 생성).
                    const recosH = (() => {
                      const rg = region ? region + " " : "";
                      const out = []; const seen = new Set();
                      const add = (t, reason) => { t = (t||"").trim(); if (!t||seen.has(t)||out.length>=3) return; seen.add(t); out.push({ topic: t, label: `${rg}${t}`, reason, query: `${rg}${t} 후기 써줘` }); };
                      for (const g of gapTopics) add(g, "아직 한 번도 안 씀");
                      for (const m of mainTopics) add(m.name, "주제 다양화");
                      return out;
                    })();
                    return { recent, usageText, observing, surv, advices, topRegion: region, suggestQuery, suggestText, verdict, verdictColor, mainTopics, gapTopics, recos: recosH };
                  })() : null}
                  onGenerate={(text) => { setInput(text); handleSend(text); }}
                  onFillInput={(text) => { setInput(text); }}
                  onResume={(draft) => {
                    addMsg({ role: "user", text: `${draft.region} ${draft.treatmentName} 이어쓰기` });
                    generate(draft.treatmentId, draft.region, draft.blogType || "review", draft.targetId || "consult", null, draft.treatmentName || "");
                  }}
                  onNewStart={() => {
                    setStage("welcome");
                    addMsg({ role: "assistant", text: "새로 시작합니다!\n어떤 시술 블로그를 작성할까요?" });
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "fadeIn .3s ease" }}>

                  {/* 헤더 — 본문 탭일 때만 표시 */}
                  {resultTab === "blog" && (() => {
                    // [v111] 제목 추출 — result.title 없으면 본문 첫 # 헤더에서.
                    let postTitle = result.title || "";
                    if (!postTitle && result.text) {
                      const m = result.text.match(/^#{1,6}\s+(.+)$/m);
                      if (m) postTitle = m[1].trim();
                    }
                    return (
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e8ed", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10, gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 생성 완료 라벨 + 메타 한 줄 */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: "#2e7d32" }}>✔ 생성 완료</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#888" }}>
                            {charCount.toLocaleString()}자 · 읽기 약 {Math.max(1, Math.round(charCount / 500))}분
                            {diagLoading ? "  · ● 분석 중" : ""}
                          </span>
                          {!diagLoading && (
                            <span style={{ display: "inline-flex", gap: 5 }}>
                              {["광고법 기준", "SEO 검토"].map(t => (
                                <span key={t} style={{ fontSize: 10.5, fontWeight: 800, color: "#2e7d32",
                                  background: "#EDF7EE", border: "1px solid #c8e6c9",
                                  borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>✓ {t}</span>
                              ))}
                            </span>
                          )}
                        </div>
                        {/* 제목 + 우측 작은 복사 아이콘 (보조 기능) */}
                        {/* [v135] One Click Publishing — 제목 복사 버튼 폐기.
                            전체 복사에 제목이 첫 줄로 포함된다(copyPlainText가 # 제거). */}
                        {postTitle && (
                          <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1a1a2e",
                            lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {postTitle}
                          </div>
                        )}
                      </div>
                      <button onClick={() => { setResult(null); setStage("welcome"); }}
                        style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: "1px solid #e8e8ed",
                          cursor: "pointer", background: "#fff", color: "#999", fontSize: 13,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>

                    {/* 전체 복사 버튼 */}
                    <button
                      onClick={async () => {
                        const ok = await copyPlainText(withTitleForCopy(result.text || result.textMarkdown, postTitle));
                        if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
                        else { alert("복사에 실패했습니다. 본문을 직접 드래그해 복사해주세요."); }
                      }}
                      style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                        cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                        background: copied ? "#e8f5e9" : "linear-gradient(135deg,#4A148C,#9C27B0)",
                        color: copied ? "#2e7d32" : "#fff",
                        boxShadow: copied ? "none" : "0 2px 8px rgba(74,20,140,.2)" }}>
                      {copied ? "✅ 복사됨 — 네이버 블로그에 붙여넣기" : "📋 전체 복사 (제목 + 본문)"}
                    </button>

                    {/* [v-url2] 결과화면은 '글 생성'만 담당 — 발행·URL 등록 안내 박스 제거.
                        URL 등록은 「최근발행」 탭 단일 경로. */}
                  </div>
                  ); })()}

                  {/* ── 탭 콘텐츠 ── */}
                  <div style={{ flex: 1, overflowY: "auto" }}>

                    {/* 탭 1: 본문 */}
                    {resultTab === "blog" && (
                      <div style={{ padding: "18px 22px" }}>
                        {/* [v3.6.7] UI는 textMarkdown 사용 — [이미지:] 마커 필요 (사진 업로드 UX 유지) */}
                        {/* 복사 버튼은 위에서 result.text(박스 평문) 사용 — 분기 정상 */}
                        <BlogContent text={result.textMarkdown || result.text} uploadedImgs={uploadedImgs} onUpload={handleBlogImgUpload} />

                        {/* 발행 전 체크리스트 */}
                        <div style={{ marginTop: 24, background: "#faf8ff", borderRadius: 12,
                          border: "1px solid #ede8f8", padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#7B1FA2", marginBottom: 10 }}>📋 발행 전 체크리스트</div>
                          {[
                            { label: "제목 수정",  desc: "지역+시술+상황 포함 여부 확인" },
                            (() => {
                              const _pp = getPhotoPolicy(CURRENT_INDUSTRY);
                              return _pp
                                ? { label: `이미지 ${_pp.baseCount}장`, desc: photoDescLine(_pp) }
                                : { label: "이미지 5장", desc: "고민·상담·시술전·시술후·결과" };
                            })(),
                            { label: "사진 자리",  desc: "[📷 사진N] 위치에 본인 사진 끼우기" },
                            { label: "첫 문단",    desc: "2줄 이내로 짧게 시작하는지 확인" },
                            { label: "마지막 줄",  desc: "전환 문장 자동 추가됨 ✅" },
                          ].map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                              padding: "5px 0", borderBottom: i < 4 ? "1px solid #f0ebff" : "none" }}>
                              <span style={{ fontSize: 14 }}>{i === 4 ? "✅" : "☐"}</span>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{item.label}</span>
                                <span style={{ fontSize: 11, color: "#999", marginLeft: 6 }}>{item.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ height: 40 }} />
                      </div>
                    )}

                    {/* 탭 2: 사진편집기 */}
                    {resultTab === "tools" && (
                      <div style={{ padding: 0 }}>
                        <ToolsAccordion
                          defaultOpenId="watermark"
                          isAuthed={!!(authChecked && authUserId)}
                          onRequireAuth={() => { setShowLogin(true); }}
                        />
                      </div>
                    )}

                    {/* 탭 3: 가이드 */}
                    {resultTab === "guide" && (
                      <div style={{ padding: "18px 22px" }}>
                        <GuideAccordion defaultOpenId="first" />
                        <div style={{ height: 40 }} />
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* [PG] 전체 폭 한 줄 푸터 — 좌우 공용. KG이니시스 심사 요건(사업자정보 상시 노출).
          좌측 사이드바 정책 링크는 navOpen 기본값 false(접힘)이라 첫 화면에서 안 보인다. */}
      <SiteFooter
        onDoc={(id) => { setHelpTab(null); setResultTab("nav"); setNavView("doc:" + id); }}
      />

      </div>

      {/* ───────────────────────────────────────────────── */}
      {/* [51차] quota 차단 모달 — 발행 직전 check-quota 결과 */}
      {/* ───────────────────────────────────────────────── */}
      {quotaModal && (
        <div
          onClick={() => setQuotaModal(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, animation: "fadeIn .15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14, padding: "28px 28px 22px",
              maxWidth: 420, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              fontFamily: "inherit",
            }}
          >
            {quotaModal.type === "login_required" && (
              <>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>
                  로그인이 필요합니다
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 18 }}>
                  발행 기록을 저장하려면 먼저 로그인해주세요.<br/>
                  로그인하면 월 발행 한도와 통계가 자동 관리됩니다.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setQuotaModal(null)}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ddd",
                      background: "#fff", color: "#666", fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >취소</button>
                  <button
                    onClick={() => { setQuotaModal(null); router.push("/login"); }}
                    style={{
                      flex: 2, padding: "11px 0", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg,#7B1FA2,#9C27B0)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >로그인하러 가기</button>
                </div>
              </>
            )}

            {quotaModal.type === "quota_exceeded" && (
              <>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📛</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#c62828", marginBottom: 8 }}>
                  {quotaModal.detail?.period_basis === "subscription" ? "이용기간" : "이번 달"} 발행 한도에 도달했습니다
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 14 }}>
                  현재 플랜: <b>{quotaModal.detail?.plan_id || "free"}</b><br/>
                  {quotaModal.detail?.period_basis === "subscription" ? "이용기간" : "이번 달"} 발행: <b>{quotaModal.detail?.monthly_publish ?? "?"}건</b>
                  {" / "}한도 <b>{quotaModal.detail?.monthly_quota ?? "?"}건</b>
                </div>
                <div style={{
                  background: "#fff8f0", border: "1px solid #ffe0b2", borderRadius: 8,
                  padding: "10px 12px", fontSize: 12, color: "#E65100", lineHeight: 1.6,
                  marginBottom: 18,
                }}>
                  {(quotaModal.detail?.period_basis === "subscription" && quotaModal.detail?.period_end) && (() => {
                    const d = new Date(quotaModal.detail.period_end);
                    if (isNaN(d.getTime())) return null;
                    return <>💡 현재 이용기간 종료일 : {`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`}<br/></>;
                  })()}
                  새 이용권을 구매하면 결제 시점부터 바로 다시 생성할 수 있습니다.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setQuotaModal(null); goCoachBg(); }}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ddd",
                      background: "#fff", color: "#666", fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >확인</button>
                  <button
                    onClick={() => { setQuotaModal(null); setNavView("plans"); setResultTab("nav"); }}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg,#7B1FA2,#9C27B0)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >플랜 보기</button>
                </div>
              </>
            )}

            {quotaModal.type === "inactive" && (
              <>
                <div style={{ fontSize: 36, marginBottom: 10 }}>⛔</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#c62828", marginBottom: 8 }}>
                  계정이 비활성 상태입니다
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 18 }}>
                  현재 계정으로는 발행이 제한됩니다.<br/>
                  운영자에게 문의해주세요.
                </div>
                <button
                  onClick={() => setQuotaModal(null)}
                  style={{
                    width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
                    background: "#666", color: "#fff",
                    fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}
                >확인</button>
              </>
            )}

            {quotaModal.type === "not_found" && (
              <>
                <div style={{ fontSize: 36, marginBottom: 10 }}>❓</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>
                  계정 정보를 찾을 수 없습니다
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, marginBottom: 18 }}>
                  로그인 세션은 있지만 계정 등록이 완료되지 않았습니다.<br/>
                  다시 로그인하시거나 운영자에게 문의해주세요.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setQuotaModal(null)}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid #ddd",
                      background: "#fff", color: "#666", fontWeight: 700, fontSize: 13,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >취소</button>
                  <button
                    onClick={() => { setQuotaModal(null); router.push("/login"); }}
                    style={{
                      flex: 2, padding: "11px 0", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg,#7B1FA2,#9C27B0)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >로그인 페이지로</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
