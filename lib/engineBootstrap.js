// ============================================================
// engineBootstrap.js — 엔진 등록 (부트스트랩)
// ------------------------------------------------------------
// 기존 generateXxx 핸들러를 Registry에 "등록만" 한다.
//   · 핸들러 코드는 1바이트도 수정하지 않는다 (래퍼만).
//   · dental 은 'spine에 등록된 기존 엔진'으로 자연 편입 (설계서 §8-3).
//
// generate.js 가 이 파일을 import 하면 모든 업종이 한 번에 등록된다.
// Registry.resolve(industry) 가 곧 라우팅 테이블.
// ============================================================

import { register } from "./engineRegistry";

import handleClinic      from "../pages/api/generateClinic";      // [v1 보존·미호출] clinic V2 승격(2026-07-13). 롤백용.
import handleClinicV2    from "../pages/api/generateClinicV2";  // ← 성형외과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handleDental      from "../pages/api/generateDental";
import handleDentalV2    from "../pages/api/generateDentalV2";  // ← 치과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handleEnt         from "../pages/api/generateEnt";      // [v1 보존·미호출] ent V2 승격(2026-07-13). 롤백용.
import handleEntV2       from "../pages/api/generateEntV2";    // ← 이비인후과 V2 Purpose (decisionAxis 이중축 exam4/disease10 · v1 4파일 무손상 / 관측 전)
import handleUrology     from "../pages/api/generateUrology";    // [v1 보존·미호출] urology V2 승격(2026-07-13). 롤백용.
import handleUrologyV2   from "../pages/api/generateUrologyV2";  // ← 비뇨기과 V2 Purpose (decisionAxis 이중축 exam5/disease9 · v1 4파일 무손상 / 관측 전)
import handleOriental    from "../pages/api/generateOriental";
import handleOrtho       from "../pages/api/generateOrtho";
import handleOrthoV2     from "../pages/api/generateOrthoV2";  // ← 정형외과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handlePediatrics  from "../pages/api/generatePediatrics";        // v1 — 롤백용 보존(미호출)
import handlePediatricsV2 from "../pages/api/generatePediatricsV2";     // ★ V2 (2026-07-13 승격)
import handleGastro      from "../pages/api/generateGastro";      // ← v1(후기형) — 미호출·롤백용 보존 (V2 승격 2026-07-14)
import handleGastroV2    from "../pages/api/generateGastroV2"; // ← 소화기내과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handleGeneral     from "../pages/api/generateGeneral";
import handleGeneralV2   from "../pages/api/generateGeneralV2"; // ← 내과 Purpose Engine v2 (1차 진료 허브 · mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handleObgyn       from "../pages/api/generateObgyn";      // [v1 보존·미호출] obgyn V2 승격(2026-07-13). 롤백용.
import handleObgynV2     from "../pages/api/generateObgynV2";    // ← 산부인과 V2 Purpose (decisionAxis 이중축 exam5/disease9 · v1 4파일 무손상 / 관측 전)
import handleDermaV2     from "../pages/api/generateDermaV2"; // ← 피부과 V2 Purpose (decisionAxis 이중축 disease18/procedure9 · v1 generateDerma 보존·미호출 / 관측 전)
import handlePain        from "../pages/api/generatePain";
import handlePainV2      from "../pages/api/generatePainV2";  // ← 통증의학과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handleRadio       from "../pages/api/generateRadio";   // ← 영상의학과 (신규, 검사형·정보형·판독중심 / CT·MRI·초음파 격리 / 관측 전)
import handlePulmoV2    from "../pages/api/generatePulmoV2"; // ← 호흡기내과 (신규 업종, V2 Purpose 단독 · v1 없음 / decisionAxis 이중축 / 관측 전)
import handleCardV2     from "../pages/api/generateCardV2";  // ← 순환기내과 (신규 업종, V2 Purpose 단독 · v1 없음 / decisionAxis 이중축 / 관측 전)
import handleEndoV2     from "../pages/api/generateEndoV2";  // ← 내분비내과 (신규 업종, V2 Purpose 단독 · v1 없음 / decisionAxis 이중축 / 관측 전)
import handleNeuro       from "../pages/api/generateNeuro";
import handleNeuroV2     from "../pages/api/generateNeuroV2";  // ← 신경외과 Purpose Engine v2 (mode='purpose' 시 위임 / v1·v2 파일 무손상)
import handlePsyV2       from "../pages/api/generatePsyV2";   // ★ [V2 승격 2026-07-13] psy 직결
// import handlePsy      from "../pages/api/generatePsy";      // v1 롤백용 보존 (미호출)
import handleEye         from "../pages/api/generateEye";      // [v1 보존·미호출] eye V2 승격(2026-07-13). 롤백용.
import handleEyeV2       from "../pages/api/generateEyeV2";    // ← 안과 V2 Purpose (decisionAxis 이중축 exam5/disease9 · 재구축 2026-07-13 / 관측 전)
import handleFamily      from "../pages/api/generateFamilyV2";   // ← V2 승격 (v1 generateFamily 보존, 참조만 교체)
import handleCafe        from "../pages/api/generateCafe";
import handleRestaurant  from "../pages/api/generateRestaurant";
import handleKindergarten from "../pages/api/generateKindergarten"; // ← 유치원 (반장 edu 18 이식·정보형·기관화자·섹션루프 / 관측 전)
import handleChinese     from "../pages/api/generateChinese";  // ← 중식(중화요리) (신규, 비의료·정보형·중식당화자 / 복사베이스 restaurant 풀복제·섹션루프 / 관측 전)
import handleKorean      from "../pages/api/generateKorean";   // ← 한식 (신규, 비의료·정보형·한식당화자 / 복사베이스 Chinese FREEZE본 풀복제·섹션루프 / 관측 전)
import handleLegal       from "../pages/api/generateLegal";   // ← 법무사 (v142)
import handleBedding     from "../pages/api/generateBedding"; // ← 이브자리 침구 (v10)
import handleLawyer      from "../pages/api/generateLawyer";  // ← 변호사 (v29 — 신규, 비의료·정보형)
import handleDaycare     from "../pages/api/generateDaycare"; // ← 주간보호센터 (신규, 비의료·정보형 / 복사베이스 lawyer)
import handleHomecare    from "../pages/api/generateHomecare"; // ← 방문요양 (신규, 비의료·정보형 / 복사베이스 daycare)
import handleFuneral     from "../pages/api/generateFuneral";  // ← 상조 (신규, 비의료·정보형·장례지도사화자 / 복사베이스 daycare)
import handleTax         from "../pages/api/generateTax";      // ← 세무사 (신규, 비의료·정보형·세무사화자 / 복사베이스 funeral)
import handleLabor       from "../pages/api/generateLabor";    // ← 노무사 (신규, 비의료·정보형·공인노무사화자 / 복사베이스 tax)
import handleFlower      from "../pages/api/generateFlower";   // ← 꽃배달 (신규, 비의료·정보형·플로리스트화자 / 복사베이스 daycare·단일호출)
import handleWelfarecare from "../pages/api/generateWelfarecare"; // ← 복지용구 (신규, 비의료·정보형·사업소화자 / 복사베이스 daycare·단일호출)
import handleAdministrative from "../pages/api/generateAdministrative"; // ← 행정사 (신규, 비의료·정보형·행정사화자 / 복사베이스 lawyer·섹션루프)
import handleRealestate   from "../pages/api/generateRealestate";  // ← 부동산 (신규, 비의료·분석리포트형·공인중개사화자 / 복사베이스 lawyer·섹션루프)
import handleCleaning     from "../pages/api/generateCleaning";    // ← 입주청소 (신규, 비의료·정보형·청소업체화자 / 복사베이스 realestate·섹션루프)
import handleMoving       from "../pages/api/generateMoving";      // ← 이사업체 (신규, 비의료·정보형·이사업체화자 / 복사베이스 cleaning·섹션루프)
import handleInterior     from "../pages/api/generateInterior";    // ← 인테리어 (신규, 비의료·정보형·인테리어업체화자 / 복사베이스 moving·섹션루프)
import handleGrout        from "../pages/api/generateGrout";       // ← 줄눈 (신규, 비의료·정보형·줄눈시공업체화자 / 복사베이스 interior70%+cleaning30%·섹션루프)
import handleCoating      from "../pages/api/generateCoating";     // ← 탄성코트 (신규, 비의료·정보형·탄성코트업체화자 / 복사베이스 grout·섹션루프)
import handleSystemair    from "../pages/api/generateSystemair";   // ← 시스템에어컨 (신규, 비의료·정보형·시스템에어컨업체화자 / 복사베이스 coating·섹션루프)
import handleAirclean     from "../pages/api/generateAirclean";    // ← 에어컨청소 (신규, 비의료·정보형·에어컨청소업체화자 / 복사베이스 coating·섹션루프 / 청소전용, 설치오염 차단)
import handleScreen      from "../pages/api/generateScreen";     // ← 방충망 (신규, 비의료·정보형·방충망업체화자 / 복사베이스 airclean·useApt)
import handlePestcontrol from "../pages/api/generatePestcontrol"; // ← 방역 (신규, 비의료·정보형·방역업체화자 / 복사베이스 cleaning·섹션루프·출장업종)
import handleBuildingclean from "../pages/api/generateBuildingclean"; // ← 건물청소 (신규, 비의료·정보형·건물청소업체화자 / 복사베이스 cleaning70%+pestcontrol20%·섹션루프·출장업종)
import handleBirdcontrol  from "../pages/api/generateBirdcontrol";  // ← 비둘기퇴치 (신규, 비의료·정보형·비둘기퇴치업체화자 / 복사베이스 pestcontrol50%+buildingclean30%+screen20%·섹션루프·출장업종)
import handleTankclean    from "../pages/api/generateTankclean";    // ← 저수조청소 (신규, 비의료·정보형·저수조청소업체화자 / 복사베이스 cleaning70%+pestcontrol20%+birdcontrol10%·섹션루프·출장업종·useApt)
import handleLeakdetect   from "../pages/api/generateLeakdetect";   // ← 누수탐지 (신규, 비의료·정보형·누수탐지업체화자 / 복사베이스 tankclean70%+buildingclean60%·섹션루프·출장업종·useApt)
import handleSewer        from "../pages/api/generateSewer";        // ← 하수구막힘 (신규, 비의료·정보형·하수구막힘업체화자 / 복사베이스 leakdetect70%·섹션루프·출장업종·APT미사용)
import handlePlumbing     from "../pages/api/generatePlumbing";     // ← 수도설비 (신규, 비의료·정보형·수도설비업체화자 / 복사베이스 sewer70%·섹션루프·출장업종·APT미사용)
import handleBoiler       from "../pages/api/generateBoiler";       // ← 보일러설치 (신규, 비의료·정보형·보일러설치업체화자 / 복사베이스 systemair70%·섹션루프·출장업종·APT미사용)
import handleHomefix      from "../pages/api/generateHomefix";      // ← 집수리 (신규, 비의료·정보형·집수리업체화자 / 복사베이스 boiler·섹션루프·출장업종·APT미사용)
import handleElectricrepair from "../pages/api/generateElectricrepair"; // ← 전기수리 (신규, 비의료·정보형·전기수리업체화자 / 복사베이스 homefix80%+plumbing20%·섹션루프·출장업종·APT미사용)
import handleSinkrepair    from "../pages/api/generateSinkrepair";    // ← 싱크대수리 (신규, 비의료·정보형·싱크대수리업체화자 / 복사베이스 homefix60%+plumbing20%+interior20%·섹션루프·출장업종·APT미사용 / 수리전용, 제작·리폼 차단)
import handleSeniorgoods   from "../pages/api/generateSeniorgoods";   // ← 노인용품 (신규, 비의료·정보형·노인용품전문점화자 / 복사베이스 welfarecare·단일호출 / 17메뉴: 제품12+정보5, 판매·가격유도 차단)
import handleBathroom      from "../pages/api/generateBathroom";      // ← 욕실리모델링 (신규, 비의료·정보형·욕실리모델링업체화자 / 복사베이스 homefix40%+sinkrepair30%+plumbing20%+grout10%·단일호출 섹션루프·출장업종·APT미사용 / 12메뉴)
import handleSnack         from "../pages/api/generateSnack";         // ← 분식 (신규, 비의료·정보형·분식집화자 / 복사베이스 Korean(Restaurant) FREEZE본 풀복제·섹션루프 / class 4축 soup·meat·rice·noodle / 13메뉴 / 관측 전)
import handleJapanese     from "../pages/api/generateJapanese";     // ← 일식 (신규, 비의료·정보형·일식당화자 / 복사베이스 Chinese 풀복제·섹션루프 / cat 4계열 sushi·noodle·fried·rice / 13메뉴 / 관측 전)
import handleWestern      from "../pages/api/generateWestern";      // ← 양식 (신규, 비의료·정보형·양식당화자 / 복사베이스 Chinese 풀복제·섹션루프 / cat 4계열 면·밥·고기·단품 / 8메뉴 / 관측 전)
import handleChicken      from "../pages/api/generateChicken";     // ← 치킨 (신규, 비의료·정보형·치킨집화자 / 복사베이스 Japanese 풀복제·섹션루프 / cat 4계열 fried·seasoned·oven·special / 12메뉴 / 관측 전)
import handleFishing      from "../pages/api/generateFishing";     // ← 고패킹·바다낚시 (신규, 비의료·정보형·낚시화자 / 반장 fishing 이식·단일호출형(섹션루프X) / 글유형 method·analysis·compare 3종 + 숨김 catch·review·guide / 관측 전)
import handleMeat        from "../pages/api/generateMeat";        // ← 고깃집 (신규, 비의료·정보형·고깃집화자 / 복사베이스 Restaurant v2 풀복제·섹션루프 / cat 단일 고깃집·8메뉴(돼지5+소3)·SCENE 불판/굽기/쌈·국물 ritual 분리 / 관측 전)
import handleDobae       from "../pages/api/generateDobae";       // ← 도배 (신규, 비의료·정보형·도배업체화자 / 복사베이스 buildingclean·섹션루프·출장업종 / siteBlock(단지명·평형) 최초 적용 업종 / 9메뉴 / 관측 전)
import handleFlooring    from "../pages/api/generateFlooring";    // ← 장판 (신규, 비의료·정보형·장판시공업체화자 / 복사베이스 dobae·섹션루프·출장업종 / siteBlock(단지명·평형) + 두께(T) 축 / 10메뉴 / 관측 전)
import handleFilm        from "../pages/api/generateFilm";        // ← 인테리어필름 (신규, 비의료·정보형·필름시공업체화자 / 복사베이스 flooring·섹션루프·출장업종 / siteBlock(단지명·평형) + 하지(下地) 축 / 10메뉴 / 관측 전)
import handleDoor        from "../pages/api/generateDoor";        // ← 도어수리 (신규, 비의료·정보형·도어수리업체화자 / 복사베이스 film·섹션루프·출장수리 / siteBlock 미사용 / 부품군 축 / 10메뉴 / 관측 전)
import handleWaterproof  from "../pages/api/generateWaterproof";  // ← 방수공사 (신규, 비의료·정보형·방수시공업체화자 / 복사베이스 door·섹션루프·출장시공 / siteBlock 미사용 / 원인군 축 / 9메뉴 / 관측 전)
import handlePaint       from "../pages/api/generatePaint";       // ← 페인트공사 (신규, 비의료·정보형·페인트시공업체화자 / 복사베이스 waterproof·섹션루프·출장시공 / siteBlock 미사용 / 원인군 축 / 8메뉴 / 관측 전)
import handleTile        from "../pages/api/generateTile";        // ← 타일시공 (신규, 비의료·정보형·타일시공업체화자 / 복사베이스 paint·섹션루프·출장시공 / siteBlock 미사용 / 철거·덧방 판단 축 / 6메뉴 / 관측 전)
import handleWindow      from "../pages/api/generateWindow";      // ← 창호시공 (신규, 비의료·정보형·창호시공업체화자 / 복사베이스 tile·섹션루프·출장시공 / siteBlock 미사용 / 전체교체·부분보수 판단 축 / 6메뉴 / 관측 전)
import handleFurniture   from "../pages/api/generateFurniture";   // ← 맞춤가구 (신규, 비의료·정보형·맞춤가구제작업체화자 / 복사베이스 lighting·섹션루프·출장제작설치 / siteBlock 미사용 / 자리 제약 판단 축 / 8메뉴 / 관측 전)
import handleLighting    from "../pages/api/generateLighting";    // ← 조명 (신규, 비의료·정보형·조명시공업체화자 / 복사베이스 window·섹션루프·출장시공 / siteBlock 미사용 / 배치 여건 판단 축 / 6메뉴 / 관측 전)
import handleDemolition  from "../pages/api/generateDemolition";  // ← 철거공사 (신규, 비의료·정보형·철거공사업체화자 / 복사베이스 tile·섹션루프·출장해체 / siteBlock 미사용 / 살릴면·뜯을면 판단 축 / 3메뉴 / 관측 전)
import handleShaman      from "../pages/api/generateShaman";     // ← 무속 상담 (신규, 비의료·공감형·상담소화자 / 신규 골격(복사베이스 없음)·단일호출 / SPECIALTY 6 × SITUATION 35 + 소개 6 = 41메뉴 / Engine A 상황공감·B 분야소개 / C 사례정리는 hidden(입력폼 UI 대기) / 의례 강권 차단·축별 고지 자동삽입 / 관측 전)

