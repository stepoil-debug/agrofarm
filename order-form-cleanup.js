(() => {
  const ORDER_KEY = 'cancao_order_v5';
  const PAYMENT_KEY = 'cancao_verified_payment_v1';
  const modal = document.querySelector('#order-modal');
  if (!modal) return;

  function readStored(key) {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const raw = storage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  }

  function formatOrderMessage(order, payment) {
    return [
      'Olá! Meu pagamento PIX de R$ 49,90 foi confirmado pela InfinitePay e quero enviar meu pedido de música personalizada. 🎵❤️',
      '',
      `*Pedido:* ${payment?.orderNsu || order?.orderNsu || 'confirmado'}`,
      `*Transação:* ${payment?.transactionNsu || 'confirmada'}`,
      '*Pagamento:* PIX confirmado pela InfinitePay ✅',
      payment?.receiptUrl ? `*Comprovante:* ${payment.receiptUrl}` : '',
      '',
      `*Meu nome:* ${order?.customerName || ''}`,
      `*Meu WhatsApp:* ${order?.customerPhone || ''}`,
      `*Pessoa homenageada:* ${order?.recipientName || ''}`,
      `*Como eu a chamo:* ${order?.nickname || 'Não informado'}`,
      `*Estilo musical:* ${order?.musicStyle || ''}`,
      `*Preferência de voz:* ${order?.voice || ''}`,
      '',
      '*A história de vocês:*',
      order?.story || '',
      '',
      '*O que desejo que essa pessoa sinta ao ouvir:*',
      order?.message || 'Não informado',
      '',
      'Estou ciente de que primeiro receberei a letra e poderei solicitar até 3 edições. A música só será gerada após minha aprovação final da letra.'
    ].filter(Boolean).join('\n');
  }

  function openCleanWhatsApp() {
    const order = readStored(ORDER_KEY);
    const payment = readStored(PAYMENT_KEY);
    if (!order || !payment) return;
    const text = encodeURIComponent(formatOrderMessage(order, payment));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  function removeField(name) {
    const field = modal.querySelector(`[name="${name}"]`);
    if (!field) return;
    const label = field.closest('label');
    if (label) label.remove();
    else field.remove();
  }

  function cleanSummary() {
    const order = readStored(ORDER_KEY);
    const summary = modal.querySelector('.order-summary-mini span');
    if (summary && order?.recipientName) summary.textContent = order.recipientName;
  }

  function replaceSendButton() {
    const button = modal.querySelector('#ip-send-order');
    if (!button || button.dataset.cleanHandler === 'true') return;
    const clone = button.cloneNode(true);
    clone.dataset.cleanHandler = 'true';
    button.replaceWith(clone);
    clone.addEventListener('click', openCleanWhatsApp);
  }

  function cleanup() {
    removeField('occasion');
    removeField('celebrationDate');
    cleanSummary();
    replaceSendButton();
  }

  cleanup();
  const observer = new MutationObserver(() => cleanup());
  observer.observe(modal, { childList: true, subtree: true });
})();
