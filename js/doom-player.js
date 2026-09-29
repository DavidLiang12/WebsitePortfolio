(() => {
  'use strict';
  const button = document.getElementById('play');
  const status = document.getElementById('status');
  const launcher = document.getElementById('launcher');
  const container = document.getElementById('player');
  const runtime = new URL('vendor/js-dos/', location.href);
  let player;
  let paused = false;
  let loading;
  let timeout;
  let attempt = 0;
  let download;
  let bundleUrl;

  function loadRuntime() {
    if (window.Dos) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = new URL('js-dos.css', runtime).href;
      document.head.append(style);
      const script = document.createElement('script');
      script.src = new URL('js-dos.js', runtime).href;
      const timer = setTimeout(() => failed(), 15000);
      function failed() {
        clearTimeout(timer);
        script.remove(); style.remove(); loading = null;
        reject(new Error('The game player could not load. Please reload the page.'));
      }
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = failed;
      document.head.append(script);
    });
    return loading;
  }

  function dispose() {
    clearTimeout(timeout);
    download?.abort();
    // A stalled backend must not hold the retry button hostage.
    const oldPlayer = player;
    player = null;
    try { oldPlayer?.stop()?.catch(() => {}); } catch (_) {}
    if (bundleUrl) URL.revokeObjectURL(bundleUrl);
    bundleUrl = null;
  }

  function fail(id, message) {
    if (id !== attempt) return;
    attempt++;
    dispose();
    container.replaceChildren();
    container.dataset.state = 'error';
    launcher.hidden = false;
    status.textContent = message;
    button.textContent = 'Try again';
    button.disabled = false;
  }

  button.addEventListener('click', async () => {
    const id = ++attempt;
    button.disabled = true;
    container.dataset.state = 'loading';
    if (location.protocol === 'file:') {
      fail(id, 'Open the portfolio through its web preview or website address to play DOOM. Browsers block the emulator when an HTML file is opened directly.');
      return;
    }
    status.textContent = 'Loading game player…';
    timeout = setTimeout(() => fail(id, 'The game did not start. Please try again or reload the page.'), 30000);
    try {
      await loadRuntime();
      if (id !== attempt) return;
      status.textContent = 'Loading shareware episode…';
      download = new AbortController();
      const response = await fetch('doom-shareware.jsdos?v=3', { signal: download.signal });
      if (!response.ok) throw new Error('The game files could not load. Please reload the page.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (id !== attempt) return;
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('The game download is incomplete. Please reload the page.');
      bundleUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
      status.textContent = 'Starting DOOM…';
      player = Dos(container, {
        url: bundleUrl,
        pathPrefix: new URL('emulators/', runtime).href,
        backend: 'dosbox', backendLocked: true,
        autoStart: true,
        theme: 'dark', lang: 'en',
        renderBackend: 'canvas', renderAspect: '4/3', imageRendering: 'pixelated',
        mouseCapture: false, thinSidebar: true,
        volume: .5,
        // Bundle URLs are ephemeral; game saves stay within this window session.
        fsChanges: { local: false },
        onEvent: (event, ci) => {
          if (event !== 'ci-ready' || id !== attempt) return;
          ci.events().onMessage((type, ...messages) => {
            // DOSBox also labels harmless legacy hardware notices as 'error'.
            if (type === 'panic' || /backend crashed|memory access out of bounds|aborted\(/i.test(messages.join(' '))) {
              console.error('DOOM:', ...messages);
              fail(id, 'The game stopped unexpectedly. Please try again.');
            }
          });
          ci.events().onExit(() => fail(id, 'DOOM has closed. Play again whenever you like.'));
          // Backend creation alone does not mean it has rendered anything yet.
          ci.events().onFrame(() => {
            if (id !== attempt || container.dataset.state === 'ready') return;
            clearTimeout(timeout);
            container.dataset.state = 'ready';
            launcher.hidden = true;
            player?.setPaused(paused || document.hidden);
          });
        }
      });
      player.setNoCloud(true);
    } catch (error) {
      fail(id, error.message || 'DOOM could not start. Please try again.');
    }
  });

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'desktop-game-state') return;
    paused = Boolean(event.data.paused);
    if (container.dataset.state === 'ready') player?.setPaused(paused || document.hidden);
  });
  document.addEventListener('visibilitychange', () => {
    if (container.dataset.state === 'ready') player?.setPaused(paused || document.hidden);
  });
  window.addEventListener('pagehide', () => { attempt++; dispose(); });
})();
