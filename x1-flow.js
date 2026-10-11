(() => {
  const modal = document.querySelector('#order-modal');
  if (!modal) return;

  const ORDER_KEY = 'cancao_x1_order_v1';
  const STATE_KEY = 'cancao_x1_state_v1';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const compact = (value, fallback = 'Não informado', limit = 220) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return fallback;
    return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
  };
  const safeSet = (key, value) => {
    const serialized = JSON.stringify(value);
    try { sessionStorage.setItem(key, serialized); } catch {}
    try { localStorage.setItem(key, serialized); } catch {}
  };
  const safeGet = (key) => {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const raw = storage.getItem(key);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  };
  const saveOrder = (order) => safeSet(ORDER_KEY, order);
  const getOrder = () => safeGet(ORDER_KEY);
  const saveState = (state) => safeSet(STATE_KEY, state);
  const getState = () => safeGet(STATE_KEY);
  const track = (event, parameters = {}) => window.CancaoAnalytics?.track(event, parameters);

  const openModal = () => {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };
  const makeWhatsAppUrl = (message) => {
    const number = normalizePhone(window.CancaoPublicConfig?.get?.().whatsappNumber);
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : '';
  };
  const formatDate = (value) => {
    if (!value) return 'Não informada';
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  function createModels(order) {
    const person = compact(order.recipientName, 'sua pessoa amada', 60);
    const style = compact(order.musicStyle, 'romântico', 55);
    const nickname = compact(order.nickname, person, 45);
    const story = compact(order.story, 'a história de vocês', 170);
    return [
      { name: 'História em capítulos', angle: 'Narrativa romântica', intro: 'A relação contada como uma história que ganha força a cada verso.', title: `${nickname}, minha história favorita`, preview: `Era uma vez nós dois, e o tempo guardou cada detalhe / ${story} / Hoje eu olho para ${person} e agradeço por tudo que vivemos.`, style },
      { name: 'Cena de cinema', angle: 'Declaração cinematográfica', intro: 'Uma declaração grande, visual e emocionante para o momento da surpresa.', title: 'A cena que o amor escreveu', preview: `Se a nossa vida fosse um filme, eu escolheria essa cena / ${story} / E no final de cada sonho, eu escolheria você de novo.`, style },
      { name: 'Refrão que fica', angle: 'Pop leve e memorável', intro: 'Um refrão simples, cantável e fácil de lembrar depois do primeiro play.', title: `${person}, fica comigo`, preview: `Fica comigo, deixa o mundo esperar / ${story} / Fica comigo, que eu nasci para te encontrar.`, style },
      { name: 'Perto do coração', angle: 'Intimista e voz e violão', intro: 'Uma versão próxima, delicada e confessional, como uma conversa entre vocês.', title: 'Tudo que eu nunca deixei de sentir', preview: `Eu guardo no peito o começo de nós / ${story} / E quando a vida silencia, é seu nome que eu ouço.`, style },
      { name: 'Surpresa com sorriso', angle: 'Autoral e afetuosa', intro: 'Uma homenagem leve, carinhosa e com espaço para os detalhes únicos do casal.', title: `Só nós sabemos, ${person}`, preview: `Tem coisas que só a gente entende e ninguém precisa explicar / ${story} / Meu melhor presente foi encontrar você no caminho.`, style },
    ];
  }

  function progress(active) {
    return `<div class="brief-progress" aria-label="Progresso do pedido"><span class="${active >= 1 ? 'is-active' : ''}"></span><span class="${active >= 2 ? 'is-active' : ''}"></span><span class="${active >= 3 ? 'is-active' : ''}"></span></div>`;
  }

  function renderForm(plan = {}) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const saved = getOrder() || {};
    card.className = 'modal-card payment-modal x1-modal';
    card.innerHTML = `
      <button class="modal-close" type="button" data-x1-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 1 DE 3 • BRIEFING DA SUA MÚSICA</span>
      <h2 id="modal-title">Vamos criar algo só de vocês</h2>
      <p class="brief-intro">Preencha tudo com calma. Depois você escolhe a direção da música e envia o pedido pronto para o nosso atendimento.</p>
      <div class="checkout-badges"><span class="checkout-badge">✓ Sem pagamento nesta etapa</span><span class="checkout-badge">✓ Escolha entre 5 propostas</span><span class="checkout-badge">✓ Atendimento pelo WhatsApp</span></div>
      ${progress(1)}
      <form id="x1-order-form">
        <div class="form-grid">
          <label>Seu nome<input type="text" name="customerName" required maxlength="80" autocomplete="name" placeholder="Como podemos chamar você?" /></label>
          <label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label>
          <label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Quem vai receber a música?" /></label>
          <label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido..." /></label>
          <label>Ocasião<select name="occasion" required><option value="">Selecione</option><option>Aniversário da pessoa amada</option><option>Aniversário de namoro</option><option>Aniversário de casamento</option><option>Pedido de casamento</option><option>Casamento</option><option>Reconciliação</option><option>Declaração surpresa</option><option>Outra ocasião</option></select></label>
          <label>Data da comemoração<input type="date" name="celebrationDate" required /></label>
          <label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label>
          <label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label>
          <label>Tempo de relacionamento <span class="optional">(opcional)</span><input type="text" name="relationship" maxlength="80" placeholder="Ex.: 14 anos casados" /></label>
        </div>
        <label>A história de vocês<textarea name="story" required minlength="40" maxlength="3000" placeholder="Como vocês se conheceram? Quais momentos, lugares, dificuldades, conquistas, viagens ou frases não podem faltar?"></textarea></label>
        <label>Momentos e detalhes obrigatórios <span class="optional">(opcional)</span><textarea name="keyMoments" maxlength="1500" placeholder="Nomes dos filhos, apelidos, lugares, datas, brincadeiras e lembranças importantes..."></textarea></label>
        <label>O que você quer que essa pessoa sinta? <span class="optional">(opcional)</span><textarea name="message" maxlength="1000" placeholder="Ex.: Quero que ela se sinta amada, valorizada e reconhecida por tudo que vivemos."></textarea></label>
        <label class="consent"><input type="checkbox" name="consent" required /><span>Autorizo o uso dessas informações para preparar minha proposta de música e entendo que o atendimento confirmará prazo e pagamento pelo WhatsApp.</span></label>
        <button class="button button-primary form-submit" type="submit">Continuar e ver as propostas</button>
        <p class="form-help">Você só envia o pedido ao vendedor depois de escolher o modelo que mais gostou.</p>
      </form>`;
    const form = card.querySelector('#x1-order-form');
    Object.entries({ ...saved, ...plan }).forEach(([name, value]) => {
      const field = form?.elements?.[name];
      if (field && value != null && typeof value !== 'object') field.value = value;
    });
    const date = card.querySelector('[name="celebrationDate"]');
    if (date) date.min = new Date().toISOString().slice(0, 10);
    card.querySelector('[data-x1-close]')?.addEventListener('click', closeModal);
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const order = Object.fromEntries(new FormData(form).entries());
      order.customerPhone = normalizePhone(order.customerPhone);
      order.plan = plan.plan || saved.plan || 'Música personalizada';
      order.price = plan.price || saved.price || 'A partir de R$ 49,90';
      order.createdAt = Date.now();
      saveOrder(order);
      track('ViewContent', { content_name: 'Propostas de música personalizada' });
      composeLyrics(order);
    });
    setTimeout(() => card.querySelector('[name="customerName"]')?.focus(), 80);
  }

  // Letra modelo usada só quando a IA não responde, para o fluxo nunca travar.
  const templateLyrics = (model) => `[Verso]\n${model.preview.split(' / ').join('\n')}\n\n[Refrão]\n${model.title}`;

  const postLyrics = async (payload) => {
    const response = await fetch('/api/lyrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Falha ao gerar a letra.');
    return data;
  };

  function renderComposing(order) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.className = 'modal-card payment-modal x1-modal';
    card.innerHTML = `
      <button class="modal-close" type="button" data-x1-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 2 DE 3 • COMPONDO</span>
      <h2>Compondo 5 versões da música de ${escapeHtml(order.recipientName)}…</h2>
      <p class="brief-intro">Estamos transformando a história de vocês em letras completas. Isso leva cerca de 20 segundos.</p>
      ${progress(2)}
      <div class="x1-composing" aria-live="polite"><span class="x1-composing-disc" aria-hidden="true"></span><p data-composing-line>Lendo a história de vocês…</p></div>`;
    card.querySelector('[data-x1-close]')?.addEventListener('click', closeModal);
    const lines = ['Lendo a história de vocês…', 'Encontrando as rimas certas…', 'Colocando o nome no refrão…', 'Escrevendo a ponte mais emocionante…', 'Revisando cada verso…'];
    let step = 0;
    const timer = setInterval(() => {
      const line = card.querySelector('[data-composing-line]');
      if (!line) return clearInterval(timer);
      step = (step + 1) % lines.length;
      line.textContent = lines[step];
    }, 3200);
    return () => clearInterval(timer);
  }

  async function composeLyrics(order) {
    const stop = renderComposing(order);
    let models;
    try {
      const { versions } = await postLyrics({ action: 'generate', order });
      const fallback = createModels(order);
      models = versions.map((version, index) => (version
        ? { ...fallback[index], name: version.name, angle: version.angle, title: version.title, lyrics: version.lyrics, source: 'ai' }
        : { ...fallback[index], lyrics: templateLyrics(fallback[index]), source: 'template' }));
      track('LyricsGenerated', { content_name: 'Letras geradas por IA' });
    } catch (error) {
      models = createModels(order).map((model) => ({ ...model, lyrics: templateLyrics(model), source: 'template' }));
    }
    stop?.();
    saveState({ order, models, selectedIndex: 0, notes: '', status: 'choosing', updatedAt: Date.now() });
    renderModelChoice(order, models, 0, '');
  }

  function renderModelChoice(order, models, selectedIndex = 0, notes = '') {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    const selected = models[selectedIndex] || models[0];
    if (!selected.lyrics) selected.lyrics = templateLyrics(selected);
    const persist = (status = 'choosing') => saveState({ order, models, selectedIndex, notes, status, updatedAt: Date.now() });
    card.className = 'modal-card payment-modal x1-modal';
    card.innerHTML = `
      <button class="modal-close" type="button" data-x1-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 2 DE 3 • ESCOLHA E AJUSTE A LETRA</span>
      <h2>5 letras feitas para ${escapeHtml(order.recipientName)}</h2>
      <p class="brief-intro">Escolha a versão que mais tocou você. Edite o texto à vontade ou peça um ajuste — quando estiver do seu jeito, aprove a letra.</p>
      ${progress(2)}
      <div class="lyrics-draft-grid x1-model-grid" aria-label="Versões da letra">
        ${models.map((model, index) => `<button class="lyrics-draft-picker${index === selectedIndex ? ' is-selected' : ''}" type="button" data-model-index="${index}"><span class="draft-number">0${index + 1}</span><strong>${escapeHtml(model.title)}</strong><small>${escapeHtml(model.angle)}</small></button>`).join('')}
      </div>
      <div class="x1-selected-proposal x1-lyrics-editor">
        <span class="eyebrow">VERSÃO 0${selectedIndex + 1} • ${escapeHtml(selected.name)}</span>
        <label>Título<input type="text" id="x1-title" maxlength="120" value="${escapeHtml(selected.title)}" /></label>
        <label>Letra <span class="optional">(clique para editar)</span><textarea id="x1-lyrics" class="x1-lyrics" maxlength="4000" rows="14">${escapeHtml(selected.lyrics)}</textarea></label>
        ${selected.source === 'template' ? '<p class="form-help">Mostramos uma versão-base. O atendimento lapida a letra com você no WhatsApp.</p>' : ''}
      </div>
      <div class="x1-ai-revise">
        <label>Quer que a gente ajuste esta letra? <span class="optional">(opcional)</span><textarea id="x1-instruction" maxlength="600" rows="2" placeholder="Ex.: mais emocionante, citar a Mel no refrão, terminar com um pedido de casamento…"></textarea></label>
        <div class="x1-revise-actions"><button class="button button-outline" type="button" id="x1-revise">✨ Reescrever com esse ajuste</button>${selected.previous ? '<button class="button button-ghost" type="button" id="x1-undo">Desfazer</button>' : ''}</div>
        <div class="checkout-error" id="x1-revise-error" role="alert"></div>
      </div>
      <div class="brief-submit-actions x1-actions"><button class="button button-outline" type="button" id="x1-back-form">Voltar e editar história</button><button class="button button-primary form-submit" type="button" id="x1-review">Aprovar esta letra</button></div>
      <p class="form-help">Nenhuma cobrança agora. A letra aprovada vai para o atendimento no WhatsApp, onde fechamos produção, prazo e valor.</p>`;

    const title = card.querySelector('#x1-title');
    const lyrics = card.querySelector('#x1-lyrics');
    const syncEdits = () => {
      selected.title = title.value.trim() || selected.title;
      selected.lyrics = lyrics.value;
      persist();
    };
    title?.addEventListener('input', syncEdits);
    lyrics?.addEventListener('input', syncEdits);

    card.querySelector('[data-x1-close]')?.addEventListener('click', closeModal);
    card.querySelector('#x1-back-form')?.addEventListener('click', () => renderForm(order));
    card.querySelectorAll('[data-model-index]').forEach((button) => button.addEventListener('click', () => {
      syncEdits();
      selectedIndex = Number(button.dataset.modelIndex);
      persist();
      renderModelChoice(order, models, selectedIndex, notes);
    }));

    card.querySelector('#x1-undo')?.addEventListener('click', () => {
      Object.assign(selected, selected.previous, { previous: null });
      persist();
      renderModelChoice(order, models, selectedIndex, notes);
    });

    card.querySelector('#x1-revise')?.addEventListener('click', async () => {
      const button = card.querySelector('#x1-revise');
      const error = card.querySelector('#x1-revise-error');
      const instruction = card.querySelector('#x1-instruction')?.value.trim();
      error.classList.remove('is-visible');
      if (!instruction) {
        error.textContent = 'Escreva o que você quer mudar na letra.';
        error.classList.add('is-visible');
        return;
      }
      syncEdits();
      button.disabled = true;
      button.textContent = 'Reescrevendo…';
      lyrics.setAttribute('aria-busy', 'true');
      try {
        const { version } = await postLyrics({ action: 'revise', order, instruction, version: { title: selected.title, lyrics: selected.lyrics, angle: selected.angle } });
        selected.previous = { title: selected.title, lyrics: selected.lyrics };
        selected.title = version.title;
        selected.lyrics = version.lyrics;
        selected.source = 'ai';
        notes = [notes, instruction].filter(Boolean).join(' | ');
        persist();
        track('LyricsRevised', { content_name: 'Letra ajustada por IA' });
        renderModelChoice(order, models, selectedIndex, notes);
      } catch (err) {
        button.disabled = false;
        button.textContent = '✨ Reescrever com esse ajuste';
        lyrics.removeAttribute('aria-busy');
        error.textContent = err.message || 'Não conseguimos ajustar agora. Você pode editar o texto diretamente.';
        error.classList.add('is-visible');
      }
    });

    card.querySelector('#x1-review')?.addEventListener('click', () => {
      syncEdits();
      if (selected.lyrics.trim().length < 40) {
        lyrics.focus();
        return;
      }
      persist('reviewing');
      track('LyricsApproved', { content_name: selected.name });
      renderReview(order, selected, notes, selectedIndex);
    });
  }

  function buildMessage(order, model, notes) {
    return [
      'Olá! Aprovei a letra da minha música personalizada e quero fechar a produção. 🎵❤️',
      '',
      '*NOVO BRIEFING — CANÇÃO DE NÓS*',
      `*Plano/oferta:* ${order.plan || 'Música personalizada'}`,
      '*Valor de referência no site:* a partir de R$ 49,90',
      '',
      `*Meu nome:* ${order.customerName}`,
      `*Meu WhatsApp:* ${order.customerPhone}`,
      `*Pessoa homenageada:* ${order.recipientName}`,
      `*Como eu chamo:* ${order.nickname || 'Não informado'}`,
      `*Ocasião:* ${order.occasion}`,
      `*Data:* ${formatDate(order.celebrationDate)}`,
      `*Tempo de relacionamento:* ${order.relationship || 'Não informado'}`,
      `*Estilo:* ${order.musicStyle}`,
      `*Voz:* ${order.voice}`,
      '',
      '*HISTÓRIA*', order.story,
      '',
      '*MOMENTOS E DETALHES*', order.keyMoments || 'Não informado',
      '',
      '*O QUE QUERO QUE A PESSOA SINTA*', order.message || 'Não informado',
      '',
      `*LETRA APROVADA — ${model.name} (${model.angle})*`, `*${model.title}*`, '', model.lyrics || model.preview,
      '',
      '*AJUSTES PEDIDOS NO SITE*', notes || 'Nenhum.',
      '',
      'Pode me confirmar o prazo, o valor e a forma de pagamento para produzirmos a música?'
    ].join('\n');
  }

  function renderReview(order, model, notes, selectedIndex) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.className = 'modal-card payment-modal x1-modal';
    card.innerHTML = `
      <button class="modal-close" type="button" data-x1-close aria-label="Fechar">×</button>
      <span class="eyebrow">ETAPA 3 DE 3 • REVISE E ENVIE</span>
      <h2>Sua letra está aprovada ✓</h2>
      <p class="brief-intro">Ao enviar, o WhatsApp abre com a letra completa e o briefing para o atendimento produzir a música com você.</p>
      ${progress(3)}
      <div class="x1-review-card"><div><span class="small-label">PESSOA HOMENAGEADA</span><strong>${escapeHtml(order.recipientName)}</strong><p>${escapeHtml(order.occasion)} • ${escapeHtml(formatDate(order.celebrationDate))}</p></div><div><span class="small-label">LETRA APROVADA • ${escapeHtml(model.angle)} • ${escapeHtml(order.musicStyle)}</span><strong>${escapeHtml(model.title)}</strong><pre class="x1-lyrics-final">${escapeHtml(model.lyrics || model.preview)}</pre></div></div>
      <div class="checkout-note"><strong>Nenhuma cobrança será feita agora.</strong><br>O vendedor confirma prazo, disponibilidade, valor final e forma de pagamento diretamente com você.</div>
      <div class="brief-submit-actions x1-actions"><button class="button button-outline" type="button" id="x1-edit-model">Voltar e editar a letra</button><button class="button button-primary form-submit" type="button" id="x1-send">Enviar letra aprovada pelo WhatsApp</button></div>
      <div class="checkout-error" id="x1-error" role="alert"></div>`;
    card.querySelector('[data-x1-close]')?.addEventListener('click', closeModal);
    card.querySelector('#x1-edit-model')?.addEventListener('click', () => renderModelChoice(order, getState()?.models || createModels(order), selectedIndex, notes));
    card.querySelector('#x1-send')?.addEventListener('click', async () => {
      const button = card.querySelector('#x1-send');
      const error = card.querySelector('#x1-error');
      button.disabled = true;
      await window.CancaoPublicConfig?.ready;
      const url = makeWhatsAppUrl(buildMessage(order, model, notes));
      if (!url) {
        button.disabled = false;
        error.textContent = 'O WhatsApp do atendimento ainda não está configurado no site.';
        error.classList.add('is-visible');
        return;
      }
      saveState({ ...(getState() || {}), status: 'sent', sentAt: Date.now(), updatedAt: Date.now() });
      track('Lead', { content_name: 'Briefing X1 enviado ao WhatsApp', value: Number(String(order.price || '').replace(',', '.').replace(/[^\d.]/g, '')) || undefined, currency: 'BRL' });
      window.open(url, '_blank', 'noopener,noreferrer');
      renderSuccess(order, model);
    });
  }

  function renderSuccess(order, model) {
    const card = modal.querySelector('.modal-card');
    if (!card) return;
    card.innerHTML = `<button class="modal-close" type="button" data-x1-close aria-label="Fechar">×</button><span class="eyebrow">PEDIDO ENVIADO</span><h2>Agora é só continuar no WhatsApp ✓</h2><div class="payment-confirmed-card brief-success-card"><span class="checkout-badge success">✓ Briefing recebido pelo atendimento</span><strong>“${escapeHtml(model.title)}” foi enviada.</strong><p>O vendedor vai confirmar prazo, valor e pagamento com você. Se o WhatsApp não abriu, use o botão abaixo.</p></div><div class="brief-timeline"><article class="brief-timeline-item is-complete"><span>01</span><div><strong>História preenchida</strong><small>Todos os detalhes foram organizados.</small></div></article><article class="brief-timeline-item is-complete"><span>02</span><div><strong>Letra aprovada</strong><small>${escapeHtml(model.angle)}.</small></div></article><article class="brief-timeline-item"><span>03</span><div><strong>Atendimento e fechamento</strong><small>O vendedor continua a conversa pelo WhatsApp.</small></div></article></div><button class="button button-primary form-submit" type="button" id="x1-resend">Abrir WhatsApp novamente</button>`;
    card.querySelector('[data-x1-close]')?.addEventListener('click', closeModal);
    card.querySelector('#x1-resend')?.addEventListener('click', async () => {
      await window.CancaoPublicConfig?.ready;
      const state = getState();
      const orderData = state?.order || order;
      const models = state?.models || createModels(orderData);
      const chosen = models[state?.selectedIndex || 0] || model;
      const url = makeWhatsAppUrl(buildMessage(orderData, chosen, state?.notes || ''));
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function startFromButton(button) {
    openModal();
    const state = getState();
    const saved = state?.status !== 'sent' ? state?.order : null;
    renderForm({ plan: button?.dataset?.plan || saved?.plan || 'Música personalizada', price: button?.dataset?.price || saved?.price || 'A confirmar no WhatsApp' });
  }

  modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('.plan-button,[data-start-order],.floating-whatsapp,.header-cta') : null;
    if (!target) return;
    event.preventDefault();
    startFromButton(target);
  }, true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });
})();
