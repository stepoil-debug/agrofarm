const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.VERCEL_ENV = 'preview';

const createPayment = require('../api/create-payment.js');
const checkPayment = require('../api/check-payment.js');

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

async function run() {
  const createReq = {
    method: 'POST',
    headers: {
      host: 'preview.example.vercel.app',
      'x-forwarded-host': 'preview.example.vercel.app',
      'x-forwarded-proto': 'https',
    },
    body: {
      customerName: 'Cliente Teste',
      customerPhone: '22999999999',
    },
  };
  const createRes = mockRes();
  await createPayment(createReq, createRes);

  assert.equal(createRes.statusCode, 200, 'create-payment deve retornar 200 no preview');
  assert.equal(createRes.body.success, true, 'checkout de teste deve ser criado');
  assert.equal(createRes.body.testMode, true, 'checkout deve estar em modo de teste');
  assert.equal(createRes.body.amount, 4990, 'valor deve ser R$ 49,90');
  assert.match(createRes.body.orderNsu, /^TEST-/, 'order_nsu deve ser de teste');
  assert.match(createRes.body.checkoutUrl, /^https:\/\/preview\.example\.vercel\.app\/test-checkout\.html\?order_nsu=TEST-/, 'checkout deve permanecer no preview');

  const orderNsu = createRes.body.orderNsu;
  const payment = {
    orderNsu,
    transactionNsu: `TEST-TXN-${Date.now()}`,
    slug: `test-${Date.now()}`,
  };

  const checkReq = { method: 'POST', headers: {}, body: payment };
  const checkRes = mockRes();
  await checkPayment(checkReq, checkRes);

  assert.equal(checkRes.statusCode, 200, 'check-payment deve retornar 200');
  assert.equal(checkRes.body.success, true, 'confirmação deve ser bem-sucedida');
  assert.equal(checkRes.body.verified, true, 'pagamento deve ser identificado como confirmado');
  assert.equal(checkRes.body.paid, true, 'pagamento deve estar pago');
  assert.equal(checkRes.body.captureMethod, 'pix', 'forma deve ser PIX');
  assert.equal(checkRes.body.amount, 4990, 'valor confirmado deve ser R$ 49,90');
  assert.equal(checkRes.body.orderNsu, orderNsu, 'order_nsu deve permanecer o mesmo');

  const flow = fs.readFileSync(path.join(__dirname, '..', 'infinitepay-flow.js'), 'utf8');
  const returnPage = fs.readFileSync(path.join(__dirname, '..', 'payment-return.html'), 'utf8');
  const fakeCheckout = fs.readFileSync(path.join(__dirname, '..', 'test-checkout.html'), 'utf8');

  assert.match(flow, /Enviar dados da música/, 'frontend deve mostrar botão de envio após confirmação');
  assert.match(flow, /Seu PIX foi confirmado/, 'frontend deve mostrar confirmação de PIX');
  assert.match(flow, /verifyPaymentWithRetry/, 'frontend deve verificar pagamento no backend');
  assert.match(flow, /postMessage|cancao-infinitepay-return/, 'frontend deve aceitar retorno da janela de checkout');
  assert.doesNotMatch(flow, /name=["']occasion["']/, 'campo ocasião não deve existir');
  assert.doesNotMatch(flow, /name=["']celebrationDate["']/, 'campo data da comemoração não deve existir');
  assert.match(returnPage, /cancao-infinitepay-return/, 'página de retorno deve avisar a janela principal');
  assert.match(returnPage, /window\.close/, 'janela de pagamento deve tentar fechar após retornar');
  assert.match(fakeCheckout, /Simular PIX aprovado/, 'checkout de teste deve permitir aprovar o PIX simulado');
  assert.match(fakeCheckout, /capture_method.*pix/s, 'checkout simulado deve retornar PIX');

  console.log('✅ Fluxo E2E simulado aprovado');
  console.log(`✅ Pedido criado: ${orderNsu}`);
  console.log('✅ Valor: R$ 49,90');
  console.log('✅ Forma: PIX');
  console.log('✅ payment_check: verified=true');
  console.log('✅ Retorno: janela principal recebe confirmação');
  console.log('✅ CTA final: Enviar dados da música');
}

run().catch((error) => {
  console.error('❌ Falha no teste E2E:', error);
  process.exit(1);
});
