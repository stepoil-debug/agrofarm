(() => {
  const PRICE_VALUE = 49.90;
  const CONSENT_KEY = 'cancao_analytics_consent_v1';
  let config = null;
  let initialized = false;

  const loadScript = (src, id) => new Promise((resolve) => {
    if (document.getElementById(id)) return resolve();
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = resolve;
    script.onerror = resolve;
    document.head.appendChild(script);
  });

  const initMeta = async (pixelId) => {
    if (!pixelId || window.fbq) return;
    window.fbq = function () {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    window._fbq = window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
    window.fbq.queue = [];
    await loadScript(`https://connect.facebook.net/en_US/fbevents.js`, 'meta-pixel-script');
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  };

  const initGoogle = async (measurementId) => {
    if (!measurementId || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    await loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, 'google-analytics-script');
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { allow_google_signals: false });
  };

  const track = (event, parameters = {}) => {
    if (window.fbq && config?.metaPixelId) {
      window.fbq('track', event, parameters);
    }
    if (window.gtag && config?.gaMeasurementId) {
      window.gtag('event', event, parameters);
    }
  };

  window.CancaoAnalytics = {
    track,
    price: PRICE_VALUE,
  };

  const hasTracking = () => Boolean(config?.metaPixelId || config?.gaMeasurementId);

  const startAnalytics = async () => {
    if (!hasTracking() || initialized) return;
    initialized = true;
    await Promise.all([initMeta(config.metaPixelId), initGoogle(config.gaMeasurementId)]);
    track('ViewContent', { content_name: 'Canção de Nós', value: PRICE_VALUE, currency: 'BRL' });
  };

  const showConsent = () => {
    const banner = document.createElement('aside');
    banner.setAttribute('aria-label', 'Preferências de medição');
    banner.innerHTML = `
      <div><strong>Privacidade e medição</strong><p>Podemos usar medição de acesso e conversão para melhorar o site e os anúncios. Você escolhe.</p></div>
      <div><button type="button" data-consent="decline">Recusar</button><button type="button" data-consent="accept">Aceitar medição</button></div>
    `;
    Object.assign(banner.style, {
      position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: '1200',
      display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', border: '1px solid rgba(104,28,67,.16)', borderRadius: '16px',
      background: '#fffaf7', color: '#4e2236', boxShadow: '0 16px 48px rgba(57,15,34,.18)',
      font: '14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    });
    const style = document.createElement('style');
    style.textContent = `[aria-label="Preferências de medição"] p{margin:4px 0 0;color:#725f68}[aria-label="Preferências de medição"] div:last-child{display:flex;gap:8px;flex-shrink:0}[aria-label="Preferências de medição"] button{border:1px solid rgba(104,28,67,.2);border-radius:999px;padding:9px 13px;background:#fff;color:#65183e;font:700 13px system-ui;cursor:pointer}[aria-label="Preferências de medição"] button[data-consent="accept"]{background:#7b204e;color:#fff}@media(max-width:640px){[aria-label="Preferências de medição"]{flex-direction:column;align-items:stretch}[aria-label="Preferências de medição"] div:last-child{justify-content:flex-end}}`;
    document.head.appendChild(style);
    document.body.appendChild(banner);
    banner.querySelector('[data-consent="accept"]')?.addEventListener('click', async () => {
      try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch {}
      banner.remove();
      await startAnalytics();
    });
    banner.querySelector('[data-consent="decline"]')?.addEventListener('click', () => {
      try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch {}
      banner.remove();
    });
  };

  (async () => {
    try {
      const response = await fetch('/api/site-config', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      config = response.ok ? await response.json() : {};
      if (!config?.success || !hasTracking()) return;
      let consent = '';
      try { consent = localStorage.getItem(CONSENT_KEY) || ''; } catch {}
      if (consent === 'accepted') await startAnalytics();
      else if (!consent) showConsent();
    } catch {}
  })();
})();
