const PRICE_CENTS = 4990;
const FALLBACK_HANDLE = 'fran-doug-65a';

function getHandle() {
  return (process.env.INFINITEPAY_HANDLE || FALLBACK_HANDLE).replace(/^\$/, '').trim();
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { success: false, verified: false, message: 'Método não permitido.' });
  }

  const handle = getHandle();
  if (!handle) {
    return json(res, 503, {
      success: false,
      verified: false,
      code: 'CHECKOUT_NOT_CONFIGURED',
      message: 'O checkout ainda não está configurado.'
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const orderNsu = String(body.orderNsu || body.order_nsu || '').trim();
  const transactionNsu = String(body.transactionNsu || body.transaction_nsu || '').trim();
  const slug = String(body.slug || '').trim();

  if (!orderNsu || !transactionNsu || !slug) {
    return json(res, 400, { success: false, verified: false, message: 'Dados de pagamento incompletos.' });
  }

  try {
    const response = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug
      })
    });

    const data = await response.json().catch(() => ({}));
    const amount = Number(data.amount || 0);
    const isPix = String(data.capture_method || '').toLowerCase() === 'pix';
    const verified = response.ok && data.success === true && data.paid === true && amount === PRICE_CENTS && isPix;

    if (!verified) {
      return json(res, 200, {
        success: true,
        verified: false,
        paid: Boolean(data.paid),
        captureMethod: data.capture_method || null,
        amount,
        message: data.paid && !isPix
          ? 'O pedido precisa ser pago via PIX.'
          : 'Pagamento PIX ainda não confirmado.'
      });
    }

    return json(res, 200, {
      success: true,
      verified: true,
      paid: true,
      captureMethod: 'pix',
      amount,
      paidAmount: Number(data.paid_amount || amount),
      installments: Number(data.installments || 1),
      orderNsu,
      transactionNsu,
      slug
    });
  } catch (error) {
    console.error('InfinitePay payment check exception', error);
    return json(res, 502, {
      success: false,
      verified: false,
      code: 'INFINITEPAY_CONNECTION_ERROR',
      message: 'Não foi possível confirmar o PIX agora. Tente novamente.'
    });
  }
};
