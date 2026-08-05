// pages/api/observe/quota-check.js
// 43차: 외부 polling 옵저버 (publish.js 무수정 / FREEZE 유지)
// 월 발행량 기준 2단계 임계값 관찰
//   - WARN: 월 5건 이상 (관찰 시작)
//   - HIGH: 월 10건 이상 (주의 단계)
// enforcement 없음 — 로그 + 응답 표시만

// 임계값 상수 (관찰 단계 — 실데이터 누적 후 조정)
const THRESHOLD_WARN = 5;
const THRESHOLD_HIGH = 10;

// 옵저버 버전 (로그 추적용)
const OBSERVER_VERSION = 'v0.1';

// 내부 API 호출용 base URL 결정
function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const observedAt = new Date().toISOString();

  try {
    // by-blog-account 호출 (42차 자산 그대로 활용)
    const baseUrl = getBaseUrl(req);
    const r = await fetch(`${baseUrl}/api/usage/by-blog-account`);
    const data = await r.json();

    if (!data || data.ok === false) {
      return res.status(500).json({
        ok: false,
        error: 'UPSTREAM_FAILED',
        detail: data?.error || 'by-blog-account fetch failed',
        observed_at: observedAt,
      });
    }

    const accounts = data.accounts || [];

    // 2단계 분류
    const accountsWarn = [];
    const accountsHigh = [];

    for (const a of accounts) {
      const m = a.monthly_publish || 0;
      if (m >= THRESHOLD_HIGH) {
        accountsHigh.push({
          blog_account: a.blog_account,
          monthly_publish: m,
          total_publish: a.total_publish,
          latest_published_at: a.latest_published_at,
          industries: a.industries,
        });
      } else if (m >= THRESHOLD_WARN) {
        accountsWarn.push({
          blog_account: a.blog_account,
          monthly_publish: m,
          total_publish: a.total_publish,
          latest_published_at: a.latest_published_at,
          industries: a.industries,
        });
      }
    }

    // 콘솔 로그 (관찰용 — 운영 노이즈 최소화)
    if (accountsHigh.length > 0) {
      console.log(`[QUOTA_OBSERVE ${OBSERVER_VERSION}] HIGH (>=${THRESHOLD_HIGH}/월):`,
        accountsHigh.map(a => `${a.blog_account}(${a.monthly_publish})`).join(', '));
    }
    if (accountsWarn.length > 0) {
      console.log(`[QUOTA_OBSERVE ${OBSERVER_VERSION}] WARN (>=${THRESHOLD_WARN}/월):`,
        accountsWarn.map(a => `${a.blog_account}(${a.monthly_publish})`).join(', '));
    }

    return res.status(200).json({
      ok: true,
      observer_version: OBSERVER_VERSION,
      observed_at: observedAt,
      month_start_kst: data.month_start_kst,
      thresholds: {
        warn: THRESHOLD_WARN,
        high: THRESHOLD_HIGH,
      },
      summary: {
        total_accounts: data.total_accounts || 0,
        total_publish_all: data.total_publish_all || 0,
        accounts_normal: accounts.length - accountsWarn.length - accountsHigh.length,
        accounts_warn: accountsWarn.length,
        accounts_high: accountsHigh.length,
      },
      accounts_high: accountsHigh,
      accounts_warn: accountsWarn,
      // enforcement 명시 (관찰 단계 확인용)
      enforcement: 'observation_only',
      publish_js_freeze: true,
    });

  } catch (err) {
    console.error(`[QUOTA_OBSERVE ${OBSERVER_VERSION}] ERROR:`, err.message);
    return res.status(500).json({
      ok: false,
      error: 'OBSERVE_FAILED',
      detail: err.message,
      observed_at: observedAt,
    });
  }
}
