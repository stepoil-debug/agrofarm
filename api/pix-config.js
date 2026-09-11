const AMOUNT = '49.90';

function sanitize(value, max) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max);
}

function field(id, value) {
  const text = String(value ?? '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload({ key, name, city }) {
  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', key);
  const additionalData = field('05', '***');
  const withoutCrc = [
    field('00', '01'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'),
    field('54', AMOUNT),
    field('58', 'BR'),
    field('59', sanitize(name, 25) || 'CANCAO DE NOS'),
    field('60', sanitize(city, 15) || 'RIO DAS OSTRAS'),
    field('62', additionalData),
    '6304',
  ].join('');
  return withoutCrc + crc16(withoutCrc);
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const key = String(process.env.PIX_KEY || '').trim();
  const name = String(process.env.PIX_RECEIVER_NAME || 'CANCAO DE NOS').trim();
  const city = String(process.env.PIX_RECEIVER_CITY || 'RIO DAS OSTRAS').trim();

  if (!key) {
    return res.status(503).json({
      success: false,
      code: 'PIX_NOT_CONFIGURED',
      message: 'A chave PIX ainda não foi configurada.'
    });
  }

  const payload = buildPixPayload({ key, name, city });
  return res.status(200).json({
    success: true,
    amount: 49.90,
    amountLabel: 'R$ 49,90',
    pixKey: key,
    receiverName: name,
    receiverCity: city,
    payload,
  });
};
