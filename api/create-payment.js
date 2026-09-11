const { randomBytes } = require('node:crypto');

const PRICE_CENTS = 4990;
const SITE_URL = 'https://cancao.dflabs.app';

function getHandle() {
  return (process.env.INFINITEPAY_HANDLE || '').replace(/^\$/, '').trim();
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { success: false, message: 'Método não permitido.' });
  }

  const handle = getHandle();
  if (!handle) {
    return json(res, 503, {
      success: false,
      code: 'CHECKOUT_NOT_CONFIGURED',
      message: 'A conta InfinitePay ainda não está conectada a este site.'
    });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const customerName = String(body.customerName || '').trim().slice(0, 100);
  const customerPhone = String(body.customerPhone || '').replace(/\D/g, '').slice(0, 20);

  if (customerName.length < 2 || customerPhone.length < 10) {
    return json(res, 400, { success: false, message: 'Informe seu nome e um WhatsApp válido.' });
  }

  const phoneNumber = customerPhone.startsWith('55') ? `+${customerPhone}` : `+55${customerPhone}`;
  const orderNsu = `cancao-${Date.now()}-${randomBytes(4).toString('hex')}`;

  const payload = {
    handle,
    order_nsu: orderNsu,
    redirect_url: `${SITE_URL}/?pagamento=retorno`,
    customer: {
      name: customerName,
      phone_number: phoneNumber
    },
    items: [
      {
        quantity: 1,
        price: PRICE_CENTS,
        description: 'Canção de Nós - Música Personalizada'
      }
    ]
  };

  try {
    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.url) {
      console.error('InfinitePay create link error', response.status, data);
      return json(res, 502, { success: false, message: 'Não foi possível abrir o checkout da InfinitePay agora. Tente novamente.' });
    }

    return json(res, 200, {
      success: true,
      checkoutUrl: data.url,
      orderNsu,
      amount: PRICE_CENTS
    });
  } catch (error) {
    console.error('InfinitePay create link exception', error);
    return json(res, 502, { success: false, message: 'Falha de comunicação com a InfinitePay. Tente novamente.' });
  }
};
