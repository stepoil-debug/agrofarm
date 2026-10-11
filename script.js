(() => {
  const desktop = window.matchMedia('(min-width: 900px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Vídeo do hero: só no desktop, depois que a página ficou ociosa.
  const loadDeferredVideos = () => {
    if (!desktop || reducedMotion) return;
    document.querySelectorAll('video[data-lazy-video]').forEach((video) => {
      const source = video.querySelector('source[data-src]');
      if (!source?.dataset.src || video.dataset.loaded) return;
      source.src = source.dataset.src;
      video.dataset.loaded = 'true';
      video.load();
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
      video.play().catch(() => {});
    });
  };
  const idle = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 2500 })
    : (callback) => window.setTimeout(callback, 1500);
  window.addEventListener('load', () => idle(loadDeferredVideos), { once: true });

  // Cabeçalho com borda ao rolar e CTA fixo no celular.
  const header = document.querySelector('.header');
  const floating = document.querySelector('.floating-whatsapp');
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    floating?.classList.toggle('is-visible', y > 560);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Player de exemplo.
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  document.querySelectorAll('[data-player]').forEach((player) => {
    const audio = player.querySelector('audio');
    const button = player.querySelector('.play-btn');
    const bar = player.querySelector('.track-bar');
    const fill = player.querySelector('.track-fill');
    const current = player.querySelector('[data-current]');
    const duration = player.querySelector('[data-duration]');
    if (!audio || !button) return;

    const sync = () => {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      fill.style.width = `${pct}%`;
      bar?.setAttribute('aria-valuenow', String(Math.round(pct)));
      current.textContent = formatTime(audio.currentTime);
    };
    audio.addEventListener('loadedmetadata', () => { duration.textContent = formatTime(audio.duration); });
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('play', () => {
      player.classList.add('is-playing');
      button.setAttribute('aria-label', 'Pausar exemplo');
      window.CancaoAnalytics?.track?.('sample_play');
    });
    audio.addEventListener('pause', () => { player.classList.remove('is-playing'); button.setAttribute('aria-label', 'Tocar exemplo'); });
    audio.addEventListener('ended', () => { audio.currentTime = 0; sync(); });
    button.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));

    const seek = (ratio) => {
      if (!audio.duration) return;
      audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audio.duration;
      sync();
    };
    bar?.addEventListener('click', (event) => {
      const rect = bar.getBoundingClientRect();
      seek((event.clientX - rect.left) / rect.width);
    });
    bar?.addEventListener('keydown', (event) => {
      if (!audio.duration) return;
      const step = event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0;
      if (!step) return;
      event.preventDefault();
      seek((audio.currentTime + step) / audio.duration);
    });
  });

  const year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());

  // O fluxo comercial é feito no X1: briefing completo, escolha da proposta
  // e envio para o vendedor no WhatsApp. O pagamento é combinado no atendimento.
  const flow = document.createElement('script');
  flow.src = '/x1-flow.js?v=20261010-1';
  document.body.appendChild(flow);
})();
