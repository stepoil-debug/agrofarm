(() => {
  const MUSIC = {
    src: "https://raw.githubusercontent.com/stepoil-debug/agrofarm/348bf555545a21036379358dc6b4704a4b35dcec/se-as-palavras-forem-poucas.mp3",
    volume: 0.22,
    storageKey: "cancao_music_state_v1",
  };

  function installMusicStyles() {
    if (document.querySelector('link[data-music-player]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './music-player.css';
    link.dataset.musicPlayer = 'true';
    document.head.appendChild(link);
  }

  function setupAmbientMusic() {
    if (document.querySelector('#ambient-music')) return;

    const audio = document.createElement('audio');
    audio.id = 'ambient-music';
    audio.src = MUSIC.src;
    audio.loop = true;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.volume = MUSIC.volume;

    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'ambient-music-control';
    control.setAttribute('aria-label', 'Tocar música de fundo');
    control.innerHTML = '<span class="ambient-music-icon">♪</span><span class="ambient-music-copy"><strong>Se as palavras forem poucas</strong><small>toque para ouvir</small></span>';

    document.body.append(audio, control);

    let desiredPlaying = true;
    let savedTime = 0;
    try {
      const saved = JSON.parse(sessionStorage.getItem(MUSIC.storageKey) || 'null');
      if (saved) {
        desiredPlaying = saved.playing !== false;
        savedTime = Number(saved.time) || 0;
      }
    } catch {}

    if (savedTime > 0) {
      audio.addEventListener('loadedmetadata', () => {
        if (savedTime < audio.duration) audio.currentTime = savedTime;
      }, { once: true });
    }

    const render = () => {
      const playing = !audio.paused;
      control.classList.toggle('is-playing', playing);
      control.setAttribute('aria-label', playing ? 'Pausar música de fundo' : 'Tocar música de fundo');
      const icon = control.querySelector('.ambient-music-icon');
      const status = control.querySelector('small');
      if (icon) icon.textContent = playing ? '❚❚' : '♪';
      if (status) status.textContent = playing ? 'tocando agora' : 'toque para ouvir';
    };

    const play = async () => {
      desiredPlaying = true;
      try { await audio.play(); } catch {}
      render();
    };

    const pause = () => {
      desiredPlaying = false;
      audio.pause();
      render();
    };

    control.addEventListener('click', (event) => {
      event.stopPropagation();
      if (audio.paused) play(); else pause();
    });

    audio.addEventListener('play', render);
    audio.addEventListener('pause', render);

    const unlock = () => {
      if (desiredPlaying && audio.paused) play();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });

    const saveState = () => {
      try {
        sessionStorage.setItem(MUSIC.storageKey, JSON.stringify({
          playing: desiredPlaying && !audio.paused,
          time: audio.currentTime || 0,
        }));
      } catch {}
    };
    window.addEventListener('pagehide', saveState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveState();
    });

    play();
    render();
  }

  function loadMainApp() {
    const main = document.createElement('script');
    main.src = './app-main.js';
    main.async = false;
    main.onload = setupAmbientMusic;
    main.onerror = setupAmbientMusic;
    document.body.appendChild(main);
  }

  installMusicStyles();
  loadMainApp();
})();
