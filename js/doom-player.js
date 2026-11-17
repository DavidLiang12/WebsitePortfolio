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
  let command;
  const heldKeys = new Map();
  // js-dos CommandInterface uses its KBD_* values, not DOM keyCode/scancodes.
  const moveKeys = { KeyW: 265, ArrowUp: 265, KeyS: 264, ArrowDown: 264,
    KeyA: 65, ArrowLeft: 65, KeyD: 68, ArrowRight: 68 };

  function releaseControls() {
    if (command) {
      try {
        new Set(heldKeys.values()).forEach(key => command.sendKeyEvent(key, false));
        [0, 1, 2].forEach(button => command.sendMouseButton(button, false));
      } catch (_) { /* A disposed backend must not prevent window cleanup. */ }
    }
    heldKeys.clear();
  }

  function movement(event, pressed) {
    const key = moveKeys[event.code];
    if (key === undefined) return;
    const wasHeld = heldKeys.has(event.code);
    if (!wasHeld && (paused || document.hidden || !command || container.dataset.state !== 'ready' ||
      event.ctrlKey || event.altKey || event.metaKey ||
      event.target?.closest?.('input, textarea, select, button, a, [contenteditable="true"]'))) return;
    // Capture before js-dos's window listener so arrows strafe instead of also
    // turning, and WASD does not produce duplicate native key events.
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pressed) {
      if (wasHeld) return;
      if (![...heldKeys.values()].includes(key)) command.sendKeyEvent(key, true);
      heldKeys.set(event.code, key);
    } else if (wasHeld) {
      heldKeys.delete(event.code);
      if (![...heldKeys.values()].includes(key)) command.sendKeyEvent(key, false);
    }
  }
  window.addEventListener('keydown', event => movement(event, true), { capture: true });
  window.addEventListener('keyup', event => movement(event, false), { capture: true });
  window.addEventListener('blur', releaseControls);
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) releaseControls(); });

  function releaseMouse() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

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
    releaseControls();
    command = null;
    releaseMouse();
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
    button.hidden = false;
    button.disabled = false;
  }

  async function start() {
    const id = ++attempt;
    button.disabled = true;
    button.hidden = true;
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
      const response = await fetch('doom-shareware.jsdos?v=wasd-mouse-4', { signal: download.signal });
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
        mouseCapture: true, thinSidebar: true,
        volume: .5,
        // Bundle URLs are ephemeral; game saves stay within this window session.
        fsChanges: { local: false },
        onEvent: (event, ci) => {
          if (event !== 'ci-ready' || id !== attempt) return;
          command = ci;
          // Original DOOM has horizontal mouse look only. Ignore vertical mouse
          // deltas, which the DOS executable otherwise interprets as walking.
          const relativeMotion = ci.sendMouseRelativeMotion.bind(ci);
          ci.sendMouseRelativeMotion = (x, _y) => relativeMotion(x, 0);
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
            // DOSBox configuration can overwrite the initial player option.
            player?.setMouseCapture(true);
            player?.setPaused(paused || document.hidden);
          });
        }
      });
      player.setNoCloud(true);
    } catch (error) {
      fail(id, error.message || 'DOOM could not start. Please try again.');
    }
  }
  button.addEventListener('click', start);
  start();

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'desktop-game-state') return;
    paused = Boolean(event.data.paused);
    if (paused) { releaseControls(); releaseMouse(); }
    if (container.dataset.state === 'ready') player?.setPaused(paused || document.hidden);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { releaseControls(); releaseMouse(); }
    if (container.dataset.state === 'ready') player?.setPaused(paused || document.hidden);
  });
  window.addEventListener('pagehide', () => { attempt++; dispose(); });
})();
