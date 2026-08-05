// lib/billing/plans.js
// v0.5 — 세션74: Enterprise 복원(5-tier). fallback에 enterprise 추가. DB plans와 1:1 미러.
// v0.3 — 4-tier 정본 동기화 (요금제 v65: free3/basic30/standard60/pro100)
//   - fallback PLANS를 DB plans 정본과 1:1 미러 (DB 로드 실패 시에도 동일 tier/가격 보장)
//   - 변경: free quota 10→3, basic price 30000→69000, pro price 90000→179000 sort 3→4
//   - 신규: standard (60건/119000원/sort3/active). DB INSERT와 동일값.
//   - basic is_active=false 그대로 미러 (DB 정본 유지 — 판매 여부는 결제작업서 확정).
// v0.4 — 세션73: basic 판매 확정. fallback is_active false→true (DB plans와 재미러).
//   근거: 요금제 화면 4-tier 노출 + quota 30건 검증 완료 → 비판매 상태 유지할 이유 소멸.
//   그 외 값/인터페이스 무변경.
//   - getPlan/listPlans/quotaUsageRatio 등 export 인터페이스 100% 무변경.
// v0.2 — 68차 (하이브리드: DB 우선 + 하드코딩 fallback)
// 이전: 50차 (free quota 5→10)
//
// 동작:
//   1. 모듈 로드 시 DB(plans 테이블) 1회 조회 → 캐시
//   2. DB 성공: DB 데이터 사용
//   3. DB 실패(ENV 누락 / 네트워크 / 권한 등): 하드코딩 PLANS fallback
//   4. getPlan(planId) 등 모든 export 함수 인터페이스 무변경
//
// 영향:
//   - check-quota.js 무변경 (getPlan 사용)
//   - me.js 무변경 (getPlan 사용)
//   - estimate.js FREEZE 유지 (가격 명세 있는 plan만 조회 가정)
//
// 캐시 정책:
//   - 모듈 로드 시 1회만 (서버 재시작까지 stale 가능)
//   - 운영 중 plans 테이블 변경 시 서버 재배포 필요
//   - is_active 플래그는 fallback에 반영 (basic=false)

import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
// 하드코딩 fallback (DB 조회 실패 대비 + 50차 호환)
// ─────────────────────────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    monthly_quota: 3,
    price_krw: 0,
    overage_per_post_krw: 0,
    description: '체험용. 월 3건. 초과 시 hard block.',
    is_active: true,
    sort_order: 1,
  },
  basic: {
    id: 'basic',
    label: 'Basic',
    monthly_quota: 30,
    price_krw: 69000,
    overage_per_post_krw: 1500,
    description: '꾸준한 운영. 월 30건(하루 1건).',
    is_active: true,   // [세션73] 판매 확정 — DB plans.basic is_active=true 와 미러
    sort_order: 2,
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    monthly_quota: 60,
    price_krw: 119000,
    overage_per_post_krw: 1200,
    description: '적극적인 운영. 월 60건. 발행 관리 + 월간 계획.',
    is_active: true,
    sort_order: 3,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthly_quota: 100,
    price_krw: 179000,
    overage_per_post_krw: 1000,
    description: '집중 운영. 월 100건(하루 3건). 초과 단가 할인.',
    is_active: true,
    sort_order: 4,
  },
  // [세션74] Enterprise 복원 — 5-tier. 문의형이 아니라 정식 결제 플랜.
  //   DB plans에 동일 행 INSERT 완료(150건/249000원/sort5/active)와 1:1 미러.
  //   fallback에 없으면 DB 조회 실패 시에만 유령등급이 되므로 여기까지 채워야 정합이 끝난다.
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    monthly_quota: 150,
    price_krw: 249000,
    overage_per_post_krw: 900,
    description: '최고 성능. 월 150건(하루 5건). 우선 생성 큐.',
    is_active: true,
    sort_order: 5,
  },
};

