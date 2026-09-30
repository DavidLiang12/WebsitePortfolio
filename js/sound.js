(() => {
  'use strict';
  const root = new URL('../Sound/', document.currentScript.src);
  const key = 'portfolio-sound-enabled';
  const sounds = new Map();
  const files = { click: 'Click.MP3', cd: 'CD.MP3' };
  const readEnabled = () => { try { return sessionStorage.getItem(key) === 'true'; } catch (_) { return false; } };
  let enabled = readEnabled();
  let button;
  let audioContext;
  const voices = new Set();
  const clickNotes = [60, 64, 67, 69, 62, 67, 64, 72];
  const noteKey = 'portfolio-click-note';
  let nextNote = 0;
  try { nextNote = (Number(sessionStorage.getItem(noteKey)) || 0) % clickNotes.length; } catch (_) {}

  function prepareSounds() {
    Object.entries(files).forEach(([name, file]) => {
      if (sounds.has(name)) return;
      try {
        const sound = new Audio();
        sound.preload = 'auto';
        sound.src = new URL(file, root).href;
        sounds.set(name, sound);
        // Fetch the small effects before the first click, without playing them.
        sound.load();
      } catch (_) { /* A failed preload must not block the page. */ }
    });
  }

  function unlockNotes() {
    if (!enabled) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      if (!audioContext) audioContext = new Context();
      if (audioContext.state === 'suspended') audioContext.resume()?.catch(() => {});
    } catch (_) { /* Synthesized notes are optional. */ }
  }

  function stop() {
    voices.forEach(voice => { try { voice.stop(); } catch (_) {} });
    voices.clear();
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
    button.querySelector('.sound-toggle-label').textContent = enabled ? 'Mute sound effects' : 'Unmute sound effects';
  }

  window.portfolioSound = {
    get muted() { return !enabled; },
    softClick() {
      if (!enabled) return;
      window.portfolioSound.note(clickNotes[nextNote]);
      nextNote = (nextNote + 1) % clickNotes.length;
      try { sessionStorage.setItem(noteKey, String(nextNote)); } catch (_) {}
    },
    note(midi) {
      if (!enabled || !Number.isFinite(midi) || midi < 36 || midi > 96) return;
      unlockNotes();
      if (!audioContext || audioContext.state !== 'running') return;
      try {
        if (voices.size >= 8) {
          const oldest = voices.values().next().value;
          oldest.stop();
          voices.delete(oldest);
        }
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(.05, now + .018);
        gain.gain.exponentialRampToValueAtTime(.001, now + .27);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(now);
        oscillator.stop(now + .29);
      } catch (_) { /* Audio must never interrupt interaction. */ }
    },
    play(name) {
      if (!enabled || !Object.hasOwn(files, name)) return;
      try {
        prepareSounds();
        const sound = sounds.get(name);
        // Never queue a stale effect while a cold connection is still loading it.
        if (sound.readyState < 3) {
          window.portfolioSound.softClick();
          return;
        }
        sound.currentTime = 0;
        sound.play()?.catch(() => {});
      } catch (_) { /* Audio must never block navigation. */ }
    }
  };

  // Begin fetching as soon as this script runs, before the rest of the page loads.
  prepareSounds();

  document.addEventListener('DOMContentLoaded', () => {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'sound-toggle';
    button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-off" d="m16 9 6 6m0-6-6 6"/><path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><span class="sound-toggle-label"></span>';
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { sessionStorage.setItem(key, String(enabled)); } catch (_) {}
      if (!enabled) stop();
      else { prepareSounds(); unlockNotes(); }
      render();
    });
    render();
    const homeBottom = document.querySelector('.cassette-intro-bottom');
    if (homeBottom) {
      homeBottom.append(button);
    } else {
      const main = document.querySelector('main, .content') || document.body;
      const controls = document.createElement('div');
      controls.className = 'sound-controls';
      controls.append(button);
      const stripes = main.querySelector('.stereo-stripes');
      if (stripes) stripes.before(controls);
      else main.append(controls);
    }
    prepareSounds();
  }, { once: true });

  window.addEventListener('pagehide', stop);
  document.addEventListener('pointerdown', unlockNotes, { passive: true });
  document.addEventListener('keydown', unlockNotes);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    enabled = readEnabled();
    if (!enabled) stop();
    else prepareSounds();
    render();
  });
})();
