// pages/api/me/store.js
// 사용자 본인 사업장 — store_profiles. SELECT / INSERT(온보딩) / UPDATE(업체정보 수정).
// 인증: requireAccount(Bearer 토큰) → user.id = auth_user_id scope. (usage.js 패턴 동일)
// 1계정=1사업장=1업종. GET 응답: { ok, hasStore, storeId, industry, storeName, store{...} }.
// [v26] PATCH 추가 — 업체정보 1차 9컬럼 부분 수정. 사진(Storage)은 2차 보류.
// [v-dept] 병원 다중 진료과 — departments(jsonb 배열) 추가. departments[0] === industry(대표) 불변식 서버 강제.
//   병원 1행 = 공통 업체정보 + 진료과 N개. Generate/Registry/Engine 무수정(진료과 = CURRENT_INDUSTRY 전환).
// FREEZE: 엔진 무관. 운영 레이어 전용.
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { requireAccount } from "../../../lib/guards";
// [v-svcgroup] 서비스 분야 다중선택 — SoT는 industry-tree(단일 소스). 여기선 검증·정규화만 소비.
//   그룹: 병원=진료과 / 공사=시공분야. 그룹 추가는 industry-tree SERVICE_GROUPS 에만 하면 서버 무수정.
import { hasServiceFields, normalizeDepartments } from "../../../lib/industry-tree";

// [v127] 지원 업종 — index.js INDUSTRY_TREATMENTS 배선 키와 동기화(SoT: 엔진 배선).
//   catalog enabled와 무관하게 배선된 업종은 저장 허용(OWNER 관측 전 확정 경로 — SOP v4.2 PATCH-08).
//   신규 업종 추가 시 index.js 배선과 함께 이 목록에도 반드시 추가(누락 시 INVALID_INDUSTRY 400).
const INDUSTRY_KEYS = new Set([ 'shaman', 'pulmo', 'card', 'endo', 'radio',
  // 의료군
  "clinic", "dental", "ent", "oriental", "ortho", "urology",
  "pediatrics", "gastro", "general", "obgyn", "derma", "pain",
  "neuro", "psy", "eye", "family",
  // 외식·카페
  "cafe", "restaurant", "chinese", "korean", "snack", "japanese",
  "chicken", "western", "meat",
  // 전문서비스
  "legal", "lawyer", "tax", "labor", "administrative", "realestate",
  // 실버케어
  "daycare", "homecare", "funeral", "welfarecare", "seniorgoods",
  // 교육·행사 / 레저
  "kindergarten", "fishing",
  // 리빙·홈
  "bedding", "flower", "cleaning", "moving", "interior", "grout",
  "coating", "systemair", "airclean", "screen", "pestcontrol",
  "buildingclean", "birdcontrol", "tankclean", "leakdetect", "sewer",
  "plumbing", "boiler", "homefix", "electricrepair", "sinkrepair", "bathroom",
  // 공사군 — index.js 배선 완료분. [세션69] 누락 9업종 + lighting 등록.
  //   미등록 시 온보딩 POST / PATCH industry 경로에서 INVALID_INDUSTRY 400.
  "dobae", "flooring", "film", "door", "waterproof", "paint", "tile",
  "window", "demolition", "lighting", "furniture",
]);

// [v26] 업체정보 편집 가능 컬럼 — 화이트리스트. 이 외 키는 무시(임의 컬럼 주입 차단).
//   ★ 기존 컬럼 우선: region / naver_blog_url / naver_place_url 재활용(기존 데이터 축 보존).
//   ★ rep_region / blog_url / homepage_url 은 ALTER로 생성됐으나 미사용(보존만) — 화이트리스트 제외.
// [v76][B안] store_name / industry 도 PATCH 허용 — 테스트 단계 정체성 자유 수정.
//   industry 는 INDUSTRY_KEYS 검증 통과해야 적용(아래 PATCH 분기에서 별도 처리).
//   TODO: 오픈 시 → store_name/industry 최초 1회 확정 후 PATCH 거부(정체성 고정)로 복귀.
const EDITABLE_COLS = [
  "store_name", "industry",
  "address", "region", "sub_region", "phone",
  "parking_info", "business_hours", "closed_days",
  "naver_place_url", "naver_blog_url",
  // [v-loc] 위치 공통화 — 지도안내/대중교통/건물위치. parking_info(기존)는 위에 유지.
  "map_guide", "transit", "building_desc",
  // [v-visit] 방문정보(Visit Info) — 10필드 단일 jsonb. 문자열 trim 루프와 분리(아래 PATCH 분기 별도 처리).
  "visit_info",
  // [specialty] restaurant 전문점(2단 트리) 표시/저장. 빈값=일반 업종.
  "specialty",
  // [v-dept] 병원 다중 진료과 — jsonb 배열. 문자열 trim 루프와 분리(아래 PATCH 분기 별도 처리).
  "departments",
];