export const DEFAULT_PLAN_ID = 'free';

// ─────────────────────────────────────────────
// 캐시 + DB 로드
// ─────────────────────────────────────────────
let _cachedPlans = null;       // 로드 성공 시 {free:{...}, basic:{...}, pro:{...}}
let _loadPromise = null;        // 진행 중인 로드 (중복 방지)
let _loadSource = 'fallback';   // 'db' | 'fallback'

async function loadFromDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null; // ENV 없음 → fallback
  }

  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from('plans')
      .select('id, label, monthly_quota, price_krw, overage_per_post_krw, description, is_active, sort_order')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('[plans] DB load failed, using fallback:', error.message);
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[plans] DB empty, using fallback');
      return null;
    }

    const map = {};
    for (const row of data) {
      map[row.id] = {
        id: row.id,
        label: row.label,
        monthly_quota: row.monthly_quota,
        price_krw: row.price_krw,
        overage_per_post_krw: row.overage_per_post_krw || 0,
        description: row.description || '',
        is_active: !!row.is_active,
        sort_order: row.sort_order || 0,
      };
    }
    return map;
  } catch (e) {
    console.warn('[plans] DB load exception, using fallback:', e?.message);
    return null;
  }
}

// 첫 호출 시 비동기 로드. 이후 호출은 캐시 사용.
// 동기 인터페이스 유지를 위해 첫 호출에서는 fallback 반환,
// 백그라운드로 DB 캐시 채움.
function ensureLoaded() {
  if (_cachedPlans) return;
  if (_loadPromise) return; // 진행 중

  _loadPromise = loadFromDb().then((map) => {
    if (map) {
      _cachedPlans = map;
      _loadSource = 'db';
    } else {
      _cachedPlans = PLANS;
      _loadSource = 'fallback';
    }
  }).catch(() => {
    _cachedPlans = PLANS;
    _loadSource = 'fallback';
  });
}

// 모듈 로드 시 즉시 백그라운드 로드 시작
ensureLoaded();

// 캐시된 plans 맵 반환 (캐시 미완료 시 PLANS fallback)
function getPlansMap() {
  return _cachedPlans || PLANS;
}

// ─────────────────────────────────────────────
// 공개 API (기존 인터페이스 유지)
// ─────────────────────────────────────────────

export function getPlan(planId) {
  const map = getPlansMap();
  if (planId && map[planId]) return map[planId];
  return map[DEFAULT_PLAN_ID] || PLANS[DEFAULT_PLAN_ID];
}

export function listPlans() {
  return Object.values(getPlansMap());
}

export function isOverQuota(planId, monthlyPublish) {
  const plan = getPlan(planId);
  return Number(monthlyPublish || 0) >= plan.monthly_quota;
}

export function calculateCharge(planId, monthlyPublish) {
  const plan = getPlan(planId);
  const used = Number(monthlyPublish || 0);
  const overage_count = Math.max(0, used - plan.monthly_quota);
  const overage_krw = overage_count * (plan.overage_per_post_krw || 0);
  const total_krw = (plan.price_krw || 0) + overage_krw;

  return {
    plan_id: plan.id,
    monthly_publish: used,
    quota: plan.monthly_quota,
    overage_count,
    base_krw: plan.price_krw || 0,
    overage_krw,
    total_krw,
  };
}

export function quotaUsageRatio(planId, monthlyPublish) {
  const plan = getPlan(planId);
  if (plan.monthly_quota <= 0) return 0;
  return Number(monthlyPublish || 0) / plan.monthly_quota;
}

// ─────────────────────────────────────────────
// 디버그용 (68차 신설) — 운영 코드 호출 금지
// ─────────────────────────────────────────────
export function _debugPlansSource() {
  return {
    source: _loadSource,
    loaded: !!_cachedPlans,
    ids: _cachedPlans ? Object.keys(_cachedPlans) : Object.keys(PLANS),
  };
}
