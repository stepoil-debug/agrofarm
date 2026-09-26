function json(res, status, payload) {
  res.status(status).json(payload);
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 20);
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { success: false, message: 'Método não permitido.' });
  }

  return json(res, 200, {
    success: true,
    whatsappNumber: normalizePhone(process.env.WHATSAPP_NUMBER),
    deliverySla: String(process.env.DELIVERY_SLA || '').trim().slice(0, 160),
    metaPixelId: String(process.env.META_PIXEL_ID || '').trim().slice(0, 80),
    gaMeasurementId: String(process.env.GA_MEASUREMENT_ID || '').trim().slice(0, 80),
  });
};
