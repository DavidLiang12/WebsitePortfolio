(() => {
  'use strict';
  const root = new URL('../Sound/', document.currentScript.src);
  const key = 'portfolio-sound-enabled';
  const sounds = new Map();
  const files = { click: 'Click.MP3', cd: 'CD.MP3' };
  const readEnabled = () => { try { return sessionStorage.getItem(key) === 'true'; } catch (_) { return false; } };
  let enabled = readEnabled();
  let button;

  function stop() {
    sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  function render() {
    if (!button) return;
    button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Unmute sound effects');
    button.title = enabled ? 'Mute sound effects' : 'Unmute sound effects';
    button.dataset.muted = String(!enabled);
    button.querySelector('.sound-toggle-label').textContent = enabled ? 'Mute' : 'Unmute';
  }

  window.portfolioSound = {
    get muted() { return !enabled; },
    play(name) {
      if (!enabled || !Object.hasOwn(files, name)) return;
      try {
        if (!sounds.has(name)) sounds.set(name, new Audio(new URL(files[name], root).href));
        const sound = sounds.get(name);
        sound.currentTime = 0;
        sound.play()?.catch(() => {});
      } catch (_) { /* Audio must never block navigation. */ }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'sound-toggle';
    button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-off" d="m16 9 6 6m0-6-6 6"/><path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><span class="sound-toggle-label"></span>';
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { sessionStorage.setItem(key, String(enabled)); } catch (_) {}
      if (!enabled) stop();
      render();
    });
    render();
    document.body.append(button);
  }, { once: true });

  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    enabled = readEnabled();
    if (!enabled) stop();
    render();
  });
})();