// GET/UPDATE 응답에 함께 내려줄 전체 컬럼 (store{...}) — 기존 컬럼 우선.
const STORE_SELECT =
  "id, industry, store_name, region, address, sub_region, phone, " +
  "parking_info, business_hours, closed_days, naver_place_url, naver_blog_url, " +
  "map_guide, transit, building_desc, title_suffix_on, visit_info, specialty, " +
  "departments";

export default async function handler(req, res) {
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const ctx = await requireAccount(req, res);
  if (!ctx) return; // res 이미 전송됨 (401/404)
  const { account } = ctx;

  // ── POST: 온보딩 INSERT (store_profiles 1행 생성). 1계정 1행 보장. ──
  if (req.method === "POST") {
    const industry = (req.body?.industry || "").trim();
    const storeName = (req.body?.storeName || req.body?.store_name || "").trim();

    if (!industry || !storeName) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }
    if (!INDUSTRY_KEYS.has(industry)) {
      return res.status(400).json({ ok: false, error: "INVALID_INDUSTRY" });
    }

    // 이미 존재하면 중복 INSERT 금지 (1계정=1사업장).
    const { data: existing } = await supabaseAdmin
      .from("store_profiles")
      .select("id")
      .eq("account_id", account.id)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ ok: false, error: "ALREADY_EXISTS", storeId: existing.id });
    }

    // [v-svcgroup] 온보딩 초기 departments — 그룹 소속(병원·공사)이면 [industry](대표 1개), 미소속이면 [].
    const initDepts = hasServiceFields(industry) ? [industry] : [];

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("store_profiles")
      .insert({ account_id: account.id, industry, store_name: storeName, departments: initDepts })
      .select("id, industry, store_name, departments")
      .single();

    if (insErr || !inserted) {
      return res.status(500).json({ ok: false, error: "INSERT_FAILED", detail: insErr?.message });
    }

    return res.status(201).json({
      ok: true,
      hasStore: true,
      storeId: inserted.id,
      industry: inserted.industry,
      storeName: inserted.store_name,
      departments: inserted.departments || [],
    });
  }

  // ── PATCH: 업체정보 수정 (store_profiles 1행 UPDATE). 1차 9컬럼만. [v26] ──
  if (req.method === "PATCH") {
    const body = req.body || {};
    const patch = {};
    for (const k of EDITABLE_COLS) {
      if (k in body) {
        if (k === "visit_info") continue;  // [v-visit] jsonb — 문자열 trim 제외. 아래 별도 처리.
        if (k === "departments") continue; // [v-dept]  jsonb — 문자열 trim 제외. 아래 별도 처리.
        const v = body[k];
        // null/빈문자 → null 저장(지움 허용). 그 외 trim 문자열.
        patch[k] = (v == null || String(v).trim() === "") ? null : String(v).trim();
      }
    }

    // [v76] 정체성 컬럼 검증.
    //   store_name 은 비울 수 없음(빈값이면 무시 — 기존값 보존).
    if ("store_name" in patch && patch.store_name == null) {
      delete patch.store_name;
    }
    //   industry 는 지원 18종만 허용. 그 외/빈값이면 무시(기존값 보존).
    if ("industry" in patch) {
      if (patch.industry == null || !INDUSTRY_KEYS.has(patch.industry)) {
        delete patch.industry;
      }
    }

    // [v77] title_suffix_on — boolean 토글(제목 끝 상호 표시). 문자열 trim 루프와 분리.
    //   존재 시에만 적용. true/false 외 값은 truthy 변환(빈/undefined는 위 in 체크로 제외).
    if ("title_suffix_on" in body) {
      patch.title_suffix_on = !!body.title_suffix_on;
    }

    // [v-visit] 방문정보 — jsonb 저장. 객체면 그대로 / null·빈객체면 null(지움 허용).
    //   문자열 정제·출력은 관측용 유틸(visitInfoPreview) 소관. 저장은 원본 객체 보존.
    if ("visit_info" in body) {
      const vi = body.visit_info;
      if (vi == null || (typeof vi === "object" && Object.keys(vi).length === 0)) {
        patch.visit_info = null;
      } else if (typeof vi === "object") {
        patch.visit_info = vi;
      }
      // 그 외 타입(문자열 등)은 무시 — 임의 주입 차단.
    }

    // [v-svcgroup] 서비스 분야(진료과·시공분야) — jsonb 배열 저장.
    //   · 배열만 허용(그 외 타입 무시 — 임의 주입 차단)
    //   · 원소는 대표(industry) 소속 그룹의 배선 완료 id만 통과. available:false·타그룹 id 자동 제거
    //   · departments[0] = 대표 진료과 = industry 와 항상 동일하게 강제 동기화
    //   · 빈 배열 = 진료과 미사용(비병원 업종·단일과 병원) → 기존 industry 단일 동작(하위호환)
    if ("departments" in body) {
      if (Array.isArray(body.departments)) {
        // [fix] 1차 정규화 제거 — 이 시점엔 대표(rep)가 미확정(null)이라
        //   serviceGroupOf(null)=null → VALID 빈 Set → 전 항목 탈락([])이 되어버린다.
        //   원본 배열을 그대로 넘기고, DB의 industry 확정 후 아래 201행에서 1회만 정규화한다.
        patch.departments = body.departments;
      }
      // 배열 아니면 무시(기존값 보존)
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ ok: false, error: "NO_FIELDS" });
    }

    const { data: store, error: stErr } = await supabaseAdmin
      .from("store_profiles")
      .select("id, industry")
      .eq("account_id", account.id)
      .maybeSingle();

    if (stErr) {
      return res.status(500).json({ ok: false, error: "STORE_QUERY_FAILED", detail: stErr.message });
    }
    if (!store) {
      return res.status(404).json({ ok: false, error: "STORE_NOT_FOUND" });
    }

    // [v-dept] 대표 진료과 최종 확정 — 이번 PATCH의 industry가 없으면 DB의 기존 industry가 대표.
    //   departments[0] === industry 불변식(invariant)을 서버에서 강제. 클라 실수 방어.
    if ("departments" in patch) {
      const repFinal = ("industry" in patch) ? patch.industry : store.industry;
      patch.departments = normalizeDepartments(patch.departments, repFinal);
    }
    // industry 만 바뀌고 departments 는 안 보낸 경우(주진료과 변경) — 기존 목록 재정렬은 하지 않는다.
    //   (store-industry.js 경로와 동일하게 industry 단독 변경 허용. departments 동기화는 UI 저장 시 함께 전송)

    const { data: updated, error: updErr } = await supabaseAdmin
      .from("store_profiles")
      .update(patch)
      .eq("id", store.id)
      .select(STORE_SELECT)
      .single();

    if (updErr || !updated) {
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", detail: updErr?.message });
    }

    return res.status(200).json({
      ok: true,
      hasStore: true,
      storeId: updated.id,
      industry: updated.industry,
      storeName: updated.store_name,
      departments: updated.departments || [],
      store: updated,
    });
  }

  // ── GET: store_profiles 존재 여부 + 전체 업체정보 ──
  try {
    const { data: store, error: stErr } = await supabaseAdmin
      .from("store_profiles")
      .select(STORE_SELECT)
      .eq("account_id", account.id)
      .maybeSingle();

    if (stErr) {
      return res.status(500).json({ ok: false, error: "STORE_QUERY_FAILED", detail: stErr.message });
    }

    if (!store) {
      return res.status(200).json({
        ok: true, hasStore: false, storeId: null, industry: null, storeName: null, store: null,
      });
    }

    return res.status(200).json({
      ok: true,
      hasStore: true,
      storeId: store.id,
      industry: store.industry,
      storeName: store.store_name,
      departments: store.departments || [], // [v-dept] 병원 다중 진료과. 비병원=[]
      store, // [v26] 전체 업체정보 — 업체정보 탭이 읽음
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "INTERNAL" });
  }
}