// ── 등록 (industry 문자열 → 기존 핸들러, 무수정) ──
// ── clinic — 성형외과 V2 Purpose 배선 교체 (2026-07-13) ──
//   [변경] mode='purpose' 조건부 위임 → V2 직결. Pilot Gate 불필요.
//     기존: Gate OFF 상태라 실사용은 항상 v1(후기형)으로만 흘렀다(= v2 미도달).
//     현재: derma와 동형으로 V2 승격. v1(generateClinic) 4파일 보존·미호출.
//   롤백: 이 줄만 handleClinic 래퍼로 원복(파일 무손상).
//   ★ clinic 고유 — 대명사 = "이 시술"(ㄹ 받침). 후처리 조사 정규화 실사용 케이스.
//   ★ 화이트리스트 15종(성형 시술만). 피부 시술(pico_laser/laser_toning) = derma 엔진 소관.
register("clinic", handleClinicV2);   // ← 성형외과 V2 (관측 전)
// ── dental — 치과 V2 Purpose 직접 배선 (2026-07-14) ──
//   ★ Pilot Gate 폐기. v1/v2 메뉴 SoT 동일(v2가 dental-data.js 재활용) → Gate 불필요, 직접 라우팅.
//   v1(generateDental) 4파일 보존·미호출. 롤백 = 이 줄만 Gate 래퍼로 원복(파일 무손상).
//   ★ 치과 고유 — treatment 중심(19종). decisionAxis 미도입(exam 축 실익 없음).
//     목적축 7섹션 유지: concern/visitTrigger/examination/treatmentDecision/checkPoint/sceneVisit/closing
register("dental", handleDentalV2);   // ← 치과 V2 (관측 전)
// ── ent — 이비인후과 V2 Purpose 배선 교체 (2026-07-13) ──
//   v1(generateEnt) 4파일 보존·미호출. 롤백 = 이 줄만 handleEnt로 원복(파일 무손상).
//   clinic/derma와 동형 승격. Pilot Gate 불필요(V2 직결).
//   ★ ent 고유 축 — 검사(청력·비내시경·후두내시경·수면다원)와 질환 치료가 한 엔진에 공존(card와 동형).
//     → ENT_V2_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       exam(4종: 청력검사·비내시경·후두내시경·수면다원검사) = 검사 선택 기준
//       disease(10종: 중이염·이명·돌발성난청 / 알레르기비염·축농증·비중격만곡증·코골이수면무호흡 / 편도염·인후두역류 / 어지럼증)
//                    = 증상확인→검사→판단→관리 (수술은 진료 논의 수준만)
//   핵심 철학: 귀·코·목 증상 → 검사 → 치료 판단
//   ★ 진료 경계 — 갑상선 제외(endo SoT) / 비중격만곡증 = 기능 개선만(미용은 clinic SoT)
//                수면무호흡 = 검사·평가·판단까지(수술 방법 설명 금지) / 어지럼증 = 전정기관 축
register("ent",        handleEntV2);   // ← 이비인후과 V2 (관측 전)
// ── urology — 비뇨기과 V2 Purpose 배선 교체 (2026-07-13) ──
//   v1(generateUrology) 4파일 보존·미호출. 롤백 = 이 줄만 handleUrology로 원복(파일 무손상).
//   ★ urology 고유 축 — 검사(소변·요류·전립선초음파·PSA·방광내시경)와 질환 치료가 한 엔진에 공존(ent/card와 동형).
//   ★ 경계 — 포경·정관·음경확대·조루 제외(미용/비급여) / 전립선암 = PSA·검사 판단까지 / 신장질환 = 신장내과 SoT.
register("urology",    handleUrologyV2);   // ← 비뇨기과 V2 (관측 전)
register("oriental",   handleOriental);
// [승격 · 2026-07-12] 정형외과 V2(Purpose Engine) 정식 승격 — Pilot Gate 제거.
//   V2 축A 완료(94~95점) + 실발행 상위노출 확인(1위) → 기본 엔진 확정. FREEZE 대상.
//   handleOrtho(v1)는 파일 보관·미호출. 롤백 필요 시 이 줄만 handleOrtho로 되돌리면 원복.
register("ortho", handleOrthoV2);
register("pediatrics", handlePediatricsV2);   // ★ V2 직결 (v1/v2 메뉴 상이 → Gate 금지)
// ── [승격 · 2026-07-14] gastro V2(Purpose Engine) 직결 — Pilot Gate 폐기 ──
//   치과형 승격: 전용 v2-data 없음 → v1 gastro-data.js(22종) 재활용 → v1/v2 메뉴 SoT 동일.
//   따라서 메뉴 배선·_FLAT_INDUSTRIES 무변경. mode 주입 불필요.
//   ★ gastro 고유 축 — 검사(내시경)와 질환치료가 한 엔진에 공존.
//     → GASTRO_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       exam(6종: 위/대장/수면내시경·복부초음파·위암/대장암검진) = 검사 선택 기준 (radio 철학)
//       disease(16종) = 원인확인→검사→약물→시술→(수술은 외과 위임) (pain/neuro 철학)
//   롤백: 이 줄만 handleGastro 로 되돌리면 원복. v1 4파일 무손상.
register("gastro", handleGastroV2);
// ── general 래퍼 — mode='purpose'면 v2(1차 진료 허브), 아니면 v1(후기형) ──
//   v1(generateGeneral)·v2(generateGeneralV2) 파일 둘 다 무손상. general v1 4파일 보존.
//   Pilot Gate(index.js, _genIndustry 판정)가 mode='purpose' 주입할 때만 v2 도달. 미주입(기본)=v1 (A/B 보존).
//   ★ general 고유 축 — 1차 진료 허브(hub). 질환 확정형 서술 금지.
//     증상/검진 이상 → 기본 문진·검사 → 원인 범위 확인 → 전문내과 연계 판단
//     전문내과 V2(gastro·pulmo·card·endo)와 역할 중복 제거:
//       당뇨/갑상선/고지혈/비만/골다공 → endo · 고혈압/협심증/부정맥 → card
//       천식/폐렴/COPD → pulmo · 위염/역류/대장 → gastro
//   general-v2는 general-v2-data 16진료 사용 (증상5 / 검진·검사2 / 상담·관리5 / 감염·예방4).
//   ★ [General V2 승격 · 2026-07-14] Pilot Gate 제거 — v1(후기형) ≠ v2(16종 1차 진료 허브). 메뉴 SoT 상이 → 직결.
//     (ent/urology/eye/obgyn 승격 시 확인된 원칙: v1/v2 메뉴가 다르면 직결, 같으면 Gate)
//     롤백 = 이 줄만 handleGeneral로 원복(v1 4파일 무손상).
register("general", handleGeneralV2);   // ← 내과 V2 (관측 전)
// ── obgyn — 산부인과 V2 Purpose 배선 교체 (2026-07-13) ──
//   ★ Pilot Gate 제거 — v1(22종 후기형) ≠ v2(14종 정보형). 메뉴 SoT가 다르므로 스위치 불가.
//     (ent/urology/eye 승격 시 확인된 원칙: v1/v2 메뉴가 다르면 직결, 같으면 Gate)
//   v1(generateObgyn) 4파일 보존·미호출. 롤백 = 이 줄만 handleObgyn으로 원복(파일 무손상).
//   ★ obgyn 고유 축 — 검사(부인과초음파·자궁경부세포·HPV·여성호르몬·골반MRI)와 질환 치료가 한 엔진에 공존.
//   ★ 경계 — 임신·출산·분만·산전검사 전면 제외(분만 응급 프레이밍 리스크).
//            난임·시험관·인공수정 제외(성공률·비용 표현 리스크). 소음순·질성형 등 미용 제외.
//            피임 시술 제외. 유방 = 유방외과 SoT. 요실금 = urology 단일 SoT(중복 SoT 금지).
//            자궁경부암 = 검사에서 '추가 확인 필요 여부'까지만. 갱년기 HRT = '진료에서 함께 검토될 수 있는 방향' 수준만.
register("obgyn",      handleObgynV2);   // ← 산부인과 V2 (관측 전)
// ── derma — 피부과 V2 Purpose 배선 교체 (2026-07-13) ──
//   v1(generateDerma) 4파일 보존·미호출. 롤백 시 이 줄만 handleDerma로 원복(+ import 복원).
//   ★ derma 고유 축 — 질환 치료와 미용 시술이 한 엔진에 공존(card와 동형).
//     → DERMA_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       disease(18종: 여드름·흉터/색소/염증성/감염·양성병변/탈모) = 증상→원인확인→피부상태평가→치료방향
//       procedure(9종: 울쎄라·써마지·슈링크·토닝·피코·제모·보톡스·필러·스킨부스터) = 고민→적합대상판단→상태평가→시술선택기준
//   핵심 철학: 피부 증상 → 피부 상태 평가 → 치료·시술 판단
//   ⚠ V2 관측 전이므로 catalog는 enabled:false / status:dev 로 하향(OWNER 게이트). PASS 후 live 복귀.
register("derma",      handleDermaV2);   // ← 피부과 V2 (관측 전)
// ── pain — 통증의학과 V2 Purpose Engine 직결 (2026-07-14 승격) ──
//   ★ Pilot Gate 폐기. register("pain") → handlePainV2 직결.
//   ★ Gate 판정 기준(단일): 「전용 v2-data 존재 여부」.
//     pain은 전용 v2-data 부재 → v1 pain-data.js(28종) 재활용 → 메뉴 SoT 동일 → 치과형 승격.
//     (gastro/neuro와 동형. 메뉴 배선 무변경 — INDUSTRY_TREATMENTS / PAIN_CATS 그대로)
//   ★ pain-v2는 pain-data 전 시술 사용 — 화이트리스트 없음(전부 통증의학과 자산).
//   ★ pain 고유 축 — 수술 vs 비수술이 아니라 "보존적 관리 → 중재적 시술" 흐름이 판단축.
//   v1(generatePain) 4파일 FREEZE 보존·미호출. 롤백 = 이 줄만 handlePain으로 원복(파일 무손상).
register("pain",       handlePainV2);   // ← 통증의학과 V2 (관측 전)
register("radio",      handleRadio);      // ← 영상의학과 (신규, 검사형·정보형·판독중심 / 관측 전)
// ── pulmo — 호흡기내과 (신규 업종, V2 Purpose 단독 등록) ──
//   v1 없음 → 래퍼 불필요. radio 방식과 동일하게 핸들러 직접 등록.
//   ★ pulmo 고유 축 — 검사(폐기능·흉부영상)와 질환치료가 한 엔진에 공존(gastro와 동형).
//     → PULMO_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       exam(3종: 폐기능검사·흉부X-ray·흉부CT) = 검사 선택 기준
//       disease(9종) = 원인확인→검사→약물→관리 (수술은 흉부외과 위임 수준만)
register("pulmo",      handlePulmoV2);   // ← 호흡기내과 (관측 전)
// ── card — 순환기내과 (신규 업종, V2 Purpose 단독 등록) ──
//   v1 없음 → 래퍼 불필요. radio/pulmo 방식과 동일하게 핸들러 직접 등록.
//   ★ card 고유 축 — 검사(심전도·심장초음파·홀터·부하검사)와 질환치료가 한 엔진에 공존(pulmo와 동형).
//     → CARD_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       exam(5종: 심전도·심장초음파·24시간홀터·운동부하검사·혈압검사) = 검사 선택 기준
//       disease(5종: 고혈압·고지혈증·협심증·부정맥·심부전) = 증상확인→검사→약물→관리 (시술·수술은 상급 진료 위임 수준만)
//   핵심 철학: 가슴 증상 → 검사 → 치료 판단
register("card",       handleCardV2);    // ← 순환기내과 (관측 전)
// ── endo — 내분비내과 (신규 업종, V2 Purpose 단독 등록) ──
//   v1 없음 → 래퍼 불필요. radio/pulmo/card 방식과 동일하게 핸들러 직접 등록.
//   ★ endo 고유 축 — 검사(갑상선초음파·기능검사·당화혈색소·골밀도·호르몬)와 질환관리가 한 엔진에 공존(card와 동형).
//     → ENDO_DIRECTION.decisionAxis 1필드로 4섹션만 분기 (프롬프트는 단일).
//       exam(5종) = 검사 선택 기준
//       disease(9종: 당뇨병·당뇨전단계·고지혈증·비만·갑상선기능저하/항진·갑상선결절·골다공증·부신질환)
//                  = 검진이상→검사→원인확인→관리 (수술·조직검사는 위임 수준만)
//   핵심 철학: 검진 이상 → 혈액·호르몬검사 → 원인 확인 → 관리·치료 판단
//   ★ 만성 관리 구조 — 완치·단기 종료 서술 금지. 수치를 보며 이어가는 관리가 기본 축.
register("endo",       handleEndoV2);    // ← 내분비내과 (관측 전)
// ── neuro — 신경외과 V2 Purpose Engine 직결 (2026-07-14 승격) ──
//   ★ Pilot Gate 폐기. register("neuro") → handleNeuroV2 직결.
//   ★ Gate 판정 기준(단일): 「전용 v2-data 존재 여부」.
//     neuro는 전용 v2-data 부재 → v1 neuro-data.js(24종) 재활용 → 메뉴 SoT 동일 → 치과형 승격.
//     (gastro와 동형. 메뉴 배선 무변경 — INDUSTRY_TREATMENTS / NEURO_CATS 그대로)
//   ★ neuro-v2는 neuro-data 전 시술(24종) 사용 — 화이트리스트 없음(전부 신경외과 자산).
//   v1(generateNeuro) 4파일 보존·미호출. 롤백 = 이 줄만 handleNeuro로 원복(파일 무손상).
register("neuro",      handleNeuroV2);  // ← 신경외과 V2 (관측 전)
register("psy",        handlePsyV2);   // ★ [V2 2026-07-13] v1 → V2 직결 (v1/v2 메뉴 SoT 상이 → Gate 없음)
// ── eye — 안과 V2 Purpose 배선 교체 (2026-07-13) ──
//   ★ 재구축: 기존 eye-v2(목적축 5섹션·dental-v2 골격) 폐기 → decisionAxis 7섹션(ent/urology 동형).
//   ★ Pilot Gate 제거 — v1(22종 후기형) ≠ v2(14종 정보형). 메뉴 SoT가 다르므로 스위치 불가.
//     (ent 승격 시 확인된 원칙: v1/v2 메뉴가 다르면 직결, 같으면 Gate)
//   v1(generateEye) 4파일 보존·미호출. 롤백 = 이 줄만 handleEye로 원복(파일 무손상).
//   ★ eye 고유 축 — 검사(시력·굴절/안압/안저/세극등/시야)와 질환 치료가 한 엔진에 공존.
//   ★ 경계 — 시력교정 수술(라식·라섹·스마일·ICL)·드림렌즈·약시·사시 전면 제외. 눈 미용 = clinic SoT.
register("eye",        handleEyeV2);   // ← 안과 V2 (관측 전)
register("family",     handleFamily);
register("cafe",       handleCafe);
register("restaurant", handleRestaurant);
register("kindergarten", handleKindergarten); // ← 유치원 (신규, 정보형·비의료·기관화자·반장 edu 18 이식 / 관측 전)
register("chinese",    handleChinese);     // ← 중식 (신규, 정보형·비의료·중식당화자·Restaurant계열 독립엔진 / 관측 전)
register("korean",     handleKorean);      // ← 한식 (신규, 정보형·비의료·한식당화자·Chinese계열 독립엔진 / 관측 전)
register("legal",      handleLegal);       // ← 법무사 (v142 — 신규, 비의료)
register("bedding",    handleBedding);     // ← 이브자리 침구 (v10 — 신규, 비의료·정보형)
register("lawyer",     handleLawyer);      // ← 변호사 (v29 — 신규, 4대분류·정보형)
register("daycare",    handleDaycare);     // ← 주간보호센터 (신규, 정보형·비의료 / 관측 전)
register("homecare",   handleHomecare);    // ← 방문요양 (신규, 정보형·비의료 / 관측 전)
register("funeral",    handleFuneral);     // ← 상조 (신규, 정보형·비의료·장례지도사화자 / 관측 전)
register("tax",        handleTax);         // ← 세무사 (신규, 정보형·비의료·세무사화자 / 관측 전)
register("labor",      handleLabor);       // ← 노무사 (신규, 정보형·비의료·공인노무사화자 / 관측 전)
register("flower",     handleFlower);      // ← 꽃배달 (신규, 정보형·비의료·플로리스트화자 / 관측 전)
register("welfarecare", handleWelfarecare); // ← 복지용구 (신규, 정보형·비의료·사업소화자 / 관측 전)
register("administrative", handleAdministrative); // ← 행정사 (신규, 정보형·비의료·행정사화자 / 관측 전)
register("realestate", handleRealestate);  // ← 부동산 (신규, 분석리포트형·비의료·공인중개사화자 / 관측 전)
register("cleaning",   handleCleaning);    // ← 입주청소 (신규, 정보형·비의료·청소업체화자 / 관측 전)
register("moving",     handleMoving);      // ← 이사업체 (신규, 정보형·비의료·이사업체화자 / 관측 전)
register("interior",   handleInterior);    // ← 인테리어 (신규, 정보형·비의료·인테리어업체화자 / 관측 전)
register("grout",      handleGrout);       // ← 줄눈 (신규, 정보형·비의료·줄눈시공업체화자 / 관측 전)
register("coating",    handleCoating);     // ← 탄성코트 (신규, 정보형·비의료·탄성코트업체화자 / 관측 전)
register("systemair",  handleSystemair);   // ← 시스템에어컨 (신규, 정보형·비의료·시스템에어컨업체화자 / 관측 전)
register("airclean",   handleAirclean);    // ← 에어컨청소 (신규, 정보형·비의료·에어컨청소업체화자 / 관측 전)
register("screen",     handleScreen);      // ← 방충망 (신규, 정보형·비의료·방충망업체화자 / 관측 전)
register("pestcontrol", handlePestcontrol); // ← 방역 (신규, 정보형·비의료·방역업체화자 / 관측 전)
register("buildingclean", handleBuildingclean); // ← 건물청소 (신규, 정보형·비의료·건물청소업체화자·출장업종 / 관측 전)
register("birdcontrol", handleBirdcontrol);  // ← 비둘기퇴치 (신규, 정보형·비의료·비둘기퇴치업체화자·출장업종 / 관측 전)
register("tankclean",  handleTankclean);   // ← 저수조청소 (신규, 정보형·비의료·저수조청소업체화자·출장업종·useApt / 관측 전)
register("leakdetect", handleLeakdetect);  // ← 누수탐지 (신규, 정보형·비의료·누수탐지업체화자·출장업종·useApt / 관측 전)
register("sewer",      handleSewer);       // ← 하수구막힘 (신규, 정보형·비의료·하수구막힘업체화자·출장업종·APT미사용 / 관측 전)
register("plumbing",   handlePlumbing);    // ← 수도설비 (신규, 정보형·비의료·수도설비업체화자·출장업종·APT미사용 / 관측 전)
register("boiler",     handleBoiler);      // ← 보일러설치 (신규, 정보형·비의료·보일러설치업체화자·출장업종·APT미사용 / 관측 전)
register("homefix",    handleHomefix);     // ← 집수리 (신규, 정보형·비의료·집수리업체화자·출장업종·APT미사용 / 관측 전)
register("electricrepair", handleElectricrepair); // ← 전기수리 (신규, 정보형·비의료·전기수리업체화자·출장업종·APT미사용 / 관측 전)
register("sinkrepair",  handleSinkrepair);   // ← 싱크대수리 (신규, 정보형·비의료·싱크대수리업체화자·출장업종·APT미사용·수리전용 / 관측 전)
register("seniorgoods", handleSeniorgoods);  // ← 노인용품 (신규, 정보형·비의료·노인용품전문점화자·판매가격유도차단 / 관측 전)
register("bathroom",    handleBathroom);     // ← 욕실리모델링 (신규, 정보형·비의료·욕실리모델링업체화자·출장업종·APT미사용 / 관측 전)
register("snack",       handleSnack);        // ← 분식 (신규, 정보형·비의료·분식집화자·Korean(Restaurant)계열 독립엔진·class 4축·13메뉴 / 관측 전)
register("japanese",    handleJapanese);     // ← 일식 (신규, 정보형·비의료·일식당화자·Chinese계열 독립엔진·cat 4계열·13메뉴 / 관측 전)
register("western",     handleWestern);      // ← 양식 (신규, 정보형·비의료·양식당화자·Chinese계열 독립엔진·cat 4계열·8메뉴 / 관측 전)
register("chicken",     handleChicken);      // ← 치킨 (신규, 정보형·비의료·치킨집화자·Japanese계열 독립엔진·cat 4계열·12메뉴 / 관측 전)
register("fishing",     handleFishing);       // ← 고패킹·바다낚시 (신규, 정보형·비의료·낚시화자·반장 fishing 이식·단일호출형·글유형 3종 / 관측 전)
register("meat",        handleMeat);          // ← 고깃집 (신규, 정보형·비의료·고깃집화자·Restaurant v2계열 독립엔진·cat 단일·8메뉴·SCENE 불판/굽기/쌈·국물분리 / 관측 전)
register("dobae",       handleDobae);         // ← 도배 (신규, 정보형·비의료·도배업체화자·출장업종·APT미사용 / siteBlock 현장정보(단지명·평형) 사용 / 관측 전)
register("flooring",    handleFlooring);      // ← 장판 (신규, 정보형·비의료·장판시공업체화자·출장업종·APT미사용 / siteBlock 현장정보 + 두께 축 / 관측 전)
register("film",        handleFilm);          // ← 인테리어필름 (신규, 정보형·비의료·필름시공업체화자·출장업종·APT미사용 / siteBlock 현장정보 + 하지 축 / 관측 전)
register("door",        handleDoor);          // ← 도어수리 (신규, 정보형·비의료·도어수리업체화자·출장수리·APT미사용 / siteBlock 미사용 / 부품군 축 / 관측 전)
register("waterproof",  handleWaterproof);    // ← 방수공사 (신규, 정보형·비의료·방수시공업체화자·출장시공·APT미사용 / siteBlock 미사용 / 원인군 축 / 관측 전)
register("paint",       handlePaint);         // ← 페인트공사 (신규, 정보형·비의료·페인트시공업체화자·출장시공·APT미사용 / siteBlock 미사용 / 원인군 축 / 관측 전)
register("tile",        handleTile);          // ← 타일시공 (신규, 정보형·비의료·타일시공업체화자·출장시공·APT미사용 / siteBlock 미사용 / 철거·덧방 판단 축 / 관측 전)
register("window",      handleWindow);        // ← 창호시공 (신규, 정보형·비의료·창호시공업체화자·출장시공·APT미사용 / siteBlock 미사용 / 전체교체·부분보수 판단 축 / 관측 전)
register("furniture",   handleFurniture);     // ← 맞춤가구 (신규, 정보형·비의료·맞춤가구제작업체화자·출장제작설치·APT미사용 / siteBlock 미사용 / 자리 제약 판단 축 / 관측 전)
register("lighting",    handleLighting);      // ← 조명 (신규, 정보형·비의료·조명시공업체화자·출장시공·APT미사용 / siteBlock 미사용 / 배치 여건 판단 축 / 관측 전)
register("demolition",  handleDemolition);    // ← 철거공사 (신규, 정보형·비의료·철거공사업체화자·출장해체·APT미사용 / siteBlock 미사용 / 살릴면·뜯을면 판단 축 / 관측 전)
// ── shaman — 무속 상담 (신규 업종, 단독 등록) ──
//   ★ 축 구조가 타 업종과 다름 — 1차 SPECIALTY(전문분야 6: 사업번창·문서매매·자손학업·병굿신굿·조상천도·혼인인연)
//     × 2차 SITUATION(실제 검색 문장 35). cat = 분야 라벨, menu = 상황문.
//   ★ Engine B(전문분야 소개 6건)를 별도 UI 없이 TREATMENTS에 합류 → 41메뉴. 플랫폼 흐름 무변경.
//   ★ Engine C(사례 정리)는 SHAMAN_MENUS.hidden=true 로 V1 차단. 입력폼 준비 시 hidden 해제만.
//   ★ 안전장치 — SHAMAN_FORBIDDEN(공포유발·의례강권·결과보장·원인단정) 적발 시 1회 재생성, 재적발 시 폐기.
//     SHAMAN_NOTICES(HEALTH/SAFETY/RELATION/FINANCE/ANCESTOR) 축별 자동 후단 삽입.
//   ★ 경계 — 질병 치료·완치 서술 금지(의료법). 의례는 절차 설명까지만, 비용·효과·기간 금지.
register("shaman",      handleShaman);        // ← 무속 상담 (신규, 공감형·비의료·상담소화자 / 관측 전)

export { resolve, has, list } from "./engineRegistry";
