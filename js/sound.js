(() => {
  'use strict';
  const root = new URL('../Sound/', document.currentScript.src);
  const key = 'portfolio-sound-enabled';
  const sounds = new Map();
  const files = { click: 'Click.MP3', cd: 'CD.MP3', peel: 'Peel.MP3', tv: 'TV-Shut.MP3', film: '3D-Transition.mp3' };
  const readEnabled = () => { try { return sessionStorage.getItem(key) === 'true'; } catch (_) { return false; } };
  let enabled = readEnabled();
  let button;
  let audioContext;
  const voices = new Set();
  let tvFade = 0;
  const transitionBuffers = new Map();
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

  function unlockNotes(force = false) {
    if (!enabled && force !== true) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      if (!audioContext) audioContext = new Context();
      if (audioContext.state === 'suspended') audioContext.resume()?.catch(() => {});
    } catch (_) { /* Synthesized notes are optional. */ }
  }

  function stop() {
    cancelAnimationFrame(tvFade);
    voices.forEach(voice => { try { voice.stop(); } catch (_) {} });
    voices.clear();
    sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  // A short two-part mechanical latch, including the final click when muting.
  function cassetteClick() {
    unlockNotes(true);
    if (!audioContext || audioContext.state !== 'running') return;
    try {
      const duration = .095;
      const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / audioContext.sampleRate;
        const envelope = Math.exp(-t * 190) + (t > .035 ? .65 * Math.exp(-(t - .035) * 130) : 0);
        data[i] = ((Math.random() * 2 - 1) * .65 + Math.sin(t * 2 * Math.PI * 180) * .35) * envelope;
      }
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer; gain.gain.value = .22;
      source.connect(gain); gain.connect(audioContext.destination);
      voices.add(source);
      source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
      source.start(); source.stop(audioContext.currentTime + duration);
    } catch (_) { /* The control remains usable when audio is unavailable. */ }
  }

  function render() {
    if (!button) return;
    button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Unmute sound effects');
    button.title = enabled ? 'Mute sound effects' : 'Unmute sound effects';
    button.dataset.muted = String(!enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('.sound-toggle-label').textContent = document.body.classList.contains('art-2d-page') ? (enabled ? 'Mute sound effects' : 'Unmute sound effects') : (enabled ? 'Unmuted' : 'Muted');
  }

  window.portfolioSound = {
    get muted() { return !enabled; },
    softClick(volume = 1) {
      if (!enabled) return;
      window.portfolioSound.note(clickNotes[nextNote], volume);
      nextNote = (nextNote + 1) % clickNotes.length;
      try { sessionStorage.setItem(noteKey, String(nextNote)); } catch (_) {}
    },
    note(midi, volume = 1) {
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
        gain.gain.linearRampToValueAtTime(.05 * Math.max(0, Math.min(2, Number(volume) || 1)), now + .018);
        gain.gain.exponentialRampToValueAtTime(.001, now + .27);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(now);
        oscillator.stop(now + .29);
      } catch (_) { /* Audio must never interrupt interaction. */ }
    },
    peel() {
      window.portfolioSound.play('peel');
    },
    transition(type, phase = 'out', from) {
      if (!enabled) return;
      if (type === 'iris') {
        // The arrow's rounded sine voice, stretched into a closing/opening phrase.
        // Each page owns its 520ms half so navigation cannot cut the phrase short.
        unlockNotes();
        if (!audioContext) return;
        const requested = performance.now();
        const playPhrase = () => {
          if (!enabled || audioContext.state !== 'running' || performance.now() - requested > 120) return;
          try {
            const now = audioContext.currentTime;
            const notes = from === 'projects.html'
              ? (phase === 'in' ? [62, 69] : [57, 60])
              : (phase === 'in' ? [67, 72] : [60, 64]);
            notes.forEach((midi, index) => {
              const oscillator = audioContext.createOscillator();
              const gain = audioContext.createGain();
              const start = now + index * .10;
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), start);
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(index ? .022 : .045, start + .065);
              gain.gain.exponentialRampToValueAtTime(.012, now + .31);
              gain.gain.exponentialRampToValueAtTime(.0001, now + .50);
              gain.gain.linearRampToValueAtTime(0, now + .52);
              oscillator.connect(gain); gain.connect(audioContext.destination);
              voices.add(oscillator);
              oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
              oscillator.start(start); oscillator.stop(now + .52);
            });
          } catch (_) { /* Optional musical feedback must never delay the iris. */ }
        };
        if (audioContext.state === 'running') playPhrase();
        else audioContext.resume()?.then(playPhrase).catch(() => {});
        return;
      }
      if (type === 'film') {
        try {
          const sound = sounds.get(type);
          if (!sound || sound.readyState < 3) return;
          sound.volume = .25; // 3D Art transition, kept quieter than the other page sounds
          sound.currentTime = 0;
          sound.play()?.catch(() => {});
        } catch (_) { /* Optional audio must never interrupt navigation. */ }
        return;
      }
      if (type === 'crt') {
        try {
        const tv = sounds.get('tv');
        if (!tv || tv.readyState < 3) return;
        cancelAnimationFrame(tvFade);
        tv.currentTime = 0; tv.volume = .6;
        tv.play()?.catch(() => {});
        const start = performance.now();
        const fade = now => {
          const elapsed = now - start;
          tv.volume = .6 * Math.max(0, Math.min(1, (650 - elapsed) / 140));
          if (elapsed < 650 && enabled) tvFade = requestAnimationFrame(fade);
          else { tv.pause(); tv.currentTime = 0; tvFade = 0; }
        };
        tvFade = requestAnimationFrame(fade);
        } catch (_) { /* A failed effect must never delay navigation. */ }
        return;
      }
      if (!['tape','cd','iris','film'].includes(type)) return;
      unlockNotes();
      if (!audioContext || audioContext.state !== 'running') return;
      try {
        const duration = type === 'tape' ? .48 : .52;
        if (!transitionBuffers.has(type)) {
          const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
          const samples = buffer.getChannelData(0);
          let warmNoise = 0, phase = 0;
          for (let i = 0; i < samples.length; i++) {
            const t = i / audioContext.sampleRate, p = t / duration;
            warmNoise = warmNoise * .97 + (Math.random() * 2 - 1) * .03;
            const envelope = Math.pow(Math.sin(Math.PI * p), 1.8);
            const hz = type === 'iris' ? 165 - 80*p : type === 'cd' ? 210 - 85*p : type === 'film' ? 115 : 145;
            phase += 2 * Math.PI * hz / audioContext.sampleRate;
            const pulse = type === 'tape'
              ? [0,.045,.09].reduce((sum, offset) => sum + Math.exp(-Math.pow((t-offset-.11)/.048,2)),0)/2
              : type === 'film' ? .35 + .65*Math.pow(Math.sin(Math.PI*t/.13),2) : 1;
            samples[i] = envelope * (Math.sin(phase)*.14*pulse + warmNoise*(type === 'film' ? 1.1 : .65));
          }
          transitionBuffers.set(type, buffer);
        }
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        source.buffer = transitionBuffers.get(type); gain.gain.value = .48;
        source.connect(gain); gain.connect(audioContext.destination); voices.add(source);
        source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
        source.start(); source.stop(audioContext.currentTime + duration);
      } catch (_) { /* Navigation stays independent of optional audio. */ }
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
    button.innerHTML = `<svg class="sound-cassette" viewBox="0 0 200 126" aria-hidden="true">
      <rect x="3" y="3" width="194" height="120" rx="12" fill="#302720" stroke="#302720" stroke-width="4"/>
      <rect x="11" y="11" width="178" height="86" rx="6" fill="#f3ead2"/>
      <text class="sound-toggle-label" x="100" y="41" text-anchor="middle" fill="#302720" font-family="Arial,sans-serif" font-weight="900" font-size="23" letter-spacing=".5">Muted</text>
      <rect x="28" y="59" width="144" height="30" rx="15" fill="#302720"/>
      <path d="M55 62h90M55 86h90" stroke="#9a8568" stroke-width="2"/>
      <rect x="81" y="65" width="38" height="18" rx="2" fill="#77674e"/>
      <g class="cassette-reel"><circle cx="53" cy="74" r="11" fill="#f3ead2"/><circle cx="53" cy="74" r="4" fill="#302720"/><path d="M53 63v5m0 12v5m-11-11h5m12 0h5m-19-8 4 4m8 8 4 4m0-16-4 4m-8 8-4 4" stroke="#302720" stroke-width="2"/></g>
      <g class="cassette-reel"><circle cx="147" cy="74" r="11" fill="#f3ead2"/><circle cx="147" cy="74" r="4" fill="#302720"/><path d="M147 63v5m0 12v5m-11-11h5m12 0h5m-19-8 4 4m8 8 4 4m0-16-4 4m-8 8-4 4" stroke="#302720" stroke-width="2"/></g>
      <path d="m50 121 9-22h82l9 22" fill="#514337" stroke="#171411" stroke-width="2"/>
      <g fill="#d2c4a5"><circle cx="67" cy="113" r="4"/><circle cx="133" cy="113" r="4"/><circle cx="84" cy="112" r="2"/><circle cx="116" cy="112" r="2"/></g>
      <g stroke="#bba889" stroke-width="1.5"><path d="m12 108 5 5m0-5-5 5m169-5 5 5m0-5-5 5"/></g>
    </svg>`;
    if (document.body.classList.contains('art-2d-page')) {
      button.classList.add('sound-toggle-classic');
      button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-off" d="m16 9 6 6m0-6-6 6"/><path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><span class="sound-toggle-label"></span>';
    }
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { sessionStorage.setItem(key, String(enabled)); } catch (_) {}
      if (!enabled) stop();
      else { prepareSounds(); unlockNotes(); }
      cassetteClick();
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        button.animate?.([{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scale(.97)' }, { transform: 'translateY(0)' }], { duration: 140 });
      }
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
