// pages/api/billing/config.js
// 결제창 호출에 필요한 "공개값"만 내려주는 읽기 전용 엔드포인트.
//
// [S193 PORTONE-BROWSER-SDK-MISSING-01]
//   정기결제(B) 경로는 카드등록 단계에서 금액을 다루지 않는다.
//   브라우저 SDK requestIssueBillingKey에 필요한 값은 storeId / channelKey 뿐이다.
//   그래서 일회성(A) 경로의 /api/billing/checkout을 타지 않는다.
//   checkout은 payment_orders 행을 만들고 requestPayment 파라미터(totalAmount·payMethod)를
//   내려주는 A 전용 자산이며, B에서 호출하면 청구되지 않을 고아 주문이 쌓인다.
//
//   ★ API Secret / Webhook Secret은 어떤 경우에도 반환하지 않는다.
//     이 파일이 반환하는 값은 결제창이 클라이언트에서 그대로 쓰는 공개 식별자뿐이다.
//
//   미설정(configured:false)일 때도 200으로 내린다. 클라이언트가 "설정 안 됨"을
//   명시적으로 표시하고 카드등록을 중단하게 하기 위해서다.
//   여기서 에러 코드를 내리면 프론트가 네트워크 오류와 구분하지 못한다.

import { isConfigured, getPublicConfig } from '../../../lib/portone';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const configured = isConfigured();

  if (!configured) {
    return res.status(200).json({
      ok:         true,
      configured: false,
      storeId:    null,
      channelKey: null,
      message:    '포트원 가맹점 미등록 — 운영 키 적용 후 결제창이 활성화됩니다.',
    });
  }

  const { storeId, channelKey } = getPublicConfig();

  return res.status(200).json({
    ok:         true,
    configured: true,
    storeId:    storeId || null,
    channelKey: channelKey || null,
  });
}
