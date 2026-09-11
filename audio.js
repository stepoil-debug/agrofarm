(() => {
  const AUDIO_SRC = '/se-as-palavras-forem-poucas.mp3';
  const STATE_KEY = 'cancao_audio_state_v2';
  const TARGET_VOLUME = 0.22;

  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}'); } catch { return {}; }
  };

  const writeState = (audio, enabled = true) => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        time: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        enabled,
      }));
    } catch {}
  };

  const style = document.createElement('style');
  style.textContent = `
    /* Correção definitiva do CTA do topo */
    .header-cta{
      font-size:.84rem!important;
      min-width:112px!important;
      max-width:none!important;
      width:auto!important;
      overflow:visible!important;
      text-overflow:clip!important;
      white-space:nowrap!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      padding:10px 17px!important;
      line-height:1!important;
    }
    .header-cta::after{content:none!important;display:none!important}

    .site-audio-control{
      position:fixed;
      left:18px;
      bottom:18px;
      z-index:1100;
      display:flex;
      align-items:center;
      gap:9px;
      min-height:42px;
      padding:8px 12px 8px 9px;
      border:1px solid rgba(104,28,67,.14);
      border-radius:999px;
      background:rgba(255,250,247,.9);
      color:#65183e;
      box-shadow:0 14px 36px rgba(57,15,34,.16);
      backdrop-filter:blur(16px) saturate(130%);
      -webkit-backdrop-filter:blur(16px) saturate(130%);
      font:700 .76rem/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      cursor:pointer;
      transition:transform .25s ease,box-shadow .25s ease,opacity .25s ease;
    }
    .site-audio-control:hover{transform:translateY(-2px);box-shadow:0 18px 42px rgba(57,15,34,.22)}
    .site-audio-control__icon{
      display:grid;
      place-items:center;
      width:27px;
      height:27px;
      flex:0 0 27px;
      border-radius:50%;
      background:linear-gradient(135deg,#7b204e,#51122f);
      color:#fff;
      font-size:.8rem;
    }
    .site-audio-control.is-playing .site-audio-control__icon{animation:audioPulse 1.8s ease-in-out infinite}
    @keyframes audioPulse{0%,100%{box-shadow:0 0 0 0 rgba(123,32,78,.2)}50%{box-shadow:0 0 0 7px rgba(123,32,78,0)}}
    @media(max-width:720px){
      .header-cta{min-width:96px!important;max-width:116px!important;padding:9px 13px!important;font-size:.76rem!important}
      .site-audio-control{
        left:12px;
        bottom:calc(66px + env(safe-area-inset-bottom));
        min-height:38px;
        padding:7px 10px 7px 7px;
        font-size:.7rem;
      }
      .site-audio-control__icon{width:25px;height:25px;flex-basis:25px}
    }
    @media(max-width:390px){
      .header-cta{min-width:88px!important;max-width:102px!important;padding-inline:10px!important;font-size:.72rem!important}
      .site-audio-control__label{display:none}
      .site-audio-control{width:40px;height:40px;min-height:40px;padding:6px;justify-content:center}
      .site-audio-control__icon{width:27px;height:27px;flex-basis:27px}
    }
  `;
  document.head.appendChild(style);

  // Garante a copy correta dos CTAs mesmo com regras antigas do site.
  const headerCta = document.querySelector('.header-cta');
  if (headerCta) headerCta.textContent = 'Presenteie';
  document.querySelectorAll('.hero-actions .button-primary').forEach(el => { el.textContent = 'Presenteie com uma música'; });
  document.querySelectorAll('.plan-button').forEach(el => { el.textContent = 'Presenteie por R$ 49,90'; });
  document.querySelectorAll('.final-cta .button-light').forEach(el => { el.textContent = 'Presenteie quem você ama'; });

  const audio = document.createElement('audio');
  audio.id = 'ambient-audio';
  audio.src = AUDIO_SRC;
  audio.loop = true;
  audio.preload = 'auto';
  audio.playsInline = true;
  audio.setAttribute('playsinline', '');
  audio.setAttribute('webkit-playsinline', '');
  audio.volume = TARGET_VOLUME;
  audio.style.display = 'none';
  document.body.appendChild(audio);

  const control = document.createElement('button');
  control.type = 'button';
  control.className = 'site-audio-control';
  control.setAttribute('aria-label', 'Pausar ou tocar música ambiente');
  control.innerHTML = '<span class="site-audio-control__icon">♪</span><span class="site-audio-control__label">Música</span>';
  document.body.appendChild(control);

  let userDisabled = readState().enabled === false;
  let fallbackMuted = false;

  const syncControl = () => {
    const playing = !audio.paused && !audio.muted;
    control.classList.toggle('is-playing', playing);
    control.querySelector('.site-audio-control__icon').textContent = playing ? '♫' : '♪';
    control.querySelector('.site-audio-control__label').textContent = playing ? 'Pausar música' : 'Tocar música';
  };

  audio.addEventListener('loadedmetadata', () => {
    const state = readState();
    if (Number.isFinite(state.time) && state.time > 0 && state.time < audio.duration - 1) {
      try { audio.currentTime = state.time; } catch {}
    }
  }, { once: true });

  const tryAudibleAutoplay = async () => {
    if (userDisabled) return false;
    audio.muted = false;
    audio.volume = TARGET_VOLUME;
    try {
      await audio.play();
      fallbackMuted = false;
      syncControl();
      return true;
    } catch {
      return false;
    }
  };

  const startMutedFallback = async () => {
    if (userDisabled) return;
    try {
      audio.muted = true;
      await audio.play();
      fallbackMuted = true;
    } catch {}
    syncControl();
  };

  const unlockAudio = async () => {
    if (userDisabled) return;
    if (fallbackMuted || audio.paused || audio.muted) {
      audio.muted = false;
      audio.volume = TARGET_VOLUME;
      try { await audio.play(); } catch {}
      fallbackMuted = false;
      syncControl();
    }
  };

  // Tenta áudio audível imediatamente. Se a política do navegador impedir,
  // mantém a faixa iniciada em modo permitido e libera o som na primeira interação.
  requestAnimationFrame(async () => {
    const started = await tryAudibleAutoplay();
    if (!started) await startMutedFallback();
  });

  ['pointerdown','touchstart','keydown'].forEach(eventName => {
    window.addEventListener(eventName, unlockAudio, { once: true, passive: eventName !== 'keydown' });
  });

  window.addEventListener('focus', () => { if (!userDisabled) tryAudibleAutoplay(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !userDisabled) tryAudibleAutoplay();
  });

  control.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (!audio.paused && !audio.muted) {
      userDisabled = true;
      audio.pause();
      writeState(audio, false);
    } else {
      userDisabled = false;
      audio.muted = false;
      audio.volume = TARGET_VOLUME;
      try { await audio.play(); } catch {}
      writeState(audio, true);
    }
    syncControl();
  });

  audio.addEventListener('play', syncControl);
  audio.addEventListener('pause', syncControl);
  audio.addEventListener('volumechange', syncControl);
  audio.addEventListener('timeupdate', () => {
    if (Math.floor(audio.currentTime) % 3 === 0) writeState(audio, !userDisabled);
  });
  window.addEventListener('pagehide', () => writeState(audio, !userDisabled));
  syncControl();
})();
