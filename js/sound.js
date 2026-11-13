(() => {
  'use strict';
  const root = new URL('../Sound/', document.currentScript.src);
  const key = 'portfolio-sound-enabled';
  const sounds = new Map();
  const files = { click: 'Click.MP3', cd: 'CD.MP3', tv: 'TV-Shut.MP3', film: '3D-Transition.mp3', achievement:'achievement.mp3', cassetteToggle: 'cassette-toggle.mp3' };
  const notePitches = [60, 62, 64, 67, 69, 72];
  notePitches.forEach(midi => { files[`note${midi}`] = `generated/note-${midi}.wav`; });
  Object.assign(files, {
    tapeTransition: 'generated/transition-tape.wav',
    cdTransition: 'generated/transition-cd.wav',
    gamesOut: 'generated/iris-games-out.wav', gamesIn: 'generated/iris-games-in.wav',
    projectsOut: 'generated/iris-projects-out.wav', projectsIn: 'generated/iris-projects-in.wav'
  });
  const achievementAudio = document.currentScript.dataset?.achievementAudio === 'true';
  if (achievementAudio) Object.assign(files, { achievementClick: 'achievement-click.mp3', achievementStartup: 'achievement-startup.mp3' });
  const readEnabled = () => { try { return sessionStorage.getItem(key) === 'true'; } catch (_) { return false; } };
  let enabled = readEnabled();
  let button;
  let startupPending = false, startupAttempting = false;
  const voices = new Set();
  let tvFade = 0;
  const clickNotes = [60, 64, 67, 69, 62, 67, 64, 72];
  const noteKey = 'portfolio-click-note';
  let nextNote = 0;
  try { nextNote = (Number(sessionStorage.getItem(noteKey)) || 0) % clickNotes.length; } catch (_) {}
  const isDesktopInterface = () => document.body.classList.contains('art-2d-page') || document.body.classList.contains('achievement-pc-page');

  function prepareSounds() {
    Object.entries(files).forEach(([name, file]) => {
      if (sounds.has(name)) return;
      try {
        const sound = new Audio();
        sound.preload = 'auto';
        sound.src = new URL(file, root).href;
        if (name === 'achievementStartup') sound.addEventListener('canplay', tryAchievementStartup);
        sounds.set(name, sound);
        // Fetch the small effects before the first click, without playing them.
        sound.load();
      } catch (_) { /* A failed preload must not block the page. */ }
    });
  }

  function stopVoice(voice) {
    voice.pause();
    voice.currentTime = 0;
    voice.onended?.();
  }

  // AudioContext construction can synchronously stall Chrome on macOS for
  // several seconds. Use pre-rendered clips for notes AND transitions so the
  // stall cannot move from unmute to the next click or page change.
  function playVoice(name, volume, rate = 1) {
    const clip = sounds.get(name);
    if (!enabled || !clip || clip.readyState < 3) return;
    try {
      if (voices.size >= 8) stopVoice(voices.values().next().value);
      const voice = clip.cloneNode(true);
      voice.volume = volume;
      voice.playbackRate = rate;
      voice.preservesPitch = false;
      voices.add(voice);
      // A cached clip should start immediately. Drop a pending play request
      // rather than letting feedback arrive after its interaction has passed.
      const deadline = setTimeout(() => stopVoice(voice), 120);
      voice.onended = () => { clearTimeout(deadline); voices.delete(voice); };
      Promise.resolve(voice.play()).then(() => {
        clearTimeout(deadline);
        if (!voices.has(voice)) stopVoice(voice);
      }, () => stopVoice(voice));
    } catch (_) { /* Audio must never interrupt interaction. */ }
  }

  function stop() {
    startupPending = false;
    cancelAnimationFrame(tvFade);
    voices.forEach(stopVoice);
    voices.clear();
    sounds.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
  }

  function tryAchievementStartup() {
    if (!startupPending || startupAttempting || !enabled || document.getElementById('achievement-boot')?.hidden !== false) return;
    const sound = sounds.get('achievementStartup');
    if (!sound || sound.readyState < 3) return;
    startupAttempting = true;
    try {
      sound.currentTime = 0;
      sound.volume = .5;
      Promise.resolve(sound.play()).then(() => {
        startupPending = false;
        startupAttempting = false;
      }, () => {
        // Browsers may require a gesture. Retry only while this boot is visible.
        startupAttempting = false;
      });
    } catch (_) { startupAttempting = false; }
  }

  // Keep the control's own feedback audible for both mute and unmute.
  function cassetteClick() {
    try {
      prepareSounds();
      const sound = sounds.get('cassetteToggle');
      if (!sound || sound.readyState < 3) return;
      sound.currentTime = 0;
      sound.volume = .65;
      sound.play()?.catch(() => {});
    } catch (_) { /* The control remains usable when audio is unavailable. */ }
  }

  function render() {
    if (!button) return;
    button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Unmute sound effects');
    button.title = enabled ? 'Mute sound effects' : 'Unmute sound effects';
    button.dataset.muted = String(!enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('.sound-toggle-label').textContent = isDesktopInterface() ? (enabled ? 'Mute sound effects' : 'Unmute sound effects') : (enabled ? 'Unmuted' : 'Muted');
  }

  window.portfolioSound = {
    get muted() { return !enabled; },
    startAchievementBoot() {
      if (!achievementAudio) return;
      startupPending = true;
      prepareSounds();
      tryAchievementStartup();
    },
    finishAchievementBoot(skipped = false) {
      startupPending = false;
      if (!skipped) return; // Let an already-playing chime finish over the scene.
      const sound = sounds.get('achievementStartup');
      if (sound) { sound.pause(); sound.currentTime = 0; }
    },
    softClick(volume = 1) {
      if (!enabled) return;
      window.portfolioSound.note(clickNotes[nextNote], volume);
      nextNote = (nextNote + 1) % clickNotes.length;
      try { sessionStorage.setItem(noteKey, String(nextNote)); } catch (_) {}
    },
    note(midi, volume = 1) {
      if (!enabled || !Number.isFinite(midi) || midi < 36 || midi > 96) return;
      const pitch = notePitches.reduce((nearest, value) => Math.abs(value - midi) < Math.abs(nearest - midi) ? value : nearest);
      playVoice(`note${pitch}`, .05 * Math.max(0, Math.min(2, Number(volume) || 1)), 2 ** ((midi - pitch) / 12));
    },
    transition(type, phase = 'out', from) {
      if (!enabled) return;
      if (type === 'iris') {
        const page = from === 'projects.html' ? 'projects' : 'games';
        playVoice(`${page}${phase === 'in' ? 'In' : 'Out'}`, 1);
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
      if (type === 'tape' || type === 'cd') playVoice(`${type}Transition`, .48);
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
        if (name === 'achievement') sound.volume = .7;
        if (name === 'achievementClick') sound.volume = .45;
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
    if (isDesktopInterface()) {
      button.classList.add('sound-toggle-classic');
      button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path class="sound-off" d="m16 9 6 6m0-6-6 6"/><path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg><span class="sound-toggle-label"></span>';
    }
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { sessionStorage.setItem(key, String(enabled)); } catch (_) {}
      render();
      if (!enabled) stop();
      else { prepareSounds(); tryAchievementStartup(); }
      cassetteClick();
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        button.animate?.([{ transform: 'translateY(0)' }, { transform: 'translateY(2px) scale(.97)' }, { transform: 'translateY(0)' }], { duration: 140 });
      }
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
  document.addEventListener('pointerdown', tryAchievementStartup, { passive: true });
  document.addEventListener('keydown', tryAchievementStartup);
  if (achievementAudio) document.addEventListener('click', event => {
    const control = event.target.closest?.('button, a[href], summary');
    if (!control || control.closest('.portfolio-header') || control.matches('.sound-toggle') || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    window.portfolioSound.play('achievementClick');
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    enabled = readEnabled();
    if (!enabled) stop();
    else prepareSounds();
    render();
  });
})();
