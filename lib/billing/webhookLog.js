/**
 * lib/billing/webhookLog.js
 *
 * 결제 webhook 이벤트 로깅 helper (skeleton B 수준)
 *
 * 책임:
 *  - 포트원/추후 PG 의 webhook 수신 이력 기록
 *  - 멱등성 체크 (동일 imp_uid 중복 수신 회피)
 *  - 디버깅용 최근 이벤트 조회
 *
 * 현재 상태:
 *  - 본문 미구현 (console.log + 빈값 반환)
 *  - billing_events 테이블 결정 후 본 구현 (72차+)
 *  - 멱등성 키 (imp_uid? merchant_uid? both?) 결정 후 UNIQUE 인덱스
 *
 * 호출부 (현재):
 *  - pages/api/billing/webhook/portone.js
 *
 * FREEZE: 시그니처 / 반환 형태 — 본 구현 시 본문만 교체
 *
 * v0.1 · 71차 · 2026-05-20
 */

/**
 * webhook 이벤트 1건 로깅
 *
 * @param {Object} params
 * @param {string} params.pg               - PG 식별자 ('portone' | 'toss' | 'nice' ...)
 * @param {string} params.eventType        - 이벤트 종류 ('payment.paid' 등)
 * @param {string} [params.impUid]         - 포트원 결제 고유 ID
 * @param {string} [params.merchantUid]    - 가맹점 주문번호
 * @param {Object} [params.payload]        - 원본 body (JSON parsed)
 * @param {string} [params.rawBody]        - 원본 raw body (서명 검증용)
 * @param {string} [params.signature]      - 수신 시그니처
 * @param {boolean} [params.signatureValid]- 서명 검증 결과
 * @param {string} [params.handlerStatus]  - 'received' | 'processed' | 'failed' | 'duplicate'
 * @param {string} [params.errorMessage]   - 처리 실패 시 에러 메시지
 *
 * @returns {Promise<{ ok: boolean, eventId: number | null, isDuplicate: boolean, reason?: string }>}
 *
 * TODO (본 구현):
 *  - billing_events 테이블 INSERT
 *  - imp_uid UNIQUE 위반 시 isDuplicate=true 반환 (멱등성)
 *  - service role client 사용 (RLS 우회)
 *  - payload 는 JSONB 컬럼
 */
export async function logWebhookEvent(params) {
  const {
    pg,
    eventType,
    impUid,
    merchantUid,
    handlerStatus,
  } = params || {};

  // stub: console 출력만
  console.log('[webhookLog]', {
    pg,
    eventType,
    impUid,
    merchantUid,
    handlerStatus,
    at: new Date().toISOString(),
  });

  // TODO: billing_events 테이블 INSERT + 멱등성 체크
  return {
    ok: false,
    eventId: null,
    isDuplicate: false,
    reason: 'NOT_IMPLEMENTED',
  };
}

/**
 * 최근 webhook 이벤트 조회 (디버깅/관리자 UI 용)
 *
 * @param {Object} params
 * @param {string} [params.pg]         - PG 필터
 * @param {string} [params.eventType]  - 이벤트 종류 필터
 * @param {number} [params.limit=50]   - 최대 반환 건수
 *
 * @returns {Promise<{ ok: boolean, events: Array, reason?: string }>}
 *
 * TODO (본 구현):
 *  - billing_events SELECT (created_at DESC)
 *  - admin 권한 검증은 호출부 책임
 */
export async function getRecentEvents(params) {
  // stub: 빈 배열 반환
  return {
    ok: false,
    events: [],
    reason: 'NOT_IMPLEMENTED',
  };
}
