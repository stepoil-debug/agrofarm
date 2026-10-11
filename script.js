(() => {
  const loadDeferredVideos = () => {
    const desktop = window.matchMedia('(min-width: 768px)').matches;
    const videos = [...document.querySelectorAll('video[data-lazy-video]')];
    if (!videos.length) return;

    const load = (video) => {
      if (video.dataset.loaded || (video.dataset.desktopOnly !== undefined && !desktop)) return;
      const source = video.querySelector('source[data-src]');
      if (!source?.dataset.src) return;
      source.src = source.dataset.src;
      video.dataset.loaded = 'true';
      video.load();
      if (video.autoplay) video.play().catch(() => {});
    };

    if (!('IntersectionObserver' in window)) {
      if (desktop) videos.forEach(load);
      return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        instance.unobserve(entry.target);
      });
    }, { rootMargin: '180px 0px', threshold: 0.01 });

    videos.forEach((video) => observer.observe(video));
  };

  const scheduleVideoLoad = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 1400 })
    : (callback) => window.setTimeout(callback, 900);
  scheduleVideoLoad(loadDeferredVideos);

  // O fluxo comercial é feito no X1: briefing completo, escolha da proposta
  // e envio para o vendedor no WhatsApp. O pagamento é combinado no atendimento.
  const flow = document.createElement('script');
  flow.src = './x1-flow.js?v=20260928-1';
  flow.defer = false;
  document.body.appendChild(flow);
})();
