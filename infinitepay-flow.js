(() => {
  const STORAGE_KEY = 'cancao_order_v6';
  const PAYMENT_KEY = 'cancao_verified_payment_v2';
  const PRICE_LABEL = 'R$ 49,90';
  const modal = document.querySelector('#order-modal');
  let activeCheckoutUrl = '';
  let checkoutWindow = null;

  if (!modal) return;

  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

  function safeSet(key, value) {
    const serialized = JSON.stringify(value);
    try { localStorage.setItem(key, serialized); } catch {}
    try { sessionStorage.setItem(key, serialized); } catch {}
  }

  function safeGet(key) {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  const saveOrder = (order) => safeSet(STORAGE_KEY, order);
  const getOrder = () => safeGet(STORAGE_KEY);
  const saveVerifiedPayment = (payment) => safeSet(PAYMENT_KEY, payment);
  const getVerifiedPayment = () => safeGet(PAYMENT_KEY);

  function clearVerifiedPayment() {
    try { localStorage.removeItem(PAYMENT_KEY); } catch {}
    try { sessionStorage.removeItem(PAYMENT_KEY); } catch {}
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function makeWhatsAppUrl(message) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  function buildOrderMessage(order, payment) {
    return [
      'Olá! Meu pagamento PIX de R$ 49,90 foi confirmado pela InfinitePay e quero enviar meu pedido de música personalizada. 🎵❤️',
      '',
      `*Pedido:* ${payment.orderNsu || 'confirmado'}`,
      `*Transação:* ${payment.transactionNsu || 'confirmada'}`,
      '*Pagamento:* PIX confirmado pela InfinitePay ✅',
      payment.receiptUrl ? `*Comprovante:* ${payment.receiptUrl}` : '',
      '',
      `*Meu nome:* ${order.customerName}`,
      `*Meu WhatsApp:* ${order.customerPhone}`,
      `*Pessoa homenageada:* ${order.recipientName}`,
      `*Como eu a chamo:* ${order.nickname || 'Não informado'}`,
      `*Estilo musical:* ${order.musicStyle}`,
      `*Preferência de voz:* ${order.voice}`,
      '',
      '*A história de vocês:*',
      order.story,
      '',
      '*O que desejo que essa pessoa sinta ao ouvir:*',
      order.message || 'Não informado',
      '',
      'Estou ciente de que primeiro receberei a letra e poderei solicitar até 3 edições. A música só será gerada após minha aprovação final da letra.'
    ].filter(Boolean).join('\n');
  }

  function renderForm() {
    const card = modal.querySelector('.modal-card');
    if (!card) return;

    card.classList.add('payment-modal');
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">MÚSICA PERSONALIZADA • ${PRICE_LABEL}</span>
      <h2 id="modal-title">Conte a história de vocês</h2>
      <div class="checkout-intro">
        <div class="checkout-price"><strong>${PRICE_LABEL}</strong><span>pagamento único via PIX</span></div>
        <div class="checkout-badges">
          <span class="checkout-badge">✓ Preencha tudo primeiro</span>
          <span class="checkout-badge">✓ PIX pela InfinitePay</span>
          <span class="checkout-badge">✓ Até 3 edições da letra</span>
        </div>
        <p>Preencha a homenagem e finalize o PIX em uma janela segura da InfinitePay. Esta página permanecerá aberta para você voltar automaticamente após o pagamento.</p>
      </div>
      <form id="ip-details-form">
        <div class="form-grid">
          <label>Seu nome<input type="text" name="customerName" required maxlength="100" autocomplete="name" placeholder="Seu nome" /></label>
          <label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label>
          <label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Nome de quem receberá a música" /></label>
          <label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido..." /></label>
          <label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label>
          <label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label>
        </div>
        <label>A história de vocês<textarea name="story" required minlength="40" maxlength="3000" placeholder="Como vocês se conheceram? Quais momentos, lugares, dificuldades, conquistas, viagens, apelidos ou frases não podem faltar?"></textarea></label>
        <label>O que você deseja que essa pessoa sinta ao ouvir? <span class="optional">(opcional)</span><textarea name="message" maxlength="1000" placeholder="Ex.: Quero que ela se sinta amada, valorizada e saiba o quanto é importante para mim."></textarea></label>
        <label class="consent"><input type="checkbox" name="revisionConsent" required /><span>Entendi que tenho direito a até 3 edições da letra e que a música só será gerada depois da minha aprovação final.</span></label>
        <button class="button button-primary form-submit" type="submit" id="ip-pay-button">Pagar com PIX — ${PRICE_LABEL}</button>
        <div class="checkout-error" id="ip-error" role="alert"></div>
        <div class="checkout-loading" id="ip-loading"><span class="checkout-spinner"></span><span>Preparando pagamento seguro...</span></div>
      </form>
    `;

    const saved = getOrder();
    if (saved) {
      const form = card.querySelector('#ip-details-form');
      ['customerName','customerPhone','recipientName','nickname','musicStyle','voice','story','message'].forEach((name) => {
        const field = form?.elements?.[name];
        if (field && saved[name] != null) field.value = saved[name];
      });
    }

    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    card.querySelector('#ip-details-form')?.addEventListener('submit', startInfinitePayCheckout);
  }

  function renderCheckoutWaiting(checkoutUrl = activeCheckoutUrl) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">PAGAMENTO SEGURO • INFINITEPAY</span>
      <h2>Finalize seu PIX</h2>
      <div class="payment-confirmed-card" style="background:#fff8e8;border-color:rgba(140,100,30,.18)">
        <strong>A janela segura da InfinitePay foi aberta.</strong>
        <p>O Canção de Nós permanece aberto aqui. Depois de pagar, toque em <strong>Continuar</strong> na InfinitePay. Nós identificaremos o pagamento automaticamente e mostraremos o botão para enviar os dados da música.</p>
      </div>
      <div class="order-summary-mini"><div><strong>Música personalizada</strong><br><span>PIX com confirmação automática</span></div><strong>${PRICE_LABEL}</strong></div>
      <div class="payment-return-actions">
        <button class="button button-primary" type="button" id="ip-reopen-checkout">Abrir pagamento</button>
        <button class="button button-ghost" type="button" id="ip-edit-order">Editar dados</button>
      </div>
      <p class="form-help">Se estiver no celular, o checkout pode abrir em uma nova aba. Depois do pagamento você volta automaticamente para o pedido.</p>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    card.querySelector('#ip-edit-order')?.addEventListener('click', renderForm);
    card.querySelector('#ip-reopen-checkout')?.addEventListener('click', () => {
      if (!checkoutUrl) return;
      checkoutWindow = openCheckoutWindow();
      if (checkoutWindow) checkoutWindow.location.href = checkoutUrl;
      else window.open(checkoutUrl, '_blank', 'noopener');
    });
  }

  function renderVerifying(message = 'Estamos consultando a InfinitePay...') {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">CONFIRMAÇÃO DE PAGAMENTO</span>
      <h2>Confirmando seu PIX</h2>
      <div class="payment-confirmed-card" style="background:#fff8e8;border-color:rgba(140,100,30,.18)">
        <strong>${message}</strong>
        <p>Aguarde alguns segundos. O botão para enviar os dados só será liberado depois que a InfinitePay confirmar o recebimento de ${PRICE_LABEL}.</p>
      </div>
      <div class="checkout-loading is-visible"><span class="checkout-spinner"></span><span>Validando pagamento...</span></div>
      <div class="checkout-error" id="ip-return-error" role="alert"></div>
      <div class="payment-return-actions" id="ip-return-actions"></div>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
  }

  function renderPaid(order, payment) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">PAGAMENTO CONFIRMADO</span>
      <h2>Seu PIX foi confirmado ✓</h2>
      <div class="payment-confirmed-card">
        <span class="checkout-badge success">✓ InfinitePay confirmou ${PRICE_LABEL}</span>
        <strong>Pagamento identificado. Seus dados estão prontos para envio.</strong>
        <p>Agora é só enviar os dados da música. Primeiro criaremos a letra e você poderá solicitar até 3 edições antes da geração do áudio.</p>
      </div>
      <div class="order-summary-mini"><div><strong>Pedido ${payment.orderNsu}</strong><br><span>${order.recipientName} • ${order.musicStyle}</span></div><strong>${PRICE_LABEL}</strong></div>
      ${payment.receiptUrl ? `<a class="button button-outline" href="${payment.receiptUrl}" target="_blank" rel="noopener">Ver comprovante da InfinitePay</a>` : ''}
      <button class="button button-primary form-submit" type="button" id="ip-send-order">Enviar dados da música</button>
      <p class="form-help">Este botão só aparece depois da confirmação real do PIX pela InfinitePay.</p>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    card.querySelector('#ip-send-order')?.addEventListener('click', () => {
      window.open(makeWhatsAppUrl(buildOrderMessage(order, payment)), '_blank', 'noopener,noreferrer');
    });
  }

  function openCheckoutWindow() {
    const width = Math.min(540, Math.max(360, window.screen.availWidth - 40));
    const height = Math.min(820, Math.max(620, window.screen.availHeight - 60));
    const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
    const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
    const features = `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const child = window.open('', 'cancao-infinitepay-checkout', features);
    if (child) {
      try {
        child.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pagamento seguro</title><style>body{font-family:system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8f5;color:#4e2236}.box{text-align:center;padding:32px}.spin{width:28px;height:28px;margin:18px auto;border:3px solid #edd5df;border-top-color:#7b204e;border-radius:50%;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div class="box"><strong>Preparando seu PIX...</strong><div class="spin"></div><small>Canção de Nós • InfinitePay</small></div></body></html>`);
        child.document.close();
      } catch {}
    }
    return child;
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function verifyPaymentWithRetry(payment, attempts = 6) {
    let lastResult = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });
      const result = await response.json().catch(() => ({}));
      lastResult = result;
      if (response.ok && result.success && result.verified) return result;
      if (!response.ok && response.status >= 500) throw new Error(result.message || 'Não foi possível consultar a InfinitePay agora.');
      if (attempt < attempts) {
        renderVerifying(`Pagamento recebido. Confirmando com a InfinitePay... tentativa ${attempt} de ${attempts}`);
        await wait(1800);
      }
    }
    throw new Error(lastResult?.message || 'O PIX ainda não foi confirmado pela InfinitePay.');
  }

  async function startInfinitePayCheckout(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const errorBox = document.querySelector('#ip-error');
    const loading = document.querySelector('#ip-loading');
    const button = document.querySelector('#ip-pay-button');
    errorBox?.classList.remove('is-visible');
    loading?.classList.add('is-visible');
    if (button) button.disabled = true;

    const fd = new FormData(form);
    const order = Object.fromEntries(fd.entries());
    order.customerPhone = normalizePhone(order.customerPhone);
    order.savedAt = Date.now();
    saveOrder(order);
    clearVerifiedPayment();

    checkoutWindow = openCheckoutWindow();

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: order.customerName, customerPhone: order.customerPhone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.checkoutUrl) throw new Error(result.message || 'Não foi possível iniciar o pagamento pela InfinitePay.');

      order.orderNsu = result.orderNsu;
      order.checkoutStartedAt = Date.now();
      saveOrder(order);
      activeCheckoutUrl = result.checkoutUrl;
      renderCheckoutWaiting(activeCheckoutUrl);

      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.location.href = result.checkoutUrl;
    } catch (error) {
      try { checkoutWindow?.close(); } catch {}
      loading?.classList.remove('is-visible');
      if (button) button.disabled = false;
      renderForm();
      const freshError = document.querySelector('#ip-error');
      if (freshError) {
        freshError.textContent = error.message;
        freshError.classList.add('is-visible');
      }
    }
  }

  async function confirmReturnedPayment(order, payment) {
    openModal();
    renderVerifying();
    try {
      if (!order) throw new Error('Não encontramos os dados do pedido neste navegador.');
      if (!payment.orderNsu || !payment.transactionNsu || !payment.slug) throw new Error('O retorno da InfinitePay não trouxe todos os dados necessários para validar o pagamento.');
      if (order.orderNsu && payment.orderNsu !== order.orderNsu) throw new Error('O identificador do pagamento não corresponde ao pedido salvo neste navegador.');

      const result = await verifyPaymentWithRetry(payment);
      const verifiedPayment = { ...payment, ...result, verifiedAt: Date.now() };
      saveVerifiedPayment(verifiedPayment);
      renderPaid(order, verifiedPayment);
      history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      try { checkoutWindow?.close(); } catch {}
      window.focus();
    } catch (error) {
      const box = document.querySelector('#ip-return-error');
      if (box) {
        box.textContent = error.message;
        box.classList.add('is-visible');
      }
      const actions = document.querySelector('#ip-return-actions');
      if (actions) {
        actions.innerHTML = '<button class="button button-primary" type="button" id="ip-retry-payment">Verificar pagamento novamente</button>';
        actions.querySelector('#ip-retry-payment')?.addEventListener('click', () => confirmReturnedPayment(order, payment));
      }
    }
  }

  function paymentFromSearch(search) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    const order = getOrder();
    return {
      orderNsu: params.get('order_nsu') || order?.orderNsu || '',
      transactionNsu: params.get('transaction_nsu') || '',
      slug: params.get('slug') || '',
      receiptUrl: params.get('receipt_url') || '',
      captureMethod: params.get('capture_method') || '',
    };
  }

  async function handleInfinitePayReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pagamento') !== 'retorno') return false;
    await confirmReturnedPayment(getOrder(), paymentFromSearch(window.location.search));
    return true;
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== 'cancao-infinitepay-return') return;
    confirmReturnedPayment(getOrder(), paymentFromSearch(event.data.search));
  });

  function overrideStartButtons() {
    document.querySelectorAll('.plan-button,[data-start-order],.floating-whatsapp,.header-cta').forEach((button) => {
      const clone = button.cloneNode(true);
      button.replaceWith(clone);
      clone.addEventListener('click', (event) => {
        event.preventDefault();
        const order = getOrder();
        const verified = getVerifiedPayment();
        if (order && verified?.verified && (!order.orderNsu || verified.orderNsu === order.orderNsu)) renderPaid(order, verified);
        else renderForm();
        openModal();
      });
    });
  }

  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  renderForm();
  overrideStartButtons();
  handleInfinitePayReturn();
})();
