(() => {
  const defaults = {
    whatsappNumber: '',
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
