(() => {
  const STORAGE_KEY = 'cancao_order_v5';
  const PAYMENT_KEY = 'cancao_verified_payment_v1';
  const PRICE_LABEL = 'R$ 49,90';
  const modal = document.querySelector('#order-modal');

  if (!modal) return;

  function normalizePhone(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatBrazilianDate(value) {
    if (!value) return 'Não informada';
    const [year, month, day] = String(value).split('-');
    return `${day}/${month}/${year}`;
  }

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

  function saveOrder(order) {
    safeSet(STORAGE_KEY, order);
  }

  function getOrder() {
    return safeGet(STORAGE_KEY);
  }

  function saveVerifiedPayment(payment) {
    safeSet(PAYMENT_KEY, payment);
  }

  function getVerifiedPayment() {
    return safeGet(PAYMENT_KEY);
  }

  function clearVerifiedPayment() {
    try { localStorage.removeItem(PAYMENT_KEY); } catch {}
    try { sessionStorage.removeItem(PAYMENT_KEY); } catch {}
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function buildOrderMessage(order, payment) {
    return [
      'Olá! Meu pagamento PIX de R$ 49,90 foi confirmado pela InfinitePay e quero enviar meu pedido de música personalizada. 🎵❤️',
      '',
      `*Pedido:* ${payment.orderNsu || 'confirmado'}`,
      `*Transação:* ${payment.transactionNsu || 'confirmada'}`,
      `*Pagamento:* PIX confirmado pela InfinitePay ✅`,
      payment.receiptUrl ? `*Comprovante:* ${payment.receiptUrl}` : '',
      '',
      `*Meu nome:* ${order.customerName}`,
      `*Meu WhatsApp:* ${order.customerPhone}`,
      `*Pessoa homenageada:* ${order.recipientName}`,
      `*Como eu a chamo:* ${order.nickname || 'Não informado'}`,
      `*Ocasião:* ${order.occasion}`,
      `*Data da comemoração:* ${formatBrazilianDate(order.celebrationDate)}`,
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

  function makeWhatsAppUrl(message) {
    const encoded = encodeURIComponent(message);
    return `https://wa.me/?text=${encoded}`;
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
        <p>Preencha os dados completos da homenagem. Ao finalizar, você será levado ao checkout seguro da InfinitePay para pagar por PIX. O pedido só é liberado depois da confirmação automática do pagamento.</p>
      </div>
      <form id="ip-details-form">
        <div class="form-grid">
          <label>Seu nome<input type="text" name="customerName" required maxlength="100" autocomplete="name" placeholder="Seu nome" /></label>
          <label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label>
          <label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Nome de quem receberá a música" /></label>
          <label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido..." /></label>
          <label>Ocasião<select name="occasion" required><option value="">Selecione</option><option>Aniversário da pessoa amada</option><option>Aniversário de namoro</option><option>Aniversário de casamento</option><option>Pedido de casamento</option><option>Casamento</option><option>Reconciliação</option><option>Declaração surpresa</option><option>Outra ocasião</option></select></label>
          <label>Data da comemoração<input type="date" name="celebrationDate" required /></label>
          <label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label>
          <label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label>
        </div>
        <label>A história de vocês<textarea name="story" required minlength="40" maxlength="3000" placeholder="Como vocês se conheceram? Quais momentos, lugares, dificuldades, conquistas, viagens, apelidos ou frases não podem faltar?"></textarea></label>
        <label>O que você deseja que essa pessoa sinta ao ouvir? <span class="optional">(opcional)</span><textarea name="message" maxlength="1000" placeholder="Ex.: Quero que ela se sinta amada, valorizada e saiba o quanto é importante para mim."></textarea></label>
        <label class="consent"><input type="checkbox" name="revisionConsent" required /><span>Entendi que tenho direito a até 3 edições da letra e que a música só será gerada depois da minha aprovação final.</span></label>
        <button class="button button-primary form-submit" type="submit" id="ip-pay-button">Ir para o PIX seguro — ${PRICE_LABEL}</button>
        <div class="checkout-error" id="ip-error" role="alert"></div>
        <div class="checkout-loading" id="ip-loading"><span class="checkout-spinner"></span><span>Preparando checkout seguro da InfinitePay...</span></div>
      </form>
    `;

    const saved = getOrder();
    if (saved) {
      const form = card.querySelector('#ip-details-form');
      if (form) {
        ['customerName','customerPhone','recipientName','nickname','occasion','celebrationDate','musicStyle','voice','story','message'].forEach((name) => {
          const field = form.elements[name];
          if (field && saved[name] != null) field.value = saved[name];
        });
      }
    }

    const dateInput = card.querySelector('[name="celebrationDate"]');
    if (dateInput) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      dateInput.min = local.toISOString().split('T')[0];
    }

    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    card.querySelector('#ip-details-form')?.addEventListener('submit', startInfinitePayCheckout);
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
        <p>Agora é só enviar os dados da música. Primeiro criaremos a letra e você poderá solicitar até 3 edições antes de autorizar a geração do áudio.</p>
      </div>
      <div class="order-summary-mini"><div><strong>Pedido ${payment.orderNsu}</strong><br><span>${order.recipientName} • ${order.occasion}</span></div><strong>${PRICE_LABEL}</strong></div>
      ${payment.receiptUrl ? `<a class="button button-outline" href="${payment.receiptUrl}" target="_blank" rel="noopener">Ver comprovante da InfinitePay</a>` : ''}
      <button class="button button-primary form-submit" type="button" id="ip-send-order">Enviar dados da música</button>
      <p class="form-help">Este botão só aparece porque o pagamento foi validado diretamente com a InfinitePay.</p>
    `;

    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    card.querySelector('#ip-send-order')?.addEventListener('click', () => {
      window.open(makeWhatsAppUrl(buildOrderMessage(order, payment)), '_blank', 'noopener,noreferrer');
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

      if (response.ok && result.success && result.verified) {
        return result;
      }

      if (!response.ok && response.status >= 500) {
        throw new Error(result.message || 'Não foi possível consultar a InfinitePay agora.');
      }

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

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: order.customerName,
          customerPhone: order.customerPhone,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.checkoutUrl) {
        throw new Error(result.message || 'Não foi possível iniciar o pagamento pela InfinitePay.');
      }

      order.orderNsu = result.orderNsu;
      order.checkoutStartedAt = Date.now();
      saveOrder(order);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      loading?.classList.remove('is-visible');
      if (button) button.disabled = false;
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.classList.add('is-visible');
      }
    }
  }

  async function confirmReturnedPayment(order, payment) {
    openModal();
    renderVerifying();

    try {
      if (!order) throw new Error('Não encontramos os dados do pedido neste navegador.');
      if (!payment.orderNsu || !payment.transactionNsu || !payment.slug) {
        throw new Error('O retorno da InfinitePay não trouxe todos os dados necessários para validar o pagamento.');
      }

      if (order.orderNsu && payment.orderNsu !== order.orderNsu) {
        throw new Error('O identificador do pagamento não corresponde ao pedido salvo neste navegador.');
      }

      const result = await verifyPaymentWithRetry(payment);
      const verifiedPayment = {
        ...payment,
        ...result,
        verifiedAt: Date.now(),
      };
      saveVerifiedPayment(verifiedPayment);
      renderPaid(order, verifiedPayment);
      history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    } catch (error) {
      const box = document.querySelector('#ip-return-error');
      if (box) {
        box.textContent = error.message;
        box.classList.add('is-visible');
      }

      const actions = document.querySelector('#ip-return-actions');
      if (actions) {
        actions.innerHTML = '<button class="button button-primary" type="button" id="ip-retry-payment">Verificar pagamento novamente</button>';
        actions.querySelector('#ip-retry-payment')?.addEventListener('click', () => {
          confirmReturnedPayment(order, payment);
        });
      }
    }
  }

  async function handleInfinitePayReturn() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pagamento') !== 'retorno') return false;

    const order = getOrder();
    const payment = {
      orderNsu: params.get('order_nsu') || order?.orderNsu || '',
      transactionNsu: params.get('transaction_nsu') || '',
      slug: params.get('slug') || '',
      receiptUrl: params.get('receipt_url') || '',
      captureMethod: params.get('capture_method') || '',
    };

    await confirmReturnedPayment(order, payment);
    return true;
  }

  function overrideStartButtons() {
    document.querySelectorAll('.plan-button,[data-start-order],.floating-whatsapp,.header-cta').forEach((button) => {
      const clone = button.cloneNode(true);
      button.replaceWith(clone);
      clone.addEventListener('click', (event) => {
        event.preventDefault();
        const order = getOrder();
        const verified = getVerifiedPayment();
        if (order && verified?.verified && (!order.orderNsu || verified.orderNsu === order.orderNsu)) {
          renderPaid(order, verified);
        } else {
          renderForm();
        }
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
