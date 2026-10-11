(() => {
  const localDemo = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && new URLSearchParams(window.location.search).get('demoPayment') === '1';
  const defaults = {
    whatsappNumber: localDemo ? '5511999999999' : '',
    deliverySla: '',
  };
  let config = { ...defaults };

  const ready = fetch('/api/site-config', {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((remote) => {
      if (remote?.success) config = { ...defaults, ...remote };
      return config;
    })
    .catch(() => config);

  window.CancaoPublicConfig = {
    ready,
    get: () => ({ ...config }),
  };
})();
