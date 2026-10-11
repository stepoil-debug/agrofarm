(() => {
  const STORAGE_KEY = 'cancao_order_v6';
  const PAYMENT_KEY = 'cancao_verified_payment_v2';
  const BRIEF_KEY = 'cancao_post_payment_brief_v1';
  const DRAFT_KEY = 'cancao_lyrics_drafts_v1';
  const PAYMENT_PLANS = {
    pix: { key: 'pix', label: 'R$ 49,90', value: 49.90, cents: 4990, title: 'PIX à vista', detail: 'Pagamento imediato, sem juros' },
    card: { key: 'card', label: 'até 12× R$ 4,99', value: 49.90, cents: 4990, title: 'Cartão de crédito', detail: 'Juros do parcelamento por conta do cliente' },
  };
  const DEFAULT_PLAN = PAYMENT_PLANS.pix;
  const modal = document.querySelector('#order-modal');
  let activeCheckoutUrl = '';
  let checkoutWindow = null;

  if (!modal) return;

  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const isLocalDemo = () => ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get('demoPayment') === '1';

  const track = (event, parameters = {}) => {
    window.CancaoAnalytics?.track(event, parameters);
  };

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

  function sessionSet(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function sessionGet(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const saveOrder = (order) => safeSet(STORAGE_KEY, order);
  const getOrder = () => safeGet(STORAGE_KEY);
  const saveBrief = (brief) => sessionSet(BRIEF_KEY, brief);
  const getBrief = () => sessionGet(BRIEF_KEY);
  const saveDraftState = (state) => sessionSet(DRAFT_KEY, state);
  const getDraftState = () => sessionGet(DRAFT_KEY);
  const getQueryOrder = () => {
    const params = new URLSearchParams(window.location.search);
    const fields = ['customerName', 'customerPhone', 'recipientName', 'occasion', 'celebrationDate', 'nickname', 'musicStyle', 'voice', 'paymentPlan', 'story', 'message'];
    return Object.fromEntries(fields.filter((field) => params.has(field)).map((field) => [field, params.get(field)]));
  };
  const saveVerifiedPayment = (payment) => safeSet(PAYMENT_KEY, payment);
  const getVerifiedPayment = () => safeGet(PAYMENT_KEY);
  const getPlan = (order = {}) => PAYMENT_PLANS[order.paymentPlan] || DEFAULT_PLAN;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

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
    const number = String(window.CancaoPublicConfig?.get()?.whatsappNumber || '').replace(/\D/g, '');
    if (!number) return '';
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function buildOrderMessage(order, payment, brief = getBrief() || {}) {
    const plan = getPlan(order);
    const method = String(payment.captureMethod || '').toLowerCase() === 'credit_card' ? 'Cartão de crédito' : 'PIX';
    return [
      `Olá! Meu pagamento de ${plan.label} foi confirmado pela InfinitePay e estou enviando o briefing da minha música personalizada. 🎵❤️`,
      '',
      `*Pedido:* ${payment.orderNsu || 'confirmado'}`,
      `*Transação:* ${payment.transactionNsu || 'confirmada'}`,
      `*Pagamento:* ${method} confirmado pela InfinitePay ✅`,
      `*Plano:* ${plan.title} — ${plan.label}`,
      payment.receiptUrl ? `*Comprovante:* ${payment.receiptUrl}` : '',
      '',
      `*Meu nome:* ${brief.customerName || order.customerName}`,
      `*Meu WhatsApp:* ${brief.customerPhone || order.customerPhone}`,
      `*Pessoa homenageada:* ${brief.recipientName || 'Não informado'}`,
      `*Ocasião:* ${brief.occasion || 'Não informado'}`,
      `*Data da comemoração:* ${brief.celebrationDate || 'Não informado'}`,
      `*Tempo de relacionamento:* ${brief.relationship || 'Não informado'}`,
      `*Como eu a chamo:* ${brief.nickname || 'Não informado'}`,
      `*Estilo musical:* ${brief.musicStyle || 'Não informado'}`,
      `*Preferência de voz:* ${brief.voice || 'Não informado'}`,
      '',
      '*A história de vocês:*',
      brief.story || order.story || 'Não informado',
      '',
      '*Momentos e detalhes que não podem faltar:*',
      brief.keyMoments || 'Não informado',
      '',
      '*Frases, nomes ou referências obrigatórias:*',
      brief.mustInclude || 'Não informado',
      '',
      '*O que desejo que essa pessoa sinta ao ouvir:*',
      brief.desiredFeeling || order.message || 'Não informado',
      '',
      '*Assuntos ou palavras a evitar:*',
      brief.avoidTopics || 'Nenhum informado',
      '',
      '*Direções solicitadas para as 5 propostas:*',
      '1) narrativa romântica • 2) declaração cinematográfica • 3) pop leve e memorável • 4) intimista/voz e violão • 5) surpresa com toque autoral',
      '',
      'Estou ciente de que receberei 5 propostas de letra, poderei solicitar até 3 rodadas de edição e a música só será gerada após minha aprovação final da letra.'
    ].filter(Boolean).join('\n');
  }

  function renderForm() {
    const card = modal.querySelector('.modal-card');
    if (!card) return;

    card.classList.add('payment-modal');
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 1 DE 2 • PAGAMENTO SEGURO</span>
      <h2 id="modal-title">Comece sua encomenda</h2>
      ${isLocalDemo() ? '<p class="checkout-note">Modo demonstração local: nenhuma cobrança será realizada.</p>' : ''}
      <div class="checkout-intro">
        <div class="checkout-price"><strong>R$ 49,90</strong><span>PIX à vista ou cartão parcelado</span></div>
        <div class="checkout-badges">
          <span class="checkout-badge">✓ Pagamento pela InfinitePay</span>
          <span class="checkout-badge">✓ PIX ou cartão pela InfinitePay</span>
          <span class="checkout-badge">✓ História só depois da aprovação</span>
        </div>
        <p>Agora precisamos apenas do seu nome e WhatsApp para identificar o pedido. Depois que o pagamento for confirmado, abriremos um questionário elegante para você contar toda a história.</p>
      </div>
      <form id="ip-details-form">
        <div class="checkout-form-grid">
          <label>Seu nome<input type="text" name="customerName" required maxlength="100" autocomplete="name" placeholder="Seu nome" /></label>
          <label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label>
        </div>
        <fieldset class="payment-choice">
          <legend>Como você prefere pagar?</legend>
          <label class="payment-choice-option"><input type="radio" name="paymentPlan" value="pix" checked /><span><strong>${PAYMENT_PLANS.pix.title}</strong><small>${PAYMENT_PLANS.pix.label} • ${PAYMENT_PLANS.pix.detail}</small></span></label>
          <label class="payment-choice-option"><input type="radio" name="paymentPlan" value="card" /><span><strong>${PAYMENT_PLANS.card.title}</strong><small>${PAYMENT_PLANS.card.label} • ${PAYMENT_PLANS.card.detail}</small></span></label>
        </fieldset>
        <button class="button button-primary form-submit" type="submit" id="ip-pay-button">Pagar com PIX — ${PAYMENT_PLANS.pix.label}</button>
        <div class="checkout-error" id="ip-error" role="alert"></div>
        <div class="checkout-loading" id="ip-loading"><span class="checkout-spinner"></span><span>Preparando pagamento seguro...</span></div>
      </form>
    `;

    const saved = { ...(getOrder() || {}), ...getQueryOrder() };
    if (saved) {
      const form = card.querySelector('#ip-details-form');
      ['customerName','customerPhone'].forEach((name) => {
        const field = form?.elements?.[name];
        if (field && saved[name] != null) field.value = saved[name];
      });
      const savedPlan = form?.elements?.paymentPlan;
      if (savedPlan && saved.paymentPlan) {
        const selectedInput = [...savedPlan].find((input) => input.value === saved.paymentPlan);
        if (selectedInput) selectedInput.checked = true;
      }
    }

    const dateInput = card.querySelector('[name="celebrationDate"]');
    if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
    const applySla = (config) => {
      if (!config?.deliverySla) return;
      const note = card.querySelector('.checkout-intro p');
      if (note && !note.textContent.includes(config.deliverySla)) note.textContent += ` Prazo informado: ${config.deliverySla}.`;
    };
    applySla(window.CancaoPublicConfig?.get?.());
    window.CancaoPublicConfig?.ready?.then(applySla);

    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    const planInputs = [...card.querySelectorAll('input[name="paymentPlan"]')];
    const payButton = card.querySelector('#ip-pay-button');
    const updatePlanLabel = () => {
      const plan = PAYMENT_PLANS[planInputs.find((input) => input.checked)?.value] || DEFAULT_PLAN;
      if (payButton) payButton.textContent = `Pagar com ${plan.key === 'card' ? 'cartão' : 'PIX'} — ${plan.label}`;
    };
    const paymentOptions = [...card.querySelectorAll('.payment-choice-option')];
    paymentOptions.forEach((option) => option.addEventListener('click', () => {
      const input = option.querySelector('input[name="paymentPlan"]');
      if (!input) return;
      input.checked = true;
      updatePlanLabel();
    }));
    planInputs.forEach((input) => {
      input.addEventListener('change', updatePlanLabel);
      input.addEventListener('input', updatePlanLabel);
      input.addEventListener('click', updatePlanLabel);
    });
    updatePlanLabel();
    card.querySelector('#ip-details-form')?.addEventListener('submit', startInfinitePayCheckout);
  }

  function renderCheckoutWaiting(checkoutUrl = activeCheckoutUrl) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const order = getOrder() || {};
    const plan = getPlan(order);
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">PAGAMENTO SEGURO • INFINITEPAY</span>
      <h2>Finalize seu pagamento</h2>
      <div class="payment-confirmed-card" style="background:#fff8e8;border-color:rgba(140,100,30,.18)">
        <strong>A janela segura da InfinitePay foi aberta.</strong>
        <p>O Canção de Nós permanece aberto aqui. Depois de pagar, toque em <strong>Continuar</strong> na InfinitePay. Nós identificaremos a aprovação automaticamente e mostraremos o botão para enviar os dados da música.</p>
      </div>
      <div class="order-summary-mini"><div><strong>${plan.title}</strong><br><span>${plan.detail}</span></div><strong>${plan.label}</strong></div>
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
      <h2>Confirmando seu pagamento</h2>
      <div class="payment-confirmed-card" style="background:#fff8e8;border-color:rgba(140,100,30,.18)">
        <strong>${message}</strong>
        <p>Aguarde alguns segundos. O botão para enviar os dados só será liberado depois que a InfinitePay confirmar o recebimento.</p>
      </div>
      <div class="checkout-loading is-visible"><span class="checkout-spinner"></span><span>Validando pagamento...</span></div>
      <div class="checkout-error" id="ip-return-error" role="alert"></div>
      <div class="payment-return-actions" id="ip-return-actions"></div>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
  }

  function renderBriefSubmitted(order, payment, brief) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const plan = getPlan(order);
    const message = buildOrderMessage(order, payment, brief);
    let whatsappUrl = makeWhatsAppUrl(message);
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 2 DE 2 • BRIEFING RECEBIDO</span>
      <h2>História recebida com carinho ✓</h2>
      <div class="payment-confirmed-card brief-success-card">
        <span class="checkout-badge success">✓ Pagamento ${escapeHtml(plan.label)} confirmado</span>
        <strong>Seu briefing está pronto para entrar na produção.</strong>
        <p>O próximo passo é organizar cinco propostas de letra com direções diferentes. O áudio permanece bloqueado até você aprovar uma letra final.</p>
      </div>
      <div class="order-summary-mini"><div><strong>Pedido ${escapeHtml(payment.orderNsu || 'confirmado')}</strong><br><span>${escapeHtml(brief.recipientName || 'Sua homenagem')} • briefing salvo nesta sessão</span></div><strong>5 versões</strong></div>
      <div class="brief-timeline" aria-label="Etapas da produção">
        <article class="brief-timeline-item is-complete"><span>01</span><div><strong>História recebida</strong><small>Seu questionário foi organizado.</small></div></article>
        <article class="brief-timeline-item"><span>02</span><div><strong>Cinco versões de letra</strong><small>Direções romântica, narrativa, pop, intimista e surpresa.</small></div></article>
        <article class="brief-timeline-item"><span>03</span><div><strong>Sua aprovação</strong><small>Você escolhe uma versão e pode pedir até 3 rodadas de edição.</small></div></article>
        <article class="brief-timeline-item"><span>04</span><div><strong>Geração do áudio</strong><small>Só começa depois da sua aprovação final.</small></div></article>
      </div>
      <div class="brief-submit-actions">
        <button class="button button-primary form-submit" type="button" id="ip-send-brief" ${whatsappUrl ? '' : 'disabled'}>Enviar briefing para o atendimento</button>
        <button class="button button-outline form-submit" type="button" id="ip-copy-brief">Copiar briefing</button>
      </div>
      <div class="checkout-error" id="ip-whatsapp-error" role="alert"></div>
      <p class="form-help">O botão abre o WhatsApp com o briefing preenchido. Você ainda confirma o envio no aplicativo.</p>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    window.CancaoPublicConfig?.ready?.then(() => {
      whatsappUrl = makeWhatsAppUrl(message);
      const sendButton = card.querySelector('#ip-send-brief');
      if (sendButton) sendButton.disabled = !whatsappUrl;
    });
    card.querySelector('#ip-send-brief')?.addEventListener('click', () => {
      whatsappUrl = makeWhatsAppUrl(message);
      if (!whatsappUrl) {
        const errorBox = card.querySelector('#ip-whatsapp-error');
        if (errorBox) {
          errorBox.textContent = 'O atendimento ainda não está configurado. Configure WHATSAPP_NUMBER no ambiente do site.';
          errorBox.classList.add('is-visible');
        }
        return;
      }
      track('Lead', { content_name: 'Briefing pago enviado ao WhatsApp', value: plan.value, currency: 'BRL' });
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    });
    card.querySelector('#ip-copy-brief')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(message);
        button.textContent = 'Briefing copiado ✓';
        setTimeout(() => { button.textContent = 'Copiar briefing'; }, 2400);
      } catch {
        const errorBox = card.querySelector('#ip-whatsapp-error');
        if (errorBox) {
          errorBox.textContent = 'Não foi possível copiar automaticamente. Use o botão do WhatsApp para enviar o briefing.';
          errorBox.classList.add('is-visible');
        }
      }
    });
  }

  function renderPostPaymentBrief(order, payment) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const saved = getBrief() || {};
    const plan = getPlan(order);
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 2 DE 2 • SUA HISTÓRIA</span>
      <h2>Agora conte a história que vai virar canção</h2>
      <div class="brief-lead">
        <span class="checkout-badge success">✓ Pagamento confirmado • ${escapeHtml(plan.label)}</span>
        <p>Este questionário substitui a conversa inicial: quanto mais detalhes você compartilhar, mais autênticas ficam as cinco propostas de letra.</p>
      </div>
      <div class="brief-progress" aria-label="Progresso do questionário"><span class="is-active"></span><span class="is-active"></span><span></span><span></span></div>
      <form id="post-payment-form" class="brief-form">
        <fieldset class="brief-section"><legend><span>01</span> Para quem é a canção?</legend><div class="form-grid">
          <label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Nome de quem receberá a música" /></label>
          <label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido..." /></label>
          <label>Ocasião<select name="occasion" required><option value="">Selecione</option><option>Aniversário da pessoa amada</option><option>Aniversário de namoro</option><option>Aniversário de casamento</option><option>Pedido de casamento</option><option>Casamento</option><option>Reconciliação</option><option>Declaração surpresa</option><option>Homenagem familiar</option><option>Outra ocasião</option></select></label>
          <label>Data da comemoração<input type="date" name="celebrationDate" required /></label>
          <label>Há quanto tempo vocês estão juntos? <span class="optional">(opcional)</span><input type="text" name="relationship" maxlength="80" placeholder="Ex.: 4 anos e 2 meses" /></label>
        </div></fieldset>
        <fieldset class="brief-section"><legend><span>02</span> O que só vocês sabem?</legend>
          <label>Conte a história de vocês<textarea name="story" required minlength="40" maxlength="5000" placeholder="Como vocês se conheceram? Quais lugares, viagens, dificuldades, conquistas e cenas marcantes precisam aparecer?"></textarea><small class="field-hint">Escreva do seu jeito. Não precisa ser bonito: a produção organiza a narrativa.</small></label>
          <label>Momentos e detalhes indispensáveis<textarea name="keyMoments" maxlength="1800" placeholder="Ex.: o primeiro beijo na praça, a viagem para..., o jeito que ela ri, o nascimento dos filhos..."></textarea></label>
          <label>Frases, apelidos, nomes ou referências que precisam aparecer <span class="optional">(opcional)</span><textarea name="mustInclude" maxlength="1200" placeholder="Uma frase que vocês sempre dizem, um apelido ou uma lembrança específica."></textarea></label>
        </fieldset>
        <fieldset class="brief-section"><legend><span>03</span> Qual sentimento deve ficar?</legend><div class="form-grid">
          <label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label>
          <label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label>
        </div>
        <label>O que você deseja que essa pessoa sinta ao ouvir? <textarea name="desiredFeeling" required minlength="10" maxlength="1200" placeholder="Ex.: Quero que ela se sinta amada, reconhecida e lembre que eu escolheria nossa história outra vez."></textarea></label>
        <label>Existe algum assunto, palavra ou tom que devemos evitar? <span class="optional">(opcional)</span><textarea name="avoidTopics" maxlength="1000" placeholder="Ex.: não mencionar uma fase difícil, não usar palavras muito formais..."></textarea></label>
        </fieldset>
        <div class="brief-consents"><label class="consent"><input type="checkbox" name="revisionConsent" required /><span>Entendi que receberei cinco propostas de letra, poderei pedir até 3 rodadas de edição e o áudio só será gerado após minha aprovação final.</span></label><label class="consent"><input type="checkbox" name="dataConsent" required /><span>Autorizo o uso desses dados e da história para preparar as propostas e enviar o briefing ao atendimento da Canção de Nós. <a href="/privacidade" target="_blank" rel="noopener">Ver privacidade</a></span></label></div>
        <button class="button button-primary form-submit" type="submit" id="ip-submit-brief">Enviar história e iniciar produção</button>
        <div class="checkout-error" id="ip-brief-error" role="alert"></div>
        <p class="form-help">Pedido ${escapeHtml(payment.orderNsu || 'confirmado')} • pagamento ${escapeHtml(plan.label)} confirmado</p>
      </form>
    `;

    const form = card.querySelector('#post-payment-form');
    ['recipientName','nickname','occasion','celebrationDate','relationship','story','keyMoments','mustInclude','musicStyle','voice','desiredFeeling','avoidTopics'].forEach((name) => {
      const field = form?.elements?.[name];
      if (field && saved[name] != null) field.value = saved[name];
    });
    const dateInput = form?.elements?.celebrationDate;
    if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    form?.addEventListener('submit', (event) => submitPostPaymentBrief(event, order, payment));
  }

  async function submitPostPaymentBrief(event, order, payment) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const storedPayment = getVerifiedPayment();
    if (!storedPayment?.verified || (storedPayment.orderNsu && storedPayment.orderNsu !== payment.orderNsu)) {
      const errorBox = form.querySelector('#ip-brief-error');
      if (errorBox) {
        errorBox.textContent = 'A confirmação deste pagamento não está mais disponível nesta sessão. Reabra o retorno da InfinitePay para continuar.';
        errorBox.classList.add('is-visible');
      }
      return;
    }
    const button = form.querySelector('#ip-submit-brief');
    const fd = new FormData(form);
    const brief = {
      ...Object.fromEntries(fd.entries()),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      paymentOrderNsu: payment.orderNsu,
      paymentTransactionNsu: payment.transactionNsu,
      submittedAt: Date.now(),
      status: 'briefing_recebido_aguardando_5_versoes'
    };
    delete brief.revisionConsent;
    delete brief.dataConsent;
    saveBrief(brief);
    button && (button.disabled = true);
    track('Lead', { content_name: 'Briefing pós-pagamento recebido', value: getPlan(order).value, currency: 'BRL' });
    const drafts = createLyricsDrafts(brief);
    saveDraftState({ paymentOrderNsu: payment.orderNsu, selectedIndex: 0, drafts, status: 'editing', updatedAt: Date.now() });
    renderDraftEditor(order, payment, brief, drafts, 0);
  }

  function compactText(value, fallback = 'um detalhe que só vocês conhecem', max = 150) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return fallback;
    return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  }

  function createLyricsDrafts(brief) {
    const recipient = compactText(brief.recipientName, 'meu amor', 70);
    const nickname = compactText(brief.nickname, recipient, 70);
    const storyParts = String(`${brief.story || ''} ${brief.keyMoments || ''}`)
      .split(/[.!?\n]+/)
      .map((part) => compactText(part, '', 150))
      .filter(Boolean);
    const momentOne = storyParts[0] || 'o dia em que a vida colocou você no meu caminho';
    const momentTwo = storyParts[1] || 'cada pequeno detalhe que fez a gente chegar até aqui';
    const feeling = compactText(brief.desiredFeeling, 'que você se sinta amado e reconhecido', 130);
    const mustInclude = compactText(brief.mustInclude, 'nossa história, do jeito que só nós sabemos contar', 130);
    const style = compactText(brief.musicStyle, 'romântico', 70);
    const directions = [
      {
        name: 'História em capítulos',
        angle: 'Narrativa romântica',
        intro: 'Uma versão que conduz quem ouve pelos momentos mais importantes do casal.',
        title: `${recipient}, capítulo favorito`,
        body: [
          '[Verso 1]', `Foi em ${momentOne} que o nosso mundo mudou,`, `Sem saber que naquele instante o amor chegou.`,
          `Em ${momentTwo}, a vida ensinou`, `Que cada passo ao seu lado mais sentido ganhou.`,
          '[Pré-refrão]', `E se o tempo perguntar o que a gente construiu,`, `Eu respondo com seu nome e tudo que surgiu.`,
          '[Refrão]', `${nickname}, você é meu lugar,`, `A história mais bonita que eu escolhi continuar.`, `${feeling},`, `E fazer do nosso amor uma canção pra recordar.`,
          '[Ponte]', `Se eu pudesse voltar ao começo, escolheria nós dois,`, `${mustInclude}.`,
          '[Refrão final]', `${nickname}, você é meu lugar,`, `Meu capítulo favorito, meu motivo pra cantar.`
        ]
      },
      {
        name: 'Cena de cinema',
        angle: 'Declaração cinematográfica',
        intro: 'Uma versão visual, intensa e emocional, pensada para arrepiar no refrão.',
        title: `A cena é você`,
        body: [
          '[Verso 1]', `As luzes se acendem quando você chega, ${recipient},`, `E o mundo fica em silêncio pra ouvir nosso coração.`,
          `${momentOne},`, `Foi o primeiro quadro da nossa melhor direção.`,
          '[Pré-refrão]', `Nosso amor atravessou caminhos, medos e marés,`, `E ainda encontro a minha casa quando encontro você.`,
          '[Refrão]', `Se a vida fosse um filme, eu repetia essa cena,`, `Você sorrindo pra mim, minha escolha mais plena.`, `${feeling},`, `E o nosso nome brilhando no final da tela.`,
          '[Ponte]', `Não existe roteiro capaz de contar`, `Tudo o que a gente aprendeu sem precisar explicar.`, `${mustInclude}.`,
          '[Refrão final]', `Se a vida fosse um filme, eu escolheria você,`, `Em todos os finais que ainda vamos viver.`
        ]
      },
      {
        name: 'Refrão que fica',
        angle: 'Pop leve e memorável',
        intro: 'Uma versão direta, cantável e fácil de lembrar desde a primeira audição.',
        title: `Só nós dois`,
        body: [
          '[Verso 1]', `Tem um jeito seu de transformar qualquer lugar,`, `E uma história em cada motivo pra te abraçar.`, `${momentOne},`, `Foi ali que eu comecei a acreditar.`,
          '[Pré-refrão]', `Quando o mundo corre, você me faz respirar,`, `Quando eu me perco, seu sorriso vem me encontrar.`,
          '[Refrão]', `Só nós dois, só nós dois,`, `O melhor do agora e tudo o que vem depois.`, `${recipient}, eu escolho você,`, `${feeling}.`,
          '[Verso 2]', `${momentTwo},`, `São detalhes que ninguém consegue copiar.`, `E quando eu digo que te amo,`, `Ainda parece pouco pra tudo que eu quero entregar.`,
          '[Refrão final]', `Só nós dois, só nós dois,`, `Nossa história cantando mais alto que a voz.`
        ]
      },
      {
        name: 'Perto do coração',
        angle: 'Intimista / voz e violão',
        intro: 'Uma versão delicada, confessional e próxima, como uma carta cantada.',
        title: `Onde eu fico em paz`,
        body: [
          '[Verso 1]', `Eu guardei ${momentOne}`, `Como quem guarda uma luz dentro do peito.`, `E desde então, ${recipient},`, `Meu caminho encontrou um jeito novo e perfeito.`,
          '[Refrão]', `É perto de você que eu fico em paz,`, `É no seu abraço que o meu medo se desfaz.`, `${feeling},`, `E eu agradeço por tudo que a gente faz.`,
          '[Verso 2]', `Em ${momentTwo},`, `Eu vi que o amor mora no que é simples de viver.`, `No seu nome, no seu riso,`, `Na coragem que eu encontro só por ter você.`,
          '[Ponte]', `Não preciso de promessas difíceis de entender,`, `${mustInclude}.`,
          '[Refrão final]', `É perto de você que eu quero ficar,`, `Hoje, amanhã e onde a vida nos levar.`
        ]
      },
      {
        name: 'Surpresa com sorriso',
        angle: 'Autoral e afetuosa',
        intro: 'Uma versão calorosa, com leveza e detalhes que fazem a pessoa homenageada sorrir.',
        title: `${recipient}, meu melhor presente`,
        body: [
          '[Verso 1]', `Eu podia escolher flores, presentes e frases de ocasião,`, `Mas nada explica você morando no meu coração.`, `${momentOne},`, `E pronto: virou refrão a nossa melhor invenção.`,
          '[Refrão]', `${nickname}, vem ouvir,`, `Tem uma música inteira dizendo o que eu não paro de sentir.`, `${feeling},`, `Você é meu melhor presente e meu motivo pra sorrir.`,
          '[Verso 2]', `${momentTwo},`, `Até os dias comuns ficam especiais.`, `Porque quando a gente está junto,`, `O amor faz festa nos detalhes mais banais.`,
          '[Ponte]', `${mustInclude}.`, `Se alguém perguntar meu segredo, eu vou responder:`, `É ter você e escolher você outra vez.`,
          '[Refrão final]', `${nickname}, vem ouvir,`, `Nossa história virou canção só pra te fazer sorrir.`
        ]
      }
    ];
    return directions.map((direction, index) => ({
      id: `draft-${index + 1}`,
      name: direction.name,
      angle: direction.angle,
      intro: direction.intro,
      style,
      title: direction.title,
      lyrics: direction.body.join('\n'),
      generatedAt: Date.now()
    }));
  }

  function buildFinalDraftMessage(order, payment, brief, draft) {
    const plan = getPlan(order);
    const method = String(payment.captureMethod || '').toLowerCase() === 'credit_card' ? 'Cartão de crédito' : 'PIX';
    return [
      `Olá! Meu pagamento de ${plan.label} foi confirmado e esta é a letra escolhida para eu criar a música. 🎵`,
      '',
      `*Pedido:* ${payment.orderNsu || 'confirmado'}`,
      `*Transação:* ${payment.transactionNsu || 'confirmada'}`,
      `*Pagamento:* ${method} confirmado pela InfinitePay ✅`,
      `*Cliente:* ${brief.customerName || order.customerName}`,
      `*WhatsApp:* ${brief.customerPhone || order.customerPhone}`,
      `*Pessoa homenageada:* ${brief.recipientName}`,
      `*Ocasião:* ${brief.occasion}`,
      `*Estilo musical:* ${brief.musicStyle}`,
      `*Voz:* ${brief.voice}`,
      '',
      `*Modelo escolhido:* ${draft.name} — ${draft.angle}`,
      `*Título:* ${draft.title}`,
      '',
      '*LETRA APROVADA PARA CRIAÇÃO DO ÁUDIO:*',
      draft.lyrics,
      '',
      '*Diretriz emocional:*',
      brief.desiredFeeling,
      '',
      'A letra acima foi selecionada e editada pelo cliente. Pode ser usada como base para a criação do áudio.'
    ].filter(Boolean).join('\n');
  }

  function renderDraftEditor(order, payment, brief, drafts, selectedIndex = 0) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const state = getDraftState() || { paymentOrderNsu: payment.orderNsu, selectedIndex, drafts, status: 'editing' };
    state.drafts = drafts?.length ? drafts : state.drafts || createLyricsDrafts(brief);
    state.selectedIndex = Math.max(0, Math.min(Number(selectedIndex) || 0, state.drafts.length - 1));
    const selected = state.drafts[state.selectedIndex];
    saveDraftState({ ...state, updatedAt: Date.now() });
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 3 DE 4 • ESCOLHA E MODELE</span>
      <h2>Escolha a versão que mais parece com vocês</h2>
      <div class="brief-lead"><span class="checkout-badge success">✓ História recebida • 5 modelos criados</span><p>Selecione um modelo, edite o título ou qualquer verso e salve quantas vezes precisar. A versão escolhida só será enviada depois da sua aprovação.</p></div>
      <div class="brief-progress" aria-label="Progresso do pedido"><span class="is-active"></span><span class="is-active"></span><span class="is-active"></span><span></span></div>
      <div class="lyrics-draft-grid" aria-label="Modelos de letra">
        ${state.drafts.map((draft, index) => `<button class="lyrics-draft-picker${index === state.selectedIndex ? ' is-selected' : ''}" type="button" data-draft-index="${index}"><span class="draft-number">0${index + 1}</span><strong>${escapeHtml(draft.name)}</strong><small>${escapeHtml(draft.angle)}</small><em>${escapeHtml(draft.style)}</em></button>`).join('')}
      </div>
      <form id="lyrics-editor-form" class="lyrics-editor-form">
        <div class="editor-heading"><div><span class="eyebrow">MODELO 0${state.selectedIndex + 1}</span><h3>${escapeHtml(selected.name)}</h3></div><span class="editor-save-status" id="editor-save-status">Rascunho salvo nesta sessão</span></div>
        <p class="editor-intro">${escapeHtml(selected.intro)}</p>
        <label>Título da música<input id="lyrics-title" type="text" maxlength="120" required /></label>
        <label>Letra editável<textarea id="lyrics-content" class="lyrics-editor" required minlength="40" maxlength="8000"></textarea></label>
        <div class="editor-actions"><button class="button button-outline" type="button" id="ip-save-draft">Salvar alterações</button><button class="button button-ghost" type="button" id="ip-regenerate-models">Restaurar os 5 modelos</button></div>
        <label class="consent lyrics-approval"><input type="checkbox" id="lyrics-approval" required /><span>Li e aprovo esta versão da letra para criação do áudio. Entendo que, depois do envio, novos ajustes deverão ser combinados pelo atendimento.</span></label>
        <button class="button button-primary form-submit" type="button" id="ip-approve-and-send">Aprovar letra e enviar para criação</button>
        <div class="checkout-error" id="ip-draft-error" role="alert"></div>
        <p class="form-help">O envio abrirá o WhatsApp do atendimento com a letra completa em texto.</p>
      </form>
    `;
    const titleInput = card.querySelector('#lyrics-title');
    const lyricsInput = card.querySelector('#lyrics-content');
    if (titleInput) titleInput.value = selected.title || '';
    if (lyricsInput) lyricsInput.value = selected.lyrics || '';
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);

    const syncEditor = () => {
      const current = state.drafts[state.selectedIndex];
      if (!current) return;
      current.title = titleInput?.value?.trim() || current.title;
      current.lyrics = lyricsInput?.value || current.lyrics;
      saveDraftState({ ...state, status: 'editing', updatedAt: Date.now() });
    };
    titleInput?.addEventListener('input', syncEditor);
    lyricsInput?.addEventListener('input', syncEditor);
    card.querySelectorAll('[data-draft-index]').forEach((button) => button.addEventListener('click', () => {
      syncEditor();
      renderDraftEditor(order, payment, brief, state.drafts, Number(button.dataset.draftIndex));
    }));
    card.querySelector('#ip-save-draft')?.addEventListener('click', () => {
      syncEditor();
      const status = card.querySelector('#editor-save-status');
      if (status) status.textContent = 'Alterações salvas ✓';
    });
    card.querySelector('#ip-regenerate-models')?.addEventListener('click', () => {
      syncEditor();
      const freshDrafts = createLyricsDrafts(brief);
      saveDraftState({ paymentOrderNsu: payment.orderNsu, selectedIndex: 0, drafts: freshDrafts, status: 'editing', updatedAt: Date.now() });
      renderDraftEditor(order, payment, brief, freshDrafts, 0);
    });
    card.querySelector('#ip-approve-and-send')?.addEventListener('click', async () => {
      syncEditor();
      const errorBox = card.querySelector('#ip-draft-error');
      const approval = card.querySelector('#lyrics-approval');
      if (!approval?.checked) {
        if (errorBox) { errorBox.textContent = 'Marque a aprovação da letra antes de enviar.'; errorBox.classList.add('is-visible'); }
        return;
      }
      const draft = state.drafts[state.selectedIndex];
      await (window.CancaoPublicConfig?.ready || Promise.resolve());
      const message = buildFinalDraftMessage(order, payment, brief, draft);
      const url = makeWhatsAppUrl(message);
      if (!url) {
        if (errorBox) { errorBox.textContent = 'O atendimento ainda não está configurado. Configure WHATSAPP_NUMBER no ambiente do site.'; errorBox.classList.add('is-visible'); }
        return;
      }
      const sentState = { ...state, status: 'sent', sentAt: Date.now(), updatedAt: Date.now() };
      saveDraftState(sentState);
      track('Lead', { content_name: 'Letra aprovada enviada para criação', value: getPlan(order).value, currency: 'BRL' });
      if (isLocalDemo()) {
        renderDraftSent(order, payment, brief, draft);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      renderDraftSent(order, payment, brief, draft);
    });
  }

  function renderDraftSent(order, payment, brief, draft) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    draft = draft || createLyricsDrafts(brief)[0];
    const message = buildFinalDraftMessage(order, payment, brief, draft);
    let whatsappUrl = makeWhatsAppUrl(message);
    card.innerHTML = `
      <button class="modal-close" type="button" data-ip-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 4 DE 4 • ENVIO CONCLUÍDO</span>
      <h2>Letra pronta para você criar ✓</h2>
      <div class="payment-confirmed-card brief-success-card"><span class="checkout-badge success">✓ Letra aprovada</span><strong>O modelo selecionado foi preparado em texto.</strong><p>O WhatsApp será aberto com o pedido, o modelo escolhido e a letra completa para você criar o áudio.</p></div>
      <div class="order-summary-mini"><div><strong>${escapeHtml(draft.title)}</strong><br><span>${escapeHtml(draft.name)} • ${escapeHtml(draft.style)}</span></div><strong>APROVADA</strong></div>
      <div class="brief-timeline" aria-label="Etapas concluídas"><article class="brief-timeline-item is-complete"><span>01</span><div><strong>Pagamento confirmado</strong><small>Pedido validado pela InfinitePay.</small></div></article><article class="brief-timeline-item is-complete"><span>02</span><div><strong>História recebida</strong><small>Briefing organizado no questionário.</small></div></article><article class="brief-timeline-item is-complete"><span>03</span><div><strong>Modelo escolhido e editado</strong><small>${escapeHtml(draft.name)} aprovado pelo cliente.</small></div></article><article class="brief-timeline-item"><span>04</span><div><strong>Agora é criar o áudio</strong><small>A letra completa está pronta no WhatsApp.</small></div></article></div>
      <div class="brief-submit-actions"><button class="button button-primary form-submit" type="button" id="ip-send-approved" ${whatsappUrl ? '' : 'disabled'}>Enviar letra novamente</button><button class="button button-outline form-submit" type="button" id="ip-edit-approved">Editar letra</button></div>
      <div class="checkout-error" id="ip-final-error" role="alert"></div>
      <p class="form-help">Se o WhatsApp não abrir, use o botão novamente ou copie o briefing pela conversa do atendimento.</p>
    `;
    card.querySelector('[data-ip-close]')?.addEventListener('click', closeModal);
    window.CancaoPublicConfig?.ready?.then(() => {
      whatsappUrl = makeWhatsAppUrl(message);
      const button = card.querySelector('#ip-send-approved');
      if (button) button.disabled = !whatsappUrl;
    });
    card.querySelector('#ip-send-approved')?.addEventListener('click', () => {
      whatsappUrl = makeWhatsAppUrl(message);
      if (!whatsappUrl) {
        const errorBox = card.querySelector('#ip-final-error');
        if (errorBox) { errorBox.textContent = 'O atendimento ainda não está configurado.'; errorBox.classList.add('is-visible'); }
        return;
      }
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    });
    card.querySelector('#ip-edit-approved')?.addEventListener('click', () => {
      const state = getDraftState();
      renderDraftEditor(order, payment, brief, state?.drafts || [draft], state?.selectedIndex || 0);
    });
  }

  function renderPaid(order, payment) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const plan = getPlan(order);
    const brief = getBrief();
    if (brief?.paymentOrderNsu && brief.paymentOrderNsu === payment.orderNsu) {
      const state = getDraftState();
      if (state?.paymentOrderNsu === payment.orderNsu && state.status === 'sent') {
        renderDraftSent(order, payment, brief, state.drafts?.[state.selectedIndex] || state.drafts?.[0]);
      } else {
        renderDraftEditor(order, payment, brief, state?.drafts || createLyricsDrafts(brief), state?.selectedIndex || 0);
      }
      return;
    }
    renderPostPaymentBrief(order, payment);
    const purchaseKey = `${payment.orderNsu || ''}:${payment.transactionNsu || ''}`;
    let alreadyTracked = false;
    try { alreadyTracked = sessionStorage.getItem('cancao_purchase_tracked_v1') === purchaseKey; } catch {}
    if (!alreadyTracked) {
    track('Purchase', { content_name: 'Canção de Nós', value: plan.value, currency: 'BRL' });
      try { sessionStorage.setItem('cancao_purchase_tracked_v1', purchaseKey); } catch {}
    }
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
    throw new Error(lastResult?.message || 'O pagamento ainda não foi confirmado pela InfinitePay.');
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
    const selectedPlan = getPlan(order);
    track('InitiateCheckout', { content_name: 'Canção de Nós', value: selectedPlan.value, currency: 'BRL' });

    if (isLocalDemo()) {
      const demoPayment = {
        orderNsu: `demo-${selectedPlan.key}-${Date.now()}`,
        transactionNsu: `demo-transaction-${Date.now()}`,
        slug: 'local-demo',
        captureMethod: selectedPlan.key === 'card' ? 'credit_card' : 'pix',
        verified: true,
        paid: true,
        amount: selectedPlan.cents,
        paidAmount: selectedPlan.cents,
        installments: selectedPlan.key === 'card' ? 12 : 1,
      };
      order.orderNsu = demoPayment.orderNsu;
      saveOrder(order);
      saveVerifiedPayment(demoPayment);
      renderPaid(order, demoPayment);
      return;
    }

    checkoutWindow = openCheckoutWindow();

    try {
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: order.customerName, customerPhone: order.customerPhone, paymentPlan: selectedPlan.key }),
      });
      const result = await response.json().catch(() => ({}));
      if ([404, 405, 501].includes(response.status)) {
        throw new Error('A prévia local não executa a API do checkout. Publique as funções do site e configure o INFINITEPAY_HANDLE para testar o pagamento.');
      }
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
    if (document.body.dataset.cancaoPaymentBound === 'true') return;
    document.body.dataset.cancaoPaymentBound = 'true';
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('.plan-button,[data-start-order],.floating-whatsapp,.header-cta')
        : null;
      if (!target) return;
      event.preventDefault();
      const order = getOrder();
      const verified = getVerifiedPayment();
      if (order && verified?.verified && (!order.orderNsu || verified.orderNsu === order.orderNsu)) renderPaid(order, verified);
      else renderForm();
      openModal();
    }, true);
  }

  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  renderForm();
  overrideStartButtons();
  handleInfinitePayReturn();
})();
